// START_DATE / TOTAL_DAYS used to be fixed constants. They are now `let`
// because each player can set their own custom target (how many days,
// starting when) — see applyTargetSettings() further below, which loads
// these from state.__target (falling back to the original hardcoded
// values below for pre-existing users who never set a custom target).
let START_DATE = new Date('2026-07-06T00:00:00');
let TOTAL_DAYS = 50;
// ===== AI proxy endpoint =====
// The 4 AI features below (Time Coach, Strict Manager popup, AI Study
// Guide, AI Mock Analysis) all call this single Cloudflare Worker URL —
// the browser never talks to Anthropic directly and never sees the API
// key. The Worker looks at each request's "model" field and routes it to
// Claude (Anthropic). The real key lives on the Worker as a server-side
// secret. Deploy/update the included
// cloudflare-worker.js (hybrid version) at this same *.workers.dev URL —
// everything else in the app keeps working unchanged either way (inside a
// Claude.ai Artifact preview or hosted standalone, e.g. GitHub Pages).
const AI_PROXY_URL = "https://white-fire-2957.crickrttop10.workers.dev/v1/messages";
const DAILY_TARGET = 5000;
const DEFAULT_TASKS = [
  "Math Formula + GK Revise",
  "Vocab",
  "Full Mock (Attempt Only)",
  "Calculation",
  "Math Chapter (1.5 hrs)",
  "Mock Analysis",
  "English (10 PQRS, 2 RC, 2 CT)",
  "GK",
  "4 Sectional Math (15 min each)",
  "Analysis + 1 Reasoning Sectional",
  "Backup + Reading / GK"
];
let TASKS = DEFAULT_TASKS.slice();

// ===== Auto task-type detection (Today tab) =====
// Looks at a task's own name and decides whether it's a "Full Mock" attempt,
// a "Mock Analysis", or (Part 2) a "Sectional" task — so the right score/
// wrong-question box can attach itself to THAT task automatically, instead
// of sitting as a separate fixed block lower down the page.
//   'mockScore'    -> task name has "mock" but not "analysis"  (e.g. "Full Mock (Attempt Only)")
//   'mockAnalysis' -> task name has "mock" AND "analysis"      (e.g. "Mock Analysis")
//   'sectional'    -> task name has "sectional"                (wired up in Part 2)
//   'calcQuiz'     -> task name has "calculat"                 (e.g. "Calculation") — gets a
//                      direct "take the quiz" button, and completing a Calc-tab quiz session
//                      auto-ticks this task instead of needing a manual checkbox tap.
function taskAutoType(name){
  const n = (name||'').toLowerCase();
  if(n.includes('mock')){
    if(n.includes('analysis') || n.includes('analy')) return 'mockAnalysis';
    return 'mockScore';
  }
  if(n.includes('sectional')) return 'sectional';
  if(n.includes('calculat')) return 'calcQuiz';
  return null;
}

// ===== Anti-instant-complete guard =====
// Some members were ticking every single task box in one second flat to
// fake a "full day done" — this makes that impossible for TODAY's own
// list: (1) a minimum real-world gap must pass between two ticks, and
// (2) every tick needs a short proof-of-work note before it counts.
// Past days and admin-edited (other member's) days are left frictionless.
const MIN_TASK_CHECK_GAP_SEC = 30;
const TASK_NOTE_MIN_LEN = 8;

// ===== Chapter-wise weak-area tracker =====
// Fixed chapter/topic lists for Math and English. Wrong-question counts
// against these are stored globally (not per-day) in state.chapterWrong,
// so they keep accumulating across all 50 days — the chapter with the
// highest count is the weakest one, at a glance.
const MATH_CHAPTERS = [
  "Percentage","Profit and Loss","Simple and Compound Interest","Ratio and Proportion",
  "Time and Work","Pipe and Cistern","Number System","Algebra","Trigonometry","Geometry",
  "Mensuration","Average","Mixture and Alligation","Time Speed and Distance","Boat and Stream",
  "Partnership","Data Interpretation","Statistics","Probability","Coordinate Geometry",
  "LCM and HCF","Simplification","Surds and Indices","Race","Sequence and Series"
];
const ENGLISH_TOPICS = [
  "Spotting Errors","Fill in the Blanks","Synonyms","Antonyms","Spellings","Idioms and Phrases",
  "One Word Substitution","Sentence Improvement","Active and Passive Voice","Direct and Indirect Speech",
  "Parajumbles (PQRS)","Cloze Test","Reading Comprehension","Noun","Pronoun","Adjective","Verb",
  "Adverb","Preposition","Conjunction","Article","Tenses","Subject-Verb Agreement","Question Tags",
  "Conditional Sentences"
];
function ensureChapterState(){
  if(!state.chapterWrong) state.chapterWrong = {math:{}, english:{}};
  if(!state.chapterWrong.math) state.chapterWrong.math = {};
  if(!state.chapterWrong.english) state.chapterWrong.english = {};
  return state.chapterWrong;
}
function chapterCount(type, name){
  const cw = ensureChapterState();
  return cw[type][name] || 0;
}
async function bumpChapter(type, name, delta){
  const cw = ensureChapterState();
  const next = (cw[type][name] || 0) + delta;
  cw[type][name] = next < 0 ? 0 : next;
  await save();
  safeRun(renderChaptersTab, 'renderChaptersTab');
  safeRun(renderQuickChapterLog, 'renderQuickChapterLog');
}
async function resetChapterType(type){
  if(!confirm('Ye sab ' + (type==='math'?'Math':'English') + ' chapter counts 0 pe reset kar dega. Pakka?')) return;
  const cw = ensureChapterState();
  cw[type] = {};
  await save();
  safeRun(renderChaptersTab, 'renderChaptersTab');
  safeRun(renderQuickChapterLog, 'renderQuickChapterLog');
}

// ===== Revision Counter (separate from the wrong-answer tracker above) =====
// Tracks HOW MANY TIMES each Math/English/GK chapter has been revised —
// pure "++" counter, stored globally in state.revisionCount so it never
// resets on its own and keeps accumulating across the entire preparation
// (not just these 50 days). Saved via the same save() as everything else,
// so it persists in localStorage + window.storage + room sync automatically.
const GK_SECTIONS = [
  { section:"Geography", topics:["Solar System","Earth's Structure & Tectonics","Rocks, Continents & Oceans","Geomorphology & Topography","Atmosphere","Winds, Currents & Cyclones","India's Location","Himalayas","Peninsular Plateau","Plains & Islands","Peninsular Rivers","Dams, Lakes & Waterfalls","Monsoon","Forests & Grasslands","Soils & Agriculture","Minerals","World Map","National Parks","Transportation","Demographics"] },
  { section:"Ancient History", topics:["Prehistoric & IVC","Vedic Culture","Mahajanapadas & Mauryan Empire","Gupta Empire","South India & Sangam Age","Buddhism & Jainism"] },
  { section:"Medieval History", topics:["Early Medieval & Regional States","Delhi Sultanate","Mughal & Sur Dynasty","Vijayanagara & Bahmani","Maratha Empire","Bhakti & Sufi Movements","Sikhism"] },
  { section:"Modern History", topics:["Decline of Mughals & New Powers","European Advent & British Expansion","British Admin & Economy","Revolt of 1857","Socio-Religious Reforms","Freedom Struggle","Tribal & Peasant Movements","Post-Independence India"] },
  { section:"Polity", topics:["Making of Constitution","Features of Constitution","Preamble","UTs & Citizenship","Fundamental Rights","DPSP & Fundamental Duties","President & Vice President","PM & Council of Ministers","Parliament","State Legislature","Emergency & Amendments","Supreme & High Courts","Local Government","Constitutional Bodies","Important Acts & Laws","Sources of Constitution"] },
  { section:"Economics", topics:["Economy Basics","Demand & Supply","National Income","Inflation & Unemployment","Budget & Taxation","Monetary Policy","Money & Banking","BOP, Poverty & Trade","Five Year Plans & Industry"] },
  { section:"Environment", topics:["Environment Basics","Biodiversity Conservation","Govt Schemes & Global Initiatives"] },
  { section:"Physics", topics:["Motion","Force & Laws of Motion","Gravitation, Work & Energy","Sound","Reflection & Refraction","Eye, Vision & Electricity"] },
  { section:"Chemistry", topics:["Matter & Its States"] },
  { section:"Biology", topics:["Cell","Plant & Animal Tissues","Plant & Animal Kingdom","Nervous System & Senses","Plant Growth & Reproduction","Nutrition & Digestion","Circulatory & Excretory System","Diseases & Nutrients","Genetics & Evolution"] },
  { section:"Static General Knowledge", topics:["Classical & Folk Dance","Instruments & Gharanas","Festivals & Fairs","Temples & Monuments","Books & Authors","Sports","Awards & Honours","National & Global Orgs","Science & Tech","Important Days & Schemes"] }
];
// In-memory only (not saved) — remembers which GK section groups are
// expanded so re-rendering after a click doesn't collapse them again.
let openGkSections = new Set();
function ensureRevisionState(){
  if(!state.revisionCount) state.revisionCount = {math:{}, english:{}, gk:{}};
  if(!state.revisionCount.math) state.revisionCount.math = {};
  if(!state.revisionCount.english) state.revisionCount.english = {};
  if(!state.revisionCount.gk) state.revisionCount.gk = {};
  return state.revisionCount;
}
function revisionCount(type, name){
  const rc = ensureRevisionState();
  return rc[type][name] || 0;
}
async function bumpRevision(type, name, delta){
  const rc = ensureRevisionState();
  const next = (rc[type][name] || 0) + delta;
  rc[type][name] = next < 0 ? 0 : next;
  await save();
  safeRun(renderRevisionTab, 'renderRevisionTab');
}
async function resetRevisionType(type){
  const label = type==='math' ? 'Math' : type==='english' ? 'English' : 'GK';
  if(!confirm('Ye sab ' + label + ' revision counts 0 pe reset kar dega. Pakka?')) return;
  const rc = ensureRevisionState();
  rc[type] = {};
  await save();
  safeRun(renderRevisionTab, 'renderRevisionTab');
}
const PER_TASK = DAILY_TARGET / DEFAULT_TASKS.length;
// Minutes per task, in the same fixed order as DEFAULT_TASKS (renaming a task
// doesn't change its position, so this mapping stays correct). These are
// never printed next to a task name — they only drive the auto Study Hours
// count below, based on the fixed daily schedule: 07-08 (60m), 08-09 (60m),
// 09-10 (60m), [break 10-11], 11-11:30 (30m), 11:30-1 (90m), 1-2 (60m),
// [break 2-3], 3-4 (60m), 4-5 (60m), 5-6 (60m), [break 6-7], 7-8:30 (90m),
// [break 8:30-9], 9-10 (60m) — target finish by 10 PM.
// These DEFAULT_* arrays are the original fixed factory schedule — never
// mutated, used as the fallback/reset target. The live TASK_DURATIONS_MIN /
// TASK_START_MIN below are `let` because the person can now add tasks or
// edit each task's own start time/duration from the Task Editor, and those
// live arrays grow/shrink/change together with TASKS.
const DEFAULT_TASK_DURATIONS_MIN = [60,60,60,30,90,60,60,60,60,90,60];
// Clock start time (minutes since midnight) for each task, in the same
// fixed order as DEFAULT_TASKS/TASK_DURATIONS_MIN — this is what powers the
// "Right Now" card and the Smart Time Guide below the checklist.
const DEFAULT_TASK_START_MIN = [420,480,540,660,690,780,900,960,1020,1140,1260];
let TASK_DURATIONS_MIN = DEFAULT_TASK_DURATIONS_MIN.slice();
let TASK_START_MIN = DEFAULT_TASK_START_MIN.slice();
function taskSlot(idx){
  const start = TASK_START_MIN[idx];
  const end = start + (TASK_DURATIONS_MIN[idx]||0);
  return { start, end };
}
// A task only counts as truly "missed" (lost ₹) after a fixed daily
// cutoff — 9 PM — not the moment its own slot ends. Before 9 PM every
// unchecked task on today just sits in "pending", however small; only
// once it's 9 PM or later does whatever's still unticked flip to "lost".
// For any day other than today the whole day is already behind us, so
// everything in it is due by definition.
const LOSS_CUTOFF_MIN = 21*60; // 9:00 PM
function isTaskDue(dayIndex, startMin, durMin){
  if(dayIndex !== todayDayNum()) return true;
  return nowMinutes() >= LOSS_CUTOFF_MIN;
}
// Fixed daily break windows (minutes since midnight) that sit BETWEEN the
// study blocks above. The Smart Time Guide below must never schedule a
// task across one of these — if the "start again right now" plan would run
// into a break, the task gets pushed to start right after the break instead.
const BREAKS = [
  {start:600,  end:660,  label:'10:00 AM – 11:00 AM'}, // after 9-10 AM block
  {start:840,  end:900,  label:'2:00 PM – 3:00 PM'},   // after 1-2 PM block
  {start:1080, end:1140, label:'6:00 PM – 7:00 PM'},   // after 5-6 PM block
  {start:1230, end:1260, label:'8:30 PM – 9:00 PM'}    // after 7-8:30 PM block
];
// Pushes a start time forward past any break window it would overlap with
// (checked repeatedly in case pushing past one break lands inside another).
// Accepts an optional custom breaks list — falls back to the fixed BREAKS
// above when none is given.
function placeAfterBreaks(start, mins, breaksList){
  const list = breaksList || BREAKS;
  let s = start;
  for(let i=0;i<8;i++){
    let moved = false;
    for(const b of list){
      if(s < b.end && (s+mins) > b.start){ s = b.end; moved = true; }
    }
    if(!moved) break;
  }
  return s;
}

// ===== Smart Time Settings =====
// Lets the person set their OWN "finish by" clock time and their OWN break
// windows (instead of the fixed defaults above), so the Smart Time Guide
// below builds a timetable around how they actually want to run their day.
// Stored locally per device — it's a personal schedule preference, not
// something that needs to sync to the leaderboard/room.
function defaultTimeSettings(){
  const lastIdx = TASK_START_MIN.length-1;
  return {
    dayEnd: TASK_START_MIN[lastIdx] + (TASK_DURATIONS_MIN[lastIdx]||0),
    breaks: BREAKS.map(b=>({start:b.start, end:b.end}))
  };
}
function getTimeSettings(){
  try{
    const raw = localStorage.getItem('cgl50-timesettings');
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed.dayEnd==='number' && Array.isArray(parsed.breaks)){
        parsed.breaks = parsed.breaks.filter(b=>b && typeof b.start==='number' && typeof b.end==='number' && b.end>b.start);
        return parsed;
      }
    }
  }catch(e){}
  return defaultTimeSettings();
}
function setTimeSettings(obj){
  try{ localStorage.setItem('cgl50-timesettings', JSON.stringify(obj)); }catch(e){}
}
function minToTimeInputStr(mins){
  mins = ((Math.round(mins)%1440)+1440)%1440;
  const h = Math.floor(mins/60), m = mins%60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}
function timeInputStrToMin(str){
  if(!str) return null;
  const parts = str.split(':');
  const h = parseInt(parts[0],10), m = parseInt(parts[1],10);
  if(isNaN(h)||isNaN(m)) return null;
  return h*60+m;
}
// In-memory draft of the settings form so add/remove-break edits don't get
// wiped out by the next unrelated re-render (a task checkbox tick, a
// background sync tick, etc.) before the person taps Save.
let timeSettingsDraft = null;
// In-memory draft for the Task Editor (name/start/duration per task) — lets
// add/remove-task edits build up before the person taps Save, without a
// background re-render (checkbox tick, sync tick, etc.) wiping the draft.
let taskEditDraft = null;
function renderTimeSettings(){
  const el = document.getElementById('timeSettingsBox');
  if(!el) return;
  if(viewingName !== myName){
    el.innerHTML = '';
    return;
  }
  if(!timeSettingsDraft) timeSettingsDraft = getTimeSettings();
  const ts = timeSettingsDraft;
  let html = `<div class="tsHead">⚙️ Apna Time-Table Set Karo</div>`;
  html += `
    <div class="tsRow">
      <span class="tsLabel">🏁 Target kis time tak khatam karna hai</span>
      <input type="time" id="tsEndInput" value="${minToTimeInputStr(ts.dayEnd)}">
    </div>
    <div class="tsBreaksLabel">☕ Break Kis Time Chahiye</div>
  `;
  ts.breaks.forEach((b, i)=>{
    html += `
    <div class="tsBreakRow" data-bidx="${i}">
      <input type="time" class="tsBreakStart" data-bidx="${i}" value="${minToTimeInputStr(b.start)}">
      <span class="tsBreakSep">–</span>
      <input type="time" class="tsBreakEnd" data-bidx="${i}" value="${minToTimeInputStr(b.end)}">
      <button class="tsBreakDel" data-bidx="${i}" title="Ye break hatao">✕</button>
    </div>`;
  });
  if(ts.breaks.length===0){
    html += `<div class="losshint" style="padding:4px 0 8px;">Koi break nahi — "Break Jodo" dabakar add karo.</div>`;
  }
  html += `
    <div class="btnrow">
      <button class="nav-btn" id="tsAddBreakBtn" style="font-size:12.5px;">➕ Break Jodo</button>
      <button class="nav-btn" id="tsSaveBtn" style="font-size:12.5px;">💾 Save Karo</button>
      <button class="nav-btn" id="tsResetBtn" style="font-size:12.5px;">↩️ Default</button>
    </div>
  `;
  el.innerHTML = html;

  document.getElementById('tsEndInput').addEventListener('change', (e)=>{
    const v = timeInputStrToMin(e.target.value);
    if(v!==null) timeSettingsDraft.dayEnd = v;
  });
  el.querySelectorAll('.tsBreakStart').forEach(inp=>{
    inp.addEventListener('change', (e)=>{
      const i = parseInt(e.target.getAttribute('data-bidx'),10);
      const v = timeInputStrToMin(e.target.value);
      if(v!==null) timeSettingsDraft.breaks[i].start = v;
    });
  });
  el.querySelectorAll('.tsBreakEnd').forEach(inp=>{
    inp.addEventListener('change', (e)=>{
      const i = parseInt(e.target.getAttribute('data-bidx'),10);
      const v = timeInputStrToMin(e.target.value);
      if(v!==null) timeSettingsDraft.breaks[i].end = v;
    });
  });
  el.querySelectorAll('.tsBreakDel').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = parseInt(btn.getAttribute('data-bidx'),10);
      timeSettingsDraft.breaks.splice(i,1);
      renderTimeSettings();
    });
  });
  document.getElementById('tsAddBreakBtn').addEventListener('click', ()=>{
    const last = timeSettingsDraft.breaks[timeSettingsDraft.breaks.length-1];
    const start = last ? Math.min(last.end + 30, 1380) : 600;
    timeSettingsDraft.breaks.push({start, end: Math.min(start+30,1439)});
    renderTimeSettings();
  });
  document.getElementById('tsSaveBtn').addEventListener('click', ()=>{
    // Drop inverted/zero-length rows and keep breaks time-ordered so the
    // guide never trips over an overlapping or backwards window.
    timeSettingsDraft.breaks = timeSettingsDraft.breaks
      .filter(b=>b.end > b.start)
      .sort((a,b)=>a.start-b.start);
    setTimeSettings(timeSettingsDraft);
    renderTimeGuide();
    renderTimeSettings();
  });
  document.getElementById('tsResetBtn').addEventListener('click', ()=>{
    timeSettingsDraft = defaultTimeSettings();
    setTimeSettings(timeSettingsDraft);
    renderTimeGuide();
    renderTimeSettings();
  });
}
// ===== Size-based task values =====
// Bigger tasks (more minutes) are worth more ₹, smaller tasks are worth
// less — split proportionally from each task's own duration — while the
// whole day still always adds up to exactly DAILY_TARGET (₹5,000), no
// matter how many tasks there are or how their durations change. Whole-rupee
// rounding uses the largest-remainder method so the total never drifts.
// Called fresh any time the task list changes (add/remove/edit time), which
// is what auto-rearranges everyone's ₹ split back to a clean 5,000 total.
function computeTaskValues(durations){
  const totalMin = durations.reduce((a,b)=>a+b,0) || 1;
  const raw = durations.map(m => (m/totalMin) * DAILY_TARGET);
  const floors = raw.map(Math.floor);
  let remainder = Math.round(DAILY_TARGET - floors.reduce((a,b)=>a+b,0));
  const order = raw.map((v,i)=>({i, frac:v-Math.floor(v)})).sort((a,b)=>b.frac-a.frac);
  const values = floors.slice();
  for(let k=0;k<remainder && k<order.length;k++){ values[order[k].i] += 1; }
  return values;
}
let TASK_VALUES = computeTaskValues(TASK_DURATIONS_MIN);
function taskValue(idx){
  return (TASK_VALUES[idx]!==undefined) ? TASK_VALUES[idx] : (DAILY_TARGET/(TASKS.length||1));
}

// ===== Quiz tasks auto-added to the ₹5,000 split =====
// Learn tab se jo bhi quiz complete hoti hai (logQuizActivity below), wo
// us din ke target list mein apna ek alag "task" ban jaati hai — already
// ✅ complete maani jaati hai (quiz to ho hi chuki hai). Ismein koi apna
// fixed ₹ nahi hai: bas ek dusre normal task jitna "weight" maan kar,
// computeTaskValues() wahi purana ₹5,000-split formula chala deta hai
// saare tasks + saari quizzes milakar — isliye jitni zyada quiz doge,
// utna hi baaki tasks ka ₹ thoda kam hoke sabme barabar-sa baant jaata hai,
// lekin din ka total hamesha poora ₹5,000 hi rehta hai.
const QUIZ_TASK_WEIGHT_MIN = 20;
function quizDurationWeights(quizLog){
  const list = Array.isArray(quizLog) ? quizLog : [];
  return list.map(()=>QUIZ_TASK_WEIGHT_MIN);
}
// Ek din (d) ke saare task-values — agar us din koi quiz nahi hui to seedha
// global TASK_VALUES (fast path, baaki sab dino jaisa hi behaviour), warna
// TASK_DURATIONS_MIN + us din ki quizzes milakar ₹5,000 dobara baant do.
// Returned array: pehle TASKS.length entries normal tasks ke, uske baad
// ek entry per quiz (usi order mein jis order mein quiz log hui thi).
function dayTaskValues(d){
  const qw = quizDurationWeights(d && d.quizLog);
  if(!qw.length) return TASK_VALUES;
  return computeTaskValues(TASK_DURATIONS_MIN.concat(qw));
}
// Rough size tier per task (for a colourful at-a-glance cue) — purely
// cosmetic, driven by the same minutes used to set the ₹ value above.
function taskTier(idx){
  const mins = TASK_DURATIONS_MIN[idx] || 0;
  if(mins >= 80) return { emoji:'🟡', cls:'tier-large' };
  if(mins <= 35) return { emoji:'🔵', cls:'tier-small' };
  return { emoji:'🟣', cls:'tier-medium' };
}
function nowMinutes(){
  const n = new Date();
  return n.getHours()*60 + n.getMinutes();
}
function fmtClock(mins){
  mins = ((Math.round(mins)%1440)+1440)%1440;
  let h = Math.floor(mins/60), m = mins%60;
  const ap = h>=12 ? 'PM' : 'AM';
  let h12 = h%12; if(h12===0) h12=12;
  return h12 + ':' + String(m).padStart(2,'0') + ' ' + ap;
}
function dayStudyMinutes(d){
  let mins = 0;
  d.tasks.forEach((checked,idx)=>{ if(checked) mins += (TASK_DURATIONS_MIN[idx]||0); });
  return mins;
}
function fmtHours(mins){
  mins = Math.round(mins);
  const h = Math.floor(mins/60), m = mins%60;
  if(h<=0) return m+'m';
  return m>0 ? h+'h '+m+'m' : h+'h';
}
// A day "meets target" for streak purposes once at least 50% of tasks are
// done — full completion is no longer required to keep the streak alive.
function meetsStreakTarget(d){
  const done = d.tasks.filter(Boolean).length;
  return (done/TASKS.length) >= 0.5;
}

// ===== Voice-to-text (Web Speech API) =====
// One shared SpeechRecognition instance, wired via event delegation so it
// keeps working across re-renders without needing to re-attach listeners
// to every 🎤 button individually (this app re-renders its tab bodies
// constantly). Tap 🎤 next to any text field to start dictating into it —
// tap again (or just stop talking) to finish. Recognized speech is
// appended to whatever's already in the field, not replaced, so multiple
// dictation passes (or typing + dictation mixed) don't wipe each other out.
//
// Language note: lang is set to 'en-IN' rather than 'hi-IN' because that
// gives the best Roman-script transliteration for Hinglish speech (e.g.
// "Maths mein jaldbaazi mein radius ko diameter padh liya" comes out
// readable, not in Devanagari script).
//
// Browser support note: this only works where the browser actually ships
// SpeechRecognition — Chrome on Android is solid; iOS Safari support is
// inconsistent/absent, especially inside an installed PWA. On unsupported
// browsers the mic button still shows (so the UI doesn't shift) but taps
// show a one-time explanation instead of silently doing nothing.
const VoiceInput = (function(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SR;
  let recognition = null;
  let activeBtn = null;
  let baseText = ''; // text already in the field before this dictation session started

  const MIC_ICON_SVG = '<svg viewBox="0 0 24 24" class="micIcon"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>';
  const STOP_ICON_SVG = '<svg viewBox="0 0 24 24" class="micIcon"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  function buildRecognition(){
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    return rec;
  }

  function setListeningUI(on){
    if(!activeBtn) return;
    activeBtn.classList.toggle('listening', on);
    activeBtn.innerHTML = on ? STOP_ICON_SVG : MIC_ICON_SVG;
  }

  function stop(){
    if(recognition){ try{ recognition.stop(); }catch(e){} }
  }

  function joinWithSpace(a, b){
    if(!a) return b;
    if(!b) return a;
    return a + (/\s$/.test(a) ? '' : ' ') + b;
  }

  function start(btn){
    const targetId = btn.getAttribute('data-mic-target');
    const el = document.getElementById(targetId);
    if(!el) return;

    // Tapping the mic that's already listening = stop early.
    if(activeBtn === btn){ stop(); return; }
    // Switching mics mid-dictation: cleanly stop the previous one first.
    if(recognition) stop();

    activeBtn = btn;
    baseText = el.value || '';
    recognition = buildRecognition();
    setListeningUI(true);

    recognition.onresult = (ev)=>{
      let finalChunk = '', interimChunk = '';
      for(let i=ev.resultIndex; i<ev.results.length; i++){
        const r = ev.results[i];
        if(r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }
      if(finalChunk) baseText = joinWithSpace(baseText, finalChunk.trim());
      el.value = interimChunk ? joinWithSpace(baseText, interimChunk) : baseText;
      el.dispatchEvent(new Event('input', { bubbles:true }));
    };
    recognition.onerror = (ev)=>{
      if(ev.error === 'not-allowed' || ev.error === 'service-not-allowed'){
        alert('🎤 Mic permission nahi mili. Browser settings mein is site ko mic access do.');
      }
      // 'no-speech' / 'aborted' etc. are routine — onend cleans up silently.
    };
    recognition.onend = ()=>{
      setListeningUI(false);
      activeBtn = null; recognition = null;
      el.dispatchEvent(new Event('change', { bubbles:true }));
    };

    try{ recognition.start(); }
    catch(e){ setListeningUI(false); activeBtn = null; recognition = null; }
  }

  document.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('.micBtn');
    if(!btn || btn.disabled) return;
    ev.preventDefault();
    if(!supported){
      alert('🎤 Is browser mein voice typing support nahi hai. Chrome (Android) try karo.');
      return;
    }
    start(btn);
  });

  return { supported };
})();

const STORAGE_KEY = 'cgl-tracker-state-v2';
const BADGES = [
  {days:7,  emoji:'🥉', label:'7-Day Streak'},
  {days:14, emoji:'🥈', label:'14-Day Streak'},
  {days:30, emoji:'🥇', label:'30-Day Streak'}
];
const BADGE_MESSAGES = {
  7:  "1 hafta lagatar poora! Momentum ban raha hai — isse tootne mat do.",
  14: "2 hafte non-stop! Ye habit ab tumhara identity ban rahi hai.",
  30: "30 din ka streak — respect. Ab sirf 20 din aur, finish line saamne hai!"
};

// ===== XP / Level system =====
// A lightweight RPG-style layer on top of the existing streak/badge system.
// XP is derived fresh from the saved day data every time (never stored as
// its own running counter), so it can never drift or double-count:
//   +10 XP per ticked task, +100 XP bonus for a fully-cleared day,
//   +10 XP per streak-day for every streak badge already unlocked.
// Level-up cost grows linearly (100*level XP to clear that level) so early
// levels arrive fast (feels rewarding immediately) and later ones need a
// bit more consistent grinding — mirroring the streak snowball.
const LEVEL_TITLES = [
  {min:1,  title:'Naya Aspirant'},
  {min:3,  title:'Warm-Up Mode'},
  {min:6,  title:'Grinder'},
  {min:10, title:'Consistent Beast'},
  {min:15, title:'Exam Ready'},
  {min:20, title:'Topper Material'},
  {min:26, title:'CGL Machine'},
  {min:32, title:'Selection Locked'}
];
function levelTitle(level){
  let t = LEVEL_TITLES[0].title;
  for(const lt of LEVEL_TITLES){ if(level>=lt.min) t=lt.title; else break; }
  return t;
}
function levelInfo(xp){
  let level=1, xpAtStart=0;
  while(true){
    const needed = 100*level;
    if(xp - xpAtStart >= needed){ xpAtStart += needed; level++; }
    else break;
  }
  return { level, xpIntoLevel: xp-xpAtStart, xpForNext: 100*level, xp };
}
const LEVEL_UP_MESSAGES = [
  "Naya level unlock — tumhara grind saaf dikh raha hai. Chalte raho!",
  "Level up! Ek level upar, exam ke ek kadam aur paas.",
  "XP badh raha hai — matlab consistency kaam kar rahi hai. Isi tarah lage raho!",
  "Ek aur level clear — future-self tumhe abhi se thank you keh raha hai.",
  "Grind dikh raha hai — level up ho gaya, ab agla target maaro!"
];
// Generic XP calculator that works on ANY day-store (own or a friend's),
// so both the local tracker and the leaderboard share one source of truth.
function computeXPGeneric(dayAccessor, activeUpto, badgesEarned, taskCount){
  let xp = 0;
  // Normalized to a fixed 11-task day (the original default) so that XP
  // stays comparable across players even if someone has added/removed
  // tasks — a fully-cleared day is always worth the same 110 base XP
  // (+100 bonus), whether that day has 5 tasks or 20. Nobody gets ahead
  // just by having more (or fewer) tasks than anyone else.
  const tc = taskCount || 1;
  for(let i=1;i<=activeUpto;i++){
    const d = dayAccessor(i);
    if(d.rest) continue;
    const done = d.tasks.filter(Boolean).length;
    xp += (done/tc) * (10*DEFAULT_TASKS.length);
    if(done===tc) xp += 100;
  }
  if(badgesEarned){
    BADGES.forEach(b=>{ if(badgesEarned[b.days]) xp += b.days*10; });
  }
  return Math.round(xp);
}
function computeXP(){
  return computeXPGeneric(getDay, activeUptoDay(), state.badgesEarned, TASKS.length);
}
function computeXPFrom(st){
  let activeUpto = todayDayNum();
  for(let i=1;i<=TOTAL_DAYS;i++){ if(isDayTouchedFrom(getDayFrom(st,i))) activeUpto = Math.max(activeUpto,i); }
  return computeXPGeneric((i)=>getDayFrom(st,i), activeUpto, st.badgesEarned, taskCountFrom(st));
}

const MOTIVATION_MESSAGES = [
  "Ek din aur pura — consistency hi asli syllabus hai. Kal phir yahi josh chahiye!",
  "Full day clear! Ye ₹5,000 tumne kamaya hai, kisi ne diya nahi. Keep going!",
  "Selection sirf un logo ko milti hai jo aise hi din-dar-din grind karte hain. Bohot badhiya!",
  "Aaj ka din pura — CGL ka result aaj ke jaise 50 dino se hi banega.",
  "Zabardast! Jo aaj kiya wo kal exam hall me kaam aayega.",
  "Poora din complete — tumhara future-self tumhe thank you bolega.",
  "Ek aur brick set ho gayi is foundation me. Solid kaam!",
  "Consistency > Motivation. Aaj tumne consistency dikhayi — badhiya!",
  "Din pura, wallet full — isi tarah 50 din tak chalna hai.",
  "Mehnat dikh rahi hai. Yahi routine tumhe topper banayega."
];

// A fresh line every calendar day on the Home screen — cycles through this
// list based on today's date, so it's stable all day and changes at midnight
// without needing any server or manual update.
const DAILY_QUOTES = [
  "Aaj ka din wapas nahi aayega — jo bhi ghante milein, poore laga do.",
  "Jo log result ke baad successful dikhte hain, unhone aise hi normal din grind kiye the.",
  "50 din ka plan bana hai — bas aaj wala din jeetna hai, poora plan apne aap ban jayega.",
  "Chhoti si progress bhi progress hai. Zero se aage har kadam count hota hai.",
  "Exam hall mein confidence wahi cheez degi jo aaj practice ki.",
  "Thakaan aayegi, bahaana bhi aayega — dono ko cross karke aage nikal jao.",
  "Tumhare competitors abhi so rahe hain ya scroll kar rahe hain. Ye tumhara window hai.",
  "Ek achha din pura mat samjho jab tak wallet full na ho jaye.",
  "Selection ek din mein nahi, roz ke choton se milti hai — aaj wo choti jeet lo.",
  "Jitna time aaj bachaoge utna hi kal ka pressure kam hoga.",
  "Mushkil lag raha hai matlab tum sahi cheez pe kaam kar rahe ho.",
  "Har mock, har revision — sab compound hoke result banata hai.",
  "Aaj ka target chhota lag sakta hai, par 50 din baad yehi difference banayega.",
  "Distraction ek ghanta churata hai, focus ek raat ki neend jitna return deta hai.",
  "Consistency boring lagti hai, par yahi cheez topper aur baaki mein farak karti hai.",
  "Jo galti aaj samajh aayi, wo exam mein dobara nahi hogi — isliye mistakes bhi progress hain.",
  "Apne aap se competition karo — kal ke apne se aaj thoda better bano.",
  "Result door lag raha hoga, par har din uska ek chhota hissa hai.",
  "Tumhare paas already ek plan hai — bas usse follow karna hai, dobara sochna nahi.",
  "Aaj thoda aur push karo — future wala tum isi din ko thank you bolega.",
  "Speed se zyada zaroori hai roz dikhna — jo roz dikhta hai wahi finish line tak pahunchta hai.",
  "Har task jo tick hota hai, ek chhota sa proof hai ki tum serious ho.",
  "Kisi aur se tulna mat karo — sirf apna schedule follow karo, baaki apne aap set ho jayega.",
  "Mehnat dikhti nahi, sirf result dikhta hai — is beech ka phase yehi hai.",
  "Aaj clear karo, kal fresh mind se aur mushkil topic uthao.",
  "Jo aaj avoid karoge wahi kal double hoke wapas aayega — abhi nipta do.",
  "Preparation ka matlab hai ready hona jab opportunity aaye — aaj wahi ready hone ka din hai.",
  "Chhota sa consistent effort, bade burst se zyada powerful hota hai.",
  "Tumne shuru kiya tha kisi wajah se — us wajah ko aaj yaad karo aur kaam pe lag jao.",
  "Har din jo pura hota hai, exam wale din ka darr thoda kam karta hai."
];

// Extra motivation lines — the ones that are naturally English quotes are
// kept in English; the ones that only ever existed as Hinglish are now in
// proper Hindi (Devanagari) since they read better that way.
const EXTRA_MOTIVATION_QUOTES = [
  "The harder you work for something, the better you'll feel when you achieve it.",
  "Don't limit your challenges. Challenge your limits.",
  "Nothing is impossible. The word itself says 'I'm possible!'",
  "Fall seven times, stand up eight.",
  "Opportunities don't happen. You create them.",
  "The man who moves a mountain begins by carrying away small stones.",
  "Action is the foundational key to all success.",
  "It's not about having time. It's about making time.",
  "Small daily improvements over time lead to stunning results.",
  "Your time is limited, don't waste it living someone else's life.",
  "Your 'I Can' is more important than your IQ.",
  "If the WHY is powerful, the HOW is easy.",
  "To be everywhere is to be nowhere.",
  "Reality cannot be ignored except at a price — and the longer you ignore it, the higher and uglier that price gets.",
  "Your mind is a garden; your subconscious, the soil. Sow light, and you'll reap clarity. Sow darkness, and you'll reap confusion.",
  "We have two lives, and the second begins when we realise we only have one.",
  "अगर आप खुद फैसले नहीं लेते, तो आपके लिए फैसले ले लिए जाते हैं..!",
  "अभी भी वक़्त है.. हम्म, अभी भी वक़्त है — पूरा खेल बदल सकता है, अगर सही जगह पहुँचकर सही काम कर लिया तो।",
  "A moment of pain is worth a lifetime of glory.",
  "Legends aren't built on the days they feel motivated, but the days they feel like quitting.",
  "अभी भी वक़्त है... 2400 से 2800 करने का, 2800 से 4600 करने का, 4600 से 4600 'H' करने का, और 27 से 26 में ही करने का।",
  "The magic you're looking for is in the work you're avoiding.",
  "है जो सही वो करना नहीं, ग़लत होने की यही तो शुरुआत है.."
];

// A second, bigger batch of pure-Hindi (Devanagari) motivational lines added
// later. These go into the SAME rotation as everything above, but the old
// pools (DAILY_QUOTES + EXTRA_MOTIVATION_QUOTES) are still given priority —
// see the weighting note on ALL_TAB_QUOTES just below.
const HINDI_MOTIVATION_QUOTES_2 = [
  "अभ्यास में जितना ज्यादा पसीना बहाओगे, युद्ध में उतना ही कम खून बहेगा।",
  "खुद को आगे बढ़ाएं, क्योंकि कोई और आपके लिए ऐसा नहीं करने वाला है।",
  "सफलता उससे नहीं मिलती जो आप कभी-कभी करते हैं, बल्कि उससे मिलती है जो आप लगातार करते हैं।",
  "आज आप जो दर्द महसूस कर रहे हैं, कल वही आपकी ताकत बनेगा।",
  "नदी चट्टान को अपनी ताकत से नहीं, बल्कि अपनी लगातार कोशिश से काटती है।",
  "बड़े सपने देखें, ध्यान केंद्रित रखें और उन्हें सच कर दिखाएं।",
  "तब तक न रुकें जब तक आपको खुद पर गर्व न हो।",
  "आपके सपनों और हकीकत के बीच की दूरी को 'कर्म' कहते हैं।",
  "हर सुबह आपके पास दो विकल्प होते हैं: अपने सपनों के साथ सोते रहें, या उठें और उनका पीछा करें।",
  "महान बनने के लिए शुरुआत करने की जरूरत नहीं है, बल्कि महान बनने के लिए शुरुआत करना जरूरी है।",
  "या तो अनुशासन का दर्द सह लें, या फिर पछतावे का दर्द सहें।",
  "बहाने हमेशा आपके पास रहेंगे, लेकिन अवसर नहीं।",
  "खामोशी से कड़ी मेहनत करें, अपनी सफलता को शोर मचाने दें।",
  "सबसे खराब अभ्यास (वर्कआउट) वही है जो आपने किया ही नहीं।",
  "बिना किसी समय-सीमा वाले लक्ष्य सिर्फ एक सपना होते हैं।",
  "अगर कोई चीज आपको चुनौती नहीं देती, तो वह आपको बदल भी नहीं सकती।",
  "अपने सामने वाली सीढ़ी पर ध्यान दें, पूरी सीढ़ियों पर नहीं।",
  "आपकी एकमात्र सीमा आप खुद हैं।",
  "परिणाम समय के साथ आते हैं, रातों-रात नहीं। कड़ी मेहनत करें, लगातार लगे रहें, और धैर्य रखें।",
  "अपने सबसे बड़े बहाने से ज्यादा मजबूत बनें।",
  "दिमाग सबसे जरूरी मांसपेशी है। इसे हर स्थिति में अच्छा देखने के लिए प्रशिक्षित करें।",
  "अवसर का इंतज़ार न करें। इसे खुद बनाएं।",
  "थोड़ा-थोड़ा करके, इंसान बहुत दूर तक का सफर तय कर लेता है।",
  "मुश्किल वक्त कभी टिकता नहीं, लेकिन मजबूत लोग टिकते हैं।",
  "विश्वास करें कि आप कर सकते हैं, और आपने आधा रास्ता तय कर लिया।",
  "जो व्यक्ति कभी हार नहीं मानता, उसे हराना बहुत मुश्किल होता है।",
  "शरीर वही हासिल करता है जिस पर दिमाग विश्वास करता है।",
  "अपने जीवन को एक मास्टरपीस बनाएं; यह कल्पना करें कि आप जो बन सकते हैं, पा सकते हैं या कर सकते हैं, उसकी कोई सीमा नहीं है।",
  "सफलता उन छोटे-छोटे प्रयासों का जोड़ है, जिन्हें रोजाना लगातार किया जाता है।",
  "आपकी आखिरी गलती ही आपकी सबसे अच्छी शिक्षक होती है।",
  "जो आज की रात किताबों पर झुकता है, वही कल दुनिया पर राज करता है।",
  "थकान से मत रुको, मंजिल के करीब पहुँचकर हार मानना सबसे बड़ी गलती है।",
  "सफलता का कोई शॉर्टकट नहीं होता, हर पन्ना पढ़ना पड़ता है और हर कदम दौड़ना पड़ता है।",
  "पसीने की स्याही से जो अपने इरादे लिखते हैं, उनके मुकद्दर के पन्ने कभी कोरे नहीं होते।",
  "आज की मेहनत कल का सुकून है, इसलिए आज खुद को तपाने से पीछे मत हटो।",
  "समय का हर एक सेकंड कीमती है, इसे गँवाने का मतलब है अपनी मंजिल को दूर करना।",
  "जब दुनिया सो रही हो, तब तुम्हारी जागकर की गई मेहनत ही तुम्हें सबसे अलग बनाएगी।",
  "दर्द और थकान सिर्फ दिमाग का वहम हैं, तुम्हारा संकल्प इनसे कहीं ज्यादा मजबूत है।",
  "लक्ष्य जितना बड़ा होगा, सफर उतना ही कठिन होगा, और जीत उतनी ही शानदार होगी।",
  "खुद को साबित करने का मौका बार-बार नहीं मिलता, जो समय हाथ में है उसे अपना सबसे बड़ा हथियार बनाओ।",
  "मैदान में हारा हुआ इंसान फिर से जीत सकता है, लेकिन मन से हारा हुआ इंसान कभी नहीं जीत सकता।",
  "हर दिन खुद से एक वादा करो कि आज का दिन कल से बेहतर और ज्यादा प्रोडक्टिव होगा।",
  "किस्मत के भरोसे बैठने वालों को सिर्फ उतना मिलता है, जितना कोशिश करने वाले छोड़ देते हैं।",
  "जब भी हार मानने का ख्याल आए, तो याद करना कि तुमने इतनी दूर तक का सफर क्यों तय किया था।",
  "सफलता एक दिन में नहीं मिलती, लेकिन एक-एक दिन की गई निरंतर मेहनत से जरूर मिलती है।",
  "तुम्हारी सबसे बड़ी प्रतियोगिता खुद से है, हर दिन अपने पिछले रिकॉर्ड को तोड़ने का प्रयास करो।",
  "जो बहाने बनाते हैं वो इतिहास नहीं बनाते, और जो इतिहास बनाते हैं वो बहाने नहीं बनाते।",
  "डर को अपने ऊपर हावी मत होने दो, अपने हौसले को इतना बड़ा कर लो कि डर खुद छोटा हो जाए।",
  "जिस दिन तुमने सोच लिया कि तुम कर सकते हो, समझो तुमने आधी बाज़ी वहीं जीत ली।",
  "अगर रास्ता मुश्किल लग रहा है, तो समझ लो कि तुम सही दिशा में आगे बढ़ रहे हो।",
  "कोई भी लक्ष्य इंसान के साहस से बड़ा नहीं होता, हारता वही है जो दिल से लड़ता नहीं।",
  "अपनी कमजोरियों को अपनी ताकत बनाओ, क्योंकि यही तुम्हें सबसे अलग पहचान दिलाएंगी।",
  "हर सुबह एक नया अवसर है, या तो इसे सोकर गुजार दो, या उठकर अपने सपनों के पीछे दौड़ो।",
  "जब तक तुम्हारा लक्ष्य पूरा न हो जाए, तब तक न रुको, न थको और न ही मुड़कर देखो।",
  "तुम्हारी सफलता का शोर उसी दिन मचेगा, जिस दिन तुम्हारी खामोशी की मेहनत पूरी होगी।",
  "सिर्फ सोचने से कुछ नहीं होता, सफलता पाने के लिए उस सोच को कर्म में बदलना पड़ता है।",
  "अनुशासन वो पुल है जो तुम्हारे सपनों और तुम्हारी उपलब्धियों को जोड़ता है।",
  "जो पानी से नहाता है वो सिर्फ लिबास बदलता है, पर जो पसीने से नहाता है वो इतिहास बदलता है।",
  "हारना कोई बुरी बात नहीं है, लेकिन हार मान लेना सबसे बुरी बात है।",
  "अगर सूरज की तरह चमकना चाहते हो, तो पहले सूरज की तरह जलना और तपना सीखो।"
];

// Combined pool used for the per-tab motivation cards.
// PRIORITY NOTE: the original two pools (DAILY_QUOTES + EXTRA_MOTIVATION_QUOTES)
// are deliberately listed TWICE below, while the new HINDI_MOTIVATION_QUOTES_2
// batch is listed once. Since sessionTabQuotes is a full random shuffle of this
// combined array, doubling the old pool roughly doubles its odds of being
// picked for a tab card vs. the new batch — so the old lines stay the "main"
// ones shown most often, and the new Hindi lines now show up too, just less
// frequently. (If you ever want all of them equally likely, just remove one
// of the two DAILY_QUOTES.concat(EXTRA_MOTIVATION_QUOTES) copies below.)
const ALL_TAB_QUOTES = DAILY_QUOTES.concat(EXTRA_MOTIVATION_QUOTES)
  .concat(DAILY_QUOTES).concat(EXTRA_MOTIVATION_QUOTES)
  .concat(HINDI_MOTIVATION_QUOTES_2);

// One quote element per tab — each gets its OWN line (not the same repeated).
const TAB_QUOTE_IDS = ['quoteText-home','quoteText-today','quoteText-mock','quoteText-revision','quoteText-chapters','quoteText-compete','quoteText-more'];

function shuffledCopy(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// ===== Quiz "Attempted" Tracking (sabhi quiz types ke liye shared) =====
// Jab bhi koi set poora complete hota hai (result screen tak pahunch jaata
// hai), uska key state.quizAttempted mein save hota hai — state hi woh cheez
// hai jo save()/loadPlayerState() ke through Firebase (aur window.storage)
// tak sync hoti hai, exactly jaise baaki saara progress data hota hai. Isse
// PC aur mobile dono par same ✅ tick dikhega. (Pehle yeh seedha browser ke
// localStorage mein save hota tha, jo sirf usi ek device/browser tak simit
// rehta tha aur kabhi sync hi nahi hota tha — isi wajah se PC aur mobile par
// alag-alag dikh raha tha.) Set-menu list mein aise sets ke card par ✅ badge
// dikh jaata hai — sirf ek visual "de diya hai" indicator hai, ismein koi
// restriction nahi: quiz jitni baar chaho utni baar dobara de sakte ho, ✅
// hone ke baad bhi button poori tarah clickable rehta hai.
const QUIZ_ATTEMPTED_KEY = 'cgl50-quiz-attempted'; // purana device-only key — ab sirf one-time migration ke liye rakha hai
function ensureQuizAttemptedState(){
  if(!state.quizAttempted || typeof state.quizAttempted !== 'object' || Array.isArray(state.quizAttempted)){
    state.quizAttempted = {};
  }
  return state.quizAttempted;
}
function loadQuizAttemptedMap(){
  return ensureQuizAttemptedState();
}
function markQuizSetAttempted(prefix, setKey){
  if(!prefix || !setKey || setKey === 'saved') return;
  const map = ensureQuizAttemptedState();
  if(!Array.isArray(map[prefix])) map[prefix] = [];
  if(!map[prefix].includes(setKey)){
    map[prefix].push(setKey);
    save();
  }
}
function isQuizSetAttempted(prefix, setKey){
  const map = ensureQuizAttemptedState();
  return !!(map[prefix] && map[prefix].includes(setKey));
}

// ===== Full Quiz Attempt Review (sabhi quiz types ke liye shared) =====
// Har quiz module (vocab, spelling, idiom, grammar, reasoning, digitalsum,
// unitdigit, statement, mathpyq chapters...) apne set ka poora result yahan
// save karta hai: score + har question ka apna answer + sahi jawaab +
// explanation (pre-rendered HTML). Set-menu card par isse "✅ Score: X ·
// Tap to review" dikhta hai, tap karne par yehi saved review khulta hai —
// bilkul waisa jaisa submit ke turant baad dikha tha. Ek 🔁 button se
// (card ke corner me ya result screen ke top pe) fresh reattempt shuru ho
// jaata hai, purana result tab tak safe rehta hai jab tak naya submit na ho.
//
// PERF: yeh data (poori explanation HTML, sabhi din, sabhi quiz) kaafi
// bada ho sakta hai. Isliye yeh state.* ke andar NAHI rakha — state[]
// har chhoti save() (ek task tick, ek score edit...) par poora Firebase
// round-trip karta hai, aur agar yeh bada blob usi state ke andar hota to
// har chhoti save bhi poora quiz-review data baar-baar upload/download
// karti, jo app ko dheema kar deta. Iski jagah yeh apne alag, halke sync
// channel (quizDetailStore + saveQuizAttemptDetailStore) mein rehta hai,
// jo SIRF tab likhta hai jab koi quiz genuinely complete hoti hai — na ki
// har baar jab koi anya cheez save hoti hai. Fir bhi dono devices par sync
// hota hai, bas baaki saari saves halki aur fast rehti hain.
const QUIZ_ATTEMPT_DETAIL_KEY = 'cgl50-quiz-attempt-detail'; // purana device-only key — ab sirf one-time migration ke liye rakha hai
let quizDetailStore = {};
let quizDetailStoreOwner = null; // kis player naam ke liye quizDetailStore abhi load hua hai
function quizDetailPlayerKey(name){ return 'cgl50-state:' + name.trim().toLowerCase() + ':quizdetail'; }
function quizDetailLocalKey(name){ return localPlayerKey(name) + ':quizdetail'; }
async function loadQuizAttemptDetailStore(name){
  if(getRoomCode()){
    const raw = await kvdbGet(quizDetailPlayerKey(name));
    if(raw){ try{ return JSON.parse(raw); }catch(e){ /* fall through */ } }
  }
  const key = quizDetailLocalKey(name);
  if(window.storage && typeof window.storage.get === 'function'){
    try{
      const res = await window.storage.get(key, true);
      if(res && res.value) return JSON.parse(res.value);
    }catch(e){ /* fall through */ }
  }
  try{
    const raw = localStorage.getItem(key);
    if(raw) return JSON.parse(raw);
  }catch(e){ /* ignore */ }
  return {};
}
// Union-merges each prefix/setKey entry from remote + local (local wins on
// a genuine per-entry conflict) instead of one whole-blob last-write-wins,
// so a review saved on one device is never wiped out by the other device
// saving afterward with a stale copy of this store.
function mergeQuizDetailStores(remoteStore, localStore){
  const merged = {};
  const prefixes = new Set([...Object.keys(remoteStore||{}), ...Object.keys(localStore||{})]);
  prefixes.forEach(p=>{
    merged[p] = Object.assign({}, (remoteStore&&remoteStore[p])||{}, (localStore&&localStore[p])||{});
  });
  return merged;
}
function currentQuizDetailTargetName(){
  const editingOther = canAdminEditViewed() && adminEditModeOn;
  return editingOther ? viewingName : myName;
}
async function saveQuizAttemptDetailStore(){
  const targetName = currentQuizDetailTargetName();
  if(!targetName) return;
  if(getRoomCode()){
    try{
      const raw = await kvdbGet(quizDetailPlayerKey(targetName));
      if(raw){
        const remote = JSON.parse(raw);
        if(remote && typeof remote === 'object' && !Array.isArray(remote)) quizDetailStore = mergeQuizDetailStores(remote, quizDetailStore);
      }
    }catch(e){ /* keep local copy, still try to save below */ }
  }
  const json = JSON.stringify(quizDetailStore);
  const key = quizDetailLocalKey(targetName);
  try{ localStorage.setItem(key, json); }catch(e){}
  if(window.storage && typeof window.storage.set === 'function'){
    try{ await window.storage.set(key, json, true); }catch(e){}
  }
  if(getRoomCode()) await kvdbSet(quizDetailPlayerKey(targetName), json);
}
function ensureQuizAttemptDetailState(){
  if(!quizDetailStore || typeof quizDetailStore !== 'object' || Array.isArray(quizDetailStore)) quizDetailStore = {};
  return quizDetailStore;
}
function saveQuizAttemptDetail(prefix, setKey, data){
  if(!prefix || !setKey || setKey === 'saved') return;
  const map = ensureQuizAttemptDetailState();
  if(!map[prefix]) map[prefix] = {};
  map[prefix][setKey] = data;
  saveQuizAttemptDetailStore(); // fire-and-forget — isi ki apni alag, halki sync hai (upar comment dekho)
}
function getQuizAttemptDetail(prefix, setKey){
  const map = ensureQuizAttemptDetailState();
  return (map[prefix] && map[prefix][setKey]) || null;
}
// Jab bhi viewingName badalta hai (apna profile, ya Admin kisi aur ka
// tracker khol raha ho), quizDetailStore ko bhi usi player ke liye reload
// karo — taaki review data hamesha sahi profile ka dikhe.
async function ensureQuizDetailStoreForCurrentViewer(){
  const targetName = viewingName;
  if(!targetName || quizDetailStoreOwner === targetName) return;
  quizDetailStore = await loadQuizAttemptDetailStore(targetName);
  quizDetailStoreOwner = targetName;
}
// One-time migration: is device par purane (pre-fix) localStorage-only quiz
// data ho sakta hai jo kabhi sync hi nahi hua — use ab naye store mein utha
// lo taaki agli save se woh bhi baaki devices tak pahunch jaaye. Sirf tabhi
// chalta hai jab store abhi khaali ho, taaki kisi doosre device ka
// already-synced (aur zyada complete) data isse overwrite na ho jaaye.
function migrateLegacyQuizStorageIfNeeded(){
  // QUIZ_ATTEMPTED_KEY/QUIZ_ATTEMPT_DETAIL_KEY are old FLAT localStorage
  // keys from before this data was per-player — they aren't scoped to any
  // name. Only ever fold them into MY OWN profile; if this is running
  // while viewing a friend's tracker (Admin), skip entirely, or this
  // device's own old quiz history could get wrongly copied onto the
  // friend's data.
  if(viewingName !== myName) return;
  try{
    const attemptedEmpty = !state.quizAttempted || Object.keys(state.quizAttempted).length === 0;
    if(attemptedEmpty){
      const raw = localStorage.getItem(QUIZ_ATTEMPTED_KEY);
      if(raw){
        const old = JSON.parse(raw);
        if(old && typeof old === 'object' && !Array.isArray(old) && Object.keys(old).length) state.quizAttempted = old;
      }
    }
  }catch(e){}
  // Purana (state ke andar wala) version ho sakta hai jo pichle fix se aaya
  // ho — usko bhi naye alag store mein utha lo, aur state se hata do taaki
  // wo bhi ab se halka rahe.
  try{
    if(state.quizAttemptDetail && typeof state.quizAttemptDetail === 'object' && Object.keys(state.quizAttemptDetail).length){
      const storeEmpty = !quizDetailStore || Object.keys(quizDetailStore).length === 0;
      if(storeEmpty) quizDetailStore = state.quizAttemptDetail;
      delete state.quizAttemptDetail;
    }
  }catch(e){}
  try{
    const detailEmpty = !quizDetailStore || Object.keys(quizDetailStore).length === 0;
    if(detailEmpty){
      const raw = localStorage.getItem(QUIZ_ATTEMPT_DETAIL_KEY);
      if(raw){
        const old = JSON.parse(raw);
        if(old && typeof old === 'object' && !Array.isArray(old) && Object.keys(old).length) quizDetailStore = old;
      }
    }
  }catch(e){}
}
// Word/options/answer/explanation schema — vocab, spelling, idiom, grammar
// aur sabhi makeReasoningQuiz() se bane modules (oddone, series, coding,
// phrasal, voice, narration, homophone, preposition) isi ek schema ko
// share karte hain, isliye ek hi builder sabke kaam aata hai.
function buildWordSchemeReviewItems(questions, userAnswers){
  return (questions || []).map((q, i) => {
    const userIdx = userAnswers ? userAnswers[i] : null;
    const optionsHtml = '<div style="display:flex;flex-direction:column;gap:8px;">' +
      (q.options || []).map((opt, idx) => {
        let cls = 'examReviewOptBtn';
        let mark = '';
        if(idx === q.answer){ cls += ' reviewCorrect'; mark = ' ✓'; }
        else if(idx === userIdx){ cls += ' reviewWrong'; mark = ' ✗'; }
        return '<div class="' + cls + '">' + escapeHtml(opt) + mark + '</div>';
      }).join('') + '</div>';
    const explHtml = (q.explanation && q.explanation.length)
      ? (Array.isArray(q.explanation) ? q.explanation.map(b => escapeHtml(b)).join('<br>') : escapeHtml(q.explanation))
      : '';
    return {
      qHtml: escapeHtml(q.word || ''),
      optionsHtml,
      explHtml,
      skipped: (userIdx === null || userIdx === undefined)
    };
  });
}
// Bilingual (en/hi) + sol1/sol2 (ya sirf sol) schema — digitalsum,
// unitdigit, statement, mathpyq (chapters) isko share karte hain. Math
// text ko mathify() se hi render karte hain jaisa quiz ke dauraan hota hai.
function buildMathSolReviewItems(questions, userAnswers, lang){
  return (questions || []).map((q, i) => {
    const userIdx = userAnswers ? userAnswers[i] : null;
    const optionsHtml = '<div style="display:flex;flex-direction:column;gap:8px;">' +
      (q.options || []).map((opt, idx) => {
        let cls = 'examReviewOptBtn';
        let mark = '';
        if(idx === q.answer){ cls += ' reviewCorrect'; mark = ' ✓'; }
        else if(idx === userIdx){ cls += ' reviewWrong'; mark = ' ✗'; }
        return '<div class="' + cls + '">' + mathify(opt) + mark + '</div>';
      }).join('') + '</div>';
    let explHtml = '';
    if(q.sol1 || q.sol2){
      explHtml =
        '<div class="dsSolBlock"><div class="dsSolLabel">Solution 1</div>' + formatSolSteps(q.sol1 || '') + '</div>' +
        '<div class="dsSolBlock"><div class="dsSolLabel">Solution 2</div>' + formatSolSteps(q.sol2 || '') + '</div>';
    } else if(q.sol){
      explHtml = '<div class="dsSolBlock">' + formatSolSteps(q.sol) + '</div>';
    }
    return {
      qHtml: mathify('Q' + (q.qn != null ? q.qn + '. ' : '') + (((lang === 'en' ? q.en : q.hi)) || '')),
      optionsHtml,
      explHtml,
      skipped: (userIdx === null || userIdx === undefined)
    };
  });
}
// Ek hi full-screen overlay — saare quiz modules isi ko reuse karte hain,
// isliye kisi bhi module ki HTML markup mein badlaav ki zaroorat nahi.
function ensureQuizReviewOverlay(){
  let el = document.getElementById('quizReviewOverlay');
  if(el) return el;
  el = document.createElement('div');
  el.id = 'quizReviewOverlay';
  el.style.cssText = 'display:none;position:fixed;inset:0;background:var(--bg,#0b0b10);z-index:9999;overflow-y:auto;-webkit-overflow-scrolling:touch;';
  el.innerHTML =
    '<div style="position:sticky;top:0;background:var(--panel,#15151d);padding:12px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border,#2a2a35);z-index:2;">' +
      '<button type="button" id="quizReviewCloseBtn" class="nav-btn" style="flex:0 0 auto;padding:8px 12px;font-size:12.5px;">✕ Close</button>' +
      '<div id="quizReviewHeaderTitle" style="flex:1;font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>' +
      '<button type="button" id="quizReviewReattemptBtn" class="nav-btn" style="flex:0 0 auto;padding:8px 12px;font-size:12.5px;">🔁 Reattempt</button>' +
    '</div>' +
    '<div id="quizReviewSummary" style="padding:12px 14px;font-size:13px;color:var(--muted,#aaa);"></div>' +
    '<div id="quizReviewList" style="padding:0 14px 32px;"></div>';
  document.body.appendChild(el);
  document.getElementById('quizReviewCloseBtn').addEventListener('click', closeQuizReviewOverlay);
  return el;
}
function closeQuizReviewOverlay(){
  const el = document.getElementById('quizReviewOverlay');
  if(el) el.style.display = 'none';
}
function openQuizReviewOverlay(title, attempt, onReattempt){
  if(!attempt) return;
  const el = ensureQuizReviewOverlay();
  const titleEl = document.getElementById('quizReviewHeaderTitle');
  if(titleEl) titleEl.textContent = title;
  const summaryEl = document.getElementById('quizReviewSummary');
  if(summaryEl){
    summaryEl.innerHTML =
      '<div>✅ Correct: <b>' + attempt.correct + '</b> &nbsp; ❌ Wrong: <b>' + attempt.wrong + '</b>' +
      (attempt.total != null ? ' &nbsp; 📝 Total: <b>' + attempt.total + '</b>' : '') +
      (attempt.acc != null ? ' &nbsp; 🎯 Accuracy: <b>' + attempt.acc + '%</b>' : '') + '</div>';
  }
  const list = document.getElementById('quizReviewList');
  if(list){
    list.innerHTML = (attempt.items || []).map((it, i) =>
      '<div style="margin:14px 0;padding:12px;background:var(--panel2,#1b1b24);border-radius:12px;">' +
        '<div class="examReviewTag ' + (it.skipped ? 'tagSkipped' : '') + '" style="margin:0 0 8px;">Q' + (i + 1) + (it.skipped ? ' · Skipped' : '') + '</div>' +
        '<div style="font-size:15px;margin-bottom:10px;line-height:1.4;">' + it.qHtml + '</div>' +
        it.optionsHtml +
        (it.explHtml ? '<div style="margin-top:8px;font-size:13px;color:var(--muted,#aaa);">' + it.explHtml + '</div>' : '') +
      '</div>'
    ).join('');
  }
  const reBtn = document.getElementById('quizReviewReattemptBtn');
  if(reBtn) reBtn.onclick = () => { closeQuizReviewOverlay(); if(onReattempt) onReattempt(); };
  el.style.display = 'block';
  el.scrollTop = 0;
}
// Set-menu grid mein ek "already attempted" card banata hai (score + tap
// to review + corner 🔁 reattempt). Agar is set ka koi saved attempt nahi
// hai to false return karta hai — caller phir normal button bana sakta hai.
function renderQuizAttemptCard(grid, prefix, setKey, icon, labelText, onReattempt){
  const attempt = getQuizAttemptDetail(prefix, setKey);
  if(!attempt) return false;
  const card = document.createElement('div');
  card.className = 'calcCard';
  card.style.cursor = 'pointer';
  card.innerHTML =
    '<span class="calcIcon">' + icon + '</span>' +
    '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(labelText) + '</span>' +
    '<span style="font-size:11px;color:var(--muted);font-weight:600;">✅ Score: ' + attempt.correct + '/' + attempt.total + ' · Tap to review</span></span>' +
    '<button type="button" class="mockCardReattemptBtn" style="flex:0 0 auto;background:transparent;border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:11px;color:var(--muted);">🔁</button>';
  card.addEventListener('click', (e) => {
    if(e.target.closest('.mockCardReattemptBtn')) return;
    openQuizReviewOverlay(labelText, attempt, onReattempt);
  });
  const reBtn = card.querySelector('.mockCardReattemptBtn');
  if(reBtn) reBtn.addEventListener('click', (e) => { e.stopPropagation(); onReattempt(); });
  grid.appendChild(card);
  return true;
}
// Result screen ke bilkul top par ek 🔁 Reattempt button — HTML markup
// chhue bina, JS se hi ek baar inject ho jaata hai.
function ensureResultTopReattemptBtn(resultCardEl, onReattempt){
  if(!resultCardEl) return;
  let btn = resultCardEl.querySelector('.quizResultTopReattemptBtn');
  if(!btn){
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-btn quizResultTopReattemptBtn';
    btn.style.cssText = 'display:block;margin:0 0 10px;padding:8px 12px;font-size:12.5px;';
    btn.textContent = '🔁 Reattempt';
    resultCardEl.insertBefore(btn, resultCardEl.firstChild);
  }
  btn.onclick = onReattempt;
}

// Shuffled ONCE when the script loads (i.e. once per app open / reload), so
// every tab shows a different line, it stays put across re-renders during
// this session, and a fresh different set shows up next time the app opens.
const sessionTabQuotes = shuffledCopy(ALL_TAB_QUOTES);

function renderDailyQuote(){
  TAB_QUOTE_IDS.forEach((id, idx)=>{
    const el = document.getElementById(id);
    if(el) el.textContent = sessionTabQuotes[idx % sessionTabQuotes.length];
  });
}

let state = {};
// Guards save() from ever running before `state` genuinely holds the
// owner's freshly-loaded data. Without this: on a slow/flaky connection,
// `state` sits at its default {} for a moment while loadPlayerState() is
// still awaiting Firebase — and if a save fires in that exact window
// (e.g. the tab gets backgrounded, which triggers save() on its own),
// it would silently overwrite the person's real saved progress with
// nothing, on every storage layer including Firebase. Only ever set to
// true right after a load has actually finished (see init()/switchViewing()).
let stateReady = false;
// Snapshot of the top-level keys `state` had immediately after the last
// load/save. mergeWithRemoteBeforeSave() uses this to tell "I never
// touched this key, so leave it alone even if I don't have it locally"
// (e.g. a different device added a new day) apart from "I deliberately
// removed this key since I last loaded" (e.g. archiving old days) —
// without this distinction a safe merge isn't possible.
let lastLoadedStateKeys = [];
function snapshotLoadedStateKeys(){ lastLoadedStateKeys = Object.keys(state); }
let selectedDay = 1;
let notesTimer = null;
let scoreTimer = null;
let mistakesTimer = null;
let myName = null;       // this device's chosen player name
let viewingName = null;  // whose tracker is currently on screen (me or a friend)
let leaderboardMode = 'today'; // 'today' = just today (default), 'week' = current Mon-Sun week so far, 'all' = all-time
const REGISTRY_KEY = 'cgl50-players-registry';
// ===== "Today Rank" 24-hour auto-refresh =====
// todayDayNum() itself is always live (re-derived from the real clock on
// every call), so the numbers are never stale IF something re-renders the
// Compete panel after midnight. Normally that happens anyway via the 25s
// room-sync tick — but if the phone was locked/backgrounded overnight,
// mobile browsers freeze timers, so nothing fires until the app is opened
// again. This tracks the last day-number we actually rendered for, and
// forces one fresh renderCompetePanel()+renderAll() the moment we notice
// the date has moved on — whether that's a live tick or the app just
// waking back up — so "Today" rank/scoreboard is guaranteed correct within
// moments of the day changing, not just next time the room-sync happens to run.
let lastRenderedDayNum = null;
function checkDayRolloverAndRefresh(){
  const tn = todayDayNum();
  if(lastRenderedDayNum !== null && tn !== lastRenderedDayNum){
    lastRenderedDayNum = tn;
    selectedDay = tn;
    safeRun(renderAll, 'renderAll(dayRollover)');
    renderCompetePanel();
  } else {
    lastRenderedDayNum = tn;
  }
}

function fmtDate(dayNum){
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + (dayNum-1));
  return d.toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short'});
}
function todayDayNum(){
  const now = new Date();
  const diff = Math.floor((new Date(now.toDateString()) - new Date(START_DATE.toDateString()))/86400000)+1;
  return Math.min(Math.max(diff,1), TOTAL_DAYS);
}
function getDay(n){
  if(!state[n]) state[n] = {};
  const d = state[n];
  if(!Array.isArray(d.tasks)) d.tasks = new Array(TASKS.length).fill(false);
  else if(d.tasks.length !== TASKS.length){
    // Task count changed (added/removed a task) — resize while keeping every
    // existing tick in its same position, new slots default to unticked.
    const resized = new Array(TASKS.length).fill(false);
    for(let i=0;i<Math.min(TASKS.length, d.tasks.length); i++) resized[i] = !!d.tasks[i];
    d.tasks = resized;
  }
  // Proof-of-work note + real tick timestamp per task (anti-instant-complete
  // guard). Resized the same way as d.tasks above whenever TASKS changes.
  if(!Array.isArray(d.taskNotes)) d.taskNotes = new Array(TASKS.length).fill('');
  else if(d.taskNotes.length !== TASKS.length){
    const resized = new Array(TASKS.length).fill('');
    for(let i=0;i<Math.min(TASKS.length, d.taskNotes.length); i++) resized[i] = d.taskNotes[i] || '';
    d.taskNotes = resized;
  }
  if(!Array.isArray(d.taskCheckedAt)) d.taskCheckedAt = new Array(TASKS.length).fill(null);
  else if(d.taskCheckedAt.length !== TASKS.length){
    const resized = new Array(TASKS.length).fill(null);
    for(let i=0;i<Math.min(TASKS.length, d.taskCheckedAt.length); i++) resized[i] = d.taskCheckedAt[i] || null;
    d.taskCheckedAt = resized;
  }
  if(!d.mock) d.mock = {math:'',reasoning:'',english:'',gk:'',percentile:'',wrongMath:'',wrongReasoning:'',wrongEnglish:'',wrongGk:''};
  // Migration: older saved days may have a mock object without the newer fields.
  if(d.mock.percentile===undefined) d.mock.percentile = '';
  if(d.mock.wrongMath===undefined) d.mock.wrongMath = '';
  if(d.mock.wrongReasoning===undefined) d.mock.wrongReasoning = '';
  if(d.mock.wrongEnglish===undefined) d.mock.wrongEnglish = '';
  if(d.mock.wrongGk===undefined) d.mock.wrongGk = '';
  if(!d.sect || typeof d.sect !== 'object' || Array.isArray(d.sect)) d.sect = {s1:'',s2:'',s3:'',s4:''};
  // Migration: per-section Right/Wrong/Skip + tagged weak-chapters, added
  // alongside the plain Sec score fields above (kept for backward compat).
  // Sections are now DYNAMIC ("Add More" in Part 2) — d.sect's own keys ARE
  // the live list of sections for this day (default s1-s4, more appended on
  // demand via addSectSlot()/removed via removeSectSlot()) — so just walk
  // whatever keys actually exist here instead of a fixed s1-s4 array.
  if(!d.sectDetail || typeof d.sectDetail !== 'object' || Array.isArray(d.sectDetail)) d.sectDetail = {};
  Object.keys(d.sect).forEach(k=>{
    if(!d.sectDetail[k] || typeof d.sectDetail[k] !== 'object'){
      d.sectDetail[k] = {right:'',wrong:'',skip:'',chapters:[]};
    } else {
      if(d.sectDetail[k].right===undefined) d.sectDetail[k].right='';
      if(d.sectDetail[k].wrong===undefined) d.sectDetail[k].wrong='';
      if(d.sectDetail[k].skip===undefined) d.sectDetail[k].skip='';
      if(!Array.isArray(d.sectDetail[k].chapters)) d.sectDetail[k].chapters=[];
    }
  });
  if(typeof d.notes !== 'string') d.notes = '';
  if(typeof d.mistakes !== 'string') d.mistakes = '';
  if(typeof d.rest !== 'boolean') d.rest = false;
  // Auto-log of quizzes taken today (Vocab/Spelling/Idioms/Grammar/Phrasal/
  // Homophones/Prepositions/Odd One Out/Series/Coding-Decoding — koi bhi).
  // Populated by logQuizActivity(), shown read-only in the Today tab.
  if(!Array.isArray(d.quizLog)) d.quizLog = [];
  // Focus Timer minutes studied per daily target/task (Pomodoro/Stopwatch/Timed) —
  // independent of the task checklist ticks above, purely a free-running study
  // log. Keyed dynamically (task0, task1, ...) instead of fixed subject names,
  // since the "Study Shuru Karo" picker now lists whatever daily targets the
  // user has added, not a fixed Math/Reasoning/English/GK set. Old saves may
  // still carry legacy math/reasoning/english/gk keys — harmless, just summed
  // in along with everything else.
  if(!d.studyMin || typeof d.studyMin !== 'object' || Array.isArray(d.studyMin)){
    d.studyMin = {};
  } else {
    Object.keys(d.studyMin).forEach(k=>{ if(typeof d.studyMin[k] !== 'number' || isNaN(d.studyMin[k])) d.studyMin[k] = 0; });
  }
  return d;
}
// Har quiz (Vocab, Spelling, Idioms, Grammar, Phrasal Verbs, Homophones,
// Prepositions, Odd One Out, Series, Coding-Decoding — app mein kahin se
// bhi) khatam hone par yahaan se call hota hai, taaki Today tab mein aaj ke
// din ke andar ek auto-log entry ban jaaye — bina user ko khud kuch add
// karne ki zaroorat ke.
function logQuizActivity(label, correct, total){
  if(!total) return;
  const day = todayDayNum();
  const d = getDay(day);
  d.quizLog.push({ label: label, correct: correct, total: total, ts: Date.now() });
  save();
  if(selectedDay === day) renderAll();
}
// Calc tab's arithmetic Calculation quiz (Addition/Square/Table/... — see
// finishCalcSession) is different from the other Learn-tab quizzes above:
// instead of appending a new row, it ticks the existing "Calculation" task
// in today's target list (matched via taskAutoType), so the quiz result
// shows up right on that task's own row with its own ₹ share — no separate
// checkbox tap needed. Falls back to the normal quiz-log entry if the task
// list has been customized and no "Calculation" task exists anymore.
function markCalcTaskFromQuiz(opLabel, correct, total){
  if(!total) return;
  const day = todayDayNum();
  const d = getDay(day);
  const idx = TASKS.findIndex(t => taskAutoType(t) === 'calcQuiz');
  if(idx === -1){
    logQuizActivity('Calculation \u2014 ' + opLabel, correct, total);
    return;
  }
  const doneBefore = d.tasks.filter(Boolean).length;
  d.tasks[idx] = true;
  const doneAfter = d.tasks.filter(Boolean).length;
  if(d.taskCheckedAt) d.taskCheckedAt[idx] = Date.now();
  if(d.taskNotes) d.taskNotes[idx] = '\ud83e\uddee ' + opLabel + ' \u2014 ' + correct + '/' + total + ' correct';
  save();
  if(selectedDay === day) renderAll();
  if(doneBefore < TASKS.length && doneAfter === TASKS.length) showReward(day);
}
function dayStatus(n){
  const d = getDay(n);
  if(d.rest) return 'rest';
  const done = d.tasks.filter(Boolean).length;
  if(done===0) return 'empty';
  if(done===TASKS.length) return 'done';
  return 'partial';
}
function num(v){ const f = parseFloat(v); return isNaN(f) ? 0 : f; }
function hasVal(v){ return v!==undefined && v!==null && v!=='' && !isNaN(parseFloat(v)); }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// Converts plain-text math notation into real HTML so it actually displays
// correctly instead of showing raw "^"/backslash-command text — e.g.
// "(-2)^3" -> "(-2)<sup>3</sup>", "\\frac{2}{5}" -> a proper fraction,
// "\\sqrt{144}" / "sqrt(144)" -> "√(144)", "60^\\circ" -> "60°",
// "\\times"/"\\pi"/"\\rightarrow" -> ×/π/→, etc. This is global so ANY quiz
// module's question or solution text (current or added later) can call it
// and get correctly rendered math automatically — no per-question fixing
// needed. Safe on plain text with no math markup: it's escaped exactly like
// before and passes through unchanged. If the string already contains a
// pre-rendered KaTeX HTML block (pasted in as ready-made markup), it's left
// completely untouched so that existing rich rendering keeps working.
function mathify(text){
  const raw = String(text || '');
  if(!raw) return '';
  if(raw.indexOf('katex') !== -1) return raw;

  let s = escapeHtml(raw);

  // Common LaTeX-ish tokens (simple text substitutions, not a full TeX engine)
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\div/g, '÷');
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\propto/g, '∝');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\Rightarrow/g, '⇒');
  s = s.replace(/\\rightarrow/g, '→');
  s = s.replace(/\\downarrow/g, '↓');
  s = s.replace(/\^\s*\\circ/g, '°');
  s = s.replace(/\\circ/g, '°');

  // \sqrt[3]{64} -> superscript root index + radical
  s = s.replace(/\\sqrt\[(\d+)\]\{([^{}]*)\}/g, '<sup>$1</sup>&radic;($2)');
  // \sqrt{144} and plain sqrt(144) -> √(144). Uses a negative lookbehind
  // instead of \b, since \b fails to match right before "sqrt" whenever the
  // sqrt is glued onto a preceding number with no space (e.g. "-30sqrt(3)",
  // "9sqrt(2)") — digit and letter are both "word" characters, so there is
  // no boundary between them and the old \b-based regex silently skipped it,
  // leaving the raw "sqrt(3)" text on screen instead of a radical.
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, '&radic;($1)');
  s = s.replace(/(?<![a-zA-Z])sqrt\(([^()]*)\)/g, '&radic;($1)');

  // \frac{a}{b} -> compact inline fraction
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '<sup>$1</sup>&frasl;<sub>$2</sub>');

  // Plain-text fractions that aren't wrapped in \frac{}{} but are still
  // clearly meant as one, e.g. "(x)/(y)", "(cos A)/(1 - sin A)",
  // "(x^2+y^2)/(2xy)" — very common across the question bank. Turn
  // "(A)/(B)" into a proper stacked fraction instead of showing the raw
  // slash and parentheses.
  s = s.replace(/\(([^()]{1,60})\)\/\(([^()]{1,60})\)/g, '<sup>$1</sup>&frasl;<sub>$2</sub>');

  // Bare numeric fractions and mixed fractions, e.g. "121/100", "17 33/35",
  // "1 1/2" (the mixed-number case is just an integer sitting in front of a
  // bare fraction, so one rule covers both — the leading integer is left as
  // plain text and only the "a/b" part becomes a stacked fraction, giving a
  // proper "1 ½"-style look instead of the confusing plain "1 1/2"). Skips
  // anything already consumed as an exponent (preceded by ^) so it doesn't
  // clash with the fractional-exponent rule below, and skips things like
  // dates or unit ratios (e.g. "km/h") since those never have a digit
  // immediately on both sides of the slash.
  s = s.replace(/(?<!\^)(?<![\w.])(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?![\d.\w])/g, '<sup>$1</sup>&frasl;<sub>$2</sub>');

  // Exponents (order matters: braced/parenthesised/fraction forms first,
  // then bare digits, then a single trailing letter like x^n)
  s = s.replace(/\^\{([^{}]*)\}/g, '<sup>$1</sup>');
  s = s.replace(/\^\(([^()]*)\)/g, '<sup>$1</sup>');
  s = s.replace(/\^(-?\d+\/\d+)/g, '<sup>$1</sup>');
  s = s.replace(/\^(-?\d+(?:\.\d+)?)/g, '<sup>$1</sup>');
  s = s.replace(/\^([a-zA-Z])(?![a-zA-Z0-9])/g, '<sup>$1</sup>');

  // Subscripts (future-proofing, e.g. x_1, T_D)
  s = s.replace(/_\{([^{}]*)\}/g, '<sub>$1</sub>');
  s = s.replace(/_(-?\d+)/g, '<sub>$1</sub>');

  return s;
}
// Bulk-imported quiz JSON usually stores the whole solution as ONE long
// string with no real line breaks (e.g. "In ΔABD tanθ = ... ...(i) In ΔEBC
// ... ...(ii) From eq. (i) and (ii) 9.45x = 1.35x + 60.75 ..."). That renders
// as a single dense paragraph, hard to follow. This splits it into readable
// step-lines automatically — global so every quiz module (current and any
// added later) can call it — without the source data needing real newlines.
// If the text already has \n's, those are respected as-is. Otherwise breaks
// are inserted at natural step boundaries: before every "=>" arrow, and
// after sentence-ending periods (periods immediately followed by a space,
// which decimals like "9.45" never are, so numbers stay untouched).
function formatSolSteps(text){
  const raw = String(text || '');
  if(!raw.trim()) return '';
  let lines;
  if(raw.indexOf('\n') !== -1){
    lines = raw.split('\n');
  } else {
    const t = raw
      .replace(/\s*=>\s*/g, '\n=> ')
      .replace(/\.\.\.\([ivxIVX]+\)\s+/g, m => m.trim() + '\n')
      .replace(/(?<!\d)(?<!\beq)(?<!\bNo)\.\s+(?=[A-Z(])/g, '.\n');
    lines = t.split('\n');
  }
  lines = lines.map(s => s.trim()).filter(Boolean);
  if(!lines.length) return '';
  return lines.map(ln => '<div class="dsStepLine">' + mathify(ln) + '</div>').join('');
}

// Single source of truth for a day's earned/lost amounts.
// A rest day never contributes to either earned or lost.
// dayIndex is optional: pass it (the Day N this data belongs to) to get
// today's not-yet-due tasks correctly bucketed as "pending" instead of an
// instant loss the moment the day starts. Omit it for old strict behaviour.
function dayEarnLoss(d, dayIndex){
  if(d.rest) return {earned:0, lost:0, pending:0};
  let earned=0, lost=0, pending=0;
  const values = dayTaskValues(d);
  d.tasks.forEach((checked, idx)=>{
    const v = values[idx];
    if(checked){ earned += v; return; }
    if(dayIndex===undefined || isTaskDue(dayIndex, TASK_START_MIN[idx], TASK_DURATIONS_MIN[idx])){
      lost += v;
    } else {
      pending += v;
    }
  });
  // Har quiz jo log ho chuki hai wo already complete maani jaati hai —
  // uska slice hamesha "earned" mein jaata hai, kabhi lost/pending mein nahi.
  const quizList = Array.isArray(d.quizLog) ? d.quizLog : [];
  quizList.forEach((q, qi)=>{ earned += (values[TASKS.length+qi] || 0); });
  return { earned, lost, pending };
}

// A day counts as "touched" if the user has actually interacted with it —
// checked a task, marked it rest, entered a score, or written a note.
// This lets us count earning/loss for every day the user has filled in,
// instead of being limited to how many real calendar days have passed.
function isDayTouched(d){
  if(d.rest) return true;
  if(d.tasks.some(Boolean)) return true;
  if(hasVal(d.mock.math)||hasVal(d.mock.reasoning)||hasVal(d.mock.english)||hasVal(d.mock.gk)||hasVal(d.mock.percentile)||hasVal(d.mock.wrongMath)||hasVal(d.mock.wrongReasoning)||hasVal(d.mock.wrongEnglish)||hasVal(d.mock.wrongGk)) return true;
  if(Object.keys(d.sect).some(k=>hasVal(d.sect[k]))) return true;
  if(d.sectDetail && Object.keys(d.sectDetail).some(k=>{ const sd=d.sectDetail[k]; return sd && (hasVal(sd.right)||hasVal(sd.wrong)||hasVal(sd.skip)||(Array.isArray(sd.chapters)&&sd.chapters.length)); })) return true;
  if(d.notes && d.notes.trim()) return true;
  if(d.mistakes && d.mistakes.trim()) return true;
  return false;
}
// The furthest day the user has actually put any data into. Earned/Lost
// and related totals are counted across every day up to this point —
// so a day you left tasks unchecked still counts as a loss, no matter
// how many days you fill in during one sitting.
function activeUptoDay(){
  const tn = todayDayNum();
  let max = tn; // never less than the real-world "today", so day 1 still shows up on a fresh start
  for(let i=1;i<=TOTAL_DAYS;i++){
    if(isDayTouched(getDay(i))) max = Math.max(max, i);
  }
  return max;
}

// ===== Sync Room: Firebase Realtime Database backend =====
// A "Room Code" is basically a lightweight login: whoever has the code
// can read/write the same shared room. This is what makes sync work
// in Chrome (or any browser, any device) — not just inside Claude.
// Only ONE group is allowed to exist for this app — everyone who opens
// the app is placed into this same fixed room, always. There is no
// "create room", no "join a different room", and no "solo / no room"
// state anymore — getRoomCode() simply always returns this fixed code,
// ignoring whatever (if anything) is in localStorage.
const FIXED_ROOM_CODE = 'b0bb1ba85948456aa334';
let roomSyncTimer = null;
function getRoomCode(){
  return FIXED_ROOM_CODE;
}
// Reads ?room=CODE (or ?code=CODE) from the URL — this is what lets a
// shared link auto-join someone into a group instead of them having to
// copy-paste a Room Code by hand. Share links like:
//   https://yourhost.com/cgl_tracker.html?room=ABCD1234
function getUrlRoomCode(){
  try{
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') || params.get('code') || '').trim();
  }catch(e){ return ''; }
}
function setRoomCode(code){
  try{ localStorage.setItem('cgl50-room-code', (code||'').trim()); }catch(e){}
}
function clearRoomCode(){
  try{ localStorage.removeItem('cgl50-room-code'); }catch(e){}
}
// Waits for the Firebase module <script> (loaded at the top of <body>) to
// finish loading + signing in anonymously, however long that takes.
async function waitForFirebase(timeoutMs=10000){
  const start = Date.now();
  while(!(window.__fbGet && window.__fbSet && window.__fbNewId && window.__fbReadyPromise && window.__fbListenReady && window.__fbPush)){
    if(Date.now()-start > timeoutMs) throw new Error('Firebase load nahi ho paya (timeout) — page reload karo.');
    await new Promise(r=>setTimeout(r,50));
  }
  await window.__fbReadyPromise;
}
async function kvdbCreateRoom(){
  try{
    await waitForFirebase();
    const id = window.__fbNewId();
    await window.__fbSet(`rooms/${id}/_created`, Date.now());
    // Whoever creates the room is its Admin from the very first moment —
    // set directly here (getRoomCode() isn't pointed at this new id yet,
    // so kvdbSet can't be used for this one call).
    await window.__fbSet(`rooms/${id}/_meta`, JSON.stringify({ admin: myName, hidden: {}, restricted: {}, taskMode: 'individual' }));
    return { ok:true, id };
  }catch(e){
    console.error('room create failed', e);
    return { ok:false, error: (e && e.message) ? e.message : String(e) };
  }
}
// Both kvdbGet/kvdbSet retry a few times with a short backoff before
// giving up. A thrown error here is always a genuine failure (offline,
// timeout, permission) — Firebase's "key doesn't exist" case never
// throws, it just resolves with an empty snapshot — so retrying only
// ever helps with real transient blips, never masks a real "not found".
// This matters a lot on patchy mobile data: without retries, a single
// dropped request during app-open could look identical to "this player
// has no data yet" and fall through to a blank/stale local copy.
async function kvdbGet(key){
  const room = getRoomCode();
  if(!room) return null;
  const path = `rooms/${room}/${encodeURIComponent(key)}`;
  let lastErr = null;
  for(let attempt=0; attempt<3; attempt++){
    try{
      await waitForFirebase();
      const val = await window.__fbGet(path);
      if(val === null || val === undefined) return null;
      return typeof val === 'string' ? val : JSON.stringify(val);
    }catch(e){
      lastErr = e;
      if(attempt < 2) await new Promise(r=>setTimeout(r, 400*(attempt+1)));
    }
  }
  console.error('firebase get failed after retries', lastErr);
  return null;
}
async function kvdbSet(key, value){
  const room = getRoomCode();
  if(!room) return false;
  const path = `rooms/${room}/${encodeURIComponent(key)}`;
  let lastErr = null;
  for(let attempt=0; attempt<3; attempt++){
    try{
      await waitForFirebase();
      await window.__fbSet(path, value);
      return true;
    }catch(e){
      lastErr = e;
      if(attempt < 2) await new Promise(r=>setTimeout(r, 400*(attempt+1)));
    }
  }
  console.error('firebase set failed after retries', lastErr);
  return false;
}

// ===== Offline write queue =====
// save() always writes to localStorage FIRST (below), so a task-tick on a
// dead connection (metro, elevator, patchy data) is never lost on THIS
// device — but if the Firebase push in save() fails, nobody else's phone
// (and no other device of this same person) sees that update until it's
// retried. This queue remembers "this player's room-key still needs a
// push", persists across app close/reopen (localStorage), and keeps
// retrying in the background — on the browser's 'online' event AND on a
// plain timer (mobile 'online' events are unreliable — a phone can report
// "online" while still having no real signal) — until every entry syncs.
const PENDING_SYNC_KEY = 'cgl50-pending-sync-keys';
function getPendingSyncKeys(){
  try{
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}
function setPendingSyncKeys(arr){
  try{ localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(arr)); }catch(e){}
}
function markPendingSync(room, targetName){
  const entry = room + '::' + targetName.trim().toLowerCase();
  const cur = getPendingSyncKeys();
  const wasEmpty = cur.length===0;
  if(!cur.includes(entry)){ cur.push(entry); setPendingSyncKeys(cur); }
  updateSyncStatusIndicator();
  if(wasEmpty){
    showAntiCheatToast('📡 Network weak — data safe hai is phone par, connection wapas aate hi sync ho jayega.');
  }
}
function clearPendingSync(room, targetName){
  const entry = room + '::' + targetName.trim().toLowerCase();
  const cur = getPendingSyncKeys();
  if(!cur.includes(entry)) return;
  setPendingSyncKeys(cur.filter(e=>e!==entry));
  updateSyncStatusIndicator();
}
function updateSyncStatusIndicator(){
  const badge = document.getElementById('syncPendingBadge');
  if(!badge) return;
  const count = getPendingSyncKeys().length;
  if(count>0){
    badge.textContent = count===1 ? '⏳ Sync pending' : `⏳ ${count} syncs pending`;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}
let pendingSyncFlushInFlight = false;
async function flushPendingSyncQueue(){
  if(pendingSyncFlushInFlight) return;
  const queue = getPendingSyncKeys();
  if(!queue.length) return;
  pendingSyncFlushInFlight = true;
  try{
    const room = getRoomCode();
    let anySynced = false;
    for(const entry of queue){
      const sepIdx = entry.indexOf('::');
      const entryRoom = entry.slice(0, sepIdx);
      const targetName = entry.slice(sepIdx+2);
      if(!targetName || entryRoom !== room){
        // Stale entry from a room this device isn't in anymore — nothing
        // sane to retry it against, drop it rather than retry forever.
        clearPendingSync(entryRoom, targetName || '');
        continue;
      }
      // Always push whatever's freshest in localStorage right now (not a
      // stale snapshot from the moment it failed) — if more ticks happened
      // on this device while offline, this picks up every one of them.
      const key = localPlayerKey(targetName);
      let json = null;
      try{ json = localStorage.getItem(key); }catch(e){}
      if(!json){ clearPendingSync(room, targetName); continue; }
      const ok = await kvdbSet(playerKey(targetName), json);
      if(ok){ clearPendingSync(room, targetName); anySynced = true; }
    }
    if(anySynced && getPendingSyncKeys().length===0){
      showAntiCheatToast('✅ Connection wapas aa gaya — sab kuch sync ho gaya.');
    }
  } finally { pendingSyncFlushInFlight = false; }
}
function startPendingSyncWatcher(){
  updateSyncStatusIndicator();
  window.addEventListener('online', ()=>{ flushPendingSyncQueue(); });
  // Backstop for mobile browsers where 'online' fires unreliably (or not
  // at all) — a plain timer eventually catches every case regardless.
  setInterval(()=>{ flushPendingSyncQueue(); }, 20000);
}
async function addToRoomRegistry(name){
  const room = getRoomCode();
  if(!room) return;
  try{
    const raw = await kvdbGet('_registry');
    let list = [];
    if(raw){ try{ list = JSON.parse(raw); }catch(e){ list=[]; } }
    if(!Array.isArray(list)) list = [];
    if(!list.some(n=>n.toLowerCase()===name.toLowerCase())){
      list.push(name);
      await kvdbSet('_registry', JSON.stringify(list));
      roomRegistryCacheAt = 0; // force a fresh fetch next call
    }
  }catch(e){ console.error('room registry update failed', e); }
}
let roomRegistryCache = null;
let roomRegistryCacheAt = 0;
let roomRegistryCacheRoom = null;
async function loadRoomRegistry(){
  const room = getRoomCode();
  if(!room) return [];
  // Perf: presence updates arrive every ~15s from EACH person in the room,
  // and every one of them was re-fetching this same list from Firebase.
  // With a few friends online that's a network round-trip every few
  // seconds, which is a big chunk of the recurring lag. Cache it briefly.
  if(roomRegistryCache && roomRegistryCacheRoom===room && (Date.now()-roomRegistryCacheAt) < 8000){
    return roomRegistryCache;
  }
  const raw = await kvdbGet('_registry');
  let list = [];
  if(raw){ try{ const parsed = JSON.parse(raw); list = Array.isArray(parsed) ? parsed : []; }catch(e){ list = []; } }
  roomRegistryCache = list;
  roomRegistryCacheAt = Date.now();
  roomRegistryCacheRoom = room;
  return list;
}
// ===== Group Admin + Per-Member Visibility =====
// Whoever creates a Sync Room is that room's Admin (stored once, at
// creation, in rooms/{room}/_meta). The Admin can mark any member
// "hidden" — a hidden member's name/progress disappears from the
// leaderboard for everyone except the Admin and that member themselves.
// Both admin + hidden-map live together under one `_meta` key (instead of
// two separate keys) so refreshing them costs one network round-trip
// instead of two — this matters because it's re-checked on every
// leaderboard render / auto-sync tick.
let roomMetaCache = null;
let roomMetaCacheAt = 0;
let roomMetaCacheRoom = null;
async function loadRoomMeta(){
  const room = getRoomCode();
  if(!room) return { admin:null, subAdmin:null, hidden:{}, restricted:{}, taskMode:'individual' };
  if(roomMetaCache && roomMetaCacheRoom===room && (Date.now()-roomMetaCacheAt) < 8000){
    return roomMetaCache;
  }
  const raw = await kvdbGet('_meta');
  let meta = { admin:null, subAdmin:null, hidden:{}, restricted:{}, taskMode:'individual' };
  if(raw){
    try{
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed==='object'){
        meta = {
          admin: parsed.admin || null,
          subAdmin: parsed.subAdmin || null,
          hidden: (parsed.hidden && typeof parsed.hidden==='object') ? parsed.hidden : {},
          restricted: (parsed.restricted && typeof parsed.restricted==='object') ? parsed.restricted : {},
          taskMode: (parsed.taskMode==='shared') ? 'shared' : 'individual'
        };
      }
    }catch(e){ /* keep default on bad/legacy data */ }
  }
  roomMetaCache = meta;
  roomMetaCacheAt = Date.now();
  roomMetaCacheRoom = room;
  return meta;
}
async function setRoomAdmin(name){
  const room = getRoomCode();
  if(!room) return;
  const meta = await loadRoomMeta();
  const updated = { admin: name, subAdmin: meta.subAdmin || null, hidden: meta.hidden || {}, restricted: meta.restricted || {}, taskMode: meta.taskMode || 'individual' };
  await kvdbSet('_meta', JSON.stringify(updated));
  roomMetaCache = updated; roomMetaCacheAt = Date.now(); roomMetaCacheRoom = room;
}
// ===== Sub-Admin (backup Admin) =====
// The Admin can name exactly one other member as Sub-Admin. This app has no
// login system, so there's no way to automatically detect "the Admin's
// account/phone stopped working" — instead, the Admin sets this up in
// advance as a deliberate trust handoff: the Sub-Admin gets a "Take Over as
// Admin" button (see promoteSubAdminToAdmin) they can use themselves,
// whenever they judge it's needed, without the original Admin's help.
// Admin-only action. Passing null/'' clears the Sub-Admin.
async function setRoomSubAdmin(name){
  const room = getRoomCode();
  if(!room) return;
  const meta = await loadRoomMeta();
  const updated = { admin: meta.admin || null, subAdmin: name || null, hidden: meta.hidden || {}, restricted: meta.restricted || {}, taskMode: meta.taskMode || 'individual' };
  await kvdbSet('_meta', JSON.stringify(updated));
  roomMetaCache = updated; roomMetaCacheAt = Date.now(); roomMetaCacheRoom = room;
}
// Self-service takeover: only works for whoever is currently named
// Sub-Admin, and only for themselves (checked against myName, not passed
// in). Promotes them straight to full Admin and clears the Sub-Admin slot —
// the new Admin can name a fresh Sub-Admin afterwards if they want one.
async function promoteSubAdminToAdmin(){
  const room = getRoomCode();
  if(!room) return;
  const meta = await loadRoomMeta();
  if(!meta.subAdmin || !myName || meta.subAdmin.toLowerCase()!==myName.toLowerCase()) return;
  const updated = { admin: myName, subAdmin: null, hidden: meta.hidden || {}, restricted: meta.restricted || {}, taskMode: meta.taskMode || 'individual' };
  await kvdbSet('_meta', JSON.stringify(updated));
  roomMetaCache = updated; roomMetaCacheAt = Date.now(); roomMetaCacheRoom = room;
}
async function setMemberHidden(name, hidden){
  const room = getRoomCode();
  if(!room) return;
  const meta = await loadRoomMeta();
  const key = chatSeenKey(name);
  const updatedHidden = { ...(meta.hidden||{}), [key]: !!hidden };
  const updated = { admin: meta.admin || null, subAdmin: meta.subAdmin || null, hidden: updatedHidden, restricted: meta.restricted || {}, taskMode: meta.taskMode || 'individual' };
  await kvdbSet('_meta', JSON.stringify(updated));
  roomMetaCache = updated; roomMetaCacheAt = Date.now(); roomMetaCacheRoom = room;
}
// Admin-only "solitary view" lock: a restricted member's OWN view of the
// app (leaderboard rows, everywhere visibleNamesFor() is used) is limited
// to just themselves + the Admin — they can't see any other member
// anywhere, even ones who aren't individually hidden.
async function setMemberRestricted(name, restricted){
  const room = getRoomCode();
  if(!room) return;
  const meta = await loadRoomMeta();
  const key = chatSeenKey(name);
  const updatedRestricted = { ...(meta.restricted||{}), [key]: !!restricted };
  const updated = { admin: meta.admin || null, subAdmin: meta.subAdmin || null, hidden: meta.hidden || {}, restricted: updatedRestricted, taskMode: meta.taskMode || 'individual' };
  await kvdbSet('_meta', JSON.stringify(updated));
  roomMetaCache = updated; roomMetaCacheAt = Date.now(); roomMetaCacheRoom = room;
}
// Admin-only toggle: 'individual' (default) = every member customizes their
// own task list, exactly like before. 'shared' = the Admin's task list
// (name/start/duration) is pushed to rooms/{room}/_sharedTasks and every
// member's app automatically applies it — nobody else can edit tasks while
// this mode is on, and it self-refreshes every auto-sync tick (~25s) so an
// Admin edit shows up for everyone without anyone reloading the page.
async function setRoomTaskMode(mode){
  const room = getRoomCode();
  if(!room) return;
  const meta = await loadRoomMeta();
  const updated = { admin: meta.admin || null, subAdmin: meta.subAdmin || null, hidden: meta.hidden || {}, restricted: meta.restricted || {}, taskMode: (mode==='shared') ? 'shared' : 'individual' };
  await kvdbSet('_meta', JSON.stringify(updated));
  roomMetaCache = updated; roomMetaCacheAt = Date.now(); roomMetaCacheRoom = room;
}
// ===== Pinned Admin Announcement (shown to everyone on the Home tab) =====
// Stored at its own key (rooms/{room}/_announcement) instead of inside
// _meta, so posting/clearing it can never collide with or accidentally
// clobber the admin/hidden/restricted/taskMode writes above.
// { text, at, by } — null/no key means "nothing pinned right now".
let roomAnnouncementCache = undefined;
let roomAnnouncementCacheAt = 0;
let roomAnnouncementCacheRoom = null;
async function loadRoomAnnouncement(){
  const room = getRoomCode();
  if(!room) return null;
  if(roomAnnouncementCache !== undefined && roomAnnouncementCacheRoom===room && (Date.now()-roomAnnouncementCacheAt) < 8000){
    return roomAnnouncementCache;
  }
  const raw = await kvdbGet('_announcement');
  let ann = null;
  if(raw){
    try{
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed==='object' && parsed.text) ann = { text: String(parsed.text), at: parsed.at || Date.now(), by: parsed.by || '' };
    }catch(e){ /* keep null on bad/legacy data */ }
  }
  roomAnnouncementCache = ann;
  roomAnnouncementCacheAt = Date.now();
  roomAnnouncementCacheRoom = room;
  return ann;
}
// Admin-only. Passing an empty/blank string clears the pinned announcement.
async function setRoomAnnouncement(text){
  const room = getRoomCode();
  if(!room) return;
  const trimmed = (text||'').trim();
  const payload = trimmed ? { text: trimmed, at: Date.now(), by: myName } : null;
  await kvdbSet('_announcement', payload ? JSON.stringify(payload) : null);
  roomAnnouncementCache = payload;
  roomAnnouncementCacheAt = Date.now();
  roomAnnouncementCacheRoom = room;
}

// ===== Auto-Resetting "Today" & "This Week" Leaderboards =====
// No admin action needed and nothing is stored for these two views. Every
// member's per-day data (tasks/rest/notes, keyed by day number 1..50) maps
// 1:1 to a real calendar date via START_DATE — see fmtDate()/todayDayNum()
// above — so we simply recompute stats over whichever day-range the clock
// currently points at:
//   "Today"      → just today's single day-number.
//   "This Week"  → the current Mon–Sun calendar week, so far.
// Both naturally "reset" the instant the date rolls over, because the
// range itself shifts — there's no snapshot to take or button to click.
// Kept only for backwards-compatible cache-busting of old backup restores;
// the room-level `_weeklyReset` key itself is legacy and no longer read.
let weeklyResetCache = undefined;
let weeklyResetCacheAt = 0;
let weeklyResetCacheRoom = null;
// Maps a real Date to its plan day-number (inverse of fmtDate()).
function dayIndexForDate(date){
  const d0 = new Date(date.toDateString());
  const start0 = new Date(START_DATE.toDateString());
  return Math.floor((d0-start0)/86400000)+1;
}
// [from,to] day-number range (inclusive) for the current Mon–Sun calendar
// week, clamped so it never reaches into "future" days beyond today.
function thisWeekDayRange(){
  const now = new Date();
  const dow = now.getDay(); // 0=Sun..6=Sat
  const sinceMonday = dow===0 ? 6 : dow-1;
  const monday = new Date(now);
  monday.setDate(now.getDate()-sinceMonday);
  const from = dayIndexForDate(monday);
  const to = todayDayNum();
  return { from: Math.max(1, Math.min(from,to)), to: Math.min(TOTAL_DAYS, to) };
}
// Same pure per-day math as computeStatsFrom(), but summed only over
// [fromIdx,toIdx] instead of the whole 50-day plan. Powers both "Today"
// (fromIdx===toIdx===todayDayNum()) and "This Week" leaderboard rows.
function computeRangeStatsFrom(st, fromIdx, toIdx){
  const taskCount = taskCountFrom(st);
  let totalChecked=0, totalPossible=0, studyMins=0, earned=0, lost=0, daysDone=0;
  const lo = Math.max(1, fromIdx), hi = Math.min(TOTAL_DAYS, toIdx);
  for(let i=lo;i<=hi;i++){
    const d = getDayFrom(st,i);
    if(d.rest) continue;
    const done = d.tasks.filter(Boolean).length;
    totalChecked += done; totalPossible += taskCount;
    if(done===taskCount) daysDone++;
    const r = dayEarnLossFrom(st, d, i);
    earned += r.earned; lost += r.lost;
    studyMins += dayStudyMinutesFrom(st, d);
  }
  const pct = totalPossible ? Math.round((totalChecked/totalPossible)*100) : 0;
  return { daysDone, pct, studyMins, earned, lost };
}

// Removes a member from the room entirely: drops them from the shared
// member registry (so they vanish from everyone's leaderboard),
// clears any hidden/restricted flags stored against their name, and wipes
// their synced tracker data from this room. Admin-only action.
async function deleteRoomMember(name){
  const room = getRoomCode();
  if(!room) return;
  const raw = await kvdbGet('_registry');
  let list = [];
  if(raw){ try{ list = JSON.parse(raw); }catch(e){ list=[]; } }
  if(!Array.isArray(list)) list = [];
  list = list.filter(n=> n.toLowerCase()!==name.toLowerCase());
  await kvdbSet('_registry', JSON.stringify(list));
  roomRegistryCache = list; roomRegistryCacheAt = Date.now(); roomRegistryCacheRoom = room;

  const meta = await loadRoomMeta();
  const key = chatSeenKey(name);
  const updatedHidden = { ...(meta.hidden||{}) }; delete updatedHidden[key];
  const updatedRestricted = { ...(meta.restricted||{}) }; delete updatedRestricted[key];
  // If the removed member was the Sub-Admin, that slot has to go too —
  // otherwise a deleted member's name would still sit there as a "backup
  // Admin" that can never actually log in to claim it.
  const stillValidSubAdmin = (meta.subAdmin && meta.subAdmin.toLowerCase()!==name.toLowerCase()) ? meta.subAdmin : null;
  const updated = { admin: meta.admin || null, subAdmin: stillValidSubAdmin, hidden: updatedHidden, restricted: updatedRestricted, taskMode: meta.taskMode || 'individual' };
  await kvdbSet('_meta', JSON.stringify(updated));
  roomMetaCache = updated; roomMetaCacheAt = Date.now(); roomMetaCacheRoom = room;

  await kvdbSet(playerKey(name), null);
}
// Kept in sync by refreshRoomMeta() and read synchronously everywhere else,
// so render functions never have to be made async just to check admin status.
let currentRoomAdmin = null;
let currentRoomSubAdmin = null;
let currentRoomHidden = {};
let currentRoomRestricted = {};
let currentRoomTaskMode = 'individual';
let currentRoomAnnouncement = null;
async function refreshRoomMeta(){
  if(!getRoomCode()){
    currentRoomAdmin = null; currentRoomSubAdmin = null; currentRoomHidden = {}; currentRoomRestricted = {}; currentRoomTaskMode = 'individual';
    currentRoomAnnouncement = null; lastAppliedSharedTasksJSON = null;
    updateAdminPanelBtnVisibility();
    return;
  }
  // Fired together — each is independently 8s-cached, so this stays one
  // effective round-trip per tick instead of stacking up latency.
  const [meta, ann] = await Promise.all([ loadRoomMeta(), loadRoomAnnouncement() ]);
  currentRoomAdmin = meta.admin || null;
  currentRoomSubAdmin = meta.subAdmin || null;
  currentRoomHidden = meta.hidden || {};
  currentRoomRestricted = meta.restricted || {};
  currentRoomTaskMode = meta.taskMode || 'individual';
  currentRoomAnnouncement = ann;
  updateAdminPanelBtnVisibility();
}
function isMeAdmin(){ return !!(currentRoomAdmin && myName && currentRoomAdmin.toLowerCase()===myName.toLowerCase()); }
// True only for the one member the Admin has designated as Sub-Admin —
// powers the "Take Over as Admin" button in the Room panel below.
function isMeSubAdmin(){ return !!(currentRoomSubAdmin && myName && currentRoomSubAdmin.toLowerCase()===myName.toLowerCase()); }
// True only when the Admin is looking at a DIFFERENT member's tracker in a
// Sync Room — this is what unlocks the "edit someone else's tasks" powers
// below. Being admin alone isn't enough (still read-only on your own
// tracker view trivially, since that's always "yours"), and being in a
// room alone isn't enough either — has to be both admin AND viewing someone
// else's data.
function canAdminEditViewed(){
  return !!(getRoomCode() && isMeAdmin() && viewingName && myName && viewingName.toLowerCase()!==myName.toLowerCase());
}
// Explicit per-view safety switch: even when canAdminEditViewed() is true,
// inputs stay disabled until the Admin deliberately flips this on for the
// member they're currently looking at (see the banner/button in
// renderPanel()). Reset to off on every switchViewing() call so accidentally
// tapping "👀 View" on the leaderboard never silently leaves edit mode on
// for the next member browsed.
let adminEditModeOn = false;
// True only when we're in a Sync Room AND the Admin has switched Task Mode
// to "shared" — i.e. one task list applies to every member automatically.
function isSharedTaskMode(){ return !!(getRoomCode() && currentRoomTaskMode === 'shared'); }
function isHiddenFromOthers(name){ return !!currentRoomHidden[chatSeenKey(name)]; }
function isRestrictedToSelf(name){ return !!currentRoomRestricted[chatSeenKey(name)]; }
function amIRestrictedToSelf(){ return isRestrictedToSelf(myName); }
// Filters a name list down to what the CURRENT viewer is allowed to see:
// - Admin sees everyone.
// - A viewer the Admin has "restricted" sees ONLY themselves + the Admin,
//   no matter who else is in the list.
// - Everyone else sees everyone except members marked hidden (they can
//   still always see themselves).
function visibleNamesFor(names){
  if(isMeAdmin()) return names;
  if(amIRestrictedToSelf()){
    return names.filter(n=> n.toLowerCase()===myName.toLowerCase() || (currentRoomAdmin && n.toLowerCase()===currentRoomAdmin.toLowerCase()));
  }
  return names.filter(n=> n.toLowerCase()===myName.toLowerCase() || !isHiddenFromOthers(n));
}

let roomSyncInFlight = false;
function startRoomAutoSync(){
  if(roomSyncTimer){ clearInterval(roomSyncTimer); roomSyncTimer = null; }
  if(!getRoomCode()) return;
  roomSyncTimer = setInterval(async ()=>{
    // Perf: on a slow/spotty connection a tick can take longer than 25s —
    // skip overlapping runs instead of letting them stack up and compete
    // for the network + main thread at the same time.
    if(roomSyncInFlight) return;
    roomSyncInFlight = true;
    try{
      await renderCompetePanel();
      if(viewingName !== myName){
        state = await loadPlayerState(viewingName);
        applyLoadedExtras();
        await ensureQuizDetailStoreForCurrentViewer();
        renderAll();
      } else if(stateReady){
        // Pull in whatever other devices have written for MY OWN profile
        // since I last loaded, using the same safe merge save() uses —
        // this is what makes multi-device use actually work: without it,
        // a change made on phone A would only ever reach phone B once
        // phone B happened to save something of its own.
        const merged = await mergeWithRemoteBeforeSave(state);
        if(JSON.stringify(merged) !== JSON.stringify(state)){
          state = merged;
          applyLoadedExtras();
          snapshotLoadedStateKeys();
          renderAll();
        }
      }
    }catch(e){ console.error('auto sync tick failed', e); }
    finally{ roomSyncInFlight = false; }
  }, 25000);
}

// ===== Multiplayer: per-player shared storage =====
// Every player's tracker lives under its own key, but marked "shared" so
// a friend who knows your exact name can load and view (read-only) the
// same data. Nobody but the owner ever writes to their own key.
// NOTE: this plain name-only key is what Firebase (kvdbGet/kvdbSet) uses —
// that's already safe because kvdbGet/kvdbSet nest it under a
// rooms/{room}/... path. Do NOT use this key directly for window.storage
// or localStorage — use localPlayerKey() below instead, which is what
// actually scopes those two shared/local fallbacks so two different
// people with the same name never collide.
function playerKey(name){ return 'cgl50-state:' + name.trim().toLowerCase(); }

// Stable per-device ID, generated once and cached in localStorage. Used to
// scope the window.storage/localStorage key for solo players (no Sync
// Room joined) so that two different solo users who happen to type the
// same name don't overwrite each other's data in the shared bucket.
function getOrCreateDeviceId(){
  let id = null;
  try{ id = localStorage.getItem('cgl50-device-id'); }catch(e){}
  if(!id){
    id = 'dev-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try{ localStorage.setItem('cgl50-device-id', id); }catch(e){}
  }
  return id;
}

// Key used ONLY for window.storage (shared:true) and the localStorage
// fallback. Scoped by the Sync Room code when in a room, or by a stable
// per-device ID when solo — this is the actual collision fix, since the
// old plain playerKey(name) put every same-named player from every room
// (and every solo device) on the exact same shared window.storage key.
// Firebase stays untouched: kvdbGet/kvdbSet keep using playerKey(name)
// directly, since that path is already namespaced under rooms/{room}/...
function localPlayerKey(name){
  const room = getRoomCode();
  if(room) return 'cgl50-state:' + room + ':' + name.trim().toLowerCase();
  return 'cgl50-state:' + getOrCreateDeviceId() + ':' + name.trim().toLowerCase();
}

async function loadPlayerState(name){
  if(getRoomCode()){
    const raw = await kvdbGet(playerKey(name));
    if(raw){
      try{ return JSON.parse(raw); }catch(e){ /* fall through */ }
    }
  }
  const key = localPlayerKey(name);
  if(window.storage && typeof window.storage.get === 'function'){
    try{
      const res = await window.storage.get(key, true);
      if(res && res.value) return JSON.parse(res.value);
    }catch(e){ /* fall through */ }
  }
  try{
    const raw = localStorage.getItem(key);
    if(raw) return JSON.parse(raw);
  }catch(e){ /* ignore */ }
  return {};
}

// Before writing this device's `state` to the shared Firebase copy,
// pulls whatever's live there right now and folds this device's changes
// into it, instead of blindly replacing the whole thing.
//
// Why: plain last-write-wins meant opening the tracker on two phones was
// dangerous — this device's copy of `state` is a snapshot from whenever
// IT was last loaded, missing any day/mock/field a different device
// added since. A totally unrelated save on this device (e.g. renaming a
// task) would then push that stale snapshot and silently erase all of
// that newer data from Firebase. The merge:
//  - keeps anything remote that this device never loaded or touched
//  - applies every key this device currently has (its adds/edits win)
//  - only deletes a key if this device HAD it at last load and has since
//    deliberately removed it locally (e.g. archiving old days into
//    history) — a key this device never even saw is left untouched,
//    even though it's technically "missing" from the local copy
// Deep-merges ONE day's remote vs local copy so a tick/quiz made on either
// device never gets silently erased by the other saving afterward with a
// stale copy of that same day (see mergeWithRemoteBeforeSave below — the
// old code let the whole day object from whichever device saved LAST win,
// which is exactly what made two devices used the same day show different
// checkboxes). Only tasks/taskNotes/taskCheckedAt/quizLog get this deep
// treatment; every other per-day field (mock scores, notes, rest flag,
// studyMin...) still uses simple last-write-wins at the whole-day level.
function mergeDayObjects(remoteDay, localDay){
  if(!remoteDay || typeof remoteDay !== 'object') return localDay;
  if(!localDay || typeof localDay !== 'object') return remoteDay;
  const merged = Object.assign({}, remoteDay, localDay);
  const rTasks = Array.isArray(remoteDay.tasks) ? remoteDay.tasks : [];
  const lTasks = Array.isArray(localDay.tasks) ? localDay.tasks : [];
  const len = Math.max(rTasks.length, lTasks.length);
  if(len > 0){
    const rNotes = Array.isArray(remoteDay.taskNotes) ? remoteDay.taskNotes : [];
    const lNotes = Array.isArray(localDay.taskNotes) ? localDay.taskNotes : [];
    const rAt = Array.isArray(remoteDay.taskCheckedAt) ? remoteDay.taskCheckedAt : [];
    const lAt = Array.isArray(localDay.taskCheckedAt) ? localDay.taskCheckedAt : [];
    const mergedTasks = new Array(len).fill(false);
    const mergedNotes = new Array(len).fill('');
    const mergedAt = new Array(len).fill(null);
    for(let i=0;i<len;i++){
      const rOn = !!rTasks[i], lOn = !!lTasks[i];
      // Once ticked on EITHER device, it stays ticked — this is the actual fix.
      mergedTasks[i] = rOn || lOn;
      if(rOn && lOn){
        const rt = rAt[i] || 0, lt = lAt[i] || 0;
        if(lt >= rt){ mergedNotes[i] = lNotes[i] || rNotes[i] || ''; mergedAt[i] = lAt[i] || rAt[i] || null; }
        else { mergedNotes[i] = rNotes[i] || lNotes[i] || ''; mergedAt[i] = rAt[i] || lAt[i] || null; }
      } else if(lOn){
        mergedNotes[i] = lNotes[i] || ''; mergedAt[i] = lAt[i] || null;
      } else if(rOn){
        mergedNotes[i] = rNotes[i] || ''; mergedAt[i] = rAt[i] || null;
      } else {
        mergedNotes[i] = lNotes[i] || rNotes[i] || ''; mergedAt[i] = lAt[i] || rAt[i] || null;
      }
    }
    merged.tasks = mergedTasks;
    merged.taskNotes = mergedNotes;
    merged.taskCheckedAt = mergedAt;
  }
  // quizLog: union of both sides, deduped by label+correct+total+ts, so a
  // Learn-tab/Calc quiz logged on one device never disappears because the
  // other device saved afterward with a copy from before that quiz existed.
  const rLog = Array.isArray(remoteDay.quizLog) ? remoteDay.quizLog : [];
  const lLog = Array.isArray(localDay.quizLog) ? localDay.quizLog : [];
  if(rLog.length || lLog.length){
    const seen = new Set();
    const mergedLog = [];
    rLog.concat(lLog).forEach(q=>{
      if(!q) return;
      const key = (q.label||'')+'|'+q.correct+'|'+q.total+'|'+(q.ts||'');
      if(seen.has(key)) return;
      seen.add(key);
      mergedLog.push(q);
    });
    mergedLog.sort((a,b)=> (a.ts||0)-(b.ts||0));
    merged.quizLog = mergedLog;
  }
  return merged;
}
async function mergeWithRemoteBeforeSave(localState, name){
  const targetName = name || myName;
  try{
    const raw = await kvdbGet(playerKey(targetName));
    if(!raw) return localState;
    const remote = JSON.parse(raw);
    if(!remote || typeof remote !== 'object' || Array.isArray(remote)) return localState;
    const merged = Object.assign({}, remote, localState);
    // Day entries (numeric keys) that BOTH sides have get a deep merge
    // instead of the local copy blindly winning whole — see mergeDayObjects().
    Object.keys(merged).forEach(k=>{
      if(/^\d+$/.test(k) && remote[k] && localState[k]){
        merged[k] = mergeDayObjects(remote[k], localState[k]);
      }
    });
    // quizAttempted lives at the top level (not inside a numbered day), so
    // it needs its own union-merge here — otherwise a ✅ tick made on one
    // device could get silently erased if the other device saves afterward
    // with a stale copy of this map (same problem mergeDayObjects() above
    // already solves for tasks/quizLog). This map is tiny (just set-key
    // strings), so keeping it in state is cheap — unlike the full review
    // data (scores/answers/explanations), which lives in its own separate,
    // lightweight quizDetailStore/saveQuizAttemptDetailStore() instead, so
    // routine saves here don't have to carry that bulk every time.
    if(remote.quizAttempted && localState.quizAttempted){
      const mergedAttempted = {};
      new Set([...Object.keys(remote.quizAttempted), ...Object.keys(localState.quizAttempted)]).forEach(p=>{
        const rArr = Array.isArray(remote.quizAttempted[p]) ? remote.quizAttempted[p] : [];
        const lArr = Array.isArray(localState.quizAttempted[p]) ? localState.quizAttempted[p] : [];
        mergedAttempted[p] = Array.from(new Set([...rArr, ...lArr]));
      });
      merged.quizAttempted = mergedAttempted;
    }
    lastLoadedStateKeys.forEach(k=>{ if(!(k in localState)) delete merged[k]; });
    return merged;
  }catch(e){ console.error('pre-save merge failed', e); return localState; }
}


async function save(opts){
  opts = opts || {};
  // Normally only the owner's own key is ever written. The one exception:
  // the Admin has explicitly flipped Edit Mode on while looking at another
  // member's tracker — in that case `state` holds THAT member's data (see
  // switchViewing) and every write below targets THEIR key, never myName's.
  const editingOther = canAdminEditViewed() && adminEditModeOn;
  if(viewingName !== myName && !editingOther) return;
  // Never write before a load has actually finished — see stateReady's
  // declaration for why this matters (stops a blank/half-loaded state
  // from ever being persisted anywhere, including Firebase).
  if(!stateReady) return;
  const targetName = editingOther ? viewingName : myName;
  // opts.overwrite is only used by explicit, user-confirmed full-replace
  // actions (Reset Progress, Restore Backup) where the local `state` is
  // deliberately meant to become the complete truth — everything else
  // merges so normal usage across multiple devices never loses data.
  if(getRoomCode() && !opts.overwrite){
    state = await mergeWithRemoteBeforeSave(state, targetName);
  }
  snapshotLoadedStateKeys();
  const json = JSON.stringify(state);
  const key = localPlayerKey(targetName);
  try{ localStorage.setItem(key, json); }
  catch(e){ console.error('localStorage save failed', e); }
  if(window.storage && typeof window.storage.set === 'function'){
    try{ await window.storage.set(key, json, true); }
    catch(e){ console.error('window.storage save failed', e); }
  }
  if(getRoomCode()){
    const room = getRoomCode();
    const ok = await kvdbSet(playerKey(targetName), json);
    if(ok) clearPendingSync(room, targetName);
    else markPendingSync(room, targetName); // offline/flaky — localStorage above already has it; retried in the background
  }
}

// One-time migration, forward through every storage-key format this
// tracker has ever used, so nobody's progress gets lost when upgrading:
//   v0  'cgl-tracker-state-v2'   oldest, single-player, private key
//   v1  playerKey(name)          i.e. 'cgl50-state:name' — shared, but
//                                 collision-prone: two different Sync
//                                 Rooms (or two solo devices) using the
//                                 same name could overwrite each other on
//                                 the shared window.storage bucket
//   v2  localPlayerKey(name)     room-code-scoped (in a Sync Room) or
//                                 per-device-ID-scoped (solo) — current,
//                                 collision-safe key
// Only the window.storage/localStorage fallback needs this; Firebase was
// never affected since it's already namespaced under rooms/{room}/...
async function migrateOldDataIfNeeded(name){
  const newKey = localPlayerKey(name);
  let hasNew = false;
  try{ if(localStorage.getItem(newKey)) hasNew = true; }catch(e){}
  if(!hasNew && window.storage && typeof window.storage.get === 'function'){
    try{ const r = await window.storage.get(newKey, true); if(r && r.value) hasNew = true; }catch(e){}
  }
  if(hasNew) return;

  // Try the v1 (pre-fix, collision-prone) shared key first — it's the
  // most recent old format, so most likely to hold someone's real data.
  const v1Key = playerKey(name);
  let oldRaw = null;
  try{ oldRaw = localStorage.getItem(v1Key); }catch(e){}
  if(!oldRaw && window.storage && typeof window.storage.get === 'function'){
    try{ const r = await window.storage.get(v1Key, true); if(r && r.value) oldRaw = r.value; }catch(e){}
  }

  // Fall back to the oldest v0 private, non-shared key.
  if(!oldRaw){
    const v0Key = 'cgl-tracker-state-v2';
    try{ oldRaw = localStorage.getItem(v0Key); }catch(e){}
    if(!oldRaw && window.storage && typeof window.storage.get === 'function'){
      try{ const r = await window.storage.get(v0Key, false); if(r && r.value) oldRaw = r.value; }catch(e){}
    }
  }

  if(!oldRaw) return;
  try{ localStorage.setItem(newKey, oldRaw); }catch(e){}
  if(window.storage && typeof window.storage.set === 'function'){
    try{ await window.storage.set(newKey, oldRaw, true); }catch(e){}
  }
}

function getOrCreateMyName(){
  let name = null;
  try{ name = localStorage.getItem('cgl50-myname'); }catch(e){}
  if(!name){
    name = (prompt('👤 Apna naam likho (dost isi naam se tumhara progress dekh payega):','') || '').trim();
    if(!name) name = 'Player' + Math.floor(100 + Math.random()*900);
    try{ localStorage.setItem('cgl50-myname', name); }catch(e){}
  }
  return name;
}

// New-user welcome popup: combines name entry + room-code join + Add to
// Home Screen into a single custom modal (instead of a blocking native
// prompt()), so someone new can type their name and immediately drop in
// their friend's Room Code in the same place. Only shown once — the first
// time this device has no saved name. Resolves with the chosen name; if
// a room code was entered, setRoomCode() runs before resolving so init()
// (which runs right after) loads/joins that room automatically.
function showOnboardingModal(){
  return new Promise((resolve)=>{
    const modal = document.getElementById('onboardModal');
    if(!modal){ resolve('Player'+Math.floor(100+Math.random()*900)); return; }
    modal.style.display = 'flex';
    const nameInput = document.getElementById('onbName');
    const joinBtn = document.getElementById('onbJoinBtn');
    const installBtn = document.getElementById('onbInstallBtn');
    const statusEl = document.getElementById('onbStatus');
    const showStatus = (msg)=>{ if(statusEl){ statusEl.style.display='block'; statusEl.textContent = msg; } };

    if(deferredInstallPrompt && installBtn) installBtn.style.display = 'inline-block';
    if(installBtn) installBtn.addEventListener('click', async ()=>{
      if(deferredInstallPrompt){
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        installBtn.style.display = 'none';
      } else {
        alert('iPhone: Share button 🔗 → "Add to Home Screen".\nAndroid Chrome: Menu (⋮) → "Add to Home Screen" / "Install App".');
      }
    });

    function finish(name){
      name = (name||'').trim();
      if(!name) name = 'Player' + Math.floor(100 + Math.random()*900);
      try{ localStorage.setItem('cgl50-myname', name); }catch(e){}
      modal.style.display = 'none';
      resolve(name);
    }

    if(joinBtn) joinBtn.addEventListener('click', async ()=>{
      const name = nameInput.value.trim();
      if(!name){ showStatus('⚠️ Pehle apna naam likho.'); return; }
      joinBtn.disabled = true;
      try{
        const registry = await loadRegistry();
        const taken = registry.some(n=>n.toLowerCase()===name.toLowerCase());
        if(taken){
          showStatus('⚠️ Yeh naam already kisi aur ne le rakha hai. Dusra naam try karo.');
          return;
        }
        finish(name);
      } finally {
        joinBtn.disabled = false;
      }
    });
  });
}
async function getOrCreateMyNameAsync(){
  let name = null;
  try{ name = localStorage.getItem('cgl50-myname'); }catch(e){}
  if(name) return name;
  return await showOnboardingModal();
}

async function loadRegistry(){
  if(window.storage && typeof window.storage.get === 'function'){
    try{
      const res = await window.storage.get(REGISTRY_KEY, true);
      if(res && res.value) return JSON.parse(res.value);
    }catch(e){ /* fall through */ }
  }
  try{ const raw = localStorage.getItem(REGISTRY_KEY); return raw ? JSON.parse(raw) : []; }
  catch(e){ return []; }
}
async function saveRegistry(list){
  const json = JSON.stringify(list);
  try{ localStorage.setItem(REGISTRY_KEY, json); }catch(e){}
  if(window.storage && typeof window.storage.set === 'function'){
    try{ await window.storage.set(REGISTRY_KEY, json, true); }catch(e){}
  }
}
async function registerPlayer(name){
  const list = await loadRegistry();
  if(!list.some(n=>n.toLowerCase()===name.toLowerCase())){
    list.push(name);
    await saveRegistry(list);
  }
}

function loadFriendsList(){
  try{ const raw = localStorage.getItem('cgl50-my-friends'); return raw ? JSON.parse(raw) : []; }
  catch(e){ return []; }
}
function saveFriendsList(list){
  try{ localStorage.setItem('cgl50-my-friends', JSON.stringify(list)); }catch(e){}
}

// ===== Leaderboard "pin to top" (per-device, personal preference — not
// synced to the room, so pinning someone only changes YOUR view, not
// theirs). Anyone visible on the leaderboard — including yourself — can
// be pinned; pinned rows float to the top but keep showing their true
// rank number, so pinning never changes anyone's actual standing. =====
function loadPinnedList(){
  try{ const raw = localStorage.getItem('cgl50-pinned-lb'); return raw ? JSON.parse(raw) : []; }
  catch(e){ return []; }
}
function savePinnedList(list){
  try{ localStorage.setItem('cgl50-pinned-lb', JSON.stringify(list)); }catch(e){}
}
function isPinned(name, list){
  return (list || loadPinnedList()).some(n=>n.toLowerCase()===name.toLowerCase());
}
function togglePinned(name){
  const list = loadPinnedList();
  const idx = list.findIndex(n=>n.toLowerCase()===name.toLowerCase());
  if(idx>=0) list.splice(idx,1); else list.push(name);
  savePinnedList(list);
}

// ===== Per-player task definitions =====
// Each player can have their own custom task list (names, start times,
// durations) — stored in state.taskDefs. These helpers read a task
// definition list straight out of any raw state object (mine or a friend's)
// WITHOUT touching the live TASKS/TASK_DURATIONS_MIN/TASK_VALUES globals,
// so the leaderboard can fairly score every player using THEIR OWN tasks —
// never mixing one person's task list with another's ₹ values or count.
function getTaskDefsFromState(st){
  if(Array.isArray(st.taskDefs) && st.taskDefs.length>0){
    return st.taskDefs.map((d,i)=>({
      name: (d && typeof d.name==='string' && d.name.trim()) ? d.name : ('Task '+(i+1)),
      start: (d && typeof d.start==='number') ? d.start : DEFAULT_TASK_START_MIN[i%DEFAULT_TASK_START_MIN.length],
      duration: (d && typeof d.duration==='number' && d.duration>0) ? d.duration : 30
    }));
  }
  // Back-compat: older saves only ever had taskNames (rename-only editor,
  // count always matched the original default schedule).
  if(Array.isArray(st.taskNames) && st.taskNames.length===DEFAULT_TASKS.length){
    return DEFAULT_TASKS.map((_,i)=>({
      name: st.taskNames[i] || DEFAULT_TASKS[i],
      start: DEFAULT_TASK_START_MIN[i],
      duration: DEFAULT_TASK_DURATIONS_MIN[i]
    }));
  }
  return DEFAULT_TASKS.map((name,i)=>({
    name, start: DEFAULT_TASK_START_MIN[i], duration: DEFAULT_TASK_DURATIONS_MIN[i]
  }));
}
function taskCountFrom(st){
  return getTaskDefsFromState(st).length || DEFAULT_TASKS.length;
}
function taskValuesFrom(st){
  const defs = getTaskDefsFromState(st);
  return computeTaskValues(defs.map(d=>d.duration));
}
// Same idea as dayTaskValues(), but for the generic "any player's state"
// helpers below (leaderboard/compete panel) — keeps a player's own numbers
// here matching what they see on their own Today tab, quizzes included.
function dayTaskValuesFrom(st, d){
  const defs = getTaskDefsFromState(st);
  const qw = quizDurationWeights(d && d.quizLog);
  if(!qw.length) return computeTaskValues(defs.map(x=>x.duration));
  return computeTaskValues(defs.map(x=>x.duration).concat(qw));
}

// ===== Shared (Admin-broadcast) task list =====
// Lives at rooms/{room}/_sharedTasks — completely separate from any one
// member's own state.taskDefs, so switching Task Mode off later hands
// everyone back their own previous individual list untouched.
let sharedTaskDefsCache = null;
let sharedTaskDefsCacheAt = 0;
let sharedTaskDefsCacheRoom = null;
async function loadSharedTaskDefs(){
  const room = getRoomCode();
  if(!room) return null;
  if(sharedTaskDefsCache && sharedTaskDefsCacheRoom===room && (Date.now()-sharedTaskDefsCacheAt) < 8000){
    return sharedTaskDefsCache;
  }
  const raw = await kvdbGet('_sharedTasks');
  let defs = null;
  if(raw){
    try{
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed) && parsed.length>0) defs = parsed;
    }catch(e){ /* keep null on bad data */ }
  }
  sharedTaskDefsCache = defs;
  sharedTaskDefsCacheAt = Date.now();
  sharedTaskDefsCacheRoom = room;
  return defs;
}
async function saveSharedTaskDefs(defs){
  const room = getRoomCode();
  if(!room) return;
  await kvdbSet('_sharedTasks', JSON.stringify(defs));
  sharedTaskDefsCache = defs;
  sharedTaskDefsCacheAt = Date.now();
  sharedTaskDefsCacheRoom = room;
}
// Tracks the last shared-task JSON we actually applied to TASKS/etc, so we
// only re-render when the Admin's list genuinely changed (own-tracker view
// otherwise deliberately avoids re-rendering every auto-sync tick, so it
// doesn't yank focus out of a notes/mistakes textarea mid-type).
let lastAppliedSharedTasksJSON = null;
// Called after every refreshRoomMeta() — applies (or reverts) the shared
// task list so it takes effect for EVERY member automatically, without
// anyone needing to open/edit anything themselves.
async function applySharedTaskModeIfNeeded(){
  if(!getRoomCode()) return;
  if(!isSharedTaskMode()){
    if(lastAppliedSharedTasksJSON !== null){
      // Mode was just switched back to individual — hand this state's own
      // tasks back control.
      lastAppliedSharedTasksJSON = null;
      applyLoadedExtras();
      renderAll();
      renderTaskEditForm();
    }
    return;
  }
  const defs = await loadSharedTaskDefs();
  if(!defs || !defs.length) return; // Admin hasn't saved a shared list yet
  const json = JSON.stringify(defs);
  if(json === lastAppliedSharedTasksJSON) return; // no change since last apply
  lastAppliedSharedTasksJSON = json;
  TASKS = defs.map(d=>d.name);
  TASK_START_MIN = defs.map(d=>d.start);
  TASK_DURATIONS_MIN = defs.map(d=>d.duration);
  TASK_VALUES = computeTaskValues(TASK_DURATIONS_MIN);
  resizeAllDaysTasks();
  taskEditDraft = null;
  renderAll();
  renderTaskEditForm();
}

function dayEarnLossFrom(st, d, dayIndex){
  if(d.rest) return {earned:0, lost:0, pending:0};
  const defs = getTaskDefsFromState(st);
  const values = dayTaskValuesFrom(st, d);
  let earned=0, lost=0, pending=0;
  d.tasks.forEach((checked, idx)=>{
    const v = (values[idx]!==undefined) ? values[idx] : (DAILY_TARGET/(values.length||1));
    if(checked){ earned += v; return; }
    const def = defs[idx];
    if(dayIndex===undefined || !def || isTaskDue(dayIndex, def.start, def.duration)){
      lost += v;
    } else {
      pending += v;
    }
  });
  const quizList = Array.isArray(d.quizLog) ? d.quizLog : [];
  quizList.forEach((q, qi)=>{ earned += (values[defs.length+qi] || 0); });
  return { earned, lost, pending };
}
function dayStudyMinutesFrom(st, d){
  const defs = getTaskDefsFromState(st);
  let mins = 0;
  d.tasks.forEach((checked,idx)=>{ if(checked && defs[idx]) mins += (defs[idx].duration||0); });
  return mins;
}

// Pure, DOM-free stats computation used for the leaderboard, so we can
// compute a friend's numbers from their raw state without touching the
// globals that drive the main on-screen tracker.
function getDayFrom(st, n){
  if(!st[n]) st[n] = {};
  const d = st[n];
  const count = taskCountFrom(st);
  if(!Array.isArray(d.tasks)) d.tasks = new Array(count).fill(false);
  else if(d.tasks.length !== count){
    const resized = new Array(count).fill(false);
    for(let i=0;i<Math.min(count, d.tasks.length); i++) resized[i] = !!d.tasks[i];
    d.tasks = resized;
  }
  if(typeof d.rest !== 'boolean') d.rest = false;
  if(typeof d.notes !== 'string') d.notes = '';
  return d;
}
function isDayTouchedFrom(d){
  if(d.rest) return true;
  if(d.tasks.some(Boolean)) return true;
  // Mirrors isDayTouched() exactly — a friend's day that only has mock/
  // sectional scores filled in (no task ticked, no note) was previously
  // NOT counted as touched here, unlike the live version. Only matters for
  // days filled in ahead of today, but kept consistent regardless. Guarded
  // with `|| {}` since getDayFrom() (unlike getDay()) doesn't pre-populate
  // these sub-objects on every synced day.
  const mock = d.mock || {};
  if(hasVal(mock.math)||hasVal(mock.reasoning)||hasVal(mock.english)||hasVal(mock.gk)||hasVal(mock.percentile)||hasVal(mock.wrongMath)||hasVal(mock.wrongReasoning)||hasVal(mock.wrongEnglish)||hasVal(mock.wrongGk)) return true;
  const sect = d.sect || {};
  if(Object.keys(sect).some(k=>hasVal(sect[k]))) return true;
  if(d.sectDetail && Object.keys(d.sectDetail).some(k=>{ const sd=d.sectDetail[k]; return sd && (hasVal(sd.right)||hasVal(sd.wrong)||hasVal(sd.skip)||(Array.isArray(sd.chapters)&&sd.chapters.length)); })) return true;
  if(d.notes && d.notes.trim()) return true;
  if(d.mistakes && d.mistakes.trim()) return true;
  return false;
}
function computeStatsFrom(st){
  const taskCount = taskCountFrom(st);
  let activeUpto = todayDayNum();
  for(let i=1;i<=TOTAL_DAYS;i++){
    if(isDayTouchedFrom(getDayFrom(st,i))) activeUpto = Math.max(activeUpto,i);
  }
  let daysDone=0, totalChecked=0, totalPossible=0, studyMins=0, earned=0, lost=0;
  for(let i=1;i<=TOTAL_DAYS;i++){
    const d = getDayFrom(st,i);
    if(d.rest) continue;
    const done = d.tasks.filter(Boolean).length;
    totalChecked += done; totalPossible += taskCount;
    if(done===taskCount) daysDone++;
    if(i<=activeUpto){
      studyMins += dayStudyMinutesFrom(st, d);
      const r = dayEarnLossFrom(st, d, i);
      earned += r.earned;
      lost += r.lost;
    }
  }
  // Streak: must mirror computeStreakInfo()'s forward, freeze-aware walk
  // exactly (day 1 → activeUpto, freezes absorb a miss instead of
  // resetting to 0). The old version here walked BACKWARDS from today and
  // broke on the very first miss with no freeze support at all — so a
  // friend who used a streak-freeze to survive a missed day would show a
  // correct streak on their own "My Stats" (via computeStreakInfo) but a
  // wrong/lower one on the Leaderboard (via this function). Freezes
  // regenerate every FREEZE_EARN_EVERY days, same as the live version.
  let streak=0, freezes=MAX_STREAK_FREEZES;
  for(let i=1;i<=activeUpto;i++){
    const d = getDayFrom(st,i);
    if(d.rest) continue;
    const done = d.tasks.filter(Boolean).length;
    if((done/taskCount)>=0.5){
      streak++;
      if(streak % FREEZE_EARN_EVERY === 0 && freezes < MAX_STREAK_FREEZES) freezes++;
    } else if(freezes>0){
      freezes--;
    } else {
      streak = 0;
    }
  }
  const pct = totalPossible ? Math.round((totalChecked/totalPossible)*100) : 0;
  const xp = computeXPFrom(st);
  const level = levelInfo(xp).level;
  return { daysDone, pct, streak, earned, lost, studyMins, xp, level };
}

async function switchViewing(name){
  viewingName = name;
  // Fresh safety default every time the viewed member changes — Admin must
  // deliberately re-enable Edit Mode for each member, see adminEditModeOn.
  adminEditModeOn = false;
  // Block save() for the duration of the switch — until state actually
  // reflects `name`'s data, saving would either write the previous
  // profile's state under the new name, or (if the load fails) a blank
  // state over real data.
  stateReady = false;
  state = await loadPlayerState(name);
  await ensureQuizDetailStoreForCurrentViewer();
  applyLoadedExtras();
  snapshotLoadedStateKeys();
  if(getRoomCode()){
    await refreshRoomMeta();
    await applySharedTaskModeIfNeeded();
  }
  // Also ready when the Admin is viewing someone else specifically to edit
  // their tracker — canAdminEditViewed() needs the just-refreshed admin
  // status above, so this is computed after refreshRoomMeta(), not before.
  stateReady = (viewingName === myName) || canAdminEditViewed();
  selectedDay = todayDayNum();
  renderAll();
  renderProfileBar();
  applyReadOnlyUI();
  safeRun(renderTaskEditForm, 'renderTaskEditForm');
  safeRun(renderTaskModeSelector, 'renderTaskModeSelector');
}

function applyReadOnlyUI(){
  const ro = viewingName !== myName;
  const editSection = document.getElementById('taskEditSection');
  const backupSection = document.getElementById('backupSection');
  const targetSection = document.getElementById('targetSection');
  const resetBtn = document.getElementById('resetBtn');
  const resetMathChBtn = document.getElementById('resetMathChBtn');
  const resetEngChBtn = document.getElementById('resetEngChBtn');
  const resetRevMathBtn = document.getElementById('resetRevMathBtn');
  const resetRevEngBtn = document.getElementById('resetRevEngBtn');
  const resetRevGkBtn = document.getElementById('resetRevGkBtn');
  if(editSection) editSection.style.display = ro ? 'none' : '';
  if(backupSection) backupSection.style.display = ro ? 'none' : '';
  if(targetSection) targetSection.style.display = ro ? 'none' : '';
  if(resetBtn) resetBtn.style.display = ro ? 'none' : '';
  if(resetMathChBtn) resetMathChBtn.style.display = ro ? 'none' : '';
  if(resetEngChBtn) resetEngChBtn.style.display = ro ? 'none' : '';
  if(resetRevMathBtn) resetRevMathBtn.style.display = ro ? 'none' : '';
  if(resetRevEngBtn) resetRevEngBtn.style.display = ro ? 'none' : '';
  if(resetRevGkBtn) resetRevGkBtn.style.display = ro ? 'none' : '';
  if(!ro) renderTargetPanel();
}

function renderProfileBar(){
  const el = document.getElementById('profileBar');
  updateViewBar();
  if(!el) return;
  const ro = viewingName !== myName;
  el.className = 'profilebar' + (ro ? ' viewing' : '');
  if(!ro){
    el.innerHTML = `
      <div class="pbrow">
        <span>👤 Playing as <b>${escapeHtml(myName)}</b></span>
        <button class="nav-btn" id="changeNameBtn"><span class="icoEdit" aria-hidden="true"></span> Naam Badlo</button>
      </div>`;
    const btn = document.getElementById('changeNameBtn');
    // 🔑 Admin recovery code: type this exact phrase into the "Naya naam"
    // prompt (instead of an actual name) to instantly switch this device
    // back to whoever is currently the room's Admin — e.g. after a
    // reinstall, a cleared browser, or a new device where the normal
    // "naam already liya" check would otherwise block you from re-using
    // your own admin name. CHANGE THIS to a private phrase only you know —
    // anyone who has it can log in as the Admin.
    const ADMIN_RECOVERY_CODE = 'wapas-admin-avnee';
    if(btn) btn.addEventListener('click', async ()=>{
      const raw = (prompt('Naya naam:', myName) || '').trim();
      if(!raw) return;

      if(raw.toLowerCase() === ADMIN_RECOVERY_CODE.toLowerCase()){
        const meta = await loadRoomMeta();
        if(!meta.admin){ alert('⚠️ Abhi room mein koi Admin set nahi hai.'); return; }
        if(meta.admin.toLowerCase() === myName.toLowerCase()){
          alert('✅ Tum already Admin (' + myName + ') ho.');
          return;
        }
        // IMPORTANT: unlike a normal rename below, we do NOT copy this
        // device's current state onto the admin name — that would clobber
        // the real admin's progress. switchViewing() safely fetches the
        // admin's own already-saved data instead, so nothing is lost.
        myName = meta.admin;
        try{ localStorage.setItem('cgl50-myname', myName); }catch(e){}
        await registerPlayer(myName);
        if(getRoomCode()) await addToRoomRegistry(myName);
        await switchViewing(myName);
        await renderCompetePanel();
        return;
      }

      const newName = raw;
      if(newName.toLowerCase()===myName.toLowerCase()) return;
      const registry = await loadRegistry();
      if(registry.some(n=>n.toLowerCase()===newName.toLowerCase())){
        alert('⚠️ Yeh naam already kisi aur ne le rakha hai. Dusra naam try karo.');
        return;
      }
      const oldName = myName;
      // Grab a fresh copy of the OLD name's saved progress before anything
      // else changes — this is what would otherwise get orphaned.
      const oldState = await loadPlayerState(oldName);
      myName = newName;
      try{ localStorage.setItem('cgl50-myname', myName); }catch(e){}
      // Copy the old name's state onto the new name's key (local +
      // window.storage + Firebase, via save()) so renaming carries the
      // progress over instead of starting the new name from empty state.
      state = oldState;
      viewingName = myName;
      await save();
      await registerPlayer(myName);
      if(getRoomCode()) await addToRoomRegistry(myName);
      await switchViewing(myName);
      await renderCompetePanel();
    });
  } else {
    const editNote = canAdminEditViewed() ? (adminEditModeOn ? ' (<span class="icoEdit" aria-hidden="true"></span> editing)' : ' (👑 edit available)') : ' (read-only)';
    el.innerHTML = `
      <div class="pbrow">
        <span>👀 Viewing <b>${escapeHtml(viewingName)}</b>'s tracker${editNote}</span>
        <button class="nav-btn" id="backToMineBtn">⬅️ Meri Tracker</button>
      </div>`;
    const btn = document.getElementById('backToMineBtn');
    if(btn) btn.addEventListener('click', async ()=>{
      await switchViewing(myName);
      await renderCompetePanel();
    });
  }
}

// Persistent "back to my tracker" strip fixed under the topbar — unlike
// profileBar above (which only lives inside the Compete tab's markup),
// this sits outside every .tabview so it stays on screen no matter which
// tab you're on while browsing a friend's tracker.
function updateViewBar(){
  const bar = document.getElementById('viewBar');
  if(!bar) return;
  const ro = viewingName !== myName;
  bar.classList.toggle('show', ro);
  document.body.classList.toggle('viewing-other', ro);
  if(ro){
    const label = document.getElementById('viewBarLabel');
    const editNote = canAdminEditViewed() ? (adminEditModeOn ? ' (<span class="icoEdit" aria-hidden="true"></span> editing)' : ' (👑 edit available)') : '';
    if(label) label.innerHTML = `👀 Viewing <b>${escapeHtml(viewingName)}</b>'s tracker${editNote}`;
  }
}
{
  const viewBarBtn = document.getElementById('viewBarBackBtn');
  if(viewBarBtn) viewBarBtn.addEventListener('click', async ()=>{
    await switchViewing(myName);
    await renderCompetePanel();
  });
}


// Sanitizes a name into a Firebase-safe key (also used by presence tracking
// and room hide/restrict features below).
function chatSeenKey(name){
  return (name||'').trim().toLowerCase().replace(/[.#$\[\]\/]/g,'_') || 'unknown';
}

// ===== Presence: is the other person online right now? =====
// Every device that's actually got the app open writes its own heartbeat
// timestamp to rooms/{room}/presence/{key} every ~15s, and a live listener
// keeps everyone else's status fresh in real time (no polling needed on
// the reading side). Anyone whose last heartbeat is within PRESENCE_TTL_MS
// counts as 🟢 online; older than that (or never seen) shows 🔵/⚪ offline.
const PRESENCE_TTL_MS = 40000;
let presenceMap = {};       // { safeNameKey: lastHeartbeatTimestamp }
let presenceUnsub = null;
let presenceHeartbeatTimer = null;
function presenceKey(name){ return chatSeenKey(name); }
async function markMyPresence(){
  const room = getRoomCode();
  if(!room || !myName) return;
  try{
    await waitForFirebase();
    await window.__fbSet(`rooms/${room}/presence/${presenceKey(myName)}`, Date.now());
  }catch(e){ /* best-effort */ }
}
function startPresenceHeartbeat(){
  if(presenceHeartbeatTimer){ clearInterval(presenceHeartbeatTimer); presenceHeartbeatTimer = null; }
  if(!getRoomCode()) return;
  markMyPresence();
  presenceHeartbeatTimer = setInterval(markMyPresence, 15000);
}
function presenceStatusFor(name){
  if(!name) return { online:false, ts:0 };
  if(name.toLowerCase()===myName.toLowerCase()) return { online:true, ts:Date.now() };
  const ts = presenceMap[presenceKey(name)] || 0;
  return { online: !!ts && (Date.now()-ts) < PRESENCE_TTL_MS, ts };
}
// Short "🟢 Online" / "⚪ 5m pehle active" / "⚪ Offline" label for a name.
function presenceLabel(name){
  const { online, ts } = presenceStatusFor(name);
  if(online) return { dot:'🟢', cls:'on', text:'Online' };
  if(!ts) return { dot:'⚪', cls:'off', text:'Offline' };
  const mins = Math.max(1, Math.round((Date.now()-ts)/60000));
  return { dot:'⚪', cls:'off', text: mins<60 ? `${mins}m pehle active` : 'Offline' };
}
// Live presence tracking (used for the 🟢/⚪ online dots on the leaderboard).
// Every device with the app open writes its own heartbeat to
// rooms/{room}/presence/{key} every ~15s (see startPresenceHeartbeat above);
// this keeps a live listener on that same path so everyone else's status
// stays fresh in real time. Cheap to call often — only (re)subscribes when
// the room code actually changes.
let lastPresenceRoomInited = undefined; // undefined = never inited yet
async function ensurePresenceTracking(){
  const room = getRoomCode();
  if(room === lastPresenceRoomInited) return;
  lastPresenceRoomInited = room;
  if(presenceUnsub){ try{ presenceUnsub(); }catch(e){} presenceUnsub = null; }
  if(!room) return;
  startPresenceHeartbeat();
  try{
    await waitForFirebase();
    presenceUnsub = await window.__fbListenReady(`rooms/${room}/presence`, (val)=>{
      presenceMap = val || {};
    });
  }catch(e){ /* presence is best-effort, no need to surface errors */ }
}

let lastFriendStatsSnapshot = null; // null = not yet initialized (avoids a notification burst on first load)
// A member can dismiss a pinned announcement locally (per device) — it
// stays dismissed until the Admin posts a NEW one (compared by timestamp),
// at which point it resurfaces automatically even for someone who closed
// an earlier one.
function announceDismissKey(room){ return 'cgl50-ann-dismissed:' + room; }
function isAnnouncementDismissed(room, at){
  try{ return localStorage.getItem(announceDismissKey(room)) === String(at); }catch(e){ return false; }
}
function dismissCurrentAnnouncement(){
  const room = getRoomCode();
  if(!room || !currentRoomAnnouncement) return;
  try{ localStorage.setItem(announceDismissKey(room), String(currentRoomAnnouncement.at)); }catch(e){}
}
function renderAnnouncementCard(){
  const card = document.getElementById('announceCard');
  if(!card) return;
  const room = getRoomCode();
  const ann = currentRoomAnnouncement;
  if(!room || !ann || !ann.text || isAnnouncementDismissed(room, ann.at)){
    card.classList.remove('show');
    return;
  }
  document.getElementById('announceText').textContent = ann.text;
  const byLine = ann.by ? ` · ${ann.by}` : '';
  document.getElementById('announceMeta').textContent =
    new Date(ann.at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) + byLine;
  card.classList.add('show');
}

async function renderCompetePanel(){
  const el = document.getElementById('competePanel');
  if(!el) return;
  const friends = loadFriendsList();
  // Perf: registry + admin/hidden meta are two independent reads — fire them
  // together instead of one-after-another so a slow tick doesn't stack up
  // extra round-trip latency on top of the friend-state fetches below.
  const [roomNames] = await Promise.all([ loadRoomRegistry(), refreshRoomMeta() ]);
  await applySharedTaskModeIfNeeded();
  renderTaskModeSelector();
  const merged = [myName, ...friends, ...roomNames];
  let names = merged.filter((n,i)=> n && merged.findIndex(x=>x.toLowerCase()===n.toLowerCase())===i);
  if(getRoomCode()) names = visibleNamesFor(names);
  // Perf: fetch every friend's state in parallel instead of one-by-one —
  // on a slow connection the old sequential loop could take many seconds
  // per tick, which is a big chunk of blocked/janky time every 25s.
  const todayIdx = todayDayNum();
  const weekRange = thisWeekDayRange();
  const rows = await Promise.all(names.map(async (nm)=>{
    const st = await loadPlayerState(nm);
    return {
      name: nm,
      ...computeStatsFrom(st),
      todayStats: computeRangeStatsFrom(st, todayIdx, todayIdx),
      weekStats: computeRangeStatsFrom(st, weekRange.from, weekRange.to),
      isLive: true
    };
  }));
  // Rank primarily by overall completion %, but that number is rounded and
  // measured against the *whole* plan length — so early on, lots of people
  // sit tied at the same (often 0%) pct even though their real effort
  // clearly differs. Break ties with finer-grained, unrounded signals in
  // order: days fully completed, money earned, then streak — so someone
  // who's actually doing tasks and earning outranks someone who isn't,
  // instead of the leaderboard looking frozen until pct itself moves.
  rows.sort((a,b)=> b.pct-a.pct || b.daysDone-a.daysDone || b.earned-a.earned || b.streak-a.streak);

  // Notify when a live room-member's progress moved forward since the last
  // check.
  const newSnapshot = {};
  rows.forEach(r=>{ newSnapshot[r.name.toLowerCase()] = { pct:r.pct, streak:r.streak }; });
  if(lastFriendStatsSnapshot){
    rows.forEach(r=>{
      if(!r.isLive) return;
      if(r.name.toLowerCase() === myName.toLowerCase()) return;
      const prev = lastFriendStatsSnapshot[r.name.toLowerCase()];
      if(prev && r.pct > prev.pct){
        fireNotification('📈 ' + r.name, r.name + ' ne progress update kiya — ab ' + r.pct + '% complete (🔥' + r.streak + ')');
      }
    });
  }
  lastFriendStatsSnapshot = newSnapshot;

  const myRowIdx = rows.findIndex(r=>r.name.toLowerCase()===myName.toLowerCase());
  const myPct = myRowIdx>=0 ? rows[myRowIdx].pct : 0;
  const myRank = myRowIdx>=0 ? myRowIdx+1 : null;

  // "Today" and "This Week" views re-derive each row from its own
  // pre-computed range stats and re-sort/re-rank on that — kept entirely
  // separate from `rows` above so the notification logic and the all-time
  // Home card snapshot never see anything but true all-time numbers.
  const todayRows = rows.map(r=>({ ...r, ...r.todayStats })).sort((a,b)=> b.pct-a.pct || b.earned-a.earned);
  const weekRows = rows.map(r=>({ ...r, ...r.weekStats })).sort((a,b)=> b.pct-a.pct || b.earned-a.earned);
  const displayRows = leaderboardMode==='today' ? todayRows : leaderboardMode==='week' ? weekRows : rows;
  const displayMyRowIdx = displayRows.findIndex(r=>r.name.toLowerCase()===myName.toLowerCase());
  const displayMyPct = displayMyRowIdx>=0 ? displayRows[displayMyRowIdx].pct : 0;
  const displayMyRank = displayMyRowIdx>=0 ? displayMyRowIdx+1 : null;

  // Pinning is purely a local display reorder — it never touches `rows`/
  // `displayRows` (real ranks, deltas, the Home-card snapshot etc. all stay
  // computed off the true sorted order above). We just tag each row with
  // its true rank + pinned flag, then float pinned rows to the top while
  // keeping unpinned rows in their original relative order.
  const pinnedList = loadPinnedList();
  const rankedDisplayRows = displayRows.map((r,i)=>({ ...r, _trueRank:i+1, _pinned:isPinned(r.name, pinnedList) }));
  const orderedDisplayRows = [
    ...rankedDisplayRows.filter(r=>r._pinned),
    ...rankedDisplayRows.filter(r=>!r._pinned)
  ];

  let html = '';
  html += `<div class="lbModeToggle">
    <button class="lbModeBtn ${leaderboardMode==='today'?'active':''}" type="button" data-lbmode="today">📅 Today</button>
    <button class="lbModeBtn ${leaderboardMode==='week'?'active':''}" type="button" data-lbmode="week">🗓️ This Week</button>
    <button class="lbModeBtn ${leaderboardMode==='all'?'active':''}" type="button" data-lbmode="all">🏆 All-Time</button>
  </div>`;
  if(leaderboardMode==='today'){
    html += `<div class="lbWeekHint">📅 Aaj (${new Date().toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short'})}) ka scoreboard — roz raat 12 baje khud-ba-khud fresh ho jata hai.</div>`;
  } else if(leaderboardMode==='week'){
    const wr = thisWeekDayRange();
    html += `<div class="lbWeekHint">🗓️ Is hafte (${fmtDate(wr.from)} – ${fmtDate(wr.to)}) ka scoreboard — har Somvar khud-ba-khud fresh ho jata hai.</div>`;
  }
  if(displayRows.length>1 && displayMyRank){
    const rankMsg = displayMyRank===1
      ? `🏆 Tum <b>#1</b> par ho, ${displayRows.length-1} dost${displayRows.length-1>1?'o':''} se aage! Lead banaye rakho 🔥`
      : `📍 Tumhari Rank: <b>#${displayMyRank}</b> / ${displayRows.length} — leader se <b>${displayRows[0].pct - displayMyPct}%</b> peeche ho`;
    html += `<div class="lbsummary">${rankMsg}</div>`;
  }

  html += `<div class="lbwrap">` + orderedDisplayRows.map((r)=>{
    const rank = r._trueRank;
    const isMe = r.name.toLowerCase()===myName.toLowerCase();
    const isViewing = r.name.toLowerCase()===viewingName.toLowerCase();
    const rankTier = rank===1?'lead':rank===2?'silver':rank===3?'bronze':'';
    const medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':`#${rank}`;
    const avatarColors=['av-blue','av-purple','av-pink','av-orange','av-teal','av-gain'];
    const avatarColor = avatarColors[Math.abs([...r.name.toLowerCase()].reduce((a,c)=>a+c.charCodeAt(0),0)) % avatarColors.length];
    const avatarHtml = `<span class="lbavatar ${avatarColor}">${escapeHtml((r.name||'?').trim().charAt(0).toUpperCase())}</span>`;
    let actionBtn = '';
    if(isMe){ actionBtn=''; }
    else { actionBtn = `<button class="nav-btn lbview" data-view="${escapeHtml(r.name)}">👀 View</button>`; }
    const pinBtn = `<button class="lbpin ${r._pinned?'active':''}" type="button" data-pin="${escapeHtml(r.name)}" title="${r._pinned?'Unpin karo':'Top pe pin karo'}">${r._pinned?'📌':'📍'}</button>`;
    let deltaHtml = '';
    if(!isMe && displayRows.length>1){
      const delta = r.pct - displayMyPct;
      if(delta>0) deltaHtml = `<span class="lbdelta up">🔺${delta}% aage tumse</span>`;
      else if(delta<0) deltaHtml = `<span class="lbdelta down">🔻${Math.abs(delta)}% peeche tumse</span>`;
      else deltaHtml = `<span class="lbdelta even">🤝 barabar tumse</span>`;
    }
    const dotHtml = isMe ? '🟢' : presenceLabel(r.name).dot;
    const daysStat = leaderboardMode==='today' ? `<span>${r.daysDone ? '✅ Aaj poora' : '⏳ Aaj baaki'}</span>`
      : leaderboardMode==='week' ? `<span>📅${r.daysDone} din (week)</span>`
      : `<span>📅${r.daysDone}/${TOTAL_DAYS} din</span>`;
    return `
      <div class="lbrow ${isViewing?'active':''} ${isMe?'me':''} ${rankTier} ${r._pinned?'pinned':''}">
        <div class="lbrank">${medal}</div>
        ${avatarHtml}
        <div class="lbmain">
          <div class="lbtoprow">
            <div class="lbname">${dotHtml} ${escapeHtml(r.name)}${isMe?' (You)':''}</div>
            ${deltaHtml}
          </div>
          <div class="lbbar"><div class="lbbarfill" style="width:${r.pct}%;"></div></div>
          <div class="lbstats"><span>⭐Lvl ${r.level}</span><span>🔥${r.streak} streak</span><span>📈${r.pct}%</span>${daysStat}<span><span class="icoClock" aria-hidden="true"></span>${fmtHours(r.studyMins)}</span><span class="lbgain">💰+₹${Math.round(r.earned).toLocaleString('en-IN')}</span>${r.lost>0?`<span class="lbloss">📉-₹${Math.round(r.lost).toLocaleString('en-IN')}</span>`:''}</div>
        </div>
        ${pinBtn}${actionBtn}
      </div>`;
  }).join('') + `</div>`;

  html += `
    <div class="addfriend">
      <input type="text" id="friendNameInput" placeholder="Dost ka exact naam likho (same room)...">
      <button class="nav-btn" id="addFriendBtn">➕ Add</button>
    </div>
    <div class="losshint">Kaam tabhi karega jab dono same 🔗 Sync Room code se joined ho.</div>
    <div class="losshint">📍 Pin button se kisi ko top pe pin karo — sirf tumhari screen pe, asli rank wahi rehti hai.</div>
  `;
  el.innerHTML = html;

  el.querySelectorAll('[data-lbmode]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const mode = btn.getAttribute('data-lbmode');
      if(mode===leaderboardMode) return;
      leaderboardMode = mode;
      renderCompetePanel();
    });
  });
  el.querySelectorAll('.lbview').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      await switchViewing(btn.getAttribute('data-view'));
      switchTab('today');
    });
  });
  el.querySelectorAll('.lbpin').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      togglePinned(btn.getAttribute('data-pin'));
      renderCompetePanel();
    });
  });
  const addBtn = document.getElementById('addFriendBtn');
  if(addBtn) addBtn.addEventListener('click', ()=>{
    const inp = document.getElementById('friendNameInput');
    const val = inp.value.trim();
    if(!val) return;
    const list = loadFriendsList();
    if(!list.some(n=>n.toLowerCase()===val.toLowerCase())){
      list.push(val);
      saveFriendsList(list);
    }
    inp.value='';
    renderCompetePanel();
  });
  ensurePresenceTracking();
  renderHomeLeaderboardCard(rows, myRank, myPct);
  safeRun(renderAnnouncementCard, 'renderAnnouncementCard');
}

// Compact, read-only snapshot of the same leaderboard for the Home screen —
// top 3 plus your own rank if you're outside it, with a shortcut into the
// full Compete tab for the rest.
function renderHomeLeaderboardCard(rows, myRank, myPct){
  const el = document.getElementById('competePanelHome');
  if(!el) return;
  if(!rows || rows.length===0){
    el.innerHTML = `<div class="homeLBempty">Abhi koi dost jud nahi paya — 🔗 Sync Room banao ya dost ka Room Code se Join karo (Stats tab mein).</div>`;
    return;
  }
  const shown = rows.slice(0,3);
  if(myRank && myRank>3){
    shown.push(rows[myRank-1]);
  }
  const rowsHtml = shown.map(r=>{
    const rank = rows.findIndex(x=>x.name.toLowerCase()===r.name.toLowerCase())+1;
    const isMe = r.name.toLowerCase()===myName.toLowerCase();
    const medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':`#${rank}`;
    const dotHtml = isMe ? '🟢' : presenceLabel(r.name).dot;
    const avatarColors=['av-blue','av-purple','av-pink','av-orange','av-teal','av-gain'];
    const avatarColor = avatarColors[Math.abs([...r.name.toLowerCase()].reduce((a,c)=>a+c.charCodeAt(0),0)) % avatarColors.length];
    const avatarHtml = `<span class="lbavatar ${avatarColor}" style="width:28px;height:28px;min-width:28px;font-size:13px;">${escapeHtml((r.name||'?').trim().charAt(0).toUpperCase())}</span>`;
    // One-click shortcut straight into an opponent's full tracker (Today tab:
    // tasks, mock/sectional scores, notes, mistakes, day grid) — no need to
    // go via the Compete tab and tap "View" separately.
    const viewBtn = isMe ? '' : `<button class="nav-btn homeLBViewBtn" data-view="${escapeHtml(r.name)}" title="${escapeHtml(r.name)} ka pura tracker dekho" style="font-size:12px;padding:5px 8px;flex-shrink:0;">👀</button>`;
    return `
      <div class="homeLBrow ${isMe?'me':''} ${rank===1?'lead':''}">
        <div class="homeLBrank">${medal}</div>
        ${avatarHtml}
        <div class="homeLBname">${dotHtml} ${escapeHtml(r.name)}${isMe?' (You)':''}</div>
        <div class="homeLBmeta"><span>⭐Lv${r.level}</span><span>🔥${r.streak}</span><span>📈${r.pct}%</span></div>
        ${viewBtn}
      </div>`;
  }).join('');
  const rankMsg = rows.length>1 && myRank
    ? (myRank===1 ? `🏆 Tum #1 par ho!` : `📍 Rank #${myRank}/${rows.length}`)
    : `Abhi solo grinding — dost add karo!`;
  el.innerHTML = `
    ${rowsHtml}
    <div class="homeLBfoot">
      <span>${rankMsg}</span>
      <button class="nav-btn" id="homeLBOpenBtn" style="font-size:12.5px;padding:6px 10px;">Poora Leaderboard ➜</button>
    </div>
  `;
  el.querySelectorAll('.homeLBViewBtn').forEach(btn=>{
    btn.addEventListener('click', async (ev)=>{
      ev.stopPropagation();
      await switchViewing(btn.getAttribute('data-view'));
      switchTab('today');
    });
  });
  const btn = document.getElementById('homeLBOpenBtn');
  if(btn) btn.addEventListener('click', ()=> switchTab('compete'));
}

async function renderRoomPanel(){
  const el = document.getElementById('roomPanel');
  if(!el) return;
  {
    // Refresh first so isMeAdmin() below is accurate.
    await refreshRoomMeta();
    const iAmAdmin = isMeAdmin();
    const roomCodeBlockHtml = iAmAdmin
      ? `
      <div class="pbrow" style="margin-bottom:8px;">
        <span>🔗 Room Code aur baaki sab controls ab 👑 Control Panel mein hain (top-right, header).</span>
      </div>
      `
      : `
      <div class="pbrow" style="margin-bottom:8px;">
        <span>🔒 Room Code sirf Admin ke paas hai — naye member ko judwana ho to Admin se bolo.</span>
      </div>
      ${currentRoomAdmin ? `<div class="losshint" style="padding-top:0;">👑 Admin: <b style="color:var(--accent);">${escapeHtml(currentRoomAdmin)}</b></div>` : ''}
      `;
    el.innerHTML = `
      ${roomCodeBlockHtml}
      <div class="grid-label" style="margin-top:14px;">👑 Group Admin</div>
      <div id="adminInfoBar" class="losshint" style="padding-top:0;">Loading…</div>
      <div id="adminControlsWrap"></div>
    `;
    renderAdminSection();
  }
}

// ===== Admin: Full Room Backup (all members' data) =====
// The room Admin can export every member's tracker data — pulled fresh from
// Firebase — into a single downloadable JSON file. Every successful backup
// is also cached on this device (localStorage), so even with no internet
// right now, the Admin can still redownload the last backup they took.
function adminBackupCacheKey(room){ return 'cgl50-admin-backup:' + room; }
function saveAdminBackupCache(room, bundle){
  try{ localStorage.setItem(adminBackupCacheKey(room), JSON.stringify(bundle)); }catch(e){}
}
function loadAdminBackupCache(room){
  try{
    const raw = localStorage.getItem(adminBackupCacheKey(room));
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
// Reminder nudge shown only to the Admin, near the backup buttons: warns
// when the last full-room backup is 7+ days old (or was never taken at
// all), since backups here are purely manual/on-demand with nothing else
// prompting the Admin to keep them fresh.
function formatBackupNudge(cachedBackup){
  const daysSince = cachedBackup ? Math.floor((Date.now() - cachedBackup.exportedAt) / 86400000) : null;
  const stale = (daysSince === null) || daysSince >= 7;
  let text;
  if(daysSince === null) text = '⚠️ Kabhi backup nahi liya — abhi le lo.';
  else if(daysSince === 0) text = '📅 Aakhri backup: aaj liya gaya.';
  else if(daysSince === 1) text = '📅 Aakhri backup: 1 din pehle' + (stale ? ' — naya le lo.' : '.');
  else text = `📅 Aakhri backup: ${daysSince} din pehle` + (stale ? ' — naya le lo.' : '.');
  return { text, stale };
}
function renderBackupNudgeInto(el, cachedBackup){
  if(!el) return;
  const { text, stale } = formatBackupNudge(cachedBackup);
  el.textContent = text;
  el.style.cssText = 'padding-top:0;margin-top:8px;' + (stale
    ? 'border:1px solid var(--loss);background:rgba(248,113,113,0.08);border-radius:6px;padding:8px 10px;color:var(--loss);font-weight:600;'
    : '');
}
function downloadJSONFile(filename, dataObj){
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function fmtBackupFileName(room){
  const d = new Date();
  const pad = n=>String(n).padStart(2,'0');
  return `cgl50-backup-${room}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}
// Pulls every registered member's saved state from Firebase (needs internet)
// PLUS all room-level settings that live outside any one member's data:
// _registry (member name list), _meta (Admin, hidden/restricted members,
// task mode), _announcement (pinned Home-tab message), _weeklyReset
// (this-week leaderboard baseline), _sharedTasks (Admin's shared task
// list). Without these, a restore would bring every member's own tracker
// data back fine but silently reset the room itself — no Admin, nobody
// hidden/restricted, individual task mode, no announcement, no weekly
// baseline — even though nothing about the room actually "reset".
async function buildFullRoomBackup(){
  const room = getRoomCode();
  if(!room) return null;
  const names = await loadRoomRegistry();
  const members = {};
  for(const nm of names){
    try{
      const raw = await kvdbGet(playerKey(nm));
      members[nm] = raw ? JSON.parse(raw) : null;
    }catch(e){ members[nm] = null; }
  }
  const safeParse = (raw)=>{ if(!raw) return null; try{ return JSON.parse(raw); }catch(e){ return null; } };
  const [metaRaw, annRaw, wrRaw, sharedRaw] = await Promise.all([
    kvdbGet('_meta'), kvdbGet('_announcement'), kvdbGet('_weeklyReset'), kvdbGet('_sharedTasks')
  ]);
  return {
    room,
    exportedAt: Date.now(),
    memberCount: names.length,
    members,
    registry: names,
    meta: safeParse(metaRaw),
    announcement: safeParse(annRaw),
    weeklyReset: safeParse(wrRaw),
    sharedTasks: safeParse(sharedRaw)
  };
}
// Pushes every member's state, plus all room-level settings, from a
// previously downloaded backup bundle back into Firebase — used to
// recover a room after data loss. Destructive: overwrites whatever is
// currently in Firebase for each piece. Backups taken before this fix
// (no meta/announcement/weeklyReset/sharedTasks fields) simply restore
// members only, same as before — nothing new is forced onto old files.
async function restoreFullRoomBackup(bundle){
  const room = getRoomCode();
  if(!room || !bundle || !bundle.members) throw new Error('Backup file khali ya galat hai.');
  const names = Object.keys(bundle.members);
  for(const nm of names){
    const val = bundle.members[nm];
    if(val === null || val === undefined) continue;
    await kvdbSet(playerKey(nm), JSON.stringify(val));
  }
  if(Array.isArray(bundle.registry) && bundle.registry.length){
    await kvdbSet('_registry', JSON.stringify(bundle.registry));
    roomRegistryCacheAt = 0;
  }
  if(bundle.meta && typeof bundle.meta==='object'){
    await kvdbSet('_meta', JSON.stringify(bundle.meta));
    roomMetaCacheAt = 0;
  }
  if(bundle.announcement && typeof bundle.announcement==='object'){
    await kvdbSet('_announcement', JSON.stringify(bundle.announcement));
    roomAnnouncementCacheAt = 0;
  }
  if(bundle.weeklyReset && typeof bundle.weeklyReset==='object'){
    await kvdbSet('_weeklyReset', JSON.stringify(bundle.weeklyReset));
    weeklyResetCacheAt = 0;
  }
  if(Array.isArray(bundle.sharedTasks) && bundle.sharedTasks.length){
    await kvdbSet('_sharedTasks', JSON.stringify(bundle.sharedTasks));
    sharedTaskDefsCacheAt = 0;
  }
  return names.length;
}
// Wires the three backup controls (take backup / redownload last / restore
// from file). Called every time the admin section re-renders since the
// buttons are recreated in the DOM each time.
function wireAdminBackupButtons(){
  const allBtn = document.getElementById('adminBackupAllBtn');
  const lastBtn = document.getElementById('adminBackupLastBtn');
  const fileInput = document.getElementById('adminRestoreFile');
  const statusEl = document.getElementById('adminBackupStatus');
  const nudgeEl = document.getElementById('adminBackupNudge');

  const room0 = getRoomCode();
  renderBackupNudgeInto(nudgeEl, room0 ? loadAdminBackupCache(room0) : null);

  if(allBtn) allBtn.addEventListener('click', async ()=>{
    const room = getRoomCode();
    if(!room) return;
    allBtn.disabled = true;
    const oldText = allBtn.textContent;
    allBtn.textContent = '⏳ Backup ban raha hai...';
    try{
      const bundle = await Promise.race([
        buildFullRoomBackup(),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('Internet slow hai ya nahi hai — timeout.')), 15000))
      ]);
      if(!bundle) throw new Error('Room data nahi mil paya.');
      saveAdminBackupCache(room, bundle);
      downloadJSONFile(fmtBackupFileName(room), bundle);
      if(statusEl) statusEl.textContent = `Aakhri backup: ${new Date(bundle.exportedAt).toLocaleString('en-IN')} — ${bundle.memberCount} member(s).`;
      renderBackupNudgeInto(document.getElementById('adminBackupNudge'), bundle);
    }catch(e){
      alert('Backup nahi ban paya.\n\nWajah: ' + ((e&&e.message)||String(e)) + '\n\nInternet check karo aur dobara try karo.');
    }finally{
      allBtn.disabled = false;
      allBtn.textContent = oldText;
    }
  });

  if(lastBtn) lastBtn.addEventListener('click', ()=>{
    const room = getRoomCode();
    const cached = room ? loadAdminBackupCache(room) : null;
    if(!cached){ alert('Abhi tak is device pe koi backup save nahi hai. Pehle internet ke saath "⬇️ Sabka Backup Lo" try karo.'); return; }
    downloadJSONFile(fmtBackupFileName(room), cached);
  });

  if(fileInput) fileInput.addEventListener('change', async (ev)=>{
    const file = ev.target.files && ev.target.files[0];
    if(!file) return;
    try{
      const text = await file.text();
      const bundle = JSON.parse(text);
      const names = Object.keys(bundle.members||{});
      if(!names.length){ alert('Ye file khali hai ya galat format mein hai.'); return; }
      const hasRoomSettings = !!(bundle.meta || bundle.announcement || bundle.weeklyReset || (bundle.sharedTasks && bundle.sharedTasks.length));
      const settingsNote = hasRoomSettings ? ' Isme room settings (Admin, hidden/restricted members, task mode, shared tasks, pinned announcement, weekly baseline) bhi restore hongi.' : ' (Ye purani backup file hai — sirf member data restore hoga, room settings nahi.)';
      if(!confirm(`Ye backup file ${names.length} member(s) ka data restore karegi aur unka current room data overwrite kar degi.${settingsNote} Pakka karna chahte ho?`)) return;
      await restoreFullRoomBackup(bundle);
      alert('Restore ho gaya ✅');
      // Force fresh reads of every cached room-level piece after restore.
      roomRegistryCacheAt = 0;
      roomMetaCacheAt = 0;
      roomAnnouncementCacheAt = 0;
      weeklyResetCacheAt = 0;
      sharedTaskDefsCacheAt = 0;
      await refreshRoomMeta();
      await renderRoomPanel();
      await renderAdminPanelBody();
      await renderCompetePanel();
    }catch(e){
      alert('Restore nahi ho paya.\n\nWajah: ' + ((e&&e.message)||String(e)));
    }finally{
      fileInput.value = '';
    }
  });
}

// Wires the pinned-announcement editor. Called every time the admin
// wireAdminBackupButtons(), since these controls are recreated in the DOM
// on each render.
function wireAdminAnnouncementAndWeeklyControls(){
  const postAnnBtn = document.getElementById('postAnnBtn');
  if(postAnnBtn) postAnnBtn.addEventListener('click', async ()=>{
    const inp = document.getElementById('annInput');
    const val = (inp ? inp.value : '').trim();
    if(!val){ alert('Pehle kuch likho, fir Post karo.'); return; }
    postAnnBtn.disabled = true;
    postAnnBtn.textContent = '⏳...';
    await setRoomAnnouncement(val);
    await renderAdminPanelBody();
    safeRun(renderAnnouncementCard, 'renderAnnouncementCard');
  });
  const clearAnnBtn = document.getElementById('clearAnnBtn');
  if(clearAnnBtn) clearAnnBtn.addEventListener('click', async ()=>{
    if(!confirm('Pinned announcement hatana hai?')) return;
    clearAnnBtn.disabled = true;
    clearAnnBtn.textContent = '⏳...';
    await setRoomAnnouncement('');
    await renderAdminPanelBody();
    safeRun(renderAnnouncementCard, 'renderAnnouncementCard');
  });
}

// Admin info block inside the Room panel — kept deliberately compact.
// - No admin yet (older room, created before this feature existed) → shows
//   a "Become Admin" button anyone in the room can claim.
// - Admin exists, viewer IS the admin → just shows a "Control Panel Kholo"
//   button; every real control now lives in the header-only Admin Control
//   Panel modal (see renderAdminPanelBody below), not here.
// - Admin exists, viewer is NOT the admin → just shows who the Admin is.
async function renderAdminSection(){
  const infoEl = document.getElementById('adminInfoBar');
  const wrapEl = document.getElementById('adminControlsWrap');
  if(!infoEl || !wrapEl) return;
  await refreshRoomMeta(); // also syncs the header 👑 button's visibility

  if(!currentRoomAdmin){
    infoEl.innerHTML = 'Is group ka abhi tak koi Admin nahi hai.';
    wrapEl.innerHTML = `
      <div class="btnrow">
        <button class="nav-btn" id="becomeAdminBtn">👑 Admin Bano</button>
      </div>
      <div class="losshint" style="padding-top:6px;">Admin decide karta hai kaunsa member sabko dikhega, kaunsa sirf usko.</div>
    `;
    const becomeBtn = document.getElementById('becomeAdminBtn');
    if(becomeBtn) becomeBtn.addEventListener('click', async ()=>{
      becomeBtn.disabled = true;
      becomeBtn.textContent = '⏳...';
      await setRoomAdmin(myName);
      await renderRoomPanel();
      await renderCompetePanel();
    });
    return;
  }

  const iAmAdmin = isMeAdmin();
  infoEl.innerHTML = `👑 Admin: <b style="color:var(--accent);">${escapeHtml(currentRoomAdmin)}</b>${iAmAdmin ? ' (Tum)' : ''}`
    + (currentRoomSubAdmin ? `<br>🛡️ Sub-Admin: <b style="color:var(--blue);">${escapeHtml(currentRoomSubAdmin)}</b>${isMeSubAdmin() ? ' (Tum)' : ''}` : '');

  if(!iAmAdmin){
    if(isMeSubAdmin()){
      // Deliberate self-service handoff — no way for the app to verify the
      // Admin's account/phone is actually gone, so this is trust-based: the
      // Admin chose this person in advance, and it's on the Sub-Admin to use
      // this only when it's genuinely needed.
      wrapEl.innerHTML = `
        <div class="losshint" style="padding-top:2px;">🛡️ Tum Sub-Admin ho. Admin (<b style="color:var(--accent);">${escapeHtml(currentRoomAdmin)}</b>) ka account kho jaye ya group chhode, to niche button se Admin ban sakte ho.</div>
        <div class="btnrow" style="margin-top:8px;">
          <button class="nav-btn" id="claimAdminBtn">👑 Admin Bano (Takeover)</button>
        </div>
      `;
      const claimBtn = document.getElementById('claimAdminBtn');
      if(claimBtn) claimBtn.addEventListener('click', async ()=>{
        if(!confirm(`Pakka? Tum ab is room ke naye Admin ban jaoge, aur "${currentRoomAdmin}" ke paas Admin powers nahi rahenge.`)) return;
        claimBtn.disabled = true;
        claimBtn.textContent = '⏳...';
        await promoteSubAdminToAdmin();
        await renderRoomPanel();
        await renderCompetePanel();
      });
    } else {
      wrapEl.innerHTML = '';
    }
    return;
  }

  wrapEl.innerHTML = `
    <div class="btnrow" style="margin-top:4px;">
      <button class="nav-btn" id="openAdminPanelFromRoomBtn">⚙️ Control Panel Kholo</button>
    </div>
    <div class="losshint" style="padding-top:6px;">Room code, announcement, backup, member controls, weekly reset — sab isi Control Panel mein hai.</div>
  `;
  const openBtn = document.getElementById('openAdminPanelFromRoomBtn');
  if(openBtn) openBtn.addEventListener('click', openAdminPanelModal);
}

// ===== Admin Control Panel (header-only, 👑 button) =====
// This is where ALL real admin power lives: room code, pinned announcement,
// full backup/restore, and per-member hide/restrict/delete. Only ever
// rendered while isMeAdmin() is true — the header button that opens this
// modal is itself hidden for everyone else, and this function
// double-checks admin status again before rendering anything sensitive.
async function renderAdminPanelBody(){
  const roomCodeWrap = document.getElementById('adminPanelRoomCodeWrap');
  const bodyEl = document.getElementById('adminPanelBody');
  if(!roomCodeWrap || !bodyEl) return;
  await refreshRoomMeta();
  await applySharedTaskModeIfNeeded();
  renderTaskModeSelector();

  if(!isMeAdmin()){
    roomCodeWrap.innerHTML = '';
    bodyEl.innerHTML = `<div class="losshint" style="padding-top:8px;">Tum is room ke Admin nahi ho.</div>`;
    return;
  }

  const room = getRoomCode();
  roomCodeWrap.innerHTML = `
    <div class="pbrow" style="margin-top:12px;margin-bottom:8px;">
      <span>🔗 Room Code: <b style="color:var(--accent);">${escapeHtml(room)}</b></span>
      <button class="nav-btn" id="adminPanelCopyRoomBtn">📋 Copy</button>
    </div>
    <div class="losshint" style="padding-top:0;">Ye code dost ko bhejo — "Join" karke wo isi room mein aa jayega.</div>
  `;
  const copyBtn = document.getElementById('adminPanelCopyRoomBtn');
  if(copyBtn) copyBtn.addEventListener('click', ()=>{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(room).then(()=>alert('Room Code copy ho gaya ✅')).catch(()=>prompt('Manually copy karo:', room));
    } else {
      prompt('Manually copy karo:', room);
    }
  });

  const roomNames = await loadRoomRegistry();
  const others = roomNames.filter(n=> n.toLowerCase()!==myName.toLowerCase());

  // ===== Sub-Admin (backup Admin) picker =====
  // Lets the Admin name exactly one other member who can take over Admin
  // powers themselves later — the intended use is "agar mere account/phone
  // ko kuch ho jaye". There's no login system here, so this app can't detect
  // that automatically; instead the Sub-Admin gets their own takeover
  // button (Room panel) whenever they judge it's actually needed.
  const subAdminHtml = others.length ? `
    <div class="grid-label" style="margin-top:14px;">🛡️ Sub-Admin (Backup Admin)</div>
    <div class="losshint" style="padding-top:0;">Ek member ko Sub-Admin banao — tumhara account kho jaye ya tum group chhodo to wahi Admin ban sakta hai. Jab chaho badal do.</div>
    <div class="btnrow" style="margin-top:8px;flex-wrap:wrap;">
      <select id="subAdminSelect" style="background:var(--panel2);border:1px solid var(--border-strong);border-radius:6px;color:var(--text);font-family:var(--font-main);font-weight:600;font-size:12.5px;padding:8px 10px;">
        <option value="">— Koi nahi —</option>
        ${others.map(nm=>`<option value="${escapeHtml(nm)}" ${(currentRoomSubAdmin && currentRoomSubAdmin.toLowerCase()===nm.toLowerCase()) ? 'selected' : ''}>${escapeHtml(nm)}</option>`).join('')}
      </select>
      <button class="nav-btn" id="setSubAdminBtn">✅ Set Karo</button>
    </div>
    <div class="losshint" style="padding-top:6px;">${currentRoomSubAdmin ? `Abhi Sub-Admin: <b style="color:var(--blue);">${escapeHtml(currentRoomSubAdmin)}</b>` : 'Abhi koi Sub-Admin set nahi hai.'}</div>
  ` : `
    <div class="grid-label" style="margin-top:14px;">🛡️ Sub-Admin (Backup Admin)</div>
    <div class="losshint" style="padding-top:0;">Abhi group mein koi aur member nahi hai, isliye Sub-Admin set nahi kar sakte.</div>
  `;

  const ann = currentRoomAnnouncement;
  const annStatusLine = ann
    ? `Aakhri post: ${new Date(ann.at).toLocaleString('en-IN')}${ann.by ? ` by ${escapeHtml(ann.by)}` : ''}.`
    : 'Abhi koi announcement pinned nahi hai.';
  const announceHtml = `
    <div class="grid-label" style="margin-top:14px;">📌 Pinned Announcement (Home Tab)</div>
    <div class="losshint" style="padding-top:0;">Jo likhoge wo sabke Home tab pe pin ho jayega, jab tak hatao ya naya na likho.</div>
    <div class="voiceField">
      <textarea id="annInput" placeholder="Jaise: Kal shaam 6 baje group study session hai..." style="width:100%;box-sizing:border-box;min-height:70px;margin-top:8px;background:var(--panel2);border:1px solid var(--border-strong);border-radius:6px;color:var(--text);font-family:var(--font-main);font-weight:600;font-size:12.5px;padding:8px 10px;">${ann ? escapeHtml(ann.text) : ''}</textarea>
      <button type="button" class="micBtn" data-mic-target="annInput" aria-label="Bol kar likho" title="Bol kar likho"><svg viewBox="0 0 24 24" class="micIcon"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></button>
    </div>
    <div class="btnrow" style="margin-top:8px;">
      <button class="nav-btn" id="postAnnBtn">📌 Post Karo</button>
      ${ann ? `<button class="nav-btn" id="clearAnnBtn">🗑️ Hatao</button>` : ''}
    </div>
    <div class="losshint" style="padding-top:6px;">${annStatusLine}</div>
  `;

  const weeklyHtml = `
    <div class="grid-label" style="margin-top:14px;">🏆 Leaderboard</div>
    <div class="losshint" style="padding-top:0;">Rank tab ke "Today", "This Week" aur "All-Time" khud-ba-khud reset hote hain — progress, streak ya wallet kuch delete nahi hota, sirf scoreboard restart hota hai.</div>
  `;

  const cachedBackup = room ? loadAdminBackupCache(room) : null;
  const lastBackupLine = cachedBackup
    ? `Aakhri backup: ${new Date(cachedBackup.exportedAt).toLocaleString('en-IN')} — ${cachedBackup.memberCount || Object.keys(cachedBackup.members||{}).length} member(s).`
    : 'Abhi tak koi backup nahi liya gaya.';
  const backupHtml = `
    <div class="grid-label" style="margin-top:14px;">📦 Sabka Data Backup</div>
    <div class="losshint" style="padding-top:0;">Sabhi members ka data ek file mein download karo — backup ya restore ke liye. Internet na ho to "Aakhri Backup" se pichli file mil jayegi.</div>
    <div class="losshint" id="adminBackupNudge"></div>
    <div class="btnrow" style="margin-top:8px;">
      <button class="nav-btn" id="adminBackupAllBtn">⬇️ Sabka Backup Lo</button>
      <button class="nav-btn" id="adminBackupLastBtn">📂 Aakhri Backup (Offline)</button>
      <label class="nav-btn" style="display:inline-block;cursor:pointer;">📤 Backup Se Restore
        <input type="file" id="adminRestoreFile" accept="application/json" style="display:none;">
      </label>
    </div>
    <div class="losshint" id="adminBackupStatus" style="padding-top:6px;">${lastBackupLine}</div>
  `;

  if(!others.length){
    bodyEl.innerHTML = announceHtml + subAdminHtml + weeklyHtml + backupHtml + `<div class="losshint" style="padding-top:14px;">Abhi group mein koi aur member nahi joda.</div>`;
    wireAdminBackupButtons();
    wireAdminAnnouncementAndWeeklyControls();
    return;
  }
  bodyEl.innerHTML = announceHtml + subAdminHtml + weeklyHtml + backupHtml + `
    <div class="losshint" style="padding-top:14px;">"Hide" karne se member ka naam/progress sirf tumhe aur usko dikhega, baaki sabse chhup jayega. 🗑️ Hatao se member hamesha ke liye group se hat jayega.</div>
    <div id="adminMemberList" style="margin-top:8px;display:flex;flex-direction:column;gap:10px;">
      ${others.map(nm=>{
        const hidden = isHiddenFromOthers(nm);
        const restricted = isRestrictedToSelf(nm);
        const statusIcon = restricted ? '🔒' : (hidden ? '🙈' : '👁️');
        return `
        <div class="adminMemberCard">
          <div class="adminMemberTop">
            <span>${statusIcon} ${escapeHtml(nm)}</span>
            <button class="nav-btn adminDelBtn" type="button" data-delete-member="${escapeHtml(nm)}" title="Ye member hamesha ke liye hatao">🗑️ Hatao</button>
          </div>
          <label class="adminMemberToggle">
            <span>Sirf mujhe/khud ko dikhe (baaki sabse hide)</span>
            <input type="checkbox" data-hide-member="${escapeHtml(nm)}" ${hidden ? 'checked' : ''}>
          </label>
          <label class="adminMemberToggle">
            <span>Isko sirf khud + mujhe (Admin) dikhaao — poore app mein</span>
            <input type="checkbox" data-restrict-member="${escapeHtml(nm)}" ${restricted ? 'checked' : ''}>
          </label>
        </div>`;
      }).join('')}
    </div>
  `;
  wireAdminBackupButtons();
  wireAdminAnnouncementAndWeeklyControls();
  const setSubAdminBtn = document.getElementById('setSubAdminBtn');
  if(setSubAdminBtn) setSubAdminBtn.addEventListener('click', async ()=>{
    const sel = document.getElementById('subAdminSelect');
    const val = sel ? sel.value : '';
    setSubAdminBtn.disabled = true;
    setSubAdminBtn.textContent = '⏳...';
    await setRoomSubAdmin(val || null);
    await renderAdminPanelBody();
  });
  bodyEl.querySelectorAll('[data-hide-member]').forEach(chk=>{
    chk.addEventListener('change', async ()=>{
      const nm = chk.getAttribute('data-hide-member');
      chk.disabled = true;
      await setMemberHidden(nm, chk.checked);
      await renderAdminPanelBody();
      await renderCompetePanel();
    });
  });
  bodyEl.querySelectorAll('[data-restrict-member]').forEach(chk=>{
    chk.addEventListener('change', async ()=>{
      const nm = chk.getAttribute('data-restrict-member');
      chk.disabled = true;
      await setMemberRestricted(nm, chk.checked);
      await renderAdminPanelBody();
      await renderCompetePanel();
    });
  });
  bodyEl.querySelectorAll('[data-delete-member]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const nm = btn.getAttribute('data-delete-member');
      if(!confirm(`"${nm}" ko group se hamesha ke liye hata du? Uska is room mein saved progress bhi delete ho jayega.`)) return;
      btn.disabled = true;
      btn.textContent = '⏳...';
      await deleteRoomMember(nm);
      await renderAdminPanelBody();
      await renderCompetePanel();
    });
  });
}

// Opens the header-only Admin Control Panel modal and (re)renders its
// contents fresh. Safe to call even if isMeAdmin() somehow turns out false
// by the time refreshRoomMeta() resolves — renderAdminPanelBody() itself
// guards against that and shows a plain message instead of any controls.
async function openAdminPanelModal(){
  const modal = document.getElementById('adminPanelModal');
  if(!modal) return;
  modal.style.display = 'flex';
  await renderAdminPanelBody();
}
function hideAdminPanelModal(){
  const modal = document.getElementById('adminPanelModal');
  if(modal) modal.style.display = 'none';
}
// Shows/hides the header 👑 button — the ONLY entry point into the Admin
// Control Panel — so it is visible exclusively to the room's current Admin.
// Called every time refreshRoomMeta() resolves, so it always stays in sync
// even if admin status changes on another device mid-session.
function updateAdminPanelBtnVisibility(){
  const btn = document.getElementById('adminPanelBtn');
  if(!btn) return;
  btn.style.display = isMeAdmin() ? 'flex' : 'none';
}

function applyLoadedExtras(){
  const defs = getTaskDefsFromState(state);
  TASKS = defs.map(d=>d.name);
  TASK_START_MIN = defs.map(d=>d.start);
  TASK_DURATIONS_MIN = defs.map(d=>d.duration);
  TASK_VALUES = computeTaskValues(TASK_DURATIONS_MIN);
  // Whichever state just got loaded (mine or a friend's), any in-progress
  // task-edit draft from before is now stale — drop it so the editor
  // rebuilds fresh from the newly-loaded task list next time it's opened.
  taskEditDraft = null;
  if(!state.badgesEarned || typeof state.badgesEarned !== 'object') state.badgesEarned = {};
  migrateLegacyQuizStorageIfNeeded();
  applyTargetSettings();
}

// ===== Custom Target (how many days, starting when) =====
// Stored inside state.__target so it travels with save()/loadPlayerState()
// exactly like everything else (localStorage, window.storage, and the
// sync room all pick it up automatically — no extra plumbing needed).
function fmtISODate(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
// Reads state.__target and points the live START_DATE/TOTAL_DAYS at it.
// If nobody has ever set a target yet, two cases:
//  - brand new player (no day-data at all): default the target to start
//    TODAY — this is what makes a fresh joiner's 50 days begin the day
//    they actually join, instead of a fixed hardcoded date.
//  - a pre-existing player from before this feature existed: keep the
//    original hardcoded date/50-days so their existing day-numbers and
//    history don't shift under them.
function applyTargetSettings(){
  const t = state.__target;
  if(t && t.startDate && t.totalDays){
    START_DATE = new Date(t.startDate+'T00:00:00');
    TOTAL_DAYS = Math.max(1, parseInt(t.totalDays,10) || 50);
    return;
  }
  const hasAnyDayData = Object.keys(state).some(k => /^\d+$/.test(k));
  if(hasAnyDayData){
    START_DATE = new Date('2026-07-06T00:00:00');
    TOTAL_DAYS = 50;
  } else {
    START_DATE = new Date();
    TOTAL_DAYS = 50;
  }
  state.__target = { startDate: fmtISODate(START_DATE), totalDays: TOTAL_DAYS };
}
// Moves every existing day (1..N) plus a summary of that cycle's mocks
// into state.__history, WITHOUT deleting state.__history itself or any
// other player data — so starting a new target never loses old marks,
// mock averages, or scores. Only called right before a new target is
// actually applied, and only if there's real data worth keeping.
function archiveCurrentCycleIfAny(){
  const dayKeys = Object.keys(state).filter(k => /^\d+$/.test(k));
  const hasTouchedData = dayKeys.some(k => isDayTouched(getDay(parseInt(k,10))));
  if(!hasTouchedData) return;
  if(!Array.isArray(state.__history)) state.__history = [];
  const snapshotDays = {};
  dayKeys.forEach(k=>{ snapshotDays[k] = state[k]; });
  state.__history.push({
    startDate: state.__target ? state.__target.startDate : fmtISODate(START_DATE),
    totalDays: state.__target ? state.__target.totalDays : TOTAL_DAYS,
    archivedAt: Date.now(),
    days: snapshotDays
  });
  dayKeys.forEach(k=>{ delete state[k]; });
}
function renderTargetPanel(){
  const el = document.getElementById('targetPanel');
  if(!el) return;
  const histCount = Array.isArray(state.__history) ? state.__history.length : 0;
  el.innerHTML = `
    <div class="losshint" style="padding-top:0;">Naya target set karne par purana progress history mein safe rehta hai, kabhi delete nahi hota${histCount ? ` (abhi tak ${histCount} purana target save hai)` : ''}.</div>
    <div class="scoreform" style="grid-template-columns:1fr 1fr;">
      <div class="scorefield"><label>Kitne Din Ka Target</label><input type="number" min="1" max="365" step="1" id="targetDaysInput" value="${TOTAL_DAYS}"></div>
      <div class="scorefield"><label>Kab Se Shuru</label><input type="date" id="targetStartInput" value="${fmtISODate(START_DATE)}"></div>
    </div>
    <div class="btnrow">
      <button class="nav-btn" id="saveTargetBtn">🎯 Target Set Karo</button>
      ${histCount ? `<button class="nav-btn" id="viewHistoryBtn">📊 Long-Term Analysis Dekho</button>` : ''}
    </div>
    <div class="losshint" id="targetStatusMsg" style="display:none;"></div>
  `;
  const btn = document.getElementById('saveTargetBtn');
  if(btn) btn.addEventListener('click', async ()=>{
    const statusEl = document.getElementById('targetStatusMsg');
    const showStatus = (msg)=>{ if(statusEl){ statusEl.style.display='block'; statusEl.textContent = msg; } };
    const days = Math.max(1, parseInt(document.getElementById('targetDaysInput').value,10)||50);
    const startVal = document.getElementById('targetStartInput').value;
    if(!startVal){ showStatus('⚠️ Start date choose karo.'); return; }
    const isSame = state.__target && state.__target.startDate===startVal && parseInt(state.__target.totalDays,10)===days;
    if(isSame){ showStatus('Ye already current target hai.'); return; }
    const hasData = Object.keys(state).some(k=>/^\d+$/.test(k) && isDayTouched(getDay(parseInt(k,10))));
    if(hasData){
      if(!confirm('Naya target set karoge? Purana progress delete NAHI hoga — history mein permanently safe save ho jayega, aur tracker naye target ke hisaab se Day 1 se shuru ho jayega. Continue?')) return;
    }
    archiveCurrentCycleIfAny();
    state.__target = { startDate: startVal, totalDays: days };
    applyTargetSettings();
    selectedDay = todayDayNum();
    await save();
    renderAll();
    renderExamLine();
    renderTargetPanel();
    showStatus('✅ Naya target set ho gaya — Day 1 se shuru!');
  });
  const histBtn = document.getElementById('viewHistoryBtn');
  if(histBtn) histBtn.addEventListener('click', goToLongTermAnalysis);
}
// Target Settings lives on the Home tab, but the actual Long-Term Analysis
// chart lives on the More tab (next to the rest of the stats/charts) — so
// this just switches tabs and scrolls the section into view.
function goToLongTermAnalysis(){
  switchTab('more');
  setTimeout(()=>{
    const sec = document.getElementById('longTermSection');
    if(sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
  }, 60);
}

// ===== Streak Freeze (Duolingo-style) =====
// A missed day (below the 50% streak threshold, not a rest day) no longer
// has to break the whole streak — up to MAX_STREAK_FREEZES misses get
// auto-covered by a "freeze", so one bad day doesn't wipe out weeks of
// consistency. Freezes regenerate on their own every FREEZE_EARN_EVERY
// days of a live streak (capped at the max). This is a pure function of
// the existing per-day task data, so nothing new needs to be saved or
// synced — it recomputes correctly from state.days every time.
const MAX_STREAK_FREEZES = 2;
const FREEZE_EARN_EVERY = 7;
function computeStreakInfo(){
  const activeUpto = activeUptoDay();
  let streak=0, longest=0, freezes=MAX_STREAK_FREEZES;
  const frozenDays = [];
  for(let i=1;i<=activeUpto;i++){
    const d = getDay(i);
    if(d.rest) continue; // neutral — doesn't touch streak or freezes
    if(meetsStreakTarget(d)){
      streak++;
      if(streak>longest) longest=streak;
      if(streak % FREEZE_EARN_EVERY === 0 && freezes < MAX_STREAK_FREEZES) freezes++;
    } else if(freezes>0){
      freezes--;
      frozenDays.push(i); // a freeze absorbed this miss — streak survives untouched
    } else {
      streak = 0;
    }
  }
  return { streak, longest, freezesLeft:freezes, frozenDays };
}

function computeStats(){
  let daysDone=0;
  for(let i=1;i<=TOTAL_DAYS;i++){ if(dayStatus(i)==='done') daysDone++; }
  const activeUpto = activeUptoDay();
  const streakInfo = computeStreakInfo();
  const streak = streakInfo.streak;
  let totalChecked=0, totalPossible=0;
  for(let i=1;i<=TOTAL_DAYS;i++){
    const d = getDay(i);
    if(d.rest) continue;
    totalChecked += d.tasks.filter(Boolean).length;
    totalPossible += TASKS.length;
  }
  const pct = totalPossible ? Math.round((totalChecked/totalPossible)*100) : 0;

  // Earned/Lost reflect every day that has any data in it, however many
  // days that spans — not just how many real calendar days have passed.
  let earned=0, lost=0;
  for(let i=1;i<=activeUpto;i++){
    const d = getDay(i);
    const r = dayEarnLoss(d, i);
    earned += r.earned;
    lost += r.lost;
  }

  document.getElementById('statDone').textContent = daysDone;
  document.getElementById('statStreak').innerHTML = streak + (streak>0 ? ' <span class="streakfire">🔥</span>' : '');
  const freezeEl = document.getElementById('statFreezeInfo');
  if(freezeEl){
    freezeEl.innerHTML = '🧊'.repeat(streakInfo.freezesLeft) + (streakInfo.freezesLeft<MAX_STREAK_FREEZES ? '<span class="freezeEmpty">'+'🧊'.repeat(MAX_STREAK_FREEZES-streakInfo.freezesLeft)+'</span>' : '');
    freezeEl.title = streakInfo.freezesLeft + '/' + MAX_STREAK_FREEZES + ' streak freeze bache hain — 1 din miss hone par bhi streak safe rahegi.';
  }
  document.getElementById('statPct').textContent = pct+'%';
  document.getElementById('statEarn').textContent = '₹'+Math.round(earned).toLocaleString('en-IN');
  document.getElementById('statLoss').textContent = '₹'+Math.round(lost).toLocaleString('en-IN');
  const net = Math.round(earned-lost);
  const netEl = document.getElementById('statNet');
  netEl.textContent = (net<0?'-':'')+'₹'+Math.abs(net).toLocaleString('en-IN');
  netEl.style.color = net<0 ? 'var(--loss)' : '#000';
}

// Today's live wallet: what's already banked, what's truly missed (slot
// already over and still unticked), and what's still pending (either
// running right now or scheduled later today) — so nothing shows as a
// "loss" before its own time slot has actually passed.
function renderTodayWallet(){
  const earnEl = document.getElementById('statEarnToday');
  if(!earnEl) return;
  const tn = todayDayNum();
  const d = getDay(tn);
  const lossEl = document.getElementById('statLossToday');
  const pendEl = document.getElementById('statPendingToday');
  if(d.rest){
    earnEl.textContent = '😴';
    lossEl.textContent = 'Rest';
    pendEl.textContent = 'Day';
    return;
  }
  const r = dayEarnLoss(d, tn);
  earnEl.textContent = '₹'+Math.round(r.earned).toLocaleString('en-IN');
  lossEl.textContent = '₹'+Math.round(r.lost).toLocaleString('en-IN');
  pendEl.textContent = '₹'+Math.round(r.pending||0).toLocaleString('en-IN');
}

// Longest-ever run of "streak-alive" days (freezes included), where rest
// days pass through without breaking the run (mirrors computeStats above).
function longestStreak(){
  return computeStreakInfo().longest;
}

function checkAndAwardBadges(){
  if(viewingName !== myName) return; // don't mutate or pop up badges while browsing a friend's data
  const longest = longestStreak();
  let newlyEarned = null;
  BADGES.forEach(b=>{
    if(longest>=b.days && !state.badgesEarned[b.days]){
      state.badgesEarned[b.days] = true;
      newlyEarned = b;
    }
  });
  if(newlyEarned){
    showBadge(newlyEarned);
    save();
  }
}

function showBadge(badge){
  const banner = document.getElementById('badgeBanner');
  if(!banner) return;
  document.getElementById('badgeTitle').textContent = `${badge.emoji} Badge Unlocked: ${badge.label}!`;
  document.getElementById('badgeMsg').textContent = BADGE_MESSAGES[badge.days] || 'Zabardast consistency!';
  banner.classList.add('show');
}
document.getElementById('badgeClose').addEventListener('click', ()=>{
  document.getElementById('badgeBanner').classList.remove('show');
});

// ===== Level-up detection =====
// state.lastSeenLevel self-initializes to the CURRENT level the first time
// it's missing (e.g. upgrading from an older save) — so existing users
// don't suddenly get a flood of level-up banners for progress they already
// made before this feature existed.
function checkLevelUp(){
  if(viewingName !== myName) return;
  const info = levelInfo(computeXP());
  if(typeof state.lastSeenLevel !== 'number'){ state.lastSeenLevel = info.level; return; }
  if(info.level > state.lastSeenLevel){
    showLevelUp(info.level);
    state.lastSeenLevel = info.level;
    save();
  } else if(info.level < state.lastSeenLevel){
    state.lastSeenLevel = info.level; // e.g. after a manual reset
  }
}
function showLevelUp(level){
  const banner = document.getElementById('levelBanner');
  if(!banner) return;
  const msg = LEVEL_UP_MESSAGES[Math.floor(Math.random()*LEVEL_UP_MESSAGES.length)];
  document.getElementById('levelBannerTitle').textContent = `⭐ Level Up! Ab Level ${level} — ${levelTitle(level)}`;
  document.getElementById('levelBannerMsg').textContent = msg;
  banner.classList.add('show');
}
document.getElementById('levelBannerClose').addEventListener('click', ()=>{
  document.getElementById('levelBanner').classList.remove('show');
});

function renderLevelCard(){
  const el = document.getElementById('levelCard');
  if(!el) return;
  const info = levelInfo(computeXP());
  const title = levelTitle(info.level);
  const pct = info.xpForNext ? Math.min(100, Math.round((info.xpIntoLevel/info.xpForNext)*100)) : 0;
  el.innerHTML = `
    <div class="levelTop">
      <div class="levelBadge">${info.level}</div>
      <div class="levelInfo">
        <div class="levelName">Level ${info.level}</div>
        <div class="levelSub">⭐ ${title}</div>
      </div>
    </div>
    <div class="bar" style="margin:0 0 4px;"><div class="bar-fill" style="width:${pct}%;"></div></div>
    <div class="levelXpText">${info.xpIntoLevel} / ${info.xpForNext} XP to Level ${info.level+1} &nbsp;•&nbsp; ${info.xp.toLocaleString('en-IN')} XP total</div>
  `;
}

function renderBadges(){
  const containers = [document.getElementById('badgesPanel'), document.getElementById('badgesPanelHome')].filter(Boolean);
  if(!containers.length) return;
  const longest = longestStreak();
  const html = `<div class="badgeRow">` + BADGES.map(b=>{
    const earned = !!state.badgesEarned[b.days];
    return `
      <div class="badgeChip ${earned?'earned':''}">
        <div class="bEmoji">${b.emoji}</div>
        <div class="bLabel">${b.label}</div>
        <div class="bStatus">${earned ? 'Unlocked ✅' : (longest+'/'+b.days+' din')}</div>
      </div>
    `;
  }).join('') + `</div>`;
  containers.forEach(el=>{ el.innerHTML = html; });
}

function showReward(dayNum){
  const banner = document.getElementById('rewardBanner');
  if(!banner) return;
  const msg = MOTIVATION_MESSAGES[Math.floor(Math.random()*MOTIVATION_MESSAGES.length)];
  document.getElementById('rewardTitle').textContent = `🎉 Day ${dayNum} Complete!`;
  document.getElementById('rewardMsg').textContent = msg;
  document.getElementById('rewardAmt').textContent = `Aaj ka full ₹${Math.round(DAILY_TARGET).toLocaleString('en-IN')} kama liya. 🔥`;
  banner.classList.add('show');
}
document.getElementById('rewardClose').addEventListener('click', ()=>{
  document.getElementById('rewardBanner').classList.remove('show');
});

// ===== Anti-instant-complete: proof-of-work note sheet + toast =====
// A checkbox tick on today's own list never lands directly — the change
// handler above holds it back and opens this sheet instead. Only Save
// (with a long-enough note) actually flips dayObj.tasks[idx] to true.
let pendingTaskNoteIdx = null;
let antiCheatToastTimer = null;
function showAntiCheatToast(msg){
  const el = document.getElementById('antiCheatToast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(antiCheatToastTimer);
  antiCheatToastTimer = setTimeout(()=>el.classList.remove('show'), 3200);
}
// ===== Task-complete proof photo (camera / gallery) =====
// Photos are stored ONLY in this browser's IndexedDB — never inside `state`
// (which gets JSON.stringify'd and pushed to localStorage/window.storage/
// Firebase as ONE blob on every save() — see save() above). Base64 images
// stuffed into that blob would blow past window.storage's 5MB-per-key cap
// and make every 25s room-sync heavier. So: photos stay 100% local to this
// device/browser, looked up via a small in-memory key Set so renderPanel
// can decide synchronously whether to show a task's 📷 badge.
const TASK_PHOTO_DB_NAME = 'examTrackerPhotosDB';
const TASK_PHOTO_STORE = 'taskPhotos';
let taskPhotoDbPromise = null;
function openTaskPhotoDb(){
  if(taskPhotoDbPromise) return taskPhotoDbPromise;
  taskPhotoDbPromise = new Promise((resolve, reject)=>{
    if(!('indexedDB' in window)){ reject(new Error('no indexeddb')); return; }
    const req = indexedDB.open(TASK_PHOTO_DB_NAME, 1);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains(TASK_PHOTO_STORE)) db.createObjectStore(TASK_PHOTO_STORE);
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
  return taskPhotoDbPromise;
}
function taskPhotoKey(day, idx){ return `${myName}:${day}:${idx}`; }
async function taskPhotoPut(key, blob){
  try{
    const db = await openTaskPhotoDb();
    await new Promise((resolve, reject)=>{
      const tx = db.transaction(TASK_PHOTO_STORE, 'readwrite');
      tx.objectStore(TASK_PHOTO_STORE).put(blob, key);
      tx.oncomplete = resolve;
      tx.onerror = ()=> reject(tx.error);
    });
    taskPhotoKeySet.add(key);
  }catch(e){ console.error('taskPhotoPut failed', e); }
}
async function taskPhotoGet(key){
  try{
    const db = await openTaskPhotoDb();
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction(TASK_PHOTO_STORE, 'readonly');
      const req = tx.objectStore(TASK_PHOTO_STORE).get(key);
      req.onsuccess = ()=> resolve(req.result || null);
      req.onerror = ()=> reject(req.error);
    });
  }catch(e){ console.error('taskPhotoGet failed', e); return null; }
}
let taskPhotoKeySet = new Set();
async function loadTaskPhotoKeySet(){
  try{
    const db = await openTaskPhotoDb();
    const keys = await new Promise((resolve, reject)=>{
      const tx = db.transaction(TASK_PHOTO_STORE, 'readonly');
      const req = tx.objectStore(TASK_PHOTO_STORE).getAllKeys();
      req.onsuccess = ()=> resolve(req.result || []);
      req.onerror = ()=> reject(req.error);
    });
    taskPhotoKeySet = new Set(keys);
  }catch(e){ console.error('loadTaskPhotoKeySet failed', e); taskPhotoKeySet = new Set(); }
}

// Resizes+JPEG-compresses a picked/captured photo before it ever touches
// IndexedDB — a raw phone-camera shot can be 4-8MB; a task proof photo
// doesn't need full resolution.
function compressImageFile(file, maxDim, quality){
  maxDim = maxDim || 1280; quality = quality || 0.72;
  return new Promise((resolve, reject)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = ()=>{
      let w = img.naturalWidth, h = img.naturalHeight;
      if(w > maxDim || h > maxDim){
        if(w >= h){ h = Math.round(h * (maxDim/w)); w = maxDim; }
        else { w = Math.round(w * (maxDim/h)); h = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob=>{ blob ? resolve(blob) : reject(new Error('toBlob failed')); }, 'image/jpeg', quality);
    };
    img.onerror = (e)=>{ URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// Photo picked/clicked inside the sheet right now — stays in memory only
// until "Complete Karo" is actually pressed; Cancel throws it away.
let pendingTaskPhotoBlob = null;
function clearPendingTaskPhoto(){
  pendingTaskPhotoBlob = null;
  const wrap = document.getElementById('taskPhotoPreviewWrap');
  const img = document.getElementById('taskPhotoPreviewImg');
  if(img && img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  if(img) img.src = '';
  if(wrap) wrap.style.display = 'none';
  const camInput = document.getElementById('taskNoteSheetCameraInput');
  const galInput = document.getElementById('taskNoteSheetGalleryInput');
  if(camInput) camInput.value = '';
  if(galInput) galInput.value = '';
}
async function handleTaskPhotoFileChosen(file){
  if(!file) return;
  try{
    const blob = await compressImageFile(file);
    pendingTaskPhotoBlob = blob;
    const wrap = document.getElementById('taskPhotoPreviewWrap');
    const img = document.getElementById('taskPhotoPreviewImg');
    if(img){
      if(img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(blob);
    }
    if(wrap) wrap.style.display = '';
  }catch(e){
    console.error('photo compress failed', e);
    alert('Photo load nahi ho payi, dobara try karo.');
  }
}
{
  const camBtn = document.getElementById('taskNoteSheetCameraBtn');
  const galBtn = document.getElementById('taskNoteSheetGalleryBtn');
  const camInput = document.getElementById('taskNoteSheetCameraInput');
  const galInput = document.getElementById('taskNoteSheetGalleryInput');
  const removeBtn = document.getElementById('taskPhotoRemoveBtn');
  // Two separate inputs on purpose: the `capture="environment"` one opens
  // the phone's camera app directly on most Android/iOS browsers, while the
  // plain one always opens the normal gallery/file picker — so both of the
  // person's explicit options ("camera se click" / "gallery se chuno") are
  // guaranteed, instead of relying on the OS's combined picker UI.
  if(camBtn && camInput) camBtn.addEventListener('click', ()=> camInput.click());
  if(galBtn && galInput) galBtn.addEventListener('click', ()=> galInput.click());
  if(camInput) camInput.addEventListener('change', ()=> handleTaskPhotoFileChosen(camInput.files && camInput.files[0]));
  if(galInput) galInput.addEventListener('change', ()=> handleTaskPhotoFileChosen(galInput.files && galInput.files[0]));
  if(removeBtn) removeBtn.addEventListener('click', clearPendingTaskPhoto);
}

// ===== Photo lightbox — tap a task's 📷 badge to view the full photo =====
async function openTaskPhotoLightbox(day, idx){
  const key = taskPhotoKey(day, idx);
  const blob = await taskPhotoGet(key);
  if(!blob){ showAntiCheatToast('📷 Ye photo is device pe nahi mili.'); return; }
  const overlay = document.getElementById('imgLightboxOverlay');
  const img = document.getElementById('imgLightboxImg');
  if(img){
    if(img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(blob);
  }
  if(overlay) overlay.classList.add('show');
}
function closeTaskPhotoLightbox(){
  const overlay = document.getElementById('imgLightboxOverlay');
  const img = document.getElementById('imgLightboxImg');
  if(overlay) overlay.classList.remove('show');
  if(img && img.src && img.src.startsWith('blob:')){ URL.revokeObjectURL(img.src); img.src=''; }
}
{
  const closeBtn = document.getElementById('imgLightboxCloseBtn');
  const overlay = document.getElementById('imgLightboxOverlay');
  if(closeBtn) closeBtn.addEventListener('click', closeTaskPhotoLightbox);
  if(overlay) overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeTaskPhotoLightbox(); });
}

function openTaskNoteSheet(idx){
  pendingTaskNoteIdx = idx;
  const overlay = document.getElementById('taskNoteSheetOverlay');
  const nameEl = document.getElementById('taskNoteSheetTaskName');
  const input = document.getElementById('taskNoteSheetInput');
  const err = document.getElementById('taskNoteSheetErr');
  const extra = document.getElementById('taskNoteSheetExtra');
  if(!overlay) return;
  if(nameEl) nameEl.textContent = TASKS[idx] || '';
  if(input) input.value = '';
  if(err) err.classList.remove('show');
  clearPendingTaskPhoto();
  // Task submit karte hi — agar iss task ka naam "mock" bata raha hai, iske
  // sahi score/wrong-log fields yahin sheet ke andar apne aap aa jaate hain.
  const autoType = taskAutoType(TASKS[idx]);
  const hasScoreBox = (autoType==='mockScore' || autoType==='mockAnalysis' || autoType==='sectional');
  if(extra){
    if(hasScoreBox){
      extra.innerHTML = taskScoreBoxHtml(getDay(selectedDay), autoType, '');
      bindScoreBoxEvents(extra);
      extra.style.display = '';
    } else {
      extra.innerHTML = '';
      extra.style.display = 'none';
    }
  }
  overlay.classList.add('show');
  requestAnimationFrame(()=>{ if(input) input.focus(); });
}
function hideTaskNoteSheet(){
  const overlay = document.getElementById('taskNoteSheetOverlay');
  if(overlay) overlay.classList.remove('show');
  pendingTaskNoteIdx = null;
  clearPendingTaskPhoto();
}
document.getElementById('taskNoteSheetCancel').addEventListener('click', ()=>{
  hideTaskNoteSheet();
  renderAll(); // checkbox never actually got ticked — re-render shows it unticked
});
document.getElementById('taskNoteSheetSave').addEventListener('click', async ()=>{
  const idx = pendingTaskNoteIdx;
  if(idx===null || idx===undefined) return;
  const input = document.getElementById('taskNoteSheetInput');
  const err = document.getElementById('taskNoteSheetErr');
  const note = (input && input.value ? input.value : '').trim();
  if(note.length < TASK_NOTE_MIN_LEN){
    if(err) err.classList.add('show');
    return;
  }
  const dayObj = getDay(selectedDay);
  const doneBefore = dayObj.tasks.filter(Boolean).length;
  dayObj.tasks[idx] = true;
  dayObj.taskNotes[idx] = note;
  dayObj.taskCheckedAt[idx] = Date.now();
  const doneAfter = dayObj.tasks.filter(Boolean).length;
  if(taskTimers[idx]) clearTaskTimer(idx);
  // Photo (if attached) is saved to local IndexedDB BEFORE hideTaskNoteSheet
  // wipes pendingTaskPhotoBlob — see clearPendingTaskPhoto() inside it.
  if(pendingTaskPhotoBlob) await taskPhotoPut(taskPhotoKey(selectedDay, idx), pendingTaskPhotoBlob);
  hideTaskNoteSheet();
  renderAll();
  await save();
  if(doneBefore < TASKS.length && doneAfter === TASKS.length){
    showReward(selectedDay);
  }
});

// ===== Merged Calendar+Grid View =====
// Instead of toggling between a plain 1-50 number grid and a separate real
// wall-calendar, this single view shows the real weekday-aligned calendar
// (so it always lines up with actual dates/Sundays) with each in-range cell
// ALSO carrying its Plan Day number as a small badge — so both the real
// date and "Day N of 50" are visible on the same cell at the same time.
const WEEKDAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
function pad2(n){ return String(n).padStart(2,'0'); }
function dateKeyOf(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function buildDateToDayMap(){
  const map = {};
  for(let i=1;i<=TOTAL_DAYS;i++){
    const d = new Date(START_DATE);
    d.setDate(d.getDate() + (i-1));
    map[dateKeyOf(d)] = i;
  }
  return map;
}
function monthsInPlanRange(){
  const endDate = new Date(START_DATE); endDate.setDate(endDate.getDate() + TOTAL_DAYS - 1);
  const months = [];
  let cursor = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), 1);
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while(cursor.getTime() <= endCursor.getTime()){
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth()+1, 1);
  }
  return months;
}
function renderCalendarView(){
  const el = document.getElementById('calendarView');
  if(!el) return;
  const dateMap = buildDateToDayMap();
  const tn = todayDayNum();
  const frozenSet = new Set(computeStreakInfo().frozenDays);
  let html = '';
  monthsInPlanRange().forEach(({year,month})=>{
    const monthTitle = new Date(year,month,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
    const firstWeekday = new Date(year,month,1).getDay();
    const daysInMonth = new Date(year,month+1,0).getDate();
    let cells = '';
    for(let b=0;b<firstWeekday;b++){ cells += `<div class="daycell outrange" style="visibility:hidden;"></div>`; }
    for(let dnum=1; dnum<=daysInMonth; dnum++){
      const key = dateKeyOf(new Date(year,month,dnum));
      const planDay = dateMap[key];
      if(planDay===undefined){
        cells += `<div class="daycell outrange">${dnum}</div>`;
      } else {
        const status = dayStatus(planDay);
        const frozen = frozenSet.has(planDay);
        let cls = 'daycell ' + status;
        if(frozen) cls += ' frozen';
        if(planDay===tn) cls += ' today';
        if(planDay===selectedDay) cls += ' selected';
        // ₹5,000 daily target heatmap: only for today/past days that aren't
        // a rest day or already streak-frozen (those keep their own look) —
        // gives a strong colour signal (instead of just numbers) so a
        // slipping day is obvious before the streak actually breaks.
        if(!frozen && status!=='rest' && planDay<=tn){
          const dObj = getDay(planDay);
          const el2 = dayEarnLoss(dObj, planDay);
          const pct = DAILY_TARGET>0 ? (el2.earned / DAILY_TARGET) * 100 : 0;
          if(pct >= 75) cls += ' pct-high';
          else if(pct >= 50) cls += ' pct-mid';
          else if(pct <= 20) cls += ' pct-low';
        }
        let badge = '';
        if(frozen) badge = '🧊';
        else if(status==='done') badge = '✅';
        else if(status==='rest') badge = '😴';
        else if(status==='partial') badge = '⏳';
        cells += `<div class="${cls}" data-plan-day="${planDay}" title="Day ${planDay} — ${fmtDate(planDay)}${frozen?' — 🧊 Streak Freeze se bacha hua':''}">${dnum}${badge?`<span class="daybadge">${badge}</span>`:''}<span class="planDayBadge">D${planDay}</span></div>`;
      }
    }
    html += `
      <div class="calWrap">
        <div class="calMonthTitle">🗓️ ${monthTitle}</div>
        <div class="calWeekHead">${WEEKDAY_LABELS.map(w=>`<span>${w}</span>`).join('')}</div>
        <div class="calGrid">${cells}</div>
      </div>`;
  });
  el.innerHTML = html;
  if(!el.dataset.delegated){
    el.addEventListener('click', (e)=>{
      const cell = e.target.closest('.daycell[data-plan-day]');
      if(!cell) return;
      selectedDay = parseInt(cell.getAttribute('data-plan-day'), 10);
      renderAll();
    });
    el.dataset.delegated = '1';
  }
}

// ===== Home tab: Last 4 Days Heatmap =====
// A compact, always-visible strip (today + last 3 days) using the same
// ₹5,000-target colour logic as the full calendar — dark green (75%+),
// light green (50%+), dark red (20% ya kam) — so the streak-risk signal
// is visible the instant Home tab opens, without scrolling to Today tab's
// full calendar.
function renderLast4DaysHeatmap(){
  const el = document.getElementById('last4Heatmap');
  if(!el) return;
  const tn = todayDayNum();
  const frozenSet = new Set(computeStreakInfo().frozenDays);
  const planDays = [];
  for(let i=3;i>=0;i--){
    const pd = tn - i;
    if(pd>=1) planDays.push(pd);
  }
  let html = '';
  planDays.forEach(pd=>{
    const d = getDay(pd);
    const status = dayStatus(pd);
    const frozen = frozenSet.has(pd);
    const el2 = dayEarnLoss(d, pd);
    const pct = DAILY_TARGET>0 ? Math.round((el2.earned / DAILY_TARGET) * 100) : 0;
    let cls = 'last4Cell';
    let icon = '❌';
    if(d.rest){ cls += ' rest'; icon = '😴'; }
    else if(frozen){ cls += ' frozen'; icon = '🧊'; }
    else {
      if(pct>=75) cls += ' pct-high';
      else if(pct>=50) cls += ' pct-mid';
      else if(pct<=20) cls += ' pct-low';
      icon = status==='done' ? '✅' : status==='partial' ? '⏳' : '❌';
    }
    if(pd===tn) cls += ' today';
    const dayLbl = pd===tn ? 'Aaj' : fmtDate(pd).split(',')[0];
    const pctLbl = d.rest ? 'Rest' : (pct+'%');
    html += `<div class="${cls}" title="Day ${pd} — ${fmtDate(pd)} — ₹${Math.round(el2.earned).toLocaleString('en-IN')} / ₹${Math.round(DAILY_TARGET).toLocaleString('en-IN')} (${pct}%)">
        <div class="last4Day">${dayLbl}</div>
        <div class="last4Icon">${icon}</div>
        <div class="last4Pct">${pctLbl}</div>
      </div>`;
  });
  el.innerHTML = html;
}
// baaki tasks complete karo" — only meaningful for TODAY, on your own
// tracker (schedule doesn't apply to past days or a friend's read-only view).
function buildTimeGuideHtml(){
  if(viewingName !== myName){
    return `<div class="guideNote">🧭 Ye guide sirf tumhari apni tracker par dikhta hai.</div>`;
  }
  if(selectedDay !== todayDayNum()){
    return `<div class="guideNote">🧭 Live time-guide sirf <b>aaj</b> (Day ${todayDayNum()}) ke liye kaam karta hai — "Today" wapas jaane ke liye upar wale calendar mein Day ${todayDayNum()} wali date dabao.</div>`;
  }
  const d = getDay(selectedDay);
  if(d.rest){
    return `<div class="guideDone">😴 Aaj Rest Day mark hai — enjoy karo, kal fresh energy ke saath wapas aana.</div>`;
  }
  const cur = nowMinutes();
  const ts = getTimeSettings();
  const dayEnd = ts.dayEnd;
  const myBreaks = ts.breaks;

  // Tag each pending task against its ORIGINAL scheduled slot (so we still
  // know what's missed/live/upcoming) — but the time shown to the person
  // below is a brand-new plan built from right now onward, so it never
  // shows a slot that has already gone by.
  const pending = [];
  TASKS.forEach((t, idx)=>{
    if(!d.tasks[idx]){
      const {start,end} = taskSlot(idx);
      let tag, tagClass;
      if(cur>=end){ tag='⚠️ Chuk Gaya'; tagClass='tagmiss'; }
      else if(cur>=start && cur<end){ tag='🔵 Chal Raha'; tagClass='tagnow'; }
      else { tag='⏳ Aage Hai'; tagClass='tagnext'; }
      pending.push({ idx, name:t, tag, tagClass, mins: TASK_DURATIONS_MIN[idx]||0 });
    }
  });
  if(pending.length===0){
    return `<div class="guideDone">🎉 Aaj ke saare tasks clear ho chuke hain! Poora ₹${Math.round(DAILY_TARGET).toLocaleString('en-IN')} kama liya — kal isi josh ke saath phir milte hain.</div>`;
  }

  // Rebuild the rest of the day starting from THIS MOMENT — but still
  // hopping over the person's own break windows (set above in Smart Time
  // Settings) instead of chaining tasks straight through them. Any break
  // that gets skipped over is recorded so it can be shown as its own row.
  let cursor = cur;
  const guideEntries = [];
  pending.forEach(p=>{
    const rawStart = cursor;
    const placedStart = placeAfterBreaks(cursor, p.mins, myBreaks);
    myBreaks.forEach(b=>{
      if(b.end > rawStart && b.end <= placedStart){
        guideEntries.push({ isBreak:true, start: Math.max(b.start, rawStart), end: b.end });
      }
    });
    p.newStart = placedStart;
    p.newEnd = placedStart + p.mins;
    guideEntries.push({ isBreak:false, task: p });
    cursor = p.newEnd;
  });
  const finishTime = cursor;
  const neededMins = pending.reduce((a,p)=>a+p.mins, 0);
  const potentialEarn = Math.round(pending.reduce((a,p)=>a+taskValue(p.idx), 0));

  let head;
  if(finishTime <= dayEnd){
    head = `⏰ Abhi <b>${fmtClock(cur)}</b> hai — abhi se lagatar shuru karo (☕ tumhare set kiye breaks ke saath) to bache hue ${pending.length} task${pending.length>1?'s':''} (~${fmtHours(neededMins)}) <b>${fmtClock(finishTime)}</b> tak khatam ho jayenge — tumhare <b>${fmtClock(dayEnd)}</b> target ke andar hi. Neeche diye naye time ke hisaab se ek-ek karke nipta do!`;
  } else {
    const overBy = finishTime - dayEnd;
    head = `⚠️ Abhi <b>${fmtClock(cur)}</b> hai — tumhare breaks ke saath abhi se lagatar shuru karke bhi bache hue ${pending.length} task${pending.length>1?'s':''} (~${fmtHours(neededMins)}) <b>${fmtClock(finishTime)}</b> tak hi khatam honge — tumhare <b>${fmtClock(dayEnd)}</b> target se ~${fmtHours(overBy)} zyada. Speed thodi badhao, kuch breaks chhote kar do, ya sabse chhota/kam zaroori task kal ke liye rakho — par turant neeche wale naye time-plan se shuru ho jao.`;
  }

  const rows = guideEntries.map(g=>{
    if(g.isBreak){
      return `
    <div class="guideRow break">
      <div class="guideTaskName">☕ Break</div>
      <div class="guideTaskMeta"><span>${fmtClock(g.start)}–${fmtClock(g.end)}</span><span class="guideTag">🧘 Rest</span></div>
    </div>`;
    }
    const p = g.task;
    return `
    <div class="guideRow ${p.tagClass}">
      <div class="guideTaskName">${escapeHtml(p.name)}</div>
      <div class="guideTaskMeta"><span>${fmtClock(p.newStart)}–${fmtClock(p.newEnd)}</span><span class="guideTag">${p.tag}</span></div>
    </div>`;
  }).join('');
  return `
    <div class="guideHead">${head}</div>
    <div class="guideAiBox" id="guideAiBox">${buildGuideAiBoxHtml(loadTimeGuideAiCache())}</div>
    <div class="guideRows">${rows}</div>
    <div class="guideFoot">Sabhi bache tasks poore karke aaj <b>+₹${potentialEarn.toLocaleString('en-IN')}</b> aur kama sakte ho — breaks lekar bhi <b>${fmtClock(dayEnd)}</b> tak target hit ho sakta hai.</div>
  `;
}
// ===== Smart Time Guide — AI Tip =====
// The schedule/rows above are pure deterministic arithmetic (exact clock
// times), which must stay 100% reliable — so the AI is only used for the
// qualitative layer on top: which pending task to prioritise right now, and
// a concrete trick if the day is running late. Same call/cache/fallback
// pattern as the AI Strict Manager, but on-demand (button-triggered) rather
// than a fixed daily popup, since the plan changes every time a task is
// ticked off through the day.
function collectTimeGuideData(){
  const tn = todayDayNum();
  const d = getDay(tn);
  const cur = nowMinutes();
  const ts = getTimeSettings();
  const dayEnd = ts.dayEnd;
  const myBreaks = ts.breaks;
  const pending = [];
  TASKS.forEach((t, idx)=>{
    if(d.tasks[idx]) return;
    const {start,end} = taskSlot(idx);
    let status;
    if(cur>=end) status='missed';
    else if(cur>=start && cur<end) status='live';
    else status='upcoming';
    pending.push({ idx, name:t, minutesNeeded: TASK_DURATIONS_MIN[idx]||0, status, originalSlot: fmtClock(start)+'–'+fmtClock(end) });
  });
  let cursor = cur;
  pending.forEach(p=>{
    const placedStart = placeAfterBreaks(cursor, p.minutesNeeded, myBreaks);
    p.suggestedSlot = fmtClock(placedStart)+'–'+fmtClock(placedStart+p.minutesNeeded);
    cursor = placedStart + p.minutesNeeded;
  });
  const finishTime = cursor;
  const potentialEarn = Math.round(pending.reduce((a,p)=>a+taskValue(p.idx), 0));
  return {
    dayNumber: tn,
    totalDays: TOTAL_DAYS,
    currentTime: fmtClock(cur),
    dayEndTarget: fmtClock(dayEnd),
    pendingTasks: pending.map(p=>({ name:p.name, minutesNeeded:p.minutesNeeded, status:p.status, originalSlot:p.originalSlot, suggestedSlot:p.suggestedSlot })),
    projectedFinishTime: fmtClock(finishTime),
    onTrackForTarget: finishTime<=dayEnd,
    minutesOverTarget: Math.max(0, finishTime-dayEnd),
    minutesSpareBeforeTarget: Math.max(0, dayEnd-finishTime),
    potentialEarningsIfAllDoneToday: potentialEarn,
    breaksPlannedCount: myBreaks.length,
    underperformanceStreakDays: computeUnderperformanceStreak(),
    notesToday: (d.notes||'').trim()
  };
}
async function callTimeGuideAI(data){
  const system = "Tum ek practical \"Smart Time Coach\" ho jo SSC CGL ki taiyari kar rahe student ko \"Recovery Mode\" mindset se seedha, practical Hinglish (Roman script Hindi+English mix) advice dete ho — kabhi shuddh English paragraph mat likho. Tumhe student ka abhi ka time-status JSON milega: kitna time bacha hai, kaunse tasks pending hain (naam, kitne minute chahiye, status missed/live/upcoming, naya suggested slot), projected finish time, target time. Isi order mein soch kar ek flowing paragraph banao (headings/bullets nahi, bas yehi logic andar ho): 1) Pehle ek chhota reality-check — abhi currentTime kya hai — aur agar koi task 'missed' status mein hai to usse ek line mein bina guilt/panic ke band karo ('woh gaya, ab uspar time waste mat karo') taaki student uspar atka na rahe. 2) Turant batao ki abhi is second kaunsa kaam shuru karna hai — jo 'live' hai ya sabse pehla pending task. 3) Agar kisi missed task ki wajah se koi purana slot khaali ho gaya hai aur uss khaali slot mein koi doosra pending/chhoota kaam fit ho sakta hai, to specific naam lekar woh swap suggest karo (jaise 'subah ka missed X ab is khaali slot mein kar lo'). 4) Agar projectedFinishTime target se aage hai, ek practical trick do — kaunsa specific kam-zaroori task kal ke liye push karna hai ya kitne minute kaate ja sakte hain, number/naam specific ho. 5) Agar din khatam hone tak bhi koi cheez genuinely fit nahi ho paayegi, use raat sone se pehle ek chhoti catch-up penalty ke roop mein daal do — use bhoolne mat do. 6) Agar sab on-track hai to sirf ek chhota confidence-boost + focus-tip do. Kabhi generic 'time manage karo' jaisi baatein mat likho — hamesha diye gaye JSON se grounded, specific advice do. Response 90-150 words, ek plain paragraph (zaroorat ho to ek-do jagah blank line se break), koi markdown/bullet/heading/asterisk use mat karo kyunki ye seedha ek chhoti card mein dikhaya jayega.";

  const userMsg = "Mera abhi ka time-status (JSON):\n" + JSON.stringify(data, null, 2) + "\n\nIsko dekhkar ek practical \"Smart Time Coach\" jaisa chhota Hinglish tip do.";

  const resp = await fetch(AI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: system,
      messages: [{ role: "user", content: userMsg }]
    })
  });
  if(!resp.ok) throw new Error('Time Guide AI request failed: ' + resp.status);
  const json = await resp.json();
  const text = (json.content || [])
    .filter(b => b && b.type === 'text' && b.text)
    .map(b => b.text)
    .join('\n')
    .trim();
  if(!text) throw new Error('Time Guide AI: empty response');
  return text;
}
// Rule-based fallback if the API isn't reachable (e.g. this file opened
// outside claude.ai as a plain PWA) — grounded in the same numbers, so the
// feature never just breaks/does nothing.
function buildTimeGuideAiFallback(data){
  const first = data.pendingTasks[0];
  if(!first) return "Aaj ke saare tasks clear ho chuke hain — badhiya chal raha hai!";
  const missedBit = first.status === 'missed'
    ? `"${first.name}" ka original slot nikal chuka hai — usme guilt mat karo, woh gaya, bas turant isi ko shuru karke aage badho. `
    : `"${first.name}" se seedha shuru karo. `;
  if(data.onTrackForTarget){
    const spareBit = data.minutesSpareBeforeTarget>0 ? ` Target se karib ${data.minutesSpareBeforeTarget} min pehle hi khatam ho jayega, chaho to extra revision nikal sakte ho.` : '';
    return `Abhi ${data.currentTime} hai aur plan on-track hai — ${missedBit}phir list ke order mein ek-ek karke nipta do.${spareBit} Aakhri stretch mein phone side rakho, focus mat bhatakne do.`;
  }
  return `Abhi ${data.currentTime} hai aur bache hue tasks target se karib ${data.minutesOverTarget} min aage nikal rahe hain. ${missedBit}Agar time tight lage to sabse chhota ya kam-zaroori pending task kal ke liye push kar do — aur jo cheez aaj kisi tarah fit na ho paaye, use raat sone se pehle ek chhota catch-up slot mein zaroor daal do, forget mat karo.`;
}
function timeGuideAiCacheKey(){
  return 'cgl50-timeguide-ai-' + (myName||'me').toLowerCase() + '-' + fmtISODate(new Date());
}
function loadTimeGuideAiCache(){
  try{
    const raw = localStorage.getItem(timeGuideAiCacheKey());
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function saveTimeGuideAiCache(obj){
  try{ localStorage.setItem(timeGuideAiCacheKey(), JSON.stringify(obj)); }catch(e){}
}
async function getTimeGuideAiMessage(forceRefresh){
  if(!forceRefresh){
    const cached = loadTimeGuideAiCache();
    if(cached) return cached;
  }
  const data = collectTimeGuideData();
  let text, source;
  try{
    text = await callTimeGuideAI(data);
    source = 'ai';
  }catch(e){
    console.error('Time Guide AI call failed, offline fallback use ho raha hai:', e);
    text = buildTimeGuideAiFallback(data);
    source = 'offline';
  }
  const result = { text, source, ts: Date.now() };
  saveTimeGuideAiCache(result);
  return result;
}
function buildGuideAiBoxHtml(cached){
  if(!cached){
    return `<div class="btnrow"><button class="nav-btn" type="button" id="tgAiBtn" data-tg-refresh="0">🤖 AI Se Smart Tip Lo</button></div>`;
  }
  return `
    <div class="guideAiTip"><span class="guideAiSourceTag">${cached.source==='ai' ? '🤖 AI TIP' : '📐 OFFLINE TIP'}</span>${escapeHtml(cached.text)}</div>
    <div class="btnrow"><button class="nav-btn" type="button" id="tgAiBtn" data-tg-refresh="1">🔄 Phir Se AI Tip Lo</button></div>
  `;
}
function wireGuideAiBox(){
  const btn = document.getElementById('tgAiBtn');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    const forceRefresh = btn.getAttribute('data-tg-refresh')==='1';
    const box = document.getElementById('guideAiBox');
    if(box) box.innerHTML = `<div class="guideAiTip">🧠 AI tumhara abhi ka time-plan dekh raha hai…</div>`;
    try{
      const result = await getTimeGuideAiMessage(forceRefresh);
      if(box){ box.innerHTML = buildGuideAiBoxHtml(result); wireGuideAiBox(); }
    }catch(e){
      if(box) box.innerHTML = `<div class="guideAiTip">Tip abhi nahi ban paayi — thodi der mein phir try karo.</div>`;
      console.error('Time Guide AI box error:', e);
    }
  });
}
function renderTimeGuide(){
  const el = document.getElementById('timeGuideBox');
  if(!el) return;
  el.innerHTML = buildTimeGuideHtml();
  wireGuideAiBox();
}

// ===== "Right Now" mini card on Home: a one-glance summary of what's
// scheduled at this very moment, without needing to open the Today tab.
function renderRightNowCard(){
  const el = document.getElementById('rightNowBox');
  if(!el) return;
  if(viewingName !== myName){
    el.innerHTML = '';
    return;
  }
  const tn = todayDayNum();
  const d = getDay(tn);
  if(d.rest){
    el.className = 'rightNowCard';
    el.innerHTML = `
      <div class="rightNowDot"></div>
      <div class="rightNowBody">
        <div class="rightNowLbl">Aaj</div>
        <div class="rightNowTask">😴 Rest Day — enjoy karo!</div>
      </div>`;
    return;
  }
  const cur = nowMinutes();
  let match = null;
  for(let idx=0; idx<TASKS.length; idx++){
    if(d.tasks[idx]) continue;
    const {start,end} = taskSlot(idx);
    if(cur>=start && cur<end){ match = {idx, name:TASKS[idx], start, end, state:'live'}; break; }
  }
  if(!match){
    for(let idx=0; idx<TASKS.length; idx++){
      if(d.tasks[idx]) continue;
      const {start,end} = taskSlot(idx);
      if(cur < start){ match = {idx, name:TASKS[idx], start, end, state:'next'}; break; }
      if(cur >= end){ match = match || {idx, name:TASKS[idx], start, end, state:'miss'}; }
    }
  }
  if(!match){
    el.className = 'rightNowCard live';
    el.innerHTML = `
      <div class="rightNowDot"></div>
      <div class="rightNowBody">
        <div class="rightNowLbl">Right Now</div>
        <div class="rightNowTask">🎉 Aaj ke saare tasks clear!</div>
      </div>`;
    return;
  }
  const stateCls = match.state==='live' ? 'live' : (match.state==='miss' ? 'miss' : '');
  const lbl = match.state==='live' ? 'Abhi Chal Raha Hai' : (match.state==='miss' ? 'Missed Slot — Abhi Karo' : 'Agla Task');
  el.className = 'rightNowCard ' + stateCls;
  el.innerHTML = `
    <div class="rightNowDot"></div>
    <div class="rightNowBody">
      <div class="rightNowLbl">${lbl}</div>
      <div class="rightNowTask">${escapeHtml(match.name)}</div>
      <div class="rightNowTime">${fmtClock(match.start)}–${fmtClock(match.end)}</div>
    </div>
    <button class="nav-btn rightNowGo" id="rightNowGoBtn">Karo ➜</button>
  `;
  const btn = document.getElementById('rightNowGoBtn');
  if(btn) btn.addEventListener('click', ()=>{ selectedDay = tn; switchTab('today'); renderAll(); });
}

// ===== Home tab mini banner for a per-task ⏱️ timer that's actively
// running — previously this state was only visible if you happened to be
// on the Today tab with that task's box expanded. Tapping it jumps to
// Today with that box pre-opened.
function ttHomeBannerTime(t){
  if(t.mode === 'stopwatch') return formatMMSSApprox(t.workAccumSec);
  const segTotal = t.isBreak ? POMODORO_BREAK_MIN*60 : POMODORO_WORK_MIN*60;
  const segLeft = segTotal - (t.isBreak ? t.breakElapsedSec : t.sessionWorkSec);
  return formatMMSSApprox(segLeft);
}
function renderHomeTimerBanner(){
  const el = document.getElementById('homeTimerBanner');
  if(!el) return;
  if(viewingName !== myName){ el.className=''; el.innerHTML=''; return; }
  ensureTaskTimerDayFresh();
  const idxStr = findRunningTaskIdx();
  if(idxStr === undefined){ el.className=''; el.innerHTML=''; return; }
  const idx = parseInt(idxStr,10);
  const t = taskTimers[idx];
  el.className = 'homeTimerBanner';
  el.innerHTML = `
    <div class="homeTimerDot"></div>
    <div class="homeTimerBody">
      <div class="homeTimerLbl"><span class="icoClock" aria-hidden="true"></span> Running${t.isBreak?' · Break':''}</div>
      <div class="homeTimerTask">${escapeHtml(TASKS[idx]||'Task')}</div>
    </div>
    <div class="homeTimerClock" id="homeTimerClock">${ttHomeBannerTime(t)}</div>
  `;
  el.onclick = ()=>{ selectedDay = todayDayNum(); taskTimerExpandedIdx = idx; switchTab('today'); renderAll(); };
}
// Cheap per-second update for the banner's clock text, called from the same
// global tick that drives the Today-tab timer box — avoids rebuilding the
// whole banner (and losing its click handler needlessly) every second.
function updateHomeTimerBannerLiveDisplay(idx){
  const clockEl = document.getElementById('homeTimerClock');
  const t = taskTimers[idx];
  if(!clockEl || !t) return;
  clockEl.textContent = ttHomeBannerTime(t);
}

// ===== Dynamic sectional slots (Part 2: "Add More") =====
// d.sect's own keys (s1, s2, s3, ...) ARE the live list of sections for that
// day — no separate count/array to keep in sync. addSectSlot() appends the
// next free "sN" key (so old data's s1-s4 keeps working untouched); a day
// can now have as many sectional slots as were actually attempted, instead
// of being stuck at a fixed 4. removeSectSlot() deletes one, keeping at
// least 1 slot always present.
function nextSectKey(d){
  let maxN = 0;
  Object.keys(d.sect).forEach(k=>{
    const m = /^s(\d+)$/.exec(k);
    if(m) maxN = Math.max(maxN, parseInt(m[1],10));
  });
  return 's'+(maxN+1);
}
function addSectSlot(d){
  const key = nextSectKey(d);
  d.sect[key] = '';
  d.sectDetail[key] = {right:'',wrong:'',skip:'',chapters:[]};
  return key;
}
function removeSectSlot(d, key){
  if(Object.keys(d.sect).length<=1) return false; // always keep at least 1 slot
  delete d.sect[key];
  delete d.sectDetail[key];
  return true;
}
// Builds one compact card for a single Sectional Math slot on the Today
// tab: the existing Score field, plus Right/Wrong/Skip counters and a
// chapter picker so a wrong question's chapter can be tagged right here
// (bumps the same global weak-chapter counter used on the Weak tab).
// `removable` shows a small ✕ to drop this slot (hidden when read-only or
// when it's the last remaining slot for the day).
function sectCardHtml(d, key, label, dis, removable){
  const sd = d.sectDetail[key];
  const chapCounts = {};
  (sd.chapters||[]).forEach(c=>{ chapCounts[c] = (chapCounts[c]||0)+1; });
  const chapTags = Object.keys(chapCounts).length
    ? `<div class="sectChapTags">${Object.entries(chapCounts).map(([name,cnt])=>`<span class="sectChapTag">${escapeHtml(name)}${cnt>1?' ×'+cnt:''}</span>`).join('')}${dis?'':`<button type="button" class="sectChapClear" data-sectchclear="${key}">✕ Clear</button>`}</div>`
    : '';
  return `
    <div class="sectCard">
      ${(removable && !dis) ? `<button type="button" class="sectCardRemoveBtn" data-sect-remove="${key}" title="Ye section hatao">✕</button>` : ''}
      <div class="sectCardHead">
        <span class="sectCardLbl">${label}</span>
        <input type="number" step="any" inputmode="decimal" class="sectScoreInp" data-sect="${key}" value="${d.sect[key]}" placeholder="Score" ${dis}>
      </div>
      <div class="sectRWS">
        <input type="number" step="1" min="0" inputmode="numeric" data-sectdetail="${key}" data-sdfield="right" value="${sd.right}" placeholder="Right" ${dis}>
        <input type="number" step="1" min="0" inputmode="numeric" data-sectdetail="${key}" data-sdfield="wrong" value="${sd.wrong}" placeholder="Wrong" ${dis}>
        <input type="number" step="1" min="0" inputmode="numeric" data-sectdetail="${key}" data-sdfield="skip" value="${sd.skip}" placeholder="Skip" ${dis}>
      </div>
      <div class="sectChapRow">
        <select class="sectChapSel" data-sectchsel="${key}" ${dis}>${MATH_CHAPTERS.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
        <button type="button" class="sectChapBtn" data-sectchbtn="${key}" ${dis}>➕ Wrong Ch.</button>
      </div>
      ${chapTags}
    </div>`;
}

// ===== Auto score/wrong-log box (Today tab) =====
// Builds the little inline card that attaches itself to a "mock"-type task
// automatically — Full Mock Score fields for the attempt task, Wrong
// Questions + Chapter Quick-Log for the analysis task. Same underlying
// d.mock fields as before (no data migration needed), just surfaced right
// on the task that actually needs them instead of a fixed block for everyone.
// Shared "Wrong Questions — Subject-wise (Mock)" + "Chapter Mistake Quick-Log"
// block. Lives in one place so the SAME markup can be shown inside the
// "Full Mock (Attempt Only)" task's own box (mockScore) as well as (for
// anyone who still has a separate "Mock Analysis" task) the mockAnalysis box.
function wrongQuestionsBlockHtml(d, dis){
  const wrongTotal = num(d.mock.wrongMath)+num(d.mock.wrongReasoning)+num(d.mock.wrongEnglish)+num(d.mock.wrongGk);
  return `
    <div class="subhead">❌ Wrong Questions — Subject-wise (Mock)</div>
    <div class="scoreform">
      <div class="scorefield"><label>Math</label><input type="number" step="1" min="0" inputmode="numeric" data-mock="wrongMath" value="${d.mock.wrongMath}" ${dis}></div>
      <div class="scorefield"><label>Reasoning</label><input type="number" step="1" min="0" inputmode="numeric" data-mock="wrongReasoning" value="${d.mock.wrongReasoning}" ${dis}></div>
      <div class="scorefield"><label>English</label><input type="number" step="1" min="0" inputmode="numeric" data-mock="wrongEnglish" value="${d.mock.wrongEnglish}" ${dis}></div>
      <div class="scorefield"><label>GK</label><input type="number" step="1" min="0" inputmode="numeric" data-mock="wrongGk" value="${d.mock.wrongGk}" ${dis}></div>
    </div>
    <div class="scoretotal">Total Wrong: <b data-total-wrong>${wrongTotal}</b></div>
    <div class="subhead">🎯 Chapter Mistake Quick-Log</div>
    <div class="chapterQuickHint">Jo question galat hua uska chapter/topic chuno aur "+1 Wrong" daba do — poori weak-chapter list "Weak" tab mein dikhegi.</div>
    <div class="chapterQuickRow">
      <select data-qc-sel="math" ${dis}>${MATH_CHAPTERS.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
      <button type="button" class="chapterQuickBtn" data-qc-btn="math" ${dis}>➕ Math Wrong</button>
      <span class="chapterQuickCount" data-qc-count="math">${chapterCount('math', MATH_CHAPTERS[0])} wrong so far</span>
    </div>
    <div class="chapterQuickRow">
      <select data-qc-sel="english" ${dis}>${ENGLISH_TOPICS.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
      <button type="button" class="chapterQuickBtn" data-qc-btn="english" ${dis}>➕ English Wrong</button>
      <span class="chapterQuickCount" data-qc-count="english">${chapterCount('english', ENGLISH_TOPICS[0])} wrong so far</span>
    </div>
  `;
}
function taskScoreBoxHtml(d, type, dis){
  if(type === 'mockScore'){
    const mockTotal = num(d.mock.math)+num(d.mock.reasoning)+num(d.mock.english)+num(d.mock.gk);
    return `
      <div class="subhead" style="margin-top:0;padding-top:0;border-top:none;">🧪 Full Mock Score</div>
      <div class="scoreform">
        <div class="scorefield"><label>Math</label><input type="number" step="any" inputmode="decimal" data-mock="math" value="${d.mock.math}" ${dis}></div>
        <div class="scorefield"><label>Reasoning</label><input type="number" step="any" inputmode="decimal" data-mock="reasoning" value="${d.mock.reasoning}" ${dis}></div>
        <div class="scorefield"><label>English</label><input type="number" step="any" inputmode="decimal" data-mock="english" value="${d.mock.english}" ${dis}></div>
        <div class="scorefield"><label>GK</label><input type="number" step="any" inputmode="decimal" data-mock="gk" value="${d.mock.gk}" ${dis}></div>
        <div class="scorefield"><label>Percentile</label><input type="number" step="any" inputmode="decimal" min="0" max="100" data-mock="percentile" value="${d.mock.percentile}" ${dis}></div>
      </div>
      <div class="scoretotal">Total: <b data-total-mock>${mockTotal}</b></div>
      ${wrongQuestionsBlockHtml(d, dis)}
    `;
  }
  if(type === 'mockAnalysis'){
    return wrongQuestionsBlockHtml(d, dis);
  }
  if(type === 'sectional'){
    const keys = Object.keys(d.sect);
    const total = keys.reduce((s,k)=>s+num(d.sect[k]),0);
    return `
      <div class="subhead" style="margin-top:0;padding-top:0;border-top:none;">🧮 Sectional Scores</div>
      <div class="sectCardGrid" data-sect-grid>
        ${keys.map((k,i)=>sectCardHtml(d,k,'Sec '+(i+1),dis,keys.length>1)).join('')}
      </div>
      <div class="scoretotal">Total Score: <b data-total-sect>${total}</b></div>
      ${dis?'':'<div class="btnrow"><button type="button" class="nav-btn" data-sect-add-btn>➕ Add More Section</button></div>'}
    `;
  }
  return '';
}
// Wires up inputs/buttons inside ANY container holding a taskScoreBoxHtml()
// card — works whether that container is the task row's own inline box or
// the "complete task" note sheet's extra slot. Keeps every visible copy of
// a shared field (row box + note sheet, if both happen to be open) in sync,
// and always writes straight into the SAME d.mock object as before.
function bindScoreBoxEvents(root){
  const isReadOnly = viewingName !== myName && !(canAdminEditViewed() && adminEditModeOn);
  if(isReadOnly) return;
  root.querySelectorAll('input[data-mock]').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const field = e.target.getAttribute('data-mock');
      const d = getDay(selectedDay);
      d.mock[field] = e.target.value;
      document.querySelectorAll('[data-total-mock]').forEach(el=>{ el.textContent = num(d.mock.math)+num(d.mock.reasoning)+num(d.mock.english)+num(d.mock.gk); });
      document.querySelectorAll('[data-total-wrong]').forEach(el=>{ el.textContent = num(d.mock.wrongMath)+num(d.mock.wrongReasoning)+num(d.mock.wrongEnglish)+num(d.mock.wrongGk); });
      document.querySelectorAll(`input[data-mock="${field}"]`).forEach(other=>{ if(other!==e.target) other.value = e.target.value; });
      clearTimeout(scoreTimer);
      scoreTimer = setTimeout(()=>{ renderPerformance(); save(); }, 400);
    });
  });
  root.querySelectorAll('[data-qc-btn]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const type = btn.getAttribute('data-qc-btn');
      const sel = root.querySelector(`select[data-qc-sel="${type}"]`);
      if(!sel) return;
      await bumpChapter(type, sel.value, 1);
      document.querySelectorAll(`[data-qc-count="${type}"]`).forEach(el=>{ el.textContent = chapterCount(type, sel.value) + ' wrong so far'; });
    });
  });
  root.querySelectorAll('[data-qc-sel]').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const type = sel.getAttribute('data-qc-sel');
      document.querySelectorAll(`[data-qc-count="${type}"]`).forEach(el=>{ el.textContent = chapterCount(type, sel.value) + ' wrong so far'; });
    });
  });
  // ----- Sectional (dynamic) fields — same shared-copy pattern as data-mock
  // above, so a "sectional"-named task's box stays in sync whether it's
  // showing inside the task row, the note-sheet, or (rare) both at once.
  root.querySelectorAll('input[data-sect]').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const key = e.target.getAttribute('data-sect');
      const d = getDay(selectedDay);
      d.sect[key] = e.target.value;
      const total = Object.keys(d.sect).reduce((s,k)=>s+num(d.sect[k]),0);
      document.querySelectorAll('[data-total-sect]').forEach(el=>{ el.textContent = total; });
      document.querySelectorAll(`input[data-sect="${key}"]`).forEach(other=>{ if(other!==e.target) other.value = e.target.value; });
      clearTimeout(scoreTimer);
      scoreTimer = setTimeout(()=>{ renderPerformance(); save(); }, 400);
    });
  });
  root.querySelectorAll('input[data-sectdetail]').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const key = e.target.getAttribute('data-sectdetail');
      const field = e.target.getAttribute('data-sdfield');
      const d = getDay(selectedDay);
      d.sectDetail[key][field] = e.target.value;
      document.querySelectorAll(`input[data-sectdetail="${key}"][data-sdfield="${field}"]`).forEach(other=>{ if(other!==e.target) other.value = e.target.value; });
      clearTimeout(scoreTimer);
      scoreTimer = setTimeout(()=>{ renderPerformance(); save(); }, 400);
    });
  });
  // Structural sectional changes (add/remove a whole section, tag/clear a
  // wrong chapter) change how many cards or chips exist, so the box needs a
  // full rebuild rather than a simple value-sync — rebuild whichever box
  // (task-row inline box via renderPanel, or the note-sheet's own extra
  // slot) this root actually belongs to, then rebind it the same way.
  async function refreshSectRoot(){
    await save();
    const d = getDay(selectedDay);
    if(root.id === 'taskNoteSheetExtra'){
      root.innerHTML = taskScoreBoxHtml(d, 'sectional', '');
      bindScoreBoxEvents(root);
    } else {
      renderPanel();
    }
  }
  root.querySelectorAll('[data-sectchbtn]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const key = btn.getAttribute('data-sectchbtn');
      const sel = root.querySelector(`select[data-sectchsel="${key}"]`);
      if(!sel) return;
      const d = getDay(selectedDay);
      d.sectDetail[key].chapters.push(sel.value);
      await bumpChapter('math', sel.value, 1);
      await refreshSectRoot();
    });
  });
  root.querySelectorAll('[data-sectchclear]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const key = btn.getAttribute('data-sectchclear');
      const d = getDay(selectedDay);
      d.sectDetail[key].chapters = [];
      await refreshSectRoot();
    });
  });
  root.querySelectorAll('[data-sect-add-btn]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const d = getDay(selectedDay);
      addSectSlot(d);
      await refreshSectRoot();
    });
  });
  root.querySelectorAll('[data-sect-remove]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const d = getDay(selectedDay);
      const key = btn.getAttribute('data-sect-remove');
      if(!removeSectSlot(d, key)) return;
      await refreshSectRoot();
    });
  });
}
function renderPanel(){
  const panel = document.getElementById('panel');
  const d = getDay(selectedDay);
  const done = d.tasks.filter(Boolean).length;
  const pct = Math.round((done/TASKS.length)*100);
  const isReadOnly = viewingName !== myName && !(canAdminEditViewed() && adminEditModeOn);
  const dis = isReadOnly ? 'disabled' : '';

  let html = '';
  if(canAdminEditViewed()){
    html += `
      <div class="readonly-banner admin-edit-banner ${adminEditModeOn?'on':''}">
        <span>${adminEditModeOn ? `<span class="icoEdit" aria-hidden="true"></span> Edit Mode ON — <b>${escapeHtml(viewingName)}</b> ka data edit ho raha hai` : `👑 ${escapeHtml(viewingName)}'s tracker — Admin edit kar sakta hai`}</span>
        <button class="nav-btn" id="adminEditModeToggleBtn" type="button">${adminEditModeOn ? '🔒 Edit Band Karo' : '<span class="icoEdit" aria-hidden="true"></span> Edit Mode ON Karo'}</button>
      </div>`;
  } else if(isReadOnly){
    html += `
      <div class="readonly-banner">
        <span>👀 ${escapeHtml(viewingName)}'s tracker — sirf dekh sakte ho, edit nahi</span>
      </div>`;
  }
  html += `
    <div class="panel-head">
      <h2>📌 Day ${selectedDay} / ${TOTAL_DAYS}</h2>
      <div class="date">${fmtDate(selectedDay)}</div>
    </div>
    <div class="restbtn ${d.rest?'active':''}" id="restToggle">
      <input type="checkbox" id="restCheck" ${d.rest?'checked':''} ${dis}>
      <span>😴 Mark as Rest Day (tasks/loss ignored today)</span>
    </div>
    <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
  `;
  // The per-task ⏱️ timer only makes sense on TODAY's own (non-read-only)
  // list — past/future days and other people's trackers don't get it.
  const canUseTaskTimer = !isReadOnly && viewingName===myName && selectedDay===todayDayNum();
  if(canUseTaskTimer) ensureTaskTimerDayFresh();
  // Aaj jitni quizzes ho chuki hain, unke hisab se ₹5,000 dobara baant do —
  // niche saare taskValue(idx) ki jagah values[idx] use hoga.
  const values = dayTaskValues(d);
  TASKS.forEach((t, idx)=>{
    const checked = d.tasks[idx] ? 'checked' : '';
    const cls = d.tasks[idx] ? 'task checked' : 'task';
    const tier = taskTier(idx);
    const showTimerBtn = canUseTaskTimer && !d.tasks[idx];
    const tt = taskTimers[idx];
    const note = (d.taskNotes && d.taskNotes[idx]) ? d.taskNotes[idx].trim() : '';
    // Auto-detected score/wrong-log box — attaches itself to whichever task's
    // NAME says "mock" (Full Mock Score) or "mock...analysis" (Wrong Qs +
    // Chapter Quick-Log). Available on any day being viewed (not just today),
    // same as the rest of the score fields — inputs just go read-only via `dis`.
    const autoType = taskAutoType(t);
    const showScoreBtn = (autoType==='mockScore' || autoType==='mockAnalysis' || autoType==='sectional');
    // "Calculation" task gets its own 🧮 button instead — tapping it jumps
    // straight into the Calc tab's quiz menu. Hidden once the task is
    // already done today (no need to relaunch), and only on today's own
    // editable list (same gating as the ⏱️ timer button).
    const showCalcQuizBtn = canUseTaskTimer && autoType==='calcQuiz' && !d.tasks[idx];
    // 📷 badge — only appears if a proof photo was attached to THIS task on
    // THIS day, on THIS device (see taskPhotoKeySet — images live in local
    // IndexedDB only, never in synced `state`).
    const hasPhoto = taskPhotoKeySet.has(taskPhotoKey(selectedDay, idx));
    html += `
      <div class="${cls} ${tier.cls}">
        <input type="checkbox" data-idx="${idx}" ${checked} ${dis}>
        <div class="taskinfo"><div class="name">${checked? '✅' : tier.emoji} ${t}</div></div>
        <div class="value ${tier.cls}">₹${Math.round(values[idx])}</div>
        ${(isReadOnly || viewingName!==myName) ? '' : `<button class="taskEditIconBtn" type="button" data-edit-task-idx="${idx}" title="Ye task edit karo"><span class="icoEdit" aria-hidden="true"></span></button>`}
        ${showTimerBtn ? `<button class="taskTimerBtn${tt&&tt.running?' active':''}" type="button" data-timer-btn-idx="${idx}" title="Pomodoro/Stopwatch"><span class="icoClock" aria-hidden="true"></span></button>` : ''}
        ${showScoreBtn ? `<button class="taskTimerBtn${taskScoreExpandedIdx===idx?' active':''}" type="button" data-score-btn-idx="${idx}" title="${autoType==='mockAnalysis'?'Wrong Qs + Chapter Log':autoType==='sectional'?'Sectional Score':'Mock Score'}">${autoType==='mockAnalysis'?'❌':autoType==='sectional'?'🧮':'🧪'}</button>` : ''}
        ${showCalcQuizBtn ? `<button class="taskTimerBtn" type="button" data-calc-quiz-btn-idx="${idx}" title="Calculation quiz shuru karo">🧮</button>` : ''}
        ${hasPhoto ? `<button class="taskTimerBtn taskPhotoBadgeBtn" type="button" data-photo-view-idx="${idx}" title="Proof photo dekho">📷</button>` : ''}
        ${(showTimerBtn && taskTimerExpandedIdx===idx) ? `<div class="taskTimerBox" id="taskTimerBox-${idx}">${taskTimerBoxHtml(idx)}</div>` : ''}
        ${(showScoreBtn && taskScoreExpandedIdx===idx) ? `<div class="taskTimerBox" id="taskScoreBox-${idx}">${taskScoreBoxHtml(d, autoType, dis)}</div>` : ''}
      </div>
      ${note ? `<div class="taskNoteView">📝 ${escapeHtml(note)}</div>` : ''}
    `;
  });

  // Learn tab se di gayi har quiz yahan apne aap ek alag ✅ task ban jaati
  // hai — already complete (quiz to ho chuki), aur uska ₹ upar wale values[]
  // se hi aata hai (TASKS ke baad wale slots). ✕ dabakar hataoge to wo din
  // ka ₹5,000-split bhi turant dobara recalculate ho jaayega.
  (d.quizLog || []).forEach((q, qi)=>{
    const qv = values[TASKS.length+qi] || 0;
    html += `
      <div class="task checked quiz-task">
        <input type="checkbox" checked disabled>
        <div class="taskinfo"><div class="name">✅ 🧠 ${escapeHtml(q.label)} — ${q.correct}/${q.total}</div></div>
        <div class="value">₹${Math.round(qv)}</div>
        ${(!isReadOnly && viewingName===myName) ? `<button type="button" class="quizLogDelBtn" data-quizlog-idx="${qi}" aria-label="Hatao" title="Ye quiz task hatao">✕</button>` : ''}
      </div>
    `;
  });
  if(!isReadOnly && viewingName===myName && (!d.quizLog || !d.quizLog.length)){
    html += `<div class="quizLogEmpty">Quiz tab se koi bhi quiz doge, to wo yahan target list mein ek task ki tarah, ₹ ke saath, automatic aa jaayegi.</div>`;
  }

  html += `
    <div class="subhead">📝 NOTES / ERROR LOG</div>
    <div class="notes voiceField"><textarea id="notesArea" placeholder="Aaj kya galat hua, kya seekha..." ${isReadOnly?'readonly':''}>${d.notes}</textarea>${isReadOnly?'':'<button type="button" class="micBtn" data-mic-target="notesArea" aria-label="Bol kar likho" title="Bol kar likho"><svg viewBox="0 0 24 24" class="micIcon"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></button>'}</div>
  `;

  html += `
    <div class="subhead">🤦 SILLY MISTAKES — aaj ki chhoti galtiyan</div>
    <div class="notes voiceField"><textarea id="mistakesArea" placeholder="Jaise: sign galat likha, question dobara nahi padha, time waste hua..." ${isReadOnly?'readonly':''}>${d.mistakes}</textarea>${isReadOnly?'':'<button type="button" class="micBtn" data-mic-target="mistakesArea" aria-label="Bol kar likho" title="Bol kar likho"><svg viewBox="0 0 24 24" class="micIcon"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></button>'}</div>
  `;

  html += `
    <div class="subhead">🧭 SMART TIME GUIDE</div>
    <div class="timeSettingsBox" id="timeSettingsBox"></div>
    <div class="guideBox" id="timeGuideBox"></div>
  `;

  // Full Mock Score, Wrong Questions (Mock), Chapter Mistake Quick-Log, and
  // Sectional Scores used to be fixed blocks here regardless of which task
  // you were on — they now auto-attach to whichever task's NAME says "mock"
  // / "mock...analysis" / "sectional" (🧪 / ❌ / 🧮 button on that task row,
  // see TASKS.forEach above).

  html += `
    <div class="footer-row">
      <button class="nav-btn" id="prevBtn">⬅️ Prev Day</button>
      <button class="nav-btn" id="nextBtn">Next Day ➡️</button>
    </div>
  `;
  panel.innerHTML = html;
  renderTimeSettings();
  renderTimeGuide();

  panel.querySelectorAll('.quizLogDelBtn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const qi = parseInt(btn.getAttribute('data-quizlog-idx'));
      const dayObj = getDay(selectedDay);
      dayObj.quizLog.splice(qi, 1);
      await save();
      renderAll();
    });
  });

  const editModeBtn = document.getElementById('adminEditModeToggleBtn');
  if(editModeBtn) editModeBtn.addEventListener('click', ()=>{
    adminEditModeOn = !adminEditModeOn;
    renderAll();
    applyReadOnlyUI();
  });

  document.getElementById('restCheck').addEventListener('change', async (e)=>{
    if(isReadOnly) return;
    getDay(selectedDay).rest = e.target.checked;
    renderAll();
    await save();
  });
  panel.querySelectorAll('input[type=checkbox][data-idx]').forEach(cb=>{
    cb.addEventListener('change', async (e)=>{
      if(isReadOnly) return;
      const idx = parseInt(e.target.getAttribute('data-idx'));
      const dayObj = getDay(selectedDay);

      // Once a task is ticked, it's locked in — no un-ticking, ever (own
      // days, backfilled days, or admin-edit-mode on someone else's day).
      // A tick can only move undone -> done, never the other way.
      if(!e.target.checked && dayObj.tasks[idx]){
        e.target.checked = true;
        showAntiCheatToast('🔒 Ek baar tick kiya hua task wapas hata nahi sakte.');
        return;
      }

      // Anti-instant-complete guard only applies to your OWN today's list —
      // admin fixing someone else's data, and backfilling old days, stay
      // frictionless.
      const enforceAntiCheat = e.target.checked && viewingName===myName && selectedDay===todayDayNum();

      if(enforceAntiCheat){
        e.target.checked = false; // hold off; only actually ticks via the note sheet below
        const now = Date.now();
        let lastTick = 0;
        dayObj.tasks.forEach((done,i)=>{
          const ts = dayObj.taskCheckedAt && dayObj.taskCheckedAt[i];
          if(done && ts && ts > lastTick) lastTick = ts;
        });
        if(lastTick > 0 && (now - lastTick) < MIN_TASK_CHECK_GAP_SEC*1000){
          const waitSec = Math.ceil((MIN_TASK_CHECK_GAP_SEC*1000 - (now-lastTick))/1000);
          showAntiCheatToast(`⏳ Itni jaldi nahi — agla task ${waitSec}s baad tick karo.`);
          return;
        }
        openTaskNoteSheet(idx);
        return;
      }

      const doneBefore = dayObj.tasks.filter(Boolean).length;
      dayObj.tasks[idx] = e.target.checked;
      const doneAfter = dayObj.tasks.filter(Boolean).length;
      if(e.target.checked && taskTimers[idx]) clearTaskTimer(idx);
      renderAll();
      await save();
      if(doneBefore < TASKS.length && doneAfter === TASKS.length){
        showReward(selectedDay);
      }
    });
  });
  if(!isReadOnly){
    panel.querySelectorAll('[data-edit-task-idx]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-edit-task-idx'),10);
        openTaskEditor(idx);
      });
    });
  }
  if(canUseTaskTimer){
    panel.querySelectorAll('[data-timer-btn-idx]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        toggleTaskTimerBox(parseInt(btn.getAttribute('data-timer-btn-idx'),10));
      });
    });
    panel.querySelectorAll('[data-tt-mode]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        setTaskTimerMode(parseInt(btn.getAttribute('data-tt-idx'),10), btn.getAttribute('data-tt-mode'));
      });
    });
    panel.querySelectorAll('[data-tt-play]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        playPauseTaskTimer(parseInt(btn.getAttribute('data-tt-play'),10));
      });
    });
    panel.querySelectorAll('[data-tt-reset]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        resetTaskTimer(parseInt(btn.getAttribute('data-tt-reset'),10));
      });
    });
  }
  panel.querySelectorAll('[data-score-btn-idx]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      toggleTaskScoreBox(parseInt(btn.getAttribute('data-score-btn-idx'),10));
    });
  });
  panel.querySelectorAll('[data-calc-quiz-btn-idx]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      switchTab('calc');
      showCalcPage('menu');
    });
  });
  panel.querySelectorAll('[data-photo-view-idx]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      openTaskPhotoLightbox(selectedDay, parseInt(btn.getAttribute('data-photo-view-idx'),10));
    });
  });
  // Full Mock / Wrong-Qs / Sectional fields now live inside each matching
  // task's own inline box (built above via taskScoreBoxHtml) — wire them
  // the same way regardless of which task row they ended up on.
  bindScoreBoxEvents(panel);
  document.getElementById('notesArea').addEventListener('input', (e)=>{
    if(isReadOnly) return;
    getDay(selectedDay).notes = e.target.value;
    clearTimeout(notesTimer);
    notesTimer = setTimeout(save, 600);
  });
  document.getElementById('mistakesArea').addEventListener('input', (e)=>{
    if(isReadOnly) return;
    getDay(selectedDay).mistakes = e.target.value;
    clearTimeout(mistakesTimer);
    mistakesTimer = setTimeout(async ()=>{ await save(); renderMistakesLog(); }, 600);
  });
  document.getElementById('prevBtn').addEventListener('click', ()=>{ if(selectedDay>1){ selectedDay--; renderAll(); } });
  document.getElementById('nextBtn').addEventListener('click', ()=>{ if(selectedDay<TOTAL_DAYS){ selectedDay++; renderAll(); } });
}

function avgOf(getter){
  let sum=0,count=0,best=0;
  for(let i=1;i<=TOTAL_DAYS;i++){
    const v = getter(getDay(i));
    if(hasVal(v)){ const f=parseFloat(v); sum+=f; count++; if(f>best) best=f; }
  }
  return { avg: count? (sum/count) : null, count, best };
}
function avgTotalOf(getters){
  let sum=0,count=0,best=0;
  for(let i=1;i<=TOTAL_DAYS;i++){
    const day = getDay(i);
    const vals = getters.map(g=>g(day));
    if(vals.some(hasVal)){
      const t = vals.reduce((a,v)=>a+num(v),0);
      sum+=t; count++; if(t>best) best=t;
    }
  }
  return { avg: count? (sum/count) : null, count, best };
}
function fmtAvg(res){ return res.avg===null ? '—' : res.avg.toFixed(1); }
function sumOf(getter){
  let sum=0;
  for(let i=1;i<=TOTAL_DAYS;i++){
    const v = getter(getDay(i));
    if(hasVal(v)) sum += num(v);
  }
  return sum;
}

function renderPerformance(){
  const mMath = avgOf(d=>d.mock.math);
  const mReas = avgOf(d=>d.mock.reasoning);
  const mEng = avgOf(d=>d.mock.english);
  const mGk = avgOf(d=>d.mock.gk);
  const mTot = avgTotalOf([d=>d.mock.math,d=>d.mock.reasoning,d=>d.mock.english,d=>d.mock.gk]);
  const mPercentile = avgOf(d=>d.mock.percentile);
  const wMath = sumOf(d=>d.mock.wrongMath);
  const wReas = sumOf(d=>d.mock.wrongReasoning);
  const wEng = sumOf(d=>d.mock.wrongEnglish);
  const wGk = sumOf(d=>d.mock.wrongGk);
  const wTotAll = wMath+wReas+wEng+wGk;
  document.getElementById('perfMock').innerHTML = `
    <div class="perfrow"><span>Math avg</span><span>${fmtAvg(mMath)}</span></div>
    <div class="perfrow"><span>Reasoning avg</span><span>${fmtAvg(mReas)}</span></div>
    <div class="perfrow"><span>English avg</span><span>${fmtAvg(mEng)}</span></div>
    <div class="perfrow"><span>GK avg</span><span>${fmtAvg(mGk)}</span></div>
    <div class="perfrow total"><span>Total avg (${mTot.count} mocks)</span><span>${fmtAvg(mTot)}</span></div>
    <div class="perfrow"><span>Best total</span><span>${mTot.best||'—'}</span></div>
    <div class="perfrow"><span>Percentile avg</span><span>${fmtAvg(mPercentile)}</span></div>
    <div class="perfrow"><span>Wrong — Math / Reas / Eng / GK</span><span>${wMath} / ${wReas} / ${wEng} / ${wGk}</span></div>
    <div class="perfrow total"><span>Total wrong (all mocks)</span><span>${wTotAll}</span></div>
  `;
  // "Section N avg" rows now grow with however many sections have ever been
  // added on any day (Part 2: "Add More"), instead of being stuck at a
  // fixed Sec 1-4 — find the highest sN ever used, then build one avg row
  // per section number up to that.
  let maxSecN = 4;
  for(let i=1;i<=TOTAL_DAYS;i++){
    Object.keys(getDay(i).sect).forEach(k=>{
      const m = /^s(\d+)$/.exec(k);
      if(m) maxSecN = Math.max(maxSecN, parseInt(m[1],10));
    });
  }
  const sectGetters = [];
  let sectRowsHtml = '';
  for(let n=1;n<=maxSecN;n++){
    const key = 's'+n;
    sectGetters.push(d=>d.sect[key]);
    sectRowsHtml += `<div class="perfrow"><span>Section ${n} avg</span><span>${fmtAvg(avgOf(d=>d.sect[key]))}</span></div>`;
  }
  const sTot = avgTotalOf(sectGetters);
  document.getElementById('perfSect').innerHTML = `
    ${sectRowsHtml}
    <div class="perfrow total"><span>Total avg (${sTot.count} sets)</span><span>${fmtAvg(sTot)}</span></div>
    <div class="perfrow"><span>Best total</span><span>${sTot.best||'—'}</span></div>
  `;
}

// ===== Mock Tests tab =====
// A separate, dedicated mock-log system with its own 5-category home screen
// (Pre Mocks / Math Sectional / English Sectional / Reasoning Sectional /
// Overall Analysis). Manually-added entries live in state.mockLog (a NEW
// top-level key, so it is never touched by the per-target archive/reset
// logic — every mock ever logged stays visible forever, across targets).
// The "Pre Mocks" category additionally auto-pulls in every Full Mock score
// already entered on the Today tab (current target + every archived one),
// so nothing has to be typed twice.
function ensureMockLogState(){
  if(!state.mockLog || typeof state.mockLog !== 'object' || Array.isArray(state.mockLog)) state.mockLog = {};
  ['pre','mathSec','engSec','reasoningSec'].forEach(k=>{
    if(!Array.isArray(state.mockLog[k])) state.mockLog[k] = [];
  });
  return state.mockLog;
}
// Quiz tab's Math Mock (Exam Mode — mock01..mock44, 15-min timer, negative
// marking) is a real sectional-style test, so when it's submitted this
// auto-pushes an entry straight into Score tab's "Math Sectional" category
// (state.mockLog.mathSec) — same bucket manual entries live in — so its avg
// updates automatically, with no re-typing of the score needed.
function logMathMockToSectional(name, marks, correct, wrong, skip){
  ensureMockLogState();
  state.mockLog.mathSec.push({
    id: 'quizsec_' + Date.now() + '_' + Math.floor(Math.random()*10000),
    name: name,
    date: fmtISODate(new Date()),
    score: marks,
    right: correct,
    wrong: wrong,
    skip: skip,
    chapter: '',
    remarks: '',
    auto: true,
    autoSrc: 'Math Mock Quiz'
  });
  save();
  if(mockActiveCat === 'mathSec') renderMockDetail();
  if(typeof renderMockTab === 'function') renderMockTab();
}
// Reasoning Mock (Quiz tab, exam mode — mock01..mock48, 15-min timer,
// negative marking) mirrors Math Mock: on submit this auto-pushes an
// entry into Score tab's "Reasoning Sectional" category (state.mockLog.
// reasoningSec) so its avg updates automatically, no re-typing needed.
function logReasoningMockToSectional(name, marks, correct, wrong, skip){
  ensureMockLogState();
  state.mockLog.reasoningSec.push({
    id: 'quizsec_' + Date.now() + '_' + Math.floor(Math.random()*10000),
    name: name,
    date: fmtISODate(new Date()),
    score: marks,
    right: correct,
    wrong: wrong,
    skip: skip,
    chapter: '',
    remarks: '',
    auto: true,
    autoSrc: 'Reasoning Mock Quiz'
  });
  save();
  if(mockActiveCat === 'reasoningSec') renderMockDetail();
  if(typeof renderMockTab === 'function') renderMockTab();
}
const MOCK_CATS = [
  {id:'preMock', label:'Pre Mock', icon:'📘'},
  {id:'mainsMock', label:'Mains Mock', icon:'🎯'},
  {id:'mathSec', label:'Math Sectional', icon:'🔢'},
  {id:'engSec', label:'English Sectional', icon:'🔤'},
  {id:'reasoningSec', label:'Reasoning Sectional', icon:'🧠'},
  {id:'notesLog', label:'Silly Mistakes & Notes', icon:'📝'},
  {id:'analysis', label:'Overall Analysis', icon:'📊'},
];
let mockActiveCat = null; // null = category grid, else one of MOCK_CATS ids
let mockEditId = null;    // id of the entry currently being edited, else null

// 'preMock' and 'mainsMock' are two separate buttons/views but share the
// SAME underlying storage bucket (state.mockLog.pre) — same as before this
// split, just filtered by entry.examType. Keeps old saved data intact.
function mockStorageKey(catId){ return (catId==='preMock'||catId==='mainsMock') ? 'pre' : catId; }

function mockTotalOfPre(e){ return num(e.math)+num(e.reasoning)+num(e.english)+num(e.gk); }

// Builds read-only "auto" Pre Mock entries out of every day (current target
// + all archived ones) that has any Full Mock data on the Today tab.
function getAutoPreMockEntries(){
  const out = [];
  function pushFromDay(dayNum, dayObj, cycleStartDate, cycleTag){
    if(!dayObj || !dayObj.mock) return;
    const m = dayObj.mock;
    if(!(hasVal(m.math)||hasVal(m.reasoning)||hasVal(m.english)||hasVal(m.gk)||hasVal(m.percentile)||hasVal(m.wrongMath)||hasVal(m.wrongReasoning)||hasVal(m.wrongEnglish)||hasVal(m.wrongGk))) return;
    const hasWrong = hasVal(m.wrongMath)||hasVal(m.wrongReasoning)||hasVal(m.wrongEnglish)||hasVal(m.wrongGk);
    const wrongTotal = num(m.wrongMath)+num(m.wrongReasoning)+num(m.wrongEnglish)+num(m.wrongGk);
    let dateStr = '';
    try{
      const dt = new Date(cycleStartDate);
      dt.setDate(dt.getDate() + (dayNum-1));
      dateStr = fmtISODate(dt);
    }catch(e){ /* ignore bad date */ }
    out.push({
      id: 'auto_'+cycleTag+'_'+dayNum,
      name: `Day ${dayNum} Full Mock`,
      date: dateStr,
      examType: 'pre',
      math:m.math, reasoning:m.reasoning, english:m.english, gk:m.gk,
      right: hasWrong ? Math.max(0, MOCK_TOTAL_QUESTIONS - wrongTotal) : '',
      wrong: hasWrong ? wrongTotal : '',
      percentile: m.percentile,
      chapter:'', remarks:'',
      auto:true, autoSrc:'Full Mock'
    });
  }
  for(let i=1;i<=TOTAL_DAYS;i++) pushFromDay(i, state[i], START_DATE, 'cur');
  if(Array.isArray(state.__history)){
    state.__history.forEach((cyc, ci)=>{
      const days = cyc.days || {};
      Object.keys(days).forEach(k=> pushFromDay(parseInt(k,10), days[k], new Date(cyc.startDate), 'h'+ci));
    });
  }
  return out;
}
// Builds read-only "auto" Math Sectional entries out of every day's
// Sectional Math slots on the Today tab (Score + Right/Wrong/Skip + any
// tagged weak chapters) — exactly the same auto-pull pattern as Pre Mocks
// above, so nothing typed on the Today tab has to be re-typed here. A day
// can have any number of sections now (Part 2: "Add More"), so this just
// walks whatever keys that day's d.sect actually has instead of a fixed 4.
function getAutoMathSecEntries(){
  const out = [];
  function pushFromDay(dayNum, dayObj, cycleStartDate, cycleTag){
    if(!dayObj || !dayObj.sect) return;
    Object.keys(dayObj.sect).forEach((k,idx)=>{
      const score = dayObj.sect[k];
      const sd = (dayObj.sectDetail && dayObj.sectDetail[k]) || {};
      const chapters = Array.isArray(sd.chapters) ? sd.chapters : [];
      if(!(hasVal(score)||hasVal(sd.right)||hasVal(sd.wrong)||hasVal(sd.skip)||chapters.length)) return;
      let dateStr = '';
      try{
        const dt = new Date(cycleStartDate);
        dt.setDate(dt.getDate() + (dayNum-1));
        dateStr = fmtISODate(dt);
      }catch(e){ /* ignore bad date */ }
      const chapCounts = {};
      chapters.forEach(c=>{ chapCounts[c] = (chapCounts[c]||0)+1; });
      const chapterStr = Object.entries(chapCounts).map(([n,c])=> c>1?`${n} ×${c}`:n).join(', ');
      out.push({
        id: 'autosec_'+cycleTag+'_'+dayNum+'_'+k,
        name: `Day ${dayNum} Sectional Math #${idx+1}`,
        date: dateStr,
        score: score,
        right: sd.right, wrong: sd.wrong, skip: sd.skip,
        chapter: chapterStr, remarks:'',
        auto:true, autoSrc:'Sectional'
      });
    });
  }
  for(let i=1;i<=TOTAL_DAYS;i++) pushFromDay(i, state[i], START_DATE, 'cur');
  if(Array.isArray(state.__history)){
    state.__history.forEach((cyc, ci)=>{
      const days = cyc.days || {};
      Object.keys(days).forEach(k=> pushFromDay(parseInt(k,10), days[k], new Date(cyc.startDate), 'h'+ci));
    });
  }
  return out;
}
// Merged (manual + auto), newest-first list for a category.
function mockEntriesFor(catId){
  ensureMockLogState();
  const storeKey = mockStorageKey(catId);
  let list = (state.mockLog[storeKey] || []).slice();
  if(catId==='preMock' || catId==='mainsMock'){
    const wantType = catId==='mainsMock' ? 'mains' : 'pre';
    list = list.filter(e=> (e.examType||'pre')===wantType);
    if(wantType==='pre') list = list.concat(getAutoPreMockEntries());
  } else if(catId==='mathSec'){
    list = list.concat(getAutoMathSecEntries());
  }
  list.sort((a,b)=>{
    const da = a.date||'', db = b.date||'';
    if(da!==db) return da<db ? 1 : -1;
    return (b.id||'').localeCompare(a.id||'');
  });
  return list;
}
function mockCatAvgStat(catId, entries){
  if(!entries.length) return 'Abhi koi mock nahi';
  if(catId==='preMock' || catId==='mainsMock'){
    const valid = entries.filter(e=>hasVal(e.math)||hasVal(e.reasoning)||hasVal(e.english)||hasVal(e.gk)).map(mockTotalOfPre);
    if(!valid.length) return `${entries.length} mocks`;
    return `${entries.length} mocks · avg ${(valid.reduce((a,b)=>a+b,0)/valid.length).toFixed(1)}`;
  }
  const valid = entries.filter(e=>hasVal(e.score)).map(e=>num(e.score));
  if(!valid.length) return `${entries.length} mocks`;
  return `${entries.length} mocks · avg ${(valid.reduce((a,b)=>a+b,0)/valid.length).toFixed(1)}`;
}
function renderMockTab(){
  ensureMockLogState();
  const gridEl = document.getElementById('mockCatGrid');
  if(!gridEl) return;
  gridEl.innerHTML = MOCK_CATS.map(c=>{
    if(c.id==='analysis'){
      return `<button type="button" class="mockCatCard cat-analysis full" data-cat="analysis">
        <span class="mcIcon">📊</span>
        <div class="mcLabel">Overall Analysis</div>
        <div class="mcStat">Kaisa chal raha hai — sabhi mocks ka avg, percentile aur kisme sabse zyada improve karna hai</div>
      </button>`;
    }
    if(c.id==='notesLog'){
      const cnt = getNotesMistakesEntries().length;
      return `<button type="button" class="mockCatCard cat-notesLog full" data-cat="notesLog">
        <span class="mcIcon">📝</span>
        <div class="mcLabel">Silly Mistakes & Notes</div>
        <div class="mcStat">${cnt ? `${cnt} din ki Notes/Error Log + Silly Mistakes — sab ek sath yahan` : 'Abhi koi Note ya Silly Mistake nahi likha'}</div>
      </button>`;
    }
    const entries = mockEntriesFor(c.id);
    return `<button type="button" class="mockCatCard cat-${c.id}" data-cat="${c.id}">
      <span class="mcIcon">${c.icon}</span>
      <div class="mcLabel">${c.label}</div>
      <div class="mcStat">${mockCatAvgStat(c.id, entries)}</div>
    </button>`;
  }).join('');
  gridEl.querySelectorAll('.mockCatCard').forEach(btn=>{
    btn.addEventListener('click', ()=> openMockCategory(btn.getAttribute('data-cat')));
  });
  if(mockActiveCat) renderMockDetail();
}
function openMockCategory(catId){
  mockActiveCat = catId;
  const catSec = document.getElementById('mockCatSection');
  const detailSec = document.getElementById('mockDetailSection');
  if(catSec) catSec.style.display = 'none';
  if(detailSec) detailSec.style.display = 'block';
  renderMockDetail();
  window.scrollTo({top:0, behavior:'instant' in window ? 'instant' : 'auto'});
}
function closeMockCategory(){
  mockActiveCat = null;
  const catSec = document.getElementById('mockCatSection');
  const detailSec = document.getElementById('mockDetailSection');
  if(detailSec) detailSec.style.display = 'none';
  if(catSec) catSec.style.display = 'block';
  renderMockTab();
}
function renderMockEntryCard(catId, e){
  const isPre = catId==='preMock' || catId==='mainsMock';
  const dateDisp = e.date ? new Date(e.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const autoTag = e.auto ? `<span class="mockETag" style="color:var(--blue);border-color:var(--blue);">Today Tab</span>` : '';
  let statsRow;
  if(isPre){
    const total = mockTotalOfPre(e);
    statsRow = `<div class="mockEStats">
      <span>Total: <b>${total||hasVal(e.math)||hasVal(e.reasoning)||hasVal(e.english)||hasVal(e.gk) ? total : '—'}</b></span>
      ${hasVal(e.math)?`<span>Math: <b>${e.math}</b></span>`:''}
      ${hasVal(e.reasoning)?`<span>Reas: <b>${e.reasoning}</b></span>`:''}
      ${hasVal(e.english)?`<span>Eng: <b>${e.english}</b></span>`:''}
      ${hasVal(e.gk)?`<span>GK: <b>${e.gk}</b></span>`:''}
      ${hasVal(e.right)?`<span>Right: <b style="color:var(--gain);">${e.right}</b></span>`:''}
      ${hasVal(e.wrong)?`<span>Wrong: <b style="color:var(--loss);">${e.wrong}</b></span>`:''}
      ${hasVal(e.percentile)?`<span>Percentile: <b>${e.percentile}</b></span>`:''}
    </div>`;
  } else {
    statsRow = `<div class="mockEStats">
      ${hasVal(e.score)?`<span>Score: <b>${e.score}</b></span>`:''}
      ${hasVal(e.right)?`<span>Right: <b style="color:var(--gain);">${e.right}</b></span>`:''}
      ${hasVal(e.wrong)?`<span>Wrong: <b style="color:var(--loss);">${e.wrong}</b></span>`:''}
      ${hasVal(e.skip)?`<span>Skip: <b style="color:var(--muted);">${e.skip}</b></span>`:''}
    </div>`;
  }
  const chapterNote = e.chapter ? `<div class="mockENote"><b>Chapter:</b> ${escapeHtml(e.chapter)}</div>` : '';
  const remarksNote = e.remarks ? `<div class="mockENote"><b>Remarks:</b> ${escapeHtml(e.remarks)}</div>` : '';
  const actions = e.auto
    ? (e.autoSrc === 'Math Mock Quiz'
        ? `<div class="mockENote" style="margin-top:8px;">🔗 Ye Quiz tab ke Math Mock (Exam Mode) se aaya hai — automatic add hua.</div>`
        : `<div class="mockENote" style="margin-top:8px;">🔗 Ye Today tab ke ${e.autoSrc||'Full Mock'} se aaya hai — edit karne ke liye Today tab kholo.</div>`)
    : `<div class="mockEActions">
        <button class="edit" type="button" data-id="${e.id}"><span class="icoEdit" aria-hidden="true"></span> Edit</button>
        <button class="del" type="button" data-id="${e.id}">🗑️ Delete</button>
      </div>`;
  return `<div class="mockEntryCard ${e.auto?'auto':''}">
    <div class="mockEHead">
      <span class="mockEName">${escapeHtml(e.name||'Untitled Mock')}${autoTag}</span>
      <span class="mockEDate">${dateDisp}</span>
    </div>
    ${statsRow}
    ${chapterNote}
    ${remarksNote}
    ${actions}
  </div>`;
}
function renderMockDetail(){
  const cat = MOCK_CATS.find(c=>c.id===mockActiveCat);
  const titleEl = document.getElementById('mockDetailTitle');
  const bodyEl = document.getElementById('mockDetailBody');
  if(!cat || !titleEl || !bodyEl) return;
  titleEl.textContent = `${cat.icon} ${cat.label}`;
  const detailSecEl = document.getElementById('mockDetailSection');
  if(detailSecEl) detailSecEl.setAttribute('data-cat', cat.id);
  if(cat.id==='analysis'){
    bodyEl.innerHTML = renderMockAnalysisHtml();
    wireMockAnalysisAiBox();
    return;
  }
  if(cat.id==='notesLog'){
    bodyEl.innerHTML = renderMockNotesHtml();
    return;
  }
  const entries = mockEntriesFor(cat.id);
  let html = `<div class="btnrow"><button class="nav-btn onbPrimary" id="mockAddEntryBtn" type="button">➕ Naya ${cat.label.replace(' Sectional','').replace(/ Mock$/,'')} Mock Add Karo</button></div>`;
  html += entries.length
    ? entries.map(e=>renderMockEntryCard(cat.id, e)).join('')
    : `<div class="mockEmptyState">Abhi koi mock add nahi hua. Upar wale button se pehla mock add karo!</div>`;
  bodyEl.innerHTML = html;
  const addBtn = document.getElementById('mockAddEntryBtn');
  if(addBtn) addBtn.addEventListener('click', ()=> openMockForm(cat.id, null));
  bodyEl.querySelectorAll('.mockEActions .edit').forEach(b=>{
    b.addEventListener('click', ()=> openMockForm(cat.id, b.getAttribute('data-id')));
  });
  bodyEl.querySelectorAll('.mockEActions .del').forEach(b=>{
    b.addEventListener('click', ()=> deleteMockEntry(cat.id, b.getAttribute('data-id')));
  });
}
function openMockForm(catId, entryId){
  mockEditId = entryId;
  const modal = document.getElementById('mockFormModal');
  const titleEl = document.getElementById('mockFormTitle');
  const bodyEl = document.getElementById('mockFormBody');
  if(!modal || !bodyEl) return;
  ensureMockLogState();
  const storeKey = mockStorageKey(catId);
  const entry = entryId ? (state.mockLog[storeKey]||[]).find(x=>x.id===entryId) : null;
  const catLabel = (MOCK_CATS.find(c=>c.id===catId)||{}).label || 'Mock';
  titleEl.innerHTML = entry ? `<span class="icoEdit" aria-hidden="true"></span> ${catLabel} Edit Karo` : `➕ Naya ${catLabel} Add Karo`;
  const isPre = catId==='preMock' || catId==='mainsMock';
  const v = {
    name: entry ? (entry.name||'') : '',
    date: entry ? (entry.date||fmtISODate(new Date())) : fmtISODate(new Date()),
    math: entry ? (entry.math||'') : '', reasoning: entry ? (entry.reasoning||'') : '',
    english: entry ? (entry.english||'') : '', gk: entry ? (entry.gk||'') : '',
    score: entry ? (entry.score||'') : '',
    right: entry ? (entry.right||'') : '', wrong: entry ? (entry.wrong||'') : '', skip: entry ? (entry.skip||'') : '',
    percentile: entry ? (entry.percentile||'') : '',
    chapter: entry ? (entry.chapter||'') : '', remarks: entry ? (entry.remarks||'') : ''
  };
  let html = `
    <div class="onbLabel">Mock Ka Naam</div>
    <input type="text" id="mfName" placeholder="e.g. Adda247 Mock 12" value="${escapeHtml(v.name)}">
    <div class="onbLabel">Date</div>
    <input type="date" id="mfDate" value="${v.date}">
  `;
  if(isPre){
    html += `
      <div class="onbLabel">Subject-wise Marks</div>
      <div class="scoreform">
        <div class="scorefield"><label>Math</label><input type="number" step="any" id="mfMath" value="${v.math}"></div>
        <div class="scorefield"><label>Reasoning</label><input type="number" step="any" id="mfReasoning" value="${v.reasoning}"></div>
        <div class="scorefield"><label>English</label><input type="number" step="any" id="mfEnglish" value="${v.english}"></div>
        <div class="scorefield"><label>GK</label><input type="number" step="any" id="mfGk" value="${v.gk}"></div>
      </div>
      <div class="onbLabel">Right / Wrong / Percentile</div>
      <div class="scoreform" style="grid-template-columns:repeat(3,1fr);">
        <div class="scorefield"><label>Right</label><input type="number" step="1" min="0" id="mfRightPre" value="${v.right}"></div>
        <div class="scorefield"><label>Wrong</label><input type="number" step="1" min="0" id="mfWrongPre" value="${v.wrong}"></div>
        <div class="scorefield"><label>%ile</label><input type="number" step="any" min="0" max="100" id="mfPercentile" value="${v.percentile}"></div>
      </div>
    `;
  } else {
    html += `
      <div class="onbLabel">Score / Right / Wrong / Skip</div>
      <div class="scoreform">
        <div class="scorefield"><label>Score</label><input type="number" step="any" id="mfScore" value="${v.score}"></div>
        <div class="scorefield"><label>Right</label><input type="number" step="1" min="0" id="mfRightSec" value="${v.right}"></div>
        <div class="scorefield"><label>Wrong</label><input type="number" step="1" min="0" id="mfWrongSec" value="${v.wrong}"></div>
        <div class="scorefield"><label>Skip</label><input type="number" step="1" min="0" id="mfSkip" value="${v.skip}"></div>
      </div>
    `;
  }
  html += `
    <div class="onbLabel">Weak Chapter(s)</div>
    <input type="text" id="mfChapter" placeholder="e.g. Time & Work, Profit-Loss" value="${escapeHtml(v.chapter)}">
  `;
  if(catId!=='reasoningSec'){
    html += `
      <div class="onbLabel">⚡ Chapter Mistake Quick-Log</div>
      <div class="chapterQuickHint">Is mock mein jo chapter galat hue, unhe yahin se turant log karo — "Weak" tab ka count bhi turant update ho jayega.</div>
      <div class="chapterQuickRow">
        <select id="mfQuickMathChSel">${MATH_CHAPTERS.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
        <button type="button" class="chapterQuickBtn" id="mfQuickMathChBtn">➕ Math Wrong</button>
        <span class="chapterQuickCount" id="mfQuickMathChCount">0</span>
      </div>
      <div class="chapterQuickRow">
        <select id="mfQuickEngChSel">${ENGLISH_TOPICS.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
        <button type="button" class="chapterQuickBtn" id="mfQuickEngChBtn">➕ English Wrong</button>
        <span class="chapterQuickCount" id="mfQuickEngChCount">0</span>
      </div>
    `;
  }
  html += `
    <div class="onbLabel">Remarks</div>
    <div class="voiceField">
      <textarea id="mfRemarks" placeholder="Kya galat hua, kya improve karna hai...">${escapeHtml(v.remarks)}</textarea>
      <button type="button" class="micBtn" data-mic-target="mfRemarks" aria-label="Bol kar likho" title="Bol kar likho"><svg viewBox="0 0 24 24" class="micIcon"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></button>
    </div>
  `;
  bodyEl.innerHTML = html;
  wireMockQuickChapterLog();
  const saveBtn = document.getElementById('mockFormSaveBtn');
  if(saveBtn) saveBtn.onclick = ()=> saveMockForm(catId);
  modal.style.display = 'flex';
}
// Wires up the "Chapter Mistake Quick-Log" widget inside the mock add/edit
// modal: tapping +1 bumps the SAME global weak-chapter counter used on the
// Today tab and Weak tab, and appends the chapter name into this entry's
// "Weak Chapter(s)" text field so it's saved on the mock itself too.
function wireMockQuickChapterLog(){
  const mSel = document.getElementById('mfQuickMathChSel');
  const mBtn = document.getElementById('mfQuickMathChBtn');
  const mCount = document.getElementById('mfQuickMathChCount');
  const eSel = document.getElementById('mfQuickEngChSel');
  const eBtn = document.getElementById('mfQuickEngChBtn');
  const eCount = document.getElementById('mfQuickEngChCount');
  const chapterInp = document.getElementById('mfChapter');
  function refreshCounts(){
    if(mSel && mCount) mCount.textContent = chapterCount('math', mSel.value) + ' wrong so far';
    if(eSel && eCount) eCount.textContent = chapterCount('english', eSel.value) + ' wrong so far';
  }
  function appendChapter(name){
    if(!chapterInp) return;
    const cur = chapterInp.value.split(',').map(s=>s.trim()).filter(Boolean);
    cur.push(name);
    chapterInp.value = cur.join(', ');
  }
  if(mSel) mSel.addEventListener('change', refreshCounts);
  if(eSel) eSel.addEventListener('change', refreshCounts);
  if(mBtn) mBtn.addEventListener('click', async ()=>{
    if(!mSel) return;
    await bumpChapter('math', mSel.value, 1);
    appendChapter(mSel.value);
    refreshCounts();
  });
  if(eBtn) eBtn.addEventListener('click', async ()=>{
    if(!eSel) return;
    await bumpChapter('english', eSel.value, 1);
    appendChapter(eSel.value);
    refreshCounts();
  });
  refreshCounts();
}
function closeMockForm(){
  const modal = document.getElementById('mockFormModal');
  if(modal) modal.style.display = 'none';
  mockEditId = null;
}
async function saveMockForm(catId){
  ensureMockLogState();
  const nameEl = document.getElementById('mfName');
  const name = nameEl ? nameEl.value.trim() : '';
  if(!name){ alert('Mock ka naam daalo.'); return; }
  const dateEl = document.getElementById('mfDate');
  const date = (dateEl && dateEl.value) ? dateEl.value : fmtISODate(new Date());
  const storeKey = mockStorageKey(catId);
  let entry;
  if(catId==='preMock' || catId==='mainsMock'){
    entry = {
      name, date,
      examType: catId==='mainsMock' ? 'mains' : 'pre',
      math: document.getElementById('mfMath').value,
      reasoning: document.getElementById('mfReasoning').value,
      english: document.getElementById('mfEnglish').value,
      gk: document.getElementById('mfGk').value,
      right: document.getElementById('mfRightPre').value,
      wrong: document.getElementById('mfWrongPre').value,
      percentile: document.getElementById('mfPercentile').value,
      chapter: document.getElementById('mfChapter').value,
      remarks: document.getElementById('mfRemarks').value,
    };
  } else {
    const skipEl = document.getElementById('mfSkip');
    entry = {
      name, date,
      score: document.getElementById('mfScore').value,
      right: document.getElementById('mfRightSec').value,
      wrong: document.getElementById('mfWrongSec').value,
      skip: skipEl ? skipEl.value : '',
      chapter: document.getElementById('mfChapter').value,
      remarks: document.getElementById('mfRemarks').value,
    };
  }
  const list = state.mockLog[storeKey];
  if(mockEditId){
    const idx = list.findIndex(x=>x.id===mockEditId);
    if(idx>=0) list[idx] = Object.assign({}, list[idx], entry);
  } else {
    entry.id = 'm_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    list.push(entry);
  }
  await save();
  closeMockForm();
  renderMockDetail();
  renderMockTab();
}
async function deleteMockEntry(catId, id){
  if(!confirm('Ye mock delete karna hai?')) return;
  ensureMockLogState();
  const storeKey = mockStorageKey(catId);
  state.mockLog[storeKey] = (state.mockLog[storeKey]||[]).filter(x=>x.id!==id);
  await save();
  renderMockDetail();
  renderMockTab();
}
// Builds a combined, newest-first list of every day (current target + every
// archived one in state.__history) that has a Notes/Error Log and/or Silly
// Mistakes entry on the Today tab — so both boxes can be reviewed together,
// across the whole prep journey, from one dedicated Mock-tab button.
function getNotesMistakesEntries(){
  const out = [];
  function pushFromDay(dayNum, dayObj, cycleStartDate, cycleLabel){
    if(!dayObj) return;
    const notes = (dayObj.notes||'').trim();
    const mistakes = (dayObj.mistakes||'').trim();
    if(!notes && !mistakes) return;
    let dateStr = '';
    try{
      const dt = new Date(cycleStartDate);
      dt.setDate(dt.getDate() + (dayNum-1));
      dateStr = fmtISODate(dt);
    }catch(e){ /* ignore bad date */ }
    out.push({ day:dayNum, date:dateStr, notes, mistakes, cycleLabel });
  }
  for(let i=1;i<=TOTAL_DAYS;i++) pushFromDay(i, state[i], START_DATE, '');
  if(Array.isArray(state.__history)){
    state.__history.forEach((cyc, ci)=>{
      const days = cyc.days || {};
      Object.keys(days).forEach(k=> pushFromDay(parseInt(k,10), days[k], new Date(cyc.startDate), 'Purana Target '+(ci+1)));
    });
  }
  out.sort((a,b)=>{
    const da = a.date||'', db = b.date||'';
    if(da!==db) return da<db ? 1 : -1;
    return b.day-a.day;
  });
  return out;
}
function renderMockNotesHtml(){
  const entries = getNotesMistakesEntries();
  if(!entries.length){
    return `<div class="mockEmptyState">Abhi koi Note ya Silly Mistake nahi likha. Today tab ke "📝 NOTES" aur "🤦 SILLY MISTAKES" boxes mein likho — sab yahan ek jagah dikhega.</div>`;
  }
  const notesCount = entries.filter(e=>e.notes).length;
  const mistakesCount = entries.filter(e=>e.mistakes).length;
  let html = `<div class="mockInsight">
    <span class="mi-icon">🗒️</span>
    <div class="mi-text">Total <b>${entries.length}</b> din ki entries mili — <b>${notesCount}</b> Notes/Error Log aur <b>${mistakesCount}</b> Silly Mistakes, sabse recent din sabse upar.</div>
  </div>`;
  html += entries.map(e=>{
    const dateDisp = e.date ? new Date(e.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const tag = e.cycleLabel ? `<span class="mockETag" style="color:var(--teal);border-color:var(--teal);">${escapeHtml(e.cycleLabel)}</span>` : '';
    const notesBlock = e.notes ? `<div class="mockENote" style="white-space:pre-wrap;"><b>📝 Notes / Error Log:</b> ${escapeHtml(e.notes)}</div>` : '';
    const mistakesBlock = e.mistakes ? `<div class="mockENote" style="white-space:pre-wrap;"><b>🤦 Silly Mistakes:</b> ${escapeHtml(e.mistakes)}</div>` : '';
    return `<div class="mockEntryCard">
      <div class="mockEHead">
        <span class="mockEName">Day ${e.day}${tag}</span>
        <span class="mockEDate">${dateDisp}</span>
      </div>
      ${notesBlock}
      ${mistakesBlock}
    </div>`;
  }).join('');
  return html;
}
function renderMockAnalysisHtml(){
  const preOnly = mockEntriesFor('preMock');
  const mainsOnly = mockEntriesFor('mainsMock');
  const preEntriesAll = preOnly.concat(mainsOnly);
  const mathSec = mockEntriesFor('mathSec');
  const engSec = mockEntriesFor('engSec');
  const reasSec = mockEntriesFor('reasoningSec');

  function avgTotal(list){
    const valid = list.filter(e=>hasVal(e.math)||hasVal(e.reasoning)||hasVal(e.english)||hasVal(e.gk));
    return valid.length ? valid.reduce((a,e)=>a+mockTotalOfPre(e),0)/valid.length : null;
  }
  function avgField(list, field){
    const valid = list.filter(e=>hasVal(e[field]));
    return valid.length ? valid.reduce((a,e)=>a+num(e[field]),0)/valid.length : null;
  }
  function avgScore(list){
    const valid = list.filter(e=>hasVal(e.score));
    return valid.length ? valid.reduce((a,e)=>a+num(e.score),0)/valid.length : null;
  }
  const fmt = v => v===null ? '—' : v.toFixed(1);

  const overallAvgTotal = avgTotal(preEntriesAll);
  const preAvgTotal = avgTotal(preOnly);
  const mainsAvgTotal = avgTotal(mainsOnly);
  const mathAvg = avgField(preEntriesAll,'math');
  const reasAvg = avgField(preEntriesAll,'reasoning');
  const engAvg = avgField(preEntriesAll,'english');
  const gkAvg = avgField(preEntriesAll,'gk');
  const percAvg = avgField(preEntriesAll,'percentile');
  const mathSecAvg = avgScore(mathSec);
  const engSecAvg = avgScore(engSec);
  const reasSecAvg = avgScore(reasSec);

  const subjectAvgs = [
    {label:'Math', val:mathAvg},
    {label:'Reasoning', val:reasAvg},
    {label:'English', val:engAvg},
    {label:'GK', val:gkAvg},
  ].filter(s=>s.val!==null);
  let insightHtml;
  if(subjectAvgs.length){
    subjectAvgs.sort((a,b)=>a.val-b.val);
    const weakest = subjectAvgs[0];
    insightHtml = `<div class="mockInsight">
      <span class="mi-icon">🎯</span>
      <div class="mi-text">Sabse zyada dhyan do: <b>${weakest.label}</b> — avg sirf <b>${weakest.val.toFixed(1)}</b> hai, baaki subjects se sabse kam. Yahan roz thoda extra time do.</div>
    </div>`;
  } else {
    insightHtml = `<div class="mockInsight"><span class="mi-icon">🎯</span><div class="mi-text">Jaise hi Pre Mocks add karoge, yahan pata chalega kis subject mein sabse zyada improve karna hai.</div></div>`;
  }
  const totalMockCount = preEntriesAll.length + mathSec.length + engSec.length + reasSec.length;

  return `
    ${insightHtml}
    <div class="perfwrap">
      <div class="perfcard">
        <h3>🧪 FULL MOCKS</h3>
        <div class="perfrow"><span>Pre Mocks avg (${preOnly.length})</span><span>${fmt(preAvgTotal)}</span></div>
        <div class="perfrow"><span>Mains Mocks avg (${mainsOnly.length})</span><span>${fmt(mainsAvgTotal)}</span></div>
        <div class="perfrow total"><span>Overall avg total (${preEntriesAll.length})</span><span>${fmt(overallAvgTotal)}</span></div>
        <div class="perfrow"><span>Percentile avg</span><span>${fmt(percAvg)}</span></div>
      </div>
      <div class="perfcard">
        <h3>📚 SUBJECT-WISE AVG (FULL MOCKS)</h3>
        <div class="perfrow"><span>Math avg</span><span>${fmt(mathAvg)}</span></div>
        <div class="perfrow"><span>Reasoning avg</span><span>${fmt(reasAvg)}</span></div>
        <div class="perfrow"><span>English avg</span><span>${fmt(engAvg)}</span></div>
        <div class="perfrow"><span>GK avg</span><span>${fmt(gkAvg)}</span></div>
      </div>
    </div>
    <div class="perfwrap">
      <div class="perfcard">
        <h3>🔢 SECTIONAL AVERAGES</h3>
        <div class="perfrow"><span>Math Sectional avg (${mathSec.length})</span><span>${fmt(mathSecAvg)}</span></div>
        <div class="perfrow"><span>English Sectional avg (${engSec.length})</span><span>${fmt(engSecAvg)}</span></div>
        <div class="perfrow"><span>Reasoning Sectional avg (${reasSec.length})</span><span>${fmt(reasSecAvg)}</span></div>
      </div>
      <div class="perfcard">
        <h3>📈 TOTALS</h3>
        <div class="perfrow total"><span>Total mocks logged (all-time)</span><span>${totalMockCount}</span></div>
        <div class="perfrow"><span>Full mocks</span><span>${preEntriesAll.length}</span></div>
        <div class="perfrow"><span>Sectional mocks</span><span>${mathSec.length+engSec.length+reasSec.length}</span></div>
      </div>
    </div>
    <div class="grid-label" style="margin-top:22px;">🤖 AI Deep Analysis</div>
    <div class="panel" id="aiMockAnalysisPanel"></div>
  `;
}
document.getElementById('mockBackBtn').addEventListener('click', closeMockCategory);
document.getElementById('mockFormCloseBtn').addEventListener('click', closeMockForm);

// ===== 🤖 AI Deep Analysis (Mock tab → Overall Analysis) =====
// Takes all the same aggregate numbers already shown in the Overall
// Analysis panel above (subject/sectional averages, recent full-mock
// trend, top weak chapters/topics) and asks Gemini to actually reason
// about them — which subject/section is weakest, whether the trend is
// improving, which specific chapters keep recurring, and a concrete
// 7-day focus. Cached per user (not per-day) since it's meant to reflect
// all-time performance; a manual "Phir Se Analysis Karo" button refreshes
// it once new mocks have been logged.
function buildMockAnalysisAiData(){
  const preOnly = mockEntriesFor('preMock');
  const mainsOnly = mockEntriesFor('mainsMock');
  const preEntriesAll = preOnly.concat(mainsOnly);
  const mathSec = mockEntriesFor('mathSec');
  const engSec = mockEntriesFor('engSec');
  const reasSec = mockEntriesFor('reasoningSec');

  function avgField(list, field){
    const valid = list.filter(e=>hasVal(e[field]));
    return valid.length ? +(valid.reduce((a,e)=>a+num(e[field]),0)/valid.length).toFixed(1) : null;
  }
  function avgTotal(list){
    const valid = list.filter(e=>hasVal(e.math)||hasVal(e.reasoning)||hasVal(e.english)||hasVal(e.gk));
    return valid.length ? +(valid.reduce((a,e)=>a+mockTotalOfPre(e),0)/valid.length).toFixed(1) : null;
  }
  function avgScore(list){
    const valid = list.filter(e=>hasVal(e.score));
    return valid.length ? +(valid.reduce((a,e)=>a+num(e.score),0)/valid.length).toFixed(1) : null;
  }

  const mathChapterCounts = MATH_CHAPTERS.map(n=>({name:n, wrongCount:chapterCount('math',n)}))
    .filter(c=>c.wrongCount>0).sort((a,b)=>b.wrongCount-a.wrongCount).slice(0,5);
  const engTopicCounts = ENGLISH_TOPICS.map(n=>({name:n, wrongCount:chapterCount('english',n)}))
    .filter(c=>c.wrongCount>0).sort((a,b)=>b.wrongCount-a.wrongCount).slice(0,5);

  // Oldest→newest totals of the 5 most recent full mocks, for a simple trend.
  const recentTotals = preEntriesAll.slice(0,5).map(mockTotalOfPre).reverse();

  return {
    totalMocksLogged: preEntriesAll.length + mathSec.length + engSec.length + reasSec.length,
    fullMocks: {
      count: preEntriesAll.length,
      preAvgTotal: avgTotal(preOnly),
      mainsAvgTotal: avgTotal(mainsOnly),
      overallAvgTotal: avgTotal(preEntriesAll),
      percentileAvg: avgField(preEntriesAll,'percentile')
    },
    subjectAvgsInFullMocks: {
      math: avgField(preEntriesAll,'math'),
      reasoning: avgField(preEntriesAll,'reasoning'),
      english: avgField(preEntriesAll,'english'),
      gk: avgField(preEntriesAll,'gk')
    },
    sectionalAvgs: {
      math: avgScore(mathSec), english: avgScore(engSec), reasoning: avgScore(reasSec),
      mathCount: mathSec.length, engCount: engSec.length, reasoningCount: reasSec.length
    },
    recentFullMockTotalsOldestToNewest: recentTotals,
    top5WeakestMathChapters: mathChapterCounts,
    top5WeakestEnglishTopics: engTopicCounts
  };
}
async function callMockAnalysisAI(data){
  const system = "Tum ek SSC CGL exam-prep data analyst ho. Tumhe student ka mock/sectional test performance JSON diya jayega (subject-wise averages, sectional averages, recent full-mock totals ka trend, aur top weak chapters/topics unke wrong-counts ke saath). Hamesha Hinglish (Roman script Hindi+English mix) mein jawab do, kabhi shuddh English paragraph mat likho, aur kabhi markdown heading/bullet/asterisk use mat karo — sirf plain paragraphs (zaroorat ho to blank line se break karo), kyunki ye seedha ek panel mein dikhaya jayega. Kaam: 1) Data ko deeply analyse karo — kaunsa subject/section sabse kamzor hai, recent trend upar ja raha hai ya neeche, aur kaunse specific chapters/topics sabse zyada dohrai galtiyan de rahe hain. 2) Kam se kam 2 specific chapter/topic ka naam lekar bolo ki inhe priority se revise karo (agar data mein maujood hain) — generic 'practice more' mat bolo jab specific naam maujood ho. 3) Ek chhota, concrete 7-din ka improvement focus do (jaise 'is hafte roz X ke 10 questions solve karo'). Response 150-220 words ka ho.";

  const userMsg = "Mera poora mock/sectional performance data (JSON):\n" + JSON.stringify(data, null, 2) + "\n\nIsko deeply analyse karke ek Hinglish performance-analysis report do, mere real weak chapters/topics aur trend ka hawala dete hue.";

  const resp = await fetch(AI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: system,
      messages: [{ role: "user", content: userMsg }]
    })
  });
  if(!resp.ok) throw new Error('Mock Analysis AI request failed: ' + resp.status);
  const json = await resp.json();
  const text = (json.content || [])
    .filter(b => b && b.type === 'text' && b.text)
    .map(b => b.text)
    .join('\n')
    .trim();
  if(!text) throw new Error('Mock Analysis AI: empty response');
  return text;
}
// Rule-based fallback if the API isn't reachable — same numbers already on
// screen, just written out as a sentence, so the panel never breaks.
function buildMockAnalysisAiFallback(data){
  if(!data.totalMocksLogged){
    return "Abhi tak koi mock/sectional logged nahi hai — pehle kuch mocks add karo, phir yahan deep analysis dikhega.";
  }
  const subs = [
    {label:'Math', val:data.subjectAvgsInFullMocks.math},
    {label:'Reasoning', val:data.subjectAvgsInFullMocks.reasoning},
    {label:'English', val:data.subjectAvgsInFullMocks.english},
    {label:'GK', val:data.subjectAvgsInFullMocks.gk},
  ].filter(s=>s.val!==null).sort((a,b)=>a.val-b.val);
  const weakest = subs[0];
  const topChapter = data.top5WeakestMathChapters[0] || data.top5WeakestEnglishTopics[0];
  let msg = `Abhi tak ${data.totalMocksLogged} mocks/sectionals logged hain.`;
  if(weakest) msg += ` Sabse kamzor subject: ${weakest.label} (avg ${weakest.val}).`;
  if(topChapter) msg += ` Sabse zyada galtiyan: ${topChapter.name} (${topChapter.wrongCount} wrong) — isse priority pe revise karo.`;
  msg += ' AI analysis abhi nahi ban paayi, thodi der mein phir try karo.';
  return msg;
}
function mockAnalysisAiCacheKey(){
  return 'cgl50-mockanalysis-ai-' + (myName||'me').toLowerCase();
}
function loadMockAnalysisAiCache(){
  try{
    const raw = localStorage.getItem(mockAnalysisAiCacheKey());
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function saveMockAnalysisAiCache(obj){
  try{ localStorage.setItem(mockAnalysisAiCacheKey(), JSON.stringify(obj)); }catch(e){}
}
async function getMockAnalysisAiResult(forceRefresh){
  if(!forceRefresh){
    const cached = loadMockAnalysisAiCache();
    if(cached) return cached;
  }
  const data = buildMockAnalysisAiData();
  let text, source;
  try{
    text = await callMockAnalysisAI(data);
    source = 'ai';
  }catch(e){
    console.error('Mock Analysis AI call failed, offline fallback use ho raha hai:', e);
    text = buildMockAnalysisAiFallback(data);
    source = 'offline';
  }
  const result = { text, source, ts: Date.now() };
  saveMockAnalysisAiCache(result);
  return result;
}
function buildMockAnalysisAiBoxHtml(cached){
  if(!cached){
    return `<div class="btnrow"><button class="nav-btn" type="button" id="mockAiBtn" data-ma-refresh="0">🤖 AI Se Deep Analysis Karo</button></div>`;
  }
  return `
    <div class="guideAiTip"><span class="guideAiSourceTag">${cached.source==='ai' ? '🤖 AI ANALYSIS' : '📐 OFFLINE ANALYSIS'}</span>${escapeHtml(cached.text)}</div>
    <div class="btnrow"><button class="nav-btn" type="button" id="mockAiBtn" data-ma-refresh="1">🔄 Phir Se Analysis Karo</button></div>
  `;
}
function wireMockAnalysisAiBox(){
  const box = document.getElementById('aiMockAnalysisPanel');
  if(!box) return;
  box.innerHTML = buildMockAnalysisAiBoxHtml(loadMockAnalysisAiCache());
  const btn = document.getElementById('mockAiBtn');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    const forceRefresh = btn.getAttribute('data-ma-refresh')==='1';
    box.innerHTML = `<div class="guideAiTip">🧠 AI tumhara mock/sectional data analyse kar raha hai…</div>`;
    try{
      const result = await getMockAnalysisAiResult(forceRefresh);
      box.innerHTML = buildMockAnalysisAiBoxHtml(result);
      wireMockAnalysisAiBox();
    }catch(e){
      box.innerHTML = `<div class="guideAiTip">Analysis abhi nahi ban paaya — thodi der mein phir try karo.</div>`;
      console.error('Mock Analysis AI box error:', e);
    }
  });
}

// Quick chapter-mistake log widget (shown right under the mock score panel
// on the Today tab) — shows the running wrong-count for whichever chapter
// is currently selected in the dropdown, so tapping "+1 Wrong" gives
// instant feedback without needing to switch to the Chapters tab.
function renderQuickChapterLog(){
  const mSel = document.getElementById('quickMathChSel');
  const mCount = document.getElementById('quickMathChCount');
  if(mSel && mCount) mCount.textContent = chapterCount('math', mSel.value) + ' wrong so far';
  const eSel = document.getElementById('quickEngChSel');
  const eCount = document.getElementById('quickEngChCount');
  if(eSel && eCount) eCount.textContent = chapterCount('english', eSel.value) + ' wrong so far';
}

// Builds one sorted (weakest-first) chapter list panel, for either
// MATH_CHAPTERS or ENGLISH_TOPICS.
function renderChapterList(type, chapters){
  const isReadOnly = viewingName !== myName && !(canAdminEditViewed() && adminEditModeOn);
  const dis = isReadOnly ? 'disabled' : '';
  const rows = chapters.map(name => ({ name, count: chapterCount(type, name) }));
  rows.sort((a,b)=> b.count-a.count || chapters.indexOf(a.name)-chapters.indexOf(b.name));
  const maxCount = rows.length ? rows[0].count : 0;
  return rows.map(r=>{
    const weak = maxCount>0 && r.count===maxCount && r.count>0;
    return `
    <div class="chapterRow ${weak?'weak':''} ${r.count===0?'clear':''}">
      <span class="chName">${weak?'🔥 ':r.count===0?'✨ ':''}${escapeHtml(r.name)}</span>
      <span class="chCount">${r.count}</span>
      <button class="chBtn chMinus" data-ch-type="${type}" data-ch-name="${escapeHtml(r.name)}" data-ch-delta="-1" ${dis}>−1</button>
      <button class="chBtn chPlus" data-ch-type="${type}" data-ch-name="${escapeHtml(r.name)}" data-ch-delta="1" ${dis}>+1</button>
    </div>`;
  }).join('');
}

function renderChaptersTab(){
  const mathEl = document.getElementById('mathChapterList');
  const engEl = document.getElementById('englishChapterList');
  const summaryEl = document.getElementById('weakSummaryPanel');
  if(!mathEl || !engEl || !summaryEl) return;

  renderStudyGuidePanel();

  mathEl.innerHTML = renderChapterList('math', MATH_CHAPTERS);
  engEl.innerHTML = renderChapterList('english', ENGLISH_TOPICS);

  const mathTop = MATH_CHAPTERS.map(n=>({n,c:chapterCount('math',n)})).sort((a,b)=>b.c-a.c)[0];
  const engTop = ENGLISH_TOPICS.map(n=>({n,c:chapterCount('english',n)})).sort((a,b)=>b.c-a.c)[0];
  const mathTotal = MATH_CHAPTERS.reduce((s,n)=>s+chapterCount('math',n),0);
  const engTotal = ENGLISH_TOPICS.reduce((s,n)=>s+chapterCount('english',n),0);
  summaryEl.innerHTML = `
    <div class="bwrow"><span>🧮 Weakest Math Chapter</span><span class="amt ${mathTop && mathTop.c>0 ? 'loss':''}">${mathTop && mathTop.c>0 ? escapeHtml(mathTop.n)+' ('+mathTop.c+')' : '— abhi data nahi'}</span></div>
    <div class="bwrow"><span>🔤 Weakest English Topic</span><span class="amt ${engTop && engTop.c>0 ? 'loss':''}">${engTop && engTop.c>0 ? escapeHtml(engTop.n)+' ('+engTop.c+')' : '— abhi data nahi'}</span></div>
    <div class="bwrow"><span>Total Math wrong (all time)</span><span>${mathTotal}</span></div>
    <div class="bwrow"><span>Total English wrong (all time)</span><span>${engTotal}</span></div>
  `;

  document.querySelectorAll('#mathChapterList .chBtn, #englishChapterList .chBtn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const type = btn.getAttribute('data-ch-type');
      const name = btn.getAttribute('data-ch-name');
      const delta = parseInt(btn.getAttribute('data-ch-delta'));
      await bumpChapter(type, name, delta);
    });
  });

  applyChapterSearchFilter();
}

// ===== 🤖 AI Deep Study Guide (Chapters tab) =====
// Lets the student pick a subject + chapter/topic (defaults to their
// current weakest) and get a focused, Gemini-generated deep-dive: core
// concept, key formulas/rules, common SSC CGL trap patterns, and a small
// practice plan. Cached per user+subject+chapter (content for a given
// chapter doesn't change day to day, so no need to regenerate on every
// visit) — a manual "Naya Guide Banao" button forces a fresh one.
let studyGuideType = 'math';       // 'math' | 'english'
let studyGuideChapter = null;      // chosen chapter/topic name; null = pick default below
function studyGuideDefaultChapter(type){
  const list = type==='math' ? MATH_CHAPTERS : ENGLISH_TOPICS;
  const top = list.map(n=>({n,c:chapterCount(type,n)})).sort((a,b)=>b.c-a.c)[0];
  return top ? top.n : list[0];
}
function buildStudyGuideData(type, name){
  return {
    subject: type==='math' ? 'Math' : 'English',
    chapterOrTopic: name,
    wrongCountSoFar: chapterCount(type, name),
    examContext: 'SSC CGL Tier 1 aur Tier 2'
  };
}
async function callStudyGuideAI(data){
  const system = "Tum ek SSC CGL exam-prep subject expert ho jo ek student ke liye ek chhota par gehra (deep) study guide banate ho, ek specific chapter/topic ke upar. Hamesha Hinglish (Roman script Hindi+English mix) mein likho, kabhi shuddh English paragraph mat likho, aur kabhi markdown heading/bullet/asterisk use mat karo — sirf plain paragraphs (zaroorat ho to blank line se break karo), kyunki ye ek plain-text panel mein dikhaya jayega. Tumhe subject, exact chapter/topic ka naam, aur student ne ab tak is topic mein kitni baar galti ki hai (wrongCountSoFar), diya jayega. Content mein zaroor cover karo: 1) topic ka core concept/rule 2-3 lines mein, 2) SSC CGL mein sabse zyada kaam aane wale 2-3 formula/shortcut/trick (Math ho to) ya grammar rule (English ho to) specific naam ke saath, 3) is topic mein students aksar kaunsi 1-2 galtiyan karte hain (trap patterns), 4) ek chhota practical practice-plan (kitne din, kitne questions roz). Response 180-260 words ka ho.";

  const userMsg = "Subject: " + data.subject + "\nChapter/Topic: " + data.chapterOrTopic + "\nAb tak wrong count: " + data.wrongCountSoFar + "\nExam: " + data.examContext + "\n\nIs topic ke liye ek deep, practical Hinglish study guide banao.";

  const resp = await fetch(AI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: system,
      messages: [{ role: "user", content: userMsg }]
    })
  });
  if(!resp.ok) throw new Error('Study Guide AI request failed: ' + resp.status);
  const json = await resp.json();
  const text = (json.content || [])
    .filter(b => b && b.type === 'text' && b.text)
    .map(b => b.text)
    .join('\n')
    .trim();
  if(!text) throw new Error('Study Guide AI: empty response');
  return text;
}
// Rule-based fallback if the API isn't reachable — never leaves the panel
// blank/broken even offline.
function buildStudyGuideFallback(data){
  return `"${data.chapterOrTopic}" (${data.subject}) abhi ${data.wrongCountSoFar} baar wrong mark ho chuka hai. AI guide abhi nahi ban paayi — standard SSC CGL notes/playlist se is topic ke core formulas/rules revise karo, aur roz kam se kam 10-15 questions isi topic se practice karo jab tak wrong count kam na ho jaye.`;
}
function studyGuideCacheKey(type, name){
  return 'cgl50-studyguide-ai-' + (myName||'me').toLowerCase() + '-' + type + '-' + name;
}
function loadStudyGuideCache(type, name){
  try{
    const raw = localStorage.getItem(studyGuideCacheKey(type, name));
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function saveStudyGuideCache(type, name, obj){
  try{ localStorage.setItem(studyGuideCacheKey(type, name), JSON.stringify(obj)); }catch(e){}
}
async function getStudyGuideResult(type, name, forceRefresh){
  if(!forceRefresh){
    const cached = loadStudyGuideCache(type, name);
    if(cached) return cached;
  }
  const data = buildStudyGuideData(type, name);
  let text, source;
  try{
    text = await callStudyGuideAI(data);
    source = 'ai';
  }catch(e){
    console.error('Study Guide AI call failed, offline fallback use ho raha hai:', e);
    text = buildStudyGuideFallback(data);
    source = 'offline';
  }
  const result = { text, source, ts: Date.now() };
  saveStudyGuideCache(type, name, result);
  return result;
}
function renderStudyGuidePanel(){
  const panel = document.getElementById('aiStudyGuidePanel');
  if(!panel) return;
  if(!studyGuideChapter) studyGuideChapter = studyGuideDefaultChapter(studyGuideType);
  const list = studyGuideType==='math' ? MATH_CHAPTERS : ENGLISH_TOPICS;
  const cached = loadStudyGuideCache(studyGuideType, studyGuideChapter);
  const optionsHtml = list.map(n=>`<option value="${escapeHtml(n)}" ${n===studyGuideChapter?'selected':''}>${escapeHtml(n)}</option>`).join('');
  panel.innerHTML = `
    <div class="mockTypeToggle">
      <button type="button" class="mockTypeOpt ${studyGuideType==='math'?'active':''}" data-sg-type="math">🧮 Math</button>
      <button type="button" class="mockTypeOpt ${studyGuideType==='english'?'active':''}" data-sg-type="english">🔤 English</button>
    </div>
    <div class="chapterQuickRow"><select id="sgChapterSelect">${optionsHtml}</select></div>
    ${cached ? `<div class="guideAiTip"><span class="guideAiSourceTag">${cached.source==='ai' ? '🤖 AI GUIDE' : '📐 OFFLINE GUIDE'}</span>${escapeHtml(cached.text)}</div>` : ''}
    <div class="btnrow"><button class="nav-btn" type="button" id="sgGenBtn" data-sg-refresh="${cached?'1':'0'}">${cached ? '🔄 Naya Guide Banao' : '✨ Study Guide Banao'}</button></div>
  `;
  wireStudyGuidePanel();
}
function wireStudyGuidePanel(){
  document.querySelectorAll('#aiStudyGuidePanel [data-sg-type]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const type = btn.getAttribute('data-sg-type');
      if(type===studyGuideType) return;
      studyGuideType = type;
      studyGuideChapter = studyGuideDefaultChapter(studyGuideType);
      renderStudyGuidePanel();
    });
  });
  const sel = document.getElementById('sgChapterSelect');
  if(sel) sel.addEventListener('change', ()=>{
    studyGuideChapter = sel.value;
    renderStudyGuidePanel();
  });
  const genBtn = document.getElementById('sgGenBtn');
  if(genBtn) genBtn.addEventListener('click', async ()=>{
    const forceRefresh = genBtn.getAttribute('data-sg-refresh')==='1';
    genBtn.textContent = '🧠 Ban raha hai…';
    genBtn.disabled = true;
    try{
      await getStudyGuideResult(studyGuideType, studyGuideChapter, forceRefresh);
      renderStudyGuidePanel();
    }catch(e){
      genBtn.textContent = '⚠️ Phir se try karo';
      genBtn.disabled = false;
      console.error('Study Guide box error:', e);
    }
  });
}

// ===== Search/filter for the Chapters + Revision lists =====
// Pure DOM filtering (no re-render) — hides non-matching .chapterRow nodes
// inside a panel and shows a small "no match" hint if everything is hidden.
// Re-applied after every render, so the current search stays live across
// count bumps, resets, and tab switches.
function filterRowsIn(panel, query){
  if(!panel) return false;
  let anyVisible = false;
  panel.querySelectorAll(':scope > .chapterRow').forEach(row=>{
    const nameEl = row.querySelector('.chName');
    const name = nameEl ? nameEl.textContent.toLowerCase() : '';
    const match = !query || name.includes(query);
    row.style.display = match ? '' : 'none';
    if(match) anyVisible = true;
  });
  return anyVisible;
}
function toggleEmptyMsg(panel, anyVisible, query){
  if(!panel) return;
  let emptyMsg = panel.querySelector(':scope > .chapterEmptyMsg');
  if(!anyVisible && query){
    if(!emptyMsg){
      emptyMsg = document.createElement('div');
      emptyMsg.className = 'chapterEmptyMsg';
      emptyMsg.textContent = '🔍 Koi chapter/topic match nahi mila.';
      panel.appendChild(emptyMsg);
    }
  } else if(emptyMsg){
    emptyMsg.remove();
  }
}
function applyChapterSearchFilter(){
  const input = document.getElementById('chapterSearchInput');
  const q = input ? input.value.trim().toLowerCase() : '';
  ['mathChapterList','englishChapterList'].forEach(id=>{
    const panel = document.getElementById(id);
    const anyVisible = filterRowsIn(panel, q);
    toggleEmptyMsg(panel, anyVisible, q);
  });
}
function applyRevisionSearchFilter(){
  const input = document.getElementById('revisionSearchInput');
  const q = input ? input.value.trim().toLowerCase() : '';
  ['revMathList','revEngList'].forEach(id=>{
    const panel = document.getElementById(id);
    const anyVisible = filterRowsIn(panel, q);
    toggleEmptyMsg(panel, anyVisible, q);
  });
  const gkEl = document.getElementById('revGkGroups');
  if(gkEl){
    let anyGkVisible = false;
    gkEl.querySelectorAll('details.gkGroup').forEach(det=>{
      const groupHasMatch = filterRowsIn(det.querySelector('.gkGroupPanel'), q);
      det.style.display = groupHasMatch ? '' : 'none';
      if(groupHasMatch) anyGkVisible = true;
      if(q && groupHasMatch) det.open = true;
    });
    toggleEmptyMsg(gkEl, anyGkVisible, q);
  }
}

// One row of the Revision Counter — a chapter/topic name, its all-time
// revision count, a small −1 (undo misclick) and a big ✅ +1 Revise button.
function renderRevisionRow(type, name){
  const isReadOnly = viewingName !== myName && !(canAdminEditViewed() && adminEditModeOn);
  const dis = isReadOnly ? 'disabled' : '';
  const count = revisionCount(type, name);
  return `
    <div class="chapterRow ${count===0?'neverRevised':'revised'}">
      <span class="chName">${count===0?'🆕 ':''}${escapeHtml(name)}</span>
      <span class="chCount">${count}</span>
      <button class="chBtn chMinus" data-rv-type="${type}" data-rv-name="${escapeHtml(name)}" data-rv-delta="-1" ${dis}>−1</button>
      <button class="chBtn chRevisePlus" data-rv-type="${type}" data-rv-name="${escapeHtml(name)}" data-rv-delta="1" ${dis}>✅ +1</button>
    </div>`;
}

// Puts the chapters/topics that need the most attention on top — least
// revised first (ties keep their original list order, thanks to Array.sort
// being a stable sort). This is what makes the Revision tab "important-wise
// ordered": no manual pinning needed, the ones that need it most just float
// to the top on their own as you revise the others.
function sortChaptersByImportance(type, names){
  return names
    .map((name, idx)=>({ name, idx, c: revisionCount(type, name) }))
    .sort((a,b)=> a.c-b.c || a.idx-b.idx)
    .map(x=>x.name);
}

// GK topics grouped under collapsible <details> sections (Geography, Ancient
// History, Polity, etc.) — plain HTML accordion, no extra JS needed to
// expand/collapse, since there are ~95 GK topics in total. Both the
// sections themselves AND the topics inside each section are sorted by
// importance (least revised first).
function renderGkGroups(){
  const sections = GK_SECTIONS.map(sec=>({
    section: sec.section,
    total: sec.topics.reduce((s,n)=>s+revisionCount('gk',n),0),
    topics: sortChaptersByImportance('gk', sec.topics)
  })).sort((a,b)=> a.total-b.total);

  return sections.map(sec=>{
    const rows = sec.topics.map(name=>renderRevisionRow('gk', name)).join('');
    const isOpen = openGkSections.has(sec.section) ? 'open' : '';
    return `<details class="gkGroup" data-gk-section="${escapeHtml(sec.section)}" ${isOpen}>
      <summary><span>${escapeHtml(sec.section)}</span><span class="gkGroupCount">${sec.total} revisions</span></summary>
      <div class="gkGroupPanel">${rows}</div>
    </details>`;
  }).join('');
}

function renderRevisionTab(){
  const mathEl = document.getElementById('revMathList');
  const engEl = document.getElementById('revEngList');
  const gkEl = document.getElementById('revGkGroups');
  const summaryEl = document.getElementById('revisionSummaryPanel');
  if(!mathEl || !engEl || !gkEl || !summaryEl) return;

  mathEl.innerHTML = sortChaptersByImportance('math', MATH_CHAPTERS).map(n=>renderRevisionRow('math', n)).join('');
  engEl.innerHTML = sortChaptersByImportance('english', ENGLISH_TOPICS).map(n=>renderRevisionRow('english', n)).join('');
  gkEl.innerHTML = renderGkGroups();

  const mathTotal = MATH_CHAPTERS.reduce((s,n)=>s+revisionCount('math',n),0);
  const engTotal = ENGLISH_TOPICS.reduce((s,n)=>s+revisionCount('english',n),0);
  const gkTotal = GK_SECTIONS.reduce((s,sec)=>s+sec.topics.reduce((s2,n)=>s2+revisionCount('gk',n),0),0);
  const grandTotal = mathTotal + engTotal + gkTotal;

  const mathTotalEl = document.getElementById('revMathTotal');
  const engTotalEl = document.getElementById('revEngTotal');
  const gkTotalEl = document.getElementById('revGkTotal');
  if(mathTotalEl) mathTotalEl.textContent = mathTotal;
  if(engTotalEl) engTotalEl.textContent = engTotal;
  if(gkTotalEl) gkTotalEl.textContent = gkTotal;

  const allChapters = [
    ...MATH_CHAPTERS.map(n=>({type:'Math', n, c:revisionCount('math', n)})),
    ...ENGLISH_TOPICS.map(n=>({type:'English', n, c:revisionCount('english', n)})),
    ...GK_SECTIONS.flatMap(sec=>sec.topics.map(n=>({type:'GK', n, c:revisionCount('gk', n)})))
  ];
  const totalChapterCount = allChapters.length;
  const neverRevisedCount = allChapters.filter(x=>x.c===0).length;
  const mostRevised = allChapters.slice().sort((a,b)=>b.c-a.c)[0];

  summaryEl.innerHTML = `
    <div class="bwrow"><span>Total Revisions (All Time)</span><span class="amt gain">${grandTotal}</span></div>
    <div class="bwrow"><span>Chapters Tracked</span><span>${totalChapterCount}</span></div>
    <div class="bwrow"><span>Not Revised Even Once</span><span class="amt ${neverRevisedCount>0?'loss':''}">${neverRevisedCount}</span></div>
    <div class="bwrow"><span>Most Revised</span><span>${mostRevised && mostRevised.c>0 ? escapeHtml(mostRevised.n)+' ('+mostRevised.type+', '+mostRevised.c+'x)' : '— abhi shuru karo'}</span></div>
  `;

  document.querySelectorAll('#revMathList .chBtn, #revEngList .chBtn, #revGkGroups .chBtn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const type = btn.getAttribute('data-rv-type');
      const name = btn.getAttribute('data-rv-name');
      const delta = parseInt(btn.getAttribute('data-rv-delta'));
      await bumpRevision(type, name, delta);
    });
  });

  document.querySelectorAll('#revGkGroups details.gkGroup').forEach(det=>{
    det.addEventListener('toggle', ()=>{
      const sec = det.getAttribute('data-gk-section');
      if(det.open) openGkSections.add(sec); else openGkSections.delete(sec);
    });
  });

  applyRevisionSearchFilter();
}

function renderChart(){
  const el = document.getElementById('walletChart');
  if(!el) return;
  const tn = activeUptoDay();
  const barW = 12, gap = 4, half = 80;
  const chartH = half*2, totalW = TOTAL_DAYS*(barW+gap);
  const maxVal = DAILY_TARGET;
  let bars = '';
  for(let i=1;i<=TOTAL_DAYS;i++){
    const x = (i-1)*(barW+gap);
    const d = getDay(i);
    const isFuture = i>tn;
    let earnedAmt=0, lostAmt=0, pendingAmt=0;
    if(!isFuture){
      const r = dayEarnLoss(d, i);
      earnedAmt = r.earned;
      lostAmt = r.lost;
      pendingAmt = r.pending||0;
    }
    const earnH = Math.max(0,(earnedAmt/maxVal)*half);
    const lostH = Math.max(0,(lostAmt/maxVal)*half);
    const pendH = Math.max(0,(pendingAmt/maxVal)*half);
    const gainColor = isFuture ? '#2a2a2a' : (d.rest ? '#555' : 'var(--gain)');
    const lossColor = isFuture ? '#2a2a2a' : (d.rest ? '#555' : 'var(--loss)');
    bars += `<rect x="${x}" y="${half-earnH}" width="${barW}" height="${earnH}" fill="${gainColor}" rx="2"></rect>`;
    bars += `<rect x="${x}" y="${half}" width="${barW}" height="${lostH}" fill="${lossColor}" rx="2"></rect>`;
    if(pendH>0){
      bars += `<rect x="${x}" y="${half+lostH}" width="${barW}" height="${pendH}" fill="#3a3a3a" rx="2"></rect>`;
    }
    if(i===tn){
      bars += `<rect x="${x-1.5}" y="1" width="${barW+3}" height="${chartH-2}" fill="none" stroke="var(--white)" stroke-width="1" stroke-dasharray="2,2" rx="3"></rect>`;
    }
  }
  el.innerHTML = `
    <svg width="${totalW}" height="${chartH}" viewBox="0 0 ${totalW} ${chartH}" style="display:block;">
      <line x1="0" y1="${half}" x2="${totalW}" y2="${half}" stroke="var(--border-strong)" stroke-width="1"></line>
      ${bars}
    </svg>
  `;
}

// Small reusable SVG line-chart builder (used by both the Accuracy Trend
// and Percentile Trend panels below) — takes {day, value} points on a
// fixed 0..100 scale and draws a connected line + dots + light gridlines,
// with every few day-labels along the bottom so it stays readable even
// when there are many mocks logged.
function buildLineChartSVG(points, opts){
  opts = opts || {};
  const h = opts.height || 120;
  const padTop=10, padBottom=18, padLeft=8, padRight=10;
  const plotH = h-padTop-padBottom;
  const w = Math.max(220, points.length*34);
  const minV = opts.min!==undefined ? opts.min : 0;
  const maxV = opts.max!==undefined ? opts.max : 100;
  const stepX = points.length>1 ? (w-padLeft-padRight)/(points.length-1) : 0;
  const xAt = i => padLeft + stepX*i;
  const yAt = v => padTop + plotH - ((v-minV)/((maxV-minV)||1))*plotH;
  const color = opts.color || 'var(--accent)';
  let path = '';
  points.forEach((p,i)=>{
    const x=xAt(i), y=yAt(p.value);
    path += (i===0?'M':'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
  });
  const dots = points.map((p,i)=>{
    const x=xAt(i), y=yAt(p.value);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"></circle>`;
  }).join('');
  const labelEvery = Math.max(1, Math.ceil(points.length/9));
  const labels = points.map((p,i)=>{
    if(i%labelEvery!==0 && i!==points.length-1) return '';
    return `<text x="${xAt(i).toFixed(1)}" y="${h-4}" font-size="8" fill="var(--muted)" text-anchor="middle">D${p.day}</text>`;
  }).join('');
  const gridlines = [0.25,0.5,0.75].map(f=>{
    const y = (padTop + plotH*(1-f)).toFixed(1);
    return `<line x1="${padLeft}" y1="${y}" x2="${w-padRight}" y2="${y}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2,2"></line>`;
  }).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;">
    ${gridlines}
    <path d="${path.trim()}" fill="none" stroke="${color}" stroke-width="2"></path>
    ${dots}
    ${labels}
  </svg>`;
}

// SSC CGL Tier-1 pattern: 4 sections x 25 questions = 100 total — used as
// the assumed denominator so a per-mock accuracy % can be derived directly
// from the subject-wise wrong-question counts already being logged.
const MOCK_TOTAL_QUESTIONS = 100;
function dayAccuracyPct(d){
  if(!(hasVal(d.mock.wrongMath)||hasVal(d.mock.wrongReasoning)||hasVal(d.mock.wrongEnglish)||hasVal(d.mock.wrongGk))) return null;
  const wrong = num(d.mock.wrongMath)+num(d.mock.wrongReasoning)+num(d.mock.wrongEnglish)+num(d.mock.wrongGk);
  const correct = Math.max(0, MOCK_TOTAL_QUESTIONS - wrong);
  return Math.round((correct/MOCK_TOTAL_QUESTIONS)*1000)/10;
}
function renderAccuracyTrend(){
  const el = document.getElementById('accuracyChart');
  const statsEl = document.getElementById('accuracyStats');
  if(!el) return;
  const tn = activeUptoDay();
  const points = [];
  let totalWrong=0, totalCorrect=0;
  for(let i=1;i<=tn;i++){
    const d = getDay(i);
    const acc = dayAccuracyPct(d);
    if(acc!==null){
      points.push({day:i, value:acc});
      const wrong = num(d.mock.wrongMath)+num(d.mock.wrongReasoning)+num(d.mock.wrongEnglish)+num(d.mock.wrongGk);
      totalWrong += wrong;
      totalCorrect += Math.max(0, MOCK_TOTAL_QUESTIONS-wrong);
    }
  }
  if(points.length===0){
    el.innerHTML = `<div class="guideNote">🎯 Wrong Questions section (Today tab → Full Mock) mein data daalo — yahan accuracy % trend dikhega.</div>`;
    if(statsEl) statsEl.innerHTML = '';
    return;
  }
  el.innerHTML = buildLineChartSVG(points, {color:'var(--gain)', min:0, max:100});
  const latest = points[points.length-1].value;
  const overallAcc = (totalCorrect+totalWrong)>0 ? Math.round((totalCorrect/(totalCorrect+totalWrong))*1000)/10 : 0;
  if(statsEl) statsEl.innerHTML = `
    <div class="bwrow"><span>Latest Mock Accuracy</span><span class="amt ${latest>=70?'gain':'loss'}">${latest}%</span></div>
    <div class="bwrow"><span>Overall Accuracy (${points.length} mocks)</span><span>${overallAcc}%</span></div>
    <div class="bwrow"><span>Total Right / Wrong</span><span><span style="color:var(--gain);font-weight:600;">${totalCorrect}</span> / <span style="color:var(--loss);font-weight:600;">${totalWrong}</span></span></div>
  `;
}
function renderPercentileTrend(){
  const el = document.getElementById('percentileChart');
  const statsEl = document.getElementById('percentileStats');
  if(!el) return;
  const tn = activeUptoDay();
  const points = [];
  for(let i=1;i<=tn;i++){
    const d = getDay(i);
    if(hasVal(d.mock.percentile)) points.push({day:i, value:num(d.mock.percentile)});
  }
  if(points.length===0){
    el.innerHTML = `<div class="guideNote">📈 Mock ke baad Percentile field (Today tab → Full Mock) bharo — yahan trend line dikhegi.</div>`;
    if(statsEl) statsEl.innerHTML = '';
    return;
  }
  el.innerHTML = buildLineChartSVG(points, {color:'var(--blue)', min:0, max:100});
  const latest = points[points.length-1].value;
  const first = points[0].value;
  const best = Math.max(...points.map(p=>p.value));
  const diff = Math.round((latest-first)*10)/10;
  const trendTag = diff>0 ? `🔺 +${diff} pehle mock se` : diff<0 ? `🔻 ${diff} pehle mock se` : `➡️ Pehle mock jitna hi`;
  if(statsEl) statsEl.innerHTML = `
    <div class="bwrow"><span>Latest Percentile</span><span>${latest}</span></div>
    <div class="bwrow"><span>Best Percentile</span><span>${best}</span></div>
    <div class="bwrow"><span>Trend (${points.length} mocks)</span><span>${trendTag}</span></div>
  `;
}

// dayMockTotal() (Math+Reasoning+English+GK total for one day) is defined
// in the Long-Term Analysis section further below — JS function hoisting
// means it's available here too, so it isn't redefined.
function renderMockScoreTrend(){
  const el = document.getElementById('mockScoreChart');
  const statsEl = document.getElementById('mockScoreStats');
  if(!el) return;
  const tn = activeUptoDay();
  const points = [];
  for(let i=1;i<=tn;i++){
    const tot = dayMockTotal(getDay(i));
    if(tot!==null) points.push({day:i, value:tot});
  }
  if(points.length===0){
    el.innerHTML = `<div class="guideNote">🧪 Full Mock ke subject-wise marks daalo (Today tab) — yahan total marks ka trend line dikhegi.</div>`;
    if(statsEl) statsEl.innerHTML = '';
    return;
  }
  const maxV = Math.max(10, Math.ceil(Math.max(...points.map(p=>p.value))*1.15));
  el.innerHTML = buildLineChartSVG(points, {color:'var(--orange)', min:0, max:maxV});
  const latest = points[points.length-1].value;
  const best = Math.max(...points.map(p=>p.value));
  const avg = points.reduce((a,p)=>a+p.value,0)/points.length;
  const first = points[0].value;
  const diff = Math.round((latest-first)*10)/10;
  const trendTag = diff>0 ? `🔺 +${diff} pehle mock se` : diff<0 ? `🔻 ${diff} pehle mock se` : `➡️ Pehle mock jitna hi`;
  if(statsEl) statsEl.innerHTML = `
    <div class="bwrow"><span>Latest Total</span><span>${latest}</span></div>
    <div class="bwrow"><span>Best Total</span><span>${best}</span></div>
    <div class="bwrow"><span>Avg Total (${points.length} mocks)</span><span>${avg.toFixed(1)}</span></div>
    <div class="bwrow"><span>Trend</span><span>${trendTag}</span></div>
  `;
}
// Reusable multi-series SVG line-chart builder (Subject-Wise Progress Chart)
// — same visual language as buildLineChartSVG, but draws one path per
// series over a shared set of x-axis day slots. A series simply skips
// (breaks the line) on any day where its valueFor() returns null.
function buildMultiLineChartSVG(daysList, series, opts){
  opts = opts || {};
  const h = opts.height || 140;
  const padTop=10, padBottom=18, padLeft=8, padRight=10;
  const plotH = h-padTop-padBottom;
  const w = Math.max(240, daysList.length*30);
  const minV = opts.min!==undefined ? opts.min : 0;
  const maxV = opts.max!==undefined ? opts.max : 100;
  const stepX = daysList.length>1 ? (w-padLeft-padRight)/(daysList.length-1) : 0;
  const xAt = i => padLeft + stepX*i;
  const yAt = v => padTop + plotH - ((v-minV)/((maxV-minV)||1))*plotH;
  const gridlines = [0.25,0.5,0.75].map(f=>{
    const y=(padTop+plotH*(1-f)).toFixed(1);
    return `<line x1="${padLeft}" y1="${y}" x2="${w-padRight}" y2="${y}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2,2"></line>`;
  }).join('');
  const labelEvery = Math.max(1, Math.ceil(daysList.length/9));
  const labels = daysList.map((day,i)=>{
    if(i%labelEvery!==0 && i!==daysList.length-1) return '';
    return `<text x="${xAt(i).toFixed(1)}" y="${h-4}" font-size="8" fill="var(--muted)" text-anchor="middle">D${day}</text>`;
  }).join('');
  const seriesSvg = series.map(s=>{
    let path='', started=false; const dots=[];
    daysList.forEach((day,i)=>{
      const v = s.valueFor(day);
      if(v===null || v===undefined){ started=false; return; }
      const x=xAt(i), y=yAt(v);
      path += (!started?'M':'L') + x.toFixed(1)+','+y.toFixed(1)+' ';
      started = true;
      dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="${s.color}"></circle>`);
    });
    return `<path d="${path.trim()}" fill="none" stroke="${s.color}" stroke-width="2"></path>${dots.join('')}`;
  }).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;">
    ${gridlines}
    ${seriesSvg}
    ${labels}
  </svg>`;
}
function renderSubjectProgressChart(){
  const el = document.getElementById('subjectProgressChart');
  const legendEl = document.getElementById('subjectProgressLegend');
  if(!el) return;
  const tn = activeUptoDay();
  const daysList = [];
  for(let i=1;i<=tn;i++){
    const d = getDay(i);
    if(hasVal(d.mock.math)||hasVal(d.mock.reasoning)||hasVal(d.mock.english)||hasVal(d.mock.gk)) daysList.push(i);
  }
  if(daysList.length===0){
    el.innerHTML = `<div class="guideNote">📚 Full Mock ke Math/Reasoning/English/GK marks daalo — yahan har subject ka alag progress line dikhegi.</div>`;
    if(legendEl) legendEl.innerHTML = '';
    return;
  }
  const series = [
    {key:'math', label:'Math', color:'var(--blue)'},
    {key:'reasoning', label:'Reasoning', color:'var(--pink)'},
    {key:'english', label:'English', color:'var(--purple)'},
    {key:'gk', label:'GK', color:'var(--accent)'},
  ].map(s=> Object.assign({}, s, { valueFor: (day)=>{ const v = getDay(day).mock[s.key]; return hasVal(v) ? num(v) : null; } }));
  let maxV = 10;
  daysList.forEach(day=> series.forEach(s=>{ const v=s.valueFor(day); if(v!==null) maxV=Math.max(maxV,v); }));
  maxV = Math.ceil(maxV*1.15);
  el.innerHTML = buildMultiLineChartSVG(daysList, series, {min:0, max:maxV});
  if(legendEl) legendEl.innerHTML = series.map(s=>
    `<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color};margin-right:4px;"></span>${s.label}</span>`
  ).join('');
}
function renderSectionalVsFullCompare(){
  const el = document.getElementById('sectVsFullCompare');
  if(!el) return;
  const tn = activeUptoDay();
  let fullRight=0, fullWrong=0, fullMarksSum=0, fullCount=0;
  let sectRight=0, sectWrong=0, sectMarksSum=0, sectCount=0;
  for(let i=1;i<=tn;i++){
    const d = getDay(i);
    if(hasVal(d.mock.wrongMath)||hasVal(d.mock.wrongReasoning)||hasVal(d.mock.wrongEnglish)||hasVal(d.mock.wrongGk)){
      const wrong = num(d.mock.wrongMath)+num(d.mock.wrongReasoning)+num(d.mock.wrongEnglish)+num(d.mock.wrongGk);
      fullWrong += wrong;
      fullRight += Math.max(0, MOCK_TOTAL_QUESTIONS-wrong);
    }
    const tot = dayMockTotal(d);
    if(tot!==null){ fullMarksSum += tot; fullCount++; }
    Object.keys(d.sect).forEach(k=>{
      const sd = d.sectDetail && d.sectDetail[k];
      if(sd && (hasVal(sd.right)||hasVal(sd.wrong))){
        sectRight += num(sd.right);
        sectWrong += num(sd.wrong);
      }
    });
    const sectKeys = Object.keys(d.sect);
    if(sectKeys.some(k=>hasVal(d.sect[k]))){
      sectMarksSum += sectKeys.reduce((s,k)=>s+num(d.sect[k]),0);
      sectCount++;
    }
  }
  const fullAcc = (fullRight+fullWrong)>0 ? (fullRight/(fullRight+fullWrong))*100 : null;
  const sectAcc = (sectRight+sectWrong)>0 ? (sectRight/(sectRight+sectWrong))*100 : null;
  if(fullAcc===null && sectAcc===null && fullCount===0 && sectCount===0){
    el.innerHTML = `<div class="guideNote">⚖️ Full Mock aur Sectional dono mein Right/Wrong ya Score daalo — yahan side-by-side comparison dikhega.</div>`;
    return;
  }
  function bar(label, val, color){
    const pct = val===null ? 0 : Math.round(val);
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px;"><span>${label}</span><span>${val===null?'—':pct+'%'}</span></div>
      <div style="background:var(--border);border-radius:6px;height:10px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${color};"></div></div>
    </div>`;
  }
  el.innerHTML = `
    ${bar('🧪 Full Mock Accuracy', fullAcc, 'var(--gain)')}
    ${bar('🔢 Sectional Accuracy', sectAcc, 'var(--blue)')}
    <div class="bwrow"><span>Full Mock avg total marks (${fullCount})</span><span>${fullCount ? (fullMarksSum/fullCount).toFixed(1) : '—'}</span></div>
    <div class="bwrow"><span>Sectional avg total marks (${sectCount})</span><span>${sectCount ? (sectMarksSum/sectCount).toFixed(1) : '—'}</span></div>
  `;
}
function renderWeakChapterInsight(){
  const el = document.getElementById('weakChapterInsight');
  if(!el) return;
  const mathRows = MATH_CHAPTERS.map(n=>({n,c:chapterCount('math',n)})).filter(r=>r.c>0).sort((a,b)=>b.c-a.c).slice(0,3);
  const engRows = ENGLISH_TOPICS.map(n=>({n,c:chapterCount('english',n)})).filter(r=>r.c>0).sort((a,b)=>b.c-a.c).slice(0,3);
  if(mathRows.length===0 && engRows.length===0){
    el.innerHTML = `<div class="guideNote">🎯 Chapter Mistake Quick-Log (Today ya Mock tab) use karo — yahan sabse weak chapters/topics ranked dikhenge.</div>`;
    return;
  }
  const mathHtml = mathRows.length ? `<div style="margin-bottom:8px;"><div style="font-size:12.5px;font-weight:600;color:var(--text);margin-bottom:2px;">🧮 Weakest Math Chapters</div>${mathRows.map((r,idx)=>`<div class="bwrow"><span>${idx+1}. ${escapeHtml(r.n)}</span><span class="amt loss">${r.c} wrong</span></div>`).join('')}</div>` : '';
  const engHtml = engRows.length ? `<div><div style="font-size:12.5px;font-weight:600;color:var(--text);margin-bottom:2px;">🔤 Weakest English Topics</div>${engRows.map((r,idx)=>`<div class="bwrow"><span>${idx+1}. ${escapeHtml(r.n)}</span><span class="amt loss">${r.c} wrong</span></div>`).join('')}</div>` : '';
  el.innerHTML = mathHtml + engHtml;
}
function renderStudyUtilization(){
  const chartEl = document.getElementById('studyUtilChart');
  const statsEl = document.getElementById('studyUtilStats');
  if(!chartEl) return;
  const tn = activeUptoDay();
  const totalPossible = TASK_DURATIONS_MIN.reduce((a,b)=>a+b,0);
  const points = [];
  let sumMins=0, countedDays=0, bestDay=null;
  for(let i=1;i<=tn;i++){
    const d = getDay(i);
    if(d.rest) continue;
    if(!isDayTouched(d)) continue;
    const mins = dayStudyMinutes(d);
    points.push({day:i, value: mins/60});
    sumMins += mins; countedDays++;
    if(!bestDay || mins>bestDay.mins) bestDay = {day:i, mins};
  }
  if(points.length===0){
    chartEl.innerHTML = `<div class="guideNote"><span class="icoClock" aria-hidden="true"></span> Tasks tick karo (Today tab) — yahan roz ka study-time aur utilization % dikhega.</div>`;
    if(statsEl) statsEl.innerHTML = '';
    return;
  }
  const maxHrs = Math.max(2, Math.ceil((totalPossible/60)*1.1));
  chartEl.innerHTML = buildLineChartSVG(points, {color:'var(--purple)', min:0, max:maxHrs});
  const avgMins = sumMins/countedDays;
  const utilPct = totalPossible>0 ? Math.round((avgMins/totalPossible)*100) : 0;
  if(statsEl) statsEl.innerHTML = `
    <div class="bwrow"><span>Total Study Time (all-time)</span><span>${fmtHours(sumMins)}</span></div>
    <div class="bwrow"><span>Daily Avg</span><span>${fmtHours(avgMins)}</span></div>
    <div class="bwrow"><span>Utilization (avg vs full daily plan)</span><span class="amt ${utilPct>=70?'gain':'loss'}">${utilPct}%</span></div>
    <div class="bwrow"><span>Most Productive Day</span><span>Day ${bestDay.day} (${fmtHours(bestDay.mins)})</span></div>
  `;
}

// ===== Long-Term Analysis (combined mock-avg trend across every target,
// past + current) =====
// archiveCurrentCycleIfAny() (see above, near applyTargetSettings) already
// guarantees old targets never get deleted — every time a new target is
// set, the just-finished cycle's full day-by-day data gets pushed into
// state.__history and stays there forever, no matter how many new targets
// get started after it. This section just reads ALL of it back out again
// (every past cycle in state.__history + whatever's live in the current
// cycle right now) and stitches it into one continuous trend, so progress
// across attempts is visible, not just progress within the current one.
function collectAllCycles(){
  const hist = Array.isArray(state.__history) ? state.__history : [];
  const cycles = hist.map(cyc=>({
    startDate: cyc.startDate || '0000-00-00',
    totalDays: cyc.totalDays || 0,
    isCurrent: false,
    getDayData: (n)=> (cyc.days ? cyc.days[String(n)] : null)
  }));
  // The ongoing/current cycle — read straight from live state so today's
  // entries show up immediately, even before the next target archives it.
  cycles.push({
    startDate: (state.__target && state.__target.startDate) || fmtISODate(START_DATE),
    totalDays: TOTAL_DAYS,
    isCurrent: true,
    getDayData: (n)=> getDay(n)
  });
  cycles.sort((a,b)=> a.startDate.localeCompare(b.startDate));
  return cycles.map((c,i)=>({ ...c, label: `Target ${i+1}` + (c.isCurrent ? ' (Current)' : '') }));
}
function dayMockTotal(dayObj){
  if(!dayObj || !dayObj.mock) return null;
  const m = dayObj.mock;
  if(!(hasVal(m.math)||hasVal(m.reasoning)||hasVal(m.english)||hasVal(m.gk))) return null;
  return num(m.math)+num(m.reasoning)+num(m.english)+num(m.gk);
}
// Same look as buildLineChartSVG, plus a dashed marker + label at the start
// of every new target so it's visually clear where one cycle ends and the
// next begins inside the combined line.
function buildCycleTrendSVG(points, boundaries, opts){
  opts = opts || {};
  const h = opts.height || 130;
  const padTop=16, padBottom=18, padLeft=8, padRight=10;
  const plotH = h-padTop-padBottom;
  const w = Math.max(260, points.length*22);
  const vals = points.map(p=>p.value);
  const minV = 0;
  const maxV = Math.max(10, Math.ceil(Math.max(...vals)*1.15));
  const stepX = points.length>1 ? (w-padLeft-padRight)/(points.length-1) : 0;
  const xAt = i => padLeft + stepX*i;
  const yAt = v => padTop + plotH - ((v-minV)/((maxV-minV)||1))*plotH;
  const color = opts.color || 'var(--accent)';
  let path = '';
  points.forEach((p,i)=>{
    const x=xAt(i), y=yAt(p.value);
    path += (i===0?'M':'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
  });
  const dots = points.map((p,i)=>{
    const x=xAt(i), y=yAt(p.value);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"></circle>`;
  }).join('');
  const gridlines = [0.25,0.5,0.75].map(f=>{
    const y=(padTop+plotH*(1-f)).toFixed(1);
    return `<line x1="${padLeft}" y1="${y}" x2="${w-padRight}" y2="${y}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2,2"></line>`;
  }).join('');
  const boundaryMarks = boundaries.map(b=>{
    const x = xAt(b.idx).toFixed(1);
    const line = b.idx>0 ? `<line x1="${x}" y1="${padTop-8}" x2="${x}" y2="${h-padBottom}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3,2" opacity="0.55"></line>` : '';
    return `${line}<text x="${x}" y="${padTop-8}" font-size="7.5" fill="var(--accent)" text-anchor="${b.idx===0?'start':'middle'}" font-weight="700">${b.label}</text>`;
  }).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;">
    ${gridlines}
    ${boundaryMarks}
    <path d="${path.trim()}" fill="none" stroke="${color}" stroke-width="2"></path>
    ${dots}
  </svg>`;
}
function renderLongTermAnalysis(){
  const chartEl = document.getElementById('longTermChart');
  const statsEl = document.getElementById('longTermStats');
  const summaryEl = document.getElementById('longTermCycleSummary');
  if(!chartEl) return;
  const cycles = collectAllCycles();
  const points = [];
  const boundaries = [];
  const perCycle = [];
  cycles.forEach(cyc=>{
    boundaries.push({ idx: points.length, label: cyc.label.replace('Target ','T') });
    let sum=0, count=0, best=0;
    for(let n=1;n<=cyc.totalDays;n++){
      const tot = dayMockTotal(cyc.getDayData(n));
      if(tot!==null){
        points.push({ value: tot });
        sum += tot; count++; if(tot>best) best=tot;
      }
    }
    perCycle.push({ label: cyc.label, count, avg: count ? sum/count : null, best, startDate: cyc.startDate, totalDays: cyc.totalDays });
  });
  if(points.length===0){
    chartEl.innerHTML = `<div class="guideNote">🎯 Mocks log karte hi yahan combined mock-avg trend dikhega — purana data kabhi delete nahi hota.</div>`;
    if(statsEl) statsEl.innerHTML = '';
    if(summaryEl) summaryEl.innerHTML = '';
    return;
  }
  chartEl.innerHTML = buildCycleTrendSVG(points, boundaries, {color:'var(--accent)'});
  const allAvg = points.reduce((s,p)=>s+p.value,0)/points.length;
  const allBest = Math.max(...points.map(p=>p.value));
  const completed = perCycle.filter(c=>c.count>0);
  let trendTag = '—';
  if(completed.length>=2){
    const last = completed[completed.length-1], prev = completed[completed.length-2];
    const diff = Math.round((last.avg-prev.avg)*10)/10;
    trendTag = diff>0 ? `🔺 +${diff} pichle target se` : diff<0 ? `🔻 ${diff} pichle target se` : `➡️ Pichle target jitna hi`;
  }
  if(statsEl) statsEl.innerHTML = `
    <div class="bwrow"><span>Total Targets Attempted</span><span>${cycles.length}</span></div>
    <div class="bwrow"><span>Total Mocks (all-time)</span><span>${points.length}</span></div>
    <div class="bwrow"><span>All-Time Avg Mock Score</span><span>${allAvg.toFixed(1)}</span></div>
    <div class="bwrow"><span>All-Time Best Mock</span><span>${allBest}</span></div>
    <div class="bwrow"><span>Latest vs Previous Target</span><span>${trendTag}</span></div>
  `;
  if(summaryEl){
    summaryEl.innerHTML = perCycle.map(c=>`
      <div class="lossrow">
        <span class="lday">${c.label} <span style="color:var(--muted);font-weight:600;">(${c.startDate} · ${c.totalDays}d)</span></span>
        <span class="lamt" style="color:var(--accent);">${c.count ? `${c.avg.toFixed(1)} avg · ${c.count} mocks` : 'no mocks'}</span>
      </div>
    `).join('');
  }
}

function renderLossLog(){
  const el = document.getElementById('lossLog');
  if(!el) return;
  const tn = activeUptoDay();
  let rows = [];
  for(let i=1;i<=tn;i++){
    const d = getDay(i);
    if(d.rest) continue;
    const done = d.tasks.filter(Boolean).length;
    const missed = TASKS.length-done;
    if(missed<=0) continue;
    const r = dayEarnLoss(d, i);
    if(r.lost<=0) continue;
    rows.push({ day:i, missed, lostAmt:r.lost });
  }
  if(rows.length===0){
    el.innerHTML = `<div class="losshint">🎉 Abhi tak koi loss nahi — sab tasks poore ho rahe hain!</div>`;
    return;
  }
  rows.sort((a,b)=> b.lostAmt-a.lostAmt || b.day-a.day);
  const shown = rows.slice(0,10);
  el.innerHTML = shown.map(r=>`
    <div class="lossrow">
      <span class="lday">📉 Day ${r.day} <span style="color:var(--muted);font-weight:600;">(${fmtDate(r.day)})</span> · ${r.missed} miss</span>
      <span class="lamt">-₹${Math.round(r.lostAmt).toLocaleString('en-IN')}</span>
    </div>
  `).join('') + (rows.length>10 ? `<div class="losshint">+ ${rows.length-10} aur din pending hai list mein…</div>` : '');
}

function renderMistakesLog(){
  const el = document.getElementById('mistakesLog');
  if(!el) return;
  const tn = activeUptoDay();
  let rows = [];
  for(let i=tn;i>=1;i--){
    const d = getDay(i);
    if(d.mistakes && d.mistakes.trim()){
      rows.push({ day:i, text:d.mistakes.trim() });
    }
  }
  if(rows.length===0){
    el.innerHTML = `<div class="losshint">Koi mistake note nahi — Day panel ke "🤦 Silly Mistakes" box mein likho.</div>`;
    return;
  }
  const shown = rows.slice(0,15);
  el.innerHTML = shown.map(r=>`
    <div class="lossrow" style="flex-direction:column;align-items:flex-start;gap:3px;">
      <span class="lday">🤦 Day ${r.day} <span style="color:var(--muted);font-weight:600;">(${fmtDate(r.day)})</span></span>
      <span style="font-size:12.5px;color:var(--text);font-weight:600;white-space:pre-wrap;word-break:break-word;">${escapeHtml(r.text)}</span>
    </div>
  `).join('') + (rows.length>15 ? `<div class="losshint">+ ${rows.length-15} aur purani entries hain (upar 15 sabse recent hain).</div>` : '');
}

function renderBestWorst(){
  const el = document.getElementById('bestWorst');
  if(!el) return;
  const tn = activeUptoDay();
  let best=null, worst=null;
  for(let i=1;i<=tn;i++){
    const d = getDay(i);
    if(d.rest) continue;
    const done = d.tasks.filter(Boolean).length;
    if(done===0 && i===tn) continue;
    const r = dayEarnLoss(d, i);
    const net = r.earned - r.lost;
    if(!best || net>best.net) best = {day:i, net, done};
    if(!worst || net<worst.net) worst = {day:i, net, done};
  }
  if(!best){
    el.innerHTML = `<div class="bwrow"><span class="tag">Abhi data nahi hai — aaj ke tasks complete karo!</span></div>`;
    return;
  }
  el.innerHTML = `
    <div class="bwrow"><span>🏆 Best Day — Day ${best.day} (${fmtDate(best.day)})</span><span class="amt gain">+₹${Math.round(best.net).toLocaleString('en-IN')}</span></div>
    <div class="bwrow"><span>😓 Toughest Day — Day ${worst.day} (${fmtDate(worst.day)})</span><span class="amt ${worst.net<0?'loss':'gain'}">${worst.net<0?'-':'+'}₹${Math.abs(Math.round(worst.net)).toLocaleString('en-IN')}</span></div>
  `;
}

function exportCSV(){
  // Sectional columns are now dynamic (Part 2: "Add More") — find the
  // highest section number ever used across all days so the CSV has enough
  // "SecN" columns for everyone, blank where a given day didn't go that far.
  let maxSecN = 4;
  for(let i=1;i<=TOTAL_DAYS;i++){
    Object.keys(getDay(i).sect).forEach(k=>{
      const m = /^s(\d+)$/.exec(k);
      if(m) maxSecN = Math.max(maxSecN, parseInt(m[1],10));
    });
  }
  const secHeaders = [];
  for(let n=1;n<=maxSecN;n++) secHeaders.push('Sec'+n);
  const header = ['Day','Date','Rest Day','Tasks Done','Total Tasks','Math','Reasoning','English','GK','Percentile','Mock Total','Wrong Math','Wrong Reasoning','Wrong English','Wrong GK','Wrong Total',...secHeaders,'Sec Total','Earned (₹)','Lost (₹)','Pending (₹)','Notes','Silly Mistakes'];
  const rows = [header];
  for(let i=1;i<=TOTAL_DAYS;i++){
    const d = getDay(i);
    const done = d.tasks.filter(Boolean).length;
    const mockTotal = num(d.mock.math)+num(d.mock.reasoning)+num(d.mock.english)+num(d.mock.gk);
    const wrongTotal = num(d.mock.wrongMath)+num(d.mock.wrongReasoning)+num(d.mock.wrongEnglish)+num(d.mock.wrongGk);
    const sectTotal = Object.keys(d.sect).reduce((s,k)=>s+num(d.sect[k]),0);
    const secVals = [];
    for(let n=1;n<=maxSecN;n++) secVals.push(d.sect['s'+n] !== undefined ? d.sect['s'+n] : '');
    const r = dayEarnLoss(d, i);
    rows.push([i, fmtDate(i), d.rest?'Yes':'No', done, TASKS.length, d.mock.math, d.mock.reasoning, d.mock.english, d.mock.gk, d.mock.percentile, mockTotal, d.mock.wrongMath, d.mock.wrongReasoning, d.mock.wrongEnglish, d.mock.wrongGk, wrongTotal, ...secVals, sectTotal, Math.round(r.earned), Math.round(r.lost), Math.round(r.pending||0), (d.notes||''), (d.mistakes||'')]);
  }
  rows.push([]);
  rows.push(['Math Chapter','Wrong Count']);
  MATH_CHAPTERS.forEach(name=> rows.push([name, chapterCount('math', name)]));
  rows.push([]);
  rows.push(['English Topic','Wrong Count']);
  ENGLISH_TOPICS.forEach(name=> rows.push([name, chapterCount('english', name)]));
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'cgl_tracker_' + (viewingName||'me').replace(/[^a-z0-9]/gi,'_') + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderStudyHours(){
  const todayEl = document.getElementById('statHoursToday');
  const totalEl = document.getElementById('statHoursTotal');
  const avgEl = document.getElementById('statHoursAvg');
  if(!todayEl) return;

  const dSel = getDay(selectedDay);
  todayEl.textContent = dSel.rest ? '😴 Rest' : fmtHours(dayStudyMinutes(dSel));

  const tn = activeUptoDay();
  let totalMins = 0, countedDays = 0;
  for(let i=1;i<=tn;i++){
    const d = getDay(i);
    if(d.rest) continue;
    if(!isDayTouched(d)) continue;
    totalMins += dayStudyMinutes(d);
    countedDays++;
  }
  totalEl.textContent = fmtHours(totalMins);
  avgEl.textContent = countedDays ? fmtHours(totalMins/countedDays) : '0m';
}

function renderWeekly(){
  const wrap = document.getElementById('weekWrap');
  let html='';
  for(let start=1; start<=TOTAL_DAYS; start+=7){
    const end = Math.min(start+6, TOTAL_DAYS);
    let completed=0, possible=0;
    let mockSum=0, mockCount=0, wrongSum=0, studyMins=0;
    let anyTouched=false;
    for(let i=start;i<=end;i++){
      const d = getDay(i);
      if(isDayTouched(d)) anyTouched = true;
      if(d.rest) continue;
      completed += d.tasks.filter(Boolean).length;
      possible += TASKS.length;
      const mTot = num(d.mock.math)+num(d.mock.reasoning)+num(d.mock.english)+num(d.mock.gk);
      if(hasVal(d.mock.math)||hasVal(d.mock.reasoning)||hasVal(d.mock.english)||hasVal(d.mock.gk)){
        mockSum += mTot; mockCount++;
      }
      wrongSum += num(d.mock.wrongMath)+num(d.mock.wrongReasoning)+num(d.mock.wrongEnglish)+num(d.mock.wrongGk);
      if(isDayTouched(d)) studyMins += dayStudyMinutes(d);
    }
    const pct = possible ? Math.round((completed/possible)*100) : 0;
    const wname = 'Week ' + Math.ceil(start/7);
    html += `
      <div class="weekrow">
        <div>
          <div class="wname">${wname}</div>
          <div class="wrange">Day ${start}–${end} (${fmtDate(start)} to ${fmtDate(end)})</div>
        </div>
        <div class="wpct">${possible? pct+'%' : '—'}</div>
      </div>
    `;
    if(anyTouched){
      html += `
        <div class="weekstat">
          <span>🧪 Mock avg: ${mockCount ? (mockSum/mockCount).toFixed(1) : '—'}${mockCount ? ' ('+mockCount+')' : ''}</span>
          <span>❌ Wrong: ${wrongSum}</span>
          <span><span class="icoClock" aria-hidden="true"></span> ${fmtHours(studyMins)}</span>
        </div>
      `;
    }
  }
  wrap.innerHTML = html;
}

// Every task's colour tier is driven purely by its own minutes (bigger
// block = bigger ₹, bigger pop of colour) — same rule the checklist uses.
function tierForMins(mins){
  if(mins >= 80) return { emoji:'🟡', cls:'tier-large' };
  if(mins <= 35) return { emoji:'🔵', cls:'tier-small' };
  return { emoji:'🟣', cls:'tier-medium' };
}
// ===== Task Mode: Individual vs Admin-Shared =====
// Two-option control, visible in the Today tab's "Customize Tasks" section:
//  1) "Har member apna task khud kare" — unchanged, existing behaviour.
//  2) "Mera (Admin) task list sabke liye automatic apply ho" — Admin's list
//     is broadcast to the whole room and kept in sync automatically.
// Only shown (with controls) to the room's Admin; everyone else in a room
// sees a one-line status instead. Solo (no room) users see nothing — the
// concept only applies once there's more than one member to sync.
function renderTaskModeSelector(){
  const el = document.getElementById('taskModeSelector');
  if(!el) return;
  if(!getRoomCode()){
    el.innerHTML = '';
    return;
  }
  const mode = currentRoomTaskMode;
  if(!isMeAdmin()){
    el.innerHTML = mode==='shared'
      ? `<div class="losshint" style="padding-top:0;">🔒 Admin (<b>${escapeHtml(currentRoomAdmin||'')}</b>) ne sabke liye same tasks set kiye hain — automatically sync hote rehte hain.</div>`
      : `<div class="losshint" style="padding-top:0;"><span class="icoEdit" aria-hidden="true"></span> Abhi har member (tum bhi) apne tasks khud customize kar sakte ho.</div>`;
    return;
  }
  el.innerHTML = `
    <div class="taskModeBox">
      <div class="taskModeTitle">👑 Task Mode</div>
      <label class="taskModeOption">
        <input type="radio" name="taskModeRadio" value="individual" ${mode==='individual'?'checked':''}>
        <span>Har member apna task khud kare (individual)</span>
      </label>
      <label class="taskModeOption">
        <input type="radio" name="taskModeRadio" value="shared" ${mode==='shared'?'checked':''}>
        <span>Mera (Admin) task list sabke liye automatic apply ho</span>
      </label>
    </div>
  `;
  el.querySelectorAll('input[name="taskModeRadio"]').forEach(r=>{
    r.addEventListener('change', async ()=>{
      const newMode = r.value;
      el.querySelectorAll('input[name="taskModeRadio"]').forEach(x=> x.disabled = true);
      await setRoomTaskMode(newMode);
      currentRoomTaskMode = newMode;
      if(newMode==='shared'){
        // Admin's current task list becomes the shared baseline immediately,
        // so every other member picks it up on their very next sync tick.
        const defs = TASKS.map((name,i)=>({ name, start: TASK_START_MIN[i], duration: TASK_DURATIONS_MIN[i] }));
        await saveSharedTaskDefs(defs);
        lastAppliedSharedTasksJSON = JSON.stringify(defs);
      } else {
        lastAppliedSharedTasksJSON = null;
      }
      renderTaskModeSelector();
      renderTaskEditForm();
    });
  });
}
function renderTaskEditForm(){
  const form = document.getElementById('taskEditForm');
  if(!form) return;
  const actionsRow = document.getElementById('taskEditActionsRow');
  // Shared Task Mode + not the Admin: tasks come from the Admin automatically,
  // so this member's own edit form is replaced by a read-only list and the
  // add/save/reset buttons are hidden — there's nothing here for them to save.
  if(isSharedTaskMode() && !isMeAdmin()){
    if(actionsRow) actionsRow.style.display = 'none';
    form.innerHTML = `<div class="losshint" style="padding-top:0;margin-bottom:10px;">🔒 Admin (<b>${escapeHtml(currentRoomAdmin||'')}</b>) ne sabke liye same tasks set kiye hain — edit lock hai, Admin badlega to yahan automatically update hoga.</div>` +
      TASKS.map((name,idx)=>{
        const tier = tierForMins(TASK_DURATIONS_MIN[idx]||0);
        return `
        <div class="taskEditRow" data-row-idx="${idx}">
          <div class="taskEditTop">
            <span class="tNum">${idx+1}.</span>
            <span style="flex:1;font-size:13.5px;font-weight:600;">${escapeHtml(name)}</span>
          </div>
          <div class="taskEditBottom">
            <span style="font-size:12px;color:var(--muted);">⏰ ${minToTimeInputStr(TASK_START_MIN[idx])}</span>
            <span style="font-size:12px;color:var(--muted);"><span class="icoClock" aria-hidden="true"></span> ${TASK_DURATIONS_MIN[idx]} min</span>
            <span class="tVal ${tier.cls}">${tier.emoji} ₹${Math.round(TASK_VALUES[idx]||0)}</span>
          </div>
        </div>`;
      }).join('');
    return;
  }
  if(actionsRow) actionsRow.style.display = '';
  if(!taskEditDraft){
    taskEditDraft = TASKS.map((name,i)=>({
      name, start: TASK_START_MIN[i], duration: TASK_DURATIONS_MIN[i]
    }));
  }
  const draftValues = computeTaskValues(taskEditDraft.map(t=>t.duration||1));
  form.innerHTML = taskEditDraft.map((t, idx)=>{
    const tier = tierForMins(t.duration||0);
    return `
    <div class="taskEditRow" data-row-idx="${idx}">
      <div class="taskEditTop">
        <span class="tNum">${idx+1}.</span>
        <input type="text" class="teName" data-task-idx="${idx}" value="${String(t.name).replace(/"/g,'&quot;')}">
        <button class="teDel" data-task-idx="${idx}" title="Ye task hatao" ${taskEditDraft.length<=1?'disabled':''}>✕</button>
      </div>
      <div class="taskEditBottom">
        <label>⏰ Start<input type="time" class="teStart" data-task-idx="${idx}" value="${minToTimeInputStr(t.start)}"></label>
        <label><span class="icoClock" aria-hidden="true"></span> Mins<input type="number" class="teDur" data-task-idx="${idx}" min="5" step="5" value="${t.duration}"></label>
        <span class="tVal ${tier.cls}" data-val-idx="${idx}">${tier.emoji} ₹${Math.round(draftValues[idx])}</span>
      </div>
    </div>
  `;}).join('');

  form.querySelectorAll('.teName').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const idx = parseInt(inp.getAttribute('data-task-idx'));
      taskEditDraft[idx].name = inp.value;
    });
  });
  form.querySelectorAll('.teStart').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      const idx = parseInt(inp.getAttribute('data-task-idx'));
      const v = timeInputStrToMin(inp.value);
      if(v!==null) taskEditDraft[idx].start = v;
    });
  });
  form.querySelectorAll('.teDur').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const idx = parseInt(inp.getAttribute('data-task-idx'));
      const v = parseInt(inp.value,10);
      taskEditDraft[idx].duration = (!isNaN(v) && v>0) ? v : 1;
      recalcTaskEditValuePreview();
    });
  });
  form.querySelectorAll('.teDel').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(taskEditDraft.length<=1){ alert('Kam se kam ek task rehna chahiye.'); return; }
      if(!confirm('Ye task hata du?')) return;
      const idx = parseInt(btn.getAttribute('data-task-idx'));
      taskEditDraft.splice(idx,1);
      renderTaskEditForm();
    });
  });
}
// Live-updates just the ₹ chips (no full re-render) as someone types a new
// duration, so ₹5,000 visibly re-arranges across tasks without losing focus
// mid-keystroke — this is the "automatic arrange" the person asked for.
function recalcTaskEditValuePreview(){
  if(!taskEditDraft) return;
  const values = computeTaskValues(taskEditDraft.map(t=>t.duration||1));
  document.querySelectorAll('#taskEditForm .tVal').forEach(span=>{
    const idx = parseInt(span.getAttribute('data-val-idx'));
    const tier = tierForMins(taskEditDraft[idx].duration||0);
    span.className = 'tVal ' + tier.cls;
    span.textContent = `${tier.emoji} ₹${Math.round(values[idx])}`;
  });
}
// Every stored day's tasks[] array is resized (padded/truncated) to match
// the current task count — getDay() already does this on access, so simply
// touching every day forces it for the whole 50/N-day range in one go.
function resizeAllDaysTasks(){
  for(let i=1;i<=TOTAL_DAYS;i++) getDay(i);
}
document.getElementById('addTaskBtn').addEventListener('click', ()=>{
  if(!taskEditDraft){
    taskEditDraft = TASKS.map((name,i)=>({ name, start: TASK_START_MIN[i], duration: TASK_DURATIONS_MIN[i] }));
  }
  const last = taskEditDraft[taskEditDraft.length-1];
  const newStart = last ? Math.min(last.start + (last.duration||30), 1410) : 480;
  taskEditDraft.push({ name: 'Naya Task', start: newStart, duration: 30 });
  renderTaskEditForm();
});
document.getElementById('saveTasksBtn').addEventListener('click', async ()=>{
  if(!taskEditDraft || taskEditDraft.length===0){ alert('Kam se kam ek task chahiye.'); return; }
  const cleaned = taskEditDraft.map((t,i)=>({
    name: (t.name && String(t.name).trim()) ? String(t.name).trim() : ('Task '+(i+1)),
    start: (typeof t.start==='number') ? t.start : 480,
    duration: (typeof t.duration==='number' && t.duration>0) ? t.duration : 30
  }));
  TASKS = cleaned.map(t=>t.name);
  TASK_START_MIN = cleaned.map(t=>t.start);
  TASK_DURATIONS_MIN = cleaned.map(t=>t.duration);
  TASK_VALUES = computeTaskValues(TASK_DURATIONS_MIN); // auto-arranges ₹5,000 across the new task list
  state.taskDefs = cleaned.slice();
  delete state.taskNames; // superseded by state.taskDefs (name+time+duration)
  resizeAllDaysTasks();
  taskEditDraft = null;
  await save();
  // Admin, Shared Task Mode ON: push this same list to the room so every
  // member's tab picks it up automatically on their next auto-sync tick.
  if(isSharedTaskMode() && isMeAdmin()){
    await saveSharedTaskDefs(cleaned);
    lastAppliedSharedTasksJSON = JSON.stringify(cleaned);
  }
  renderAll();
  renderTaskEditForm();
  alert(isSharedTaskMode() && isMeAdmin()
    ? 'Tasks save ho gaye ✅ — sabke tab mein automatically update ho jayenge.'
    : 'Tasks save ho gaye ✅ — ₹5,000 automatically naye tasks mein arrange ho gaya.');
});
document.getElementById('resetTasksBtn').addEventListener('click', async ()=>{
  if(!confirm('Sab tasks (naam, time, duration) default pe reset kar du?')) return;
  TASKS = DEFAULT_TASKS.slice();
  TASK_START_MIN = DEFAULT_TASK_START_MIN.slice();
  TASK_DURATIONS_MIN = DEFAULT_TASK_DURATIONS_MIN.slice();
  TASK_VALUES = computeTaskValues(TASK_DURATIONS_MIN);
  delete state.taskNames;
  delete state.taskDefs;
  resizeAllDaysTasks();
  taskEditDraft = null;
  await save();
  if(isSharedTaskMode() && isMeAdmin()){
    const defaultDefs = DEFAULT_TASKS.map((name,i)=>({ name, start: DEFAULT_TASK_START_MIN[i], duration: DEFAULT_TASK_DURATIONS_MIN[i] }));
    await saveSharedTaskDefs(defaultDefs);
    lastAppliedSharedTasksJSON = JSON.stringify(defaultDefs);
  }
  renderAll();
  renderTaskEditForm();
});
document.getElementById('resetMathChBtn').addEventListener('click', ()=> resetChapterType('math'));
document.getElementById('resetEngChBtn').addEventListener('click', ()=> resetChapterType('english'));
document.getElementById('resetRevMathBtn').addEventListener('click', ()=> resetRevisionType('math'));
document.getElementById('resetRevEngBtn').addEventListener('click', ()=> resetRevisionType('english'));
document.getElementById('resetRevGkBtn').addEventListener('click', ()=> resetRevisionType('gk'));
document.getElementById('chapterSearchInput').addEventListener('input', applyChapterSearchFilter);
document.getElementById('revisionSearchInput').addEventListener('input', applyRevisionSearchFilter);

// Opens the (now-in-Today-tab) task editor panel — used both by the header
// toggle button and by each task row's ✏️ icon. When opened from a specific
// task's pencil icon, scrolls to and briefly highlights that task's row so
// it's obvious which one you tapped.
function openTaskEditor(focusIdx){
  const panelEl = document.getElementById('taskEditPanel');
  const toggleBtn = document.getElementById('teToggleBtn');
  const labelEl = document.getElementById('teTabLabelText');
  if(!panelEl) return;
  panelEl.style.display = '';
  if(toggleBtn) toggleBtn.classList.add('open');
  if(labelEl) labelEl.textContent = 'Band Karo';
  safeRun(renderTaskEditForm, 'renderTaskEditForm');
  requestAnimationFrame(()=>{
    panelEl.scrollIntoView({behavior:'smooth', block:'start'});
    if(typeof focusIdx === 'number' && !isNaN(focusIdx)){
      const row = document.querySelector(`#taskEditForm .taskEditRow[data-row-idx="${focusIdx}"]`);
      if(row){
        row.classList.add('teFlash');
        setTimeout(()=>row.classList.remove('teFlash'), 1400);
        const nameInput = row.querySelector('.teName');
        if(nameInput) nameInput.focus();
      }
    }
  });
}
function closeTaskEditor(){
  const panelEl = document.getElementById('taskEditPanel');
  const toggleBtn = document.getElementById('teToggleBtn');
  const labelEl = document.getElementById('teTabLabelText');
  if(panelEl) panelEl.style.display = 'none';
  if(toggleBtn) toggleBtn.classList.remove('open');
  if(labelEl) labelEl.textContent = 'Customize Tasks';
}
function isTaskEditorOpen(){
  const panelEl = document.getElementById('taskEditPanel');
  return !!panelEl && panelEl.style.display !== 'none';
}
const teToggleBtnEl = document.getElementById('teToggleBtn');
if(teToggleBtnEl) teToggleBtnEl.addEventListener('click', ()=>{
  if(isTaskEditorOpen()) closeTaskEditor(); else openTaskEditor();
});

// Real (unclamped) days-remaining count for the big ring widget — separate
// from todayDayNum() above, which clamps to [1, TOTAL_DAYS] for indexing
// into the day-by-day plan. Here we want the true countdown:
//  - before the plan's Day 1 has arrived yet → show the full TOTAL_DAYS
//  - during the plan → TOTAL_DAYS - (day number so far) + 1
//  - after the plan's last day has passed → 0 (ring shows "exam done")
function examDaysLeft(){
  const now = new Date();
  const diff = Math.floor((new Date(now.toDateString()) - new Date(START_DATE.toDateString()))/86400000) + 1;
  if(diff < 1) return TOTAL_DAYS;
  return Math.max(0, TOTAL_DAYS - diff + 1);
}
function updateExamCountdownRing(){
  const left = examDaysLeft();
  const pct = Math.max(0, Math.min(100, Math.round((left/TOTAL_DAYS)*100)));
  // Class-based (not a single id) — there can be more than one ring on the
  // page at once (the small one inline on Home + the bigger one inside the
  // once-a-day popup), and both should always show the same number.
  document.querySelectorAll('.examCountdownRing').forEach(ring=>{
    ring.style.setProperty('--p', pct);
    const numEl = ring.querySelector('.examRingNum');
    const lblEl = ring.querySelector('.examRingLbl');
    if(numEl) numEl.textContent = left > 0 ? left : '🎉';
    if(lblEl) lblEl.textContent = left > 1 ? 'Days Left' : (left === 1 ? 'Day Left' : 'All The Best!');
  });
}
function renderExamLine(){
  const examDate = new Date(START_DATE);
  examDate.setDate(examDate.getDate() + TOTAL_DAYS - 1);
  const opts = {day:'2-digit',month:'long',year:'numeric'};
  const totalRupees = Math.round(DAILY_TARGET*TOTAL_DAYS);
  const lineEl = document.getElementById('examLine');
  if(lineEl) lineEl.textContent =
    `Day 1: ${START_DATE.toLocaleDateString('en-IN',opts)}  →  Day ${TOTAL_DAYS}: ${examDate.toLocaleDateString('en-IN',opts)}. 🟡 Bada task zyada ₹, 🔵 chhota task kam ₹ — roz ka total ₹${Math.round(DAILY_TARGET).toLocaleString('en-IN')}, ${TOTAL_DAYS} din ka poora ₹${totalRupees.toLocaleString('en-IN')} ka target.`;
  const titleEl = document.getElementById('mainTitle');
  if(titleEl) titleEl.textContent = `🎯 EXAM TRACKER`;
  const calLbl = document.getElementById('calDaysLabel');
  if(calLbl) calLbl.textContent = TOTAL_DAYS;
  updateExamCountdownRing();
}

// ===== Once-a-day "Mission Countdown" popup — shows the big ring + a
// random motivation line, once per calendar day, right when the app opens.
// Gated by its own localStorage date-stamp (separate key from everything
// else) so it fires exactly once per day no matter how many times the app
// is opened that same day, and fires again fresh the next day.
function dailyCountdownPopupShownToday(){
  try{ return localStorage.getItem('cgl50-daily-countdown-lastshown') === fmtISODate(new Date()); }
  catch(e){ return false; }
}
function markDailyCountdownPopupShown(){
  try{ localStorage.setItem('cgl50-daily-countdown-lastshown', fmtISODate(new Date())); }catch(e){}
}
function showDailyCountdownModal(){
  const modal = document.getElementById('dailyCountdownModal');
  if(!modal) return;
  const quoteEl = document.getElementById('dailyCountdownQuote');
  if(quoteEl){
    const pool = (typeof ALL_TAB_QUOTES !== 'undefined' && ALL_TAB_QUOTES.length) ? ALL_TAB_QUOTES : DAILY_QUOTES;
    quoteEl.textContent = pool[Math.floor(Math.random()*pool.length)];
  }
  updateExamCountdownRing();
  modal.style.display = 'flex';
  markDailyCountdownPopupShown();
}
function hideDailyCountdownModal(){
  const modal = document.getElementById('dailyCountdownModal');
  if(modal) modal.style.display = 'none';
}
// Called once from init() — small delay so it doesn't fight with the
// welcome/help popups for the same instant on screen.
function maybeShowDailyCountdownPopup(){
  if(dailyCountdownPopupShownToday()) return;
  setTimeout(showDailyCountdownModal, 1800);
}
{
  const dcCloseBtn = document.getElementById('dailyCountdownCloseBtn');
  const dcOkBtn = document.getElementById('dailyCountdownOkBtn');
  if(dcCloseBtn) dcCloseBtn.addEventListener('click', hideDailyCountdownModal);
  if(dcOkBtn) dcOkBtn.addEventListener('click', hideDailyCountdownModal);
}

function safeRun(fn, label){
  try{ fn(); }
  catch(err){ console.error('Tracker render error in '+label+':', err); }
}

// ===== Perf: lazy per-tab rendering =====
// renderAll() used to unconditionally rebuild every chart/list on EVERY
// state change (a single task tick, a note autosave, the 25s background
// sync) — including tabs that aren't even visible right now. Most of the
// expensive analytics functions live under the "more" tab alone. Instead
// of running all of them every time, we only render a function immediately
// if its owning tab is the one currently on screen; otherwise we mark it
// "pending" and actually render it the moment the user opens that tab —
// so nothing is ever stale, it's just not wastefully computed early.
const TAB_OWNER = {
  renderCalendarView:'home',
  renderLast4DaysHeatmap:'home',
  renderPanel:'today',
  renderStrictManagerPanel:'today',
  renderMockTab:'mock',
  renderChaptersTab:'chapters', renderRevisionTab:'chapters',
  renderPerformance:'more', renderBestWorst:'more', renderChart:'more',
  renderAccuracyTrend:'more', renderPercentileTrend:'more', renderMockScoreTrend:'more',
  renderSubjectProgressChart:'more', renderSectionalVsFullCompare:'more',
  renderWeakChapterInsight:'more', renderStudyUtilization:'more',
  renderLongTermAnalysis:'more', renderLossLog:'more', renderMistakesLog:'more',
  renderWeekly:'more'
};
const RENDER_FN_BY_NAME = {
  renderCalendarView, renderLast4DaysHeatmap, renderPanel, renderStrictManagerPanel, renderMockTab, renderChaptersTab, renderRevisionTab,
  renderPerformance, renderBestWorst, renderChart, renderAccuracyTrend, renderPercentileTrend,
  renderMockScoreTrend, renderSubjectProgressChart, renderSectionalVsFullCompare,
  renderWeakChapterInsight, renderStudyUtilization, renderLongTermAnalysis,
  renderLossLog, renderMistakesLog, renderWeekly
};
const pendingRenderFns = new Set();
function activeTabName(){
  const el = document.querySelector('.tabview.active');
  return el ? el.getAttribute('data-tabview') : 'home';
}
function flushPendingRendersForTab(tabName){
  if(pendingRenderFns.size===0) return;
  pendingRenderFns.forEach(name=>{
    if(TAB_OWNER[name]===tabName){
      safeRun(RENDER_FN_BY_NAME[name], name);
      pendingRenderFns.delete(name);
    }
  });
}

function renderAll(){
  const active = activeTabName();
  const maybe = (fn, name)=>{
    if(TAB_OWNER[name] && TAB_OWNER[name]!==active){ pendingRenderFns.add(name); return; }
    safeRun(fn, name);
  };
  maybe(renderCalendarView, 'renderCalendarView');
  maybe(renderLast4DaysHeatmap, 'renderLast4DaysHeatmap');
  maybe(renderPanel, 'renderPanel');
  maybe(renderStrictManagerPanel, 'renderStrictManagerPanel');
  maybe(renderPerformance, 'renderPerformance');
  maybe(renderMockTab, 'renderMockTab');
  maybe(renderBestWorst, 'renderBestWorst');
  maybe(renderChart, 'renderChart');
  maybe(renderAccuracyTrend, 'renderAccuracyTrend');
  maybe(renderPercentileTrend, 'renderPercentileTrend');
  maybe(renderMockScoreTrend, 'renderMockScoreTrend');
  maybe(renderSubjectProgressChart, 'renderSubjectProgressChart');
  maybe(renderSectionalVsFullCompare, 'renderSectionalVsFullCompare');
  maybe(renderWeakChapterInsight, 'renderWeakChapterInsight');
  maybe(renderStudyUtilization, 'renderStudyUtilization');
  maybe(renderLongTermAnalysis, 'renderLongTermAnalysis');
  maybe(renderLossLog, 'renderLossLog');
  maybe(renderMistakesLog, 'renderMistakesLog');
  maybe(renderWeekly, 'renderWeekly');
  safeRun(renderStudyHours, 'renderStudyHours');
  maybe(renderChaptersTab, 'renderChaptersTab');
  maybe(renderRevisionTab, 'renderRevisionTab');
  safeRun(computeStats, 'computeStats');
  safeRun(renderTodayWallet, 'renderTodayWallet');
  safeRun(checkAndAwardBadges, 'checkAndAwardBadges');
  safeRun(renderBadges, 'renderBadges');
  safeRun(checkLevelUp, 'checkLevelUp');
  safeRun(renderLevelCard, 'renderLevelCard');
  safeRun(updateTopbarRing, 'updateTopbarRing');
  safeRun(updateTodayDot, 'updateTodayDot');
  safeRun(renderDailyQuote, 'renderDailyQuote');
  safeRun(renderRightNowCard, 'renderRightNowCard');
  safeRun(renderHomeTimerBanner, 'renderHomeTimerBanner');
  safeRun(renderAnnouncementCard, 'renderAnnouncementCard');
  safeRun(renderFocusTodayText, 'renderFocusTodayText');
}

// Small always-visible circular progress ring in the topbar showing overall
// days-cleared %, so progress is visible no matter which tab is open.
function updateTopbarRing(){
  const pctText = document.getElementById('statPct');
  const pct = pctText ? parseInt(pctText.textContent) || 0 : 0;
  const ring = document.getElementById('miniRing');
  const label = document.getElementById('miniRingLabel');
  if(ring) ring.style.setProperty('--p', pct);
  if(label) label.textContent = pct + '%';
}

// Small red dot on the "Today" tab icon when today's target isn't fully
// ticked yet (and it's not a rest day) — a gentle nudge to go finish it.
function updateTodayDot(){
  const dot = document.getElementById('todayDot');
  if(!dot) return;
  const d = getDay(todayDayNum());
  const pending = !d.rest && d.tasks.filter(Boolean).length < TASKS.length;
  dot.classList.toggle('show', pending);
}

// ===== Tab bar navigation =====
// _fromPopState=true means we're reacting to the Android/browser back button
// (via popstate below) — in that case we must NOT push a new history entry,
// or every back-press would just re-push itself and the app could never exit.
function switchTab(name, _fromPopState){
  const prevBtn = document.querySelector('.tabbtn.active');
  const prevName = prevBtn ? prevBtn.getAttribute('data-tab') : null;
  document.querySelectorAll('.tabview').forEach(el=>{
    el.classList.toggle('active', el.getAttribute('data-tabview')===name);
  });
  document.querySelectorAll('.tabbtn').forEach(btn=>{
    btn.classList.toggle('active', btn.getAttribute('data-tab')===name);
  });
  flushPendingRendersForTab(name);
  try{ localStorage.setItem('cgl50-activetab', name); }catch(e){}
  window.scrollTo({top:0, behavior:'instant' in window ? 'instant' : 'auto'});
  if(!_fromPopState && name !== prevName){
    try{ history.pushState({cgl50Tab:name}, '', location.href); }catch(e){}
  }
  // Rank tab isn't part of the lazy TAB_OWNER render system above, and its
  // only other refresh trigger is the 25s background auto-sync timer — so
  // opening it could show numbers up to 25s (or more, if the timer was
  // throttled while backgrounded) out of date, e.g. a friend's just-synced
  // rank/kamai not showing yet. Force one fresh fetch the moment it opens.
  if(name === 'compete' && name !== prevName){
    safeRun(()=>{ renderCompetePanel(); }, 'renderCompetePanel');
  }
}
function initTabs(){
  document.querySelectorAll('.tabbtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tab = btn.getAttribute('data-tab');
      // "Today" tab must always mean TODAY. If selectedDay got left on some
      // other day (e.g. after browsing history via the Home tab calendar),
      // tapping this button used to just reveal whatever day was already
      // selected — so a just-finished Calc quiz (which always saves against
      // the real todayDayNum()) could look like it "didn't update" simply
      // because a different day's tasks were on screen. Snap back first.
      if(tab === 'today' && viewingName === myName) selectedDay = todayDayNum();
      switchTab(tab);
    });
  });
  let saved = 'home';
  try{ saved = localStorage.getItem('cgl50-activetab') || 'home'; }catch(e){}
  if(!['home','today','mock','chapters','compete','more','calc'].includes(saved)) saved = 'home';
  // This becomes the "floor" state — pressing back while on this tab will
  // exit the app (correct native behaviour) instead of looping forever.
  try{ history.replaceState({cgl50Tab:saved}, '', location.href); }catch(e){}
  switchTab(saved, true);
}
// Android/back-gesture support: instead of closing the installed app the
// instant back is pressed, step back through previously visited tabs first.
window.addEventListener('popstate', (e)=>{
  if(e.state && e.state.cgl50Tab){
    switchTab(e.state.cgl50Tab, true);
  }
});

// ===== Calc tab — sub-page navigation (menu <-> operation pages) =====
function showCalcPage(name){
  document.querySelectorAll('.calcPage').forEach(el=>{
    el.classList.toggle('active', el.id === 'calcPage-' + name);
  });
  // Saved-quiz session ke dauraan koi question unsave ho sakta hai, isliye
  // menu par wapas aate hi count fresh kar do.
  if(name === 'vocabmenu') safeRun(updateVocabSavedMenuBtn, 'updateVocabSavedMenuBtn');
  if(name === 'idiommenu') safeRun(updateIdiomSavedMenuBtn, 'updateIdiomSavedMenuBtn');
}

// ===== Swipe-left-to-advance for quiz pages =====
// Har quiz page (Vocab/Spelling/Idiom/Grammar + saari reasoning quizzes) par
// ab left-swipe se bhi agla sawaal aata hai — Next ➜ button (upar ya neeche)
// dabane jaisa hi kaam karta hai. Ek hi generic helper hai taaki 12+ quizzes
// mein alag-alag copy-paste na karna pade.
function attachQuizSwipeNext(pageId, nextFn){
  const el = document.getElementById(pageId);
  if(!el || typeof nextFn !== 'function') return;
  let startX = 0, startY = 0, tracking = false;
  el.addEventListener('touchstart', function(e){
    if(e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, {passive:true});
  el.addEventListener('touchend', function(e){
    if(!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    // Mostly-horizontal, leftward, and long enough to be a deliberate swipe
    // (not an accidental brush while scrolling/tapping an answer option).
    if(dx < -55 && Math.abs(dx) > Math.abs(dy) * 1.5){
      safeRun(nextFn, 'quizSwipeNext(' + pageId + ')');
    }
  }, {passive:true});
}

// ===== Calc practice engine =====
const calcSession = {
  op:'addition', numCount:2, difficulty:'easy', qMode:'range',
  rangeFrom:1, rangeTo:99, totalQuestions:20,
  index:0, correct:0, wrong:0, auto:true, answerMode:'mcq',
  questions:[], flagged:{}, timerStart:0, timerInterval:null,
  answered:false, typedValue:''
};

// Operations that don't use the chain-style "Numbers In Question" / "Number range"
// fields — they generate their own range internally from Difficulty alone.
const CALC_ADVANCED_OPS = ['square','cube','sqrt','cbrt','table','trig','percentage','fraction'];
function calcIsAdvancedOp(op){ return CALC_ADVANCED_OPS.indexOf(op) !== -1; }

const CALC_OP_LABELS = {
  addition:'Addition', subtraction:'Subtraction', multiplication:'Multiplication', division:'Division',
  square:'Square', cube:'Cube', sqrt:'Square Root', cbrt:'Cube Root', table:'Table',
  trig:'Trigonometry', percentage:'Percentage', fraction:'Fraction'
};
function calcOpLabel(op){ return CALC_OP_LABELS[op] || op; }

const CALC_DIFFICULTY_HINTS = {
  square:'Easy: 10\u201325\u00b2 \u00b7 Medium: 26\u201355\u00b2 \u00b7 Hard: 56\u201399\u00b2',
  cube:'Easy: 2\u201310\u00b3 \u00b7 Medium: 11\u201320\u00b3 \u00b7 Hard: 21\u201335\u00b3',
  sqrt:'Easy: \u221A4\u2013\u221A144 \u00b7 Medium: \u221A169\u2013\u221A625 \u00b7 Hard: \u221A676\u2013\u221A1600',
  cbrt:'Easy: \u221B8\u2013\u221B343 \u00b7 Medium: \u221B512\u2013\u221B2744 \u00b7 Hard: \u221B3375\u2013\u221B10648',
  table:'Easy: tables 2\u201310 \u00b7 Medium: 11\u201320 \u00b7 Hard: 21\u201330',
  trig:'Easy: sin & cos \u00b7 Medium: + tan \u00b7 Hard: all six ratios',
  percentage:'Easy: clean percents of 20\u2013200 \u00b7 Medium: trickier fractions of 201\u20131000 \u00b7 Hard: of 1001\u20139999',
  fraction:'Easy: denominators 2\u20135 \u00b7 Medium: 6\u20139 \u00b7 Hard: 10\u201314'
};
function calcDifficultyHintText(op){
  return CALC_DIFFICULTY_HINTS[op] || 'Easy uses smaller numbers, Hard prefers larger or trickier ones.';
}

// Standard trig ratio table. null = undefined (not asked).
const CALC_TRIG_TABLE = {
  sin:  {0:'0',        30:'1/2',    45:'1/\u221A2', 60:'\u221A3/2', 90:'1'},
  cos:  {0:'1',        30:'\u221A3/2', 45:'1/\u221A2', 60:'1/2',    90:'0'},
  tan:  {0:'0',        30:'1/\u221A3', 45:'1',      60:'\u221A3',   90:null},
  cosec:{0:null,       30:'2',      45:'\u221A2',   60:'2/\u221A3', 90:'1'},
  sec:  {0:'1',        30:'2/\u221A3', 45:'\u221A2', 60:'2',       90:null},
  cot:  {0:null,       30:'\u221A3',  45:'1',      60:'1/\u221A3', 90:'0'}
};

function calcGcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ const t=b; b=a%b; a=t; } return a||1; }

// Unicode vulgar-fraction glyphs used to format percentages like "12\u00bd%".
const CALC_UNICODE_FRACS = {
  '1/2':'\u00BD','1/3':'\u2153','2/3':'\u2154','1/4':'\u00BC','3/4':'\u00BE',
  '1/5':'\u2155','2/5':'\u2156','3/5':'\u2157','4/5':'\u2158',
  '1/6':'\u2159','5/6':'\u215A','1/8':'\u215B','3/8':'\u215C','5/8':'\u215D','7/8':'\u215E'
};
function calcFormatPercent(num, den){
  const whole = Math.floor(num*100/den);
  let remNum = num*100 - whole*den;
  let remDen = den;
  const g = calcGcd(remNum, remDen);
  if(g>1){ remNum/=g; remDen/=g; }
  if(remNum===0) return String(whole);
  const glyph = CALC_UNICODE_FRACS[remNum+'/'+remDen];
  return whole + (glyph ? glyph : (' ' + remNum + '\u2044' + remDen));
}
function calcPercentPool(difficulty){
  if(difficulty==='hard') return [[1,7],[2,7],[3,7],[1,9],[1,11],[1,12],[1,13],[1,16],[3,16],[1,3],[2,3]];
  if(difficulty==='medium') return [[1,3],[2,3],[1,6],[5,6],[1,8],[3,8],[5,8],[7,8],[1,9],[1,12]];
  return [[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,10],[3,10],[1,20]];
}
// Base-number ranges for every "advanced" (non-chain) operation, per difficulty.
function calcAdvancedRange(op, difficulty){
  const R = {
    square:    {easy:[10,25], medium:[26,55],  hard:[56,99]},
    cube:      {easy:[2,10],  medium:[11,20],  hard:[21,35]},
    sqrt:      {easy:[2,12],  medium:[13,25],  hard:[26,40]},
    cbrt:      {easy:[2,7],   medium:[8,14],   hard:[15,22]},
    table:     {easy:[2,10],  medium:[11,20],  hard:[21,30]},
    fraction:  {easy:[2,5],   medium:[6,9],    hard:[10,14]},
    percentage:{easy:[20,200],medium:[201,1000],hard:[1001,9999]}
  };
  const cfg = R[op] || {easy:[1,50], medium:[1,100], hard:[1,500]};
  return cfg[difficulty] || cfg.easy;
}

function openCalcSetup(op){
  calcSession.op = op;
  const advanced = calcIsAdvancedOp(op);
  const numWrap = document.getElementById('calcNumCountWrap');
  const modeWrap = document.getElementById('calcQModeWrap');
  if(numWrap) numWrap.style.display = advanced ? 'none' : '';
  if(modeWrap) modeWrap.style.display = advanced ? 'none' : '';
  const hintEl = document.getElementById('calcDifficultyHint');
  if(hintEl) hintEl.textContent = calcDifficultyHintText(op);
  const titleEl = document.getElementById('calcSetupTitle');
  if(titleEl) titleEl.textContent = calcOpLabel(op) + ' \u2014 Practice Setup';
  const subEl = document.getElementById('calcSetupSub');
  if(subEl) subEl.textContent = advanced ? 'Choose difficulty and start.' : 'Select range and start.';
  const sheet = document.getElementById('calcSetupSheet');
  if(sheet) sheet.classList.add('show');
}
function closeCalcSetup(){
  const sheet = document.getElementById('calcSetupSheet');
  if(sheet) sheet.classList.remove('show');
}

function calcRandInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
function calcDifficultyRange(difficulty){
  if(difficulty==='medium') return [51, 300];
  if(difficulty==='hard') return [301, 999];
  return [10, 50];
}
// Picks one number honoring the setup sheet's "Number range" / "Random" (difficulty) mode.
// Same source used by every operation (addition, subtraction, multiplication, division)
// so all four share identical Numbers/Difficulty/Range/Question-Count behaviour.
function calcPickNumber(dMin, dMax){
  return calcSession.qMode==='range'
    ? calcRandInt(calcSession.rangeFrom, calcSession.rangeTo)
    : calcRandInt(dMin, dMax);
}
function generateOneCalcQuestion(dMin, dMax){
  const op = calcSession.op;
  const n = Math.max(2, calcSession.numCount);

  if(op==='subtraction'){
    // Chain subtraction: base − v2 − v3 ... Base is bumped up if needed so the
    // running result (and the final answer) never goes negative.
    const subs = [];
    for(let k=1;k<n;k++) subs.push(calcPickNumber(dMin,dMax));
    const subTotal = subs.reduce((a,b)=>a+b, 0);
    let base = calcPickNumber(dMin,dMax);
    if(base <= subTotal) base += subTotal + calcRandInt(1, Math.max(5, dMax-dMin));
    const operands = [base, ...subs];
    const answer = operands.reduce((a,b,idx)=> idx===0 ? b : a-b);
    return {operands, answer, opSymbol:'\u2212'};
  }

  if(op==='multiplication'){
    // First two factors follow the chosen difficulty/range; any extra factors
    // (Numbers In Question > 2) use a small 2-12 multiplier so products stay
    // sane for mental-math practice instead of exploding in size.
    const operands = [calcPickNumber(dMin,dMax)];
    for(let k=1;k<n;k++) operands.push(k===1 ? calcPickNumber(dMin,dMax) : calcRandInt(2,12));
    const answer = operands.reduce((a,b)=>a*b, 1);
    return {operands, answer, opSymbol:'\u00d7'};
  }

  if(op==='division'){
    // Built backwards from a clean quotient so the division always comes out
    // exact (no decimals). Extra divisors beyond the first use small 2-12 values.
    const divisors = [];
    for(let k=1;k<n;k++) divisors.push(k===1 ? Math.max(2, calcPickNumber(dMin,dMax)) : calcRandInt(2,12));
    const quotient = Math.max(1, calcPickNumber(dMin,dMax));
    let dividend = quotient;
    divisors.forEach(d=> dividend *= d);
    return {operands:[dividend, ...divisors], answer: quotient, opSymbol:'\u00f7'};
  }

  if(op==='square'){
    const [mn,mx] = calcAdvancedRange('square', calcSession.difficulty);
    const num = calcRandInt(mn,mx);
    return {answer:num*num, html:num+'<sup>2</sup>'};
  }

  if(op==='cube'){
    const [mn,mx] = calcAdvancedRange('cube', calcSession.difficulty);
    const num = calcRandInt(mn,mx);
    return {answer:num*num*num, html:num+'<sup>3</sup>'};
  }

  if(op==='sqrt'){
    // Built backwards from a clean root k so \u221An always comes out exact.
    const [mn,mx] = calcAdvancedRange('sqrt', calcSession.difficulty);
    const k = calcRandInt(mn,mx);
    return {answer:k, html:'\u221A' + (k*k)};
  }

  if(op==='cbrt'){
    const [mn,mx] = calcAdvancedRange('cbrt', calcSession.difficulty);
    const k = calcRandInt(mn,mx);
    return {answer:k, html:'\u221B' + (k*k*k)};
  }

  if(op==='table'){
    const [mn,mx] = calcAdvancedRange('table', calcSession.difficulty);
    const base = calcRandInt(mn,mx);
    const multMax = calcSession.difficulty==='hard' ? 20 : (calcSession.difficulty==='medium' ? 15 : 10);
    const mult = calcRandInt(1, multMax);
    return {operands:[base, mult], answer: base*mult, opSymbol:'\u00d7'};
  }

  if(op==='trig'){
    const funcs = calcSession.difficulty==='hard' ? ['sin','cos','tan','cosec','sec','cot']
                : calcSession.difficulty==='medium' ? ['sin','cos','tan'] : ['sin','cos'];
    const angles = [0,30,45,60,90];
    let func, angle, val, guard = 0;
    do{
      func = funcs[calcRandInt(0, funcs.length-1)];
      angle = angles[calcRandInt(0,4)];
      val = CALC_TRIG_TABLE[func][angle];
      guard++;
    } while(val===null && guard<40);
    if(val===null){ func='sin'; angle=90; val='1'; }
    return {answer:val, html:func+'('+angle+'\u00b0)', isTrig:true, trigFunc:func, trigAngle:angle};
  }

  if(op==='percentage'){
    const pool = calcPercentPool(calcSession.difficulty);
    const [num,den] = pool[calcRandInt(0, pool.length-1)];
    const [ymin,ymax] = calcAdvancedRange('percentage', calcSession.difficulty);
    const y = calcRandInt(ymin,ymax);
    const answer = Math.round((num*y)/den);
    return {answer, html: calcFormatPercent(num,den)+'% of '+y, approx:true};
  }

  if(op==='fraction'){
    // Built backwards so (a/b) \u00d7 c always comes out a clean whole number.
    const [bmin,bmax] = calcAdvancedRange('fraction', calcSession.difficulty);
    const b = calcRandInt(bmin,bmax);
    const a = calcRandInt(1, b-1);
    const multMax = calcSession.difficulty==='hard' ? 25 : (calcSession.difficulty==='medium' ? 15 : 10);
    const mult = calcRandInt(2, multMax);
    const c = b*mult;
    return {answer:a*mult, html:a+'\u2044'+b+' \u00d7 '+c};
  }

  // addition (default) — also used by DI Addition
  const operands = [];
  for(let k=0;k<n;k++) operands.push(calcPickNumber(dMin,dMax));
  const answer = operands.reduce((a,b)=>a+b, 0);
  return {operands, answer, opSymbol:'+'};
}
function calcQuestionSignature(q){
  return q.html ? q.html : (q.operands.join(',') + '|' + q.opSymbol);
}
function generateCalcQuestions(){
  const qs = [];
  const [dMin,dMax] = calcDifficultyRange(calcSession.difficulty);
  let prevSig = null;
  for(let i=0;i<calcSession.totalQuestions;i++){
    let q, sig, tries = 0;
    // Regenerate on an exact back-to-back repeat (same numbers as the
    // question right before it) so a 20-question set feels varied instead
    // of occasionally showing the same sum twice in a row. Capped at a few
    // tries so it can never loop forever on a tiny question-space.
    do{
      q = generateOneCalcQuestion(dMin, dMax);
      sig = calcQuestionSignature(q);
      tries++;
    } while(sig === prevSig && tries < 8);
    prevSig = sig;
    qs.push(q);
  }
  return qs;
}
function buildCalcMcqOptions(q){
  if(q.isTrig){
    const table = CALC_TRIG_TABLE[q.trigFunc];
    const otherAngles = [0,30,45,60,90].filter(a=> a!==q.trigAngle && table[a]!==null);
    for(let i=otherAngles.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      const t = otherAngles[i]; otherAngles[i]=otherAngles[j]; otherAngles[j]=t;
    }
    const values = [q.answer];
    otherAngles.forEach(a=>{ if(values.length<4) values.push(table[a]); });
    // Guaranteed fallback: cosec/sec/cot are undefined at some angles, so
    // their own table sometimes can't supply 3 distinct distractors on its
    // own. Top up from every valid ratio value across the whole trig table
    // instead, so the grid is never short of 4 options.
    if(values.length < 4){
      const pool = [];
      Object.keys(CALC_TRIG_TABLE).forEach(fn=>{
        [0,30,45,60,90].forEach(a=>{
          const v = CALC_TRIG_TABLE[fn][a];
          if(v!==null && values.indexOf(v)===-1 && pool.indexOf(v)===-1) pool.push(v);
        });
      });
      for(let i=pool.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        const t = pool[i]; pool[i]=pool[j]; pool[j]=t;
      }
      let p = 0;
      while(values.length < 4 && p < pool.length){ values.push(pool[p]); p++; }
    }
    for(let i=values.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      const t = values[i]; values[i]=values[j]; values[j]=t;
    }
    return values.map(v=>({value:v, label:v}));
  }
  const answer = q.answer;
  const opts = new Set([answer]);
  // Distractors are answer +/- (multiple of 10) so every option ends in the
  // SAME last digit as the correct answer — this removes the "just check the
  // last digit" shortcut and forces a full calculation. The step grows on
  // every attempt instead of using one fixed small step: for small answers
  // (e.g. sqrt/cbrt/table results of 2-20) a fixed step often had only 1-2
  // possible distinct, non-negative values to offer, so the old loop could
  // run out of tries and silently hand back an MCQ with fewer than 4 options.
  let step = 1, guard = 0;
  while(opts.size < 4 && guard < 300){
    guard++;
    const delta = step * 10;
    const plus = answer + delta;
    const minus = answer - delta;
    if(opts.size < 4 && !opts.has(plus)) opts.add(plus);
    if(opts.size < 4 && minus >= 0 && !opts.has(minus)) opts.add(minus);
    step++;
  }
  // Absolute last-resort fallback (should never actually trigger, but keeps
  // the grid at a guaranteed 4 options no matter what).
  let filler = 1;
  while(opts.size < 4){
    const c = answer + filler;
    if(c !== answer && !opts.has(c)) opts.add(c);
    filler++;
  }
  const arr = Array.from(opts);
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    const tmp = arr[i]; arr[i]=arr[j]; arr[j]=tmp;
  }
  return arr.map(v=>({value:v, label:String(v)}));
}

function readCalcSetupValues(){
  const numBtn = document.querySelector('#calcNumCountRow .calcChip.active');
  calcSession.numCount = parseInt(numBtn ? numBtn.getAttribute('data-value') : '2', 10) || 2;
  const diffBtn = document.querySelector('#calcDifficultyRow .calcChip.active');
  calcSession.difficulty = diffBtn ? diffBtn.getAttribute('data-value') : 'easy';
  const qCountBtn = document.querySelector('#calcQCountRow .calcChip.active');
  calcSession.totalQuestions = parseInt(qCountBtn ? qCountBtn.getAttribute('data-value') : '10', 10) || 10;
  const modeBtn = document.querySelector('#calcQModeRow .calcChip.active');
  calcSession.qMode = modeBtn ? modeBtn.getAttribute('data-value') : 'range';
  const rangeBtn = document.querySelector('#calcRangeDigitRow .calcChip.active');
  let from = parseInt(rangeBtn ? rangeBtn.getAttribute('data-from') : '10', 10);
  let to = parseInt(rangeBtn ? rangeBtn.getAttribute('data-to') : '99', 10);
  if(isNaN(from)) from = 10;
  if(isNaN(to)) to = 99;
  if(from > to){ const t=from; from=to; to=t; }
  calcSession.rangeFrom = from;
  calcSession.rangeTo = to;
}

function initCalcSetupSheet(){
  document.querySelectorAll('#calcDifficultyRow .calcChip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#calcDifficultyRow .calcChip').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('#calcQModeRow .calcChip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#calcQModeRow .calcChip').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const wrap = document.getElementById('calcRangeWrap');
      if(wrap) wrap.style.display = btn.getAttribute('data-value')==='range' ? '' : 'none';
    });
  });
  document.querySelectorAll('#calcRangeDigitRow .calcChip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#calcRangeDigitRow .calcChip').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('#calcQCountRow .calcChip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#calcQCountRow .calcChip').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('#calcNumCountRow .calcChip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#calcNumCountRow .calcChip').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  const cancelBtn = document.getElementById('calcSetupCancelBtn');
  if(cancelBtn) cancelBtn.addEventListener('click', closeCalcSetup);
  const startBtn = document.getElementById('calcSetupStartBtn');
  if(startBtn) startBtn.addEventListener('click', ()=>{
    readCalcSetupValues();
    closeCalcSetup();
    startCalcSession();
  });
  const overlay = document.getElementById('calcSetupSheet');
  if(overlay) overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeCalcSetup(); });
}

function currentCalcQuestion(){ return calcSession.questions[calcSession.index]; }

function startCalcSession(){
  calcSession.index = 0;
  calcSession.correct = 0;
  calcSession.wrong = 0;
  calcSession.flagged = {};
  calcSession.questions = generateCalcQuestions();
  calcSession.answerMode = 'mcq';
  const titleEl = document.getElementById('calcSessionTitle');
  if(titleEl) titleEl.textContent = calcOpLabel(calcSession.op);
  updateCalcModeButtons();
  updateCalcStatsDisplay();
  const resultCard = document.getElementById('calcResultCard');
  if(resultCard) resultCard.style.display = 'none';
  const qWrap = document.getElementById('calcQuestionWrap');
  if(qWrap) qWrap.style.display = '';
  const ctrlRow = document.getElementById('calcCtrlRow');
  if(ctrlRow) ctrlRow.style.display = '';
  const modeRow = document.getElementById('calcModeRow');
  // Trig answers (\u221A3/2, 1/\u221A2 ...) can't be typed on a numeric keypad — MCQ only.
  if(modeRow) modeRow.style.display = (calcSession.op === 'trig') ? 'none' : '';
  showCalcPage('session');
  renderCalcQuestion();
}

function renderCalcQuestion(){
  calcSession.answered = false;
  calcSession.typedValue = '';
  const q = currentCalcQuestion();
  if(!q){ finishCalcSession(); return; }
  const qText = document.getElementById('calcQuestionText');
  if(qText){
    const left = q.html ? q.html : q.operands.join(' ' + q.opSymbol + ' ');
    const eq = q.approx ? '\u2248' : '=';
    qText.innerHTML = left + ' ' + eq + ' <span class="calcQMark">?</span>';
  }
  const flagBtn = document.getElementById('calcFlagBtn');
  if(flagBtn) flagBtn.classList.toggle('active', !!calcSession.flagged[calcSession.index]);
  startCalcTimer();
  if(calcSession.answerMode==='mcq') renderCalcMcq(q); else renderCalcTyped();
}

function startCalcTimer(){
  stopCalcTimer();
  calcSession.timerStart = Date.now();
  calcSession.timerInterval = setInterval(updateCalcTimerDisplay, 40);
  updateCalcTimerDisplay();
}
function stopCalcTimer(){
  if(calcSession.timerInterval){ clearInterval(calcSession.timerInterval); calcSession.timerInterval = null; }
}
function updateCalcTimerDisplay(){
  const el = document.getElementById('calcStatTimer');
  if(!el) return;
  const elapsed = Date.now() - calcSession.timerStart;
  const totalCenti = Math.floor(elapsed/10);
  const mins = Math.floor(totalCenti/6000);
  const secs = Math.floor((totalCenti%6000)/100);
  const centi = totalCenti%100;
  el.textContent = String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0')+'.'+String(centi).padStart(2,'0');
}
function updateCalcStatsDisplay(){
  const c = document.getElementById('calcStatCorrect');
  const w = document.getElementById('calcStatWrong');
  if(c) c.textContent = calcSession.correct;
  if(w) w.textContent = calcSession.wrong;
}

function renderCalcMcq(q){
  const ansGrid = document.getElementById('calcAnsGrid');
  const typedWrap = document.getElementById('calcTypedWrap');
  if(ansGrid) ansGrid.style.display = 'grid';
  if(typedWrap) typedWrap.style.display = 'none';
  if(!ansGrid) return;
  ansGrid.innerHTML = '';
  const options = buildCalcMcqOptions(q);
  options.forEach(opt=>{
    const btn = document.createElement('button');
    btn.className = 'calcAnsBtn';
    btn.textContent = opt.label;
    btn.dataset.value = String(opt.value);
    btn.addEventListener('click', ()=> handleCalcAnswer(opt.value, btn));
    ansGrid.appendChild(btn);
  });
}
function renderCalcTyped(){
  const ansGrid = document.getElementById('calcAnsGrid');
  const typedWrap = document.getElementById('calcTypedWrap');
  if(ansGrid) ansGrid.style.display = 'none';
  if(typedWrap) typedWrap.style.display = 'flex';
  const disp = document.getElementById('calcTypedDisplay');
  if(disp){ disp.innerHTML = '&nbsp;'; disp.classList.remove('correct','wrong'); }
  buildCalcKeypad();
}
function buildCalcKeypad(){
  const pad = document.getElementById('calcKeypad');
  if(!pad) return;
  pad.innerHTML = '';
  const keys = ['1','2','3','4','5','6','7','8','9','C','0','\u2713'];
  keys.forEach(k=>{
    const btn = document.createElement('button');
    btn.className = 'calcKeyBtn' + (k==='\u2713' ? ' calcKeySubmit' : '') + (k==='C' ? ' calcKeyClear' : '');
    btn.textContent = k;
    btn.addEventListener('click', ()=> handleCalcKeypad(k));
    pad.appendChild(btn);
  });
}
function handleCalcKeypad(k){
  if(calcSession.answered) return;
  const disp = document.getElementById('calcTypedDisplay');
  if(k==='C'){
    calcSession.typedValue = '';
  } else if(k==='\u2713'){
    if(calcSession.typedValue==='') return;
    submitCalcTypedAnswer();
    return;
  } else if(calcSession.typedValue.length < 8){
    calcSession.typedValue += k;
  }
  if(disp) disp.textContent = calcSession.typedValue===''? '\u00A0' : calcSession.typedValue;
}
function submitCalcTypedAnswer(){
  const q = currentCalcQuestion();
  const val = parseInt(calcSession.typedValue, 10);
  const disp = document.getElementById('calcTypedDisplay');
  const isCorrect = String(val) === String(q.answer);
  markCalcAnswered(isCorrect);
  if(disp){
    disp.classList.add(isCorrect ? 'correct' : 'wrong');
    if(!isCorrect) disp.textContent = calcSession.typedValue + ' (Ans: ' + q.answer + ')';
  }
  scheduleCalcAdvance();
}
function handleCalcAnswer(selected, btnEl){
  if(calcSession.answered) return;
  const q = currentCalcQuestion();
  const isCorrect = String(selected) === String(q.answer);
  markCalcAnswered(isCorrect);
  document.querySelectorAll('#calcAnsGrid .calcAnsBtn').forEach(b=>{
    b.classList.add('disabled');
    if(String(b.dataset.value) === String(q.answer)) b.classList.add('correct');
    else if(b === btnEl) b.classList.add('wrong');
  });
  scheduleCalcAdvance();
}
function markCalcAnswered(isCorrect){
  calcSession.answered = true;
  stopCalcTimer();
  if(isCorrect) calcSession.correct++; else calcSession.wrong++;
  updateCalcStatsDisplay();
}
function scheduleCalcAdvance(){
  if(calcSession.auto){
    setTimeout(advanceCalcQuestion, 20);
  } else {
    showCalcNextButton();
  }
}
function showCalcNextButton(){
  let btn = document.getElementById('calcNextBtn');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'calcNextBtn';
    btn.className = 'calcSheetBtn calcSheetStart';
    btn.style.marginTop = '14px';
    btn.style.width = '100%';
    btn.textContent = 'Next \u2192';
    btn.addEventListener('click', ()=>{
      btn.remove();
      advanceCalcQuestion();
    });
    const page = document.getElementById('calcPage-session');
    if(page) page.appendChild(btn);
  }
}
function advanceCalcQuestion(){
  const existingNext = document.getElementById('calcNextBtn');
  if(existingNext) existingNext.remove();
  calcSession.index++;
  if(calcSession.index >= calcSession.questions.length) finishCalcSession();
  else renderCalcQuestion();
}
function skipCalcQuestion(){
  if(calcSession.answered) return;
  stopCalcTimer();
  advanceCalcQuestion();
}
function toggleCalcFlag(){
  calcSession.flagged[calcSession.index] = !calcSession.flagged[calcSession.index];
  const flagBtn = document.getElementById('calcFlagBtn');
  if(flagBtn) flagBtn.classList.toggle('active', !!calcSession.flagged[calcSession.index]);
}
function toggleCalcAuto(){
  calcSession.auto = !calcSession.auto;
  const btn = document.getElementById('calcAutoBtn');
  if(btn) btn.classList.toggle('active', calcSession.auto);
}
function setCalcAnswerMode(mode){
  if(calcSession.answerMode === mode) return;
  calcSession.answerMode = mode;
  updateCalcModeButtons();
  if(!calcSession.answered){
    const q = currentCalcQuestion();
    if(mode==='mcq') renderCalcMcq(q); else renderCalcTyped();
  }
}
function updateCalcModeButtons(){
  const kb = document.getElementById('calcModeKeyboardBtn');
  const gr = document.getElementById('calcModeGridBtn');
  if(kb) kb.classList.toggle('active', calcSession.answerMode==='typed');
  if(gr) gr.classList.toggle('active', calcSession.answerMode==='mcq');
}
function finishCalcSession(){
  stopCalcTimer();
  const qWrap = document.getElementById('calcQuestionWrap');
  const ctrlRow = document.getElementById('calcCtrlRow');
  const modeRow = document.getElementById('calcModeRow');
  const ansGrid = document.getElementById('calcAnsGrid');
  const typedWrap = document.getElementById('calcTypedWrap');
  if(qWrap) qWrap.style.display = 'none';
  if(ctrlRow) ctrlRow.style.display = 'none';
  if(modeRow) modeRow.style.display = 'none';
  if(ansGrid) ansGrid.style.display = 'none';
  if(typedWrap) typedWrap.style.display = 'none';
  const nextBtn = document.getElementById('calcNextBtn');
  if(nextBtn) nextBtn.remove();
  const total = calcSession.correct + calcSession.wrong;
  const acc = total > 0 ? Math.round((calcSession.correct/total)*100) : 0;
  const statsEl = document.getElementById('calcResultStats');
  if(statsEl){
    statsEl.innerHTML =
      '<div>✅ Correct: <b>' + calcSession.correct + '</b></div>' +
      '<div>❌ Wrong: <b>' + calcSession.wrong + '</b></div>' +
      '<div>🎯 Accuracy: <b>' + acc + '%</b></div>';
  }
  const resultCard = document.getElementById('calcResultCard');
  if(resultCard) resultCard.style.display = 'block';
  // Ticks the "Calculation" task in Today's target list directly (score shown
  // as its note) instead of adding a separate quiz-log row — see
  // markCalcTaskFromQuiz() for the fallback if that task doesn't exist.
  markCalcTaskFromQuiz(calcOpLabel(calcSession.op), calcSession.correct, total);
}

// Every operation (addition, subtraction, multiplication, division) is now
// launched directly from the main Calc menu, so sessions always return there.
function calcSessionOriginPage(){
  return 'menu';
}
function initCalcSession(){
  const backBtn = document.getElementById('calcSessionBackBtn');
  if(backBtn) backBtn.addEventListener('click', ()=>{ stopCalcTimer(); showCalcPage(calcSessionOriginPage()); });
  const skipBtn = document.getElementById('calcSkipBtn');
  if(skipBtn) skipBtn.addEventListener('click', skipCalcQuestion);
  const autoBtn = document.getElementById('calcAutoBtn');
  if(autoBtn) autoBtn.addEventListener('click', toggleCalcAuto);
  const flagBtn = document.getElementById('calcFlagBtn');
  if(flagBtn) flagBtn.addEventListener('click', toggleCalcFlag);
  const kbBtn = document.getElementById('calcModeKeyboardBtn');
  if(kbBtn) kbBtn.addEventListener('click', ()=> setCalcAnswerMode('typed'));
  const grBtn = document.getElementById('calcModeGridBtn');
  if(grBtn) grBtn.addEventListener('click', ()=> setCalcAnswerMode('mcq'));
  const againBtn = document.getElementById('calcResultAgainBtn');
  if(againBtn) againBtn.addEventListener('click', ()=> openCalcSetup(calcSession.op));
  const resBackBtn = document.getElementById('calcResultBackBtn');
  if(resBackBtn) resBackBtn.addEventListener('click', ()=> showCalcPage(calcSessionOriginPage()));
}

// ===== English Vocab Quiz (Calc tab) =====
// DATA FORMAT: add more words here in the same shape. `answer` is the
// 0-based index into `options` that is correct. uv baad mein poore
// vocab sets yahan paste kar sakta hai (jitne chahe utne words/sets).
// [data moved to data/vocab_sets.js]


const vocabSession = { setKey: null, questions: [], index: 0, correct: 0, wrong: 0, answered: false, userAnswers: [] };
const spellingSession = { setKey: null, questions: [], index: 0, correct: 0, wrong: 0, answered: false, userAnswers: [] };

// Har set ke liye display label — "Set 3" jaisa, VOCAB_SETS ke key order se
// nikala jaata hai (set1, set2, ... set21). Naye sets add karne par yeh
// apne aap naye button bana dega, kisi manual HTML edit ki zaroorat nahi.
function vocabSetLabel(key, count){
  const num = (key.match(/\d+/) || [key])[0];
  return 'Set ' + num + ' (' + count + ' Qs)';
}

function buildVocabSetPool(setKey){
  const set = VOCAB_SETS[setKey] || [];
  // Har question object par uski "origin" tag kar do (kaunse set ka kaunsa
  // index) — isi se save/unsave button ko pata chalta hai ki kis question
  // ko toggle karna hai, chahe woh shuffled order mein kahin bhi ho.
  set.forEach((q, i) => { q._setKey = setKey; q._qIndex = i; });
  return set.slice();
}

// ===== Vocab "Saved Questions" — localStorage mein {setKey, qIndex} pairs
// ki list save hoti hai (poora question data nahi), taaki VOCAB_SETS hi
// single source of truth rahe. =====
const VOCAB_SAVED_KEY = 'cgl50-vocab-saved';
function vocabQuestionUid(setKey, qIndex){ return setKey + '#' + qIndex; }
function loadVocabSavedList(){
  try{
    const raw = localStorage.getItem(VOCAB_SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveVocabSavedList(list){
  try{ localStorage.setItem(VOCAB_SAVED_KEY, JSON.stringify(list)); }catch(e){}
}
function isVocabQuestionSaved(setKey, qIndex){
  if(setKey == null || qIndex == null) return false;
  const uid = vocabQuestionUid(setKey, qIndex);
  return loadVocabSavedList().some(it => vocabQuestionUid(it.setKey, it.qIndex) === uid);
}
// Toggle karta hai aur naya saved-state (true/false) return karta hai.
function toggleVocabQuestionSaved(setKey, qIndex){
  if(setKey == null || qIndex == null) return false;
  const list = loadVocabSavedList();
  const uid = vocabQuestionUid(setKey, qIndex);
  const idx = list.findIndex(it => vocabQuestionUid(it.setKey, it.qIndex) === uid);
  let nowSaved;
  if(idx >= 0){ list.splice(idx, 1); nowSaved = false; }
  else { list.push({ setKey, qIndex }); nowSaved = true; }
  saveVocabSavedList(list);
  return nowSaved;
}
function vocabSavedCount(){ return loadVocabSavedList().length; }
// Saved list se actual question objects nikaal kar shuffled pool banata hai.
function buildVocabSavedPool(){
  const list = loadVocabSavedList();
  const pool = [];
  list.forEach(it => {
    const set = VOCAB_SETS[it.setKey];
    const q = set && set[it.qIndex];
    if(!q) return;
    q._setKey = it.setKey;
    q._qIndex = it.qIndex;
    pool.push(q);
  });
  return shuffledCopy(pool);
}
// "Saved Questions" button ke upar live count dikhata hai.
function updateVocabSavedMenuBtn(){
  const lbl = document.getElementById('vocabSavedCountLabel');
  if(lbl) lbl.textContent = vocabSavedCount() + ' saved';
}

function renderVocabSetMenu(){
  const grid = document.getElementById('vocabSetGrid');
  if(!grid) return;
  grid.innerHTML = '';
  Object.keys(VOCAB_SETS).forEach(key => {
    const count = VOCAB_SETS[key].length;
    const label = vocabSetLabel(key, count);
    if(renderQuizAttemptCard(grid, 'vocab', key, '📖', label, () => startVocabQuiz(key))) return;
    const btn = document.createElement('button');
    btn.className = 'calcCard';
    btn.innerHTML =
      '<span class="calcIcon">📖</span>' +
      '<span class="calcLabel">' + escapeHtml(label) + '</span>' +
      '<span class="calcArrow">&#8250;</span>';
    btn.addEventListener('click', () => startVocabQuiz(key));
    grid.appendChild(btn);
  });
}

function startVocabQuiz(setKey){
  // "Practice Again" button se dobara call hone par setKey nahi milta —
  // us case mein pichhle wale set (ya 'saved') ko hi reuse kar lo.
  if(!setKey) setKey = vocabSession.setKey;
  if(!setKey) return;
  const isSaved = setKey === 'saved';
  if(!isSaved && !VOCAB_SETS[setKey]) return;
  vocabSession.setKey = setKey;
  vocabSession.questions = isSaved ? buildVocabSavedPool() : buildVocabSetPool(setKey);
  if(isSaved && vocabSession.questions.length === 0){
    alert('Abhi tak koi vocab question save nahi kiya. Quiz ke dauraan ⭐ button dabakar koi bhi question save kar sakte ho.');
    return;
  }
  vocabSession.index = 0;
  vocabSession.correct = 0;
  vocabSession.wrong = 0;
  vocabSession.answered = false;
  vocabSession.userAnswers = new Array(vocabSession.questions.length).fill(null);
  const titleEl = document.getElementById('vocabQuizTitle');
  if(titleEl) titleEl.textContent = isSaved
    ? 'Vocab Quiz — ⭐ Saved (' + vocabSession.questions.length + ')'
    : 'Vocab Quiz — ' + vocabSetLabel(setKey, vocabSession.questions.length);
  const resultCard = document.getElementById('vocabResultCard');
  if(resultCard) resultCard.style.display = 'none';
  const qWrap = document.getElementById('vocabQuestionWrap');
  if(qWrap) qWrap.style.display = '';
  const ansGrid = document.getElementById('vocabAnsGrid');
  if(ansGrid) ansGrid.style.display = '';
  const solCard = document.getElementById('vocabSolutionCard');
  if(solCard) solCard.style.display = 'none';
  updateVocabStats();
  renderVocabQuestion();
  showCalcPage('vocab');
}

function updateVocabStats(){
  const c = document.getElementById('vocabStatCorrect');
  const w = document.getElementById('vocabStatWrong');
  const p = document.getElementById('vocabStatProgress');
  if(c) c.textContent = vocabSession.correct;
  if(w) w.textContent = vocabSession.wrong;
  if(p) p.textContent = 'Q ' + Math.min(vocabSession.index + 1, vocabSession.questions.length) + '/' + vocabSession.questions.length;
}

function renderVocabQuestion(){
  const q = vocabSession.questions[vocabSession.index];
  if(!q){ endVocabQuiz(); return; }
  vocabSession.answered = false;
  const wordEl = document.getElementById('vocabWordText');
  if(wordEl) wordEl.textContent = q.word;
  const ansGrid = document.getElementById('vocabAnsGrid');
  if(!ansGrid) return;
  ansGrid.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'calcAnsBtn';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectVocabAnswer(i, btn));
    ansGrid.appendChild(btn);
  });
  const solCard = document.getElementById('vocabSolutionCard');
  if(solCard) solCard.style.display = 'none';
  const nextTopBtn = document.getElementById('vocabNextBtnTop');
  const nextTopRow = nextTopBtn ? nextTopBtn.closest('.calcNextTopRow') : null;
  if(nextTopRow) nextTopRow.style.display = 'none';
  updateVocabStats();
  updateVocabSaveBtn(q);
}

// Current question ke hisaab se ⭐ button ka look (filled/outline) set karta hai.
function updateVocabSaveBtn(q){
  const btn = document.getElementById('vocabSaveBtn');
  if(!btn || !q) return;
  const saved = isVocabQuestionSaved(q._setKey, q._qIndex);
  btn.classList.toggle('active', saved);
  btn.textContent = saved ? '★' : '☆';
  btn.setAttribute('aria-label', saved ? 'Saved — tap to remove' : 'Save this question');
}

function selectVocabAnswer(i, btnEl){
  if(vocabSession.answered) return;
  vocabSession.answered = true;
  const q = vocabSession.questions[vocabSession.index];
  const correct = i === q.answer;
  vocabSession.userAnswers[vocabSession.index] = i;
  if(correct) vocabSession.correct++; else vocabSession.wrong++;
  document.querySelectorAll('#vocabAnsGrid .calcAnsBtn').forEach((b, idx) => {
    b.classList.add('disabled');
    if(idx === q.answer) b.classList.add('correct');
    else if(idx === i) b.classList.add('wrong');
  });
  updateVocabStats();

  // Solution dikhao aur user ke "Next" tap ka wait karo (no auto-advance)
  const solCard = document.getElementById('vocabSolutionCard');
  const solText = document.getElementById('vocabSolutionText');
  if(solText){
    const verdict = correct ? '✅ Sahi Jawaab!' : '❌ Galat Jawaab.';
    const correctLine = 'Sahi Meaning: <b>' + escapeHtml(q.options[q.answer]) + '</b>';
    const explLine = (q.explanation && q.explanation.length)
      ? '<div style="margin-top:6px;color:var(--muted);">' + (Array.isArray(q.explanation) ? q.explanation.map(b=>escapeHtml(b)).join('<br>') : escapeHtml(q.explanation)) + '</div>'
      : '';
    solText.innerHTML = '<div>' + verdict + '</div><div style="margin-top:4px;">' + correctLine + '</div>' + explLine;
  }
  if(solCard) solCard.style.display = 'block';
  const nextTopBtn2 = document.getElementById('vocabNextBtnTop');
  const nextTopRow2 = nextTopBtn2 ? nextTopBtn2.closest('.calcNextTopRow') : null;
  if(nextTopRow2) nextTopRow2.style.display = 'flex';
}

function goToNextVocabQuestion(){
  vocabSession.index++;
  if(vocabSession.index < vocabSession.questions.length) renderVocabQuestion();
  else endVocabQuiz();
}

function endVocabQuiz(){
  const total = vocabSession.correct + vocabSession.wrong;
  const acc = total ? Math.round((vocabSession.correct / total) * 100) : 0;
  const qWrap = document.getElementById('vocabQuestionWrap');
  if(qWrap) qWrap.style.display = 'none';
  const ansGrid = document.getElementById('vocabAnsGrid');
  if(ansGrid) ansGrid.style.display = 'none';
  const solCard = document.getElementById('vocabSolutionCard');
  if(solCard) solCard.style.display = 'none';
  const statsEl = document.getElementById('vocabResultStats');
  if(statsEl){
    statsEl.innerHTML =
      '<div>✅ Correct: <b>' + vocabSession.correct + '</b></div>' +
      '<div>❌ Wrong: <b>' + vocabSession.wrong + '</b></div>' +
      '<div>🎯 Accuracy: <b>' + acc + '%</b></div>';
  }
  const resultCard = document.getElementById('vocabResultCard');
  if(resultCard) resultCard.style.display = 'block';
  const titleEl = document.getElementById('vocabQuizTitle');
  logQuizActivity(titleEl ? titleEl.textContent : 'Vocab Quiz', vocabSession.correct, total);
  markQuizSetAttempted('vocab', vocabSession.setKey);
  if(vocabSession.setKey !== 'saved'){
    saveQuizAttemptDetail('vocab', vocabSession.setKey, {
      correct: vocabSession.correct, wrong: vocabSession.wrong, total, acc,
      items: buildWordSchemeReviewItems(vocabSession.questions, vocabSession.userAnswers)
    });
  }
  ensureResultTopReattemptBtn(resultCard, () => startVocabQuiz(vocabSession.setKey));
  renderVocabSetMenu();
}

function initVocabQuiz(){
  renderVocabSetMenu();
  updateVocabSavedMenuBtn();
  // "Vocab Quiz" card ab seedha quiz shuru nahi karta — pehle set choose
  // karne ke liye list dikhata hai (25-25 questions ke alag-alag sets).
  const vocabBtn = document.getElementById('calcVocabBtn');
  if(vocabBtn) vocabBtn.addEventListener('click', () => showCalcPage('vocabmenu'));
  // "Saved Questions" button — set-menu ke sabse upar — bookmarked
  // questions ka apna mini-quiz shuru karta hai.
  const savedBtn = document.getElementById('vocabSavedBtn');
  if(savedBtn) savedBtn.addEventListener('click', () => startVocabQuiz('saved'));
  // ⭐ Save/unsave toggle — jo bhi question abhi screen par hai usko
  // save karta hai (ya already saved ho to hata deta hai).
  const saveBtn = document.getElementById('vocabSaveBtn');
  if(saveBtn) saveBtn.addEventListener('click', () => {
    const q = vocabSession.questions[vocabSession.index];
    if(!q || q._setKey == null || q._qIndex == null) return;
    toggleVocabQuestionSaved(q._setKey, q._qIndex);
    updateVocabSaveBtn(q);
    updateVocabSavedMenuBtn();
  });
  const homeVocabBtn = document.getElementById('homeVocabBtn');
  if(homeVocabBtn) homeVocabBtn.addEventListener('click', () => { switchTab('calc'); });
  const homeTargetBtn = document.getElementById('homeTargetBtn');
  if(homeTargetBtn) homeTargetBtn.addEventListener('click', () => { switchTab('today'); });
  const vocabMenuBackBtn = document.getElementById('vocabMenuBackBtn');
  if(vocabMenuBackBtn) vocabMenuBackBtn.addEventListener('click', () => showCalcPage('menu'));
  const nextBtn = document.getElementById('vocabNextBtn');
  if(nextBtn) nextBtn.addEventListener('click', goToNextVocabQuestion);
  const nextBtnTop = document.getElementById('vocabNextBtnTop');
  if(nextBtnTop) nextBtnTop.addEventListener('click', goToNextVocabQuestion);
  attachQuizSwipeNext('calcPage-vocab', goToNextVocabQuestion);
  const backBtn = document.getElementById('vocabBackBtn');
  if(backBtn) backBtn.addEventListener('click', () => showCalcPage('vocabmenu'));
  const againBtn = document.getElementById('vocabResultAgainBtn');
  if(againBtn) againBtn.addEventListener('click', () => startVocabQuiz());
  const resBackBtn = document.getElementById('vocabResultBackBtn');
  if(resBackBtn) resBackBtn.addEventListener('click', () => showCalcPage('vocabmenu'));

  // "Spelling" card — Vocab Quiz jaisa hi do-step flow: pehle Set choose
  // karo (calcPage-spellingmenu), phir quiz shuru hota hai (calcPage-spelling).
  const spellingBtn = document.getElementById('calcSpellingBtn');
  if(spellingBtn) spellingBtn.addEventListener('click', () => showCalcPage('spellingmenu'));
  const spellingMenuBackBtn = document.getElementById('spellingMenuBackBtn');
  if(spellingMenuBackBtn) spellingMenuBackBtn.addEventListener('click', () => showCalcPage('menu'));
  const spellingBackBtn = document.getElementById('spellingBackBtn');
  if(spellingBackBtn) spellingBackBtn.addEventListener('click', () => showCalcPage('spellingmenu'));
  const spellingNextBtn = document.getElementById('spellingNextBtn');
  if(spellingNextBtn) spellingNextBtn.addEventListener('click', goToNextSpellingQuestion);
  const spellingNextBtnTop = document.getElementById('spellingNextBtnTop');
  if(spellingNextBtnTop) spellingNextBtnTop.addEventListener('click', goToNextSpellingQuestion);
  attachQuizSwipeNext('calcPage-spelling', goToNextSpellingQuestion);
  const spellingAgainBtn = document.getElementById('spellingResultAgainBtn');
  if(spellingAgainBtn) spellingAgainBtn.addEventListener('click', () => startSpellingQuiz());
  const spellingResBackBtn = document.getElementById('spellingResultBackBtn');
  if(spellingResBackBtn) spellingResBackBtn.addEventListener('click', () => showCalcPage('spellingmenu'));
  // "Saved Questions" button — set-menu ke sabse upar — bookmarked
  // spelling questions ka apna mini-quiz shuru karta hai.
  const spellingSavedBtn = document.getElementById('spellingSavedBtn');
  if(spellingSavedBtn) spellingSavedBtn.addEventListener('click', () => startSpellingQuiz('saved'));
  // ⭐ Save/unsave toggle — jo bhi question abhi screen par hai usko
  // save karta hai (ya already saved ho to hata deta hai).
  const spellingSaveBtn = document.getElementById('spellingSaveBtn');
  if(spellingSaveBtn) spellingSaveBtn.addEventListener('click', () => {
    const q = spellingSession.questions[spellingSession.index];
    if(!q || q._setKey == null || q._qIndex == null) return;
    toggleSpellingQuestionSaved(q._setKey, q._qIndex);
    updateSpellingSaveBtn(q);
    updateSpellingSavedMenuBtn();
  });

  // "Idioms & Phrases" card — ab teen-step flow: Theme choose karo
  // (calcPage-idiommenu), agar theme multi-part hai to Part choose karo
  // (calcPage-idiomsetmenu), phir quiz shuru hota hai (calcPage-idiom).
  const idiomBtn = document.getElementById('calcIdiomBtn');
  if(idiomBtn) idiomBtn.addEventListener('click', () => showCalcPage('idiommenu'));
  const idiomMenuBackBtn = document.getElementById('idiomMenuBackBtn');
  if(idiomMenuBackBtn) idiomMenuBackBtn.addEventListener('click', () => showCalcPage('menu'));
  const idiomSetMenuBackBtn = document.getElementById('idiomSetMenuBackBtn');
  if(idiomSetMenuBackBtn) idiomSetMenuBackBtn.addEventListener('click', () => showCalcPage('idiommenu'));
  const idiomBackBtn = document.getElementById('idiomBackBtn');
  if(idiomBackBtn) idiomBackBtn.addEventListener('click', () => showCalcPage(idiomSession.returnPage || 'idiommenu'));
  const idiomNextBtn = document.getElementById('idiomNextBtn');
  if(idiomNextBtn) idiomNextBtn.addEventListener('click', goToNextIdiomQuestion);
  const idiomNextBtnTop = document.getElementById('idiomNextBtnTop');
  if(idiomNextBtnTop) idiomNextBtnTop.addEventListener('click', goToNextIdiomQuestion);
  attachQuizSwipeNext('calcPage-idiom', goToNextIdiomQuestion);
  const idiomAgainBtn = document.getElementById('idiomResultAgainBtn');
  if(idiomAgainBtn) idiomAgainBtn.addEventListener('click', () => startIdiomQuiz());
  const idiomResBackBtn = document.getElementById('idiomResultBackBtn');
  if(idiomResBackBtn) idiomResBackBtn.addEventListener('click', () => showCalcPage(idiomSession.returnPage || 'idiommenu'));
  // "Saved Questions" button — theme-list ke sabse upar — bookmarked
  // idioms ka apna mini-quiz shuru karta hai.
  const idiomSavedBtn = document.getElementById('idiomSavedBtn');
  if(idiomSavedBtn) idiomSavedBtn.addEventListener('click', () => {
    idiomSession.themeName = null;
    idiomSession.returnPage = 'idiommenu';
    startIdiomQuiz('saved');
  });
  // ⭐ Save/unsave toggle — jo bhi question abhi screen par hai usko
  // save karta hai (ya already saved ho to hata deta hai).
  const idiomSaveBtn = document.getElementById('idiomSaveBtn');
  if(idiomSaveBtn) idiomSaveBtn.addEventListener('click', () => {
    const q = idiomSession.questions[idiomSession.index];
    if(!q || q._setKey == null || q._qIndex == null) return;
    toggleIdiomQuestionSaved(q._setKey, q._qIndex);
    updateIdiomSaveBtn(q);
    updateIdiomSavedMenuBtn();
  });

  initSpellingQuiz();
  initIdiomQuiz();
  initGrammarQuiz();
}

// ===== Spelling Quiz (Learn/Calc tab) =====
// DATA FORMAT: SPELLING_SETS.setN = array of up to 25 questions, each
// { options: [4 DIFFERENT real words], answer: <0-based index of the ONE
//   misspelled word>, correct: <correct spelling of that word> }.
// 3 options are correctly-spelled real words, 1 is a deliberate
//   misspelling — user has to spot the wrong one (SSC 'Spot the
//   misspelt word' format).
// 1764 unique words total ('Accommodate' se 'Zucchini' tak, poori spellings
// file ke sabhi practice blocks + Set 1: Hard list se, duplicates hata kar)
// ko 4-4 ke groups mein baant kar banaya gaya hai — har word poore bank mein
// sirf EK hi jagah (kisi ek question ke option ke roop mein) istemal hota hai,
// kahin dobara reuse nahi hota.
// [data moved to data/spelling_sets.js]


function spellingSetLabel(key, count){
  const num = (key.match(/\d+/) || [key])[0];
  return 'Set ' + num + ' (' + count + ' Qs)';
}

function buildSpellingSetPool(setKey){
  const set = SPELLING_SETS[setKey] || [];
  // Har question par origin tag kar do (kaunse set ka kaunsa index) — isi
  // se save/unsave button ko pata chalta hai ki kis question ko toggle
  // karna hai, chahe woh shuffled order mein kahin bhi ho.
  set.forEach((q, i) => { q._setKey = setKey; q._qIndex = i; });
  return set.slice();
}

// ===== Spelling "Saved Questions" — localStorage mein {setKey, qIndex}
// pairs ki list save hoti hai (poora question data nahi), taaki
// SPELLING_SETS hi single source of truth rahe. Vocab wale pattern jaisa hi. =====
const SPELLING_SAVED_KEY = 'cgl50-spelling-saved';
function spellingQuestionUid(setKey, qIndex){ return setKey + '#' + qIndex; }
function loadSpellingSavedList(){
  try{
    const raw = localStorage.getItem(SPELLING_SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveSpellingSavedList(list){
  try{ localStorage.setItem(SPELLING_SAVED_KEY, JSON.stringify(list)); }catch(e){}
}
function isSpellingQuestionSaved(setKey, qIndex){
  if(setKey == null || qIndex == null) return false;
  const uid = spellingQuestionUid(setKey, qIndex);
  return loadSpellingSavedList().some(it => spellingQuestionUid(it.setKey, it.qIndex) === uid);
}
function toggleSpellingQuestionSaved(setKey, qIndex){
  if(setKey == null || qIndex == null) return false;
  const list = loadSpellingSavedList();
  const uid = spellingQuestionUid(setKey, qIndex);
  const idx = list.findIndex(it => spellingQuestionUid(it.setKey, it.qIndex) === uid);
  let nowSaved;
  if(idx >= 0){ list.splice(idx, 1); nowSaved = false; }
  else { list.push({ setKey, qIndex }); nowSaved = true; }
  saveSpellingSavedList(list);
  return nowSaved;
}
function spellingSavedCount(){ return loadSpellingSavedList().length; }
function buildSpellingSavedPool(){
  const list = loadSpellingSavedList();
  const pool = [];
  list.forEach(it => {
    const set = SPELLING_SETS[it.setKey];
    const q = set && set[it.qIndex];
    if(!q) return;
    q._setKey = it.setKey;
    q._qIndex = it.qIndex;
    pool.push(q);
  });
  return shuffledCopy(pool);
}
function updateSpellingSavedMenuBtn(){
  const lbl = document.getElementById('spellingSavedCountLabel');
  if(lbl) lbl.textContent = spellingSavedCount() + ' saved';
}

function renderSpellingSetMenu(){
  const grid = document.getElementById('spellingSetGrid');
  if(!grid) return;
  grid.innerHTML = '';
  Object.keys(SPELLING_SETS).forEach(key => {
    const count = SPELLING_SETS[key].length;
    const label = spellingSetLabel(key, count);
    if(renderQuizAttemptCard(grid, 'spelling', key, '<span class="icoEdit" aria-hidden="true"></span>', label, () => startSpellingQuiz(key))) return;
    const btn = document.createElement('button');
    btn.className = 'calcCard';
    btn.innerHTML =
      '<span class="calcIcon"><span class="icoEdit" aria-hidden="true"></span></span>' +
      '<span class="calcLabel">' + escapeHtml(label) + '</span>' +
      '<span class="calcArrow">&#8250;</span>';
    btn.addEventListener('click', () => startSpellingQuiz(key));
    grid.appendChild(btn);
  });
}

function startSpellingQuiz(setKey){
  if(!setKey) setKey = spellingSession.setKey;
  if(!setKey) return;
  const isSaved = setKey === 'saved';
  if(!isSaved && !SPELLING_SETS[setKey]) return;
  spellingSession.setKey = setKey;
  spellingSession.questions = isSaved ? buildSpellingSavedPool() : buildSpellingSetPool(setKey);
  if(isSaved && spellingSession.questions.length === 0){
    alert('Abhi tak koi spelling question save nahi kiya. Quiz ke dauraan ⭐ button dabakar koi bhi question save kar sakte ho.');
    return;
  }
  spellingSession.index = 0;
  spellingSession.correct = 0;
  spellingSession.wrong = 0;
  spellingSession.answered = false;
  spellingSession.userAnswers = new Array(spellingSession.questions.length).fill(null);
  const titleEl = document.getElementById('spellingQuizTitle');
  if(titleEl) titleEl.textContent = isSaved
    ? 'Spelling — ⭐ Saved (' + spellingSession.questions.length + ')'
    : 'Spelling — ' + spellingSetLabel(setKey, spellingSession.questions.length);
  const resultCard = document.getElementById('spellingResultCard');
  if(resultCard) resultCard.style.display = 'none';
  const qWrap = document.getElementById('spellingQuestionWrap');
  if(qWrap) qWrap.style.display = '';
  const ansGrid = document.getElementById('spellingAnsGrid');
  if(ansGrid) ansGrid.style.display = '';
  const solCard = document.getElementById('spellingSolutionCard');
  if(solCard) solCard.style.display = 'none';
  updateSpellingStats();
  renderSpellingQuestion();
  showCalcPage('spelling');
}

function updateSpellingStats(){
  const c = document.getElementById('spellingStatCorrect');
  const w = document.getElementById('spellingStatWrong');
  const p = document.getElementById('spellingStatProgress');
  if(c) c.textContent = spellingSession.correct;
  if(w) w.textContent = spellingSession.wrong;
  if(p) p.textContent = 'Q ' + Math.min(spellingSession.index + 1, spellingSession.questions.length) + '/' + spellingSession.questions.length;
}

function renderSpellingQuestion(){
  const q = spellingSession.questions[spellingSession.index];
  if(!q){ endSpellingQuiz(); return; }
  spellingSession.answered = false;
  const wordEl = document.getElementById('spellingWordText');
  if(wordEl){
    wordEl.classList.remove('spellingRevealWord');
    wordEl.textContent = q.word || 'Galat spelling waala word chuno';
  }
  const ansGrid = document.getElementById('spellingAnsGrid');
  if(!ansGrid) return;
  ansGrid.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'calcAnsBtn';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectSpellingAnswer(i, btn));
    ansGrid.appendChild(btn);
  });
  const solCard = document.getElementById('spellingSolutionCard');
  if(solCard) solCard.style.display = 'none';
  const nextTopBtn = document.getElementById('spellingNextBtnTop');
  const nextTopRow = nextTopBtn ? nextTopBtn.closest('.calcNextTopRow') : null;
  if(nextTopRow) nextTopRow.style.display = 'none';
  updateSpellingStats();
  updateSpellingSaveBtn(q);
}

// Current question ke hisaab se ⭐ button ka look (filled/outline) set karta hai.
function updateSpellingSaveBtn(q){
  const btn = document.getElementById('spellingSaveBtn');
  if(!btn || !q) return;
  const saved = isSpellingQuestionSaved(q._setKey, q._qIndex);
  btn.classList.toggle('active', saved);
  btn.textContent = saved ? '★' : '☆';
  btn.setAttribute('aria-label', saved ? 'Saved — tap to remove' : 'Save this question');
}

function selectSpellingAnswer(i, btnEl){
  if(spellingSession.answered) return;
  spellingSession.answered = true;
  const q = spellingSession.questions[spellingSession.index];
  const correct = i === q.answer;
  spellingSession.userAnswers[spellingSession.index] = i;
  if(correct) spellingSession.correct++; else spellingSession.wrong++;
  document.querySelectorAll('#spellingAnsGrid .calcAnsBtn').forEach((b, idx) => {
    b.classList.add('disabled');
    if(idx === q.answer) b.classList.add('correct');
    else if(idx === i) b.classList.add('wrong');
  });
  updateSpellingStats();
  const correctWord = q.correct || q.options[q.answer];
  const wordEl2 = document.getElementById('spellingWordText');
  if(wordEl2){
    wordEl2.classList.add('spellingRevealWord');
    wordEl2.innerHTML = 'Sahi Spelling: ' + escapeHtml(correctWord);
  }
  const solCard = document.getElementById('spellingSolutionCard');
  const solText = document.getElementById('spellingSolutionText');
  if(solText){
    const verdict = correct ? '✅ Sahi Jawaab!' : '❌ Galat Jawaab.';
    const explLine = (q.explanation && q.explanation.length)
      ? '<div style="margin-top:6px;color:var(--muted);">' + (Array.isArray(q.explanation) ? q.explanation.map(b=>escapeHtml(b)).join('<br>') : escapeHtml(q.explanation)) + '</div>'
      : '';
    solText.innerHTML = '<div>' + verdict + '</div>' + explLine;
  }
  if(solCard) solCard.style.display = 'block';
  const nextTopBtn2 = document.getElementById('spellingNextBtnTop');
  const nextTopRow2 = nextTopBtn2 ? nextTopBtn2.closest('.calcNextTopRow') : null;
  if(nextTopRow2) nextTopRow2.style.display = 'flex';
}

function goToNextSpellingQuestion(){
  spellingSession.index++;
  if(spellingSession.index < spellingSession.questions.length) renderSpellingQuestion();
  else endSpellingQuiz();
}

function endSpellingQuiz(){
  const total = spellingSession.correct + spellingSession.wrong;
  const acc = total ? Math.round((spellingSession.correct / total) * 100) : 0;
  const qWrap = document.getElementById('spellingQuestionWrap');
  if(qWrap) qWrap.style.display = 'none';
  const ansGrid = document.getElementById('spellingAnsGrid');
  if(ansGrid) ansGrid.style.display = 'none';
  const solCard = document.getElementById('spellingSolutionCard');
  if(solCard) solCard.style.display = 'none';
  const statsEl = document.getElementById('spellingResultStats');
  if(statsEl){
    statsEl.innerHTML =
      '<div>✅ Correct: <b>' + spellingSession.correct + '</b></div>' +
      '<div>❌ Wrong: <b>' + spellingSession.wrong + '</b></div>' +
      '<div>🎯 Accuracy: <b>' + acc + '%</b></div>';
  }
  const resultCard = document.getElementById('spellingResultCard');
  if(resultCard) resultCard.style.display = 'block';
  const titleEl = document.getElementById('spellingQuizTitle');
  logQuizActivity(titleEl ? titleEl.textContent : 'Spelling', spellingSession.correct, total);
  markQuizSetAttempted('spelling', spellingSession.setKey);
  if(spellingSession.setKey !== 'saved'){
    saveQuizAttemptDetail('spelling', spellingSession.setKey, {
      correct: spellingSession.correct, wrong: spellingSession.wrong, total, acc,
      items: buildWordSchemeReviewItems(spellingSession.questions, spellingSession.userAnswers)
    });
  }
  ensureResultTopReattemptBtn(resultCard, () => startSpellingQuiz(spellingSession.setKey));
  renderSpellingSetMenu();
}

function initSpellingQuiz(){
  renderSpellingSetMenu();
  updateSpellingSavedMenuBtn();
}

// ===== Idioms & Phrases Quiz (Learn/Calc tab) =====
// DATA FORMAT: same shape as VOCAB_SETS -- { word, options, answer,
// explanation }. 'word' field mein idiom ka sawaal hota hai, options
// mein 4 possible meanings, 'answer' sahi meaning ka 0-based index hai.
const idiomSession = { setKey: null, questions: [], index: 0, correct: 0, wrong: 0, answered: false, themeName: null, returnPage: 'idiommenu', userAnswers: [] };
const grammarSession = { setKey: null, questions: [], index: 0, correct: 0, wrong: 0, answered: false, userAnswers: [] };

// [data moved to data/idiom_sets.js]

const IDIOM_SET_LABELS = {
  t_general_life_1: "General Life & Everyday Situations - Part 1",
  t_general_life_2: "General Life & Everyday Situations - Part 2",
  t_general_life_3: "General Life & Everyday Situations - Part 3",
  t_general_life_4: "General Life & Everyday Situations - Part 4",
  t_general_life_5: "General Life & Everyday Situations - Part 5",
  t_general_life_6: "General Life & Everyday Situations - Part 6",
  t_general_life_7: "General Life & Everyday Situations - Part 7",
  t_general_life_8: "General Life & Everyday Situations - Part 8",
  t_general_life_9: "General Life & Everyday Situations - Part 9",
  t_general_life_10: "General Life & Everyday Situations - Part 10",
  t_general_life_11: "General Life & Everyday Situations - Part 11",
  t_general_life_12: "General Life & Everyday Situations - Part 12",
  t_general_life_13: "General Life & Everyday Situations - Part 13",
  t_general_life_14: "General Life & Everyday Situations - Part 14",
  t_general_life_15: "General Life & Everyday Situations - Part 15",
  t_general_life_16: "General Life & Everyday Situations - Part 16",
  t_general_life_17: "General Life & Everyday Situations - Part 17",
  t_general_life_18: "General Life & Everyday Situations - Part 18",
  t_general_life_19: "General Life & Everyday Situations - Part 19",
  t_general_life_20: "General Life & Everyday Situations - Part 20",
  t_general_life_21: "General Life & Everyday Situations - Part 21",
  t_general_life_22: "General Life & Everyday Situations - Part 22",
  t_general_life_23: "General Life & Everyday Situations - Part 23",
  t_general_life_24: "General Life & Everyday Situations - Part 24",
  t_general_life_25: "General Life & Everyday Situations - Part 25",
  t_general_life_26: "General Life & Everyday Situations - Part 26",
  t_general_life_27: "General Life & Everyday Situations - Part 27",
  t_general_life_28: "General Life & Everyday Situations - Part 28",
  t_general_life_29: "General Life & Everyday Situations - Part 29",
  t_general_life_30: "General Life & Everyday Situations - Part 30",
  t_general_life_31: "General Life & Everyday Situations - Part 31",
  t_general_life_32: "General Life & Everyday Situations - Part 32",
  t_general_life_33: "General Life & Everyday Situations - Part 33",
  t_general_life_34: "General Life & Everyday Situations - Part 34",
  t_general_life_35: "General Life & Everyday Situations - Part 35",
  t_general_life_36: "General Life & Everyday Situations - Part 36",
  t_general_life_37: "General Life & Everyday Situations - Part 37",
  t_general_life_38: "General Life & Everyday Situations - Part 38",
  t_general_life_39: "General Life & Everyday Situations - Part 39",
  t_general_life_40: "General Life & Everyday Situations - Part 40",
  t_general_life_41: "General Life & Everyday Situations - Part 41",
  t_general_life_42: "General Life & Everyday Situations - Part 42",
  t_general_life_43: "General Life & Everyday Situations - Part 43",
  t_general_life_44: "General Life & Everyday Situations - Part 44",
  t_general_life_45: "General Life & Everyday Situations - Part 45",
  t_anger_1: "Anger, Conflict & Fighting - Part 1",
  t_anger_2: "Anger, Conflict & Fighting - Part 2",
  t_anger_3: "Anger, Conflict & Fighting - Part 3",
  t_anger_4: "Anger, Conflict & Fighting - Part 4",
  t_anger_5: "Anger, Conflict & Fighting - Part 5",
  t_anger_6: "Anger, Conflict & Fighting - Part 6",
  t_anger_7: "Anger, Conflict & Fighting - Part 7",
  t_anger_8: "Anger, Conflict & Fighting - Part 8",
  t_anger_9: "Anger, Conflict & Fighting - Part 9",
  t_anger_10: "Anger, Conflict & Fighting - Part 10",
  t_anger_11: "Anger, Conflict & Fighting - Part 11",
  t_anger_12: "Anger, Conflict & Fighting - Part 12",
  t_failure_1: "Failure, Defeat & Mistakes - Part 1",
  t_failure_2: "Failure, Defeat & Mistakes - Part 2",
  t_failure_3: "Failure, Defeat & Mistakes - Part 3",
  t_failure_4: "Failure, Defeat & Mistakes - Part 4",
  t_failure_5: "Failure, Defeat & Mistakes - Part 5",
  t_failure_6: "Failure, Defeat & Mistakes - Part 6",
  t_failure_7: "Failure, Defeat & Mistakes - Part 7",
  t_failure_8: "Failure, Defeat & Mistakes - Part 8",
  t_happiness_1: "Happiness, Joy & Celebration - Part 1",
  t_happiness_2: "Happiness, Joy & Celebration - Part 2",
  t_happiness_3: "Happiness, Joy & Celebration - Part 3",
  t_happiness_4: "Happiness, Joy & Celebration - Part 4",
  t_happiness_5: "Happiness, Joy & Celebration - Part 5",
  t_happiness_6: "Happiness, Joy & Celebration - Part 6",
  t_animals_1: "Animals & Nature - Part 1",
  t_animals_2: "Animals & Nature - Part 2",
  t_animals_3: "Animals & Nature - Part 3",
  t_animals_4: "Animals & Nature - Part 4",
  t_animals_5: "Animals & Nature - Part 5",
  t_food_1: "Food, Eating & Drink - Part 1",
  t_food_2: "Food, Eating & Drink - Part 2",
  t_food_3: "Food, Eating & Drink - Part 3",
  t_behavior_1: "Behavior, Character & Personality - Part 1",
  t_behavior_2: "Behavior, Character & Personality - Part 2",
  t_behavior_3: "Behavior, Character & Personality - Part 3",
  t_hard_work_1: "Hard Work, Effort & Laziness - Part 1",
  t_hard_work_2: "Hard Work, Effort & Laziness - Part 2",
  t_hard_work_3: "Hard Work, Effort & Laziness - Part 3",
  t_comparison_1: "Comparison, Similarity & Extremes - Part 1",
  t_comparison_2: "Comparison, Similarity & Extremes - Part 2",
  t_comparison_3: "Comparison, Similarity & Extremes - Part 3",
  t_work_1: "Work, Career & Duty",
  t_people_1: "People & Character Types",
  t_time_1: "Time, Punctuality & Speed - Part 1",
  t_time_2: "Time, Punctuality & Speed - Part 2",
  t_time_3: "Time, Punctuality & Speed - Part 3",
  t_time_4: "Time, Punctuality & Speed - Part 4",
  t_time_5: "Time, Punctuality & Speed - Part 5",
  t_time_6: "Time, Punctuality & Speed - Part 6",
  t_time_7: "Time, Punctuality & Speed - Part 7",
  t_time_8: "Time, Punctuality & Speed - Part 8",
  t_time_9: "Time, Punctuality & Speed - Part 9",
  t_time_10: "Time, Punctuality & Speed - Part 10",
  t_time_11: "Time, Punctuality & Speed - Part 11",
  t_speech_1: "Speech, Communication & Silence - Part 1",
  t_speech_2: "Speech, Communication & Silence - Part 2",
  t_speech_3: "Speech, Communication & Silence - Part 3",
  t_speech_4: "Speech, Communication & Silence - Part 4",
  t_speech_5: "Speech, Communication & Silence - Part 5",
  t_speech_6: "Speech, Communication & Silence - Part 6",
  t_speech_7: "Speech, Communication & Silence - Part 7",
  t_speech_8: "Speech, Communication & Silence - Part 8",
  t_speech_9: "Speech, Communication & Silence - Part 9",
  t_health_1: "Health, Sickness & Death - Part 1",
  t_health_2: "Health, Sickness & Death - Part 2",
  t_health_3: "Health, Sickness & Death - Part 3",
  t_health_4: "Health, Sickness & Death - Part 4",
  t_health_5: "Health, Sickness & Death - Part 5",
  t_health_6: "Health, Sickness & Death - Part 6",
  t_health_7: "Health, Sickness & Death - Part 7",
  t_honesty_1: "Honesty, Deception & Lies - Part 1",
  t_honesty_2: "Honesty, Deception & Lies - Part 2",
  t_honesty_3: "Honesty, Deception & Lies - Part 3",
  t_honesty_4: "Honesty, Deception & Lies - Part 4",
  t_understanding_1: "Understanding, Memory & Realization - Part 1",
  t_understanding_2: "Understanding, Memory & Realization - Part 2",
  t_understanding_3: "Understanding, Memory & Realization - Part 3",
  t_fear_1: "Fear, Courage & Bravery - Part 1",
  t_fear_2: "Fear, Courage & Bravery - Part 2",
  t_fear_3: "Fear, Courage & Bravery - Part 3",
  t_power_1: "Power, Control & Freedom - Part 1",
  t_power_2: "Power, Control & Freedom - Part 2",
  t_power_3: "Power, Control & Freedom - Part 3",
  t_quantity_1: "Quantity, Measurement & Extent - Part 1",
  t_quantity_2: "Quantity, Measurement & Extent - Part 2",
  t_help_1: "Help, Support & Kindness - Part 1",
  t_help_2: "Help, Support & Kindness - Part 2",
  t_warning_1: "Warning, Caution & Risk",
  t_difficulty_1: "Difficulty, Trouble & Problems - Part 1",
  t_difficulty_2: "Difficulty, Trouble & Problems - Part 2",
  t_difficulty_3: "Difficulty, Trouble & Problems - Part 3",
  t_difficulty_4: "Difficulty, Trouble & Problems - Part 4",
  t_difficulty_5: "Difficulty, Trouble & Problems - Part 5",
  t_difficulty_6: "Difficulty, Trouble & Problems - Part 6",
  t_difficulty_7: "Difficulty, Trouble & Problems - Part 7",
  t_difficulty_8: "Difficulty, Trouble & Problems - Part 8",
  t_difficulty_9: "Difficulty, Trouble & Problems - Part 9",
  t_money_1: "Money, Wealth & Poverty - Part 1",
  t_money_2: "Money, Wealth & Poverty - Part 2",
  t_money_3: "Money, Wealth & Poverty - Part 3",
  t_money_4: "Money, Wealth & Poverty - Part 4",
  t_money_5: "Money, Wealth & Poverty - Part 5",
  t_money_6: "Money, Wealth & Poverty - Part 6",
  t_money_7: "Money, Wealth & Poverty - Part 7",
  t_money_8: "Money, Wealth & Poverty - Part 8",
  t_money_9: "Money, Wealth & Poverty - Part 9",
  t_change_1: "Change, Beginning & End - Part 1",
  t_change_2: "Change, Beginning & End - Part 2",
  t_change_3: "Change, Beginning & End - Part 3",
  t_change_4: "Change, Beginning & End - Part 4",
  t_change_5: "Change, Beginning & End - Part 5",
  t_change_6: "Change, Beginning & End - Part 6",
  t_change_7: "Change, Beginning & End - Part 7",
  t_success_1: "Success, Achievement & Winning - Part 1",
  t_success_2: "Success, Achievement & Winning - Part 2",
  t_success_3: "Success, Achievement & Winning - Part 3",
  t_success_4: "Success, Achievement & Winning - Part 4",
  t_success_5: "Success, Achievement & Winning - Part 5",
  t_wisdom_1: "Wisdom, Intelligence & Foolishness - Part 1",
  t_wisdom_2: "Wisdom, Intelligence & Foolishness - Part 2",
  t_wisdom_3: "Wisdom, Intelligence & Foolishness - Part 3",
  t_wisdom_4: "Wisdom, Intelligence & Foolishness - Part 4",
  t_sadness_1: "Sadness, Grief & Disappointment - Part 1",
  t_sadness_2: "Sadness, Grief & Disappointment - Part 2",
  t_sadness_3: "Sadness, Grief & Disappointment - Part 3",
  t_secrecy_1: "Secrecy, Trust & Betrayal - Part 1",
  t_secrecy_2: "Secrecy, Trust & Betrayal - Part 2",
  t_secrecy_3: "Secrecy, Trust & Betrayal - Part 3",
  t_surprise_1: "Surprise, Confusion & Uncertainty - Part 1",
  t_surprise_2: "Surprise, Confusion & Uncertainty - Part 2",
  t_ease_1: "Ease, Comfort & Simplicity - Part 1",
  t_ease_2: "Ease, Comfort & Simplicity - Part 2",
  t_escape_1: "Escape, Avoidance & Evasion",
  t_mixed_themes_1: "Mixed Themes (Love, Places, Shame, Luck, Habits, Appearance, Progress, Chaos) - Part 1",
  t_mixed_themes_2: "Mixed Themes (Love, Places, Shame, Luck, Habits, Appearance, Progress, Chaos) - Part 2",
  t_mixed_themes_3: "Mixed Themes (Love, Places, Shame, Luck, Habits, Appearance, Progress, Chaos) - Part 3",
  t_mixed_themes_4: "Mixed Themes (Love, Places, Shame, Luck, Habits, Appearance, Progress, Chaos) - Part 4",
  t_mixed_themes_5: "Mixed Themes (Love, Places, Shame, Luck, Habits, Appearance, Progress, Chaos) - Part 5",
  t_mixed_themes_6: "Mixed Themes (Love, Places, Shame, Luck, Habits, Appearance, Progress, Chaos) - Part 6",
  t_mixed_themes_7: "Mixed Themes (Love, Places, Shame, Luck, Habits, Appearance, Progress, Chaos) - Part 7",
};


// Theme-wise grouping — IDIOM_SET_LABELS mein har set ka label
// "Theme Name - Part N" (multi-part themes) ya sirf "Theme Name"
// (single-part themes) hota hai. Yahan se hum contiguous sets ko
// unke theme ke hisaab se group karte hain (set_order already
// theme-wise contiguous hai, isliye simple sequential grouping kaafi hai).
function getIdiomThemeGroups(){
  const groups = [];
  const map = {};
  Object.keys(IDIOM_SET_LABELS).forEach(key => {
    const label = IDIOM_SET_LABELS[key] || key;
    const m = label.match(/^(.*) - Part \d+$/);
    const theme = m ? m[1] : label;
    if(!map[theme]){
      const g = { theme: theme, keys: [] };
      map[theme] = g;
      groups.push(g);
    }
    map[theme].keys.push(key);
  });
  return groups;
}

function idiomSetLabel(key, count){
  const base = IDIOM_SET_LABELS[key] || key;
  return base + ' (' + count + ' Qs)';
}

function buildIdiomSetPool(setKey){
  const set = IDIOM_SETS[setKey] || [];
  // Har question par origin tag kar do (kaunse set ka kaunsa index) — isi
  // se save/unsave button ko pata chalta hai ki kis question ko toggle
  // karna hai, chahe woh shuffled order mein kahin bhi ho.
  set.forEach((q, i) => { q._setKey = setKey; q._qIndex = i; });
  return set.slice();
}

// ===== Idiom "Saved Questions" — localStorage mein {setKey, qIndex} pairs
// ki list save hoti hai (poora question data nahi), taaki IDIOM_SETS hi
// single source of truth rahe. Vocab wale pattern jaisa hi. =====
const IDIOM_SAVED_KEY = 'cgl50-idiom-saved';
function idiomQuestionUid(setKey, qIndex){ return setKey + '#' + qIndex; }
function loadIdiomSavedList(){
  try{
    const raw = localStorage.getItem(IDIOM_SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveIdiomSavedList(list){
  try{ localStorage.setItem(IDIOM_SAVED_KEY, JSON.stringify(list)); }catch(e){}
}
function isIdiomQuestionSaved(setKey, qIndex){
  if(setKey == null || qIndex == null) return false;
  const uid = idiomQuestionUid(setKey, qIndex);
  return loadIdiomSavedList().some(it => idiomQuestionUid(it.setKey, it.qIndex) === uid);
}
function toggleIdiomQuestionSaved(setKey, qIndex){
  if(setKey == null || qIndex == null) return false;
  const list = loadIdiomSavedList();
  const uid = idiomQuestionUid(setKey, qIndex);
  const idx = list.findIndex(it => idiomQuestionUid(it.setKey, it.qIndex) === uid);
  let nowSaved;
  if(idx >= 0){ list.splice(idx, 1); nowSaved = false; }
  else { list.push({ setKey, qIndex }); nowSaved = true; }
  saveIdiomSavedList(list);
  return nowSaved;
}
function idiomSavedCount(){ return loadIdiomSavedList().length; }
function buildIdiomSavedPool(){
  const list = loadIdiomSavedList();
  const pool = [];
  list.forEach(it => {
    const set = IDIOM_SETS[it.setKey];
    const q = set && set[it.qIndex];
    if(!q) return;
    q._setKey = it.setKey;
    q._qIndex = it.qIndex;
    pool.push(q);
  });
  return shuffledCopy(pool);
}
function updateIdiomSavedMenuBtn(){
  const lbl = document.getElementById('idiomSavedCountLabel');
  if(lbl) lbl.textContent = idiomSavedCount() + ' saved';
}

// Theme list (top page) — ek button per theme. Agar theme mein sirf ek
// hi part hai to seedha quiz shuru ho jata hai; multi-part theme par tap
// karne se sets ki sub-list khulti hai.
function renderIdiomThemeMenu(){
  const grid = document.getElementById('idiomThemeGrid');
  if(!grid) return;
  grid.innerHTML = '';
  getIdiomThemeGroups().forEach(g => {
    const totalQs = g.keys.reduce((sum, k) => sum + (IDIOM_SETS[k] ? IDIOM_SETS[k].length : 0), 0);
    const allDone = g.keys.every(k => isQuizSetAttempted('idiom', k));
    const partsInfo = g.keys.length > 1 ? (g.keys.length + ' parts \u00b7 ') : '';
    const btn = document.createElement('button');
    btn.className = 'calcCard';
    btn.innerHTML =
      '<span class="calcIcon">\ud83d\udcac</span>' +
      '<span class="calcLabelCol">' +
      '<span class="calcLabel">' + escapeHtml(g.theme) + '</span>' +
      '<span class="calcSub">' + partsInfo + totalQs + ' Qs</span>' +
      '</span>' +
      (allDone ? '<span class="calcDoneBadge">✅</span>' : '') +
      '<span class="calcArrow">&#8250;</span>';
    btn.addEventListener('click', () => openIdiomTheme(g));
    grid.appendChild(btn);
  });
}

function openIdiomTheme(g){
  if(g.keys.length === 1){
    idiomSession.themeName = null;
    idiomSession.returnPage = 'idiommenu';
    startIdiomQuiz(g.keys[0]);
    return;
  }
  idiomSession.themeName = g.theme;
  idiomSession.returnPage = 'idiomsetmenu';
  const titleEl = document.getElementById('idiomSetMenuTitle');
  if(titleEl) titleEl.textContent = g.theme;
  renderIdiomSetSubMenu(g);
  showCalcPage('idiomsetmenu');
}

// Ek theme ke andar ke parts (sets) ki list — theme naam page title mein
// already dikh raha hai, isliye yahan sirf "Part N (X Qs)" dikhaya jaata hai.
function renderIdiomSetSubMenu(g){
  const grid = document.getElementById('idiomSetGrid');
  if(!grid) return;
  grid.innerHTML = '';
  g.keys.forEach(key => {
    const count = IDIOM_SETS[key] ? IDIOM_SETS[key].length : 0;
    const label = IDIOM_SET_LABELS[key] || key;
    const m = label.match(/Part \d+$/);
    const shortLabel = (m ? m[0] : label) + ' (' + count + ' Qs)';
    const openThis = () => {
      idiomSession.themeName = g.theme;
      idiomSession.returnPage = 'idiomsetmenu';
      startIdiomQuiz(key);
    };
    if(renderQuizAttemptCard(grid, 'idiom', key, '\ud83d\udcac', shortLabel, openThis)) return;
    const btn = document.createElement('button');
    btn.className = 'calcCard';
    btn.innerHTML =
      '<span class="calcIcon">\ud83d\udcac</span>' +
      '<span class="calcLabel">' + escapeHtml(shortLabel) + '</span>' +
      '<span class="calcArrow">&#8250;</span>';
    btn.addEventListener('click', openThis);
    grid.appendChild(btn);
  });
}

function startIdiomQuiz(setKey){
  if(!setKey) setKey = idiomSession.setKey;
  if(!setKey) return;
  const isSaved = setKey === 'saved';
  if(!isSaved && !IDIOM_SETS[setKey]) return;
  idiomSession.setKey = setKey;
  idiomSession.questions = isSaved ? buildIdiomSavedPool() : buildIdiomSetPool(setKey);
  if(isSaved && idiomSession.questions.length === 0){
    alert('Abhi tak koi idiom save nahi kiya. Quiz ke dauraan ⭐ button dabakar koi bhi question save kar sakte ho.');
    return;
  }
  idiomSession.index = 0;
  idiomSession.correct = 0;
  idiomSession.wrong = 0;
  idiomSession.answered = false;
  idiomSession.userAnswers = new Array(idiomSession.questions.length).fill(null);
  const titleEl = document.getElementById('idiomQuizTitle');
  if(titleEl) titleEl.textContent = isSaved
    ? 'Idioms — ⭐ Saved (' + idiomSession.questions.length + ')'
    : 'Idioms - ' + idiomSetLabel(setKey, idiomSession.questions.length);
  const resultCard = document.getElementById('idiomResultCard');
  if(resultCard) resultCard.style.display = 'none';
  const qWrap = document.getElementById('idiomQuestionWrap');
  if(qWrap) qWrap.style.display = '';
  const ansGrid = document.getElementById('idiomAnsGrid');
  if(ansGrid) ansGrid.style.display = '';
  const solCard = document.getElementById('idiomSolutionCard');
  if(solCard) solCard.style.display = 'none';
  updateIdiomStats();
  renderIdiomQuestion();
  showCalcPage('idiom');
}

function updateIdiomStats(){
  const c = document.getElementById('idiomStatCorrect');
  const w = document.getElementById('idiomStatWrong');
  const p = document.getElementById('idiomStatProgress');
  if(c) c.textContent = idiomSession.correct;
  if(w) w.textContent = idiomSession.wrong;
  if(p) p.textContent = 'Q ' + Math.min(idiomSession.index + 1, idiomSession.questions.length) + '/' + idiomSession.questions.length;
}

function renderIdiomQuestion(){
  const q = idiomSession.questions[idiomSession.index];
  if(!q){ endIdiomQuiz(); return; }
  idiomSession.answered = false;
  const wordEl = document.getElementById('idiomWordText');
  if(wordEl){
    const m = (q.word || '').match(/idiom:\s*'(.+)'\s*$/);
    wordEl.textContent = m ? ('\u2018' + m[1] + '\u2019') : (q.word || '\u2014');
  }
  const ansGrid = document.getElementById('idiomAnsGrid');
  if(!ansGrid) return;
  ansGrid.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'calcAnsBtn';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectIdiomAnswer(i, btn));
    ansGrid.appendChild(btn);
  });
  const solCard = document.getElementById('idiomSolutionCard');
  if(solCard) solCard.style.display = 'none';
  const nextTopBtn = document.getElementById('idiomNextBtnTop');
  const nextTopRow = nextTopBtn ? nextTopBtn.closest('.calcNextTopRow') : null;
  if(nextTopRow) nextTopRow.style.display = 'none';
  updateIdiomStats();
  updateIdiomSaveBtn(q);
}

// Current question ke hisaab se ⭐ button ka look (filled/outline) set karta hai.
function updateIdiomSaveBtn(q){
  const btn = document.getElementById('idiomSaveBtn');
  if(!btn || !q) return;
  const saved = isIdiomQuestionSaved(q._setKey, q._qIndex);
  btn.classList.toggle('active', saved);
  btn.textContent = saved ? '★' : '☆';
  btn.setAttribute('aria-label', saved ? 'Saved — tap to remove' : 'Save this question');
}

function selectIdiomAnswer(i, btnEl){
  if(idiomSession.answered) return;
  idiomSession.answered = true;
  const q = idiomSession.questions[idiomSession.index];
  const correct = i === q.answer;
  idiomSession.userAnswers[idiomSession.index] = i;
  if(correct) idiomSession.correct++; else idiomSession.wrong++;
  document.querySelectorAll('#idiomAnsGrid .calcAnsBtn').forEach((b, idx) => {
    b.classList.add('disabled');
    if(idx === q.answer) b.classList.add('correct');
    else if(idx === i) b.classList.add('wrong');
  });
  updateIdiomStats();
  const solCard = document.getElementById('idiomSolutionCard');
  const solText = document.getElementById('idiomSolutionText');
  if(solText){
    const verdict = correct ? '\u2705 Sahi Jawaab!' : '\u274c Galat Jawaab.';
    const correctLine = 'Sahi Meaning: <b>' + escapeHtml(q.options[q.answer]) + '</b>';
    const explLine = (q.explanation && q.explanation.length)
      ? '<div style="margin-top:6px;color:var(--muted);">' + (Array.isArray(q.explanation) ? q.explanation.map(b=>escapeHtml(b)).join('<br>') : escapeHtml(q.explanation)) + '</div>'
      : '';
    solText.innerHTML = '<div>' + verdict + '</div><div style="margin-top:4px;">' + correctLine + '</div>' + explLine;
  }
  if(solCard) solCard.style.display = 'block';
  const nextTopBtn2 = document.getElementById('idiomNextBtnTop');
  const nextTopRow2 = nextTopBtn2 ? nextTopBtn2.closest('.calcNextTopRow') : null;
  if(nextTopRow2) nextTopRow2.style.display = 'flex';
}

function goToNextIdiomQuestion(){
  idiomSession.index++;
  if(idiomSession.index < idiomSession.questions.length) renderIdiomQuestion();
  else endIdiomQuiz();
}

function endIdiomQuiz(){
  const total = idiomSession.correct + idiomSession.wrong;
  const acc = total ? Math.round((idiomSession.correct / total) * 100) : 0;
  const qWrap = document.getElementById('idiomQuestionWrap');
  if(qWrap) qWrap.style.display = 'none';
  const ansGrid = document.getElementById('idiomAnsGrid');
  if(ansGrid) ansGrid.style.display = 'none';
  const solCard = document.getElementById('idiomSolutionCard');
  if(solCard) solCard.style.display = 'none';
  const statsEl = document.getElementById('idiomResultStats');
  if(statsEl){
    statsEl.innerHTML =
      '<div>\u2705 Correct: <b>' + idiomSession.correct + '</b></div>' +
      '<div>\u274c Wrong: <b>' + idiomSession.wrong + '</b></div>' +
      '<div>\ud83c\udfaf Accuracy: <b>' + acc + '%</b></div>';
  }
  const resultCard = document.getElementById('idiomResultCard');
  if(resultCard) resultCard.style.display = 'block';
  const titleEl = document.getElementById('idiomQuizTitle');
  logQuizActivity(titleEl ? titleEl.textContent : 'Idioms & Phrases', idiomSession.correct, total);
  markQuizSetAttempted('idiom', idiomSession.setKey);
  if(idiomSession.setKey !== 'saved'){
    saveQuizAttemptDetail('idiom', idiomSession.setKey, {
      correct: idiomSession.correct, wrong: idiomSession.wrong, total, acc,
      items: buildWordSchemeReviewItems(idiomSession.questions, idiomSession.userAnswers)
    });
  }
  ensureResultTopReattemptBtn(resultCard, () => startIdiomQuiz(idiomSession.setKey));
  renderIdiomThemeMenu();
  if(idiomSession.themeName){
    const g = getIdiomThemeGroups().find(gr => gr.theme === idiomSession.themeName);
    if(g) renderIdiomSetSubMenu(g);
  }
}

function initIdiomQuiz(){
  renderIdiomThemeMenu();
  updateIdiomSavedMenuBtn();
}

// ===== Grammar Quiz (Learn/Calc tab) — SSC 'Spot the Error' format =====
// DATA FORMAT: GRAMMAR_SETS.setN = array of 20 questions, each
// { word: full sentence with (A)(B)(C)(D) parts marked, options: the 4
//   parts as separate choices, answer: 0-based index of the part with the
//   error, explanation: [correction line, rule line] }. Mixed across all
//   14 grammar topics in every set (not chapter-wise) — 200 Qs, 10 sets.
// [data moved to data/grammar_sets.js]


function grammarSetLabel(key, count){
  const num = (key.match(/\d+/) || [key])[0];
  return 'Set ' + num + ' (' + count + ' Qs)';
}

function buildGrammarSetPool(setKey){
  const set = GRAMMAR_SETS[setKey] || [];
  // Har question par origin tag kar do (kaunse set ka kaunsa index) — isi
  // se save/unsave button ko pata chalta hai ki kis question ko toggle
  // karna hai, chahe woh shuffled order mein kahin bhi ho.
  set.forEach((q, i) => { q._setKey = setKey; q._qIndex = i; });
  return set.slice();
}

// ===== Grammar "Saved Questions" — localStorage mein {setKey, qIndex} pairs
// ki list save hoti hai (poora question data nahi), taaki GRAMMAR_SETS hi
// single source of truth rahe. Vocab/Idiom wale pattern jaisa hi. =====
const GRAMMAR_SAVED_KEY = 'cgl50-grammar-saved';
function grammarQuestionUid(setKey, qIndex){ return setKey + '#' + qIndex; }
function loadGrammarSavedList(){
  try{
    const raw = localStorage.getItem(GRAMMAR_SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveGrammarSavedList(list){
  try{ localStorage.setItem(GRAMMAR_SAVED_KEY, JSON.stringify(list)); }catch(e){}
}
function isGrammarQuestionSaved(setKey, qIndex){
  if(setKey == null || qIndex == null) return false;
  const uid = grammarQuestionUid(setKey, qIndex);
  return loadGrammarSavedList().some(it => grammarQuestionUid(it.setKey, it.qIndex) === uid);
}
function toggleGrammarQuestionSaved(setKey, qIndex){
  if(setKey == null || qIndex == null) return false;
  const list = loadGrammarSavedList();
  const uid = grammarQuestionUid(setKey, qIndex);
  const idx = list.findIndex(it => grammarQuestionUid(it.setKey, it.qIndex) === uid);
  let nowSaved;
  if(idx >= 0){ list.splice(idx, 1); nowSaved = false; }
  else { list.push({ setKey, qIndex }); nowSaved = true; }
  saveGrammarSavedList(list);
  return nowSaved;
}
function grammarSavedCount(){ return loadGrammarSavedList().length; }
function buildGrammarSavedPool(){
  const list = loadGrammarSavedList();
  const pool = [];
  list.forEach(it => {
    const set = GRAMMAR_SETS[it.setKey];
    const q = set && set[it.qIndex];
    if(!q) return;
    q._setKey = it.setKey;
    q._qIndex = it.qIndex;
    pool.push(q);
  });
  return shuffledCopy(pool);
}
function updateGrammarSavedMenuBtn(){
  const lbl = document.getElementById('grammarSavedCountLabel');
  if(lbl) lbl.textContent = grammarSavedCount() + ' saved';
}

function renderGrammarSetMenu(){
  const grid = document.getElementById('grammarSetGrid');
  if(!grid) return;
  grid.innerHTML = '';
  Object.keys(GRAMMAR_SETS).forEach(key => {
    const count = GRAMMAR_SETS[key].length;
    const label = grammarSetLabel(key, count);
    if(renderQuizAttemptCard(grid, 'grammar', key, '📝', label, () => startGrammarQuiz(key))) return;
    const btn = document.createElement('button');
    btn.className = 'calcCard';
    btn.innerHTML =
      '<span class="calcIcon">📝</span>' +
      '<span class="calcLabel">' + escapeHtml(label) + '</span>' +
      '<span class="calcArrow">&#8250;</span>';
    btn.addEventListener('click', () => startGrammarQuiz(key));
    grid.appendChild(btn);
  });
}

function startGrammarQuiz(setKey){
  if(!setKey) setKey = grammarSession.setKey;
  if(!setKey) return;
  const isSaved = setKey === 'saved';
  if(!isSaved && !GRAMMAR_SETS[setKey]) return;
  grammarSession.setKey = setKey;
  grammarSession.questions = isSaved ? buildGrammarSavedPool() : buildGrammarSetPool(setKey);
  if(isSaved && grammarSession.questions.length === 0){
    alert('Abhi tak koi grammar question save nahi kiya. Quiz ke dauraan ⭐ button dabakar koi bhi question save kar sakte ho.');
    return;
  }
  grammarSession.index = 0;
  grammarSession.correct = 0;
  grammarSession.wrong = 0;
  grammarSession.answered = false;
  grammarSession.userAnswers = new Array(grammarSession.questions.length).fill(null);
  const titleEl = document.getElementById('grammarQuizTitle');
  if(titleEl) titleEl.textContent = isSaved
    ? 'Grammar — ⭐ Saved (' + grammarSession.questions.length + ')'
    : 'Grammar - ' + grammarSetLabel(setKey, grammarSession.questions.length);
  const resultCard = document.getElementById('grammarResultCard');
  if(resultCard) resultCard.style.display = 'none';
  const qWrap = document.getElementById('grammarQuestionWrap');
  if(qWrap) qWrap.style.display = '';
  const ansGrid = document.getElementById('grammarAnsGrid');
  if(ansGrid) ansGrid.style.display = '';
  const solCard = document.getElementById('grammarSolutionCard');
  if(solCard) solCard.style.display = 'none';
  updateGrammarStats();
  renderGrammarQuestion();
  showCalcPage('grammar');
}

function updateGrammarStats(){
  const c = document.getElementById('grammarStatCorrect');
  const w = document.getElementById('grammarStatWrong');
  const p = document.getElementById('grammarStatProgress');
  if(c) c.textContent = grammarSession.correct;
  if(w) w.textContent = grammarSession.wrong;
  if(p) p.textContent = 'Q ' + Math.min(grammarSession.index + 1, grammarSession.questions.length) + '/' + grammarSession.questions.length;
}

function renderGrammarQuestion(){
  const q = grammarSession.questions[grammarSession.index];
  if(!q){ endGrammarQuiz(); return; }
  grammarSession.answered = false;
  const wordEl = document.getElementById('grammarWordText');
  if(wordEl) wordEl.textContent = q.word || '—';
  const ansGrid = document.getElementById('grammarAnsGrid');
  if(!ansGrid) return;
  ansGrid.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'calcAnsBtn';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectGrammarAnswer(i, btn));
    ansGrid.appendChild(btn);
  });
  const solCard = document.getElementById('grammarSolutionCard');
  if(solCard) solCard.style.display = 'none';
  const nextTopBtn = document.getElementById('grammarNextBtnTop');
  const nextTopRow = nextTopBtn ? nextTopBtn.closest('.calcNextTopRow') : null;
  if(nextTopRow) nextTopRow.style.display = 'none';
  updateGrammarStats();
  updateGrammarSaveBtn(q);
}

// Current question ke hisaab se ⭐ button ka look (filled/outline) set karta hai.
function updateGrammarSaveBtn(q){
  const btn = document.getElementById('grammarSaveBtn');
  if(!btn || !q) return;
  const saved = isGrammarQuestionSaved(q._setKey, q._qIndex);
  btn.classList.toggle('active', saved);
  btn.textContent = saved ? '★' : '☆';
  btn.setAttribute('aria-label', saved ? 'Saved — tap to remove' : 'Save this question');
}

function selectGrammarAnswer(i, btnEl){
  if(grammarSession.answered) return;
  grammarSession.answered = true;
  const q = grammarSession.questions[grammarSession.index];
  const correct = i === q.answer;
  grammarSession.userAnswers[grammarSession.index] = i;
  if(correct) grammarSession.correct++; else grammarSession.wrong++;
  document.querySelectorAll('#grammarAnsGrid .calcAnsBtn').forEach((b, idx) => {
    b.classList.add('disabled');
    if(idx === q.answer) b.classList.add('correct');
    else if(idx === i) b.classList.add('wrong');
  });
  updateGrammarStats();
  const solCard = document.getElementById('grammarSolutionCard');
  const solText = document.getElementById('grammarSolutionText');
  if(solText){
    const verdict = correct ? '✅ Sahi Jawaab!' : '❌ Galat Jawaab.';
    const correctLine = 'Galti thi: <b>' + escapeHtml(q.options[q.answer]) + '</b>';
    const explLine = (q.explanation && q.explanation.length)
      ? '<div style="margin-top:6px;color:var(--muted);">' + (Array.isArray(q.explanation) ? q.explanation.map(b=>escapeHtml(b)).join('<br>') : escapeHtml(q.explanation)) + '</div>'
      : '';
    solText.innerHTML = '<div>' + verdict + '</div><div style="margin-top:4px;">' + correctLine + '</div>' + explLine;
  }
  if(solCard) solCard.style.display = 'block';
  const nextTopBtn2 = document.getElementById('grammarNextBtnTop');
  const nextTopRow2 = nextTopBtn2 ? nextTopBtn2.closest('.calcNextTopRow') : null;
  if(nextTopRow2) nextTopRow2.style.display = 'flex';
}

function goToNextGrammarQuestion(){
  grammarSession.index++;
  if(grammarSession.index < grammarSession.questions.length) renderGrammarQuestion();
  else endGrammarQuiz();
}

function endGrammarQuiz(){
  const total = grammarSession.correct + grammarSession.wrong;
  const acc = total ? Math.round((grammarSession.correct / total) * 100) : 0;
  const qWrap = document.getElementById('grammarQuestionWrap');
  if(qWrap) qWrap.style.display = 'none';
  const ansGrid = document.getElementById('grammarAnsGrid');
  if(ansGrid) ansGrid.style.display = 'none';
  const solCard = document.getElementById('grammarSolutionCard');
  if(solCard) solCard.style.display = 'none';
  const statsEl = document.getElementById('grammarResultStats');
  if(statsEl){
    statsEl.innerHTML =
      '<div>✅ Correct: <b>' + grammarSession.correct + '</b></div>' +
      '<div>❌ Wrong: <b>' + grammarSession.wrong + '</b></div>' +
      '<div>🎯 Accuracy: <b>' + acc + '%</b></div>';
  }
  const resultCard = document.getElementById('grammarResultCard');
  if(resultCard) resultCard.style.display = 'block';
  const titleEl = document.getElementById('grammarQuizTitle');
  logQuizActivity(titleEl ? titleEl.textContent : 'Grammar', grammarSession.correct, total);
  markQuizSetAttempted('grammar', grammarSession.setKey);
  if(grammarSession.setKey !== 'saved'){
    saveQuizAttemptDetail('grammar', grammarSession.setKey, {
      correct: grammarSession.correct, wrong: grammarSession.wrong, total, acc,
      items: buildWordSchemeReviewItems(grammarSession.questions, grammarSession.userAnswers)
    });
  }
  ensureResultTopReattemptBtn(resultCard, () => startGrammarQuiz(grammarSession.setKey));
  renderGrammarSetMenu();
}

function initGrammarQuiz(){
  renderGrammarSetMenu();
  updateGrammarSavedMenuBtn();
  const grammarBtn = document.getElementById('calcGrammarBtn');
  if(grammarBtn) grammarBtn.addEventListener('click', () => showCalcPage('grammarmenu'));
  const grammarMenuBackBtn = document.getElementById('grammarMenuBackBtn');
  if(grammarMenuBackBtn) grammarMenuBackBtn.addEventListener('click', () => showCalcPage('menu'));
  const grammarBackBtn = document.getElementById('grammarBackBtn');
  if(grammarBackBtn) grammarBackBtn.addEventListener('click', () => showCalcPage('grammarmenu'));
  const grammarNextBtn = document.getElementById('grammarNextBtn');
  if(grammarNextBtn) grammarNextBtn.addEventListener('click', goToNextGrammarQuestion);
  const grammarNextBtnTop = document.getElementById('grammarNextBtnTop');
  if(grammarNextBtnTop) grammarNextBtnTop.addEventListener('click', goToNextGrammarQuestion);
  attachQuizSwipeNext('calcPage-grammar', goToNextGrammarQuestion);
  const grammarAgainBtn = document.getElementById('grammarResultAgainBtn');
  if(grammarAgainBtn) grammarAgainBtn.addEventListener('click', () => startGrammarQuiz());
  const grammarResBackBtn = document.getElementById('grammarResultBackBtn');
  if(grammarResBackBtn) grammarResBackBtn.addEventListener('click', () => showCalcPage('grammarmenu'));
  // "Saved Questions" button — set-menu ke sabse upar — bookmarked
  // grammar questions ka apna mini-quiz shuru karta hai.
  const grammarSavedBtn = document.getElementById('grammarSavedBtn');
  if(grammarSavedBtn) grammarSavedBtn.addEventListener('click', () => startGrammarQuiz('saved'));
  // ⭐ Save/unsave toggle — jo bhi question abhi screen par hai usko
  // save karta hai (ya already saved ho to hata deta hai).
  const grammarSaveBtn = document.getElementById('grammarSaveBtn');
  if(grammarSaveBtn) grammarSaveBtn.addEventListener('click', () => {
    const q = grammarSession.questions[grammarSession.index];
    if(!q || q._setKey == null || q._qIndex == null) return;
    toggleGrammarQuestionSaved(q._setKey, q._qIndex);
    updateGrammarSaveBtn(q);
    updateGrammarSavedMenuBtn();
  });
}

// ===== Reasoning Quizzes (Learn/Calc tab) — Odd One Out / Series /
// Coding-Decoding. Teeno quiz bilkul Grammar Quiz jaisa hi MCQ engine share
// karte hain (choose-a-set screen -> quiz screen -> result screen, with
// localStorage-backed "Saved Questions"), isliye ek hi "factory" function
// (makeReasoningQuiz) se teeno ban jaate hain — same 3x copy-paste se bachne
// ke liye jo Vocab/Spelling/Idiom/Grammar mein hua tha. Har topic ka apna
// {prefix}Session aur apna {PREFIX}_SETS data object alag hi rehta hai.
// [data moved to data/oddone_sets.js]


// [data moved to data/series_sets.js]


// [data moved to data/coding_sets.js]


// Splits a { topicKey: [ ...bigQuestionArray ] } SETS object into fixed-size
// (default 10) chunks so long topics/chapters show up as multiple bite-size
// "Topic - Set 1 (10 Qs)", "Topic - Set 2 (10 Qs)"... cards instead of one
// giant N-question card. Topics already <= chunkSize stay a single card.
// Works for any makeReasoningQuiz() caller (English topic-wise, Math/
// Reasoning chapterwise, etc.) — wrap the SETS + topicMeta before passing in.
function chunkSetsIntoTens(SETS, topicMeta, chunkSize){
  chunkSize = chunkSize || 10;
  const chunkedSets = {};
  const chunkedMeta = {};
  Object.keys(SETS).forEach(topicKey => {
    const arr = SETS[topicKey] || [];
    const baseMeta = (topicMeta && topicMeta[topicKey]) || { label: topicKey, icon: '\ud83e\udde0' };
    if(arr.length <= chunkSize){
      chunkedSets[topicKey] = arr;
      chunkedMeta[topicKey] = baseMeta;
      return;
    }
    const totalChunks = Math.ceil(arr.length / chunkSize);
    for(let i = 0; i < totalChunks; i++){
      const chunkKey = topicKey + '__set' + (i + 1);
      chunkedSets[chunkKey] = arr.slice(i * chunkSize, (i + 1) * chunkSize);
      chunkedMeta[chunkKey] = { label: baseMeta.label + ' - Set ' + (i + 1), icon: baseMeta.icon };
    }
  });
  return { chunkedSets, chunkedMeta };
}

function makeReasoningQuiz(prefix, SETS, label, menuBackPage, topicMeta){
  const session = { setKey: null, questions: [], index: 0, correct: 0, wrong: 0, answered: false, userAnswers: [] };
  const SAVED_KEY = 'cgl50-' + prefix + '-saved';

  function setLabel(key, count){
    if(topicMeta && topicMeta[key]){
      return topicMeta[key].label + ' (' + count + ' Qs)';
    }
    const num = (key.match(/\d+/) || [key])[0];
    const n = Number(num);
    if(prefix === 'voice' && n >= 34){
      return 'Concept Set ' + (n - 33) + ' (' + count + ' Qs)';
    }
    if(prefix === 'narration' && n >= 24 && n <= 30){
      return 'Concept Set ' + (n - 23) + ' (' + count + ' Qs)';
    }
    return 'Set ' + num + ' (' + count + ' Qs)';
  }
  function topicIcon(key){
    return (topicMeta && topicMeta[key] && topicMeta[key].icon) || '\ud83e\udde0';
  }
  function buildSetPool(setKey){
    const set = SETS[setKey] || [];
    set.forEach((q, i) => { q._setKey = setKey; q._qIndex = i; });
    return set.slice();
  }
  function uid(setKey, qIndex){ return setKey + '#' + qIndex; }
  function loadSavedList(){
    try{ const raw = localStorage.getItem(SAVED_KEY); return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
  }
  function saveSavedList(list){ try{ localStorage.setItem(SAVED_KEY, JSON.stringify(list)); }catch(e){} }
  function isSaved(setKey, qIndex){
    if(setKey == null || qIndex == null) return false;
    const u = uid(setKey, qIndex);
    return loadSavedList().some(it => uid(it.setKey, it.qIndex) === u);
  }
  function toggleSaved(setKey, qIndex){
    if(setKey == null || qIndex == null) return false;
    const list = loadSavedList();
    const u = uid(setKey, qIndex);
    const idx = list.findIndex(it => uid(it.setKey, it.qIndex) === u);
    let nowSaved;
    if(idx >= 0){ list.splice(idx, 1); nowSaved = false; }
    else { list.push({ setKey, qIndex }); nowSaved = true; }
    saveSavedList(list);
    return nowSaved;
  }
  function savedCount(){ return loadSavedList().length; }
  function buildSavedPool(){
    const list = loadSavedList();
    const pool = [];
    list.forEach(it => {
      const set = SETS[it.setKey];
      const q = set && set[it.qIndex];
      if(!q) return;
      q._setKey = it.setKey;
      q._qIndex = it.qIndex;
      pool.push(q);
    });
    return shuffledCopy(pool);
  }
  function updateSavedMenuBtn(){
    const lbl = document.getElementById(prefix + 'SavedCountLabel');
    if(lbl) lbl.textContent = savedCount() + ' saved';
  }
  function renderSetMenu(){
    const grid = document.getElementById(prefix + 'SetGrid');
    if(!grid) return;
    grid.innerHTML = '';
    Object.keys(SETS).forEach(key => {
      const count = SETS[key].length;
      const setLbl = setLabel(key, count);
      const icon = topicIcon(key);
      if(renderQuizAttemptCard(grid, prefix, key, icon, setLbl, () => startQuiz(key))) return;
      const btn = document.createElement('button');
      btn.className = 'calcCard';
      btn.innerHTML =
        '<span class="calcIcon">' + icon + '</span>' +
        '<span class="calcLabel">' + escapeHtml(setLbl) + '</span>' +
        '<span class="calcArrow">&#8250;</span>';
      btn.addEventListener('click', () => startQuiz(key));
      grid.appendChild(btn);
    });
  }
  function startQuiz(setKey){
    if(!setKey) setKey = session.setKey;
    if(!setKey) return;
    const isSavedRun = setKey === 'saved';
    if(!isSavedRun && !SETS[setKey]) return;
    session.setKey = setKey;
    session.questions = isSavedRun ? buildSavedPool() : buildSetPool(setKey);
    if(isSavedRun && session.questions.length === 0){
      alert('Abhi tak koi question save nahi kiya. Quiz ke dauraan \u2b50 button dabakar koi bhi question save kar sakte ho.');
      return;
    }
    session.index = 0;
    session.correct = 0;
    session.wrong = 0;
    session.answered = false;
    session.userAnswers = new Array(session.questions.length).fill(null);
    const titleEl = document.getElementById(prefix + 'QuizTitle');
    if(titleEl) titleEl.textContent = isSavedRun
      ? label + ' \u2014 \u2b50 Saved (' + session.questions.length + ')'
      : label + ' - ' + setLabel(setKey, session.questions.length);
    const resultCard = document.getElementById(prefix + 'ResultCard');
    if(resultCard) resultCard.style.display = 'none';
    const qWrap = document.getElementById(prefix + 'QuestionWrap');
    if(qWrap) qWrap.style.display = '';
    const ansGrid = document.getElementById(prefix + 'AnsGrid');
    if(ansGrid) ansGrid.style.display = '';
    const solCard = document.getElementById(prefix + 'SolutionCard');
    if(solCard) solCard.style.display = 'none';
    updateStats();
    renderQuestion();
    showCalcPage(prefix);
  }
  function updateStats(){
    const c = document.getElementById(prefix + 'StatCorrect');
    const w = document.getElementById(prefix + 'StatWrong');
    const p = document.getElementById(prefix + 'StatProgress');
    if(c) c.textContent = session.correct;
    if(w) w.textContent = session.wrong;
    if(p) p.textContent = 'Q ' + Math.min(session.index + 1, session.questions.length) + '/' + session.questions.length;
  }
  function updateSaveBtn(q){
    const btn = document.getElementById(prefix + 'SaveBtn');
    if(!btn || !q) return;
    const s = isSaved(q._setKey, q._qIndex);
    btn.classList.toggle('active', s);
    btn.textContent = s ? '\u2605' : '\u2606';
    btn.setAttribute('aria-label', s ? 'Saved \u2014 tap to remove' : 'Save this question');
  }
  // The top ⏭ "Next" shortcut only makes sense once you've actually
  // answered (before that, tapping it would just skip a question you
  // haven't attempted) — and hiding its whole row until then means it no
  // longer sits as a permanent empty gap between the question and the
  // answer options.
  function nextTopRowEl(){
    const btn = document.getElementById(prefix + 'NextBtnTop');
    return btn ? btn.closest('.calcNextTopRow') : null;
  }
  function renderQuestion(){
    const q = session.questions[session.index];
    if(!q){ endQuiz(); return; }
    session.answered = false;
    const wordEl = document.getElementById(prefix + 'WordText');
    if(wordEl) wordEl.textContent = q.word || '\u2014';
    const ansGrid = document.getElementById(prefix + 'AnsGrid');
    if(!ansGrid) return;
    ansGrid.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'calcAnsBtn';
      btn.textContent = opt;
      btn.addEventListener('click', () => selectAnswer(i, btn));
      ansGrid.appendChild(btn);
    });
    const solCard = document.getElementById(prefix + 'SolutionCard');
    if(solCard) solCard.style.display = 'none';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'none';
    updateStats();
    updateSaveBtn(q);
  }
  function selectAnswer(i){
    if(session.answered) return;
    session.answered = true;
    const q = session.questions[session.index];
    const correct = i === q.answer;
    session.userAnswers[session.index] = i;
    if(correct) session.correct++; else session.wrong++;
    document.querySelectorAll('#' + prefix + 'AnsGrid .calcAnsBtn').forEach((b, idx) => {
      b.classList.add('disabled');
      if(idx === q.answer) b.classList.add('correct');
      else if(idx === i) b.classList.add('wrong');
    });
    updateStats();
    const solCard = document.getElementById(prefix + 'SolutionCard');
    const solText = document.getElementById(prefix + 'SolutionText');
    if(solText){
      const verdict = correct ? '\u2705 Sahi Jawaab!' : '\u274c Galat Jawaab.';
      const explLine = (q.explanation && q.explanation.length)
        ? '<div style="margin-top:6px;color:var(--muted);">' + (Array.isArray(q.explanation) ? q.explanation.map(b=>escapeHtml(b)).join('<br>') : escapeHtml(q.explanation)) + '</div>'
        : '';
      solText.innerHTML = '<div>' + verdict + '</div>' + explLine;
    }
    if(solCard) solCard.style.display = 'block';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'flex';
  }
  function goToNext(){
    session.index++;
    if(session.index < session.questions.length) renderQuestion();
    else endQuiz();
  }
  function endQuiz(){
    const total = session.correct + session.wrong;
    const acc = total ? Math.round((session.correct / total) * 100) : 0;
    const qWrap = document.getElementById(prefix + 'QuestionWrap');
    if(qWrap) qWrap.style.display = 'none';
    const ansGrid = document.getElementById(prefix + 'AnsGrid');
    if(ansGrid) ansGrid.style.display = 'none';
    const solCard = document.getElementById(prefix + 'SolutionCard');
    if(solCard) solCard.style.display = 'none';
    const statsEl = document.getElementById(prefix + 'ResultStats');
    if(statsEl){
      statsEl.innerHTML =
        '<div>\u2705 Correct: <b>' + session.correct + '</b></div>' +
        '<div>\u274c Wrong: <b>' + session.wrong + '</b></div>' +
        '<div>\ud83c\udfaf Accuracy: <b>' + acc + '%</b></div>';
    }
    const resultCard = document.getElementById(prefix + 'ResultCard');
    if(resultCard) resultCard.style.display = 'block';
    const titleEl2 = document.getElementById(prefix + 'QuizTitle');
    logQuizActivity(titleEl2 ? titleEl2.textContent : label, session.correct, total);
    markQuizSetAttempted(prefix, session.setKey);
    if(session.setKey !== 'saved'){
      saveQuizAttemptDetail(prefix, session.setKey, {
        correct: session.correct, wrong: session.wrong, total, acc,
        items: buildWordSchemeReviewItems(session.questions, session.userAnswers)
      });
    }
    ensureResultTopReattemptBtn(resultCard, () => startQuiz(session.setKey));
    renderSetMenu();
  }
  function init(){
    renderSetMenu();
    updateSavedMenuBtn();
    const menuBackBtn = document.getElementById(prefix + 'MenuBackBtn');
    if(menuBackBtn) menuBackBtn.addEventListener('click', () => showCalcPage(menuBackPage || 'reasoningmenu'));
    const backBtn = document.getElementById(prefix + 'BackBtn');
    if(backBtn) backBtn.addEventListener('click', () => showCalcPage(prefix + 'menu'));
    const nextBtn = document.getElementById(prefix + 'NextBtn');
    if(nextBtn) nextBtn.addEventListener('click', goToNext);
    const nextBtnTop = document.getElementById(prefix + 'NextBtnTop');
    if(nextBtnTop) nextBtnTop.addEventListener('click', goToNext);
    attachQuizSwipeNext('calcPage-' + prefix, goToNext);
    const againBtn = document.getElementById(prefix + 'ResultAgainBtn');
    if(againBtn) againBtn.addEventListener('click', () => startQuiz());
    const resBackBtn = document.getElementById(prefix + 'ResultBackBtn');
    if(resBackBtn) resBackBtn.addEventListener('click', () => showCalcPage(prefix + 'menu'));
    const savedBtn = document.getElementById(prefix + 'SavedBtn');
    if(savedBtn) savedBtn.addEventListener('click', () => startQuiz('saved'));
    const saveBtn = document.getElementById(prefix + 'SaveBtn');
    if(saveBtn) saveBtn.addEventListener('click', () => {
      const q = session.questions[session.index];
      if(!q || q._setKey == null || q._qIndex == null) return;
      toggleSaved(q._setKey, q._qIndex);
      updateSaveBtn(q);
      updateSavedMenuBtn();
    });
  }
  return { init, startQuiz };
}

const oddoneQuiz = makeReasoningQuiz('oddone', ODDONE_SETS, 'Odd One Out', 'reasoningchapters');
const seriesQuiz = makeReasoningQuiz('series', SERIES_SETS, 'Series', 'reasoningchapters');
const codingQuiz = makeReasoningQuiz('coding', CODING_SETS, 'Coding-Decoding', 'reasoningchapters');

const ENGLISH_TOPICWISE_TOPIC_META = {
  synonyms: { label: 'Synonyms', icon: '🟢' },
  antonyms: { label: 'Antonyms', icon: '🔴' },
  synantonyms: { label: 'Synonyms & Antonyms', icon: '🔵' },
  idiomsphrases: { label: 'Idioms & Phrases', icon: '💬' },
  onewordsub: { label: 'One Word Substitution', icon: '🔤' },
  fillblanks: { label: 'Fill in the Blanks (Vocabulary)', icon: '✏️' },
  spellingtw: { label: 'Spelling', icon: '🔡' },
  errorspotting: { label: 'Error Spotting', icon: '🧐' },
  sentenceimprovement: { label: 'Sentence Improvement', icon: '🛠️' },
  activepassivetw: { label: 'Active & Passive Voice', icon: '🔁' },
  narrationtw: { label: 'Direct & Indirect Speech (Narration)', icon: '🗣️' },
  conjunctions: { label: 'Grammar - Conjunctions', icon: '🔗' },
  articles: { label: 'Grammar - Articles', icon: '📎' },
  parajumbles: { label: 'Para Jumbles / Sentence Rearrangement', icon: '🧩' },
  miscgrammar: { label: 'Misc. Grammar & Vocabulary', icon: '📦' }
};

// ===== English Topic-wise (chapterwise, like Math/Reasoning Chapterwise) =====
// DATA FORMAT: ENGLISH_TOPICWISE_SETS.<topic> = array of questions, each
// { qn, word: "<question text>", options:[4], answer:<0-3 index>,
//   explanation: "<solution>" }. 1683 Qs across 15 topics (Synonyms, Antonyms,
// Idioms & Phrases, One Word Substitution, Fill in the Blanks, Spelling,
// Error Spotting, Sentence Improvement, Active/Passive Voice, Narration,
// Conjunctions, Articles, Para Jumbles, Misc.) — merged SSC CGL/CHSL English
// question bank, topic-wise. Reuses the same reasoning-quiz engine (single
// language, MCQ + explanation) with topic-specific labels/icons via
// ENGLISH_TOPICWISE_TOPIC_META instead of generic "Set N" numbering.
// Topics here range from 1 Q (Articles) to 551 Qs (Fill in the Blanks), so we
// chunk every topic into 10-question sets (e.g. "Para Jumbles - Set 1 (10
// Qs)", "Set 2 (10 Qs)"...) instead of one huge N-question card per topic.
const ENGLISH_TOPICWISE_CHUNKED = chunkSetsIntoTens(ENGLISH_TOPICWISE_SETS, ENGLISH_TOPICWISE_TOPIC_META, 10);
const englishTopicwiseQuiz = makeReasoningQuiz('englishtopicwise', ENGLISH_TOPICWISE_CHUNKED.chunkedSets, 'English Topic-wise', 'menu', ENGLISH_TOPICWISE_CHUNKED.chunkedMeta);
// Note: the old standalone "Odd One Out — SSC 2025" and "Number Series — SSC
// 2025" quizzes/buttons were merged into ODDONE_SETS / SERIES_SETS above (as
// extra sets) so all practice for the same topic lives under one button.

// [data moved to data/digitalsum_sets.js]


// ===== Digital Sum Quiz (Math) =====
// DATA FORMAT: DIGITALSUM_SETS.setN = array of questions, each
// { qn: <question number from source>, exam: "<exam name>",
//   en: "<question text - English>", hi: "<question text - Hindi>",
//   options: [4 option strings, exact text/no letter-prefix],
//   answer: <0-based correct index>,
//   sol1: "<Solution 1 - Digital Sum / Speed-Trick Method, exact text>",
//   sol2: "<Solution 2 - Concept Clarity / Step-by-Step Method, exact text>" }.
// 158 questions (Abhinay Maths "Digital Sum" printable sheets 1-8, PYQs from
// SSC/RRB/UPSC/Police exams) split into 15-question sets: set1-set6 = sheets
// 1-4 (77 Qs, last set has leftover 2), set7-set12 = sheets 5-8 (81 Qs, last
// set has leftover 6). Unlike the other Learn-tab quizzes, this one first asks
// Hindi-or-English (question text only — exam name, options and both
// solutions stay exactly as given, in their original text). No countdown
// timer — the person can take as long as they like on each set.
function makeDigitalSumQuiz(){
  const prefix = 'digitalsum';
  const SETS = DIGITALSUM_SETS;
  const session = { setKey: null, lang: 'hi', questions: [], index: 0, correct: 0, wrong: 0, answered: false, userAnswers: [] };

  function setLabel(key, count){
    const num = (key.match(/\d+/) || [key])[0];
    return 'Set ' + num + ' (' + count + ' Qs)';
  }
  function buildSetPool(setKey){
    const set = SETS[setKey] || [];
    return set.slice();
  }
  function renderSetMenu(){
    const grid = document.getElementById('digitalsumSetGrid');
    if(!grid) return;
    grid.innerHTML = '';
    Object.keys(SETS).forEach(key => {
      const count = SETS[key].length;
      const lbl = setLabel(key, count);
      if(renderQuizAttemptCard(grid, prefix, key, '➗', lbl, () => openLangChoice(key))) return;
      const btn = document.createElement('button');
      btn.className = 'calcCard';
      btn.innerHTML =
        '<span class="calcIcon">➗</span>' +
        '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(lbl) + '</span></span>' +
        '<span class="calcArrow">&#8250;</span>';
      btn.addEventListener('click', () => openLangChoice(key));
      grid.appendChild(btn);
    });
  }
  function openLangChoice(setKey){
    session.setKey = setKey;
    const count = (SETS[setKey] || []).length;
    const titleEl = document.getElementById('digitalsumLangTitle');
    if(titleEl) titleEl.textContent = 'Digital Sum — ' + setLabel(setKey, count);
    showCalcPage('digitalsumlang');
  }
  function startQuiz(lang){
    if(lang) session.lang = lang;
    if(!session.setKey || !SETS[session.setKey]) return;
    session.questions = buildSetPool(session.setKey);
    session.index = 0;
    session.correct = 0;
    session.wrong = 0;
    session.answered = false;
    session.userAnswers = new Array(session.questions.length).fill(null);
    const count = session.questions.length;
    const titleEl = document.getElementById('digitalsumQuizTitle');
    if(titleEl) titleEl.textContent = 'Digital Sum - ' + setLabel(session.setKey, count);
    const resultCard = document.getElementById('digitalsumResultCard');
    if(resultCard) resultCard.style.display = 'none';
    const qWrap = document.getElementById('digitalsumQuestionWrap');
    if(qWrap) qWrap.style.display = '';
    const ansGrid = document.getElementById('digitalsumAnsGrid');
    if(ansGrid) ansGrid.style.display = '';
    const solCard = document.getElementById('digitalsumSolutionCard');
    if(solCard) solCard.style.display = 'none';
    updateStats();
    renderQuestion();
    showCalcPage('digitalsum');
  }
  function updateStats(){
    const c = document.getElementById('digitalsumStatCorrect');
    const w = document.getElementById('digitalsumStatWrong');
    const p = document.getElementById('digitalsumStatProgress');
    if(c) c.textContent = session.correct;
    if(w) w.textContent = session.wrong;
    if(p) p.textContent = 'Q ' + Math.min(session.index + 1, session.questions.length) + '/' + session.questions.length;
  }
  function nextTopRowEl(){
    const btn = document.getElementById('digitalsumNextBtnTop');
    return btn ? btn.closest('.calcNextTopRow') : null;
  }
  function renderQuestion(){
    const q = session.questions[session.index];
    if(!q){ endQuiz(); return; }
    session.answered = false;
    const badgeEl = document.getElementById('digitalsumExamBadge');
    if(badgeEl) badgeEl.textContent = '📋 ' + (q.exam || '—');
    const wordEl = document.getElementById('digitalsumWordText');
    if(wordEl) wordEl.innerHTML = mathify((session.lang === 'en' ? q.en : q.hi) || '—');
    const ansGrid = document.getElementById('digitalsumAnsGrid');
    if(!ansGrid) return;
    ansGrid.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'calcAnsBtn';
      btn.innerHTML = mathify(opt);
      btn.addEventListener('click', () => selectAnswer(i));
      ansGrid.appendChild(btn);
    });
    const solCard = document.getElementById('digitalsumSolutionCard');
    if(solCard) solCard.style.display = 'none';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'none';
    updateStats();
  }
  function selectAnswer(i){
    if(session.answered) return;
    session.answered = true;
    const q = session.questions[session.index];
    const correct = i === q.answer;
    session.userAnswers[session.index] = i;
    if(correct) session.correct++; else session.wrong++;
    document.querySelectorAll('#digitalsumAnsGrid .calcAnsBtn').forEach((b, idx) => {
      b.classList.add('disabled');
      if(idx === q.answer) b.classList.add('correct');
      else if(idx === i) b.classList.add('wrong');
    });
    updateStats();
    const solCard = document.getElementById('digitalsumSolutionCard');
    const solText = document.getElementById('digitalsumSolutionText');
    if(solText){
      const verdict = correct ? '✅ Sahi Jawaab!' : '❌ Galat Jawaab.';
      solText.innerHTML =
        '<div style="font-size:17px;font-weight:700;color:var(--quiz-text);">' + verdict + '</div>' +
        '<div class="dsSolBlock">' +
          '<div class="dsSolLabel">Solution 1 · Digital Sum Trick</div>' +
          formatSolSteps(q.sol1) +
        '</div>' +
        '<div class="dsSolBlock">' +
          '<div class="dsSolLabel">Solution 2 · Step-by-Step</div>' +
          formatSolSteps(q.sol2) +
        '</div>';
    }
    if(solCard) solCard.style.display = 'block';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'flex';
  }
  function goToNext(){
    session.index++;
    if(session.index < session.questions.length) renderQuestion();
    else endQuiz();
  }
  function endQuiz(){
    const total = session.correct + session.wrong;
    const acc = total ? Math.round((session.correct / total) * 100) : 0;
    const qWrap = document.getElementById('digitalsumQuestionWrap');
    if(qWrap) qWrap.style.display = 'none';
    const ansGrid = document.getElementById('digitalsumAnsGrid');
    if(ansGrid) ansGrid.style.display = 'none';
    const solCard = document.getElementById('digitalsumSolutionCard');
    if(solCard) solCard.style.display = 'none';
    const titleResult = document.getElementById('digitalsumResultTitle');
    if(titleResult) titleResult.textContent = '🎉 Quiz Complete!';
    const statsEl = document.getElementById('digitalsumResultStats');
    if(statsEl){
      statsEl.innerHTML =
        '<div>✅ Correct: <b>' + session.correct + '</b></div>' +
        '<div>❌ Wrong: <b>' + session.wrong + '</b></div>' +
        '<div>🎯 Accuracy: <b>' + acc + '%</b></div>' +
        '<div>📝 Attempted: <b>' + total + '/' + session.questions.length + '</b></div>';
    }
    const resultCard = document.getElementById('digitalsumResultCard');
    if(resultCard) resultCard.style.display = 'block';
    const titleEl2 = document.getElementById('digitalsumQuizTitle');
    logQuizActivity(titleEl2 ? titleEl2.textContent : 'Digital Sum', session.correct, total);
    markQuizSetAttempted(prefix, session.setKey);
    if(session.setKey !== 'saved'){
      saveQuizAttemptDetail(prefix, session.setKey, {
        correct: session.correct, wrong: session.wrong, total, acc,
        items: buildMathSolReviewItems(session.questions, session.userAnswers, session.lang)
      });
    }
    ensureResultTopReattemptBtn(resultCard, () => startQuiz(session.lang));
    renderSetMenu();
  }
  function init(){
    renderSetMenu();
    const mainBtn = document.getElementById('calcDigitalSumBtn');
    if(mainBtn) mainBtn.addEventListener('click', () => { renderSetMenu(); showCalcPage('digitalsummenu'); });
    const menuBackBtn = document.getElementById('digitalsumMenuBackBtn');
    if(menuBackBtn) menuBackBtn.addEventListener('click', () => showCalcPage('menu'));
    const langBackBtn = document.getElementById('digitalsumLangBackBtn');
    if(langBackBtn) langBackBtn.addEventListener('click', () => showCalcPage('digitalsummenu'));
    const langHindiBtn = document.getElementById('digitalsumLangHindiBtn');
    if(langHindiBtn) langHindiBtn.addEventListener('click', () => startQuiz('hi'));
    const langEnglishBtn = document.getElementById('digitalsumLangEnglishBtn');
    if(langEnglishBtn) langEnglishBtn.addEventListener('click', () => startQuiz('en'));
    const backBtn = document.getElementById('digitalsumBackBtn');
    if(backBtn) backBtn.addEventListener('click', () => showCalcPage('digitalsummenu'));
    const nextBtn = document.getElementById('digitalsumNextBtn');
    if(nextBtn) nextBtn.addEventListener('click', goToNext);
    const nextBtnTop = document.getElementById('digitalsumNextBtnTop');
    if(nextBtnTop) nextBtnTop.addEventListener('click', goToNext);
    attachQuizSwipeNext('calcPage-digitalsum', goToNext);
    const againBtn = document.getElementById('digitalsumResultAgainBtn');
    if(againBtn) againBtn.addEventListener('click', () => startQuiz(session.lang));
    const resBackBtn = document.getElementById('digitalsumResultBackBtn');
    if(resBackBtn) resBackBtn.addEventListener('click', () => showCalcPage('digitalsummenu'));
  }
  return { init, startQuiz };
}
const digitalsumQuiz = makeDigitalSumQuiz();
// [data moved to data/unitdigit_sets.js]

// ===== Unit Digit Quiz (Math) =====
// DATA FORMAT: UNITDIGIT_SETS.setN = array of questions, each
// { qn: <question number from source>, exam: "<exam name>",
//   en/hi: "<question text>", options:[4], answer:<index 0-3>,
//   sol1: "<Solution 1 - Unit Digit Trick, exact text>",
//   sol2: "<Solution 2 - Concept Clarity, exact text>" }
// 85 questions (Abhinay Maths "Unit Digit" printable sheets Part 1-3, PYQs from
// SSC/RRB/UPSC/Police exams) split into 15-question sets: set1-set5 = 75 Qs,
// set6 = leftover 10 Qs. Same behaviour as the Digital Sum quiz above — first
// asks Hindi-or-English (question text only — exam name, options and both
// solutions stay exactly as given, in their original text). No countdown
// timer — the person can take as long as they like on each set.
function makeUnitDigitQuiz(){
  const prefix = 'unitdigit';
  const SETS = UNITDIGIT_SETS;
  const session = { setKey: null, lang: 'hi', questions: [], index: 0, correct: 0, wrong: 0, answered: false, userAnswers: [] };

  function setLabel(key, count){
    const num = (key.match(/\d+/) || [key])[0];
    return 'Set ' + num + ' (' + count + ' Qs)';
  }
  function buildSetPool(setKey){
    const set = SETS[setKey] || [];
    return set.slice();
  }
  function renderSetMenu(){
    const grid = document.getElementById('unitdigitSetGrid');
    if(!grid) return;
    grid.innerHTML = '';
    Object.keys(SETS).forEach(key => {
      const count = SETS[key].length;
      const lbl = setLabel(key, count);
      if(renderQuizAttemptCard(grid, prefix, key, '🔢', lbl, () => openLangChoice(key))) return;
      const btn = document.createElement('button');
      btn.className = 'calcCard';
      btn.innerHTML =
        '<span class="calcIcon">🔢</span>' +
        '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(lbl) + '</span></span>' +
        '<span class="calcArrow">&#8250;</span>';
      btn.addEventListener('click', () => openLangChoice(key));
      grid.appendChild(btn);
    });
  }
  function openLangChoice(setKey){
    session.setKey = setKey;
    const count = (SETS[setKey] || []).length;
    const titleEl = document.getElementById('unitdigitLangTitle');
    if(titleEl) titleEl.textContent = 'Unit Digit — ' + setLabel(setKey, count);
    showCalcPage('unitdigitlang');
  }
  function startQuiz(lang){
    if(lang) session.lang = lang;
    if(!session.setKey || !SETS[session.setKey]) return;
    session.questions = buildSetPool(session.setKey);
    session.index = 0;
    session.correct = 0;
    session.wrong = 0;
    session.answered = false;
    session.userAnswers = new Array(session.questions.length).fill(null);
    const count = session.questions.length;
    const titleEl = document.getElementById('unitdigitQuizTitle');
    if(titleEl) titleEl.textContent = 'Unit Digit - ' + setLabel(session.setKey, count);
    const resultCard = document.getElementById('unitdigitResultCard');
    if(resultCard) resultCard.style.display = 'none';
    const qWrap = document.getElementById('unitdigitQuestionWrap');
    if(qWrap) qWrap.style.display = '';
    const ansGrid = document.getElementById('unitdigitAnsGrid');
    if(ansGrid) ansGrid.style.display = '';
    const solCard = document.getElementById('unitdigitSolutionCard');
    if(solCard) solCard.style.display = 'none';
    updateStats();
    renderQuestion();
    showCalcPage('unitdigit');
  }
  function updateStats(){
    const c = document.getElementById('unitdigitStatCorrect');
    const w = document.getElementById('unitdigitStatWrong');
    const p = document.getElementById('unitdigitStatProgress');
    if(c) c.textContent = session.correct;
    if(w) w.textContent = session.wrong;
    if(p) p.textContent = 'Q ' + Math.min(session.index + 1, session.questions.length) + '/' + session.questions.length;
  }
  function nextTopRowEl(){
    const btn = document.getElementById('unitdigitNextBtnTop');
    return btn ? btn.closest('.calcNextTopRow') : null;
  }
  function renderQuestion(){
    const q = session.questions[session.index];
    if(!q){ endQuiz(); return; }
    session.answered = false;
    const badgeEl = document.getElementById('unitdigitExamBadge');
    if(badgeEl) badgeEl.textContent = '📋 ' + (q.exam || '—');
    const wordEl = document.getElementById('unitdigitWordText');
    if(wordEl) wordEl.innerHTML = mathify((session.lang === 'en' ? q.en : q.hi) || '—');
    const ansGrid = document.getElementById('unitdigitAnsGrid');
    if(!ansGrid) return;
    ansGrid.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'calcAnsBtn';
      btn.innerHTML = mathify(opt);
      btn.addEventListener('click', () => selectAnswer(i));
      ansGrid.appendChild(btn);
    });
    const solCard = document.getElementById('unitdigitSolutionCard');
    if(solCard) solCard.style.display = 'none';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'none';
    updateStats();
  }
  function formatSteps(text){
    const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
    if(!lines.length) return '';
    return lines.map(ln => '<div class="dsStepLine">' + mathify(ln) + '</div>').join('');
  }

  function selectAnswer(i){
    if(session.answered) return;
    session.answered = true;
    const q = session.questions[session.index];
    const correct = i === q.answer;
    session.userAnswers[session.index] = i;
    if(correct) session.correct++; else session.wrong++;
    document.querySelectorAll('#unitdigitAnsGrid .calcAnsBtn').forEach((b, idx) => {
      b.classList.add('disabled');
      if(idx === q.answer) b.classList.add('correct');
      else if(idx === i) b.classList.add('wrong');
    });
    updateStats();
    const solCard = document.getElementById('unitdigitSolutionCard');
    const solText = document.getElementById('unitdigitSolutionText');
    if(solText){
      const verdict = correct ? '✅ Sahi Jawaab!' : '❌ Galat Jawaab.';
      solText.innerHTML =
        '<div style="font-size:17px;font-weight:700;color:var(--quiz-text);margin-bottom:10px;">' + verdict + '</div>' +
        '<div class="dsSolBlock">' +
          '<div class="dsSolLabel">Solution 1 · Unit Digit Trick</div>' +
          formatSteps(q.sol1) +
        '</div>' +
        '<div class="dsSolBlock">' +
          '<div class="dsSolLabel">Solution 2 · Concept Clarity</div>' +
          formatSteps(q.sol2) +
        '</div>';
    }
    if(solCard) solCard.style.display = 'block';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'flex';
  }
  function goToNext(){
    session.index++;
    if(session.index < session.questions.length) renderQuestion();
    else endQuiz();
  }
  function endQuiz(){
    const total = session.correct + session.wrong;
    const acc = total ? Math.round((session.correct / total) * 100) : 0;
    const qWrap = document.getElementById('unitdigitQuestionWrap');
    if(qWrap) qWrap.style.display = 'none';
    const ansGrid = document.getElementById('unitdigitAnsGrid');
    if(ansGrid) ansGrid.style.display = 'none';
    const solCard = document.getElementById('unitdigitSolutionCard');
    if(solCard) solCard.style.display = 'none';
    const titleResult = document.getElementById('unitdigitResultTitle');
    if(titleResult) titleResult.textContent = '🎉 Quiz Complete!';
    const statsEl = document.getElementById('unitdigitResultStats');
    if(statsEl){
      statsEl.innerHTML =
        '<div>✅ Correct: <b>' + session.correct + '</b></div>' +
        '<div>❌ Wrong: <b>' + session.wrong + '</b></div>' +
        '<div>🎯 Accuracy: <b>' + acc + '%</b></div>' +
        '<div>📝 Attempted: <b>' + total + '/' + session.questions.length + '</b></div>';
    }
    const resultCard = document.getElementById('unitdigitResultCard');
    if(resultCard) resultCard.style.display = 'block';
    const titleEl2 = document.getElementById('unitdigitQuizTitle');
    logQuizActivity(titleEl2 ? titleEl2.textContent : 'Unit Digit', session.correct, total);
    markQuizSetAttempted(prefix, session.setKey);
    if(session.setKey !== 'saved'){
      saveQuizAttemptDetail(prefix, session.setKey, {
        correct: session.correct, wrong: session.wrong, total, acc,
        items: buildMathSolReviewItems(session.questions, session.userAnswers, session.lang)
      });
    }
    ensureResultTopReattemptBtn(resultCard, () => startQuiz(session.lang));
    renderSetMenu();
  }
  function init(){
    renderSetMenu();
    const mainBtn = document.getElementById('calcUnitDigitBtn');
    if(mainBtn) mainBtn.addEventListener('click', () => { renderSetMenu(); showCalcPage('unitdigitmenu'); });
    const menuBackBtn = document.getElementById('unitdigitMenuBackBtn');
    if(menuBackBtn) menuBackBtn.addEventListener('click', () => showCalcPage('menu'));
    const langBackBtn = document.getElementById('unitdigitLangBackBtn');
    if(langBackBtn) langBackBtn.addEventListener('click', () => showCalcPage('unitdigitmenu'));
    const langHindiBtn = document.getElementById('unitdigitLangHindiBtn');
    if(langHindiBtn) langHindiBtn.addEventListener('click', () => startQuiz('hi'));
    const langEnglishBtn = document.getElementById('unitdigitLangEnglishBtn');
    if(langEnglishBtn) langEnglishBtn.addEventListener('click', () => startQuiz('en'));
    const backBtn = document.getElementById('unitdigitBackBtn');
    if(backBtn) backBtn.addEventListener('click', () => showCalcPage('unitdigitmenu'));
    const nextBtn = document.getElementById('unitdigitNextBtn');
    if(nextBtn) nextBtn.addEventListener('click', goToNext);
    const nextBtnTop = document.getElementById('unitdigitNextBtnTop');
    if(nextBtnTop) nextBtnTop.addEventListener('click', goToNext);
    attachQuizSwipeNext('calcPage-unitdigit', goToNext);
    const againBtn = document.getElementById('unitdigitResultAgainBtn');
    if(againBtn) againBtn.addEventListener('click', () => startQuiz(session.lang));
    const resBackBtn = document.getElementById('unitdigitResultBackBtn');
    if(resBackBtn) resBackBtn.addEventListener('click', () => showCalcPage('unitdigitmenu'));
  }
  return { init, startQuiz };
}
const unitdigitQuiz = makeUnitDigitQuiz();

// [data moved to data/statement_sets.js]


// ===== Statement Reasoning Quiz (Assumption / Course of Action / Argument) =====
// DATA FORMAT: STATEMENT_SETS.<topic> = array of questions, each
// { qn, exam: "<exam name>", answer: <0-based correct index>,
//   hi: { prompt: [<line1>, <line2>, ...], options: [4 option strings], solution: "<Hindi solution>" },
//   en: { prompt: [<line1>, <line2>, ...], options: [4 option strings], solution: "<English solution>" } }.
// Topics: assumption (30 Qs), courseofaction (27 Qs), argument (20 Qs) — 77 total,
// PYQs from SSC CGL/CHSL/Steno/Selection Post etc. Like Digital Sum/Unit Digit, this
// first asks Hindi-or-English — but here EVERYTHING (statement, options, solution)
// switches language, not just the question text, since these are language-heavy
// verbal-reasoning questions rather than numeric ones.
// Adds the "conclusion" topic (106 Qs) to STATEMENT_SETS so it shows up
// automatically as a 4th card, reusing the existing Statement engine below.
// Source data had no separate Hindi text, so hi/en both show the English
// text for this topic only (flagged to Rahul — assumption/courseofaction/
// argument keep their real Hindi as before).
if(typeof STATEMENT_CONCLUSION_EXTRA !== 'undefined'){
  STATEMENT_SETS.conclusion = STATEMENT_CONCLUSION_EXTRA;
}

function makeStatementQuiz(){
  const prefix = 'statement';
  const SETS = STATEMENT_SETS;
  const session = { setKey: null, lang: 'hi', questions: [], index: 0, correct: 0, wrong: 0, answered: false, userAnswers: [] };

  const TOPIC_META = {
    assumption:     { hi: 'कथन एवं धारणा',      en: 'Statement & Assumption',      icon: '🧠' },
    courseofaction: { hi: 'कथन एवं कार्यवाही',   en: 'Statement & Course of Action', icon: '🛠️' },
    argument:       { hi: 'कथन एवं तर्क',        en: 'Statement & Argument',        icon: '⚖️' },
    conclusion:     { hi: 'कथन एवं निष्कर्ष',    en: 'Statement & Conclusion',       icon: '🧾' }
  };

  function setLabel(key, count){
    const meta = TOPIC_META[key];
    const name = meta ? meta.en : key;
    return name + ' (' + count + ' Qs)';
  }
  function buildSetPool(setKey){
    const set = SETS[setKey] || [];
    return set.slice();
  }
  // Statement questions ka schema baaki math-quiz modules se alag hai
  // (q.hi/q.en ke andar apna prompt + options nested hain), isliye inke
  // liye apna khaas review-item builder.
  function buildStatementReviewItems(questions, userAnswers, lang){
    return (questions || []).map((q, i) => {
      const langObj = (lang === 'en' ? q.en : q.hi) || q.hi;
      const userIdx = userAnswers ? userAnswers[i] : null;
      const lines = langObj.prompt || [];
      const qHtml = lines.map((ln, idx) =>
        '<div class="' + (idx === 0 ? 'dsStatementLine' : 'dsItemLine') + '">' + mathify(ln) + '</div>'
      ).join('');
      const optionsHtml = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        (langObj.options || []).map((opt, idx) => {
          let cls = 'examReviewOptBtn';
          let mark = '';
          if(idx === q.answer){ cls += ' reviewCorrect'; mark = ' ✓'; }
          else if(idx === userIdx){ cls += ' reviewWrong'; mark = ' ✗'; }
          return '<div class="' + cls + '">' + mathify(opt) + mark + '</div>';
        }).join('') + '</div>';
      const explHtml = langObj.solution
        ? '<div class="dsSolBlock"><div class="dsSolText">' + mathify(langObj.solution) + '</div></div>'
        : '';
      return { qHtml, optionsHtml, explHtml, skipped: (userIdx === null || userIdx === undefined) };
    });
  }
  function renderSetMenu(){
    const grid = document.getElementById('statementSetGrid');
    if(!grid) return;
    grid.innerHTML = '';
    Object.keys(SETS).forEach(key => {
      const count = SETS[key].length;
      const meta = TOPIC_META[key];
      const icon = meta ? meta.icon : '📋';
      const lbl = setLabel(key, count);
      if(renderQuizAttemptCard(grid, prefix, key, icon, lbl, () => openLangChoice(key))) return;
      const btn = document.createElement('button');
      btn.className = 'calcCard';
      btn.innerHTML =
        '<span class="calcIcon">' + icon + '</span>' +
        '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(lbl) + '</span></span>' +
        '<span class="calcArrow">&#8250;</span>';
      btn.addEventListener('click', () => openLangChoice(key));
      grid.appendChild(btn);
    });
  }
  function openLangChoice(setKey){
    session.setKey = setKey;
    const count = (SETS[setKey] || []).length;
    const titleEl = document.getElementById('statementLangTitle');
    if(titleEl) titleEl.textContent = 'Statement Reasoning — ' + setLabel(setKey, count);
    showCalcPage('statementlang');
  }
  function startQuiz(lang){
    if(lang) session.lang = lang;
    if(!session.setKey || !SETS[session.setKey]) return;
    session.questions = buildSetPool(session.setKey);
    session.index = 0;
    session.correct = 0;
    session.wrong = 0;
    session.answered = false;
    session.userAnswers = new Array(session.questions.length).fill(null);
    const count = session.questions.length;
    const titleEl = document.getElementById('statementQuizTitle');
    if(titleEl) titleEl.textContent = setLabel(session.setKey, count);
    const resultCard = document.getElementById('statementResultCard');
    if(resultCard) resultCard.style.display = 'none';
    const qWrap = document.getElementById('statementQuestionWrap');
    if(qWrap) qWrap.style.display = '';
    const ansGrid = document.getElementById('statementAnsGrid');
    if(ansGrid) ansGrid.style.display = '';
    const solCard = document.getElementById('statementSolutionCard');
    if(solCard) solCard.style.display = 'none';
    updateStats();
    renderQuestion();
    showCalcPage('statement');
  }
  function updateStats(){
    const c = document.getElementById('statementStatCorrect');
    const w = document.getElementById('statementStatWrong');
    const p = document.getElementById('statementStatProgress');
    if(c) c.textContent = session.correct;
    if(w) w.textContent = session.wrong;
    if(p) p.textContent = 'Q ' + Math.min(session.index + 1, session.questions.length) + '/' + session.questions.length;
  }
  function nextTopRowEl(){
    const btn = document.getElementById('statementNextBtnTop');
    return btn ? btn.closest('.calcNextTopRow') : null;
  }
  function renderQuestion(){
    const q = session.questions[session.index];
    if(!q){ endQuiz(); return; }
    session.answered = false;
    const langObj = (session.lang === 'en' ? q.en : q.hi) || q.hi;
    const badgeEl = document.getElementById('statementExamBadge');
    if(badgeEl) badgeEl.textContent = '📋 ' + (q.exam || '—');
    const wordEl = document.getElementById('statementWordText');
    if(wordEl){
      const lines = (langObj.prompt || []);
      wordEl.innerHTML = lines.map((ln, i) =>
        '<div class="' + (i === 0 ? 'dsStatementLine' : 'dsItemLine') + '">' + mathify(ln) + '</div>'
      ).join('');
    }
    const ansGrid = document.getElementById('statementAnsGrid');
    if(!ansGrid) return;
    ansGrid.innerHTML = '';
    (langObj.options || []).forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'calcAnsBtn';
      btn.innerHTML = mathify(opt);
      btn.addEventListener('click', () => selectAnswer(i));
      ansGrid.appendChild(btn);
    });
    const solCard = document.getElementById('statementSolutionCard');
    if(solCard) solCard.style.display = 'none';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'none';
    updateStats();
  }
  function selectAnswer(i){
    if(session.answered) return;
    session.answered = true;
    const q = session.questions[session.index];
    const langObj = (session.lang === 'en' ? q.en : q.hi) || q.hi;
    const correct = i === q.answer;
    session.userAnswers[session.index] = i;
    if(correct) session.correct++; else session.wrong++;
    document.querySelectorAll('#statementAnsGrid .calcAnsBtn').forEach((b, idx) => {
      b.classList.add('disabled');
      if(idx === q.answer) b.classList.add('correct');
      else if(idx === i) b.classList.add('wrong');
    });
    updateStats();
    const solCard = document.getElementById('statementSolutionCard');
    const solText = document.getElementById('statementSolutionText');
    if(solText){
      const verdict = session.lang === 'en'
        ? (correct ? '✅ Correct!' : '❌ Incorrect.')
        : (correct ? '✅ सही जवाब!' : '❌ गलत जवाब.');
      const solLabel = session.lang === 'en' ? 'Solution' : 'समाधान';
      solText.innerHTML =
        '<div style="font-size:17px;font-weight:700;color:var(--quiz-text);">' + verdict + '</div>' +
        '<div class="dsSolBlock">' +
          '<div class="dsSolLabel">' + solLabel + '</div>' +
          '<div class="dsSolText">' + mathify(langObj.solution || '') + '</div>' +
        '</div>';
    }
    if(solCard) solCard.style.display = 'block';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'flex';
  }
  function goToNext(){
    session.index++;
    if(session.index < session.questions.length) renderQuestion();
    else endQuiz();
  }
  function endQuiz(){
    const total = session.correct + session.wrong;
    const acc = total ? Math.round((session.correct / total) * 100) : 0;
    const qWrap = document.getElementById('statementQuestionWrap');
    if(qWrap) qWrap.style.display = 'none';
    const ansGrid = document.getElementById('statementAnsGrid');
    if(ansGrid) ansGrid.style.display = 'none';
    const solCard = document.getElementById('statementSolutionCard');
    if(solCard) solCard.style.display = 'none';
    const titleResult = document.getElementById('statementResultTitle');
    if(titleResult) titleResult.textContent = '🎉 Quiz Complete!';
    const statsEl = document.getElementById('statementResultStats');
    if(statsEl){
      statsEl.innerHTML =
        '<div>✅ Correct: <b>' + session.correct + '</b></div>' +
        '<div>❌ Wrong: <b>' + session.wrong + '</b></div>' +
        '<div>🎯 Accuracy: <b>' + acc + '%</b></div>' +
        '<div>📝 Attempted: <b>' + total + '/' + session.questions.length + '</b></div>';
    }
    const resultCard = document.getElementById('statementResultCard');
    if(resultCard) resultCard.style.display = 'block';
    const titleEl2 = document.getElementById('statementQuizTitle');
    logQuizActivity(titleEl2 ? titleEl2.textContent : 'Statement Reasoning', session.correct, total);
    markQuizSetAttempted(prefix, session.setKey);
    if(session.setKey !== 'saved'){
      saveQuizAttemptDetail(prefix, session.setKey, {
        correct: session.correct, wrong: session.wrong, total, acc,
        items: buildStatementReviewItems(session.questions, session.userAnswers, session.lang)
      });
    }
    ensureResultTopReattemptBtn(resultCard, () => startQuiz(session.lang));
    renderSetMenu();
  }
  function init(){
    renderSetMenu();
    const mainBtn = document.getElementById('calcStatementBtn');
    if(mainBtn) mainBtn.addEventListener('click', () => { renderSetMenu(); showCalcPage('statementmenu'); });
    const menuBackBtn = document.getElementById('statementMenuBackBtn');
    if(menuBackBtn) menuBackBtn.addEventListener('click', () => showCalcPage('reasoningchapters'));
    const langBackBtn = document.getElementById('statementLangBackBtn');
    if(langBackBtn) langBackBtn.addEventListener('click', () => showCalcPage('statementmenu'));
    const langHindiBtn = document.getElementById('statementLangHindiBtn');
    if(langHindiBtn) langHindiBtn.addEventListener('click', () => startQuiz('hi'));
    const langEnglishBtn = document.getElementById('statementLangEnglishBtn');
    if(langEnglishBtn) langEnglishBtn.addEventListener('click', () => startQuiz('en'));
    const backBtn = document.getElementById('statementBackBtn');
    if(backBtn) backBtn.addEventListener('click', () => showCalcPage('statementmenu'));
    const nextBtn = document.getElementById('statementNextBtn');
    if(nextBtn) nextBtn.addEventListener('click', goToNext);
    const nextBtnTop = document.getElementById('statementNextBtnTop');
    if(nextBtnTop) nextBtnTop.addEventListener('click', goToNext);
    attachQuizSwipeNext('calcPage-statement', goToNext);
    const againBtn = document.getElementById('statementResultAgainBtn');
    if(againBtn) againBtn.addEventListener('click', () => startQuiz(session.lang));
    const resBackBtn = document.getElementById('statementResultBackBtn');
    if(resBackBtn) resBackBtn.addEventListener('click', () => showCalcPage('statementmenu'));
  }
  return { init, startQuiz };
}
const statementQuiz = makeStatementQuiz();

// [data moved to data/decisionmaking_sets.js]


// ===== Decision Making Quiz =====
// DATA FORMAT: DECISIONMAKING_SETS.setN = array of questions, each
// { qn, hi:{prompt:[...], options:[4], solution:"..."}, en:{...same...}, answer:<index 0-3> }
// 226 questions (bilingual Hindi/English, SSC/RRB/UPSC/Police PYQs on Decision
// Making) split into 15-question sets (set1-set14 = 15 Qs, set15 = 16 Qs).
// First asks Hindi-or-English (question text, options and solution all switch
// with language). Same engine pattern as the Statement Reasoning quiz.
function makeDecisionMakingQuiz(){
  const prefix = 'decisionmaking';
  const SETS = DECISIONMAKING_SETS;
  const session = { setKey: null, lang: 'hi', questions: [], index: 0, correct: 0, wrong: 0, answered: false, userAnswers: [] };

  function setLabel(key, count){
    const num = (key.match(/\d+/) || [key])[0];
    return 'Set ' + num + ' (' + count + ' Qs)';
  }
  function buildSetPool(setKey){
    const set = SETS[setKey] || [];
    return set.slice();
  }
  function buildDecisionMakingReviewItems(questions, userAnswers, lang){
    return (questions || []).map((q, i) => {
      const langObj = (lang === 'en' ? q.en : q.hi) || q.hi;
      const userIdx = userAnswers ? userAnswers[i] : null;
      const lines = langObj.prompt || [];
      const qHtml = lines.map((ln, idx) =>
        '<div class="' + (idx === 0 ? 'dsStatementLine' : 'dsItemLine') + '">' + mathify(ln) + '</div>'
      ).join('');
      const optionsHtml = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        (langObj.options || []).map((opt, idx) => {
          let cls = 'examReviewOptBtn';
          let mark = '';
          if(idx === q.answer){ cls += ' reviewCorrect'; mark = ' ✓'; }
          else if(idx === userIdx){ cls += ' reviewWrong'; mark = ' ✗'; }
          return '<div class="' + cls + '">' + mathify(opt) + mark + '</div>';
        }).join('') + '</div>';
      const explHtml = langObj.solution
        ? '<div class="dsSolBlock"><div class="dsSolText">' + mathify(langObj.solution) + '</div></div>'
        : '';
      return { qHtml, optionsHtml, explHtml, skipped: (userIdx === null || userIdx === undefined) };
    });
  }
  function renderSetMenu(){
    const grid = document.getElementById('decisionmakingSetGrid');
    if(!grid) return;
    grid.innerHTML = '';
    Object.keys(SETS).forEach(key => {
      const count = SETS[key].length;
      const lbl = setLabel(key, count);
      if(renderQuizAttemptCard(grid, prefix, key, '🧭', lbl, () => openLangChoice(key))) return;
      const btn = document.createElement('button');
      btn.className = 'calcCard';
      btn.innerHTML =
        '<span class="calcIcon">🧭</span>' +
        '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(lbl) + '</span></span>' +
        '<span class="calcArrow">&#8250;</span>';
      btn.addEventListener('click', () => openLangChoice(key));
      grid.appendChild(btn);
    });
  }
  function openLangChoice(setKey){
    session.setKey = setKey;
    const count = (SETS[setKey] || []).length;
    const titleEl = document.getElementById('decisionmakingLangTitle');
    if(titleEl) titleEl.textContent = 'Decision Making — ' + setLabel(setKey, count);
    showCalcPage('decisionmakinglang');
  }
  function startQuiz(lang){
    if(lang) session.lang = lang;
    if(!session.setKey || !SETS[session.setKey]) return;
    session.questions = buildSetPool(session.setKey);
    session.index = 0;
    session.correct = 0;
    session.wrong = 0;
    session.answered = false;
    session.userAnswers = new Array(session.questions.length).fill(null);
    const count = session.questions.length;
    const titleEl = document.getElementById('decisionmakingQuizTitle');
    if(titleEl) titleEl.textContent = setLabel(session.setKey, count);
    const resultCard = document.getElementById('decisionmakingResultCard');
    if(resultCard) resultCard.style.display = 'none';
    const qWrap = document.getElementById('decisionmakingQuestionWrap');
    if(qWrap) qWrap.style.display = '';
    const ansGrid = document.getElementById('decisionmakingAnsGrid');
    if(ansGrid) ansGrid.style.display = '';
    const solCard = document.getElementById('decisionmakingSolutionCard');
    if(solCard) solCard.style.display = 'none';
    updateStats();
    renderQuestion();
    showCalcPage('decisionmaking');
  }
  function updateStats(){
    const c = document.getElementById('decisionmakingStatCorrect');
    const w = document.getElementById('decisionmakingStatWrong');
    const p = document.getElementById('decisionmakingStatProgress');
    if(c) c.textContent = session.correct;
    if(w) w.textContent = session.wrong;
    if(p) p.textContent = 'Q ' + Math.min(session.index + 1, session.questions.length) + '/' + session.questions.length;
  }
  function nextTopRowEl(){
    const btn = document.getElementById('decisionmakingNextBtnTop');
    return btn ? btn.closest('.calcNextTopRow') : null;
  }
  function renderQuestion(){
    const q = session.questions[session.index];
    if(!q){ endQuiz(); return; }
    session.answered = false;
    const langObj = (session.lang === 'en' ? q.en : q.hi) || q.hi;
    const badgeEl = document.getElementById('decisionmakingExamBadge');
    if(badgeEl) badgeEl.textContent = '🧭 Decision Making · Q' + (q.qn != null ? q.qn : (session.index + 1));
    const wordEl = document.getElementById('decisionmakingWordText');
    if(wordEl){
      const lines = (langObj.prompt || []);
      wordEl.innerHTML = lines.map((ln, i) =>
        '<div class="' + (i === 0 ? 'dsStatementLine' : 'dsItemLine') + '">' + mathify(ln) + '</div>'
      ).join('');
    }
    const ansGrid = document.getElementById('decisionmakingAnsGrid');
    if(!ansGrid) return;
    ansGrid.innerHTML = '';
    (langObj.options || []).forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'calcAnsBtn';
      btn.innerHTML = mathify(opt);
      btn.addEventListener('click', () => selectAnswer(i));
      ansGrid.appendChild(btn);
    });
    const solCard = document.getElementById('decisionmakingSolutionCard');
    if(solCard) solCard.style.display = 'none';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'none';
    updateStats();
  }
  function selectAnswer(i){
    if(session.answered) return;
    session.answered = true;
    const q = session.questions[session.index];
    const correct = i === q.answer;
    session.userAnswers[session.index] = i;
    if(correct) session.correct++; else session.wrong++;
    document.querySelectorAll('#decisionmakingAnsGrid .calcAnsBtn').forEach((b, idx) => {
      b.classList.add('disabled');
      if(idx === q.answer) b.classList.add('correct');
      else if(idx === i) b.classList.add('wrong');
    });
    updateStats();
    const langObj = (session.lang === 'en' ? q.en : q.hi) || q.hi;
    const solCard = document.getElementById('decisionmakingSolutionCard');
    const solText = document.getElementById('decisionmakingSolutionText');
    if(solText){
      const verdict = correct ? '✅ Sahi Jawaab!' : '❌ Galat Jawaab.';
      solText.innerHTML =
        '<div style="font-size:17px;font-weight:700;color:var(--quiz-text);">' + verdict + '</div>' +
        (langObj.solution
          ? '<div class="dsSolBlock"><div class="dsSolText">' + mathify(langObj.solution) + '</div></div>'
          : '');
    }
    if(solCard) solCard.style.display = 'block';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'flex';
  }
  function goToNext(){
    session.index++;
    if(session.index < session.questions.length) renderQuestion();
    else endQuiz();
  }
  function endQuiz(){
    const total = session.correct + session.wrong;
    const acc = total ? Math.round((session.correct / total) * 100) : 0;
    const qWrap = document.getElementById('decisionmakingQuestionWrap');
    if(qWrap) qWrap.style.display = 'none';
    const ansGrid = document.getElementById('decisionmakingAnsGrid');
    if(ansGrid) ansGrid.style.display = 'none';
    const solCard = document.getElementById('decisionmakingSolutionCard');
    if(solCard) solCard.style.display = 'none';
    const titleResult = document.getElementById('decisionmakingResultTitle');
    if(titleResult) titleResult.textContent = '🎉 Quiz Complete!';
    const statsEl = document.getElementById('decisionmakingResultStats');
    if(statsEl){
      statsEl.innerHTML =
        '<div>✅ Correct: <b>' + session.correct + '</b></div>' +
        '<div>❌ Wrong: <b>' + session.wrong + '</b></div>' +
        '<div>🎯 Accuracy: <b>' + acc + '%</b></div>' +
        '<div>📝 Attempted: <b>' + total + '/' + session.questions.length + '</b></div>';
    }
    const resultCard = document.getElementById('decisionmakingResultCard');
    if(resultCard) resultCard.style.display = 'block';
    const titleEl2 = document.getElementById('decisionmakingQuizTitle');
    logQuizActivity(titleEl2 ? titleEl2.textContent : 'Decision Making', session.correct, total);
    markQuizSetAttempted(prefix, session.setKey);
    if(session.setKey !== 'saved'){
      saveQuizAttemptDetail(prefix, session.setKey, {
        correct: session.correct, wrong: session.wrong, total, acc,
        items: buildDecisionMakingReviewItems(session.questions, session.userAnswers, session.lang)
      });
    }
    ensureResultTopReattemptBtn(resultCard, () => startQuiz(session.lang));
    renderSetMenu();
  }
  function init(){
    renderSetMenu();
    const mainBtn = document.getElementById('calcDecisionMakingBtn');
    if(mainBtn) mainBtn.addEventListener('click', () => { renderSetMenu(); showCalcPage('decisionmakingmenu'); });
    const menuBackBtn = document.getElementById('decisionmakingMenuBackBtn');
    if(menuBackBtn) menuBackBtn.addEventListener('click', () => showCalcPage('reasoningchapters'));
    const langBackBtn = document.getElementById('decisionmakingLangBackBtn');
    if(langBackBtn) langBackBtn.addEventListener('click', () => showCalcPage('decisionmakingmenu'));
    const langHindiBtn = document.getElementById('decisionmakingLangHindiBtn');
    if(langHindiBtn) langHindiBtn.addEventListener('click', () => startQuiz('hi'));
    const langEnglishBtn = document.getElementById('decisionmakingLangEnglishBtn');
    if(langEnglishBtn) langEnglishBtn.addEventListener('click', () => startQuiz('en'));
    const backBtn = document.getElementById('decisionmakingBackBtn');
    if(backBtn) backBtn.addEventListener('click', () => showCalcPage('decisionmakingmenu'));
    const nextBtn = document.getElementById('decisionmakingNextBtn');
    if(nextBtn) nextBtn.addEventListener('click', goToNext);
    const nextBtnTop = document.getElementById('decisionmakingNextBtnTop');
    if(nextBtnTop) nextBtnTop.addEventListener('click', goToNext);
    attachQuizSwipeNext('calcPage-decisionmaking', goToNext);
    const againBtn = document.getElementById('decisionmakingResultAgainBtn');
    if(againBtn) againBtn.addEventListener('click', () => startQuiz(session.lang));
    const resBackBtn = document.getElementById('decisionmakingResultBackBtn');
    if(resBackBtn) resBackBtn.addEventListener('click', () => showCalcPage('decisionmakingmenu'));
  }
  return { init, startQuiz };
}
const decisionmakingQuiz = makeDecisionMakingQuiz();

// ===== Generic reusable bilingual (Hindi/English toggle) quiz engine =====
// Used for new bilingual reasoning categories that don't need Statement's
// multi-topic sub-menu: Seating Arrangement, Order & Ranking, Letter
// Analogy, Letter/Word Position Analysis, Inequality & Word Formation.
// DATA FORMAT: SETS.setN = array of questions, each
// { qn, hi:{prompt:[...], options:[4], solution:"..."}, en:{...same...}, answer:<0-3> }
function makeBilingualSetQuiz(prefix, SETS, label, icon, mainBtnId, unitLabel, menuBackPage){
  const session = { setKey: null, lang: 'hi', questions: [], index: 0, correct: 0, wrong: 0, answered: false, userAnswers: [] };

  function setLabel(key, count){
    const num = (key.match(/\d+/) || [key])[0];
    return (unitLabel || 'Set') + ' ' + num + ' (' + count + ' Qs)';
  }
  function buildSetPool(setKey){
    const set = SETS[setKey] || [];
    return set.slice();
  }
  function buildReviewItems(questions, userAnswers, lang){
    return (questions || []).map((q, i) => {
      const langObj = (lang === 'en' ? q.en : q.hi) || q.hi;
      const userIdx = userAnswers ? userAnswers[i] : null;
      const lines = langObj.prompt || [];
      const qHtml = lines.map((ln, idx) =>
        '<div class="' + (idx === 0 ? 'dsStatementLine' : 'dsItemLine') + '">' + mathify(ln) + '</div>'
      ).join('');
      const optionsHtml = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        (langObj.options || []).map((opt, idx) => {
          let cls = 'examReviewOptBtn';
          let mark = '';
          if(idx === q.answer){ cls += ' reviewCorrect'; mark = ' ✓'; }
          else if(idx === userIdx){ cls += ' reviewWrong'; mark = ' ✗'; }
          return '<div class="' + cls + '">' + mathify(opt) + mark + '</div>';
        }).join('') + '</div>';
      const explHtml = langObj.solution
        ? '<div class="dsSolBlock"><div class="dsSolText">' + mathify(langObj.solution) + '</div></div>'
        : '';
      return { qHtml, optionsHtml, explHtml, skipped: (userIdx === null || userIdx === undefined) };
    });
  }
  function renderSetMenu(){
    const grid = document.getElementById(prefix + 'SetGrid');
    if(!grid) return;
    grid.innerHTML = '';
    Object.keys(SETS).forEach(key => {
      const count = SETS[key].length;
      const lbl = setLabel(key, count);
      if(renderQuizAttemptCard(grid, prefix, key, icon, lbl, () => openLangChoice(key))) return;
      const btn = document.createElement('button');
      btn.className = 'calcCard';
      btn.innerHTML =
        '<span class="calcIcon">' + icon + '</span>' +
        '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(lbl) + '</span></span>' +
        '<span class="calcArrow">&#8250;</span>';
      btn.addEventListener('click', () => openLangChoice(key));
      grid.appendChild(btn);
    });
  }
  function openLangChoice(setKey){
    session.setKey = setKey;
    const count = (SETS[setKey] || []).length;
    const titleEl = document.getElementById(prefix + 'LangTitle');
    if(titleEl) titleEl.textContent = label + ' — ' + setLabel(setKey, count);
    showCalcPage(prefix + 'lang');
  }
  function startQuiz(lang){
    if(lang) session.lang = lang;
    if(!session.setKey || !SETS[session.setKey]) return;
    session.questions = buildSetPool(session.setKey);
    session.index = 0;
    session.correct = 0;
    session.wrong = 0;
    session.answered = false;
    session.userAnswers = new Array(session.questions.length).fill(null);
    const count = session.questions.length;
    const titleEl = document.getElementById(prefix + 'QuizTitle');
    if(titleEl) titleEl.textContent = setLabel(session.setKey, count);
    const resultCard = document.getElementById(prefix + 'ResultCard');
    if(resultCard) resultCard.style.display = 'none';
    const qWrap = document.getElementById(prefix + 'QuestionWrap');
    if(qWrap) qWrap.style.display = '';
    const ansGrid = document.getElementById(prefix + 'AnsGrid');
    if(ansGrid) ansGrid.style.display = '';
    const solCard = document.getElementById(prefix + 'SolutionCard');
    if(solCard) solCard.style.display = 'none';
    updateStats();
    renderQuestion();
    showCalcPage(prefix);
  }
  function updateStats(){
    const c = document.getElementById(prefix + 'StatCorrect');
    const w = document.getElementById(prefix + 'StatWrong');
    const p = document.getElementById(prefix + 'StatProgress');
    if(c) c.textContent = session.correct;
    if(w) w.textContent = session.wrong;
    if(p) p.textContent = 'Q ' + Math.min(session.index + 1, session.questions.length) + '/' + session.questions.length;
  }
  function nextTopRowEl(){
    const btn = document.getElementById(prefix + 'NextBtnTop');
    return btn ? btn.closest('.calcNextTopRow') : null;
  }
  function renderQuestion(){
    const q = session.questions[session.index];
    if(!q){ endQuiz(); return; }
    session.answered = false;
    const langObj = (session.lang === 'en' ? q.en : q.hi) || q.hi;
    const badgeEl = document.getElementById(prefix + 'ExamBadge');
    if(badgeEl) badgeEl.textContent = icon + ' ' + label + ' · Q' + (q.qn != null ? q.qn : (session.index + 1)) + (q.exam ? ' · ' + q.exam : '');
    const wordEl = document.getElementById(prefix + 'WordText');
    if(wordEl){
      const lines = (langObj.prompt || []);
      wordEl.innerHTML = lines.map((ln, i) =>
        '<div class="' + (i === 0 ? 'dsStatementLine' : 'dsItemLine') + '">' + mathify(ln) + '</div>'
      ).join('');
    }
    const ansGrid = document.getElementById(prefix + 'AnsGrid');
    if(!ansGrid) return;
    ansGrid.innerHTML = '';
    (langObj.options || []).forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'calcAnsBtn';
      btn.innerHTML = mathify(opt);
      btn.addEventListener('click', () => selectAnswer(i));
      ansGrid.appendChild(btn);
    });
    const solCard = document.getElementById(prefix + 'SolutionCard');
    if(solCard) solCard.style.display = 'none';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'none';
    updateStats();
  }
  function selectAnswer(i){
    if(session.answered) return;
    session.answered = true;
    const q = session.questions[session.index];
    const correct = i === q.answer;
    session.userAnswers[session.index] = i;
    if(correct) session.correct++; else session.wrong++;
    document.querySelectorAll('#' + prefix + 'AnsGrid .calcAnsBtn').forEach((b, idx) => {
      b.classList.add('disabled');
      if(idx === q.answer) b.classList.add('correct');
      else if(idx === i) b.classList.add('wrong');
    });
    updateStats();
    const langObj = (session.lang === 'en' ? q.en : q.hi) || q.hi;
    const solCard = document.getElementById(prefix + 'SolutionCard');
    const solText = document.getElementById(prefix + 'SolutionText');
    if(solText){
      const verdict = correct ? '✅ Sahi Jawaab!' : '❌ Galat Jawaab.';
      solText.innerHTML =
        '<div style="font-size:17px;font-weight:700;color:var(--quiz-text);">' + verdict + '</div>' +
        (langObj.solution
          ? '<div class="dsSolBlock"><div class="dsSolText">' + mathify(langObj.solution) + '</div></div>'
          : '');
    }
    if(solCard) solCard.style.display = 'block';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'flex';
  }
  function goToNext(){
    session.index++;
    if(session.index < session.questions.length) renderQuestion();
    else endQuiz();
  }
  function endQuiz(){
    const total = session.correct + session.wrong;
    const acc = total ? Math.round((session.correct / total) * 100) : 0;
    const qWrap = document.getElementById(prefix + 'QuestionWrap');
    if(qWrap) qWrap.style.display = 'none';
    const ansGrid = document.getElementById(prefix + 'AnsGrid');
    if(ansGrid) ansGrid.style.display = 'none';
    const solCard = document.getElementById(prefix + 'SolutionCard');
    if(solCard) solCard.style.display = 'none';
    const titleResult = document.getElementById(prefix + 'ResultTitle');
    if(titleResult) titleResult.textContent = '🎉 Quiz Complete!';
    const statsEl = document.getElementById(prefix + 'ResultStats');
    if(statsEl){
      statsEl.innerHTML =
        '<div>✅ Correct: <b>' + session.correct + '</b></div>' +
        '<div>❌ Wrong: <b>' + session.wrong + '</b></div>' +
        '<div>🎯 Accuracy: <b>' + acc + '%</b></div>' +
        '<div>📝 Attempted: <b>' + total + '/' + session.questions.length + '</b></div>';
    }
    const resultCard = document.getElementById(prefix + 'ResultCard');
    if(resultCard) resultCard.style.display = 'block';
    const titleEl2 = document.getElementById(prefix + 'QuizTitle');
    logQuizActivity(titleEl2 ? titleEl2.textContent : label, session.correct, total);
    markQuizSetAttempted(prefix, session.setKey);
    if(session.setKey !== 'saved'){
      saveQuizAttemptDetail(prefix, session.setKey, {
        correct: session.correct, wrong: session.wrong, total, acc,
        items: buildReviewItems(session.questions, session.userAnswers, session.lang)
      });
    }
    ensureResultTopReattemptBtn(resultCard, () => startQuiz(session.lang));
    renderSetMenu();
  }
  function init(){
    renderSetMenu();
    const mainBtn = document.getElementById(mainBtnId);
    if(mainBtn) mainBtn.addEventListener('click', () => { renderSetMenu(); showCalcPage(prefix + 'menu'); });
    const menuBackBtn = document.getElementById(prefix + 'MenuBackBtn');
    if(menuBackBtn) menuBackBtn.addEventListener('click', () => showCalcPage(menuBackPage || 'reasoningchapters'));
    const langBackBtn = document.getElementById(prefix + 'LangBackBtn');
    if(langBackBtn) langBackBtn.addEventListener('click', () => showCalcPage(prefix + 'menu'));
    const langHindiBtn = document.getElementById(prefix + 'LangHindiBtn');
    if(langHindiBtn) langHindiBtn.addEventListener('click', () => startQuiz('hi'));
    const langEnglishBtn = document.getElementById(prefix + 'LangEnglishBtn');
    if(langEnglishBtn) langEnglishBtn.addEventListener('click', () => startQuiz('en'));
    const backBtn = document.getElementById(prefix + 'BackBtn');
    if(backBtn) backBtn.addEventListener('click', () => showCalcPage(prefix + 'menu'));
    const nextBtn = document.getElementById(prefix + 'NextBtn');
    if(nextBtn) nextBtn.addEventListener('click', goToNext);
    const nextBtnTop = document.getElementById(prefix + 'NextBtnTop');
    if(nextBtnTop) nextBtnTop.addEventListener('click', goToNext);
    attachQuizSwipeNext('calcPage-' + prefix, goToNext);
    const againBtn = document.getElementById(prefix + 'ResultAgainBtn');
    if(againBtn) againBtn.addEventListener('click', () => startQuiz(session.lang));
    const resBackBtn = document.getElementById(prefix + 'ResultBackBtn');
    if(resBackBtn) resBackBtn.addEventListener('click', () => showCalcPage(prefix + 'menu'));
  }
  return { init, startQuiz };
}




// ===== Math PYQ Chapterwise Quiz (Learn/Calc tab) =====
// DATA FORMAT: MATH_PYQ_SETS.<chapter> = array of questions, each
// { qn, exam: "<exam name>", en: "<question - English>", hi: "<question - Hindi>",
//   options: [4 option strings], answer: <0-based correct index>,
//   sol: "<worked solution, numeric/English>" }.
// 384 PYQs (SSC CGL/CHSL/MTS/CPO, RRB NTPC etc.) across 11 Arithmetic chapters:
// Percentage, Profit & Loss, Discount, Simple Interest, Compound Interest,
// Installment, Ratio & Proportion, Age, Partnership, Average, Mixture &
// Alligation. Like Digital Sum/Unit Digit, first asks Hindi-or-English for the
// question text; options/solution stay as given (mostly numeric/English) since
// the underlying math doesn't change with language.
// [data moved to data/math_pyq_sets.js]

function makeMathPyqQuiz(){
  const prefix = 'mathpyq';
  const SETS = MATH_PYQ_SETS;
  let mathpyqView = 'mocks'; // 'chapters' | 'mocks' (chapterwise view disabled — mocks only)

  // ===== Saved Mock Attempts (localStorage) =====
  // Jab ek mock "Submit Test" hota hai, uska poora snapshot (questions,
  // apne answers, marks, lang) yahan save ho jaata hai — taaki baad me
  // wapas aakar poora solution review kiya jaa sake, chahe app band karke
  // wapas khola ho. Reattempt karne par purana snapshot naye se overwrite
  // ho jaata hai.
  const MOCK_ATTEMPT_KEY = 'cgl50-mockpyq-attempts';
  function loadMockAttempts(){
    try{
      const raw = localStorage.getItem(MOCK_ATTEMPT_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveMockAttemptsMap(map){
    try{ localStorage.setItem(MOCK_ATTEMPT_KEY, JSON.stringify(map)); }catch(e){}
  }
  function saveMockAttempt(setKey, snapshot){
    const map = loadMockAttempts();
    map[setKey] = snapshot;
    saveMockAttemptsMap(map);
  }
  function getMockAttempt(setKey){
    const map = loadMockAttempts();
    return map[setKey] || null;
  }
  function hasMockAttempt(setKey){
    return !!getMockAttempt(setKey);
  }
  const session = { setKey: null, lang: 'hi', questions: [], index: 0, correct: 0, wrong: 0, answered: false };

  const TOPIC_META = {
    heightdistance: { hi: "ऊँचाई और दूरी", en: "Height & Distance", icon: "🗼" },
    mock01: { hi: "मॉक 1", en: "Mock 1", icon: "📝" },
    mock02: { hi: "मॉक 2", en: "Mock 2", icon: "📝" },
    mock03: { hi: "मॉक 3", en: "Mock 3", icon: "📝" },
    mock04: { hi: "मॉक 4", en: "Mock 4", icon: "📝" },
    mock05: { hi: "मॉक 5", en: "Mock 5", icon: "📝" },
    mock06: { hi: "मॉक 6", en: "Mock 6", icon: "📝" },
    mock07: { hi: "मॉक 7", en: "Mock 7", icon: "📝" },
    mock08: { hi: "मॉक 8", en: "Mock 8", icon: "📝" },
    mock09: { hi: "मॉक 9", en: "Mock 9", icon: "📝" },
    mock10: { hi: "मॉक 10", en: "Mock 10", icon: "📝" },
    mock11: { hi: "मॉक 11", en: "Mock 11", icon: "📝" },
    mock12: { hi: "मॉक 12", en: "Mock 12", icon: "📝" },
    mock13: { hi: "मॉक 13", en: "Mock 13", icon: "📝" },
    mock14: { hi: "मॉक 14", en: "Mock 14", icon: "📝" },
    mock15: { hi: "मॉक 15", en: "Mock 15", icon: "📝" },
    mock16: { hi: "मॉक 16", en: "Mock 16", icon: "📝" },
    mock17: { hi: "मॉक 17", en: "Mock 17", icon: "📝" },
    mock18: { hi: "मॉक 18", en: "Mock 18", icon: "📝" },
    mock19: { hi: "मॉक 19", en: "Mock 19", icon: "📝" },
    mock20: { hi: "मॉक 20", en: "Mock 20", icon: "📝" },
    mock21: { hi: "मॉक 21", en: "Mock 21", icon: "📝" },
    mock22: { hi: "मॉक 22", en: "Mock 22", icon: "📝" },
    mock23: { hi: "मॉक 23", en: "Mock 23", icon: "📝" },
    mock24: { hi: "मॉक 24", en: "Mock 24", icon: "📝" },
    mock25: { hi: "मॉक 25", en: "Mock 25", icon: "📝" },
    mock26: { hi: "मॉक 26", en: "Mock 26", icon: "📝" },
    mock27: { hi: "मॉक 27", en: "Mock 27", icon: "📝" },
    mock28: { hi: "मॉक 28", en: "Mock 28", icon: "📝" },
    mock29: { hi: "मॉक 29", en: "Mock 29", icon: "📝" },
    mock30: { hi: "मॉक 30", en: "Mock 30", icon: "📝" },
    mock31: { hi: "मॉक 31", en: "Mock 31", icon: "📝" },
    mock32: { hi: "मॉक 32", en: "Mock 32", icon: "📝" },
    mock33: { hi: "मॉक 33", en: "Mock 33", icon: "📝" },
    mock34: { hi: "मॉक 34", en: "Mock 34", icon: "📝" },
    mock35: { hi: "मॉक 35", en: "Mock 35", icon: "📝" },
    mock36: { hi: "मॉक 36", en: "Mock 36", icon: "📝" },
    mock37: { hi: "मॉक 37", en: "Mock 37", icon: "📝" },
    mock38: { hi: "मॉक 38", en: "Mock 38", icon: "📝" },
    mock39: { hi: "मॉक 39", en: "Mock 39", icon: "📝" },
    mock40: { hi: "मॉक 40", en: "Mock 40", icon: "📝" },
    mock41: { hi: "मॉक 41", en: "Mock 41", icon: "📝" },
    mock42: { hi: "मॉक 42", en: "Mock 42", icon: "📝" },
    mock43: { hi: "मॉक 43", en: "Mock 43", icon: "📝" },
    mock44: { hi: "मॉक 44", en: "Mock 44", icon: "📝" },
    trigonometry: { hi: "त्रिकोणमिति", en: "Trigonometry", icon: "📐" },
    algebra: { hi: "बीजगणित", en: "Algebra", icon: "🔤" },
    percentage: { hi: "प्रतिशत", en: "Percentage", icon: "📐" },
    profitloss: { hi: "लाभ एवं हानि", en: "Profit & Loss", icon: "💰" },
    discount: { hi: "छूट/बट्टा", en: "Discount", icon: "🏷️" },
    simpleinterest: { hi: "साधारण ब्याज", en: "Simple Interest", icon: "🏦" },
    compoundinterest: { hi: "चक्रवृद्धि ब्याज", en: "Compound Interest", icon: "📈" },
    installment: { hi: "किस्त", en: "Installment", icon: "🧾" },
    ratio: { hi: "अनुपात एवं समानुपात", en: "Ratio & Proportion", icon: "⚖️" },
    age: { hi: "आयु", en: "Age", icon: "🎂" },
    partnership: { hi: "साझेदारी", en: "Partnership", icon: "🤝" },
    average: { hi: "औसत", en: "Average", icon: "📊" },
    mixture: { hi: "मिश्रण तथा पृथ्थीकरण", en: "Mixture & Alligation", icon: "🧪" },
    timework: { hi: "समय तथा कार्य", en: "Time & Work", icon: "⏱️" },
    timespeeddistance: { hi: "समय, चाल और दूरी", en: "Time, Speed & Distance", icon: "🚗" },
    lcmhcf: { hi: "ल.स. एवं म.स.", en: "LCM & HCF", icon: "🔢" },
    polynomials: { hi: "बहुपद", en: "Polynomials", icon: "📉" },
    mensuration2d: { hi: "2D क्षेत्रमिति", en: "2D Mensuration", icon: "📐" },
    geometry: { hi: "ज्यामिति", en: "Geometry", icon: "🔺" },
    numbersystem: { hi: "संख्या पद्धति", en: "Number System", icon: "🔟" },
    sequenceseries: { hi: "श्रृंखला", en: "Sequence & Series", icon: "🔗" },
    race: { hi: "दौड़", en: "Race", icon: "🏁" },
    mensuration3d: { hi: "3D क्षेत्रमिति", en: "3D Mensuration", icon: "🧊" },
    coordinategeometry: { hi: "निर्देशांक ज्यामिति", en: "Co-ordinate Geometry", icon: "📍" }
  };

  function setLabel(key, count){
    const meta = TOPIC_META[key];
    const name = meta ? meta.en : key;
    return name + ' (' + count + ' Qs)';
  }
  function buildSetPool(setKey){
    const set = SETS[setKey] || [];
    // Math PYQ chapters are shown in their original Q1, Q2, Q3... order
    // (not shuffled) so revision feels sequential/predictable.
    return set.slice();
  }
  function renderSetMenu(){
    const grid = document.getElementById('mathpyqSetGrid');
    if(!grid) return;
    grid.innerHTML = '';
    const chapBtn = document.getElementById('mathpyqViewChaptersBtn');
    const mockBtn = document.getElementById('mathpyqViewMocksBtn');
    if(chapBtn) chapBtn.classList.toggle('onbPrimary', mathpyqView === 'chapters');
    if(mockBtn) mockBtn.classList.toggle('onbPrimary', mathpyqView === 'mocks');
    const menuTitleEl = document.getElementById('mathpyqMenuTitle');
    if(menuTitleEl) menuTitleEl.textContent = mathpyqView === 'mocks' ? 'Math PYQ — Choose a Mock (25 Qs mixed, all chapters)' : 'Math PYQ — Choose a Chapter';
    Object.keys(SETS).filter(key => mathpyqView === 'mocks' ? key.indexOf('mock') === 0 : key.indexOf('mock') !== 0).forEach(key => {
      const count = SETS[key].length;
      const meta = TOPIC_META[key];
      const saved = mathpyqView === 'mocks' ? getMockAttempt(key) : null;
      if(saved){
        // Already submitted: tapping the card opens the FULL saved
        // solution review again (nothing lost). A separate small button
        // lets them start a fresh attempt without losing the old one
        // until they actually submit the new attempt.
        const card = document.createElement('div');
        card.className = 'calcCard';
        card.style.cursor = 'pointer';
        card.innerHTML =
          '<span class="calcIcon">' + (meta ? meta.icon : '📐') + '</span>' +
          '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(setLabel(key, count)) + '</span>' +
          '<span style="font-size:11px;color:var(--muted);font-weight:600;">✅ Score: ' + examFormatMarks(saved.marks) + ' · Tap to review</span></span>' +
          '<button type="button" class="mockCardReattemptBtn" style="flex:0 0 auto;background:transparent;border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:11px;color:var(--muted);">🔁</button>';
        card.addEventListener('click', (e) => {
          if(e.target.closest('.mockCardReattemptBtn')) return;
          viewSavedMockAttempt(key);
        });
        const reBtn = card.querySelector('.mockCardReattemptBtn');
        if(reBtn) reBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openLangChoice(key);
        });
        grid.appendChild(card);
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'calcCard';
      btn.innerHTML =
        '<span class="calcIcon">' + (meta ? meta.icon : '📐') + '</span>' +
        '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(setLabel(key, count)) + '</span></span>' +
        (isQuizSetAttempted(prefix, key) ? '<span class="calcDoneBadge">✅</span>' : '') +
        '<span class="calcArrow">&#8250;</span>';
      btn.addEventListener('click', () => openLangChoice(key));
      grid.appendChild(btn);
    });
  }
  function openLangChoice(setKey){
    session.setKey = setKey;
    const count = (SETS[setKey] || []).length;
    const titleEl = document.getElementById('mathpyqLangTitle');
    if(titleEl) titleEl.textContent = 'Math PYQ — ' + setLabel(setKey, count);
    showCalcPage('mathpyqlang');
  }
  function startQuiz(lang){
    if(lang) session.lang = lang;
    if(!session.setKey || !SETS[session.setKey]) return;
    session.questions = buildSetPool(session.setKey);
    session.index = 0;
    session.correct = 0;
    session.wrong = 0;
    session.answered = false;
    const count = session.questions.length;
    const titleEl = document.getElementById('mathpyqQuizTitle');
    if(titleEl) titleEl.textContent = setLabel(session.setKey, count);
    const resultCard = document.getElementById('mathpyqResultCard');
    if(resultCard) resultCard.style.display = 'none';
    const qWrap = document.getElementById('mathpyqQuestionWrap');
    if(qWrap) qWrap.style.display = '';
    const ansGrid = document.getElementById('mathpyqAnsGrid');
    if(ansGrid) ansGrid.style.display = '';
    const solCard = document.getElementById('mathpyqSolutionCard');
    if(solCard) solCard.style.display = 'none';
    updateStats();
    renderQuestion();
    showCalcPage('mathpyq');
  }
  function updateStats(){
    const c = document.getElementById('mathpyqStatCorrect');
    const w = document.getElementById('mathpyqStatWrong');
    const p = document.getElementById('mathpyqStatProgress');
    if(c) c.textContent = session.correct;
    if(w) w.textContent = session.wrong;
    if(p) p.textContent = 'Q ' + Math.min(session.index + 1, session.questions.length) + '/' + session.questions.length;
  }
  function nextTopRowEl(){
    const btn = document.getElementById('mathpyqNextBtnTop');
    return btn ? btn.closest('.calcNextTopRow') : null;
  }
  function renderQuestion(){
    const q = session.questions[session.index];
    if(!q){ endQuiz(); return; }
    session.answered = false;
    const badgeEl = document.getElementById('mathpyqExamBadge');
    if(badgeEl) badgeEl.textContent = '📋 ' + (q.exam || '—');
    const wordEl = document.getElementById('mathpyqWordText');
    if(wordEl) wordEl.innerHTML = mathify('Q' + q.qn + '. ' + ((session.lang === 'en' ? q.en : q.hi) || '—'));
    const imgEl = document.getElementById('mathpyqQuestionImg');
    if(imgEl){
      if(q.img){ imgEl.src = q.img; imgEl.style.display = 'block'; }
      else { imgEl.style.display = 'none'; imgEl.removeAttribute('src'); }
    }
    const ansGrid = document.getElementById('mathpyqAnsGrid');
    if(!ansGrid) return;
    ansGrid.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'calcAnsBtn';
      btn.innerHTML = mathify(opt);
      btn.addEventListener('click', () => selectAnswer(i));
      ansGrid.appendChild(btn);
    });
    const solCard = document.getElementById('mathpyqSolutionCard');
    if(solCard) solCard.style.display = 'none';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'none';
    updateStats();
  }
  function selectAnswer(i){
    if(session.answered) return;
    session.answered = true;
    const q = session.questions[session.index];
    const correct = i === q.answer;
    if(correct) session.correct++; else session.wrong++;
    document.querySelectorAll('#mathpyqAnsGrid .calcAnsBtn').forEach((b, idx) => {
      b.classList.add('disabled');
      if(idx === q.answer) b.classList.add('correct');
      else if(idx === i) b.classList.add('wrong');
    });
    updateStats();
    const solCard = document.getElementById('mathpyqSolutionCard');
    const solText = document.getElementById('mathpyqSolutionText');
    if(solText){
      const verdict = session.lang === 'en'
        ? (correct ? '✅ Correct!' : '❌ Incorrect.')
        : (correct ? '✅ सही जवाब!' : '❌ गलत जवाब.');
      const solLabel = session.lang === 'en' ? 'Solution' : 'समाधान';
      solText.innerHTML =
        '<div style="font-size:17px;font-weight:700;color:var(--quiz-text);">' + verdict + '</div>' +
        '<div class="dsSolBlock">' +
          '<div class="dsSolLabel">' + solLabel + '</div>' +
          formatSolSteps(q.sol || '') +
        '</div>';
    }
    if(solCard) solCard.style.display = 'block';
    const nextTopRow = nextTopRowEl();
    if(nextTopRow) nextTopRow.style.display = 'flex';
  }
  function goToNext(){
    session.index++;
    if(session.index < session.questions.length) renderQuestion();
    else endQuiz();
  }
  function endQuiz(){
    const total = session.correct + session.wrong;
    const acc = total ? Math.round((session.correct / total) * 100) : 0;
    const qWrap = document.getElementById('mathpyqQuestionWrap');
    if(qWrap) qWrap.style.display = 'none';
    const ansGrid = document.getElementById('mathpyqAnsGrid');
    if(ansGrid) ansGrid.style.display = 'none';
    const solCard = document.getElementById('mathpyqSolutionCard');
    if(solCard) solCard.style.display = 'none';
    const titleResult = document.getElementById('mathpyqResultTitle');
    if(titleResult) titleResult.textContent = '🎉 Quiz Complete!';
    const statsEl = document.getElementById('mathpyqResultStats');
    if(statsEl){
      statsEl.innerHTML =
        '<div>✅ Correct: <b>' + session.correct + '</b></div>' +
        '<div>❌ Wrong: <b>' + session.wrong + '</b></div>' +
        '<div>🎯 Accuracy: <b>' + acc + '%</b></div>' +
        '<div>📝 Attempted: <b>' + total + '/' + session.questions.length + '</b></div>';
    }
    const resultCard = document.getElementById('mathpyqResultCard');
    if(resultCard) resultCard.style.display = 'block';
    const titleEl2 = document.getElementById('mathpyqQuizTitle');
    logQuizActivity(titleEl2 ? titleEl2.textContent : 'Math PYQ', session.correct, total);
    markQuizSetAttempted(prefix, session.setKey);
    renderSetMenu();
  }
  function init(){
    renderSetMenu();
    const mainBtn = document.getElementById('calcMathPyqBtn');
    if(mainBtn) mainBtn.addEventListener('click', () => { mathpyqView = 'mocks'; renderSetMenu(); showCalcPage('mathpyqmenu'); });
    const chapterwiseBtn = document.getElementById('calcMathChapterwiseBtn');
    if(chapterwiseBtn) chapterwiseBtn.addEventListener('click', () => { mathpyqView = 'chapters'; renderSetMenu(); showCalcPage('mathpyqmenu'); });
    const menuBackBtn = document.getElementById('mathpyqMenuBackBtn');
    if(menuBackBtn) menuBackBtn.addEventListener('click', () => showCalcPage('menu'));
    const viewChaptersBtn = document.getElementById('mathpyqViewChaptersBtn');
    if(viewChaptersBtn) viewChaptersBtn.addEventListener('click', () => { mathpyqView = 'chapters'; renderSetMenu(); });
    const viewMocksBtn = document.getElementById('mathpyqViewMocksBtn');
    if(viewMocksBtn) viewMocksBtn.addEventListener('click', () => { mathpyqView = 'mocks'; renderSetMenu(); });
    const langBackBtn = document.getElementById('mathpyqLangBackBtn');
    if(langBackBtn) langBackBtn.addEventListener('click', () => showCalcPage('mathpyqmenu'));
    const langHindiBtn = document.getElementById('mathpyqLangHindiBtn');
    if(langHindiBtn) langHindiBtn.addEventListener('click', () => {
      if(session.setKey && session.setKey.indexOf('mock') === 0) startExamQuiz('hi'); else startQuiz('hi');
    });
    const langEnglishBtn = document.getElementById('mathpyqLangEnglishBtn');
    if(langEnglishBtn) langEnglishBtn.addEventListener('click', () => {
      if(session.setKey && session.setKey.indexOf('mock') === 0) startExamQuiz('en'); else startQuiz('en');
    });
    const backBtn = document.getElementById('mathpyqBackBtn');
    if(backBtn) backBtn.addEventListener('click', () => showCalcPage('mathpyqmenu'));
    const nextBtn = document.getElementById('mathpyqNextBtn');
    if(nextBtn) nextBtn.addEventListener('click', goToNext);
    const nextBtnTop = document.getElementById('mathpyqNextBtnTop');
    if(nextBtnTop) nextBtnTop.addEventListener('click', goToNext);
    attachQuizSwipeNext('calcPage-mathpyq', goToNext);
    const againBtn = document.getElementById('mathpyqResultAgainBtn');
    if(againBtn) againBtn.addEventListener('click', () => startQuiz(session.lang));
    const resBackBtn = document.getElementById('mathpyqResultBackBtn');
    if(resBackBtn) resBackBtn.addEventListener('click', () => showCalcPage('mathpyqmenu'));
  }
  // ===== Testbook-style Exam Mode (Mocks only: 15-min timer, question
  // palette, Mark for Review, Submit Test, then a solution+marks review
  // screen). Chapter-wise quizzes above are untouched and keep the old
  // instant-feedback flow. =====
  const EXAM_DURATION_SEC = 15 * 60;
  const EXAM_MARKS_CORRECT = 2;
  const EXAM_MARKS_WRONG = -0.5;
  const examSession = {
    setKey: null, lang: 'hi', questions: [],
    answers: [], marked: [], visited: [],
    current: 0, timeLeft: EXAM_DURATION_SEC, timerId: null, submitted: false, paused: false
  };

  function examFormatMarks(m){
    return (Math.round(m * 100) / 100).toString();
  }

  function startExamQuiz(lang){
    if(lang) session.lang = lang;
    if(!session.setKey || !SETS[session.setKey]) return;
    examSession.setKey = session.setKey;
    examSession.lang = session.lang;
    examSession.questions = buildSetPool(session.setKey);
    const n = examSession.questions.length;
    examSession.answers = new Array(n).fill(null);
    examSession.marked = new Array(n).fill(false);
    examSession.visited = new Array(n).fill(false);
    examSession.current = 0;
    examSession.timeLeft = EXAM_DURATION_SEC;
    examSession.submitted = false;
    examSession.paused = false;
    const titleEl = document.getElementById('examTitle');
    if(titleEl) titleEl.textContent = setLabel(session.setKey, n);
    examStopTimer();
    examStartTimer();
    examSetPausedUI(false);
    examRenderQuestion();
    showCalcPage('mathpyqexam');
  }

  function examFormatTime(sec){
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return (m < 10 ? '0' + m : m) + ':' + (r < 10 ? '0' + r : r);
  }
  function examUpdateTimerDisplay(){
    const el = document.getElementById('examTimerPill');
    if(!el) return;
    el.textContent = '⏱ ' + examFormatTime(examSession.timeLeft);
    el.classList.toggle('examTimerLow', examSession.timeLeft <= 120);
  }
  function examStartTimer(){
    examUpdateTimerDisplay();
    examSession.timerId = setInterval(() => {
      examSession.timeLeft--;
      examUpdateTimerDisplay();
      if(examSession.timeLeft <= 0){
        examStopTimer();
        examSubmit();
      }
    }, 1000);
  }
  function examStopTimer(){
    if(examSession.timerId){ clearInterval(examSession.timerId); examSession.timerId = null; }
  }

  // ===== Pause/Resume — stops the countdown, hides the question+palette
  // under a blur overlay, and locks the nav-row buttons so nothing can be
  // answered/skipped while paused. Timer picks up exactly where it left off. =====
  function examSetPausedUI(paused){
    const btn = document.getElementById('examPauseBtn');
    if(btn){
      btn.textContent = paused ? '▶' : '⏸';
      btn.title = paused ? 'Resume Test' : 'Pause Test';
      btn.classList.toggle('paused', paused);
    }
    const overlay = document.getElementById('examPauseOverlay');
    if(overlay) overlay.style.display = paused ? 'flex' : 'none';
    ['examMarkBtn','examClearBtn','examSaveNextBtn','examSaveNextBtnBottom','examSubmitBtn'].forEach(id => {
      const b = document.getElementById(id);
      if(b) b.disabled = paused;
    });
  }
  function examTogglePause(){
    if(examSession.submitted) return;
    examSession.paused = !examSession.paused;
    if(examSession.paused) examStopTimer();
    else examStartTimer();
    examSetPausedUI(examSession.paused);
  }

  function examPaletteState(i){
    const answered = examSession.answers[i] !== null && examSession.answers[i] !== undefined;
    const marked = examSession.marked[i];
    if(marked && answered) return 'pAnsweredMarked';
    if(marked) return 'pMarked';
    if(answered) return 'pAnswered';
    if(examSession.visited[i]) return 'pNotAnswered';
    return '';
  }
  function examRenderPalette(){
    const grid = document.getElementById('examPaletteGrid');
    if(!grid) return;
    grid.innerHTML = '';
    examSession.questions.forEach((q, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'examPaletteBtn ' + examPaletteState(i) + (i === examSession.current ? ' pCurrent' : '');
      btn.textContent = i + 1;
      btn.addEventListener('click', () => examGoTo(i));
      grid.appendChild(btn);
    });
  }

  function examRenderQuestion(){
    const q = examSession.questions[examSession.current];
    if(!q) return;
    examSession.visited[examSession.current] = true;
    const qnoEl = document.getElementById('examQNo');
    if(qnoEl) qnoEl.textContent = 'Question No. ' + (examSession.current + 1);
    const badgeEl = document.getElementById('examExamBadge');
    if(badgeEl) badgeEl.textContent = '📋 ' + (q.exam || '—');
    const wordEl = document.getElementById('examWordText');
    if(wordEl) wordEl.innerHTML = mathify('Q' + q.qn + '. ' + ((examSession.lang === 'en' ? q.en : q.hi) || '—'));
    const imgEl = document.getElementById('examQuestionImg');
    if(imgEl){
      if(q.img){ imgEl.src = q.img; imgEl.style.display = 'block'; }
      else { imgEl.style.display = 'none'; imgEl.removeAttribute('src'); }
    }
    const optList = document.getElementById('examOptList');
    if(optList){
      optList.innerHTML = '';
      const selected = examSession.answers[examSession.current];
      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'examOptBtn' + (selected === i ? ' selected' : '');
        btn.innerHTML = '<span class="examOptMark">' + String.fromCharCode(65 + i) + '</span><span>' + mathify(opt) + '</span>';
        btn.addEventListener('click', () => examSelectOption(i));
        optList.appendChild(btn);
      });
    }
    const markBtn = document.getElementById('examMarkBtn');
    if(markBtn) markBtn.textContent = examSession.marked[examSession.current] ? '🚩 Marked ✓' : '🚩 Mark for Review';
    examRenderPalette();
  }

  function examSelectOption(i){
    examSession.answers[examSession.current] = i;
    examRenderQuestion();
  }
  function examGoTo(idx){
    if(idx < 0 || idx >= examSession.questions.length) return;
    examSession.current = idx;
    examRenderQuestion();
  }
  function examSaveNext(){
    if(examSession.current < examSession.questions.length - 1) examGoTo(examSession.current + 1);
    else examRenderPalette();
  }
  function examMarkForReview(){
    examSession.marked[examSession.current] = !examSession.marked[examSession.current];
    if(examSession.current < examSession.questions.length - 1) examGoTo(examSession.current + 1);
    else examRenderQuestion();
  }
  function examClearResponse(){
    examSession.answers[examSession.current] = null;
    examRenderQuestion();
  }

  function examConfirmSubmit(){
    const total = examSession.questions.length;
    const answered = examSession.answers.filter(a => a !== null && a !== undefined).length;
    const notAnswered = total - answered;
    const ok = confirm('Answered: ' + answered + '\nNot Answered: ' + notAnswered + '\n\nSubmit test now? Ye action wapas nahi ho sakta.');
    if(ok){ examStopTimer(); examSubmit(); }
  }

  function examSubmit(){
    if(examSession.submitted) return;
    examSession.submitted = true;
    examStopTimer();
    let correct = 0, wrong = 0;
    examSession.questions.forEach((q, i) => {
      const a = examSession.answers[i];
      if(a === null || a === undefined) return;
      if(a === q.answer) correct++; else wrong++;
    });
    const skipped = examSession.questions.length - correct - wrong;
    const marks = (correct * EXAM_MARKS_CORRECT) + (wrong * EXAM_MARKS_WRONG);
    const attempted = correct + wrong;
    const acc = attempted ? Math.round((correct / attempted) * 100) : 0;
    const titleEl = document.getElementById('resultTitle');
    if(titleEl) titleEl.textContent = setLabel(examSession.setKey, examSession.questions.length);
    const summaryEl = document.getElementById('examResultSummary');
    if(summaryEl){
      summaryEl.innerHTML =
        '<div class="examSumCard"><div class="n" style="color:var(--blue);">' + examFormatMarks(marks) + '</div><div class="l">Total Marks</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--gain);">' + correct + '</div><div class="l">Correct</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--loss);">' + wrong + '</div><div class="l">Wrong</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--muted);">' + skipped + '</div><div class="l">Skipped</div></div>' +
        '<div class="examSumCard"><div class="n">' + acc + '%</div><div class="l">Accuracy</div></div>' +
        '<div class="examSumCard"><div class="n">' + examSession.questions.length + '</div><div class="l">Total Qs</div></div>';
    }
    logQuizActivity(setLabel(examSession.setKey, examSession.questions.length), correct, attempted);
    logMathMockToSectional(setLabel(examSession.setKey, examSession.questions.length), marks, correct, wrong, skipped);
    markQuizSetAttempted(prefix, examSession.setKey);
    saveMockAttempt(examSession.setKey, {
      setKey: examSession.setKey,
      lang: examSession.lang,
      questions: examSession.questions,
      answers: examSession.answers,
      marked: examSession.marked,
      visited: examSession.visited,
      correct: correct, wrong: wrong, skipped: skipped,
      marks: marks, attempted: attempted, acc: acc,
      submittedAt: Date.now()
    });
    resultRenderPalette();
    resultGoTo(0);
    showCalcPage('mathpyqresult');
  }

  // Loads a previously-saved mock attempt (without re-taking the test) and
  // shows the full result/solution review screen exactly like a fresh
  // submit would — so past mocks stay reviewable forever.
  function viewSavedMockAttempt(setKey){
    const saved = getMockAttempt(setKey);
    if(!saved) return;
    examSession.setKey = saved.setKey;
    examSession.lang = saved.lang;
    examSession.questions = saved.questions;
    examSession.answers = saved.answers;
    examSession.marked = saved.marked || [];
    examSession.visited = saved.visited || [];
    examSession.current = 0;
    examSession.submitted = true;
    examStopTimer();
    const titleEl = document.getElementById('resultTitle');
    if(titleEl) titleEl.textContent = setLabel(saved.setKey, saved.questions.length);
    const summaryEl = document.getElementById('examResultSummary');
    if(summaryEl){
      summaryEl.innerHTML =
        '<div class="examSumCard"><div class="n" style="color:var(--blue);">' + examFormatMarks(saved.marks) + '</div><div class="l">Total Marks</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--gain);">' + saved.correct + '</div><div class="l">Correct</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--loss);">' + saved.wrong + '</div><div class="l">Wrong</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--muted);">' + saved.skipped + '</div><div class="l">Skipped</div></div>' +
        '<div class="examSumCard"><div class="n">' + saved.acc + '%</div><div class="l">Accuracy</div></div>' +
        '<div class="examSumCard"><div class="n">' + saved.questions.length + '</div><div class="l">Total Qs</div></div>';
    }
    resultRenderPalette();
    resultGoTo(0);
    showCalcPage('mathpyqresult');
  }

  function resultQState(i){
    const a = examSession.answers[i];
    const q = examSession.questions[i];
    if(a === null || a === undefined) return 'skipped';
    return a === q.answer ? 'correct' : 'wrong';
  }
  function resultRenderPalette(){
    const grid = document.getElementById('resultPaletteGrid');
    if(!grid) return;
    grid.innerHTML = '';
    examSession.questions.forEach((q, i) => {
      const st = resultQState(i);
      const cls = st === 'correct' ? 'pAnswered' : st === 'wrong' ? 'pNotAnswered' : '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'examPaletteBtn ' + cls + (i === examSession.current ? ' pCurrent' : '');
      btn.textContent = i + 1;
      btn.addEventListener('click', () => resultGoTo(i));
      grid.appendChild(btn);
    });
  }
  let resultRevealed = false;
  function resultGoTo(idx){
    if(idx < 0 || idx >= examSession.questions.length) return;
    examSession.current = idx;
    resultRevealed = false;
    resultRenderQuestion();
    resultRenderPalette();
  }
  function resultReveal(){
    if(resultRevealed) return;
    resultRevealed = true;
    resultRenderQuestion();
  }
  function resultRenderQuestion(){
    const i = examSession.current;
    const q = examSession.questions[i];
    if(!q) return;
    const qnoEl = document.getElementById('resultQNo');
    if(qnoEl) qnoEl.textContent = 'Question No. ' + (i + 1);
    const st = resultQState(i);
    const tagWrap = document.getElementById('resultTagWrap');
    if(tagWrap){
      if(resultRevealed){
        const label = st === 'correct' ? '✅ Correct' : st === 'wrong' ? '❌ Incorrect' : '⏭ Skipped';
        const cls = st === 'correct' ? 'tagCorrect' : st === 'wrong' ? 'tagWrong' : 'tagSkipped';
        tagWrap.innerHTML = '<span class="examReviewTag ' + cls + '">' + label + '</span>';
      } else {
        tagWrap.innerHTML = '<span class="examReviewTag" style="background:#3a3742;color:var(--muted);">👆 Tap question to view answer & solution</span>';
      }
    }
    const badgeEl = document.getElementById('resultExamBadge');
    if(badgeEl) badgeEl.textContent = '📋 ' + (q.exam || '—');
    const wordEl = document.getElementById('resultWordText');
    if(wordEl) wordEl.innerHTML = mathify('Q' + q.qn + '. ' + ((examSession.lang === 'en' ? q.en : q.hi) || '—'));
    const imgEl = document.getElementById('resultQuestionImg');
    if(imgEl){
      if(q.img){ imgEl.src = q.img; imgEl.style.display = 'block'; }
      else { imgEl.style.display = 'none'; imgEl.removeAttribute('src'); }
    }
    const optList = document.getElementById('resultOptList');
    if(optList){
      optList.innerHTML = '';
      const userAns = examSession.answers[i];
      q.options.forEach((opt, idx) => {
        const div = document.createElement('div');
        let cls = 'examReviewOptBtn';
        let tag = '';
        if(resultRevealed){
          if(idx === q.answer) cls += ' reviewCorrect';
          else if(idx === userAns) cls += ' reviewWrong';
          tag = idx === q.answer ? ' ✅' : (idx === userAns ? ' ❌' : '');
        }
        div.className = cls;
        div.innerHTML = '<span class="examOptMark">' + String.fromCharCode(65 + idx) + '</span><span>' + mathify(opt) + tag + '</span>';
        optList.appendChild(div);
      });
    }
    const solCard = document.getElementById('resultSolutionCard');
    const solText = document.getElementById('resultSolutionText');
    if(resultRevealed){
      if(solText) solText.innerHTML = formatSolSteps(q.sol || '');
      if(solCard) solCard.style.display = 'block';
    } else {
      if(solText) solText.innerHTML = '';
      if(solCard) solCard.style.display = 'none';
    }
    const prevBtn = document.getElementById('resultPrevBtn');
    if(prevBtn) prevBtn.disabled = (i === 0);
    const nextBtn = document.getElementById('resultNextBtn');
    if(nextBtn) nextBtn.textContent = (i === examSession.questions.length - 1) ? 'Done ✓' : 'Next ➜';
  }

  function initExamMode(){
    const examBackBtn = document.getElementById('examBackBtn');
    if(examBackBtn) examBackBtn.addEventListener('click', () => {
      if(confirm('Exit test? Aapki progress save nahi hogi.')){ examStopTimer(); showCalcPage('mathpyqmenu'); }
    });
    const examSubmitBtn = document.getElementById('examSubmitBtn');
    if(examSubmitBtn) examSubmitBtn.addEventListener('click', examConfirmSubmit);
    const examMarkBtn = document.getElementById('examMarkBtn');
    if(examMarkBtn) examMarkBtn.addEventListener('click', examMarkForReview);
    const examClearBtn = document.getElementById('examClearBtn');
    if(examClearBtn) examClearBtn.addEventListener('click', examClearResponse);
    const examSaveNextBtn = document.getElementById('examSaveNextBtn');
    if(examSaveNextBtn) examSaveNextBtn.addEventListener('click', examSaveNext);
    const examSaveNextBtnBottom = document.getElementById('examSaveNextBtnBottom');
    if(examSaveNextBtnBottom) examSaveNextBtnBottom.addEventListener('click', examSaveNext);
    const examPauseBtn = document.getElementById('examPauseBtn');
    if(examPauseBtn) examPauseBtn.addEventListener('click', examTogglePause);
    const examResumeBtn = document.getElementById('examResumeBtn');
    if(examResumeBtn) examResumeBtn.addEventListener('click', examTogglePause);
    const resultBackBtn = document.getElementById('resultBackBtn');
    if(resultBackBtn) resultBackBtn.addEventListener('click', () => showCalcPage('mathpyqmenu'));
    const resultReattemptBtn = document.getElementById('resultReattemptBtn');
    if(resultReattemptBtn) resultReattemptBtn.addEventListener('click', () => {
      if(confirm('Is mock ko dobara attempt karna hai? Naya attempt submit karne par purana result overwrite ho jaayega.')){
        session.setKey = examSession.setKey;
        startExamQuiz(examSession.lang);
      }
    });
    const resultPrevBtn = document.getElementById('resultPrevBtn');
    if(resultPrevBtn) resultPrevBtn.addEventListener('click', () => resultGoTo(examSession.current - 1));
    const resultNextBtn = document.getElementById('resultNextBtn');
    if(resultNextBtn) resultNextBtn.addEventListener('click', () => {
      if(examSession.current < examSession.questions.length - 1) resultGoTo(examSession.current + 1);
      else showCalcPage('mathpyqmenu');
    });
    const resultQuestionWrap = document.getElementById('resultQuestionWrap');
    if(resultQuestionWrap) resultQuestionWrap.addEventListener('click', resultReveal);
    const resultOptList = document.getElementById('resultOptList');
    if(resultOptList) resultOptList.addEventListener('click', resultReveal);
    const resultTagWrap = document.getElementById('resultTagWrap');
    if(resultTagWrap) resultTagWrap.addEventListener('click', resultReveal);
  }

  return { init, startQuiz, initExamMode };
}
const mathPyqQuiz = makeMathPyqQuiz();

// ===== Reasoning Chapterwise (directory page) =====
// Ek hi jagah se saare reasoning quizzes (Odd One Out se lekar Word
// Formation tak) chapter-list ki tarah dikhte hain — bilkul Math
// Chapterwise jaisa. Har row apna original quiz hi kholta hai (koi data/
// logic duplicate nahi hua), bas entry point + un sab ka "back" ab yahi
// list page par wapas aata hai, root menu par seedha nahi.
(function initReasoningChaptersPage(){
  const openBtn = document.getElementById('calcReasoningChaptersBtn');
  if(openBtn) openBtn.addEventListener('click', () => showCalcPage('reasoningchapters'));
  const backBtn = document.getElementById('reasoningChaptersBackBtn');
  if(backBtn) backBtn.addEventListener('click', () => showCalcPage('menu'));
})();



// ===== Phrasal Verbs Quiz (Learn/Calc tab) =====
// DATA FORMAT: PHRASAL_SETS.setN = array of up to 10 questions, each
// { word: "fill-in-the-blank sentence", options: [4 phrasal verbs],
//   answer: <0-based correct index>, explanation: [Hinglish lines] }.
// 245 questions (SSC CGL "Phrasal Verbs — Fill in the Blanks" bank) split
// into 25 sets of 10 (last set has 5). Reuses the generic makeReasoningQuiz
// engine — Set list, Saved Questions ⭐, stats row, sab kuch same pattern.
// [data moved to data/phrasal_sets.js]


const phrasalQuiz = makeReasoningQuiz('phrasal', PHRASAL_SETS, 'Phrasal Verbs', 'menu');

// ===== Active ↔ Passive Voice Quiz (Learn/Calc tab) =====
// DATA FORMAT: VOICE_SETS.setN = array of 10 questions, each
// { word: sentence to convert (with tense/pattern tag in [brackets]),
//   options: 4 converted choices, answer: 0-based correct index,
//   explanation: [rule line] }. 100 Qs total across 10 sets, in the
//   original curated order (basic tenses -> modals -> advanced traps).
// ===== Active ↔ Passive Voice Quiz (Learn/Calc tab) =====
// DATA FORMAT: VOICE_SETS.setN = array of 10 questions, each
// { word: sentence to convert (with a [Direction] tag), options: 4
//   converted choices, answer: 0-based correct index, explanation:
//   [rule line] }. 100 Qs total across 10 sets, in the original curated
//   order (basic tenses -> modals -> advanced traps).
// [data moved to data/voice_sets.js]


const voiceQuiz = makeReasoningQuiz('voice', VOICE_SETS, 'Active ↔ Passive Voice', 'menu');

// ===== Narration (Direct <-> Indirect Speech) Quiz (Learn/Calc tab) =====
// DATA FORMAT: NARRATION_SETS.setN = array of 10 questions, each
// { word: quoted sentence or indirect statement to convert (some tagged
//   '(Convert to DIRECT)' / '(Convert to INDIRECT)' when reversed),
//   options: 4 converted choices, answer: 0-based correct index,
//   explanation: [rule line] }. 80 Qs total across 8 sets, in the original
//   curated order (tense backshift -> continuous/perfect -> universal truth ->
//   modals -> questions -> imperatives -> let-us -> exclamatory -> conditional ->
//   reporting-verb nuances -> compound/mixed -> reverse indirect->direct traps).
// [data moved to data/narration_sets.js]


const narrationQuiz = makeReasoningQuiz('narration', NARRATION_SETS, 'Narration', 'menu');

// ===== Homophones / Confusing Words Quiz (Learn/Calc tab) =====
// DATA FORMAT: HOMOPHONE_SETS.setN = array of up to 10 questions, each
// { word: "fill-in-the-blank sentence", options: [4 confusable words],
//   answer: <0-based correct index>, explanation: [Hinglish lines with meaning] }.
// 639 questions (SSC CGL "Confusing Words / Homophones — Fill in the Blanks"
// bank) split into 64 sets of 10 (last set has 9). Same makeReasoningQuiz
// engine reused — Set list, Saved Questions ⭐, stats row, sab kuch same.
// [data moved to data/homophone_sets.js]


const homophoneQuiz = makeReasoningQuiz('homophone', HOMOPHONE_SETS, 'Homophones', 'menu');

// ===== Prepositions Fill-in-the-Blank Quiz (Learn/Calc tab) =====
// DATA FORMAT: same as Homophones/Phrasal Verbs — PREPOSITION_SETS.setN = array
// of up to 10 questions, each { word: "fill-in-the-blank sentence", options: [4
// prepositions], answer: <0-based correct index>, explanation: "Hinglish line" }.
// 619 questions (SSC CGL "Prepositions — Confusing MCQ" bank) split into 62 sets
// of 10 (last set has 9). Same makeReasoningQuiz engine reused.
// [data moved to data/preposition_sets.js]


const prepositionQuiz = makeReasoningQuiz('preposition', PREPOSITION_SETS, 'Prepositions', 'menu');

// ===== Fix: sets were topic-clustered in the source data (ek pure set mein
// zyada tar questions ka answer wahi ek preposition word hota tha, jaise
// "to" 8-10 baar lagatar) — isse bina sentence padhe hi pattern se answer
// pata chal jaata tha. Fix: app load hote hi saare 619 questions ko ek pool
// mein mila ke globally shuffle karte hain, phir wapas usi set-size
// structure (10-10 ka set) mein bhar dete hain. Ab Set 1/2/3... har baar
// app khulne par ek random, mixed-answer combination dikhayenge.
function redistributeSetsAcrossPool(SETS){
  const keys = Object.keys(SETS);
  const sizes = keys.map(k => SETS[k].length);
  const pool = [];
  keys.forEach(k => { SETS[k].forEach(q => pool.push(q)); });
  const shuffled = shuffledCopy(pool);
  let idx = 0;
  keys.forEach((k, i) => {
    SETS[k] = shuffled.slice(idx, idx + sizes[i]);
    idx += sizes[i];
  });
}
redistributeSetsAcrossPool(PREPOSITION_SETS);

// ===== New bilingual reasoning categories (Seating, Order & Ranking,
// Letter Analogy, Letter/Word Position Analysis, Inequality & Word
// Formation) — all built on the shared makeBilingualSetQuiz engine above. =====
const seatingQuiz = makeBilingualSetQuiz('seating', SEATING_SETS, 'Seating Arrangement', '🪑', 'calcSeatingBtn');
const orderrankingQuiz = makeBilingualSetQuiz('orderranking', ORDERRANKING_SETS, 'Order & Ranking', '📶', 'calcOrderRankingBtn');
const letteranalogyQuiz = makeBilingualSetQuiz('letteranalogy', LETTERANALOGY_SETS, 'Letter Analogy', '🔤', 'calcLetterAnalogyBtn');
const letterwordQuiz = makeBilingualSetQuiz('letterword', LETTERWORD_SETS, 'Letter/Word Position', '🧩', 'calcLetterWordBtn');
const logicmixQuiz = makeBilingualSetQuiz('logicmix', LOGICMIX_SETS, 'Inequality & Word Formation', '🔣', 'calcLogicMixBtn');
const bloodrelationsQuiz = makeBilingualSetQuiz('bloodrelations', BLOODREL_SETS, 'Blood Relations', '🧬', 'calcBloodRelationsBtn');
const numberanalogyQuiz = makeBilingualSetQuiz('numberanalogy', NUMANALOGY_SETS, 'Number Analogy', '🔢', 'calcNumberAnalogyBtn');
const alphanumericQuiz = makeBilingualSetQuiz('alphanumeric', ALPHANUM_SETS, 'Alphanumeric Series', '🔡', 'calcAlphanumericBtn');
const syllogismQuiz = makeBilingualSetQuiz('syllogism', SYLLOGISM_SETS, 'Syllogism', '🧷', 'calcSyllogismBtn');
const clockioQuiz = makeBilingualSetQuiz('clockio', CLOCKIO_SETS, 'Clock & Input-Output', '🕐', 'calcClockIOBtn');
const wordanalogyQuiz = makeBilingualSetQuiz('wordanalogy', WORDANALOGY_SETS, 'Word Analogy', '🔠', 'calcWordAnalogyBtn');
const letterseriesdsQuiz = makeBilingualSetQuiz('letterseriesds', LETTERSERIESDS_SETS, 'Letter Series (Digit-Sum)', '🔡', 'calcLetterSeriesDSBtn');
const dictorderQuiz = makeBilingualSetQuiz('dictorder', DICTORDER_SETS, 'Dictionary / Alphabetical Order', '📖', 'calcDictOrderBtn');
const calendarreasoningQuiz = makeBilingualSetQuiz('calendarreasoning', CALENDARREASONING_SETS, 'Calendar Reasoning', '📅', 'calcCalendarReasoningBtn');
const wordformationQuiz = makeBilingualSetQuiz('wordformation', WORDFORMATION_SETS, 'Word Formation', '🧱', 'calcWordFormationBtn');
const seatinghardQuiz = makeBilingualSetQuiz('seatinghard', SEATINGHARD_SETS, 'Seating Arrangement (Hard)', '🎯', 'calcSeatingHardBtn');
const directiondistanceQuiz = makeBilingualSetQuiz('directiondistance', DIRECTIONDISTANCE_SETS, 'Direction & Distance', '🧭', 'calcDirectionDistanceBtn');
const reasoninghardmixQuiz = makeBilingualSetQuiz('reasoninghardmix', REASONINGHARDMIX_SETS, 'Order, Analogy & Puzzle (Hard Mix)', '🧠', 'calcReasoningHardMixBtn');
const statementconclusionQuiz = makeBilingualSetQuiz('statementconclusion', STATEMENTCONCLUSION_SETS, 'Statement, Conclusion & Data Sufficiency', '📜', 'calcStatementConclusionBtn');
const wordarrangeageQuiz = makeBilingualSetQuiz('wordarrangeage', WORDARRANGEAGE_SETS, 'Word Arrangement & Age (Hard)', '🧓', 'calcWordArrangeAgeBtn');

// ===== Reasoning Mock — Testbook-style Exam Interface =====
// 25-Q sectional mocks mixed across all reasoning chapters (mock01..mock48).
// This mirrors Math Mock's exam engine exactly (same CSS classes/markup,
// same 15-min timer, palette, Mark for Review, Submit Test, solution
// review) so the two mocks behave identically. Data format differs from
// Math PYQ: each question is { qn, exam, hi:{prompt:[...],options:[...],
// solution}, en:{...same...}, answer } — prompt is an array of lines and
// options/solution are language-specific (unlike Math PYQ where only the
// question text differs by language). Its "back" goes to the root menu
// (not the chapter list), same as Math Mock.
function makeReasoningMockQuiz(){
  const prefix = 'reasoningmock';
  const SETS = REASONINGMOCK_SETS;

  // ===== Saved Mock Attempts (localStorage) — same pattern as Math Mock,
  // separate storage key so the two mocks' saved attempts never collide. =====
  const MOCK_ATTEMPT_KEY = 'cgl50-mockreasoning-attempts';
  function loadMockAttempts(){
    try{
      const raw = localStorage.getItem(MOCK_ATTEMPT_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveMockAttemptsMap(map){
    try{ localStorage.setItem(MOCK_ATTEMPT_KEY, JSON.stringify(map)); }catch(e){}
  }
  function saveMockAttempt(setKey, snapshot){
    const map = loadMockAttempts();
    map[setKey] = snapshot;
    saveMockAttemptsMap(map);
  }
  function getMockAttempt(setKey){
    const map = loadMockAttempts();
    return map[setKey] || null;
  }

  const session = { setKey: null, lang: 'hi' };

  function setLabel(key, count){
    const num = (key.match(/\d+/) || [key])[0];
    return 'Mock ' + num + ' (' + count + ' Qs)';
  }
  function buildSetPool(setKey){
    const set = SETS[setKey] || [];
    return set.slice();
  }
  function questionLines(q, lang){
    const langObj = (lang === 'en' ? q.en : q.hi) || q.hi || {};
    return langObj.prompt || [];
  }
  function questionOptions(q, lang){
    const langObj = (lang === 'en' ? q.en : q.hi) || q.hi || {};
    return langObj.options || [];
  }
  function questionSolution(q, lang){
    const langObj = (lang === 'en' ? q.en : q.hi) || q.hi || {};
    return langObj.solution || '';
  }
  function renderQuestionHtml(q, lang){
    const lines = questionLines(q, lang);
    const withQn = ['Q' + q.qn + '. ' + (lines[0] || '')].concat(lines.slice(1));
    return withQn.map((ln, i) =>
      '<div class="' + (i === 0 ? 'dsStatementLine' : 'dsItemLine') + '">' + mathify(ln) + '</div>'
    ).join('');
  }
  function renderSolutionHtml(q, lang){
    const sol = questionSolution(q, lang);
    return sol ? '<div class="dsSolBlock" style="margin-top:0;padding-top:0;border-top:none;"><div class="dsSolText">' + mathify(sol) + '</div></div>' : '';
  }

  function renderSetMenu(){
    const grid = document.getElementById(prefix + 'SetGrid');
    if(!grid) return;
    grid.innerHTML = '';
    Object.keys(SETS).forEach(key => {
      const count = SETS[key].length;
      const saved = getMockAttempt(key);
      if(saved){
        const card = document.createElement('div');
        card.className = 'calcCard';
        card.style.cursor = 'pointer';
        card.innerHTML =
          '<span class="calcIcon">🧠</span>' +
          '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(setLabel(key, count)) + '</span>' +
          '<span style="font-size:11px;color:var(--muted);font-weight:600;">✅ Score: ' + examFormatMarksReasoning(saved.marks) + ' · Tap to review</span></span>' +
          '<button type="button" class="mockCardReattemptBtn" style="flex:0 0 auto;background:transparent;border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:11px;color:var(--muted);">🔁</button>';
        card.addEventListener('click', (e) => {
          if(e.target.closest('.mockCardReattemptBtn')) return;
          viewSavedMockAttempt(key);
        });
        const reBtn = card.querySelector('.mockCardReattemptBtn');
        if(reBtn) reBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openLangChoice(key);
        });
        grid.appendChild(card);
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'calcCard';
      btn.innerHTML =
        '<span class="calcIcon">🧠</span>' +
        '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(setLabel(key, count)) + '</span></span>' +
        (isQuizSetAttempted(prefix, key) ? '<span class="calcDoneBadge">✅</span>' : '') +
        '<span class="calcArrow">&#8250;</span>';
      btn.addEventListener('click', () => openLangChoice(key));
      grid.appendChild(btn);
    });
  }
  function openLangChoice(setKey){
    session.setKey = setKey;
    const count = (SETS[setKey] || []).length;
    const titleEl = document.getElementById('reasoningmockLangTitle');
    if(titleEl) titleEl.textContent = 'Reasoning Mock — ' + setLabel(setKey, count);
    showCalcPage('reasoningmocklang');
  }

  // ===== Testbook-style Exam Mode: 15-min timer, question palette, Mark
  // for Review, Submit Test, then a solution+marks review screen. =====
  const EXAM_DURATION_SEC = 15 * 60;
  const EXAM_MARKS_CORRECT = 2;
  const EXAM_MARKS_WRONG = -0.5;
  const examSession = {
    setKey: null, lang: 'hi', questions: [],
    answers: [], marked: [], visited: [],
    current: 0, timeLeft: EXAM_DURATION_SEC, timerId: null, submitted: false, paused: false
  };

  function examFormatMarksReasoning(m){
    return (Math.round(m * 100) / 100).toString();
  }

  function startExamQuiz(lang){
    if(lang) session.lang = lang;
    if(!session.setKey || !SETS[session.setKey]) return;
    examSession.setKey = session.setKey;
    examSession.lang = session.lang;
    examSession.questions = buildSetPool(session.setKey);
    const n = examSession.questions.length;
    examSession.answers = new Array(n).fill(null);
    examSession.marked = new Array(n).fill(false);
    examSession.visited = new Array(n).fill(false);
    examSession.current = 0;
    examSession.timeLeft = EXAM_DURATION_SEC;
    examSession.submitted = false;
    examSession.paused = false;
    const titleEl = document.getElementById('reasoningmockExamTitle');
    if(titleEl) titleEl.textContent = setLabel(session.setKey, n);
    examStopTimer();
    examStartTimer();
    examSetPausedUI(false);
    examRenderQuestion();
    showCalcPage('reasoningmockexam');
  }

  function examFormatTime(sec){
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return (m < 10 ? '0' + m : m) + ':' + (r < 10 ? '0' + r : r);
  }
  function examUpdateTimerDisplay(){
    const el = document.getElementById('reasoningmockExamTimerPill');
    if(!el) return;
    el.textContent = '⏱ ' + examFormatTime(examSession.timeLeft);
    el.classList.toggle('examTimerLow', examSession.timeLeft <= 120);
  }
  function examStartTimer(){
    examUpdateTimerDisplay();
    examSession.timerId = setInterval(() => {
      examSession.timeLeft--;
      examUpdateTimerDisplay();
      if(examSession.timeLeft <= 0){
        examStopTimer();
        examSubmit();
      }
    }, 1000);
  }
  function examStopTimer(){
    if(examSession.timerId){ clearInterval(examSession.timerId); examSession.timerId = null; }
  }

  function examSetPausedUI(paused){
    const btn = document.getElementById('reasoningmockExamPauseBtn');
    if(btn){
      btn.textContent = paused ? '▶' : '⏸';
      btn.title = paused ? 'Resume Test' : 'Pause Test';
      btn.classList.toggle('paused', paused);
    }
    const overlay = document.getElementById('reasoningmockExamPauseOverlay');
    if(overlay) overlay.style.display = paused ? 'flex' : 'none';
    ['reasoningmockExamMarkBtn','reasoningmockExamClearBtn','reasoningmockExamSaveNextBtn','reasoningmockExamSaveNextBtnBottom','reasoningmockExamSubmitBtn'].forEach(id => {
      const b = document.getElementById(id);
      if(b) b.disabled = paused;
    });
  }
  function examTogglePause(){
    if(examSession.submitted) return;
    examSession.paused = !examSession.paused;
    if(examSession.paused) examStopTimer();
    else examStartTimer();
    examSetPausedUI(examSession.paused);
  }

  function examPaletteState(i){
    const answered = examSession.answers[i] !== null && examSession.answers[i] !== undefined;
    const marked = examSession.marked[i];
    if(marked && answered) return 'pAnsweredMarked';
    if(marked) return 'pMarked';
    if(answered) return 'pAnswered';
    if(examSession.visited[i]) return 'pNotAnswered';
    return '';
  }
  function examRenderPalette(){
    const grid = document.getElementById('reasoningmockExamPaletteGrid');
    if(!grid) return;
    grid.innerHTML = '';
    examSession.questions.forEach((q, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'examPaletteBtn ' + examPaletteState(i) + (i === examSession.current ? ' pCurrent' : '');
      btn.textContent = i + 1;
      btn.addEventListener('click', () => examGoTo(i));
      grid.appendChild(btn);
    });
  }

  function examRenderQuestion(){
    const q = examSession.questions[examSession.current];
    if(!q) return;
    examSession.visited[examSession.current] = true;
    const qnoEl = document.getElementById('reasoningmockExamQNo');
    if(qnoEl) qnoEl.textContent = 'Question No. ' + (examSession.current + 1);
    const badgeEl = document.getElementById('reasoningmockExamExamBadge');
    if(badgeEl) badgeEl.textContent = '📋 ' + (q.exam || '—');
    const wordEl = document.getElementById('reasoningmockExamWordText');
    if(wordEl) wordEl.innerHTML = renderQuestionHtml(q, examSession.lang);
    const optList = document.getElementById('reasoningmockExamOptList');
    if(optList){
      optList.innerHTML = '';
      const selected = examSession.answers[examSession.current];
      questionOptions(q, examSession.lang).forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'examOptBtn' + (selected === i ? ' selected' : '');
        btn.innerHTML = '<span class="examOptMark">' + String.fromCharCode(65 + i) + '</span><span>' + mathify(opt) + '</span>';
        btn.addEventListener('click', () => examSelectOption(i));
        optList.appendChild(btn);
      });
    }
    const markBtn = document.getElementById('reasoningmockExamMarkBtn');
    if(markBtn) markBtn.textContent = examSession.marked[examSession.current] ? '🚩 Marked ✓' : '🚩 Mark for Review';
    examRenderPalette();
  }

  function examSelectOption(i){
    examSession.answers[examSession.current] = i;
    examRenderQuestion();
  }
  function examGoTo(idx){
    if(idx < 0 || idx >= examSession.questions.length) return;
    examSession.current = idx;
    examRenderQuestion();
  }
  function examSaveNext(){
    if(examSession.current < examSession.questions.length - 1) examGoTo(examSession.current + 1);
    else examRenderPalette();
  }
  function examMarkForReview(){
    examSession.marked[examSession.current] = !examSession.marked[examSession.current];
    if(examSession.current < examSession.questions.length - 1) examGoTo(examSession.current + 1);
    else examRenderQuestion();
  }
  function examClearResponse(){
    examSession.answers[examSession.current] = null;
    examRenderQuestion();
  }

  function examConfirmSubmit(){
    const total = examSession.questions.length;
    const answered = examSession.answers.filter(a => a !== null && a !== undefined).length;
    const notAnswered = total - answered;
    const ok = confirm('Answered: ' + answered + '\nNot Answered: ' + notAnswered + '\n\nSubmit test now? Ye action wapas nahi ho sakta.');
    if(ok){ examStopTimer(); examSubmit(); }
  }

  function examSubmit(){
    if(examSession.submitted) return;
    examSession.submitted = true;
    examStopTimer();
    let correct = 0, wrong = 0;
    examSession.questions.forEach((q, i) => {
      const a = examSession.answers[i];
      if(a === null || a === undefined) return;
      if(a === q.answer) correct++; else wrong++;
    });
    const skipped = examSession.questions.length - correct - wrong;
    const marks = (correct * EXAM_MARKS_CORRECT) + (wrong * EXAM_MARKS_WRONG);
    const attempted = correct + wrong;
    const acc = attempted ? Math.round((correct / attempted) * 100) : 0;
    const titleEl = document.getElementById('reasoningmockResultTitle');
    if(titleEl) titleEl.textContent = setLabel(examSession.setKey, examSession.questions.length);
    const summaryEl = document.getElementById('reasoningmockExamResultSummary');
    if(summaryEl){
      summaryEl.innerHTML =
        '<div class="examSumCard"><div class="n" style="color:var(--blue);">' + examFormatMarksReasoning(marks) + '</div><div class="l">Total Marks</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--gain);">' + correct + '</div><div class="l">Correct</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--loss);">' + wrong + '</div><div class="l">Wrong</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--muted);">' + skipped + '</div><div class="l">Skipped</div></div>' +
        '<div class="examSumCard"><div class="n">' + acc + '%</div><div class="l">Accuracy</div></div>' +
        '<div class="examSumCard"><div class="n">' + examSession.questions.length + '</div><div class="l">Total Qs</div></div>';
    }
    logQuizActivity(setLabel(examSession.setKey, examSession.questions.length), correct, attempted);
    logReasoningMockToSectional(setLabel(examSession.setKey, examSession.questions.length), marks, correct, wrong, skipped);
    markQuizSetAttempted(prefix, examSession.setKey);
    saveMockAttempt(examSession.setKey, {
      setKey: examSession.setKey,
      lang: examSession.lang,
      questions: examSession.questions,
      answers: examSession.answers,
      marked: examSession.marked,
      visited: examSession.visited,
      correct: correct, wrong: wrong, skipped: skipped,
      marks: marks, attempted: attempted, acc: acc,
      submittedAt: Date.now()
    });
    resultRenderPalette();
    resultGoTo(0);
    showCalcPage('reasoningmockresult');
  }

  function viewSavedMockAttempt(setKey){
    const saved = getMockAttempt(setKey);
    if(!saved) return;
    examSession.setKey = saved.setKey;
    examSession.lang = saved.lang;
    examSession.questions = saved.questions;
    examSession.answers = saved.answers;
    examSession.marked = saved.marked || [];
    examSession.visited = saved.visited || [];
    examSession.current = 0;
    examSession.submitted = true;
    examStopTimer();
    const titleEl = document.getElementById('reasoningmockResultTitle');
    if(titleEl) titleEl.textContent = setLabel(saved.setKey, saved.questions.length);
    const summaryEl = document.getElementById('reasoningmockExamResultSummary');
    if(summaryEl){
      summaryEl.innerHTML =
        '<div class="examSumCard"><div class="n" style="color:var(--blue);">' + examFormatMarksReasoning(saved.marks) + '</div><div class="l">Total Marks</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--gain);">' + saved.correct + '</div><div class="l">Correct</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--loss);">' + saved.wrong + '</div><div class="l">Wrong</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--muted);">' + saved.skipped + '</div><div class="l">Skipped</div></div>' +
        '<div class="examSumCard"><div class="n">' + saved.acc + '%</div><div class="l">Accuracy</div></div>' +
        '<div class="examSumCard"><div class="n">' + saved.questions.length + '</div><div class="l">Total Qs</div></div>';
    }
    resultRenderPalette();
    resultGoTo(0);
    showCalcPage('reasoningmockresult');
  }

  function resultQState(i){
    const a = examSession.answers[i];
    const q = examSession.questions[i];
    if(a === null || a === undefined) return 'skipped';
    return a === q.answer ? 'correct' : 'wrong';
  }
  function resultRenderPalette(){
    const grid = document.getElementById('reasoningmockResultPaletteGrid');
    if(!grid) return;
    grid.innerHTML = '';
    examSession.questions.forEach((q, i) => {
      const st = resultQState(i);
      const cls = st === 'correct' ? 'pAnswered' : st === 'wrong' ? 'pNotAnswered' : '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'examPaletteBtn ' + cls + (i === examSession.current ? ' pCurrent' : '');
      btn.textContent = i + 1;
      btn.addEventListener('click', () => resultGoTo(i));
      grid.appendChild(btn);
    });
  }
  let resultRevealed = false;
  function resultGoTo(idx){
    if(idx < 0 || idx >= examSession.questions.length) return;
    examSession.current = idx;
    resultRevealed = false;
    resultRenderQuestion();
    resultRenderPalette();
  }
  function resultReveal(){
    if(resultRevealed) return;
    resultRevealed = true;
    resultRenderQuestion();
  }
  function resultRenderQuestion(){
    const i = examSession.current;
    const q = examSession.questions[i];
    if(!q) return;
    const qnoEl = document.getElementById('reasoningmockResultQNo');
    if(qnoEl) qnoEl.textContent = 'Question No. ' + (i + 1);
    const st = resultQState(i);
    const tagWrap = document.getElementById('reasoningmockResultTagWrap');
    if(tagWrap){
      if(resultRevealed){
        const label = st === 'correct' ? '✅ Correct' : st === 'wrong' ? '❌ Incorrect' : '⏭ Skipped';
        const cls = st === 'correct' ? 'tagCorrect' : st === 'wrong' ? 'tagWrong' : 'tagSkipped';
        tagWrap.innerHTML = '<span class="examReviewTag ' + cls + '">' + label + '</span>';
      } else {
        tagWrap.innerHTML = '<span class="examReviewTag" style="background:#3a3742;color:var(--muted);">👆 Tap question to view answer & solution</span>';
      }
    }
    const badgeEl = document.getElementById('reasoningmockResultExamBadge');
    if(badgeEl) badgeEl.textContent = '📋 ' + (q.exam || '—');
    const wordEl = document.getElementById('reasoningmockResultWordText');
    if(wordEl) wordEl.innerHTML = renderQuestionHtml(q, examSession.lang);
    const optList = document.getElementById('reasoningmockResultOptList');
    if(optList){
      optList.innerHTML = '';
      const userAns = examSession.answers[i];
      questionOptions(q, examSession.lang).forEach((opt, idx) => {
        const div = document.createElement('div');
        let cls = 'examReviewOptBtn';
        let tag = '';
        if(resultRevealed){
          if(idx === q.answer) cls += ' reviewCorrect';
          else if(idx === userAns) cls += ' reviewWrong';
          tag = idx === q.answer ? ' ✅' : (idx === userAns ? ' ❌' : '');
        }
        div.className = cls;
        div.innerHTML = '<span class="examOptMark">' + String.fromCharCode(65 + idx) + '</span><span>' + mathify(opt) + tag + '</span>';
        optList.appendChild(div);
      });
    }
    const solCard = document.getElementById('reasoningmockResultSolutionCard');
    const solText = document.getElementById('reasoningmockResultSolutionText');
    if(resultRevealed){
      if(solText) solText.innerHTML = renderSolutionHtml(q, examSession.lang);
      if(solCard) solCard.style.display = 'block';
    } else {
      if(solText) solText.innerHTML = '';
      if(solCard) solCard.style.display = 'none';
    }
    const prevBtn = document.getElementById('reasoningmockResultPrevBtn');
    if(prevBtn) prevBtn.disabled = (i === 0);
    const nextBtn = document.getElementById('reasoningmockResultNextBtn');
    if(nextBtn) nextBtn.textContent = (i === examSession.questions.length - 1) ? 'Done ✓' : 'Next ➜';
  }

  function init(){
    renderSetMenu();
    const mainBtn = document.getElementById('calcReasoningMockBtn');
    if(mainBtn) mainBtn.addEventListener('click', () => { renderSetMenu(); showCalcPage('reasoningmockmenu'); });
    const menuBackBtn = document.getElementById('reasoningmockMenuBackBtn');
    if(menuBackBtn) menuBackBtn.addEventListener('click', () => showCalcPage('menu'));
    const langBackBtn = document.getElementById('reasoningmockLangBackBtn');
    if(langBackBtn) langBackBtn.addEventListener('click', () => showCalcPage('reasoningmockmenu'));
    const langHindiBtn = document.getElementById('reasoningmockLangHindiBtn');
    if(langHindiBtn) langHindiBtn.addEventListener('click', () => startExamQuiz('hi'));
    const langEnglishBtn = document.getElementById('reasoningmockLangEnglishBtn');
    if(langEnglishBtn) langEnglishBtn.addEventListener('click', () => startExamQuiz('en'));

    const examBackBtn = document.getElementById('reasoningmockExamBackBtn');
    if(examBackBtn) examBackBtn.addEventListener('click', () => {
      if(confirm('Exit test? Aapki progress save nahi hogi.')){ examStopTimer(); showCalcPage('reasoningmockmenu'); }
    });
    const examSubmitBtn = document.getElementById('reasoningmockExamSubmitBtn');
    if(examSubmitBtn) examSubmitBtn.addEventListener('click', examConfirmSubmit);
    const examMarkBtn = document.getElementById('reasoningmockExamMarkBtn');
    if(examMarkBtn) examMarkBtn.addEventListener('click', examMarkForReview);
    const examClearBtn = document.getElementById('reasoningmockExamClearBtn');
    if(examClearBtn) examClearBtn.addEventListener('click', examClearResponse);
    const examSaveNextBtn = document.getElementById('reasoningmockExamSaveNextBtn');
    if(examSaveNextBtn) examSaveNextBtn.addEventListener('click', examSaveNext);
    const examSaveNextBtnBottom = document.getElementById('reasoningmockExamSaveNextBtnBottom');
    if(examSaveNextBtnBottom) examSaveNextBtnBottom.addEventListener('click', examSaveNext);
    const examPauseBtn = document.getElementById('reasoningmockExamPauseBtn');
    if(examPauseBtn) examPauseBtn.addEventListener('click', examTogglePause);
    const examResumeBtn = document.getElementById('reasoningmockExamResumeBtn');
    if(examResumeBtn) examResumeBtn.addEventListener('click', examTogglePause);

    const resultBackBtn = document.getElementById('reasoningmockResultBackBtn');
    if(resultBackBtn) resultBackBtn.addEventListener('click', () => showCalcPage('reasoningmockmenu'));
    const resultReattemptBtn = document.getElementById('reasoningmockResultReattemptBtn');
    if(resultReattemptBtn) resultReattemptBtn.addEventListener('click', () => {
      if(confirm('Is mock ko dobara attempt karna hai? Naya attempt submit karne par purana result overwrite ho jaayega.')){
        session.setKey = examSession.setKey;
        startExamQuiz(examSession.lang);
      }
    });
    const resultPrevBtn = document.getElementById('reasoningmockResultPrevBtn');
    if(resultPrevBtn) resultPrevBtn.addEventListener('click', () => resultGoTo(examSession.current - 1));
    const resultNextBtn = document.getElementById('reasoningmockResultNextBtn');
    if(resultNextBtn) resultNextBtn.addEventListener('click', () => {
      if(examSession.current < examSession.questions.length - 1) resultGoTo(examSession.current + 1);
      else showCalcPage('reasoningmockmenu');
    });
    const resultQuestionWrap = document.getElementById('reasoningmockResultQuestionWrap');
    if(resultQuestionWrap) resultQuestionWrap.addEventListener('click', resultReveal);
    const resultOptList = document.getElementById('reasoningmockResultOptList');
    if(resultOptList) resultOptList.addEventListener('click', resultReveal);
    const resultTagWrap = document.getElementById('reasoningmockResultTagWrap');
    if(resultTagWrap) resultTagWrap.addEventListener('click', resultReveal);
  }

  return { init };
}
const reasoningmockQuiz = makeReasoningMockQuiz();


// ===== English Mock — Testbook-style Exam Interface (mirrors Math/Reasoning
// Mock, but data is single-language: each question is { qn, topic, word,
// options, answer, explanation } — same shape as the topic-wise practice
// quizzes (makeReasoningQuiz), so no Hindi/English language-choice step is
// needed here; tapping a mock card starts the exam directly. 68 mocks of
// 25 Qs each, built by mixing ALL topic-wise English questions together
// (Synonyms, Antonyms, Idioms, Fill in the Blanks, Spelling, Error
// Spotting, Sentence Improvement, Voice, Narration, Para Jumbles, etc.). =====
function makeEnglishMockQuiz(){
  const prefix = 'englishmock';
  const SETS = ENGLISHMOCK_SETS;

  const MOCK_ATTEMPT_KEY = 'cgl50-mockenglish-attempts';
  function loadMockAttempts(){
    try{
      const raw = localStorage.getItem(MOCK_ATTEMPT_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveMockAttemptsMap(map){
    try{ localStorage.setItem(MOCK_ATTEMPT_KEY, JSON.stringify(map)); }catch(e){}
  }
  function saveMockAttempt(setKey, snapshot){
    const map = loadMockAttempts();
    map[setKey] = snapshot;
    saveMockAttemptsMap(map);
  }
  function getMockAttempt(setKey){
    const map = loadMockAttempts();
    return map[setKey] || null;
  }

  const session = { setKey: null };

  function setLabel(key, count){
    const num = (key.match(/\d+/) || [key])[0];
    return 'Mock ' + num + ' (' + count + ' Qs)';
  }
  function buildSetPool(setKey){
    const set = SETS[setKey] || [];
    return set.slice();
  }

  function renderSetMenu(){
    const grid = document.getElementById(prefix + 'SetGrid');
    if(!grid) return;
    grid.innerHTML = '';
    Object.keys(SETS).forEach(key => {
      const count = SETS[key].length;
      const saved = getMockAttempt(key);
      if(saved){
        const card = document.createElement('div');
        card.className = 'calcCard';
        card.style.cursor = 'pointer';
        card.innerHTML =
          '<span class="calcIcon">\ud83d\udcd8</span>' +
          '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(setLabel(key, count)) + '</span>' +
          '<span style="font-size:11px;color:var(--muted);font-weight:600;">\u2705 Score: ' + examFormatMarksEnglish(saved.marks) + ' \u00b7 Tap to review</span></span>' +
          '<button type="button" class="mockCardReattemptBtn" style="flex:0 0 auto;background:transparent;border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:11px;color:var(--muted);">\ud83d\udd01</button>';
        card.addEventListener('click', (e) => {
          if(e.target.closest('.mockCardReattemptBtn')) return;
          viewSavedMockAttempt(key);
        });
        const reBtn = card.querySelector('.mockCardReattemptBtn');
        if(reBtn) reBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          startExamQuiz(key);
        });
        grid.appendChild(card);
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'calcCard';
      btn.innerHTML =
        '<span class="calcIcon">\ud83d\udcd8</span>' +
        '<span class="calcLabelCol"><span class="calcLabel">' + escapeHtml(setLabel(key, count)) + '</span></span>' +
        (isQuizSetAttempted(prefix, key) ? '<span class="calcDoneBadge">\u2705</span>' : '') +
        '<span class="calcArrow">&#8250;</span>';
      btn.addEventListener('click', () => startExamQuiz(key));
      grid.appendChild(btn);
    });
  }

  // ===== Testbook-style Exam Mode: 15-min timer, question palette, Mark
  // for Review, Submit Test, then a solution+marks review screen. =====
  const EXAM_DURATION_SEC = 15 * 60;
  const EXAM_MARKS_CORRECT = 2;
  const EXAM_MARKS_WRONG = -0.5;
  const examSession = {
    setKey: null, questions: [],
    answers: [], marked: [], visited: [],
    current: 0, timeLeft: EXAM_DURATION_SEC, timerId: null, submitted: false, paused: false
  };

  function examFormatMarksEnglish(m){
    return (Math.round(m * 100) / 100).toString();
  }

  function startExamQuiz(setKey){
    if(setKey) session.setKey = setKey;
    if(!session.setKey || !SETS[session.setKey]) return;
    examSession.setKey = session.setKey;
    examSession.questions = buildSetPool(session.setKey);
    const n = examSession.questions.length;
    examSession.answers = new Array(n).fill(null);
    examSession.marked = new Array(n).fill(false);
    examSession.visited = new Array(n).fill(false);
    examSession.current = 0;
    examSession.timeLeft = EXAM_DURATION_SEC;
    examSession.submitted = false;
    examSession.paused = false;
    const titleEl = document.getElementById('englishmockExamTitle');
    if(titleEl) titleEl.textContent = setLabel(session.setKey, n);
    examStopTimer();
    examStartTimer();
    examSetPausedUI(false);
    examRenderQuestion();
    showCalcPage('englishmockexam');
  }

  function examFormatTime(sec){
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return (m < 10 ? '0' + m : m) + ':' + (r < 10 ? '0' + r : r);
  }
  function examUpdateTimerDisplay(){
    const el = document.getElementById('englishmockExamTimerPill');
    if(!el) return;
    el.textContent = '\u23f1 ' + examFormatTime(examSession.timeLeft);
    el.classList.toggle('examTimerLow', examSession.timeLeft <= 120);
  }
  function examStartTimer(){
    examUpdateTimerDisplay();
    examSession.timerId = setInterval(() => {
      examSession.timeLeft--;
      examUpdateTimerDisplay();
      if(examSession.timeLeft <= 0){
        examStopTimer();
        examSubmit();
      }
    }, 1000);
  }
  function examStopTimer(){
    if(examSession.timerId){ clearInterval(examSession.timerId); examSession.timerId = null; }
  }

  function examSetPausedUI(paused){
    const btn = document.getElementById('englishmockExamPauseBtn');
    if(btn){
      btn.textContent = paused ? '\u25b6' : '\u23f8';
      btn.title = paused ? 'Resume Test' : 'Pause Test';
      btn.classList.toggle('paused', paused);
    }
    const overlay = document.getElementById('englishmockExamPauseOverlay');
    if(overlay) overlay.style.display = paused ? 'flex' : 'none';
    ['englishmockExamMarkBtn','englishmockExamClearBtn','englishmockExamSaveNextBtn','englishmockExamSaveNextBtnBottom','englishmockExamSubmitBtn'].forEach(id => {
      const b = document.getElementById(id);
      if(b) b.disabled = paused;
    });
  }
  function examTogglePause(){
    if(examSession.submitted) return;
    examSession.paused = !examSession.paused;
    if(examSession.paused) examStopTimer();
    else examStartTimer();
    examSetPausedUI(examSession.paused);
  }

  function examPaletteState(i){
    const answered = examSession.answers[i] !== null && examSession.answers[i] !== undefined;
    const marked = examSession.marked[i];
    if(marked && answered) return 'pAnsweredMarked';
    if(marked) return 'pMarked';
    if(answered) return 'pAnswered';
    if(examSession.visited[i]) return 'pNotAnswered';
    return '';
  }
  function examRenderPalette(){
    const grid = document.getElementById('englishmockExamPaletteGrid');
    if(!grid) return;
    grid.innerHTML = '';
    examSession.questions.forEach((q, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'examPaletteBtn ' + examPaletteState(i) + (i === examSession.current ? ' pCurrent' : '');
      btn.textContent = i + 1;
      btn.addEventListener('click', () => examGoTo(i));
      grid.appendChild(btn);
    });
  }

  function examRenderQuestion(){
    const q = examSession.questions[examSession.current];
    if(!q) return;
    examSession.visited[examSession.current] = true;
    const qnoEl = document.getElementById('englishmockExamQNo');
    if(qnoEl) qnoEl.textContent = 'Question No. ' + (examSession.current + 1);
    const badgeEl = document.getElementById('englishmockExamExamBadge');
    if(badgeEl) badgeEl.textContent = '\ud83d\udcd8 ' + (q.topic || '\u2014');
    const wordEl = document.getElementById('englishmockExamWordText');
    if(wordEl) wordEl.innerHTML = mathify('Q' + q.qn + '. ' + (q.word || '\u2014'));
    const optList = document.getElementById('englishmockExamOptList');
    if(optList){
      optList.innerHTML = '';
      const selected = examSession.answers[examSession.current];
      (q.options || []).forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'examOptBtn' + (selected === i ? ' selected' : '');
        btn.innerHTML = '<span class="examOptMark">' + String.fromCharCode(65 + i) + '</span><span>' + mathify(opt) + '</span>';
        btn.addEventListener('click', () => examSelectOption(i));
        optList.appendChild(btn);
      });
    }
    const markBtn = document.getElementById('englishmockExamMarkBtn');
    if(markBtn) markBtn.textContent = examSession.marked[examSession.current] ? '\ud83d\udea9 Marked \u2713' : '\ud83d\udea9 Mark for Review';
    examRenderPalette();
  }

  function examSelectOption(i){
    examSession.answers[examSession.current] = i;
    examRenderQuestion();
  }
  function examGoTo(idx){
    if(idx < 0 || idx >= examSession.questions.length) return;
    examSession.current = idx;
    examRenderQuestion();
  }
  function examSaveNext(){
    if(examSession.current < examSession.questions.length - 1) examGoTo(examSession.current + 1);
    else examRenderPalette();
  }
  function examMarkForReview(){
    examSession.marked[examSession.current] = !examSession.marked[examSession.current];
    if(examSession.current < examSession.questions.length - 1) examGoTo(examSession.current + 1);
    else examRenderQuestion();
  }
  function examClearResponse(){
    examSession.answers[examSession.current] = null;
    examRenderQuestion();
  }

  function examConfirmSubmit(){
    const total = examSession.questions.length;
    const answered = examSession.answers.filter(a => a !== null && a !== undefined).length;
    const notAnswered = total - answered;
    const ok = confirm('Answered: ' + answered + '\nNot Answered: ' + notAnswered + '\n\nSubmit test now? Ye action wapas nahi ho sakta.');
    if(ok){ examStopTimer(); examSubmit(); }
  }

  function examSubmit(){
    if(examSession.submitted) return;
    examSession.submitted = true;
    examStopTimer();
    let correct = 0, wrong = 0;
    examSession.questions.forEach((q, i) => {
      const a = examSession.answers[i];
      if(a === null || a === undefined) return;
      if(a === q.answer) correct++; else wrong++;
    });
    const skipped = examSession.questions.length - correct - wrong;
    const marks = (correct * EXAM_MARKS_CORRECT) + (wrong * EXAM_MARKS_WRONG);
    const attempted = correct + wrong;
    const acc = attempted ? Math.round((correct / attempted) * 100) : 0;
    const titleEl = document.getElementById('englishmockResultTitle');
    if(titleEl) titleEl.textContent = setLabel(examSession.setKey, examSession.questions.length);
    const summaryEl = document.getElementById('englishmockExamResultSummary');
    if(summaryEl){
      summaryEl.innerHTML =
        '<div class="examSumCard"><div class="n" style="color:var(--blue);">' + examFormatMarksEnglish(marks) + '</div><div class="l">Total Marks</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--gain);">' + correct + '</div><div class="l">Correct</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--loss);">' + wrong + '</div><div class="l">Wrong</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--muted);">' + skipped + '</div><div class="l">Skipped</div></div>' +
        '<div class="examSumCard"><div class="n">' + acc + '%</div><div class="l">Accuracy</div></div>' +
        '<div class="examSumCard"><div class="n">' + examSession.questions.length + '</div><div class="l">Total Qs</div></div>';
    }
    saveMockAttempt(examSession.setKey, {
      setKey: examSession.setKey,
      questions: examSession.questions,
      answers: examSession.answers,
      marked: examSession.marked,
      visited: examSession.visited,
      correct: correct, wrong: wrong, skipped: skipped,
      marks: marks, attempted: attempted, acc: acc,
      submittedAt: Date.now()
    });
    markQuizSetAttempted(prefix, examSession.setKey);
    resultRenderPalette();
    resultGoTo(0);
    showCalcPage('englishmockresult');
  }

  function viewSavedMockAttempt(setKey){
    const saved = getMockAttempt(setKey);
    if(!saved) return;
    examSession.setKey = saved.setKey;
    examSession.questions = saved.questions;
    examSession.answers = saved.answers;
    examSession.marked = saved.marked || [];
    examSession.visited = saved.visited || [];
    examSession.current = 0;
    examSession.submitted = true;
    examStopTimer();
    const titleEl = document.getElementById('englishmockResultTitle');
    if(titleEl) titleEl.textContent = setLabel(saved.setKey, saved.questions.length);
    const summaryEl = document.getElementById('englishmockExamResultSummary');
    if(summaryEl){
      summaryEl.innerHTML =
        '<div class="examSumCard"><div class="n" style="color:var(--blue);">' + examFormatMarksEnglish(saved.marks) + '</div><div class="l">Total Marks</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--gain);">' + saved.correct + '</div><div class="l">Correct</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--loss);">' + saved.wrong + '</div><div class="l">Wrong</div></div>' +
        '<div class="examSumCard"><div class="n" style="color:var(--muted);">' + saved.skipped + '</div><div class="l">Skipped</div></div>' +
        '<div class="examSumCard"><div class="n">' + saved.acc + '%</div><div class="l">Accuracy</div></div>' +
        '<div class="examSumCard"><div class="n">' + saved.questions.length + '</div><div class="l">Total Qs</div></div>';
    }
    resultRenderPalette();
    resultGoTo(0);
    showCalcPage('englishmockresult');
  }

  function resultQState(i){
    const a = examSession.answers[i];
    const q = examSession.questions[i];
    if(a === null || a === undefined) return 'skipped';
    return a === q.answer ? 'correct' : 'wrong';
  }
  function resultRenderPalette(){
    const grid = document.getElementById('englishmockResultPaletteGrid');
    if(!grid) return;
    grid.innerHTML = '';
    examSession.questions.forEach((q, i) => {
      const st = resultQState(i);
      const cls = st === 'correct' ? 'pAnswered' : st === 'wrong' ? 'pNotAnswered' : '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'examPaletteBtn ' + cls + (i === examSession.current ? ' pCurrent' : '');
      btn.textContent = i + 1;
      btn.addEventListener('click', () => resultGoTo(i));
      grid.appendChild(btn);
    });
  }
  let resultRevealed = false;
  function resultGoTo(idx){
    if(idx < 0 || idx >= examSession.questions.length) return;
    examSession.current = idx;
    resultRevealed = false;
    resultRenderQuestion();
    resultRenderPalette();
  }
  function resultReveal(){
    if(resultRevealed) return;
    resultRevealed = true;
    resultRenderQuestion();
  }
  function resultRenderQuestion(){
    const i = examSession.current;
    const q = examSession.questions[i];
    if(!q) return;
    const qnoEl = document.getElementById('englishmockResultQNo');
    if(qnoEl) qnoEl.textContent = 'Question No. ' + (i + 1);
    const st = resultQState(i);
    const tagWrap = document.getElementById('englishmockResultTagWrap');
    if(tagWrap){
      if(resultRevealed){
        const label = st === 'correct' ? '\u2705 Correct' : st === 'wrong' ? '\u274c Incorrect' : '\u23ed Skipped';
        const cls = st === 'correct' ? 'tagCorrect' : st === 'wrong' ? 'tagWrong' : 'tagSkipped';
        tagWrap.innerHTML = '<span class="examReviewTag ' + cls + '">' + label + '</span>';
      } else {
        tagWrap.innerHTML = '<span class="examReviewTag" style="background:#3a3742;color:var(--muted);">\ud83d\udc46 Tap question to view answer & solution</span>';
      }
    }
    const badgeEl = document.getElementById('englishmockResultExamBadge');
    if(badgeEl) badgeEl.textContent = '\ud83d\udcd8 ' + (q.topic || '\u2014');
    const wordEl = document.getElementById('englishmockResultWordText');
    if(wordEl) wordEl.innerHTML = mathify('Q' + q.qn + '. ' + (q.word || '\u2014'));
    const optList = document.getElementById('englishmockResultOptList');
    if(optList){
      optList.innerHTML = '';
      const userAns = examSession.answers[i];
      (q.options || []).forEach((opt, idx) => {
        const div = document.createElement('div');
        let cls = 'examReviewOptBtn';
        let tag = '';
        if(resultRevealed){
          if(idx === q.answer) cls += ' reviewCorrect';
          else if(idx === userAns) cls += ' reviewWrong';
          tag = idx === q.answer ? ' \u2705' : (idx === userAns ? ' \u274c' : '');
        }
        div.className = cls;
        div.innerHTML = '<span class="examOptMark">' + String.fromCharCode(65 + idx) + '</span><span>' + mathify(opt) + tag + '</span>';
        optList.appendChild(div);
      });
    }
    const solCard = document.getElementById('englishmockResultSolutionCard');
    const solText = document.getElementById('englishmockResultSolutionText');
    if(resultRevealed){
      if(solText) solText.innerHTML = q.explanation ? mathify(q.explanation) : '';
      if(solCard) solCard.style.display = 'block';
    } else {
      if(solText) solText.innerHTML = '';
      if(solCard) solCard.style.display = 'none';
    }
    const prevBtn = document.getElementById('englishmockResultPrevBtn');
    if(prevBtn) prevBtn.disabled = (i === 0);
    const nextBtn = document.getElementById('englishmockResultNextBtn');
    if(nextBtn) nextBtn.textContent = (i === examSession.questions.length - 1) ? 'Done \u2713' : 'Next \u279c';
  }

  function init(){
    renderSetMenu();
    const mainBtn = document.getElementById('calcEnglishMockBtn');
    if(mainBtn) mainBtn.addEventListener('click', () => { renderSetMenu(); showCalcPage('englishmockmenu'); });
    const menuBackBtn = document.getElementById('englishmockMenuBackBtn');
    if(menuBackBtn) menuBackBtn.addEventListener('click', () => showCalcPage('menu'));

    const examBackBtn = document.getElementById('englishmockExamBackBtn');
    if(examBackBtn) examBackBtn.addEventListener('click', () => {
      if(confirm('Exit test? Aapki progress save nahi hogi.')){ examStopTimer(); showCalcPage('englishmockmenu'); }
    });
    const examSubmitBtn = document.getElementById('englishmockExamSubmitBtn');
    if(examSubmitBtn) examSubmitBtn.addEventListener('click', examConfirmSubmit);
    const examMarkBtn = document.getElementById('englishmockExamMarkBtn');
    if(examMarkBtn) examMarkBtn.addEventListener('click', examMarkForReview);
    const examClearBtn = document.getElementById('englishmockExamClearBtn');
    if(examClearBtn) examClearBtn.addEventListener('click', examClearResponse);
    const examSaveNextBtn = document.getElementById('englishmockExamSaveNextBtn');
    if(examSaveNextBtn) examSaveNextBtn.addEventListener('click', examSaveNext);
    const examSaveNextBtnBottom = document.getElementById('englishmockExamSaveNextBtnBottom');
    if(examSaveNextBtnBottom) examSaveNextBtnBottom.addEventListener('click', examSaveNext);
    const examPauseBtn = document.getElementById('englishmockExamPauseBtn');
    if(examPauseBtn) examPauseBtn.addEventListener('click', examTogglePause);
    const examResumeBtn = document.getElementById('englishmockExamResumeBtn');
    if(examResumeBtn) examResumeBtn.addEventListener('click', examTogglePause);

    const resultBackBtn = document.getElementById('englishmockResultBackBtn');
    if(resultBackBtn) resultBackBtn.addEventListener('click', () => showCalcPage('englishmockmenu'));
    const resultReattemptBtn = document.getElementById('englishmockResultReattemptBtn');
    if(resultReattemptBtn) resultReattemptBtn.addEventListener('click', () => {
      if(confirm('Is mock ko dobara attempt karna hai? Naya attempt submit karne par purana result overwrite ho jaayega.')){
        startExamQuiz(examSession.setKey);
      }
    });
    const resultPrevBtn = document.getElementById('englishmockResultPrevBtn');
    if(resultPrevBtn) resultPrevBtn.addEventListener('click', () => resultGoTo(examSession.current - 1));
    const resultNextBtn = document.getElementById('englishmockResultNextBtn');
    if(resultNextBtn) resultNextBtn.addEventListener('click', () => {
      if(examSession.current < examSession.questions.length - 1) resultGoTo(examSession.current + 1);
      else showCalcPage('englishmockmenu');
    });
    const resultQuestionWrap = document.getElementById('englishmockResultQuestionWrap');
    if(resultQuestionWrap) resultQuestionWrap.addEventListener('click', resultReveal);
    const resultOptList = document.getElementById('englishmockResultOptList');
    if(resultOptList) resultOptList.addEventListener('click', resultReveal);
    const resultTagWrap = document.getElementById('englishmockResultTagWrap');
    if(resultTagWrap) resultTagWrap.addEventListener('click', resultReveal);
  }

  return { init };
}
const englishmockQuiz = makeEnglishMockQuiz();



function initReasoningQuiz(){
  const oddOneBtn = document.getElementById('calcOddOneBtn');
  if(oddOneBtn) oddOneBtn.addEventListener('click', () => showCalcPage('oddonemenu'));
  const seriesBtn = document.getElementById('calcSeriesBtn');
  if(seriesBtn) seriesBtn.addEventListener('click', () => showCalcPage('seriesmenu'));
  const codingBtn = document.getElementById('calcCodingBtn');
  if(codingBtn) codingBtn.addEventListener('click', () => showCalcPage('codingmenu'));
  oddoneQuiz.init();
  seriesQuiz.init();
  codingQuiz.init();
}

function initEnglishTopicwiseQuiz(){
  // "English Topic-wise" card — same flow as Math/Reasoning Chapterwise:
  // tap the main card -> chapter list (calcPage-englishtopicwisemenu),
  // tap a chapter -> quiz starts straight away (calcPage-englishtopicwise).
  const btn = document.getElementById('calcEnglishTopicwiseBtn');
  if(btn) btn.addEventListener('click', () => showCalcPage('englishtopicwisemenu'));
  englishTopicwiseQuiz.init();
}

function initPhrasalQuiz(){
  // "Phrasal Verbs" card — Vocab/Idiom jaisa hi flow: Set choose karo
  // (calcPage-phrasalmenu), phir quiz shuru hota hai (calcPage-phrasal).
  const phrasalBtn = document.getElementById('calcPhrasalBtn');
  if(phrasalBtn) phrasalBtn.addEventListener('click', () => showCalcPage('phrasalmenu'));
  phrasalQuiz.init();
}

function initHomophoneQuiz(){
  // "Homophones" card — same flow: Set choose karo (calcPage-homophonemenu),
  // phir quiz shuru hota hai (calcPage-homophone).
  const homophoneBtn = document.getElementById('calcHomophoneBtn');
  if(homophoneBtn) homophoneBtn.addEventListener('click', () => showCalcPage('homophonemenu'));
  homophoneQuiz.init();
}

function initPrepositionQuiz(){
  // "Prepositions" card — same flow: Set choose karo (calcPage-prepositionmenu),
  // phir quiz shuru hota hai (calcPage-preposition).
  const prepositionBtn = document.getElementById('calcPrepositionBtn');
  if(prepositionBtn) prepositionBtn.addEventListener('click', () => showCalcPage('prepositionmenu'));
  prepositionQuiz.init();
}

function initVoiceQuiz(){
  // "Active ↔ Passive Voice" card — same flow: Set choose karo
  // (calcPage-voicemenu), phir quiz shuru hota hai (calcPage-voice).
  const voiceBtn = document.getElementById('calcVoiceBtn');
  if(voiceBtn) voiceBtn.addEventListener('click', () => showCalcPage('voicemenu'));
  voiceQuiz.init();
}

function initNarrationQuiz(){
  // "Narration" card — same flow: Set choose karo (calcPage-narrationmenu),
  // phir quiz shuru hota hai (calcPage-narration).
  const narrationBtn = document.getElementById('calcNarrationBtn');
  if(narrationBtn) narrationBtn.addEventListener('click', () => showCalcPage('narrationmenu'));
  narrationQuiz.init();
}

function initCalcNav(){
  // All four operations now launch practice directly from the Calc menu —
  // one tap straight into the setup sheet (no intermediate sub-page).
  const addBtn = document.getElementById('calcAddBtn');
  if(addBtn) addBtn.addEventListener('click', ()=> openCalcSetup('addition'));
  const subBtn = document.getElementById('calcSubBtn');
  if(subBtn) subBtn.addEventListener('click', ()=> openCalcSetup('subtraction'));
  const mulBtn = document.getElementById('calcMulBtn');
  if(mulBtn) mulBtn.addEventListener('click', ()=> openCalcSetup('multiplication'));
  const divBtn = document.getElementById('calcDivBtn');
  if(divBtn) divBtn.addEventListener('click', ()=> openCalcSetup('division'));
  const squareBtn = document.getElementById('calcSquareBtn');
  if(squareBtn) squareBtn.addEventListener('click', ()=> openCalcSetup('square'));
  const cubeBtn = document.getElementById('calcCubeBtn');
  if(cubeBtn) cubeBtn.addEventListener('click', ()=> openCalcSetup('cube'));
  const sqrtBtn = document.getElementById('calcSqrtBtn');
  if(sqrtBtn) sqrtBtn.addEventListener('click', ()=> openCalcSetup('sqrt'));
  const cbrtBtn = document.getElementById('calcCbrtBtn');
  if(cbrtBtn) cbrtBtn.addEventListener('click', ()=> openCalcSetup('cbrt'));
  const tableBtn = document.getElementById('calcTableBtn');
  if(tableBtn) tableBtn.addEventListener('click', ()=> openCalcSetup('table'));
  const trigBtn = document.getElementById('calcTrigBtn');
  if(trigBtn) trigBtn.addEventListener('click', ()=> openCalcSetup('trig'));
  const pctBtn = document.getElementById('calcPctBtn');
  if(pctBtn) pctBtn.addEventListener('click', ()=> openCalcSetup('percentage'));
  const fracBtn = document.getElementById('calcFracBtn');
  if(fracBtn) fracBtn.addEventListener('click', ()=> openCalcSetup('fraction'));
  initCalcSetupSheet();
  initCalcSession();
  initVocabQuiz();
  initReasoningQuiz();
  digitalsumQuiz.init();
  unitdigitQuiz.init();
  statementQuiz.init();
  decisionmakingQuiz.init();
  seatingQuiz.init();
  orderrankingQuiz.init();
  letteranalogyQuiz.init();
  letterwordQuiz.init();
  logicmixQuiz.init();
  bloodrelationsQuiz.init();
  numberanalogyQuiz.init();
  alphanumericQuiz.init();
  syllogismQuiz.init();
  clockioQuiz.init();
  wordanalogyQuiz.init();
  letterseriesdsQuiz.init();
  dictorderQuiz.init();
  calendarreasoningQuiz.init();
  wordformationQuiz.init();
  seatinghardQuiz.init();
  directiondistanceQuiz.init();
  reasoninghardmixQuiz.init();
  statementconclusionQuiz.init();
  wordarrangeageQuiz.init();
  reasoningmockQuiz.init();
  englishmockQuiz.init();
  mathPyqQuiz.init();
  mathPyqQuiz.initExamMode();
  initPhrasalQuiz();
  initHomophoneQuiz();
  initPrepositionQuiz();
  initVoiceQuiz();
  initNarrationQuiz();
  initEnglishTopicwiseQuiz();
}

// ===== Weak / Revise sub-tab switcher (lives inside the "Weak" tab) =====
function switchSubtab(name){
  document.querySelectorAll('.subtabview').forEach(el=>{
    el.classList.toggle('active', el.getAttribute('data-subtab')===name);
  });
  document.querySelectorAll('.subtabbtn').forEach(btn=>{
    btn.classList.toggle('active', btn.getAttribute('data-subtab')===name);
  });
  try{ localStorage.setItem('cgl50-active-weak-subtab', name); }catch(e){}
}
function initWeakReviseSubtabs(){
  document.querySelectorAll('.subtabbtn').forEach(btn=>{
    btn.addEventListener('click', ()=> switchSubtab(btn.getAttribute('data-subtab')));
  });
  let saved = 'weak';
  try{ saved = localStorage.getItem('cgl50-active-weak-subtab') || 'weak'; }catch(e){}
  if(!['weak','revise'].includes(saved)) saved = 'weak';
  switchSubtab(saved);
}

// ===== Swipe left/right to move between tabs =====
// Attached to the main content wrapper so a left-swipe anywhere on a page
// moves forward (Home -> Today -> Mock -> Weak -> Compete -> Analysis)
// and a right-swipe moves back — without hijacking normal vertical scrolling,
// day-grid taps, or dragging inside horizontally-scrollable charts/inputs.
// (Weak tab now holds both "Weak" and "Revise" as an internal sub-tab switcher.)
const TAB_ORDER = ['home','today','calc','mock','chapters','compete','more'];
function initSwipeTabs(){
  const wrap = document.querySelector('.wrap');
  if(!wrap) return;
  let startX=0, startY=0, startTarget=null, tracking=false;
  wrap.addEventListener('touchstart', (e)=>{
    if(e.touches.length!==1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTarget = e.target;
    tracking = true;
  }, {passive:true});
  wrap.addEventListener('touchend', (e)=>{
    if(!tracking) return;
    tracking = false;
    // Don't hijack horizontal drags meant for charts, inputs, selects, or the day grid.
    if(startTarget && startTarget.closest && startTarget.closest('.chartscroll, input, textarea, select, .daygrid, .calendarView')) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if(Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)*1.4) return;
    const activeEl = document.querySelector('.tabview.active');
    const cur = activeEl ? activeEl.getAttribute('data-tabview') : 'home';
    // Quiz tab ke andar left/right swipe sirf agla sawaal dikhaane ke liye
    // hai (attachQuizSwipeNext) — yahan tab-switch wala swipe band rakhte
    // hain, warna dono ek saath trigger ho jaate the.
    if(cur === 'calc') return;
    const idx = TAB_ORDER.indexOf(cur);
    if(idx<0) return;
    if(dx<0 && idx<TAB_ORDER.length-1) switchTab(TAB_ORDER[idx+1]);
    else if(dx>0 && idx>0) switchTab(TAB_ORDER[idx-1]);
  }, {passive:true});
}

document.getElementById('refreshBtn').addEventListener('click', async ()=>{
  renderAll();
  await save();
  await renderCompetePanel();
});
document.getElementById('resetBtn').addEventListener('click', async ()=>{
  if(confirm('Ye sab progress, marks aur earnings delete kar dega. Pakka reset karna hai?')){
    state = {};
    selectedDay = todayDayNum();
    await save({overwrite:true});
    renderAll();
  }
});
document.getElementById('exportBtn').addEventListener('click', exportCSV);
document.getElementById('showBackupBtn').addEventListener('click', ()=>{
  document.getElementById('backupArea').value = JSON.stringify(state);
});
document.getElementById('restoreBtn').addEventListener('click', async ()=>{
  const val = document.getElementById('backupArea').value.trim();
  if(!val) return;
  try{
    const parsed = JSON.parse(val);
    state = parsed;
    await save({overwrite:true});
    renderAll();
    alert('Restore ho gaya.');
  }catch(e){
    alert('Ye backup code valid nahi hai.');
  }
});

// ===== Home Screen / PWA setup =====
// Generates a simple gold-on-black app icon at runtime and wires it up as
// both an apple-touch-icon and a data-URI web manifest, so "Add to Home
// Screen" on iOS/Android shows a proper icon + standalone app window
// instead of a generic browser bookmark, with no server required.
function drawAppIcon(size){
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0,0,size,size);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = Math.max(4, size*0.0417);
  ctx.strokeRect(size*0.0417,size*0.0417,size-size*0.0834,size-size*0.0834);
  ctx.fillStyle = '#fbbf24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(size*0.281)}px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;
  ctx.fillText('EXAM', size/2, size/2-size*0.094);
  ctx.font = `500 ${Math.round(size*0.135)}px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TRACKER', size/2, size/2+size*0.198);
  return canvas.toDataURL('image/png');
}
// A no-op service worker (registered via Blob URL, so still zero companion
// files on GitHub) is required for Chrome/Android to reliably fire the real
// beforeinstallprompt event — without one, Chrome usually falls back to the
// manual "Add to Home Screen" bookmark instead of the proper install banner.
// It does NOT cache anything (network passthrough only), so you always see
// the latest version of this file — no stale-data risk.
function registerNoopServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  if(!(location.protocol === 'https:' || location.hostname === 'localhost')) return;
  try{
    const swCode = "self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>self.clients.claim());self.addEventListener('fetch',function(){});";
    const swBlob = new Blob([swCode], {type:'application/javascript'});
    navigator.serviceWorker.register(URL.createObjectURL(swBlob)).catch(()=>{});
  }catch(e){}
}
async function setupHomeScreenIcon(){
  registerNoopServiceWorker();
  try{
    const icon192 = drawAppIcon(192);
    const icon512 = drawAppIcon(512);

    let touchIcon = document.querySelector("link[rel='apple-touch-icon']");
    if(!touchIcon){ touchIcon = document.createElement('link'); touchIcon.rel='apple-touch-icon'; document.head.appendChild(touchIcon); }
    touchIcon.href = icon192;

    let favicon = document.querySelector("link[rel='icon']");
    if(!favicon){ favicon = document.createElement('link'); favicon.rel='icon'; document.head.appendChild(favicon); }
    favicon.href = icon192;

    const manifest = {
      name: "Exam Tracker",
      short_name: "Exam Tracker",
      start_url: ".",
      display: "standalone",
      background_color: "#0a0a0a",
      theme_color: "#0a0a0a",
      icons: [
        { src: icon192, sizes: "192x192", type: "image/png" },
        { src: icon512, sizes: "512x512", type: "image/png" }
      ]
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], {type:'application/manifest+json'});
    const manifestUrl = URL.createObjectURL(manifestBlob);
    let manifestLink = document.querySelector("link[rel='manifest']");
    if(!manifestLink){ manifestLink = document.createElement('link'); manifestLink.rel='manifest'; document.head.appendChild(manifestLink); }
    manifestLink.href = manifestUrl;
  }catch(e){ console.error('Home screen icon setup failed', e); }
}

// ===== Simple, free, no-server notifications =====
// Uses the browser's built-in Notification API directly. This works while
// the tab/installed app is open OR running in the background (Android
// Chrome keeps it alive for a while), but will NOT wake the app up once
// it's fully closed/swiped-away — that would need a push server (FCM +
// Cloud Functions), which is a separate, paid-plan setup.
function notifPref(){
  try{ return localStorage.getItem('cgl50-notif-enabled')==='1'; }catch(e){ return false; }
}
function setNotifPref(v){
  try{ localStorage.setItem('cgl50-notif-enabled', v ? '1':'0'); }catch(e){}
}
async function ensureNotificationPermission(){
  if(!('Notification' in window)){
    alert('Ye browser notifications support nahi karta.');
    return false;
  }
  if(Notification.permission === 'granted') return true;
  if(Notification.permission === 'denied'){
    alert('Notifications is site ke liye block hain. Browser/site settings mein jaake manually allow karo.');
    return false;
  }
  try{
    const res = await Notification.requestPermission();
    return res === 'granted';
  }catch(e){ return false; }
}
function fireNotification(title, body){
  if(!notifPref()) return;
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  try{
    const n = new Notification(title, { body, tag: 'cgl50-'+title });
    n.onclick = ()=>{ window.focus(); n.close(); };
  }catch(e){ console.error('notification failed', e); }
}
function updateNotifBtnLabel(){
  const btn = document.getElementById('notifBtn');
  if(!btn) return;
  const on = notifPref() && ('Notification' in window) && Notification.permission === 'granted';
  btn.textContent = on ? '🔔 Notifications On' : '🔕 Notifications Off';
}
document.getElementById('notifBtn').addEventListener('click', async ()=>{
  const currentlyOn = notifPref() && ('Notification' in window) && Notification.permission === 'granted';
  if(currentlyOn){
    setNotifPref(false);
  } else {
    const ok = await ensureNotificationPermission();
    setNotifPref(ok);
    if(ok) fireNotification('🎯 Exam Tracker', 'Notifications on ho gaye — friends ke tracker update yahan dikhenge.');
  }
  updateNotifBtnLabel();
});

// ===== Automatic daily "Target Reminder" — motivational nudge =====
// Every minute, checks whether the saved reminder clock-time has passed for
// TODAY. If it has, today isn't a rest day, today's target is still under
// 50%, and we haven't already pinged today — fires one notification with a
// random line pulled from the app's existing motivation/quote pools.
// Same background/foreground limitation as the notification system above:
// this only fires while the tab/installed app is open (no push server).
const TARGET_REMINDER_MESSAGES = [
  "Abhi tak aaj ka target adhoora hai — thoda time nikaal ke kuch tasks nipta do.",
  "Din dhal raha hai, target abhi baaki hai. Ek chhota push aur wallet fill ho sakta hai.",
  "Reminder: aaj ka 50% bhi abhi complete nahi hua. Chalo, ab shuru karte hain.",
  "Kal ka pachtava aaj ke 20 minute se bach sakta hai — ek task uthao aur laga do.",
  "Streak zinda rakhni hai to abhi thoda kaam baaki hai — jaldi nipta do.",
  "Tumhara future-self isi waqt ka faisla dekh raha hai — target poora karo.",
  "Abhi bhi waqt hai aaj ka din bachane ka — bas ek task se shuru karo."
];
function targetReminderPref(){
  // Default ON for every user (new or existing) — nobody has to find and tap
  // the toggle themselves. Only an explicit tap on the button (which stores
  // '0') turns it off; an unset/missing key always means "enabled".
  try{
    const v = localStorage.getItem('cgl50-target-reminder-enabled');
    return v !== '0';
  }catch(e){ return true; }
}
function setTargetReminderPref(v){
  try{ localStorage.setItem('cgl50-target-reminder-enabled', v ? '1':'0'); }catch(e){}
}
// Fixed twice-daily slots — 12:00 PM (noon) and 6:00 PM (18:00). Each slot
// fires independently, once per day, tracked by its own "last fired" key.
const TARGET_REMINDER_SLOTS = [
  { key: '12', hh: 12, mm: 0 },
  { key: '18', hh: 18, mm: 0 }
];
function targetReminderLastFiredDate(slotKey){
  try{ return localStorage.getItem('cgl50-target-reminder-lastfired-'+slotKey) || ''; }catch(e){ return ''; }
}
function setTargetReminderLastFiredDate(slotKey, v){
  try{ localStorage.setItem('cgl50-target-reminder-lastfired-'+slotKey, v); }catch(e){}
}
function updateTargetReminderBtnLabel(){
  const btn = document.getElementById('targetReminderBtn');
  if(!btn) return;
  // The in-app popup reminder works with or without browser notification
  // permission (it's just a modal), so "On/Off" reflects the saved
  // preference only — not whether the bonus phone-tray ping is also live.
  btn.textContent = targetReminderPref() ? '🔔 Target Reminder On' : '🔕 Target Reminder Off';
}
function showTargetReminderModal(msg){
  const modal = document.getElementById('targetReminderModal');
  if(!modal) return;
  const msgEl = document.getElementById('targetReminderModalMsg');
  if(msgEl) msgEl.textContent = msg;
  modal.style.display = 'flex';
}
function hideTargetReminderModal(){
  const modal = document.getElementById('targetReminderModal');
  if(modal) modal.style.display = 'none';
}
{
  const trmCloseBtn = document.getElementById('targetReminderModalCloseBtn');
  const trmOkBtn = document.getElementById('targetReminderModalOkBtn');
  if(trmCloseBtn) trmCloseBtn.addEventListener('click', hideTargetReminderModal);
  if(trmOkBtn) trmOkBtn.addEventListener('click', hideTargetReminderModal);
}
// Finds the next slot (12:00 or 18:00) that is due to fire right now:
// its clock-time has already passed today AND it hasn't fired yet today.
// Returns the slot object, or null if none are currently due.
function targetReminderDueSlot(){
  const todayKey = fmtISODate(new Date());
  const cur = nowMinutes();
  for(const slot of TARGET_REMINDER_SLOTS){
    if(cur < (slot.hh*60+slot.mm)) continue; // this slot's time hasn't arrived yet today
    if(targetReminderLastFiredDate(slot.key) === todayKey) continue; // this slot already fired today
    return slot;
  }
  return null;
}
// Core "is a reminder due right now" check — shared by both the on-open
// trigger and the scheduled (clock-time) trigger below. Returns the due
// slot + a random motivational message, or null if nothing is due.
function targetReminderDueMessage(){
  if(!targetReminderPref()) return null;

  const slot = targetReminderDueSlot();
  if(!slot) return null; // no slot currently due (either not time yet, or already fired)

  const d = getDay(todayDayNum());
  if(d.rest) return null; // rest day — no reminder needed
  if(meetsStreakTarget(d)) return null; // already 50%+ done today, nothing to nudge

  const pool = TARGET_REMINDER_MESSAGES;
  return { slot, msg: pool[Math.floor(Math.random()*pool.length)] };
}
// Fires the reminder through both channels at once: an in-app modal popup
// (works instantly, no permission needed) and, if the person has also
// granted browser notification permission, a phone notification-tray ping.
function fireTargetReminder(slot, msg){
  showTargetReminderModal(msg);
  if(notifPref() && ('Notification' in window) && Notification.permission === 'granted'){
    fireNotification('🎯 Aaj Ka Target Baaki Hai', msg);
  }
  setTargetReminderLastFiredDate(slot.key, fmtISODate(new Date()));
}
// Runs once right when the app is opened — if a slot (12 PM or 6 PM) is
// currently due and we haven't already reminded for it today, pop it
// immediately instead of waiting for the scheduled clock-time below.
function checkTargetReminderOnAppOpen(){
  const due = targetReminderDueMessage();
  if(!due) return;
  fireTargetReminder(due.slot, due.msg);
}
// Scheduled check (runs every minute via the live ticker) — fires once
// per slot (12 PM, then 6 PM) per day, the moment each slot's time passes
// and the target is still incomplete. Also acts as a fallback catch-up
// for a slot that was still on-target at app-open time but slipped later.
function checkTargetReminder(){
  const due = targetReminderDueMessage();
  if(!due) return;
  fireTargetReminder(due.slot, due.msg);
}
// ===== AI Strict Manager =====
// Deeply analyses today's own data (tasks ticked, notes, mistakes, study
// time) plus a 14-day trend, mistake-reflection frequency, and the actual
// weakest chapters/topics from the Chapter Mistake Log — then asks the
// Anthropic API to respond as a strict-but-caring Hinglish mentor, grounded
// in real weak spots by name instead of generic advice. If the first API
// call fails, it retries once (transient network blips shouldn't skip the
// AI); only if that also fails does it fall back to a rule-based Hinglish
// message built from the same numbers (still name-checks the weakest
// chapter), so the feature never just breaks/does nothing.
const STRICT_MANAGER_GOOD_PCT = 70; // stricter bar than the 50% streak-freeze target
const STRICT_MANAGER_SLOT = { hh:18, mm:0 }; // fires once daily at/after 6:00 PM

// Aaj se pehle, kitne LAGATAAR (consecutive) din target
// STRICT_MANAGER_GOOD_PCT% se neeche rahe — rest days beech mein aane par
// streak todte nahi (skip ho jaate hain), bilkul khaali/untouched din pe
// ruk jaate hain (tracker abhi wahan tak start hi nahi hua tha).
function dayCompletionPct(n){
  const d = getDay(n);
  if(d.rest) return null;
  return TASKS.length ? Math.round((d.tasks.filter(Boolean).length/TASKS.length)*100) : 0;
}
function computeUnderperformanceStreak(){
  const tn = todayDayNum();
  let bad = 0;
  for(let i=tn-1; i>=1; i--){
    const d = getDay(i);
    if(!isDayTouched(d)) break;
    if(d.rest) continue;
    const pct = dayCompletionPct(i);
    if(pct !== null && pct < STRICT_MANAGER_GOOD_PCT) bad++;
    else break;
  }
  return bad;
}
// Gathers everything the AI (or the offline fallback) needs to give
// specific, grounded feedback instead of generic lines. Includes the
// weakest chapters/topics (from the Chapter Mistake Log) and a longer
// 14-day trend + mistake-reflection frequency, so the AI can point at
// real weak spots by name instead of speaking generically.
function collectStrictManagerData(){
  const tn = todayDayNum();
  const d = getDay(tn);
  const todayPct = dayCompletionPct(tn);
  const streakInfo = computeStreakInfo();
  const badStreak = computeUnderperformanceStreak();

  const tasksToday = TASKS.map((t, idx)=>({
    name: t,
    done: !!d.tasks[idx],
    note: (d.taskNotes && d.taskNotes[idx]) ? d.taskNotes[idx].trim() : ''
  }));

  let totalStudyMin = 0;
  Object.keys(d.studyMin||{}).forEach(k=>{ totalStudyMin += (d.studyMin[k]||0); });
  const plannedStudyMin = TASK_DURATIONS_MIN.reduce((a,b)=>a+b,0);

  // 14-day trend (was 7) — gives the AI a much clearer signal of whether
  // things are actually improving/declining vs just one bad day.
  const trend = [];
  for(let i=Math.max(1, tn-13); i<=tn; i++){
    const dd = getDay(i);
    trend.push({ day:i, rest: !!dd.rest, pct: dd.rest ? null : dayCompletionPct(i) });
  }
  const touchedPcts = trend.filter(t=>!t.rest && t.pct!==null).map(t=>t.pct);
  const trendAvgPct = touchedPcts.length ? Math.round(touchedPcts.reduce((a,b)=>a+b,0)/touchedPcts.length) : null;

  const mockTotal = num(d.mock.math)+num(d.mock.reasoning)+num(d.mock.english)+num(d.mock.gk);
  const wrongTotal = num(d.mock.wrongMath)+num(d.mock.wrongReasoning)+num(d.mock.wrongEnglish)+num(d.mock.wrongGk);

  // Real weak spots by name (top 3 each), pulled straight from the Chapter
  // Mistake Log — so the AI's advice is grounded in this student's actual
  // data, not a generic "practice more" line.
  const weakestMathChapters = MATH_CHAPTERS
    .map(n=>({ name:n, wrongCount: chapterCount('math', n) }))
    .filter(r=>r.wrongCount>0).sort((a,b)=>b.wrongCount-a.wrongCount).slice(0,3);
  const weakestEnglishTopics = ENGLISH_TOPICS
    .map(n=>({ name:n, wrongCount: chapterCount('english', n) }))
    .filter(r=>r.wrongCount>0).sort((a,b)=>b.wrongCount-a.wrongCount).slice(0,3);

  // Of the last 7 touched (non-rest) days, how many actually had a
  // mistakes-note written — shows if the student is reflecting or just
  // ticking boxes.
  let touchedDays7 = 0, mistakeNoteDays7 = 0;
  for(let i=Math.max(1, tn-6); i<=tn; i++){
    const dd = getDay(i);
    if(dd.rest || !isDayTouched(dd)) continue;
    touchedDays7++;
    if((dd.mistakes||'').trim()) mistakeNoteDays7++;
  }

  return {
    dayNumber: tn,
    totalDays: TOTAL_DAYS,
    isRestDay: !!d.rest,
    todayCompletionPct: todayPct===null ? 0 : todayPct,
    tasksToday,
    totalStudyMinutesToday: totalStudyMin,
    plannedStudyMinutesToday: plannedStudyMin,
    currentStreak: streakInfo.streak,
    underperformanceStreakDays: badStreak,
    last14DaysTrend: trend,
    last14DaysAvgCompletionPct: trendAvgPct,
    mistakeReflectionFrequency: touchedDays7 ? (mistakeNoteDays7 + '/' + touchedDays7 + ' touched days had a mistakes-note') : 'not enough data yet',
    notesToday: (d.notes||'').trim(),
    mistakesToday: (d.mistakes||'').trim(),
    mockAttemptedToday: mockTotal>0 || wrongTotal>0,
    mockTotalScore: mockTotal,
    mockWrongTotal: wrongTotal,
    weakestMathChapters,
    weakestEnglishTopics
  };
}
// Actual AI call — persona + strict rules live in `system`, the real
// numbers go in the user turn as JSON so the model has to ground its
// scolding/praise in what actually happened today, not generic filler.
async function callStrictManagerAI(data){
  const system = "Tum ek \"AI Strict Manager\" ho — student ka ek strict par caring exam-prep coach, jo SSC CGL ki taiyari karwa raha hai. Hamesha Hinglish (Roman script Hindi+English mix) mein jawab do, kabhi shuddh English paragraph mat likho. Tumhe niche student ke aaj aur pichhle 14 din ka poora JSON data diya jayega — jismein last14DaysAvgCompletionPct (trend), mistakeReflectionFrequency (mistakes note kitni baar likhi), aur weakestMathChapters / weakestEnglishTopics (jahan sabse zyada galtiyan hui hain) bhi hain. Kaam: 1) Data ko deeply analyse karo — aaj ka % complete, 14-din ka trend gir raha hai ya sudhar raha hai, aur mistakes sirf tick ho rahi hain ya sach mein reflect ho rahi hain. 2) Agar performance kharab hai ya kai din se gir rahi hai, seedhi aur strict daant do — jaise ek sacha mentor dosti se lekin bina lag-lapet ke daantay, kabhi insult ya gaali nahi. 3) Agar performance achhi hai to thodi tareef do par turant agla, thoda tougher target bhi do — kabhi mat kaho 'sab perfect hai, ab aaram karo'. 4) Agar weakestMathChapters ya weakestEnglishTopics mein koi entry hai, un mein se kam se kam EK chapter/topic ka naam lekar seedha bolo ki wahi revise karo — kabhi generic 'practice more' mat bolo jab specific naam maujood ho. 5) Hamesha jawab ek clear, measurable 'kal ka target' line par khatam karo — ek specific task/chapter/time-limit ke saath, vague na ho ('kal accha karna' jaisa kuch mat likho). 6) Response 130-190 words ka ho, plain paragraphs mein (blank line se break kar sakte ho), koi markdown heading/bullet/asterisk use mat karo, kyunki ye seedha ek popup message mein dikhaya jayega.";

  const userMsg = "Mera aaj (Day " + data.dayNumber + "/" + data.totalDays + ") aur pichhle 14 din ka poora data (JSON):\n" + JSON.stringify(data, null, 2) + "\n\nIsko deeply analyse karke ek \"AI Strict Manager\" jaisa Hinglish message do — mere asli weak chapters/topics aur trend ka hawala dete hue, generic advice mat do.";

  const resp = await fetch(AI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: system,
      messages: [{ role: "user", content: userMsg }]
    })
  });
  if(!resp.ok) throw new Error('Strict Manager API request failed: ' + resp.status);
  const json = await resp.json();
  const text = (json.content || [])
    .filter(b => b && b.type === 'text' && b.text)
    .map(b => b.text)
    .join('\n')
    .trim();
  if(!text) throw new Error('Strict Manager API: empty response');
  return text;
}
// Offline, rule-based fallback — used whenever the AI call isn't reachable
// (e.g. this page opened as a standalone installed PWA outside claude.ai).
// Built from the exact same numbers, so the feature always works, not
// just when it happens to be running inside an artifact preview.
function buildStrictManagerLocalMessage(data){
  const lines = [];
  const pct = data.todayCompletionPct;
  const bad = data.underperformanceStreakDays;

  if(data.isRestDay){
    lines.push("Aaj rest day hai — thik hai, break zaroori hota hai. Par kal se full force wapas aana hai, rest ko habit mat bana lena.");
  } else if(bad >= 3){
    lines.push("Seedhi baat sun — pichhle " + bad + " din se tera target " + STRICT_MANAGER_GOOD_PCT + "% bhi cross nahi hua. Ye ab ek din ki galti nahi, pattern ban chuka hai. Isi raftaar se CGL nahi niklega — abhi rukh badalni padegi.");
  } else if(bad >= 1){
    lines.push("Pichhle " + bad + " din se tu apne hi target se peeche chal raha hai. Aaj " + pct + "% hua hai — abhi bhi waqt hai isko rokne ka, warna ye chhoti dheelai bahut mehengi padegi.");
  } else if(pct < 50){
    lines.push("Aaj abhi tak sirf " + pct + "% target hua hai. Din khatam nahi hua — uth aur bacha hua kaam nipta do, kal ka bhaar aaj mat chhodo.");
  } else if(pct < 100){
    lines.push("Aaj " + pct + "% ho gaya hai — thik chal raha hai, par 'thik' se CGL nahi nikalta, 'poora' se nikalta hai. Bacha hua kaam abhi khatam karo.");
  } else {
    lines.push("Aaj ka poora target — 100% — clear kiya hai. Accha kaam. Lekin kal fir se yahi discipline chahiye, ek accha din kaafi nahi hota — streak banani hai.");
  }

  // 14-day trend line, if there's enough touched data to say something
  // meaningful about direction (not just today's single number).
  if(!data.isRestDay && data.last14DaysAvgCompletionPct !== null){
    const avg = data.last14DaysAvgCompletionPct;
    if(pct < avg - 10){
      lines.push("14-din ka average " + avg + "% hai, par aaj usse kaafi neeche hai — ye ek off-day hai ya naya trend, ye kal ke performance se tay hoga.");
    } else if(pct > avg + 10){
      lines.push("14-din ke " + avg + "% average se aaj kaafi upar hai — is momentum ko kal bhi carry karo.");
    }
  }

  // Name an actual weak chapter/topic when we have one — same rule the AI
  // prompt follows, so the offline fallback isn't generic either.
  const weakPick = (data.weakestMathChapters && data.weakestMathChapters[0]) || (data.weakestEnglishTopics && data.weakestEnglishTopics[0]);
  if(weakPick){
    lines.push("Sabse zyada mistakes \"" + weakPick.name + "\" mein ho rahi hain (" + weakPick.wrongCount + " galtiyan log hui hain) — kal isi chapter/topic ka revision sabse pehle karo.");
  }

  if(data.mistakesToday){
    lines.push("Aaj ki mistakes note ki hain — kal wahi galti dobara hui to woh sirf carelessness maani jayegi, seekha hua nahi.");
  }

  lines.push("Abhi ka streak: " + data.currentStreak + " din. Kal subah utho aur sabse pehla task sabse pehle nipta do — din ki disha wahin se tay hoti hai.");

  return lines.join("\n\n");
}
function strictManagerPref(){
  // Default ON for everyone — same convention as Target Reminder above.
  try{
    const v = localStorage.getItem('cgl50-strictmgr-enabled');
    return v !== '0';
  }catch(e){ return true; }
}
function setStrictManagerPref(v){
  try{ localStorage.setItem('cgl50-strictmgr-enabled', v ? '1':'0'); }catch(e){}
}
function strictManagerCacheKey(){
  return 'cgl50-strictmgr-cache-' + (myName||'me').toLowerCase() + '-' + fmtISODate(new Date());
}
function loadStrictManagerCache(){
  try{
    const raw = localStorage.getItem(strictManagerCacheKey());
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function saveStrictManagerCache(obj){
  try{ localStorage.setItem(strictManagerCacheKey(), JSON.stringify(obj)); }catch(e){}
}
// One analysis per day is cached (and reused by both the manual button and
// the 6 PM auto-popup) so we don't re-hit the API repeatedly — pass
// forceRefresh=true (the modal's "Phir Se Analyse" button) to bypass it.
async function getStrictManagerMessage(forceRefresh){
  if(!forceRefresh){
    const cached = loadStrictManagerCache();
    if(cached && cached.text) return cached;
  }
  const data = collectStrictManagerData();
  let text, source;
  try{
    text = await callStrictManagerAI(data);
    source = 'ai';
  }catch(e1){
    console.error('Strict Manager AI call failed, retrying once:', e1);
    try{
      await new Promise(r=>setTimeout(r, 1000)); // brief pause before retry
      text = await callStrictManagerAI(data);
      source = 'ai';
    }catch(e2){
      console.error('Strict Manager AI retry also failed, offline fallback use ho raha hai:', e2);
      text = buildStrictManagerLocalMessage(data);
      source = 'local';
    }
  }
  const result = { text: text, source: source, badStreak: data.underperformanceStreakDays, ts: Date.now() };
  saveStrictManagerCache(result);
  return result;
}
function renderStrictManagerPanel(){
  const el = document.getElementById('strictManagerPanel');
  if(!el) return;
  // AI Strict Manager always analyses whatever tracker is CURRENTLY loaded
  // (getDay()/state), not necessarily the device owner's own data. When an
  // Admin is viewing a friend's tracker (with or without Edit Mode ON), that
  // loaded data belongs to the friend — so this feature must be completely
  // hidden here, otherwise it silently analyses the friend's day and shows
  // it back as "tumhara" (yours), and could even auto-popup at 6 PM while
  // Admin is just browsing a friend's tracker.
  if(viewingName !== myName){
    el.innerHTML = `<div class="losshint" style="padding-top:0;">🤖 AI Strict Manager sirf apne tracker par available hai — ${escapeHtml(viewingName||'is member')} ka nahi.</div>`;
    return;
  }
  const bad = computeUnderperformanceStreak();
  const cached = loadStrictManagerCache();
  const weakMath = MATH_CHAPTERS.map(n=>({name:n, wrongCount:chapterCount('math', n)})).filter(r=>r.wrongCount>0).sort((a,b)=>b.wrongCount-a.wrongCount)[0];
  const weakEng = ENGLISH_TOPICS.map(n=>({name:n, wrongCount:chapterCount('english', n)})).filter(r=>r.wrongCount>0).sort((a,b)=>b.wrongCount-a.wrongCount)[0];
  const focusPick = weakMath || weakEng;
  el.innerHTML = `
    ${bad>0
      ? `<div class="smBadge smBadgeWarn">⚠️ ${bad} din se target ${STRICT_MANAGER_GOOD_PCT}% se neeche</div>`
      : `<div class="smBadge smBadgeOk">✅ Abhi koi bad-streak nahi</div>`}
    ${focusPick ? `<div class="smBadge smBadgeWarn">🎯 Focus: ${escapeHtml(focusPick.name)} (${focusPick.wrongCount} galtiyan)</div>` : ''}
    <div class="btnrow">
      <button class="nav-btn" id="smOpenBtn">${cached ? '📋 Aaj Ka AI Analysis Dekho' : '🤖 AI Se Analysis Karwao'}</button>
    </div>
  `;
  const openBtn = document.getElementById('smOpenBtn');
  if(openBtn) openBtn.addEventListener('click', ()=> openStrictManagerModal(false));
}
function showStrictManagerModalEl(){
  const modal = document.getElementById('strictManagerModal');
  if(modal) modal.style.display = 'flex';
}
function hideStrictManagerModal(){
  const modal = document.getElementById('strictManagerModal');
  if(modal) modal.style.display = 'none';
}
async function openStrictManagerModal(forceRefresh){
  if(viewingName !== myName) return; // never analyse/show a friend's tracker as "yours"
  const msgEl = document.getElementById('strictManagerModalMsg');
  const badgeEl = document.getElementById('strictManagerModalBadge');
  showStrictManagerModalEl();
  if(msgEl) msgEl.textContent = '🧠 AI tumhara aaj ka data deeply analyse kar raha hai…';
  if(badgeEl) badgeEl.textContent = '';
  try{
    const result = await getStrictManagerMessage(forceRefresh);
    if(msgEl) msgEl.textContent = result.text;
    if(badgeEl) badgeEl.textContent = result.source==='ai' ? '🤖 AI Analysis' : '📐 Offline Analysis';
    renderStrictManagerPanel();
  }catch(e){
    if(msgEl) msgEl.textContent = 'Analysis abhi nahi ban paaya — thodi der mein phir try karo.';
    console.error('openStrictManagerModal error:', e);
  }
}
{
  const smCloseBtn = document.getElementById('strictManagerCloseBtn');
  const smOkBtn = document.getElementById('strictManagerOkBtn');
  const smRefreshBtn = document.getElementById('strictManagerRefreshBtn');
  if(smCloseBtn) smCloseBtn.addEventListener('click', hideStrictManagerModal);
  if(smOkBtn) smOkBtn.addEventListener('click', hideStrictManagerModal);
  if(smRefreshBtn) smRefreshBtn.addEventListener('click', ()=> openStrictManagerModal(true));
}

// ----- 6 PM daily auto-popup -----
function strictManagerLastFiredDate(){
  try{ return localStorage.getItem('cgl50-strictmgr-lastfired-' + (myName||'me').toLowerCase()) || ''; }catch(e){ return ''; }
}
function setStrictManagerLastFiredDate(v){
  try{ localStorage.setItem('cgl50-strictmgr-lastfired-' + (myName||'me').toLowerCase(), v); }catch(e){}
}
function strictManagerDue(){
  if(!stateReady) return false;
  // stateReady is also true when Admin is viewing/edit-moding a FRIEND's
  // tracker (canAdminEditViewed()), but this feature must only ever fire on
  // the device owner's own loaded data — never a friend's.
  if(viewingName !== myName) return false;
  if(!strictManagerPref()) return false;
  if(nowMinutes() < (STRICT_MANAGER_SLOT.hh*60 + STRICT_MANAGER_SLOT.mm)) return false;
  if(strictManagerLastFiredDate() === fmtISODate(new Date())) return false;
  return true;
}
// Shared by both the on-open check and the once-a-minute ticker below.
// Marks "fired" BEFORE the (async) analysis finishes, so two overlapping
// checks can never both pop the modal for the same day.
async function fireStrictManagerPopupIfDue(){
  if(!strictManagerDue()) return;
  setStrictManagerLastFiredDate(fmtISODate(new Date()));
  await openStrictManagerModal(false);
  const cached = loadStrictManagerCache();
  if(cached && notifPref() && ('Notification' in window) && Notification.permission === 'granted'){
    const preview = cached.text.length > 120 ? cached.text.slice(0,120) + '…' : cached.text;
    fireNotification('🤖 AI Strict Manager — Shaam Ka Check', preview);
  }
}
function checkStrictManagerPopupOnAppOpen(){ fireStrictManagerPopupIfDue(); }
function checkStrictManagerPopup(){ fireStrictManagerPopupIfDue(); }

// ===== "How to use" Help guide =====
// A short always-accessible explainer for what each tab does. Auto-shown
// once per device (covers both brand-new AND already-existing users who
// never saw an explanation before this was added) via the seen-flag below;
// the ❓ button in the topbar re-opens it anytime after that.
function showHelpModal(){
  const modal = document.getElementById('helpModal');
  if(modal) modal.style.display = 'flex';
}
function hideHelpModal(){
  const modal = document.getElementById('helpModal');
  if(modal) modal.style.display = 'none';
  try{ localStorage.setItem('cgl50-help-seen', '1'); }catch(e){}
}
function maybeShowHelpModalOnce(){
  try{
    if(localStorage.getItem('cgl50-help-seen') === '1') return;
  }catch(e){}
  setTimeout(showHelpModal, 1300);
}
{
  const helpBtn = document.getElementById('helpBtn');
  const helpCloseBtn = document.getElementById('helpCloseBtn');
  const helpGotItBtn = document.getElementById('helpGotItBtn');
  if(helpBtn) helpBtn.addEventListener('click', showHelpModal);
  if(helpCloseBtn) helpCloseBtn.addEventListener('click', hideHelpModal);
  if(helpGotItBtn) helpGotItBtn.addEventListener('click', hideHelpModal);
}

// ===== Start Studying: Focus Timer (Pomodoro / Stopwatch / Timed) =====
// A free-running study-time logger, separate from the daily task checklist —
// tracks minutes studied per SSC subject (Math/Reasoning/English/GK) so the
// user can just hit play and study without needing a task tied to it.
const POMODORO_WORK_MIN = 25;
const POMODORO_BREAK_MIN = 5;

let focusSession = {
  mode:'timed',      // 'pomodoro' | 'stopwatch' | 'timed'
  subject:null,
  durationMin:25,
  running:false,
  isBreak:false,
  remainingSec:25*60,   // pomodoro/timed countdown
  elapsedSec:0,          // stopwatch count-up
  pendingSec:0,           // studied seconds not yet persisted (flushed periodically)
  tickHandle:null,
};

function todayStudyTotalMin(){
  const d = getDay(todayDayNum());
  const vals = Object.values(d.studyMin||{});
  return Math.round(vals.reduce((a,b)=>a+(Number(b)||0),0));
}
function renderFocusTodayText(){
  const total = todayStudyTotalMin();
  const line1 = document.getElementById('studyTodayLine');
  if(line1) line1.innerHTML = '🔥 Today: <b>'+total+'m</b> studied';
  const line2 = document.getElementById('focusTodayText');
  if(line2) line2.innerHTML = '🔥 Today: <b>'+total+'m</b> studied';
}
function addStudySeconds(subjectId, seconds){
  if(!subjectId || seconds<=0) return;
  const d = getDay(todayDayNum());
  d.studyMin[subjectId] = Math.round(((d.studyMin[subjectId]||0) + seconds/60) * 100) / 100;
  save();
  renderFocusTodayText();
  autoTickTaskIfTargetMet(subjectId, d);
}
// If the "Study Shuru Karo" picker's chosen item is one of today's actual
// daily-target tasks (key "task<idx>") and total studied minutes logged for
// it has now reached that task's own assigned duration, tick it done
// automatically — same auto-complete behaviour the per-task ⏱️ timer
// (Today tab) already has, so both ways of studying a target behave the
// same way. Legacy math/reasoning/english/gk keys (from that per-task
// timer) don't match and are left untouched — it already ticks itself.
function autoTickTaskIfTargetMet(subjectId, d){
  const m = /^task(\d+)$/.exec(subjectId);
  if(!m) return;
  const idx = parseInt(m[1],10);
  if(!TASKS[idx] || d.tasks[idx]) return;
  const targetMin = TASK_DURATIONS_MIN[idx] || 0;
  if(targetMin<=0 || d.studyMin[subjectId] < targetMin) return;
  const doneBefore = d.tasks.filter(Boolean).length;
  d.tasks[idx] = true;
  const doneAfter = d.tasks.filter(Boolean).length;
  save();
  if(doneBefore < TASKS.length && doneAfter === TASKS.length) showReward(todayDayNum());
  renderAll();
}
function flushFocusPending(){
  const inBreak = focusSession.mode==='pomodoro' && focusSession.isBreak;
  if(focusSession.pendingSec>0 && focusSession.subject && !inBreak){
    addStudySeconds(focusSession.subject, focusSession.pendingSec);
  }
  focusSession.pendingSec = 0;
}
function focusSecondsForMode(){
  if(focusSession.mode==='pomodoro') return (focusSession.isBreak ? POMODORO_BREAK_MIN : focusSession.durationMin) * 60;
  if(focusSession.mode==='timed') return focusSession.durationMin * 60;
  return 0;
}
function resetFocusTimerValues(){
  focusSession.isBreak = false;
  focusSession.elapsedSec = 0;
  focusSession.pendingSec = 0;
  focusSession.remainingSec = focusSecondsForMode();
}
function formatMMSS(totalSec){
  totalSec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(totalSec/60), s = totalSec%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function focusStatusText(){
  if(!focusSession.subject) return 'Target Select Karo';
  if(!focusSession.running){
    const fresh = focusSession.mode==='stopwatch' ? focusSession.elapsedSec===0 : focusSession.remainingSec===focusSecondsForMode();
    return fresh ? 'Ready' : 'Paused';
  }
  if(focusSession.mode==='pomodoro' && focusSession.isBreak) return 'Break Time ☕';
  return 'Studying…';
}
function updateFocusDisplay(){
  const timeEl = document.getElementById('focusTimeText');
  const statusEl = document.getElementById('focusStatusText');
  const ring = document.getElementById('focusRing');
  if(!timeEl) return;
  let pct = 0, display;
  if(focusSession.mode==='stopwatch'){
    display = formatMMSS(focusSession.elapsedSec);
    pct = focusSession.running ? ((focusSession.elapsedSec % 3600) / 3600 * 100) : 0;
  } else {
    display = formatMMSS(focusSession.remainingSec);
    const total = focusSecondsForMode();
    pct = total>0 ? (1 - focusSession.remainingSec/total) * 100 : 0;
  }
  timeEl.textContent = display;
  if(ring) ring.style.setProperty('--p', Math.min(100, Math.max(0, pct)));
  if(statusEl) statusEl.textContent = focusStatusText();
}
function updateFocusPlayBtn(){
  const btn = document.getElementById('focusPlayBtn');
  if(btn){
    btn.textContent = focusSession.running ? '⏸' : '▶';
    btn.style.opacity = focusSession.subject ? '1' : '0.4';
    btn.style.pointerEvents = focusSession.subject ? 'auto' : 'none';
  }
  const backBtn = document.getElementById('focusBackBtn');
  if(backBtn) backBtn.disabled = focusSession.running;
}
// Toggles between the "pick a target" view and the "timer running" view —
// once a target is selected, the full list hides and only that target's
// timer shows, so the screen isn't cluttered. Tapping ← (disabled while
// running) brings the list back to change the target.
function updateFocusPickerVisibility(){
  const hasSubject = !!focusSession.subject;
  const prompt = document.getElementById('focusPrompt');
  const grid = document.getElementById('focusSubjectGrid');
  const hint = document.getElementById('focusPickerHint');
  const addBtn = document.getElementById('focusAddTaskBtn');
  const selRow = document.getElementById('focusSelectedRow');
  const durRow = document.getElementById('focusDurationRow');
  const ring = document.getElementById('focusRing');
  const ctrlRow = document.querySelector('.focusControlRow');
  const todayText = document.getElementById('focusTodayText');
  if(prompt) prompt.style.display = hasSubject ? 'none' : '';
  if(grid) grid.style.display = hasSubject ? 'none' : '';
  if(hint) hint.style.display = hasSubject ? 'none' : '';
  if(addBtn) addBtn.style.display = hasSubject ? 'none' : '';
  if(selRow) selRow.style.display = hasSubject ? 'flex' : 'none';
  if(ring) ring.style.display = hasSubject ? '' : 'none';
  if(ctrlRow) ctrlRow.style.display = hasSubject ? '' : 'none';
  if(todayText) todayText.style.display = hasSubject ? '' : 'none';
  if(durRow) durRow.style.display = (hasSubject && focusSession.mode!=='stopwatch') ? 'flex' : 'none';
  const nameEl = document.getElementById('focusSelectedName');
  if(nameEl){
    const m = /^task(\d+)$/.exec(focusSession.subject||'');
    nameEl.textContent = (m && TASKS[parseInt(m[1],10)]) ? TASKS[parseInt(m[1],10)] : '';
  }
  const backBtn = document.getElementById('focusBackBtn');
  if(backBtn) backBtn.disabled = focusSession.running;
}
// Picker now lists the user's own daily targets (TASKS — same list edited
// via "Naya Task Add Karo" on the Today tab) instead of a fixed
// Math/Reasoning/English/GK set. Keyed by index ("task0","task1",...) so a
// task rename doesn't lose already-logged minutes for that slot.
function renderFocusSubjectGrid(){
  const grid = document.getElementById('focusSubjectGrid');
  if(!grid) return;
  if(!TASKS.length){
    grid.innerHTML = `<div class="guideNote">Pehle "Aaj Ka Target" mein tasks add karo, phir yahan se select karke study shuru karo.</div>`;
    return;
  }
  grid.innerHTML = TASKS.map((name,idx)=>{
    const key = 'task'+idx;
    return `<button type="button" class="focusSubjectBtn${focusSession.subject===key?' active':''}" data-subject="${key}"><span class="fsIcon">🎯</span>${escapeHtml(name)}</button>`;
  }).join('');
  grid.querySelectorAll('.focusSubjectBtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(focusSession.running) return;
      focusSession.subject = btn.getAttribute('data-subject');
      // Timed/Pomodoro: auto-fill the duration with this task's own set
      // time (TASK_DURATIONS_MIN) instead of leaving it at a generic
      // default — still fully editable via the input right after.
      if(focusSession.mode!=='stopwatch'){
        const m = /^task(\d+)$/.exec(focusSession.subject||'');
        const taskMin = m ? (TASK_DURATIONS_MIN[parseInt(m[1],10)]||0) : 0;
        focusSession.durationMin = taskMin>0 ? taskMin : focusSession.durationMin;
        const durInputEl = document.getElementById('focusDurationInput');
        if(durInputEl) durInputEl.value = focusSession.durationMin;
        resetFocusTimerValues();
      }
      updateFocusPickerVisibility();
      updateFocusPlayBtn();
      updateFocusDisplay();
    });
  });
}
// Quick-add a task right from the Study/Focus modal — same result as
// "➕ Naya Task Add Karo" in Customize Tasks (Today tab), just without
// leaving this screen. Newly added task is auto-selected afterwards so
// its just-set duration is immediately ready to start.
async function addTaskFromFocusModal(){
  const nameRaw = prompt('Naya task ka naam likho:', '');
  if(nameRaw===null) return;
  const name = nameRaw.trim() || ('Task '+(TASKS.length+1));
  const durRaw = prompt('Kitne minute ka target rakhein?', '30');
  if(durRaw===null) return;
  let dur = parseInt(durRaw,10);
  if(isNaN(dur) || dur<=0) dur = 30;
  const lastIdx = TASKS.length-1;
  const newStart = lastIdx>=0 ? Math.min(TASK_START_MIN[lastIdx] + (TASK_DURATIONS_MIN[lastIdx]||30), 1410) : 480;
  TASKS.push(name);
  TASK_START_MIN.push(newStart);
  TASK_DURATIONS_MIN.push(dur);
  TASK_VALUES = computeTaskValues(TASK_DURATIONS_MIN); // auto-arranges ₹5,000 across the new task list
  state.taskDefs = TASKS.map((nm,i)=>({ name:nm, start:TASK_START_MIN[i], duration:TASK_DURATIONS_MIN[i] }));
  delete state.taskNames;
  resizeAllDaysTasks();
  taskEditDraft = null; // keep Customize Tasks panel in sync next time it's opened
  await save();
  if(isSharedTaskMode() && isMeAdmin()){
    await saveSharedTaskDefs(state.taskDefs);
    lastAppliedSharedTasksJSON = JSON.stringify(state.taskDefs);
  }
  renderAll();
  renderFocusSubjectGrid();
  // Auto-select the just-added task with its own duration pre-filled.
  focusSession.subject = 'task'+(TASKS.length-1);
  if(focusSession.mode!=='stopwatch'){
    focusSession.durationMin = dur;
    const durInputEl = document.getElementById('focusDurationInput');
    if(durInputEl) durInputEl.value = dur;
  }
  resetFocusTimerValues();
  updateFocusPickerVisibility();
  updateFocusPlayBtn();
  updateFocusDisplay();
}
function focusTick(){
  if(!focusSession.running) return;
  const inBreak = focusSession.mode==='pomodoro' && focusSession.isBreak;
  if(focusSession.mode==='stopwatch'){
    focusSession.elapsedSec += 1;
    focusSession.pendingSec += 1;
  } else {
    focusSession.remainingSec -= 1;
    if(!inBreak) focusSession.pendingSec += 1;
    if(focusSession.remainingSec <= 0){
      flushFocusPending();
      if(focusSession.mode==='pomodoro'){
        focusSession.isBreak = !focusSession.isBreak;
        focusSession.remainingSec = focusSecondsForMode();
      } else {
        focusSession.running = false;
        if(focusSession.tickHandle){ clearInterval(focusSession.tickHandle); focusSession.tickHandle=null; }
        focusSession.remainingSec = focusSecondsForMode();
        updateFocusPlayBtn();
      }
    }
  }
  if(!inBreak && focusSession.pendingSec>0 && focusSession.pendingSec % 30 === 0) flushFocusPending();
  updateFocusDisplay();
}
function focusPlayPause(){
  if(!focusSession.subject) return;
  if(focusSession.running){
    focusSession.running = false;
    if(focusSession.tickHandle){ clearInterval(focusSession.tickHandle); focusSession.tickHandle=null; }
    flushFocusPending();
  } else {
    focusSession.running = true;
    focusSession.tickHandle = setInterval(focusTick, 1000);
  }
  updateFocusPlayBtn();
  updateFocusDisplay();
}
function focusReset(){
  if(focusSession.running){
    focusSession.running = false;
    if(focusSession.tickHandle){ clearInterval(focusSession.tickHandle); focusSession.tickHandle=null; }
  }
  flushFocusPending();
  resetFocusTimerValues();
  updateFocusPlayBtn();
  updateFocusDisplay();
}
function switchFocusMode(mode){
  if(focusSession.running){
    focusSession.running = false;
    if(focusSession.tickHandle){ clearInterval(focusSession.tickHandle); focusSession.tickHandle=null; }
    flushFocusPending();
  }
  focusSession.mode = mode;
  resetFocusTimerValues();
  document.querySelectorAll('.focusModeTab').forEach(t=> t.classList.toggle('active', t.getAttribute('data-mode')===mode));
  updateFocusPickerVisibility();
  updateFocusPlayBtn();
  updateFocusDisplay();
}
function openFocusModal(mode){
  focusSession.subject = null;
  switchFocusMode(mode || 'timed');
  renderFocusSubjectGrid();
  renderFocusTodayText();
  updateFocusPickerVisibility();
  updateFocusPlayBtn();
  updateFocusDisplay();
  const modal = document.getElementById('focusModal');
  if(modal) modal.style.display = 'flex';
}
function closeFocusModal(){
  if(focusSession.running){
    focusSession.running = false;
    if(focusSession.tickHandle){ clearInterval(focusSession.tickHandle); focusSession.tickHandle=null; }
    flushFocusPending();
  }
  const modal = document.getElementById('focusModal');
  if(modal) modal.style.display = 'none';
  renderFocusTodayText();
}
{
  document.querySelectorAll('#studyModeRow .studyModeBtn').forEach(btn=>{
    btn.addEventListener('click', ()=> openFocusModal(btn.getAttribute('data-mode')));
  });
  const quickStudyBtn = document.getElementById('quickStudyBtn');
  if(quickStudyBtn) quickStudyBtn.addEventListener('click', ()=> openFocusModal());
  document.querySelectorAll('#focusModeTabs .focusModeTab').forEach(tab=>{
    tab.addEventListener('click', ()=> switchFocusMode(tab.getAttribute('data-mode')));
  });
  const focusCloseBtn = document.getElementById('focusCloseBtn');
  if(focusCloseBtn) focusCloseBtn.addEventListener('click', closeFocusModal);
  const focusPlayBtn = document.getElementById('focusPlayBtn');
  if(focusPlayBtn) focusPlayBtn.addEventListener('click', focusPlayPause);
  const focusResetBtn = document.getElementById('focusResetBtn');
  if(focusResetBtn) focusResetBtn.addEventListener('click', focusReset);
  const focusAddTaskBtn = document.getElementById('focusAddTaskBtn');
  if(focusAddTaskBtn) focusAddTaskBtn.addEventListener('click', addTaskFromFocusModal);
  const focusBackBtn = document.getElementById('focusBackBtn');
  if(focusBackBtn) focusBackBtn.addEventListener('click', ()=>{
    if(focusSession.running) return;
    flushFocusPending();
    focusSession.subject = null;
    resetFocusTimerValues();
    renderFocusSubjectGrid();
    updateFocusPickerVisibility();
    updateFocusPlayBtn();
    updateFocusDisplay();
  });
  const focusDurationInput = document.getElementById('focusDurationInput');
  if(focusDurationInput) focusDurationInput.addEventListener('change', ()=>{
    let v = parseInt(focusDurationInput.value);
    if(isNaN(v) || v<1) v = 1;
    if(v>180) v = 180;
    focusDurationInput.value = v;
    focusSession.durationMin = v;
    if(!focusSession.running) resetFocusTimerValues();
    updateFocusDisplay();
  });
}

// ===== Per-task ⏱️ Pomodoro/Stopwatch timer (Today tab) =====
// Different from the generic subject Focus Timer above: this one lives
// inside a single task row, its target is fixed to that task's own
// duration (TASK_DURATIONS_MIN[idx]), and reaching the target auto-ticks
// that task's checkbox — no manual tap needed.
//
// "Runs in background": every running/paused segment is stored with a
// real wall-clock timestamp (lastTs), not just an interval counter. So
// even if the browser fully suspends our JS (screen locked, app switched,
// tab backgrounded — which is normal mobile behaviour and can't be
// prevented from a plain webpage), the moment this page is looked at
// again — a tick fires, the tab regains visibility, or the app is
// reopened — we recompute elapsed time from Date.now()-lastTs and catch
// up correctly, including auto-completing a target that was crossed
// while we were away.
const TT_STORE_KEY = 'cgl50-tasktimer-v1';
let taskTimers = {};           // { [taskIdx]: {mode,running,isBreak,workAccumSec,sessionWorkSec,breakElapsedSec,targetSec,lastTs} }
let taskTimerDay = null;       // which plan-day these belong to (stale day = discard)
let taskTimerEngineHandle = null;
let taskTimerLastSaveTs = 0;   // perf: throttles the localStorage write in taskTimerGlobalTick, see there
let taskTimerExpandedIdx = null; // UI-only: which task's box is open right now
let taskScoreExpandedIdx = null; // UI-only: which task's auto score/wrong-log box is open right now
function toggleTaskScoreBox(idx){
  taskScoreExpandedIdx = (taskScoreExpandedIdx === idx) ? null : idx;
  renderPanel();
}

function ttTargetSecFor(idx){ return (TASK_DURATIONS_MIN[idx]||0) * 60; }

function ensureTaskTimerDayFresh(){
  const tn = todayDayNum();
  if(taskTimerDay === null){
    // first touch this session — try to resume from storage instead of
    // starting blank (handles a full page reload mid-timer).
    loadTaskTimersFromStorage();
  }
  if(taskTimerDay !== tn){
    // a new day has started since these were saved — yesterday's partial
    // timer no longer applies to any task on today's fresh list.
    wipeTaskTimersForNewDay(tn);
  }
}
// Shared "day rolled over" reset: drops all timer state (running or not)
// and stops the background engine. Used both when the user re-opens the
// app on a new day (ensureTaskTimerDayFresh) and when midnight ticks past
// WHILE a timer is actively running in the background (handleMidnightRollover).
function wipeTaskTimersForNewDay(newDayNum){
  taskTimers = {};
  taskTimerDay = newDayNum;
  taskTimerExpandedIdx = null;
  saveTaskTimersToStorage();
}
// Midnight edge case: a task timer that's running when the clock crosses
// into a new calendar day no longer belongs to `taskTimerDay` — today's
// task list has effectively reset. Rather than silently keep crediting
// those seconds to the wrong day (or worse, ticking today's checkbox off
// a timer that never actually ran today), we stop the engine and clear
// the stale timer the moment the rollover is noticed — on the next
// engine tick if the app stayed open, or immediately on resume/visibility
// if the phone was locked/backgrounded overnight.
function handleMidnightRollover(){
  if(taskTimerEngineHandle){ clearInterval(taskTimerEngineHandle); taskTimerEngineHandle=null; }
  wipeTaskTimersForNewDay(todayDayNum());
  renderAll();
}
function getOrInitTaskTimer(idx){
  if(!taskTimers[idx]){
    taskTimers[idx] = {
      mode:'stopwatch', running:false, isBreak:false,
      workAccumSec:0, sessionWorkSec:0, breakElapsedSec:0,
      subjectPendingSec:0, // work seconds not yet flushed into Focus subject stats
      targetSec: ttTargetSecFor(idx), lastTs:null
    };
  }
  return taskTimers[idx];
}
function saveTaskTimersToStorage(){
  try{ localStorage.setItem(TT_STORE_KEY, JSON.stringify({day:taskTimerDay, timers:taskTimers})); }
  catch(e){}
}
function loadTaskTimersFromStorage(){
  try{
    const raw = localStorage.getItem(TT_STORE_KEY);
    if(!raw){ taskTimerDay = todayDayNum(); return; }
    const parsed = JSON.parse(raw);
    if(parsed && parsed.day === todayDayNum()){
      taskTimerDay = parsed.day;
      taskTimers = parsed.timers || {};
    } else {
      taskTimerDay = todayDayNum();
      taskTimers = {};
    }
  }catch(e){ taskTimerDay = todayDayNum(); taskTimers = {}; }
}
function findRunningTaskIdx(){
  return Object.keys(taskTimers).find(k=>taskTimers[k].running);
}
// Maps a task to one of the Focus Timer's subjects (Math/Reasoning/
// English/GK) purely by matching keywords in its CURRENT name — not a
// fixed index table — because tasks can be renamed/reordered/added via
// Customize Task Names, and a position-based map would silently go stale.
// Tasks with no confident single-subject match (e.g. "Full Mock", "Mock
// Analysis") return null and simply don't contribute — they're already
// tracked elsewhere (Mock tab) rather than needing double-counting here.
function ttSubjectFor(idx){
  const name = (TASKS[idx]||'').toLowerCase();
  if(/reasoning/.test(name)) return 'reasoning';
  if(/math|calculat/.test(name)) return 'math';
  if(/english|vocab|\brc\b|pqrs/.test(name)) return 'english';
  if(/\bgk\b|general knowledge/.test(name)) return 'gk';
  return null;
}
// Flushes a task timer's not-yet-credited work seconds into that subject's
// Focus stats bucket (same store the Home/Focus-modal "Today: Xm studied"
// numbers read from). Batched rather than called every single tick, to
// avoid hammering save()/Firebase once a second while a timer runs.
function ttFlushSubjectPending(idx){
  const t = taskTimers[idx];
  if(!t || !t.subjectPendingSec) return;
  const subj = ttSubjectFor(idx);
  const sec = t.subjectPendingSec;
  t.subjectPendingSec = 0;
  if(subj) addStudySeconds(subj, sec);
}
// Advances one task's timer by `sec` real seconds, cycling pomodoro
// work/break segments as needed, and completing the task the moment
// accumulated WORK time reaches its target — whether that happens live
// (foregrounded) or all at once while catching up after an absence.
function ttAdvance(idx, sec){
  const t = taskTimers[idx];
  if(!t || sec<=0) return;
  let remaining = sec;
  let guard = 0; // safety valve against any accidental infinite loop
  while(remaining > 0 && guard < 100000){
    guard++;
    if(t.mode === 'stopwatch'){
      const need = t.targetSec - t.workAccumSec;
      if(need <= 0){ completeTaskTimer(idx); return; }
      const add = Math.min(remaining, need);
      t.workAccumSec += add;
      t.subjectPendingSec = (t.subjectPendingSec||0) + add;
      remaining -= add;
      if(t.workAccumSec >= t.targetSec){ completeTaskTimer(idx); return; }
    } else {
      // pomodoro
      if(!t.isBreak){
        const remainInSession = (POMODORO_WORK_MIN*60) - t.sessionWorkSec;
        const remainToTarget = t.targetSec - t.workAccumSec;
        if(remainToTarget <= 0){ completeTaskTimer(idx); return; }
        const cap = Math.min(remainInSession, remainToTarget);
        const add = Math.min(remaining, cap);
        t.workAccumSec += add;
        t.sessionWorkSec += add;
        t.subjectPendingSec = (t.subjectPendingSec||0) + add;
        remaining -= add;
        if(t.workAccumSec >= t.targetSec){ completeTaskTimer(idx); return; }
        if(t.sessionWorkSec >= (POMODORO_WORK_MIN*60) - 0.001){
          t.isBreak = true; t.sessionWorkSec = 0; t.breakElapsedSec = 0;
        }
      } else {
        const remainInBreak = (POMODORO_BREAK_MIN*60) - t.breakElapsedSec;
        const add = Math.min(remaining, remainInBreak);
        t.breakElapsedSec += add;
        remaining -= add;
        if(t.breakElapsedSec >= (POMODORO_BREAK_MIN*60) - 0.001){
          t.isBreak = false; t.breakElapsedSec = 0;
        }
      }
    }
  }
}
// Short synthesized "ding-dong" beep via Web Audio — no external audio file
// needed, and works even if the device is on silent-vibrate-only for
// notifications since it's regular media audio, not a system alert.
function playTaskTimerDoneSound(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174.66, now+0.14);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now+0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now+0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now+0.45);
    osc.onended = ()=>{ try{ ctx.close(); }catch(e){} };
  }catch(e){}
}
function completeTaskTimer(idx){
  const wasRunning = taskTimers[idx] && taskTimers[idx].running;
  ttFlushSubjectPending(idx);
  delete taskTimers[idx];
  if(taskTimerEngineHandle && !findRunningTaskIdx()){ clearInterval(taskTimerEngineHandle); taskTimerEngineHandle=null; }
  saveTaskTimersToStorage();
  if(taskTimerExpandedIdx === idx) taskTimerExpandedIdx = null;
  if(selectedDay === todayDayNum()){
    const dayObj = getDay(selectedDay);
    if(!dayObj.tasks[idx]){
      const doneBefore = dayObj.tasks.filter(Boolean).length;
      dayObj.tasks[idx] = true;
      const doneAfter = dayObj.tasks.filter(Boolean).length;
      save();
      if(doneBefore < TASKS.length && doneAfter === TASKS.length) showReward(selectedDay);
    }
  }
  try{ if(navigator.vibrate) navigator.vibrate([120,60,120]); }catch(e){}
  playTaskTimerDoneSound();
  renderAll();
}
function clearTaskTimer(idx){
  ttFlushSubjectPending(idx);
  delete taskTimers[idx];
  if(taskTimerExpandedIdx === idx) taskTimerExpandedIdx = null;
  saveTaskTimersToStorage();
  if(taskTimerEngineHandle && !findRunningTaskIdx()){ clearInterval(taskTimerEngineHandle); taskTimerEngineHandle=null; }
}
function startTaskTimerEngine(){
  if(taskTimerEngineHandle) return;
  taskTimerLastSaveTs = 0;
  taskTimerEngineHandle = setInterval(taskTimerGlobalTick, 1000);
}
function taskTimerGlobalTick(){
  if(taskTimerDay !== null && todayDayNum() !== taskTimerDay){ handleMidnightRollover(); return; }
  const idx = findRunningTaskIdx();
  if(idx === undefined){ clearInterval(taskTimerEngineHandle); taskTimerEngineHandle=null; return; }
  const t = taskTimers[idx];
  const now = Date.now();
  const delta = Math.max(0, (now - (t.lastTs||now)) / 1000);
  t.lastTs = now;
  ttAdvance(idx, delta);
  if(taskTimers[idx]){
    // Perf: localStorage.setItem is synchronous and can cost real main-thread
    // time — doing it every single second for hours during a study session
    // adds up to a lot of jank for very little benefit. Persist at most every
    // 5s instead; the in-memory object (and the on-screen display below)
    // still update every tick, so nothing feels different, and
    // visibilitychange/pagehide (see bottom of file) force an immediate
    // flush before the app backgrounds/closes so at most ~5s of progress is
    // ever at risk.
    if(now - taskTimerLastSaveTs >= 5000){
      saveTaskTimersToStorage();
      taskTimerLastSaveTs = now;
    }
    updateTaskTimerLiveDisplay(parseInt(idx,10));
    updateHomeTimerBannerLiveDisplay(parseInt(idx,10));
    if(taskTimers[idx].subjectPendingSec >= 30) ttFlushSubjectPending(parseInt(idx,10));
  }
}
function playPauseTaskTimer(idx){
  ensureTaskTimerDayFresh();
  const t = getOrInitTaskTimer(idx);
  if(t.running){
    t.running = false;
    ttFlushSubjectPending(idx);
    saveTaskTimersToStorage();
  } else {
    const other = findRunningTaskIdx();
    if(other !== undefined && parseInt(other,10) !== idx){
      taskTimers[other].running = false;
      ttFlushSubjectPending(parseInt(other,10));
    }
    t.running = true;
    t.lastTs = Date.now();
    saveTaskTimersToStorage();
    startTaskTimerEngine();
  }
  renderPanel();
  renderHomeTimerBanner();
}
function resetTaskTimer(idx){
  clearTaskTimer(idx);
  taskTimerExpandedIdx = idx; // keep the box open, just zeroed out
  renderPanel();
  renderHomeTimerBanner();
}
function setTaskTimerMode(idx, mode){
  const t = getOrInitTaskTimer(idx);
  if(t.running) return; // pause first to switch modes, keeps things predictable
  t.mode = mode; t.isBreak=false; t.sessionWorkSec=0; t.breakElapsedSec=0; t.workAccumSec=0;
  saveTaskTimersToStorage();
  renderPanel();
}
function toggleTaskTimerBox(idx){
  ensureTaskTimerDayFresh();
  taskTimerExpandedIdx = (taskTimerExpandedIdx === idx) ? null : idx;
  renderPanel();
}
function formatMMSSApprox(totalSec){
  totalSec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(totalSec/60), s = totalSec%60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}
// Ring fill %: normally overall progress toward the task's target; during
// a pomodoro break it switches to break-segment progress instead, so the
// ring keeps moving rather than sitting frozen while workAccumSec is paused.
function ttRingPct(t){
  if(t.mode==='pomodoro' && t.isBreak){
    return Math.min(100, Math.max(0, (t.breakElapsedSec/(POMODORO_BREAK_MIN*60))*100));
  }
  return t.targetSec>0 ? Math.min(100, Math.max(0, (t.workAccumSec/t.targetSec)*100)) : 0;
}
function ttRingClass(t){
  if(t.mode==='pomodoro' && t.isBreak) return 'break';
  if(t.targetSec>0 && t.workAccumSec>=t.targetSec) return 'done';
  return '';
}
// Builds the inner HTML for one task's expanded timer box.
function taskTimerBoxHtml(idx){
  const t = getOrInitTaskTimer(idx);
  const targetMin = Math.round(t.targetSec/60);
  let display, sub, status = '';
  if(t.mode === 'stopwatch'){
    display = formatMMSSApprox(t.workAccumSec);
    sub = `Target: <b>${targetMin}m</b>`;
  } else {
    const segTotal = t.isBreak ? POMODORO_BREAK_MIN*60 : POMODORO_WORK_MIN*60;
    const segLeft = segTotal - (t.isBreak ? t.breakElapsedSec : t.sessionWorkSec);
    display = formatMMSSApprox(segLeft);
    sub = `${t.isBreak?'☕ Break':'📖 Work'} · Total <b>${formatMMSSApprox(t.workAccumSec)}</b> / ${targetMin}m`;
  }
  if(t.running) status = t.isBreak ? 'Break chal raha hai' : 'Chalu hai — background mein bhi chalega';
  else status = (t.workAccumSec>0) ? 'Paused' : 'Ready';
  const modeDisabled = t.running ? 'disabled' : '';
  return `
    <div class="taskTimerModeTabs">
      <button type="button" class="taskTimerModeTab${t.mode==='pomodoro'?' active':''}${modeDisabled?' disabled':''}" data-tt-mode="pomodoro" data-tt-idx="${idx}">🍅 Pomodoro</button>
      <button type="button" class="taskTimerModeTab${t.mode==='stopwatch'?' active':''}${modeDisabled?' disabled':''}" data-tt-mode="stopwatch" data-tt-idx="${idx}"><span class="icoClock" aria-hidden="true"></span> Stopwatch</button>
    </div>
    <div class="ttRing ${ttRingClass(t)}" id="ttRing-${idx}" style="--p:${ttRingPct(t)}">
      <div class="taskTimerDisplay" id="ttDisplay-${idx}">${display}</div>
    </div>
    <div class="taskTimerSub" id="ttSub-${idx}">${sub}</div>
    <div class="taskTimerStatus" id="ttStatus-${idx}">${status}</div>
    <div class="taskTimerControls">
      <button type="button" class="taskTimerResetBtn" data-tt-reset="${idx}" title="Reset">↺</button>
      <button type="button" class="taskTimerPlayBtn" data-tt-play="${idx}" title="${t.running?'Pause':'Start'}">${t.running?'⏸':'▶'}</button>
    </div>
  `;
}
// Cheap per-second DOM update for the currently-open box only — avoids
// rebuilding the whole panel (and losing notes/textarea focus) every tick.
function updateTaskTimerLiveDisplay(idx){
  if(taskTimerExpandedIdx !== idx) return;
  const t = taskTimers[idx];
  const dEl = document.getElementById('ttDisplay-'+idx);
  const sEl = document.getElementById('ttSub-'+idx);
  const stEl = document.getElementById('ttStatus-'+idx);
  const rEl = document.getElementById('ttRing-'+idx);
  if(!t || !dEl) return;
  const targetMin = Math.round(t.targetSec/60);
  if(t.mode === 'stopwatch'){
    dEl.textContent = formatMMSSApprox(t.workAccumSec);
    if(sEl) sEl.innerHTML = `Target: <b>${targetMin}m</b>`;
  } else {
    const segTotal = t.isBreak ? POMODORO_BREAK_MIN*60 : POMODORO_WORK_MIN*60;
    const segLeft = segTotal - (t.isBreak ? t.breakElapsedSec : t.sessionWorkSec);
    dEl.textContent = formatMMSSApprox(segLeft);
    if(sEl) sEl.innerHTML = `${t.isBreak?'☕ Break':'📖 Work'} · Total <b>${formatMMSSApprox(t.workAccumSec)}</b> / ${targetMin}m`;
  }
  if(stEl) stEl.textContent = t.running ? (t.isBreak?'Break chal raha hai':'Chalu hai — background mein bhi chalega') : 'Paused';
  if(rEl){
    rEl.style.setProperty('--p', ttRingPct(t));
    rEl.className = 'ttRing ' + ttRingClass(t);
  }
}
// On resume (page just loaded), catch up any timer that was left running,
// covering however long we were actually away — then keep going live.
function resumeTaskTimersOnLoad(){
  loadTaskTimersFromStorage();
  if(taskTimerDay !== null && todayDayNum() !== taskTimerDay){ wipeTaskTimersForNewDay(todayDayNum()); return; }
  const idx = findRunningTaskIdx();
  if(idx === undefined) return;
  const t = taskTimers[idx];
  const now = Date.now();
  const delta = Math.max(0, (now - (t.lastTs||now)) / 1000);
  t.lastTs = now;
  ttAdvance(parseInt(idx,10), delta);
  if(taskTimers[idx]){
    taskTimerExpandedIdx = parseInt(idx,10);
    saveTaskTimersToStorage();
    startTaskTimerEngine();
  }
}
// Whenever the tab/app comes back into view, snap the running timer's
// numbers to the correct real-time value right away instead of waiting
// for the next 1s tick (the interval itself may have been throttled while
// hidden, but the moment we're visible again this forces an instant catch-up).
// Also the first place a backgrounded/locked phone notices a midnight
// rollover happened while it was away — checked before touching any timer.
document.addEventListener('visibilitychange', ()=>{
  if(!document.hidden){
    if(taskTimerDay !== null && todayDayNum() !== taskTimerDay){ handleMidnightRollover(); return; }
    const idx = findRunningTaskIdx();
    if(idx !== undefined) taskTimerGlobalTick();
  }
});
{
  // Header-only 👑 Admin Control Panel — button itself stays display:none
  // (toggled by updateAdminPanelBtnVisibility) for anyone who isn't the
  // room's current Admin, so only the Admin ever sees or can open this.
  const adminPanelBtn = document.getElementById('adminPanelBtn');
  const adminPanelCloseBtn = document.getElementById('adminPanelCloseBtn');
  if(adminPanelBtn) adminPanelBtn.addEventListener('click', openAdminPanelModal);
  if(adminPanelCloseBtn) adminPanelCloseBtn.addEventListener('click', hideAdminPanelModal);
}
{
  const announceCloseBtn = document.getElementById('announceCloseBtn');
  if(announceCloseBtn) announceCloseBtn.addEventListener('click', ()=>{
    dismissCurrentAnnouncement();
    renderAnnouncementCard();
  });
}

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('installBtn');
  if(btn) btn.style.display = 'inline-block';
  const onbBtn = document.getElementById('onbInstallBtn');
  if(onbBtn) onbBtn.style.display = 'inline-block';
  const ipBtn = document.getElementById('installPromptActionBtn');
  if(ipBtn) ipBtn.style.display = 'inline-block';
  const homeBtn = document.getElementById('homeInstallBtn');
  if(homeBtn) homeBtn.style.display = 'inline-block';
  // Chrome/Android decides on its own when this event fires (based on the
  // visit meeting its "installable" checks) — but once it does, we fire the
  // native install dialog immediately ourselves, once per device, instead
  // of waiting for someone to notice and tap an "Install" button. The final
  // Install/Cancel tap inside that native dialog is the one step no website
  // can automate away — that confirmation is a browser security requirement.
  try{
    if(localStorage.getItem('cgl50-install-auto-prompted') !== '1'){
      localStorage.setItem('cgl50-install-auto-prompted', '1');
      e.prompt();
    }
  }catch(err){ console.error('auto install prompt failed', err); }
});

// ===== Universal "Install as App" nudge =====
// Chrome/Android gives us a real native install prompt (deferredInstallPrompt);
// iOS Safari has no such API — Apple only allows the manual Share -> "Add to
// Home Screen" path; other desktop browsers just get generic instructions.
// Shown automatically every time someone opens the site NOT already running
// in standalone/installed mode — i.e. keeps gently reminding until they
// actually install it, or explicitly say "don't show again".
function isRunningStandalone(){
  try{
    return window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }catch(e){ return false; }
}
function installPromptDismissedForever(){
  try{ return localStorage.getItem('cgl50-install-hint-dismissed') === '1'; }catch(e){ return false; }
}
function setInstallPromptDismissedForever(){
  try{ localStorage.setItem('cgl50-install-hint-dismissed', '1'); }catch(e){}
}
function showInstallPromptModal(){
  const modal = document.getElementById('installPromptModal');
  if(!modal) return;
  modal.style.display = 'flex';
}
function hideInstallPromptModal(){
  const modal = document.getElementById('installPromptModal');
  if(modal) modal.style.display = 'none';
}
function maybeShowInstallPrompt(){
  try{
    if(isRunningStandalone()) return;
    if(installPromptDismissedForever()) return;
    setTimeout(showInstallPromptModal, 700);
  }catch(e){}
}
// Shared handler: every "Add to Home Screen" button (popup, Home tab, More tab)
// calls this. On Chrome/Android (https, real beforeinstallprompt support) it
// fires the native install dialog directly. Elsewhere (iOS Safari, desktop
// browsers without the API) it falls back to plain manual instructions.
async function runInstallAction(){
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  } else {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if(isIOS){
      alert('iPhone: Share button 🔗 → "Add to Home Screen".');
    } else if(isMobile){
      alert('Android Chrome: Menu (⋮) → "Add to Home Screen" / "Install App".');
    } else {
      alert('PC Chrome/Edge: address bar ke right side mein ⊕ ya install icon dabao, ya Menu (⋮) → "Cast, save, and share" → "Install page as app".');
    }
  }
}
{
  const actionBtn = document.getElementById('installPromptActionBtn');
  if(actionBtn) actionBtn.addEventListener('click', async ()=>{
    await runInstallAction();
    hideInstallPromptModal();
  });
  // Cross/close button — user explicitly dismissed it, so stop nagging them
  // with this popup on every future visit.
  const closeBtn = document.getElementById('installPromptCloseBtn');
  if(closeBtn) closeBtn.addEventListener('click', ()=>{
    setInstallPromptDismissedForever();
    hideInstallPromptModal();
  });
}
document.getElementById('installBtn').addEventListener('click', runInstallAction);
// Always show the button as a manual fallback where the auto-prompt (Chrome-only) isn't available.
document.getElementById('installBtn').style.display = 'inline-block';

const homeInstallBtn = document.getElementById('homeInstallBtn');
if(homeInstallBtn) homeInstallBtn.addEventListener('click', runInstallAction);

// Keeps the clock-based widgets (Right Now card + Smart Time Guide) fresh
// even if the person just leaves the app open without tapping anything.
function startLiveClockTicker(){
  setInterval(()=>{
    // Full scorecard refresh (stats, wallet, streak, last-4-days heatmap,
    // progress ring, etc.) so it keeps updating on its own all day long,
    // not just when the person taps/ticks something. Also picks up the day
    // rolling over at midnight automatically while the app stays open.
    safeRun(renderAll, 'renderAll(tick)');
    safeRun(renderRightNowCard, 'renderRightNowCard(tick)');
    safeRun(renderTimeGuide, 'renderTimeGuide(tick)');
    safeRun(checkTargetReminder, 'checkTargetReminder(tick)');
    safeRun(checkStrictManagerPopup, 'checkStrictManagerPopup(tick)');
    // Belt-and-suspenders 24hr refresh for "Today" rank/scoreboard — see
    // checkDayRolloverAndRefresh() above. renderAll() above already covers
    // most of this, but this also force-refreshes the Compete panel itself.
    safeRun(checkDayRolloverAndRefresh, 'checkDayRolloverAndRefresh(tick)');
  }, 60000);
}
// Mobile browsers/PWAs freeze all JS timers (including the 60s ticker and
// the 25s room-sync) while the screen is locked or the app is backgrounded
// — so if someone leaves the app open overnight without force-closing it,
// nothing actually ticks past midnight until they come back. The moment
// the app becomes visible/focused again, immediately check whether the
// calendar date has moved on and force a fresh render if so — this is what
// guarantees "Today Rank" is correct within moments of reopening, not
// whenever the person happens to tap into the Compete tab.
document.addEventListener('visibilitychange', ()=>{
  if(!document.hidden) safeRun(checkDayRolloverAndRefresh, 'checkDayRolloverAndRefresh(visible)');
});
window.addEventListener('focus', ()=>{
  safeRun(checkDayRolloverAndRefresh, 'checkDayRolloverAndRefresh(focus)');
});
window.addEventListener('pageshow', ()=>{
  safeRun(checkDayRolloverAndRefresh, 'checkDayRolloverAndRefresh(pageshow)');
});

// Debounced fields (notes, mistakes, mock/sectional scores) wait 400-600ms
// before actually saving — fine while the app stays open, but risky if the
// person closes the tab or switches apps right after typing. Flushing a
// save the moment the page goes to background/closes means that last
// keystroke never gets silently dropped.
document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ save(); if(findRunningTaskIdx()!==undefined) saveTaskTimersToStorage(); } });
window.addEventListener('pagehide', ()=>{ save(); if(findRunningTaskIdx()!==undefined) saveTaskTimersToStorage(); });

(async function init(){
  myName = await getOrCreateMyNameAsync();
  maybeShowInstallPrompt();
  // Everyone is always in the single fixed group (see getRoomCode()) —
  // no URL-based room joining needed anymore.
  viewingName = myName;
  await migrateOldDataIfNeeded(myName);
  await registerPlayer(myName);
  state = await loadPlayerState(myName);
  await ensureQuizDetailStoreForCurrentViewer();
  applyLoadedExtras();
  snapshotLoadedStateKeys();
  stateReady = true;
  if(getRoomCode()){
    await refreshRoomMeta();
    await applySharedTaskModeIfNeeded();
  }
  selectedDay = todayDayNum();
  lastRenderedDayNum = todayDayNum(); // baseline for the 24hr Today-Rank rollover check
  await loadTaskPhotoKeySet(); // so 📷 badges are correct on the very first render
  resumeTaskTimersOnLoad();
  setupHomeScreenIcon();
  initSwipeTabs();
  updateNotifBtnLabel();
  renderExamLine();
  renderTaskEditForm();
  renderTaskModeSelector();
  initTabs();
  initCalcNav();
  initWeakReviseSubtabs();
  renderAll();
  renderProfileBar();
  applyReadOnlyUI();
  renderRoomPanel();
  if(getRoomCode()) await addToRoomRegistry(myName);
  await renderCompetePanel();
  startRoomAutoSync();
  startPresenceHeartbeat();
  startPendingSyncWatcher();
  startLiveClockTicker();
  updateTargetReminderBtnLabel();
  checkTargetReminderOnAppOpen();
  checkStrictManagerPopupOnAppOpen();
  maybeShowHelpModalOnce();
  maybeShowDailyCountdownPopup();
})();

// Real, static service worker file (for PWABuilder / Android packaging).
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
