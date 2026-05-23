let _toastContainer;
function getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.getElementById('toast-container');
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'toast-container';
      document.body.appendChild(_toastContainer);
    }
  }
  return _toastContainer;
}

const ICONS = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
export function toast(msg, type = 'info', duration = 4000) {
  const c  = getToastContainer();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${ICONS[type] || 'ℹ'}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.classList.add('leaving'); el.addEventListener('animationend', () => el.remove()); }, duration);
}

export function openModal(id)  { const el = document.getElementById(id); if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; } }
export function closeModal(id) { const el = document.getElementById(id); if (el) { el.classList.remove('open'); document.body.style.overflow = ''; } }
export function initModals() {
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ov = btn.closest('.modal-overlay');
      if (ov) { ov.classList.remove('open'); document.body.style.overflow = ''; }
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) { ov.classList.remove('open'); document.body.style.overflow = ''; } });
  });
}

export function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
export function fmtRelative(d) {
  const diff = Date.now() - new Date(d);
  const min  = Math.floor(diff / 60000);
  if (min < 1)    return 'just now';
  if (min < 60)   return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min/60)}h ago`;
  return `${Math.floor(min/1440)}d ago`;
}

export function fmtNum(n)   { if (n == null) return '—'; if (n >= 1000) return (n/1000).toFixed(1)+'k'; return String(n); }
export function fmtScore(n) { if (n == null) return '0.00'; return Number(n).toFixed(2); }

export function getInitials(name) { if (!name) return '?'; return name.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase(); }
export function avatarColor(name) {
  const colors = ['#0071e3','#34c759','#ff9500','#ff3b30','#af52de','#5ac8fa'];
  let h = 0;
  for (const c of (name||'')) h = (h*31+c.charCodeAt(0)) % colors.length;
  return colors[h];
}
export function avatarHTML(user, size = 'md') {
  const name = user?.name || user?.username || '?';
  const col  = avatarColor(name);
  if (user?.avatar_url) return `<div class="avatar avatar-${size}" style="background:${col}"><img src="${user.avatar_url}" alt="${name}" loading="lazy"></div>`;
  return `<div class="avatar avatar-${size}" style="background:${col};color:#fff">${getInitials(name)}</div>`;
}

export function rankDisplay(r) {
  if (r === 1) return `<span class="rank-1">🥇 1</span>`;
  if (r === 2) return `<span class="rank-2">🥈 2</span>`;
  if (r === 3) return `<span class="rank-3">🥉 3</span>`;
  return `#${r}`;
}

export function diffBadge(d) {
  const map = { easy:'green', medium:'orange', hard:'red' };
  return `<span class="badge badge-${map[d]||'default'}">${d||'—'}</span>`;
}

export function debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

export function setLoading(btn, loading, label = btn?.dataset?.label) {
  if (!btn) return;
  if (loading) { btn.dataset.label = btn.textContent; btn.innerHTML = `<span class="spinner sm"></span> Loading…`; btn.disabled = true; }
  else { btn.textContent = label || 'Submit'; btn.disabled = false; }
}

export function initMobileSidebar() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) sidebar.classList.remove('mobile-open');
  });
}

export function renderBarChart(container, data, labelKey = 'date', valueKey = 'count', color = '#0071e3') {
  if (!container || !data?.length) return;
  const W = container.clientWidth || 400, H = 120;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const barW = Math.max(4, Math.floor((W-40)/data.length)-2);
  const last  = Math.min(data.length, Math.floor((W-40)/(barW+2)));
  const slice = data.slice(-last);
  const xStep = (W-40)/last;
  const bars  = slice.map((d,i) => {
    const h = Math.max(3, Math.round((d[valueKey]/max)*(H-30)));
    const x = 20 + i*xStep + (xStep-barW)/2;
    const y = H-20-h;
    return `<rect class="bar" x="${x.toFixed(1)}" y="${y}" width="${barW}" height="${h}" rx="3" title="${d[labelKey]}: ${d[valueKey]}"/>`;
  }).join('');
  container.innerHTML = `<svg class="bar-chart" viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">${bars}<line x1="20" y1="${H-20}" x2="${W-20}" y2="${H-20}" stroke="var(--border)" stroke-width="1"/></svg>`;
}

export function renderHeatmap(container, logs) {
  if (!container) return;
  const map = {};
  (logs||[]).forEach(l => { map[l.date] = l.count; });
  const today = new Date();
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    const v   = map[key] || 0;
    const lvl = v === 0 ? '' : v<=1 ? 'l1' : v<=3 ? 'l2' : v<=6 ? 'l3' : 'l4';
    cells.push(`<div class="heatmap-cell ${lvl}" title="${key}: ${v} solve${v!==1?'s':''}"></div>`);
  }
  container.innerHTML = cells.join('');
}
