import { admin as adminApi } from '../api.js';
import { requireAuth, logout, getUser } from '../auth.js';
import {
  toast, fmtScore, fmtDate, avatarHTML, rankDisplay, openModal, closeModal,
  initModals, setLoading, renderBarChart, getInitials, avatarColor, initMobileSidebar, debounce
} from '../utils.js';

if (!requireAuth(['admin', 'trainer'])) throw new Error('unauthorized');

const user = getUser();

// ─── Sidebar ──────────────────────────────────────────────────
(function() {
  const name = user?.name || 'Admin';
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-role').textContent = user?.role || 'admin';
  const av = document.getElementById('sidebar-avatar');
  av.textContent = getInitials(name);
  av.style.background = avatarColor(name);
  av.style.color = '#fff';
})();

document.getElementById('logout-btn').addEventListener('click', () => logout());
initMobileSidebar();
initModals();

// ─── Panel navigation ─────────────────────────────────────────
const panelLoaded = {};
const panels = document.querySelectorAll('[data-panel]');
const panelTitle = document.getElementById('panel-title');

panels.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    panels.forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    const panelId = item.dataset.panel;
    panelTitle.textContent = item.querySelector('span')?.textContent || 'Panel';
    showPanel(panelId);
  });
});

function showPanel(id) {
  document.querySelectorAll('[id^="panel-"]').forEach(el => el.style.display = 'none');
  const el = document.getElementById(`panel-${id}`);
  if (el) el.style.display = '';
  if (!panelLoaded[id]) {
    panelLoaded[id] = true;
    loadPanel(id);
  }
}

// ─── Load panels ──────────────────────────────────────────────
function loadPanel(id) {
  switch(id) {
    case 'dashboard':      loadAdminDashboard(); break;
    case 'students':       loadStudents();        break;
    case 'poor-performers':loadPoorPerformers();  break;
    case 'top-performers': loadTopPerformers();   break;
    case 'notify':         initNotifyForm();      break;
  }
}

// ─── Admin Dashboard ──────────────────────────────────────────
async function loadAdminDashboard() {
  try {
    const [dash, activity, growth] = await Promise.allSettled([
      adminApi.dashboard(),
      adminApi.activityAnalytics(),
      adminApi.growthAnalytics(),
    ]);

    if (dash.status === 'fulfilled') renderAdminStats(dash.value);
    if (activity.status === 'fulfilled') {
      const data = activity.value || [];
      setTimeout(() => renderBarChart(document.getElementById('activity-chart'), data, 'date', 'count'), 100);
    }
    if (growth.status === 'fulfilled') {
      const data = growth.value || [];
      setTimeout(() => renderBarChart(document.getElementById('growth-chart'), data, 'week', 'solves', '#3fb950'), 100);
    }
  } catch(ex) { toast('Dashboard load failed', 'error'); }
}

function renderAdminStats(d) {
  document.getElementById('admin-stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Students</div>
      <div class="stat-value">${d?.total_students ?? '—'}</div>
      <div class="stat-change">Registered in system</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Active Today</div>
      <div class="stat-value">${d?.active_today ?? '—'}</div>
      <div class="stat-change">Solved at least 1 problem</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Avg Score</div>
      <div class="stat-value">${fmtScore(d?.avg_score)}</div>
      <div class="stat-change">Across all students</div>
    </div>
    <div class="stat-card purple">
      <div class="stat-label">Top Scorer</div>
      <div class="stat-value t-sm" style="font-size:1rem">${d?.top_scorer?.name || '—'}</div>
      <div class="stat-change">${fmtScore(d?.top_scorer?.score)} pts</div>
    </div>`;
}

// ─── Students ─────────────────────────────────────────────────
let stPage = 1;

async function loadStudents(params = {}) {
  const tbody = document.getElementById('st-tbody');
  tbody.innerHTML = `<tr><td colspan="7"><div class="page-loader"><div class="spinner"></div></div></td></tr>`;
  try {
    const all = { page: stPage, ...params };
    Object.keys(all).forEach(k => !all[k] && delete all[k]);
    const data = await adminApi.students(all);
    const rows = Array.isArray(data) ? data : (data?.students || data?.items || []);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No students found</div></div></td></tr>`;
      document.getElementById('st-pagination').innerHTML = '';
      return;
    }
    tbody.innerHTML = rows.map(s => `
      <tr>
        <td>
          <div class="flex items-center gap-3">
            ${avatarHTML(s, 'sm')}
            <span style="font-weight:500">${s.name || '—'}</span>
          </div>
        </td>
        <td class="t-mono t-sm t-muted">${s.college_id || '—'}</td>
        <td><span class="badge badge-default">${s.batch || '—'}</span></td>
        <td class="t-muted">${s.specialization || '—'}</td>
        <td style="font-weight:700;color:var(--blue);text-align:right">${fmtScore(s.total_score)}</td>
        <td><span class="badge ${s.is_active ? 'badge-green' : 'badge-red'}">${s.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm" onclick="viewStudentDetail('${s.id || s.user_id}')">View</button>
            <button class="btn btn-${s.is_active ? 'danger' : 'success'} btn-sm"
              onclick="toggleActive('${s.id || s.user_id}', this)">${s.is_active ? 'Deactivate' : 'Activate'}</button>
          </div>
        </td>
      </tr>`).join('');

    renderStPagination(rows.length === 20);
  } catch(ex) { toast(ex.message || 'Failed', 'error'); }
}

function renderStPagination(hasMore) {
  const el = document.getElementById('st-pagination');
  el.innerHTML = `
    <div class="flex gap-2 items-center justify-center mt-6">
      <button class="btn btn-outline btn-sm" ${stPage<=1?'disabled':''} id="st-prev">← Prev</button>
      <span class="t-muted t-sm">Page ${stPage}</span>
      <button class="btn btn-outline btn-sm" ${!hasMore?'disabled':''} id="st-next">Next →</button>
    </div>`;
  document.getElementById('st-prev')?.addEventListener('click', () => { stPage--; getStudentFilters(); });
  document.getElementById('st-next')?.addEventListener('click', () => { stPage++; getStudentFilters(); });
}

function getStudentFilters() {
  loadStudents({
    name:           document.getElementById('st-search')?.value.trim(),
    batch:          document.getElementById('st-batch')?.value.trim(),
    specialization: document.getElementById('st-spec')?.value.trim(),
  });
}

document.getElementById('st-filter-btn')?.addEventListener('click', () => { stPage = 1; getStudentFilters(); });
document.getElementById('st-search')?.addEventListener('input', debounce(() => { stPage = 1; getStudentFilters(); }, 400));

// ─── Student detail ───────────────────────────────────────────
window.viewStudentDetail = async (id) => {
  openModal('student-detail-modal');
  const el = document.getElementById('student-detail-content');
  el.innerHTML = `<div class="page-loader"><div class="spinner"></div></div>`;
  try {
    const d = await adminApi.studentDetail(id);
    const p = d?.profile || d;
    const stats = d?.stats || {};
    el.innerHTML = `
      <div class="flex items-center gap-16 mb-4" style="gap:16px;margin-bottom:16px">
        ${avatarHTML(p, 'lg')}
        <div>
          <div style="font-size:1.1rem;font-weight:700">${p.name || '—'}</div>
          <div class="t-muted t-sm">${p.college_id || ''} · ${p.email || ''}</div>
          <div class="flex gap-2 mt-4" style="margin-top:8px">
            <span class="badge badge-default">${p.batch || '—'}</span>
            <span class="badge badge-default">${p.specialization || '—'}</span>
            <span class="badge ${p.is_active ? 'badge-green':'badge-red'}">${p.is_active ? 'Active':'Inactive'}</span>
          </div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div class="t-muted t-xs">Score</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--blue)">${fmtScore(stats?.score?.total_score || p.total_score)}</div>
        </div>
      </div>
      <div class="grid-2" style="gap:12px">
        <div style="padding:12px;background:var(--bg-3);border-radius:var(--radius-sm)">
          <div class="t-muted t-xs">LeetCode</div>
          <div style="font-weight:700">${stats?.coding?.leetcode_solved ?? '—'} solved</div>
        </div>
        <div style="padding:12px;background:var(--bg-3);border-radius:var(--radius-sm)">
          <div class="t-muted t-xs">Codeforces</div>
          <div style="font-weight:700">Rating ${stats?.coding?.codeforces_rating ?? '—'}</div>
        </div>
        <div style="padding:12px;background:var(--bg-3);border-radius:var(--radius-sm)">
          <div class="t-muted t-xs">GitHub</div>
          <div style="font-weight:700">${stats?.github?.total_commits ?? '—'} commits</div>
        </div>
        <div style="padding:12px;background:var(--bg-3);border-radius:var(--radius-sm)">
          <div class="t-muted t-xs">GitHub Username</div>
          <div style="font-weight:700">${p.github_username || '—'}</div>
        </div>
      </div>`;
  } catch(ex) {
    el.innerHTML = `<div class="empty-state"><div class="empty-desc">Failed to load student</div></div>`;
  }
};

window.toggleActive = async (id, btn) => {
  const label = btn.textContent.trim();
  btn.disabled = true;
  try {
    await adminApi.toggleActive(id);
    toast('Status updated', 'success');
    stPage = 1; getStudentFilters();
  } catch(ex) { toast(ex.message || 'Failed', 'error'); btn.disabled = false; }
};

// ─── Poor Performers ──────────────────────────────────────────
async function loadPoorPerformers() {
  const tbody = document.getElementById('pp-tbody');
  try {
    const data = await adminApi.poorPerformers();
    const rows = Array.isArray(data) ? data : (data?.students || []);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🌟</div><div class="empty-title">All students are active!</div><div class="empty-desc">No poor performers in the last 7 days.</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(s => `
      <tr>
        <td>
          <div class="flex items-center gap-3">
            ${avatarHTML(s, 'sm')}
            <div>
              <div style="font-weight:500">${s.name||'—'}</div>
              <div class="t-muted t-xs">${s.college_id||''}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-default">${s.batch||'—'}</span></td>
        <td class="t-muted">${s.specialization||'—'}</td>
        <td class="t-muted t-sm">${s.last_active ? fmtDate(s.last_active) : 'Never'}</td>
        <td>
          <span class="perf-badge perf-poor">⚠ Inactive</span>
        </td>
      </tr>`).join('');
  } catch(ex) { toast('Failed to load', 'error'); }
}

// ─── Top Performers ───────────────────────────────────────────
async function loadTopPerformers() {
  const el = document.getElementById('top-perf-content');
  try {
    const data = await adminApi.topPerformers();
    const global = data?.global || data?.top_global || [];
    const batches = data?.by_batch || data?.batches || {};

    let html = `<div class="section-header"><div class="section-title">🏆 Global Top 10</div></div>`;
    html += `<div class="card" style="padding:0;overflow:hidden;margin-bottom:24px">
      <div class="table-wrap" style="border:none">
        <table>
          <thead><tr><th>Rank</th><th>Student</th><th>Batch</th><th style="text-align:right">Score</th></tr></thead>
          <tbody>${global.map((s, i) => `
            <tr>
              <td>${rankDisplay(i+1)}</td>
              <td><div class="flex items-center gap-3">${avatarHTML(s,'sm')}<span style="font-weight:500">${s.name||'—'}</span></div></td>
              <td><span class="badge badge-default">${s.batch||'—'}</span></td>
              <td style="text-align:right;font-weight:700;color:var(--blue)">${fmtScore(s.total_score)}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

    const batchKeys = Object.keys(batches);
    if (batchKeys.length) {
      html += `<div class="section-title" style="margin-bottom:12px">📦 Top by Batch</div>`;
      html += `<div class="grid-2">`;
      batchKeys.forEach(batch => {
        const top = batches[batch] || [];
        html += `<div class="card">
          <div class="card-header"><span class="card-title">Batch ${batch}</span></div>
          ${top.slice(0,5).map((s,i) => `
            <div class="flex items-center gap-3" style="padding:6px 0;border-bottom:1px solid var(--border-soft)">
              <span style="width:22px;font-size:.78rem;font-weight:700;color:var(--text-muted)">${i+1}</span>
              ${avatarHTML(s,'sm')}
              <span style="flex:1;font-size:.82rem">${s.name||'—'}</span>
              <span style="font-weight:700;font-size:.82rem;color:var(--blue)">${fmtScore(s.total_score)}</span>
            </div>`).join('')}
        </div>`;
      });
      html += `</div>`;
    }

    el.innerHTML = html;
  } catch(ex) { el.innerHTML = `<div class="empty-state"><div class="empty-desc">Failed to load</div></div>`; }
}

// ─── Notify form ──────────────────────────────────────────────
function initNotifyForm() {
  const targetSel = document.getElementById('n-target');
  targetSel?.addEventListener('change', () => {
    document.getElementById('n-batch-group').style.display = targetSel.value === 'batch' ? '' : 'none';
    document.getElementById('n-user-group').style.display  = targetSel.value === 'user'  ? '' : 'none';
  });

  document.getElementById('notif-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('n-send-btn');
    setLoading(btn, true);
    const body = {
      title:   document.getElementById('n-title').value.trim(),
      body:    document.getElementById('n-body').value.trim(),
      target:  document.getElementById('n-target').value,
      batch:   document.getElementById('n-batch').value.trim() || undefined,
      userId:  document.getElementById('n-user-id').value.trim() || undefined,
    };
    try {
      await adminApi.sendNotif(body);
      toast('Notification queued!', 'success');
      document.getElementById('notif-form').reset();
    } catch(ex) { toast(ex.message || 'Failed to send', 'error'); }
    finally { setLoading(btn, false, 'Send Notification'); }
  });
}

// ─── Import ───────────────────────────────────────────────────
document.getElementById('import-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('import-btn');
  const status = document.getElementById('import-status');
  const raw = document.getElementById('import-json').value.trim();
  if (!raw) { toast('Paste JSON data first', 'warning'); return; }
  let students;
  try { students = JSON.parse(raw); }
  catch { toast('Invalid JSON', 'error'); return; }
  if (!Array.isArray(students)) { toast('JSON must be an array', 'error'); return; }

  setLoading(btn, true);
  status.textContent = '';
  try {
    const data = await adminApi.importStudents(students);
    toast(`Imported ${data?.count ?? students.length} students!`, 'success');
    status.textContent = `✓ ${data?.count ?? students.length} students imported`;
    status.style.color = 'var(--green)';
  } catch(ex) {
    toast(ex.message || 'Import failed', 'error');
    setLoading(btn, false, 'Import Students');
  }
});

// ─── Init: load dashboard panel ──────────────────────────────
showPanel('dashboard');
