"""מיקום משוער לכל סניף (לחיפוש "קרוב אליי"): לפי העיר, מ-OpenStreetMap (Nominatim).

כל עיר נבדקת פעם אחת ונשמרת במאגר. לפי כללי השימוש של Nominatim — בקשה אחת בשנייה, עם שם האתר.
"""
import re
import time

import requests

UA = "YamShoppingCollector/1.0 (+https://www.yamshopping.com)"


# רשימת היישובים של הלמ"ס ב-data.gov.il (סמל יישוב ← שם)
CITY_CODES_URL = "https://data.gov.il/api/3/action/datastore_search"
CITY_CODES_RESOURCE = "5c78e9fa-c2e2-4771-93ff-7f400a12f7ba"


def load_city_codes(con):
    """טוען את כל קודי היישובים לטבלה city_codes. מחזיר כמה נטענו (0 אם האתר לא ענה — נשארים עם מה שיש)."""
    r = requests.get(CITY_CODES_URL, params={"resource_id": CITY_CODES_RESOURCE, "limit": 5000},
                     headers={"User-Agent": "Mozilla/5.0 " + UA}, timeout=60)
    r.raise_for_status()
    out = {}
    for rec in r.json()["result"]["records"]:
        code = name = None
        for k, v in rec.items():
            k = k.strip()
            if "סמל" in k and "ישוב" in k:
                code = str(v).strip()
            elif k.startswith("שם") and "ישוב" in k and "לועזי" not in k:
                name = re.sub(r"\s+", " ", str(v)).strip()
        if code and code.isdigit() and name:
            out[str(int(code))] = name
    if out:
        con.executemany("insert or replace into city_codes(code, name) values (?, ?)", out.items())
        con.commit()
    return len(out)


def geocode_cities(con, max_new=150):
    cities = [r[0] for r in con.execute(
        "select distinct city from stores where city <> '' and city not in (select city from geo_cache)")][:max_new]
    s = requests.Session()
    s.headers["User-Agent"] = UA
    found = 0
    for city in cities:
        lat = lng = None
        if not city.isdigit():  # חלק מהרשתות כותבות קוד יישוב במקום שם
            try:
                r = s.get("https://nominatim.openstreetmap.org/search",
                          params={"format": "json", "limit": 1, "countrycodes": "il", "accept-language": "he", "q": city},
                          timeout=20)
                j = r.json() if r.ok else []
                if j:
                    lat, lng = float(j[0]["lat"]), float(j[0]["lon"])
                    found += 1
            except Exception:
                pass
            time.sleep(1.1)
        con.execute("insert or replace into geo_cache(city, lat, lng, at) values (?,?,?,?)", (city, lat, lng, int(time.time())))
        con.commit()
    con.execute("""update stores set lat = (select g.lat from geo_cache g where g.city = stores.city),
                                     lng = (select g.lng from geo_cache g where g.city = stores.city)
                   where lat is null and city in (select city from geo_cache where lat is not null)""")
    con.commit()
    return found
