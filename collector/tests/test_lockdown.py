"""בדיקות למצב שיפוצים וזיהוי פריצה בשרת (yam/lockdown.py), בלי אינטרנט: מאגרי git זמניים ו-Supabase מדומה.
    cd collector && python -m pytest -q tests/test_lockdown.py
"""
import os
import subprocess
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from yam import lockdown  # noqa: E402


def sh(repo, *a):
    return subprocess.run(["git", "-C", str(repo), *a], check=True, capture_output=True, text=True).stdout.strip()


@pytest.fixture
def env(tmp_path, monkeypatch):
    up = tmp_path / "upstream"
    up.mkdir()
    sh(up, "init", "-q", "-b", "main")
    sh(up, "config", "user.email", "t@x"), sh(up, "config", "user.name", "t")
    (up / "index.html").write_text("<p>hi</p>")
    (up / ".gitignore").write_text("dist/\n__pycache__/\n")
    sh(up, "add", "."), sh(up, "commit", "-qm", "one")
    repos = {}
    for name in ("site", "code"):
        r = tmp_path / name
        subprocess.run(["git", "clone", "-q", str(up), str(r)], check=True)
        sh(r, "remote", "set-url", "origin", lockdown.GITHUB)   # כמו בשרת
        repos[name] = str(r)
    monkeypatch.setattr(lockdown, "REPOS", repos)
    d = tmp_path / "state"
    monkeypatch.setattr(lockdown, "STATE_DIR", str(d))
    monkeypatch.setattr(lockdown, "FLAG", str(d / "on"))
    monkeypatch.setattr(lockdown, "STATE", str(d / "state.json"))
    monkeypatch.setattr(lockdown, "SYS_GLOBS", ())
    return up, repos


class FakeSupa:
    def __init__(self, lock=None):
        self.lockrow = dict({"locked": False, "auto_tamper": True, "open_req": None, "reason": ""}, **(lock or {}))
        self.patches, self.events, self.closed = [], [], []

    def lock(self):
        return dict(self.lockrow)

    def patch(self, f):
        self.patches.append(f)
        self.lockrow.update({k: v for k, v in f.items() if k in ("locked", "open_req")})

    def event(self, kind, n=0, detail=None):
        self.events.append((kind, detail or {}))

    def auto_close(self, reason, detail):
        self.closed.append(reason)
        self.lockrow["locked"] = True
        return 3


def test_clean_repos_pass(env):
    up, repos = env
    head = sh(repos["site"], "rev-parse", "HEAD")
    for name, r in repos.items():
        assert lockdown.check_repo(name, r, {}, head) == ([], [])


def test_changed_added_and_hidden_files_are_found(env):
    _, repos = env
    r = repos["site"]
    open(os.path.join(r, "index.html"), "a").write("<script src=//evil></script>")
    open(os.path.join(r, "new.js"), "w").write("x")
    os.makedirs(os.path.join(r, "dist"))
    open(os.path.join(r, "dist", "hidden.html"), "w").write("x")   # מוסתר ב-.gitignore — ועדיין נתפס
    os.makedirs(os.path.join(r, "__pycache__"))
    open(os.path.join(r, "__pycache__", "a.pyc"), "w").write("x")  # זה כן מותר
    probs, files = lockdown.check_repo("site", r, {})
    assert probs and sorted(files) == ["site:dist/hidden.html", "site:index.html", "site:new.js"]


def test_baseline_known_files_are_ok_until_they_change(env):
    _, repos = env
    r = repos["code"]
    open(os.path.join(r, "local.txt"), "w").write("server file")
    st = lockdown.baseline({})
    assert lockdown.check_repo("code", r, st["known"]["code"]) == ([], [])
    open(os.path.join(r, "local.txt"), "w").write("changed")
    assert lockdown.check_repo("code", r, st["known"]["code"])[1] == ["code:local.txt"]


def test_local_commit_and_foreign_remote(env):
    up, repos = env
    r = repos["site"]
    main = sh(up, "rev-parse", "HEAD")
    sh(r, "-c", "user.email=a@b", "-c", "user.name=a", "commit", "-q", "--allow-empty", "-m", "backdoor")
    probs, _ = lockdown.check_repo("site", r, {}, main)
    assert any("commit" in p for p in probs)
    sh(r, "remote", "set-url", "origin", "https://github.com/evil/shopping-list")
    probs, _ = lockdown.check_repo("site", r, {}, main)
    assert any("ממקום אחר" in p for p in probs)


def test_behind_main_is_fine(env):
    """sl-guard משאיר את האתר על הגרסה התקינה האחרונה — זה לא חשד."""
    up, repos = env
    sh(up, "commit", "-q", "--allow-empty", "-m", "two")
    main = sh(up, "rev-parse", "HEAD")
    sh(repos["site"], "remote", "set-url", "origin", str(up))
    sh(repos["site"], "fetch", "-q", "origin", "main")
    sh(repos["site"], "remote", "set-url", "origin", lockdown.GITHUB)
    assert lockdown.check_repo("site", repos["site"], {}, main) == ([], [])


def test_tamper_closes_only_after_two_checks(env, monkeypatch):
    _, repos = env
    monkeypatch.setattr(lockdown, "busy", lambda r: False)
    ld = lockdown.Lockdown.__new__(lockdown.Lockdown)
    ld.supa, ld.st, ld.pending, ld.reported, ld.lock = FakeSupa(), lockdown.baseline({}), None, set(), {"auto_tamper": True}
    open(os.path.join(repos["site"], "index.html"), "a").write("evil")
    ld.watch()
    assert not lockdown.flag_on() and not ld.supa.closed     # פעם ראשונה — אולי עדכון באמצע
    ld.watch()
    assert lockdown.flag_on() and ld.supa.closed and ld.supa.events[-1][0] == "tamper"
    ld.watch()
    assert len(ld.supa.events) == 1                           # לא מציף בהתראות
    sh(repos["site"], "checkout", "--", "index.html")
    ld.watch()
    assert not ld.reported                                    # נפתר — אם יחזור, נתריע שוב


def test_auto_close_off_only_alerts(env, monkeypatch):
    _, repos = env
    monkeypatch.setattr(lockdown, "busy", lambda r: False)
    ld = lockdown.Lockdown.__new__(lockdown.Lockdown)
    ld.supa, ld.st, ld.pending, ld.reported, ld.lock = FakeSupa(), lockdown.baseline({}), None, set(), {"auto_tamper": False}
    open(os.path.join(repos["code"], "x.py"), "w").write("evil")
    ld.watch(), ld.watch()
    assert not lockdown.flag_on() and not ld.supa.closed
    assert ld.supa.events[-1][0] == "tamper" and ld.supa.events[-1][1]["closed"] is False


def test_sync_follows_db_and_reopens_only_when_clean(env, monkeypatch):
    up, repos = env
    monkeypatch.setattr(lockdown, "remote_main", lambda: sh(up, "rev-parse", "HEAD"))
    ld = lockdown.Lockdown.__new__(lockdown.Lockdown)
    ld.st, ld.pending, ld.reported, ld.last_seen = lockdown.baseline({}), None, set(), 0
    ld.supa = FakeSupa({"locked": True, "reason": "בדיקה", "locked_at": "2026-11-26T10:00:00Z"})
    ld.sync()
    assert lockdown.flag_on()
    # בקשה לפתוח כשיש קובץ זר → נשאר סגור
    open(os.path.join(repos["site"], "evil.js"), "w").write("x")
    ld.supa.lockrow["open_req"] = "now"
    ld.sync()
    assert lockdown.flag_on() and ld.supa.patches[-1]["check_ok"] is False and ld.supa.events[-1][0] == "tamper"
    # הקובץ הוסר → נפתח
    os.remove(os.path.join(repos["site"], "evil.js"))
    ld.supa.lockrow["open_req"] = "now"
    ld.sync()
    assert not lockdown.flag_on() and ld.supa.patches[-1]["locked"] is False and ld.supa.events[-1][0] == "unlock"


def test_sys_change_alerts(env, tmp_path, monkeypatch):
    f = tmp_path / "authorized_keys"
    f.write_text("ssh-ed25519 AAA me")
    monkeypatch.setattr(lockdown, "SYS_GLOBS", (str(f),))
    ld = lockdown.Lockdown.__new__(lockdown.Lockdown)
    ld.supa, ld.st, ld.reported = FakeSupa(), {}, set()
    ld.watch_sys()
    assert not ld.supa.events                                  # פעם ראשונה = בסיס
    f.write_text("ssh-ed25519 AAA me\nssh-rsa BBB attacker")
    ld.watch_sys()
    assert ld.supa.events[-1][0] == "sys_change" and str(f) in ld.supa.events[-1][1]["files"]
