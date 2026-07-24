/**
 * Roles y restricciones de vista/captura.
 * cloud.js llama a setPerfil()/limpiarPerfil() al iniciar/cerrar sesión;
 * el resto de la app solo lee vistasPermitidas()/esAdmin()/esCapturista().
 */
import { $$ } from './ui.js';
import { nav, vistaActual } from './router.js';

export const VISTAS_TODAS = ['dashboard', 'tablero', 'mapa', 'analisis', 'captura', 'indicadores', 'datos', 'config', 'usuarios'];

export const VISTA_LABEL = {
  dashboard: 'Cuadro de Mando', tablero: 'Tableros Visuales', mapa: 'Mapa Estratégico', analisis: 'Análisis',
  captura: 'Captura de Datos', indicadores: 'Indicadores', datos: 'Importar / Exportar', config: 'Configuración',
  usuarios: 'Usuarios y Permisos',
};

export const VISTAS_POR_ROL = {
  admin: VISTAS_TODAS,
  capturista: ['dashboard', 'tablero', 'captura'],
  lector: ['dashboard', 'tablero', 'mapa', 'analisis'],
};

export const ROL_LABEL = { admin: 'Administrador', capturista: 'Capturista', lector: 'Lector' };

/** Fila de bsc_perfiles del usuario con sesión iniciada, o null si no aplica. */
export let miPerfil = null;
let sbDisponible = false;

export function setDisponible(v) { sbDisponible = v; aplicarPermisos(); }
export function setPerfil(p) { miPerfil = p; aplicarPermisos(); }
export function limpiarPerfil() { miPerfil = null; aplicarPermisos(); }

export function esAdmin() { return !!miPerfil && miPerfil.rol === 'admin' && miPerfil.activo !== false; }
export function esCapturista() { return !!miPerfil && miPerfil.rol === 'capturista' && miPerfil.activo !== false; }

/** Vistas visibles en la barra lateral para el usuario actual. Nunca null: siempre hay un conjunto. */
export function vistasPermitidas() {
  // Sin nube configurada, o conectado pero sin sesión: se trabaja en local sin restricciones,
  // igual que hoy, pero "Usuarios y Permisos" no aplica sin cuenta iniciada.
  if (!sbDisponible || !miPerfil) return VISTAS_TODAS.filter((v) => v !== 'usuarios');
  if (miPerfil.activo === false) return ['dashboard'];
  if (miPerfil.vistas && miPerfil.vistas.length) return miPerfil.vistas;
  return VISTAS_POR_ROL[miPerfil.rol] || VISTAS_POR_ROL.lector;
}

export function puedeVer(id) { return vistasPermitidas().includes(id); }

/** Oculta en la barra lateral lo que el rol no permite y saca al usuario de una vista prohibida. */
export function aplicarPermisos() {
  const permitidas = vistasPermitidas();
  $$('.nav-item').forEach((b) => { b.style.display = permitidas.includes(b.dataset.view) ? '' : 'none'; });
  if (!permitidas.includes(vistaActual())) nav(permitidas[0] || 'dashboard');
}
