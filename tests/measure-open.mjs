// מדידת זמן הפתיחה של האתר בטלפון איטי (המעבד מואט פי CPU, ברירת מחדל 6).
//   cd tests && node measure-open.mjs            — מודד את shopping-list-site
//   SITE=/נתיב/אחר node measure-open.mjs        — מודד תיקייה אחרת (למשל העתק של main להשוואה)
// שלוש פתיחות: ראשונה (בלי שום דבר שמור), שנייה (אחרי שה-service worker שמר), ושלישית בלי אינטרנט.
// נמדד: מתי הדף סיים להיקרא (DOMContentLoaded) ומתי הרשימה מוצגת (מסך הטעינה ירד).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.env.SITE || path.join(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site'));
const CPU = +process.env.CPU || 6;
const RUNS = +process.env.RUNS || 3;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
// כותרות המטמון כמו בשרת האמיתי (vercel.json → Caddy)
const cacheOf = (p) => /^\/(vendor|js)\//.test(p) ? 'public, max-age=31536000, immutable' : 'no-cache';
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const p = path.join(ROOT, u.replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': cacheOf(u) });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const STUB = `window.__stub=function(D){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>Promise.resolve({data:D[k]||[],error:null}).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:()=>Promise.resolve({data:{},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;

async function open(page, cdp) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const errors = [];
  const onErr = (e) => errors.push(e.message);
  page.on('pageerror', onErr);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // "הרשימה מוצגת" = מסך הטעינה (bootHide) ירד והרשימה בדף
  await page.waitForFunction(() => !document.getElementById('bootHide') && document.querySelector('#paneList'), null, { timeout: 120000, polling: 50 });
  const t = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), shown: Math.round(performance.now()) }; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  page.off('pageerror', onErr);
  return { ...t, errors };
}

const rows = [];
for (let i = 0; i < RUNS; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' });
  await ctx.route(/supabase\.co/, (r) => r.abort());
  await ctx.addInitScript((st) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); localStorage.setItem('yam_cookie_ok', '1'); }, { user: { name: 'בודק', email: '', offline: true } });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const first = await open(page, cdp);
  // מחכים שה-service worker יותקן וישמור הכל, ושהדפדפן ישמור את הקוד המהודר
  await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready.then(() => 1));
  await page.waitForTimeout(3000);
  const second = await open(page, cdp);
  await page.waitForTimeout(1500);
  const third = await open(page, cdp);
  await ctx.setOffline(true);
  await page.waitForTimeout(500);
  const offline = await open(page, cdp);
  await ctx.setOffline(false);
  rows.push({ first, second, third, offline });
  await ctx.close();
}
const med = (k, f) => { const v = rows.map((r) => r[k][f]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
console.log(`האתר: ${ROOT} · מעבד מואט פי ${CPU} · ${RUNS} מדידות (חציון, מילישניות)`);
for (const k of ['first', 'second', 'third', 'offline']) console.log(k.padEnd(8), 'DOMContentLoaded', String(med(k, 'dcl')).padStart(6), ' · הרשימה מוצגת', String(med(k, 'shown')).padStart(6));
const errs = [...new Set(rows.flatMap((r) => Object.values(r).flatMap((x) => x.errors)))];
if (errs.length) console.log('שגיאות בדף:', errs.join(' | '));
await browser.close(); server.close();
