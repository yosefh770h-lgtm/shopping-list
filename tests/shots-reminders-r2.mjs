// תזכורות וסידורים בעיצוב 2.0 — טלפון (אפליקציה), טאבלט ומחשב, בהיר וכהה.   OUT=תיקייה node shots-reminders-r2.mjs
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
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
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const ERR = [{ id: 'e1', t: 'לאסוף מהתופרת', place: 'הרצל 5 רחובות', due: day(1), done: false, ts: Date.now(), o: 0, pr: 2 },
  { id: 'e2', t: 'לשלוח חבילה בדואר', done: false, ts: Date.now(), o: 1, pr: 1 },
  { id: 'e3', t: 'להחזיר ספרים לספרייה', due: day(-1), done: false, ts: Date.now(), o: 2, pr: 3 },
  { id: 'e4', t: 'לקנות מתנה לבר מצווה', done: true, ts: Date.now() }];
const only = process.env.ONLY;
for (const dev of Object.keys(DEV)) for (const dark of [false, true]) for (const empty of [false, true]) {
  if (only && !only.split(',').includes(dev)) continue;
  if (empty && dark) continue;
  const ST = { user: { name: 'יוסף', email: 'yosef@gmail.com', offline: true, city: 'רחובות' }, errands: empty ? [] : ERR };
  const ctx = await browser.newContext({ ...DEV[dev], locale: 'he-IL', deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript((st) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); }, ST);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + (dev === 'phone' ? '?source=android' : '')); await page.waitForTimeout(2500);
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  if (dark) await page.evaluate(() => { if (!state.dark) document.querySelector('#btnDark').click(); });
  const sfx = dev + (dark ? '-כהה' : '') + (empty ? '-ריק' : '');
  await page.evaluate(() => setTab('list')); await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'רשימה-' + sfx + '.png') });
  const entry = await page.evaluate(() => [...document.querySelectorAll('[data-eopen]')].some((b) => b.offsetParent !== null && b.getBoundingClientRect().width > 0));
  ok(entry, sfx + ': יש כניסה גלויה לתזכורות במסך הרשימה');
  await page.evaluate(() => setTab('home')); await page.waitForTimeout(600);
  ok(await page.locator('#paneHome .r2tile').count() === 5, sfx + ': חמישה אריחים בבית שלי כמו קודם');
  const homeEntry = await page.locator('#paneHome [data-eopen]').count();
  ok(homeEntry === 1, sfx + ': כרטיס תזכורות בבית שלי');
  await page.screenshot({ path: path.join(OUT, 'הבית-שלי-' + sfx + '.png') });
  if (homeEntry) await page.click('#paneHome [data-eopen]'); else await page.evaluate(() => openErrands(false));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, 'חלון-תזכורות-' + sfx + '.png') });
  if (!empty && !dark) {
    await page.fill('#er17t', 'לתקן את הנעליים'); await page.click('#er17add'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => state.errands.some((e) => e.t === 'לתקן את הנעליים')), sfx + ': הוספת תזכורת עובדת');
    await page.click('.er17list [data-edone="e2"]'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => state.errands.find((e) => e.id === 'e2').done === true), sfx + ': סימון בוצע עובד');
  }
  const old = await page.evaluate(() => { const s = document.querySelector('.errstrip17'); return s ? getComputedStyle(s).backgroundColor : ''; });
  ok(!/255, 250, 240|44, 42, 32/.test(old), sfx + ': בלי הרקע הצהוב הישן');
  ok(!errors.length, sfx + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await browser.close(); server.close();
