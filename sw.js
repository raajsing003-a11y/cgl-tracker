// CGL Tracker — Service Worker (v3 — FASTEST UPDATE MODE)
// Har fetch network se pehle try hota hai, cache sirf OFFLINE fallback ke liye hai.
// Naya deploy karte hi (chahe 1 line change ho), users ko turant milega.

const CACHE_VERSION = 'v' + Date.now();
const CACHE_NAME = 'cgl-tracker-' + CACHE_VERSION;

// Sirf offline-fallback ke liye — install ke time kuch bhi force pre-cache nahi karte,
// isse install kabhi fail/slow nahi hoga aur SW turant activate ho jaayega.
const CORE_ASSETS = ['./', './index.html'];

// ---------- INSTALL ----------
self.addEventListener('install', (event) => {
  self.skipWaiting(); // wait mat karo, turant naya SW le lo
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CORE_ASSETS.map((url) => cache.add(url).catch(() => {}))
      )
    )
  );
});

// ---------- ACTIVATE ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key)))) // SAARA purana cache saaf
      .then(() => self.clients.claim())
      .then(() => {
        // Sabhi open tabs ko turant signal bhejo taaki latest version dikhe
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// ---------- FETCH ----------
// Pure network-first: hamesha fresh file lao. Cache sirf tab use hota hai
// jab internet na ho (offline fallback), taaki purani/stale file kabhi na dikhe.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req, { cache: 'no-store' }) // browser ka apna HTTP cache bhi bypass karo
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return response;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});

// ---------- MANUAL TRIGGER ----------
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
