#!/usr/bin/env python3
"""בדיקה לפני העלאה של האתר לשרת, כשאין Node (או שעוד אין tests/site-check.mjs).

אותם עקרונות כמו tests/site-check.mjs, בלי בדיקת תחביר של JS:
  1. אין שורות של סימני מיזוג (<<<<<<< / ======= / >>>>>>>) באף קובץ טקסט.
  2. בכל דף HTML: כל <script> נסגר, ואין </script> יתום.
  3. כל JSON תקין.
  4. בדף הבית יש </html> בסוף, <title> והספרייה של supabase.
  5. כל קובץ js/ שדף הבית טוען קיים, עם ?v= שתואם לתוכן שלו.

הרצה: python3 site_guard.py <תיקיית האתר>   (0 = תקין, 1 = לא להעלות)
"""
import hashlib
import json
import os
import re
import sys

TEXT = {".html", ".js", ".mjs", ".json", ".css", ".webmanifest", ".xml", ".txt", ".py", ".sh", ""}
MARKER = re.compile(r"^(<{7}(?: .*)?|={7}|>{7}(?: .*)?|\|{7}(?: .*)?)\r?$", re.M)
OPEN = re.compile(r"<script\b[^>]*>", re.I)
CLOSE = re.compile(r"</script\s*>", re.I)


def line(text, i):
    return text.count("\n", 0, i) + 1


def check_html(text, rel, errors):
    pos = 0
    low = text.lower()
    while True:
        m = OPEN.search(text, pos)
        chunk_end = m.start() if m else len(text)
        orphan = CLOSE.search(text, pos, chunk_end)
        if orphan:
            errors.append(f"{rel}:{line(text, orphan.start())}: </script> בלי <script> לפניו (אולי פתיחה שנמחקה במיזוג)")
        if not m:
            return
        end = low.find("</script", m.end())
        if end < 0:
            errors.append(f"{rel}:{line(text, m.start())}: <script> שלא נסגר")
            return
        gt = text.find(">", end)
        pos = len(text) if gt < 0 else gt + 1


def main(site):
    errors = []
    for root, dirs, files in os.walk(site):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git")]
        for name in files:
            path = os.path.join(root, name)
            rel = os.path.relpath(path, site).replace(os.sep, "/")
            ext = os.path.splitext(name)[1].lower()
            if ext not in TEXT:
                continue
            try:
                with open(path, encoding="utf-8") as f:
                    text = f.read()
            except (UnicodeDecodeError, OSError):
                continue
            m = MARKER.search(text)
            if m:
                errors.append(f"{rel}:{line(text, m.start())}: נשאר סימן מיזוג \"{m.group(1)[:20]}\"")
            if rel.startswith("vendor/"):
                continue
            if ext == ".html":
                check_html(text, rel, errors)
            elif ext in (".json", ".webmanifest"):
                try:
                    json.loads(text)
                except ValueError as e:
                    errors.append(f"{rel}: JSON שבור — {e}")
    try:
        with open(os.path.join(site, "index.html"), encoding="utf-8") as f:
            home = f.read()
    except OSError:
        home = ""
        errors.append("index.html: חסר")
    for what, rx in (("</html>", r"</html>\s*$"), ("<title>", r"<title>[^<]+</title>"), ("supabase", r"vendor/supabase-js")):
        if home and not re.search(rx, home, re.I):
            errors.append(f"index.html: חסר {what} — הדף כנראה נחתך או נשבר")
    # 5. הקוד בקבצים js/*.js: כל קובץ ש-index.html טוען קיים, וה-?v= שלו תואם לתוכן
    #    (הטלפונים שומרים כל קובץ לתמיד לפי הכתובת — ?v= ישן = קוד ישן אצל אנשים, ולא תואם לדף החדש)
    for m in re.finditer(r'<script\b[^>]*\ssrc="/js/([^"?]+)(?:\?v=([^"]*))?"', home):
        path = os.path.join(site, "js", m.group(1))
        if not os.path.isfile(path):
            errors.append(f"index.html: חסר הקובץ js/{m.group(1)}")
            continue
        with open(path, "rb") as f:
            h = hashlib.sha256(f.read()).hexdigest()[:10]
        if m.group(2) != h:
            errors.append(f"js/{m.group(1)}: ?v={m.group(2)} לא תואם לתוכן ({h}) — להריץ node tests/stamp-js.mjs")
    if errors:
        print(f"✗ בדיקת האתר נכשלה ({len(errors)}) — לא מעלים את הגרסה הזאת:", file=sys.stderr)
        for e in errors:
            print("  - " + e, file=sys.stderr)
        return 1
    print("✓ בדיקת האתר עברה (בלי בדיקת תחביר JS — אין Node)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "shopping-list-site")))
