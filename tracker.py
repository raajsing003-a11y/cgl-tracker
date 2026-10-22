#!/usr/bin/env python3
"""
Sarkari Job Tracker  (single file)
==================================
sarkariresult.com/latestjob/ se jobs collect karta hai aur ek self-contained
dashboard.html banata hai (double-click se khulta hai, koi server nahi chahiye).

Har job ke liye:
  Type · Category · Last date (+ din bache) · Posts · Age · Qualification (+ level)
  Syllabus/Notification/Apply links · built-in Syllabus & Pattern guide
  Naya job / update detection · "Mere liye eligible?" check (dashboard me)

Chalana:
    pip install requests beautifulsoup4
    python tracker.py                    # scrape + dashboard.html banao + browser me kholo
    python tracker.py --loop 180         # har 180 min me auto-refresh (band karne ko Ctrl+C)
    python tracker.py --no-open          # sirf banao (GitHub Actions / scheduler ke liye)
    python tracker.py --watch "ssc,railway,steno"   # apne exams (⭐) badlo
    python tracker.py --fixture tests/latestjob.html --detail-fixture tests/detail.html --no-open   # offline test

Optional Telegram alert: env TELEGRAM_BOT_TOKEN aur TELEGRAM_CHAT_ID set karo.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import webbrowser
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    requests = None
try:
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("pehle install karo:  pip install requests beautifulsoup4")

# ═════════════════════════════════════════════════════════════════ config
LIST_URL = "https://www.sarkariresult.com/latestjob/"
BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"
STATE_PATH = DATA_DIR / "jobs.json"
ALERT_PATH = DATA_DIR / "new_jobs.md"
DEBUG_LIST_PATH = DATA_DIR / "last_listing.html"

IST = timezone(timedelta(hours=5, minutes=30))
NEW_DAYS = 3             # itne din tak job "NEW" / "UPDATED" dikhegi
CLOSING_SOON_DAYS = 7
MAX_DETAIL_PER_RUN = 100 # ek run me max detail pages (site pe load kam)
MAX_DETAIL_TRIES = 3     # ek job ka detail page itni baar se zyada try nahi
DETAIL_DELAY = 1.2
KEEP_DAYS = 150

WATCHLIST = ["ssc", "cgl", "chsl", "cpo", "mts", "stenographer", "steno", "delhi police", "capf"]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/126.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
    "Cache-Control": "no-cache",
}

# ═════════════════════════════════════════════════════════════════ helpers
DATE_RE = re.compile(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})")


def today() -> date:
    return datetime.now(IST).date()


def now_dt() -> datetime:
    return datetime.now(IST)


def now_iso() -> str:
    return now_dt().isoformat(timespec="seconds")


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def has_word(text: str, kw: str) -> bool:
    """Word-boundary match: 'ssc' UPSSSC / UKSSSC me match nahi hoga."""
    return re.search(r"(?<![a-z0-9])" + re.escape(kw.strip().lower()) + r"(?![a-z0-9])", text) is not None


def any_word(text: str, kws) -> bool:
    t = text.lower()
    return any(has_word(t, k) for k in kws)


def make_id(url: str) -> str:
    return hashlib.md5(url.strip().lower().rstrip("/").encode()).hexdigest()[:12]


def log(*a):
    print(*a, flush=True)


# ═════════════════════════════════════════════════════════════════ classification
TYPE_RULES = [
    ("Admit Card",      ["admit card", "hall ticket", "city intimation", "exam city"]),
    ("Result",          ["result", "merit list", "final selection", "scorecard", "score card", "cut off", "cutoff"]),
    ("Answer Key",      ["answer key", "response sheet"]),
    ("Cancelled",       ["cancelled", "canceled"]),
    ("Correction Form", ["correction", "edit form", "edit /", "modify form", "update qualification"]),
    ("Document Upload", ["document upload", "document verification", "fee payment", "fee refund"]),
    ("Counselling",     ["counselling", "counseling", "choice filling"]),
    ("Option Form",     ["option form", "option cum", "preference", "choose exam"]),
    ("Vacancy Update",  ["vacancy increase", "revised vacancy", "tentative vacancy", "final vacancy",
                         "vacancy details", "upcoming"]),
    ("New Vacancy",     ["online form", "recruitment", "offline form", "apply", "bharti", "vacancy"]),
]

CATEGORY_RULES = [
    ("SSC",            ["ssc", "staff selection"]),
    ("Banking",        ["bank", "ibps", "sbi", "rbi", "nabard", "sidbi", "idbi", "lic hfl", "exim", "niacl",
                        "nicl", "uiic", "insurance", "pfrda", "ippb", "gic"]),
    ("Railway",        ["railway", "rrb", "rrc", "rcf", "icf", "integral coach", "rail wheel", "rwf"]),
    ("Defence/Police", ["army", "navy", "air force", "airforce", "agniveer", "agniveervayu", "afcat",
                        "coast guard", "itbp", "crpf", "cisf", "bsf", "ssb", "assam rifles", "police",
                        "constable", "capf", "territorial", "forest guard", "home guard", "jail", "fireman"]),
    ("Teaching/TET",   ["teacher", "teachers", "tet", "tgt", "pgt", "prt", "lecturer", "professor", "educator",
                        "school", "vidyalaya", "net", "set", "b.ed", "uptet", "ctet", "htet", "jhtet", "utet",
                        "reet", "stet", "mptet", "mspstet", "kgbv", "kasturba"]),
    ("UPSC",           ["upsc", "ias", "ifs", "nda", "cds"]),
    ("State PSC/SSB",  ["uppsc", "upsssc", "upessc", "bpsc", "bssc", "btsc", "bpssc", "csbc", "mppsc", "mpesb",
                        "rpsc", "rssb", "rsmssb", "hssc", "hpsc", "hppsc", "ukpsc", "uksssc", "jpsc", "jssc",
                        "cgpsc", "dsssb", "dhc", "up", "bihar", "rajasthan", "haryana", "uttar", "mp",
                        "jharkhand", "delhi", "uttarakhand", "himachal", "chhattisgarh", "punjab", "assam"]),
    ("Court",          ["high court", "supreme court", "court"]),
    ("PSU/Research",   ["ntpc", "bhel", "iocl", "ongc", "isro", "drdo", "csir", "aai", "coal", "sail", "nalco",
                        "ncl", "secl", "wcl", "pgcil", "npcil", "nfl", "mecl", "cwc", "aiims", "iit", "nic",
                        "hindustan copper", "concor", "mdl", "rcfl", "dfccil", "sjvn", "nmdc", "iffco", "bsnl",
                        "hartron", "icsil"]),
    ("Entrance/Exam",  ["entrance", "gate", "ugc", "neet", "jee", "cuet", "nta"]),
]


def classify_type(title: str) -> str:
    t = " " + title.lower() + " "
    for name, kws in TYPE_RULES:
        if any(k in t for k in kws):
            return name
    return "Other"


_DEFENCE_WORDS = ["navy", "army", "air force", "airforce", "afcat", "ncc", "tgc", "jag", "agniveer", "coast guard",
                  "territorial", "assam rifles"]


def is_staff_selection(title: str) -> bool:
    """'SSC' = Staff Selection Commission, 'Indian Navy SSC Officers' (Short Service Commission) nahi."""
    t = title.lower()
    return has_word(t, "ssc") and not any_word(t, _DEFENCE_WORDS)


def classify_category(title: str) -> str:
    t = title.lower()
    if has_word(t, "ssc") and not is_staff_selection(title):
        return "Defence/Police"
    for name, kws in CATEGORY_RULES:
        if any_word(t, kws):
            return name
    return "Other"


# ── qualification level: 1=10th, 2=12th/Diploma/ITI, 3=Graduate, 4=PG/Professional, 0=unknown
_LEVEL_PATTERNS = [
    (4, r"post[- ]?graduat|\bpg\b|master'?s?\b|\bm\.?sc\b|\bm\.?tech\b|\bmba\b|\bmca\b|\bmbbs\b|\bmd\b|\bph\.?d\b|\bllm\b"),
    (3, r"graduat|degree|bachelor|\bb\.?tech\b|\bb\.?e\b|\bb\.?sc\b|\bb\.?com\b|\bb\.?a\b|\bbca\b|\bbba\b|\bllb\b|\bb\.?ed\b|\bca\b"),
    (2, r"10\s*\+\s*2|\b12th\b|\bintermediate\b|\binter\b|senior secondary|higher secondary|\bdiploma\b|\biti\b|polytechnic|plus two"),
    (1, r"\b10th\b|\bmatric\b|high school|\b8th\b|\b9th\b|\bx pass\b|secondary school"),
]


def edu_level(text: str) -> int:
    t = (text or "").lower()
    found = [lvl for lvl, pat in _LEVEL_PATTERNS if re.search(pat, t)]
    if not found:
        return 0
    return min(found) if re.search(r"\bor\b|/|\band above\b|\bequivalent\b", t) else max(found)


# ── Syllabus & exam-pattern knowledge base (general guide; verify with notification) ──────────
KB = [
    {"name": "SSC CGL", "all": ["ssc"], "any": ["cgl", "combined graduate level"], "edu": 3,
     "pattern": ["Tier I (CBT): 100 sawal, 200 marks, 60 min, negative marking 0.50",
                 "Tier II (CBT): Maths, Reasoning, English, General Awareness, Computer (post ke hisaab se Statistics / Finance & Economics)",
                 "Post ke hisaab se Skill/Typing test ya Document Verification"],
     "subjects": ["Quantitative Aptitude (25 Q)", "General Intelligence & Reasoning (25 Q)",
                  "English Comprehension (25 Q)", "General Awareness (25 Q)"],
     "tip": "Tier I me Quant + Reasoning se cutoff banta hai; pichle saal ke shift papers timed solve karo."},
    {"name": "SSC CHSL", "all": ["ssc"], "any": ["chsl", "10+2", "higher secondary"], "edu": 2,
     "pattern": ["Tier I (CBT): 100 sawal, 200 marks, 60 min, negative marking 0.50",
                 "Tier II: Maths, Reasoning, English, General Awareness, Computer + Skill/Typing test (post ke hisaab se)"],
     "subjects": ["General Intelligence (25 Q)", "English Language (25 Q)", "Quantitative Aptitude (25 Q)",
                  "General Awareness (25 Q)"],
     "tip": "English + Quant me speed banao; typing/skill test ke liye alag practice rakho."},
    {"name": "SSC CPO (SI in Delhi Police / CAPF)", "all": ["ssc"], "any": ["cpo", "si capf", "sub inspector"], "edu": 3,
     "pattern": ["Paper I (CBT): 200 sawal, 200 marks, 2 ghante, negative marking 0.25",
                 "PET/PST (physical) -> Paper II (English Language & Comprehension, 200 marks) -> Medical"],
     "subjects": ["General Intelligence & Reasoning (50 Q)", "General Knowledge & Awareness (50 Q)",
                  "Quantitative Aptitude (50 Q)", "English Comprehension (50 Q)"],
     "tip": "Physical standards pehle se check karo aur Paper I ke saath running/PET ki taiyari saath rakho."},
    {"name": "SSC Stenographer (Gr C & D)", "all": ["ssc"], "any": ["stenographer", "steno"], "edu": 2,
     "pattern": ["Written (CBT): 200 sawal, 200 marks, 2 ghante, negative marking 0.25",
                 "Phir Skill Test (Steno dictation + transcription)"],
     "subjects": ["General Intelligence & Reasoning (50 Q)", "General Awareness (50 Q)",
                  "English Language & Comprehension (100 Q)"],
     "tip": "English 100 Q hai - vocabulary/grammar pe sabse zyada time do; shorthand speed alag se."},
    {"name": "SSC MTS", "all": ["ssc"], "any": ["mts", "multi tasking", "multitasking"], "edu": 1,
     "pattern": ["CBT: Numerical & Mathematical Ability, Reasoning, General English, General Awareness",
                 "Kuch posts ke liye PET/PST / Document Verification (notification dekho)"],
     "subjects": ["Numerical & Mathematical Ability", "Reasoning Ability & Problem Solving",
                  "General English", "General Awareness"],
     "tip": "Basic maths aur reasoning strong karo - 10th level hai, accuracy se cutoff paar hota hai."},
    {"name": "SSC GD Constable", "all": ["ssc"], "any": ["gd", "gd constable"], "edu": 1,
     "pattern": ["CBT: 80 sawal, 160 marks, 60 min, negative marking 0.25",
                 "Phir PET/PST aur Medical"],
     "subjects": ["General Intelligence & Reasoning (20 Q)", "General Knowledge & Awareness (20 Q)",
                  "Elementary Mathematics (20 Q)", "English / Hindi (20 Q)"],
     "tip": "Physical test (race/height/chest) ki taiyari written ke saath hi shuru karo."},
    {"name": "SSC JE", "all": ["ssc"], "any": ["junior engineer", "je"], "edu": 2,
     "pattern": ["Paper I (CBT): General Intelligence & Reasoning, General Awareness, Part-B Technical (Civil / Mechanical / Electrical)",
                 "Paper II: Technical (conventional/descriptive), phir Document Verification"],
     "subjects": ["Reasoning", "General Awareness", "Engineering Subject (apni branch)"],
     "tip": "Technical section ke marks sabse zyada weightage dete hain - branch ke basics pehle pakke karo."},
    {"name": "SSC Junior Hindi Translator", "all": ["ssc"], "any": ["jht", "hindi translator"], "edu": 4,
     "pattern": ["Paper I (CBT): English + Hindi language/General Awareness", "Paper II: Translation + Essay (descriptive)"],
     "subjects": ["English Language", "Hindi Language", "Translation (Hindi <-> English)", "Essay"],
     "tip": "Descriptive paper ki writing practice zaroori hai."},

    {"name": "RRB NTPC", "all": [], "any": ["ntpc"], "all_cat": ["Railway"], "edu": 0,
     "pattern": ["CBT 1: 100 sawal, 90 min, negative marking 1/3", "CBT 2 (post ke hisaab se) + Typing / Aptitude test + Document Verification"],
     "subjects": ["Mathematics (30 Q)", "General Intelligence & Reasoning (30 Q)", "General Awareness (40 Q)"],
     "tip": "General Awareness (40 Q) me current affairs + static GK se easy marks nikalte hain."},
    {"name": "RRB Group D (Level 1)", "all": [], "any": ["group d"], "all_cat": ["Railway"], "edu": 1,
     "pattern": ["CBT: 100 sawal, 90 min, negative marking 1/3", "Phir PET (physical) aur Document Verification"],
     "subjects": ["Mathematics (25 Q)", "General Intelligence & Reasoning (30 Q)", "General Science (25 Q)",
                  "General Awareness & Current Affairs (20 Q)"],
     "tip": "General Science (class 10 NCERT level) pe grip rakho; PET alag se practice karo."},
    {"name": "RRB ALP / Technician", "all": [], "any": ["alp", "assistant loco pilot", "technician"], "all_cat": ["Railway"], "edu": 2,
     "pattern": ["CBT 1 (ALP): 75 sawal, 60 min, negative marking 1/3", "CBT 2 + CBAT (ALP) / Document Verification"],
     "subjects": ["Mathematics", "General Intelligence & Reasoning", "Basic Science & Engineering", "General Awareness"],
     "tip": "Trade/ITI subject ka syllabus notification me alag se diya hota hai."},

    {"name": "Bank PO (IBPS / SBI)", "all": [], "any": ["po", "probationary officer"], "all_cat": ["Banking"], "edu": 3,
     "pattern": ["Prelims: 100 sawal, 60 min - English 30, Quant 35, Reasoning 35 (sectional time)",
                 "Mains: Reasoning & Computer, Data Analysis & Interpretation, General/Economy/Banking Awareness, English (+ descriptive) -> Interview"],
     "subjects": ["English Language", "Quantitative Aptitude", "Reasoning Ability", "General/Financial Awareness", "Computer Aptitude"],
     "tip": "Prelims me sectional cutoff hota hai - kisi ek section ko mat chhodo."},
    {"name": "Bank Clerk (IBPS / SBI)", "all": [], "any": ["clerk", "junior associate", "junior associates"], "all_cat": ["Banking"], "edu": 3,
     "pattern": ["Prelims: 100 sawal, 60 min - English 30, Numerical Ability 35, Reasoning 35",
                 "Mains: Reasoning & Computer, Quant, General/Financial Awareness, English"],
     "subjects": ["English Language", "Numerical Ability", "Reasoning Ability", "General/Financial Awareness"],
     "tip": "Speed + accuracy ka game hai; daily sectional mocks lagao."},
    {"name": "IBPS RRB (Office Assistant / Officer Scale I)", "all": [], "any": ["rrb", "gramin bank"], "all_cat": ["Banking"], "edu": 3,
     "pattern": ["Prelims: Reasoning 40 + Quantitative Aptitude 40 (80 Q, 45 min)", "Mains + (Officers ke liye) Interview"],
     "subjects": ["Reasoning", "Quantitative Aptitude", "English/Hindi", "General Awareness", "Computer Knowledge"],
     "tip": "Prelims chhota hai - Quant/Reasoning ki speed hi sab kuch hai."},

    {"name": "UPSC Civil Services (IAS/IFS) Prelims", "all": [], "any": ["ias", "ifs", "civil services"], "all_cat": ["UPSC"], "edu": 3,
     "pattern": ["Prelims: GS Paper I (100 Q, 200 marks) + CSAT Paper II (80 Q, 200 marks, qualifying 33%)",
                 "Negative marking 1/3 -> Mains (9 papers) -> Interview"],
     "subjects": ["History, Polity, Geography, Economy", "Environment, Science & Tech, Current Affairs", "CSAT: Comprehension, Reasoning, Basic Numeracy"],
     "tip": "Prelims = elimination game; PYQs + revision + mocks."},
    {"name": "NDA / NA", "all": [], "any": ["nda"], "edu": 2,
     "pattern": ["Maths: 120 Q (300 marks)", "General Ability Test: 150 Q (600 marks)", "Phir SSB interview"],
     "subjects": ["Mathematics (class 11-12)", "English", "General Knowledge (Physics, Chemistry, GS, Current Affairs)"],
     "tip": "Maths ka cutoff alag chalta hai; GAT me English + GK scoring hai."},
    {"name": "CDS", "all": [], "any": ["cds"], "edu": 3,
     "pattern": ["IMA/INA/AFA: English, General Knowledge, Elementary Mathematics", "OTA: English + General Knowledge", "Phir SSB"],
     "subjects": ["English", "General Knowledge", "Elementary Mathematics"],
     "tip": "English me accuracy aur GK me current affairs focus karo."},

    {"name": "CTET / TET (Teacher Eligibility)", "all": [], "any": ["ctet", "tet", "uptet", "htet", "utet", "jhtet", "reet", "stet", "mptet"], "edu": 2,
     "pattern": ["CTET: 150 sawal, 150 marks, 2.5 ghante (no negative marking)",
                 "Paper I (class 1-5): CDP 30, Language I 30, Language II 30, Maths 30, EVS 30",
                 "Paper II (class 6-8): CDP 30, Language I 30, Language II 30, Maths-Science ya Social Studies 60"],
     "subjects": ["Child Development & Pedagogy", "Language I & II", "Maths / EVS / Science / Social Studies"],
     "tip": "CDP + Language se easy marks aate hain; state TET me pattern thoda alag ho sakta hai."},

    {"name": "Agniveer (Army)", "all": [], "any": ["agniveer"], "any_cat": ["Defence/Police"], "edu": 1,
     "pattern": ["Online CEE (Common Entrance Exam)", "Physical Fitness + Physical Measurement + Medical + Rally"],
     "subjects": ["General Knowledge", "General Science", "Mathematics", "Logical Reasoning (category ke hisaab se)"],
     "tip": "Trade ke hisaab se qualification alag hoti hai - notification me dekho."},
    {"name": "AFCAT", "all": [], "any": ["afcat"], "edu": 3,
     "pattern": ["Online exam: 100 sawal, 300 marks, 2 ghante (+3 / -1)", "Phir AFSB interview + Medical"],
     "subjects": ["General Awareness", "Verbal Ability in English", "Numerical Ability", "Reasoning & Military Aptitude"],
     "tip": "Negative marking 1 hai - sirf pakke sawal attempt karo."},
    {"name": "Police Constable", "all": [], "any": ["constable"], "all_cat": ["Defence/Police"], "edu": 2,
     "pattern": ["Written exam (state ke hisaab se pattern)", "Physical Standard / Efficiency Test + Document Verification + Medical"],
     "subjects": ["General Knowledge / Current Affairs", "Hindi", "Numerical & Mental Ability", "Reasoning / Mental Aptitude"],
     "tip": "State police ka pattern notification me alag hota hai - ye general guide hai."},
]


def match_kb(title: str, category: str):
    t = title.lower()
    for e in KB:
        if "ssc" in e.get("all", []) and not is_staff_selection(title):
            continue
        if e.get("all") and not all(has_word(t, k) for k in e["all"]):
            continue
        if e.get("any") and not any(has_word(t, k) for k in e["any"]):
            continue
        if e.get("all_cat") and category not in e["all_cat"]:
            continue
        if e.get("any_cat") and category not in e["any_cat"]:
            continue
        return e
    return None


# ═════════════════════════════════════════════════════════════════ date / status
def parse_last_date(title: str):
    m = re.search(r"last\s*date\s*:?\s*(.*)$", title, re.I)
    tail = m.group(1) if m else ""
    d = DATE_RE.search(tail)
    if d:
        dd, mm, yy = map(int, d.groups())
        try:
            return date(yy, mm, dd).isoformat(), d.group(0)
        except ValueError:
            pass
    return None, (norm(tail.split("|")[0]) if tail else "")


def job_status(last_iso, jtype):
    if jtype in ("Admit Card", "Result", "Answer Key", "Cancelled"):
        return "info", None
    if not last_iso:
        return "no_date", None
    left = (date.fromisoformat(last_iso) - today()).days
    if left < 0:
        return "closed", left
    return ("closing_soon" if left <= CLOSING_SOON_DAYS else "open"), left


# ═════════════════════════════════════════════════════════════════ http
class Fetcher:
    def __init__(self, fixture=None, detail_fixture=None):
        self.fixture, self.detail_fixture = fixture, detail_fixture
        self.s = None
        if fixture:
            return
        if requests is None:
            sys.exit("pehle install karo:  pip install requests beautifulsoup4")
        self.s = requests.Session()
        self.s.headers.update(HEADERS)
        try:  # optional: Cloudflare jaisi protection ke liye  (pip install cloudscraper)
            import cloudscraper  # type: ignore
            self.alt = cloudscraper.create_scraper()
        except Exception:
            self.alt = None

    def get(self, url, is_detail=False, tries=3):
        if self.fixture:
            p = self.detail_fixture if is_detail else self.fixture
            return Path(p).read_text(encoding="utf-8") if p else None
        for i in range(tries):
            for client in (self.s, self.alt):
                if client is None:
                    continue
                try:
                    r = client.get(url, timeout=30)
                    if r.status_code == 200 and len(r.text) > 2000:
                        r.encoding = "utf-8"
                        return r.text
                    log(f"  ! {url} -> HTTP {r.status_code} (try {i + 1})")
                except Exception as e:  # noqa
                    log(f"  ! {url} -> {type(e).__name__}: {e} (try {i + 1})")
            time.sleep(2 * (i + 1))
        return None


# ═════════════════════════════════════════════════════════════════ parsing
def parse_listing(html: str):
    soup = BeautifulSoup(html, "html.parser")
    out, seen = [], set()
    for a in soup.select("li a[href]"):
        href = a["href"].strip()
        title = norm(a.get_text(" "))
        if not title or href.startswith("#"):
            continue
        p = urlparse(href)
        host = p.netloc.lower()
        if "sarkariresult" not in host:
            continue
        segs = [s for s in p.path.split("/") if s]
        if len(segs) < 2 and not host.startswith("doc."):
            continue
        li_text = norm(a.parent.get_text(" ")) if a.parent else title
        full = li_text if ("last date" not in title.lower() and "last date" in li_text.lower()) else title
        key = (href, full)
        if key in seen:
            continue
        seen.add(key)
        out.append({"url": href, "title": full})
    return out


LABEL_MAP = [
    ("syllabus_url",     ["syllabus", "exam pattern"]),
    ("notification_url", ["notification", "notice", "advertisement", "advt"]),
    ("apply_url",        ["apply online", "online form", "registration", "apply"]),
    ("official_url",     ["official website"]),
]
_QUAL_RE = re.compile(r"(intermediate|10\s*\+\s*2|12th|10th|graduat|degree|diploma|\biti\b|b\.?tech|post graduate|passed|"
                      r"recognized|matric|b\.?ed|mbbs|b\.?sc|b\.?com|\bca\b|\blaw\b)", re.I)


_JUNK_RE = re.compile(r"(join\s+(our\s+)?(telegram|whatsapp|channel)|follow us|subscribe|download\s+(our\s+)?app|sarkariresult\.com\s*(home)?$|"
                      r"advertis(e|ing)\s+with|disclaimer|how to (fill|apply|download)|watch video|youtube)", re.I)
SITE_ROOT = "https://www.sarkariresult.com"


def _cell_text(cell) -> str:
    for br in cell.find_all("br"):
        br.replace_with("\n")
    for li in cell.find_all("li"):
        li.insert_before("• ")
        li.append("\n")
    lines = [norm(x) for x in cell.get_text(" ").split("\n")]
    return "\n".join(x for x in lines if x)[:700]


def _cell_links(cell) -> list:
    out = []
    for a in cell.find_all("a", href=True):
        h = a["href"].strip()
        if h.startswith("/"):
            h = SITE_ROOT + h
        if not re.match(r"https?://", h, re.I):
            continue
        out.append([norm(a.get_text(" "))[:60] or "Link", h])
    return out


def parse_sections(soup) -> list:
    """Detail page ke saare tables -> [{t: heading, r: [rows]}]. Row = {c:[cells], l:[[text,url]]} ya {p: text}."""
    secs, cur = [], None

    def start(title):
        nonlocal cur
        cur = {"t": title[:90], "r": []}
        secs.append(cur)

    seen_rows = set()
    for table in [t for t in soup.find_all("table") if not t.find("table")]:
        for tr in table.find_all("tr"):
            cells = tr.find_all(["td", "th"])
            if not cells:
                continue
            texts = [_cell_text(c) for c in cells]
            links = [l for c in cells for l in _cell_links(c)]
            nonempty = [t for t in texts if t]
            if not nonempty and not links:
                continue
            joined = " | ".join(nonempty)
            if _JUNK_RE.search(joined) and len(joined) < 140:
                continue
            key = joined + str(links)
            if key in seen_rows:
                continue
            seen_rows.add(key)
            uniq = list(dict.fromkeys(nonempty))
            if len(uniq) == 1 and not links:                      # heading ya paragraph
                t = uniq[0]
                if len(t) <= 80 and "\n" not in t:
                    start(t)
                else:
                    if cur is None:
                        start("Jankari")
                    cur["r"].append({"p": t})
                continue
            if cur is None:
                start("Jankari")
            row = {"c": [t for t in texts if t] if len(nonempty) != len(texts) else texts}
            if links:
                row["l"] = links[:6]
            if len(cur["r"]) < 45:
                cur["r"].append(row)
    secs = [x for x in secs if x["r"]][:16]
    # size cap
    out, total = [], 0
    for x in secs:
        sz = len(json.dumps(x, ensure_ascii=False))
        if total + sz > 14000:
            break
        out.append(x)
        total += sz
    return out


def parse_detail(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text("\n")
    d: dict = {}

    m = re.search(r"Total\s*(?:Post)?s?\s*:?\s*([\d,]{1,7})\s*Post", text, re.I) or \
        re.search(r"for\s+([\d,]{2,7})\s+Post", text, re.I)
    if m:
        d["posts"] = int(m.group(1).replace(",", ""))
    for key, label in (("age_min", "Minimum Age"), ("age_max", "Maximum Age")):
        m = re.search(label + r"\s*:?\s*\**\s*(\d{2})", text, re.I)
        if m:
            d[key] = int(m.group(1))
    m = re.search(r"Application Begin\s*:?\s*\**\s*(\d{1,2}/\d{1,2}/\d{4})", text, re.I)
    if m:
        d["start_date"] = m.group(1)
    m = re.search(r"Last Date (?:for|to) (?:Apply )?(?:Online)?[^:\n]*:\s*\**\s*(\d{1,2}/\d{1,2}/\d{4})", text, re.I)
    if m:
        d["last_date_detail"] = m.group(1)
    m = re.search(r"(?:Tier\s*I\b[^\n:]*|Exam)\s*Date\s*:?\s*\**\s*([^\n*]{4,60})", text, re.I)
    if m:
        d["exam_date"] = norm(m.group(1))
    m = re.search(r"General\s*/\s*OBC[^:\n]*:\s*\**\s*(\d{1,5})", text, re.I)
    if m:
        d["fee"] = int(m.group(1))

    # Short Information (summary)
    for tr in soup.select("tr"):
        tds = tr.find_all("td")
        if len(tds) >= 2 and norm(tds[0].get_text()).lower().startswith("short information"):
            d["summary"] = norm(tds[1].get_text(" "))[:240]
            break

    # Qualification: vacancy table ke row (3+ cells) ka last cell
    for tr in soup.select("tr"):
        cells = tr.find_all("td")
        if len(cells) < 3:
            continue
        ct = norm(cells[-1].get_text(" "))
        if 12 < len(ct) < 500 and _QUAL_RE.search(ct) and "click here" not in ct.lower():
            d["qualification"] = re.sub(r"More Eligibility Details.*$", "", ct, flags=re.I).strip()[:220]
            break

    # Links: har <tr> ka label -> link
    links: dict = {}
    for tr in soup.select("tr"):
        tds = tr.find_all(["td", "th"])
        if len(tds) < 2:
            continue
        label = norm(tds[0].get_text(" ")).lower()
        a = tr.find("a", href=True)
        if not a or not label or len(label) > 120:
            continue
        href = a["href"].strip()
        if href.startswith("#") or label.startswith("join") or "how to" in label or "video" in label:
            continue
        for field, kws in LABEL_MAP:
            if field in links:
                continue
            if any(k in label for k in kws):
                if field == "notification_url" and "syllabus" in label:
                    continue
                links[field] = href
    d.update(links)
    try:
        d["sections"] = parse_sections(soup)
    except Exception:
        d["sections"] = []
    return d


# ═════════════════════════════════════════════════════════════════ store
def load_store() -> dict:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"baseline_done": False, "jobs": {}}


def refresh_derived(j: dict, watch=None):
    iso, txt = parse_last_date(j["title"])
    if not iso and not txt and j.get("last_date_detail"):
        m = DATE_RE.search(j["last_date_detail"])
        if m:
            dd, mm, yy = map(int, m.groups())
            try:
                iso, txt = date(yy, mm, dd).isoformat(), m.group(0)
            except ValueError:
                pass
    j["last_date"], j["last_date_text"] = iso, txt
    j["type"] = classify_type(j["title"])
    j["category"] = classify_category(j["title"])
    wl = watch if watch is not None else WATCHLIST
    if not is_staff_selection(j["title"]):
        wl = [w for w in wl if w != "ssc"]
    j["watch"] = any_word(j["title"], wl)
    j["extended"] = bool(re.search(r"extend|re[- ]?open", j["title"], re.I))
    j["status"], j["days_left"] = job_status(iso, j["type"])

    lvl = edu_level(j.get("qualification", ""))
    kb = match_kb(j["title"], j["category"])
    if not lvl:
        lvl = edu_level(j["title"]) or (kb.get("edu", 0) if kb else 0)
    j["edu_level"] = lvl
    j["kb"] = ({k: kb[k] for k in ("name", "pattern", "subjects", "tip")} if kb else None)

    first = datetime.fromisoformat(j["first_seen"])
    j["is_new"] = (not j.get("baseline")) and (now_dt() - first) <= timedelta(days=NEW_DAYS)
    upd = j.get("updated_at")
    j["is_updated"] = bool(upd) and (now_dt() - datetime.fromisoformat(upd)) <= timedelta(days=NEW_DAYS)


# ═════════════════════════════════════════════════════════════════ output
TEMPLATE = r"""<!doctype html>
<html lang="hi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<style>html.emb body{padding-top:46px}</style>
<script>try{if(self!==top)document.documentElement.classList.add('emb')}catch(e){}</script>
<title>Latest Sarkari Jobs</title>
<style>
:root{
  --bg:#070914; --bg2:#0d1124; --panel:rgba(255,255,255,.045); --card:rgba(255,255,255,.055); --card2:rgba(255,255,255,.07);
  --line:rgba(255,255,255,.10); --text:#f2f3f8; --mute:#a2a9bd; --on-accent:#fff;
  --new:#34d399; --warn:#fbbf24; --bad:#f87171; --info:#8b93a7; --star:#fcd34d; --blue:#60a5fa; --vio:#c4b5fd;
  --ssc:#fb923c; --rail:#60a5fa;
  --grad:linear-gradient(135deg,#f97316,#ec4899 55%,#8b5cf6);
  --glow:0 8px 30px -10px rgba(236,72,153,.45);
  --shadow:0 10px 30px -14px rgba(0,0,0,.7);
}
:root[data-theme="light"]{
  --bg:#f5f6fb; --bg2:#ffffff; --panel:#ffffff; --card:#ffffff; --card2:#f0f2f8;
  --line:#e1e5ef; --text:#171b2a; --mute:#5d667b; --on-accent:#fff;
  --ssc:#c2570c; --rail:#1f6feb; --new:#0f9d6c; --warn:#b7791f; --bad:#d6336c; --info:#6b7385; --star:#b7791f; --blue:#1f6feb; --vio:#6d4fd8;
  --glow:0 8px 24px -12px rgba(236,72,153,.35); --shadow:0 6px 20px -12px rgba(20,30,60,.25);
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{scroll-behavior:smooth}
body{margin:0;color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Devanagari",sans-serif;
  background:radial-gradient(900px 420px at 85% -80px,rgba(236,72,153,.18),transparent 60%),radial-gradient(800px 380px at -10% -40px,rgba(139,92,246,.16),transparent 60%),var(--bg);
  background-attachment:fixed;min-height:100vh}
:root[data-theme="light"] body{background:radial-gradient(900px 380px at 90% -80px,rgba(236,72,153,.10),transparent 60%),var(--bg)}
button,select,input{font:inherit;color:var(--text)}
.wrap{max-width:1100px;margin:0 auto;padding:0 14px 40px}

/* header */
header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 0 6px}
h1{margin:0;font-size:22px;font-weight:900;letter-spacing:.2px}
h1 span{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:var(--mute);font-size:12px;margin-top:1px}
.hbtns{display:flex;gap:8px}
.ib{width:38px;height:38px;border-radius:12px;border:1px solid var(--line);background:var(--panel);cursor:pointer;font-size:16px;display:grid;place-items:center}
.ib:active{transform:scale(.94)}

/* banner */
.banner{display:none;margin:10px 0 0;padding:11px 14px;border-radius:14px;font-size:13.5px;font-weight:600;
  background:linear-gradient(135deg,rgba(52,211,153,.18),rgba(52,211,153,.06));border:1px solid rgba(52,211,153,.5)}

/* hero tiles */
.hero{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}
.tile{position:relative;overflow:hidden;border-radius:18px;padding:13px 12px 11px;cursor:pointer;border:1px solid var(--line);background:var(--card);box-shadow:var(--shadow)}
.tile b{display:block;font-size:28px;line-height:1.05;font-weight:900}
.tile span{font-size:12px;color:var(--mute);font-weight:600}
.tile::after{content:"";position:absolute;right:-18px;top:-18px;width:70px;height:70px;border-radius:50%;opacity:.35;filter:blur(2px)}
.tile.t-live::after{background:#34d399} .tile.t-new::after{background:#ec4899} .tile.t-soon::after{background:#fbbf24}
.tile.t-live b{color:var(--new)} .tile.t-new b{color:#f472b6} .tile.t-soon b{color:var(--warn)}
.tile.on{border-color:transparent;box-shadow:0 0 0 2px #ec4899 inset,var(--glow)}
.tile:active{transform:scale(.97)}

/* search */
.search{display:flex;gap:8px;margin-bottom:10px}
.sbox{flex:1;display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:0 14px;box-shadow:var(--shadow)}
.sbox:focus-within{border-color:#ec4899}
.sbox input{flex:1;min-width:0;border:0;background:transparent;outline:0;height:46px;font-size:15px}
.sbox input::placeholder{color:var(--mute)}
.sort{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:0 10px;font-size:13px;max-width:132px}

/* chips rows */
.chips{display:flex;flex-wrap:wrap;gap:7px;padding:2px 0 8px}
.chip{flex:0 0 auto;border:1px solid var(--line);background:var(--card);padding:7px 12px;border-radius:999px;cursor:pointer;font-size:12.5px;font-weight:600;white-space:nowrap;user-select:none}
.chip small{opacity:.7;margin-left:5px;font-weight:700}
.chip.on{background:var(--grad);color:#fff;border-color:transparent;box-shadow:var(--glow)}
.chips.cats .chip{font-size:12px;padding:6px 12px;font-weight:600;background:transparent}
.chips.cats .chip.on{background:var(--card2);color:var(--text);border-color:#ec4899;box-shadow:none}

/* profile */
details.prof{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:0 14px;margin:2px 0 12px}
details.prof summary{cursor:pointer;padding:12px 0;font-weight:700;font-size:13.5px;list-style:none;display:flex;justify-content:space-between}
details.prof summary::-webkit-details-marker{display:none}
details.prof .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:0 0 14px;font-size:13px;color:var(--mute)}
details.prof select,details.prof input{background:var(--card2);border:1px solid var(--line);padding:9px 11px;border-radius:11px;color:var(--text)}
details.prof input{width:90px}

.count{color:var(--mute);font-size:12.5px;margin:4px 2px 10px;font-weight:600}

/* cards */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr));gap:14px}
.card{position:relative;overflow:hidden;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:15px 15px 13px;display:flex;flex-direction:column;gap:11px;box-shadow:var(--shadow);backdrop-filter:blur(6px)}
.card::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--info)}
.card.st-open::before{background:linear-gradient(90deg,#10b981,#34d399)}
.card.st-closing_soon::before{background:linear-gradient(90deg,#f59e0b,#ef4444)}
.card.st-closed::before{background:var(--bad)}
.card.isnew{box-shadow:0 0 0 1.5px #ec4899 inset,var(--glow)}
.card.done{opacity:.6}
.badges{display:flex;flex-wrap:wrap;gap:6px}
.b{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--card2);color:var(--mute);white-space:nowrap}
.b.new{background:var(--grad);color:#fff}
.b.upd{background:rgba(251,191,36,.18);color:var(--warn)}
.b.star{background:rgba(252,211,77,.16);color:var(--star)}
.b.type{background:rgba(96,165,250,.16);color:var(--blue)}
.b.t-Admit,.b.t-Result,.b.t-Answer{background:rgba(196,181,253,.16);color:var(--vio)}
.b.c-SSC{background:rgba(249,115,22,.18);color:var(--ssc);font-weight:800}
.b.c-Railway{background:rgba(59,130,246,.18);color:var(--rail);font-weight:800}
.title{margin:0;font-size:16px;font-weight:800;line-height:1.35;overflow-wrap:anywhere}
.card.pri-SSC{border-color:rgba(249,115,22,.45)}
.card.pri-Railway{border-color:rgba(59,130,246,.45)}
/* last date strip */
.ds{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--card2)}
.ds small{display:block;font-size:11px;font-weight:700;color:var(--mute)}
.dsL b{font-size:17px;font-weight:900;line-height:1.25}
.dsR{flex:0 0 auto;text-align:center;min-width:64px;padding:5px 10px;border-radius:12px;background:rgba(0,0,0,.14)}
:root[data-theme="light"] .dsR{background:rgba(0,0,0,.05)}
.dsR b{display:block;font-size:22px;line-height:1;font-weight:900}
.dsR small{margin-top:2px;font-size:10.5px}
.ds.open{background:rgba(52,211,153,.10);border-color:rgba(52,211,153,.4)} .ds.open .dsR b{color:var(--new)}
.ds.closing_soon{background:rgba(251,191,36,.13);border-color:rgba(251,191,36,.55)} .ds.closing_soon .dsR b{color:var(--warn)}
.ds.closed{background:rgba(248,113,113,.10);border-color:rgba(248,113,113,.4)} .ds.closed .dsR b{color:var(--bad);font-size:17px}
.ds.info .dsL b,.ds.no_date .dsR b{color:var(--info)}
/* info stats */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px}
.stats>div{padding:8px 10px;border-radius:12px;background:var(--card2);border:1px solid var(--line);min-width:0}
.stats small{display:block;font-size:11px;font-weight:700;color:var(--mute)}
.stats b{display:block;font-size:13.5px;font-weight:700;overflow-wrap:anywhere}
.stats .wide{grid-column:1/-1}
.stats .wide b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-weight:600}
.sum{margin:0;font-size:12.5px;color:var(--mute);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
/* group headings */
.gh{grid-column:1/-1;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:900;margin:10px 2px 0}
.gh small{font-size:11.5px;font-weight:800;padding:2px 9px;border-radius:999px;background:var(--card2);color:var(--mute)}
.gh::after{content:"";flex:1;height:1px;background:var(--line)}
.gh:first-child{margin-top:0}
.elig{font-size:12.5px;font-weight:700;padding:7px 11px;border-radius:11px}
.elig.ok{background:rgba(52,211,153,.14);color:var(--new)} .elig.no{background:rgba(248,113,113,.14);color:var(--bad)} .elig.maybe{background:rgba(251,191,36,.12);color:var(--warn)}
details.more{border-top:1px dashed var(--line);padding-top:9px}
details.more>summary{cursor:pointer;font-size:12.5px;font-weight:700;color:var(--mute);list-style:none}
details.more>summary::-webkit-details-marker{display:none}
details.more[open]>summary{color:var(--text)}
.meta{font-size:13px;color:var(--mute);display:grid;grid-template-columns:92px 1fr;gap:4px 10px;margin:9px 0 6px}
.meta b{color:var(--text);font-weight:600}
.summary{font-size:13px;color:var(--mute);margin-top:6px}
.syl{background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:9px 11px;font-size:13px;margin-top:8px}
.syl b{color:var(--vio)} .syl ul{margin:5px 0 3px 18px;padding:0} .syl .tip{color:var(--mute);font-size:12px;margin-top:5px}
.links{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}
.links a{flex:1 1 auto;text-align:center;text-decoration:none;font-size:13px;font-weight:700;padding:10px 12px;border-radius:13px;color:var(--text);background:var(--card2);border:1px solid var(--line)}
.links a.p{flex:1 1 100%;font-size:14.5px;padding:12px;background:var(--grad);color:#fff;border-color:transparent;box-shadow:var(--glow)}
.links a:not(.p){flex:1 1 90px;white-space:nowrap;font-size:12.5px;padding:10px 6px}
.links a:active{transform:scale(.97)}
.acts{display:flex;gap:8px}
.acts button{flex:1;white-space:nowrap;height:38px;border-radius:12px;border:1px solid var(--line);background:transparent;cursor:pointer;font-size:12.5px;font-weight:700;color:var(--mute)}
.acts button.on{background:var(--card2);color:var(--text);border-color:#ec4899}
.empty{text-align:center;color:var(--mute);padding:50px 0;display:none;font-weight:600}
footer{color:var(--mute);font-size:11.5px;text-align:center;padding:24px 0 10px}

.links a.full,.links button.full{flex:1 1 100%}
.links button.sb{flex:1 1 100%;font:inherit;font-size:13.5px;font-weight:800;padding:11px 12px;border-radius:13px;color:var(--text);background:transparent;border:1px solid #ec4899;cursor:pointer}
.links button.full{font:inherit;font-size:13.5px;font-weight:800;padding:11px 12px;border-radius:13px;color:var(--text);background:var(--card2);border:1px solid #ec4899;cursor:pointer}
/* poori jankari sheet */
.sheet{position:fixed;inset:0;z-index:50;display:none;background:rgba(3,5,12,.66);backdrop-filter:blur(4px);align-items:flex-end;justify-content:center}
.sheet.open{display:flex}
.sheetBox{width:100%;max-width:760px;max-height:92vh;display:flex;flex-direction:column;background:var(--bg2);border:1px solid var(--line);border-radius:24px 24px 0 0;box-shadow:0 -20px 60px -20px rgba(0,0,0,.7);animation:shUp .25s ease}
@keyframes shUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
.sheetHead{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:16px 16px 12px;border-bottom:1px solid var(--line)}
.sheetHead b{font-size:15.5px;line-height:1.35}
.sheetHead button{flex:0 0 auto;width:36px;height:36px;border-radius:12px;border:1px solid var(--line);background:var(--card2);cursor:pointer;font-size:15px}
.sheetBody{overflow-y:auto;padding:12px 16px 26px;-webkit-overflow-scrolling:touch}
.qk{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px}
.qk div{background:var(--card2);border:1px solid var(--line);border-radius:14px;padding:9px 11px}
.qk small{display:block;color:var(--mute);font-size:11px;font-weight:700}
.qk b{font-size:13.5px}
.sec{margin:14px 0}
.sec h4{margin:0 0 8px;font-size:14px;font-weight:800;display:flex;align-items:center;gap:8px}
.sec h4::before{content:"";width:4px;height:16px;border-radius:3px;background:var(--grad)}
.kv{display:grid;grid-template-columns:minmax(90px,38%) 1fr;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.kv>div{padding:9px 11px;font-size:13px;border-bottom:1px solid var(--line);white-space:pre-line;word-break:break-word}
.kv>div:nth-last-child(-n+2){border-bottom:0}
.kv .k{background:var(--card2);color:var(--mute);font-weight:700}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:14px}
.tw table{border-collapse:collapse;width:100%;font-size:12.5px}
.tw th,.tw td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;white-space:pre-line}
.tw th{background:var(--card2);font-weight:800;position:sticky;top:0}
.tw tr:last-child td{border-bottom:0}
.para{font-size:13px;color:var(--mute);white-space:pre-line;margin:6px 0}
.lk{display:inline-block;margin:4px 6px 0 0;padding:6px 12px;border-radius:11px;font-size:12.5px;font-weight:700;text-decoration:none;background:var(--grad);color:#fff}
.nosec{color:var(--mute);font-size:13px;padding:6px 0}
html,body{max-width:100%;overflow-x:hidden}
.tw{overflow-x:visible}
.tw table{table-layout:auto}
.tw td,.tw th{overflow-wrap:anywhere}
@media (max-width:640px){
  .tw table,.tw thead,.tw tbody,.tw tr,.tw td{display:block;width:100%}
  .tw thead{display:none}
  .tw tr{border-bottom:1px solid var(--line);padding:6px 0}
  .tw tr:last-child{border-bottom:0}
  .tw td{border:0;padding:3px 10px}
  .tw td[data-l]::before{content:attr(data-l) ": ";font-weight:800;color:var(--mute)}
}
@media (max-width:560px){.grid{grid-template-columns:1fr}.hero{gap:8px}.tile b{font-size:24px}h1{font-size:20px}.sort{max-width:128px;padding:0 6px}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>💼 <span>Latest Jobs</span></h1>
      <div class="sub" id="sub">Loading…</div>
    </div>
    <div class="hbtns">
      <button class="ib" id="csv" title="CSV download">⬇</button>
      <button class="ib" id="theme" title="Theme">🌓</button>
    </div>
  </header>

  <div class="banner" id="banner"></div>

  <div class="hero" id="hero"></div>

  <div class="search">
    <label class="sbox">🔍<input id="q" type="search" placeholder="Search: SSC, railway, steno, UP…"></label>
    <select id="sort" class="sort" aria-label="Sort">
      <option value="imp">⭐ Important</option>
      <option value="site">Latest</option>
      <option value="last">Last date</option>
      <option value="seen">Naye pehle</option>
      <option value="posts">Posts</option>
    </select>
  </div>

  <div class="chips" id="chips"></div>
  <div class="chips cats" id="cats"></div>

  <details class="prof">
    <summary><span>🎯 Meri profile — Eligible check (optional)</span><span>▾</span></summary>
    <div class="row">
      <select id="pEdu">
        <option value="0">Qualification</option>
        <option value="1">10th pass</option>
        <option value="2">12th pass</option>
        <option value="3">Graduate</option>
        <option value="4">Post Graduate</option>
      </select>
      <input id="pAge" type="number" min="14" max="60" placeholder="Age">
      <span>Set karne par har job par ✅ Eligible / ❌ dikhega.</span>
    </div>
  </details>

  <p class="count" id="count"></p>
  <div class="grid" id="grid"></div>
  <div class="empty" id="empty">😕 Is filter me koi job nahi mili.</div>
  <div class="sheet" id="sheet"><div class="sheetBox"><div class="sheetHead"><b id="shTitle"></b><button id="shClose" aria-label="Band">✕</button></div><div class="sheetBody" id="shBody"></div></div></div>
  <footer>Data sarkariresult.com se. Apply se pehle official notification zaroor verify karein.</footer>
</div>

<script>
const DATA = null /*__DATA__*/;
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";
  const fmtDT = iso => { try { return new Date(iso).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}); } catch(e){ return iso; } };
  const LS = {
    get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  };
  const EDU_NAME = {1:"10th", 2:"12th", 3:"Graduate", 4:"PG/Prof."};
  const INFO = ["Admit Card","Result","Answer Key"];

  if(!DATA || !DATA.jobs || !DATA.jobs.length){
    $("sub").textContent = "Abhi data nahi hai";
    $("grid").innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:30px 18px"><div style="font-size:38px">📭</div><div class="title" style="margin-top:8px">Abhi koi job nahi aayi</div><div class="summary">PC par <b>update_jobs.bat</b> chalao, phir GitHub Desktop se Commit + Push karo.</div></div>`;
    return;
  }
  const jobs = DATA.jobs;
  const lastVisit = LS.get("sjt_last_visit", 0);
  let saved = new Set(LS.get("sjt_saved", [])), applied = new Set(LS.get("sjt_applied", []));
  const prefs = LS.get("sjt_prefs", {edu:0, age:""});
  const state = { chip:"live", q:"", cat:"", sort:"imp" };

  jobs.forEach(j => {
    j._seen = Date.parse(j.first_seen) || 0;
    j._fresh = !j.baseline && (j.is_new || (lastVisit && j._seen > lastVisit));
    j._upd = !!j.is_updated && !j._fresh;
  });

  const root = document.documentElement;
  root.dataset.theme = LS.get("sjt_theme", matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  $("theme").onclick = () => { root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark"; LS.set("sjt_theme", root.dataset.theme); };

  function eligibility(j){
    if(!prefs.edu && !prefs.age) return null;
    let ok = true, known = false, why = [];
    if(prefs.edu && j.edu_level){ known = true; if(+prefs.edu < j.edu_level){ ok = false; why.push(EDU_NAME[j.edu_level] + " chahiye"); } }
    const age = parseInt(prefs.age, 10);
    if(age && (j.age_min || j.age_max)){
      known = true;
      if(j.age_max && age > j.age_max){ ok = false; why.push("Age " + j.age_max + " se zyada"); }
      if(j.age_min && age < j.age_min){ ok = false; why.push("Age " + j.age_min + " se kam"); }
    }
    if(!known) return {state:"maybe", why:["Detail nahi mili"]};
    return {state: ok ? "ok" : "no", why};
  }

  const live = j => j.status !== "closed";
  const CHIPS = [
    ["live","✅ Open", live],
    ["sr","🚆 SSC / Railway", j => live(j) && (j.category === "SSC" || j.category === "Railway")],
    ["new","🆕 Naye", j => j._fresh],
    ["soon","⏰ Jaldi band", j => j.status === "closing_soon"],
    ["watch","⭐ Mere Exams", j => j.watch && live(j)],
    ["elig","🎯 Mere liye", j => live(j) && !INFO.includes(j.type) && (eligibility(j)||{}).state === "ok"],
    ["updates","📢 Admit/Result", j => INFO.includes(j.type)],
    ["saved","💾 Saved", j => saved.has(j.id)],
    ["applied","✔ Applied", j => applied.has(j.id)],
    ["all","Sab", j => true],
  ];

  $("pEdu").value = String(prefs.edu || 0); $("pAge").value = prefs.age || "";
  const savePrefs = () => { prefs.edu = +$("pEdu").value; prefs.age = $("pAge").value; LS.set("sjt_prefs", prefs); render(); };
  $("pEdu").onchange = savePrefs; $("pAge").oninput = savePrefs;

  function icsFor(j){
    if(!j.last_date) return;
    const d = j.last_date.replace(/-/g,"");
    const nxt = new Date(Date.parse(j.last_date) + 86400000).toISOString().slice(0,10).replace(/-/g,"");
    const t = (j.title||"").replace(/\s*\|?\s*Last Date.*$/i,"").replace(/[\n,;]/g," ");
    const ics = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SarkariJobTracker//EN","BEGIN:VEVENT",
      "UID:"+j.id+"@sjt","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z",
      "DTSTART;VALUE=DATE:"+d,"DTEND;VALUE=DATE:"+nxt,"SUMMARY:Last date - "+t,
      "DESCRIPTION:"+(j.url||""),"BEGIN:VALARM","TRIGGER:-P2D","ACTION:DISPLAY","DESCRIPTION:2 din bache","END:VALARM",
      "BEGIN:VALARM","TRIGGER:-P0DT0H","ACTION:DISPLAY","DESCRIPTION:Aaj last date","END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");
    download("lastdate_"+j.id+".ics", ics, "text/calendar");
  }
  function download(name, text, mime){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], {type: mime+";charset=utf-8"}));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function toggle(set, key, id){ set.has(id) ? set.delete(id) : set.add(id); LS.set(key, [...set]); render(); }

  function kbHtml(j){
    if(!j.kb) return "";
    const li = a => (a||[]).map(x => `<li>${esc(x)}</li>`).join("");
    return `<div class="syl"><b>📘 Syllabus &amp; Pattern — ${esc(j.kb.name)}</b>
      ${j.kb.pattern && j.kb.pattern.length ? `<ul>${li(j.kb.pattern)}</ul>` : ""}
      ${j.kb.subjects && j.kb.subjects.length ? `<ul>${li(j.kb.subjects)}</ul>` : ""}
      ${j.kb.tip ? `<div class="tip">💡 ${esc(j.kb.tip)}</div>` : ""}
      <div class="tip">General guide — latest notification se verify karein.</div></div>`;
  }

  const CAT_ICON = {SSC:"🏛️", Railway:"🚆"};
  const catKey = c => String(c || "").replace(/[^A-Za-z]/g, "");
  const fmtD = iso => { try { return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {day:"numeric", month:"short", year:"numeric"}); } catch(e){ return iso; } };
  const fmtN = n => { const x = Number(n); return (String(n).trim() !== "" && isFinite(x)) ? x.toLocaleString("en-IN") : String(n); };

  function dateStrip(j){
    if(INFO.includes(j.type))
      return `<div class="ds info"><div class="dsL"><small>📢 Update</small><b>${esc(j.type)}</b></div>${j.last_date_text ? `<div class="dsR"><small>Date</small><b style="font-size:14px">${esc(j.last_date_text)}</b></div>` : ""}</div>`;
    const dt = j.last_date ? fmtD(j.last_date) : (j.last_date_text || "Date nahi mili");
    let r;
    if(j.status === "open" || j.status === "closing_soon") r = j.days_left === 0 ? `<b>Aaj!</b><small>aakhri din</small>` : `<b>${j.days_left}</b><small>din bache</small>`;
    else if(j.status === "closed") r = `<b>Band</b><small>${-j.days_left} din pehle</small>`;
    else r = `<b>—</b><small>date nahi</small>`;
    return `<div class="ds ${esc(j.status)}"><div class="dsL"><small>📅 Last Date</small><b>${esc(dt)}</b></div><div class="dsR">${r}</div></div>`;
  }

  function card(j){
    const fresh = j._fresh, elig = eligibility(j);
    const title = (j.title||"").replace(/\s*\|?\s*Last Date.*$/i, "");
    const tcls = "t-" + String(j.type||"").split(" ")[0];
    const ck = catKey(j.category);
    const badges = [
      fresh ? `<span class="b new">🆕 NEW</span>` : (j._upd ? `<span class="b upd">🔄 UPDATED</span>` : ""),
      `<span class="b c-${esc(ck)}">${CAT_ICON[j.category] || ""} ${esc(j.category)}</span>`,
      `<span class="b type ${esc(tcls)}">${esc(j.type)}</span>`,
      (j.watch && !CAT_ICON[j.category]) ? `<span class="b star">⭐ Mera exam</span>` : "",
      j.extended ? `<span class="b upd">Date badhi</span>` : "",
    ].join("");

    const st = [];
    const S = (ic, k, v, cls) => { if(v !== undefined && v !== null && String(v).trim() !== "") st.push(`<div${cls ? ` class="${cls}"` : ""}><small>${ic} ${k}</small><b>${esc(v)}</b></div>`); };
    S("👥", "Posts", j.posts ? fmtN(j.posts) : "");
    S("🎂", "Age", (j.age_min || j.age_max) ? `${j.age_min||"?"}–${j.age_max||"?"} saal` : "");
    S("💰", "Fee (Gen)", j.fee ? "₹" + j.fee : "");
    S("▶", "Shuru", j.start_date);
    S("📝", "Exam", j.exam_date);
    S("🎓", "Qualification", j.qualification || (j.edu_level ? EDU_NAME[j.edu_level] : ""), "wide");

    const L = [];
    const add = (cls, u, label) => { u = safeUrl(u); if(u) L.push(`<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener">${label}</a>`); };
    const isInfo = INFO.includes(j.type);
    add("p", j.apply_url || (isInfo ? j.url : ""), isInfo ? "Dekho ↗" : "✅ Apply Online ↗");
    if(!j.apply_url && !isInfo) add("p", j.url, "Details ↗");
    const sheetBtn = `<button class="sb" data-sheet="${esc(j.id)}">📋 Poori Jankari dekho</button>`;
    const sec = [];
    const add2 = (u, label) => { u = safeUrl(u); if(u) sec.push(`<a href="${esc(u)}" target="_blank" rel="noopener">${label}</a>`); };
    add2(j.notification_url, "📄 Notification"); add2(j.syllabus_url, "📘 Syllabus");
    if(j.apply_url || isInfo) add2(j.url, "🔗 Details");

    const eligHtml = (elig && !isInfo) ? `<div class="elig ${elig.state}">${elig.state==="ok" ? "✅ Tum Eligible ho" : elig.state==="no" ? "❌ " + esc(elig.why[0]) : "❔ Eligibility check karo"}</div>` : "";

    return `<article class="card st-${esc(j.status)} pri-${esc(ck)} ${fresh?"isnew":""} ${applied.has(j.id)?"done":""}">
      <div class="badges">${badges}</div>
      <h3 class="title">${esc(title)}</h3>
      ${dateStrip(j)}
      ${st.length ? `<div class="stats">${st.join("")}</div>` : ""}
      ${eligHtml}
      ${j.summary ? `<p class="sum">${esc(j.summary)}</p>` : ""}
      <div class="links">${L.join("")}${sheetBtn}${sec.join("")}</div>
      <div class="acts">
        <button data-a="save" data-id="${esc(j.id)}" class="${saved.has(j.id)?"on":""}">${saved.has(j.id)?"💾 Saved":"💾 Save"}</button>
        <button data-a="applied" data-id="${esc(j.id)}" class="${applied.has(j.id)?"on":""}">✔ Applied</button>
        ${j.last_date && j.status !== "closed" ? `<button data-a="ics" data-id="${esc(j.id)}">📅 Yaad</button>` : ""}
        <button data-a="share" data-id="${esc(j.id)}">🔗</button>
      </div></article>`;
  }

  function secHtml(sec){
    const rows = sec.r || [];
    const allKV = rows.length && rows.every(r => r.c && r.c.length === 2 && !r.p);
    let body = "";
    const links = [];
    if(allKV){
      body = `<div class="kv">` + rows.map(r => {
        const u = r.l && r.l[0] && safeUrl(r.l[0][1]);
        if(u) return `<div class="k">${esc(r.c[0])}</div><div><a class="lk" style="margin:0" href="${esc(u)}" target="_blank" rel="noopener">${esc(r.c[1])} ↗</a></div>`;
        return `<div class="k">${esc(r.c[0])}</div><div>${esc(r.c[1])}</div>`;
      }).join("") + `</div>`;
    } else {
      const tbl = rows.filter(r => r.c && r.c.length > 1);
      const paras = rows.filter(r => r.p || (r.c && r.c.length === 1));
      if(tbl.length){
        const head = tbl.length > 1 ? tbl[0] : null, rest = head ? tbl.slice(1) : tbl;
        body += `<div class="tw"><table>` + (head ? `<thead><tr>${head.c.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead>` : "") +
          `<tbody>${rest.map(r => `<tr>${r.c.map((c,i)=>`<td${head && head.c[i] ? ` data-l="${esc(head.c[i])}"` : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
        tbl.forEach(r => (r.l||[]).forEach(l => links.push(l)));
      }
      paras.forEach(r => { body += `<div class="para">${esc(r.p || r.c[0])}</div>`; (r.l||[]).forEach(l => links.push(l)); });
    }
    rows.forEach(r => { if(!r.c && r.l) r.l.forEach(l => links.push(l)); });
    const seen = new Set();
    const lk = links.filter(l => { const u = safeUrl(l[1]); if(!u || seen.has(u)) return false; seen.add(u); return true; })
      .map(l => `<a class="lk" href="${esc(safeUrl(l[1]))}" target="_blank" rel="noopener">${esc(l[0])} ↗</a>`).join("");
    return `<div class="sec"><h4>${esc(sec.t)}</h4>${body}${lk ? `<div>${lk}</div>` : ""}</div>`;
  }
  function openSheet(j){
    const title = (j.title||"").replace(/\s*\|?\s*Last Date.*$/i, "");
    $("shTitle").textContent = title;
    const q = [];
    const qk = (k, v) => { if(v) q.push(`<div><small>${k}</small><b>${esc(v)}</b></div>`); };
    qk("📅 Last date", j.last_date_text); qk("▶ Shuru", j.start_date); qk("📝 Exam", j.exam_date);
    qk("👥 Posts", j.posts); qk("💰 Fee (Gen)", j.fee ? "₹" + j.fee : ""); qk("🎂 Age", (j.age_min||j.age_max) ? `${j.age_min||"?"}–${j.age_max||"?"} saal` : "");
    let html = q.length ? `<div class="qk">${q.join("")}</div>` : "";
    if(j.summary) html += `<div class="para">${esc(j.summary)}</div>`;
    const secs = j.sections || [];
    html += secs.length ? secs.map(secHtml).join("") : `<div class="nosec">Is job ki poori jankari abhi load nahi hui. Agli update (update_jobs.bat) ke baad aa jaayegi, ya neeche "Details" se site par dekho.</div>`;
    html += kbHtml(j);
    const lk = [["Apply Online", j.apply_url], ["Notification", j.notification_url], ["Official Syllabus", j.syllabus_url], ["Official site", j.official_url], ["Site par dekho", j.url]]
      .filter(x => safeUrl(x[1])).map(x => `<a class="lk" href="${esc(safeUrl(x[1]))}" target="_blank" rel="noopener">${x[0]} ↗</a>`).join("");
    if(lk) html += `<div class="sec"><h4>Important Links</h4><div>${lk}</div></div>`;
    $("shBody").innerHTML = html; $("shBody").scrollTop = 0;
    $("sheet").classList.add("open"); document.body.style.overflow = "hidden";
  }
  function closeSheet(){ $("sheet").classList.remove("open"); document.body.style.overflow = ""; }
  $("shClose").onclick = closeSheet;
  $("sheet").addEventListener("click", e => { if(e.target.id === "sheet") closeSheet(); });
  document.addEventListener("keydown", e => { if(e.key === "Escape") closeSheet(); });

  const grpOf = j => j.category === "SSC" ? 0 : j.category === "Railway" ? 1 : 2;
  const GROUPS = ["🏛️ SSC", "🚆 Railway", "📋 Baaki jobs"];
  const tier = j => j.status === "closed" ? 4 : (j._fresh || j._upd) ? 0 : j.status === "closing_soon" ? 1 : (INFO.includes(j.type) || j.status === "no_date") ? 3 : 2;
  const impSort = (a, b) => grpOf(a) - grpOf(b)
    || (grpOf(a) === 2 ? (b.watch ? 1 : 0) - (a.watch ? 1 : 0) : 0)
    || tier(a) - tier(b)
    || (tier(a) === 1 ? (a.days_left - b.days_left) : 0)
    || (a.order ?? 9999) - (b.order ?? 9999);

  function filtered(){
    const chipFn = CHIPS.find(c => c[0] === state.chip)[2];
    const q = state.q.trim().toLowerCase();
    const list = jobs.filter(chipFn)
      .filter(j => !state.cat || j.category === state.cat)
      .filter(j => !q || (j.title + " " + j.category + " " + j.type + " " + (j.qualification||"") + " " + (j.summary||"")).toLowerCase().includes(q));
    const far = 9e15;
    const by = {
      imp: impSort,
      site: (a,b) => (a.order ?? 9999) - (b.order ?? 9999),
      last: (a,b) => { const f = j => j.status === "closed" ? far + 1 : (j.last_date ? Date.parse(j.last_date) : far); return f(a) - f(b); },
      seen: (a,b) => b._seen - a._seen || (a.order ?? 9999) - (b.order ?? 9999),
      posts:(a,b) => (b.posts||0) - (a.posts||0),
    }[state.sort];
    return list.sort(by);
  }

  function renderTop(){
    const liveJobs = jobs.filter(live).filter(j => !INFO.includes(j.type));
    const T = [["live","t-live",liveJobs.length,"Open jobs"],["new","t-new",jobs.filter(j=>j._fresh).length,"Naye"],["soon","t-soon",jobs.filter(j=>j.status==="closing_soon").length,"Jaldi band"]];
    $("hero").innerHTML = T.map(([id,c,n,l]) => `<div class="tile ${c} ${state.chip===id?"on":""}" data-chip="${id}"><b>${n}</b><span>${l}</span></div>`).join("");
    $("chips").innerHTML = CHIPS.map(([id,label,fn]) =>
      `<span class="chip ${state.chip===id?"on":""}" data-chip="${id}">${label}<small>${jobs.filter(fn).length}</small></span>`).join("");
    const counts = {};
    jobs.filter(CHIPS.find(c => c[0] === state.chip)[2]).forEach(j => counts[j.category] = (counts[j.category]||0) + 1);
    const PRI = {SSC:0, Railway:1};
    const ents = Object.entries(counts).sort((a,b)=>(PRI[a[0]] ?? 9) - (PRI[b[0]] ?? 9) || b[1]-a[1]);
    $("cats").innerHTML = ents.length > 1 ? `<span class="chip ${!state.cat?"on":""}" data-cat="">Sab category</span>` +
      ents.map(([c,n]) => `<span class="chip ${state.cat===c?"on":""}" data-cat="${esc(c)}">${esc(c)}<small>${n}</small></span>`).join("") : "";
  }

  function render(){
    renderTop();
    const list = filtered();
    $("count").textContent = `${list.length} jobs`;
    if(state.sort === "imp" && !state.cat){
      let out = "", last = -1;
      const cnt = [0,0,0]; list.forEach(j => cnt[grpOf(j)]++);
      list.forEach(j => { const g = grpOf(j); if(g !== last){ out += `<div class="gh">${GROUPS[g]}<small>${cnt[g]}</small></div>`; last = g; } out += card(j); });
      $("grid").innerHTML = out;
    } else $("grid").innerHTML = list.map(card).join("");
    $("empty").style.display = list.length ? "none" : "block";
    const n = jobs.filter(j => j._fresh).length;
    document.title = (n ? `(${n}) ` : "") + "Latest Sarkari Jobs";
  }

  document.addEventListener("click", e => {
    const chip = e.target.closest("[data-chip]");
    if(chip){ state.chip = chip.dataset.chip; state.cat = ""; render(); return; }
    const cat = e.target.closest("[data-cat]");
    if(cat){ state.cat = cat.dataset.cat; render(); return; }
    const sb = e.target.closest("[data-sheet]");
    if(sb){ const jj = jobs.find(x => x.id === sb.dataset.sheet); if(jj) openSheet(jj); return; }
    const btn = e.target.closest("button[data-a]");
    if(!btn) return;
    const j = jobs.find(x => x.id === btn.dataset.id); if(!j) return;
    if(btn.dataset.a === "save") toggle(saved, "sjt_saved", j.id);
    else if(btn.dataset.a === "applied") toggle(applied, "sjt_applied", j.id);
    else if(btn.dataset.a === "ics") icsFor(j);
    else if(btn.dataset.a === "share"){
      const t = (j.title||"").replace(/\s*\|?\s*Last Date.*$/i,"");
      if(navigator.share) navigator.share({title:t, text:t, url:j.url}).catch(()=>{});
      else if(navigator.clipboard){ navigator.clipboard.writeText(t + "\n" + j.url); btn.textContent = "✓"; }
    }
  });
  $("q").oninput = e => { state.q = e.target.value; render(); };
  $("sort").onchange = e => { state.sort = e.target.value; render(); };
  $("csv").onclick = () => {
    const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const head = ["title","type","category","last_date","days_left","posts","qualification","age_min","age_max","url","syllabus","notification","apply"];
    const rows = filtered().map(j => [j.title,j.type,j.category,j.last_date_text,j.days_left,j.posts,j.qualification,j.age_min,j.age_max,j.url,j.syllabus_url,j.notification_url,j.apply_url].map(q).join(","));
    download("jobs.csv", "﻿" + head.join(",") + "\n" + rows.join("\n"), "text/csv");
  };

  $("sub").textContent = `Update: ${fmtDT(DATA.updated_at)} · ${jobs.length} entries`;
  const fresh = jobs.filter(j => j._fresh).length;
  if(fresh){ const b = $("banner"); b.style.display = "block"; b.textContent = `🆕 ${fresh} naye job/update aaye hain — "Naye" dekho.`; }
  render();
  LS.set("sjt_last_visit", Date.now());
})();
</script>
</body>
</html>
"""


def build_html(store: dict, out_path: Path, refresh_secs: int = 0, hint: str = "run"):
    jobs = sorted(store["jobs"].values(), key=lambda j: j.get("order", 9999))
    payload = {"updated_at": now_iso(), "jobs": jobs, "refresh_hint": hint}
    blob = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    blob = blob.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    html = TEMPLATE.replace("null /*__DATA__*/", blob, 1)
    if refresh_secs:
        html = html.replace("<title>", f'<meta http-equiv="refresh" content="{refresh_secs}">\n<title>', 1)
    out_path.write_text(html, encoding="utf-8")


def save_state(store: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(store, ensure_ascii=False, indent=1), encoding="utf-8")


def send_telegram(text: str):
    tok, chat = os.getenv("TELEGRAM_BOT_TOKEN"), os.getenv("TELEGRAM_CHAT_ID")
    if not (tok and chat and requests):
        return
    try:
        requests.post(f"https://api.telegram.org/bot{tok}/sendMessage",
                      data={"chat_id": chat, "text": text[:4000], "disable_web_page_preview": True}, timeout=20)
    except Exception as e:  # noqa
        log("Telegram fail:", e)


def build_alert(new_jobs, updated) -> str:
    lines = []
    if new_jobs:
        lines.append(f"🆕 {len(new_jobs)} naye jobs/updates")
        for j in new_jobs:
            star = "⭐ " if j.get("watch") else ""
            ld = f" | Last: {j['last_date_text']}" if j.get("last_date_text") else ""
            posts = f" | {j['posts']} post" if j.get("posts") else ""
            syl = f"\n   📘 {j['syllabus_url']}" if j.get("syllabus_url") else ""
            lines.append(f"{star}[{j['type']}/{j['category']}] {j['title']}{posts}{ld}\n   🔗 {j['url']}{syl}")
    if updated:
        lines.append(f"\n🔄 {len(updated)} purane jobs me update")
        for j in updated:
            lines.append(f"- {j['title']}\n   {j['url']}")
    return "\n".join(lines)


# ═════════════════════════════════════════════════════════════════ run
def run_once(args) -> dict:
    watch = [w.strip().lower() for w in args.watch.split(",") if w.strip()] if args.watch else None
    store = load_store()
    first_run = not store.get("baseline_done") and not store["jobs"]
    f = Fetcher(args.fixture, args.detail_fixture)

    html = f.get(LIST_URL)
    if not html:
        sys.exit("❌ Listing page nahi khuli (site block / internet). Thodi der baad try karo.")
    listing = parse_listing(html)
    if not listing:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        DEBUG_LIST_PATH.write_text(html, encoding="utf-8")
        sys.exit(f"❌ Listing me koi job nahi mili - site ka HTML badal gaya/bot-check. Raw page: {DEBUG_LIST_PATH}")
    log(f"Listing: {len(listing)} entries")

    new_jobs, updated, seen_ids, ts = [], [], set(), now_iso()
    for order, item in enumerate(listing):
        jid = make_id(item["url"])
        if jid in seen_ids:
            continue
        seen_ids.add(jid)
        j = store["jobs"].get(jid)
        if j is None:
            j = {"id": jid, "url": item["url"], "title": item["title"], "first_seen": ts,
                 "baseline": first_run, "detail_fetched": False, "detail_tries": 0}
            store["jobs"][jid] = j
            if not first_run:
                new_jobs.append(j)
        elif norm(j["title"]) != norm(item["title"]):
            j["prev_title"], j["title"], j["updated_at"] = j["title"], item["title"], ts
            updated.append(j)
        j["last_seen"], j["order"] = ts, order
        refresh_derived(j, watch)

    for _j in store["jobs"].values():          # purane jobs: poori jankari (sections) dobara laao
        if _j.get("detail_fetched") and "sections" not in _j and not _j.get("sec_mig") and "doc.sarkariresults" not in _j["url"] and not _j["url"].lower().endswith(".pdf"):
            _j["detail_fetched"], _j["detail_tries"], _j["sec_mig"] = False, 0, True

    if not args.no_detail:
        pending = [j for j in store["jobs"].values()
                   if not j["detail_fetched"] and j.get("last_seen") == ts and j.get("detail_tries", 0) < MAX_DETAIL_TRIES
                   and j["status"] in ("open", "closing_soon", "no_date")
                   and j["type"] in ("New Vacancy", "Vacancy Update", "Correction Form", "Other", "Document Upload", "Option Form")]
        pending.sort(key=lambda j: (not j.get("is_new"), not j.get("watch"), j.get("order", 9999)))
        log(f"Detail pages pending: {len(pending)} (is run me max {MAX_DETAIL_PER_RUN})")
        for j in pending[:MAX_DETAIL_PER_RUN]:
            if "doc.sarkariresults" in j["url"] or j["url"].lower().endswith(".pdf"):
                j["detail_fetched"], j["notification_url"] = True, j["url"]
                continue
            j["detail_tries"] = j.get("detail_tries", 0) + 1
            h = f.get(j["url"], is_detail=True)
            if h:
                j.update(parse_detail(h))
                j["detail_fetched"] = True
                refresh_derived(j, watch)
                log(f"  ✓ {j['title'][:72]}")
            if not args.fixture:
                time.sleep(DETAIL_DELAY)

    cutoff = now_dt() - timedelta(days=KEEP_DAYS)
    for k in [k for k, v in store["jobs"].items() if datetime.fromisoformat(v["last_seen"]) < cutoff]:
        del store["jobs"][k]

    store["baseline_done"] = True
    save_state(store)
    out = Path(args.out) if os.path.isabs(args.out) else BASE / args.out
    build_html(store, out, refresh_secs=(args.loop * 60 if args.loop else 0),
               hint=(f"{args.loop} min" if args.loop else "run"))
    log(f"✅ Dashboard: {out}")

    if first_run:
        log("Pehli run: baseline set. Ab se sirf naye jobs 'NEW' honge.")
    alert = build_alert(new_jobs, updated)
    if alert:
        ALERT_PATH.write_text(f"# Alerts ({ts})\n\n{alert}\n", encoding="utf-8")
        log("\n" + alert)
        send_telegram(alert)
    else:
        log("Koi naya job nahi.")
    store["_out"] = str(out)
    return store


def main():
    ap = argparse.ArgumentParser(description="Sarkari Job Tracker")
    ap.add_argument("--out", default="dashboard.html", help="output HTML (default dashboard.html)")
    ap.add_argument("--loop", type=int, default=0, metavar="MIN", help="har MIN minute me dobara chalao")
    ap.add_argument("--no-open", action="store_true", help="browser me mat kholo")
    ap.add_argument("--no-detail", action="store_true", help="detail pages skip (fast)")
    ap.add_argument("--watch", help='apne exams, comma separated, e.g. "ssc,railway,steno"')
    ap.add_argument("--fixture", help="offline test: listing HTML")
    ap.add_argument("--detail-fixture", help="offline test: detail HTML")
    args = ap.parse_args()

    opened = False
    while True:
        try:
            store = run_once(args)
            if not args.no_open and not opened:
                webbrowser.open(Path(store["_out"]).resolve().as_uri())
                opened = True
        except SystemExit as e:
            if not args.loop:
                raise
            log(str(e))
        if not args.loop:
            break
        log(f"⏳ Agli run {args.loop} min baad ({datetime.now(IST):%H:%M}). Band karne ke liye Ctrl+C.")
        try:
            time.sleep(args.loop * 60)
        except KeyboardInterrupt:
            log("Band.")
            break


if __name__ == "__main__":
    main()
