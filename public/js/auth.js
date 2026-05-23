import { auth as authApi, setToken, clearToken } from './api.js';

const KEY_USER  = 'utpt_user';
const KEY_TOKEN = 'utpt_token';

export function getUser()   { try { return JSON.parse(localStorage.getItem(KEY_USER) || 'null'); } catch { return null; } }
export function isLoggedIn(){ return !!getUser() && !!localStorage.getItem(KEY_TOKEN); }
export function getRole()   { return getUser()?.role || null; }

export function saveSession(user, token) {
  localStorage.setItem(KEY_USER,  JSON.stringify(user));
  localStorage.setItem(KEY_TOKEN, token);
  setToken(token);
}

export async function logout() {
  try { await authApi.logout(); } catch {}
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_TOKEN);
  clearToken();
  window.location.href = '/login.html';
}

export function requireAuth(allowedRoles) {
  const user  = getUser();
  const token = localStorage.getItem(KEY_TOKEN);
  if (!user || !token) { window.location.href = '/login.html'; return false; }
  setToken(token);
  if (allowedRoles && !allowedRoles.includes(user.role)) { window.location.href = '/dashboard.html'; return false; }
  return true;
}

export function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    setToken(localStorage.getItem(KEY_TOKEN));
    const user = getUser();
    if (user?.role === 'admin') {
      window.location.href = '/admin.html';
    } else if (user?.role === 'trainer') {
      window.location.href = '/trainer.html';
    } else {
      window.location.href = '/dashboard.html';
    }
    return true;
  }
  return false;
}
