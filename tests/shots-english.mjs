// אנגלית וכפתור השפה — טלפון (אפליקציה) ומחשב, בעברית ובאנגלית.   OUT=תיקייה LANG2=en|he node shots-english.mjs
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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/2.0';
const DEV = { phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: APP_UA },
  computer: { viewport: { width: 1440, height: 900 } } };
const LIST = { id: 'l1', name: 'ערב שבת', items: ['חלב 3%', 'ביצים L', 'חלות', 'עגבניות', 'יין קידוש'].map((n, i) => ({ id: 'i' + i, n, q: '', done: i === 4, ts: Date.now() })) };
const ST = { user: { name: 'Yosef', email: 'yosef@gmail.com', offline: true, city: 'רחובות' }, lists: [LIST], active: 'l1' };
const LANG = process.env.LANG2 || 'en';
const ABROAD = !!process.env.TZID && !/Jerusalem/.test(process.env.TZID);
if (ABROAD) delete ST.user.city;
for (const dev of Object.keys(DEV)) {
  const ctx = await browser.newContext({ ...DEV[dev], locale: LANG === 'en' ? 'en-US' : 'he-IL', deviceScaleFactor: 2, timezoneId: process.env.TZID || 'Asia/Jerusalem' });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await ctx.addInitScript((lang) => { localStorage.setItem('yam_tour165', '1'); if (lang === 'en' && !localStorage.getItem('yamh_prefs')) localStorage.setItem('yamh_prefs', JSON.stringify({ lang: 'en' })); }, process.env.PRESET === '0' ? '' : LANG);
  await page.goto(BASE + (dev === 'phone' ? '?source=android' : '')); await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, dev + '-1-login.png') });
  ok(await page.locator('#lang2lg').isVisible(), dev + ': כפתור שפה במסך הכניסה');
  ok((await page.locator('#lang2lg').textContent()).includes(LANG === 'en' ? 'עברית' : 'English'), dev + ': הכפתור כתוב בשפה השנייה');
  await page.evaluate((st) => { localStorage.setItem('yamh_app_v1', JSON.stringify(st)); }, ST);
  await page.reload(); await page.waitForTimeout(3000);
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  await page.screenshot({ path: path.join(OUT, dev + '-2-list.png') });
  for (const [t, n] of [['prices', 3], ['home', 4], ['hist', 5]]) { await page.evaluate((t) => setTab(t), t); await page.waitForTimeout(900); await page.screenshot({ path: path.join(OUT, dev + '-' + n + '-' + t + '.png') });
    if (t === 'prices') ok(await page.locator('#panePrices .abroad2').count() === (ABROAD ? 1 : 0), dev + (ABROAD ? ': מחוץ לישראל — הסבר על המחירים' : ': בישראל — בלי הסבר על חוץ לארץ')); }
  await page.evaluate(() => { setTab('list'); const b = document.querySelector('#btnMenu'); b && b.click(); }); await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, dev + '-6-settings.png') });
  ok(await page.locator('#hMenu [data-r2s="lang"]').count() === 1, dev + ': שורת שפה בהגדרות');
  await page.click('#hMenu [data-r2s="lang"]'); await page.waitForTimeout(400);
  ok(await page.locator('#lang2ov.open').isVisible(), dev + ': חלון בחירת השפה נפתח');
  await page.screenshot({ path: path.join(OUT, dev + '-7-sheet.png') });
  await Promise.all([page.waitForEvent('load'), page.click('#lang2ov [data-lang2="' + (LANG === 'en' ? 'he' : 'en') + '"]')]); await page.waitForTimeout(2500);
  ok(await page.evaluate((l) => document.documentElement.dir === (l === 'en' ? 'rtl' : 'ltr'), LANG), dev + ': אחרי הבחירה המסך מתהפך');
  if (dev === 'computer') { await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); }); ok(await page.locator('#lang2hd').isVisible(), dev + ': כפתור שפה בפס העליון במחשב'); await page.screenshot({ path: path.join(OUT, dev + '-8-after.png') }); }
  ok(!errors.length, dev + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await browser.close(); server.close();
