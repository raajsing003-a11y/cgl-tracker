// BUILD 20261021-2330 (AI Modes Part 2b)
// CGL Tracker — Service Worker (v3 — FASTEST UPDATE MODE)
// Har fetch network se pehle try hota hai, cache sirf OFFLINE fallback ke liye hai.
// Naya deploy karte hi (chahe 1 line change ho), users ko turant milega.

const CACHE_VERSION = 'v20261104-swipe-nav';
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
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))) // SAARA purana cache saaf
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
// FAST MODE (v4):
//  - Doosre sites (Firebase, gstatic, CDN) ko SW chhedta hi nahi (pehle har request SW se guzarti thi + cache me copy hoti thi).
//  - index.html / navigation: network-first, par 4s me jawab na aaye to cache turant (slow net par app hang nahi hoga).
//  - Baaki apni files (js/css/json/tools): stale-while-revalidate — cache se TURANT, peeche se fresh laakar cache update.
//  - Har deploy par CACHE_VERSION badalta hai => purana cache saaf => pehli baar naya hi aata hai.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range') || /\.mp4(\?|$)/i.test(req.url)) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // cross-origin: browser khud sambhale

  const isDoc = req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname) || /sw\.js$|manifest\.json$/.test(url.pathname);

  if (isDoc){
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const net = fetch(req, { cache: 'no-cache' }).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; });
      const cached = await cache.match(req) || await cache.match('./index.html');
      if (!cached) return net.catch(() => Response.error());
      return Promise.race([net, new Promise((r) => setTimeout(() => r(cached), 4000))]).catch(() => cached);
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const refresh = fetch(req, { cache: 'no-cache' }).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    if (cached) { event.waitUntil(refresh.catch(() => {})); return cached; }
    return refresh.catch(() => caches.match('./index.html'));
  })());
});

// ---------- MANUAL TRIGGER ----------
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
