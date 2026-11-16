// בדיקה + צילומי מסך: מתג בבק אופיס (👗 ביגוד והמלצות) שמסתיר/מציג את ביגוד וחתונה לכל המשתמשים, באתר ובאפליקציה
//   OUT=תיקייה node shots-cloth-switch.mjs
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
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/1.0';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
// site_config בזיכרון: הבק אופיס כותב, והאתר קורא
const SETUP = (cfg0) => { const base = __stub({}); window.__CFG = cfg0; window.__ups = 0;
  const q = () => { const o = { select() { return o; }, eq() { return o; }, in() { return o; }, order() { return o; }, limit() { return o; },
    maybeSingle() { return Promise.resolve({ data: { value: JSON.parse(JSON.stringify(window.__CFG)) }, error: null }); },
    upsert(r) { if (r && r.key === 'collector') { window.__CFG = r.value; window.__ups++; } return Promise.resolve({ data: null, error: null }); },
    then(res, rej) { return Promise.resolve({ data: [], error: null }).then(res, rej); } }; return o; };
  sb = Object.assign({}, base, { from: (n) => n === 'site_config' ? q() : base.from(n) }); };
const segs = (page) => page.evaluate(() => [...document.querySelectorAll('#paneStores .seg [data-sview], #panePrices .seg [data-sview]')].map((b) => b.dataset.sview));
for (const [w, h, nm, app] of [[1280, 900, 'מחשב', false], [390, 844, 'טלפון-אפליקציה', true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 2, isMobile: w < 600, hasTouch: w < 600, ...(app ? { userAgent: APP_UA } : {}) });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort()); await ctx.route(/\/api\/prices\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate(SETUP, { public: true, stores_off: [] });
  await page.evaluate(() => { authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('clothing'); }); await page.waitForTimeout(1200);
  ok(await page.$eval('#clothShow18', (e) => e.checked).catch(() => null) === true, nm + ': בבק אופיס ← ביגוד יש מתג, והוא דלוק');
  await page.screenshot({ path: OUT + '/' + nm + '-1-בק-אופיס-מתג-דלוק.png' });
  await page.click('#clothShow18'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => window.__ups === 1 && window.__CFG.stores_off.includes('clothing') && window.__CFG.public === true), nm + ': כיבוי נשמר (ושאר ההגדרות לא נמחקו)');
  ok(await page.$eval('#clothShow18', (e) => !e.checked), nm + ': אחרי כיבוי המתג מראה כבוי');
  await page.evaluate(() => { const f = document.querySelector('#flash'); if (f) f.classList.remove('show'); });
  await page.screenshot({ path: OUT + '/' + nm + '-2-בק-אופיס-מתג-כבוי.png' });
  // צד המשתמש
  await page.evaluate(() => { document.querySelector('#boClose').click(); try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15,.upd66,[class*="updpill"]').forEach((e) => e.remove()); sb = null; authUser = null; srvCfg = JSON.parse(JSON.stringify(window.__CFG)); storesView = 'dir'; setTab('stores'); }); await page.waitForTimeout(600);
  ok(!(await segs(page)).includes('clothing'), nm + ': כבוי — אין כפתור ביגוד בלשונית החנויות');
  await page.screenshot({ path: OUT + '/' + nm + '-3-משתמש-בלי-ביגוד.png' });
  await page.evaluate(() => openClothing18('women')); await page.waitForTimeout(300);
  ok(await page.evaluate(() => storesView !== 'clothing' && !document.querySelector('#paneStores .cl18')), nm + ': כבוי — קישור/פתיחה של ביגוד לא מציג ביגוד');
  ok(await page.evaluate(() => v18BotPre('חנויות ביגוד')) === false, nm + ': כבוי — יאמי לא עונה על חנויות ביגוד');
  await page.evaluate(() => { srvCfg.stores_off = []; storesView = 'dir'; renderStores(); }); await page.waitForTimeout(300);
  ok((await segs(page)).includes('clothing'), nm + ': דלוק — כפתור הביגוד חוזר');
  await page.evaluate(() => openClothing18('women')); await page.waitForTimeout(400);
  ok(await page.evaluate(() => storesView === 'clothing' && !!document.querySelector('#paneStores .cl18')), nm + ': דלוק — ביגוד נפתח כרגיל');
  await page.screenshot({ path: OUT + '/' + nm + '-4-משתמש-עם-ביגוד.png' });
  ok(!errors.length, nm + ': בלי שגיאות בדף' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}
await browser.close(); server.close();
