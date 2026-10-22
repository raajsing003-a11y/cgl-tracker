#!/usr/bin/env python3
import re, sys
ROOT = '/home/claude/work/CGLY/'

# ============================================================== app.js
s = open(ROOT + 'app.js', newline='').read()
NL = '\r\n'

def rep(old, new, count=1):
    global s
    c = s.count(old)
    assert c == count, ('count mismatch', c, count, old[:90])
    s = s.replace(old, new)

def cut(start, end, keep_end=True):
    """remove text from start marker up to (not incl.) end marker"""
    global s
    assert s.count(start) == 1, ('start', s.count(start), start[:60])
    i = s.index(start)
    j = s.index(end, i)
    s = s[:i] + s[j:]

# ---- 1. remove GK-only code from Super Practice (subject order / parser / grouper / renderer / state)
cut("// GK 'topic' strings are \"Subject: Subtopic\"", "function groupSPEntries(entries){")
rep("let spOpenGKSubject = null;  // currently expanded GK subject, or null" + NL +
    "let spOpenGKSubtopic = null; // currently expanded GK subtopic, or null" + NL, "")
cut("function renderSPMockGridGK(entries){", "function renderSPMockGrid(entries){")
rep("  if(spCurrentSubjectKey === 'gk'){ renderSPMockGridGK(entries); return; }" + NL, "")
rep("  spOpenGKSubject = null;" + NL + "  spOpenGKSubtopic = null;" + NL, "")
rep("spOpenChapter = null; spOpenGKSubject = null; spOpenGKSubtopic = null;", "spOpenChapter = null;")
# filter branch for gk
i = s.index("  if(spCurrentSubjectKey === 'gk'){" + NL + "    const subjects = groupGKEntries(filtered);")
j = s.index("    return;" + NL + "  }" + NL, i) + len("    return;" + NL + "  }" + NL)
s = s[:i] + s[j:]

# ---- 2. remove GK subject from Super Practice + 75 Day Practice menus
rep("  { key:'gk',        label:'GK / General Awareness',   icon:'🌍', count:169 }," + NL, "")
rep("  { key:'gk',        label:'GK / General Awareness',   icon:'🌍', count:130 }," + NL, "")

# ---- 3. engines read GK data from the merged gkquiz/ folder
rep("else{ const res = await fetch('superpractice/data/' + key + '/' + jsonFile); data = await res.json(); }",
    "else{ const res = await fetch(key === 'gk' ? ('gkquiz/sp/' + jsonFile) : ('superpractice/data/' + key + '/' + jsonFile)); data = await res.json(); }")
rep("const res = await fetch('practice75/data/' + key + '/' + jsonFile);",
    "const res = await fetch(key === 'gk' ? ('gkquiz/p75/' + jsonFile) : ('practice75/data/' + key + '/' + jsonFile));")

# ---- 4. back-navigation: GK sessions return to GK Quiz page (or GK Reader), others unchanged
rep("    alert('Ye mock load nahi ho paaya. Dobara try karein.');" + NL + "    showCalcPage('superpracticelist');",
    "    alert('Ye mock load nahi ho paaya. Dobara try karein.');" + NL + "    showCalcPage(spBackPage());")
rep("    alert('Ye mock abhi available nahi hai.');" + NL + "    showCalcPage('superpracticelist');",
    "    alert('Ye mock abhi available nahi hai.');" + NL + "    showCalcPage(spBackPage());")
rep("if(infoBackBtn) infoBackBtn.addEventListener('click', () => showCalcPage('superpracticelist'));",
    "if(infoBackBtn) infoBackBtn.addEventListener('click', () => showCalcPage(spBackPage()));")
rep("spnativeStopTimer(); showCalcPage('superpracticelist');", "spnativeStopTimer(); showCalcPage(spBackPage());")
rep("if(resultBackBtn) resultBackBtn.addEventListener('click', () => showCalcPage('superpracticelist'));",
    "if(resultBackBtn) resultBackBtn.addEventListener('click', () => showCalcPage(spBackPage()));")

rep("    alert('Ye mock load nahi ho paaya. Dobara try karein.');" + NL + "    showCalcPage('75daylist');",
    "    alert('Ye mock load nahi ho paaya. Dobara try karein.');" + NL + "    showCalcPage(p75BackPage());")
rep("    alert('Ye mock abhi available nahi hai.');" + NL + "    showCalcPage('75daylist');",
    "    alert('Ye mock abhi available nahi hai.');" + NL + "    showCalcPage(p75BackPage());")
rep("if(infoBackBtn) infoBackBtn.addEventListener('click', () => showCalcPage('75daylist'));",
    "if(infoBackBtn) infoBackBtn.addEventListener('click', () => showCalcPage(p75BackPage()));")
rep("p75nativeStopTimer(); showCalcPage('75daylist');", "p75nativeStopTimer(); showCalcPage(p75BackPage());")
rep("if(resultBackBtn) resultBackBtn.addEventListener('click', () => showCalcPage('75daylist'));",
    "if(resultBackBtn) resultBackBtn.addEventListener('click', () => showCalcPage(p75BackPage()));")

# ---- 5. GK Reader auto-quiz linker now reads the merged manifest
rep("window.gkP75ManifestPromise = fetch('practice75/manifest.json').then(r => r.json())" + NL +
    "      .then(d => { window.GK_P75_MANIFEST = d.gk || []; return window.GK_P75_MANIFEST; })",
    "window.gkP75ManifestPromise = fetch('gkquiz/manifest.json').then(r => r.json())" + NL +
    "      .then(d => { window.GK_P75_MANIFEST = d.p75 || []; return window.GK_P75_MANIFEST; })")
rep("window.gkSPManifestPromise = fetch('superpractice/manifest.json').then(r => r.json())" + NL +
    "      .then(d => { window.GK_SP_MANIFEST = d.gk || []; return window.GK_SP_MANIFEST; })",
    "window.gkSPManifestPromise = fetch('gkquiz/manifest.json').then(r => r.json())" + NL +
    "      .then(d => { window.GK_SP_MANIFEST = d.sp || []; return window.GK_SP_MANIFEST; })")
rep("        const m = all[+el.dataset.idx];" + NL,
    "        const m = all[+el.dataset.idx];" + NL + "        gkQuizReturnPage = 'gkreader';" + NL)

# ---- 6. helpers + GK Quiz page (new code, inserted right before initP75Quiz)
NEW = r'''
// ===== GK Quiz (Topic-wise) — Super Practice GK + 75 Day Practice GK, merged =====
// Data: gkquiz/manifest.json  ->  { subjects:[{subject,icon,mocks,q,topics:[{topic,quizzes:[
//   {src:'sp'|'p75', file, q, label, otopic, n}]}]}], sp:[...flat], p75:[...flat] }
// JSON: gkquiz/sp/*.json (ex-Super Practice) and gkquiz/p75/*.json (ex-75 Day Practice).
// Har quiz apne ORIGINAL native engine par hi chalta hai (sp -> openSPMock, p75 -> openP75Mock),
// isliye Hindi/English toggle, formatting, solutions aur purane ✅ attempted marks bilkul same rehte hain.
let gkQuizReturnPage = 'gkquiz'; // result/back par kahan jaana hai: 'gkquiz' ya 'gkreader'
function spBackPage(){ return spnativeCurrentKey === 'gk' ? gkQuizReturnPage : 'superpracticelist'; }
function p75BackPage(){ return p75nativeCurrentKey === 'gk' ? gkQuizReturnPage : '75daylist'; }

let gkQuizManifest = null;
let gkQuizOpenSubject = null;
let gkQuizOpenTopic = null;
let gkQuizQuery = '';

async function ensureGkQuizManifest(){
  if(gkQuizManifest) return gkQuizManifest;
  try{
    const res = await fetch('gkquiz/manifest.json');
    gkQuizManifest = await res.json();
  }catch(e){ gkQuizManifest = null; }
  return gkQuizManifest;
}

// Row label: SP "Test" quizzes get numbered (Test 1, Test 2...), PYQ and 75-Day labels stay as they are.
function gkQuizLabels(topicObj){
  let t = 0;
  return topicObj.quizzes.map(it => {
    if(it.src === 'sp' && it.label === 'Test'){ t++; return 'Test ' + t; }
    return it.label || ('Quiz ' + it.n);
  });
}

function gkQuizOpen(it, topicName, label){
  gkQuizReturnPage = 'gkquiz';
  const entry = { n: it.n, q: it.q, file: it.file, topic: it.otopic, label: label };
  if(it.src === 'p75') openP75Mock('gk', it.file, topicName, entry);
  else openSPMock('gk', it.file, topicName, entry);
}

function gkQuizRender(){
  const grid = document.getElementById('gkQuizListGrid');
  const sum = document.getElementById('gkQuizSummary');
  if(!grid) return;
  grid.innerHTML = '';
  const man = gkQuizManifest;
  if(!man || !man.subjects){
    grid.innerHTML = '<div class="losshint">GK Quiz data load nahi ho paaya. Internet check karke dobara try karein.</div>';
    if(sum) sum.textContent = '';
    return;
  }
  const q = (gkQuizQuery || '').trim().toLowerCase();
  let shownMocks = 0, shownQs = 0, shownSubjects = 0;
  man.subjects.forEach(subj => {
    // search: subject / topic / quiz label / original topic
    const subjHit = q && subj.subject.toLowerCase().includes(q);
    const topics = [];
    subj.topics.forEach(tp => {
      const labels = gkQuizLabels(tp);
      const topicHit = q && tp.topic.toLowerCase().includes(q);
      const rows = [];
      tp.quizzes.forEach((it, i) => {
        const hit = !q || subjHit || topicHit || labels[i].toLowerCase().includes(q) || (it.otopic || '').toLowerCase().includes(q);
        if(hit) rows.push({ it: it, label: labels[i] });
      });
      if(rows.length) topics.push({ topic: tp.topic, rows: rows });
    });
    if(!topics.length) return;
    shownSubjects++;
    const subjMocks = topics.reduce((a, t) => a + t.rows.length, 0);
    const subjQs = topics.reduce((a, t) => a + t.rows.reduce((b, r) => b + (r.it.q || 0), 0), 0);
    shownMocks += subjMocks; shownQs += subjQs;
    const isSubjOpen = !!q || gkQuizOpenSubject === subj.subject;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden;background:var(--panel);';
    const header = document.createElement('button');
    header.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:transparent;border:none;text-align:left;font-size:15px;font-weight:600;cursor:pointer;color:inherit;';
    header.innerHTML =
      '<span>' + (subj.icon || '') + ' ' + escapeHtml(subj.subject) + '</span>' +
      '<span style="display:flex;align-items:center;gap:8px;font-weight:400;font-size:13px;color:var(--muted);">' +
        subjMocks + ' quizzes' +
        '<span style="display:inline-block;transform:rotate(' + (isSubjOpen ? 90 : 0) + 'deg);transition:transform .15s;">&#8250;</span>' +
      '</span>';
    header.addEventListener('click', () => {
      gkQuizOpenSubject = (gkQuizOpenSubject === subj.subject) ? null : subj.subject;
      gkQuizOpenTopic = null;
      gkQuizRender();
    });
    wrap.appendChild(header);

    if(isSubjOpen){
      const body = document.createElement('div');
      body.style.cssText = 'border-top:1px solid var(--border);';
      topics.forEach(tp => {
        const key = subj.subject + '||' + tp.topic;
        const isTopicOpen = !!q || gkQuizOpenTopic === key;
        const tWrap = document.createElement('div');
        tWrap.style.cssText = 'border-bottom:1px solid var(--border);';
        const tHead = document.createElement('button');
        tHead.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px 12px 24px;background:transparent;border:none;text-align:left;font-size:14px;font-weight:500;cursor:pointer;color:inherit;';
        const doneCount = tp.rows.filter(r => gkQuizIsDone(r.it)).length;
        tHead.innerHTML =
          '<span>' + escapeHtml(tp.topic) + '</span>' +
          '<span style="flex:0 0 auto;display:flex;align-items:center;gap:8px;font-weight:400;font-size:12px;color:var(--muted);">' +
            (doneCount ? doneCount + '/' : '') + tp.rows.length + ' quizzes' +
            '<span style="display:inline-block;transform:rotate(' + (isTopicOpen ? 90 : 0) + 'deg);transition:transform .15s;">&#8250;</span>' +
          '</span>';
        tHead.addEventListener('click', () => {
          gkQuizOpenTopic = (gkQuizOpenTopic === key) ? null : key;
          gkQuizRender();
        });
        tWrap.appendChild(tHead);
        if(isTopicOpen){
          const inner = document.createElement('div');
          inner.style.cssText = 'background:var(--bg,transparent);';
          tp.rows.forEach(r => {
            const done = gkQuizIsDone(r.it);
            const row = document.createElement('button');
            row.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px 12px 32px;background:transparent;border:none;border-top:1px solid var(--border);text-align:left;cursor:pointer;color:inherit;';
            row.innerHTML =
              '<span style="min-width:0;">' + escapeHtml(r.label) + (done ? ' <span style="color:var(--gain,#16A34A);">✅</span>' : '') +
                ' <span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:rgba(94,234,212,0.16);color:var(--muted);vertical-align:middle;">' +
                (r.it.src === 'p75' ? '75 Day' : 'Super') + '</span></span>' +
              '<span style="flex:0 0 auto;color:var(--muted);font-size:13px;">' + r.it.q + ' Qs &#8250;</span>';
            row.addEventListener('click', () => gkQuizOpen(r.it, tp.topic, r.label));
            inner.appendChild(row);
          });
          tWrap.appendChild(inner);
        }
        body.appendChild(tWrap);
      });
      const last = body.lastElementChild;
      if(last) last.style.borderBottom = 'none';
      wrap.appendChild(body);
    }
    grid.appendChild(wrap);
  });
  if(!shownSubjects) grid.innerHTML = '<div class="losshint">Koi quiz nahi mila.</div>';
  if(sum) sum.textContent = shownMocks + ' quizzes · ' + shownQs.toLocaleString('en-IN') + ' sawaal · ' + shownSubjects + ' subjects' + (q ? ' (search)' : '');
}

function gkQuizIsDone(it){
  try{ return isQuizSetAttempted(it.src === 'p75' ? 'p75native' : 'spnative', 'gk/' + it.file); }catch(e){ return false; }
}

async function openGkQuizPage(){
  showCalcPage('gkquiz');
  const grid = document.getElementById('gkQuizListGrid');
  if(grid && !gkQuizManifest) grid.innerHTML = '<div class="losshint">Loading quizzes…</div>';
  await ensureGkQuizManifest();
  gkQuizRender();
}

function initGkQuiz(){
  const btn = document.getElementById('calcGkQuizBtn');
  if(btn) btn.addEventListener('click', openGkQuizPage);
  const back = document.getElementById('gkQuizBackBtn');
  if(back) back.addEventListener('click', () => showCalcPage('gkmenu'));
  const box = document.getElementById('gkQuizSearchInput');
  if(box) box.addEventListener('input', () => { gkQuizQuery = box.value; gkQuizRender(); });
}

'''.replace('\n', NL)

rep("function initP75Quiz(){" + NL, NEW.lstrip('\r\n') + NL + "function initP75Quiz(){" + NL)
rep("  initSuperPracticeQuiz();" + NL + "  initP75Quiz();" + NL, "  initSuperPracticeQuiz();" + NL + "  initP75Quiz();" + NL + "  initGkQuiz();" + NL)

# re-render list (✅ marks) whenever the user comes back to the GK Quiz page
rep("  if(name === 'vocabmenu') safeRun(updateVocabSavedMenuBtn, 'updateVocabSavedMenuBtn');",
    "  if(name === 'gkquiz' && typeof gkQuizRender === 'function' && gkQuizManifest) safeRun(gkQuizRender, 'gkQuizRender');" + NL +
    "  if(name === 'vocabmenu') safeRun(updateVocabSavedMenuBtn, 'updateVocabSavedMenuBtn');")

open(ROOT + 'app.js', 'w', newline='').write(s)
print('app.js patched')

# ============================================================== index.html
h = open(ROOT + 'index.html', newline='').read()

def hrep(old, new, count=1):
    global h
    c = h.count(old)
    assert c == count, ('html count mismatch', c, count, old[:90])
    h = h.replace(old, new)

# card texts (GK removed from SP / 75 Day)
hrep('<span class="calcSub">660 mocks · Quant, Reasoning, English, GK &amp; Computer · subject-wise</span>',
     '<span class="calcSub">491 mocks · Quant, Reasoning, English &amp; Computer · subject-wise</span>')
hrep('<span class="calcSub">384 mocks · Quant, Reasoning, English &amp; GK · subject-wise</span>',
     '<span class="calcSub">254 mocks · Quant, Reasoning &amp; English · subject-wise</span>')
hrep('<span class="subjSub">Chapterwise notes · Hindi + English</span>',
     '<span class="subjSub">Chapterwise notes · Topic-wise Quiz · Hindi + English</span>')

# GK Quiz button inside the GK menu (top, above the chapterwise notes)
BTN = '''      <div class="grid-label" style="margin-top:0;">🧠 GK Quiz</div>
      <div class="calcGrid calcGrid-1col" style="margin-bottom:14px;">
        <button class="calcCard calcCard-gkFeatured" id="calcGkQuizBtn">
          <span class="calcIcon calcIcon-gkFeatured">🧠</span>
          <span class="calcLabelCol">
            <span class="calcLabel">GK Quiz — Topic-wise</span>
            <span class="calcSub">299 quizzes · 6,384 Qs · Super Practice + 75 Day merged · Hindi + English</span>
          </span>
          <span class="calcArrow">&#8250;</span>
        </button>
      </div>
'''.replace('\n', '\r\n')
hrep('      <div class="grid-label" style="margin-top:0;">📖 GK Chapterwise Notes</div>\r\n',
     BTN + '      <div class="grid-label" style="margin-top:0;">📖 GK Chapterwise Notes</div>\r\n')

# GK Quiz page (right before the GK Modern History chapters page)
PAGE = '''    <div class="calcPage" id="calcPage-gkquiz">
      <div class="calcSubHead">
        <button class="calcBackBtn" id="gkQuizBackBtn" aria-label="Back">&#8249;</button>
        <div class="calcSubTitle">🧠 GK Quiz — Topic-wise</div>
      </div>
      <div id="gkQuizSummary" class="losshint" style="margin:0 0 8px;"></div>
      <input type="text" id="gkQuizSearchInput" placeholder="🔍 Search topic (e.g. Mughal, Rivers, Polity)…" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:inherit;margin-bottom:12px;">
      <div id="gkQuizListGrid"></div>
    </div>

'''.replace('\n', '\r\n')
hrep('    <div class="calcPage" id="calcPage-gkmodernhistorychapters">\r\n', PAGE + '    <div class="calcPage" id="calcPage-gkmodernhistorychapters">\r\n')

open(ROOT + 'index.html', 'w', newline='').write(h)
print('index.html patched')
