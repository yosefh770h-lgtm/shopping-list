#!/bin/bash
# התקנה של אוסף המחירים בשרת (Oracle Cloud, Ubuntu או Oracle Linux). בטוח להרצה חוזרת — מריצים שוב כדי לעדכן או לתקן.
#
#   curl -fsSL https://www.yamshopping.com/collector/setup.sh | sudo bash -s -- [פרמטרים]
#
# פרמטרים (כולם לא חובה):
#   --domain server.yamshopping.com     הכתובת של ה-API (צריכה להצביע ל-IP של השרת)
#   --email you@example.com             מייל להתראות על תעודת ה-HTTPS (Let's Encrypt)
#   --branch main                       מאיזה ענף ב-git למשוך קוד
#   --supabase-url https://xxx.supabase.co
#   --new-key                           לבקש שוב את מפתח Supabase (אם החלפתם אותו)
#   --no-api                            בלי ה-API ובלי Caddy
#   --skip-test                         בלי ריצת הבדיקה בסוף
#   --full-now                          להתחיל מיד בסוף ההתקנה הורדה מלאה של כל הרשתות (ברקע)
#
# מפתח השירות של Supabase לא עובר בפקודה: הסקריפט מבקש להדביק אותו, ושומר אותו רק ב-/etc/yamshopping/collector.env.
main() {
set -euo pipefail

DOMAIN=server.yamshopping.com
EMAIL=""
BRANCH=main
SUPABASE_URL=https://ygyfodxfbebnkwdcbjrp.supabase.co
NEW_KEY=0; WITH_API=1; RUN_TEST=1; FULL_NOW=0
REPO_SLUG=yosefh770h-lgtm/shopping-list
BASE=/opt/yamshopping; REPO=$BASE/repo; VENV=$BASE/venv; PW=$BASE/pw-browsers
DATA=/var/lib/yamshopping; LOGD=/var/log/yamshopping; ETC=/etc/yamshopping; ENVF=$ETC/collector.env
CADDY_VERSION=2.8.4

while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --supabase-url) SUPABASE_URL="${2%/}"; shift 2 ;;
    --new-key) NEW_KEY=1; shift ;;
    --no-api) WITH_API=0; shift ;;
    --skip-test) RUN_TEST=0; shift ;;
    --full-now) FULL_NOW=1; shift ;;
    -h|--help) sed -n '2,16p' "$0" 2>/dev/null || true; exit 0 ;;
    *) echo "פרמטר לא מוכר: $1"; exit 2 ;;
  esac
done

say() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✔\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m⚠\033[0m %s\n' "$*"; }
die() { printf '\n\033[31m✖ %s\033[0m\n' "$*"; exit 1; }
ask() { local v=""; { read -r "$@" v </dev/tty; } 2>/dev/null || true; printf '%s' "$v"; }

[ "$(id -u)" = 0 ] || die "צריך להריץ עם sudo (curl ... | sudo bash -s -- ...)"
[ -r /etc/os-release ] && . /etc/os-release
OS_ID="${ID:-unknown}"; OS_LIKE="${ID_LIKE:-}"
case " $OS_ID $OS_LIKE " in
  *" ubuntu "*|*" debian "*) PKG=apt ;;
  *" ol "*|*" rhel "*|*" centos "*|*" fedora "*|*" rocky "*|*" almalinux "*) PKG=dnf ;;
  *) die "מערכת לא נתמכת ($OS_ID). נתמכות: Ubuntu / Debian / Oracle Linux" ;;
esac
ARCH="$(uname -m)"
MEM_MB=$(( $(awk '/MemTotal/{print $2}' /proc/meminfo) / 1024 ))
CPUS="$(nproc)"
echo "🖥️  ${PRETTY_NAME:-$OS_ID} · $ARCH · ${CPUS} מעבדים · ${MEM_MB}MB זיכרון"

# ---------- 1. חבילות ----------
say "מתקינים python3, venv, sqlite ו-git"
if [ $PKG = apt ]; then
  export DEBIAN_FRONTEND=noninteractive
  APT="apt-get -o DPkg::Lock::Timeout=900"   # בשרת חדש unattended-upgrades תופס את apt — מחכים ולא נכשלים
  $APT update -qq
  $APT install -y -qq python3 python3-venv python3-pip sqlite3 git curl ca-certificates cron util-linux tar logrotate >/dev/null
  PY=python3
else
  dnf install -y -q python3 python3-pip sqlite git curl ca-certificates cronie util-linux tar logrotate >/dev/null
  systemctl enable --now crond >/dev/null 2>&1 || true
  PY=python3
  # ב-Oracle Linux 8/9 ה-Python של המערכת ישן מדי — מוסיפים 3.11/3.12 לצידו
  for v in 3.12 3.11; do
    if command -v python$v >/dev/null || dnf install -y -q python$v python$v-pip >/dev/null 2>&1; then PY=python$v; break; fi
  done
fi
"$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' || die "צריך Python 3.10 ומעלה (יש: $($PY -V 2>&1))"
ok "$($PY -V) · $(sqlite3 --version | cut -d' ' -f1 | sed 's/^/sqlite /')"

# ---------- 2. swap ----------
say "זיכרון: ${MEM_MB}MB"
if [ "$MEM_MB" -lt 3000 ] && ! swapon --noheadings --show | grep -q .; then
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    chmod 600 /swapfile; mkswap /swapfile >/dev/null
  fi
  swapon /swapfile 2>/dev/null || true
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -q vm.swappiness=20 || true
  grep -q '^vm.swappiness' /etc/sysctl.conf 2>/dev/null || echo 'vm.swappiness=20' >> /etc/sysctl.conf
  ok "נוסף swap של 2GB"
else
  SW="$(swapon --noheadings --show=SIZE 2>/dev/null | head -1 || true)"; ok "swap: ${SW:-לא צריך (מספיק זיכרון)}"
fi

# ---------- 3. אזור זמן ----------
say "אזור זמן Asia/Jerusalem"
timedatectl set-timezone Asia/Jerusalem 2>/dev/null || ln -sf /usr/share/zoneinfo/Asia/Jerusalem /etc/localtime
ok "$(date '+%d/%m/%Y %H:%M %Z')"

# ---------- 4. משתמש ותיקיות ----------
id yam >/dev/null 2>&1 || useradd --system --home-dir "$DATA" --shell /usr/sbin/nologin yam
mkdir -p "$BASE" "$DATA/work" "$LOGD" "$ETC"
chown -R yam:yam "$DATA" "$LOGD"
chmod 750 "$DATA" "$ETC"; chgrp yam "$ETC"

# ---------- 5. הקוד מ-git ----------
say "מורידים את הקוד מ-GitHub ($REPO_SLUG, ענף $BRANCH)"
GIT_URL="${YAM_GIT_URL:-https://github.com/$REPO_SLUG.git}"  # YAM_GIT_URL — רק לבדיקות
if ! GIT_TERMINAL_PROMPT=0 timeout 60 git ls-remote -q "$GIT_URL" >/dev/null 2>&1; then
  # המאגר פרטי: מפתח פריסה (Deploy key) לקריאה בלבד, רק למאגר הזה
  KEY=/root/.ssh/yamshopping_deploy
  mkdir -p /root/.ssh; chmod 700 /root/.ssh
  [ -f $KEY ] || ssh-keygen -q -t ed25519 -N '' -C "yamshopping-server" -f $KEY
  grep -q 'Host github-yamshopping' /root/.ssh/config 2>/dev/null || cat >> /root/.ssh/config <<EOC

Host github-yamshopping
  HostName github.com
  User git
  IdentityFile $KEY
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOC
  chmod 600 /root/.ssh/config
  GIT_URL="git@github-yamshopping:$REPO_SLUG.git"
  tries=0
  until timeout 60 git ls-remote -q "$GIT_URL" >/dev/null 2>&1; do
    tries=$((tries + 1)); [ $tries -le 5 ] || die "אין גישה למאגר. בדקו שהמפתח נוסף ב-Deploy keys ונסו שוב."
    echo
    echo "🔑 המאגר פרטי, אז צריך לתת לשרת הרשאת קריאה (פעם אחת):"
    echo "   1. פותחים: https://github.com/$REPO_SLUG/settings/keys/new"
    echo "   2. Title: Oracle server   ·   Key: מדביקים את השורה הזו (בלי לסמן Allow write access):"
    echo
    echo "   $(cat $KEY.pub)"
    echo
    echo "   3. לוחצים Add key, וחוזרים לכאן."
    ask -p "   ↵ Enter כשסיימתם... " >/dev/null
  done
fi
if [ -d "$REPO/.git" ]; then
  git -C "$REPO" remote set-url origin "$GIT_URL"
  git -C "$REPO" fetch -q --depth 1 origin "$BRANCH"
  git -C "$REPO" reset -q --hard FETCH_HEAD
else
  rm -rf "$REPO"
  git clone -q --depth 1 --branch "$BRANCH" "$GIT_URL" "$REPO"
fi
ok "גרסה $(git -C "$REPO" log -1 --format='%h · %cd' --date=format:'%d/%m %H:%M')"
[ -f "$REPO/collector/yam/run.py" ] || die "בענף $BRANCH אין עדיין את התיקייה collector/ — צריך למזג את ה-PR קודם (או --branch עם שם הענף)"

# ---------- 6. סביבת פייתון ----------
say "מתקינים את הספריות — בפעם הראשונה כמה דקות"
[ -x "$VENV/bin/python" ] && "$VENV/bin/python" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' || { rm -rf "$VENV"; "$PY" -m venv "$VENV"; }
"$VENV/bin/pip" install -q --upgrade pip wheel
"$VENV/bin/pip" install -q -r "$REPO/collector/requirements.txt"
# הספרייה הישנה (il-supermarket-scraper) לא בשימוש יותר — מסירים אותה מהסביבה, אם נשארה
"$VENV/bin/pip" uninstall -y -q il-supermarket-scraper >/dev/null 2>&1 || true
rm -rf "$PW"  # הדפדפן ש-Playwright התקין בשבילה (כמה מאות MB)
ok "הספריות הותקנו"

# ---------- 7. מפתח Supabase (רק בקובץ בשרת, לא ב-git) ----------
say "חיבור ל-Supabase"
touch "$ENVF"; chown root:yam "$ENVF"; chmod 640 "$ENVF"
setenv() { local k="$1" v="$2"; if grep -q "^$k=" "$ENVF"; then sed -i "s|^$k=.*|$k=$v|" "$ENVF"; else echo "$k=$v" >> "$ENVF"; fi; }
setenv SUPABASE_URL "$SUPABASE_URL"
setenv DATA_DIR "$DATA"
setenv GIT_BRANCH "$BRANCH"
grep -q '^THREADS=' "$ENVF" || setenv THREADS "$([ "$MEM_MB" -lt 3000 ] && echo 2 || echo 6)"
KEYV="$(sed -n 's/^SUPABASE_SERVICE_KEY=//p' "$ENVF" | tail -1)"
check_key() {
  local h=(-H "apikey: $1")
  [ "${1#eyJ}" != "$1" ] && h+=(-H "Authorization: Bearer $1")  # מפתח service_role הישן (JWT)
  curl -s -o /dev/null --max-time 20 -w '%{http_code}' "${h[@]}" "$SUPABASE_URL/rest/v1/collector_status?select=chain&limit=1" || true
}
if [ -z "$KEYV" ] || [ $NEW_KEY = 1 ]; then
  echo "   צריך את מפתח השירות של Supabase (נשמר רק בשרת הזה, בקובץ $ENVF):"
  echo "   Supabase ← Project Settings ← API Keys ← secret key (או service_role) ← העתקה"
  for i in 1 2 3; do
    KEYV="$(ask -s -p '   הדביקו את המפתח ולחצו Enter (לא יוצג על המסך): ')"; echo
    KEYV="$(printf '%s' "$KEYV" | tr -d '[:space:]')"
    [ -n "$KEYV" ] || { warn "לא הודבק מפתח — ממשיכים בלי Supabase (אפשר להריץ שוב עם --new-key)"; break; }
    code="$(check_key "$KEYV")"
    if [ "$code" = 200 ]; then setenv SUPABASE_SERVICE_KEY "$KEYV"; ok "המפתח תקין ונשמר"; break; fi
    if [ "$code" = 404 ]; then setenv SUPABASE_SERVICE_KEY "$KEYV"; warn "המפתח נשמר, אבל חסרה הטבלה collector_status — להריץ את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית ← שלב 1)"; break; fi
    warn "המפתח לא התקבל (קוד $code). נסו שוב."; KEYV=""
  done
else
  code="$(check_key "$KEYV")"
  case "$code" in
    200) ok "המפתח השמור תקין" ;;
    404) warn "חסרה הטבלה collector_status ב-Supabase — להריץ את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית ← שלב 1)" ;;
    *) warn "המפתח השמור לא מתקבל (קוד $code) — הריצו שוב עם --new-key" ;;
  esac
fi

# ---------- 8. cron ----------
say "תזמון: הורדה מלאה ב-05:30, ושינויים כל שעה בין 07:15 ל-23:15"
chmod +x "$REPO/collector/bin/cron-run.sh"
cat > /etc/cron.d/yamshopping <<EOC
# אוסף המחירים של ים שופינג (נוצר ע"י collector/setup.sh). כל ריצה מושכת קודם את הקוד העדכני מ-git.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 5 * * * root $REPO/collector/bin/cron-run.sh full
15 7-23 * * * root $REPO/collector/bin/cron-run.sh hourly
EOC
chmod 644 /etc/cron.d/yamshopping
systemctl restart cron 2>/dev/null || systemctl restart crond 2>/dev/null || true
cat > /etc/logrotate.d/yamshopping <<EOC
$LOGD/*.log {
  weekly
  rotate 6
  compress
  missingok
  notifempty
  copytruncate
}
EOC
ok "/etc/cron.d/yamshopping"

# ---------- 9. ה-API + Caddy (HTTPS אוטומטי) ----------
if [ $WITH_API = 1 ]; then
  say "API לקריאה בלבד ב-https://$DOMAIN"
  WORKERS=$([ "$MEM_MB" -lt 3000 ] && echo 1 || echo 3)
  cat > /etc/systemd/system/yam-api.service <<EOC
[Unit]
Description=Yam Shopping prices API (read only)
After=network-online.target
Wants=network-online.target

[Service]
User=yam
Group=yam
WorkingDirectory=$REPO/collector
Environment=DATA_DIR=$DATA
Environment=PYTHONPATH=$REPO/collector
ExecStart=$VENV/bin/uvicorn yam.api:app --host 127.0.0.1 --port 8088 --workers $WORKERS --no-server-header --log-level warning
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$DATA

[Install]
WantedBy=multi-user.target
EOC
  # Caddy — קובץ הפעלה רשמי, אותו דבר ב-Ubuntu וב-Oracle Linux
  if ! command -v caddy >/dev/null; then
    case "$ARCH" in x86_64) CA=amd64 ;; aarch64|arm64) CA=arm64 ;; *) die "מעבד לא נתמך ל-Caddy: $ARCH" ;; esac
    tmp="$(mktemp -d)"
    curl -fsSL "https://github.com/caddyserver/caddy/releases/download/v$CADDY_VERSION/caddy_${CADDY_VERSION}_linux_$CA.tar.gz" | tar -xz -C "$tmp" caddy
    install -m 755 "$tmp/caddy" /usr/local/bin/caddy; rm -rf "$tmp"
  fi
  CADDY_BIN="$(command -v caddy)"
  id caddy >/dev/null 2>&1 || useradd --system --home-dir /var/lib/caddy --create-home --shell /usr/sbin/nologin caddy
  mkdir -p /etc/caddy /var/lib/caddy; chown caddy:caddy /var/lib/caddy
  API_BLOCK="$DOMAIN {
	encode gzip
	header {
		Strict-Transport-Security \"max-age=31536000\"
		X-Content-Type-Options nosniff
		-Server
	}
	@write not method GET HEAD OPTIONS
	respond @write 405
	reverse_proxy 127.0.0.1:8088
}"
  CF=/etc/caddy/Caddyfile; BAK=""; CADDY_CHANGED=1
  if [ ! -s "$CF" ]; then
    cat > "$CF" <<EOC
{
	$( [ -n "$EMAIL" ] && echo "email $EMAIL" )
	admin off
}

$API_BLOCK
EOC
  elif grep -qE "^[[:space:]]*$(printf '%s' "$DOMAIN" | sed 's/\./\\./g')[[:space:]]*\{" "$CF"; then
    # כבר מוגדר. גם האתר עצמו (www.yamshopping.com, import /etc/caddy/yamshopping.caddy) רץ מאותו קובץ — לא דורסים אותו
    ok "Caddyfile קיים עם $DOMAIN — לא משנים אותו (האתר והגדרות אחרות נשמרים)"
    CADDY_CHANGED=0
  else
    # קובץ קיים עם אתרים אחרים — מוסיפים רק את בלוק ה-API, עם גיבוי
    BAK="$CF.bak-$(date +%Y%m%d-%H%M%S)"
    cp -a "$CF" "$BAK"
    printf '\n%s\n' "$API_BLOCK" >> "$CF"
    ok "נוסף בלוק $DOMAIN ל-Caddyfile הקיים (גיבוי ב-$BAK)"
  fi
  if [ -n "$BAK" ] && ! "$CADDY_BIN" validate --config "$CF" --adapter caddyfile >/dev/null 2>&1; then
    cp -a "$BAK" "$CF"; CADDY_CHANGED=0
    warn "ה-Caddyfile אחרי ההוספה לא תקין — הוחזר הקובץ הקודם ($BAK)"
  fi
  if [ ! -f /lib/systemd/system/caddy.service ] && [ ! -f /usr/lib/systemd/system/caddy.service ]; then
    cat > /etc/systemd/system/caddy.service <<EOC
[Unit]
Description=Caddy (HTTPS for $DOMAIN)
After=network-online.target
Wants=network-online.target

[Service]
User=caddy
Group=caddy
Environment=HOME=/var/lib/caddy
ExecStart=$CADDY_BIN run --environ --config /etc/caddy/Caddyfile
TimeoutStopSec=5s
LimitNOFILE=1048576
AmbientCapabilities=CAP_NET_BIND_SERVICE
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOC
  fi
  systemctl daemon-reload
  # שרת אינטרנט ישן (nginx / apache) שתופס את פורטים 80 ו-443 — Caddy לא יכול לעלות לידו
  for old in nginx apache2 httpd; do
    if systemctl is-active --quiet "$old" 2>/dev/null; then
      warn "$old תפס את פורטים 80/443 — מכבים אותו כדי ש-Caddy יעבוד (להחזיר: systemctl enable --now $old)"
      systemctl disable --now "$old" >/dev/null 2>&1 || true
    fi
  done
  systemctl enable yam-api caddy >/dev/null 2>&1
  systemctl restart yam-api
  # Caddy מגיש גם את האתר עצמו (www.yamshopping.com) — מפעילים מחדש רק אם הקובץ השתנה או שהוא לא רץ
  if [ "$CADDY_CHANGED" = 1 ] || ! systemctl is-active --quiet caddy; then systemctl restart caddy; fi
  ok "השירותים yam-api ו-caddy פעילים ויעלו לבד אחרי אתחול"

  # ----- firewall בתוך השרת -----
  say "פותחים את פורטים 80 ו-443 ב-firewall של השרת"
  if systemctl is-active --quiet firewalld; then
    firewall-cmd -q --permanent --add-service=http --add-service=https && firewall-cmd -q --reload
    ok "firewalld"
  fi
  if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q 'Status: active'; then
    ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ok "ufw"
  fi
  if command -v iptables >/dev/null && iptables -S INPUT 2>/dev/null | grep -q -- '-j REJECT'; then
    for p in 80 443; do
      if ! iptables -C INPUT -p tcp -m state --state NEW -m tcp --dport $p -j ACCEPT 2>/dev/null; then
        pos="$(iptables -L INPUT --line-numbers -n | awk '/REJECT/{print $1; exit}')"
        iptables -I INPUT "${pos:-1}" -p tcp -m state --state NEW -m tcp --dport $p -j ACCEPT
      fi
    done
    if command -v netfilter-persistent >/dev/null; then netfilter-persistent save >/dev/null 2>&1
    elif [ -d /etc/iptables ]; then iptables-save > /etc/iptables/rules.v4; fi
    ok "iptables (נשמר גם לאחרי אתחול)"
  fi

  PUBIP="$(curl -s -4 --max-time 8 https://api.ipify.org || true)"
  DNSIP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}' || true)"
  if [ -z "$PUBIP" ]; then
    warn "לא הצלחנו לבדוק את ה-IP החיצוני של השרת"
  elif [ "$DNSIP" != "$PUBIP" ]; then
    warn "$DOMAIN מצביע ל-${DNSIP:-שום מקום} ולא לשרת הזה ($PUBIP). צריך רשומת A ב-DNS: $DOMAIN → $PUBIP"
  else
    ok "$DOMAIN → $PUBIP"
  fi
fi

# ---------- 10. ריצת בדיקה ----------
if [ $RUN_TEST = 1 ]; then
  say "ריצת בדיקה: שופרסל, רמי לוי ומשנת יוסף — 3 קבצים מכל אחת (כמה דקות)"
  cd "$DATA/work"
  runuser -u yam -- env YAM_ENV="$ENVF" PYTHONPATH="$REPO/collector" PLAYWRIGHT_BROWSERS_PATH="$PW" \
    timeout 45m "$VENV/bin/python" -m yam.run test 2>&1 | tee -a "$LOGD/collector.log" | grep -v '^Logger ' | tail -25 || warn "ריצת הבדיקה לא הסתיימה כמו שצריך"
  cd /
  if [ $WITH_API = 1 ]; then
    sleep 2
    H="$(curl -s --max-time 10 http://127.0.0.1:8088/health || true)"
    [ -n "$H" ] && ok "API מקומי: $H" || warn "ה-API המקומי לא עונה (journalctl -u yam-api)"
    if curl -s -o /dev/null --max-time 15 "https://$DOMAIN/health"; then ok "https://$DOMAIN/health עונה מבחוץ 🎉"
    else warn "https://$DOMAIN עוד לא נגיש מבחוץ — בדקו שפורטים 80 ו-443 פתוחים ב-Security List של Oracle, ושה-DNS מצביע לשרת"; fi
  fi
fi

say "סיכום"
echo "  🖥️  ${MEM_MB}MB זיכרון · ${CPUS} מעבדים · $(df -h "$DATA" | awk 'NR==2{print $4" פנויים בדיסק"}')"
if [ "$MEM_MB" -lt 3000 ]; then
  warn "לשרת יש רק ${MEM_MB}MB זיכרון. זה יעבוד (עם ה-swap), אבל ההורדה המלאה של כל הסניפים תהיה איטית."
  warn "מומלץ שרת Ampere A1 (חינם עד 4 מעבדים ו-24GB) — ההסבר בקובץ collector/README.md"
fi
echo "  📜 יומן: $LOGD/collector.log   ·   סטטוס: sudo -u yam env YAM_ENV=$ENVF PYTHONPATH=$REPO/collector $VENV/bin/python -m yam.run status"
if [ $FULL_NOW = 1 ]; then
  systemd-run --unit=yam-full-now --collect --quiet "$REPO/collector/bin/cron-run.sh" full 2>/dev/null \
    || nohup "$REPO/collector/bin/cron-run.sh" full >/dev/null 2>&1 &
  ok "התחילה הורדה מלאה של כל הרשתות ברקע (לוקח כמה שעות). לעקוב: sudo tail -f $LOGD/collector.log"
else
  echo "  ⏰ הריצה המלאה הבאה: מחר ב-05:30. להריץ עכשיו: sudo $REPO/collector/bin/cron-run.sh full"
fi
if [ -f /var/run/reboot-required ]; then
  warn "השרת מבקש אתחול (עדכוני מערכת). אפשר לאתחל מתי שנוח: sudo reboot — ה-API, Caddy וה-cron עולים לבד אחרי האתחול."
  [ $FULL_NOW = 1 ] && warn "אתחול עכשיו יעצור את ההורדה המלאה. היא תתחיל שוב לבד מחר ב-05:30, או ידנית בפקודה שלמעלה."
fi
echo
echo "✅ ההתקנה הסתיימה. את הפלט הזה אפשר להעתיק ולשלוח."
}
main "$@"; exit
