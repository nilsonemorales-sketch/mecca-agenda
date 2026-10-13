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
  for(const v of ['lista','apto','matriz','edificio']){ await G(x=>{S.actVista=x;renderActs();},v); await p.waitForTimeout(700); C.vistas[v]=await G(()=>__h(document.getElementById('c-act').innerText)); }
  // 3 · las ocho agrupaciones de la lista
  await G(()=>{S.actVista='lista';});
  C.agrupar={};
  for(const f of ['tipo','apto','contratista','critico','nivel','personal','responsable','semana']){
    await G(x=>{S.actFiltro=x;renderActs();},f); await p.waitForTimeout(500);
    C.agrupar[f]=await G(()=>__h(document.getElementById('c-act').innerText)); }
  await G(()=>{S.actFiltro='tipo';renderActs();}); await p.waitForTimeout(500);
  // 4 · los renglones de la lista
  C.renglones=await G(()=>__h(Array.from(document.querySelectorAll('#c-act .act-item')).slice(0,8).map(x=>x.outerHTML).join('')));
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

// ── el comparador ─────────────────────────────────────────────────────────
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
const res=[];
for(const v of VERS){ process.stderr.write('· probando '+v+' …\n'); const nv=v.replace(/[^\w.-]/g,'_');
  const r=await probar(nv, leerVersion(v), b); r.libro=await probarLibro(nv, leerVersion(v), b); res.push(r); }
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
console.log('\nCANDADO: escrituras interceptadas '+res.map(r=>Object.values(r.propio.escrituras).reduce((s,x)=>s+x,0)).join(' / ')+
  ' · salidas cortadas (fuentes, fotos) '+res.map(r=>r.propio.salidasCortadas).join(' / ')+' · a la base real: 0');
process.exit(dist||fallaDespues?1:0);
