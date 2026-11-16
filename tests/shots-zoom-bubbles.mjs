// צילומי מסך: בועות הצ'אט של יאמי, תמונת מוצר שנפתחת במסך מלא עם הגדלה, וחלון בחירת המוצר בתוך המסך.
//   OUT=תיקייה node shots-zoom-bubbles.mjs
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
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
async function run(width, height, tag, { app = false, dark = false } = {}) {
  if (ONLY && !ONLY.includes(tag)) return;
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600, ...(app ? { userAgent: APP_UA } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)|openfoodfacts/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') }); };
  await page.goto(BASE + (app ? '?source=android' : '')); await page.waitForTimeout(2200);
  if (dark) await page.evaluate(() => { state.dark = true; document.body.classList.add('dark'); });
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  await page.evaluate(() => { state.user = { name: 'יוסף', email: '', offline: true }; const l = curList(); l.name = 'ערב שבת'; l.items = []; ['חלב 3%', 'ביצים L', 'חלות'].forEach((n) => addItem(n, '')); setTab('list'); });
  await page.waitForTimeout(2500);
  // 1) הצ'אט
  await page.evaluate(() => { const n = Date.now();
    state.bot = [{ who: 'bot', txt: 'לילה טוב Yosef H! שבוע טוב ומבורך 🕯️', ts: n - 5e4 },
      { who: 'bot', txt: '🔁 הרשימה ריקה — רוצה להתחיל מהקנייה הקודמת? כתבי "קנייה קודמת"', ts: n - 4e4 },
      { who: 'me', txt: 'היי', ts: n - 3e4 },
      { who: 'bot', txt: 'היי Yosef H! 😊\nבמה אפשר לעזור? 😊', ts: n - 2e4 }]; save();
    try { closeSheet(); } catch (e) {} document.querySelectorAll('.flash').forEach((e) => e.classList.remove('show'));
    if (!document.documentElement.classList.contains('r2d')) openBot(); else renderBot(); document.activeElement && document.activeElement.blur(); });
  await shot('1-yami');
  const bub = await page.evaluate(() => { const b = document.querySelector('#botMsgs .row.bot .bub'), m = document.querySelector('#botMsgs .row.me .bub'); const cb = getComputedStyle(b);
    return { bot: cb.backgroundColor, border: cb.borderTopWidth + ' ' + cb.borderTopStyle, me: getComputedStyle(m).backgroundColor, sheet: getComputedStyle(document.querySelector('#botMsgs')).backgroundColor }; });
  ok(bub.border.startsWith('1px solid') && bub.bot !== bub.me, tag + ': ליאמי בועה עם מסגרת ' + JSON.stringify(bub));
  await page.evaluate(() => { try { closeBot(); } catch (e) {} const s = document.querySelector('#botSheet'); if (s && !document.documentElement.classList.contains('r2d')) s.classList.remove('open'); });
  // 2) תמונה בתוצאות חיפוש
  const IMG = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 400; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 400);
    g.fillStyle = '#1565c0'; g.fillRect(90, 60, 220, 290); g.fillStyle = '#fff'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.fillText('חלב', 200, 180); g.font = '30px sans-serif'; g.fillText('3% · 1 ליטר', 200, 240); return c.toDataURL('image/png'); });
  await page.evaluate((img) => { myProd = Object.assign(typeof myProd === 'object' && myProd || {}, { zt: { barcode: '7290000000017', image: img } }); setTab('prices'); }, IMG);
  await page.waitForTimeout(600);
  await page.evaluate(() => { let r = document.querySelector('#srvRes'); if (!r || !r.offsetParent) { r = document.createElement('div'); r.id = 'srvRes'; r.className = 'card'; r.style.cssText = 'margin:12px'; (document.querySelector('#paneprices,#panePrices,main') || document.body).prepend(r); }
    r.innerHTML = '<h3>🔎 תוצאות חיפוש: חלב</h3><div class="merow">' + pkThumb53('7290000000017', 'חלב 3% 1 ליטר', 'חלב') + '<span class="grow">חלב 3% 1 ליטר<small>תנובה · 6.90 ₪</small></span></div>'; r.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(800);
  ok(await page.$('#srvRes .pkth.ph img'), tag + ': תמונת מוצר נטענה בתוצאות');
  await shot('2-search');
  await page.click('#srvRes .pkth.ph'); await page.waitForTimeout(300);
  ok(await page.isVisible('#zv'), tag + ': לחיצה פותחת את התמונה במסך מלא');
  await shot('3-zoom');
  if (width < 600) { await page.touchscreen.tap(width / 2, height / 2); await page.waitForTimeout(80); await page.touchscreen.tap(width / 2, height / 2); } else { await page.mouse.move(width / 2 + 40, height / 2 - 40); await page.mouse.wheel(0, -500); }
  await page.waitForTimeout(300);
  const sc = await page.evaluate(() => document.querySelector('#zv img').style.transform);
  ok(/scale\((?!1\))/.test(sc), tag + ': הגדלה עובדת (' + (width < 600 ? 'הקשה כפולה' : 'גלגלת') + ') ' + sc);
  await shot('4-zoomed');
  await page.click('#zv [data-zv="out"]'); await page.click('#zv [data-zv="out"]'); await page.click('#zv [data-zv="x"]');
  ok(!(await page.isVisible('#zv')), tag + ': כפתור הסגירה סוגר');
  // 3) חלון בחירת המוצר
  await page.evaluate(() => { setTab('list'); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const it = curList().items.find((i) => /חלב/.test(i.n)) || curList().items[0];
    const ps = [['לחם E-FREE כוסמין 750ג', 'מאפית ברון', 14.7, 21.9], ['לחם כוסמין+חיטה מלא 750ג', '', 14.4, 22.9], ['לחם בסגנון אמריקה 500 גר', '', 12.9, 20.9], ['לחם הארץ 100% כוסמין 500ג', 'א.א.נ ברמן בע"מ', 12.9, 21.9], ['לחם שיפון מלא 750ג', '', 13.5, 19.9]]
      .map((a, i) => ({ code: '72900000001' + i, name: a[0], manufacturer: a[1], min: a[2], max: a[3], stores: 500 + i * 100, chains: 19 + i }));
    pkCard53(it, ps); });
  await page.waitForTimeout(500);
  const pk = await page.evaluate(() => { const r = document.querySelector('#pk53').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: innerHeight }; });
  ok(pk.top >= 0 && pk.bottom <= pk.h, tag + ': חלון בחירת המוצר בתוך המסך ' + JSON.stringify(pk));
  await shot('5-product-picker');
  // 4) מונה המחוברים ליד כפתור השיתוף
  await page.evaluate(() => { document.querySelector('#pk53').hidden = true; const b = document.querySelector('#stats16'); document.querySelector('#st16on').textContent = '3'; document.querySelector('#st16us').textContent = '1,240'; b.hidden = false; });
  const st = await page.evaluate(() => { const b = document.querySelector('#stats16'), cs = getComputedStyle(b); const r = b.getBoundingClientRect(); return { color: cs.color, bg: cs.backgroundColor, w: r.width }; });
  ok(st.w > 0 && st.color !== 'rgb(255, 255, 255)', tag + ': המונה ליד השיתוף נראה ' + JSON.stringify(st));
  await page.screenshot({ path: path.join(OUT, tag + '-6-header.png'), clip: { x: 0, y: 0, width, height: 110 } });
  // 5) הגדרות — גלילה עד הסוף
  await page.evaluate(() => document.querySelector('#btnMenu').click()); await page.waitForTimeout(500);
  await page.evaluate(() => { const m = document.querySelector('#hMenu'); m.scrollTop = m.scrollHeight; }); await page.waitForTimeout(300);
  const last = await page.evaluate(() => { const m = document.querySelector('#hMenu'); const vis = [...m.querySelectorAll('button')].filter((b) => b.offsetParent && !b.closest('details:not([open]) .mgbody')); const b = vis[vis.length - 1];
    const r = b.getBoundingClientRect(); const bars = [...document.querySelectorAll('.tabs,nav,#bb52,[class*=bottom]')].filter((e) => e.offsetParent && getComputedStyle(e).position === 'fixed').map((e) => e.getBoundingClientRect().top);
    const limit = Math.min(innerHeight, ...bars.filter((t) => t > innerHeight / 2)); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { txt: b.textContent.trim().slice(0, 20), bottom: Math.round(r.bottom), limit: Math.round(limit), onTop: !!(hit && (hit === b || b.contains(hit))) }; });
  ok(last.bottom <= last.limit && last.onTop, tag + ': בהגדרות גוללים עד הכפתור האחרון ' + JSON.stringify(last));
  await shot('7-settings-bottom');
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run(390, 844, 'phone');
await run(390, 844, 'app', { app: true });
await run(1366, 860, 'computer');
await run(1366, 860, 'computer-dark', { dark: true });
await run(390, 844, 'app-dark', { app: true, dark: true });
await browser.close(); server.close();
