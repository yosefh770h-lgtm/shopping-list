#!/bin/bash
# בדיקות אבטחה של מסד הנתונים: מקימים מסד נקי שמדמה את Supabase, מריצים את supabase/schema.sql פעמיים
# (כמו שמריצים אותו שוב ושוב ב-Supabase), ואז מנסים את כל ההתקפות כמשתמשים שונים — כל אחת חייבת להיחסם.
#   PSQL="psql -h localhost -U postgres" bash tests/db/run.sh
set -e
cd "$(dirname "$0")/../.."
P="${PSQL:-psql -h localhost -U postgres} -v ON_ERROR_STOP=1 -q"
DB=yam_test_$$
$P -d postgres -c "create database $DB" >/dev/null
trap "$P -d postgres -c 'drop database if exists $DB' >/dev/null 2>&1" EXIT
$P -d $DB -f tests/db/supabase-stub.sql >/dev/null 2>&1
for i in 1 2; do $P -d $DB -f supabase/schema.sql >/dev/null 2>/tmp/schema_err.txt || { grep -v NOTICE /tmp/schema_err.txt | tail -8; exit 1; }; done
echo "✅ schema.sql רץ בלי שגיאות (גם בפעם השנייה)"
out=$($P -d $DB -f tests/db/security-tests.sql 2>&1 | grep -v NOTICE || true)
echo "$out" | grep -E "FAIL|ERROR" && { echo "❌ בדיקות מסד הנתונים נכשלו"; exit 1; }
echo "$out" | grep -q "PASS ALL DONE" || { echo "$out" | tail -5; echo "❌ הבדיקות לא הגיעו לסוף"; exit 1; }
echo "✅ $(echo "$out" | grep -c PASS) בדיקות אבטחה של מסד הנתונים עברו"
