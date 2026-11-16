"""הורדת הקבצים מהרשתות דרך il-supermarket-scraper (pip), רשת אחת בכל פעם.

הקבצים נשמרים כמו שהם (בלי פריסה של הספרייה) — הפענוח שלנו מטפל ב-gz / zip / UTF-16 —
וכל קובץ מפוענח מיד אחרי ההורדה ונמחק, כדי לא למלא את הדיסק.
"""
import asyncio
import datetime as dt
import glob
import os
import shutil

KINDS = {
    "stores": "STORE_FILE",
    "pricefull": "PRICE_FULL_FILE",
    "promofull": "PROMO_FULL_FILE",
    "price": "PRICE_FILE",
    "promo": "PROMO_FILE",
}


def _scraper(chain, dump_dir, status_dir, threads):
    from il_supermarket_scarper import ScraperFactory
    from il_supermarket_scarper.utils import DumpFolderNames
    from il_supermarket_scarper.utils.databases import JsonDataBase
    try:  # 1.0.9 ומעלה: utils.files.file_output (מיוצא גם מ-utils)
        from il_supermarket_scarper.utils import DiskFileOutput
    except ImportError:  # pragma: no cover - גרסאות ישנות
        from il_supermarket_scarper.utils.file_output import DiskFileOutput

    enum = getattr(ScraperFactory, chain, None)
    if enum is None:
        raise RuntimeError(f"הרשת {chain} לא קיימת בספרייה il-supermarket-scraper")
    folder = os.path.join(dump_dir, chain)
    os.makedirs(folder, exist_ok=True)
    scraper = enum.value(file_output=DiskFileOutput(storage_path=folder, extract_gz=False),
                         status_database=JsonDataBase(DumpFolderNames[chain].value, base_path=status_dir))
    scraper.max_threads = threads
    return scraper, folder


async def _download(chain, kind, dump_dir, status_dir, threads, limit, day, on_file, should_stop):
    scraper, folder = _scraper(chain, dump_dir, status_dir, threads)
    when = dt.datetime.combine(day, dt.time()) if day else None
    n, errors = 0, []
    # את המגבלה (limit) סופרים כאן ולא בספרייה: הספרייה חותכת לפי limit *לפני* הסינון לפי תאריך,
    # כך שעם limit=1 הקובץ הראשון ברשימה (לפעמים של יום אחר) נזרק ולא מורד כלום
    async for res in scraper.scrape(limit=None, files_types=[KINDS[kind]], when_date=when):
        paths = sorted(glob.glob(os.path.join(folder, glob.escape(res.file_name) + "*")))
        if not res.downloaded or not paths:
            if res.error:
                errors.append(f"{res.file_name}: {res.error}"[:300])
            continue
        for p in paths:
            try:
                on_file(kind, os.path.basename(p), p)
                n += 1
            finally:
                try:
                    os.remove(p)
                except OSError:
                    pass
        if should_stop() or (limit and n >= limit):
            break
    return n, errors


def download(chain, kind, dump_dir, status_dir, on_file, threads=3, limit=None, day=None,
             should_stop=lambda: False, timeout=3 * 3600):
    """מוריד את כל הקבצים מסוג kind של היום (או של day) ומעביר כל אחד ל-on_file. מחזיר (כמה קבצים, שגיאות)."""
    return asyncio.run(asyncio.wait_for(
        _download(chain, kind, dump_dir, status_dir, threads, limit, day, on_file, should_stop), timeout))


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
