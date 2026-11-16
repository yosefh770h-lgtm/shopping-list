// העלאת קבלה/רשימה בתמונה: לפני השליחה התמונות מוקטנות כך שיחד לא יעברו את התקציב
// (משלוח של 1.8MB הפיל את פונקציית השרת — שגיאה 546). בודק: צילום רועש וכבד → נשלח מתחת לתקציב,
// התמונה עדיין אחת במסך, ומחיקה אחרי ההקטנה מוחקת את כל החלקים.   node shots-upload-size.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, locale: 'he-IL' });
await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await ctx.addInitScript(() => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE); await page.waitForTimeout(2200);
await page.evaluate(() => { document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); });
// צילום טלפון של קבלה ארוכה: 2400x10000, נייר עם רעש וצל — JPEG כבד כמו מצלמה אמיתית
const photo = async (seed, w, h) => Buffer.from((await page.evaluate(([s, w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#f4efe4'); g.addColorStop(1, '#b9b3a6'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#2a2a2a'; x.font = Math.round(w / 26) + 'px monospace';
  for (let i = 0; i * w / 20 < h - 100; i++) x.fillText('מוצר ' + (s * 100 + i) + '   ' + (i * 1.37 + s).toFixed(2), w / 12, 120 + i * w / 20);
  const d = x.getImageData(0, 0, w, h), p = d.data; let r = s * 9973; for (let i = 0; i < p.length; i += 4) { r = (r * 1103515245 + 12345) & 0x7fffffff; const n = (r % 41) - 20; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
  x.putImageData(d, 0, 0); return c.toDataURL('image/jpeg', 0.95).split(',')[1]; }, [seed, w, h])), 'base64');
const sent = async (mode) => page.evaluate(async (mode) => { let body = null;
  sb = { functions: { invoke: async (_n, o) => { body = o.body; return { data: mode === 'receipt' ? { receipt: { store: 'x', items: [{ name: 'חלב', qty: 1, price: 6, total: 6 }], total: 6 } } : { list: { items: [{ name: 'חלב', qty: '1' }] } }, error: null }; } },
    auth: { refreshSession: async () => ({ data: {} }), getUser: async () => ({ data: {} }) }, rpc: () => Promise.resolve({}) };
  authUser = { id: 'u1' }; const before = upImgs.reduce((n, d) => n + Math.round(d.length * 3 / 4), 0); await readUpload();
  return { before, after: body ? body.images.reduce((n, d) => n + Math.round(d.length * 3 / 4), 0) : -1, parts: body ? body.images.length : 0, jpeg: !!body && body.images.every((d) => /^data:image\/jpeg;base64,/.test(d)), thumbs: document.querySelectorAll('#upThumbs .upth').length, review: !!document.querySelector('#upOut #upConfirm') }; }, mode);
// קבלה: צילום ארוך אחד → 4 חלקים
await page.evaluate(() => { localStorage.setItem('yam_rc_enh', '0'); openUpload('receipt'); });
await page.setInputFiles('#upFiles', [{ name: 'r1.jpg', mimeType: 'image/jpeg', buffer: await photo(1, 2400, 10000) }]); await page.waitForTimeout(3000);
let s = await sent('receipt');
console.log('receipt', JSON.stringify(s));
ok(s.parts === 4 && s.after > 0 && s.after <= 1100000 && s.jpeg && s.review, 'קבלה ארוכה: ' + s.parts + ' חלקים, ' + Math.round(s.before / 1024) + 'KB → ' + Math.round(s.after / 1024) + 'KB, והקריאה עברה');
ok(s.thumbs === 1, 'אחרי ההקטנה — עדיין תמונה אחת במסך');
// רשימה: 3 צילומים בצבע
await page.evaluate(() => { closeSheet(); openUpload('list'); });
await page.setInputFiles('#upFiles', [1, 2, 3].map((i) => ({ name: 'l' + i + '.jpg', mimeType: 'image/jpeg', buffer: null })).length ? await Promise.all([1, 2, 3].map(async (i) => ({ name: 'l' + i + '.jpg', mimeType: 'image/jpeg', buffer: await photo(i + 5, 3000, 4000) }))) : []); await page.waitForTimeout(3000);
s = await sent('list');
console.log('list', JSON.stringify(s));
ok(s.parts === 3 && s.after > 0 && s.after <= 900000 && s.jpeg, 'רשימה: 3 תמונות, ' + Math.round(s.before / 1024) + 'KB → ' + Math.round(s.after / 1024) + 'KB');
// קבלה עם חידוד: מחיקת התמונה אחרי ההקטנה מוחקת את כל החלקים
await page.evaluate(() => { closeSheet(); localStorage.setItem('yam_rc_enh', '1'); openUpload('receipt'); });
await page.setInputFiles('#upFiles', [{ name: 'r2.jpg', mimeType: 'image/jpeg', buffer: await photo(2, 2400, 10000) }]); await page.waitForTimeout(3000);
const r2 = await page.evaluate(async () => { const before = upImgs.reduce((n, d) => n + Math.round(d.length * 3 / 4), 0); await upFit(); const after = upImgs.reduce((n, d) => n + Math.round(d.length * 3 / 4), 0);
  const n = upImgs.length; document.querySelector('#upThumbs [data-rcrm]').click(); return { before, after, n, left: upImgs.length }; });
console.log('enhanced', JSON.stringify(r2));
ok(r2.after <= 1100000 && r2.n === 4 && r2.left === 0, 'קבלה עם חידוד: ' + Math.round(r2.before / 1024) + 'KB → ' + Math.round(r2.after / 1024) + 'KB, ומחיקה מוחקת את כל 4 החלקים');
ok(!errors.length, 'בלי שגיאות JS ' + errors.join(' | '));
await browser.close(); server.close();
