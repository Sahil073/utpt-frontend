import { leaderboard as lbApi } from "../api.js";
import { requireAuth, logout } from "../auth.js";
import { $, toast, avatar, buildTable } from "../utils.js";

const user = await requireAuth();
if (!user) throw new Error("Not authenticated");

$(".nav-user-name") && ($(".nav-user-name").textContent = user.name);
$("#logoutBtn")?.addEventListener("click", logout);

let currentPage = 1;
let currentFilter = { metric: "total", batch: "", specialization: "" };

async function loadLeaderboard() {
  const tableEl = $("#leaderboardBody");
  const spinner = $("#lbSpinner");
  if (spinner) spinner.style.display = "";
  if (tableEl) tableEl.innerHTML = "";

  try {
    const { metric, batch, specialization } = currentFilter;
    const params = { metric, page: currentPage };
    if (batch)          params.batch          = batch;
    if (specialization) params.specialization = specialization;

    const res = await lbApi.filter(params);
    const entries = res.data;

    if (spinner) spinner.style.display = "none";
    renderTable(entries);

    // My rank
    if (user.role === "student") {
      try {
        const rankRes = await lbApi.myRank();
        const r = rankRes.data;
        if ($("#myRankDisplay")) {
          $("#myRankDisplay").textContent = r.rank ? `You are ranked #${r.rank} with ${r.score} pts` : "You are not ranked yet";
        }
      } catch {}
    }
  } catch (err) {
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
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : e.rank;
    return [
      medal,
      `<div style="display:flex;align-items:center;gap:.5rem;">${avatar(e.avatar_url, e.name, 32)}<span>${e.name}</span></div>`,
      e.college_id || "—",
      e.batch || "—",
      e.specialization || "—",
      `<b>${e.metric_score ?? e.total_score ?? 0}</b>`,
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
