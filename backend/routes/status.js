const express = require('express');
const router = express.Router();
const { getQuery } = require('../database');
const { checkStatus, searchApplications, mapStatusToMessage } = require('../services/irisService');
const { sendSMS } = require('../services/smsService');

/**
 * Route: POST /api/status/check
 * Vérifier le statut et envoyer une notification SMS
 * 
 * Body:
 * {
 *   "demandeur_id": 1,
 *   "ticket_number": "F20250603000"  (Payment Reference No.)
 * }
 */
router.post('/check', async (req, res) => {
  try {
    const { demandeur_id, ticket_number } = req.body;

    if (!demandeur_id || !ticket_number) {
      return res.status(400).json({
        error: 'demandeur_id et ticket_number (Payment Reference) sont requis'
      });
    }

    // Récupérer les informations du demandeur
    const demandeur = await getQuery(
      'SELECT * FROM demandeurs WHERE id = ?',
      [demandeur_id]
    );

    if (!demandeur) {
      return res.status(404).json({ error: 'Demandeur non trouvé' });
    }

    console.log(`\n🔄 Vérification du statut pour ${demandeur.nom} ${demandeur.prenom} (Ticket: ${ticket_number})`);

    // Appeler l'API Iris pour vérifier le statut
    const irisResponse = await checkStatus(ticket_number);

    if (!irisResponse.success) {
      return res.status(500).json({
        error: 'Impossible de vérifier le statut via l\'API Iris',
        details: irisResponse.error
      });
    }

    const irisStatus = irisResponse.statut;

    // Mapper le statut à un message personnalisé
    const messageData = mapStatusToMessage(irisStatus, demandeur);
    const personalizedMessage = messageData.message;

    console.log(`\n📨 Message personnalisé: ${personalizedMessage.substring(0, 50)}...`);

    // Envoyer le SMS
    const smsResult = await sendSMS({
      telephone: demandeur.telephone,
      message: personalizedMessage,
      demandeurId: demandeur.id,
      statusIris: irisStatus
    });

    res.json({
      success: true,
      message: 'Statut vérifié et SMS envoyé avec succès',
      verification: {
        demandeur: {
          id: demandeur.id,
          reference_recu: demandeur.reference_recu,
          nom: demandeur.nom,
          prenom: demandeur.prenom,
          telephone: demandeur.telephone
        },
        ticket_number: ticket_number,
        statut_iris: irisStatus,
        message_personnalise: personalizedMessage,
        type_message: messageData.type,
        sms_result: smsResult
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du statut:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Route: GET /api/status/:demandeur_id
 * Récupérer le dernier statut enregistré
 */
router.get('/:demandeur_id', async (req, res) => {
  try {
    const notification = await getQuery(
      `SELECT * FROM notifications_sms 
       WHERE demandeur_id = ? 
       ORDER BY date_envoi DESC LIMIT 1`,
      [req.params.demandeur_id]
    );

    if (!notification) {
      return res.status(404).json({
        message: 'Aucune notification trouvée pour ce demandeur'
      });
    }

    res.json(notification);
  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Route: GET /api/status/verify/:ticket_number
 * Vérifier le statut IRIS par numéro de ticket uniquement (sans SMS)
 */
router.get('/verify/:ticket_number', async (req, res) => {
  const { ticket_number } = req.params;

  if (!ticket_number || ticket_number.trim() === '') {
    return res.status(400).json({ error: 'Numéro de ticket requis' });
  }

  try {
    const irisResponse = await checkStatus(ticket_number.trim());

    if (!irisResponse.success) {
      return res.status(502).json({
        error: 'Impossible de joindre l\'API IRIS',
        details: irisResponse.error
      });
    }

    // Chercher si ce ticket correspond à un demandeur enregistré
    const demandeur = await getQuery(
      'SELECT id, reference_recu, nom, prenom, telephone, service_type, statut_actuel, derniere_verification FROM demandeurs WHERE ticket_number = ?',
      [ticket_number.trim()]
    );

    res.json({
      success: true,
      ticket_number,
      statut_iris: irisResponse.statut,
      details: irisResponse.details,
      demandeur: demandeur || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Route: POST /api/status/search
 * Rechercher des demandes par plage de dates et statut (max 3 mois)
 */
router.post('/search', async (req, res) => {
  const { startDate, endDate, applicationStatus } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate et endDate sont requis' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end)) {
    return res.status(400).json({ error: 'Format de date invalide (yyyy-mm-dd attendu)' });
  }

  if (end < start) {
    return res.status(400).json({ error: 'La date de fin doit être après la date de début' });
  }

  const diffDays = (end - start) / (1000 * 60 * 60 * 24);
  if (diffDays > 92) {
    return res.status(400).json({ error: 'La plage de dates ne peut pas dépasser 3 mois' });
  }

  const result = await searchApplications({
    startDate,
    endDate,
    applicationStatus: applicationStatus || ''
  });

  if (!result.success) {
    return res.status(502).json({ error: 'Impossible de joindre l\'API IRIS', details: result.error });
  }

  res.json({ success: true, total: result.data.length, data: result.data });
});

module.exports = router;
