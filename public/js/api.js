const BASE = "/api/v1";


let _accessToken = null;

export function setAccessToken(t) { _accessToken = t; }
export function getAccessToken()  { return _accessToken; }

async function request(method, path, body, isForm = false) {
  const headers = {};
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;
  if (!isForm) headers["Content-Type"] = "application/json";

  const opts = { method, headers, credentials: "include" };
  if (body) opts.body = isForm ? body : JSON.stringify(body);

  let res = await fetch(BASE + path, opts);

  if (res.status === 401 && _accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${_accessToken}`;
      opts.headers = headers;
      res = await fetch(BASE + path, opts);
    }
  }

  const data = await res.json();
  if (!data.success) throw Object.assign(new Error(data.message || "Request failed"), { status: res.status, data });
  return data;
}

async function tryRefresh() {
  try {
    const r = await fetch(BASE + "/auth/refresh", { method: "POST", credentials: "include" });
    const d = await r.json();
    if (d.success && d.data?.accessToken) {
      _accessToken = d.data.accessToken;
      sessionStorage.setItem("accessToken", _accessToken);
      return true;
    }
  } catch {}
  return false;
}

export const get  = (p)        => request("GET",    p);
export const post = (p, b)     => request("POST",   p, b);
export const put  = (p, b)     => request("PUT",    p, b);
export const del  = (p)        => request("DELETE", p);
export const postForm = (p, b) => request("POST",   p, b, true);

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
