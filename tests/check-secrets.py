#!/usr/bin/env python3
"""בודק שלא נכנס לקוד מפתח סודי (במאגר פרטי בחשבון חינמי אין סריקת סודות של GitHub, אז זו הבדיקה שלנו):
    python3 tests/check-secrets.py
המפתח הציבורי של Supabase (sb_publishable_...) מותר — הוא נועד להיות בדפדפן.
"""
import base64, json, re, subprocess, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = ('shopping-list-site/vendor/',)
PATTERNS = {
    'Supabase secret key': r'sb_secret_[A-Za-z0-9_-]{10,}',
    'Anthropic key': r'sk-ant-[A-Za-z0-9_-]{20,}',
    'OpenAI key': r'sk-(?:proj-)?[A-Za-z0-9]{32,}',
    'Google API key': r'AIza[0-9A-Za-z_-]{35}',
    'GitHub token': r'(?:ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}',
    'Private key': r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'Slack token': r'xox[abpr]-[A-Za-z0-9-]{10,}',
}
JWT = re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}')
BINARY = re.compile(r'\.(p12|jks|keystore|pem|key)$', re.I)

def jwt_role(payload):
    try:
        return json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4))).get('role', '')
    except Exception:
        return ''

found = []
files = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\n')
for f in filter(None, files):
    if f.startswith(SKIP):
        continue
    if BINARY.search(f) or pathlib.Path(f).name.startswith('.env'):
        found.append((f, 0, 'secret file in the repo'))
        continue
    try:
        text = (ROOT / f).read_text(encoding='utf-8')
    except (UnicodeDecodeError, FileNotFoundError):
        continue
    for no, line in enumerate(text.split('\n'), 1):
        for name, pat in PATTERNS.items():
            if re.search(pat, line):
                found.append((f, no, name))
        for m in JWT.finditer(line):
            if jwt_role(m.group(1)) == 'service_role':
                found.append((f, no, 'Supabase service_role key'))

for f, no, name in found:
    print(f'❌ {f}:{no} — {name}')
if found:
    print('\nנמצא מפתח סודי בקוד. להוציא אותו, ולהחליף אותו (Rotate) אצל הספק — מפתח שנכנס ל-Git נחשב חשוף.')
    sys.exit(1)
print('✅ לא נמצאו מפתחות סודיים בקוד')
