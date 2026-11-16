// צילומי מסך + בדיקה: 🙋 בקשת אישור כניסה ממסך הכניסה, והאישור בבק אופיס
//   OUT=תיקייה node shots-login-approve.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', css: 'text/css', svg: 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/1.0';
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();

// ---------- צד המשתמש: מסך הכניסה ----------
for (const [w, h, tag, ua] of [[390, 844, 'phone-app', APP_UA], [1280, 900, 'computer', '']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 2, ...(ua ? { userAgent: ua } : {}) });
  const calls = []; let pollReply = { status: 'pending' };
  await ctx.route(/supabase\.co\/functions\/v1\/auth-guard/, async (r) => { const b = JSON.parse(r.request().postData() || '{}'); calls.push(b);
    const body = b.action === 'lr_create' ? { ok: true, id: '11111111-2222-3333-4444-555555555555', secret: 'a'.repeat(48), code: '4821' }
      : b.action === 'lr_poll' ? pollReply : b.action === 'login' ? (b.email === 'pre@x.com' && b.code === '' ? { ok: true, approved: true, session: { access_token: 'x.e30.y', refresh_token: 'r' } } : { error: 'invalid', left: 4 }) : { ok: true };
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }); });
  await ctx.route(/supabase\.co\/auth\/v1\/settings/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"external":{"google":true}}' }));
  await ctx.route(/supabase\.co\/(rest|realtime|auth)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2200);
  ok(await page.locator('#btnLoginReq').isVisible(), tag + ': במסך הכניסה יש "בקשו אישור כניסה מהמנהל"');
  await page.locator('#btnLoginReq').scrollIntoViewIfNeeded();
  await page.screenshot({ path: OUT + '/' + tag + '-1-login-button.png' });
  // כניסה עם שם משתמש (חשבון בלי מייל)
  await page.fill('#inMail', 'Moshe.Cohen'); await page.fill('#inCode', 'abcd1234'); await page.click('#btnLogin'); await page.waitForTimeout(700);
  ok(calls.some((c) => c.action === 'login' && c.email === 'moshe.cohen@nomail.yamshopping.com'), tag + ': שם משתמש במקום מייל נשלח כחשבון בלי מייל');
  ok(await page.inputValue('#inMail') === 'Moshe.Cohen', tag + ': ושדה המייל נשאר כמו שהמשתמש כתב');
  // ✉️ המנהל אישר את המייל מראש — כניסה עם המייל בלבד, בלי קוד
  await page.fill('#inMail', 'pre@x.com'); await page.fill('#inCode', ''); calls.length = 0; await page.click('#btnLogin'); await page.waitForTimeout(700);
  ok(calls.some((c) => c.action === 'login' && c.email === 'pre@x.com' && c.code === ''), tag + ': מייל בלי קוד — בודקים אם המנהל אישר מראש');
  await page.reload(); await page.waitForTimeout(2200);
  await page.fill('#inMail', 'nopre@x.com'); calls.length = 0; await page.click('#btnLogin'); await page.waitForTimeout(700);
  ok(/8 תווים/.test(await page.locator('#loginErr').innerText()), tag + ': בלי אישור מראש — כרגיל, צריך קוד');
  await page.fill('#inMail', '');
  await page.click('#btnLoginReq'); await page.waitForTimeout(300);
  await page.click('#lrSend'); await page.waitForTimeout(200);
  ok(/השם/.test(await page.locator('#lrErr').innerText()), tag + ': בלי שם — מבקשים שם');
  await page.fill('#lrName', 'משה כהן'); await page.fill('#lrNote', 'שכחתי את הקוד, אני מהבית כנסת של הרב');
  await page.screenshot({ path: OUT + '/' + tag + '-2-request-form.png' });
  await page.click('#lrSend'); await page.waitForTimeout(800);
  ok(calls.some((c) => c.action === 'lr_create' && c.name === 'משה כהן'), tag + ': הבקשה נשלחה לשרת');
  ok((await page.locator('.lrcode').innerText()).trim() === '4821', tag + ': מוצג המספר של הבקשה');
  ok(await page.evaluate(() => !!localStorage.getItem('yam_login_req')), tag + ': הבקשה נשמרת במכשיר (אפשר לסגור ולחזור)');
  await page.waitForTimeout(4500);
  ok(calls.some((c) => c.action === 'lr_poll'), tag + ': בודקים לבד אם המנהל אישר');
  await page.screenshot({ path: OUT + '/' + tag + '-3-waiting.png' });
  pollReply = { status: 'rejected' }; await page.waitForTimeout(4500);
  ok(/לא אישר/.test(await page.locator('#lrState').innerText()), tag + ': בקשה שנדחתה — מודיעים');
  ok(await page.evaluate(() => !localStorage.getItem('yam_login_req')), tag + ': ובקשה שנגמרה נמחקת מהמכשיר');
  ok(!errors.length, tag + ': בלי שגיאות ' + errors.join(' | '));
  await ctx.close();
}

// ---------- בק אופיס: 🙋 אישור כניסה ----------
const STUB = `window.__stub=function(D,calls){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>new Promise(r=>setTimeout(r,60)).then(()=>({data:D[k]||[],error:null,count:(D[k]||[]).length})).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:(n,o)=>{calls.push(o.body);const a=o.body.action;return Promise.resolve({data:a==='lr_approve'&&!o.body.create&&!/@/.test(o.body.account)?{error:'not_found',nomail:true}:{ok:true,created:!!o.body.create},error:null});}},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:{access_token:'t'}}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;
const D = { auth_events: [
  { kind: 'login_locked', email: 'chaim@gmail.com', created_at: ago(12) }, ...Array.from({ length: 6 }, () => ({ kind: 'login_fail', email: 'chaim@gmail.com', created_at: ago(15) })),
  { kind: 'login_fail', email: 'menachem@walla.co.il', created_at: ago(40) }, { kind: 'login_fail', email: 'menachem@walla.co.il', created_at: ago(42) }, { kind: 'login_fail', email: 'once@x.com', created_at: ago(5) }],
  login_requests: [
  { id: 'r1', code: '4821', name: 'משה כהן', email: '', note: 'שכחתי את הקוד, אני מהבית כנסת של הרב', ip: '84.95.1.20', ua: APP_UA, status: 'pending', user_email: '', created_at: ago(2) },
  { id: 'r2', code: '1937', name: 'יעקב לוי', email: 'yaakov@gmail.com', note: 'נחסמתי אחרי כמה ניסיונות', ip: '77.124.3.9', ua: 'Mozilla/5.0 (Windows NT 10.0)', status: 'pending', user_email: '', created_at: ago(9) },
  { id: 'r3', code: '5610', name: 'דוד', email: 'david@walla.co.il', note: '', ip: '1.2.3.4', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', status: 'used', user_email: 'david@walla.co.il', created_at: ago(300) },
  { id: 'p1', kind: 'pre', code: '', name: '', email: 'avi@gmail.com', note: '', ip: '', ua: '', status: 'approved', user_email: 'avi@gmail.com', created_at: ago(3), decided_at: ago(3), expires_at: new Date(Date.now() + 27 * 60000).toISOString() },
  { id: 'r4', code: '2288', name: 'שמואל', email: '', note: '', ip: '1.2.3.5', ua: 'Mozilla/5.0 (Linux; Android 14) YamShoppingApp/1.0', status: 'used', user_email: 'shmuel@nomail.yamshopping.com', created_at: ago(1500) }] };
for (const [w, h, nm] of [[1280, 1100, 'computer'], [390, 1400, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 1 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((D) => { window.__calls = []; sb = __stub(D, window.__calls); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('loginreq'); }, D);
  await page.waitForTimeout(1200);
  ok(await page.locator('[data-lrok]').count() === 2, nm + ': בבק אופיס רואים את 2 הבקשות שממתינות');
  ok(await page.locator('#lrPreCard').isVisible(), nm + ': יש אישור מראש לפי מייל');
  ok(/מהאפליקציה/.test(await page.locator('#boMain').innerText()) && /מהאתר · מחשב/.test(await page.locator('#boMain').innerText()), nm + ': רואים אם הבקשה מהאפליקציה או מהאתר');
  ok(await page.locator('[data-lrfail]').count() === 2, nm + ': רואים מי שנחסם / נכשל כמה פעמים (בלי מי שנכשל פעם אחת)');
  await page.screenshot({ path: OUT + '/bo-1-requests-' + nm + '.png', fullPage: true });
  // אישור לחשבון חדש בלי מייל
  await page.click('[data-lrok="r1"]'); await page.waitForTimeout(400);
  console.log('   dialogs:', await page.locator('.uid30').count(), await page.locator('.uid30').allInnerTexts());
  await page.locator('.uid30 input').fill('moshe.cohen'); await page.screenshot({ path: OUT + '/bo-2-approve-' + nm + '.png' });
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/bo-3-new-account-' + nm + '.png' });
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  const calls = await page.evaluate(() => window.__calls.filter((c) => /^lr_/.test(c.action)));
  ok(calls.length === 2 && calls[0].account === 'moshe.cohen' && !calls[0].create && calls[1].create === true, nm + ': אישור לשם משתמש חדש — שואלים, ואז פותחים חשבון בלי מייל ' + JSON.stringify(calls));
  // אישור מראש מתוך רשימת החסומים
  await page.evaluate(() => { window.__calls.length = 0; });
  await page.click('[data-lrfail="chaim@gmail.com"]'); await page.waitForTimeout(300); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/bo-4-preapproved-' + nm + '.png' });
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const pc = await page.evaluate(() => window.__calls.filter((c) => c.action === 'lr_preapprove'));
  ok(pc.length === 1 && pc[0].account === 'chaim@gmail.com' && pc[0].minutes === 30, nm + ': "אשר כניסה" ליד מי שנחסם — אישור מראש לחצי שעה ' + JSON.stringify(pc));
  ok(errors.length === 0, nm + ': בלי שגיאות ' + errors.join(' | '));
  await ctx.close();
}
await browser.close(); server.close();
