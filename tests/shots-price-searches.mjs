// צילומי מסך: סטטיסטיקת "איפה הכי זול" בבק אופיס ← 💰 מחירים
//   CHROMIUM=... OUT=תיקייה node shots-price-searches.mjs
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
const STUB = `window.__stub=function(D){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>Promise.resolve({data:D[k]||[],error:null}).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:()=>Promise.resolve({data:{},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;
const day = (k) => new Date(Date.now() - k * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const days = []; for (let k = 29; k >= 0; k--) if (k % 9 !== 4) { const n = Math.round(8 + (29 - k) * 1.6 + (k % 7 === 1 ? 14 : 0) + (k * 7) % 5); days.push({ day: day(k), n, people: Math.round(n * 0.55) }); }
const total = days.reduce((a, x) => a + x.n, 0);
const TOP = [['חלב', 148, 92, 81], ['ביצים', 97, 51, 60], ['לחם', 88, 37, 55], ['במבה', 74, 49, 44], ['קוטג\'', 61, 33, 40], ['שמן', 52, 30, 35], ['אורז', 47, 22, 31], ['חלות', 44, 29, 28], ['עוף', 39, 26, 25], ['טיטולים', 36, 30, 21], ['נייר טואלט', 33, 18, 22], ['קפה', 30, 21, 19]].map(([q, n, single, people]) => ({ q, n, single, people }));
const D = { 'rpc:admin_price_search_stats': { total, users: 118, guests: 187, single: Math.round(total * 0.68), lists: total - Math.round(total * 0.68), yami: 64, repeat: 96,
  modes: { city: Math.round(total * 0.62), near: Math.round(total * 0.21), mine: Math.round(total * 0.12), store: total - Math.round(total * 0.62) - Math.round(total * 0.21) - Math.round(total * 0.12) },
  days, top: TOP, cities: [{ city: 'בני ברק', n: 412 }, { city: 'ירושלים', n: 233 }, { city: 'בית שמש', n: 121 }, { city: 'אלעד', n: 64 }, { city: 'מודיעין עילית', n: 49 }],
  recent: [{ at: new Date(Date.now() - 4 * 60000).toISOString(), name: '', guest: true, staff: false, mode: 'city', src: 'site', city: 'בני ברק', items: ['חלב'], n: 1 },
    { at: new Date(Date.now() - 11 * 60000).toISOString(), name: 'משה כ.', guest: false, staff: false, mode: 'near', src: 'site', city: '', items: ['חלב', 'לחם', 'ביצים', 'קוטג\'', 'במבה', 'שמן', 'אורז', 'עוף'], n: 14 },
    { at: new Date(Date.now() - 26 * 60000).toISOString(), name: 'יעקב', guest: false, staff: false, mode: 'city', src: 'yami', city: 'ירושלים', items: ['טיטולים'], n: 1 }] } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
for (const [w, h, nm] of [[1280, 1900, '2-computer'], [390, 2600, '1-phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 1 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort()); await ctx.route(/\/api\/prices\//, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('prices'); }, D);
  await page.waitForTimeout(900);
  await page.evaluate(() => { const c = document.querySelector('#psCard'); c.querySelector('details').open = true; c.scrollIntoView(); });
  await page.waitForTimeout(200);
  await page.locator('#psCard').screenshot({ path: OUT + '/' + nm + '.png' });
  console.log(nm, errors.length ? '❌ ' + errors.join(' | ') : '✅');
  await ctx.close();
}
await browser.close(); server.close();
