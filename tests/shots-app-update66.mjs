// צילומי מסך + בדיקה: עדכון האפליקציה מתוך האפליקציה (1.3), רענון לגרסה חדשה של האתר, גודל תצוגה ("מסך קטן"),
// ✕ להסבר "מסמנים ✓", הסתרת הצעות, והתראות בטלפון באפליקציה.
//   OUT=תיקייה CHROMIUM=/path/chrome node shots-app-update66.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', css: 'text/css', svg: 'image/svg+xml' };
let ETAG = '"v1"', VER = '1.4';
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/download/app-version.json') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ version: VER, date: '2026-11-03', notes: ['עדכון מתוך האפליקציה בלחיצה', 'התראות בטלפון'] })); return; }
  const p = path.join(ROOT, decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream', ETag: ETAG });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const UA = (v) => 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/' + v;
// האפליקציה 1.3 מוסיפה לדף את window.YamApp — כאן מדמים אותה
const FAKE_APP = () => {
  window.__calls = [];
  window.YamApp = {
    appInfo: () => JSON.stringify({ ver: '1.3', code: 4, selfUpdate: true, notif: window.__notif || 'default', bg: true, shabbat: true, sdk: 34, model: 'Google Pixel 7' }),
    installUpdate: () => { window.__calls.push('install'); let p = 0; const t = setInterval(() => { p += 25; window.yamNat66('update', 'download', p, ''); if (p >= 75) { clearInterval(t); } }, 60); },
    notifState: () => window.__notif || 'default',
    askNotify: () => { window.__calls.push('ask'); window.__notif = 'granted'; setTimeout(() => window.yamNat66('perm', 'granted'), 50); },
    notify: (t, b) => window.__calls.push('notify:' + t),
    setBg: (a, b) => window.__calls.push('bg:' + a + ',' + b),
    saveFile: () => {},
  };
};

async function ctxFor({ width = 360, height = 740, ver = null, fake = false, dark = false }) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: width < 600, hasTouch: width < 600, colorScheme: dark ? 'dark' : 'light', ...(ver ? { userAgent: UA(ver) } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  if (fake) await ctx.addInitScript(FAKE_APP);
  return ctx;
}
async function openList(page) {
  await page.goto(BASE); await page.waitForTimeout(2200);
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open'));
    state.user = { name: 'בודק', email: '', offline: true }; curList().items = []; ['חלב', 'לחם', 'ביצים', 'עגבניות', 'גבינה'].forEach((n) => addItem(n, '')); setTab('list'); });
  await page.waitForTimeout(500);
}
const shot = async (page, n) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(OUT, n + '.png') }); };

// 1. האפליקציה 1.3 בטלפון: ✕ להסבר, גודל תצוגה, הסתרת הצעות
{
  const ctx = await ctxFor({ ver: '1.3', fake: true }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await openList(page);
  ok(await page.evaluate(() => !!document.querySelector('[data-tickx66]')), 'יש ✕ ליד "מסמנים ✓ ליד מה שקנית"');
  await shot(page, '1-list-tip-with-x');
  await page.click('[data-tickx66]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('[data-tickx66]') && /5 מוצרים ברשימה/.test(document.querySelector('.buybar .prog').textContent)), 'אחרי ✕ ההסבר נעלם, ובמקומו "5 מוצרים ברשימה"');
  await page.evaluate(() => { prefs.view66 = 'normal'; applyView66(); });
  await shot(page, '2-list-tip-hidden-normal-size');
  await page.evaluate(() => { prefs.view66 = 'auto'; applyView66(); });
  await page.evaluate(() => openView66()); await page.waitForTimeout(300);
  ok(await page.evaluate(() => /Pixel 7/.test(document.querySelector('.v66 .dev66').textContent)), 'בהגדרות התצוגה רואים את סוג הטלפון וגודל המסך');
  await shot(page, '3-display-settings');
  await page.click('[data-sz66="small"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.documentElement.classList.contains('sz66-s') && getComputedStyle(document.querySelector('.app')).zoom === '0.9' && Math.abs(document.querySelector('.tabs').getBoundingClientRect().bottom - innerHeight) < 3), '"מסך קטן" מקטין את כל המסך');
  await page.click('input[data-v66="sugg"]'); await page.click('input[data-v66="rail"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => prefs.noSugg66 && state.hideBotTips && getComputedStyle(document.querySelector('.siderail')).display === 'none'), 'אפשר להסתיר הצעות ואת הכפתורים בצד');
  ok(await page.evaluate(() => { inbox.length = 0; notifySugg('s1', 'x', ['חלב'], 'list'); return !inbox.some((x) => x.id === 's1'); }), 'כשההצעות מוסתרות — אין הצעות בפעמון');
  await shot(page, '4-display-small-selected');
  await page.evaluate(() => document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open'))); await page.waitForTimeout(200);
  await shot(page, '5-list-small-screen');
  // 2. גרסה חדשה לאפליקציה: הפס עם "לעדכן", חלון העדכון והתקדמות
  await page.evaluate(() => { prefs.view66 = 'auto'; prefs.noRail66 = false; savePrefs(); applyView66(); });
  ok(await page.waitForSelector('#apkUp56 .now66', { timeout: 6000 }).then(() => true, () => false), 'באפליקציה 1.3 בפס "יש גרסה חדשה" יש כפתור "לעדכן"');
  await shot(page, '6-update-pill');
  await page.click('#apkUp56 .now66'); await page.waitForTimeout(500);
  await shot(page, '7-update-sheet');
  await page.click('#nuGo66'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__calls.includes('install') && /75%/.test(document.querySelector('#nuSt66').textContent)), 'לחיצה על "לעדכן עכשיו" מורידה ומתקינה מתוך האפליקציה, עם התקדמות');
  await shot(page, '8-update-downloading');
  await page.evaluate(() => window.yamNat66('update', 'confirm', 100, '')); await page.waitForTimeout(200);
  await shot(page, '9-update-confirm');
  // 3. התראות בטלפון: הכרטיס בפעמון
  await page.evaluate(() => { document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); openNotif(); }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!document.querySelector('#nat66on')), 'בפעמון: "להפעיל התראות בטלפון"');
  await page.click('#nat66on'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__calls.includes('ask') && prefs.notify && !!document.querySelector('#nat66bg')), 'אישור התראות עובר לאנדרואיד, ואחריו אפשר לבחור מה לקבל');
  await page.evaluate(() => notify('t66', 'deal', 'הוזלה בחלב', 'עכשיו 5.90', 'list')); await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__calls.some((c) => /^notify:.*הוזלה בחלב/.test(c))), 'התראה מהפעמון מגיעה לטלפון דרך האפליקציה');
  await shot(page, '10-bell-phone-notifications');
  ok(!errors.length, 'אפליקציה: בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
// 4. מסך קטן אוטומטי בטלפון צר, ומצב כהה
{
  const ctx = await ctxFor({ width: 320, height: 640, ver: '1.3', fake: true, dark: true }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await openList(page); await page.evaluate(() => document.body.classList.add('dark'));
  ok(await page.evaluate(() => document.documentElement.classList.contains('sz66-xs')), 'טלפון צר מאוד (320) — אוטומטית "קטן מאוד"');
  await page.evaluate(() => openView66());
  await shot(page, '11-small-phone-auto-dark');
  ok(!errors.length, 'טלפון צר: בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
// 5. רענון לבד לגרסה חדשה של האתר כשחוזרים לאפליקציה
{
  ETAG = '"v1"';
  const ctx = await ctxFor({ ver: '1.2' }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await openList(page); await page.waitForTimeout(2500);
  ok(await page.evaluate(() => !document.querySelector('[data-v66]') && typeof check66 === 'function'), 'באפליקציה 1.2 (בלי עדכון מתוך האפליקציה) האתר עובד כרגיל');
  await page.evaluate(() => check66(false)); ETAG = '"v2"';
  // לא באמצע הקלדה — חוזרים לאפליקציה וטוענים את הגרסה החדשה
  const nav = page.waitForNavigation({ timeout: 8000 }).then(() => true, () => false);
  await page.evaluate(() => check66(true));
  ok(await nav, 'גרסה חדשה של האתר + חזרה לאפליקציה = נטען מחדש לבד');
  await page.waitForTimeout(2600);
  ok(await page.evaluate(() => /עודכנה/.test(document.querySelector('#flash').textContent)), 'אחרי הרענון: "האפליקציה עודכנה לגרסה החדשה"');
  await shot(page, '12-site-updated-flash');
  // באמצע הקלדה — לא מרעננים, רק כפתור "לעדכן עכשיו"
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  await page.evaluate(() => check66(false)); ETAG = '"v3"';
  await page.evaluate(() => { const t = document.querySelector('#botText') || document.querySelector('input'); t.value = 'חלב'; });
  await page.evaluate(() => check66(true)); await page.waitForTimeout(800);
  ok(await page.evaluate(() => !!document.querySelector('#upd66.show')), 'באמצע הקלדה לא מרעננים — מופיע "יש גרסה חדשה · לעדכן עכשיו"');
  await shot(page, '13-site-update-pill');
  ok(!errors.length, 'רענון: בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
// 6. באתר (לא באפליקציה) ובמחשב — בלי שגיאות
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const ctx = await ctxFor({ width: w, height: h }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await openList(page);
  ok(await page.evaluate(() => !document.documentElement.className.match(/sz66-/)), 'אתר ' + w + ': גודל רגיל');
  if (w > 1000) { await page.evaluate(() => openView66()); await shot(page, '14-computer-display-settings'); }
  ok(!errors.length, 'אתר ' + w + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await browser.close(); server.close();
