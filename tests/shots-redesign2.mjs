// צילומי מסך + בדיקה: עיצוב 2.0 (כחול כהה, ורוד ושמנת) — לוגו חדש, ערכות צבע לפרו, מסך פרו ונקודות.
//   OUT=תיקייה node shots-redesign2.mjs
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
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/2.0';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;

async function run(width, height, tag, { app = false, dark = false, theme = '', pro = false } = {}) {
  if (ONLY && !ONLY.includes(tag)) return;
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: width < 600, hasTouch: width < 600, ...(app ? { userAgent: APP_UA } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') }); };
  await page.goto(BASE); await page.waitForTimeout(2200);
  await shot('1-login');
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  await page.evaluate(() => { state.user = { name: 'יוסף', email: '', offline: true }; curList().items = []; ['חלב 3%', 'ביצים L', 'חלות', 'עגבניות', 'יין לקידוש'].forEach((n) => addItem(n, '')); setTab('list'); });
  await page.waitForTimeout(700); await page.evaluate(() => { try { closeSheet(); } catch (e) {} document.querySelectorAll('.flash').forEach((e) => e.classList.remove('show')); });
  await page.evaluate(({ dark, theme, pro }) => { if (pro && window.pro2) window.pro2.__test({ pro: true, points: 260, photos: 5, shared: 1, friends: 4 }); if (theme && window.th36Set) th36Set(theme); if (dark) { state.dark = true; document.body.classList.add('dark'); } }, { dark, theme, pro });
  await page.waitForTimeout(400);
  await shot('2-list');
  if (process.env.EXTRA) for (const [n, js] of JSON.parse(process.env.EXTRA)) { await page.evaluate(js); await shot(n); await page.evaluate(() => document.querySelectorAll('.overlay.open,.sheet.open').forEach((e) => e.classList.remove('open'))); }
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run(390, 844, 'site-phone');
await run(360, 780, 'app-phone', { app: true });
await run(1280, 800, 'site-computer');
await run(360, 780, 'app-dark', { app: true, dark: true });
for (const t of ['sky', 'mint', 'lilac', 'night']) await run(360, 780, 'pro-' + t, { app: true, theme: t, pro: true });
// מסך פרו, בחירת ערכה (משתמש רגיל / פרו), ובק אופיס ← נקודות ופרו
async function screens(width, height, tag, { app = false } = {}) {
  if (ONLY && !ONLY.includes(tag)) return;
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: width < 600, hasTouch: width < 600, ...(app ? { userAgent: APP_UA } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.addInitScript(() => { localStorage.setItem('yam_tour165', '1'); });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') }); };
  await page.goto(BASE); await page.waitForTimeout(2200);
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); state.user = { name: 'יוסף', email: '', offline: true }; setTab('list');
    const R = { pro_status: null, admin_pro_summary: { pro: 23, manual: 6, close: 41, joined_month: 142 }, pro_cfg: {}, my_ref_code: 'a1b2c3d4',
      admin_pro_users: [['משה כהן', 'moshe@example.com', 312, 7, 2, 3, false, true, true, 'manual'], ['יעקב לוי', 'yaakov@example.com', 290, 6, 1, 4, false, null, true, 'earned'], ['שמואל ברגר', 'shmuel@example.com', 180, 3, 1, 2, false, null, false, ''], ['רבקה כץ', 'rivka@example.com', 95, 1, 0, 10, false, null, true, 'fast'], ['צוות', 'staff@example.com', 40, 0, 0, 0, true, null, true, 'staff']]
        .map(([name, email, points, photos, shared, friends, staff, manual, pro, reason], i) => ({ user_id: 'u' + i, name, email, points, photos, shared, friends, staff, manual, pro, reason })) };
    const chain = () => { const o = new Proxy(function () {}, { get: (t, k) => k === 'then' ? (res) => res({ data: [], error: null }) : () => o, apply: () => o }); return o; };
    sb = { rpc: async (n) => ({ data: R[n] ?? null, error: null }), from: () => chain(), auth: { getSession: async () => ({ data: {} }) }, channel: () => chain(), removeChannel: () => {} };
    authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; });
  await page.evaluate(() => { window.pro2.__test({ pro: false, points: 260, photos: 3, shared: 1, friends: 4 }); window.pro2.open(); }); await shot('3-pro-screen');
  await page.evaluate(() => openTheme36()); await shot('4-themes-regular');
  await page.evaluate(() => { window.pro2.__test({ pro: true, reason: 'earned', points: 312, photos: 7, shared: 2, friends: 4 }); th36Set('lilac'); openTheme36(); }); await shot('5-themes-pro-lilac');
  await page.evaluate(() => { window.pro2.open(); }); await shot('6-pro-yes');
  await page.evaluate(() => { closeSheet(); th36Set('sea'); openBO('pro2'); }); await page.waitForTimeout(800); await shot('7-backoffice-pro');
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await screens(390, 844, 'pro-phone', { app: true });
await screens(1280, 900, 'pro-computer');
await browser.close(); server.close();
