"""API קטן לקריאה בלבד: https://server.yamshopping.com

    GET /health                      מצב השרת
    GET /chains                      הרשתות, כמה סניפים ומתי עודכנו
    GET /cities?q=בני                ערים שיש בהן סניפים (להשלמה אוטומטית)
    GET /stores?city=&chain=&q=&lat=&lng=&limit=
    GET /prices?store=&items=        מחירים בסניף אחד
    GET /compare?items=&city=        השוואת רשימה בין כל הסניפים בעיר (או stores=..., או lat=&lng= לקרובים)
    GET /products?q=חלב תנובה        המוצרים שמתאימים לטקסט, לבחירת מוצר מדויק לפני ההשוואה
    GET /deals?stores=k1,k2&per=12   המבצעים הפעילים בסניפים (לכל הלקוחות, לא רק מועדון), הכי משתלמים קודם
    GET /history?code=7290004131074  איך המחיר של מוצר השתנה בימים האחרונים (הכי זול וחציון בכל יום), לגרף מחיר
    GET /mechir/...                  דפי מחיר פתוחים לגוגל (HTML, ב-seo.py)

items: מוצרים מופרדים ב-| (או בשורה חדשה). כמות: "חלב*2". ברקוד: מספר של 7 ספרות ומעלה.
מוצר שנבחר מדויק: "חלב תנובה#7290004131074" — משווים רק את הברקוד, והשם שלפני ה-# הוא מה שמוצג.
CORS רק ל-yamshopping.com, הגבלת קצב לכל כתובת IP (פנייה ישירה לשרת, לא דרך האתר, מוגבלת יותר וגם ביום),
חסימת כתובות מהבק אופיס, וניטור העתקה (watch.py). תשובות נשמרות בדפדפן 5 דקות.
"""
import datetime as dt
import math
import os
import re
import threading
import time
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import chains as C
from . import db, receipts, seo, watch, xmlparse

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.environ.get("DATA_DIR", "/var/lib/yamshopping"), "prices.db"))
ORIGINS = os.environ.get("ALLOWED_ORIGINS_REGEX", r"^https://(www\.)?yamshopping\.com$")
RATE = int(os.environ.get("RATE_PER_MIN", "120"))
SEO_RATE = int(os.environ.get("SEO_RATE_PER_MIN", "120"))  # דפי המחיר לגוגל (seo.py): מוגשים מהזיכרון, אז מכסה נפרדת
MAX_ITEMS, MAX_STORES = 60, 60

app = FastAPI(title="Yam Shopping prices", docs_url=None, redoc_url=None, openapi_url=None)

# ---------- הגבלת קצב וניטור העתקה ----------
# האתר פונה דרך Vercel (www.yamshopping.com/api/prices), ולכן מבחינת Caddy כל המשתמשים מגיעים מכמה כתובות של Vercel.
# הכתובת האמיתית של המשתמש מגיעה מ-Vercel בכותרת, ולפיה סופרים. מי שפונה ישירות לשרת (סקריפט, לא האתר) מוגבל יותר,
# וכל בקשה נרשמת לניטור (watch.py) כדי לראות בבק אופיס מי מעתיק.
DIRECT_RATE = int(os.environ.get("DIRECT_RATE_PER_MIN", "30"))     # פנייה ישירה לשרת, לא דרך האתר
DIRECT_DAY = int(os.environ.get("DIRECT_PER_DAY", "1500"))         # ...ועד כמה ביום לכל כתובת
SITE_DAY = int(os.environ.get("SITE_PER_DAY", "5000"))             # גם דרך האתר: אדם אמיתי לא מגיע לזה ביום
PEER_RATE = int(os.environ.get("PEER_RATE_PER_MIN", "1500"))       # תקרה לכל חיבור (גם אם מישהו מזייף כותרות של Vercel)
# האתר עבר מ-Vercel ל-Caddy באותו שרת, אז כותרות x-vercel-* מגיעות רק ממי שמזייף אותן (כדי לקבל "כתובת" חדשה בכל בקשה
# ולעקוף את המכסה ואת ניטור ההעתקה). סומכים עליהן רק אם מחזירים את האתר ל-Vercel: TRUST_VERCEL=1 בקובץ ההגדרות.
TRUST_VERCEL = os.environ.get("TRUST_VERCEL", "0") == "1"
WATCH_DB = os.environ.get("WATCH_DB", os.path.join(os.path.dirname(DB_PATH), "watch.db"))
BLOCKED = os.environ.get("BLOCKED_FILE", os.path.join(os.path.dirname(DB_PATH), "blocked.json"))
# 🛡️ פנייה ישירה ל-server.yamshopping.com: האתר עצמו לא עושה את זה אף פעם (הוא פונה ל-www.yamshopping.com/api/prices),
# ולכן מי שמגיע ישירות — נחסם מיד (403), חוץ מהשרת שלנו וכתובות פנימיות, ו-/health לבדיקות זמינות.
# ההבחנה לפי הכתובת שאליה הגיעה הבקשה (X-Forwarded-Host ש-Caddy כותב, אחרת Host), ולא לפי Referer שאפשר לזייף או שנטפרי מוחק.
# DIRECT_MODE=limit מחזיר את ההתנהגות הקודמת (הגבלה של 30 בדקה במקום חסימה).
DIRECT_HOSTS = {h.strip().lower() for h in os.environ.get("DIRECT_HOSTS", "server.yamshopping.com").split(",") if h.strip()}
DIRECT_MODE = os.environ.get("DIRECT_MODE", "block")
# ניסיון פריצה: חיפוש קבצים רגישים או כלי ניהול שאין אצלנו (סורקים אוטומטיים). נחסם, והשומר בשרת חוסם את הכתובת ל-24 שעות
PROBE = re.compile(r"(^|/)(\.env|\.git|\.svn|\.htaccess|\.aws|\.ssh|\.DS_Store|wp-(admin|login|content|includes|config)|xmlrpc\.php|"
                   r"phpmyadmin|pma|adminer|cgi-bin|boaform|actuator|server-status|vendor/phpunit|setup\.php|config\.php|"
                   r"shell|eval-stdin|HNAP1|owa|solr|jenkins|druid|\.well-known/security\.txt\.php)(/|$|\.|\?)|\.\./|%2e%2e|\.php$|\.asp(x)?$|\.jsp$", re.I)
SHIELD_FILE = os.environ.get("SHIELD_FILE", os.path.join(os.path.dirname(DB_PATH), "shield-api.jsonl"))
_shield_seen, _shield_lock = {}, threading.Lock()
_buckets, _daily, _lock = {}, {}, threading.Lock()
WHO_RE = re.compile(r"^[ug]:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
watcher, blocklist = watch.Watch(WATCH_DB), watch.Blocklist(BLOCKED)


def _client_ip(req: Request) -> str:
    """החיבור עצמו: מאחורי Caddy הכתובת בכותרת X-Forwarded-For (ש-Caddy כותב מחדש, כך שאי אפשר לזייף אותה)."""
    ip = req.client.host if req.client else ""
    if ip in ("127.0.0.1", "::1"):
        ip = (req.headers.get("x-forwarded-for") or ip).split(",")[0].strip()
    return ip


def who(req: Request):
    """(הכתובת של המשתמש, החיבור, דרך מה: "vercel" / "site" (Referer או Origin של האתר) / "" = ישירות לשרת)."""
    peer = _client_ip(req)
    h = req.headers
    if TRUST_VERCEL and h.get("x-vercel-id"):
        ip = (h.get("x-vercel-forwarded-for") or h.get("x-real-ip") or peer).split(",")[0].strip()[:64] or peer
        return ip, peer, "vercel"
    return peer, peer, "site" if watch.SITE.match(h.get("origin") or "") or watch.SITE.match(h.get("referer") or "") else ""


def arrival_host(req: Request) -> str:
    """לאיזו כתובת הבקשה הגיעה: Caddy כותב X-Forwarded-Host (אי אפשר לזייף מבחוץ), ובלי Caddy — Host."""
    h = req.headers.get("x-forwarded-host") or req.headers.get("host") or ""
    return h.split(",")[0].strip().lower().rsplit(":", 1)[0] if not h.startswith("[") else h.lower()


def is_own(ip) -> bool:
    return watch.is_internal(ip) or ip in blocklist.own


def shield_note(kind, ip, path, ua=""):
    """רושם אירוע לשומר בשרת (collector/bin/yam-shield קורא את הקובץ, חוסם בחומת האש ומדווח לבק אופיס).
    כל כתובת לכל סוג — פעם בדקה, והקובץ לא גדל מעל 5MB. לעולם לא מפיל בקשה."""
    try:
        t = time.time()
        with _shield_lock:
            if t - _shield_seen.get((kind, ip), 0) < 60:
                return
            if len(_shield_seen) > 20000:
                _shield_seen.clear()
            _shield_seen[(kind, ip)] = t
        if os.path.exists(SHIELD_FILE) and os.path.getsize(SHIELD_FILE) > 5_000_000:
            return
        import json
        with open(SHIELD_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps({"t": int(t), "kind": kind, "ip": ip[:64], "path": path[:120], "ua": ua[:160]}, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _take(key, rate, t):
    tokens, last = _buckets.get(key, (rate, t))
    tokens = min(rate, tokens + (t - last) * rate / 60)
    if tokens < 1:
        return False
    _buckets[key] = (tokens - 1, t)
    return True


def _check(ip, peer, via):
    """None = מותר, אחרת (קוד, הודעה).
    אם Vercel לא שלח את הכתובת של המשתמש (ip == peer), כל המשתמשים נראים כמו כתובת אחת — אז רק התקרה לחיבור."""
    if blocklist.blocked(ip, peer):
        return 403, "הגישה נחסמה"
    t, day = time.monotonic(), watch.today()
    with _lock:
        if len(_buckets) > 50000:
            _buckets.clear()
        if day not in _daily:
            _daily.clear()
            _daily[day] = {}
        site = bool(via)
        if via == "vercel" and ip == peer:
            return None if _take("peer:" + peer, PEER_RATE, t) else (429, "יותר מדי בקשות, נסו שוב בעוד דקה")
        used = _daily[day].get(ip, 0)
        if used >= (SITE_DAY if site else DIRECT_DAY):
            return 429, "הגעתם למכסה היומית. נסו שוב מחר באתר www.yamshopping.com"
        _daily[day][ip] = used + 1
        if peer != ip and not _take("peer:" + peer, PEER_RATE, t):
            return 429, "יותר מדי בקשות, נסו שוב בעוד דקה"
        if not _take(ip, RATE if site else DIRECT_RATE, t):
            return 429, "יותר מדי בקשות, נסו שוב בעוד דקה"
    return None


def _note(req, ip, peer, site, status):
    try:
        q = req.query_params
        items = []
        if "items" in q or req.url.path == "/products":
            items = [re.sub(r"\s*\*\s*\d+(\.\d+)?$", "", x).strip().lower()
                     for x in re.split(r"[|\n]", q.get("items", q.get("q", "")))[:MAX_ITEMS]]
        # האתר שולח מי המשתמש ("u:<חשבון>" או "g:<מזהה אורח>"). לא מאומת — רק רמז שמוצג ככזה בבק אופיס
        hint = req.headers.get("x-yam-who", "")
        hint = hint if WHO_RE.match(hint) else ""
        watcher.note(ip, peer, site, req.headers.get("user-agent", ""), req.url.path, status,
                     store=q.get("store", "")[:40], items=[x for x in items if x], city=norm_city(q.get("city", ""))[:40], who=hint)
    except Exception:  # הניטור לעולם לא מפיל בקשה
        pass


# 🛡️ השרת מחזיר רק נתונים (JSON) — אסור שדפדפן יריץ ממנו קוד, יציג אותו בתוך מסגרת או ישלח הלאה את הכתובת
SEC_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
}


# דפי HTML לגוגל: עיצוב בתוך הדף ותמונות מהאתר, בלי שום סקריפט
SEO_HEADERS = dict(SEC_HEADERS, **{
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
})


@app.middleware("http")
async def limits(req: Request, call_next):
    ip, peer, via = who(req)
    site = bool(via)
    path = req.url.path
    ua = req.headers.get("user-agent", "")
    if not is_own(ip) and not is_own(peer):
        # /receipt: בפרמטר יש קישור של קבלה (גם .php / .aspx של אתר הקבלות) — לא ניסיון פריצה
        if PROBE.search(path) or (path != "/receipt" and PROBE.search(req.url.query or "")):
            shield_note("probe", ip, path + ("?" + req.url.query if req.url.query else ""), ua)
            _note(req, ip, peer, False, 403)
            return JSONResponse({"error": "הגישה נחסמה"}, status_code=403)
        if DIRECT_MODE == "block" and arrival_host(req) in DIRECT_HOSTS and path != "/health":
            shield_note("direct", ip, path, ua)
            _note(req, ip, peer, False, 403)
            return JSONResponse({"error": "הגישה לשרת מותרת רק דרך האתר www.yamshopping.com"}, status_code=403)
    if path == "/mechir" or path.startswith("/mechir/"):
        # דף לגוגל ולמבקרים (בלי Referer של האתר): לא נספר במכסה של ה-API ולא בניטור ההעתקה, רק תקרה לכל כתובת
        if blocklist.blocked(ip, peer):
            return JSONResponse({"error": "הגישה נחסמה"}, status_code=403)
        with _lock:
            ok = _take("seo:" + ip, SEO_RATE, time.monotonic())
        if not ok:
            return JSONResponse({"error": "יותר מדי בקשות, נסו שוב בעוד דקה"}, status_code=429, headers={"Retry-After": "60"})
        res = await call_next(req)
        if res.status_code == 200:
            res.headers["Cache-Control"] = "public, max-age=1800"
        res.headers.update(SEO_HEADERS)
        return res
    bad = _check(ip, peer, via)
    if bad:
        _note(req, ip, peer, site, bad[0])
        return JSONResponse({"error": bad[1]}, status_code=bad[0], headers={"Retry-After": "60"} if bad[0] == 429 else {})
    res = await call_next(req)
    _note(req, ip, peer, site, res.status_code)
    if path.startswith("/receipt"):
        res.headers["Cache-Control"] = "private, no-store"  # קבלה אישית — לא נשמרת בשום מטמון
    elif res.status_code == 200:
        res.headers["Cache-Control"] = "public, max-age=300"
    res.headers.update(SEC_HEADERS)
    return res


# אחרי הגבלת הקצב, כדי שגם תשובת 429 תגיע לדפדפן עם כותרות CORS
app.add_middleware(CORSMiddleware, allow_origin_regex=ORIGINS, allow_methods=["GET"], allow_headers=["X-Yam-Who"], max_age=86400)

app.include_router(seo.router)

_local = threading.local()


def con():
    c = getattr(_local, "con", None)
    if c is None:
        if not os.path.exists(DB_PATH):
            raise HTTPException(503, "המאגר עוד לא נבנה — מחכים לריצה הראשונה של האוסף")
        c = _local.con = db.connect(DB_PATH, readonly=True)
        c.create_function("ncity", 1, norm_city, deterministic=True)
    return c


CITY_ALIAS = {"בב": "בני ברק", "תא": "תל אביב יפו", "תל אביב": "תל אביב יפו", "פתח תקוה": "פתח תקווה"}


def norm_city(s):
    """אותה עיר נכתבת אחרת בכל רשת ("בני-ברק", "בני  ברק", "ב\"ב") — משווים לפי צורה אחידה."""
    s = re.sub(r"[\"'`׳״]", "", s or "")
    s = re.sub(r"[-–_.,()]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^קרית ", "קריית ", s)
    return CITY_ALIAS.get(s, s)


# ---------- עזרים ----------

def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"['’`׳\"]", "", s or "")).strip()


def km(lat1, lng1, lat2, lng2):
    p = math.pi / 180
    a = 0.5 - math.cos((lat2 - lat1) * p) / 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lng2 - lng1) * p)) / 2
    return 12742 * math.asin(math.sqrt(a))


def brand(sub, chain_name):
    """שם תת-הרשת כשהוא אומר משהו ללקוח (שופרסל ← "BE", "דיל"), ו-"" כשהוא ריק, מספר או כללי."""
    sub = re.sub(r"\s+", " ", (sub or "").strip())
    if not sub or sub.isdigit() or norm_city(sub) == norm_city(chain_name) or sub in ("ראשי", "כללי", "רגיל", "סניפים", "חנויות"):
        return ""
    return sub[:30]


# רשתות שיושבות על קבצי המחירים של רשת אחרת, אבל ללקוח הן רשת נפרדת: מציגים אותן בשם שלהן ולא כ"שופרסל · יש חסד".
# הזיהוי לפי שם תת-הרשת בקובץ, ואם הוא ריק — לפי שם הסניף. הסדר חשוב: "יש בשכונה" נבדק לפני "יש חסד".
SPLIT = {
    "SHUFERSAL": [("יש בשכונה", ["יש בשכונה"]), ("יש חסד", ["יש חסד"])],
    "NETIV_HASED": [("ברכל טוב", ["ברכל", "בר כל"]), ("שירה מרקט", ["שירה מרקט"])],
    # לפי הרשימה של משרד הכלכלה: רמי לוי כולל סופר קופיקס וקוויק, וקרפור כולל קוויק וביתן אונליין
    "RAMI_LEVY": [("סופר קופיקס", ["קופיקס", "cofix"]), ("קוויק", ["קוויק", "quik"])],
    "YAYNO_BITAN_AND_CARREFOUR": [("קוויק", ["קוויק", "quik"]), ("ביתן אונליין", ["ביתן אונליין", "bitan online"])],
}


def split_chain(chain, sub, name=""):
    """השם שמוצג ללקוח כשהסניף שייך לרשת נפרדת (יש חסד / יש בשכונה / ברכל טוב), ואחרת ""."""
    for label, words in SPLIT.get(chain, ()):
        for text in (sub or "", name or ""):
            t = re.sub(r"\s+", " ", text).lower()
            if any(w in t for w in words):
                return label
    return ""


# תת-רשת שזה השם שלה בפני עצמו, בלי להוסיף לפניו את שם הרשת
STANDALONE = {"BE"}


def shown_chain(chain, sub, name=""):
    """כל תת-רשת מוצגת כרשת נפרדת: יש חסד, יש בשכונה, ברכל טוב, BE, "שופרסל דיל", "שופרסל שלי" וכו'.
    תת-רשת בלי שם הרשת בתוכה ("דיל") מקבלת את שם הרשת לפניה; כשאין תת-רשת שאומרת משהו — שם הרשת."""
    base = C.hebrew(chain)
    own = split_chain(chain, sub, name)
    if own:
        return own
    b = brand(sub, base)
    if not b:
        return base
    if norm(base) in norm(b) or b.upper() in STANDALONE:
        return b[:40]
    return f"{base} {b}"[:40]


def store_json(r, lat=None, lng=None):
    d = {"store": r["key"], "chain": r["chain"], "chain_name": C.hebrew(r["chain"]), "name": r["name"],
         "address": r["address"], "city": r["city"], "lat": r["lat"], "lng": r["lng"]}
    if "online" in r.keys() and r["online"]:
        d["online"] = True
    d["chain_name"] = shown_chain(r["chain"], r["sub_chain"], r["name"])
    if lat is not None and r["lat"] is not None:
        d["km"] = round(km(lat, lng, r["lat"], r["lng"]), 1)
    return d


def parse_items(raw):
    out = []
    for part in re.split(r"[|\n]", raw or ""):
        part = part.strip()
        if not part:
            continue
        qty = 1
        m = re.match(r"^(.*?)\s*\*\s*(\d+(?:\.\d+)?)$", part)
        if m:
            part, qty = m.group(1).strip(), max(1, min(99, float(m.group(2))))
        code = ""
        m = re.match(r"^(.*?)\s*#\s*(\d{7,14})$", part)  # מוצר שנבחר מדויק: "חלב תנובה#7290004131074"
        if m:
            part, code = m.group(1).strip() or m.group(2), m.group(2).lstrip("0")
        if part:
            out.append({"q": part[:80], "qty": qty, "code": code} if code else {"q": part[:80], "qty": qty})
    if len(out) > MAX_ITEMS:
        raise HTTPException(400, f"עד {MAX_ITEMS} מוצרים בבקשה")
    return out


# בקשה חופשית ← איך המוצר נקרא בקבצי הרשתות. "סיגריות" לא מופיע בשם של "מרלבורו גולד 20",
# ו"מסכת פנים" נכתב בקבצים "מסכות פנים" / "מסיכה". המפתח מנורמל (בלי גרשיים ורווחים כפולים)
SYNONYMS = {
    "סיגריות": ["סיגריות", "מרלבורו", "ווינסטון", "קאמל", "פרלמנט", "קנט", "נובלס", "טבק"],
    "סיגריה": ["סיגריות", "מרלבורו", "ווינסטון", "קאמל", "פרלמנט", "קנט", "נובלס", "טבק"],
    "סגריות": ["סיגריות", "מרלבורו", "ווינסטון", "קאמל", "פרלמנט", "קנט", "נובלס", "טבק"],
    "טבק": ["טבק", "טבק לגלגול", "ניירות גלגול", "פילטרים לגלגול"],
    "מסכת פנים": ["מסכות פנים", "מסכה רפואית", "מסיכה", "מסכה לפנים", "מסכות כירורגיות", "מסכת פנים"],
    "מסכה": ["מסכות פנים", "מסכה רפואית", "מסיכה", "מסכה"],
    "מסיכה": ["מסכות פנים", "מסכה רפואית", "מסיכה", "מסכה"],
    "מסכות": ["מסכות פנים", "מסכה רפואית", "מסיכה", "מסכות"],
    "טישו": ["טישו", "ממחטות", "ממחטות נייר"],
    "חד פעמי": ["חד פעמי", "צלחות חד", "כוסות חד", "סכום חד"],
    "כלים חד פעמיים": ["צלחות חד", "כוסות חד", "סכום חד", "חד פעמי"],
    "סוללות": ["סוללות", "סוללה", "בטריות", "דורסל", "אנרגייזר"],
    "בטריות": ["סוללות", "סוללה", "בטריות", "דורסל"],
    "חיתולים": ["חיתולים", "האגיס", "פמפרס", "טיטולים"],
    "טיטולים": ["חיתולים", "האגיס", "פמפרס", "טיטולים"],
    "קולה": ["קוקה קולה", "קולה", "פפסי"],
    "גז": ["גז לבישול", "מיכל גז", "בלון גז"],
    "מצית": ["מצית", "מציתים"],
    "גפרורים": ["גפרורים", "גפרור"],
    "שקיות": ["שקיות", "שקית"],
    "אלכוגל": ["אלכוג", "גל לחיטוי", "חיטוי ידיים"],
}


def _stems(t):
    """צורות של מילה בעברית לחיפוש רחב: רבים/יחיד (מסכות ← מסכ), סמיכות (מסכת ← מסכה), כתיב מלא/חסר (מסיכה ← מסכה)."""
    out = [t]
    if not re.fullmatch(r"[א-ת]+", t) or len(t) < 3:
        return out
    if len(t) >= 5 and t[-2:] in ("ות", "ים"):
        out.append(t[:-2])
    if len(t) >= 4 and t[-1] in "תה":
        out.append(t[:-1])
    if len(t) >= 4 and t[1] in "יו":
        out.append(t[0] + t[2:])
    return list(dict.fromkeys(x for x in out if len(x) >= 3))


def _fts(c, match):
    return c.execute("""select i.code, i.name, bm25(items_fts) r, coalesce(pp.stores, 0) pop
                        from items_fts join items i on i.id = items_fts.rowid left join item_pop pp on pp.code = i.code
                        where items_fts match ? order by r limit 400""", (match,)).fetchall()


def _ranked(rows, first, bonus=0.0):
    best = {}
    for r in rows:
        name = norm(r["name"])
        score = -r["r"] + (2.5 if name.startswith(first) else 0) + math.log1p(r["pop"]) - len(name) / 60 + bonus
        if score > best.get(r["code"], (-1e9,))[0]:
            best[r["code"]] = (score, name)
    return best


def _toks(q):
    return [t for t in re.findall(r"\w+", norm(q)) if len(t) >= 2 or t.isdigit()][:6]


def candidates(c, q, k=8, stores=None):
    """הברקודים שהכי מתאימים לטקסט — לפי התאמה לשם ולפי כמה סניפים מוכרים את המוצר.
    stores: רק מוצרים שיש להם מחיר באחד מהסניפים האלה (אחרת בעיר שהרשתות שלה מוכרות מוצרים אחרים לא נמצא כלום).
    כשהשם המדויק לא מוצא מספיק — מחפשים גם במילים נרדפות (סיגריות ← מרלבורו) ובצורות אחרות של המילה (מסכת ← מסכות)."""
    digits = re.sub(r"\D", "", q)
    if len(digits) >= 7 and len(digits) >= len(q.replace(" ", "")) - 1:
        return [digits.lstrip("0")]
    toks = _toks(q)
    if not toks:
        return []
    q_ = lambda ts: " AND ".join('"' + t.replace('"', "") + '"*' for t in ts)
    best = _ranked(_fts(c, q_(toks)), toks[0])
    if len(best) < k:
        key = " ".join(toks)
        alts = SYNONYMS.get(key) or []
        for n, alt in enumerate(alts):
            at = _toks(alt)
            if at and at != toks:
                for code, v in _ranked(_fts(c, q_(at)), at[0], bonus=-0.5 - n * 0.1).items():
                    if v[0] > best.get(code, (-1e9,))[0]:
                        best[code] = v
        if len(best) < k:  # צורות אחרות של כל מילה: ("מסכת"* OR "מסכ"*) AND ("פנים"* OR "פני"*)
            groups = ["(" + " OR ".join('"' + s.replace('"', "") + '"*' for s in _stems(t)) + ")" for t in toks]
            for code, v in _ranked(_fts(c, " AND ".join(groups)), toks[0], bonus=-1.5).items():
                best.setdefault(code, v)
    ranked = [code for code, _ in sorted(best.items(), key=lambda kv: -kv[1][0])]
    if stores:
        sold = set()
        for i in range(0, len(ranked), 200):
            part = ranked[i:i + 200]
            sold.update(r[0] for r in c.execute(
                f"""select distinct i.code from items i join prices p on p.item = i.id
                    where i.code in ({','.join('?' * len(part))}) and p.store in ({','.join('?' * len(stores))})""",
                (*part, *stores)))
        ranked = [code for code in ranked if code in sold]
    return ranked[:k]


def active_promos(c, stores, codes):
    if not stores or not codes:
        return {}
    t = time.strftime("%Y-%m-%d %H:%M:%S")
    qs, qc = ",".join("?" * len(stores)), ",".join("?" * len(codes))
    rows = c.execute(f"""select pi.store, pi.code, pr.description, pr.min_qty, pr.discounted_price, pr.ends
                         from promo_items pi join promos pr on pr.store = pi.store and pr.promo_id = pi.promo_id
                         where pi.store in ({qs}) and pi.code in ({qc}) and pr.public = 1
                           and (pr.starts = '' or pr.starts <= ?) and (pr.ends = '' or pr.ends >= ?)""",
                     (*stores, *codes, t, t)).fetchall()
    out = {}
    for r in rows:
        if xmlparse.payment_only(r["description"]):  # רק בסיבוס / בכרטיס מסוים — לא המחיר שכולם משלמים
            continue
        out.setdefault((r["store"], r["code"]), dict(r))
    return out


def cost(price, qty, promo):
    """כמה משלמים על qty יחידות, עם המבצע אם הוא חל."""
    regular = round(price * qty, 2)
    if not promo or not promo.get("discounted_price"):
        return regular, regular, None
    n, dp = max(1, int(round(promo.get("min_qty") or 1))), promo["discounted_price"]
    if n > 1 and dp < price * n:  # "3 ב-20"
        sets = int(qty // n)
        total = sets * dp + (qty - sets * n) * price
    elif dp < price:  # מחיר מבצע ליחידה
        n, total = 1, dp * qty
    else:
        return regular, regular, None
    deal = {"text": promo["description"], "min_qty": n, "price": dp, "until": (promo.get("ends") or "")[:10]}
    return round(min(total, regular), 2), regular, deal


def excluded(exclude):
    """רשתות שהמנהל הסתיר בבק אופיס (האתר שולח אותן ב-exclude=A,B)."""
    return {x.strip() for x in (exclude or "").split(",") if x.strip()}


def online_stores(c, chain="", skip=()):
    """אתר ההזמנות של כל רשת (שופרסל ONLINE...) — משלוח לכל הארץ, אז נכנס להשוואה בכל עיר. אחד לכל רשת: זה עם הכי הרבה מחירים."""
    try:
        rows = c.execute("""select s.*, (select count(*) from prices p where p.store = s.id) n from stores s
                            where s.online = 1""" + (" and s.chain = ?" if chain else ""), (chain,) if chain else ()).fetchall()
    except Exception:  # מסד נתונים שעוד לא עודכן (אין עמודת online)
        return []
    best = {}
    for r in rows:
        if r["n"] and r["chain"] not in skip and r["n"] > best.get(r["chain"], (None, 0))[1]:
            best[r["chain"]] = (r, r["n"])
    return [r for r, _ in best.values()]


def pick_stores(c, stores="", city="", chain="", lat=None, lng=None, limit=30, exclude="", online=True):
    limit = max(1, min(MAX_STORES, limit))
    if stores:
        keys = [s for s in stores.split(",") if s][:MAX_STORES]
        rows = c.execute(f"select * from stores where key in ({','.join('?' * len(keys))})", keys).fetchall()
    elif city:
        q = "select * from stores where ncity(city) = ?" + (" and chain = ?" if chain else "")
        rows = c.execute(q, (norm_city(city), chain) if chain else (norm_city(city),)).fetchall()
    elif lat is not None and lng is not None:
        d = 0.45  # בערך 50 ק"מ
        rows = c.execute("select * from stores where lat between ? and ? and lng between ? and ?" + (" and chain = ?" if chain else ""),
                         (lat - d, lat + d, lng - d, lng + d, *([chain] if chain else []))).fetchall()
    else:
        raise HTTPException(400, "צריך לבחור עיר, סניפים או מיקום")
    skip = excluded(exclude)
    rows = [r for r in rows if r["chain"] not in skip]
    if not stores:  # סניפים בלי אף מחיר (בית מרקחת, סניף שהקבצים שלו עוד לא ירדו) לא תופסים מקום ברשימה
        has = with_prices(c, [r["id"] for r in rows])
        if has:
            rows = [r for r in rows if r["id"] in has]
    if lat is not None and lng is not None:
        rows = sorted(rows, key=lambda r: km(lat, lng, r["lat"], r["lng"]) if r["lat"] is not None else 1e9)
    rows = rows[:limit]
    if online and not stores:  # ההזמנה מהאתר של הרשת — גם כשאין לה סניף בעיר
        have = {r["id"] for r in rows}
        extra = [r for r in online_stores(c, chain, skip) if r["id"] not in have]
        rows = rows[:max(1, limit - len(extra))] + extra
    return rows


def with_prices(c, ids):
    out = set()
    for i in range(0, len(ids), 500):
        part = ids[i:i + 500]
        out.update(r[0] for r in c.execute(
            f"select id from stores s where id in ({','.join('?' * len(part))}) and exists (select 1 from prices p where p.store = s.id)", part))
    return out


# ---------- נקודות הקצה ----------

@app.get("/health")
def health():
    c = con()
    st = c.execute("select max(last_ok) t, count(*) n from chain_status where last_ok is not null").fetchone()
    return {"ok": True, "stores": c.execute("select count(*) from stores").fetchone()[0],
            "chains": st["n"], "updated": st["t"]}


@app.get("/chains")
def chains_list():
    c = con()
    rows = c.execute("""select s.chain, count(*) stores, cs.last_ok, cs.items, cs.error from stores s
                        left join chain_status cs on cs.chain = s.chain group by s.chain order by stores desc""").fetchall()
    return [{"chain": r["chain"], "name": C.hebrew(r["chain"]), "stores": r["stores"], "items": r["items"] or 0,
             "updated": r["last_ok"], "ok": not r["error"]} for r in rows]


@app.get("/cities")
def cities(q: str = Query("", max_length=40)):
    c = con()
    rows = c.execute("""select min(city) city, count(*) n, avg(lat) lat, avg(lng) lng from stores
                        where city <> '' and ncity(city) like ? group by ncity(city) order by n desc limit 40""", (norm_city(q) + "%",)).fetchall()
    return [{"city": r["city"], "stores": r["n"], "lat": r["lat"], "lng": r["lng"]} for r in rows]


@app.get("/stores")
def stores(city: str = Query("", max_length=40), chain: str = Query("", max_length=40), q: str = Query("", max_length=60),
           lat: float = Query(None, ge=29, le=34), lng: float = Query(None, ge=34, le=36.5), limit: int = Query(50, ge=1, le=200),
           exclude: str = Query("", max_length=1000)):
    c = con()
    where, args = [], []
    if city:
        where.append("ncity(city) = ?")
        args.append(norm_city(city))
    if chain:
        where.append("chain = ?")
        args.append(chain)
    for w in q.split()[:5]:  # "רמי לוי בני ברק": כל מילה צריכה להופיע בשם הרשת, בשם הסניף, בכתובת או בעיר
        codes = [k for k, v in C.HEBREW.items() if w in v or w.upper() in k]
        part = "name like ? or address like ? or city like ? or sub_chain like ? or ncity(city) = ?"
        args += [f"%{w}%"] * 4 + [norm_city(w)]
        if codes:
            part += f" or chain in ({','.join('?' * len(codes))})"
            args += codes
        for ch, splits in SPLIT.items():  # "ברכל טוב" בקובץ נקרא "ברכל"
            for label, words in splits:
                if w in label:
                    for x in words:
                        part += " or (chain = ? and (sub_chain like ? or name like ?))"
                        args += [ch, f"%{x}%", f"%{x}%"]
        where.append("(" + part + ")")
    if lat is not None and lng is not None and not city:
        where.append("lat between ? and ? and lng between ? and ?")
        args += [lat - 0.45, lat + 0.45, lng - 0.45, lng + 0.45]
    if not where:
        raise HTTPException(400, "צריך עיר, רשת, חיפוש או מיקום")
    skip = excluded(exclude)
    rows = [r for r in c.execute("select * from stores where " + " and ".join(where) + " limit 2000", args).fetchall() if r["chain"] not in skip]
    if lat is not None and lng is not None:
        rows = sorted(rows, key=lambda r: km(lat, lng, r["lat"], r["lng"]) if r["lat"] is not None else 1e9)
    return [store_json(r, lat, lng) for r in rows[:limit]]


@app.get("/prices")
def prices(store: str = Query(..., max_length=40), items: str = Query(..., max_length=4000)):
    c = con()
    s = c.execute("select * from stores where key = ?", (store,)).fetchone()
    if not s:
        raise HTTPException(404, "הסניף לא נמצא")
    out = []
    for it in parse_items(items):
        codes = [it["code"]] if it.get("code") else candidates(c, it["q"], k=12, stores=[s["id"]])
        rows = []
        if codes:
            rows = c.execute(f"""select i.code, i.name, p.price, p.unit_price, p.updated_at from prices p join items i on i.id = p.item
                                 where p.store = ? and i.code in ({','.join('?' * len(codes))})""", (s["id"], *codes)).fetchall()
        rank = {code: n for n, code in enumerate(codes)}
        rows = sorted(rows, key=lambda r: rank.get(r["code"], 99))[:5]
        promos = active_promos(c, [s["id"]], [r["code"] for r in rows])
        found = []
        for r in rows:
            total, regular, deal = cost(r["price"], it["qty"], promos.get((s["id"], r["code"])))
            found.append({"code": r["code"], "name": r["name"], "price": r["price"], "unit_price": r["unit_price"],
                          "cost": total, "regular": regular, "deal": deal, "updated": r["updated_at"]})
        out.append({"q": it["q"], "qty": it["qty"], "matches": found})
    return {"store": store_json(s), "items": out}


@app.get("/compare")
def compare(items: str = Query(..., max_length=4000), city: str = Query("", max_length=40), stores: str = Query("", max_length=2400),
            chain: str = Query("", max_length=40), lat: float = Query(None, ge=29, le=34), lng: float = Query(None, ge=34, le=36.5),
            limit: int = Query(30, ge=1, le=MAX_STORES), exclude: str = Query("", max_length=1000), online: int = Query(1, ge=0, le=1)):
    c = con()
    wanted = parse_items(items)
    if not wanted:
        raise HTTPException(400, "אין מוצרים להשוואה")
    srows = pick_stores(c, stores, city, chain, lat, lng, limit, exclude, online=bool(online))
    sid = [r["id"] for r in srows]
    if not sid:
        return {"items": wanted, "stores": [], "missing": [w["q"] for w in wanted]}
    per_item = []
    all_codes = set()
    for w in wanted:
        codes = [w["code"]] if w.get("code") else candidates(c, w["q"], stores=sid)  # מוצר שנבחר מדויק — רק הוא, בכל הסניפים
        per_item.append(codes)
        all_codes.update(codes)
    have = {}
    if all_codes:
        qc, qs = ",".join("?" * len(all_codes)), ",".join("?" * len(sid))
        for r in c.execute(f"""select p.store, i.code, i.name, p.price from items i join prices p on p.item = i.id
                               where i.code in ({qc}) and p.store in ({qs})""", (*all_codes, *sid)):
            have.setdefault(r["store"], {})[r["code"]] = (r["name"], r["price"])
    chosen = {}
    for s in sid:
        for n, codes in enumerate(per_item):
            for code in codes:  # אותו מוצר בכל הסניפים כשאפשר — ואם אין, ההתאמה הבאה
                if code in have.get(s, {}):
                    chosen[(s, n)] = code
                    break
    promos = active_promos(c, sid, list({v for v in chosen.values()}))
    result = []
    for r in srows:
        lines, total, regular = [], 0.0, 0.0
        for n, w in enumerate(wanted):
            code = chosen.get((r["id"], n))
            if not code:
                lines.append({"q": w["q"], "qty": w["qty"], "found": False})
                continue
            name, price = have[r["id"]][code]
            t, reg, deal = cost(price, w["qty"], promos.get((r["id"], code)))
            total, regular = total + t, regular + reg
            lines.append({"q": w["q"], "qty": w["qty"], "found": True, "code": code, "name": name, "price": price,
                          "cost": t, "regular": reg, "deal": deal})
        d = store_json(r, lat, lng)
        d.update(total=round(total, 2), regular=round(regular, 2), found=sum(1 for x in lines if x["found"]), lines=lines)
        result.append(d)
    result.sort(key=lambda x: (-x["found"], x["total"]))
    missing = [w["q"] for n, w in enumerate(wanted) if not any((s, n) in chosen for s in sid)]
    return {"items": wanted, "stores": result, "missing": missing}


MAX_DEAL_STORES, MAX_PER_STORE = 8, 25


def store_deals(c, sid, per):
    """המבצעים הפעילים בסניף אחד: מוצר אחד לדוגמה לכל מבצע (זה שחוסכים בו הכי הרבה), הכי משתלמים קודם."""
    t = time.strftime("%Y-%m-%d %H:%M:%S")
    rows = c.execute("""select pr.promo_id, pr.description, pr.min_qty, pr.discounted_price, pr.ends,
                               i.code, i.name, p.price
                        from promos pr
                        join promo_items pi on pi.store = pr.store and pi.promo_id = pr.promo_id
                        join items i on i.code = pi.code and i.chain = (select chain from stores where id = pr.store)
                        join prices p on p.store = pr.store and p.item = i.id
                        where pr.store = ? and pr.public = 1
                          and (pr.starts = '' or pr.starts <= ?) and (pr.ends = '' or pr.ends >= ?)
                        limit 20000""", (sid, t, t)).fetchall()
    best, count = {}, {}
    for r in rows:
        if xmlparse.payment_only(r["description"]) or not r["price"]:
            continue
        count[r["promo_id"]] = count.get(r["promo_id"], 0) + 1
        n = max(1, int(round(r["min_qty"] or 1)))
        total, regular, deal = cost(r["price"], n, dict(r))
        if not deal:
            continue
        save = round(regular - total, 2)
        old = best.get(r["promo_id"])
        if old is None or save > old["save"]:
            best[r["promo_id"]] = {"code": r["code"], "name": r["name"], "price": r["price"], "qty": deal["min_qty"],
                                   "deal_price": deal["price"], "regular": regular, "save": save,
                                   "pct": round(100 * save / regular) if regular else 0,
                                   "text": deal["text"], "until": deal["until"]}
    out = []
    for pid, d in best.items():
        if count[pid] > 1500:  # "כל החנות בהנחה" — לא מבצע על מוצר מסוים
            continue
        d["more"] = count[pid] - 1  # עוד כמה מוצרים באותו מבצע
        out.append(d)
    out.sort(key=lambda d: (-d["pct"], -d["save"]))
    return out[:per]


@app.get("/deals")
def deals(stores: str = Query(..., max_length=400), per: int = Query(12, ge=1, le=MAX_PER_STORE),
          exclude: str = Query("", max_length=1000)):
    """המבצעים הפעילים בכמה סניפים (למשל הסניפים הכי קרובים ללקוח). רק מבצעים לכל הלקוחות, עם מחיר רגיל ומחיר מבצע."""
    c = con()
    keys = [s for s in stores.split(",") if s][:MAX_DEAL_STORES]
    if not keys:
        raise HTTPException(400, "צריך לבחור סניפים")
    skip = excluded(exclude)
    rows = c.execute(f"select * from stores where key in ({','.join('?' * len(keys))})", keys).fetchall()
    order = {k: n for n, k in enumerate(keys)}
    rows = sorted((r for r in rows if r["chain"] not in skip), key=lambda r: order.get(r["key"], 99))
    return {"stores": [{"store": store_json(r), "deals": store_deals(c, r["id"], per)} for r in rows]}


@app.get("/products")
def products(q: str = Query(..., min_length=2, max_length=80), limit: int = Query(8, ge=1, le=12),
             exclude: str = Query("", max_length=1000)):
    """המוצרים שמתאימים לטקסט, כדי לבחור מוצר מדויק לפני ההשוואה: "חלב תנובה" ← קרטון 1 ליטר / שקית / בקבוק 2 ליטר.
    לכל מוצר: הברקוד, השם הנפוץ בקבצי הרשתות, היצרן, בכמה סניפים ורשתות הוא נמכר, ומחיר מינימום / חציון / מקסימום."""
    c = con()
    skip = excluded(exclude)
    out = []
    for code in candidates(c, q, k=limit):
        rows = [r for r in c.execute("""select i.chain, i.name, i.manufacturer, p.price from items i join prices p on p.item = i.id
                                        where i.code = ?""", (code,)).fetchall() if r["chain"] not in skip]
        if not rows:
            continue
        names, makers = {}, {}
        for r in rows:
            names[r["name"]] = names.get(r["name"], 0) + 1
            if r["manufacturer"]:
                makers[r["manufacturer"]] = makers.get(r["manufacturer"], 0) + 1
        prices = sorted(r["price"] for r in rows)
        out.append({"code": code, "name": max(names, key=names.get), "manufacturer": max(makers, key=makers.get) if makers else "",
                    "stores": len(rows), "chains": len({r["chain"] for r in rows}),
                    "min": prices[0], "median": prices[len(prices) // 2], "max": prices[-1]})
    return out


HISTORY_SHOW_DAYS = int(os.environ.get("HISTORY_DAYS", "60"))  # כמו HISTORY_DAYS באוסף (נובמבר 2026: 60 במקום 14): היסטוריה ישנה יותר כבר נמחקה


# ---------- 🔗 קבלה דיגיטלית מקישור (receipts.py) ----------
RECEIPT_RATE = int(os.environ.get("RECEIPT_PER_MIN", "6"))     # לכל משתמש: מספיק לכמה קבלות ברצף, לא לשימוש כמעבר לאתרים אחרים
RECEIPT_DAY = int(os.environ.get("RECEIPT_PER_DAY", "60"))
_rc_daily = {}


def _rc_allow(req: Request):
    """רק דרך האתר, ובמכסה של קבלות לכל משתמש (בדקה וביום)"""
    ip, peer, via = who(req)
    if not via and not is_own(ip):
        raise HTTPException(403, "רק דרך האתר")
    t, day = time.monotonic(), watch.today()
    with _lock:
        if day not in _rc_daily:
            _rc_daily.clear()
            _rc_daily[day] = {}
        used = _rc_daily[day].get(ip, 0)
        if used >= RECEIPT_DAY or not _take("rc:" + ip, RECEIPT_RATE, t):
            raise HTTPException(429, "יותר מדי קבלות מקישור — נסו שוב מאוחר יותר")
        _rc_daily[day][ip] = used + 1


@app.get("/receipt")
def receipt(req: Request, u: str = Query(..., min_length=10, max_length=2000)):
    """הקישור של קבלה דיגיטלית ← הקבלה (אושר עד / Pairzon, Weezmo) או התוכן של הדף לקריאה. לא נשמר כלום"""
    _rc_allow(req)
    out, err = receipts.fetch(u)
    if err:
        return JSONResponse({"error": err[1], **(err[2] if len(err) > 2 else {})}, status_code=err[0])
    return out


@app.post("/receipt/parse")
async def receipt_parse(req: Request):
    """האפליקציה הביאה מהטלפון את הנתונים של אתר קבלות מוכר (אושר עד חוסם את השרת) ← הקבלה המסודרת. לא נשמר כלום"""
    _rc_allow(req)
    raw = await req.body()
    if len(raw) > 3_000_000:
        raise HTTPException(413, "הקבלה גדולה מדי")
    try:
        body = __import__("json").loads(raw)
    except ValueError:
        raise HTTPException(400, "נתונים לא תקינים")
    kind = body.get("kind") if isinstance(body, dict) else None
    if kind not in ("pairzon", "weezmo"):
        raise HTTPException(400, "אתר קבלות לא מוכר")
    rc = receipts.to_receipt(kind, body.get("data"))
    if not rc or not rc["items"]:
        return JSONResponse({"error": "לא מצאתי מוצרים בקבלה"}, status_code=422)
    return {"kind": "receipt", "receipt": rc, "host": "pairzon.com" if kind == "pairzon" else "receipts.weezmo.com"}


@app.get("/history")
def history(code: str = Query(..., pattern=r"^\d{5,14}$"), days: int = Query(HISTORY_SHOW_DAYS, ge=2, le=HISTORY_SHOW_DAYS),
            exclude: str = Query("", max_length=1000)):
    """גרף מחיר למוצר אחד ("האם היה זול יותר בשבוע שעבר?"): לכל יום — המחיר הכי זול, החציון והיקר בכל הסניפים, בסוף היום.
    המחיר של סניף ביום מסוים משוחזר מ-price_history (שבה נשמר המחיר הקודם ברגע שהשתנה): השינוי הראשון אחרי סוף היום
    אומר מה היה המחיר אז; אם אין שינוי כזה — המחיר הנוכחי, אבל רק אם הוא כבר היה בתוקף (מוצר שנוסף לסניף אחר כך לא נספר)."""
    c = con()
    skip = excluded(exclude)
    items = [r for r in c.execute("select id, chain, name from items where code = ?", (code,)).fetchall() if r["chain"] not in skip]
    if not items:
        raise HTTPException(404, "המוצר לא נמצא")
    chain_of = {r["id"]: r["chain"] for r in items}
    ids = list(chain_of)
    qi = ",".join("?" * len(ids))
    cur = c.execute(f"select store, item, price, updated_at from prices where item in ({qi})", ids).fetchall()
    tz = ZoneInfo("Asia/Jerusalem")
    today = dt.datetime.now(tz).date()
    ends = []  # סוף כל יום (חצות), והיום — עכשיו
    for n in range(days - 1, -1, -1):
        d = today - dt.timedelta(days=n)
        end = dt.datetime.combine(d + dt.timedelta(days=1), dt.time(), tz).timestamp()
        ends.append((d, min(end, time.time())))
    since = ends[0][1] - 86400
    hist = {}
    for r in c.execute(f"select store, item, price, at from price_history where item in ({qi}) and at > ? order by at", (*ids, since)):
        hist.setdefault((r["store"], r["item"]), []).append((r["at"], r["price"]))
    names = {}
    for r in items:
        names[r["name"]] = names.get(r["name"], 0) + 1
    out = []
    for d, t in ends:
        vals = []
        for r in cur:
            later = next((p for at, p in hist.get((r["store"], r["item"]), ()) if at > t), None)
            if later is not None:
                vals.append((later, chain_of[r["item"]]))
            elif r["updated_at"] <= t:
                vals.append((r["price"], chain_of[r["item"]]))
        if not vals:
            out.append({"day": d.isoformat(), "n": 0})
            continue
        vals.sort()
        ps = [v for v, _ in vals]
        out.append({"day": d.isoformat(), "n": len(ps), "min": ps[0], "median": ps[len(ps) // 2], "max": ps[-1],
                    "min_chain": C.hebrew(vals[0][1])})
    return {"code": code, "name": max(names, key=names.get), "days": out}
