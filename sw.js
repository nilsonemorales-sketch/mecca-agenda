// Mecca Agenda — Service Worker
//
// El index.html pesa 1.27 MB. Antes se pedia con cache:'reload' en CADA
// apertura, asi que el telefono lo bajaba entero todas las veces. Ahora lo
// guardado sale al instante y la version nueva se baja por detras.
//
// OJO con e.waitUntil: hay que llamarlo SINCRONICAMENTE, mientras el evento
// todavia se esta despachando. Llamarlo dentro de un .then() lo tira con
// InvalidStateError en Safari (iPhone), y ahi la navegacion entera falla y
// el app no abre. Chrome lo perdona; el iPhone no. Por eso aqui se llama
// arriba del todo, antes de cualquier promesa.

var CACHE = 'mecca-v11';
var PAGINA = './pagina-guardada';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return clients.claim(); })
  );
});

/* Le dice a las pestañas abiertas que version acaba de guardarse. */
function avisarVersion(texto) {
  var m = /APP_VERSION\s*=\s*'([^']+)'/.exec(texto || '');
  if (!m) return;
  return clients.matchAll({ type: 'window' }).then(function(cs) {
    cs.forEach(function(c) { c.postMessage({ tipo: 'version', version: m[1] }); });
  });
}

/* Baja la pagina, la guarda y avisa si trae otra version. Devuelve la
   respuesta de red para poder servirla cuando no hay nada guardado. */
function bajarYGuardar() {
  return fetch('./index.html', { cache: 'no-cache' }).then(function(res) {
    if (!res || res.status !== 200) return res;
    var paraGuardar = res.clone();
    var paraLeer = res.clone();
    return caches.open(CACHE).then(function(c) {
      return c.put(PAGINA, paraGuardar);
    }).then(function() {
      return paraLeer.text().then(avisarVersion).catch(function(){});
    }).then(function() { return res; });
  });
}

self.addEventListener('fetch', function(e) {
  var req = e.request;

  if (req.mode === 'navigate') {
    /* SINCRONICO: la actualizacion de fondo se declara aqui, no dentro de
       una promesa. Si esto se hiciera abajo, el iPhone lanzaria
       InvalidStateError y la pagina no cargaria. */
    var fondo = bajarYGuardar().catch(function(){ return null; });
    e.waitUntil(fondo);

    e.respondWith(
      caches.open(CACHE)
        .then(function(c) { return c.match(PAGINA); })
        .then(function(guardado) {
          if (guardado) return guardado;              // sale al instante
          return fondo.then(function(res) {           // primera vez: de la red
            return res || fetch(req);
          });
        })
        /* Ultima red de seguridad: pase lo que pase aqui dentro, el app
           tiene que abrir. Sin esto, un fallo del cache deja pantalla
           en blanco y no hay forma de entrar a arreglarlo. */
        .catch(function() { return fetch(req); })
    );
    return;
  }

  /* TODO LO DEMAS: el service worker NO SE METE.
     Aqui estaba el fallo grave. Este manejador guardaba CUALQUIER respuesta
     200, incluidas las de la base de datos, y despues las servia del guardado.
     Resultado: el app entraba pero mostraba una foto congelada de la obra y
     nada de lo que uno tocaba tenia efecto visible.
     La base de datos, las fotos y todo lo que no sea de esta misma direccion
     pasan derecho a la red, sin tocar. Solo se guardan las letras y las
     librerias, que son archivos que no cambian. */
  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  var esMio = (url.origin === self.location.origin);
  var esLetra = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  var esLibreria = /(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)$/.test(url.hostname);

  // Nada de la base de datos ni de ningun servicio: derecho a la red.
  if (!esMio && !esLetra && !esLibreria) return;
  // Solo lectura simple. Un POST o un PATCH jamas se guarda.
  if (req.method !== 'GET') return;

  e.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(res) {
        if (res && res.status === 200 && (esLetra || esLibreria)) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); }).catch(function(){});
        }
        return res;
      });
    }).catch(function() { return fetch(req); })
  );
});

/* La pagina puede pedir que se mire si hay version nueva. */
self.addEventListener('message', function(e) {
  if (!e.data) return;
  if (e.data.tipo === 'buscar-version') {
    e.waitUntil(bajarYGuardar().catch(function(){}));
  }
  /* Salida de emergencia: si algo quedara mal guardado, la pagina puede
     mandar 'limpiar' y el proximo arranque vuelve a bajar todo de la red. */
  if (e.data.tipo === 'limpiar') {
    e.waitUntil(caches.keys().then(function(ks) {
      return Promise.all(ks.map(function(k) { return caches.delete(k); }));
    }));
  }
});
