// Instant-start + quiet-background data loader.
//
// 1. Fetch ONLY data/index.json (tiny) → install placeholders → load
//    app.js IMMEDIATELY. Menu paints as fast as possible, no blocking
//    overlay/progress bar for the question data.
// 2. Right after app.js is running, silently start fetching every
//    data/topics/<slug>.json in the background (a few at a time, so it
//    doesn't hog the connection), filling in the real questions as each
//    one arrives. No spinner, no popup — user never sees this happening.
// 3. If the user opens a quiz whose topic hasn't finished background-
//    loading yet, `ensureTopicReady` (called by app.js at every
//    startQuiz()/startExamQuiz()) joins that SAME in-flight fetch (no
//    duplicate request) and shows a short "Loading questions..." spinner
//    only for that one topic until it lands.

(function () {
  const INDEX_URL = './data/index.json';

  const overlay = document.getElementById('__dataLoadOverlay');
  const bar = document.getElementById('__dataLoadBar');
  const label = document.getElementById('__dataLoadLabel');

  function setProgress(pct, text) {
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (label) label.textContent = text;
  }

  function showOverlay(text) {
    if (!overlay) return;
    overlay.style.display = '';
    overlay.style.opacity = '1';
    setProgress(0, text || 'Loading...');
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 250);
  }

  function showError(err) {
    console.error(err);
    if (label) {
      label.textContent = 'Loading failed. Please check your connection and reload.';
      label.style.color = '#ff6b6b';
    }
  }

  // ---- Small always-on "loading a topic" indicator (reuses the same
  // overlay markup as the startup loader, just with a shorter label and no
  // progress bar animation since per-topic files are small). ----
  let activeTopicLoads = 0;
  function beginTopicLoadingUI() {
    activeTopicLoads++;
    showOverlay('Loading questions...');
    setProgress(60, 'Loading questions...');
  }
  function endTopicLoadingUI() {
    activeTopicLoads = Math.max(0, activeTopicLoads - 1);
    if (activeTopicLoads === 0) hideOverlay();
  }

  window.__topicIndex = null;       // parsed data/index.json
  window.__topicLoaded = {};        // topicName -> true once real data is in memory
  window.__topicLoadPromises = {};  // topicName -> in-flight Promise
  window.__topicPostFill = {};      // topicName -> extra fill-in hook (registered by app.js for chunked topics)

  // Creates window[topicName] = { setKey: PlaceholderArray(count), ... }
  // with a hidden (non-enumerable) __topicId so app.js can find its way
  // back to data/index.json without needing the topic name threaded through
  // every function signature.
  function installPlaceholders(indexData) {
    Object.keys(indexData.topics).forEach((topicName) => {
      const topic = indexData.topics[topicName];
      const obj = {};
      Object.defineProperty(obj, '__topicId', { value: topicName, enumerable: false, configurable: true });
      Object.keys(topic.sets).forEach((setKey) => {
        obj[setKey] = new Array(topic.sets[setKey]);
      });
      window[topicName] = obj;
    });
  }

  // Splices real question data into the existing placeholder arrays *in
  // place* (never replaces the object/array references) so every closure
  // in app.js that already captured `SETS` or `SETS[key]` sees the update.
  function fillTopicData(topicName, data) {
    Object.keys(data).forEach((setName) => {
      const target = window[setName];
      if (!target) return;
      const realSets = data[setName];
      Object.keys(realSets).forEach((setKey) => {
        const real = realSets[setKey] || [];
        let arr = target[setKey];
        if (!Array.isArray(arr)) { arr = []; target[setKey] = arr; }
        arr.length = 0;
        Array.prototype.push.apply(arr, real);
      });
    });
    if (typeof window.__topicPostFill[topicName] === 'function') {
      window.__topicPostFill[topicName]();
    }
  }

  // Fetches + fills a topic's real question data exactly once; concurrent
  // callers (background prefetch + a user tapping the same topic, or rapid
  // double-tap) all share the same in-flight Promise — never a duplicate
  // request. No UI here on purpose: this is called silently by the
  // background prefetcher AND by ensureTopicReady, so the UI decision
  // belongs to the caller, not this function.
  window.ensureTopicLoaded = function (topicName) {
    if (!topicName) return Promise.resolve();
    if (window.__topicLoaded[topicName]) return Promise.resolve();
    if (window.__topicLoadPromises[topicName]) return window.__topicLoadPromises[topicName];
    const topic = window.__topicIndex && window.__topicIndex.topics[topicName];
    if (!topic) return Promise.resolve(); // unknown topic id — nothing to do
    const p = fetch(topic.file, { cache: 'default' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load ' + topic.file + ': ' + res.status);
        return res.json();
      })
      .then((data) => {
        fillTopicData(topicName, data);
        window.__topicLoaded[topicName] = true;
      })
      .finally(() => {
        delete window.__topicLoadPromises[topicName];
      });
    window.__topicLoadPromises[topicName] = p;
    return p;
  };

  // Convenience wrapper for app.js call sites: shows a spinner ONLY if the
  // topic isn't already sitting in memory (i.e. background prefetch hasn't
  // reached it yet), awaits the load, and turns a failure into a friendly
  // alert + `false` return instead of an uncaught rejection, so a flaky
  // connection can't leave the quiz half-started.
  window.ensureTopicReady = async function (SETS) {
    const topicId = SETS && SETS.__topicId;
    if (!topicId) return true;
    if (window.__topicLoaded[topicId]) return true; // already there — instant, no spinner
    beginTopicLoadingUI();
    try {
      await window.ensureTopicLoaded(topicId);
      return true;
    } catch (err) {
      console.error('Topic load failed:', topicId, err);
      alert('Questions load nahi ho paaye. Internet check karke dobara try karein.');
      return false;
    } finally {
      endTopicLoadingUI();
    }
  };

  // Background prefetch: works through every topic a few at a time so it
  // doesn't compete too hard with anything the user is actively doing.
  // Runs silently — no overlay, no progress bar. If the user opens a topic
  // before this loop reaches it, ensureTopicReady() above grabs it out of
  // turn via the shared __topicLoadPromises map, so nothing is fetched
  // twice and nothing is delayed by this loop.
  function backgroundPrefetchAll(indexData, concurrency) {
    const queue = Object.keys(indexData.topics);
    let i = 0;
    function next() {
      if (i >= queue.length) return Promise.resolve();
      const topicName = queue[i++];
      return window.ensureTopicLoaded(topicName).catch(() => {}).then(next);
    }
    const workers = [];
    for (let w = 0; w < concurrency; w++) workers.push(next());
    return Promise.all(workers);
  }

  function loadAppScript() {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = './app.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load app.js'));
      document.body.appendChild(s);
    });
  }

  showOverlay('Loading...');
  fetch(INDEX_URL, { cache: 'default' })
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load ' + INDEX_URL + ': ' + res.status);
      return res.json();
    })
    .then((indexData) => {
      window.__topicIndex = indexData;
      installPlaceholders(indexData);
      // Start app.js right away — menus render instantly off the
      // placeholders (correct names + question counts already).
      return loadAppScript().then(() => indexData);
    })
    .then((indexData) => {
      hideOverlay();
      // Now, quietly, fetch every topic's real questions in the
      // background so quizzes are ready to tap into by the time the user
      // gets to them. 4 at a time keeps this gentle on mobile data.
      backgroundPrefetchAll(indexData, 4);
    })
    .catch(showError);
})();
