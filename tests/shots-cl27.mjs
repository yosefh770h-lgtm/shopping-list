// צילומי מסך של "רשימות מהקהילה" (לא חלק מהבדיקות האוטומטיות): node shots-cl27.mjs <תיקייה>
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = process.argv[2] || 'shots'; fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const STUB = `window.__stub=function(D){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>Promise.resolve({data:D[k]||[],error:null}).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:()=>Promise.resolve({data:{},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;
const I = (s) => s.split(',').map((x) => { const [n, q] = x.split(':'); return { n, q: q || '' }; });
let k = 0; const L = (title, emoji, category, avg, n, items, extra) => Object.assign({ id: '00000000-0000-0000-0000-00000000000' + (++k), title, emoji, category, description: '', items: I(items),
  status: null, featured: false, week: false, author: '', is_mine: false, n, avg, score: avg, adds: Math.round(n * 2.3), mine: null, created_at: '2026-10-0' + k, updated_at: null }, extra || {});
const ROWS = [
  L('שבת לבית של 8 נפשות', '🕯️', 'שבת', 4.8, 23, 'חלות:5,יין:2,מיץ ענבים:2,דגים:1 קג,עוף:2,תפוחי אדמה:2 קג,בצל:1 קג,גזר:1 קג,קוגל,עוגה:2,שתייה:6,חומוס,טחינה', { week: true, featured: true, description: 'מספיק לשלוש סעודות, כולל קידוש וסעודה שלישית' }),
  L('קניות שבועיות בסיסיות', '📅', 'שבועי', 4.4, 17, 'חלב:4,לחם:3,ביצים:30,גבינה לבנה:2,קוטג׳:3,עגבניות,מלפפונים,פיתות:2,טונה:4,אורז'),
  L('ערב חנוכה למשפחה', '🎉', 'חגים', 4.1, 9, 'סופגניות:20,שמן:2,נרות חנוכה:2,תפוחי אדמה:3 קג,קמח,ריבה,אבקת סוכר'),
  L('מזווה לחודש', '🥫', 'מזווה', 3.6, 5, 'אורז:3,פסטה:6,קמח:2,סוכר:2,שמן:2,רסק עגבניות:4,טונה:8,שימורי תירס:4'),
  L('ניקיון יסודי לפסח', '🧽', 'ניקיון', 0, 0, 'אקונומיקה:2,מגבונים:4,ספוגים:10,נייר כסף:3,שקיות זבל:3'),
];
const MINE = [L('שבע ברכות קטן', '🎈', 'אירועים', 0, 0, 'שתייה:12,עוגות:4,פירות:3 קג,חד פעמי', { status: 'pending', is_mine: true })];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
async function page(vp, dark) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort());
  await ctx.addInitScript((st) => { localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); }, { user: { name: 'יוסף', email: '', offline: true }, dark: !!dark,
    lists: [{ id: 'l1', name: 'הרשימה שלי', items: [{ id: 'a', n: 'חלב', q: '2', done: false, ts: 1 }, { id: 'b', n: 'חלות', q: '2', done: false, ts: 1 }], created: 1 }], active: 'l1' });
  await ctx.addInitScript(STUB);
  const p = await ctx.newPage(); await p.goto(BASE); await p.waitForTimeout(2200);
  await p.evaluate(() => { document.querySelectorAll('.qp15,#updPop,.overlay.open').forEach((e) => e.remove && e.classList.contains('qp15') ? e.remove() : e.classList && e.classList.remove('open')); });
  return { ctx, p };
}
const phone = { width: 390, height: 844 };
const shot = (p, n, full) => p.screenshot({ path: path.join(OUT, n), fullPage: !!full });
{ // משתמש רגיל
  const { ctx, p } = await page(phone);
  await p.evaluate((D) => { sb = __stub(D); const r0 = sb.rpc; sb.rpc = (n, a) => (a && a.p_scope === 'mine' ? Promise.resolve({ data: [], error: null }) : r0(n, a)); authUser = { id: 'me', email: 'x@y.z' }; }, { 'rpc:shared_lists_feed': ROWS });
  await p.evaluate(() => document.querySelector('#hMenu').classList.add('open')); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('#miCl27').scrollIntoView({ block: 'center' })); await p.evaluate(() => document.querySelector('#miCl27').style.outline = '3px solid #f3c623');
  await shot(p, '01-תפריט-רשימות-מהקהילה.png');
  await p.evaluate(() => document.querySelector('#hMenu').classList.remove('open'));
  await p.evaluate(() => openCl27()); await p.waitForTimeout(600);
  await shot(p, '02-רשימות-מהקהילה-רשימת-השבוע.png');
  await p.evaluate(() => { document.querySelectorAll('#cl27 .ls27 .card27')[0].scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(200);
  await shot(p, '03-רשימות-ודירוג-בעגלות.png');
  await p.evaluate(() => { cl27.rows[1].mine = 4; document.querySelector('#cl27 [data-cl27="' + cl27.rows[0].id + '"] [data-add27]').click(); document.querySelector('#cl27 .qpcard').scrollTop = 0; }); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('#cl27 .x27 .ed27').scrollIntoView({ block: 'center' }));
  await shot(p, '04-הוספה-לרשימה-שלי-בוחרים-מוצרים.png');
  await p.evaluate(() => { document.querySelector('#cl27 [data-cat27="חגים"]').click(); }); await p.waitForTimeout(200);
  await p.evaluate(() => { document.querySelector('#cl27q').scrollIntoView({ block: 'start' }); });
  await shot(p, '05-סינון-לפי-נושא.png');
  await p.evaluate(() => { document.querySelector('#cl27 [data-cat27=""]').click(); }); await p.waitForTimeout(100);
  await p.evaluate(() => { document.querySelector('#cl27 [data-new27]').click(); document.querySelector('#cl27 [data-imp27]').click(); document.querySelector('#cl27 .x27new [data-f=title]').value = 'שבת לזוג צעיר'; document.querySelector('#cl27 .x27new').scrollIntoView({ block: 'start' }); });
  await shot(p, '06-לשתף-רשימה-משלי.png');
  await p.evaluate((M) => { cl27.mine = M; document.getElementById('cl27').remove(); }, MINE);
  // "הרשימות ששיתפתי" — רואים את המצב (ממתינה לאישור)
  await p.evaluate(async (M) => { const o = load27; window.load27x = 1; await openCl27(); cl27.mine = M; const b = document.querySelector('#cl27 .b165'); b.innerHTML = body27(); const h = [...b.querySelectorAll('h4')].pop(); if (h) h.scrollIntoView({ block: 'start' }); }, MINE);
  await p.waitForTimeout(200);
  await shot(p, '07-הרשימות-ששיתפתי-ממתינה-לאישור.png');
  await p.evaluate(() => { document.getElementById('cl27').remove(); setTab('list'); }); await p.waitForTimeout(300);
  await ctx.close();
}
{ // אחרי הוספה — הרשימה החדשה
  const { ctx, p } = await page(phone);
  await p.evaluate((D) => { sb = __stub(D); const r0 = sb.rpc; sb.rpc = (n, a) => (a && a.p_scope === 'mine' ? Promise.resolve({ data: [], error: null }) : r0(n, a)); authUser = { id: 'me', email: 'x@y.z' }; }, { 'rpc:shared_lists_feed': ROWS });
  await p.evaluate(async () => { await openCl27(); document.querySelector('#cl27 .card27 [data-add27]').click(); document.querySelector('#cl27 .card27 [data-addto27="new"]').click(); }); await p.waitForTimeout(900);
  await shot(p, '08-אחרי-הוספה-נפתחה-רשימה-חדשה.png');
  await ctx.close();
}
{ // מנהל באתר
  const { ctx, p } = await page(phone);
  const all = ROWS.concat([L('שבע ברכות קטן', '🎈', 'אירועים', 0, 0, 'שתייה:12,עוגות:4,פירות:3 קג,חד פעמי', { status: 'pending', author: 'משה כהן' })]).map((r) => Object.assign({}, r, { status: r.status || 'approved', show_author: false }));
  await p.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; }, { 'rpc:shared_lists_feed': all });
  await p.evaluate(() => openCl27()); await p.waitForTimeout(600);
  await shot(p, '09-מנהל-באתר-ממתינות-לאישור.png');
  await p.evaluate(() => { const c = document.querySelectorAll('#cl27 .card27')[1]; c.querySelector('[data-edit27]').click(); c.querySelector('.x27').scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(200);
  await shot(p, '10-מנהל-באתר-עריכה-כולל-מוצרים.png');
  await ctx.close();
  const d = await page({ width: 1366, height: 860 });
  await d.p.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('commlists'); }, { 'rpc:shared_lists_feed': all });
  await d.p.waitForTimeout(900);
  await shot(d.p, '11-בק-אופיס-רשימות-מהקהילה.png');
  await d.p.evaluate(() => { document.querySelector('#boMain [data-new27]').click(); }); await d.p.waitForTimeout(200);
  await d.p.evaluate(() => document.querySelector('#boMain .x27new').scrollIntoView({ block: 'start' }));
  await shot(d.p, '12-בק-אופיס-הוספת-רשימה-על-ידי-מנהל.png');
  await d.ctx.close();
}
{ // מצב כהה
  const { ctx, p } = await page(phone, true);
  await p.evaluate((D) => { sb = __stub(D); const r0 = sb.rpc; sb.rpc = (n, a) => (a && a.p_scope === 'mine' ? Promise.resolve({ data: [], error: null }) : r0(n, a)); authUser = { id: 'me', email: 'x@y.z' }; document.body.classList.add('dark'); }, { 'rpc:shared_lists_feed': ROWS });
  await p.evaluate(() => openCl27()); await p.waitForTimeout(600);
  await shot(p, '13-מצב-כהה.png');
  await ctx.close();
}
await browser.close(); server.close();
console.log('done', fs.readdirSync(OUT).length);
