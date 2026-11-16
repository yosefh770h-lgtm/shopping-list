// צילומי מסך + בדיקה: 📧 המייל השבועי — לעצור מייל, ולשלוח מייל חדש שממשיך מאיפה שהקודם נעצר
//   OUT=תיקייה node shots-mail-continue.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.png') ? 'image/png' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const base = { preheader: '', outro: 'תודה שבחרת ברשימת קניות.', cta: 'לכניסה לאתר', auto: false, note: '', items: [{ title: 'תקציב הבית', text: 'כמה הוצאתם החודש על קניות.', images: [], link: '' }] };
const C1 = { ...base, id: 'c1', subject: 'מה חדש ברשימת קניות: עדכוני השבוע', intro: 'ריכזנו עבורך את העדכונים.', status: 'paused', continues: null, created_at: ago(60 * 24 * 3), started_at: ago(60 * 24 * 2) };
const C3 = { ...base, id: 'c3', subject: '🎉 ברוכים הבאים למייל השבועי', intro: '', status: 'done', continues: null, created_at: ago(60 * 24 * 12), started_at: ago(60 * 24 * 11), finished_at: ago(60 * 24 * 3) };
const C4 = { ...base, id: 'c4', subject: '✨ האתר החדש של רשימת קניות', intro: 'עיצוב חדש!', status: 'draft', continues: 'c1', created_at: ago(20) };
const D = {
  email_campaigns: [C1, C3],
  'rpc:email_campaign_stats': [{ campaign_id: 'c1', sent: 190, delivered: 187, opened: 104, clicked: 41, liked: 23, unsub: 2, complained: 0, bounced: 3, tests: 1 }, { campaign_id: 'c3', sent: 742, delivered: 731, opened: 402, clicked: 166, liked: 88, unsub: 9, complained: 1, bounced: 11 }],
  'rpc:email_audience': { confirmed: 791, unsub: 12, bounced: 11, complained: 1, counts: { today: 70, month: 1010 } },
  'email_state:one': { last_run: ago(3), last_cron: ago(3), last_note: 'nothing to send', last_error: '' },
  'site_config:one': { value: { auto: false, hour: 10, day_cap: 70, order: 'inactive' } },
  'rpc:email_daily': [], 'rpc:email_left': { ready: 0, waiting: 0 }, 'rpc:email_cron_info': { cron: true, job: { schedule: '*/5 * * * *', active: true, jobid: 3 }, runs: [] },
};
// כמו ב-shots-mail.mjs, ובנוסף שומרים כל insert/update כדי לבדוק מה נשמר
const STUB = `window.__writes=[];window.__stub=function(D){const mk=(k,w)=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>new Promise(r=>setTimeout(r,40)).then(()=>({data:w?{id:'new1'}:D[k]!==undefined?D[k]:(D[k.replace(':one','')]||[]),error:null})).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one',w);if(p==='insert'||p==='update'||p==='upsert')return(row)=>{window.__writes.push({t:k,op:p,row});return mk(k,true);};return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:(n,o)=>Promise.resolve({data:{ok:true,key:true,webhook:true,window:'',counts:{today:70,month:1010}},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;
const browser = await chromium.launch();
const top = (page, sel) => page.evaluate((sel) => { const c = document.querySelector(sel); if (!c) return; c.scrollIntoView(); for (let e = c.parentElement; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop -= 90; break; } }, sel);
for (const [w, h, nm, dark] of [[1280, 1000, 'computer', false], [390, 1200, 'phone', false], [390, 1200, 'phone-dark', true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('mail'); }, D);
  await page.waitForTimeout(1500);
  const it = await page.evaluate(() => { const e = document.querySelector('[data-id="c1"]'); return { txt: e.innerText, cont: !!e.querySelector('[data-act="cont"]'), resume: !!e.querySelector('[data-act="resume"]'), edit: !!e.querySelector('[data-act="edit"]') }; });
  ok(it.cont && it.resume && it.edit && it.txt.includes('מושהה. אפשר ✏️ לערוך'), nm + ': מייל מושהה — ✏️ עריכה, ▶ המשך, ו-🔁 מייל חדש שממשיך מכאן');
  ok(await page.evaluate(() => !!document.querySelector('[data-id="c3"] [data-act="cont"]')), nm + ': גם ממייל שהסתיים אפשר להמשיך');
  await top(page, '[data-id="c1"]'); await page.screenshot({ path: OUT + '/1-paused-email-' + nm + '.png' });
  await page.click('[data-id="c1"] [data-act="cont"]'); await page.waitForTimeout(500);
  const ed = await page.evaluate(() => ({ sel: document.querySelector('#meCont') && document.querySelector('#meCont').value, opts: [...document.querySelectorAll('#meCont option')].map((o) => o.textContent), note: (document.querySelector('#meContNote') || {}).textContent || '' }));
  ok(ed.sel === 'c1' && ed.opts.length === 3 && ed.opts[0].includes('לכולם') && ed.note.includes('לא יקבל את המייל הזה'), nm + ': בעריכה — "למי לשלוח" מסומן להמשיך מהמייל שנעצר');
  await page.fill('#meSubj', '✨ האתר החדש של רשימת קניות'); await page.fill('#meIntro', 'האתר קיבל עיצוב חדש, נקי ונוח יותר.');
  await page.waitForTimeout(3500); await top(page, '#meCont'); await page.screenshot({ path: OUT + '/2-new-email-continues-' + nm + '.png' });
  await page.selectOption('#meCont', ''); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelector('#meSubj').value === '✨ האתר החדש של רשימת קניות' && document.querySelector('#meContNote').textContent.includes('כשבוחרים')), nm + ': מעבר ל"לכולם" לא מוחק את מה שנכתב');
  await page.selectOption('#meCont', 'c1'); await page.waitForTimeout(200);
  await page.click('#meSave'); await page.waitForTimeout(600);
  const wr = await page.evaluate(() => window.__writes.filter((x) => x.t === 'email_campaigns').pop());
  ok(wr && wr.op === 'insert' && wr.row.continues === 'c1' && wr.row.status === 'draft', nm + ': נשמר כטיוטה שממשיכה את המייל שנעצר');
  // הרשימה אחרי השמירה: המייל החדש עם "ממשיך מאיפה שנעצר"
  await page.evaluate((D) => { D.email_campaigns = [D.__c4, ...D.email_campaigns]; sb = __stub(D); window.boShow('mail'); }, { ...D, __c4: C4 });
  await page.waitForTimeout(1200);
  ok(await page.evaluate(() => document.querySelector('[data-id="c4"]').innerText.includes('ממשיך מאיפה שנעצר: מה חדש ברשימת קניות')), nm + ': ברשימה — "🔁 ממשיך מאיפה שנעצר"');
  await top(page, '[data-id="c4"]'); await page.screenshot({ path: OUT + '/3-list-with-continuation-' + nm + '.png' });
  ok(!errors.length, nm + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}
await browser.close(); server.close();
