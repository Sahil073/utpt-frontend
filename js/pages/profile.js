import { students as studentsApi } from '../api.js';
import { requireAuth, logout, getUser } from '../auth.js';
import { toast, avatarColor, getInitials, fmtDate, setLoading, initMobileSidebar } from '../utils.js';

if (!requireAuth()) throw new Error('unauthenticated');

const user = getUser();
let profile = null;

// ─── Sidebar ──────────────────────────────────────────────────
function fillSidebar(p) {
  const name = p?.name || user?.name || 'User';
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-role').textContent = p?.role || user?.role || 'student';
  const av = document.getElementById('sidebar-avatar');
  if (p?.avatar_url) {
    av.innerHTML = `<img src="${p.avatar_url}" alt="${name}">`;
  } else {
    av.textContent = getInitials(name);
    av.style.background = avatarColor(name);
    av.style.color = '#fff';
  }
}

// ─── Profile Hero ─────────────────────────────────────────────
function renderProfileHero(p) {
  const hero = document.getElementById('profile-hero');
  const name = p?.name || '—';
  const col  = avatarColor(name);
  hero.innerHTML = `
    <div>
      <label for="avatar-input" style="cursor:pointer">
        <div class="avatar avatar-xl" style="background:${col};color:#fff;position:relative">
          ${p?.avatar_url ? `<img src="${p.avatar_url}" alt="${name}">` : getInitials(name)}
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;opacity:0;transition:.18s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
            <span style="font-size:.65rem;font-weight:700;color:#fff">CHANGE</span>
          </div>
        </div>
      </label>
    </div>
    <div style="flex:1">
      <div style="font-size:1.4rem;font-weight:800;letter-spacing:-.02em">${name}</div>
      <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:10px">${p?.college_id || ''} · ${p?.batch || ''} · ${p?.specialization || ''}</div>
      <div class="flex gap-2 flex-wrap">
        ${p?.github_username ? `<a href="https://github.com/${p.github_username}" target="_blank" class="platform-link">🐙 GitHub</a>` : ''}
        ${p?.leetcode_username ? `<a href="https://leetcode.com/${p.leetcode_username}" target="_blank" class="platform-link">🟡 LeetCode</a>` : ''}
        ${p?.codeforces_username ? `<a href="https://codeforces.com/profile/${p.codeforces_username}" target="_blank" class="platform-link">🔵 Codeforces</a>` : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Member since</div>
      <div style="font-size:.85rem;font-weight:600">${p?.created_at ? fmtDate(p.created_at) : '—'}</div>
      <div class="badge badge-${p?.is_active ? 'green' : 'red'} mt-4" style="margin-top:8px">${p?.is_active ? 'Active' : 'Inactive'}</div>
    </div>`;
}

// ─── Fill form ────────────────────────────────────────────────
function fillForm(p) {
  document.getElementById('f-github').value    = p?.github_username    || '';
  document.getElementById('f-leetcode').value  = p?.leetcode_username  || '';
  document.getElementById('f-codeforces').value= p?.codeforces_username|| '';
  document.getElementById('f-batch').value     = p?.batch              || '';
  document.getElementById('f-spec').value      = p?.specialization     || '';
}

// ─── Platform links ───────────────────────────────────────────
function renderPlatformLinks(p) {
  const el = document.getElementById('platform-links');
  const platforms = [
    { key: 'github_username',     label: 'GitHub',     url: v => `https://github.com/${v}`,                  icon: '🐙' },
    { key: 'leetcode_username',   label: 'LeetCode',   url: v => `https://leetcode.com/${v}`,                icon: '🟡' },
    { key: 'codeforces_username', label: 'Codeforces', url: v => `https://codeforces.com/profile/${v}`,      icon: '🔵' },
  ];
  el.innerHTML = platforms.map(pl => {
    const val = p?.[pl.key];
    return `
      <div class="platform-row">
        <div class="platform-icon" style="background:var(--bg-3)">${pl.icon}</div>
        <div style="flex:1">
          <div style="font-size:.82rem;font-weight:600">${pl.label}</div>
          <div style="font-size:.75rem;color:var(--text-muted)">${val || 'Not linked'}</div>
        </div>
        ${val ? `<a href="${pl.url(val)}" target="_blank" class="btn btn-ghost btn-sm">View →</a>` : ''}
      </div>`;
  }).join('');
}

// ─── Save profile ─────────────────────────────────────────────
document.getElementById('save-profile-btn').addEventListener('click', async () => {
  const btn = document.getElementById('save-profile-btn');
  setLoading(btn, true);
  try {
    const body = {
      github_username:    document.getElementById('f-github').value.trim() || undefined,
      leetcode_username:  document.getElementById('f-leetcode').value.trim() || undefined,
      codeforces_username:document.getElementById('f-codeforces').value.trim() || undefined,
      batch:              document.getElementById('f-batch').value.trim() || undefined,
      specialization:     document.getElementById('f-spec').value.trim() || undefined,
    };
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
    const updated = await studentsApi.updateMe(body);
    profile = { ...profile, ...updated };
    renderProfileHero(profile);
    renderPlatformLinks(profile);
    toast('Profile updated!', 'success');
  } catch (ex) {
    toast(ex.message || 'Failed to save', 'error');
  } finally {
    setLoading(btn, false, 'Save changes');
  }
});

// ─── Sync buttons ─────────────────────────────────────────────
document.getElementById('sync-github-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  setLoading(btn, true);
  try {
    await studentsApi.syncGithub();
    toast('GitHub sync queued! (1h cooldown)', 'success');
  } catch (ex) { toast(ex.message || 'Sync failed', 'error'); }
  finally { setLoading(btn, false, 'Sync'); }
});

document.getElementById('sync-coding-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  setLoading(btn, true);
  try {
    await studentsApi.syncCoding();
    toast('Coding stats sync queued! (5min cooldown)', 'success');
  } catch (ex) { toast(ex.message || 'Sync failed', 'error'); }
  finally { setLoading(btn, false, 'Sync'); }
});

// ─── Avatar upload ────────────────────────────────────────────
document.getElementById('avatar-input').addEventListener('change', async function() {
  const file = this.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Image too large (max 5MB)', 'error'); return; }
  const form = new FormData();
  form.append('avatar', file);
  try {
    toast('Uploading…', 'info', 2000);
    const data = await studentsApi.uploadAvatar(form);
    profile = { ...profile, avatar_url: data?.avatar_url };
    renderProfileHero(profile);
    fillSidebar(profile);
    toast('Avatar updated!', 'success');
  } catch (ex) { toast(ex.message || 'Upload failed', 'error'); }
});

// ─── Logout / Mobile ──────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => logout());
initMobileSidebar();

// ─── Init ─────────────────────────────────────────────────────
async function init() {
  fillSidebar(user);
  try {
    profile = await studentsApi.me();
    renderProfileHero(profile);
    fillForm(profile);
    renderPlatformLinks(profile);
    fillSidebar(profile);
  } catch (ex) {
    toast(ex.message || 'Failed to load profile', 'error');
  }
}

init();
