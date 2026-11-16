// בדיקה: השיחות עם יאמי נשמרות בחשבון ועוברות למכשיר חדש; עבודה בלי אינטרנט; יציאה מוחקת מהמכשיר.
//   cd tests && node shots-offline-sync.mjs   (OUT=תיקייה לצילומי מסך)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const OUT = process.env.OUT || '';
const assert = (c, m) => { if (!c) throw new Error(m); };
const results = [];
async function test(name, fn) { try { await fn(); results.push(['✅', name]); } catch (e) { results.push(['❌', name, e.message]); } }

/* "השרת": שורה אחת ב-user_sync לכל משתמש, משותפת לכל המכשירים בבדיקה */
const DB = { user_sync: {} };
const FAKE = `(()=>{const U={id:'u1',email:'a@b.c',user_metadata:{name:'בודק'}};
 const q=(t)=>{const st={t,op:'select',row:null,f:{}};const c=new Proxy(function(){},{get(_,p){
   if(p==='then')return(res,rej)=>window.__srv(st).then(res,rej);
   if(p==='upsert'||p==='update'||p==='insert'){return(row)=>{st.op=p;st.row=row;return c;};}
   if(p==='eq')return(k,v)=>{st.f[k]=v;return c;};
   if(p==='maybeSingle'||p==='single')return()=>{st.one=true;return c;};
   return()=>c;},apply(){return c;}});return c;};
 const sb={from:q,rpc:(n)=>({then:(r)=>r({data:n==='ensure_my_room'?'ROOM1':null,error:null})}),functions:{invoke:()=>Promise.resolve({data:{text:'תשובה'},error:null})},
  channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:window.__out?null:{user:U,access_token:'x'}}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>{window.__out=1;return Promise.resolve({});},getUser:()=>Promise.resolve({data:{user:U}})},
  storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};
 Object.defineProperty(window,'supabase',{configurable:true,get(){return{createClient:()=>sb};},set(){}});})();`;

const browser = await chromium.launch();
async function device(name, { pre } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: OUT ? 2 : 1 });
  await ctx.exposeBinding('__srv', (_, st) => {
    if (st.t === 'user_sync') {
      if (st.op === 'upsert') { DB.user_sync[st.row.user_id] = JSON.parse(JSON.stringify(st.row)); return { data: null, error: null }; }
      const r = DB.user_sync[st.f.user_id]; return { data: r ? { data: r.data } : null, error: null };
    }
    return { data: st.one ? null : [], error: null };
  });
  await ctx.route(/supabase\.(co|js)|fonts\.(googleapis|gstatic)|\/api\//, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('yam_tour165', '1'); });
  if (pre) await ctx.addInitScript(pre);
  await ctx.addInitScript(FAKE);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(3500);
  return { ctx, page, errors, name };
}
const ev = (d, f, a) => d.page.evaluate(f, a);

const A = await device('A');
await test('מכשיר א נטען מחובר בלי שגיאות', async () => {
  assert(await ev(A, () => !!(window.authUser || (typeof authUser !== 'undefined' && authUser))), 'לא מחובר');
  assert(!A.errors.length, A.errors.join(' | '));
});
await test('שיחה עם יאמי נשלחת לחשבון', async () => {
  await ev(A, () => { meSay('מה מכינים לשבת?'); botSay('אולי חמין 🍲'); });
  await A.page.waitForTimeout(4500);
  const r = DB.user_sync.u1; assert(r && r.data && r.data.chats && r.data.chats.length === 1, 'לא נשמר בשרת: ' + JSON.stringify(r && r.data).slice(0, 200));
  assert(r.data.chats[0].msgs.some((m) => m.txt === 'מה מכינים לשבת?'), 'ההודעה חסרה');
});
await test('שיחה שנייה + שמורה', async () => {
  await ev(A, () => { newBotChat(true); meSay('מה חסר בבית?'); botSay('חלב'); });
  await A.page.waitForTimeout(4500);
  assert(DB.user_sync.u1.data.chats.length === 2, 'צריך 2 שיחות, יש ' + DB.user_sync.u1.data.chats.length);
});

const B = await device('B');
await test('מכשיר חדש מקבל את השיחות וממשיך את האחרונה', async () => {
  await B.page.waitForTimeout(2000);
  const s = await ev(B, () => ({ cur: state.bot.map((m) => m.txt), chats: (state.botChats || []).length }));
  assert(s.cur.includes('מה חסר בבית?'), 'השיחה האחרונה לא נפתחה: ' + JSON.stringify(s.cur));
  assert(s.chats === 1, 'שיחות שמורות: ' + s.chats);
  assert(!B.errors.length, B.errors.join(' | '));
});
await test('הודעות משני המכשירים מתאחדות באותה שיחה', async () => {
  await ev(B, () => { meSay('מהמכשיר השני'); });
  await B.page.waitForTimeout(4000);
  await ev(A, () => { meSay('מהמכשיר הראשון'); });
  await A.page.waitForTimeout(4000);
  await ev(B, () => window.yamChatSync(false)); await B.page.waitForTimeout(500);
  const a = await ev(A, () => state.bot.map((m) => m.txt)), b = await ev(B, () => state.bot.map((m) => m.txt));
  assert(a.includes('מהמכשיר השני') && a.includes('מהמכשיר הראשון'), 'א: ' + a.join(','));
  assert(b.includes('מהמכשיר השני') && b.includes('מהמכשיר הראשון'), 'ב: ' + b.join(','));
});
await test('מחיקת שיחה במכשיר אחד לא חוזרת מהשני', async () => {
  const id = await ev(A, () => state.botChats[0].id);
  await ev(A, (id) => { state.botChats = state.botChats.filter((x) => x.id !== id); state.chatTomb = Object.assign({}, state.chatTomb, { [id]: Date.now() }); save(true); }, id);
  await A.page.waitForTimeout(4000);
  await ev(B, () => window.yamChatSync(false)); await B.page.waitForTimeout(500);
  assert(await ev(B, (id) => !(state.botChats || []).some((c) => c.id === id), id), 'השיחה חזרה במכשיר ב');
  assert(!DB.user_sync.u1.data.chats.some((c) => c.id === id), 'השיחה עדיין בשרת');
});
await test('בלי אינטרנט: פס ברור, רשימה עובדת, יאמי לא נתקעת, ונשלח כשחוזר', async () => {
  await B.ctx.setOffline(true); await B.page.waitForTimeout(500);
  const bar = await ev(B, () => { const b = document.querySelector('#offBar'); return b && b.classList.contains('on') ? b.textContent : ''; });
  assert(/אין אינטרנט/.test(bar), 'אין פס: ' + bar);
  await ev(B, () => { meSay('בלי קליטה'); askAI(); });
  await B.page.waitForTimeout(3500);
  const last = await ev(B, () => state.bot[state.bot.length - 1].txt);
  assert(/אין אינטרנט כרגע/.test(last), 'יאמי: ' + last);
  assert(!DB.user_sync.u1.data.chats.some((c) => c.msgs.some((m) => m.txt === 'בלי קליטה')), 'נשלח בלי אינטרנט?');
  if (OUT) await B.page.screenshot({ path: path.join(OUT, '1-בלי-אינטרנט.png') });
  await B.ctx.setOffline(false); await B.page.waitForTimeout(5000);
  assert(DB.user_sync.u1.data.chats.some((c) => c.msgs.some((m) => m.txt === 'בלי קליטה')), 'לא נשלח אחרי שחזר החיבור');
});
await test('יציאה מהחשבון מוחקת את השיחות מהמכשיר ומ-IndexedDB', async () => {
  await ev(B, () => dcSet('my|u1', [1, 2, 3]));
  await ev(B, () => dcSet('pub|-', [1]));
  await ev(B, () => doLogout()); await B.page.waitForTimeout(1500);
  const s = await ev(B, async () => ({ chats: (state.botChats || []).length, me: state.bot.some((m) => m.who === 'me'), ls: (localStorage.getItem('yamh_app_v1') || '').includes('מהמכשיר'), my: !!(await dcGet('my|u1')), pub: !!(await dcGet('pub|-')) }));
  assert(!s.chats && !s.me && !s.ls, 'נשארו שיחות: ' + JSON.stringify(s));
  assert(!s.my, 'נשאר מידע אישי ב-IndexedDB');
  assert(s.pub, 'נמחק מידע ציבורי');
  assert(!B.errors.length, B.errors.join(' | '));
});
await test('יציאה בלי אינטרנט עם שינויים שלא נשלחו — שואלים קודם', async () => {
  await A.ctx.setOffline(true); await A.page.waitForTimeout(300);
  await ev(A, () => { meSay('לא נשלח'); });
  await A.page.waitForTimeout(300);
  ev(A, () => doLogout()).catch(() => {});
  await A.page.waitForTimeout(800);
  if (OUT) await A.page.screenshot({ path: path.join(OUT, '2-יציאה-בלי-אינטרנט.png') });
  const txt = await ev(A, () => document.body.innerText);
  assert(/עוד לא נשמרו בחשבון/.test(txt), 'אין שאלה');
});
for (const r of results) console.log(r.join(' '));
await browser.close(); server.close();
process.exit(results.some((r) => r[0] === '❌') ? 1 : 0);
