from norm import *
import re,collections
ROMAN=re.compile(r'^\(?\s*(I{1,3}|IV|V|[1-5]|[A-Ea-e])\s*\)?\.?$')
FIGQ=re.compile(r"(given|following|below|above|shown|these|question|problem|answer|option)\s+(figures?|diagrams?|images?|graphs?|charts?|pie|bar|pattern|combination|net)|figures?\s+(given|shown|below|above)|in the (figure|diagram|graph|chart|image)|(pie|bar|line)[ -]?(chart|graph|diagram)|\b(histogram|venn diagram|mirror image|water image|embedded|hidden in|paper (is )?(folded|cut)|unfolded|dice|cubes?\b.*(shown|positions)|select the (figure|image)|which (one )?of the (following )?figures?|figure series|figure \(?[ivx]+\)?|image series|odd image|pattern (given|shown|below)|counting|how many (triangles|squares|rectangles|straight lines|parallelograms|circles))",re.I)
def issues(r):
    out=[]
    t=r['t'];ts=strip(t) if not isinstance(t,list) else strip(t); hs=strip(r['h'])
    o=r['o'] or []
    hasimg=bool(IMG.search(str(t))) or bool(IMG.search(str(r['h']))) or any(IMG.search(str(x)) for x in o)
    ostr=[strip(x) for x in o]
    if not ts.replace('[IMG]','').strip() and not hasimg: out.append('empty_text')
    if len(o)!=4: out.append(f'optcount{len(o)}')
    if any((x.replace('[IMG]','').strip()=='' and not IMG.search(str(o[i]))) for i,x in enumerate(ostr)): out.append('blank_option')
    if len(set(x.lower() for x in ostr))<len(ostr) and not any(IMG.search(str(x)) for x in o): out.append('dup_option')
    a=r['a']
    if not isinstance(a,int) or a<0 or a>=len(o): out.append('bad_answer')
    figopt=len(o)>=4 and all(ROMAN.match(x) for x in ostr[:4])
    if not hasimg:
        if figopt and re.search(r'figure|image|diagram|pattern|shown|given|mirror|cube|dice|paper|fold|group|alike|similar|odd|venn|series|\?|which',ts,re.I) and not re.search(r'statement|conclusion|follow|assum|argument|course of action',ts,re.I): out.append('fig_opts_noimg')
        elif FIGQ.search(ts) and '<table' not in str(t).lower() and not re.search(r'\|',ts):
            out.append('fig_text_noimg')
    return out,hasimg
