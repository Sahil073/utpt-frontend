import { students, leaderboard, notifications } from '../api.js';
import { requireAuth, logout, getUser } from '../auth.js';
import {
  toast, fmtScore, fmtNum, avatarHTML, getInitials, avatarColor,
  renderBarChart, renderHeatmap, rankDisplay, fmtRelative, initMobileSidebar, setLoading
} from '../utils.js';

if (!requireAuth()) throw new Error('unauthenticated');

const user = getUser();

// ─── Sidebar user ─────────────────────────────────────────────
function fillSidebar(profile) {
  const name = profile?.name || user?.name || 'User';
  const role = profile?.role || user?.role || 'student';
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-role').textContent = role;
  const av = document.getElementById('sidebar-avatar');
  if (profile?.avatar_url) {
    av.innerHTML = `<img src="${profile.avatar_url}" alt="${name}">`;
  } else {
    av.textContent = getInitials(name);
    av.style.background = avatarColor(name);
    av.style.color = '#fff';
  }
}

// ─── Greeting ─────────────────────────────────────────────────
function setGreeting(name) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${g}, ${name?.split(' ')[0] || 'there'} 👋`;
}

// ─── Stats Grid ───────────────────────────────────────────────
function renderStats(stats) {
  const coding = stats?.coding || {};
  const github = stats?.github || {};
  const score  = stats?.score  || {};
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Score</div>
      <div class="stat-value t-blue">${fmtScore(score.total_score)}</div>
      <div class="stat-change">Placement ranking score</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">LeetCode Solved</div>
      <div class="stat-value">${fmtNum(coding.leetcode_solved) ?? '—'}</div>
      <div class="stat-change">Rating: ${coding.leetcode_rating || '—'}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Codeforces Rating</div>
      <div class="stat-value">${fmtNum(coding.codeforces_rating) ?? '—'}</div>
      <div class="stat-change">Max: ${coding.codeforces_max_rating || '—'}</div>
    </div>
    <div class="stat-card purple">
      <div class="stat-label">GitHub Commits</div>
      <div class="stat-value">${fmtNum(github.total_commits) ?? '—'}</div>
      <div class="stat-change">${github.public_repos || 0} public repos</div>
    </div>`;
}

// ─── Rank Card ────────────────────────────────────────────────
function renderRank(rankData) {
  const el = document.getElementById('rank-content');
  if (!rankData) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-desc">Rank data unavailable</div></div>'; return; }
  const { rank, score, neighbors = [] } = rankData;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div style="font-size:3rem;font-weight:800;color:var(--blue);line-height:1">#${rank ?? '—'}</div>
      <div>
        <div style="font-size:1.1rem;font-weight:700">${fmtScore(score)}</div>
        <div class="t-muted t-sm">Global rank</div>
      </div>
    </div>
    <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Nearby Rankings</div>
    ${neighbors.map(n => `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border-soft)">
        <span style="width:28px;font-size:.78rem;font-weight:700;color:${n.rank === rank ? 'var(--blue)' : 'var(--text-muted)'}">#${n.rank}</span>
        ${avatarHTML(n, 'sm')}
        <span style="flex:1;font-size:.82rem;font-weight:${n.rank === rank ? '700' : '400'}">${n.name || 'Unknown'}</span>
        <span style="font-size:.78rem;color:var(--text-muted)">${fmtScore(n.total_score)}</span>
      </div>`).join('')}`;
}

// ─── Platform Stats ───────────────────────────────────────────
function renderPlatformStats(stats) {
  const el = document.getElementById('platform-stats');
  const c = stats?.coding || {};
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:.82rem;font-weight:600">🟡 LeetCode</span>
          <span class="t-sm t-muted">${c.leetcode_solved ?? 0} solved</span>
        </div>
        <div class="progress-bar"><div class="progress-fill green" style="width:${Math.min(100, ((c.leetcode_solved||0)/1000)*100)}%"></div></div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:.82rem;font-weight:600">🔵 Codeforces</span>
          <span class="t-sm t-muted">Rating ${c.codeforces_rating ?? 0}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill orange" style="width:${Math.min(100, ((c.codeforces_rating||0)/3500)*100)}%"></div></div>
      </div>
    </div>
    <div class="divider" style="margin:16px 0"></div>
    <div class="flex gap-3 flex-wrap">
      ${c.leetcode_username ? `<a href="https://leetcode.com/${c.leetcode_username}" target="_blank" class="platform-link">🟡 LeetCode</a>` : ''}
      ${c.codeforces_username ? `<a href="https://codeforces.com/profile/${c.codeforces_username}" target="_blank" class="platform-link">🔵 Codeforces</a>` : ''}
    </div>`;
}

// ─── GitHub Stats ─────────────────────────────────────────────
function renderGithubStats(stats) {
  const el = document.getElementById('github-stats');
  const g = stats?.github || {};
  if (!g.github_username) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🐙</div><div class="empty-title">GitHub not linked</div><div class="empty-desc">Add your GitHub username in <a href="/profile.html">Profile</a></div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="grid-4" style="margin-bottom:16px">
      <div style="text-align:center;padding:12px;background:var(--bg-3);border-radius:var(--radius-sm)">
        <div style="font-size:1.4rem;font-weight:700">${fmtNum(g.total_commits)||'—'}</div>
        <div class="t-muted t-sm">Commits</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--bg-3);border-radius:var(--radius-sm)">
        <div style="font-size:1.4rem;font-weight:700">${fmtNum(g.public_repos)||'—'}</div>
        <div class="t-muted t-sm">Repos</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--bg-3);border-radius:var(--radius-sm)">
        <div style="font-size:1.4rem;font-weight:700">${fmtNum(g.followers)||'—'}</div>
        <div class="t-muted t-sm">Followers</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--bg-3);border-radius:var(--radius-sm)">
        <div style="font-size:1.4rem;font-weight:700">${g.streak_days ?? '—'}</div>
        <div class="t-muted t-sm">Streak (days)</div>
      </div>
    </div>
    <a href="https://github.com/${g.github_username}" target="_blank" class="platform-link" style="width:fit-content">
      🐙 View GitHub Profile →
    </a>`;
}

// ─── Notifications panel ──────────────────────────────────────
async function loadNotifications() {
  const list = document.getElementById('notif-list');
  try {
    const data = await notifications.list({ page: 1 });
    const items = Array.isArray(data) ? data : data?.items || [];
    if (!items.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><div class="empty-title">All caught up!</div></div>`;
      return;
    }
    list.innerHTML = items.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n._id || n.id}">
        ${!n.is_read ? '<div class="notif-dot-sm"></div>' : '<div style="width:8px"></div>'}
        <div style="flex:1">
          <div style="font-size:.83rem;font-weight:${n.is_read ? '400' : '600'}">${n.title || 'Notification'}</div>
          <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">${n.body || ''}</div>
          <div style="font-size:.7rem;color:var(--text-dim);margin-top:4px">${fmtRelative(n.createdAt || n.created_at)}</div>
        </div>
      </div>`).join('');

    // Mark as read on click
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
    // Remove red dot from bell if none unread
    const hasUnread = items.some(n => !n.is_read);
    if (!hasUnread) document.getElementById('notif-btn')?.classList.remove('notif-dot');
  } catch { list.innerHTML = `<div class="empty-state"><div class="empty-desc">Failed to load</div></div>`; }
}

document.getElementById('notif-btn').addEventListener('click', () => {
  document.getElementById('notif-panel').classList.add('open');
  loadNotifications();
});
document.getElementById('notif-close').addEventListener('click', () => {
  document.getElementById('notif-panel').classList.remove('open');
});
document.getElementById('mark-all-read').addEventListener('click', async () => {
  try {
    await notifications.readAll();
    document.getElementById('notif-btn')?.classList.remove('notif-dot');
    toast('All notifications marked as read', 'success');
    loadNotifications();
  } catch { toast('Failed', 'error'); }
});

// ─── Sync buttons ─────────────────────────────────────────────
document.getElementById('sync-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  setLoading(btn, true);
  try {
    await students.syncCoding();
    await students.syncGithub();
    toast('Sync queued! Stats will update shortly.', 'success');
  } catch (ex) {
    toast(ex.message || 'Sync failed', 'error');
  } finally { setLoading(btn, false, '↻ Sync Stats'); }
});

document.getElementById('sync-github-btn')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  setLoading(btn, true);
  try {
    await students.syncGithub();
    toast('GitHub sync queued!', 'success');
  } catch (ex) { toast(ex.message || 'Sync failed', 'error'); }
  finally { setLoading(btn, false, '↻ Sync GitHub'); }
});

// ─── Logout ───────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => logout());

// ─── Mobile sidebar ───────────────────────────────────────────
initMobileSidebar();

// ─── Init ─────────────────────────────────────────────────────
async function init() {
  setGreeting(user?.name);
  fillSidebar(user);

  try {
    const [profile, stats, history, rankData] = await Promise.allSettled([
      students.me(),
      students.myStats(),
      students.myHistory(),
      leaderboard.myRank(),
    ]);

    if (profile.status === 'fulfilled') fillSidebar(profile.value);
    if (stats.status === 'fulfilled')   {
      renderStats(stats.value);
      renderPlatformStats(stats.value);
      renderGithubStats(stats.value);
    } else {
      document.getElementById('stats-grid').innerHTML = '<div class="empty-state"><div class="empty-desc">Could not load stats</div></div>';
      document.getElementById('platform-stats').innerHTML = '';
      document.getElementById('github-stats').innerHTML = '';
    }

    const logs = history.status === 'fulfilled' ? (history.value || []) : [];
    renderHeatmap(document.getElementById('heatmap'), logs);
    renderBarChart(document.getElementById('daily-chart'), logs, 'date', 'count');

    if (rankData.status === 'fulfilled') renderRank(rankData.value);
    else document.getElementById('rank-content').innerHTML = '<div class="empty-state"><div class="empty-desc">Rank unavailable</div></div>';

  } catch (err) {
    console.error(err);
    toast('Failed to load dashboard data', 'error');
  }
}

init();
