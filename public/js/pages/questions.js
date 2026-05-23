import { questions as questionsApi } from '../api.js';
import { requireAuth, logout, getUser } from '../auth.js';
import { toast, diffBadge, openModal, closeModal, initModals, debounce, setLoading, getInitials, avatarColor, initMobileSidebar, initTheme } from '../utils.js';

if (!requireAuth()) throw new Error('unauthenticated');
const user = getUser();
let page=1, filters={}, editingId=null;

(function() {
  const name=user?.name||'User';
  document.getElementById('sidebar-name').textContent=name;
  document.getElementById('sidebar-role').textContent=user?.role||'student';
  const av=document.getElementById('sidebar-avatar');
  av.textContent=getInitials(name); av.style.background=avatarColor(name); av.style.color='#fff';
})();

document.getElementById('logout-btn').addEventListener('click', ()=>logout());
initTheme(); initMobileSidebar(); initModals();

const canManage = ['admin','trainer'].includes(user?.role);
if (canManage) { document.getElementById('add-q-btn').style.display='inline-flex'; document.getElementById('q-action-th').style.display=''; }

async function loadQuestions() {
  const tbody = document.getElementById('q-tbody');
  tbody.innerHTML=`<tr><td colspan="6"><div class="page-loader"><div class="spinner"></div></div></td></tr>`;
  const params={page,...filters};
  Object.keys(params).forEach(k=>!params[k]&&delete params[k]);
  try {
    const data = await questionsApi.list(params);
    const rows = Array.isArray(data)?data:(data?.questions||data?.items||[]);
    const meta = data?.meta||{};
    if (page===1) updateStats(rows,meta);
    if (!rows.length) {
      tbody.innerHTML=`<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">❓</div><div class="empty-title">No questions found</div><div class="empty-desc">Try different filters</div></div></td></tr>`;
      document.getElementById('q-pagination').innerHTML=''; return;
    }
    tbody.innerHTML=rows.map((q,i)=>`
      <tr>
        <td class="t-muted t-sm">${(page-1)*20+i+1}</td>
        <td>${q.platform_link?`<a href="${q.platform_link}" target="_blank" style="font-weight:500;color:var(--text)">${q.title}</a>`:`<span style="font-weight:500">${q.title}</span>`}</td>
        <td>${diffBadge(q.difficulty)}</td>
        <td><div class="flex gap-2 flex-wrap">${(q.tags||[]).map(t=>`<span class="badge badge-default">${t}</span>`).join('')||'<span class="t-muted t-sm">—</span>'}</div></td>
        <td>${q.platform_link?`<a href="${q.platform_link}" target="_blank" class="platform-link" style="display:inline-flex">${getPlatformIcon(q.platform_link)} →</a>`:'<span class="t-muted">—</span>'}</td>
        ${canManage?`<td><div class="flex gap-2"><button class="btn btn-outline btn-sm" onclick="editQuestion('${q.id||q._id}',${JSON.stringify(q).replace(/"/g,'&quot;')})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteQuestion('${q.id||q._id}')">Delete</button></div></td>`:''}
      </tr>`).join('');
    renderPagination(rows.length===20);
  } catch (ex) { toast(ex.message||'Failed to load questions','error'); tbody.innerHTML=`<tr><td colspan="6"><div class="empty-state"><div class="empty-desc">Failed to load</div></div></td></tr>`; }
}

function getPlatformIcon(url='') {
  if (url.includes('leetcode'))   return '🟡 LeetCode';
  if (url.includes('codeforces')) return '🔵 Codeforces';
  if (url.includes('hackerrank')) return '🟢 HackerRank';
  if (url.includes('gfg')||url.includes('geeksforgeeks')) return '🟠 GFG';
  return '🔗 Link';
}

function updateStats(rows,meta) {
  const e=rows.filter(q=>q.difficulty==='easy').length;
  const m=rows.filter(q=>q.difficulty==='medium').length;
  const h=rows.filter(q=>q.difficulty==='hard').length;
  document.getElementById('q-total-badge').textContent =`${meta.total||rows.length} questions`;
  document.getElementById('q-easy-badge').textContent  =`Easy: ${meta.easy_count??e}`;
  document.getElementById('q-medium-badge').textContent=`Medium: ${meta.medium_count??m}`;
  document.getElementById('q-hard-badge').textContent  =`Hard: ${meta.hard_count??h}`;
}

function renderPagination(hasMore) {
  const el=document.getElementById('q-pagination');
  el.innerHTML=`<div class="flex gap-2 items-center justify-center mt-6">
    <button class="btn btn-outline btn-sm" ${page<=1?'disabled':''} id="q-prev">← Prev</button>
    <span class="t-muted t-sm">Page ${page}</span>
    <button class="btn btn-outline btn-sm" ${!hasMore?'disabled':''} id="q-next">Next →</button>
  </div>`;
  document.getElementById('q-prev')?.addEventListener('click',()=>{page--;loadQuestions();});
  document.getElementById('q-next')?.addEventListener('click',()=>{page++;loadQuestions();});
}

const applyFilters=debounce(()=>{filters={search:document.getElementById('q-search').value.trim(),difficulty:document.getElementById('q-diff').value,tag:document.getElementById('q-tag').value.trim()};page=1;loadQuestions();},350);
document.getElementById('q-search').addEventListener('input',applyFilters);
document.getElementById('q-diff').addEventListener('change',applyFilters);
document.getElementById('q-tag').addEventListener('input',applyFilters);

document.getElementById('add-q-btn')?.addEventListener('click',()=>{editingId=null;document.getElementById('q-modal-title').textContent='Add Question';document.getElementById('q-submit-btn').textContent='Add Question';document.getElementById('q-form').reset();openModal('q-modal');});

window.editQuestion=(id,q)=>{editingId=id;document.getElementById('q-modal-title').textContent='Edit Question';document.getElementById('q-submit-btn').textContent='Save Changes';document.getElementById('q-title').value=q.title||'';document.getElementById('q-difficulty').value=q.difficulty||'';document.getElementById('q-tags').value=(q.tags||[]).join(', ');document.getElementById('q-link').value=q.platform_link||'';openModal('q-modal');};
window.deleteQuestion=async(id)=>{if(!confirm('Delete this question?'))return;try{await questionsApi.delete(id);toast('Question deleted','success');loadQuestions();}catch(ex){toast(ex.message||'Delete failed','error');}};

document.getElementById('q-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=document.getElementById('q-submit-btn'); setLoading(btn,true);
  const body={title:document.getElementById('q-title').value.trim(),difficulty:document.getElementById('q-difficulty').value,tags:document.getElementById('q-tags').value.split(',').map(t=>t.trim()).filter(Boolean),platform_link:document.getElementById('q-link').value.trim()||undefined};
  try{if(editingId)await questionsApi.update(editingId,body);else await questionsApi.create(body);toast(editingId?'Question updated!':'Question added!','success');closeModal('q-modal');loadQuestions();}
  catch(ex){toast(ex.message||'Failed to save','error');setLoading(btn,false,editingId?'Save Changes':'Add Question');}
});

loadQuestions();
