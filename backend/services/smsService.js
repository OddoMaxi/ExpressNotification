const axios = require('axios');
const { allQuery, runQuery } = require('../database');

/**
 * Service pour envoyer des SMS via l'API Interactgroup
 */

const smsApi = axios.create({
  timeout: 10000
});

/**
 * Envoyer un SMS à un demandeur
 * @param {object} params - Paramètres d'envoi
 * @returns {Promise<object>} - Résultat de l'envoi
 */
function truncateMessage(message, maxLength = 60) {
  if (!message) return '';
  if (message.length <= maxLength) return message;
  return `${message.slice(0, maxLength - 3)}...`;
}

async function sendSMS(params) {
  const { telephone, message, demandeurId, statusIris } = params;
  const smsMessage = message;

  try {
    console.log(`📞 Envoi SMS à ${telephone}...`);
    console.log(`📝 Message SMS: ${smsMessage}`);

    // Construire l'URL avec les paramètres
    const smsUrl = buildSmsUrl(telephone, smsMessage);
    console.log(`📍 URL SMS générée: ${smsUrl}`);

    // Appeler l'API SMS
    const response = await smsApi.get(smsUrl);

    console.log(`✓ Réponse API SMS:`, response.status, response.statusText);
    console.log(`✓ Données réponse:`, JSON.stringify(response.data).substring(0, 200));

    // Log de l'envoi dans la base de données
    const logResult = await logSMSSending({
      demandeur_id: demandeurId,
      numero_telephone: telephone,
      message: message,
      statut_iris: statusIris,
      response_api: JSON.stringify(response.data)
    });

    console.log(`✓ SMS envoyé avec succès (ID: ${logResult.lastID})`);

    return {
      success: true,
      messageId: logResult.lastID,
      response: response.data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi SMS:', error.message);
    console.error('❌ Détails erreur:', error.response?.status, error.response?.data);

    // Logger l'erreur
    await logSMSSending({
      demandeur_id: demandeurId,
      numero_telephone: telephone,
      message: message,
      statut_iris: statusIris,
      response_api: JSON.stringify({ error: error.message, apiResponse: error.response?.data }),
      statut_envoi: 'erreur'
    });

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Construire l'URL pour l'API SMS Interactgroup
 * API: http://sms.interactgroup.net
 * @param {string} telephone - Numéro de téléphone (format: 224xxxxxxxxx)
 * @param {string} message - Message à envoyer
 * @returns {string} - URL complète avec paramètres
 */
function buildSmsUrl(telephone, message) {
  // Nettoyer le numéro de téléphone
  let cleanPhone = telephone.replace(/[\D]/g, ''); // Enlever tout caractère non-numérique
  if (cleanPhone.startsWith('224')) {
    // Garder le format complet
  } else if (cleanPhone.length === 9) {
    // Ajouter le code pays si absent
    cleanPhone = '224' + cleanPhone;
  }

  // Ajouter le + pour le format international
  cleanPhone = '+' + cleanPhone;

  const params = new URLSearchParams({
    app: 'ws',
    u: process.env.SMS_USER || 'louba',
    h: process.env.SMS_HASH || '97962ccc0add0f87b0570561acc59b45',
    op: 'pv',
    to: cleanPhone,
    msg: message,
    from: process.env.SMS_FROM || 'LOUBA'
  });

  const baseUrl = process.env.SMS_API_URL || 'http://sms.interactgroup.net/index.php';
  const separator = baseUrl.includes('?') ? '&' : '?';

  return `${baseUrl}${separator}${params.toString()}`;
}

/**
 * Enregistrer l'envoi d'un SMS dans la base de données
 * @param {object} data - Données à enregistrer
 * @returns {Promise<object>} - Résultat de l'insertion
 */
async function logSMSSending(data) {
  const query = `
    INSERT INTO notifications_sms 
    (demandeur_id, numero_telephone, message, statut_iris, response_api_sms, statut_envoi)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.demandeur_id,
    data.numero_telephone,
    data.message,
    data.statut_iris,
    data.response_api || null,
    data.statut_envoi || 'envoye'
  ];

  try {
    return await runQuery(query, params);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement SMS:', error);
    throw error;
  }
}

/**
 * Obtenir l'historique des SMS envoyés
 * @param {number} demandeurId - ID du demandeur
 * @returns {Promise<array>} - Liste des SMS envoyés
 */
async function getSMSHistory(demandeurId) {
  const query = `
    SELECT * FROM notifications_sms 
    WHERE demandeur_id = ? 
    ORDER BY date_envoi DESC
  `;

  try {
    return await allQuery(query, [demandeurId]);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique SMS:', error);
    throw error;
  }
}

module.exports = {
  sendSMS,
  buildSmsUrl,
  logSMSSending,
  getSMSHistory
};
