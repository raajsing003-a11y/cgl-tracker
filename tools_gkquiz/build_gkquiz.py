#!/usr/bin/env python3
# Merge Super Practice GK + 75 Day Practice GK quizzes into one topic-wise GK Quiz bank.
# Output: CGLY/gkquiz/{sp,p75}/*.json (unchanged data) + CGLY/gkquiz/manifest.json
import json, os, shutil, sys, collections

ROOT = '/home/claude/work/CGLY'
os.chdir(ROOT)

sp = json.load(open('superpractice/manifest.json'))['gk']
p75 = json.load(open('practice75/manifest.json'))['gk']

# ---------------------------------------------------------------- taxonomy
# subject -> ordered { merged topic -> [original topic names (SP subtopic / P75 topic)] }
T = collections.OrderedDict()

T['Ancient History'] = collections.OrderedDict([
  ('Indus Valley & Vedic Period', ['Indus Valley Civilisation', 'Rig Veda and Later Vedic Period', 'Prehistoric Period IVC Vedic P']),
  ('Jainism, Buddhism, Mahajanapadas & Magadha', ['Jainism, Buddhism and Mahajanapadas', 'Magadha Empire', 'Mahajanapadas Magadha Jainism']),
  ('Mauryan, Post-Mauryan & Gupta Period', ['Mauryan Empire', 'Post-Mauryan Period', 'Gupta Empire and Post-Gupta Period', 'Mauryan Empire Gupta Period']),
  ('Sangam Age & South Indian Kingdoms', ['Sangam Age', 'South Indian Kingdoms - I(Pallavas and Chlolas)', 'South Indian Kingdoms - II(Chalukyas and Rashtrakutas)', 'Dynasties of South India Rajpu']),
  ('Ancient Literature, Books & Architecture', ['Books and authors in Ancient times', 'Ancient Literature', 'Ancient Architecture']),
  ('Ancient History Mixed / Miscellaneous', ['Ancient His Miscellaneous', 'Ancient History']),
])

T['Medieval History'] = collections.OrderedDict([
  ('Early Medieval, Arab Invasion & Delhi Sultanate', ['Early Medieval History (Rajputs, Arab invasion)', 'Delhi Sultanate', 'Arab invasion & Delhi Sultan']),
  ('Regional Kingdoms (Vijayanagar & Bahmani)', ['Regional Kingdoms (Vijayanagar and Bahmani)']),
  ('Mughal Empire & Architecture', ['Mughal Period and its Architecture', 'Mughal Empire 1', 'Mughal Empire 2', 'Mughal Empire 3']),
  ('Bhakti, Sufi & Sikh Movements', ['Bhakti and Sufi Movement', 'Sufism & Bhakti Movement Vi', 'Sikhism & Miscellaneous Medi']),
  ('Maratha Empire', ['Maratha History', 'Maratha Empire & Advent of E']),
  ('Medieval History Mixed / Miscellaneous', ['Medieval History Ediquity Base']),
])

T['Modern History'] = collections.OrderedDict([
  ('Coming of Europeans & British Rule', ['Coming of British Rule and Europeans', 'British Rule', 'Independent Kingdoms & Brtis']),
  ('Governor-Generals & Viceroys', ['Governor-General & Viceroy']),
  ('Revolt of 1857', ['Revolt of 1857', 'Revolt of 1857 & Development']),
  ('Social & Religious Reform Movements', ['Social and cultural reform movements', 'Social & Religious Reforms']),
  ('Indian National Congress', ['Indian National Congress']),
  ('Extremist & Revolutionary Movements', ['Extremist Movements', 'Revolutionary Movements 1', 'Revolutionary Movements 2', 'Revolutionary Movements 3']),
  ('National Movements & Freedom Leaders', ['National Movements', 'Leaders of Freedom Movement']),
  ('Major Battles', ['Major Battles']),
  ('Nicknames, Slogans, Books & Miscellaneous', ['Famous Nicknames Slogans Books', 'Miscellaneous Modern History', 'Modern History']),
])

T['Polity'] = collections.OrderedDict([
  ('Making of the Constitution & Sources', ['History of making of Indian constitution', 'Constitutional Development', 'Sources of Constitution']),
  ('Preamble & Citizenship', ['Preamble & Citizenship']),
  ('Parts, Schedules & Important Articles', ['Schedules and parts', 'Important articles', 'Parts & Schedules']),
  ('Fundamental Rights, Duties & DPSP', ['Fundamental Rights', 'Fundamental Duties & DPSP']),
  ('President, Vice-President, PM & Executive', ['Facts related to President, Vice president, Prime Minister, Chief minister, Parliament houses, cabinet ministers, attorney general etc.', 'President & Vice-President']),
  ('Parliament & State Legislatures', ['Parliament and State Legislatures', 'Parliament A', 'Parliament B']),
  ('Governor, State Government & Judiciary', ['Supreme and High court', 'Governor State & Judiciary']),
  ('Union, Territory & Panchayati Raj', ['Union and its Territory Pancha']),
  ('Emergency, Amendments & Case Laws', ['Emergency in India', 'Case laws in news', 'Constitutional Amendment Acts']),
  ('Committees, Commissions, Bodies & Political Parties', ['Various bodies', 'Committees Commissions & Eme', 'CampAG Political Parties Natio']),
  ('Polity Mixed / Miscellaneous', ['Miscellaneous Polity', 'Polity']),
])

T['Geography'] = collections.OrderedDict([
  ('Universe, Solar System & Earth', ['Universe & Solar System', 'Earth']),
  ('Rocks, Earthquakes, Volcanoes & Landforms', ['Rock Earthquake & Volcano', 'Landform Mountain Grassland De']),
  ('Atmosphere & Climate', ['Atmosphere', 'Indian Climate', 'Atmosphere Climate & Cyclone', 'Climate Soils & Vegetation']),
  ('Soils, Agriculture & Natural Vegetation', ['Soils and agriculture', 'Natural vegetation', 'Agriculture']),
  ('Rivers, Lakes, Dams & Oceans', ['Rivers and Lakes', 'Ocean Rivers & Straits', 'Lakes & Waterfalls', 'River 1', 'River 2', 'Dams & City on bank of River']),
  ('Physical Features, Mountains, Passes & Coastline', ['Physical features of India', 'Mountains Peaks & Plateau', 'Passes & Coastline']),
  ('Minerals, Energy & Industries', ['Mineral and Energy resources', 'Mineral Resources & Industr']),
  ('Population', ['Population']),
  ('Transport, Communication, Ports & Airports', ['Transport and Communication', 'Ports and Airports', 'Tribes & Transport']),
  ('States, Neighbouring Countries & Location', ['India and neighbouring countries', 'Location & Neighbour Countri', 'States & Union Territories o']),
  ('Environment, Ecosystem, National Parks & Wildlife', ['Ecosystem and Environment', 'National parks and Wildlife sanctuaries']),
  ('World Geography, Capitals & Currency', ['World geography facts and superlatives', 'Capital Currency & Miscellan']),
  ('Geography Mixed / Miscellaneous', ['Miscellaneous Indian Geograph', 'Geography']),
])

T['Economy'] = collections.OrderedDict([
  ('National Income, GDP, Poverty & Unemployment', ['GDP and National income', 'National Income Poverty & U']),
  ('Demand & Supply', ['Demand & Supply']),
  ('Money, Banking, Inflation & Capital Market', ['Banking', 'Money & Banking 1', 'Money & Banking 2', 'Inflation & Capital Market']),
  ('Taxation, Budget & Fiscal System', ['Budget related terms', 'Indian fiscal system', 'Tax structure', 'Economics Sector & Taxation']),
  ('Five Year Plans & Planning', ['Five Year Plan', 'National Plan & Organisatio']),
  ('Economic Reforms, Acts & Regulatory Bodies', ['Economic Reforms', 'Major acts and regulatory bodies']),
  ('Economy Mixed / Miscellaneous', ['Miscellaneous 1 Economics']),
])

T['Physics'] = collections.OrderedDict([
  ('Units, Measurements & Scientific Instruments', ['Measurements and SI Units', 'Scientific instruments', 'Units & Measurements']),
  ('Motion, Force, Work & Energy (Mechanics)', ['Motion', 'Force and Friction', 'Work, Power and Energy', 'Mechanics']),
  ('Gravitation, Heat & Thermodynamics', ['Gravitation', 'Heat and thermodynamics', 'Gravitation & Thermodynamics']),
  ('Sound & Waves', ['Sound', 'Waves', 'Sound & Waves']),
  ('Optics', ['Optics']),
  ('Electricity & Magnetism', ['Electricity', 'Magnetism']),
  ('Radioactivity, Discoveries & Inventions', ['Radioactivity', 'Discoveries and inventions', 'Invention Physics']),
  ('Physics Mixed / Miscellaneous', ['Miscellaneous Physics']),
])

T['Chemistry'] = collections.OrderedDict([
  ('Matter, Atomic Structure & Periodic Table', ["Matter and it's states", 'Atomic structure and periodic table', 'Matters Atomic Structure & N', 'Periodic Table']),
  ('Chemical Bonding, Reactions, Properties & Laws', ['Bonding and properties', 'Chemical changes and reactions', 'Definitions and laws', 'Chemical analysis', 'Chemical Properties']),
  ('Acid, Base & Salt', ['Acid, base and salt', 'Acid Base & Salt']),
  ('Metals, Non-metals, Alloys & Ores', ['Metals and Non-metals', 'Metal & Non-metal 1', 'Metal & Non-metal 2', 'Alloy & Ores']),
  ('Organic Chemistry', ['Basics of organic chemistry', 'Organic Chemistry', 'Organic Compounds & Names']),
  ('Chemistry in Everyday Life', ['Chemistry in everyday life']),
])

T['Biology'] = collections.OrderedDict([
  ('Major Branches & Inventions in Biology', ['Major Branches of Biology', 'Major inventions in Biology']),
  ('Cell, Cell Structure & Biomolecules', ['Cell', 'Cell Structure and Functions', 'Animal Cell', 'Plant Cell and Plant & Anima', 'Biomolecules']),
  ('Animal Kingdom', ['Animal Kingdom']),
  ('Plant Kingdom, Structure & Physiology', ['Plant kingdom', 'Plant physiology', 'Organisation in Plants and Animals', 'Plant Form and Structure & P', 'Plants Nutrients Disease & R']),
  ('Human Physiology & Body Systems', ['Human physiology', 'Life Processes', 'Digestive System Circulatory S', 'Respiratory Excretory Nervous', 'Skeleton & Reproductive Syst']),
  ('Nutrition, Vitamins & Human Diseases', ['Nutrients and diseases', 'Vitamins & Nutrition', 'Human Diseases Part-1', 'Human Diseases Part-2', 'Human Diseases Treatments']),
  ('Biology Mixed / Miscellaneous', ['Miscellaneous Biology', 'Biology']),
])

T['Art and Culture'] = collections.OrderedDict([
  ('Dance Forms & Dancers', ['Dance forms: classical and folk', 'Dance Dancer']),
  ('Music & Musicians', ['Musicians', 'Music Musician Gharana']),
  ('Festivals & Fairs', ['Festivals and fairs', 'Festival']),
  ('Temples, Heritage Sites & Monuments', ['Temples', 'Heritage sites and monuments', 'Temple Monuments']),
  ('Art Forms, Painting, Martial Arts & Dress', ['States and their Art Forms', 'Painting Martial Art Dress']),
  ('Personalities & Awards Won', ['Personalities and awards won']),
])

T['Static GK'] = collections.OrderedDict([
  ('Awards & Honours', ['Awards']),
  ('Books & Authors', ['Books and authors', 'Books Authors']),
  ('Important Days', ['Important days']),
  ('Organizations', ['Organizations']),
  ('Sports', ['Sports']),
  ('Firsts in India & World', ['1st in India World']),
  ('Static GK Mixed', ['Static 1', 'Static 2']),
])

T['Census, Reports and Schemes'] = collections.OrderedDict([
  ('Census', ['2011 Census', 'Census']),
  ('Government Schemes', ['Schemes 1', 'Schemes 2']),
])

T['Current Affairs'] = collections.OrderedDict([
  ('January 2026', ['Jan 2026 Current']),
  ('February 2026', ['Feb 2026 Current']),
  ('March 2026', ['March 2026 Current']),
  ('April 2026', ['April 2026 Current']),
])

ICONS = {
  'Ancient History':'🏛️','Medieval History':'🏰','Modern History':'🇮🇳','Polity':'⚖️','Economy':'💰',
  'Geography':'🗺️','Physics':'⚡','Chemistry':'🧪','Biology':'🧬','Art and Culture':'🎭',
  'Static GK':'📚','Census, Reports and Schemes':'📊','Current Affairs':'📰',
}

P75_SUBJECT_FIX = {
  'Census': 'Census, Reports and Schemes',
  'Festival': 'Art and Culture', 'Dance Dancer': 'Art and Culture', 'Music Musician Gharana': 'Art and Culture',
  'Painting Martial Art Dress': 'Art and Culture', 'Temple Monuments': 'Art and Culture',
}

lookup = {}
for subj, tops in T.items():
    for mt, names in tops.items():
        for n in names:
            k = (subj, n.strip().lower())
            assert k not in lookup, ('dup mapping', k)
            lookup[k] = mt

def sp_split(topic):
    t = topic.strip()
    i = t.index(':')
    return t[:i].strip(), t[i+1:].strip()

# ---------------------------------------------------------------- assign
tree = {s: {mt: [] for mt in tops} for s, tops in T.items()}
unmapped = []
flat_sp, flat_p75 = [], []

for e in sp:
    s, st = sp_split(e['topic'])
    mt = lookup.get((s, st.lower()))
    if not mt:
        unmapped.append(('sp', e['topic'])); continue
    ee = dict(e); ee['sj'] = s; ee['mt'] = mt
    flat_sp.append(ee)
    tree[s][mt].append({'src': 'sp', 'file': e['file'], 'q': e['q'], 'label': e['label'], 'otopic': e['topic'], 'n': e['n']})

for e in p75:
    s = e['category']; st = e['topic'].strip()
    s = P75_SUBJECT_FIX.get(st, s)   # some 75-Day 'Static GK' quizzes really belong to Art & Culture / Census
    mt = lookup.get((s, st.lower()))
    if not mt:
        unmapped.append(('p75', s, e['topic'])); continue
    ee = dict(e); ee['sj'] = s; ee['mt'] = mt
    flat_p75.append(ee)
    tree[s][mt].append({'src': 'p75', 'file': e['file'], 'q': e['q'], 'label': e['label'], 'otopic': e['topic'], 'n': e['n']})

if unmapped:
    print('UNMAPPED:'); [print(' ', u) for u in unmapped]; sys.exit(1)

# ordering inside a merged topic: Past Year Questions -> Tests (SP) -> 75 Day quizzes (in original order)
def sk(it):
    if it['src'] == 'sp':
        return (0 if it['label'] == 'Past Year Questions' else 1, it['otopic'], it['n'])
    return (2, it['otopic'], it['n'])

subjects = []
total_q = 0; total_m = 0
for s in T:
    topics = []
    for mt in T[s]:
        items = sorted(tree[s][mt], key=sk)
        if not items:
            continue
        topics.append({'topic': mt, 'quizzes': items})
        total_m += len(items); total_q += sum(i['q'] for i in items)
    subjects.append({'subject': s, 'icon': ICONS[s], 'topics': topics,
                     'mocks': sum(len(t['quizzes']) for t in topics),
                     'q': sum(i['q'] for t in topics for i in t['quizzes'])})

assert total_m == len(sp) + len(p75), (total_m, len(sp), len(p75))

# ---------------------------------------------------------------- write
out = 'gkquiz'
if os.path.isdir(out): shutil.rmtree(out)
os.makedirs(out + '/sp'); os.makedirs(out + '/p75')
for e in sp:
    shutil.copy2('superpractice/data/gk/' + e['file'].replace('.html', '.json'), out + '/sp/' + e['file'].replace('.html', '.json'))
for e in p75:
    shutil.copy2('practice75/data/gk/' + e['file'].replace('.html', '.json'), out + '/p75/' + e['file'].replace('.html', '.json'))

man = {'version': 1, 'total_mocks': total_m, 'total_q': total_q, 'subjects': subjects, 'sp': flat_sp, 'p75': flat_p75}
json.dump(man, open(out + '/manifest.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('OK mocks', total_m, 'questions', total_q)
for s in subjects:
    print(f"  {s['subject']:30s} topics={len(s['topics']):2d} mocks={s['mocks']:3d} q={s['q']}")
