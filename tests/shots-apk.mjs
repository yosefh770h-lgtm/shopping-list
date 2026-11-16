// צילומי מסך + בדיקה: הורדת אפליקציית האנדרואיד (APK) מהאתר.
// באנדרואיד ובמחשב: פריט בתפריט (במסך הכניסה כבר אין כפתור). במחשב: רק בתפריט. באייפון ובתוך האפליקציה: לא מופיע.
//   OUT=תיקייה node shots-apk.mjs
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
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function run(tag, { ua, width = 390, height = 844, login, menu }) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: width < 600, hasTouch: width < 600, acceptDownloads: true, ...(ua ? { userAgent: ua } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  ok(!!(await page.$('#lApk53')) === login, tag + (login ? ': יש כפתור הורדה במסך הכניסה' : ': אין כפתור הורדה במסך הכניסה'));
  ok(!!(await page.$('#miApk53')) === menu, tag + (menu ? ': יש פריט הורדה בתפריט' : ': אין פריט הורדה בתפריט'));
  if (login) await page.screenshot({ path: path.join(OUT, tag + '-1-login.png') });
  if (menu) {
    if (login) await page.click('#lApk53'); else await page.evaluate(() => openApk53());
    await page.waitForTimeout(500);
    ok(await page.isVisible('#apkDl53'), tag + ': נפתח חלון עם כפתור הורדה והוראות');
    await page.screenshot({ path: path.join(OUT, tag + '-2-sheet.png') });
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#apkDl53')]);
    const f = await dl.path(); const buf = fs.readFileSync(f);
    ok(dl.suggestedFilename() === 'yamshopping.apk' && buf.slice(0, 2).toString() === 'PK' && buf.length > 100000, tag + ': הקובץ yamshopping.apk יורד (' + Math.round(buf.length / 1024) + ' KB)');
  }
  ok(errors.length === 0, tag + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}
await run('android', { ua: ANDROID, login: false, menu: true }); // עיצוב 2.0: בכניסה כבר אין כפתור הורדה
await run('computer', { width: 1280, height: 800, login: false, menu: true });
await run('iphone', { ua: IPHONE, login: false, menu: false });
await run('app', { ua: ANDROID + ' YamShoppingApp/1.0', login: false, menu: false });
await browser.close(); server.close();
