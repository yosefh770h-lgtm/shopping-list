#!/usr/bin/env python3
"""מחפש רשתות שמפרסמות קבצי מחירים לפי החוק ועוד אין לנו, ומראה מה צריך כדי להוסיף אותן.

רק קורא מהאינטרנט — לא כותב כלום, לא נוגע ב-DB ולא צריך מפתחות.
מריצים על השרת:
    cd /opt/yamshopping/repo/collector && /opt/yamshopping/venv/bin/python bin/find-chains.py
ומדביקים את הפלט בשיחה (או שולחים צילום מסך).

1. קורא את רשימת הרשתות הרשמית של משרד הכלכלה (gov.il) ומסמן כל קישור: כבר אצלנו ✅ או חדש 🆕.
2. לכל קישור חדש: בודק אם הוא עונה, ואם יש בו קבצי מחירים.
3. לא מנחש שמות משתמש: נכנסים רק עם פרטים שמשרד הכלכלה פרסם.
"""
import html
import os
import re
import sys
from urllib.parse import urlparse

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from yam import sources  # noqa: E402

GOV = ["https://www.gov.il/he/pages/cpfta_prices_regulations",
       "https://www.gov.il/he/departments/legalInfo/cpfta_prices_regulations"]

# מה שכבר מכוסה אצלנו (לפי שם האתר)
KNOWN_HOSTS = {"url.publishedprices.co.il", "url.retail.publishedprices.co.il", "laibcatalog.co.il",
               "prices.shufersal.co.il", "prices.carrefour.co.il", "shop.hazi-hinam.co.il",
               "prices.super-pharm.co.il", "wm-gateway.wolt.com", "www.laibcatalog.co.il"}
KNOWN_BINA = {s["prefix"].lower() for s in sources.SOURCES.values() if s["engine"] == "bina"}
KNOWN_USERS = {s["user"].lower() for s in sources.SOURCES.values() if s["engine"] == "cerberus"}

FILE_RE = re.compile(r"(?:Price|PriceFull|Promo|PromoFull|Stores)\d{13}[-\w.]*", re.I)


def show(title, fn):
    print(f"\n== {title} ==")
    try:
        fn()
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ {type(e).__name__}: {str(e)[:200]}")


def known(url):
    host = (urlparse(url).hostname or "").lower()
    if host in KNOWN_HOSTS:
        return True
    if host.endswith(".binaprojects.com"):
        return host.split(".")[0] in KNOWN_BINA
    return False


def peek(http, url):
    """האם הכתובת עונה, ואילו קבצי מחירים מופיעים בה."""
    try:
        r = http.get(url, tries=1)
    except Exception as e:  # noqa: BLE001
        return f"✗ {str(e)[:120]}"
    title = re.search(r"<title>(.*?)</title>", r.text, re.S | re.I)
    files = sorted(set(FILE_RE.findall(r.text)))
    t = html.unescape(title.group(1)).strip()[:50] if title else ""
    return f"{r.status_code} · {t} · {len(files)} קבצים" + (f" · למשל {files[0]}" if files else "")


def gov(http):
    for u in GOV:
        try:
            body = http.get(u, tries=1).text
        except Exception as e:  # noqa: BLE001
            print(f"  {u}: ✗ {str(e)[:150]}")
            continue
        links = re.findall(r'<a[^>]+href="(https?://[^"]+)"[^>]*>(.*?)</a>', body, re.S)
        ext = [(h, re.sub(r"<[^>]+>|\s+", " ", html.unescape(t)).strip()) for h, t in links if "gov.il" not in h]
        print(f"  {u}: {len(ext)} קישורים לאתרים של רשתות")
        new = 0
        for href, text in ext:
            if known(href):
                print(f"  ✅ {text[:40]} | {href}")
            else:
                new += 1
                print(f"  🆕 {text[:40]} | {href} | {peek(http, href)}")
        # שמות משתמש וסיסמאות שמופיעים בטקסט של הדף (ל-Cerberus)
        plain = re.sub(r"<[^>]+>", " ", html.unescape(body))
        for m in re.finditer(r"(שם משתמש|משתמש|user(?:name)?)\s*[:：]?\s*([A-Za-z0-9_@.\-]{3,30})", plain, re.I):
            u_ = m.group(2)
            if u_.lower() not in KNOWN_USERS:
                ctx = re.sub(r"\s+", " ", plain[max(0, m.start() - 60):m.end() + 60])
                print(f"  🆕 משתמש {u_}: ...{ctx}...")
        print(f"  סה\"כ {new} קישורים חדשים")
        return


def netiv(http):
    for u in ("https://app.netiv-hesed.com/", "http://141.226.203.152/", "http://141.226.203.152/Prices"):
        print(f"  {u}: {peek(http, u)}")


if __name__ == "__main__":
    h = sources.Http()
    show("רשימת משרד הכלכלה", lambda: gov(h))
    show("נתיב החסד", lambda: netiv(h))
