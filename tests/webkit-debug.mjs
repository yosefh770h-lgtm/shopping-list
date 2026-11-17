// זמני: מוצא מה גורם ל-index.html להיתקע ב-WebKit החדש
import { webkit } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../shopping-list-site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const ORIGIN = 'http://localhost:' + server.address().port;
const STUB = fs.readFileSync(path.join(HERE, 'smoke.mjs'), 'utf8').match(/const STUB = `([\s\S]*?)`;\n/)[1];
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SCRIPTS = [...HTML.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)];
console.log('scripts in index.html:', SCRIPTS.length);
const label = (i) => { const s = SCRIPTS[i][0]; const m = s.match(/src="([^"]+)"/); return '#' + i + ' ' + (m ? m[1] : 'inline@' + SCRIPTS[i].index + ' ' + s.slice(8, 90).replace(/\s+/g, ' ')); };
const withTimeout = (p, ms) => Promise.race([p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e: e.message.split('\n')[0] })), new Promise((r) => setTimeout(() => r({ ok: false, e: 'TIMEOUT' }), ms))]);

// keep: מספר הסקריפטים הראשונים שנשארים (השאר נמחקים מה-HTML). null = הכל
async function trial(keep, { verbose = false, user = true, extraInit = null } = {}) {
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.route(/supabase\.co\//, (r) => r.abort());
  await ctx.route(/\/vendor\/supabase-js[^/]*\/supabase\.js/, (r) => r.abort());
  await ctx.route(/\/index\.html/, (r) => {
    let html = HTML;
    if (keep != null) for (let i = SCRIPTS.length - 1; i >= keep; i--) html = html.slice(0, SCRIPTS[i].index) + html.slice(SCRIPTS[i].index + SCRIPTS[i][0].length);
    r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  });
  await ctx.addInitScript((st) => { localStorage.setItem('yam_tour165', '1'); if (st && !localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify(st)); }, user ? { user: { name: 'בודק', email: '', offline: true } } : null);
  await ctx.addInitScript(STUB);
  if (verbose) await ctx.addInitScript(() => { let n = 0; setInterval(() => console.log('hb', ++n, document.readyState, performance.getEntriesByType('resource').length), 1000); });
  if (extraInit) await ctx.addInitScript(extraInit);
  const page = await ctx.newPage();
  const t0 = Date.now();
  if (verbose) {
    page.on('console', (m) => console.log('  [console +' + (Date.now() - t0) + 'ms]', m.type(), m.text().slice(0, 200)));
    page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 200)));
    page.on('framenavigated', (f) => console.log('  [framenavigated +' + (Date.now() - t0) + 'ms]', f === page.mainFrame() ? 'main' : 'child', f.url().slice(0, 120)));
    page.on('load', () => console.log('  [load +' + (Date.now() - t0) + 'ms]'));
    page.on('domcontentloaded', () => console.log('  [domcontentloaded +' + (Date.now() - t0) + 'ms]'));
    page.on('dialog', (d) => { console.log('  [dialog]', d.type(), d.message()); d.dismiss().catch(() => {}); });
    page.on('crash', () => console.log('  [crash]'));
    page.on('request', (r) => console.log('  [request +' + (Date.now() - t0) + 'ms]', r.url().replace(ORIGIN, '').slice(0, 100)));
  }
  const g = await withTimeout(page.goto(ORIGIN + '/index.html', { waitUntil: 'commit' }), 15000);
  await new Promise((r) => setTimeout(r, 3000));
  const ev = await withTimeout(page.evaluate(() => document.readyState + ' paneList=' + !!document.querySelector('#paneList')), 6000);
  let extra = '';
  if (verbose) {
    for (let i = 0; i < 5 && !ev.ok; i++) {
      const a = await withTimeout(page.evaluate(() => 1), 3000);
      const b = await withTimeout(page.title(), 3000);
      const c = await withTimeout(page.locator('#paneList').count(), 3000);
      console.log('  retry', i, 'evaluate:', JSON.stringify(a), 'title:', JSON.stringify(b), 'locator.count:', JSON.stringify(c), 'frames:', page.frames().length, 'url:', page.url());
    }
  }
  await withTimeout(browser.close(), 10000);
  const hung = !ev.ok;
  console.log((keep == null ? 'ALL' : 'keep=' + keep + (keep ? ' (last: ' + label(keep - 1) + ')' : '')), 'goto:', g.ok ? 'ok' : g.e, 'evaluate:', ev.ok ? ev.v : ev.e, extra);
  return hung;
}

console.log('WebKit', (await (async () => { const b = await webkit.launch(); const v = b.version(); await b.close(); return v; })()));

// ניסוי 1: הדף המלא, כש-getSubscription מוחלף בתשובה ריקה
console.log('\n=== A: full page, pushManager.getSubscription stubbed ===');
await trial(null, { verbose: true, extraInit: () => { if (window.PushManager) PushManager.prototype.getSubscription = function () { return Promise.resolve(null); }; } });

// ניסוי 2: הדף המלא בלי service worker בכלל
console.log('\n=== B: full page, serviceWorker.register disabled ===');
await trial(null, { extraInit: () => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => new Promise(() => {}); } });

// ניסוי 3: דף מינימלי (privacy.html) — רק רישום sw.js ו-getSubscription. אם נתקע גם כאן, זה WebKit ולא הקוד שלנו
async function minimal(label, fn, swFile = 'sw.js') {
  const browser = await webkit.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const t0 = Date.now();
  page.on('console', (m) => console.log('  [console +' + (Date.now() - t0) + 'ms]', m.text().slice(0, 200)));
  await page.goto(ORIGIN + '/privacy.html');
  await page.evaluate(() => { let n = 0; setInterval(() => console.log('hb', ++n), 500); });
  const r1 = await withTimeout(page.evaluate(fn, swFile), 8000);
  const r2 = await withTimeout(page.evaluate(() => 'alive'), 4000);
  console.log(label, '→ step:', JSON.stringify(r1), '| after:', JSON.stringify(r2), '| permission:', JSON.stringify(await withTimeout(page.evaluate(() => typeof Notification !== 'undefined' ? Notification.permission : 'no Notification'), 3000)));
  await withTimeout(browser.close(), 10000);
}
console.log('\n=== C: minimal page ===');
await minimal('C1 register+ready', async (f) => { const r = await navigator.serviceWorker.register(f); await navigator.serviceWorker.ready; return 'ready ' + !!r.pushManager; });
await minimal('C2 register+ready+getSubscription', async (f) => { await navigator.serviceWorker.register(f); const r = await navigator.serviceWorker.ready; const s = await r.pushManager.getSubscription(); return 'sub=' + s; });
fs.writeFileSync(path.join(ROOT, 'empty-sw-debug.js'), '// empty\n');
await minimal('C3 empty SW + getSubscription', async (f) => { await navigator.serviceWorker.register(f); const r = await navigator.serviceWorker.ready; const s = await r.pushManager.getSubscription(); return 'sub=' + s; }, 'empty-sw-debug.js');
await minimal('C4 empty SW + permissionState', async (f) => { await navigator.serviceWorker.register(f); const r = await navigator.serviceWorker.ready; return 'perm=' + await r.pushManager.permissionState({ userVisibleOnly: true }); }, 'empty-sw-debug.js');
await minimal('C5 Notification.permission only', async () => 'perm=' + Notification.permission);
fs.unlinkSync(path.join(ROOT, 'empty-sw-debug.js'));
server.close();
process.exit(0);
