import sys,re,collections,random; sys.path.insert(0,'/home/claude/w'); sys.path.insert(0,'/home/claude/w/CGLY/handoff')
from chunk24_pool import *
from fillkit import save,update_index
random.seed(24)
for v in pool.values(): random.shuffle(v)
TYPES=['ows','synonyms','antonyms','idioms']
TOP={'english_sp':{'ows':'Vocabulary - One Word Substitutions','synonyms':'Vocabulary - Synonyms','antonyms':'Vocabulary - Antonyms','idioms':'Idioms'},
     'english_p75':{'ows':'Vocabulary - One Word Substitutions','synonyms':'Vocabulary - Synonyms','antonyms':'Vocabulary - Antonyms','idioms':'Idioms'},
     'englishmock':{'ows':'One Word Substitution','synonyms':'Synonyms','antonyms':'Antonyms','idioms':'Idioms & Phrases'}}
def L(s): return [l.strip() for l in plain(s).split('\n') if l.strip()] or ['']
def html(s): return ''.join('<p>%s</p>'%l for l in L(s))
def take(t):
    for tt in ([t]+[x for x in TYPES if x!=t]):
        if pool[tt]: return tt,pool[tt].pop(0)
    return None,None
log=collections.Counter()
def run(f,T,flat=False):
    k=key[f]; S=load(f,k); n=0
    for sk,qs in S.items():
        while len(qs)<T:
            if flat:   # idiom/vocab topic sets: fixed donor type
                tt,q=take(flat)
                if q is None: break
                qs.append({'word':' '.join(L(q['t'])),'options':[plain(x) for x in q['o']],'answer':q['a'],'explanation':L(q['e'])})
            else:
                have=collections.Counter(x['topic'] for x in qs)
                t=min(TYPES,key=lambda x:have[TOP[f][x]]); tt,q=take(t)
                if q is None: break
                qs.append({'qn':len(qs)+1,'topic':TOP[f][tt],'word':html(q['t']),'options':[plain(x) for x in q['o']],'answer':q['a'],'explanation':html(q['e'])})
            n+=1
    save(f,k,S,ensure_ascii=False,separators=(',',':')); update_index(k,S)
    left=sum(1 for v in S.values() if len(v)<T)
    log[f]=n; print(f,'target',T,'added',n,'sets short left',left)
run('idiom',10,flat='idioms')
# vocab: mixed vocab-type donors
import itertools
cyc=itertools.cycle(['ows','synonyms','antonyms'])
run('vocab',10,flat='ows')
run('english_sp',25); run('english_p75',25); run('englishmock',25)
print('pool left',{k:len(v) for k,v in pool.items() if v})
