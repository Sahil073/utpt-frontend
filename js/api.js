/* ─── API Client ───────────────────────────────────────────────
   Handles all HTTP requests to the backend.
   Base URL: /api/v1  (same origin, no CORS needed)
─────────────────────────────────────────────────────────────── */

const BASE = '/api/v1';

let _accessToken = null;
let _refreshPromise = null;

export function setToken(t) { _accessToken = t; }
export function getToken()  { return _accessToken; }
export function clearToken(){ _accessToken = null; }

async function _refreshToken() {
  const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Session expired');
  const body = await res.json();
  _accessToken = body.data?.accessToken;
  return _accessToken;
}

async function request(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  const config = {
    method,
    headers,
    credentials: 'include',
  };
  if (body !== undefined && !(body instanceof FormData)) {
    config.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    delete headers['Content-Type'];
    config.body = body;
  }

  let res = await fetch(`${BASE}${path}`, config);

  // Auto-refresh on 401
  if (res.status === 401 && !opts.noRefresh) {
    if (!_refreshPromise) {
      _refreshPromise = _refreshToken().finally(() => { _refreshPromise = null; });
    }
    try {
      await _refreshPromise;
      headers['Authorization'] = `Bearer ${_accessToken}`;
      res = await fetch(`${BASE}${path}`, { ...config, headers });
    } catch {
      import('./auth.js').then(m => m.logout());
      throw new Error('Session expired');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
  return data.data;
}

// ─── Auth ──────────────────────────────────────────────────────
export const auth = {
  requestOtp:     (collegeId)              => request('POST', '/auth/request-otp',   { collegeId }),
  verifyOtp:      (collegeId, otp)         => request('POST', '/auth/verify-otp',     { collegeId, otp }),
  setCredentials: (username, password, setupToken) => {
    const old = _accessToken;
    _accessToken = setupToken;
    return request('POST', '/auth/set-credentials', { username, password })
      .finally(() => { _accessToken = old; });
  },
  login:          (collegeId, password)    => request('POST', '/auth/login',           { collegeId, password }, { noRefresh: true }),
  refresh:        ()                       => request('POST', '/auth/refresh',          undefined, { noRefresh: true }),
  logout:         ()                       => request('POST', '/auth/logout'),
};

// ─── Students ──────────────────────────────────────────────────
export const students = {
  me:            ()       => request('GET',  '/students/me'),
  updateMe:      (body)   => request('PUT',  '/students/me',          body),
  myStats:       ()       => request('GET',  '/students/me/stats'),
  myHistory:     ()       => request('GET',  '/students/me/history'),
  uploadAvatar:  (form)   => request('POST', '/students/me/avatar',   form),
  syncGithub:    ()       => request('POST', '/students/me/sync/github'),
  syncCoding:    ()       => request('POST', '/students/me/sync/coding'),
  updateFcm:     (fcmToken) => request('PUT', '/students/me/fcm-token', { fcmToken }),
  list:          (params) => request('GET',  `/students?${new URLSearchParams(params)}`),
  getById:       (id)     => request('GET',  `/students/${id}`),
};

// ─── Leaderboard ───────────────────────────────────────────────
export const leaderboard = {
  global:         (page = 1)  => request('GET', `/leaderboard/global?page=${page}`),
  byBatch:        (batch, page = 1) => request('GET', `/leaderboard/batch/${encodeURIComponent(batch)}?page=${page}`),
  bySpec:         (spec,  page = 1) => request('GET', `/leaderboard/specialization/${encodeURIComponent(spec)}?page=${page}`),
  myRank:         ()              => request('GET', '/leaderboard/my-rank'),
};

// ─── Admin ─────────────────────────────────────────────────────
export const admin = {
  dashboard:      ()       => request('GET',  '/admin/dashboard'),
  students:       (params) => request('GET',  `/admin/students?${new URLSearchParams(params)}`),
  studentDetail:  (id)     => request('GET',  `/admin/students/${id}/detail`),
  poorPerformers: ()       => request('GET',  '/admin/poor-performers'),
  topPerformers:  ()       => request('GET',  '/admin/top-performers'),
  leaderboard:    ()       => request('GET',  '/admin/leaderboard'),
  sendNotif:      (body)   => request('POST', '/admin/notify/send',    body),
  importStudents: (students) => request('POST', '/admin/import-students', { students }),
  toggleActive:   (id)     => request('PUT',  `/admin/students/${id}/toggle-active`),
  activityAnalytics: ()    => request('GET',  '/admin/analytics/activity'),
  growthAnalytics:   ()    => request('GET',  '/admin/analytics/growth'),
};

// ─── Resources ─────────────────────────────────────────────────
export const resources = {
  list:   (params) => request('GET',    `/resources?${new URLSearchParams(params)}`),
  create: (form)   => request('POST',   '/resources', form),
  delete: (id)     => request('DELETE', `/resources/${id}`),
};

// ─── Questions ─────────────────────────────────────────────────
export const questions = {
  list:   (params) => request('GET',    `/questions?${new URLSearchParams(params)}`),
  create: (body)   => request('POST',   '/questions', body),
  update: (id, b)  => request('PUT',    `/questions/${id}`, b),
  delete: (id)     => request('DELETE', `/questions/${id}`),
};

// ─── Notifications ─────────────────────────────────────────────
export const notifications = {
  list:    (params) => request('GET',   `/notifications?${new URLSearchParams(params)}`),
  read:    (id)     => request('PATCH', `/notifications/${id}/read`),
  readAll: ()       => request('PATCH', '/notifications/read-all'),
};
