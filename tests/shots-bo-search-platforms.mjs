// צילומי מסך: בק אופיס ← 👥 משתמשים (מהאתר או מהאפליקציה) · 🔎 חיפוש מחירים · ותיקון תקלת 📦 מוצרים
//   CHROMIUM=... OUT=תיקייה node shots-bo-search-platforms.mjs
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
const U = [['a1', 'משה כהן', 'moshe@gmail.com', 'app', 3, null, 'app'], ['a2', 'יעקב לוי', 'yaakov@gmail.com', 'web', null, 40, 'web'], ['a3', 'דוד פרידמן', 'david@walla.co.il', 'both', 90, 5, 'web'],
  ['a4', 'שמואל ברגר', 'shmuel@gmail.com', 'app', 600, null, 'app'], ['a5', 'אברהם', 'avraham@gmail.com', 'web', null, 1500, 'web'], ['a6', 'יוסף', 'yosef@gmail.com', 'none', null, null, ''],
  ['a7', 'חיים ש.', 'chaim@gmail.com', 'both', 20, 3000, 'app'], ['a8', 'מנחם', 'menachem@gmail.com', 'web', null, 200, 'web']];
const P = (product, chain, price, origin, extra) => Object.assign({ id: Math.random().toString(36).slice(2), product, chain, branch: '', price, currency: 'ILS', barcode: '7290004131074', origin, status: 'approved', by_name: 'עדכון אוטומטי', confirms: 0, wrong: 0, is_deal: false, deal_text: '', created_at: ago(60 * 24 * 3), updated_at: ago(90) }, extra || {});
const D = {
  'rpc:admin_user_list': U.map(([id, name, email], i) => ({ id, name, email, created_at: ago(60 * 24 * (40 - i * 4)), last_seen: ago(i === 0 ? 1 : i * 70), role: '', confirmed: true, provider: 'email' })),
  'rpc:admin_user_platforms': U.map(([user_id, , , , app, web, signup_from]) => ({ user_id, app_at: app == null ? null : ago(app), web_at: web == null ? null : ago(web), signup_from })),
  prices: [P('חלב 3% תנובה 1 ליטר', 'רמי לוי', 5.9, 'collector:RamiLevy'), P('חלב 3% תנובה 1 ליטר', 'אושר עד', 6.1, 'collector:OsherAd'),
    P('חלב 3% תנובה 1 ליטר', 'יש חסד', 6.2, 'collector:Yeshinet', { is_deal: true, deal_text: '2 ב-11 ש"ח', valid_until: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10) }),
    P('חלב 3% תנובה 1 ליטר', 'שופרסל', 6.9, 'collector:Shufersal'), P('חלב 3% תנובה 1 ליטר', 'מכולת הרב', 7.4, '', { branch: 'רבי עקיבא 80, בני ברק', by_name: 'משה כהן', confirms: 3, created_at: ago(60 * 24 * 2), updated_at: null }),
    P('חלב 3% תנובה 1 ליטר', 'ויקטורי', 6.5, 'collector:Victory'),
    P('חלב 3% שטראוס 2 ליטר', 'רמי לוי', 11.4, 'collector:RamiLevy', { barcode: '7290000042442' }), P('חלב 3% שטראוס 2 ליטר', 'שופרסל', 12.9, 'collector:Shufersal', { barcode: '7290000042442' }),
    P('חלב 3% שטראוס 2 ליטר', 'מינימרקט השכונה', 13.5, '', { barcode: null, by_name: 'יעקב לוי', status: 'pending', created_at: ago(60 * 24 * 45), updated_at: null })].sort((a, b) => a.price - b.price),
};
const COMPARE = { items: [{ q: 'חלב 3% תנובה', qty: 1 }], missing: [], stores: [
  ['RamiLevy', 'רמי לוי', 'בני ברק — ז\'בוטינסקי', 'ז\'בוטינסקי 150', 5.9], ['Yeshinet', 'יש חסד', 'בני ברק', 'רבי עקיבא 120', 6.2, '2 ב-11 ש"ח', 5.5], ['OsherAd', 'אושר עד', 'בני ברק', 'השומר 3', 6.1],
  ['Shufersal', 'שופרסל', 'שופרסל שלי חזון איש', 'חזון איש 48', 6.9], ['Victory', 'ויקטורי', 'בני ברק', 'כהנמן 50', 6.5]].map(([chain, chain_name, name, address, price, deal, cost]) => ({ chain, chain_name, name, address, city: 'בני ברק', found: 1, total: cost || price, regular: price,
    lines: [{ q: 'חלב 3% תנובה', qty: 1, found: true, code: '7290004131074', name: 'חלב טרי 3% תנובה קרטון 1 ליטר', price, cost: cost || price, regular: price, deal: deal ? { text: deal } : null }] })) };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
let bad = 0;
for (const [w, h, nm] of [[1280, 1000, 'computer'], [390, 1500, 'phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 1 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.route(/\/api\/prices\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(COMPARE) }));
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('users'); }, D);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.querySelector('#plCard').scrollIntoView({ block: 'center' }); window.scrollBy(0, -120); });
  await page.screenshot({ path: OUT + '/1-users-' + nm + '.png' });
  await page.click('#plCard [data-plf="app"]'); await page.waitForTimeout(200);
  await page.evaluate(() => { document.querySelector('#utb').closest('.card').scrollIntoView(); });
  await page.screenshot({ path: OUT + '/2-users-app-only-' + nm + '.png' });
  await page.evaluate(() => boShow('pricefind')); await page.waitForTimeout(300);
  await page.fill('#pfQ', 'חלב 3%'); await page.click('#pfGo'); await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/3-price-search-' + nm + '.png', fullPage: true });
  await page.fill('#pfCity', 'בני ברק'); await page.click('#pfCityGo'); await page.waitForTimeout(500);
  await page.locator('#pfSrvCard').screenshot({ path: OUT + '/4-price-by-branch-' + nm + '.png' });
  /* התקלה מיומן התקלות: לחיצה כפולה מהירה על 📦 מוצרים (המסך נבנה מחדש באמצע הטעינה) */
  await page.evaluate(() => { boShow('products'); setTimeout(() => boShow('products'), 80); }); await page.waitForTimeout(1200);
  const pe = errors.filter((e) => /MutationObserver/.test(e));
  if (pe.length) bad++;
  console.log(nm, errors.length ? '❌ ' + errors.join(' | ') : '✅');
  await ctx.close();
}
await browser.close(); server.close();
if (bad) process.exit(1);
