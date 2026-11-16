// צילומי מסך: עיצוב 2.0 בלבד (בלי שאריות העיצוב הישן) — כניסה, רשימה, מחירים, מצב קנייה, הגדרות, מצב כהה, טלפון/אפליקציה/מחשב.
//   OUT=תיקייה node shots-r2-exact.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', css: 'text/css', svg: 'image/svg+xml', woff2: 'font/woff2' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const APP_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 YamShoppingApp/2.0';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const GREEN = /rgb\((7, 94, 84|18, 140, 126|15, 107, 92|10, 74, 64)\)/;

async function run(width, height, tag, { app = false, dark = false } = {}) {
  if (ONLY && !ONLY.includes(tag)) return;
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL', deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600, ...(app ? { userAgent: APP_UA } : {}) });
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, tag + '-' + n + '.png') }); };
  const greens = async (n) => { const g = await page.evaluate((src) => { const re = new RegExp(src); const out = [];
      document.querySelectorAll('body *').forEach((e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return;
        for (const k of ['backgroundColor', 'color', 'borderTopColor', 'backgroundImage']) if (re.test(cs[k])) { out.push((e.id || e.className || e.tagName) + ':' + k); break; } }); return out.slice(0, 8); }, GREEN.source);
    ok(!g.length, tag + ' ' + n + ': בלי צבע ירוק ישן ' + g.join(', ')); };
  await page.goto(BASE + (app ? '?source=android' : '')); await page.waitForTimeout(2200);
  if (dark) await page.evaluate(() => { state.dark = true; document.body.classList.add('dark'); });
  await shot('1-login'); await greens('login');
  await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
  await page.evaluate(() => { state.user = { name: 'יוסף', email: '', offline: true }; const l = curList(); l.name = 'ערב שבת'; l.items = []; ['חלב 3%', 'ביצים L', 'חלות', 'עגבניות', 'יין לקידוש', 'קפה טורקי'].forEach((n) => addItem(n, '')); setTab('list'); });
  await page.waitForTimeout(700); await page.evaluate(() => { try { closeSheet(); } catch (e) {} document.querySelectorAll('.flash').forEach((e) => e.classList.remove('show')); });
  await shot('2-list'); await greens('list');
  await page.evaluate(() => setTab('prices')); await shot('3-prices'); await greens('prices');
  await page.evaluate(() => setTab('list'));
  await page.evaluate(() => { try { openShop26(); } catch (e) {} }); await shot('4-shop'); await greens('shop');
  await page.evaluate(() => { const b = document.querySelector('#shop26'); if (b) b.hidden = true; document.body.classList.remove('shop26'); });
  await page.evaluate(() => document.querySelector('#btnMenu').click()); await shot('5-settings'); await greens('settings');
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run(390, 844, 'app', { app: true });
await run(390, 844, 'phone');
await run(1366, 860, 'computer');
await run(390, 844, 'app-dark', { app: true, dark: true });
await browser.close(); server.close();
