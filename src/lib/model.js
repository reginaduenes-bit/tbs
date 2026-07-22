import { DB, save } from './state.js';

export const persp=id=>DB.perspectivas.find(p=>p.id===id);
export const user=id=>DB.usuarios.find(u=>u.id===id);
export const obj=id=>DB.objetivos.find(o=>o.id===id);
export const ind=id=>DB.indicadores.find(i=>i.id===id);
export function fmtNum(v,unidad){
  if(v==null||isNaN(v))return '—';
  let s;
  if(Math.abs(v)>=1000000) s=(v/1000000).toLocaleString('es-MX',{maximumFractionDigits:2})+' M';
  else s=Number(v).toLocaleString('es-MX',{maximumFractionDigits:2});
  if(unidad==='%')return s+'%';
  if(unidad==='MXN')return '$'+s;
  if(unidad==='USD')return '$'+s+' USD';
  return s+(unidad?' '+unidad:'');
}
export function pad(n){return String(n).padStart(2,'0');}
export function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return [t.getUTCFullYear(),Math.ceil((((t-y0)/864e5)+1)/7)];}
export function periodOf(date,frec){
  const d=date instanceof Date?date:new Date(date+'T12:00:00');
  if(frec==='diaria')return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  if(frec==='semanal'){const[y,w]=isoWeek(d);return y+'-S'+pad(w);}
  if(frec==='trimestral')return d.getFullYear()+'-T'+(Math.floor(d.getMonth()/3)+1);
  if(frec==='anual')return String(d.getFullYear());
  return d.getFullYear()+'-'+pad(d.getMonth()+1);
}
export function currentPeriod(frec){return periodOf(new Date(),frec);}
export function prevPeriods(frec,n){
  const out=[];const d=new Date();
  for(let k=0;k<n;k++){
    out.unshift(periodOf(d,frec));
    if(frec==='diaria')d.setDate(d.getDate()-1);
    else if(frec==='semanal')d.setDate(d.getDate()-7);
    else if(frec==='trimestral')d.setMonth(d.getMonth()-3);
    else if(frec==='anual')d.setFullYear(d.getFullYear()-1);
    else d.setMonth(d.getMonth()-1);
  }
  return [...new Set(out)];
}
export function periodLabel(p){
  if(/^\d{4}-\d{2}$/.test(p)){const m=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];return m[+p.slice(5)-1]+' '+p.slice(0,4);}
  if(/-T\d$/.test(p))return p.replace('-T',' · T');
  if(/-S\d+$/.test(p))return p.replace('-S',' · Sem ');
  return p;
}
export const FREC_LABEL={diaria:'Diaria',semanal:'Semanal',mensual:'Mensual',trimestral:'Trimestral',anual:'Anual'};

/* ---------- MEDICIONES & SEMÁFORO ---------- */
export function meds(iid){return (DB.mediciones[iid]||[]).slice().sort((a,b)=>a.periodo<b.periodo?-1:1);}
export function lastMed(iid){const m=meds(iid);return m.length?m[m.length-1]:null;}
export function setMed(iid,periodo,valor,quien,nota){
  if(!DB.mediciones[iid])DB.mediciones[iid]=[];
  const arr=DB.mediciones[iid];
  const ex=arr.find(m=>m.periodo===periodo);
  if(ex){ex.valor=valor;ex.quien=quien;ex.fecha=new Date().toISOString();if(nota!==undefined)ex.nota=nota;}
  else arr.push({periodo,valor,quien,fecha:new Date().toISOString(),nota:nota||''});
  save();
}
export function scoreOf(i,valor){
  if(i.dir==='monitor'||i.meta==null||valor==null)return null;
  let pct;
  if(i.dir==='down'){ pct = valor<=0 ? 1.5 : i.meta/valor; }
  else { pct = i.meta==0 ? (valor>=0?1:0) : valor/i.meta; }
  return Math.max(0,Math.min(pct,2));
}
export function statusOf(i){
  const m=lastMed(i.id);
  if(!m)return {st:'gray',pct:null,med:null};
  const pct=scoreOf(i,m.valor);
  if(pct==null)return {st:'neutral',pct:null,med:m};
  const st = pct>=i.verde/100?'green':(pct>=i.amarillo/100?'yellow':'red');
  return {st,pct,med:m};
}
export function perspStats(pid){
  const list=DB.indicadores.filter(i=>i.activo&&i.pid===pid);
  let g=0,y=0,r=0,s=0,w=0;
  list.forEach(i=>{
    const {st,pct}=statusOf(i);
    if(st==='green')g++;else if(st==='yellow')y++;else if(st==='red')r++;
    if(pct!=null){s+=Math.min(pct,1.2)*(i.peso||1);w+=(i.peso||1);}
  });
  return {total:list.length,g,y,r,score:w?Math.round(s/w*100):null};
}
export function trendOf(iid){
  const m=meds(iid);
  if(m.length<2)return 0;
  const a=m[m.length-2].valor,b=m[m.length-1].valor;
  return b>a?1:(b<a?-1:0);
}
