// צילומי מסך + בדיקה: הודעת "יש גרסה חדשה לאפליקציה" למי שפותח את האפליקציה לאנדרואיד בגרסה ישנה (רק הודעה, בלי הורדה מתוך האפליקציה).
//   OUT=תיקייה node shots-apk-update.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', css: 'text/css', svg: 'image/svg+xml', woff2: 'font/woff2', apk: 'application/vnd.android.package-archive' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const UA = (v) => 'Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0 Mobile Safari/537.36' + (v ? ' YamShoppingApp/' + v : '');

async function run(tag, ver, expect) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true, userAgent: UA(ver) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(3500);
  const shown = await page.isVisible('#apkUp56');
  ok(shown === expect, tag + (expect ? ': מופיעה הודעת עדכון' : ': אין הודעת עדכון'));
  if (shown) {
    ok(!(await page.$('#apkUp56 a[href*=".apk"]')) && !(await page.$('#apkUp56 [download]')), tag + ': רק הודעה — אין כפתור הורדה בתוך האפליקציה');
    ok((await page.textContent('#apkUp56')).includes('מורידים מהאתר'), tag + ': פס קטן — כתוב שיש עדכון ושמורידים מהאתר');
    ok((await page.$eval('#apkUp56', (e) => e.getBoundingClientRect().height)) < 60, tag + ': הפס קטן (לא תופס את המסך)');
    await page.screenshot({ path: path.join(OUT, tag + '.png') });
    await page.click('#apkOk56'); await page.waitForTimeout(600);
    ok(!(await page.isVisible('#apkUp56')), tag + ': "✕" סוגר');
  }
  ok(errors.length === 0, tag + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}
await run('1-app-1.1', '1.1', true);
await run('2-app-1.2', '1.2', false);
await run('3-browser', '', false);
await browser.close(); server.close();
