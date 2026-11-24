// 🛡️ חלק ה"קוד" של מדיניות האבטחה (CSP) של האתר, בדיוק כמו ב-vercel.json (משם Caddy מייצר את הכותרות בשרת).
// הבדיקות האוטומטיות שולחות אותו עם כל דף, כך שכל בדיקה רצה תחת אותה חסימה של קוד מוזרק כמו באתר החי:
// אם מישהו יחזיר קוד לתוך הדף (<script> בלי src, או onclick= / onerror= בתוך HTML), הבדיקות ייכשלו כאן ולא אצל המשתמשים.
// כשיש באתר מדיניות "לדיווח בלבד" (Content-Security-Policy-Report-Only, המחמירה) — הבדיקות כבר אוכפות אותה, כדי שלפני שהיא נאכפת באתר נדע שהכול עובד.
// רק script-src*: את שאר המדיניות (למשל connect-src) לא שולחים, כי הבדיקות משתמשות בשרתים מדומים בכתובות אחרות.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const vercel = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site/vercel.json'), 'utf8'));
const all = vercel.headers.flatMap((h) => h.headers);
const csp = (all.find((h) => h.key === 'Content-Security-Policy-Report-Only') || all.find((h) => h.key === 'Content-Security-Policy')).value;
export const SCRIPT_CSP = csp.split(';').map((d) => d.trim()).filter((d) => /^script-src/.test(d)).join('; ');
if (!/script-src-elem /.test(SCRIPT_CSP)) throw new Error('vercel.json: חסר script-src-elem ב-CSP');
if (/'unsafe-inline'/.test(SCRIPT_CSP)) throw new Error("vercel.json: ב-script-src עדיין יש 'unsafe-inline'");

// כל חסימה של CSP בכל דף בבדיקות (למשל onclick= שנשאר בתוך HTML — הדפדפן לא זורק שגיאה, רק כותב לקונסול) נאספת כאן,
// ובסוף כל קובץ בדיקות יש בדיקה שנכשלת אם הייתה כזאת, עם הטקסט של החסימה.
export function watchCsp(browser) {
  const hits = new Set();
  const orig = browser.newContext.bind(browser);
  browser.newContext = async (...a) => {
    const c = await orig(...a);
    c.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy/.test(m.text())) hits.add(m.text().slice(0, 240)); });
    return c;
  };
  return hits;
}
