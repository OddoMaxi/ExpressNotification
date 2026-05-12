const express = require('express');
const router = express.Router();
const { allQuery, getQuery } = require('../database');
const { checkIrisHealth, searchApplications } = require('../services/irisService');

router.get('/dashboard', async (req, res) => {
  try {
    const [statusBreakdown, demandeurs, recentChanges, smsByDay, irisHealth] = await Promise.all([
      allQuery(`
        SELECT statut_actuel, COUNT(*) as count
        FROM demandeurs
        GROUP BY statut_actuel
        ORDER BY count DESC
      `),
      allQuery(`
        SELECT d.id, d.reference_recu, d.nom, d.prenom, d.telephone,
               d.service_type, d.ticket_number, d.statut_actuel,
               d.sms_envoye, d.derniere_verification, d.date_enregistrement,
               COUNT(n.id) AS nb_sms
        FROM demandeurs d
        LEFT JOIN notifications_sms n ON n.demandeur_id = d.id
        GROUP BY d.id, d.reference_recu, d.nom, d.prenom, d.telephone,
                 d.service_type, d.ticket_number, d.statut_actuel,
                 d.sms_envoye, d.derniere_verification, d.date_enregistrement
        ORDER BY d.date_enregistrement DESC
      `),
      allQuery(`
        SELECT n.date_envoi, n.statut_iris, n.statut_envoi,
               d.nom, d.prenom, d.reference_recu, d.telephone
        FROM notifications_sms n
        JOIN demandeurs d ON n.demandeur_id = d.id
        ORDER BY n.date_envoi DESC
        LIMIT 20
      `),
      allQuery(`
        SELECT date_envoi::date AS day, COUNT(*) as count
        FROM notifications_sms
        WHERE date_envoi::date >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY day ORDER BY day
      `),
      checkIrisHealth()
    ]);

    const total = demandeurs.length;
    const avecTicket = demandeurs.filter(d => d.ticket_number).length;
    const sansTicket = total - avecTicket;
    const lastCronRun = demandeurs
      .map(d => d.derniere_verification)
      .filter(Boolean)
      .sort()
      .pop() || null;

    res.json({
      stats: {
        total,
        avecTicket,
        sansTicket,
        lastCronRun,
        serverTime: new Date().toISOString()
      },
      statusBreakdown,
      demandeurs,
      recentChanges,
      smsByDay,
      irisHealth
    });
  } catch (err) {
    console.error('Erreur dashboard superviseur:', err.message);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

router.post('/branches', async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate et endDate sont requis' });
  }

  const start = new Date(startDate);
  const end   = new Date(endDate);
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);

  if (isNaN(start) || isNaN(end) || end < start) {
    return res.status(400).json({ error: 'Dates invalides' });
  }
  if (diffDays > 92) {
    return res.status(400).json({ error: 'La plage ne peut pas dépasser 3 mois' });
  }

  try {
    const result = await searchApplications({ startDate, endDate, applicationStatus: '' });

    if (!result.success) {
      return res.status(502).json({ error: 'Impossible de joindre l\'API IRIS', details: result.error });
    }

    const branchMap = {};
    for (const app of result.data) {
      const branchId = String(app.applicationId || '').substring(0, 3);
      if (!branchId || branchId.length < 3) continue;

      if (!branchMap[branchId]) {
        branchMap[branchId] = { total: 0, completed: 0, approved: 0, pending: 0, rejected: 0 };
      }
      branchMap[branchId].total++;

      switch ((app.status || '').toLowerCase()) {
        case 'production completed':    branchMap[branchId].completed++; break;
        case 'final approval passed':   branchMap[branchId].approved++;  break;
        case 'pending final approval':  branchMap[branchId].pending++;   break;
        case 'final approval rejected': branchMap[branchId].rejected++;  break;
      }
    }

    res.json({
      total: result.data.length,
      period: { startDate, endDate },
      branches: branchMap
    });
  } catch (err) {
    console.error('Erreur branches superviseur:', err.message);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
