import { currentPeriod, ind, meds, obj, periodOf, persp, setMed, user } from '../model.js';
import { nav, render } from '../router.js';
import { DB, save, setDB } from '../state.js';
import { $, esc, toast } from '../ui.js';

export let csvPreview=null;
/* ================= IMPORTAR / EXPORTAR ================= */

export function renderDatos(c){
  c.innerHTML=`<div class="grid g2" style="align-items:start">
    <div class="card" style="padding:22px">
      <div class="section-head"><h3>📥 Importar archivo plano (CSV)</h3></div>
      <p class="help" style="margin-bottom:14px">La plataforma lee el archivo y alimenta los indicadores automáticamente. Formato esperado (con encabezados):<br>
      <code style="background:var(--gray-bg);padding:2px 7px;border-radius:6px;font-size:11.5px">indicador, periodo, valor</code><br><br>
      · <b>indicador</b>: nombre exacto o ID del KPI<br>
      · <b>periodo</b>: <code>2026-07</code> (mes), <code>2026-T3</code> (trimestre), <code>2026-S28</code> (semana), <code>2026-07-14</code> (día) — o una fecha, y se convierte según la frecuencia del indicador<br>
      · <b>valor</b>: número (usa punto decimal)</p>
      <div class="drop" id="drop">Arrastra tu archivo aquí<br>o<br><br><button class="btn primary" onclick="document.getElementById('file-csv').click()">Elegir archivo…</button>
      <input type="file" id="file-csv" accept=".csv,.txt,.tsv" style="display:none"></div>
      <div style="margin-top:12px"><button class="btn sm" onclick="downloadTemplate()">⬇ Descargar plantilla CSV</button></div>
      <div id="csv-result" style="margin-top:14px"></div>
    </div>
    <div>
      <div class="card" style="padding:22px;margin-bottom:16px">
        <div class="section-head"><h3>📤 Exportar</h3></div>
        <p class="help" style="margin-bottom:12px">Descarga tus datos para reportes o análisis en Excel.</p>
        <button class="btn" onclick="exportCSV()">⬇ Mediciones (CSV)</button>
        <button class="btn" onclick="exportIndCSV()">⬇ Catálogo de indicadores (CSV)</button>
      </div>
      <div class="card" style="padding:22px">
        <div class="section-head"><h3>💾 Respaldo completo</h3></div>
        <p class="help" style="margin-bottom:12px">Los datos viven en este navegador. <b>Descarga un respaldo con regularidad</b> y compártelo o restáuralo en otra computadora — así varios responsables pueden trabajar sobre la misma base.</p>
        <button class="btn primary" onclick="exportJSON()">⬇ Descargar respaldo (.json)</button>
        <button class="btn" onclick="document.getElementById('file-json').click()">⬆ Restaurar respaldo</button>
        <input type="file" id="file-json" accept=".json" style="display:none">
      </div>
    </div>
  </div>`;
  const drop=$('#drop');
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over');};
  drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');if(e.dataTransfer.files[0])readCSVFile(e.dataTransfer.files[0]);};
  $('#file-csv').onchange=e=>{if(e.target.files[0])readCSVFile(e.target.files[0]);};
  $('#file-json').onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=()=>{try{
      const d=JSON.parse(r.result);
      if(!d.indicadores||!d.perspectivas)throw 0;
      if(!confirm('Esto reemplazará TODOS los datos actuales por el respaldo. ¿Continuar?'))return;
      setDB(d);save();render();toast('✓ Respaldo restaurado');
    }catch(_){toast('⚠ El archivo no es un respaldo válido');}};
    r.readAsText(f);
  };
}
export function parseCSV(text){
  const rows=[];let row=[],cell='',q=false;
  for(let k=0;k<text.length;k++){
    const ch=text[k];
    if(q){ if(ch==='"'){ if(text[k+1]==='"'){cell+='"';k++;} else q=false; } else cell+=ch; }
    else if(ch==='"')q=true;
    else if(ch===','||ch===';'||ch==='\t'){row.push(cell);cell='';}
    else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[k+1]==='\n')k++; row.push(cell);cell=''; if(row.some(x=>x.trim()!==''))rows.push(row); row=[]; }
    else cell+=ch;
  }
  if(cell!==''||row.length){row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row);}
  return rows;
}
export function readCSVFile(f){
  const r=new FileReader();
  r.onload=()=>{
    const rows=parseCSV(r.result);
    if(rows.length<2)return toast('⚠ El archivo está vacío o no tiene datos');
    const head=rows[0].map(h=>h.trim().toLowerCase());
    const ci=head.findIndex(h=>['indicador','kpi','indicator','nombre','id'].includes(h));
    const cp=head.findIndex(h=>['periodo','period','fecha','date','mes'].includes(h));
    const cv=head.findIndex(h=>['valor','value','dato','resultado'].includes(h));
    if(ci<0||cp<0||cv<0)return $('#csv-result').innerHTML='<p class="help" style="color:var(--red)">⚠ No encontré las columnas <b>indicador</b>, <b>periodo</b> y <b>valor</b> en los encabezados. Descarga la plantilla para ver el formato.</p>';
    const items=[];
    rows.slice(1).forEach(rw=>{
      const rawI=(rw[ci]||'').trim(), rawP=(rw[cp]||'').trim(), rawV=(rw[cv]||'').trim().replace(/\$|,/g,'');
      const i=DB.indicadores.find(x=>x.id===rawI||x.nombre.toLowerCase()===rawI.toLowerCase());
      const valor=parseFloat(rawV);
      let periodo=rawP;
      if(i&&/^\d{4}-\d{2}-\d{2}/.test(rawP))periodo=periodOf(rawP.slice(0,10),i.frec);
      items.push({rawI,periodo,valor,ind:i,ok:!!i&&!isNaN(valor)&&!!periodo});
    });
    csvPreview=items;
    const ok=items.filter(x=>x.ok).length;
    $('#csv-result').innerHTML=`<div class="card" style="padding:14px;background:var(--surface2)">
      <b>${items.length} filas leídas</b> · <span style="color:var(--green)">${ok} listas para importar</span>${items.length-ok?` · <span style="color:var(--red)">${items.length-ok} con problemas</span>`:''}
      <div style="max-height:220px;overflow:auto;margin-top:10px"><table class="tbl">
        <thead><tr><th></th><th>Indicador</th><th>Periodo</th><th>Valor</th></tr></thead><tbody>
        ${items.slice(0,60).map(x=>`<tr><td>${x.ok?'✅':'❌'}</td><td>${x.ind?esc(x.ind.nombre):'<span style="color:var(--red)">'+esc(x.rawI)+' (no existe)</span>'}</td><td>${esc(x.periodo)}</td><td>${isNaN(x.valor)?'<span style="color:var(--red)">inválido</span>':x.valor}</td></tr>`).join('')}
        </tbody></table></div>
      ${ok?`<button class="btn primary" style="margin-top:12px" onclick="applyCSV()">✓ Importar ${ok} mediciones</button>`:''}
    </div>`;
  };
  r.readAsText(f);
}
export function applyCSV(){
  let n=0;
  csvPreview.filter(x=>x.ok).forEach(x=>{setMed(x.ind.id,x.periodo,x.valor,null,'Importado CSV');n++;});
  csvPreview=null;toast('✓ '+n+' mediciones importadas');nav('dashboard');
}
export function dl(name,content,type){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['﻿'+content],{type:type||'text/csv;charset=utf-8'}));
  a.download=name;a.click();URL.revokeObjectURL(a.href);
}
export function downloadTemplate(){
  const rows=DB.indicadores.filter(i=>i.activo).map(i=>`"${i.nombre}",${currentPeriod(i.frec)},`);
  dl('plantilla_bsc.csv','indicador,periodo,valor\n'+rows.join('\n'));
}
export function exportCSV(){
  let out='indicador,perspectiva,periodo,valor,unidad,meta,nota\n';
  DB.indicadores.forEach(i=>meds(i.id).forEach(m=>{out+=`"${i.nombre}","${persp(i.pid).nombre}",${m.periodo},${m.valor},"${i.unidad}",${i.meta??''},"${(m.nota||'').replace(/"/g,'""')}"\n`;}));
  dl('bsc_mediciones.csv',out);
}
export function exportIndCSV(){
  let out='id,indicador,perspectiva,objetivo,responsable,unidad,direccion,meta,frecuencia,umbral_verde,umbral_amarillo,activo\n';
  DB.indicadores.forEach(i=>{out+=`${i.id},"${i.nombre}","${persp(i.pid).nombre}","${obj(i.oid)?.nombre||''}","${user(i.resp)?.nombre||''}","${i.unidad}",${i.dir},${i.meta??''},${i.frec},${i.verde},${i.amarillo},${i.activo?'sí':'no'}\n`;});
  dl('bsc_indicadores.csv',out);
}
export function exportJSON(){
  dl('bsc_respaldo_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(DB,null,1),'application/json');
}
