import { students, leaderboard } from "../api.js";
import { requireAuth, logout } from "../auth.js";
import { $, $$, toast, avatar, scoreBar, formatDate } from "../utils.js";

const user = await requireAuth(["student"]);
if (!user) throw new Error("Not authenticated");

// Force password change modal
if (sessionStorage.getItem("force_pwd_change") === "1") {
  showChangePwdModal();
}

// Update nav
const navUserName = document.getElementById('navUserName');
const sidebarAvatar = document.getElementById('sidebarAvatar');
if (navUserName) navUserName.textContent = user.name;
if (sidebarAvatar) sidebarAvatar.textContent = (user.name||'?')[0].toUpperCase();
$(".nav-user-name") && ($(".nav-user-name").textContent = user.name);
$("#logoutBtn")?.addEventListener("click", logout);

let profileData = null;
let statsData   = null;

async function loadDashboard() {
  try {
    const [profileRes, statsRes, rankRes] = await Promise.all([
      students.me(),
      students.stats(),
      leaderboard.myRank(),
    ]);

    profileData = profileRes.data;
    statsData   = statsRes.data;

    renderProfile(profileData);
    renderStats(statsData);
    renderRank(rankRes.data);

    // Swap skeletons for real content
    const statsGrid = document.getElementById('statsGrid');
    const realStatsGrid = document.getElementById('realStatsGrid');
    if (statsGrid) statsGrid.style.display = 'none';
    if (realStatsGrid) realStatsGrid.style.display = '';

    const profileSkeleton = document.getElementById('profileCardSkeleton');
    const profileCard = document.getElementById('profileCard');
    if (profileSkeleton) profileSkeleton.style.display = 'none';
    if (profileCard) profileCard.style.display = '';

    const scoreSkeleton = document.getElementById('scoreCardSkeleton');
    const scoreCard = document.getElementById('scoreCard');
    if (scoreSkeleton) scoreSkeleton.style.display = 'none';
    if (scoreCard) scoreCard.style.display = '';

  } catch (err) {
    toast(err.message || "Failed to load dashboard", "error");
    // Show real cards even on error so page isn't blank
    const statsGrid = document.getElementById('statsGrid');
    const realStatsGrid = document.getElementById('realStatsGrid');
    if (statsGrid) statsGrid.style.display = 'none';
    if (realStatsGrid) realStatsGrid.style.display = '';
    const profileSkeleton = document.getElementById('profileCardSkeleton');
    const profileCard = document.getElementById('profileCard');
    if (profileSkeleton) profileSkeleton.style.display = 'none';
    if (profileCard) profileCard.style.display = '';
    const scoreSkeleton = document.getElementById('scoreCardSkeleton');
    const scoreCard = document.getElementById('scoreCard');
    if (scoreSkeleton) scoreSkeleton.style.display = 'none';
    if (scoreCard) scoreCard.style.display = '';
  }
}

function renderProfile(p) {
  const el = $("#profileCardContent") || $("#profileCard");
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.125rem;">
      ${avatar(p.avatar_url, p.name, 56)}
      <div>
        <h2 style="margin:0;font-size:1.1rem;font-weight:800;color:var(--text);">${p.name}</h2>
        <p style="margin:.125rem 0 0;color:var(--muted);font-size:.8125rem;">${p.college_id} · <span style="color:var(--primary);font-weight:600;">${p.role}</span></p>
        <p style="margin:.125rem 0 0;color:var(--muted);font-size:.8rem;">${p.batch || ""} ${p.specialization ? "· " + p.specialization : ""}</p>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:.0625rem;">
      <div class="info-row"><span class="label">LeetCode</span><span class="value">${p.leetcode_username || '<em style="color:var(--muted);font-weight:400;font-style:italic;">Not set</em>'}</span></div>
      <div class="info-row"><span class="label">Codeforces</span><span class="value">${p.codeforces_username || '<em style="color:var(--muted);font-weight:400;font-style:italic;">Not set</em>'}</span></div>
      <div class="info-row"><span class="label">GitHub</span><span class="value">${p.github_username || '<em style="color:var(--muted);font-weight:400;font-style:italic;">Not set</em>'}</span></div>
      <div class="info-row"><span class="label">Email</span><span class="value" style="font-size:.8rem;">${p.email}</span></div>
    </div>`;
}

function renderStats(s) {
  const coding = s.coding || {};
  const github = s.github || {};
  const score  = s.score  || {};

  if ($("#lcSolved"))    $("#lcSolved").textContent    = coding.leetcode_solved    ?? 0;
  if ($("#cfRating"))    $("#cfRating").textContent    = coding.codeforces_rating  ?? 0;
  if ($("#ghCommits"))   $("#ghCommits").textContent   = github.total_commits      ?? 0;
  if ($("#totalScore"))  $("#totalScore").textContent  = score.total_score         ?? 0;
  if ($("#codingScore")) $("#codingScore").textContent = score.coding_score        ?? 0;
  if ($("#devScore"))    $("#devScore").textContent    = score.dev_score           ?? 0;
  if ($("#acadScore"))   $("#acadScore").textContent   = score.academics_score     ?? 0;

  const scoreEl = $("#scoreBreakdown");
  if (scoreEl) {
    scoreEl.innerHTML = `
      <div class="score-bar-wrap">
        <div class="score-bar-label"><span>Academics (30%)</span><span>${score.academics_score || 0}</span></div>
        <div class="score-bar-bg"><div class="score-bar-fill" style="width:${Math.min(100,(score.academics_score||0)/3)}%"></div></div>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar-label"><span>Coding (50%)</span><span>${score.coding_score || 0}</span></div>
        <div class="score-bar-bg"><div class="score-bar-fill" style="width:${Math.min(100,(score.coding_score||0)/5)}%"></div></div>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar-label"><span>Development (20%)</span><span>${score.dev_score || 0}</span></div>
        <div class="score-bar-bg"><div class="score-bar-fill" style="width:${Math.min(100,(score.dev_score||0)/2)}%"></div></div>
      </div>`;
  }
}

function renderRank(r) {
  if ($("#myRank")) $("#myRank").textContent = r.rank ? `#${r.rank}` : "Unranked";
  if ($("#myRankScore")) $("#myRankScore").textContent = r.score || 0;
}

// Sync buttons
$("#syncCodingBtn")?.addEventListener("click", async () => {
  try {
    await students.syncCoding();
    toast("Coding sync started. Check back in a moment.", "info");
  } catch (err) { toast(err.message, "error"); }
});

$("#syncGitHubBtn")?.addEventListener("click", async () => {
  try {
    await students.syncGitHub();
    toast("GitHub sync started. Check back in a moment.", "info");
  } catch (err) { toast(err.message, "error"); }
});

// Change password modal
function showChangePwdModal() {
  let modal = document.getElementById("changePwdModal");
  if (modal) { modal.style.display = "flex"; return; }
  modal = document.createElement("div");
  modal.id = "changePwdModal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(15,7,32,.7);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;";
  modal.innerHTML = `
    <div style="background:#fff;border-radius:1.25rem;padding:2rem;width:100%;max-width:420px;box-shadow:0 32px 80px rgba(0,0,0,.3);animation:fadeUpIn .35s ease both;">
      <h3 style="margin:0 0 .375rem;font-size:1.125rem;font-weight:800;">Change Your Password</h3>
      <p style="color:var(--muted);font-size:.8125rem;margin:0 0 1.5rem;line-height:1.6;">For security, please change your default password before continuing.</p>
      <div class="form-group">
        <label>Current Password <span style="font-weight:400;font-size:.75rem;color:var(--muted);">(your father's mobile number)</span></label>
        <input type="password" id="cpCurrent" class="input">
      </div>
      <div class="form-group">
        <label>New Password</label>
        <input type="password" id="cpNew" class="input" placeholder="Minimum 8 characters">
      </div>
      <div class="form-group">
        <label>Confirm New Password</label>
        <input type="password" id="cpConfirm" class="input">
      </div>
      <button id="cpSave" class="btn btn-primary btn-block btn-lg" style="margin-top:.5rem;">Save Password</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

  document.getElementById("cpSave").addEventListener("click", async () => {
    const cur  = document.getElementById("cpCurrent").value;
    const nw   = document.getElementById("cpNew").value;
    const conf = document.getElementById("cpConfirm").value;

    if (!cur || !nw || !conf) { toast("All fields required", "warning"); return; }
    if (nw.length < 8) { toast("Password must be at least 8 characters", "warning"); return; }
    if (nw !== conf) { toast("Passwords do not match", "warning"); return; }

    const btn = document.getElementById("cpSave");
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      const { students: studentsApi } = await import("../api.js");
      await studentsApi.changePassword({ currentPassword: cur, newPassword: nw });
      toast("Password changed successfully!", "success");
      sessionStorage.removeItem("force_pwd_change");
      modal.remove();
    } catch (err) {
      toast(err.message || "Failed to change password", "error");
      btn.disabled = false; btn.textContent = "Save Password";
    }
  });
}

$("#changePwdBtn")?.addEventListener("click", showChangePwdModal);

loadDashboard();
