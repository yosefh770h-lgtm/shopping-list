#!/bin/bash
# ריצה מתוזמנת (cron, כמשתמש root): מושכים קודם את הקוד העדכני מ-git, ואז מריצים את האוסף כמשתמש yam.
#   cron-run.sh full | hourly | test [SHUFERSAL,OSHER_AD]
# כל הסקריפט בתוך main — bash קורא אותו כולו לפני הריצה, כך ש-git שמעדכן את הקובץ הזה באמצע לא שובר אותו.
main() {
  set -uo pipefail
  local MODE="${1:-hourly}" ONLY="${2:-}" BASE=/opt/yamshopping ENVF=/etc/yamshopping/collector.env
  local REPO="$BASE/repo" VENV="$BASE/venv" LOG=/var/log/yamshopping/collector.log
  local BRANCH; BRANCH="$(sed -n 's/^GIT_BRANCH=//p' "$ENVF" 2>/dev/null | tail -1)"; BRANCH="${BRANCH:-main}"
  exec 9>/run/lock/yamshopping.lock
  if [ "$MODE" = full ]; then flock -w 3600 9 || exit 0; else flock -n 9 || { echo "$(date '+%F %T') ריצה קודמת עוד פעילה — מדלגים" >>"$LOG"; exit 0; }; fi
  cd "$REPO" || exit 1
  local old new
  old="$(git rev-parse HEAD 2>/dev/null)"
  if timeout 180 git fetch -q --depth 1 origin "$BRANCH" 2>>"$LOG"; then git reset -q --hard FETCH_HEAD; fi
  new="$(git rev-parse HEAD 2>/dev/null)"
  if [ "$old" != "$new" ]; then
    echo "$(date '+%F %T') קוד חדש: ${old:0:7} → ${new:0:7}" >>"$LOG"
    if git diff --name-only "$old" "$new" 2>/dev/null | grep -q '^collector/requirements.txt$' || [ -z "$old" ]; then
      "$VENV/bin/pip" install -q -r collector/requirements.txt >>"$LOG" 2>&1
    fi
    systemctl try-restart yam-api >/dev/null 2>&1 || true
    systemctl try-restart yam-shield >/dev/null 2>&1 || true   # חומת ההגנה (אם הותקנה: bin/shield-install.sh)
  fi
  # 🛡️ התקנה חד-פעמית של חומת ההגנה (yam-shield), אם עוד לא הותקנה. כדי לא להתקין: touch /etc/yamshopping/shield.noinstall
  if [ ! -f /etc/systemd/system/yam-shield.service ] && [ ! -f /etc/yamshopping/shield.noinstall ] && [ -f collector/bin/shield-install.sh ]; then
    echo "$(date '+%F %T') 🛡️ מתקינים את חומת ההגנה" >>"$LOG"
    timeout 300 bash collector/bin/shield-install.sh >>"$LOG" 2>&1 || echo "$(date '+%F %T') ⚠️ התקנת חומת ההגנה נכשלה" >>"$LOG"
  fi
  cd /var/lib/yamshopping/work || exit 1
  runuser -u yam -- env YAM_ENV="$ENVF" PYTHONPATH="$REPO/collector" PLAYWRIGHT_BROWSERS_PATH="$BASE/pw-browsers" \
    timeout 6h "$VENV/bin/python" -m yam.run "$MODE" ${ONLY:+"$ONLY"} >>"$LOG" 2>&1
}
main "$@"; exit
