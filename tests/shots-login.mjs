// צילומי מסך + בדיקה: כניסה והרשמה במייל וקוד, הודעות שגיאה נכונות, ונעילת האתר (קוד / טביעת אצבע)
//   OUT=תיקייה node shots-login.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', css: 'text/css', svg: 'image/svg+xml', woff2: 'font/woff2' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/1.0';
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };

// השרת המדומה: auth-guard מחזיר מה שהבדיקה מבקשת
let guardReply = () => ({ error: 'invalid', left: 2 }); const calls = [];
async function mock(ctx) {
  await ctx.route(/supabase\.co\/functions\/v1\/auth-guard/, async (r) => { const b = JSON.parse(r.request().postData() || '{}'); calls.push(b);
    if (b.action === 'nonce') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"nonce":"x"}' });
    const [status, body] = [].concat(guardReply(b)); return r.fulfill({ status: typeof status === 'number' ? status : 200, contentType: 'application/json', body: JSON.stringify(typeof status === 'number' ? body : status) }); });
  await ctx.route(/supabase\.co\/auth\/v1\/settings/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"external":{"google":true}}' }));
  await ctx.route(/supabase\.co\/auth\/v1\/token/, (r) => r.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"invalid_grant","error_description":"Invalid login credentials"}' }));
  await ctx.route(/supabase\.co\/(rest|realtime)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
}
async function run(width, height, tag, ua) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, ...(ua ? { userAgent: ua } : {}) });
  await mock(ctx);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') }); };
  const err = () => page.locator('#loginErr').innerText();
  await page.goto(BASE); await page.waitForTimeout(2200);
  ok(await page.locator('#login.open').isVisible(), tag + ': מסך הכניסה מוצג');
  if (ua) ok(/הרשמה חינם עם מייל/.test(await page.locator('#lSw51').innerText()), tag + ': קישור ברור "עוד לא נרשמת? הרשמה חינם עם מייל"');
  else ok(!(await page.locator('#lSw51, #lOr51, #lHint51').count()), tag + ': באתר מסך הכניסה כמו שהיה (בלי התוספות של האפליקציה)');
  if (ua) { ok(await page.locator('#btnGoogle').isHidden(), tag + ': באפליקציה לא מוצג כפתור גוגל (שם הוא לא עובד)'); }
  else ok(await page.locator('#btnGoogle').isVisible(), tag + ': באתר גוגל נשאר כאפשרות נוספת');
  ok(ua ? !(await page.locator('#a11yFab').count()) : await page.locator('#a11yFab').count() === 1, tag + (ua ? ': באפליקציה אין בועת נגישות צפה' : ': באתר בועת הנגישות נשארת'));
  await shot('1-login');

  // תקלה בשרת — לא אומרים "קוד לא נכון"
  await page.fill('#inMail', 'test@example.com'); await page.fill('#inCode', 'abcd1234');
  guardReply = () => [500, { error: 'generic' }]; await page.click('#btnLogin'); await page.waitForTimeout(600);
  ok(!/לא נכונ/.test(await err()), tag + ': תקלה בשרת לא מוצגת כ"קוד לא נכון" — ' + await err());
  await shot('2-server-error');
  // השרת לא עונה בכלל — מנסים שוב, ואז אומרים שהקוד לא נבדק
  calls.length = 0; guardReply = () => [404, {}]; await page.click('#btnLogin'); await page.waitForTimeout(2500);
  ok(calls.filter((c) => c.action === 'login').length === 2, tag + ': כשהשרת לא עונה מנסים פעם נוספת');
  ok(/הקוד לא נבדק/.test(await err()), tag + ': ואז: "לא הצלחנו להגיע לשרת — הקוד לא נבדק" — ' + await err());
  // רווח בסוף הקוד מהמקלדת
  calls.length = 0; guardReply = (b) => b.code === 'abcd1234' ? { ok: true, session: null } : { error: 'invalid', left: 4 };
  await page.fill('#inCode', 'abcd1234 '); await page.click('#btnLogin'); await page.waitForTimeout(600);
  ok(calls.some((c) => c.code === 'abcd1234'), tag + ': קוד עם רווח בסוף נבדק גם בלי הרווח');
  ok(await page.locator('#inCode').getAttribute('autocapitalize') === 'off', tag + ': בלי אות גדולה אוטומטית בשדה הקוד');
  // קוד שגוי באמת
  guardReply = () => ({ error: 'invalid', left: 2 }); await page.fill('#inCode', 'wrong1234'); await page.click('#btnLogin'); await page.waitForTimeout(600);
  ok(/לא נכונים.*נשארו 2/.test(await err()), tag + ': קוד שגוי באמת — עם מספר הניסיונות שנשארו');
  ok(ua ? /נרשמתם עם גוגל/.test(await err()) : !/נרשמתם עם גוגל/.test(await err()), tag + (ua ? ': באפליקציה — הסבר למי שנרשם עם גוגל' : ': באתר — בלי הסבר על גוגל (שם יש כפתור גוגל)'));
  await shot('3-wrong-code');
  if (ua) {
    // שכחתי את הקוד בלי מייל — שואלים את המייל
    await page.fill('#inMail', ''); guardReply = () => ({ ok: true }); await page.click('#btnForgot'); await page.waitForTimeout(400);
    ok(await page.locator('.uid30 input').isVisible(), tag + ': "שכחתי את הקוד" בלי מייל — שואלים לאיזה מייל לשלוח');
    await page.fill('.uid30 input', 'test@example.com'); await shot('4-forgot-asks-email');
    await page.click('.uid30 .u30ok'); await page.waitForTimeout(600);
    ok(calls.some((c) => c.action === 'reset' && c.email === 'test@example.com'), tag + ': נשלחה בקשת איפוס למייל');
    await page.click('.uid30 .u30ok').catch(() => {}); await page.waitForTimeout(300);
    // הרשמה
    await page.click('#lSw51'); await page.waitForTimeout(200);
    ok(await page.locator('#inName').isVisible() && await page.locator('#inCode2').isVisible(), tag + ': לחיצה על הקישור פותחת את ההרשמה');
    ok(/כבר נרשמת/.test(await page.locator('#lSw51').innerText()), tag + ': ובהרשמה — "כבר נרשמת? לכניסה"');
    await page.fill('#inName', 'משה'); await page.fill('#inMail', 'moshe@example.com'); await shot('5-signup');
  } else ok(!(await page.evaluate(() => !!document.querySelector('#miLock51'))), tag + ': באתר אין "נעילת האתר" בתפריט');
  // קישור ישיר להרשמה
  const p2 = await ctx.newPage(); await p2.goto(BASE + '#signup'); await p2.waitForTimeout(2500);
  ok(await p2.locator('#inName').isVisible(), tag + ': הקישור yamshopping.com/#signup פותח ישר את ההרשמה'); await p2.close();
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
async function runLock(width, height, tag) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, userAgent: APP_UA });
  await mock(ctx);
  await ctx.addInitScript(() => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  let page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  // טביעת אצבע מדומה (כמו חיישן אמיתי בטלפון)
  const cdp = await ctx.newCDPSession(page); await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasUserVerification: true, isUserVerified: true, hasResidentKey: true } });
  const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') }); };
  await page.goto(BASE); await page.waitForTimeout(2200);
  await page.evaluate(() => { document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  ok(await page.evaluate(() => !document.querySelector('#lock51') && !document.documentElement.classList.contains('lock51')), tag + ': בלי הפעלה — האתר פתוח כרגיל');
  ok(await page.evaluate(() => !!document.querySelector('#miLock51')), tag + ': בתפריט יש "נעילת האתר"');
  await page.evaluate(() => openLock51()); await page.waitForTimeout(300); await shot('6-lock-settings-off');
  await page.click('#lkSet51 [data-a="pin"]'); await page.fill('#lkP1', '1111'); await page.fill('#lkP2', '1111'); await page.click('#lkSet51 [data-a="savepin"]');
  ok(/קל מדי/.test(await page.locator('#lkErr').innerText()), tag + ': קוד קל מדי (1111) נדחה');
  await page.fill('#lkP1', '2580'); await page.fill('#lkP2', '2580'); await page.click('#lkSet51 [data-a="savepin"]'); await page.waitForTimeout(300);
  await page.click('#lkSet51 [data-a="bioon"]'); await page.waitForTimeout(800);
  const L = await page.evaluate(() => JSON.parse(localStorage.getItem('yam_lock51')));
  ok(L && L.hash && !JSON.stringify(L).includes('2580'), tag + ': הקוד נשמר מוצפן (לא כטקסט)');
  ok(L && L.bio, tag + ': טביעת אצבע / זיהוי פנים הופעלו');
  await shot('7-lock-settings-on');
  // פתיחה מחדש של האתר (לשונית / הפעלה חדשה) — נעול. רענון באותה לשונית בתוך הזמן שנבחר לא נועל שוב
  await page.reload(); await page.waitForTimeout(1500);
  ok(!(await page.locator('#lock51').count()), tag + ': רענון מיד באותה לשונית — לא ננעל שוב');
  await page.close(); page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message)); // בלי חיישן: שהמסך יחכה לאצבע ולא ייפתח לבד
  await page.goto(BASE); await page.waitForTimeout(1500);
  ok(await page.locator('#lock51').isVisible(), tag + ': בפתיחה מחדש האתר נעול');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.app')).visibility === 'hidden'), tag + ': התוכן מוסתר מאחורי הנעילה');
  await shot('8-locked');
  for (const k of '1234') await page.click('#lock51 [data-k="' + k + '"]');
  await page.waitForTimeout(500);
  ok(/לא נכון/.test(await page.locator('#lock51 .err').innerText()), tag + ': קוד נעילה שגוי נדחה'); await shot('9-locked-wrong');
  for (const k of '2580') await page.click('#lock51 [data-k="' + k + '"]');
  await page.waitForTimeout(600);
  ok(!(await page.locator('#lock51').count()), tag + ': הקוד הנכון פותח את האתר');
  // יציאה מהאתר וחזרה — ננעל שוב ("בכל פעם שיוצאים")
  await page.evaluate(() => { const L = JSON.parse(localStorage.getItem('yam_lock51')); L.after = 0; localStorage.setItem('yam_lock51', JSON.stringify(L)); });
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(300);
  ok(await page.locator('#lock51').isVisible(), tag + ': חזרה לאתר אחרי יציאה — נעול שוב');
  // שכחתי את קוד הנעילה — מבטל ויוצא מהחשבון
  await page.click('#lock51 [data-k="forgot"]'); await page.waitForTimeout(300); await page.click('.uid30 .u30ok'); await page.waitForTimeout(800);
  ok(!(await page.locator('#lock51').count()) && await page.evaluate(() => !localStorage.getItem('yam_lock51')), tag + ': "שכחתי את קוד הנעילה" — הנעילה בוטלה');
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run(390, 844, 'phone');
await run(1280, 800, 'computer');
await run(390, 844, 'app', APP_UA);
await runLock(390, 844, 'app');
await browser.close(); server.close();
