"""הרשתות שהאוסף מכיר: השם הפנימי (המפתח ב-yam/sources.py) ← השם שמוצג באתר.

ברירת המחדל (כשבבק אופיס עוד לא נשמרה הגדרה): כל הרשתות פעילות חוץ מ-OFF_BY_DEFAULT.
רשת חדשה שתתווסף ל-sources.SOURCES תיאסף אוטומטית, ותוצג באתר בשם האנגלי שלה עד שנוסיף לה שם כאן.
"""

HEBREW = {
    "BAREKET": "עוף והודו ברקת",
    "YAYNO_BITAN_AND_CARREFOUR": "קרפור",
    "CITY_MARKET_KIRYATGAT": "סיטי מרקט קריית גת",
    "CITY_MARKET_SHOPS": "סיטי מרקט",
    "DOR_ALON": "דור אלון",
    "GOOD_PHARM": "גוד פארם",
    "HAZI_HINAM": "חצי חינם",
    "HET_COHEN_NEW_SOURCE": "ח. כהן",
    "KESHET": "קשת טעמים",
    "KING_STORE": "קינג סטור",
    "MAAYAN_2000": "מעיין 2000",
    "MAHSANI_ASHUK_NEW_SOURCE": "מחסני השוק",
    "NETIV_HASED": "נתיב החסד",
    "MESHMAT_YOSEF_1": "משנת יוסף",
    "MESHMAT_YOSEF_2": "משנת יוסף",
    "OSHER_AD": "אושר עד",
    "POLIZER": "פוליצר",
    "RAMI_LEVY": "רמי לוי",
    "SALACH_DABACH": "סאלח דבאח",
    "SHEFA_BARCART_ASHEM": "שפע ברכת השם",
    "SHUFERSAL": "שופרסל",
    "SHUK_AHIR": "שוק העיר",
    "STOP_MARKET": "סטופ מרקט",
    "SUPER_PHARM": "סופר פארם",
    "SUPER_YUDA": "סופר יודה",
    "SUPER_SAPIR": "סופר ספיר",
    "FRESH_MARKET_AND_SUPER_DOSH": "פרש מרקט",
    "TIV_TAAM": "טיב טעם",
    "VICTORY_NEW_SOURCE": "ויקטורי",
    "YELLOW": "יילו",
    "YOHANANOF": "יוחננוף",
    "ZOL_VEBEGADOL": "זול ובגדול",
    "WOLT": "וולט",
    "COFIX": "סופר קופיקס",
}

# רשתות שהאתר שלהן חוסם כתובת ששולחת הרבה בקשות (laibcatalog חסם את השרת ב-10/2026): פונים אליהן רק בריצה
# המלאה של הבוקר, וקובץ אחד בכל פעם
GENTLE = {"VICTORY_NEW_SOURCE", "MAHSANI_ASHUK_NEW_SOURCE", "HET_COHEN_NEW_SOURCE"}
OFF_BY_DEFAULT = {"TIV_TAAM", "SUPER_PHARM", "DOR_ALON", "YELLOW", "WOLT"}

# ריצת הבדיקה בסוף ההתקנה
TEST_CHAINS = ["SHUFERSAL", "RAMI_LEVY", "MESHMAT_YOSEF_1", "MESHMAT_YOSEF_2"]


def hebrew(chain: str) -> str:
    return HEBREW.get(chain, chain)[:40]


def all_chains() -> list:
    """כל הרשתות שיש להן מקור הורדה אצלנו (yam/sources.py)."""
    from .sources import SOURCES
    return list(SOURCES)


def enabled_chains(cfg: dict, known=None) -> list:
    """הרשתות הפעילות לפי ההגדרה בבק אופיס (site_config ← collector ← chains)."""
    known = known or all_chains()
    flags = (cfg or {}).get("chains") or {}
    out = []
    for c in known:
        on = flags.get(c)
        if on is None:
            on = c not in OFF_BY_DEFAULT
        if on:
            out.append(c)
    return out


def visible(cfg: dict, chain: str) -> bool:
    """האם המשתמשים רואים את הרשת: רק כשהמנהל הדליק את המתג הראשי (public), והרשת לא ברשימת המוסתרות (hidden)."""
    cfg = cfg or {}
    hidden = cfg.get("hidden") if isinstance(cfg.get("hidden"), list) else []
    return cfg.get("public") is True and chain not in hidden


def default_config(known=None) -> dict:
    known = known or all_chains()
    return {
        "public": False,
        "hidden": [],
        "chains": {c: c not in OFF_BY_DEFAULT for c in known},
        "shabbat": "margin",
        "margin_min": 60,
    }
