// צילומי מסך + בדיקה מהירה: 💰 תקציב הבית (באזור האישי, מהתפריט ומיאמי), מסונכרן עם הקניות והקבלות
//   CHROMIUM=... OUT=תיקייה node shots-budget.mjs
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
const D = 864e5, now = new Date(), day = (n) => new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - n), 12).getTime();
const prevM = (k, d) => new Date(now.getFullYear(), now.getMonth() - k, d, 12).getTime();
const HIST = [
  { ts: day(0), listName: 'קבלה', by: 'בודק', store: 'רמי לוי', receipt: true, total: 412.6, items: [{ n: 'חלב', q: '4', price: 6.2 }, { n: 'לחם', q: '2', price: 7.8 }] },
  { ts: day(2), listName: 'הרשימה שלי', by: 'בודק', store: 'אושר עד', items: [{ n: 'ביצים', q: '2' }, { n: 'עגבניות', q: '' }] },
  { ts: day(4), listName: 'קבלה', by: 'בודק', store: 'סופר-פארם', receipt: true, items: [{ n: 'שמפו', q: '1', price: 24.9 }, { n: 'טיטולים', q: '2', price: 49.9 }] },
  { ts: prevM(1, 10), listName: 'קבלה', store: 'שופרסל', receipt: true, total: 1630, items: [{ n: 'עוף', q: '3', price: 30 }] },
  { ts: prevM(2, 12), listName: 'קבלה', store: 'יוחננוף', receipt: true, total: 1480, items: [{ n: 'בשר', q: '1', price: 90 }] }];
async function run(width, height, tag, dark) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript((h) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, history: h })); localStorage.setItem('yam_tour165', '1'); }, HIST);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((dk) => { document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); if (dk) document.body.classList.add('dark'); }, dark);
  const shot = async (n) => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') }); };
  // 1. התפריט ⚙️ — "תקציב הבית"
  ok(await page.evaluate(() => !!document.querySelector('#miBudget50')), tag + ': יש "תקציב הבית" בתפריט');
  // 2. בלי תקציב: כבר רואים כמה הוצאתם (מהקבלות)
  await page.evaluate(() => openBudget()); await page.waitForTimeout(300);
  ok(await page.locator('#meSeg [data-metab="budget"].on').isVisible(), tag + ': לשונית "תקציב הבית" באזור האישי');
  const spent0 = await page.locator('.bd50big').innerText();
  ok(/537.3/.test(spent0.replace(/[,\s]/g, '')), tag + ': הקבלות של החודש נספרות לבד (412.6 + 124.7 = 537.3) — ' + spent0);
  await shot('1-set-budget');
  // 3. קובעים תקציב, מוסיפים הוצאה ידנית והוצאה קבועה
  await page.fill('#bdLimit', '3000'); await page.click('[data-bd="setlimit"]');
  await page.fill('#bdAmt', '320'); await page.fill('#bdNote', 'חשמל'); await page.click('[data-bdcat="bills"]'); await page.click('[data-bd="add"]');
  await page.evaluate(() => { document.querySelector('#meBody details.bd50more:last-of-type') && (document.querySelectorAll('#meBody details.bd50more').forEach((d) => d.open = true)); });
  await page.fill('#bdFxN', 'ארנונה'); await page.fill('#bdFxA', '450'); await page.click('[data-bd="fxadd"]');
  // 4. קנייה בלי סכום — כותבים כמה יצא
  await page.locator('#meBody [data-bdpay]').first().fill('186'); await page.locator('#meBody [data-bd="pay"]').first().click();
  const st = await page.evaluate(() => ({ b: state.budget, sync: SYNC_KEYS.includes('budget') }));
  ok(st.b.limit === 3000 && st.b.exp.length === 1 && st.b.exp[0].cat === 'bills' && st.b.fixed.length === 1, tag + ': התקציב, ההוצאה וההוצאה הקבועה נשמרו');
  ok(st.sync, tag + ': התקציב מסונכרן עם הרשימות המשפחתיות');
  const left = await page.locator('.bd50big').innerText();
  ok(/1,?506.7/.test(left), tag + ': נשאר 3000 − (537.3 + 186 + 320 + 450) = 1,506.7 — ' + left);
  await page.evaluate(() => document.querySelector('#meBody').scrollTo(0, 0)); await shot('2-budget-top');
  await page.click('[data-bd="cat"][data-c="super"]'); await page.waitForTimeout(200);
  await page.evaluate(() => { const c = document.querySelector('#meBody .bd50cat'); c && c.scrollIntoView({ block: 'start' }); }); await shot('3-categories');
  await page.evaluate(() => { const c = document.querySelectorAll('#meBody .mecard')[3]; c && c.scrollIntoView({ block: 'start' }); }); await shot('4-expenses');
  await page.evaluate(() => { const c = document.querySelector('#meBody .bd50bars'); c && c.scrollIntoView({ block: 'center' }); }); await shot('5-fixed-and-months');
  // 5. יאמי: "הוצאתי 120 על נעליים"
  await page.evaluate(() => document.querySelector('#meOverlay').classList.remove('open'));
  const said = await page.evaluate(async () => { for (const f of YAMI_STEPS) { const r = await f('הוצאתי 120 על נעליים לילד'); if (r) break; } return state.bot.slice(-1)[0].txt; });
  ok(said.includes('120') && said.includes('ביגוד'), tag + ': יאמי רושמת הוצאה וממיינת לביגוד — ' + said.replace(/\n/g, ' '));
  await page.evaluate(() => document.querySelector('#meOverlay').classList.remove('open'));
  // 6. אזור אישי: אריח, ו"הקניות שלי": שורת סיכום
  await page.evaluate(() => openMe('info')); await page.waitForTimeout(250);
  ok(await page.locator('#meBody .bd50tile').isVisible(), tag + ': אריח "תקציב הבית" בדף הראשי של האזור האישי');
  await shot('6-profile-tile');
  await page.evaluate(() => openMe('purchases')); await page.waitForTimeout(250);
  ok(await page.locator('#meBody .bd50strip').isVisible(), tag + ': ב"הקניות שלי" — כמה הוצאתם החודש');
  // 7. סיום קנייה — "כמה יצא בקופה?"
  await page.evaluate(() => { document.querySelector('#meOverlay').classList.remove('open'); const l = curList(); l.items.push({ id: uid(), n: 'חלב', q: '', done: true, ts: Date.now() }); finishList(true, { store: 'ויקטורי' }); });
  await page.waitForTimeout(1200);
  ok(await page.locator('#bdAsk').isVisible(), tag + ': אחרי סיום קנייה שואלים כמה יצא בקופה');
  await shot('7-after-finish');
  await page.fill('#bdAskV', '58'); await page.click('#bdAskOk');
  ok(await page.evaluate(() => state.budget.paid[String(state.history[0].ts)].a === 58), tag + ': הסכום נשמר לקנייה');
  // 8. סנכרון: הוצאה ממכשיר אחר מתאחדת, מחיקה לא חוזרת
  const merged = await page.evaluate(() => { const r = JSON.parse(JSON.stringify(state.budget)); r.exp.push({ id: 'other1', ts: Date.now(), amt: 50, cat: 'tz', note: 'צדקה', mt: Date.now() }); state.budget.exp[0].del = true; state.budget.exp[0].mt = Date.now() + 5;
    applyRemote({ budget: r }, false); return { n: state.budget.exp.filter((x) => !x.del).length, other: state.budget.exp.some((x) => x.id === 'other1') }; });
  ok(merged.other && merged.n === 2, tag + ': הוצאה ממכשיר אחר נוספת, ומחיקה אצלי לא חוזרת מהענן');
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run(390, 844, 'phone');
await run(1280, 860, 'computer');
await run(390, 844, 'dark', true);
await browser.close(); server.close();
