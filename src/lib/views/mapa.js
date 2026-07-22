import { C } from '../charts.js';
import { obj, persp, statusOf } from '../model.js';
import { render } from '../router.js';
import { DB, save, sbDel, uid } from '../state.js';
import { $, closeModal, esc, openModal, toast } from '../ui.js';

/* ================= MAPA ESTRATÉGICO ================= */
export function renderMapa(c){
  $('#tb-actions').innerHTML=`<button class="btn" onclick="editRelaciones()">⇄ Relaciones</button> <button class="btn primary" onclick="editObjetivo(null)">+ Objetivo</button>`;
  const rows=DB.perspectivas.slice().sort((a,b)=>a.orden<b.orden?1:-1);
  let html='<div id="mapa-wrap"><svg id="map-svg"></svg>';
  rows.forEach(p=>{
    const objs=DB.objetivos.filter(o=>o.pid===p.id);
    html+=`<div class="map-row" style="background:${p.color}0d;border:1px solid ${p.color}26">
      <div class="rowlab" style="color:${p.color}">${esc(p.nombre)}</div>
      ${objs.map(o=>{
        const kn=DB.indicadores.filter(i=>i.activo&&i.oid===o.id);
        const lights=kn.map(i=>{const s=statusOf(i).st;return `<span class="dot ${s==='neutral'?'gray':s}" style="width:7px;height:7px"></span>`;}).join('');
        return `<div class="obj" data-oid="${o.id}" style="border-left:4px solid ${p.color}" onclick="editObjetivo('${o.id}')">
          <div class="oname">${esc(o.nombre)}</div>
          <div class="okpis">${kn.length} KPI${kn.length!==1?'s':''} ${lights}</div>
        </div>`;
      }).join('')||'<span class="muted" style="align-self:center;font-size:12px">Sin objetivos — usa “+ Objetivo”</span>'}
    </div>`;
  });
  html+='</div><p class="help" style="margin-top:10px">💡 Las flechas muestran relaciones causa-efecto: el aprendizaje impulsa los procesos, los procesos al cliente, y el cliente a las finanzas. Haz clic en un objetivo para editarlo.</p>';
  c.innerHTML=html;
  requestAnimationFrame(drawArrows);
}
export function drawArrows(){
  const svg=$('#map-svg'),wrap=$('#mapa-wrap');
  if(!svg||!wrap)return;
  const wr=wrap.getBoundingClientRect();
  svg.setAttribute('width',wr.width);svg.setAttribute('height',wr.height);
  let defs=`<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#64748b"/></marker></defs>`;
  let paths='';
  DB.relaciones.forEach(r=>{
    const a=wrap.querySelector(`[data-oid="${r.de}"]`),b=wrap.querySelector(`[data-oid="${r.a}"]`);
    if(!a||!b)return;
    const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
    const x1=ra.left-wr.left+ra.width/2, y1=ra.top-wr.top+(rb.top<ra.top?0:ra.height);
    const x2=rb.left-wr.left+rb.width/2, y2=rb.top-wr.top+(rb.top<ra.top?rb.height:0);
    const my=(y1+y2)/2;
    paths+=`<path d="M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}" fill="none" stroke="#64748b" stroke-width="1.6" stroke-dasharray="1 0" opacity=".5" marker-end="url(#arr)"/>`;
  });
  svg.innerHTML=defs+paths;
}

export function editObjetivo(oid){
  const o=oid?obj(oid):null;
  openModal(`<div class="mhead"><h3>${o?'Editar':'Nuevo'} objetivo estratégico</h3><button class="close-x" onclick="closeModal()">✕</button></div>
  <div class="mbody">
    <div class="frow f1"><div class="fitem"><label>Nombre del objetivo</label><input id="o-nombre" value="${o?esc(o.nombre):''}" placeholder="Ej. Reducir tiempos logísticos"></div></div>
    <div class="frow f1"><div class="fitem"><label>Perspectiva</label><select id="o-pid">${DB.perspectivas.map(p=>`<option value="${p.id}" ${o&&o.pid===p.id?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div></div>
    ${o?`<p class="help">KPIs vinculados: ${DB.indicadores.filter(i=>i.oid===o.id).map(i=>esc(i.nombre)).join(', ')||'ninguno'}</p>`:''}
  </div>
  <div class="mfoot">
    ${o?`<button class="btn danger" onclick="delObjetivo('${o.id}')">Eliminar</button><span style="flex:1"></span>`:''}
    <button class="btn" onclick="closeModal()">Cancelar</button>
    <button class="btn primary" onclick="saveObjetivo(${o?`'${o.id}'`:'null'})">Guardar</button>
  </div>`);
}
export function saveObjetivo(oid){
  const nombre=$('#o-nombre').value.trim(),pid=$('#o-pid').value;
  if(!nombre)return toast('⚠ Escribe el nombre del objetivo');
  if(oid){const o=obj(oid);o.nombre=nombre;o.pid=pid;}
  else DB.objetivos.push({id:uid('o'),pid,nombre});
  save();closeModal();render();toast('✓ Objetivo guardado');
}
export function delObjetivo(oid){
  if(!confirm('¿Eliminar este objetivo? Los KPIs vinculados quedarán sin objetivo.'))return;
  sbDel('bsc_objetivos',oid);
  DB.relaciones.filter(r=>r.de===oid||r.a===oid).forEach(r=>sbDel('bsc_relaciones',r.de+'|'+r.a));
  DB.objetivos=DB.objetivos.filter(o=>o.id!==oid);
  DB.relaciones=DB.relaciones.filter(r=>r.de!==oid&&r.a!==oid);
  DB.indicadores.forEach(i=>{if(i.oid===oid)i.oid=null;});
  save();closeModal();render();toast('Objetivo eliminado');
}
export function editRelaciones(){
  const opts=DB.objetivos.map(o=>`<option value="${o.id}">[${persp(o.pid).nombre.split(' ')[0]}] ${esc(o.nombre)}</option>`).join('');
  openModal(`<div class="mhead"><h3>Relaciones causa-efecto</h3><button class="close-x" onclick="closeModal()">✕</button></div>
  <div class="mbody">
    <div class="frow" style="grid-template-columns:1fr 1fr auto;align-items:end">
      <div class="fitem"><label>Causa (impulsa a…)</label><select id="r-de">${opts}</select></div>
      <div class="fitem"><label>Efecto</label><select id="r-a">${opts}</select></div>
      <button class="btn primary" onclick="addRelacion()">＋</button>
    </div>
    <table class="tbl"><thead><tr><th>Causa</th><th></th><th>Efecto</th><th></th></tr></thead><tbody>
    ${DB.relaciones.map((r,k)=>`<tr><td>${esc(obj(r.de)?.nombre||'?')}</td><td>→</td><td>${esc(obj(r.a)?.nombre||'?')}</td>
      <td><button class="btn sm danger" onclick="quitarRelacion(${k})">✕</button></td></tr>`).join('')||'<tr><td colspan="4" class="muted">Sin relaciones</td></tr>'}
    </tbody></table>
  </div>
  <div class="mfoot"><button class="btn primary" onclick="closeModal();render()">Listo</button></div>`);
}
export function addRelacion(){
  const de=$('#r-de').value,a=$('#r-a').value;
  if(de===a)return toast('⚠ La causa y el efecto no pueden ser el mismo objetivo');
  if(DB.relaciones.some(r=>r.de===de&&r.a===a))return toast('⚠ Esa relación ya existe');
  DB.relaciones.push({de,a});save();editRelaciones();toast('✓ Relación agregada');
}
export function quitarRelacion(k){const r=DB.relaciones[k];if(r)sbDel('bsc_relaciones',r.de+'|'+r.a);DB.relaciones.splice(k,1);save();editRelaciones();render();}
