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
  var a=[{k:'maths',ic:'📐',t:'Maths: '+p.maths.t,s:p.maths.r+' · '+p.maths.m+' min · target '+p.maths.q+' Q'},
         {k:'formula',ic:'📝',t:'Formula: '+p.formula,s:''}];
  if(p.gk) a.push({k:'gk',ic:'🌍',t:'GK R'+p.gk.round+': '+p.gk.subject,s:p.gk.detail});
  a.push({k:'weekly',ic:'🔤',t:p.weekly,s:'English weekly'});
  a.push({k:'grammar',ic:'✍️',t:'Grammar: '+p.grammar,s:''});
  if(p.ct){ a.push({k:'comp',ic:'💻',t:'Computer',s:'20 min'}); a.push({k:'typing',ic:'⌨️',t:'Typing',s:'20 min'}); }
  return a;
}
function isTicked(r,k){ return k==='maths' ? !!r.maths.done : !!r[k]; }
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
  var daysDone=0, solved=0, streak=0, best=0, run=0, xp=0, scores=0, td=todayDayNum();
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
function controlsHTML(d, compact){
  var p=planOf(d), r=rec(d), h='';
  items(p).forEach(function(x){
    var on=isTicked(r,x.k);
    h+='<div class="mtRow'+(on?' on':'')+'" data-mt-tick="'+x.k+'" data-d="'+d+'"><span class="mtChk">'+(on?'✓':'')+'</span><span class="mtTxt"><b>'+x.ic+' '+esc(x.t)+'</b>'+(x.s?'<i>'+esc(x.s)+'</i>':'')+'</span></div>';
    if(x.k==='maths'){
      h+='<div class="mtFill"><label>Solved Q<input type="number" inputmode="numeric" min="0" data-mt-f="solved" data-d="'+d+'" value="'+esc(r.maths.solved===undefined?'':r.maths.solved)+'" placeholder="/'+p.maths.q+'"></label>'+
         '<label>Time (min)<input type="number" inputmode="numeric" min="0" data-mt-f="mins" data-d="'+d+'" value="'+esc(r.maths.mins===undefined?'':r.maths.mins)+'" placeholder="'+p.maths.m+'"></label></div>';
      var sq=parseFloat(r.maths.solved)||0, qp=Math.min(100,Math.round(sq/p.maths.q*100));
      h+='<div class="mtQBar"><div style="width:'+qp+'%"></div></div><div class="mtQBtns"><span>'+sq+'/'+p.maths.q+' Q</span><button type="button" data-mt-q="'+d+'|10">+10</button><button type="button" data-mt-q="'+d+'|25">+25</button><button type="button" data-mt-q="'+d+'|50">+50</button><button type="button" class="full" data-mt-q="'+d+'|full">✅ Full</button></div>';
    }
  });
  if(!p.gk) h+='<div class="mtOff">🌍 GK: aaj OFF day</div>';
  if(!compact){
    h+='<textarea class="mtNotes" data-mt-f="notes" data-d="'+d+'" placeholder="Notes (aaj kya seekha / kahan atka)...">'+esc(r.notes||'')+'</textarea>';
  }
  h+=scoreHTML(d,p,r,compact);
  return h;
}
function inp(k,sub,d,val,ph,w){ return '<input type="'+(sub==='name'?'text':'number')+'" '+(sub==='name'?'':'inputmode="decimal" step="any" ')+'data-mt-s="'+k+'" data-sub="'+sub+'" data-d="'+d+'" value="'+esc(val===undefined?'':val)+'" placeholder="'+ph+'"'+(w?' style="grid-column:span '+w+'"':'')+'>'; }
function scoreHTML(d,p,r,compact){
  var h='<div class="mtScore"><div class="mtScoreT">'+(p.kind==='mock'?'🏆 Full Mock Score':'🎯 Sectional Scores (2 Maths + 2 Reasoning)')+' <span>→ Score tab me auto</span></div>';
  if(p.kind==='mock'){
    var m=r.mock; h+='<div class="mtGrid">'+inp('mock','name',d,m.name,'Mock name',2)+inp('mock','total',d,m.total,'Total')+inp('mock','pct',d,m.pct,'Percentile')+
      inp('mock','math',d,m.math,'Maths')+inp('mock','eng',d,m.eng,'English')+inp('mock','gk',d,m.gk,'GK')+inp('mock','reas',d,m.reas,'Reasoning')+inp('mock','right',d,m.right,'Correct')+inp('mock','wrong',d,m.wrong,'Wrong')+'</div>';
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
    if(!ready()) return;
    if(typeof viewingName!=='undefined' && typeof myName!=='undefined' && viewingName!==myName) return;
    var panel=document.getElementById('panel'); if(!panel) return;
    var old=document.getElementById('mtTodayPanel'); if(old) old.remove();
    var d=todayDayNum(), p=planOf(d), pr=dayProgress(d), c=phCol(p.phase);
    var box=document.createElement('div'); box.id='mtTodayPanel'; box.className='mtCard mtToday'; box.style.setProperty('--c',c);
    box.innerHTML='<div class="mtCardH" data-mt-toggle="1"><div><div class="mtDayT">🎯 Mains Target — Day '+d+'</div><div class="mtDayS">'+esc(p.phase)+' · '+(p.kind==='mock'?'Full Mock day':'Sectional day')+'</div></div><div class="mtRingS">'+ringSVG(pr.pct,56,c)+'<span>'+pr.done+'/'+pr.total+'</span></div></div>'+
      '<div class="mtBody'+(window.__mtTodayOpen===false?' hide':'')+'">'+controlsHTML(d,true)+'<button type="button" class="mtOpenBtn" data-mt-open="'+d+'">Poora Mains Target kholo ›</button></div>';
    panel.insertBefore(box,panel.firstChild);
  }catch(e){ console.warn('mainsTarget today',e); }
}

/* ---- Score sync (stable ids) ---- */
function dateOf(d){ try{ var x=new Date(START_DATE); x.setDate(x.getDate()+d-1); return fmtISODate(x); }catch(e){ return fmtISODate(new Date()); } }
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
  '.mtToday{margin-bottom:14px}.mtToday .mtCardH{cursor:pointer;margin-bottom:6px}.mtBody.hide{display:none}.mtOpenBtn{width:100%;margin-top:8px;padding:10px;border-radius:12px;border:1px solid var(--c);background:transparent;color:var(--text);font-weight:600;cursor:pointer}';
  var st=document.createElement('style'); st.id='mtCSS'; st.textContent=css; document.head.appendChild(st);

  var menu=document.getElementById('calcPage-menu');
  var mb=document.getElementById('calcMainsMockBtn');
  var wrap=document.createElement('div'); wrap.className='calcGrid calcGrid-1col'; wrap.style.marginBottom='10px';
  wrap.innerHTML='<button type="button" class="calcCard calcCard-prem pm-mains pmBig" id="calcMainsTargetBtn"><span class="calcIcon">🎯</span><span class="calcLabelCol"><span class="calcLabel">Mains Target</span><span class="calcSub">50-Day plan · Daily tick &amp; fill · Score tab auto-sync</span></span><span class="calcArrow">&#8250;</span></button>';
  if(mb&&mb.parentNode&&mb.parentNode.parentNode) mb.parentNode.parentNode.insertBefore(wrap,mb.parentNode.nextSibling); else menu.appendChild(wrap);
  document.getElementById('calcMainsTargetBtn').addEventListener('click',function(){ selDay=todayDayNum(); showCalcPage('mainstarget'); renderPage(); });

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
  var g=t.closest('[data-mt-go]'); if(g){ selDay=parseInt(g.getAttribute('data-mt-go'),10)||todayDayNum(); renderPage(); var c=document.querySelector('#mtBody .mtCard'); if(c&&c.scrollIntoView) c.scrollIntoView({behavior:'smooth',block:'start'}); return; }
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
    var hd=pg.querySelector('.mtCard .mtCardH'); if(hd) hd.insertAdjacentHTML('afterend',timerHTML(selDay));
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

var tries=0;
(function boot(){
  if(!ready()){ if(++tries<200) return setTimeout(boot,150); return; }
  try{ for(var q=1;q<=PLAN.length;q++) PCT[q]=dayProgress(q).pct; inject(); hookPanel(); }catch(e){ console.error('mains-target init',e); }
  /* data cloud/local se baad me load ho to dubara draw */
  var n=0, iv=setInterval(function(){ renderToday(); if(++n>12) clearInterval(iv); },1500);
})();
window.mainsTarget={open:openPage,render:refresh,sync:syncScores};
})();
