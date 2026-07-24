/**
 * Conexión con Supabase.
 * Las credenciales vienen del archivo .env (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY)
 * y Astro las inyecta al compilar. No hay nada que configurar en el código.
 */
import { createClient } from '@supabase/supabase-js';
import { DB, save, LS_KEY, alGuardar, setDB } from './state.js';
import { seed } from './seed.js';
import { $, esc, toast, openModal, closeModal } from './ui.js';
import { render, vistaActual } from './router.js';
import { setPerfil, limpiarPerfil, setDisponible, esAdmin } from './permisos.js';

export const SB_AUTO = 'bsc_sb_auto';
export const SB_LAST = 'bsc_sb_last';

const URL_SB = (import.meta.env.PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const KEY_SB = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '').trim();

/** Cliente oficial de Supabase. Es null si el .env está vacío (modo solo local). */
export const supabase =
  URL_SB && KEY_SB
    ? createClient(URL_SB, KEY_SB, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'bsc-auth' },
      })
    : null;

setDisponible(!!supabase);

/** Usuario con sesión iniciada (enlace vivo para las vistas). */
export let sbUser = null;

/** Enlaza (o crea) la fila de bsc_perfiles del usuario y la publica en permisos.js. */
async function vincularPerfil() {
  try {
    const { data, error } = await supabase.rpc('bsc_vincular_perfil');
    if (error) throw error;
    setPerfil(Array.isArray(data) ? data[0] : data);
  } catch (e) {
    console.error('No se pudo cargar el perfil de permisos:', e.message || e);
    limpiarPerfil();
  }
}

let sbBusy = false, _pushT = null;

const TABLAS = ['bsc_empresa', 'bsc_perspectivas', 'bsc_usuarios', 'bsc_objetivos', 'bsc_relaciones', 'bsc_indicadores', 'bsc_mediciones'];

/* ============================================================
   Mapeo entre el modelo local y las tablas de la base de datos
   ============================================================ */
function filas(tabla) {
  switch (tabla) {
    case 'bsc_empresa':
      return [{ id: 1, nombre: DB.empresa }];
    case 'bsc_perspectivas':
      return DB.perspectivas.map((p) => ({ id: p.id, nombre: p.nombre, color: p.color, icono: p.icono, orden: p.orden, descripcion: p.desc || '' }));
    case 'bsc_usuarios':
      return DB.usuarios.map((u) => ({ id: u.id, nombre: u.nombre, iniciales: u.ini }));
    case 'bsc_objetivos':
      return DB.objetivos.map((o) => ({ id: o.id, perspectiva_id: o.pid, nombre: o.nombre }));
    case 'bsc_relaciones':
      return DB.relaciones.map((r) => ({ id: r.de + '|' + r.a, causa_id: r.de, efecto_id: r.a }));
    case 'bsc_indicadores':
      return DB.indicadores.map((i) => ({
        id: i.id, nombre: i.nombre, perspectiva_id: i.pid, objetivo_id: i.oid || null, responsable_id: i.resp || null,
        unidad: i.unidad || '', direccion: i.dir, meta: i.meta, frecuencia: i.frec, visualizacion: i.viz || 'auto',
        peso: i.peso || 1, umbral_verde: i.verde, umbral_amarillo: i.amarillo, descripcion: i.desc || '', activo: i.activo !== false,
      }));
    case 'bsc_mediciones': {
      const out = [];
      Object.keys(DB.mediciones || {}).forEach((iid) =>
        (DB.mediciones[iid] || []).forEach((m) => {
          out.push({ id: iid + '|' + m.periodo, indicador_id: iid, periodo: m.periodo, valor: m.valor, capturo: m.quien || null, nota: m.nota || '', fecha: m.fecha || new Date().toISOString() });
        })
      );
      return out;
    }
  }
  return [];
}

function aplicar(datos) {
  if (datos.bsc_empresa && datos.bsc_empresa.length) DB.empresa = datos.bsc_empresa[0].nombre || DB.empresa;
  if (datos.bsc_perspectivas && datos.bsc_perspectivas.length)
    DB.perspectivas = datos.bsc_perspectivas.map((r) => ({ id: r.id, nombre: r.nombre, color: r.color, icono: r.icono, orden: r.orden, desc: r.descripcion || '' }));
  if (datos.bsc_usuarios) DB.usuarios = datos.bsc_usuarios.map((r) => ({ id: r.id, nombre: r.nombre, ini: r.iniciales || '' }));
  if (datos.bsc_objetivos) DB.objetivos = datos.bsc_objetivos.map((r) => ({ id: r.id, pid: r.perspectiva_id, nombre: r.nombre }));
  if (datos.bsc_relaciones) DB.relaciones = datos.bsc_relaciones.map((r) => ({ de: r.causa_id, a: r.efecto_id }));
  if (datos.bsc_indicadores)
    DB.indicadores = datos.bsc_indicadores.map((r) => ({
      id: r.id, nombre: r.nombre, pid: r.perspectiva_id, oid: r.objetivo_id, resp: r.responsable_id, unidad: r.unidad || '',
      dir: r.direccion, meta: r.meta == null ? null : Number(r.meta), frec: r.frecuencia, viz: r.visualizacion || 'auto',
      peso: Number(r.peso) || 1, verde: Number(r.umbral_verde) || 95, amarillo: Number(r.umbral_amarillo) || 80,
      desc: r.descripcion || '', activo: r.activo !== false,
    }));
  if (datos.bsc_mediciones) {
    const m = {};
    datos.bsc_mediciones.forEach((r) => {
      if (!m[r.indicador_id]) m[r.indicador_id] = [];
      m[r.indicador_id].push({ periodo: r.periodo, valor: Number(r.valor), quien: r.capturo, nota: r.nota || '', fecha: r.fecha });
    });
    DB.mediciones = m;
  }
  DB._del = [];
}

/* ============================================================
   API pública (misma superficie que la versión anterior)
   ============================================================ */
export const SB = {
  configurado() { return !!supabase; },
  listo() { return !!(supabase && sbUser); },
  cfg() { return { url: URL_SB, key: KEY_SB, fuente: URL_SB ? '.env' : null }; },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    sbUser = { email: data.user.email, id: data.user.id };
    await vincularPerfil();
    return sbUser;
  },

  /**
   * Crea una cuenta nueva en Supabase Authentication (correo + contraseña).
   * Devuelve { sesion: true } si el proyecto no exige confirmar el correo
   * (la sesión queda iniciada al momento) o { sesion: false } si Supabase
   * envió un correo de confirmación y hay que abrir el enlace antes de entrar.
   */
  async registrar(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    // Con confirmación de correo desactivada, signUp devuelve sesión al instante.
    if (data.session && data.user) {
      sbUser = { email: data.user.email, id: data.user.id };
      await vincularPerfil();
      return { sesion: true };
    }
    return { sesion: false };
  },

  async logout() {
    try { await supabase.auth.signOut(); } catch (e) {}
    sbUser = null;
    limpiarPerfil();
    actualizarChip();
    mostrarGate('login');   // vuelve a bloquear: sin sesión no se ve nada
    toast('Sesión cerrada');
  },

  async restaurarSesion() {
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    if (data && data.session && data.session.user) {
      sbUser = { email: data.session.user.email, id: data.session.user.id };
      await vincularPerfil();
      return true;
    }
    return false;
  },

  /** Descarga todo desde la nube y reemplaza la copia local. */
  async pull() {
    if (!supabase) throw new Error('Supabase no está configurado.');
    const datos = {};
    let total = 0;
    for (const t of TABLAS) {
      const { data, error } = await supabase.from(t).select('*');
      if (error) throw new Error(t + ': ' + error.message);
      datos[t] = data || [];
      total += datos[t].length;
    }
    aplicar(datos);
    save();
    localStorage.setItem(SB_LAST, new Date().toISOString());
    return total;
  },

  /** Envía la copia local a la nube (inserta o actualiza) y aplica las eliminaciones pendientes. */
  async push() {
    if (!supabase) throw new Error('Supabase no está configurado.');
    for (const d of DB._del || []) {
      try { await supabase.from(d.t).delete().eq('id', d.id); } catch (e) {}
    }
    DB._del = [];
    let n = 0;
    for (const t of TABLAS) {
      const rows = filas(t);
      for (let k = 0; k < rows.length; k += 400) {
        const lote = rows.slice(k, k + 400);
        if (!lote.length) continue;
        const { error } = await supabase.from(t).upsert(lote, { onConflict: 'id' });
        if (error) throw new Error(t + ': ' + error.message);
        n += lote.length;
      }
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify(DB)); } catch (e) {}
    localStorage.setItem(SB_LAST, new Date().toISOString());
    return n;
  },

  /** ¿La base en la nube está vacía? (para sembrarla la primera vez) */
  async vacia() {
    const { data, error } = await supabase.from('bsc_indicadores').select('id').limit(1);
    if (error) throw new Error(error.message);
    return !data || data.length === 0;
  },
};

/* ---------- autosincronización ---------- */
export function sbAuto() { return localStorage.getItem(SB_AUTO) !== '0'; }
export function setAutoSync(v) {
  localStorage.setItem(SB_AUTO, v ? '1' : '0');
  toast(v ? '✓ Autosincronización activada' : 'Autosincronización desactivada');
}

function programarPush() {
  clearTimeout(_pushT);
  _pushT = setTimeout(async () => {
    if (!SB.listo() || sbBusy) return;
    sbBusy = true;
    actualizarChip('sync');
    try { await SB.push(); actualizarChip(); }
    catch (e) { actualizarChip('error'); }
    finally { sbBusy = false; }
  }, 2500);
}

export async function sincronizar(modo) {
  if (!SB.configurado()) return toast('⚠ Falta configurar el archivo .env con tus claves de Supabase');
  if (!sbUser) return loginModal();
  if (sbBusy) return toast('Sincronizando…');
  sbBusy = true;
  actualizarChip('sync');
  try {
    if (modo === 'pull') { const n = await SB.pull(); toast('✓ ' + n + ' registros descargados de la nube'); render(); }
    else { const n = await SB.push(); toast('✓ ' + n + ' registros guardados en la nube'); }
    actualizarChip();
  } catch (e) {
    actualizarChip('error');
    toast('⚠ ' + e.message);
  } finally {
    sbBusy = false;
    if (vistaActual() === 'config') render();
  }
}

export function cerrarSesion() { SB.logout().then(() => render()); }

/* ---------- indicador de estado en la barra superior ---------- */
export function actualizarChip(estado) {
  const el = $('#cloud');
  if (!el) return;
  // Botón de salir: visible siempre que haya sesión iniciada.
  const salir = '<button class="cchip out" onclick="cerrarSesion()" title="Cerrar sesión">⎋ Salir</button>';
  if (!SB.configurado()) { el.innerHTML = '<span class="cchip off" title="Sin .env configurado: los datos se guardan solo en este dispositivo">◍ Local</span>'; return; }
  if (!sbUser) { el.innerHTML = '<button class="cchip warn" onclick="loginModal()">⌁ Iniciar sesión</button>'; return; }
  if (estado === 'sync') { el.innerHTML = '<span class="cchip sync">⟳ Sincronizando…</span>' + salir; return; }
  if (estado === 'error') { el.innerHTML = '<button class="cchip err" onclick="sincronizar(\'push\')" title="Reintentar">⚠ Sin guardar</button>' + salir; return; }
  const last = localStorage.getItem(SB_LAST);
  const h = last ? new Date(last).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
  el.innerHTML = '<button class="cchip ok" onclick="nav(\'config\')" title="' + esc(sbUser.email) + '">☁ En la nube' + (h ? ' · ' + h : '') + '</button>' + salir;
}
export const updateCloudChip = actualizarChip;

/* ---------- acceso ---------- */
export function loginModal() {
  openModal(`<div class="mhead"><h3>Acceder a la nube</h3><button class="close-x" onclick="closeModal()">✕</button></div>
  <div class="mbody">
    ${!SB.configurado()
      ? `<p class="help" style="color:var(--red)">⚠ No hay credenciales. Abre el archivo <b>.env</b> del proyecto, pega tu <b>PUBLIC_SUPABASE_URL</b> y <b>PUBLIC_SUPABASE_ANON_KEY</b>, y vuelve a iniciar el proyecto.</p>`
      : `<p class="help" style="margin-bottom:14px">Proyecto: <b>${esc(URL_SB.replace(/^https?:\/\//, ''))}</b> <span class="chip gray">.env</span></p>
    <div class="frow f1"><div class="fitem"><label>Correo</label><input id="sb-mail" type="email" autocomplete="username" placeholder="tu@empresa.com"></div></div>
    <div class="frow f1"><div class="fitem"><label>Contraseña</label><input id="sb-pass" type="password" autocomplete="current-password" placeholder="••••••••" onkeydown="if(event.key==='Enter')hacerLogin()"></div></div>
    <p class="help">¿No tienes cuenta? <a href="#" onclick="registroModal();return false" style="color:var(--acc,#0284c7);font-weight:700">Crear una cuenta nueva</a>. Sin iniciar sesión puedes seguir trabajando: los datos se guardan en este dispositivo.</p>
    <div id="sb-msg"></div>`}
  </div>
  <div class="mfoot"><button class="btn" onclick="closeModal()">Trabajar sin conexión</button>
  ${SB.configurado() ? '<button class="btn primary" onclick="hacerLogin()">Entrar</button>' : ''}</div>`);
  setTimeout(() => { const m = $('#sb-mail'); if (m) m.focus(); }, 80);
}

/* ---------- crear cuenta (registro) ---------- */
export function registroModal() {
  if (!SB.configurado()) return loginModal();
  openModal(`<div class="mhead"><h3>Crear cuenta</h3><button class="close-x" onclick="closeModal()">✕</button></div>
  <div class="mbody">
    <p class="help" style="margin-bottom:14px">Proyecto: <b>${esc(URL_SB.replace(/^https?:\/\//, ''))}</b> <span class="chip gray">.env</span></p>
    <div class="frow f1"><div class="fitem"><label>Correo</label><input id="rg-mail" type="email" autocomplete="username" placeholder="tu@empresa.com"></div></div>
    <div class="frow f1"><div class="fitem"><label>Contraseña (mínimo 6 caracteres)</label><input id="rg-pass" type="password" autocomplete="new-password" placeholder="••••••••"></div></div>
    <div class="frow f1"><div class="fitem"><label>Repite la contraseña</label><input id="rg-pass2" type="password" autocomplete="new-password" placeholder="••••••••" onkeydown="if(event.key==='Enter')hacerRegistro()"></div></div>
    <p class="help">Tu cuenta se crea con rol <b>Lector</b> (solo lectura). Un administrador puede ampliar tus permisos después desde <b>Usuarios y Permisos</b>.</p>
    <div id="rg-msg"></div>
  </div>
  <div class="mfoot"><button class="btn" onclick="loginModal()">← Ya tengo cuenta</button><button class="btn primary" onclick="hacerRegistro()">Crear cuenta</button></div>`);
  setTimeout(() => { const m = $('#rg-mail'); if (m) m.focus(); }, 80);
}

export async function hacerRegistro() {
  const mail = (($('#rg-mail') || {}).value || '').trim();
  const pass = ($('#rg-pass') || {}).value || '';
  const pass2 = ($('#rg-pass2') || {}).value || '';
  const msg = $('#rg-msg');
  const err = (t) => { if (msg) msg.innerHTML = '<p class="help" style="color:var(--red)">⚠ ' + esc(t) + '</p>'; };
  if (!mail || !pass) return err('Captura tu correo y una contraseña.');
  if (pass.length < 6) return err('La contraseña debe tener al menos 6 caracteres.');
  if (pass !== pass2) return err('Las contraseñas no coinciden.');
  if (msg) msg.innerHTML = '<p class="help">Creando cuenta…</p>';
  try {
    const { sesion } = await SB.registrar(mail, pass);
    if (sesion) {
      closeModal();
      actualizarChip();
      toast('✓ Cuenta creada · sesión iniciada como ' + sbUser.email);
      await sincronizarInicio();
    } else {
      if (msg) msg.innerHTML = '<p class="help" style="color:var(--green)">✓ Cuenta creada. Revisa tu correo <b>' + esc(mail) + '</b> y abre el enlace de confirmación; después inicia sesión.</p>';
    }
  } catch (e) {
    const t = /already registered|already exists/i.test(e.message)
      ? 'Ese correo ya tiene una cuenta. Inicia sesión.'
      : e.message;
    err(t);
  }
}

export async function hacerLogin() {
  const mail = ($('#sb-mail') || {}).value, pass = ($('#sb-pass') || {}).value;
  if (!mail || !pass) return toast('⚠ Captura tu correo y contraseña');
  const msg = $('#sb-msg');
  if (msg) msg.innerHTML = '<p class="help">Conectando…</p>';
  try {
    await SB.login(mail.trim(), pass);
    closeModal();
    actualizarChip();
    toast('✓ Sesión iniciada como ' + sbUser.email);
    await sincronizarInicio();
  } catch (e) {
    const t = e.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : e.message;
    if (msg) msg.innerHTML = '<p class="help" style="color:var(--red)">⚠ ' + esc(t) + '</p>';
  }
}

/* ============================================================
   PORTÓN DE ACCESO (login obligatorio)
   Sin sesión iniciada no se ve nada del sistema: solo el login.
   ============================================================ */

/** Marca la app como accesible (oculta el portón). */
function entrarApp() { document.body.classList.add('autenticado'); }

/** Bloquea la app y muestra la pantalla de acceso en el modo indicado. */
export function mostrarGate(modo = 'login') {
  document.body.classList.remove('autenticado');
  const g = $('#gate');
  if (g) g.innerHTML = gateHTML(modo);
  setTimeout(() => { const m = $('#g-mail'); if (m) m.focus(); }, 60);
}

function gateHTML(modo) {
  const marca = `<div class="gate-brand"><span class="logo">◈</span><h1>BSC Integral</h1></div>
    <p class="gate-sub">Cuadro de Mando Integral · Kaplan &amp; Norton</p>`;

  if (!SB.configurado()) {
    return `<div class="gate-card">${marca}
      <h2>Sistema no conectado</h2>
      <p class="help" style="color:var(--red)">⚠ Falta configurar el archivo <b>.env</b> con tu <b>PUBLIC_SUPABASE_URL</b> y <b>PUBLIC_SUPABASE_ANON_KEY</b>. Sin conexión no es posible iniciar sesión.</p>
    </div>`;
  }

  if (modo === 'registro') {
    return `<div class="gate-card">${marca}
      <h2>Crear cuenta</h2>
      <div class="fitem"><label>Correo</label><input id="g-mail" type="email" autocomplete="username" placeholder="tu@empresa.com"></div>
      <div class="fitem"><label>Contraseña (mínimo 6 caracteres)</label><input id="g-pass" type="password" autocomplete="new-password" placeholder="••••••••"></div>
      <div class="fitem"><label>Repite la contraseña</label><input id="g-pass2" type="password" autocomplete="new-password" placeholder="••••••••" onkeydown="if(event.key==='Enter')gateRegistro()"></div>
      <button class="btn primary" onclick="gateRegistro()">Crear cuenta</button>
      <div id="g-msg"></div>
      <p class="gate-switch">¿Ya tienes cuenta? <a onclick="mostrarGate('login')">Inicia sesión</a></p>
    </div>`;
  }

  return `<div class="gate-card">${marca}
    <h2>Iniciar sesión</h2>
    <div class="fitem"><label>Correo</label><input id="g-mail" type="email" autocomplete="username" placeholder="tu@empresa.com"></div>
    <div class="fitem"><label>Contraseña</label><input id="g-pass" type="password" autocomplete="current-password" placeholder="••••••••" onkeydown="if(event.key==='Enter')gateLogin()"></div>
    <button class="btn primary" onclick="gateLogin()">Entrar</button>
    <div id="g-msg"></div>
    <p class="gate-switch">¿No tienes cuenta? <a onclick="mostrarGate('registro')">Crear una cuenta</a></p>
  </div>`;
}

export async function gateLogin() {
  const mail = (($('#g-mail') || {}).value || '').trim();
  const pass = ($('#g-pass') || {}).value || '';
  const msg = $('#g-msg');
  const err = (t) => { if (msg) msg.innerHTML = '<p class="help" style="color:var(--red)">⚠ ' + esc(t) + '</p>'; };
  if (!mail || !pass) return err('Captura tu correo y contraseña.');
  if (msg) msg.innerHTML = '<p class="help">Conectando…</p>';
  try {
    await SB.login(mail, pass);
    entrarApp();
    actualizarChip();
    toast('✓ Sesión iniciada como ' + sbUser.email);
    render();
    await sincronizarInicio();
  } catch (e) {
    err(e.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : e.message);
  }
}

export async function gateRegistro() {
  const mail = (($('#g-mail') || {}).value || '').trim();
  const pass = ($('#g-pass') || {}).value || '';
  const pass2 = ($('#g-pass2') || {}).value || '';
  const msg = $('#g-msg');
  const err = (t) => { if (msg) msg.innerHTML = '<p class="help" style="color:var(--red)">⚠ ' + esc(t) + '</p>'; };
  if (!mail || !pass) return err('Captura tu correo y una contraseña.');
  if (pass.length < 6) return err('La contraseña debe tener al menos 6 caracteres.');
  if (pass !== pass2) return err('Las contraseñas no coinciden.');
  if (msg) msg.innerHTML = '<p class="help">Creando cuenta…</p>';
  try {
    const { sesion } = await SB.registrar(mail, pass);
    if (sesion) {
      entrarApp();
      actualizarChip();
      toast('✓ Cuenta creada · sesión iniciada como ' + sbUser.email);
      render();
      await sincronizarInicio();
    } else if (msg) {
      msg.innerHTML = '<p class="help" style="color:var(--green)">✓ Cuenta creada. Revisa tu correo <b>' + esc(mail) + '</b>, abre el enlace de confirmación y luego inicia sesión.</p>';
    }
  } catch (e) {
    err(/already registered|already exists/i.test(e.message) ? 'Ese correo ya tiene una cuenta. Inicia sesión.' : e.message);
  }
}

/** Primera sincronización: si la nube está vacía, siembra; si no, descarga. */
async function sincronizarInicio() {
  try {
    if (await SB.vacia()) {
      // Sembrar la nube es una escritura masiva: solo un administrador puede hacerlo
      // (las reglas RLS bloquean la escritura a lectores/capturistas). Evitamos así
      // el error "row-level security policy" al conectar con una cuenta sin permisos.
      if (esAdmin()) {
        const n = await SB.push();
        toast('✓ Base creada en la nube con ' + n + ' registros');
      } else {
        toast('☁ Conectado. La base aún no tiene datos; un administrador debe cargarlos.');
      }
    } else {
      const n = await SB.pull();
      toast('☁ ' + n + ' registros descargados');
    }
    render();
    actualizarChip();
  } catch (e) {
    actualizarChip('error');
    toast('⚠ ' + e.message);
  }
}

export async function initCloud() {
  actualizarChip();
  alGuardar(() => { if (SB.listo() && sbAuto()) programarPush(); });
  mostrarGate('login');       // por defecto el sistema queda bloqueado
  if (!supabase) return;      // sin .env el portón muestra el aviso de "no conectado"
  if (await SB.restaurarSesion()) {
    entrarApp();              // había sesión guardada: se abre la app
    actualizarChip('sync');
    render();
    await sincronizarInicio();
  }
  // sin sesión: permanece en el portón de acceso
}
