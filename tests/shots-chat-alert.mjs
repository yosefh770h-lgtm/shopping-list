// 💬 תשובה מצוות האתר: הודעה קופצת, שורה בפעמון, התראה גם בלי להדליק את הפעמון, וצ'אט פתוח שמתעדכן מיד.
//   OUT=/dir node shots-chat-alert.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots-chat-alert'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', svg: 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/2.0';
const now = Date.now();
const mine = { id: 'm1', user_id: 'u1', from_staff: false, read_by_user: true, read_by_staff: true, body: 'הסריקה של הקבלה לא עובדת לי', created_at: new Date(now - 3 * 3600e3).toISOString() };
const reply = (id, body, ago) => ({ id, user_id: 'u1', from_staff: true, read_by_user: false, author_name: 'צוות רשימת קניות', body, created_at: new Date(Date.now() - ago).toISOString() });

async function run(name, { app = false, dark = false, vp = { width: 360, height: 760 } } = {}) {
  const mobile = vp.width < 600;
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light', ...(app ? { userAgent: APP_UA } : {}) });
  let MSGS = [mine]; const marked = [];
  await ctx.route(/supabase\.co/, (r) => { const req = r.request(), u = req.url();
    if (/support_messages/.test(u) && req.method() === 'PATCH') { marked.push(u); MSGS = MSGS.map((m) => ({ ...m, read_by_user: true })); return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
    if (/support_messages/.test(u) && req.method() === 'GET') {
      const rows = /select=id&/.test(u) ? MSGS.filter((m) => m.from_staff && !m.read_by_user).map((m) => ({ id: m.id })) : MSGS;
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) }); }
    r.fulfill({ status: 200, contentType: 'application/json', body: /maybeSingle|support_status/.test(u) ? 'null' : '[]' }); });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript((app) => { localStorage.setItem('yam_tour165', '1'); window.__notes = [];
    // התראות: הדפדפן/הטלפון מרשה, אבל הפעמון לא הודלק (prefs.notify לא מוגדר)
    if (app) window.YamApp = { appInfo: () => '{"ver":"2.0","code":11}', notify: (t, b, tag) => __notes.push({ t, b, tag }), notifState: () => 'granted', askNotify: () => {} };
    else { const N = function (t, o) { __notes.push({ t, b: o && o.body, tag: o && o.tag }); }; N.permission = 'granted'; N.requestPermission = async () => 'granted'; window.Notification = N;
      Object.defineProperty(navigator, 'serviceWorker', { value: { getRegistration: () => Promise.resolve(null), register: () => Promise.reject(new Error('test')), addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); }
  }, app);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:' + server.address().port + '/index.html' + (app ? '?source=android' : '')); await page.waitForTimeout(2500);
  await page.evaluate((dark) => { authUser = { id: 'u1', email: 'a@b.c' }; state.user = { name: 'יוסף', email: 'a@b.c' }; try { hideLogin(); } catch (e) {}
    document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open'));
    if (dark && !document.body.classList.contains('dark')) document.body.classList.add('dark'); }, dark);
  await page.evaluate(() => loadChat()); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !document.querySelector('#chatPop')), name + ': בלי תשובה חדשה — שום דבר לא קופץ');

  // הצוות עונה
  MSGS = [mine, reply('s1', 'שלום יוסף! תיקנו את זה — נסו לסרוק שוב 🙂', 0)];
  await page.evaluate(() => loadChat()); await page.waitForTimeout(700);
  const pop = await page.evaluate(() => { const p = document.querySelector('#chatPop'); return p ? { show: p.classList.contains('show'), t: p.innerText } : null; });
  ok(pop && pop.show && /צוות האתר ענה לך/.test(pop.t) && /תיקנו/.test(pop.t), name + ': קופצת הודעה "צוות האתר ענה לך" עם תחילת התשובה');
  ok(await page.evaluate(() => document.querySelector('#chatBadge').textContent === '1' && !document.querySelector('#chatBadge').hidden), name + ': המספר 1 על 💬');
  const notes = await page.evaluate(() => __notes.filter((n) => /^chat:/.test(n.tag || '')));
  ok(notes.length === 1 && /תיקנו/.test(notes[0].b), name + ': התראה בטלפון/בדפדפן גם בלי להדליק את הפעמון');
  await page.screenshot({ path: `${OUT}/${name}-1-הודעה-קופצת.png` });

  // אותה הודעה לא קופצת פעמיים
  await page.evaluate(() => { document.querySelector('#chatPop [data-cpx]').click(); }); await page.waitForTimeout(400);
  await page.evaluate(() => loadChat()); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !document.querySelector('#chatPop')), name + ': אחרי ✕ — אותה הודעה לא קופצת שוב');
  ok((await page.evaluate(() => __notes.filter((n) => /^chat:/.test(n.tag || '')).length)) === 1, name + ': וגם ההתראה לא נשלחת פעמיים');

  // בפעמון
  await page.evaluate(() => document.querySelector('#btnBell').click()); await page.waitForTimeout(600);
  ok(await page.evaluate(() => { const r = document.querySelector('#nChat65'); return !!r && /הודעה חדשה מצוות האתר/.test(r.innerText); }), name + ': בפעמון יש שורה "יש לך הודעה חדשה מצוות האתר"');
  await page.screenshot({ path: `${OUT}/${name}-2-שורה-בפעמון.png` });
  await page.evaluate(() => document.querySelector('#nChat65').click()); await page.waitForTimeout(900);
  ok(await page.evaluate(() => !!document.querySelector('#v8Sheet.open #chatBox') && !document.querySelector('#notifOverlay.open')), name + ': לחיצה על השורה פותחת את הצ\'אט');
  ok(marked.length > 0, name + ': פתיחת הצ\'אט מסמנת את ההודעה כנקראה');

  // הצ'אט פתוח, באמצע כתיבה — מגיעה עוד תשובה
  await page.evaluate(() => { document.querySelector('#chatText').value = 'תודה, ניסיתי ו'; });
  MSGS = MSGS.concat(reply('s2', 'ואם זה עדיין לא עובד — שלחו לנו צילום מסך 📷', 5e3));
  await page.evaluate(() => loadChat()); await page.waitForTimeout(1200);
  const open = await page.evaluate(() => ({ txt: document.querySelector('#chatBox').innerText, draft: document.querySelector('#chatText').value, pop: !!document.querySelector('#chatPop') }));
  ok(/צילום מסך/.test(open.txt), name + ': בצ\'אט הפתוח התשובה החדשה מופיעה מיד');
  ok(open.draft === 'תודה, ניסיתי ו', name + ': הטקסט שבאמצע הכתיבה נשאר');
  ok(!open.pop, name + ': כשהצ\'אט פתוח לא קופצת הודעה מעליו');
  await page.screenshot({ path: `${OUT}/${name}-3-צאט-פתוח-מתעדכן.png` });

  // סוגרים את הצ'אט; הבדיקה הקלה (רק מזהים) מוצאת תשובה חדשה
  await page.evaluate(() => document.querySelector('#v8Sheet').classList.remove('open'));
  MSGS = MSGS.concat(reply('s3', 'נשמח לשמוע אם הסתדר 🙏', 1e3));
  ok(await page.evaluate(async () => { const before = performance.now(); await new Promise((r) => setTimeout(r, 31500)); return !!document.querySelector('#chatPop.show'); }), name + ': בלי לגעת בכלום — תוך 30 שניות קופצת התשובה החדשה');
  ok(!errors.length, name + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run('אפליקציה', { app: true });
await run('אתר-טלפון-כהה', { dark: true });
await run('מחשב', { vp: { width: 1280, height: 800 } });
await browser.close(); server.close();
