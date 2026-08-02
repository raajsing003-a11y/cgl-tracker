// CGL Tracker — Service Worker
// Cache version bump karo jab bhi naya deploy karna ho (purana cache force-clear karega)
const CACHE_VERSION = 'v' + Date.now(); // build ke time unique version, hamesha fresh deploy force karega
const CACHE_NAME = 'cgl-tracker-' + CACHE_VERSION;

// Yahan apni core files add karo (jo offline bhi chahiye)
const CORE_ASSETS = [
  './',
  './index.html'
];

// INSTALL — naya cache banao, core assets pre-cache karo
self.addEventListener('install', (event) => {
  self.skipWaiting(); // naye SW ko turant activate hone do, wait mat karo
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('Pre-cache failed for some assets:', err);
      });
    })
  );
});

// ACTIVATE — saare purane caches delete karo
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim()) // turant sab open tabs control mein le lo
  );
});

// FETCH — network-first strategy (hamesha latest try karo, fail ho toh cache se do)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('./index.html');
        });
      })
  );
});

// Naye SW ko turant activate karne ke liye message listener (optional manual trigger)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
