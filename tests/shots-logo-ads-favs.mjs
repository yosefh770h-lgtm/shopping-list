// צילומי מסך + בדיקה: לוגו מחזיר לדף הראשי, פרסומת הצד רק בדף הראשי, ✖ מהיר במוצרים המהירים, "אפליקציה" במקום "אתר" באפליקציה.
//   OUT=תיקייה node shots-logo-ads-favs.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', css: 'text/css', svg: 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
async function run(tag, { ua, width = 390, height = 844, app }) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: width < 600, hasTouch: width < 600, userAgent: ua });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open'));
    state.user = { name: 'בודק', email: '', offline: true }; curList().items = []; ['חלב', 'לחם', 'ביצים'].forEach((n) => addItem(n, ''));
    state.stats = { 'חלב': 9, 'לחם': 8, 'ביצים': 7, 'עגבניות': 6, 'מלפפונים': 5, 'קוטג׳': 4 }; state.favHidden = []; state.hideFavs = false;
    adsCache = [{ id: 'a1', placement: 'side', title: 'מבצע לדוגמה', body: 'פרסומת בדיקה', emoji: '🛒', theme: 'green', active: true }, { id: 'b1', placement: 'banner', title: 'באנר לדוגמה', emoji: '📢', theme: 'green', active: true, close_after: 0 }];
    setTab('list'); render(); renderBannerAd(); renderSideAd(); });
  await page.waitForTimeout(800);
  const adsVis = () => page.evaluate(() => ['#ybSide', '#ybTop'].map((s) => { const e = document.querySelector(s); return !!(e && !e.hidden && e.innerHTML); }));
  let v = await adsVis(); ok(v[0] && v[1], tag + ': בדף הראשי יש פרסומת בצד ובאנר');
  await page.screenshot({ path: path.join(OUT, tag + '-1-main-with-ads.png') });
  for (const t of ['hist', 'home', 'prices']) { await page.evaluate((t) => setTab(t), t); await page.waitForTimeout(300); v = await adsVis(); ok(!v[0] && v[1], tag + ': בדף ' + t + ' אין פרסומת בצד (הבאנר נשאר)'); }
  await page.screenshot({ path: path.join(OUT, tag + '-2-home-no-ads.png') });
  await page.click('#brand svg.ylogo');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => tab === 'list'), tag + ': לחיצה על הלוגו מחזירה לרשימה (הדף הראשי)');
  v = await adsVis(); ok(v[0] && v[1], tag + ': חזרה לדף הראשי — הפרסומות חוזרות');
  await page.evaluate(() => { const e = document.querySelector('#ybSide'); if (e) e.hidden = true; const b = document.querySelector('#ybTop'); if (b) b.hidden = true; });
  await page.click('#favs [data-favedit]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.querySelectorAll('#favs .favx').length >= 5), tag + ': ✏️ מציג ✖ על כל מוצר מהיר');
  await page.evaluate(() => document.querySelector('#favs').scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: path.join(OUT, tag + '-3-quick-items-x.png') });
  await page.click('#favs .favx[data-favx="לחם"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => (state.favHidden || []).includes('לחם') && !document.querySelector('#favs [data-fav="לחם"]') && !document.querySelector('#v8Sheet.open')), tag + ': ✖ מוריד את "לחם" מיד, בלי לפתוח חלון');
  await page.screenshot({ path: path.join(OUT, tag + '-4-after-remove.png') });
  await page.click('#favs [data-favedit]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.querySelector('#favs .favx')), tag + ': ✔ מסיים — ה-✖ נעלמים');
  const lo = await page.evaluate(() => document.querySelector('#miLogout span').textContent);
  ok(!/מהאתר/.test(lo) || !app, tag + ': בתפריט כתוב "' + lo + '"');
  if (app) { await page.evaluate(() => { document.querySelector('#hMenu').classList.add('open'); }); await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, tag + '-5-menu-app-words.png') }); }
  ok(errors.length === 0, tag + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}
await run('phone-site', { ua: ANDROID });
await run('phone-app', { ua: ANDROID + ' YamShoppingApp/2.0', app: true });
await run('computer', { ua: undefined, width: 1280, height: 800 });
await run('tablet', { ua: undefined, width: 820, height: 1180 });
await browser.close(); server.close();
