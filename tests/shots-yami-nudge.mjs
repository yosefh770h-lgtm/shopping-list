// צילומי מסך + בדיקה: הבועה של יאמי ("יש עדכונים באתר") צמודה לכפתור של יאמי ומצביעה עליו, בכל גודל מסך.
//   OUT=תיקייה node shots-yami-nudge.mjs
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

async function run(width, height, tag, { app = false, dark = false, tab = 'list' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: width < 600, hasTouch: width < 600, colorScheme: dark ? 'dark' : 'light', ...(app ? { userAgent: APP_UA } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2200);
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  await page.evaluate((tab) => { state.user = { name: 'בודק', email: '', offline: true }; curList().items = []; setTab(tab); }, tab);
  if (dark) await page.evaluate(() => document.body.classList.add('dark'));
  await page.waitForTimeout(500);
  await page.evaluate(() => showNudge('👩‍🍳 🆕 יש עדכונים באתר! כתבו לי "מה חדש" או ⚙️ ← מה חדש באתר'));
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => { const f = document.querySelector('#botFab'), n = document.querySelector('#botNudge');
    const fr = f.getBoundingClientRect(), nr = n.getBoundingClientRect(), a = getComputedStyle(n, '::after');
    const tail = nr.left + parseFloat(a.left) + 7;
    return { fabVis: fr.width > 0, fr: [fr.left, fr.top, fr.right, fr.bottom], nr: [nr.left, nr.top, nr.right, nr.bottom], tail, W: innerWidth, H: innerHeight, at: n.classList.contains('atfab') }; });
  if (m.fabVis) {
    ok(m.at && m.nr[3] <= m.fr[1] && m.fr[1] - m.nr[3] < 30, tag + ': הבועה ממש מעל הכפתור של יאמי (רווח ' + Math.round(m.fr[1] - m.nr[3]) + 'px)');
    ok(m.tail >= m.fr[0] && m.tail <= m.fr[2], tag + ': החץ של הבועה מצביע על יאמי');
    ok(m.nr[0] >= 0 && m.nr[2] <= m.W && m.nr[1] >= 0, tag + ': הבועה כולה בתוך המסך');
  } else console.log('ℹ️', tag + ': כפתור יאמי לא מוצג כאן (יאמי פתוח בצד), הבועה במקום הרגיל');
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await page.screenshot({ path: path.join(OUT, tag + '.png') });
  await ctx.close();
}
await run(390, 844, '1-אתר-טלפון');
await run(320, 640, '2-טלפון-קטן');
await run(390, 844, '3-אפליקציה', { app: true });
await run(430, 932, '4-טלפון-גדול-כהה', { dark: true });
await run(1366, 800, '5-מחשב', { tab: 'stores' });
await run(820, 1180, '6-טאבלט');
await browser.close(); server.close();
