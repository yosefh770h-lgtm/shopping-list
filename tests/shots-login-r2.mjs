// צילומי מסך: מסך הכניסה בעיצוב 2.0 (אתר טלפון, אתר מחשב, אפליקציה, מצב כהה) + כניסה עם גוגל
//   OUT=תיקייה node shots-login-r2.mjs
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
const OLD_UA = APP_UA.replace('/2.0', '/1.9');
async function run(width, height, tag, { ua = '', dark = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: width < 600, hasTouch: width < 600, colorScheme: dark ? 'dark' : 'light', ...(ua ? { userAgent: ua } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/supabase\.co\/auth\/v1\/settings/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"external":{"google":true,"email":true}}' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  if (dark) await ctx.addInitScript(() => { try { localStorage.setItem('yam_dark', '1'); } catch (e) {} });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2200);
  if (dark) await page.evaluate(() => { document.body.classList.add('dark'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, tag + '.png') });
  const g = await page.$('#btnGoogle'); const vis = g && await g.isVisible();
  if (ua !== OLD_UA) ok(vis, tag + ': כפתור גוגל מופיע');
  if (ua === OLD_UA) ok(!vis, tag + ': באפליקציה ישנה הכפתור מוסתר');
  if (ua && vis) {
    let opened = '';
    await page.route(/supabase\.co\/auth\/v1\/authorize/, (r) => { opened = r.request().url(); r.abort(); });
    await page.click('#btnGoogle'); await page.waitForTimeout(800);
    const err = await page.$eval('#loginErr', (e) => e.textContent).catch(() => '');
    if (ua === APP_UA) ok(/code_challenge=/.test(opened) && /app-login\.html/.test(decodeURIComponent(opened)), tag + ': גוגל נפתח בדפדפן עם PKCE וחוזר לאפליקציה ' + opened.slice(0, 80));
    else ok(err.length > 0 && !opened, tag + ': אפליקציה ישנה — הודעה שצריך לעדכן');
  }
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run(390, 844, 'site-phone');
await run(1280, 800, 'site-computer');
await run(360, 780, 'app-phone', { ua: APP_UA });
await run(360, 780, 'app-dark', { ua: APP_UA, dark: true });
await run(360, 780, 'app-old-1.9', { ua: OLD_UA });
// חזרה מהדפדפן בלי קוד תקין — הודעה ברורה, והכתובת נקייה
{ const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, locale: 'he-IL', userAgent: APP_UA });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  const page = await ctx.newPage(); await page.goto(BASE + '?source=android&app_auth_err=1'); await page.waitForTimeout(2500);
  const err = await page.$eval('#loginErr', (e) => e.textContent); ok(/לא הושלמה/.test(err) && !/app_auth_err/.test(page.url()), 'חזרה שנכשלה: הודעה וכתובת נקייה');
  await ctx.close(); }
await browser.close(); server.close();
