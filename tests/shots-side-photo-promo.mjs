// צילומי מסך + בדיקה: 📸 פרסומת בצד "מצלמים מוצר ומקבלים נקודות" — קופצת פתוחה, מחליקה לצד, חלון צילום, וכרטיס ניהול בבק אופיס.
// Supabase מדומה בתוך הדף (בלי רשת).   OUT=תיקייה node shots-side-photo-promo.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const ctx = await browser.newContext({ viewport: { width: +(process.env.W || 390), height: +(process.env.H || 844) }, locale: 'he-IL', deviceScaleFactor: 2 });
await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)|openfoodfacts/, (r) => r.abort());
await ctx.route(/\/api\/prices\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true }, stats: {} })); localStorage.setItem('yam_tour165', '1'); });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE); await page.waitForTimeout(2000);
await page.evaluate(() => {
  window.__db = { ads: [{ id: 'old1', title: 'פרסומת ישנה בצד', body: '', emoji: '🥛', theme: 'green', placement: 'side', active: true, link_url: '', views: 40, clicks: 2, created_at: '2026-10-01T00:00:00Z', image: '', advertiser: '', close_after: 0, audience: '' }],
    site_config: [{ key: 'ads', value: { audience: 'all' } }], product_photos: [] };
  const q = (t) => { const f = []; let upd = null, ins = null, del = false, ups = null; const o = {
    select() { return o; }, order() { return o; }, limit() { return o; }, maybeSingle() { o._one = true; return o; }, single() { o._one = true; return o; },
    eq(k, v) { f.push((r) => r[k] === v); return o; }, in(k, v) { f.push((r) => v.includes(r[k])); return o; },
    insert(v) { ins = v; return o; }, update(v) { upd = v; return o; }, upsert(v) { ups = v; return o; }, delete() { del = true; return o; }, gt() { return o; }, gte() { return o; }, lt() { return o; }, neq() { return o; }, is() { return o; }, or() { return o; }, range() { return o; },
    then(res) { const T = window.__db[t]; if (!T) return res({ data: o._one ? null : [], error: null });
      if (ins) { T.push(Object.assign({ id: 'n' + T.length, views: 0, clicks: 0, created_at: new Date().toISOString(), image: '', advertiser: '' }, ins)); return res({ data: null, error: null }); }
      if (ups) { const i = T.findIndex((r) => r.key === ups.key); if (i >= 0) T[i] = ups; else T.push(ups); return res({ data: null, error: null }); }
      const rows = T.filter((r) => f.every((fn) => fn(r)));
      if (upd) { rows.forEach((r) => Object.assign(r, upd)); return res({ data: null, error: null }); }
      if (del) { window.__db[t] = T.filter((r) => !rows.includes(r)); return res({ data: null, error: null }); }
      return res({ data: o._one ? (rows[0] || null) : rows.map((r) => ({ ...r })), error: null, count: rows.length }); } }; return o; };
  sb = { from: q, rpc: () => q('x'), auth: { getSession: async () => ({ data: {} }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {}, storage: { from: () => ({}) } };
  authUser = { id: 'u1', email: 'a@x.com' }; isAdmin = () => true; isStaff = () => true;
  curList().items = []; setTab('list'); render(); });
// בבק אופיס: כרטיס הפרסומת בצד
await page.evaluate(() => { document.querySelector('#bo').classList.remove('hidden'); document.querySelectorAll('#boNav button').forEach((b) => { b.hidden = false; }); window.boShow('ads'); });
await page.waitForTimeout(900);
ok(await page.locator('#phCard').isVisible(), 'בבק אופיס: כרטיס הפרסומת בצד בראש המסך');
ok(!(await page.locator('#adFormTitle').isVisible()), 'הטופס הכללי מקופל');
ok((await page.locator('#phCard').textContent()).includes('עוד לא פורסמה'), 'סטטוס: עוד לא פורסמה');
ok((await page.locator('#phCard [data-id="old1"]').count()) === 1, 'הפרסומת הישנה שבצד מוצגת עם כפתורי כיבוי ומחיקה');
await page.screenshot({ path: OUT + '/1-backoffice-card-new.png', fullPage: false });
await page.click('#phCard [data-id="old1"] [data-act="toggle"]'); await page.waitForTimeout(700);
ok(await page.evaluate(() => window.__db.ads.find((a) => a.id === 'old1').active === false), 'כיבוי הפרסומת הישנה מתוך הכרטיס');
await page.click('#phSave'); await page.waitForTimeout(900);
const ad = await page.evaluate(() => window.__db.ads.find((a) => a.link_url.endsWith('?a=photos')));
ok(ad && ad.placement === 'side' && ad.active && ad.audience === 'all', 'שמירה והפעלה יוצרת פרסומת בצד שמובילה לצילום');
ok(await page.evaluate(() => window.__db.site_config[0].value.side_pop === 6), 'הקפיצה נשמרה (6 שניות)');
await page.fill('#phTitle', 'צלמו מוצר וקבלו 3 נקודות! 🏅'); await page.click('#phSave'); await page.waitForTimeout(900);
ok(await page.evaluate(() => window.__db.ads.filter((a) => a.link_url.endsWith('?a=photos')).length === 1 && window.__db.ads.find((a) => a.link_url.endsWith('?a=photos')).title.startsWith('צלמו')), 'עריכת הטקסט מעדכנת את אותה פרסומת');
ok((await page.locator('#phCard').textContent()).includes('פועלת עכשיו'), 'סטטוס: פועלת עכשיו');
await page.locator('#phCard').screenshot({ path: OUT + '/2-backoffice-card-live.png' });
await page.click('#phDemo'); await page.waitForTimeout(1300);
ok(await page.locator('#phmSide.open').count() === 1, 'הדגמה: הפרסומת קופצת פתוחה בהדמיה');
await page.locator('.phMock').screenshot({ path: OUT + '/3-backoffice-demo-open.png' });
// באתר: קופצת ואז עוברת לצד
await page.evaluate(() => { document.querySelector('#bo').classList.add('hidden'); localStorage.removeItem('yamh_sidepop'); adSidePop = 4; loadAds(true); });
await page.waitForTimeout(2200);
ok(await page.locator('#ybSide.open').count() === 1, 'באתר: הפרסומת בצד קופצת פתוחה בכניסה');
await page.screenshot({ path: OUT + '/4-site-popped-open.png' });
await page.waitForTimeout(4500);
ok(await page.locator('#ybSide.open').count() === 0 && await page.locator('#ybSide .ybsTab').isVisible(), 'אחרי כמה שניות עוברת לצד כלשונית');
ok(/📸|svg/.test(await page.locator('#ybSide .ybsTab').innerHTML()), 'על הלשונית מופיע אייקון מצלמה');
await page.screenshot({ path: OUT + '/5-site-tab-side.png' });
await page.evaluate(() => { const el = document.querySelector('#ybSide'); el.classList.remove('open', 'pop'); delete el.dataset.k; renderSideAd(); });
await page.waitForTimeout(1600);
ok(await page.locator('#ybSide.open').count() === 0, 'לא קופצת שוב באותו יום');
// לחיצה על הכפתור — חלון הצילום
await page.click('#ybSide .ybsTab'); await page.waitForTimeout(300);
await page.click('#ybSide .ybcta'); await page.waitForTimeout(700);
ok((await page.locator('#v8SheetBody').textContent()).includes('3 נקודות מוניטין'), 'הכפתור פותח את חלון "מצלמים ומקבלים נקודות"');
await page.screenshot({ path: OUT + '/6-photo-sheet.png' });
// מחיקה מהבק אופיס
await page.evaluate(() => { closeSheet(); document.querySelector('#bo').classList.remove('hidden'); window.boShow('ads'); }); await page.waitForTimeout(900);
await page.click('#phDel'); await page.waitForTimeout(400); await page.click('.uid30 .u30ok'); await page.waitForTimeout(800);
ok(await page.evaluate(() => !window.__db.ads.some((a) => a.link_url.endsWith('?a=photos'))), 'מחיקת הפרסומת מהכרטיס');
ok(!errors.length, 'אין שגיאות JS ' + errors.join(' | '));
await browser.close(); server.close();
