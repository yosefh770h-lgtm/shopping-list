"""בדיקות לאוסף המחירים בלי אינטרנט: קבצים לדוגמה בכל הפורמטים, המאגר המקומי, ה-API והשהיית השבת.
    cd collector && python -m pytest -q tests
"""
import datetime as dt
import gzip
import io
import os
import sys
import zipfile
from zoneinfo import ZoneInfo

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from yam import chains, db, shabbat, watch, xmlparse  # noqa: E402


@pytest.fixture(autouse=True)
def no_network_city_codes(monkeypatch):
    """ריצות האוסף בבדיקות לא פונות ל-data.gov.il."""
    from yam import geo
    monkeypatch.setattr(geo, "load_city_codes", lambda con: 0)

STORES_UPPER = """<?xml version="1.0" encoding="utf-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0"><asx:values>
<CHAINID>7290027600007</CHAINID><STORES>
<STORE><CHAINID>7290027600007</CHAINID><SUBCHAINID>1</SUBCHAINID><STOREID>1</STOREID><STORENAME>שלי ת"א- בן יהודה</STORENAME>
<ADDRESS>בן יהודה 79</ADDRESS><CITY>תל אביב</CITY><ZIPCODE>6343504</ZIPCODE></STORE>
<STORE><CHAINID>7290027600007</CHAINID><SUBCHAINID>2</SUBCHAINID><STOREID>202</STOREID><STORENAME>דיל בני ברק</STORENAME>
<ADDRESS>ז'בוטינסקי 80</ADDRESS><CITY>בני ברק</CITY></STORE>
</STORES></asx:values></asx:abap>"""

STORES_NESTED = """<?xml version="1.0" encoding="UTF-16"?>
<Root><ChainId>7290058140886</ChainId><SubChains><SubChain><SubChainId>001</SubChainId><SubChainName>רמי לוי</SubChainName>
<Stores><Store><StoreId>39</StoreId><StoreName>בני ברק</StoreName><Address>רח' השומר 4 &amp; 6</Address><City>בני ברק</City></Store></Stores>
</SubChain></SubChains></Root>"""

PRICE_ITEMS = """<?xml version="1.0" encoding="utf-8"?>
<root><ChainId>7290027600007</ChainId><SubChainId>001</SubChainId><StoreId>202</StoreId>
<Items Count="3">
<Item><PriceUpdateDate>2026-10-20 08:00</PriceUpdateDate><ItemCode>7290004131074</ItemCode><ItemType>1</ItemType>
<ItemName>חלב טרי 3% בקרטון תנובה 1 ליטר</ItemName><ManufacturerName>תנובה</ManufacturerName><Quantity>1</Quantity>
<UnitQty>ליטר</UnitQty><bIsWeighted>0</bIsWeighted><ItemPrice>7.10</ItemPrice><UnitOfMeasurePrice>7.10</UnitOfMeasurePrice></Item>
<Item><ItemCode>7290000066318</ItemCode><ItemName>במבה אסם 80 גרם</ItemName><ItemPrice>5,90</ItemPrice></Item>
<Item><ItemCode>0000000123</ItemCode><ItemName>עגבניות</ItemName><ItemPrice>6.9</ItemPrice><bIsWeighted>1</bIsWeighted></Item>
<Item><ItemCode>111</ItemCode><ItemName>מוצר בלי מחיר</ItemName><ItemPrice>0</ItemPrice></Item>
</Items></root>"""

PRICE_PRODUCTS_LOWER = """<?xml version="1.0" encoding="utf-16"?>
<prices><chainid>7290058140886</chainid><storeid>039</storeid><products>
<product><itemcode>7290004131074</itemcode><itemname>חלב 3% תנובה קרטון</itemname><itemprice>6.50</itemprice></product>
<product><itemcode>7290000066318</itemcode><itemname>במבה 80 גר'</itemname><itemprice>4.90</itemprice></product>
</products></prices>"""

PROMOS = """<?xml version="1.0" encoding="utf-8"?>
<Root><ChainId>7290027600007</ChainId><StoreId>202</StoreId><Promotions>
<Promotion><PromotionId>9001</PromotionId><PromotionDescription>במבה 3 ב-12</PromotionDescription>
<PromotionStartDate>2026-01-01</PromotionStartDate><PromotionStartHour>00:00:00</PromotionStartHour>
<PromotionEndDate>2099-12-31</PromotionEndDate><PromotionEndHour>23:59:00</PromotionEndHour>
<MinQty>3</MinQty><DiscountedPrice>12</DiscountedPrice><Clubs><ClubId>0</ClubId></Clubs>
<PromotionItems><Item><ItemCode>7290000066318</ItemCode><ItemType>1</ItemType></Item></PromotionItems></Promotion>
<Promotion><PromotionId>9002</PromotionId><PromotionDescription>רק לחברי מועדון</PromotionDescription>
<PromotionEndDate>2099-12-31</PromotionEndDate><MinQty>1</MinQty><DiscountedPrice>1</DiscountedPrice><Clubs><ClubId>3</ClubId></Clubs>
<PromotionItems><Item><ItemCode>7290004131074</ItemCode></Item></PromotionItems></Promotion>
</Promotions></Root>"""

SALES = """<?xml version="1.0" encoding="windows-1255"?>
<Promos><ChainID>7290000000001</ChainID><StoreID>5</StoreID><Sales>
<Sale><PromotionID>77</PromotionID><ItemCode>7290000066318</ItemCode><PromotionDescription>1+1</PromotionDescription><PromotionEndDate>2099-01-01</PromotionEndDate></Sale>
<Sale><PromotionID>77</PromotionID><ItemCode>7290004131074</ItemCode><PromotionDescription>1+1</PromotionDescription></Sale>
</Sales></Promos>"""


def gz(s, enc="utf-8"):
    return gzip.compress(s.encode(enc))


def zipped(s, enc="utf-16"):
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as z:
        z.writestr("PriceFull7290058140886-001-039-20261020-0300.xml", s.encode(enc))
    return b.getvalue()


# ---------- פענוח ----------

def test_stores_uppercase_namespace():
    st = xmlparse.parse_stores(gz(STORES_UPPER))
    assert [s["store_id"] for s in st] == ["1", "202"]
    assert st[0]["city"] == "תל אביב" and st[1]["address"].startswith("ז'בוטינסקי")
    assert st[0]["chain_id"] == "7290027600007"


def test_stores_nested_utf16():
    st = xmlparse.parse_stores(STORES_NESTED.encode("utf-16"))
    assert st == [dict(st[0])] and st[0]["store_id"] == "39" and st[0]["chain_id"] == "7290058140886"
    assert st[0]["sub_chain_name"] == "רמי לוי" and "&" in st[0]["address"]


def test_prices_items_gz():
    chain_id, store_id, items = xmlparse.parse_prices(gz(PRICE_ITEMS), "PriceFull7290027600007-001-202-20261020-0300.gz")
    assert (chain_id, store_id) == ("7290027600007", "202")
    assert [i["code"] for i in items] == ["7290004131074", "7290000066318", "123"]
    assert items[1]["price"] == 5.9 and items[2]["weighted"] == 1 and items[0]["weighted"] == 0


def test_prices_products_lowercase_utf16_zip():
    chain_id, store_id, items = xmlparse.parse_prices(zipped(PRICE_PRODUCTS_LOWER))
    assert (chain_id, store_id) == ("7290058140886", "39")
    assert len(items) == 2 and items[0]["price"] == 6.5


def test_utf16_without_bom_and_filename_ids():
    raw = PRICE_PRODUCTS_LOWER.replace("<chainid>7290058140886</chainid><storeid>039</storeid>", "").encode("utf-16-le")
    chain_id, store_id, items = xmlparse.parse_prices(raw, "Price7290058140886-001-039-202610201200.xml")
    assert (chain_id, store_id) == ("7290058140886", "39") and len(items) == 2


def test_promos_and_sales():
    chain_id, store_id, promos = xmlparse.parse_promos(gz(PROMOS))
    by = {p["promo_id"]: p for p in promos}
    assert by["9001"]["codes"] == {"7290000066318"} and by["9001"]["public"] == 1 and by["9001"]["min_qty"] == 3
    assert by["9002"]["public"] == 0
    _, sid, sales = xmlparse.parse_promos(SALES.encode("windows-1255"))
    assert sid == "5" and sales[0]["codes"] == {"7290000066318", "7290004131074"}


def test_payment_only_promos():
    """"הנחת סיבוס 50 ש\"ח" — רק למי שמשלם בסיבוס, אז לא מבצע שמוצג לכולם."""
    for d in ('הנחת סיבוס 50 ש"ח', "10% הנחה בכרטיס ישראכרט", "Cibus 30 off", "הנחה בתשלום בתן ביס"):
        assert xmlparse.payment_only(d), d
    for d in ("במבה 3 ב-12", "1+1", "קפה כאלה ואחרים 2 ב-20", ""):
        assert not xmlparse.payment_only(d), d
    xml = PROMOS.replace("<PromotionDescription>במבה 3 ב-12</PromotionDescription>", '<PromotionDescription>הנחת סיבוס 50 ש"ח</PromotionDescription>')
    by = {p["promo_id"]: p for p in xmlparse.parse_promos(gz(xml))[2]}
    assert by["9001"]["public"] == 0


def test_kind_of():
    assert xmlparse.kind_of("PriceFull7290027600007-001-202") == "pricefull"
    assert xmlparse.kind_of("Price7290027600007-001-202") == "price"
    assert xmlparse.kind_of("PromoFull7290027600007") == "promofull"
    assert xmlparse.kind_of("Stores7290027600007-000") == "stores"


# ---------- מאגר + API ----------

@pytest.fixture()
def built(tmp_path, monkeypatch):
    path = str(tmp_path / "prices.db")
    con = db.connect(path)
    db.upsert_stores(con, "SHUFERSAL", xmlparse.parse_stores(gz(STORES_UPPER)))
    db.upsert_stores(con, "RAMI_LEVY", xmlparse.parse_stores(STORES_NESTED.encode("utf-16")))
    for chain, raw in (("SHUFERSAL", gz(PRICE_ITEMS)), ("RAMI_LEVY", zipped(PRICE_PRODUCTS_LOWER))):
        cid, sid, items = xmlparse.parse_prices(raw)
        store = db.store_id_for(con, chain, cid, sid)
        db.save_prices(con, db.ItemCache(con, chain), store, items, full=True)
    cid, sid, promos = xmlparse.parse_promos(gz(PROMOS))
    db.save_promos(con, db.store_id_for(con, "SHUFERSAL", cid, sid), promos, full=True)
    con.execute("update stores set lat=32.08, lng=34.83 where city='בני ברק'")
    con.commit()
    db.rebuild_popularity(con)
    import yam.api as api
    monkeypatch.setattr(api, "DB_PATH", path)
    api._local.con = None
    api._buckets.clear()
    api._daily.clear()
    monkeypatch.setattr(api, "watcher", watch.Watch(str(tmp_path / "watch.db")))
    monkeypatch.setattr(api, "blocklist", watch.Blocklist(str(tmp_path / "blocked.json")))
    return con, api


def test_full_file_replaces_and_history(built):
    con, _ = built
    store = con.execute("select id from stores where key='7290027600007:202'").fetchone()[0]
    cache = db.ItemCache(con, "SHUFERSAL")
    changed = db.save_prices(con, cache, store, [{"code": "7290004131074", "name": "חלב טרי 3% בקרטון תנובה 1 ליטר", "price": 7.5}], full=True)
    assert changed == 3  # מחיר אחד השתנה ושניים נעלמו
    assert con.execute("select count(*) from prices where store=?", (store,)).fetchone()[0] == 1
    assert con.execute("select price from price_history").fetchone()[0] == 7.1


def test_representative_and_deals(built):
    con, _ = built
    rep = {r["code"]: r for r in db.representative(con, "SHUFERSAL", 100)}
    assert rep["7290000066318"]["price"] == 5.9
    deals = db.chain_deals(con, "SHUFERSAL")
    assert "7290000066318" in deals and "7290004131074" not in deals  # מבצע מועדון לא נכנס


def test_api_compare_and_cors(built):
    _, api = built
    from fastapi.testclient import TestClient
    c = TestClient(api.app)
    r = c.get("/compare", params={"items": "חלב|במבה*3", "city": "בני ברק"}, headers={"Origin": "https://www.yamshopping.com"})
    assert r.status_code == 200, r.text
    assert r.headers["access-control-allow-origin"] == "https://www.yamshopping.com"
    body = r.json()
    assert {s["chain"] for s in body["stores"]} == {"SHUFERSAL", "RAMI_LEVY"}
    shu = next(s for s in body["stores"] if s["chain"] == "SHUFERSAL")
    bamba = shu["lines"][1]
    assert bamba["code"] == "7290000066318" and bamba["cost"] == 12 and bamba["regular"] == 17.7
    rami = next(s for s in body["stores"] if s["chain"] == "RAMI_LEVY")
    assert rami["lines"][0]["code"] == "7290004131074"  # אותו מוצר בדיוק בשתי הרשתות
    # רשת שהמנהל הסתיר בבק אופיס לא מופיעה
    hid = c.get("/compare", params={"items": "חלב", "city": "בני ברק", "exclude": "RAMI_LEVY"}).json()
    assert {s["chain"] for s in hid["stores"]} == {"SHUFERSAL"}
    assert all(s["chain"] != "RAMI_LEVY" for s in c.get("/stores", params={"city": "בני ברק", "exclude": "RAMI_LEVY"}).json())
    bad = c.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in bad.headers


def test_api_stores_prices_cities(built):
    _, api = built
    from fastapi.testclient import TestClient
    c = TestClient(api.app)
    near = c.get("/stores", params={"lat": 32.09, "lng": 34.84}).json()
    assert near and near[0]["city"] == "בני ברק" and "km" in near[0]
    assert c.get("/cities", params={"q": "בני"}).json()[0]["stores"] == 2
    p = c.get("/prices", params={"store": "7290027600007:202", "items": "7290000066318"}).json()
    assert p["items"][0]["matches"][0]["price"] == 5.9
    assert c.get("/compare", params={"items": "חלב"}).status_code == 400


def test_rate_limit(built, monkeypatch):
    _, api = built
    from fastapi.testclient import TestClient
    monkeypatch.setattr(api, "RATE", 3)
    monkeypatch.setattr(api, "DIRECT_RATE", 2)
    api._buckets.clear()
    c = TestClient(api.app)
    site = {"Referer": "https://www.yamshopping.com/"}
    codes = [c.get("/health", headers=site).status_code for _ in range(5)]
    assert codes[:3] == [200, 200, 200] and 429 in codes
    # ישירות לשרת (לא דרך האתר) — מוגבל יותר
    api._buckets.clear()
    codes = [c.get("/health").status_code for _ in range(4)]
    assert codes[:2] == [200, 200] and codes[2] == 429


VERCEL = {"x-vercel-id": "fra1::abc", "x-real-ip": "185.220.101.7"}


def test_vercel_users_counted_one_by_one(built, monkeypatch):
    """דרך Vercel כולם מגיעים מאותו חיבור — סופרים לפי הכתובת של המשתמש, ויש תקרה לחיבור."""
    _, api = built
    from fastapi.testclient import TestClient
    monkeypatch.setattr(api, "TRUST_VERCEL", True)
    monkeypatch.setattr(api, "RATE", 3)
    monkeypatch.setattr(api, "PEER_RATE", 8)
    c = TestClient(api.app)
    a = [c.get("/health", headers=VERCEL).status_code for _ in range(4)]
    b = [c.get("/health", headers=dict(VERCEL, **{"x-real-ip": "185.220.101.8"})).status_code for _ in range(3)]
    assert a[:3] == [200] * 3 and a[3] == 429 and b == [200] * 3
    many = [c.get("/health", headers=dict(VERCEL, **{"x-real-ip": f"185.220.101.{20 + i}"})).status_code for i in range(6)]
    assert 429 in many  # מי שמזייף כתובות שונות נעצר בתקרה של החיבור
    # Vercel לא שלח כתובת — לא מגבילים את כל המשתמשים כאילו הם אחד
    api._buckets.clear()
    monkeypatch.setattr(api, "PEER_RATE", 100)
    assert all(c.get("/health", headers={"x-vercel-id": "x"}).status_code == 200 for _ in range(10))


def test_fake_vercel_headers_ignored(built, monkeypatch):
    """האתר כבר לא ב-Vercel: מי שמזייף x-vercel-* לא מקבל "כתובת" חדשה בכל בקשה ולא עוקף את המכסה."""
    _, api = built
    from fastapi.testclient import TestClient
    monkeypatch.setattr(api, "DIRECT_RATE", 3)
    c = TestClient(api.app)
    codes = [c.get("/health", headers=dict(VERCEL, **{"x-real-ip": f"185.220.101.{i}"})).status_code for i in range(5)]
    assert codes[:3] == [200] * 3 and 429 in codes


def test_daily_cap_and_blocklist(built, monkeypatch, tmp_path):
    _, api = built
    from fastapi.testclient import TestClient
    monkeypatch.setattr(api, "TRUST_VERCEL", True)
    monkeypatch.setattr(api, "DIRECT_DAY", 3)
    c = TestClient(api.app)
    codes = [c.get("/health").status_code for _ in range(5)]
    assert codes == [200, 200, 200, 429, 429]
    assert "מכסה" in c.get("/health").json()["error"]
    assert c.get("/health", headers=VERCEL).status_code == 200  # דרך האתר — מכסה אחרת
    (tmp_path / "blocked.json").write_text('{"ips": ["185.220.101.0/24", "bad"]}')
    api.blocklist.checked = 0
    assert c.get("/health", headers=VERCEL).status_code == 403
    assert c.get("/health", headers=dict(VERCEL, **{"x-real-ip": "45.83.64.5"})).status_code == 200


def test_watch_finds_scrapers(built, monkeypatch, tmp_path):
    _, api = built
    from fastapi.testclient import TestClient
    monkeypatch.setattr(api, "TRUST_VERCEL", True)
    monkeypatch.setattr(api, "DIRECT_RATE", 10000)
    c = TestClient(api.app)
    bot = {"User-Agent": "python-requests/2.32"}
    for i in range(25):  # סקריפט שעובר על כל הסניפים
        c.get("/prices", params={"store": f"7290027600007:{i}", "items": "חלב|במבה*3"}, headers=bot)
    for _ in range(3):  # משתמש רגיל באתר
        c.get("/compare", params={"items": "חלב", "city": "בני ברק"},
              headers=dict(VERCEL, **{"User-Agent": "Mozilla/5.0 (Linux; Android 14) Chrome/130"}))
    api.watcher.flush()
    rows, totals = watch.report(api.watcher.path)
    by = {r["ip"]: r for r in rows}
    s = by["testclient"]
    assert s["n"] == 25 and s["site"] == 0 and s["stores"] == 25 and s["queries"] == 2 and s["eps"] == {"prices": 25}
    assert {"bot", "stores"} <= set(s["reasons"]) and s["score"] >= 3
    u = by["185.220.101.7"]
    assert u["site"] == 3 and u["peer"] == "testclient" and u["reasons"] == [] and u["cities"] == 1
    assert totals[0]["n"] == 28 and totals[0]["site"] == 3 and totals[0]["ips"] == 2
    # שמירה שנייה מצטרפת לראשונה (כמה workers, כמה שמירות ביום)
    c.get("/prices", params={"store": "7290027600007:99", "items": "ביצים"}, headers=bot)
    api.watcher.flush()
    s = {r["ip"]: r for r in watch.report(api.watcher.path)[0]}["testclient"]
    assert s["n"] == 26 and s["stores"] == 26 and s["queries"] == 3


def test_watch_sync_uploads_and_downloads_blocklist(tmp_path, monkeypatch):
    from yam import run
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.delenv("DB_PATH", raising=False)
    w = watch.Watch(str(tmp_path / "watch.db"))
    for _ in range(40):
        w.note("45.83.64.9", "45.83.64.9", False, "curl/8.0", "/compare", 200, items=["חלב"])
    w.flush()

    class FakeSupa:
        def __init__(self):
            self.rows, self.deleted = [], []

        def select(self, table, query):
            if table != "site_config":
                return []
            return [{"value": {"blocked": [{"ip": "45.83.64.9", "note": "סקריפט"}, "10.0.0.0/8", "לא כתובת"]}}]

        def insert(self, table, rows, on_conflict=None, ignore=False):
            assert table == "scrape_watch" and on_conflict == "day,ip"
            assert len({tuple(sorted(r)) for r in rows}) == 1  # לכל השורות אותם שדות (PostgREST)
            self.rows += rows

        def delete(self, table, query):
            self.deleted.append(query)

    from yam import geoip
    monkeypatch.setattr(geoip, "ensure", lambda folder, session=None: None)
    monkeypatch.setattr(run, "own_ips", lambda: {"84.13.86.86"})
    r = run.Runner.__new__(run.Runner)
    r.data, r.mode, r.supa = str(tmp_path), "hourly", FakeSupa()
    r.watch_sync()
    import json as _json
    assert _json.loads((tmp_path / "blocked.json").read_text())["ips"] == ["45.83.64.9"]  # כתובת פנימית לא נחסמת
    sus = next(x for x in r.supa.rows if x["ip"] == "45.83.64.9")
    assert sus["score"] >= 3 and "bot" in sus["reasons"] and "direct" in sus["reasons"]
    assert any(x["ip"] == "*" and x["n"] == 40 for x in r.supa.rows) and r.supa.deleted[0].startswith("day=lt.")


# ---------- הגדרות ושבת ----------

def test_default_chains():
    known = ["SHUFERSAL", "TIV_TAAM", "WOLT", "YAYNO_BITAN_AND_CARREFOUR", "MESHMAT_YOSEF_1", "MESHMAT_YOSEF_2"]
    on = chains.enabled_chains({}, known)
    assert "TIV_TAAM" not in on and "WOLT" not in on
    assert {"SHUFERSAL", "YAYNO_BITAN_AND_CARREFOUR", "MESHMAT_YOSEF_1", "MESHMAT_YOSEF_2"} <= set(on)
    assert "SHUFERSAL" not in chains.enabled_chains({"chains": {"SHUFERSAL": False}}, known)
    assert "TIV_TAAM" in chains.enabled_chains({"chains": {"TIV_TAAM": True}}, known)


def J(*a):
    return dt.datetime(*a, tzinfo=ZoneInfo("Asia/Jerusalem"))


def test_shabbat_pause():
    m = {"shabbat": "margin", "margin_min": 60}
    assert not shabbat.paused(m, J(2026, 10, 23, 12, 0))[0]      # שישי בצהריים
    assert shabbat.paused(m, J(2026, 10, 23, 16, 30))[0]         # שעה לפני הדלקת נרות
    assert not shabbat.paused({"shabbat": "exact"}, J(2026, 10, 23, 16, 30))[0]
    assert shabbat.paused(m, J(2026, 10, 24, 12, 0))[0]          # שבת
    assert shabbat.paused(m, J(2026, 10, 24, 19, 15))[0]         # פחות משעה אחרי הצאת
    assert not shabbat.paused(m, J(2026, 10, 24, 20, 0))[0]      # מוצאי שבת
    assert shabbat.paused(m, J(2026, 9, 21, 12, 0))[0]           # יום כיפור
    assert not shabbat.paused({"shabbat": "off"}, J(2026, 10, 24, 12, 0))[0]


# ---------- ריצה מלאה (בלי אינטרנט): הורדה מדומה + Supabase מדומה ----------

class FakeSupa:
    def __init__(self):
        self.calls, self.rows = [], {}

    def config(self, default):
        return default

    def select(self, table, query):
        return []

    def insert(self, table, rows, on_conflict=None, ignore=False):
        self.calls.append(("insert", table, len(rows)))
        self.rows.setdefault(table, []).extend(rows)

    def update(self, table, query, values):
        self.calls.append(("update", table, query))

    def delete(self, table, query):
        self.calls.append(("delete", table, query))

    def status(self, row):
        self.rows.setdefault("collector_status", []).append(row)

    def error(self, msg, src):
        self.rows.setdefault("client_errors", []).append(msg)


def test_runner_one_chain_fails_others_continue(tmp_path, monkeypatch):
    from yam import run, scrape
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    files = {
        ("SHUFERSAL", "stores"): [("Stores7290027600007-000-202610200300.gz", gz(STORES_UPPER))],
        ("SHUFERSAL", "pricefull"): [("PriceFull7290027600007-001-202-202610200300.gz", gz(PRICE_ITEMS))],
        ("SHUFERSAL", "promofull"): [("PromoFull7290027600007-001-202-202610200300.gz", gz(PROMOS))],
    }

    def fake_download(chain, kind, dump_dir, status_dir, on_file, **kw):
        if chain == "RAMI_LEVY":
            raise TimeoutError("האתר של הרשת לא ענה")
        n = 0
        for name, raw in files.get((chain, kind), []) if kw.get("day") == dt.date.today() else []:
            p = tmp_path / name
            p.write_bytes(raw)
            on_file(kind, name, str(p))
            n += 1
        return n, []

    monkeypatch.setattr(scrape, "download", fake_download)
    monkeypatch.setattr(scrape, "cleanup", lambda *a: None)
    monkeypatch.setattr(run.geo, "geocode_cities", lambda *a, **k: 0)
    monkeypatch.setattr(run.C, "TEST_CHAINS", ["RAMI_LEVY", "SHUFERSAL"])
    r = run.Runner("test")
    fake = r.supa = FakeSupa()
    r.cfg["public"] = True
    r.run()
    st = {s["chain"]: s for s in fake.rows["collector_status"]}
    assert "TimeoutError" in st["RAMI_LEVY"]["error"] and not st["SHUFERSAL"]["error"]
    assert st["SHUFERSAL"]["stores"] == 2 and st["SHUFERSAL"]["items"] == 3
    assert any("רמי לוי" in m for m in fake.rows["client_errors"])
    prices = {p["barcode"]: p for p in fake.rows["prices"]}
    assert prices["7290000066318"]["chain"] == "שופרסל" and prices["7290000066318"]["is_deal"]
    assert prices["7290000066318"]["deal_text"].startswith("3 ב-12")
    assert prices["7290000066318"]["origin"] == "collector:SHUFERSAL"
    assert {b["ext_id"] for b in fake.rows["branches"]} == {"7290027600007:1", "7290027600007:202"}
    # ריצה שנייה בלי שינויים — לא מעלים שוב את המחירים
    before = len(fake.rows["prices"])
    r2 = run.Runner("test")
    r2.supa = fake
    r2.cfg["public"] = True
    r2.run()
    assert len(fake.rows["prices"]) == before
    # המנהל הסתיר את שופרסל בבק אופיס — המחירים שלה יורדים מהאתר, ולא עולים שוב
    r3 = run.Runner("test")
    r3.supa = fake
    r3.cfg.update(public=True, hidden=["SHUFERSAL"])
    fake.calls.clear()
    r3.run()
    assert ("delete", "prices", "origin=eq.collector%3ASHUFERSAL") in fake.calls
    assert len(fake.rows["prices"]) == before and not any(c[0] == "insert" and c[1] == "branches" for c in fake.calls)
    # המתג הראשי כבוי (ברירת המחדל) — לא מעלים כלום לאתר, רק סטטוס
    r4 = run.Runner("test")
    r4.supa = fake
    fake.calls.clear()
    r4.run()
    assert not [c for c in fake.calls if c[0] == "insert"]


def test_visible_needs_public_switch():
    from yam import chains as C
    assert not C.visible({}, "SHUFERSAL")
    assert not C.visible(C.default_config(["SHUFERSAL"]), "SHUFERSAL")
    assert C.visible({"public": True}, "SHUFERSAL")
    assert not C.visible({"public": True, "hidden": ["SHUFERSAL"]}, "SHUFERSAL")


def test_download_counts_limit_itself(tmp_path, monkeypatch):
    """הספרייה חותכת לפי limit לפני הסינון לפי תאריך — לכן לא מעבירים לה limit, וסופרים בעצמנו."""
    from yam import scrape

    class Res:
        def __init__(self, name):
            self.file_name, self.downloaded, self.error = name, True, None

    class FakeScraper:
        async def scrape(self, limit=None, files_types=None, when_date=None):
            assert limit is None
            for i in range(3):
                name = f"PriceFull7290027600007-001-00{i}-202610250300"
                (tmp_path / (name + ".gz")).write_bytes(b"x")
                yield Res(name)

    monkeypatch.setattr(scrape, "_scraper", lambda *a: (FakeScraper(), str(tmp_path)))
    got = []
    n, errors = scrape.download("SHUFERSAL", "pricefull", str(tmp_path), str(tmp_path), lambda k, name, p: got.append(name),
                                limit=1, day=dt.date(2026, 10, 25))
    assert n == 1 and got == ["PriceFull7290027600007-001-000-202610250300.gz"] and not errors


def test_api_city_spellings_and_local_products(built):
    """אותה עיר בכתיב אחר, סניף בלי מחירים לא תופס מקום, ומוצרים שנמכרים רק בעיר אחרת לא "מסתירים" את המקומיים."""
    con, api = built
    con.execute("insert into stores(key, chain, store_id, name, city) values ('9:1','YOCHANANOF','1','בני ברק','בני-ברק')")
    con.execute("insert into stores(key, chain, store_id, name, city) values ('9:2','SUPER_PHARM','2','בית מרקחת','בני ברק')")
    con.execute("insert into stores(key, chain, store_id, name, city) values ('9:3','YOCHANANOF','3','ירושלים','ירושלים')")
    bb, jm = (con.execute("select id from stores where key=?", (k,)).fetchone()[0] for k in ("9:1", "9:3"))
    yc = db.ItemCache(con, "YOCHANANOF")
    db.save_prices(con, yc, bb, [{"code": "111", "name": "חלב בקרטון יוחננוף 1 ליטר", "price": 5.5}], full=True)
    db.save_prices(con, yc, jm, [{"code": str(900 + n), "name": "חלב טרי %d%% ירושלים" % n, "price": 6} for n in range(12)], full=True)
    con.commit()
    db.rebuild_popularity(con)
    api._local.con = None
    from fastapi.testclient import TestClient
    c = TestClient(api.app)
    body = c.get("/compare", params={"items": "חלב", "city": 'ב"ב'}).json()
    keys = {s["store"] for s in body["stores"]}
    assert "9:1" in keys and "9:2" not in keys, keys
    yoch = next(s for s in body["stores"] if s["store"] == "9:1")
    assert yoch["found"] == 1 and yoch["lines"][0]["code"] == "111"
    assert c.get("/cities", params={"q": "בני"}).json()[0]["stores"] == 4


def test_full_run_one_daily_summary_and_streak_alert(tmp_path, monkeypatch):
    """רשת שלא פרסמה קובץ היום לא מקפיצה התראה משלה — רק סיכום יומי אחד; התראה נפרדת רק אחרי 3 ימים ברצף."""
    from yam import run, scrape
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setattr(scrape, "download", lambda *a, **k: (0, []))
    monkeypatch.setattr(scrape, "cleanup", lambda *a: None)
    monkeypatch.setattr(run.geo, "geocode_cities", lambda *a, **k: 0)
    monkeypatch.setattr(run.C, "enabled_chains", lambda cfg, known=None: ["NETIV_HASED", "SUPER_PHARM"])
    fake = FakeSupa()
    for day in range(1, 4):
        r = run.Runner("full")
        r.supa = fake
        r.con.execute("delete from sent_errors")  # כל ריצה מלאה ביום אחר
        r.run()
        msgs = fake.rows.get("client_errors", [])
        if day < 3:
            assert len(msgs) == day and all("סיכום יומי" in m and "2 מתוך 2" in m for m in msgs), msgs
    assert sum("סיכום יומי" in m for m in msgs) == 3
    streak = [m for m in msgs if "ימים ברצף —" in m]
    assert len(streak) == 2 and any("נתיב החסד" in m for m in streak) and all("3 ימים" in m for m in streak), msgs


def test_api_brand_and_test_only(built, monkeypatch):
    """יש חסד מוצגת כרשת נפרדת משופרסל, ואפשר לחפש סניף לפיה; ריצת בדיקה של רשתות מסוימות."""
    con, api = built
    con.execute("insert into stores(key, chain, store_id, sub_chain, name, city) values ('7:5','SHUFERSAL','5','יש חסד','רבי עקיבא','בני ברק')")
    con.execute("insert into stores(key, chain, store_id, sub_chain, name, city) values ('7:6','SHUFERSAL','6','שופרסל','דיל','בני ברק')")
    con.commit()
    api._local.con = None
    from fastapi.testclient import TestClient
    c = TestClient(api.app)
    rows = {r["store"]: r for r in c.get("/stores", params={"q": "יש חסד"}).json()}
    assert rows["7:5"]["chain_name"] == "יש חסד" and "7:6" not in rows
    assert c.get("/stores", params={"q": "דיל"}).json()[0]["chain_name"] == "שופרסל"
    from yam import run
    monkeypatch.setenv("DATA_DIR", str(con.execute("pragma database_list").fetchone()[2]).rsplit("/", 1)[0])
    assert run.Runner("test", only=["osher_ad", " "]).only == ["OSHER_AD"]


def test_split_chains(built):
    """כל תת-רשת מוצגת כרשת נפרדת: יש חסד, יש בשכונה, שופרסל דיל (שופרסל), ברכל טוב (נתיב החסד)."""
    con, api = built
    for row in [("7:21", "SHUFERSAL", "21", "יש בשכונה", "רמות"), ("7:22", "SHUFERSAL", "22", "", "יש חסד השומר"),
                ("7:23", "SHUFERSAL", "23", "BE", "BE דיזנגוף"), ("9:1", "NETIV_HASED", "1", "ברכל", "אלעד"),
                ("9:2", "NETIV_HASED", "2", "נתיב החסד", "בית שמש"), ("7:24", "SHUFERSAL", "24", "שופרסל דיל", "השלום"),
                ("7:25", "SHUFERSAL", "25", "אקספרס", "הרצל"), ("7:26", "SHUFERSAL", "26", "001", "גאולה")]:
        con.execute("insert into stores(key, chain, store_id, sub_chain, name, city) values (?,?,?,?,?,'עיר בדיקה')", row)
    con.commit()
    api._local.con = None
    from fastapi.testclient import TestClient
    c = TestClient(api.app)
    rows = {r["store"]: r for r in c.get("/stores", params={"city": "עיר בדיקה"}).json()}
    assert rows["7:21"]["chain_name"] == "יש בשכונה" and rows["7:22"]["chain_name"] == "יש חסד"
    assert rows["7:23"]["chain_name"] == "BE" and rows["7:24"]["chain_name"] == "שופרסל דיל"
    assert rows["7:25"]["chain_name"] == "שופרסל אקספרס" and rows["7:26"]["chain_name"] == "שופרסל"
    assert rows["9:1"]["chain_name"] == "ברכל טוב" and rows["9:2"]["chain_name"] == "נתיב החסד"
    assert not any("brand" in r for r in rows.values())
    assert all(rows[k]["chain"] == "SHUFERSAL" for k in ("7:21", "7:22"))  # הקוד נשאר — ההסתרה בבק אופיס לפיו
    assert {r["store"] for r in c.get("/stores", params={"q": "ברכל טוב"}).json()} == {"9:1"}


def test_api_store_search_many_words(built):
    """חיפוש סניף כמו שאנשים כותבים: שם רשת + עיר ("שופרסל בני ברק", "שופרסל בב")."""
    con, api = built
    con.execute("insert into stores(key, chain, store_id, sub_chain, name, city) values ('7:8','SHUFERSAL','8','','רבי עקיבא','בני ברק')")
    con.execute("insert into stores(key, chain, store_id, sub_chain, name, city) values ('7:9','SHUFERSAL','9','','דיזנגוף','תל אביב')")
    con.commit()
    api._local.con = None
    from fastapi.testclient import TestClient
    c = TestClient(api.app)
    keys = lambda q: {r["store"] for r in c.get("/stores", params={"q": q}).json()}
    assert "7:8" in keys("שופרסל בני ברק") and "7:9" not in keys("שופרסל בני ברק")
    assert "7:8" in keys("שופרסל בב")
    assert keys("רבי עקיבא") >= {"7:8"}


def test_city_codes_become_names(built, monkeypatch):
    """רוב הרשתות כותבות "6100" במקום "בני ברק" — שומרים את השם, ומתקנים סניפים ישנים."""
    con, api = built
    db.upsert_stores(con, "OSHER_AD", [{"chain_id": "729", "store_id": "1", "name": "אושר עד", "city": "6100"},
                                       {"chain_id": "729", "store_id": "2", "name": "יוחננוף", "city": "0"}])
    con.execute("insert into stores(key, chain, store_id, name, city) values ('729:3','OSHER_AD','3','ישן','6100')")
    con.execute("insert into city_codes(code, name) values ('3797', 'מודיעין עילית')")
    con.execute("insert into stores(key, chain, store_id, name, city) values ('729:4','OSHER_AD','4','ישן2','3797')")
    con.commit()
    city = lambda k: con.execute("select city from stores where key=?", (k,)).fetchone()[0]
    assert city("729:1") == "בני ברק" and city("729:2") == ""
    assert db.fix_city_codes(con) == 2 and city("729:3") == "בני ברק" and city("729:4") == "מודיעין עילית"
    api._local.con = None
    from fastapi.testclient import TestClient
    keys = {r["store"] for r in TestClient(api.app).get("/stores", params={"city": "בב"}).json()}
    assert {"729:1", "729:3"} <= keys


def test_load_city_codes_parses_data_gov(tmp_path, monkeypatch):
    import importlib
    from yam import geo
    geo = importlib.reload(geo)  # בלי ההחלפה של no_network_city_codes

    class R:
        ok = True
        def raise_for_status(self): pass
        def json(self):
            return {"result": {"records": [{"_id": 1, "סמל_ישוב": "6100 ", "שם_ישוב": "בני ברק ", "שם_ישוב_לועזי": "BNE BERAQ"},
                                           {"_id": 2, "סמל_ישוב": "0070", "שם_ישוב": "אשדוד"}]}}
    monkeypatch.setattr(geo.requests, "get", lambda *a, **k: R())
    con = db.connect(str(tmp_path / "p.db"))
    assert geo.load_city_codes(con) == 2
    assert dict(con.execute("select code, name from city_codes").fetchall()) == {"6100": "בני ברק", "70": "אשדוד"}


def test_free_text_synonyms_stems_and_online_store(built):
    """"סיגריות" מוצא מרלבורו, "מסכת פנים" מוצא "מסכות פנים", ואתר ההזמנות של הרשת נכנס להשוואה בכל עיר."""
    con, api = built
    shu = con.execute("select id from stores where key='7290027600007:202'").fetchone()[0]
    db.save_prices(con, db.ItemCache(con, "SHUFERSAL"), shu, [
        {"code": "7290004131074", "name": "חלב טרי 3% בקרטון תנובה 1 ליטר", "price": 7.1},
        {"code": "501", "name": "מרלבורו גולד 20 יח", "price": 40},
        {"code": "502", "name": "מסכות פנים חד פעמיות 50 יח", "price": 12.9}], full=True)
    db.upsert_stores(con, "SHUFERSAL", [{"chain_id": "7290027600007", "store_id": "413", "name": "שופרסל ONLINE", "city": "ראשון לציון"},
                                        {"chain_id": "7290027600007", "store_id": "414", "name": "סניף רגיל", "city": "חיפה", "store_type": "1"}])
    assert con.execute("select online from stores where key='7290027600007:413'").fetchone()[0] == 1
    assert con.execute("select online from stores where key='7290027600007:414'").fetchone()[0] == 0
    web = con.execute("select id from stores where key='7290027600007:413'").fetchone()[0]
    db.save_prices(con, db.ItemCache(con, "SHUFERSAL"), web, [{"code": "7290004131074", "name": "חלב טרי 3% בקרטון תנובה 1 ליטר", "price": 6.9}], full=True)
    con.commit()
    db.rebuild_popularity(con)
    api._local.con = None
    c = api.con()
    assert api.candidates(c, "סיגריות")[0] == "501"
    assert api.candidates(c, "מסכת פנים")[0] == "502"
    assert api.candidates(c, "מסיכה")[0] == "502"
    from fastapi.testclient import TestClient
    tc = TestClient(api.app)
    body = tc.get("/compare", params={"items": "חלב", "city": "בני ברק"}).json()
    online = [s for s in body["stores"] if s.get("online")]
    assert [s["store"] for s in online] == ["7290027600007:413"] and online[0]["found"] == 1
    off = tc.get("/compare", params={"items": "חלב", "city": "בני ברק", "online": 0}).json()
    assert not any(s.get("online") for s in off["stores"])


def test_stale_store_prices_are_dropped(built):
    """סניף שלא שלח קובץ מחירים שבוע — המחירים והמבצעים שלו נמחקים; סניף שעודכן נשאר."""
    con, _ = built
    stores = [r[0] for r in con.execute("select distinct store from prices")]
    assert len(stores) >= 2
    old, fresh = stores[0], stores[1]
    assert db.drop_stale(con, 7) == 0  # הריצה הראשונה רק מתחילה לספור
    con.execute("update store_fresh set at = ? where store = ?", (db.now() - 8 * 86400, old))
    con.commit()
    assert db.drop_stale(con, 7) == 1
    assert not con.execute("select 1 from prices where store=?", (old,)).fetchone()
    assert not con.execute("select 1 from promos where store=?", (old,)).fetchone()
    assert con.execute("select 1 from prices where store=?", (fresh,)).fetchone()
    # קובץ מחירים חדש מהסניף מחזיר אותו לספירה
    db.save_prices(con, db.ItemCache(con, "SHUFERSAL"), old, [{"code": "7290004131074", "name": "חלב", "price": 7.0}], full=True)
    assert con.execute("select at from store_fresh where store=?", (old,)).fetchone()[0] >= db.now() - 5


def test_full_run_chain_updated_earlier_today_is_not_failed(tmp_path, monkeypatch):
    """בריצה המלאה אין קובץ חדש (הקבצים של היום כבר הורדו בריצה שעתית, או שעוד לא פורסמו) — אבל הגיע קובץ מחירים
    ב-26 השעות האחרונות: הרשת לא נכנסת לסיכום של "לא עודכנו". רשת בלי קובץ טרי — כן."""
    from yam import run, scrape
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setattr(scrape, "download", lambda *a, **k: (0, []))
    monkeypatch.setattr(scrape, "cleanup", lambda *a: None)
    monkeypatch.setattr(run.geo, "geocode_cities", lambda *a, **k: 0)
    monkeypatch.setattr(run.C, "enabled_chains", lambda cfg, known=None: ["OSHER_AD", "NETIV_HASED"])
    r = run.Runner("full")
    r.supa = FakeSupa()
    sid = r.con.execute("insert into stores(key, chain, store_id, name) values ('1:1','OSHER_AD','1','x')").lastrowid
    old = r.con.execute("insert into stores(key, chain, store_id, name) values ('2:1','NETIV_HASED','1','y')").lastrowid
    r.con.execute("insert into store_fresh(store, at) values (?, ?)", (sid, db.now() - 3600))
    r.con.execute("insert into store_fresh(store, at) values (?, ?)", (old, db.now() - 3 * 86400))
    r.con.commit()
    r.run()
    msgs = r.supa.rows.get("client_errors", [])
    assert len(msgs) == 1 and "1 מתוך 2" in msgs[0] and "נתיב החסד" in msgs[0] and "אושר עד" not in msgs[0], msgs


def test_api_products_and_exact_choice(built):
    """"חלב תנובה" מחזיר כמה מוצרים לבחירה, ומוצר שנבחר (name#barcode) מושווה רק לפי הברקוד, עם השם שהמשתמש כתב."""
    con, api = built
    shu = con.execute("select id from stores where key='7290027600007:202'").fetchone()[0]
    db.save_prices(con, db.ItemCache(con, "SHUFERSAL"), shu, [{"code": "7290004127701", "name": "חלב תנובה 3% בשקית 1 ליטר", "price": 5.9}], full=False)
    con.commit()
    db.rebuild_popularity(con)
    api._local.con = None
    from fastapi.testclient import TestClient
    c = TestClient(api.app)
    ps = c.get("/products", params={"q": "חלב תנובה"}).json()
    codes = [p["code"] for p in ps]
    assert "7290004131074" in codes and "7290004127701" in codes, ps
    carton = next(p for p in ps if p["code"] == "7290004131074")
    assert carton["stores"] == 2 and carton["chains"] == 2 and carton["min"] == 6.5 and carton["max"] == 7.1
    assert c.get("/products", params={"q": "חלב תנובה", "exclude": "RAMI_LEVY"}).json()[0]["chains"] == 1
    assert c.get("/products", params={"q": "ח"}).status_code == 422
    body = c.get("/compare", params={"items": "חלב תנובה#7290004127701*2", "city": "בני ברק"}).json()
    assert body["items"][0] == {"q": "חלב תנובה", "qty": 2, "code": "7290004127701"}
    by = {s["chain"]: s for s in body["stores"]}
    assert by["SHUFERSAL"]["lines"][0]["code"] == "7290004127701" and by["SHUFERSAL"]["lines"][0]["q"] == "חלב תנובה"
    assert by["SHUFERSAL"]["total"] == 11.8
    # ברמי לוי אין את השקית — לא מחליפים במוצר אחר
    assert "RAMI_LEVY" not in by or not by["RAMI_LEVY"]["lines"][0]["found"]
    p = c.get("/prices", params={"store": "7290027600007:202", "items": "חלב#7290004127701"}).json()
    assert [m["code"] for m in p["items"][0]["matches"]] == ["7290004127701"]
def test_own_server_and_internal_never_flagged_or_blocked(built, tmp_path):
    """השרת שלנו (127.0.0.1, רשת פנימית, הכתובת שלנו ב-DNS) לא נחשב חשוד ואי אפשר לחסום אותו, גם אם הוסיפו לרשימה."""
    _, api = built
    (tmp_path / "blocked.json").write_text('{"ips": ["127.0.0.1", "10.0.0.0/8", "84.13.86.86", "84.13.0.0/16", "1.0.0.0/4", "45.83.64.9"], "self": ["84.13.86.86"]}')
    b = watch.Blocklist(str(tmp_path / "blocked.json"))
    assert not b.blocked("127.0.0.1") and not b.blocked("10.1.2.3") and not b.blocked("84.13.86.86")
    assert not b.blocked("84.13.5.5")  # הטווח כולל את השרת שלנו — לא נחסם בכלל
    assert not b.blocked("2.3.4.5")    # טווח ענק לא נחסם
    assert b.blocked("45.83.64.9")
    w = watch.Watch(str(tmp_path / "w.db"))
    for ip in ("127.0.0.1", "84.13.86.86", "45.83.64.9"):
        for _ in range(60):
            w.note(ip, ip, False, "curl/8", "/prices", 200, store="s")
    w.flush()
    by = {r["ip"]: r for r in watch.report(w.path, own={"84.13.86.86"})[0]}
    assert by["127.0.0.1"]["own"] and by["127.0.0.1"]["score"] == 0
    assert by["84.13.86.86"]["own"] and by["84.13.86.86"]["reasons"] == []
    assert not by["45.83.64.9"]["own"] and by["45.83.64.9"]["score"] >= 3


def test_known_labels():
    from yam import run
    assert run.known_label("160.79.106.131", "curl/8", "") == "claude"
    assert run.known_label("66.249.66.1", "Mozilla/5.0 (compatible; Googlebot/2.1)", "GOOGLE") == "searchbot"
    assert run.known_label("45.83.64.9", "Googlebot/2.1", "M247 Europe") == ""  # מתחזה לגוגל
    assert run.known_label("45.83.64.9", "python-requests", "M247 Europe") == ""


def _mmdb(path, records, dbtype):
    from mmdb_writer import MMDBWriter
    from netaddr import IPSet
    w = MMDBWriter(ip_version=6, ipv4_compatible=True, database_type=dbtype)
    for net, rec in records:
        w.insert_network(IPSet([net]), rec)
    w.to_db_file(str(path))


def test_geoip_lookup(tmp_path):
    pytest.importorskip("mmdb_writer")
    from yam import geoip
    _mmdb(tmp_path / "city.mmdb", [("45.83.64.0/24", {"country": {"iso_code": "NL", "names": {"en": "Netherlands"}},
                                                       "subdivisions": [{"names": {"en": "North Holland"}}],
                                                       "city": {"names": {"en": "Amsterdam"}},
                                                       "location": {"latitude": 52.3740, "longitude": 4.8897}})], "DBIP-City-Lite")
    _mmdb(tmp_path / "asn.mmdb", [("45.83.64.0/24", {"autonomous_system_number": 9009, "autonomous_system_organization": "M247 Europe SRL"})], "DBIP-ASN-Lite")
    g = geoip.Geo(str(tmp_path))
    d = g.lookup("45.83.64.9")
    assert d["country"] == "הולנד" and d["city"] == "Amsterdam" and d["region"] == "North Holland"
    assert d["lat"] == 52.374 and d["org"] == "M247 Europe SRL" and d["asn"] == 9009 and d["hosting"] is True
    assert g.lookup("127.0.0.1") == {} and g.lookup("nonsense") == {}
    assert geoip.ip_key("2a02:6680:1100:9f6d:1234::1") == "2a02:6680:1100:9f6d::/64" and geoip.ip_key("1.2.3.4") == "1.2.3.4"


def test_enrich_accounts_and_geo(tmp_path, monkeypatch):
    """לכל כתובת: מיקום, ומי החשבון — לפי כניסות מאותה כתובת (אמין), לפי מה שהאתר שלח, ואורח שנרשם אחר כך."""
    from yam import geoip, run
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setattr(geoip, "ensure", lambda folder, session=None: None)

    class G:
        def __init__(self, folder):
            pass

        def lookup(self, ip):
            return {"country": "הולנד", "city": "Amsterdam", "org": "M247 Europe SRL", "hosting": True, "lat": 52.37, "lng": 4.89}
    monkeypatch.setattr(geoip, "Geo", G)
    U1, U2, U3, G1, G2 = ("11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222",
                          "33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444",
                          "55555555-5555-4555-8555-555555555555")

    class FakeSupa:
        def __init__(self):
            self.queries = []

        def select(self, table, query):
            self.queries.append((table, query))
            if table == "auth_events":
                assert "45.83.64.9" in query and "2a02%3A6680%3A1100%3A9f6d%3A%3A%2F64" in query
                return [{"ip": "45.83.64.9", "user_id": U1, "email": "a@x.com", "kind": "login", "created_at": "2026-10-29T08:00:00Z"}]
            if table == "guest_visits":
                return [{"id": G1, "converted_user": U3, "visits": 4, "first_at": "2026-10-01T00:00:00Z"},
                        {"id": G2, "converted_user": None, "visits": 2, "first_at": "2026-10-20T00:00:00Z"}]
            if table == "profiles":
                return [{"id": U1, "name": "משה", "email": "a@x.com"}, {"id": U2, "name": "יעקב", "email": "b@x.com"},
                        {"id": U3, "name": "דוד", "email": "c@x.com"}]
            return []

    r = run.Runner.__new__(run.Runner)
    r.data, r.mode, r.supa = str(tmp_path), "hourly", FakeSupa()
    rows = [{"ip": "45.83.64.9", "ua": "python-requests/2", "n": 500, "own": False, "reasons": ["bot"], "score": 2,
             "who": ["u:" + U2, "g:" + G1, "g:" + G2]},
            {"ip": "2a02:6680:1100:9f6d:1234::1", "ua": "Mozilla/5.0", "n": 3, "own": False, "reasons": [], "score": 0, "who": []},
            {"ip": "84.13.86.86", "ua": "curl", "n": 9, "own": True, "reasons": [], "score": 0, "who": []}]
    r.enrich(rows)
    a = rows[0]
    assert a["geo"]["city"] == "Amsterdam" and "hosting" in a["reasons"] and a["score"] == 3
    how = {(x["how"], x.get("email") or x.get("guest")) for x in a["accounts"]}
    assert how == {("login", "a@x.com"), ("site", "b@x.com"), ("guest_signup", "c@x.com"), ("guest", G2)}
    assert rows[2]["geo"] == {"label": "own"} and rows[2]["accounts"] == []


def test_site_sends_who(built):
    """האתר שולח מי המשתמש (X-Yam-Who) — נשמר כרמז לכל כתובת. ערך לא תקין לא נשמר."""
    _, api = built
    from fastapi.testclient import TestClient
    c = TestClient(api.app)
    U = "u:11111111-1111-4111-8111-111111111111"
    c.get("/health", headers={"X-Yam-Who": U, "User-Agent": "Mozilla/5.0 Chrome"})
    c.get("/health", headers={"X-Yam-Who": "u:'; drop table", "User-Agent": "curl/8"})
    api.watcher.flush()
    r = watch.report(api.watcher.path)[0][0]
    assert r["who"] == [U] and sorted(r["uas"]) == ["Mozilla/5.0 Chrome", "curl/8"]


def test_hourly_skips_gentle_chains(tmp_path, monkeypatch):
    """רשתות שהאתר שלהן חוסם עומס (laibcatalog) — רק בריצה המלאה, עם הורדה אחת בכל פעם."""
    from yam import run, scrape
    seen = []
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setattr(scrape, "download", lambda chain, kind, *a, **k: (seen.append((chain, k.get("threads"))), (0, []))[1])
    monkeypatch.setattr(scrape, "cleanup", lambda *a: None)
    monkeypatch.setattr(run.geo, "geocode_cities", lambda *a, **k: 0)
    monkeypatch.setattr(run.C, "enabled_chains", lambda cfg, known=None: ["VICTORY_NEW_SOURCE", "RAMI_LEVY"])
    run.Runner("hourly").run()
    assert {c for c, _ in seen} == {"RAMI_LEVY"}
    seen.clear()
    run.Runner("full").run()
    assert {t for c, t in seen if c == "VICTORY_NEW_SOURCE"} == {1}


def test_apk_geo_sync(tmp_path, monkeypatch):
    """להורדות האפליקציה בלי מיקום — מוסיפים עיר ומדינה לפי ה-IP, פעם אחת לכל כתובת; השרת שלנו מסומן own."""
    from yam import geoip, run
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setattr(geoip, "ensure", lambda folder, session=None: None)
    looked = []

    class G:
        def __init__(self, folder):
            pass

        def lookup(self, ip):
            looked.append(ip)
            return {"country": "ישראל", "city": "Bnei Brak", "org": "Partner", "asn": 12400, "hosting": False}
    monkeypatch.setattr(geoip, "Geo", G)
    monkeypatch.setattr(run, "own_ips", lambda: {"84.13.86.86"})

    class FakeSupa:
        def __init__(self):
            self.updates = []

        def select(self, table, query):
            assert table == "apk_downloads" and "geo=is.null" in query
            return [{"id": 1, "ip": "198.51.100.7"}, {"id": 2, "ip": "198.51.100.7"}, {"id": 3, "ip": "84.13.86.86"}]

        def update(self, table, query, values):
            self.updates.append((query, values))

    r = run.Runner.__new__(run.Runner)
    r.data, r.mode, r.supa = str(tmp_path), "hourly", FakeSupa()
    r.apk_geo_sync()
    assert looked == ["198.51.100.7"]
    assert r.supa.updates[0] == ("id=eq.1", {"geo": {"country": "ישראל", "city": "Bnei Brak", "org": "Partner", "hosting": False}})
    assert r.supa.updates[2] == ("id=eq.3", {"geo": {"label": "own"}})


def test_api_deals_per_store(built):
    _, api = built
    from fastapi.testclient import TestClient
    c = TestClient(api.app)
    near = c.get("/stores", params={"lat": 32.09, "lng": 34.84}).json()
    keys = ",".join(s["store"] for s in near)
    body = c.get("/deals", params={"stores": keys}).json()
    shu = next(s for s in body["stores"] if s["store"]["store"] == "7290027600007:202")
    assert [d["code"] for d in shu["deals"]] == ["7290000066318"]  # מבצע מועדון לא מופיע
    d = shu["deals"][0]
    assert d["qty"] == 3 and d["deal_price"] == 12 and d["regular"] == 17.7 and d["save"] == 5.7 and d["text"] == "במבה 3 ב-12"
    assert c.get("/deals", params={"stores": keys, "exclude": "SHUFERSAL"}).json()["stores"][0]["store"]["chain"] != "SHUFERSAL"
    assert c.get("/deals", params={"stores": ""}).status_code in (400, 422)


def test_direct_to_server_blocked_site_passes(built, monkeypatch, tmp_path):
    """🛡️ האתר פונה רק דרך www.yamshopping.com/api/prices. מי שפונה ישירות ל-server.yamshopping.com נחסם מיד,
    חוץ מ-/health והשרת שלנו. ניסיון פריצה (/.env וכו') נחסם בכל דרך, ונרשם לשומר בשרת."""
    _, api = built
    from fastapi.testclient import TestClient
    import json
    monkeypatch.setattr(api, "SHIELD_FILE", str(tmp_path / "shield-api.jsonl"))
    api._shield_seen.clear()
    c = TestClient(api.app)
    direct = {"Host": "server.yamshopping.com", "User-Agent": "python-requests/2.32"}
    r = c.get("/compare", params={"items": "חלב", "city": "בני ברק"}, headers=direct)
    assert r.status_code == 403 and "www.yamshopping.com" in r.json()["error"]
    # גם עם Referer מזויף של האתר — עדיין ישירות לשרת
    assert c.get("/chains", headers=dict(direct, Referer="https://www.yamshopping.com/")).status_code == 403
    assert c.get("/health", headers=direct).status_code == 200
    # דרך האתר: Caddy של www מעביר עם X-Forwarded-Host של www (גם אם ה-Host הוא של השרת)
    via_site = {"Host": "127.0.0.1:8088", "X-Forwarded-Host": "www.yamshopping.com"}
    assert c.get("/compare", params={"items": "חלב", "city": "בני ברק"}, headers=via_site).status_code == 200
    assert c.get("/chains", headers={"Host": "server.yamshopping.com", "X-Forwarded-Host": "www.yamshopping.com"}).status_code == 200
    # ניסיון פריצה — גם דרך האתר
    assert c.get("/.env", headers=via_site).status_code == 403
    assert c.get("/wp-login.php", headers=direct).status_code == 403
    lines = [json.loads(x) for x in (tmp_path / "shield-api.jsonl").read_text().splitlines()]
    kinds = {(x["kind"], x["path"].split("?")[0]) for x in lines}
    assert ("direct", "/compare") in kinds and ("probe", "/.env") in kinds
    assert sum(1 for x in lines if x["kind"] == "direct") == 1  # כל כתובת פעם בדקה, לא שורה לכל בקשה
    # השרת שלנו לא נחסם
    (tmp_path / "blocked.json").write_text('{"ips": [], "self": ["testclient"]}')
    monkeypatch.setattr(api, "is_own", lambda ip: True)
    assert c.get("/chains", headers=direct).status_code == 200
    # מצב "הגבלה" (כמו קודם) במקום חסימה
    monkeypatch.setattr(api, "is_own", lambda ip: False)
    monkeypatch.setattr(api, "DIRECT_MODE", "limit")
    assert c.get("/chains", headers=direct).status_code == 200


# ---------- 🛡️ חומת ההגנה בשרת (yam/shield.py) ----------

def test_shield_settings_safe_defaults():
    from yam import shield as S
    c = S.settings({"rate": "abc", "burst": 5, "conns": 10 ** 9, "allow": "x", "blocked": [{"ip": "1.2.3.4"}, "bad"], "on": False})
    assert c["rate"] == 40 and c["burst"] == 20 and c["conns"] == 100000 and c["allow"] == [] and c["blocked"] == ["1.2.3.4"]
    assert c["on"] is False and S.settings(None)["on"] is True


def test_shield_never_blocks_own_internal_huge_or_allowed():
    from yam import shield as S
    allow = [S.net("198.51.100.0/24"), S.net("66.249.64.0/27")]  # למשל Googlebot
    assert S.blockable("10.1.2.3", allow) is None and S.blockable("127.0.0.1", allow) is None
    assert S.blockable("1.0.0.0/8", allow) is None  # טווח ענק
    assert S.blockable("198.51.100.7", allow) is None and S.blockable("66.249.64.5", allow) is None
    assert S.blockable("198.51.0.0/16", allow) is None  # טווח שכולל כתובת מותרת
    assert str(S.blockable("45.83.64.9", allow)) == "45.83.64.9/32"


def test_shield_rules_and_attack_mode():
    from yam import shield as S
    c = S.settings({"rate": 30, "burst": 150, "conns": 300, "shared_mult": 10, "block_min": 10})
    r = S.rules(c)
    assert "limit rate over 30/second burst 150 packets" in r and "limit rate over 300/second burst 1500 packets" in r
    assert "th dport { 80, 443 } jump web" in r and "ct count over 300" in r and "timeout 10m" in r
    assert "tcp dport 22 ip saddr @ssh4" in r  # SSH נחסם רק למי שניחש סיסמאות
    a = S.rules(c, attack=True)
    assert "limit rate over 10/second burst 50 packets" in a and "@mx4" in a and "ct count over 100" in a
    hist = [100, 120, 90, 110, 105, 95]
    assert S.is_attack(hist, 5000, c) == (True, 102)
    assert S.is_attack(hist, 600, c)[0] is False  # עלייה רגילה (למשל ערב שבת) — לא התקפה
    assert S.is_attack([], 50000, c)[0] is True and S.is_attack(hist, 2000, c)[0] is False


def test_shield_ssh_parse():
    from yam import shield as S
    log = ("Failed password for root from 45.83.64.5 port 22 ssh2\nInvalid user admin from 45.83.64.5 port 4022\n"
           "Connection closed by authenticating user ubuntu 2001:db8::7 port 5 [preauth]\nAccepted publickey for ubuntu from 1.1.1.1 port 2")
    found = [m.group(1) for m in S.SSH_RE.finditer(log)]
    assert found == ["45.83.64.5", "45.83.64.5", "2001:db8::7"]


def test_shield_reads_api_events_and_blocks(tmp_path, monkeypatch):
    """ניסיון פריצה → חסימה ל-24 שעות; פנייה ישירה → שעה; כתובת משותפת (נטפרי) ומותרת — לא נחסמות בחומת האש."""
    from yam import shield as S
    import json
    added = []
    monkeypatch.setattr(S, "add_timed", lambda name, ip, mins: added.append((name, ip, mins)) or True)
    sh = S.Shield.__new__(S.Shield)
    sh.api_file = str(tmp_path / "shield-api.jsonl")
    sh.cfg = S.settings({})
    sh.own, sh.bots, sh.ip_allow, sh.known = {"84.13.86.86"}, ["66.249.64.0/27"], ["9.9.9.0/24"], ([], ["2.2.2.2"])
    sh.events, sh.api_counts, sh.geo = [], __import__("collections").Counter(), None
    lines = [{"kind": "probe", "ip": "45.83.64.5", "path": "/.env"}, {"kind": "direct", "ip": "45.83.64.6", "path": "/compare"},
             {"kind": "direct", "ip": "2.2.2.2", "path": "/chains"}, {"kind": "probe", "ip": "84.13.86.86", "path": "/.git"},
             {"kind": "probe", "ip": "9.9.9.9", "path": "/.env"}, {"kind": "probe", "ip": "66.249.64.3", "path": "/x.php"}, "not json"]
    (tmp_path / "shield-api.jsonl").write_text("\n".join(json.dumps(x) for x in lines))
    sh.read_api()
    assert added == [("auto", "45.83.64.5", 24 * 60), ("auto", "45.83.64.6", 60)]
    ev = {(e["kind"], e["ip"]): e for e in sh.events}
    assert set(ev) == {("probe", "45.83.64.5"), ("direct", "45.83.64.6"), ("direct", "2.2.2.2")}
    assert ev[("direct", "2.2.2.2")]["detail"]["shared"] is True and ev[("direct", "2.2.2.2")]["detail"]["min"] == 0
    assert not (tmp_path / "shield-api.jsonl").exists()  # נקרא פעם אחת ונמחק
