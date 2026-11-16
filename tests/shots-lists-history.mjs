// צילומי מסך + בדיקה: "הרשימות שלי" במחשב — הרשימה הנוכחית מקופלת ונפתחת בלחיצה, ומתחתיה "היסטוריית הרשימות" לפי תאריך
//   OUT=תיקייה node shots-lists-history.mjs
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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const day = (n) => Date.now() - n * 864e5;
const it = (id, e, n, q, done) => ({ id, e, n, q, done: !!done, ts: day(0) });
const LISTS = [{ id: 'l1', name: 'קניות לשבת', items: [it('a', '🥛', 'חלב', '3'), it('b', '🍞', 'חלה', '2', true), it('c', '🥚', 'ביצים', '1'), it('d', '🍗', 'עוף', '2'), it('e', '🍷', 'מיץ ענבים', '1'), it('f', '🥒', 'מלפפונים', '6')] }];
const HIST = [
  { ts: day(3), listName: 'קניות לשבת', store: 'אושר עד', items: [{ n: 'חלב', q: '2', e: '🥛' }, { n: 'חלה', q: '2', e: '🍞' }, { n: 'דגים', q: '1', e: '🐟' }, { n: 'עגבניות', q: '', e: '🍅' }] },
  { ts: day(10), listName: 'סופר באמצע השבוע', store: 'רמי לוי', items: [{ n: 'אורז', q: '2', e: '🍚' }, { n: 'פסטה', q: '3', e: '🍝' }, { n: 'שמן', q: '1', e: '🫒' }] },
  { ts: day(17), listName: 'קניות לשבת', store: 'שופרסל', items: [{ n: 'עוף', q: '2', e: '🍗' }, { n: 'קוגל', q: '1', e: '🥔' }] },
  { ts: day(24), listName: 'ניקיון', store: '', items: [{ n: 'סבון כלים', q: '1', e: '🧴' }, { n: 'נייר טואלט', q: '1', e: '🧻' }] }];
async function run(dark) {
  const tag = dark ? 'dark' : 'light';
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL', deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(([l, h]) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, lists: l, active: 'l1', history: h })); localStorage.setItem('yam_tour165', '1'); }, [LISTS, HIST]);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2500);
  await page.evaluate((dk) => { document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); if (dk) document.body.classList.add('dark'); }, dark);
  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  const side = page.locator('#r2side');
  ok(await side.isVisible(), tag + ': יש עמודת "הרשימות שלי"');
  ok(await side.locator('.r2its').count() === 0, tag + ': הרשימה הנוכחית מקופלת — רק השם');
  ok(/היסטוריית הרשימות/.test(await side.innerText()), tag + ': יש כותרת "היסטוריית הרשימות"');
  const names = await side.locator('[data-r2hx] b').allInnerTexts();
  ok(names.length === 4 && /אושר עד/.test(names[0]) && /ניקיון/.test(names[3]), tag + ': ההיסטוריה מסודרת מהחדשה לישנה, עם תאריך');
  if (!dark) await shot('1-מקופל');
  await side.locator('[data-r2cur]').click();
  ok(await side.locator('.r2its li').count() === 6, tag + ': לחיצה על הרשימה הנוכחית פותחת את כל הפריטים');
  if (!dark) await shot('2-הרשימה-הנוכחית-פתוחה');
  await side.locator('[data-r2cur]').click();
  await side.locator('[data-r2hx]').nth(1).click();
  ok(/אורז/.test(await side.locator('.r2its').innerText()), tag + ': לחיצה על רשימה מההיסטוריה פותחת אותה');
  await shot(dark ? '4-מצב-כהה' : '3-רשימה-מההיסטוריה-פתוחה');
  ok(!errors.length, tag + ': בלי שגיאות ' + errors.join(' | '));
  await ctx.close();
}
await run(false); await run(true);
await browser.close(); server.close();
