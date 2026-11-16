// צילומי מסך + בדיקה של בחירת אייקון לקטגוריות ואייקונים שהמנהל מוסיף (לא חלק מהבדיקות האוטומטיות): node shots-category-icons.mjs <תיקייה>
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
const BASE = 'http://localhost:' + server.address().port + '/index.html';
const STUB = `window.__stub=function(D){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>Promise.resolve({data:D[k]||null,error:null}).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');if(p==='upsert')return(row)=>{if(row&&row.key)D['site_config:one']={value:row.value};return c;};return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:()=>Promise.resolve({data:{},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;
const browser = await chromium.launch();
const it = (n, q, c) => ({ id: 'i' + Math.random().toString(36).slice(2), n, q: q || '', c, done: false, ts: Date.now() });
const ITEMS = [it('חלב', '2', 'מוצרי חלב'), it('עגבניות', '1 קג', 'ירקות'), it('מלפפונים', '', 'ירקות'), it('נייר טואלט', '', 'היגיינה'), it('אקונומיקה', '', 'מוצרי ניקיון'), it('אוכל לכלב', '', 'אחר')];
const phone = { width: 390, height: 844 };
const ctx = await browser.newContext({ viewport: phone, locale: 'he-IL', deviceScaleFactor: 2 });
await ctx.route(/supabase\.(co|js)/, (r) => r.abort());
await ctx.addInitScript((st) => { localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); },
  { user: { name: 'יוסף', email: '', offline: true }, lists: [{ id: 'l1', name: 'הרשימה שלי', items: ITEMS, created: 1 }], active: 'l1' });
await ctx.addInitScript(STUB);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(BASE); await p.waitForTimeout(2200);
await p.evaluate(() => { document.querySelectorAll('.qp15').forEach((e) => e.remove()); document.querySelectorAll('#updPop,.overlay.open').forEach((e) => e.classList.remove('open')); });
let n = 0; const shot = async (name, full) => { await p.waitForTimeout(400); await p.screenshot({ path: path.join(OUT, String(++n).padStart(2, '0') + '-' + name + '.png'), fullPage: !!full }); };
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
// מנהל: בק אופיס ← קטגוריות
await p.evaluate(() => { sb = __stub({}); mfaPending = false; authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('categories'); });
await p.waitForTimeout(800); await shot('בק-אופיס-קטגוריות');
ok(await p.locator('#boMain .icpkb').count() > 5, 'יש כפתור בחירת אייקון לכל קטגוריה');
await p.locator('#boMain [data-cat] .icpkb').nth(1).click(); await shot('חלון-בחירת-אייקון');
ok(await p.locator('.icpk-ov .icpk-g button').count() > 150, 'בחלון יש הרבה אייקונים');
await p.fill('.icpk-q', 'ניקיון'); await shot('חיפוש-אייקון-ניקיון');
await p.fill('.icpk-q', 'ירקות'); await p.locator('.icpk-g button[data-icn="leafy-green"]').click();
ok((await p.locator('#boMain [data-cat] [data-f=emoji]').nth(1).inputValue()) === '🥬', 'בחירה שמה את האימוג׳י של האייקון בשדה');
await p.locator('#boMain [data-cat]').nth(1).scrollIntoViewIfNeeded(); await shot('אחרי-בחירה');
// מנהל: הוספת אייקון מהספרייה
await p.evaluate(() => openBO('icons')); await p.waitForTimeout(600); await shot('בק-אופיס-אייקונים');
await p.click('#icLibOpen'); await p.waitForSelector('#icLibGrid button'); await p.fill('#icLibQ', 'כלב'); await p.waitForTimeout(200); await shot('ספריית-אייקונים-חיפוש');
await p.locator('#icLibGrid button[data-lib="dog"]').click(); await p.fill('#icName', 'מזון לחיות'); await p.click('#icAdd'); await p.waitForTimeout(500);
await shot('אייקון-נוסף');
ok(await p.evaluate(() => icCustom.length === 1 && !!ICONS2['u-' + icCustom[0].id]), 'האייקון החדש נטען');
// העלאת תמונה משלי
await p.click('#icLibOpen');
await p.setInputFiles('#icFile', path.join(ROOT, 'favicon.png')); await p.waitForTimeout(400); await p.fill('#icName', 'הלוגו שלי'); await p.fill('#icEmo', '🏷️');
await p.click('#icAdd'); await p.waitForTimeout(500); await shot('העלאת-תמונה');
ok(await p.evaluate(() => icCustom.length === 2 && EMO_IC['🏷'] === 'u-' + icCustom[1].id), 'תמונה שהועלתה מחליפה את האימוג׳י שנבחר');
// האייקונים שהוספתי מופיעים בחלון הבחירה — קטגוריה חדשה "מזון לחיות" עם הכלב
await p.evaluate(() => openBO('categories')); await p.waitForTimeout(600);
await p.fill('#ncName', 'מזון לחיות'); await p.locator('#boMain .card').first().locator('.icpkb').click(); await shot('חלון-עם-האייקונים-שלי');
await p.locator('.icpk-g button[data-icn^="u-"]').first().click();
const pua = await p.locator('#ncEmoji').inputValue();
await p.click('#ncAdd'); await p.waitForTimeout(300); await p.click('#catSave'); await p.waitForTimeout(500);
// באתר: הקטגוריה החדשה עם האייקון שהוספתי, ושיתוף בוואטסאפ בלי התו הפרטי
await p.evaluate(() => { document.querySelector('#bo').classList.add('hidden'); setTab('list'); const l = curList(); l.items.find((i) => i.n === 'אוכל לכלב').c = 'מזון לחיות'; save(); render(); });
await p.evaluate(() => { state.group = true; renderList(); }); await p.waitForTimeout(500);
await p.evaluate(() => { const h = [...document.querySelectorAll('.grp h3')].find((x) => x.textContent.includes('מזון לחיות')); if (h) h.scrollIntoView({ block: 'center' }); });
await shot('קטגוריה-חדשה-באתר');
ok(await p.evaluate(() => [...document.querySelectorAll('.grp h3')].some((x) => x.textContent.includes('מזון לחיות') && x.querySelector('svg.ic2[data-n^="u-"]'))), 'הקטגוריה החדשה מוצגת באתר עם האייקון שהוספתי');
await p.evaluate(() => document.querySelectorAll('.overlay.open').forEach((e) => e.classList.remove('open')));
const txt = await p.evaluate(() => shareText(true));
ok(/[\uE000-\uF8FF]/.test(pua) && txt.includes('מזון לחיות') && !/[\uE000-\uF8FF]/.test(txt), 'בטקסט לוואטסאפ אין תו פרטי');
// משתמש: עריכת מוצר — בחירת אייקון
await p.evaluate(() => openProductEdit('חלב')); await p.waitForTimeout(500); await shot('עריכת-מוצר');
await p.locator('#v8SheetBody .icpkb').click(); await p.fill('.icpk-q', 'חלב'); await shot('עריכת-מוצר-בחירה');
ok(await p.locator('.icpk-ft [data-icadd]').count() === 0, 'למשתמש באתר אין כפתור "הוספת אייקון חדש"');
await p.keyboard.press('Escape');
const dark = await browser.newContext({ viewport: phone, locale: 'he-IL', deviceScaleFactor: 2, colorScheme: 'dark' });
await dark.close();
console.log('errors', errs);
await browser.close(); server.close();
