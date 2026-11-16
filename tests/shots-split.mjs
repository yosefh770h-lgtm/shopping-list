// צילומי מסך + בדיקה: "חומוס טחינה וחלב" מתחלק ל-3 מוצרים (שואלים בהתחלה, אחר כך זוכרים), סיגריות / מסכת פנים בהשוואה, ואתר ההזמנות של הרשת 🌐
//   CHROMIUM=... OUT=תיקייה node shots-split.mjs
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
  { store: '2:413', chain: 'SHUFERSAL', chain_name: 'שופרסל', name: 'שופרסל ONLINE', address: 'מרכז הפצה', city: 'מודיעין', online: true }];
const P = { 'סיגריות': { n: 'מרלבורו גולד 20 יח', p: { '1:39': 39.9, '2:202': 41, '2:413': 40.5 } }, 'מסכות פנים': { n: 'מסכות פנים חד פעמיות 50 יח', p: { '1:39': 14.9, '2:202': 12.9, '2:413': 11.9 } },
  'חלב': { n: 'חלב תנובה 3% 1 ליטר', p: { '1:39': 6.2, '2:202': 7.1, '2:413': 6.9 } } };
const key = (q) => Object.keys(P).find((k) => q.includes(k));
function api(u) { const pth = u.pathname.replace('/api/prices', ''); const sp = u.searchParams;
  if (pth === '/cities') return [{ city: 'בני ברק', stores: 3 }];
  if (pth === '/chains') return [{ chain: 'RAMI_LEVY', name: 'רמי לוי' }, { chain: 'SHUFERSAL', name: 'שופרסל' }];
  if (pth === '/stores') return STORES;
  if (pth === '/products') return []; // בחירת מוצר מדויק — לא נבדקת כאן
  const items = sp.get('items').split('|').map((q) => ({ q, qty: 1 }));
  const res = STORES.map((s) => { let total = 0; const lines = items.map((it) => { const k = key(it.q); const v = k && P[k].p[s.store]; if (!v) return { q: it.q, qty: 1, found: false }; total += v;
    return { q: it.q, qty: 1, found: true, code: '1', name: P[k].n, price: v, cost: v, regular: v, deal: null }; });
    return { ...s, total: +total.toFixed(2), regular: +total.toFixed(2), found: lines.filter((l) => l.found).length, lines }; });
  res.sort((a, b) => b.found - a.found || a.total - b.total);
  return { items, stores: res, missing: [] }; }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 1 });
await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await ctx.route(/\/api\/prices\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api(new URL(r.request().url()))) }));
await ctx.addInitScript(() => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, stats: {} })); localStorage.setItem('yam_tour165', '1'); });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE); await page.waitForTimeout(2000);
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
await page.evaluate(() => { applyConfig('collector', { public: true }); curList().items = []; state.splitPref = { a: [] }; state.me = Object.assign(state.me || {}, { address: { city: 'בני ברק' } }); sessionStorage.setItem('cheapX', '1'); setTab('list'); render(); });
const names = () => page.evaluate(() => curList().items.map((i) => i.n));
const type = async (t) => { await page.fill('#inText', t); await page.evaluate(() => { const b = document.querySelector('#smartAc'); if (b) b.hidden = true; }); await page.click('#btnSend'); await page.waitForTimeout(350); };
// 1. פעם ראשונה — שואלים
await type('חומוס טחינה וחלב');
ok(await page.locator('#split56').isVisible(), 'שואלים אם לחלק "חומוס טחינה וחלב"');
ok((await page.locator('#split56 .chips span').count()) === 3, '3 מוצרים בהצעה');
await page.screenshot({ path: OUT + '/1-ask-split.png' });
await page.click('[data-s56="y"]'); await page.waitForTimeout(300);
ok(JSON.stringify(await names()) === JSON.stringify(['חומוס', 'טחינה', 'חלב']), 'נוספו 3 מוצרים נפרדים');
await page.screenshot({ path: OUT + '/2-after-split.png' });
// שם מוצר מוכר לא מתפרק, ופקודות לא נתפסות
await type('גבינה צהובה'); ok(!(await page.locator('#split56').isVisible()) && (await names()).includes('גבינה צהובה'), '"גבינה צהובה" נשאר מוצר אחד');
await type('שמן זית'); ok(!(await page.locator('#split56').isVisible()) && (await names()).includes('שמן זית'), '"שמן זית" נשאר מוצר אחד');
// 2. פעם שנייה — שואלים שוב, ואחרי שתי תשובות "כן" זוכרים
await type('במבה ביסלי'); ok(await page.locator('#split56').isVisible(), 'פעם שנייה — שואלים שוב');
await page.click('[data-s56="y"]'); await page.waitForTimeout(300);
await type('קטשופ מיונז חרדל');
const auto = await names();
ok(!(await page.locator('#split56').isVisible()) && ['קטשופ', 'מיונז', 'חרדל'].every((n) => auto.includes(n)), 'פעם שלישית — מחלקים לבד בלי לשאול');
ok(await page.locator('#undoBox.show').isVisible(), 'יש "ביטול" אחרי חלוקה אוטומטית');
await page.screenshot({ path: OUT + '/3-auto-split-undo.png' });
await page.click('#undoBtn'); await page.waitForTimeout(400);
await page.evaluate(() => closeSheet()); const after = await names();
ok(!after.includes('חרדל') && after.some((n) => /קטשופ מיונז/.test(n) || n === 'קטשופ מיונז חרדל'), 'ביטול מחזיר את מה שכתבו כשורה אחת: ' + after.slice(-1));
// 3. מי שבחר פעמיים "להשאיר" — לא שואלים ולא מחלקים
await page.evaluate(() => { state.splitPref = { a: ['n', 'n'] }; curList().items = []; render(); });
await type('עגבניות מלפפונים'); ok(!(await page.locator('#split56').isVisible()) && (await names()).length === 1, 'מי שבחר "להשאיר" — נשאר שורה אחת');
await page.waitForTimeout(800); await page.evaluate(() => closeSheet());
// 4. סיגריות ומסכת פנים בהשוואה, עם אתר ההזמנות 🌐
await page.evaluate(() => { curList().items = []; state.splitPref = { a: [] }; render(); });
await type('סיגריות'); await type('מסכת פנים');
ok(JSON.stringify(await names()) === JSON.stringify(['סיגריות', 'מסכות פנים']), '"מסכת פנים" נרשם כ"מסכות פנים"');
await page.evaluate(() => openBasket()); await page.waitForTimeout(1200);
ok((await page.locator('#srvRes').textContent()).includes('שופרסל ONLINE'), 'אתר ההזמנות של שופרסל בהשוואה');
ok((await page.locator('#srvRes').textContent()).includes('משלוח'), 'כתוב "הזמנה באתר — משלוח עד הבית"');
await page.locator('#srvRes details').first().evaluate((d) => { d.open = true; });
await page.screenshot({ path: OUT + '/4-compare-online.png' });
ok(!errors.length, 'אין שגיאות JS ' + errors.join(' | '));
await browser.close(); server.close();
