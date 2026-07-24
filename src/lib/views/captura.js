import { sparkline } from '../charts.js';
import { FREC_LABEL, currentPeriod, fmtNum, ind, meds, periodLabel, persp, prevPeriods, setMed, user } from '../model.js';
import { esCapturista, miPerfil } from '../permisos.js';
import { render } from '../router.js';
import { DB } from '../state.js';
import { $, esc, toast } from '../ui.js';

export let capResp='all';
export function setCapResp(v){capResp=v;render();}
/* ================= CAPTURA ================= */

export function renderCaptura(c){
  const restringido = esCapturista();
  if(restringido) capResp = miPerfil.usuario_id || 'ninguno';
  if(restringido && capResp==='ninguno'){
    c.innerHTML='<div class="empty"><div class="big">🔒</div>Tu cuenta aún no está vinculada a ningún responsable.<br>Pide a un administrador que te asigne uno en <b>Usuarios y Permisos</b>.</div>';
    return;
  }
  const inds=DB.indicadores.filter(i=>i.activo&&(capResp==='all'||i.resp===capResp));
  const pendCount=inds.filter(i=>!meds(i.id).some(m=>m.periodo===currentPeriod(i.frec))).length;
  let html=`<div class="cap-head">
    <div class="fitem"><label>¿Quién captura?</label>
      ${restringido
        ? `<input value="${esc((user(capResp)||{}).nombre||'')}" disabled>`
        : `<select onchange="setCapResp(this.value)">
        <option value="all">Todos los responsables</option>
        ${DB.usuarios.map(u=>`<option value="${u.id}" ${capResp===u.id?'selected':''}>${esc(u.nombre)}</option>`).join('')}
      </select>`}</div>
    <div style="padding-bottom:6px">${pendCount?`<span class="pending">⏳ ${pendCount} indicador${pendCount!==1?'es':''} pendiente${pendCount!==1?'s':''} del periodo actual</span>`:'<span class="done-chip">✓ Todo capturado en el periodo actual</span>'}</div>
  </div>`;
  if(!inds.length)html+='<div class="empty"><div class="big">📭</div>No hay indicadores asignados a este responsable.</div>';
  DB.perspectivas.slice().sort((a,b)=>a.orden<b.orden?1:-1).forEach(p=>{
    const list=inds.filter(i=>i.pid===p.id);
    if(!list.length)return;
    html+=`<h3 style="font-size:13px;font-weight:800;margin:18px 0 10px;color:${p.color}">${esc(p.nombre)}</h3>`;
    list.forEach(i=>{
      const cur=currentPeriod(i.frec);
      const done=meds(i.id).some(m=>m.periodo===cur);
      const periods=prevPeriods(i.frec,i.frec==='diaria'?7:6);
      const u=user(i.resp);
      html+=`<div class="cap-card">
        <div class="ctop">
          <div><span class="cname">${esc(i.nombre)}</span> ${done?'<span class="done-chip">✓ '+periodLabel(cur)+'</span>':'<span class="pending">⏳ Pendiente '+periodLabel(cur)+'</span>'}
          <div class="cinfo">${i.meta!=null?'Meta: '+fmtNum(i.meta,i.unidad)+' · ':''}${FREC_LABEL[i.frec]} · ${u?esc(u.nombre):'Sin responsable'}${i.desc?' · '+esc(i.desc):''}</div></div>
          <div style="min-width:170px">${sparkline(i.id,170,34,persp(i.pid).color)}</div>
        </div>
        <div class="cap-inputs">
          <div class="fitem"><label>Periodo</label><select id="cp-${i.id}">${periods.slice().reverse().map(pp=>{
            const ex=meds(i.id).find(m=>m.periodo===pp);
            return `<option value="${pp}">${periodLabel(pp)}${ex?' · actual: '+fmtNum(ex.valor,i.unidad):''}</option>`;
          }).join('')}</select></div>
          <div class="fitem"><label>Valor (${esc(i.unidad)||'número'})</label><input type="number" step="any" id="cv-${i.id}" placeholder="0"></div>
          <div class="fitem" style="flex:1;min-width:140px"><label>Nota (opcional)</label><input id="cn-${i.id}" placeholder="Comentario…"></div>
          <button class="btn primary" onclick="capturar('${i.id}')">Guardar</button>
        </div>
      </div>`;
    });
  });
  c.innerHTML=html;
}
export function capturar(iid){
  if(esCapturista() && ind(iid).resp!==miPerfil.usuario_id)return toast('⚠ No puedes capturar un indicador que no es tuyo');
  const v=$('#cv-'+iid).value;
  if(v==='')return toast('⚠ Escribe el valor a registrar');
  const per=$('#cp-'+iid).value, quien=capResp==='all'?null:capResp;
  setMed(iid,per,parseFloat(v),quien,$('#cn-'+iid).value.trim());
  render();toast('✓ Valor registrado: '+fmtNum(parseFloat(v),ind(iid).unidad)+' · '+periodLabel(per));
}
