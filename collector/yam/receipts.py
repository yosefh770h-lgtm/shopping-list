"""🔗 קבלה דיגיטלית מקישור (GET /receipt?u=<הקישור>) — דרך השרת הזה, כי הוא בארץ (Pairzon של אושר עד לא עונה לשרתים בחו"ל).

1. אתרי קבלות שבונים את הקבלה רק בדפדפן — קוראים ישירות את הנתונים המסודרים (JSON): מדויק, מהיר ובלי בינה מלאכותית.
     Pairzon (אושר עד ועוד):  https://<רשת>.pairzon.com/<...>.html?id=<GUID>&p=<מספר>  ← /v1.0/documents/<id>?p=<p>
     Weezmo (ג'מבו ועוד):     https://receipts.weezmo.com/cms.html?q=<GUID>             ← /api/receipts/<q>
   מוחזרים רק שם הרשת, הסניף, התאריך, הסה"כ והמוצרים — לא פרטי תשלום ולא פרטים אישיים.
2. כל קישור אחר — מביאים את הדף פעם אחת ומחזירים טקסט / PDF / תמונה, והאתר שולח אותם לקריאה כמו קבלה מצולמת.
   הגנות (כדי שאי אפשר יהיה להשתמש בשרת כמעבר): רק https/http בפורטים הרגילים, רק כתובות ציבוריות (לא השרת עצמו, לא רשת פנימית,
   לא כתובת המטא-דאטה של אורקל) — נבדק גם אחרי כל הפניה, עד 4 הפניות, 6MB, 12 שניות, ומכסה נפרדת לכל משתמש (api.py).
שום דבר לא נשמר — לא הקישור ולא התוכן (גם לא ביומן הניטור).
"""
import base64
import html as htmllib
import ipaddress
import re
import socket
from urllib.parse import urljoin, urlsplit, parse_qs

import requests

GUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
PAIRZON = re.compile(r"^[a-z0-9-]{1,40}\.pairzon\.com$")
UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36"


def api_for(url):
    """(סוג, כתובת הנתונים) לקישור של קבלה מאתר מוכר, או None"""
    try:
        u = urlsplit(str(url or "").strip()[:2000])
    except ValueError:
        return None
    if u.scheme != "https" or u.port not in (None, 443) or u.username or u.password:
        return None
    h, q = (u.hostname or "").lower(), parse_qs(u.query)
    one = lambda k: (q.get(k) or [""])[0]
    if PAIRZON.match(h) and GUID.match(one("id")) and re.fullmatch(r"\d{1,10}", one("p")):
        return "pairzon", f"https://{h}/v1.0/documents/{one('id')}?p={one('p')}"
    if h == "receipts.weezmo.com" and GUID.match(one("q")):
        return "weezmo", f"https://receipts.weezmo.com/api/receipts/{one('q')}?withTemplate=false"
    return None


def _num(x):
    try:
        v = float(str(x).replace(",", ".")) if x is not None and x != "" else 0.0
    except ValueError:
        return 0.0
    return v if v == v and abs(v) != float("inf") else 0.0


def _s(x, n=80):
    return re.sub(r"\s+", " ", str(x or "")).strip()[:n]


def _day(x):
    m = re.match(r"^(\d{4}-\d{2}-\d{2})", str(x or ""))
    return m.group(1) if m else ""


def to_receipt(kind, d):
    """הנתונים של האתר ← הקבלה במבנה של מסך האישור באתר (כמו מה שהבינה המלאכותית מחזירה מצילום)"""
    if kind == "weezmo" and isinstance(d, list):
        d = d[0] if d else None
    if kind == "weezmo" and isinstance(d, dict) and isinstance(d.get("receipt"), dict):
        d = d["receipt"]
    if not isinstance(d, dict) or not isinstance(d.get("items"), list):
        return None
    items = []
    for it in d["items"][:300]:
        if not isinstance(it, dict):
            continue
        name = _s(it.get("name"), 60)
        if not name:
            continue
        # מוצר במשקל (Pairzon): weight בגרמים, price למחיר לק"ג, בלי quantity
        kg = round(_num(it.get("weight"))) / 1000 if kind == "pairzon" and _num(it.get("weight")) > 0 and not _num(it.get("quantity")) > 0 else 0
        qty = kg or _num(it.get("quantity")) or 1
        tot, lst = round(_num(it.get("total")), 2), _num(it.get("price"))
        paid = round(tot / qty, 2) if qty else lst
        code = str(it.get("code") or it.get("itemCode") or "")
        row = {"name": name, "qty": qty, "price": paid or lst, "total": tot, "barcode": code if re.fullmatch(r"\d{4,20}", code) else ""}
        if kg:
            row["unit"] = "ק״ג"
        if lst > 0 and paid > 0 and abs(lst - paid) >= 0.01:
            # שם המבצע (Pairzon: additionalInfo[].key, למשל "6 ב 20")
            deal = " · ".join(_s(x.get("key"), 30) for x in (it.get("additionalInfo") or []) if isinstance(x, dict) and x.get("key"))[:40]
            row.update(list_price=lst, discount=round(lst * qty - tot, 2), deal=deal or "מבצע")
        items.append(row)
    if kind == "pairzon":
        st = d.get("store") if isinstance(d.get("store"), dict) else {}
        biz = st.get("business") if isinstance(st.get("business"), dict) else {}
        store, branch = _s(biz.get("name") or st.get("alias"), 40), _s(st.get("name"), 120)
    else:
        store = _s((d.get("tBusiness") or {}).get("businessName"), 40)
        branch = _s((d.get("tBranch") or {}).get("branchName"), 120)
    total = round(_num(d.get("total")), 2)
    s = round(sum(i["total"] for i in items), 2)
    return {"store": store, "branch": branch, "date": _day(d.get("createdDate") or d.get("uploadedDate")), "total": total, "items": items,
            "check": {"sum": s, "total": total or None, "diff": round(total - s, 2) if total else None,
                      "ok": abs(total - s) <= 0.1 if total else None, "verified": True, "passes": 1, "bad_lines": []}}


def fetch_known(url, timeout=12):
    """אתר קבלות מוכר: (קבלה, None) או (None, (קוד, הודעה))"""
    kind, api = api_for(url)
    try:
        r = requests.get(api, headers={"Accept": "application/json", "User-Agent": UA, "Referer": url}, timeout=timeout, allow_redirects=False)
    except requests.RequestException:
        return None, (502, "האתר של הקבלה לא ענה — נסו שוב בעוד רגע")
    if r.status_code == 404:
        return None, (404, "הקבלה לא נמצאה בקישור — אולי פג התוקף שלו")
    if r.status_code != 200 or len(r.content) > 3_000_000:
        return None, (502, "האתר של הקבלה החזיר שגיאה")
    try:
        rc = to_receipt(kind, r.json())
    except ValueError:
        rc = None
    if not rc or not rc["items"]:
        return None, (502, "לא מצאתי מוצרים בקבלה")
    return rc, None


# ---------- כל קישור אחר ----------
MAX_BYTES = 6_000_000
OWN = re.compile(r"(^|\.)(yamshopping\.com|supabase\.co|supabase\.in|localhost|local|internal|lan|home|corp)$")
NO_CONTENT = ("האתר של הקבלה בונה אותה רק בתוך הדפדפן, ולכן אי אפשר לקרוא אותה מהקישור. הדרך הכי מהירה: פותחים את הקישור בכרום ← ⋮ ← "
              "שיתוף ← הדפסה ← שמירה כ-PDF, ומעלים כאן את ה-PDF — כל הקבלה בקובץ אחד, בלי צילומי מסך.")


def public_host(u):
    """רק כתובות ציבוריות: לא השרת הזה, לא רשת פנימית ולא כתובת המטא-דאטה של הענן"""
    if u.scheme not in ("https", "http") or u.username or u.password:
        return False
    try:
        port = u.port
    except ValueError:
        return False
    if port not in (None, 80, 443):
        return False
    h = (u.hostname or "").lower().rstrip(".")
    if not h or "." not in h or OWN.search(h):
        return False
    try:
        ips = {a[4][0] for a in socket.getaddrinfo(h, port or 443, proto=socket.IPPROTO_TCP)}
    except (socket.gaierror, UnicodeError, OSError):
        return False
    try:
        return bool(ips) and all(ipaddress.ip_address(ip.split("%")[0]).is_global for ip in ips)
    except ValueError:
        return False


def html_to_text(page):
    """הטקסט של הדף, שורה לכל שורת טבלה, ותא אחרי תא עם |. גם נתונים שמוטמעים בדף כ-JSON"""
    data = "\n".join(m.strip() for m in re.findall(r"<script\b[^>]*(?:type=[\"']?application/(?:ld\+)?json|id=[\"']__NEXT_DATA__)[^>]*>([\s\S]*?)</script>", page, re.I)
                     if len(m.strip()) > 40)[:8000]
    body = re.sub(r"<(script|style|noscript|svg|head)\b[\s\S]*?</\1>", " ", page, flags=re.I)
    body = re.sub(r"<br\s*/?>", "\n", body, flags=re.I)
    body = re.sub(r"</(tr|p|div|li|h[1-6]|table|section)>", "\n", body, flags=re.I)
    body = re.sub(r"</t[dh]>", " | ", body, flags=re.I)
    body = htmllib.unescape(re.sub(r"<[^>]+>", " ", body))
    lines = [re.sub(r"^\|\s*|\s*\|$", "", re.sub(r"[ \t\u00a0]+", " ", ln)).strip() for ln in body.split("\n")]
    t = "\n".join(ln for ln in lines if ln)
    return (t + ("\n\nנתונים מהדף:\n" + data if data else ""))[:16000]


def _get(url, timeout):
    """מביא עם בדיקה של כל הפניה מחדש. (תשובה, תוכן, הכתובת הסופית) או (None, (קוד, הודעה), None)"""
    for _ in range(5):
        u = urlsplit(url)
        if not public_host(u):
            return None, (400, "הקישור לא תקין — מעתיקים את כל הקישור של הקבלה (מתחיל ב-https://)"), None
        try:
            r = requests.get(url, headers={"User-Agent": UA, "Accept": "text/html,application/pdf,image/*;q=0.9,*/*;q=0.5", "Accept-Language": "he-IL,he;q=0.9"},
                             timeout=timeout, allow_redirects=False, stream=True)
        except requests.RequestException:
            return None, (502, "לא הצלחתי לפתוח את הקישור (האתר לא ענה). נסו שוב, או שמרו את הקבלה כ-PDF והעלו אותה."), None
        if r.is_redirect and r.headers.get("location"):
            url = urljoin(url, r.headers["location"])
            r.close()
            continue
        if r.status_code in (401, 403):
            return None, (502, "האתר של הקבלה לא מאפשר לפתוח אותה מכאן (צריך כניסה לחשבון). אפשר לשמור את הקבלה כ-PDF ולהעלות."), None
        if r.status_code in (404, 410):
            return None, (404, "הקבלה לא נמצאה בקישור — אולי פג התוקף שלו."), None
        if r.status_code != 200:
            return None, (502, f"האתר של הקבלה החזיר שגיאה ({r.status_code}). נסו שוב מאוחר יותר."), None
        buf = b""
        for chunk in r.iter_content(65536):
            buf += chunk
            if len(buf) > MAX_BYTES:
                r.close()
                return None, (413, "הקובץ בקישור גדול מדי."), None
        return r, buf, url
    return None, (400, "הקישור מפנה יותר מדי פעמים — פתחו אותו בדפדפן והעתיקו את הכתובת הסופית."), None


def fetch_any(url, timeout=12, depth=0):
    """({"kind": "pdf"|"image"|"text", ...}, None) או (None, (קוד, הודעה))"""
    r, buf, final = _get(url, timeout)
    if r is None:
        return None, buf
    host = urlsplit(final).hostname or ""
    ct = (r.headers.get("content-type") or "").lower()
    if "application/pdf" in ct or buf[:4] == b"%PDF":
        return {"kind": "pdf", "data": base64.b64encode(buf).decode(), "host": host}, None
    m = re.match(r"image/(jpeg|png|webp)", ct)
    if m:
        return {"kind": "image", "data": base64.b64encode(buf).decode(), "mime": "image/" + m.group(1), "host": host}, None
    if ct and not any(x in ct for x in ("html", "text", "json")):
        return None, (415, "בקישור יש קובץ שאני לא יודעת לקרוא (" + ct.split(";")[0] + ").")
    cs = (re.search(r"charset=([\w-]+)", ct) or re.search(rb"<meta[^>]+charset=[\"']?([\w-]+)", buf[:3000], re.I) or [None, "utf-8"])[1]
    cs = cs.decode() if isinstance(cs, bytes) else cs
    try:
        page = buf.decode(cs, errors="replace")
    except LookupError:
        page = buf.decode("utf-8", errors="replace")
    if "json" in ct:
        return {"kind": "text", "text": page[:16000], "host": host}, None
    text = html_to_text(page)
    # הקבלה עצמה בתוך מסגרת / הפניה בדף / קישור ל-PDF — הולכים אליה פעם אחת
    if depth < 1 and len(text) < 400:
        nxt = (re.search(r"<meta[^>]+http-equiv=[\"']?refresh[\"']?[^>]+url=([^\"'>\s]+)", page, re.I)
               or re.search(r"<iframe\b[^>]+src=[\"']([^\"']+)[\"']", page, re.I)
               or re.search(r"href=[\"']([^\"']+\.pdf(?:\?[^\"']*)?)[\"']", page, re.I))
        if nxt:
            out, err = fetch_any(urljoin(final, htmllib.unescape(nxt.group(1))), timeout, depth + 1)
            if out:
                return out, None
    if len(re.sub(r"\s", "", text)) < 120 or not re.search(r"\d+[.,]\d{2}", text):
        return None, (422, NO_CONTENT)
    return {"kind": "text", "text": text, "host": host}, None


def fetch(url, timeout=12):
    """הקישור של הקבלה ← ({"kind": "receipt", "receipt": ...} או pdf / image / text, None) או (None, (קוד, הודעה))"""
    if api_for(url):
        rc, err = fetch_known(url, timeout)
        if rc:
            return {"kind": "receipt", "receipt": rc, "host": urlsplit(url).hostname}, None
        return None, err
    return fetch_any(url, timeout)
