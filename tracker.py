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
MAX_DETAIL_PER_RUN = 60  # ek run me max detail pages (site pe load kam)
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
<title>Sarkari Job Tracker</title>
<style>
:root{
  --bg:#0e1015; --panel:#161922; --card:#171a23; --card2:#1f2330; --line:#2a2f3d; --text:#e9ebf1; --mute:#98a1b3;
  --accent:#6ea8fe; --on-accent:#0a1224; --new:#34d399; --warn:#fbbf24; --bad:#f87171; --star:#fcd34d; --vio:#c4b5fd;
  --shadow:0 1px 0 rgba(255,255,255,.03) inset;
}
:root[data-theme="light"]{
  --bg:#f4f6fa; --panel:#ffffff; --card:#ffffff; --card2:#eef1f7; --line:#dde2ec; --text:#171b26; --mute:#5b6577;
  --accent:#1f6feb; --on-accent:#ffffff; --new:#0f9d6c; --warn:#b7791f; --bad:#d6336c; --star:#b7791f; --vio:#6d4fd8;
  --shadow:0 1px 2px rgba(20,30,50,.06);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Devanagari",sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px}
header{padding:18px 0 6px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
h1{margin:0;font-size:21px;letter-spacing:.2px}
.sub{color:var(--mute);font-size:12.5px;margin-top:2px}
.tools{display:flex;gap:8px;flex-wrap:wrap}
button,select,input{font:inherit;color:var(--text)}
.btn{background:var(--panel);border:1px solid var(--line);padding:7px 12px;border-radius:9px;cursor:pointer;font-size:13px}
.btn:hover{border-color:var(--accent)}
.banner{background:rgba(52,211,153,.12);border:1px solid var(--new);color:var(--text);padding:10px 14px;border-radius:10px;margin:10px 0;display:none}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:12px 0}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 12px;box-shadow:var(--shadow);cursor:pointer}
.stat b{display:block;font-size:22px;line-height:1.1}
.stat span{font-size:12px;color:var(--mute)}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;margin:10px 0}
.prefs{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:13px}
.prefs label{color:var(--mute)}
.prefs select,.prefs input{background:var(--card2);border:1px solid var(--line);padding:7px 10px;border-radius:8px}
.prefs input{width:84px}
.cats{display:flex;flex-direction:column;gap:5px}
.cat{display:grid;grid-template-columns:120px 1fr 28px;gap:8px;align-items:center;font-size:12.5px;cursor:pointer}
.cat .bar{height:8px;border-radius:6px;background:var(--card2);overflow:hidden}
.cat .bar i{display:block;height:100%;background:var(--accent)}
.cat.on{color:var(--accent);font-weight:600}
.chips{display:flex;gap:8px;margin:10px 0;overflow-x:auto;padding-bottom:4px}
.chip{flex:0 0 auto;background:var(--panel);border:1px solid var(--line);padding:7px 12px;border-radius:999px;cursor:pointer;font-size:13px;user-select:none;white-space:nowrap}
.chip.on{background:var(--accent);color:var(--on-accent);border-color:var(--accent);font-weight:600}
.chip small{opacity:.75;margin-left:5px}
.controls{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.controls input[type=search]{flex:1;min-width:200px}
.controls input,.controls select{background:var(--panel);border:1px solid var(--line);padding:9px 11px;border-radius:9px;font-size:14px}
.count{color:var(--mute);font-size:13px;margin:0 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:9px;box-shadow:var(--shadow);position:relative}
.card.isnew{border-color:var(--new);box-shadow:0 0 0 1px var(--new) inset}
.card.watch::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:3px;background:var(--star)}
.card.done{opacity:.62}
.title{font-weight:650;font-size:15.5px;line-height:1.35}
.badges{display:flex;flex-wrap:wrap;gap:6px}
.b{font-size:11.5px;padding:2px 8px;border-radius:6px;background:var(--card2);border:1px solid var(--line);color:var(--mute);white-space:nowrap}
.b.new{background:var(--new);color:#052116;border-color:var(--new);font-weight:700}
.b.star{color:var(--star)} .b.type{color:var(--accent)} .b.ext{color:var(--warn)}
.b.ok{color:var(--new);border-color:var(--new)} .b.no{color:var(--bad);border-color:var(--bad)} .b.maybe{color:var(--warn)}
.summary{font-size:13px;color:var(--mute)}
.meta{font-size:13px;color:var(--mute);display:grid;grid-template-columns:96px 1fr;gap:3px 10px}
.meta b{color:var(--text);font-weight:600}
.left{font-weight:700}
.left.open{color:var(--new)} .left.closing_soon{color:var(--warn)} .left.closed{color:var(--bad)} .left.no_date,.left.info{color:var(--mute)}
.meter{height:5px;background:var(--card2);border-radius:5px;overflow:hidden}
.meter i{display:block;height:100%}
details.syl{background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:13px}
details.syl summary{cursor:pointer;color:var(--vio);font-weight:600}
details.syl ul{margin:6px 0 2px 18px;padding:0}
details.syl li{margin:2px 0}
details.syl .tip{margin-top:6px;color:var(--mute);font-size:12px}
.links,.acts{display:flex;flex-wrap:wrap;gap:6px}
.links{margin-top:auto}
.links a{font-size:12.5px;text-decoration:none;color:var(--text);background:var(--card2);border:1px solid var(--line);padding:5px 10px;border-radius:8px}
.links a.p{background:var(--accent);color:var(--on-accent);border-color:var(--accent);font-weight:650}
.links a.s{color:var(--vio);border-color:var(--vio)}
.acts button{font-size:12px;background:transparent;border:1px dashed var(--line);color:var(--mute);padding:4px 9px;border-radius:8px;cursor:pointer}
.acts button.on{border-style:solid;color:var(--text);border-color:var(--accent);background:var(--card2)}
.empty{text-align:center;color:var(--mute);padding:40px 0;display:none}
footer{color:var(--mute);font-size:12px;text-align:center;padding:22px 0 40px}
@media (max-width:520px){ .grid{grid-template-columns:1fr} h1{font-size:19px} .cat{grid-template-columns:100px 1fr 24px}
  .stats{grid-template-columns:repeat(3,1fr);gap:8px} .stat{padding:8px 10px} .stat b{font-size:18px} .stat span{font-size:11px} .prefs .sub{width:100%} }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>📋 Sarkari Job Tracker</h1>
      <div class="sub" id="sub">Loading…</div>
    </div>
    <div class="tools">
      <button class="btn" id="csv">⬇ CSV</button>
      <button class="btn" id="theme">🌓 Theme</button>
    </div>
  </header>

  <div class="banner" id="banner"></div>
  <div class="stats" id="stats"></div>

  <div class="panel prefs">
    <b>🎯 Meri profile</b>
    <label>Qualification
      <select id="pEdu">
        <option value="0">— set karo —</option>
        <option value="1">10th pass</option>
        <option value="2">12th pass</option>
        <option value="3">Graduate</option>
        <option value="4">Post Graduate / Professional</option>
      </select>
    </label>
    <label>Age <input id="pAge" type="number" min="14" max="60" placeholder="saal"></label>
    <span class="sub" id="pHint">Set karoge to har job par "Eligible / Nahi" badge dikhega (age relaxation alag se check karo).</span>
  </div>

  <div class="panel"><div class="cats" id="cats"></div></div>

  <div class="chips" id="chips"></div>
  <div class="controls">
    <input id="q" type="search" placeholder="Search: SSC, steno, railway, teacher, UP…">
    <select id="type"></select>
    <select id="cat"></select>
    <select id="sort">
      <option value="site">Sort: Site order (latest)</option>
      <option value="last">Sort: Last date nazdeek</option>
      <option value="seen">Sort: Naye pehle</option>
      <option value="posts">Sort: Zyada posts</option>
    </select>
  </div>
  <p class="count" id="count"></p>
  <div class="grid" id="grid"></div>
  <div class="empty" id="empty">Is filter me koi job nahi mili.</div>
  <footer>Data sarkariresult.com se auto-collect hota hai. Syllabus/pattern general guide hai — apply se pehle official notification zaroor verify karein.</footer>
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

  if(!DATA || !DATA.jobs){ $("sub").textContent = "Data nahi mila — `python tracker.py` chalao."; return; }
  const jobs = DATA.jobs;
  const lastVisit = LS.get("sjt_last_visit", 0);
  let saved = new Set(LS.get("sjt_saved", [])), applied = new Set(LS.get("sjt_applied", []));
  const prefs = LS.get("sjt_prefs", {edu:0, age:""});
  const state = { chip:"live", q:"", type:"", cat:"", sort:"site" };

  jobs.forEach(j => {
    j._seen = Date.parse(j.first_seen) || 0;
    j._fresh = !j.baseline && (j.is_new || (lastVisit && j._seen > lastVisit));
    j._upd = !!j.is_updated && !j._fresh;
  });

  // ---------- theme
  const root = document.documentElement;
  root.dataset.theme = LS.get("sjt_theme", matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  $("theme").onclick = () => { root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark"; LS.set("sjt_theme", root.dataset.theme); };

  // ---------- eligibility
  function eligibility(j){
    if(!prefs.edu && !prefs.age) return null;
    let ok = true, known = false, why = [];
    if(prefs.edu && j.edu_level){ known = true; if(+prefs.edu < j.edu_level){ ok = false; why.push("Qualification: " + EDU_NAME[j.edu_level] + " chahiye"); } }
    const age = parseInt(prefs.age, 10);
    if(age && (j.age_min || j.age_max)){
      known = true;
      if(j.age_max && age > j.age_max){ ok = false; why.push("Age > " + j.age_max); }
      if(j.age_min && age < j.age_min){ ok = false; why.push("Age < " + j.age_min); }
    }
    if(!known) return {state:"maybe", why:["Detail nahi mili"]};
    return {state: ok ? "ok" : "no", why};
  }

  // ---------- filters
  const live = j => j.status !== "closed";
  const CHIPS = [
    ["live","✅ Open / Jaari", live],
    ["new","🆕 Naye", j => j._fresh],
    ["soon","⏰ Jaldi band", j => j.status === "closing_soon"],
    ["watch","⭐ Mere Exams", j => j.watch && live(j)],
    ["elig","🎯 Mere liye", j => live(j) && j.type !== "Admit Card" && j.type !== "Result" && j.type !== "Answer Key" && (eligibility(j)||{}).state === "ok"],
    ["syl","📘 Syllabus", j => live(j) && (j.syllabus_url || j.kb)],
    ["saved","💾 Saved", j => saved.has(j.id)],
    ["applied","✅ Applied", j => applied.has(j.id)],
    ["updates","📢 Admit/Result/Key", j => ["Admit Card","Result","Answer Key"].includes(j.type)],
    ["all","Sab", j => true],
  ];

  function uniq(k){ return [...new Set(jobs.map(j => j[k]).filter(Boolean))].sort(); }
  $("type").innerHTML = `<option value="">Sab Types</option>` + uniq("type").map(t => `<option>${esc(t)}</option>`).join("");
  $("cat").innerHTML  = `<option value="">Sab Categories</option>` + uniq("category").map(t => `<option>${esc(t)}</option>`).join("");

  // ---------- prefs UI
  $("pEdu").value = String(prefs.edu || 0); $("pAge").value = prefs.age || "";
  const savePrefs = () => { prefs.edu = +$("pEdu").value; prefs.age = $("pAge").value; LS.set("sjt_prefs", prefs); render(); };
  $("pEdu").onchange = savePrefs; $("pAge").oninput = savePrefs;

  // ---------- helpers
  function meterHtml(j){
    if(j.status !== "open" && j.status !== "closing_soon") return "";
    const pct = Math.max(4, Math.min(100, 100 - (j.days_left / 30) * 100));
    const col = j.status === "closing_soon" ? "var(--warn)" : "var(--new)";
    return `<div class="meter" title="${esc(j.days_left)} din bache"><i style="width:${pct}%;background:${col}"></i></div>`;
  }
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
    return `<details class="syl"><summary>📘 Syllabus &amp; Pattern — ${esc(j.kb.name)}</summary>
      ${j.kb.pattern && j.kb.pattern.length ? `<b>Pattern</b><ul>${li(j.kb.pattern)}</ul>` : ""}
      ${j.kb.subjects && j.kb.subjects.length ? `<b>Topics</b><ul>${li(j.kb.subjects)}</ul>` : ""}
      ${j.kb.tip ? `<div class="tip">💡 ${esc(j.kb.tip)}</div>` : ""}
      <div class="tip">General guide — latest notification se verify karein.</div></details>`;
  }

  function card(j){
    const fresh = j._fresh, elig = eligibility(j);
    const isInfo = ["Admit Card","Result","Answer Key"].includes(j.type);
    const badges = [
      fresh ? `<span class="b new">NEW</span>` : (j._upd ? `<span class="b ext">🔄 UPDATED</span>` : ""),
      j.watch ? `<span class="b star">⭐ Mera exam</span>` : "",
      `<span class="b type">${esc(j.type)}</span>`,
      `<span class="b">${esc(j.category)}</span>`,
      j.edu_level ? `<span class="b">🎓 ${esc(EDU_NAME[j.edu_level])}</span>` : "",
      j.posts ? `<span class="b">${esc(j.posts)} posts</span>` : "",
      j.extended ? `<span class="b ext">Date extended / re-open</span>` : "",
      (elig && !isInfo) ? `<span class="b ${elig.state}" title="${esc(elig.why.join(", "))}">${elig.state==="ok" ? "✅ Eligible" : elig.state==="no" ? "❌ " + esc(elig.why[0]) : "❔ Check karo"}</span>` : "",
    ].join("");

    let left = "—";
    if(j.status === "open" || j.status === "closing_soon") left = j.days_left === 0 ? "Aaj last date!" : `${j.days_left} din bache`;
    else if(j.status === "closed") left = `Band (${-j.days_left} din pehle)`;
    else if(j.status === "no_date") left = j.last_date_text || "Date nahi di";

    const rows = [];
    if(j.last_date_text) rows.push(`<span>Last date</span><span><b>${esc(j.last_date_text)}</b> · <span class="left ${esc(j.status)}">${esc(left)}</span></span>`);
    else if(!isInfo) rows.push(`<span>Status</span><span class="left ${esc(j.status)}">${esc(left)}</span>`);
    if(j.start_date) rows.push(`<span>Shuru</span><span>${esc(j.start_date)}</span>`);
    if(j.exam_date) rows.push(`<span>Exam</span><span>${esc(j.exam_date)}</span>`);
    if(j.age_min || j.age_max) rows.push(`<span>Age</span><span>${esc(j.age_min||"?")}–${esc(j.age_max||"?")} saal</span>`);
    if(j.fee) rows.push(`<span>Fee (Gen)</span><span>₹${esc(j.fee)}</span>`);
    if(j.qualification) rows.push(`<span>Qualification</span><span>${esc(j.qualification)}</span>`);

    const L = [];
    const add = (cls, u, label) => { u = safeUrl(u); if(u) L.push(`<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener">${label}</a>`); };
    add("p", j.apply_url, "Apply ↗"); add("s", j.syllabus_url, "📘 Official Syllabus"); add("", j.notification_url, "Notification");
    add("", j.url, "Details"); add("", j.official_url, "Official site");

    const title = (j.title||"").replace(/\s*\|?\s*Last Date.*$/i, "");
    return `<article class="card ${fresh?"isnew":""} ${j.watch?"watch":""} ${applied.has(j.id)?"done":""}">
      <div class="title">${esc(title)}</div>
      <div class="badges">${badges}</div>
      ${j.summary ? `<div class="summary">${esc(j.summary)}</div>` : ""}
      <div class="meta">${rows.join("")}</div>${meterHtml(j)}
      ${kbHtml(j)}
      <div class="links">${L.join("")}</div>
      <div class="acts">
        <button data-a="save" data-id="${esc(j.id)}" class="${saved.has(j.id)?"on":""}">💾 ${saved.has(j.id)?"Saved":"Save"}</button>
        <button data-a="applied" data-id="${esc(j.id)}" class="${applied.has(j.id)?"on":""}">✅ ${applied.has(j.id)?"Applied":"Applied?"}</button>
        ${j.last_date && j.status !== "closed" ? `<button data-a="ics" data-id="${esc(j.id)}">📅 Reminder</button>` : ""}
        <button data-a="share" data-id="${esc(j.id)}">🔗 Share</button>
      </div></article>`;
  }

  // ---------- render
  function filtered(){
    const chipFn = CHIPS.find(c => c[0] === state.chip)[2];
    const q = state.q.trim().toLowerCase();
    const list = jobs.filter(chipFn)
      .filter(j => !state.type || j.type === state.type)
      .filter(j => !state.cat || j.category === state.cat)
      .filter(j => !q || (j.title + " " + j.category + " " + j.type + " " + (j.qualification||"") + " " + (j.summary||"")).toLowerCase().includes(q));
    const far = 9e15;
    const by = {
      site: (a,b) => (a.order ?? 9999) - (b.order ?? 9999),
      last: (a,b) => { const f = j => j.status === "closed" ? far + 1 : (j.last_date ? Date.parse(j.last_date) : far); return f(a) - f(b); },
      seen: (a,b) => b._seen - a._seen || (a.order ?? 9999) - (b.order ?? 9999),
      posts:(a,b) => (b.posts||0) - (a.posts||0),
    }[state.sort];
    return list.sort(by);
  }

  function renderStats(){
    const liveJobs = jobs.filter(live).filter(j => !["Admit Card","Result","Answer Key"].includes(j.type));
    const S = [
      ["live", liveJobs.length, "Open vacancies"], ["new", jobs.filter(j=>j._fresh).length, "Naye"],
      ["soon", jobs.filter(j=>j.status==="closing_soon").length, "Jaldi band"],
      ["watch", jobs.filter(j=>j.watch && live(j)).length, "Mere exams"],
      ["saved", saved.size, "Saved"], ["applied", applied.size, "Applied"],
    ];
    $("stats").innerHTML = S.map(([id,n,l]) => `<div class="stat" data-chip="${id}"><b>${n}</b><span>${l}</span></div>`).join("");
    const counts = {};
    liveJobs.forEach(j => counts[j.category] = (counts[j.category]||0) + 1);
    const max = Math.max(1, ...Object.values(counts));
    $("cats").innerHTML = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([c,n]) =>
      `<div class="cat ${state.cat===c?"on":""}" data-cat="${esc(c)}"><span>${esc(c)}</span><div class="bar"><i style="width:${n/max*100}%"></i></div><span>${n}</span></div>`).join("");
  }

  function render(){
    $("chips").innerHTML = CHIPS.map(([id,label,fn]) =>
      `<span class="chip ${state.chip===id?"on":""}" data-chip="${id}">${label}<small>${jobs.filter(fn).length}</small></span>`).join("");
    renderStats();
    const list = filtered();
    $("count").textContent = `${list.length} results`;
    $("grid").innerHTML = list.map(card).join("");
    $("empty").style.display = list.length ? "none" : "block";
    const n = jobs.filter(j => j._fresh).length;
    document.title = (n ? `(${n}) ` : "") + "Sarkari Job Tracker";
  }

  document.addEventListener("click", e => {
    const chip = e.target.closest("[data-chip]");
    if(chip){ state.chip = chip.dataset.chip; render(); return; }
    const cat = e.target.closest("[data-cat]");
    if(cat){ state.cat = state.cat === cat.dataset.cat ? "" : cat.dataset.cat; $("cat").value = state.cat; render(); return; }
    const btn = e.target.closest("button[data-a]");
    if(!btn) return;
    const j = jobs.find(x => x.id === btn.dataset.id); if(!j) return;
    if(btn.dataset.a === "save") toggle(saved, "sjt_saved", j.id);
    else if(btn.dataset.a === "applied") toggle(applied, "sjt_applied", j.id);
    else if(btn.dataset.a === "ics") icsFor(j);
    else if(btn.dataset.a === "share"){
      const t = (j.title||"").replace(/\s*\|?\s*Last Date.*$/i,"");
      if(navigator.share) navigator.share({title:t, text:t, url:j.url}).catch(()=>{});
      else if(navigator.clipboard){ navigator.clipboard.writeText(t + "\n" + j.url); btn.textContent = "✓ Copied"; }
    }
  });
  $("q").oninput = e => { state.q = e.target.value; render(); };
  $("type").onchange = e => { state.type = e.target.value; render(); };
  $("cat").onchange = e => { state.cat = e.target.value; render(); };
  $("sort").onchange = e => { state.sort = e.target.value; render(); };
  $("csv").onclick = () => {
    const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const head = ["title","type","category","last_date","days_left","posts","qualification","age_min","age_max","url","syllabus","notification","apply"];
    const rows = filtered().map(j => [j.title,j.type,j.category,j.last_date_text,j.days_left,j.posts,j.qualification,j.age_min,j.age_max,j.url,j.syllabus_url,j.notification_url,j.apply_url].map(q).join(","));
    download("jobs.csv", "﻿" + head.join(",") + "\n" + rows.join("\n"), "text/csv");
  };

  $("sub").textContent = `Last update: ${fmtDT(DATA.updated_at)} · ${jobs.length} entries · site se har ${DATA.refresh_hint || "run"} par refresh`;
  const fresh = jobs.filter(j => j._fresh).length;
  if(fresh){ const b = $("banner"); b.style.display = "block"; b.textContent = `🆕 ${fresh} naye job/update aaye hain — "Naye" chip dekho.`; }
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
