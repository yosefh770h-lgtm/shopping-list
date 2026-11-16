"""🌍 מיקום משוער לפי כתובת IP — לבק אופיס ("מי מעתיק את המחירים?").

הנתונים מ-DB-IP Lite (חינם, רישיון CC BY 4.0, מתעדכן כל חודש): עיר, אזור, מדינה ונקודה על המפה,
וספק האינטרנט / הארגון שהכתובת שייכת לו. המיקום הוא ברמת העיר בערך — לא כתובת מדויקת. מי שגולש דרך VPN
או משרת בענן — רואים את המיקום של השרת, ולכן מסמנים כתובות של חברות שרתים ו-VPN.

הקבצים יורדים לבד פעם בחודש ל-DATA_DIR/geoip (city.mmdb ~130MB, asn.mmdb ~8MB). רק הכתובות החשודות נבדקות.
"""
import datetime as dt
import gzip
import ipaddress
import logging
import os
import re
import shutil
import time

import requests

log = logging.getLogger("yam")
BASE = "https://download.db-ip.com/free/dbip-{kind}-lite-{month}.mmdb.gz"
REFRESH_DAYS = 32

# ספקי ענן, אחסון ו-VPN — כתובת כזו היא בדרך כלל שרת או VPN, לא בית או טלפון של אדם
HOSTING = re.compile(
    r"amazon|aws|google|microsoft|azure|oracle|digitalocean|hetzner|ovh|linode|akamai|vultr|choopa|contabo|scaleway|"
    r"leaseweb|m247|datacamp|cdn77|packethub|tefincom|nordvpn|express ?vpn|proton|mullvad|surfshark|private internet|"
    r"cloudflare|alibaba|tencent|huawei cloud|hostinger|ionos|godaddy|hostwinds|colocrossing|psychz|quadranet|"
    r"servers\.com|frantech|buyvm|kamatera|serverius|g-core|gcore|zenlayer|cogent|hurricane|tor exit|data ?cent|"
    r"hosting|vps|cloud", re.I)

COUNTRY_HE = {
    "IL": "ישראל", "US": "ארצות הברית", "GB": "בריטניה", "DE": "גרמניה", "FR": "צרפת", "NL": "הולנד", "RU": "רוסיה",
    "UA": "אוקראינה", "CN": "סין", "IN": "הודו", "SG": "סינגפור", "JP": "יפן", "KR": "דרום קוריאה", "HK": "הונג קונג",
    "CA": "קנדה", "AU": "אוסטרליה", "BR": "ברזיל", "IT": "איטליה", "ES": "ספרד", "PL": "פולין", "RO": "רומניה",
    "SE": "שוודיה", "FI": "פינלנד", "NO": "נורבגיה", "DK": "דנמרק", "IE": "אירלנד", "CH": "שווייץ", "AT": "אוסטריה",
    "BE": "בלגיה", "CZ": "צ'כיה", "HU": "הונגריה", "BG": "בולגריה", "GR": "יוון", "TR": "טורקיה", "CY": "קפריסין",
    "EG": "מצרים", "JO": "ירדן", "AE": "איחוד האמירויות", "SA": "ערב הסעודית", "PS": "הרשות הפלסטינית", "LB": "לבנון",
    "IR": "איראן", "PK": "פקיסטן", "VN": "וייטנאם", "TH": "תאילנד", "ID": "אינדונזיה", "MY": "מלזיה", "PH": "הפיליפינים",
    "MX": "מקסיקו", "AR": "ארגנטינה", "ZA": "דרום אפריקה", "NG": "ניגריה", "LT": "ליטא", "LV": "לטביה", "EE": "אסטוניה",
    "MD": "מולדובה", "BY": "בלארוס", "GE": "גאורגיה", "AM": "ארמניה", "KZ": "קזחסטן", "PT": "פורטוגל", "LU": "לוקסמבורג",
    "IS": "איסלנד", "SC": "סיישל", "PA": "פנמה", "VG": "איי הבתולה הבריטיים", "TW": "טייוואן", "BD": "בנגלדש",
}


def _month(d):
    return d.strftime("%Y-%m")


def ensure(folder, session=None):
    """מוריד את הקבצים אם אין או שהם בני יותר מחודש. כשל לא עוצר כלום — פשוט בלי מיקום."""
    os.makedirs(folder, exist_ok=True)
    s = session or requests
    for kind, name in (("city", "city.mmdb"), ("asn", "asn.mmdb")):
        path = os.path.join(folder, name)
        if os.path.exists(path) and time.time() - os.path.getmtime(path) < REFRESH_DAYS * 86400:
            continue
        today = dt.date.today()
        for d in (today, today.replace(day=1) - dt.timedelta(days=1)):  # החודש, ואם עוד לא פורסם — הקודם
            try:
                r = s.get(BASE.format(kind=kind, month=_month(d)), timeout=300, stream=True)
                if r.status_code != 200:
                    continue
                tmp = path + ".tmp"
                with open(tmp + ".gz", "wb") as f:
                    for chunk in r.iter_content(1 << 20):
                        f.write(chunk)
                with gzip.open(tmp + ".gz", "rb") as src, open(tmp, "wb") as dst:
                    shutil.copyfileobj(src, dst)
                os.remove(tmp + ".gz")
                os.replace(tmp, path)
                log.info("🌍 מאגר המיקומים %s עודכן (%s)", kind, _month(d))
                break
            except Exception as e:  # noqa: BLE001
                log.warning("🌍 הורדת מאגר המיקומים %s: %s", kind, e)


class Geo:
    def __init__(self, folder):
        self.city = self.asn = None
        try:
            import maxminddb
        except ImportError:
            return
        for attr, name in (("city", "city.mmdb"), ("asn", "asn.mmdb")):
            path = os.path.join(folder, name)
            if os.path.exists(path):
                try:
                    setattr(self, attr, maxminddb.open_database(path))
                except Exception as e:  # noqa: BLE001
                    log.warning("🌍 %s: %s", name, e)

    def lookup(self, ip):
        """{country_code, country, region, city, lat, lng, asn, org, hosting} — מה שידוע. כתובת פרטית / לא תקינה → {}."""
        try:
            a = ipaddress.ip_address(ip)
        except ValueError:
            return {}
        if a.is_private or a.is_loopback or a.is_reserved:
            return {}
        out = {}
        if self.city:
            r = self.city.get(ip) or {}
            c = r.get("country") or {}
            code = c.get("iso_code") or ""
            out["country_code"] = code
            out["country"] = COUNTRY_HE.get(code) or (c.get("names") or {}).get("en", "")
            subs = r.get("subdivisions") or []
            out["region"] = ((subs[0].get("names") or {}).get("en", "")) if subs else ""
            out["city"] = ((r.get("city") or {}).get("names") or {}).get("en", "")
            loc = r.get("location") or {}
            if loc.get("latitude") is not None:
                out["lat"], out["lng"] = round(loc["latitude"], 3), round(loc["longitude"], 3)
        if self.asn:
            r = self.asn.get(ip) or {}
            out["asn"] = r.get("autonomous_system_number") or 0
            out["org"] = (r.get("autonomous_system_organization") or "")[:120]
        out["hosting"] = bool(out.get("org") and HOSTING.search(out["org"]))
        return {k: v for k, v in out.items() if v not in ("", None)}


def ip_key(ip):
    """כמו ב-auth-guard: IPv4 כמו שהוא, IPv6 לפי ה-/64 — כך נשמרות הכתובות ביומן הכניסות (auth_events)."""
    try:
        a = ipaddress.ip_address(ip)
    except ValueError:
        return ip
    if a.version == 4:
        return str(a)
    if a.ipv4_mapped:
        return str(a.ipv4_mapped)
    groups = a.exploded.split(":")[:4]
    return ":".join(g.lstrip("0") or "0" for g in groups) + "::/64"
