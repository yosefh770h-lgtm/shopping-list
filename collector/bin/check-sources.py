#!/usr/bin/env python3
"""בדיקה ישירה של מקורות הרשתות שלא מתעדכנות: האם האתר עונה, כמה קבצים יש, ומה התאריך של החדש ביותר.

רק קורא מהאינטרנט — לא כותב כלום ולא צריך מפתחות.
מריצים על השרת:  python3 /opt/yamshopping/repo/collector/bin/check-sources.py
"""
import json
import re
import socket
import ssl
import time
import urllib.request

socket.setdefaulttimeout(40)
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE  # רק קוראים רשימת קבצים ציבורית


def get(url, n=600_000):
    t = time.time()
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, context=CTX) as r:
        return r.status, r.read(n), round(time.time() - t, 1), r.geturl()


def show(title, fn):
    print(f"== {title}")
    try:
        fn()
    except Exception as e:
        print(f"   ✗ {type(e).__name__}: {str(e)[:200]}")


def superpharm():
    for base in ("https://prices.super-pharm.co.il/", "http://prices.super-pharm.co.il/"):
        try:
            st, body, sec, final = get(base + "?Category-equals=PriceFull&page=1")
        except Exception as e:
            print(f"   {base}: ✗ {type(e).__name__}: {str(e)[:150]}")
            continue
        text = body.decode("utf-8", "replace")
        links = re.findall(r'href="(/Download/[^"]+)"', text)
        total = re.search(r'data-total-rows="(\d+)"', text)
        dates = re.findall(r"\d{1,2}/\d{1,2}/\d{4} \d{1,2}:\d{2}:\d{2}", text)
        print(f"   {base}: {st} · {sec}s · אחרי הפניה: {final} · קישורים: {len(links)} · סה\"כ שורות: {total.group(1) if total else '?'}")
        print(f"   תאריכים ראשונים: {dates[:3]} · קישור לדוגמה: {links[0][:90] if links else '-'}")
        if links:
            try:
                st2, b2, sec2, _ = get("https://prices.super-pharm.co.il" + links[0].replace("&amp;", "&"), 200)
                print(f"   הורדת קובץ לדוגמה: {st2} · {sec2}s · {len(b2)} בתים ראשונים")
            except Exception as e:
                print(f"   הורדת קובץ לדוגמה: ✗ {type(e).__name__}: {str(e)[:150]}")


def laib(name, edi):
    def run():
        st, body, sec, _ = get(f"https://laibcatalog.co.il/webapi/api/getbranches?edi={edi}")
        try:
            br = json.loads(body)
        except ValueError:
            br = None
        print(f"   getbranches: {st} · {sec}s · סניפים: {len(br) if isinstance(br, list) else body[:120]!r}")
        st, body, sec, _ = get(f"https://laibcatalog.co.il/webapi/api/getfiles?edi={edi}", 20_000_000)
        rows = json.loads(body)
        rows.sort(key=lambda r: r.get("fileDate", ""), reverse=True)
        kinds = {}
        for r in rows:
            k = re.match(r"[A-Za-z]+", r.get("fileName", "") or "")
            kinds[k.group(0) if k else "?"] = kinds.get(k.group(0) if k else "?", 0) + 1
        print(f"   getfiles: {st} · {sec}s · קבצים: {len(rows)} · סוגים: {kinds}")
        print(f"   החדשים ביותר: {[(r.get('fileName'), r.get('fileDate')) for r in rows[:3]]}")
        if rows:
            fn = rows[0]["fileName"]
            try:
                st2, b2, sec2, _ = get(f"https://laibcatalog.co.il/webapi/{edi}/{urllib.request.quote(fn)}", 200)
                print(f"   הורדת קובץ לדוגמה: {st2} · {sec2}s · {len(b2)} בתים ראשונים")
            except Exception as e:
                print(f"   הורדת קובץ לדוגמה: ✗ {type(e).__name__}: {str(e)[:150]}")
    show(f"{name} (laibcatalog, edi={edi})", run)


def netiv():
    for u in ("https://app.netiv-hesed.com/", "http://141.226.203.152/"):
        try:
            st, body, sec, final = get(u, 4000)
            print(f"   {u}: {st} · {sec}s · {final} · {body[:120]!r}")
        except Exception as e:
            print(f"   {u}: ✗ {type(e).__name__}: {str(e)[:150]}")


if __name__ == "__main__":
    show("סופר פארם (prices.super-pharm.co.il)", superpharm)
    laib("ויקטורי", "7290696200003")
    laib("מחסני השוק", "7290661400001")
    laib("ח. כהן", "7290455000004")
    show("נתיב החסד", netiv)
