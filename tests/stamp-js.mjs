// הקוד של האתר נמצא בקבצים shopping-list-site/js/*.js, ו-index.html טוען כל אחד עם מספר גרסה: /js/012.js?v=<טביעת אצבע>.
// הטלפון שומר כל קובץ לתמיד לפי הכתובת המלאה — אז אחרי כל שינוי בקובץ js חייבים לעדכן את ה-?v= שלו, אחרת יישאר אצל אנשים הקוד הישן.
//   node tests/stamp-js.mjs           — מעדכן את כל ה-?v= ב-index.html לפי התוכן הנוכחי של הקבצים
//   node tests/stamp-js.mjs --check   — רק בודק (בבדיקות האוטומטיות): נכשל אם קובץ השתנה בלי ?v= חדש, או שחסר קובץ
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const INDEX = path.join(SITE, 'index.html');
const check = process.argv.includes('--check');
const html = fs.readFileSync(INDEX, 'utf8');
const errors = [];
const used = new Set();
// גם קובץ העיצוב js/site.css (<link rel="stylesheet" href="/js/site.css?v=...">) — נובמבר 2026
const out = html.replace(/(<script\b[^>]*\ssrc="|<link\b[^>]*\shref=")\/js\/([^"?]+)(?:\?v=([^"]*))?"/g, (all, pre, file, v) => {
  const p = path.join(SITE, 'js', file);
  used.add(file);
  if (!fs.existsSync(p)) { errors.push(`חסר הקובץ js/${file}`); return all; }
  const h = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 10);
  if (v !== h) errors.push(`js/${file}: ?v=${v || '(אין)'} אבל התוכן הוא ${h}`);
  return `${pre}/js/${file}?v=${h}"`;
});
for (const f of fs.readdirSync(path.join(SITE, 'js'))) if ((f.endsWith('.js') || f.endsWith('.css')) && !used.has(f)) errors.push(`js/${f} לא נטען מ-index.html`);
if (check) {
  if (errors.length) { console.error('❌ ' + errors.join('\n❌ ') + '\nלתיקון: node tests/stamp-js.mjs'); process.exit(1); }
  console.log(`✅ ${used.size} קבצי js ו-css — כל מספרי הגרסה מעודכנים`);
} else {
  if (out !== html) fs.writeFileSync(INDEX, out);
  const missing = errors.filter((e) => !e.includes('?v='));
  if (missing.length) { console.error('❌ ' + missing.join('\n❌ ')); process.exit(1); }
  console.log(`✅ עודכנו ${errors.length} מספרי גרסה (${used.size} קבצים)`);
}
