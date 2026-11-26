#!/bin/bash
# 🚧 התקנה של מצב שיפוצים וזיהוי פריצה (yam-lockdown) בשרת — פעם אחת. בטוח להריץ שוב.
#   sudo bash /opt/yamshopping/repo/collector/bin/lockdown-install.sh           התקנה / עדכון + בדיקה שזה עובד
#   sudo bash /opt/yamshopping/repo/collector/bin/lockdown-install.sh --remove  הסרה (האתר נפתח, השירות נמחק)
# מה זה עושה:
#   1. שירות systemd בשם yam-lockdown (python -m yam.lockdown run) שרץ מהמאגר ומתעדכן לבד עם הקוד.
#   2. הקובץ /etc/caddy/maint.caddy (קובץ שלנו בלבד): כשקיים /var/lib/yam-maint/on — כל דף באתר מציג "האתר בשיפוצים",
#      וכל קובץ אחר (js, תמונות, API) מקבל 404. הבעלים עם קישור המעקף רואה את האתר רגיל.
#   3. ב-/etc/caddy/yesod.caddy (אם קיים) מוסיף שורת import אחת, עם גיבוי ובדיקה.
# ⚠️ לא נוגע ב-/etc/caddy/Caddyfile. את השורה האחת שצריך שם (import /etc/caddy/maint.caddy בתוך הבלוק של www)
#    מוסיפים ידנית — הסקריפט מדפיס בדיוק מה להדביק, ואחרי זה מריצים אותו שוב והוא בודק שהכל עובד.
set -euo pipefail
REPO=/opt/yamshopping/repo; VENV=/opt/yamshopping/venv; UNIT=/etc/systemd/system/yam-lockdown.service
DIR=/var/lib/yam-maint; SNIP=/etc/caddy/maint.caddy; CF=/etc/caddy/Caddyfile; YES=/etc/caddy/yesod.caddy
LINE="import $SNIP"
[ "$(id -u)" = 0 ] || { echo "צריך sudo"; exit 1; }
PY="$VENV/bin/python"; [ -x "$PY" ] || PY="$(command -v python3)"
CADDY="$(command -v caddy || echo /usr/local/bin/caddy)"
reload_caddy() { "$CADDY" validate --config "$CF" --adapter caddyfile >/dev/null 2>&1 && systemctl reload caddy; }

if [ "${1:-}" = "--remove" ]; then
  systemctl disable --now yam-lockdown 2>/dev/null || true
  rm -f "$UNIT" "$DIR/on"; systemctl daemon-reload
  echo "✓ השירות הוסר והאתר פתוח. (הקובץ $SNIP נשאר ריק מהשפעה כשאין דגל. למחיקה מלאה: להוריד את שורת ה-import מה-Caddyfile ואז rm $SNIP)"
  exit 0
fi

# ---------- 1. קישור מעקף לבעלים (סוד, רק בשרת) ----------
install -d -m 755 "$DIR"
[ -s "$DIR/pass" ] || { "$PY" -c 'import secrets;print(secrets.token_hex(24))' > "$DIR/pass"; chmod 600 "$DIR/pass"; }
TOK="$(tr -dc 'a-f0-9' < "$DIR/pass")"
[ ${#TOK} -ge 32 ] || { echo "⛔ קובץ $DIR/pass לא תקין — למחוק אותו ולהריץ שוב"; exit 1; }

# ---------- 2. הקובץ של Caddy (שלנו בלבד) ----------
# rewrite-ים הם "אחד מהם" לפי הסדר: דף → דף השיפוצים, כל השאר → 404. X-Yam-Maint-Test מאפשר לבדוק בלי לסגור את האתר.
rules() { # $1 = שם, $2 = התנאי (שורה בתוך המאתם)
  cat <<EOC
@yam_${1}_nav {
	$2
	not header Cookie *yam_pass=$TOK*
	header Sec-Fetch-Mode navigate
}
@yam_${1}_page {
	$2
	not header Cookie *yam_pass=$TOK*
	path / *.html
}
@yam_${1}_any {
	$2
	not header Cookie *yam_pass=$TOK*
	not path /maintenance.html
}
rewrite @yam_${1}_nav /maintenance.html
rewrite @yam_${1}_page /maintenance.html
rewrite @yam_${1}_any /__yam_closed__
header @yam_${1}_any {
	X-Yam-Maint 1
	Cache-Control "no-store"
	Retry-After 600
}
EOC
}
NEW="$(mktemp)"
{
  echo "# 🚧 מצב שיפוצים — נוצר ע\"י collector/bin/lockdown-install.sh. לא לערוך ידנית (יידרס בהתקנה הבאה)."
  echo "# האתר סגור כשהקובץ $DIR/on קיים. הבעלים: $(echo https://www.yamshopping.com/__yam_pass/…) (python -m yam.lockdown pass)"
  echo "@yam_pass_set path /__yam_pass/$TOK"
  echo "header @yam_pass_set Set-Cookie \"yam_pass=$TOK; Path=/; Max-Age=43200; Secure; HttpOnly; SameSite=Lax\""
  echo "redir @yam_pass_set / 302"
  rules test "header X-Yam-Maint-Test $TOK"
  rules on "file {
		root $DIR
		try_files /on
	}"
} > "$NEW"
OLD=""; [ -f "$SNIP" ] && { OLD="$(mktemp)"; cp -a "$SNIP" "$OLD"; }
install -m 640 -o root -g "$(id -gn caddy 2>/dev/null || echo root)" "$NEW" "$SNIP"; rm -f "$NEW"
echo "✓ $SNIP מוכן"

# ---------- 3. yesod.caddy (לא ה-Caddyfile) ----------
if [ -f "$YES" ] && ! grep -qF "$LINE" "$YES"; then
  cp -a "$YES" "$YES.bak-lockdown"
  YN="$(grep -n 'import[[:space:]]\+yamsite' "$YES" | head -1 | cut -d: -f1)"
  [ -n "$YN" ] && sed -i "${YN}i\\    $LINE" "$YES"
  if [ -n "$YN" ] && "$CADDY" validate --config "$CF" --adapter caddyfile >/dev/null 2>&1; then echo "✓ נוספה שורה ל-$YES (גיבוי: $YES.bak-lockdown)"
  else cp -a "$YES.bak-lockdown" "$YES"; echo "⚠️ לא הצלחנו להוסיף ל-$YES — הוחזר כמו שהיה"; fi
fi

# ---------- 4. השירות ----------
cat > "$UNIT" <<EOU
[Unit]
Description=Yam Shopping lockdown (maintenance mode + tamper detection)
After=network-online.target
Wants=network-online.target

[Service]
Environment=YAM_ENV=/etc/yamshopping/collector.env
Environment=PYTHONPATH=$REPO/collector
ExecStart=$PY -m yam.lockdown run
Restart=always
RestartSec=5
MemoryMax=200M
StandardOutput=append:/var/log/yamshopping/lockdown.log
StandardError=append:/var/log/yamshopping/lockdown.log

[Install]
WantedBy=multi-user.target
EOU
mkdir -p /var/log/yamshopping
systemctl daemon-reload; systemctl enable yam-lockdown >/dev/null 2>&1; systemctl restart yam-lockdown
sleep 4
systemctl is-active --quiet yam-lockdown && echo "✓ השירות yam-lockdown פעיל (יומן: /var/log/yamshopping/lockdown.log)" \
  || { echo "⚠️ השירות לא עלה:"; tail -20 /var/log/yamshopping/lockdown.log; exit 1; }

# ---------- 5. ה-Caddyfile: רק בודקים ומסבירים ----------
if ! grep -qF "$LINE" "$CF"; then
  N="$(awk '/^[[:space:]]*(https?:\/\/)?www\.yamshopping\.com[^{]*\{/{w=1} w&&/import[[:space:]]+yamsite/{print NR; exit}' "$CF")"
  echo
  echo "👉 נשאר צעד אחד ידני (פעם אחת): להוסיף שורה אחת ל-Caddyfile, בתוך הבלוק של www.yamshopping.com."
  if [ -n "$N" ]; then
    echo "   מדביקים את 3 השורות האלה (יש גיבוי, ואם משהו לא תקין — הקובץ חוזר כמו שהיה):"
    echo
    echo "sudo cp -a $CF $CF.bak-lockdown && sudo sed -i '${N}i\\    $LINE' $CF"
    echo "sudo caddy validate --config $CF --adapter caddyfile && sudo systemctl reload caddy || sudo cp -a $CF.bak-lockdown $CF"
    echo "sudo bash $REPO/collector/bin/lockdown-install.sh"
  else
    echo "   לא מצאנו את הבלוק של www אוטומטית. פותחים: sudo nano $CF, ובתוך הבלוק של www.yamshopping.com, לפני import yamsite, מוסיפים:"
    echo "   $LINE"
  fi
  echo
  echo "   עד אז: הכפתור בבק אופיס כבר סוגר את המסד ומנתק את כולם, רק בלי דף השיפוצים."
  exit 0
fi

# ---------- 6. בדיקה אמיתית (בלי לסגור את האתר) ----------
reload_caddy || { echo "⛔ Caddy לא מקבל את ההגדרות — מחזירים את הקודם"; [ -n "$OLD" ] && cp -a "$OLD" "$SNIP" && reload_caddy; exit 1; }
sleep 2
get() { curl -sk -o /dev/null -w '%{http_code}' --resolve www.yamshopping.com:443:127.0.0.1 "$@"; }
body() { curl -sk --resolve www.yamshopping.com:443:127.0.0.1 "$@"; }
T=(-H "X-Yam-Maint-Test: $TOK")
ok=1
body "${T[@]}" https://www.yamshopping.com/ | grep -q "האתר בשיפוצים" && echo "✓ דף הבית מציג \"האתר בשיפוצים\"" || { echo "⛔ דף הבית לא הוחלף"; ok=0; }
body "${T[@]}" -H "Sec-Fetch-Mode: navigate" https://www.yamshopping.com/terms.html | grep -q "האתר בשיפוצים" && echo "✓ גם דפים אחרים" || { echo "⛔ דפים אחרים לא הוחלפו"; ok=0; }
[ "$(get "${T[@]}" https://www.yamshopping.com/sw.js)" = 404 ] && echo "✓ קבצי האתר חסומים (404)" || { echo "⛔ קבצי האתר עדיין נפתחים"; ok=0; }
body "${T[@]}" -H "Cookie: yam_pass=$TOK" https://www.yamshopping.com/ | grep -q "האתר בשיפוצים" && { echo "⛔ קישור המעקף לא עובד"; ok=0; } || echo "✓ הבעלים עם קישור המעקף רואה את האתר"
body https://www.yamshopping.com/ | grep -q "האתר בשיפוצים" && { echo "⛔ האתר מציג שיפוצים גם בלי סגירה!"; ok=0; } || echo "✓ בלי סגירה — האתר רגיל"
echo
if [ $ok = 1 ]; then
  echo "✅ הכל מוכן. סגירה: בבק אופיס ← 🚧 מצב שיפוצים, או: sudo env PYTHONPATH=$REPO/collector $PY -m yam.lockdown on"
  echo "🔑 קישור המעקף שלך (לשמור במקום בטוח, לא לשלוח לאף אחד):"
  echo "   https://www.yamshopping.com/__yam_pass/$TOK"
else
  echo "⚠️ משהו לא עבד כמו שצריך. מחזירים את $SNIP הקודם — נא לשלוח את הפלט הזה."
  if [ -n "$OLD" ]; then cp -a "$OLD" "$SNIP"; else : > "$SNIP"; fi; reload_caddy || true; exit 1
fi
echo
echo "📸 קבצים חריגים שכבר היו בשרת ונשמרו כתקינים (אם יש כאן משהו מוזר — לשלוח לי):"
env PYTHONPATH="$REPO/collector" YAM_ENV=/etc/yamshopping/collector.env "$PY" -m yam.lockdown status | tail -1
