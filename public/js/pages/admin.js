import { admin as adminApi } from '../api.js';
import { requireAuth, logout, getUser } from '../auth.js';
import { toast, fmtScore, fmtDate, avatarHTML, rankDisplay, openModal, closeModal, initModals, setLoading, renderBarChart, getInitials, avatarColor, initMobileSidebar, debounce, initTheme } from '../utils.js';

if (!requireAuth(['admin'])) throw new Error('unauthorized');
const user = getUser();

(function() {
  const name=user?.name||'Admin';
  document.getElementById('sidebar-name').textContent=name;
  document.getElementById('sidebar-role').textContent=user?.role||'admin';
  const av=document.getElementById('sidebar-avatar');
  av.textContent=getInitials(name); av.style.background=avatarColor(name); av.style.color='#fff';
})();

document.getElementById('logout-btn').addEventListener('click',()=>logout());
initTheme(); initMobileSidebar(); initModals();

const panelLoaded={};
const panels=document.querySelectorAll('[data-panel]');
const panelTitle=document.getElementById('panel-title');

panels.forEach(item=>{
  item.addEventListener('click',e=>{
    e.preventDefault();
    panels.forEach(p=>p.classList.remove('active'));
    item.classList.add('active');
    const id=item.dataset.panel;
    panelTitle.textContent=item.querySelector('span')?.textContent||'Panel';
    showPanel(id);
  });
});

function showPanel(id) {
  document.querySelectorAll('[id^="panel-"]').forEach(el=>el.style.display='none');
  const el=document.getElementById(`panel-${id}`);
  if (el) el.style.display='';
  if (!panelLoaded[id]) { panelLoaded[id]=true; loadPanel(id); }
}

function loadPanel(id) {
  switch(id) {
    case 'dashboard':       loadAdminDashboard(); break;
    case 'students':        loadStudents();        break;
    case 'search':          initSearchPanel();     break;
    case 'poor-performers': loadPoorPerformers();  break;
    case 'top-performers':  loadTopPerformers();   break;
    case 'create-trainer':  initCreateTrainer();   break;
    case 'notify':          initNotifyForm();      break;
    case 'import':          initImportPanel();     break;
  }
}

function waitForRender(fn) {
  requestAnimationFrame(()=>requestAnimationFrame(fn));
}

async function loadAdminDashboard() {
  try {
    const [dash,activity,growth] = await Promise.allSettled([adminApi.dashboard(),adminApi.activityAnalytics(),adminApi.growthAnalytics()]);
    if (dash.status==='fulfilled') renderAdminStats(dash.value);
    if (activity.status==='fulfilled') waitForRender(()=>renderBarChart(document.getElementById('activity-chart'),activity.value||[],'date','count'));
    if (growth.status==='fulfilled')   waitForRender(()=>renderBarChart(document.getElementById('growth-chart'),growth.value||[],'week','solves','#34c759'));
  } catch(ex) { toast('Dashboard load failed','error'); }
}

function renderAdminStats(d) {
  document.getElementById('admin-stats-grid').innerHTML=`
    <div class="stat-card"><div class="stat-label">Total Students</div><div class="stat-value">${d?.total_students??'—'}</div><div class="stat-change">Registered in system</div></div>
    <div class="stat-card green"><div class="stat-label">Active Today</div><div class="stat-value">${d?.active_today??'—'}</div><div class="stat-change">Solved at least 1 problem</div></div>
    <div class="stat-card orange"><div class="stat-label">Avg Score</div><div class="stat-value">${fmtScore(d?.avg_score)}</div><div class="stat-change">Across all students</div></div>
    <div class="stat-card purple"><div class="stat-label">Top Scorer</div><div class="stat-value t-sm" style="font-size:1rem">${d?.top_scorer?.name||'—'}</div><div class="stat-change">${fmtScore(d?.top_scorer?.total_score)} pts</div></div>`;
}

let stPage=1;
let lastStudentRows=[];
async function loadStudents(params={}) {
  const tbody=document.getElementById('st-tbody');
  tbody.innerHTML=`<tr><td colspan="7"><div class="page-loader"><div class="spinner"></div></div></td></tr>`;
  try {
    const all={page:stPage,...params};
    Object.keys(all).forEach(k=>!all[k]&&delete all[k]);
    const data=await adminApi.students(all);
    const rows=Array.isArray(data)?data:(data?.students||data?.items||[]);
    lastStudentRows=rows;
    if (!rows.length) {
      tbody.innerHTML=`<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No students found</div></div></td></tr>`;
      document.getElementById('st-pagination').innerHTML=''; return;
    }
    tbody.innerHTML=rows.map(s=>`
      <tr>
        <td><div class="flex items-center gap-3">${avatarHTML(s,'sm')}<span style="font-weight:500">${s.name||'—'}</span></div></td>
        <td class="t-mono t-sm t-muted">${s.college_id||'—'}</td>
        <td><span class="badge badge-default">${s.batch||'—'}</span></td>
        <td class="t-muted">${s.specialization||'—'}</td>
        <td style="font-weight:700;color:var(--blue);text-align:right">${fmtScore(s.total_score)}</td>
        <td><span class="badge ${s.is_active?'badge-green':'badge-red'}">${s.is_active?'Active':'Inactive'}</span></td>
        <td><div class="flex gap-2">
          <button class="btn btn-outline btn-sm" onclick="viewStudentDetail('${s.id||s.user_id}')">View</button>
          <button class="btn btn-${s.is_active?'danger':'success'} btn-sm" onclick="toggleActive('${s.id||s.user_id}',this)">${s.is_active?'Deactivate':'Activate'}</button>
        </div></td>
      </tr>`).join('');
    renderStPagination(rows.length===20);
  } catch(ex) { toast(ex.message||'Failed','error'); }
}

function renderStPagination(hasMore) {
  const el=document.getElementById('st-pagination');
  el.innerHTML=`<div class="flex gap-2 items-center justify-center mt-6">
    <button class="btn btn-outline btn-sm" ${stPage<=1?'disabled':''} id="st-prev">← Prev</button>
    <span class="t-muted t-sm">Page ${stPage}</span>
    <button class="btn btn-outline btn-sm" ${!hasMore?'disabled':''} id="st-next">Next →</button>
  </div>`;
  document.getElementById('st-prev')?.addEventListener('click',()=>{stPage--;getStudentFilters();});
  document.getElementById('st-next')?.addEventListener('click',()=>{stPage++;getStudentFilters();});
}

function getStudentFilters(){loadStudents({name:document.getElementById('st-search')?.value.trim(),batch:document.getElementById('st-batch')?.value.trim(),specialization:document.getElementById('st-spec')?.value.trim()});}
document.getElementById('st-filter-btn')?.addEventListener('click',()=>{stPage=1;getStudentFilters();});
document.getElementById('st-search')?.addEventListener('input',debounce(()=>{stPage=1;getStudentFilters();},400));

document.getElementById('st-pdf-btn')?.addEventListener('click',()=>{
  if (!lastStudentRows.length) { toast('No students to export','error'); return; }
  downloadStudentsPDF(lastStudentRows, 'Students List');
});

window.viewStudentDetail=async(id)=>{
  openModal('student-detail-modal');
  const el=document.getElementById('student-detail-content');
  el.innerHTML=`<div class="page-loader"><div class="spinner"></div></div>`;
  try {
    const d=await adminApi.studentDetail(id);
    const p=d?.profile||d; const stats=d?.stats||{};
    el.innerHTML=`
      <div class="flex items-center gap-4" style="gap:16px;margin-bottom:16px">
        ${avatarHTML(p,'lg')}
        <div>
          <div style="font-size:1.1rem;font-weight:700">${p.name||'—'}</div>
          <div class="t-muted t-sm">${p.college_id||''} · ${p.email||''}</div>
          <div class="flex gap-2" style="margin-top:8px">
            <span class="badge badge-default">${p.batch||'—'}</span>
            <span class="badge badge-default">${p.specialization||'—'}</span>
            <span class="badge ${p.is_active?'badge-green':'badge-red'}">${p.is_active?'Active':'Inactive'}</span>
          </div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div class="t-muted t-xs">Score</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--blue)">${fmtScore(stats?.score?.total_score||p.total_score)}</div>
        </div>
      </div>
      <div class="grid-2" style="gap:12px">
        <div style="padding:12px;background:var(--bg-2);border-radius:var(--radius-sm);border:1px solid var(--border)"><div class="t-muted t-xs">LeetCode</div><div style="font-weight:700">${stats?.coding?.leetcode_solved??'—'} solved</div></div>
        <div style="padding:12px;background:var(--bg-2);border-radius:var(--radius-sm);border:1px solid var(--border)"><div class="t-muted t-xs">Codeforces</div><div style="font-weight:700">Rating ${stats?.coding?.codeforces_rating??'—'}</div></div>
        <div style="padding:12px;background:var(--bg-2);border-radius:var(--radius-sm);border:1px solid var(--border)"><div class="t-muted t-xs">GitHub</div><div style="font-weight:700">${stats?.github?.total_commits??'—'} commits</div></div>
        <div style="padding:12px;background:var(--bg-2);border-radius:var(--radius-sm);border:1px solid var(--border)"><div class="t-muted t-xs">GitHub Username</div><div style="font-weight:700">${p.github_username||'—'}</div></div>
      </div>`;
  } catch(ex) { el.innerHTML=`<div class="empty-state"><div class="empty-desc">Failed to load student</div></div>`; }
};

window.toggleActive=async(id,btn)=>{btn.disabled=true;try{await adminApi.toggleActive(id);toast('Status updated','success');stPage=1;getStudentFilters();}catch(ex){toast(ex.message||'Failed','error');btn.disabled=false;}};

async function loadPoorPerformers() {
  const tbody=document.getElementById('pp-tbody');
  try {
    const data=await adminApi.poorPerformers();
    const rows=Array.isArray(data)?data:(data?.students||[]);
    if (!rows.length) { tbody.innerHTML=`<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🌟</div><div class="empty-title">All students are active!</div></div></td></tr>`; return; }
    tbody.innerHTML=rows.map(s=>`
      <tr>
        <td><div class="flex items-center gap-3">${avatarHTML(s,'sm')}<div><div style="font-weight:500">${s.name||'—'}</div><div class="t-muted t-xs">${s.college_id||''}</div></div></div></td>
        <td><span class="badge badge-default">${s.batch||'—'}</span></td>
        <td class="t-muted">${s.specialization||'—'}</td>
        <td class="t-muted t-sm">${s.last_active?fmtDate(s.last_active):'Never'}</td>
        <td><span class="perf-badge perf-poor">⚠ Inactive</span></td>
      </tr>`).join('');
  } catch(ex) { toast('Failed to load','error'); }
}

async function loadTopPerformers() {
  const el=document.getElementById('top-perf-content');
  try {
    const data=await adminApi.topPerformers();
    const global=data?.global||data?.top_global||[];
    let html=`<div class="section-header"><div class="section-title">🏆 Global Top 10</div></div>`;
    html+=`<div class="card" style="padding:0;overflow:hidden;margin-bottom:24px"><div class="table-wrap" style="border:none"><table>
      <thead><tr><th>Rank</th><th>Student</th><th>Batch</th><th style="text-align:right">Score</th></tr></thead>
      <tbody>${global.map((s,i)=>`
        <tr>
          <td style="font-weight:700">${rankDisplay(i+1)}</td>
          <td><div class="flex items-center gap-3">${avatarHTML(s,'sm')}<span>${s.name||'—'}</span></div></td>
          <td><span class="badge badge-default">${s.batch||'—'}</span></td>
          <td style="text-align:right;font-weight:700;color:var(--blue)">${fmtScore(s.total_score)}</td>
        </tr>`).join('')||'<tr><td colspan="4"><div class="empty-state t-sm">No data</div></td></tr>'}
      </tbody>
    </table></div></div>`;
    el.innerHTML=html;
  } catch(ex) { el.innerHTML=`<div class="empty-state"><div class="empty-desc">Failed to load</div></div>`; }
}

// ── Search Panel ──
let lastSearchRows=[];
function initSearchPanel() {
  document.getElementById('search-btn')?.addEventListener('click', runSearch);
  document.getElementById('search-pdf-btn')?.addEventListener('click',()=>{
    if (!lastSearchRows.length) { toast('Run a search first','error'); return; }
    downloadStudentsPDF(lastSearchRows, 'Student Search Results');
  });
  document.getElementById('search-email')?.addEventListener('keydown',e=>{ if(e.key==='Enter') runSearch(); });
  document.getElementById('search-name')?.addEventListener('keydown',e=>{ if(e.key==='Enter') runSearch(); });
  document.getElementById('search-college-id')?.addEventListener('keydown',e=>{ if(e.key==='Enter') runSearch(); });
}

async function runSearch() {
  const email     = document.getElementById('search-email')?.value.trim();
  const name      = document.getElementById('search-name')?.value.trim();
  const collegeId = document.getElementById('search-college-id')?.value.trim();
  if (!email && !name && !collegeId) { toast('Enter email, name or college ID to search','error'); return; }
  const btn = document.getElementById('search-btn');
  setLoading(btn, true);
  try {
    const params={};
    if (email)     params.email=email;
    if (name)      params.name=name;
    if (collegeId) params.college_id=collegeId;
    const rows = await adminApi.searchStudents(params);
    lastSearchRows = Array.isArray(rows)?rows:(rows?.students||[]);
    const countEl = document.getElementById('search-count');
    if (countEl) countEl.textContent = `${lastSearchRows.length} result${lastSearchRows.length!==1?'s':''}`;
    renderSearchResults(lastSearchRows);
  } catch(ex) { toast(ex.message||'Search failed','error'); }
  finally { setLoading(btn, false, 'Search'); }
}

function renderSearchResults(rows) {
  const el = document.getElementById('search-results');
  if (!rows.length) {
    el.innerHTML=`<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No results found</div></div>`;
    return;
  }
  el.innerHTML=`<div class="card" style="padding:0;overflow:hidden">
    <div class="table-wrap" style="border:none">
      <table>
        <thead><tr><th>Student</th><th>College ID</th><th>Email</th><th>Batch</th><th>Spec</th><th>Status</th></tr></thead>
        <tbody>${rows.map(s=>`
          <tr>
            <td><div class="flex items-center gap-3">${avatarHTML(s,'sm')}<span style="font-weight:500">${s.name||'—'}</span></div></td>
            <td class="t-mono t-sm t-muted">${s.college_id||'—'}</td>
            <td class="t-muted t-sm">${s.email||'—'}</td>
            <td><span class="badge badge-default">${s.batch||'—'}</span></td>
            <td class="t-muted">${s.specialization||'—'}</td>
            <td><span class="badge ${s.is_active?'badge-green':'badge-red'}">${s.is_active?'Active':'Inactive'}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ── PDF Export ──
function downloadStudentsPDF(rows, title='Students') {
  const now = new Date().toLocaleString();
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title} — UTPT</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: #1d1d1f; padding: 32px; font-size: 12px; }
  h1 { font-size: 20px; font-weight: 800; margin: 0 0 4px; color: #0071e3; }
  .meta { color: #6e6e73; font-size: 11px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f5f5f7; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #6e6e73; border-bottom: 2px solid #e5e5ea; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0f0f2; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
  .active { background: #e6f8ec; color: #1a7f37; }
  .inactive { background: #fff1f0; color: #cf222e; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<h1>UTPT — ${title}</h1>
<div class="meta">Generated on ${now} · ${rows.length} students</div>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Name</th>
      <th>College ID</th>
      <th>Email</th>
      <th>Batch</th>
      <th>Specialization</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${rows.map((s,i)=>`
    <tr>
      <td>${i+1}</td>
      <td><strong>${s.name||'—'}</strong></td>
      <td style="font-family:monospace">${s.college_id||'—'}</td>
      <td>${s.email||'—'}</td>
      <td>${s.batch||'—'}</td>
      <td>${s.specialization||'—'}</td>
      <td><span class="badge ${s.is_active?'active':'inactive'}">${s.is_active?'Active':'Inactive'}</span></td>
    </tr>`).join('')}
  </tbody>
</table>
<script>window.onload=()=>{ window.print(); }<\/script>
</body>
</html>`;
  const w = window.open('','_blank','width=900,height=700');
  if (!w) { toast('Allow popups to download PDF', 'error'); return; }
  w.document.write(html);
  w.document.close();
}

// ── Create Trainer ──
function initCreateTrainer() {
  document.getElementById('create-trainer-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn    = document.getElementById('tr-submit-btn');
    const status = document.getElementById('tr-status');
    const errEl  = document.getElementById('tr-error');
    errEl.style.display = 'none';
    status.textContent  = '';

    const body = {
      name:     document.getElementById('tr-name').value.trim(),
      email:    document.getElementById('tr-email').value.trim(),
      username: document.getElementById('tr-username').value.trim(),
      password: document.getElementById('tr-password').value,
    };

    setLoading(btn, true);
    try {
      const result = await adminApi.createTrainer(body);
      status.textContent = `✓ Trainer "${result?.name||body.name}" created`;
      toast(`Trainer ${result?.name||body.name} created successfully!`, 'success');
      document.getElementById('create-trainer-form').reset();
    } catch(ex) {
      errEl.textContent    = ex.message || 'Failed to create trainer';
      errEl.style.display  = '';
      toast(ex.message||'Failed','error');
    } finally { setLoading(btn, false, 'Create Trainer'); }
  });
}

function initNotifyForm() {
  const targetSel=document.getElementById('n-target');
  const batchGrp =document.getElementById('n-batch-group');
  const userGrp  =document.getElementById('n-user-group');
  targetSel?.addEventListener('change',()=>{
    batchGrp.style.display=targetSel.value==='batch'?'':'none';
    userGrp.style.display =targetSel.value==='user' ?'':'none';
  });
  document.getElementById('notif-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=document.getElementById('n-send-btn'); setLoading(btn,true);
    const body={title:document.getElementById('n-title').value.trim(),body:document.getElementById('n-body').value.trim(),target:targetSel.value,batch:document.getElementById('n-batch')?.value.trim()||undefined,userId:document.getElementById('n-user-id')?.value.trim()||undefined};
    try{await adminApi.sendNotif(body);toast('Notification sent!','success');document.getElementById('notif-form').reset();}
    catch(ex){toast(ex.message||'Failed to send','error');}
    finally{setLoading(btn,false,'Send Notification');}
  });
}

function initImportPanel() {
  const tabBtns = document.querySelectorAll('[data-import-tab]');
  const fileTab = document.getElementById('import-tab-file');
  const jsonTab = document.getElementById('import-tab-json');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.importTab;
      fileTab.style.display = tab === 'file' ? '' : 'none';
      jsonTab.style.display = tab === 'json' ? '' : 'none';
    });
  });

  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileSelected = document.getElementById('file-selected');
  const fileName  = document.getElementById('file-name');
  const fileClear = document.getElementById('file-clear');

  dropZone?.addEventListener('click', () => fileInput?.click());
  dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  });

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) setSelectedFile(file);
  });

  fileClear?.addEventListener('click', () => {
    fileInput.value = '';
    fileSelected.style.display = 'none';
    dropZone.style.display = '';
  });

  function setSelectedFile(file) {
    fileName.textContent = file.name;
    fileSelected.style.display = 'flex';
    dropZone.style.display = 'none';
  }

  document.getElementById('import-file-btn')?.addEventListener('click', async () => {
    const btn    = document.getElementById('import-file-btn');
    const status = document.getElementById('import-file-status');
    const file   = fileInput?.files[0];
    if (!file) { toast('Please select a file first', 'error'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv','xlsx','xls'].includes(ext)) { toast('Only CSV and Excel files are supported', 'error'); return; }
    setLoading(btn, true); status.textContent = 'Uploading…';
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await adminApi.importStudentsFile(form);
      status.textContent = `✓ Imported ${result?.imported ?? '?'} students`;
      toast('Import successful!', 'success');
      fileInput.value = '';
      fileSelected.style.display = 'none';
      dropZone.style.display = '';
    } catch(ex) {
      toast(ex.message || 'Import failed', 'error');
      status.textContent = 'Import failed';
    } finally { setLoading(btn, false, 'Import File'); }
  });

  document.getElementById('import-btn')?.addEventListener('click', async () => {
    const btn    = document.getElementById('import-btn');
    const status = document.getElementById('import-status');
    const raw    = document.getElementById('import-json').value.trim();
    if (!raw) { toast('Please paste JSON data', 'error'); return; }
    let students;
    try { students = JSON.parse(raw); } catch { toast('Invalid JSON', 'error'); return; }
    if (!Array.isArray(students) || !students.length) { toast('Must be a non-empty array', 'error'); return; }
    const invalid = students.filter(s => s.email && !s.email.endsWith('@gla.ac.in'));
    if (invalid.length) { toast(`${invalid.length} student(s) have non-@gla.ac.in emails`, 'error'); return; }
    setLoading(btn, true); status.textContent = 'Importing…';
    try {
      const r = await adminApi.importStudents(students);
      status.textContent = `✓ Imported ${r?.imported ?? students.length} students`;
      toast('Import successful!', 'success');
      document.getElementById('import-json').value = '';
    } catch(ex) {
      toast(ex.message || 'Import failed', 'error');
      status.textContent = 'Import failed';
    } finally { setLoading(btn, false, 'Import Students'); }
  });
}

showPanel('dashboard');
