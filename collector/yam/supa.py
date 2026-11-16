"""העלאה ל-Supabase דרך ה-REST שלו, עם מפתח השירות מקובץ ה-env בשרת (לא ב-git).

ב-Supabase נשמר רק מה שהאתר צריך:
• chains / branches — הרשתות והסניפים (מסומנים ext_id, כדי לעדכן ולא לשכפל)
• prices עם origin='collector' — מחיר מייצג אחד לכל מוצר בכל רשת, ומבצע אם יש מבצע פעיל ברוב הסניפים
• collector_status — סטטוס לכל רשת (מוצג בבק אופיס בלשונית המחירים)
• client_errors — יומן התקלות 🐞
המחירים של כל סניף וסניף נשארים בשרת, ונשלפים דרך ה-API שלו.
"""
import json
import time

import requests

TIMEOUT = 60


class Supa:
    def __init__(self, url, key):
        self.url = url.rstrip("/")
        self.s = requests.Session()
        self.s.headers.update({"apikey": key, "Content-Type": "application/json"})
        if key.startswith("eyJ"):  # מפתח service_role הישן (JWT)
            self.s.headers["Authorization"] = "Bearer " + key

    def _req(self, method, path, **kw):
        for attempt in range(4):
            try:
                r = self.s.request(method, f"{self.url}/rest/v1/{path}", timeout=TIMEOUT, **kw)
            except requests.RequestException:
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
                continue
            if r.status_code in (502, 503, 504, 429) and attempt < 3:
                time.sleep(2 ** attempt * 2)
                continue
            if r.status_code >= 400:
                raise RuntimeError(f"Supabase {method} {path.split('?')[0]}: {r.status_code} {r.text[:300]}")
            return r.json() if r.text else None

    def select(self, table, query):
        return self._req("GET", f"{table}?{query}") or []

    def insert(self, table, rows, on_conflict=None, ignore=False):
        if not rows:
            return
        q = f"?on_conflict={on_conflict}" if on_conflict else ""
        pref = "resolution=ignore-duplicates" if ignore else ("resolution=merge-duplicates" if on_conflict else "")
        for i in range(0, len(rows), 500):
            self._req("POST", table + q, data=json.dumps(rows[i:i + 500]),
                      headers={"Prefer": ",".join(filter(None, [pref, "return=minimal"]))})

    def update(self, table, query, values):
        self._req("PATCH", f"{table}?{query}", data=json.dumps(values), headers={"Prefer": "return=minimal"})

    def delete(self, table, query):
        self._req("DELETE", f"{table}?{query}", headers={"Prefer": "return=minimal"})

    # ---------- הגדרות מהבק אופיס ----------

    def config(self, default):
        rows = self.select("site_config", "key=eq.collector&select=value")
        if rows and isinstance(rows[0].get("value"), dict):
            return rows[0]["value"]
        # אין עדיין הגדרה — שומרים את ברירת המחדל כדי שתופיע בבק אופיס
        try:
            self.insert("site_config", [{"key": "collector", "value": default}], on_conflict="key", ignore=True)
        except Exception:
            pass
        return default

    # ---------- סטטוס ותקלות ----------

    def status(self, row):
        row = dict(row, updated_at=iso(time.time()))
        self.insert("collector_status", [row], on_conflict="chain")

    def error(self, msg, src):
        self.insert("client_errors", [{"msg": msg[:500], "src": src[:300], "ua": "server.yamshopping.com", "ver": "collector"}])


def iso(t):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(t)) if t else None
