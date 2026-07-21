// Loads the quiz question bank as real JSON (fetch + JSON.parse) instead of
// giant inline <script> files. This is faster for two reasons:
//   1. JSON.parse is significantly faster than the JS engine parsing +
//      compiling an equivalent object literal as "code".
//   2. The three files download in parallel (fetch) instead of one after
//      another as blocking <script> tags, and we can show real progress
//      instead of a blank/frozen screen.
// Once all three are parsed, each top-level key is assigned onto `window`
// (e.g. window.VOCAB_SETS, window.ENGLISH_TOPICWISE_SETS, ...) so the rest
// of app.js works exactly as before — no changes needed there.

(function () {
  const files = [
    { url: './data/all-quiz-data.json', weight: 10 },
    { url: './data/english_topicwise_sets.json', weight: 1 },
    { url: './data/english_mock_sets.json', weight: 1 },
  ];

  const overlay = document.getElementById('__dataLoadOverlay');
  const bar = document.getElementById('__dataLoadBar');
  const label = document.getElementById('__dataLoadLabel');
  const totalWeight = files.reduce((s, f) => s + f.weight, 0);
  const loaded = new Array(files.length).fill(0);

  function updateProgress() {
    if (!bar) return;
    const done = loaded.reduce((s, v, i) => s + v * files[i].weight, 0);
    const pct = Math.min(100, Math.round((done / totalWeight) * 100));
    bar.style.width = pct + '%';
    if (label) label.textContent = 'Loading question bank... ' + pct + '%';
  }

  async function fetchJsonWithProgress(url, index) {
    const res = await fetch(url, { cache: 'default' });
    if (!res.ok) throw new Error('Failed to load ' + url + ': ' + res.status);

    const contentLength = +res.headers.get('Content-Length');
    if (!res.body || !contentLength) {
      // Streaming progress isn't available (e.g. no Content-Length) —
      // just fall back to a normal parse with no interim progress.
      const data = await res.json();
      loaded[index] = 1;
      updateProgress();
      return data;
    }

    const reader = res.body.getReader();
    let received = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      loaded[index] = received / contentLength;
      updateProgress();
    }
    const blob = new Blob(chunks);
    const text = await blob.text();
    loaded[index] = 1;
    updateProgress();
    return JSON.parse(text);
  }

  function applyData(obj) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        window[key] = obj[key];
      }
    }
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

  function hideOverlay() {
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 250);
  }

  function showError(err) {
    console.error(err);
    if (label) {
      label.textContent = 'Loading failed. Please check your connection and reload.';
      label.style.color = '#ff6b6b';
    }
  }

  Promise.all(files.map((f, i) => fetchJsonWithProgress(f.url, i)))
    .then((results) => {
      results.forEach(applyData);
      return loadAppScript();
    })
    .then(hideOverlay)
    .catch(showError);
})();
