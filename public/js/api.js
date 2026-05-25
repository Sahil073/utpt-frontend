const BASE = "https://utpt-backend.onrender.com/api/v1";

const REQUEST_TIMEOUT_MS = 30000;

let _accessToken = null;

export function setAccessToken(t) { _accessToken = t; }
export function getAccessToken()  { return _accessToken; }

function redirectToLogin() {
  _accessToken = null;
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("utpt_user");
  if (!window.location.pathname.endsWith("/login.html")) {
    window.location.href = "/login.html";
  }
}

async function request(method, path, body, isForm = false) {
  const headers = {};
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;
  if (!isForm) headers["Content-Type"] = "application/json";

  const opts = { method, headers, credentials: "include" };
  if (body) opts.body = isForm ? body : JSON.stringify(body);

  // ── AbortController for 30s timeout ──────────────────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  opts.signal = controller.signal;

  let res;
  try {
    res = await fetch(BASE + path, opts);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw Object.assign(
        new Error("Request timed out. The server may be starting up — please try again in a moment."),
        { status: 408 }
      );
    }
    throw Object.assign(
      new Error("Network error. Check your internet connection and try again."),
      { status: 0 }
    );
  }
  clearTimeout(timeoutId);

  // ── 401: try refresh then retry ───────────────────────────
  if (res.status === 401 && _accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${_accessToken}`;
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), REQUEST_TIMEOUT_MS);
      let retryRes;
      try {
        retryRes = await fetch(BASE + path, { ...opts, headers, signal: retryController.signal });
      } catch {
        clearTimeout(retryTimeout);
        throw Object.assign(new Error("Network error on retry."), { status: 0 });
      }
      clearTimeout(retryTimeout);
      let retryData;
      try { retryData = await retryRes.json(); }
      catch { throw Object.assign(new Error("Invalid server response."), { status: retryRes.status }); }
      if (!retryData.success) throw Object.assign(new Error(retryData.message || "Request failed"), { status: retryRes.status, data: retryData });
      return retryData;
    } else {
      // Refresh failed — session expired, force login
      redirectToLogin();
      throw Object.assign(new Error("Session expired. Please log in again."), { status: 401 });
    }
  }

  // ── Parse JSON safely ─────────────────────────────────────
  let data;
  try {
    data = await res.json();
  } catch {
    throw Object.assign(
      new Error("Server returned an invalid response. Please try again."),
      { status: res.status }
    );
  }

  if (!data.success) {
    throw Object.assign(new Error(data.message || "Request failed"), { status: res.status, data });
  }
  return data;
}

async function tryRefresh() {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let r;
    try {
      r = await fetch(BASE + "/auth/refresh", { method: "POST", credentials: "include", signal: controller.signal });
    } finally {
      clearTimeout(t);
    }
    const d = await r.json();
    if (d.success && d.data?.accessToken) {
      _accessToken = d.data.accessToken;
      sessionStorage.setItem("accessToken", _accessToken);
      return true;
    }
  } catch {}
  return false;
}

export const get      = (p)        => request("GET",    p);
export const post     = (p, b)     => request("POST",   p, b);
export const put      = (p, b)     => request("PUT",    p, b);
export const del      = (p)        => request("DELETE", p);
export const postForm = (p, b)     => request("POST",   p, b, true);

export const auth = {
  login:          (b) => post("/auth/login", b),
  logout:         ()  => post("/auth/logout"),
  refresh:        ()  => tryRefresh(),
};

export const students = {
  me:             ()    => get("/students/me"),
  stats:          ()    => get("/students/me/stats"),
  history:        ()    => get("/students/me/history"),
  update:         (b)   => put("/students/me", b),
  changePassword: (b)   => put("/students/me/password", b),
  uploadAvatar:   (f)   => { const fd = new FormData(); fd.append("avatar", f); return postForm("/students/me/avatar", fd); },
  syncGitHub:     ()    => post("/students/me/sync/github"),
  syncCoding:     ()    => post("/students/me/sync/coding"),
  getById:        (id)  => get(`/students/${id}`),
  search:         (q)   => get(`/students?${new URLSearchParams(q)}`),
};

export const leaderboard = {
  global:         (p=1) => get(`/leaderboard/global?page=${p}`),
  batch:          (b,p=1) => get(`/leaderboard/batch/${encodeURIComponent(b)}?page=${p}`),
  spec:           (s,p=1) => get(`/leaderboard/specialization/${encodeURIComponent(s)}?page=${p}`),
  filter:         (q)   => get(`/leaderboard/filter?${new URLSearchParams(q)}`),
  myRank:         ()    => get("/leaderboard/my-rank"),
};

export const admin = {
  dashboard:      ()    => get("/admin/dashboard"),
  students:       (q)   => get(`/admin/students?${new URLSearchParams(q)}`),
  studentDetail:  (id)  => get(`/admin/students/${id}/detail`),
  searchStudent:  (q)   => get(`/admin/students/search?${new URLSearchParams(q)}`),
  toggleActive:   (id)  => put(`/admin/students/${id}/toggle-active`),
  topPerformers:  ()    => get("/admin/top-performers"),
  poorPerformers: ()    => get("/admin/poor-performers"),
  activity:       ()    => get("/admin/analytics/activity"),
  growth:         ()    => get("/admin/analytics/growth"),
  batchAnalytics: (b)   => get(`/admin/analytics/batch?batch=${encodeURIComponent(b)}`),
  importJSON:     (b)   => post("/admin/import-students", b),
  importFile:     (f)   => { const fd = new FormData(); fd.append("file", f); return postForm("/admin/import-students/file", fd); },
  createTrainer:  (b)   => post("/admin/create-trainer", b),
  notify:         (b)   => post("/admin/notify/send", b),
};

export const resources = {
  list:   (q)   => get(`/resources?${new URLSearchParams(q)}`),
  create: (b)   => post("/resources", b),
  update: (id,b)=> put(`/resources/${id}`, b),
  remove: (id)  => del(`/resources/${id}`),
};

export const questions = {
  list:   (q)   => get(`/questions?${new URLSearchParams(q)}`),
  create: (b)   => post("/questions", b),
  update: (id,b)=> put(`/questions/${id}`, b),
  remove: (id)  => del(`/questions/${id}`),
};
