import json,re,glob,html,os
BASE='/home/claude/w/CGLY/data'
IMG=re.compile(r'<img\b[^>]*>',re.I)
TAG=re.compile(r'<[^>]+>')
def strip(s):
    if s is None: return ''
    if isinstance(s,list): s=' '.join(map(str,s))
    s=IMG.sub(' [IMG] ',str(s)); s=TAG.sub(' ',s); s=html.unescape(s)
    return re.sub(r'\s+',' ',s).strip()
def chapter_records():
    """yield (loc, q, rec) for data/maths + data/reasoning chapter files"""
    for sub in ['maths','reasoning']:
        for f in sorted(glob.glob(f'{BASE}/{sub}/*.json')):
            if f.endswith('index.json'): continue
            try: d=json.load(open(f,encoding='utf-8'))
            except Exception: continue
            if not isinstance(d,list): continue
            for idx,q in enumerate(d):
                yield (sub,os.path.basename(f),idx),q,dict(
                    id=q.get('i'),t=q.get('t',''),h=q.get('h',''),o=q.get('o',[]),a=q.get('a'),e=q.get('e',''),
                    kind=sub)
TOPIC={'math_pyq.json':'MATH_PYQ_SETS','math_sp.json':'SP_MATH_SETS','math_p75.json':'P75_MATH_SETS',
       'reasoning_sp.json':'SP_REASONING_SETS','reasoning_p75.json':'P75_REASONING_SETS','reasoningmock.json':'REASONINGMOCK_SETS'}
def lang(x,k):
    if isinstance(x,dict): return x.get(k)
    return x
def topic_records(files=None):
    for fn,key in TOPIC.items():
        if files and fn not in files: continue
        d=json.load(open(f'{BASE}/topics/{fn}',encoding='utf-8'))[key]
        for sk,qs in d.items():
            for idx,q in enumerate(qs):
                en=q.get('en'); hi=q.get('hi')
                if isinstance(en,dict):  # nested schema
                    t=en.get('prompt'); o=en.get('options') or q.get('options') or []; sol=en.get('solution','')
                    ht=hi.get('prompt') if isinstance(hi,dict) else hi
                else:
                    t=en; o=q.get('options') or []; sol=q.get('sol',''); ht=hi
                yield (fn,sk,idx),q,dict(id=(fn,sk,q.get('qn')),t=t,h=ht,o=o,a=q.get('answer'),e=sol,kind=fn,exam=q.get('exam') or q.get('topic'))
