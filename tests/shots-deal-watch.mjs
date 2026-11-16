// צילומי מסך + בדיקה: המבצעים בסניפים הקרובים פתוחים לכולם ("מחירים ← מבצעים"), גם כשהשוואת החנויות כבויה,
// ו"🔔 מעקב מבצעים" — בוחרים סניפים ומוצרים, ומבצע חדש מגיע כהתראה.
//   OUT=תיקייה [ROOT=תיקיית האתר] node shots-deal-watch.mjs
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
async function ctxFor(vp, dsf, dark) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', deviceScaleFactor: dsf, geolocation: { latitude: HERE.lat, longitude: HERE.lng }, permissions: ['geolocation'] });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.route(/nominatim|openstreetmap/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/\/api\/prices\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api(new URL(r.request().url()))) }));
  await ctx.addInitScript(([dk, here]) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, stats: {}, geo: { lat: here.lat, lng: here.lng, city: 'בני ברק', ts: Date.now(), src: 'gps' } })); localStorage.setItem('yam_tour165', '1');
    if (dk) localStorage.setItem('yamh_prefs_dark', '1'); }, [dark, HERE]);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  if (dark) await page.evaluate(() => document.body.classList.add('dark'));
  return { ctx, page, errors }; }
const hideFlash = (page) => page.evaluate(() => { const f = document.querySelector('#flash'); if (f) f.classList.remove('show'); });
async function openDeals(page) {
  await page.evaluate(() => document.querySelector('.tab[data-t=prices]').click()); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('[data-sview=feed]').click()); await page.waitForTimeout(2000); await hideFlash(page); }

async function phone(dark, tag) {
  const { ctx, page, errors } = await ctxFor({ width: 390, height: 844 }, 2, dark);
  ok(await page.evaluate(() => !srvPublic()), tag + ': השוואת החנויות כבויה (משתמש רגיל)');
  await openDeals(page);
  await page.screenshot({ path: OUT + '/' + tag + '-1-מבצעים-לידי.png' });
  ok((await page.locator('#ndBox details').count()) === 2, tag + ': במסך המבצעים — שני סניפים עם מבצעים');
  ok(/במבה 3 ב-12/.test(await page.locator('#ndBox').innerText()), tag + ': המבצע מופיע');
  ok((await page.locator('#nearMe').count()) === 0, tag + ': הכפתור הישן הוחלף');
  if (!dark) {
    await page.locator('#ndBox [data-dwopen]').last().click(); await page.waitForTimeout(800);
    ok((await page.locator('[data-dwst]').count()) === 3, 'מעקב: שלושה סניפים לבחירה');
    await page.locator('[data-dwst="3:12"]').uncheck();
    await page.locator('input[name=dwWhat][value=words]').check(); await page.fill('#dwWords', 'במבה, טחינה');
    await page.screenshot({ path: OUT + '/' + tag + '-2-מעקב-מבצעים.png' });
    await page.locator('#dwSave').click(); await page.waitForTimeout(1500);
    const n1 = await page.evaluate(() => inbox.filter((x) => x.id.startsWith('dw-')).length);
    ok(n1 === 2, 'מעקב: התראה על במבה ועל טחינה שכבר במבצע (' + n1 + ')');
    DEALS['1:39'].push(D('במבה נוגט 100 גרם', 'במבה נוגט 2 ב-10', 6.5, 2, 10, '2026-11-20'));
    DEALS['1:39'].push(D('קפה עלית 200 גרם', 'קפה ב-19.90', 25.9, 1, 19.9, '2026-11-20'));
    const n2 = await page.evaluate(async () => { await dwCheck85(true); return inbox.filter((x) => x.id.startsWith('dw-')); });
    ok(n2.length === 3 && /במבה נוגט/.test(n2[0].title) && !n2.some((x) => /קפה/.test(x.title + x.body)), 'מעקב: מבצע חדש על במבה — התראה, ועל קפה — לא');
    const n3 = await page.evaluate(async () => { await dwCheck85(true); return inbox.filter((x) => x.id.startsWith('dw-')).length; });
    ok(n3 === 3, 'מעקב: בלי כפילויות בבדיקה הבאה');
    DEALS['1:39'].splice(-2);
    await page.waitForTimeout(3500); await page.evaluate(() => openNotif()); await page.waitForTimeout(600); await hideFlash(page);
    await page.screenshot({ path: OUT + '/' + tag + '-3-התראה-בפעמון.png' });
    await page.evaluate(() => { document.querySelector('#notifOverlay').classList.remove('open'); setTab('list'); setTab('neardeals'); }); await page.waitForTimeout(800);
    ok(await page.evaluate(() => tab === 'stores' && storesView === 'feed' && !!document.querySelector('#ndBox')), 'לחיצה על ההתראה פותחת את המבצעים לידי');
    ok(/במעקב/.test(await page.locator('#ndBox .ndh').innerText()), 'הכפתור מראה "במעקב"');
    await page.evaluate(() => { applyConfig('collector', { near_deals_off: true }); renderStores(); }); await page.waitForTimeout(300);
    ok((await page.locator('#ndBox').count()) === 0, 'המנהל כיבה בבק אופיס — לא מוצג');
  }
  ok(!errors.length, tag + ': אין שגיאות JS ' + errors.join(' | '));
  await ctx.close(); }
async function computer() {
  const { ctx, page, errors } = await ctxFor({ width: 1280, height: 860 }, 1, false);
  await openDeals(page);
  await page.screenshot({ path: OUT + '/מחשב-מבצעים-לידי.png' });
  ok((await page.locator('#ndBox details').count()) === 2, 'מחשב: שני סניפים עם מבצעים');
  ok(!errors.length, 'מחשב: אין שגיאות JS ' + errors.join(' | '));
  await ctx.close(); }
async function noLocation() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(() => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, stats: {} })); localStorage.setItem('yam_tour165', '1'); });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000); await openDeals(page);
  await page.screenshot({ path: OUT + '/טלפון-בלי-מיקום.png' });
  ok((await page.locator('#ndGps').count()) === 1, 'בלי מיקום: כפתור "להראות את המבצעים לידי" (לא שואלים מיקום לבד)');
  ok(!errors.length, 'בלי מיקום: אין שגיאות JS ' + errors.join(' | '));
  await ctx.close(); }
await phone(false, 'טלפון');
await phone(true, 'כהה');
await computer();
await noLocation();
await browser.close(); server.close();
