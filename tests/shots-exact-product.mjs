// צילומי מסך + בדיקה: בחירת מוצר מדויק לפני השוואת המחירים ("חלב תנובה" ← קרטון 1 ליטר, ולא שקית בסניף אחד ובקבוק 2 ליטר בסניף אחר)
//   OUT=תיקייה [ROOT=תיקיית האתר] [BEFORE=1] node shots-exact-product.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = process.env.ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const BEFORE = !!process.env.BEFORE;
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const STORES = [
  { store: '1:39', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'בני ברק', address: 'השומר 4', city: 'בני ברק' },
  { store: '2:202', chain: 'SHUFERSAL', chain_name: 'שופרסל', name: 'דיל בני ברק', address: "ז'בוטינסקי 80", city: 'בני ברק' },
  { store: '3:12', chain: 'YOCHANANOF', chain_name: 'יוחננוף', name: 'בני ברק', address: 'רבי עקיבא 100', city: 'בני ברק' }];
// המוצרים של "חלב תנובה" בקבצי הרשתות, והמחיר בכל סניף
const MILK = {
  '7290004131074': { name: 'חלב טרי 3% בקרטון תנובה 1 ליטר', p: { '1:39': 6.5, '2:202': 7.1, '3:12': 6.8 } },
  '7290004127701': { name: 'חלב תנובה 3% בשקית 1 ליטר', p: { '1:39': 5.2, '2:202': 5.9, '3:12': 5.6 } },
  '7290004126384': { name: 'חלב טרי 3% בבקבוק תנובה 2 ליטר', p: { '1:39': 12.4, '2:202': 12.9, '3:12': 12.6 } },
  '7290004131081': { name: 'חלב טרי 1% בקרטון תנובה 1 ליטר', p: { '1:39': 6.5, '2:202': 7.1, '3:12': 6.9 } } };
// בלי בחירה — כל סניף מתאים את "חלב תנובה" למוצר אחר (כך זה נראה היום)
const MIXED = { '1:39': '7290004127701', '2:202': '7290004126384', '3:12': '7290004131074' };
const BAMBA = { name: 'במבה אסם 80 גרם', p: { '1:39': 4.9, '2:202': 5.9, '3:12': 5.5 } };
function api(u) { const pth = u.pathname.replace('/api/prices', ''); const sp = u.searchParams;
  if (pth === '/cities') return [{ city: 'בני ברק', stores: 3 }];
  if (pth === '/chains') return [{ chain: 'RAMI_LEVY', name: 'רמי לוי' }, { chain: 'SHUFERSAL', name: 'שופרסל' }, { chain: 'YOCHANANOF', name: 'יוחננוף' }];
  if (pth === '/stores') return STORES;
  if (pth === '/products') { if (BEFORE) return null; if (!/חלב/.test(sp.get('q'))) return [];
    return Object.entries(MILK).map(([code, m]) => { const v = Object.values(m.p); return { code, name: m.name, manufacturer: 'תנובה', stores: 1200 + v[0] * 40 | 0, chains: 12, min: Math.min(...v), median: v[1], max: Math.max(...v) }; }); }
  const items = sp.get('items').split('|').map((raw) => { const [q0, qty = '1'] = raw.split('*'); const [q, code] = q0.split('#'); return { q, qty: +qty, ...(code ? { code } : {}) }; });
  const res = STORES.map((s) => { let total = 0; const lines = items.map((it) => {
    const m = /במבה/.test(it.q) ? BAMBA : /חלב/.test(it.q) ? MILK[it.code || MIXED[s.store]] : null; const v = m && m.p[s.store];
    if (!v) return { q: it.q, qty: it.qty, found: false }; total += v * it.qty;
    return { q: it.q, qty: it.qty, found: true, code: it.code || '1', name: m.name, price: v, cost: v * it.qty, regular: v * it.qty, deal: null }; });
    return { ...s, total: +total.toFixed(2), regular: +total.toFixed(2), found: lines.filter((l) => l.found).length, lines }; });
  res.sort((a, b) => b.found - a.found || a.total - b.total);
  return { items, stores: res, missing: [] }; }
// תמונות לדוגמה במקום Open Food Facts (בצילום בלבד): קרטון, שקית ובקבוק. למוצר האחרון אין תמונה — רואים את האימוג'י
const svg = (body) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/>' + body + '</svg>';
const IMGS = {
  '7290004131074': svg('<path d="M30 25 L50 10 L70 25 V92 H30 Z" fill="#e8f1fb" stroke="#1565c0" stroke-width="3"/><rect x="34" y="45" width="32" height="22" fill="#1565c0"/><text x="50" y="61" font-size="12" fill="#fff" text-anchor="middle" font-family="Arial">3%</text><text x="50" y="84" font-size="10" fill="#1565c0" text-anchor="middle" font-family="Arial">1L</text>'),
  '7290004127701': svg('<path d="M28 18 H72 L78 90 Q50 98 22 90 Z" fill="#eef6ff" stroke="#1e88e5" stroke-width="3"/><rect x="32" y="40" width="36" height="20" rx="4" fill="#1e88e5"/><text x="50" y="55" font-size="12" fill="#fff" text-anchor="middle" font-family="Arial">3%</text>'),
  '7290004126384': svg('<path d="M42 8 H58 V20 Q72 30 72 45 V92 H28 V45 Q28 30 42 20 Z" fill="#f4f9ff" stroke="#0d47a1" stroke-width="3"/><rect x="30" y="52" width="40" height="20" fill="#0d47a1"/><text x="50" y="67" font-size="11" fill="#fff" text-anchor="middle" font-family="Arial">2L</text>') };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
async function run(vp, tag) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', deviceScaleFactor: 1 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.route(/\/api\/prices\//, (r) => { const b = api(new URL(r.request().url())); return b === null ? r.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"Not Found"}' }) : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) }); });
  await ctx.route(/world\.openfoodfacts\.org/, (r) => { const code = (r.request().url().match(/product\/(\d+)/) || [])[1];
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(IMGS[code] ? { status: 1, product: { product_name_he: MILK[code].name, brands: 'תנובה', image_front_small_url: 'https://images.openfoodfacts.org/images/products/' + code + '/front.200.jpg' } } : { status: 0 }) }); });
  await ctx.route(/images\.openfoodfacts\.org/, (r) => { const code = (r.request().url().match(/products\/(\d+)/) || [])[1]; return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: IMGS[code] || svg('') }); });
  await ctx.addInitScript(() => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, stats: {} })); localStorage.setItem('yam_tour165', '1'); });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate(() => { applyConfig('collector', { public: true }); curList().items = []; state.splitPref = { a: ['n', 'n'] }; state.me = Object.assign(state.me || {}, { address: { city: 'בני ברק' } }); sessionStorage.setItem('cheapX', '1'); setTab('list'); render(); });
  const type = async (t) => { await page.fill('#inText', t); await page.evaluate(() => { const b = document.querySelector('#smartAc'); if (b) b.hidden = true; }); await page.click('#btnSend'); await page.waitForTimeout(700); };
  const basket = async (file) => { await page.evaluate(() => openBasket()); await page.waitForTimeout(1200);
    await page.locator('#srvRes details').evaluateAll((ds) => ds.forEach((d) => { d.open = true; })); await page.waitForTimeout(200);
    await page.locator('#srvCmp').evaluate((e) => e.scrollIntoView()); await page.waitForTimeout(2600); await page.evaluate(() => document.querySelector('#flash').classList.remove('show')); await page.screenshot({ path: OUT + '/' + file }); };
  await type('במבה');
  await type('חלב תנובה');
  if (BEFORE) {
    await basket(tag + '-before-compare.png');
    const txt = await page.locator('#srvRes').textContent();
    ok(txt.includes('בשקית') && txt.includes('2 ליטר'), tag + ': לפני — כל סניף משווה מוצר אחר');
  } else {
    ok(await page.locator('#pk53').isVisible(), tag + ': אחרי שכתבו "חלב תנובה" — מוצגים מוצרים לבחירה');
    ok((await page.locator('#pk53 .pkp').count()) === 4, tag + ': 4 מוצרים לבחירה');
    await page.waitForTimeout(500);
    ok((await page.locator('#pk53 .pkimg img').count()) === 3, tag + ': תמונה קטנה למוצרים שיש להם, אימוג\'י לשאר');
    ok(await page.locator('#pk53 .pkcred').isVisible(), tag + ': קרדיט ל-Open Food Facts מתחת לתמונות');
    ok((await page.locator('#pk53 .pkart').count()) === 1 && (await page.locator('#pk53 .pkart .pksz').textContent()) === '1 ליטר', tag + ': מוצר בלי תמונה — כרטיס מעוצב עם הגודל');
    await page.screenshot({ path: OUT + '/' + tag + '-1-pick-product.png' });
    await page.click('#pk53 [data-pkcode="7290004131074"]'); await page.waitForTimeout(700);
    const it = await page.evaluate(() => curList().items.find((i) => i.n === 'חלב תנובה'));
    ok(it.bc === '7290004131074' && it.bn.includes('קרטון'), tag + ': הברקוד נשמר בפריט');
    ok(await page.locator('.pk53ch').first().isVisible(), tag + ': המוצר שנבחר מופיע ברשימה');
    await page.screenshot({ path: OUT + '/' + tag + '-2-list-with-choice.png' });
    await basket(tag + '-3-compare-same-product.png');
    const txt = await page.locator('#srvRes').textContent();
    ok(!txt.includes('בשקית') && !txt.includes('2 ליטר') && (txt.match(/בקרטון/g) || []).length >= 3, tag + ': אחרי — אותו מוצר בכל הסניפים');
    await page.evaluate(() => document.querySelector('#basketOverlay').classList.remove('open'));
    if (tag === 'phone') {
      await page.click('.pk53ch'); await page.waitForTimeout(900);
      ok(await page.locator('#v8SheetBody [data-pkclear]').isVisible(), 'לחיצה על המוצר ברשימה — אפשר לשנות או לבטל');
      await page.screenshot({ path: OUT + '/' + tag + '-4-change-choice.png' });
      await page.click('#v8SheetBody [data-pkclear]'); await page.waitForTimeout(400);
      ok(!(await page.evaluate(() => curList().items.find((i) => i.n === 'חלב תנובה').bc)), 'ביטול הבחירה');
      // בפעם הבאה שכותבים את אותו שם — הבחירה הקודמת נבחרת לבד (אחרי בחירה מחדש)
      await page.evaluate(() => { state.pick53 = { [norm('חלב תנובה')]: { bc: '7290004131074', bn: 'חלב טרי 3% בקרטון תנובה 1 ליטר' } }; curList().items = []; render(); });
      await type('חלב תנובה');
      ok(!(await page.locator('#pk53').isVisible()) && (await page.evaluate(() => curList().items[0].bc)) === '7290004131074', 'בפעם הבאה — נבחר לבד כמו בפעם הקודמת');
      // אודות ← קרדיטים ומקורות
      await page.evaluate(() => openAbout()); await page.waitForTimeout(400);
      await page.locator('#aboutBody .cred53').evaluate((d) => { d.open = true; d.scrollIntoView(); });
      ok((await page.locator('#aboutBody .cred53').textContent()).includes('Open Food Facts'), 'באודות: קרדיטים ומקורות');
      await page.screenshot({ path: OUT + '/' + tag + '-5-about-credits.png' });
    }
  }
  ok(!errors.length, tag + ': אין שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run({ width: 390, height: 844 }, 'phone');
await run({ width: 1280, height: 800 }, 'computer');
await browser.close(); server.close();
