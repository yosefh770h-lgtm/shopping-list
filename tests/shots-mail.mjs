// צילומי מסך + בדיקה: 📧 המייל השבועי — בק אופיס (רשימה, עריכה עם צילומי מסך, נמענים, מי הסיר), המייל עצמו, ודף ההסרה / "אהבתי"
//   IMGS=תיקייה-עם-3-תמונות-png OUT=תיקייה node shots-mail.mjs
// (בונה את פונקציית השרת email עם esbuild כדי שהתצוגה המקדימה תהיה בדיוק המייל האמיתי)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const IMGS = process.env.IMGS ? fs.readdirSync(process.env.IMGS).filter((f) => /\.png$/i.test(f)).slice(0, 3).map((f) => path.join(process.env.IMGS, f)) : [];

// פונקציית השרת → מודול JS (בלי Deno.serve ובלי supabase-js)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mailfn-'));
const src = fs.readFileSync(path.resolve(HERE, '../supabase/functions/email/index.ts'), 'utf8')
  .replace(/^import \{ createClient \} from "npm:[^"]+";/m, 'const createClient: any = () => null;')
  .replace(/^Deno\.serve\(/m, '(globalThis as any).__noServe(');
fs.writeFileSync(path.join(tmp, 'fn.ts'), src);
execFileSync('npx', ['-y', 'esbuild@0.28.2', path.join(tmp, 'fn.ts'), '--format=esm', '--platform=neutral', '--outfile=' + path.join(tmp, 'fn.mjs'), '--log-level=warning'], { stdio: 'inherit' });
globalThis.Deno = { env: { get: () => '' } }; globalThis.__noServe = () => {};
const F = await import(path.join(tmp, 'fn.mjs'));

const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.png') ? 'image/png' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const ORIGIN = 'http://localhost:' + server.address().port;
const BASE = ORIGIN + '/index.html';
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
// שבת, מוצאי שבת, שישי ופרשת השבוע (בדיקת לוגיקה, בלי דפדפן)
{
  const cf = F.cfgOf({ hour: 10 }), w = (t) => F.sendWindow(cf, new Date(t));
  ok(w('2026-10-31T14:00:00Z') === 'shabbat' && w('2026-10-31T16:30:00Z') === '' && w('2026-10-31T21:30:00Z') === 'late', 'חלון: שבת סגור, מוצאי שבת פתוח עד 23:00');
  ok(w('2026-10-30T09:00:00Z') === '' && w('2026-10-30T14:00:00Z') === 'erev' && w('2027-04-22T08:00:00Z') === 'yomtov', 'חלון: שישי עד שעה וחצי לפני השקיעה, יום טוב סגור');
  { const e = F.cfgOf({ hour: 10, end_hour: 18 });
    ok(F.sendWindow(e, new Date('2026-11-02T16:30:00Z')) === 'late' && F.nextRun(e, new Date('2026-11-02T16:30:00Z')).toISOString() === '2026-11-03T08:00:00.000Z', 'שעות: עד שעת הסיום שנקבעה, והריצה הבאה — מחר ב-10:00 בדיוק');
    const e2 = F.cfgOf({ hour: 13, minute: 30 });
    ok(F.sendWindow(e2, new Date('2026-11-02T11:25:00Z')) === 'early' && F.sendWindow(e2, new Date('2026-11-02T11:30:00Z')) === '' && F.nextRun(e2, new Date('2026-11-02T09:02:00Z')).toISOString() === '2026-11-02T11:30:00.000Z', 'שעה מדויקת: 13:30 — שולח ב-13:30 ולא לפני');
    ok(F.nextRun(cf, new Date('2026-10-31T10:00:00Z')).toISOString() === '2026-10-31T16:05:00.000Z', 'הריצה הבאה אחרי שבת — במוצאי שבת אחרי צאת השבת'); }
  ok(w('2026-11-01T07:24:00Z') === 'early' && F.sendWindow(cf, new Date('2026-11-01T07:24:00Z'), true) === '' && F.sendWindow(cf, new Date('2026-11-01T05:00:00Z'), true) === 'early', 'חלון: לחיצה ידנית שולחת מיד (מ-08:00), האוטומטי מחכה לשעה שנקבעה');
  ok(F.parsha('2026-10-31') === 'וירא' && F.parsha('2025-05-24') === 'בהר-בחוקותי' && F.parsha('2022-04-23') === 'אחרי מות' && F.parsha('2025-04-19') === '' && F.parsha('2026-09-19') === 'האזינו', 'פרשת השבוע (ארץ ישראל)');
  ok(F.dateLine(new Date('2026-10-31T20:58:00Z')).startsWith('מוצאי שבת קודש פרשת וירא, כ"א בחשוון') && F.dateLine(new Date('2026-10-30T08:00:00Z')).startsWith('ערב שבת קודש פרשת וירא'), 'שורת התאריך: "מוצאי שבת קודש פרשת וירא"');
}
const ILD = (n) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() - n * 864e5));
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const IMG = (n) => 'https://ygyfodxfbebnkwdcbjrp.supabase.co/storage/v1/object/public/mail/shot' + n + '.jpg';

const C1 = { id: 'c1', subject: 'מה חדש ברשימת קניות: עדכוני השבוע', preheader: 'תקציב הבית · קרוב אליי · כמויות לפי מספר הנפשות', status: 'sending', auto: true, note: 'טיוטה אוטומטית',
  intro: 'ריכזנו עבורך את העדכונים והשיפורים שנוספו השבוע לאתר ולאפליקציה.', outro: 'תודה שבחרת ברשימת קניות. נשמח לשמוע ממך: אפשר להשיב ישירות למייל זה.', cta: 'לכניסה לאתר', created_at: ago(60 * 24 * 4), started_at: ago(60 * 24 * 2), send_at: ago(60 * 24 * 2),
  items: [
    { title: 'תקציב הבית', text: 'מעכשיו אפשר לראות בכל רגע כמה הוצאתם החודש על קניות, בחלוקה לפי חנויות וקטגוריות, וכמה נשאר מהתקציב שהגדרתם.', images: [IMG(1), IMG(3)], link: '' },
    { title: 'קרוב אליי', text: 'רשימת החנויות והמבצעים הקרובים ביותר אליכם, לפי המיקום הנוכחי, כולל ניווט בלחיצה.', image: IMG(2), link: '' },
    { title: 'כמויות לפי מספר הנפשות', text: 'יאמי ממליצה על הכמויות המתאימות לשבת ולחג לפי מספר הנפשות בבית.', images: [IMG(3), IMG(1), IMG(2)], link: '' },
  ] };
const C2 = { ...C1, id: 'c2', subject: '🛒 מה צריך לקנות השבוע?', status: 'scheduled', send_at: new Date(Date.now() + 3 * 864e5).toISOString(), started_at: null, created_at: ago(30), items: C1.items.slice(0, 1) };
const C3 = { ...C1, id: 'c3', subject: '🎉 ברוכים הבאים למייל השבועי', status: 'done', auto: false, note: '', created_at: ago(60 * 24 * 12), started_at: ago(60 * 24 * 11), finished_at: ago(60 * 24 * 3) };
const NAMES = ['משה כהן', 'יעקב לוי', 'דוד פרידמן', 'שמואל גולדברג', 'אברהם רוזנברג', 'יצחק שפירא', 'מנחם כץ', 'אליהו ברגר', 'חיים וייס', 'נחום הורוביץ'];
const RC = NAMES.map((n, i) => ({ user_id: 'u' + i, name: n, email: 'user' + (i + 1) + '@gmail.com', test: false, status: i === 8 ? 'bounced' : 'sent', sent_at: ago(60 * 24 * 2 - i * 3),
  delivered_at: i === 8 ? null : ago(60 * 24 * 2), opened_at: i % 3 !== 2 && i !== 8 ? ago(60 * 20 - i * 30) : null, opens: i % 3 === 0 ? 2 : 1, clicked_at: i % 2 === 0 && i !== 8 ? ago(60 * 19) : null, clicks: 1,
  liked_at: [0, 3, 4].includes(i) ? ago(60 * 18) : null, unsub_at: i === 7 ? ago(60 * 10) : null, complained_at: null, bounced_at: i === 8 ? ago(60 * 47) : null, error: '' }));
const D = {
  email_campaigns: [C2, C1, C3],
  'rpc:email_campaign_stats': [
    { campaign_id: 'c1', sent: 190, failed: 0, delivered: 187, opened: 104, clicked: 41, liked: 23, unsub: 2, complained: 0, bounced: 3, tests: 2 },
    { campaign_id: 'c3', sent: 742, failed: 1, delivered: 731, opened: 402, clicked: 166, liked: 88, unsub: 9, complained: 1, bounced: 11, tests: 3 }],
  'rpc:email_audience': { confirmed: 791, unsub: 12, bounced: 11, complained: 1, counts: { today: 95, month: 1010 } },
  'email_state:one': { last_run: ago(3), last_cron: ago(3), last_note: 'cap reached', last_error: '' },
  'site_config:one': { value: { auto: true, draft_day: 4, send_day: 0, hour: 10, day_cap: 95, skip_empty: true } },
  'rpc:email_recipients': RC,
  'rpc:email_daily': [
    { day: ILD(0), campaign_id: 'c1', subject: C1.subject, sent: 95, failed: 0, opened: 31, clicked: 9, liked: 6, unsub: 0, tests: 1, first_at: ago(200), last_at: ago(60) },
    { day: ILD(1), campaign_id: 'c1', subject: C1.subject, sent: 95, failed: 1, opened: 73, clicked: 32, liked: 17, unsub: 2, tests: 1, first_at: ago(60 * 24 + 200), last_at: ago(60 * 24 + 60) },
    { day: ILD(4), campaign_id: 'c3', subject: C3.subject, sent: 95, failed: 0, opened: 51, clicked: 20, liked: 9, unsub: 1, tests: 0, first_at: ago(60 * 96 + 200), last_at: ago(60 * 96 + 60) }],
  'rpc:email_day_recipients': RC.map((r) => ({ ...r, subject: C1.subject })),
  'rpc:email_unsubs': [
    { user_id: 'u7', name: 'אליהו ברגר', email: 'user8@gmail.com', weekly: false, status: 'ok', unsub_at: ago(60 * 10), unsub_how: 'link', unsub_reason: 'too_many', updated_at: ago(60 * 10) },
    { user_id: 'u11', name: 'פנחס גרין', email: 'user12@gmail.com', weekly: false, status: 'ok', unsub_at: ago(60 * 30), unsub_how: 'one-click', unsub_reason: '', updated_at: ago(60 * 30) },
    { user_id: 'u12', name: 'ברוך שטרן', email: 'user13@gmail.com', weekly: false, status: 'ok', unsub_at: ago(60 * 50), unsub_how: 'site', unsub_reason: '', updated_at: ago(60 * 50) },
    { user_id: 'u8', name: 'חיים וייס', email: 'user9@gmial.com', weekly: true, status: 'bounced', unsub_at: null, unsub_how: '', unsub_reason: '', updated_at: ago(60 * 47) }],
  'rpc:email_weekly_get:one': true,
  'rpc:email_left': { ready: 480, waiting: 98 },
  'rpc:email_cron_info': { cron: true, job: { schedule: '*/5 * * * *', active: true, jobid: 3 }, runs: [{ start: ago(3), status: 'succeeded', msg: '1 row' }] },
};
const STUB = `window.__stub=function(D){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>new Promise(r=>setTimeout(r,40)).then(()=>({data:D[k]!==undefined?D[k]:(D[k.replace(':one','')]||[]),error:null})).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:(n,o)=>Promise.resolve({data:window.__fn?window.__fn(n,o&&o.body):{},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;
const previewHtml = F.render(C1, 'preview', 'משה כהן', new Date('2026-11-01T08:00:00Z'));
const FN = `window.__fn=function(n,b){if(n!=='email')return {};b=b||{};
  if(b.status)return {ok:true,key:true,webhook:true,window:'',next_run:new Date(Date.now()+40*6e4).toISOString(),next_run_tomorrow:new Date(Date.now()+20*36e5).toISOString(),counts:{today:95,month:1010}};
  if(b.preview)return {ok:true,subject:${JSON.stringify(C1.subject)},html:${JSON.stringify(previewHtml.html)}};
  if(b.test)return {ok:true,to:b.to};return {ok:true};};`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
async function ctxFor(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.route(/yamshopping\.com\/logo\.png/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(ROOT, 'logo.png')) }));
  await ctx.route(/supabase\.co\/storage\/v1\/object\/public\/mail\/shot(\d)\.jpg/, (r) => { const n = +/shot(\d)/.exec(r.request().url())[1]; const f = IMGS[n - 1];
    return f ? r.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(f) }) : r.abort(); });
  await ctx.route(/functions\/v1\/email/, async (r) => { const CH = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CH }); const b = JSON.parse(r.request().postData() || '{}');
    const res = b.act === 'info' ? { ok: true, email: 'm*****@gmail.com', weekly: true, test: false } : b.act === 'unsub' ? { ok: true, email: 'm*****@gmail.com', weekly: false } : b.act === 'like' ? { ok: true, liked: true } : { ok: true };
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(res), headers: CH }); });
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB); await ctx.addInitScript(FN);
  return ctx;
}
const top = (page, sel) => page.evaluate((sel) => { const c = document.querySelector(sel); if (!c) return; c.scrollIntoView(); for (let e = c.parentElement; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop -= 120; break; } }, sel);

// 1) המייל עצמו — טלפון ומחשב
for (const [w, nm] of [[390, 'phone'], [1100, 'computer']]) {
  const ctx = await ctxFor(w, 900); const page = await ctx.newPage();
  await page.setContent(previewHtml.html, { waitUntil: 'load' }); await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + '/1-email-' + nm + '.png', fullPage: true }); await ctx.close();
}
ok((previewHtml.html.match(/object\/public\/mail\/shot/g) || []).length === 6 && previewHtml.html.includes('width="263"'), 'במייל: כמה צילומי מסך לחידוש (שתיים בשורה)');
ok(previewHtml.html.includes('mail.html?t=preview&a=unsub') && previewHtml.html.includes('a=like') && previewHtml.html.includes('שלום משה כהן') && previewHtml.html.includes('info@yamshopping.com') && previewHtml.html.includes('כ&quot;א בחשוון תשפ&quot;ז'), 'במייל: תאריך עברי, שלום + שם, כתובת לתשובה, "מועיל?" וקישור הסרה');

// 2) בק אופיס
for (const [w, h, nm] of [[1280, 1100, 'computer'], [390, 1700, 'phone']]) {
  const ctx = await ctxFor(w, h); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => { if (!/sandboxed/.test(e.message)) errors.push(e.message); });
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('mail'); }, D);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ nav: !!document.querySelector('#boNav [data-s="mail"]'), items: document.querySelectorAll('#boMain .item[data-id]').length, txt: document.querySelector('#boMain').innerText }));
  ok(r.nav && r.items === 3 && r.txt.includes('נפתחו 104') && r.txt.includes('אהבו 23'), nm + ': רשימת המיילים עם נשלחו/נפתחו/אהבו');
  await page.screenshot({ path: OUT + '/2-backoffice-' + nm + '.png' });
  ok(r.txt.includes('480 מוכנים לקבל עכשיו') && r.txt.includes('98 מחכים') && r.txt.includes('השעון האוטומטי רץ'), nm + ': כמה נשארו + השעון האוטומטי רץ');
  ok(r.txt.includes('השליחה האוטומטית הבאה: מחר') && /בעוד \d+:\d\d:\d\d שעות/.test(r.txt), nm + ': ⏱️ השליחה הבאה + ספירה לאחור');
  ok(r.txt.includes('נשלח לפי יום') && /היום.*נשלחו 95/.test(r.txt) && (r.txt.match(/לא נשלח/g) || []).length === 11, nm + ': 📅 נשלח לפי יום — היום, אתמול, וימים בלי שליחה');
  await top(page, '#boMain [data-day]'); await page.screenshot({ path: OUT + '/2b-daily-' + nm + '.png' });
  await page.click('#boMain [data-day]'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.querySelectorAll('#boMain tr[data-q]').length === 10 && document.querySelector('#boMain').innerText.includes('10 אנשים שונים')), nm + ': 👥 למי נשלח היום — 10, בלי כפולים');
  await page.screenshot({ path: OUT + '/2c-day-' + nm + '.png' });
  await page.click('#dBack'); await page.waitForTimeout(600);
  await top(page, '#mAuto'); await page.screenshot({ path: OUT + '/3-auto-' + nm + '.png' });
  // עריכה
  await page.click('[data-id="c2"] [data-act="edit"]'); await page.waitForTimeout(400);
  await page.evaluate(() => { const its = document.querySelectorAll('[data-item]'); });
  await page.evaluate(() => { document.querySelector('#meAdd').click(); });
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelectorAll('[data-item]').length === 2 && document.querySelectorAll('[data-item="0"] [data-rmimg]').length === 2 && !!document.querySelector('[data-item="0"] input[type=file][multiple]')), nm + ': עריכה — אפשר להוסיף חידוש, ובחידוש 2 תמונות + העלאת כמה בבת אחת');
  await page.evaluate(() => { const r = document.querySelectorAll('[data-item]')[1]; r.querySelector('[data-f="title"]').value = '📍 קרוב אליי'; r.querySelector('[data-f="text"]').value = 'החנויות והמבצעים הכי קרובים אליכם.'; });
  await top(page, '#meSubj'); await page.screenshot({ path: OUT + '/4-edit-' + nm + '.png' });
  await page.click('#mePrevBtn'); await page.waitForTimeout(800); await top(page, '#mFrame');
  await page.screenshot({ path: OUT + '/5-edit-preview-' + nm + '.png' });
  // נמענים
  await page.evaluate(() => window.boShow('mail')); await page.waitForTimeout(800);
  if (await page.$('[data-id="c1"] [data-act="rcpt"]')) {
    await page.click('[data-id="c1"] [data-act="rcpt"]'); await page.waitForTimeout(600);
    ok(await page.evaluate(() => document.querySelectorAll('#boMain tr[data-q]').length === 10), nm + ': נמענים — 10 שורות');
    await page.screenshot({ path: OUT + '/6-recipients-' + nm + '.png' });
    await page.click('[data-rf="liked"]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.querySelectorAll('#boMain tr[data-q]').length === 3), nm + ': סינון "אהבו" — 3');
    await page.click('#rBack'); await page.waitForTimeout(600);
  } else ok(false, nm + ': לא חזר לרשימה');
  await page.click('#boMain [data-unsubs]'); await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + '/7-unsubs-' + nm + '.png' });
  ok(!errors.length, nm + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}

// 3) דף ההסרה ו"אהבתי" (yamshopping.com/mail.html)
for (const [w, nm] of [[390, 'phone']]) {
  const ctx = await ctxFor(w, 760); const page = await ctx.newPage();
  await page.goto(ORIGIN + '/mail.html?t=0123456789abcdef0123456789abcdef&a=unsub'); await page.waitForTimeout(700);
  ok(await page.isVisible('#go'), 'דף ההסרה: כפתור להסרה');
  await page.screenshot({ path: OUT + '/8-unsubscribe-' + nm + '.png' });
  await page.check('input[value="too_many"]'); await page.click('#go'); await page.waitForTimeout(600);
  ok(await page.isVisible('#re'), 'אחרי ההסרה: אפשר לחזור');
  await page.screenshot({ path: OUT + '/9-unsubscribed-' + nm + '.png' });
  await page.goto(ORIGIN + '/mail.html?t=0123456789abcdef0123456789abcdef&a=like'); await page.waitForTimeout(700);
  await page.screenshot({ path: OUT + '/10-liked-' + nm + '.png' });
  await page.emulateMedia({ colorScheme: 'dark' }); await page.goto(ORIGIN + '/mail.html?t=0123456789abcdef0123456789abcdef&a=unsub'); await page.waitForTimeout(700);
  await page.screenshot({ path: OUT + '/11-unsubscribe-dark-' + nm + '.png' });
  await ctx.close();
}
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
