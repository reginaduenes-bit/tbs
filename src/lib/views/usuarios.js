import { supabase, SB } from '../cloud.js';
import { esAdmin, ROL_LABEL, VISTA_LABEL, VISTAS_POR_ROL, VISTAS_TODAS, miPerfil } from '../permisos.js';
import { DB } from '../state.js';
import { $, esc, openModal, closeModal, toast } from '../ui.js';
import { user } from '../model.js';

let _perfiles = [];

function vacio(msg) { return `<div class="empty"><div class="big">👤</div>${msg}</div>`; }

/* ================= USUARIOS Y PERMISOS ================= */
export async function renderUsuarios(c) {
  if (!SB.configurado()) { c.innerHTML = vacio('Este módulo requiere conexión con Supabase. Configura el archivo <b>.env</b> del proyecto.'); return; }
  if (!esAdmin()) { c.innerHTML = vacio('Solo un administrador puede ver esta sección.'); return; }
  c.innerHTML = vacio('Cargando…');
  const { data, error } = await supabase.from('bsc_perfiles').select('*').order('email');
  if (error) { c.innerHTML = vacio('⚠ ' + esc(error.message)); return; }
  _perfiles = data || [];
  pintar(c);
}

function pintar(c) {
  c.innerHTML = `<div class="card" style="padding:22px">
    <div class="section-head"><h3>👤 Usuarios y permisos</h3><button class="btn sm primary" onclick="invitarUsuario()">+ Invitar</button></div>
    <p class="help" style="margin-bottom:14px">Cada persona crea su cuenta (correo + contraseña) desde la pantalla de inicio con <b>“Crear cuenta”</b>; entra con rol <b>Lector</b>. Aquí ajustas su rol y permisos. También puedes pre-registrar un correo con <b>“+ Invitar”</b>: al iniciar sesión por primera vez, esa cuenta queda vinculada automáticamente con el rol que le hayas asignado.</p>
    ${!_perfiles.length ? vacio('Aún no hay usuarios registrados.') : `<table class="tbl"><tbody>${_perfiles.map(fila).join('')}</tbody></table>`}
  </div>`;
}

function fila(p) {
  const resp = p.usuario_id ? user(p.usuario_id) : null;
  const esYo = miPerfil && miPerfil.email === p.email;
  return `<tr>
    <td><b>${esc(p.nombre || p.email)}</b>${esYo ? ' <span class="chip gray" style="font-size:9px">tú</span>' : ''}<div class="muted" style="font-size:11px">${esc(p.email)}</div></td>
    <td>${p.id ? '<span class="chip green">● vinculado</span>' : '<span class="chip yellow">sin iniciar sesión</span>'}${p.activo === false ? ' <span class="chip gray">inactivo</span>' : ''}</td>
    <td>${esc(ROL_LABEL[p.rol] || p.rol)}</td>
    <td>${resp ? esc(resp.nombre) : '<span class="muted">—</span>'}</td>
    <td style="text-align:right;white-space:nowrap"><button class="btn sm" onclick="editarPerfil('${esc(p.email)}')">Editar</button> <button class="btn sm danger" onclick="eliminarPerfil('${esc(p.email)}')">✕</button></td>
  </tr>`;
}

function checksVistas(vistasActuales) {
  return VISTAS_TODAS.map((v) => `<label style="display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--text2);margin-bottom:6px">
    <input type="checkbox" class="v-vista" value="${v}" style="width:auto" ${vistasActuales.includes(v) ? 'checked' : ''}> ${VISTA_LABEL[v]}
  </label>`).join('');
}

export function invitarUsuario() { abrirModal(null); }
export function editarPerfil(email) { abrirModal(_perfiles.find((p) => p.email === email) || null); }

function abrirModal(p) {
  const rol = p ? p.rol : 'lector';
  const vistasIniciales = p && p.vistas && p.vistas.length ? p.vistas : VISTAS_POR_ROL[rol];
  openModal(`<div class="mhead"><h3>${p ? 'Editar usuario' : 'Invitar usuario'}</h3><button class="close-x" onclick="closeModal()">✕</button></div>
  <div class="mbody">
    <div class="frow f1"><div class="fitem"><label>Correo${p ? '' : ' (será su usuario para entrar)'}</label>
      <input id="v-email" type="email" placeholder="persona@empresa.com" value="${p ? esc(p.email) : ''}" ${p ? 'disabled' : ''}></div></div>
    ${p ? '' : `<div class="frow f1"><div class="fitem"><label>Contraseña (mínimo 6 caracteres)</label>
      <input id="v-pass" type="password" autocomplete="new-password" placeholder="••••••••">
      <p class="help" style="margin-top:5px">Se crea la cuenta en Supabase con esta contraseña. Déjala vacía solo si quieres pre-registrar el correo y que la persona cree su propia contraseña después.</p></div></div>`}
    <div class="frow" style="grid-template-columns:2fr 1fr">
      <div class="fitem"><label>Nombre</label><input id="v-nombre" value="${p ? esc(p.nombre || '') : ''}" placeholder="Nombre visible"></div>
      <div class="fitem"><label>Rol</label><select id="v-rol" onchange="cambiarRolModal(this.value)">
        <option value="admin" ${rol === 'admin' ? 'selected' : ''}>Administrador</option>
        <option value="capturista" ${rol === 'capturista' ? 'selected' : ''}>Capturista</option>
        <option value="lector" ${rol === 'lector' ? 'selected' : ''}>Lector</option>
      </select></div>
    </div>
    <div class="frow f1" id="v-resp-wrap" style="${rol === 'capturista' ? '' : 'display:none'}">
      <div class="fitem"><label>Responsable vinculado (limita qué puede capturar)</label>
        <select id="v-resp"><option value="">— Sin vincular —</option>
        ${DB.usuarios.map((u) => `<option value="${u.id}" ${p && p.usuario_id === u.id ? 'selected' : ''}>${esc(u.nombre)}</option>`).join('')}
        </select></div>
    </div>
    <div class="frow f1"><div class="fitem">
      <label style="display:flex;align-items:center;gap:9px;cursor:pointer"><input type="checkbox" id="v-activo" style="width:auto" ${!p || p.activo !== false ? 'checked' : ''}> Cuenta activa</label>
    </div></div>
    <div class="fitem"><label>Vistas visibles en el menú (por defecto según el rol; puedes ajustarlas)</label>
      <div id="v-vistas" style="border:1px solid var(--border);border-radius:10px;padding:10px 12px">${checksVistas(vistasIniciales)}</div>
    </div>
  </div>
  <div class="mfoot"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="guardarPerfil(${p ? `'${esc(p.email)}'` : 'null'})">Guardar</button></div>`);
}

export function cambiarRolModal(rol) {
  const wrap = $('#v-resp-wrap');
  if (wrap) wrap.style.display = rol === 'capturista' ? '' : 'none';
  const cont = $('#v-vistas');
  if (cont) cont.innerHTML = checksVistas(VISTAS_POR_ROL[rol] || VISTAS_POR_ROL.lector);
}

export async function guardarPerfil(emailOriginal) {
  const email = (($('#v-email') || {}).value || emailOriginal || '').trim().toLowerCase();
  if (!email) return toast('⚠ Escribe el correo');
  const nombre = $('#v-nombre').value.trim();
  const rol = $('#v-rol').value;
  const respSel = $('#v-resp');
  const usuario_id = respSel && respSel.value ? respSel.value : null;
  const activo = $('#v-activo').checked;
  const marcadas = [...document.querySelectorAll('.v-vista:checked')].map((i) => i.value);
  const vistas = marcadas.length === (VISTAS_POR_ROL[rol] || []).length && marcadas.every((v) => VISTAS_POR_ROL[rol].includes(v)) ? [] : marcadas;

  // Al crear un usuario nuevo con contraseña, se da de alta la cuenta en
  // Supabase Auth (sin cerrar la sesión del admin). Al editar no aplica.
  let avisoAlta = '';
  if (!emailOriginal) {
    const pass = (($('#v-pass') || {}).value || '');
    if (pass) {
      if (pass.length < 6) return toast('⚠ La contraseña debe tener al menos 6 caracteres');
      try {
        const { sesion } = await SB.crearUsuario(email, pass);
        avisoAlta = sesion ? ' · cuenta creada' : ' · falta que confirme su correo';
      } catch (e) {
        if (/already registered|already exists/i.test(e.message)) {
          avisoAlta = ' · ya tenía cuenta (se conservó su contraseña)';
        } else {
          return toast('⚠ ' + e.message);
        }
      }
    }
  }

  const fila = { email, nombre, rol, usuario_id, activo, vistas };
  const { error } = await supabase.from('bsc_perfiles').upsert(fila, { onConflict: 'email' });
  if (error) return toast('⚠ ' + error.message);
  closeModal();
  toast('✓ Usuario guardado' + avisoAlta);
  renderUsuarios($('#content'));
}

export async function eliminarPerfil(email) {
  if (!confirm('¿Quitar el acceso de ' + email + ' a la plataforma?\nEsto NO elimina su cuenta de Supabase Authentication, solo su rol y permisos aquí.')) return;
  const { error } = await supabase.from('bsc_perfiles').delete().eq('email', email);
  if (error) return toast('⚠ ' + error.message);
  toast('Usuario eliminado');
  renderUsuarios($('#content'));
}
