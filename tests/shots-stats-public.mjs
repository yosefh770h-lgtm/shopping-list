// צילומי מסך: מונה "מחוברים · משתמשים" כשהמנהל מציג אותו לכולם — באתר ובאפליקציה, בטלפון ובמחשב.
//   OUT=/dir node shots-stats-public.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots-stats-public'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', svg: 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/1.9';
async function run(name, vp, mobile, app) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2, ...(app ? { userAgent: APP_UA } : {}) });
  await ctx.route(/supabase\.co/, (r) => { const u = r.request().url();
    r.fulfill({ status: 200, contentType: 'application/json', body: /rpc\/site_stats/.test(u) ? JSON.stringify({ users: 801, online: 12 }) : '[]' }); });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  if (app) await ctx.addInitScript(() => { window.YamApp = { appInfo: () => JSON.stringify({ ver: '1.9', code: 10, selfUpdate: true, inbox: true, notif: 'granted', bg: true }), notifState: () => 'granted', askNotify: () => {}, setBg: () => {}, notify: () => {}, inboxLink: () => {}, inboxOn: () => {}, clearChat: () => {}, installUpdate: () => {}, saveFile: () => {} }; });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:' + server.address().port + '/index.html'); await page.waitForTimeout(2500);
  await page.evaluate(async () => { authUser = { id: 'u1', email: 'a@b.c' }; state.user = { name: 'יוסף', email: 'a@b.c' }; try { hideLogin(); } catch (e) {}
    uiCfg.statsShown = true; await statsRefresh(); });
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const s = document.querySelector('#stats16'); return !s.hidden && s.getClientRects().length > 0; }), name + ': המונה מופיע למשתמש רגיל');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ': ראש המסך לא גולש לרוחב');
  await page.screenshot({ path: `${OUT}/${name}-1-המונה-בראש-המסך.png`, clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 260) } });
  await page.evaluate(() => document.querySelector('#stats16').click()); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}-2-אחרי-לחיצה.png` });
  ok(!errors.length, name + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run('אתר-טלפון', { width: 390, height: 800 }, true, false);
await run('אתר-טלפון-קטן', { width: 360, height: 760 }, true, false);
await run('אתר-מחשב', { width: 1280, height: 860 }, false, false);
await run('אפליקציה', { width: 390, height: 800 }, true, true);
await run('אפליקציה-טלפון-קטן', { width: 360, height: 760 }, true, true);
await browser.close(); server.close();
