import { C, STC, barsSVG, gaugeSVG, ring, sparkline, vizType } from '../charts.js';
import { FREC_LABEL, fmtNum, periodLabel, persp, perspStats, statusOf, trendOf, user } from '../model.js';
import { render } from '../router.js';
import { DB } from '../state.js';
import { $, esc } from '../ui.js';
import { verIndicador } from './analisis.js';
import { verPerspectiva } from './tablero.js';

export const dashFilter={persp:'all',resp:'all'};
export function setFiltro(k,v){dashFilter[k]=v;render();}
export function limpiarFiltros(){dashFilter.persp='all';dashFilter.resp='all';render();}
/* ================= DASHBOARD ================= */
export const ST_COLOR={green:'#16a34a',yellow:'#eab308',red:'#dc2626',gray:'#94a3b8',neutral:'#64748b'};
export function renderDashboard(c){
  $('#tb-actions').innerHTML='<button class="btn" onclick="window.print()">🖨 Imprimir / PDF</button>';
  const sums=DB.perspectivas.slice().sort((a,b)=>a.orden<b.orden?1:-1);
  let html='<div class="persp-summary">';
  sums.forEach(p=>{
    const st=perspStats(p.id);
    html+=`<div class="psum" style="background:linear-gradient(135deg,${p.color},${p.color}cc)" onclick="verPerspectiva('${p.id}',1)">
      <div class="ring">${p.icono}</div>
      <div class="pname">${esc(p.nombre)}</div>
      <div class="pscore">${st.score==null?'—':st.score+'%'}</div>
      <div class="pmeta">${st.total} indicadores · cumplimiento global</div>
      <div class="lights"><span>●&nbsp;${st.g}</span><span style="opacity:.85">●&nbsp;${st.y}</span><span style="opacity:.7">●&nbsp;${st.r}</span></div>
    </div>`;
  });
  html+='</div>';
  html+=`<div class="dash-controls">
    <select onchange="setFiltro('persp',this.value)">
      <option value="all">Todas las perspectivas</option>
      ${DB.perspectivas.map(p=>`<option value="${p.id}" ${dashFilter.persp===p.id?'selected':''}>${esc(p.nombre)}</option>`).join('')}
    </select>
    <select onchange="setFiltro('resp',this.value)">
      <option value="all">Todos los responsables</option>
      ${DB.usuarios.map(u=>`<option value="${u.id}" ${dashFilter.resp===u.id?'selected':''}>${esc(u.nombre)}</option>`).join('')}
    </select>
    ${dashFilter.persp!=='all'||dashFilter.resp!=='all'?'<button class="btn sm ghost" onclick="limpiarFiltros()">✕ Limpiar filtros</button>':''}
  </div>`;
  sums.forEach(p=>{
    if(dashFilter.persp!=='all'&&dashFilter.persp!==p.id)return;
    const list=DB.indicadores.filter(i=>i.activo&&i.pid===p.id&&(dashFilter.resp==='all'||i.resp===dashFilter.resp));
    if(!list.length)return;
    html+=`<div class="persp-block"><h3><span class="bar" style="background:${p.color}"></span>${esc(p.nombre)} <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">· ${esc(p.desc)}</span></h3><div class="kpi-grid">`;
    list.forEach(i=>{html+=kpiCard(i,p);});
    html+='</div></div>';
  });
  c.innerHTML=html;
}
export function miniViz(i,p,st,pct){
  const t=vizType(i), col=STC[st]||C.blue;
  if(t==='numero')return '';
  if(t==='semaforo'){
    return `<div style="display:flex;gap:7px;align-items:center;height:42px">
      ${['red','yellow','green'].map(x=>`<span class="dot ${x}" style="width:16px;height:16px;opacity:${st===x?1:.16}"></span>`).join('')}
      <span style="font-size:11px;font-weight:700;color:${col};margin-left:4px">${st==='green'?'EN META':st==='yellow'?'EN RIESGO':st==='red'?'CRÍTICO':'SEGUIMIENTO'}</span></div>`;
  }
  if(t==='velocimetro'||t==='dona')return gaugeSVG(pct,st==='gray'||st==='neutral'?'#cbd5e1':col);
  if(t==='termometro'||t==='bala'){
    const w=pct==null?0:Math.max(2,Math.min(pct,1.2)/1.2*100);
    return `<div style="height:42px;display:flex;flex-direction:column;justify-content:center;gap:5px">
      <div style="height:11px;background:#eef1f6;border-radius:6px;position:relative;overflow:hidden">
        <div style="width:${w}%;height:100%;background:${col};border-radius:6px"></div>
        ${i.meta!=null?'<div style="position:absolute;left:83.3%;top:-2px;width:2px;height:15px;background:#111827"></div>':''}
      </div><div style="font-size:10px;color:var(--text3)">${pct!=null?Math.round(pct*100)+'% de la meta':'Sin meta'}</div></div>`;
  }
  if(t==='columnas'||t==='barrasH')return barsSVG(i.id,p.color);
  return sparkline(i.id,210,42,p.color);
}
export function kpiCard(i,p){
  const {st,pct,med}=statusOf(i);
  const u=user(i.resp), tr=trendOf(i.id);
  const trIc=tr>0?'<span class="trend-up">▲</span>':tr<0?'<span class="trend-down">▼</span>':'<span class="trend-flat">▬</span>';
  const viz=miniViz(i,p,st,pct);
  const stChip=i.dir==='monitor'
    ?'<span class="chip gray">Seguimiento</span>'
    :(st==='gray'?'<span class="chip gray">Sin datos</span>':`<span class="chip ${st}">● ${pct!=null?Math.round(pct*100)+'%':''} ${st==='green'?'En meta':st==='yellow'?'En riesgo':'Crítico'}</span>`);
  return `<div class="kpi status-${st==='neutral'?'gray':st}" onclick="verIndicador('${i.id}')">
    <div class="kname"><span>${esc(i.nombre)}</span>${trIc}</div>
    <div class="kval">${med?fmtNum(med.valor,i.unidad):'—'}</div>
    <div class="kmeta">${i.meta!=null?'Meta: '+fmtNum(i.meta,i.unidad)+' · ':''}${FREC_LABEL[i.frec]}${med?' · '+periodLabel(med.periodo):''}</div>
    <div style="margin-top:8px">${viz}</div>
    <div class="kfoot">${stChip}<span class="kresp"><span class="avatar">${u?esc(u.ini):'?'}</span>${u?esc(u.nombre.split(' ').slice(0,2).join(' ')):'Sin asignar'}</span></div>
  </div>`;
}
