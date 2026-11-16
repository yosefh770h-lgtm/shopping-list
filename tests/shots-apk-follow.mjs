// צילומי מסך + בדיקה: גרסת האפליקציה לאנדרואיד בחלון ההורדה ("עודכן לגרסה", "מה חדש"), כפתור "לעקוב אחרי עדכונים",
// התראה בפעמון רק למי שעוקב, הודעת העדכון באפליקציה, והקישור "הפסקת המעקב" מהמייל.
//   OUT=תיקייה node shots-apk-follow.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', css: 'text/css', svg: 'image/svg+xml', woff2: 'font/woff2', apk: 'application/vnd.android.package-archive' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const VER = JSON.parse(fs.readFileSync(path.join(ROOT, 'download/app-version.json'), 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';

async function open(tag, { ua = ANDROID, width = 390, height = 844, follow = null, query = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: width < 600, hasTouch: width < 600, userAgent: ua });
  const st = { follow, sets: [], unf: [] };
  // הכללי קודם — בפלייסרייט הנתיב שנרשם אחרון קובע
  await ctx.route(/supabase\.co\/(rest|auth|realtime)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/supabase\.co\/rest\/v1\/rpc\/app_follow_get/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(st.follow) }));
  await ctx.route(/supabase\.co\/rest\/v1\/rpc\/app_follow_set/, (r) => { const b = JSON.parse(r.request().postData() || '{}'); st.sets.push(b); st.follow = { on: !!b.p_on, ver: b.p_on ? b.p_ver : '' };
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(!!b.p_on) }); });
  await ctx.route(/supabase\.co\/functions\/v1\/email/, (r) => { st.unf.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + query); await page.waitForTimeout(1800);
  if (follow) await page.evaluate(() => { authUser = { id: '00000000-0000-0000-0000-00000000000a', email: 'a@x.com' }; });
  return { ctx, page, st, errors, done: async () => { ok(errors.length === 0, tag + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : '')); await ctx.close(); } };
}
const sheetText = (page) => page.$eval('#v8SheetBody', (e) => e.innerText);

// 1. אורח: גרסה, תאריך ומה חדש, והסבר שצריך להיכנס כדי לעקוב
{ const t = await open('1-guest');
  await t.page.evaluate(() => openApk53('menu')); await t.page.waitForTimeout(700);
  const tx = await sheetText(t.page);
  ok(tx.includes('עודכן לגרסה ' + VER.version), '1: כתוב "עודכן לגרסה ' + VER.version + '"');
  ok(tx.includes('מה חדש בגרסה ' + VER.version) && VER.notes.every((n) => tx.includes(n)), '1: מופיע "מה חדש" עם כל השורות');
  ok(tx.includes('אחרי הכניסה לחשבון') && !(await t.page.$('#folBtn57')), '1: לאורח — הסבר במקום כפתור מעקב');
  await t.page.screenshot({ path: path.join(OUT, '1-download-window-guest.png') }); await t.done(); }

// 2. משתמש מחובר: לוחץ "לעקוב אחרי עדכונים"
{ const t = await open('2-follow', { follow: { on: false, ver: '' } });
  await t.page.evaluate(() => openApk53('menu')); await t.page.waitForTimeout(700);
  ok(await t.page.isVisible('#folBtn57'), '2: יש כפתור "לעקוב אחרי עדכונים"');
  await t.page.screenshot({ path: path.join(OUT, '2-download-window-follow-button.png') });
  await t.page.click('#folBtn57'); await t.page.waitForTimeout(700);
  ok(t.st.sets.length === 1 && t.st.sets[0].p_on === true && t.st.sets[0].p_ver === VER.version, '2: נשמר מעקב, מהגרסה הנוכחית');
  ok((await t.page.textContent('#folBtn57')).includes('עוקב/ת'), '2: הכפתור מראה שעוקבים');
  await t.page.screenshot({ path: path.join(OUT, '3-download-window-following.png') });
  await t.page.click('#folBtn57'); await t.page.waitForTimeout(600);
  ok(t.st.sets[1] && t.st.sets[1].p_on === false, '2: לחיצה נוספת מפסיקה את המעקב');
  await t.done(); }

// 3. פעמון: עוקב מגרסה קודמת — מקבל התראה; לא עוקב — לא מקבל
{ const t = await open('3-bell', { follow: { on: true, ver: '1.1' } });
  await t.page.evaluate(() => apkBell57()); await t.page.waitForTimeout(700);
  ok(await t.page.evaluate((v) => inbox.some((x) => x.id === 'apk-' + v), VER.version), '3: לעוקב מופיעה התראה בפעמון על גרסה ' + VER.version);
  await t.page.click('text=לנסות עכשיו, בלי הרשמה').catch(() => {}); await t.page.waitForTimeout(1200);
  await t.page.evaluate(() => { document.querySelectorAll('.overlay.open').forEach((o) => o.classList.remove('open')); openNotif(); }); await t.page.waitForTimeout(600);
  await t.page.screenshot({ path: path.join(OUT, '4-bell-new-version.png') }); await t.done(); }
{ const t = await open('3b-bell-not-following', { follow: { on: false, ver: '' } });
  await t.page.evaluate(() => apkBell57()); await t.page.waitForTimeout(500);
  ok(!(await t.page.evaluate(() => inbox.some((x) => /^apk-/.test(x.id)))), '3: מי שלא עוקב לא מקבל התראה'); await t.done(); }
{ const t = await open('3c-bell-same-version', { follow: { on: true, ver: VER.version } });
  await t.page.evaluate(() => apkBell57()); await t.page.waitForTimeout(500);
  ok(!(await t.page.evaluate(() => inbox.some((x) => /^apk-/.test(x.id)))), '3: מי שהתחיל לעקוב בגרסה הזאת לא מקבל עליה התראה'); await t.done(); }

// 4. באפליקציה בגרסה ישנה: רק פס קטן שיש עדכון
{ const t = await open('4-app', { ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/1.1', follow: { on: false, ver: '' } });
  await t.page.waitForTimeout(1500);
  ok(await t.page.isVisible('#apkUp56'), '4: באפליקציה 1.1 קופץ פס "יש עדכון"');
  ok((await t.page.textContent('#apkUp56')).includes(VER.version) && !(await t.page.$('#apkUp56 [download]')) && !(await t.page.isVisible('#v8Sheet.open')), '4: רק פס קטן עם מספר הגרסה, בלי חלון ובלי הורדה');
  await t.page.screenshot({ path: path.join(OUT, '5-app-update-notice.png') });
  await t.page.waitForTimeout(9500);
  ok(!(await t.page.$('#apkUp56')), '4: הפס נעלם לבד אחרי כמה שניות');
  await t.done(); }

// 5. הקישור מהמייל: הפסקת המעקב
{ const t = await open('5-unfollow-link', { query: '?appunf=' + 'ab'.repeat(18) });
  await t.page.waitForTimeout(1500);
  ok(t.st.unf.length === 1 && t.st.unf[0].appunf === 'ab'.repeat(18), '5: נשלחה בקשת הפסקת מעקב לשרת');
  ok((await t.page.textContent('#flash')).includes('הפסקת לעקוב'), '5: מופיעה הודעה שהמעקב הופסק');
  ok(!(await t.page.evaluate(() => location.search.includes('appunf'))), '5: הקוד נמחק מהכתובת');
  await t.page.screenshot({ path: path.join(OUT, '6-unfollow-from-email.png') }); await t.done(); }

// 6. מחשב
{ const t = await open('6-desktop', { ua: undefined, width: 1280, height: 800, follow: { on: true, ver: '1.2' } });
  await t.page.evaluate(() => openApk53('menu')); await t.page.waitForTimeout(700);
  await t.page.screenshot({ path: path.join(OUT, '7-download-window-computer.png') }); await t.done(); }

await browser.close(); server.close();
