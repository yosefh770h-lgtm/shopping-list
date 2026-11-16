// העלאת קבלה: כל תמונה מוצגת ונמחקת כתמונה אחת (גם כשהיא נחתכת לחלקים), פתיחה חדשה מתחילה נקי,
// ותקלה בלי הסבר מהשרת מקבלת הודעה ברורה ונרשמת ביומן התקלות. באתר ובאפליקציה.
//   OUT=תיקייה node shots-receipt-photos.mjs
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
async function run(tag, ua) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, locale: 'he-IL', deviceScaleFactor: 2, ...(ua ? { userAgent: ua } : {}) });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(() => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2200);
  await page.evaluate(() => { document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  // שתי תמונות קבלה ארוכות (1080x2700 — כל אחת נחתכת ל-2 חלקים)
  const photo = async (seed) => Buffer.from((await page.evaluate((s) => { const c = document.createElement('canvas'); c.width = 1080; c.height = 2700; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#222'; x.font = '42px monospace';
    for (let i = 0; i < 55; i++) x.fillText('מוצר ' + (s * 100 + i) + '   ' + (i * 1.37 + s).toFixed(2), 60, 60 + i * 47);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1]; }, seed)), 'base64');
  const files = [{ name: 'r1.jpg', mimeType: 'image/jpeg', buffer: await photo(1) }, { name: 'r2.jpg', mimeType: 'image/jpeg', buffer: await photo(2) }];
  const st = () => page.evaluate(() => ({ parts: upImgs.length, thumbs: document.querySelectorAll('#upThumbs .upth').length, label: (document.querySelector('#upThumbs small') || {}).textContent || '' }));
  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') }); };
  await page.evaluate(() => openUpload('receipt'));
  await page.setInputFiles('#upFiles', files); await page.waitForTimeout(1500);
  let s = await st();
  ok(s.thumbs === 2 && s.parts === 4 && /2/.test(s.label), tag + ': 2 תמונות → 2 תמונות במסך (4 חלקים נשלחים בשקט) — ' + JSON.stringify(s));
  await shot('1-שתי-תמונות');
  await page.setInputFiles('#upFiles', [files[0]]); await page.waitForTimeout(800);
  s = await st(); ok(s.thumbs === 2 && s.parts === 4, tag + ': אותה תמונה פעמיים — לא נכנסת שוב');
  await page.locator('#upThumbs [data-rcrm]').nth(1).click(); await page.waitForTimeout(200);
  s = await st(); ok(s.thumbs === 1 && s.parts === 2, tag + ': ✕ מוחק את התמונה עם שני החלקים שלה — ' + JSON.stringify(s));
  await shot('2-אחרי-מחיקה');
  await page.setInputFiles('#upFiles', [files[1]]); await page.waitForTimeout(1000);
  s = await st(); ok(s.thumbs === 2 && s.parts === 4, tag + ': מעלים שוב את מה שנמחק — נכנס פעם אחת, בלי שאריות');
  // סוגרים ופותחים מחדש — מתחילים נקי
  await page.evaluate(() => { closeSheet(); openUpload('receipt'); }); await page.waitForTimeout(300);
  s = await st(); ok(s.thumbs === 0 && s.parts === 0, tag + ': פתיחה חדשה של "העלאת קבלה" — בלי תמונות ישנות');
  await page.setInputFiles('#upFiles', files); await page.waitForTimeout(1500);
  await page.locator('.seg [data-um="list"]').click(); await page.waitForTimeout(200); await page.locator('.seg [data-um="receipt"]').click(); await page.waitForTimeout(200);
  s = await st(); ok(s.thumbs === 0 && s.parts === 0, tag + ': מעבר בין "קבלה" ל"רשימה" מנקה — תמונות קבלה לא נשלחות כרשימה');
  await page.setInputFiles('#upFiles', files); await page.waitForTimeout(1500);
  // 401 מהפונקציה (הכניסה פגה): מחדשים את הכניסה ושולחים שוב — והקריאה מצליחה
  const retry = await page.evaluate(async () => { let n = 0, ref = 0; const resp = (st, body) => ({ data: null, error: Object.assign(new Error('non-2xx'), { name: 'FunctionsHttpError', context: { status: st, json: async () => body } }) });
    sb = { functions: { invoke: async () => (++n === 1 ? resp(401, { error: 'unauthorized' }) : { data: { receipt: { store: 'שופרסל', items: [{ name: 'חלב', qty: 1, price: 6, total: 6 }], total: 6 } }, error: null }) },
      auth: { refreshSession: async () => { ref++; return { data: { session: { access_token: 'x' } } }; }, getUser: async () => ({ data: { user: { id: 'u1' } } }) }, rpc: () => Promise.resolve({}) };
    authUser = { id: 'u1' }; await readUpload(); return { n, ref, ok: !!document.querySelector('#upOut #upConfirm') }; });
  ok(retry.n === 2 && retry.ref === 1 && retry.ok, tag + ': כניסה שפגה — מתחדשת לבד והקבלה נקראת ' + JSON.stringify(retry));
  // 401 מ-Supabase לפני הפונקציה (Verify JWT) — לא אומרים "להתחבר מחדש"
  const gw = await page.evaluate(async () => { const logs = []; sb = { functions: { invoke: async () => ({ data: null, error: Object.assign(new Error('non-2xx'), { name: 'FunctionsHttpError', context: { status: 401, json: async () => ({ code: 401, message: 'Invalid JWT' }) } }) }) },
      auth: { refreshSession: async () => ({ data: { session: { access_token: 'x' } } }) }, rpc: (n, a) => { logs.push(a); return Promise.resolve({}); } };
    await readUpload(); return { msg: document.querySelector('#upOut').textContent, log: logs[0] && logs[0].p_msg }; });
  ok(/השרת דחה/.test(gw.msg) && !/להתחבר מחדש/.test(gw.msg) && /Verify JWT/.test(gw.log), tag + ': חסימה בשרת (Verify JWT) — הודעה נכונה ונרשם ביומן: ' + gw.log);
  await shot('4-חסימה-בשרת');
  // החידוש הצליח והשרת עדיין לא מזהה — תקלה בשרת: לא שולחים להתחבר מחדש, וביומן: הכניסה במכשיר תקינה + הסיבה מהשרת
  const srv = await page.evaluate(async () => { const logs = []; sb = { functions: { invoke: async () => ({ data: null, error: Object.assign(new Error('non-2xx'), { name: 'FunctionsHttpError', context: { status: 401, json: async () => ({ error: 'unauthorized', detail: 'k0:401 Invalid API key' }) } }) }) },
      auth: { refreshSession: async () => ({ data: { session: { access_token: 'x' } } }), getUser: async () => ({ data: { user: { id: 'u1' } } }) }, rpc: (n, a) => { logs.push(a); return Promise.resolve({}); } };
    await readUpload(); return { msg: document.querySelector('#upOut').textContent, log: logs[0] && logs[0].p_msg, btn: !!document.querySelector('#upRelogin') }; });
  ok(/השרת לא הצליח לזהות/.test(srv.msg) && !srv.btn && /הכניסה במכשיר: תקינה/.test(srv.log) && /Invalid API key/.test(srv.log), tag + ': תקלת זיהוי בשרת — ' + srv.log);
  // הכניסה כבר לא תקפה בשרת והחידוש נכשל — כפתור "להתחבר מחדש"
  const dead = await page.evaluate(async () => { let n = 0, out = 0; sb = { functions: { invoke: async () => { n++; return { data: null, error: Object.assign(new Error('non-2xx'), { name: 'FunctionsHttpError', context: { status: 401, json: async () => ({ error: 'unauthorized' }) } }) }; } },
      auth: { refreshSession: async () => ({ data: { session: null }, error: new Error('Invalid Refresh Token') }), getUser: async () => ({ data: { user: null }, error: new Error('bad') }), signOut: async () => { out++; return {}; } }, rpc: () => Promise.resolve({}) };
    await readUpload(); const b = document.querySelector('#upRelogin'); const had = !!b; if (b) b.click(); await new Promise((r) => setTimeout(r, 200)); return { n, had, out }; });
  ok(dead.n === 1 && dead.had && dead.out === 1, tag + ': כניסה מתה — כפתור "להתחבר מחדש" שמוציא ומחזיר לכניסה ' + JSON.stringify(dead));
  // תקלה בלי הסבר: החיבור נקטע באמצע השליחה
  const logged = await page.evaluate(async () => { const logs = []; sb = { functions: { invoke: async () => ({ data: null, error: Object.assign(new Error('Failed to send a request to the Edge Function'), { name: 'FunctionsFetchError', context: {} }) }) }, rpc: (n, a) => { logs.push(a); return Promise.resolve({}); } };
    authUser = { id: 'u1' }; await readUpload(); return logs; });
  const msg = await page.locator('#upOut').textContent();
  ok(/נקטע/.test(msg), tag + ': הודעה ברורה כשהחיבור נקטע — ' + msg.trim());
  ok(logged.length === 1 && /4 חלקים/.test(logged[0].p_src), tag + ': נרשם ביומן התקלות — ' + (logged[0] && logged[0].p_src));
  await shot('3-הודעה-ברורה');
  ok(!errors.length, tag + ': בלי שגיאות בדף ' + errors.join(' | '));
  await ctx.close();
}
await run('site');
await run('app', 'Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 YamShoppingApp/2.1');
await browser.close(); server.close();
