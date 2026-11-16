// צילומי מסך: 🕵️ "מי מעתיק את המחירים?" בבק אופיס ← 💰 מחירים (נתונים לדוגמה)
//   CHROMIUM=... OUT=תיקייה node shots-scrape-watch.mjs
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
const at = (min) => new Date(Date.now() - min * 60000).toISOString();
const row = (o) => Object.assign({ peer: '', limited: 0, blocked: 0, ua: '', stores: 0, queries: 0, cities: 0, ips: 0, eps: {}, samples: [], reasons: [], score: 0, first_at: at(300), last_at: at(20) }, o);
const SCRAPE = [
  row({ day: day(0), ip: '*', n: 9640, site: 3180, limited: 1210, ips: 214 }),
  row({ day: day(1), ip: '*', n: 7020, site: 2950, limited: 640, ips: 198 }),
  row({ day: day(0), ip: '185.220.101.33', n: 4212, site: 0, limited: 1102, ua: 'python-requests/2.32.3', uas: ['python-requests/2.32.3', 'curl/8.5.0'], stores: 186, queries: 300, cities: 41, city_list: ['תל אביב', 'חיפה', 'ירושלים', 'באר שבע'], eps: { prices: 4012, stores: 200 }, samples: ['חלב', 'במבה', 'ביצים', 'שמן', 'קוטג'], reasons: ['bot', 'direct', 'direct_many', 'stores', 'queries', 'volume', 'limited', 'hosting'], score: 12,
    geo: { country_code: 'DE', country: 'גרמניה', region: 'Hesse', city: 'Frankfurt am Main', lat: 50.11, lng: 8.682, asn: 9009, org: 'M247 Europe SRL', hosting: true }, accounts: [] }),
  row({ day: day(1), ip: '185.220.101.33', n: 3900, site: 0, limited: 600, ua: 'python-requests/2.32.3', stores: 150, queries: 280, eps: { prices: 3900 }, reasons: ['bot', 'direct', 'direct_many', 'stores', 'queries', 'volume', 'limited'], score: 11,
    geo: { country_code: 'DE', country: 'גרמניה', region: 'Hesse', city: 'Frankfurt am Main', lat: 50.11, lng: 8.682, asn: 9009, org: 'M247 Europe SRL', hosting: true } }),
  row({ day: day(0), ip: '45.83.64.12', peer: '76.76.21.9', n: 2310, site: 2310, ua: 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/130.0', stores: 0, queries: 300, cities: 1, city_list: ['בני ברק'], eps: { compare: 2310 }, samples: ['אורז', 'טחינה', 'פסטה'], reasons: ['bot', 'queries', 'volume'], score: 6,
    who: ['u:11111111-2222-4333-8444-555555555555'],
    geo: { country_code: 'IL', country: 'ישראל', region: 'Tel Aviv', city: 'Ramat Gan', lat: 32.082, lng: 34.81, asn: 12400, org: 'Partner Communications Ltd.' },
    accounts: [{ id: '11111111-2222-4333-8444-555555555555', name: 'משה כהן', email: 'moshe.test@example.com', how: 'login', at: at(500) }, { id: 'g1', name: '', email: '', how: 'guest', at: at(900) }] }),
  row({ day: day(2), ip: '91.204.12.7', n: 64, site: 0, ua: 'curl/8.5.0', stores: 3, queries: 6, eps: { health: 10, prices: 54 }, samples: ['חלב'], reasons: ['bot', 'direct'], score: 3,
    geo: { country_code: 'NL', country: 'הולנד', city: 'Amsterdam', lat: 52.374, lng: 4.89, org: 'DigitalOcean, LLC', hosting: true } }),
  row({ day: day(0), ip: '84.13.86.86', n: 5400, site: 0, ua: 'yam-collector/1.0', eps: { health: 5400 }, own: true, geo: { label: 'own' } }),
  row({ day: day(0), ip: '160.79.106.131', n: 120, site: 0, ua: 'Claude-User', eps: { prices: 120 }, geo: { label: 'claude', country: 'ארצות הברית', org: 'Anthropic, PBC' } }),
  row({ day: day(0), ip: '84.229.17.140', peer: '76.76.21.9', n: 88, site: 88, ua: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', queries: 31, cities: 2, eps: { compare: 70, cities: 18 },
    geo: { country_code: 'IL', country: 'ישראל', city: 'Jerusalem', lat: 31.769, lng: 35.216, org: 'Bezeq International' }, accounts: [{ id: 'u2', name: 'רבקה לוי', email: 'rivka.test@example.com', how: 'site', at: at(30) }] }),
];
const TILE = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e8eef3"/><path d="M0 128H256M128 0V256" stroke="#c9d4dd"/></svg>';
const D = { scrape_watch: SCRAPE, 'site_config:one': { value: { blocked: [{ ip: '185.220.101.0/24', note: 'סקריפט python', at: at(60) }, { ip: '84.13.86.86', note: '', at: at(90) }] } } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
for (const [w, h, nm] of [[1280, 1400, '2-computer'], [390, 2400, '1-phone']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 1 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort()); await ctx.route(/\/api\/prices\//, (r) => r.abort());
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ contentType: 'image/svg+xml', body: TILE }));
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('prices'); }, D);
  await page.waitForTimeout(900);
  await page.evaluate(() => { const c = document.querySelector('#swCard'); c.querySelector('details').open = true; c.scrollIntoView(); });
  await page.waitForTimeout(200);
  await page.locator('#swCard').screenshot({ path: OUT + '/' + nm + '.png' });
  await page.locator('#swCard tr.swrow').nth(1).click(); await page.waitForTimeout(300);
  await page.locator('#swCard .swdrow').first().screenshot({ path: OUT + '/' + nm + '-details.png' });
  console.log(nm, errors.length ? '❌ ' + errors.join(' | ') : '✅');
  await ctx.close();
}
await browser.close(); server.close();
