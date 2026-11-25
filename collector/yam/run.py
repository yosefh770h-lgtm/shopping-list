"""אוסף המחירים — נקודת הכניסה.

    python -m yam.run full     # 05:30 — סניפים, PriceFull ו-PromoFull
    python -m yam.run hourly   # כל שעה — Price ו-Promo (שינויים)
    python -m yam.run test     # ריצת בדיקה קטנה: שופרסל, רמי לוי ומשנת יוסף, 3 קבצים מכל אחת
    python -m yam.run status   # סיכום מהמאגר המקומי

ההגדרות מגיעות מ-/etc/yamshopping/collector.env (ראו collector.env.example).
כשל של רשת אחת לא עוצר את האחרות: השגיאה נרשמת בסטטוס של הרשת ונשלחת ליומן התקלות 🐞.
"""
import datetime as dt
import json
import logging
import os
import re
import shutil
import sys
import time
import traceback

from . import chains as C
from . import db, geo, geoip, scrape, shabbat, watch, xmlparse
from .supa import Supa, iso

log = logging.getLogger("yam")
VERSION = "1.0"
FAIL_DAYS = 3  # התראה נפרדת על רשת רק אחרי כמה ריצות מלאות ברצף שלא הצליחו


def env(name, default=""):
    return os.environ.get(name, default)


def load_env_file(path):
    if not path or not os.path.exists(path):
        return
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"['’`׳\"]", "", s or "")).strip()


class Runner:
    def __init__(self, mode, only=None):
        self.only = [c.strip().upper() for c in (only or []) if c.strip()]
        self.mode = mode
        self.data = env("DATA_DIR", "/var/lib/yamshopping")
        os.makedirs(self.data, exist_ok=True)
        self.dump = os.path.join(self.data, "dumps")
        self.status_root = os.path.join(self.data, "status")
        self.status_dir = os.path.join(self.status_root, dt.date.today().strftime("%Y%m%d") + ("-test" if mode == "test" else ""))
        self.con = db.connect(env("DB_PATH", os.path.join(self.data, "prices.db")))
        url, key = env("SUPABASE_URL"), env("SUPABASE_SERVICE_KEY")
        self.supa = Supa(url, key) if url and key else None
        self.known = C.all_chains()
        self.cfg = C.default_config(self.known)
        if self.supa:
            try:
                self.cfg = self.supa.config(self.cfg)
            except Exception as e:
                log.warning("לא הצלחנו לקרוא את ההגדרות מהבק אופיס, ממשיכים עם ברירת המחדל: %s", e)
        self.threads = int(env("THREADS", "3"))
        self.rep_limit = int(env("REP_LIMIT", "4000"))
        self.summary = []
        self.failed = []

    # ---------- השהיית שבת ----------
    def paused(self):
        if self.mode == "test":
            return False, ""
        return shabbat.paused(self.cfg)

    def should_stop(self):
        return self.paused()[0]

    # ---------- קובץ אחד ----------
    def done(self, name):
        """קובץ שכבר נקלט בריצה קודמת — לא מורידים אותו שוב."""
        return bool(self.con.execute("select 1 from files_done where name=?", (name,)).fetchone())

    def handle(self, chain, cache, counts):
        def on_file(kind, name, path):
            if self.con.execute("select 1 from files_done where name=?", (name,)).fetchone():
                return
            k = xmlparse.kind_of(name) or kind
            rows = 0
            if k == "stores":
                rows = db.upsert_stores(self.con, chain, xmlparse.parse_stores(path, name))
                counts["stores_file"] = True
            elif k in ("pricefull", "price"):
                chain_id, store_id, items = xmlparse.parse_prices(path, name)
                if chain_id and store_id:
                    store = db.store_id_for(self.con, chain, chain_id, store_id)
                    rows = db.save_prices(self.con, cache, store, items, full=(k == "pricefull"))
                    counts["changed"] += rows
            elif k in ("promofull", "promo"):
                chain_id, store_id, promos = xmlparse.parse_promos(path, name)
                if chain_id and store_id:
                    store = db.store_id_for(self.con, chain, chain_id, store_id)
                    rows = db.save_promos(self.con, store, promos, full=(k == "promofull"))
                    counts["promos"] += rows
            self.con.execute("insert or replace into files_done(name, chain, kind, rows, at) values (?,?,?,?,?)",
                             (name, chain, k, rows, db.now()))
            self.con.commit()
            counts["files"] += 1
        return on_file

    # ---------- רשת אחת ----------
    def run_chain(self, chain, kinds, limit=None):
        cache = db.ItemCache(self.con, chain)
        counts = {"files": 0, "changed": 0, "promos": 0}
        errors = []
        today = dt.date.today()
        for kind in kinds:
            if self.should_stop():
                break
            threads = 1 if chain in C.GENTLE else self.threads
            n, errs = scrape.download(chain, kind, self.dump, self.status_dir, self.handle(chain, cache, counts),
                                      threads=threads, limit=limit, day=today, should_stop=self.should_stop,
                                      skip=self.done)
            # קובץ מלא שעוד לא פורסם היום (רשתות שמפרסמות מאוחר) — לוקחים את של אתמול
            if n == 0 and kind in ("stores", "pricefull", "promofull") and self.mode != "hourly":
                n, errs2 = scrape.download(chain, kind, self.dump, self.status_dir, self.handle(chain, cache, counts),
                                           threads=threads, limit=limit, day=today - dt.timedelta(days=1),
                                           should_stop=self.should_stop, skip=self.done)
                errs += errs2
            if kind == "pricefull" and n:
                self.con.execute("insert or replace into meta(k, v) values (?, ?)", (f"full:{chain}", today.isoformat()))
                self.con.commit()
            errors += errs
        return counts, errors

    def fresh(self, chain, hours=26):
        """האם הגיע מהרשת קובץ מחירים ב-hours השעות האחרונות (גם בריצה שעתית). רשת שכבר עודכנה היום
        ופשוט אין לה קובץ חדש ברגע הריצה המלאה (או שהקבצים כבר הורדו קודם) — לא נחשבת כנכשלת."""
        row = self.con.execute("select max(f.at) from store_fresh f join stores s on s.id = f.store where s.chain = ?",
                               (chain,)).fetchone()
        return bool(row and row[0] and db.now() - row[0] < hours * 3600)

    def kinds_for(self, chain):
        if self.mode in ("full", "test"):
            return ["stores", "pricefull", "promofull"]
        # שעתי: שינויים; ורשת שעוד לא הורד לה קובץ מלא היום — גם המלא
        row = self.con.execute("select v from meta where k=?", (f"full:{chain}",)).fetchone()
        late = not row or row[0] != dt.date.today().isoformat()
        return (["stores", "pricefull", "promofull"] if late else []) + ["price", "promo"]

    # ---------- העלאה ל-Supabase ----------
    def upload_branches(self, chain):
        heb = C.hebrew(chain)
        stores = self.con.execute("select * from stores where chain=?", (chain,)).fetchall()
        if not stores:
            return 0
        self.supa.insert("chains", [{"name": heb, "kind": "store", "category": "supermarket", "status": "approved"}],
                         on_conflict="name", ignore=True)
        existing = self.supa.select("branches", f"chain=eq.{_q(heb)}&select=id,city,address,ext_id&limit=5000")
        by_place = {(b["city"], b["address"]): b for b in existing}
        rows, used = [], set()
        for s in stores:
            city = (s["city"] or "לא ידוע")[:40]
            address = (s["address"] or s["name"] or f"סניף {s['store_id']}")[:120]
            if (city, address) in used:
                address = f"{address} ({s['store_id']})"[:120]
            used.add((city, address))
            row = {"chain": heb, "city": city, "address": address, "name": (s["name"] or "")[:60],
                   "ext_id": s["key"], "status": "approved", "lat": s["lat"], "lng": s["lng"]}
            old = by_place.get((city, address))
            if old and old.get("ext_id") != s["key"]:
                # סניף שכבר הוסף ידנית באותה כתובת — מחברים אותו לסניף מהקובץ
                self.supa.update("branches", f"id=eq.{old['id']}", {"ext_id": s["key"], "name": row["name"]})
                continue
            rows.append(row)
        try:
            self.supa.insert("branches", rows, on_conflict="ext_id")
        except RuntimeError:
            # סניף אחד בעייתי (למשל כתובת שכבר תפוסה) לא יעצור את כל השאר
            bad = 0
            for row in rows:
                try:
                    self.supa.insert("branches", [row], on_conflict="ext_id")
                except RuntimeError:
                    bad += 1
            if bad:
                log.warning("%s: %d סניפים לא עלו ל-Supabase", chain, bad)
        return len(stores)

    def upload_prices(self, chain):
        """מחיר מייצג לכל מוצר ברשת + מבצע פעיל. מעלים רק מה שהשתנה מאז ההעלאה הקודמת."""
        heb, origin = C.hebrew(chain), f"collector:{chain}"
        deals = db.chain_deals(self.con, chain)
        want = {}
        for r in db.representative(self.con, chain, self.rep_limit):
            name = norm(r["name"])[:60]
            if not name:
                continue
            row = {"product": name, "product_key": norm(name), "chain": heb, "branch": "", "price": r["price"],
                   "barcode": r["code"] if re.fullmatch(r"\d{4,20}", r["code"]) else None,
                   "status": "approved", "verified": True, "by_id": None, "by_name": "עדכון אוטומטי",
                   "currency": "ILS", "origin": origin, "is_deal": False, "deal_text": "", "valid_until": None,
                   "regular_price": None}
            d = deals.get(r["code"])
            if d:
                _apply_deal(row, d)
            want[r["code"]] = row
        old = {c: (p, d) for c, p, d in self.con.execute("select code, price, deal from uploaded where chain=?", (chain,))}
        sig = lambda row: (row["price"], row["deal_text"] + "|" + str(row["valid_until"] or ""))
        if not old:
            self.supa.delete("prices", f"origin=eq.{_q(origin)}")
            changed, gone = list(want), []
        else:
            changed = [c for c, row in want.items() if old.get(c) != sig(row)]
            gone = [c for c in old if c not in want]
        drop = [c for c in changed if c in old] + gone
        for i in range(0, len(drop), 150):
            part = drop[i:i + 150]
            self.supa.delete("prices", f"origin=eq.{_q(origin)}&barcode=in.({','.join(part)})")
        self.supa.insert("prices", [want[c] for c in changed])
        self.con.executemany("delete from uploaded where chain=? and code=?", [(chain, c) for c in drop])
        self.con.executemany("insert or replace into uploaded(chain, code, price, deal) values (?,?,?,?)",
                             [(chain, c, *sig(want[c])) for c in changed])
        self.con.commit()
        return len(want), len(changed) + len(gone)

    def visible(self, chain):
        """האם המשתמשים רואים את הרשת. נקבע בבק אופיס: public (מתג ראשי, כבוי כברירת מחדל) ו-hidden (רשתות מוסתרות)."""
        return C.visible(self.cfg, chain)

    def withdraw(self, chain):
        """רשת שלא מוצגת למשתמשים: מורידים מהאתר את המחירים שהעלינו לה (פעם אחת, כשיש מה להוריד)."""
        if not self.con.execute("select 1 from uploaded where chain=? limit 1", (chain,)).fetchone():
            return False
        self.supa.delete("prices", f"origin=eq.{_q('collector:' + chain)}")
        self.con.execute("delete from uploaded where chain=?", (chain,))
        self.con.commit()
        return True

    def note_failure(self, chain, err):
        """רשת שלא עודכנה: לא שולחים התראה על כל אחת — רק סופרים. התראה נפרדת רק כשהיא נכשלת FAIL_DAYS ריצות מלאות ברצף
        (ואחר כך פעם בשבוע), וכל השאר נכנס לסיכום היומי אחד בסוף הריצה המלאה."""
        self.failed.append((chain, err))
        if self.mode == "test":  # ריצת הבדיקה בסוף ההתקנה — רוצים לדעת מיד
            self.report_error(chain, err)
        if self.mode != "full":
            return
        k = f"fails:{chain}"
        row = self.con.execute("select v from meta where k=?", (k,)).fetchone()
        n = (int(row[0]) if row and str(row[0]).isdigit() else 0) + 1
        self.con.execute("insert or replace into meta(k, v) values (?, ?)", (k, str(n)))
        self.con.commit()
        if n == FAIL_DAYS or (n > FAIL_DAYS and (n - FAIL_DAYS) % 7 == 0):
            self.report_error(chain, f"לא מתעדכנת כבר {n} ימים ברצף — {err}")

    def send_daily_summary(self, total):
        if self.mode != "full" or not self.failed:
            return
        names = ", ".join(C.hebrew(c) for c, _ in self.failed)
        self.report_error("_summary", f"סיכום יומי: {len(self.failed)} מתוך {total} רשתות לא עודכנו היום ({names}). "
                                      f"בדרך כלל זה זמני (הרשת לא פרסמה קובץ). התראה נפרדת תגיע רק על רשת שנכשלת {FAIL_DAYS} ימים ברצף. "
                                      f"הפירוט בבק אופיס ← איסוף מחירים.")

    def report_error(self, chain, msg):
        """שולח ליומן התקלות — לכל היותר פעם ב-6 שעות לאותה שגיאה."""
        if not self.supa:
            return
        k = chain + "|" + re.sub(r"\d+", "#", msg)[:200]
        row = self.con.execute("select at from sent_errors where k=?", (k,)).fetchone()
        if row and db.now() - row[0] < 6 * 3600:
            return
        try:
            self.supa.error(f"אוסף המחירים · {C.hebrew(chain)}: {msg}" if chain != "_summary" else f"אוסף המחירים · {msg}",
                           f"collector {self.mode} · {chain}")
            self.con.execute("insert or replace into sent_errors(k, at) values (?,?)", (k, db.now()))
            self.con.commit()
        except Exception as e:
            log.warning("לא הצלחנו לשלוח ליומן התקלות: %s", e)

    def push_status(self, chain, **row):
        if not self.supa:
            return
        try:
            self.supa.status({"chain": chain, "name": C.hebrew(chain), **row})
        except Exception as e:
            log.warning("סטטוס %s: %s", chain, e)

    # ---------- הריצה ----------
    def run(self):
        started = time.time()
        p, why = self.paused()
        if p:
            log.info("⏸️ מושהה (%s) — לא רץ עכשיו", why)
            self.heartbeat(paused=why)
            return 0
        scrape.cleanup(self.dump, self.status_root)
        self.city_codes()
        self.watch_sync()
        self.apk_geo_sync()
        if self.mode == "test":  # test SHUFERSAL,OSHER_AD — בדיקה מהירה של רשתות מסוימות (קובץ אחד מכל סוג)
            todo = [c for c in (self.only or C.TEST_CHAINS) if c in self.known]
        else:
            todo = C.enabled_chains(self.cfg, self.known)
            if self.mode == "hourly":
                todo = [c for c in todo if c not in C.GENTLE]
        log.info("מתחילים ריצה %s · %d רשתות", self.mode, len(todo))
        for chain in todo:
            if self.should_stop():
                log.info("⏸️ נכנסה שבת / חג — עוצרים")
                break
            t0 = time.time()
            db.set_status(self.con, chain, last_try=db.now())
            err = ""
            counts = {"files": 0, "changed": 0, "promos": 0}
            try:
                counts, errors = self.run_chain(chain, self.kinds_for(chain), limit=1 if self.mode == "test" else None)
                if errors and not counts["files"]:
                    err = errors[0]
                elif self.mode in ("full", "test") and not counts["files"] and not self.fresh(chain):
                    err = "לא נמצאו קבצים להורדה היום"
            except Exception as e:
                err = f"{type(e).__name__}: {e}"[:400]
                log.error("%s נכשל:\n%s", chain, traceback.format_exc())
            stores, items = db.chain_counts(self.con, chain)
            up = ""
            if self.supa and not self.visible(chain):
                try:
                    if self.withdraw(chain):
                        up = "לא מוצגת למשתמשים — המחירים הורדו מהאתר"
                except Exception as e:
                    log.warning("%s: הורדת המחירים מהאתר נכשלה: %s", chain, e)
            elif self.supa and not err and (counts["files"] or self.mode == "full"):
                try:
                    self.upload_branches(chain)
                    if counts["changed"] or counts["promos"] or self.mode in ("full", "test"):
                        n, ch = self.upload_prices(chain)
                        up = f"{n} מחירים מייצגים ({ch} עודכנו)"
                except Exception as e:
                    err = f"העלאה ל-Supabase נכשלה: {e}"[:400]
            if err:
                db.set_status(self.con, chain, error=err, files=counts["files"], stores=stores, items=items)
                self.note_failure(chain, err)
            else:
                db.set_status(self.con, chain, error="", last_ok=db.now(), files=counts["files"], stores=stores, items=items)
                self.con.execute("delete from meta where k=?", (f"fails:{chain}",))
                self.con.commit()
            st = self.con.execute("select * from chain_status where chain=?", (chain,)).fetchone()
            self.push_status(chain, enabled=True, last_run=iso(st["last_try"]), last_ok=iso(st["last_ok"]),
                             stores=stores, items=items, files=counts["files"], error=err)
            line = f"{'❌' if err else '✅'} {C.hebrew(chain)} ({chain}): {counts['files']} קבצים · {stores} סניפים · {items} מוצרים" + \
                   (f" · {up}" if up else "") + (f" · שגיאה: {err}" if err else "") + f" · {int(time.time() - t0)} שניות"
            log.info(line)
            self.summary.append(line)
        for chain in self.known:
            if chain not in todo and self.mode != "test" and not (self.mode == "hourly" and chain in C.GENTLE):
                self.push_status(chain, enabled=False)
        self.send_daily_summary(len(todo))
        if self.mode in ("full",):
            self.drop_stale()
            db.prune(self.con, int(env("HISTORY_DAYS", "60")))
            db.rebuild_popularity(self.con)
        if self.mode in ("full", "test"):
            try:
                geo.geocode_cities(self.con, max_new=20 if self.mode == "test" else 300)
            except Exception as e:
                log.warning("מיקום סניפים: %s", e)
        if self.mode == "test":
            db.rebuild_popularity(self.con)
        self.heartbeat(seconds=int(time.time() - started))
        return 0

    # ---------- 🕵️ ניטור העתקה ----------
    def watch_sync(self):
        """מורידים מהבק אופיס את הכתובות החסומות (blocked.json, ה-API קורא אותו), ומעלים לשם (scrape_watch)
        את מי שנראה חשוד ביומיים האחרונים בשרת המחירים, עם סיכום לכל יום. נשמר שם 30 יום.
        לכל כתובת מוסיפים מיקום משוער וספק (geoip), ואת החשבונות באתר שקשורים אליה (לפי כניסות מאותה כתובת,
        ולפי מה שהאתר עצמו שלח). השרת שלנו וכתובות פנימיות לא נחשבים חשודים ולא נחסמים."""
        if not self.supa:
            return
        base = os.path.dirname(env("DB_PATH", os.path.join(self.data, "prices.db")))
        own = own_ips()
        try:
            rows = self.supa.select("site_config", "key=eq.scrape&select=value")
            v = rows[0]["value"] if rows and isinstance(rows[0].get("value"), dict) else {}
            ips = [str(b.get("ip") if isinstance(b, dict) else b).strip()[:64] for b in (v.get("blocked") or [])][:2000]
            path = env("BLOCKED_FILE", os.path.join(base, "blocked.json"))
            with open(path + ".tmp", "w", encoding="utf-8") as f:
                json.dump({"ips": [x for x in ips if watch.safe_nets([x], own)], "self": sorted(own), "at": iso(time.time())}, f)
            os.replace(path + ".tmp", path)
        except Exception as e:
            log.warning("רשימת החסומים: %s", e)
        try:
            rows, totals = watch.report(env("WATCH_DB", os.path.join(base, "watch.db")), own=own)
            if not totals:  # עוד אין בקשות שנרשמו (או שה-API לא רץ על השרת הזה)
                return
            self.enrich(rows)
            now = iso(time.time())
            up = [{"day": r["day"], "ip": r["ip"], "peer": r["peer"], "n": r["n"], "site": r["site"], "limited": r["limited"],
                   "blocked": r["blocked"], "ua": r["ua"][:200], "stores": r["stores"], "queries": r["queries"], "cities": r["cities"],
                   "ips": 0, "eps": r["eps"], "samples": r["samples"], "reasons": r["reasons"], "score": r["score"],
                   "first_at": iso(r["first_at"]), "last_at": iso(r["last_at"]), "updated_at": now, "own": r["own"],
                   "geo": r.get("geo") or {}, "accounts": r.get("accounts") or [], "uas": r.get("uas") or [],
                   "city_list": r.get("city_list") or []} for r in rows]
            up += [{"day": t["day"], "ip": "*", "peer": "", "n": t["n"], "site": t["site"], "limited": t["limited"],
                    "blocked": t["blocked"], "ua": "", "stores": 0, "queries": 0, "cities": 0, "ips": t["ips"], "eps": {},
                    "samples": [], "reasons": [], "score": 0, "first_at": None, "last_at": None, "updated_at": now, "own": False,
                    "geo": {}, "accounts": [], "uas": [], "city_list": []}
                   for t in totals]
            self.supa.insert("scrape_watch", up, on_conflict="day,ip")
            self.supa.delete("scrape_watch", f"day=lt.{(dt.date.today() - dt.timedelta(days=30)).isoformat()}")
            sus = [r for r in rows if r["score"] >= 2]
            if sus:
                log.info("🕵️ %d כתובות חשודות בהעתקה (פירוט בבק אופיס ← 💰 מחירים)", len(sus))
        except Exception as e:
            log.warning("ניטור העתקה: %s", e)

    # ---------- 🤖 מי מוריד את האפליקציה ----------
    def apk_geo_sync(self):
        """להורדות האפליקציה (apk_downloads) שעוד אין להן מיקום — עיר, אזור, מדינה וספק לפי ה-IP (geoip).
        עד 300 בכל ריצה. כתובת בלי מיקום ידוע מקבלת {} כדי שלא תיבדק שוב ושוב."""
        if not self.supa:
            return
        try:
            rows = self.supa.select("apk_downloads", "select=id,ip&geo=is.null&ip=neq.&order=id.desc&limit=300")
            if not rows:
                return
            folder = env("GEOIP_DIR", os.path.join(self.data, "geoip"))
            if not os.path.exists(os.path.join(folder, "city.mmdb")):
                geoip.ensure(folder)
            g, own, cache = geoip.Geo(folder), own_ips(), {}
            for r in rows:
                ip = r["ip"]
                if ip not in cache:
                    cache[ip] = {"label": "own"} if ip in own else {k: v for k, v in g.lookup(ip).items() if k != "asn"}
                self.supa.update("apk_downloads", f"id=eq.{int(r['id'])}", {"geo": cache[ip]})
            log.info("🤖 מיקום ל-%d הורדות של האפליקציה", len(rows))
        except Exception as e:
            log.warning("מיקום הורדות האפליקציה: %s", e)

    def enrich(self, rows):
        """מיקום וספק לכל כתובת, וכל מה שידוע באתר על מי שמאחוריה."""
        folder = env("GEOIP_DIR", os.path.join(self.data, "geoip"))
        if self.mode in ("full", "test") or not os.path.exists(os.path.join(folder, "city.mmdb")):
            geoip.ensure(folder)
        g = geoip.Geo(folder)
        for r in rows:
            if r["own"]:
                r["geo"] = {"label": "own" if not watch.is_internal(r["ip"]) else "internal"}
                continue
            r["geo"] = g.lookup(r["ip"])
            lab = known_label(r["ip"], r["ua"], r["geo"].get("org", ""))
            if lab:
                r["geo"]["label"] = lab
            if lab in ("claude", "searchbot"):  # מוכרים ולא מזיקים — לא חשודים
                r["reasons"], r["score"] = [], 0
                continue
            if r["geo"].get("hosting") and r["n"] >= 20 and "hosting" not in r["reasons"]:
                r["reasons"].append("hosting")
                r["score"] += watch.REASONS["hosting"]
        try:
            accounts = self.accounts_for([r for r in rows if not r["own"]])
        except Exception as e:  # בלי החשבונות — עדיין מעלים את השאר
            log.warning("ניטור העתקה — חשבונות: %s", e)
            accounts = {}
        for r in rows:
            r["accounts"] = accounts.get(r["ip"], [])

    def accounts_for(self, rows):
        """{ip: [{id, name, email, how, at}]}.
        how: login / signup = נכנס או נרשם לאתר מאותה כתובת (לפי יומן הכניסות — אמין).
             site = האתר שלח שזה החשבון שמחובר (אפשר לזייף — מוצג כ"לא מאומת").
             guest = אורח בלי חשבון (רק מזהה מכשיר) · guest_signup = אותו אורח נרשם אחר כך לחשבון."""
        out = {r["ip"]: [] for r in rows}
        keys = {}
        for r in rows:
            keys.setdefault(geoip.ip_key(r["ip"]), []).append(r["ip"])
        if not keys:
            return out
        inlist = lambda vals: "in.(" + ",".join('"' + str(v).replace('"', "") + '"' for v in vals) + ")"
        ev = self.supa.select("auth_events", "select=ip,user_id,email,kind,created_at&kind=in.(login,google_login,signup)&ip="
                              + _q(inlist(keys)) + "&order=created_at.desc&limit=1000")
        users, guests = set(), set()
        for e in ev:
            if e.get("user_id"):
                users.add(e["user_id"])
        for r in rows:
            for w in r.get("who") or []:
                (users if w.startswith("u:") else guests).add(w[2:])
        gv = {}
        if guests:
            for x in self.supa.select("guest_visits", "select=id,converted_user,visits,first_at,last_at&id=" + _q(inlist(sorted(guests)[:200]))):
                gv[x["id"]] = x
                if x.get("converted_user"):
                    users.add(x["converted_user"])
        prof = {}
        if users:
            for p in self.supa.select("profiles", "select=id,name,email&id=" + _q(inlist(sorted(users)[:300]))):
                prof[p["id"]] = p

        def add(ip, uid, how, at, email=""):
            p = prof.get(uid) or {}
            lst = out[ip]
            if any(a.get("id") == uid and a["how"] == how for a in lst if uid):
                return
            if len(lst) < 12:
                lst.append({"id": uid, "name": p.get("name", ""), "email": p.get("email") or email, "how": how, "at": at})
        for e in ev:
            for ip in keys.get(e["ip"], []):
                add(ip, e.get("user_id"), "signup" if e["kind"] == "signup" else "login", e["created_at"], e.get("email", ""))
        for r in rows:
            for w in r.get("who") or []:
                if w.startswith("u:"):
                    add(r["ip"], w[2:], "site", None)
                else:
                    x = gv.get(w[2:]) or {}
                    if x.get("converted_user"):
                        add(r["ip"], x["converted_user"], "guest_signup", x.get("first_at"))
                    elif len(out[r["ip"]]) < 12:
                        out[r["ip"]].append({"id": None, "guest": w[2:], "how": "guest", "visits": x.get("visits", 0),
                                             "at": x.get("first_at"), "name": "", "email": ""})
        return out

    def drop_stale(self):
        """מחירים לא עדכניים לא נשמרים: סניף בלי קובץ מחירים STALE_DAYS ימים נמחק מהמאגר,
        ורשת שלא נשאר לה אף מחיר עדכני יורדת גם מהענן (Supabase), עד שהיא חוזרת לעבוד."""
        try:
            n = db.drop_stale(self.con, int(env("STALE_DAYS", "7")))
            if n:
                log.info("🧹 נמחקו מחירים ישנים של %d סניפים", n)
            if self.supa:
                for (chain,) in self.con.execute("select distinct chain from uploaded").fetchall():
                    alive = self.con.execute("select 1 from prices p join stores s on s.id = p.store where s.chain = ? limit 1",
                                             (chain,)).fetchone()
                    if not alive and self.withdraw(chain):
                        log.info("🧹 %s: אין מחירים עדכניים — הורדו מהאתר", chain)
        except Exception as e:
            log.warning("ניקוי מחירים ישנים: %s", e)

    def city_codes(self):
        """רוב הרשתות כותבות קוד יישוב ("6100") במקום שם ("בני ברק") — מתרגמים, אחרת חיפוש לפי עיר לא מוצא אותן.
        הרשימה המלאה מ-data.gov.il נטענת פעם בחודש (בריצה מלאה או בבדיקה)."""
        last = self.con.execute("select v from meta where k = 'city_codes_at'").fetchone()
        if self.mode in ("full", "test") and (not last or db.now() - int(last[0]) > 30 * 86400):
            try:
                n = geo.load_city_codes(self.con)
                log.info("קודי יישובים: %d", n)
                if n:
                    self.con.execute("insert or replace into meta(k, v) values ('city_codes_at', ?)", (str(db.now()),))
            except Exception as e:
                log.warning("קודי יישובים: %s", e)
        try:
            n = db.fix_cities(self.con)
            if n:
                log.info("עיר תוקנה ל-%d סניפים", n)
        except Exception as e:
            log.warning("תיקון ערים: %s", e)

    def heartbeat(self, paused="", seconds=0):
        total = shutil.disk_usage(self.data)
        info = {
            "version": VERSION, "mode": self.mode, "paused": paused, "seconds": seconds,
            "db_mb": round(os.path.getsize(self.con.execute("pragma database_list").fetchone()[2]) / 1e6),
            "disk_free_gb": round(total.free / 1e9, 1), "mem_mb": _mem_mb(),
        }
        self.push_status("_server", name="השרת", enabled=True, last_run=iso(time.time()),
                         last_ok=None if paused else iso(time.time()), error="", info=info)


def _apply_deal(row, d):
    """מבצע ← טקסט שהאתר מבין (למשל "2 ב-20") + מחיר רגיל, כדי שהשוואת הסל תחשב אותו."""
    reg = row["price"]
    desc = (d.get("description") or "מבצע").strip()
    n, dp = d.get("min_qty") or 1, d.get("discounted_price")
    text = desc
    if dp and dp > 0:
        n = max(1, int(round(n)))
        if n > 1:
            total = dp if dp < reg * n else (dp * n if dp < reg else None)
            if total:
                text = f"{n} ב-{round(total, 2):g} · {desc}"
        elif dp < reg:
            row["price"] = round(dp, 2)
    row.update(is_deal=True, deal_text=text[:120], regular_price=reg,
               valid_until=(d.get("ends") or "")[:10] or None)


CLAUDE_NETS = ("160.79.104.0/21",)  # הענן של Anthropic, שממנו רצות הבדיקות של Claude (כמו בפרויקט הזה)
SEARCH_BOTS = re.compile(r"googlebot|google-inspectiontool|adsbot-google|bingbot|bingpreview|yandexbot|duckduckbot|applebot|"
                         r"facebookexternalhit|whatsapp|telegrambot|slackbot|twitterbot|linkedinbot", re.I)


def known_label(ip, ua, org):
    """מי זה, כשאפשר לדעת: claude = הבדיקות של Claude מהענן · searchbot = מנוע חיפוש או תצוגה מקדימה של קישור
    (גוגל, בינג, וואטסאפ...) — לפי ה-User-Agent, ורק כשגם הספק מתאים (אחרת כל אחד יכול לכתוב "Googlebot")."""
    import ipaddress
    try:
        a = ipaddress.ip_address(ip)
        if any(a in ipaddress.ip_network(n) for n in CLAUDE_NETS) or re.search(r"anthropic", org or "", re.I):
            return "claude"
    except ValueError:
        pass
    if SEARCH_BOTS.search(ua or "") and re.search(r"google|microsoft|yandex|apple|facebook|meta|duckduck|telegram|twitter|linkedin|slack", org or "", re.I):
        return "searchbot"
    return ""


def own_ips():
    """הכתובות של השרת שלנו (מה-DNS של האתר ושל שרת המחירים, ו-SERVER_IPS בקובץ ההגדרות) — לא חשודים ולא נחסמים."""
    import socket
    out = {x.strip() for x in env("SERVER_IPS").split(",") if x.strip()}
    for host in ("server.yamshopping.com", "www.yamshopping.com", "yamshopping.com"):
        try:
            for info in socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP):
                out.add(info[4][0])
        except OSError:
            pass
    return out


def _q(v):
    from urllib.parse import quote
    return quote(str(v), safe="")


def _mem_mb():
    try:
        for line in open("/proc/meminfo"):
            if line.startswith("MemTotal"):
                return int(line.split()[1]) // 1024
    except OSError:
        pass
    return 0


def status_report():
    con = db.connect(env("DB_PATH", os.path.join(env("DATA_DIR", "/var/lib/yamshopping"), "prices.db")))
    rows = con.execute("select * from chain_status order by chain").fetchall()
    for r in rows:
        when = time.strftime("%d/%m %H:%M", time.localtime(r["last_ok"])) if r["last_ok"] else "—"
        print(f"{'❌' if r['error'] else '✅'} {C.hebrew(r['chain'])}: עדכון אחרון {when} · {r['stores']} סניפים · {r['items']} מוצרים"
              + (f" · {r['error']}" if r["error"] else ""))
    n = con.execute("select count(*) from prices").fetchone()[0]
    print(f"סה\"כ {n:,} מחירים בכל הסניפים")


def main(argv=None):
    argv = argv or sys.argv[1:]
    mode = argv[0] if argv else "hourly"
    load_env_file(env("YAM_ENV", "/etc/yamshopping/collector.env"))
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    for noisy in ("urllib3",):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    if mode == "status":
        status_report()
        return 0
    if mode not in ("full", "hourly", "test"):
        print(__doc__)
        return 2
    r = Runner(mode, only=argv[1].split(",") if mode == "test" and len(argv) > 1 else None)
    code = r.run()
    if r.summary:
        print("\n===== סיכום =====")
        print("\n".join(r.summary))
    return code


if __name__ == "__main__":
    sys.exit(main())
