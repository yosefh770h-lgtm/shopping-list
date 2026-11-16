// בדיקה + צילומי מסך: פריט עם מוצר מדויק שנבחר (pk53ch) בטלפון צר באפליקציה — השם לא נדחס לאות אחת בשורה, והמוצר יורד לשורה משלו.
// וגם: רשימת ההשלמה שנפתחת למעלה לא מכסה את הכותרת.
//   OUT=תיקייה node shots-item-chip-narrow.mjs
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
async function run(width, height, tag, { dark = false, zoom = 1, noHas = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: APP_UA });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)|openfoodfacts/, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('yam_tour165', '1'); });
  // WebView ישן (Chrome < 105) לא מכיר :has() — כל כלל CSS שמשתמש בו פשוט נזרק. מדמים את זה כדי לוודא שהתיקון לא תלוי בו
  if (noHas) await ctx.route(/index\.html/, async (r) => { const res = await r.fetch(); const b = (await res.text()).replace(/:has\(/g, ':nohas('); return r.fulfill({ response: res, body: b }); });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2200);
  if (zoom !== 1) await page.addStyleTag({ content: 'html{-webkit-text-size-adjust:' + zoom * 100 + '%!important}' });
  await page.evaluate((d) => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open'));
    if (d) document.body.classList.add('dark');
    state.user = { name: 'בודק', email: '', offline: true }; curList().items = []; addItem('חלב תנובה', ''); addItem('לחם', '');
    const i = curList().items.find((x) => x.n === 'חלב תנובה'); i.bc = '7290004131074'; i.bq = i.n; i.bn = 'חלב בקרטון 3% שומן 1 ל'; setTab('list'); render(); }, dark);
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => { const ch = document.querySelector('#paneList .pk53ch'); if (!ch) return null; const row = ch.closest('.bub'); const nm = row.querySelector('.nm');
    const n = nm.getBoundingClientRect(), c = ch.getBoundingClientRect(); return { nmW: n.width, nmH: n.height, lh: parseFloat(getComputedStyle(nm).lineHeight) || parseFloat(getComputedStyle(nm).fontSize) * 1.5, chipBelow: c.top >= n.bottom - 2, chipIn: c.right <= row.getBoundingClientRect().right + 1 && c.left >= row.getBoundingClientRect().left - 1 }; });
  ok(m, tag + ': המוצר המדויק מוצג מתחת לפריט');
  ok(m && m.nmW > 80 && m.nmH < m.lh * 2.2, tag + ': שם הפריט לא נדחס (רוחב ' + Math.round(m && m.nmW) + 'px, גובה ' + Math.round(m && m.nmH) + 'px)');
  ok(m && m.chipBelow && m.chipIn, tag + ': המוצר המדויק בשורה משלו ובתוך הכרטיס');
  await page.locator('#paneList .pk53ch').scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, tag + '-1-פריט-עם-מוצר-מדויק.png') });
  // רשימת ההשלמה: מקלדת פתוחה = מסך נמוך, השדה למטה, הרשימה נפתחת למעלה
  await page.setViewportSize({ width, height: 400 }); await page.waitForTimeout(300);
  await page.locator('#inText').scrollIntoViewIfNeeded(); await page.focus('#inText'); await page.keyboard.type('חל'); await page.waitForTimeout(500);
  const a = await page.evaluate(() => { const b = document.querySelector('#smartAc'); const h = document.querySelector('.app>header'); if (!b || b.hidden) return null; return { top: b.getBoundingClientRect().top, hb: h ? h.getBoundingClientRect().bottom : 0 }; });
  ok(a && a.top >= a.hb - 1, tag + ': רשימת ההשלמה לא מכסה את הכותרת' + (a ? ' (' + Math.round(a.top) + ' ≥ ' + Math.round(a.hb) + ')' : ''));
  await page.screenshot({ path: path.join(OUT, tag + '-2-השלמה-לא-מכסה-כותרת.png') });
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run(360, 780, 'טלפון-צר');
await run(360, 780, 'טלפון-צר-אות-גדולה', { zoom: 1.3 });
await run(390, 844, 'טלפון-כהה', { dark: true });
await run(360, 780, 'אנדרואיד-ישן-בלי-has', { noHas: true });
await browser.close(); server.close();
