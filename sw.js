// Exam Tracker service worker — caches the app shell + quiz data so repeat
// opens load almost instantly instead of re-downloading everything.
//
// Strategy: "stale-while-revalidate" for same-origin static assets
// (index.html, app.js, the quiz data bundle, manifest, icons):
//   1. If a cached copy exists, serve it immediately (instant load).
//   2. In the background, fetch the latest version from the network and
//      store it in the cache for the *next* time the app opens.
// This means you always see something instantly, and you're never more
// than one app-open behind the latest version — no permanently-stale data.
//
// Anything cross-origin (Firebase, APIs, etc.) is left alone (network only)
// so live data/sync behaviour is unaffected.

// Bumped v1 -> v2: the lazy-load rewrite changed which files exist (new
// data/index.json + data/topics/*.json, restructured data/loader.js) and
// removed old ones (all-quiz-data.json, english_mock_sets.json,
// english_topicwise_sets.json). Anyone with the old v1 cache MUST get it
// evicted (see activate handler below) or they'd keep being served a stale
// mix of old-and-new files — which is exactly what caused broken/slow
// loads after this rewrite shipped. Bump this version string again any
// time file paths change in a future update.
//
// Bumped v2 -> v3: gk_modernhistory.json got its real English content
// (blocksEn/titleEn were previously Hindi placeholders), and index.html
// changed (GK reader header + floating font buttons restructured). Old v2
// cache would keep serving the stale Hindi-as-English data and old header
// markup, so it must be evicted too.
//
// Bumped v3 -> v4: added Auto-Scroll to Reading Mode (app.js gained the
// auto-scroll engine, index.html gained the FAB markup/CSS). Old v3 cache
// would keep serving the pre-auto-scroll app.js/index.html, so it must be
// evicted too.
//
// Bumped v5 -> v6: gk_polity.json got corrected English content for
// chapters 12-23 (blocksEn was previously a Hindi duplicate), and
// gk_science.json got real English content for all 15 chapters (blocksEn
// was previously a Hindi duplicate too). Old v5 cache would keep serving
// the stale Hindi-as-English data, so it must be evicted too.
const CACHE_NAME = 'exam-tracker-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests for our own origin — everything else
  // (Firebase, other APIs, cross-origin requests) goes straight to network.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);

      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => cached); // offline fallback: use whatever was cached

      // Serve cached copy instantly if we have one; otherwise wait on network.
      return cached || networkFetch;
    })
  );
});
