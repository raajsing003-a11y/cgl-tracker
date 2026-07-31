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
// Bumped v6 -> v7: the auto-scroll engine in Reading Mode was rewritten
// from continuous pixel-scroll to paragraph-level timer-based snap
// scrolling (app.js's renderGkBlock/renderGkBlocks now tag every
// paragraph with data-ridx/data-ms, and the whole auto-scroll section was
// replaced; index.html gained the gkReadProgressBar markup/CSS). Old v6
// cache would keep serving the old continuous-scroll app.js/index.html
// with no progress bar, so it must be evicted too.
//
// Bumped v7 -> v8: gk_geography.json and gk_science.json were restructured
// — several chapters that had multiple TOC-level topics merged into a
// single chapter were split apart (Geography: 11 -> 16 chapters; Science
// Physics section: 5 -> 8 chapters). Chapter ids/counts changed, so old v7
// cache would keep serving the old merged chapter list, so it must be
// evicted too.
//
// Bumped v8 -> v9: the "Test Your Knowledge" auto-flashcard generator in
// app.js was fixed — table-based cards had a Romanized/mixed-language
// question ("... kya hai?"), now pure Hindi ("... क्या है?"); and the
// cloze question-word picker gained a keyword-triggered map (स्थापना,
// युद्ध, उद्गम, मुख्यालय, नारा, उपाधि, अनुच्छेद, आदि) so blanks read like
// real SSC static-GK questions instead of a generic "क्या था/थी?". Old
// v8 cache would keep serving the buggy/generic flashcard logic, so it
// must be evicted too.
//
// Bumped v9 -> v10: fixed a flashcard bug where clicking Next/Prev while
// a card was flipped showed the new card's answer immediately — the CSS
// 3D-flip transition was animating the old "flipped" state back to front
// at the same time the new card's text was set, so the back face briefly
// showed through. renderTykCard() now force-resets the flip with
// transitions disabled (a .noAnim class + reflow) before filling in the
// next card. Old v9 cache would keep serving the buggy flip-carry-over
// behaviour, so it must be evicted too.
//
// Bumped v10 -> v11: the "Test Your Knowledge" auto-flashcard feature was
// removed entirely (button, overlay markup, CSS, and all JS) per request.
// Old v10 cache would keep serving the old index.html/app.js with the
// flashcard button and overlay still present, so it must be evicted too.
// Bumped v11 -> v12: added the "English Full Mocks (CPO/CGL)" feature —
// new data/topics/englishfullmock.json + data/index.json entry
// (ENGLISHFULLMOCK_SETS), new index.html menu/exam/result markup, and new
// app.js quiz engine (makeEnglishFullMockQuiz). Old v11 cache would keep
// serving the old index.html/app.js/index.json without this feature, so
// it must be evicted too.
const CACHE_NAME = 'exam-tracker-v12';

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
