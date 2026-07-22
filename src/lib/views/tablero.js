import { C, VIZ_TIPOS, gaugeNeedleSVG, renderChart, vizType } from '../charts.js';
import { FREC_LABEL, fmtNum, ind, persp, perspStats, statusOf, user } from '../model.js';
import { nav, render } from '../router.js';
import { DB, save } from '../state.js';
import { $, chartH, chartW, esc, toast } from '../ui.js';
import { editIndicador } from './indicadores.js';

export let tabPersp='fin';
export function verPerspectiva(id,irA){tabPersp=id;if(irA)nav('tablero');else render();}
/* ================= TABLERO POR PERSPECTIVA ================= */

export function renderTablero(c){
  const p=persp(tabPersp)||DB.perspectivas[0];
  tabPersp=p.id;
  $('#tb-actions').innerHTML='<button class="btn" onclick="window.print()">🖨 Imprimir / PDF</button>';
  const st=perspStats(p.id);
  const list=DB.indicadores.filter(i=>i.activo&&i.pid===p.id);
  let tabs=`<div class="ptabs">`+DB.perspectivas.slice().sort((a,b)=>a.orden<b.orden?1:-1).map(x=>{
    const s=perspStats(x.id);
    return `<button class="ptab ${x.id===p.id?'on':''}" style="--pc:${x.color}" onclick="verPerspectiva('${x.id}')">
      <span class="pi">${x.icono}</span><span>${esc(x.nombre)}</span><span class="pv">${s.score==null?'—':s.score+'%'}</span></button>`;
  }).join('')+'</div>';
  let banner=`<div class="pbanner" style="background:linear-gradient(100deg,${p.color}f2,#12275c)">
    <div class="pb-title">PERSPECTIVA ${esc(p.nombre).toUpperCase()} (BSC)</div>
    <div class="pb-legend">
      <span><i style="background:${C.green}"></i>En meta ${st.g}</span>
      <span><i style="background:${C.yellow}"></i>En riesgo ${st.y}</span>
      <span><i style="background:${C.red}"></i>Crítico ${st.r}</span>
      <span><i style="background:${C.meta}"></i>Línea de meta</span>
    </div></div>`;
  const cards=list.map((i,k)=>{
    const s=statusOf(i);
    const u=user(i.resp);
    return `<div class="chartcard" data-k="${k}">
      <div class="cc-head">
        <div class="cc-title">${k+1}. ${esc(i.nombre)} <span class="cc-unit">(${esc(i.unidad||'—')})</span></div>
        <div class="cc-tools">
          <select class="cc-viz" onchange="setViz('${i.id}',this.value)" title="Tipo de gráfico">
            ${Object.entries(VIZ_TIPOS).map(([k2,v])=>`<option value="${k2}" ${vizType(i)===k2?'selected':''}>${v}</option>`).join('')}
          </select>
          <button class="btn sm ghost" title="Editar indicador" onclick="editIndicador('${i.id}')">✎</button>
        </div>
      </div>
      <div class="cc-sub"><span class="dot ${s.st==='neutral'?'gray':s.st}"></span>
        ${s.pct!=null?'<b>'+Math.round(s.pct*100)+'%</b> de la meta · ':''}${i.meta!=null?'Meta '+fmtNum(i.meta,i.unidad)+' · ':''}${FREC_LABEL[i.frec]}${u?' · '+esc(u.nombre):''}</div>
      <div class="cc-body">${renderChart(i,chartW(),chartH())}</div>
    </div>`;
  });
  const gauge=`<div class="chartcard gauge-card" style="--pc:${p.color};background:linear-gradient(158deg,${p.color}1a 0%,${p.color}0a 42%,#ffffff 100%);border-color:${p.color}59">
    <div class="gc-badge" style="background:${p.color}">◆ RESUMEN EJECUTIVO</div>
    <div class="gc-title" style="color:${p.color}">CUMPLIMIENTO GLOBAL<br><span>DE LA PERSPECTIVA</span></div>
    <div class="cc-body">${gaugeNeedleSVG(st.score==null?null:st.score/100,chartW(),chartH(),50,75,p.nombre.split(' ')[0],'PERSPECTIVA')}</div>
    <div class="gc-foot">
      <span><b>${st.total}</b> INDICADORES</span><i></i>
      <span style="color:${C.green}"><b>${st.g}</b> EN META</span><i></i>
      <span style="color:${C.yellow}"><b>${st.y}</b> EN RIESGO</span><i></i>
      <span style="color:${C.red}"><b>${st.r}</b> CRÍTICO</span>
    </div>
  </div>`;
  cards.splice(Math.min(1,cards.length),0,gauge);
  c.innerHTML=tabs+banner+(list.length?`<div class="chart-grid">${cards.join('')}</div>`:'<div class="empty card"><div class="big">📊</div>Esta perspectiva no tiene indicadores activos.</div>');
}
export function setViz(iid,v){ind(iid).viz=v;save();render();toast('✓ Gráfico actualizado');}
