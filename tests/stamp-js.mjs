// הקוד של האתר נמצא בקבצים shopping-list-site/js/*.js (ו-js/pages/*.js לדפים הקטנים), וכל דף טוען כל אחד עם מספר גרסה: /js/012.js?v=<טביעת אצבע>.
// הטלפון שומר כל קובץ לתמיד לפי הכתובת המלאה — אז אחרי כל שינוי בקובץ js חייבים לעדכן את ה-?v= שלו, אחרת יישאר אצל אנשים הקוד הישן.
//   node tests/stamp-js.mjs           — מעדכן את כל ה-?v= ב-index.html לפי התוכן הנוכחי של הקבצים
//   node tests/stamp-js.mjs --check   — רק בודק (בבדיקות האוטומטיות): נכשל אם קובץ השתנה בלי ?v= חדש, או שחסר קובץ
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const check = process.argv.includes('--check');
const errors = [];
const used = new Set();
const changed = [];
// 🛡️ כל דפי האתר: אסור קוד בתוך הדף עצמו (<script> בלי src) — כל הקוד בקבצים ב-js/.
// ככה אפשר לחסום בדפדפן כל קוד "מוזרק" (CSP בלי 'unsafe-inline'). מותר רק <script type="application/ld+json"> (נתונים לגוגל, לא קוד)
// ו-<script type="text/lazy" src=...> (נטען אחר כך, ראו js/lazy.js).
const pages = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
for (const page of pages) {
  const file = path.join(SITE, page);
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
    if (!/\ssrc=/.test(m[1]) && !/type="application\/ld\+json"/.test(m[1])) errors.push(`${page}: קוד בתוך הדף (שורה ${html.slice(0, m.index).split('\n').length}) — להעביר לקובץ ב-js/`);
  }
  const out = html.replace(/(<script\b[^>]*\ssrc=")\/js\/([^"?]+)(?:\?v=([^"]*))?"/g, (all, pre, rel, v) => {
    const p = path.join(SITE, 'js', rel);
    used.add(rel);
    if (!fs.existsSync(p)) { errors.push(`${page}: חסר הקובץ js/${rel}`); return all; }
    const h = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 10);
    if (v !== h) errors.push(`js/${rel}: ?v=${v || '(אין)'} אבל התוכן הוא ${h}`);
    return `${pre}/js/${rel}?v=${h}"`;
  });
  if (out !== html) changed.push([file, out]);
}
for (const dir of ['', 'pages/']) {
  for (const f of fs.readdirSync(path.join(SITE, 'js', dir))) if (f.endsWith('.js') && !used.has(dir + f)) errors.push(`js/${dir}${f} לא נטען מאף דף`);
}
if (check) {
  if (errors.length) { console.error('❌ ' + errors.join('\n❌ ') + '\nלתיקון מספרי גרסה: node tests/stamp-js.mjs'); process.exit(1); }
  console.log(`✅ ${used.size} קבצי js — כל מספרי הגרסה מעודכנים, ואין קוד בתוך הדפים (${pages.length} דפים)`);
} else {
  for (const [file, out] of changed) fs.writeFileSync(file, out);
  const bad = errors.filter((e) => !e.includes('?v='));
  if (bad.length) { console.error('❌ ' + bad.join('\n❌ ')); process.exit(1); }
  console.log(`✅ עודכנו ${errors.length} מספרי גרסה (${used.size} קבצים)`);
}
