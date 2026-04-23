const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { runQuery, getQuery, allQuery } = require('../database');
const { manuallyCheckAndSendSMS } = require('../services/cronService');
const { sendSMS } = require('../services/smsService');

/**
 * Route: POST /api/registration
 * Enregistrer un nouveau demandeur
 */
router.post(
  '/',
  [
    body('reference_recu').notEmpty().withMessage('La référence de reçu est requise'),
    body('nom').notEmpty().withMessage('Le nom est requis'),
    body('prenom').notEmpty().withMessage('Le prénom est requis'),
    body('telephone')
      .notEmpty().withMessage('Le téléphone est requis')
      .matches(/^(\+224|00224)?[0-9]{9}$/).withMessage('Téléphone invalide, format +224XXXXXXXXX'),
    body('email').optional().isEmail().withMessage('Email invalide'),
    body('service_type').notEmpty().withMessage('Le type de service est requis')
  ],
  async (req, res) => {
    try {
      // Valider les entrées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation échouée',
          errors: errors.array()
        });
      }

      const { reference_recu, nom, prenom, telephone, email, service_type, ticket_number } = req.body;

      // Vérifier si la référence existe déjà
      const existing = await getQuery(
        'SELECT id FROM demandeurs WHERE reference_recu = ?',
        [reference_recu]
      );

      if (existing) {
        return res.status(400).json({
          error: 'Cette référence de reçu existe déjà dans le système'
        });
      }

      // Insérer le demandeur
      const query = `
        INSERT INTO demandeurs (reference_recu, nom, prenom, telephone, email, service_type, ticket_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await runQuery(query, [
        reference_recu,
        nom,
        prenom,
        telephone,
        email || null,
        service_type,
        ticket_number || null
      ]);

      console.log(`✓ Demandeur enregistré: ${nom} ${prenom} (ID: ${result.lastID})`);

      // Envoyer le SMS d'accueil automatiquement
      const welcomeMessage = `Bonjour cher client, votre demande de passport est en cours de traitement. Merci pour la confiance !`;
      
      try {
        console.log(`📱 Envoi du SMS d'accueil au ${telephone}`);
        const smsResult = await sendSMS({
          telephone: telephone,
          message: welcomeMessage,
          demandeurId: result.lastID,
          statusIris: 'enregistrement'
        });

        if (smsResult.success) {
          console.log(`✓ SMS d'accueil envoyé avec succès`);
          
          // Mettre à jour le flag sms_envoye
          await runQuery(
            'UPDATE demandeurs SET sms_envoye = 1 WHERE id = ?',
            [result.lastID]
          );
        } else {
          console.log(`⚠️  SMS d'accueil non envoyé: ${smsResult.error}`);
        }
      } catch (smsError) {
        console.error(`⚠️  Erreur lors de l'envoi du SMS d'accueil:`, smsError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Demandeur enregistré avec succès',
        demandeur: {
          id: result.lastID,
          reference_recu,
          nom,
          prenom,
          telephone,
          email: email || null,
          service_type,
          ticket_number: ticket_number || null,
          statut_actuel: 'néant'
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }
);

/**
 * Route: GET /api/registration/:id
 * Récupérer les détails d'un demandeur
 */
router.get('/:id', async (req, res) => {
  try {
    const demandeur = await getQuery(
      'SELECT * FROM demandeurs WHERE id = ?',
      [req.params.id]
    );

    if (!demandeur) {
      return res.status(404).json({ error: 'Demandeur non trouvé' });
    }

    res.json(demandeur);
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * Route: GET /api/registration
 * Lister tous les demandeurs
 */
router.get('/', async (req, res) => {
  try {
    const demandeurs = await allQuery('SELECT * FROM demandeurs ORDER BY date_enregistrement DESC');

    res.json({
      total: demandeurs.length,
      demandeurs
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la liste:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * Route: PUT /api/registration/:id
 * Mettre à jour les détails d'un demandeur
 */
router.put('/:id', async (req, res) => {
  try {
    const { nom, prenom, telephone, email } = req.body;

    const query = `
      UPDATE demandeurs
      SET nom = ?, prenom = ?, telephone = ?, email = ?, date_mise_a_jour = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await runQuery(query, [
      nom,
      prenom,
      telephone,
      email || null,
      req.params.id
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Demandeur non trouvé' });
    }

    res.json({
      success: true,
      message: 'Demandeur mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * Route: POST /api/registration/:id/send-sms
 * Envoyer manuellement un SMS personnalisé selon le statut actuel
 */
router.post('/:id/send-sms', async (req, res) => {
  try {
    const demandeurId = req.params.id;

    console.log(`\n📱 Envoi manuel de SMS pour demandeur ID: ${demandeurId}`);

    const result = await manuallyCheckAndSendSMS(demandeurId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        demandeur: result.demandeur,
        statut_actuel: result.statut,
        sms_message: result.sms_message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi manuel du SMS:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
