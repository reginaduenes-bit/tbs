/**
 * Estado de la aplicación y persistencia local.
 * La copia local funciona como caché: permite trabajar sin conexión
 * y se sincroniza con Supabase cuando hay sesión iniciada.
 */
import { seed } from './seed.js';

export const LS_KEY = 'bsc_integral_v1';

/** Base de datos en memoria (enlace vivo: los módulos que la importan ven los cambios). */
export let DB = null;

/** Reemplaza la base completa (restaurar respaldo, restablecer, descargar de la nube). */
export function setDB(nueva) { DB = nueva; }

let _alGuardar = null;
/** La capa de nube registra aquí su autosincronización. */
export function alGuardar(fn) { _alGuardar = fn; }

export function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    DB = raw ? JSON.parse(raw) : seed();
  } catch (e) {
    DB = seed();
  }
  if (!DB._del) DB._del = [];
  save();
}

export function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(DB));
  } catch (e) {
    if (typeof window !== 'undefined' && window.__toast) window.__toast('⚠ No se pudo guardar (almacenamiento lleno)');
  }
  if (_alGuardar) _alGuardar();
}

export function uid(p) {
  return p + Math.random().toString(36).slice(2, 8);
}

/** Cola de eliminaciones pendientes de replicar en la nube. */
export function sbDel(tabla, id) {
  if (!DB._del) DB._del = [];
  DB._del.push({ t: tabla, id: String(id) });
}
