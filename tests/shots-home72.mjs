// "הבית שלי": מחיקה (אחד / כמה / הכל), "אין לי" לא חוזר בסנכרון, וסידורים בגרירה עם עיגול דחיפות
//   cd tests && node shots-home72.mjs   (SHOTS=תיקייה לצילומי מסך)
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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? '✅ ' : '❌ ') + m); };
const STATE = { user: { name: 'בודק', email: '', offline: true }, pantry: { 'חלב': true, 'לחם': true, 'ביצים': true, 'גבינה': true, 'שוקולד': true, 'ריבת חלב של סבתא': true }, stock: { 'חלב': { q: 2, ts: 1 }, 'לחם': { q: 1, ts: 1 } }, customPantry: ['ריבת חלב של סבתא'], missingHome: ['קפה', 'תה', 'במבה'],
  errands: [{ id: 'e1', t: 'לעבור אצל התופרת', done: false, ts: 1 }, { id: 'e2', t: 'דואר — לאסוף חבילה', done: false, ts: 2 }, { id: 'e3', t: 'בית מרקחת', done: false, ts: 3 }] };
async function newPage(dark) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: OUT ? 2 : 1, colorScheme: dark ? 'dark' : 'light' });
  await ctx.route(/supabase\.(co|js)|fonts\.(googleapis|gstatic)|\/api\/prices\//, (r) => r.abort());
  await ctx.addInitScript((st) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); }, STATE);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate(() => { document.querySelectorAll('.overlay.open,.qp15.open').forEach((o) => o.classList.remove('open')); });
  return { ctx, page, errors };
}
const shot = (page, n) => OUT ? page.screenshot({ path: path.join(OUT, n) }) : null;

{ const { ctx, page, errors } = await newPage();
  await page.evaluate(() => { state.homeView = 'have'; document.querySelector('.tab[data-t=home]').click(); });
  await page.waitForTimeout(500);
  ok(await page.locator('#paneHome [data-h72sel]').count() === 1, 'כפתור "בחירה ומחיקה" ב"יש בבית"');
  await page.click('#paneHome [data-h72sel]'); await page.waitForTimeout(300);
  ok(await page.locator('#paneHome [data-h72p]').count() === 6, 'כל המוצרים שיש בבית מופיעים לבחירה');
  await page.click('#paneHome .h72r:has([data-h72p="שוקולד"])'); await page.click('#paneHome .h72r:has([data-h72p="ביצים"])');
  ok((await page.textContent('#paneHome [data-h72del]')).includes('2'), 'כפתור המחיקה סופר 2');
  await shot(page, '1-בחירה-למחיקה.png');
  await page.click('#paneHome [data-h72del]'); await page.waitForTimeout(300);
  // uiConfirm — חלון של האתר
  const okBtn = page.locator('button.u30ok').first();
  if (await okBtn.count()) { await shot(page, '2-אישור-מחיקה.png'); await okBtn.click(); }
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !pantryHas('שוקולד') && !pantryHas('ביצים') && pantryHas('חלב')), 'נמחקו רק השניים שנבחרו');
  ok(await page.evaluate(() => !state.missingHome.includes('שוקולד') && !state.missingHome.includes('ביצים')), 'מה שנמחק לא עבר ל"נגמר"');
  // מחיקת הכל
  await page.click('#paneHome [data-h72sel]'); await page.click('#paneHome [data-h72all]'); await page.waitForTimeout(200);
  await page.click('#paneHome [data-h72del]'); await page.waitForTimeout(300);
  if (await okBtn.count()) await okBtn.click(); await page.waitForTimeout(400);
  ok(await page.evaluate(() => pantryCount() === 0 && !state.customPantry.length && !P['ריבת חלב של סבתא']), 'מחיקת הכל: הבית ריק, ומוצר שהוספתי בעצמי נמחק לגמרי');
  // נגמר: ✕ על שורה
  await page.click('#paneHome [data-h71v="out"]'); await page.waitForTimeout(300);
  await shot(page, '3-נגמר-עם-מחיקה.png');
  await page.click('#paneHome [data-h72one="תה"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !state.missingHome.includes('תה') && state.missingHome.includes('קפה')), '✕ ב"נגמר" מוחק מוצר אחד');
  // סנכרון: מכשיר אחר עוד חושב שיש חלב — לא חוזר
  await page.evaluate(() => { stockSet('קפה', 1); stockSet('קפה', 0); });
  await page.evaluate(() => { const t = state.homeMod['קפה']; applyRemote({ pantry: { 'קפה': true, 'שוקולד': true }, stock: { 'קפה': { q: 3, ts: 5 } }, missingHome: [], homeMod: { 'שוקולד': state.homeMod['שוקולד'] - 1000 } }, false); });
  ok(await page.evaluate(() => !pantryHas('קפה') && state.missingHome.includes('קפה')), 'מכשיר ישן בלי שעון — "אין לי" לא חוזר');
  ok(await page.evaluate(() => !pantryHas('שוקולד')), 'מוצר שנמחק לא חוזר ממכשיר שעוד מחזיק אותו');
  await page.evaluate(() => { applyRemote({ pantry: { 'קפה': true }, stock: { 'קפה': { q: 3, ts: 5 } }, missingHome: [], homeMod: { 'קפה': Date.now() + 5000 } }, false); });
  ok(await page.evaluate(() => pantryHas('קפה') && !state.missingHome.includes('קפה')), 'שינוי חדש יותר ממכשיר אחר — כן נקלט');
  ok(!errors.length, 'בלי שגיאות: ' + errors.join(' | '));
  await ctx.close(); }

for (const dark of [false, true]) { const { ctx, page, errors } = await newPage(dark);
  await page.evaluate(() => openErrands(false)); await page.waitForTimeout(400);
  ok(await page.locator('#v8SheetBody [data-edrag]').count() === 3, 'ידית גרירה לכל סידור');
  await page.click('#v8SheetBody [data-epr="e3"]'); await page.click('#v8SheetBody [data-epr="e3"]'); await page.click('#v8SheetBody [data-epr="e3"]');
  await page.click('#v8SheetBody [data-epr="e2"]'); await page.click('#v8SheetBody [data-epr="e2"]');
  await page.click('#v8SheetBody [data-epr="e1"]');
  ok(await page.evaluate(() => state.errands.map((e) => e.pr || 0).join(',')) === '1,2,3', 'עיגול: ירוק / כתום / אדום');
  // גרירה: בית מרקחת למעלה
  const h = await page.locator('#v8SheetBody [data-edrag="e3"]').boundingBox();
  const t = await page.locator('#v8SheetBody .err17[data-eid="e1"]').boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 + (t.y + 4 - (h.y + h.height / 2)) * i / 10);
  await page.mouse.up(); await page.waitForTimeout(300);
  ok(await page.evaluate(() => errSorted(errOpen()).map((e) => e.id).join(',')) === 'e3,e1,e2', 'גרירה: בית מרקחת עלה לראש');
  // מקלדת
  await page.focus('#v8SheetBody [data-edrag="e2"]'); await page.keyboard.press('ArrowUp');
  ok(await page.evaluate(() => errSorted(errOpen()).map((e) => e.id).join(',')) === 'e3,e2,e1', 'חץ למעלה מזיז');
  const n = await page.evaluate(() => errAdd('בנק', '', '').o);
  ok(n > 3, 'סידור חדש נכנס בסוף');
  await page.evaluate(() => openErrands(false)); await page.waitForTimeout(300);
  await shot(page, dark ? '5-סידורים-כהה.png' : '4-סידורים-גרירה-ודחיפות.png');
  if (!dark) { await page.evaluate(() => { closeSheet(); document.querySelector('.tab[data-t=list]').click(); }); await page.waitForTimeout(400); await shot(page, '6-סידורים-בראש-הרשימה.png');
    ok((await page.locator('.errstrip17 .err17').first().getAttribute('data-eid')) === 'e3', 'בראש הרשימה — לפי הסדר שגררו'); }
  ok(!errors.length, 'בלי שגיאות: ' + errors.join(' | '));
  await ctx.close(); }

await browser.close(); server.close();
console.log(fails.length ? '\n' + fails.length + ' נכשלו' : '\nהכל עבר');
process.exit(fails.length ? 1 : 0);
