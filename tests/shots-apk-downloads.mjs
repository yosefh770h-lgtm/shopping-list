// צילומי מסך + בדיקה: מי מוריד את האפליקציה לאנדרואיד וכמה (בבק אופיס ← 👀 מבקרים), ומה נשלח לשרת בהורדה ובפתיחה הראשונה
//   OUT=תיקייה node shots-apk-downloads.mjs
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
const G = (city, country, ip, org) => ({ city, country, region: '', org, lat: 32.08, lng: 34.83 });
const R = [
  ['download', 'u1', 'משה כהן', false, 'טלפון · Android · Chrome', 'login', 5, G('Bnei Brak', 'ישראל', '', 'Partner Communications'), '79.177.12.4'],
  ['open', 'u1', 'משה כהן', false, 'טלפון · Android', 'install', 3, G('Bnei Brak', 'ישראל', '', 'Partner Communications'), '79.177.12.4'],
  ['download', null, '', true, 'טלפון · Android · Samsung', 'link', 40, G('Jerusalem', 'ישראל', '', 'Bezeq International'), '46.120.8.77'],
  ['download', 'u2', 'יעקב לוי', true, 'מחשב · Windows · Edge', 'menu', 60 * 26, G('Beit Shemesh', 'ישראל', '', 'HOT-NET'), '5.29.144.10'],
  ['open', 'u2', 'יעקב לוי', true, 'טלפון · Android', 'install', 60 * 25, G('Beit Shemesh', 'ישראל', '', 'HOT-NET'), '5.29.144.10'],
  ['download', 'u3', 'דוד פרידמן', false, 'טלפון · Android · Chrome', 'login', 60 * 24 * 3, G('Modiin Illit', 'ישראל', '', 'Cellcom'), '31.154.3.9'],
  ['download', null, '', true, 'טלפון · Android · Chrome', 'login', 60 * 24 * 6, null, '109.67.1.2'],
  ['open', null, '', true, 'טלפון · Android', 'install', 60 * 24 * 9, G('Ashdod', 'ישראל', '', 'Partner Communications'), '176.12.9.90'],
];
const D = {
  'rpc:staff_apk_downloads': R.map(([kind, user_id, name, guest, device, src, m, geo, ip], i) => ({ id: i + 1, at: ago(m), kind, user_id, name, email: user_id ? user_id + '@gmail.com' : '', guest: guest && !!user_id, ip, country: 'IL', geo, device, app_ver: kind === 'open' ? '1.1' : '', src, via: kind === 'open' ? (i === 7 ? 'other' : 'site') : '' })),
  'rpc:staff_apk_activity': (() => { const day = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
    const U = [['u1', 'משה כהן', 'site', '1.5', [0, 1, 2, 3], 9, ['1.3', '1.5']], ['u4', 'שמואל ברגר', 'other', '1.5', [0, 2, 5, 8, 12], 14, ['1.0', '1.3', '1.5']], [null, '', 'other', '1.3', [1, 4], 3, ['1.3']],
      ['u2', 'יעקב לוי', 'site', '1.4', [3], 1, ['1.4']], [null, '', '', '1.0', [6, 7, 9], 4, []]];
    return U.map(([user_id, name, via, app_ver, ds, opens, vs], i) => ({ vers: vs.map((v, j) => ({ v, at: ago((vs.length - j) * 1440 * 2 + 100) })), dev_no: i + 1, user_id, name, email: user_id ? user_id + '@gmail.com' : '', first_day: day(Math.max(...ds)), last_day: day(Math.min(...ds)),
      last_at: ago(Math.min(...ds) * 1440 + 30 + i * 7), days_used: ds.length, opens, app_ver, device: 'טלפון · Android', via, daily: ds.map(day).sort() })); })(),
  'rpc:admin_user_platforms': [{ user_id: 'u1', app_at: ago(1) }, { user_id: 'u2', app_at: ago(9) }, { user_id: 'u9', app_at: null }],
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const APPUA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
/* מה נשלח לשרת: לחיצה על ההורדה באתר, ופתיחה ראשונה באפליקציה (פעם אחת בלבד) */
const rec = `window.__calls=[];window.__rec=function(){const o=sb.rpc.bind(sb);sb.rpc=(n,a)=>{__calls.push([n,a]);return n==='apk_log'||n==='apk_ping'?Promise.resolve({data:true,error:null}):o(n,a);};};`;
for (const [ua, nm] of [[APPUA, 'site'], [APPUA + ' YamShoppingApp/1.1', 'app']]) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, userAgent: ua, acceptDownloads: true });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/\.apk$/, (r) => r.fulfill({ status: 204, body: '' }));
  await ctx.addInitScript(STUB); await ctx.addInitScript(rec);
  const page = await ctx.newPage(); await page.goto(BASE); await page.evaluate((D) => { sb = __stub(D); __rec(); }, D);
  if (nm === 'site') {
    await page.waitForTimeout(4500);
    ok(!(await page.evaluate(() => __calls.some((x) => x[0] === 'apk_ping'))), 'באתר (לא באפליקציה): לא נרשם שימוש באפליקציה');
    await page.evaluate(() => openApk53('login')); await page.waitForTimeout(300);
    await page.click('#apkDl53'); await page.waitForTimeout(500);
    const c = await page.evaluate(() => __calls.filter((x) => x[0] === 'apk_log'));
    ok(c.length === 1 && c[0][1].p_kind === 'download' && c[0][1].p_src === 'login' && /^[0-9a-f-]{36}$/.test(c[0][1].p_dev) && /^טלפון · Android/.test(c[0][1].p_device), 'באתר: לחיצה על ההורדה נרשמת (מסך הכניסה, מזהה מכשיר, סוג מכשיר)');
  } else {
    await page.waitForTimeout(5000);
    let c = await page.evaluate(() => __calls.filter((x) => x[0] === 'apk_log'));
    ok(c.length === 1 && c[0][1].p_kind === 'open' && c[0][1].p_ver === '1.1', 'באפליקציה: הפתיחה הראשונה נרשמת עם הגרסה');
    const pg = await page.evaluate(() => __calls.filter((x) => x[0] === 'apk_ping'));
    ok(pg.length === 1 && /^[0-9a-f-]{36}$/.test(pg[0][1].p_dev) && pg[0][1].p_ver === '1.1', 'באפליקציה: יום שימוש נרשם (פעם אחת ביום, עם הגרסה) — לא משנה מאיפה הורידו');
    await page.reload(); await page.evaluate((D) => { sb = __stub(D); __rec(); }, D); await page.waitForTimeout(5000);
    ok(!(await page.evaluate(() => __calls.some((x) => x[0] === 'apk_ping'))), 'באפליקציה: באותו יום לא נרשם שימוש שוב');
    ok(await page.evaluate(() => /\|1\.1$/.test(localStorage.getItem('yam_apk_ping55') || '')), 'באפליקציה: עדכון גרסה באותו יום נרשם (הגרסה חלק מהמפתח היומי)');
    c = await page.evaluate(() => __calls.filter((x) => x[0] === 'apk_log'));
    ok(c.length === 0, 'באפליקציה: בפתיחה השנייה לא נרשם שוב');
  }
  await ctx.close();
}
for (const [w, h, nm] of [[1280, 1000, 'computer'], [390, 1500, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('guests'); }, D);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ rows: document.querySelectorAll('#apk55b tbody tr').length, k: [...document.querySelectorAll('#apk55 .k55 b')].map((b) => b.textContent) }));
  ok(r.rows === 8 && r.k[0] === '5' && r.k[2] === '3', nm + ': 5 הורדות, 3 פתיחות, 8 שורות (' + r.k.join(',') + ')');
  await page.evaluate(() => { const c = document.querySelector('#apk55'); c.scrollIntoView(); for (let e = c.parentElement; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop -= 110; break; } window.scrollBy(0, -110); });
  await page.screenshot({ path: OUT + '/1-downloads-' + nm + '.png' });
  await page.selectOption('#apk55w', 'users'); await page.selectOption('#apk55k', 'download'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelectorAll('#apk55b tbody tr').length) === 3, nm + ': סינון "רק הורדות" של "רק רשומים" — 3');
  await page.evaluate(() => { const c = document.querySelector('#apk55'); c.scrollIntoView(); for (let e = c.parentElement; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop -= 110; break; } window.scrollBy(0, -110); });
  await page.screenshot({ path: OUT + '/2-downloads-registered-' + nm + '.png' });
  await page.selectOption('#apk55w', ''); await page.selectOption('#apk55k', ''); await page.waitForTimeout(150);
  const u = await page.evaluate(() => ({ rows: document.querySelectorAll('#apk55u tbody tr').length, k: [...document.querySelectorAll('#apk55u .k55 b')].map((b) => b.textContent), x: document.querySelectorAll('#apk55u .kd55.x').length }));
  ok(u.rows === 5 && u.k[0] === '5' && u.k[1] === '2' && u.k[2] === '2' && u.x === 2, nm + ': שימוש באפליקציה — 5 טלפונים, 2 היום, 2 ממקום אחר (' + u.k.join(',') + ')');
  const vv = await page.evaluate(() => ({ k: [...document.querySelectorAll('#apk55u .k55 b')].map((b) => b.textContent), up: [...document.querySelectorAll('#apk55u td[data-l="גרסה"]')].map((t) => t.textContent) }));
  ok(vv.k[4] === '2' && vv.k[5] === '3' && vv.k[6] === '2', nm + ': גרסאות — 2 באחרונה, 3 בישנה, 2 עדכנו (' + vv.k.join(',') + ')');
  ok(vv.up.some((t) => /1\.0 → 1\.3 → 1\.5/.test(t)) && vv.up.some((t) => /לא עדכן/.test(t)), nm + ': רואים מאיזו גרסה לאיזו עדכן, ומי לא עדכן');
  await page.selectOption('#apk55v', 'old'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.querySelectorAll('#apk55u tbody tr').length) === 3, nm + ': סינון "רק מי שבגרסה ישנה" — 3');
  await page.selectOption('#apk55v', 'upd'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.querySelectorAll('#apk55u tbody tr').length) === 2, nm + ': סינון "רק מי שעדכן" — 2');
  await page.evaluate(() => { const c = document.querySelector('#apk55u').previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling; c.scrollIntoView(); for (let e = c.parentElement; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop -= 20; break; } });
  await page.screenshot({ path: OUT + '/7-updated-only-' + nm + '.png' });
  await page.selectOption('#apk55v', '');
  await page.evaluate(() => { const c = document.querySelector('#apk55u').previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling; c.scrollIntoView(); for (let e = c.parentElement; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop -= 20; break; } });
  await page.screenshot({ path: OUT + '/4-app-usage-' + nm + '.png' });
  await page.selectOption('#apk55k', 'other'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelectorAll('#apk55b tbody tr').length === 1 && document.querySelectorAll('#apk55u tbody tr').length === 2), nm + ': סינון "רק מי שהוריד ממקום אחר"');
  await page.evaluate(() => { const c = document.querySelector('#apk55'); c.scrollIntoView(); for (let e = c.parentElement; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop -= 110; break; } window.scrollBy(0, -110); });
  await page.screenshot({ path: OUT + '/5-from-elsewhere-' + nm + '.png' });
  await page.evaluate(() => document.body.classList.add('dark')); await page.selectOption('#apk55w', ''); await page.selectOption('#apk55k', ''); await page.waitForTimeout(150);
  if (nm === 'phone') await page.screenshot({ path: OUT + '/3-downloads-dark-' + nm + '.png' });
  if (nm === 'phone') { await page.evaluate(() => { const c = document.querySelector('#apk55u').previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling; c.scrollIntoView(); for (let e = c.parentElement; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop -= 20; break; } }); await page.screenshot({ path: OUT + '/6-versions-dark-' + nm + '.png' }); }
  ok(!errors.length, nm + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}
await browser.close(); server.close();
