import { resources as resourcesApi } from '../api.js';
import { requireAuth, logout, getUser } from '../auth.js';
import { toast, fmtDate, openModal, closeModal, initModals, setLoading, getInitials, avatarColor, initMobileSidebar } from '../utils.js';

if (!requireAuth()) throw new Error('unauthenticated');
const user = getUser();
let page = 1;

(function() {
  const name=user?.name||'User';
  document.getElementById('sidebar-name').textContent=name;
  document.getElementById('sidebar-role').textContent=user?.role||'student';
  const av=document.getElementById('sidebar-avatar');
  av.textContent=getInitials(name); av.style.background=avatarColor(name); av.style.color='#fff';
})();

document.getElementById('logout-btn').addEventListener('click',()=>logout());
initMobileSidebar(); initModals();

const canManage=['admin','trainer'].includes(user?.role);
if (canManage) document.getElementById('upload-btn').style.display='inline-flex';

async function loadResources(params={}) {
  const grid=document.getElementById('resource-grid');
  grid.innerHTML=`<div class="page-loader"><div class="spinner"></div><span class="t-muted">Loading…</span></div>`;
  try {
    const all={page,...params};
    Object.keys(all).forEach(k=>!all[k]&&delete all[k]);
    const data=await resourcesApi.list(all);
    const rows=Array.isArray(data)?data:(data?.resources||data?.items||[]);
    if (!rows.length) {
      grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📂</div><div class="empty-title">No resources found</div><div class="empty-desc">Try different filters or check back later.</div></div>`;
      document.getElementById('r-pagination').innerHTML=''; return;
    }
    grid.innerHTML=rows.map(r=>`
      <div class="resource-card">
        <div class="flex items-center gap-3">
          <div class="resource-icon">📄</div>
          <div style="flex:1;overflow:hidden">
            <div style="font-weight:700;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${r.title}">${r.title}</div>
            <div class="t-muted t-xs" style="margin-top:3px">${r.subject||'—'} · Batch ${r.batch||'—'}</div>
          </div>
        </div>
        ${r.description?`<div class="t-muted t-sm">${r.description}</div>`:''}
        <div class="flex items-center justify-between mt-4">
          <div class="flex gap-2"><span class="badge badge-default">${r.batch||'—'}</span><span class="badge badge-blue">${r.subject||'—'}</span></div>
          <span class="t-muted t-xs">${r.created_at?fmtDate(r.created_at):''}</span>
        </div>
        <div class="flex gap-2 mt-4">
          ${r.file_url?`<a href="${r.file_url}" target="_blank" class="btn btn-outline btn-sm" style="flex:1;justify-content:center">📥 Download PDF</a>`:''}
          ${canManage?`<button class="btn btn-danger btn-sm" onclick="deleteResource('${r.id||r._id}')">Delete</button>`:''}
        </div>
      </div>`).join('');
    renderPagination(rows.length===20);
  } catch (ex) {
    toast(ex.message||'Failed to load resources','error');
    grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-desc">Failed to load resources</div></div>`;
  }
}

function renderPagination(hasMore) {
  const el=document.getElementById('r-pagination');
  el.innerHTML=`<div class="flex gap-2 items-center justify-center mt-6">
    <button class="btn btn-outline btn-sm" ${page<=1?'disabled':''} id="r-prev">← Prev</button>
    <span class="t-muted t-sm">Page ${page}</span>
    <button class="btn btn-outline btn-sm" ${!hasMore?'disabled':''} id="r-next">Next →</button>
  </div>`;
  document.getElementById('r-prev')?.addEventListener('click',()=>{page--;applyFilters();});
  document.getElementById('r-next')?.addEventListener('click',()=>{page++;applyFilters();});
}

function applyFilters(){loadResources({batch:document.getElementById('r-batch').value.trim(),subject:document.getElementById('r-subject').value.trim()});}
document.getElementById('r-filter-btn').addEventListener('click',()=>{page=1;applyFilters();});
document.getElementById('r-clear-btn').addEventListener('click',()=>{document.getElementById('r-batch').value='';document.getElementById('r-subject').value='';page=1;loadResources();});

document.getElementById('upload-btn')?.addEventListener('click',()=>openModal('upload-modal'));
document.getElementById('upload-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=document.getElementById('r-upload-btn'); setLoading(btn,true);
  const form=new FormData();
  form.append('title',document.getElementById('r-title').value.trim());
  form.append('description',document.getElementById('r-desc').value.trim());
  form.append('batch',document.getElementById('r-batch-field').value.trim());
  form.append('subject',document.getElementById('r-subject-field').value.trim());
  const file=document.getElementById('r-file').files[0];
  if (file) form.append('file',file);
  try{await resourcesApi.create(form);toast('Resource uploaded!','success');closeModal('upload-modal');document.getElementById('upload-form').reset();loadResources();}
  catch(ex){toast(ex.message||'Upload failed','error');setLoading(btn,false,'Upload');}
});

window.deleteResource=async(id)=>{if(!confirm('Delete this resource?'))return;try{await resourcesApi.delete(id);toast('Resource deleted','success');loadResources();}catch(ex){toast(ex.message||'Delete failed','error');}};
loadResources();
