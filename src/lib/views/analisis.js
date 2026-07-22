import { VIZ_TIPOS, renderChart, vizType } from '../charts.js';
import { FREC_LABEL, fmtNum, ind, meds, obj, periodLabel, persp, scoreOf, statusOf, user } from '../model.js';
import { nav, render } from '../router.js';
import { DB, save, sbDel } from '../state.js';
import { $, MOB, esc, toast } from '../ui.js';
import { ST_COLOR } from './dashboard.js';
import { editIndicador } from './indicadores.js';
import { setViz } from './tablero.js';

export let anaSel=null, anaQ='';
export function verIndicador(id,quedarse){anaSel=id;if(quedarse)render();else nav('analisis');}
export function setBusqueda(v){anaQ=v;render();const c=$('#ana-buscar');if(c){c.value=v;c.focus();c.setSelectionRange(v.length,v.length);}}
/* ================= ANÁLISIS ================= */

export function renderAnalisis(c){
  if(!anaSel||!ind(anaSel))anaSel=(DB.indicadores.find(i=>i.activo)||{}).id;
  const list=DB.indicadores.filter(i=>i.activo&&i.nombre.toLowerCase().includes(anaQ.toLowerCase()));
  let side=`<div class="card ana-list"><div style="padding:11px 12px;border-bottom:1px solid var(--border)">
    <input id="ana-buscar" style="width:100%" placeholder="🔍 Buscar indicador…" value="${esc(anaQ)}" oninput="setBusqueda(this.value)"></div>`;
  DB.perspectivas.slice().sort((a,b)=>a.orden<b.orden?1:-1).forEach(p=>{
    const li=list.filter(i=>i.pid===p.id);
    if(!li.length)return;
    side+=`<div style="padding:8px 14px 3px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:${p.color}">${esc(p.nombre)}</div>`;
    li.forEach(i=>{
      const {st}=statusOf(i);
      side+=`<div class="ana-item ${anaSel===i.id?'sel':''}" onclick="verIndicador('${i.id}',1)"><span class="n">${esc(i.nombre)}</span><span class="dot ${st==='neutral'?'gray':st}"></span></div>`;
    });
  });
  side+='</div>';
  const i=ind(anaSel);
  let main='<div class="empty card"><div class="big">📊</div>Selecciona un indicador</div>';
  if(i){
    const m=meds(i.id),{st,pct,med}=statusOf(i),u=user(i.resp),p=persp(i.pid);
    const vals=m.map(x=>x.valor);
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    main=`<div>
      <div class="card" style="padding:18px 22px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap">
          <div><span class="tag-persp" style="background:${p.color}">${esc(p.nombre)}</span>
            <h3 style="font-size:19px;margin-top:7px">${esc(i.nombre)}</h3>
            <div class="muted" style="font-size:12px;margin-top:3px">${esc(obj(i.oid)?.nombre||'Sin objetivo vinculado')} · ${FREC_LABEL[i.frec]} · Responsable: ${u?esc(u.nombre):'sin asignar'}${i.desc?'<br>'+esc(i.desc):''}</div></div>
          <div style="display:flex;gap:8px"><button class="btn sm" onclick="editIndicador('${i.id}')">✎ Editar</button><button class="btn sm" onclick="nav('captura')">＋ Capturar</button></div>
        </div>
      </div>
      <div class="stat-strip">
        <div class="stat"><div class="l">Último valor</div><div class="v">${med?fmtNum(med.valor,i.unidad):'—'}</div><div class="muted" style="font-size:10.5px">${med?periodLabel(med.periodo):''}</div></div>
        <div class="stat"><div class="l">Meta</div><div class="v">${i.meta!=null?fmtNum(i.meta,i.unidad):'—'}</div><div class="muted" style="font-size:10.5px">${i.dir==='up'?'↑ mayor es mejor':i.dir==='down'?'↓ menor es mejor':'seguimiento'}</div></div>
        <div class="stat"><div class="l">Cumplimiento</div><div class="v" style="color:${ST_COLOR[st]}">${pct!=null?Math.round(pct*100)+'%':'—'}</div><div class="muted" style="font-size:10.5px">${st==='green'?'En meta':st==='yellow'?'En riesgo':st==='red'?'Crítico':'—'}</div></div>
        <div class="stat"><div class="l">Promedio</div><div class="v">${avg!=null?fmtNum(avg,i.unidad):'—'}</div><div class="muted" style="font-size:10.5px">${m.length} registro${m.length!==1?'s':''}</div></div>
      </div>
      <div class="card" style="padding:20px 22px;margin-bottom:14px">
        <div class="section-head"><h3>Tendencia histórica</h3>
          <select class="cc-viz" style="max-width:200px" onchange="setViz('${i.id}',this.value)">
            ${Object.entries(VIZ_TIPOS).map(([k,v])=>`<option value="${k}" ${vizType(i)===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div id="bigchart">${renderChart(i,MOB()?400:760,MOB()?260:300)}</div>
      </div>
      <div class="card" style="padding:20px 22px;margin-bottom:14px">
        <div class="section-head"><h3>Evolución detallada (todos los periodos)</h3>${i.meta!=null?'<span class="chip gray">— — meta</span>':''}</div>
        <div>${bigChart(i)}</div>
      </div>
      <div class="card" style="overflow:auto"><table class="tbl"><thead><tr><th>Periodo</th><th>Valor</th><th>vs Meta</th><th>Nota</th><th>Capturó</th><th></th></tr></thead><tbody>
      ${m.slice().reverse().map(x=>{
        const pc=scoreOf(i,x.valor);
        const s=pc==null?'gray':(pc>=i.verde/100?'green':pc>=i.amarillo/100?'yellow':'red');
        return `<tr><td><b>${periodLabel(x.periodo)}</b></td><td>${fmtNum(x.valor,i.unidad)}</td>
        <td>${pc!=null?`<span class="chip ${s}">${Math.round(pc*100)}%</span>`:'—'}</td>
        <td style="font-size:12px">${esc(x.nota||'')}</td>
        <td style="font-size:12px">${user(x.quien)?esc(user(x.quien).nombre):'—'}</td>
        <td><button class="btn sm danger" onclick="delMed('${i.id}','${x.periodo}')">✕</button></td></tr>`;
      }).join('')||'<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Sin mediciones — captúralas en “Captura de Datos” o impórtalas desde CSV</td></tr>'}
      </tbody></table></div>
    </div>`;
  }
  c.innerHTML=`<div class="ana-layout">${side}${main}</div>`;
}
export function delMed(iid,per){
  if(!confirm('¿Eliminar la medición de '+periodLabel(per)+'?'))return;
  sbDel('bsc_mediciones',iid+'|'+per);
  DB.mediciones[iid]=(DB.mediciones[iid]||[]).filter(m=>m.periodo!==per);
  save();render();toast('Medición eliminada');
}
export function bigChart(i){
  const m=meds(i.id).slice(MOB()?-12:-24);
  if(m.length<2)return '<div class="empty" style="padding:34px">Se necesitan al menos 2 mediciones para graficar.</div>';
  const W=MOB()?420:760,H=MOB()?250:260,pl=MOB()?44:54,pr=16,pt=14,pb=34;
  const vals=m.map(x=>x.valor);
  let min=Math.min(...vals),max=Math.max(...vals);
  if(i.meta!=null){min=Math.min(min,i.meta);max=Math.max(max,i.meta);}
  const span=(max-min)||1;min-=span*0.12;max+=span*0.12;
  const X=k=>pl+(k/(m.length-1))*(W-pl-pr);
  const Y=v=>pt+(1-(v-min)/(max-min))*(H-pt-pb);
  const p=persp(i.pid);
  let grid='',labs='';
  for(let g=0;g<=4;g++){
    const v=min+(max-min)*g/4,y=Y(v);
    grid+=`<line x1="${pl}" y1="${y}" x2="${W-pr}" y2="${y}" stroke="#eef2f7"/>`;
    labs+=`<text x="${pl-8}" y="${y+3.5}" text-anchor="end" font-size="10" fill="#94a3b8">${fmtNum(v,'')}</text>`;
  }
  const step=Math.ceil(m.length/9);
  m.forEach((x,k)=>{if(k%step===0||k===m.length-1)labs+=`<text x="${X(k)}" y="${H-10}" text-anchor="middle" font-size="9.5" fill="#94a3b8">${periodLabel(x.periodo)}</text>`;});
  const path=vals.map((v,k)=>(k?'L':'M')+X(k).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
  const area=path+` L${X(vals.length-1).toFixed(1)} ${H-pb} L${X(0).toFixed(1)} ${H-pb} Z`;
  const dots=vals.map((v,k)=>{
    const pc=scoreOf(i,v);
    const col=pc==null?p.color:(pc>=i.verde/100?'#16a34a':pc>=i.amarillo/100?'#eab308':'#dc2626');
    return `<circle cx="${X(k)}" cy="${Y(v)}" r="4" fill="${col}" stroke="#fff" stroke-width="1.5"><title>${periodLabel(m[k].periodo)}: ${fmtNum(v,i.unidad)}</title></circle>`;
  }).join('');
  const metaLine=i.meta!=null?`<line x1="${pl}" y1="${Y(i.meta)}" x2="${W-pr}" y2="${Y(i.meta)}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${W-pr}" y="${Y(i.meta)-6}" text-anchor="end" font-size="10" font-weight="700" fill="#64748b">Meta ${fmtNum(i.meta,i.unidad)}</text>`:'';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${grid}${labs}
    <path d="${area}" fill="${p.color}" opacity=".08"/>
    <path d="${path}" fill="none" stroke="${p.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${metaLine}${dots}</svg>`;
}
