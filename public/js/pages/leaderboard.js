import { leaderboard as lbApi } from "../api.js";
import { requireAuth, logout } from "../auth.js";
import { $, toast, avatar, buildTable } from "../utils.js";

const user = await requireAuth();
if (!user) throw new Error("Not authenticated");

// Update nav
const navUserName = document.getElementById('navUserName');
const sidebarAvatar = document.getElementById('sidebarAvatar');
if (navUserName) navUserName.textContent = user.name;
if (sidebarAvatar) sidebarAvatar.textContent = (user.name||'?')[0].toUpperCase();
$(".nav-user-name") && ($(".nav-user-name").textContent = user.name);
$("#logoutBtn")?.addEventListener("click", logout);

let currentPage = 1;
let currentFilter = { metric: "total", batch: "", specialization: "" };

async function loadLeaderboard() {
  const tableEl = $("#leaderboardTable");
  const spinner = $("#lbSpinner");
  const skeleton = document.getElementById('lbSkeletonCard');
  const realCard = document.getElementById('lbCard');

  if (skeleton) skeleton.style.display = '';
  if (realCard) realCard.style.display = 'none';
  if (spinner) spinner.style.display = "";
  if (tableEl) tableEl.innerHTML = "";

  try {
    const { metric, batch, specialization } = currentFilter;
    const params = { metric, page: currentPage };
    if (batch)          params.batch          = batch;
    if (specialization) params.specialization = specialization;

    const res = await lbApi.filter(params);
    const entries = res.data;

    if (skeleton) skeleton.style.display = 'none';
    if (realCard) realCard.style.display = '';
    if (spinner) spinner.style.display = "none";
    renderTable(entries);

    // My rank
    if (user.role === "student") {
      try {
        const rankRes = await lbApi.myRank();
        const r = rankRes.data;
        const rankDisplay = $("#myRankDisplay");
        if (rankDisplay) {
          rankDisplay.textContent = r.rank
            ? `You are ranked #${r.rank} with ${r.score} pts`
            : "You are not ranked yet";
        }
      } catch {}
    }
  } catch (err) {
    if (skeleton) skeleton.style.display = 'none';
    if (realCard) realCard.style.display = '';
    if (spinner) spinner.style.display = "none";
    toast(err.message || "Failed to load leaderboard", "error");
  }
}

function renderTable(entries) {
  const el = $("#leaderboardTable");
  if (!el) return;

  const metricLabel = { total: "Total", coding: "Coding", academic: "Academic", dev: "Dev" };
  const col = metricLabel[currentFilter.metric] || "Total";

  const rows = entries.map((e, i) => {
    const rankNum = e.rank || (currentPage - 1) * 20 + i + 1;
    let rankCell;
    if (i === 0 && currentPage === 1) {
      rankCell = `<span class="rank-badge rank-1">1</span>`;
    } else if (i === 1 && currentPage === 1) {
      rankCell = `<span class="rank-badge rank-2">2</span>`;
    } else if (i === 2 && currentPage === 1) {
      rankCell = `<span class="rank-badge rank-3">3</span>`;
    } else {
      rankCell = `<span class="rank-badge rank-other">${rankNum}</span>`;
    }
    return [
      rankCell,
      `<div style="display:flex;align-items:center;gap:.625rem;">${avatar(e.avatar_url, e.name, 30)}<span style="font-weight:600;">${e.name}</span></div>`,
      `<span style="font-size:.8rem;color:var(--muted);">${e.college_id || "—"}</span>`,
      e.batch ? `<span class="badge badge-muted">${e.batch}</span>` : "—",
      e.specialization ? `<span class="badge badge-purple">${e.specialization}</span>` : "—",
      `<span style="font-weight:800;color:var(--primary);font-size:1rem;">${e.metric_score ?? e.total_score ?? 0}</span>`,
      e.leetcode_solved ?? "—",
      e.codeforces_rating ?? "—",
      e.total_commits ?? "—",
    ];
  });

  el.innerHTML = buildTable(
    ["#", "Student", "College ID", "Batch", "Spec", `${col} Score`, "LC Solved", "CF Rating", "Commits"],
    rows,
    "No students found"
  );
}

// Filter controls
$("#filterForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  currentFilter = {
    metric:         $("#metricSelect")?.value || "total",
    batch:          $("#batchFilter")?.value?.trim() || "",
    specialization: $("#specFilter")?.value?.trim() || "",
  };
  currentPage = 1;
  loadLeaderboard();
});

$("#prevPage")?.addEventListener("click", () => { if (currentPage > 1) { currentPage--; loadLeaderboard(); } });
$("#nextPage")?.addEventListener("click", () => { currentPage++; loadLeaderboard(); });

loadLeaderboard();
