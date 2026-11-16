// צילומי מסך + בדיקה: לחיצה על מספר המחוברים פותחת "מי מחובר עכשיו" (גם טלפונים שהאפליקציה פתוחה בהם, ומי שהוריד ממקום אחר),
// דגם הטלפון ועדכון "עדיין בשימוש" מהאפליקציה, וסימון הסרה והתקנה מחדש בבק אופיס ← 👀 מבקרים
//   OUT=תיקייה node shots-online-reinstall.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const STUB = `window.__stub=function(D){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>new Promise(r=>setTimeout(r,60)).then(()=>({data:D[k]||[],error:null})).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:()=>Promise.resolve({data:{},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const day = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const A = (o) => Object.assign({ vers: [{ v: o.app_ver, at: ago(3000) }], email: o.user_id ? o.user_id + '@gmail.com' : '', days_used: 1, opens: 3, daily: [day(0)], first_day: day(0), last_day: day(0),
  prev_at: null, prev_sure: null, next_at: null, next_sure: null }, o);
const D = {
  profiles: [{ id: 'u1', name: 'משה כהן', email: 'u1@gmail.com', created_at: ago(9000), last_seen: ago(1) }, { id: 'u4', name: 'שמואל ברגר', email: 'u4@gmail.com', created_at: ago(5000), last_seen: ago(2) },
    { id: 'u2', name: 'יעקב לוי', email: 'u2@gmail.com', created_at: ago(7000), last_seen: ago(300) }],
  'rpc:site_stats': { online: 2, users: 3 },
  'rpc:admin_user_platforms': [{ user_id: 'u1', app_at: ago(1), web_at: ago(500) }, { user_id: 'u4', app_at: ago(900), web_at: ago(2) }],
  'rpc:staff_apk_activity': [
    A({ dev_no: 1, user_id: 'u1', name: 'משה כהן', last_at: ago(1), app_ver: '2.1', device: 'טלפון · Android · SM-A525F', via: 'site' }),
    A({ dev_no: 2, user_id: null, name: '', last_at: ago(2), app_ver: '2.0', device: 'טלפון · Android · Redmi Note 12', via: 'other' }),
    A({ dev_no: 3, user_id: 'u5', name: 'אהרן שטרן', last_at: ago(3), app_ver: '2.1', device: 'טלפון · Android · SM-A145F', via: 'other', prev_at: ago(60 * 26), prev_sure: true }),
    A({ dev_no: 4, user_id: 'u6', name: 'נחום רוזן', last_at: ago(95), app_ver: '1.9', device: 'טלפון · Android · Pixel 6a', via: 'other' }),
    A({ dev_no: 5, user_id: 'u5', name: 'אהרן שטרן', last_at: ago(60 * 26), first_day: day(20), last_day: day(1), daily: [day(20), day(1)], days_used: 9, app_ver: '2.0', device: 'טלפון · Android · SM-A145F', via: 'other', next_at: ago(60 * 25), next_sure: true }),
    A({ dev_no: 6, user_id: null, name: '', last_at: ago(60 * 24 * 40), first_day: day(60), last_day: day(40), daily: [day(40)], app_ver: '1.8', device: 'טלפון · Android', via: 'other' }),
  ],
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const APPUA = 'Mozilla/5.0 (Linux; Android 13; SM-A525F Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/2.1';
const rec = `window.__calls=[];window.__rec=function(){const o=sb.rpc.bind(sb);sb.rpc=(n,a)=>{__calls.push([n,a]);return n==='apk_log'||n==='apk_ping'?Promise.resolve({data:true,error:null}):n==='apk_seen'?Promise.resolve({data:window.__seen!==false,error:null}):o(n,a);};};`;
/* 1. באפליקציה: דגם הטלפון נשלח, וכל 2 דקות "עדיין בשימוש" */
{ const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, userAgent: APPUA });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.addInitScript(STUB); await ctx.addInitScript(rec);
  const page = await ctx.newPage(); await page.clock.install(); await page.goto(BASE); await page.evaluate((D) => { sb = __stub(D); __rec(); }, D);
  await page.clock.runFor(5000);
  const pg = await page.evaluate(() => __calls.filter((x) => x[0] === 'apk_ping'));
  ok(pg.length === 1 && / · SM-A525F$/.test(pg[0][1].p_device) && !/Build|wv/.test(pg[0][1].p_device), 'באפליקציה: נשלח דגם הטלפון (' + (pg[0] && pg[0][1].p_device) + ')');
  await page.clock.runFor(121000);
  ok(await page.evaluate(() => __calls.filter((x) => x[0] === 'apk_seen').length === 1), 'באפליקציה: אחרי 2 דקות נשלח "עדיין בשימוש" (apk_seen)');
  ok(await page.evaluate(() => __calls.filter((x) => x[0] === 'apk_ping').length === 1), 'באפליקציה: "עדיין בשימוש" לא סופר פתיחה נוספת');
  await page.evaluate(() => { window.__seen = false; }); await page.clock.runFor(121000);
  ok(await page.evaluate(() => __calls.filter((x) => x[0] === 'apk_ping').length === 2), 'באפליקציה: אחרי חצות (אין שורה להיום) — נשלח דיווח רגיל');
  await ctx.close(); }
{ const ctx = await browser.newContext({ viewport: { width: 400, height: 800 } });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.addInitScript(STUB); await ctx.addInitScript(rec);
  const page = await ctx.newPage(); await page.clock.install(); await page.goto(BASE); await page.evaluate((D) => { sb = __stub(D); __rec(); }, D);
  await page.clock.runFor(250000);
  ok(!(await page.evaluate(() => __calls.some((x) => x[0] === 'apk_seen' || x[0] === 'apk_ping'))), 'באתר (לא באפליקציה): לא נשלח כלום על האפליקציה');
  await ctx.close(); }
/* 2. מנהל: לחיצה על המונה → מי מחובר עכשיו */
for (const [w, h, nm] of [[390, 1100, 'phone'], [1280, 900, 'computer']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate(async (D) => { sb = __stub(D); authUser = { id: 'own', email: 'admin@example.com', email_confirmed_at: 'x' }; myRole = 'admin'; await statsRefresh(); }, D);
  await page.waitForTimeout(400);
  ok(await page.isVisible('#stats16'), nm + ': המנהל רואה את מונה המחוברים');
  await page.click('#stats16'); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => document.querySelector('#onlineOverlay').classList.contains('open')), nm + ': לחיצה על המונה פותחת ישר את "מי מחובר עכשיו"');
  const t = await page.evaluate(() => document.querySelector('#onlineList').innerText);
  ok(/מחוברים עכשיו \(2\)/.test(t) && t.includes('משה כהן') && t.includes('שמואל ברגר'), nm + ': רואים את המחוברים לחשבון');
  ok(/האפליקציה פתוחה עכשיו \(3\)/.test(t) && t.includes('אורח/ת') && t.includes('אהרן שטרן'), nm + ': רואים 3 טלפונים שהאפליקציה פתוחה בהם — גם אורח');
  ok(/הורידו ממקום אחר ופתחו היום \(3\)/.test(t) && t.includes('נחום רוזן'), nm + ': רואים מי הוריד ממקום אחר ופתח היום, גם אם כבר סגר');
  ok(t.includes('התקין/ה מחדש'), nm + ': מסומן מי הסיר והתקין מחדש');
  await page.screenshot({ path: OUT + '/1-מי-מחובר-' + (nm === 'phone' ? 'טלפון' : 'מחשב') + '.png' });
  if (nm === 'phone') { await page.evaluate(() => document.body.classList.add('dark')); await page.waitForTimeout(150); await page.screenshot({ path: OUT + '/2-מי-מחובר-מצב-כהה.png' }); await page.evaluate(() => document.body.classList.remove('dark')); }
  /* 3. בבק אופיס: הסרה והתקנה מחדש */
  await page.click('#on56bo'); await page.waitForTimeout(1500);
  const u = await page.evaluate(() => ({ k: [...document.querySelectorAll('#apk55u .k55 small')].map((b) => b.textContent + '=' + b.previousElementSibling.textContent), tx: (document.querySelector('#apk55u') || {}).innerText || '' }));
  ok(u.k.some((x) => x === '🟢 האפליקציה פתוחה עכשיו=3') && u.k.some((x) => x === '🔁 הסירו והתקינו מחדש=1'), nm + ': בבק אופיס — 3 פתוחה עכשיו, 1 הסיר והתקין מחדש (' + u.k.join(' | ') + ')');
  ok(u.tx.includes('הוסרה') && u.tx.includes('הותקנה שוב ב-') && u.tx.includes('אולי הוסרה'), nm + ': ההתקנה הישנה מסומנת "הוסרה", וטלפון שלא נפתח חודש — "אולי הוסרה"');
  await page.selectOption('#apk55v', 'reinst'); await page.waitForTimeout(100);
  const n1 = await page.evaluate(() => document.querySelectorAll('#apk55u tbody tr').length);
  await page.selectOption('#apk55v', 'gone'); await page.waitForTimeout(100);
  const n2 = await page.evaluate(() => document.querySelectorAll('#apk55u tbody tr').length);
  ok(n1 === 1 && n2 === 2, nm + ': סינון "הסיר והתקין מחדש" (1) ו"הוסרו" (2)');
  await page.selectOption('#apk55v', 'now'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.querySelectorAll('#apk55u tbody tr').length) === 3, nm + ': סינון "פתוחה עכשיו" — 3');
  await page.selectOption('#apk55v', '');
  await page.evaluate(() => { const c = document.querySelector('#apk55u table') || document.querySelector('#apk55u'); c.scrollIntoView(); for (let e = c.parentElement; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop -= 60; break; } });
  await page.screenshot({ path: OUT + '/3-הסרה-והתקנה-מחדש-' + (nm === 'phone' ? 'טלפון' : 'מחשב') + '.png' });
  ok(!errors.length, nm + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}
await browser.close(); server.close();
