import apiClient from './api';

const AUTH_TOKEN_KEY = 'notificationAuthToken';

export function login(username, password) {
  return apiClient.post('/auth/login', { username, password });
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function setAuthHeader(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

export function restoreAuth() {
  const token = getToken();
  setAuthHeader(token);
  return !!token;
}
