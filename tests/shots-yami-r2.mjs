// צילומי מסך: הצ'אט של יאמי בעיצוב 2.0 מול ההדמיה — אפליקציה, טלפון, מחשב, מצב כהה.
//   OUT=תיקייה node shots-yami-r2.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', css: 'text/css', svg: 'image/svg+xml', woff2: 'font/woff2' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/2.0';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
async function run(width, height, tag, { app = false, dark = false } = {}) {
  if (ONLY && !ONLY.includes(tag)) return;
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600, ...(app ? { userAgent: APP_UA } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + (app ? '?source=android' : '')); await page.waitForTimeout(2200);
  if (dark) await page.evaluate(() => { state.dark = true; document.body.classList.add('dark'); });
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  await page.evaluate(() => { state.user = { name: 'יוסף', email: '', offline: true }; const l = curList(); l.name = 'ערב שבת'; l.items = []; ['חלב 3%', 'ביצים L', 'חלות', 'עגבניות', 'יין לקידוש', 'קפה טורקי'].forEach((n) => addItem(n, '')); setTab('list'); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const n = Date.now();
    state.bot = [{ who: 'bot', txt: 'שלום! אני יאמי 👋 אפשר לבקש ממני להוסיף מוצרים, לבדוק מחירים או להציע מתכון.', ts: n - 5e4 },
      { who: 'me', txt: 'תוסיף לרשימה של שבת חומרים לקוגל תפוחי אדמה', ts: n - 4e4 },
      { who: 'bot', txt: 'הוספתי ל"ערב שבת":\n🥔 תפוחי אדמה 2 ק"ג\n🧅 בצל ×3\n🥚 ביצים ×4\n🫒 שמן', ts: n - 3e4 },
      { who: 'me', txt: 'איפה הכי זול השבוע?', ts: n - 2e4 },
      { who: 'bot', txt: 'לרשימה שלך הכי זול בשופרסל דיל, 174 ₪. חוסכים 38 ₪ 🙂', ts: n - 1e4, chips: [{ l: 'פתח רשימה' }, { l: 'ביטול' }] }]; save();
    try { closeSheet(); } catch (e) {} document.querySelectorAll('.overlay.open,.sheet.open,[class*=sheet].open').forEach((e) => e.classList.remove('open')); document.querySelectorAll('.flash').forEach((e) => e.classList.remove('show'));
    if (!document.documentElement.classList.contains('r2d')) openBot(); else renderBot(); });
  await page.waitForTimeout(700);
  await page.evaluate(() => { const b = state.bot.filter((m) => m.who === 'bot').pop(); if (b && !b.chips) b.chips = [{ l: 'כן' }, { l: 'אחר כך' }]; renderBot(); document.activeElement && document.activeElement.blur(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, tag + '-yami.png') });
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run(390, 844, 'app', { app: true });
await run(1366, 860, 'computer');
await run(390, 844, 'app-dark', { app: true, dark: true });
await browser.close(); server.close();
