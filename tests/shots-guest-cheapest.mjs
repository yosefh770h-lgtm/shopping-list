// צילומי מסך: "איפה הכי זול" למי שלא נכנס לחשבון (באפליקציה לפני הכניסה, או "בלי חשבון") — כשהמתג בבק אופיס דלוק לכולם
//   OUT=תיקייה OLD=index.html-ישן node shots-guest-cheapest.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  const p = u === 'old.html' && process.env.OLD ? process.env.OLD : path.join(ROOT, u || 'index.html');
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/';
const STORES = [{ store: '1:39', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'בני ברק', address: 'השומר 4', city: 'בני ברק' },
  { store: '4:7', chain: 'OSHER_AD', chain_name: 'אושר עד', name: 'בני ברק', address: 'ירושלים 50', city: 'בני ברק' },
  { store: '2:202', chain: 'SHUFERSAL', chain_name: 'שופרסל', name: 'בני ברק', address: "ז'בוטינסקי 80", city: 'בני ברק' }];
const P = { 'חלב': { n: 'חלב תנובה 3% 1 ליטר', p: [6.2, 5.9, 7.1] }, 'במבה': { n: 'במבה 80 גרם', p: [4.5, 4.4, 5.2] }, 'לחם': { n: 'לחם אחיד פרוס', p: [7.8, 7.8, 7.8] } };
function api(u) { const pth = u.pathname.replace('/api/prices', ''); const sp = u.searchParams;
  if (pth === '/cities') return [{ city: 'בני ברק', stores: 3 }];
  const items = (sp.get('items') || sp.get('q') || '').split('|').filter(Boolean).map((x) => ({ q: x.replace(/\*.*$/, ''), qty: 1 }));
  const res = STORES.map((s, i) => { let total = 0; const lines = items.map((it) => { const k = Object.keys(P).find((k) => it.q.includes(k)); if (!k) return { q: it.q, qty: 1, found: false };
    const v = P[k].p[i]; total += v; return { q: it.q, qty: 1, found: true, code: '1', name: P[k].n, price: v, cost: v, regular: v, deal: null }; });
    return { ...s, total: +total.toFixed(2), regular: +total.toFixed(2), found: lines.filter((l) => l.found).length, lines }; }).sort((a, b) => b.found - a.found || a.total - b.total);
  return { items, stores: res, missing: [] }; }
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36' });
await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
// השרת של Supabase מדומה: המתג "להציג לכולם" דלוק, ואין משתמש מחובר
await ctx.route(/supabase\.co\//, (r) => { const u = new URL(r.request().url());
  if (u.pathname.endsWith('/site_config') && (u.searchParams.get('key') || '').includes('collector'))
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: { public: true } }) });
  if (u.pathname.startsWith('/rest/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  return r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }); });
await ctx.route(/\/api\/prices\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api(new URL(r.request().url()))) }));
await ctx.addInitScript(() => { try { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'אורח', email: '', offline: true }, history: [] }));
  localStorage.setItem('yam_tour165', '1'); } catch (e) {} });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
async function open(file) { const page = await ctx.newPage(); page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(BASE + file + '?source=android'); await page.waitForTimeout(2500);
  await page.evaluate(() => { if (typeof hideLogin === 'function') hideLogin(); document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open'));
    const l = curList(); if (!l.items.length) { ['חלב', 'במבה', 'לחם'].forEach((n) => l.items.push({ id: uid(), n, c: 'אחר', done: false })); } setTab('list'); render(); });
  await page.waitForTimeout(400); return page; }
if (process.env.OLD) { const p = await open('old.html');
  ok(!(await p.locator('.cheapbar').count()), 'לפני: משתמש שלא נכנס לא רואה "איפה הכי זול"');
  await p.screenshot({ path: OUT + '/1-before-app-without-login.png' }); await p.close(); }
const page = await open('index.html');
ok(await page.locator('.cheapbar').isVisible(), 'אחרי: הבאנר "איפה הכי זול" מופיע גם בלי כניסה');
await page.screenshot({ path: OUT + '/2-after-app-without-login.png' });
await page.click('[data-cheapopen]'); await page.waitForTimeout(1500);
await page.screenshot({ path: OUT + '/3-after-cheapest-tab.png' });
await browser.close(); server.close();
