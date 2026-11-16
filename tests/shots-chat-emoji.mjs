// צילומי מסך + בדיקה: 😊 בחירת אימוג'י בצ'אט שירות הלקוחות — אצל הלקוח, אצל המנהל באתר ובבק אופיס.
//   OUT=/dir node shots-chat-emoji.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots-chat-emoji'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', svg: 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const now = Date.now();
const MSGS = [
  { id: 'm1', user_id: 'u1', from_staff: false, read_by_user: true, read_by_staff: true, body: 'שלום, אפשר להוסיף את הסניף שלנו ברחובות?', author_name: 'משה כהן', created_at: new Date(now - 26 * 3600e3).toISOString() },
  { id: 'm2', user_id: 'u1', from_staff: true, read_by_user: true, body: 'שלום! הסניף נוסף 🙂👍', created_at: new Date(now - 20 * 60e3).toISOString() },
];
const THREADS = [{ user_id: 'u1', name: 'משה כהן', email: 'moshe@example.com', unread: 0, status: 'open', last_body: 'שלום! הסניף נוסף', last_from_staff: true, last_at: new Date(now - 20 * 60e3).toISOString() }];
async function setup(vp, mobile, dark) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  const sent = [];
  await ctx.route(/supabase\.co/, (r) => { const u = r.request().url(), m = r.request().method();
    if (/rpc\/(support_threads|admin_support_threads)/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(THREADS) });
    if (/support_messages/.test(u) && m === 'POST') { try { sent.push(JSON.parse(r.request().postData())); } catch (e) {} }
    r.fulfill({ status: 200, contentType: 'application/json', body: /support_messages/.test(u) && m === 'GET' ? JSON.stringify(MSGS) : /support_status/.test(u) && m === 'GET' ? JSON.stringify(THREADS) : '[]' }); });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:' + server.address().port + '/index.html'); await page.waitForTimeout(2500);
  if (dark) await page.evaluate(() => { document.body.classList.add('dark'); });
  return { ctx, page, errors, sent };
}
// לחיצה על 😊, בחירת אימוג'י, בדיקה שנכנס למקום הנכון
async function pickFlow(page, name, taSel, shot) {
  await page.fill(taSel, 'תודה רבה');
  await page.evaluate((s) => { const t = document.querySelector(s); t.focus(); t.setSelectionRange(4, 4); }, taSel);
  const btn = await page.evaluate((s) => { const t = document.querySelector(s), b = t.parentElement.querySelector('.emb45');
    if (!b) return null; const r = b.getBoundingClientRect(), tr = t.getBoundingClientRect(); return { inside: r.left >= tr.left - 1 && r.right <= tr.right + 1 && r.top >= tr.top - 1 && r.bottom <= tr.bottom + 1, txt: b.textContent }; }, taSel);
  ok(btn && btn.inside && btn.txt === '😊', name + ': כפתור 😊 בתוך שדה ההקלדה');
  await page.click(taSel + ' ~ .emb45'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.querySelector('.emp45') && document.querySelectorAll('.emp45 [data-emo]').length > 20), name + ': נפתח לוח אימוג׳י');
  await page.screenshot({ path: `${OUT}/${shot}-1-לוח-אימוגי.png` });
  await page.click('.emp45 [data-ecat="2"]'); await page.waitForTimeout(150);
  await page.click('.emp45 [data-emo="🙏"]'); await page.waitForTimeout(150);
  ok(await page.evaluate((s) => document.querySelector(s).value === 'תודה🙏 רבה', taSel), name + ': האימוג׳י נכנס במקום של הסמן');
  await page.click('.emp45 [data-ecat="4"]'); await page.waitForTimeout(150);
  await page.click('.emp45 [data-emo="🍎"]'); await page.waitForTimeout(150);
  ok(await page.evaluate((s) => document.querySelector(s).value === 'תודה🙏🍎 רבה', taSel), name + ': אחרי מעבר לקטגוריה — עוד אימוג׳י נכנס אחריו');
  await page.screenshot({ path: `${OUT}/${shot}-2-אוכל.png` });
  await page.click('.emp45 [data-ecat="0"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => [...document.querySelectorAll('.emp45 [data-emo]')].map((b) => b.dataset.emo).slice(0, 2).join('') === '🍎🙏'), name + ': "אחרונים" מציג את מה שבחרו');
  await page.click(taSel + ' ~ .emb45'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.querySelector('.emp45')), name + ': לחיצה נוספת סוגרת את הלוח');
  ok(await page.evaluate(() => { const bad = /\u{1F595}|\u{1F92C}|\u{1F4A9}|\u{1F351}|\u{1F346}/u; document.querySelector('.emb45').click(); const n = document.querySelectorAll('.emp45 [data-ecat]').length, all = []; for (let i = 1; i < n; i++) { document.querySelector('.emp45 [data-ecat="' + i + '"]').click(); document.querySelectorAll('.emp45 [data-emo]').forEach((b) => all.push(b.dataset.emo)); } document.querySelector('.emb45').click(); return all.length > 100 && !all.some((e) => bad.test(e)); }), name + ': אין בלוח אימוג׳י גסים');
  const typed = await page.evaluate((s) => { const t = document.querySelector(s); t.value = 'שלום 🖕🏻 עולם 🤬'; t.setSelectionRange(t.value.length, t.value.length); t.dispatchEvent(new Event('input', { bubbles: true })); const v = t.value; t.value = 'תודה🙏🍎 רבה'; return v; }, taSel);
  ok(typed === 'שלום  עולם ', name + ': אימוג׳י גס שמוקלד מהמקלדת נמחק (' + typed + ')');
}
async function customer(name, vp, mobile, dark) {
  const { ctx, page, errors, sent } = await setup(vp, mobile, dark);
  await page.evaluate(() => { authUser = { id: 'u1', email: 'a@b.c' }; state.user = { name: 'משה', email: 'a@b.c' }; try { hideLogin(); } catch (e) {} });
  await page.evaluate(() => document.querySelector('#btnChat').click()); await page.waitForTimeout(1200);
  await pickFlow(page, name + ' לקוח', '#chatText', name + '-לקוח');
  await page.evaluate(() => document.querySelector('#chatSend').click()); await page.waitForTimeout(800);
  ok(sent.some((r) => r.body === 'תודה🙏🍎 רבה'), name + ' לקוח: ההודעה עם האימוג׳י נשלחה');
  ok(!errors.length, name + ' לקוח: בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
async function adminSite(name, vp, mobile) {
  const { ctx, page, errors, sent } = await setup(vp, mobile, false);
  await page.evaluate(() => { authUser = { id: 'adm', email: 'adm@b.c' }; state.user = { name: 'מנהל', email: 'adm@b.c' }; myRole = 'admin'; try { hideLogin(); } catch (e) {} });
  await page.evaluate(() => document.querySelector('#btnChat').click()); await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelector('[data-th="u1"]').click()); await page.waitForTimeout(1000);
  await pickFlow(page, name + ' מנהל באתר', '#adm161txt', name + '-מנהל-באתר');
  await page.evaluate(() => document.querySelector('#adm161send').click()); await page.waitForTimeout(800);
  ok(sent.some((r) => r.body === 'תודה🙏🍎 רבה'), name + ' מנהל באתר: ההודעה עם האימוג׳י נשלחה');
  ok(!errors.length, name + ' מנהל באתר: בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
async function backoffice(name, vp, mobile, dark) {
  const { ctx, page, errors } = await setup(vp, mobile, dark);
  await page.evaluate(() => { authUser = { id: 'adm', email: 'adm@b.c' }; myRole = 'admin'; isAdmin = () => true; isStaff = () => true; try { hideLogin(); } catch (e) {}
    document.querySelector('#bo').classList.remove('hidden'); document.querySelectorAll('#boNav button').forEach((b) => { b.hidden = false; }); window.boShow('support'); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('#boMain [data-th="u1"]').click()); await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector('#supReply').scrollIntoView({ block: 'center' }));
  await pickFlow(page, name + ' בק אופיס', '#supReply', name + '-בק-אופיס');
  ok(!errors.length, name + ' בק אופיס: בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await customer('טלפון', { width: 390, height: 800 }, true);
await customer('מחשב', { width: 1280, height: 860 }, false);
await customer('טלפון-כהה', { width: 390, height: 800 }, true, true);
await adminSite('טלפון', { width: 390, height: 800 }, true);
await backoffice('מחשב', { width: 1280, height: 860 }, false);
await backoffice('טלפון', { width: 390, height: 800 }, true);
await browser.close(); server.close();
