/** Utilidades de interfaz: selectores, escape, avisos, ventanas y adaptación a pantalla. */

export const $ = (s) => document.querySelector(s);
export const $$ = (s) => [...document.querySelectorAll(s)];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- avisos ---------- */
let toastT = null;
export function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- ventana modal ---------- */
export function openModal(html) {
  $('#modal').innerHTML = html;
  $('#modal-bg').classList.add('open');
}
export function closeModal() {
  $('#modal-bg').classList.remove('open');
}

/* ---------- adaptación a pantalla ---------- */
export function MOB() {
  try {
    return window.matchMedia('(max-width:760px)').matches;
  } catch (e) {
    return false;
  }
}
export function chartW() { return MOB() ? 390 : 470; }
export function chartH() { return MOB() ? 245 : 250; }
export function maxPts(n) { return MOB() ? Math.min(n, 5) : n; }

/** Listeners globales. Se llama una sola vez desde app.js. */
export function initUI() {
  document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-bg') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  window.__toast = toast;
}
