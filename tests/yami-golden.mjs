// בדיקת "לפני ואחרי" ליאמי: שולחים לה עשרות הודעות, ושומרים בדיוק מה ענתה ומה השתנה ברשימה.
// מריצים לפני שינוי בקוד של יאמי (record) ואחרי (compare) — וכל הבדל מודפס.
//   node yami-golden.mjs record golden.json   ·   node yami-golden.mjs compare golden.json
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [mode = 'compare', file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'yami-golden.json')] = process.argv.slice(2);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';

const MESSAGES = [
  'שלום', 'בוקר טוב', 'עזרה', 'מה אפשר לעשות באתר', 'מה חדש',
  'תוסיפי חלב 2 ולחם', 'ביצים', 'קמח, סוכר ושמן', 'תמחקי לחם', 'מה ברשימה', 'סמני חלב',
  'מה אפשר להכין?', 'חמין', 'מתכון לעוגת שוקולד', 'מתכון חדש', 'בטל',
  'פרשת השבוע', 'זמני שבת', 'זמני שבת בבני ברק', 'מה התאריך העברי', 'איזה חג היום', 'דבר תורה',
  'יש לי חלב, ביצים ואורז', 'מה יש לי בבית', 'כמה חלב יש לי', 'מה חסר לי בבית',
  'סידור: לעבור אצל התופרת, לשלוח אישור מחלה', 'תזכירי לי לאסוף חבילה מהדואר', 'הסידורים שלי', 'עשיתי תופרת', 'מחקי סידור דואר',
  'חנויות ביגוד', 'חליפות לגברים', 'רשימה לחתונה', 'מה צריך לקנות לכלה',
  'איפה הכי זול חלב', 'מבצעים לידי', 'איך לחסוך', 'מה יותר משתלם 1 ליטר ב-6.5 או 1.5 ליטר ב-8.9', 'כמה זה 3 כפול 12.90',
  'למד: מתי פותחים את הסופר = בשמונה בבוקר', 'מתי פותחים את הסופר',
  'מצב כהה', 'מצב בהיר', 'עבור להיסטוריה', 'עבור לרשימה',
  'רשימה חדשה לשבת', 'סיימתי קנייה', 'רמי לוי', 'קנייה קודמת', 'הרגלי הקנייה שלי',
  'ספר המתכונים', 'ההזמנות שלי', 'מה השעה', 'תודה', 'כן', 'לא',
  'shit', 'זבל של אתר', 'בינה: מה זה קוגל', 'ניווט לרמי לוי', '1',
  'מתכון חדש', 'זמני שבת', 'תוסיפי עגבניות', 'מה השעה', 'תוסיפי מלפפון', '3', 'לאן?', 'תמחקי מלפפון', 'מתכון חדש', 'עוגת גבינה', 'ביטול', 'הוסף מוצר', 'בטל', 'מה חסר לי בבית', 'כן',
  'יאמי תוסיפי לי קפה', 'לא משנה', '1', 'תכניסי לי לרשימה אורז', 'שימי לי ברשימה חלב', 'את יכולה להוסיף לי טונה', 'תוסיפי לרשימת שבת חלה ויין', 'תוסיפי את הכל', 'הוסף מוצר', 'בטל', 'זמני שבת בירושלים', 'זמני שבת',
  // ברכה / סמול-טוק / מילת מפתח בתוך בקשה אמיתית — לא עונים בתשובה מוכנה, ממשיכים לבינה המלאכותית (או מודים שהיא לא זמינה)
  'מה קורה יש מצב שאת בודקת לי על פיצה טובה בבני ברק ליד מכון מור', 'תסתכל שוב על מה ששלחתי לך קודם', 'מה קורה', 'שלום, מה ברשימה?', 'תודה רבה יאמי!',
  'תודה אבל איפה יש פיצה טובה בבני ברק?', 'יש פיצריה טובה קרוב אליי?', 'מה השעה שהפיצריה נסגרת', 'מה תאריך התפוגה של חלב', 'מה את יודעת על ההיסטוריה של בני ברק',
  'הטלפון התנתק מהוויפי מה לעשות', 'אל תמחקי את ההיסטוריה', 'איך מוחקים כתם קפה מחולצה', 'כמה זמן לבשל את האורז', 'יש חוות דעת על פיצה מור?',
  'זה לא צחוק, אני צריכה עזרה', 'עוד יכולות', 'איך מגיעים למכון מור בבני ברק', 'היי, תוסיפי מלח', 'לא משנה', '1',
  // תוכנית ליום, קייטרינג/חתונה/ביגוד, דיווח מבצע מול שאלה, שיתוף, ד"ת, תבניות
  'ביום שישי צריך חלה ויין', 'מה יש ביום שישי', 'תמליצי על קייטרינג טוב בבני ברק', 'קייטרינג', 'יש לך רעיון למתנה לכלה?', 'חנויות ביגוד',
  'יש מבצע בשופרסל?', 'ראיתי מבצע ברמי לוי', 'שלחי לי מתכון ואעביר בוואטסאפ', 'שתפי את הרשימה בוואטסאפ', 'ד"ת',
  'לשמור את הרשימה כתבנית מנגל', 'מה קונים למנגל ברשימה של השכנים', 'תבנית מנגל',
  // 🔁 פריטים קבועים — "3 חלב מדי יומיים" נכנס כ"חלב" ×3 + כלל קבוע (ולא כל המשפט); כשלא בטוחה — יאמי שואלת
  'תכניס לרשימה 3 חלב מדי יומיים', 'תוסיפי עגבניות כל יומיים', '2 לחם כל יום', 'ביצים פעם בשבוע', 'כל שבוע 6 יוגורט', 'חלב כל 3 ימים',
  'כל יום ראשון לחם', 'פעמיים בשבוע עגבניות', 'כל חודש נייר טואלט', 'מה הפריטים הקבועים שלי?', 'תפסיקי להוסיף חלב', 'בטלי את הלחם הקבוע',
  'תוסיפי קפה באופן קבוע', 'כל שבוע', 'תוסיפי סוכר באופן קבוע', 'רק הפעם', 'תוסיפי כל יומיים', 'קמח',
  'תוסיפי שמן כי נגמר לנו אתמול', 'כן', 'תוסיפי טונה כי אין בבית בכלל', 'לא', 'תזכירי לי כל שבוע לקנות אורז', 'כן, תוסיפי',
  'תוסיפי לי משהו שאני צריכה לארוחת ערב מחר', 'בטל', 'מה קונים כל שבוע?', 'קניות חוזרות',
  // 📜 "וורט" / "חידוש" = דבר תורה (ולא מוצר לרשימה או שאלת "כמה?"); "חידוש דרכון" נשאר סידור
  'וורט', 'תביאי לי וורט', 'עוד וורט', 'יש לך חידוש?', 'חידוש על פרשת נח', 'משהו על הפרשה', 'לשתף חידוש', 'בטל', 'יש לי וורט', 'בטל', 'תזכירי לי חידוש דרכון',
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
async function run(online) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort());
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.route(/(wa\.me|waze\.com|google\.com)/, (r) => r.abort());
  // מאגרים פתוחים (ספריא, Open Food Facts) משתנים מיום ליום — בהקלטה בלי רשת, כדי שהתשובות יהיו קבועות
  await ctx.route(/(sefaria\.org|openfoodfacts\.org)/, (r) => r.abort());
  await ctx.addInitScript(() => {
    // אותן תשובות בכל הרצה: מספרים "אקראיים" קבועים ושעה קבועה
    let s = 12345; Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const T0 = new Date('2026-10-07T10:00:00+03:00').getTime(); const RD = Date; let tick = 0;
    window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(T0 + tick); } static now() { return T0 + tick; } };
    window.open = () => ({});
    localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, city: 'ירושלים' }));
    localStorage.setItem('yam_tour165', '1'); localStorage.setItem('yam_cookie_ok', '1'); localStorage.setItem('yam_ver_seen', '99');
  });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2500);
  if (online) await page.evaluate(() => {
    const mk = () => { const c = new Proxy(function () {}, { get(t, p) { if (p === 'then') return (res) => res({ data: [], error: null }); return () => c; }, apply() { return c; } }); return c; };
    sb = { from: () => mk(), rpc: () => mk(), functions: { invoke: () => Promise.resolve({ data: { text: 'תשובה מהבינה המלאכותית', actions: [] }, error: null }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {} };
    authUser = { id: 'tester', email: 'tester@example.com' };
  });
  await page.evaluate(() => { state.bot = []; save(true); });
  const out = [];
  for (const m of MESSAGES) {
    const r = await page.evaluate(async (m) => {
      meSay(m); const mine = state.bot[state.bot.length - 1]; try { await botReply(m); } catch (e) { return { err: String(e && e.message) }; }
      await new Promise((r) => setTimeout(r, 120));
      return { replies: state.bot.slice(state.bot.lastIndexOf(mine) + 1).map((x) => x.txt), list: curList().items.map((i) => i.n + (i.done ? '✓' : '') + (i.q ? '×' + i.q : '')).join(','),
        lists: state.lists.map((l) => l.name).join('|'), errands: (state.errands || []).filter((e) => !e.del).map((e) => e.t + (e.done ? '✓' : '')).join(','), dark: !!state.dark, tab: typeof tab !== 'undefined' ? tab : '', pantry: Object.keys(state.pantry || {}).sort().join(','),
        ...((state.recurring || []).some((r) => !r.del) ? { rec: state.recurring.filter((r) => !r.del).map((r) => r.n + (r.q ? '×' + r.q : '') + '/' + (r.every ? r.every + 'd' : 'w' + r.days.join('')) + '/' + new Date(r.next).getDate() + '.' + (new Date(r.next).getMonth() + 1)).join(',') } : {}) };
    }, m);
    out.push({ m, ...r });
  }
  await ctx.close();
  return { out, errors };
}
const result = { offline: await run(false), online: await run(true) };
await browser.close(); server.close();

if (mode === 'record') { fs.writeFileSync(file, JSON.stringify(result, null, 1)); console.log('נשמר:', file, result.offline.out.length + result.online.out.length, 'תשובות'); process.exit(0); }
const old = JSON.parse(fs.readFileSync(file, 'utf8')); let diffs = 0;
for (const k of ['offline', 'online']) {
  result[k].out.forEach((r, i) => { const o = old[k].out[i]; if (JSON.stringify(o) !== JSON.stringify(r)) { diffs++; console.log('❌ [' + k + '] "' + r.m + '"\n   לפני: ' + JSON.stringify(o) + '\n   אחרי: ' + JSON.stringify(r)); } });
  if (result[k].errors.length) { diffs++; console.log('❌ שגיאות בדף [' + k + ']:', result[k].errors); }
}
console.log(diffs ? `\n${diffs} הבדלים` : `✅ כל ${result.offline.out.length * 2} התשובות של יאמי זהות לפני ואחרי`);
process.exit(diffs ? 1 : 0);
