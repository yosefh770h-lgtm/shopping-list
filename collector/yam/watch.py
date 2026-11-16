"""🕵️ ניטור העתקה (scraping) של שרת המחירים.

ה-API רושם כאן כל בקשה, מסוכם לפי יום וכתובת IP: כמה בקשות, האם דרך האתר או ישירות לשרת, באיזה כלי (User-Agent),
כמה סניפים שונים וכמה מוצרים שונים נשאלו, וכמה נחסמו. הקובץ watch.db יושב ליד prices.db ונשמר 14 יום.
בכל ריצה שעתית האוסף מעלה ל-Supabase (scrape_watch) את מי שנראה חשוד, ומוריד משם את רשימת החסומים (blocked.json).

"דרך האתר" = עבר דרך Vercel (www.yamshopping.com/api/prices) או שהגיע עם Referer/Origin של האתר.
כל השאר = פנייה ישירה ל-server.yamshopping.com, שהאתר עצמו לא עושה, ולכן היא מוגבלת יותר.
"""
import ipaddress
import json
import os
import re
import sqlite3
import threading
import time

KEEP_DAYS = 14
SETS = ("stores", "queries", "cities", "who", "uas")
CAP = 300  # כמה סניפים / מוצרים / ערים שונים שומרים לכל כתובת ביום (מספיק כדי לזהות סריקה)
FLUSH_SEC = 30

BOT_UA = re.compile(r"python|curl|wget|scrapy|httpx|aiohttp|go-http|java/|okhttp|node-fetch|axios|undici|libwww|"
                    r"headless|phantom|selenium|puppeteer|playwright|bot\b|spider|crawl|postman|insomnia|powershell", re.I)
SITE = re.compile(r"^https://(www\.)?yamshopping\.com(/|$)")

# סיבות לחשד, עם משקל. מעל 2 = חשוד, מעל 3 = התראה למנהל
REASONS = {
    "bot": 2,       # כלי אוטומטי (python, curl, דפדפן בלי מסך...) או בלי User-Agent בכלל
    "direct": 1,    # פונה ישירות לשרת ולא דרך האתר
    "direct_many": 1,
    "stores": 2,    # עובר על הרבה סניפים שונים
    "queries": 2,   # שואל על הרבה מאוד מוצרים שונים
    "volume": 2,    # הרבה מאוד בקשות ביום
    "limited": 1,   # נעצר הרבה פעמים בהגבלת הקצב
    "blocked": 1,   # חסום וממשיך לנסות
    "hosting": 1,   # מגיע משרת בענן או VPN, לא מבית או מטלפון (נבדק באוסף, לפי geoip)
}


def today():
    return time.strftime("%Y-%m-%d")


def is_bot(ua):
    return not (ua or "").strip() or bool(BOT_UA.search(ua))


def reasons_for(row):
    """row: n, site, limited, blocked, ua, stores, queries (מספרים) → (רשימת סיבות, ניקוד)."""
    n, direct = row["n"], row["n"] - row["site"]
    out = []
    if is_bot(row["ua"]) and n >= 5:
        out.append("bot")
    if direct >= 30:
        out.append("direct")
    if direct >= 300:
        out.append("direct_many")
    if row["stores"] >= 20:
        out.append("stores")
    if row["queries"] >= 200:
        out.append("queries")
    if n >= 2000:
        out.append("volume")
    if row["limited"] >= 20:
        out.append("limited")
    if row["blocked"] >= 5:
        out.append("blocked")
    return out, sum(REASONS[r] for r in out)


def connect(path):
    con = sqlite3.connect(path, timeout=10, isolation_level=None)
    con.row_factory = sqlite3.Row
    con.execute("pragma journal_mode=wal")
    con.execute("""create table if not exists hits (
        day text not null, ip text not null, peer text not null default '', site int not null default 0,
        n int not null default 0, limited int not null default 0, blocked int not null default 0,
        ua text not null default '', first_at real, last_at real,
        eps text not null default '{}', stores text not null default '[]', queries text not null default '[]',
        cities text not null default '[]', primary key (day, ip))""")
    cols = {r[1] for r in con.execute("pragma table_info(hits)")}
    for col in ("who", "uas"):  # נוספו אחר כך: מי המשתמש לפי הדפדפן, וכל הכלים (User-Agent) שהכתובת השתמשה בהם
        if col not in cols:
            con.execute(f"alter table hits add column {col} text not null default '[]'")
    return con


class Watch:
    """צובר בזיכרון ושומר לדיסק כל חצי דקה (כל worker של uvicorn בנפרד, לאותו קובץ)."""

    def __init__(self, path):
        self.path = path
        self.lock = threading.Lock()
        self.pending = {}
        self.last = time.monotonic()
        self.broken = False

    def note(self, ip, peer, site, ua, path, status, store="", items=(), city="", who=""):
        k = (today(), ip)
        t = time.time()
        with self.lock:
            r = self.pending.get(k)
            if r is None:
                r = self.pending[k] = {"peer": peer, "site": 0, "n": 0, "limited": 0, "blocked": 0, "ua": "", "first": t,
                                       "eps": {}, "stores": set(), "queries": set(), "cities": set(), "who": set(), "uas": set()}
            r["n"] += 1
            r["site"] += 1 if site else 0
            r["limited"] += 1 if status == 429 else 0
            r["blocked"] += 1 if status == 403 else 0
            r["ua"] = (ua or "")[:200]
            r["last"] = t
            ep = path.strip("/").split("/")[0][:20] or "/"
            r["eps"][ep] = r["eps"].get(ep, 0) + 1
            for key, vals, cap, size in (("stores", [store] if store else [], CAP, 60), ("queries", items, CAP, 60),
                                         ("cities", [city] if city else [], CAP, 60), ("who", [who] if who else [], 20, 40),
                                         ("uas", [ua] if ua else [], 8, 200)):
                s = r[key]
                for v in vals:
                    if len(s) >= cap:
                        break
                    s.add(v[:size])
            due = time.monotonic() - self.last > FLUSH_SEC
        if due:
            self.flush()

    def flush(self):
        with self.lock:
            batch, self.pending, self.last = self.pending, {}, time.monotonic()
        if not batch or self.broken:
            return
        try:
            con = connect(self.path)
        except sqlite3.Error:
            self.broken = True  # אין הרשאת כתיבה — לא מפילים את ה-API בגלל הניטור
            return
        try:
            con.execute("begin immediate")
            for (day, ip), r in batch.items():
                old = con.execute("select * from hits where day=? and ip=?", (day, ip)).fetchone()
                eps, sets = dict(r["eps"]), {k: set(r[k]) for k in SETS}
                if old:
                    for ep, n in json.loads(old["eps"]).items():
                        eps[ep] = eps.get(ep, 0) + n
                    for k in sets:
                        sets[k] = set(json.loads(old[k])) | sets[k]
                vals = {k: json.dumps(sorted(v)[:CAP], ensure_ascii=False) for k, v in sets.items()}
                con.execute("""insert into hits(day, ip, peer, site, n, limited, blocked, ua, first_at, last_at, eps, stores, queries, cities, who, uas)
                               values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                               on conflict(day, ip) do update set peer=excluded.peer, site=site+excluded.site, n=n+excluded.n,
                                 limited=limited+excluded.limited, blocked=blocked+excluded.blocked, ua=excluded.ua,
                                 last_at=excluded.last_at, eps=excluded.eps, stores=excluded.stores, queries=excluded.queries,
                                 cities=excluded.cities, who=excluded.who, uas=excluded.uas""",
                            (day, ip, r["peer"], r["site"], r["n"], r["limited"], r["blocked"], r["ua"], r["first"], r["last"],
                             json.dumps(eps), vals["stores"], vals["queries"], vals["cities"], vals["who"], vals["uas"]))
            con.execute("delete from hits where day < date('now', ?)", (f"-{KEEP_DAYS} days",))
            con.execute("commit")
        except sqlite3.Error:
            try:
                con.execute("rollback")
            except sqlite3.Error:
                pass
        finally:
            con.close()


def is_internal(ip):
    """כתובת פנימית (127.0.0.1, רשת פנימית וכו') — זה השרת עצמו או רשת פרטית, אף פעם לא גולש מבחוץ."""
    try:
        a = ipaddress.ip_address(str(ip).split("/")[0])
    except ValueError:
        return False
    return a.is_private or a.is_loopback or a.is_link_local or a.is_unspecified or a.is_reserved


def safe_nets(entries, own=()):
    """מה שמותר לחסום: לא כתובת פנימית, לא טווח שכולל את השרת שלנו, ולא טווח ענק (יותר מ-/16 ב-IPv4 או /32 ב-IPv6)."""
    own_a = [ipaddress.ip_address(x) for x in own if _valid(x)]
    out = []
    for x in entries:
        n = parse_net(x)
        if not n or is_internal(str(n.network_address)) or n.prefixlen < (16 if n.version == 4 else 32):
            continue
        if any(a.version == n.version and a in n for a in own_a):
            continue
        out.append(n)
    return out


def _valid(ip):
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


class Blocklist:
    """כתובות שהמנהל חסם בבק אופיס (קובץ blocked.json שהאוסף כותב). נטען מחדש כשהקובץ משתנה.
    השרת שלנו ("self" בקובץ) וכתובות פנימיות אף פעם לא נחסמים, גם אם מישהו הוסיף אותם לרשימה."""

    def __init__(self, path):
        self.path, self.mtime, self.checked, self.nets, self.own = path, None, 0.0, [], set()

    def _load(self):
        now = time.monotonic()
        if now - self.checked < 30:
            return
        self.checked = now
        try:
            m = os.path.getmtime(self.path)
        except OSError:
            self.nets, self.mtime = [], None
            return
        if m == self.mtime:
            return
        self.mtime = m
        try:
            with open(self.path, encoding="utf-8") as f:
                data = json.load(f)
            self.own = {str(x) for x in data.get("self", []) if _valid(str(x))}
            self.nets = safe_nets(data.get("ips", []), self.own)
        except (OSError, ValueError, AttributeError):
            self.nets, self.own = [], set()

    def blocked(self, *ips):
        self._load()
        if not self.nets:
            return False
        for ip in ips:
            if is_internal(ip) or ip in self.own:
                continue
            try:
                a = ipaddress.ip_address(ip)
            except ValueError:
                continue
            if any(a.version == n.version and a in n for n in self.nets):
                return True
        return False


def parse_net(x):
    try:
        return ipaddress.ip_network(str(x).strip(), strict=False)
    except ValueError:
        return None


# ---------- הדוח (רץ באוסף, לא ב-API) ----------

def report(path, days=2, top=40, own=()):
    """מי שנראה חשוד ביומיים האחרונים + סיכום לכל יום. מחזיר (rows, totals).
    own: הכתובות של השרת שלנו — הן וכתובות פנימיות מסומנות own ולא נחשבות חשודות."""
    own = set(own)
    if not os.path.exists(path):
        return [], []
    con = connect(path)
    try:
        rows = con.execute("select * from hits where day >= date('now', ?) order by n desc",
                           (f"-{max(0, days - 1)} days",)).fetchall()
    finally:
        con.close()
    totals, out = {}, []
    for r in rows:
        t = totals.setdefault(r["day"], {"day": r["day"], "n": 0, "site": 0, "limited": 0, "blocked": 0, "ips": 0})
        for k in ("n", "site", "limited", "blocked"):
            t[k] += r[k]
        t["ips"] += 1
        stores, queries, cities = (json.loads(r[k]) for k in ("stores", "queries", "cities"))
        d = {"day": r["day"], "ip": r["ip"], "peer": r["peer"] if r["peer"] != r["ip"] else "", "n": r["n"], "site": r["site"],
             "limited": r["limited"], "blocked": r["blocked"], "ua": r["ua"], "stores": len(stores), "queries": len(queries),
             "cities": len(cities), "eps": json.loads(r["eps"]), "samples": queries[:40], "city_list": cities[:20],
             "who": json.loads(r["who"]), "uas": json.loads(r["uas"]),
             "first_at": r["first_at"], "last_at": r["last_at"]}
        d["own"] = is_internal(r["ip"]) or r["ip"] in own
        d["reasons"], d["score"] = ([], 0) if d["own"] else reasons_for(d)
        out.append(d)
    sus = [d for d in out if d["score"] >= 2]
    rest = [d for d in out if d["score"] < 2][:max(0, top - len(sus))]  # גם הכי פעילים, להשוואה
    return sus + rest, sorted(totals.values(), key=lambda t: t["day"])
