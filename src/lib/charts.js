import { fmtNum, lastMed, meds, periodLabel, scoreOf, statusOf } from './model.js';
import { MOB, esc, maxPts } from './ui.js';

/* ---------- MINI-CHARTS SVG ---------- */
export function sparkline(iid,w=210,h=42,color='#2563eb'){
  const m=meds(iid).slice(-12);
  if(m.length<2)return '<div class="muted" style="font-size:11px;height:'+h+'px;display:flex;align-items:center">Sin historial suficiente</div>';
  const vals=m.map(x=>x.valor);
  const min=Math.min(...vals),max=Math.max(...vals),rg=(max-min)||1;
  const pts=vals.map((v,k)=>[(k/(vals.length-1))*(w-6)+3, h-5-((v-min)/rg)*(h-12)]);
  const path=pts.map((p,k)=>(k?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=path+' L'+pts[pts.length-1][0].toFixed(1)+' '+(h-2)+' L'+pts[0][0].toFixed(1)+' '+(h-2)+' Z';
  const last=pts[pts.length-1];
  return `<svg width="${w}" height="${h}" style="display:block;max-width:100%">
    <path d="${area}" fill="${color}" opacity=".09"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${color}"/></svg>`;
}
export function gaugeSVG(pct,color,size=76){
  const p=pct==null?0:Math.max(0,Math.min(pct,1.2));
  const r=(size/2)-7, c=size/2;
  const start=-210, sweep=240, ang=start+sweep*(p/1.2);
  const arc=(a1,a2,col,wd,op)=>{
    const x1=c+r*Math.cos(a1*Math.PI/180),y1=c+r*Math.sin(a1*Math.PI/180);
    const x2=c+r*Math.cos(a2*Math.PI/180),y2=c+r*Math.sin(a2*Math.PI/180);
    const large=(a2-a1)>180?1:0;
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${wd}" stroke-linecap="round" opacity="${op}"/>`;
  };
  return `<svg width="${size}" height="${size*0.78}" viewBox="0 0 ${size} ${size*0.82}">
    ${arc(start,start+sweep,'#e2e8f0',7,1)}
    ${pct!=null?arc(start,Math.max(ang,start+1),color,7,1):''}
    <text x="${c}" y="${c+6}" text-anchor="middle" font-size="${size/5.2}" font-weight="800" fill="#0f172a">${pct==null?'—':Math.round(pct*100)+'%'}</text>
    <text x="${c}" y="${c+19}" text-anchor="middle" font-size="8" fill="#94a3b8">vs meta</text></svg>`;
}
export function barsSVG(iid,color,w=210,h=46){
  const m=meds(iid).slice(-10);
  if(!m.length)return '<div class="muted" style="font-size:11px;height:'+h+'px;display:flex;align-items:center">Sin datos</div>';
  const vals=m.map(x=>x.valor);const max=Math.max(...vals,1);
  const bw=Math.min(16,(w-8)/m.length-4);
  return `<svg width="${w}" height="${h}" style="display:block;max-width:100%">${vals.map((v,k)=>{
    const bh=Math.max(2,(v/max)*(h-8));
    const x=4+k*((w-8)/vals.length);
    return `<rect x="${x}" y="${h-2-bh}" width="${bw}" height="${bh}" rx="2.5" fill="${color}" opacity="${k===vals.length-1?1:.45}"/>`;
  }).join('')}</svg>`;
}

/* ============================================================
   MOTOR DE GRÁFICOS ESPECIALIZADOS (escala de color por estatus)
   ============================================================ */
export const C={red:'#e03131',yellow:'#f0a202',green:'#2f9e44',blue:'#3b6fd4',meta:'#ed7d31',grid:'#e8edf4',axis:'#8a97ab',ink:'#0f172a'};
export const VIZ_TIPOS={
  columnas:'📊 Columnas + línea de meta',
  linea:'📈 Línea con marcadores',
  area:'🌄 Área',
  velocimetro:'🎯 Velocímetro (aguja)',
  dona:'🍩 Dona de cumplimiento',
  termometro:'🌡 Termómetro',
  barrasH:'▭ Barras horizontales',
  semaforo:'🚦 Semáforo',
  numero:'🔢 Número grande (KPI)',
  bala:'▮ Gráfico bala (bullet)'
};
export function statusFor(i,v){
  const pc=scoreOf(i,v);
  if(pc==null)return 'neutral';
  return pc>=i.verde/100?'green':(pc>=i.amarillo/100?'yellow':'red');
}
export const STC={green:C.green,yellow:C.yellow,red:C.red,neutral:C.blue,gray:'#adb5bd'};

export function serie(i,n){
  return meds(i.id).slice(-maxPts(n||6)).map(x=>({p:x.periodo,v:x.valor,st:statusFor(i,x.valor)}));
}
export function shortLabel(p){
  if(/^\d{4}-\d{2}$/.test(p)){const m=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];return m[+p.slice(5)-1]+" '"+p.slice(2,4);}
  if(/-T\d$/.test(p))return 'T'+p.slice(-1)+" '"+p.slice(2,4);
  if(/-S\d+$/.test(p))return 'S'+p.slice(-2);
  if(/^\d{4}-\d{2}-\d{2}$/.test(p))return p.slice(8)+'/'+p.slice(5,7);
  return p;
}
export function axisFmt(v){
  const a=Math.abs(v);
  if(a>=1e6)return (v/1e6).toFixed(a>=1e7?0:1)+'M';
  if(a>=1e3)return (v/1e3).toFixed(a>=1e4?0:1)+'k';
  return (Math.round(v*100)/100).toString();
}
export function valLabel(v,u){
  if(u==='%')return (Math.round(v*10)/10)+'%';
  return axisFmt(v);
}
export function noData(W,H,msg){
  return `<svg viewBox="0 0 ${W} ${H}" class="cx"><rect width="${W}" height="${H}" fill="#fbfcfe" rx="8"/>
  <text x="${W/2}" y="${H/2-4}" text-anchor="middle" font-size="15" fill="#b7c1d1">◌</text>
  <text x="${W/2}" y="${H/2+16}" text-anchor="middle" font-size="12" fill="#a3aec0">${msg||'Sin datos capturados'}</text></svg>`;
}
export function pol(cx,cy,r,deg){const a=deg*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}
export function annulus(cx,cy,ro,ri,a1,a2,fill,op){
  const [x1,y1]=pol(cx,cy,ro,a1),[x2,y2]=pol(cx,cy,ro,a2),[x3,y3]=pol(cx,cy,ri,a2),[x4,y4]=pol(cx,cy,ri,a1);
  const lg=(a2-a1)>180?1:0;
  return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${ro} ${ro} 0 ${lg} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L${x3.toFixed(1)} ${y3.toFixed(1)} A${ri} ${ri} 0 ${lg} 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z" fill="${fill}"${op?' opacity="'+op+'"':''}/>`;
}
/* anillo robusto: divide en tramos ≤120° para evitar arcos degenerados */
export function ring(cx,cy,ro,ri,from,sweep,fill,op){
  let out='',done=0;
  while(done<sweep-0.01){
    const s=Math.min(120,sweep-done);
    out+=annulus(cx,cy,ro,ri,from+done,from+done+s,fill,op);
    done+=s;
  }
  return out;
}
/* --- ejes compartidos para columnas / línea / área --- */
export function frame(i,d,W,H,opts){
  const pl=MOB()?46:52,pr=18,pt=34,pb=34;
  let vals=d.map(x=>x.v);
  let min=Math.min(...vals),max=Math.max(...vals);
  if(i.meta!=null){min=Math.min(min,i.meta);max=Math.max(max,i.meta);}
  if(opts&&opts.zero)min=Math.min(0,min);
  const sp=(max-min)||Math.abs(max)||1;
  max+=sp*0.22; if(min!==0)min-=sp*0.14;
  if(min>0&&(!opts||!opts.zero===false)&&min<sp*0.5)min=Math.min(min,0);
  const X=k=>pl+(d.length===1?(W-pl-pr)/2:(k/(d.length-1))*(W-pl-pr));
  const Y=v=>pt+(1-(v-min)/((max-min)||1))*(H-pt-pb);
  let g='';
  for(let k=0;k<=4;k++){
    const v=min+(max-min)*k/4,y=Y(v);
    g+=`<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W-pr}" y2="${y.toFixed(1)}" stroke="${C.grid}"/>`;
    g+=`<text x="${pl-8}" y="${(y+3.5).toFixed(1)}" text-anchor="end" font-size="10.5" fill="${C.axis}">${axisFmt(v)}</text>`;
  }
  const step=Math.ceil(d.length/8);
  d.forEach((x,k)=>{if(k%step===0||k===d.length-1)g+=`<text x="${X(k).toFixed(1)}" y="${H-11}" text-anchor="middle" font-size="10.5" fill="${C.axis}">${shortLabel(x.p)}</text>`;});
  let meta='';
  if(i.meta!=null&&i.dir!=='monitor'){
    const y=Y(i.meta);
    meta=`<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W-pr}" y2="${y.toFixed(1)}" stroke="${C.meta}" stroke-width="2.2"/>
    <line x1="${pl}" y1="13" x2="${pl+17}" y2="13" stroke="${C.meta}" stroke-width="2.6"/>
    <text x="${pl+22}" y="16.8" font-size="10.5" font-weight="700" fill="${C.meta}">Meta ${valLabel(i.meta,i.unidad)}</text>`;
  }
  return {pl,pr,pt,pb,X,Y,grid:g,meta,min,max};
}
/* --- 1. COLUMNAS --- */
export function vColumnas(i,W,H){
  const d=serie(i,7); if(!d.length)return noData(W,H);
  const f=frame(i,d,W,H,{zero:true});
  const band=(W-f.pl-f.pr)/Math.max(d.length,1);
  const bw=Math.min(46,band*0.56);
  const base=f.Y(Math.max(f.min,0));
  const bars=d.map((x,k)=>{
    const y=f.Y(x.v),top=Math.min(y,base),h=Math.max(2,Math.abs(base-y));
    return `<rect x="${(f.X(k)-bw/2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${STC[x.st]}">
      <title>${periodLabel(x.p)}: ${fmtNum(x.v,i.unidad)}</title></rect>
      <text x="${f.X(k).toFixed(1)}" y="${(top-7).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="800" fill="${C.ink}">${valLabel(x.v,i.unidad)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="cx">${f.grid}${bars}${f.meta}</svg>`;
}
/* --- 2. LÍNEA --- */
export function vLinea(i,W,H){
  const d=serie(i,8); if(!d.length)return noData(W,H);
  const f=frame(i,d,W,H);
  const path=d.map((x,k)=>(k?'L':'M')+f.X(k).toFixed(1)+' '+f.Y(x.v).toFixed(1)).join(' ');
  const dots=d.map((x,k)=>`<circle cx="${f.X(k).toFixed(1)}" cy="${f.Y(x.v).toFixed(1)}" r="6" fill="${STC[x.st]}" stroke="#fff" stroke-width="2.2"><title>${periodLabel(x.p)}: ${fmtNum(x.v,i.unidad)}</title></circle>
  <text x="${f.X(k).toFixed(1)}" y="${(f.Y(x.v)-13).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="800" fill="${C.ink}">${valLabel(x.v,i.unidad)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="cx">${f.grid}
    <path d="${path}" fill="none" stroke="${C.blue}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>${f.meta}${dots}</svg>`;
}
/* --- 3. ÁREA --- */
export function vArea(i,W,H){
  const d=serie(i,10); if(!d.length)return noData(W,H);
  const f=frame(i,d,W,H);
  const col=STC[d[d.length-1].st];
  const path=d.map((x,k)=>(k?'L':'M')+f.X(k).toFixed(1)+' '+f.Y(x.v).toFixed(1)).join(' ');
  const area=path+` L${f.X(d.length-1).toFixed(1)} ${H-f.pb} L${f.X(0).toFixed(1)} ${H-f.pb} Z`;
  const last=d[d.length-1];
  return `<svg viewBox="0 0 ${W} ${H}" class="cx">${f.grid}
    <path d="${area}" fill="${col}" opacity=".16"/>
    <path d="${path}" fill="none" stroke="${col}" stroke-width="2.8" stroke-linejoin="round"/>${f.meta}
    <circle cx="${f.X(d.length-1).toFixed(1)}" cy="${f.Y(last.v).toFixed(1)}" r="5.5" fill="${col}" stroke="#fff" stroke-width="2"/>
    <text x="${f.X(d.length-1).toFixed(1)}" y="${(f.Y(last.v)-12).toFixed(1)}" text-anchor="end" font-size="11.5" font-weight="800" fill="${C.ink}">${valLabel(last.v,i.unidad)}</text></svg>`;
}
/* --- 4. VELOCÍMETRO CON AGUJA --- */
export function vVelocimetro(i,W,H,forcePct,titulo){
  const {pct}=typeof forcePct==='number'?{pct:forcePct}:statusOf(i);
  const uy=i?i.amarillo:80, ug=i?i.verde:95;
  return gaugeNeedleSVG(pct,W,H,uy,ug,titulo|| (i?valLabel(lastMed(i.id)?lastMed(i.id).valor:0,i.unidad):''));
}
export function gaugeNeedleSVG(pct,W,H,uy,ug,subtitulo,subLabel){
  const cx=W/2, cy=H*0.68, r=Math.min(W*0.32,H*0.50), ri=r*0.62;
  const p=pct==null?null:Math.max(0,Math.min(pct,1))*100;
  const segs=22; let arcs='';
  for(let k=0;k<segs;k++){
    const a1=180+(k/segs)*180+1.1, a2=180+((k+1)/segs)*180-1.1;
    const mid=((k+0.5)/segs)*100;
    const col=mid<uy?C.red:(mid<ug?C.yellow:C.green);
    arcs+=annulus(cx,cy,r,ri,a1,a2,col,p==null?.28:1);
  }
  let labs='';
  for(let v=0;v<=100;v+=10){
    const [lx,ly]=pol(cx,cy,r*1.20,180+(v/100)*180);
    labs+=`<text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#5b6b84">${v}%</text>`;
  }
  let needle='';
  if(p!=null){
    const ang=180+(p/100)*180;
    const [tx,ty]=pol(cx,cy,r*0.96,ang);
    const [b1x,b1y]=pol(cx,cy,9,ang+90),[b2x,b2y]=pol(cx,cy,9,ang-90);
    needle=`<path d="M${b1x.toFixed(1)} ${b1y.toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)} L${b2x.toFixed(1)} ${b2y.toFixed(1)} Z" fill="#111827"/>
    <circle cx="${cx}" cy="${cy}" r="10" fill="#fff" stroke="#111827" stroke-width="3"/>`;
  }
  const bw=W*0.30,bh=36,by=cy+20;
  const sub=String(subtitulo||'');
  const box=`<rect x="${(cx-bw-6).toFixed(1)}" y="${by}" width="${bw.toFixed(1)}" height="${bh}" rx="7" fill="#12275c"/>
  <text x="${(cx-bw/2-6).toFixed(1)}" y="${by+17}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">${p==null?'—':p.toFixed(1)+'%'}</text>
  <text x="${(cx-bw/2-6).toFixed(1)}" y="${by+29}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#9db4e8">CUMPLIMIENTO</text>
  <rect x="${(cx+6).toFixed(1)}" y="${by}" width="${bw.toFixed(1)}" height="${bh}" rx="7" fill="#12275c"/>
  <text x="${(cx+bw/2+6).toFixed(1)}" y="${by+17}" text-anchor="middle" font-size="${sub.length>11?11:14}" font-weight="800" fill="#fff">${esc(sub.toUpperCase().slice(0,15))}</text>
  <text x="${(cx+bw/2+6).toFixed(1)}" y="${by+29}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#9db4e8">${esc((subLabel||'VALOR ACTUAL'))}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="cx">${arcs}${labs}${needle}${box}</svg>`;
}
/* --- 5. DONA --- */
export function vDona(i,W,H){
  const {st,pct,med}=statusOf(i);
  if(!med)return noData(W,H);
  const cx=W/2,cy=H*0.44,r=Math.min(W*0.26,H*0.36),ri=r*0.66;
  const p=pct==null?0:Math.max(0,Math.min(pct,1));
  const col=STC[st]||C.blue;
  let rg=ring(cx,cy,r,ri,-90,359.9,'#eef1f6');
  if(p>0)rg+=ring(cx,cy,r,ri,-90,Math.max(p*360,1),col);
  return `<svg viewBox="0 0 ${W} ${H}" class="cx">${rg}
    <text x="${cx}" y="${cy+3}" text-anchor="middle" font-size="25" font-weight="800" fill="${col}">${pct==null?'—':Math.round(pct*100)+'%'}</text>
    <text x="${cx}" y="${cy+21}" text-anchor="middle" font-size="10.5" fill="${C.axis}">de la meta</text>
    <text x="${cx}" y="${H-26}" text-anchor="middle" font-size="19" font-weight="800" fill="${C.ink}">${fmtNum(med.valor,i.unidad)}</text>
    <text x="${cx}" y="${H-9}" text-anchor="middle" font-size="10.5" fill="${C.axis}">${periodLabel(med.periodo)}${i.meta!=null?' · Meta '+fmtNum(i.meta,i.unidad):''}</text></svg>`;
}
/* --- 6. TERMÓMETRO --- */
export function vTermometro(i,W,H){
  const {st,pct,med}=statusOf(i);
  if(!med)return noData(W,H);
  const col=STC[st]||C.blue;
  const x=W*0.16,w=42,top=26,bot=H-54,hgt=bot-top;
  const p=pct==null?0:Math.max(0,Math.min(pct,1.25))/1.25;
  const fh=hgt*p;
  const metaY=i.meta!=null?top+hgt*(1-1/1.25):null;
  const tx=x+w+34;
  return `<svg viewBox="0 0 ${W} ${H}" class="cx">
    <rect x="${x}" y="${top}" width="${w}" height="${hgt}" rx="${w/2}" fill="#eef1f6"/>
    <rect x="${x}" y="${(bot-fh).toFixed(1)}" width="${w}" height="${fh.toFixed(1)}" rx="${w/2}" fill="${col}"/>
    <circle cx="${x+w/2}" cy="${bot+16}" r="${w*0.66}" fill="${col}"/>
    ${metaY!=null?`<line x1="${x-11}" y1="${metaY.toFixed(1)}" x2="${x+w+11}" y2="${metaY.toFixed(1)}" stroke="${C.meta}" stroke-width="2.4" stroke-dasharray="5 3"/>
    <text x="${x+w+15}" y="${(metaY+4).toFixed(1)}" font-size="10.5" font-weight="700" fill="${C.meta}">Meta ${valLabel(i.meta,i.unidad)}</text>`:''}
    <text x="${tx}" y="${top+66}" font-size="26" font-weight="800" fill="${C.ink}">${fmtNum(med.valor,i.unidad)}</text>
    <text x="${tx}" y="${top+87}" font-size="11.5" fill="${C.axis}">${periodLabel(med.periodo)}</text>
    <text x="${tx}" y="${top+115}" font-size="14" font-weight="800" fill="${col}">${pct==null?'Seguimiento':Math.round(pct*100)+'% de la meta'}</text>
  </svg>`;
}
/* --- 7. BARRAS HORIZONTALES --- */
export function vBarrasH(i,W,H){
  const d=serie(i,6); if(!d.length)return noData(W,H);
  const pl=64,pr=54,pt=16;
  const max=Math.max(...d.map(x=>x.v),i.meta||0)*1.05||1;
  const bh=Math.min(26,(H-pt-14)/d.length-8);
  const rows=d.map((x,k)=>{
    const y=pt+k*((H-pt-14)/d.length);
    const w=Math.max(2,(x.v/max)*(W-pl-pr));
    return `<text x="${pl-8}" y="${(y+bh/2+4).toFixed(1)}" text-anchor="end" font-size="10.5" fill="${C.axis}">${shortLabel(x.p)}</text>
    <rect x="${pl}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${STC[x.st]}"><title>${fmtNum(x.v,i.unidad)}</title></rect>
    <text x="${(pl+w+7).toFixed(1)}" y="${(y+bh/2+4).toFixed(1)}" font-size="11" font-weight="800" fill="${C.ink}">${valLabel(x.v,i.unidad)}</text>`;
  }).join('');
  const mx=i.meta!=null?pl+(i.meta/max)*(W-pl-pr):null;
  return `<svg viewBox="0 0 ${W} ${H}" class="cx">${rows}
  ${mx!=null?`<line x1="${mx.toFixed(1)}" y1="${pt-6}" x2="${mx.toFixed(1)}" y2="${H-16}" stroke="${C.meta}" stroke-width="2.2"/><text x="${mx.toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="10" font-weight="700" fill="${C.meta}">Meta</text>`:''}</svg>`;
}
/* --- 8. SEMÁFORO --- */
export function vSemaforo(i,W,H){
  const {st,pct,med}=statusOf(i);
  const on=st==='neutral'?null:st;
  const cx=W*0.24,r=Math.min(W*0.075,26);
  const lights=[['red',C.red],['yellow',C.yellow],['green',C.green]];
  const body=`<rect x="${cx-r-14}" y="${H*0.5-3*r-24}" width="${(r+14)*2}" height="${6*r+34}" rx="${r*0.9}" fill="#1f2937"/>`;
  const circles=lights.map((L,k)=>`<circle cx="${cx}" cy="${H*0.5-2*r-4+k*(2*r+6)}" r="${r}" fill="${L[1]}" opacity="${on===L[0]?1:.16}"${on===L[0]?' stroke="#fff" stroke-width="2.5"':''}/>`).join('');
  const tx=W*0.46;
  return `<svg viewBox="0 0 ${W} ${H}" class="cx">${body}${circles}
    <text x="${tx}" y="${H*0.40}" font-size="27" font-weight="800" fill="${C.ink}">${med?fmtNum(med.valor,i.unidad):'—'}</text>
    <text x="${tx}" y="${H*0.40+20}" font-size="11" fill="${C.axis}">${med?periodLabel(med.periodo):'Sin datos'}${i.meta!=null?' · Meta '+fmtNum(i.meta,i.unidad):''}</text>
    <text x="${tx}" y="${H*0.40+50}" font-size="15" font-weight="800" fill="${STC[st]||C.axis}">${on?(pct!=null?Math.round(pct*100)+'% · ':'')+(st==='green'?'EN META':st==='yellow'?'EN RIESGO':'CRÍTICO'):'SEGUIMIENTO'}</text></svg>`;
}
/* --- 9. NÚMERO GRANDE --- */
export function vNumero(i,W,H){
  const {st,pct,med}=statusOf(i);
  if(!med)return noData(W,H);
  const col=STC[st]||C.blue;
  const m=meds(i.id),prev=m.length>1?m[m.length-2].valor:null;
  const dlt=prev!=null&&prev!==0?((med.valor-prev)/Math.abs(prev))*100:null;
  const good=dlt==null?null:(i.dir==='down'?dlt<0:dlt>0);
  return `<svg viewBox="0 0 ${W} ${H}" class="cx">
    <rect x="8" y="10" width="${W-16}" height="${H-20}" rx="12" fill="${col}" opacity=".07"/>
    <text x="${W/2}" y="${H*0.46}" text-anchor="middle" font-size="42" font-weight="800" fill="${col}">${med?fmtNum(med.valor,i.unidad):'—'}</text>
    <text x="${W/2}" y="${H*0.46+24}" text-anchor="middle" font-size="12" fill="${C.axis}">${periodLabel(med.periodo)}${i.meta!=null?' · Meta '+fmtNum(i.meta,i.unidad):''}</text>
    ${dlt!=null?`<text x="${W/2}" y="${H*0.46+50}" text-anchor="middle" font-size="14" font-weight="800" fill="${good?C.green:C.red}">${dlt>0?'▲':'▼'} ${Math.abs(dlt).toFixed(1)}% vs periodo anterior</text>`:''}
    ${pct!=null?`<text x="${W/2}" y="${H-14}" text-anchor="middle" font-size="12.5" font-weight="800" fill="${col}">Cumplimiento ${Math.round(pct*100)}%</text>`:''}</svg>`;
}
/* --- 10. BULLET / BALA --- */
export function vBala(i,W,H){
  const {st,pct,med}=statusOf(i);
  if(!med)return noData(W,H);
  const pl=18,pr=18,y=H*0.52,bh=30;
  const maxv=Math.max(med.valor,i.meta||0)*1.28||1;
  const sc=v=>pl+(v/maxv)*(W-pl-pr);
  const zr=i.meta!=null?[i.meta*(i.amarillo/100),i.meta*(i.verde/100)]:[0,0];
  const zones=i.meta!=null&&i.dir!=='monitor'?`
    <rect x="${pl}" y="${y-bh/2-7}" width="${(sc(zr[0])-pl).toFixed(1)}" height="${bh+14}" fill="${C.red}" opacity=".13"/>
    <rect x="${sc(zr[0]).toFixed(1)}" y="${y-bh/2-7}" width="${(sc(zr[1])-sc(zr[0])).toFixed(1)}" height="${bh+14}" fill="${C.yellow}" opacity=".16"/>
    <rect x="${sc(zr[1]).toFixed(1)}" y="${y-bh/2-7}" width="${(W-pr-sc(zr[1])).toFixed(1)}" height="${bh+14}" fill="${C.green}" opacity=".13"/>`:'';
  return `<svg viewBox="0 0 ${W} ${H}" class="cx">${zones}
    <rect x="${pl}" y="${y-bh/2}" width="${(sc(med.valor)-pl).toFixed(1)}" height="${bh}" rx="4" fill="${STC[st]||C.blue}"/>
    ${i.meta!=null?`<line x1="${sc(i.meta).toFixed(1)}" y1="${y-bh/2-11}" x2="${sc(i.meta).toFixed(1)}" y2="${y+bh/2+11}" stroke="#111827" stroke-width="3.5"/>
    <text x="${sc(i.meta).toFixed(1)}" y="${y+bh/2+26}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">Meta ${valLabel(i.meta,i.unidad)}</text>`:''}
    <text x="${pl}" y="${y-bh/2-16}" font-size="20" font-weight="800" fill="${C.ink}">${fmtNum(med.valor,i.unidad)}</text>
    <text x="${W-pr}" y="${y-bh/2-16}" text-anchor="end" font-size="12.5" font-weight="800" fill="${STC[st]||C.axis}">${pct!=null?Math.round(pct*100)+'%':periodLabel(med.periodo)}</text></svg>`;
}
/* --- DESPACHADOR --- */
export function vizType(i){
  const v=i.viz||'auto';
  if(v==='auto')return i.dir==='monitor'?'linea':'columnas';
  if(v==='barra')return 'columnas';
  if(v==='gauge')return 'velocimetro';
  return v;
}
export function renderChart(i,W,H,tipo){
  const t=tipo||vizType(i);
  try{
    switch(t){
      case 'columnas':return vColumnas(i,W,H);
      case 'linea':return vLinea(i,W,H);
      case 'area':return vArea(i,W,H);
      case 'velocimetro':return vVelocimetro(i,W,H);
      case 'dona':return vDona(i,W,H);
      case 'termometro':return vTermometro(i,W,H);
      case 'barrasH':return vBarrasH(i,W,H);
      case 'semaforo':return vSemaforo(i,W,H);
      case 'numero':return vNumero(i,W,H);
      case 'bala':return vBala(i,W,H);
      default:return vColumnas(i,W,H);
    }
  }catch(e){return noData(W,H,'No se pudo graficar');}
}
