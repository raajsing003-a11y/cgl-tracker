/* ===== Mains Target (50-day Mains plan) — Quiz tab page + Today panel + Score sync =====
   Single source: state.mainsPlan[day]. app.js ke globals (state, save, todayDayNum ...) use hote hain. */
(function(){
'use strict';
var PLAN = [{"d":1,"kind":"mock","phase":"P1 Build","maths":{"t":"Permutation & Combination","r":"Q 1–100","m":160,"q":100},"formula":"Geometry Half","gk":null,"weekly":"Phrasal Verbs: 30 (Round 1)","grammar":"Noun","ct":false},{"d":2,"kind":"sect","phase":"P1 Build","maths":{"t":"Probability","r":"Q 1–100","m":160,"q":100},"formula":"Geometry Half","gk":null,"weekly":"Phrasal Verbs: 30 (Round 1)","grammar":"Pronoun","ct":false},{"d":3,"kind":"mock","phase":"P1 Build","maths":{"t":"Statistics","r":"Q 1–100","m":160,"q":100},"formula":"Mensuration 2D","gk":null,"weekly":"Phrasal Verbs: 30 (Round 1)","grammar":"Adjective","ct":false},{"d":4,"kind":"sect","phase":"P1 Build","maths":{"t":"Number System","r":"Q 1–80","m":128,"q":80},"formula":"Mensuration 3D","gk":{"round":1,"subject":"History","detail":"Pages 1-8 · IN 7 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 1)","grammar":"Verb (Day 1/2)","ct":false},{"d":5,"kind":"mock","phase":"P1 Build","maths":{"t":"Number System","r":"Q 81–160","m":128,"q":80},"formula":"Algebra Half","gk":{"round":1,"subject":"History","detail":"Pages 9-16 · IN 6 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 1)","grammar":"Verb (Day 2/2)","ct":false},{"d":6,"kind":"sect","phase":"P1 Build","maths":{"t":"Number System","r":"Q 161–230","m":112,"q":70},"formula":"Algebra Half","gk":{"round":1,"subject":"History","detail":"Pages 17-23 · IN 5 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 1)","grammar":"Tense (Day 1/2)","ct":false},{"d":7,"kind":"mock","phase":"P1 Build","maths":{"t":"Number System","r":"Q 231–300","m":112,"q":70},"formula":"Trigonometry Half","gk":{"round":1,"subject":"History","detail":"Pages 24-30 · IN 4 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 1)","grammar":"Tense (Day 2/2)","ct":false},{"d":8,"kind":"sect","phase":"P1 Build","maths":{"t":"LCM & HCF","r":"Q 1–50","m":80,"q":50},"formula":"Trigonometry Half","gk":{"round":1,"subject":"History","detail":"Pages 31-37 · IN 3 DAYS"},"weekly":"Fixed Prepositions: 50 (Round 1)","grammar":"Subject-Verb Agreement (Day 1/2)","ct":false},{"d":9,"kind":"mock","phase":"P1 Build","maths":{"t":"Simplification + Surds & Indices (Sequence & Series ke saath)","r":"Q 1–80","m":128,"q":80},"formula":"Number System","gk":{"round":1,"subject":"History","detail":"Pages 38-44 · IN 2 DAYS"},"weekly":"Fixed Prepositions: 50 (Round 1)","grammar":"Subject-Verb Agreement (Day 2/2)","ct":false},{"d":10,"kind":"sect","phase":"P1 Build","maths":{"t":"Simplification + Surds & Indices (Sequence & Series ke saath)","r":"Q 81–150","m":112,"q":70},"formula":"Arithmetic All Formula","gk":{"round":1,"subject":"History","detail":"Pages 45-52 · ✓ COMPLETE"},"weekly":"Fixed Prepositions: 50 (Round 1)","grammar":"Adverb","ct":false},{"d":11,"kind":"mock","phase":"P1 Build","maths":{"t":"Algebra (Polynomials ke saath)","r":"Q 1–70","m":112,"q":70},"formula":"Geometry Half","gk":{"round":1,"subject":"Geography","detail":"Pages 1-12 · IN 6 DAYS"},"weekly":"Fixed Prepositions: 50 (Round 1)","grammar":"Preposition","ct":false},{"d":12,"kind":"sect","phase":"P1 Build","maths":{"t":"Algebra (Polynomials ke saath)","r":"Q 71–140","m":112,"q":70},"formula":"Geometry Half","gk":{"round":1,"subject":"Geography","detail":"Pages 13-24 · IN 5 DAYS"},"weekly":"Fixed Prepositions: 50 (Round 1)","grammar":"Conjunction","ct":false},{"d":13,"kind":"mock","phase":"P1 Build","maths":{"t":"Algebra (Polynomials ke saath)","r":"Q 141–210","m":112,"q":70},"formula":"Mensuration 2D","gk":{"round":1,"subject":"Geography","detail":"Pages 25-36 · IN 4 DAYS"},"weekly":"Fixed Prepositions: 50 (Round 1)","grammar":"Article","ct":false},{"d":14,"kind":"sect","phase":"P1 Build","maths":{"t":"Algebra (Polynomials ke saath)","r":"Q 211–280","m":112,"q":70},"formula":"Mensuration 3D","gk":{"round":1,"subject":"Geography","detail":"Pages 37-48 · IN 3 DAYS"},"weekly":"Fixed Prepositions: 50 (Round 1)","grammar":"Conditional Sentences (Day 1/2)","ct":false},{"d":15,"kind":"mock","phase":"P1 Build","maths":{"t":"Algebra (Polynomials ke saath)","r":"Q 281–350","m":112,"q":70},"formula":"Algebra Half","gk":{"round":1,"subject":"Geography","detail":"Pages 49-60 · IN 2 DAYS"},"weekly":"Homonyms: 30 (Round 1)","grammar":"Conditional Sentences (Day 2/2)","ct":false},{"d":16,"kind":"sect","phase":"P1 Build","maths":{"t":"Mensuration (2D + 3D)","r":"Q 1–80","m":128,"q":80},"formula":"Algebra Half","gk":{"round":1,"subject":"Geography","detail":"Pages 61-72 · ✓ COMPLETE"},"weekly":"Homonyms: 30 (Round 1)","grammar":"Voice (Active/Passive)","ct":false},{"d":17,"kind":"mock","phase":"P2 Grind","maths":{"t":"Mensuration (2D + 3D)","r":"Q 81–150","m":112,"q":70},"formula":"Trigonometry Half","gk":{"round":1,"subject":"Economics","detail":"Pages 1-14 · IN 3 DAYS"},"weekly":"Homonyms: 30 (Round 1)","grammar":"Narration (Direct/Indirect)","ct":false},{"d":18,"kind":"sect","phase":"P2 Grind","maths":{"t":"Mensuration (2D + 3D)","r":"Q 151–220","m":112,"q":70},"formula":"Trigonometry Half","gk":{"round":1,"subject":"Economics","detail":"Pages 15-28 · IN 2 DAYS"},"weekly":"Homonyms: 30 (Round 1)","grammar":"Phrase","ct":false},{"d":19,"kind":"mock","phase":"P2 Grind","maths":{"t":"Mensuration (2D + 3D)","r":"Q 221–290","m":112,"q":70},"formula":"Number System","gk":{"round":1,"subject":"Economics","detail":"Pages 29-42 · ✓ COMPLETE"},"weekly":"Homonyms: 30 (Round 1)","grammar":"Sentence Types","ct":false},{"d":20,"kind":"sect","phase":"P2 Grind","maths":{"t":"Mensuration (2D + 3D)","r":"Q 291–360","m":112,"q":70},"formula":"Arithmetic All Formula","gk":{"round":1,"subject":"Polity","detail":"Pages 1-7 · IN 3 DAYS"},"weekly":"Homonyms: 30 (Round 1)","grammar":"English New Pattern Topics","ct":false},{"d":21,"kind":"mock","phase":"P2 Grind","maths":{"t":"Mensuration (2D + 3D)","r":"Q 361–430","m":112,"q":70},"formula":"Geometry Half","gk":{"round":1,"subject":"Polity","detail":"Pages 8-14 · IN 2 DAYS"},"weekly":"Homonyms: 30 (Round 1)","grammar":"Revision Noun + Pronoun","ct":true},{"d":22,"kind":"sect","phase":"P2 Grind","maths":{"t":"Mensuration (2D + 3D)","r":"Q 431–500","m":112,"q":70},"formula":"Geometry Half","gk":{"round":1,"subject":"Polity","detail":"Pages 15-20 · ✓ COMPLETE"},"weekly":"Phrasal Verbs: 30 (Round 2)","grammar":"Revision Adjective","ct":true},{"d":23,"kind":"mock","phase":"P2 Grind","maths":{"t":"Trigonometry (Height & Distance ke saath)","r":"Q 1–80","m":128,"q":80},"formula":"Mensuration 2D","gk":{"round":1,"subject":"Science","detail":"Pages 1-8 · IN 4 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 2)","grammar":"Revision Verb (Day 1/2 + Day 2/2)","ct":true},{"d":24,"kind":"sect","phase":"P2 Grind","maths":{"t":"Trigonometry (Height & Distance ke saath)","r":"Q 81–160","m":128,"q":80},"formula":"Mensuration 3D","gk":{"round":1,"subject":"Science","detail":"Pages 9-16 · IN 3 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 2)","grammar":"Revision Tense (Day 1/2 + Day 2/2)","ct":true},{"d":25,"kind":"mock","phase":"P2 Grind","maths":{"t":"Trigonometry (Height & Distance ke saath)","r":"Q 161–230","m":112,"q":70},"formula":"Algebra Half","gk":{"round":1,"subject":"Science","detail":"Pages 17-24 · IN 2 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 2)","grammar":"Revision Subject-Verb Agreement (Day 1/2 + Day 2/2)","ct":true},{"d":26,"kind":"sect","phase":"P2 Grind","maths":{"t":"Trigonometry (Height & Distance ke saath)","r":"Q 231–300","m":112,"q":70},"formula":"Algebra Half","gk":{"round":1,"subject":"Science","detail":"Pages 25-32 · ✓ COMPLETE"},"weekly":"Phrasal Verbs: 30 (Round 2)","grammar":"Revision Adverb","ct":true},{"d":27,"kind":"mock","phase":"P2 Grind","maths":{"t":"Geometry (Polygon ke saath)","r":"Q 1–80","m":128,"q":80},"formula":"Trigonometry Half","gk":{"round":2,"subject":"History","detail":"Pages 1-13 · IN 4 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 2)","grammar":"Revision Preposition","ct":true},{"d":28,"kind":"sect","phase":"P2 Grind","maths":{"t":"Geometry (Polygon ke saath)","r":"Q 81–150","m":112,"q":70},"formula":"Trigonometry Half","gk":{"round":2,"subject":"History","detail":"Pages 14-26 · IN 3 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 2)","grammar":"Revision Conjunction","ct":true},{"d":29,"kind":"mock","phase":"P2 Grind","maths":{"t":"Geometry (Polygon ke saath)","r":"Q 151–220","m":112,"q":70},"formula":"Number System","gk":{"round":2,"subject":"History","detail":"Pages 27-39 · IN 2 DAYS"},"weekly":"Fixed Prepositions: 50 (Round 2)","grammar":"Revision Article","ct":true},{"d":30,"kind":"sect","phase":"P2 Grind","maths":{"t":"Geometry (Polygon ke saath)","r":"Q 221–290","m":112,"q":70},"formula":"Arithmetic All Formula","gk":{"round":2,"subject":"History","detail":"Pages 40-52 · ✓ COMPLETE"},"weekly":"Fixed Prepositions: 50 (Round 2)","grammar":"Revision Conditional Sentences (Day 1/2 + Day 2/2)","ct":true},{"d":31,"kind":"mock","phase":"P2 Grind","maths":{"t":"Geometry (Polygon ke saath)","r":"Q 291–360","m":112,"q":70},"formula":"Geometry Half","gk":{"round":2,"subject":"Geography","detail":"Pages 1-14 · IN 5 DAYS"},"weekly":"Fixed Prepositions: 50 (Round 2)","grammar":"Revision Voice (Active/Passive)","ct":true},{"d":32,"kind":"sect","phase":"P2 Grind","maths":{"t":"Geometry (Polygon ke saath)","r":"Q 361–430","m":112,"q":70},"formula":"Geometry Half","gk":{"round":2,"subject":"Geography","detail":"Pages 15-28 · IN 4 DAYS"},"weekly":"Fixed Prepositions: 50 (Round 2)","grammar":"Revision Narration (Direct/Indirect)","ct":true},{"d":33,"kind":"mock","phase":"P2 Grind","maths":{"t":"Geometry (Polygon ke saath)","r":"Q 431–500","m":112,"q":70},"formula":"Mensuration 2D","gk":{"round":2,"subject":"Geography","detail":"Pages 29-43 · IN 3 DAYS"},"weekly":"Fixed Prepositions: 50 (Round 2)","grammar":"Revision Phrase","ct":true},{"d":34,"kind":"sect","phase":"P2 Grind","maths":{"t":"Co-ordinate Geometry","r":"Q 1–100","m":160,"q":100},"formula":"Mensuration 3D","gk":null,"weekly":"Fixed Prepositions: 50 (Round 2)","grammar":"Revision Sentence Types","ct":true},{"d":35,"kind":"mock","phase":"P3 Finish","maths":{"t":"Percentage","r":"Q 1–100","m":160,"q":100},"formula":"Algebra Half","gk":null,"weekly":"Fixed Prepositions: 50 (Round 2)","grammar":"Revision English New Pattern Topics","ct":true},{"d":36,"kind":"sect","phase":"P3 Finish","maths":{"t":"Discount","r":"Q 1–100","m":160,"q":100},"formula":"Algebra Half","gk":null,"weekly":"Homonyms: 30 (Round 2)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":37,"kind":"mock","phase":"P3 Finish","maths":{"t":"Profit & Loss","r":"Q 1–100","m":160,"q":100},"formula":"Trigonometry Half","gk":null,"weekly":"Homonyms: 30 (Round 2)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":38,"kind":"sect","phase":"P3 Finish","maths":{"t":"Simple Interest + Compound Interest SI","r":"Q 1–50 + CI Q 1–50 100 Q","m":160,"q":100},"formula":"Trigonometry Half","gk":null,"weekly":"Homonyms: 30 (Round 2)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":39,"kind":"mock","phase":"P3 Finish","maths":{"t":"SI & CI Installment + Age + Partnership Installment","r":"Q 1–50 + Age + Partnership Q 1–50 100 Q","m":160,"q":100},"formula":"Number System","gk":null,"weekly":"Homonyms: 30 (Round 2)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":40,"kind":"sect","phase":"P3 Finish","maths":{"t":"Ratio & Proportion","r":"Q 1–50","m":80,"q":50},"formula":"Arithmetic All Formula","gk":{"round":2,"subject":"Geography","detail":"Pages 44-57 · IN 2 DAYS"},"weekly":"Homonyms: 30 (Round 2)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":41,"kind":"mock","phase":"P3 Finish","maths":{"t":"Ratio & Proportion","r":"Q 51–100","m":80,"q":50},"formula":"Geometry Half","gk":{"round":2,"subject":"Geography","detail":"Pages 58-72 · ✓ COMPLETE"},"weekly":"Homonyms: 30 (Round 2)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":42,"kind":"sect","phase":"P3 Finish","maths":{"t":"Time & Work (Work & Wages + Pipe & Cistern ke saath)","r":"Q 1–50","m":80,"q":50},"formula":"Geometry Half","gk":{"round":2,"subject":"Economics","detail":"Pages 1-14 · IN 3 DAYS"},"weekly":"Homonyms: 30 (Round 2)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":43,"kind":"mock","phase":"P3 Finish","maths":{"t":"Time & Work (Work & Wages + Pipe & Cistern ke saath)","r":"Q 51–100","m":80,"q":50},"formula":"Mensuration 2D","gk":{"round":2,"subject":"Economics","detail":"Pages 15-28 · IN 2 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 3)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":44,"kind":"sect","phase":"P3 Finish","maths":{"t":"Average","r":"Q 1–50","m":80,"q":50},"formula":"Mensuration 3D","gk":{"round":2,"subject":"Economics","detail":"Pages 29-42 · ✓ COMPLETE"},"weekly":"Phrasal Verbs: 30 (Round 3)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":45,"kind":"mock","phase":"P3 Finish","maths":{"t":"Average","r":"Q 51–100","m":80,"q":50},"formula":"Algebra Half","gk":{"round":2,"subject":"Polity","detail":"Pages 1-7 · IN 3 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 3)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":46,"kind":"sect","phase":"P3 Finish","maths":{"t":"Mixture & Alligation","r":"Q 1–50","m":80,"q":50},"formula":"Algebra Half","gk":{"round":2,"subject":"Polity","detail":"Pages 8-14 · IN 2 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 3)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":47,"kind":"mock","phase":"P3 Finish","maths":{"t":"Mixture & Alligation","r":"Q 51–100","m":80,"q":50},"formula":"Trigonometry Half","gk":{"round":2,"subject":"Polity","detail":"Pages 15-20 · ✓ COMPLETE"},"weekly":"Phrasal Verbs: 30 (Round 3)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":48,"kind":"sect","phase":"P3 Finish","maths":{"t":"Time, Speed & Distance (Boat & Stream + Race ke saath)","r":"Q 1–70","m":112,"q":70},"formula":"Trigonometry Half","gk":{"round":2,"subject":"Science","detail":"Pages 1-11 · IN 3 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 3)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":49,"kind":"mock","phase":"P3 Finish","maths":{"t":"Time, Speed & Distance (Boat & Stream + Race ke saath)","r":"Q 71–140","m":112,"q":70},"formula":"Number System","gk":{"round":2,"subject":"Science","detail":"Pages 12-21 · IN 2 DAYS"},"weekly":"Phrasal Verbs: 30 (Round 3)","grammar":"Practice Mixed set · 30–40 Q","ct":true},{"d":50,"kind":"sect","phase":"P3 Finish","maths":{"t":"Time, Speed & Distance (Boat & Stream + Race ke saath)","r":"Q 141–200","m":96,"q":60},"formula":"Arithmetic All Formula","gk":{"round":2,"subject":"Science","detail":"Pages 22-32 · ✓ COMPLETE"},"weekly":"Fixed Prepositions: 50 (Round 3)","grammar":"Practice Mixed set · 30–40 Q","ct":true}];
var PHASE_COL = {'P1':'#38bdf8','P2':'#a78bfa','P3':'#fb923c','P4':'#f472b6','P5':'#34d399'};
function phCol(p){ var k=String(p||'').slice(0,2); return PHASE_COL[k]||'#fbbf24'; }
var selDay = null;

function ready(){ return typeof state!=='undefined' && typeof save==='function' && typeof showCalcPage==='function' && typeof todayDayNum==='function' && document.getElementById('calcPage-menu') && document.getElementById('panel'); }
function esc(s){ return (typeof escapeHtml==='function') ? escapeHtml(String(s==null?'':s)) : String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function num(v){ var n=parseFloat(v); return isNaN(n)?'':n; }

function store(){ if(!state.mainsPlan || typeof state.mainsPlan!=='object' || Array.isArray(state.mainsPlan)) state.mainsPlan={}; return state.mainsPlan; }
function rec(d){ var s=store(); if(!s[d]) s[d]={}; var r=s[d];
  if(!r.maths) r.maths={}; if(!r.mock) r.mock={}; if(!r.sect) r.sect={m1:{},m2:{},r1:{},r2:{}};
  ['m1','m2','r1','r2'].forEach(function(k){ if(!r.sect[k]) r.sect[k]={}; });
  return r; }
function planOf(d){ return PLAN[d-1]; }

/* ---- items applicable for a day ---- */
function items(p){
  var mk=p.kind==='mock';
  var a=[{k:'maths',ic:'📐',t:'Maths: '+p.maths.t,s:p.maths.r+' · '+p.maths.m+' min · target '+p.maths.q+' Q'}];
  a.push(mk ? {k:'mockT',ic:'🏆',t:'Full Mock attempt',s:'1 full mock + score neeche bharo'}
            : {k:'mockT',ic:'🎯',t:'Sectionals: 2 Maths + 2 Reasoning',s:'30 Q each · 90 marks · score neeche bharo'});
  a.push({k:'analysis',ic:'🔍',t:mk?'Mock Analysis':'Sectional Analysis',s:'Galti → Error Notebook'});
  a.push({k:'formula',ic:'📝',t:'Formula: '+p.formula,s:''});
  a.push({k:'calc',ic:'🧮',t:'Calculation',s:'Daily speed test · Lite ~8-10 min'});
  if(p.gk) a.push({k:'gk',ic:'🌍',t:'GK R'+p.gk.round+': '+p.gk.subject,s:p.gk.detail});
  a.push({k:'vocab',ic:'📚',t:'Vocab',s:'50 new + 50 old revise'});
  a.push({k:'idioms',ic:'🗣️',t:'Idioms',s:'50'});
  a.push({k:'spell',ic:'🔠',t:'Spelling',s:'50'});
  a.push({k:'edit',ic:'📰',t:'2 Editorial',s:''});
  a.push({k:'weekly',ic:'🔤',t:p.weekly,s:'English weekly'});
  a.push({k:'grammar',ic:'✍️',t:'Grammar: '+p.grammar,s:''});
  a.push({k:'rcz',ic:'📖',t:'RC · Cloze · PQRS — PYQ Reading Set '+pyqNo(p.d),s:'Cloze + RC + PQRS ek hi set mein · 98 sets mein se'});
  a.push({k:'errnb',ic:'📓',t:'Error Notebook',s:'2 pages'});
  if(p.ct){ a.push({k:'comp',ic:'💻',t:'Computer',s:'20 min'}); a.push({k:'typing',ic:'⌨️',t:'Typing',s:'20 min'}); }
  return a;
}
/* daily tick keys (maths alag: r.maths.done) — member view / progress copies ke liye */
function pyqNo(d){ return String(d).padStart(3,'0'); }
var TICK_KEYS=['mockT','analysis','formula','calc','gk','vocab','idioms','spell','edit','weekly','grammar','rcz','errnb','comp','typing'];
function tickView(r,m){ var o={maths:m||r.maths||{}}; TICK_KEYS.forEach(function(k){ o[k]=r[k]; }); return o; }
function isTicked(r,k){ return k==='maths' ? !!r.maths.done : !!r[k]; }
/* ---- v11: paise target ke weight (time/effort) ke hisaab se baantte hain; din ka total hamesha exact DAILY ---- */
function itemW(p,k){ return k==='maths' ? Math.max(20,+p.maths.m||0) : k==='mockT' ? (p.kind==='mock'?120:100) : k==='analysis' ? 40 : k==='formula' ? 20 : k==='calc' ? 20 : k==='gk' ? 45 : k==='vocab' ? 30 : k==='idioms' ? 15 : k==='spell' ? 15 : k==='edit' ? 20 : k==='weekly' ? 20 : k==='grammar' ? 30 : k==='rcz' ? 30 : k==='errnb' ? 15 : 20; }
function amtMap(d){
  var p=planOf(d), it=items(p), ws=it.map(function(x){ return itemW(p,x.k); }), tot=ws.reduce(function(a,b){return a+b;},0)||1, D=(typeof DAILY_TARGET!=='undefined')?DAILY_TARGET:5000;
  var raw=ws.map(function(w){ return w/tot*D; }), v=raw.map(Math.floor), rem=Math.round(D-v.reduce(function(a,b){return a+b;},0));
  raw.map(function(x,i){ return {i:i,f:x-Math.floor(x)}; }).sort(function(a,b){ return b.f-a.f; }).slice(0,Math.max(0,rem)).forEach(function(o){ v[o.i]++; });
  var m={}; it.forEach(function(x,i){ m[x.k]=v[i]; }); return m; }
function rs(n){ return '₹'+Math.round(n).toLocaleString('en-IN'); }
function dayProgress(d){
  var p=planOf(d), r=(state.mainsPlan&&state.mainsPlan[d])||{maths:{}}; if(!r.maths) r.maths={};
  var it=items(p), done=0;
  it.forEach(function(x){ if(isTicked(r,x.k)) done++; });
  return {done:done,total:it.length,pct:Math.round(done/it.length*100)};
}
function hasScore(d){ var r=(state.mainsPlan&&state.mainsPlan[d]); if(!r) return false; var p=planOf(d);
  if(p.kind==='mock') return !!(r.mock&&(r.mock.total!==undefined&&r.mock.total!==''&&r.mock.total!==null));
  return !!(r.sect&&['m1','m2','r1','r2'].some(function(k){return r.sect[k]&&r.sect[k].score!==undefined&&r.sect[k].score!==''&&r.sect[k].score!==null;})); }
function stats(){
  var daysDone=0, solved=0, streak=0, best=0, run=0, xp=0, scores=0, td=firstPending();
  for(var d=1; d<=PLAN.length; d++){ var pr=dayProgress(d); if(pr.pct===100){ daysDone++; run++; if(run>best) best=run; xp+=50; } else run=0;
    xp+=pr.done*10; if(hasScore(d)){ scores++; xp+=25; }
    var r=state.mainsPlan&&state.mainsPlan[d]; if(r&&r.maths&&r.maths.solved){ var sv=parseFloat(r.maths.solved)||0; solved+=sv; xp+=Math.round(sv/2); } }
  for(var e=td; e>=1; e--){ if(dayProgress(e).pct===100) streak++; else if(e===td) continue; else break; }
  return {daysDone:daysDone, solved:solved, streak:streak, best:best, xp:xp, scores:scores, td:td};
}
var LEVELS=[[0,'Rookie','🌱'],[250,'Fighter','🥊'],[700,'Warrior','⚔️'],[1400,'Champion','🏅'],[2400,'Topper','🌟'],[3600,'Mains King','👑']];
function levelOf(xp){ var i=0; for(var k=0;k<LEVELS.length;k++) if(xp>=LEVELS[k][0]) i=k; var cur=LEVELS[i], nx=LEVELS[i+1]; return {i:i,name:cur[1],ic:cur[2],base:cur[0],next:nx?nx[0]:null,nname:nx?nx[1]:null,pct:nx?Math.round((xp-cur[0])/(nx[0]-cur[0])*100):100}; }
var QUOTES=['Aaj ka 1 din = Mains ka 1 mark. Chalo shuru karo! 🔥','Jo aaj paseena bahayega, wahi kal rank banayega. 💪','Mock ka score nahi, mistakes ka analysis jeetata hai. 🧠','Bas aaj ka target — kal ki tension kal. 🎯','Streak mat todna, consistency hi topper banati hai. 🔥','Har solved question ek step upar. 📈','Formula yaad = 2 minute bachat = 1 extra question. ⚡','Thak gaye? Break lo, par chhodo mat. 🚀','Selection ek din mein nahi, 50 dinon mein hota hai. 🏆','Aaj ki mehnat, kal ka appointment letter. ✉️','Speed + accuracy = Mains clear. ✅','Tum kar sakte ho — bas shuru karo! 🌟'];
var BADGES=[['🔥','3 Din Streak',function(s){return s.best>=3;}],['⚡','7 Din Streak',function(s){return s.best>=7;}],['💯','Pehla Perfect Day',function(s){return s.daysDone>=1;}],['🎯','10 Perfect Days',function(s){return s.daysDone>=10;}],['📐','500 Q Solved',function(s){return s.solved>=500;}],['🚀','1000 Q Solved',function(s){return s.solved>=1000;}],['🏆','2000 Q Solved',function(s){return s.solved>=2000;}],['📝','Pehla Score',function(s){return s.scores>=1;}],['👑','25 Perfect Days',function(s){return s.daysDone>=25;}],['🌟','Level Topper',function(s){return levelOf(s.xp).i>=4;}]];
function phaseStats(){ var o={},order=[]; PLAN.forEach(function(p){ if(!o[p.phase]){o[p.phase]={n:0,done:0};order.push(p.phase);} o[p.phase].n++; if(dayProgress(p.d).pct===100) o[p.phase].done++; }); return order.map(function(k){return [k,o[k]];}); }
function totalQ(){ return PLAN.reduce(function(a,p){return a+p.maths.q;},0); }

/* ---- controls (shared by page + Today panel) ---- */
var GRP_OF={maths:'maths',mockT:'test',analysis:'test',formula:'fc',calc:'fc',gk:'gk',vocab:'eng',idioms:'eng',spell:'eng',edit:'eng',weekly:'eng',grammar:'eng',rcz:'eng',errnb:'eng',comp:'ct',typing:'ct'};
function grpMeta(g,p){ return {maths:['📐','MATHS'],test:[p.kind==='mock'?'🏆':'🎯',p.kind==='mock'?'FULL MOCK + ANALYSIS':'SECTIONALS + ANALYSIS'],fc:['📝','FORMULA + CALCULATION'],gk:['🌍','GK'],eng:['✍️','ENGLISH · ROZ KA KAAM'],ct:['💻','COMPUTER + TYPING']}[g]; }
function rowHTML(x,d,p,r,AM){
  var on=isTicked(r,x.k), h='';
  h+='<div class="mtRow'+(on?' on':'')+'" data-mt-tick="'+x.k+'" data-d="'+d+'"><span class="mtChk">'+(on?'✓':'')+'</span><span class="mtTxt"><b>'+x.ic+' '+esc(x.t)+'</b>'+(x.s?'<i>'+esc(x.s)+'</i>':'')+'</span><span class="mtRs">'+rs(AM[x.k]||0)+'</span></div>';
  if(x.k==='rcz'){
    h+='<div class="mtQBtns"><button type="button" class="full" data-mt-pyq="'+d+'">📖 PYQ Set '+pyqNo(d)+' kholo</button></div>';
  }
  if(x.k==='calc'){
    h+='<div class="mtQBtns"><button type="button" class="full" data-mt-calc="'+d+'">⚡ Calculation Test kholo (Lite)</button></div>';
  }
  if(x.k==='maths'){
    h+='<div class="mtFill"><label>Solved Q<input type="number" inputmode="numeric" min="0" data-mt-f="solved" data-d="'+d+'" value="'+esc(r.maths.solved===undefined?'':r.maths.solved)+'" placeholder="/'+p.maths.q+'"></label>'+
       '<label>Time (min)<input type="number" inputmode="numeric" min="0" data-mt-f="mins" data-d="'+d+'" value="'+esc(r.maths.mins===undefined?'':r.maths.mins)+'" placeholder="'+p.maths.m+'"></label></div>';
    var sq=parseFloat(r.maths.solved)||0, qp=Math.min(100,Math.round(sq/p.maths.q*100));
    h+='<div class="mtQBar"><div style="width:'+qp+'%"></div></div><div class="mtQBtns"><span>'+sq+'/'+p.maths.q+' Q</span><button type="button" data-mt-q="'+d+'|10">+10</button><button type="button" data-mt-q="'+d+'|25">+25</button><button type="button" data-mt-q="'+d+'|50">+50</button><button type="button" class="full" data-mt-q="'+d+'|full">✅ Full</button></div>';
  }
  return h;
}
function controlsHTML(d, compact){
  var p=planOf(d), r=rec(d), h='', AM=amtMap(d), it=items(p), order=[], by={};
  it.forEach(function(x){ var g=GRP_OF[x.k]||'eng'; if(!by[g]){ by[g]=[]; order.push(g); } by[g].push(x); });
  order.forEach(function(g, gi){
    var list=by[g], done=list.filter(function(x){ return isTicked(r,x.k); }).length, all=done===list.length, m=grpMeta(g,p), badge=done+'/'+list.length;
    if(g==='maths'){ var sq=parseFloat(r.maths.solved)||0; badge=sq+'/'+p.maths.q+' Q'; all=!!r.maths.done; }
    h+='<div class="mtSecCard'+(all?' fin':'')+'"><div class="mtSecH"><span class="mtSecIc">'+m[0]+'</span><span class="mtSecT">'+m[1]+'</span><span class="mtPill'+(all?' done':'')+'">'+badge+'</span></div>';
    list.forEach(function(x){ h+=rowHTML(x,d,p,r,AM); });
    if(g==='test') h+=scoreHTML(d,p,r,compact);
    h+='</div>';
    if(g==='fc' && !p.gk) h+='<div class="mtSecCard off"><div class="mtSecH"><span class="mtSecIc">🌍</span><span class="mtSecT">GK</span><span class="mtPill">OFF</span></div><div class="mtOff">Aaj GK OFF — Maths heavy day, skip karo.</div></div>';
  });
  if(!compact){
    h+='<div class="mtSecCard"><div class="mtSecH"><span class="mtSecIc">📓</span><span class="mtSecT">NOTES</span></div><textarea class="mtNotes" data-mt-f="notes" data-d="'+d+'" placeholder="Notes (aaj kya seekha / kahan atka)...">'+esc(r.notes||'')+'</textarea></div>';
  }
  return h;
}
function inp(k,sub,d,val,ph,w){ return '<input type="'+(sub==='name'?'text':'number')+'" '+(sub==='name'?'':'inputmode="decimal" step="any" ')+'data-mt-s="'+k+'" data-sub="'+sub+'" data-d="'+d+'" value="'+esc(val===undefined?'':val)+'" placeholder="'+ph+'"'+(w?' style="grid-column:span '+w+'"':'')+'>'; }
function scoreHTML(d,p,r,compact){
  var h='<div class="mtScore"><div class="mtScoreT">'+(p.kind==='mock'?'🏆 Full Mock Score':'🎯 Sectional Scores (2 Maths + 2 Reasoning)')+' <span>→ Score tab me auto</span></div>';
  if(p.kind==='mock'){
    h+=mockForm(d,r.mock);
  } else {
    [['m1','Maths Sec 1'],['m2','Maths Sec 2'],['r1','Reasoning Sec 1'],['r2','Reasoning Sec 2']].forEach(function(s){
      var v=r.sect[s[0]]; h+='<div class="mtSecL">'+s[1]+'</div><div class="mtGrid g3">'+inp(s[0],'score',d,v.score,'Score /90')+inp(s[0],'right',d,v.right,'C')+inp(s[0],'wrong',d,v.wrong,'W')+'</div>';
    });
  }
  return h+'</div>';
}

/* ---- Page UI ---- */
function ringSVG(pct,size,col){ var R=size/2-6,C=2*Math.PI*R; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+R+'" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="6"/><circle cx="'+size/2+'" cy="'+size/2+'" r="'+R+'" fill="none" stroke="'+col+'" stroke-width="6" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+(C*(1-pct/100))+'" transform="rotate(-90 '+size/2+' '+size/2+')"/></svg>'; }
function renderPage(){
  var pg=document.getElementById('mtBody'); if(!pg) return;
  var st=stats(), td=st.td; if(!selDay) selDay=td;
  var pct=Math.round(st.daysDone/PLAN.length*100), qpct=Math.round(st.solved/totalQ()*100), lv=levelOf(st.xp), left=Math.max(0,PLAN.length-td);
  var h='<div class="mtHero"><div class="mtRing">'+ringSVG(pct,96,'#fff')+'<span>'+pct+'%</span></div><div class="mtHeroTxt"><div class="mtH1">🎯 Mains Target</div><div class="mtH2">'+st.daysDone+' / '+PLAN.length+' din complete · '+left+' din baaki</div>'+
    '<div class="mtPills"><span>🔥 Streak '+st.streak+'</span><span>🏅 Best '+st.best+'</span><span>📍 Day '+td+'</span></div></div></div>'+
    '<div class="mtLvl"><div class="mtLvlT"><b>'+lv.ic+' '+lv.name+'</b><span>⭐ '+st.xp+' XP'+(lv.next?' · '+lv.nname+' tak '+(lv.next-st.xp)+' XP':' · MAX')+'</span></div><div class="mtBar"><div style="width:'+lv.pct+'%"></div></div></div>'+
    '<div class="mtQuote">'+QUOTES[(td-1)%QUOTES.length]+'</div>'+
    '<div class="mtStats"><div><b>'+st.solved+'</b><small>Q solved</small></div><div><b>'+qpct+'%</b><small>Maths target</small></div><div><b>'+st.scores+'</b><small>Scores filled</small></div></div>'+
    '<div class="mtSec">📊 Phase Progress</div><div class="mtPh">';
  phaseStats().forEach(function(x){ var pp=Math.round(x[1].done/x[1].n*100); h+='<div class="mtPhR"><span style="color:'+phCol(x[0])+'">'+esc(x[0])+'</span><div class="mtBar sm"><div style="width:'+pp+'%;background:'+phCol(x[0])+'"></div></div><em>'+x[1].done+'/'+x[1].n+'</em></div>'; });
  h+='</div><div class="mtSec">🏆 Badges</div><div class="mtBadges">';
  BADGES.forEach(function(bd){ var ok=bd[2](st); h+='<div class="mtBdg'+(ok?' on':'')+'"><span>'+(ok?bd[0]:'🔒')+'</span><small>'+bd[1]+'</small></div>'; });
  h+='</div><div class="mtSec">📅 50 Din Map</div><div class="mtLegend">';
  var seen={}; PLAN.forEach(function(p){ if(!seen[p.phase]){seen[p.phase]=1; h+='<span><i style="background:'+phCol(p.phase)+'"></i>'+esc(p.phase)+'</span>';} });
  h+='</div><div class="mtChips">';
  PLAN.forEach(function(p){ var d=p.d, pr=dayProgress(d), c=phCol(p.phase);
    h+='<button type="button" class="mtChip'+(d===selDay?' sel':'')+(d===td?' today':'')+(pr.pct===100?' full':'')+'" data-mt-day="'+d+'" style="--c:'+c+';--p:'+pr.pct+'"><b>'+d+'</b><small>'+(p.kind==='mock'?'M':'S')+(hasScore(d)?'•':'')+'</small></button>'; });
  h+='</div>';
  var p=planOf(selDay), pr=dayProgress(selDay), c=phCol(p.phase);
  h+='<div class="mtCard" style="--c:'+c+'"><div class="mtCardH"><div><div class="mtDayT">Day '+selDay+(selDay===td?' · Aaj':'')+'</div><div class="mtDayS">'+esc(p.phase)+' · '+(p.kind==='mock'?'Full Mock day':'Sectional day')+'</div></div><div class="mtRingS">'+ringSVG(pr.pct,56,c)+'<span>'+pr.done+'/'+pr.total+'</span></div></div>'+controlsHTML(selDay,false)+'<div class="mtNav"><button type="button" data-mt-nav="-1"'+(selDay<=1?' disabled':'')+'>‹ Pichhla</button><button type="button" data-mt-nav="1"'+(selDay>=PLAN.length?' disabled':'')+'>Agla ›</button></div></div>';
  pg.innerHTML=h;
  var sel=pg.querySelector('.mtChip.sel'); if(sel&&sel.scrollIntoView&&!pg.__mtScrolled){ pg.__mtScrolled=1; }
}

/* ---- Today panel mirror ---- */
function renderToday(){
  try{
    var pn0=document.getElementById('panel'); if(pn0) pn0.classList.remove('mtOnly');
    if(!ready()) return;
    if(typeof viewingName!=='undefined' && typeof myName!=='undefined' && viewingName!==myName) return;
    var panel=document.getElementById('panel'); if(!panel) return;
    var old=document.getElementById('mtTodayPanel'); if(old) old.remove();
    var d=firstPending(), p=planOf(d), pr=dayProgress(d), c=phCol(p.phase);
    var box=document.createElement('div'); box.id='mtTodayPanel'; box.className='mtCard mtToday'; box.style.setProperty('--c',c);
    box.innerHTML='<div class="mtCardH" data-mt-toggle="1"><div><div class="mtDayT">🎯 Mains Target — Day '+d+'</div><div class="mtDayS">'+esc(p.phase)+' · '+(p.kind==='mock'?'Full Mock day':'Sectional day')+'</div></div><div class="mtRingS">'+ringSVG(pr.pct,56,c)+'<span>'+pr.done+'/'+pr.total+'</span></div></div>'+
      earnLine()+'<div class="mtBody'+(window.__mtTodayOpen===false?' hide':'')+'">'+controlsHTML(d,true)+'<button type="button" class="mtOpenBtn" data-mt-open="'+d+'">Poora Mains Target kholo ›</button>'+onlyBtn()+'</div>'+todayNav(d,pr);
    panel.insertBefore(box,panel.firstChild); panel.classList.toggle('mtOnly',mainsOn());
  }catch(e){ console.warn('mainsTarget today',e); }
}

/* ---- Score sync (stable ids) ---- */
function ownStart(){ if(!state.mainsStart){ state.mainsStart=fmtISODate(new Date()); try{ save(); }catch(e){} } return state.mainsStart; }
function dateOf(d){ try{ var x=new Date(ownStart()); x.setDate(x.getDate()+d-1); return fmtISODate(x); }catch(e){ return fmtISODate(new Date()); } }
function upsert(arr,id,entry){ var i=arr.findIndex(function(e){return e.id===id;}); if(entry){ if(i>=0) arr[i]=entry; else arr.push(entry);} else if(i>=0) arr.splice(i,1); }
function filled(v){ return v!==undefined && v!==null && v!==''; }
function syncScores(d){
  if(typeof ensureMockLogState!=='function') return;
  ensureMockLogState(); var p=planOf(d), r=rec(d), L=state.mockLog, dt=dateOf(d);
  if(p.kind==='mock'){
    var m=r.mock, e=null;
    if(filled(m.total)||filled(m.math)||filled(m.eng)||filled(m.gk)||filled(m.reas)||filled(m.right)){
      e={id:'mp_d'+d+'_mock',name:m.name||('Mains Target Day '+d+' Full Mock'),date:dt,examType:'mains',math:m.math===undefined?'':m.math,reasoning:m.reas===undefined?'':m.reas,english:m.eng===undefined?'':m.eng,gk:m.gk===undefined?'':m.gk,
         right:m.right===undefined?'':m.right,wrong:m.wrong===undefined?'':m.wrong,percentile:m.pct===undefined?'':m.pct,chapter:'',remarks:'Total: '+(filled(m.total)?m.total:'-'),auto:true,autoSrc:'Mains Target'};
      if(filled(m.total)) e.total=m.total;
    }
    upsert(L.pre,'mp_d'+d+'_mock',e);
  } else {
    [['m1','mathSec','Maths Sec 1'],['m2','mathSec','Maths Sec 2'],['r1','reasoningSec','Reasoning Sec 1'],['r2','reasoningSec','Reasoning Sec 2']].forEach(function(s){
      var v=r.sect[s[0]], e=null;
      if(filled(v.score)||filled(v.right)||filled(v.wrong)) e={id:'mp_d'+d+'_'+s[0],name:'Mains Target D'+d+' '+s[2],date:dt,score:v.score===undefined?'':v.score,right:v.right===undefined?'':v.right,wrong:v.wrong===undefined?'':v.wrong,skip:'',chapter:p.maths.t,remarks:'',auto:true,autoSrc:'Mains Target'};
      upsert(L[s[1]],'mp_d'+d+'_'+s[0],e);
    });
  }
  try{ if(typeof mockActiveCat!=='undefined' && mockActiveCat && typeof renderMockDetail==='function') renderMockDetail(); }catch(e){}
  try{ if(typeof renderMockTab==='function') renderMockTab(); }catch(e){}
}

/* ---- events ---- */
function refresh(){ renderToday(); var pg=document.getElementById('calcPage-mainstarget'); if(pg&&pg.classList.contains('active')) renderPage(); }
var PCT={};
function celebrate(d){
  try{ var b=document.body, n=26, em=['🎉','⭐','🔥','✨','🏆','💥'];
    for(var i=0;i<n;i++){ var el=document.createElement('span'); el.className='mtConf'; el.textContent=em[i%em.length];
      el.style.left=(Math.random()*100)+'vw'; el.style.animationDelay=(Math.random()*0.5)+'s'; el.style.fontSize=(16+Math.random()*16)+'px'; b.appendChild(el); setTimeout(function(x){x.remove();}.bind(null,el),2600); }
    var t=document.createElement('div'); t.className='mtToast'; t.innerHTML='🎉 Day '+d+' COMPLETE!<small>+50 XP bonus · shabaash Yuvraj! 🔥</small>'; b.appendChild(t); setTimeout(function(){t.remove();},2600);
    if(navigator.vibrate) navigator.vibrate([60,40,60]);
  }catch(e){} }
function commit(d,scoreChanged){ if(scoreChanged) syncScores(d); try{ save(); }catch(e){}
  var np=dayProgress(d).pct; if(np===100 && (PCT[d]||0)<100) celebrate(d); PCT[d]=np; refresh(); }
function onClick(e){
  var t=e.target.closest&&e.target.closest('[data-mt-tick],[data-mt-day],[data-mt-open],[data-mt-toggle],[data-mt-q],[data-mt-nav]'); if(!t) return;
  if(t.hasAttribute('data-mt-q')){
    var qa=t.getAttribute('data-mt-q').split('|'), qd=+qa[0], qr=rec(qd), qp=planOf(qd);
    var cur=parseFloat(qr.maths.solved)||0; qr.maths.solved=(qa[1]==='full')?qp.maths.q:cur+(+qa[1]);
    if(qr.maths.solved>=qp.maths.q) qr.maths.done=true; commit(qd,false); return;
  }
  if(t.hasAttribute('data-mt-nav')){ selDay=Math.min(PLAN.length,Math.max(1,selDay+(+t.getAttribute('data-mt-nav')))); renderPage(); return; }
  if(t.hasAttribute('data-mt-tick')){
    var d=+t.getAttribute('data-d'), k=t.getAttribute('data-mt-tick'), r=rec(d);
    if(k==='maths') r.maths.done=!r.maths.done; else r[k]=!r[k];
    commit(d,false);
  } else if(t.hasAttribute('data-mt-day')){ selDay=+t.getAttribute('data-mt-day'); renderPage(); var c=document.getElementById('mtBody'); var card=c&&c.querySelector('.mtCard'); if(card&&card.scrollIntoView) card.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  else if(t.hasAttribute('data-mt-open')){ selDay=+t.getAttribute('data-mt-open'); openPage(); }
  else if(t.hasAttribute('data-mt-toggle')){ window.__mtTodayOpen=(window.__mtTodayOpen===false); var b=document.querySelector('#mtTodayPanel .mtBody'); if(b) b.classList.toggle('hide',window.__mtTodayOpen===false); }
}
function onChange(e){
  var t=e.target; if(!t.getAttribute) return;
  var d=+t.getAttribute('data-d'); if(!d) return;
  var f=t.getAttribute('data-mt-f'), s=t.getAttribute('data-mt-s');
  if(f){ var r=rec(d), p=planOf(d);
    if(f==='notes'){ r.notes=t.value; }
    else { var v=t.value===''?undefined:Math.max(0,num(t.value)); if(f==='solved'){ if(v===undefined) delete r.maths.solved; else { r.maths.solved=v; if(v>=p.maths.q) r.maths.done=true; } } else { if(v===undefined) delete r.maths.mins; else r.maths.mins=v; } }
    commit(d,false);
  } else if(s){ var r2=rec(d), sub=t.getAttribute('data-sub'), val=t.value;
    var tgt=(s==='mock')?r2.mock:r2.sect[s];
    if(val==='') delete tgt[sub]; else tgt[sub]=(sub==='name')?val:num(val);
    if(s==='mock') mockTotals(tgt);
    commit(d,true);
  }
}

/* ---- page + button + CSS injection ---- */
function openPage(){ try{ var tb=document.querySelector('[data-tab="calc"]'); if(tb&&!document.getElementById('tab-calc').classList.contains('active')) tb.click(); }catch(e){}
  showCalcPage('mainstarget'); renderPage(); }
function inject(){
  if(document.getElementById('mtCSS')) return;
  var css=''+
  '.mtHero{display:flex;gap:14px;align-items:center;padding:16px;border-radius:20px;background:linear-gradient(135deg,#7f1d1d,#c2410c 60%,#d97706);box-shadow:0 8px 28px rgba(239,68,68,.25);margin-bottom:12px}'+
  '.mtRing{position:relative;width:92px;height:92px;flex:none}.mtRing span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:#fff}'+
  '.mtH1{font-size:20px;font-weight:800;color:#fff}.mtH2{font-size:13px;color:#fed7aa;margin-top:2px}.mtPills{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.mtPills span{background:rgba(0,0,0,.28);color:#fff;font-size:12px;padding:4px 10px;border-radius:99px}'+
  '.mtBar{height:8px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}.mtBar div{height:100%;background:linear-gradient(90deg,#fb923c,#f43f5e);border-radius:99px;transition:width .4s}.mtBarT{font-size:12px;color:var(--muted);margin:6px 2px 12px}.mtBarT b{color:var(--text)}'+
  '.mtLegend{display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin-bottom:8px}.mtLegend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px}'+
  '.mtChips{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;margin-bottom:14px}'+
  '.mtChip{position:relative;border:1.5px solid var(--c);background:conic-gradient(var(--c) calc(var(--p)*1%),rgba(255,255,255,.04) 0);border-radius:10px;padding:0;aspect-ratio:1;color:var(--text);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}'+
  '.mtChip:before{content:"";position:absolute;inset:2px;background:var(--card,#141b2d);border-radius:7px}.mtChip b,.mtChip small{position:relative;z-index:1}.mtChip b{font-size:12px}.mtChip small{font-size:8px;color:var(--muted);line-height:1}'+
  '.mtChip.full:before{background:color-mix(in srgb,var(--c) 35%,#0b1220)}.mtChip.today{box-shadow:0 0 0 2px #fff}.mtChip.sel{transform:scale(1.12);z-index:2;box-shadow:0 0 0 2px var(--c),0 4px 14px rgba(0,0,0,.5)}'+
  '.mtCard{background:var(--card,#141b2d);border:1px solid var(--c,var(--border));border-radius:18px;padding:14px;margin-bottom:14px;box-shadow:0 0 0 1px rgba(255,255,255,.03),0 6px 22px rgba(0,0,0,.3)}'+
  '.mtCardH{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px}.mtDayT{font-size:17px;font-weight:800;color:var(--text)}.mtDayS{font-size:12px;color:var(--c);margin-top:2px}'+
  '.mtRingS{position:relative;width:56px;height:56px;flex:none}.mtRingS span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text)}'+
  '.mtRow{display:flex;gap:10px;align-items:center;padding:10px;border-radius:12px;background:rgba(255,255,255,.04);margin-bottom:6px;cursor:pointer;border:1px solid transparent}.mtRow:active{transform:scale(.98)}.mtRow.on{background:rgba(52,211,153,.12);border-color:rgba(52,211,153,.4)}'+
  '.mtChk{width:24px;height:24px;border-radius:7px;border:2px solid var(--muted);display:flex;align-items:center;justify-content:center;flex:none;font-weight:800;color:#0b1220}.mtRow.on .mtChk{background:#34d399;border-color:#34d399}'+
  '.mtTxt{display:flex;flex-direction:column;min-width:0}.mtTxt b{font-size:13.5px;color:var(--text);font-weight:600}.mtTxt i{font-size:11.5px;color:var(--muted);font-style:normal;margin-top:2px}.mtRow.on .mtTxt b{text-decoration:line-through;opacity:.75}'+
  '.mtFill{display:flex;gap:8px;margin:0 0 8px 34px}.mtFill label{flex:1;font-size:11px;color:var(--muted)}.mtFill input,.mtGrid input,.mtNotes{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:10px;color:var(--text);padding:9px 10px;font-size:14px;margin-top:3px}'+
  '.mtOff{font-size:12px;color:var(--muted);padding:6px 10px;margin-bottom:6px}.mtNotes{min-height:60px;resize:vertical;margin:6px 0 10px;font-family:inherit}'+
  '.mtScore{margin-top:8px;padding:12px;border-radius:14px;background:rgba(251,146,60,.07);border:1px dashed rgba(251,146,60,.4)}.mtScoreT{font-size:13px;font-weight:700;color:#fed7aa;margin-bottom:8px}.mtScoreT span{font-weight:400;font-size:10.5px;color:var(--muted)}'+
  '.mtGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.mtGrid input{margin-top:0}.mtSecL{font-size:11.5px;color:var(--muted);margin:8px 0 4px}'+
  '.mtHero{position:relative;overflow:hidden;background-size:200% 200%;animation:mtGrad 8s ease infinite}.mtHero:after{content:"🎯";position:absolute;right:-8px;bottom:-18px;font-size:90px;opacity:.12}@keyframes mtGrad{0%,100%{background-position:0 50%}50%{background-position:100% 50%}}'+
  '.mtLvl{background:var(--card,#141b2d);border:1px solid var(--border);border-radius:14px;padding:10px 12px;margin-bottom:10px}.mtLvlT{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:7px;color:var(--muted)}.mtLvlT b{font-size:15px;color:#fbbf24}'+
  '.mtQuote{font-size:13px;font-weight:600;color:#fde68a;background:linear-gradient(90deg,rgba(251,191,36,.14),rgba(251,191,36,.03));border-left:3px solid #fbbf24;border-radius:10px;padding:10px 12px;margin-bottom:10px}'+
  '.mtStats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:6px}.mtStats div{background:var(--card,#141b2d);border:1px solid var(--border);border-radius:14px;padding:10px 6px;text-align:center}.mtStats b{display:block;font-size:20px;color:#fb923c}.mtStats small{font-size:10.5px;color:var(--muted)}'+
  '.mtSec{font-size:13px;font-weight:800;color:var(--text);margin:14px 2px 8px;letter-spacing:.3px}.mtPhR{display:flex;align-items:center;gap:8px;margin-bottom:7px;font-size:12px;font-weight:700}.mtPhR span{width:64px;flex:none}.mtPhR em{font-style:normal;color:var(--muted);width:34px;text-align:right;font-weight:500}.mtBar.sm{flex:1;height:7px}'+
  '.mtBadges{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.mtBdg{text-align:center;padding:8px 2px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--border);opacity:.55;filter:grayscale(1)}.mtBdg span{font-size:22px;display:block}.mtBdg small{font-size:8.5px;color:var(--muted);line-height:1.15;display:block;margin-top:2px}.mtBdg.on{opacity:1;filter:none;background:linear-gradient(145deg,rgba(251,191,36,.2),rgba(251,146,60,.08));border-color:#fbbf24;box-shadow:0 0 12px rgba(251,191,36,.25)}.mtBdg.on small{color:#fde68a}'+
  '.mtChip.today{animation:mtPulse 1.6s infinite}@keyframes mtPulse{0%,100%{box-shadow:0 0 0 2px #fff}50%{box-shadow:0 0 0 4px rgba(255,255,255,.35)}}'+
  '.mtQBar{height:7px;border-radius:99px;background:rgba(255,255,255,.08);margin:0 0 6px 34px;overflow:hidden}.mtQBar div{height:100%;background:linear-gradient(90deg,#38bdf8,#34d399);border-radius:99px;transition:width .35s}'+
  '.mtQBtns{display:flex;gap:6px;align-items:center;margin:0 0 10px 34px;flex-wrap:wrap}.mtQBtns span{font-size:12px;font-weight:700;color:#38bdf8;margin-right:auto}.mtQBtns button{border:1px solid var(--border);background:rgba(255,255,255,.06);color:var(--text);border-radius:99px;padding:5px 11px;font-size:12px;font-weight:700;cursor:pointer}.mtQBtns button.full{background:rgba(52,211,153,.18);border-color:#34d399;color:#6ee7b7}.mtQBtns button:active{transform:scale(.92)}'+
  '.mtNav{display:flex;gap:8px;margin-top:12px}.mtNav button{flex:1;padding:10px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,.05);color:var(--text);font-weight:700;cursor:pointer}.mtNav button:disabled{opacity:.3}'+
  '.mtConf{position:fixed;top:-30px;z-index:99999;pointer-events:none;animation:mtFall 2.2s ease-in forwards}@keyframes mtFall{to{transform:translateY(110vh) rotate(540deg);opacity:.2}}'+
  '.mtToast{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:100000;background:linear-gradient(135deg,#f59e0b,#dc2626);color:#fff;font-weight:800;font-size:20px;text-align:center;padding:16px 26px;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.5);animation:mtPop .5s cubic-bezier(.2,1.6,.4,1)}.mtToast small{display:block;font-size:12px;font-weight:500;margin-top:4px}@keyframes mtPop{from{transform:translateX(-50%) scale(.3);opacity:0}}'+
  '.mtRs{margin-left:auto;flex:none;font-size:12px;font-weight:800;color:#34d399;background:rgba(52,211,153,.12);border-radius:99px;padding:3px 9px}.mtRow:not(.on) .mtRs{color:var(--muted);background:rgba(255,255,255,.06)}'+
  '.mtToday{margin-bottom:14px}.mtToday .mtCardH{cursor:pointer;margin-bottom:6px}.mtBody.hide{display:none}.mtOpenBtn{width:100%;margin-top:8px;padding:10px;border-radius:12px;border:1px solid var(--c);background:transparent;color:var(--text);font-weight:600;cursor:pointer}';
  var st=document.createElement('style'); st.id='mtCSS'; st.textContent=css; document.head.appendChild(st);

  var menu=document.getElementById('calcPage-menu');
  var mb=document.getElementById('calcMainsMockBtn');
  var wrap=document.createElement('div'); wrap.className='calcGrid calcGrid-1col'; wrap.style.marginBottom='10px';
  wrap.innerHTML='<button type="button" class="calcCard calcCard-prem pm-mains pmBig" id="calcMainsTargetBtn"><span class="calcIcon">🎯</span><span class="calcLabelCol"><span class="calcLabel">Mains Target</span><span class="calcSub">50-Day plan · Daily tick &amp; fill · Score tab auto-sync</span></span><span class="calcArrow">&#8250;</span></button>';
  menu.insertBefore(wrap,menu.firstChild);
  document.getElementById('calcMainsTargetBtn').addEventListener('click',function(){ if(state.mainsOnly===undefined){ state.mainsOnly=true; try{ save(); }catch(e){} renderToday(); } selDay=firstPending(); showCalcPage('mainstarget'); renderPage(); try{ window.scrollTo(0,0); var pgx=document.getElementById('calcPage-mainstarget'); if(pgx) pgx.scrollTop=0; }catch(e){} });

  var pg=document.createElement('div'); pg.className='calcPage'; pg.id='calcPage-mainstarget';
  pg.innerHTML='<div class="calcSubHead"><button class="calcBackBtn" id="mtBackBtn" aria-label="Back">&#8249;</button><div class="calcSubTitle">🎯 Mains Target — 50 Days</div></div><div id="mtBody"></div>';
  menu.parentNode.insertBefore(pg,menu.nextSibling);
  document.getElementById('mtBackBtn').addEventListener('click',function(){ showCalcPage('menu'); });
  pg.addEventListener('click',onClick); pg.addEventListener('change',onChange);
}
function hookPanel(){
  var panel=document.getElementById('panel');
  panel.addEventListener('click',onClick); panel.addEventListener('change',onChange);
  if(typeof renderPanel==='function' && !renderPanel.__mt){
    var orig=renderPanel; var w=function(){ var r=orig.apply(this,arguments); renderToday(); return r; }; w.__mt=1;
    try{ renderPanel=w; }catch(e){ window.renderPanel=w; }
  }
  hookMoney();
  renderToday();
}
/* ---- UI v3: mission card, weekly summary, next-unlock, glass/shimmer polish ---- */
function mins(d){ var r=state.mainsPlan&&state.mainsPlan[d]; return (r&&r.maths&&parseFloat(r.maths.mins))||0; }
function fmtMin(m){ return m>=60 ? Math.floor(m/60)+'h '+(m%60)+'m' : m+'m'; }
function weekOf(td){ var s=Math.floor((td-1)/7)*7+1, e=Math.min(PLAN.length,s+6); return [s,e]; }
function greet(){ var h=new Date().getHours(); return h<5?'🌙 Raat ke yodha':h<12?'🌅 Good Morning':h<17?'☀️ Good Afternoon':h<21?'🌆 Good Evening':'🌙 Late-night grind'; }
function nextUnlock(st){ var lv=levelOf(st.xp); for(var i=0;i<BADGES.length;i++){ if(!BADGES[i][2](st)) return BADGES[i][0]+' '+BADGES[i][1]; } return lv.next?('⭐ '+lv.nname+' level'):'👑 Sab unlock!'; }
function extraHTML(st){
  var td=st.td, pr=dayProgress(td), p=planOf(td), left=pr.total-pr.done, wk=weekOf(td), ws=wk[0], we=wk[1];
  var wd=0, wq=0, wm=0, sc=[], dots='';
  for(var d=ws; d<=we; d++){ var q=dayProgress(d).pct; if(q===100) wd++; var r=state.mainsPlan&&state.mainsPlan[d]; if(r&&r.maths) wq+=parseFloat(r.maths.solved)||0; wm+=mins(d);
    if(r&&r.mock&&parseFloat(r.mock.pct)) sc.push(parseFloat(r.mock.pct));
    dots+='<i class="mtDot'+(q===100?' on':q>0?' half':'')+(d===td?' now':'')+'" title="Day '+d+'"><b>'+d+'</b></i>'; }
  var avg=sc.length?Math.round(sc.reduce(function(a,b){return a+b;},0)/sc.length)+'%':'—';
  var mission='<div class="mtMiss"><div class="mtMissL"><small>'+greet()+', Raaj!</small><b>'+(left===0?'🎉 Aaj ka mission COMPLETE!':'🎯 Aaj ke '+left+' kaam baaki')+'</b><span>Day '+td+' · '+esc(p.phase)+' · '+esc(p.maths.t)+'</span></div><button type="button" class="mtGo" data-mt-go="'+td+'">'+(left===0?'Dekho':'Shuru ›')+'</button></div>';
  var week='<div class="mtSec">🗓️ Is Hafte ka Report <em class="mtEm">Day '+ws+'–'+we+'</em></div><div class="mtWeek"><div class="mtDots">'+dots+'</div><div class="mtWS"><div><b>'+wd+'/'+(we-ws+1)+'</b><small>Days done</small></div><div><b>'+wq+'</b><small>Q solved</small></div><div><b>'+fmtMin(wm)+'</b><small>Maths time</small></div><div><b>'+avg+'</b><small>Mock avg</small></div></div><div class="mtNext">🔓 Agla unlock: <b>'+nextUnlock(st)+'</b></div></div>';
  return {mission:mission, week:week};
}
var _rp=renderPage;
renderPage=function(){
  _rp(); var pg=document.getElementById('mtBody'); if(!pg) return;
  try{ var st=stats(), x=extraHTML(st), hero=pg.querySelector('.mtHero'), stt=pg.querySelector('.mtStats');
    if(hero) hero.insertAdjacentHTML('afterend',x.mission);
    if(stt) stt.insertAdjacentHTML('afterend',x.week);
    var q=pg.querySelector('.mtQuote'); if(q) q.title='Tap = nayi quote';
    var hd=pg.querySelector('.mtCard .mtDayS'); var m=mins(selDay);
    if(hd&&m) hd.insertAdjacentHTML('beforeend',' · ⏱️ '+fmtMin(m));
    pg.querySelectorAll('.mtBdg.on').forEach(function(b,i){ b.style.animationDelay=(i*70)+'ms'; });
  }catch(e){ console.warn('mt v3',e); }
};
document.addEventListener('click',function(e){
  var t=e.target; if(!t||!t.closest) return;
  var g=t.closest('[data-mt-go]'); if(g){ selDay=parseInt(g.getAttribute('data-mt-go'),10)||firstPending(); renderPage(); var c=document.querySelector('#mtBody .mtCard'); if(c&&c.scrollIntoView) c.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  var q=t.closest('#mtBody .mtQuote'); if(q){ q.innerHTML=QUOTES[Math.floor(Math.random()*QUOTES.length)]; q.classList.remove('pop'); void q.offsetWidth; q.classList.add('pop'); }
});
(function(){ var css=''+
 '.mtHero:before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.18) 50%,transparent 70%);transform:translateX(-100%);animation:mtShine 4.5s infinite}@keyframes mtShine{to{transform:translateX(100%)}}'+
 '.mtRing svg{filter:drop-shadow(0 0 8px rgba(255,255,255,.55))}.mtRingS svg{filter:drop-shadow(0 0 5px var(--c))}'+
 '.mtMiss{display:flex;align-items:center;gap:10px;padding:14px;border-radius:18px;margin-bottom:10px;background:linear-gradient(135deg,rgba(56,189,248,.18),rgba(167,139,250,.18));border:1px solid rgba(167,139,250,.45);box-shadow:0 6px 22px rgba(124,58,237,.2);backdrop-filter:blur(6px)}'+
 '.mtMissL{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.mtMissL small{font-size:11.5px;color:#c4b5fd}.mtMissL b{font-size:15.5px;color:var(--text)}.mtMissL span{font-size:11.5px;color:var(--muted)}'+
 '.mtGo{border:0;border-radius:99px;padding:10px 16px;font-weight:800;font-size:13px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#38bdf8);box-shadow:0 4px 14px rgba(56,189,248,.4);animation:mtBeat 2s infinite}@keyframes mtBeat{50%{transform:scale(1.07)}}'+
 '.mtEm{font-style:normal;font-weight:500;font-size:11px;color:var(--muted);margin-left:6px}'+
 '.mtWeek{background:var(--card,#141b2d);border:1px solid var(--border);border-radius:16px;padding:12px;margin-bottom:6px}'+
 '.mtDots{display:flex;gap:6px;justify-content:space-between;margin-bottom:10px}.mtDot{flex:1;aspect-ratio:1;max-width:40px;border-radius:50%;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;font-style:normal;border:1.5px solid transparent}.mtDot b{font-size:11px;color:var(--muted)}'+
 '.mtDot.half{background:rgba(251,191,36,.22)}.mtDot.on{background:linear-gradient(135deg,#34d399,#10b981);box-shadow:0 0 10px rgba(52,211,153,.55)}.mtDot.on b{color:#06281c}.mtDot.now{border-color:#fff}'+
 '.mtWS{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.mtWS div{text-align:center;padding:8px 2px;border-radius:12px;background:rgba(255,255,255,.04)}.mtWS b{display:block;font-size:15px;color:#38bdf8}.mtWS small{font-size:10px;color:var(--muted)}'+
 '.mtNext{margin-top:10px;font-size:12px;color:var(--muted);text-align:center;padding:7px;border-radius:10px;background:rgba(251,191,36,.08);border:1px dashed rgba(251,191,36,.4)}.mtNext b{color:#fbbf24}'+
 '.mtQuote{cursor:pointer}.mtQuote.pop{animation:mtPop .45s cubic-bezier(.2,1.6,.4,1)}'+
 '.mtBdg.on{animation:mtBdgIn .5s both}@keyframes mtBdgIn{from{transform:scale(.4) rotate(-12deg);opacity:0}}'+
 '.mtRow.on .mtChk{animation:mtTick .35s cubic-bezier(.2,1.8,.4,1)}@keyframes mtTick{from{transform:scale(.3)}}'+
 '.mtChip{transition:transform .15s}.mtChip:active{transform:scale(.9)}.mtChip.full b{color:#fff;text-shadow:0 0 6px var(--c)}'+
 '.mtCard,.mtLvl,.mtStats div{backdrop-filter:blur(4px)}.mtStats b{background:linear-gradient(135deg,#fb923c,#f43f5e);-webkit-background-clip:text;background-clip:text;color:transparent}';
 if(!document.getElementById('mtCSS3')){ var s=document.createElement('style'); s.id='mtCSS3'; s.textContent=css; document.head.appendChild(s); } })();

/* ---- UI v4: maths timer, phase filter, mock-score trend ---- */
var PHF=null, TM={d:0,acc:0,t0:0,run:false,iv:null};
function tsec(){ return TM.acc+(TM.run?Math.floor((Date.now()-TM.t0)/1000):0); }
function tfmt(s){ var m=Math.floor(s/60), x=s%60; return (m<10?'0':'')+m+':'+(x<10?'0':'')+x; }
function timerHTML(d){ var on=TM.d===d&&(TM.run||TM.acc>0), s=on?tsec():0;
  return '<div class="mtTimer'+(TM.run&&TM.d===d?' run':'')+'"><span class="mtTi">⏱️</span><b id="mtTv">'+tfmt(s)+'</b><span class="mtTb">'+
   (on&&TM.run?'<button type="button" data-mt-t="pause">⏸ Pause</button>':'<button type="button" data-mt-t="start">'+(on?'▶ Resume':'▶ Maths Timer')+'</button>')+
   (on?'<button type="button" class="sv" data-mt-t="save">✔ Save</button>':'')+'</span></div>'; }
function trendHTML(){ var pts=[]; for(var d=1;d<=PLAN.length;d++){ var r=state.mainsPlan&&state.mainsPlan[d]; var v=r&&r.mock&&parseFloat(r.mock.pct); if(v) pts.push([d,v]); }
  if(pts.length<2) return ''; var mx=Math.max.apply(null,pts.map(function(p){return p[1];})), mn=Math.min.apply(null,pts.map(function(p){return p[1];})), rg=Math.max(1,mx-mn), W=300, H=70;
  var xy=pts.map(function(p,i){ return (8+i*(W-16)/(pts.length-1)).toFixed(1)+','+(H-10-(p[1]-mn)/rg*(H-22)).toFixed(1); });
  var up=pts[pts.length-1][1]>=pts[0][1];
  return '<div class="mtSec">📈 Mock Score Trend <em class="mtEm">Best '+mx+'% · '+(up?'⬆️ upar':'⬇️ neeche')+'</em></div><div class="mtWeek"><svg viewBox="0 0 '+W+' '+H+'" width="100%" height="70"><polyline points="'+xy.join(' ')+'" fill="none" stroke="'+(up?'#34d399':'#f87171')+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>'+xy.map(function(s){var a=s.split(',');return '<circle cx="'+a[0]+'" cy="'+a[1]+'" r="3.5" fill="#fff"/>';}).join('')+'</svg></div>'; }
function phaseBar(){ var seen={}, h='<div class="mtPF"><button type="button" data-mt-ph="" class="'+(!PHF?'on':'')+'">Sab</button>';
  PLAN.forEach(function(p){ var k=p.phase; if(seen[k]) return; seen[k]=1; h+='<button type="button" data-mt-ph="'+esc(k)+'" class="'+(PHF===k?'on':'')+'" style="--c:'+phCol(k)+'">'+esc(k)+'</button>'; }); return h+'</div>'; }
function tick(){ var el=document.getElementById('mtTv'); if(el) el.textContent=tfmt(tsec()); }
var _rp3=renderPage;
renderPage=function(){
  _rp3(); var pg=document.getElementById('mtBody'); if(!pg) return;
  try{ var ch=pg.querySelector('.mtChips'); if(ch){ ch.insertAdjacentHTML('beforebegin',phaseBar());
      if(PHF) ch.querySelectorAll('.mtChip').forEach(function(c){ var d=parseInt(c.getAttribute('data-mt-day'),10); if(planOf(d).phase!==PHF) c.classList.add('dim'); }); }
    var wk=pg.querySelector('.mtWeek'); if(wk){ var t=trendHTML(); if(t) wk.insertAdjacentHTML('afterend',t); }
    
  }catch(e){ console.warn('mt v4',e); } };
document.addEventListener('click',function(e){ var t=e.target&&e.target.closest&&e.target.closest('[data-mt-t],[data-mt-ph]'); if(!t) return;
  if(t.hasAttribute('data-mt-ph')){ PHF=t.getAttribute('data-mt-ph')||null; renderPage(); return; }
  var a=t.getAttribute('data-mt-t');
  if(a==='start'){ if(TM.d!==selDay){ TM.acc=0; TM.d=selDay; } TM.t0=Date.now(); TM.run=true; clearInterval(TM.iv); TM.iv=setInterval(tick,500); }
  else if(a==='pause'){ TM.acc=tsec(); TM.run=false; clearInterval(TM.iv); }
  else if(a==='save'){ var s=tsec(), m=Math.max(1,Math.round(s/60)), d=TM.d; TM.run=false; TM.acc=0; clearInterval(TM.iv);
    var r=rec(d); r.maths.mins=(parseFloat(r.maths.mins)||0)+m; commit(d,false);
    try{ var tt=document.createElement('div'); tt.className='mtToast'; tt.innerHTML='⏱️ +'+m+' min saved<small>Day '+d+' maths time update ho gaya</small>'; document.body.appendChild(tt); setTimeout(function(){tt.remove();},1800); }catch(x){} return; }
  renderPage(); });
(function(){ var css=''+
 '.mtPF{display:flex;gap:6px;overflow-x:auto;margin-bottom:8px;padding-bottom:2px}.mtPF button{flex:none;border:1px solid var(--c,var(--border));background:rgba(255,255,255,.05);color:var(--text);border-radius:99px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer}.mtPF button.on{background:var(--c,#fb923c);color:#0b1220}.mtChip.dim{opacity:.2}'+
 '.mtTimer{display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:10px;border-radius:14px;background:linear-gradient(135deg,rgba(56,189,248,.14),rgba(52,211,153,.12));border:1px solid rgba(56,189,248,.4)}.mtTimer b{font-size:22px;font-variant-numeric:tabular-nums;color:#38bdf8;letter-spacing:1px}.mtTb{margin-left:auto;display:flex;gap:6px}'+
 '.mtTimer.run{box-shadow:0 0 18px rgba(56,189,248,.45);animation:mtBeat 2s infinite}.mtTb button{border:0;border-radius:99px;padding:8px 13px;font-weight:800;font-size:12px;color:#fff;background:#0ea5e9;cursor:pointer}.mtTb button.sv{background:#10b981}';
 var s=document.createElement('style'); s.id='mtCSS4'; s.textContent=css; document.head.appendChild(s); })();

/* ---- v5: Day 1 se start, target card sabse upar ---- */
/* v10: din AUTO nahi badalta. state.mainsCur = Today tab ka din; sirf user 'Agla din' dabaye tab badle. */
function firstPending(){ var c=parseInt(state&&state.mainsCur,10);
  if(c>=1&&c<=PLAN.length) return c;
  var d0=PLAN.length; for(var d=1; d<=PLAN.length; d++){ if(dayProgress(d).pct<30){ d0=d; break; } }
  try{ state.mainsCur=d0; save(); }catch(e){} return d0; }
function setCurDay(n){ n=Math.min(PLAN.length,Math.max(1,n)); state.mainsCur=n; selDay=n; try{ save(); }catch(e){} refresh(); }
var _rp5=renderPage;
renderPage=function(){ _rp5(); var pg=document.getElementById('mtBody'); if(!pg) return;
  try{ var card=pg.querySelector('.mtCard'); if(card&&pg.firstChild!==card) pg.insertBefore(card,pg.firstChild); }catch(e){ console.warn('mt v5',e); } };
/* ---- v6: simple page = Day card + Calendar + Remaining + (stats collapsed) ---- */
function remHTML(){ var rows='', days=0, tasks=0;
  for(var d=1; d<=PLAN.length; d++){ var p=planOf(d), r=(state.mainsPlan&&state.mainsPlan[d])||{maths:{}}; if(!r.maths) r.maths={};
    var pend=items(p).filter(function(x){ return !isTicked(r,x.k); }); if(!pend.length) continue; days++; tasks+=pend.length;
    rows+='<button type="button" class="mtRemR" data-mt-day="'+d+'" style="--c:'+phCol(p.phase)+'"><div class="mtRemH"><b>Day '+d+'</b><small>'+esc(p.phase)+' · '+(p.kind==='mock'?'Mock':'Sectional')+'</small><em>'+pend.length+' baaki</em></div><div class="mtRemI">'+
      pend.map(function(x){ var t=x.t.length>26?x.t.slice(0,25)+'…':x.t; return '<span>'+x.ic+' '+esc(t)+'</span>'; }).join('')+'</div></button>'; }
  return {days:days,tasks:tasks,html:rows||'<div class="mtRemDone">🎉 Sab target complete! Shabaash!</div>'}; }
function calHTML(st){ var h='<div class="mtCalT"><b>📅 Mera 50 Din Calendar</b><span>'+st.daysDone+'/'+PLAN.length+' ✅</span></div><div class="mtCalLg"><span><i class="g"></i>Complete</span><span><i class="y"></i>Adhura</span><span><i class="n"></i>Baaki</span></div><div class="mtCal">';
  PLAN.forEach(function(p){ var d=p.d, pr=dayProgress(d), cls=pr.pct===100?' full':pr.pct>0?' part':'';
    h+='<button type="button" class="mtCell'+cls+(d===selDay?' sel':'')+(d===st.td?' today':'')+'" data-mt-day="'+d+'" style="--c:'+phCol(p.phase)+';--p:'+pr.pct+'"><b>'+d+'</b><small>'+(pr.pct===100?'✓':pr.pct>0?pr.pct+'%':(p.kind==='mock'?'M':'S'))+(hasScore(d)?' •':'')+'</small></button>'; });
  return h+'</div>'; }
var _rp6=renderPage;
renderPage=function(){
  _rp6(); var pg=document.getElementById('mtBody'); if(!pg) return;
  try{ var st=stats(), card=pg.querySelector('.mtCard'), kids=[].slice.call(pg.children), cut=-1;
    kids.forEach(function(k,i){ if(cut<0 && k.classList.contains('mtSec') && k.textContent.indexOf('50 Din Map')>=0) cut=i; });
    var more=document.createElement('details'); more.className='mtMore'; if(window.__mtMoreOpen) more.open=true;
    more.innerHTML='<summary>📊 Stats, Badges &amp; Weekly Report</summary>';
    more.addEventListener('toggle',function(){ window.__mtMoreOpen=more.open; });
    kids.forEach(function(k,i){ if(k===card) return; if(cut>=0 && i>=cut){ k.remove(); return; } if(k.classList.contains('mtMiss')||k.classList.contains('mtQuote')){ k.remove(); return; } more.appendChild(k); });
    var rm=remHTML(), open=!!window.__mtRem;
    var cal=document.createElement('div'); cal.className='mtCalW'; cal.innerHTML=calHTML(st);
    var rb=document.createElement('div'); rb.innerHTML='<button type="button" class="mtRemBtn'+(open?' on':'')+'" data-mt-rem="1"><span>📋 Remaining Target</span><em>'+rm.days+' din · '+rm.tasks+' kaam baaki '+(open?'▲':'▼')+'</em></button>'+(open?'<div class="mtRemList">'+rm.html+'</div>':'');
    pg.appendChild(cal); pg.appendChild(rb); pg.appendChild(more);
  }catch(e){ console.warn('mt v6',e); } };
document.addEventListener('click',function(e){ var t=e.target&&e.target.closest&&e.target.closest('[data-mt-rem]'); if(!t) return; window.__mtRem=!window.__mtRem; renderPage(); });
(function(){ var css=''+
 '.mtCalW{background:var(--card,#141b2d);border:1px solid var(--border);border-radius:18px;padding:12px;margin-bottom:12px}.mtCalT{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.mtCalT b{font-size:15px;color:var(--text)}.mtCalT span{font-size:12px;font-weight:800;color:#34d399}'+
 '.mtCalLg{display:flex;gap:12px;font-size:10.5px;color:var(--muted);margin-bottom:10px}.mtCalLg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}.mtCalLg .g{background:#22c55e}.mtCalLg .y{background:#fbbf24}.mtCalLg .n{background:rgba(255,255,255,.15)}'+
 '.mtCal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.mtCell{aspect-ratio:1;border-radius:12px;border:1px solid rgba(255,255,255,.1);border-bottom:3px solid var(--c);background:rgba(255,255,255,.05);color:var(--text);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0;cursor:pointer;transition:transform .15s}.mtCell b{font-size:15px}.mtCell small{font-size:9.5px;color:var(--muted);font-weight:700}.mtCell:active{transform:scale(.9)}'+
 '.mtCell.part{background:rgba(251,191,36,.16);border-color:#fbbf24;border-bottom-color:#fbbf24}.mtCell.part small{color:#fbbf24}'+
 '.mtCell.full{background:linear-gradient(145deg,#4ade80,#16a34a);border-color:#4ade80;border-bottom-color:#14532d;color:#fff;box-shadow:0 3px 12px rgba(34,197,94,.45)}.mtCell.full b{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.35)}.mtCell.full small{color:#dcfce7;font-size:12px}'+
 '.mtCell.today{outline:2px solid #fff;outline-offset:1px;animation:mtPulse 1.6s infinite}.mtCell.sel{transform:scale(1.12);z-index:2;box-shadow:0 0 0 2px #fff,0 6px 16px rgba(0,0,0,.5)}'+
 '.mtRemBtn{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:14px;border-radius:16px;border:1px solid rgba(248,113,113,.5);background:linear-gradient(135deg,rgba(248,113,113,.18),rgba(251,146,60,.16));color:var(--text);font-weight:800;font-size:15px;cursor:pointer;margin-bottom:10px}.mtRemBtn em{font-style:normal;font-size:12px;font-weight:600;color:#fca5a5}.mtRemBtn.on{border-color:#f87171}'+
 '.mtRemList{display:flex;flex-direction:column;gap:7px;margin-bottom:12px}.mtRemR{text-align:left;border:1px solid var(--border);border-left:4px solid var(--c);background:var(--card,#141b2d);color:var(--text);border-radius:12px;padding:10px;cursor:pointer}.mtRemH{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}.mtRemH b{font-size:14px}.mtRemH small{font-size:11px;color:var(--c)}.mtRemH em{margin-left:auto;font-style:normal;font-size:11px;font-weight:700;color:#fca5a5}'+
 '.mtRemI{display:flex;flex-wrap:wrap;gap:5px}.mtRemI span{font-size:11px;background:rgba(255,255,255,.07);border-radius:99px;padding:3px 9px;color:var(--muted)}.mtRemDone{text-align:center;padding:18px;font-weight:700;color:#34d399}'+
 '.mtMore{border:1px solid var(--border);border-radius:16px;padding:0 12px 12px;margin-bottom:14px;background:rgba(255,255,255,.02)}.mtMore>summary{cursor:pointer;font-weight:800;font-size:14px;padding:13px 0;color:var(--text);list-style:none}.mtMore>summary::-webkit-details-marker{display:none}';
 var s=document.createElement('style'); s.id='mtCSS6'; s.textContent=css; document.head.appendChild(s); })();


var MSUB=[['math','🧮','Maths','#38bdf8',90],['reas','🧩','Reasoning','#a78bfa',90],['eng','📖','English','#34d399',135],['gk','🌍','GK','#fbbf24',75]];
function nz(x){ return filled(x)?(parseFloat(x)||0):0; }
function mockTotals(m){ var R=0,W=0,any=false; MSUB.forEach(function(u){ if(filled(m[u[0]+'R'])||filled(m[u[0]+'W'])){ any=true; R+=nz(m[u[0]+'R']); W+=nz(m[u[0]+'W']); } });
  if(any){ m.right=R; m.wrong=W; } else { delete m.right; delete m.wrong; } }
function lbl(t,input){ return '<label class="mtL"><span>'+t+'</span>'+input+'</label>'; }
function mockForm(d,m){
  var h='<div class="mtMock"><label class="mtL mtL1"><span>📝 Mock ka naam</span>'+inp('mock','name',d,m.name,'e.g. RBE Mock 1')+'</label><div class="mtGrid g2">'+
    lbl('🏆 Total Score <small>/390</small>',inp('mock','total',d,m.total,'Total'))+lbl('📊 Percentile',inp('mock','pct',d,m.pct,'%ile'))+'</div>';
  var sum=0;
  MSUB.forEach(function(u){ var k=u[0], R=m[k+'R'], W=m[k+'W'], rw=nz(R)+nz(W), acc=rw>0?Math.round(nz(R)/rw*100):null; sum+=nz(m[k]);
    h+='<div class="mtSub" style="--c:'+u[3]+'"><div class="mtSubH"><b>'+u[1]+' '+u[2]+'</b><em>'+(acc===null?'max '+u[4]:'🎯 '+acc+'% sahi')+'</em></div><div class="mtGrid">'+
      lbl('Score <small>/'+u[4]+'</small>',inp('mock',k,d,m[k],'Score'))+lbl('✅ Sahi',inp('mock',k+'R',d,R,'Right'))+lbl('❌ Galat',inp('mock',k+'W',d,W,'Wrong'))+'</div></div>'; });
  var R=nz(m.right), W=nz(m.wrong), acc=(R+W)>0?Math.round(R/(R+W)*100)+'%':'—';
  h+='<div class="mtSum"><span>✅ <b>'+R+'</b> Sahi</span><span>❌ <b>'+W+'</b> Galat</span><span>🎯 <b>'+acc+'</b></span><span>➕ <b>'+sum+'</b> Sum</span></div>';
  if(!filled(m.total)&&sum>0) h+='<button type="button" class="mtUse" data-mt-sum="'+d+'">Total = '+sum+' use karo</button>';
  return h+'</div>'; }
document.addEventListener('click',function(e){ var t=e.target&&e.target.closest&&e.target.closest('[data-mt-sum]'); if(!t) return; var d=+t.getAttribute('data-mt-sum'), m=rec(d).mock, S=0; MSUB.forEach(function(u){ S+=nz(m[u[0]]); }); m.total=S; commit(d,true); });
(function(){ var css='.mtL{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--muted);font-weight:600}.mtL small{opacity:.7;font-weight:500}.mtL1{margin-bottom:8px}.mtGrid.g2{grid-template-columns:repeat(2,1fr);margin-bottom:8px}'+
 '.mtSub{border-left:4px solid var(--c);background:rgba(255,255,255,.04);border-radius:12px;padding:8px 10px 10px;margin-bottom:8px}.mtSubH{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.mtSubH b{font-size:13.5px;color:var(--c)}.mtSubH em{font-style:normal;font-size:11px;color:var(--muted)}'+
 '.mtSum{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}.mtSum span{flex:1;min-width:70px;text-align:center;font-size:11px;padding:7px 4px;border-radius:10px;background:rgba(255,255,255,.06);color:var(--muted)}.mtSum b{display:block;font-size:15px;color:var(--text)}'+
 '.mtUse{width:100%;margin-top:8px;border:1px dashed #38bdf8;background:rgba(56,189,248,.1);color:#7dd3fc;border-radius:10px;padding:9px;font-weight:700;font-size:12.5px;cursor:pointer}';
 var st=document.createElement('style'); st.id='mtCSS7'; st.textContent=css; document.head.appendChild(st); })();
/* ---- v8: typing ke dauraan redraw nahi (keyboard band na ho) ---- */
var BUSY=false, PEND=false, _rp8=renderPage;
function isTypeEl(t){ return !!(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA')&&t.closest&&t.closest('#mtBody')); }
renderPage=function(){ if(BUSY){ PEND=true; return; } PEND=false; _rp8(); };
document.addEventListener('focusin',function(e){ if(isTypeEl(e.target)) BUSY=true; });
document.addEventListener('focusout',function(e){ if(!isTypeEl(e.target)) return; setTimeout(function(){ if(!isTypeEl(document.activeElement)){ BUSY=false; if(PEND) renderPage(); } },0); });

/* ---- v9: Today tab = sirf Mains, 30% rule, Mains se paise ---- */
function mainsOn(){ return !!(state&&state.mainsOnly===true); }
function DAILY(){ return (typeof DAILY_TARGET!=='undefined')?DAILY_TARGET:5000; }
function onlyBtn(){ return '<button type="button" class="mtOnlyBtn" data-mt-only="toggle">'+(mainsOn()?'🔁 App ke normal tasks bhi dikhao':'🎯 Sirf Mains Target dikhao')+'</button>'; }
function earnLine(){ try{ var dn=todayDayNum(), e=dayEarnLoss(getDay(dn),dn).earned; return '<div class="mtEarn">💰 Aaj ki kamai: <b>₹'+Math.round(e).toLocaleString('en-IN')+'</b>'+(mainsOn()?' · Mains ke kaam se':'')+'</div>'; }catch(x){ return ''; } }
function syncEarn(d){
  var p=planOf(d), r=rec(d), it=items(p), N=it.length, AMT=amtMap(d); if(!state.mainsEarn) state.mainsEarn={};
  it.forEach(function(x){ var id='mt_d'+d+'_'+x.k, on=isTicked(r,x.k), cur=state.mainsEarn[id], dd, i;
    if(on&&!cur){ var ad=todayDayNum(); dd=getDay(ad); if(!Array.isArray(dd.quizLog)) dd.quizLog=[];
      dd.quizLog.push({label:'🎯 Mains D'+d+' · '+x.t,correct:1,total:1,ts:Date.now(),mt:1,id:id,n:N,amt:AMT[x.k]}); state.mainsEarn[id]=ad; }
    else if(on&&cur){ dd=getDay(cur); i=(dd.quizLog||[]).findIndex(function(q){ return q&&q.id===id; }); if(i>=0&&dd.quizLog[i].amt!==AMT[x.k]) dd.quizLog[i].amt=AMT[x.k]; }
    else if(!on&&cur){ dd=getDay(cur); i=(dd.quizLog||[]).findIndex(function(q){ return q&&q.id===id; }); if(i>=0) dd.quizLog.splice(i,1); delete state.mainsEarn[id]; } }); }
function mtVals(st,d,len,orig){
  if(!(st&&st.mainsOnly===true)) return orig();
  var ql=(d&&d.quizLog)||[], v=[], i, base=6, sum=0; for(i=0;i<len;i++) v.push(0);
  ql.forEach(function(q){ if(q&&q.mt&&q.n) base=Math.max(base,q.n); });
  ql.forEach(function(q){ var x=(q&&q.mt&&typeof q.amt==='number')?q.amt:DAILY()/((q&&q.mt&&q.n)?q.n:base); v.push(x); sum+=x; });
  if(sum>DAILY()){ var f=DAILY()/sum; for(i=len;i<v.length;i++) v[i]=v[i]*f; }
  for(i=len;i<v.length;i++) v[i]=Math.round(v[i]); return v; }
function hookMoney(){
  try{ if(typeof dayTaskValues==='function' && !dayTaskValues.__mt){ var o1=dayTaskValues; var w1=function(d){ return mtVals(state,d,TASKS.length,function(){ return o1(d); }); }; w1.__mt=1; try{ dayTaskValues=w1; }catch(e){ window.dayTaskValues=w1; } }
    if(typeof dayTaskValuesFrom==='function' && !dayTaskValuesFrom.__mt){ var o2=dayTaskValuesFrom; var w2=function(st,d){ return mtVals(st,d,getTaskDefsFromState(st).length,function(){ return o2(st,d); }); }; w2.__mt=1; try{ dayTaskValuesFrom=w2; }catch(e){ window.dayTaskValuesFrom=w2; } }
  }catch(e){ console.warn('mt money',e); } }
var _commit9=commit;
commit=function(d,sc){ try{ syncEarn(d); }catch(e){ console.warn('mt earn',e); } _commit9(d,sc); };
var _rp9=renderPage;
renderPage=function(){ _rp9(); var pg=document.getElementById('mtBody'); if(!pg) return;
  try{ var b=document.createElement('div'); b.className='mtOnlyRow'; b.innerHTML='<button type="button" class="mtOnlyBtn on'+(mainsOn()?'':' off')+'" data-mt-only="toggle">'+(mainsOn()?'✅ Today tab mein sirf Mains Target · paise Mains se':'⬜ Today tab mein sirf Mains Target (OFF)')+'</button>'; pg.appendChild(b); }catch(e){} };
document.addEventListener('click',function(e){ var t=e.target&&e.target.closest&&e.target.closest('[data-mt-only]'); if(!t) return; state.mainsOnly=!mainsOn(); try{ save(); }catch(x){} try{ if(typeof renderPanel==='function') renderPanel(); }catch(x){} renderToday(); renderPage(); });
(function(){ var css='#panel.mtOnly>:not(#mtTodayPanel){display:none!important}.mtEarn{margin:0 0 8px;padding:8px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(52,211,153,.18),rgba(250,204,21,.14));border:1px solid rgba(52,211,153,.45);font-size:13px;color:var(--text)}.mtEarn b{color:#34d399;font-size:15px}'+
 '.mtOnlyBtn{width:100%;margin-top:8px;border:1px dashed var(--border);background:rgba(255,255,255,.04);color:var(--muted);border-radius:12px;padding:10px;font-size:12.5px;font-weight:700;cursor:pointer}.mtOnlyRow{margin-bottom:14px}.mtOnlyBtn.on{border-color:#34d399;color:#6ee7b7;background:rgba(52,211,153,.1)}.mtOnlyBtn.off{border-color:var(--border);color:var(--muted);background:rgba(255,255,255,.04)}';
 var st=document.createElement('style'); st.id='mtCSS9'; st.textContent=css; document.head.appendChild(st); })();

/* ---- v10: Today tab me manual din badalna ---- */
function todayNav(d,pr){
  var ready30=pr.pct>=30, last=d>=PLAN.length;
  return '<div class="mtDayNav">'+
    '<button type="button" class="mtDnB" data-mt-tday="-1"'+(d<=1?' disabled':'')+'>‹ Pichhla din</button>'+
    '<button type="button" class="mtDnB nx'+(ready30?' go':'')+'" data-mt-tday="1"'+(last?' disabled':'')+'>'+(last?'Last din ✅':(ready30?'✅ Agla din (Day '+(d+1)+') ›':'Agla din (Day '+(d+1)+') ›'))+'</button></div>'+
    '<div class="mtDnHint">Din apne aap nahi badlega — jab tum chaho tab <b>Agla din</b> dabao.</div>';
}
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest&&e.target.closest('[data-mt-tday],[data-mt-setday]'); if(!t||t.disabled) return;
  e.preventDefault(); e.stopPropagation();
  if(t.hasAttribute('data-mt-setday')) return setCurDay(+t.getAttribute('data-mt-setday'));
  setCurDay(firstPending()+(+t.getAttribute('data-mt-tday')));
},true);
/* Mains page: dekha hua din Today me lagane ka button */
var _rp10=renderPage;
renderPage=function(){ _rp10(); var pg=document.getElementById('mtBody'); if(!pg) return;
  try{ var card=pg.querySelector('.mtCard'); if(!card||card.querySelector('[data-mt-setday]')) return; var cd=firstPending();
    if(selDay&&selDay!==cd){ var b=document.createElement('button'); b.type='button'; b.className='mtDnB set'; b.setAttribute('data-mt-setday',selDay); b.textContent='📌 Day '+selDay+' ko Today tab mein lagao'; card.appendChild(b); } }catch(e){} };
(function(){ var css='.mtDayNav{display:flex;gap:8px;margin-top:10px}.mtDnB{flex:1;border:1px solid var(--border);background:rgba(255,255,255,.06);color:var(--text);border-radius:12px;padding:11px 8px;font-size:13px;font-weight:800;cursor:pointer}.mtDnB.nx{background:linear-gradient(135deg,#7c3aed,#2563eb);border-color:transparent;color:#fff}.mtDnB.go{background:linear-gradient(135deg,#10b981,#06b6d4);box-shadow:0 0 14px rgba(16,185,129,.45)}.mtDnB:disabled{opacity:.4}.mtDnB.set{width:100%;margin-top:10px;border-style:dashed;color:#7dd3fc}.mtDnHint{margin-top:6px;font-size:11.5px;color:var(--muted);text-align:center}.mtDnHint b{color:#7dd3fc}';
 var st=document.createElement('style'); st.id='mtCSS10'; st.textContent=css; document.head.appendChild(st); })();
/* ---- v12: Members ka Mains Target (dusre members ne kitna kiya — sirf dekhne ke liye) ---- */
var MEM={at:0,busy:false,data:{},names:[],sel:null,day:null,err:false};
function mpOf(st){ var m=st&&st.mainsPlan; return (m&&typeof m==='object'&&!Array.isArray(m))?m:{}; }
function prOf(mp,d){ var p=planOf(d), r=mp[d]||{}, rr=tickView(r), it=items(p), done=0; it.forEach(function(x){ if(isTicked(rr,x.k)) done++; }); return {done:done,total:it.length,pct:Math.round(done/it.length*100)}; }
function scoreOf(mp,d){ var r=mp[d]; if(!r) return false; var p=planOf(d);
  if(p.kind==='mock') return !!(r.mock&&filled(r.mock.total));
  return !!(r.sect&&['m1','m2','r1','r2'].some(function(k){ return r.sect[k]&&filled(r.sect[k].score); })); }
function mstats(st){
  var mp=mpOf(st), daysDone=0, solved=0, best=0, run=0, xp=0, scores=0, streak=0, pcts=[], active=false, d, cur=parseInt(st&&st.mainsCur,10);
  for(d=1; d<=PLAN.length; d++){ var pr=prOf(mp,d); if(pr.pct>0) active=true;
    if(pr.pct===100){ daysDone++; run++; if(run>best) best=run; xp+=50; } else run=0;
    xp+=pr.done*10; if(scoreOf(mp,d)){ scores++; xp+=25; }
    var r=mp[d]; if(r&&r.maths&&r.maths.solved){ var sv=parseFloat(r.maths.solved)||0; solved+=sv; xp+=Math.round(sv/2); if(sv>0) active=true; }
    if(r&&r.mock&&parseFloat(r.mock.pct)) pcts.push(parseFloat(r.mock.pct)); }
  if(!(cur>=1&&cur<=PLAN.length)){ cur=PLAN.length; for(d=1; d<=PLAN.length; d++){ if(prOf(mp,d).pct<30){ cur=d; break; } } }
  for(var e=cur; e>=1; e--){ if(prOf(mp,e).pct===100) streak++; else if(e===cur) continue; else break; }
  var avg=pcts.length?Math.round(pcts.reduce(function(a,b){return a+b;},0)/pcts.length):null;
  return {mp:mp,daysDone:daysDone,solved:solved,best:best,streak:streak,xp:xp,scores:scores,cur:cur,avg:avg,active:active||scores>0}; }
function memNames(){
  var out=[], seen={}; function add(n){ if(!n) return; var k=String(n).toLowerCase(); if(seen[k]) return; seen[k]=1; out.push(n); }
  add(typeof myName!=='undefined'?myName:null);
  return Promise.resolve().then(function(){ return (typeof loadRoomRegistry==='function')?loadRoomRegistry():[]; }).catch(function(){ return []; }).then(function(rn){
    (rn||[]).forEach(add);
    try{ if(typeof loadFriendsList==='function') (loadFriendsList()||[]).forEach(add); }catch(e){}
    try{ if(typeof getRoomCode==='function'&&getRoomCode()&&typeof visibleNamesFor==='function') out=visibleNamesFor(out); }catch(e){}
    return out; }); }
function memLoad(force){
  if(MEM.busy) return; if(!force && MEM.at && Date.now()-MEM.at<25000) return;
  if(typeof loadPlayerState!=='function') return; MEM.busy=true; paintMem();
  memNames().then(function(names){ MEM.names=names;
    return Promise.all(names.map(function(nm){ return loadPlayerState(nm).then(function(st){ MEM.data[nm.toLowerCase()]=st||{}; }).catch(function(){}); })); })
  .then(function(){ MEM.err=false; }).catch(function(e){ MEM.err=true; console.warn('mt members',e); })
  .then(function(){ MEM.busy=false; MEM.at=Date.now(); paintMem(); }); }
function isMe(nm){ return typeof myName!=='undefined' && String(nm).toLowerCase()===String(myName).toLowerCase(); }
function stOf(nm){ if(isMe(nm) && typeof viewingName!=='undefined' && viewingName===myName) return state; return MEM.data[String(nm).toLowerCase()]||{}; }
function miniCal(S,sel){ var h='<div class="mtCal mtCalM">'; PLAN.forEach(function(p){ var d=p.d, pr=prOf(S.mp,d), cls=pr.pct===100?' full':pr.pct>0?' part':'';
  h+='<button type="button" class="mtCell'+cls+(d===sel?' sel':'')+(d===S.cur?' today':'')+'" data-mt-mday="'+d+'" style="--c:'+phCol(p.phase)+'"><b>'+d+'</b><small>'+(pr.pct===100?'✓':pr.pct>0?pr.pct+'%':(p.kind==='mock'?'M':'S'))+(scoreOf(S.mp,d)?' •':'')+'</small></button>'; }); return h+'</div>'; }
function dayDetail(S,d){ var p=planOf(d), r=S.mp[d]||{}, rm=r.maths||{}, rr=tickView(r,rm), pr=prOf(S.mp,d), h='';
  h+='<div class="mtMemDay" style="--c:'+phCol(p.phase)+'"><div class="mtMemDayH"><b>Day '+d+(d===S.cur?' · abhi yahan':'')+'</b><span>'+esc(p.phase)+' · '+(p.kind==='mock'?'Full Mock':'Sectional')+' · '+pr.done+'/'+pr.total+'</span></div>';
  items(p).forEach(function(x){ var on=isTicked(rr,x.k); h+='<div class="mtRow'+(on?' on':'')+' mtRO"><span class="mtChk">'+(on?'✓':'')+'</span><span class="mtTxt"><b>'+x.ic+' '+esc(x.t)+'</b>'+(x.k==='maths'?'<i>'+(parseFloat(rm.solved)||0)+'/'+p.maths.q+' Q'+(rm.mins?' · '+rm.mins+' min':'')+'</i>':(x.s?'<i>'+esc(x.s)+'</i>':''))+'</span></div>'; });
  if(p.kind==='mock'){ var m=r.mock||{}; if(filled(m.total)||filled(m.pct)) h+='<div class="mtMemSc">🏆 Mock'+(m.name?' · '+esc(m.name):'')+': <b>'+(filled(m.total)?m.total:'-')+'</b>/390'+(filled(m.pct)?' · '+m.pct+' %ile':'')+(filled(m.math)||filled(m.reas)||filled(m.eng)||filled(m.gk)?'<br><small>M '+(filled(m.math)?m.math:'-')+' · R '+(filled(m.reas)?m.reas:'-')+' · E '+(filled(m.eng)?m.eng:'-')+' · GK '+(filled(m.gk)?m.gk:'-')+'</small>':'')+'</div>'; }
  else { var sc=[['m1','Maths 1'],['m2','Maths 2'],['r1','Reas 1'],['r2','Reas 2']].filter(function(k){ return r.sect&&r.sect[k[0]]&&filled(r.sect[k[0]].score); }).map(function(k){ return k[1]+': <b>'+r.sect[k[0]].score+'</b>/90'; }); if(sc.length) h+='<div class="mtMemSc">🎯 '+sc.join(' · ')+'</div>'; }
  return h+'</div>'; }
function memHTML(){
  var rows=MEM.names.map(function(nm){ var st=stOf(nm); return {nm:nm,S:mstats(st)}; }), act=rows.filter(function(r){ return r.S.active; }).sort(function(a,b){ return b.S.xp-a.S.xp||b.S.daysDone-a.S.daysDone; }), idle=rows.filter(function(r){ return !r.S.active; });
  var h='<div class="mtSec">👥 Members ka Mains Target <em class="mtEm">'+act.length+' kar rahe hain</em></div><div class="mtMemBox">';
  if(!MEM.names.length) h+='<div class="mtMemEmpty">'+(MEM.busy?'⏳ Members load ho rahe hain...':(MEM.err?'⚠️ Members load nahi hue — dubara try karo.':'Abhi koi member nahi mila.'))+'</div>';
  act.forEach(function(r,i){ var S=r.S, lv=levelOf(S.xp), pc=Math.round(S.daysDone/PLAN.length*100), open=MEM.sel&&MEM.sel.toLowerCase()===r.nm.toLowerCase(), medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    h+='<div class="mtMem'+(open?' open':'')+(isMe(r.nm)?' me':'')+'"><button type="button" class="mtMemTop" data-mt-mem="'+esc(r.nm)+'"><span class="mtMemRk">'+medal+'</span><span class="mtMemAv">'+esc(r.nm.charAt(0).toUpperCase())+'</span><span class="mtMemMid"><b>'+esc(r.nm)+(isMe(r.nm)?' <u>Tum</u>':'')+'</b><small>'+lv.ic+' '+lv.name+' · Day '+S.cur+' · ✅ '+S.daysDone+'/'+PLAN.length+' · 🔥 '+S.streak+' · 📐 '+S.solved+' Q'+(S.avg!==null?' · 📈 '+S.avg+'%':'')+'</small><div class="mtBar sm"><div style="width:'+pc+'%"></div></div></span><span class="mtMemXp">⭐ '+S.xp+'<small>'+(open?'▲':'▼')+'</small></span></button>';
    if(open){ var sd=(MEM.day&&MEM.day>=1&&MEM.day<=PLAN.length)?MEM.day:S.cur; h+='<div class="mtMemDet"><div class="mtMemSt"><div><b>'+S.daysDone+'</b><small>Days done</small></div><div><b>'+S.solved+'</b><small>Q solved</small></div><div><b>'+S.best+'</b><small>Best streak</small></div><div><b>'+S.scores+'</b><small>Scores</small></div></div>'+miniCal(S,sd)+dayDetail(S,sd)+'<div class="mtMemNote">👀 Sirf dekhne ke liye — edit nahi hota.</div></div>'; }
    h+='</div>'; });
  if(idle.length) h+='<div class="mtMemIdle">⏳ Abhi shuru nahi kiya: '+idle.map(function(r){ return esc(r.nm); }).join(', ')+'</div>';
  h+='<button type="button" class="mtMemRef" data-mt-memref="1">'+(MEM.busy?'⏳ Refresh ho raha hai...':'🔄 Refresh')+'</button></div>';
  return h; }
function paintMem(){ var pg=document.getElementById('mtBody'); if(!pg) return; var box=document.getElementById('mtMem');
  if(!box){ box=document.createElement('div'); box.id='mtMem'; var more=pg.querySelector('.mtMore'); if(more) pg.insertBefore(box,more); else pg.appendChild(box); }
  try{ box.innerHTML=memHTML(); }catch(e){ console.warn('mt mem paint',e); } }
var _rp12=renderPage;
renderPage=function(){ _rp12(); try{ var old=document.getElementById('mtMem'); if(old) old.remove(); paintMem(); memLoad(false); }catch(e){ console.warn('mt v12',e); } };
document.addEventListener('click',function(e){ var t=e.target&&e.target.closest&&e.target.closest('[data-mt-mem],[data-mt-mday],[data-mt-memref]'); if(!t) return;
  if(t.hasAttribute('data-mt-memref')){ memLoad(true); return; }
  if(t.hasAttribute('data-mt-mday')){ MEM.day=+t.getAttribute('data-mt-mday'); paintMem(); return; }
  var nm=t.getAttribute('data-mt-mem'); if(MEM.sel&&MEM.sel.toLowerCase()===nm.toLowerCase()){ MEM.sel=null; MEM.day=null; } else { MEM.sel=nm; MEM.day=null; } paintMem(); });
setInterval(function(){ var pg=document.getElementById('calcPage-mainstarget'); if(pg&&pg.classList.contains('active')) memLoad(false); },30000);
(function(){ var css='.mtMemBox{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}.mtMem{background:var(--card,#141b2d);border:1px solid var(--border);border-radius:16px;overflow:hidden}.mtMem.me{border-color:#fbbf24}.mtMem.open{border-color:#a78bfa}'+
 '.mtMemTop{width:100%;display:flex;align-items:center;gap:9px;padding:11px;background:none;border:0;color:var(--text);text-align:left;cursor:pointer}.mtMemRk{width:24px;text-align:center;font-weight:800;font-size:15px;flex:none;color:var(--muted)}'+
 '.mtMemAv{width:36px;height:36px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;background:linear-gradient(135deg,#8b5cf6,#38bdf8)}'+
 '.mtMemMid{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.mtMemMid b{font-size:14px}.mtMemMid b u{text-decoration:none;font-size:10px;background:#fbbf24;color:#0b1220;border-radius:99px;padding:1px 7px;margin-left:4px}.mtMemMid small{font-size:11px;color:var(--muted)}'+
 '.mtMemXp{flex:none;text-align:right;font-weight:800;font-size:13px;color:#fbbf24;display:flex;flex-direction:column}.mtMemXp small{font-size:10px;color:var(--muted)}'+
 '.mtMemDet{padding:0 11px 12px}.mtMemSt{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.mtMemSt div{text-align:center;padding:8px 2px;border-radius:12px;background:rgba(255,255,255,.05)}.mtMemSt b{display:block;font-size:16px;color:#38bdf8}.mtMemSt small{font-size:10px;color:var(--muted)}'+
 '.mtCalM{margin-bottom:10px}.mtMemDay{border-left:4px solid var(--c);background:rgba(255,255,255,.03);border-radius:12px;padding:10px}.mtMemDayH{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px;flex-wrap:wrap}.mtMemDayH b{font-size:14px;color:var(--text)}.mtMemDayH span{font-size:11px;color:var(--c)}'+
 '.mtRO{cursor:default}.mtRO:active{transform:none}.mtMemSc{margin-top:8px;font-size:12.5px;padding:8px 10px;border-radius:10px;background:rgba(251,146,60,.1);border:1px dashed rgba(251,146,60,.4);color:var(--text)}.mtMemSc small{color:var(--muted)}'+
 '.mtMemNote{font-size:11px;color:var(--muted);text-align:center;margin-top:8px}.mtMemIdle{font-size:12px;color:var(--muted);padding:8px 4px}.mtMemEmpty{text-align:center;padding:16px;color:var(--muted);font-size:13px}'+
 '.mtMemRef{border:1px solid var(--border);background:rgba(255,255,255,.05);color:var(--text);border-radius:12px;padding:10px;font-weight:700;font-size:13px;cursor:pointer}';
 var st=document.createElement('style'); st.id='mtCSS12'; st.textContent=css; document.head.appendChild(st); })();
var tries=0;
(function boot(){
  if(!ready()){ if(++tries<200) return setTimeout(boot,150); return; }
  try{ for(var q=1;q<=PLAN.length;q++) PCT[q]=dayProgress(q).pct; inject(); hookPanel(); }catch(e){ console.error('mains-target init',e); }
  /* data cloud/local se baad me load ho to dubara draw */
  var n=0, iv=setInterval(function(){ renderToday(); if(++n>12) clearInterval(iv); },1500);
})();
/* ---- Daily RC/Cloze/PQRS: PYQ Reading (98 Sets) ka aaj ka set seedha kholo (Day N = Set N) ---- */
document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest&&e.target.closest('[data-mt-pyq]'); if(!b) return;
  e.stopPropagation(); e.preventDefault();
  var n=+b.getAttribute('data-mt-pyq')||1, lab='PYQ Reading — 98 Sets';
  (async function(){
    try{
      await openSPSubject('rd98',lab,true);
      var list=(typeof spCurrentEntries!=='undefined'&&spCurrentEntries)||[];
      var en=list.filter(function(x){ return +x.n===n; })[0]||list[n-1];
      if(en) await openSPMock('rd98',en.file,lab,en);
    }catch(x){ console.warn('mt pyq open',x); }
  })();
},true);
/* ---- Daily Calculation: Mains Target se Calculation Speed Test kholo; Submit hote hi us din ka Calculation tick ---- */
var MT_CALC_DAY=0;
document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest&&e.target.closest('[data-mt-calc]'); if(!b) return;
  e.stopPropagation(); e.preventDefault();
  MT_CALC_DAY=+b.getAttribute('data-mt-calc')||0;
  try{ showCalcPage('speedtest'); }catch(x){ console.warn('mt calc open',x); }
},true);
window.addEventListener('message',function(e){
  var m=e&&e.data; if(!m||m.type!=='examTrackerCalcSpeedComplete'||!MT_CALC_DAY) return;
  var d=MT_CALC_DAY; MT_CALC_DAY=0;
  try{ var r=rec(d); if(!r.calc){ r.calc=true; commit(d,false); } }catch(x){ console.warn('mt calc tick',x); }
});
/* ---- UI v13: premium card design (gold accent bar, gradient cards, pill badges) ---- */
(function(){ var css=''+
 'html body .mtHero{background:linear-gradient(135deg,#1a1242 0%,#4b1d6e 38%,#b8400f 78%,#f2a93b 100%);background-size:200% 200%;border:1px solid rgba(255,210,122,.38);border-radius:22px;padding:18px;box-shadow:0 12px 36px rgba(124,58,237,.28),inset 0 1px 0 rgba(255,255,255,.14)}'+
 'html body .mtH1{font-size:22px;letter-spacing:.3px}html body .mtH2{color:#ffe3b8}'+
 'html body .mtPills span{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2);font-weight:700;backdrop-filter:blur(6px)}'+
 'html body .mtLvl,html body .mtStats div{background:linear-gradient(160deg,#16223f,#0d1526 70%);border:1px solid rgba(255,255,255,.08);border-radius:16px}'+
 'html body .mtStats b{background:linear-gradient(180deg,#ffe3a3,#f2b544);-webkit-background-clip:text;background-clip:text;color:transparent}'+
 'html body .mtQuote{background:linear-gradient(90deg,rgba(242,181,68,.18),rgba(242,181,68,.03));border-left:4px solid #f2b544;border-radius:12px}'+
 'html body .mtSec{display:flex;align-items:center;gap:8px;font-size:13px;letter-spacing:.6px}html body .mtSec:before{content:"";width:4px;height:16px;border-radius:3px;background:linear-gradient(180deg,#ffd27a,#f2b544)}'+
 'html body .mtChip{border-radius:12px}html body .mtChip.full:before{background:linear-gradient(145deg,color-mix(in srgb,var(--c) 45%,#0b1220),#0b1220)}'+
 'html body .mtCard{background:linear-gradient(160deg,#141f38,#0b1424 70%);border:1px solid rgba(255,255,255,.08);border-top:2px solid var(--c);border-radius:22px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.38)}'+
 'html body .mtDayT{font-size:19px;letter-spacing:.2px}'+
 'html body .mtDayS{display:inline-block;font-weight:700;padding:3px 10px;border-radius:99px;background:color-mix(in srgb,var(--c) 18%,transparent);border:1px solid color-mix(in srgb,var(--c) 55%,transparent)}'+
 'html body .mtSecCard{position:relative;overflow:hidden;background:linear-gradient(160deg,rgba(27,40,70,.96),rgba(13,21,38,.96) 70%);border:1px solid rgba(255,255,255,.07);border-radius:18px;padding:12px 12px 6px 17px;margin:0 0 12px;box-shadow:0 4px 16px rgba(0,0,0,.25)}'+
 'html body .mtSecCard:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:4px;border-radius:0 4px 4px 0;background:linear-gradient(180deg,#ffd27a,#f2b544 55%,#3ecf8e)}'+
 'html body .mtSecCard.fin{border-color:rgba(52,211,153,.45);box-shadow:0 4px 18px rgba(52,211,153,.12)}html body .mtSecCard.off{opacity:.7}'+
 'html body .mtSecH{display:flex;align-items:center;gap:10px;margin-bottom:10px}'+
 'html body .mtSecIc{width:34px;height:34px;flex:none;border-radius:11px;background:linear-gradient(145deg,#ffd27a,#e0942a);display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 4px 12px rgba(242,181,68,.35)}'+
 'html body .mtSecT{font-size:12.5px;font-weight:800;letter-spacing:.9px;color:#ffd27a}'+
 'html body .mtPill{margin-left:auto;font-size:12px;font-weight:800;color:#ffd27a;background:rgba(242,181,68,.12);border:1px solid rgba(242,181,68,.5);border-radius:99px;padding:4px 12px;white-space:nowrap}'+
 'html body .mtPill.done{color:#6ee7b7;background:rgba(52,211,153,.14);border-color:rgba(52,211,153,.55)}'+
 'html body .mtRow{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:11px 12px;margin-bottom:7px}'+
 'html body .mtChk{width:26px;height:26px;border-radius:9px;border:2px solid rgba(255,255,255,.28)}'+
 'html body .mtRow.on{background:linear-gradient(135deg,rgba(52,211,153,.17),rgba(52,211,153,.05));border-color:rgba(52,211,153,.5)}'+
 'html body .mtRow.on .mtChk{background:linear-gradient(145deg,#6ee7b7,#22c55e);border-color:transparent;box-shadow:0 0 10px rgba(52,211,153,.5)}'+
 'html body .mtRs{color:#ffd27a;background:rgba(242,181,68,.12);border:1px solid rgba(242,181,68,.3)}html body .mtRow.on .mtRs{color:#6ee7b7;background:rgba(52,211,153,.14);border-color:rgba(52,211,153,.4)}html body .mtRow:not(.on) .mtRs{color:#ffd27a;background:rgba(242,181,68,.1)}'+
 'html body .mtQBar{height:8px}html body .mtQBar div{background:linear-gradient(90deg,#f2b544,#3ecf8e)}'+
 'html body .mtQBtns span{color:#ffd27a}'+
 'html body .mtQBtns button{background:linear-gradient(160deg,#1d2c4f,#121d36);border:1px solid rgba(242,181,68,.4);color:#ffd27a;padding:6px 13px}'+
 'html body .mtQBtns button.full{background:linear-gradient(135deg,#ffd27a,#f2b544);border-color:transparent;color:#2a1c05;box-shadow:0 4px 14px rgba(242,181,68,.35)}'+
 'html body .mtFill input,html body .mtGrid input,html body .mtNotes{background:rgba(8,14,28,.7);border:1px solid rgba(255,255,255,.12);border-radius:12px}'+
 'html body .mtFill input:focus,html body .mtGrid input:focus,html body .mtNotes:focus{outline:none;border-color:#f2b544;box-shadow:0 0 0 3px rgba(242,181,68,.22)}'+
 'html body .mtScore{background:linear-gradient(160deg,rgba(242,181,68,.09),rgba(242,181,68,.02));border:1px solid rgba(242,181,68,.35);border-radius:16px;margin:4px 0 8px}html body .mtScoreT{color:#ffd27a}'+
 'html body .mtOff{color:var(--muted,#8ea0bd);font-size:12.5px;padding:2px 2px 8px}'+
 'html body .mtNav button{background:linear-gradient(160deg,#1d2c4f,#121d36);border:1px solid rgba(242,181,68,.35);color:#ffd27a;border-radius:14px;padding:12px}'+
 'html body .mtToday .mtSecCard{margin-bottom:10px}';
 var st=document.createElement('style'); st.id='mtCSS13'; st.textContent=css; document.head.appendChild(st); })();
window.mainsTarget={open:openPage,render:refresh,sync:syncScores};
})();
