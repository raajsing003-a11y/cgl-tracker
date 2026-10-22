import sys,json,random,collections,re
sys.path.insert(0,'/home/claude/w'); sys.path.insert(0,'/home/claude/w/CGLY/handoff')
from c22_common import *
from fillkit import chapter_donors
random.seed(23)
S=load('reasoningmock','REASONINGMOCK_SETS')
pref=lambda s: re.sub(r'\d+$','',s)
topic_files=[('reasoning_sp','SP_REASONING_SETS'),('reasoning_p75','P75_REASONING_SETS'),('reasoninghardmix','REASONINGHARDMIX_SETS')]
idx=json.load(open(BASE+'/index.json'))['topics']
key={v['file'].split('/')[-1][:-5]:kk for kk,v in idx.items()}
for f in ['alphanum','bloodrel','calendarreasoning','clockio','decisionmaking','directiondistance','letteranalogy','letterseriesds','letterword','logicmix','numanalogy','orderranking','seating','seatinghard','statementconclusion','syllogism','wordanalogy','wordarrangeage','wordformation','dictorder']: topic_files.append((f,key[f]))
used=used_texts(topic_files)
for v in S.values():
    for q in v: used.add(norm(qtext(q)))
pool=chapter_donors('reasoning',used,defect_fn=lambda q: not clean(q) or IMG.search(q['t']+''.join(q['o'])+q['e']))
by=collections.defaultdict(list)
for d in pool: by[d['key']].append(d)
for v in by.values(): random.shuffle(v)
print('pool',len(pool),{k:len(v) for k,v in by.items()})
labels=collections.Counter(q.get('exam') for s,v in S.items() if pref(s)=='mock' for q in v)
print(labels)
LAB={'analogy':'Word Analogy','blood':'Blood Relations','coding':'Coding-Decoding','series':'Series','odd':'Odd One Out','wordformation':'Word Formation','dictionary':'Dictionary / Alphabetical Order','seating':'Seating Arrangement','ranking':'Order & Ranking','calendar':'Calendar Reasoning','syllogism':'Syllogism','assumption':'Statement Reasoning','argument':'Statement Reasoning','ineq':'Inequality & Word Formation','datasuff':'Statement, Conclusion & Data Sufficiency','inputoutput':'Clock & Input-Output'}
TG={'mock':25,'spreasoning':20,'p75reasoning':25}
EX={'spreasoning':'Super Practice - Reasoning','p75reasoning':'75 Day Practice - Reasoning'}
need=[(len(v),s) for s,v in S.items() if pref(s) in TG and len(v)<TG[pref(s)]]
need=sorted((TG[pref(s)]-n,s) for n,s in need)
print('total need',sum(n for n,_ in need),'sets',len(need))
def lines(s): return [l.strip() for l in plain(s).split('\n') if l.strip()] or ['']
allp=[d for v in by.values() for d in v]; random.shuffle(allp)
def mk(d,qs,p):
    q=d['q']
    ex=EX.get(p) or LAB.get(d['key'],'Reasoning')
    return {'qn':len(qs)+1,'hi':{'prompt':lines(q.get('h') or q['t']),'options':[plain(x) for x in (q.get('oh') or q['o'])],'solution':plain(q.get('eh') or q['e'])},'en':{'prompt':lines(q['t']),'options':[plain(x) for x in q['o']],'solution':plain(q['e'])},'answer':q['a'],'exam':ex}
added=collections.Counter(); log={}
for n,s in need:
    if len(allp)<n: continue
    p=pref(s); qs=S[s]
    for _ in range(n):
        if p=='mock':
            have=collections.Counter(q.get('exam') for q in qs)
            allp.sort(key=lambda d:have[LAB.get(d['key'],'Reasoning')])
        d=allp.pop(0); qs.append(mk(d,qs,p)); added[p]+=1; log[s]=log.get(s,0)+1
save('reasoningmock','REASONINGMOCK_SETS',S,ensure_ascii=False,separators=(',',':')); update_index('REASONINGMOCK_SETS',S)
left=[(TG[pref(s)]-len(v)) for s,v in S.items() if pref(s) in TG and len(v)<TG[pref(s)]]
print('added',dict(added),'sets still short',len(left),'Q still needed',sum(left),'donors left',len(allp))
json.dump(log,open('/home/claude/w/CGLY/handoff/chunk23_added.json','w'),indent=0)
