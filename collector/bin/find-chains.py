#!/usr/bin/env python3
"""מחפש איפה רשתות שעוד אין לנו (בום ועוד) מפרסמות את קבצי המחירים.

רק קורא מהאינטרנט — לא כותב כלום, לא נוגע ב-DB ולא צריך מפתחות.
מריצים על השרת:  python3 /opt/yamshopping/repo/collector/bin/find-chains.py
ומדביקים את הפלט בשיחה.
"""
import ftplib
import html
import re
import socket
import ssl
import urllib.request

socket.setdefaulttimeout(15)
UA = {"User-Agent": "Mozilla/5.0 (yamshopping price collector)"}
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE  # חלק מאתרי הרשתות עם תעודה לא תקינה; אנחנו רק קוראים רשימת קבצים ציבורית

# שמות שכדאי לנסות בכל פלטפורמה (פלטפורמות שקיפות המחירים המוכרות)
NAMES = ["boom", "Boom", "BOOM", "superboom", "boomsuper", "boom_market", "yeshhesed", "YeshHesed", "yesh", "barkol",
         "Barkol", "kolbo", "hasidim", "chasidim", "ezer", "bnei", "otzar", "osherhaad", "nativ", "shefa", "maor",
         "yesh_bashchuna", "beitlevi", "superyuda", "amitim", "kingstore", "superdosh", "mahsaneihashuk"]
# רשימות ההפניה הרשמיות לקבצי המחירים
GOV = ["https://www.gov.il/he/pages/cpfta_prices_regulations",
       "https://www.gov.il/he/departments/legalInfo/cpfta_prices_regulations"]
WORDS = ["בום", "יש חסד", "ברכל", "בר כל", "יש בשכונה", "נתיב החסד", "אושר עד", "קשת", "מעיין", "שפע"]


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, context=CTX) as r:
        return r.status, r.read(400_000).decode("utf-8", "replace")


def gov():
    print("== רשימת משרד הכלכלה ==")
    for u in GOV:
        try:
            st, body = get(u)
        except Exception as e:
            print(f"  {u}: {type(e).__name__} {e}")
            continue
        links = re.findall(r'<a[^>]+href="(https?://[^"]+)"[^>]*>(.*?)</a>', body, re.S)
        print(f"  {u}: {st}, {len(links)} קישורים")
        for href, text in links:
            t = re.sub(r"<[^>]+>|\s+", " ", html.unescape(text)).strip()
            if "gov.il" not in href:
                mark = " <<<" if any(w in t for w in WORDS) else ""
                print(f"    {t[:50]} | {href}{mark}")
        for w in WORDS:
            for m in re.finditer(re.escape(w), body):
                print(f"    [{w}] ...{re.sub(r'<[^>]+>|\\s+', ' ', body[max(0, m.start() - 80):m.end() + 160])}...")
                break
        return


def cerberus():
    print("== publishedprices (FTP, כמו רמי לוי / אושר עד / יוחננוף) ==")
    for n in NAMES:
        try:
            f = ftplib.FTP("url.retail.publishedprices.co.il")
            f.login(n, "")
            files = f.nlst()
            f.quit()
            print(f"  ✅ {n}: {len(files)} קבצים, למשל {files[:3]}")
        except ftplib.error_perm:
            pass
        except Exception as e:
            print(f"  {n}: {type(e).__name__} {e}")
            break
    print("  (מי שלא מופיע — אין משתמש כזה)")


def bina():
    print("== binaprojects (כמו קינג סטור / שפע ברכת השם) ==")
    for n in NAMES:
        u = f"http://{n.lower()}.binaprojects.com/Main.aspx"
        try:
            st, body = get(u)
            if "MainIO" in body or "<table" in body.lower() or st == 200:
                print(f"  ✅ {u}: {st}")
        except Exception:
            pass


def guesses():
    print("== אתרים שכדאי לבדוק ==")
    for u in ["https://www.boom.co.il", "https://boom-market.co.il", "https://www.superboom.co.il", "https://prices.boom.co.il",
              "https://www.yesh-hesed.co.il"]:
        try:
            st, body = get(u)
            hits = sorted(set(re.findall(r'href="([^"]*(?:price|Price|מחיר|שקיפות)[^"]*)"', body)))[:10]
            title = re.search(r"<title>(.*?)</title>", body, re.S)
            print(f"  {u}: {st} {html.unescape(title.group(1)).strip()[:60] if title else ''} {hits}")
        except Exception as e:
            print(f"  {u}: {type(e).__name__}")


if __name__ == "__main__":
    for step in (gov, cerberus, bina, guesses):
        try:
            step()
        except Exception as e:
            print(f"  {step.__name__} נכשל: {e}")
