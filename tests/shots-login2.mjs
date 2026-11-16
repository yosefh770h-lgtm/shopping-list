// צילומי מסך: מסך הכניסה 2.0 ואנימציית הפתיחה — באתר (טלפון/טאבלט/מחשב) ובאפליקציה.
//   OUT=תיקייה node shots-login2.mjs
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
const APP = ANDROID + ' YamShoppingApp/2.0';
const ONLY = process.env.ONLY || '';

async function run(tag, { ua, width = 390, height = 844, dark, frames }) {
  if (ONLY && !tag.includes(ONLY)) return;
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: width < 700, hasTouch: width < 1000, colorScheme: dark ? 'dark' : 'light', ...(ua ? { userAgent: ua } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(frames ? BASE + '?splash' : BASE);
  if (frames) {
    ok(await page.isVisible('#yi2'), tag + ': אנימציית הפתיחה מופיעה');
    for (const t of frames) { await page.waitForTimeout(t[0]); await page.screenshot({ path: path.join(OUT, tag + '-' + t[1] + '.png') }); }
  }
  await page.waitForTimeout(4500);
  ok(!(await page.isVisible('#yi2')), tag + ': האנימציה נעלמת לבד');
  ok(await page.isVisible('#login .lcard'), tag + ': מסך הכניסה מופיע');
  ok(!(await page.$('#lApk53')), tag + ': אין כפתור הורדת אפליקציה במסך הכניסה');
  const box = await page.$eval('#login .lcard', (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: innerHeight - r.bottom }; });
  ok(Math.abs(box.top - box.bottom) < 40 || box.top < 30, tag + ': הכרטיס באמצע הגובה (למעלה ' + Math.round(box.top) + ', למטה ' + Math.round(box.bottom) + ')');
  await page.screenshot({ path: path.join(OUT, tag + '-login.png') });
  if (dark) { await page.evaluate(() => document.body.classList.add('dark')); await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, tag + '-login.png') }); }
  ok(errors.length === 0, tag + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}
await run('1-phone-site', { ua: ANDROID, frames: [[250, 'a'], [600, 'b'], [700, 'c'], [700, 'd'], [600, 'e'], [400, 'f']] });
await run('2-phone-app', { ua: APP });
await run('3-tablet', { ua: ANDROID.replace('Pixel 7', 'SM-X710'), width: 820, height: 1180 });
await run('4-computer', { width: 1440, height: 900 });
await run('5-phone-dark', { ua: ANDROID, dark: true });
await browser.close(); server.close();
