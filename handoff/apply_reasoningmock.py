import sys,json,re,collections
sys.path.insert(0,'/home/claude/w/tools')
import norm
norm.BASE='/home/claude/full/CGLY/data'
import rules
from rules import *
P='/home/claude/full/CGLY/data/topics/reasoningmock.json'
raw=open(P,encoding='utf-8').read()
d=json.loads(raw)
S=d['REASONINGMOCK_SETS']
removed=[];stat=collections.Counter();bypre=collections.Counter()
for sk in list(S):
    keep=[]
    for q in S[sk]:
        en=q['en']; hi=q.get('hi')
        r=dict(t=en.get('prompt'),h=hi.get('prompt') if isinstance(hi,dict) else hi,o=en.get('options') or [],a=q.get('answer'),exam=q.get('exam'))
        if subject(r)=='OTHER': keep.append(q); continue
        ds=defects(r)
        if ds and subject(r)=='MIXED' and not any(x.startswith('fig') for x in ds) and not mr_like(r): ds=[]
        if ds:
            removed.append(dict(set=sk,qn=q['qn'],exam=q.get('exam'),rules=ds,text=strip(r['t'])[:160]))
            for x in ds: stat[x]+=1
            bypre[re.sub(r'\d+$','',sk)]+=1
        else: keep.append(q)
    for i,q in enumerate(keep): q['qn']=i+1
    if keep: S[sk]=keep
    else: del S[sk]
print('removed',len(removed),dict(stat)); print(dict(bypre))
if '--write' in sys.argv:
    open(P,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,separators=(',',':')))
    json.dump(removed,open('/home/claude/full/CGLY/handoff/removed_reasoningmock.json','w'),ensure_ascii=False,indent=0)
    # index update
    IP='/home/claude/full/CGLY/data/index.json'
    ir=open(IP,encoding='utf-8').read(); idx=json.loads(ir)
    idx['topics']['REASONINGMOCK_SETS']['sets']={k:len(v) for k,v in S.items()}
    open(IP,'w',encoding='utf-8').write(json.dumps(idx,ensure_ascii=False,separators=(',',':')) if ir.startswith('{"') else json.dumps(idx,ensure_ascii=False,indent=2))
    print('written',sum(len(v) for v in S.values()),len(S))
