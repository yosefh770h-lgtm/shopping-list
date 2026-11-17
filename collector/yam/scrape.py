"""הורדת הקבצים מהרשתות (הקוד שלנו — yam/sources.py), רשת אחת בכל פעם.

הקבצים נשמרים כמו שהם — הפענוח שלנו מטפל ב-gz / zip / UTF-16 —
וכל קובץ מפוענח מיד אחרי ההורדה ונמחק, כדי לא למלא את הדיסק.
"""
import datetime as dt
import glob
import os
import shutil
import time
from concurrent.futures import ThreadPoolExecutor

from . import sources

KINDS = tuple(sources.PREFIX)

# בין קובץ לקובץ ברשתות "עדינות" (שחוסמות כתובת ששולחת הרבה בקשות)
GENTLE_PAUSE = 1.5


def _safe(name):
    return os.path.basename(name).replace("..", "_") or "file"


def download(chain, kind, dump_dir, status_dir, on_file, threads=3, limit=None, day=None,
             should_stop=lambda: False, timeout=3 * 3600, skip=None):
    """מוריד את כל הקבצים מסוג kind של היום (או של day) ומעביר כל אחד ל-on_file. מחזיר (כמה קבצים, שגיאות).

    skip(name) — קובץ שכבר טופל בריצה קודמת לא מורד שוב. status_dir נשאר בשביל התאימות ולא בשימוש.
    """
    if kind not in sources.PREFIX:
        raise ValueError(kind)
    http = sources.Http()
    started = time.time()
    try:
        files = sources.list_files(http, chain, kind, day)
    except Exception as e:  # noqa: BLE001 - שגיאה של רשת אחת לא עוצרת את השאר
        return 0, [f"רשימת הקבצים: {e}"[:300]]
    if skip:
        files = [f for f in files if not skip(f[0])]
    if limit:
        files = files[:limit]
    folder = os.path.join(dump_dir, chain)
    os.makedirs(folder, exist_ok=True)

    def fetch(item):
        name, url = item
        path = os.path.join(folder, _safe(name))
        try:
            data = http.get(url).content
            if not data:
                return name, None, "קובץ ריק"
            if data[:200].lstrip().lower().startswith((b"<!doctype html", b"<html")):
                return name, None, "התקבל דף אינטרנט במקום קובץ"
            with open(path, "wb") as f:
                f.write(data)
            return name, path, None
        except Exception as e:  # noqa: BLE001
            return name, None, str(e)

    n, errors = 0, []
    threads = max(1, int(threads or 1))
    with ThreadPoolExecutor(max_workers=threads) as pool:
        # מורידים במקביל בקבוצות קטנות, ומפענחים אחד-אחד (המאגר המקומי לא בטוח לשימוש מכמה תהליכונים)
        for i in range(0, len(files), threads):
            if should_stop() or time.time() - started > timeout:
                break
            for name, path, err in pool.map(fetch, files[i:i + threads]):
                if err:
                    errors.append(f"{name}: {err}"[:300])
                    continue
                try:
                    on_file(kind, os.path.basename(path), path)
                    n += 1
                finally:
                    try:
                        os.remove(path)
                    except OSError:
                        pass
            if threads == 1 and i + 1 < len(files):
                time.sleep(GENTLE_PAUSE)
    return n, errors


def cleanup(dump_dir, status_root, keep_days=2):
    """מוחק קבצים שנשארו מריצה שנקטעה, ותיקיות סטטוס של ימים קודמים."""
    for f in glob.glob(os.path.join(dump_dir, "*", "*")):
        try:
            os.remove(f)
        except OSError:
            pass
    cutoff = (dt.date.today() - dt.timedelta(days=keep_days)).strftime("%Y%m%d")
    for d in glob.glob(os.path.join(status_root, "*")):
        if os.path.basename(d) < cutoff:
            shutil.rmtree(d, ignore_errors=True)
