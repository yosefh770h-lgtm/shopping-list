// צילומי מסך + בדיקה מהירה: אחרי סריקת קבלה — איפה היה יותר זול (ליד החנות שקנית וליד הבית)
//   CHROMIUM=... OUT=תיקייה node shots-receipt-cheaper.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const STORES = [
  { store: '1:39', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'בני ברק', address: 'השומר 4', city: 'בני ברק', lat: 32.09, lng: 34.83 },
  { store: '4:7', chain: 'OSHER_AD', chain_name: 'אושר עד', name: 'בני ברק', address: 'ירושלים 50', city: 'בני ברק', lat: 32.085, lng: 34.835 },
  { store: '2:202', chain: 'SHUFERSAL', chain_name: 'שופרסל', brand: 'דיל', name: 'בני ברק', address: "ז'בוטינסקי 80", city: 'בני ברק', lat: 32.092, lng: 34.828 },
  { store: '3:12', chain: 'YOCHANANOF', chain_name: 'יוחננוף', name: 'בני ברק', address: 'רבי עקיבא 120', city: 'בני ברק', lat: 32.08, lng: 34.84 }];
const P = { 'חלב': { n: 'חלב תנובה 3% 1 ליטר', p: { '1:39': 6.2, '2:202': 7.1, '3:12': 6.5, '4:7': 5.9 } }, 'במבה': { n: 'במבה 80 גרם', p: { '1:39': 4.5, '2:202': 5.2, '3:12': 4.9, '4:7': 4.4 }, deal: { '2:202': { text: '3 ב-12', min_qty: 3, price: 12 } } },
  'לחם': { n: 'לחם אחיד פרוס', p: { '1:39': 7.8, '2:202': 7.8, '3:12': 7.8 } }, 'ביצים': { n: 'ביצים L 12 יח', p: { '1:39': 13.9, '2:202': 14.5, '3:12': 13.2, '4:7': 12.9 } },
  'עגבניות': { n: 'עגבניות שרי (לק"ג)', p: { '1:39': 9.9, '2:202': 12.9, '3:12': 8.9, '4:7': 9.5 } } };
const key = (q) => Object.keys(P).find((k) => q.includes(k));
const asked = [];
function api(u) { const pth = u.pathname.replace('/api/prices', ''); const sp = u.searchParams; asked.push(pth + '?' + sp.toString());
  if (pth === '/cities') return [{ city: 'בני ברק', stores: 4 }];
  if (pth === '/stores') return [STORES[0]];
  if (pth === '/products') return []; // בחירת מוצר מדויק — לא נבדקת כאן
  const items = sp.get('items').split('|').map((x) => { const m = x.match(/^(.*)\*(\d+(?:\.\d+)?)$/); return m ? { q: m[1], qty: +m[2] } : { q: x, qty: 1 }; });
  const pick = sp.get('stores') ? STORES.filter((s) => sp.get('stores').split(',').includes(s.store)) : STORES;
  const res = pick.map((s, i) => { let total = 0, regular = 0; const lines = items.map((it) => { const k = key(it.q); const v = k && P[k].p[s.store]; if (!v) return { q: it.q, qty: it.qty, found: false };
    const d = P[k].deal && P[k].deal[s.store]; const reg = +(v * it.qty).toFixed(2); const c = d && it.qty >= 3 ? 12 + (it.qty - 3) * v : reg; total += c; regular += reg;
    return { q: it.q, qty: it.qty, found: true, code: '1', name: P[k].n, price: v, cost: +c.toFixed(2), regular: reg, deal: d || null }; });
    return { ...s, km: sp.get('lat') ? [0, 0.6, 0.4, 1.3][i] : undefined, total: +total.toFixed(2), regular: +regular.toFixed(2), found: lines.filter((l) => l.found).length, lines }; });
  res.sort((a, b) => b.found - a.found || a.total - b.total);
  return { items, stores: res, missing: items.filter((it) => !key(it.q)).map((it) => it.q) }; }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 2 });
await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await ctx.route(/\/api\/prices\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api(new URL(r.request().url()))) }));
await ctx.addInitScript(() => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, history: [] })); localStorage.setItem('yam_tour165', '1'); });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE); await page.waitForTimeout(2000);
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
await page.evaluate(() => { applyConfig('collector', { public: true }); window.isAdmin = () => true; // כמו משתמש מחובר: בלי מונה החיפושים לניסיון
 state.me = Object.assign(state.me || {}, { address: { city: 'בני ברק' } });
  document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
// הקבלה: חלב עם ברקוד שאין בשרת (מחפשים לפי השם), עגבניות במשקל, וגבינה שאין בשרת בכלל
const R = { store: 'רמי לוי', branch: 'בני ברק', total: 72.36, items: [
  { name: 'חלב תנובה 3%', qty: 2, price: 6.9, total: 13.8, barcode: '7290000000001' }, { name: 'במבה אסם', qty: 3, price: 5, total: 15 },
  { name: 'ביצים L', qty: 1, price: 14.5, total: 14.5 }, { name: 'לחם אחיד', qty: 1, price: 7.8, total: 7.8 },
  { name: 'עגבניות שרי', qty: 1.2, price: 10.9, total: 13.08 }, { name: 'גבינה צפתית', qty: 1, price: 8.18, total: 8.18 }] };
await page.evaluate((r) => { r.date = dayKey(new Date()); openUpload('receipt'); upMode = 'receipt'; upResult = { receipt: r }; showUploadReview(); document.querySelector('#urPub').checked = false; }, R);
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('#upConfirm').click()); await page.waitForTimeout(1800);
ok(await page.locator('#basketOverlay.open #rcxRes').isVisible(), 'אחרי אישור הקבלה נפתח "איפה היה יותר זול"');
const best = await page.locator('.rcxbest').innerText();
ok(best.includes('אושר עד'), 'הכי משתלם ליד החנות: אושר עד — ' + best.replace(/\s+/g, ' '));
ok(asked.some((a) => a.startsWith('/stores?')) && asked.some((a) => a.startsWith('/compare?') && a.includes('lat=')), 'מחפשים את הסניף שקנית בו ומשווים לסניפים שלידו');
ok(asked.some((a) => a.startsWith('/compare?') && a.includes('stores=') && decodeURIComponent(a).includes('חלב')), 'ברקוד שאין בשרת — מחפשים שוב לפי השם');
ok((await page.locator('#rcxRes').innerText()).includes('גבינה צפתית'), 'מוצר שלא נמצא מופיע ב"לא מצאנו"');
const h = await page.evaluate(() => state.history[0]); ok(h.receipt && h.branch === 'בני ברק', 'הסניף נשמר בקנייה');
await page.screenshot({ path: OUT + '/1-after-receipt-near-store.png' });
await page.evaluate(() => { const b = document.querySelector('#basketBody'); b.scrollTop = b.scrollHeight; }); await page.waitForTimeout(200);
await page.screenshot({ path: OUT + '/2-per-item-and-branches.png' });
await page.locator('#rcxRes details.srvSt').first().locator('summary').click(); await page.waitForTimeout(200);
await page.locator('#rcxRes details.srvSt').first().scrollIntoViewIfNeeded();
await page.screenshot({ path: OUT + '/3-branch-details.png' });
await page.click('[data-rcx="home"]'); await page.waitForTimeout(600);
ok(asked.some((a) => a.startsWith('/compare?') && new URLSearchParams(a.split('?')[1]).get('city') === 'בני ברק'), 'ליד הבית: לפי העיר של המשתמש');
await page.evaluate(() => { document.querySelector('#basketBody').scrollTop = 0; });
await page.screenshot({ path: OUT + '/4-near-home.png' });
await page.click('#btnCloseBasket');
await page.evaluate(() => openMe('purchases')); await page.waitForTimeout(400);
ok(await page.locator('#meBody [data-purcheap]').isVisible(), 'ב"הקניות שלי" יש כפתור "איפה היה יותר זול?" לקבלה');
await page.screenshot({ path: OUT + '/5-my-purchases-button.png' });
await page.click('#meBody [data-purcheap]'); await page.waitForTimeout(900);
ok(await page.locator('#basketOverlay.open .rcxbest').isVisible(), 'הכפתור פותח את ההשוואה מחדש');
// משתמש רגיל כשההשוואה עדיין במצב בדיקה — לא נפתח כלום
await page.evaluate(() => { document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); applyConfig('collector', { public: false }); window.isAdmin = () => false; });
ok(!(await page.evaluate(() => rcxCan(state.history[0]))), 'כשההשוואה כבויה למשתמשים — לא מוצג');
ok(!errors.length, 'אין שגיאות JS ' + errors.join(' | '));
await browser.close(); server.close();
