import { admin as adminApi, students as studentsApi } from "../api.js";
import { requireAuth, logout } from "../auth.js";
import { $, toast, avatar, buildTable } from "../utils.js";

const user = await requireAuth(["trainer"]);
if (!user) throw new Error("Not authenticated");

// Update nav
const navUserName = document.getElementById('navUserName');
const sidebarAvatar = document.getElementById('sidebarAvatar');
if (navUserName) navUserName.textContent = user.name;
if (sidebarAvatar) sidebarAvatar.textContent = (user.name||'T')[0].toUpperCase();
$(".nav-user-name") && ($(".nav-user-name").textContent = user.name);
$("#logoutBtn")?.addEventListener("click", logout);

// ── Dashboard overview ─────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await adminApi.dashboard();
    const d = res.data;
    if ($("#totalStudents"))  $("#totalStudents").textContent  = d.total_students ?? 0;
    if ($("#activeToday"))    $("#activeToday").textContent    = d.active_today   ?? 0;
    if ($("#avgScore"))       $("#avgScore").textContent       = d.avg_score      ?? 0;
  } catch (err) {
    toast(err.message || "Failed to load dashboard", "error");
  }
}

// ── Students ───────────────────────────────────────────────
let studentPage = 1;

async function loadStudents(filter = {}) {
  try {
    const res = await adminApi.students({ page: studentPage, ...filter });
    renderStudentsTable(res.data);
  } catch (err) { toast(err.message, "error"); }
}

function renderStudentsTable(students) {
  const el = $("#studentsTable");
  if (!el) return;
  const rows = (students||[]).map(s => [
    `<div style="display:flex;align-items:center;gap:.5rem;">${avatar(s.avatar_url, s.name, 28)}<span>${s.name}</span></div>`,
    s.college_id,
    s.batch || "—",
    s.specialization || "—",
    `<span style="color:${s.top_label===1?"#059669":"#6b7280"}">${s.top_label===1?"Portal":"Analytics"}</span>`,
    s.total_score ?? 0,
    `<button class="btn btn-sm" onclick="window._viewStudent('${s.id}')">View</button>`,
  ]);
  el.innerHTML = buildTable(["Name","College ID","Batch","Spec","Access","Score","Actions"], rows, "No students");
}

window._viewStudent = async (id) => {
  try {
    const res = await adminApi.studentDetail(id);
    const { profile: p, stats: s } = res.data;
    let modal = document.getElementById("studentModal");
    if (!modal) { modal = document.createElement("div"); modal.id = "studentModal"; document.body.appendChild(modal); }
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;";
    modal.innerHTML = `
      <div style="background:#fff;border-radius:.75rem;padding:2rem;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;margin-bottom:1rem;">
          <h3 style="margin:0;">${p.name}</h3>
          <button onclick="document.getElementById('studentModal').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;">✕</button>
        </div>
        <p style="margin:0 0 .3rem;font-size:.85rem;"><b>College ID:</b> ${p.college_id} | <b>Batch:</b> ${p.batch||"—"} | <b>Spec:</b> ${p.specialization||"—"}</p>
        <p style="margin:0 0 .3rem;font-size:.85rem;"><b>10th:</b> ${p.tenth_percentage!=null?p.tenth_percentage+"%":"—"} | <b>12th:</b> ${p.twelfth_percentage!=null?p.twelfth_percentage+"%":"—"} | <b>CPI:</b> ${p.cpi!=null?p.cpi:"—"}</p>
        <hr style="margin:.75rem 0;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;text-align:center;font-size:.85rem;">
          ${["Total","Academic","Coding","Dev"].map((l,i)=>`<div style="background:#f1f5f9;padding:.5rem;border-radius:.5rem;">
            <b>${[s?.score?.total_score,s?.score?.academics_score,s?.score?.coding_score,s?.score?.dev_score][i]||0}</b><br><span style="color:var(--muted)">${l}</span></div>`).join("")}
        </div>
        <hr style="margin:.75rem 0;">
        <p style="font-size:.85rem;margin:0;"><b>LeetCode:</b> ${s?.coding?.leetcode_solved||0} | <b>CF:</b> ${s?.coding?.codeforces_rating||0} | <b>Commits:</b> ${s?.github?.total_commits||0}</p>
      </div>`;
  } catch (err) { toast(err.message, "error"); }
};

// Search
$("#searchForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("#searchQuery")?.value?.trim();
  if (!q) return;
  try {
    const res = await adminApi.searchStudent({ q });
    renderStudentsTable(res.data);
  } catch (err) { toast(err.message, "error"); }
});

// Poor performers
async function loadPoorPerformers() {
  try {
    const res = await adminApi.poorPerformers();
    const el = $("#poorPerfTable");
    if (!el) return;
    const rows = (res.data||[]).map(s => [
      s.name, s.college_id, s.batch||"—", s.last_active||"Never"
    ]);
    el.innerHTML = buildTable(["Name","College ID","Batch","Last Active"], rows, "All students are active 🎉");
  } catch (err) { toast(err.message, "error"); }
}

// Tab navigation
function activateTab(id) {
  document.querySelectorAll(".tab-pane").forEach(p => p.style.display = "none");
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const pane = document.getElementById(id);
  if (pane) pane.style.display = "";
  document.querySelector(`[data-tab="${id}"]`)?.classList.add("active");

  if (id === "tabStudents") loadStudents();
  if (id === "tabDashboard") loadDashboard();
  if (id === "tabPoor") loadPoorPerformers();
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

activateTab("tabDashboard");
loadDashboard();
