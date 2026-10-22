# CLEANUP_TRACKER (CGLY, GK out of scope)

## Format notes (verified chunk 1)
- data/maths|reasoning|superenglish/*.json: list of {i,t,o[4],a,e,h,...}, default separators (', ' ': '), ensure_ascii=False. index.json compact (',',':').
- Maths chapter keys NOT hardcoded in tools/supermaths.html (index.json se dynamic). app.js MATH_CHAPTERS (line ~361) alag naming list hai (Percentage, Mixture and Alligation, Partnership, Boat and Stream, Race etc.) - abhi naya naam nahi chahiye.
- ids poore maths dir me unique (checked).

## Final Maths taxonomy (chunk 1 decision)
Chapter-wise split karna hai: Number System | LCM & HCF | Unit Digit | Digital Sum & Remainders | Simplification & Approximation | Surds & Indices | Percentage | Profit & Loss | Discount & Marked Price | Simple Interest | Compound Interest | Ratio & Proportion | Mixture & Alligation | Partnership | Average | Ages | Time & Work | Pipes & Cisterns | TSD | Trains | Boats & Streams | Races & Circular Motion | Algebra | Polynomials/Quadratic | Geometry | Coordinate Geometry | Mensuration 2D | 3D | Trigonometry | Heights & Distances | DI | P&C | Probability | Set Theory | Statistics | Sequence & Series | Inequalities.

## Chunk status
| # | chunk | status |
|---|---|---|
| 1 | Setup + maths ratio split | DONE |
| 2 | avg + tw | DONE |
| 3 | tsd (TSD/Trains/Boats/Races) | DONE |
| 4 | simpl + pct + plmd | DONE |
| 5 | sici + unitds | DONE |
| 6 | geo + trig | DONE |
| 7 | algebra + pcs + calc + misc distribute | DONE |
| 8 | Maths cross-check + math_pyq topic sets | DONE |
| 9 | math_sp/p75 chap tags | DONE |
| 10 | Reasoning misc split | DONE |
| 11 | Reasoning statement sub-types | DONE |
| 12 | Reasoning other chapters misfile scan | DONE |
| 13 | Reasoning data/topics files | DONE |
| 14 | English syn_ant_ows split | DONE |
| 15 | English sentimp/homophones/misc/chhote grammar | DONE |
| 16 | English misfile scan (rc, cloze, fib, errorspot, parajumble, idioms, spelling, prep, phrasal, voice, narration) | DONE |
| 17 | English data/topics english files + english_topicwise | DONE |
| 18 | Reading + Opt-Elim | DONE |
| 19 | Final re-verify | DONE |

## Chunk 1 numbers
ratio.json 288 -> Ratio & Proportion 117 | Mixture & Alligation 81 (mixture) | Partnership 90 (partnership). Hataye: 0. Maths total 3818 -> 3818, index v6 -> v7, 22 chapters.
Naye chapters: mixture (Mixture & Alligation, 🧪, 81), partnership (Partnership, 🤝, 90); ratio relabeled "Ratio & Proportion".

## Chunk 2 numbers
avg.json 170 -> Average 141 | Ages 29 (ages). tw.json 198 -> Time & Work 130 | Pipes & Cisterns 66 (pipes) | men3d +2 (pipe-material/bucket-volume wale, tw se). Hataye: 0. Maths total 3818, index v7 -> v8, 24 chapters.
Naye chapters: ages (Ages, 🎂, 29), pipes (Pipes & Cisterns, 🚰, 66).

## Chunk 3 numbers
tsd.json 328 -> TSD 169 | Trains 51 (trains) | Boats & Streams 34 (boats) | Races & Circular Motion 71 (races) | trig +3 (heights/towers type). Hataye: 0.
Naye chapters: trains 🚂 51, boats 🚤 34, races 🏁 71.

## Chunk 4 numbers
simpl.json 49 -> Simplification & Approximation 33 | Surds & Indices 16 (surds). plmd.json 346 -> Profit & Loss 201 (plmd) | Discount & Marked Price 145 (disc). pct.json 211 -> 197; pct se moves: sici +6, mixture +5, tw +1, ages +1, trig +1. Hataye: 0.
Maths total 3818, index v10, 29 chapters.
Naye chapters: surds (Surds & Indices, √, 16), disc (Discount & Marked Price, 🛍️, 145). Labels: simpl, plmd badle.

## Chunk 5 numbers
sici.json 244 (incl. +10 from unitds, +6 from pct, -2 successive-discount to disc) -> Simple Interest 145 (si) | Compound Interest 107 (ci). unitds.json 142 -> Unit Digit 16 (unitds); baaki 126 sahi chapters me: numsys +15, lcmhcf +4, simpl +12, algebra +13, tw +2, avg +19, tsd +3, partnership +5, plmd +4, disc +11 (+2 sici se), sici +10, pct +10, ratio +4, men3d +10, men2d +2, pcs +2. Hataye: 0.
Instalment (cash-down) sawaal SI me rakhe (CI keyword ho to CI me).

## Chunk 6 numbers
geo.json 443 -> Geometry 397 (geo, incl +3 from trig) | Coordinate Geometry 48 (cgeo; 3D sphere eq. wala bhi); 1 -> pcs. trig.json 181 -> Trigonometry 96 (trig) | Heights & Distances 73 (htd); trig se moves: geo +3, partnership +1, lcmhcf +2, ratio +1, races +1, avg +1, men3d +1, tw +1, misc +1 (then avg). Hataye: 0.

## Chunk 7 numbers
algebra.json 168 -> Algebra 111 | Polynomials & Quadratic 27 (poly) | Sequence & Series 21 (seqser, incl +1 from misc) | ages +7 | numsys +4 (digit/factor type). pcs.json 63 -> P&C & Probability 23 (pc) | Set Theory 16 (sets) | Statistics 24 (stats). calc (1) -> simpl. misc (16) -> simpl +3, geo +3, tw +2, men3d +2, seqser +1, ages +2, numsys +2, avg +1. calc.json aur misc.json file+index se hataye (khaali). Hataye (defect): 0.
Maths total 3818, index v13, 34 chapters.
Naye chapters: poly 🧩 27, seqser 🔗 21, pc 🎲 23 (label Permutation, Combination & Probability), sets ⭕ 16, stats 📉 24, si 🏦 145, ci 📈 107, cgeo 📍 48, htd 🗼 73.

## Chunk 8 numbers
data/maths: numsys 244 -> 214 (rem +21 new, lcmhcf +9, ages +1, poly +1; lcmhcf se +2 factor-count); lcmhcf 58 -> 65; men2d->men3d 1 (pyramid), men3d->geo 1, men3d->men2d 1 (path area); ages 40, poly 28, geo 401, men3d 290, men2d 162. di cross-check: koi misfile nahi. Hataye: 0. Maths total 3818, index v14, 35 chapters. Naya chapter: rem (Remainders & Digital Sum, ♻️, 21). Probability alag nahi (pc me hi, 8 Q).
math_pyq (data/topics/math_pyq.json, MATH_PYQ_SETS): 92 exact duplicate (same en+options, same set: timework 55, tsd 34, geometry 2, algebra 1) hataye. Naye sets: remainder (13, numbersystem se), pipes (13, timework se). Moves: ratio->age 1, profitloss->mixture 1, sequenceseries->trigonometry 1, partnership->ratio 1. mock sets untouched. data/index.json counts updated; app.js TOPIC_META me remainder + pipes added (node --check OK). Total PYQ 2166 -> 2074, 71 sets.

## Chunk 9 numbers
data/topics/math_sp.json (3557 Q, 147 sets) + math_p75.json (1860 Q, 75 sets): sirf `chap` tag taxonomy ke hisaab se re-tag (questions set se bahar nahi gaye, counts same, index.json counts unchanged). sp: 20 old tags -> 26 (Races 84, Trains 104, Boats 92, CI 93 / SI 120, Surds & Indices 29, Geometry 21, P&C 46 naye; Mixed Practice khatam). p75: 16 -> 24 (Partnership 4, Pipes 37, Heights 22, Ages 26, Trains 28, Boats 14, Races 8 etc.). Hataye: 0. app.js me chap sirf buildSPMockLabel label ke liye use hota hai, badla nahi.
Known noise: Mixed Practice se aaye ~15 sawaal (image-only / 'evaluate:') Number System me fallback.

## Chunk 10 numbers
data/reasoning/misc.json 967 -> naye chapters: mathops (Mathematical Operations ➗ 118), ineq (Inequality ⚖️ 13), inputoutput (Input-Output 🔄 25), numpuzzle (Number Puzzles & Missing Number 🔟 82), mirror (Mirror & Water Image 🪞 58), paperfold (Paper Folding & Cutting ✂️ 51), embedded (Embedded Figures 🔍 45), counting (Counting Figures 🔺 77), dicecube (Dice & Cube 🎲 66), nonverbal (Figure Series & Pattern Completion 🖼️ 82). Misfile moves: analogy +188 (number/figure analogy), odd +61, seating +62, statement +11 (situational judgement), venn +2. misc me 10 bache (clerical/address matching, etc.; label 'Miscellaneous (Clerical · Others)'). Maths me gaye (16): races +9, tw +1, men2d +3, numsys +1, pc +1, htd +1. Hataye: 0.
Reasoning total 5864 -> 5848 (index v9), maths 3818 -> 3834 (index v15). ids unique (reasoning+maths). NOTE: data/reasoning/*.json files COMPACT separators (',',':') me hain (maths default); format waisa hi rakha.
Known noise: numpuzzle/nonverbal me kuch sawaal borderline (number vs figure pattern); analogy +188 me 'two sets of numbers' type bhi.

## Chunk 11 numbers
data/reasoning/statement.json 984 -> Statement · Conclusion · Inference 243 (statement) | naye: assumption (Statement & Assumption 💭 66), action (Course of Action 🛠️ 90), argument (Argument · Strengthen & Weaken ⚔️ 44), datasuff (Data Sufficiency 📊 256), causeeffect (Cause & Effect 🔀 31), situation (Situational Judgement & Decision Making 🧑‍⚖️ 249). Misfile: seating +1, coding +1, misc +3 (address matching; misc ab 13). Hataye: 0. Reasoning index v10, total 5848, 32 chapters, ids unique.
Known noise: situation me eligibility-criteria (selection criteria/qualification) puzzles bhi hain (decision-making type); datasuff me seating/coding based DS bhi.

## Defect scan (chunk 11 ke baad)
maths/reasoning/superenglish scan: empty text, blank/duplicate options, exact duplicates (raw html + options + answer). Hataye: 2 (maths races exact duplicates, chunk 10 ke move se aaye). Maths total 3832, index v16. Reasoning me 104 'dup' sirf image-based (text same, image alag) - rakhe. superenglish clean. Defect scan har chunk me us chunk ke chapters par karna.

## Chunk 12 numbers
Signature-keyword scan (calendar/clock/venn/syllogism/blood/direction/dictionary/coding/wordformation/mathops/inputoutput etc.) sab reasoning chapters par; review ke baad moves: series -> mathops 17 + inputoutput 3; coding -> mathops 6 (sign-interchange equations); ranking -> mathops 1; statement -> ineq 13 (symbol inequality conclusions). Baaki flags false positive (analogy->venn 'best represents', datasuff blood/coding DS, seating-direction facing, alphabet analogy) - rakhe. Hataye: 0. Reasoning index v11, total 5848.

## Chunk 13 numbers
data/topics reasoning files scan (22 files + coding/oddone/series jo khaali hain). Intentional-mix files (app label se): clockio='Clock & Input-Output', logicmix='Inequality & Word Formation', reasoninghardmix, wordarrangeage='Word Arrangement & Age', statementconclusion='Statement, Conclusion & Data Sufficiency' - inme kuch nahi hilaya. Moves (naye set me append, qn sequential): orderranking -> calendarreasoning 2 (date puzzles), -> statementconclusion 1; dictorder -> letterword 3; decisionmaking -> syllogism 2, letteranalogy 1, bloodrel 1, statementconclusion 2; wordformation -> decisionmaking 1. Hataye (defect): statement 1 (illegible statement), bloodrel 1 (exact duplicate). data/index.json set counts updated. Formats preserved (index compact; topic files original). No app.js change.
Known noise: decisionmaking set8/9 me 2 number-series sawaal reh gaye (series topic file khaali); statement assumption/argument me 1-1 non-statement (number odd-one / mod math) reh gaye; logical-order sawaal (orderranking set4, wordformation set5/6) dictorder me nahi bheje (label alphabetical) - borderline.

## Chunk 14 numbers
NOTE: data/superenglish/*.json COMPACT separators (',',':') me hain (tracker ke purane format note ke ulat); format waisa hi rakha.
syn_ant_ows 2549 -> Synonyms 1071 (synonyms) | Antonyms 826 (antonyms) | One Word Substitution 644 (ows); syn_ant_ows file+index se hata di (koi hardcoded ref nahi). Misfile moves: parajumble +1, idioms +2 (idiom-identify), fib +2. Hataye (defect): 3 (RC questions jinka passage missing). Classifier: 'antonym/opposite' -> ant; 'group of words/one word/Which word means:/definition->word' -> ows; baaki synonym; 19 unmatched khud padh ke. 'closest in meaning to the idea: <definition>' wale synonym me rakhe (stated type). Passage-embedded vocab (synonym/antonym from passage) bhi syn/ant me.
Index v11, total 11631, 31 chapters, ids unique.
Known issues (chunk 16 me dekhna): rc/errorspot etc. me ~23 pre-existing sawaal jinme len(o)!=4 ya a out of 0..3 (rc 63feefe2 jaisa, errorspot me kuch) - chunk 16 me defect-check karo.

## Chunk 15 numbers
sentimp 373 -> Sentence Improvement 139 (sentimp) | Phrase Replacement 107 (phrasereplace, naya, 🪄; 106 sentimp se + 1 misc se). sentimp se misfile moves: errorspot +94, synonyms +9, phrasal +8, pos +5, rc +4 (passage-based), parajumble +2, homophones/ows/fib/idioms/prep/spelling +1 each. homophones: 'homonym' sirf 4 Q -> split nahi (<8), label 'Homophones & Homonyms'.
Chhote grammar chapters: sva (0) file+index se hata di; cond(3)+verb(6) -> tense (label 'Tense, Verb & Conditionals' 33); pronoun(5)+conj(5) -> pos (85); qtag(7) -> structure ('Sentence Structure & Question Tags' 22). pos se figure-of-speech 2 -> figures (33). misc 12 -> parajumble +1, adjective +1, fib +1, pos +4, tense +1, phrasereplace +1; misc me 3 bache ('Miscellaneous (Others)': 2 GK wetlands Q + 1 summary Q). Hataye (defect): 0.
English index v12, total 11631, 26 chapters, ids unique, file formats compact.
Known issues: misc ke 2 wetlands sawaal GK type (out of scope, move nahi kiye). noun/pronoun-type error sawaal topic chapters me hi rakhe.

## Chunk 16 numbers
Signature-based misfile scan (fib, errorspot, parajumble, idioms, spelling, prep, phrasal, voice, narration; rc/cloze passage groups nahi chhede), 418 moves, ids unique: errorspot -> phrasereplace 121, fib 32, antonyms 22, synonyms 13, parajumble 9, idioms 5, sentimp 4, narration 3, voice 2, prep 2; fib -> homophones 54, phrasal 30, prep 27, antonyms 22, synonyms 12, idioms 11, parajumble 9, errorspot 8, spelling 7, phrasereplace 2; voice -> narration 20; parajumble -> fib 1; idioms -> antonyms 1, phrasal 1. Hataye (defect): 2 (errorspot, dangling 'Same rule as Q1/Q45' explanation). 
23 'invalid' (len(o)==5 / a=4) sawaal errorspot (21, A-E with 'No Error') + rc (2) 5-option designed format hai, defect nahi - rakhe. rc/cloze me missing-passage koi nahi. Exact-duplicate scan (non-rc): 0.
English index v13, total 11629, 26 chapters.
Known issues: errorspot ('Select the correct substitution' type) phrasereplace me gaye; errorspot ad95b4ae jaisa 1 sawaal ki explanation answer se alag lagti hai (rakha). rc me vocab-from-passage (synonym/antonym) rc me hi rakhe.

## Chunk 17 numbers
data/topics english files scan (grammar, grammar_chapterwise, homophone, idiom, narration, phrasal, preposition, spelling, vocab, voice, eduquity, english_topicwise). Intentional-mix (nahi hilaya): vocab (OWS/syn/ant/idiom/homonym mix, Complete Vocab), miscgrammar (english_topicwise), grammar_chapterwise chapter15/19. Baaki files (idiom, homophone, phrasal, preposition, spelling, eduquity, grammar) me flags sab false positive - kuch nahi hilaya.
english_topicwise (compact format, qn sequential): 1624 -> 1614. Moves: errorspotting -> synonyms 14, antonyms 22, idiomsphrases 6, fillblanks 9, activepassivetw 5, narrationtw 3, parajumbles 9, sentenceimprovement 13; fillblanks -> antonyms 19, synonyms 9, idiomsphrases 11, errorspotting 11, parajumbles 7, sentenceimprovement 4, spellingtw 3; sentenceimprovement -> fillblanks 3, narrationtw 1, onewordsub 1; idiomsphrases -> antonyms 1; onewordsub -> antonyms 1; synonyms -> idiomsphrases 1. Final counts: synonyms 129, antonyms 141, synantonyms 45, idiomsphrases 128, onewordsub 66, fillblanks 483, spellingtw 107, errorspotting 178, sentenceimprovement 102, activepassivetw 44, narrationtw 33, conjunctions 4, articles 1, parajumbles 105, miscgrammar 48. Exact duplicates after moves: 0.
Hataye (defect, 14): english_topicwise 10 (answer-key/'source cut off'/dangling 'same as earlier item' notes ya truncated stem: fillblanks 1, antonyms 1, onewordsub 1, sentenceimprovement 2, activepassivetw 1, narrationtw 1, parajumbles 3); narration set4 2 (explanation me 'official answer key' hedge + 'previous question' ref), voice set5 1 (answer key hedge), grammar_chapterwise chapter19 1 (garbled option + leaked tracker text). data/index.json counts updated (english_topicwise, narration set4 8, voice set5 9, grammar_chapterwise chapter19 9). app.js/tools me change nahi.
Known issues: voice set33 me 2 sentence-improvement type sawaal (cross-file move nahi kiya, schema alag); grammar set21-24 (39 Q) me 5 options (A-D + No error) designed format - defect nahi; vocab/eduquity (OWS 'Choose the word that means' style) sahi; fillblanks me ~36 preposition fill-blanks rakhe (topicwise me prep topic nahi).

## Chunk 18 numbers
Reading (data/reading: c 98 units/474 Q, r 165/837 Q, p 639 items): type-misfile scan (cloze blanks vs RC vs para-jumble format) - koi misfile nahi, kuch move/hataya nahi, index.json untouched. Defect scan: r, p clean; c me 21 Q ke `t` khaali hain par passage me numbered blanks ((1)/(A)) hain (designed, rakhe); c6/c10/c17 single-sentence cloze fragments rakhe (group nahi todna). data/reading/Wb 2-byte junk file pehle se hai, chhoda.
Opt-Elim (data/optelim/data.json, Q 1664, SUB 16, compact format): keyword scan se sirf 2 SUB tag fix: MGNREGA 'What does the MGNREGA stand for?' Economics -> Govt Schemes; Kepler periods law Geography -> Science. Baaki flags (Economic Geography/Economics/Intl Relations overlaps, Mughal architecture Art vs Medieval) borderline/designed overlap - rakhe. Hataye: 0. Counts same (Q 1664, S 67 sets x25).
Known issues: Opt-Elim me 9 exact-duplicate Q pairs (S index lists me use hote hain, isliye hataye nahi); chunk 19 me decide.

## FINAL SUMMARY (chunk 19) - ALL CHUNKS DONE
Verified: saari JSON valid; maths index v16 total 3832 (35 chapters), reasoning v11 total 5848 (32), superenglish v13 total 11629 (26) - index n = actual, total = sum, orphan files 0, ids unique directory-wise; len(o)==4 & a in 0..3 sab maths/reasoning me; superenglish me sirf 22 designed 5-option (errorspot 20 A-E + rc 2). data/index.json topic counts = actual (50 topics checked); sirf CODING_SETS/ODDONE_SETS/SERIES_SETS 0-question khaali files (pre-existing, app me koi asar nahi). app.js node --check OK. GK files original zip se byte-identical. Tables (MATHS/REASONING/ENGLISH) upar purani n dikhate hain - actual n hamesha index.json me.
Open (decide nahi kiya): Opt-Elim 9 exact-duplicate Q pairs (S index lists me use); voice set33 me 2 sentence-improvement-type Q; reasoning/english me borderline noise jo 'Known issues' me likhe hain.

## Known issues
- ratio chapter me kuch SSC-style 'ratio-based' sawaal (e.g. dividend/investment ratio, sharing) R me rakhe; 1-2 borderline (Pct/CI-jaise investment question) partnership me hain - chunk 8 cross-check me dekhna.
- Ages chapter me 3 mixed (average + age puzzle) sawaal Average me rakhe; chunk 8 me dekh sakte ho.
- tw/pipes me 2-3 volume/rate-type (water filter tank rate, taps diameter) pipes me hain; chunk 8 cross-check.
- pct me percent-change-in-mensuration (cube edge, area %) wale sawaal pct me hi rakhe (percentage type); chunk 8 me decide.
- sici me ab 6 extra (pct se) aaye hain; chunk 5 me SI/CI split me dhyan.
- Probability alag chapter nahi (chunk 8 check: sirf ~8 Q), pc me hi.
- Remainders chapter (rem) chunk 8 me ban gaya. Digital-sum alag topic file topics/digitalsum.json me hai (chunk 13 scope).
- Geometry 397 bada hai; sub-chapters (triangle/circle/etc.) taxonomy me nahi, aise hi rakho.
- Maths files me 'x','eh','oh' keys sab questions me nahi hain (normal).

## MATHS data/maths (index v14, total 3818)
| key | label | n (abhi) | status |
|---|---|---|---|
| numsys | Number System | 214 | DONE |
| rem | Remainders & Digital Sum | 21 | DONE |
| lcmhcf | LCM & HCF | 65 | DONE |
| simpl | Simplification & Approximation | 49 | DONE |
| surds | Surds & Indices | 16 | DONE |
| pct | Percentage | 207 | DONE |
| ratio | Ratio & Proportion | 122 | DONE |
| mixture | Mixture & Alligation | 86 | DONE |
| partnership | Partnership | 96 | DONE |
| avg | Average | 162 | DONE |
| ages | Ages | 40 | DONE |
| plmd | Profit & Loss | 205 | DONE |
| disc | Discount & Marked Price | 158 | DONE |
| si | Simple Interest | 145 | DONE |
| ci | Compound Interest | 107 | DONE |
| tw | Time & Work | 136 | DONE |
| pipes | Pipes & Cisterns | 66 | DONE |
| tsd | Time, Speed & Distance | 172 | DONE |
| trains | Trains | 51 | DONE |
| boats | Boats & Streams | 34 | DONE |
| races | Races & Circular Motion | 72 | DONE |
| algebra | Algebra | 111 | DONE |
| poly | Polynomials & Quadratic | 28 | DONE |
| seqser | Sequence & Series | 21 | DONE |
| geo | Geometry | 401 | DONE |
| cgeo | Coordinate Geometry | 48 | DONE |
| men2d | Mensuration 2D | 162 | DONE |
| men3d | Mensuration 3D | 290 | DONE |
| trig | Trigonometry | 96 | DONE |
| htd | Heights & Distances | 73 | DONE |
| di | Data Interpretation | 285 | DONE |
| pc | Permutation, Combination & Probability | 23 | DONE |
| sets | Set Theory | 16 | DONE |
| stats | Statistics | 24 | DONE |
| unitds | Unit Digit | 16 | DONE |

## REASONING data/reasoning (index v9, total 5848) -- chunk 10 ke baad naye chapters upar Chunk 10 numbers me; baaki table purani n dikhati hai (chunks 11-12 me refresh)
| key | label | n (abhi) | status |
|---|---|---|---|
| series | Series (Number · Letter · Alphanumeric) | 848 | TODO |
| analogy | Analogy | 511 | TODO |
| odd | Classification (Odd One Out) | 329 | TODO |
| coding | Coding-Decoding | 403 | TODO |
| blood | Blood Relations | 268 | TODO |
| direction | Direction & Distance | 84 | TODO |
| ranking | Ranking & Order | 123 | TODO |
| syllogism | Syllogism | 322 | TODO |
| statement | Statement · Conclusion · Argument | 973 | TODO |
| seating | Seating & Puzzles | 227 | TODO |
| calendar | Calendar | 200 | TODO |
| clock | Clock | 35 | TODO |
| venn | Venn Diagram | 89 | TODO |
| dictionary | Dictionary / Logical Order | 301 | TODO |
| wordformation | Word Formation & Letter-Word | 184 | TODO |
| misc | Miscellaneous (Maths Operations · Inequality · Figures) | 967 | TODO |

## ENGLISH data/superenglish (index v12, total 11631, 26 chapters; chunks 14-15 ke baad table ki purani n rows stale - actual n index.json me)
| key | label | n (abhi) | status |
|---|---|---|---|
| synonyms | Synonyms | 1071 | DONE |
| antonyms | Antonyms | 826 | DONE |
| ows | One Word Substitution | 644 | DONE |
| idioms | Idioms & Phrases | 1532 | TODO |
| spelling | Spelling | 939 | TODO |
| homophones | Homonyms & Homophones | 219 | TODO |
| fib | Fill in the Blanks | 939 | TODO |
| cloze | Cloze Test | 120 | TODO |
| rc | Reading Comprehension | 1569 | TODO |
| errorspot | Error Spotting | 753 | TODO |
| sentimp | Sentence Improvement & Phrase Replacement | 373 | TODO |
| voice | Active–Passive Voice | 417 | TODO |
| narration | Direct–Indirect Speech | 440 | TODO |
| parajumble | Para Jumbles | 652 | TODO |
| prep | Prepositions | 650 | TODO |
| phrasal | Phrasal Verbs | 262 | TODO |
| noun | Noun | 11 | TODO |
| pronoun | Pronoun | 5 | TODO |
| adjective | Adjective | 10 | TODO |
| verb | Verb | 6 | TODO |
| tense | Tense | 23 | TODO |
| sva | Subject–Verb Agreement | 0 | TODO |
| adverb | Adverb | 13 | TODO |
| conj | Conjunction | 5 | TODO |
| article | Articles | 11 | TODO |
| cond | Conditional Sentences | 3 | TODO |
| qtag | Question Tags | 7 | TODO |
| figures | Figures of Speech | 31 | TODO |
| structure | Sentence Structure | 15 | TODO |
| pos | Parts of Speech, Phrases & Clauses | 68 | TODO |
| misc | Misc Grammar & Sentence Transformation | 12 | TODO |

## Post-final follow-up
Opt-Elim: 9 exact-duplicate pairs me se 6 (same trick-explanation `t`) permanent hataye (Q 1664 -> 1658, S index lists remap, sets ab 14-25 Q). 3 pairs (alag explanation `t`) rakhe. Baaki open item: voice set33 2 sentence-improvement Q.

## Chunk 20 (maths+reasoning broken-question removal)
Scope: data/maths, data/reasoning chapter files + topics math_pyq/sp/p75, reasoning_sp/p75 scan -> koi image-missing/blank/dup/empty defect nahi (images remote URL; roman-option Q math_sp spmock060 #21 valid, rakha). Network band tha: thepunditstesting.hranker.com ke ~23 maths Q ke image URL verify nahi hue.
data/topics/reasoningmock.json (text-only, no images): 667 Q hataye (maths/reasoning/quant only; GK/English/Computer sets nahi chhue; mixed sets me non-figure defect sirf mr_like Q par): figure/option-image missing 416 (fig_missing_text 320 + fig_missing_opts 96), blank option 75, duplicate option 73, adhura formula 119, empty text 1. Prefix: spquant 193, p75quant 196, mainssectional 128, mainsfull 122, spreasoning 28. Sets 1399 -> 1391 (khaali sets hata diye), Q 42602 -> 41935, qn sequential renumber, data/index.json REASONINGMOCK_SETS counts update. Hataye hue Q ki list: handoff/removed_reasoningmock.json. Tools: handoff/apply_reasoningmock.py, rules.py.
Open: mainsmock/emmocks HTML+JSON mocks scan nahi; hranker URLs verify; GK/English reasoningmock sets (dup/blank) out of scope.

## FILL PROJECT (sets complete karna) - target: har mock/quiz set full size (25 mock / file ka max-mode), donor = app ke andar ke unused sawaal (dedupe by text, defect-free)
Tool: handoff/fillkit.py (chapter_donors, save, update_index), handoff/chunk21_maths.py (example). Donor pool maths bacha: ~214 (di skip). Format preserve: math_sp/p75 default separators, math_pyq compact. Naye Q append, qn sequential, data/index.json counts update.
Chunks:
- 21 DONE: SP_MATH (118 Q add, 80 sets), P75_MATH (15), MATH_PYQ mock01-44 (18; plain text donors) -> sab 25. (math_pyq chapter-wise sets (numbersystem etc.) topic lists hain, nahi chhue.)
- 22 DONE: SP_REASONING (14 Q, 13 sets) + P75_REASONING (10 Q, 10 sets) -> sab 25 (donors data/reasoning unused, clean() defect filter, topic = chapter se map). Chhote topic files (mode tak, append, same-topic text-only donors): bloodrel 34, calendarreasoning 15, decisionmaking 19, letteranalogy 15, letterseriesds 38, letterword 19, statementconclusion 11, syllogism 15, orderranking 3, directiondistance 1, seating 2, seatinghard 1, wordformation 6, dictorder 1. Scripts: handoff/chunk22_spp75.py, chunk22_small.py, c22_common.py (BASE path /home/claude/w/CGLY/data - extract ke hisaab se badlo). Logs: chunk22_added_*.json.
  Baaki (chhote): clockio 3 (clock donors image-based/bache nahi), decisionmaking 1, alphanum 1, numanalogy 1, wordarrangeage 1, logicmix 7, reasoninghardmix 6 (mixed - skip), digitalsum 23 + unitdigit 5 (schema exam/sol1/sol2, maths donors alag - chunk 25 me), wordanalogy 0.
- 23 PARTIAL: reasoningmock.json - sirf 90 unused reasoning donors bache (reasoningmock me chapter Q pehle se ghuse hue, dedupe ke baad). Greedy chhote gap pehle: +89 Q (mock 66, p75reasoning 15, spreasoning 8) -> 69 sets poore. Baaki: 30 sets short (mock/spreasoning/p75reasoning), ~337 Q chahiye, donors khatam. spquant (~312) + p75quant (restore target = cur+removed, ~389) + mainsfull/mainssectional (250 removed) NAHI kiye (maths donors bahut kam). Script: handoff/chunk23_reasoning.py. Aage ke liye naye donors chahiye (user se naya source ya relax-dedupe decision).
- 24 PARTIAL DONE: English - superenglish unused donors dedupe ke baad 488 (idioms 203, ows 140, antonyms 70, synonyms 66, baaki 9). Add: IDIOM_SETS +38 (sab 10), VOCAB_SETS +18 (sab 10), SP_ENGLISH +22 (sab 25), P75_ENGLISH +23 (sab 25), ENGLISHMOCK +76 (sab 25). Topic label vocab-type (OWS/Synonyms/Antonyms/Idioms), set me jo type kam tha wo pehle. Script: handoff/chunk24_pool.py + chunk24_english.py. Donors bache: antonyms 55, idioms 157, ows 48, synonyms 42 (+errorspot 3, fib 3, parajumble 2, sentimp 1).
  Baaki/skip: narration (~17), voice (7), homophone (9), spelling (9), phrasal (5), grammar (1), preposition (1) -> inke donors superenglish me unused nahi bache. ENGLISHFULLMOCK (sets 169-199 Q, natural variation, target clear nahi) nahi chhua.
- 25 DONE (final): CALCQUIZ +8 (set18/30/43/45/47/48/49 -> sab 20; maths donors sirf 24 bache the aur drill-type nahi, isliye same template se computed arithmetic drills generate kiye, answer eval se verified; handoff/chunk25_calcquiz.py). Final verify: 50 topic keys, index counts match (sirf CODING/ODDONE/SERIES stub files + MATH_PYQ chapter keys purane/natural), qn sequential, app.js + index.html unchanged.
FINAL PENDING (naye donor source ke bina nahi hoga): reasoningmock 30 sets (~337 Q), spquant (~312) + p75quant (~389 restore) + mainsfull/mainssectional (250 removed), English narration ~17/voice 7/homophone 9/spelling 9/phrasal 5/grammar 1/preposition 1, ENGLISHFULLMOCK (target unclear), DIGITALSUM 23 + UNITDIGIT 5 (exam-labelled real Q hain, fabricate nahi kiye), clockio 3, decisionmaking 1, alphanum 1, numanalogy 1, wordarrangeage 1, logicmix 7, reasoninghardmix 6.
Skip (natural topic lists, size mode meaningful nahi): ENGLISH_TOPICWISE, EDUQUITY, GRAMMAR_CHAPTERWISE, MATH_PYQ chapter keys, STATEMENT_SETS, GK.
