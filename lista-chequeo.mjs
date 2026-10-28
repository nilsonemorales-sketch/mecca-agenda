/* LISTA DE CHEQUEO — se corre ANTES DE CADA PUBLICACIÓN (v134).

   Un solo archivo: la prueba, los datos inventados con semilla fija y el
   comparador. Abre dos versiones del app en Chromium, les hace las mismas
   preguntas y dice, renglón por renglón, si contestan IGUAL o DISTINTO.

     node lista-chequeo.mjs                     → HEAD (lo publicado) contra index.html de la copia
     node lista-chequeo.mjs main index.html     → cualquier par: una rama, un commit o un archivo
     node lista-chequeo.mjs a86892f HEAD --fotos /tmp/f   → además, capturas a 390 de los formularios

   NUNCA TOCA LA BASE DE PRODUCCIÓN. El candado va en la RUTA del navegador
   (`ctx.route`), no envolviendo `window.sb`: así ni el arranque del app se
   escapa. Todo lo que va a Supabase lo contesta el doble de abajo, en memoria;
   lo que va a cualquier otro sitio se corta. Al final dice cuántas
   escrituras se interceptaron y cuántas salidas se cortaron.

   Por qué existe: los arneses de regresión vivían en el scratchpad y el
   contenedor se reinició DOS veces llevándoselos (v130, v133). Los datos son
   INVENTADOS — 700 actividades, 26 contratistas — porque las pruebas contra la
   base real ayudaron a gastar el egress que tumbó el app el 21-sep.

   Lo COMÚN (tiene que dar igual en las dos) va en la tabla. Lo PROPIO de cada
   versión —medidas de formularios, lo que manda una alta— se imprime aparte
   para leerlo, no para compararlo: cambia a propósito cuando una versión toca
   esa pantalla.

   Si un renglón sale DISTINTO a propósito, se dice en el commit por qué. */
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import http from 'http';
import path from 'path';

const require=createRequire('/opt/node22/lib/node_modules/');
let chromium;
try{ ({chromium}=require('playwright')); }catch(e){ ({chromium}=createRequire(import.meta.url)('playwright')); }
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const RAIZ=path.dirname(new URL(import.meta.url).pathname);

// ── argumentos ─────────────────────────────────────────────────────────────
const args=process.argv.slice(2);
const FOTOS=(()=>{const i=args.indexOf('--fotos'); if(i<0) return ''; const d=args[i+1]; args.splice(i,2); mkdirSync(d,{recursive:true}); return d;})();
const JSONOUT=(()=>{const i=args.indexOf('--json'); if(i<0) return false; args.splice(i,1); return true;})();
const VERS=[args[0]||'HEAD', args[1]||'index.html'];
function leerVersion(v){
  const f=path.resolve(RAIZ,v);
  if(existsSync(f)) return readFileSync(f);
  return execFileSync('git',['show',v+':index.html'],{cwd:RAIZ,maxBuffer:64<<20});
}

// ── los datos inventados, con semilla fija ─────────────────────────────────
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function datos(){
  const R=rng(133), pick=a=>a[Math.floor(R()*a.length)];
  const AREAS=['N2 — Apto 2A','N2 — Apto 2B','N3 — Apto 3A','N3 — Apto 3B','N4 — Apto 4A','N4 — Apto 4B',
    'N5 — Apto 5A','N5 — Apto 5B','N6 — Apto 6A','N6 — Apto 6B','N7 — Penthouse','Parqueo',
    'Escalera Principal','General','N7 — Áreas Comunes N7',''];
  const CONT=['Daniel Espinal','Dimedes Estebez (Niño)','Yelson Jimenez','Jordy','Milo','Alexander Ramos','Felix y Jefrey','Ing. Uriel'];
  // 26 contratistas registrados, como en la obra: los 8 de arriba tienen trabajo, los otros 18 no.
  const CONT_REG=CONT.concat(['Laura Gonel','Jose Lantigua','Rafael Peña','Cristian Almonte','Eduardo Tavárez','Wilson Cruz',
    'Ramón Ureña','Héctor Gil','Juan Carlos Díaz','Pedro Núñez','Santos Reyes','Manuel Abreu','Ángel Ventura',
    'Luis Batista','Franklin Rosario','Domingo Polanco','Yunior Marte','Ernesto Liriano']);
  const PROP=['Antonio','Gregory','Maison'];
  const PROP_REG=PROP.concat(['Bienvenido','Carlos','Elvin','Fausto']);   // 7 propios, como en la obra
  const ING=['Ing. Nilson','Ing. Karina Breton'];
  const TAREAS=['Instalación de puerta','Revestimiento cerámica baño','Pintura de paredes','Colocación de porcelanato',
    'Enderezar llaves de codo','Instalación de luces','Limpieza de entrega','Resane de alambrado','Gabinetes de cocina','Zócalos'];
  const iso=d=>{const x=new Date('2026-10-13T12:00:00');x.setDate(x.getDate()+d);return x.toISOString().slice(0,10);};
  const ACTS=[];
  for(let i=0;i<700;i++){
    const tp=R()<0.75?'contratista':R()<0.7?'propio':R()<0.8?'ingeniero':'';
    const est=R()<0.45?'completado':R()<0.25?'en-progreso':'pendiente';
    const pct=est==='completado'?100:est==='en-progreso'?pick([25,50,75]):0;
    const ff=R()<0.08?'':iso(Math.floor(R()*80)-50);
    const conMed=R()<0.04;
    ACTS.push({id:'a'+i, descripcion:pick(TAREAS)+' '+(i%37), area:pick(AREAS), estado:est, porcentaje:String(pct),
      tipo_personal:tp, personal_nombre:tp==='propio'?pick(PROP):tp==='ingeniero'?pick(ING):(R()<0.04?'':pick(CONT)),
      ingeniero_nombre:pick(ING), ingeniero_id:'nilson', fecha:iso(-60), fecha_inicio:iso(-70), fecha_fin:ff,
      fecha_plan:R()<0.1?iso(0):null, hora_inicio:R()<0.5?'08:00':null, hora_fin:null,
      created_at:'2026-07-01T10:00:00Z', prioridad:R()<0.1?'urgente':'normal', notas:R()<0.5?'nota '+i:'',
      fotos:R()<0.14?'https://x/'+i+'.jpg':'', foto_pendiente:false,
      predecesoras:(i>10&&R()<0.12)?JSON.stringify([{id:'a'+(i-3),tipo:'FS',lag:0}]):null,
      requiere_arq:R()<0.04, unidad:conMed?'m²':'', cantidad_plan:conMed?12:0, cantidad_real:conMed?3:0, plan_id:null});
  }
  // a1: abierta, con medición y UN contratista — editar sin tocar no puede perder nada
  Object.assign(ACTS[1],{estado:'pendiente',porcentaje:'0',unidad:'m²',cantidad_plan:12,cantidad_real:3,tipo_personal:'contratista',personal_nombre:'Daniel Espinal',area:'N2 — Apto 2A',descripcion:'Revestimiento medido 1'});
  // a2: abierta, con DOS contratistas y uno que ya no está registrado — el caso que se pierde si el escogedor solo sabe de los registrados
  Object.assign(ACTS[2],{estado:'pendiente',porcentaje:'0',tipo_personal:'contratista',personal_nombre:'Milo, Contratista Viejo',area:'N3 — Apto 3A',descripcion:'Dos contratistas 2',fecha_inicio:iso(-5),fecha_fin:iso(10)});
  // a3: abierta, personal propio con dos trabajadores
  Object.assign(ACTS[3],{estado:'pendiente',porcentaje:'0',tipo_personal:'propio',personal_nombre:'Antonio, Gregory',area:'N4 — Apto 4A',descripcion:'Propio dos 3'});
  const PERS=CONT_REG.map((n,i)=>({id:'pc'+i,nombre:n,tipo:'contratista',activo:true,oficio:'Oficio '+(i%5)}))
    .concat(PROP_REG.map((n,i)=>({id:'pp'+i,nombre:n,tipo:'propio',activo:true,oficio:'Ayudante'})));
  const OCS=[0,1,2,3].map(k=>({id:'oc'+k,numero_orden:'OC-0'+(90+k),fecha:'2026-09-2'+k,descripcion:'Orden '+k,proveedor:'Ferretería',
    estado:['pendiente','aprobada','recibida','borrador'][k],subtotal:0,descuento:0,itbis_pct:0.18,envio_monto:0,otro_monto:0,total:0,
    created_at:'2026-09-20T10:00:00Z',ingeniero_nombre:'Ing. Nilson',
    items_json:[1,2,3].map(n=>Object.assign({no:n,descripcion:'Material '+n,cantidad:n,unidad:'Ud',precio:100*n,total:100*n*n,verificado:false},
      k===1&&n===1?{partida_id:'es_p9',partida:'Plomería'}:{}))}));
  const PLAN=[0,1,2].map(k=>({id:'pl'+k,nombre:'Plan '+k,orden:k}));
  const CAMBIOS=ACTS.filter((a,i)=>a.estado!=='completado'&&i%5===0).map(a=>({entidad_id:a.id,fecha:iso(-3)}));
  return {ACTS,PERS,OCS,PLAN,CAMBIOS,CONFIG:{}};
}

// ── un servidor por versión, en 127.0.0.1 ──────────────────────────────────
function servir(html){
  return new Promise(res=>{
    const s=http.createServer((q,r)=>{
      const u=decodeURIComponent(q.url.split('?')[0]);
      if(u==='/'||u==='/index.html'){ r.writeHead(200,{'content-type':'text/html; charset=utf-8'}); return r.end(html); }
      const f=path.join(RAIZ,path.normalize(u).replace(/^(\.\.[\/\\])+/,''));
      if(f.startsWith(RAIZ)&&existsSync(f)&&!/\.git/.test(f)){ r.writeHead(200); return r.end(readFileSync(f)); }
      r.writeHead(404); r.end();
    });
    s.listen(0,'127.0.0.1',()=>res(s));
  });
}

// ── la prueba: la misma para las dos ───────────────────────────────────────
async function probar(nombreVer, html, b){
  const D=datos(); const {ACTS,PERS,OCS,PLAN,CAMBIOS,CONFIG}=D;
  const ESCR=[], ESCRDET=[], LECT=[], CORTADAS=[];
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  await ctx.addInitScript(()=>{ window.confirm=()=>true; window.alert=()=>{}; });
  const p=await ctx.newPage();
  const errores=[];
  p.on('pageerror',e=>errores.push(String(e&&e.message||e).split('\n')[0]));
  const ok=(r,body)=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  // EL CANDADO. Nada sale: lo nuestro se sirve, Supabase lo contesta el doble, lo demás se corta.
  await ctx.route('**', r=>{
    const u=r.request().url(), m=r.request().method();
    if(u.startsWith(ORIGEN)) return r.continue();
    if(!/\/rest\/v1\//.test(u)){ CORTADAS.push(u.slice(0,60)); return r.abort(); }
    const pth=decodeURIComponent(u.split('/rest/v1/')[1]||''), base=pth.split('?')[0];
    if(m!=='GET'){
      const body=r.request().postData()||'';
      ESCR.push(m+' '+base); ESCRDET.push({m,base,path:pth,body});
      try{
        const d=body?JSON.parse(body):null;
        if(base==='obra_config'&&d&&d.key) CONFIG[d.key]=d.value;
        if(base==='obra_actividades'&&m==='POST'){ (Array.isArray(d)?d:[d]).forEach(x=>ACTS.push(Object.assign({},x))); return ok(r,Array.isArray(d)?d:[d]); }
        if(base==='obra_actividades'&&m==='PATCH'){ const mm=pth.match(/id=eq\.([^&]+)/); if(mm) ACTS.filter(x=>x.id===mm[1]).forEach(x=>Object.assign(x,d)); }
      }catch(e){}
      return ok(r,[]);
    }
    LECT.push(base);
    let f=[];
    if(base==='obra_actividades'){
      f=ACTS;
      if(/estado=neq\.completado/.test(pth)) f=f.filter(a=>a.estado!=='completado');
      const inn=pth.match(/id=in\.\(([^)]*)\)/); if(inn){const s=new Set(inn[1].split(','));f=f.filter(a=>s.has(a.id));}
      const eq=pth.match(/[?&]id=eq\.([^&]+)/); if(eq) f=f.filter(a=>a.id===eq[1]);
    }
    else if(base==='obra_personal') f=PERS;
    else if(base==='obra_ordenes_compra') f=OCS;
    else if(base==='obra_plan_actividades') f=PLAN;
    else if(base==='obra_config'){ const k=(pth.match(/key=eq\.([^&]+)/)||[])[1]; f=(k&&CONFIG[k]!==undefined)?[{key:k,value:CONFIG[k]}]:[]; }
    else if(base==='obra_cambios'){ if(/entidad=eq\.actividad/.test(pth)&&/fecha=gte/.test(pth)) f=CAMBIOS; }
    const rg=r.request().headers()['range']||'';
    if(rg){ const [d,h]=rg.split('-').map(Number); f=f.slice(d,h+1); }
    return ok(r,f);
  });

  const G=(f,...a)=>p.evaluate(f,...a);
  const arrancar=async()=>{
    await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
    await G(()=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify({id:'nilson',nombre:'Ing. Nilson',rol:'admin'})); }catch(e){} });
    await p.reload({waitUntil:'load'});
    for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
    await p.waitForTimeout(1500);
  };
  await arrancar();
  const lecturasArranque=LECT.slice();
  await G(()=>{
    window.__h=function(s){s=String(s).replace(/v1\d\d\b/g,'vX').replace(/\d{1,2}:\d{2}\s*[ap]\.\s*m\./g,'HH:MM').replace(/2026-1\d-\d\d/g,'FECHA');var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return s.length+'/'+(h>>>0).toString(36);};
    /* Escoger gente en un formulario, en las DOS formas que ha tenido el app:
       las casillas (hasta la v133) y el escogedor de una línea (v134). */
    window.__marcar=function(nombre){
      if(typeof qpPoner==='function' && document.getElementById('qp-a-pers')) return qpPoner('a-pers',nombre,true);
      var cb=Array.from(document.querySelectorAll('input[name="a-pers"]')).find(function(x){return x.value===nombre;});
      if(cb&&!cb.checked) cb.click();   // el clic, como el dedo: corre el onchange entero
    };
    window.__guardar=function(){ Array.from(document.querySelectorAll('.mactions button')).find(function(x){return /saveAct/.test(x.getAttribute('onclick')||'');}).click(); };
  });
  const out={comun:{}, propio:{}};
  out.propio.version=await G(()=>APP_VERSION);
  const C=out.comun;

  // 1 · los ocho filtros rápidos
  C.filtros=await G(()=>{ const run=x=>{S.actFiltroRapidos=x;return applyActFilters(S.acts).length;};
    const r={vencidas:run(['retrasadas']),sinfecha:run(['sinfecha']),sinasignar:run(['sincontratista']),congeladas:run(['congeladas']),
      encurso:run(['en-progreso']),pendiente:run(['pendiente']),completado:run(['completado']),activas:run(['activas']),todas:run([])};
    S.actFiltroRapidos=[]; return r; });
  // 2 · las cuatro vistas
  await G(()=>goTab('actividades')); await p.waitForTimeout(800);
  C.vistas={};
  /* Antes de medir, que termine lo que el arranque pide aparte (el historial de
     15 días de las pastillas, entre otras): con el navegador recién abierto la
     primera versión llegaba aquí antes y la Lista salía DISTINTA por 14
     caracteres sin que el app cambiara (pasó en la v135 y en la v136). */
  await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1500);
  await G(()=>{ S.actVista='lista'; renderActs(); }); await p.waitForTimeout(500);
  for(const v of ['lista','apto','matriz','edificio']){ await G(x=>{S.actVista=x;renderActs();},v); await p.waitForTimeout(700); C.vistas[v]=await G(()=>__h(document.getElementById('c-act').innerText)); }
  // 3 · las ocho agrupaciones de la lista
  await G(()=>{S.actVista='lista';});
  C.agrupar={};
  for(const f of ['tipo','apto','contratista','critico','nivel','personal','responsable','semana']){
    await G(x=>{S.actFiltro=x;renderActs();},f); await p.waitForTimeout(500);
    C.agrupar[f]=await G(()=>__h(document.getElementById('c-act').innerText)); }
  await G(()=>{S.actFiltro='tipo';renderActs();}); await p.waitForTimeout(500);
  // 4 · los renglones de la lista
  /* v144 · Las ocho primeras ABIERTAS, como las abre el dedo: desde la v144 el
     pliegue se arma al abrir la fila, así que cerradas ya no tienen el mismo
     HTML escondido. Lo que tiene que dar igual es lo que se ve al tocarla. Y
     se vuelven a cerrar, para no cambiarle nada a lo que se mide después. */
  C.renglones=await G(()=>{ const fs=Array.from(document.querySelectorAll('#c-act .act-item')).slice(0,8);
    const tocar=f=>{ const b=f.querySelector('[onclick^="toggleActDet"]'); if(b) b.click(); };
    fs.forEach(tocar);
    const h=__h(Array.from(document.querySelectorAll('#c-act .act-item')).slice(0,8).map(x=>x.outerHTML).join(''));
    Array.from(document.querySelectorAll('#c-act .act-item')).slice(0,8).forEach(tocar);
    return h; });
  // 5 · las otras pantallas
  for(const [k,tab,c] of [['obra','terreno','view-terreno'],['compras','compras','view-compras'],['equipo','equipo','view-equipo'],['reportes','reportes','view-reportes'],['partidas','catalogo','view-catalogo']]){
    await G(t=>goTab(t),tab); await p.waitForTimeout(k==='partidas'?1800:900);
    C[k]=await G(id=>{const e=document.getElementById(id);return e?__h(e.innerText):'(no existe)';},c);
  }
  // 6 · Topes
  await G(()=>goTab('topes')); await p.waitForTimeout(900);
  await p.fill('#tp-m1','1778'); await p.fill('#tp-m2','559'); await p.waitForTimeout(400);
  C.topes1778=await G(()=>Array.from(document.querySelectorAll('#tp-res .tp-h strong')).map(x=>x.textContent));
  await p.fill('#tp-m1',''); await p.fill('#tp-m2',''); await p.waitForTimeout(300);

  // 7 · CREAR con el formulario de contratista: qué se manda a la base
  await G(()=>goTab('actividades')); await p.waitForTimeout(600);
  const g7=LECT.length;   // desde aquí se cuentan los GET de los formularios: tienen que dar igual
  const limpiar=o=>{const c=Object.assign({},o);['id','created_at','fecha','ingeniero_id','plan_id'].forEach(k=>delete c[k]);return Object.keys(c).sort().map(k=>k+'='+JSON.stringify(c[k])).join(' | ');};
  const altaCon=async(nombres,desc,area)=>{
    await G(()=>{ try{closeModal();}catch(e){} showAddActContratista(); }); await p.waitForTimeout(700);
    await G(([ns,d,ar])=>{ _ubicacionesSeleccionadas=[ar]; try{renderUbicacionesSeleccionadas();}catch(e){}
      document.getElementById('a-d').value=d; ns.forEach(n=>__marcar(n));
      document.getElementById('a-fi').value='2026-10-15'; document.getElementById('a-ff').value='2026-10-30'; },[nombres,desc,area]);
    const e0=ESCRDET.length; await G(()=>__guardar()); await p.waitForTimeout(1500);
    const al=ESCRDET.slice(e0).find(x=>x.base==='obra_actividades'&&x.m==='POST');
    try{ const d=JSON.parse(al.body); return limpiar(Array.isArray(d)?d[0]:d); }catch(e){ return '(no se creó)'; }
  };
  C.altaUno=await altaCon(['Milo'],'Prueba alta uno','N4 — Apto 4A');
  C.altaDos=await altaCon(['Milo','Jordy'],'Prueba alta dos','N4 — Apto 4B');
  // 7b · sin contratista: no escribe y el aviso SE VE
  await G(()=>{ try{closeModal();}catch(e){} showAddActContratista(); }); await p.waitForTimeout(700);
  await G(()=>{ _ubicacionesSeleccionadas=['N3 — Apto 3B']; document.getElementById('a-d').value='Prueba sin contratista';
    if(typeof qpPoner==='function'&&document.getElementById('qp-a-pers')) qpVaciar('a-pers');
    else { document.querySelectorAll('input[name="a-pers"]').forEach(x=>x.checked=false); updateWorkersField(); }
    document.getElementById('a-fi').value='2026-10-15'; document.getElementById('a-ff').value='2026-10-30'; });
  let e8=ESCRDET.length; await G(()=>__guardar()); await p.waitForTimeout(800);
  C.sinContratista=await G(()=>{const e=document.getElementById('a-pers-err'); return {aviso:!!(e&&e.checkVisibility()), texto:e?e.textContent:null};});
  C.sinContratistaEscribio=ESCRDET.slice(e8).filter(x=>x.base==='obra_actividades').length;
  // 7c · sin fecha de inicio: el aviso SE VE (v133)
  await G(()=>{ try{closeModal();}catch(e){} showAddActContratista(); }); await p.waitForTimeout(700);
  await G(()=>{ _ubicacionesSeleccionadas=['N3 — Apto 3A']; document.getElementById('a-d').value='Prueba sin inicio';
    __marcar('Milo'); document.getElementById('a-fi').value=''; document.getElementById('a-ff').value='2026-10-30'; });
  e8=ESCRDET.length; await G(()=>__guardar()); await p.waitForTimeout(800);
  C.sinInicio=await G(()=>{ const e=document.getElementById('a-fecha-err'); const fi=document.getElementById('a-fi');
    return {hayAviso:!!e, avisoSeVe:!!(e&&e.checkVisibility()), campoSeVe:!!(fi&&fi.checkVisibility()), texto:e?e.textContent:null}; });
  C.sinInicioEscribio=ESCRDET.slice(e8).filter(x=>x.base==='obra_actividades').length;
  await G(()=>{ try{closeModal();}catch(e){} });
  // 8 · EDITAR sin tocar nada: lo que ya tenía, incluido el contratista, no se pierde
  const editar=async(id)=>{
    await G(x=>{ try{closeModal();}catch(e){} editAct(x); },id); await p.waitForTimeout(800);
    const e1=ESCRDET.length; await G(()=>__guardar()); await p.waitForTimeout(1500);
    const ed=ESCRDET.slice(e1).find(x=>x.base==='obra_actividades'&&x.m==='PATCH');
    let d=null; try{ d=JSON.parse(ed.body); }catch(e){}
    return {mandado:d?limpiar(d):'(sin PATCH)', personal:d?d.personal_nombre:null, enLaBase:(ACTS.find(a=>a.id===id)||{}).personal_nombre};
  };
  C.editarMedicion=await editar('a1');
  C.editarDosContratistas=await editar('a2');
  C.editarPropio=await editar('a3');
  await G(()=>{try{closeModal();}catch(e){}});

  // 9 · PROPIO: el formulario a 390 — alto, y si se ve «Agregar» sin bajar
  for(const [nom,fn] of [['propio','showAddActPropio'],['contratista','showAddActContratista'],['ingeniero','showAddActIngeniero']]){
    await G(f=>{ try{closeModal();}catch(e){} _ubicacionesSeleccionadas=[]; window[f](); },fn); await p.waitForTimeout(700);
    out.propio['form_'+nom]=await G(()=>{
      const vis=e=>e.checkVisibility();
      const bt=Array.from(document.querySelectorAll('.mactions button')).filter(x=>/saveAct/.test(x.getAttribute('onclick')||''))[0];
      let sc=bt; while(sc&&sc!==document.body){const cs=getComputedStyle(sc);if(/(auto|scroll)/.test(cs.overflowY)&&sc.scrollHeight>sc.clientHeight)break;sc=sc.parentElement;}
      if(sc&&sc!==document.body) sc.scrollTop=0;
      const r=bt.getBoundingClientRect();
      const toc=Array.from(document.querySelectorAll('#mcontent button, #mcontent summary, #mcontent select, #mcontent input:not([type=hidden]):not([type=checkbox]):not([type=range])')).filter(vis);
      return {altoFormulario:sc&&sc!==document.body?sc.scrollHeight:Math.round(r.bottom), botonAgregarEnY:Math.round(r.bottom), cabeA844:r.bottom<=844,
        bajoDe40:toc.map(x=>({q:(x.id||x.textContent||'').trim().slice(0,18),h:Math.round(x.getBoundingClientRect().height)})).filter(x=>x.h<40),
        scrollLateral:document.documentElement.scrollWidth>document.documentElement.clientWidth};
    });
    if(FOTOS) await p.screenshot({path:path.join(FOTOS,nombreVer+'-'+nom+'.png')});
  }
  await G(()=>{try{closeModal();}catch(e){}});
  C.lecturasEnFormularios=LECT.slice(g7).filter(x=>x!=='obra_asistencia'&&x!=='obra_cambios').reduce((m,x)=>{m[x]=(m[x]||0)+1;return m;},{});

  C.errores=errores.filter(e=>!/ERR_FAILED/.test(e));
  out.propio.lecturasAlArrancar=lecturasArranque.reduce((m,x)=>{m[x]=(m[x]||0)+1;return m;},{});
  out.propio.lecturasTotales=LECT.length;
  out.propio.escrituras=ESCR.reduce((m,x)=>{m[x]=(m[x]||0)+1;return m;},{});
  out.propio.salidasCortadas=CORTADAS.length;
  await ctx.close(); srv.close();
  return out;
}

/* ── EL LIBRO DE PENALIDADES (v135) ──────────────────────────────────────
   Aquí no se compara una versión con otra: se COMPRUEBA contra lo que tiene
   que dar, porque la v135 cambia a propósito lo que escribe y lo que cuenta.
   Por eso estas comprobaciones fallan contra la v134 — así se sabe que miden
   el arreglo y no otra cosa.
   El reloj se fija en el 30-sep-2026 a las 8:30 p. m. de Santo Domingo: último
   día del mes después de las 8, que en hora universal ya es 1-oct. Es la hora
   exacta en que la v134 escribía de más (18 filas el 31-ago en la base). */
const PEN_ESPERADO={
  inactividadFilas:{v:1, d:'tres cargas el último día del mes, 8:30 p. m. (la 3ª como otro aparato): UNA fila de inactividad (Moisés, sin nada hoy)'},
  karinaCerradas:{v:0, d:'Karina con 2 actividades CERRADAS hoy y ninguna abierta: NO recibe penalidad'},
  logDoble:{v:1, d:'el mismo cierre registrado dos veces el mismo día: UNA fila'},
  // La prueba misma escribe hoy (30-sep) la inactividad de Moisés: por eso son 3 y 2, no 2 y 1.
  histSituaciones:{v:3, d:'historial de Moisés: 3 situaciones (inactividad del 29 y del 30 + tardanza), no 136 filas'},
  histInactividad:{v:2, d:'historial de Moisés: inactividad cuenta 2 días aunque el libro tenga 4 filas'},
  sinBorrar:{v:0, d:'cero DELETE y cero PATCH a obra_penalidades en toda la prueba: no se borra ni se cambia ni una fila'},
  histRegistros:{v:2, d:'historial de Moisés: los 131 registros salen en 2 líneas por día (125 cierres · 5 contratistas)'},
};
async function probarLibro(nombreVer, html, b){
  const D=datos(); const {PERS}=D;
  const HOY='2026-09-30';
  const ACTS=[
    {id:'k1',descripcion:'Karina cerrada 1',area:'N4 — Apto 4A',estado:'completado',porcentaje:'100',tipo_personal:'ingeniero',personal_nombre:'Ing. Karina Breton',ingeniero_nombre:'Ing. Karina Breton',ingeniero_id:'karina',fecha:HOY,fecha_inicio:HOY,fecha_fin:HOY,created_at:HOY+'T12:00:00Z'},
    {id:'k2',descripcion:'Karina cerrada 2',area:'N4 — Apto 4B',estado:'completado',porcentaje:'100',tipo_personal:'ingeniero',personal_nombre:'Ing. Karina Breton',ingeniero_nombre:'Ing. Karina Breton',ingeniero_id:'karina',fecha:HOY,fecha_inicio:HOY,fecha_fin:HOY,created_at:HOY+'T13:00:00Z'},
    {id:'v1',descripcion:'Abierta vieja',area:'N2 — Apto 2A',estado:'pendiente',porcentaje:'0',tipo_personal:'contratista',personal_nombre:'Milo',ingeniero_nombre:'Ing. Nilson',ingeniero_id:'nilson',fecha:'2026-09-01',fecha_inicio:'2026-09-01',fecha_fin:'2026-10-20',created_at:'2026-09-01T12:00:00Z'},
  ];
  // El libro de Moisés en los 30 días anteriores: 135 filas que son 2 situaciones y 2 días de registros.
  const M='Ing. Moises Jimenez', PENS=[]; let nid=0;
  const pen=(f,t,d)=>PENS.push({id:'pn'+(nid++),personal_nombre:M,fecha:f,tipo:t,descripcion:d,monto:0,aplicada:false,ingeniero_id:'moises'});
  for(let i=0;i<3;i++) pen('2026-09-29','Inactividad en obra','Menos de 2 registros en el día. Registros: 0. Horario: 07:30–17:00');
  for(let i=0;i<125;i++) pen('2026-09-28','Actividad completada','Completó: Tarea '+i+' — N5 — Apto 5A');
  pen('2026-09-28','Actividad completada','Completó: Tarea 0 — N5 — Apto 5A');
  for(let i=0;i<5;i++) pen('2026-09-27','Contratista registrado','Contratista '+i+' → presente (2026-09-27)');
  pen('2026-09-25','Tardanza','Llegó 9:10');
  const POSTS=[], OTRAS=[];
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'America/Santo_Domingo'});
  const T=new Date('2026-09-30T20:30:00-04:00').getTime();
  await ctx.addInitScript(t=>{ const R=Date, off=t-R.now();
    class F extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } }
    window.Date=F; window.confirm=()=>true; window.alert=()=>{}; }, T);
  const ok=(r,body)=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  const filtra=(f,pth)=>{
    const q=new URLSearchParams(pth.split('?')[1]||'');
    for(const [k,v] of q.entries()){
      if(['select','order','limit','offset'].includes(k)) continue;
      const m=v.match(/^(eq|gte|lte|neq)\.(.*)$/); if(!m) continue;
      const [_,op,val]=m;
      f=f.filter(x=>{ const a=String(x[k]??''); return op==='eq'?a===val:op==='neq'?a!==val:op==='gte'?a>=val:a<=val; });
    }
    return f;
  };
  await ctx.route('**', r=>{
    const u=r.request().url(), m=r.request().method();
    if(u.startsWith(ORIGEN)) return r.continue();
    if(!/\/rest\/v1\//.test(u)) return r.abort();
    const pth=u.split('/rest/v1/')[1]||'', base=pth.split('?')[0];
    if(m!=='GET'){
      let d=null; try{ d=JSON.parse(r.request().postData()||'null'); }catch(e){}
      if(base==='obra_penalidades'&&m!=='POST') OTRAS.push(m);
      if(base==='obra_penalidades'&&m==='POST'&&d){ (Array.isArray(d)?d:[d]).forEach(x=>{ PENS.push(Object.assign({},x)); POSTS.push(x); }); }
      return ok(r,[]);
    }
    let f=[];
    if(base==='obra_actividades') f=filtra(ACTS,pth);
    else if(base==='obra_personal') f=PERS;
    else if(base==='obra_penalidades') f=filtra(PENS,pth).slice().sort((x,y)=>String(y.fecha).localeCompare(String(x.fecha)));
    const lim=new URLSearchParams(pth.split('?')[1]||'').get('limit'); if(lim) f=f.slice(0,+lim);
    const rg=r.request().headers()['range']||''; if(rg){ const [d0,h]=rg.split('-').map(Number); f=f.slice(d0,h+1); }
    return ok(r,f);
  });
  const p=await ctx.newPage();
  const G=(f,...a)=>p.evaluate(f,...a);
  const arrancar=async()=>{
    await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
    await G(()=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify({id:'nilson',nombre:'Ing. Nilson',rol:'admin'})); }catch(e){} });
    await p.reload({waitUntil:'load'});
    for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&Array.isArray(S.pens)&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
    await p.waitForTimeout(2500);
  };
  await arrancar(); await arrancar();   // dos cargas seguidas, el mismo día
  /* Una tercera como si fuera OTRO aparato: sin la marca que deja el teléfono.
     Así la que frena la copia es la relectura de la base, no la marca. */
  await G(()=>{ try{ Object.keys(localStorage).filter(k=>/^mecca_inact_/.test(k)).forEach(k=>localStorage.removeItem(k)); }catch(e){} });
  await arrancar();
  const inact=POSTS.filter(x=>x.tipo==='Inactividad en obra'&&x.fecha===HOY);
  const r={};
  r.inactividadFilas=inact.filter(x=>x.personal_nombre===M).length;
  r.karinaCerradas=inact.filter(x=>x.personal_nombre==='Ing. Karina Breton').length;
  const n0=POSTS.length;
  await G(async()=>{ await logEvento('Actividad completada','Completó: prueba doble — N3 — Apto 3A'); await logEvento('Actividad completada','Completó: prueba doble — N3 — Apto 3A'); });
  await p.waitForTimeout(500);
  r.logDoble=POSTS.slice(n0).filter(x=>x.descripcion==='Completó: prueba doble — N3 — Apto 3A').length;
  // el historial, abierto como lo abre el dueño
  // Al entrar, el Historial no pide nada: lo pide al tocar un filtro o «Limpiar filtros», que llaman a loadHistorial.
  await G(()=>{ goTab('reportes'); S.reportesVista='historial'; renderReportesHub(); loadHistorial(); });
  await p.waitForTimeout(2500);
  const h=await G(()=>{
    const t=(document.getElementById('c-hist')||{}).innerText||'';
    const i=t.indexOf('Ing. Moises Jimenez'), j=t.indexOf('Ing. Luis Jimenez',i+1);
    const seg=i<0?'':t.slice(i, j<0?undefined:j);
    const num=re=>{ const m=seg.match(re); return m?+m[1]:null; };
    return {sit:num(/SITUACIONES \/ PENALIDADES \((\d+)\)/), inact:num(/(\d+)\s*\n\s*Inactividad/), reg:num(/REGISTROS DEL D[IÍ]A \((\d+)\)/)||0};
  });
  r.sinBorrar=OTRAS.length;
  r.histSituaciones=h.sit; r.histInactividad=h.inact; r.histRegistros=h.reg;
  if(FOTOS){
    await p.evaluate(()=>{ const t=document.getElementById('c-hist'); const i=[...t.querySelectorAll('div')].find(d=>/^Ing\. Moises Jimenez$/.test((d.textContent||'').trim())); if(i){ i.scrollIntoView({block:'start'}); window.scrollBy(0,-150); document.querySelectorAll('*').forEach(e=>{ if(e.scrollTop&&e.contains(i)) e.scrollTop=Math.max(0,e.scrollTop-150); }); } });
    await p.waitForTimeout(300);
    await p.screenshot({path:path.join(FOTOS,nombreVer+'-historial-moises.png')});
  }
  await ctx.close(); srv.close();
  return r;
}

/* ── EL MODO OBRA (v136 el Recorrido, v137 con sus tres botones) ──────────
   Contra lo que tiene que dar, con los MISMOS datos inventados de la parte
   común. Se entra como el dueño —la puerta del cajón, a 390—, se escoge el 6A,
   se abren grupos y se tocan los botones de verdad. Dos rondas: una con señal
   (Completada · Avanzó 50 · Sin cambios) y otra SIN señal, que tiene que salir
   entera y una sola vez cuando vuelve la red. */
const REC_ESPERADO={
  hayPuerta:{v:true, d:'el cajón tiene «Modo Obra» y abre la lista de ambientes'},
  ambientesCuadran:{v:true, d:'la lista de ambientes son las áreas con algo abierto, y el 6A dice sus abiertas'},
  gruposCuadran:{v:true, d:'en el 6A, un grupo por contratista (el primero de cada actividad), todos PLEGADOS'},
  tresBotones:{v:true, d:'cada renglón trae «✓ Completada», «Avanzó» y «Sin cambios», de 48px o más'},
  marcarNoEscribe:{v:0, d:'marcar tres no escribe nada: cero escrituras antes de «Guardar el recorrido»'},
  botonDice:{v:'Guardar el recorrido (3)', d:'el botón de abajo dice cuántas van y se ve sin desplazar a 390×844'},
  sobreviveRecarga:{v:'Guardar el recorrido (3)', d:'las marcas sin guardar siguen ahí después de recargar el app'},
  completada:{v:'completado·100·HOY·Ing. Nilson·1 completado', d:'Completada → completado al 100%, revisada hoy por quien está, UN renglón de historial'},
  avanzo:{v:'en-progreso·50·HOY·1 avance', d:'Avanzó 50 → 50% en progreso, revisada hoy, UN renglón de historial'},
  sinCambios:{v:'igual·HOY·1 revisado', d:'Sin cambios → ni estado ni avance cambian, solo la revisión de hoy, y UN renglón «revisado» (decisión del dueño: las dos cosas)'},
  entidad:{v:'actividad', d:'el historial va con la entidad «actividad», la que lee el refresco de los otros teléfonos'},
  sinSenal:{v:'2 guardadas · 1 PATCH y 1 renglón cada una', d:'sin red el recorrido se queda en la cola y al volver entra completo y UNA sola vez'},
  recargaVeNuevo:{v:'50', d:'recargando el app, la que avanzó sale con 50%, no con el valor viejo'},
  buscador:{v:true, d:'el buscador encuentra en OTRO sitio por palabras, con sus tres botones, y dice que solo mira lo abierto'},
  verCompletadas:{v:'1 GET · las justas', d:'«Ver completadas» pide UNA vez solo las de ese contratista en ese sitio'},
  ceroGet:{v:0, d:'fuera de «Ver completadas», cero GET desde que se abre el Modo Obra hasta después de guardar'},
};
async function probarRecorrido(nombreVer, html, b){
  const D=datos(); const {ACTS,PERS}=D;
  const AREA='N6 — Apto 6A';
  const ESC=[], LEC=[], CAMBIOS=[], PATCHOK={};
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  await ctx.addInitScript(()=>{ window.confirm=()=>true; window.alert=()=>{}; });
  const ok=(r,body)=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  let contar=false, sinRed=false;
  await ctx.route('**', r=>{
    const u=r.request().url(), m=r.request().method();
    if(u.startsWith(ORIGEN)) return r.continue();
    if(!/\/rest\/v1\//.test(u)) return r.abort();
    const pth=decodeURIComponent(u.split('/rest/v1/')[1]||''), base=pth.split('?')[0];
    if(m!=='GET'){
      if(sinRed && (base==='obra_actividades'||base==='obra_cambios'||base==='obra_penalidades')) return r.abort('internetdisconnected');
      const body=r.request().postData()||'';
      if(contar) ESC.push(m+' '+base);
      try{ const d=body?JSON.parse(body):null;
        if(base==='obra_actividades'&&m==='PATCH'){ const mm=pth.match(/id=eq\.([^&]+)/); if(mm){ PATCHOK[mm[1]]=(PATCHOK[mm[1]]||0)+1; ACTS.filter(x=>x.id===mm[1]).forEach(x=>Object.assign(x,d)); } }
        if(base==='obra_cambios'&&m==='POST') (Array.isArray(d)?d:[d]).forEach(x=>CAMBIOS.push(x));
      }catch(e){}
      return ok(r,[]);
    }
    if(contar && base!=='obra_asistencia' && base!=='obra_cambios') LEC.push(pth);
    let f=[];
    if(base==='obra_actividades'){
      f=ACTS;
      if(/estado=neq\.completado/.test(pth)) f=f.filter(a=>a.estado!=='completado');
      if(/estado=eq\.completado/.test(pth)) f=f.filter(a=>a.estado==='completado');
      const ar=pth.match(/[?&]area=eq\.([^&]*)/); if(ar) f=f.filter(a=>(a.area||'')===ar[1]);
      const il=pth.match(/personal_nombre=ilike\.\*([^*&]*)\*/); if(il) f=f.filter(a=>(a.personal_nombre||'').toLowerCase().indexOf(il[1].toLowerCase())>=0);
    }
    else if(base==='obra_personal') f=PERS;
    const rg=r.request().headers()['range']||''; if(rg){ const [d0,h]=rg.split('-').map(Number); f=f.slice(d0,h+1); }
    return ok(r,f);
  });
  const p=await ctx.newPage();
  const G=(f,...a)=>p.evaluate(f,...a);
  const arrancar=async()=>{
    await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
    await G(()=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify({id:'nilson',nombre:'Ing. Nilson',rol:'admin'})); }catch(e){} });
    await p.reload({waitUntil:'load'});
    for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
    await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1500);
  };
  await arrancar();
  const HOY=await G(()=>today());
  const r={};
  const abiertas6A=ACTS.filter(a=>a.area===AREA&&a.estado!=='completado');
  const primero=a=>((a.personal_nombre||'').split(',').map(s=>s.trim()).filter(Boolean)[0])||'Sin asignar';
  const primeros=new Set(abiertas6A.map(primero));
  contar=true;
  const hay=await G(()=>!!document.getElementById('dw-recorrido'));
  r.hayPuerta=hay;
  if(!hay){ await ctx.close(); srv.close(); for(const k of Object.keys(REC_ESPERADO)) if(!(k in r)) r[k]=null; return r; }
  /* Contra una versión que no tiene lo de esta parte, la prueba no puede
     tumbar la lista entera: lo que falte sale en blanco y FALLA su renglón. */
  p.setDefaultTimeout(6000);
  try{
  await p.locator('button[onclick*="toggleDrawer"]:visible').first().click(); await p.waitForTimeout(400);
  await p.locator('#dw-recorrido').click(); await p.waitForTimeout(500);
  r.ambientesCuadran=await G(([area,n])=>{ const bs=[...document.querySelectorAll('#hoja-rec .rec-amb')];
    const b=bs.find(x=>x.innerText.indexOf(area)>=0); return !!b && b.innerText.indexOf(n+' abierta')>=0; },[AREA,abiertas6A.length]);
  if(FOTOS) await p.screenshot({path:path.join(FOTOS,nombreVer+'-modoobra-ambientes.png')});
  // buscador: una palabra de una abierta de OTRO sitio
  const otra=ACTS.find(a=>a.estado!=='completado'&&a.area==='N3 — Apto 3B');
  await p.locator('#mo-q').fill(otra.descripcion); await p.waitForTimeout(300);
  r.buscador=await G(id=>{ const res=document.getElementById('mo-res'); if(!res) return false;
    const l=[...res.querySelectorAll('.mo-lin')]; const ok=l.some(x=>x.querySelector('[onclick*="'+id+'"]'));
    const nota=/solo en lo abierto/i.test(document.getElementById('hoja-rec').innerText);
    return ok && nota && !!(res.querySelector('.mo-b.ok')&&res.querySelector('.mo-b.av')&&res.querySelector('.mo-b.ig')); }, otra.id);
  await p.locator('#mo-q').fill(''); await p.waitForTimeout(200);
  await p.locator('#hoja-rec .rec-amb',{hasText:AREA}).click(); await p.waitForTimeout(400);
  r.gruposCuadran=await G(n=>{ const hs=document.querySelectorAll('#rec-cuerpo button[onclick^="recAbrir"]');
    return hs.length===n && document.querySelectorAll('#rec-cuerpo .mo-lin').length===0; }, primeros.size);
  if(FOTOS) await p.screenshot({path:path.join(FOTOS,nombreVer+'-modoobra-6A.png')});
  const grupos=p.locator('#rec-cuerpo button[onclick^="recAbrir"]');
  await grupos.nth(0).click(); await p.waitForTimeout(300);
  r._botones=await G(()=>[...document.querySelectorAll('#rec-cuerpo .mo-lin')].slice(0,3).map(x=>[...x.querySelectorAll('.mo-b')].map(b=>b.textContent.trim()+':'+Math.round(b.getBoundingClientRect().height))));
  r.tresBotones=await G(()=>{ const l=document.querySelectorAll('#rec-cuerpo .mo-lin'); if(!l.length) return false;
    /* v139 · El renglón ganó un cuarto botón («Trabada»): se exigen los tres de
       siempre en su sitio, y lo que venga detrás no tumba la prueba. */
    return [...l].every(x=>{ const bs=[...x.querySelector('.mo-bts').querySelectorAll('.mo-b')].slice(0,3); return bs.length===3 && bs.every(b=>b.getBoundingClientRect().height>=48) &&
      /Completada/.test(bs[0].textContent) && /Avanzó/.test(bs[1].textContent) && /Sin cambios/.test(bs[2].textContent); }); });
  const ids=await G(()=>[...document.querySelectorAll('#rec-cuerpo .mo-lin .mo-b.ok')].map(b=>(b.getAttribute('onclick').match(/moMarcar\('([^']+)'/)||[])[1]));
  const [idC,idA,idI]=ids;
  const antes={}; for(const id of ids) antes[id]=JSON.parse(JSON.stringify(ACTS.find(a=>a.id===id)));
  const lin=id=>p.locator('#rec-cuerpo .mo-lin',{has:p.locator(`[onclick="moMarcar('${id}','hecha')"]`)});
  await lin(idC).locator('.mo-b.ok').click(); await p.waitForTimeout(150);
  await lin(idA).locator('.mo-b.av').click(); await p.waitForTimeout(150);
  await lin(idA).locator('.mo-b.av',{hasText:'50%'}).click(); await p.waitForTimeout(150);
  if(FOTOS){ await lin(idA).scrollIntoViewIfNeeded(); await p.screenshot({path:path.join(FOTOS,nombreVer+'-modoobra-grupo.png')}); }
  await lin(idI).locator('.mo-b.ig').click(); await p.waitForTimeout(150);
  r.marcarNoEscribe=ESC.length;
  const boton=async()=>G(()=>{ const b=document.getElementById('rec-guardar'); if(!b) return null; const rc=b.getBoundingClientRect();
    return (rc.bottom<=844&&b.checkVisibility())?b.textContent.trim():'(fuera de la pantalla) '+b.textContent.trim(); });
  r.botonDice=await boton();
  contar=false; await arrancar(); await p.waitForTimeout(1500); contar=true;
  await G(a=>{ abrirRecorrido(); recIrAmbiente(a); },AREA); await p.waitForTimeout(400);
  r.sobreviveRecarga=await boton();
  // Ronda 1, con señal
  const e0=ESC.length;
  await p.locator('#rec-guardar').click();
  for(let t=0;t<20;t++){ await p.waitForTimeout(300); if(!(await G(()=>!!(S.recorrido&&S.recorrido._guardando)))) break; }
  await p.waitForTimeout(600);
  const camb=id=>CAMBIOS.filter(c=>c.entidad_id===id);
  const ac=id=>ACTS.find(a=>a.id===id);
  const fRev=x=>(x.revisado_fecha===HOY?'HOY':String(x.revisado_fecha));
  { const x=ac(idC), c=camb(idC);
    r.completada=x.estado+'·'+x.porcentaje+'·'+fRev(x)+'·'+x.revisado_por+'·'+c.length+' '+(c[0]||{}).accion;
    if(!String(antes[idC].fecha_fin||'').trim() && x.fecha_fin!==HOY) r.completada+=' (sin la entrega de hoy)'; }
  { const x=ac(idA), c=camb(idA); r.avanzo=x.estado+'·'+x.porcentaje+'·'+fRev(x)+'·'+c.length+' '+(c[0]||{}).accion; }
  { const x=ac(idI), c=camb(idI), igual=(x.estado===antes[idI].estado&&String(x.porcentaje)===String(antes[idI].porcentaje));
    r.sinCambios=(igual?'igual':'CAMBIÓ')+'·'+fRev(x)+'·'+c.length+' '+(c[0]||{}).accion; }
  r.entidad=[...new Set(CAMBIOS.filter(c=>ids.includes(c.entidad_id)).map(c=>c.entidad))].join(',');
  // Ronda 2, SIN señal: dos del segundo grupo
  await grupos.nth(1).click(); await p.waitForTimeout(300);
  const ids2=await G(()=>[...document.querySelectorAll('#rec-cuerpo .mo-lin .mo-b.ok')].map(b=>(b.getAttribute('onclick').match(/moMarcar\('([^']+)'/)||[])[1]).slice(0,2));
  await lin(ids2[0]).locator('.mo-b.ok').click(); await p.waitForTimeout(150);
  await lin(ids2[1]).locator('.mo-b.ig').click(); await p.waitForTimeout(150);
  sinRed=true;
  await p.locator('#rec-guardar').click();
  for(let t=0;t<20;t++){ await p.waitForTimeout(300); if(!(await G(()=>!!(S.recorrido&&S.recorrido._guardando)))) break; }
  await p.waitForTimeout(500);
  sinRed=false;
  await G(()=>{ window.dispatchEvent(new Event('online')); }); await p.waitForTimeout(2500);
  await G(()=>{ try{ colaEnviar(); }catch(e){} }); await p.waitForTimeout(1500);   // otra vuelta: no puede duplicar
  const okSR=ids2.filter(id=>PATCHOK[id]===1 && camb(id).length===1).length;
  r.sinSenal=okSR+' guardadas · '+(ids2.every(id=>PATCHOK[id]===1)?'1 PATCH':'PATCH '+ids2.map(id=>PATCHOK[id]||0).join('/'))+' y '+
    (ids2.every(id=>camb(id).length===1)?'1 renglón':'renglones '+ids2.map(id=>camb(id).length).join('/'))+' cada una';
  // «Ver completadas» del primer contratista: le damos dos cerradas en el 6A
  const q0=primero(abiertas6A.find(a=>a.id===idC)||{});
  ACTS.push({id:'cz1',descripcion:'Cerrada vieja 1',area:AREA,estado:'completado',porcentaje:'100',personal_nombre:q0,fecha_fin:'2026-09-01',fecha:'2026-08-01'},
            {id:'cz2',descripcion:'Cerrada vieja 2',area:AREA,estado:'completado',porcentaje:'100',personal_nombre:q0,fecha_fin:'2026-09-02',fecha:'2026-08-01'});
  const l0=LEC.length;
  await G(q=>{ S.recorrido.abierto=q; pintarRecorrido(); return moVerCompletadas(q); }, q0); await p.waitForTimeout(800);
  const gets=LEC.slice(l0).filter(x=>/estado=eq\.completado/.test(x)).length;
  const filas=await G(()=>document.querySelectorAll('#rec-cuerpo .mo-comp').length);
  const esperadas=ACTS.filter(a=>a.area===AREA&&a.estado==='completado'&&primero(a)===q0).length;
  r.verCompletadas=gets+' GET · '+(filas===esperadas?'las justas':filas+' filas de '+esperadas);
  r.ceroGet=LEC.filter(x=>!/estado=eq\.completado/.test(x)).length;
  r._lecturas=LEC; r._escriturasAlGuardar=ESC.slice(e0);
  // recargar: la que avanzó sale con su valor nuevo
  contar=false; await arrancar();
  r.recargaVeNuevo=await G(id=>{ const a=S.acts.find(x=>x.id===id); return a?String(a.porcentaje):'(no está)'; }, idA);
  }catch(e){ r._error=String(e&&e.message||e).split('\n')[0].slice(0,160); }
  for(const k of Object.keys(REC_ESPERADO)) if(!(k in r)) r[k]=null;
  await ctx.close(); srv.close();
  return r;
}

// ── TRABADAS Y PROPUESTAS (v139): lo que Moisés y Karina dejan dicho en obra ──
/* Por DONDE ENTRAN: un ingeniero cae en el Modo Campo al poner su PIN, así que
   Karina se prueba ahí; el Modo Obra y la bandeja, como Nilson. */
const TRA_ESPERADO={
  campoBotones:{v:'✓ Completada · Avanzó · Sin cambios · Trabada', d:'Modo Campo (v140): los cuatro del Modo Obra con sus nombres exactos, de 44px o más y sin cortarse a 390; ni «Terminada», ni «No se pudo», ni 90%'},
  campoAvanzo:{v:'25 50 75', d:'Modo Campo: «Avanzó» abre 25 · 50 · 75'},
  campoIgual:{v:'revisada HOY·Ing. Karina Breton·pct igual·estado igual·1 revisado', d:'Modo Campo: «Sin cambios» escribe revisado_fecha y revisado_por, deja UN renglón y no toca % ni estado'},
  otroSinTexto:{v:'no escribe', d:'«Otro» sin escribir el motivo no guarda nada: lo pide'},
  trabaMaterial:{v:'pausada·material·HOY·Ing. Karina Breton·pct igual·1 trabada', d:'Trabada por «Falta material» (Modo Campo): pausada, causa, hoy, quién, el % sin tocar y UN renglón'},
  trabaOtro:{v:'otro·llueve en el patio', d:'Trabada por «Otro» con detalle: el detalle queda en estancada_motivo'},
  trabadaSigue:{v:'en la lista · no completada · Destrabar a la vista', d:'una trabada sigue en S.acts, no cuenta como completada y su tarjeta ofrece «Destrabar»'},
  destrabar:{v:'vuelve·rastro entero·1 destrabada', d:'Destrabar la devuelve a como iba y deja su renglón; el motivo, la causa, la fecha y quién SIGUEN en la fila (v140)'},
  retrabar:{v:'contratista·el renglón dice la anterior', d:'trabar otra vez por otra causa deja la nueva, y el renglón del historial dice la anterior'},
  trabaCompletar:{v:'completado·otro_taller·cemento gris·rastro entero', d:'trabar y luego completar: el rastro de la traba sigue en la fila'},
  propone:{v:'propuesta·Ing. Karina Breton·HOY·pendiente·0', d:'«Proponer a Gerencia» guarda propuesta=true, quién, hoy, pendiente al 0%'},
  nombres:{v:'Proponer a Gerencia ×2 · dice que no entra · Revisión sigue «Falta una aquí»', d:'el botón de proponer se llama «Proponer a Gerencia» en el Modo Campo y en el Modo Obra y dice que no entra hasta que se apruebe; el alta de Revisión sigue «Falta una aquí»'},
  panelViejo:{v:'retirado', d:'el panel viejo de «estancadas» (estancSetMotivo) ya no existe: nadie más escribe estancada_motivo por fuera'},
  noCuenta:{v:'S.acts igual · se ve como suya', d:'la propuesta NO entra a S.acts, y Karina la ve en «Tus propuestas esperando»'},
  ingSinBandeja:{v:'sin bandeja · no aprueba', d:'Karina no tiene puerta a Gerencia ni puede aprobar llamando a la función'},
  obraCuatro:{v:true, d:'Modo Obra: cada renglón lleva ✓ Completada · Avanzó · Sin cambios · Trabada, de 48px y sin cortarse'},
  obraTraba:{v:'pausada·otro_taller·revisada HOY·1 trabada', d:'Modo Obra: la traba es una marca y sale con «Guardar el recorrido», con su revisión'},
  adminVe:{v:'2 por aprobar · aviso en Modo Obra', d:'Nilson ve el número en la puerta de Gerencia y el aviso en el Modo Obra (la de Karina y una que deja el arnés)'},
  ambienteSinProp:{v:true, d:'el conteo de abiertas del 6A en el Modo Obra no cuenta la propuesta'},
  aprobar:{v:'propuesta=false · entra a S.acts', d:'Aprobar pone propuesta=false y ahí sí entra a los conteos'},
  rechazar:{v:'respaldo antes · borrada', d:'Rechazar escribe su respaldo en obra_cambios ANTES del borrado, y la borra'},
  gerTrabadas:{v:'Otro 1 · se abre', d:'Gerencia cuenta las trabadas por causa y el número se toca y enseña cuáles'},
  sinKanbanMatriz:{v:'sin Kanban · sin Matriz', d:'a 390 no salen Kanban ni Matriz (decisión del dueño)'},
  entidad:{v:'actividad', d:'todo el historial nuevo va con la entidad «actividad»'},
};
async function probarTrabas(nombreVer, html, b){
  const D=datos(); const {ACTS,PERS}=D;
  const AREA='N6 — Apto 6A';
  const ESC=[], CAMBIOS=[];
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const ok=(q,body)=>q.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  const r={};
  const ruta=async ctx=>ctx.route('**', q=>{
    const u=q.request().url(), m=q.request().method();
    if(u.startsWith(ORIGEN)) return q.continue();
    if(!/\/rest\/v1\//.test(u)) return q.abort();
    const pth=decodeURIComponent(u.split('/rest/v1/')[1]||''), base=pth.split('?')[0];
    if(m!=='GET'){
      const body=q.request().postData()||'';
      ESC.push(m+' '+base);
      try{ const d=body?JSON.parse(body):null;
        if(base==='obra_actividades'&&m==='PATCH'){ const mm=pth.match(/id=eq\.([^&]+)/); if(mm) ACTS.filter(x=>x.id===mm[1]).forEach(x=>Object.assign(x,d)); }
        if(base==='obra_actividades'&&m==='POST') (Array.isArray(d)?d:[d]).forEach(x=>ACTS.push(Object.assign({},x)));
        if(base==='obra_actividades'&&m==='DELETE'){ const mm=pth.match(/id=eq\.([^&]+)/); if(mm){ const k=ACTS.findIndex(x=>x.id===mm[1]&&(!/propuesta=is\.true/.test(pth)||x.propuesta===true)); if(k>=0) ACTS.splice(k,1); } }
        if(base==='obra_cambios'&&m==='POST') (Array.isArray(d)?d:[d]).forEach(x=>CAMBIOS.push(x));
      }catch(e){}
      return ok(q,[]);
    }
    let f=[];
    if(base==='obra_actividades'){
      f=ACTS;
      if(/estado=neq\.completado/.test(pth)) f=f.filter(a=>a.estado!=='completado');
      if(/propuesta=not\.is\.true/.test(pth)) f=f.filter(a=>a.propuesta!==true);
      else if(/propuesta=is\.true/.test(pth)) f=f.filter(a=>a.propuesta===true);
      const inn=pth.match(/id=in\.\(([^)]*)\)/); if(inn){const st=new Set(inn[1].split(',').map(x=>x.replace(/"/g,'')));f=f.filter(a=>st.has(a.id));}
    }
    else if(base==='obra_personal') f=PERS;
    const rg=q.request().headers()['range']||''; if(rg){ const [d0,h]=rg.split('-').map(Number); f=f.slice(d0,h+1); }
    return ok(q,f);
  });
  const abrir=async (usr)=>{
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
    await ctx.addInitScript(()=>{ window.confirm=()=>true; window.alert=()=>{}; });
    await ruta(ctx);
    const p=await ctx.newPage(); p.setDefaultTimeout(6000);
    const G=(f,...a)=>p.evaluate(f,...a);
    await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
    await G(u=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify(u)); }catch(e){} }, usr);
    await p.reload({waitUntil:'load'});
    for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
    await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1200);
    return {ctx,p,G};
  };
  const ac=id=>ACTS.find(a=>a.id===id);
  const camb=(id,acc)=>CAMBIOS.filter(c=>c.entidad_id===id&&(!acc||c.accion===acc));
  try{
    // ── KARINA, ingeniera: cae en el Modo Campo ──
    let {ctx,p,G}=await abrir({id:'karina',nombre:'Ing. Karina Breton',rol:'ing'});
    const HOY=await G(()=>today());
    const card=id=>p.locator('#campo-root .cp-card#cp-'+id);
    r.campoBotones=await G(()=>{ const cs=[...document.querySelectorAll('#campo-root .cp-card')]; if(!cs.length) return 'sin Modo Campo';
      const t=document.getElementById('campo-root').innerText;
      if(/Terminada|No se pudo|90%/.test(t)) return 'quedan palabras viejas';
      let nombres=null, mal=0;
      cs.forEach(c=>{ const bs=[...c.querySelectorAll('.cp-btns button')]; const n=bs.map(b=>b.textContent.trim()).join(' · ');
        if(nombres===null) nombres=n; else if(n!==nombres && !/Destrabar/.test(n)) mal++;
        bs.forEach(b=>{ const rg=document.createRange(); rg.selectNodeContents(b); if(b.getBoundingClientRect().height<44 || rg.getBoundingClientRect().width>b.clientWidth+0.5) mal++; }); });
      return mal?('mal en '+mal+' · '+nombres):nombres; });
    const ids=await G(()=>[...document.querySelectorAll('#campo-root .cp-card')].filter(c=>/Trabada/.test(c.innerText)).map(c=>c.id.slice(3)));
    const [i0,i1,i2,i3]=ids; const pct0=String(ac(i0).porcentaje);
    await card(i2).locator('.cp-av').click(); await p.waitForTimeout(200);
    r.campoAvanzo=await G(id=>[...document.querySelectorAll('#cp-'+id+' .cp-pcts button')].map(b=>b.textContent.replace('%','')).join(' '),i2);
    { const antes=JSON.parse(JSON.stringify(ac(i2)));
      await card(i2).locator('.cp-ig').click(); await p.waitForTimeout(500);
      const x=ac(i2), c=camb(i2,'revisado');
      r.campoIgual=(x.revisado_fecha===HOY?'revisada HOY':'sin revisar')+'·'+x.revisado_por+'·'+(String(x.porcentaje)===String(antes.porcentaje)?'pct igual':'pct CAMBIÓ')+'·'+
        (x.estado===antes.estado?'estado igual':'estado CAMBIÓ')+'·'+camb(i2).length+' '+(c[0]?'revisado':'?'); }
    await card(i0).locator('.cp-tr').click(); await p.waitForTimeout(200);
    await card(i0).locator('.cp-trab-g button',{hasText:'Falta material'}).click(); await p.waitForTimeout(500);
    { const x=ac(i0), c=camb(i0,'trabada');
      r.trabaMaterial=x.estado+'·'+x.estancada_causa+'·'+(x.estancada_fecha===HOY?'HOY':x.estancada_fecha)+'·'+x.estancada_por+'·'+
        (String(x.porcentaje)===pct0?'pct igual':'pct CAMBIÓ')+'·'+camb(i0).length+' '+(c[0]?'trabada':'?'); }
    const e1=ESC.length;
    await card(i1).locator('.cp-tr').click(); await p.waitForTimeout(200);
    await card(i1).locator('.cp-trab-g button',{hasText:/^Otro$/}).click(); await p.waitForTimeout(300);
    r.otroSinTexto=ESC.length===e1?'no escribe':'ESCRIBIÓ';
    await card(i1).locator('.cp-trab input').fill('llueve en el patio');
    await card(i1).locator('.cp-trab-g button',{hasText:/^Otro$/}).click(); await p.waitForTimeout(500);
    { const x=ac(i1); r.trabaOtro=x.estancada_causa+'·'+x.estancada_motivo; }
    { const st=await G(([a,b2])=>{ const x=S.acts.find(y=>y.id===a), y=S.acts.find(z=>z.id===b2);
        const c=document.getElementById('cp-'+a); return [!!x&&!!y, !!x&&x.estado!=='completado'&&y.estado!=='completado', !!c&&/Destrabar/.test(c.innerText)]; },[i0,i1]);
      r.trabadaSigue=(st[0]?'en la lista':'FUERA de la lista')+' · '+(st[1]?'no completada':'COMPLETADA')+' · '+(st[2]?'Destrabar a la vista':'sin Destrabar'); }
    await card(i0).locator('.cp-tr',{hasText:'Destrabar'}).click(); await p.waitForTimeout(500);
    { const x=ac(i0), esp=(parseInt(pct0,10)>0?'en-progreso':'pendiente');
      const entero=x.estancada_causa==='material'&&x.estancada_fecha===HOY&&x.estancada_por==='Ing. Karina Breton';
      r.destrabar=(x.estado===esp?'vuelve':'estado '+x.estado)+'·'+(entero?'rastro entero':'rastro BORRADO '+JSON.stringify([x.estancada_causa,x.estancada_fecha,x.estancada_por]))+'·'+camb(i0,'destrabada').length+' destrabada'; }
    // trabar otra vez, por otra causa
    await card(i0).locator('.cp-tr').click(); await p.waitForTimeout(200);
    await card(i0).locator('.cp-trab-g button',{hasText:'El contratista no vino'}).click(); await p.waitForTimeout(500);
    { const x=ac(i0), ult=camb(i0,'trabada').slice(-1)[0]||{};
      r.retrabar=x.estancada_causa+'·'+(/antes: Falta material/.test(ult.detalle||'')?'el renglón dice la anterior':'el renglón NO dice la anterior: '+(ult.detalle||'')); }
    // trabar y completar: el rastro se queda
    await card(i3).locator('.cp-tr').click(); await p.waitForTimeout(200);
    await card(i3).locator('.cp-trab input').fill('cemento gris');
    await card(i3).locator('.cp-trab-g button',{hasText:'Espera otro taller'}).click(); await p.waitForTimeout(500);
    await card(i3).locator('.cp-ok').click(); await p.waitForTimeout(500);
    { const x=ac(i3); r.trabaCompletar=x.estado+'·'+x.estancada_causa+'·'+x.estancada_motivo+'·'+(x.estancada_fecha===HOY&&x.estancada_por?'rastro entero':'rastro BORRADO'); }
    const nActs=await G(()=>S.acts.length);
    const nomCampo=await G(()=>{ const b=document.querySelector('#campo-root .cp-falta'); return b?b.innerText.replace(/\s+/g,' ').trim():''; });
    await p.locator('#campo-root .cp-falta').click(); await p.waitForTimeout(300);
    await p.locator('#cpp-desc').fill('Resanar el hueco del registro');
    await p.locator('#cpp-area').selectOption(AREA);
    await p.locator('#cpp-ok').click(); await p.waitForTimeout(800);
    const pr=ACTS.find(a=>a.descripcion==='Resanar el hueco del registro');
    r.propone=pr?[pr.propuesta?'propuesta':'NO propuesta',pr.propuesta_por,pr.propuesta_fecha===HOY?'HOY':pr.propuesta_fecha,pr.estado,pr.porcentaje].join('·'):'no se guardó';
    { const enActs=await G(id=>!!S.acts.find(x=>x.id===id),pr&&pr.id);
      const se=await G(()=>/tus propuestas esperando/i.test(document.getElementById('campo-root').innerText));
      r.noCuenta=(!enActs&&await G(()=>S.acts.length)===nActs?'S.acts igual':'S.acts CAMBIÓ')+' · '+(se?'se ve como suya':'no se ve'); }
    { const e2=ESC.length;
      await G(id=>{ try{ propAprobar(id); }catch(e){} },pr&&pr.id); await p.waitForTimeout(400);
      const btn=await G(()=>!!document.querySelector('#campo-root [onclick^="propAprobar"]'));
      const vis=await G(()=>{ const d=document.getElementById('dw-gerencia'); return d&&getComputedStyle(d).display!=='none'; });
      r.ingSinBandeja=(vis||btn?'CON bandeja':'sin bandeja')+' · '+(ESC.length===e2?'no aprueba':'APROBÓ'); }
    await ctx.close();
    // ── NILSON, administrador: app completa, Modo Obra y Gerencia ──
    ACTS.push({id:'prop-rech',descripcion:'Propuesta para rechazar',area:AREA,personal_nombre:'Milo',tipo_personal:'contratista',estado:'pendiente',porcentaje:'0',fecha:HOY,fecha_inicio:'',fecha_fin:'',propuesta:true,propuesta_por:'Ing. Moises Jimenez',propuesta_fecha:HOY});
    ({ctx,p,G}=await abrir({id:'nilson',nombre:'Ing. Nilson',rol:'admin'}));
    await p.waitForTimeout(500);
    r.sinKanbanMatriz=await G(()=>{ goTab('obra'); S.obraVista='todas'; S.actVista='lista'; renderObra();
      const sub=document.getElementById('c-obra-subnav').innerText, v=document.getElementById('c-act').innerText;
      return (/Kanban/.test(sub)?'CON Kanban':'sin Kanban')+' · '+(/Matriz/.test(v)?'CON Matriz':'sin Matriz'); });
    { const t=await G(()=>(document.getElementById('dw-gerencia')||{}).textContent||'');
      await p.locator('button[onclick*="toggleDrawer"]:visible').first().click(); await p.waitForTimeout(300);
      await p.locator('#dw-recorrido').click(); await p.waitForTimeout(400);
      const aviso=await G(()=>/propuestas esperan tu aprobación/.test(document.getElementById('hoja-rec').innerText));
      const m=t.match(/(\d+) por aprobar/);
      r.adminVe=(m?m[1]+' por aprobar':'puerta: '+t)+' · '+(aviso?'aviso en Modo Obra':'sin aviso');
      const esp=ACTS.filter(a=>a.area===AREA&&a.estado!=='completado'&&a.propuesta!==true).length;
      const dice=await G(a=>{ const b2=[...document.querySelectorAll('#hoja-rec .rec-amb')].find(x=>x.innerText.indexOf(a)>=0); return b2?+(b2.innerText.match(/(\d+) abierta/)||[])[1]:null; },AREA);
      r.ambienteSinProp=(dice===esp); }
    await p.locator('#hoja-rec .rec-amb',{hasText:AREA}).click(); await p.waitForTimeout(400);
    await p.locator('#rec-cuerpo button[onclick^="recAbrir"]').nth(0).click(); await p.waitForTimeout(300);
    r.obraCuatro=await G(()=>{ const l=[...document.querySelectorAll('#rec-cuerpo .mo-lin')]; if(!l.length) return false;
      return l.every(x=>{ const bs=[...x.querySelector('.mo-bts').querySelectorAll('.mo-b')];
        return bs.length===4 && bs.every(b2=>{ const rg=document.createRange(); rg.selectNodeContents(b2); return b2.getBoundingClientRect().height>=48 && rg.getBoundingClientRect().width<=b2.clientWidth+0.5; }) &&
          /Completada/.test(bs[0].textContent)&&/Avanzó/.test(bs[1].textContent)&&/Sin cambios/.test(bs[2].textContent)&&/Trabada|Destrabar/.test(bs[3].textContent); }); });
    { const nomObra=await G(()=>{ const b=document.querySelector('#rec-cuerpo .mo-falta'); return b?b.innerText.replace(/\s+/g,' ').trim():''; });
      const rev=await G(()=>typeof revPartidaAbierta==='function'&&String(revPartidaAbierta).indexOf('+ Falta una aquí</button>')>=0&&typeof revAltaPantalla==='function'&&String(revAltaPantalla).indexOf('>Falta una aquí<')>=0);
      const n=[nomCampo,nomObra].filter(t=>/^\+? ?Proponer a Gerencia/.test(t)).length;
      const dice=[nomCampo,nomObra].every(t=>/No entra a la obra hasta que Gerencia la apruebe/.test(t));
      r.nombres='Proponer a Gerencia ×'+n+' · '+(dice?'dice que no entra':'NO dice que no entra')+' · '+(rev?'Revisión sigue «Falta una aquí»':'Revisión CAMBIÓ');
      r.panelViejo=await G(()=>(typeof estancSetMotivo==='undefined'&&typeof _EST_MOTIVOS==='undefined')?'retirado':'sigue ahí'); }
    const io=await G(()=>{ const x=[...document.querySelectorAll('#rec-cuerpo .mo-lin')].find(l=>/Trabada/.test(l.querySelector('.mo-bts').innerText)); return x?(x.querySelector('.mo-b.ok').getAttribute('onclick').match(/moMarcar\('([^']+)'/)||[])[1]:null; });
    const lin=id=>p.locator('#rec-cuerpo .mo-lin',{has:p.locator(`[onclick="moMarcar('${id}','hecha')"]`)});
    await lin(io).locator('.mo-b.tr').click(); await p.waitForTimeout(200);
    await lin(io).locator('.mo-trab .mo-b',{hasText:'Espera otro taller'}).click(); await p.waitForTimeout(200);
    const antesG=ESC.length;
    await p.locator('#rec-guardar').click();
    for(let t=0;t<20;t++){ await p.waitForTimeout(300); if(!(await G(()=>!!(S.recorrido&&S.recorrido._guardando)))) break; }
    await p.waitForTimeout(400);
    { const x=ac(io); r.obraTraba=x.estado+'·'+x.estancada_causa+'·'+(x.revisado_fecha===HOY?'revisada HOY':'sin revisar')+'·'+camb(io,'trabada').length+' trabada'+(ESC.length===antesG?' (NO ESCRIBIÓ)':''); }
    await G(()=>{ cerrarHojaApto(); goTab('gerencia'); }); await p.waitForTimeout(800);
    await p.locator('#c-gerencia .mo-prop',{hasText:'Resanar el hueco del registro'}).locator('.mo-b.ok').click(); await p.waitForTimeout(600);
    r.aprobar=(pr&&ac(pr.id)&&ac(pr.id).propuesta===false?'propuesta=false':'propuesta sigue')+' · '+(await G(id=>!!S.acts.find(x=>x.id===id),pr&&pr.id)?'entra a S.acts':'NO entra');
    const eR=ESC.length;
    await p.locator('#c-gerencia .mo-prop',{hasText:'Propuesta para rechazar'}).locator('.mo-b',{hasText:'Rechazar'}).click(); await p.waitForTimeout(800);
    { const tras=ESC.slice(eR); const iC=tras.indexOf('POST obra_cambios'), iD=tras.indexOf('DELETE obra_actividades');
      const resp=camb('prop-rech','rechazada').length;
      r.rechazar=(iC>=0&&iD>iC&&resp?'respaldo antes':'respaldo '+JSON.stringify(tras))+' · '+(ac('prop-rech')?'sigue':'borrada'); }
    await p.locator('#c-gerencia .rec-amb',{hasText:/^Otro/}).click(); await p.waitForTimeout(400);
    r.gerTrabadas=await G(()=>{ const t=document.getElementById('c-gerencia').innerText;
      const n=([...document.querySelectorAll('#c-gerencia .rec-amb')].find(b2=>/^Otro/.test(b2.innerText.trim()))||{}).innerText||'';
      const num=(n.replace(/\s+/g,' ').match(/(\d+)\s*[▾▸]?\s*$/)||[])[1];
      return 'Otro '+(num||'?')+' · '+(/llueve en el patio/.test(t)?'se abre':'no se abre'); });
    r.entidad=[...new Set(CAMBIOS.filter(c=>['trabada','destrabada','propuesta','aprobada','rechazada'].includes(c.accion)).map(c=>c.entidad))].join(',');
    r._escrituras=ESC.slice();
    await ctx.close();
  }catch(e){ r._error=String(e&&e.message||e).split('\n').slice(0,3).join(' | ').slice(0,300); }
  srv.close();
  for(const k of Object.keys(TRA_ESPERADO)) if(!(k in r)) r[k]=null;
  return r;
}

// ── LA CABECERA DE ACTIVIDADES (v138): se pliega con un botón y no cambia nada ──
const CAB_ESPERADO={
  hayBoton:{v:true, d:'en Actividades está el botón de plegar, en la cabecera de arriba'},
  pliega:{v:'pliega 3 · quedan título y sincronización', d:'esconde pestañas, sub-barra y filtros/pastillas/«Viendo»; título y barra verde se quedan'},
  botonSigue:{v:true, d:'plegada, el botón sigue a la vista y dentro de la pantalla'},
  filtroSeVe:{v:'1 en el botón · «filtradas»', d:'con Apto 2A puesto y plegada, el botón dice 1 y la línea dice «filtradas»'},
  mismaLista:{v:true, d:'la lista no se repinta: mismas filas visibles antes, plegada y después'},
  mismosChips:{v:true, d:'al desplegar vuelve todo igual: mismos filtros y mismo HTML de la cabecera'},
  cero390:{v:'funciona · tapa 0 · título entero', d:'a 390 se toca con el dedo, no pisa ningún control y «Mecca Residence» cabe'},
  recargaAbierta:{v:'abierta · abierta · nada guardado', d:'recargar y volver a entrar la abren; no se guarda nada en el teléfono'},
  soloActividades:{v:'Kanban no · Obra no', d:'en Kanban y en otra pestaña el botón no sale y nada queda plegado'},
  ceroEscrituras:{v:0, d:'ni una escritura ni un GET al plegar y desplegar'},
  pastillas:{v:'todas las ubicaciones · por nivel · más de seis contratistas', d:'v141/v142: la fila de ubicaciones trae TODAS las que tienen algo abierto, agrupadas bajo el rótulo de su nivel (Parqueo en el 1, lo que no es de un piso en «Toda la torre», al final), y la de contratistas a todos'},
};
async function probarCabecera(nombreVer, html, b){
  const D=datos(); const {ACTS,PERS}=D;
  const ESC=[], LEC=[]; let contar=false;
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const r={};
  const ok=(q,body)=>q.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  for(const W of [1280,390]){
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:W,height:W>600?900:844}});
    await ctx.addInitScript(()=>{ window.confirm=()=>true; window.alert=()=>{}; });
    await ctx.route('**', q=>{
      const u=q.request().url(), m=q.request().method();
      if(u.startsWith(ORIGEN)) return q.continue();
      if(!/\/rest\/v1\//.test(u)) return q.abort();
      const pth=decodeURIComponent(u.split('/rest/v1/')[1]||''), base=pth.split('?')[0];
      if(m!=='GET'){ if(contar) ESC.push(m+' '+base); return ok(q,[]); }
      if(contar) LEC.push(base);
      let f=[];
      if(base==='obra_actividades'){ f=ACTS; if(/estado=neq\.completado/.test(pth)) f=f.filter(a=>a.estado!=='completado'); }
      else if(base==='obra_personal') f=PERS;
      const rg=q.request().headers()['range']||''; if(rg){ const [d0,h]=rg.split('-').map(Number); f=f.slice(d0,h+1); }
      return ok(q,f);
    });
    const p=await ctx.newPage(); p.setDefaultTimeout(6000);
    const G=(f,...a)=>p.evaluate(f,...a);
    const arrancar=async()=>{
      await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
      await G(()=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify({id:'nilson',nombre:'Ing. Nilson',rol:'admin'})); }catch(e){} });
      await p.reload({waitUntil:'load'});
      for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
      await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1000);
    };
    try{
      await arrancar();
      // A Actividades como entra el dedo: la pestaña en ancho, el cajón en el teléfono.
      if(W>600) await p.locator('.tabs .tab[data-tab="actividades"]').click();
      else { await p.locator('button[onclick*="toggleDrawer"]:visible').first().click(); await p.waitForTimeout(300);
             await p.locator('.dw-btn[onclick="goTabD(\'obra\')"]').first().click(); }
      await p.waitForTimeout(400);
      await G(()=>{ S.actVista='lista'; S.actFiltroAvanzado={ubicaciones:['N2 — Apto 2A']}; renderActs(); });
      await p.waitForTimeout(600);
      const btn=p.locator('#btn-cab');
      const vis=sel=>G(sel=>[...document.querySelectorAll(sel)].some(e=>e.checkVisibility()),sel);
      const hay=await btn.isVisible().catch(()=>false);
      if(W>600) r.hayBoton=hay;
      if(!hay){ await ctx.close(); continue; }
      const estado=()=>G(()=>JSON.stringify([S.actFiltroRapidos,S.actFiltroAvanzado,S.actFiltroPlan,S.actFiltroTexto,S.actFiltro,S.actVista]));
      const filas=()=>G(()=>[...document.querySelectorAll('#c-act .act-item, #c-act tr[id^="act-"]')].filter(e=>e.checkVisibility()).map(e=>e.id).join(','));
      const html0=await G(()=>document.getElementById('c-act').innerHTML), est0=await estado(), filas0=await filas();
      const ls0=await G(()=>JSON.stringify(Object.keys(localStorage).sort()));
      if(W>600){
        const areas=[...new Set(ACTS.filter(a=>a.estado!=='completado'&&a.area).map(a=>a.area))].length;
        const pp=await G(()=>{
          const bs=[...document.querySelectorAll('#c-act [onclick^="_actToggleUbicacion"]')];
          const fila=bs.length?bs[0].parentElement:null;
          // El nivel, calculado aquí por su cuenta: N# es ese piso, Parqueo el 1, lo demás «Toda la torre» (99).
          const niv=a=>{ const m=/^N(\d+)\b/.exec(a); return m?+m[1]:(/^parqueo/i.test(a)?1:99); };
          let rot=null, ant=0, mal=0, rotulos=0;
          [...(fila?fila.children:[])].forEach(el=>{
            if(el.classList.contains('pil-nivel')){ rotulos++; const t=el.textContent.trim(); const n=/^nivel (\d+)$/i.exec(t)?+/(\d+)/.exec(t)[1]:(/toda la torre/i.test(t)?99:-1);
              if(n<=ant) mal++; rot=n; ant=n; return; }
            const a=JSON.parse((el.getAttribute('onclick').match(/_actToggleUbicacion\((.*)\)$/)||[])[1].replace(/&quot;/g,'"'));
            if(niv(a)!==rot) mal++;
          });
          return {c:document.querySelectorAll('#c-act [onclick^="_actTogglePersona"]').length, u:bs.length, mal, rotulos};
        });
        r.pastillas=(pp.u===areas?'todas las ubicaciones':'ubicaciones '+pp.u+' de '+areas)+' · '+
          (pp.rotulos&&!pp.mal?'por nivel':(pp.rotulos?pp.mal+' fuera de su nivel':'sin rótulos de nivel'))+' · '+(pp.c>6?'más de seis contratistas':pp.c+' contratistas');
      }
      contar=true;
      await btn.click(); await p.waitForTimeout(300);
      if(W>600){
        const esc=[await vis('.tabs'), await vis('#c-obra-subnav'), await vis('#c-act .act-cab')].filter(x=>!x).length;
        const quedan=(await vis('.hdr .hdr-title')) && (await vis('#sync'));
        r.pliega='pliega '+esc+(quedan?' · quedan título y sincronización':' · SE FUE el título o la sincronización');
        r.botonSigue=await G(()=>{ const b=document.getElementById('btn-cab'); const c=b.getBoundingClientRect();
          return b.checkVisibility() && c.top>=0 && c.bottom<=innerHeight && c.right<=innerWidth; });
        r.filtroSeVe=await G(()=>{ const n=document.querySelector('#btn-cab .btn-cab-n');
          const lin=[...document.querySelectorAll('#c-act span')].find(x=>/actividad/.test(x.textContent)&&x.checkVisibility());
          return (n&&n.checkVisibility()?n.textContent+' en el botón':'nada en el botón')+' · '+(lin&&/filtradas/.test(lin.textContent)?'«filtradas»':'sin «filtradas»'); });
        const filas1=await filas(), html1=await G(()=>document.getElementById('c-act').innerHTML);
        await btn.click(); await p.waitForTimeout(300);
        const filas2=await filas(), html2=await G(()=>document.getElementById('c-act').innerHTML), est2=await estado();
        r.mismaLista=!!filas0 && filas0===filas1 && filas1===filas2 && html0===html1;
        r.mismosChips=est0===est2 && html0===html2 && (await vis('#c-act .act-cab')) && (await vis('.tabs')) && (await vis('#c-obra-subnav'));
        // Volver a entrar y recargar: abierta las dos veces, y nada guardado.
        await btn.click(); await p.waitForTimeout(200);
        const ls1=await G(()=>JSON.stringify(Object.keys(localStorage).sort()));
        await p.locator('.tabs .tab[data-tab="equipo"]').click().catch(()=>{});
        await G(()=>goTab('equipo')); await p.waitForTimeout(200);
        const fueraPleg=await G(()=>document.body.classList.contains('act-plegada'));
        const fueraBtn=await btn.isVisible();
        await G(()=>goTab('obra')); await p.waitForTimeout(300);
        const reent=await G(()=>document.body.classList.contains('act-plegada'))?'plegada':'abierta';
        await btn.click(); await p.waitForTimeout(200);
        await G(()=>{ S.obraVista='kanban'; renderObra(); }); await p.waitForTimeout(200);
        const kanBtn=await btn.isVisible(), kanPleg=await G(()=>document.body.classList.contains('act-plegada'));
        r.soloActividades=(kanBtn||kanPleg?'Kanban SÍ':'Kanban no')+' · '+(fueraBtn||fueraPleg?'Obra SÍ':'Obra no');
        contar=false;
        await G(()=>{ S.obraVista='todas'; renderObra(); }); await p.waitForTimeout(200);
        await btn.click(); await p.waitForTimeout(200);
        await arrancar(); await G(()=>goTab('actividades')); await p.waitForTimeout(400);
        const rec=await G(()=>document.body.classList.contains('act-plegada'))?'plegada':'abierta';
        r.recargaAbierta=reent+' · '+rec+' · '+(ls0===ls1?'nada guardado':'GUARDÓ ALGO');
        r.ceroEscrituras=ESC.length+LEC.length;
        r._lecturas=LEC.slice(); r._escrituras=ESC.slice();
      } else {
        const pleg=await G(()=>document.body.classList.contains('act-plegada'));
        const tapa=await G(()=>{ const b=document.getElementById('btn-cab').getBoundingClientRect();
          /* Lo que no se puede tocar no cuenta: el velo del cajón cerrado cubre
             la pantalla entera con opacity:0 y pointer-events:none. Y el centro
             del botón tiene que ser el botón: si algo encima lo tapa, se cuenta. */
          const tocable=e=>{ const cs=getComputedStyle(e); return cs.pointerEvents!=='none' && cs.opacity!=='0'; };
          const enc=document.elementFromPoint((b.left+b.right)/2,(b.top+b.bottom)/2);
          const encima=(enc&&enc.closest('#btn-cab'))?0:1;
          return encima+[...document.querySelectorAll('button,input,select,a,[onclick]')].filter(e=>e.id!=='btn-cab'&&!e.closest('#btn-cab')&&e.checkVisibility()&&tocable(e)).filter(e=>{
            const c=e.getBoundingClientRect(); return c.width&&c.height&&c.left<b.right-1&&c.right>b.left+1&&c.top<b.bottom-1&&c.bottom>b.top+1; }).length; });
        const tit=await G(()=>{ const t=document.querySelector('.hdr .hdr-title'); return t.scrollWidth<=t.clientWidth; });
        const dentro=await G(()=>{ const c=document.getElementById('btn-cab').getBoundingClientRect(); return c.left>=0&&c.right<=innerWidth&&c.height>=40; });
        await btn.click(); await p.waitForTimeout(200);
        const vuelve=!(await G(()=>document.body.classList.contains('act-plegada')));
        r.cero390=(pleg&&vuelve&&dentro?'funciona':'NO funciona')+' · tapa '+tapa+' · '+(tit?'título entero':'título cortado');
        contar=false;
      }
      if(FOTOS){ await btn.click(); await p.waitForTimeout(200); await p.screenshot({path:path.join(FOTOS,nombreVer+'-cabecera-'+W+'.png')}); }
    }catch(e){ r._error=(r._error||'')+W+': '+String(e&&e.message||e).split('\n')[0].slice(0,140)+' '; }
    await ctx.close();
  }
  srv.close();
  for(const k of Object.keys(CAB_ESPERADO)) if(!(k in r)) r[k]=null;
  return r;
}

// ── VELOCIDAD (v144): la lista no se repinta de balde ni arma lo que no se ve ──
const VEL_ESPERADO={
  pliegueVacio:{v:'cerrado vacío · al tocar lleno · se cierra', d:'v144: el pliegue de una fila cerrada nace vacío y se arma al tocarla, con sus botones; otro toque lo cierra'},
  mismasFilas:{v:true, d:'la lista enseña exactamente las mismas actividades, en el mismo orden, que S.acts filtrado'},
  refrescoQuieto:{v:'no repinta', d:'un refresco de 90 s en el que no cambió nada no vuelve a pintar la lista'},
  refrescoConCambio:{v:'repinta', d:'si cambió algo (aquí, la asistencia), sí la vuelve a pintar'},
  reportesOculto:{v:0, d:'con Reportes cerrado, ni el arranque ni el refresco pintan el tablero'},
  ceroEscrituras:{v:0, d:'nada de esto escribe en la base'},
};
async function probarVelocidad(nombreVer, html, b){
  const D=datos(); const {ACTS,PERS}=D;
  const ESC=[]; const r={};
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const ok=(q,body)=>q.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  await ctx.addInitScript(()=>{ window.confirm=()=>true; window.alert=()=>{}; });
  await ctx.route('**', q=>{
    const u=q.request().url(), m=q.request().method();
    if(u.startsWith(ORIGEN)) return q.continue();
    if(!/\/rest\/v1\//.test(u)) return q.abort();
    const pth=decodeURIComponent(u.split('/rest/v1/')[1]||''), base=pth.split('?')[0];
    if(m!=='GET'){ ESC.push(m+' '+base); return ok(q,[]); }
    let f=[];
    if(base==='obra_actividades'){ f=ACTS; if(/estado=neq\.completado/.test(pth)) f=f.filter(a=>a.estado!=='completado'); if(/propuesta=is\.true/.test(pth)) f=[]; }
    else if(base==='obra_personal') f=PERS;
    const rg=q.request().headers()['range']||''; if(rg){ const [d0,h]=rg.split('-').map(Number); f=f.slice(d0,h+1); }
    return ok(q,f);
  });
  const p=await ctx.newPage(); p.setDefaultTimeout(8000);
  const G=(f,...a)=>p.evaluate(f,...a);
  try{
    await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
    await G(()=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify({id:'nilson',nombre:'Ing. Nilson',rol:'admin'})); }catch(e){} });
    // El tablero de Reportes se cuenta desde ANTES del arranque.
    await ctx.addInitScript(()=>{ window.__nRep=0; });
    await p.reload({waitUntil:'load'});
    await G(()=>{ var o=window.renderReportes; window.renderReportes=function(){ window.__nRep++; return o.apply(this,arguments); }; });
    for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
    await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1500);
    await p.locator('button[onclick*="toggleDrawer"]:visible').first().click(); await p.waitForTimeout(300);
    await p.locator('.dw-btn[onclick="goTabD(\'obra\')"]').first().click(); await p.waitForTimeout(400);
    await G(()=>{ S.actVista='lista'; renderActs(); }); await p.waitForTimeout(800);
    await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1000);
    r.mismasFilas=await G(()=>{ const ids=[...document.querySelectorAll('#c-act .act-item')].map(e=>e.id.slice(4));
      const gs=getActGroupsFromActs(applyActFilters(S.acts)); const esp=[]; gs.forEach(g=>g.items.forEach(a=>esp.push(a.id)));
      return ids.length>0 && ids.join(',')===esp.join(','); });
    const fila=p.locator('#c-act .act-item').first();
    const id=(await fila.getAttribute('id')).slice(4);
    const cerrado=await G(i=>{ const d=document.getElementById('det-'+i); return d.style.display==='none' && d.querySelectorAll('button').length===0; },id);
    await fila.locator('[onclick^="toggleActDet"]').first().click(); await p.waitForTimeout(300);
    const lleno=await G(i=>{ const d=document.getElementById('det-'+i); return d.checkVisibility() && d.querySelectorAll('button').length>3; },id);
    await fila.locator('[onclick^="toggleActDet"]').first().click(); await p.waitForTimeout(300);
    const cierra=await G(i=>document.getElementById('det-'+i).style.display==='none',id);
    r.pliegueVacio=[cerrado?'cerrado vacío':'cerrado LLENO', lleno?'al tocar lleno':'al tocar VACÍO', cierra?'se cierra':'NO se cierra'].join(' · ');
    // El refresco: se marca el primer renglón; si se repinta, el nodo cambia.
    const tic=async()=>G(async()=>{ for(let i=0;i<100 && _refCorriendo;i++) await new Promise(x=>setTimeout(x,100));
      const n0=document.querySelector('#c-act .act-item'); _refUltimo=Date.now()-60000; _refEntero=Date.now(); await _refrescoTick(true);
      return document.querySelector('#c-act .act-item')===n0?'no repinta':'repinta'; });
    r.refrescoQuieto=await tic();
    await G(()=>{ S.asist=[{id:'x',estado:'presente'}]; });
    r.refrescoConCambio=await tic();
    r.reportesOculto=await G(()=>window.__nRep);
    r.ceroEscrituras=ESC.length;
  }catch(e){ r._error=String(e&&e.message||e).split('\n')[0].slice(0,200); }
  await ctx.close(); srv.close();
  for(const k of Object.keys(VEL_ESPERADO)) if(!(k in r)) r[k]=null;
  return r;
}

// ── AVANCE (v146): el reporte por ubicación, por contratista y la matriz ──
/* Los números se comparan contra una cuenta hecha AQUÍ, en Node, con las reglas
   escritas otra vez desde el pedido —no llamando al código del app—: si las
   dos dicen lo mismo, el app cuenta lo que se pidió. */
const AVA_ESPERADO={
  ubicaciones:{v:'cuadran 3 de 3', d:'abiertas, vencidas y completadas de Apto 2A, Apto 4A y Parqueo = la cuenta directa'},
  contratistas:{v:'cuadran 3 de 3', d:'lo mismo para Daniel Espinal, Yelson Jimenez y el personal propio'},
  propio:{v:'una fila · sin nombres sueltos', d:'el personal propio sale como «Personal x la casa», sin una fila por cada nombre de la casa'},
  vacios:{v:'Sin ubicación · Sin asignar', d:'lo que no tiene ubicación o contratista sale en su fila, no se pierde'},
  propuesta:{v:'no suma · se avisa', d:'una propuesta en el 2A no cambia ningún número, y arriba se dice que hay una esperando'},
  desglose:{v:'exacto 4 de 4', d:'tocar abiertas, vencidas, completadas y un cuadro de la matriz enseña una lista del MISMO tamaño que el número'},
  vencidaOrden:{v:'la más vieja arriba', d:'las vencidas de Dimedes van ordenadas por días de atraso, la más vieja primero'},
  dias30:{v:'vencida 30 días', d:'una partida con entrega de hace 30 días dice 30'},
  matriz390:{v:'se desliza · primera columna fija · página no', d:'a 390 la matriz se desliza dentro de su caja, la columna de ubicaciones no se mueve y la página no se desborda'},
  dedos:{v:0, d:'nada de lo que se toca en el reporte mide menos de 40 px'},
  ceroEscrituras:{v:0, d:'el reporte no escribe nada'},
};
async function probarAvance(nombreVer, html, b){
  const D=datos(); const {ACTS,PERS}=D;
  const ESC=[]; const r={};
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const ok=(q,body)=>q.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  const hoyNode=(()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })();
  const menos=(iso,n)=>{ const d=new Date(iso+'T12:00:00'); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };
  // Una vencida de hace exactamente 30 días, y una propuesta en el 2A que no puede contar.
  ACTS.push({id:'v30',descripcion:'Partida vencida hace treinta días',area:'N2 — Apto 2A',estado:'pendiente',porcentaje:'0',tipo_personal:'contratista',personal_nombre:'Milo',fecha:menos(hoyNode,40),fecha_inicio:menos(hoyNode,40),fecha_fin:menos(hoyNode,30),prioridad:'normal'});
  ACTS.push({id:'prop1',descripcion:'Propuesta que no cuenta',area:'N2 — Apto 2A',estado:'pendiente',porcentaje:'0',tipo_personal:'contratista',personal_nombre:'Milo',fecha:hoyNode,fecha_inicio:'',fecha_fin:menos(hoyNode,5),propuesta:true,propuesta_por:'Ing. Karina Breton',propuesta_fecha:hoyNode});
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  await ctx.addInitScript(()=>{ window.confirm=()=>true; window.alert=()=>{}; window.open=()=>null; });
  await ctx.route('**', q=>{
    const u=q.request().url(), m=q.request().method();
    if(u.startsWith(ORIGEN)) return q.continue();
    if(!/\/rest\/v1\//.test(u)) return q.abort();
    const pth=decodeURIComponent(u.split('/rest/v1/')[1]||''), base=pth.split('?')[0];
    if(m!=='GET'){ ESC.push(m+' '+base); return ok(q,[]); }
    let f=[];
    if(base==='obra_actividades'){ f=ACTS;
      if(/estado=neq\.completado/.test(pth)) f=f.filter(a=>a.estado!=='completado');
      if(/estado=eq\.completado/.test(pth)) f=f.filter(a=>a.estado==='completado');
      if(/propuesta=not\.is\.true/.test(pth)) f=f.filter(a=>a.propuesta!==true);
      else if(/propuesta=is\.true/.test(pth)) f=f.filter(a=>a.propuesta===true); }
    else if(base==='obra_personal') f=PERS;
    const rg=q.request().headers()['range']||''; if(rg){ const [d0,h]=rg.split('-').map(Number); f=f.slice(d0,h+1); }
    return ok(q,f);
  });
  const p=await ctx.newPage(); p.setDefaultTimeout(8000);
  const G=(f,...a)=>p.evaluate(f,...a);
  // La cuenta directa, con las reglas del pedido.
  const PROP=new Set(PERS.filter(x=>x.tipo==='propio').map(x=>x.nombre));
  const quien=a=>{ const tp=a.tipo_personal||'', n=String(a.personal_nombre||'').trim();
    if(tp==='propio') return 'Personal x la casa'; if(tp==='ingeniero') return 'Ingeniería'; if(!n) return 'Sin asignar';
    const ns=n.split(',').map(x=>x.trim()).filter(Boolean); return ns.every(x=>PROP.has(x))?'Personal x la casa':n; };
  const vivas=ACTS.filter(a=>a.propuesta!==true);
  const cuenta=(pred)=>{ const l=vivas.filter(pred);
    return {ab:l.filter(a=>a.estado!=='completado').length, venc:l.filter(a=>a.estado!=='completado'&&a.fecha_fin&&a.fecha_fin<hoyNode).length, comp:l.filter(a=>a.estado==='completado').length}; };
  // Lo que dice la fila de la pantalla con ese nombre.
  const leer=nom=>G(n=>{ const f=[...document.querySelectorAll('#c-ra .ra-fila')].find(x=>x.querySelector('.ra-nom-t').textContent===n); if(!f) return null;
    const v=[...f.querySelectorAll('.ra-num b')].map(x=>x.textContent); return {ab:+v[0],venc:+v[1],comp:+v[2]}; },nom);
  try{
    await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
    await G(()=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify({id:'nilson',nombre:'Ing. Nilson',rol:'admin'})); }catch(e){} });
    await p.reload({waitUntil:'load'});
    for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
    await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1500);
    // Entrar como el dedo: el cajón del teléfono.
    await entrarAvance(p);
    for(let t=0;t<20;t++){ if(await G(()=>!/trayendo/.test(document.getElementById('c-ra').innerText))) break; await p.waitForTimeout(300); }
    r._msUbic=await G(()=>{ const a=performance.now(); renderAvanceRep(); return Math.round(performance.now()-a); });
    // Por ubicación: se abren los niveles 1, 2 y 4.
    for(const n of ['Nivel 1','Nivel 2','Nivel 4']){
      await p.locator('#c-ra .ra-fila',{has:p.locator('.ra-nom-t',{hasText:new RegExp('^'+n+'$')})}).locator('.ra-plg').click(); await p.waitForTimeout(150); }
    let bien=0;
    for(const ar of ['N2 — Apto 2A','N4 — Apto 4A','Parqueo']){
      const e=cuenta(a=>(a.area||'').trim()===ar), v=await leer(ar);
      if(v&&v.ab===e.ab&&v.venc===e.venc&&v.comp===e.comp) bien++; else r['_ubic_'+ar]={pantalla:v,cuenta:e}; }
    r.ubicaciones='cuadran '+bien+' de 3';
    const sinUbic=!!(await leer('Sin ubicación'))||await G(()=>/Sin ubicación/.test(document.getElementById('c-ra').innerText));
    const nProp=await G(()=>/1 propuesta esperando/.test(document.getElementById('c-ra').innerText));
    // La partida de hace 30 días, desde las vencidas del 2A.
    await p.locator('#c-ra .ra-fila',{has:p.locator('.ra-nom-t',{hasText:/^N2 — Apto 2A$/})}).locator('.ra-num',{hasText:'vencidas'}).click(); await p.waitForTimeout(300);
    r.dias30=await G(()=>{ const x=[...document.querySelectorAll('#c-ra .ra-act')].find(e=>/treinta días/.test(e.innerText)); const m=x&&x.innerText.match(/vencida \d+ días?/); return m?m[0]:'no está'; });
    await p.locator('#c-ra .ra-volver').click(); await p.waitForTimeout(200);
    // Por contratista.
    await p.locator('#c-ra .ra-vistas button',{hasText:'Por contratista'}).click(); await p.waitForTimeout(300);
    r._msCont=await G(()=>{ const a=performance.now(); renderAvanceRep(); return Math.round(performance.now()-a); });
    bien=0;
    for(const q of ['Daniel Espinal','Yelson Jimenez','Personal x la casa']){
      const e=cuenta(a=>quien(a)===q), v=await leer(q);
      if(v&&v.ab===e.ab&&v.venc===e.venc&&v.comp===e.comp) bien++; else r['_cont_'+q]={pantalla:v,cuenta:e}; }
    r.contratistas='cuadran '+bien+' de 3';
    const nombres=await G(()=>[...document.querySelectorAll('#c-ra .ra-nom-t')].map(x=>x.textContent));
    const sueltos=nombres.filter(n=>['Antonio','Gregory','Maison','Bienvenido','Carlos','Elvin','Fausto'].includes(n)||/Antonio, Gregory/.test(n));
    r.propio=(nombres.filter(n=>n==='Personal x la casa').length===1?'una fila':'filas: '+nombres.filter(n=>n==='Personal x la casa').length)+' · '+(sueltos.length?'sueltos: '+sueltos.join('|'):'sin nombres sueltos');
    r.vacios=[sinUbic?'Sin ubicación':'SIN «Sin ubicación»', nombres.includes('Sin asignar')?'Sin asignar':'SIN «Sin asignar»'].join(' · ');
    { const e2a=cuenta(a=>(a.area||'').trim()==='N2 — Apto 2A');
      const conProp=ACTS.filter(a=>(a.area||'')==='N2 — Apto 2A'&&a.estado!=='completado').length;
      r.propuesta=(e2a.ab!==conProp && !r['_ubic_N2 — Apto 2A']?'no suma':'SUMA o no se probó')+' · '+(nProp?'se avisa':'no se avisa'); }
    // El desglose es del mismo tamaño que el número.
    let exactos=0;
    const tocar=async(fila,etq)=>{ const loc=p.locator('#c-ra .ra-fila',{has:p.locator('.ra-nom-t',{hasText:new RegExp('^'+fila.replace(/[()]/g,'\\$&')+'$')})}).locator('.ra-num',{hasText:etq});
      const n=+(await loc.locator('b').textContent()); await loc.click(); await p.waitForTimeout(300);
      for(let i=0;i<30 && await p.locator('#c-ra .ra-mas').count();i++){ await p.locator('#c-ra .ra-mas').click(); await p.waitForTimeout(100); }
      const l=await p.locator('#c-ra .ra-act').count(); const dice=+(await p.locator('#c-ra .ra-det-t b').textContent());
      return {n,l,dice}; };
    for(const [f,e] of [['Daniel Espinal','abiertas'],['Yelson Jimenez','completadas']]){
      const t=await tocar(f,e); if(t.n===t.l&&t.l===t.dice) exactos++; else r['_des_'+f]=t;
      await p.locator('#c-ra .ra-volver').click(); await p.waitForTimeout(200); }
    { const t=await tocar('Dimedes Estebez (Niño)','vencidas'); if(t.n===t.l&&t.l===t.dice) exactos++; else r._desDim=t;
      const dias=await G(()=>[...document.querySelectorAll('#c-ra .ra-act')].map(e=>{ const m=e.innerText.match(/vencida (\d+)/); return m?+m[1]:-1; }));
      r.vencidaOrden=(dias.length>1&&dias.every((d,i)=>i===0||d<=dias[i-1])&&dias.every(d=>d>0))?'la más vieja arriba':'desordenadas: '+dias.slice(0,8).join(',');
      await p.locator('#c-ra .ra-volver').click(); await p.waitForTimeout(200); }
    // La matriz, a 390.
    await p.locator('#c-ra .ra-vistas button',{hasText:'Matriz'}).click(); await p.waitForTimeout(300);
    r._msMatriz=await G(()=>{ const a=performance.now(); renderAvanceRep(); return Math.round(performance.now()-a); });
    r.matriz390=await G(()=>{ const c=document.querySelector('#c-ra .ra-mx'); const f=c.querySelector('tbody tr:not(.ra-mx-niv) .ra-mx-f');
      const x0=f.getBoundingClientRect().left, puede=c.scrollWidth>c.clientWidth+20; c.scrollLeft=300; const x1=f.getBoundingClientRect().left; c.scrollLeft=0;
      return [puede?'se desliza':'NO se desliza', Math.abs(x1-x0)<1?'primera columna fija':'la columna se movió '+Math.round(x1-x0), document.documentElement.scrollWidth<=innerWidth?'página no':'la página se desborda'].join(' · '); });
    { const cel=p.locator('#c-ra .ra-mx-c:not(.ra-mx-ct)').first(); await cel.scrollIntoViewIfNeeded(); const n=+(await cel.textContent()); await cel.click(); await p.waitForTimeout(300);
      const l=await p.locator('#c-ra .ra-act').count(); if(n===l) exactos++; else r._desCelda={n,l}; await p.locator('#c-ra .ra-volver').click(); await p.waitForTimeout(200); }
    r.desglose='exacto '+exactos+' de 4';
    // Los dedos: todo lo que se toca, en las tres vistas y en un desglose.
    let chicos=0;
    for(const v of ['Por ubicación','Por contratista','Matriz']){
      await p.locator('#c-ra .ra-vistas button',{hasText:v}).click(); await p.waitForTimeout(200);
      chicos+=await G(()=>[...document.querySelectorAll('#c-ra button, #c-ra [role="button"]')].filter(e=>e.checkVisibility()&&!e.disabled&&e.getBoundingClientRect().height<40).length); }
    r.dedos=chicos;
    r.ceroEscrituras=ESC.length;
    if(FOTOS){ await p.screenshot({path:path.join(FOTOS,nombreVer+'-avance-matriz.png')});
      await p.locator('#c-ra .ra-vistas button',{hasText:'Por ubicación'}).click(); await p.waitForTimeout(200);
      await p.screenshot({path:path.join(FOTOS,nombreVer+'-avance-ubic.png')}); }
  }catch(e){ r._error=String(e&&e.message||e).split('\n')[0].slice(0,200); }
  await ctx.close(); srv.close();
  for(const k of Object.keys(AVA_ESPERADO)) if(!(k in r)) r[k]=null;
  return r;
}

// ── LA HOJA DE REPORTE (v147): la de un contratista y la de una ubicación ──
/* Como AVANCE: los números se comparan contra una cuenta hecha AQUÍ, en Node,
   con las reglas del pedido. Y además contra la fila de la v146 de la misma
   persona o sitio: si no cuadran, uno de los dos está mal. El movimiento de 7
   días sale de un `obra_cambios` inventado, con un renglón viejo que NO puede
   contar. La impresión se comprueba de verdad: la hoja que se manda a la
   impresora se vuelve PDF A4 y se cuentan las páginas. */
const HOJA_ESPERADO={
  cuadraCont:{v:'cuadran 3 de 3', d:'total, completadas, abiertas, vencidas y trabadas de la hoja de Daniel, Yelson y el personal propio = la cuenta directa'},
  cuadraUbic:{v:'cuadran 3 de 3', d:'lo mismo para la hoja del Apto 2A, del Apto 4A y del N1 — Lobby'},
  igualV146:{v:'iguales 6 de 6', d:'abiertas, vencidas y completadas de cada hoja = lo que dice su fila en la vista de la v146'},
  resumenSuma:{v:'suma exacto 2 de 2', d:'las filas del resumen de abajo (por área / por contratista) suman exactamente el total de arriba, columna por columna'},
  desglose:{v:'exacto 5 de 5', d:'tocar vencidas, una celda del resumen, «tocadas» de la banda, una causa de traba y la propuesta enseña una lista del MISMO tamaño'},
  movimiento:{v:'cerradas 2 · avanzaron 2 · tocadas 6', d:'la banda de Daniel cuenta lo de los últimos 7 días y deja fuera el renglón de hace 10 y la corrección de ubicación, aunque la semana pase de 1.000 renglones'},
  sinMovimiento:{v:'dice la frase', d:'un contratista sin nada en 7 días dice «Sin movimiento en los últimos 7 días.», no una banda vacía'},
  propuesta:{v:'no suma · renglón 1', d:'la propuesta del 2A no cambia ningún total de la hoja y sale en su renglón aparte'},
  nivel1:{v:'Parqueo · N1 — Lobby · las dos con hoja', d:'el Nivel 1 enseña el Parqueo y el Lobby, y cada uno abre su hoja por separado'},
  telefono:{v:'2 por fila · paneles apilados · página no', d:'a 390 los cuadros van de dos en dos, los paneles uno debajo del otro y nada se desborda'},
  dedos:{v:0, d:'nada de lo que se toca en la hoja mide menos de 40 px'},
  imprimir:{v:'1 página · fondo blanco · sin botones vivos · logo', d:'la hoja impresa sale en UNA página A4, en blanco aunque el app esté oscuro, sin onclick y con la cabecera Bridex'},
  sinDinero:{v:'sin montos', d:'ni RD$, ni precio, ni monto, ni cubicación en la hoja'},
  ceroEscrituras:{v:0, d:'la hoja no escribe nada'},
};
async function probarHoja(nombreVer, html, b){
  const D=datos(); const {ACTS,PERS}=D;
  const ESC=[]; const r={};
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const ok=(q,body)=>q.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  const hoyNode=(()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })();
  const menos=(iso,n)=>{ const d=new Date(iso+'T12:00:00'); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };
  // El Lobby nuevo del Nivel 1 (26-oct), dos trabadas de Daniel y una propuesta en el 2A.
  for(let i=0;i<6;i++) ACTS.push({id:'lob'+i,descripcion:'Lobby partida '+i,area:'N1 — Lobby',estado:i<2?'completado':'pendiente',porcentaje:i<2?'100':'25',
    tipo_personal:'contratista',personal_nombre:i%2?'Daniel Espinal':'Milo',fecha:menos(hoyNode,20),fecha_inicio:menos(hoyNode,20),fecha_fin:menos(hoyNode,i<4?3:-9),prioridad:'normal'});
  ACTS.push({id:'tr1',descripcion:'Trabada por material',area:'N2 — Apto 2A',estado:'pausada',porcentaje:'50',tipo_personal:'contratista',personal_nombre:'Daniel Espinal',
    fecha:menos(hoyNode,15),fecha_inicio:menos(hoyNode,15),fecha_fin:menos(hoyNode,2),estancada_causa:'material',estancada_motivo:'cemento',prioridad:'normal'});
  ACTS.push({id:'tr2',descripcion:'Trabada por otro taller',area:'N4 — Apto 4A',estado:'pausada',porcentaje:'0',tipo_personal:'contratista',personal_nombre:'Daniel Espinal',
    fecha:menos(hoyNode,15),fecha_inicio:menos(hoyNode,15),fecha_fin:menos(hoyNode,-5),estancada_causa:'otro_taller',prioridad:'normal'});
  ACTS.push({id:'prop1',descripcion:'Propuesta que no cuenta',area:'N2 — Apto 2A',estado:'pendiente',porcentaje:'0',tipo_personal:'contratista',personal_nombre:'Milo',
    fecha:hoyNode,fecha_inicio:'',fecha_fin:'',propuesta:true,propuesta_por:'Ing. Karina Breton',propuesta_fecha:hoyNode});
  // El historial: cinco de Daniel en la semana y uno de hace 10 días que NO cuenta. Yelson, nada.
  const dan=ACTS.filter(a=>a.personal_nombre==='Daniel Espinal'&&a.tipo_personal!=='propio'&&a.propuesta!==true).map(a=>a.id);
  const CAMB=[
    {entidad_id:dan[0],accion:'completado',detalle:'Marcada como completada',fecha:hoyNode},
    {entidad_id:dan[1],accion:'editado',detalle:'estado: en_progreso → completado',fecha:menos(hoyNode,2)},
    {entidad_id:dan[1],accion:'avance',detalle:'75%',fecha:menos(hoyNode,3)},
    {entidad_id:dan[2],accion:'avance',detalle:'50%',fecha:menos(hoyNode,1)},
    {entidad_id:dan[3],accion:'editado',detalle:'avance: 25% → 50%',fecha:menos(hoyNode,6)},
    {entidad_id:dan[4],accion:'revisado',detalle:'Revisada sin cambios',fecha:hoyNode},
    {entidad_id:dan[5],accion:'completado',detalle:'Marcada como completada',fecha:menos(hoyNode,10)},
    // Arreglar el dato no es mover la obra: la corrección de ubicación del 26-oct no cuenta.
    {entidad_id:dan[6],accion:'editado',detalle:'Ubicacion corregida: Terraza -> N1 - Lobby',fecha:hoyNode},
  ].map(c=>Object.assign({entidad:'actividad'},c));
  // 1.100 renglones de UNA partida delante de todo: la base no da más de 1.000
  // por pedido, y sin paginar se perdería lo de detrás (pasó con la primera v147).
  for(let i=0;i<1100;i++) CAMB.unshift({entidad:'actividad',entidad_id:dan[7],accion:'editado',detalle:'notas',fecha:hoyNode});
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},colorScheme:'dark'});
  await ctx.addInitScript(()=>{ window.confirm=()=>true; window.alert=()=>{};
    // La ventana de imprimir: se guarda lo que el app escribe en ella.
    window.open=()=>{ const w={_html:'', document:{write:t=>{w._html+=t;}, close:()=>{}}}; window.__impresa=w; return w; }; });
  await ctx.route('**', q=>{
    const u=q.request().url(), m=q.request().method();
    if(u.startsWith(ORIGEN)) return q.continue();
    if(!/\/rest\/v1\//.test(u)) return q.abort();
    const pth=decodeURIComponent(u.split('/rest/v1/')[1]||''), base=pth.split('?')[0];
    if(m!=='GET'){ ESC.push(m+' '+base); return ok(q,[]); }
    let f=[];
    if(base==='obra_actividades'){ f=ACTS;
      if(/estado=neq\.completado/.test(pth)) f=f.filter(a=>a.estado!=='completado');
      if(/estado=eq\.completado/.test(pth)) f=f.filter(a=>a.estado==='completado');
      if(/propuesta=not\.is\.true/.test(pth)) f=f.filter(a=>a.propuesta!==true);
      else if(/propuesta=is\.true/.test(pth)) f=f.filter(a=>a.propuesta===true); }
    else if(base==='obra_personal') f=PERS;
    else if(base==='obra_cambios'){ f=CAMB;
      const g=/fecha=gte\.(\d{4}-\d{2}-\d{2})/.exec(pth); if(g) f=f.filter(c=>c.fecha>=g[1]);
      if(/accion\.eq\.completado/.test(pth)) f=f.filter(c=>c.accion==='completado'||/→ completado/.test(c.detalle));
      else if(/accion\.eq\.avance/.test(pth)) f=f.filter(c=>c.accion==='avance'||/avance:/.test(c.detalle));
      else if(/detalle\.not\.ilike\.Ubicaci/.test(pth)) f=f.filter(c=>!/^Ubicaci.n corregida/i.test(c.detalle||''));
      if(!(q.request().headers()['range'])) f=f.slice(0,1000); }   // como la base: 1.000 por pedido
    const rg=q.request().headers()['range']||''; if(rg){ const [d0,h]=rg.split('-').map(Number); f=f.slice(d0,h+1); }
    return ok(q,f);
  });
  const p=await ctx.newPage(); p.setDefaultTimeout(8000);
  const G=(f,...a)=>p.evaluate(f,...a);
  const PROP=new Set(PERS.filter(x=>x.tipo==='propio').map(x=>x.nombre));
  const quien=a=>{ const tp=a.tipo_personal||'', n=String(a.personal_nombre||'').trim();
    if(tp==='propio') return 'Personal x la casa'; if(tp==='ingeniero') return 'Ingeniería'; if(!n) return 'Sin asignar';
    const ns=n.split(',').map(x=>x.trim()).filter(Boolean); return ns.every(x=>PROP.has(x))?'Personal x la casa':n; };
  const vivas=ACTS.filter(a=>a.propuesta!==true);
  const cuenta=pred=>{ const l=vivas.filter(pred);
    return {total:l.length, comp:l.filter(a=>a.estado==='completado').length, ab:l.filter(a=>a.estado!=='completado').length,
      venc:l.filter(a=>a.estado!=='completado'&&a.fecha_fin&&a.fecha_fin<hoyNode).length, trab:l.filter(a=>a.estado==='pausada').length}; };
  // Lo que dice la hoja abierta: los cuatro cuadros y el renglón «Trabadas» del primer panel.
  const leerHoja=()=>G(()=>{ const h=document.getElementById('hj-hoja'); if(!h) return null;
    const c=[...h.querySelectorAll('.hj-cuadro .hj-cifra')].map(x=>+x.textContent);
    const tr=[...h.querySelectorAll('.hj-panel')][0].querySelectorAll('.hj-r')[4].lastElementChild.textContent;
    return {total:c[0],comp:c[1],ab:c[2],venc:c[3],trab:+tr}; });
  const leerFila=nom=>G(n=>{ const f=[...document.querySelectorAll('#c-ra .ra-fila')].find(x=>x.querySelector('.ra-nom-t').textContent===n); if(!f) return null;
    const v=[...f.querySelectorAll('.ra-num b')].map(x=>x.textContent); return {ab:+v[0],venc:+v[1],comp:+v[2]}; },nom);
  const abrirHoja=async nom=>{ await p.locator('#c-ra .ra-fila',{has:p.locator('.ra-nom-t',{hasText:new RegExp('^'+nom.replace(/[()]/g,'\\$&')+'$')})}).locator('.ra-hoja-b').click(); await p.waitForTimeout(300);
    for(let t=0;t<20;t++){ if(await G(()=>!/Trayendo el movimiento/.test(document.getElementById('c-ra').innerText))) break; await p.waitForTimeout(200); } };
  const cerrarHoja=async()=>{ await p.locator('#c-ra .hj-volver button').click(); await p.waitForTimeout(200); };
  // El tamaño de la lista que abre un botón de la hoja.
  const tocar=async(loc,numLoc)=>{ const n=parseInt(await (numLoc||loc).textContent(),10); await loc.click(); await p.waitForTimeout(300);
    for(let i=0;i<30 && await p.locator('#c-ra .ra-mas').count();i++){ await p.locator('#c-ra .ra-mas').click(); await p.waitForTimeout(100); }
    const l=await p.locator('#c-ra .ra-act').count(), dice=+(await p.locator('#c-ra .ra-det-t b').textContent());
    await p.locator('#c-ra .ra-volver').click(); await p.waitForTimeout(200);
    return {n,l,dice,ok:n===l&&l===dice}; };
  const resumenSuma=()=>G(()=>{ const h=document.getElementById('hj-hoja');
    const filas=[...h.querySelectorAll('.hj-tb tbody tr')], tot=filas.pop();
    const num=td=>parseInt(td.textContent,10)||0;
    return [1,2,3,4].every(c=>filas.reduce((s,f)=>s+num(f.children[c]),0)===num(tot.children[c]))
      && num(tot.children[1])===+h.querySelector('.hj-cuadro .hj-cifra').textContent; });
  try{
    await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
    await G(()=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify({id:'nilson',nombre:'Ing. Nilson',rol:'admin'})); }catch(e){} });
    await p.reload({waitUntil:'load'});
    for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
    await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1500);
    await entrarAvance(p);
    for(let t=0;t<20;t++){ if(await G(()=>!/trayendo/.test(document.getElementById('c-ra').innerText))) break; await p.waitForTimeout(300); }
    let desg=0, iguales=0, sumas=0, chicos=0;
    const contarChicos=()=>G(()=>[...document.querySelectorAll('#c-ra button, #c-ra [role="button"]')].filter(e=>e.checkVisibility()&&!e.disabled&&e.getBoundingClientRect().height<40).length);
    // ── Por ubicación: el Nivel 1 con sus dos áreas.
    await p.locator('#c-ra .ra-fila',{has:p.locator('.ra-nom-t',{hasText:/^Nivel 1$/})}).locator('.ra-plg').click(); await p.waitForTimeout(150);
    r.nivel1=await G(()=>{ const hijos=[...document.querySelectorAll('#c-ra .ra-hijos')][0]; if(!hijos) return 'no se abre';
      const fs=[...hijos.querySelectorAll('.ra-fila')]; return fs.map(f=>f.querySelector('.ra-nom-t').textContent).sort((x,y)=>x==='Parqueo'?-1:y==='Parqueo'?1:x.localeCompare(y)).join(' · ')
        +(fs.length&&fs.every(f=>f.querySelector('.ra-hoja-b'))?' · las dos con hoja':' · SIN hoja'); });
    for(const n of ['Nivel 2','Nivel 4']){ await p.locator('#c-ra .ra-fila',{has:p.locator('.ra-nom-t',{hasText:new RegExp('^'+n+'$')})}).locator('.ra-plg').click(); await p.waitForTimeout(150); }
    let bien=0;
    for(const ar of ['N2 — Apto 2A','N4 — Apto 4A','N1 — Lobby']){
      const fila=await leerFila(ar); await abrirHoja(ar); const v=await leerHoja(), e=cuenta(a=>(a.area||'').trim()===ar);
      if(v&&['total','comp','ab','venc','trab'].every(k=>v[k]===e[k])) bien++; else r['_ubic_'+ar]={hoja:v,cuenta:e};
      if(v&&fila&&fila.ab===v.ab&&fila.venc===v.venc&&fila.comp===v.comp) iguales++; else r['_v146_'+ar]={hoja:v,fila};
      if(ar==='N2 — Apto 2A'){
        if(await resumenSuma()) sumas++; else r._sumaApto=true;
        const pr=await G(()=>{ const x=[...document.querySelectorAll('#hj-hoja .hj-r-prop')][0]; return x?parseInt(x.lastElementChild.textContent,10):-1; });
        r.propuesta=(v&&v.total===e.total?'no suma':'SUMA')+' · renglón '+pr;
        { const t=await tocar(p.locator('#hj-hoja .hj-r-prop .hj-n')); if(t.ok) desg++; else r._desProp=t; }
        { const t=await tocar(p.locator('#hj-hoja .hj-tb tbody tr:first-child td:nth-child(2) .hj-n')); if(t.ok) desg++; else r._desCelda=t; }
        r.sinDinero=await G(()=>/RD\$|precio|monto|cubicaci|\$\s?\d/i.test(document.getElementById('hj-hoja').innerText)?'HAY MONTOS':'sin montos');
        r.telefono=await G(()=>{ const c=[...document.querySelectorAll('#hj-hoja .hj-cuadro')].map(e=>Math.round(e.getBoundingClientRect().top));
          const ps=[...document.querySelectorAll('#hj-hoja .hj-panel')].map(e=>e.getBoundingClientRect());
          return [(c[0]===c[1]&&c[1]!==c[2]&&c[2]===c[3])?'2 por fila':'cuadros: '+c.join(','),
            ps.length===2&&ps[1].top>=ps[0].bottom-1?'paneles apilados':'paneles lado a lado',
            document.documentElement.scrollWidth<=innerWidth?'página no':'la página se desborda'].join(' · '); });
        chicos+=await contarChicos();
        if(FOTOS) await p.locator('#hj-hoja').screenshot({path:path.join(FOTOS,nombreVer+'-hoja-2A.png')});
      }
      await cerrarHoja();
    }
    r.cuadraUbic='cuadran '+bien+' de 3';
    // ── Por contratista.
    await p.locator('#c-ra .ra-vistas button',{hasText:'Por contratista'}).click(); await p.waitForTimeout(300);
    bien=0;
    for(const q of ['Daniel Espinal','Yelson Jimenez','Personal x la casa']){
      const fila=await leerFila(q); await abrirHoja(q); const v=await leerHoja(), e=cuenta(a=>quien(a)===q);
      if(v&&['total','comp','ab','venc','trab'].every(k=>v[k]===e[k])) bien++; else r['_cont_'+q]={hoja:v,cuenta:e};
      if(v&&fila&&fila.ab===v.ab&&fila.venc===v.venc&&fila.comp===v.comp) iguales++; else r['_v146_'+q]={hoja:v,fila};
      if(q==='Daniel Espinal'){
        if(await resumenSuma()) sumas++; else r._sumaDaniel=true;
        r.movimiento=await G(()=>{ const c=[...document.querySelectorAll('#hj-hoja .hj-banda-cas .hj-cifra')].map(x=>x.textContent.trim());
          return c.length===3?'cerradas '+c[0]+' · avanzaron '+c[1]+' · tocadas '+c[2]:document.querySelector('#hj-hoja .hj-banda').innerText.replace(/\s+/g,' '); });
        { const cv=p.locator('#hj-hoja .hj-cuadro',{hasText:'Vencidas'}); const t=await tocar(cv,cv.locator('.hj-cifra')); if(t.ok) desg++; else r._desVenc=t; }
        { const t=await tocar(p.locator('#hj-hoja .hj-banda-fin .hj-n')); if(t.ok) desg++; else r._desToc=t; }
        { const t=await tocar(p.locator('#hj-hoja .hj-r-sub .hj-n').first()); if(t.ok) desg++; else r._desCausa=t; }
        chicos+=await contarChicos();
        // A la impresora, con el app en oscuro.
        await G(()=>raImprimir());
        const imp=await G(()=>window.__impresa?window.__impresa._html:'');
        if(FOTOS) writeFileSync(path.join(FOTOS,nombreVer+'-hoja-impresa.html'),imp);
        const pg=await b.newPage(); await pg.setViewportSize({width:390,height:844});
        await pg.route('**',q=>q.request().url().startsWith(ORIGEN)?q.continue():q.abort());
        await pg.goto(ORIGEN+'/index.html',{waitUntil:'domcontentloaded'}).catch(()=>{});
        await pg.setContent(imp.replace(/window\.print\(\)/g,'0'),{waitUntil:'load'}); await pg.waitForTimeout(900);
        await pg.emulateMedia({media:'print'});
        const pdf=await pg.pdf({preferCSSPageSize:true,printBackground:false});
        // Las páginas, del árbol del PDF (/Type /Pages … /Count N).
        const txt=pdf.toString('latin1');
        const cnt=[...txt.matchAll(/\/Count\s+(\d+)/g)].map(m=>+m[1]);
        const paginas=cnt.length?Math.max(...cnt):(txt.match(/\/Type\s*\/Page[^s]/g)||[]).length;
        const fondo=await pg.evaluate(()=>getComputedStyle(document.querySelector('.hj')).backgroundColor);
        if(FOTOS){ writeFileSync(path.join(FOTOS,nombreVer+'-hoja-impresa.pdf'),pdf);
          await pg.emulateMedia({media:'screen'}); await pg.setViewportSize({width:760,height:1100});
          await pg.screenshot({path:path.join(FOTOS,nombreVer+'-hoja-impresa.png'),fullPage:true}); }
        await pg.close();
        r.imprimir=[paginas===1?'1 página':paginas+' páginas', /rgb\(255, 255, 255\)/.test(fondo)?'fondo blanco':'fondo '+fondo,
          /onclick=/.test(imp)?'CON onclick':'sin botones vivos', /hj-logo[^>]*src="http[^"]*bridex-logo\.png"|src="http[^"]*bridex-logo\.png"[^>]*hj-logo/.test(imp)?'logo':'SIN logo'].join(' · ');
        if(FOTOS) await p.locator('#hj-hoja').screenshot({path:path.join(FOTOS,nombreVer+'-hoja-daniel.png')});
      }
      if(q==='Yelson Jimenez') r.sinMovimiento=await G(()=>/Sin movimiento en los últimos 7 días\./.test(document.querySelector('#hj-hoja .hj-banda').innerText)?'dice la frase':document.querySelector('#hj-hoja .hj-banda').innerText.replace(/\s+/g,' '));
      await cerrarHoja();
    }
    r.cuadraCont='cuadran '+bien+' de 3';
    r.igualV146='iguales '+iguales+' de 6';
    r.resumenSuma='suma exacto '+sumas+' de 2';
    r.desglose='exacto '+desg+' de 5';
    r.dedos=chicos;
    r.ceroEscrituras=ESC.length;
  }catch(e){ r._error=String(e&&e.message||e).split('\n')[0].slice(0,200); }
  await ctx.close(); srv.close();
  for(const k of Object.keys(HOJA_ESPERADO)) if(!(k in r)) r[k]=null;
  return r;
}

/* v149 · A Avance se llegaba por el cajón; desde la v149 está detrás de
   «Otros reportes ›». Así entra en las dos versiones. */
async function entrarAvance(p){
  await p.locator('button[onclick*="toggleDrawer"]:visible').first().click(); await p.waitForTimeout(300);
  const viejo=p.locator('.dw-btn:visible',{hasText:'Avance por ubicación'});
  if(await viejo.count()){ await viejo.click(); await p.waitForTimeout(500); return; }
  await p.locator('.dw-btn:visible',{hasText:/^Reportes/}).first().click(); await p.waitForTimeout(400);
  await p.locator('#c-hp .hp-otros').click(); await p.waitForTimeout(500);
}

// ── LAS DOS HOJAS (v149, v151): Reportes es una hoja para pegar y un PDF del contratista ──
/* El dueño: «demasiados pasos y demasiadas opciones. Necesito dos». Se entra
   por el cajón a 390, como el dedo. Desde la v151 el PDF lo hace el app con
   jsPDF y sale por la hoja de compartir: aquí `navigator.share` se dobla y se
   guarda el archivo, y se mide EL PDF de verdad —páginas, papel, textos— y el
   modelo que lo dibuja (`S._hpUltimo`). jsPDF se sirve desde la copia local
   (`npm i -g jspdf@2.5.1`, la misma versión del app): el candado corta el CDN.
   Después, como Karina por el Modo Campo. Contra la v150 falla lo del PDF:
   ella todavía abría la ventana de imprimir. */
const JSPDF=(()=>{ try{ return readFileSync(process.env.JSPDF||require.resolve('jspdf/dist/jspdf.umd.min.js')); }catch(e){ return null; } })();
const HP_ESPERADO={
  centro:{v:'3 botones · otros reportes · sin sub-barra', d:'Reportes abre con los dos botones grandes —y desde la v153 el tercero, Inspección— y el enlace chico «Otros reportes ›» (administrador); la sub-barra de doce no se ve'},
  conteoUbic:{v:'igual', d:'«Apartamento 4A» en el escogedor dice lo mismo que la cuenta directa de abiertas del 4A, sin la propuesta'},
  ordenUbic:{v:'Apartamento 2A · Apartamento 2B · Apartamento 3A', d:'las ubicaciones salen en el orden del edificio, empezando por el 2A'},
  pegarCuadra:{v:'cuadra', d:'en la hoja del 4A los bloques suman el total de la cabecera, y ese total es la cuenta directa'},
  pegarBloques:{v:'uno por contratista · ingeniería al final · 2 en blanco', d:'un bloque por contratista (de más a menos), las de ingeniería al final en «Revisiones de ingeniería», y dos renglones en blanco por bloque'},
  notas:{v:'pared: notas 60 mm · renglón 10 mm · 2 líneas · contratista: notas 34 mm', d:'(v151) la hoja para pegar deja más sitio para escribir notas; el PDF del contratista sigue igual'},
  sinMarcar:{v:'nada marcado', d:'ninguna partida dice urgente ni atrasada y no hay % general en el papel'},
  circulos:{v:'igual', d:'los circulitos rellenos son exactamente las partidas que ya tienen avance en la base'},
  contCuadra:{v:'cuadra', d:'el PDF de Dimedes: los bloques por ubicación suman el total, que es la cuenta directa, y el resumen tiene una celda por ubicación'},
  contAtras:{v:'ATRAS. en cada franja · 3 en blanco', d:'la columna ATRAS. sale en cada franja (también las «(sigue)») y cada ubicación cierra con 3 en blanco'},
  paginas:{v:'varias · (sigue) · Hoja X de Y · ninguna vacía', d:'una hoja larga se reparte en varias, la franja se repite con «(sigue)», cada una dice «Hoja X de Y» y no hay ni una en blanco'},
  imprimir:{v:'PDF carta · por compartir · sin ventanas', d:'(v151) el PDF sale hecho, en papel carta, por la hoja de compartir: no se abre ninguna ventana, así que se vuelve al app sin cerrarla'},
  campo:{v:'3 botones · sin otros · sale la hoja', d:'Karina, por el Modo Campo, tiene los dos botones (y la Inspección desde la v153), no ve «Otros reportes», y escoger saca el PDF'},
  ingSinOtros:{v:'cae en las dos hojas', d:'una ingeniera que llegue a Reportes con otra vista puesta cae en las dos hojas'},
  dedos:{v:0, d:'nada de lo que se toca en el centro y el escogedor mide menos de 40 px'},
  ceroRed:{v:0, d:'escoger y sacar las hojas: cero GET y cero escrituras'},
  qr:{v:'un QR por contratista · todos se leen · y uno del sitio', d:'(v150) la hoja del 4A lleva un QR por bloque que jsQR —el lector del app— lee como «MECCA:N4 — Apto 4A|<contratista>», y uno arriba con el sitio entero'},
  escaneo:{v:'lista · 2 pastillas · mismo número', d:'(v150) escanear el QR de Dimedes abre Actividades → Lista con la ubicación y el contratista puestos, y enseña tantas como dice su bloque'},
  sinMargen:{v:'sin enlace · sin QR en el contratista', d:'(v151) el papel no lleva el enlace del app, y el PDF del contratista no lleva QR'},
  campoEscaner:{v:'botón a la vista', d:'(v150) el Modo Campo tiene «Escanear el QR de la hoja»'},
};
async function probarDosHojas(nombreVer, html, b){
  const D=datos(); const {ACTS,PERS}=D;
  const ESC=[], LEC=[]; const r={};
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const ok=(q,body)=>q.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  // Sesenta partidas de Dimedes en el 4A con nombres LARGOS: la hoja tiene que pasar de una página y partir las líneas sin cortarlas.
  for(let i=0;i<60;i++) ACTS.push({id:'lg'+i,descripcion:'Ajustar, nivelar y fijar las puertas del gabinete de la cocina principal y del baño de visitas, con sus bisagras y tiradores número '+i,
    area:'N4 — Apto 4A',estado:i%3?'pendiente':'en-progreso',porcentaje:i%3?'0':'50',tipo_personal:'contratista',personal_nombre:'Dimedes Estebez (Niño)',
    fecha:'2026-09-01',fecha_inicio:'2026-09-01',fecha_fin:i%2?'2026-09-10':'',prioridad:i%7?'normal':'urgente'});
  ACTS.push({id:'hprop',descripcion:'Propuesta que no cuenta',area:'N4 — Apto 4A',estado:'pendiente',porcentaje:'0',tipo_personal:'contratista',personal_nombre:'Milo',propuesta:true});
  const PROP=new Set(PERS.filter(x=>x.tipo==='propio').map(x=>x.nombre));
  const quien=a=>{ const tp=a.tipo_personal||'', n=String(a.personal_nombre||'').trim();
    if(tp==='propio') return 'Personal x la casa'; if(tp==='ingeniero') return 'Ingeniería'; if(!n) return 'Sin asignar';
    const ns=n.split(',').map(x=>x.trim()).filter(Boolean); return ns.every(x=>PROP.has(x))?'Personal x la casa':n; };
  const ab=ACTS.filter(a=>a.propuesta!==true&&a.estado!=='completado');
  const ruta=async ctx=>ctx.route('**', q=>{
    const u=q.request().url(), m=q.request().method();
    if(u.startsWith(ORIGEN)) return q.continue();
    if(/jspdf[^/]*\.min\.js/.test(u) && JSPDF) return q.fulfill({status:200,contentType:'application/javascript',body:JSPDF});
    if(!/\/rest\/v1\//.test(u)) return q.abort();
    const pth=decodeURIComponent(u.split('/rest/v1/')[1]||''), base=pth.split('?')[0];
    if(m!=='GET'){ ESC.push(m+' '+base); return ok(q,[]); }
    LEC.push(base);
    let f=[];
    if(base==='obra_actividades'){ f=ACTS;
      if(/estado=neq\.completado/.test(pth)) f=f.filter(a=>a.estado!=='completado');
      if(/estado=eq\.completado/.test(pth)) f=f.filter(a=>a.estado==='completado');
      if(/propuesta=not\.is\.true/.test(pth)) f=f.filter(a=>a.propuesta!==true);
      else if(/propuesta=is\.true/.test(pth)) f=f.filter(a=>a.propuesta===true); }
    else if(base==='obra_personal') f=PERS;
    const rg=q.request().headers()['range']||''; if(rg){ const [d0,h]=rg.split('-').map(Number); f=f.slice(d0,h+1); }
    return ok(q,f);
  });
  const abrir=async usr=>{
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
    await ctx.addInitScript(()=>{ window.confirm=()=>true; window.alert=()=>{};
      // La hoja de compartir del teléfono: se guarda el archivo. Y se cuentan las ventanas que se abran.
      window.__ventanas=0; window.open=()=>{ window.__ventanas++; const w={_html:'', document:{write:t=>{w._html+=t;}, close:()=>{}}}; window.__impresa=w; return w; };
      try{ Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});
        Object.defineProperty(navigator,'share',{value:async d=>{ window.__compartido=d.files[0]; },configurable:true}); }catch(e){} });
    await ruta(ctx);
    const p=await ctx.newPage(); p.setDefaultTimeout(6000);
    const G=(f,...a)=>p.evaluate(f,...a);
    await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
    await G(u=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify(u)); }catch(e){} }, usr);
    await p.reload({waitUntil:'load'});
    for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
    await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1200);
    return {ctx,p,G};
  };
  // El PDF que se compartió: lo que dice, y el modelo con que se dibujó.
  const leerPDF=(G,nombre)=>G(async n=>{ const f=window.__compartido; if(!f) return null;
    const bytes=new Uint8Array(await f.arrayBuffer()), txt=new TextDecoder('latin1').decode(bytes);
    const textos=[...txt.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(x=>x[1].replace(/\\(.)/g,'$1'));
    let b64=''; for(let i=0;i<bytes.length;i+=8192) b64+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
    const U=S._hpUltimo||{};
    return {nombre:f.name, paginas:(txt.match(/\/Type\s*\/Page[^s]/g)||[]).length, carta:/\/MediaBox\s*\[0 0 612\.?\d* 792\.?\d*\]/.test(txt),
      textos, modelo:U.modelo, partes:U.paginas, medidas:U.medidas, b64:n?btoa(b64):''}; }, !!nombre);
  const guardar=(pdf,nombre)=>{ if(FOTOS&&pdf&&pdf.b64) writeFileSync(path.join(FOTOS,nombreVer+'-'+nombre+'.pdf'),Buffer.from(pdf.b64,'base64')); };
  try{
    let {ctx,p,G}=await abrir({id:'nilson',nombre:'Ing. Nilson',rol:'admin'});
    await p.locator('button[onclick*="toggleDrawer"]:visible').first().click(); await p.waitForTimeout(300);
    await p.locator('.dw-btn:visible',{hasText:/^Reportes/}).first().click(); await p.waitForTimeout(500);
    const l0=LEC.length, e0=ESC.length;
    r.centro=await G(()=>{ const c=document.getElementById('c-hp'); if(!c||!c.checkVisibility()) return 'no hay centro';
      const g=[...c.querySelectorAll('.hp-gran')].filter(x=>x.checkVisibility()).length, o=c.querySelector('.hp-otros');
      const sn=document.getElementById('c-rep-subnav');
      return g+' botones · '+(o&&o.checkVisibility()?'otros reportes':'sin otros')+' · '+(sn&&sn.checkVisibility()&&sn.innerText.trim()?'con sub-barra':'sin sub-barra'); });
    const chicos=()=>G(()=>[...document.querySelectorAll('#c-hp button')].filter(e=>e.checkVisibility()&&e.getBoundingClientRect().height<40).length);
    let dedos=await chicos();
    if(FOTOS) await p.screenshot({path:path.join(FOTOS,nombreVer+'-reportes-centro.png')});
    await p.locator('#c-hp .hp-gran').nth(0).click(); await p.waitForTimeout(300);
    dedos+=await chicos();
    const op=await G(()=>[...document.querySelectorAll('#c-hp .hp-op')].map(b=>[b.querySelector('span').textContent,+b.querySelector('b').textContent]));
    const n4A=ab.filter(a=>(a.area||'').trim()==='N4 — Apto 4A').length;
    const o4=op.find(x=>x[0]==='Apartamento 4A');
    r.conteoUbic=o4&&o4[1]===n4A?'igual':JSON.stringify({pantalla:o4,cuenta:n4A});
    r.ordenUbic=op.slice(0,3).map(x=>x[0]).join(' · ');
    await p.locator('#c-hp .hp-op',{hasText:/^Apartamento 4A/}).click(); await p.waitForTimeout(800);
    const v4=await leerPDF(G,true); guardar(v4,'hoja-4A');
    if(!v4||!v4.modelo) throw new Error('la hoja del 4A no salió como PDF compartido (ventanas abiertas: '+await G(()=>window.__ventanas)+')');
    const M4=v4.modelo, suma=M4.bloques.reduce((s,x)=>s+x.n,0), filas=M4.bloques.reduce((s,x)=>s+x.filas.length,0);
    r.pegarCuadra=(suma===M4.total&&filas===M4.total&&M4.total===n4A)?'cuadra':JSON.stringify({suma,filas,cab:M4.total,cuenta:n4A});
    const g4={}; ab.filter(a=>(a.area||'').trim()==='N4 — Apto 4A').forEach(a=>{ const k=quien(a); g4[k]=(g4[k]||0)+1; });
    const ordenEsp=Object.keys(g4).filter(k=>k!=='Ingeniería').sort((x,y)=>(g4[y]-g4[x])||x.localeCompare(y,'es'));
    const tit=M4.bloques.map(x=>x.titulo.replace(/ — .*$/,''));
    const okOrden=ordenEsp.every((k,i)=>tit[i]===k) && (!g4['Ingeniería'] || tit[tit.length-1]==='Revisiones de ingeniería') && tit.length===Object.keys(g4).length;
    r.pegarBloques=(okOrden?'uno por contratista':'orden '+JSON.stringify(tit)+' esperaba '+JSON.stringify(ordenEsp))
      +' · '+(g4['Ingeniería']?'ingeniería al final':'(sin ingeniería en el 4A)')+' · '+(M4.blancos===2?'2 en blanco':'blancos '+M4.blancos);
    const conAv=ab.filter(a=>(a.area||'').trim()==='N4 — Apto 4A'&&(parseFloat(a.porcentaje)||0)>0).length;
    r.circulos=M4.bloques.reduce((s,x)=>s+x.filas.filter(f=>f.av>0).length,0)===conAv?'igual':'no';
    // Los QR del modelo, dibujados con la MISMA matriz del PDF y leídos con jsQR.
    const leidos=await G(async m=>{ const lee=t=>{ const Q=_qrMatriz(t); if(!Q) return null; const n=Q.length, s=6, W=(n+8)*s, c=document.createElement('canvas'); c.width=c.height=W;
        const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,W,W); x.fillStyle='#000';
        Q.forEach((fila,yy)=>fila.forEach((on,xx)=>{ if(on) x.fillRect((xx+4)*s,(yy+4)*s,s,s); }));
        const r=typeof jsQR==='function'?jsQR(x.getImageData(0,0,W,W).data,W,W):null; return r?r.data:null; };
      return {bloques:m.bloques.map(b=>({t:b.titulo,q:b.qr?lee(b.qr):null})), cab:m.qr?lee(m.qr):null}; }, M4);
    const quienDe=t=>t==='Revisiones de ingeniería'?'Ingeniería':t.replace(/ — .*$/,'');
    const qrBien=leidos.bloques.length && leidos.bloques.every(x=>x.q==='MECCA:N4 — Apto 4A|'+quienDe(x.t));
    r.qr=(leidos.bloques.every(x=>x.q!==null)?'un QR por contratista':'faltan QR')+' · '+(qrBien?'todos se leen':'leen mal')+' · '+(leidos.cab==='MECCA:N4 — Apto 4A'?'y uno del sitio':'cabecera '+leidos.cab);
    const md4=v4.medidas||{};
    // ── PDF del contratista: Dimedes
    await G(()=>{ window.__compartido=null; });
    await p.locator('#c-hp .hp-volver').click(); await p.waitForTimeout(200);
    await p.locator('#c-hp .hp-gran').nth(1).click(); await p.waitForTimeout(300);
    dedos+=await chicos();
    await p.locator('#c-hp .hp-op',{hasText:/^Dimedes Estebez/}).click(); await p.waitForTimeout(800);
    const vd=await leerPDF(G,true); guardar(vd,'pdf-dimedes');
    if(!vd||!vd.modelo) throw new Error('el PDF de Dimedes no salió');
    const MD=vd.modelo, mdd=vd.medidas||{};
    r.notas='pared: notas '+md4.notas+' mm · renglón '+md4.alto+' mm · '+md4.lineas+' líneas · contratista: notas '+mdd.notas+' mm';
    const dims=ab.filter(a=>quien(a)==='Dimedes Estebez (Niño)'), ubis=new Set(dims.map(a=>(a.area||'').trim()||'Sin ubicación'));
    const sumd=MD.bloques.reduce((s,x)=>s+x.n,0), fild=MD.bloques.reduce((s,x)=>s+x.filas.length,0);
    r.contCuadra=(sumd===MD.total&&fild===MD.total&&MD.total===dims.length&&MD.bloques.length===ubis.size&&MD.resumen.length===ubis.size)?'cuadra':JSON.stringify({sumd,fild,cab:MD.total,cuenta:dims.length,bloques:MD.bloques.length,ubis:ubis.size});
    const franjasD=vd.partes.reduce((s,x)=>s+x.bloques.length,0), atrasD=vd.textos.filter(t=>t==='ATRAS.').length;
    r.contAtras=(MD.atras&&atrasD===franjasD?'ATRAS. en cada franja':'ATRAS. '+atrasD+' de '+franjasD)+' · '+(MD.blancos===3?'3 en blanco':'blancos '+MD.blancos);
    const marcado=m=>m.bloques.some(x=>/urgente|atrasad|vencid/i.test(x.titulo)||x.filas.some(f=>/urgente|atrasad|vencid/i.test(f.d)));
    const pct=v=>v.textos.some(t=>/\d+\s*%/.test(t));
    r.sinMarcar=(!marcado(M4)&&!marcado(MD)&&!pct(v4)&&!pct(vd))?'nada marcado':'marcado';
    const P=[v4,vd];
    r.paginas=[vd.paginas>1?'varias':'una sola', P.every(x=>x.paginas<2||x.partes.some(pp=>pp.sigue>0))?'(sigue)':'sin (sigue)',
      P.every(x=>{ for(let i=1;i<=x.paginas;i++) if(!x.textos.includes('Hoja '+i+' de '+x.paginas)) return false; return true; })?'Hoja X de Y':'faltan pies',
      P.every(x=>x.partes.length===x.paginas && x.partes.every((pp,i)=>i===0||pp.bloques.length>0))?'ninguna vacía':'hojas '+P.map(x=>x.paginas+'/'+x.partes.length)].join(' · ');
    r.imprimir=(P.every(x=>x.carta)?'PDF carta':'otro papel')+' · '+(P.every(x=>/\.pdf$/.test(x.nombre))?'por compartir':'sin archivo')+' · '+(await G(()=>window.__ventanas)?'abrió ventanas':'sin ventanas');
    r.sinMargen=(P.every(x=>!x.textos.some(t=>/http|github\.io/.test(t)))?'sin enlace':'CON enlace')+' · '+(MD.bloques.every(x=>!x.qr)&&!MD.qr?'sin QR en el contratista':'CON QR en el contratista');
    r._hojas={pegar4A:v4.paginas, dimedes:vd.paginas, bloques4A:M4.bloques.length, ubicDimedes:MD.bloques.length};
    // v150 · Escanear el QR de Dimedes en el 4A: la lista filtrada, con su número.
    const lScan=LEC.length, eScan=ESC.length;   // lo de abajo entra a Actividades, que pide lo suyo: no es de la hoja
    const bDim=M4.bloques.find(x=>/^Dimedes Estebez/.test(x.titulo));
    if(bDim&&bDim.qr){ const es=await G(q=>{ recLeido(q,function(){});
        const av=S.actFiltroAvanzado||{}, pil=(av.ubicaciones||[]).length+(av.personas||[]).length;
        const n=applyActFilters(S.acts,true).length, vis=document.getElementById('view-obra');
        return [(S.currentTab==='obra'&&S.actVista==='lista'&&vis&&vis.checkVisibility())?'lista':'pantalla '+S.currentTab+'/'+S.actVista, pil+' pastillas', n]; }, bDim.qr);
      r.escaneo=es[0]+' · '+es[1]+' · '+(es[2]===bDim.n?'mismo número':'lista '+es[2]+' contra hoja '+bDim.n); }
    else r.escaneo='sin QR de Dimedes';
    r.dedos=dedos;
    r.ceroRed=(lScan-l0)+(eScan-e0);
    await ctx.close();
    // ── Karina, por el Modo Campo
    ({ctx,p,G}=await abrir({id:'karina',nombre:'Ing. Karina Breton',rol:'ing'}));
    const cmp=await G(()=>{ const h=document.getElementById('campo-root'); if(!h) return 'sin Modo Campo';
      const g=[...h.querySelectorAll('.hp-gran')].filter(x=>x.checkVisibility()).length; return g+' botones · '+(h.querySelector('.hp-otros')?'con otros':'sin otros'); });
    r.campoEscaner=await G(()=>{ const b=[...document.querySelectorAll('#campo-root button')].find(x=>/Escanear el QR/.test(x.textContent)); return b&&b.checkVisibility()?'botón a la vista':'no está'; });
    if(FOTOS){ await p.locator('#campo-root .hp-gran').first().scrollIntoViewIfNeeded().catch(()=>{}); await p.screenshot({path:path.join(FOTOS,nombreVer+'-campo-hojas.png')}); }
    let sale='no sale';
    if(/^[23] /.test(cmp)){ await p.locator('#campo-root .hp-gran').nth(1).click(); await p.waitForTimeout(300);
      await p.locator('#campo-root .hp-op').first().click(); await p.waitForTimeout(800);
      sale=await G(()=>window.__compartido&&/^Pendientes_.*\.pdf$/.test(window.__compartido.name)?'sale la hoja':'no sale'); }
    r.campo=cmp+' · '+sale;
    r.ingSinOtros=await G(()=>{ try{ salirModoCampo(); }catch(e){} goTab('reportes'); S.reportesVista='avance'; renderReportesHub();
      const c=document.getElementById('c-hp'); return S.reportesVista==='hojas'&&c&&c.checkVisibility()&&!c.querySelector('.hp-otros')?'cae en las dos hojas':'vista '+S.reportesVista; });
    await ctx.close();
  }catch(e){ r._error=String(e&&e.message||e).split('\n')[0].slice(0,200); }
  srv.close();
  if(!JSPDF) r._error='(no hay jsPDF local: npm i -g jspdf@2.5.1, o JSPDF=<ruta>) '+(r._error||'');
  for(const k of Object.keys(HP_ESPERADO)) if(!(k in r)) r[k]=null;
  return r;
}

// ── REPETIR EN OTRO APARTAMENTO (v152) ──────────────────────────────────────
// El dueño editó «Montaje de la luminaria de la cocina principal» del 2B para
// ponerla también en el 2A y el formulario no le dejaba: al editar solo sale la
// ubicación de esa actividad. Se entra como él, se abre la del 2B por «Editar»,
// se toca «+ Ponerla también en otro apartamento» y se crea en el 2A.
const RP_ESPERADO={
  boton:{v:'a la vista · 44 px', d:'al EDITAR, debajo de la ubicación, sale «+ Ponerla también en otro apartamento» y se toca con el dedo'},
  ofrece:{v:'sin 2B · sin 3A (cerrada) · con 2A · 9', d:'el panel ofrece los apartamentos que NO la tienen: ni el 2B (abierta) ni el 3A (completada, que no está en S.acts y se pregunta a la base)'},
  lectura:{v:'1 GET de esa descripción', d:'para saber dónde está cerrada se pide solo esa descripción, no el catálogo'},
  crea:{v:'1 alta en el 2A · con su historial · sin partida nueva', d:'dejando marcado solo el 2A y tocando «Crear», se escribe UNA actividad en el 2A con su obra_cambios, y cero escrituras a obra_partidas'},
};
async function probarRepetir(nombreVer, html, b){
  const D=datos(); const {ACTS,PERS}=D;
  const ESC=[], LEC=[]; const r={};
  const DESC='Montaje de la luminaria de la cocina principal';
  ACTS.push({id:'rp2b',descripcion:DESC,area:'N2 — Apto 2B',estado:'pendiente',porcentaje:'0',tipo_personal:'contratista',
    personal_nombre:'Milo',fecha:'2026-09-01',fecha_inicio:'2026-09-30',fecha_fin:'2026-10-30',prioridad:'normal'});
  ACTS.push({id:'rp3a',descripcion:DESC,area:'N3 — Apto 3A',estado:'completado',porcentaje:'100',tipo_personal:'contratista',
    personal_nombre:'Milo',fecha:'2026-09-01',fecha_inicio:'2026-09-01',fecha_fin:'2026-09-10',prioridad:'normal'});
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const ok=(q,body)=>q.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  try{
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
    await ctx.addInitScript(()=>{ window.confirm=()=>true; window.alert=()=>{}; });
    await ctx.route('**', q=>{
      const u=q.request().url(), m=q.request().method();
      if(u.startsWith(ORIGEN)) return q.continue();
      if(!/\/rest\/v1\//.test(u)) return q.abort();
      const pth=decodeURIComponent(u.split('/rest/v1/')[1]||''), base=pth.split('?')[0];
      if(m!=='GET'){ let body=[]; try{ body=JSON.parse(q.request().postData()||'[]'); }catch(e){}
        ESC.push({m,base,body}); return ok(q,Array.isArray(body)?body:[body]); }
      LEC.push(pth);
      let f=[];
      if(base==='obra_actividades'){ f=ACTS;
        if(/estado=neq\.completado/.test(pth)) f=f.filter(a=>a.estado!=='completado');
        if(/propuesta=not\.is\.true/.test(pth)) f=f.filter(a=>a.propuesta!==true);
        const de=pth.match(/descripcion=eq\.([^&]*)/); if(de) f=f.filter(a=>a.descripcion===de[1]); }
      else if(base==='obra_personal') f=PERS;
      const rg=q.request().headers()['range']||''; if(rg){ const [d0,h]=rg.split('-').map(Number); f=f.slice(d0,h+1); }
      return ok(q,f);
    });
    const p=await ctx.newPage(); p.setDefaultTimeout(6000);
    const G=(f,...a)=>p.evaluate(f,...a);
    await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
    await G(u=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify(u)); }catch(e){} }, {id:'nilson',nombre:'Ing. Nilson',rol:'admin'});
    await p.reload({waitUntil:'load'});
    for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
    await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1200);
    await G(()=>editAct('rp2b')); await p.waitForTimeout(500);
    const bt=p.locator('button',{hasText:'Ponerla también en otro apartamento'});
    r.boton=(await bt.count()) && await bt.first().isVisible()
      ? 'a la vista · '+Math.round((await bt.first().boundingBox()).height)+' px' : 'no está';
    if(/^a la vista/.test(r.boton)){
      const l0=LEC.length, e0=ESC.length;
      await bt.first().click(); await p.waitForTimeout(800);
      const lec=LEC.slice(l0).filter(x=>/^obra_actividades/.test(x));
      r.lectura=lec.length===1&&/descripcion=eq\./.test(lec[0])?'1 GET de esa descripción':lec.length+' GET: '+lec.join(' | ').slice(0,200);
      const ops=await G(()=>S.catRepetir?S.catRepetir.faltan:null);
      r.ofrece=!ops?'no abre':[ops.includes('N2 — Apto 2B')?'con 2B':'sin 2B', ops.includes('N3 — Apto 3A')?'con 3A':'sin 3A (cerrada)',
        ops.includes('N2 — Apto 2A')?'con 2A':'sin 2A', ops.length].join(' · ');
      if(ops){
        // Se deja marcado solo el 2A, tocando los demás como el dedo.
        for(const u of ops) if(u!=='N2 — Apto 2A') await p.locator('#cat-panel button',{hasText:u}).first().click();
        await p.locator('#cat-panel button',{hasText:/^Crear las 1$/}).click(); await p.waitForTimeout(1200);
        const w=ESC.slice(e0);
        const altas=w.filter(x=>x.m==='POST'&&x.base==='obra_actividades').flatMap(x=>Array.isArray(x.body)?x.body:[x.body]);
        const cam=w.filter(x=>x.m==='POST'&&x.base==='obra_cambios').length;
        const par=w.filter(x=>/^obra_partida/.test(x.base)).length;
        r.crea=(altas.length===1&&altas[0].area==='N2 — Apto 2A'&&altas[0].descripcion===DESC?'1 alta en el 2A':altas.length+' altas '+JSON.stringify(altas.map(a=>a.area)))+
          ' · '+(cam?'con su historial':'sin historial')+' · '+(par?par+' a obra_partidas':'sin partida nueva');
      }
    }
    await ctx.close();
  }catch(e){ r._error=String(e&&e.message||e).split('\n')[0].slice(0,200); }
  srv.close();
  for(const k of Object.keys(RP_ESPERADO)) if(!(k in r)) r[k]=null;
  return r;
}

// ── INSPECCIÓN POR APARTAMENTO (v153) ───────────────────────────────────────
// Como Karina, por el Modo Campo, a 390: el 4A en Ebanistería. Un ✗ con foto y
// «Falta material» crea UNA partida pausada para Dimedes con su renglón; vuelto
// a ✔ la completa sin duplicar; el avance de 7 ✔ y 1 ✗ es 87,5 % y se toca; sin
// señal la marca y la foto esperan en el teléfono y salen al volver; la foto sale
// en la Bitácora con el apartamento y el elemento; y la hoja de papel.
const IN_ESPERADO={
  boton:{v:'a la vista en el Modo Campo', d:'el Modo Campo de Karina tiene el botón «Inspección» junto a las dos hojas'},
  aptos:{v:11, d:'el primer toque ofrece los once apartamentos, en el orden del edificio'},
  ebanisteria4A:{v:'puertas 14 · closets 4 · gabinetes 6', d:'el 4A en Ebanistería trae sus 14 puertas de madera, 4 closets y 6 gabinetes'},
  repetidos:{v:'Habitación principal (2) · Habitación secundaria · sin nombres iguales', d:'el nombre repetido sale con «(2)» y ninguna fila se llama igual que otra'},
  avisoFase:{v:'avisa «Falta validar la instalación» · deja marcar', d:'(v156) ✔ a un punto de «Probado» con la instalación sin revisar: sale el aviso amarillo y la marca se pone igual'},
  fasesVisibles:{v:'IIICPTTT', d:'(v156) la puerta de madera enseña la fase de cada punto, agrupada en orden: I · C · P · T'},
  opciones:{v:'No está puesto · Incompleto · Mal hecho, hay que corregir · Dañado · «¿Qué tiene?»', d:'(v158) el ✗ ofrece las cuatro opciones nuevas, con el título «¿Qué tiene?», y ninguna de las cinco viejas'},
  noAplica:{v:'«No aplica» · la línea gris', d:'(v158) el tercer botón dice «No aplica» y arriba de los puntos sale la línea que explica las tres marcas'},
  sinCausa:{v:'no guarda · apagado · lo dice', d:'(v158) un ✗ sin opción ni nota no se guarda: el botón se ve apagado y dice en rojo «Escoja qué tiene o escriba una nota»'},
  sinFoto:{v:'guarda sin foto · 87,5% · dice «sin foto»', d:'(v157) un ✗ con opción y SIN foto se guarda, cuenta para el avance y el renglón dice «sin foto»'},
  soloNota:{v:'guarda con solo la nota · «Guardado» · Rayada abajo', d:'(v158) un ✗ con SOLO la nota, sin opción, se guarda y sale el aviso verde «Guardado»'},
  borrador:{v:'la nota sigue · lo dice en el punto · no escribió', d:'(v158) escribir la nota, cerrar sin guardar y volver: la nota sigue ahí, el punto avisa que hay un ✗ sin guardar, y no se mandó nada a la base'},
  crea:{v:'0 escrituras a actividades · foto en la Bitácora · causa incompleto', d:'(v156) el ✗ con foto e «Incompleto» NO crea partida: la causa queda en el punto y la foto entra a la Bitácora como nota'},
  fila:{v:'1 fila · 8 puntos · ✗ con su foto', d:'la inspección se guarda en obra_inspecciones: un renglón del elemento, con los 8 puntos y la foto en el ✗'},
  avance:{v:'87,5%', d:'7 ✔ y 1 ✗ en una puerta dan 87,5 % de avance comprobable'},
  desglose:{v:'con problemas 1 · completos 0', d:'al tocar el avance sale el desglose: la puerta con su ✗ y lo que falta'},
  vuelveBien:{v:'queda ✔ · sin tocar actividades · la foto se queda', d:'(v156) volver ese punto a ✔ cambia la marca y nada más'},
  sinRed:{v:'espera en el teléfono · sale al volver · 0 actividades', d:'sin señal, un ✗ con foto se queda en el teléfono (la barra lo dice) y al volver la red sale su foto a la Bitácora; ninguna partida'},
  quitarMal:{v:'se quita · respaldo antes · el ✗ sigue con su causa · sin foto', d:'(v157) la foto de un ✗ se quita como las otras: confirma en pantalla, respaldo y después borra la nota; el ✗ se queda con su causa'},
  desmarcaOk:{v:'sin marcar · 81,3% → 80%', d:'(v155) tocar otra vez el ✔ deja el punto sin marcar, y el avance baja en el momento (v157: 13 ✔ y 3 ✗ → 12 ✔ y 3 ✗, por el ✗ de más que prueba quitar su foto)'},
  fotoOk:{v:'sube · en la Bitácora con su pie', d:'(v155) «＋ Foto» en un ✔ sube la foto y sale en la Bitácora del día con el apartamento, el elemento y el punto'},
  quitarFoto:{v:'respaldo y después se borra', d:'(v155) quitar esa foto pide confirmar en la pantalla, escribe el «RESPALDO antes de borrar» y después borra la nota de la Bitácora'},
  desmarcaMal:{v:'sin marcar · la foto se queda · 0 actividades', d:'(v156) desmarcar un ✗ lo deja sin marcar, con su foto, sin tocar actividades'},
  resetEl:{v:'pide confirmar en pantalla · 8 sin marcar · respaldo antes · nada en actividades', d:'(v155) «Empezar de nuevo este elemento» pregunta en la pantalla (Cancelar no borra), deja los 8 puntos sin marcar y guarda el respaldo ANTES de la fila'},
  bitacoraFoto:{v:'Apartamento 4A · Entrada principal — 4. Cerradura · problema: Incompleto', d:'(v156) la foto del ✗ sale en la Bitácora con el apartamento, el elemento, el punto y la causa'},
  papel:{v:'PDF carta · 24 filas · por compartir', d:'«Imprimir hoja de inspección» saca el PDF del 4A en Ebanistería, una fila por elemento, por la hoja de compartir'},
  dibujo:{v:'3 dibujos · 8 números cada uno · nada encimado', d:'(v154) la hoja de Ebanistería trae el dibujo de puertas, closets y gabinetes con sus 8 números dentro y la explicación al lado, sin pisarse'},
  resetInsp:{v:'todo sin marcar · 3 respaldos antes · agregado y nombre siguen · nada en actividades', d:'(v155) «Empezar de nuevo esta inspección» deja todo sin marcar con un respaldo por elemento y conserva lo agregado a mano y el nombre corregido'},
  guardar:{v:'guardada · en curso · vuelve al elemento que falta', d:'(v156) «Guardar y seguir después» deja la inspección en curso, y al volver a entrar lleva al primer elemento que falta'},
  cerrar:{v:'resumen 0 ✔ · 0 ✗ · 25 faltan · cerrada por Karina · no deja marcar · reabierta por Karina', d:'(v156) «Cerrar inspección» enseña el resumen, la cierra con nombre y fecha, cerrada no deja marcar, y al reabrir queda anotado quién'},
  plomeria4A:{v:'4 inodoro · 4 lavamanos · 3 ducha · 3 fregadero · 1 calentador', d:'(v156) en el 4A salen los elementos de plomería según sus 4 baños (el 1/2 baño sin ducha), 3 fregaderos y lavadero, y el calentador'},
  inodoroListo:{v:'inodoro · listo · la lista lo dice', d:'(v156) un inodoro con sus 8 puntos en ✔ queda «listo»'},
  pintura4A:{v:'Muros 14 · Techo 14 · 14 espacios con muros y techo juntos · Techo con 8 puntos · Corte con la pared', d:'(v157, v159) Pintura del 4A: Muros y Techo por espacio, los dos en la MISMA pantalla, y el Techo con sus 8 puntos'},
  porBano:{v:'8 pantallas · la lista igual · Inodoro · Lavamanos · Ducha · 24 puntos · 3 con ducha · 1 sin ducha', d:'(v159) la plomería del 4A se recorre por baño: una pantalla con inodoro, lavamanos y ducha (el 1/2 baño sin ducha), más los fregaderos y el calentador'},
  salir:{v:'pregunta al salir · seguir aquí se queda · otra pestaña también pregunta · descartar quita · guardar guarda', d:'(v159) un ✔ queda pendiente hasta «Guardar»: Volver y otra pestaña preguntan Guardar · Descartar · Seguir aquí, y cada una hace lo que dice'},
  historial:{v:'un renglón por guardado · Llenó con su punto · quién en el punto · se ve en la pantalla · y en el historial', d:'(v159) cada guardado deja un renglón «guardada» con quién y qué punto cambió; el punto guarda quién lo llenó y la pantalla lo dice'},
  noPisa:{v:'la marca sigue al volver a entrar · sale al volver la red', d:'(v159) lo guardado que no pudo subir no se pierde al volver a entrar al apartamento (hasta la v158 la copia de la base lo pisaba)'},
  levKarina:{v:'no lo ve', d:'(v156) el Levantamiento es solo del administrador: la Ing. Karina no ve el botón'},
  sinActividades:{v:0, d:'(v156) en toda la prueba de la inspección, cero escrituras a obra_actividades'},
  levSinFoto:{v:'«sin foto» a la vista', d:'(v157) en el Levantamiento, un ✗ sin foto lleva la etiqueta «sin foto»'},
  levantamiento:{v:'11 × 14 · 4A Ebanistería e-en_curso 100% · aprueba el elemento', d:'(v156) el Ing. Nilson ve la tabla de apartamentos × oficios, toca la celda y aprueba un elemento: se guarda con su nombre'},
  dedos:{v:0, d:'nada de lo que se toca en la inspección mide menos de 40 px, y la página no se desliza de lado a 390'},
  realBase:{v:0, d:'ninguna escritura se escapa del doble: lo escrito a Supabase lo contesta la prueba y lo demás se corta'},
};
async function probarInspeccion(nombreVer, html, b){
  const D=datos(); const {ACTS,PERS}=D;
  const ESC=[], FILAS={}, CAMB=[], NOTAS={}, ESTS={}, r={}; let drive=0, fuera=0;
  const srv=await servir(html); const ORIGEN='http://127.0.0.1:'+srv.address().port;
  const ok=(q,body)=>q.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQKADxbD/FlyXmBAAAAAElFTkSuQmCC','base64');
  try{
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
    await ctx.addInitScript(()=>{ window.__dialogos=0; window.confirm=()=>{ window.__dialogos++; return true; }; window.alert=()=>{ window.__dialogos++; };
      try{ localStorage.setItem('mecca_drive_url','https://script.google.com/macros/s/PRUEBA/exec'); }catch(e){}
      window.__compartido=null;
      try{ Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});
        Object.defineProperty(navigator,'share',{value:async d=>{ window.__compartido=d.files[0]; },configurable:true}); }catch(e){} });
    let sinRed=false, cortaInsp=false;
    await ctx.route('**', q=>{
      const u=q.request().url(), m=q.request().method();
      if(u.startsWith(ORIGEN)) return q.continue();
      if(sinRed) return q.abort('internetdisconnected');
      if(/jspdf[^/]*\.min\.js/.test(u) && JSPDF) return q.fulfill({status:200,contentType:'application/javascript',body:JSPDF});
      if(/script\.google\.com/.test(u)){ drive++; return q.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,url:'https://drive.google.com/thumbnail?id=F'+drive})}); }
      if(!/\/rest\/v1\//.test(u)){ if(m!=='GET') fuera++; return q.abort(); }
      const pth=decodeURIComponent(u.split('/rest/v1/')[1]||''), base=pth.split('?')[0];
      if(cortaInsp && base==='obra_inspecciones' && m!=='GET') return q.abort('internetdisconnected');
      if(m!=='GET'){
        let body=null; try{ body=JSON.parse(q.request().postData()||'null'); }catch(e){}
        ESC.push({m,base,pth,body});
        if(base==='obra_inspecciones' && m==='POST'){ FILAS[body.id]=Object.assign(FILAS[body.id]||{}, JSON.parse(JSON.stringify(body))); }
        if(base==='obra_inspecciones' && m==='PATCH'){ const id=(pth.match(/id=eq\.([^&]+)/)||[])[1]; if(FILAS[id]) Object.assign(FILAS[id],body); }
        if(base==='obra_insp_estado' && m==='POST'){ ESTS[body.id]=Object.assign(ESTS[body.id]||{estado:'en_curso'}, body); }
        if(base==='obra_actividades' && m==='POST'){ ACTS.push(body); }
        if(base==='obra_actividades' && m==='PATCH'){ const id=(pth.match(/id=eq\.([^&]+)/)||[])[1]; const a=ACTS.find(x=>x.id===id); if(a) Object.assign(a,body); }
        if(base==='obra_cambios' && m==='POST'){ CAMB.push(body); }
        if(base==='obra_bitacora' && m==='POST'){ NOTAS[body.id]=body; }
        if(base==='obra_bitacora' && m==='DELETE'){ const id=(pth.match(/id=eq\.([^&]+)/)||[])[1]; delete NOTAS[id]; }
        return ok(q,[]);
      }
      let f=[];
      if(base==='obra_actividades'){ f=ACTS;
        if(/estado=neq\.completado/.test(pth)) f=f.filter(a=>a.estado!=='completado');
        if(/propuesta=not\.is\.true/.test(pth)) f=f.filter(a=>a.propuesta!==true);
        const ids=pth.match(/id=in\.\(([^)]*)\)/); if(ids){ const S=new Set(ids[1].split(',')); f=f.filter(a=>S.has(a.id)); } }
      else if(base==='obra_personal') f=PERS;
      else if(base==='obra_inspecciones'){ const ap=(pth.match(/apto=eq\.([^&]+)/)||[])[1]; f=Object.values(FILAS).filter(x=>!ap||x.apto===ap); }
      else if(base==='obra_cambios') f=CAMB.slice().reverse();
      else if(base==='obra_bitacora') f=Object.values(NOTAS);
      else if(base==='obra_insp_estado'){ const ap=(pth.match(/apto=eq\.([^&]+)/)||[])[1]; f=Object.values(ESTS).filter(x=>!ap||x.apto===ap); }
      const rg=q.request().headers()['range']||''; if(rg){ const [d0,h]=rg.split('-').map(Number); f=f.slice(d0,h+1); }
      return ok(q,f);
    });
    const p=await ctx.newPage(); p.setDefaultTimeout(6000);
    const G=(f,...a)=>p.evaluate(f,...a);
    await p.goto(ORIGEN+'/index.html',{waitUntil:'load'});
    await G(u=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify(u)); }catch(e){} }, {id:'karina',nombre:'Ing. Karina Breton',rol:'ing'});
    await p.reload({waitUntil:'load'});
    for(let t=0;t<40;t++){ if(await G(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await p.waitForTimeout(500); }
    await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1000);
    const boton=p.locator('#campo-root .hp-gran',{hasText:'Inspección'});
    r.boton=(await boton.count()) && await boton.first().isVisible() ? 'a la vista en el Modo Campo' : 'no está';
    if(!/^a la vista/.test(r.boton)) throw new Error('sin botón de Inspección');
    await boton.first().click(); await p.waitForTimeout(300);
    r.aptos=await G(()=>document.querySelectorAll('#campo-root .hp-op').length);
    await p.locator('#campo-root .hp-op',{hasText:/^Apartamento 4A/}).click(); await p.waitForTimeout(900);
    await p.locator('#campo-root .in-of',{hasText:'Ebanistería'}).click(); await p.waitForTimeout(300);
    const lista=await G(()=>{ const out={}, nombres=[]; let g='';
      document.querySelectorAll('#campo-root .cp-lbl, #campo-root .in-el').forEach(e=>{
        if(e.classList.contains('cp-lbl')) g=e.textContent.trim(); else { out[g]=(out[g]||0)+1; nombres.push(e.querySelector('span').textContent.trim()); } });
      return {out, nombres}; });
    r.ebanisteria4A='puertas '+(lista.out['Puertas de madera']||0)+' · closets '+(lista.out['Closets']||0)+' · gabinetes '+(lista.out['Gabinetes de cocina y baño']||0);
    const n=lista.nombres;
    r.repetidos=[n.includes('Habitación principal (2)')?'Habitación principal (2)':'sin (2)', n.includes('Habitación secundaria')?'Habitación secundaria':'sin secundaria',
      new Set(n).size===n.length?'sin nombres iguales':'con nombres iguales'].join(' · ');
    // ── v156 · un levantamiento: nada de la inspección escribe en obra_actividades ──
    const esActs=()=>ESC.filter(x=>x.base==='obra_actividades').length;
    const esperar=async(f,n=24)=>{ for(let t=0;t<n;t++){ await p.waitForTimeout(250); if(await f()) return true; } return false; };
    const filaDe=id=>FILAS[id]||{puntos:[]};
    // v159 · lo marcado queda pendiente: antes de volver se guarda, como lo haría el ingeniero
    const volver=async()=>{ const bG=p.locator('#campo-root .in-guardar-pant'); if(await bG.count()){ await bG.first().click(); await p.waitForTimeout(250); } await p.locator('#campo-root .hp-volver').click(); };
    const acts0=esActs();
    // La primera puerta: «Entrada principal». Puntos por fase: 1 Jamba · 2 Hoja · 3 Tope (I) · 4 Cerradura (C) · 5 Abre y cierra (P) · 6-8 (T).
    await p.locator('#campo-root .in-el').first().click(); await p.waitForTimeout(300);
    const tresDe=i=>p.locator('#campo-root .in-pt').nth(i).locator('.in-b');
    const el1=await G(()=>_inspElActual().rowId);
    // El ✔ de «Abre y cierra» (Probado) sin la instalación: avisa y deja marcar.
    await tresDe(4).nth(0).click(); await p.waitForTimeout(150);
    const av=await G(()=>{ const a=document.querySelector('#campo-root .in-aviso-fase'); return a&&a.checkVisibility()?a.textContent:''; });
    const marcado=await G(()=>(_inspPuntos(_inspElActual().rowId)[4]||{}).m);
    r.avisoFase=(/Falta validar la instalación/.test(av)?'avisa «Falta validar la instalación»':'aviso: '+JSON.stringify(av))+' · '+(marcado==='ok'?'deja marcar':'no marcó');
    r.fasesVisibles=await G(()=>[...document.querySelectorAll('#campo-root .in-fase')].map(x=>x.textContent.trim()[0]).join(''));
    for(const i of [0,1,2,5,6,7]) { await tresDe(i).nth(0).click(); await p.waitForTimeout(60); }
    await tresDe(3).nth(1).click(); await p.waitForTimeout(150);
    r.opciones=await G(()=>{ const bs=[...document.querySelectorAll('#campo-root .in-causas .in-b2')].map(x=>x.textContent.trim());
      const t=[...document.querySelectorAll('#campo-root .in-mal .in-paso')].some(x=>x.textContent.trim()==='¿Qué tiene?');
      const viejas=['Falta material','Espera otro taller','Espera decisión de Gerencia','El contratista no vino','Arreglo'].filter(v=>bs.includes(v));
      return bs.join(' · ')+(t?' · «¿Qué tiene?»':' · sin título')+(viejas.length?' · VIEJAS: '+viejas.join(','):''); });
    r.noAplica=await G(()=>{ const b=document.querySelectorAll('#campo-root .in-pt')[0].querySelectorAll('.in-b')[2];
      const ay=[...document.querySelectorAll('#campo-root .in-ayuda')].some(x=>x.checkVisibility()&&/No aplica = ese punto no existe en este elemento/.test(x.textContent));
      return (/No aplica/.test(b.textContent)?'«No aplica»':'dice '+JSON.stringify(b.textContent))+' · '+(ay?'la línea gris':'sin la línea'); });
    const e0=ESC.length;
    await p.locator('#campo-root .in-b2',{hasText:'Guardar el problema'}).click(); await p.waitForTimeout(400);
    const dice0=await G(()=>{ const f=document.querySelector('#campo-root .in-falta'); return f&&f.checkVisibility()?f.textContent.trim():''; });
    const apag0=await G(()=>document.getElementById('in-mal-g').classList.contains('apagado'));
    r.sinCausa=(ESC.slice(e0).some(x=>x.base==='obra_inspecciones'&&x.body&&x.body.puntos&&x.body.puntos[3]&&x.body.puntos[3].m==='mal')||(await G(()=>(_inspPuntos(_inspElActual().rowId)[3]||{}).m))==='mal'?'guardó sin nada':'no guarda')+
      ' · '+(apag0?'apagado':'encendido')+' · '+(dice0==='Escoja qué tiene o escriba una nota'?'lo dice':'dice: '+JSON.stringify(dice0));
    await p.locator('#campo-root .in-b2',{hasText:'Incompleto'}).click();
    await p.locator('#campo-root .in-b2',{hasText:'Guardar el problema'}).click();
    const guardo=await esperar(()=>{ const pt=filaDe(el1).puntos[3]; return pt&&pt.m==='mal'&&pt.c==='incompleto'&&!pt.f&&!pt.fp; });
    const pctSF=await G(()=>_inspPctTxt(_inspCuenta(S._insp.area,S._insp.of).pct));
    const tagSF=await G(()=>/sin foto/.test((document.querySelectorAll('#campo-root .in-pt')[3].querySelector('.in-prob')||{}).textContent||''));
    r.sinFoto=[guardo?'guarda sin foto':'no guardó', pctSF, tagSF?'dice «sin foto»':'no dice «sin foto»'].join(' · ');
    // Y después se le pone la foto, con «Cambiar el problema»
    await p.locator('#campo-root .in-pt').nth(3).locator('.in-cambiar').click(); await p.waitForTimeout(150);
    const [fc]=await Promise.all([p.waitForEvent('filechooser'), p.locator('#campo-root .in-b2',{hasText:'Tomar foto'}).click()]);
    await fc.setFiles({name:'f.png',mimeType:'image/png',buffer:PNG}); await p.waitForTimeout(400);
    await p.locator('#campo-root .in-b2',{hasText:'Guardar el problema'}).click();
    await esperar(()=>{ const pt=filaDe(el1).puntos[3]; return pt&&pt.m==='mal'&&pt.f&&!pt.fp; });
    const pt3=filaDe(el1).puntos[3]||{}, nota3=Object.values(NOTAS).find(n=>/Entrada principal — 4\. Cerradura/.test(n.nota||''));
    r.crea=[esActs()-acts0+' escrituras a actividades', nota3&&/drive\.google\.com/.test(nota3.fotos||'')&&/Incompleto/.test(nota3.nota)?'foto en la Bitácora':'sin nota en la Bitácora',
      pt3.c==='incompleto'?'causa incompleto':'causa '+pt3.c].join(' · ');
    const fila=filaDe(el1);
    r.fila=Object.keys(FILAS).length+' fila · '+fila.puntos.filter(x=>x&&x.m).length+' puntos · '+(/drive\.google\.com/.test(pt3.f||'')?'✗ con su foto':'✗ sin foto');
    // Avance y desglose
    await volver(); await p.waitForTimeout(250);
    r.avance=await G(()=>{ const b=document.querySelector('#campo-root .in-avance b'); return b?b.textContent.trim():''; });
    await p.locator('#campo-root .in-avance').click(); await p.waitForTimeout(200);
    r.desglose=await G(()=>{ const t=[...document.querySelectorAll('#campo-root .in-dg-t')].map(x=>x.textContent);
      const n=s=>{ const x=t.find(y=>y.startsWith(s)); return x?(x.match(/\((\d+)\)/)||[])[1]:'?'; };
      return 'con problemas '+n('Con problemas')+' · completos '+n('Completos'); });
    // ✗ → ✔: la marca cambia y nada más
    await p.locator('#campo-root .in-el').first().click(); await p.waitForTimeout(250);
    const a1=esActs(); await tresDe(3).nth(0).click(); await p.waitForTimeout(600);
    r.vuelveBien=[(await G(()=>(_inspPuntos(_inspElActual().rowId)[3]||{}).m))==='ok'?'queda ✔':'no quedó ✔', esActs()===a1?'sin tocar actividades':'tocó actividades',
      (await G(()=>!!(_inspPuntos(_inspElActual().rowId)[3]||{}).f))?'la foto se queda':'se perdió la foto'].join(' · ');
    // Sin señal: el 6 (Barniz) en ✗ con foto
    sinRed=true; await ctx.setOffline(true);
    await tresDe(5).nth(1).click(); await p.waitForTimeout(150);
    const [fc2]=await Promise.all([p.waitForEvent('filechooser'), p.locator('#campo-root .in-b2',{hasText:'De la galería'}).click()]);
    await fc2.setFiles({name:'g.png',mimeType:'image/png',buffer:PNG}); await p.waitForTimeout(400);
    await p.locator('#campo-root .in-b2',{hasText:'Dañado'}).click();
    await p.locator('#campo-root .in-b2',{hasText:'Guardar el problema'}).click(); await p.waitForTimeout(1200);
    const espera=await G(()=>{ const b=document.getElementById('insp-barra'); return b&&/sin subir/.test(b.textContent)?1:0; });
    const notas0=Object.keys(NOTAS).length;
    sinRed=false; await ctx.setOffline(false);
    await G(()=>window.dispatchEvent(new Event('online')));
    for(let t=0;t<20;t++){ await p.waitForTimeout(250); if(!(await G(()=>Object.keys(_inspSucios()).length))) break; }
    const nota6=Object.values(NOTAS).find(n=>/Entrada principal — 6\. Barniz/.test(n.nota||''));
    r.sinRed=[espera?'espera en el teléfono':'no esperó', nota6&&Object.keys(NOTAS).length===notas0+1?'sale al volver':'no salió', esActs()-acts0+' actividades'].join(' · ');
    // ── v155 · desmarcar, foto en cualquier punto, empezar de nuevo (sin partidas) ──
    await volver(); await p.waitForTimeout(250);
    await p.locator('#campo-root .in-el').nth(1).click(); await p.waitForTimeout(250);
    const el2=await G(()=>({id:_inspElActual().rowId, nom:_inspElActual().nombre}));
    for(const i of [0,1,2,3,4,5,6]) { await tresDe(i).nth(0).click(); await p.waitForTimeout(60); }
    const conFoto=async(i,boton)=>{ await tresDe(i).nth(1).click(); await p.waitForTimeout(150);
      const [fx]=await Promise.all([p.waitForEvent('filechooser'), p.locator('#campo-root .in-b2',{hasText:boton||'Tomar foto'}).click()]);
      await fx.setFiles({name:'h.png',mimeType:'image/png',buffer:PNG}); await p.waitForTimeout(400);
      await p.locator('#campo-root .in-b2',{hasText:'Dañado'}).click();
      await p.locator('#campo-root .in-b2',{hasText:'Guardar el problema'}).click(); };
    await conFoto(7);
    await esperar(()=>{ const pt=filaDe(el2.id).puntos[7]; return pt&&pt.f&&!pt.fp; });
    // a) v157 · la foto de un ✗ se quita como las otras (en el punto 7, índice 6)
    await conFoto(6);
    await esperar(()=>{ const pt=filaDe(el2.id).puntos[6]; return pt&&pt.f&&pt.fb&&!pt.fp&&NOTAS[pt.fb]; });
    const e2=ESC.length, nb6=(filaDe(el2.id).puntos[6]||{}).fb;
    const mini6=p.locator('#campo-root .in-pt').nth(6).locator('.in-mini');
    if(await mini6.count()){ await mini6.first().click(); await p.waitForTimeout(200);
      await p.locator('#campo-root .in-ver .in-b2',{hasText:'Quitar foto'}).click(); await p.waitForTimeout(150);
      await p.locator('#campo-root .in-ver .in-b2',{hasText:'Sí, quitar la foto'}).click();
      await esperar(()=>!NOTAS[nb6]);
      const sl2=ESC.slice(e2), iR2=sl2.findIndex(x=>x.base==='obra_cambios'&&/^RESPALDO antes de borrar/.test(x.body&&x.body.detalle||'')), iD2=sl2.findIndex(x=>x.base==='obra_bitacora'&&x.m==='DELETE');
      const p6=filaDe(el2.id).puntos[6]||{};
      const tag6=await G(()=>/sin foto/.test((document.querySelectorAll('#campo-root .in-pt')[6].querySelector('.in-prob')||{}).textContent||''));
      r.quitarMal=[!NOTAS[nb6]&&!p6.f?'se quita':'no se quitó', iR2>=0&&iD2>iR2?'respaldo antes':'respaldo '+iR2+' · borrado '+iD2,
        p6.m==='mal'&&p6.c==='danado'?'el ✗ sigue con su causa':'quedó '+p6.m+' '+p6.c, tag6?'sin foto':'no dice «sin foto»'].join(' · ');
    }else r.quitarMal='sin miniatura';
    // b) ✔ otra vez lo quita y el avance baja
    const pct=()=>G(()=>_inspPctTxt(_inspCuenta(S._insp.area,S._insp.of).pct));
    const a0=await pct(); await tresDe(0).nth(0).click(); await p.waitForTimeout(250);
    const sin=await G(()=>!(_inspPuntos(_inspElActual().rowId)[0]||{}).m);
    r.desmarcaOk=(sin?'sin marcar':'sigue marcado')+' · '+a0+' → '+(await pct());
    // c) ＋ Foto en un ✔
    const notasAntes=Object.keys(NOTAS).length;
    const [fy]=await Promise.all([p.waitForEvent('filechooser'), p.locator('#campo-root .in-pt').nth(1).locator('.in-masfoto').click()]);
    await fy.setFiles({name:'k.png',mimeType:'image/png',buffer:PNG});
    const subio=await esperar(()=>Object.keys(NOTAS).length>notasAntes);
    const notaX=Object.values(NOTAS).find(n=>/— 2\. /.test(n.nota||'')&&n.nota.includes(el2.nom))||{};
    const pie=await G(async()=>{ S.bitacora=S.bitacora||{}; S.bitacora.dias=14; await loadBitacora();
      return [...document.querySelectorAll('#c-bitacora .bit-insp div')].map(x=>x.textContent); });
    const bueno=pie.find(t=>t.includes('Apartamento 4A')&&t.includes(el2.nom)&&/— 2\. /.test(t));
    r.fotoOk=(subio&&/drive\.google\.com/.test(notaX.fotos||'')?'sube':'no subió')+' · '+(bueno?'en la Bitácora con su pie':'pie: '+JSON.stringify(pie));
    // d) quitar esa foto: confirmar en pantalla, respaldo, borrar
    const e3=ESC.length, idX=notaX.id;
    await p.locator('#campo-root .in-pt').nth(1).locator('.in-mini').first().click(); await p.waitForTimeout(150);
    await p.locator('#campo-root .in-ver .in-b2',{hasText:'Quitar foto'}).click(); await p.waitForTimeout(150);
    const preg=await p.locator('#campo-root .in-ver .in-b2',{hasText:'Sí, quitar la foto'}).count();
    await p.locator('#campo-root .in-ver .in-b2',{hasText:'Sí, quitar la foto'}).click();
    await esperar(()=>!NOTAS[idX]);
    const sl=ESC.slice(e3), iR=sl.findIndex(x=>x.base==='obra_cambios'&&/^RESPALDO antes de borrar/.test(x.body&&x.body.detalle||'')), iD=sl.findIndex(x=>x.base==='obra_bitacora'&&x.m==='DELETE');
    r.quitarFoto=preg&&iR>=0&&iD>iR&&!NOTAS[idX]?'respaldo y después se borra':'respaldo '+iR+' · borrado '+iD+' · pregunta '+preg;
    // e) desmarcar el ✗: queda sin marcar, con su foto, y nada en actividades
    const a4=esActs(); await tresDe(7).nth(1).click(); await p.waitForTimeout(600);
    const p7=await G(()=>_inspPuntos(_inspElActual().rowId)[7]||{});
    r.desmarcaMal=[!p7.m?'sin marcar':'sigue '+p7.m, p7.f?'la foto se queda':'se perdió la foto', (esActs()-a4)+' actividades'].join(' · ');
    // f) empezar de nuevo el primer elemento
    await volver(); await p.waitForTimeout(250);
    await p.locator('#campo-root .in-el').first().click(); await p.waitForTimeout(250);
    const d0=await G(()=>window.__dialogos), e5=ESC.length, a5=esActs();
    if(await p.locator('#campo-root .in-reset').count()){
      await p.locator('#campo-root .in-reset').click(); await p.waitForTimeout(150);
      const hayCaja=await p.locator('#campo-root .in-conf .in-b2',{hasText:'Sí, borrar las marcas'}).count();
      await p.locator('#campo-root .in-conf .in-b2',{hasText:'Cancelar'}).click(); await p.waitForTimeout(150);
      const siguen=await G(()=>_inspPuntos(_inspElActual().rowId).filter(x=>x&&x.m).length);
      await p.locator('#campo-root .in-reset').click(); await p.waitForTimeout(150);
      await p.locator('#campo-root .in-conf .in-b2',{hasText:'Sí, borrar las marcas'}).click();
      await esperar(()=>filaDe(el1).puntos.every(x=>!x||!x.m));
      const sl5=ESC.slice(e5), iR5=sl5.findIndex(x=>x.base==='obra_cambios'&&/^RESPALDO antes de borrar/.test(x.body&&x.body.detalle||'')&&x.body.entidad_id===el1),
        iF5=sl5.findIndex(x=>x.base==='obra_inspecciones'&&x.body.id===el1&&x.body.puntos.every(y=>!y||!y.m));
      r.resetEl=[hayCaja&&siguen>0&&d0===await G(()=>window.__dialogos)?'pide confirmar en pantalla':'confirmar: caja '+hayCaja+' · siguen '+siguen,
        filaDe(el1).puntos.filter(x=>x&&x.m).length===0?'8 sin marcar':'quedan marcas',
        iR5>=0&&iF5>iR5?'respaldo antes':'respaldo '+iR5+' · fila '+iF5,
        esActs()===a5?'nada en actividades':'tocó actividades'].join(' · ');
    }else r.resetEl='sin botón';
    // Bitácora: el pie de la foto del ✗ (ahora una nota «Foto de inspección»)
    r.bitacoraFoto=await G(async()=>{ S.bitacora=S.bitacora||{}; S.bitacora.dias=14; await loadBitacora();
      const c=[...document.querySelectorAll('#c-bitacora .bit-insp div')].map(x=>x.textContent);
      return c.find(t=>/Cerradura/.test(t))||c[0]||'sin pie'; });
    // La hoja de papel
    await volver(); await p.waitForTimeout(250);
    if(JSPDF){
      await p.locator('#campo-root .in-imp').click(); await p.waitForTimeout(1200);
      r.papel=await G(async()=>{ const f=window.__compartido; if(!f) return 'no salió';
        const t=new TextDecoder('latin1').decode(new Uint8Array(await f.arrayBuffer()));
        return (/\/MediaBox\s*\[0 0 612\.?\d* 792/.test(t)?'PDF carta':'otro papel')+' · '+((S._inspUltimo||{}).filas)+' filas · por compartir'; });
      r.dibujo=await G(()=>{ const bs=(S._inspUltimo||{}).bloques; if(!bs) return 'sin dibujos';
        const bien=bs.filter(b=>{ const [x,y,w,h]=b.caja, [lx,ly,lw,lh]=b.leyenda;
          return b.marcas.length===8 && b.marcas.every(([mx,my])=>mx>=x&&mx<=x+w&&my>=y&&my<=y+h) && lx>=x+w && lh<=h+0.5; });
        return bs.length+' dibujos · '+(bien.length===bs.length?'8 números cada uno · nada encimado':(bs.length-bien.length)+' mal'); });
    }else r.papel='(sin jsPDF local)';
    try{
    // g) empezar de nuevo la inspección entera: lo agregado y el nombre se quedan
    if(await G(()=>S._insp&&S._insp.paso==='elem')){ await volver(); await p.waitForTimeout(250); }
    if(await p.locator('#campo-root .in-reset',{hasText:'esta inspección'}).count()){
      await p.locator('#campo-root .in-agr',{hasText:'Agregar elemento que falta'}).click(); await p.waitForTimeout(150);
      await p.locator('#in-nuevo').fill('Puerta del cuarto de prueba');
      await p.locator('#campo-root .in-b2',{hasText:/^Agregar$/}).click(); await p.waitForTimeout(250);
      await p.locator('#campo-root .in-el',{hasText:'Puerta del cuarto de prueba'}).click(); await p.waitForTimeout(250);
      await tresDe(0).nth(0).click(); await p.waitForTimeout(150);
      await volver(); await p.waitForTimeout(200);
      await p.locator('#campo-root .in-el').nth(2).click(); await p.waitForTimeout(250);
      await p.locator('#campo-root .in-lapiz').click(); await p.locator('#in-ren').fill('Puerta renombrada en obra');
      await p.locator('#campo-root .in-b2',{hasText:'Guardar el nombre'}).click(); await p.waitForTimeout(250);
      await tresDe(0).nth(0).click(); await p.waitForTimeout(150);
      await volver(); await p.waitForTimeout(400);
      await esperar(async()=>!(await G(()=>Object.keys(_inspSucios()).length)));
      const e6=ESC.length, a6=esActs();
      await p.locator('#campo-root .in-reset',{hasText:'esta inspección'}).click(); await p.waitForTimeout(150);
      await p.locator('#campo-root .in-conf .in-b2',{hasText:'Sí, borrar las marcas'}).click();
      await esperar(async()=>await G(()=>!Object.keys(_inspSucios()).length&&_inspCuenta(S._insp.area,S._insp.of).puntos===0));
      const sl6=ESC.slice(e6), resp=sl6.map((x,i)=>[x,i]).filter(([x])=>x.base==='obra_cambios'&&/^RESPALDO antes de borrar/.test(x.body&&x.body.detalle||''));
      const antes=resp.every(([x,i])=>{ const iF=sl6.findIndex(y=>y.base==='obra_inspecciones'&&y.body.id===x.body.entidad_id); return iF>i; });
      const nombres=await G(()=>[...document.querySelectorAll('#campo-root .in-el span')].map(x=>x.textContent));
      const vacio=await G(()=>_inspCuenta(S._insp.area,S._insp.of).puntos===0);
      r.resetInsp=[vacio&&Object.values(FILAS).filter(f=>f.oficio==='ebanisteria').every(f=>f.puntos.every(y=>!y||!y.m))?'todo sin marcar':'quedan marcas',
        resp.length+' respaldos'+(antes?' antes':' (alguno después)'),
        nombres.some(t=>t.startsWith('Puerta del cuarto de prueba'))&&nombres.some(t=>t.startsWith('Puerta renombrada en obra'))?'agregado y nombre siguen':'se perdió '+JSON.stringify(nombres.slice(0,4)),
        esActs()===a6?'nada en actividades':'tocó actividades'].join(' · ');
    }else r.resetInsp='sin botón';
    // h) «Guardar y seguir después»: al volver a entrar, al elemento que falta
    const est=()=>Object.values(ESTS).find(x=>x.id==='4A|ebanisteria')||{};
    if(await p.locator('#campo-root .in-fin .in-b2',{hasText:'Guardar y seguir después'}).count()){
      await p.locator('#campo-root .in-el').first().click(); await p.waitForTimeout(250);
      await tresDe(0).nth(0).click(); await p.waitForTimeout(150);
      await p.locator('#campo-root .in-guardar').click(); await p.waitForTimeout(150);
      await esperar(()=>est().estado==='en_curso');
      const enOficios=await G(()=>S._insp.paso==='oficio');
      const chip=await G(()=>{ const b=[...document.querySelectorAll('#campo-root .in-of')].find(x=>/Ebanistería/.test(x.textContent)); return b?(b.querySelector('.in-est')||{}).textContent:''; });
      await p.locator('#campo-root .in-of',{hasText:'Ebanistería'}).click(); await p.waitForTimeout(250);
      const vuelve=await G(()=>S._insp.paso==='elem'?_inspElActual().nombre:S._insp.paso);
      r.guardar=[est().estado==='en_curso'&&enOficios?'guardada':'no guardó', chip==='En curso'?'en curso':'chip '+chip, vuelve==='Entrada principal'?'vuelve al elemento que falta':'cae en '+vuelve].join(' · ');
    }else r.guardar='sin botón';
    // i) cerrar con su resumen, no deja marcar, y se reabre
    if(await G(()=>S._insp&&S._insp.paso==='elem')){ await volver(); await p.waitForTimeout(250); }
    if(await p.locator('#campo-root .in-fin .in-b2',{hasText:'Cerrar inspección'}).count()){
      await p.locator('#campo-root .in-fin .in-b2',{hasText:'Cerrar inspección'}).click(); await p.waitForTimeout(150);
      const res=await G(()=>{ const c=document.querySelector('#campo-root .in-cierre .in-res'); return c?[...c.children].map(x=>x.textContent.trim()).join(' '):''; });
      await p.locator('#campo-root .in-cierre .in-b2',{hasText:'Sí, cerrar la inspección'}).click(); await p.waitForTimeout(150);
      await esperar(()=>est().estado==='cerrada');
      const cerr=JSON.parse(JSON.stringify(est()));
      await p.locator('#campo-root .in-of',{hasText:'Ebanistería'}).click(); await p.waitForTimeout(250);
      await p.locator('#campo-root .in-el').first().click(); await p.waitForTimeout(250);
      const e7=ESC.length; await tresDe(1).nth(0).click(); await p.waitForTimeout(600);
      const bloq=!ESC.slice(e7).some(x=>x.base==='obra_inspecciones') && !(await G(()=>(_inspPuntos(_inspElActual().rowId)[1]||{}).m));
      await volver(); await p.waitForTimeout(200);
      await p.locator('#campo-root .in-agr',{hasText:'Reabrir la inspección'}).click(); await p.waitForTimeout(150);
      await esperar(()=>est().estado==='en_curso');
      r.cerrar=[/0 con todo ✔ 0 con ✗ 25 sin terminar/.test(res)?'resumen 0 ✔ · 0 ✗ · 25 faltan':'resumen: '+res,
        cerr.estado==='cerrada'&&/Karina/.test(cerr.cerrada_por||'')?'cerrada por Karina':'cerrada: '+JSON.stringify(cerr),
        bloq?'no deja marcar':'dejó marcar', /Karina/.test(est().reabierta_por||'')?'reabierta por Karina':'reabierta: '+est().reabierta_por].join(' · ');
    }else r.cerrar='sin botón';
    // j) un inodoro con sus 8 puntos en ✔ queda «listo»
    await volver(); await p.waitForTimeout(250);
    if(await p.locator('#campo-root .in-of',{hasText:'Plomería'}).count()){
      await p.locator('#campo-root .in-of',{hasText:'Plomería'}).click(); await p.waitForTimeout(250);
      const plom=await G(()=>{ const c={}; _inspElementos(S._insp.area,'plomeria').forEach(e=>c[e.grupo]=(c[e.grupo]||0)+1); return c; });
      r.plomeria4A=['inodoro','lavamanos','ducha','fregadero','calentador'].map(k=>(plom[k]||0)+' '+k).join(' · ');
      await p.locator('#campo-root .in-el').first().click(); await p.waitForTimeout(250);
      const nomI=await G(()=>_inspElActual().grupo+' · '+_inspElActual().nombre);
      for(let i=0;i<8;i++){ await tresDe(i).nth(0).click(); await p.waitForTimeout(60); }
      const listo=await G(()=>{ const l=document.querySelector('#campo-root .in-listo'); return !!(l&&l.checkVisibility()); });
      await volver(); await p.waitForTimeout(250);
      const enLista=await G(()=>/listo/.test((document.querySelector('#campo-root .in-el')||{}).textContent||''));
      r.inodoroListo=(nomI.startsWith('inodoro')?'inodoro':nomI)+' · '+(listo?'listo':'no listo')+' · '+(enLista?'la lista lo dice':'la lista no lo dice');
      // v157 · un ✗ sin foto en el segundo elemento, para el Levantamiento
      await p.locator('#campo-root .in-el').nth(1).click(); await p.waitForTimeout(250);
      const elSF=await G(()=>_inspElActual().rowId);
      // v158 · con SOLO la nota, sin opción
      await tresDe(0).nth(1).click(); await p.waitForTimeout(150);
      await p.locator('#in-nota').fill('Rayada abajo');
      await p.locator('#campo-root .in-b2',{hasText:'Guardar el problema'}).click();
      const toast=await G(()=>((document.getElementById('app-toast')||{}).textContent||'').trim());
      const g1=await esperar(()=>{ const pt=filaDe(elSF).puntos[0]; return pt&&pt.m==='mal'&&!pt.c&&pt.n==='Rayada abajo'; });
      const linea=await G(()=>((document.querySelectorAll('#campo-root .in-pt')[0].querySelector('.in-prob')||{}).textContent||''));
      r.soloNota=[g1?'guarda con solo la nota':'no guardó', toast==='Guardado'?'«Guardado»':'aviso '+JSON.stringify(toast), /^Rayada abajo/.test(linea)?'Rayada abajo':'renglón '+JSON.stringify(linea.slice(0,40))].join(' · ');
      // v158 · borrador: escribir, cerrar sin guardar y volver
      const eB=ESC.length;
      await tresDe(1).nth(1).click(); await p.waitForTimeout(150);
      await p.locator('#in-nota').fill('falta la roseta');
      await p.locator('#campo-root .in-mal .in-b2',{hasText:'Cancelar'}).click(); await p.waitForTimeout(200);
      const avisa=await G(()=>/sin guardar: «falta la roseta»/.test((document.querySelectorAll('#campo-root .in-pt')[1]||{}).textContent||''));
      await volver(); await p.waitForTimeout(200);
      await p.locator('#campo-root .in-el').nth(1).click(); await p.waitForTimeout(250);
      await tresDe(1).nth(1).click(); await p.waitForTimeout(150);
      const sigue=await G(()=>(document.getElementById('in-nota')||{}).value);
      await p.waitForTimeout(600);
      const escr=ESC.slice(eB).filter(x=>x.base==='obra_inspecciones'&&x.body&&x.body.id===elSF&&x.body.puntos&&x.body.puntos[1]&&x.body.puntos[1].m).length;
      await p.locator('#campo-root .in-mal .in-b2',{hasText:'Cancelar'}).click(); await p.waitForTimeout(150);
      r.borrador=[sigue==='falta la roseta'?'la nota sigue':'quedó '+JSON.stringify(sigue), avisa?'lo dice en el punto':'no lo dice', escr?'escribió':'no escribió'].join(' · ');
      await volver(); await p.waitForTimeout(250);
      // v159 · por baño
      const pb=await G(()=>{ const ps=_inspPantallas(S._insp.area,'plomeria'), banos=ps.filter(x=>x.junta);
        return {n:ps.length, lista:document.querySelectorAll('#campo-root .in-el').length, con:banos.filter(x=>x.els.length===3).length, sin:banos.filter(x=>x.els.length===2).length,
          idx:ps.findIndex(x=>x.els.length===3)}; });
      const idx=pb.idx;
      await p.locator('#campo-root .in-el').nth(idx).click(); await p.waitForTimeout(250);
      const pb2=await G(()=>({secs:[...document.querySelectorAll('#campo-root .in-sec')].map(x=>x.textContent.trim()).join(' · '), pts:document.querySelectorAll('#campo-root .in-pt').length}));
      r.porBano=[pb.n+' pantallas', pb.lista===pb.n?'la lista igual':'lista '+pb.lista, pb2.secs, pb2.pts+' puntos', pb.con+' con ducha · '+pb.sin+' sin ducha'].join(' · ');
      // v159 · no salir sin guardar
      const ptD=n=>p.locator('#campo-root .in-pt').nth(n).locator('.in-b');
      const rowD=await G(()=>_inspPantActual().els[2].rowId);
      const s0=ESC.length;
      await ptD(16).nth(0).click(); await p.waitForTimeout(200);
      const noEscribe=!ESC.slice(s0).some(x=>x.base==='obra_inspecciones');
      await p.locator('#campo-root .hp-volver').click(); await p.waitForTimeout(250);
      const pregunta=await G(()=>!!document.querySelector('#campo-root .in-salir')&&S._insp.paso==='elem');
      await p.locator('#campo-root .in-salir .in-b2',{hasText:'Seguir aquí'}).click(); await p.waitForTimeout(200);
      const sigueAqui=await G(id=>S._insp.paso==='elem'&&!document.querySelector('#campo-root .in-salir')&&(_inspPuntos(id)[0]||{}).m==='ok', rowD);
      await G(()=>goTab('obra')); await p.waitForTimeout(250);
      const tabPregunta=await G(()=>!!document.querySelector('#campo-root .in-salir')&&S._insp.paso==='elem');
      await p.locator('#campo-root .in-salir .in-b2',{hasText:'Seguir aquí'}).click(); await p.waitForTimeout(200);
      await p.locator('#campo-root .hp-volver').click(); await p.waitForTimeout(250);
      await p.locator('#campo-root .in-salir .in-b2',{hasText:'Descartar'}).click(); await p.waitForTimeout(300);
      const descarta=(await G(id=>S._insp.paso==='lista'&&!(_inspPuntos(id)[0]||{}).m, rowD)) && !ESC.slice(s0).some(x=>x.base==='obra_inspecciones');
      await p.locator('#campo-root .in-el').nth(idx).click(); await p.waitForTimeout(250);
      const c0=CAMB.length;
      await ptD(16).nth(0).click(); await p.waitForTimeout(150);
      await p.locator('#campo-root .hp-volver').click(); await p.waitForTimeout(250);
      await p.locator('#campo-root .in-salir .in-b2',{hasText:/^Guardar$/}).click();
      await esperar(()=>{ const f=FILAS[rowD]; return f&&f.puntos&&f.puntos[0]&&f.puntos[0].m==='ok'; });
      const guarda=!!(FILAS[rowD]&&FILAS[rowD].puntos[0]&&FILAS[rowD].puntos[0].m==='ok') && await G(()=>S._insp.paso==='lista');
      r.salir=[noEscribe&&pregunta?'pregunta al salir':'no preguntó', sigueAqui?'seguir aquí se queda':'no se quedó', tabPregunta?'otra pestaña también pregunta':'otra pestaña no pregunta',
        descarta?'descartar quita':'descartar no quitó', guarda?'guardar guarda':'no guardó'].join(' · ');
      // v159 · historial
      const h1=CAMB.slice(c0).filter(c=>c.accion==='guardada'&&c.entidad_id===rowD);
      const pt0=(FILAS[rowD]&&FILAS[rowD].puntos[0])||{};
      await p.locator('#campo-root .in-el').nth(idx).click(); await p.waitForTimeout(250);
      const quien=await G(()=>[...document.querySelectorAll('#campo-root .in-quien')].map(x=>x.textContent).join(' | '));
      await p.locator('#campo-root .in-hist-btn').click();
      await esperar(async()=>await G(()=>document.querySelectorAll('#campo-root .in-hist-r').length>0));
      const histVe=await G(()=>/Llenó · 1 ✔/.test((document.querySelector('#campo-root .in-hist')||{}).textContent||''));
      r.historial=[h1.length===1?'un renglón por guardado':h1.length+' renglones',
        h1[0]&&/^Llenó · 1 ✔ · 0 ✗ · 0 No aplica — 1\. /.test(h1[0].detalle)&&h1[0].usuario_nombre==='Ing. Karina Breton'?'Llenó con su punto':'detalle '+JSON.stringify(h1[0]&&h1[0].detalle),
        pt0.u0==='Ing. Karina Breton'&&pt0.u==='Ing. Karina Breton'?'quién en el punto':'punto '+JSON.stringify([pt0.u0,pt0.u]),
        /Llenó: Ing\. Karina Breton/.test(quien)?'se ve en la pantalla':'pantalla: '+quien, histVe?'y en el historial':'el historial no lo enseña'].join(' · ');
      // v159 · lo guardado que no subió no se pisa al volver a entrar
      cortaInsp=true;
      await ptD(17).nth(0).click(); await p.waitForTimeout(150);
      await volver(); await p.waitForTimeout(600);
      await G(()=>{ inspVolver(); inspVolver(); }); await p.waitForTimeout(200);
      await p.locator('#campo-root .hp-op',{hasText:/^Apartamento 4A/}).click(); await p.waitForTimeout(900);
      const sigueMarca=await G(id=>(_inspPuntos(id)[1]||{}).m==='ok', rowD);
      cortaInsp=false; await G(()=>_inspEnviar());
      await esperar(()=>{ const f=FILAS[rowD]; return f&&f.puntos[1]&&f.puntos[1].m==='ok'; });
      r.noPisa=[sigueMarca?'la marca sigue al volver a entrar':'se perdió al volver a entrar',
        (FILAS[rowD]&&FILAS[rowD].puntos[1]&&FILAS[rowD].puntos[1].m==='ok')?'sale al volver la red':'no salió'].join(' · ');
      await p.locator('#campo-root .in-of',{hasText:'Plomería'}).click(); await p.waitForTimeout(250);
    }else{ r.plomeria4A='sin Plomería'; r.inodoroListo='sin Plomería'; }
    // v157 · Pintura en dos grupos, Muros y Techo (al entrar a un oficio en curso se cae en su elemento: se vuelve hasta los oficios)
    for(let t=0;t<3&&(await G(()=>S._insp&&(S._insp.paso==='elem'||S._insp.paso==='lista')));t++){ await volver(); await p.waitForTimeout(250); }
    if(await p.locator('#campo-root .in-of',{hasText:'Pintura'}).count()){
      await p.locator('#campo-root .in-of',{hasText:'Pintura'}).click(); await p.waitForTimeout(250);
      const pin=await G(()=>{ const c={}; _inspElementos(S._insp.area,'pintura').forEach(e=>c[e.grupo]=(c[e.grupo]||0)+1);
        const ps=typeof _inspPantallas==='function'?_inspPantallas(S._insp.area,'pintura'):[];
        const t=_inspGrupo('pintura','techo'); return {c, np:ps.length, junta:ps.length&&ps.every(x=>x.els.length===2), lista:document.querySelectorAll('#campo-root .in-el').length, n:t?t.pts.length:0, p5:t&&t.pts[4]?t.pts[4][0]:''}; });
      r.pintura4A=['Muros '+(pin.c.muros||0), 'Techo '+(pin.c.techo||0), (pin.junta&&pin.lista===pin.np?pin.np+' espacios con muros y techo juntos':'por separado'), 'Techo con '+pin.n+' puntos', pin.p5].join(' · ');
    }else r.pintura4A='sin Pintura';
    r.levKarina=await G(()=>{ inspVolver(); inspVolver(); return document.querySelector('#campo-root .in-lev-btn')?'lo ve':'no lo ve'; });
    r.sinActividades=esActs()-acts0;
    }catch(e){ r._error156=String(e&&e.message||e).split('\n')[0].slice(0,200); }
    r.dedos=await G(()=>{ const chicos=[...document.querySelectorAll('#campo-root .in button, #campo-root .in input')].filter(e=>e.checkVisibility()&&e.getBoundingClientRect().height<40).length;
      return chicos+(document.documentElement.scrollWidth>window.innerWidth+1?1:0); });
    r.dedos=r.dedos;
    // k) el Levantamiento, como el Ing. Nilson: la tabla del edificio y aprobar un elemento
    try{
      const q=await ctx.newPage(); q.setDefaultTimeout(6000);
      await q.goto(ORIGEN+'/index.html',{waitUntil:'load'});
      await q.evaluate(u=>{ try{ sessionStorage.setItem('mecca_user',JSON.stringify(u)); }catch(e){} }, {id:'nilson',nombre:'Ing. Nilson',rol:'admin'});
      await q.reload({waitUntil:'load'});
      for(let t=0;t<40;t++){ if(await q.evaluate(()=>typeof S!=='undefined'&&S.acts&&S.acts.length).catch(()=>0)) break; await q.waitForTimeout(500); }
      await q.waitForTimeout(800);
      await q.evaluate(()=>goTab('reportes')); await q.waitForTimeout(300);
      await q.locator('#c-hp .hp-gran',{hasText:'Inspección'}).click(); await q.waitForTimeout(200);
      await q.locator('#c-hp .in-lev-btn').click();
      await q.waitForSelector('#c-hp .lev-t');
      const tabla=await q.evaluate(()=>{ const t=document.querySelector('#c-hp .lev-t');
        const filas=t.querySelectorAll('tbody tr').length, cols=t.querySelectorAll('thead th').length-1;
        const ths=[...t.querySelectorAll('thead th')].map(x=>x.textContent), ci=ths.indexOf('Ebanistería');
        const tr=[...t.querySelectorAll('tbody tr')].find(x=>x.querySelector('th').textContent==='4A');
        const b=tr&&tr.children[ci].querySelector('button');
        return {filas, cols, cel:b?b.className.replace('lev-c ','')+' '+b.textContent:'' }; });
      const f4=Object.values(FILAS).find(f=>f.id===el1);
      await q.evaluate(()=>{ const t=document.querySelector('#c-hp .lev-t'); const ths=[...t.querySelectorAll('thead th')].map(x=>x.textContent), ci=ths.indexOf('Ebanistería');
        const tr=[...t.querySelectorAll('tbody tr')].find(x=>x.querySelector('th').textContent==='4A'); tr.children[ci].querySelector('button').click(); });
      await q.waitForTimeout(250);
      const e8=ESC.length;
      await q.locator('#c-hp .in-aprob.mini').first().click();
      for(let t=0;t<16;t++){ await q.waitForTimeout(250); if(f4&&FILAS[el1].aprobado_por) break; }
      const pat=ESC.slice(e8).find(x=>x.base==='obra_inspecciones'&&x.m==='PATCH');
      const boton=await q.evaluate(()=>(document.querySelector('#c-hp .in-aprob.mini.on')||{}).textContent||'');
      r.levantamiento=[tabla.filas+' × '+tabla.cols, '4A Ebanistería '+tabla.cel,
        pat&&FILAS[el1]&&FILAS[el1].aprobado_por==='Ing. Nilson'&&/Aprobado por Ing\. Nilson/.test(boton)?'aprueba el elemento':'no aprobó'].join(' · ');
      await q.evaluate(()=>inspLevOf(REC_ORDEN.findIndex(x=>/Apto 4A/.test(x)),'plomeria'));
      await q.waitForTimeout(250);
      r.levSinFoto=await q.evaluate(()=>[...document.querySelectorAll('#c-hp .lev-sinfoto')].some(x=>x.checkVisibility()&&x.textContent==='sin foto'))?'«sin foto» a la vista':'no sale «sin foto»';
      await q.close();
    }catch(e){ r.levantamiento='se cortó: '+String(e&&e.message||e).split('\n')[0].slice(0,120); }
    r.realBase=fuera;
    await ctx.close();
  }catch(e){ r._error=String(e&&e.message||e).split('\n')[0].slice(0,200); }
  srv.close();
  for(const k of Object.keys(IN_ESPERADO)) if(!(k in r)) r[k]=null;
  return r;
}

// ── el comparador ─────────────────────────────────────────────────────────
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
const res=[];
for(const v of VERS){ process.stderr.write('· probando '+v+' …\n'); const nv=v.replace(/[^\w.-]/g,'_');
  const r=await probar(nv, leerVersion(v), b); r.libro=await probarLibro(nv, leerVersion(v), b);
  r.recorrido=await probarRecorrido(nv, leerVersion(v), b);
  r.cabecera=await probarCabecera(nv, leerVersion(v), b);
  r.trabas=await probarTrabas(nv, leerVersion(v), b);
  r.velocidad=await probarVelocidad(nv, leerVersion(v), b);
  r.avance=await probarAvance(nv, leerVersion(v), b);
  r.hoja=await probarHoja(nv, leerVersion(v), b);
  r.dosHojas=await probarDosHojas(nv, leerVersion(v), b);
  r.repetir=await probarRepetir(nv, leerVersion(v), b);
  r.inspeccion=await probarInspeccion(nv, leerVersion(v), b); res.push(r); }
await b.close();
if(JSONOUT){ console.log(JSON.stringify(res,null,1)); process.exit(0); }

const plano=(o,pre,m)=>{ for(const k of Object.keys(o)){ const v=o[k], kk=pre?pre+'.'+k:k;
  if(v&&typeof v==='object'&&!Array.isArray(v)&&!/^(sinContratista|sinInicio|editar)/.test(k)) plano(v,kk,m); else m[kk]=JSON.stringify(v); } return m; };
const A=plano(res[0].comun,'',{}), B=plano(res[1].comun,'',{});
const claves=Array.from(new Set(Object.keys(A).concat(Object.keys(B))));
let dist=0;
console.log('\nLISTA DE CHEQUEO · '+VERS[0]+' ('+res[0].propio.version+')  contra  '+VERS[1]+' ('+res[1].propio.version+')\n');
for(const k of claves){ const ig=A[k]===B[k]; if(!ig) dist++;
  console.log((ig?'  igual    ':'  DISTINTO ')+k);
  if(!ig){ console.log('      antes:   '+String(A[k]).slice(0,400)); console.log('      después: '+String(B[k]).slice(0,400)); } }
console.log('\n'+(claves.length-dist)+' iguales · '+dist+' distintos\n');
for(const [i,r] of res.entries()){
  console.log('── propio de '+VERS[i]+' ──');
  for(const k of Object.keys(r.propio)) console.log('  '+k+': '+JSON.stringify(r.propio[k]));
}
// Las comprobaciones del libro: contra lo esperado, en las dos versiones.
let fallaDespues=0;
console.log('\nEL LIBRO DE PENALIDADES — contra lo que tiene que dar (v135)\n');
for(const k of Object.keys(PEN_ESPERADO)){
  const e=PEN_ESPERADO[k];
  const marca=res.map(r=>{ const v=r.libro[k]; return (v===e.v?'✓':'✗')+' '+v; });
  if(res[1].libro[k]!==e.v) fallaDespues++;
  console.log('  '+marca[0].padEnd(8)+marca[1].padEnd(8)+' (tiene que dar '+e.v+')  '+e.d);
}
console.log('  ↑ antes · después. '+(fallaDespues?fallaDespues+' FALLAN en '+VERS[1]:'todas bien en '+VERS[1]));
let fallaRec=0;
console.log('\nEL MODO OBRA — contra lo que tiene que dar (v137)\n');
for(const k of Object.keys(REC_ESPERADO)){
  const e=REC_ESPERADO[k];
  const marca=res.map(r=>{ const v=r.recorrido[k]; return (v===e.v?'✓':'✗')+' '+JSON.stringify(v); });
  if(res[1].recorrido[k]!==e.v) fallaRec++;
  console.log('  '+marca[0].padEnd(14).slice(0,40)+'  '+marca[1]+'\n        (tiene que dar '+JSON.stringify(e.v)+')  '+e.d);
}
console.log('  ↑ antes · después. '+(fallaRec?fallaRec+' FALLAN en '+VERS[1]:'todas bien en '+VERS[1]));
if(res[1].recorrido._escriturasAlGuardar) console.log('  escrituras al guardar: '+JSON.stringify(res[1].recorrido._escriturasAlGuardar.reduce((m,x)=>{m[x]=(m[x]||0)+1;return m;},{})));
for(const [i,r] of res.entries()) if(r.recorrido._error) console.log('  ('+VERS[i]+' se cortó: '+r.recorrido._error+')');
if(res[1].recorrido._botones) console.log('  botones de los tres primeros renglones: '+JSON.stringify(res[1].recorrido._botones));
if(res[1].recorrido._lecturas&&res[1].recorrido._lecturas.length) console.log('  GET durante el recorrido: '+JSON.stringify(res[1].recorrido._lecturas));
let fallaCab=0;
console.log('\nLA CABECERA DE ACTIVIDADES — contra lo que tiene que dar (v138)\n');
for(const k of Object.keys(CAB_ESPERADO)){
  const e=CAB_ESPERADO[k];
  const marca=res.map(r=>{ const v=r.cabecera[k]; return (v===e.v?'✓':'✗')+' '+JSON.stringify(v); });
  if(res[1].cabecera[k]!==e.v) fallaCab++;
  console.log('  '+marca[0].padEnd(14).slice(0,40)+'  '+marca[1]+'\n        (tiene que dar '+JSON.stringify(e.v)+')  '+e.d);
}
console.log('  ↑ antes · después. '+(fallaCab?fallaCab+' FALLAN en '+VERS[1]:'todas bien en '+VERS[1]));
for(const [i,r] of res.entries()) if(r.cabecera._error) console.log('  ('+VERS[i]+' se cortó: '+r.cabecera._error+')');
if(res[1].cabecera._lecturas&&(res[1].cabecera._lecturas.length||res[1].cabecera._escrituras.length)) console.log('  al plegar: '+JSON.stringify(res[1].cabecera._lecturas.concat(res[1].cabecera._escrituras)));
let fallaTra=0;
console.log('\nTRABADAS Y PROPUESTAS — contra lo que tiene que dar (v139)\n');
for(const k of Object.keys(TRA_ESPERADO)){
  const e=TRA_ESPERADO[k];
  const marca=res.map(r=>{ const v=r.trabas[k]; return (v===e.v?'✓':'✗')+' '+JSON.stringify(v); });
  if(res[1].trabas[k]!==e.v) fallaTra++;
  console.log('  '+marca[0].padEnd(14).slice(0,40)+'  '+marca[1]+'\n        (tiene que dar '+JSON.stringify(e.v)+')  '+e.d);
}
console.log('  ↑ antes · después. '+(fallaTra?fallaTra+' FALLAN en '+VERS[1]:'todas bien en '+VERS[1]));
for(const [i,r] of res.entries()) if(r.trabas._error) console.log('  ('+VERS[i]+' se cortó: '+r.trabas._error+')');
if(res[1].trabas._escrituras) console.log('  escrituras: '+JSON.stringify(res[1].trabas._escrituras.reduce((m,x)=>{m[x.split(' ').slice(0,2).join(' ')]=(m[x.split(' ').slice(0,2).join(' ')]||0)+1;return m;},{})));
let fallaVel=0;
console.log('\nVELOCIDAD — contra lo que tiene que dar (v144)\n');
for(const k of Object.keys(VEL_ESPERADO)){
  const e=VEL_ESPERADO[k];
  const marca=res.map(r=>{ const v=r.velocidad[k]; return (v===e.v?'✓':'✗')+' '+JSON.stringify(v); });
  if(res[1].velocidad[k]!==e.v) fallaVel++;
  console.log('  '+marca[0].padEnd(14).slice(0,40)+'  '+marca[1]+'\n        (tiene que dar '+JSON.stringify(e.v)+')  '+e.d);
}
console.log('  ↑ antes · después. '+(fallaVel?fallaVel+' FALLAN en '+VERS[1]:'todas bien en '+VERS[1]));
for(const [i,r] of res.entries()) if(r.velocidad._error) console.log('  ('+VERS[i]+' se cortó: '+r.velocidad._error+')');
let fallaAva=0;
console.log('\nAVANCE POR UBICACIÓN Y CONTRATISTA — contra lo que tiene que dar (v146)\n');
for(const k of Object.keys(AVA_ESPERADO)){
  const e=AVA_ESPERADO[k];
  const marca=res.map(r=>{ const v=r.avance[k]; return (v===e.v?'✓':'✗')+' '+JSON.stringify(v); });
  if(res[1].avance[k]!==e.v) fallaAva++;
  console.log('  '+marca[0].padEnd(14).slice(0,40)+'  '+marca[1]+'\n        (tiene que dar '+JSON.stringify(e.v)+')  '+e.d);
}
console.log('  ↑ antes · después. '+(fallaAva?fallaAva+' FALLAN en '+VERS[1]:'todas bien en '+VERS[1]));
for(const [i,r] of res.entries()){ if(r.avance._error) console.log('  ('+VERS[i]+' se cortó: '+r.avance._error+')');
  const ex=Object.keys(r.avance).filter(k=>/^_(ubic|cont|des)/.test(k)); if(ex.length) console.log('  ('+VERS[i]+' detalle: '+JSON.stringify(ex.reduce((m,k)=>{m[k]=r.avance[k];return m;},{}))+')'); }
if(res[1].avance._msUbic!=null) console.log('  pintar (ms, sin frenar): por ubicación '+res[1].avance._msUbic+' · por contratista '+res[1].avance._msCont+' · matriz '+res[1].avance._msMatriz);
let fallaHoja=0;
console.log('\nLA HOJA DE REPORTE — contra lo que tiene que dar (v147)\n');
for(const k of Object.keys(HOJA_ESPERADO)){
  const e=HOJA_ESPERADO[k];
  const marca=res.map(r=>{ const v=r.hoja[k]; return (v===e.v?'✓':'✗')+' '+JSON.stringify(v); });
  if(res[1].hoja[k]!==e.v) fallaHoja++;
  console.log('  '+marca[0].padEnd(14).slice(0,40)+'  '+marca[1]+'\n        (tiene que dar '+JSON.stringify(e.v)+')  '+e.d);
}
console.log('  ↑ antes · después. '+(fallaHoja?fallaHoja+' FALLAN en '+VERS[1]:'todas bien en '+VERS[1]));
for(const [i,r] of res.entries()){ if(r.hoja._error) console.log('  ('+VERS[i]+' se cortó: '+r.hoja._error+')');
  const ex=Object.keys(r.hoja).filter(k=>/^_/.test(k)&&k!=='_error'); if(ex.length) console.log('  ('+VERS[i]+' detalle: '+JSON.stringify(ex.reduce((m,k)=>{m[k]=r.hoja[k];return m;},{}))+')'); }
let fallaHp=0;
console.log('\nLAS DOS HOJAS — contra lo que tiene que dar (v149)\n');
for(const k of Object.keys(HP_ESPERADO)){
  const e=HP_ESPERADO[k];
  const marca=res.map(r=>{ const v=r.dosHojas[k]; return (v===e.v?'✓':'✗')+' '+JSON.stringify(v); });
  if(res[1].dosHojas[k]!==e.v) fallaHp++;
  console.log('  '+marca[0].padEnd(14).slice(0,40)+'  '+marca[1]+'\n        (tiene que dar '+JSON.stringify(e.v)+')  '+e.d);
}
console.log('  ↑ antes · después. '+(fallaHp?fallaHp+' FALLAN en '+VERS[1]:'todas bien en '+VERS[1]));
for(const [i,r] of res.entries()){ if(r.dosHojas._error) console.log('  ('+VERS[i]+' se cortó: '+r.dosHojas._error+')');
  if(r.dosHojas._hojas) console.log('  ('+VERS[i]+' hojas: '+JSON.stringify(r.dosHojas._hojas)+')'); }
let fallaRp=0;
console.log('\nREPETIR EN OTRO APARTAMENTO — contra lo que tiene que dar (v152)\n');
for(const k of Object.keys(RP_ESPERADO)){
  const e=RP_ESPERADO[k];
  const marca=res.map(r=>{ const v=r.repetir[k]; return (v===e.v?'✓':'✗')+' '+JSON.stringify(v); });
  if(res[1].repetir[k]!==e.v) fallaRp++;
  console.log('  '+marca[0].padEnd(14).slice(0,40)+'  '+marca[1]+'\n        (tiene que dar '+JSON.stringify(e.v)+')  '+e.d);
}
console.log('  ↑ antes · después. '+(fallaRp?fallaRp+' FALLAN en '+VERS[1]:'todas bien en '+VERS[1]));
for(const [i,r] of res.entries()) if(r.repetir._error) console.log('  ('+VERS[i]+' se cortó: '+r.repetir._error+')');
let fallaIn=0;
console.log('\nINSPECCIÓN POR APARTAMENTO — contra lo que tiene que dar (v153, v154, v155)\n');
for(const k of Object.keys(IN_ESPERADO)){
  const e=IN_ESPERADO[k];
  const marca=res.map(r=>{ const v=r.inspeccion[k]; return (v===e.v?'✓':'✗')+' '+JSON.stringify(v); });
  if(res[1].inspeccion[k]!==e.v) fallaIn++;
  console.log('  '+marca[0].padEnd(14).slice(0,40)+'  '+marca[1]+'\n        (tiene que dar '+JSON.stringify(e.v)+')  '+e.d);
}
console.log('  ↑ antes · después. '+(fallaIn?fallaIn+' FALLAN en '+VERS[1]:'todas bien en '+VERS[1]));
for(const [i,r] of res.entries()) if(r.inspeccion._error) console.log('  ('+VERS[i]+' se cortó: '+r.inspeccion._error+')');
console.log('\nCANDADO: escrituras interceptadas '+res.map(r=>Object.values(r.propio.escrituras).reduce((s,x)=>s+x,0)).join(' / ')+
  ' · salidas cortadas (fuentes, fotos) '+res.map(r=>r.propio.salidasCortadas).join(' / ')+' · a la base real: 0');
process.exit(dist||fallaDespues||fallaRec||fallaCab||fallaTra||fallaVel||fallaAva||fallaHoja||fallaHp||fallaRp||fallaIn?1:0);
