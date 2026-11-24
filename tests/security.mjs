// בדיקות אבטחה לאתר — שאף נתון שמגיע מהענן / ממשתמש אחר לא יכול להזריק קוד לדף, ושמה שנמחק לא חוזר בסנכרון:
//   cd tests && npm install && node security.mjs
// האתר רץ במצב "בלי חיבור לענן" (השרת של Supabase חסום), ובמקומות שצריך נתונים — שרת מדומה.
// משתני סביבה (לא חובה): CHROMIUM=נתיב לכרומיום · CDN_DIR=תיקייה עם ספריות ה-CDN (כשאין אינטרנט)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCRIPT_CSP } from './site-csp.mjs';

const ROOT = process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', ...(p.endsWith('.html') ? { 'Content-Security-Policy': SCRIPT_CSP } : {}) }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';

const results = [];
async function test(name, fn) {
  try { await fn(); results.push(['✅', name]); } catch (e) { results.push(['❌', name, e.message]); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

// שרת מדומה: sb.from(טבלה) / sb.rpc(שם) מחזירים את הנתונים שהוגדרו
const STUB = `window.__stub=function(D){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>Promise.resolve({data:D[k]||[],error:null}).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:()=>Promise.resolve({data:{},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;

// מטענים זדוניים
const XSS_E = '<img src=x onerror="window.__pwned=1">';
const XSS_ID = 'x" onmouseover="window.__pwned=1" data-z="';
const XSS_IMG = 'data:image/png;base64,x" onerror="window.__pwned=1';
const XSS_URL = 'javascript:window.__pwned=1';

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, locale: 'he-IL' });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort());
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  if (process.env.CDN_DIR) {
  }
  await ctx.addInitScript((st) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); }, opts.state || { user: { name: 'בודק', email: '', offline: true } });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await page.goto(BASE); await page.waitForTimeout(1800);
  return { ctx, page, errors };
}
// אין הזרקה: הדגל לא נדלק, ואין בדף אלמנט עם מאזין שהגיע מהנתונים
const noInjection = async (page, where) => {
  const r = await page.evaluate(() => {
    document.querySelectorAll('[data-tgl],[data-id],[data-del],[data-edititem],.em,img').forEach((el) => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    return { pwned: window.__pwned, bad: [...document.querySelectorAll('[onerror],[onmouseover],img[src="x"]')].map((e) => e.outerHTML.slice(0, 120)), js: [...document.querySelectorAll('a[href]')].filter((a) => /^\s*javascript:/i.test(a.getAttribute('href'))).length };
  });
  await page.waitForTimeout(150);
  const late = await page.evaluate(() => window.__pwned);
  assert(r.pwned === undefined && late === undefined, where + ': הקוד הזדוני רץ');
  assert(!r.bad.length, where + ': הוזרק אלמנט: ' + r.bad.join(' | '));
  assert(!r.js, where + ': יש קישור javascript:');
};

await test('esc: מספרים, 0, null ו-false', async () => {
  const { ctx, page } = await newPage();
  const r = await page.evaluate(() => [esc(0), esc(12), esc(null), esc(undefined), esc(false), esc('<a href="x">\'')]);
  assert(JSON.stringify(r) === JSON.stringify(['0', '12', '', '', '', '&lt;a href=&quot;x&quot;&gt;&#39;']), JSON.stringify(r));
  await ctx.close();
});

await test('safeImg / safeLink / safeUrl קפדניים', async () => {
  const { ctx, page } = await newPage();
  const r = await page.evaluate(([img, url]) => ({
    img: safeImg(img), js: safeImg(url), ok: safeImg('data:image/jpeg;base64,AAAA+/=='), https: safeImg('https://x.supabase.co/a.png'), q: safeImg('https://x/a.png" onerror="1'), http: safeImg('http://x/a.png'), num: safeImg(5),
    link: safeLink(url), linkOk: safeLink('https://a.b/c?d=1'), url: safeUrl(url), urlOk: safeUrl('shop.co.il'),
  }), [XSS_IMG, XSS_URL]);
  assert(r.img === '' && r.js === '' && r.q === '' && r.http === '' && r.num === '', 'תמונה זדונית עברה: ' + JSON.stringify(r));
  assert(r.ok && r.https, 'תמונה תקינה נחסמה');
  assert(r.link === '' && r.url === '', 'קישור javascript עבר');
  assert(r.linkOk && r.urlOk === 'https://shop.co.il/', 'קישור תקין נחסם: ' + r.urlOk);
  await ctx.close();
});

await test('נתונים זדוניים מהענן (applyRemote) — אימוג׳י, מזהה ושם רשימה לא מזריקים קוד', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(([e, id]) => {
    const lid = state.lists[0].id;
    applyRemote({ lists: [{ id: lid, name: 'סופר', items: [{ id, n: 'חלב', q: 2, e, done: false, ts: Date.now() }, { id: 'ok-1', n: '<b>לחם</b>', q: '', e: '🍞', done: 'yes', ts: Date.now() }] }, { id: id + '2', name: '<img src=x onerror="window.__pwned=1">', items: [], created: 1 }],
      history: [{ ts: Date.now(), listName: '<img src=x onerror="window.__pwned=1">', items: [{ n: 'x', q: '', e }] }] }, false);
    save(true); render(); state.group = true; render(); state.group = false; setTab('hist'); setTab('list'); render();
    const items = state.lists.flatMap((l) => l.items);
    return { ids: items.map((i) => i.id).concat(state.lists.map((l) => l.id)), emo: items.map((i) => i.e), done: items.find((i) => i.id === 'ok-1').done, histE: state.history[0].items[0].e, names: document.querySelector('#paneList').textContent };
  }, [XSS_E, XSS_ID]);
  assert(r.ids.every((x) => /^[\w-]{1,64}$/.test(x)), 'מזהה לא נוקה: ' + r.ids.join(','));
  assert(r.emo.every((x) => !/[<>"]/.test(x)) && !/[<>"]/.test(r.histE), 'אימוג׳י לא נוקה');
  assert(r.done === true, 'done לא הומר לבוליאני');
  assert(r.names.includes('<b>לחם</b>'), 'שם המוצר לא מוצג כטקסט: ' + r.names.slice(0, 300));
  await noInjection(page, 'רשימה/היסטוריה');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('נתונים זדוניים שכבר שמורים במכשיר מנוקים בטעינה', async () => {
  const lid = 'L1';
  const st = { user: { name: 'בודק', email: '', offline: true }, active: lid, lists: [{ id: lid, name: 'סופר', created: 1, items: [{ id: XSS_ID, n: 'חלב', q: '', e: XSS_E, done: false, ts: 1 }] }] };
  const { ctx, page, errors } = await newPage({ state: st });
  const r = await page.evaluate(() => state.lists[0].items.map((i) => i.id + '|' + i.e));
  assert(r.length === 1 && /^[\w-]+\|[^<>"]+$/.test(r[0]), 'לא נוקה: ' + r[0]);
  await noInjection(page, 'טעינה');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('דף עסק: לוגו, תמונות מוצרים וכפתור "לאתר" זדוניים לא מוזרקים', async () => {
  const { ctx, page } = await newPage();
  await page.evaluate(([img, url]) => {
    const biz = { chain: 'חנות', about: 'x', url, phone: '', logo: img, items: [{ id: 1, name: 'חלב', price: 5, image: img, in_stock: true }] };
    sb = __stub({ 'rpc:store_public': biz, 'rpc:store_public:one': biz, 'rpc:biz_directory': [{ chain: 'חנות', logo: img }] });
    authUser = { id: 'me', email: 'x@y.z' };
    openStorePublic('חנות');
  }, [XSS_IMG, XSS_URL]);
  await page.waitForTimeout(800);
  await noInjection(page, 'דף עסק');
  await page.evaluate(() => { try { openBizDirectory(); } catch (e) {} });
  await page.waitForTimeout(600);
  await noInjection(page, 'מדריך עסקים');
  await ctx.close();
});

await test('מחיקה לא חוזרת ממכשיר אחר (מצבות), והוספה מחדש עובדת', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(() => {
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const names = () => curList().items.map((i) => i.n).sort().join(',');
    addItem('חלב', ''); addItem('לחם', ''); addItem('ביצים', '');
    const deviceB = clone(syncPayload()); // מכשיר ב׳ עדיין מחזיק את כל המוצרים
    const milk = curList().items.find((i) => i.n === 'חלב');
    removeItem(milk.id); // מכשיר א׳ מוחק
    applyRemote(clone(deviceB), false); const afterMerge = names();
    // מכשיר ב׳ מקבל את המצב של א׳ (עם המצבה) — החלב נמחק גם אצלו
    const fromA = clone(syncPayload());
    const bState = clone(deviceB.lists); const keep = state.lists, keepT = state.tomb; state.lists = bState; state.tomb = {}; applyRemote(fromA, false); const onB = names(); state.lists = keep; state.tomb = keepT;
    // מוסיפים שוב חלב — מזהה חדש, ולא נעלם בסנכרון הבא עם ב׳ הישן
    addItem('חלב', '2'); const newId = curList().items.find((i) => i.n === 'חלב').id;
    applyRemote(clone(deviceB), false); const reAdded = names();
    // סיום קנייה: מה שעבר להיסטוריה לא חוזר לרשימה
    curList().items.forEach((i) => { if (i.n === 'לחם') { i.done = true; i.ts = Date.now(); } });
    const n = finishList(true); applyRemote(clone(deviceB), false); const afterFinish = names();
    // ביטול מחיקה (undo) מחזיר את המוצר גם אחרי סנכרון
    const egg = curList().items.find((i) => i.n === 'ביצים'); removeItem(egg.id); undoAction && undoAction(); applyRemote({ lists: [], tomb: clone(state.tomb) }, false); const afterUndo = names();
    return { afterMerge, onB, reAdded, newId, oldId: milk.id, n, afterFinish, afterUndo, histLen: state.history.length, sync: SYNC_KEYS.includes('tomb') };
  });
  assert(r.sync, 'tomb לא נשמר בענן');
  assert(r.afterMerge === 'ביצים,לחם', 'החלב חזר אחרי מיזוג: ' + r.afterMerge);
  assert(r.onB === 'ביצים,לחם', 'החלב לא נמחק במכשיר השני: ' + r.onB);
  assert(r.reAdded === 'ביצים,חלב,לחם' && r.newId !== r.oldId, 'הוספה מחדש לא עבדה: ' + r.reAdded);
  assert(r.n === 1 && r.afterFinish === 'ביצים,חלב' && r.histLen === 1, 'סיום קנייה: ' + JSON.stringify(r));
  assert(r.afterUndo === 'ביצים,חלב', 'ביטול מחיקה לא החזיר: ' + r.afterUndo);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('הדפסה כשהדפדפן חוסם חלון קופץ — בלי שגיאה, עם הודעה', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(() => { addItem('חלב', ''); window.open = () => null; let err = ''; try { printList(); } catch (e) { err = e.message; } return { err, msg: document.querySelector('#flash').textContent }; });
  assert(!r.err, 'printList זרק: ' + r.err);
  assert(/חסם/.test(r.msg), 'אין הודעה: ' + r.msg);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('פעולות הרסניות מהבינה המלאכותית דורשות אישור; הוספה — אוטומטית', async () => {
  const { ctx, page } = await newPage();
  const r = await page.evaluate(async () => {
    addItem('חלב', ''); curList().items[0].done = true;
    let asked = 0; window.uiConfirm = async () => { asked++; return false; };
    await aiAction({ type: 'finish_shopping' }); await aiAction({ type: 'remove_items', items: [{ name: 'חלב' }] }); await aiAction({ type: 'logout' });
    const kept = curList().items.length;
    await aiAction({ type: 'add_items', items: [{ name: 'לחם' }] });
    const added = curList().items.some((i) => i.n === 'לחם');
    window.uiConfirm = async () => true; await aiAction({ type: 'remove_items', items: [{ name: 'לחם' }] });
    return { asked, kept, added, removed: !curList().items.some((i) => i.n === 'לחם'), user: !!state.user };
  });
  assert(r.asked === 3 && r.kept === 1 && r.user, 'פעולה הרסנית רצה בלי אישור: ' + JSON.stringify(r));
  assert(r.added, 'הוספה לא רצה'); assert(r.removed, 'מחיקה שאושרה לא רצה');
  await ctx.close();
});

await test('מצבות וחותמות זמן מהעתיד לא תוקעות מחיקות, ותאריך פגום לא מפיל את הדף', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(() => {
    const out = {};
    addItem('חלב', ''); const it = curList().items[0];
    removeItem(it.id);
    const fake = {}; for (let i = 0; i < 2100; i++) fake['f' + i] = Date.now() + 864e5 * 365;
    applyRemote({ lists: [], tomb: { items: fake, lists: { [state.active]: 9e15 } } }, false);
    out.genuineKept = !!state.tomb.items[it.id]; out.fakeKept = Object.keys(state.tomb.items).some((k) => k.startsWith('f'));
    out.listAlive = state.lists.length > 0;
    const l = curList();
    const remote = { lists: [{ id: l.id, name: l.name, created: l.created, items: [{ id: 'skew', n: 'במבה', q: '', ts: Date.now() + 10 * 60e3 }, { id: 'big', n: 'גבינה', ts: 1e20 }] }] };
    applyRemote(JSON.parse(JSON.stringify(remote)), false);
    out.bigClamped = curList().items.find((i) => i.id === 'big').ts <= Date.now() + 864e5;
    removeItem('skew'); applyRemote(JSON.parse(JSON.stringify(remote)), false);
    out.skewBack = curList().items.some((i) => i.id === 'skew');
    applyRemote({ history: [{ ts: 1e20, listName: 'x', items: [{ n: 'a' }] }] }, false);
    out.histOk = state.history.every((h) => h.ts <= Date.now() + 864e5);
    out.fmt = fmtDate(new Date(NaN)) + '|' + fmtTime(new Date(1e20));
    setTab('hist'); setTab('list'); render();
    return out;
  });
  assert(r.genuineKept && !r.fakeKept, 'מצבות מזויפות דחקו מצבה אמיתית: ' + JSON.stringify(r));
  assert(r.listAlive, 'מצבה מהעתיד מחקה את הרשימה');
  assert(r.bigClamped && r.histOk, 'חותמת זמן מהעתיד לא הוגבלה');
  assert(!r.skewBack, 'פריט עם שעון מקדים חזר אחרי מחיקה');
  assert(r.fmt === '|', 'תאריך פגום: ' + r.fmt);
  assert(!errors.length, 'שגיאות: ' + errors.join(' | '));
  await ctx.close();
});

await test('נתונים פגומים מהענן לא מפילים את האתר ולא משאירים חצי עדכון', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(() => {
    addItem('חלב', '');
    applyRemote({ customPantry: [5, 'x'.repeat(200), 'אגס'], missingHome: [5], knowledge: [{ q: 5 }, null, { q: 'ש', a: 'ת' }], templates: [null, 3, { name: 'ת', items: [null, { n: 'חלב' }] }], plans: { 1: 'x', 2: ['לחם', 5] }, stock: { 'חלב': 'zz' }, me: { ts: 9e15, address: 5, stores: 'x' }, errands: 'x' }, false);
    const ok = state.customPantry.every((x) => typeof x === 'string' && x.length <= 80) && state.missingHome.every((x) => typeof x === 'string') && state.templates.every((t) => t && typeof t === 'object') && state.knowledge.every((k) => typeof k.q === 'string') && Array.isArray(state.errands) && state.me.ts <= Date.now() + 864e5;
    setTab('home'); setTab('list'); render(); addItem('לחם', '');
    /* כשל באמצע — המצב חוזר לקדמותו */
    const before = JSON.stringify(state.lists); const realMerge = mergeLists; mergeLists = () => { throw new Error('boom'); };
    let threw = false; try { applyRemote({ lists: [{ id: 'n', name: 'n', items: [] }], history: [{ ts: 1, listName: 'h', items: [] }] }, false); } catch (e) { threw = true; }
    mergeLists = realMerge;
    return { ok, threw, restored: JSON.stringify(state.lists) === before, histClean: !state.history.some((h) => h.listName === 'h') };
  });
  assert(r.ok, 'ערכים פגומים לא נוקו');
  assert(!r.threw && r.restored && r.histClean, 'כשל באמצע השאיר חצי עדכון: ' + JSON.stringify(r));
  assert(!errors.length, 'שגיאות: ' + errors.join(' | '));
  await ctx.close();
});

await test('ברשימה משותפת: האזור האישי לא נשלח ולא נדרס; כמות ושם מתעדכנים לפי הזמן', async () => {
  const { ctx, page } = await newPage();
  const r = await page.evaluate(() => {
    state.me = { ts: Date.now(), address: { street: 'שלי' }, stores: [], orders: [], providers: [] }; state.follow = 'FAMILY1';
    const payloadHasMe = 'me' in syncPayload();
    applyRemote({ me: { ts: Date.now() + 1000, address: { street: 'של המשפחה' } } }, false);
    const myStreet = state.me.address.street; state.follow = null;
    addItem('חלב', '1'); const it = curList().items[0]; it.ts = 1; addItem('חלב', '2');
    const l = curList(); const remoteOld = { lists: [{ id: l.id, name: l.name, created: l.created, items: [Object.assign({}, it, { q: '1', ts: 5 })] }] };
    applyRemote(remoteOld, false);
    const q = curList().items[0].q;
    curList().name = 'חדש'; curList().nameTs = Date.now();
    applyRemote({ lists: [{ id: l.id, name: 'ישן', nameTs: 1, created: l.created, items: [] }] }, false);
    /* רשימה שנמחקה במכשיר אחר אבל נערכה כאן אחרי המחיקה — נשארת */
    const lid = l.id; curList().items[0].ts = Date.now() + 1000;
    applyRemote({ tomb: { lists: { [lid]: Date.now() }, items: {} } }, false);
    return { payloadHasMe, myStreet, q, name: curList().name, listSurvived: state.lists.some((x) => x.id === lid) };
  });
  assert(!r.payloadHasMe && r.myStreet === 'שלי', 'האזור האישי עבר ברשימה משותפת: ' + JSON.stringify(r));
  assert(r.q === '3', 'עדכון כמות נדרס בסנכרון: ' + r.q);
  assert(r.name === 'חדש', 'שם רשימה ישן דרס חדש');
  assert(r.listSurvived, 'רשימה שנערכה אחרי המחיקה נעלמה');
  await ctx.close();
});

await test('שמירה לענן: קוראים, ממזגים (כולל מחיקות של אחרים) ורק אז כותבים', async () => {
  const { ctx, page } = await newPage();
  const r = await page.evaluate(async () => {
    addItem('חלב', ''); const l = curList();
    const server = { lists: [{ id: l.id, name: l.name, created: l.created, items: [{ id: 'other', n: 'לחם', q: '', ts: Date.now() }, Object.assign({}, l.items[0])] }], tomb: { items: { [l.items[0].id]: Date.now() + 5000 }, lists: {} }, me: { address: { street: 'בעלים' } }, history: [{ ts: 1, listName: 'ישן', items: [] }] };
    let sent = null;
    sb = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { data: JSON.parse(JSON.stringify(server)) }, error: null }) }) }), update: (o) => { sent = o; return { eq: async () => ({ error: null }) }; } }), rpc: async () => ({ data: null }), removeChannel() {} };
    state.follow = 'FAM'; state.room = 'FAM'; cloudOn = true; roomAcc15 = null; pushCloud();
    await new Promise((res) => setTimeout(res, 1500)); cloudOn = false;
    const names = sent ? sent.data.lists[0].items.map((i) => i.n) : null;
    return { names, me: sent && sent.data.me && sent.data.me.address.street, local: curList().items.map((i) => i.n) };
  });
  assert(r.names && r.names.includes('לחם') && !r.names.includes('חלב'), 'המיזוג לפני הכתיבה לא עבד: ' + JSON.stringify(r));
  assert(r.me === 'בעלים', 'האזור האישי של בעל הרשימה נדרס');
  await ctx.close();
});

await test('יציאה: גם כשהשרת נכשל — החיבור והנתונים האישיים נמחקים מהמכשיר', async () => {
  const { ctx, page } = await newPage();
  const r = await page.evaluate(async () => {
    const calls = [];
    sb = __stub({}); sb.auth.signOut = (o) => { calls.push(o ? o.scope : 'global'); return Promise.resolve(o ? {} : { error: { message: 'network' } }); };
    authUser = { id: 'u1', email: 'a@b.c' };
    ['sb-x-auth-token', 'yam_myprod_v1', 'yam_geo_cache_v1', 'yam_inbox_seen', 'yamh_mid'].forEach((k) => localStorage.setItem(k, '{}'));
    myProd = { 'פרטי': {} };
    window.uiConfirm = async () => true; await doLogout();
    const left = ['sb-x-auth-token', 'yam_myprod_v1', 'yam_geo_cache_v1', 'yam_inbox_seen', 'yamh_mid'].filter((k) => localStorage.getItem(k) !== null);
    return { calls, left, myProd: Object.keys(myProd).length };
  });
  assert(r.calls.join(',') === 'global,local', 'לא נוסתה יציאה מקומית: ' + r.calls);
  assert(!r.left.length && !r.myProd, 'נשארו נתונים: ' + r.left);
  await ctx.close();
});

await test('הזמנה: הקישור והסיסמה החד פעמית נשלחים בנפרד; מטבע זדוני לא מוזרק', async () => {
  const { ctx, page } = await newPage();
  const r = await page.evaluate(async () => {
    sb = __stub({ 'rpc:room_members_list': { members: [], invites: [] }, 'rpc:room_invite_create': { token: 'abcdef0123456789abcd', otp: '482913' } });
    authUser = { id: 'me', email: 'x@y.z' }; roomAcc15 = null;
    await openMembers15(); document.querySelector('#invCreate').click();
    await new Promise((res) => setTimeout(res, 400));
    const hrefs = [...document.querySelectorAll('#invOut a')].map((a) => decodeURIComponent(a.getAttribute('href')));
    return { hrefs, hasCode: !!document.querySelector('#invCopyCode'), price: fmtPrice(5, '<img src=x onerror=1>') };
  });
  assert(r.hrefs.length && r.hrefs.every((h) => h.includes('#join-') && !h.includes('482913')), 'הסיסמה נשלחת יחד עם הקישור');
  assert(r.hasCode, 'אין כפתור להעתקת הסיסמה');
  assert(!/[<>]/.test(r.price), 'מטבע זדוני: ' + r.price);
  await ctx.close();
});

await browser.close(); server.close();
for (const r of results) console.log(r.join(' '));
const failed = results.filter((r) => r[0] === '❌').length;
console.log(failed ? `\n${failed} בדיקות נכשלו` : `\nכל ${results.length} הבדיקות עברו 🎉`);
process.exit(failed ? 1 : 0);
