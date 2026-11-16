"""פענוח קבצי שקיפות מחירים מכל הרשתות.

כל רשת כותבת קצת אחרת, אז הקוד סלחני:
• דחיסה: gz, zip, או קובץ רגיל (מזהים לפי הבייטים הראשונים, לא לפי הסיומת).
• קידוד: UTF-8, UTF-16 (עם או בלי BOM), ו-windows-1255 כגיבוי.
• שמות תגיות: Item או Product, Promotion או Sale, Store או Branch, באותיות גדולות או קטנות, עם או בלי namespace.
• הקובץ נקרא בזרימה (רשומה אחר רשומה) ולא נטען כולו לעץ, כדי שיעבוד גם בשרת עם 1GB זיכרון.
"""
import gzip
import io
import re
import zipfile
import xml.etree.ElementTree as ET

MAX_UNZIPPED = 400 * 1024 * 1024  # קובץ אחד לא יותר מ-400MB אחרי פריסה

# ---------- קריאת הבייטים ----------

def read_bytes(path_or_bytes) -> bytes:
    raw = path_or_bytes
    if not isinstance(raw, (bytes, bytearray)):
        with open(path_or_bytes, "rb") as f:
            raw = f.read()
    raw = bytes(raw)
    for _ in range(3):  # לפעמים zip בתוך gz
        if raw[:2] == b"\x1f\x8b":
            with gzip.GzipFile(fileobj=io.BytesIO(raw)) as g:
                raw = g.read(MAX_UNZIPPED + 1)
        elif raw[:4] == b"PK\x03\x04":
            with zipfile.ZipFile(io.BytesIO(raw)) as z:
                names = [n for n in z.namelist() if not n.endswith("/")]
                if not names:
                    return b""
                names.sort(key=lambda n: (not n.lower().endswith(".xml"), -z.getinfo(n).file_size))
                with z.open(names[0]) as f:
                    raw = f.read(MAX_UNZIPPED + 1)
        else:
            break
        if len(raw) > MAX_UNZIPPED:
            raise ValueError("הקובץ גדול מדי אחרי פריסה")
    return raw


def decode(raw: bytes) -> str:
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff"):
        return raw.decode("utf-16")
    if raw[:3] == b"\xef\xbb\xbf":
        raw = raw[3:]
    # UTF-16 בלי BOM: כל תו שני הוא אפס
    head = raw[:200]
    if len(head) > 10 and head[1::2].count(0) > len(head) // 4:
        return raw.decode("utf-16-le", errors="replace")
    if len(head) > 10 and head[0::2].count(0) > len(head) // 4:
        return raw.decode("utf-16-be", errors="replace")
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return raw.decode("windows-1255")
        except UnicodeDecodeError:
            return raw.decode("utf-8", errors="replace")


_DECL = re.compile(r"^\s*<\?xml[^>]*\?>", re.S)
# תווי בקרה שאסורים ב-XML (קורה בקבצים של חלק מהרשתות)
_BAD = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
# & שלא מתחיל ישות תקינה
_AMP = re.compile(r"&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)")


def load_text(path_or_bytes) -> str:
    text = decode(read_bytes(path_or_bytes))
    text = _DECL.sub("", text.lstrip("﻿"), count=1)
    text = _BAD.sub("", text)
    return _AMP.sub("&amp;", text)


# ---------- מעבר על הרשומות ----------

def local(tag) -> str:
    if not isinstance(tag, str):
        return ""
    return tag.rsplit("}", 1)[-1].rsplit(":", 1)[-1].lower()


def _txt(el) -> str:
    return (el.text or "").strip()


def iter_records(text: str, record_tags, key_fields):
    """מחזיר (רשומה, הקשר) לכל רשומה. רשומה = מילון של כל העלים שבתוכה (שמות באותיות קטנות).
    הקשר = עלים שמחוץ לרשומות (למשל ChainId ו-StoreId בראש הקובץ)."""
    record_tags = set(record_tags)
    key_fields = set(key_fields)
    parser = ET.XMLPullParser(events=("start", "end"))
    ctx = {}
    depth = 0  # כמה רשומות פתוחות כרגע
    pos = 0
    step = 1 << 20
    while True:
        chunk = text[pos:pos + step]
        pos += step
        if chunk:
            parser.feed(chunk)
        else:
            parser.close()
        for ev, el in parser.read_events():
            name = local(el.tag)
            if ev == "start":
                if name in record_tags:
                    depth += 1
                continue
            if name in record_tags:
                depth -= 1
                rec = {}
                codes, clubs = [], []
                for sub in el.iter():
                    if sub is el or len(sub):
                        continue
                    k = local(sub.tag)
                    v = _txt(sub)
                    if not v:
                        continue
                    if k in ("itemcode", "itemcd"):
                        codes.append(v)
                    elif k == "clubid":
                        clubs.append(v)
                    rec.setdefault(k, v)
                if key_fields & rec.keys():
                    rec["_codes"] = codes
                    rec["_clubs"] = clubs
                    yield rec, ctx
                    el.clear()
            elif depth == 0 and not len(el):
                v = _txt(el)
                if v:
                    ctx[name] = v
        if not chunk:
            break


# ---------- עזרים ----------

def num(v, default=None):
    if v is None:
        return default
    s = str(v).strip().replace(",", ".")
    try:
        return float(s)
    except ValueError:
        m = re.search(r"-?\d+(?:\.\d+)?", s)
        return float(m.group()) if m else default


def first(rec, *names, default=""):
    for n in names:
        v = rec.get(n)
        if v not in (None, ""):
            return v
    return default


def clean_code(v) -> str:
    return re.sub(r"\D", "", str(v or "")).lstrip("0") or ""


_FILE_IDS = re.compile(r"(\d{13})-(?:(\d{1,3})-)?(\d{1,4})-")


def ids_from_filename(name: str):
    """PriceFull7290027600007-001-202508250300 ← (chain_id, store_id)"""
    m = _FILE_IDS.search(name or "")
    if not m:
        return "", ""
    return m.group(1), str(int(m.group(3)))


def kind_of(name: str) -> str:
    n = (name or "").lower()
    if "store" in n:
        return "stores"
    if "promofull" in n:
        return "promofull"
    if "promo" in n:
        return "promo"
    if "pricefull" in n:
        return "pricefull"
    if "price" in n:
        return "price"
    return ""


# ---------- סוגי הקבצים ----------

def parse_prices(path_or_bytes, file_name=""):
    """Price / PriceFull ← (chain_id, store_id, [פריטים])"""
    text = load_text(path_or_bytes)
    items, ctx = [], {}
    for rec, ctx in iter_records(text, ("item", "product"), ("itemcode", "itemcd", "barcode", "itemid")):
        code = clean_code(first(rec, "itemcode", "itemcd", "barcode", "itemid"))
        price = num(first(rec, "itemprice", "price"))
        if not code or price is None or not (0 < price < 100000):
            continue
        name = first(rec, "itemname", "itemnm", "manufactureritemdescription", "productname", "itemdescription")
        items.append({
            "code": code[:20],
            "name": re.sub(r"\s+", " ", name).strip()[:120],
            "price": round(price, 2),
            "unit_price": num(first(rec, "unitofmeasureprice")),
            "manufacturer": first(rec, "manufacturername", "manufacturename", "manufacturer")[:80],
            "qty": num(first(rec, "quantity", "qtyinpackage")),
            "unit": first(rec, "unitqty", "unitofmeasure")[:20],
            "weighted": 1 if str(first(rec, "bisweighted", "isweighted")).strip().lower() in ("1", "true") else 0,
            "updated": first(rec, "priceupdatedate", "updatedate"),
        })
    chain_id = first(ctx, "chainid", "chain_id")
    store_id = first(ctx, "storeid", "store_id")
    fid_chain, fid_store = ids_from_filename(file_name)
    chain_id = re.sub(r"\D", "", chain_id) or fid_chain
    store_id = str(int(re.sub(r"\D", "", store_id))) if re.sub(r"\D", "", store_id) else fid_store
    return chain_id, store_id, items


def parse_stores(path_or_bytes, file_name=""):
    """Stores ← [סניפים]"""
    text = load_text(path_or_bytes)
    out = []
    for rec, ctx in iter_records(text, ("store", "branch"), ("storeid", "store_id")):
        sid = re.sub(r"\D", "", first(rec, "storeid", "store_id"))
        if not sid:
            continue
        chain_id = re.sub(r"\D", "", first(rec, "chainid", default=first(ctx, "chainid"))) or ids_from_filename(file_name)[0]
        out.append({
            "chain_id": chain_id,
            "sub_chain_id": first(rec, "subchainid", default=first(ctx, "subchainid")),
            "sub_chain_name": first(rec, "subchainname", default=first(ctx, "subchainname"))[:60],
            "store_id": str(int(sid)),
            "name": first(rec, "storename", "branchname", "name")[:60],
            "address": first(rec, "address", "storeaddress")[:120],
            "city": first(rec, "city", "storecity")[:40],
            "zip": first(rec, "zipcode", "zip")[:10],
            "store_type": first(rec, "storetype"),
        })
    return out


PUBLIC_CLUBS = {"", "0", "כלל הלקוחות", "0 - כלל הלקוחות"}

# מבצע שתלוי באמצעי תשלום ("הנחת סיבוס 50 ש\"ח", "10% בכרטיס ישראכרט") — הרשת מסמנת אותו "לכל הלקוחות",
# אבל מי שמשלם במזומן או באשראי רגיל לא מקבל אותו. מתייחסים אליו כמו למבצע מועדון: לא מוצג ולא נכנס להשוואת המחירים.
PAYMENT_ONLY = re.compile(
    r"סיבוס|cibus|תן ?ביס|10 ?bis|פלאקסי|פלוקסי|pluxee|גודי|goodi|"
    r"בכרטיס|כרטיס אשראי|ויזה|visa|מאסטרקארד|mastercard|ישראכרט|isracard|אמריקן אקספרס|american express|"
    r"דיינרס|diners|לאומי קארד|\bכאל\b|\bcal\b|בתשלום ב",
    re.I)


def payment_only(description):
    return bool(PAYMENT_ONLY.search(description or ""))


def _when(rec, d, h):
    day = first(rec, d)
    hour = first(rec, h)
    if not day:
        return ""
    if "T" in day or " " in day:
        return day.replace("T", " ")[:19]
    return (day + " " + (hour or "00:00:00"))[:19]


def parse_promos(path_or_bytes, file_name=""):
    """Promo / PromoFull ← (chain_id, store_id, [מבצעים])"""
    text = load_text(path_or_bytes)
    promos, ctx = {}, {}
    for rec, ctx in iter_records(text, ("promotion", "sale"), ("promotionid", "promotion_id")):
        pid = first(rec, "promotionid", "promotion_id")
        if not pid:
            continue
        p = promos.get(pid)
        if p is None:
            clubs = [c.strip() for c in rec["_clubs"]] or [""]
            p = promos[pid] = {
                "promo_id": pid[:40],
                "description": re.sub(r"\s+", " ", first(rec, "promotiondescription", "description")).strip()[:120],
                "start": _when(rec, "promotionstartdate", "promotionstarthour"),
                "end": _when(rec, "promotionenddate", "promotionendhour"),
                "min_qty": num(first(rec, "minqty")),
                "max_qty": num(first(rec, "maxqty")),
                "discounted_price": num(first(rec, "discountedprice")),
                "discount_rate": num(first(rec, "discountrate")),
                "reward_type": first(rec, "rewardtype")[:10],
                "public": 1 if any(c in PUBLIC_CLUBS for c in clubs) else 0,
                "codes": set(),
            }
        for c in rec["_codes"]:
            c = clean_code(c)
            if c:
                p["codes"].add(c[:20])
    for p in promos.values():
        if payment_only(p["description"]):
            p["public"] = 0
    chain_id = re.sub(r"\D", "", first(ctx, "chainid")) or ids_from_filename(file_name)[0]
    sid = re.sub(r"\D", "", first(ctx, "storeid"))
    store_id = str(int(sid)) if sid else ids_from_filename(file_name)[1]
    return chain_id, store_id, list(promos.values())
