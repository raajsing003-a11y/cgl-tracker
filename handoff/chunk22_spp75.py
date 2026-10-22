import sys,json,random,collections
sys.path.insert(0,'/home/claude/w'); sys.path.insert(0,'/home/claude/w/CGLY/handoff')
from c22_common import *
from fillkit import chapter_donors
random.seed(22)
TOPIC={'analogy':'Analogy 1','blood':'Blood Relations','calendar':'Clocks and Calendars','clock':'Clocks and Calendars','coding':'Coding Decoding','argument':'Critical Reasoning','assumption':'Critical Reasoning','causeeffect':'Critical Reasoning','statement':'Critical Reasoning','datasuff':'Data Sufficiency','direction':'Direction Sense','misc':'General Mixed','inputoutput':'General Mixed','ineq':'Inequality','dictionary':'Logical Order/Dictionary','mathops':'Mathematical Signs & Symbols','numpuzzle':'Matrix Number Series','odd':'Odd One Out 1','seating':'Puzzles and Arrangements 1','ranking':'Ranking and Positioning','series':'Series 1','situation':'General Mixed','syllogism':'Syllogism','venn':'Venn Diagram','wordformation':'Words Based','action':'Critical Reasoning'}
def blocks(s): return ''.join('<p>%s</p>'%l for l in str(s).split('\n') if l.strip())
files=[('reasoning_sp','SP_REASONING_SETS','spmock'),('reasoning_p75','P75_REASONING_SETS','p75mock')]
used=used_texts([(f,k) for f,k,_ in files]+[('reasoninghardmix','REASONINGHARDMIX_SETS')])
pool=chapter_donors('reasoning',used,defect_fn=lambda q: not clean(q))
# SP/P75 are visual/mixed: keep donors from broad chapters, skip ones that need big context (seating is ok)
random.shuffle(pool)
log={}
for f,k,pre in files:
    S=load(f,k); n_added=0
    for sk,qs in S.items():
        if not sk.startswith(pre) or len(qs)>=25: continue
        need=25-len(qs)
        for _ in range(need):
            d=pool.pop(0); q=d['q']
            en={'prompt':[blocks(q['t'])],'options':list(q['o']),'solution':blocks(q['e'])}
            hi={'prompt':[blocks(q.get('h') or q['t'])],'options':list(q.get('oh') or q['o']),'solution':blocks(q.get('eh') or q['e'])}
            qs.append({'qn':len(qs)+1,'hi':hi,'en':en,'answer':q['a'],'topic':TOPIC.get(d['key'],d['label'])})
            n_added+=1; log[f'{f}:{sk}']=log.get(f'{f}:{sk}',0)+1
    save(f,k,S,ensure_ascii=False); update_index(k,S)
    print(f,'short left',sum(1 for v in S.values() if len(v)<25),'added',n_added)
json.dump(log,open('/home/claude/w/CGLY/handoff/chunk22_added_spp75.json','w'),indent=0)
print('donors left',len(pool),collections.Counter(d['key'] for d in pool).most_common(8))
