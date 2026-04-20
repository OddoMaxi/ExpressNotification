import apiClient from './api';

const TOKEN_KEY = 'notificationAuthToken';
const USER_KEY  = 'notificationUser';

export function login(username, password) {
  return apiClient.post('/auth/login', { username, password });
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
  catch { return null; }
}

export function getRole() {
  return getUser()?.role || null;
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function setAuthHeader(token) {
  if (token) apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete apiClient.defaults.headers.common.Authorization;
}

export function restoreAuth() {
  const token = getToken();
  setAuthHeader(token);
  return !!token;
}

// Anciennes fonctions conservées pour compatibilité
export function saveToken(token) { localStorage.setItem(TOKEN_KEY, token); }
