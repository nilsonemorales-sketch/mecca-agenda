/* ─────────────────────────────────────────────────────────────────────────
   Mecca Agenda — API de voz e inteligencia
   Corre en Cloudflare Workers con Workers AI. El app (que vive en GitHub
   Pages, sin servidor propio) le habla a este Worker.

   Dos puertas:
     POST /api/transcribir  audio -> texto   (Whisper)
     POST /api/entender     texto -> orden   (Mistral)

   Por que existe: el reconocedor de voz del navegador no se porta igual en
   cada telefono; en el iPhone se congelaba. Grabar audio SI lo hace bien
   cualquier telefono, asi que el app graba y aqui se transcribe.

   Cuesta cero mientras se este debajo de las 10,000 neuronas diarias que
   Cloudflare regala. Transcribir un minuto de audio son ~46 neuronas, o sea
   que caben unas 3 horas y media de dictado al dia.
   ───────────────────────────────────────────────────────────────────────── */

const ORIGENES_PERMITIDOS = [
  'https://nilsonemorales-sketch.github.io',
  'http://localhost:8899',
  'http://127.0.0.1:8899'
];

const MODELO_VOZ   = '@cf/openai/whisper-large-v3-turbo';
const MODELO_TEXTO = '@cf/mistralai/mistral-small-3.1-24b-instruct';

/* Tope de audio. 30 segundos de voz comprimida no pasan de ~1 MB; mas que
   esto es un error o un abuso, no una orden de obra. */
const MAX_AUDIO_BYTES = 6 * 1024 * 1024;

const ACCIONES = ['completar','avance','iniciar','pausar','urgente','normal',
                  'asignar','planificar','desplanificar','crear','eliminar','buscar'];

function cabecerasCORS(origen){
  const permitido = ORIGENES_PERMITIDOS.includes(origen) ? origen : ORIGENES_PERMITIDOS[0];
  return {
    'Access-Control-Allow-Origin': permitido,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Clave',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(datos, estado, cors){
  return new Response(JSON.stringify(datos), {
    status: estado || 200,
    headers: Object.assign({'Content-Type':'application/json; charset=utf-8'}, cors)
  });
}

/* El modelo puede devolver el JSON envuelto en bloques de codigo o con texto
   alrededor. Se saca el primer objeto que se pueda parsear. */
function extraerJSON(txt){
  if(!txt) return null;
  const limpio = String(txt).replace(/```json/gi,'').replace(/```/g,'').trim();
  try{ return JSON.parse(limpio); }catch(e){}
  const i = limpio.indexOf('{'), f = limpio.lastIndexOf('}');
  if(i >= 0 && f > i){
    try{ return JSON.parse(limpio.slice(i, f+1)); }catch(e){}
  }
  return null;
}

const INSTRUCCIONES = `Eres el interprete de ordenes de una app de seguimiento de obra en Republica Dominicana.
Recibes UNA frase dicha por un ingeniero en la obra y la conviertes en una orden estructurada.

Devuelves SOLO un objeto JSON, sin explicacion y sin markdown.

Si la frase NO es una orden sobre una actividad (es una pregunta, un saludo, o no se entiende),
devuelves exactamente: {"accion":null}

Si SI es una orden, devuelves:
{
  "accion": una de [${ACCIONES.join(', ')}],
  "ref": el texto que identifica la actividad, tal como lo dijo (sin articulos iniciales),
  "valor": numero 0-100      // SOLO con accion "avance"
  "persona": nombre          // SOLO con accion "asignar"
  "motivo": texto            // SOLO con accion "pausar", si dijo por que
  "fecha": "hoy" o "manana"  // SOLO con accion "planificar"
  "area": texto              // SOLO con accion "crear", si dijo donde
}
Los campos que no apliquen se omiten.

Reglas que importan:
- NEGACION: si la frase niega ("el 2A NO esta terminado", "todavia no se ha hecho"),
  la respuesta es {"accion":null}. Nunca conviertas una negacion en una orden.
- "terminado", "listo", "completo", "ya se hizo" -> completar
- "empezo", "arranco", "iniciaron" -> iniciar
- un porcentaje o "va por la mitad" (50), "tres cuartos" (75) -> avance
- "pausa", "parado", "detenido" -> pausar
- "busca", "ensename", "cuales" -> buscar
- Los numeros dichos en palabras se convierten a cifras.
- Si dudas entre una accion y ninguna, devuelve {"accion":null}. Es preferible
  no entender a ejecutar algo que el ingeniero no pidio.`;

export default {
  async fetch(peticion, env){
    const url = new URL(peticion.url);
    const cors = cabecerasCORS(peticion.headers.get('Origin') || '');

    if(peticion.method === 'OPTIONS') return new Response(null, {status:204, headers:cors});
    if(peticion.method !== 'POST')    return json({error:'Solo POST'}, 405, cors);

    /* Clave compartida: sin esto cualquiera podria gastarse las neuronas. */
    if(!env.CLAVE_APP || peticion.headers.get('X-Clave') !== env.CLAVE_APP){
      return json({error:'No autorizado'}, 401, cors);
    }

    try{
      if(url.pathname === '/api/transcribir') return await transcribir(peticion, env, cors);
      if(url.pathname === '/api/entender')    return await entender(peticion, env, cors);
      return json({error:'Ruta desconocida'}, 404, cors);
    }catch(e){
      return json({error:'Fallo del servidor', detalle:String(e && e.message || e).slice(0,200)}, 500, cors);
    }
  }
};

/* ── audio -> texto ────────────────────────────────────────────────────── */
async function transcribir(peticion, env, cors){
  const cuerpo = await peticion.json().catch(()=>null);
  if(!cuerpo || typeof cuerpo.audio !== 'string' || !cuerpo.audio){
    return json({error:'Falta el audio'}, 400, cors);
  }
  /* base64 abulta ~4/3 respecto al binario */
  if(cuerpo.audio.length * 0.75 > MAX_AUDIO_BYTES){
    return json({error:'El audio es muy largo'}, 413, cors);
  }

  const salida = await env.AI.run(MODELO_VOZ, {
    audio: cuerpo.audio,          // base64, sin el prefijo "data:"
    task: 'transcribe',
    language: 'es',
    vad_filter: true,             // recorta el silencio del principio y el final
    condition_on_previous_text: false
  });

  const texto = (salida && salida.text || '').trim();
  return json({texto}, 200, cors);
}

/* ── texto -> orden ───────────────────────────────────────────────────── */
async function entender(peticion, env, cors){
  const cuerpo = await peticion.json().catch(()=>null);
  const frase = cuerpo && typeof cuerpo.frase === 'string' ? cuerpo.frase.trim() : '';
  if(!frase) return json({error:'Falta la frase'}, 400, cors);
  if(frase.length > 500) return json({error:'La frase es muy larga'}, 413, cors);

  const salida = await env.AI.run(MODELO_TEXTO, {
    messages: [
      {role:'system', content: INSTRUCCIONES},
      {role:'user',   content: frase}
    ],
    max_tokens: 300,
    temperature: 0.1
  });

  /* Modo diagnostico: devuelve tal cual lo que contesto el modelo. Sirve para
     ver la forma real de la respuesta sin adivinarla. */
  if(cuerpo.debug) return json({crudo: JSON.stringify(salida).slice(0,900)}, 200, cors);

  /* OJO: cuando el modelo devuelve JSON, salida.response YA VIENE COMO OBJETO,
     no como texto. Pasarlo por extraerJSON lo convertia en "[object Object]" y
     se perdia todo. Solo hay que parsear cuando llega como texto. */
  const bruto = salida && (salida.response !== undefined ? salida.response : salida.result);
  const orden = (bruto && typeof bruto === 'object') ? bruto : extraerJSON(bruto || '');
  if(!orden || !orden.accion || ACCIONES.indexOf(orden.accion) < 0){
    return json({orden:null}, 200, cors);
  }

  /* Se limpia lo que devolvio el modelo: solo pasan los campos conocidos y
     con el tipo correcto. Nunca se confia en la forma cruda. */
  const limpia = {accion: orden.accion, frase: frase, ref: String(orden.ref || '').trim()};
  if(orden.accion === 'avance'){
    const n = parseInt(orden.valor, 10);
    if(isNaN(n)) return json({orden:null}, 200, cors);
    limpia.valor = Math.min(100, Math.max(0, n));
  }
  if(orden.accion === 'asignar')    limpia.persona = String(orden.persona || '').trim();
  if(orden.accion === 'pausar' && orden.motivo) limpia.motivo = String(orden.motivo).trim();
  if(orden.accion === 'planificar') limpia.fecha = (orden.fecha === 'manana') ? 'manana' : 'hoy';
  if(orden.accion === 'crear' && orden.area)    limpia.area = String(orden.area).trim();

  /* crear no necesita referencia previa; el resto si */
  if(limpia.accion !== 'crear' && limpia.ref.length < 2) return json({orden:null}, 200, cors);

  return json({orden: limpia}, 200, cors);
}
