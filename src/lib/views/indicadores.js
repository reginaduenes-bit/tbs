import { VIZ_TIPOS, renderChart, vizType } from '../charts.js';
import { FREC_LABEL, fmtNum, ind, obj, periodLabel, persp, statusOf, user } from '../model.js';
import { render } from '../router.js';
import { DB, save, sbDel, uid } from '../state.js';
import { $, MOB, closeModal, esc, openModal, toast } from '../ui.js';

/* ================= GESTIÓN DE INDICADORES ================= */
export function renderIndicadores(c){
  $('#tb-actions').innerHTML='<button class="btn primary" onclick="editIndicador(null)">+ Nuevo indicador</button>';
  let html='';
  DB.perspectivas.slice().sort((a,b)=>a.orden<b.orden?1:-1).forEach(p=>{
    const list=DB.indicadores.filter(i=>i.pid===p.id);
    html+=`<div class="persp-block"><h3><span class="bar" style="background:${p.color}"></span>${esc(p.nombre)} <span class="chip gray">${list.length}</span></h3>
    <div class="card" style="overflow:auto"><table class="tbl"><thead><tr>
      <th>Indicador</th><th>Objetivo</th><th>Responsable</th><th>Meta</th><th>Frecuencia</th><th>Último valor</th><th>Estatus</th><th style="width:150px"></th>
    </tr></thead><tbody>`;
    list.forEach(i=>{
      const {st,med}=statusOf(i);const u=user(i.resp);
      html+=`<tr style="${i.activo?'':'opacity:.45'}">
        <td><b>${esc(i.nombre)}</b>${i.activo?'':' <span class="chip gray">Inactivo</span>'}<div class="muted" style="font-size:11px">${esc(i.unidad)} · ${i.dir==='up'?'↑ mayor es mejor':i.dir==='down'?'↓ menor es mejor':'◦ seguimiento'}</div></td>
        <td style="font-size:12px">${esc(obj(i.oid)?.nombre||'—')}</td>
        <td style="font-size:12px">${u?esc(u.nombre):'<span class="muted">Sin asignar</span>'}</td>
        <td>${i.meta!=null?fmtNum(i.meta,i.unidad):'—'}</td>
        <td>${FREC_LABEL[i.frec]}</td>
        <td>${med?fmtNum(med.valor,i.unidad)+' <span class="muted" style="font-size:10px">('+periodLabel(med.periodo)+')</span>':'—'}</td>
        <td><span class="dot ${st==='neutral'?'gray':st}"></span></td>
        <td style="white-space:nowrap;text-align:right">
          <button class="btn sm" onclick="editIndicador('${i.id}')">Editar</button>
          <button class="btn sm ghost" title="${i.activo?'Desactivar':'Activar'}" onclick="toggleInd('${i.id}')">${i.activo?'⏸':'▶'}</button>
          <button class="btn sm danger" onclick="delIndicador('${i.id}')">✕</button>
        </td></tr>`;
    });
    html+='</tbody></table></div></div>';
  });
  c.innerHTML=html;
}
export function toggleInd(iid){const i=ind(iid);i.activo=!i.activo;save();render();toast(i.activo?'✓ Indicador activado':'Indicador desactivado (no aparece en el dashboard)');}
export function delIndicador(iid){
  const i=ind(iid);
  if(!confirm(`¿Eliminar "${i.nombre}" y todo su historial de mediciones? Esta acción no se puede deshacer.\n\nTip: si solo quieres ocultarlo, usa ⏸ Desactivar.`))return;
  sbDel('bsc_indicadores',iid);
  (DB.mediciones[iid]||[]).forEach(m=>sbDel('bsc_mediciones',iid+'|'+m.periodo));
  DB.indicadores=DB.indicadores.filter(x=>x.id!==iid);
  delete DB.mediciones[iid];
  save();render();toast('Indicador eliminado');
}
export function editIndicador(iid){
  const i=iid?ind(iid):null;
  previewViz.id=iid;
  openModal(`<div class="mhead"><h3>${i?'Editar':'Nuevo'} indicador</h3><button class="close-x" onclick="closeModal()">✕</button></div>
  <div class="mbody">
    <div class="frow f1"><div class="fitem"><label>Nombre</label><input id="i-nombre" value="${i?esc(i.nombre):''}" placeholder="Ej. Días contenedor en agua"></div></div>
    <div class="frow f3">
      <div class="fitem"><label>Perspectiva</label><select id="i-pid">${DB.perspectivas.map(p=>`<option value="${p.id}" ${i&&i.pid===p.id?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
      <div class="fitem"><label>Objetivo estratégico</label><select id="i-oid"><option value="">— Sin objetivo —</option>${DB.objetivos.map(o=>`<option value="${o.id}" ${i&&i.oid===o.id?'selected':''}>${esc(o.nombre)}</option>`).join('')}</select></div>
      <div class="fitem"><label>Responsable</label><select id="i-resp"><option value="">— Sin asignar —</option>${DB.usuarios.map(u=>`<option value="${u.id}" ${i&&i.resp===u.id?'selected':''}>${esc(u.nombre)}</option>`).join('')}</select></div>
    </div>
    <div class="frow f3">
      <div class="fitem"><label>Unidad</label><input id="i-unidad" value="${i?esc(i.unidad):''}" placeholder="%, MXN, días…"></div>
      <div class="fitem"><label>Dirección</label><select id="i-dir">
        <option value="up" ${i&&i.dir==='up'?'selected':''}>↑ Mayor es mejor</option>
        <option value="down" ${i&&i.dir==='down'?'selected':''}>↓ Menor es mejor</option>
        <option value="monitor" ${i&&i.dir==='monitor'?'selected':''}>◦ Solo seguimiento</option></select></div>
      <div class="fitem"><label>Meta</label><input id="i-meta" type="number" step="any" value="${i&&i.meta!=null?i.meta:''}" placeholder="Valor objetivo"></div>
    </div>
    <div class="frow f3">
      <div class="fitem"><label>Frecuencia</label><select id="i-frec">${Object.entries(FREC_LABEL).map(([k,v])=>`<option value="${k}" ${(i?i.frec:'mensual')===k?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="fitem"><label>Tipo de gráfico</label><select id="i-viz" onchange="previewViz()">
        <option value="auto" ${!i||i.viz==='auto'?'selected':''}>⚙ Automático</option>
        ${Object.entries(VIZ_TIPOS).map(([k,v])=>`<option value="${k}" ${i&&vizType(i)===k&&i.viz!=='auto'?'selected':''}>${v}</option>`).join('')}
      </select></div>
      <div class="fitem"><label>Peso (ponderación)</label><input id="i-peso" type="number" step="0.5" min="0" value="${i?i.peso:1}"></div>
    </div>
    <div class="frow">
      <div class="fitem"><label>Umbral verde (% de meta)</label><input id="i-verde" type="number" value="${i?i.verde:95}"> </div>
      <div class="fitem"><label>Umbral amarillo (% de meta)</label><input id="i-amarillo" type="number" value="${i?i.amarillo:80}"></div>
    </div>
    <div class="frow f1"><div class="fitem"><label>Descripción / fórmula (opcional)</label><textarea id="i-desc" rows="2" placeholder="Cómo se calcula, fuente del dato…">${i?esc(i.desc):''}</textarea></div></div>
    ${i?`<div class="fitem"><label>Vista previa del gráfico</label><div id="viz-preview" style="border:1px solid var(--border);border-radius:11px;padding:8px;background:#fff">${renderChart(i,MOB()?390:470,MOB()?240:230)}</div></div>`:''}
    <p class="help">Semáforo: <b style="color:var(--green)">verde</b> si cumplimiento ≥ umbral verde · <b style="color:var(--yellow)">amarillo</b> si ≥ umbral amarillo · <b style="color:var(--red)">rojo</b> debajo. Con dirección "↓ menor es mejor" el cumplimiento se calcula como meta ÷ valor real.</p>
  </div>
  <div class="mfoot"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveIndicador(${i?`'${i.id}'`:'null'})">Guardar indicador</button></div>`);
}
export function previewViz(){
  const box=$('#viz-preview'); if(!box)return;
  const tmp={nombre:$('#i-nombre').value,pid:$('#i-pid').value,unidad:$('#i-unidad').value,dir:$('#i-dir').value,
    meta:$('#i-meta').value===''?null:parseFloat($('#i-meta').value),frec:$('#i-frec').value,
    verde:parseFloat($('#i-verde').value)||95,amarillo:parseFloat($('#i-amarillo').value)||80,
    viz:$('#i-viz').value,id:previewViz.id};
  box.innerHTML=renderChart(tmp,MOB()?390:470,MOB()?240:230);
}
export function saveIndicador(iid){
  const nombre=$('#i-nombre').value.trim();
  if(!nombre)return toast('⚠ Escribe el nombre del indicador');
  const metaRaw=$('#i-meta').value;
  const data={nombre,pid:$('#i-pid').value,oid:$('#i-oid').value||null,resp:$('#i-resp').value||null,
    unidad:$('#i-unidad').value.trim(),dir:$('#i-dir').value,meta:metaRaw===''?null:parseFloat(metaRaw),
    frec:$('#i-frec').value,viz:$('#i-viz').value,peso:parseFloat($('#i-peso').value)||1,
    verde:parseFloat($('#i-verde').value)||95,amarillo:parseFloat($('#i-amarillo').value)||80,desc:$('#i-desc').value.trim()};
  if(data.dir!=='monitor'&&data.meta==null)return toast('⚠ Define una meta (o cambia a "Solo seguimiento")');
  if(iid)Object.assign(ind(iid),data);
  else DB.indicadores.push(Object.assign({id:uid('i'),activo:true},data));
  save();closeModal();render();toast('✓ Indicador guardado');
}
