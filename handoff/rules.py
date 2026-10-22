import sys; sys.path.insert(0,'/home/claude/w/tools')
from detect import *
import re
FIGSTRONG=re.compile(r"(mirror image(?! of the clock)|water image|paper (is )?(folded|cut)|(folded|cut|punched).{0,40}unfolded|(folded|sheet|paper).{0,40}punched|figure series|image series|odd image|which (one )?of the (following )?figures|select the (figure|image|diagram)|(given|following|above|below|shown|these|question|answer|problem) (figure|figures|diagram|image|graph|chart|pie chart|bar graph)\\b|\\b(figure|figures|diagram|graph|pie chart|bar graph) (given|shown|below|above)|(column|bar|line|pie|radar|stacked) (chart|graph)|pie[ -]?chart|histogram|venn diagram|figure \(?[ivx1-4]+\)? |positions? of (the )?(same )?(a )?(non-standard )?(dice|cube)|(dice|cubes?) (is|are) (shown|given)|folding the given sheet|sheet (is )?folded|count the number of (triangles|squares)|how many (triangles|squares|rectangles|straight lines|parallelograms) (are|is) (there|in))",re.I)
ROMANONLY=re.compile(r'^\(?\s*(I{1,3}|IV|[A-D]|[1-4])\s*\)?\.?$')
ROMAN_STRICT=re.compile(r'^\(?\s*(I{1,3}|IV)\s*\)?\.?$')
BROKEN=[re.compile(p,re.I) for p in [
 r'[A-Za-z0-9θ°\)\]]\s*=\s*[,.;]\s*(?!respectively|and\b)', r'\bIf\s*[=]', r'\bIf\s*,\s*(then|what|find)', r'\b(then|and)\s*,?\s*=\s*[?\w]', r'<\s*[^\w\s<]?\s*<', r'\bvalue of\s*(is|\?)',
 r'(\bthen\b|,)\s*(the )?value of\s*[:?]?\s*$', r'\bwhat is the value of\s*\??\s*$', r'\b(Simplify|Evaluate)\s*(where\b|$)', r'\bfind\s+[+\-×÷]', r'^\s*(The )?(value of|What is the value of)\s*[?.:]*\s*$']]
def broken_formula(ts):
    # last pattern (trailing of/is/to/then) is too loose -> exclude; keep first nine
    return [] if re.search(r'\bmeans\b|respectively|denote|stand for|symbol|coded|code',ts,re.I) else [i for i,p in enumerate(BROKEN) if (m:=p.search(ts)) and not (i==5 and len(ts[m.end():].strip())>25)]
MRKEY=re.compile(r'\b(ratio|percent|profit|loss|speed|train|average|interest|triangle|circle|sphere|cylinder|cone|area|volume|perimeter|simplif|equation|value of|number|digit|series|sitting|seated|coded|code|blood|brother|sister|father|mother|son of|daughter|direction|facing|ranking|rank|statement|conclusion|assumption|syllogism|inference|odd|analogy|figure|mirror|dice|cube|venn|calendar|clock|mean|median|sum|product|fraction|age|work|pipe|tank|km|cm|rs\.?|₹|%|\d+\s*[+\-×÷*/]\s*\d+)',re.I)
def subject(r):
    ex=(r.get('exam') or '')
    if re.search(r'quant|reasoning',ex,re.I): return 'MR'
    if re.search(r'GK|English|Computer|Miscellaneous',ex,re.I): return 'OTHER'
    if ex in ('CGL Pre Mock','CPO Pre Mock','Mains Full Mock'): return 'MIXED'
    return 'MR'  # mock01.. topic-labelled (Series, Blood Relations ...)
def mr_like(r):
    ts=strip(r['t']); o=[strip(x) for x in r['o']]
    if any(re.fullmatch(r'[-+]?[\d.,/ ]+\s*%?',x) for x in o if x): return True
    return bool(MRKEY.search(ts)) and not re.search(r'\b(which (state|country|city|river|article|amendment|author|book)|who (was|is|wrote)|capital|synonym|antonym|idiom|spelling|passage|grammatical|sentence|noun|verb|adjective)',ts,re.I)
def defects(r):
    ts=strip(r['t']); o=r['o'] or []; ostr=[strip(x) for x in o]
    t_raw=str(r['t'])+' '+str(r['h'])
    hasimg=bool(IMG.search(t_raw)) or any(IMG.search(str(x)) for x in o)
    d=[]
    if not ts and not hasimg: d.append('empty_text')
    if len(o)!=4: d.append('optcount')
    if any(x=='' for x in ostr) : d.append('blank_option')
    if not any(IMG.search(str(x)) for x in o) and len([x for x in ostr if x])>1 and len(set(x.replace(' ','') for x in ostr if x))<len([x for x in ostr if x]): d.append('dup_option')
    if not isinstance(r['a'],int) or not (0<=r['a']<len(o)): d.append('bad_answer')
    if not hasimg:
        roman=len(o)>=4 and all(ROMAN_STRICT.match(x) for x in ostr[:4])
        lett=len(o)>=4 and all(re.fullmatch(r'\(?[A-D]\)?',x) for x in ostr[:4])
        if roman and not re.search(r'\bI{1,3}\.\s|\bIV\.\s|statement|conclusion|assum|argument|course of action|follow(s|ing)? (statements?|conclusions?)|decision',ts,re.I): d.append('fig_missing_opts')
        elif lett and re.search(r"figure|image|diagram|pattern",ts,re.I) and not re.search(r'statement|conclusion',ts,re.I): d.append('fig_missing_opts')
        elif FIGSTRONG.search(ts) and not re.search(r'\|',ts) and '<table' not in t_raw.lower(): d.append('fig_missing_text')
        if broken_formula(ts): d.append('broken_formula')
    return d
