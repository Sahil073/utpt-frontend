import { admin as adminApi } from "../api.js";
import { requireAuth, logout } from "../auth.js";
import { $, toast, avatar, setLoading, buildTable, formatDate } from "../utils.js";

const user = await requireAuth(["admin"]);
if (!user) throw new Error("Not authenticated");

// Update nav
const navUserName = document.getElementById('navUserName');
const sidebarAvatar = document.getElementById('sidebarAvatar');
if (navUserName) navUserName.textContent = user.name;
if (sidebarAvatar) sidebarAvatar.textContent = (user.name||'A')[0].toUpperCase();
$(".nav-user-name") && ($(".nav-user-name").textContent = user.name);
$("#logoutBtn")?.addEventListener("click", logout);

// ── Dashboard ──────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await adminApi.dashboard();
    const d = res.data;
    if ($("#totalStudents"))  $("#totalStudents").textContent  = d.total_students ?? 0;
    if ($("#activeToday"))    $("#activeToday").textContent    = d.active_today   ?? 0;
    if ($("#avgScore"))       $("#avgScore").textContent       = d.avg_score      ?? 0;
    if ($("#analyticsOnly"))  $("#analyticsOnly").textContent  = d.analytics_only ?? 0;
    if ($("#topScorerName"))  $("#topScorerName").textContent  = d.top_scorer?.name || "—";
    if ($("#topScorerScore")) $("#topScorerScore").textContent = d.top_scorer?.total_score ?? "—";
  } catch (err) {
    toast(err.message || "Failed to load dashboard", "error");
  }
}

// ── Students List ──────────────────────────────────────────
let studentPage = 1;
let studentFilter = {};

async function loadStudents() {
  const spinner = $("#studentsSpinner");
  if (spinner) spinner.style.display = "";
  try {
    const params = { page: studentPage, ...studentFilter };
    const res = await adminApi.students(params);
    if (spinner) spinner.style.display = "none";
    renderStudentsTable(res.data);
  } catch (err) {
    if (spinner) spinner.style.display = "none";
    toast(err.message, "error");
  }
}

function renderStudentsTable(studentsArr) {
  const el = $("#studentsTable");
  if (!el) return;
  const rows = (studentsArr||[]).map(s => [
    `<div style="display:flex;align-items:center;gap:.625rem;">${avatar(s.avatar_url, s.name, 28)}<span style="font-weight:600;">${s.name}</span></div>`,
    `<span style="font-size:.8rem;color:var(--muted);">${s.college_id}</span>`,
    s.batch ? `<span class="badge badge-muted">${s.batch}</span>` : "—",
    s.specialization ? `<span class="badge badge-purple">${s.specialization}</span>` : "—",
    s.gender || "—",
    s.cpi != null ? s.cpi : "—",
    s.top_label===1 ? `<span class="badge badge-success">Portal</span>` : `<span class="badge badge-muted">Analytics</span>`,
    `<span style="font-weight:700;color:var(--primary);">${s.total_score ?? 0}</span>`,
    s.is_active
      ? `<span class="badge badge-success">Active</span>`
      : `<span class="badge badge-danger">Inactive</span>`,
    `<div style="display:flex;gap:.375rem;">
      <button class="btn btn-sm btn-outline" onclick="window._viewStudent('${s.id}')">View</button>
      <button class="btn btn-sm btn-ghost" onclick="window._toggleStudent('${s.id}','${s.is_active}')">
        ${s.is_active?"Disable":"Enable"}
      </button>
    </div>`,
  ]);
  el.innerHTML = buildTable(["Name","College ID","Batch","Spec","Gender","CPI","Access","Score","Status","Actions"], rows, "No students found");
}

window._viewStudent = async (id) => {
  try {
    const res = await adminApi.studentDetail(id);
    showStudentModal(res.data);
  } catch (err) { toast(err.message, "error"); }
};

window._toggleStudent = async (id, isActive) => {
  try {
    await adminApi.toggleActive(id);
    toast(`Student ${isActive === "true" ? "disabled" : "enabled"}`, "success");
    loadStudents();
  } catch (err) { toast(err.message, "error"); }
};

function showStudentModal(data) {
  const p = data.profile;
  const s = data.stats;
  let modal = document.getElementById("studentModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "studentModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(15,7,32,.7);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;overflow:auto;padding:1rem;";
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
  }
  modal.innerHTML = `
    <div style="background:#fff;border-radius:1.25rem;padding:2rem;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.3);animation:fadeUpIn .3s ease both;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
        <h3 style="margin:0;font-weight:800;">${p.name}</h3>
        <button onclick="document.getElementById('studentModal').style.display='none'" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div class="grid-2" style="gap:.5rem;font-size:.8375rem;margin-bottom:1.25rem;">
        <div class="info-row"><span class="label">College ID</span><span class="value">${p.college_id}</span></div>
        <div class="info-row"><span class="label">Batch</span><span class="value">${p.batch||"—"}</span></div>
        <div class="info-row"><span class="label">Spec</span><span class="value">${p.specialization||"—"}</span></div>
        <div class="info-row"><span class="label">Gender</span><span class="value">${p.gender||"—"}</span></div>
        <div class="info-row"><span class="label">10th</span><span class="value">${p.tenth_percentage!=null?p.tenth_percentage+"%":"—"}</span></div>
        <div class="info-row"><span class="label">12th</span><span class="value">${p.twelfth_percentage!=null?p.twelfth_percentage+"%":"—"}</span></div>
        <div class="info-row"><span class="label">CPI</span><span class="value">${p.cpi!=null?p.cpi:"—"}</span></div>
        <div class="info-row"><span class="label">Access</span><span class="value">${p.top_label===1?"Portal":"Analytics"}</span></div>
      </div>
      <div class="card-title" style="margin-bottom:.75rem;"><span class="card-title-accent"></span>UTPT Scores</div>
      <div class="grid-4" style="gap:.625rem;margin-bottom:1.25rem;">
        <div style="background:var(--primary-50);border-radius:.75rem;padding:.75rem;text-align:center;border:1px solid var(--primary-100);">
          <div style="font-size:1.2rem;font-weight:800;color:var(--primary);">${s?.score?.total_score||0}</div>
          <div style="font-size:.7rem;color:var(--muted);">Total</div>
        </div>
        <div style="background:#f5f3ff;border-radius:.75rem;padding:.75rem;text-align:center;border:1px solid #ede9fe;">
          <div style="font-size:1.2rem;font-weight:800;color:#7c3aed;">${s?.score?.academics_score||0}</div>
          <div style="font-size:.7rem;color:var(--muted);">Academic</div>
        </div>
        <div style="background:#eff6ff;border-radius:.75rem;padding:.75rem;text-align:center;border:1px solid #dbeafe;">
          <div style="font-size:1.2rem;font-weight:800;color:#2563eb;">${s?.score?.coding_score||0}</div>
          <div style="font-size:.7rem;color:var(--muted);">Coding</div>
        </div>
        <div style="background:#ecfdf5;border-radius:.75rem;padding:.75rem;text-align:center;border:1px solid #d1fae5;">
          <div style="font-size:1.2rem;font-weight:800;color:#059669;">${s?.score?.dev_score||0}</div>
          <div style="font-size:.7rem;color:var(--muted);">Dev</div>
        </div>
      </div>
      <div class="card-title" style="margin-bottom:.75rem;"><span class="card-title-accent"></span>Coding</div>
      <div class="grid-2" style="gap:.5rem;font-size:.8375rem;">
        <div class="info-row"><span class="label">LeetCode</span><span class="value">${s?.coding?.leetcode_solved||0} solved (${p.leetcode_username||"—"})</span></div>
        <div class="info-row"><span class="label">Codeforces</span><span class="value">${s?.coding?.codeforces_rating||0} (${p.codeforces_username||"—"})</span></div>
        <div class="info-row"><span class="label">GH Commits</span><span class="value">${s?.github?.total_commits||0} (${p.github_username||"—"})</span></div>
        <div class="info-row"><span class="label">Rank</span><span class="value">${s?.score?.rank||"—"}</span></div>
      </div>
    </div>`;
  modal.style.display = "flex";
}

// ── Student search ─────────────────────────────────────────
$("#searchStudentForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("#searchQuery")?.value?.trim();
  if (!q) return;
  try {
    const res = await adminApi.searchStudent({ q });
    renderStudentsTable(res.data);
  } catch (err) { toast(err.message, "error"); }
});

$("#studentFilterForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  studentFilter = {};
  const batch  = $("#filterBatch")?.value?.trim();
  const spec   = $("#filterSpec")?.value?.trim();
  const label  = $("#filterLabel")?.value;
  if (batch)  studentFilter.batch = batch;
  if (spec)   studentFilter.specialization = spec;
  if (label !== undefined && label !== "") studentFilter.top_label = label;
  studentPage = 1;
  loadStudents();
});

// ── Import ─────────────────────────────────────────────────
$("#importFileForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("#importFile")?.files[0];
  if (!file) { toast("Please select a file", "warning"); return; }
  const btn = $("#importFileBtn");
  setLoading(btn, true);
  try {
    const res = await adminApi.importFile(file);
    toast(`${res.data.total} students imported (${res.data.portal_accounts} portal accounts)`, "success");
    loadStudents();
    loadDashboard();
  } catch (err) {
    toast(err.message || "Import failed", "error");
  } finally {
    setLoading(btn, false);
  }
});

// ── Create Trainer ─────────────────────────────────────────
$("#createTrainerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    name:       $("#trainerName")?.value?.trim(),
    email:      $("#trainerEmail")?.value?.trim(),
    college_id: $("#trainerCollegeId")?.value?.trim(),
    password:   $("#trainerPassword")?.value,
  };
  const btn = $("#createTrainerBtn");
  setLoading(btn, true);
  try {
    const res = await adminApi.createTrainer(body);
    toast(`Trainer "${res.data.name}" created!`, "success");
    e.target.reset();
  } catch (err) {
    toast(err.message || "Failed to create trainer", "error");
  } finally {
    setLoading(btn, false);
  }
});

// ── Notification ───────────────────────────────────────────
$("#notifyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    title:  $("#notifTitle")?.value?.trim(),
    body:   $("#notifBody")?.value?.trim(),
    target: $("#notifTarget")?.value,
    batch:  $("#notifBatch")?.value?.trim() || undefined,
    type:   "announcement",
  };
  const btn = $("#sendNotifBtn");
  setLoading(btn, true);
  try {
    await adminApi.notify(body);
    toast("Notification sent!", "success");
    e.target.reset();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    setLoading(btn, false);
  }
});

// ── Tab navigation ─────────────────────────────────────────
function activateTab(id) {
  document.querySelectorAll(".tab-pane").forEach(p => p.style.display = "none");
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const pane = document.getElementById(id);
  if (pane) pane.style.display = "";
  document.querySelector(`[data-tab="${id}"]`)?.classList.add("active");

  if (id === "tabStudents") loadStudents();
  if (id === "tabDashboard") loadDashboard();
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

// Default tab
activateTab("tabDashboard");
