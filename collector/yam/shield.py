"""🛡️ חומת ההגנה של השרת (yam-shield): עוצרת הצפות, התקפות עומס (DDoS) וסורקים — מיד, בתוך הליבה של לינוקס.

איך זה עובד:
• טבלת nftables משלנו (inet yamshield). לא נוגעים ב-Caddyfile, ב-iptables או בכללים אחרים, ורק בפורטים 80 ו-443
  (ו-SSH רק למי שניסה לנחש סיסמה). החסימה עצמה נעשית בליבה, כך שהיא עובדת גם כשהשרת בעומס.
• לכל כתובת IP: עד RATE חיבורים חדשים בשנייה (עם BURST בבת אחת), ועד CONNS חיבורים פתוחים. מי שעובר — נחסם ל-BLOCK_MIN דקות.
• כתובות שלא נחסמות אף פעם: השרת שלנו, כתובות פנימיות, Googlebot ו-Bingbot ו-Cloudflare (לפי הרשימות הרשמיות שלהם),
  הכתובות ב"לא מוגבלות" בבק אופיס, וכתובות שמנהל נכנס מהן לאתר לאחרונה.
• כתובות משותפות (נטפרי וכדומה — 3 חשבונות ומעלה נכנסו מאותה כתובת) מקבלות סף גבוה פי SHARED_MULT.
• זיהוי חכם של DDoS: כשמספר החיבורים החדשים בדקה קופץ הרבה מעל הרגיל, השומר עובר ל"מצב התקפה" ל-15 דקות:
  הסף לכל כתובת יורד, וכתובות עם הרבה חיבורים פתוחים נחסמות ל-30 דקות.
• ניסיון פריצה (/.env, wp-login וכו') או פנייה ישירה לשרת המחירים — ה-API רושם, והשומר חוסם את הכתובת (24 שעות / שעה).
• ניחוש סיסמאות ב-SSH: 10 כישלונות ב-10 דקות — חסימה לשעה (רק לפורט של SSH).
• מדווח לבק אופיס ← 🛡️ בוטים ואבטחה: כל חסימה (security_events, עם התראה מיידית לטלפון) ומדידה כל דקה (shield_load).
• ההגדרות מהבק אופיס (site_config 'shield') נקראות כל 20 שניות. כיבוי מיידי: שם, או הקובץ /etc/yamshopping/shield.off.

הרצה: python -m yam.shield run   (כ-root, systemd: collector/bin/shield-install.sh)
"""
import collections
import http.client
import ipaddress
import json
import os
import re
import shutil
import socket
import ssl
import statistics
import subprocess
import sys
import time
import urllib.parse
import urllib.request

TABLE = "yamshield"
OFF_FILE = os.environ.get("SHIELD_OFF", "/etc/yamshopping/shield.off")
HOSTS = ("www.yamshopping.com", "yamshopping.com", "server.yamshopping.com")
BOT_LISTS = ("https://developers.google.com/static/search/apis/ipranges/googlebot.json",
             "https://www.bing.com/toolbox/bingbot.json")
# אם יום אחד מדליקים את הענן הכתום של Cloudflare — כל התנועה תגיע מהכתובות שלהם, ואסור לחסום אותן (אחרת האתר כולו נופל)
CF_LISTS = ("https://www.cloudflare.com/ips-v4", "https://www.cloudflare.com/ips-v6")
DEFAULTS = {
    "on": True,
    "rate": 40,          # חיבורים חדשים בשנייה לכל כתובת
    "burst": 200,        # ...ובבת אחת
    "conns": 300,        # חיבורים פתוחים בו זמנית לכל כתובת
    "block_min": 10,     # כמה זמן נחסם מי שהציף
    "shared_mult": 10,   # כתובת משותפת (נטפרי) — סף גבוה פי כמה
    "probe_hours": 24,   # ניסיון פריצה
    "direct_min": 60,    # פנייה ישירה לשרת המחירים (0 = רק 403 בלי חסימה בחומת האש)
    "ssh_max": 10,       # כישלונות SSH ב-10 דקות
    "ssh_min": 60,
    "ddos_min_new": 3000,  # מצב התקפה: לפחות כך חיבורים חדשים בדקה...
    "ddos_factor": 8,      # ...ופי כך מהרגיל
    "ddos_conns": 40,      # במצב התקפה: חוסמים כתובת עם יותר חיבורים פתוחים מזה
    "load_factor": 2.5,    # עומס: ממוצע עומס לכל מעבד מעל זה 3 דקות ברציפות
}


def log(*a):
    print(time.strftime("%F %T"), *a, flush=True)


def load_env_file(path):
    if not path or not os.path.exists(path):
        return
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def num(v, default, lo=0, hi=10 ** 7):
    try:
        v = int(v)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, v))


def settings(raw):
    """ההגדרות מהבק אופיס, עם ברירות מחדל ותחומים בטוחים (ערך שבור → ברירת המחדל)."""
    raw = raw if isinstance(raw, dict) else {}
    c = dict(DEFAULTS)
    c["on"] = raw.get("on") is not False
    for k, lo, hi in (("rate", 5, 10000), ("burst", 20, 100000), ("conns", 20, 100000), ("block_min", 1, 1440),
                      ("shared_mult", 1, 100), ("probe_hours", 0, 720), ("direct_min", 0, 1440), ("ssh_max", 0, 1000),
                      ("ssh_min", 1, 1440), ("ddos_min_new", 100, 10 ** 7), ("ddos_factor", 2, 1000), ("ddos_conns", 5, 10000)):
        c[k] = num(raw.get(k), DEFAULTS[k], lo, hi)
    try:
        c["load_factor"] = max(0.5, min(50.0, float(raw.get("load_factor", DEFAULTS["load_factor"]))))
    except (TypeError, ValueError):
        pass
    c["allow"] = [str(x.get("ip", "")) for x in raw.get("allow", []) if isinstance(x, dict)] if isinstance(raw.get("allow"), list) else []
    c["blocked"] = [str(x.get("ip", "")) for x in raw.get("blocked", []) if isinstance(x, dict)] if isinstance(raw.get("blocked"), list) else []
    c["unblock"] = [x for x in raw.get("unblock", []) if isinstance(x, dict)] if isinstance(raw.get("unblock"), list) else []
    # "חסום שוב" מהבק אופיס (ביטול של שחרור בטעות): חסימה זמנית גם לאתר וגם ל-SSH
    c["reblock"] = [x for x in raw.get("reblock", []) if isinstance(x, dict)] if isinstance(raw.get("reblock"), list) else []
    return c


# ---------- כתובות ----------

def net(x):
    try:
        return ipaddress.ip_network(str(x).strip(), strict=False)
    except ValueError:
        return None


def internal(ip):
    try:
        a = ipaddress.ip_address(str(ip).split("/")[0])
    except ValueError:
        return False
    return a.is_private or a.is_loopback or a.is_link_local or a.is_unspecified or a.is_reserved or a.is_multicast


def blockable(x, allow_nets):
    """מותר לחסום: כתובת תקינה, לא פנימית, לא טווח ענק (מעל /16 ב-IPv4, /32 ב-IPv6), ולא חופפת לרשימת המותרים."""
    n = net(x)
    if not n or internal(str(n.network_address)) or n.prefixlen < (16 if n.version == 4 else 32):
        return None
    if any(a.version == n.version and (n.overlaps(a)) for a in allow_nets):
        return None
    return n


def split(nets):
    v4 = sorted({str(n) for n in nets if n and n.version == 4})
    v6 = sorted({str(n) for n in nets if n and n.version == 6})
    return v4, v6


def own_ips():
    out = {x.strip() for x in os.environ.get("SERVER_IPS", "").split(",") if x.strip()}
    for host in HOSTS:
        try:
            for info in socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP):
                out.add(info[4][0])
        except OSError:
            pass
    try:
        for itf in json.loads(subprocess.run(["ip", "-j", "addr"], capture_output=True, text=True, timeout=10).stdout or "[]"):
            for a in itf.get("addr_info", []):
                out.add(a.get("local", ""))
    except Exception:  # noqa: BLE001
        pass
    return {x for x in out if net(x)}


def bot_ranges(cache):
    """הטווחים הרשמיים של Googlebot ו-Bingbot (מתעדכן פעם ב-12 שעות; אם אין רשת — מהעותק השמור)."""
    try:
        if os.path.exists(cache) and time.time() - os.path.getmtime(cache) < 12 * 3600:
            return json.load(open(cache))
    except (OSError, ValueError):
        pass
    out = []
    for url in BOT_LISTS:
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "yam-shield"}), timeout=20) as r:
                data = json.load(r)
            for p in data.get("prefixes", []):
                v = p.get("ipv4Prefix") or p.get("ipv6Prefix")
                if v and net(v):
                    out.append(v)
        except Exception as e:  # noqa: BLE001
            log("⚠️ רשימת בוטים", url, e)
    for url in CF_LISTS:
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "yam-shield"}), timeout=20) as r:
                out += [x.strip() for x in r.read().decode().split() if net(x.strip())]
        except Exception as e:  # noqa: BLE001
            log("⚠️ רשימת Cloudflare", url, e)
    if out:
        try:
            json.dump(out, open(cache, "w"))
        except OSError:
            pass
        return out
    try:
        return json.load(open(cache))
    except (OSError, ValueError):
        return []


# ---------- nftables ----------

def nft(script, check=True):
    r = subprocess.run(["nft", "-f", "-"], input=script, capture_output=True, text=True, timeout=30)
    if check and r.returncode != 0:
        raise RuntimeError("nft: " + r.stderr.strip()[:500])
    return r.returncode == 0


def nft_json(*args):
    r = subprocess.run(["nft", "-j", *args], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        return {}
    try:
        return json.loads(r.stdout or "{}")
    except ValueError:
        return {}


SETS = """
  set allow4 { type ipv4_addr; flags interval; auto-merge; }
  set allow6 { type ipv6_addr; flags interval; auto-merge; }
  set shared4 { type ipv4_addr; flags interval; auto-merge; }
  set shared6 { type ipv6_addr; flags interval; auto-merge; }
  set manual4 { type ipv4_addr; flags interval; auto-merge; }
  set manual6 { type ipv6_addr; flags interval; auto-merge; }
  set auto4 { type ipv4_addr; flags timeout; size 65536; }
  set auto6 { type ipv6_addr; flags timeout; size 65536; }
  set flood4 { type ipv4_addr; flags dynamic, timeout; size 65536; }
  set flood6 { type ipv6_addr; flags dynamic, timeout; size 65536; }
  set ssh4 { type ipv4_addr; flags timeout; size 65536; }
  set ssh6 { type ipv6_addr; flags timeout; size 65536; }
  set m4 { type ipv4_addr; flags dynamic, timeout; timeout 1m; size 131072; }
  set m6 { type ipv6_addr; flags dynamic, timeout; timeout 1m; size 131072; }
  set ms4 { type ipv4_addr; flags dynamic, timeout; timeout 1m; size 65536; }
  set ms6 { type ipv6_addr; flags dynamic, timeout; timeout 1m; size 65536; }
  set mx4 { type ipv4_addr; flags dynamic, timeout; timeout 1m; size 131072; }
  set mx6 { type ipv6_addr; flags dynamic, timeout; timeout 1m; size 131072; }
  set cc4 { type ipv4_addr; flags dynamic; size 131072; }
  set cc6 { type ipv6_addr; flags dynamic; size 131072; }
  counter newconn {}
  counter dropped {}
  counter floods {}
  counter sshdrop {}
"""


def rules(c, attack=False, ssh_port=22):
    """הכללים לפי ההגדרות. במצב התקפה הסף יורד לשליש (וסט מדידה נפרד, כי הסף נשמר בכל רשומה)."""
    rate, burst = c["rate"], c["burst"]
    m = "mx" if attack else "m"
    if attack:
        rate, burst = max(5, rate // 3), max(20, burst // 3)
        conns = max(20, c["conns"] // 3)
    else:
        conns = c["conns"]
    srate, sburst = rate * c["shared_mult"], burst * c["shared_mult"]
    t = f"{c['block_min']}m"
    return f"""
flush chain inet {TABLE} input
flush chain inet {TABLE} web
add rule inet {TABLE} input tcp dport {ssh_port} ip saddr @ssh4 ip saddr != @allow4 counter name sshdrop drop
add rule inet {TABLE} input tcp dport {ssh_port} ip6 saddr @ssh6 ip6 saddr != @allow6 counter name sshdrop drop
add rule inet {TABLE} input meta l4proto {{ tcp, udp }} th dport {{ 80, 443 }} jump web
add rule inet {TABLE} web ip saddr @allow4 return
add rule inet {TABLE} web ip6 saddr @allow6 return
add rule inet {TABLE} web ip saddr @manual4 counter name dropped drop
add rule inet {TABLE} web ip6 saddr @manual6 counter name dropped drop
add rule inet {TABLE} web ip saddr @auto4 counter name dropped drop
add rule inet {TABLE} web ip6 saddr @auto6 counter name dropped drop
add rule inet {TABLE} web ip saddr @flood4 counter name dropped drop
add rule inet {TABLE} web ip6 saddr @flood6 counter name dropped drop
add rule inet {TABLE} web ct state new counter name newconn
add rule inet {TABLE} web ct state new ip saddr @shared4 add @ms4 {{ ip saddr limit rate over {srate}/second burst {sburst} packets }} update @flood4 {{ ip saddr timeout {t} }} counter name floods drop
add rule inet {TABLE} web ct state new ip6 saddr @shared6 add @ms6 {{ ip6 saddr limit rate over {srate}/second burst {sburst} packets }} update @flood6 {{ ip6 saddr timeout {t} }} counter name floods drop
add rule inet {TABLE} web ip saddr @shared4 return
add rule inet {TABLE} web ip6 saddr @shared6 return
add rule inet {TABLE} web ct state new meta nfproto ipv4 add @{m}4 {{ ip saddr limit rate over {rate}/second burst {burst} packets }} update @flood4 {{ ip saddr timeout {t} }} counter name floods drop
add rule inet {TABLE} web ct state new meta nfproto ipv6 add @{m}6 {{ ip6 saddr limit rate over {rate}/second burst {burst} packets }} update @flood6 {{ ip6 saddr timeout {t} }} counter name floods drop
add rule inet {TABLE} web meta l4proto tcp ct state new meta nfproto ipv4 add @cc4 {{ ip saddr ct count over {conns} }} counter name dropped reject with tcp reset
add rule inet {TABLE} web meta l4proto tcp ct state new meta nfproto ipv6 add @cc6 {{ ip6 saddr ct count over {conns} }} counter name dropped reject with tcp reset
"""


def ensure_table():
    """יוצר את הטבלה אם חסרה (אחרי אתחול). לא מוחק סטים קיימים — החסימות נשמרות."""
    nft(f"""add table inet {TABLE}
table inet {TABLE} {{{SETS}
  chain input {{ type filter hook input priority filter - 5; policy accept; }}
  chain web {{ }}
}}""")


def drop_table():
    nft(f"delete table inet {TABLE}", check=False)


def fill(name, items):
    """מחליף את התוכן של סט שלם בפעולה אחת (בלי רגע שבו הוא ריק)."""
    s = f"flush set inet {TABLE} {name}\n"
    for i in range(0, len(items), 500):
        s += f"add element inet {TABLE} {name} {{ {', '.join(items[i:i + 500])} }}\n"
    return s


def set_elements(name):
    """[(כתובת, שניות שנשארו)] בסט."""
    out = []
    for obj in nft_json("list", "set", "inet", TABLE, name).get("nftables", []):
        for e in (obj.get("set") or {}).get("elem", []) or []:
            if isinstance(e, dict) and "elem" in e:
                v, left = e["elem"].get("val"), e["elem"].get("expires", 0)
            else:
                v, left = e, 0
            if isinstance(v, dict) and "prefix" in v:
                v = f"{v['prefix']['addr']}/{v['prefix']['len']}"
            out.append((str(v), int(left or 0)))
    return out


def counters():
    out = {}
    for obj in nft_json("list", "counters", "table", "inet", TABLE).get("nftables", []):
        c = obj.get("counter")
        if c:
            out[c["name"]] = c.get("packets", 0)
    return out


def add_timed(name, ip, minutes):
    n = net(ip)
    if not n:
        return False
    s = f"{name}{n.version}"
    return nft(f"add element inet {TABLE} {s} {{ {n.network_address} timeout {int(minutes)}m }}", check=False)


def remove(ip):
    n = net(ip)
    if not n:
        return
    v = n.version
    for s in (f"flood{v}", f"auto{v}", f"ssh{v}"):
        nft(f"delete element inet {TABLE} {s} {{ {n.network_address} }}", check=False)


# ---------- מדידות ----------

def ss_counts(states=("established", "syn-recv")):
    """כמה חיבורים פתוחים לפורטים 80/443, ולפי כתובת."""
    per, tot = collections.Counter(), {}
    for st in states:
        try:
            out = subprocess.run(["ss", "-Hnt", "state", st, "( sport = :443 or sport = :80 )"],
                                 capture_output=True, text=True, timeout=20).stdout
        except Exception:  # noqa: BLE001
            out = ""
        lines = [x for x in out.splitlines() if x.strip()]
        tot[st] = len(lines)
        for ln in lines:
            parts = ln.split()
            if len(parts) >= 4:
                peer = parts[-1]
                ip = peer.rsplit(":", 1)[0].strip("[]")
                if ip.startswith("::ffff:"):
                    ip = ip[7:]
                per[ip] += 1
    return per, tot


def load_now():
    try:
        l1 = os.getloadavg()[0]
    except OSError:
        l1 = 0.0
    cores = os.cpu_count() or 1
    mem = 0
    try:
        info = {}
        for line in open("/proc/meminfo"):
            k, v = line.split(":", 1)
            info[k] = int(v.split()[0])
        mem = round(100 - 100 * info.get("MemAvailable", 0) / max(1, info.get("MemTotal", 1)))
    except (OSError, ValueError):
        pass
    return round(l1, 2), cores, mem


SSH_RE = re.compile(r"(?:Failed password|Invalid user|authentication failure|Connection closed by (?:invalid|authenticating))"
                    r".*?(?:from|rhost=|user \S+)\s*(\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]{3,39})", re.I)


def ssh_failures(since_s=65):
    try:
        out = subprocess.run(["journalctl", "-u", "ssh", "-u", "sshd", "--since", f"-{since_s}s", "--no-pager", "-o", "cat"],
                             capture_output=True, text=True, timeout=20).stdout
    except Exception:  # noqa: BLE001
        return collections.Counter()
    return collections.Counter(m.group(1) for m in SSH_RE.finditer(out) if net(m.group(1)))


def site_ok():
    """האתר עונה? פונים ל-Caddy בשרת עצמו (443 עם השם של האתר). 3 כישלונות ברציפות = נפילה."""
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        c = http.client.HTTPSConnection("127.0.0.1", 443, timeout=10, context=ctx)
        c.sock = ctx.wrap_socket(socket.create_connection(("127.0.0.1", 443), timeout=10), server_hostname="www.yamshopping.com")
        c.request("HEAD", "/", headers={"Host": "www.yamshopping.com", "User-Agent": "yam-shield"})
        st = c.getresponse().status
        c.close()
        return st < 500, f"HTTP {st}"
    except Exception as e:  # noqa: BLE001
        return False, str(e)[:100]


def is_attack(history, new_now, c):
    """קפיצה חדה בחיבורים חדשים לעומת השעה האחרונה = התקפה."""
    base = statistics.median(history) if len(history) >= 5 else 0
    return new_now >= c["ddos_min_new"] and new_now >= c["ddos_factor"] * max(base, 1), int(base)


# ---------- Supabase ----------

class Supa:
    def __init__(self, url, key):
        self.url, self.key = url.rstrip("/"), key

    def req(self, method, path, body=None, prefer="return=minimal"):
        h = {"apikey": self.key, "Content-Type": "application/json", "Prefer": prefer}
        if self.key.startswith("eyJ"):
            h["Authorization"] = "Bearer " + self.key
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(f"{self.url}/rest/v1/{path}", data=data, method=method, headers=h)
        with urllib.request.urlopen(r, timeout=20) as res:
            txt = res.read().decode() or "null"
        return json.loads(txt)


class Shield:
    def __init__(self):
        load_env_file(os.environ.get("YAM_ENV", "/etc/yamshopping/collector.env"))
        self.data = os.environ.get("DATA_DIR", "/var/lib/yamshopping")
        self.api_file = os.environ.get("SHIELD_FILE", os.path.join(self.data, "shield-api.jsonl"))
        self.ssh_port = num(os.environ.get("SSH_PORT"), 22, 1, 65535)
        url, key = os.environ.get("SUPABASE_URL", ""), os.environ.get("SUPABASE_SERVICE_KEY", "")
        self.supa = Supa(url, key) if url and key else None
        self.cfg, self.raw, self.cfg_at = settings({}), None, 0
        self.ip_allow, self.known, self.known_at = [], ([], []), 0
        self.own, self.own_at, self.bots, self.bots_at = set(), 0, [], 0
        self.events, self.flood_seen, self.done_unblock = [], {}, set()
        self.hist = collections.deque(maxlen=60)
        self.prev = {}
        self.attack_until, self.applied = 0, None
        self.high_load, self.down, self.fails = 0, False, 0
        self.ssh_win = collections.deque()
        self.api_counts = collections.Counter()
        self.geo = None

    # --- הגדרות ---
    def pull(self):
        if not self.supa:
            return
        try:
            rows = self.supa.req("GET", "site_config?select=key,value&key=in.(shield,security)", prefer="")
            d = {r["key"]: r["value"] for r in rows or []}
            self.raw = d.get("shield") or {}
            self.cfg = settings(self.raw)
            sec = d.get("security") or {}
            self.ip_allow = [str(x) for x in sec.get("ip_allow", []) if net(x)] if isinstance(sec.get("ip_allow"), list) else []
        except Exception as e:  # noqa: BLE001
            log("⚠️ הגדרות:", e)

    def pull_known(self):
        if not self.supa:
            return
        try:
            rows = self.supa.req("POST", "rpc/shield_known_ips", {}, prefer="") or []
            self.known = ([r["ip"] for r in rows if r.get("admin")], [r["ip"] for r in rows if not r.get("admin")])
        except Exception as e:  # noqa: BLE001
            log("⚠️ כתובות מוכרות:", e)

    def allow_nets(self):
        items = list(self.own) + ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "100.64.0.0/10",
                                  "169.254.0.0/16", "::1/128", "fc00::/7", "fe80::/10"]
        items += self.bots + self.ip_allow + self.cfg["allow"] + self.known[0]
        return [n for n in (net(x) for x in items) if n]

    def sync_sets(self):
        allow = self.allow_nets()
        a4, a6 = split(allow)
        man = [blockable(x, allow) for x in self.cfg["blocked"]]
        m4, m6 = split(man)
        sh = [blockable(x, allow) for x in self.known[1]]
        s4, s6 = split(sh)
        key = (tuple(a4), tuple(a6), tuple(m4), tuple(m6), tuple(s4), tuple(s6))
        if key == getattr(self, "_sets_key", None):
            return
        nft(fill("allow4", a4) + fill("allow6", a6) + fill("manual4", m4) + fill("manual6", m6) + fill("shared4", s4) + fill("shared6", s6))
        # מי שעכשיו מותר — יוצא מהחסימות הזמניות
        for name in ("flood", "auto", "ssh"):
            for v in (4, 6):
                for ip, _ in set_elements(f"{name}{v}"):
                    a = net(ip)
                    if a and any(a.version == n.version and a.subnet_of(n) for n in allow if n.version == a.version):
                        remove(ip)
        self._sets_key = key
        log(f"✓ רשימות: {len(a4) + len(a6)} מותרים, {len(m4) + len(m6)} חסומים ידנית, {len(s4) + len(s6)} משותפים")

    def apply_rules(self):
        attack = time.time() < self.attack_until
        key = (self.cfg["rate"], self.cfg["burst"], self.cfg["conns"], self.cfg["block_min"], self.cfg["shared_mult"], attack)
        if key != self.applied:
            nft(rules(self.cfg, attack, self.ssh_port))
            self.applied = key
            log("✓ כללים:", "מצב התקפה" if attack else "רגיל", key[:5])

    def do_unblocks(self):
        """שחרורים וחסימות-שוב מהבק אופיס, לפי סדר הזמן — כך שאם שחררו ואז ביטלו, הכתובת נשארת חסומה."""
        now = time.time()
        todo = [("u", x) for x in self.cfg["unblock"]] + [("r", x) for x in self.cfg["reblock"]]
        todo.sort(key=lambda t: str(t[1].get("at", "")))
        allow = None
        for what, u in todo:
            ip, at = str(u.get("ip", "")), str(u.get("at", ""))
            if not net(ip) or (what, ip, at) in self.done_unblock:
                continue
            self.done_unblock.add((what, ip, at))
            if what == "u":
                remove(ip)
                self.flood_seen.pop(ip, None)
                self.event("unblock", ip, 0, {"by": "admin"}, now)
                log("✓ שוחרר:", ip)
                continue
            allow = allow if allow is not None else self.allow_nets()
            if not blockable(ip, allow):
                log("⚠️ לא נחסם שוב (כתובת מותרת או פנימית):", ip)
                continue
            mins = num(u.get("min"), 60, 1, 1440)
            add_timed("flood", ip, mins)
            add_timed("ssh", ip, mins)
            self.event("reblock", ip, 0, {"by": "admin", "min": mins}, now)
            log("✓ נחסם שוב:", ip, mins, "דק׳")

    def event(self, kind, ip="", n=0, detail=None, t=None):
        d = dict(detail or {})
        if ip and self.geo is not None:
            try:
                g = self.geo.lookup(ip)
                d["geo"] = {k: g[k] for k in ("country_code", "country", "city", "org", "hosting") if k in g}
            except Exception:  # noqa: BLE001
                pass
        self.events.append({"src": "server", "kind": kind, "ip": ip[:64], "n": int(n),
                            "detail": d, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(t or time.time()))})
        del self.events[:-500]

    def flush_events(self):
        if not self.events or not self.supa:
            return
        try:
            self.supa.req("POST", "security_events", self.events[:100])
            del self.events[:100]
        except Exception as e:  # noqa: BLE001
            log("⚠️ שליחת אירועים:", e)

    def scan_floods(self):
        now = time.time()
        for v in (4, 6):
            for ip, left in set_elements(f"flood{v}"):
                if ip not in self.flood_seen or now - self.flood_seen[ip] > self.cfg["block_min"] * 60:
                    self.flood_seen[ip] = now
                    self.event("flood", ip, 0, {"min": self.cfg["block_min"], "left": left})
                    log("🛡️ הצפה נחסמה:", ip)
        for ip in [k for k, t in self.flood_seen.items() if now - t > 3 * 3600]:
            self.flood_seen.pop(ip, None)

    def read_api(self):
        """אירועים מה-API: ניסיון פריצה / פנייה ישירה — חוסמים בחומת האש (חוץ ממותרים ומשותפים)."""
        try:
            if not os.path.exists(self.api_file) or os.path.getsize(self.api_file) == 0:
                return
            tmp = self.api_file + ".work"
            os.replace(self.api_file, tmp)
            lines = open(tmp, encoding="utf-8", errors="replace").read().splitlines()
            os.remove(tmp)
        except OSError:
            return
        allow = self.allow_nets()
        shared = [n for n in (net(x) for x in self.known[1]) if n]
        for ln in lines[-2000:]:
            try:
                e = json.loads(ln)
            except ValueError:
                continue
            if not isinstance(e, dict):
                continue
            kind, ip = e.get("kind"), str(e.get("ip", ""))
            if kind not in ("probe", "direct") or not blockable(ip, allow):
                continue
            self.api_counts[kind] += 1
            mins = self.cfg["probe_hours"] * 60 if kind == "probe" else self.cfg["direct_min"]
            is_shared = blockable(ip, shared) is None
            done = bool(mins) and not is_shared and add_timed("auto", ip, mins)
            self.event(kind, ip, 1, {"path": str(e.get("path", ""))[:120], "ua": str(e.get("ua", ""))[:160],
                                     "min": mins if done else 0, "shared": is_shared})
            log(f"🚨 {kind}:", ip, e.get("path", ""), "→ נחסם" if done else "")

    def check_ssh(self):
        if not self.cfg["ssh_max"]:
            return 0
        now = time.time()
        fails = ssh_failures()
        for ip, k in fails.items():
            self.ssh_win.append((now, ip, k))
        while self.ssh_win and now - self.ssh_win[0][0] > 600:
            self.ssh_win.popleft()
        tot = collections.Counter()
        for _, ip, k in self.ssh_win:
            tot[ip] += k
        allow = self.allow_nets()
        banned = {ip for ip, _ in set_elements("ssh4") + set_elements("ssh6")}
        for ip, k in tot.items():
            if k >= self.cfg["ssh_max"] and ip not in banned and blockable(ip, allow):
                if add_timed("ssh", ip, self.cfg["ssh_min"]):
                    self.event("ssh", ip, k, {"min": self.cfg["ssh_min"]})
                    log("🔑 SSH נחסם:", ip, k)
        return sum(fails.values())

    def minute(self):
        """מדידה כל דקה: חיבורים חדשים, נחסמו, עומס — וזיהוי התקפה, עומס ונפילה."""
        cnt = counters()
        delta = {k: max(0, v - self.prev.get(k, v)) for k, v in cnt.items()}
        self.prev = cnt
        new = delta.get("newconn", 0)
        per, tot = ss_counts()
        l1, cores, mem = load_now()
        attack, base = is_attack(self.hist, new, self.cfg)
        blocked_now = 0
        if attack:
            if time.time() >= self.attack_until:
                allow = self.allow_nets()
                shared = [n for n in (net(x) for x in self.known[1]) if n]
                top = [(ip, k) for ip, k in per.most_common(200) if k > self.cfg["ddos_conns"] and blockable(ip, allow) and blockable(ip, shared)]
                for ip, _ in top:
                    if add_timed("auto", ip, 30):
                        blocked_now += 1
                self.event("ddos", "", new, {"base": base, "blocked": blocked_now, "top": [f"{ip} ({k})" for ip, k in top[:10]],
                                             "syn": tot.get("syn-recv", 0)})
                log(f"🚨 התקפה: {new} חיבורים בדקה (רגיל {base}), {blocked_now} כתובות נחסמו")
            self.attack_until = time.time() + 15 * 60
        else:
            self.hist.append(new)  # מצב רגיל בלבד נכנס לחישוב ה"רגיל"
        hot = l1 / cores > self.cfg["load_factor"] or mem >= 95
        self.high_load = self.high_load + 1 if hot else 0
        if self.high_load == 3:
            self.event("load", "", round(l1 * 100), {"why": f"עומס {l1} על {cores} מעבדים, זיכרון {mem}%", "load1": l1, "mem": mem})
        ok, why = site_ok()
        self.fails = 0 if ok else self.fails + 1
        if self.fails == 3 and not self.down:
            self.down = True
            self.event("down", "", 0, {"why": "האתר לא עונה בשרת עצמו: " + why})
        elif ok and self.down:
            self.down = False
            self.event("up", "", 0, {})
        ssh = self.check_ssh()
        flood_n = len(set_elements("flood4")) + len(set_elements("flood6"))
        auto_n = len(set_elements("auto4")) + len(set_elements("auto6"))
        row = {"new": new, "drop": delta.get("dropped", 0), "flood": delta.get("floods", 0), "est": tot.get("established", 0),
               "syn": tot.get("syn-recv", 0), "load1": l1, "cores": cores, "mem": mem, "blocked": flood_n + auto_n,
               "ssh": ssh, "sshdrop": delta.get("sshdrop", 0), "attack": time.time() < self.attack_until,
               "probe": self.api_counts.pop("probe", 0), "direct": self.api_counts.pop("direct", 0), "up": ok,
               "cfg": {k: self.cfg[k] for k in ("rate", "burst", "conns", "block_min", "shared_mult")}}
        if self.supa:
            try:
                self.supa.req("POST", "shield_load", [{"at": time.strftime("%Y-%m-%dT%H:%M:00Z", time.gmtime()), "data": row}],
                              prefer="resolution=merge-duplicates,return=minimal")
            except Exception as e:  # noqa: BLE001
                log("⚠️ מדידה:", e)

    def refresh_lists(self, now):
        if now - self.own_at > 600:
            self.own, self.own_at = own_ips(), now
        if now - self.bots_at > 6 * 3600:
            self.bots, self.bots_at = bot_ranges(os.path.join(self.data, "searchbots.json")), now
        if now - self.known_at > 600:
            self.pull_known()
            self.known_at = now
        if now - self.cfg_at > 20:
            self.pull()
            self.cfg_at = now

    def run(self):
        if not shutil.which("nft"):
            log("⛔ אין nft בשרת. התקנה: sudo apt-get install -y nftables")
            sys.exit(1)
        try:
            from . import geoip
            self.geo = geoip.Geo(os.path.join(self.data, "geoip"))
        except Exception:  # noqa: BLE001
            self.geo = None
        try:
            subprocess.run(["sysctl", "-q", "-w", "net.ipv4.tcp_syncookies=1"], capture_output=True, timeout=10)
        except Exception:  # noqa: BLE001
            pass
        log("🛡️ השומר עלה")
        last_min, last_cleanup, active = 0, 0, None
        while True:
            now = time.time()
            try:
                self.refresh_lists(now)
                on = self.cfg["on"] and not os.path.exists(OFF_FILE)
                if not on:
                    if active is not False:
                        drop_table()
                        self.applied, self._sets_key = None, None
                        log("⏸️ השומר כבוי (בק אופיס או shield.off) — הטבלה הוסרה")
                    active = False
                else:
                    if active is not True:
                        log("▶️ השומר פעיל")
                    active = True
                    if not nft_json("list", "table", "inet", TABLE):
                        ensure_table()
                        self.applied, self._sets_key = None, None
                    self.sync_sets()
                    self.apply_rules()
                    self.do_unblocks()
                    self.scan_floods()
                    self.read_api()
                    if now - last_min >= 60:
                        last_min = now
                        self.minute()
                if now - last_cleanup > 3600 and self.supa:
                    last_cleanup = now
                    try:
                        self.supa.req("POST", "rpc/shield_cleanup", {})
                    except Exception:  # noqa: BLE001
                        pass
                self.flush_events()
            except Exception as e:  # noqa: BLE001
                log("⚠️", type(e).__name__, e)
            time.sleep(3)


def main(argv):
    cmd = argv[1] if len(argv) > 1 else "run"
    if cmd == "run":
        Shield().run()
    elif cmd == "off":
        drop_table()
        print("הטבלה הוסרה (השירות יחזיר אותה אם הוא פעיל — לכיבוי: touch " + OFF_FILE + ")")
    elif cmd == "status":
        for name in ("flood4", "flood6", "auto4", "auto6", "manual4", "ssh4", "shared4", "allow4"):
            print(name, len(set_elements(name)))
        print(counters())
    elif cmd == "unblock" and len(argv) > 2:
        remove(argv[2])
        print("שוחרר:", argv[2])
    else:
        print("python -m yam.shield run | status | off | unblock <ip>")


if __name__ == "__main__":
    main(sys.argv)
