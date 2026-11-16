// "הבית שלי" והגדרות בעיצוב 2.0 — טלפון (אפליקציה), טאבלט ומחשב.   OUT=תיקייה node shots-home-settings-r2.mjs
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
const DEV = { phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: APP_UA },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
  computer: { viewport: { width: 1440, height: 900 } } };
const ST = { user: { name: 'יוסף', email: 'yosef@gmail.com', offline: true, city: 'רחובות' }, pantry: { 'חלב': true, 'לחם': true, 'ביצים': true }, missingHome: ['קפה'],
  history: [{ ts: Date.now() - 86400000, listName: 'ערב שבת', store: 'שופרסל דיל', total: 182, items: [{ n: 'חלב' }] }, { ts: Date.now() - 3 * 86400000, listName: 'שבועי', store: 'רמי לוי', total: 412, items: [{ n: 'לחם' }] }],
  budget: { limit: 2500 } };
for (const dev of Object.keys(DEV)) for (const dark of [false, true]) {
  if (dark && dev !== 'phone') continue;
  const ctx = await browser.newContext({ ...DEV[dev], locale: 'he-IL', deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript((st) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); }, ST);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + (dev === 'phone' ? '?source=android' : '')); await page.waitForTimeout(2500);
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  const sfx = dev + (dark ? '-כהה' : '');
  if (dark) await page.evaluate(() => { if (!state.dark) document.querySelector('#btnDark').click(); });
  await page.evaluate(() => setTab('home')); await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, 'הבית-שלי-' + sfx + '.png') });
  if (process.env.FULL) await page.screenshot({ path: path.join(OUT, 'הבית-שלי-מלא-' + sfx + '.png'), fullPage: true });
  ok(await page.locator('#paneHome .r2tile').count() === 5, sfx + ': חמישה אריחים כמו בהדמיה');
  ok(await page.locator('#paneHome .r2tile svg').count() === 0, sfx + ': אימוג׳י צבעוני ולא אייקון קווי');
  if (!dark) { await page.click('#paneHome [data-r2tile="4"]'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => document.querySelector('#paneHome').classList.contains('r2inv')), sfx + ': "קטגוריות" פותח את המלאי בבית');
    await page.screenshot({ path: path.join(OUT, 'המלאי-בבית-' + sfx + '.png') });
    await page.evaluate(() => document.querySelector('#paneHome [data-r2back]').click()); await page.waitForTimeout(300); }
  await page.evaluate(() => { const b = document.querySelector('#btnMenu'); b && b.click(); }); await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, 'הגדרות-' + sfx + '.png') });
  ok(await page.locator('#hMenu .r2st [data-r2s="dark"]').count() === 1 && await page.locator('#hMenu .r2st [data-r2s="drop"]').count() === 1, sfx + ': הגדרות — תצוגה והתראות כמו בהדמיה');
  ok(await page.evaluate(() => [...document.querySelectorAll('#hMenu button')].filter((b) => b.offsetParent && /^\s*(מצב כהה|ערכת צבעים|גודל תצוגה)/.test(b.textContent)).length === 1), sfx + ': בלי כפילויות בהגדרות');
  if (!dark) { const before = await page.evaluate(() => document.body.classList.contains('dark')); await page.click('#hMenu [data-r2s="dark"]'); await page.waitForTimeout(200);
    ok(await page.evaluate((b) => document.body.classList.contains('dark') !== b && document.querySelector('#hMenu [data-r2s="dark"]').getAttribute('aria-checked') === String(!b), before), sfx + ': מתג מצב כהה עובד');
    await page.click('#hMenu [data-r2s="dark"]'); await page.waitForTimeout(200);
    await page.click('#hMenu [data-r2s="drop"]'); ok(await page.evaluate(() => prefs.nOff && prefs.nOff.drop === true), sfx + ': מתג ירידות מחיר נשמר'); await page.click('#hMenu [data-r2s="drop"]'); }
  await page.evaluate(() => { const m = document.querySelector('#hMenu'); m.scrollTop = m.scrollHeight; }); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'הגדרות-סוף-' + sfx + '.png') });
  if (process.env.FULL) { const h = await page.evaluate(() => document.querySelector('#hMenu').scrollHeight); console.log(dev, 'settings height', h); }
  ok(!errors.length, sfx + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await browser.close(); server.close();
