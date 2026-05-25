import { setAccessToken, getAccessToken, auth as authApi } from "./api.js";

const TOKEN_KEY = "accessToken";
const USER_KEY  = "utpt_user";

export function saveSession(accessToken, user) {
  setAccessToken(accessToken);
  sessionStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadSession() {
  const t = sessionStorage.getItem(TOKEN_KEY);
  if (t) setAccessToken(t);
  return t;
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
  catch { return null; }
}

export function clearSession() {
  setAccessToken(null);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function requireAuth(allowedRoles = null) {
  let token = loadSession();

  if (!token) {
    const refreshed = await authApi.refresh();
    if (!refreshed) {
      window.location.href = "/login.html";
      return null;
    }
    token = getAccessToken();
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
  }

  const user = getUser();

  if (!user) {
    window.location.href = "/login.html";
    return null;
  }

  // Role guard: redirect to correct dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirectByRole(user.role);
    return null;
  }

  return user;
}

export function redirectByRole(role) {
  const map = {
    admin:   "/admin.html",
    trainer: "/trainer.html",
    student: "/dashboard.html",
  };
  window.location.href = map[role] || "/login.html";
}

export async function logout() {
  try { await authApi.logout(); } catch {}
  clearSession();
  window.location.href = "/login.html";
}
