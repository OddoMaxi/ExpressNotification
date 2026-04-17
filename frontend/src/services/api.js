import axios from 'axios';

// Créer une instance axios avec la configuration de base
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('notificationAuthToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Service d'enregistrement
export const registrationService = {
  register: (data) => apiClient.post('/registration', data),
  getAll: () => apiClient.get('/registration'),
  getById: (id) => apiClient.get(`/registration/${id}`),
  update: (id, data) => apiClient.put(`/registration/${id}`, data),
  sendManualSMS: (id) => apiClient.post(`/registration/${id}/send-sms`)
};

// Service de statut
export const statusService = {
  checkAndNotify: (data) => apiClient.post('/status/check', data),
  getLatest: (demandeurId) => apiClient.get(`/status/${demandeurId}`)
};

// Service de notifications
export const notificationService = {
  getHistory: (demandeurId) => apiClient.get(`/notification/${demandeurId}`),
  getStats: () => apiClient.get('/notification/stats/summary')
};

export default apiClient;
