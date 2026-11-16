// בדיקה + צילומי מסך: מתג "דיוק מוצרים" בהגדרות — דלוק: אחרי הוספת מוצר נפתחת בחירת המוצר המדויק; כבוי: המוצר נוסף כמו שנכתב.
//   OUT=תיקייה node shots-exact-toggle.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = process.env.ROOT ? path.resolve(process.env.ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', png: 'image/png', css: 'text/css', svg: 'image/svg+xml', woff2: 'font/woff2' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[p.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const PRODUCTS = [
  { code: '7290004131074', name: 'חלב טרי 3% בקרטון תנובה 1 ליטר', manufacturer: 'תנובה', stores: 1400, chains: 12, min: 6.5, median: 6.8, max: 7.1 },
  { code: '7290004127701', name: 'חלב תנובה 3% בשקית 1 ליטר', manufacturer: 'תנובה', stores: 1300, chains: 12, min: 5.2, median: 5.6, max: 5.9 }];
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
async function run(vp, tag, dark = false) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', deviceScaleFactor: 2, isMobile: vp.width < 600, hasTouch: vp.width < 600 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)|openfoodfacts/, (r) => r.abort());
  await ctx.route(/\/api\/prices\//, (r) => { const u = new URL(r.request().url()); const b = u.pathname.endsWith('/products') ? (/חלב/.test(u.searchParams.get('q')) ? PRODUCTS : []) : [];
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) }); });
  await ctx.addInitScript(() => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, stats: {} })); localStorage.setItem('yam_tour165', '1'); });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000); if (errors.length) console.log('page errors:', errors.join(' | '));
  await page.evaluate((d) => { srvCfg = Object.assign(srvCfg || {}, { public: true }); curList().items = []; state.pick53 = {}; delete state.pick53off; sessionStorage.setItem('cheapX', '1'); if (d) { state.dark = true; document.body.classList.add('dark'); } setTab('list'); render(); }, dark);
  const clean = () => page.evaluate(() => { document.querySelectorAll('.qp15').forEach((e) => e.remove()); const f = document.querySelector('#flash'); if (f) f.classList.remove('show'); });
  const type = async (t) => { await page.fill('#inText', t); await page.evaluate(() => { const b = document.querySelector('#smartAc'); if (b) b.hidden = true; }); await page.click('#btnSend'); await page.waitForTimeout(1200); };
  const pickerOpen = () => page.evaluate(() => { const o = document.querySelector('#pk53'); return !!o && !o.hidden; });
  const settings = async () => { await page.evaluate(() => document.querySelector('#btnMenu').click()); await page.waitForTimeout(500); };
  const sw = () => page.$eval('[data-r2s="pick"]', (e) => e.getAttribute('aria-checked')).catch(() => null);
  // 1) דלוק (ברירת מחדל): נפתחת בחירה
  await settings(); ok(await sw() === 'true', tag + ': בהגדרות יש מתג "דיוק מוצרים" והוא דלוק כברירת מחדל');
  await page.locator('[data-r2s="pick"]').scrollIntoViewIfNeeded(); await clean(); await page.screenshot({ path: path.join(OUT, tag + '-1-מתג-דלוק.png') });
  await page.evaluate(() => document.querySelector('#hMenu [data-r2close]').click()); await page.waitForTimeout(400);
  await type('חלב תנובה'); ok(await pickerOpen(), tag + ': דלוק — אחרי הוספה נפתחת בחירת המוצר המדויק');
  await clean(); await page.screenshot({ path: path.join(OUT, tag + '-2-דלוק-נפתחת-בחירה.png') });
  await page.evaluate(() => { document.querySelector('#pk53').hidden = true; curList().items = []; state.pick53 = {}; render(); });
  // 2) מכבים
  await settings(); await page.click('[data-r2s="pick"]'); await page.waitForTimeout(300);
  ok(await sw() === 'false' && await page.evaluate(() => state.pick53off === true), tag + ': לחיצה מכבה את המתג ושומרת');
  await clean(); await page.screenshot({ path: path.join(OUT, tag + '-3-מתג-כבוי.png') });
  await page.evaluate(() => document.querySelector('#hMenu [data-r2close]').click()); await page.waitForTimeout(400);
  await type('חלב תנובה'); ok(!(await pickerOpen()), tag + ': כבוי — אין חלון בחירה');
  ok(await page.evaluate(() => { const i = curList().items; return i.length === 1 && i[0].n === 'חלב תנובה' && !i[0].bc; }), tag + ': כבוי — המוצר נוסף בדיוק כמו שנכתב');
  await clean(); await page.screenshot({ path: path.join(OUT, tag + '-4-כבוי-נוסף-כמו-שנכתב.png') });
  // 3) הכפתור ליד "תזכורות" ברשימה
  const chip = () => page.evaluate(() => { const c = [...document.querySelectorAll('.pk53tg')].find((e) => e.offsetParent); if (!c) return null;
    const inChips = !!c.closest('#chips'); const right = c.getBoundingClientRect().right;
    const place = inChips ? (() => { const l = c.parentElement.querySelector('.chip.on'); return !!l && Math.abs(l.getBoundingClientRect().left - right) < 12; })() : /rem2b/.test((c.nextElementSibling || {}).className || '') && !c.previousElementSibling;
    return { on: c.getAttribute('aria-checked'), afterRem: place }; });
  let c = await chip(); ok(c && c.on === 'false' && c.afterRem, tag + ': ברשימה יש כפתור "דיוק מוצרים" (בטלפון מיד אחרי שם הרשימה, במחשב ליד תזכורות), ומראה כבוי');
  await clean(); await page.screenshot({ path: path.join(OUT, tag + '-5-כפתור-ליד-תזכורות-כבוי.png') });
  await page.locator('.pk53tg:visible').click(); await page.waitForTimeout(300); c = await chip();
  ok(c && c.on === 'true' && !(await page.evaluate(() => state.pick53off)), tag + ': לחיצה על הכפתור ברשימה מדליקה');
  await clean(); await page.screenshot({ path: path.join(OUT, tag + '-6-כפתור-ליד-תזכורות-דלוק.png') });
  await type('חלב טרי'); ok(await pickerOpen(), tag + ': אחרי הדלקה מהרשימה — נפתחת בחירה');
  await page.evaluate(() => { document.querySelector('#pk53').hidden = true; });
  await page.locator('.pk53tg:visible').click(); await page.waitForTimeout(300);
  // 4) מדליקים שוב
  await settings(); await page.click('[data-r2s="pick"]'); await page.waitForTimeout(300);
  ok(await sw() === 'true' && !(await page.evaluate(() => state.pick53off)), tag + ': אפשר להדליק שוב');
  ok(!errors.length, tag + ': בלי שגיאות JS ' + errors.join(' | '));
  await ctx.close();
}
await run({ width: 390, height: 844 }, 'טלפון');
await run({ width: 1366, height: 860 }, 'מחשב');
await run({ width: 390, height: 844 }, 'טלפון-כהה', true);
await browser.close(); server.close();
