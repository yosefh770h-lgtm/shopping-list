// קבלה ↔ קנייה: בוחרים לאיזו קנייה הקבלה שייכת, עורכים/מוחקים את הסכום, ומחברים קבלה לקנייה — בלי כפילות בהוצאות
//   OUT=תיקייה node shots-receipt-link.mjs
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
const now = new Date(), D = 864e5;
const at = (n, h) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 12); return d.getTime() - n * D; };
const dk = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// קנייה מהרשימה מאתמול בערב (כתבו לה 230 ₪), וקנייה ישנה יותר
const T1 = at(1, 19), T2 = at(5, 11), R0 = at(0, 9);
const HIST = [
  { ts: R0, listName: 'קבלה', by: 'בודק', store: 'שופרסל דיל', receipt: true, uploadedAt: R0, total: 228.4, items: [{ n: 'חלב', q: '4', price: 6.2 }, { n: 'קולה', q: '2', price: 7.9 }, { n: 'חלות', q: '2', price: 9.9 }] },
  { ts: T1, listName: 'הרשימה שלי', by: 'בודק', store: 'שופרסל', items: [{ n: 'חלב', q: '4' }, { n: 'קולה', q: '2' }, { n: 'חלות', q: '2' }] },
  { ts: T2, listName: 'לשבת', by: 'בודק', store: 'אושר עד', items: [{ n: 'עוף', q: '2' }, { n: 'אורז', q: '1' }] }];
const RECEIPT = { store: 'אושר עד', branch: 'בני ברק', date: dk(T2 + D), total: 96.5, items: [{ name: 'עוף שלם', qty: 2, price: 38, total: 76 }, { name: 'אורז פרסי 1 ק"ג', qty: 1, price: 20.5, total: 20.5 }] };
async function run(width, height, tag, dark) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(([h, t1]) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, history: h, budget: { paid: { [String(t1)]: { a: 230, c: '', mt: Date.now() } } } })); localStorage.setItem('yam_tour165', '1'); }, [HIST, T1]);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2200);
  await page.evaluate((d) => { document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); if (d) document.body.classList.add('dark'); }, dark);
  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') }); };
  const spent = () => page.evaluate(() => { const m = new Date(); let s = 0; state.history.forEach((h) => { const d = new Date(h.ts); if (d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()) s += bdApi.tripAmt(h); }); return Math.round(s * 100) / 100; });
  const sameMonth = new Date(T2).getMonth() === now.getMonth() && new Date(R0).getMonth() === now.getMonth();
  if (sameMonth) ok(Math.abs(await spent() - (228.4 + 230)) < 0.01, tag + ': לפני — הקבלה והקנייה נספרות פעמיים (228.4 + 230)');
  // 1. "הקניות שלי": כל קנייה עם הסכום, וסימון "אולי נספרה פעמיים"
  await page.evaluate(() => openMe('purchases')); await page.waitForTimeout(400);
  ok(await page.locator('#meBody .tr90warn').count() === 2, tag + ': הקבלה והקנייה מאותם ימים מסומנות "אולי נספרה פעמיים"');
  ok(await page.locator('#meBody .tr90amt').count() === 3, tag + ': ליד כל קנייה רואים כמה יצאה');
  await shot('1-הקניות-שלי');
  // 2. חיבור: מהקבלה בוחרים את הקנייה מאתמול
  await page.locator('#meBody .tr90warn').first().click(); await page.waitForTimeout(300);
  ok(await page.locator('#tr90 [data-trlink]').count() >= 1, tag + ': בחלון הקנייה — רשימת קניות לחיבור');
  await shot('2-חיבור-קבלה-לקנייה');
  page.once('dialog', (d) => d.accept());
  await page.locator('#tr90 [data-trlink="' + T1 + '"]').click(); await page.waitForTimeout(300);
  if (await page.locator('.uiq-ok, #uiOk, [data-uiok]').count()) await page.locator('.uiq-ok, #uiOk, [data-uiok]').first().click();
  else await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && /^(אישור|כן|OK)/.test(x.textContent.trim())); b && b.click(); });
  await page.waitForTimeout(500);
  const m = await page.evaluate((t1) => { const t = state.history.find((h) => h.ts === t1); return { n: state.history.length, linked: !!(t && t.linked && t.receipt), items: t && t.items.length, list: t && t.listItems && t.listItems.length, amt: t && bdApi.tripAmt(t), links: (state.histLinks || []).length }; }, T1);
  ok(m.n === 2 && m.linked && m.items === 3 && m.list === 3, tag + ': אחרי החיבור — קנייה אחת עם המוצרים מהקבלה ומהרשימה');
  ok(Math.abs(m.amt - 228.4) < 0.01, tag + ': הסכום נלקח מהקבלה (228.4), לא 230 ולא שניהם — ' + m.amt);
  ok(m.links === 1, tag + ': החיבור נשמר לסנכרון עם המשפחה');
  if (sameMonth) ok(Math.abs(await spent() - 228.4) < 0.01, tag + ': ההוצאות החודש — פעם אחת בלבד');
  await page.evaluate(() => openMe('purchases')); await page.waitForTimeout(300);
  await shot('3-אחרי-החיבור');
  // 3. עריכת הסכום ומחיקתו
  await page.locator('#meBody [data-trtool]').first().click(); await page.waitForTimeout(250);
  await page.fill('#tr90A', '226.9'); await shot('4-עריכת-סכום'); await page.click('#tr90S'); await page.waitForTimeout(200);
  ok(await page.evaluate((t1) => bdApi.tripAmt(state.history.find((h) => h.ts === t1)) === 226.9, T1), tag + ': הסכום תוקן ל-226.9');
  await page.evaluate(() => openMe('purchases')); await page.waitForTimeout(250);
  await page.locator('#meBody [data-trtool]').first().click(); await page.waitForTimeout(250);
  await page.click('#tr90C'); await page.waitForTimeout(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && /^(אישור|כן|OK)/.test(x.textContent.trim())); b && b.click(); }); await page.waitForTimeout(300);
  ok(await page.evaluate((t1) => bdApi.tripAmt(state.history.find((h) => h.ts === t1)) === 0, T1), tag + ': אחרי "מחיקת הסכום" הקנייה לא נספרת (גם לא לפי הסה״כ שבקבלה)');
  const synced = await page.evaluate(() => { const r = JSON.parse(JSON.stringify(state.budget)); return bdApi.B().paid[Object.keys(r.paid)[0]].z === 1 && JSON.stringify(syncPayload()).includes('"z":1'); });
  ok(synced, tag + ': המחיקה נשמרת ומסונכרנת');
  // 4. העלאת קבלה: בוחרים לאיזו קנייה (יום אחרי הקנייה — בלי בחירה הייתה נרשמת כקנייה נוספת)
  await page.evaluate((R) => { document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); openUpload('receipt'); upMode = 'receipt'; upResult = { receipt: R }; showUploadReview(); document.querySelector('#urPub').checked = false; }, RECEIPT);
  await page.waitForTimeout(300);
  const opts = await page.evaluate(() => [...document.querySelectorAll('#urLink option')].map((o) => o.value));
  ok(opts.includes(String(T2)) && await page.locator('#urLink').inputValue() === 'new', tag + ': בחלון הקבלה — אפשר לבחור את הקנייה "לשבת" (ברירת מחדל: קנייה חדשה, כי זה יום אחר)');
  await page.selectOption('#urLink', String(T2)); await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('.lk90').scrollIntoView({ block: 'center' })); await shot('5-חלון-קבלה-בחירת-קנייה');
  await page.evaluate(() => document.querySelector('#upConfirm').click()); await page.waitForTimeout(700);
  const r2 = await page.evaluate((t2) => { const t = state.history.find((h) => h.ts === t2); return { n: state.history.length, linked: !!(t && t.linked), amt: t && bdApi.tripAmt(t) }; }, T2);
  ok(r2.n === 2 && r2.linked && Math.abs(r2.amt - 96.5) < 0.01, tag + ': הקבלה הצטרפה לקנייה שנבחרה — לא נוספה קנייה שלישית (' + r2.amt + ')');
  // 5. סנכרון: מכשיר אחר שעוד רואה שתי רשומות — מקבל את החיבור
  const sync = await page.evaluate(([h, t1, r0]) => { const links = state.histLinks; state.history = JSON.parse(JSON.stringify(h)); state.histLinks = []; state.histGone = []; applyRemote({ histLinks: links }, false);
    return { n: state.history.length, rc: state.history.some((x) => x.ts === r0), t: !!state.history.find((x) => x.ts === t1).linked }; }, [HIST, T1, R0]);
  ok(sync.t && !sync.rc, tag + ': במכשיר אחר — הקבלה מצטרפת לאותה קנייה לפי החיבור שסונכרן');
  // 6. ההיסטוריה (העיצוב החדש)
  await page.evaluate(() => { document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); setTab('hist'); }); await page.waitForTimeout(400);
  const hx = await page.locator('#paneHist [data-trtool]').count();
  ok(hx >= 1, tag + ': בהיסטוריה — כפתור "סכום וקבלה" בכל קנייה (' + hx + ')');
  if (hx) { await page.locator('#paneHist [data-r2h]').first().click(); await page.waitForTimeout(200); await shot('6-היסטוריה'); }
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run(390, 844, 'טלפון', false);
await run(390, 844, 'טלפון-כהה', true);
await run(1280, 860, 'מחשב', false);
await browser.close(); server.close();
