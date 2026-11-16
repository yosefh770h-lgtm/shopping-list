// בדיקה: אפליקציה 1.9. שחרור גרסה לפי משתמשים, והפס "יש גרסה חדשה" לפי מה שמותר לטלפון.
//   CHROMIUM=/path/chrome node shots-app-release69.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); if (req.method === 'HEAD') { res.end(); return; } fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const base = 'http://localhost:' + server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
async function app(answer) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'he-IL', isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/1.9' });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: /app_notices_for/.test(r.request().url()) ? JSON.stringify([{ id: 'n1', title: 'משה, עוד מעט נגמרים המבצעים', body: 'הערב', url: '', created_at: '2026-11-04T10:00:00Z' }]) : '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript((ans) => {
    window.YamApp = { appInfo: () => JSON.stringify({ ver: '1.9', code: 10, selfUpdate: true, release: true, inbox: true, notif: 'granted', bg: true, shabbat: true }),
      releaseCheck: () => setTimeout(() => window.yamNat66('release', ans), 50), notifState: () => 'granted', askNotify: () => {}, setBg: () => {}, installUpdate: () => {},
      inboxLink: () => setTimeout(() => window.yamNat66('token', 'ab'.repeat(24)), 30), inboxOn: () => {}, clearChat: () => {}, notify: (t, b, tag) => (window.__notes = window.__notes || []).push(tag + '|' + t) };
  }, answer);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/index.html'); await page.waitForTimeout(6500);
  const pill = await page.evaluate(() => { const p = document.querySelector('#apkUp56'); return p ? p.textContent : ''; });
  const notes = await page.evaluate(() => window.__notes || []);
  await ctx.close(); return { pill, errors, notes };
}
let r = await app('{"version":"2.0","notes":"תיקון בסורק"}');
ok(/2\.0/.test(r.pill), 'גרסה ששוחררה לטלפון הזה מופיעה כ"יש גרסה חדשה" ' + r.pill);
ok(!r.errors.length, 'בלי שגיאות JS ' + r.errors.join(' | '));
ok(r.notes.length === 1 && r.notes[0].startsWith('notice:n1|משה'), 'כשהאפליקציה פתוחה, התראה מהבק אופיס מוצגת מיד ' + JSON.stringify(r.notes));
r = await app('{}');
ok(!r.pill, 'טלפון שהגרסה לא שוחררה אליו לא רואה "יש גרסה חדשה"');

// בק אופיס: מסך השחרור
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: 'he-IL' });
const inserted = [], notices = [];
await ctx.route(/supabase\.co/, (r) => { const u = r.request().url(), m = r.request().method();
  if (/rpc\/admin_user_list/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: '11111111-1111-1111-1111-111111111111', name: 'משה', email: 'moshe@x.com' }, { id: '22222222-2222-2222-2222-222222222222', name: 'דוד', email: 'david@x.com' }]) });
  if (/app_notices/.test(u) && m === 'POST') { notices.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }); }
  if (/app_releases/.test(u) && m === 'POST') { inserted.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }); }
  r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); });
await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base + '/index.html'); await page.waitForTimeout(2500);
ok(await page.evaluate(() => !!document.querySelector('#boNav [data-s="releases"]')), 'בבק אופיס יש "🚀 שחרור גרסה לאפליקציה"');
await page.evaluate(() => { window.uiConfirm = async () => true; uiConfirm = window.uiConfirm; authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; state.user = { name: 'בודק', email: 'owner@x.com' }; openBO('releases'); }); await page.waitForTimeout(2500);
await page.fill('#v69', '2.0');
await page.click('[data-au69="except"]');
await page.fill('#q69', 'דוד <david@x.com>'); await page.press('#q69', 'Enter');
ok(await page.evaluate(() => /דוד/.test(document.querySelector('#ch69').textContent)), 'בוחרים משתמש מהרשימה');
await page.click('#go69'); await page.waitForTimeout(1200);
ok(inserted.length === 1 && inserted[0].version === '2.0' && inserted[0].audience === 'except' && inserted[0].users[0] === '22222222-2222-2222-2222-222222222222', 'שחרור "לכולם חוץ מ" נשמר עם המשתמש שנבחר ' + JSON.stringify(inserted));
await page.evaluate(() => boShow('phonenote')); await page.waitForTimeout(1200);
ok(await page.evaluate(() => !!document.querySelector('#boNav [data-s="phonenote"]')), 'בבק אופיס יש "📲 התראה לטלפון"');
await page.fill('#nt169', '{שם}, עוד מעט נגמרים המבצעים');
await page.click('[data-nau69="only"]');
await page.fill('#nq69', 'משה <moshe@x.com>'); await page.press('#nq69', 'Enter');
ok(await page.evaluate(() => document.querySelector('#npv69').textContent.startsWith('משה, עוד מעט')), 'בתצוגה {שם} מתחלף בשם של המשתמש');
await page.click('#ngo69'); await page.waitForTimeout(1200);
ok(notices.length === 1 && notices[0].audience === 'only' && notices[0].users[0] === '11111111-1111-1111-1111-111111111111' && notices[0].title.includes('{שם}'), 'התראה רק למשה נשמרת ' + JSON.stringify(notices));
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
ok(!errors.length, 'בלי שגיאות JS בבק אופיס ' + errors.join(' | '));
await browser.close(); server.close();
