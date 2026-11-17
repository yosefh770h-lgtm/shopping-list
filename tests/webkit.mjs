// בדיקה בדפדפן WebKit — המנוע של ספארי (אייפון, אייפד ומק). רצה לפני כל עדכון (GitHub Actions) וגם מקומית:
//   cd tests && npx playwright install webkit && node webkit.mjs
// בודקת שהאתר נפתח בלי שגיאות, שמסך הכניסה וה"ניסיון בלי הרשמה" עובדים, שהספריות שנשמרות באתר (vendor) נטענות,
// ושדפי הנחיתה נראים טוב ברוחב של אייפון. BROWSER=chromium מריץ את אותן בדיקות בכרום (לבדיקה מקומית).
import { webkit, chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../shopping-list-site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const ORIGIN = 'http://localhost:' + server.address().port;

// אותו שרת מדומה של Supabase שבבדיקות הראשיות (smoke.mjs) — כדי שלא יהיו שתי גרסאות
const smokeSrc = fs.readFileSync(path.join(HERE, 'smoke.mjs'), 'utf8');
const STUB = smokeSrc.match(/const STUB = `([\s\S]*?)`;\n/)[1];

const results = [];
// כל בדיקה מוגבלת בזמן ומדפיסה מיד — כדי שבדיקה תקועה תיכשל עם שם ולא תעצור את כל ה-job
async function test(name, fn) {
  console.log('▶ ' + name);
  let t; const limit = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('נתקע יותר מ-90 שניות')), 90000); });
  try { await Promise.race([fn(), limit]); results.push(['✅', name]); } catch (e) { results.push(['❌', name, e.message]); } finally { clearTimeout(t); }
  console.log(results[results.length - 1].join(' '));
}
const assert = (c, m) => { if (!c) throw new Error(m); };

const engine = process.env.BROWSER === 'chromium' ? chromium : webkit;
console.log('מפעיל דפדפן…');
const browser = await engine.launch(process.env.BROWSER === 'chromium' ? { executablePath: process.env.CHROMIUM || undefined } : {});
console.log('הדפדפן עלה: ' + browser.version());

async function newPage({ user = null, stub = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.route(/supabase\.co\//, (r) => r.abort());
  if (stub) await ctx.route(/\/vendor\/supabase-js[^/]*\/supabase\.js/, (r) => r.abort());
  await ctx.addInitScript((st) => { localStorage.setItem('yam_tour165', '1'); if (st && !localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify(st)); }, user ? { user } : null);
  if (stub) await ctx.addInitScript(STUB);
  if (process.env.WK_DEBUG) await ctx.addInitScript(() => {
    const cnt = {}; const hit = (k, info) => { cnt[k] = (cnt[k] || 0) + 1; const n = cnt[k]; if (n === 200 || n === 2000 || n === 20000) console.log('LOOP? ' + k + ' x' + n + ' ' + String(info || '').slice(0, 160) + ' | ' + (new Error().stack || '').split('\n').slice(1, 6).join(' < ').slice(0, 600)); };
    const sa = Element.prototype.setAttribute; Element.prototype.setAttribute = function (a, v) { hit('setAttribute:' + a, (this.id || this.className || this.tagName) + '=' + v); return sa.apply(this, arguments); };
    const MO = window.MutationObserver; window.MutationObserver = function (cb) { const id = (new Error().stack || '').split('\n')[1] || '?'; return new MO(function (ms, o) { hit('MO ' + id, ms.length + ' ' + ms.map((m) => m.type + ':' + (m.attributeName || '') + ':' + ((m.target && (m.target.id || m.target.className || m.target.nodeName)) || '')).slice(0, 3).join(',')); return cb.call(this, ms, o); }); };
    const raf = window.requestAnimationFrame; window.requestAnimationFrame = function (f) { hit('raf', (new Error().stack || '').split('\n')[1]); return raf.call(window, f); };
    const st = window.setTimeout; window.setTimeout = function (f, t) { if (!t) hit('setTimeout0', (new Error().stack || '').split('\n')[1]); return st.apply(window, arguments); };
    const qm = window.queueMicrotask; window.queueMicrotask = function (f) { hit('microtask', (new Error().stack || '').split('\n')[1]); return qm.call(window, f); };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', (e) => errors.push(e.message));
  if (process.env.WK_DEBUG) { page.on('console', (m) => console.log('  [console]', m.type(), m.text().slice(0, 200))); page.on('requestfailed', (r) => console.log('  [failed]', r.url().slice(0, 120))); page.on('load', () => console.log('  [load]')); page.on('domcontentloaded', () => console.log('  [dom]')); }
  return { ctx, page, errors };
}

await test('WebKit: האתר נפתח בלי שגיאות (משתמש קיים)', async () => {
  const { ctx, page, errors } = await newPage({ user: { name: 'בודק', email: '', offline: true } });
  await page.goto(ORIGIN + '/index.html'); if (process.env.WK_DEBUG) console.log('  goto done'); await page.waitForTimeout(2500); if (process.env.WK_DEBUG) console.log('  wait done');
  assert(await page.evaluate(() => !!document.querySelector('#paneList')), 'אין רשימה');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('WebKit: מבקר חדש רואה את מסך הכניסה ויכול לנסות בלי הרשמה', async () => {
  const { ctx, page, errors } = await newPage();
  // בלי חיבור לענן האתר נכנס למצב "בלי חשבון" — כאן מדמים שיש שרת, כדי לראות את מסך הכניסה (כמו ב-smoke.mjs)
  await ctx.addInitScript(() => { Object.defineProperty(window, 'supabase', { configurable: true, get() { return { createClient: () => window.__stub({}) }; } }); });
  await page.goto(ORIGIN + '/index.html?src=webkit-test'); await page.waitForTimeout(2500);
  assert(await page.isVisible('#login'), 'מסך הכניסה לא מוצג');
  assert(await page.isVisible('#btnGuest'), 'אין כפתור "לנסות בלי הרשמה"');
  await page.click('#btnGuest'); await page.waitForTimeout(1200);
  assert(await page.evaluate(() => !!(state.user && state.user.guest)), 'הניסיון בלי הרשמה לא נפתח');
  assert(await page.evaluate(() => localStorage.getItem('yam_src')) === 'webkit-test', 'מקור הביקור לא נשמר');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('WebKit: הספריות שבתיקיית vendor נטענות (Supabase, לוח עברי, סורק ברקוד)', async () => {
  const { ctx, page, errors } = await newPage({ stub: false });
  await page.goto(ORIGIN + '/privacy.html');
  for (const f of ['vendor/supabase-js-2.117.2/supabase.js', 'vendor/hebcal-core-6.10.0.min.js', 'vendor/zxing-library-0.21.3.min.js']) await page.addScriptTag({ url: ORIGIN + '/' + f });
  const r = await page.evaluate(() => ({ sb: typeof (window.supabase && window.supabase.createClient), heb: typeof (window.hebcal && window.hebcal.HDate), zx: typeof (window.ZXing && window.ZXing.BrowserMultiFormatReader) }));
  assert(r.sb === 'function', 'Supabase לא נטען: ' + r.sb);
  assert(r.heb === 'function', 'הלוח העברי לא נטען: ' + r.heb);
  assert(r.zx === 'function', 'סורק הברקוד לא נטען: ' + r.zx);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('WebKit: דפי הנחיתה בלי גלילה הצידה ברוחב אייפון', async () => {
  const { ctx, page, errors } = await newPage({ stub: false });
  for (const f of fs.readdirSync(ROOT).filter((f) => /^(reshimat-kniyot-|hashvaat-mechirim-).*\.html$/.test(f))) {
    await page.goto(ORIGIN + '/' + f);
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h1: (document.querySelector('h1') || {}).textContent }));
    assert(r.h1, 'אין כותרת: ' + f);
    assert(r.sw <= r.cw + 1, f + ' רחב מהמסך: ' + r.sw + '>' + r.cw);
  }
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 15000))]); server.close();
const failed = results.filter((r) => r[0] === '❌').length;
console.log(failed ? `\n${failed} בדיקות נכשלו` : `\nכל ${results.length} הבדיקות עברו ב-${engine === webkit ? 'WebKit' : 'Chromium'} 🎉`);
process.exit(failed ? 1 : 0);
