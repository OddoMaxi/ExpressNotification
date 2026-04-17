const axios = require('axios');

/**
 * Service pour communiquer avec l'API Iris - Guinea GCPIS MOFA
 * Permet de vérifier le statut d'une demande de passeport
 * 
 * Documentation: UAT/PIS/PCR025/0100 - Central MOFA Notification API v1.0.3.0
 */

let authToken = null;
let tokenExpiry = null;

const irisApi = axios.create({
  baseURL: process.env.IRIS_BASE_URL || 'http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Générer un token d'authentification pour l'API Iris
 * @returns {Promise<string>} - Le token d'authentification Bearer
 */
async function generateToken() {
  try {
    // Vérifier si le token est encore valide (avec 1 minute de marge)
    if (authToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
      console.log('✓ Token d\'authentification réutilisé');
      return authToken;
    }

    console.log('🔐 Génération d\'un nouveau token d\'authentification...');
    
    const response = await irisApi.post('/api/auth/token', {
      username: process.env.IRIS_USERNAME || 'MOFA',
      password: process.env.IRIS_PASSWORD || 'M0fa2025!'
    });

    if (response.data && response.data.access_token) {
      authToken = response.data.access_token;
      // expires_in est en heures (ex: 12)
      const expiresInMs = (response.data.expires_in || 12) * 3600 * 1000;
      tokenExpiry = Date.now() + expiresInMs;
      console.log(`✓ Token généré avec succès (validité: ${response.data.expires_in || 12} heures)`);
      return authToken;
    } else {
      throw new Error('Pas de token dans la réponse Iris');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la génération du token:', error.message);
    throw error;
  }
}

/**
 * Vérifier le statut d'une demande via la référence de reçu (TicketNumber)
 * @param {string} ticketNumber - Le numéro de ticket (Payment Reference No.)
 * @returns {Promise<object>} - Statut et détails de la demande
 */
async function checkStatus(ticketNumber) {
  try {
    console.log(`📤 Vérification du statut pour ticket: ${ticketNumber}`);
    
    // Générer un token d'authentification
    const token = await generateToken();

    // Calculer la date de début (3 mois avant aujourd'hui) et fin (aujourd'hui)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    const formatDate = (date) => date.toISOString().split('T')[0]; // yyyy-mm-dd

    // Appeler l'endpoint ListNotifyApplication
    const response = await irisApi.post('/api/cig/ListNotifyApplication', 
      {
        TicketNumber: ticketNumber,
        StartSubmissionDate: formatDate(startDate),
        EndSubmissionDate: formatDate(endDate),
        ApplicationStatus: ""
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (response.status === 200 && response.data) {
      console.log(`✓ Statut reçu de l'API Iris`);
      
      // Extraire le statut du premier enregistrement
      const statusValue = response.data.ApplicationStatus || response.data.status || 'en_attente';
      
      return {
        success: true,
        statut: statusValue,
        details: response.data,
        raw: response.data
      };
    } else {
      throw new Error('Réponse Iris invalide');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel API Iris:', error.message);
    return {
      success: false,
      error: error.message,
      statut: 'erreur_api'
    };
  }
}

/**
 * Mapper les statuts Iris à des messages personnalisés
 * @param {string} irisStatus - Statut reçu de l'API Iris
 * @returns {object} - Message personnalisé et contexte
 */
/**
 * Mapper les statuts de l'API Iris à des messages personnalisés pour SMS
 * Statuts possibles selon UAT: 
 * - Pending Final Approval
 * - Final Approval Passed
 * - Final Approval Rejected
 * - Production Completed
 */
function mapStatusToMessage(irisStatus, demandeur) {
  const statusMessages = {
    'pending final approval': {
      message: `Bonjour ${demandeur.prenom}, Votre demande de passeport (Réf: ${demandeur.reference_recu}) est EN ATTENTE d'approbation finale. Veuillez patienter.`,
      type: 'info',
      emoji: '⏳'
    },
    'final approval passed': {
      message: `Bonjour ${demandeur.prenom}, FÉLICITATIONS ! Votre demande de passeport (Réf: ${demandeur.reference_recu}) a été APPROUVÉE. Veuillez vous présenter au guichet pour retirer votre passeport.`,
      type: 'succes',
      emoji: '✅'
    },
    'final approval rejected': {
      message: `Bonjour ${demandeur.prenom}, Votre demande de passeport (Réf: ${demandeur.reference_recu}) a été REJETÉE. Veuillez contacter le centre MOFA pour plus d'informations.`,
      type: 'erreur',
      emoji: '❌'
    },
    'production completed': {
      message: `Bonjour ${demandeur.prenom}, 🚨 URGENT! Votre passeport (Réf: ${demandeur.reference_recu}) est PRÊT et en retrait. Veuillez vous présenter rapidement.`,
      type: 'urgent',
      emoji: '🚨'
    }
  };

  const normalizedStatus = (irisStatus || '').toLowerCase().trim();
  return statusMessages[normalizedStatus] || {
    message: `Bonjour ${demandeur.prenom}, Votre demande de passeport (Réf: ${demandeur.reference_recu}) a un nouveau statut: ${irisStatus}. Consultez le centre pour plus de détails.`,
    type: 'info',
    emoji: 'ℹ️'
  };
}

module.exports = {
  checkStatus,
  mapStatusToMessage
};
