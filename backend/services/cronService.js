const cron = require('node-cron');
const { allQuery, getQuery, runQuery } = require('../database');
const { checkStatus, mapStatusToMessage } = require('./irisService');
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
    // Récupérer tous les demandeurs
    const demandeurs = await allQuery('SELECT * FROM demandeurs ORDER BY id');

    if (!demandeurs || demandeurs.length === 0) {
      console.log('ℹ️  Aucun demandeur à vérifier');
      return;
    }

    console.log(`📋 ${demandeurs.length} demandeur(s) à vérifier`);

    for (const demandeur of demandeurs) {
      try {
        // Vérifier si on a un ticket_number
        if (!demandeur.ticket_number) {
          console.log(`⏭️  ${demandeur.nom} ${demandeur.prenom} - Pas de numéro de ticket`);
          continue;
        }

        console.log(`\n🔍 Vérification: ${demandeur.nom} ${demandeur.prenom}`);

        // Appeler l'API Iris pour obtenir le statut actuel
        const irisResponse = await checkStatus(demandeur.ticket_number);

        if (!irisResponse.success) {
          console.log(`  ⚠️  Erreur API Iris`);
          continue;
        }

        const newStatus = irisResponse.statut;
        const oldStatus = demandeur.statut_actuel;

        console.log(`  Ancien statut: ${oldStatus}`);
        console.log(`  New statut: ${newStatus}`);

        // Vérifier si le statut a changé
        if (oldStatus !== newStatus && newStatus !== 'néant' && oldStatus !== 'néant') {
          console.log(`  📊 CHANGEMENT DÉTECTÉ! ${oldStatus} → ${newStatus}`);

          // Générer le message personnalisé
          const messageData = mapStatusToMessage(newStatus, demandeur);
          const personalizedMessage = messageData.message;

          console.log(`  📱 Envoi du SMS au ${demandeur.telephone}`);

          // Envoyer le SMS
          const smsResult = await sendSMS({
            telephone: demandeur.telephone,
            message: personalizedMessage,
            demandeurId: demandeur.id,
            statusIris: newStatus
          });

          if (smsResult.success) {
            console.log(`  ✅ SMS envoyé avec succès`);

            // Mettre à jour le statut en BD
            await runQuery(
              `UPDATE demandeurs 
               SET statut_actuel = ?, 
                   sms_envoye = 1, 
                   derniere_verification = CURRENT_TIMESTAMP,
                   date_mise_a_jour = CURRENT_TIMESTAMP 
               WHERE id = ?`,
              [newStatus, demandeur.id]
            );
          } else {
            console.log(`  ❌ Erreur d'envoi SMS`);

            // Mettre à jour seulement le statut (pas sms_envoye)
            await runQuery(
              `UPDATE demandeurs 
               SET statut_actuel = ?, 
                   derniere_verification = CURRENT_TIMESTAMP,
                   date_mise_a_jour = CURRENT_TIMESTAMP 
               WHERE id = ?`,
              [newStatus, demandeur.id]
            );
          }
        } else if (oldStatus === 'néant' && newStatus !== 'néant') {
          // Premier statut reçu
          console.log(`  🆕 PREMIER STATUT REÇU: ${newStatus}`);

          const messageData = mapStatusToMessage(newStatus, demandeur);
          const personalizedMessage = messageData.message;

          console.log(`  📱 Envoi du SMS au ${demandeur.telephone}`);

          // Envoyer le SMS
          const smsResult = await sendSMS({
            telephone: demandeur.telephone,
            message: personalizedMessage,
            demandeurId: demandeur.id,
            statusIris: newStatus
          });

          if (smsResult.success) {
            console.log(`  ✅ SMS envoyé avec succès`);

            // Mettre à jour le statut
            await runQuery(
              `UPDATE demandeurs 
               SET statut_actuel = ?, 
                   sms_envoye = 1, 
                   derniere_verification = CURRENT_TIMESTAMP,
                   date_mise_a_jour = CURRENT_TIMESTAMP 
               WHERE id = ?`,
              [newStatus, demandeur.id]
            );
          } else {
            console.log(`  ❌ Erreur d'envoi SMS`);

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

          // Mettre à jour juste la date de vérification
          await runQuery(
            `UPDATE demandeurs 
             SET derniere_verification = CURRENT_TIMESTAMP
             WHERE id = ?`,
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
      const personalizedMessage = `Bonjour ${demandeur.prenom} ${demandeur.nom} le traitement de votre demande est en cours`;
      console.log(`  Envoi du message court pour statut néant: ${personalizedMessage}`);

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

    // Générer le message
    const messageData = mapStatusToMessage(irisStatus, demandeur);
    const personalizedMessage = messageData.message;

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
