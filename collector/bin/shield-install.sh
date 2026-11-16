#!/bin/bash
# 🛡️ התקנה של חומת ההגנה (yam-shield) בשרת — פעם אחת. בטוח להריץ שוב.
#   sudo bash /opt/yamshopping/repo/collector/bin/shield-install.sh           התקנה / עדכון
#   sudo bash /opt/yamshopping/repo/collector/bin/shield-install.sh --remove  הסרה מלאה (החסימות יורדות מיד)
# מה זה עושה: מתקין nftables אם חסר (בלי להפעיל את השירות nftables.service, שמוחק כללים אחרים באתחול),
# ומגדיר שירות systemd בשם yam-shield שרץ מהמאגר (/opt/yamshopping/repo) ומתעדכן לבד עם הקוד.
# לא נוגע ב-/etc/caddy/Caddyfile, ב-iptables או בכללי ה-firewall הקיימים — רק טבלה נפרדת: inet yamshield.
# כיבוי מיידי בלי להסיר: sudo touch /etc/yamshopping/shield.off   (והפעלה מחדש: sudo rm /etc/yamshopping/shield.off)
set -euo pipefail
REPO=/opt/yamshopping/repo; VENV=/opt/yamshopping/venv; UNIT=/etc/systemd/system/yam-shield.service
[ "$(id -u)" = 0 ] || { echo "צריך sudo"; exit 1; }
if [ "${1:-}" = "--remove" ]; then
  systemctl disable --now yam-shield 2>/dev/null || true
  rm -f "$UNIT"; systemctl daemon-reload
  nft delete table inet yamshield 2>/dev/null || true
  echo "✓ השומר הוסר, וכל החסימות שלו ירדו"; exit 0
fi
if ! command -v nft >/dev/null; then
  if command -v apt-get >/dev/null; then apt-get install -y -q nftables >/dev/null; else dnf install -y -q nftables >/dev/null; fi
fi
command -v nft >/dev/null || { echo "⛔ לא הצלחנו להתקין nftables"; exit 1; }
PY="$VENV/bin/python"; [ -x "$PY" ] || PY="$(command -v python3)"
cat > "$UNIT" <<EOU
[Unit]
Description=Yam Shopping shield (anti-flood / anti-DDoS firewall)
After=network-online.target
Wants=network-online.target

[Service]
Environment=YAM_ENV=/etc/yamshopping/collector.env
Environment=PYTHONPATH=$REPO/collector
ExecStart=$PY -m yam.shield run
Restart=always
RestartSec=5
Nice=-5
MemoryMax=300M
StandardOutput=append:/var/log/yamshopping/shield.log
StandardError=append:/var/log/yamshopping/shield.log

[Install]
WantedBy=multi-user.target
EOU
mkdir -p /var/log/yamshopping
systemctl daemon-reload
systemctl enable yam-shield >/dev/null 2>&1
systemctl restart yam-shield
sleep 5
if systemctl is-active --quiet yam-shield; then
  echo "✓ השומר פעיל. מה קורה: sudo tail -f /var/log/yamshopping/shield.log"
  echo "  מצב: sudo env PYTHONPATH=$REPO/collector $PY -m yam.shield status"
else
  echo "⚠️ השומר לא עלה. היומן:"; tail -20 /var/log/yamshopping/shield.log; exit 1
fi
