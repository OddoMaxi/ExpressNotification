const axios = require('axios');

/**
 * Service pour communiquer avec l'API Iris - Guinea GCPIS MOFA
 * Permet de vérifier le statut d'une demande de passeport
 *
 * Documentation: UAT/PIS/PCR025/0100 - Central MOFA Notification API v1.0.3.0
 */

let authToken = null;
let tokenExpiry = null;
let tokenGenerationPromise = null;

const irisApi = axios.create({
  baseURL: process.env.IRIS_BASE_URL || 'http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Générer un token d'authentification pour l'API Iris
 * Utilise un verrou Promise pour éviter les générations concurrentes (race condition)
 * @returns {Promise<string>} - Le token d'authentification Bearer
 */
async function generateToken() {
  if (authToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    console.log('✓ Token d\'authentification réutilisé');
    return authToken;
  }

  if (tokenGenerationPromise) {
    return tokenGenerationPromise;
  }

  tokenGenerationPromise = (async () => {
    try {
      if (authToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
        return authToken;
      }

      console.log('🔐 Génération d\'un nouveau token d\'authentification...');

      const response = await irisApi.post('/api/auth/token', {
        username: process.env.IRIS_USERNAME,
        password: process.env.IRIS_PASSWORD
      });

      const tokenValue = response.data.access_token || response.data.token;
      if (response.data && tokenValue) {
        authToken = tokenValue;
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
    } finally {
      tokenGenerationPromise = null;
    }
  })();

  return tokenGenerationPromise;
}

/**
 * Vérifier le statut d'une demande via la référence de reçu (TicketNumber)
 * @param {string} ticketNumber - Le numéro de ticket (Payment Reference No.)
 * @returns {Promise<object>} - Statut et détails de la demande
 */
async function checkStatus(ticketNumber) {
  try {
    console.log(`📤 Vérification du statut pour ticket: ${ticketNumber}`);

    const token = await generateToken();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const formatDate = (date) => date.toISOString().split('T')[0];

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

      const records = response.data.data || [];
      const statusValue = records.length > 0 ? records[0].status : 'not_found';

      return {
        success: true,
        statut: statusValue,
        details: records.length > 0 ? records[0] : null,
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
 * Mapper les statuts de l'API Iris à des messages personnalisés pour SMS
 * Statuts possibles selon UAT:
 * - Pending Final Approval
 * - Final Approval Passed
 * - Final Approval Rejected
 * - Production Completed
 */
const SMS_STATUTS_ACTIFS = ['final approval rejected', 'production completed'];

function shouldSendSMS(irisStatus) {
  return SMS_STATUTS_ACTIFS.includes((irisStatus || '').toLowerCase().trim());
}

function mapStatusToMessage(irisStatus) {
  const statusMessages = {
    'final approval rejected': {
      message: `Cher client, votre demande de passeport a ete rejetee. Veuillez vous rendre au centre pour plus d'informations. Merci pour la confiance !`,
      type: 'erreur'
    },
    'production completed': {
      message: `Cher client votre passeport est pret, veuillez vous presenter au centre pour le retrait. Merci pour la confiance !`,
      type: 'urgent'
    }
  };

  const normalizedStatus = (irisStatus || '').toLowerCase().trim();
  return statusMessages[normalizedStatus] || null;
}

async function checkIrisHealth() {
  const start = Date.now();
  try {
    await generateToken();
    return { online: true, latencyMs: Date.now() - start };
  } catch (error) {
    return { online: false, latencyMs: Date.now() - start, error: error.message };
  }
}

async function searchApplications({ startDate, endDate, applicationStatus }) {
  try {
    const token = await generateToken();
    const response = await irisApi.post('/api/cig/ListNotifyApplication',
      {
        TicketNumber: '',
        StartSubmissionDate: startDate,
        EndSubmissionDate: endDate,
        ApplicationStatus: applicationStatus || ''
      },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (response.status === 200 && response.data) {
      return {
        success: true,
        data: response.data.data || [],
        message: response.data.message
      };
    }
    throw new Error('Réponse Iris invalide');
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
}

module.exports = {
  checkStatus,
  searchApplications,
  mapStatusToMessage,
  shouldSendSMS,
  checkIrisHealth
};
