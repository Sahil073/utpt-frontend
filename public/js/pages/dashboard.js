import { students, leaderboard } from "../api.js";
import { requireAuth, logout } from "../auth.js";
import { $, $$, toast, avatar, scoreBar, formatDate } from "../utils.js";

const user = await requireAuth(["student"]);
if (!user) throw new Error("Not authenticated");

// Force password change modal
if (sessionStorage.getItem("force_pwd_change") === "1") {
  showChangePwdModal();
}

$("#userName")?.textContent && ($("#userName").textContent = user.name);
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
  } catch (err) {
    toast(err.message || "Failed to load dashboard", "error");
  }
}

function renderProfile(p) {
  const el = $("#profileCard");
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
      ${avatar(p.avatar_url, p.name, 64)}
      <div>
        <h2 style="margin:0;font-size:1.25rem;">${p.name}</h2>
        <p style="margin:0;color:var(--muted);font-size:.85rem;">${p.college_id} · ${p.role}</p>
        <p style="margin:0;color:var(--muted);font-size:.85rem;">${p.batch || ""} ${p.specialization ? "· " + p.specialization : ""}</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.85rem;">
      <span><b>LeetCode:</b> ${p.leetcode_username || "Not set"}</span>
      <span><b>Codeforces:</b> ${p.codeforces_username || "Not set"}</span>
      <span><b>GitHub:</b> ${p.github_username || "Not set"}</span>
      <span><b>Email:</b> ${p.email}</span>
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
    const total = score.total_score || 0;
    scoreEl.innerHTML = `
      <div style="margin-bottom:.5rem;">
        <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px;">
          <span>Academics (30%)</span><span>${score.academics_score || 0}</span>
        </div>${scoreBar(score.academics_score || 0, 300)}
      </div>
      <div style="margin-bottom:.5rem;">
        <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px;">
          <span>Coding (50%)</span><span>${score.coding_score || 0}</span>
        </div>${scoreBar(score.coding_score || 0, 500)}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px;">
          <span>Development (20%)</span><span>${score.dev_score || 0}</span>
        </div>${scoreBar(score.dev_score || 0, 200)}
      </div>`;
  }
}

function renderRank(r) {
  if ($("#myRank")) $("#myRank").textContent = r.rank ? `#${r.rank}` : "Unranked";
  if ($("#myRankScore")) $("#myRankScore").textContent = r.score || 0;
}

// Sync buttons
$("#syncCodingBtn")?.addEventListener("click", async (btn) => {
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
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "changePwdModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;display:flex;align-items:center;justify-content:center;";
    modal.innerHTML = `
      <div style="background:#fff;border-radius:.75rem;padding:2rem;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.3);">
        <h3 style="margin:0 0 .5rem;">Change Your Password</h3>
        <p style="color:var(--muted);font-size:.85rem;margin:0 0 1.25rem;">For security, please change your password from the default before continuing.</p>
        <label>Current Password (your father's mobile number)</label>
        <input type="password" id="cpCurrent" class="input" style="margin-bottom:.75rem;">
        <label>New Password</label>
        <input type="password" id="cpNew" class="input" placeholder="Minimum 8 characters" style="margin-bottom:.75rem;">
        <label>Confirm New Password</label>
        <input type="password" id="cpConfirm" class="input" style="margin-bottom:1.25rem;">
        <button id="cpSave" class="btn btn-primary" style="width:100%;">Save Password</button>
      </div>`;
    document.body.appendChild(modal);

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
}

$("#changePwdBtn")?.addEventListener("click", showChangePwdModal);

loadDashboard();
