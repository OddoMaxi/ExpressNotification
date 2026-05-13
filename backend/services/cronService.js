const cron = require('node-cron');
const { allQuery, getQuery, runQuery, withTransaction } = require('../database');
const { checkStatus, mapStatusToMessage, shouldSendSMS, logAudit, WELCOME_MESSAGE } = require('./irisService');
const { sendSMS } = require('./smsService');

let cronJob = null;

/**
 * Service de tâche planifiée (Cron Job)
 * Vérifie tous les 30 minutes l'état de toutes les demandes de passeport
 * et envoie des SMS automatiques en cas de changement de statut
 */

/**
 * Démarrer le service de background
 */
function startBackgroundService() {
  console.log('\n🚀 Démarrage du service de background (chaque 30 minutes)...');
  
  // Cron expression: */30 * * * * = chaque 30 minutes
  cronJob = cron.schedule('*/30 * * * *', async () => {
    console.log(`\n📅 [${new Date().toLocaleString()}] 🔄 Vérification automatique des statuts Iris...`);
    await processAllApplications();
  });

  console.log('✅ Service de background activé\n');
}

/**
 * Arrêter le service de background
 */
function stopBackgroundService() {
  if (cronJob) {
    cronJob.stop();
    console.log('⏹️  Service de background arrêté');
  }
}

/**
 * Traiter tous les demandeurs enregistrés
 */
async function processAllApplications() {
  try {
    // Récupérer uniquement les demandeurs dont le traitement n'est pas terminé
    // On exclut ceux dont le statut final est atteint ET qui ont déjà reçu leur SMS
    const demandeurs = await allQuery(`
      SELECT * FROM demandeurs
      WHERE NOT (statut_actuel IN ('Production Completed', 'Final Approval Rejected') AND sms_envoye = 1)
      ORDER BY id
    `);

    if (!demandeurs || demandeurs.length === 0) {
      console.log('ℹ️  Aucun demandeur à vérifier');
      return;
    }

    console.log(`📋 ${demandeurs.length} demandeur(s) à vérifier`);

    for (const demandeur of demandeurs) {
      try {
        // Utiliser reference_recu comme référence ticket IRIS (ticket_number est optionnel)
        const ticketRef = demandeur.ticket_number || demandeur.reference_recu;
        if (!ticketRef) {
          console.log(`⏭️  ${demandeur.nom} ${demandeur.prenom} - Pas de référence ticket`);
          continue;
        }

        console.log(`\n🔍 Vérification: ${demandeur.nom} ${demandeur.prenom} (ref: ${ticketRef})`);

        // Appeler l'API Iris pour obtenir le statut actuel
        const irisResponse = await checkStatus(ticketRef);

        if (!irisResponse.success) {
          console.log(`  ⚠️  Erreur API Iris`);
          continue;
        }

        const newStatus = irisResponse.statut;
        const oldStatus = demandeur.statut_actuel;

        console.log(`  Ancien statut: ${oldStatus}`);
        console.log(`  New statut: ${newStatus}`);

        // Vérifier si le statut a changé
        if (oldStatus !== newStatus) {
          console.log(`  📊 CHANGEMENT DÉTECTÉ: ${oldStatus} → ${newStatus}`);

          if (shouldSendSMS(newStatus)) {
            // Envoyer le SMS AVANT de mettre à jour le statut en BD
            // Si le SMS échoue, on ne met pas à jour le statut → le cron retentera au prochain cycle
            const messageData = mapStatusToMessage(newStatus);
            console.log(`  📱 Envoi du SMS au ${demandeur.telephone}`);

            const smsResult = await sendSMS({
              telephone: demandeur.telephone,
              message: messageData.message,
              demandeurId: demandeur.id,
              statusIris: newStatus
            });

            if (smsResult.success) {
              console.log(`  ✅ SMS envoyé`);
              await withTransaction(async (tx) => {
                await tx.run(
                  `UPDATE demandeurs SET statut_actuel = ?, sms_envoye = 1, derniere_verification = CURRENT_TIMESTAMP, date_mise_a_jour = CURRENT_TIMESTAMP WHERE id = ?`,
                  [newStatus, demandeur.id]
                );
              });
              await logAudit('SMS_ENVOYE', demandeur.id, { statut: newStatus, telephone: demandeur.telephone });
            } else {
              console.log(`  ❌ Erreur envoi SMS — statut non mis à jour, nouvelle tentative au prochain cycle`);
              await logAudit('SMS_ECHEC', demandeur.id, { statut: newStatus, error: smsResult.error });
            }
          } else {
            // Pas de SMS pour ce statut, on met juste à jour le statut
            console.log(`  ℹ️  Statut ${newStatus} — pas de SMS automatique`);
            await runQuery(
              `UPDATE demandeurs
               SET statut_actuel = ?,
                   derniere_verification = CURRENT_TIMESTAMP,
                   date_mise_a_jour = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [newStatus, demandeur.id]
            );
          }
        } else {
          // Aucun changement
          console.log(`  ✓ Statut inchangé (${newStatus})`);
          await runQuery(
            `UPDATE demandeurs SET derniere_verification = CURRENT_TIMESTAMP WHERE id = ?`,
            [demandeur.id]
          );
        }
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${demandeur.nom}:`, error.message);
      }
    }

    console.log('\n✅ Vérification automatique terminée');
  } catch (error) {
    console.error('❌ Erreur lors du traitement des demandes:', error);
  }
}

/**
 * Vérifier et envoyer SMS manuellement pour un demandeur spécifique
 */
function normalizeStatus(status) {
  if (!status) return 'néant';
  return String(status).toLowerCase().trim();
}

async function manuallyCheckAndSendSMS(demandeurId) {
  try {
    const demandeur = await getQuery(
      'SELECT * FROM demandeurs WHERE id = ?',
      [demandeurId]
    );

    if (!demandeur) {
      return { success: false, error: 'Demandeur non trouvé' };
    }

    console.log(`\n📱 Vérification manuelle pour: ${demandeur.nom} ${demandeur.prenom}`);

    const currentStatus = normalizeStatus(demandeur.statut_actuel);
    console.log(`  Statut actuel normalisé: ${currentStatus}`);

    if (currentStatus === 'néant') {
      const personalizedMessage = WELCOME_MESSAGE;
      console.log(`  Envoi du message de bienvenue`);

      const smsResult = await sendSMS({
        telephone: demandeur.telephone,
        message: personalizedMessage,
        demandeurId: demandeur.id,
        statusIris: 'néant'
      });

      if (smsResult.success) {
        await runQuery(
          `UPDATE demandeurs 
           SET sms_envoye = 1, 
               derniere_verification = CURRENT_TIMESTAMP,
               date_mise_a_jour = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [demandeur.id]
        );

        return {
          success: true,
          message: 'SMS de bienvenue envoyé manuellement avec succès',
          demandeur: demandeur,
          statut: demandeur.statut_actuel,
          sms_message: personalizedMessage
        };
      }

      return {
        success: false,
        error: 'Erreur lors de l\'envoi du SMS de bienvenue',
        smsError: smsResult.error
      };
    }

    if (!demandeur.ticket_number) {
      return { success: false, error: 'Pas de numéro de ticket' };
    }

    // Vérifier le statut
    const irisResponse = await checkStatus(demandeur.ticket_number);

    if (!irisResponse.success) {
      return { success: false, error: 'Erreur API Iris' };
    }

    const irisStatus = irisResponse.statut;

    // Générer le message (SMS uniquement pour Rejeté et Passeport prêt)
    const messageData = mapStatusToMessage(irisStatus);
    const personalizedMessage = messageData ? messageData.message : WELCOME_MESSAGE;

    // Envoyer le SMS
    const smsResult = await sendSMS({
      telephone: demandeur.telephone,
      message: personalizedMessage,
      demandeurId: demandeur.id,
      statusIris: currentStatus
    });

    if (smsResult.success) {
      // Mettre à jour le statut
      await runQuery(
        `UPDATE demandeurs 
         SET statut_actuel = ?, 
             sms_envoye = 1, 
             derniere_verification = CURRENT_TIMESTAMP,
             date_mise_a_jour = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [irisStatus, demandeur.id]
      );

      return {
        success: true,
        message: 'SMS envoyé manuellement avec succès',
        demandeur: demandeur,
        statut: irisStatus,
        sms_message: personalizedMessage
      };
    } else {
      return {
        success: false,
        error: 'Erreur lors de l\'envoi du SMS',
        smsError: smsResult.error
      };
    }
  } catch (error) {
    console.error('Erreur:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  startBackgroundService,
  stopBackgroundService,
  processAllApplications,
  manuallyCheckAndSendSMS
};
