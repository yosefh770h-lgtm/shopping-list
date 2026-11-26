"""דפי מחיר פתוחים לגוגל: "כמה עולה חלב בבני ברק, ואיפה הכי זול היום".

הדפים נבנים מהמאגר המקומי (אותם מחירים שהרשתות מפרסמות לפי חוק קידום התחרות בענף המזון) ומוגשים כ-HTML רגיל,
כדי שגוגל יקרא את המחירים בלי להריץ קוד. הכתובת באתר: www.yamshopping.com/api/prices/mechir/... (דרך ה-rewrite הקיים
של /api/prices ב-vercel.json, בלי לשנות את Caddy). robots.txt פותח לגוגל רק את /api/prices/mechir/.

    GET /mechir/                         כל המוצרים והערים
    GET /mechir/<מוצר>                   המחיר בכל הארץ, לפי רשת
    GET /mechir/<מוצר>/<עיר>              המחיר בכל סניף בעיר, הכי זול קודם
    GET /mechir/ir/<עיר>                 סל מוצרים בסיסי בעיר: איפה כל מוצר הכי זול
    GET /mechir/sitemap.xml              מפת אתר לגוגל

מוצגות רק רשתות שהמנהל פתח למשתמשים בבק אופיס (public + hidden), לפי ההגדרה שהאוסף שומר במאגר (meta: visible).
כל דף נשמר בזיכרון חצי שעה, כך שסריקה של גוגל לא מעמיסה על המאגר.
"""
import datetime as dt
import html
import json
import os
import threading
import time
from urllib.parse import quote
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response

from . import chains as C

BASE = os.environ.get("SEO_BASE", "https://www.yamshopping.com/api/prices/mechir").rstrip("/")
SITE = "https://www.yamshopping.com"
TTL = int(os.environ.get("SEO_CACHE_SEC", "1800"))
TOP_CITIES = int(os.environ.get("SEO_CITIES", "40"))
MIN_CITY_STORES = 3
TZ = ZoneInfo("Asia/Jerusalem")

# (כתובת, שם בדף, מה מחפשים בקבצי הרשתות). הסדר הוא הסדר בדפים
PRODUCTS = [
    ("chalav", "חלב 3%", "חלב טרי 3%"),
    ("beitzim", "ביצים", "ביצים"),
    ("lechem", "לחם אחיד", "לחם אחיד"),
    ("chala", "חלה", "חלה"),
    ("cottage", "קוטג'", "קוטג"),
    ("gvina-tzehuba", "גבינה צהובה", "גבינה צהובה"),
    ("gvina-levana", "גבינה לבנה", "גבינה לבנה"),
    ("chemaa", "חמאה", "חמאה"),
    ("yogurt", "יוגורט", "יוגורט"),
    ("shamenet-metuka", "שמנת מתוקה", "שמנת מתוקה"),
    ("shemen-kanola", "שמן קנולה", "שמן קנולה"),
    ("shemen-zayit", "שמן זית", "שמן זית"),
    ("sukar", "סוכר", "סוכר לבן"),
    ("kemach", "קמח", "קמח לבן"),
    ("orez", "אורז", "אורז"),
    ("spageti", "ספגטי", "ספגטי"),
    ("ptitim", "פתיתים", "פתיתים"),
    ("kafe-names", "קפה נמס", "קפה נמס"),
    ("te", "תה", "תה"),
    ("shoko", "שוקו", "שוקו"),
    ("tchina", "טחינה גולמית", "טחינה גולמית"),
    ("tuna", "טונה", "טונה"),
    ("cornflakes", "קורנפלקס", "קורנפלקס"),
    ("bamba", "במבה", "במבה"),
    ("bisli", "ביסלי", "ביסלי"),
    ("dvash", "דבש", "דבש"),
    ("mitz-anavim", "מיץ ענבים", "מיץ ענבים"),
    ("mayim-mineralim", "מים מינרליים", "מים מינרלים"),
    ("coca-cola", "קוקה קולה", "קוקה קולה"),
    ("nerot-shabbat", "נרות שבת", "נרות שבת"),
    ("chitulim", "חיתולים", "חיתולים"),
    ("magavonim", "מגבונים לחים", "מגבונים"),
    ("neyar-toalet", "נייר טואלט", "נייר טואלט"),
    ("nozel-kelim", "נוזל כלים", "נוזל כלים"),
    ("avkat-kvisa", "אבקת כביסה", "אבקת כביסה"),
]
BY_SLUG = {p[0]: p for p in PRODUCTS}

router = APIRouter()
_cache, _cache_lock = {}, threading.Lock()


def _api():
    from . import api  # אחרי שה-API נטען (api.py מייבא את הקובץ הזה)
    return api


def cached(key, ttl, make):
    t = time.monotonic()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and t - hit[0] < ttl:
            return hit[1]
    val = make()
    with _cache_lock:
        if len(_cache) > 4000:
            _cache.clear()
        _cache[key] = (t, val)
    return val


def clear_cache():
    with _cache_lock:
        _cache.clear()


# ---------- נתונים ----------

def visible_chains(c):
    """הרשתות שהמשתמשים רואים, לפי מה שהאוסף שמר מהבק אופיס. בלי הגדרה שמורה — אף רשת (כמו ברירת המחדל באתר)."""
    try:
        row = c.execute("select v from meta where k = 'visible'").fetchone()
        cfg = json.loads(row[0]) if row else {}
    except Exception:
        cfg = {}
    chains = [r[0] for r in c.execute("select distinct chain from stores")]
    return {ch for ch in chains if C.visible(cfg, ch)}


def city_slug(city):
    return _api().norm_city(city).replace(" ", "-")


def slug_city(slug):
    return _api().norm_city((slug or "").replace("-", " "))


def top_cities(c):
    """הערים עם הכי הרבה סניפים (של רשתות גלויות, שיש בהם מחירים)."""
    def make():
        vis = visible_chains(c)
        if not vis:
            return []
        rows = c.execute(f"""select min(city) city, count(*) n from stores s
                             where city <> '' and coalesce(online, 0) = 0 and chain in ({','.join('?' * len(vis))})
                               and exists (select 1 from prices p where p.store = s.id)
                             group by ncity(city) having n >= ? order by n desc limit ?""",
                         (*vis, MIN_CITY_STORES, TOP_CITIES)).fetchall()
        return [(r["city"], r["n"]) for r in rows]
    return cached(("cities",), TTL, make)


def city_stores(c, city):
    vis = visible_chains(c)
    if not vis:
        return []
    rows = c.execute(f"""select * from stores s where ncity(city) = ? and coalesce(online, 0) = 0
                         and chain in ({','.join('?' * len(vis))}) and exists (select 1 from prices p where p.store = s.id)""",
                     (_api().norm_city(city), *vis)).fetchall()
    return rows


def offers(c, codes, sid):
    """לכל ברקוד: המחיר בכל סניף (מהזול ליקר), עם מבצע לכולם אם יש ליחידה אחת."""
    api = _api()
    if not codes or not sid:
        return {}
    out = {}
    for i in range(0, len(sid), 400):
        part = sid[i:i + 400]
        for r in c.execute(f"""select p.store, i.code, i.name, p.price, p.updated_at from items i join prices p on p.item = i.id
                               where i.code in ({','.join('?' * len(codes))}) and p.store in ({','.join('?' * len(part))})""",
                           (*codes, *part)):
            out.setdefault(r["code"], []).append(dict(r))
    promos = api.active_promos(c, sid[:900], list(out)) if len(sid) <= 900 else {}
    for code, rows in out.items():
        for r in rows:
            pay, _, deal = api.cost(r["price"], 1, promos.get((r["store"], code)))
            r["pay"], r["deal"] = pay, deal
        rows.sort(key=lambda r: r["pay"])
    return out


def common_name(rows):
    names = {}
    for r in rows:
        names[r["name"]] = names.get(r["name"], 0) + 1
    return max(names, key=names.get)


def product_in_city(c, slug, city):
    """הנתונים לדף מוצר בעיר: כמה מוצרים מתאימים, ולכל אחד המחיר בכל סניף."""
    api = _api()
    _, _, q = BY_SLUG[slug]
    srows = city_stores(c, city)
    if not srows:
        return None
    sid = [r["id"] for r in srows]
    by_id = {r["id"]: r for r in srows}
    codes = api.candidates(c, q, k=8, stores=sid)
    of = offers(c, codes, sid)
    prods = []
    for n, code in enumerate(codes):
        rows = of.get(code)
        if rows:
            prods.append({"code": code, "name": common_name(rows), "rows": rows, "rank": n})
    if not prods:
        return None
    # המוצר הראשי: זה שנמכר בהכי הרבה סניפים בעיר (ובתיקו — זה שהכי מתאים לחיפוש)
    prods.sort(key=lambda p: (-len({r["store"] for r in p["rows"]}), p["rank"]))
    return {"stores": by_id, "products": prods[:6], "city": srows[0]["city"], "n_stores": len(srows)}


def product_national(c, slug):
    api = _api()
    _, _, q = BY_SLUG[slug]
    vis = visible_chains(c)
    if not vis:
        return None
    srows = c.execute(f"select * from stores where coalesce(online, 0) = 0 and chain in ({','.join('?' * len(vis))})", tuple(vis)).fetchall()
    by_id = {r["id"]: r for r in srows}
    codes = api.candidates(c, q, k=6)
    prods = []
    for n, code in enumerate(codes):
        rows = [dict(r) for r in c.execute("""select p.store, i.name, p.price, p.updated_at from items i join prices p on p.item = i.id
                                               where i.code = ?""", (code,)) if r["store"] in by_id]
        if rows:
            rows.sort(key=lambda r: r["price"])
            prods.append({"code": code, "name": common_name(rows), "rows": rows, "rank": n})
    if not prods:
        return None
    prods.sort(key=lambda p: (-len(p["rows"]), p["rank"]))
    return {"stores": by_id, "products": prods[:5]}


# ---------- HTML ----------

def e(s):
    return html.escape(str(s or ""), quote=True)


def money(x):
    return f"₪{x:,.2f}".replace(".00", "")


def day_of(ts):
    if not ts:
        return ""
    d = dt.datetime.fromtimestamp(ts, TZ)
    return d.strftime("%d.%m.%Y")


def store_label(s):
    api = _api()
    chain = api.shown_chain(s["chain"], s["sub_chain"], s["name"])
    branch = (s["name"] or "").strip()
    return chain, branch if branch and api.norm(branch) != api.norm(chain) else "", (s["address"] or "").strip()


def url(*parts):
    return BASE + "/" + "/".join(quote(p, safe="-") for p in parts if p)


CSS = """
:root{--bg:#f6f3ec;--card:#fffdf7;--text:#23231f;--muted:#5f5f55;--accent:#1e3a5f;--line:#e3ddcf;--good:#1d6b3a;--soft:#eef4ea}
@media (prefers-color-scheme:dark){:root{--bg:#0d1118;--card:#161a22;--text:#e6e6da;--muted:#98a0ad;--accent:#9db8e0;--line:#2a303b;--good:#7fd19b;--soft:#16261c}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:Heebo,Arial,sans-serif;line-height:1.7}
header{background:#1e3a5f;color:#fff;padding:10px 16px}
header a{color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:18px}
header img{border-radius:50%}
main{max-width:760px;margin:20px 16px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 18px}
@media (min-width:800px){main{margin-inline:auto}}
h1{font-size:26px;line-height:1.3;margin:0 0 8px;color:var(--accent)}
h2{font-size:19px;margin:26px 0 8px;color:var(--accent)}
p,li{font-size:16px}
a{color:var(--accent)}
a:focus-visible{outline:3px solid #ffd166;outline-offset:2px}
.crumbs{font-size:14px;color:var(--muted);margin:0 0 10px}
.best{background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:12px 0;font-size:17px}
.best b{color:var(--good)}
.tbl{width:100%;border-collapse:collapse;font-size:15px}
.tbl th,.tbl td{text-align:start;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top}
.tbl th{font-size:13.5px;color:var(--muted);font-weight:600}
.tbl td.p{white-space:nowrap;font-weight:700}
.tbl tr:first-child td.p{color:var(--good)}
.sub{display:block;color:var(--muted);font-size:13.5px}
.deal{display:inline-block;background:#fff3cd;color:#6b4e00;border-radius:6px;padding:0 6px;font-size:13px;margin-top:2px}
.cta{display:block;text-align:center;background:#1e3a5f;color:#fff;text-decoration:none;font-weight:700;font-size:17px;border-radius:12px;padding:12px 16px;margin:18px 0}
.chips{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
.chips a{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:3px 12px;text-decoration:none;font-size:14.5px}
.muted{color:var(--muted);font-size:14px}
.wrap{overflow-x:auto}
footer{text-align:center;padding:4px 16px 32px}
"""

LEGAL = ("המחירים לקוחים מקבצי המחירים שהרשתות מפרסמות לפי חוק קידום התחרות בענף המזון (שקיפות מחירים), "
         "כפי שפורסמו ביום שמופיע ליד כל מחיר. ייתכנו הבדלים בין המחיר כאן למחיר בחנות, והמחיר המחייב הוא המחיר בקופה. "
         "מבצעים מוצגים רק כשהם לכל הלקוחות וליחידה אחת (בלי מועדון ובלי כרטיס אשראי מסוים).")


def page(title, desc, canon, body, crumbs, ld=None):
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList",
          "itemListElement": [{"@type": "ListItem", "position": n + 1, "name": name, "item": href} for n, (name, href) in enumerate(crumbs)]}
    lds = [bc] + ([ld] if ld else [])
    ld_html = "".join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False).replace("</", "<\\/") + "</script>" for x in lds)
    nav = " › ".join(f'<a href="{e(h)}">{e(n)}</a>' for n, h in crumbs[:-1]) + (" › " if len(crumbs) > 1 else "") + e(crumbs[-1][0])
    return f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{e(canon)}">
<meta name="theme-color" content="#1e3a5f">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/icons/app-apple-180.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ים שופינג YamShopping">
<meta property="og:locale" content="he_IL">
<meta property="og:url" content="{e(canon)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{SITE}/icons/og-image-2.jpg">
{ld_html}
<style>{CSS}</style>
</head>
<body>
<header><a href="/"><img src="/logo.png" alt="" width="36" height="36">ים שופינג · השוואת מחירים</a></header>
<main>
<p class="crumbs">{nav}</p>
{body}
<p class="muted">{e(LEGAL)}</p>
</main>
<footer class="muted">© כל הזכויות שמורות ל-YAMSHOPPING2026 · <a href="/terms.html">תנאי שימוש</a> · <a href="/privacy.html">מדיניות פרטיות</a> · <a href="/accessibility.html">הצהרת נגישות</a></footer>
</body>
</html>"""


def html_response(text, status=200):
    return HTMLResponse(text, status_code=status)


def not_found(msg="הדף לא נמצא"):
    body = f'<h1>{e(msg)}</h1><p>אפשר לבחור מוצר ועיר מהרשימה:</p><a class="cta" href="{e(BASE)}/">לכל דפי המחירים</a>'
    return html_response(page(msg + " | ים שופינג", msg, BASE + "/", body, [("ים שופינג", SITE + "/"), (msg, BASE + "/")]), 404)


def chips(items):
    return '<ul class="chips">' + "".join(f'<li><a href="{e(h)}">{e(n)}</a></li>' for n, h in items) + "</ul>"


def offer_ld(name, rows, canon):
    prices = [r.get("pay", r["price"]) for r in rows]
    return {"@context": "https://schema.org", "@type": "Product", "name": name,
            "offers": {"@type": "AggregateOffer", "priceCurrency": "ILS", "lowPrice": f"{min(prices):.2f}",
                       "highPrice": f"{max(prices):.2f}", "offerCount": len(prices), "url": canon}}


def render_city_product(c, slug, city_s):
    _, title, _ = BY_SLUG[slug]
    city = slug_city(city_s)
    d = product_in_city(c, slug, city)
    if not d:
        return None
    city = d["city"]
    canon = url(slug, city_slug(city))
    main, stores = d["products"][0], d["stores"]
    seen, lines = set(), []
    for r in main["rows"]:  # סניף אחד לכל שורה, הכי זול קודם
        if r["store"] in seen:
            continue
        seen.add(r["store"])
        lines.append(r)
    best = lines[0]
    bchain, bbranch, baddr = store_label(stores[best["store"]])
    newest = max(r["updated_at"] for p in d["products"] for r in p["rows"])
    trs = []
    for r in lines[:25]:
        ch, br, ad = store_label(stores[r["store"]])
        deal = f'<span class="deal">מבצע: {e(r["deal"]["text"])}</span>' if r.get("deal") else ""
        trs.append(f'<tr><td>{e(ch)}<span class="sub">{e(" · ".join(x for x in (br, ad) if x))}</span>{deal}</td>'
                   f'<td class="p">{money(r["pay"])}</td><td class="muted">{day_of(r["updated_at"])}</td></tr>')
    others = []
    for p in d["products"][1:]:
        r = p["rows"][0]
        ch, br, _ = store_label(stores[r["store"]])
        others.append(f'<tr><td>{e(p["name"])}</td><td class="p">{money(r["pay"])}</td><td>{e(ch)}<span class="sub">{e(br)}</span></td></tr>')
    other_html = ""
    if others:
        other_html = ('<h2>עוד סוגים של ' + e(title) + ' ב' + e(city) + '</h2><div class="wrap"><table class="tbl"><tr><th>מוצר</th><th>הכי זול</th><th>איפה</th></tr>'
                      + "".join(others) + "</table></div>")
    near = [(f"{title} ב{cn}", url(slug, city_slug(cn))) for cn, _ in top_cities(c) if _api().norm_city(cn) != _api().norm_city(city)][:12]
    more = [(t, url(s, city_slug(city))) for s, t, _ in PRODUCTS if s != slug][:16]
    body = f"""<h1>מחיר {e(title)} ב{e(city)} — איפה הכי זול היום</h1>
<p>השוואה של {len(lines)} סניפים ב{e(city)} שמפרסמים מחירים, לפי המחיר העדכני של כל סניף.</p>
<div class="best">הכי זול כרגע: <b>{money(best["pay"])}</b> ב{e(bchain)}{e(" " + bbranch if bbranch else "")}{e(", " + baddr if baddr else "")}<span class="sub">{e(main["name"])} · ברקוד {e(main["code"])}</span></div>
<h2>{e(main["name"])}: המחיר בכל סניף</h2>
<div class="wrap"><table class="tbl"><tr><th>רשת וסניף</th><th>מחיר</th><th>עודכן</th></tr>{"".join(trs)}</table></div>
{other_html}
<a class="cta" href="/?src=mechir">להשוות את כל רשימת הקניות שלי ב{e(city)}</a>
<h2>{e(title)} בערים אחרות</h2>{chips(near)}
<h2>עוד מחירים ב{e(city)}</h2>{chips(more)}
<p><a href="{e(url("ir", city_slug(city)))}">סל קניות בסיסי ב{e(city)}: איפה כל מוצר הכי זול</a></p>
<p class="muted">עודכן לאחרונה: {day_of(newest)}</p>"""
    desc = (f"כמה עולה {title} ב{city}? הכי זול היום {money(best['pay'])} ב{bchain}. "
            f"השוואת מחיר {title} ב-{len(lines)} סניפים ב{city}, לפי קבצי המחירים של הרשתות.")
    return page(f"מחיר {title} ב{city} – איפה הכי זול היום | ים שופינג", desc, canon, body,
                [("ים שופינג", SITE + "/"), ("מחירים", BASE + "/"), (title, url(slug)), (city, canon)],
                offer_ld(main["name"], lines, canon))


def render_product(c, slug):
    _, title, _ = BY_SLUG[slug]
    d = product_national(c, slug)
    if not d:
        return None
    canon = url(slug)
    main, stores = d["products"][0], d["stores"]
    per_chain = {}
    for r in main["rows"]:
        s = stores[r["store"]]
        ch = _api().shown_chain(s["chain"], s["sub_chain"], s["name"])
        per_chain.setdefault(ch, []).append(r["price"])
    chain_rows = sorted(((ch, min(v), sorted(v)[len(v) // 2], len(v)) for ch, v in per_chain.items()), key=lambda x: x[1])
    trs = "".join(f'<tr><td>{e(ch)}</td><td class="p">{money(lo)}</td><td>{money(med)}</td><td class="muted">{n}</td></tr>'
                  for ch, lo, med, n in chain_rows[:30])
    prices = [r["price"] for r in main["rows"]]
    others = "".join(f'<tr><td>{e(p["name"])}</td><td class="p">{money(p["rows"][0]["price"])}</td><td>{money(p["rows"][len(p["rows"]) // 2]["price"])}</td></tr>'
                     for p in d["products"][1:])
    other_html = ('<h2>עוד סוגים</h2><div class="wrap"><table class="tbl"><tr><th>מוצר</th><th>הכי זול</th><th>מחיר נפוץ</th></tr>' + others + "</table></div>") if others else ""
    cities = [(f"{title} ב{cn}", url(slug, city_slug(cn))) for cn, _ in top_cities(c)]
    newest = max(r["updated_at"] for r in main["rows"])
    body = f"""<h1>מחיר {e(title)} — השוואה בין הרשתות</h1>
<div class="best">{e(main["name"])}: הכי זול <b>{money(prices[0])}</b>, מחיר נפוץ {money(prices[len(prices) // 2])}, ביקר ביותר {money(prices[-1])}<span class="sub">לפי {len(prices)} סניפים · ברקוד {e(main["code"])}</span></div>
<h2>לפי רשת</h2>
<div class="wrap"><table class="tbl"><tr><th>רשת</th><th>הכי זול</th><th>מחיר נפוץ</th><th>סניפים</th></tr>{trs}</table></div>
{other_html}
<h2>איפה הכי זול בעיר שלך?</h2>{chips(cities)}
<a class="cta" href="/?src=mechir">להשוות את כל רשימת הקניות שלי</a>
<p class="muted">עודכן לאחרונה: {day_of(newest)}</p>"""
    desc = f"כמה עולה {title}? {main['name']} מ-{money(prices[0])}. השוואת מחיר {title} בין כל רשתות הסופר, ואיפה הכי זול בכל עיר."
    return page(f"מחיר {title} בסופר – השוואה בין הרשתות | ים שופינג", desc, canon, body,
                [("ים שופינג", SITE + "/"), ("מחירים", BASE + "/"), (title, canon)], offer_ld(main["name"], main["rows"], canon))


def render_city(c, city_s):
    city = slug_city(city_s)
    srows = city_stores(c, city)
    if not srows:
        return None
    city = srows[0]["city"]
    canon = url("ir", city_slug(city))
    trs, total = [], 0.0
    for slug, title, _ in PRODUCTS:
        d = cached(("pc", slug, _api().norm_city(city)), TTL, lambda s=slug: product_in_city(c, s, city))
        if not d:
            continue
        main = d["products"][0]
        r = main["rows"][0]
        ch, br, _ = store_label(d["stores"][r["store"]])
        total += r["pay"]
        trs.append(f'<tr><td><a href="{e(url(slug, city_slug(city)))}">{e(title)}</a><span class="sub">{e(main["name"])}</span></td>'
                   f'<td class="p">{money(r["pay"])}</td><td>{e(ch)}<span class="sub">{e(br)}</span></td></tr>')
    if not trs:
        return None
    body = f"""<h1>מחירים בסופר ב{e(city)} — איפה כל מוצר הכי זול</h1>
<p>{len(srows)} סניפים ב{e(city)} מפרסמים מחירים. לכל מוצר בסל: הסניף שבו הוא הכי זול היום.</p>
<div class="wrap"><table class="tbl"><tr><th>מוצר</th><th>הכי זול</th><th>איפה</th></tr>{"".join(trs)}</table></div>
<p class="muted">כדי לדעת באיזה סניף כל הרשימה שלכם יוצאת הכי זולה (ולא רק כל מוצר לבד), משווים את הרשימה כולה:</p>
<a class="cta" href="/?src=mechir">להשוות את כל רשימת הקניות שלי ב{e(city)}</a>
<h2>ערים נוספות</h2>{chips([(cn, url("ir", city_slug(cn))) for cn, _ in top_cities(c) if _api().norm_city(cn) != _api().norm_city(city)])}"""
    desc = f"מחירים בסופר ב{city}: איפה הכי זול היום חלב, ביצים, לחם ועוד {len(trs)} מוצרים, לפי קבצי המחירים של {len(srows)} סניפים."
    return page(f"מחירים בסופר ב{city} – איפה הכי זול היום | ים שופינג", desc, canon, body,
                [("ים שופינג", SITE + "/"), ("מחירים", BASE + "/"), (city, canon)])


def render_index(c):
    cities = top_cities(c)
    body = f"""<h1>מחירים בסופר — כמה זה עולה ואיפה הכי זול</h1>
<p>המחירים העדכניים של מוצרים בסיסיים בכל רשתות הסופר, לפי קבצי המחירים שהרשתות מפרסמות כל יום.</p>
<h2>לפי מוצר</h2>{chips([(t, url(s)) for s, t, _ in PRODUCTS])}
<h2>לפי עיר</h2>{chips([(cn, url("ir", city_slug(cn))) for cn, _ in cities])}
<a class="cta" href="/?src=mechir">להשוות את כל רשימת הקניות שלי</a>
<p><a href="/hashvaat-mechirim-supermarket.html">איך עובדת השוואת המחירים</a></p>"""
    return page("מחירים בסופר לפי מוצר ועיר – איפה הכי זול היום | ים שופינג",
                "כמה עולים חלב, ביצים, לחם ועוד בסופר? השוואת מחירים בין כל הרשתות, לפי עיר, מעודכן כל יום.",
                BASE + "/", body, [("ים שופינג", SITE + "/"), ("מחירים", BASE + "/")])


def sitemap(c):
    today = dt.datetime.now(TZ).date().isoformat()
    urls = [BASE + "/"] + [url(s) for s, _, _ in PRODUCTS]
    for cn, _ in top_cities(c):
        cs = city_slug(cn)
        urls.append(url("ir", cs))
        urls += [url(s, cs) for s, _, _ in PRODUCTS]
    body = "".join(f"<url><loc>{html.escape(u)}</loc><lastmod>{today}</lastmod><changefreq>daily</changefreq></url>" for u in urls)
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + body + "</urlset>"


# ---------- נקודות הקצה ----------

def _serve(key, make):
    c = _api().con()
    text = cached(key, TTL, lambda: make(c))
    return html_response(text) if text else not_found()


@router.get("/mechir", include_in_schema=False)
@router.get("/mechir/", include_in_schema=False)
def seo_index():
    return _serve(("index",), render_index)


@router.get("/mechir/sitemap.xml", include_in_schema=False)
def seo_sitemap():
    c = _api().con()
    return Response(cached(("sitemap",), TTL, lambda: sitemap(c)), media_type="application/xml")


@router.get("/mechir/ir/{city}", include_in_schema=False)
def seo_city(city: str):
    if len(city) > 40:
        raise HTTPException(404)
    return _serve(("city", slug_city(city)), lambda c: render_city(c, city))


@router.get("/mechir/{slug}", include_in_schema=False)
def seo_product(slug: str):
    if slug not in BY_SLUG:
        return not_found()
    return _serve(("product", slug), lambda c: render_product(c, slug))


@router.get("/mechir/{slug}/{city}", include_in_schema=False)
def seo_city_product(slug: str, city: str):
    if slug not in BY_SLUG or len(city) > 40:
        return not_found()
    return _serve(("cp", slug, slug_city(city)), lambda c: render_city_product(c, slug, city))
