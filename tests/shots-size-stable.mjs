// צילומי מסך + בדיקה: גודל הכתב והאייקונים לא "קופץ" כשגוללים או כשהמקלדת נפתחת.
// הגובה של החלון משתנה (שורת הכתובת נעלמת / מקלדת) — הגודל נשאר כמו שהיה, כי הוא נקבע לפי מסך המכשיר.
//   OUT=תיקייה CHROMIUM=/path/chrome node shots-size-stable.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', css: 'text/css', svg: 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/2.0';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
const TAB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

const DEVICES = [
  // שם, רוחב, גובה מסך, גובה החלון (בלי שורת כתובת/פסים), סוג
  ['phone-360x640', 360, 640, 560, 'phone', 's'],
  ['phone-375x667', 375, 667, 600, 'phone', 's'],
  ['phone-360x800', 360, 800, 700, 'phone', 's'],
  ['phone-393x852', 393, 852, 760, 'phone', ''],
  ['phone-412x915', 412, 915, 820, 'phone', ''],
  ['tablet-800x1280', 800, 1280, 1180, 'tab', ''],
  ['computer-1366x768', 1366, 768, 660, 'pc', ''],
];
const sizes = () => { const r = document.documentElement; const q = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontSize + '@' + (getComputedStyle(document.querySelector('.app')).zoom) : '-'; };
  return (r.className.match(/sz66-\w+/) || ['normal'])[0] + ' | ' + q('#paneList .row .name, #paneList .row') + ' | ' + q('header h1, header .brand, header'); };

for (const app of [false, true]) for (const [name, w, sh, vh, kind, expect] of DEVICES) {
  if (app && kind === 'pc') continue;
  const mobile = kind !== 'pc';
  const ctx = await browser.newContext({ viewport: { width: w, height: vh }, screen: { width: w, height: sh }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: kind === 'phone', hasTouch: mobile,
    userAgent: app ? APP_UA : kind === 'phone' ? MOB_UA : kind === 'tab' ? TAB_UA : undefined });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('yam_tour165', '1'); } catch (e) {} });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2200);
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open'));
    state.user = { name: 'בודק', email: '', offline: true }; curList().items = [];
    ['חלב 3%', 'לחם אחיד', 'ביצים L', 'עגבניות', 'גבינה לבנה', 'אורז', 'שמן זית', 'תפוחים', 'מלפפונים', 'קפה', 'סוכר', 'טחינה', 'פסטה', 'קמח', 'שוקו'].forEach((n) => addItem(n, '')); setTab('list'); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { document.querySelectorAll('.overlay.open,.sheet.open').forEach((e) => e.classList.remove('open')); document.querySelectorAll('.qp15').forEach((e) => e.remove()); });
  await page.waitForTimeout(300);
  const tag = (app ? 'app-' : 'site-') + name;
  const s0 = await page.evaluate(sizes);
  ok(s0.startsWith(expect ? 'sz66-' + expect : 'normal'), tag + ': גודל אוטומטי ' + s0);
  // גלילה: שורת הכתובת נעלמת (+56), ומקלדת נפתחת (-300 / -45%)
  const seen = new Set([s0]);
  for (const h of [vh + 56, vh, Math.round(vh * 0.55), vh - 300 > 200 ? vh - 300 : vh, vh + 56]) {
    await page.setViewportSize({ width: w, height: h }); await page.mouse.wheel(0, 400); await page.waitForTimeout(350); seen.add(await page.evaluate(sizes));
  }
  await page.setViewportSize({ width: w, height: vh }); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  ok(seen.size === 1, tag + ': הגודל לא משתנה בגלילה ובפתיחת מקלדת ' + [...seen].join(' / '));
  if (['phone-360x640', 'phone-412x915', 'tablet-800x1280', 'computer-1366x768'].includes(name)) {
    await page.screenshot({ path: path.join(OUT, tag + '-1-רשימה.png') });
    await page.evaluate(() => { try { setTab('prices'); } catch (e) {} }); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, tag + '-2-מחירים.png') });
    await page.evaluate(() => { try { setTab('list'); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); openView66(); } catch (e) {} }); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, tag + '-3-גודל-תצוגה.png') });
  }
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await browser.close(); server.close();
