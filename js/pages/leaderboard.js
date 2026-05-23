import { leaderboard as lbApi } from '../api.js';
import { requireAuth, logout, getUser } from '../auth.js';
import { toast, fmtScore, avatarHTML, rankDisplay, getInitials, avatarColor, initMobileSidebar, initTheme } from '../utils.js';

if (!requireAuth()) throw new Error('unauthenticated');
const user = getUser();

(function fillSidebar() {
  const name = user?.name || 'User';
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-role').textContent = user?.role || 'student';
  const av = document.getElementById('sidebar-avatar');
  av.textContent = getInitials(name); av.style.background = avatarColor(name); av.style.color = '#fff';
})();

document.getElementById('logout-btn').addEventListener('click', () => logout());
initTheme(); initMobileSidebar();

let scope = 'global', page = 1, batchFilter = '', specFilter = '';

document.querySelectorAll('.tab-btn[data-scope]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn[data-scope]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    scope = btn.dataset.scope; page = 1;
    renderFilterExtra(); loadLeaderboard();
  });
});

function renderFilterExtra() {
  const el = document.getElementById('filter-extra');
  el.innerHTML = '';
  if (scope === 'batch') {
    el.innerHTML = `<input type="text" class="form-input" id="lb-batch-inp" placeholder="Enter batch (e.g. 2024)" style="width:200px">
      <button class="btn btn-outline btn-sm" id="lb-go-btn">Go</button>`;
    document.getElementById('lb-go-btn').addEventListener('click', () => { batchFilter = document.getElementById('lb-batch-inp').value.trim(); page=1; loadLeaderboard(); });
  } else if (scope === 'spec') {
    el.innerHTML = `<input type="text" class="form-input" id="lb-spec-inp" placeholder="Specialization (e.g. CSE)" style="width:220px">
      <button class="btn btn-outline btn-sm" id="lb-go-btn">Go</button>`;
    document.getElementById('lb-go-btn').addEventListener('click', () => { specFilter = document.getElementById('lb-spec-inp').value.trim(); page=1; loadLeaderboard(); });
  }
}

async function loadMyRank() {
  try {
    const data = await lbApi.myRank();
    if (!data) return;
    document.getElementById('my-rank-num').textContent   = `#${data.rank??'—'}`;
    document.getElementById('my-rank-name').textContent  = user?.name || 'You';
    document.getElementById('my-rank-score').textContent = `Score: ${fmtScore(data.score)}`;
    document.getElementById('my-rank-bar').style.display = 'flex';
  } catch {}
}

function renderPodium(rows) {
  const el = document.getElementById('lb-podium');
  if (!rows||rows.length<3) { el.innerHTML=''; return; }
  const order = [rows[1], rows[0], rows[2]];
  const heights = ['podium-2','podium-1','podium-3'];
  el.innerHTML = order.map((s,i) => `
    <div class="podium-item">
      ${avatarHTML(s,'md')}
      <div class="podium-name">${s?.name||'—'}</div>
      <div class="podium-score">${fmtScore(s?.total_score)}</div>
      <div class="podium-block ${heights[i]}">${i===1?'1':i===0?'2':'3'}</div>
    </div>`).join('');
}

function renderTable(rows) {
  const tbody = document.getElementById('lb-tbody');
  if (!rows?.length) { tbody.innerHTML=`<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No data</div><div class="empty-desc">Try a different filter</div></div></td></tr>`; return; }
  const myId = user?.id;
  tbody.innerHTML = rows.map((s,i) => {
    const rank = (page-1)*50+i+1;
    const isMe = s.id===myId||s.user_id===myId;
    return `<tr class="${isMe?'lb-row-me':''}">
      <td style="font-weight:700">${rankDisplay(rank)}</td>
      <td><div class="flex items-center gap-3">${avatarHTML(s,'sm')}<div><div style="font-weight:${isMe?'700':'400'}">${s.name||'—'} ${isMe?'<span class="badge badge-blue" style="font-size:.65rem">You</span>':''}</div><div class="t-muted t-xs">${s.college_id||''}</div></div></div></td>
      <td><span class="badge badge-default">${s.batch||'—'}</span></td>
      <td class="t-muted">${s.specialization||'—'}</td>
      <td>${s.leetcode_solved??'—'}</td>
      <td>${s.codeforces_rating??'—'}</td>
      <td>${s.total_commits??'—'}</td>
      <td style="text-align:right;font-weight:700;color:var(--blue)">${fmtScore(s.total_score)}</td>
    </tr>`;
  }).join('');
}

function renderPagination(hasMore) {
  const el = document.getElementById('lb-pagination');
  el.innerHTML = `<div class="flex gap-2 items-center justify-center mt-6">
    <button class="btn btn-outline btn-sm" ${page<=1?'disabled':''} id="lb-prev">← Prev</button>
    <span class="t-muted t-sm">Page ${page}</span>
    <button class="btn btn-outline btn-sm" ${!hasMore?'disabled':''} id="lb-next">Next →</button>
  </div>`;
  document.getElementById('lb-prev')?.addEventListener('click', () => { page--; loadLeaderboard(); });
  document.getElementById('lb-next')?.addEventListener('click', () => { page++; loadLeaderboard(); });
}

async function loadLeaderboard() {
  document.getElementById('lb-tbody').innerHTML = `<tr><td colspan="8"><div class="page-loader"><div class="spinner"></div></div></td></tr>`;
  document.getElementById('lb-podium').innerHTML = '';
  try {
    let data;
    if (scope==='global')     data = await lbApi.global(page);
    else if (scope==='batch') data = batchFilter ? await lbApi.byBatch(batchFilter,page) : [];
    else if (scope==='spec')  data = specFilter  ? await lbApi.bySpec(specFilter,page)   : [];
    const rows = Array.isArray(data) ? data : (data?.students||data?.rankings||[]);
    if (page===1) renderPodium(rows);
    renderTable(rows);
    renderPagination(rows.length===50);
  } catch (ex) {
    toast(ex.message||'Failed to load leaderboard','error');
    document.getElementById('lb-tbody').innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-desc">Failed to load</div></div></td></tr>`;
  }
}

loadMyRank();
loadLeaderboard();
