// צילומי מסך + בדיקה: אפליקציה 2.0, פריטים 1–5 מההדמיה — שיתוף אל האפליקציה, קיצורי דרך באייקון, מסך דלוק במצב קנייה, רטט וסימון ירוק בסריקה.
//   OUT=תיקייה node shots-app20.mjs
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

async function open(query) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: APP_UA });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  // האפליקציה: YamApp מדומה שרושם מה האתר ביקש
  await ctx.addInitScript(() => { localStorage.setItem('yam_tour165', '1'); window.__calls = [];
    window.YamApp = { keepScreen: (on) => __calls.push('keep:' + on), buzz: (ms) => __calls.push('buzz:' + ms), appInfo: () => '{"ver":"2.0","code":11,"keepScreen":true,"buzz":true}' }; });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + query); await page.waitForTimeout(2200);
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open'));
    state.user = { name: 'יוסף', email: '', offline: true }; });
  return { ctx, page, errors };
}
const shot = async (page, n) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, n + '.png') }); };

// 2 — שיתוף טקסט אל האפליקציה
{
  const t = 'תקנה בבקשה:\nחלב 3\nלחם\nביצים\nמלפפונים';
  const { ctx, page, errors } = await open('?source=android&a=paste&t=' + encodeURIComponent(t));
  ok(!(await page.evaluate(() => location.search.includes('a=paste'))), 'שיתוף: הטקסט יורד מהכתובת');
  await page.evaluate(() => { curList().items = []; save(); render(); run20(); }); await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('.flash').forEach((e) => e.classList.remove('show')));
  const items = await page.evaluate(() => curList().items.map((i) => i.n + (i.q ? ' ' + i.q : '')));
  ok(items.length === 4 && items.includes('חלב 3') && !items.some((x) => x.includes('תקנה')), 'שיתוף: 4 מוצרים, חלב ×3, בלי שורת הפתיחה — ' + items.join(' | '));
  ok(await page.evaluate(() => (document.querySelector('#paste20') || {}).textContent === '✓ נוספו 4 מוצרים מההודעה'), 'שיתוף: "✓ נוספו 4 מוצרים מההודעה"');
  await shot(page, '2-שיתוף-אל-האפליקציה');
  ok(!errors.length, 'שיתוף: בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
// 3 — קיצורי דרך: רשימה חדשה / סריקה / מיקרופון
{
  const { ctx, page, errors } = await open('?source=android&a=new');
  await page.evaluate(() => run20()); await page.waitForTimeout(1000);
  ok(await page.evaluate(() => /שם הרשימה החדשה/.test(document.body.innerText)), 'קיצור "רשימה חדשה": נפתח חלון שם הרשימה');
  await shot(page, '3-קיצור-רשימה-חדשה');
  ok(!errors.length, 'קיצור: בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
// 4 — מצב קנייה: המסך נשאר דלוק
{
  const { ctx, page, errors } = await open('?source=android');
  await page.evaluate(() => { curList().name = 'רמי לוי'; curList().items = []; ['חלב', 'לחם', 'גבינה צהובה', 'עגבניות', 'אורז', 'שמן'].forEach((n) => addItem(n, n === 'עגבניות' ? '1 ק"ג' : '')); curList().items.slice(0, 2).forEach((i) => (i.done = true)); save(); render(); __calls.length = 0; openShop26(); });
  ok(await page.evaluate(() => !!document.querySelector('#shop26 .awake20') && __calls.includes('keep:true')), 'מצב קנייה: פס "המסך יישאר דלוק" והמסך נשאר דלוק');
  await shot(page, '4-מסך-לא-נכבה-בקנייה');
  await page.evaluate(() => closeShop26());
  ok(await page.evaluate(() => __calls[__calls.length - 1] === 'keep:false'), 'יציאה ממצב קנייה: המסך חוזר להיכבות כרגיל');
  ok(!errors.length, 'מצב קנייה: בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
// 5 — רטט וסימון ירוק כשהסריקה מצליחה
{
  const { ctx, page, errors } = await open('?source=android');
  await page.evaluate(() => { dbProducts.push({ barcode: '7290000000017', name: 'חלב 3% 1 ליטר' }); const ov = document.querySelector('#scanOverlay'); ov.classList.add('open'); scanUi(); scanState.cont = true; __calls.length = 0; onScanned('7290000000017'); });
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => __calls.includes('buzz:60')), 'סריקה: רטט קצר');
  ok(await page.evaluate(() => (document.querySelector('.scanok20') || {}).textContent === '✓ נסרק: חלב 3% 1 ליטר'), 'סריקה: "✓ נסרק: חלב 3% 1 ליטר"');
  await page.screenshot({ path: path.join(OUT, '5-רטט-בסריקה.png') });
  ok(!errors.length, 'סריקה: בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await browser.close(); server.close();
