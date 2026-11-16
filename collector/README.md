# 🛰️ אוסף המחירים בשרת (server.yamshopping.com)

השרת מוריד לבד את קבצי "שקיפות מחירים" של כל הרשתות הפעילות, מכל הסניפים, 24/7:

| מתי | מה |
|---|---|
| כל יום ב-05:30 | Stores (סניפים), PriceFull ו-PromoFull (הכל מחדש) |
| כל שעה, 07:15 עד 23:15 | Price ו-Promo (רק שינויים). רשת שעוד לא פרסמה קובץ מלא היום מקבלת גם את המלא |
| בשבת וחג | לפי ההגדרה בבק אופיס ← 💰 מחירים (השהיה עם מרווח / בדיוק בזמנים / בלי) |

כל ריצה של cron מושכת קודם `git` (הענף שנבחר בהתקנה), כך שעדכוני קוד מגיעים לשרת לבד.

## מה נשמר איפה

* **בשרת (SQLite, `/var/lib/yamshopping/prices.db`)**: המחיר העדכני של כל מוצר בכל סניף, מבצעים, סניפים, וסטטוס. היסטוריית שינויי מחיר נשמרת 14 יום ונמחקת.
* **ב-Supabase**: רק מה שהאתר צריך. רשתות (`chains`), סניפים (`branches`, עם `ext_id`), מחיר מייצג אחד לכל מוצר בכל רשת (`prices` עם `origin='collector:<רשת>'`, החציון של כל הסניפים), מבצעים פעילים לכל הלקוחות, וסטטוס לכל רשת (`collector_status`). מעלים רק מה שהשתנה.
* **תקלות** נשלחות ליומן התקלות 🐞 (`client_errors`). כשל של רשת אחת לא עוצר את האחרות.
* **ההגדרות** (אילו רשתות פעילות, שבת וחג) ב-`site_config` ← `collector`, ונקבעות בבק אופיס ← 💰 מחירים.
* **מה המשתמשים רואים** נקבע שם גם כן. `public` הוא המתג הראשי, והוא כבוי כברירת מחדל: רק מנהלים רואים את השוואת הסניפים, ושום מחיר מהשרת לא עולה ל-Supabase. `hidden` היא רשימת רשתות שלא מוצגות למשתמשים: הן ממשיכות להיאסף בשרת, אבל המחירים שלהן יורדים מהאתר, וה-API מסנן אותן (`exclude=`).

`prices-sync` (מקורות מחירים מקישורים) ממשיכה לעבוד כמו קודם. האוסף לא נוגע במחירים שלה.

## ה-API (לקריאה בלבד)

`https://server.yamshopping.com` (FastAPI מאחורי Caddy עם HTTPS אוטומטי. CORS רק ל-yamshopping.com. הגבלות והגנה מהעתקה בסעיף הבא):

* `/health`, `/chains`
* `/cities?q=בני`: ערים שיש בהן סניפים
* `/stores?city=בני ברק` או `?lat=32.08&lng=34.83` (קרוב אליי) או `?chain=SHUFERSAL&q=...`
* `/prices?store=7290027600007:202&items=חלב|במבה*3`
* `/compare?items=חלב|במבה*3&city=בני ברק` (או `stores=...` או `lat=&lng=`)
* `/products?q=חלב תנובה`: המוצרים שמתאימים לטקסט (ברקוד, שם, יצרן, בכמה סניפים ורשתות, מחיר מינימום / חציון / מקסימום), לבחירת מוצר מדויק לפני ההשוואה
* מוצר שנבחר נשלח ב-`items` כ-`חלב תנובה#7290004131074`: משווים רק את הברקוד הזה בכל הסניפים, והשם שלפני ה-`#` הוא מה שמוצג

באתר: "השוואת סל מלא" ← "השוואה בין הסניפים — כל הסניפים בארץ".

## 🕵️ הגנה מהעתקה (scraping)

CORS מונע רק מאתרים אחרים לקרוא מהדפדפן. סקריפט יכול לפנות לשרת ישירות, ולכן יש גם:

| מה | ברירת מחדל |
|---|---|
| דרך האתר (`www.yamshopping.com/api/prices` ← Caddy באותו שרת ← 127.0.0.1:8088): לכל משתמש לפי הכתובת האמיתית שלו (`X-Forwarded-For` של Caddy). מ-Vercel (אם חוזרים אליו): `x-real-ip` | 120 בדקה, 5,000 ביום |
| ישירות ל-server.yamshopping.com, רק במצב `DIRECT_MODE=limit` (ברירת המחדל עכשיו: חסימה, בשורה הבאה) | 30 בדקה, 1,500 ביום |
| תקרה לכל חיבור (נגד זיוף כותרות של Vercel) | 1,500 בדקה |
| ישירות ל-server.yamshopping.com (לפי הכתובת שאליה הגיעה הבקשה, X-Forwarded-Host של Caddy) — חוץ מ-`/health` והשרת שלנו | 🛡️ נחסם מיד (403), והשומר בשרת חוסם את הכתובת לשעה. `DIRECT_MODE=limit` מחזיר את ההגבלה הישנה |
| ניסיון פריצה (‎/.env, wp-login, ‎.git, ‎.php וכו') | 403, והשומר חוסם את הכתובת ל-24 שעות |
| כתובות שנחסמו בבק אופיס ← 🛡️ בוטים ואבטחה ← 🕵️ (גם טווח, למשל `1.2.3.0/24`) | 403, תוך שעה |

אפשר לשנות במשתני סביבה של `yam-api`: `RATE_PER_MIN`, `SITE_PER_DAY`, `DIRECT_RATE_PER_MIN`, `DIRECT_PER_DAY`, `PEER_RATE_PER_MIN`.

כל בקשה נרשמת ב-`watch.db` (ליד `prices.db`, 14 יום), מסוכם לפי יום וכתובת: כמה בקשות, דרך האתר או ישירות, איזה כלי,
כמה סניפים ומוצרים שונים. בכל ריצה שעתית האוסף מעלה ל-Supabase (`scrape_watch`, 30 יום) את מי שנראה חשוד, ומוריד את
רשימת החסומים ל-`blocked.json`. ניקוד 3 ומעלה שולח התראה למנהלים (`admin_alerts_check`, הסף ב-`site_config` ← `security` ← `alert_scrape`).

**מי זה כל אחד** (לכל כתובת חשודה, בבק אופיס ← "🔎 כל הפרטים"):
* **מיקום משוער** (`yam/geoip.py`): מדינה, עיר, ספק אינטרנט או ארגון, ונקודה על המפה. המידע מגיע מ-DB-IP Lite
  (רישיון CC BY 4.0, ולכן הקרדיט "IP Geolocation by DB-IP" מופיע בכרטיס). הקבצים יורדים לבד פעם בחודש ל-`DATA_DIR/geoip`.
  המיקום הוא ברמת העיר בערך. כתובת של חברת שרתים או VPN מסומנת "☁️ שרת / VPN", כי אז המיקום הוא של השרת ולא של האדם.
* **חשבון באתר**, רק ממה שהאתר כבר אוסף: כניסה או הרשמה מאותה כתובת (`auth_events`), אורח שנרשם (`guest_visits`), ורמז
  `X-Yam-Who` שהאתר שולח עם כל בקשת מחירים (לא מאומת). לאורח אנונימי אין מייל.
* **כתובות מוכרות**: השרת שלנו (DNS של server/www/yamshopping.com, ועוד כתובות ב-`SERVER_IPS` מופרדות בפסיק), localhost
  וכתובות פרטיות לא נחשבות חשודות ולא נחסמות לעולם, גם אם הוכנסו לרשימה. בדיקות של Claude (160.79.104.0/21) ומנועי חיפוש
  מסומנים כך ולא מקבלים ניקוד. חסימה רחבה מ-/16 (או /32 ב-IPv6) לא נאכפת.

## התקנה

```bash
curl -fsSL https://www.yamshopping.com/collector/setup.sh | sudo bash
```

הסקריפט בטוח להרצה חוזרת. הוא מתקין python3, venv ו-sqlite, מוסיף swap של 2GB אם הזיכרון קטן, מגדיר אזור זמן Asia/Jerusalem, מוריד או מעדכן את המאגר, ומגדיר cron עם flock, את ה-API (systemd) ואת Caddy. הוא גם פותח את פורטים 80 ו-443 ב-firewall של השרת, ובסוף מריץ ריצת בדיקה קטנה.

* המאגר פרטי, אז בפעם הראשונה הסקריפט יוצר **מפתח פריסה לקריאה בלבד** ומבקש להוסיף אותו ב-GitHub ← Settings ← Deploy keys.
* מפתח השירות של Supabase **לא** עובר בפקודה. הסקריפט מבקש להדביק אותו, ושומר אותו רק ב-`/etc/yamshopping/collector.env` (הרשאות 640).
* פרמטרים: `--email`, `--domain`, `--branch`, `--new-key`, `--no-api`, `--skip-test` (פירוט בראש `setup.sh`).
* לפני הפעם הראשונה צריך להריץ את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית ← שלב 1), כדי שתיווצר הטבלה `collector_status` והעמודות החדשות.

פקודות שימושיות בשרת:

```bash
sudo tail -f /var/log/yamshopping/collector.log                 # מה קורה עכשיו
sudo /opt/yamshopping/repo/collector/bin/cron-run.sh full        # הורדה מלאה עכשיו
sudo -u yam env YAM_ENV=/etc/yamshopping/collector.env PYTHONPATH=/opt/yamshopping/repo/collector \
  /opt/yamshopping/venv/bin/python -m yam.run status             # סיכום לכל רשת
systemctl status yam-api caddy                                   # ה-API וה-HTTPS
```

## Oracle Cloud: טרמינל, פורטים ושרת חזק יותר

### לפתוח טרמינל לשרת
1. נכנסים ל-cloud.oracle.com ← ☰ ← **Compute** ← **Instances** ← לוחצים על השרת.
2. מעתיקים את **Public IP address** ואת **Username** (ב-Ubuntu: `ubuntu`, ב-Oracle Linux: `opc`).
3. **מהדפדפן (Cloud Shell)**: למעלה מימין, האייקון `>_` (Developer tools ← Cloud Shell). בחלון שנפתח: ⚙️ ← **Upload** ← בוחרים את קובץ המפתח הפרטי שהורדתם כשיצרתם את השרת (`ssh-key-….key`), ואז:
   ```bash
   chmod 600 ssh-key-*.key
   ssh -i ssh-key-*.key ubuntu@<IP>
   ```
4. **או מהמחשב (Windows)**: פותחים PowerShell ומריצים `ssh -i "C:\Users\<שם>\Downloads\ssh-key-….key" ubuntu@<IP>`.
5. בפעם הראשונה עונים `yes`. כשמופיע `ubuntu@...:~$`, מדביקים את פקודת ההתקנה.

### לפתוח את פורטים 80 ו-443 ב-Oracle (Security List)
1. בדף השרת ← **Networking** (או Primary VNIC) ← לוחצים על ה-**Subnet**.
2. **Security** ← **Security Lists** ← **Default Security List for …**.
3. **Add Ingress Rules**: ‏Source CIDR `0.0.0.0/0` · ‏IP Protocol `TCP` · ‏Destination Port Range `80,443` ← **Add Ingress Rules**.
4. ה-firewall שבתוך השרת נפתח לבד ע"י `setup.sh`.

וגם רשומת DNS: `server` מסוג A ← ה-IP של השרת (ב-Cloudflare, שם מנוהל הדומיין yamshopping.com).

⚠️ אותו Caddy מגיש גם את האתר עצמו (www.yamshopping.com, ראו "איפה האתר רץ" ב-README הראשי). `setup.sh` לא דורס Caddyfile קיים — הוא רק מוסיף את בלוק `server.yamshopping.com` אם הוא חסר, ומפעיל מחדש את Caddy רק אם הקובץ השתנה.

### שרת עם 1GB זיכרון, או Ampere A1?
השרת הקטן (VM.Standard.E2.1.Micro: מעבד אחד ו-1GB) יעבוד עם ה-swap, אבל ההורדה המלאה של כל הסניפים בכל הרשתות תהיה איטית (כמה שעות), וחלק מהרשתות צריכות דפדפן שכבד עליו. מומלץ **Ampere A1**, שבתוכנית החינמית מגיע עד 4 מעבדים ו-24GB:
1. Compute ← Instances ← **Create instance**.
2. Image: **Ubuntu 24.04** (Canonical). Shape: **Change shape** ← **Ampere** ← `VM.Standard.A1.Flex` ← ‏4 OCPU ו-24GB (או 2 ו-12, אם אין מקום).
3. Networking: אותה רשת (VCN) של השרת הקיים, עם Public IP. מורידים את המפתח הפרטי (Save private key).
4. Boot volume: אפשר להגדיל (בתוכנית החינמית עד 200GB לכל הדיסקים יחד). 50GB מספיקים.
5. **Create**. אם מופיע "Out of capacity", זה מצב נפוץ באזור ירושלים. מנסים שוב מאוחר יותר או עם פחות מעבדים.
6. מעבירים את רשומת ה-DNS ל-IP החדש, מריצים עליו את פקודת ההתקנה, ואת השרת הישן אפשר לכבות.

הגדלת דיסק בשרת קיים: Boot volume ← **Edit** ← גודל חדש. אחר כך, ב-Oracle Linux: `sudo /usr/libexec/oci-growfs -y`, וב-Ubuntu: אתחול (`sudo reboot`).

## פיתוח ובדיקות

```bash
cd collector
pip install -r requirements-dev.txt
python -m pytest -q tests        # בלי אינטרנט: קבצים לדוגמה בכל הפורמטים, ה-API, שבת וחג
```

הקבצים: `yam/xmlparse.py` (פענוח), `yam/db.py` (SQLite), `yam/scrape.py` (הורדה), `yam/supa.py` (Supabase), `yam/shabbat.py`, `yam/geo.py` (מיקום סניפים לפי עיר), `yam/run.py` (הריצה), `yam/api.py` (ה-API), `setup.sh`, `bin/cron-run.sh`.
אחרי שינוי ב-`setup.sh` מעתיקים אותו גם ל-`shopping-list-site/collector/setup.sh` (`cp collector/setup.sh shopping-list-site/collector/setup.sh`). הבדיקות בודקות שהם זהים.
