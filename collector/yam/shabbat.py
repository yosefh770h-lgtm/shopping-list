"""השהיה בשבת וחג (לפי ההגדרה בבק אופיס).

הזמנים לפי ירושלים: הדלקת נרות 40 דקות לפני השקיעה, וצאת השבת/החג בצאת הכוכבים.
חגים לפי לוח ארץ ישראל (יום טוב אחד). הספרייה zmanim מחשבת את הזמנים והחגים.

מצבים (site_config ← collector ← shabbat):
  "margin" — השהיה מ-margin_min דקות לפני הדלקת נרות ועד margin_min דקות אחרי הצאת (ברירת המחדל)
  "exact"  — מהדלקת נרות ועד הצאת, בלי מרווח
  "off"    — בלי השהיה
"""
import datetime as dt

TZ = "Asia/Jerusalem"
LAT, LNG = 31.778, 35.235


def _cal(day):
    from zmanim.hebrew_calendar.jewish_calendar import JewishCalendar
    jc = JewishCalendar(day)
    jc.in_israel = True
    return jc


def _zman(day):
    from zmanim.util.geo_location import GeoLocation
    from zmanim.zmanim_calendar import ZmanimCalendar
    geo = GeoLocation("Jerusalem", LAT, LNG, TZ, elevation=0)
    return ZmanimCalendar(geo_location=geo, date=day, candle_lighting_offset=40)


def assur(day) -> bool:
    return bool(_cal(day).is_assur_bemelacha())


def paused(cfg: dict, when=None):
    """מחזיר (True, סיבה) אם עכשיו בתוך זמן ההשהיה."""
    mode = (cfg or {}).get("shabbat", "margin")
    if mode == "off":
        return False, ""
    margin = dt.timedelta(minutes=int((cfg or {}).get("margin_min", 60)) if mode == "margin" else 0)
    try:
        from zoneinfo import ZoneInfo
        now = when or dt.datetime.now(ZoneInfo(TZ))
        today = now.date()
        # היום עצמו שבת/חג ← מושהה עד הצאת (+ מרווח)
        if assur(today) and now <= _zman(today).tzais() + margin:
            return True, "שבת / חג"
        # מחר שבת/חג ← מושהה מהדלקת נרות היום (− מרווח)
        if assur(today + dt.timedelta(days=1)) and now >= _zman(today).candle_lighting() - margin:
            return True, "ערב שבת / חג"
    except Exception as e:  # אם החישוב נכשל — עדיף לא לרוץ מאשר לרוץ בשבת
        return True, f"לא הצלחנו לחשב זמני שבת ({e})"
    return False, ""
