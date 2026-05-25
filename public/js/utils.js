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
    container.style.cssText = "position:fixed;top:1.25rem;right:1.25rem;z-index:99998;display:flex;flex-direction:column;gap:.5rem;pointer-events:none;";
    document.body.appendChild(container);
  }

  const configs = {
    success: { bg: "linear-gradient(135deg,#059669,#10b981)", icon: "✓", border: "rgba(16,185,129,.3)" },
    error:   { bg: "linear-gradient(135deg,#dc2626,#ef4444)", icon: "✕", border: "rgba(239,68,68,.3)" },
    warning: { bg: "linear-gradient(135deg,#d97706,#f59e0b)", icon: "⚠", border: "rgba(245,158,11,.3)" },
    info:    { bg: "linear-gradient(135deg,#7c3aed,#8b5cf6)", icon: "ℹ", border: "rgba(124,58,237,.3)" },
  };
  const c = configs[type] || configs.info;

  const t = document.createElement("div");
  t.style.cssText = `
    display:flex;align-items:flex-start;gap:.75rem;
    background:#fff;border:1px solid ${c.border};
    padding:.75rem 1rem;border-radius:.875rem;
    box-shadow:0 8px 32px rgba(0,0,0,.12);
    max-width:320px;word-break:break-word;
    pointer-events:all;
    animation:toastSlideIn .3s cubic-bezier(.34,1.56,.64,1) both;
    font-family:inherit;
  `;
  t.innerHTML = `
    <div style="width:22px;height:22px;border-radius:50%;background:${c.bg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0;margin-top:.0625rem;">${c.icon}</div>
    <div style="font-size:.875rem;color:#1a1025;font-weight:500;line-height:1.5;flex:1;">${msg}</div>
  `;
  container.appendChild(t);
  setTimeout(() => {
    t.style.animation = "toastSlideOut .25s ease forwards";
    setTimeout(() => t.remove(), 250);
  }, duration);
}

// Inject toast keyframes once
if (!document.getElementById("utpt-toast-anim")) {
  const s = document.createElement("style");
  s.id = "utpt-toast-anim";
  s.textContent = `
    @keyframes toastSlideIn{from{opacity:0;transform:translateX(calc(100% + 1.25rem))}to{opacity:1;transform:none}}
    @keyframes toastSlideOut{to{opacity:0;transform:translateX(calc(100% + 1.25rem))}}
    @keyframes fadeUpIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  `;
  document.head.appendChild(s);
}

export function setLoading(btn, loading = true) {
  if (!btn) return;
  if (loading) {
    btn.dataset.origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;"></span> Loading…`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.origText || btn.innerHTML;
  }
}

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

export function avatar(url, name = "?", size = 40) {
  if (url) return `<img src="${url}" alt="${name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
  const initials = (name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;
    display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:${size*0.36}px;flex-shrink:0;">${initials}</div>`;
}

export function scoreBar(score, max = 1000) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  return `<div style="background:#ede9fe;border-radius:9999px;height:7px;width:100%;overflow:hidden;">
    <div style="background:linear-gradient(90deg,#7c3aed,#a78bfa);height:100%;width:${pct}%;transition:width .6s cubic-bezier(.25,.46,.45,.94);border-radius:9999px;"></div></div>`;
}

export function buildTable(headers, rows, emptyMsg = "No data") {
  if (!rows.length) return `<div class="empty-state"><div class="empty-icon">📭</div><p>${emptyMsg}</p></div>`;
  const ths = headers.map(h=>`<th>${h}</th>`).join("");
  const trs = rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("");
  return `<table class="data-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

export function debounce(fn, ms=300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), ms); };
}

export function getRoleBadge(role) {
  const styles = {
    admin:   "background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;",
    trainer: "background:linear-gradient(135deg,#0284c7,#38bdf8);color:#fff;",
    student: "background:linear-gradient(135deg,#059669,#34d399);color:#fff;",
  };
  return `<span style="${styles[role]||"background:#6b7280;color:#fff;"}padding:2px 10px;border-radius:9999px;font-size:.72rem;font-weight:700;">${role}</span>`;
}
