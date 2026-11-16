// בדיקה: אפליקציה 1.8 — הודעות מהצוות כהתראה בטלפון גם כשהאפליקציה סגורה.
// אחרי כניסה האתר מצמיד את הטלפון לחשבון, ביציאה מנתק, ופתיחת הצ'אט מורידה את ההתראה.
//   CHROMIUM=/path/chrome node shots-app-inbox68.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'he-IL', isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/1.8' });
const rpcs = [];
await ctx.route(/supabase\.co/, (r) => { const u = r.request().url(); const m = u.match(/rpc\/([a-z_]+)/); if (m) rpcs.push(m[1] + ':' + (r.request().postData() || ''));
  r.fulfill({ status: 200, contentType: 'application/json', body: /app_device_register/.test(u) ? '"ok"' : '[]' }); });
await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await ctx.addInitScript(() => {
  window.__calls = [];
  window.YamApp = {
    appInfo: () => JSON.stringify({ ver: '1.8', code: 9, selfUpdate: true, inbox: true, notif: 'granted', bg: true, shabbat: true }),
    inboxLink: () => { window.__calls.push('link'); setTimeout(() => window.yamNat66('token', 'ab'.repeat(24)), 30); },
    inboxOn: (on) => window.__calls.push('on:' + on), clearChat: () => window.__calls.push('clear'),
    notify: (t, b, tag) => window.__calls.push('notify:' + tag), notifState: () => 'granted', askNotify: () => {}, setBg: () => {}, installUpdate: () => {}, saveFile: () => {},
  };
});
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:' + server.address().port + '/index.html');
await page.evaluate(() => { authUser = { id: 'u1', email: 'a@b.c' }; state.user = { name: 'בודק', email: 'a@b.c' }; });
await page.waitForTimeout(7000);
ok(await page.evaluate(() => window.__calls.includes('link') && window.__calls.includes('on:true')), 'אחרי כניסה: הטלפון מוצמד לחשבון ומתחיל לקבל הודעות ברקע');
ok(rpcs.some((x) => x.startsWith('app_device_register:') && x.includes('ab'.repeat(24))), 'האתר שולח לשרת את המזהה של הטלפון');
await page.evaluate(() => { prefs.notify = true; notify('chat:m1', 'deal', 'הודעה חדשה מהאתר 💬', 'שלום!', ''); });
await page.waitForTimeout(500);
ok(await page.evaluate(() => window.__calls.includes('notify:chat:m1')), 'הודעה מהצוות כשהאפליקציה פתוחה עוברת לשיחה בטלפון (אותו מזהה, בלי כפילות)');
await page.evaluate(() => { try { hideLogin(); } catch (e) {} openChat(); }); await page.waitForTimeout(400);
ok(await page.evaluate(() => window.__calls.includes('clear')), 'פתיחת הצ\'אט מורידה את ההתראה מהטלפון');
await page.evaluate(() => doLogout()); await page.waitForTimeout(1500);
ok(await page.evaluate(() => window.__calls.includes('on:false')) && rpcs.some((x) => x.startsWith('app_device_forget:')), 'ביציאה מהחשבון הטלפון מתנתק ולא מקבל עוד הודעות');
ok(!errors.length, 'בלי שגיאות JS ' + errors.join(' | '));
await browser.close(); server.close();
