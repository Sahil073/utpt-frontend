import { admin as adminApi } from "../api.js";
import { requireAuth, logout } from "../auth.js";
import { $, toast, avatar, setLoading, buildTable, formatDate } from "../utils.js";

const user = await requireAuth(["admin"]);
if (!user) throw new Error("Not authenticated");

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

function renderStudentsTable(students) {
  const el = $("#studentsTable");
  if (!el) return;
  const rows = (students||[]).map(s => [
    `<div style="display:flex;align-items:center;gap:.5rem;">${avatar(s.avatar_url, s.name, 28)}<span>${s.name}</span></div>`,
    s.college_id,
    s.batch || "—",
    s.specialization || "—",
    s.gender || "—",
    s.cpi != null ? s.cpi : "—",
    `<span style="color:${s.top_label===1?"#059669":"#6b7280"};font-weight:600;">${s.top_label===1?"Portal":"Analytics"}</span>`,
    s.total_score ?? 0,
    `<span style="color:${s.is_active?"#059669":"#ef4444"};font-weight:600;">${s.is_active?"Active":"Inactive"}</span>`,
    `<button class="btn btn-sm" onclick="window._viewStudent('${s.id}')">View</button>
     <button class="btn btn-sm btn-outline" onclick="window._toggleStudent('${s.id}','${s.is_active}')">
       ${s.is_active?"Disable":"Enable"}</button>`,
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
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;display:flex;align-items:center;justify-content:center;overflow:auto;padding:1rem;";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#fff;border-radius:.75rem;padding:2rem;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3 style="margin:0;">${p.name}</h3>
        <button onclick="document.getElementById('studentModal').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.85rem;">
        <div><b>College ID:</b> ${p.college_id}</div>
        <div><b>Batch:</b> ${p.batch||"—"}</div>
        <div><b>Spec:</b> ${p.specialization||"—"}</div>
        <div><b>Gender:</b> ${p.gender||"—"}</div>
        <div><b>10th:</b> ${p.tenth_percentage!=null?p.tenth_percentage+"%":"—"}</div>
        <div><b>12th:</b> ${p.twelfth_percentage!=null?p.twelfth_percentage+"%":"—"}</div>
        <div><b>CPI:</b> ${p.cpi!=null?p.cpi:"—"}</div>
        <div><b>Top Label:</b> ${p.top_label===1?"Portal":"Analytics"}</div>
      </div>
      <hr style="margin:1rem 0;">
      <h4 style="margin:0 0 .5rem;">Scores</h4>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;font-size:.85rem;text-align:center;">
        <div style="background:#f1f5f9;padding:.75rem;border-radius:.5rem;"><div style="font-size:1.2rem;font-weight:700;">${s?.score?.total_score||0}</div><div style="color:var(--muted);">Total</div></div>
        <div style="background:#f1f5f9;padding:.75rem;border-radius:.5rem;"><div style="font-size:1.2rem;font-weight:700;">${s?.score?.academics_score||0}</div><div style="color:var(--muted);">Academic</div></div>
        <div style="background:#f1f5f9;padding:.75rem;border-radius:.5rem;"><div style="font-size:1.2rem;font-weight:700;">${s?.score?.coding_score||0}</div><div style="color:var(--muted);">Coding</div></div>
        <div style="background:#f1f5f9;padding:.75rem;border-radius:.5rem;"><div style="font-size:1.2rem;font-weight:700;">${s?.score?.dev_score||0}</div><div style="color:var(--muted);">Dev</div></div>
      </div>
      <hr style="margin:1rem 0;">
      <h4 style="margin:0 0 .5rem;">Coding</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.85rem;">
        <div><b>LeetCode:</b> ${s?.coding?.leetcode_solved||0} solved (${p.leetcode_username||"—"})</div>
        <div><b>Codeforces:</b> ${s?.coding?.codeforces_rating||0} (${p.codeforces_username||"—"})</div>
        <div><b>GitHub Commits:</b> ${s?.github?.total_commits||0} (${p.github_username||"—"})</div>
        <div><b>Rank:</b> ${s?.score?.rank||"—"}</div>
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
loadDashboard();
