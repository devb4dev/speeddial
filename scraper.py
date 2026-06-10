"\"\"\"
Scraper for Osmania University Press Notes page.
Source: http://www.ouexams.in/press
The page is ASP.NET WebForms — we POST with __VIEWSTATE to fetch additional pages,
but for the live feed we only need page 1 (latest notifications).
\"\"\"
import hashlib
import logging
import re
from datetime import datetime, timezone
from typing import List, Dict
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

PRESS_URL = \"http://www.ouexams.in/press\"
BASE_URL = \"http://www.ouexams.in/\"
HEADERS = {
    \"User-Agent\": (
        \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \"
        \"(KHTML, like Gecko) Chrome/124.0 Safari/537.36\"
    )
}

logger = logging.getLogger(__name__)

# Keyword → canonical course mapping. Order matters: more specific first.
COURSE_PATTERNS: List[tuple] = [
    (r\"\bPh\.?D\b\", \"Ph.D\"),
    (r\"\bM\.?Phil\b\", \"M.Phil\"),
    (r\"\bPsy\.?D\b\", \"Psy.D\"),
    (r\"\bM\.?E[/\s]|M\.?Tech\b\", \"M.E / M.Tech\"),
    (r\"\bB\.?E\b(?!d)\", \"B.E\"),
    (r\"\bMBA\b\", \"MBA\"),
    (r\"\bMCA\b\", \"MCA\"),
    (r\"\bBCA\b\", \"BCA\"),
    (r\"\bM\.?Pharm\", \"M.Pharmacy\"),
    (r\"\bB\.?Pharm\", \"B.Pharmacy\"),
    (r\"\bPharm[-\s.]?D\b\", \"Pharm.D\"),
    (r\"\bLL\.?M\b\", \"LL.M\"),
    (r\"\bLL\.?B\b\", \"LL.B\"),
    (r\"\bBA\.?\s*LL\.?B\b\", \"BA LL.B\"),
    (r\"\bBBA\.?\s*LL\.?B\b\", \"BBA LL.B\"),
    (r\"\bB\.?Com\.?\s*LL\.?B\b\", \"B.Com LL.B\"),
    (r\"\bM\.?Ed\b\", \"M.Ed\"),
    (r\"\bB\.?Ed\b\", \"B.Ed\"),
    (r\"\bM\.?P\.?Ed\b\", \"M.P.Ed\"),
    (r\"\bB\.?P\.?Ed\b\", \"B.P.Ed\"),
    (r\"\bD\.?P\.?Ed\b\", \"D.P.Ed\"),
    (r\"\bBHMCT\b\", \"BHMCT\"),
    (r\"\bBCTCA\b\", \"BCTCA\"),
    (r\"\bBASLP\b\", \"BASLP\"),
    (r\"\bBSW\b\", \"BSW\"),
    (r\"\bMSW\b\", \"MSW\"),
    (r\"\bMJ\s*&?\s*MC\b|\bMJMC\b\", \"MJ & MC\"),
    (r\"\bM\.?Lib\.?Sc\b\", \"M.Lib.Sc\"),
    (r\"\bBBA\b\", \"BBA\"),
    (r\"\bB\.?F\.?A\b\", \"B.F.A\"),
    (r\"\bMDHM\b\", \"MDHM\"),
    (r\"\bPGDIRP\b\", \"PGDIRP\"),
    (r\"\bPGDRM\b\", \"PGDRM\"),
    (r\"\bPGRRCDE\b\", \"PGRRCDE (Distance)\"),
    (r\"\bB\.?Sc\s*\(?\s*Hons\", \"B.Sc (Honours)\"),
    (r\"\bB\.?Sc\b\", \"B.Sc\"),
    (r\"\bM\.?Sc\b\", \"M.Sc\"),
    (r\"\bB\.?Com\b\", \"B.Com\"),
    (r\"\bM\.?Com\b\", \"M.Com\"),
    (r\"\bBA\b|\bB\.?A\b\", \"B.A\"),
    (r\"\bMA\b|\bM\.?A\b\", \"M.A\"),
    (r\"\bUG\s*\(CBCS\)|UG\s*\(PGRRCDE\)\", \"UG (General)\"),
    (r\"\bPG\b\", \"PG (General)\"),
]

# Keywords for categorization
CATEGORY_PATTERNS = [
    (r\"timetable|time\s*table|schedule\", \"Timetable\"),
    (r\"result|revaluation|photocopy|challenge\s+valuation\", \"Results\"),
    (r\"postpon|reschedul|revised|extension|circular\", \"Update\"),
    (r\"notification|examination|exam\", \"Notification\"),
]


def detect_courses(title: str) -> List[str]:
    found = []
    for pattern, name in COURSE_PATTERNS:
        if re.search(pattern, title, flags=re.IGNORECASE):
            if name not in found:
                found.append(name)
    return found or [\"General\"]


def detect_category(title: str) -> str:
    for pattern, cat in CATEGORY_PATTERNS:
        if re.search(pattern, title, flags=re.IGNORECASE):
            return cat
    return \"Notification\"


def _parse_date(raw: str) -> str:
    \"\"\"OU dates are dd-mm-yyyy; return ISO date string.\"\"\"
    raw = raw.strip()
    for fmt in (\"%d-%m-%Y\", \"%d/%m/%Y\", \"%d-%m-%y\"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return raw  # fallback


def _make_id(title: str, date_iso: str) -> str:
    h = hashlib.sha1(f\"{title}|{date_iso}\".encode(\"utf-8\")).hexdigest()
    return h[:16]


def scrape_press_notes() -> List[Dict]:
    \"\"\"Scrape the latest press notes from the OU exams press page (page 1 only).\"\"\"
    try:
        resp = requests.get(PRESS_URL, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as exc:
        logger.error(\"Scraper HTTP error: %s\", exc)
        raise

    soup = BeautifulSoup(resp.text, \"lxml\")
    grid = soup.find(\"table\", id=re.compile(r\"GridView1$\"))
    if grid is None:
        # Fallback — find first table containing dd-mm-yyyy cells
        for tbl in soup.find_all(\"table\"):
            if tbl.find(\"a\") and tbl.find(\"td\", string=re.compile(r\"\d{2}-\d{2}-\d{4}\")):
                grid = tbl
                break
    if grid is None:
        logger.warning(\"No press notes table found on page.\")
        return []

    rows = grid.find_all(\"tr\")
    notes: List[Dict] = []
    for row in rows:
        cols = row.find_all(\"td\")
        if len(cols) < 2:
            continue
        link = cols[0].find(\"a\")
        date_text = cols[1].get_text(strip=True)
        if not link or not re.match(r\"\d{2}-\d{2}-\d{4}\", date_text):
            continue
        title = link.get_text(strip=True)
        href = link.get(\"href\", \"\")
        # ASP.NET javascript links — we record the postback target as a marker.
        # For users to download, they need to click on the actual OU site link.
        source_link = urljoin(BASE_URL, \"press\") if href.startswith(\"javascript:\") else urljoin(BASE_URL, href)
        date_iso = _parse_date(date_text)
        note = {
            \"id\": _make_id(title, date_iso),
            \"title\": title,
            \"date\": date_iso,
            \"date_raw\": date_text,
            \"source_url\": source_link,
            \"courses\": detect_courses(title),
            \"category\": detect_category(title),
            \"scraped_at\": datetime.now(timezone.utc).isoformat(),
        }
        notes.append(note)
    return notes


if __name__ == \"__main__\":
    items = scrape_press_notes()
    print(f\"Found {len(items)} notes\")
    for n in items[:5]:
        print(n)
"
