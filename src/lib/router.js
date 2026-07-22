/** Enrutador de vistas. Cada vista se registra desde app.js y se dibuja aquí. */
import { $, $$, MOB } from './ui.js';

const VISTAS = {};
let vista = 'dashboard';

export function registrarVista(id, def) { VISTAS[id] = def; }

/** Vista activa (sustituye a la antigua variable global currentView). */
export function vistaActual() { return vista; }

export function nav(id) {
  if (!VISTAS[id]) return;
  vista = id;
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === id));
  const t = $('#tb-title'), s = $('#tb-sub');
  if (t) t.textContent = VISTAS[id].titulo;
  if (s) s.textContent = typeof VISTAS[id].sub === 'function' ? VISTAS[id].sub() : VISTAS[id].sub || '';
  render();
  try {
    if (MOB()) window.scrollTo({ top: 0, behavior: 'smooth' });
    else $('#content').scrollTop = 0;
  } catch (e) {}
  const act = $('.nav-item.active');
  if (act && MOB() && act.scrollIntoView) act.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}

export function render() {
  const c = $('#content');
  if (!c || !VISTAS[vista]) return;
  const acciones = $('#tb-actions');
  if (acciones) acciones.innerHTML = '';
  VISTAS[vista].render(c);
}
