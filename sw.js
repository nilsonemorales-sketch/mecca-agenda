// Mecca Agenda — Service Worker
// Network-first para la página principal: siempre carga fresh del servidor.

var CACHE = 'mecca-v1';

self.addEventListener('install', function(e) {
  self.skipWaiting(); // Activa inmediatamente sin esperar reload
});

self.addEventListener('activate', function(e) {
  // Borra caches viejos al activar nueva versión
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;

  // Navegación (el HTML principal): SIEMPRE red, nunca caché
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).catch(function() {
        return caches.match(req); // offline fallback
      })
    );
    return;
  }

  // Recursos externos (fonts, CDN libs): caché con fallback a red
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
