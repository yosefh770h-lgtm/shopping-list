// "הבית שלי" → "יש בבית": מראה את כל מה שיש בבית, גם מוצרים שלא בקטלוג (מקבלה, מסיום קנייה, ממכשיר אחר)
//   cd tests && node shots-home-have-all.mjs   (SHOTS=תיקייה לצילומי מסך)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.SHOTS || '';
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? '✅ ' : '❌ ') + m); };
// 14 מוצרים: חלק מהקטלוג, חלק שנכנסו מקבלה/סיום קנייה ואינם בקטלוג, ואחד עם קטגוריה ישנה שלא קיימת
const NAMES = ['חלב', 'לחם', 'ביצים', 'גבינה', 'שוקולד', 'קפה', 'תה', 'אורז', 'קמח', 'סוכר',
  'במבה נוגט 60 גרם', 'שמפו תפוח ירוק 750', 'טונה בשמן זית 4 יח', 'מוצר עם קטגוריה ישנה'];
const STATE = { user: { name: 'בודק', email: '', offline: true }, homeView: 'have',
  pantry: Object.fromEntries(NAMES.map((n) => [n, true])), stock: Object.fromEntries(NAMES.map((n) => [n, { q: 1, ts: 1 }])),
  missingHome: [], customPantry: [], lists: [{ id: 'l1', name: 'רשימה', items: [] }], active: 'l1',
  myProd: { 'מוצר עם קטגוריה ישנה': { category: 'קטגוריה שנמחקה' } } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const browser2 = browser;
for (const n of [14, 8]) { // גם מעל 12 (תצוגה לפי קטגוריות) וגם עד 12 (תצוגה רצופה)
  const st = Object.assign({}, STATE, { pantry: Object.fromEntries(NAMES.slice(-n).map((x) => [x, true])) });
  const ctx = await browser2.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: OUT ? 2 : 1 });
  await ctx.route(/supabase\.(co|js)|fonts\.(googleapis|gstatic)|\/api\/prices\//, (r) => r.abort());
  await ctx.addInitScript((s) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify(s)); localStorage.setItem('yam_tour165', '1'); }, st);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate(() => { document.querySelectorAll('.overlay.open,.qp15.open').forEach((o) => o.classList.remove('open')); state.homeView = 'have'; document.querySelector('.tab[data-t=home]').click(); });
  await page.waitForTimeout(500);
  const total = await page.evaluate(() => pantryCount());
  const shown = await page.locator('#paneHome #homeCats .pcard').count();
  ok(total === n && shown === n, n + ' מוצרים: "יש בבית" מראה ' + shown + ' מתוך ' + total);
  await page.click('#paneHome [data-h72sel]'); await page.waitForTimeout(300);
  ok(await page.locator('#paneHome [data-h72p]').count() === shown, n + ' מוצרים: אותו מספר כמו ב"בחירה ומחיקה"');
  await page.click('#paneHome [data-h72x]'); await page.waitForTimeout(300);
  if (n === 14) await (OUT ? page.screenshot({ path: path.join(OUT, 'יש-בבית-הכל.png'), fullPage: true }) : null);
  ok(!errors.length, 'בלי שגיאות: ' + errors.join(' | '));
  await ctx.close(); }
await browser.close(); server.close();
console.log(fails.length ? '\n' + fails.length + ' נכשלו' : '\nהכל עבר');
process.exit(fails.length ? 1 : 0);
