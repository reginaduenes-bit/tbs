import { SB, SB_LAST, cerrarSesion, loginModal, sbAuto, sbUser, setAutoSync, sincronizar } from '../cloud.js';
import { user } from '../model.js';
import { nav, render } from '../router.js';
import { seed } from '../seed.js';
import { DB, save, sbDel, setDB, uid } from '../state.js';
import { $, closeModal, esc, openModal, toast } from '../ui.js';
import { capturar } from './captura.js';

/* ================= CONFIGURACIÓN ================= */
export function renderConfig(c){
  c.innerHTML=`<div class="grid g2" style="align-items:start">
    <div>
      <div class="card" style="padding:22px;margin-bottom:16px">
        <div class="section-head"><h3>🏢 Empresa</h3></div>
        <div class="fitem"><label>Nombre (aparece en el cuadro de mando)</label>
        <input style="width:100%" value="${esc(DB.empresa)}" onchange="setEmpresa(this.value)"></div>
      </div>
      <div class="card" style="padding:22px;margin-bottom:16px">
        <div class="section-head"><h3>☁ Conexión con Supabase</h3>${SB.configurado()?(sbUser?'<span class="chip green">● Conectada</span>':'<span class="chip yellow">● Sin sesión</span>'):'<span class="chip gray">● Solo local</span>'}</div>
        ${!SB.configurado()?`<p class="help" style="margin-bottom:12px">Ahora mismo los datos se guardan solo en este dispositivo. Para trabajar en equipo, abre el archivo <b>.env</b> del proyecto, pega tus claves de Supabase (<b>PUBLIC_SUPABASE_URL</b> y <b>PUBLIC_SUPABASE_ANON_KEY</b>) y reinicia el servidor.</p>
        <p class="help">Consulta <b>README.md</b> para la guía completa.</p>`
        :`<table class="tbl" style="margin-bottom:14px"><tbody>
          <tr><td class="muted">Proyecto</td><td><b>${esc(SB.cfg().url.replace(/^https?:\/\//,''))}</b></td></tr>
          <tr><td class="muted">Credenciales</td><td>archivo <b>.env</b> del proyecto</td></tr>
          <tr><td class="muted">Sesión</td><td>${sbUser?'<b>'+esc(sbUser.email)+'</b>':'<span style="color:var(--yellow)">sin iniciar</span>'}</td></tr>
          <tr><td class="muted">Última sincronización</td><td>${localStorage.getItem(SB_LAST)?new Date(localStorage.getItem(SB_LAST)).toLocaleString('es-MX'):'—'}</td></tr>
          <tr><td class="muted">Cambios por subir</td><td>${(DB._del||[]).length?'<span class="chip yellow">'+DB._del.length+' eliminaciones pendientes</span>':'<span class="chip green">al día</span>'}</td></tr>
        </tbody></table>
        ${sbUser?`<div style="display:flex;gap:9px;flex-wrap:wrap">
          <button class="btn primary" onclick="sincronizar('push')">⬆ Subir a la nube</button>
          <button class="btn" onclick="sincronizar('pull')">⬇ Descargar de la nube</button>
          <button class="btn ghost" onclick="cerrarSesion()">Cerrar sesión</button></div>
        <label style="display:flex;align-items:center;gap:9px;margin-top:14px;font-size:12.5px;font-weight:600;color:var(--text2);cursor:pointer">
          <input type="checkbox" style="width:auto" ${sbAuto()?'checked':''} onchange="setAutoSync(this.checked)">
          Guardar en la nube automáticamente al capturar datos</label>`
        :`<button class="btn primary" onclick="loginModal()">Iniciar sesión</button>`}
        <p class="help" style="margin-top:12px">⬇ Descargar reemplaza tus datos locales con los de la nube. ⬆ Subir envía lo que tienes aquí. Sin sesión, la plataforma sigue funcionando en este dispositivo y sincroniza cuando vuelvas a entrar.</p>`}
      </div>
      <div class="card" style="padding:22px">
        <div class="section-head"><h3>👥 Responsables</h3><button class="btn sm primary" onclick="editUsuario(null)">+ Agregar</button></div>
        <table class="tbl"><tbody>
        ${DB.usuarios.map(u=>{
          const n=DB.indicadores.filter(i=>i.resp===u.id).length;
          return `<tr><td><span class="avatar" style="width:26px;height:26px;font-size:10px">${esc(u.ini)}</span></td>
          <td><b>${esc(u.nombre)}</b><div class="muted" style="font-size:11px">${n} indicador${n!==1?'es':''} a su cargo</div></td>
          <td style="text-align:right;white-space:nowrap"><button class="btn sm" onclick="editUsuario('${u.id}')">Editar</button> <button class="btn sm danger" onclick="delUsuario('${u.id}')">✕</button></td></tr>`;
        }).join('')}
        </tbody></table>
      </div>
    </div>
    <div>
      <div class="card" style="padding:22px;margin-bottom:16px">
        <div class="section-head"><h3>🧭 Perspectivas</h3></div>
        <p class="help" style="margin-bottom:10px">Las 4 perspectivas de Kaplan &amp; Norton. Puedes renombrarlas y cambiar su color.</p>
        ${DB.perspectivas.map(p=>`<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
          <input type="color" value="${p.color}" style="width:42px;height:36px;padding:3px" onchange="setPerspCampo('${p.id}','color',this.value)">
          <input style="flex:1" value="${esc(p.nombre)}" onchange="setPerspCampo('${p.id}','nombre',this.value)">
        </div>`).join('')}
      </div>
      <div class="card" style="padding:22px;border-color:#fecaca">
        <div class="section-head"><h3 style="color:var(--red)">⚠ Zona de riesgo</h3></div>
        <p class="help" style="margin-bottom:12px">Restablecer borra todos los datos y vuelve a la configuración inicial con los 35 indicadores precargados. Descarga un respaldo antes.</p>
        <button class="btn danger" onclick="resetAll()">Restablecer plataforma</button>
      </div>
    </div>
  </div>`;
}
export function editUsuario(uidv){
  const u=uidv?user(uidv):null;
  openModal(`<div class="mhead"><h3>${u?'Editar':'Nuevo'} responsable</h3><button class="close-x" onclick="closeModal()">✕</button></div>
  <div class="mbody"><div class="frow" style="grid-template-columns:2fr 1fr">
    <div class="fitem"><label>Nombre / puesto</label><input id="u-nombre" value="${u?esc(u.nombre):''}" placeholder="Ej. Gerente de Logística"></div>
    <div class="fitem"><label>Iniciales</label><input id="u-ini" maxlength="3" value="${u?esc(u.ini):''}" placeholder="GL"></div>
  </div></div>
  <div class="mfoot"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveUsuario(${u?`'${u.id}'`:'null'})">Guardar</button></div>`);
}
export function saveUsuario(uidv){
  const nombre=$('#u-nombre').value.trim();
  if(!nombre)return toast('⚠ Escribe el nombre');
  const ini=($('#u-ini').value.trim()||nombre.split(' ').map(w=>w[0]).join('').slice(0,2)).toUpperCase();
  if(uidv){const u=user(uidv);u.nombre=nombre;u.ini=ini;}
  else DB.usuarios.push({id:uid('u'),nombre,ini});
  save();closeModal();render();toast('✓ Responsable guardado');
}
export function delUsuario(uidv){
  const n=DB.indicadores.filter(i=>i.resp===uidv).length;
  if(!confirm('¿Eliminar este responsable?'+(n?` Sus ${n} indicadores quedarán sin asignar.`:'')))return;
  sbDel('bsc_usuarios',uidv);
  DB.usuarios=DB.usuarios.filter(u=>u.id!==uidv);
  DB.indicadores.forEach(i=>{if(i.resp===uidv)i.resp=null;});
  save();render();toast('Responsable eliminado');
}
export function resetAll(){
  if(!confirm('⚠ Esto borra TODOS los indicadores, mediciones y configuración. ¿Seguro?'))return;
  if(!confirm('Última confirmación: ¿restablecer la plataforma por completo?'))return;
  setDB(seed());save();nav('dashboard');toast('Plataforma restablecida');
}

/* ---------- ajustes rápidos desde la vista ---------- */
export function setEmpresa(v){ DB.empresa=v; save(); toast('✓ Guardado'); }
export function setPerspCampo(id,campo,valor){ const p=persp(id); if(p){ p[campo]=valor; save(); toast('✓ Guardado'); } }
