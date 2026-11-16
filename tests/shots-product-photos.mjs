// צילומי מסך + בדיקה: 📷 תמונות מוצרים שצילמנו בעצמנו — תמונה מאושרת מוצגת בבחירת המוצר, כפתור צילום למוצר שנבחר, ומסך אישור בבק אופיס.
// Supabase מדומה בתוך הדף (בלי רשת).   OUT=תיקייה node shots-product-photos.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const PRODUCTS = [
  { code: '7290004131074', name: 'חלב טרי 3% בקרטון תנובה 1 ליטר', manufacturer: 'תנובה', stores: 1460, chains: 12, min: 6.5, median: 6.8, max: 7.1 },
  { code: '7290004127701', name: 'חלב תנובה 3% בשקית 1 ליטר', manufacturer: 'תנובה', stores: 1408, chains: 12, min: 5.2, median: 5.6, max: 5.9 },
  { code: '7290004126384', name: 'חלב טרי 3% בבקבוק תנובה 2 ליטר', manufacturer: 'תנובה', stores: 1696, chains: 12, min: 12.4, median: 12.6, max: 12.9 }];
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' });
await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)|openfoodfacts/, (r) => r.abort());
await ctx.route(/\/api\/prices\//, (r) => { const u = new URL(r.request().url()); const b = u.pathname.endsWith('/products') ? PRODUCTS : u.pathname.endsWith('/cities') ? [] : { items: [], stores: [], missing: [] };
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) }); });
await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, stats: {} })); localStorage.setItem('yam_tour165', '1'); });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE); await page.waitForTimeout(2000);
// תמונה "מצולמת" לדוגמה (קרטון חלב מצויר), ו-Supabase מדומה: טבלת product_photos בזיכרון
const photo = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 200; c.height = 200; const x = c.getContext('2d');
  x.fillStyle = '#f4f8fc'; x.fillRect(0, 0, 200, 200); x.fillStyle = '#fff'; x.strokeStyle = '#1565c0'; x.lineWidth = 6;
  x.beginPath(); x.moveTo(60, 60); x.lineTo(100, 25); x.lineTo(140, 60); x.lineTo(140, 185); x.lineTo(60, 185); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#1565c0'; x.fillRect(68, 95, 64, 40); x.fillStyle = '#fff'; x.font = 'bold 22px Arial'; x.textAlign = 'center'; x.fillText('3%', 100, 123); return c.toDataURL('image/jpeg', .85); });
await page.evaluate((photo) => {
  window.__rows = [
    { id: '1', barcode: '7290004131074', name: 'חלב טרי 3% בקרטון תנובה 1 ליטר', image: photo, status: 'approved', credit: 'יוסי ל.', created_at: new Date().toISOString() },
    { id: '2', barcode: '7290004126384', name: 'חלב טרי 3% בבקבוק תנובה 2 ליטר', image: photo, status: 'pending', created_at: new Date().toISOString() }];
  const q = (t) => { const f = []; let upd = null, ins = null; const o = {
    select() { return o; }, order() { return o; }, limit() { return o; }, maybeSingle() { return o; },
    eq(k, v) { f.push((r) => r[k] === v); return o; }, in(k, v) { f.push((r) => v.includes(r[k])); return o; },
    insert(v) { ins = v; return o; }, update(v) { upd = v; return o; }, upsert() { return o; }, delete() { return o; }, gt() { return o; }, gte() { return o; }, lt() { return o; }, neq() { return o; }, is() { return o; }, or() { return o; }, single() { return o; }, range() { return o; },
    then(res) { if (t !== 'product_photos') return res({ data: [], error: null });
      if (ins) { window.__rows.push(Object.assign({ id: String(window.__rows.length + 1), status: 'pending', created_at: new Date().toISOString() }, ins)); return res({ data: null, error: null }); }
      const rows = window.__rows.filter((r) => f.every((fn) => fn(r)));
      if (upd) { rows.forEach((r) => { if (upd.status === 'approved') window.__rows.forEach((x) => { if (x.barcode === r.barcode && x.status === 'approved') x.status = 'rejected'; }); Object.assign(r, upd); }); return res({ data: null, error: null }); }
      return res({ data: rows.map((r) => ({ ...r })), error: null }); } }; return o; };
  sb = { from: q, rpc: () => q('x'), auth: { getSession: async () => ({ data: {} }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {} };
  authUser = { id: 'u1', email: 'a@x.com' };
  applyConfig('collector', { public: true }); curList().items = []; state.splitPref = { a: ['n', 'n'] }; sessionStorage.setItem('cheapX', '1'); setTab('list'); render(); }, photo);
await page.fill('#inText', 'חלב תנובה'); await page.evaluate(() => { const b = document.querySelector('#smartAc'); if (b) b.hidden = true; }); await page.click('#btnSend'); await page.waitForTimeout(1500);
ok(await page.locator('#pk53').isVisible(), 'חלון בחירת המוצר נפתח');
ok((await page.locator('#pk53 [data-pkcode="7290004131074"] .pkimg img').getAttribute('src') || '').startsWith('data:image/jpeg'), 'תמונה שצילמנו ואושרה מוצגת');
ok((await page.locator('#pk53 [data-pkcode="7290004126384"] .pkart').count()) === 1, 'תמונה שממתינה לאישור לא מוצגת — במקומה הכרטיס המעוצב');
ok((await page.locator('#pk53 [data-pkby="7290004131074"]').textContent()).includes('יוסי ל.'), 'הקרדיט של המצלם מוצג מתחת למוצר');
ok(!(await page.locator('#pk53 .pkcred').isVisible()), 'אין קרדיט ל-Open Food Facts כשאין תמונה משם');
await page.screenshot({ path: OUT + '/photos-1-picker-own-photo.png' });
await page.click('#pk53 [data-pkcode="7290004127701"]'); await page.waitForTimeout(500);
await page.click('.pk53ch'); await page.waitForTimeout(900);
ok(await page.locator('#v8SheetBody [data-pksnap]').isVisible(), 'כפתור "צלמו אותו" למוצר שנבחר');
await page.screenshot({ path: OUT + '/photos-2-snap-button.png' });
// מצלמים (בוחרים קובץ) — נשלח לאישור
const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#v8SheetBody [data-pksnap]')]);
const buf = Buffer.from(photo.split(',')[1], 'base64'); await chooser.setFiles({ name: 'milk.jpg', mimeType: 'image/jpeg', buffer: buf }); await page.waitForTimeout(600);
ok(await page.locator('.uid30 .u30msg').isVisible() && (await page.locator('.uid30 .u30msg').textContent()).includes('קרדיט'), 'שואלים אם רוצים קרדיט על התמונה');
await page.screenshot({ path: OUT + '/photos-4-ask-credit.png' });
await page.click('.uid30 .u30ok'); await page.waitForTimeout(400);
await page.fill('.uid30 input', 'צילום: משפחת כהן');
await page.screenshot({ path: OUT + '/photos-5-credit-text.png' });
await page.click('.uid30 .u30ok'); await page.waitForTimeout(800);
const sent = await page.evaluate(() => window.__rows.find((r) => r.barcode === '7290004127701'));
ok(sent && sent.status === 'pending' && sent.image.startsWith('data:image/jpeg'), 'הצילום נשלח וממתין לאישור');
ok(sent && sent.credit === 'צילום: משפחת כהן', 'הקרדיט שהמצלם ביקש נשמר');
await page.evaluate(() => closeSheet());
// בבק אופיס: אישור
await page.evaluate(() => { isAdmin = () => true; isStaff = () => true; document.querySelector('#bo').classList.remove('hidden'); document.querySelectorAll('#boNav button').forEach((b) => { b.hidden = false; }); window.boShow('pphotos'); });
await page.waitForTimeout(800);
ok((await page.locator('.pp53c').count()) === 2, 'בבק אופיס: 2 תמונות ממתינות');
ok((await page.locator('.pp53').textContent()).includes('קרדיט: צילום: משפחת כהן'), 'בבק אופיס רואים איזה קרדיט ביקשו');
await page.screenshot({ path: OUT + '/photos-3-backoffice-approve.png' });
await page.locator('[data-ppok]').first().click(); await page.waitForTimeout(600);
ok((await page.evaluate(() => window.__rows.filter((r) => r.status === 'approved').length)) === 2, 'אישור — התמונה מאושרת');
await page.evaluate(() => { document.querySelector('#bo').classList.add('hidden'); loadRepScores = async () => { repScores = { u1: { score: 9, reports: 0, confirms: 0, bonus: 0, photos: 3 } }; }; openMe('rep'); });
await page.waitForTimeout(800);
ok((await page.locator('#meBody').textContent()).includes('תמונות שאושרו'), 'במוניטין שלי: כמה תמונות אושרו, ו-3 מוניטין לכל תמונה');
await page.screenshot({ path: OUT + '/photos-6-reputation.png' });
ok(!errors.length, 'אין שגיאות JS ' + errors.join(' | '));
await browser.close(); server.close();
