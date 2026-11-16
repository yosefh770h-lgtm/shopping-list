// צילומי מסך ובדיקות: "נגמר" בקוביות, קטגוריה בחלון מוצר חדש, הערות במצב קנייה, הצגת רשימה מההיסטוריה
//   OUT=תיקייה node shots-thread73.mjs
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
const ok = (c, m) => { if (!c) { console.log("FAIL", m); process.exitCode = 1; } else console.log("OK", m); };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await ctx.route(/fonts\.(googleapis|gstatic)|openfoodfacts/, (r) => r.abort());
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, n + '.png') }); };
await page.goto(BASE); await page.waitForTimeout(2200);
await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open'));
  state.user = { name: 'יוסף', email: '', offline: true }; const l = curList(); l.items = []; setTab('list'); });
await page.waitForTimeout(1500);
// 6) קטגוריה בחלון מוצר חדש
await page.evaluate(() => { try { closeSheet(); } catch (e) {} addItem('ספוג קסם לניקוי', ''); });
await page.waitForTimeout(1500);
const has = await page.$('#unkOk'); ok(has, 'נפתח חלון "מוצר חדש — לאיזו קטגוריה?"');
if (has) {
  const before = await page.evaluate(() => document.querySelector('[data-unk] [data-f=cat]').value);
  const CAT = await page.evaluate(() => { const o = [...document.querySelectorAll('[data-unk] [data-f=cat] option')].map((x) => x.value); console.log(o); return o.find((v) => /ניק/.test(v)) || o[2]; }); await page.selectOption('[data-unk] [data-f=cat]', CAT);
  await shot('6-new-product-category');
  await page.click('#unkOk'); await page.waitForTimeout(1500);
  const r = await page.evaluate(() => { const it = curList().items.find((i) => i.n === 'ספוג קסם לניקוי'); return { c: it && it.c, cat: resolveCat('ספוג קסם לניקוי') }; });
  ok(r.c === CAT && r.cat === CAT, 'הקטגוריה שנבחרה נשמרה (היה ' + before + ') ' + JSON.stringify(r));
}
// 4) "נגמר" בקוביות
await page.evaluate(() => { try { closeSheet(); } catch (e) {} const ns = ['חטיפי אנרגיה עם שוקולד מריר ושקדים', 'נייר אפייה מקצועי לתבנית גדולה', 'חלב', 'עגבניות שרי']; state.missingHome = ns.slice(); ns.forEach((n) => { try { stockSet(n, 0); } catch (e) {} });
  state.homeView = 'out'; state.homeLayout = 'grid'; setTab('home'); renderHome(); document.querySelector('#paneHome').classList.add('r2inv'); window.scrollTo(0, 0); });
await page.waitForTimeout(800);
ok(await page.$$eval('#paneHome .h73t', (x) => x.length) >= 4, 'נגמר: מוצגות קוביות');
await page.evaluate(() => { const e = document.querySelector('#paneHome .h71seg'); e && e.scrollIntoView({ block: 'start' }); });
await shot('4a-ran-out-tiles');
await page.click('[data-h71lay=list]'); await page.waitForTimeout(500);
ok(await page.$$eval('#paneHome .h71row', (x) => x.length) >= 4, 'נגמר: אפשר לחזור לשורות');
await page.evaluate(() => { const e = document.querySelector('#paneHome .h71seg'); e && e.scrollIntoView({ block: 'start' }); });
await shot('4b-ran-out-rows');
// 12) הערות במצב קנייה
await page.evaluate(() => { setTab('list'); const l = curList(); l.items = []; ['קוקה קולה', 'חלב', 'לחם', 'עגבניות'].forEach((n) => addItem(n, '')); l.items[0].note = 'רק של קוקה קולה זירו, לא של חברה אחרת'; l.items[0].q = '2'; l.items[2].note = 'פרוס, אחיד'; save(); render(); openShop26(); });
await page.waitForTimeout(800);
ok(await page.$$eval('#shop26 .snote', (x) => x.length) === 2, 'מצב קנייה: הערות מוצגות מתחת למוצר');
await shot('12a-shopping-notes');
await page.click('#shop26 [data-s26n]'); await page.waitForTimeout(300);
ok(await page.$$eval('#shop26 .snote', (x) => x.length) === 0, 'מצב קנייה: כפתור 📝 מסתיר הערות');
await page.click('#shop26 [data-s26n]'); await page.evaluate(() => closeShop26());
// 13) הצגת רשימה מההיסטוריה
await page.evaluate(() => { const t = Date.now() - 864e5 * 3; state.history = [{ ts: t, listName: 'קנייה לשבת', store: 'שופרסל', by: 'יוסף', total: 287.4,
  items: [{ n: 'קוקה קולה', q: '2', e: '🥤', note: 'רק זירו' }, { n: 'חלות', q: '2', e: '🍞' }, { n: 'חלב', e: '🥛' }, { n: 'עגבניות', q: '1 ק״ג', e: '🍅' }, { n: 'שניצל', e: '🍗' }, { n: 'אורז', e: '🍚' }] }]; save(); setTab('hist'); renderHist(); });
await page.waitForTimeout(700);
const r2 = await page.$('.r2hr'); if (r2) await r2.click();
await page.waitForTimeout(300);
await shot('13a-history-buttons');
await page.click('[data-hview]:visible'); await page.waitForTimeout(600);
ok(await page.$$eval('.hv73 li', (x) => x.length) === 6, 'היסטוריה: נפתח חלון עם כל הרשימה');
await shot('13b-history-view');
// מצב כהה
await page.evaluate(() => { document.body.classList.add('dark'); });
await shot('13c-history-view-dark');
console.log('errors', errors.slice(0, 5));
await browser.close(); server.close();
