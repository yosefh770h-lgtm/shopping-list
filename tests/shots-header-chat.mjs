// צילומי מסך: 💬 התכתבות עם האתר ליד הפעמון, ותפריט ⚙️ בלי כפילויות; ואיך משתמש רואה הודעה מהאתר.
//   OUT=/dir node shots-header-chat.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots-header-chat'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', svg: 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const now = Date.now();
const MSGS = [
  { id: 'm1', user_id: 'u1', from_staff: false, read_by_user: true, body: 'שלום, אפשר להוסיף את הסניף שלנו ברחובות?', created_at: new Date(now - 26 * 3600e3).toISOString() },
  { id: 'm2', user_id: 'u1', from_staff: true, read_by_user: false, body: 'שלום! הסניף נוסף 🙂\nעכשיו אפשר לבחור אותו ב"מחירים וחנויות".', created_at: new Date(now - 20 * 60e3).toISOString() },
];
async function run(name, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
  await ctx.route(/supabase\.co/, (r) => { const u = r.request().url();
    r.fulfill({ status: 200, contentType: 'application/json', body: /support_messages/.test(u) && r.request().method() === 'GET' ? JSON.stringify(MSGS) : '[]' }); });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:' + server.address().port + '/index.html'); await page.waitForTimeout(2500);
  await page.evaluate(() => { authUser = { id: 'u1', email: 'a@b.c' }; state.user = { name: 'יוסף', email: 'a@b.c' }; try { hideLogin(); } catch (e) {} });
  await page.evaluate(() => loadChat()); await page.waitForTimeout(800);
  const hdr = await page.evaluate(() => { const c = document.querySelector('#btnChat'), b = document.querySelector('#btnBell'), r = c.getBoundingClientRect();
    return { vis: r.width > 0 && getComputedStyle(c).display !== 'none', nextToBell: c.nextElementSibling === b, badge: document.querySelector('#chatBadge').textContent, bell: document.querySelector('#bellBadge').textContent }; });
  ok(hdr.vis && hdr.nextToBell, name + ': 💬 מופיע בראש המסך ליד הפעמון');
  ok(hdr.badge === '1', name + ': מספר הודעות חדשות על 💬');
  await page.screenshot({ path: `${OUT}/${name}-1-ראש-המסך-עם-הודעה.png` });
  await page.evaluate(() => document.querySelector('#btnMenu').click()); await page.waitForTimeout(500);
  const menu = await page.evaluate(() => { const vis = (s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; };
    return { share: vis('#miShareSite'), notif: vis('#miNotif'), chatTop: document.querySelector('#miChatSite').closest('details[data-g="talk"]') !== null }; });
  ok(!menu.share && !menu.notif, name + ': בתפריט אין "שתפו את האתר" ואין "התראות ועדכונים"');
  ok(menu.chatTop, name + ': "התכתבות עם האתר" נשאר בתוך "קשר עם האתר"');
  await page.screenshot({ path: `${OUT}/${name}-2-תפריט-הגדרות.png` });
  await page.evaluate(() => { document.querySelector('#hMenu').classList.remove('open'); document.querySelector('#btnBell').click(); }); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}-3-ההודעה-בפעמון.png` });
  await page.keyboard.press('Escape'); await page.evaluate(() => { document.querySelectorAll('.open').forEach((x) => x.classList.remove('open')); });
  await page.evaluate(() => document.querySelector('#btnChat').click()); await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/${name}-4-חלון-ההתכתבות.png` });
  ok(!errors.length, name + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
const THREADS = [
  { user_id: 'u7', name: 'משה כהן', email: 'moshe@example.com', unread: 2, last_body: 'יש בעיה עם הסריקה של הקבלה', last_from_staff: false, last_at: new Date(now - 5 * 60e3).toISOString() },
  { user_id: 'u8', name: 'דוד לוי', email: 'david@example.com', unread: 0, last_body: 'תודה רבה!', last_from_staff: true, last_at: new Date(now - 3 * 3600e3).toISOString() },
];
const U7 = [
  { id: 'a1', user_id: 'u7', from_staff: false, read_by_staff: false, body: 'שלום, יש בעיה עם הסריקה של הקבלה', author_name: 'משה כהן', created_at: new Date(now - 6 * 60e3).toISOString() },
  { id: 'a2', user_id: 'u7', from_staff: false, read_by_staff: false, body: 'זה לא קורא את המחירים', author_name: 'משה כהן', created_at: new Date(now - 5 * 60e3).toISOString() },
];
async function runAdmin(name, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
  let threads = THREADS;
  await ctx.route(/supabase\.co/, (r) => { const u = r.request().url();
    if (/rpc\/support_threads/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(threads) });
    if (/support_messages/.test(u) && r.request().method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/u7/.test(u) ? U7 : []) });
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:' + server.address().port + '/index.html'); await page.waitForTimeout(2500);
  await page.evaluate(() => { authUser = { id: 'adm', email: 'adm@b.c' }; state.user = { name: 'מנהל', email: 'adm@b.c' }; myRole = 'admin'; try { hideLogin(); } catch (e) {} });
  await page.evaluate(() => window.admChatBadge()); await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.querySelector('#chatBadge').textContent === '2' && !document.querySelector('#chatBadge').hidden), name + ': מנהל — על 💬 מספר ההודעות שלא נקראו מכל המשתמשים');
  ok(await page.evaluate(() => document.querySelector('#btnChat').title === 'הודעות מהמשתמשים'), name + ': מנהל — הכפתור נקרא "הודעות מהמשתמשים"');
  await page.screenshot({ path: `${OUT}/${name}-מנהל-1-ראש-המסך.png` });
  await page.evaluate(() => document.querySelector('#btnChat').click()); await page.waitForTimeout(1000);
  ok(await page.evaluate(() => !!document.querySelector('#adm161')), name + ': מנהל — לחיצה על 💬 פותחת את רשימת השיחות עם המשתמשים');
  await page.screenshot({ path: `${OUT}/${name}-מנהל-2-רשימת-השיחות.png` });
  await page.evaluate(() => document.querySelector('[data-th="u7"]').click()); await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/${name}-מנהל-3-שיחה-עם-משתמש.png` });
  threads = THREADS.map((t) => ({ ...t, unread: 0 }));
  await page.evaluate(() => document.querySelector('#v8Sheet').classList.remove('open')); await page.waitForTimeout(800);
  ok(await page.evaluate(() => document.querySelector('#chatBadge').hidden), name + ': מנהל — אחרי קריאה וסגירה המספר יורד');
  ok(!errors.length, name + ': מנהל — בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run('טלפון', { width: 390, height: 800 }, true);
await run('מחשב', { width: 1280, height: 860 }, false);
await runAdmin('טלפון', { width: 390, height: 800 }, true);
await runAdmin('מחשב', { width: 1280, height: 860 }, false);
await browser.close(); server.close();
