import sys,json,random,collections,re
sys.path.insert(0,'/home/claude/w'); sys.path.insert(0,'/home/claude/w/CGLY/handoff')
from c22_common import *
from fillkit import chapter_donors
random.seed(22)
idx=json.load(open(BASE+'/index.json'))['topics']
key={v['file'].split('/')[-1][:-5]:kk for kk,v in idx.items()}
COMPACT={'clockio','decisionmaking','dictorder'}
# file -> (donor chapter, extra filter)
alpha=lambda q: all(re.fullmatch(r"[A-Za-z ,\-]+",str(x).strip()) for x in q['o'])
SEL={'bloodrel':('blood',None),'calendarreasoning':('calendar',None),'clockio':('clock',None),'decisionmaking':('situation',None),
 'letteranalogy':('analogy',lambda q:'letter' in q['t'].lower()),'letterseriesds':('series',lambda q:alpha(q) and '?' in q['t']),
 'letterword':('wordformation',None),'statementconclusion':('statement',None),'syllogism':('syllogism',None),
 'orderranking':('ranking',None),'directiondistance':('direction',None),'seating':('seating',None),'seatinghard':('seating',None),
 'wordformation':('wordformation',None),'dictorder':('dictionary',None)}
allf=list(SEL)
used=used_texts([(f,key[f]) for f in allf]+[('reasoning_sp','SP_REASONING_SETS'),('reasoning_p75','P75_REASONING_SETS'),('reasoninghardmix','REASONINGHARDMIX_SETS')])
pool=chapter_donors('reasoning',used,defect_fn=lambda q: not clean(q) or IMG.search(q['t']+''.join(q['o'])+q['e']))
by=collections.defaultdict(list)
for d in pool: by[d['key']].append(d)
for v in by.values(): random.shuffle(v)
def lines(s): return [l.strip() for l in plain(s).split('\n') if l.strip()] or ['']
log={}
for f in allf:
    k=key[f]; S=load(f,k)
    c=collections.Counter(len(v) for v in S.values()); mx=max(c.values()); T=max(n for n,m in c.items() if m==mx)
    ch,flt=SEL[f]; src=by[ch]; got_n=0; short=0
    for sk,qs in S.items():
        while len(qs)<T:
            i=next((j for j,d in enumerate(src) if flt is None or flt(d['q'])),None)
            if i is None: short+=1; break
            d=src.pop(i); q=d['q']
            en={'prompt':lines(q['t']),'options':[plain(x) for x in q['o']],'solution':plain(q['e'])}
            hi={'prompt':lines(q.get('h') or q['t']),'options':[plain(x) for x in (q.get('oh') or q['o'])],'solution':plain(q.get('eh') or q['e'])}
            qs.append({'qn':len(qs)+1,'hi':hi,'en':en,'answer':q['a']}) if f not in COMPACT else qs.append({'hi':hi,'en':en,'answer':q['a'],'qn':len(qs)+1})
            got_n+=1; log[f'{f}:{sk}']=log.get(f'{f}:{sk}',0)+1
    kw=dict(ensure_ascii=False,separators=(',',':')) if f in COMPACT else dict(ensure_ascii=False)
    save(f,k,S,**kw); update_index(k,S)
    print(f,'target',T,'added',got_n,'short sets left',sum(1 for v in S.values() if len(v)<T),'donors left',len(src))
json.dump(log,open('/home/claude/w/CGLY/handoff/chunk22_added_small.json','w'),indent=0)
