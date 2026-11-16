// צילומי מסך של האייקונים באתר (לא חלק מהבדיקות האוטומטיות): node shots-icons.mjs <תיקייה>
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = process.argv[2] || 'shots'; fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const ORIGIN = 'http://localhost:' + server.address().port;
const BASE = ORIGIN + '/index.html';
const STUB = `window.__stub=function(D){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>Promise.resolve({data:D[k]||[],error:null}).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:()=>Promise.resolve({data:{},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const it = (n, q, extra) => Object.assign({ id: 'i' + Math.random().toString(36).slice(2), n, q: q || '', done: false, ts: Date.now() }, extra || {});
const ITEMS = [it('חלב', '2'), it('חלות', '5'), it('ביצים', '30'), it('עגבניות', '1 קג'), it('עוף', '2'), it('גבינה צהובה'), it('אורז'), it('שמן זית'), it('תפוחים', '', { done: true }), it('נייר טואלט')];
async function page(vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort());
  const st = opts.login ? null : { user: { name: 'יוסף', email: '', offline: true }, dark: !!opts.dark, lists: [{ id: 'l1', name: 'הרשימה שלי', items: ITEMS, created: 1 }], active: 'l1' };
  await ctx.addInitScript((st) => { if (st) localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); }, st);
  await ctx.addInitScript(STUB);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(opts.url || BASE); await p.waitForTimeout(2200);
  await p.evaluate(() => { document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('#updPop,.overlay.open').forEach((e) => e.classList.remove('open')); });
  return { ctx, p, errs };
}
const phone = { width: 390, height: 844 };
let n = 0; const shot = async (p, name, full) => { await p.waitForTimeout(350); await p.screenshot({ path: path.join(OUT, String(++n).padStart(2, '0') + '-' + name + '.png'), fullPage: !!full }); };
const ev = (p, f, a) => p.evaluate(f, a).catch((e) => console.log('skip', String(e).slice(0, 120)));
const closeAll = (p) => ev(p, () => { document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')); document.querySelector('#hMenu').classList.remove('open'); });
{
  const { ctx, p, errs } = await page(phone, { login: true });
  await ev(p, () => { localStorage.removeItem('yamh_app_v1'); });
  await shot(p, 'מסך-כניסה');
  await ctx.close(); if (errs.length) console.log('errors(login):', errs);
}
for (const dark of [false, true]) {
  const { ctx, p, errs } = await page(phone, { dark });
  const d = dark ? '-כהה' : '';
  await shot(p, 'רשימה' + d);
  if (dark) { await ctx.close(); continue; }
  await ev(p, () => document.querySelector('#hMenu').classList.add('open')); await shot(p, 'תפריט');
  await ev(p, () => { const m = document.querySelector('#hMenu'); m.scrollTop = m.scrollHeight; }); await shot(p, 'תפריט-המשך');
  await closeAll(p);
  await ev(p, () => document.querySelector('#btnPlus').click()); await shot(p, 'כל-הקטגוריות'); await closeAll(p);
  await ev(p, () => { openBot(); }); await p.waitForTimeout(500); await shot(p, 'יאמי-פתיחה');
  for (const q of ['מה אפשר לבשל ממה שיש בבית?', 'זמני שבת', 'עזרה']) { await ev(p, (q) => sendToBot(q), q); await p.waitForTimeout(700); }
  await shot(p, 'יאמי-שיחה'); await closeAll(p);
  for (const t of ['hist', 'home', 'prices', 'stores']) { await ev(p, (t) => document.querySelector('.tab[data-t="' + t + '"]').click(), t); await shot(p, 'לשונית-' + t); }
  await ev(p, () => document.querySelector('.tab[data-t="list"]').click());
  for (const [id, nm] of [['miMe', 'אזור-אישי'], ['miAbout', 'אודות'], ['miIntl', 'שפה-ומטבע'], ['miRecipe', 'הוספת-מתכון'], ['miZmanim', 'זמנים'], ['miReviews', 'חוות-דעת'], ['miTheme', 'ערכת-צבעים'], ['miA11y', 'נגישות'], ['miNotif', 'התראות'], ['miCl27', 'רשימות-מהקהילה']]) {
    await ev(p, (id) => { const b = document.getElementById(id); if (b) b.click(); }, id); await p.waitForTimeout(500); await shot(p, nm); await closeAll(p);
    await ev(p, () => document.querySelectorAll('.qpov,.qp15,.ovl16').forEach((e) => e.remove()));
  }
  await ev(p, () => document.querySelector('#btnShare') && document.querySelector('#btnShare').click()); await shot(p, 'שיתוף');
  await ctx.close(); if (errs.length) console.log('errors:', errs);
}
{ // רשימות מהקהילה עם נתונים לדוגמה
  const I = (s) => s.split(',').map((x) => { const [n, q] = x.split(':'); return { n, q: q || '' }; });
  let k = 0; const L = (title, emoji, category, avg, cnt, items, extra) => Object.assign({ id: '00000000-0000-0000-0000-00000000000' + (++k), title, emoji, category, description: '', items: I(items),
    status: null, featured: false, week: false, author: '', is_mine: false, n: cnt, avg, score: avg, adds: Math.round(cnt * 2.3), mine: null, created_at: '2026-10-0' + k, updated_at: null }, extra || {});
  const ROWS = [L('שבת לבית של 8 נפשות', '🕯️', 'שבת', 4.8, 23, 'חלות:5,יין:2,דגים:1 קג,עוף:2,קוגל,עוגה:2', { week: true, featured: true, description: 'מספיק לשלוש סעודות' }),
    L('קניות שבועיות בסיסיות', '📅', 'שבועי', 4.4, 17, 'חלב:4,לחם:3,ביצים:30,גבינה לבנה:2,עגבניות'), L('ערב חנוכה למשפחה', '🎉', 'חגים', 4.1, 9, 'סופגניות:20,שמן:2,נרות חנוכה:2')];
  const { ctx, p } = await page(phone);
  await ev(p, (D) => { sb = __stub(D); const r0 = sb.rpc; sb.rpc = (n, a) => (a && a.p_scope === 'mine' ? Promise.resolve({ data: [], error: null }) : r0(n, a)); authUser = { id: 'me', email: 'x@y.z' }; }, { 'rpc:shared_lists_feed': ROWS });
  await ev(p, () => openCl27()); await p.waitForTimeout(700); await shot(p, 'רשימות-מהקהילה');
  await ev(p, () => document.querySelectorAll('#cl27 .card27')[1].scrollIntoView({ block: 'start' })); await shot(p, 'רשימות-מהקהילה-דירוג');
  await ctx.close();
}
{ // מחשב
  const { ctx, p } = await page({ width: 1366, height: 820 });
  await shot(p, 'מחשב-רשימה');
  await ev(p, () => document.querySelector('#hMenu').classList.add('open')); await shot(p, 'מחשב-תפריט');
  await ctx.close();
}
for (const f of ['reshimat-kniyot-leshabbat.html', 'hashvaat-mechirim-supermarket.html', 'accessibility.html', 'privacy.html']) {
  const ctx = await browser.newContext({ viewport: phone, locale: 'he-IL', deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.goto(ORIGIN + '/' + f); await p.waitForTimeout(500); await shot(p, f.replace('.html', ''), f === 'accessibility.html' || f === 'privacy.html'); await ctx.close();
}
await browser.close(); server.close();
