import sys,json,random,collections
sys.path.insert(0,'/home/claude/full/CGLY/handoff')
from fillkit import *
random.seed(21)
files=[('math_sp','SP_MATH_SETS','spmock',25,'html'),('math_p75','P75_MATH_SETS','p75mock',25,'html'),('math_pyq','MATH_PYQ_SETS','mock',25,'plain')]
D={f:load(f,k) for f,k,*_ in files}
used=set()
for f,S in D.items():
    for qs in S.values():
        for q in qs: used.add(norm(q['en']))
pool=chapter_donors('maths',used)
pool=[d for d in pool if d['key']!='di']  # DI needs tables/images -> skip
random.shuffle(pool)
noimg=[d for d in pool if not IMG.search(d['q']['t']+''.join(d['q']['o'])+d['q']['e'])]
img=[d for d in pool if d not in noimg]
PYQCHAP={'numsys':'numbersystem','lcmhcf':'lcmhcf','pct':'percentage','plmd':'profitloss','disc':'discount','si':'simpleinterest','ci':'compoundinterest','ratio':'ratio','partnership':'partnership','mixture':'mixture','avg':'average','ages':'age','tw':'timework','pipes':'pipes','tsd':'timespeeddistance','races':'race','algebra':'algebra','poly':'polynomials','seqser':'sequenceseries','geo':'geometry','cgeo':'coordinategeometry','men2d':'mensuration2d','men3d':'mensuration3d','trig':'trigonometry','htd':'heightdistance'}
log=collections.Counter(); added={}
def take(lst,n):
    got=lst[:n]; del lst[:n]; return got
for f,key,pre,T,mode in files:
    S=D[f]
    for sk,qs in S.items():
        if not sk.startswith(pre) or len(qs)>=T: continue
        need=T-len(qs)
        src=noimg if mode=='plain' else (img+noimg)
        if mode!='plain': src=img if len(img)>=need else noimg
        got=take(src,need)
        if len(got)<need: print('SHORT donors',f,sk); 
        for d in got:
            q=d['q']; 
            if mode=='plain':
                nq=dict(qn=len(qs)+1,exam='',en=plain(q['t']),hi=plain(q.get('h') or q['t']),options=[plain(x) for x in q['o']],answer=q['a'],sol=plain(q['e']),chap=PYQCHAP.get(d['key'],d['key']))
            else:
                nq=dict(qn=len(qs)+1,exam='',en=q['t'].replace('\n','<br>'),hi=(q.get('h') or q['t']).replace('\n','<br>'),options=list(q['o']),answer=q['a'],sol=q['e'].replace('\n','<br>'),chap=d['label'])
            qs.append(nq); log[(f,sk)]+=1
        added[(f,sk)]=len(got)
    kw=dict(ensure_ascii=False,separators=(',',':')) if mode=='plain' else dict(ensure_ascii=False)
    save(f,key,S,**kw); update_index(key,S)
    print(f,'sets short left',sum(1 for k,v in S.items() if k.startswith(pre) and len(v)<T),'added',sum(v for (ff,_),v in log.items() if ff==f) if False else sum(log[(f,s)] for s in S if (f,s) in log))
json.dump({f'{a}:{b}':n for (a,b),n in log.items()},open('/home/claude/full/CGLY/handoff/chunk21_added.json','w'),indent=0)
print('donors left',len(img),len(noimg))
