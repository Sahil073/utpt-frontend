import { students } from "../api.js";
import { requireAuth, logout } from "../auth.js";
import { $, toast, avatar, setLoading, formatDate } from "../utils.js";

const user = await requireAuth(["student"]);
if (!user) throw new Error("Not authenticated");

$(".nav-user-name") && ($(".nav-user-name").textContent = user.name);
$("#logoutBtn")?.addEventListener("click", logout);

async function loadProfile() {
  try {
    const [profileRes, statsRes] = await Promise.all([students.me(), students.stats()]);
    const p = profileRes.data;
    const s = statsRes.data;

    // Avatar
    const avatarEl = $("#avatarDisplay");
    if (avatarEl) avatarEl.innerHTML = avatar(p.avatar_url, p.name, 80);

    // Basic info fields
    const fields = ["name","email","college_id","batch","specialization","roll_number","gender"];
    fields.forEach(f => {
      const el = document.getElementById(`field_${f}`);
      if (el) el.textContent = p[f] || "—";
    });

    // Academic info
    if ($("#field_tenth"))   $("#field_tenth").textContent   = p.tenth_percentage   != null ? p.tenth_percentage + "%" : "—";
    if ($("#field_twelfth")) $("#field_twelfth").textContent = p.twelfth_percentage != null ? p.twelfth_percentage + "%" : "—";
    if ($("#field_cpi"))     $("#field_cpi").textContent     = p.cpi                != null ? p.cpi : "—";

    // Platform usernames
    if ($("#lcUser"))  $("#lcUser").textContent  = p.leetcode_username   || "Not set";
    if ($("#cfUser"))  $("#cfUser").textContent  = p.codeforces_username || "Not set";
    if ($("#ghUser"))  $("#ghUser").textContent  = p.github_username     || "Not set";

    // Stats
    if (s.coding) {
      if ($("#lcSolved")) $("#lcSolved").textContent  = s.coding.leetcode_solved   || 0;
      if ($("#cfRating")) $("#cfRating").textContent  = s.coding.codeforces_rating || 0;
    }
    if (s.github) {
      if ($("#ghCommits")) $("#ghCommits").textContent = s.github.total_commits || 0;
    }
    if (s.score) {
      if ($("#totalScore"))  $("#totalScore").textContent  = s.score.total_score     || 0;
      if ($("#codingScore")) $("#codingScore").textContent = s.score.coding_score    || 0;
      if ($("#devScore"))    $("#devScore").textContent    = s.score.dev_score       || 0;
      if ($("#acadScore"))   $("#acadScore").textContent   = s.score.academics_score || 0;
    }

    // Pre-fill edit form
    if ($("#editLc"))  $("#editLc").value  = p.leetcode_username   || "";
    if ($("#editCf"))  $("#editCf").value  = p.codeforces_username || "";
    if ($("#editGh"))  $("#editGh").value  = p.github_username     || "";
  } catch (err) {
    toast(err.message || "Failed to load profile", "error");
  }
}

// Edit profile form
$("#editProfileForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#saveProfileBtn");
  setLoading(btn, true);
  try {
    const updates = {};
    const lc = $("#editLc")?.value?.trim();
    const cf = $("#editCf")?.value?.trim();
    const gh = $("#editGh")?.value?.trim();
    if (lc) updates.leetcode_username   = lc;
    if (cf) updates.codeforces_username = cf;
    if (gh) updates.github_username     = gh;

    await students.update(updates);
    toast("Profile updated!", "success");
    loadProfile();
  } catch (err) {
    toast(err.message || "Update failed", "error");
  } finally {
    setLoading(btn, false);
  }
});

// Change password form
$("#changePwdForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const cur  = $("#currentPwd")?.value;
  const nw   = $("#newPwd")?.value;
  const conf = $("#confirmPwd")?.value;

  if (nw !== conf) { toast("Passwords do not match", "warning"); return; }
  if ((nw||"").length < 8) { toast("Password must be at least 8 characters", "warning"); return; }

  const btn = $("#savePwdBtn");
  setLoading(btn, true);
  try {
    await students.changePassword({ currentPassword: cur, newPassword: nw });
    toast("Password changed successfully!", "success");
    e.target.reset();
  } catch (err) {
    toast(err.message || "Failed to change password", "error");
  } finally {
    setLoading(btn, false);
  }
});

// Avatar upload
$("#avatarInput")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const res = await students.uploadAvatar(file);
    toast("Avatar updated!", "success");
    const avatarEl = $("#avatarDisplay");
    if (avatarEl) avatarEl.innerHTML = `<img src="${res.data.avatar_url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">`;
  } catch (err) {
    toast(err.message || "Upload failed", "error");
  }
});

loadProfile();
