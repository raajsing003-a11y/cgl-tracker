import sys,re,collections,glob; sys.path.insert(0,'/home/claude/w'); sys.path.insert(0,'/home/claude/w/CGLY/handoff')
from c22_common import *
idx=json.load(open(BASE+'/index.json'))['topics']
key={v['file'].split('/')[-1][:-5]:kk for kk,v in idx.items()}
EF=['english_sp','english_p75','englishmock','englishfullmock','idiom','vocab','narration','voice','homophone','spelling','phrasal','grammar','preposition','english_topicwise','grammar_chapterwise']
def etext(q):
    w=q.get('word')
    if w is None: w=' '.join(q.get('options',[]))   # spelling
    return w if isinstance(w,str) else ' '.join(w)
used=set()
for f in EF:
    S=load(f,key[f])
    for v in S.values():
        for q in v:
            if isinstance(q,dict): used.add(norm(etext(q)))
# reasoningmock English sets (spenglish/p75english) too
R=load('reasoningmock','REASONINGMOCK_SETS')
for s,v in R.items():
    if re.sub(r'\d+$','',s) in('spenglish','p75english'):
        for q in v: used.add(norm(' '.join(q['en']['prompt'])))
def good(q):
    t=q.get('t') or ''; o=q.get('o') or []
    return bool(t.strip()) and len(o)==4 and all(str(x).strip() for x in o) and len({norm(x) or str(x) for x in o})==4 and isinstance(q.get('a'),int) and 0<=q['a']<4 and bool((q.get('e') or '').strip()) and not IMG.search(t+''.join(o))
pool=collections.defaultdict(list); seen=set(used)
for f in sorted(glob.glob(BASE+'/superenglish/*.json')):
    if f.endswith('index.json'): continue
    k=f.split('/')[-1][:-5]
    for q in json.load(open(f,encoding='utf-8')):
        n=norm(q['t'])
        if n in seen or not good(q): continue
        seen.add(n); pool[k].append(q)
if __name__=='__main__':
    print(len(used),{k:len(v) for k,v in pool.items()},sum(len(v) for v in pool.values()))
