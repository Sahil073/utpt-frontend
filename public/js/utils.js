export function $(sel, ctx = document) { return ctx.querySelector(sel); }
export function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

export function show(el)  { if (el) el.style.display = ""; }
export function hide(el)  { if (el) el.style.display = "none"; }

export function toast(msg, type = "info", duration = 3500) {
  const id = "utpt-toast-container";
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement("div");
    container.id = id;
    container.style.cssText = "position:fixed;top:1.2rem;right:1.2rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;";
    document.body.appendChild(container);
  }

  const colors = { success:"#22c55e", error:"#ef4444", warning:"#f59e0b", info:"#3b82f6" };
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `background:${colors[type]||colors.info};color:#fff;padding:.75rem 1.25rem;border-radius:.5rem;font-size:.9rem;
    box-shadow:0 4px 14px rgba(0,0,0,.25);max-width:320px;word-break:break-word;animation:slideIn .25s ease;`;
  container.appendChild(t);
  setTimeout(() => { t.style.animation="slideOut .25s ease forwards"; setTimeout(()=>t.remove(), 250); }, duration);
}

// Inject keyframes once
if (!document.getElementById("utpt-toast-anim")) {
  const s = document.createElement("style");
  s.id = "utpt-toast-anim";
  s.textContent = `@keyframes slideIn{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:none}}
    @keyframes slideOut{to{opacity:0;transform:translateX(100%)}}`;
  document.head.appendChild(s);
}

export function setLoading(btn, loading = true) {
  if (!btn) return;
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Loading…";
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.origText || btn.textContent;
  }
}

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

export function avatar(url, name = "?", size = 40) {
  if (url) return `<img src="${url}" alt="${name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">`;
  const initials = (name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--primary);color:#fff;
    display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${size*0.38}px;">${initials}</div>`;
}

export function scoreBar(score, max = 1000) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  return `<div style="background:#e2e8f0;border-radius:4px;height:8px;width:100%;overflow:hidden;">
    <div style="background:var(--primary);height:100%;width:${pct}%;transition:width .4s;"></div></div>`;
}

export function buildTable(headers, rows, emptyMsg = "No data") {
  if (!rows.length) return `<p style="color:var(--muted);text-align:center;padding:2rem;">${emptyMsg}</p>`;
  const ths = headers.map(h=>`<th>${h}</th>`).join("");
  const trs = rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("");
  return `<table class="data-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

export function debounce(fn, ms=300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), ms); };
}

export function getRoleBadge(role) {
  const colors = { admin:"#7c3aed", trainer:"#0284c7", student:"#059669" };
  return `<span style="background:${colors[role]||"#6b7280"};color:#fff;padding:2px 8px;border-radius:9999px;font-size:.75rem;font-weight:600;">${role}</span>`;
}
