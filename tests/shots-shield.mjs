// צילומי מסך + בדיקה: 🛡️ בוטים ואבטחה — קטגוריה נפרדת בבק אופיס, חומת ההגנה, היומן, החסימות וההגדרות
//   OUT=תיקייה node shots-shield.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const STUB = `window.__saved=[];window.__stub=function(D){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>new Promise(r=>setTimeout(r,40)).then(()=>({data:D[k]||[],error:null,count:3})).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');if(p==='upsert')return(v)=>{__saved.push(v);return c;};return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:()=>Promise.resolve({data:{},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const ok = (c, m) => { if (!c) { console.log('❌', m); process.exitCode = 1; } else console.log('✅', m); };
const load = [];
for (let m = 24 * 60; m >= 1; m--) { const spike = m > 95 && m < 112; const base = 180 + Math.round(120 * Math.sin(m / 200) ** 2) + (m % 7) * 9;
  load.push({ at: ago(m), data: { new: spike ? 9000 + (m % 5) * 700 : base, drop: spike ? 7400 + (m % 3) * 500 : (m % 97 === 0 ? 300 : 0), flood: spike ? 40 : 0, est: 64, syn: 2, load1: 0.42, cores: 4, mem: 38, blocked: 3, attack: false, up: true } }); }
const geo = (city, country, cc, org, hosting) => ({ city, country, country_code: cc, org, hosting });
const D = {
  security_events: [
    { id: 9, at: ago(4), src: 'server', kind: 'probe', ip: '45.83.64.5', n: 1, detail: { path: '/.env', ua: 'zgrab/0.x', min: 1440, geo: geo('Amsterdam', 'הולנד', 'NL', 'DigitalOcean', true) } },
    { id: 8, at: ago(3), src: 'server', kind: 'flood', ip: '185.220.101.7', n: 0, detail: { min: 10, geo: geo('Frankfurt', 'גרמניה', 'DE', 'Hetzner Online', true) } },
    { id: 7, at: ago(96), src: 'server', kind: 'ddos', ip: '', n: 11200, detail: { base: 210, blocked: 37, top: ['103.21.4.9 (180)', '91.243.1.2 (166)', '45.95.3.3 (150)'] } },
    { id: 6, at: ago(40), src: 'server', kind: 'direct', ip: '34.12.88.4', n: 1, detail: { path: '/compare', ua: 'python-requests/2.32', min: 60, geo: geo('Council Bluffs', 'ארה״ב', 'US', 'Google Cloud', true) } },
    { id: 5, at: ago(300), src: 'db', kind: 'db_rate', ip: '79.177.12.4', n: 601, detail: { min: 10, user: '', path: '/rest/v1/feedback' } },
    { id: 4, at: ago(600), src: 'server', kind: 'ssh', ip: '218.92.0.9', n: 14, detail: { min: 60, geo: geo('Nanjing', 'סין', 'CN', 'Chinanet') } },
    { id: 3, at: ago(900), src: 'server', kind: 'down', ip: '', n: 0, detail: { why: 'האתר לא עונה בשרת עצמו: timed out' } },
    { id: 2, at: ago(893), src: 'server', kind: 'up', ip: '', n: 0, detail: {} },
  ],
  shield_load: load,
  rate_blocks: [{ k: 'ip:79.177.12.4', ip: '79.177.12.4', until: ago(-6), n: 601, at: ago(4) }],
  'site_config:one': { value: { rate: 40, burst: 200, blocked: [{ ip: '193.32.162.0/24', note: 'סורק קבוע' }], allow: [{ ip: '212.150.0.10', note: 'נטפרי' }] } },
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
for (const [w, h, nm, dark] of [[1280, 1000, 'computer', false], [390, 900, 'phone', false], [390, 900, 'phone-dark', true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL', deviceScaleFactor: 2 });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort()); await ctx.route(/fonts\.(googleapis|gstatic)|openstreetmap/, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { name: 'בודק', email: '', offline: true } })); localStorage.setItem('yam_tour165', '1'); });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('shield'); }, D);
  if (dark) await page.evaluate(() => document.body.classList.add('dark'));
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({
    grp: [...document.querySelectorAll('#boNav .bogrp')].map((g) => g.querySelector('.bogh').textContent.trim()),
    inGrp: [...[...document.querySelectorAll('#boNav .bogrp')].find((g) => /בוטים ואבטחה/.test(g.textContent)).querySelectorAll('button[data-s]')].map((b) => b.dataset.s),
    rows: document.querySelectorAll('#shTb tr').length, tiles: document.querySelectorAll('#shMain .pstile').length, bars: document.querySelectorAll('#shMain .shchart rect').length,
    pill: document.querySelector('#shMain h2 .shpill').textContent }));
  ok(/בוטים ואבטחה/.test(r.grp[1]), nm + ': הקטגוריה "בוטים ואבטחה" היא השנייה בתפריט (' + r.grp.slice(0, 3).join(' | ') + ')');
  ok(['shield', 'scrapers', 'security'].every((k) => r.inGrp.includes(k)), nm + ': בתוכה חומת ההגנה, מי מעתיק מחירים ואבטחת כניסות (' + r.inGrp.join(',') + ')');
  ok(r.rows === 8 && r.tiles === 7 && r.bars > 50, nm + ': יומן 8 אירועים, 7 משבצות, גרף (' + r.rows + '/' + r.tiles + '/' + r.bars + ')');
  ok(/פעילה/.test(r.pill), nm + ': חומת ההגנה מסומנת פעילה (מדידה מהדקה האחרונה)');
  await page.screenshot({ path: OUT + '/1-shield-top-' + nm + '.png' });
  await page.evaluate(() => { const t = document.querySelector('#shTb').closest('.card'); t.scrollIntoView(); });
  await page.screenshot({ path: OUT + '/2-shield-log-' + nm + '.png' });
  if (nm === 'computer') {
    await page.selectOption('#shK', 'probe'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => document.querySelectorAll('#shTb tr').length) === 1, nm + ': סינון "פריצה" — שורה אחת');
    await page.selectOption('#shK', '');
    await page.evaluate(() => { const t = document.querySelector('#sh_rate').closest('.card'); t.scrollIntoView(); });
    await page.screenshot({ path: OUT + '/3-shield-settings-' + nm + '.png' });
    await page.evaluate(() => { const t = document.querySelector('#shAddB').closest('.card').previousElementSibling; t.scrollIntoView(); });
    await page.screenshot({ path: OUT + '/4-shield-lists-' + nm + '.png' });
    await page.click('#shSave'); await page.waitForTimeout(400);
    const s = await page.evaluate(() => __saved.find((x) => x.key === 'shield'));
    ok(s && s.value.rate === 40 && s.value.alerts && s.value.alerts.flood === true && s.value.alerts.direct === false && s.value.blocked.length === 1, nm + ': שמירת ההגדרות שומרת את הספים, ההתראות והרשימות');
    await page.evaluate(() => { const t = [...document.querySelectorAll('#shMain .card h2')].find((x) => /מה ההגנה/.test(x.textContent)).closest('.card'); t.scrollIntoView(); });
    await page.screenshot({ path: OUT + '/5-shield-honest-' + nm + '.png' });
    await page.evaluate(() => document.querySelector('#boNav [data-s="scrapers"]').click()); await page.waitForTimeout(800);
    ok(await page.evaluate(() => !!document.querySelector('#boMain #swCard')), nm + ': "מי מעתיק מחירים" נפתח במסך משלו');
    await page.evaluate(() => document.querySelector('#boNav [data-s="prices"]').click()); await page.waitForTimeout(800);
    ok(await page.evaluate(() => !document.querySelector('#boMain #swCard')), nm + ': והוא כבר לא בתוך 💰 מחירים');
    await page.evaluate(() => document.querySelector('#boNav [data-s="dash"]').click()); await page.waitForTimeout(1200);
    ok(await page.evaluate(() => /חומת ההגנה/.test((document.querySelector('#shDash') || {}).textContent || '')), nm + ': בלוח הראשי יש שורה על מצב ההגנה');
    await page.screenshot({ path: OUT + '/6-dash-line-' + nm + '.png' });
  }
  ok(!errors.length, nm + ': בלי שגיאות JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  await ctx.close();
}
await browser.close(); server.close();
