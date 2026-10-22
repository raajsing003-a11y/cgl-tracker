# GK Quiz merge — PART 1 DONE

## Kya hua
- Super Practice GK (169 quizzes, 3140 Q) + 75 Day GK (130 quizzes, 3244 Q) merge -> `gkquiz/` (299 quizzes, 6384 Q).
  - `gkquiz/sp/*.json`, `gkquiz/p75/*.json` = original JSON byte-identical (Hindi+English, formatting untouched)
  - `gkquiz/manifest.json` = topic-wise tree: 13 subjects -> merged topics -> quizzes (+ flat `sp`/`p75` lists for GK Reader linker)
- GK menu (Quiz > GK) me naya button "GK Quiz — Topic-wise" (`calcGkQuizBtn`, page `calcPage-gkquiz`), subject > topic > quiz accordion + search + ✅ done marks.
- Quizzes purane native engines par hi chalte hain (sp -> openSPMock('gk'), p75 -> openP75Mock('gk')); fetch path gkquiz/ par redirect. Back/result -> `spBackPage()/p75BackPage()` (gkquiz ya gkreader).
- GK Reader chapter ke niche wala auto quiz linker ab gkquiz/manifest.json se padhta hai.
- Super Practice + 75 Day se GK POORA delete: menu entries, GK-specific code, manifests ke `gk` keys, folders (superpractice/gk, superpractice/data/gk, practice75/gk, practice75/data/gk; 142 purane orphan JSON bhi - unke sab sawaal manifest wale quizzes me already the). Card counts: SP 491 mocks, 75 Day 254 mocks.
- Verified: 299 files exist, Q counts match, jsdom test (render, search, row click routing, back targets), node --check app.js OK.
- Build scripts: `tools_gkquiz/build_gkquiz.py` (topic mapping), `patch_gkquiz.py`.

- Computer Knowledge (14 quizzes, 280 Q) bhi GK Quiz me shift (subject "Computer Knowledge", data gkquiz/computer/), Super Practice se delete. Ab total 313 quizzes, 6664 Q. SP card = 477 mocks.
- Duplicate report: 54 groups (13 SP<->75Day), kuch delete nahi kiya.

## Part 2 (baaki)
1. Real browser/phone test: GK Quiz page, quiz start/result/back, Hindi<->English toggle, dark mode, old ✅ marks.
2. Cross-source duplicate questions (SP vs 75 Day) check karna — sirf report, delete user se pooch ke.
3. Topic grouping tweak agar user kuch alag chahe (mapping `build_gkquiz.py` me T dict).
4. GK Reader chapter CTA me "Full GK Quiz" shortcut (optional).
- Super Practice aur 75 Day Practice cards, menu pages aur data folders (superpractice/, practice75/) poore delete. Native engines + Super Sets/GK Quiz untouched.
