import json,os,shutil
os.chdir('/home/claude/work/CGLY')
sp=json.load(open('superpractice/manifest.json'))
comp=sp['computer']
os.makedirs('gkquiz/computer',exist_ok=True)
topics=[]
for e in comp:
    f=e['file'].replace('.html','.json')
    shutil.copy2('superpractice/data/computer/'+f,'gkquiz/computer/'+f)
    name=e['topic'].strip().replace(' : ',': ')
    topics.append({'topic':name,'quizzes':[{'src':'sp','key':'computer','file':e['file'],'q':e['q'],'label':e['label'],'otopic':e['topic'],'n':e['n']}]})
man=json.load(open('gkquiz/manifest.json'))
man['subjects']=[s for s in man['subjects'] if s['subject']!='Computer Knowledge']
man['subjects'].append({'subject':'Computer Knowledge','icon':'💻','topics':topics,'mocks':len(comp),'q':sum(e['q'] for e in comp)})
man['total_mocks']=sum(s['mocks'] for s in man['subjects']);man['total_q']=sum(s['q'] for s in man['subjects'])
json.dump(man,open('gkquiz/manifest.json','w'),ensure_ascii=False,separators=(',',':'))
print(man['total_mocks'],man['total_q'])
# remove from Super Practice
for f in ['superpractice/manifest.json','superpractice/superpractice_manifest.json']:
    j=json.load(open(f)); j.pop('computer',None); json.dump(j,open(f,'w'),ensure_ascii=False,separators=(',',':'))
shutil.rmtree('superpractice/data/computer'); os.remove("superpractice/computer") if os.path.isfile("superpractice/computer") else None
