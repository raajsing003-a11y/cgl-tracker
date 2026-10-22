import sys,json,random,re; sys.path.insert(0,'/home/claude/w'); sys.path.insert(0,'/home/claude/w/CGLY/handoff')
from c22_common import *
random.seed(25)
C=load('calcquiz','CALCQUIZ_SETS')
R=lambda a,b: random.randint(a,b)
GEN={'set18':lambda:(f"36 * {R(100,5300)} - 22 * {R(100,5300)}"),
 'set30':lambda:(f"{R(11,19)} * {R(11,24)} + {R(11,19)} * {R(11,24)} + {R(11,19)}* {R(11,24)}"),
 'set43':lambda:(lambda a,b,c,d:f"({a} + {b}) - ({c} + {d})")(R(30,79),R(30,79),R(30,79),R(30,79))}
for s in ['set45','set47','set48','set49']: GEN[s]=lambda:(lambda a,b,c,d:f"({a} + {b}) - ({c} + {d})")(R(1000,9999),R(1000,9999),R(1000,9999),R(1000,9999))
def opts(v):
    step=random.choice([10,20,100]); c={v}
    while len(c)<4: c.add(v+random.choice([-3,-2,-1,1,2,3,4])*step)
    o=list(c); random.shuffle(o); return o
seen={s:{q['en'] for q in C[s]} for s in GEN}; n=0
for s,g in GEN.items():
    qs=C[s]
    while len(qs)<20:
        e=g()
        if e in seen[s]: continue
        seen[s].add(e); v=eval(e.replace('*','*'))
        o=opts(v)
        qs.append({'qn':len(qs)+1,'exam':qs[0]['exam'],'en':e,'hi':e,'options':[str(x) for x in o],'answer':o.index(v),'sol1':f"{e} = {v}"}); n+=1
save('calcquiz','CALCQUIZ_SETS',C,ensure_ascii=False); update_index('CALCQUIZ_SETS',C)
print('added',n,'short left',sum(1 for v in C.values() if len(v)<20))
