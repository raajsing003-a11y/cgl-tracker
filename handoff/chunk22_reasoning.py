import sys,json,random,collections,glob,re
sys.path.insert(0,'/home/claude/w'); sys.path.insert(0,'/home/claude/w/CGLY/handoff')
from c22_common import *
random.seed(22)
TOPIC={'analogy':'Analogy 1','blood':'Blood Relations','calendar':'Clocks and Calendars','clock':'Clocks and Calendars','coding':'Coding Decoding','argument':'Critical Reasoning','assumption':'Critical Reasoning','causeeffect':'Critical Reasoning','statement':'Critical Reasoning','datasuff':'Data Sufficiency','direction':'Direction Sense','misc':'General Mixed','inputoutput':'General Mixed','ineq':'Inequality','dictionary':'Logical Order/Dictionary','mathops':'Mathematical Signs & Symbols','numpuzzle':'Matrix Number Series','odd':'Odd One Out 1','seating':'Puzzles and Arrangements 1','ranking':'Ranking and Positioning','series':'Series 1','situation':'General Mixed','syllogism':'Syllogism','venn':'Venn Diagram','wordformation':'Words Based','action':'Critical Reasoning'}
def html_blocks(s):
    return ''.join('<p>%s</p>'%l for l in str(s).split('\n') if l.strip())
files=[('reasoning_sp','SP_REASONING_SETS'),('reasoning_p75','P75_REASONING_SETS'),('reasoninghardmix','REASONINGHARDMIX_SETS')]
used=used_texts(files)
pool=[d for d in chapter_donors_all(used)] if False else None
