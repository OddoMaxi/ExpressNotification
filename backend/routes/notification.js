const express = require('express');
const router = express.Router();
const { allQuery, getQuery } = require('../database');

/**
 * Route: GET /api/notification/stats/summary
 * Récupérer les statistiques générales
 * IMPORTANT: doit être déclaré AVANT /:demandeur_id pour éviter que "stats" soit capturé comme paramètre
 */
router.get('/stats/summary', async (req, res) => {
  try {
    // Total de demandeurs
    const totalDemandeurs = await getQuery(
      'SELECT COUNT(*) as count FROM demandeurs'
    );

    // Total de SMS envoyés
    const totalSMS = await getQuery(
      'SELECT COUNT(*) as count FROM notifications_sms'
    );

    // SMS avec succès
    const smsSucres = await getQuery(
      "SELECT COUNT(*) as count FROM notifications_sms WHERE statut_envoi = 'envoye'"
    );

    // SMS en erreur
    const smsErrors = await getQuery(
      "SELECT COUNT(*) as count FROM notifications_sms WHERE statut_envoi = 'erreur'"
    );

    // Répartition par statut Iris
    const statuts = await allQuery(
      `SELECT statut_iris, COUNT(*) as nombre 
       FROM notifications_sms 
       GROUP BY statut_iris`
    );

    res.json({
      demandeurs: {
        total: totalDemandeurs.count
      },
      sms: {
        total: totalSMS.count,
        reussis: smsSucres.count,
        erreurs: smsErrors.count
      },
      par_statut: statuts
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * Route: GET /api/notification/:demandeur_id
 * Récupérer l'historique des notifications pour un demandeur
 */
router.get('/:demandeur_id', async (req, res) => {
  try {
    const notifications = await allQuery(
      `SELECT * FROM notifications_sms
       WHERE demandeur_id = ?
       ORDER BY date_envoi DESC`,
      [req.params.demandeur_id]
    );

    res.json({
      total: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
