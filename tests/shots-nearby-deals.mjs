// צילומי מסך + בדיקה: "חנויות ומבצעים קרובים" מראה את המבצעים האמיתיים בסניפים הקרובים (מקבצי המבצעים של הרשתות)
//   OUT=תיקייה [ROOT=תיקיית האתר] node shots-nearby-deals.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = process.env.ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const HERE = { lat: 32.0849, lng: 34.8338 };
const STORES = [
  { store: '1:39', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'בני ברק', address: 'השומר 4', city: 'בני ברק', lat: 32.0868, lng: 34.8352, km: 0.3 },
  { store: '2:202', chain: 'SHUFERSAL', chain_name: 'שופרסל דיל', name: 'דיל בני ברק', address: "ז'בוטינסקי 80", city: 'בני ברק', lat: 32.0921, lng: 34.8301, km: 0.9 },
  { store: '3:12', chain: 'YOCHANANOF', chain_name: 'יוחננוף', name: 'בני ברק', address: 'רבי עקיבא 100', city: 'בני ברק', lat: 32.0801, lng: 34.8402, km: 0.8 }];
const D = (name, text, price, qty, dp, until, more = 0) => { const regular = +(price * qty).toFixed(2), save = +(regular - dp).toFixed(2);
  return { code: '7290000' + Math.random().toString().slice(2, 8), name, price, qty, deal_price: dp, regular, save, pct: Math.round(100 * save / regular), text, until, more }; };
const DEALS = {
  '1:39': [D('במבה אסם 80 גרם', 'במבה 3 ב-12', 5.9, 3, 12, '2026-11-14'), D('קוטג׳ תנובה 5% 250 גרם', 'קוטג׳ 2 ב-9.90', 6.2, 2, 9.9, '2026-11-12', 1),
    D('שמן קנולה עץ הזית 1 ליטר', 'שמן ב-9.90', 13.9, 1, 9.9, '2026-11-20'), D('פסטה אסם ספגטי 500 גרם', '4 ב-15', 5.5, 4, 15, '', 6)],
  '2:202': [D('חלב טרי 3% תנובה 1 ליטר', '2 ב-12', 7.1, 2, 12, '2026-11-11'), D('טחינה הנסיך 500 גרם', 'טחינה ב-12.90', 17.9, 1, 12.9, '2026-11-18')],
  '3:12': [] };
function api(u) { const pth = u.pathname.replace('/api/prices', '');
  if (pth === '/chains') return STORES.map((s) => ({ chain: s.chain, name: s.chain_name }));
  if (pth === '/stores') return STORES;
  if (pth === '/deals') return { stores: u.searchParams.get('stores').split(',').map((k) => ({ store: STORES.find((s) => s.store === k), deals: DEALS[k] || [] })) };
  return []; }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
async function run(vp, tag, dsf, dark) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', deviceScaleFactor: dsf, geolocation: { latitude: HERE.lat, longitude: HERE.lng }, permissions: ['geolocation'] });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.route(/nominatim|openstreetmap/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/\/api\/prices\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api(new URL(r.request().url()))) }));
  await ctx.addInitScript((dk) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, stats: {}, nearMode: 'gps' })); localStorage.setItem('yam_tour165', '1');
    if (dk) localStorage.setItem('yamh_prefs_dark', '1'); }, dark);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((dk) => { applyConfig('collector', { public: true }); state.nearMode = 'gps'; window.fillBranchPos = async () => 0; if (dk) { document.body.classList.add('dark'); } }, dark);
  await page.evaluate(() => openNearMe({ mode: 'gps' })); await page.waitForTimeout(2500);
  await page.evaluate(() => { const f = document.querySelector('#flash'); if (f) f.classList.remove('show'); });
  await page.screenshot({ path: OUT + '/' + tag + '.png' });
  ok((await page.locator('#nmDeals details').count()) === 2, tag + ': שני סניפים עם מבצעים (בלי הסניף שאין בו)');
  ok((await page.locator('#nmDeals details[open] .merow').count()) === 4, tag + ': הסניף הקרוב פתוח עם 4 מבצעים');
  ok(/במבה 3 ב-12/.test(await page.locator('#nmDeals').innerText()), tag + ': תיאור המבצע מופיע');
  ok(!errors.length, tag + ': אין שגיאות JS ' + errors.join(' | '));
  await ctx.close(); }
await run({ width: 390, height: 844 }, '1-מבצעים-קרובים-טלפון', 2, false);
await run({ width: 1280, height: 860 }, '2-מבצעים-קרובים-מחשב', 1, false);
await run({ width: 390, height: 844 }, '3-מצב-כהה', 2, true);
await browser.close(); server.close();
