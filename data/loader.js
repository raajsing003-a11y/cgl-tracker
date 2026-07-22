// Lazy data loader (true lazy loading version).
//
// Old behaviour: fetched all-quiz-data.json + english_topicwise_sets.json +
// english_mock_sets.json (~12MB combined) *before* app.js even started, so
// the whole question bank sat in memory before the menu ever painted.
//
// New behaviour:
//   1. Fetch ONLY data/index.json — a tiny {topicName: {file, sets:{key:count}}}
//      map (~15KB). This is enough to render every menu (topic names + Qs
//      counts) instantly.
//   2. For every topic name in the index (VOCAB_SETS, MATH_PYQ_SETS, ...),
//      create window.<TOPIC_NAME> as a plain object whose keys are the set
//      keys (set1, set2, ...), each holding a placeholder Array whose
//      .length already equals the real question count. app.js reads
//      Object.keys(SETS) / SETS[key].length for menus — both already work
//      correctly against these placeholders, so app.js needs *no* changes
//      for menu rendering.
//   3. The *contents* of a topic's arrays (the actual question objects) are
//      only fetched from data/topics/<slug>.json the first time that topic
//      is actually opened, via window.ensureTopicReady(SETS) — added at
//      each quiz's startQuiz()/startExamQuiz() in app.js. Once fetched, the
//      real questions are spliced into the SAME placeholder array objects
//      (so every existing reference to SETS[key] updates automatically —
//      no re-render/rebuild needed elsewhere) and the topic is marked
//      loaded, so a second visit reuses the in-memory copy (no re-fetch).

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
  // callers (e.g. rapid double-tap) share the same in-flight Promise.
  window.ensureTopicLoaded = function (topicName) {
    if (!topicName) return Promise.resolve();
    if (window.__topicLoaded[topicName]) return Promise.resolve();
    if (window.__topicLoadPromises[topicName]) return window.__topicLoadPromises[topicName];
    const topic = window.__topicIndex && window.__topicIndex.topics[topicName];
    if (!topic) return Promise.resolve(); // unknown topic id — nothing to do
    beginTopicLoadingUI();
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
        endTopicLoadingUI();
        delete window.__topicLoadPromises[topicName];
      });
    window.__topicLoadPromises[topicName] = p;
    return p;
  };

  // Convenience wrapper for app.js call sites: awaits the load and turns a
  // failure into a friendly alert + `false` return instead of an uncaught
  // rejection, so a flaky connection can't leave the quiz half-started.
  window.ensureTopicReady = async function (SETS) {
    const topicId = SETS && SETS.__topicId;
    if (!topicId) return true;
    try {
      await window.ensureTopicLoaded(topicId);
      return true;
    } catch (err) {
      console.error('Topic load failed:', topicId, err);
      alert('Questions load nahi ho paaye. Internet check karke dobara try karein.');
      return false;
    }
  };

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
      return loadAppScript();
    })
    .then(hideOverlay)
    .catch(showError);
})();
