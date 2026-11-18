"""המאגר המקומי בשרת (SQLite): המחיר העדכני של כל מוצר בכל סניף, מבצעים, סניפים וסטטוס.

נשמר רק המחיר האחרון. היסטוריה קצרה של שינויי מחיר נשמרת HISTORY_DAYS ימים ונמחקת אחר כך.
מצב WAL: ה-API קורא בזמן שהאוסף כותב, בלי לחכות.
"""
import re
import sqlite3
import statistics
import time

from . import xmlparse

SCHEMA = """
create table if not exists meta(k text primary key, v text);
create table if not exists stores(
  id integer primary key,
  key text unique not null,           -- chain_id:store_id
  chain text not null,                -- שם הרשת בספרייה (SHUFERSAL)
  chain_id text not null default '',
  store_id text not null default '',
  sub_chain text not null default '',
  name text not null default '',
  address text not null default '',
  city text not null default '',
  zip text not null default '',
  lat real, lng real,
  updated_at integer not null default 0
);
create index if not exists stores_chain on stores(chain);
create index if not exists stores_city on stores(city);
create table if not exists items(
  id integer primary key,
  chain text not null,
  code text not null,
  name text not null default '',
  manufacturer text not null default '',
  qty real, unit text not null default '', weighted integer not null default 0,
  unique(chain, code)
);
create index if not exists items_code on items(code);
create virtual table if not exists items_fts using fts5(name, content='items', content_rowid='id', tokenize='unicode61 remove_diacritics 2');
create trigger if not exists items_ai after insert on items begin
  insert into items_fts(rowid, name) values (new.id, new.name);
end;
create trigger if not exists items_ad after delete on items begin
  insert into items_fts(items_fts, rowid, name) values ('delete', old.id, old.name);
end;
create trigger if not exists items_au after update of name on items begin
  insert into items_fts(items_fts, rowid, name) values ('delete', old.id, old.name);
  insert into items_fts(rowid, name) values (new.id, new.name);
end;
create table if not exists prices(
  store integer not null,
  item integer not null,
  price real not null,
  unit_price real,
  updated_at integer not null,
  primary key(store, item)
) without rowid;
create index if not exists prices_item on prices(item);
create table if not exists price_history(store integer, item integer, price real, at integer);
create index if not exists price_history_at on price_history(at);
create index if not exists price_history_item on price_history(item, at);  -- גרף מחיר למוצר (/history)
create table if not exists promos(
  store integer not null,
  promo_id text not null,
  description text not null default '',
  starts text not null default '', ends text not null default '',
  min_qty real, max_qty real, discounted_price real, discount_rate real,
  reward_type text not null default '', public integer not null default 1,
  updated_at integer not null,
  primary key(store, promo_id)
) without rowid;
create table if not exists promo_items(
  store integer not null, promo_id text not null, code text not null,
  primary key(store, code, promo_id)
) without rowid;
create table if not exists item_pop(code text primary key, stores integer, chains integer) without rowid;
create table if not exists files_done(name text primary key, chain text, kind text, rows integer, at integer);
create table if not exists chain_status(
  chain text primary key, last_try integer, last_ok integer,
  stores integer default 0, items integer default 0, files integer default 0, error text default ''
);
create table if not exists geo_cache(city text primary key, lat real, lng real, at integer);
-- מה שכבר נמצא ב-Supabase (כדי להעלות רק שינויים)
create table if not exists uploaded(chain text, code text, price real, deal text, primary key(chain, code)) without rowid;
create table if not exists sent_errors(k text primary key, at integer);
create table if not exists city_codes(code text primary key, name text) without rowid;
create table if not exists store_fresh(store integer primary key, at integer);  -- מתי הגיע קובץ מחירים אחרון מהסניף
"""


def connect(path, readonly=False):
    if readonly:
        con = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=10, check_same_thread=False)
    else:
        con = sqlite3.connect(path, timeout=60)
        con.execute("pragma journal_mode=wal")
        con.execute("pragma synchronous=normal")
        con.executescript(SCHEMA)
        try:  # מסדי נתונים ישנים: עמודת "אונליין" נוספה אחרי שהטבלה כבר נוצרה
            con.execute("alter table stores add column online integer not null default 0")
        except sqlite3.OperationalError:
            pass
    con.execute("pragma busy_timeout=10000")
    con.execute("pragma cache_size=-32000")  # 32MB
    con.row_factory = sqlite3.Row
    return con


def now() -> int:
    return int(time.time())


# ---------- סניפים ----------

# קודי יישוב של הלמ"ס שרוב הרשתות כותבות במקום שם העיר. הרשימה המלאה נטענת מ-data.gov.il (geo.load_city_codes)
# לטבלה city_codes; אלה כאן גיבוי אם הטעינה עוד לא הצליחה
CITY_CODES = {"6100": "בני ברק", "3000": "ירושלים", "5000": "תל אביב יפו", "4000": "חיפה", "7900": "פתח תקווה",
              "70": "אשדוד", "9000": "באר שבע", "7400": "נתניה", "8300": "ראשון לציון", "2610": "בית שמש",
              "3780": "ביתר עילית", "3797": "מודיעין עילית", "1309": "אלעד", "8600": "רמת גן", "6600": "חולון", "6200": "בת ים"}


def city_name(con, city):
    """"6100" ← "בני ברק". שם רגיל נשאר כמו שהוא; קוד לא מוכר נשאר קוד; "0" ← ריק."""
    c = (city or "").strip()
    if not c.isdigit():
        return c
    c = str(int(c))
    if c == "0":
        return ""
    row = con.execute("select name from city_codes where code = ?", (c,)).fetchone()
    return row[0] if row else CITY_CODES.get(c, c)


def fix_city_codes(con):
    """סניפים שנשמרו עם קוד יישוב מקבלים את שם העיר (ואת המיקום שלה בחיפוש הבא של geo)."""
    rows = con.execute("select id, city from stores where city glob '[0-9]*'").fetchall()
    n = 0
    for sid, city in rows:
        name = city_name(con, city)
        if name != city:
            con.execute("update stores set city = ?, lat = null, lng = null where id = ?", (name, sid))
            n += 1
    con.commit()
    return n


ONLINE_RX = re.compile(r"אונליין|און ליין|online|אינטרנט|משלוחים|מקוון|e-?commerce|digital|דיגיטל", re.I)


def is_online(s):
    """סניף שהוא אתר הזמנות (שופרסל ONLINE, רמי לוי אינטרנט): StoreType 2 בקובץ הסניפים, או לפי השם."""
    return str(s.get("store_type") or "").strip() == "2" or bool(ONLINE_RX.search(f"{s.get('name', '')} {s.get('sub_chain_name', '')}"))


def upsert_stores(con, chain, stores):
    t = now()
    n = 0
    for s in stores:
        if not s.get("chain_id") or not s.get("store_id"):
            continue
        key = f"{s['chain_id']}:{s['store_id']}"
        con.execute(
            """insert into stores(key, chain, chain_id, store_id, sub_chain, name, address, city, zip, online, updated_at)
               values (?,?,?,?,?,?,?,?,?,?,?)
               on conflict(key) do update set chain=excluded.chain, sub_chain=excluded.sub_chain,
                 name=excluded.name, address=excluded.address, city=excluded.city, zip=excluded.zip, online=excluded.online,
                 updated_at=excluded.updated_at""",
            (key, chain, s["chain_id"], s["store_id"], s.get("sub_chain_name", ""), s.get("name", ""),
             s.get("address", ""), city_name(con, s.get("city", "")), s.get("zip", ""), 1 if is_online(s) else 0, t),
        )
        n += 1
    return n


def store_id_for(con, chain, chain_id, store_id):
    key = f"{chain_id}:{store_id}"
    row = con.execute("select id from stores where key=?", (key,)).fetchone()
    if row:
        return row[0]
    # סניף שעוד לא הופיע בקובץ הסניפים — נוסיף אותו בלי פרטים, והם יושלמו בקובץ הסניפים הבא
    cur = con.execute("insert into stores(key, chain, chain_id, store_id, name, updated_at) values (?,?,?,?,?,?)",
                      (key, chain, chain_id, store_id, f"סניף {store_id}", now()))
    return cur.lastrowid


# ---------- מוצרים ומחירים ----------

class ItemCache:
    """מזהה פנימי לכל (רשת, ברקוד) — נטען פעם אחת לכל רשת."""

    def __init__(self, con, chain):
        self.con, self.chain = con, chain
        self.map = {r[0]: (r[1], r[2]) for r in con.execute("select code, id, name from items where chain=?", (chain,))}

    def get(self, it):
        hit = self.map.get(it["code"])
        if hit:
            iid, name = hit
            if it["name"] and it["name"] != name:
                self.con.execute("update items set name=?, manufacturer=?, qty=?, unit=?, weighted=? where id=?",
                                 (it["name"], it.get("manufacturer", ""), it.get("qty"), it.get("unit", ""), it.get("weighted", 0), iid))
                self.map[it["code"]] = (iid, it["name"])
            return iid
        cur = self.con.execute("insert into items(chain, code, name, manufacturer, qty, unit, weighted) values (?,?,?,?,?,?,?)",
                               (self.chain, it["code"], it["name"], it.get("manufacturer", ""), it.get("qty"), it.get("unit", ""), it.get("weighted", 0)))
        self.map[it["code"]] = (cur.lastrowid, it["name"])
        return cur.lastrowid


def save_prices(con, cache, store, items, full):
    """קובץ מלא מחליף את כל המחירים של הסניף; קובץ שינויים רק מעדכן. מחזיר כמה מחירים השתנו."""
    t = now()
    old = {r[0]: r[1] for r in con.execute("select item, price from prices where store=?", (store,))}
    seen = set()
    changed = 0
    for it in items:
        iid = cache.get(it)
        if iid in seen:
            continue
        seen.add(iid)
        prev = old.get(iid)
        if prev is not None and abs(prev - it["price"]) < 0.001:
            continue
        con.execute("insert into prices(store, item, price, unit_price, updated_at) values (?,?,?,?,?) "
                    "on conflict(store, item) do update set price=excluded.price, unit_price=excluded.unit_price, updated_at=excluded.updated_at",
                    (store, iid, it["price"], it.get("unit_price"), t))
        if prev is not None:
            con.execute("insert into price_history(store, item, price, at) values (?,?,?,?)", (store, iid, prev, t))
        changed += 1
    if items:
        con.execute("insert or replace into store_fresh(store, at) values (?, ?)", (store, t))
    if full and items:
        gone = [i for i in old if i not in seen]
        for i in range(0, len(gone), 500):
            part = gone[i:i + 500]
            con.execute(f"delete from prices where store=? and item in ({','.join('?' * len(part))})", (store, *part))
        changed += len(gone)
    return changed


def save_promos(con, store, promos, full):
    t = now()
    if full:
        con.execute("delete from promos where store=?", (store,))
        con.execute("delete from promo_items where store=?", (store,))
    for p in promos:
        con.execute(
            """insert into promos(store, promo_id, description, starts, ends, min_qty, max_qty, discounted_price, discount_rate, reward_type, public, updated_at)
               values (?,?,?,?,?,?,?,?,?,?,?,?)
               on conflict(store, promo_id) do update set description=excluded.description, starts=excluded.starts, ends=excluded.ends,
                 min_qty=excluded.min_qty, max_qty=excluded.max_qty, discounted_price=excluded.discounted_price,
                 discount_rate=excluded.discount_rate, reward_type=excluded.reward_type, public=excluded.public, updated_at=excluded.updated_at""",
            (store, p["promo_id"], p["description"], p["start"], p["end"], p["min_qty"], p["max_qty"],
             p["discounted_price"], p["discount_rate"], p["reward_type"], p["public"], t),
        )
        if not full:
            con.execute("delete from promo_items where store=? and promo_id=?", (store, p["promo_id"]))
        con.executemany("insert or ignore into promo_items(store, promo_id, code) values (?,?,?)",
                        [(store, p["promo_id"], c) for c in p["codes"]])
    return len(promos)


def drop_stale(con, stale_days):
    """סניף שלא שלח קובץ מחירים stale_days ימים (נסגר, או שהרשת הפסיקה לפרסם) — מוחקים את המחירים והמבצעים שלו,
    כדי שלא יוצגו מחירים ישנים. מחזיר כמה סניפים נוקו."""
    t = now()
    # סניפים עם מחירים מלפני שהתחלנו לעקוב — מתחילים לספור מעכשיו (לא מוחקים בבת אחת את כל המאגר)
    con.execute("insert or ignore into store_fresh(store, at) select distinct store, ? from prices", (t,))
    stale = [r[0] for r in con.execute("select store from store_fresh where at < ?", (t - stale_days * 86400,))]
    for sid in stale:
        con.execute("delete from prices where store = ?", (sid,))
        con.execute("delete from promo_items where store = ?", (sid,))
        con.execute("delete from promos where store = ?", (sid,))
        con.execute("delete from store_fresh where store = ?", (sid,))
    con.commit()
    return len(stale)


def prune(con, history_days):
    """מחיקת היסטוריה ישנה ומבצעים שהסתיימו — כדי לחסוך מקום."""
    con.execute("delete from price_history where at < ?", (now() - history_days * 86400,))
    today = time.strftime("%Y-%m-%d")
    old = con.execute("select store, promo_id from promos where ends <> '' and substr(ends,1,10) < ?", (today,)).fetchall()
    for r in old:
        con.execute("delete from promo_items where store=? and promo_id=?", (r[0], r[1]))
    con.execute("delete from promos where ends <> '' and substr(ends,1,10) < ?", (today,))
    con.execute("delete from files_done where at < ?", (now() - 4 * 86400,))
    # מוצרים שאף סניף כבר לא מוכר
    con.execute("delete from items where id not in (select item from prices)")
    con.commit()


def rebuild_popularity(con):
    con.execute("delete from item_pop")
    con.execute("""insert into item_pop(code, stores, chains)
                   select i.code, count(*), count(distinct i.chain) from prices p join items i on i.id = p.item group by i.code""")
    con.commit()


# ---------- מחיר מייצג לכל רשת ----------

def representative(con, chain, limit, min_share=0.2):
    """לכל מוצר ברשת: החציון של המחירים בכל הסניפים. רק מוצרים שנמכרים לפחות ב-min_share מהסניפים,
    ועד limit מוצרים — אלה שנמכרים בהכי הרבה סניפים."""
    n_stores = con.execute("select count(distinct p.store) from prices p join stores s on s.id = p.store where s.chain=?", (chain,)).fetchone()[0]
    if not n_stores:
        return []
    need = max(1, int(n_stores * min_share))
    rows = con.execute(
        """select i.code, i.name, p.price from prices p join items i on i.id = p.item
           where i.chain = ? order by i.id""", (chain,))
    out, cur, prices = [], None, []

    def flush():
        if cur and len(prices) >= need and len(cur[0]) >= 4:
            out.append({"code": cur[0], "name": cur[1], "price": round(statistics.median(prices), 2), "stores": len(prices)})

    for code, name, price in rows:
        if cur is None or code != cur[0]:
            flush()
            cur, prices = (code, name), []
        prices.append(price)
    flush()
    out.sort(key=lambda r: -r["stores"])
    return out[:limit]


def chain_deals(con, chain, min_share=0.5):
    """מבצעים פעילים לכל הלקוחות (לא רק חברי מועדון) שקיימים לפחות במחצית מהסניפים של הרשת שיש להם מבצעים.
    מחזיר {ברקוד: מבצע}."""
    today = time.strftime("%Y-%m-%d %H:%M:%S")
    stores = [r[0] for r in con.execute("select distinct p.store from promos p join stores s on s.id = p.store where s.chain=?", (chain,))]
    if not stores:
        return {}
    need = max(1, int(len(stores) * min_share))
    rows = con.execute(
        """select pr.promo_id, pr.description, max(pr.ends) ends, max(pr.min_qty) min_qty, max(pr.discounted_price) discounted_price,
                  max(pr.discount_rate) rate, count(distinct pr.store) n
           from promos pr join stores s on s.id = pr.store
           where s.chain = ? and pr.public = 1 and (pr.starts = '' or pr.starts <= ?) and (pr.ends = '' or pr.ends >= ?)
           group by pr.promo_id having n >= ?""", (chain, today, today, need)).fetchall()
    out = {}
    for r in rows:
        if xmlparse.payment_only(r["description"]):  # נשמר לפני שהתחלנו לסנן — רק בסיבוס / בכרטיס מסוים
            continue
        codes = con.execute(
            "select distinct pi.code from promo_items pi join stores s on s.id = pi.store where s.chain=? and pi.promo_id=? limit 2000",
            (chain, r["promo_id"])).fetchall()
        if len(codes) > 1500:  # "כל החנות בהנחה" — לא מבצע על מוצר מסוים
            continue
        for (code,) in codes:
            out.setdefault(code, dict(r))
    return out


def set_status(con, chain, **kw):
    con.execute("insert into chain_status(chain) values (?) on conflict(chain) do nothing", (chain,))
    sets = ", ".join(f"{k}=?" for k in kw)
    con.execute(f"update chain_status set {sets} where chain=?", (*kw.values(), chain))
    con.commit()


def chain_counts(con, chain):
    stores = con.execute("select count(*) from stores where chain=?", (chain,)).fetchone()[0]
    items = con.execute("select count(*) from items where chain=?", (chain,)).fetchone()[0]
    return stores, items
