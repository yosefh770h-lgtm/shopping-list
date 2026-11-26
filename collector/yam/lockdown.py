"""🚧 מצב שיפוצים וזיהוי פריצה בשרת (yam-lockdown).

מה זה עושה (שירות systemd, כ-root, כל 10 שניות):
• מצב שיפוצים: קורא מ-Supabase את site_lock. סגור → יוצר את קובץ הדגל FLAG, ו-Caddy (/etc/caddy/maint.caddy) מציג לכולם
  "האתר בשיפוצים" (חוץ מהבעלים עם קישור המעקף). פתוח → מוחק את הדגל. בלי חיבור ל-Supabase — המצב האחרון נשאר כמו שהוא.
• זיהוי פריצה (כל 30 שניות): משווה את קבצי האתר (/var/www/shopping-list) ואת קוד השרת (/opt/yamshopping/repo) ל-git:
  קובץ ששונה או נוסף בלי לעבור דרך GitHub, commit שקיים רק בשרת, או מאגר שמושך ממקום אחר — זה סימן ברור.
  אם זה נשאר גם בבדיקה הבאה (לא עדכון באמצע) → האתר נסגר מיד (אם "סגירה אוטומטית" דלוקה), כולם מנותקים, והתראה לטלפון.
• שינויים בהגדרות השרת (מפתחות SSH, משתמשים, sudo, cron, שירותים, Caddy) → התראה בלבד (לפעמים זה אנחנו).
• בקשה לפתוח מחדש (מהבק אופיס) → בדיקה מלאה מול GitHub. הכל תקין → נפתח. משהו השתנה → נשאר סגור, ובבק אופיס רואים מה.

לא נוגע ב-/etc/caddy/Caddyfile ולא בשום קובץ של האתר. כותב רק ל-STATE_DIR (הדגל, הבסיס להשוואה, קישור המעקף).

פקודות (sudo, PYTHONPATH=/opt/yamshopping/repo/collector):
  python -m yam.lockdown status            מה המצב עכשיו
  python -m yam.lockdown on [סיבה]          לסגור את האתר מהשרת (גם בלי בק אופיס)
  python -m yam.lockdown check             בדיקה מלאה מול GitHub, בלי לשנות כלום
  python -m yam.lockdown off [--force]     לפתוח: רק אם הבדיקה תקינה (או --force בלי בדיקה)
  python -m yam.lockdown pass              קישור המעקף לבעלים (לראות את האתר כשהוא סגור)
  python -m yam.lockdown baseline          לשמור את המצב הנוכחי כ"תקין" (אחרי שינוי שעשינו בעצמנו)
"""
import glob
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.request

STATE_DIR = os.environ.get("LOCK_DIR", "/var/lib/yam-maint")
FLAG = os.path.join(STATE_DIR, "on")
STATE = os.path.join(STATE_DIR, "state.json")
PASS = os.path.join(STATE_DIR, "pass")
REPOS = {"site": os.environ.get("LOCK_SITE_REPO", "/var/www/shopping-list"),
         "code": os.environ.get("LOCK_CODE_REPO", "/opt/yamshopping/repo")}
LABEL = {"site": "באתר", "code": "בקוד של השרת"}
GITHUB = os.environ.get("LOCK_GITHUB", "https://github.com/yosefh770h-lgtm/shopping-list")
SITE_URL = "https://www.yamshopping.com"
# קבצים שאם הם משתנים — התראה (לא סגירה): כניסה לשרת, הרשאות, משימות מתוזמנות, שירותים ו-Caddy
SYS_GLOBS = ("/root/.ssh/authorized_keys", "/home/*/.ssh/authorized_keys", "/etc/sudoers", "/etc/sudoers.d/*",
             "/etc/crontab", "/etc/cron.d/*", "/var/spool/cron/crontabs/*", "/etc/systemd/system/*.service",
             "/etc/caddy/*", "/usr/local/bin/*", "/etc/ssh/sshd_config", "/etc/ssh/sshd_config.d/*")
SYS_NAMES = {"/etc/caddy/yamshopping.caddy": "נוצר מחדש לבד כשמשנים את vercel.json — אם זה היה עכשיו, זה תקין"}


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


def iso(t=None):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(t or time.time()))


# ---------- Supabase (מפתח השירות) ----------

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

    def lock(self):
        rows = self.req("GET", "site_lock?id=eq.1&select=*", prefer="")
        return rows[0] if rows else None

    def patch(self, fields):
        self.req("PATCH", "site_lock?id=eq.1", dict(fields, updated_at=iso()))

    def event(self, kind, n=0, detail=None):
        self.req("POST", "security_events", [{"src": "server", "kind": kind, "n": int(n), "detail": detail or {}}])

    def auto_close(self, reason, detail):
        return self.req("POST", "rpc/site_lock_auto", {"p_reason": reason, "p_detail": detail}, prefer="")


def supa_from_env():
    load_env_file(os.environ.get("YAM_ENV", "/etc/yamshopping/collector.env"))
    url, key = os.environ.get("SUPABASE_URL", ""), os.environ.get("SUPABASE_SERVICE_KEY", "")
    return Supa(url, key) if url and key else None


# ---------- קובץ הדגל והמצב ----------

def flag_on():
    return os.path.exists(FLAG)


def set_flag(on, why=""):
    os.makedirs(STATE_DIR, mode=0o755, exist_ok=True)
    os.chmod(STATE_DIR, 0o755)  # ש-Caddy יוכל לבדוק אם הדגל קיים
    if on and not flag_on():
        with open(FLAG, "w", encoding="utf-8") as f:
            f.write(iso() + " " + why + "\n")
        os.chmod(FLAG, 0o644)
        log("🚧 האתר נסגר:", why)
    elif not on and flag_on():
        os.remove(FLAG)
        log("✅ האתר נפתח")


def load_state():
    try:
        return json.load(open(STATE, encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_state(st):
    os.makedirs(STATE_DIR, exist_ok=True)
    tmp = STATE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(st, f, ensure_ascii=False, indent=1)
    os.chmod(tmp, 0o600)
    os.replace(tmp, STATE)


# ---------- git ----------

def git(repo, *args, timeout=60, raw=False):
    p = subprocess.run(["git", "-c", "safe.directory=*", "-c", "core.fileMode=false", "-C", repo, *args],
                       capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout if raw else p.stdout.strip(), p.stderr.strip()


def busy(repo):
    """עדכון באמצע (sl-update / המשיכה של האוסף) — לא בודקים עכשיו, כדי שלא תהיה אזעקת שווא."""
    if os.path.exists(os.path.join(repo, ".git", "index.lock")):
        return True
    p = subprocess.run(["pgrep", "-f", "git .*(pull|fetch|reset|checkout|merge)"], capture_output=True, text=True)
    return p.returncode == 0


def file_hash(path):
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 16), b""):
                h.update(chunk)
        return h.hexdigest()[:16]
    except OSError:
        return "missing"


def remote_main():
    """ה-commit של main ב-GitHub עכשיו (בלי לגעת במאגרים בשרת)."""
    p = subprocess.run(["git", "ls-remote", GITHUB, "refs/heads/main"], capture_output=True, text=True, timeout=30)
    return p.stdout.split()[0] if p.returncode == 0 and p.stdout.strip() else ""


def repo_changes(repo):
    """קבצים ששונו / נוספו / נמחקו במאגר לעומת ה-commit שלו: {"נתיב": hash}.
    גם קבצים שמוסתרים ב-.gitignore (מישהו יכול לשתול שם קובץ ש-Caddy יגיש), חוץ מ-__pycache__ ו-node_modules."""
    rc, out, err = git(repo, "status", "--porcelain=v1", "--untracked-files=all", "--ignored=traditional", "-z", "--",
                       ".", ":(exclude,glob)**/__pycache__/**", ":(exclude,glob)**/node_modules/**", ":(exclude,glob)**/.pytest_cache/**", raw=True)
    if rc != 0:
        raise RuntimeError(err or "git status נכשל")
    found, ents, i = {}, out.split("\0"), 0
    while i < len(ents):
        ent = ents[i]
        i += 1
        if len(ent) > 3:
            rel = ent[3:]
            found[rel] = file_hash(os.path.join(repo, rel))
            if ent[0] in "RC":   # שינוי שם: השם הישן מגיע ברשומה הבאה
                i += 1
    return found


def check_repo(name, repo, known, remote=""):
    """בעיות במאגר אחד (רשימת משפטים בעברית) + הקבצים שהשתנו."""
    probs, files, lb = [], [], LABEL.get(name, repo)
    if not os.path.isdir(os.path.join(repo, ".git")):
        return [f"{lb}: {repo} הוא לא מאגר git"], files
    _, url, _ = git(repo, "remote", "get-url", "origin")
    if url.rstrip("/").removesuffix(".git") != GITHUB:
        probs.append(f"{lb}: השרת מושך קוד ממקום אחר ({url[:80]})")
    ch = repo_changes(repo)
    for rel, h in sorted(ch.items()):
        if known.get(rel) != h:
            files.append(f"{name}:{rel}")
    if files:
        probs.append(f"{len(files)} קבצים {lb} שונים מ-GitHub")
    if remote:
        if git(repo, "cat-file", "-e", remote + "^{commit}")[0] != 0:
            git(repo, "fetch", "-q", "origin", "main", timeout=120)
        if git(repo, "cat-file", "-e", remote + "^{commit}")[0] == 0:
            if git(repo, "merge-base", "--is-ancestor", "HEAD", remote)[0] != 0:
                probs.append(f"{lb}: יש בשרת שינוי (commit) שלא קיים ב-GitHub")
    return probs, files


def sys_hashes():
    out = {}
    for g in SYS_GLOBS:
        for p in glob.glob(g):
            if os.path.isfile(p):
                out[p] = file_hash(p)
    try:  # משתמשים שיכולים להיכנס (עם shell)
        users = sorted(l.split(":")[0] for l in open("/etc/passwd", encoding="utf-8")
                       if l.strip() and not l.rstrip().endswith(("nologin", "false", "sync")))
        out["users"] = ",".join(users)
    except OSError:
        pass
    return out


def full_check(st, fetch=True):
    """בדיקה מלאה לפני פתיחה: כל המאגרים מול GitHub. מחזיר (תקין?, פרטים)."""
    remote = remote_main() if fetch else ""
    probs, files = [], []
    if fetch and not remote:
        probs.append("אין חיבור ל-GitHub — אי אפשר להשוות")
    for name, repo in REPOS.items():
        p, f = check_repo(name, repo, st.get("known", {}).get(name, {}), remote)
        probs += p
        files += f
    detail = {"problems": probs[:20], "files": files[:50], "main": remote[:12]}
    # מה נכנס ל-GitHub מאז שהאתר נסגר — כדי לבדוק שלא הכניסו שם משהו
    since = st.get("locked_at")
    if since and os.path.isdir(os.path.join(REPOS["site"], ".git")):
        _, log_out, _ = git(REPOS["site"], "log", "--format=%h %an: %s", f"--since={since}", remote or "HEAD")
        detail["commits"] = log_out.splitlines()[:30]
    return not probs, detail


# ---------- השומר ----------

class Lockdown:
    def __init__(self):
        self.supa = supa_from_env()
        self.st = load_state()
        self.pending = None      # בעיה שנמצאה פעם אחת — מחכים לבדיקה הבאה לאישור
        self.reported = set(self.st.get("reported", []))
        self.last_check = self.last_seen = self.last_sys = 0
        self.lock = None

    def save(self):
        self.st["reported"] = sorted(self.reported)[-200:]
        save_state(self.st)

    def ensure_baseline(self):
        if "known" in self.st:
            return
        baseline(self.st)
        self.save()
        log("📸 נשמר בסיס להשוואה:", {k: len(v) for k, v in self.st["known"].items()}, "קבצים חריגים קיימים")

    def sync(self):
        if not self.supa:
            return
        try:
            self.lock = self.supa.lock()
        except Exception as e:  # noqa: BLE001
            log("⚠️ Supabase:", e)
            return
        if not self.lock:
            return
        locked = bool(self.lock.get("locked"))
        if locked:
            self.st["locked_at"] = self.lock.get("locked_at") or self.st.get("locked_at") or iso()
        set_flag(locked, self.lock.get("reason", ""))
        now = time.time()
        if now - self.last_seen > 30:
            self.last_seen = now
            try:
                self.supa.patch({"server_seen": iso()})
            except Exception as e:  # noqa: BLE001
                log("⚠️ דיווח:", e)
        if locked and self.lock.get("open_req"):
            self.try_open()

    def try_open(self):
        log("🔍 בקשה לפתוח — בדיקה מלאה מול GitHub")
        ok, detail = full_check(self.st)
        fields = {"open_req": None, "check_at": iso(), "check_ok": ok, "check_detail": detail}
        if ok:
            fields["locked"] = False
        try:
            self.supa.patch(fields)
            if ok:
                set_flag(False)
                self.supa.event("unlock", detail={"force": False, "commits": len(detail.get("commits", []))})
            else:
                self.supa.event("tamper", detail={"why": "הבקשה לפתוח נדחתה: " + "; ".join(detail["problems"])[:180], "closed": False})
        except Exception as e:  # noqa: BLE001
            log("⚠️ פתיחה:", e)
        log("✅ נפתח" if ok else "⛔ נשאר סגור: " + "; ".join(detail["problems"]))

    def watch(self):
        """זיהוי פריצה: קבצים שהשתנו בלי GitHub. בעיה שחוזרת פעמיים ברצף → סגירה + התראה."""
        probs, files = [], []
        for name, repo in REPOS.items():
            if not os.path.isdir(os.path.join(repo, ".git")) or busy(repo):
                return
            p, f = check_repo(name, repo, self.st.get("known", {}).get(name, {}))
            probs += p
            files += f
        key = hashlib.sha256(json.dumps([probs, files]).encode()).hexdigest()[:16]
        if not probs:
            self.pending = None
            if self.reported:   # הבעיה נפתרה — אם תחזור, נתריע שוב
                self.reported.clear()
                self.save()
            return
        if self.pending != key:
            self.pending = key   # פעם ראשונה — אולי עדכון באמצע. בודקים שוב בעוד 30 שניות
            return
        if key in self.reported:
            return
        self.reported.add(key)
        self.save()
        why = "; ".join(probs)[:200]
        auto = not self.lock or self.lock.get("auto_tamper", True)
        log("🚨 חשד לפריצה:", why, files[:10])
        detail = {"why": why, "files": files[:30], "closed": bool(auto)}
        if auto:
            set_flag(True, "חשד לפריצה: " + why)   # קודם בשרת עצמו — עובד גם בלי Supabase
        if self.supa:
            try:
                if auto:
                    self.supa.auto_close("חשד לפריצה: " + why, {"files": files[:30]})
                self.supa.event("tamper", n=len(files), detail=detail)
            except Exception as e:  # noqa: BLE001
                log("⚠️ דיווח פריצה:", e)

    def watch_sys(self):
        cur = sys_hashes()
        old = self.st.get("sys")
        self.st["sys"] = cur
        if old is None:
            self.save()
            return
        changed = sorted(k for k in set(cur) | set(old) if cur.get(k) != old.get(k))
        if not changed:
            return
        self.save()
        what = ", ".join(changed)[:160]
        note = "; ".join(SYS_NAMES[k] for k in changed if k in SYS_NAMES)
        log("⚠️ שינוי בהגדרות השרת:", what)
        if self.supa:
            try:
                self.supa.event("sys_change", n=len(changed), detail={"what": what, "files": changed[:30], "note": note})
            except Exception as e:  # noqa: BLE001
                log("⚠️ דיווח:", e)

    def run(self):
        log("🚧 yam-lockdown התחיל", "(בלי Supabase — רק בדיקות מקומיות)" if not self.supa else "")
        self.ensure_baseline()
        while True:
            try:
                self.sync()
                now = time.time()
                if now - self.last_check >= 30:
                    self.last_check = now
                    self.watch()
                if now - self.last_sys >= 120:
                    self.last_sys = now
                    self.watch_sys()
            except Exception as e:  # noqa: BLE001
                log("⚠️", type(e).__name__, e)
            time.sleep(10)


def baseline(st):
    """המצב הנוכחי = תקין: קבצים חריגים שכבר קיימים (למשל קבצים שהשרת יוצר) והגדרות השרת."""
    st["known"] = {}
    for name, repo in REPOS.items():
        try:
            st["known"][name] = repo_changes(repo) if os.path.isdir(os.path.join(repo, ".git")) else {}
        except Exception:  # noqa: BLE001
            st["known"][name] = {}
    st["sys"] = sys_hashes()
    st["reported"] = []
    return st


def main(argv):
    cmd = argv[1] if len(argv) > 1 else "status"
    if cmd == "run":
        Lockdown().run()
        return 0
    st = load_state()
    supa = supa_from_env()
    if cmd == "status":
        print("🚧 סגור" if flag_on() else "✅ פתוח", "(קובץ הדגל " + FLAG + ")")
        if supa:
            try:
                lk = supa.lock() or {}
                print("במסד:", "סגור" if lk.get("locked") else "פתוח", "·", lk.get("reason", ""), "·", lk.get("locked_at") or "")
            except Exception as e:  # noqa: BLE001
                print("⚠️ Supabase:", e)
        print("קבצים חריגים שנשמרו כתקינים:", {k: len(v) for k, v in st.get("known", {}).items()})
    elif cmd == "on":
        why = " ".join(argv[2:]) or "נסגר מהשרת"
        set_flag(True, why)
        if supa:
            print("נותקו", supa.auto_close(why, {"by": "server"}), "חיבורים")
        print("🚧 האתר סגור. לפתיחה: python -m yam.lockdown off")
    elif cmd in ("check", "off"):
        ok, detail = full_check(st)
        print("✅ הכל זהה ל-GitHub" if ok else "⛔ נמצאו בעיות:")
        for p in detail["problems"]:
            print("  •", p)
        for f in detail["files"]:
            print("    -", f)
        if detail.get("commits"):
            print("מה נכנס ל-GitHub מאז הסגירה (כדאי לעבור על זה):")
            for c in detail["commits"]:
                print("  ", c)
        if cmd == "off":
            if not ok and "--force" not in argv:
                print("האתר נשאר סגור. לפתוח בכל זאת: python -m yam.lockdown off --force")
                return 1
            if supa:
                supa.patch({"locked": False, "open_req": None, "check_at": iso(), "check_ok": ok, "check_detail": detail})
                supa.event("unlock", detail={"force": not ok})
            set_flag(False)
            print("✅ האתר פתוח")
        return 0 if ok else 1
    elif cmd == "pass":
        try:
            tok = open(PASS, encoding="utf-8").read().strip()
            print("קישור לבעלים בלבד (לא לשלוח לאף אחד). פותחים אותו בטלפון / במחשב, ואז האתר נפתח רגיל גם כשהוא סגור, ל-12 שעות:")
            print(f"{SITE_URL}/__yam_pass/{tok}")
        except OSError:
            print("אין עדיין קישור — מריצים קודם את lockdown-install.sh")
    elif cmd == "baseline":
        save_state(baseline(st))
        print("📸 נשמר. מעכשיו רק שינויים חדשים יתריעו.")
    else:
        print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv) or 0)
