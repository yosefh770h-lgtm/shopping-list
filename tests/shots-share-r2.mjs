// בדיקה: כפתור "שיתוף" ליד "מצב קנייה" פותח את חלון השיתוף — טלפון, אפליקציה, מחשב, מצב כהה.
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
async function run(width, height, tag, { app = false, dark = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600, ...(app ? { userAgent: APP_UA } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + (app ? '?source=android' : '')); await page.waitForTimeout(2200);
  if (dark) await page.evaluate(() => { state.dark = true; document.body.classList.add('dark'); });
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open'));
    state.user = { name: 'יוסף', email: '', offline: true }; const l = curList(); l.name = 'ערב שבת'; l.items = []; ['חלב', 'ביצים', 'חלות'].forEach((n, i) => l.items.push({ id: 'x' + i, name: n, qty: 1, done: false })); save(); render(); setTab('list'); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('.overlay.open,.sheet.open').forEach((e) => e.classList.remove('open')));
  if (width >= 900) { const btn = page.locator('#r2share'); ok(await btn.isVisible(), tag + ': כפתור שיתוף ליד מצב קנייה מוצג'); await btn.click(); }
  else await page.evaluate(() => document.querySelector('[data-forward="btnShare"]').click()); /* בטלפון: "שליחה בוואטסאפ ושיתוף" מהתפריט */
  await page.waitForTimeout(400);
  const vis = await page.locator('#shareRow').isVisible(); ok(vis, tag + ': לחיצה פותחת את חלון השיתוף');
  ok(await page.locator('#shWa').isVisible(), tag + ': כפתור וואטסאפ גלוי');
  await page.screenshot({ path: path.join(OUT, tag + '.png') });
  await page.mouse.click(width < 900 ? 10 : 30, height - 120); await page.waitForTimeout(300);
  ok(!(await page.locator('#shareRow').isVisible()), tag + ': לחיצה בחוץ סוגרת');
  ok(!errors.length, tag + ': בלי שגיאות ' + errors.join(' | '));
  await ctx.close();
}
await run(390, 844, '1-טלפון');
await run(390, 844, '2-אפליקציה', { app: true });
await run(1366, 800, '3-מחשב');
await run(1366, 800, '4-מחשב-מצב-כהה', { dark: true });
await run(390, 844, '5-טלפון-מצב-כהה', { dark: true });
await browser.close(); server.close();
