import apiClient from './api';

const TOKEN_KEY = 'notificationAuthToken';
const USER_KEY  = 'notificationUser';

export function login(username, password) {
  return apiClient.post('/auth/login', { username, password });
}

export async function logout() {
  try { await apiClient.post('/auth/logout'); } catch {}
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  delete apiClient.defaults.headers.common.Authorization;
}

export function saveSession(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
  catch { return null; }
}

export function getRole() {
  return getUser()?.role || null;
}

export async function restoreAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return true;
  }
  // Fallback : vérifier via cookie (nouveau serveur)
  try {
    const res = await apiClient.get('/auth/check');
    if (res.data?.success) {
      saveSession(null, res.data.user);
      return true;
    }
  } catch {}
  return false;
}
