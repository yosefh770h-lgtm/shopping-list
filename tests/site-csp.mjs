// 🛡️ חלק ה"קוד" של מדיניות האבטחה (CSP) של האתר, בדיוק כמו ב-vercel.json (משם Caddy מייצר את הכותרות בשרת).
// הבדיקות האוטומטיות שולחות אותו עם כל דף, כך שכל בדיקה רצה תחת אותה חסימה של קוד מוזרק כמו באתר החי:
// אם מישהו יחזיר קוד לתוך הדף (<script> בלי src), הבדיקות ייכשלו כאן ולא אצל המשתמשים.
// רק script-src*: את שאר המדיניות (למשל connect-src) לא שולחים, כי הבדיקות משתמשות בשרתים מדומים בכתובות אחרות.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const vercel = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site/vercel.json'), 'utf8'));
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;
export const SCRIPT_CSP = csp.split(';').map((d) => d.trim()).filter((d) => /^script-src/.test(d)).join('; ');
if (!/script-src-elem /.test(SCRIPT_CSP)) throw new Error('vercel.json: חסר script-src-elem ב-CSP');
