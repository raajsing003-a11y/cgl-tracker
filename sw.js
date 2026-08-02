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
// Bumped v12 -> v13: added the "Super Practice" feature — 660 pre-built
// standalone mock-test HTML files under superpractice/<subject>/mock_NNN.html
// (subject menu -> mock list -> iframe player), new index.html menu/pages,
// new app.js module (initSuperPracticeQuiz). These mock files are NOT
// precached (runtime stale-while-revalidate only, same as everything else)
// so this bump does not bloat the install step. Old v12 cache would keep
// serving the pre-Super-Practice index.html/app.js, so it must be evicted.
// Bumped v13 -> v14: Super Practice mocks now show topic-based names
// (e.g. "Trigonometry #2", "Analogy #1") instead of generic "Mock N" —
// manifest.json gained topic/label fields (auto-detected from each mock's
// question text via keyword matching), and a topic search box was added
// to the mock list page. Old v13 cache would keep serving generic
// "Mock N" names, so it must be evicted.
// Bumped v14 -> v15: all 660 Super Practice mock files were patched so
// answering a question now reveals correct/wrong + the solution INSTANTLY
// (quiz mode) instead of only after the final "Submit Test" — each mock's
// own TestApp class gained a per-question this.revealed[] flag alongside
// the existing this.sub (whole-test-submitted) flag; loadOpts()/loadQ()/
// selOpt() now check (this.sub || this.revealed[qIdx]) everywhere they
// used to check this.sub alone. Old v14 cache would keep serving mocks
// that only reveal answers after final submit, so it must be evicted.
// Bumped v15 -> v16: Mains Mock (Sectional + Full) converted from the old
// iframe-per-mock pattern to a native Testbook-style player, same as Super
// Practice/EM Mocks — pre-extracted JSON at mainsmock/data/<sectional|full>/
// mock_NNN.json, new calcPage-mmnative* pages in index.html, new app.js
// module (openMainsMockNative/initMainsMockNative). Old v15 cache would
// keep serving the old iframe player, so it must be evicted.
// Bumped v16 -> v17: 75 Day Practice (Quant/English/GK/Reasoning, 384 mocks)
// converted from the old iframe-per-mock pattern to a native Testbook-style
// player, same as Mains Mock/Super Practice/EM Mocks — pre-extracted JSON at
// practice75/data/<subject>/mock_NNN.json, new calcPage-p75native* pages in
// index.html, new app.js module (openP75MockNative/initP75Native). Old v16
// cache would keep serving the old iframe player, so it must be evicted.
// Bumped v20 -> v21: plain version bump, no feature change.
// Bumped v21 -> v22: app-wide dark mode is now the default (was light).
// Mock/quiz-taking screens (Reasoning Mock, Super Practice, 75-Day
// Practice, Mains Mock, EM Mock, Math PYQ) are force-pinned to light
// regardless of the app theme; English Mock/English Full Mock and the
// English/GK subjects inside the shared Super Practice + 75-Day Practice
// native players stay dark. Old v21 cache would keep serving the
// light-default index.html/app.js, so it must be evicted.
// Bumped v22 -> v23: Super Practice quant "Mixed Practice" mocks now run
// in mock-mode (fixed 15-min timer, answers revealed only after Submit,
// not instantly per question); Computer subject inside Super Practice is
// now pinned dark (joining English/GK); and every light-theme mock/exam
// screen (Reasoning Mock, Mains Mock, EM Mock, Math PYQ, and Super
// Practice/75-Day Practice pages when not on a dark-pinned subject) now
// takes over the full screen on pure white with the app topbar/tabbar
// hidden. Old v22 cache would keep serving the old instant-reveal Mixed
// Practice, light Computer subject, and non-fullscreen mock layout.
// Bumped v23 -> v24: Quant sectional mocks rebuilt across all three quiz
// engines. 75-Day Practice: removed 79 old single-chapter 25-Q "sectional"
// mocks (superpractice/practice75 manifest.json + data/quant/mock_NNN.json);
// all 2919 75-Day Practice Quant questions + all 3940 Super Practice Quant
// questions were pooled and redistributed round-robin into new
// multi-chapter "Sectional Mock" sets (25 Qs each, every chapter
// represented, no single-chapter mocks) — 117 new sets for 75-Day Practice
// (mock_140..mock_256), 158 new sets for Super Practice (mock_197..
// mock_354). data/topics/math_p75.json (P75_MATH_SETS) and
// data/topics/math_sp.json (SP_MATH_SETS) were regenerated from this same
// mixed data (p75mock001..117, spmock001..158), and the Math Mock menu's
// "75-Day Practice" source card (previously disabled/hidden) is now
// re-enabled alongside Concept Mock and Super Practice. Old v23 cache
// would keep serving the old single-chapter sectionals, the stale
// chapter-pure P75_MATH_SETS, and the hidden 75-Day Practice source card,
// so it must be evicted.
// Bumped v24 -> v25: Super Practice (Computer/GK/Reasoning/English/Math)
// and 75 Days Practice (Reasoning/English) content was rebuilt — new/renamed
// mock_*.json files, corrected chapter/type titles, and manifest.json
// changes in superpractice/ and practice75/. Old v24 cache would keep
// serving the stale mock files and manifest, so it must be evicted too.
const CACHE_NAME = 'exam-tracker-v25';

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
