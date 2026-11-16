// צילומי מסך + בדיקה: מי נכנס מהאפליקציה (APK) ומי מהאתר — ביומן "מי נכנס ומאיפה" בבק אופיס, וב"מי מחובר עכשיו"
//   OUT=תיקייה node shots-app-or-site.mjs
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
const V = [['a1', 'משה כהן', 'אפליקציה APK · טלפון · Android', 2], ['a2', 'יעקב לוי', 'אתר · טלפון · Android · Chrome', 9], ['', '', 'אתר · מחשב · Windows · Edge', 15],
  ['a3', 'דוד פרידמן', 'אפליקציה APK · טלפון · Android', 30], ['a4', 'שמואל ברגר', 'טלפון · Android · Chrome', 60 * 30]];
const D = {
  'rpc:staff_visits': V.map(([user_id, name, device, m]) => ({ at: ago(m), user_id: user_id || null, name, email: user_id ? user_id + '@gmail.com' : '', kind: 'visit', src: 'direct', landing: 'https://yamshopping.com/', referrer: '', device })),
  profiles: [['a1', 'משה כהן', 0.5], ['a2', 'יעקב לוי', 1], ['a3', 'דוד פרידמן', 1.5]].map(([id, name, m]) => ({ id, name, email: id + '@gmail.com', created_at: ago(9999), last_seen: ago(m) })),
  'rpc:admin_user_platforms': [{ user_id: 'a1', app_at: ago(1), web_at: ago(500), signup_from: 'app' }, { user_id: 'a2', app_at: null, web_at: ago(1), signup_from: 'web' }, { user_id: 'a3', app_at: ago(1), web_at: null, signup_from: 'app' }],
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
/* מה נשלח לשרת בכל כניסה */
for (const [ua, want, nm] of [['Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/1.0', /^אפליקציה APK · טלפון · Android$/, 'באפליקציה'],
  ['Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36', /^אתר · טלפון · Android · Chrome$/, 'בדפדפן בטלפון'], [null, /^אתר · מחשב/, 'בדפדפן במחשב']]) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, ...(ua ? { userAgent: ua } : {}) });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort());
  const page = await ctx.newPage(); await page.goto(BASE); await page.waitForTimeout(1200);
  const d = await page.evaluate(() => device41()); ok(want.test(d), nm + ': נרשם "' + d + '"' + (d.length <= 60 ? '' : ' (ארוך מדי!)'));
  await ctx.close();
}
for (const [w, h, nm] of [[1280, 900, 'computer'], [390, 1100, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('guests'); }, D);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => { const rows = [...document.querySelectorAll('#vis41b tbody tr')]; return { app: rows.filter((t) => t.querySelector('.pl-app')).length, web: rows.filter((t) => t.querySelector('.pl-web')).length, all: rows.length }; });
  ok(r.app === 2 && r.web === 2 && r.all === 5, nm + ': יומן הכניסות — 2 מהאפליקציה, 2 מהאתר, אחת ישנה בלי תגית');
  await page.evaluate(() => { document.querySelector('#vis41').scrollIntoView(); });
  await page.screenshot({ path: OUT + '/3-visits-' + nm + '.png' });
  await page.selectOption('#vis53p', 'app'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => [...document.querySelectorAll('#vis41b tbody tr')].filter((t) => t.style.display !== 'none').length) === 2, nm + ': סינון "רק מהאפליקציה" מראה 2');
  await page.screenshot({ path: OUT + '/4-visits-app-only-' + nm + '.png' });
  await page.evaluate(() => { const bo = document.querySelector('#bo'); if (bo) bo.classList.add('hidden'); openOnline(); });
  await page.waitForTimeout(1200);
  const o = await page.evaluate(() => ({ app: document.querySelectorAll('#onlineList .pl-app').length, web: document.querySelectorAll('#onlineList .pl-web').length }));
  ok(o.app === 2 && o.web === 1, nm + ': "מי מחובר עכשיו" — 2 באפליקציה, 1 באתר');
  await page.screenshot({ path: OUT + '/5-online-' + nm + '.png' });
  ok(!errors.length, nm + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}
await browser.close(); server.close();
