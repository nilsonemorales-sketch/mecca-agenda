// Mecca Agenda — Service Worker
//
// Antes esto bajaba el index.html ENTERO (1.27 MB) en cada apertura, porque
// pedia la navegacion con cache:'reload'. En el telefono, con datos, eso es
// la pantalla de "cargando" cada vez que abres el app.
//
// Ahora: lo guardado sale al instante y la version nueva se baja por detras.
// Cuando de verdad hay una version distinta, el SW se lo dice a la pagina y
// la pagina ofrece actualizar con un boton. Nadie espera 1.27 MB para ver
// lo que ya tiene.

var CACHE = 'mecca-v9';
var PAGINA = 'pagina-principal';

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

/* Le dice a todas las pestañas abiertas que version acaba de guardarse.
   La pagina compara con la suya y decide si ofrece actualizar. */
function avisarVersion(texto) {
  var m = /APP_VERSION\s*=\s*'([^']+)'/.exec(texto || '');
  if (!m) return;
  clients.matchAll({ type: 'window' }).then(function(cs) {
    cs.forEach(function(c) { c.postMessage({ tipo: 'version', version: m[1] }); });
  });
}

self.addEventListener('fetch', function(e) {
  var req = e.request;

  // La pagina principal: lo guardado primero, la actualizacion por detras.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE).then(function(c) {
        return c.match(PAGINA).then(function(guardado) {
          var red = fetch(req, { cache: 'no-cache' }).then(function(res) {
            if (res && res.status === 200) {
              var copia = res.clone();
              c.put(PAGINA, res.clone());
              // solo avisamos si ya habia algo antes: en la primera carga no
              if (guardado) copia.text().then(avisarVersion).catch(function(){});
            }
            return res;
          }).catch(function() { return guardado; });

          // Si hay copia guardada sale YA y la red sigue por detras.
          if (guardado) { e.waitUntil(red); return guardado; }
          return red;
        });
      })
    );
    return;
  }

  // Recursos externos (fuentes, librerias): guardado con respaldo de red
  e.respondWith(
    caches.match(req).then(function(cached) {
      var network = fetch(req).then(function(res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); });
        }
        return res;
      });
      return cached || network;
    })
  );
});

/* La pagina puede pedir que se baje la version nueva ahora mismo. */
self.addEventListener('message', function(e) {
  if (!e.data || e.data.tipo !== 'buscar-version') return;
  caches.open(CACHE).then(function(c) {
    fetch('./index.html', { cache: 'no-cache' }).then(function(res) {
      if (!res || res.status !== 200) return;
      var copia = res.clone();
      c.put(PAGINA, res);
      copia.text().then(avisarVersion).catch(function(){});
    }).catch(function(){});
  });
});
