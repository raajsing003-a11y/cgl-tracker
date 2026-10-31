/* Help tab v2 — "?" button poora Help page kholta hai. Self-contained: app.js / index.html ko chhua nahi.
   Panes: Shuru · Tabs · Quiz · Mains · Paisa · Fix.  Search + checklist + "Kholo" jump buttons. */
(function () {
'use strict';

/* ---------------- CONTENT ---------------- */
// block kinds: h (heading) · steps · c (card) · faq · note · routine · check
var P = [

/* ===== 1. SHURU ===== */
{ id: 'start', ic: '🚀', t: 'Shuru', hero: ['Namaste 👋', 'Ye app 3 kaam karta hai: <b>roz ka plan</b> chalata hai, <b>practice</b> karata hai, aur tumhari <b>progress + ₹ kamai</b> ginta hai. Neeche 3 minute mein sab samajh aa jayega.'], b: [
  { k: 'h', t: '3 minute mein shuru', s: 'Pehli baar? Bas ye 4 kaam karo' },
  { k: 'steps', l: [
    ['Naam save karo', 'Pehli baar app khulne par naam daal ke <b>Shuru</b> dabao. Isi naam se Rank mein dost tumhe dekhenge.'],
    ['Today tab kholo', 'Neeche <b>Today</b> par jao. Aaj ke tasks dikhenge — jo kar liya use <b>✅ tick</b> karo.'],
    ['Quiz tab se practice karo', 'Beech ka bada <b>Quiz</b> button. Sabse upar <b>🎯 Mains Target</b> hai — aaj ka Mains kaam wahin se karo.'],
    ['Raat ko score + weak', '<b>Score</b> tab mein mock ka score likho. <b>Weak</b> tab mein galat chapter par <b>+1</b> karo.']
  ] },
  { k: 'h', t: 'Ek din ka flow', s: 'Suggestion — apne hisaab se badal lo' },
  { k: 'routine', l: [
    ['🌅', 'Subah', 'Home kholo → <b>START</b> (Study Desk) dabao → pehla task shuru.'],
    ['☀️', 'Din', 'Today ke tasks tick karte jao. Beech mein Quiz tab se subject practice.'],
    ['🌆', 'Shaam', 'Mains Mock / Sectional do → <b>Score</b> tab mein likho.'],
    ['🌙', 'Raat', 'Weak tab mein galat chapter +1 · Revise +1 · Home par aaj ki kamai dekho.']
  ] },
  { k: 'h', t: 'Pehle din ki checklist', s: 'Tick karte jao — progress save hota hai' },
  { k: 'check', l: [
    'Naam save karke app shuru kiya',
    'Today tab mein ek task ✅ tick kiya',
    'Quiz → Mains Target kholke Day 1 dekha',
    'Score tab mein ek mock / sectional ka score likha',
    'Weak tab mein ek chapter par +1 kiya',
    'Stats mein Backup Code bana ke rakha',
    'App ko Home Screen par install kiya',
    'Dost ka Room Code daal ke Rank dekha'
  ] }
] },

/* ===== 2. TABS ===== */
{ id: 'tabs', ic: '🧭', t: 'Tabs', b: [
  { k: 'h', t: 'Neeche ke 7 tabs', s: 'Har tab ka kaam — card kholo, "Kholo" se seedha wahan jao' },
  { k: 'c', ic: '🏠', t: 'Home', s: 'Sab kuch ek nazar mein', go: 'home', l: [
    '<b>Days Left</b> ring + aaj ka motivation. <b>Quiz</b> / <b>Target</b> quick buttons aur bada <b>START</b> (Study Desk).',
    '<b>Last 4 din ka heatmap</b> — kis din ₹5,000 target kitna hua.',
    '<b>Days Cleared · Streak · Progress</b> — teen main numbers. 🧊 <b>Streak Freeze</b> bhi yahin dikhta hai.',
    '<b>Aaj ki kamai</b> (Kamaya / Chuka / Baaki) aur <b>Total kamai</b> (Earned / Lost / Net).',
    '<b>Study Hours</b> — Aaj, Total, Daily Avg.',
    '<b>Level card</b> + <b>Streak Badges</b> + <b>Target Settings</b> (target badalna ho to yahin).'
  ], tip: 'Home sirf dekhne ke liye hai. Kaam karna ho to Today ya Quiz tab.' },
  { k: 'c', ic: '🎯', t: 'Today', s: 'Sabse zaroori tab — roz yahin aao', go: 'today', l: [
    '<b>Aaj ka Target</b> — har task par tap karke ✅ karo. Task par timer, notes aur 📷 photo (Camera / Gallery) laga sakte ho.',
    '<b>AI Strict Manager</b> — aaj ka haal dekh ke batata hai kya baaki hai (🔄 Phir Se Analyse se dobara).',
    '<b>Customize Tasks</b> — naam, time, duration badlo ya ➕ naya task jodo. ₹5,000 time ke hisaab se khud baant jata hai. ↩️ se default par wapas.',
    '<b>Calendar</b> — ✅ poora · ⏳ adhura · 😴 rest day. Chhota number = Plan Day.',
    'Rest day mark karoge to us din na ₹ earn hoga na loss.'
  ], tip: 'Din ke 50% se kam kaam hua to streak toot sakti hai — thoda bhi karke tick karo.' },
  { k: 'c', ic: '🧪', t: 'Score', s: 'Mock aur Sectional ka record', go: 'mock', l: [
    'Upar mock ki categories ke card hain — jis par tap karo uska detail khulta hai, <b>←</b> se wapas.',
    'Har test ka <b>score, sahi / galat / skip</b> aur weak chapter likho. <b>💾 Save Karo</b>.',
    '<b>Overall Analysis</b> mein average, percentile aur trend ek jagah.',
    'Mains Target mein jo Full Mock Score bharoge wo yahan <b>auto-sync</b> ho jata hai.'
  ] },
  { k: 'c', ic: '📖', t: 'Quiz', s: 'Beech ka bada button — saari practice yahin', go: 'calc', l: [
    'Sabse upar <b>🎯 Mains Target</b>, phir <b>Study Desk</b> aur <b>Study Tube</b>.',
    'Neeche tools aur <b>4 Subjects</b>: English · Maths · Reasoning · GK.',
    'Poori detail ke liye upar <b>Quiz</b> pill dabao.'
  ] },
  { k: 'c', ic: '📚', t: 'Weak', s: 'Kamzor aur revise — do sub-tabs', go: 'chapters', l: [
    '<b>📚 Weak:</b> galat question ka chapter dhoondho aur <b>+1</b> karo. Jis chapter ka count zyada, wo tumhara sabse weak. <b>🔥 Weakest Right Now</b> upar dikhta hai.',
    '<b>🤖 AI Deep Study Guide</b> — weak chapters ke hisaab se kya padhna hai.',
    '<b>🔁 Revise:</b> Math + English + GK. Revise kiye topic par <b>✅ +1</b>. <b>Sabse kam revise hue</b> chapter top par aate hain. Ye count kabhi reset nahi hota.',
    'Upar search box mein chapter likho ya <b>🎤 bolkar</b> dhoondho.'
  ], tip: 'Mock ke baad galat questions ka chapter +1 karna mat bhoolo — yahi tumhari asli report hai.' },
  { k: 'c', ic: '🤝', t: 'Rank', s: 'Dost ke saath compete', go: 'compete', l: [
    'Dost ka <b>Room Code</b> daalo — sab ka progress ek list mein.',
    'Order: kitne din complete → kitna ₹ kamaya → streak. Aaj ka alag <b>Today Rank</b> bhi hota hai.',
    'Home par bhi chhota leaderboard dikhta hai.'
  ] },
  { k: 'c', ic: '📊', t: 'Stats', s: 'Charts, backup aur settings', go: 'more', l: [
    '<b>Weekly Breakdown</b>, Full Mock / Sectional Math ka all-time avg, <b>Best & Toughest Day</b>.',
    'Charts: <b>Accuracy</b>, <b>Percentile</b>, <b>Mock Score</b>, <b>Subject-wise Progress</b>, Wallet Trend, Long-Term Analysis.',
    '<b>Sectional vs Full Mock</b> comparison, <b>Weak-Chapter Breakdown</b>, <b>Study-Time Utilization</b>.',
    '<b>Loss Log</b> (kab ₹ gaya) aur <b>Silly Mistakes Log</b>.',
    '<b>Sync Room</b>, <b>Backup / Restore</b>, CSV export, Notifications, Cache Clean aur Reset — sab neeche.'
  ] },
  { k: 'h', t: 'Upar ke buttons', s: 'Header mein kya kya hai' },
  { k: 'c', ic: '❓', t: 'Help (ye page)', s: 'Jab chaho dobara kholo', l: [
    'Search box mein shabd likho — jaise <i>timer, paisa, backup, streak</i> — jawab turant mil jayega.',
    'Upar ke pills se section badlo, ya screen ko <b>left / right swipe</b> karo.'
  ] },
  { k: 'c', ic: '💬', t: 'Chat', s: 'Dost se private chat', l: ['Chat button dabao, dost chuno aur baat karo. Naya message aane par button par badge dikhta hai.'] },
  { k: 'c', ic: '👑', t: 'Admin', s: 'Sirf admin ko dikhta hai', l: ['Admin ka pinned announcement Home par <b>📌 Pinned by Admin</b> card mein aata hai.'] },
  { k: 'c', ic: '⭕', t: '% ring', s: 'Aaj ka progress', l: ['Aaj ke tasks ka kitna % complete hua — hamesha upar dikhta hai.'] },
  { k: 'c', ic: '✏️', t: 'Neeche ka pencil', s: 'Rough work / scratch pad', l: ['Sawal solve karte waqt rough kaam ke liye. Kisi bhi tab par dikhta hai.'] }
] },

/* ===== 3. QUIZ ===== */
{ id: 'quiz', ic: '📖', t: 'Quiz', b: [
  { k: 'note', t: '🧠 <b>Kaun sa kab?</b> Time kam → <b>Calculation / Vocab Flash</b>. Test dena → <b>Mains Mock / Sectional</b>. Ek chapter pakka karna → <b>Chapterwise</b>. Sab mixed → <b>Concept Mock</b>.' },
  { k: 'h', t: 'Roz ke liye', s: 'Quiz tab ke upar wale cards' },
  { k: 'c', ic: '⏱️', t: 'Study Desk', s: 'Padhai ka timer + kamai', l: [
    '<b>▶ START</b> dabao — study time <b>apne aap count</b> hota hai.',
    'Time tracker mein save hota hai, aur us par <b>₹ kamai</b> + target complete hota hai.',
    'Card par aaj ka <i>"Aaj: Xm padhe · ₹Y kamaye"</i> live dikhta hai.'
  ], tip: 'Padhai shuru karte hi Start dabao — Home ke Study Hours bhi yahin se bharte hain.' },
  { k: 'c', ic: '▶️', t: 'Study Tube', s: 'Sirf study channels', l: [
    'YouTube jaisa, par <b>sirf study channels</b>. <b>No Shorts · No distraction</b>.',
    'Lecture dekhna ho to YouTube ki jagah yahin kholo.'
  ] },
  { k: 'c', ic: '🏆', t: 'Mains Mock', s: 'Real exam interface', l: [
    '<b>Sectional (97)</b> aur <b>Full (71)</b> mock — bilkul exam jaisa interface.',
    'Mock ke baad score <b>Score</b> tab mein likhna mat bhoolo.'
  ] },
  { k: 'c', ic: '📚', t: 'Mock Question Add', s: 'Apne questions → Auto Mock', l: [
    'Kisi book / class ke questions khud daalo. App unse <b>apne aap mock bana deta hai</b>.',
    'Galat hue sawal dobara practice karne ke liye best.'
  ] },
  { k: 'c', ic: '💼', t: 'Latest Job', s: 'Sarkari vacancy', l: ['Vacancy, <b>Admit Card</b>, <b>Result</b> aur <b>Last date</b> alerts ek jagah.'] },

  { k: 'h', t: '4 Subjects', s: 'Subject card kholo → andar ye milega' },
  { k: 'c', ic: '📗', t: 'English', s: 'Super English · Reading · Vocab · Mocks', l: [
    '<b>Super English</b> — 11,909 Q, 29 chapters, 10-10 ke mock sets, timer + solutions.',
    '<b>English Topic-wise</b> — 15 topics, 1683 Q (CGL / CHSL merged).',
    '<b>English Mocks</b> — CPO Mains (36), CGL Pre (78), CPO Pre (41), Sectional (134). <b>Concept Mock</b> — 68 mixed mocks, 15 min.',
    '<b>Reading</b> — PYQ 98 Sets (Cloze + RC + PQRS), PYQ Practice alag-alag, aur <b>NEW Advanced Sets</b> (Hard, Hindi explanation).',
    '<b>Editorial Reading</b> — 415 editorials, category-wise. Kisi <b>shabd par tap</b> karo to meaning.',
    '<b>English Vocab</b> — Vocab Quiz, Idioms & Phrases, Phrasal Verbs, Spelling, Homophones, Prepositions.'
  ] },
  { k: 'c', ic: '📐', t: 'Maths', s: 'Super Maths · Sectional · Chapterwise', l: [
    '<b>Super Maths</b> — har pattern ka best Q, 20 chapters, 10-10 ke mock sets.',
    '<b>Math Sectional</b> — 44 mocks × 25 Q (SSC / RRB PYQ), Hindi + English.',
    '<b>Math Chapterwise</b> — chapter-by-chapter PYQ.',
    '<b>Calculation</b> — Digital Sum (77 Q), Unit Digit (85 Q), Calculation Quiz (980 Q), aur practice: + − × ÷ · Square · Cube · Roots · Tables 2–30 · Trigonometry · Percentage · Fraction.'
  ] },
  { k: 'c', ic: '🧠', t: 'Reasoning', s: 'Super Reasoning · Sectional · Chapterwise', l: [
    '<b>Super Reasoning</b> — 6,000 Q, 16 chapters, 10-10 ke mock sets, timer + solutions.',
    '<b>Reasoning Sectional</b> — Super Mocks, 75-Day Practice, <b>Concept Mock</b> (83 mocks × 25 Q).',
    '<b>Reasoning Chapterwise</b> — 27 chapters (Odd One Out, Series, Coding-Decoding, Analogy…) SSC PYQ.'
  ] },
  { k: 'c', ic: '🌍', t: 'GK', s: 'Notes + Quiz', l: ['<b>Chapterwise notes</b> aur <b>Topic-wise Quiz</b> — Hindi + English dono.'], tip: 'Notes padho → usi topic ka quiz do → Weak / Revise tab mein +1 karo.' },

  { k: 'h', t: 'Practice tools', s: 'Chhote par kaam ke' },
  { k: 'c', ic: '⚡', t: 'Calculation Speed Test', s: 'Tables · formulas · practice', l: ['Calculation ki speed badhane ke liye timed practice. Roz 10 minute bhi kaafi hai.'] },
  { k: 'c', ic: '🎯', t: 'Optional Elimination', s: 'Trick quiz · 1,664 Q', l: ['Options ko eliminate karke jawab nikalne ki practice — exam mein time bachata hai.'] },
  { k: 'c', ic: '🗂️', t: 'Vocab Flash Cards', s: 'Complete Vocab', l: ['Spaced repetition cards — jo yaad hai wo kam, jo bhoolte ho wo baar baar aate hain. Swipe karke revise.'] },
  { k: 'note', t: '🌐 <b>Language:</b> zyada tar quizzes mein <b>हिंदी / English</b> dono ka option milta hai.' }
] },

/* ===== 4. MAINS ===== */
{ id: 'mains', ic: '🎯', t: 'Mains', b: [
  { k: 'h', t: 'Mains Target — 50 din ka plan', s: 'Quiz tab ke sabse upar · apna alag Day 1–50 plan' },
  { k: 'steps', l: [
    ['Quiz → 🎯 Mains Target kholo', 'Upar Day 1–50 ka calendar dikhega.'],
    ['Aaj ka din chuno', 'Kisi bhi din par tap karo — uska card sabse upar khulta hai.'],
    ['Kaam karte jao', 'Har kaam par tap karke ✅ karo.'],
    ['Maths bharo', 'Solved Q aur time likho (<b>+10 / +25 / +50 / Full</b> buttons se jaldi).'],
    ['Mock ho to score', 'Full Mock Score section mein bharo.']
  ] },
  { k: 'c', ic: '🗓️', t: 'Calendar', s: 'Day 1–50 grid', l: ['🟩 <b>hara</b> = complete · 🟨 <b>peela</b> = adhura · <b>kaala</b> = baaki.', 'Kisi bhi din par tap = wo din sabse upar.'] },
  { k: 'c', ic: '✅', t: 'Day card', s: 'Din ka kaam', l: ['Kaam par tap = ✅. Maths mein solved Q / time bharo.', 'Neeche <b>notes</b> likh sakte ho.'] },
  { k: 'c', ic: '⏱️', t: 'Maths Timer', s: 'Time khud gin lega', l: ['<b>Start → Pause → Save</b>. Save dabate hi minute apne aap add ho jate hain.'] },
  { k: 'c', ic: '🏁', t: 'Full Mock Score', s: 'Mock ka poora hisaab', l: [
    'Mock ka naam, <b>Total</b>, <b>Percentile</b>.',
    '<b>Maths · Reasoning · English · GK</b> — har ka alag Score + ✅ Sahi + ❌ Galat.',
    'Accuracy khud dikhti hai. Ye data <b>Score tab mein auto-sync</b> hota hai.'
  ] },
  { k: 'c', ic: '📋', t: 'Remaining Target', s: 'Kya baaki hai', l: ['Jo din / kaam baaki hain wo day-wise ek hi jagah — pichhla chhoota kaam yahan se pakdo.'] },
  { k: 'c', ic: '➡️', t: 'Din apne aap kaise badalta hai', s: '30% rule', l: [
    'Today tab mein <b>agla din tab aata hai jab current din ka 30% kaam ho jaye</b>.',
    'Warna wahi din dikhta rehta hai. App ke Target Settings se iska koi lena-dena nahi.'
  ] },
  { k: 'c', ic: '🔒', t: 'Sirf-Mains mode', s: 'Dhyaan sirf Mains par', l: [
    'ON hone par Today tab mein <b>sirf Mains Target</b> dikhta hai.',
    'Page ke neeche toggle se badal sakte ho.'
  ] },
  { k: 'c', ic: '💰', t: 'Mains aur paisa', s: 'Kamai kaise banti hai', l: ['Mains ka har complete kaam us din ke <b>₹5,000</b> mein kamai banta hai.'] }
] },

/* ===== 5. PAISA ===== */
{ id: 'money', ic: '💰', t: 'Paisa', b: [
  { k: 'note', t: '💡 <b>Ye ₹ asli paisa nahi, motivation score hai.</b> Padhoge to kamaoge, chhodoge to ₹ jayega — bas itna.' },
  { k: 'h', t: 'Paisa kaise ginta hai', s: 'Roz ka ₹5,000 target' },
  { k: 'c', ic: '💵', t: 'Roz ka ₹5,000', s: 'Tasks mein baant', open: 1, l: [
    'Roz ka target <b>₹5,000</b>. Ye tasks mein <b>unke time ke hisaab</b> se bant jata hai — bada task zyada ₹, chhota kam.',
    'Task <b>tick</b> = ₹ <b>earned</b> (Kamaya).',
    'Time nikal gaya aur tick nahi = <b>lost</b> (Chuka).',
    'Abhi baaki = <b>Baaki</b>.',
    '😴 <b>Rest day</b> mein na earn na loss.',
    'Quiz ya Mains ka kaam complete karne par bhi us din ka ₹ slice earn hota hai.'
  ] },
  { k: 'c', ic: '🔥', t: 'Streak', s: 'Lagatar din', l: [
    'Streak tab chalti hai jab din ka <b>kam se kam 50%</b> kaam ho.',
    '🧊 <b>Streak Freeze</b>: din 50% se kam ho to freeze streak bacha leta hai. <b>Max 2</b>. Calendar mein 🧊 se dikhta hai.'
  ] },
  { k: 'c', ic: '🏅', t: 'Streak Badges', s: '7 · 14 · 30 din', l: ['Streak ke milestones par badge milta hai (Home aur Stats dono mein dikhta hai).'] },
  { k: 'c', ic: '⭐', t: 'Level aur XP', s: 'Game jaisa level-up', l: [
    '<b>+10 XP</b> har tick kiye task par. <b>+100 XP</b> bonus poora din clear karne par.',
    'Jitne streak badge unlock, un par bhi streak-din ke hisaab se XP.',
    'Level jaise jaise badhta hai, agle level ke liye zyada XP chahiye (shuru ke level jaldi aate hain).',
    'Titles: <b>Naya Aspirant → Warm-Up Mode → Grinder → Consistent Beast → Exam Ready → Topper Material → CGL Machine → Selection Locked</b>.',
    'Level up hone par banner aata hai.'
  ] },
  { k: 'c', ic: '📉', t: 'Loss Log', s: 'Kahan ₹ gaya', l: ['Stats tab mein dikhta hai kis din kitna ₹ chuka. Isse apna weak time pakdo.'] }
] },

/* ===== 6. FIX ===== */
{ id: 'fix', ic: '🛟', t: 'Fix', b: [
  { k: 'h', t: 'Data safe rakho', s: 'Stats tab mein — 1 minute ka kaam' },
  { k: 'c', ic: '💾', t: 'Backup Code', s: 'Phone badle to bhi data wapas', open: 1, l: [
    'Stats tab → neeche <b>💾 Backup / Restore</b> → <b>📋 Show Backup Code</b>. Code copy karke kahin safe rakho (Notes / WhatsApp).',
    'Naye phone / browser mein <b>♻️ Restore From Code</b> mein paste karo.',
    '<b>⬇️ Export Data (CSV)</b> se Excel jaisi file bhi mil jati hai.',
    '🗑️ <b>Reset</b> dabane se pehle backup zaroor lo — reset ke baad data wapas nahi aata.'
  ] },
  { k: 'c', ic: '📲', t: 'App jaisa install', s: 'Home screen par icon', l: [
    'Browser menu → <i>Add to Home Screen</i> / <i>Install app</i>. Home aur Stats par <b>📲 Add to Home Screen</b> button bhi hai.',
    'Android par <b>⬇️ Install APK</b> bhi mil jata hai.'
  ] },
  { k: 'c', ic: '🔔', t: 'Notifications', s: 'Reminder', l: ['Stats tab ka <b>Notifications</b> button ON karo. Dhyaan: <b>app khula ya background mein ho tabhi</b> notification aata hai.'] },

  { k: 'h', t: 'Aksar poochhe sawal', s: 'Kuch gadbad lage to pehle yahan dekho' },
  { k: 'faq', q: 'Naya update / feature nahi dikh raha', a: 'App ko poora band karke dobara kholo. Phir bhi na dikhe to <b>Stats → 🧹 Cache Clean + Refresh</b> dabao.' },
  { k: 'faq', q: 'Phone badal gaya, data kaise laoon?', a: 'Purane phone ka <b>Backup Code</b> naye phone ke Stats → <b>♻️ Restore From Code</b> mein paste karo.' },
  { k: 'faq', q: 'Streak kyun toot gayi?', a: 'Us din 50% se kam kaam hua aur 🧊 Freeze bacha nahi tha. Freeze max 2 hi hote hain.' },
  { k: 'faq', q: 'Mains Target ka agla din kyun nahi aaya?', a: 'Agla din tab aata hai jab current din ka <b>30% kaam</b> ho jaye. Thoda aur tick karo.' },
  { k: 'faq', q: 'Dost ka progress Rank mein nahi dikh raha', a: 'Dono ka <b>Room Code same</b> hona chahiye aur internet on. Stats ka <b>🔗 Sync Room</b> status dekho, phir <b>🔄 Refresh Numbers</b> dabao.' },
  { k: 'faq', q: '₹ kam / zyada kyun mila?', a: 'Roz ka ₹5,000 tasks ke <b>time ke hisaab</b> se bantta hai. Bade task ka ₹ zyada hota hai. Rest day mein na earn na loss.' },
  { k: 'faq', q: 'Task ka time / naam badalna hai', a: 'Today → <b>Customize Tasks</b> kholo, edit karo aur <b>💾 Save Karo</b>. Galti ho to ↩️ Default Pe Reset.' },
  { k: 'faq', q: 'Kaun sa chapter weak hai kaise pata chalega?', a: 'Weak tab mein galat question ke chapter par +1 karte raho. <b>🔥 Weakest Right Now</b> aur <b>AI Deep Study Guide</b> khud bata denge.' },
  { k: 'faq', q: 'Weak aur Revise mein kya fark hai?', a: '<b>Weak</b> = kahan galti hui (zyada count = zyada kamzor). <b>Revise</b> = kya dobara padha (kam count = pehle padho).' }
] }

];

/* ---------------- CSS ---------------- */
var CSS = '#hlpPage{position:fixed;inset:0;z-index:100000;display:none;flex-direction:column;background:var(--bg,#0b1220);color:var(--text,#e5e7eb);font-family:inherit}#hlpPage.on{display:flex}' +
'#hlpPage *{box-sizing:border-box}' +
'.hlpTop{flex:none;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 12px;background:linear-gradient(135deg,#7c3aed,#2563eb 60%,#06b6d4);box-shadow:0 4px 18px rgba(0,0,0,.4)}' +
'.hlpRow{display:flex;align-items:center;gap:10px}.hlpBack{flex:none;border:0;border-radius:99px;width:38px;height:38px;background:rgba(255,255,255,.2);color:#fff;font-size:22px;line-height:1;cursor:pointer}' +
'.hlpT{font-size:21px;font-weight:800;color:#fff;line-height:1.15}.hlpT small{display:block;font-size:11.5px;font-weight:500;opacity:.92}' +
'.hlpSrch{width:100%;margin-top:10px;padding:11px 14px;border-radius:14px;border:0;font-size:14px;background:rgba(255,255,255,.96);color:#111;outline:none}' +
'.hlpPills{flex:none;display:flex;gap:6px;overflow-x:auto;padding:10px 12px;scrollbar-width:none;background:var(--bg,#0b1220);border-bottom:1px solid var(--border,#273044)}.hlpPills::-webkit-scrollbar{display:none}' +
'.hlpPills button{flex:none;display:flex;align-items:center;gap:5px;border:1px solid var(--border,#334155);background:var(--card,#141b2d);color:var(--text,#e5e7eb);border-radius:99px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}' +
'.hlpPills button.on{background:linear-gradient(135deg,#7c3aed,#2563eb);border-color:transparent;color:#fff;box-shadow:0 3px 12px rgba(99,102,241,.45)}' +
'.hlpBody{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 12px calc(env(safe-area-inset-bottom,0px) + 40px)}' +
'.hP{display:none}.hP.on{display:block}.hlpSearching .hP{display:block}.hlpSearching .hHead,.hlpSearching .hHero,.hlpSearching .hlpTools{display:none}' +
'.hPLbl{display:none;margin:14px 2px 6px;font-size:12px;font-weight:800;letter-spacing:.5px;color:#7dd3fc;text-transform:uppercase}.hlpSearching .hPLbl.has{display:block}' +
'.hHero{border-radius:18px;padding:16px;margin-bottom:12px;background:linear-gradient(135deg,rgba(124,58,237,.35),rgba(6,182,212,.28));border:1px solid rgba(125,211,252,.3)}.hHero b.hHi{display:block;font-size:19px;margin-bottom:4px;color:var(--text,#e5e7eb)}.hHero div{font-size:13.5px;line-height:1.55}.hHero div b{color:#7dd3fc}' +
'.hHead{margin:16px 2px 8px}.hHead:first-child{margin-top:4px}.hHead b{display:block;font-size:16.5px}.hHead small{font-size:12px;color:var(--muted,#94a3b8)}' +
'.hlpTools{display:flex;justify-content:flex-end;margin:0 2px 2px}.hlpTools button{border:0;background:none;color:#38bdf8;font-size:12px;font-weight:700;cursor:pointer;padding:4px 6px}' +
'.hSec{background:var(--card,#141b2d);border:1px solid var(--border,#334155);border-radius:16px;margin-bottom:10px;overflow:hidden}' +
'.hSec summary{list-style:none;display:flex;align-items:center;gap:12px;padding:12px;cursor:pointer}.hSec summary::-webkit-details-marker{display:none}' +
'.hIc{flex:none;width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:23px;background:linear-gradient(135deg,rgba(124,58,237,.35),rgba(6,182,212,.3))}' +
'.hTx{flex:1;min-width:0}.hTx b{display:block;font-size:15.5px}.hTx small{font-size:12px;color:var(--muted,#94a3b8)}' +
'.hAr{flex:none;color:var(--muted,#94a3b8);font-size:20px;transition:transform .2s}.hSec[open] .hAr{transform:rotate(90deg)}' +
'.hSec ul{margin:0;padding:0 12px 6px;list-style:none}.hSec li{position:relative;padding:9px 10px 9px 26px;margin-top:6px;border-radius:11px;background:rgba(255,255,255,.04);font-size:13.5px;line-height:1.55}' +
'.hSec li:before{content:"";position:absolute;left:10px;top:16px;width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#22d3ee)}.hSec li b{color:#7dd3fc}' +
'.hTip{margin:6px 12px 6px;padding:9px 11px;border-radius:11px;font-size:12.5px;line-height:1.5;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.35);color:#fde68a}' +
'.hGo{display:block;width:calc(100% - 24px);margin:8px 12px 12px;padding:10px;border:0;border-radius:12px;font-size:13px;font-weight:800;color:#fff;background:linear-gradient(135deg,#7c3aed,#2563eb);cursor:pointer}' +
'.hSec>ul:last-child,.hSec>.hTip:last-child{margin-bottom:12px}' +
'.hNote{padding:11px 13px;margin-bottom:10px;border-radius:14px;font-size:13px;line-height:1.55;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.3)}.hNote b{color:#7dd3fc}' +
'.hSteps{margin:0 0 6px;padding:0;list-style:none}.hStep{display:flex;gap:12px;padding:12px;margin-bottom:8px;border-radius:16px;background:var(--card,#141b2d);border:1px solid var(--border,#334155)}' +
'.hNum{flex:none;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;background:linear-gradient(135deg,#7c3aed,#06b6d4)}.hStep b.hSt{display:block;font-size:14.5px;margin-bottom:2px}.hStep div div{font-size:13px;line-height:1.5;color:var(--muted,#cbd5e1)}.hStep div div b{color:#7dd3fc}' +
'.hRout{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px}.hRC{padding:11px;border-radius:14px;background:var(--card,#141b2d);border:1px solid var(--border,#334155);font-size:12.5px;line-height:1.5}.hRC span{display:block;font-size:22px}.hRC b{color:#7dd3fc}.hRC b.hRt{display:block;font-size:14px;margin:2px 0 3px;color:var(--text,#e5e7eb)}' +
'.hChkBox{padding:12px;border-radius:16px;background:var(--card,#141b2d);border:1px solid var(--border,#334155);margin-bottom:6px}.hBar{height:8px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin:2px 0 4px}.hBar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#22c55e,#06b6d4);transition:width .3s}.hBarT{font-size:12px;color:var(--muted,#94a3b8);margin-bottom:6px}' +
'.hChk{display:flex;align-items:center;gap:11px;padding:10px 4px;font-size:13.5px;border-top:1px solid rgba(255,255,255,.06);cursor:pointer}.hChk input{flex:none;width:20px;height:20px;accent-color:#22c55e}.hChk.done span{opacity:.55;text-decoration:line-through}' +
'.hFaq{background:var(--card,#141b2d);border:1px solid var(--border,#334155);border-radius:14px;margin-bottom:8px;overflow:hidden}.hFaq summary{list-style:none;display:flex;gap:10px;align-items:center;padding:12px;font-size:14px;font-weight:700;cursor:pointer}.hFaq summary::-webkit-details-marker{display:none}.hFaq summary:before{content:"Q";flex:none;width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;background:rgba(124,58,237,.35);color:#c4b5fd}' +
'.hFaq summary span{flex:1}.hFaq[open] .hAr{transform:rotate(90deg)}.hFaq[open] summary{border-bottom:1px solid rgba(255,255,255,.06)}.hFaq div.hA{padding:11px 12px 13px 46px;font-size:13.3px;line-height:1.6;color:var(--muted,#cbd5e1)}.hFaq div.hA b{color:#7dd3fc}' +
'.hlpEmpty{display:none;text-align:center;padding:36px 16px;color:var(--muted,#94a3b8)}.hlpEmpty b{display:block;font-size:30px;margin-bottom:6px}' +
'mark.hMk{background:#fde047;color:#111;border-radius:3px;padding:0 1px}';

/* ---------------- RENDER ---------------- */
var CK = 'hlp_check_v1';
function loadChk() { try { return JSON.parse(localStorage.getItem(CK) || '{}') || {}; } catch (e) { return {}; } }
function saveChk(o) { try { localStorage.setItem(CK, JSON.stringify(o)); } catch (e) {} }

function rBlock(b) {
  var h = '', i;
  switch (b.k) {
    case 'h':
      return '<div class="hHead"><b>' + b.t + '</b><small>' + b.s + '</small></div>';
    case 'note':
      return '<div class="hNote hItem">' + b.t + '</div>';
    case 'steps':
      h = '<ol class="hSteps">';
      for (i = 0; i < b.l.length; i++) h += '<li class="hStep hItem"><span class="hNum">' + (i + 1) + '</span><div><b class="hSt">' + b.l[i][0] + '</b><div>' + b.l[i][1] + '</div></div></li>';
      return h + '</ol>';
    case 'routine':
      h = '<div class="hRout">';
      for (i = 0; i < b.l.length; i++) h += '<div class="hRC hItem"><span>' + b.l[i][0] + '</span><b class="hRt">' + b.l[i][1] + '</b>' + b.l[i][2] + '</div>';
      return h + '</div>';
    case 'check':
      return '<div class="hChkBox hItem"><div class="hBar"><i id="hBarI"></i></div><div class="hBarT" id="hBarT"></div>' +
        b.l.map(function (t, j) { return '<label class="hChk"><input type="checkbox" data-hc="' + j + '"><span>' + t + '</span></label>'; }).join('') + '</div>';
    case 'faq':
      return '<details class="hFaq hItem"><summary><span>' + b.q + '</span><i class="hAr">›</i></summary><div class="hA">' + b.a + '</div></details>';
    case 'c':
      h = '<details class="hSec hItem"' + (b.open ? ' open' : '') + '><summary><span class="hIc">' + b.ic + '</span><span class="hTx"><b>' + b.t + '</b><small>' + b.s + '</small></span><span class="hAr">›</span></summary><ul>';
      for (i = 0; i < b.l.length; i++) h += '<li>' + b.l[i] + '</li>';
      h += '</ul>';
      if (b.tip) h += '<div class="hTip">💡 ' + b.tip + '</div>';
      if (b.go) h += '<button type="button" class="hGo" data-go="' + b.go + '">' + b.t + ' kholo →</button>';
      return h + '</details>';
  }
  return '';
}

var page, st, isOpen = false, cur = 0, chk;

function build() {
  if (page) return;
  st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  page = document.createElement('div'); page.id = 'hlpPage';
  var pills = P.map(function (p, i) { return '<button type="button" data-hp="' + i + '"><span>' + p.ic + '</span>' + p.t + '</button>'; }).join('');
  var panes = P.map(function (p, i) {
    var hero = p.hero ? '<div class="hHero"><b class="hHi">' + p.hero[0] + '</b><div>' + p.hero[1] + '</div></div>' : '';
    var tools = (p.id === 'tabs' || p.id === 'quiz' || p.id === 'mains' || p.id === 'money') ? '<div class="hlpTools"><button type="button" data-ha="open">Sab kholo</button><button type="button" data-ha="close">Sab band</button></div>' : '';
    return '<section class="hP" data-pi="' + i + '"><div class="hPLbl">' + p.ic + ' ' + p.t + '</div>' + hero + tools + p.b.map(rBlock).join('') + '</section>';
  }).join('');
  page.innerHTML = '<div class="hlpTop"><div class="hlpRow"><button type="button" class="hlpBack" data-hb="1" aria-label="Wapas">‹</button><div class="hlpT">🆘 Help<small>App kaise use karein — sab kuch ek jagah</small></div></div>' +
    '<input class="hlpSrch" id="hlpQ" type="search" placeholder="🔍 Dhoondho: timer, paisa, backup, streak…" autocomplete="off"></div>' +
    '<div class="hlpPills" id="hlpPills">' + pills + '</div>' +
    '<div class="hlpBody" id="hlpBody">' + panes + '<div class="hlpEmpty" id="hlpNone"><b>🤔</b>Kuch nahi mila — dusra shabd try karo (jaise: <i>score, weak, timer</i>).</div></div>';
  document.body.appendChild(page);
  chk = loadChk(); paintChk();
  show(0);

  page.addEventListener('click', function (e) {
    var t = e.target.closest('[data-hb],[data-hp],[data-ha],[data-go]'); if (!t) return;
    if (t.hasAttribute('data-hb')) return close(true);
    if (t.hasAttribute('data-hp')) return show(+t.getAttribute('data-hp'), true);
    if (t.hasAttribute('data-go')) return go(t.getAttribute('data-go'));
    var all = page.querySelectorAll('.hP.on details.hSec'), o = t.getAttribute('data-ha') === 'open';
    for (var i = 0; i < all.length; i++) all[i].open = o;
  });
  page.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.hasAttribute || !t.hasAttribute('data-hc')) return;
    chk[t.getAttribute('data-hc')] = t.checked ? 1 : 0; saveChk(chk); paintChk();
  });
  page.querySelector('#hlpQ').addEventListener('input', search);

  // left / right swipe = agla / pichhla section
  var x0 = 0, y0 = 0, body = page.querySelector('#hlpBody');
  body.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  body.addEventListener('touchend', function (e) {
    if (page.classList.contains('hlpSearching')) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) { var n = cur + (dx < 0 ? 1 : -1); if (n >= 0 && n < P.length) show(n, true); }
  }, { passive: true });
}

function paintChk() {
  var boxes = page.querySelectorAll('input[data-hc]'), n = 0, i;
  for (i = 0; i < boxes.length; i++) {
    var on = !!chk[boxes[i].getAttribute('data-hc')];
    boxes[i].checked = on; boxes[i].parentNode.classList.toggle('done', on); if (on) n++;
  }
  var bi = page.querySelector('#hBarI'), bt = page.querySelector('#hBarT');
  if (bi) bi.style.width = (boxes.length ? Math.round(n * 100 / boxes.length) : 0) + '%';
  if (bt) bt.textContent = n + ' / ' + boxes.length + ' complete' + (n === boxes.length && n ? ' — Shabaash! 🎉' : '');
}

function show(i, scroll) {
  cur = i;
  var ps = page.querySelectorAll('.hP'), bs = page.querySelectorAll('#hlpPills button'), k;
  for (k = 0; k < ps.length; k++) ps[k].classList.toggle('on', k === i);
  for (k = 0; k < bs.length; k++) bs[k].classList.toggle('on', k === i);
  if (bs[i] && bs[i].scrollIntoView) { try { bs[i].scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {} }
  if (scroll !== false) page.querySelector('#hlpBody').scrollTop = 0;
}

function clearMarks(root) {
  var ms = root.querySelectorAll('mark.hMk');
  for (var i = 0; i < ms.length; i++) { var m = ms[i], p = m.parentNode; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize(); }
}
function markText(root, q) {
  var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
  while ((n = w.nextNode())) { if (n.nodeValue.toLowerCase().indexOf(q) >= 0) nodes.push(n); }
  nodes.forEach(function (node) {
    var v = node.nodeValue, lo = v.toLowerCase(), pos = 0, idx, frag = document.createDocumentFragment();
    while ((idx = lo.indexOf(q, pos)) >= 0) {
      if (idx > pos) frag.appendChild(document.createTextNode(v.slice(pos, idx)));
      var mk = document.createElement('mark'); mk.className = 'hMk'; mk.textContent = v.slice(idx, idx + q.length); frag.appendChild(mk);
      pos = idx + q.length;
    }
    if (pos < v.length) frag.appendChild(document.createTextNode(v.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  });
}
function search() {
  var q = this.value.trim().toLowerCase(), body = page.querySelector('#hlpBody'), items = page.querySelectorAll('.hItem'), total = 0, i;
  clearMarks(body);
  page.classList.toggle('hlpSearching', !!q);
  var lbls = page.querySelectorAll('.hPLbl'); for (i = 0; i < lbls.length; i++) lbls[i].classList.remove('has');
  for (i = 0; i < items.length; i++) {
    var it = items[i], hit = !q || it.textContent.toLowerCase().indexOf(q) >= 0;
    it.style.display = hit ? '' : 'none';
    if (q && hit) {
      total++;
      if (it.tagName === 'DETAILS') it.open = true;
      var lb = it.closest('.hP').querySelector('.hPLbl'); if (lb) lb.classList.add('has');
      markText(it, q);
    }
  }
  page.querySelector('#hlpNone').style.display = q && !total ? 'block' : 'none';
  if (!q) show(cur, false);
  body.scrollTop = 0;
}

function go(tab) {
  close(false);
  setTimeout(function () { var b = document.querySelector('.tabbtn[data-tab="' + tab + '"]'); if (b) b.click(); }, 60);
}

function openHelp(which) {
  build();
  if (typeof which === 'string') { for (var i = 0; i < P.length; i++) if (P[i].id === which) show(i); }
  if (isOpen) return;
  isOpen = true; page.classList.add('on');
  var q = page.querySelector('#hlpQ'); if (q && q.value) { q.value = ''; search.call(q); }
  page.querySelector('#hlpBody').scrollTop = 0;
  try { history.pushState({ hlp: 1 }, ''); } catch (e) {}
}
function close(viaBtn) {
  if (!isOpen) return; isOpen = false; page.classList.remove('on');
  if (viaBtn) { try { if (history.state && history.state.hlp) history.back(); } catch (e) {} }
}
window.addEventListener('popstate', function () { if (isOpen) close(false); });
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('#helpBtn'); if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation(); openHelp();
}, true);
function tag() { var b = document.getElementById('helpBtn'); if (b) { b.setAttribute('aria-label', 'Help'); b.title = 'Help'; return true; } return false; }
if (!tag()) { var n = 0, iv = setInterval(function () { if (tag() || ++n > 40) clearInterval(iv); }, 500); }
window.openHelpTab = openHelp;
})();
