// קנייה מהרשימה + קבלה מאותו יום = קנייה אחת (לא חלק מהבדיקות האוטומטיות): node shots-receipt-trip.mjs <תיקייה> [index.html אחר]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = process.argv[2] || 'shots'; fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const INDEX = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'index.html');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const p = rel === 'index.html' ? INDEX : path.join(ROOT, rel);
  if ((p !== INDEX && !p.startsWith(ROOT)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n) });
const RECEIPT = (date) => ({ store: 'רמי לוי', branch: 'בני ברק', date, total: 61.7, items: [
  { name: 'חלב תנובה 3%', qty: 2, price: 6.2, total: 12.4 }, { name: 'חלות', qty: 2, price: 9.9, total: 19.8 },
  { name: 'ביצים L', qty: 1, price: 14.5, total: 14.5 }, { name: 'גבינה לבנה', qty: 3, price: 5, total: 15 }] });
async function page(order) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort());
  const items = [['a', 'חלב', '2'], ['b', 'חלות', '2'], ['c', 'ביצים', ''], ['d', 'גבינה לבנה', '3']].map(([id, n, q]) => ({ id, n, q, done: true, ts: 1 }));
  await ctx.addInitScript((st) => { localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); },
    { user: { name: 'יוסף', email: '', offline: true }, lists: [{ id: 'l1', name: 'הרשימה שלי', items, created: 1 }], active: 'l1', history: [] });
  const p = await ctx.newPage(); await p.goto(BASE); await p.waitForTimeout(2200);
  await p.evaluate(() => { document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  const finish = async () => { await p.evaluate(() => { openFinish(); document.querySelector('#finStore').value = 'רמי לוי'; document.querySelector('#finGo').click(); }); await p.waitForTimeout(400); };
  const receipt = async () => {
    await p.evaluate((R) => { openUpload('receipt'); upMode = 'receipt'; upResult = { receipt: R }; showUploadReview(); const pub = document.querySelector('#urPub'); if (pub) pub.checked = false; }, RECEIPT(await p.evaluate(() => dayKey(new Date()))));
    await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('#upConfirm').click()); await p.waitForTimeout(600);
  };
  if (order === 'list-first') { await finish(); await receipt(); } else { await receipt(); await finish(); }
  const r = await p.evaluate(() => ({ trips: state.history.length, }));
  await p.evaluate(() => { document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); openMe('purchases'); });
  await p.waitForTimeout(500);
  return { ctx, p, r };
}
for (const order of ['list-first', 'receipt-first']) {
  const { ctx, p, r } = await page(order);
  console.log(order, 'trips in history:', r.trips);
  await shot(p, (order === 'list-first' ? '1' : '2') + '-' + order + '.png');
  await ctx.close();
}
await browser.close(); server.close();
