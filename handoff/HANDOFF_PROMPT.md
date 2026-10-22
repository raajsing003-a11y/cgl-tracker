# NEW CHAT PROMPT (copy-paste karo, saath me CGLY_final.zip + is zip ko upload karo)

CGLY_final.zip (original app) aur cleanup_handoff.zip (tools/ + notes) upload hain. Kaam: Maths + Reasoning ke toote hue sawaal HATAO
(image-based jinki image nahi / adhure / error wale). Hinglish me, chhota jawab, koi table nahi. GK/English out of scope.
Pehle CLEANUP_TRACKER.md padho. Format preserve karo (compact separators, qn sequential, set counts).

## Ab tak ka nateeja (kuch DELETE nahi hua, sirf analysis)
1. data/maths + data/reasoning chapter files: saaf. Saari images remote URL hain (oliveboard, thepunditsofficial, ssccglpinnacle, googleusercontent, thepunditstesting.hranker.com). Koi <img> khaali/missing nahi. Figure-keyword hits sab false positive (number-series 'pattern', DI text tables). Network band tha, to URL live hai ya nahi check nahi hua. Shak: thepunditstesting.hranker.com ke ~23 maths Q (URL me space) - network ho to check karo.
2. math_pyq / math_sp / math_p75 / reasoning_sp / reasoning_p75 (topics): images maujood, structural defect 0. Hits false positive.
3. ASLI PROBLEM: data/topics/reasoningmock.json (42602 Q, 1399 sets, TEXT-ONLY, koi image nahi). Prefixes: mock, spreasoning, spquant, p75quant, p75reasoning, mainssectional, mainsfull, cglpre, cpopre (+GK/English/Computer sets jo skip karne hain). Schema: {qn, hi:{prompt[],options,solution}, en:{...}, answer, exam}.
   Rules ke candidates (tools/candidates_reasoningmock.json, tools/rules.py): fig_missing_opts ~100 (options sirf I/II/III/IV, image nahi), fig_missing_text ~450 (pie chart/graph/figure/mirror image... text me par image nahi), blank_option 75 (p75quant), dup_option 81, empty_text 1, broken_formula ~181.
   PRECISION PROBLEMS jo theek karne hain pehle: fig_missing_text me false positives (seating 'cube' words, GK 'embedded in', English para-jumble 'given', geometry 'In the following figure' sach me missing hai - rakho candidate); broken_formula me false positives ('If, later...' clock/age Q, 'If A, B and C denote...' symbol Q). Ek-ek rule ke 15-20 sample padho phir hi delete.
   Mixed sets (cglpre/cpopre/mainsfull): sirf maths/reasoning-jaise Q par apply (subject()/mr_like() in rules.py), GK/English na chhuo.
4. Delete ke baad: sets me qn sequential renumber, data/index.json -> REASONINGMOCK_SETS.sets counts update, CLEANUP_TRACKER.md me chunk 20 likho. app.js me koi change nahi chahiye (sets dynamic).
5. Optional: mainsmock/emmocks HTML+JSON mocks abhi scan nahi hue.

## Tools
tools/norm.py (loaders), detect.py, rules.py (defects()), candidates_reasoningmock.json. BASE path norm.py me /home/claude/w/CGLY/data hai - extract ke hisaab se badlo.
Extract: unzip CGLY_final.zip 'CGLY/data/maths/*' 'CGLY/data/reasoning/*' 'CGLY/data/index.json' 'CGLY/data/topics/*' 'CGLY/app.js' 'CGLY/CLEANUP_TRACKER.md'
