/**
 * Punto de entrada del cuadro de mando.
 * Registra las vistas, conecta la interfaz y arranca la sincronización con Supabase.
 */
import { load, save, setDB, DB } from './state.js';
import { seed } from './seed.js';
import { $, $$, initUI, MOB, toast, closeModal } from './ui.js';
import { registrarVista, nav, render, vistaActual } from './router.js';
import { drawArrows } from './views/mapa.js';

import * as vDashboard from './views/dashboard.js';
import * as vTablero from './views/tablero.js';
import * as vMapa from './views/mapa.js';
import * as vAnalisis from './views/analisis.js';
import * as vCaptura from './views/captura.js';
import * as vIndicadores from './views/indicadores.js';
import * as vDatos from './views/datos.js';
import * as vConfig from './views/config.js';
import * as vUsuarios from './views/usuarios.js';
import * as cloud from './cloud.js';
import * as permisos from './permisos.js';

/* ---------- registro de vistas ---------- */
registrarVista('dashboard', {
  titulo: 'Cuadro de Mando',
  sub: () => DB.empresa + ' · ' + new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
  render: vDashboard.renderDashboard,
});
registrarVista('tablero', {
  titulo: 'Tableros Visuales',
  sub: () => 'Un gráfico por indicador, en escala de color según su desempeño',
  render: vTablero.renderTablero,
});
registrarVista('mapa', {
  titulo: 'Mapa Estratégico',
  sub: () => 'Relaciones causa-efecto entre objetivos (Kaplan & Norton)',
  render: vMapa.renderMapa,
});
registrarVista('analisis', {
  titulo: 'Análisis de Indicadores',
  sub: () => 'Tendencias, cumplimiento e historial',
  render: vAnalisis.renderAnalisis,
});
registrarVista('captura', {
  titulo: 'Captura de Datos',
  sub: () => 'Alimenta los indicadores por periodo y responsable',
  render: vCaptura.renderCaptura,
});
registrarVista('indicadores', {
  titulo: 'Gestión de Indicadores',
  sub: () => 'Agrega, modifica o elimina KPIs, metas y responsables',
  render: vIndicadores.renderIndicadores,
});
registrarVista('datos', {
  titulo: 'Importar / Exportar',
  sub: () => 'Archivos planos (CSV), respaldos y plantillas',
  render: vDatos.renderDatos,
});
registrarVista('config', {
  titulo: 'Configuración',
  sub: () => 'Empresa, perspectivas, objetivos, responsables y nube',
  render: vConfig.renderConfig,
});
registrarVista('usuarios', {
  titulo: 'Usuarios y Permisos',
  sub: () => 'Cuentas, roles y qué puede ver o capturar cada quién',
  render: vUsuarios.renderUsuarios,
});

/**
 * Los manejadores escritos en el HTML (onclick="…") se ejecutan en el ámbito global,
 * así que las funciones que invocan se publican aquí.
 */
Object.assign(window, {
  nav, render, closeModal, toast, save, setDB, seed,
  ...vDashboard, ...vTablero, ...vMapa, ...vAnalisis,
  ...vCaptura, ...vIndicadores, ...vDatos, ...vConfig, ...vUsuarios, ...cloud,
});
// DB se reasigna al cargar o al descargar de la nube: se publica como lectura viva.
Object.defineProperty(window, 'DB', { get: () => DB, configurable: true });

/* ---------- redibujado al cambiar el tamaño o girar el dispositivo ---------- */
let _mob = null, _rzT = null;
window.addEventListener('resize', () => {
  clearTimeout(_rzT);
  _rzT = setTimeout(() => {
    const m = MOB();
    if (_mob !== null && m !== _mob) { _mob = m; render(); return; }
    _mob = m;
    if (vistaActual() === 'mapa') drawArrows();
  }, 180);
});
window.addEventListener('orientationchange', () => {
  setTimeout(() => { _mob = MOB(); render(); }, 260);
});

/* ---------- arranque ---------- */
export function iniciar() {
  initUI();
  load();
  $$('.nav-item').forEach((b) => (b.onclick = () => nav(b.dataset.view)));
  nav('dashboard');
  permisos.aplicarPermisos();
  cloud.initCloud();
}
