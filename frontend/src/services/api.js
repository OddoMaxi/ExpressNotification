import axios from 'axios';

// Créer une instance axios avec la configuration de base
const API_URL = process.env.REACT_APP_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('notificationAuthToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const is401 = error.response?.status === 401;
    const isCheckRoute = url.includes('/auth/check');
    if (is401 && !isCheckRoute) {
      localStorage.removeItem('notificationAuthToken');
      localStorage.removeItem('notificationUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Service d'enregistrement
export const registrationService = {
  register: (data) => apiClient.post('/registration', data),
  getAll: () => apiClient.get('/registration'),
  getById: (id) => apiClient.get(`/registration/${id}`),
  update: (id, data) => apiClient.put(`/registration/${id}`, data),
  delete: (id) => apiClient.delete(`/registration/${id}`),
  sendManualSMS: (id)          => apiClient.post(`/registration/${id}/send-sms`),
  sendCustomSMS: (id, message) => apiClient.post(`/registration/${id}/send-custom-sms`, { message })
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
