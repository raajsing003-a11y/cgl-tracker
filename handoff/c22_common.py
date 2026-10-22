import sys,json,re,html,glob,collections,random
sys.path.insert(0,'/home/claude/w/CGLY/handoff')
import fillkit
fillkit.BASE='/home/claude/w/CGLY/data'
from fillkit import norm,plain,TAG,IMG,load,save,update_index
BASE=fillkit.BASE
def qtext(q):
    en=q.get('en')
    if isinstance(en,dict): return ' '.join(en.get('prompt',[]))
    return en or ''
def used_texts(files):
    used=set()
    for f,k in files:
        for qs in load(f,k).values():
            for q in qs: used.add(norm(qtext(q)))
    return used
def clean(q):
    t=q.get('t') or ''; o=q.get('o') or []; e=q.get('e') or ''
    if not t.strip() or len(o)!=4: return False
    if any(not str(x).strip() for x in o): return False
    if len(set(norm(x) or str(x) for x in o))<4: return False
    if not isinstance(q.get('a'),int) or not 0<=q['a']<4: return False
    if not e.strip(): return False
    hasimg=bool(IMG.search(t+''.join(o)))
    low=t.lower()
    if not hasimg and re.search(r'\b(pie chart|bar graph|figure|mirror image|water image|venn diagram|diagram|image)\b',low) and 'shown' in low: return False
    if not hasimg and all(re.fullmatch(r'\s*(i|ii|iii|iv|v)(\s*(and|,)\s*(i|ii|iii|iv|v))*\s*(only)?\.?\s*',x,re.I) for x in o) and not re.search(r'\bI\.',t): return False
    return True
ORD=['Analogy 1','Analogy 2','Blood Relations','Clocks and Calendars','Coding Decoding','Critical Reasoning','Data Sufficiency','Direction Sense','General Mixed','Inequality','Logical Order/Dictionary','Mathematical Signs & Symbols','Matrix Number Series','Odd One Out 1','Odd One Out 2','Puzzles and Arrangements 1','Puzzles and Arrangements 2','Puzzles and Arrangements 3','Ranking and Positioning','Series 1','Series 2','Similarity 1','Similarity 2','Syllogism','Venn Diagram','Visual Reasoning 1','Visual Reasoning 2','Visual Reasoning 3','Visual Reasoning 4','Visual Reasoning 5','Word matrix','Words Based']
def window_missing(qs):
    pres=[q['topic'] for q in qs]
    best=None
    for s in range(len(ORD)):
        w=[ORD[(s+i)%len(ORD)] for i in range(25)]
        if all(p in w for p in pres) and len(set(pres))==len(pres):
            miss=[x for x in w if x not in pres]
            if len(miss)==25-len(pres): best=(s,w,miss); break
    return best
def best_window(qs):
    pres=[q['topic'] for q in qs]
    best=None
    for s in range(len(ORD)):
        w=[ORD[(s+i)%len(ORD)] for i in range(25)]
        ov=sum(1 for p in pres if p in w)
        if best is None or ov>best[0]: best=(ov,s,w)
    ov,s,w=best
    return s,w,[x for x in w if x not in pres],[p for p in pres if p not in w]
