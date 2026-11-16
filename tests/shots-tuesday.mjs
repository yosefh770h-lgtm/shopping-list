// צילומי מסך + בדיקה מהירה: הסניפים שלי, יאמי עונה על מחירים מהשרת, ראש מסך מסודר, מוצרים מהירים בלי ✕
//   CHROMIUM=... OUT=תיקייה node shots-tuesday.mjs
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
  { store: '1:39', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'בני ברק', address: 'השומר 4', city: 'בני ברק' },
  { store: '2:202', chain: 'SHUFERSAL', chain_name: 'שופרסל', name: 'דיל בני ברק', address: "ז'בוטינסקי 80", city: 'בני ברק' },
  { store: '3:12', chain: 'YOCHANANOF', chain_name: 'יוחננוף', name: 'בני ברק', address: 'רבי עקיבא 120', city: 'בני ברק' },
  { store: '4:7', chain: 'OSHER_AD', chain_name: 'אושר עד', name: 'בני ברק', address: 'ירושלים 50', city: 'בני ברק' }];
const P = { 'חלב': { n: 'חלב תנובה 3% 1 ליטר', p: { '1:39': 6.2, '2:202': 7.1, '3:12': 6.5, '4:7': 6.0 } }, 'במבה': { n: 'במבה 80 גרם', p: { '1:39': 4.5, '2:202': 5.2, '3:12': 4.9, '4:7': 4.4 }, deal: { '2:202': { text: '3 ב-12', min_qty: 3, price: 12 } } },
  'לחם': { n: 'לחם אחיד פרוס', p: { '1:39': 7.8, '2:202': 7.8, '3:12': 7.8 } }, 'ביצים': { n: 'ביצים L 12 יח', p: { '1:39': 13.9, '2:202': 14.5, '3:12': 13.2, '4:7': 12.9 } } };
const key = (q) => Object.keys(P).find((k) => q.includes(k));
const asked = [];
function api(u) { const pth = u.pathname.replace('/api/prices', ''); const sp = u.searchParams; asked.push(pth + '?' + sp.toString());
  if (pth === '/cities') return [{ city: 'בני ברק', stores: 4 }];
  if (pth === '/chains') return [{ chain: 'RAMI_LEVY', name: 'רמי לוי' }, { chain: 'SHUFERSAL', name: 'שופרסל' }, { chain: 'YOCHANANOF', name: 'יוחננוף' }, { chain: 'OSHER_AD', name: 'אושר עד' }];
  if (pth === '/stores') return STORES;
  if (pth === '/products') return []; // בחירת מוצר מדויק — לא נבדקת כאן
  const items = sp.get('items').split('|').map((x) => { const m = x.match(/^(.*)\*(\d+)$/); return m ? { q: m[1], qty: +m[2] } : { q: x, qty: 1 }; });
  if (pth === '/prices') { const s = STORES.find((x) => x.store === sp.get('store'));
    return { store: s, items: items.map((it) => { const k = key(it.q); const v = k && P[k].p[s.store]; return { q: it.q, qty: it.qty, matches: v ? [{ code: '1', name: P[k].n, price: v, cost: v * it.qty, regular: v * it.qty, deal: null }, { code: '2', name: P[k].n.replace(/\d.*/, '') + 'בקרטון 2 ליטר', price: v * 1.8, cost: v * 1.8, regular: v * 1.8, deal: null }] : [] }; }) }; }
  const pick = sp.get('stores') ? STORES.filter((s) => sp.get('stores').split(',').includes(s.store)) : STORES;
  const res = pick.map((s) => { let total = 0, regular = 0; const lines = items.map((it) => { const k = key(it.q); const v = k && P[k].p[s.store]; if (!v) return { q: it.q, qty: it.qty, found: false };
    const d = P[k].deal && P[k].deal[s.store]; const reg = +(v * it.qty).toFixed(2); const c = d && it.qty >= 3 ? 12 + (it.qty - 3) * v : reg; total += c; regular += reg;
    return { q: it.q, qty: it.qty, found: true, code: '1', name: P[k].n, price: v, cost: +c.toFixed(2), regular: reg, deal: d || null }; });
    return { ...s, total: +total.toFixed(2), regular: +regular.toFixed(2), found: lines.filter((l) => l.found).length, lines }; });
  res.sort((a, b) => b.found - a.found || a.total - b.total);
  return { items, stores: res, missing: items.filter((it) => !key(it.q)).map((it) => it.q) }; }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 1 });
await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await ctx.route(/\/api\/prices\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api(new URL(r.request().url()))) }));
await ctx.addInitScript(() => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, stats: { 'חלב': 9, 'לחם': 8, 'ביצים': 7, 'במבה': 6, 'עגבניות': 5 } })); localStorage.setItem('yam_tour165', '1'); });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE); await page.waitForTimeout(2000);
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
await page.evaluate(() => { applyConfig('collector', { public: true }); curList().items = []; addItem('חלב', '2'); addItem('במבה', '3'); addItem('לחם', ''); addItem('ביצים', ''); state.me = Object.assign(state.me || {}, { address: { city: 'בני ברק' } }); sessionStorage.setItem('cheapX', '1'); setTab('list'); render(); });
await page.waitForTimeout(400);
// 4. ראש המסך ושורת המוצרים המהירים
ok(!(await page.locator('#btnChat').isVisible()) && await page.locator('#btnShareSite').isVisible(), 'צ\'אט בתפריט, שתפו אותי ליד הפעמון');
ok((await page.locator('#favs .favx').count()) === 0 && (await page.locator('#favs .favedit').count()) === 1, 'מוצרים מהירים בלי ✕, עם ✏️');
await page.screenshot({ path: OUT + '/1-list-top.png' });
await page.click('#btnMenu'); await page.waitForTimeout(300);
ok(await page.locator('#miShareSite').isVisible() && await page.locator('#miChatSite').isVisible(), 'שיתוף והתכתבות בתפריט');
await page.screenshot({ path: OUT + '/2-menu.png' });
await page.click('#miShareSite'); await page.waitForTimeout(400);
ok(await page.locator('#shpop18').isVisible(), 'שיתוף האתר נפתח מהתפריט');
await page.screenshot({ path: OUT + '/3-share-from-menu.png' });
await page.evaluate(() => closeShare18());
// לחיצה ארוכה על מוצר מהיר
const n0 = await page.evaluate(() => curList().items.length);
const fav = page.locator('#favs .fav').first(); const bb = await fav.boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up(); await page.waitForTimeout(300);
ok(await page.locator('#v8Sheet.open').isVisible() && (await page.evaluate(() => curList().items.length)) === n0, 'לחיצה ארוכה פותחת עריכה ולא מוסיפה');
await page.screenshot({ path: OUT + '/4-quick-items-edit.png' });
await page.locator('#v8Sheet [data-favrm="ביצים"]').click(); await page.waitForTimeout(300);
ok(!(await page.locator('#favs [data-fav="ביצים"]').count()), 'הורדה מהשורה');
await page.evaluate(() => document.querySelector('#v8Sheet').classList.remove('open'));
await page.locator('#favs [data-fav="עגבניות"]').click(); await page.waitForTimeout(200);
ok(await page.evaluate(() => curList().items.some((i) => i.n === 'עגבניות')), 'לחיצה רגילה עדיין מוסיפה');
await page.evaluate(() => { curList().items = curList().items.filter((i) => i.n !== 'עגבניות'); render(); });
// 1+2. הסניפים שלי
await page.evaluate(() => { storesView = 'cmp'; setTab('stores'); }); await page.waitForTimeout(400);
ok(await page.locator('#myStBox').isVisible(), 'תיבת הסניפים שלי בלשונית');
await page.click('#myStAdd'); await page.waitForSelector('#myStRes [data-mystadd]');
await page.screenshot({ path: OUT + '/5-pick-branches.png', fullPage: false });
await page.locator('[data-mystadd="1:39"]').click(); await page.waitForTimeout(300);
await page.fill('#myStQ', 'חלב'); await page.click('#myStGo'); await page.waitForSelector('#myStOut .mystres1');
ok(asked.some((q) => q.startsWith('/prices') && /store=1%3A39/.test(q)), 'חיפוש בסניף אחד פונה ל-/prices?store=');
await page.locator('#myStBox').scrollIntoViewIfNeeded(); await page.screenshot({ path: OUT + '/6-search-one-branch.png' });
if (!(await page.locator('#myStRes').count())) await page.click('#myStAdd'); await page.waitForSelector('#myStRes [data-mystadd]');
await page.locator('[data-mystadd="2:202"]').click(); await page.waitForTimeout(200);
await page.waitForSelector('#myStRes [data-mystadd]');
await page.locator('[data-mystadd="3:12"]').click(); await page.waitForTimeout(200);
await page.click('#myStAdd'); await page.waitForTimeout(200);
await page.click('#myStGo'); await page.waitForSelector('#myStOut .rkrow');
ok(asked.some((q) => q.startsWith('/compare') && /stores=1%3A39%2C2%3A202%2C3%3A12/.test(q)), 'השוואת מוצר בין 3 סניפים פונה ל-/compare?stores=');
await page.locator('#myStBox').scrollIntoViewIfNeeded(); await page.screenshot({ path: OUT + '/7-compare-product.png' });
await page.click('#myStList'); await page.waitForSelector('#myStOut .mysttab');
await page.locator('#myStOut').scrollIntoViewIfNeeded(); await page.screenshot({ path: OUT + '/8-compare-basket.png' });
const t = await page.locator('#myStOut').innerText(); ok(/סה"כ/.test(t) && /רמי לוי/.test(t), 'טבלת סל מלא');
// 5. יאמי
async function ask(q) { await page.evaluate(async (q) => { await botReply(q); }, q); await page.waitForTimeout(200); return page.evaluate(() => state.bot[state.bot.length - 1].txt); }
const a1 = await ask('כמה עולה חלב?'); ok(/בני ברק/.test(a1) && /🥇/.test(a1) && /אושר עד/.test(a1), 'יאמי: כמה עולה חלב → ' + a1.split('\n')[0]);
const a2 = await ask('כמה עולה חלב ברמי לוי או בשופרסל'); await page.evaluate((x) => { window.__a2 = x; }, a2); ok(/רמי לוי/.test(a2) && /שופרסל/.test(a2) && !/אושר עד/.test(a2) && /הכי זול ברמי לוי/.test(a2), 'יאמי: השוואה בין רשתות');
const a3 = await ask('איפה הכי זול לקנות את הרשימה'); ok(/כל הרשימה/.test(a3), 'יאמי: כל הרשימה');
const a4 = await ask('כמה עולה במבה בסניפים שלי'); ok(/בחנויות שלך/.test(a4) && asked.some((q) => /stores=/.test(q)), 'יאמי: בסניפים שלי');
const a5 = await ask('כמה עולה 3 כפול 12'); ok(!/קבצי המחירים/.test(a5), 'יאמי: מחשבון לא נתפס');
await page.evaluate(() => { state.bot = state.bot.slice(-2); state.bot[0] = { who: 'me', txt: 'כמה עולה חלב ברמי לוי או בשופרסל?', ts: Date.now() }; state.bot[1].txt = window.__a2; save(); });
await page.click('#botFab'); await page.waitForTimeout(700); await page.screenshot({ path: OUT + '/9-yami-prices.png' });
fs.writeFileSync(OUT + '/yami.txt', [a1, a2, a3, a4].join('\n\n-----\n\n'));
ok(!errors.length, 'אין שגיאות: ' + errors.join(' | '));
await browser.close(); server.close();
