// הסיור באתר אחרי הסרת המתכונים ודבר התורה + ההגדרות, הבית שלי ויאמי.   OUT=תיקייה node shots-tour-norecipes.mjs
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
const ST = { user: { name: 'יוסף', email: 'yosef@gmail.com', offline: true, city: 'רחובות' }, pantry: { 'חלב': true } };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'he-IL', deviceScaleFactor: 2 });
await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await ctx.addInitScript((st) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); }, ST);
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE); await page.waitForTimeout(2500);
await page.evaluate(() => { try { hideLogin(); } catch (e) {} document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
// הסיור
const steps = await page.evaluate(() => TOUR165.map((s) => s[1]));
ok(!steps.some((h) => /מתכון|דבר תורה|וורט/.test(h)), 'בסיור אין מתכונים ודבר תורה');
ok(steps.includes('הרשימות שלי') && steps.includes('תצוגה'), 'בסיור יש "הרשימות שלי" ו"תצוגה"');
ok(!/מתכונ|דבר תורה|וורט/.test(await page.evaluate(() => TOUR165.map((s) => s[2]).join(' ') + SITE_TOUR16)), 'גם בטקסטים של הסיור אין מתכונים ודבר תורה');
await page.evaluate(() => openTour165()); await page.waitForTimeout(400);
for (let i = 0; i < steps.length; i++) {
  await page.screenshot({ path: path.join(OUT, String(i + 1).padStart(2, '0') + '-סיור-' + steps[i].replace(/[^\p{L}\p{N} ]/gu, '').trim().replace(/\s+/g, '-') + '.png') });
  if (i < steps.length - 1) { await page.click('[data-n165]'); await page.waitForTimeout(250); }
}
await page.click('[data-n165]'); await page.waitForTimeout(300);
// הגדרות
await page.evaluate(() => { const b = document.querySelector('#btnMenu'); b && b.click(); }); await page.waitForTimeout(500);
await page.evaluate(() => { const d = document.querySelector('#hMenu details.mgrp[data-g="food"]'); if (d) d.open = true; });
await page.waitForTimeout(300);
await page.evaluate(() => { const d = document.querySelector('#hMenu details.mgrp[data-g="food"]'); d && d.scrollIntoView({ block: 'center' }); });
await page.waitForTimeout(200);
ok(await page.evaluate(() => [...document.querySelectorAll('#hMenu button,#hMenu summary')].filter((b) => b.offsetParent && /מתכונ/.test(b.textContent)).length === 0), 'בהגדרות אין שום כפתור מתכונים');
await page.screenshot({ path: path.join(OUT, '20-הגדרות-שבת-וחגים.png') });
await page.evaluate(() => document.querySelector('#hMenu').classList.remove('open'));
// הבית שלי
await page.evaluate(() => setTab('home')); await page.waitForTimeout(600);
ok(await page.evaluate(() => ![...document.querySelectorAll('#paneHome .r2tile')].some((t) => t.offsetParent && /מתכונ/.test(t.textContent))), 'בבית שלי אין אריח מתכונים');
await page.screenshot({ path: path.join(OUT, '21-הבית-שלי.png') });
// יאמי
await page.evaluate(() => openBot()); await page.waitForTimeout(400);
ok(await page.evaluate(() => !botChips().some((c) => /מתכון|להכין|חמין|וורט/.test(c))), 'ביאמי אין כפתורי מתכונים ודבר תורה');
await page.evaluate(() => sendToBot('מתכון לעוגה')); await page.waitForTimeout(800);
await page.evaluate(() => sendToBot('דבר תורה')); await page.waitForTimeout(800);
ok(await page.evaluate(() => typeof recView === 'undefined' || !document.querySelector('#v8Sheet.open')), 'ספר המתכונים לא נפתח');
await page.screenshot({ path: path.join(OUT, '22-יאמי.png') });
ok(errors.length === 0, 'בלי שגיאות JS ' + errors.join(' | '));
await browser.close(); server.close();
