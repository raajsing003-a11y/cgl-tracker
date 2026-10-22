"""Chunk fill helpers: top-up short sets from unused donor questions. BASE = extracted CGLY/data"""
import json,re,html,glob,sys,random
BASE='/home/claude/full/CGLY/data'
TAG=re.compile(r'<[^>]+>'); IMG=re.compile(r'<img\b',re.I)
def norm(s):
    s=TAG.sub(' ',str(s)); s=html.unescape(s); return re.sub(r'[^a-z0-9]','',s.lower())[:160]
def plain(s):
    s=re.sub(r'<sup>(.*?)</sup>',r'^\1',str(s),flags=re.I); s=re.sub(r'<sub>(.*?)</sub>',r'_\1',s,flags=re.I)
    s=re.sub(r'<br\s*/?>','\n',s,flags=re.I); s=TAG.sub('',s); return html.unescape(s).strip()
def load(fn,key): return json.load(open(f'{BASE}/topics/{fn}.json',encoding='utf-8'))[key]
def save(fn,key,S,**kw):
    open(f'{BASE}/topics/{fn}.json','w',encoding='utf-8').write(json.dumps({key:S},**kw))
def update_index(key,S):
    p=f'{BASE}/index.json'; raw=open(p,encoding='utf-8').read(); idx=json.loads(raw)
    idx['topics'][key]['sets']={k:len(v) for k,v in S.items()}
    open(p,'w',encoding='utf-8').write(json.dumps(idx,ensure_ascii=False,separators=(',',':')))
def chapter_donors(sub,used,labels=None,defect_fn=None):
    """unused questions from data/<sub>/*.json (dedupe by text). returns list of dict(q,key,label)"""
    lab={c['key']:c['label'] for c in json.load(open(f'{BASE}/{sub}/index.json'))['chapters']}
    out=[];seen=set(used)
    for f in sorted(glob.glob(f'{BASE}/{sub}/*.json')):
        if f.endswith('index.json'): continue
        key=f.split('/')[-1][:-5]
        for q in json.load(open(f,encoding='utf-8')):
            n=norm(q['t'])
            if n in seen or len(q['o'])!=4: continue
            if defect_fn and defect_fn(q): continue
            seen.add(n); out.append(dict(q=q,key=key,label=lab.get(key,key)))
    return out
