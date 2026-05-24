import { students, leaderboard, notifications } from '../api.js';
import { requireAuth, logout, getUser } from '../auth.js';
import { toast, fmtScore, fmtNum, avatarHTML, getInitials, avatarColor, renderBarChart, renderHeatmap, rankDisplay, fmtRelative, initMobileSidebar, setLoading, initTheme } from '../utils.js';

if (!requireAuth()) throw new Error('unauthenticated');
const user = getUser();

function fillSidebar(profile) {
  const name = profile?.name || user?.name || 'User';
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-role').textContent = profile?.role || user?.role || 'student';
  const av = document.getElementById('sidebar-avatar');
  if (profile?.avatar_url) { av.innerHTML = `<img src="${profile.avatar_url}" alt="${name}">`; }
  else { av.textContent = getInitials(name); av.style.background = avatarColor(name); av.style.color = '#fff'; }
}

function setGreeting(name) {
  const h = new Date().getHours();
  const g = h<12 ? 'Good morning' : h<17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${g}, ${name?.split(' ')[0]||'there'} 👋`;
}

function renderStats(stats) {
  const coding = stats?.coding || {};
  const github = stats?.github || {};
  const score  = stats?.score  || {};

  const iconStar = `<svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  const iconCode = `<svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
  const iconChart= `<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
  const iconGH   = `<svg viewBox="0 0 24 24" fill="none" stroke="#52525b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card" style="--stat-icon-bg:#fffbeb">
      <div class="stat-icon">${iconStar}</div>
      <div class="stat-label">Total Score</div>
      <div class="stat-value t-blue">${fmtScore(score.total_score)}</div>
      <div class="stat-change">Placement ranking score</div>
    </div>
    <div class="stat-card green" style="--stat-icon-bg:#dcfce7">
      <div class="stat-icon">${iconCode}</div>
      <div class="stat-label">LeetCode Solved</div>
      <div class="stat-value">${fmtNum(coding.leetcode_solved) ?? '—'}</div>
      <div class="stat-change">Rating: ${coding.leetcode_rating || '—'}</div>
    </div>
    <div class="stat-card orange" style="--stat-icon-bg:#eff6ff">
      <div class="stat-icon">${iconChart}</div>
      <div class="stat-label">Codeforces Rating</div>
      <div class="stat-value">${fmtNum(coding.codeforces_rating) ?? '—'}</div>
      <div class="stat-change">Max: ${coding.codeforces_max_rating || '—'}</div>
    </div>
    <div class="stat-card purple" style="--stat-icon-bg:#f4f4f5">
      <div class="stat-icon">${iconGH}</div>
      <div class="stat-label">GitHub Commits</div>
      <div class="stat-value">${fmtNum(github.total_commits) ?? '—'}</div>
      <div class="stat-change">${github.public_repos||0} public repos</div>
    </div>`;
}

const PODIUM_SVG = `
<svg viewBox="0 0 220 180" xmlns="http://www.w3.org/2000/svg" style="width:160px;height:130px;display:block;margin:0 auto 10px">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4ade80" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#16a34a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="p1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
    <linearGradient id="p2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="100%" stop-color="#16a34a"/>
    </linearGradient>
    <linearGradient id="p3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#86efac"/>
      <stop offset="100%" stop-color="#22c55e"/>
    </linearGradient>
  </defs>
  <!-- glow halo -->
  <ellipse cx="110" cy="90" rx="72" ry="72" fill="url(#glow)"/>
  <!-- podium step 2 (left) -->
  <rect x="30" y="110" width="52" height="50" rx="5" fill="url(#p3)" opacity="0.85"/>
  <text x="56" y="102" text-anchor="middle" font-size="13" font-weight="700" fill="#15803d">2</text>
  <!-- podium step 3 (right) -->
  <rect x="138" y="122" width="52" height="38" rx="5" fill="url(#p3)" opacity="0.7"/>
  <text x="164" y="114" text-anchor="middle" font-size="13" font-weight="700" fill="#15803d">3</text>
  <!-- podium step 1 (center) -->
  <rect x="82" y="92" width="56" height="68" rx="5" fill="url(#p1)"/>
  <text x="110" y="82" text-anchor="middle" font-size="13" font-weight="700" fill="#14532d">1</text>
  <!-- star -->
  <circle cx="110" cy="56" r="22" fill="#dcfce7" opacity="0.6"/>
  <polygon points="110,36 113.8,48.5 127,48.5 116.4,56.3 120.2,68.8 110,61 99.8,68.8 103.6,56.3 93,48.5 106.2,48.5"
    fill="#16a34a" stroke="#15803d" stroke-width="0.5"/>
</svg>`;

function renderRank(rankData) {
  const el = document.getElementById('rank-content');
  if (!rankData) {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 0 4px;text-align:center">
        ${PODIUM_SVG}
        <div style="font-size:.95rem;font-weight:700;color:var(--blue);margin-bottom:4px">Compete, Climb, Conquer.</div>
        <div style="font-size:.78rem;color:var(--text-muted)">Solve more problems to unlock your rank.</div>
      </div>`;
    return;
  }
  const { rank, score, neighbors = [] } = rankData;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div style="font-size:3rem;font-weight:800;color:var(--blue);line-height:1">#${rank??'—'}</div>
      <div>
        <div style="font-size:1.1rem;font-weight:700">${fmtScore(score)}</div>
        <div class="t-muted t-sm">Global rank</div>
      </div>
    </div>
    <div style="font-size:.65rem;font-weight:700;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:.10em">Nearby Rankings</div>
    ${neighbors.map(n => `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border-soft)">
        <span style="width:28px;font-size:.78rem;font-weight:700;color:${n.rank===rank?'var(--blue)':'var(--text-muted)'}">#${n.rank}</span>
        ${avatarHTML(n,'sm')}
        <span style="flex:1;font-size:.82rem;font-weight:${n.rank===rank?'700':'400'}">${n.name||'Unknown'}</span>
        <span style="font-size:.78rem;color:var(--text-muted)">${fmtScore(n.total_score)}</span>
      </div>`).join('')}`;
}

function renderPlatformStats(stats) {
  const el = document.getElementById('platform-stats');
  const c  = stats?.coding || {};
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-sm)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:9px;height:9px;border-radius:50%;background:#d97706;display:inline-block;flex-shrink:0"></span>
          <span style="font-size:.84rem;font-weight:600">LeetCode</span>
        </div>
        <span style="font-size:.82rem;color:var(--text-muted);font-weight:500">${c.leetcode_solved??0} solved</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-sm)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:9px;height:9px;border-radius:50%;background:#2563eb;display:inline-block;flex-shrink:0"></span>
          <span style="font-size:.84rem;font-weight:600">Codeforces</span>
        </div>
        <span style="font-size:.82rem;color:var(--text-muted);font-weight:500">Rating ${c.codeforces_rating??0}</span>
      </div>
    </div>
    ${(c.leetcode_username||c.codeforces_username) ? `
    <div class="divider" style="margin:14px 0"></div>
    <div class="flex gap-3 flex-wrap">
      ${c.leetcode_username  ? `<a href="https://leetcode.com/${c.leetcode_username}" target="_blank" class="platform-link">🟡 LeetCode</a>` : ''}
      ${c.codeforces_username? `<a href="https://codeforces.com/profile/${c.codeforces_username}" target="_blank" class="platform-link">🔵 Codeforces</a>` : ''}
    </div>` : ''}`;
}

function renderGithubStats(stats) {
  const el = document.getElementById('github-stats');
  const g  = stats?.github || {};
  if (!g.github_username) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🐙</div><div class="empty-title">GitHub not linked</div><div class="empty-desc">Add your GitHub username in <a href="/profile.html">Profile</a></div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="grid-4" style="margin-bottom:16px">
      <div style="text-align:center;padding:12px;background:var(--bg-2);border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div style="font-size:1.4rem;font-weight:700">${fmtNum(g.total_commits)||'—'}</div><div class="t-muted t-sm">Commits</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--bg-2);border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div style="font-size:1.4rem;font-weight:700">${fmtNum(g.public_repos)||'—'}</div><div class="t-muted t-sm">Repos</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--bg-2);border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div style="font-size:1.4rem;font-weight:700">${fmtNum(g.followers)||'—'}</div><div class="t-muted t-sm">Followers</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--bg-2);border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div style="font-size:1.4rem;font-weight:700">${g.streak_days??'—'}</div><div class="t-muted t-sm">Streak</div>
      </div>
    </div>
    <a href="https://github.com/${g.github_username}" target="_blank" class="platform-link" style="width:fit-content">🐙 View GitHub Profile →</a>`;
}

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  try {
    const data  = await notifications.list({ page: 1 });
    const items = Array.isArray(data) ? data : (data?.notifications || data?.items || []);
    if (!items.length) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><div class="empty-title">All caught up!</div></div>`; return; }
    list.innerHTML = items.map(n => `
      <div class="notif-item ${n.is_read?'':'unread'}" data-id="${n._id||n.id}">
        ${!n.is_read ? '<div class="notif-dot-sm"></div>' : '<div style="width:8px"></div>'}
        <div style="flex:1">
          <div style="font-size:.83rem;font-weight:${n.is_read?'400':'600'}">${n.title||'Notification'}</div>
          <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">${n.body||''}</div>
          <div style="font-size:.7rem;color:var(--text-dim);margin-top:4px">${fmtRelative(n.createdAt||n.created_at)}</div>
        </div>
      </div>`).join('');
    list.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', async () => {
        const id = el.dataset.id;
        if (el.classList.contains('unread')) {
          try { await notifications.read(id); } catch {}
          el.classList.remove('unread');
          el.querySelector('.notif-dot-sm')?.remove();
        }
      });
    });
    if (!items.some(n => !n.is_read)) document.getElementById('notif-btn')?.classList.remove('notif-dot');
  } catch { list.innerHTML = `<div class="empty-state"><div class="empty-desc">Failed to load</div></div>`; }
}

document.getElementById('notif-btn').addEventListener('click', () => { document.getElementById('notif-panel').classList.add('open'); loadNotifications(); });
document.getElementById('notif-close').addEventListener('click', () => document.getElementById('notif-panel').classList.remove('open'));
document.getElementById('mark-all-read').addEventListener('click', async () => {
  try { await notifications.readAll(); document.getElementById('notif-btn')?.classList.remove('notif-dot'); toast('All marked as read', 'success'); loadNotifications(); }
  catch { toast('Failed', 'error'); }
});

document.getElementById('sync-btn').addEventListener('click', async e => {
  const btn = e.currentTarget; setLoading(btn, true);
  try { await students.syncCoding(); await students.syncGithub(); toast('Sync queued! Stats update shortly.', 'success'); }
  catch (ex) { toast(ex.message || 'Sync failed', 'error'); }
  finally { setLoading(btn, false, '↻ Sync Stats'); }
});

document.getElementById('sync-github-btn')?.addEventListener('click', async e => {
  const btn = e.currentTarget; setLoading(btn, true);
  try { await students.syncGithub(); toast('GitHub sync queued!', 'success'); }
  catch (ex) { toast(ex.message || 'Sync failed', 'error'); }
  finally { setLoading(btn, false, '↻ Sync GitHub'); }
});

document.getElementById('logout-btn').addEventListener('click', () => logout());
initTheme(); initMobileSidebar();

async function init() {
  setGreeting(user?.name);
  fillSidebar(user);
  try {
    const [profile, stats, history, rankData] = await Promise.allSettled([
      students.me(), students.myStats(), students.myHistory(), leaderboard.myRank(),
    ]);
    if (profile.status === 'fulfilled') fillSidebar(profile.value);
    if (stats.status === 'fulfilled') {
      renderStats(stats.value);
      renderPlatformStats(stats.value);
      renderGithubStats(stats.value);
    } else {
      document.getElementById('stats-grid').innerHTML = '<div class="empty-state"><div class="empty-desc">Could not load stats</div></div>';
    }
    if (rankData.status === 'fulfilled') renderRank(rankData.value);
    if (history.status === 'fulfilled') {
      const logs = Array.isArray(history.value) ? history.value : (history.value?.logs||[]);
      renderHeatmap(document.getElementById('heatmap'), logs);
      setTimeout(() => renderBarChart(document.getElementById('daily-chart'), logs.slice(-30), 'date', 'total_solved'), 100);
    }
  } catch (ex) { toast(ex.message || 'Failed to load dashboard', 'error'); }
}

init();
