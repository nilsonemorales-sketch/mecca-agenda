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
import { readFileSync, existsSync, mkdirSync } from 'fs';
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
    'N5 — Apto 5A','N5 — Apto 5B','N6 — Apto 6A','N6 — Apto 6B','N7 — Penthouse B','Parqueo',
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

// ── el comparador ─────────────────────────────────────────────────────────
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
const res=[];
for(const v of VERS){ process.stderr.write('· probando '+v+' …\n'); const nv=v.replace(/[^\w.-]/g,'_');
  const r=await probar(nv, leerVersion(v), b); r.libro=await probarLibro(nv, leerVersion(v), b);
  r.recorrido=await probarRecorrido(nv, leerVersion(v), b);
  r.cabecera=await probarCabecera(nv, leerVersion(v), b);
  r.trabas=await probarTrabas(nv, leerVersion(v), b);
  r.velocidad=await probarVelocidad(nv, leerVersion(v), b); res.push(r); }
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
console.log('\nCANDADO: escrituras interceptadas '+res.map(r=>Object.values(r.propio.escrituras).reduce((s,x)=>s+x,0)).join(' / ')+
  ' · salidas cortadas (fuentes, fotos) '+res.map(r=>r.propio.salidasCortadas).join(' / ')+' · a la base real: 0');
process.exit(dist||fallaDespues||fallaRec||fallaCab||fallaTra||fallaVel?1:0);
