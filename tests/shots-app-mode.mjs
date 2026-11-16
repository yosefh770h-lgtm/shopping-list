// צילומי מסך + בדיקה: "מצב אפליקציה" באפליקציית האנדרואיד — כניסה בסגנון אפליקציה, לשוניות בתחתית,
// וטקסט שלא בורח מהמסגרת גם כשהאות בטלפון מוגדרת גדולה. באתר עצמו לא משתנה כלום.
//   OUT=תיקייה node shots-app-mode.mjs
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
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/1.0';

async function run(width, height, tag, { app, zoom = 1, dark = false }) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: width < 600, hasTouch: width < 600, colorScheme: dark ? 'dark' : 'light', ...(app ? { userAgent: APP_UA } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') }); };
  await page.goto(BASE); await page.waitForTimeout(2200);
  // אות גדולה בהגדרות הטלפון (כמו "גודל גופן" באנדרואיד)
  if (zoom !== 1) await page.addStyleTag({ content: 'html{-webkit-text-size-adjust:' + zoom * 100 + '%!important}' });
  if (dark) await page.evaluate(() => document.body.classList.add('dark'));
  ok(await page.evaluate(() => document.documentElement.classList.contains('inapp')) === !!app, tag + (app ? ': באפליקציה — מצב אפליקציה פעיל' : ': באתר — בלי מצב אפליקציה'));
  if (app) {
    const lg = await page.evaluate(() => { const l = document.querySelector('#loginLogo .logo'); const c = getComputedStyle(l); return { r: c.borderRadius, links: getComputedStyle(document.querySelector('#login .guides40')).display }; });
    ok(lg.r !== '50%' && lg.links === 'none', tag + ': כניסה בסגנון אפליקציה — אייקון בריבוע מעוגל, בלי הקישורים של האתר');
  }
  await shot('1-login');
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  await page.evaluate(() => { state.user = { name: 'בודק', email: '', offline: true }; curList().items = []; ['חלב', 'לחם', 'ביצים', 'עגבניות'].forEach((n) => addItem(n, '')); setTab('list'); });
  await page.waitForTimeout(400);
  if (app) {
    const b = await page.evaluate(() => { const t = document.querySelector('.tabs'), r = t.getBoundingClientRect(), f = document.querySelector('#botFab').getBoundingClientRect(), i = document.querySelector('#inputRow').getBoundingClientRect();
      return { atBottom: Math.abs(r.bottom - innerHeight) < 2 && !t.closest('header'), fabAbove: f.bottom <= i.top + 1 || f.bottom <= r.top, inputAbove: i.bottom <= r.top + 1 }; });
    ok(b.atBottom, tag + ': הלשוניות בסרגל קבוע בתחתית המסך');
    ok(b.inputAbove && b.fabAbove, tag + ': שורת ההוספה ויאמי מעל הסרגל, לא מתחתיו');
  } else ok(await page.evaluate(() => !!document.querySelector('header .tabs')), tag + ': באתר הלשוניות נשארות למעלה');
  // הכותרת לא עולה על הכפתורים
  ok(await page.evaluate(() => { const t = document.querySelector('.btxt19 b').getBoundingClientRect(), h = document.querySelector('.hbtns').getBoundingClientRect(); return t.left >= h.right - 1 || t.right <= h.left + 1; }), tag + ': שם האתר לא עולה על הכפתורים למעלה');
  await shot('2-list');
  await page.evaluate(() => { authUser = { id: 'u1', email: 'a@b.c' }; window.srvPublic = () => true; try { srvPublic = () => true; } catch (e) {} });
  const overflow = async () => page.evaluate(() => [...document.querySelectorAll('#paneStores .seg button,.clseg button,.clcard b,.wedtabs button')].filter((e) => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim()));
  for (const g of ['women', 'wedding']) {
    await page.evaluate((g) => openClothing18(g), g); await page.waitForTimeout(600); await page.evaluate(() => renderStores()); await page.waitForTimeout(300);
    const o = await overflow();
    if (app) ok(!o.length, tag + ': ' + (g === 'women' ? 'ביגוד' : 'חתונה') + ' — אין טקסט שבורח מהמסגרת ' + o.join(' | '));
    await shot(g === 'women' ? '3-clothing' : '4-wedding');
  }
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run(360, 780, 'app-phone', { app: true });
await run(360, 780, 'app-phone-bigfont', { app: true, zoom: 1.4 });
await run(360, 780, 'app-phone-dark', { app: true, dark: true });
await run(390, 844, 'site-phone', { app: false });
await run(1280, 800, 'site-computer', { app: false });
await browser.close(); server.close();
