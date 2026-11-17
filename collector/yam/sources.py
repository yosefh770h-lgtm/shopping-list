"""איפה כל רשת מפרסמת את קבצי המחירים שלה, ואיך מורידים אותם — הקוד שלנו, בלי il-supermarket-scraper.

לפי חוק קידום התחרות בענף המזון כל רשת גדולה חייבת לפרסם לציבור, בחינם, קובצי מחירים / מבצעים / סניפים.
הכתובות ושמות המשתמש של הפורטלים מופיעים בדף שקיפות המחירים של משרד הכלכלה (gov.il) והם ציבוריים.

החלק של רשימת הפורטלים ודרך הדיבור איתם מבוסס על הספרייה israeli-prices (רישיון MIT,
Copyright (c) 2026 RxRadar Inc., https://github.com/rxradar/israeli-prices) — הנוסח המלא של הרישיון
בקובץ collector/THIRD_PARTY_LICENSES.md. שונה: כתוב מחדש עם requests, בלי httpx/pydantic, והתאמה לאוסף שלנו.

כל פונקציית list_* מחזירה רשימה של (שם קובץ, כתובת להורדה), החדשים קודם.
"""
from __future__ import annotations

import datetime as dt
import html
import json
import re
import time
from urllib.parse import quote, urlparse

import requests
import urllib3

UA = "Mozilla/5.0 (compatible; price-transparency-collector/1.0)"
TIMEOUT = 60

# סוג הקובץ אצלנו ← התחילית בשם הקובץ לפי התקנות
PREFIX = {"stores": "Stores", "pricefull": "PriceFull", "promofull": "PromoFull", "price": "Price", "promo": "Promo"}


# ---------- שם הקובץ ----------
_NAME_RE = re.compile(r"^([A-Za-z]+)(\d{13})-(.+?)(?:\.(?:gz|xml|zip))*$", re.IGNORECASE)


def kind_of(name: str) -> str:
    n = (name or "").lower()
    for k, p in (("pricefull", "pricefull"), ("promofull", "promofull"), ("stores", "store"),
                 ("price", "price"), ("promo", "promo")):
        if n.startswith(p):
            return k
    return ""


def file_date(name: str):
    """התאריך שבשם הקובץ (YYYYMMDD או YYYYMMDDHHMM), או None."""
    m = _NAME_RE.match(name or "")
    if not m:
        return None
    for seg in m.group(3).split("-"):
        if seg.isdigit() and len(seg) in (8, 12, 14):
            try:
                return dt.datetime.strptime(seg[:8], "%Y%m%d").date()
            except ValueError:
                return None
    return None


def chain_id_of(name: str) -> str:
    m = _NAME_RE.match(name or "")
    return m.group(2) if m else ""


# ---------- HTTP ----------
class Http:
    """requests.Session עם ניסיונות חוזרים. יש פורטלים עם תעודת אבטחה שבורה — אז, ורק לקבצים
    הציבוריים האלה, מנסים שוב בלי בדיקת תעודה."""

    def __init__(self):
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        self.insecure = False

    def req(self, method, url, tries=3, **kw):
        last = None
        for i in range(tries):
            try:
                r = self.s.request(method, url, timeout=TIMEOUT, verify=not self.insecure, **kw)
                if r.status_code >= 500:
                    raise requests.HTTPError(f"HTTP {r.status_code}")
                r.raise_for_status()
                return r
            except requests.exceptions.SSLError as e:
                last = e
                if not self.insecure:
                    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                    self.insecure = True
                    continue
            except requests.HTTPError as e:
                last = e
                if e.response is not None and 400 <= e.response.status_code < 500:
                    break  # 4xx לא ישתנה בניסיון נוסף
            except requests.RequestException as e:
                last = e
            if i < tries - 1:
                time.sleep(2 ** i)
        raise RuntimeError(f"{method} {url}: {last}"[:300])

    def get(self, url, **kw):
        return self.req("GET", url, **kw)

    def post(self, url, **kw):
        return self.req("POST", url, **kw)


def _newest_first(pairs):
    return sorted(pairs, key=lambda p: (file_date(p[0]) or dt.date.min, p[0]), reverse=True)


def _older(names, day):
    """כל הקבצים בעמוד ישנים מ-day — אין טעם לדפדף הלאה (הרשימה מסודרת מהחדש לישן)."""
    ds = [file_date(n) for n in names]
    return bool(ds) and all(d and d < day for d in ds)


# ---------- Cerberus: url.publishedprices.co.il (כניסה עם משתמש ציבורי) ----------
CERBERUS = "https://url.publishedprices.co.il"
_CSRF = re.compile(r'<meta name="csrftoken" content="([^"]+)"')


def list_cerberus(http, spec, kind, day):
    user, password, folder = spec["user"], spec.get("password", ""), spec.get("folder", "/")
    r = http.get(f"{CERBERUS}/login")
    m = _CSRF.search(r.text)
    if not m:
        raise RuntimeError("Cerberus: אין csrftoken בדף הכניסה")
    r = http.post(f"{CERBERUS}/login/user", data={"r": "", "username": user, "password": password,
                                                   "Submit": "Sign in", "csrftoken": m.group(1)})
    if urlparse(r.url).path.startswith("/login") or not _CSRF.search(r.text):
        raise RuntimeError(f"Cerberus: הכניסה עם המשתמש {user} נדחתה")
    csrf = _CSRF.search(r.text).group(1)
    r = http.post(f"{CERBERUS}/file/json/dir", data={"iDisplayLength": 100000, "sSearch": PREFIX[kind],
                                                     "cd": folder, "csrftoken": csrf})
    try:
        rows = r.json().get("aaData", [])
    except ValueError:
        raise RuntimeError("Cerberus: רשימת הקבצים לא חזרה כ-JSON")
    prefix = "" if folder == "/" else folder.strip("/") + "/"
    out = []
    for row in rows:
        name = row.get("fname") or ""
        if row.get("type") != "file" or not name or name.lower().startswith("null"):
            continue
        if spec.get("chain_id") and chain_id_of(name) and chain_id_of(name) != spec["chain_id"]:
            continue  # קובץ של רשת אחרת שנפל לתיקייה
        out.append((name, f"{CERBERUS}/file/d/{prefix}{quote(name)}"))
    return _newest_first(out)


# ---------- Bina: <prefix>.binaprojects.com ----------
_BINA_TYPE = {"stores": "1", "price": "2", "promo": "3", "pricefull": "4", "promofull": "5"}


def list_bina(http, spec, kind, day):
    base = f"https://{spec['prefix']}.binaprojects.com"
    # הפורטל מחזיר את הקבצים של היום בלבד
    r = http.post(f"{base}/MainIO_Hok.aspx", data={"WStore": "", "WDate": "", "WFileType": _BINA_TYPE[kind]})
    try:
        rows = r.json()
    except ValueError:
        raise RuntimeError("Bina: רשימת הקבצים לא חזרה כ-JSON")
    names = [(row.get("FileNm") or "").strip() for row in rows or []]
    return _newest_first([(n, f"{base}/Download/{quote(n)}") for n in names if n])


# ---------- laibcatalog.co.il ----------
LAIB = "https://laibcatalog.co.il"


def list_laib(http, spec, kind, day):
    edi = spec["chain_id"]
    r = http.get(f"{LAIB}/webapi/api/getfiles", params={"edi": edi})
    try:
        rows = r.json()
    except ValueError:
        raise RuntimeError("Laib: רשימת הקבצים לא חזרה כ-JSON")
    rows = sorted(rows or [], key=lambda x: x.get("fileDate") or "", reverse=True)
    return [(n, f"{LAIB}/webapi/{edi}/{quote(n)}") for n in ((x.get("fileName") or "").strip() for x in rows) if n]


# ---------- שופרסל ----------
_SHUF_CAT = {"price": 1, "pricefull": 2, "promo": 3, "promofull": 4, "stores": 5}
_GZ_LINK = re.compile(r'href="(https://[^"]+?\.(?:gz|xml)[^"]*)"', re.IGNORECASE)


def _paged(http, url_for_page, day, link_re=_GZ_LINK, base="", max_pages=400):
    out, seen = [], set()
    for page in range(1, max_pages + 1):
        links = link_re.findall(http.get(url_for_page(page)).text)
        names = []
        for link in links:
            u = html.unescape(link)
            name = u.split("?")[0].rsplit("/", 1)[-1]
            if name in seen:
                continue
            seen.add(name)
            names.append(name)
            out.append((name, base + u))
        if not names or (day and _older(names, day)):
            break
    return out


def list_shufersal(http, spec, kind, day):
    base = "https://prices.shufersal.co.il/FileObject/UpdateCategory"
    return _paged(http, lambda p: f"{base}?catID={_SHUF_CAT[kind]}&storeId=0&page={p}", day)


# ---------- חצי חינם ----------
_HAZI_T = {"price": "1", "pricefull": "1", "promo": "2", "promofull": "2", "stores": "3"}


def list_hazi(http, spec, kind, day):
    return _paged(http, lambda p: f"https://shop.hazi-hinam.co.il/Prices?t={_HAZI_T[kind]}&p={p}", day)


# ---------- סופר פארם ----------
_SP_LINK = re.compile(r'href="(/Download/[^"]+)"')


def list_superpharm(http, spec, kind, day):
    base = "https://prices.super-pharm.co.il"
    return _paged(http, lambda p: f"{base}/?Category-equals={PREFIX[kind]}&page={p}", day,
                  link_re=_SP_LINK, base=base)


# ---------- קרפור ----------
def list_carrefour(http, spec, kind, day):
    base = "https://prices.carrefour.co.il"
    page = http.get(f"{base}/").text
    pm = re.search(r"const path = '(\d{8})'", page)
    fm = re.search(r"const files = (\[.*?\])", page, re.S)
    if not pm or not fm:
        raise RuntimeError("קרפור: רשימת הקבצים לא נמצאה בדף")
    names = [(r.get("name") or "").strip() for r in json.loads(fm.group(1))]
    return _newest_first([(n, f"{base}/{pm.group(1)}/{quote(n)}") for n in names if n])


# ---------- וולט ----------
def list_wolt(http, spec, kind, day):
    base = "https://wm-gateway.wolt.com/isr-prices/public/v1"
    dates = sorted(set(re.findall(r'href="(\d{4}-\d{2}-\d{2})\.html"', http.get(f"{base}/index.html").text)),
                   reverse=True)
    if day:
        dates = [d for d in dates if d == day.isoformat()] or dates[:1]
    out = []
    for d in dates[:2]:
        for rel in re.findall(r'href="(download/[^"]+)"', http.get(f"{base}/{d}.html").text):
            out.append((rel.rsplit("/", 1)[-1], f"{base}/{rel}"))
    return _newest_first(out)


LISTERS = {"cerberus": list_cerberus, "bina": list_bina, "laib": list_laib, "shufersal": list_shufersal,
           "hazi": list_hazi, "superpharm": list_superpharm, "carrefour": list_carrefour, "wolt": list_wolt}


def _c(user, chain_id, password="", folder="/"):
    return {"engine": "cerberus", "user": user, "chain_id": chain_id, "password": password, "folder": folder}


def _b(prefix):
    return {"engine": "bina", "prefix": prefix}


def _l(chain_id):
    return {"engine": "laib", "chain_id": chain_id}


# המפתחות הם אותם שמות שהיו באוסף עד היום (נשמרים בבק אופיס ובמאגר) — לא לשנות אותם.
# הסיסמאות הן הציבוריות שמפורסמות באתר משרד הכלכלה.
SOURCES = {
    "SHUFERSAL": {"engine": "shufersal"},
    "YAYNO_BITAN_AND_CARREFOUR": {"engine": "carrefour"},
    "HAZI_HINAM": {"engine": "hazi"},
    "SUPER_PHARM": {"engine": "superpharm"},
    "WOLT": {"engine": "wolt"},
    "RAMI_LEVY": _c("RamiLevi", "7290058140886"),
    "TIV_TAAM": _c("TivTaam", "7290873255550"),
    "YOHANANOF": _c("yohananof", "7290803800003"),
    "OSHER_AD": _c("osherad", "7290103152017"),
    "DOR_ALON": _c("doralon", "7290492000005"),
    "KESHET": _c("Keshet", "7290785400000"),
    "COFIX": _c("SuperCofixApp", "7291056200008"),
    "POLIZER": _c("politzer", "7291059100008"),
    "STOP_MARKET": _c("Stop_Market", "7290639000004"),
    "FRESH_MARKET_AND_SUPER_DOSH": _c("freshmarket", "7290876100000"),
    "SALACH_DABACH": _c("SalachD", "7290526500006", "12345"),
    "SUPER_YUDA": _c("yuda_ho", "7290058177776", "Yud@147", "/Yuda"),
    "YELLOW": _c("Paz_bo", "7290644700005", "paz468"),
    "GOOD_PHARM": _b("goodpharm"),
    "BAREKET": _b("superbareket"),
    "KING_STORE": _b("kingstore"),
    "MAAYAN_2000": _b("maayan2000"),
    "MESHMAT_YOSEF_1": _b("ktshivuk"),
    "SHEFA_BARCART_ASHEM": _b("shefabirkathashem"),
    "SHUK_AHIR": _b("shuk-hayir"),
    "SUPER_SAPIR": _b("supersapir"),
    "ZOL_VEBEGADOL": _b("zolvebegadol"),
    "CITY_MARKET_KIRYATGAT": _b("citymarketkiryatgat"),
    "VICTORY_NEW_SOURCE": _l("7290696200003"),
    "MAHSANI_ASHUK_NEW_SOURCE": _l("7290661400001"),
    "HET_COHEN_NEW_SOURCE": _l("7290455000004"),
}

# רשתות שהיו באוסף הישן ועוד אין לנו מקור מאומת עבורן — מוצגות בבק אופיס עם הודעה ברורה
MISSING = {"MESHMAT_YOSEF_2", "CITY_MARKET_SHOPS", "NETIV_HASED"}


def list_files(http, chain, kind, day=None):
    """כל הקבצים מסוג kind של הרשת (החדשים קודם), מסוננים לתאריך day כשיש תאריך בשם הקובץ."""
    spec = SOURCES.get(chain)
    if spec is None:
        raise RuntimeError(f"לרשת {chain} עוד אין מקור הורדה באוסף שלנו")
    pairs = LISTERS[spec["engine"]](http, spec, kind, day)
    out = []
    for name, url in pairs:
        if kind_of(name) != kind:
            continue
        d = file_date(name)
        if day and d and d != day:
            continue
        if day and not d and day != dt.date.today():
            continue  # בלי תאריך בשם — מניחים שזה של היום
        out.append((name, url))
    return out


def main(argv=None):
    """בדיקה ידנית בשרת (רק קורא, לא שומר כלום):  python3 -m yam.sources [RAMI_LEVY ...]"""
    import sys
    chains = (argv if argv is not None else sys.argv[1:]) or list(SOURCES)
    http, bad = Http(), 0
    for chain in chains:
        try:
            got = {k: len(list_files(http, chain, k, dt.date.today())) for k in ("stores", "pricefull", "price")}
            print(f"✅ {chain}: " + " · ".join(f"{k} {n}" for k, n in got.items()))
        except Exception as e:  # noqa: BLE001
            bad += 1
            print(f"❌ {chain}: {str(e)[:200]}")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
