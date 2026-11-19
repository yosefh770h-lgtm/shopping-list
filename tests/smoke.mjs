// בדיקות אוטומטיות לאתר — רצות לפני כל עדכון (GitHub Actions) וגם מקומית:
//   cd tests && npm install && node smoke.mjs
// האתר רץ במצב "בלי חיבור לענן" (השרת של Supabase חסום), ובמקומות שצריך נתונים — שרת מדומה.
// משתני סביבה (לא חובה): CHROMIUM=נתיב לכרומיום · CDN_DIR=תיקייה עם ספריות ה-CDN (כשאין אינטרנט) · BARCODE_Y4M=סרטון מצלמה מדומה עם ברקוד
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shopping-list-site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port + '/index.html';

const results = [];
async function test(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return; // ONLY=קהילה node smoke.mjs — רק בדיקות שהשם שלהן מכיל את המילה
  try { await fn(); results.push(['✅', name]); } catch (e) { results.push(['❌', name, process.env.DBG ? e.message + ' ' + (e.stack || '').split('\n').filter((l) => /smoke.mjs/.test(l)).slice(0, 2).join(' ') : e.message]); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

const launchArgs = process.env.BARCODE_Y4M ? ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + process.env.BARCODE_Y4M] : [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: launchArgs });

// שרת מדומה: sb.from(טבלה) מחזיר את הנתונים שהוגדרו לטבלה
const STUB = `window.__stub=function(D){const mk=k=>{const c=new Proxy(function(){},{get(t,p){if(p==='then')return(res,rej)=>Promise.resolve({data:D[k]||[],error:null}).then(res,rej);if(p==='maybeSingle'||p==='single')return()=>mk(k+':one');return(...a)=>c;},apply(){return c;}});return c;};
  return{from:n=>mk(n),rpc:n=>mk('rpc:'+n),functions:{invoke:()=>Promise.resolve({data:{},error:null})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},signOut:()=>Promise.resolve({})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}};};`;

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, locale: 'he-IL', permissions: opts.camera ? ['camera'] : [], userAgent: opts.userAgent });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort());
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  if (!opts.priceApi) await ctx.route(/\/api\/prices\//, (r) => r.abort());
  else await ctx.route(/\/api\/prices\//, opts.priceApi);
  if (process.env.CDN_DIR) {
    await ctx.route(/cdn\.jsdelivr\.net.*hebcal.*bundle\.min\.js/, (r) => r.fulfill({ path: path.join(process.env.CDN_DIR, 'hebcal.min.js'), contentType: 'text/javascript' }));
    await ctx.route(/cdn\.jsdelivr\.net.*zxing.*index\.min\.js/, (r) => r.fulfill({ path: path.join(process.env.CDN_DIR, 'zxing.min.js'), contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }));
  }
  await ctx.addInitScript((st) => { if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify(st)); localStorage.setItem('yam_tour165', '1'); }, { user: { name: 'בודק', email: '', offline: true } });
  await ctx.addInitScript(STUB);
  if (opts.init) await ctx.addInitScript(opts.init);
  if (opts.adblock) await ctx.addInitScript(() => { new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.id && /^yb(Side|Pop|Top)$/.test(n.id)) n.remove(); }))).observe(document, { childList: true, subtree: true }); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2000);
  return { ctx, page, errors };
}

await test('האתר נטען בלי שגיאות', async () => {
  const { ctx, page, errors } = await newPage();
  assert(await page.evaluate(() => !!document.querySelector('#paneList')), 'אין רשימה');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('חוסם פרסומות שמוחק את הפרסומות מהדף לא שובר את האתר', async () => {
  const { ctx, page, errors } = await newPage({ viewport: { width: 1920, height: 1000 }, adblock: true });
  assert(await page.evaluate(() => !document.querySelector('#ybSide') && !!state && Array.isArray(state.recurring) && !!document.querySelector('#paneList')), 'האתר לא נטען');
  await page.evaluate(() => { hideAds(); renderSideAd(); renderBannerAd(); closeAdPop(); });
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('סידורים דרך יאמי + מלל ארוך לא בורח מהצ\'אט', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate(() => { openBot(); sendToBot('סידור: לעבור אצל התופרת, לשלוח אישור מחלה'); });
  await page.waitForTimeout(400);
  await page.evaluate(() => sendToBot('עשיתי תופרת')); await page.waitForTimeout(400);
  await page.evaluate(() => sendToBot('a'.repeat(120) + ' https://www.yamshopping.com/' + 'x'.repeat(80))); await page.waitForTimeout(700);
  const r = await page.evaluate(() => ({ e: state.errands.map((e) => e.t + (e.done ? '✓' : '')), sw: document.querySelector('#botMsgs').scrollWidth, cw: document.querySelector('#botMsgs').clientWidth }));
  assert(r.e.includes('לעבור אצל התופרת✓') && r.e.includes('לשלוח אישור מחלה'), 'סידורים: ' + r.e.join(','));
  assert(r.sw <= r.cw + 1, 'הצ\'אט רחב מהמסך: ' + r.sw + '>' + r.cw);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('יציאה מהחשבון: כל הניקויים רצים פעם אחת, ובלי אינטרנט עם שינויים שלא נשמרו אפשר לבטל', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(async () => {
    sb = window.__stub({}); authUser = { id: 'tester', email: 't@example.com' };
    const acts = []; logAct = (a) => acts.push(a);
    const fill = () => { state.stock = { חלב: 2 }; state.missingHome = ['לחם']; state.templates = [{ id: 1 }]; state.errands = [{ id: 'e1' }]; state.budget = { x: 1 }; state.homeMod = { a: 1 }; inbox = [{ id: 'n1' }]; };
    const out = {};
    // 1) בלי אינטרנט + שינויים שלא נשמרו + לוחצים "ביטול" — לא יוצאים ולא מוחקים כלום
    fill(); const realOff = isOffline, realConfirm = window.uiConfirm;
    isOffline = () => true; offPending = 1; window.uiConfirm = async () => false;
    await doLogout();
    out.cancelKept = !!authUser && state.stock.חלב === 2 && inbox.length === 1 && acts.length === 0;
    isOffline = realOff; offPending = 0; window.uiConfirm = realConfirm;
    // 2) יציאה רגילה
    await doLogout();
    out.loggedOut = authUser === null;
    out.cleared = JSON.stringify(state.stock) === '{}' && state.missingHome.length === 0 && state.templates.length === 0 && state.errands.length === 0 && JSON.stringify(state.homeMod) === '{}' && !!state.budget && !state.budget.x && inbox.length === 0;
    out.acts = acts.join(',');
    out.oneHookEach = typeof onLogout === 'function' && LOGOUT_HOOKS.guard.length === 1 && LOGOUT_HOOKS.reset.length === 4;
    return out;
  });
  assert(r.cancelKept, 'ביטול היציאה בלי אינטרנט בכל זאת ניקה/יצא');
  assert(r.loggedOut, 'לא יצא מהחשבון');
  assert(r.cleared, 'נשאר מידע של המשתמש אחרי יציאה');
  assert(r.acts === 'logout', 'רישום היציאה ביומן: ' + r.acts);
  assert(r.oneHookEach, 'מספר הניקויים הרשומים לא כצפוי');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('יאמי: ברכה/מילת מפתח בתוך בקשה אמיתית לא נבלעת בתשובה מוכנה — הבקשה וההיסטוריה מגיעות לבינה המלאכותית', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(async () => {
    const calls = [];
    sb = window.__stub({}); authUser = { id: 'tester', email: 't@example.com' }; aiOff = false;
    sb.functions.invoke = (n, o) => { calls.push(o && o.body); return Promise.resolve({ data: { text: 'AI#' + calls.length, actions: [] }, error: null }); };
    doLogout = async () => { window.__loggedOut = true; };
    state.bot = []; state.history = [{ ts: 1, items: [{ n: 'חלב' }] }];
    const ask = async (m) => { meSay(m); const mine = state.bot[state.bot.length - 1]; await botReply(m); return state.bot.slice(state.bot.lastIndexOf(mine) + 1).map((x) => x.txt).join(' ‖ '); };
    const out = {};
    out.pizza = await ask('מה קורה יש מצב שאת בודקת לי על פיצה טובה בבני ברק ליד מכון מור');
    out.again = await ask('תסתכל שוב על מה ששלחתי לך קודם');
    out.hist = (calls[1] && calls[1].messages || []).map((h) => h.role + ':' + h.content);
    for (const m of ['הטלפון התנתק מהוויפי מה לעשות', 'אל תמחקי את ההיסטוריה', 'איפה יש פיצה טובה בבני ברק', 'מה השעה שהפיצריה נסגרת', 'יש פיצריה טובה קרוב אליי?']) out[m] = await ask(m);
    out.howru = await ask('מה קורה?'); out.thanks = await ask('תודה רבה יאמי!'); out.add = await ask('חלב 2 ולחם');
    await new Promise((res) => setTimeout(res, 1100));
    out.loggedOut = !!window.__loggedOut; out.historyLeft = state.history.length; out.aiCalls = calls.length; out.list = curList().items.map((i) => i.n).join(',');
    return out;
  });
  assert(r.pizza === 'AI#1', 'הודעת הפיצה קיבלה: ' + r.pizza);
  assert(r.again === 'AI#2', 'ההמשך קיבל: ' + r.again);
  assert(r.hist.length === 3 && r.hist[0].includes('פיצה טובה בבני ברק') && r.hist[1] === 'assistant:AI#1' && r.hist[2].includes('ששלחתי לך קודם'), 'ההיסטוריה לבינה: ' + JSON.stringify(r.hist));
  for (const m of ['הטלפון התנתק מהוויפי מה לעשות', 'אל תמחקי את ההיסטוריה', 'איפה יש פיצה טובה בבני ברק', 'מה השעה שהפיצריה נסגרת', 'יש פיצריה טובה קרוב אליי?']) assert(/^AI#\d+$/.test(r[m]), '"' + m + '" קיבל: ' + r[m]);
  assert(!r.loggedOut, 'ההודעה "התנתק מהוויפי" ניתקה את המשתמש'); assert(r.historyLeft === 1, 'ההיסטוריה נמחקה');
  assert(!/^AI#/.test(r.howru) && !/^AI#/.test(r.thanks), 'ברכה/תודה לבד צריכות תשובה מקומית: ' + r.howru + ' / ' + r.thanks);
  assert(r.list.includes('חלב') && r.list.includes('לחם') && r.aiCalls === 7, 'הוספה רגילה: ' + r.list + ' · קריאות לבינה: ' + r.aiCalls);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('יאמי: תקלה בחיבור לבינה המלאכותית — הודעה כנה ולא תשובה מוכנה; תבנית רק כשהשם הוא עיקר ההודעה', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(async () => {
    sb = window.__stub({}); authUser = { id: 'tester', email: 't@example.com' }; aiOff = false; state.bot = [];
    const ask = async (m) => { meSay(m); const mine = state.bot[state.bot.length - 1]; await botReply(m); return state.bot.slice(state.bot.lastIndexOf(mine) + 1).map((x) => x.txt).join(' ‖ '); };
    const out = {};
    sb.functions.invoke = () => Promise.reject(new TypeError('Failed to fetch'));
    out.net = await ask('איפה יש פיצה טובה בבני ברק');
    sb.functions.invoke = () => Promise.resolve({ data: null, error: { message: 'Edge Function returned a non-2xx status code', context: { status: 429, json: async () => ({ text: 'הגענו למכסת השאלות החינמית לרגע זה 😅 נסו שוב בעוד דקה.' }) } } });
    out.quota = await ask('איפה יש פיצה טובה בבני ברק');
    sb.functions.invoke = () => Promise.resolve({ data: { text: 'AI', actions: [] }, error: null });
    curList().items = [{ id: 'x1', n: 'פחמים', c: 'אחר', e: '🛒', q: '', done: false, ts: 1 }]; saveTemplate('מנגל', curList().items); curList().items = [];
    out.notTpl = await ask('מה קונים למנגל ברשימה של השכנים'); out.notTplList = curList().items.map((i) => i.n).join(',');
    out.tpl = await ask('תבנית מנגל');
    return out;
  });
  assert(/תקלה בחיבור/.test(r.net), 'שגיאת רשת: ' + r.net);
  assert(/מכסת השאלות/.test(r.quota), 'הודעת השרת (429): ' + r.quota);
  assert(r.notTpl === 'AI' && !r.notTplList, 'שאלה שמזכירה את שם התבנית הפעילה אותה: ' + r.notTpl + ' / ' + r.notTplList);
  assert(/תבנית/.test(r.tpl), '"תבנית מנגל" לא הפעיל את התבנית: ' + r.tpl);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('הפעמון: הצעה שנמחקה לא חוזרת אחרי רענון, ובלי נקודה קבועה', async () => {
  const { ctx, page } = await newPage();
  await page.evaluate(() => { prefs.notify = true; savePrefs(); notifySugg('sugg:t', '💡', ['חלב'], 'list'); openNotif(); });
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.querySelector('#nClear').click());
  await page.reload(); await page.waitForTimeout(1800);
  const r = await page.evaluate(() => { notifySugg('sugg:t', '💡', ['חלב'], 'list'); const b = document.querySelector('#btnBell'); return { badge: !document.querySelector('#bellBadge').hidden, dot: getComputedStyle(b, '::after').display }; });
  assert(!r.badge, 'ההצעה חזרה'); assert(r.dot === 'none', 'יש נקודה על הפעמון');
  await ctx.close();
});

await test('חישובי מבצע מדויקים', async () => {
  const { ctx, page } = await newPage();
  const r = await page.evaluate(() => {
    const t = (o, q) => { const c = dealCost(Object.assign({ is_deal: true, currency: 'ILS' }, o), q); return [c.cost, c.regular, c.save]; };
    return { nforx: t({ price: 4.9, regular_price: 4.9, deal_text: '3 ב-10' }, 3), partial: t({ price: 4.9, regular_price: 4.9, deal_text: '3 ב-10' }, 4),
      oneone: t({ price: 12.9, deal_text: '1+1' }, 2), half: t({ price: 10, deal_text: 'השני בחצי מחיר' }, 2), pct: t({ price: 8, deal_text: '20% הנחה' }, 1),
      expired: t({ price: 9.9, regular_price: 14.9, deal_text: 'מבצע', valid_until: '2000-01-01' }, 1) };
  });
  const eq = (a, b, m) => assert(JSON.stringify(a) === JSON.stringify(b), m + ': ' + JSON.stringify(a));
  eq(r.nforx, [10, 14.7, 4.7], '3 ב-10'); eq(r.partial, [14.9, 19.6, 4.7], '4 יחידות ב-3 ב-10'); eq(r.oneone, [12.9, 25.8, 12.9], '1+1');
  eq(r.half, [15, 20, 5], 'השני בחצי'); eq(r.pct, [8, 10, 2], '20%'); eq(r.expired, [14.9, 14.9, 0], 'מבצע שפג');
  await ctx.close();
});

const DATA = {
  clothing_shops: [{ id: '11111111-1111-1111-1111-111111111111', name: 'חנות בדיקה', gender: 'men', subs: ['suits'], wedding: true, city: 'בני ברק', address: 'רבי עקיבא 1', phone: '', website: '', about: '', status: 'approved', featured: true }],
  store_recs: [{ id: '22222222-2222-2222-2222-222222222222', section: 'men', sub: 'suits', kind: 'store', shop: 'חנות בדיקה', city: 'בני ברק', body: 'מצוין', stars: 5, by_name: 'א', status: 'approved', created_at: new Date().toISOString() }],
  activity_log: [{ user_id: 'u1', name: 'א', action: 'errand_add', detail: 'דואר', created_at: new Date().toISOString() }],
};

await test('ביגוד וחתונה: נשים, גברים, חתונה — בלי הלבשה תחתונה', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'x@y.z' }; setTab('stores'); storesView = 'clothing'; cl18.shops = null; renderStores(); }, DATA);
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const txt = () => document.querySelector('#paneStores').textContent;
    const w = txt(); cl18.g = 'men'; cl18.sub = 'suits'; renderStores(); const m = txt(); cl18.g = 'wedding'; renderStores(); const wd = txt();
    return { w, m, wd, cats: subsOf18('women').concat(subsOf18('men')).map((x) => x[2]).join(',') };
  });
  assert(r.w.includes('שמלות') && r.w.includes('חסרה קטגוריה'), 'נשים');
  assert(r.m.includes('חנות בדיקה') && r.m.includes('האתר ממליץ') && r.m.includes('לא נכון'), 'גברים/חליפות');
  assert(r.wd.includes('חליפת חתונה') && r.wd.includes('מה לעשות ולאן ללכת'), 'חתונה');
  assert(!/תחתונ/.test(r.cats) && !/תחתונ/.test(r.wd), 'יש הלבשה תחתונה');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('בק אופיס: תפריט בקבוצות, כל הלשוניות החדשות נפתחות', async () => {
  const { ctx, page, errors } = await newPage({ viewport: { width: 1366, height: 820 } });
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; }, DATA);
  for (const v of ['dash', 'pending', 'activity', 'clothing', 'errors', 'setup', 'stores', 'staff', 'updates', 'sources', 'security']) {
    await page.evaluate((v) => openBO(v), v); await page.waitForTimeout(700);
    const t = await page.evaluate(() => document.querySelector('#boMain').textContent);
    assert(t.length > 20 && !/טוען\.\.\.$/.test(t.trim()), 'הלשונית ' + v + ' ריקה');
  }
  // כפתור הפעלה/כיבוי של אימות המייל בהרשמה
  const sec = await page.evaluate(() => document.querySelector('#boMain').textContent.includes('אימות מייל בהרשמה') && !!document.querySelector('#scVerify'));
  assert(sec, 'אין כפתור לאימות מייל בבק אופיס');
  await page.screenshot({ path: process.env.SHOTS ? process.env.SHOTS + '/8-bo-security.png' : '/dev/null', clip: { x: 0, y: 0, width: 1366, height: 820 } }).catch(() => {});
  const r = await page.evaluate(() => ({ groups: document.querySelectorAll('#boNav .bogrp').length, sql: !!document.getElementById('setupSql') }));
  assert(r.groups >= 5, 'קבוצות בתפריט: ' + r.groups);
  assert(r.sql, 'קוד ה-SQL לא נטען לבק אופיס');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('שיתוף בבועה (וואטסאפ, ג׳ימייל, מייל, SMS, העתקה) + קישור שפותח את מה ששותף', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'x@y.z' }; }, DATA);
  const r = await page.evaluate(async () => {
    sharePriceReport('חלב 3%', 'רמי לוי', 'בני ברק', '5.90 ₪');
    const nets = [...document.querySelectorAll('#shpop18 [data-net]')].map((b) => b.dataset.net);
    let href = ''; const op = window.open; window.open = (u) => { href = u; return {}; };
    document.querySelector('#shpop18 [data-net="wa"]').click(); const prev = decodeURIComponent(href);
    await loadCl18(true); share18('wed|groom'); document.querySelector('#shpop18 [data-net="wa"]').click(); const wed = decodeURIComponent(href); window.open = op;
    return { nets, prev, wed, open: !!document.getElementById('shpop18') };
  });
  for (const n of ['wa', 'gm', 'em', 'sms', 'copy']) assert(r.nets.includes(n), 'חסר ' + n);
  for (const n of ['tg', 'fb', 'x']) assert(!r.nets.includes(n), 'לא אמור להיות ' + n);
  assert(!r.open, 'הבועה לא נסגרה אחרי השיתוף');
  assert(r.prev.includes('חלב 3%') && r.prev.includes('#p=') , 'תוכן השיתוף: ' + r.prev);
  assert(r.wed.includes('חליפת חתונה') && r.wed.includes('#cloth=wedding/groom'), 'שיתוף רשימת חתונה');
  await page.evaluate(() => { location.hash = '#cloth=men/suits'; }); await page.waitForTimeout(600);
  const t = await page.evaluate(() => ({ tab: storesView, g: cl18.g, sub: cl18.sub }));
  assert(t.tab === 'clothing' && t.g === 'men' && t.sub === 'suits', 'הקישור לא פתח: ' + JSON.stringify(t));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('בשיתוף אין "הקוד שלי"', async () => {
  const { ctx, page } = await newPage();
  const h = await page.evaluate(() => { const b = document.querySelector('#cloudBtn'); return !b || b.hidden; });
  assert(h, 'הכפתור עם הקוד מוצג');
  await ctx.close();
});

await test('נגישות (ת״י 5568 / WCAG AA): בלי הפרות במסכים הראשיים, ברגיל ובמצב כהה', async () => {
  const axePath = process.env.AXE_PATH || createRequire(import.meta.url).resolve('axe-core/axe.min.js');
  const axeSrc = fs.readFileSync(axePath, 'utf8'); const bad = [];
  for (const dark of [false, true]) {
    const { ctx, page } = await newPage();
    await page.addScriptTag({ content: axeSrc });
    await page.evaluate((dark) => { [['חלב', '2'], ['לחם', '']].forEach(([n, q]) => addItem(n, q)); errAdd('לעבור בדואר'); if (dark) { state.dark = true; document.body.classList.add('dark'); } }, dark);
    for (const [name, prep] of [['list', () => setTab('list')], ['home', () => setTab('home')], ['prices', () => setTab('prices')], ['stores', () => setTab('stores')], ['bot', () => { setTab('list'); openBot(); sendToBot('שלום'); }], ['errands', () => { document.querySelector('#botSheet').classList.remove('open'); openErrands(false); }]]) {
      await page.evaluate(prep); await page.waitForTimeout(500);
      const v = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map((x) => x.id + '×' + x.nodes.length + ' ' + (x.nodes[0] && x.nodes[0].target.join(' '))));
      if (v.length) bad.push((dark ? 'כהה/' : '') + name + ': ' + v.join(' | '));
    }
    await ctx.close();
  }
  assert(!bad.length, bad.join('\n'));
});

await test('קטגוריית שימורים + דיווחי מחיר: לפי קטגוריות, וכל המחירים הקודמים של מוצר', async () => {
  const { ctx, page, errors } = await newPage();
  const cats = await page.evaluate(() => ({ has: CATS.includes('שימורים'), after: CATS.indexOf('שימורים') === CATS.indexOf('רטבים וממרחים') + 1, e: CATE['שימורים'],
    tuna: resolveCat('טונה'), corn: resolveCat('תירס בקופסה'), olives: resolveCat('זיתים'), pickles: resolveCat('מלפפונים חמוצים'), paste: resolveCat('רסק עגבניות'),
    oil: resolveCat('שמן זית'), cornOil: resolveCat('שמן תירס'), frozenPeas: resolveCat('אפונה קפואה'), hummus: resolveCat('חומוס'), salmon: resolveCat('סלמון') }));
  assert(cats.has && cats.after && cats.e === '🥫', 'אין קטגוריית שימורים: ' + JSON.stringify(cats));
  for (const k of ['tuna', 'corn', 'olives', 'pickles', 'paste']) assert(cats[k] === 'שימורים', k + ' → ' + cats[k]);
  assert(cats.oil === 'רטבים וממרחים' && cats.cornOil === 'רטבים וממרחים' && cats.hummus === 'רטבים וממרחים' && cats.frozenPeas !== 'שימורים' && cats.salmon === 'דגים', 'סיווג שגוי: ' + JSON.stringify(cats));
  const day = 86400000, now = Date.now(), iso = (d) => new Date(now - d * day).toISOString();
  const row = (id, product, chain, price, d, x = {}) => Object.assign({ id, product, product_key: product, chain, branch: 'בני ברק', price, currency: 'ILS', confirms: 0, wrong: 0, created_at: iso(d), by_id: 'u' + id, by_name: 'מדווח ' + id, status: 'approved' }, x);
  const D = { prices: [row('t1', 'טונה', 'רמי לוי', 5.9, 0), row('t2', 'טונה', 'רמי לוי', 6.5, 3), row('t3', 'טונה', 'רמי לוי', 7.1, 20), row('t4', 'טונה', 'אושר עד', 6.2, 1), row('t5', 'טונה', 'רמי לוי', 6.9, 2, { status: 'pending', by_id: 'me' }),
    row('m1', 'חלב', 'רמי לוי', 6.1, 0), row('m2', 'חלב', 'אושר עד', 5.8, 4), row('x1', 'משהו מוזר', 'אושר עד', 3, 1)] };
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'x@y.z' }; setTab('prices'); }, D);
  await page.waitForTimeout(700);
  const lat = await page.evaluate(() => [...document.querySelectorAll('#latestReports details.lat23')].map((d) => [d.dataset.lcat, d.querySelectorAll('.price-row[data-pid]').length, d.querySelector('summary').textContent]));
  const latCats = lat.map((x) => x[0]);
  assert(latCats.includes('שימורים') && latCats.includes('מוצרי חלב') && latCats.includes('אחר'), 'דיווחים אחרונים לא מחולקים לקטגוריות: ' + JSON.stringify(lat));
  assert(latCats.indexOf('מוצרי חלב') < latCats.indexOf('שימורים') && latCats.indexOf('שימורים') < latCats.indexOf('אחר'), 'סדר קטגוריות: ' + latCats.join(','));
  const can = lat.find((x) => x[0] === 'שימורים'); assert(can[1] === 5 && /\(5\)/.test(can[2]), 'ספירה בשימורים: ' + JSON.stringify(can));
  // קיפול קטגוריה נשמר אחרי רינדור מחדש
  await page.evaluate(() => { document.querySelector('#latestReports details.lat23[data-lcat="מוצרי חלב"]').open = false; });
  await page.waitForTimeout(100);
  await page.evaluate(() => { document.querySelector('#latestReports').innerHTML = latestHtml(); });
  assert(await page.evaluate(() => !document.querySelector('#latestReports details.lat23[data-lcat="מוצרי חלב"]').open), 'הקיפול לא נשמר');
  // 📜 בדיווח → חיפוש המוצר ופתיחת כל ההיסטוריה שלו
  await page.click('#latestReports [data-hist23="טונה"]');
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('#priceResults details.catsec')].map((d) => d.querySelector('summary').textContent);
    const g = [...document.querySelectorAll('#priceResults .grp')].find((x) => /טונה/.test(x.querySelector('h3').textContent));
    const h = g && g.querySelector('details.phist23');
    return { q: document.querySelector('#priceSearchInput').value, sec, main: g ? g.querySelectorAll(':scope > .price-row').length : -1, open: !!(h && h.open), hist: h ? [...h.querySelectorAll('.phrow23')].map((x) => x.textContent) : [] };
  });
  assert(r.q === 'טונה', 'החיפוש לא עודכן: ' + r.q);
  assert(r.sec.some((t) => /שימורים/.test(t)), 'תוצאות החיפוש לא לפי קטגוריות: ' + r.sec.join(' | '));
  assert(r.main === 2, 'צריך מחיר עדכני אחד לכל חנות (2), יש ' + r.main);
  assert(r.open && r.hist.length === 5, 'היסטוריה: ' + JSON.stringify(r.hist));
  assert(/7\.10|7\.1/.test(r.hist[r.hist.length - 1]) && /5\.90|5\.9/.test(r.hist[0]), 'ההיסטוריה לא מהחדש לישן: ' + r.hist.join(' | '));
  assert(r.hist.some((t) => /ממתין לאישור/.test(t)) && r.hist.every((t) => !/חלב/.test(t)), 'סטטוס / סינון מוצר בהיסטוריה: ' + r.hist.join(' | '));
  await page.addScriptTag({ content: fs.readFileSync(process.env.AXE_PATH || createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8') });
  for (const dark of [false, true]) {
    const v = await page.evaluate(async (dark) => { document.body.classList.toggle('dark', dark); return (await axe.run('#panePrices', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map((x) => x.id + '×' + x.nodes.length + ' ' + (x.nodes[0] && x.nodes[0].target.join(' '))); }, dark);
    assert(!v.length, 'נגישות' + (dark ? ' (כהה)' : '') + ': ' + v.join(' | '));
  }
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('קרדיט למדווחים: שם המדווח מוסתר כברירת מחדל, מוצג עם ההגדרה הכללית / לפריט, והמנהל תמיד רואה ומחליף', async () => {
  const { ctx, page, errors } = await newPage();
  const SH = process.env.SHOTS || '';
  const iso = new Date(Date.now() - 3600000).toISOString();
  const pr = (id, product, chain, price, by) => ({ id, product, product_key: product, chain, branch: 'בני ברק', price, currency: 'ILS', confirms: 2, wrong: 0, created_at: iso, by_id: by, status: 'approved' });
  const D = {
    prices: [pr('c1', 'חלב 3%', 'רמי לוי', 6.2, 'u1'), pr('c2', 'לחם אחיד', 'אושר עד', 7.5, 'u2'), pr('c3', 'ביצים L', 'שופרסל', 13.9, 'u3')],
    // מה שהשרת מחזיר (כאן — גם שמות של פריטים מוסתרים, כדי לבדוק שגם הדפדפן לא מציג אותם)
    'rpc:credit_names': { c1: { n: 'משה כהן', e: 'moshe@example.com', u: 'u1' }, c2: { n: 'רחל לוי', s: true, e: 'rachel@example.com', u: 'u2' }, c3: { n: 'דוד', s: false, e: 'david@example.com', u: 'u3' } },
  };
  const names = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#latestReports .price-row[data-pid]')].map((r) => [r.dataset.pid, (r.querySelector('.cr23') || {}).textContent || ''])));
  await page.evaluate((D) => {
    sb = __stub(D); authUser = { id: 'me', email: 'x@y.z' }; myRole = null; applyAdminUi();
    window.__upd = []; const from = sb.from;
    sb.from = (n) => { const c = from(n); return new Proxy(c, { get(t, p) { if (p === 'update' || p === 'upsert') return (v) => { window.__upd.push([n, p, v]); return c; }; return t[p]; } }); };
    applyConfig('credits', { prices: false }); setTab('prices');
  }, D);
  await page.waitForTimeout(900);
  // 1. ברירת מחדל: משתמש רגיל לא רואה; פריט שהמנהל סימן "הצג" — כן
  let n = await names();
  assert(n.c1 === '' && n.c3 === '', 'שם מוצג למרות ברירת המחדל: ' + JSON.stringify(n));
  assert(/דווח ע״י רחל לוי/.test(n.c2), 'פריט עם "הצג שם" לא מציג: ' + JSON.stringify(n));
  assert(!/moshe@|david@/.test(await page.evaluate(() => document.body.innerText)), 'מייל של מדווח מוצג למשתמש רגיל');
  if (SH) await page.screenshot({ path: SH + '/3-price-regular-user-hidden.png' });
  // 2. ההגדרה הכללית "הצג תמיד": מוצג — חוץ מפריט שהמנהל הסתיר
  await page.evaluate(() => applyConfig('credits', { prices: true }));
  await page.waitForTimeout(150);
  n = await names();
  assert(/דווח ע״י משה כהן/.test(n.c1) && /רחל לוי/.test(n.c2) && n.c3 === '', 'הגדרה כללית: ' + JSON.stringify(n));
  // 3. המנהל: רואה את כל השמות + מייל, וכפתור לכל פריט שמחליף ברירת מחדל → הצג → הסתר
  // בעלים: רק סימון yam_owner ב-app_metadata (לא ב-user_metadata שהמשתמש יכול לשנות, לא בלי אימות מייל, ולא לפי מייל — גם לא המייל של העסק)
  const own = await page.evaluate(() => {
    const t = (u) => { authUser = u; return isOwner(); };
    const r = [t({ id: 'a', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }),
      t({ id: 'b', email: 'b@x.com', email_confirmed_at: 'x', user_metadata: { yam_owner: true } }),
      t({ id: 'c', email: 'c@x.com', email_confirmed_at: null, app_metadata: { yam_owner: true } }),
      t({ id: 'd', email: 'd@x.com', email_confirmed_at: 'x' }),
      t({ id: 'e', email: 'yamshopping2026@gmail.com', email_confirmed_at: 'x' })];
    authUser = null; return r;
  });
  assert(JSON.stringify(own) === '[true,false,false,false,false]', 'זיהוי בעלים לפי סימון בחשבון: ' + JSON.stringify(own));
  await page.evaluate(() => { applyConfig('credits', { prices: false }); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; applyAdminUi(); });
  await page.waitForTimeout(500);
  n = await names();
  const mail = await page.evaluate(() => (document.querySelector('#latestReports [data-crn="prices|c1"] .cr23n') || {}).title || '');
  assert(/משה כהן/.test(n.c1) && /moshe@example.com/.test(mail) && /דוד/.test(n.c3), 'המנהל לא רואה את השמות: ' + JSON.stringify(n) + ' ' + mail);
  const btn = () => page.evaluate(() => { const b = document.querySelector('#latestReports [data-cr23b="prices|c1"]'); return b ? b.textContent : null; });
  assert(/ברירת מחדל/.test(await btn() || ''), 'אין כפתור למנהל: ' + await btn());
  if (SH) await page.screenshot({ path: SH + '/2-price-admin-name-and-button.png' });
  await page.click('#latestReports [data-cr23b="prices|c1"]'); await page.waitForTimeout(200);
  assert(/הצג שם/.test(await btn() || ''), 'הכפתור לא התחלף ל"הצג שם": ' + await btn());
  await page.click('#latestReports [data-cr23b="prices|c1"]'); await page.waitForTimeout(200);
  assert(/הסתר שם/.test(await btn() || ''), 'הכפתור לא התחלף ל"הסתר שם": ' + await btn());
  await page.click('#latestReports [data-cr23b="prices|c1"]'); await page.waitForTimeout(200);
  const upd = await page.evaluate(() => window.__upd.filter((x) => x[0] === 'prices').map((x) => x[2].show_author));
  assert(JSON.stringify(upd) === '[true,false,null]', 'עדכוני show_author: ' + JSON.stringify(upd));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('קרדיט למדווחים: כרטיס המתגים בבק אופיס שומר את ההגדרה', async () => {
  const { ctx, page, errors } = await newPage({ viewport: { width: 1366, height: 820 } });
  await page.evaluate(() => {
    sb = __stub({ 'site_config:one': { value: { prices: false, reviews: true } } }); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } };
    window.__upd = []; const from = sb.from;
    sb.from = (n) => { const c = from(n); return new Proxy(c, { get(t, p) { if (p === 'upsert') return (v) => { window.__upd.push([n, v]); return c; }; return t[p]; } }); };
    openBO('credits');
  });
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => ({ n: document.querySelectorAll('#cr23card [data-crk]').length, rec: document.querySelector('#cr23_reviews').checked, pr: document.querySelector('#cr23_prices').checked, nav: !!document.querySelector('#boNav [data-s="credits"]') }));
  assert(r.n === 3 && r.rec && !r.pr && r.nav, 'כרטיס המתגים: ' + JSON.stringify(r));
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/1-backoffice-credits-switches.png' });
  await page.click('#cr23_prices'); await page.waitForTimeout(300);
  const u = await page.evaluate(() => window.__upd.find((x) => x[0] === 'site_config'));
  assert(u && u[1].key === 'credits' && u[1].value.prices === true && u[1].value.reviews === true && u[1].value.clothing === false, 'השמירה: ' + JSON.stringify(u));
  assert(await page.evaluate(() => credCfg23.prices === true), 'ההגדרה לא הוחלה באתר');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🔁 פריטים קבועים: "3 חלב מדי יומיים" מוסיף "חלב" ×3 (לא את המשפט) + כלל; המנוע מוסיף פעם אחת, לא מכפיל ומתזמן את הבא', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(async () => {
    state.recurring = []; curList().items = []; state.bot = [];
    const ask = async (m) => { meSay(m); const mine = state.bot[state.bot.length - 1]; await botReply(m); return state.bot.slice(state.bot.lastIndexOf(mine) + 1).map((x) => x.txt).join(' ‖ '); };
    const reply = await ask('תכניס לרשימה 3 חלב מדי יומיים');
    const items1 = curList().items.map((i) => i.n + '×' + i.q);
    const rule = state.recurring[0];
    const day = 864e5, nextOk = rule.every === 2 && rule.next > Date.now() && rule.next - Date.now() <= 2 * day + 3600e3;
    /* הגיע הזמן אבל הפריט עדיין ברשימה ולא סומן — לא מכפילים */
    rule.next = Date.now() - 1000; const a1 = rc24Run(); const n1 = curList().items.length; const next1 = rule.next;
    /* נקנה (סומן) — והאתר היה סגור 3 תקופות: מוסיפים פעם אחת בלבד */
    curList().items.forEach((i) => { i.done = true; }); rule.next = Date.now() - 6 * day;
    const a2 = rc24Run(); const a3 = rc24Run();
    const open = curList().items.filter((i) => !i.done).map((i) => i.n + '×' + i.q);
    /* סנכרון: נתונים פגומים מהענן מנוקים */
    applyRemote({ recurring: [null, 5, { id: 'x<y', n: '<b>', every: 'z' }, { id: 'ok1', n: 'לחם', q: '2', every: 9999 }, { id: 'ok2', n: 'ביצים', days: [1, 9, 'a'], ts: 1 }] }, false);
    const cleaned = state.recurring.map((x) => x.n + '/' + (x.every || '') + '/' + (x.days || []).join(''));
    /* שאלה כשלא בטוחה + כפתורים */
    const q = await ask('תוסיפי שמן כי נגמר לנו אתמול'); const chips = (state.bot[state.bot.length - 1].chips || []).map((c) => c.l).join('|');
    renderBot(); const chipBtns = document.querySelectorAll('#botMsgs [data-qr24]').length;
    const yes = await ask('כן');
    const stop = await ask('תפסיקי להוסיף חלב');
    openRc24(); const sheetRows = document.querySelectorAll('#rc24rows [data-rc]').length;
    return { reply, items1, nextOk, a1, n1, same: next1 > Date.now(), a2, a3, open, nextAfter: rule.next > Date.now(), cleaned, q, chips, chipBtns, yes, stop, left: state.recurring.filter((x) => !x.del).map((x) => x.n).join(','), sheetRows, list: curList().items.map((i) => i.n).join(',') };
  });
  assert(r.items1.join() === 'חלב×3', 'נוסף: ' + r.items1.join());
  assert(/הוספתי 3 חלב לרשימה, ואוסיף שוב אוטומטית כל יומיים \(הבא: /.test(r.reply), 'תשובה: ' + r.reply);
  assert(r.nextOk, 'הבא לא בעוד יומיים');
  assert(r.a1 === 0 && r.n1 === 1 && r.same, 'כפילות כשהפריט כבר ברשימה: ' + JSON.stringify(r));
  assert(r.a2 === 1 && r.a3 === 0 && r.open.join() === 'חלב×3' && r.nextAfter, 'המנוע: ' + JSON.stringify(r));
  assert(r.cleaned.includes('ביצים//1') && !r.cleaned.some((x) => x.includes('<')) && !r.cleaned.some((x) => x.startsWith('לחם')), 'ניקוי: ' + r.cleaned.join(' '));
  assert(/רצית שאוסיף "שמן"/.test(r.q) && /כן/.test(r.chips) && r.chipBtns === 2, 'שאלת הבהרה: ' + r.q + ' ' + r.chips + ' ' + r.chipBtns);
  assert(r.list.includes('שמן') && !r.list.includes('נגמר'), 'אחרי "כן": ' + r.list);
  assert(/הפסקתי להוסיף חלב/.test(r.stop) && !r.left.includes('חלב'), 'הפסקה: ' + r.stop + ' / ' + r.left);
  assert(r.sheetRows === 1, 'חלון הפריטים הקבועים: ' + r.sheetRows);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🔁 פריטים קבועים — גילוי: יאמי מציעה פעם אחת על מוצר שחוזר, "לא תודה" נזכר, כפתור בעריכת מוצר וכפתור "🔁 פריט קבוע"', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms)); const D = 864e5, now = Date.now();
    state.recurring = []; state.rcSug = {}; curList().items = []; state.bot = [];
    state.history = [{ ts: now - 8 * D, items: [{ n: 'חלב' }, { n: 'ביצים' }] }, { ts: now - 4 * D, items: [{ n: 'חלב' }, { n: 'ביצים' }] }];
    const sugs = () => state.bot.filter((m) => /^💡 שמתי לב/.test(m.txt)).length;
    const ask = async (m) => { meSay(m); const mine = state.bot[state.bot.length - 1]; await botReply(m); return state.bot.slice(state.bot.lastIndexOf(mine) + 1).map((x) => x.txt).join(' ‖ '); };
    /* יאמי סגורה: בועה קטנה, וההצעה מחכה עד שפותחים */
    addItem('חלב'); const nudge = !document.querySelector('#botNudge').hidden && document.querySelector('#botNudgeTxt').textContent;
    addItem('ביצים'); /* אותו יום — לא עוד הצעה */
    openBot(); await wait(500); const last = state.bot[state.bot.length - 1];
    const sug = last.txt, chips = (last.chips || []).map((c) => c.l).join('|'); const chipBtns = document.querySelectorAll('#botMsgs [data-qr24]').length; const n1 = sugs();
    const yes = await ask('כן, כל 4 ימים'); const rule = rc24Live().find((x) => x.n === 'חלב');
    /* יום אחר: ביצים, יאמי פתוחה → "לא תודה" נזכר */
    state.rcSug.day = ''; curList().items = curList().items.filter((i) => i.n !== 'ביצים'); state.rcSug.asked = {};
    addItem('ביצים'); await wait(600); const n2 = sugs(); const no = await ask('לא תודה');
    state.rcSug.day = ''; curList().items = curList().items.filter((i) => i.n !== 'ביצים' && i.n !== 'חלב'); state.rcSug.asked = {};
    addItem('ביצים'); addItem('חלב'); await wait(600); const n3 = sugs();
    /* עריכת מוצר: 🔁 להוסיף אוטומטית → כל שבוע */
    addItem('לחם'); const it = curList().items.find((i) => i.n === 'לחם'); openItemEdit(it.id);
    const tg0 = document.querySelector('#rc25tg').textContent; document.querySelector('#rc25tg').click();
    const expanded = document.querySelector('#rc25tg').getAttribute('aria-expanded'); document.querySelector('[data-rc25ev="7"]').click();
    const bread = rc24Live().find((x) => x.n === 'לחם'); const tg1 = document.querySelector('#rc25tg').textContent; const stopBtn = !!document.querySelector('[data-rc25stop]');
    openItemEdit(it.id); const tg2 = document.querySelector('#rc25tg').textContent; closeSheet();
    /* הכפתור הקבוע של יאמי */
    renderBotChips(); const chip = [...document.querySelectorAll('#botChips button')].find((b) => b.textContent === '🔁 פריט קבוע');
    const chipReply = await ask('🔁 פריט קבוע'); const q = await ask('טונה'); const a = await ask('כל שבוע');
    return { nudge, sug, chips, chipBtns, n1, yes, every: rule && rule.every, n2, no, noted: !!state.rcSug.no['ביצים'], n3, tg0, expanded, bread: bread && bread.every + '/' + bread.q, tg1, stopBtn, tg2, chip: !!chip, chipReply, q, tuna: (rc24Live().find((x) => x.n === 'טונה') || {}).every };
  });
  assert(/שמתי לב שאת קונה חלב בערך כל 4 ימים/.test(r.nudge || ''), 'בועה: ' + r.nudge);
  assert(/^💡 שמתי לב שאת קונה חלב בערך כל 4 ימים\. רוצה שאוסיף אותו לבד\?$/.test(r.sug) && r.chips === '✅ כן, כל 4 ימים|לא תודה' && r.chipBtns === 2, 'הצעה: ' + r.sug + ' / ' + r.chips + ' / ' + r.chipBtns);
  assert(r.n1 === 1 && r.every === 4 && /אוסיף אוטומטית כל 4 ימים/.test(r.yes), 'אישור: ' + JSON.stringify(r));
  assert(r.n2 === 2 && /לא אציע שוב על ביצים/.test(r.no) && r.noted, 'סירוב: ' + JSON.stringify(r));
  assert(r.n3 === 2, 'הציעה שוב אחרי סירוב / על מוצר קבוע: ' + r.n3);
  assert(r.tg0 === '🔁 להוסיף אוטומטית' && r.expanded === 'true' && r.bread === '7/' && r.tg1 === '🔁 כל שבוע' && r.stopBtn && r.tg2 === '🔁 כל שבוע', 'עריכת מוצר: ' + JSON.stringify(r));
  assert(r.chip && /מה להוסיף ובאיזו תדירות/.test(r.chipReply) && /כל כמה זמן להוסיף טונה/.test(r.q) && r.tuna === 7, 'כפתור יאמי: ' + JSON.stringify(r));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('⌨️ הקלדה חכמה: אות אחת פותחת הצעות (מה שמתחיל בה קודם), בחירה מוסיפה לרשימה / ממלאת חיפוש, מקלדת עובדת', async () => {
  const { ctx, page, errors } = await newPage();
  await page.click('#inText'); await page.keyboard.type('ח');
  await page.waitForSelector('#smartAc:not([hidden]) li');
  const first = await page.$$eval('#smartAc li', (l) => l.map((x) => x.lastChild.textContent));
  assert(first.length > 1 && first.length <= 8, 'מספר הצעות: ' + first.length);
  assert(first.includes('חלב'), 'אין "חלב": ' + first.join(','));
  const starts = first.map((n) => n.startsWith('ח')); const firstNot = starts.indexOf(false);
  assert(firstNot === -1 || starts.slice(firstNot).every((x) => !x), 'מה שמתחיל ב-ח לא ראשון: ' + first.join(','));
  assert(await page.$eval('#inText', (e) => e.getAttribute('aria-expanded')) === 'true', 'aria-expanded');
  await page.keyboard.type('לב');
  const before = await page.evaluate(() => state.lists.find((l) => l.id === state.active).items.filter((i) => i.n === 'חלב סויה').length);
  await page.locator('#smartAc li', { hasText: 'חלב סויה' }).click();
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ n: state.lists.find((l) => l.id === state.active).items.filter((i) => i.n === 'חלב סויה').length, v: document.querySelector('#inText').value, open: !document.querySelector('#smartAc').hidden }));
  assert(r.n === before + 1, 'חלב סויה לא נוסף לרשימה');
  assert(r.v === '' && !r.open, 'השדה לא התנקה / ההצעות לא נסגרו');
  // חיפוש במאגר ➕ — חיצים ו-Enter בוחרים, והרשימה מסתננת
  await page.evaluate(() => document.querySelector('#btnPlus').click()); await page.click('#inCatSearch'); await page.keyboard.type('עגב'); // בעיצוב 2.0: "כל המוצרים לפי קטגוריות" נפתח מ"הבית שלי" ← קטגוריות
  await page.waitForSelector('#smartAc:not([hidden]) li');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  const c = await page.evaluate(() => ({ v: document.querySelector('#inCatSearch').value, list: document.querySelector('#catList').textContent }));
  assert(c.v.startsWith('עגבני'), 'נבחר: ' + c.v);
  assert(c.list.includes('עגבניות') && !c.list.includes('חלב סויה'), 'רשימת המוצרים לא הסתננה');
  // אות באמצע מילה: "שרי" מוצא "עגבניות שרי" (מילה שנייה)
  await page.fill('#inCatSearch', ''); await page.keyboard.type('שרי');
  await page.waitForSelector('#smartAc:not([hidden]) li');
  assert((await page.$$eval('#smartAc li', (l) => l.map((x) => x.textContent))).some((x) => x.includes('עגבניות שרי')), 'אין "עגבניות שרי"');
  await page.keyboard.press('Escape');
  assert(await page.$eval('#smartAc', (e) => e.hidden), 'Esc לא סוגר');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🟢 מונה המחוברים: משתמש רגיל לא רואה כברירת מחדל, גם אם השרת מחזיר מספרים; מנהל רואה; "להציג למשתמשים" מציג', async () => {
  const { ctx, page, errors } = await newPage();
  const D = { 'rpc:site_stats': { users: 57, online: 4 } };
  const vis = () => page.evaluate(() => !document.querySelector('#stats16').hidden);
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'x@y.z' }; uiCfg = {}; }, D);
  await page.evaluate(() => statsRefresh()); await page.waitForTimeout(200);
  assert(!(await vis()), 'משתמש רגיל רואה את המונה');
  await page.evaluate(() => { uiCfg = { statsHidden: false }; applyUi(); }); await page.waitForTimeout(200);
  assert(!(await vis()), 'ההגדרה הישנה statsHidden:false חושפת את המונה');
  await page.evaluate(() => { uiCfg = { statsShown: true }; applyUi(); }); await page.waitForTimeout(200);
  assert(await vis(), 'המנהל בחר להציג — ועדיין מוסתר');
  await page.evaluate(() => { uiCfg = {}; authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; statsRefresh(); }); await page.waitForTimeout(200);
  assert(await vis(), 'המנהל לא רואה את המונה');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('✍️ כתיב נכון במאגר: חרדל (לא חרדה), פירות יער, תפוצ׳יפס, סילקא לראש השנה; "חרדה" שנשמר מזוהה כחרדל', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(() => ({ keys: Object.keys(P), alias: NORMP[norm('חרדה')] || ALIAS['חרדה'], ready: READY165.map((x) => x.items).join('\n') }));
  for (const bad of ['חרדה', 'פיצוחי יער', 'חטיף תפוצי תירס']) assert(!r.keys.includes(bad), 'עדיין במאגר: ' + bad);
  for (const good of ['חרדל', 'פירות יער', 'תפוצ׳יפס', 'טחינה הר ברכה']) assert(r.keys.includes(good), 'חסר במאגר: ' + good);
  assert(r.alias === 'חרדל', '"חרדה" לא מזוהה כחרדל: ' + r.alias);
  const cats = await page.evaluate(() => ['מלפפונים', 'לימונים', 'חטיפים', 'תבלינים', 'תה', 'תה ויסוצקי'].map((n) => resolveCat(n)));
  assert(cats.join(',') === 'ירקות,פירות,מאפים וחטיפים,רטבים וממרחים,שתייה,שתייה', 'קטגוריות (אות סופית): ' + cats.join(','));
  assert(/^סילקא$/m.test(r.ready) && !/^(סילק|סלק)$/m.test(r.ready), 'בראש השנה צריך להיות סילקא');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🧾 קבלה: חלון אחר שנפתח בזמן הקריאה לא מפיל את האתר (Cannot set properties of null)', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate(() => {
    sb = __stub({}); authUser = { id: 'me', email: 'x@y.z' };
    sb.functions.invoke = () => new Promise((res) => { window._rel = () => res({ data: { receipt: { store: 'רמי לוי', items: [{ name: 'חלב', qty: 1, price: 6 }] } }, error: null }); });
    openUpload('receipt'); upImgs.push('data:image/png;base64,iVBORw0KGgo='); document.querySelector('#upRead').click();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => { openSheet('אחר', '<p>חלון אחר</p>'); window._rel(); });
  await page.waitForTimeout(400);
  assert(!errors.length, errors.join(' | '));
  // ובלי החלפת חלון — הקבלה מוצגת לאישור כרגיל
  await page.evaluate(() => { openUpload('receipt'); upImgs.push('data:image/png;base64,iVBORw0KGgo='); document.querySelector('#upRead').click(); });
  await page.waitForTimeout(200); await page.evaluate(() => window._rel()); await page.waitForTimeout(400);
  assert(await page.evaluate(() => !!document.querySelector('#upOut #upConfirm')), 'הקבלה לא הוצגה לאישור');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🆕 v26: כמה חסכתי, הסל השבועי, התראת מחיר, מחשבון כמויות, רשימות לאירועים, מצב קנייה, מדווחי החודש, הזמנת חברים', async () => {
  const { ctx, page, errors } = await newPage();
  const now = new Date().toISOString();
  const P = (product, chain, price) => ({ product, product_key: product, chain, price, currency: 'ILS', status: 'approved', created_at: now, updated_at: now });
  const D = { prices: [P('חלב', 'רמי לוי', 6), P('חלב', 'שופרסל', 7.5), P('לחם', 'רמי לוי', 8), P('לחם', 'שופרסל', 9)],
    'rpc:reporters_month': [{ rank: 1, name: '', reports: 12, confirms: 3, is_me: false }, { rank: 2, name: 'בודק', reports: 5, confirms: 1, is_me: true }],
    'rpc:my_ref_code': 'abcd1234', 'rpc:my_referrals': 3 };
  await page.evaluate((D) => { window.P26 = (product, chain, price) => ({ product, product_key: product, chain, price, currency: 'ILS', status: 'approved', created_at: new Date().toISOString() }); sb = __stub(D); authUser = { id: 'me', email: 'x@y.z' }; state.history = []; state.savings = []; state.basketSnaps = []; ['חלב', 'לחם'].forEach((n) => addItem(n, '')); render(); }, D);
  // 6. מצב קנייה — לפי מחלקות, סימון בלחיצה
  await page.click('[data-shop26]');
  assert(await page.evaluate(() => !document.querySelector('#shop26').hidden), 'מצב קנייה לא נפתח');
  const order = await page.$$eval('#shop26 h3', (h) => h.map((x) => x.textContent));
  assert(order.findIndex((x) => x.includes('לחמים')) < order.findIndex((x) => x.includes('מוצרי חלב')), 'סדר המחלקות: ' + order.join('|'));
  await page.click('#shop26 [data-s26]');
  assert(await page.evaluate(() => curList().items.some((i) => i.done)), 'לחיצה לא סימנה');
  await page.click('[data-s26x]');
  // 1. כמה חסכתי — השוואה ואז סיום קנייה בחנות הזולה
  await page.evaluate(async () => { await basketCompare(); state.history.unshift({ ts: Date.now() + 1000, listName: 'סופר', store: 'רמי לוי', items: [{ n: 'חלב' }] }); openSavings26(); });
  const sv = await page.$eval('#v8SheetBody .v26big', (e) => e.textContent);
  assert(/1\.5/.test(sv), 'חיסכון: ' + sv); // לחם סומן במצב קנייה — נשאר חלב: 7.5 − 6
  // 2. הסל השבועי — הודעה בפעמון
  await page.evaluate(async () => { state.recurring = [{ n: 'חלב', every: 2 }, { n: 'לחם', every: 7 }]; state.weekBasket = null; await weeklyCheck26(true); });
  const wk = await page.evaluate(() => ({ wb: state.weekBasket, bell: inbox.some((x) => /^wk-/.test(x.id)) }));
  assert(wk.wb && wk.wb.chain === 'רמי לוי' && wk.wb.save === 2.5 && wk.bell, 'סל שבועי: ' + JSON.stringify(wk));
  // 3. התראת מחיר
  await page.evaluate(async (D) => { sb = __stub(Object.assign({}, D, { prices: [P26('טיטולים', 'רמי לוי', 39.9), P26('טיטולים', 'שופרסל', 49)] })); alertAdd26('טיטולים', 45); await alertsCheck26(true); }, D);
  assert(await page.evaluate(() => inbox.some((x) => /^pa-/.test(x.id) && x.title.includes('טיטולים'))), 'לא הגיעה התראת מחיר');
  await page.evaluate(() => openAlerts26());
  assert(await page.$eval('#v8SheetBody', (e) => e.textContent.includes('טיטולים')), 'ההתראה לא ברשימת ההתראות');
  // 4. מחשבון כמויות — 12 סועדים בליל שבת → 3 חלות
  await page.evaluate(() => openCalc26('fri', 12));
  const rows = await page.$$eval('#v8SheetBody tbody tr', (r) => r.map((x) => x.textContent));
  assert(rows.some((x) => x.includes('חלות') && x.includes('3')), 'חלות ל-12: ' + rows.join('|'));
  await page.click('#c26add');
  assert(await page.evaluate(() => curList().items.some((i) => i.n === 'חלות' && /^3/.test(i.q))), 'החלות לא נוספו לרשימה');
  // 5. רשימות מוכנות לאירועים
  assert(await page.evaluate(() => ['ברית', 'בר מצווה', 'שבע ברכות', 'קידוש בבית הכנסת'].every((n) => READY165.some((r) => r.n === n))), 'חסרות רשימות לאירועים');
  // 9. המדווחים של החודש
  await page.evaluate(() => openTop26()); await page.waitForTimeout(200);
  const top = await page.$eval('#v8SheetBody', (e) => e.textContent);
  assert(top.includes('מדווח/ת') && top.includes('בודק') && /במקום\s*2/.test(top), 'טבלת מדווחים: ' + top.slice(0, 200));
  // 10. הזמנת חברים
  await page.evaluate(() => openInvite26()); await page.waitForTimeout(200);
  const inv = await page.evaluate(() => ({ link: document.querySelector('#v8SheetBody input').value, txt: document.querySelector('#v8SheetBody').textContent }));
  assert(inv.link.endsWith('/?ref=abcd1234') && inv.txt.includes('שגריר'), 'הזמנה: ' + JSON.stringify(inv).slice(0, 200));
  // יאמי
  await page.evaluate(() => { closeSheet(); sendToBot('שבת עם 20 אורחים'); }); await page.waitForTimeout(600);
  assert(await page.evaluate(() => document.querySelector('#v8Sheet').classList.contains('open') && document.querySelector('#c26n').value === '20'), 'יאמי לא פתחה את המחשבון');
  for (const [msg, type] of [['שבע ברכות ל-40 אורחים', 'sheva'], ['ברית ל-60 מוזמנים', 'brit'], ['בר מצווה 120 איש', 'bar'], ['קידוש ל-80 אנשים', 'kiddush']]) {
    await page.evaluate((m) => { closeSheet(); sendToBot(m); }, msg); await page.waitForTimeout(500);
    const got = await page.evaluate(() => document.querySelector('#c26t') && document.querySelector('#c26t').value);
    assert(got === type, msg + ' → ' + got);
  }
  // 7. התפריט
  assert(await page.evaluate(() => ['miSave26', 'miWeek26', 'miAlert26', 'miShop26', 'miCalc26', 'miTop26', 'miInv26'].every((id) => document.getElementById(id))), 'חסרים כפתורים בתפריט');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('👀 ניסיון בלי הרשמה + 📲 קיצור דרך למצב קנייה + 💌 קישור הזמנה נשמר', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' });
  await ctx.route(/supabase\.(co|js)|fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('yam_tour165', '1'); window.__fakeSb = true; });
  await ctx.addInitScript(STUB);
  // בלי חיבור לענן האתר נכנס למצב "בלי חשבון" — כאן מדמים שיש שרת, כדי לראות את מסך הכניסה עם "לנסות בלי הרשמה"
  await ctx.addInitScript(() => { Object.defineProperty(window, 'supabase', { configurable: true, get() { return { createClient: () => window.__stub({}) }; } }); });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '?ref=abcd1234&a=shop'); await page.waitForTimeout(1500);
  assert(await page.evaluate(() => localStorage.getItem('yam_ref') === 'abcd1234' && !location.search.includes('ref=')), 'קוד ההזמנה לא נשמר');
  assert(await page.isVisible('#btnGuest'), 'אין כפתור "לנסות בלי הרשמה"');
  await page.click('#btnGuest'); await page.waitForTimeout(900);
  const g = await page.evaluate(() => ({ login: document.querySelector('#login').classList.contains('open'), bar: !!document.querySelector('#guest26'), guest: !!(state.user && state.user.guest), shop: !!document.querySelector('#shop26') && !document.querySelector('#shop26').hidden }));
  assert(!g.login && g.bar && g.guest, 'מצב ניסיון: ' + JSON.stringify(g));
  assert(g.shop, 'קיצור הדרך ?a=shop לא פתח את מצב הקנייה');
  await page.click('[data-s26x]'); await page.click('#guest26 button');
  assert(await page.evaluate(() => document.querySelector('#login').classList.contains('open')), '"הרשמה חינם" לא פותח את הכניסה');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('💌 הזמנות: המנהל רואה בבק אופיס מי נרשם ודרך מי; המשתמש רואה באזור האישי כמה נרשמו דרכו', async () => {
  const { ctx, page, errors } = await newPage();
  const D = { 'rpc:my_referrals': 4, 'rpc:my_badges': [{ e: '🎖️', l: 'שגריר' }], 'rpc:my_share_people': [{ name: 'יעקב', at: '2026-10-14T09:00:00Z', new: true, channel: 'wa', place: 'group: משפחה' }, { name: 'שרה', at: '2026-10-13T09:00:00Z', new: false, channel: '', place: '' }], 'rpc:admin_referrals': [
    { created_at: '2026-10-14T09:00:00Z', referred_name: 'יעקב', referred_email: 'y@x.com', referrer_id: 'u1', referrer_name: 'משה', referrer_email: 'm@x.com' },
    { created_at: '2026-10-13T09:00:00Z', referred_name: 'שרה', referred_email: 's@x.com', referrer_id: 'u1', referrer_name: 'משה', referrer_email: 'm@x.com' },
    { created_at: '2026-10-12T09:00:00Z', referred_name: 'דוד', referred_email: 'd@x.com', referrer_id: 'u2', referrer_name: 'רחל', referrer_email: 'r@x.com' }] };
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'x@y.z' }; openMe('info'); }, D);
  await page.waitForTimeout(300);
  const me = await page.evaluate(() => ({ n: document.querySelector('#me26n') && document.querySelector('#me26n').textContent, badge: document.querySelector('#me26b').textContent }));
  assert(me.n === '4' && me.badge.includes('שגריר'), 'אזור אישי: ' + JSON.stringify(me));
  // האימוג'י 🆕 מוצג כאייקון (svg data-n="badge-plus")
  const ppl = await page.evaluate(() => { const e = document.querySelector('#me44ppl'); return e ? e.textContent + (e.querySelector('svg[data-n="badge-plus"]') ? '🆕' : '') : ''; });
  assert(ppl.includes('יעקב') && ppl.includes('שרה') && ppl.includes('🆕') && ppl.includes('וואטסאפ · קבוצה') && !ppl.includes('@'), 'אזור אישי: לא רואים מי הצטרף דרכי: ' + ppl);
  await page.evaluate((D) => { document.querySelector('#meOverlay').classList.remove('open'); sb = __stub(D); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('referrals'); }, D);
  await page.waitForTimeout(400);
  const bo = await page.$eval('#boMain', (e) => e.textContent);
  assert(bo.includes('יעקב') && bo.includes('משה') && bo.includes('דוד') && bo.includes('רחל') && /3\s*נרשמו דרך הזמנה/.test(bo), 'בק אופיס: ' + bo.slice(0, 300));
  assert(await page.evaluate(() => { const b = document.querySelector('#boNav [data-s="referrals"]'); return !!b && !b.hidden; }), 'אין כפתור בבק אופיס');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('👀 אורח: בלי יאמי, נספר אנונימית, ובבק אופיס רואים כמה ניסו ומי נרשם; ⚠️ אלרגיות; 📖 ספריא בבק אופיס', async () => {
  const { ctx, page, errors } = await newPage();
  const calls = await page.evaluate(() => { window.__rpc = []; sb = __stub({ 'rpc:admin_guest_stats': { total: 40, d7: 12, d30: 30, returned: 9, converted: 8, list: [{ first_at: '2026-10-10T08:00:00Z', converted_at: '2026-10-12T09:00:00Z', visits: 3, name: 'חיים', email: 'c@x.com' }] } });
    const r = sb.rpc; sb.rpc = (n, a) => { window.__rpc.push(n); return r(n, a); }; authUser = null; state.user = { name: 'אורח', email: '', offline: true, guest: true };
    localStorage.removeItem('yam_guest_ping'); afterEnter(); openBot(); return 1; });
  await page.waitForTimeout(300);
  const g = await page.evaluate(() => ({ yami: document.querySelector('#botSheet').classList.contains('open'), msg: document.querySelector('#v8SheetBody').textContent, rpc: window.__rpc.slice() }));
  assert(!g.yami && g.msg.includes('לרשומים בלבד'), 'אורח פתח את יאמי: ' + JSON.stringify(g).slice(0, 200));
  assert(g.rpc.includes('guest_ping'), 'האורח לא נספר: ' + g.rpc);
  await page.evaluate(() => { closeSheet(); document.querySelector('#botFab').click(); });
  assert(await page.evaluate(() => !document.querySelector('#botSheet').classList.contains('open')), 'כפתור יאמי נפתח לאורח');
  // נרשם → מסמנים המרה
  await page.evaluate(() => { closeSheet(); state.user.guest = true; authUser = { id: 'u9', email: 'new@x.com' }; localStorage.removeItem('yam_guest_conv'); guestConvert27(); });
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => window.__rpc.includes('guest_converted')), 'ההרשמה לא קושרה לניסיון');
  // אלרגיות: אזהרה בכרטיס של מוצר
  await page.evaluate(() => { meData().allergies = ['בוטנים']; });
  const card = await page.evaluate(() => offCard({ name: 'במבה', brand: 'אסם', qty: '', img: '', allergens: ['בוטנים'], code: '7290000066318' }));
  assert(card.includes('⛔') && card.includes('בוטנים'), 'אין אזהרת אלרגיה');
  await page.evaluate(() => openAllergies27());
  assert(await page.evaluate(() => document.querySelector('[data-a27="בוטנים"]').checked), 'האלרגיה לא נשמרה');
  // בבק אופיס
  await page.evaluate(() => { closeSheet(); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; state.user = { id: 'me', name: 'מנהל', email: 'owner@x.com' }; openBO('guests'); });
  await page.waitForTimeout(400);
  const bo = await page.$eval('#boMain', (e) => e.textContent);
  assert(bo.includes('40') && bo.includes('חיים') && bo.includes('20%'), 'בק אופיס אורחים: ' + bo.slice(0, 200));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('👋 היכרות חובה: נפשות+עיר חובה, חנויות וקצב עם "אחר כך"; אחוז מילוי; כמויות לבד; לפי חנות; יום לפני הקנייה', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate(() => { sb = __stub({}); authUser = { id: 'me', email: 'x@y.z' }; state.me = {}; state.history = []; state.recurring = []; curList().items = []; render(); askCity(); });
  await page.waitForTimeout(200);
  assert(await page.isVisible('#onb28'), 'ההיכרות לא נפתחה');
  await page.click('#onb28next');
  assert(await page.isVisible('#onb28err'), 'אפשר היה לדלג על שלב החובה');
  await page.keyboard.press('Escape');
  assert(await page.isVisible('#onb28'), 'Esc סגר את שלב החובה');
  for (let i = 0; i < 2; i++) await page.click('[data-inc="adults"]');
  for (let i = 0; i < 3; i++) await page.click('[data-inc="kids"]');
  await page.fill('#onb28city', 'בני ברק'); await page.click('#onb28next');
  await page.selectOption('#onb28w_super', 'מכולת שכונתית'); await page.selectOption('#onb28w_veg', 'ירקן שכונתי');
  await page.selectOption('#onb28w_meat', 'אטליז שכונתי'); await page.selectOption('#onb28w_bread', 'מאפייה שכונתית');
  await page.click('#onb28next');
  const tomorrow = await page.evaluate(() => (new Date().getDay() + 1) % 7);
  await page.click('[data-day="' + tomorrow + '"]'); await page.click('[data-every="week"]'); await page.click('[data-mode="store"]'); await page.click('#onb28 [data-alg=""]');
  await page.click('#onb28next');
  const r = await page.evaluate(() => ({ open: !!document.querySelector('#onb28'), pct: profilePct28(), ppl: people28(prof28()), city: meData().city }));
  assert(!r.open && r.pct === 100 && r.ppl === 5 && r.city === 'בני ברק', 'סיום: ' + JSON.stringify(r) + JSON.stringify(await page.evaluate(() => profileChecks28().filter((x) => !x[1]).map((x) => x[0]))) + JSON.stringify(await page.evaluate(() => [prof28(), meData().allergies])));
  // כמויות לבד: 5 נפשות → חלב 4
  await page.evaluate(() => addItem('חלב', ''));
  assert(await page.evaluate(() => curList().items.find((i) => i.n === 'חלב').q === '4'), 'כמות החלב לא לפי הבית');
  // לפי חנות
  await page.evaluate(() => { addItem('עגבניות', ''); render(); }); await page.click('[data-bystore28]');
  const groups = await page.$$eval('#paneList .grp h3', (h) => h.map((x) => x.textContent));
  assert(groups.some((g) => g.includes('ירקן שכונתי')) && groups.some((g) => g.includes('מכולת שכונתית')), 'לפי חנות: ' + groups.join('|'));
  // יום לפני הקנייה
  await page.evaluate(() => { prof28().staples = ['לחם', 'ביצים']; dayBefore28(); openBot(); }); await page.waitForTimeout(600);
  const db = await page.evaluate(() => ({ bell: inbox.some((x) => /^db-/.test(x.id)), bot: state.bot.slice(-1)[0].txt }));
  assert(db.bell && db.bot.includes('מחר יום הקנייה') && db.bot.includes('לחם'), 'יום לפני: ' + JSON.stringify(db).slice(0, 200));
  await page.evaluate(() => sendToBot('להוסיף הכל')); await page.waitForTimeout(500);
  assert(await page.evaluate(() => curList().items.some((i) => i.n === 'לחם' && /^\d/.test(i.q))), '"להוסיף הכל" לא הוסיף עם כמות');
  // אזור אישי + מחשבון
  await page.evaluate(() => openMe('info')); await page.waitForTimeout(200);
  assert(await page.$eval('#me28', (e) => e.textContent.includes('100%')), 'אין אחוז מילוי באזור האישי');
  await page.evaluate(() => { document.querySelector('#meOverlay').classList.remove('open'); openCalc26('fri'); });
  assert(await page.$eval('#c26n', (e) => e.value) === '5', 'המחשבון לא התחיל ממספר הנפשות');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('📢 פרסום עדכון: הודעה קצרה / מה חדש מהבק אופיס; "מה חדש" בלי חובת גלילה; "שתפו אותי" עם הקישור האישי', async () => {
  const { ctx, page, errors } = await newPage();
  // שתפו אותי → קישור אישי לכל שיתוף: וואטסאפ שואל לאן (קבוצה / סטטוס / אדם אחד) ונרשם בשרת
  await page.evaluate(() => { sb = __stub({}); authUser = { id: 'me', email: 'x@y.z' }; window.__rpc = []; const r = sb.rpc; sb.rpc = (n, a) => { window.__rpc.push([n, a]); return r(n, a); }; });
  await page.click('#btnShareSite'); await page.waitForTimeout(300);
  await page.click('#shpop18 [data-net="wa"]');
  const places = await page.evaluate(() => [...document.querySelectorAll('#shpop18 [data-place]')].map((b) => b.dataset.place));
  assert(['group', 'status', 'private'].every((p) => places.includes(p)), 'וואטסאפ לא שואל לאן: ' + places);
  await page.fill('#shPlace44', 'משפחה');
  const sh = await page.evaluate(() => { let href = ''; const op = window.open; window.open = (u) => { href = u; return {}; };
    document.querySelector('#shpop18 [data-place="group"]').click(); window.open = op; return { href: decodeURIComponent(href), rpc: window.__rpc.find((x) => x[0] === 'share_link_create') }; });
  const tok = (sh.href.match(/\?s=([0-9a-z]{10})/) || [])[1];
  assert(tok && sh.rpc && sh.rpc[1].p_token === tok && sh.rpc[1].p_channel === 'wa' && sh.rpc[1].p_place === 'group: משפחה', '"שתפו אותי" לא יוצר קישור אישי: ' + JSON.stringify(sh));
  // קישור אחר בכל שיתוף, והעתקה שואלת איפה מדביקים
  await page.click('#btnShareSite'); await page.waitForTimeout(300); await page.click('#shpop18 [data-net="copy"]');
  assert(await page.evaluate(() => !!document.querySelector('#shpop18 [data-place="other"]')), 'העתקה לא שואלת איפה');
  await page.evaluate(() => { if (typeof closeShare18 === 'function') closeShare18(); });
  // בבק אופיס: מי שיתף, איפה, כמה נכנסו ומי הצטרף
  await page.evaluate(() => { sb = __stub({ 'rpc:admin_share_links': [{ token: 'abcdefghij', at: new Date().toISOString(), channel: 'wa', place: 'status', sharer: 'u1', name: 'משה', email: 'm@x.com', visits: 7, joins: [{ name: 'דוד', email: 'd@x.com', new: true, at: new Date().toISOString() }] },
    { token: 'abcdefghik', at: new Date().toISOString(), channel: 'copy', place: 'group: <b>x</b>', sharer: null, device: '1234', visits: 0, joins: [] }] }); });
  await page.evaluate(() => { authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('shares'); });
  await page.waitForTimeout(500);
  const bo = await page.evaluate(() => document.querySelector('#boMain').innerHTML);
  assert(bo.includes('וואטסאפ · סטטוס') && bo.includes('משה') && bo.includes('דוד') && bo.includes('🆕') && !bo.includes('<b>x</b>'), 'הבק אופיס לא מציג את קישורי השיתוף: ' + bo.slice(0, 300));
  // מה חדש: כפתור "הבנתי" פעיל מיד, ונקודות
  await page.evaluate(() => showUpdates([{ id: 'u1', title: 'מה חדש 🎉', body: 'שורה א\nשורה ב', created_at: new Date().toISOString() }]));
  const u = await page.evaluate(() => ({ dis: document.querySelector('#updOk').disabled, li: document.querySelectorAll('#updBody li').length, hint: document.querySelector('#updHint').hidden }));
  assert(!u.dis && u.li === 2 && u.hint, '"מה חדש" עדיין חופר: ' + JSON.stringify(u));
  await page.click('#updOk');
  // בבק אופיס
  await page.evaluate(() => { authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; window.uiConfirm = async () => true; window.__ins = []; const f = sb.from; sb.from = (n) => { const q = f(n); const ins = q.insert; return new Proxy(q, { get(t, p) { if (p === 'insert') return (row) => { window.__ins.push([n, row]); return f(n); }; return t[p]; } }); }; window.confirm = () => true; openBO('announce'); });
  await page.waitForTimeout(300);
  await page.click('#n29draft'); await page.click('#n29go'); await page.waitForTimeout(300);
  let ins = await page.evaluate(() => window.__ins);
  assert(ins.some(([n, r]) => n === 'site_updates' && r.title === 'חדש באתר רשימת קניות' && r.body.split('\n').length === 13 && r.body.includes('תג שגריר')) && ins.some(([n]) => n === 'yami_notes'), 'מה חדש לא פורסם: ' + JSON.stringify(ins).slice(0, 200));
  await page.evaluate(() => { window.__ins = []; openBO('announce'); }); await page.waitForTimeout(300);
  await page.click('[data-m29="short"]'); await page.fill('#s29', '🎉 חדש: מצב קנייה'); await page.click('#s29go'); await page.waitForTimeout(300);
  ins = await page.evaluate(() => window.__ins);
  assert(ins.length === 1 && ins[0][0] === 'yami_notes' && ins[0][1].body === '🎉 חדש: מצב קנייה', 'הודעה קצרה: ' + JSON.stringify(ins));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🐞 אחרי יציאה / משתמש אחר במכשיר: התראות מחיר, חיסכון וסל שבועי לא קורסים (reading length)', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate(async () => { sb = __stub({}); authUser = { id: 'me', email: 'x@y.z' }; state = defState(); state.active = state.lists[0].id;
    delete state.priceAlerts; delete state.savings; delete state.basketSnaps;
    await alertsCheck26(true); savMonths26(); await basketCompare([{ n: 'חלב', q: '' }]); openSavings26(); openAlerts26(); });
  const d = await page.evaluate(() => ({ pa: Array.isArray(defState().priceAlerts), sv: Array.isArray(defState().savings) }));
  assert(d.pa && d.sv, 'defState בלי הרשימות החדשות');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🐞 בק אופיס: מעבר ללשונית אחרת בזמן שהיסטוריית השינויים נטענת לא מפיל (loadAudit · setting innerHTML)', async () => {
  const { ctx, page, errors } = await newPage({ viewport: { width: 1366, height: 820 } });
  await page.evaluate(async () => {
    sb = __stub({}); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } };
    const from = sb.from; sb.from = (n) => n === 'audit_log' ? { select: () => ({ order: () => ({ limit: () => ({ eq() { return this; }, then: (r) => new Promise((ok) => setTimeout(() => ok({ data: [], error: null }), 600)).then(r) }) }) }) } : from(n);
    openBO('backup'); await new Promise((r) => setTimeout(r, 100)); document.querySelector('#boNav button[data-s="errors"]').click(); });
  await page.waitForTimeout(1200);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🐞 יומן תקלות: כל תקלה מוסברת בעברית — מה קרה, איפה ובאיזה מכשיר; שם הפונקציה נרשם', async () => {
  // דפדפן רגיל — "HeadlessChrome" של הבדיקות מסונן כבוט ולא נרשם ביומן
  const { ctx, page, errors } = await newPage({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' });
  const IPH = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const D = { client_errors: [
    { id: 1, msg: "Cannot read properties of undefined (reading 'length')", src: 'alertsCheck26 · /:9000:12', ua: IPH, ver: '18', created_at: new Date().toISOString(), user_id: 'u1' },
    { id: 2, msg: 'ZXing is not defined', src: 'startScan · /:5000:3', ua: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36', ver: '18', created_at: new Date().toISOString(), user_id: 'u2' }] };
  const x = await page.evaluate((D) => { const a = errExplain(D.client_errors[0]), b = errExplain(D.client_errors[1]);
    sb = __stub(D); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('errors'); return { a, b }; }, D);
  assert(/נתון שלא היה קיים/.test(x.a.what) && /התראות מחיר/.test(x.a.where) && x.a.who === 'אייפון · ספארי', 'הסבר: ' + JSON.stringify(x.a));
  assert(/חסר רכיב/.test(x.b.what) && /סריקת ברקוד/.test(x.b.where) && x.b.who === 'אנדרואיד · כרום', 'הסבר 2: ' + JSON.stringify(x.b));
  await page.waitForTimeout(300);
  const bo = await page.evaluate(() => ({ n: document.querySelectorAll('#boMain .errx').length, t: document.querySelector('#boMain').innerText }));
  assert(bo.n === 2 && /איפה:/.test(bo.t) && /אצל:/.test(bo.t) && /מה לעשות:/.test(bo.t), 'יומן בבק אופיס: ' + JSON.stringify(bo).slice(0, 300));
  // שגיאה אמיתית נרשמת עם שם הפונקציה
  const src = await page.evaluate(async () => { const calls = []; sb = { rpc: (n, a) => { calls.push(a); return Promise.resolve({}); } };
    setTimeout(function brokenThing39() { null.x; }, 0); await new Promise((r) => setTimeout(r, 200)); return calls.map((c) => c.p_src).join('|'); });
  assert(/brokenThing39 · /.test(src), 'שם הפונקציה לא נרשם: ' + src);
  await ctx.close();
});

await test('🐞 יומן תקלות לפי גרסה ודגם: האפליקציה שולחת גרסה ודגם, הבק אופיס מקבץ ומתריע בלוח הראשי', async () => {
  const APP = 'Mozilla/5.0 (Linux; Android 14; SM-S901B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0 Mobile Safari/537.36 YamShoppingApp/2.1';
  const { ctx, page, errors } = await newPage({ userAgent: APP, viewport: { width: 1366, height: 900 } });
  const sent = await page.evaluate(async () => { const calls = []; sb = { rpc: (n, a) => { calls.push(a); return Promise.resolve({}); } };
    setTimeout(function appThing61() { null.y; }, 0); await new Promise((r) => setTimeout(r, 200)); return calls[0] || {}; });
  assert(sent.p_app === '2.1' && sent.p_device === 'SM-S901B · Android 14' && /^[0-9a-f-]{36}$/.test(sent.p_dev || ''), 'לא נשלחו גרסה ודגם: ' + JSON.stringify(sent));
  errors.length = 0; // התקלה שגרמנו בכוונה
  const now = Date.now(), iso = (h) => new Date(now - h * 36e5).toISOString();
  const D = { client_errors: [
    { id: 1, msg: "Cannot read properties of null (reading 'qty')", src: 'renderList · /js/006.js:10:2', ua: APP, ver: '18', app_ver: '2.1', device: 'SM-S901B · Android 14', dev: 'd1', created_at: iso(1) },
    { id: 2, msg: "Cannot read properties of null (reading 'qty')", src: 'renderList · /js/006.js:10:2', ua: APP, ver: '18', app_ver: '2.1', device: 'SM-A525F · Android 13', dev: 'd2', created_at: iso(2) },
    { id: 3, msg: "Cannot read properties of null (reading 'qty')", src: 'renderList · /js/006.js:10:2', ua: APP, ver: '18', app_ver: '2.1', device: 'SM-S901B · Android 14', user_id: 'u3', created_at: iso(3) },
    { id: 4, msg: '💥 האפליקציה נסגרה בגלל תקלה: NullPointerException', src: 'native · Updater.openInstaller:120 · thread main', ua: APP, ver: '18', app_ver: '2.0', device: 'SM-A525F · Android 13', dev: 'd2', created_at: iso(5) },
    { id: 5, msg: 'ZXing is not defined', src: 'startScan · /:5000:3', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36', ver: '18', app_ver: '', device: 'Android 10', dev: 'd9', created_at: iso(6) }] };
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('errors'); }, D);
  await page.waitForTimeout(400);
  const bo = await page.evaluate(() => ({ n: document.querySelectorAll('#boMain .errx').length, t: document.querySelector('#boMain').innerText }));
  assert(bo.n === 3 && /אפליקציה 2\.1/.test(bo.t) && /אתר \(דפדפן\)/.test(bo.t) && /Samsung Galaxy S22 \(SM-S901B\)/.test(bo.t) && /3 מכשירים/.test(bo.t), 'סיכום לפי גרסה ודגם: ' + bo.t.slice(0, 600));
  assert(/הקוד של האפליקציה לאנדרואיד/.test(bo.t) && /NullPointerException/.test(bo.t), 'קריסה של האפליקציה לא מוסברת: ' + bo.t.slice(0, 900));
  await page.click('#boMain [data-ef="site"]'); await page.waitForTimeout(300);
  const site = await page.evaluate(() => document.querySelectorAll('#boMain .errx').length);
  assert(site === 1, 'סינון "רק אתר": ' + site);
  // בלוח הראשי: אותה תקלה ב-3 מכשירים השבוע — שורה בולטת
  await page.evaluate(() => openBO('dash')); await page.waitForTimeout(600);
  const dash = await page.evaluate(() => { const c = document.querySelector('#err61d0'); return c ? c.innerText : ''; });
  assert(/3 מכשירים/.test(dash) && /2\.1/.test(dash) && /Galaxy S22/.test(dash), 'אין שורה בלוח הראשי: ' + dash);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('💥 קריסה של האפליקציה (YamApp.lastCrash) נשלחת ליומן התקלות בפתיחה הבאה', async () => {
  const APP = 'Mozilla/5.0 (Linux; Android 14; SM-S901B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0 Mobile Safari/537.36 YamShoppingApp/2.2';
  const { ctx, page } = await newPage({ userAgent: APP, init: () => { window.__crashCalls = []; window.YamApp = { lastCrash: () => JSON.stringify({ msg: '💥 האפליקציה נסגרה בגלל תקלה: IllegalStateException', where: 'Updater.run:42 · thread main', at: 1 }) }; } });
  await page.evaluate(() => { sb = { rpc: (n, a) => { if (n === 'log_client_error') window.__crashCalls.push(a); return Promise.resolve({}); } }; });
  await page.waitForTimeout(5000);
  const c = await page.evaluate(() => window.__crashCalls.find((a) => /^native · /.test(a.p_src)) || null);
  assert(c && /IllegalStateException/.test(c.p_msg) && c.p_app === '2.2' && /SM-S901B/.test(c.p_device), 'הקריסה לא נשלחה: ' + JSON.stringify(c));
  await ctx.close();
});

await test('הצהרת נגישות קיימת ומקושרת', async () => {
  const { ctx, page } = await newPage();
  const r = await page.evaluate(async () => ({ link: !!document.querySelector('a[href="accessibility.html"]'), page: (await fetch('accessibility.html')).ok }));
  assert(r.page, 'אין דף הצהרת נגישות'); assert(r.link, 'אין קישור להצהרה');
  await ctx.close();
});

await test('🎬 פרסומת וידאו: מתנגנת בלי קול, כפתור קול, גיבוי כשהסרטון נחסם, רק מהאחסון שלנו, והעלאה בבק אופיס', async () => {
  const { ctx, page, errors } = await newPage({ viewport: { width: 1366, height: 820 } });
  const V = 'https://ygyfodxfbebnkwdcbjrp.supabase.co/storage/v1/object/public/ad-videos/1729-ab12cd.mp4';
  const ad = (id, video) => ({ id, title: 'סרטון', placement: 'side', close_after: 0, active: true, image: '', link_url: '', advertiser: '', body: '', emoji: '🥛', theme: 'blue', video, views: 0, clicks: 0 });
  const r = await page.evaluate(async ([A]) => {
    sb = __stub({ ads: A }); applyConfig('ads', { audience: 'all', house: true }); myRole = null; authUser = { id: 'u', email: 'u@x.com', email_confirmed_at: 'x' };
    hideAds(); await loadAds(true); const v = document.querySelector('#ybSide video');
    const o = { v: !!v, muted: v && v.muted, auto: v && v.autoplay, loop: v && v.loop };
    await new Promise((res) => setTimeout(res, 800)); // הכתובת חסומה בבדיקה — כמו סינון שחוסם וידאו
    o.fail = !!document.querySelector('#ybSide .ybvid.fail'); o.fb = !!document.querySelector('#ybSide .ybvfb .ybhero');
    const w = document.querySelector('#ybSide .ybvid'); w.classList.remove('fail'); const b = w.querySelector('[data-adsnd]'); b.click(); o.unmuted = !w.querySelector('video').muted && b.textContent === '🔊'; b.click(); o.remuted = w.querySelector('video').muted;
    return o; }, [[ad('v1', V)]]);
  assert(r.v && r.muted && r.auto && r.loop, 'הסרטון לא מתנגן בלי קול בלולאה: ' + JSON.stringify(r));
  assert(r.fail && r.fb, 'סרטון שנחסם לא מוחלף באימוג\'י: ' + JSON.stringify(r));
  assert(r.unmuted && r.remuted, 'כפתור הקול לא עובד: ' + JSON.stringify(r));
  const foreign = await page.evaluate(async ([A]) => { sb = __stub({ ads: A }); hideAds(); await loadAds(true); return document.querySelectorAll('#ybSide video').length; }, [[ad('v2', 'https://evil.example.com/x.mp4')]]);
  assert(foreign === 0, 'וידאו מכתובת זרה הוצג');
  await page.evaluate(([A]) => { sb = __stub({ ads: A }); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('ads'); }, [[ad('v1', V)]]);
  await page.waitForTimeout(700);
  const bo = await page.evaluate(() => { const i = document.querySelector('#adVidFile'); document.querySelector('[data-act=edit]').click(); return { acc: i && i.accept, info: document.querySelector('#adVidInfo').textContent, pill: document.querySelector('#boMain').textContent.includes('🎬 וידאו'), prev: !!document.querySelector('#ybPreview video') }; });
  assert(bo.acc === 'video/mp4,video/webm' && bo.info.includes('1729-ab12cd.mp4') && bo.pill && bo.prev, 'בק אופיס: ' + JSON.stringify(bo));
  // העלאה שנכשלה (למשל לפני שהורץ קוד ה-SQL): ההסבר נשאר על המסך ולא נעלם אחרי שנייה
  await page.evaluate(() => { document.querySelector('#adCancel').click(); sb.storage = { from: () => ({ upload: async () => ({ data: null, error: { message: 'Bucket not found' } }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }; });
  await page.setInputFiles('#adVidFile', { name: 'ad.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not really a video') });
  await page.waitForTimeout(1500);
  const fail = await page.evaluate(() => document.querySelector('#adVidInfo').textContent);
  assert(fail.includes('SQL') && fail.includes('Bucket not found'), 'שגיאת העלאה לא מוסברת: ' + fail);
  // העלאה לפרסומת חדשה: כתוב בבירור שעוד צריך ללחוץ "פרסום" (אחרת הסרטון נעלם ברענון)
  await page.evaluate(() => { const ok = { upload: async () => ({ data: {}, error: null }), getPublicUrl: (n) => ({ data: { publicUrl: 'https://ygyfodxfbebnkwdcbjrp.supabase.co/storage/v1/object/public/' + window.__bucket + '/' + n } }) };
    const calls = window.__vidCalls = []; const from0 = sb.from; sb.storage = { from: (b) => { window.__bucket = b; return ok; } };
    sb.from = (t) => t === 'ads' ? { update: (v) => ({ eq: (c, id) => { calls.push([v, id]); return Promise.resolve({ error: null }); } }) } : from0(t); });
  await page.setInputFiles('#adVidFile', { name: 'ad.webm', mimeType: 'video/webm', buffer: Buffer.from('x') });
  await page.waitForTimeout(1500);
  const fresh = await page.evaluate(() => ({ info: document.querySelector('#adVidInfo').textContent, calls: window.__vidCalls.length, kept: document.querySelector('#adVidFile').files.length }));
  assert(fresh.info.includes('עוד לא נשמר') && fresh.info.includes('ad.webm') && fresh.calls === 0, 'פרסומת חדשה: ' + JSON.stringify(fresh));
  assert(fresh.kept === 1, 'שדה בחירת הקובץ התאפס אחרי העלאה מוצלחת (נראה כאילו לא נבחר קובץ)');
  // קובץ MOV מאייפון: הסבר שנשאר על המסך
  await page.setInputFiles('#adVidFile', { name: 'clip.mov', mimeType: 'video/quicktime', buffer: Buffer.from('x') });
  await page.waitForTimeout(300);
  const mov = await page.evaluate(() => document.querySelector('#adVidInfo').textContent);
  assert(mov.includes('clip.mov') && mov.includes('MP4'), 'קובץ MOV: ' + mov);
  // מחשב שלא מוסר את סוג הקובץ: לפי הסיומת .mp4
  await page.evaluate(() => document.querySelector('#adCancel').click());
  await page.setInputFiles('#adVidFile', { name: '770.mp4', mimeType: '', buffer: Buffer.from('x') });
  await page.waitForTimeout(1500);
  const noType = await page.evaluate(() => document.querySelector('#adVidInfo').textContent);
  assert(noType.includes('770.mp4') && noType.includes('עוד לא נשמר'), 'קובץ בלי סוג: ' + noType);
  // העלאה בעריכת פרסומת קיימת: הסרטון נשמר בה מיד, בלי ללחוץ על שמירה
  await page.evaluate(() => document.querySelector('[data-act=edit]').click());
  await page.setInputFiles('#adVidFile', { name: 'ad.webm', mimeType: 'video/webm', buffer: Buffer.from('x') });
  await page.waitForTimeout(1500);
  const saved = await page.evaluate(() => window.__vidCalls);
  assert(saved.length === 1 && saved[0][1] === 'v1' && /\/public\/clips\/\d+-[a-z0-9]+\.webm$/.test(saved[0][0].video), 'הסרטון לא נשמר מיד בפרסומת: ' + JSON.stringify(saved));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🎬 סרטון שחוסם פרסומות / סינון חוסמים בטעינה ישירה — מתנגן בדרך עקיפה (מורידים ומנגנים מהזיכרון)', async () => {
  const { ctx, page, errors } = await newPage({ viewport: { width: 1366, height: 820 } });
  const WEBM = Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAREEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggEeTbuMU6uEHFO7a1OsggQu7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjAuMTYuMTAwV0GNTGF2ZjYwLjE2LjEwMESJiECPQAAAAAAAFlSua8GuAQAAAAAAADjXgQFzxYj9vPNPTQA5/5yBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhAJiWgDgibCBQLqBQJqBAhJUw2f8c3OgY8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2MC4xNi4xMDBzc9ZjwItjxYj9vPNPTQA5/2fIoUWjh0VOQ09ERVJEh5RMYXZjNjAuMzEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDEuMDAwMDAwMDAwAB9DtnVCieeBAKPEgQAAgNADAJ0BKkAAQAAARwiFhYiFhIgCAgJ1qgP4A/oCBxpGRgFwx0hLxAD+/W7z/+OZNzDE/45t//FhPA4oyP/xUQCjloEAKADRAQABEBAAGAAYWC/0AAiOgACjloEAUADRAQABEBAAGAAYWC/0AAiOgACjloEAeADRAQABEBAAGAAYWC/0AAiOgACjloEAoADRAQABEBAAGAAYWC/0AAiOgACjloEAyADRAQABEBAAGAAYWC/0AAiOgACjloEA8ADRAQABEBAAGAAYWC/0AAiOgACjloEBGADRAQABEBAUYABhYL/QACI6AACjloEBQADRAQABEBAAGAAYWC/0AAiOgACjloEBaADRAQABEBAAGAAYWC/0AAiOgACjloEBkADRAQABEBAAGAAYWC/0AAiOgACjloEBuADRAQABEBAAGAAYWC/0AAiOgACjloEB4ADRAQABEBAAGAAYWC/0AAiOgACjloECCADRAQABEBAAGAAYWC/0AAiOgACjloECMADRAQABEBAAGAAYWC/0AAiOgACjloECWADRAQABEBAAGAAYWC/0AAiOgACjloECgADRAQABEBAAGAAYWC/0AAiOgACjloECqADRAQABEBAAGAAYWC/0AAiOgACjloEC0ADRAQABEBAUYABhYL/QACI6AACjloEC+ADRAQABEBAAGAAYWC/0AAiOgACjloEDIADRAQABEBAAGAAYWC/0AAiOgACjloEDSADRAQABEBAAGAAYWC/0AAiOgACjloEDcADRAQABEBAAGAAYWC/0AAiOgACjloEDmADRAQABEBAAGAAYWC/0AAiOgACjloEDwADRAQABEBAAGAAYWC/0AAiOgAAcU7trkbuPs4EAt4r3gQHxggGf8IED', 'base64');
  // כמו בדפדפן של בעל האתר: טעינת וידאו ישירה נחסמת, הורדה רגילה של הקובץ עוברת
  await page.route(/\/m\/c\/1729-ab12cd\.webm$/, (r) => r.request().resourceType() === 'media' ? r.abort('blockedbyclient') : r.fulfill({ body: WEBM, contentType: 'video/webm', headers: { 'access-control-allow-origin': '*' } }));
  const V = 'https://ygyfodxfbebnkwdcbjrp.supabase.co/storage/v1/object/public/clips/1729-ab12cd.webm';
  const r = await page.evaluate(async (V) => {
    sb = __stub({ ads: [{ id: 'v1', title: 'סרטון', placement: 'side', close_after: 0, active: true, image: '', link_url: '', advertiser: '', body: '', emoji: '🥛', theme: 'blue', video: V, views: 0, clicks: 0 }] });
    applyConfig('ads', { audience: 'all', house: true }); myRole = null; authUser = { id: 'u', email: 'u@x.com', email_confirmed_at: 'x' };
    hideAds(); await loadAds(true); await new Promise((res) => setTimeout(res, 2500));
    const v = document.querySelector('#ybSide video'), w = document.querySelector('#ybSide .ybvid');
    return { first: v && v.dataset.orig, src: v && v.src.slice(0, 5), fail: w && w.classList.contains('fail'), ready: v && v.readyState, err: v && v.error && v.error.code }; }, V);
  assert(r.src === 'blob:' && !r.fail && r.ready >= 1, 'הסרטון לא התנגן בדרך העקיפה: ' + JSON.stringify(r));
  assert(r.first === '/m/c/1729-ab12cd.webm', 'הסרטון לא נטען דרך הכתובת של האתר עצמו (חוסמי פרסומות חוסמים את Supabase): ' + JSON.stringify(r));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('📢 פרסומות: מי רואה (כולם / רק מנהלים / אף אחד), מידות למפרסמים, ופרסומת כבויה לא מוצגת', async () => {
  const { ctx, page, errors } = await newPage({ viewport: { width: 1366, height: 820 } });
  const ADS = [{ id: 'a1', title: 'פעילה', placement: 'banner', close_after: 0, active: true, image: '', link_url: '', advertiser: '', body: '', views: 0, clicks: 0 },
    { id: 'a2', title: 'כבויה', placement: 'banner', close_after: 0, active: false, image: '', link_url: '', advertiser: '', body: '', views: 0, clicks: 0 },
    { id: 'a3', title: 'הסתיימה', placement: 'banner', close_after: 0, active: true, ends_at: '2020-01-01T00:00:00Z', image: '', link_url: '', advertiser: '', body: '', views: 0, clicks: 0 }];
  await page.evaluate((A) => { sb = __stub({ ads: A }); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; }, ADS);
  await page.evaluate(() => openBO('ads')); await page.waitForTimeout(700);
  const bo = await page.evaluate(() => ({ radios: document.querySelectorAll('#adAud input[name=adAud]').length, t: document.querySelector('#boMain').textContent }));
  assert(bo.radios === 3, 'אין בחירה מי רואה פרסומות: ' + bo.radios);
  assert(bo.t.includes('1080×1080') && bo.t.includes('300×300'), 'אין מידות למפרסמים');
  const shown = async (aud, admin) => page.evaluate(async ([aud, admin]) => {
    document.querySelector('#bo').classList.add('hidden'); applyConfig('ads', { audience: aud }); myRole = admin ? 'admin' : null;
    authUser = { id: 'u', email: admin ? 'owner@x.com' : 'u@x.com', email_confirmed_at: 'x', app_metadata: admin ? { yam_owner: true } : {} };
    hideAds(); await loadAds(true); const b = document.querySelector('#ybTop'); return b.hidden ? '' : b.textContent; }, [aud, admin]);
  const all = await shown('all', false);
  assert(all.includes('פעילה') && !all.includes('כבויה') && !all.includes('הסתיימה'), 'כולם: ' + all);
  assert((await shown('none', true)) === '', 'אף אחד: מנהל עדיין רואה פרסומת');
  assert((await shown('admins', false)) === '', 'רק מנהלים: משתמש רגיל רואה פרסומת');
  assert((await shown('admins', true)).includes('פעילה'), 'רק מנהלים: המנהל לא רואה');
  // פרסומת חדשה מגיעה גם למי שהאתר פתוח אצלו מזמן: כשחוזרים לאתר טוענים שוב
  const fresh = await page.evaluate(async () => { document.querySelector('#bo').classList.add('hidden'); applyConfig('ads', { audience: 'all' }); myRole = null; authUser = { id: 'u', email: 'u@x.com', email_confirmed_at: 'x' };
    sb = __stub({ ads: [{ id: 'n1', title: 'חדשה', placement: 'banner', close_after: 0, active: true, image: '', link_url: '', advertiser: '', body: '', views: 0, clicks: 0 }] });
    adsLoadedAt = Date.now() - 11 * 60000; refreshAds(); await new Promise((r) => setTimeout(r, 300)); return document.querySelector('#ybTop').textContent; });
  assert(fresh.includes('חדשה'), 'פרסומת חדשה לא נטענה כשחוזרים לאתר: ' + fresh);
  // פופאפ שנחסם בגלל חלון אחר פתוח (עדכון / היכרות) מחכה ומופיע כשהמסך מתפנה — לא מוותר
  const pop = await page.evaluate(async () => { applyConfig('ads', { audience: 'all', freq: 'load' }); adShownThisLoad = false;
    sb = __stub({ ads: [{ id: 'p1', title: 'פופ', placement: 'popup', close_after: 0, active: true, image: '', link_url: '', advertiser: '', body: '', views: 0, clicks: 0 }] });
    openSheet('בדיקה', '<p>x</p>'); await loadAds(); await new Promise((r) => setTimeout(r, 3500)); const blocked = !document.querySelector('#ybPop').hidden;
    closeSheet(); await new Promise((r) => setTimeout(r, 3500)); const shown = !document.querySelector('#ybPop').hidden; closeAdPop(); return { blocked, shown }; });
  assert(!pop.blocked && pop.shown, 'פופאפ: ' + JSON.stringify(pop));
  // פרסומת קבועה בצד: "המבצע שלכם כאן" כשאין פרסומת צד, פרסומת צד אמיתית (אימוג'י בלי תמונה) כשיש, וכלום כשהמנהל כיבה
  const side = async (ads, house) => page.evaluate(async ([ads, house]) => {
    sb = __stub({ ads }); applyConfig('ads', { audience: 'all', house }); myRole = null; authUser = { id: 'u', email: 'u@x.com', email_confirmed_at: 'x' };
    hideAds(); await loadAds(true); const s = document.querySelector('#ybSide'), r = s.getBoundingClientRect();
    const body = s.querySelector('.ybsBody'), tab = s.querySelector('.ybsTab'), tr = tab ? tab.getBoundingClientRect() : {};
    return { hidden: s.hidden, t: s.textContent, hero: (s.querySelector('.ybhero') || {}).className || '', left: r.left, right: r.right, vw: innerWidth,
      bodyShown: !!(body && body.offsetParent), tabW: tr.width || 0, tabLeft: tr.left || 0, appLeft: document.querySelector('.app').getBoundingClientRect().left }; }, [ads, house]);
  const h = await side([], true);
  assert(!h.hidden && h.t.includes('המבצע שלכם כאן'), 'אין "המבצע שלכם כאן" בצד: ' + JSON.stringify(h));
  // גם במחשב: לשונית קטנה בקצה האתר (הפרסומת סגורה ולא מכסה את האתר עד שלוחצים)
  assert(!h.bodyShown && h.tabW > 0 && h.tabW <= 32 && Math.abs(h.tabLeft - h.appLeft) <= 2 && h.right <= h.vw, 'הפרסומת בצד לא מוצגת כלשונית סגורה בקצה האתר: ' + JSON.stringify(h));
  const sd = await side([{ id: 's1', title: 'חלב בחצי מחיר', placement: 'side', emoji: '🥛', theme: 'blue', close_after: 0, active: true, image: '', link_url: '', advertiser: '', body: '' }], true);
  assert(sd.t.includes('חלב בחצי מחיר') && !sd.t.includes('המבצע שלכם כאן') && sd.hero.includes('t-blue'), 'פרסומת הצד לא הוצגה: ' + JSON.stringify(sd));
  assert((await side([], false)).hidden, 'הצד לא ריק כשהמנהל כיבה');
  // תדירות: פעם ביום / בכל כניסה / בכל ריענון
  const again = async (freq) => page.evaluate(async (freq) => {
    applyConfig('ads', { audience: 'all', freq }); localStorage.removeItem('yamh_ads_seen'); sessionStorage.clear(); adLoadSeen.clear();
    markAdSeen('a1', 'ban'); const day = adSeenToday('a1', 'ban'); adLoadSeen.clear(); return [day, adSeenToday('a1', 'ban')]; }, freq);
  assert(JSON.stringify(await again('day')) === '[true,true]', 'פעם ביום: הבאנר חוזר אחרי ריענון');
  assert(JSON.stringify(await again('session')) === '[true,true]', 'בכל כניסה: הבאנר חוזר באותה כניסה');
  assert(JSON.stringify(await again('load')) === '[true,false]', 'בכל ריענון: הבאנר לא חוזר אחרי ריענון');
  const fs2 = await page.evaluate(async () => { authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('ads'); await new Promise((r) => setTimeout(r, 700)); return document.querySelectorAll('#adFreqSel option').length; });
  assert(fs2 === 3, 'אין בחירת תדירות בבק אופיס');
  // תדירות לכל פרסומת בנפרד: אחת "בכל כניסה" ואחת "בכל ריענון" — הראשונה לא חוזרת בריענון (באג: הכל הוצג בכל ריענון)
  const per = await page.evaluate(() => {
    applyConfig('ads', { audience: 'all', freq: 'day' }); localStorage.removeItem('yamh_ads_seen'); sessionStorage.clear(); adLoadSeen.clear();
    adsCache = [{ id: 'p1', placement: 'popup', freq: 'session' }, { id: 'p2', placement: 'popup', freq: 'load' }, { id: 'p3', placement: 'popup', freq: '' }];
    markAdSeen('p1', 'pop'); markAdSeen('p2', 'pop'); markAdSeen('p3', 'pop'); adLoadSeen.clear(); // ריענון
    const r = { s: adSeenToday('p1', 'pop'), l: adSeenToday('p2', 'pop'), d: adSeenToday('p3', 'pop'), dayStored: !!adSeenMap()['pop:p3'], sessStored: sessionStorage.getItem('yamh_ad_pop:p1') === '1' };
    adsCache = []; return r; });
  assert(per.s && !per.l && per.d && per.dayStored && per.sessStored, 'תדירות לכל פרסומת: ' + JSON.stringify(per));
  const form = await page.evaluate(async () => { const o = document.querySelectorAll('#adFreqOne option').length; document.querySelector('#adFreqOne').value = 'load';
    let sent = null; const from0 = sb.from; sb.from = (t) => t === 'ads' ? { insert: (v) => { sent = v; return Promise.resolve({ error: null }); }, select: () => from0(t).select() } : from0(t);
    document.querySelector('#adTitle').value = 'בדיקה'; document.querySelector('#adSave').click(); await new Promise((r) => setTimeout(r, 300)); sb.from = from0; return { o, freq: sent && sent.freq }; });
  assert(form.o === 4 && form.freq === 'load', 'בחירת תדירות לפרסומת בטופס: ' + JSON.stringify(form));
  // 📄 פרסומת לכל דף: אחת ברשימה ואחת בהיסטוריה — כל אחת בדף שלה; 👁️ "רק מנהלים" לפרסומת אחת לא מסתיר את האחרות
  const pages = await page.evaluate(async () => {
    document.querySelector('#bo').classList.add('hidden'); applyConfig('ads', { audience: 'all', freq: 'load' }); myRole = null; authUser = { id: 'u', email: 'u@x.com', email_confirmed_at: 'x' };
    const B = (id, title, pg, aud) => ({ id, title, placement: 'banner', page: pg, audience: aud || '', close_after: 0, active: true, image: '', link_url: '', advertiser: '', body: '', views: 0, clicks: 0 });
    sb = __stub({ ads: [B('bl', 'ברשימה', 'list'), B('bh', 'בהיסטוריה', 'hist'), B('ba', 'רק למנהלים', '', 'admins')] });
    setTab('list'); hideAds(); await loadAds(true); const onList = document.querySelector('#ybTop').textContent;
    setTab('hist'); const onHist = document.querySelector('#ybTop').textContent;
    setTab('prices'); const onPrices = document.querySelector('#ybTop').hidden;
    const ids = adsCache.map((a) => a.id).join(','); setTab('list'); return { onList, onHist, onPrices, ids }; });
  assert(pages.onList.includes('ברשימה') && pages.onHist.includes('בהיסטוריה') && !pages.onHist.includes('ברשימה'), 'פרסומת לפי דף: ' + JSON.stringify(pages));
  assert(pages.onPrices && pages.ids === 'bl,bh', 'פרסומת "רק למנהלים" הוצגה למשתמש, או דף בלי פרסומת לא ריק: ' + JSON.stringify(pages));
  // 🛡️ חוסמי פרסומות מסתירים אלמנטים לפי שמות כמו adBanner / .adbanner / .ad — לכן אין באתר שמות כאלה
  const blockerNames = await page.evaluate(() => [...document.querySelectorAll('[id],[class]')].filter((el) => !el.closest('#bo'))
    .flatMap((el) => [el.id, ...el.classList]).filter((n) => n && /^(ad|ads|advert\w*|ad[A-Z_-]\w*|ad(banner|side|pop|card|box|slot|unit|hero|vid|x|tag|txt|pic|cta|em|snd|vfb)\w*)$/.test(n) && !/^(add|admin|address)/.test(n)));
  assert(!blockerNames.length, 'שמות שחוסמי פרסומות מסתירים: ' + [...new Set(blockerNames)].join(', '));
  // פופאפ לדף ההיסטוריה מופיע כשנכנסים להיסטוריה, גם אם כבר הוצג פופאפ ברשימה
  const popH = await page.evaluate(async () => {
    const P = (id, title, pg) => ({ id, title, placement: 'popup', page: pg, close_after: 0, active: true, image: '', link_url: '', advertiser: '', body: '', views: 0, clicks: 0 });
    sb = __stub({ ads: [P('pl', 'פופ ברשימה', 'list'), P('ph', 'פופ בהיסטוריה', 'hist')] }); adLoadSeen.clear(); setTab('list'); hideAds(); await loadAds(true);
    maybePopupAd(); const first = document.querySelector('#ybPopBody').textContent; closeAdPop();
    setTab('hist'); await new Promise((r) => setTimeout(r, 1200)); const second = document.querySelector('#ybPop').hidden ? '' : document.querySelector('#ybPopBody').textContent; closeAdPop(); setTab('list'); return { first, second }; });
  assert(popH.first.includes('פופ ברשימה') && popH.second.includes('פופ בהיסטוריה'), 'פופאפ לפי דף: ' + JSON.stringify(popH));
  // 🔎 סרטון שלא מתנגן: מסבירים למה לפי מה שהשרת מחזיר
  const diag = await page.evaluate(async () => { const f0 = window.fetch; const r = {};
    window.fetch = async () => new Response('', { status: 200, headers: { 'content-type': 'video/mp4' } }); r.ok = await adVidDiag('https://x.supabase.co/v.mp4', 4);
    window.fetch = async () => new Response('{}', { status: 400, headers: { 'content-type': 'application/json' } }); r.missing = await adVidDiag('https://x.supabase.co/v.mp4', 4);
    window.fetch = async () => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }); r.page = await adVidDiag('https://x.supabase.co/v.mp4', 4);
    window.fetch = async () => { throw new TypeError('Failed to fetch'); }; r.blocked = await adVidDiag('https://x.supabase.co/v.mp4', 2);
    window.fetch = async () => new Response('', { status: 200, headers: { 'content-type': 'video/mp4' } }); r.old = await adVidDiag('https://x.supabase.co/storage/v1/object/public/ad-videos/v.mp4', 4);
    window.fetch = f0; return r; });
  assert(/סינון/.test(diag.ok) && /SQL/.test(diag.missing) && /דף חסימה/.test(diag.page) && /חוסם/.test(diag.blocked) && /חוסם פרסומות/.test(diag.old) && /להעלות שוב/.test(diag.old), 'אבחון סרטון: ' + JSON.stringify(diag));
  // לחיצה על פרסומת מובילה לפעולה באתר (למשל סורק ברקוד / יאמי) — בלי לפתוח לשונית חדשה; גם התמונה עצמה לחיצה
  const act = await page.evaluate(async () => {
    const goOpts = document.querySelectorAll('#adGo option').length;
    let called = ''; const orig = openBot; openBot = () => { called = 'yami'; };
    document.querySelector('#bo').classList.add('hidden');
    sb = __stub({ ads: [{ id: 'r1', title: 'יאמי', placement: 'side', emoji: '🤖', theme: 'green', image: '', link_url: 'https://www.yamshopping.com/?a=yami', active: true, close_after: 0, advertiser: '', body: '' }] });
    authUser = { id: 'u', email: 'u@x.com', email_confirmed_at: 'x' }; myRole = null; hideAds(); await loadAds(true);
    const cta = document.querySelector('#ybSide .ybcta'), pic = document.querySelector('#ybSide a.ybpic');
    const r = { goOpts, text: cta && cta.textContent, target: cta && cta.getAttribute('target'), pic: !!pic };
    pic.click(); r.called = called; openBot = orig; return r; });
  assert(act.goOpts >= 10, 'אין בחירה לאן הלחיצה מובילה: ' + act.goOpts);
  assert(act.text === '🤖 לשאול את יאמי' && !act.target && act.pic && act.called === 'yami', 'פעולה באתר מפרסומת לא עובדת: ' + JSON.stringify(act));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('קישורים ביאמי: כתובת ארוכה הופכת לקישור עם שם בעברית ("עיתים לבינה"), ובלי הזרקת קוד', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(() => {
    botSay('לוח מלא:\nhttps://itimlabina.co.il/calendar/weekly?address=' + encodeURIComponent('בני ברק, ישראל') + '&lat=32.083&lng=34.833.');
    botSay('בדיקה https://evil.example/"><img src=x onerror=alert(1)>');
    const bubs = [...document.querySelectorAll('#botMsgs .row.bot .bub')]; const a = bubs[bubs.length - 2].querySelector('a'), b = bubs[bubs.length - 1];
    return { text: a && a.textContent, href: a && a.getAttribute('href'), raw: bubs[bubs.length - 2].textContent, img: !!b.querySelector('img'), bhref: (b.querySelector('a') || {}).href || '' };
  });
  assert(r.text && r.text.includes('עיתים לבינה'), 'אין קישור עם שם: ' + r.raw);
  assert(r.href.startsWith('https://itimlabina.co.il/calendar/weekly?address=') && r.href.endsWith('lng=34.833'), 'הקישור שגוי: ' + r.href);
  assert(!r.raw.includes('itimlabina.co.il'), 'הכתובת באנגלית עדיין מוצגת');
  assert(!r.img && !r.bhref.includes('<'), 'הזרקת קוד דרך קישור');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('דפי נחיתה לגוגל: קיימים ומופיעים במפת האתר', async () => {
  const { ctx, page } = await newPage();
  const r = await page.evaluate(async () => {
    /* הקישורים מתחתית מסך הכניסה הוסרו (#171) — הדפים נבדקים לפי מפת האתר */
    const sitemap = await (await fetch('sitemap.xml')).text();
    const links = [...new Set((sitemap.match(/https:\/\/www\.yamshopping\.com\/[a-z0-9-]+\.html/g) || []).map((u) => u.slice('https://www.yamshopping.com'.length)).filter((h) => /^\/(reshimat-kniyot|hashvaat)/.test(h)))];
    const out = [];
    for (const h of links) {
      const res = await fetch(h.replace(/^\//, '')); const t = res.ok ? await res.text() : '';
      out.push({ h, ok: res.ok, h1: /<h1>[^<]+<\/h1>/.test(t), canon: t.includes('<link rel="canonical" href="https://www.yamshopping.com' + h + '">'), inMap: sitemap.includes('https://www.yamshopping.com' + h + '<') });
    }
    return { links, out };
  });
  assert(r.links.length >= 5, 'חסרים קישורים לדפי הנחיתה: ' + r.links.length);
  for (const x of r.out) { assert(x.ok && x.h1, 'דף חסר או בלי כותרת: ' + x.h); assert(x.canon, 'כתובת קנונית שגויה: ' + x.h); assert(x.inMap, 'לא במפת האתר: ' + x.h); }
  await ctx.close();
});

await test('קבלה: קבלה ארוכה נחתכת לחלקים חדים; טבלת אישור מצרפת הנחה, מסמנת שדות לא בטוחים ובודקת מול הסה״כ', async () => {
  const { ctx, page, errors } = await newPage();
  // קבלה ארוכה וצרה (900×6000): לא מוקטנת לרוחב של כמה מאות פיקסלים, אלא נחתכת לחלקים חופפים
  const prep = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 900; c.height = 6000; const x = c.getContext('2d');
    x.fillStyle = '#eee'; x.fillRect(0, 0, 900, 6000); x.fillStyle = '#333'; for (let y = 40; y < 6000; y += 40) x.fillText('חלב 3% 1 ליטר      5.90', 50, y);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const parts = await rcPrep(new File([blob], 'r.png', { type: 'image/png' }), true);
    const sizes = await Promise.all(parts.map((d) => new Promise((r) => { const im = new Image(); im.onload = () => r([im.width, im.height]); im.src = d; })));
    return { n: parts.length, sizes, jpeg: parts.every((d) => d.startsWith('data:image/jpeg')), maxLen: Math.max(...parts.map((d) => d.length)) };
  });
  assert(prep.n >= 3 && prep.n <= 4, 'חלקים: ' + prep.n);
  assert(prep.sizes.every(([w]) => w === 900), 'רוחב: ' + JSON.stringify(prep.sizes));
  assert(prep.jpeg && prep.maxLen < 1900000, 'גודל: ' + prep.maxLen);
  const MOCK = {
    store: 'שופרסל דיל', branch: 'בני ברק', date: '2026-10-08', total: 40.5, deposit_total: 0.3,
    items: [
      { name: 'חלב 3%', brand: 'תנובה', qty: 2, list_price: 5.9, price: 5.9, total: 11.8, barcode: '7290004131074', raw: 'חלב 3% 1ל תנובה' },
      { name: 'הנחת מבצע', qty: 1, price: -2, total: -2 },
      { name: 'לחם אחיד', qty: 1, price: 7.2, total: 8.5, barcode: '72900', unsure: ['price'] },
      { name: 'עגבניות', qty: 1.235, unit: 'ק״ג', list_price: 9.9, price: 9.9, total: 12.23 },
    ],
    check: { sum: 30.83, total: 40.5, diff: 9.67, ok: false, verified: false, passes: 2, bad_lines: [2] },
  };
  const r = await page.evaluate(async (M) => {
    const calls = [];
    sb = window.__stub({}); authUser = { id: 'tester', email: 't@example.com' };
    sb.functions.invoke = (n, o) => { calls.push(o.body); return Promise.resolve({ data: { receipt: JSON.parse(JSON.stringify(M)) }, error: null }); };
    openUpload('receipt'); upImgs = ['data:image/jpeg;base64,AAAA'];
    await readUpload();
    const st = document.querySelector('#rcStatus');
    const rows = [...document.querySelectorAll('#upOut .rctbl tr[data-ur]')];
    const milk = rows[0];
    const res = {
      vision: calls[0] && calls[0].vision, tips: !!document.querySelector('.rctips'), enh: !!document.querySelector('#rcEnh'),
      rows: rows.length, milkTotal: milk.querySelector('[data-f=total]').value, deal: !!milk.querySelector('.urdeal'),
      state: st.dataset.state, text: st.textContent,
      unsure: [...document.querySelectorAll('#upOut .rcunsure')].map((e) => e.closest('tr').querySelector('[data-f=name]').value + ':' + e.dataset.f),
    };
    // מתקנים את הלחם (8.50 → 7.20) ומוסיפים את השורה שהייתה חסרה — הסכום מסתדר
    const bread = rows[1]; const bt = bread.querySelector('[data-f=total]'); bt.value = '7.20'; bt.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#rcAdd').click();
    const nr = document.querySelector('#upOut .rctbl tr[data-ur]:last-child');
    nr.querySelector('[data-f=name]').value = 'גבינה צהובה'; const nt = nr.querySelector('[data-f=total]'); nt.value = '10.97'; nt.dispatchEvent(new Event('input', { bubbles: true }));
    res.after = st.dataset.state; res.afterText = st.textContent; res.breadUnsure = bread.querySelectorAll('[data-f=price].rcunsure,[data-f=total].rcunsure').length;
    // שמירה (בלי פרסום): המחירים והכמויות נכנסים להיסטוריה
    document.querySelector('#urPub').checked = false; document.querySelector('#urStock').checked = false;
    await confirmUpload();
    const h = state.history[0]; res.hist = h && h.receipt ? h.items.map((i) => i.n + '×' + i.q + '@' + i.price).join(',') : '';
    // קבלה שהסכום שלה תואם — ✓ ירוק
    openUpload('receipt'); upImgs = ['data:image/jpeg;base64,AAAA'];
    const ok = JSON.parse(JSON.stringify(M)); ok.total = 29.53; ok.items[2].total = 7.2; ok.items[2].unsure = []; ok.items[2].barcode = ''; ok.check = { ok: true, passes: 1 };
    sb.functions.invoke = () => Promise.resolve({ data: { receipt: ok }, error: null });
    await readUpload();
    res.okState = document.querySelector('#rcStatus').dataset.state; res.okText = document.querySelector('#rcStatus').textContent;
    return res;
  }, MOCK);
  assert(r.vision === 'receipt' && r.tips && r.enh, 'מסך העלאה: ' + JSON.stringify(r));
  assert(r.rows === 3, 'שורת ההנחה צריכה להצטרף לחלב: ' + r.rows);
  assert(r.milkTotal === '9.8' && r.deal, 'חלב אחרי הנחה: ' + r.milkTotal);
  assert(r.state === 'warn' && /הפרש/.test(r.text), 'אזהרת הפרש: ' + r.state + ' ' + r.text);
  assert(r.unsure.includes('לחם אחיד:price') && r.unsure.includes('לחם אחיד:total') && r.unsure.includes('לחם אחיד:barcode'), 'סימון שדות לא בטוחים: ' + r.unsure.join(','));
  assert(!r.unsure.some((u) => u.startsWith('חלב')), 'חלב סומן בטעות: ' + r.unsure.join(','));
  assert(r.after === 'ok' && r.breadUnsure === 0, 'אחרי תיקון: ' + r.after + ' ' + r.afterText);
  assert(/לחם אחיד×1@7\.2/.test(r.hist) && /גבינה צהובה×1@10\.97/.test(r.hist) && /חלב 3%×2@4\.9/.test(r.hist), 'היסטוריה: ' + r.hist);
  assert(r.okState === 'ok' && /✓/.test(r.okText), 'סה״כ תואם: ' + r.okState + ' ' + r.okText);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

// אפליקציית האנדרואיד (android-app): הסקריפט שהיא מזריקה להורדות, והאתר מזהה שהוא בתוך האפליקציה
const APP_JAVA = fs.readFileSync(path.join(ROOT, '../android-app/src/com/yamshopping/app/AppActivity.java'), 'utf8');
const APP_DOWNLOAD_JS = APP_JAVA.match(/DOWNLOAD_JS = ([\s\S]*?);\n/)[1].match(/"((?:[^"\\]|\\.)*)"/g).map((q) => JSON.parse(q)).join('');
const APP_UA = APP_JAVA.match(/UA_MARK = "([^"]*)"/)[1];
await test('📲 אפליקציית אנדרואיד: הורדת גיבוי נשמרת דרך האפליקציה, וכפתור כניסה עם גוגל מופיע (מגרסה 2.0)', async () => {
  const { ctx, page, errors } = await newPage({ userAgent: 'Mozilla/5.0 (Linux; Android 15; wv) Chrome/140.0 Mobile Safari/537.36' + APP_UA });
  await page.evaluate((js) => { window.YamApp = { saveFile: (n, m, b) => { window._saved = { n, m, b }; } }; eval(js); eval(js); }, APP_DOWNLOAD_JS);
  await page.evaluate(() => document.querySelector('#shBackup').click());
  let saved = null; for (let i = 0; i < 20 && !saved; i++) { await page.waitForTimeout(100); saved = await page.evaluate(() => window._saved); }
  assert(saved && /^yamh-backup-.*\.json$/.test(saved.n) && saved.m === 'application/json', 'ההורדה לא הגיעה לאפליקציה: ' + JSON.stringify(saved && { n: saved.n, m: saved.m }));
  const json = JSON.parse(Buffer.from(saved.b, 'base64').toString('utf8'));
  assert(json.user && json.user.name === 'בודק', 'תוכן הגיבוי שגוי');
  assert(await page.evaluate(() => !document.querySelector('#btnGoogle').hidden && appGoogleOK()), 'כפתור גוגל מוסתר באפליקציה 2.0');
  await page.evaluate(() => document.querySelector('#btnGoogle').click());
  const msg = await page.evaluate(() => document.querySelector('#loginErr').textContent);
  assert(msg.length > 0, 'אין הודעה אחרי לחיצה על גוגל בלי חיבור לשרת');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('📲 התקנת האפליקציה: הכפתור תמיד בראש התפריט, לחיצה מתקינה ישר כשאפשר; בתוך אפליקציית האנדרואיד הוא מוסתר', async () => {
  const { ctx, page, errors } = await newPage({ userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/140.0 Mobile Safari/537.36' });
  const vis = await page.evaluate(() => { const b = document.querySelector('#miInstall'); return !!b && !b.hidden && b.parentElement.id === 'hMenu'; });
  assert(vis, 'כפתור ההתקנה לא מופיע בראש התפריט');
  // הדפדפן מאפשר התקנה: לחיצה אחת פותחת את חלון ההתקנה של הדפדפן, בלי מסך הוראות
  await page.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window._prompted = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
  await page.evaluate(() => document.querySelector('#miInstall').click());
  await page.waitForTimeout(200);
  const r1 = await page.evaluate(() => ({ prompted: !!window._prompted, sheet: document.querySelector('#v8Sheet').classList.contains('open') }));
  assert(r1.prompted && !r1.sheet, 'התקנה ישירה: ' + JSON.stringify(r1));
  // הדפדפן לא מאפשר: הוראה קצרה לאנדרואיד בלבד
  await page.evaluate(() => document.querySelector('#miInstall').click());
  await page.waitForTimeout(200);
  const sh = await page.evaluate(() => ({ open: document.querySelector('#v8Sheet').classList.contains('open'), txt: document.querySelector('#v8SheetBody').textContent }));
  assert(sh.open && /כרום/.test(sh.txt) && !/ספארי/.test(sh.txt), 'הוראה קצרה: ' + sh.txt.slice(0, 80));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
  const app = await newPage({ userAgent: 'Mozilla/5.0 (Linux; Android 15; wv) Chrome/140.0 Mobile Safari/537.36' + APP_UA });
  assert(await app.page.evaluate(() => document.querySelector('#miInstall').hidden), 'בתוך האפליקציה לא צריך כפתור התקנה');
  await app.ctx.close();
});

await test('💬 צ׳אט עם האתר: תגובה להודעה מסוימת, עריכה, אימוג׳י; כפתור תמונה רק אצל המנהל', async () => {
  const { ctx, page, errors } = await newPage();
  const at = (m) => new Date(Date.now() - m * 60000).toISOString();
  const M = [
    { id: 'c1', user_id: 'me', from_staff: false, author_name: 'בודק', body: 'שלום, שאלה', created_at: at(60), read_by_staff: true, read_by_user: true, topic: 'שאלה כללית', reply_to: null, edited_at: null, react_user: '', react_staff: '👍', image: '' },
    { id: 'c2', user_id: 'me', from_staff: true, author_name: 'צוות האתר', body: 'הנה <b>תשובה</b>', created_at: at(50), read_by_staff: true, read_by_user: true, topic: '', reply_to: 'c1', edited_at: at(40), react_user: '', react_staff: '', image: 'data:image/png;base64,iVBORw0KGgo=' },
    { id: 'c3', user_id: 'me', from_staff: true, author_name: 'צוות האתר', body: 'תמונה זדונית', created_at: at(45), read_by_staff: true, read_by_user: true, topic: '', reply_to: null, edited_at: null, react_user: '', react_staff: '', image: 'data:image/svg+xml;base64,PHN2Zz4=' },
  ];
  await page.evaluate((M) => { sb = __stub({ support_messages: M }); authUser = { id: 'me', email: 'x@y.z' }; openChat(); }, M);
  await page.waitForTimeout(500);
  const u = await page.evaluate(() => ({ rows: document.querySelectorAll('#chatBox [data-mid]').length, quote: document.querySelector('#m43-c2 .q43') && document.querySelector('#m43-c2 .q43').textContent,
    img: document.querySelectorAll('#chatBox .img43').length, html: !!document.querySelector('#chatBox b:not(.supwho):not(.q43 b)'), edited: !!document.querySelector('#m43-c2 .ed43'), re: document.querySelector('#m43-c1 .re43 svg[data-n="thumbs-up"]') ? '👍' : (document.querySelector('#m43-c1 .re43') || {}).textContent,
    editMine: !!document.querySelector('#m43-c1 [data-c43="edit"]'), editStaff: !!document.querySelector('#m43-c2 [data-c43="edit"]'), pic: !!document.querySelector('[data-c43="pic"]') }));
  assert(u.rows === 3, 'הודעות: ' + u.rows);
  assert(u.quote && u.quote.includes('שלום, שאלה'), 'אין ציטוט של ההודעה שעליה ענו');
  assert(u.img === 1, 'רק תמונה תקינה (לא SVG) מוצגת: ' + u.img);
  assert(!u.html, 'HTML בהודעה לא אמור להיות מפוענח');
  assert(u.edited && u.re === '👍', 'חסר "נערכה" או האימוג׳י');
  assert(u.editMine && !u.editStaff, 'לקוח עורך רק את ההודעות שלו');
  assert(!u.pic, 'ללקוח אין כפתור תמונה');
  await page.click('#m43-c2 [data-c43="reply"]');
  assert((await page.textContent('#chatBar43')).includes('תגובה ל'), 'אין פס "תגובה ל"');
  await page.click('#m43-c2 [data-c43="react"]');
  assert(await page.evaluate(() => document.querySelectorAll('#m43-c2 .pick43 button').length === 8), 'אין בחירת אימוג׳י');
  await page.click('#m43-c1 [data-c43="edit"]');
  assert((await page.inputValue('#chatText')) === 'שלום, שאלה', 'העריכה לא ממלאת את ההודעה');
  await page.evaluate((M) => { authUser = { id: 'adm', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openAdminChat161('me'); }, M);
  await page.waitForTimeout(600);
  const a = await page.evaluate(() => ({ pic: !!document.querySelector('#adm161 [data-c43="pic"]'), editStaff: !!document.querySelector('#m43-c2 [data-c43="edit"]'), editUser: !!document.querySelector('#m43-c1 [data-c43="edit"]') }));
  assert(a.pic, 'למנהל יש כפתור תמונה');
  assert(a.editStaff && !a.editUser, 'המנהל עורך רק את הודעות הצוות');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🤝 קהילה: לוח הצעות עם "גם אני רוצה" וסטטוסים, טיפים באישור, מבצעים שמצאתי, שגרירים ותגים, ו"מחיר שגוי" עם טיפול המנהל', async () => {
  const { ctx, page, errors } = await newPage();
  const B = [{ e: '🎖️', l: 'שגריר' }];
  const D = {
    'rpc:suggestions_list': [
      { id: 's1', title: 'הדפסת הרשימה לפי מחלקות', body: 'שיהיה קל בסופר', status: 'working', reply: 'עובדים על זה 🙂', pinned: true, hidden: false, votes: 12, extra_votes: 0, my_vote: true, is_mine: false, author: 'משה', badges: B, created_at: '2026-10-20T09:00:00Z', status_at: '2026-10-21T09:00:00Z' },
      { id: 's2', title: 'מצב כהה אוטומטי בלילה', body: '', status: 'new', reply: '', pinned: false, hidden: false, votes: 3, extra_votes: 0, my_vote: false, is_mine: true, author: 'בודק', badges: [], created_at: '2026-10-22T08:00:00Z' },
      { id: 's3', title: 'תזכורת לפני חגים', body: '', status: 'done', reply: '', pinned: false, hidden: false, votes: 30, extra_votes: 0, my_vote: false, is_mine: false, author: 'רחל', badges: [{ e: '🏅', l: 'מדווח מצטיין' }], created_at: '2026-10-01T08:00:00Z' }],
    'rpc:suggestion_vote': 4,
    'rpc:tips_list': [
      { id: 't1', body: 'ביום חמישי בערב יש הנחות על לחמים ועוגות', category: 'קניות', status: 'approved', pinned: true, likes: 9, my_like: false, is_mine: false, author: 'יעקב', badges: B, created_at: '2026-10-19T09:00:00Z' },
      { id: 't2', body: 'לבדוק מחיר לק"ג ולא רק מחיר לאריזה', category: 'מבצעים', status: 'pending', pinned: false, likes: 0, my_like: false, is_mine: true, author: 'בודק', badges: [], created_at: '2026-10-22T09:00:00Z' }],
    'rpc:deals_found': [
      { id: 'd1', chain: 'רמי לוי', branch: 'בני ברק', title: 'חלב תנובה 1+1', body: 'רק בקרטון 1 ליטר', ends_at: '2026-10-30T21:59:00Z', has_image: false, author: 'שרה', badges: B, by_store: false, ok: 5, gone: 0, last_ok: '2026-10-22T07:00:00Z', my_vote: 0, is_mine: false, created_at: '2026-10-21T09:00:00Z' },
      { id: 'd2', chain: 'יש חסד', branch: '', title: 'עוף טרי 19.90 לק"ג', body: '', ends_at: null, has_image: false, author: 'מנהל הסניף', badges: [], by_store: true, ok: 0, gone: 3, my_vote: 0, is_mine: false, created_at: '2026-10-15T09:00:00Z' }],
    'rpc:deal_vote': { ok: 6, gone: 0, mine: 1 },
    'rpc:community_ambassadors': [{ rank: 1, name: 'משה', joined: 7, badges: B, is_amb: true, is_me: false }, { rank: 2, name: 'בודק', joined: 2, badges: [], is_amb: false, is_me: true }],
    'rpc:amb_min': 3, 'rpc:my_badges': [],
    'rpc:admin_badges': [{ id: 'b1', user_id: 'u1', name: 'רחל', email: 'r@x.com', kind: 'custom', emoji: '🏅', label: 'מדווח מצטיין', note: '', hidden: false, auto: false, joined: 0 },
      { id: null, user_id: 'u2', name: 'משה', email: 'm@x.com', kind: 'amb', emoji: '🎖️', label: 'שגריר', note: '', hidden: false, auto: true, joined: 7 }],
    'rpc:admin_user_list': [{ id: 'u1', name: 'רחל', email: 'r@x.com' }],
    'rpc:staff_flagged_prices': [{ id: 'p1', product: 'במבה', chain: 'רמי לוי', branch: 'בני ברק', price: 9.9, currency: 'ILS', confirms: 1, wrong: 2, by_name: 'דוד', created_at: '2026-10-20T09:00:00Z',
      reports: [{ name: 'שרה', price: 5.5, note: 'במבצע עכשיו', at: '2026-10-22T08:00:00Z' }, { name: 'יוסי', price: null, note: '', at: '2026-10-21T08:00:00Z' }] }],
    'rpc:staff_price_fix': 'ok', 'rpc:price_wrong_report': { ok: 0, wrong: 1, mine: -1 } };
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'x@y.z' }; openCommunity44(); }, D);
  await page.waitForTimeout(400);
  let r = await page.evaluate(() => { const b = document.querySelector('#v8SheetBody');
    return { tabs: b.querySelectorAll('[data-t44]').length, cards: b.querySelectorAll('[data-sid44]').length, pin: !!b.querySelector('.c44.pin'), st: b.textContent.includes('בעבודה'), reply: b.textContent.includes('עובדים על זה'), badge: b.textContent.includes('שגריר'), staffSel: !!b.querySelector('[data-sst44]'), editMine: !!b.querySelector('[data-sedit44="s2"]'), editOther: !!b.querySelector('[data-sedit44="s1"]') }; });
  assert(r.tabs === 4 && r.cards === 3 && r.pin && r.st && r.reply && r.badge, 'לוח הצעות: ' + JSON.stringify(r));
  assert(!r.staffSel && r.editMine && !r.editOther, 'משתמש רגיל: רק עריכה של ההצעה שלו, בלי סטטוס: ' + JSON.stringify(r));
  await page.click('[data-svote44="s2"]'); await page.waitForTimeout(200);
  r = await page.evaluate(() => document.querySelector('[data-svote44="s2"]').textContent);
  assert(r.includes('4') && (await page.$eval('[data-svote44="s2"]', (b) => b.classList.contains('on'))), 'גם אני רוצה: ' + r);
  await page.click('[data-sf44f="done"]'); await page.waitForTimeout(100);
  assert(await page.evaluate(() => document.querySelectorAll('[data-sid44]').length === 1), 'סינון לפי סטטוס');
  await page.click('[data-t44="tips"]'); await page.waitForTimeout(300);
  r = await page.evaluate(() => { const b = document.querySelector('#v8SheetBody'); return { cards: b.querySelectorAll('[data-tid44]').length, pend: b.textContent.includes('ממתין לאישור'), ok: !!b.querySelector('[data-tok44]') }; });
  assert(r.cards === 2 && r.pend && !r.ok, 'טיפים: ' + JSON.stringify(r));
  await page.click('[data-t44="deals"]'); await page.waitForTimeout(300);
  r = await page.evaluate(() => { const b = document.querySelector('#v8SheetBody'); return { cards: b.querySelectorAll('[data-did44]').length, doubt: b.textContent.includes('כנראה נגמר'), ok: b.textContent.includes('אישרו שעדיין בתוקף') }; });
  assert(r.cards === 2 && r.doubt && r.ok, 'מבצעים: ' + JSON.stringify(r));
  await page.click('[data-dvote44="d1|1"]'); await page.waitForTimeout(200);
  assert(await page.evaluate(() => document.querySelector('[data-dvote44="d1|1"]').textContent.includes('6')), 'עדיין בתוקף לא נספר');
  await page.click('[data-t44="amb"]'); await page.waitForTimeout(300);
  r = await page.evaluate(() => { const b = document.querySelector('#v8SheetBody'); return { rows: b.querySelectorAll('.rk44').length, admin: !!b.querySelector('[data-bdsave44]') }; });
  assert(r.rows === 2 && !r.admin, 'שגרירים: ' + JSON.stringify(r));
  // ❌ "לא נכון" על מחיר → חלון "מה המחיר הנכון?"
  await page.evaluate(() => { closeSheet(); document.body.insertAdjacentHTML('beforeend', '<div class="grp" id="tg44"><h3>🏷️ במבה — הכי זול</h3><div class="price-row" data-pid="p1"><span class="pr-chain">רמי לוי</span><span class="pr-amt">₪9.90</span><button data-vote="p1|-1">❌ <b>1</b></button></div></div>'); });
  await page.click('#tg44 [data-vote="p1|-1"]'); await page.waitForTimeout(700);
  r = await page.evaluate(() => ({ open: document.querySelector('#v8Sheet').classList.contains('open'), inp: !!document.querySelector('#wp44p'), txt: document.querySelector('#v8SheetBody').textContent.includes('במבה') }));
  assert(r.open && r.inp && r.txt, 'חלון מחיר שגוי: ' + JSON.stringify(r));
  await page.fill('#wp44p', '5.5'); await page.click('#wp44go'); await page.waitForTimeout(200);
  assert(await page.evaluate(() => !document.querySelector('#v8Sheet').classList.contains('open')), 'הדיווח לא נשלח');
  await page.evaluate(() => document.querySelector('#tg44').remove());
  // מנהל: סטטוסים, עריכה, אישור טיפ, ניהול תגים, ומחירים שגויים — באתר ובבק אופיס
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openCommunity44('sugg'); }, D);
  await page.waitForTimeout(400);
  r = await page.evaluate(() => { const b = document.querySelector('#v8SheetBody'); return { tabs: b.querySelectorAll('[data-t44]').length, sel: b.querySelectorAll('[data-sst44]').length, edit: b.querySelectorAll('[data-sedit44]').length }; });
  assert(r.tabs === 5 && r.sel === 3 && r.edit === 3, 'מנהל בלוח ההצעות: ' + JSON.stringify(r));
  await page.click('[data-sedit44="s1"]'); await page.waitForTimeout(100);
  assert(await page.evaluate(() => !!document.querySelector('[data-sf44="s1"] [data-f=status]') && !!document.querySelector('[data-sf44="s1"] [data-f=reply]')), 'עריכת מנהל: אין סטטוס/תגובה');
  await page.click('[data-t44="tips"]'); await page.waitForTimeout(300);
  assert(await page.evaluate(() => !!document.querySelector('[data-tok44="t2"]')), 'אין כפתור אישור טיפ למנהל');
  await page.click('[data-t44="amb"]'); await page.waitForTimeout(400);
  r = await page.evaluate(() => { const b = document.querySelector('#v8SheetBody'); return { save: !!b.querySelector('[data-bdsave44]'), list: b.querySelectorAll('[data-bdedit44]').length, min: !!b.querySelector('#amb44min'), auto: b.textContent.includes('אוטומטי') }; });
  assert(r.save && r.list === 2 && r.min && r.auto, 'ניהול תגים: ' + JSON.stringify(r));
  await page.click('[data-t44="flags"]'); await page.waitForTimeout(300);
  r = await page.evaluate(() => { const b = document.querySelector('#v8SheetBody'); return { rep: b.querySelectorAll('.pf44 .rep').length, upd: !!b.querySelector('[data-pfp44="5.5"]') }; });
  assert(r.rep === 2 && r.upd, 'מחירים שגויים בלוח: ' + JSON.stringify(r));
  await page.click('[data-pfp44="5.5"]'); await page.waitForTimeout(200);
  assert(await page.evaluate(() => !document.querySelector('#v8SheetBody [data-pfid44]')), 'העדכון לא סגר את הדיווח');
  await page.evaluate(() => { closeSheet(); openBO('prices'); }); await page.waitForTimeout(600);
  assert(await page.evaluate(() => !!document.querySelector('#bo44flags [data-pfx44="correct"]')), 'אין מחירים שגויים בראש לשונית המחירים בבק אופיס');
  await page.evaluate(() => boShow('community')); await page.waitForTimeout(500);
  assert(await page.evaluate(() => document.querySelectorAll('#boMain [data-sid44]').length === 3), 'אין לוח קהילה בבק אופיס');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🎨 ערכות צבע (2.0): כחול כהה לכולם, השאר רק לפרו; "לילה" מדליק מצב כהה, והבחירה נשמרת אחרי רענון', async () => {
  const { ctx, page, errors } = await newPage();
  // בעיצוב 2.0 הערכות נבחרות ב"צבע הלוגו" בראש ההגדרות; החלון עצמו נשאר
  await page.evaluate(() => openTheme36());
  assert(await page.locator('.th36').count() === 5, 'אין 5 ערכות בחלון');
  assert(await page.locator('.th36.lock').count() === 4, 'למי שאינו פרו ארבע ערכות לא נעולות');
  await page.click('.th36[data-th="mint"]');
  assert(await page.evaluate(() => !document.body.classList.contains('th-mint')), 'ערכת פרו נפתחה למי שאינו פרו');
  await page.evaluate(() => { window.pro2.__test({ pro: true }); openTheme36(); });
  await page.click('.th36[data-th="mint"]');
  const hdr = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--hdr').trim());
  assert(hdr === '#1b7d65', 'צבע הערכה לא השתנה: ' + hdr);
  await page.click('.th36[data-th="night"]');
  assert(await page.evaluate(() => document.body.classList.contains('th-night') && document.body.classList.contains('dark') && state.dark), 'לילה לא הדליק מצב כהה');
  await page.click('.th36[data-th="sea"]');
  assert(await page.evaluate(() => !document.body.classList.contains('dark') && ![...document.body.classList].some((c) => c.startsWith('th-'))), 'החזרה לכחול כהה לא ניקתה');
  await page.click('.th36[data-th="sky"]');
  await page.reload(); await page.waitForTimeout(1500);
  assert(await page.evaluate(() => !document.body.classList.contains('th-sky')), 'ערכת פרו הוצגה בלי פרו');
  assert(await page.evaluate(() => { window.pro2.__test({ pro: true }); return document.body.classList.contains('th-sky'); }), 'הבחירה לא נשמרה אחרי רענון');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🗑️ מחיקת מוצר מהרשימה: במחשב ✕ שמופיע במעבר עכבר, בטלפון בלחיצה על המוצר ← מחיקה (עיצוב 2.0)', async () => {
  for (const viewport of [{ width: 1920, height: 1000 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await newPage({ viewport });
    await page.evaluate(() => ['חלב טרה', 'לחם', 'ביצים'].forEach((n) => addItem(n)));
    await page.evaluate(() => { document.querySelectorAll('#v8Sheet.open').forEach((x) => x.classList.remove('open')); });
    const id = await page.evaluate(() => state.lists.find((l) => l.id === state.active).items.find((i) => i.n === 'חלב טרה').id);
    if (viewport.width > 1000) { await page.hover('#paneList [data-edititem="' + id + '"]'); await page.click('#paneList [data-delitem="' + id + '"]'); }
    else { await page.click('#paneList [data-edititem="' + id + '"]'); await page.locator('#v8Sheet.open button', { hasText: 'מחיקה' }).click(); }
    assert(await page.evaluate(() => !state.lists.find((l) => l.id === state.active).items.some((i) => i.n === 'חלב טרה')), viewport.width + ': המוצר לא נמחק');
    assert(!errors.length, errors.join(' | '));
    await ctx.close();
  }
});

await test('↕️ גרירה לשינוי סדר המוצרים (עכבר + מקלדת), הסדר נשמר גם אחרי סנכרון; תמונה למוצר מהגלריה; הערה מוצגת', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate(() => ['חלב טרה', 'לחם', 'ביצים', 'גבינה', 'עגבניות'].forEach((n) => addItem(n)));
  const order = () => page.evaluate(() => curList().items.map((i) => i.n).join(','));
  const h = await page.locator('[data-ixdrag]').nth(4).boundingBox(), t = await page.locator('[data-ixdrag]').nth(2).boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2, t.y + 4, { steps: 10 }); await page.mouse.up();
  assert(await order() === 'חלב טרה,לחם,עגבניות,ביצים,גבינה', 'גרירה: ' + await order());
  await page.locator('[data-ixdrag]').nth(2).focus(); await page.keyboard.press('ArrowUp');
  assert(await order() === 'חלב טרה,עגבניות,לחם,ביצים,גבינה', 'מקלדת: ' + await order());
  // סנכרון: הסדר נשמר גם כשהרשימה מתמזגת עם עותק מהענן
  const merged = await page.evaluate(() => { const l = curList(); const remote = JSON.parse(JSON.stringify(l)); remote.items.reverse(); return mergeLists(state.lists, [remote], null).find((x) => x.id === l.id).items.map((i) => i.n).join(','); });
  assert(merged === 'חלב טרה,עגבניות,לחם,ביצים,גבינה', 'אחרי סנכרון: ' + merged);
  // תמונה: מוקטנת ונשמרת במוצר, מוצגת ברשימה במקום האימוג'י
  const id = await page.evaluate(() => curList().items[0].id);
  await page.evaluate((i) => openItemEdit(i), id);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==', 'base64');
  await page.setInputFiles('#ixFile', { name: 'p.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(500);
  await page.fill('#ieNote', 'רק בקבוק זכוכית'); await page.click('#ieSave');
  const r = await page.evaluate((i) => ({ img: (curList().items.find((x) => x.id === i).img || '').slice(0, 23), thumb: !!document.querySelector('#paneList [data-ixphoto="' + i + '"] img'), note: document.querySelector('#paneList').textContent.includes('רק בקבוק זכוכית') }), id);
  assert(r.img === 'data:image/jpeg;base64,' && r.thumb, 'תמונה לא נשמרה/לא מוצגת');
  assert(r.note, 'ההערה לא מוצגת');
  // תמונה מזויפת מהענן לא נכנסת
  assert(await page.evaluate(() => cleanItem({ n: 'x', img: 'javascript:alert(1)' }).img === undefined), 'img לא נוקה');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('ברקוד בשורת ההוספה + כל מוצר בקטגוריה הנכונה (ותיקון שנזכר)', async () => {
  const { ctx, page, errors } = await newPage();
  assert(await page.locator('#inputRow #btnScan45').isVisible(), 'אין כפתור 📷 בשורת ההוספה');
  const r = await page.evaluate(async () => {
    const o = {};
    o.alias = resolveCat('עגבניה');
    // מוצר מהמאגר עם קטגוריה שהמנהל קבע — גובר על הניחוש המובנה
    dbProducts = [{ name: 'גבינה', brand: '', category: 'שימורים', barcode: null, emoji: '' }, { name: 'שוקו', brand: 'יטבתה', category: 'שתייה', barcode: '7290000000017', emoji: '' }];
    curList().items = []; addItem('שוקו', ''); addItem('שוקו יטבתה', '');
    await loadDbProducts.call(null).catch(() => {});
    dbProducts = [{ name: 'גבינה', brand: '', category: 'שימורים', barcode: null, emoji: '' }, { name: 'שוקו', brand: 'יטבתה', category: 'שתייה', barcode: '7290000000017', emoji: '' }];
    dbProducts.forEach((p) => { const full = p.brand ? p.name + ' ' + p.brand : p.name; if (P[full]) P[full].c = p.category; });
    o.full = resolveCat('שוקו יטבתה');
    // תיקון ידני של המשתמש נשמר ונזכר
    const it = curList().items.find((i) => i.n === 'שוקו');
    openItemEdit(it.id); document.querySelector('#ieCat').value = 'מאפים וחטיפים'; document.querySelector('#ieSave').click();
    await new Promise((res) => setTimeout(res, 50));
    o.cm = curList().items.find((i) => i.n === 'שוקו').cm; o.mine = resolveCat('שוקו');
    curList().items = []; addItem('שוקו', ''); o.again = curList().items[0].c;
    // מוצר עם קטגוריה שלא קיימת עדיין מופיע ב"אחר" ולא נעלם
    state.group = true; curList().items = [{ id: 'x1', n: 'משהו', q: '', c: 'לא-קיים', e: '🛒', done: false, ts: 1 }]; render();
    o.shown = !!document.querySelector('#paneList .grp');
    state.group = false; curList().items = []; render();
    return o;
  });
  assert(r.alias === 'ירקות', 'עגבניה: ' + r.alias);
  assert(r.full === 'שתייה', 'שוקו יטבתה: ' + r.full);
  assert(r.cm === 1 && r.mine === 'מאפים וחטיפים' && r.again === 'מאפים וחטיפים', 'תיקון לא נזכר: ' + JSON.stringify(r));
  assert(r.shown, 'מוצר בקטגוריה לא מוכרת נעלם מהרשימה המקובצת');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('רשימות מהקהילה: רשימת השבוע למעלה, דירוג בעגלות, הוספה לרשימה שלי, וניהול בבק אופיס', async () => {
  const { ctx, page, errors } = await newPage();
  const L = (id, title, avg, n, extra) => Object.assign({ id, title, emoji: '🕯️', category: 'שבת', description: '', items: [{ n: 'חלות', q: '5' }, { n: 'יין', q: '2' }, { n: 'דגים', q: '' }],
    status: null, featured: false, week: false, author: '', is_mine: false, n, avg, score: avg, adds: 3, mine: null, created_at: '2026-10-01', updated_at: null }, extra || {});
  const D = { 'rpc:shared_lists_feed': [L('00000000-0000-0000-0000-000000000001', 'שבת ל-8 נפשות', 4.5, 10, { week: true, featured: true }), L('00000000-0000-0000-0000-000000000002', 'קניות לחנוכה <b>x</b>', 3, 2, { category: 'חגים' })] };
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'x@y.z' }; }, D);
  const r = await page.evaluate(async () => {
    const before = state.lists.length;
    await openCl27(); const ov = document.getElementById('cl27');
    const first = ov.querySelector('.card27'); const out = { cards: ov.querySelectorAll('.card27').length, week: first.classList.contains('week27') && first.textContent.includes('רשימת השבוע'),
      xss: !ov.querySelector('.card27 b b'), carts: ov.querySelectorAll('.pick27 [data-rate27]').length };
    ov.querySelector('[data-cat27="חגים"]').click(); await new Promise((r) => setTimeout(r, 50)); out.filtered = ov.querySelectorAll('.ls27 .card27').length;
    ov.querySelector('[data-cat27=""]').click(); await new Promise((r) => setTimeout(r, 50));
    ov.querySelector('.card27 [data-rate27="4"]').click(); await new Promise((r) => setTimeout(r, 100));
    out.rated = !!document.querySelector('#cl27 .card27 .pick27 button.on');
    document.querySelector('#cl27 .card27 [data-add27]').click(); document.querySelector('#cl27 .card27 [data-addto27="new"]').click();
    out.closed = !document.getElementById('cl27'); out.newList = state.lists.length === before + 1 && curList().name === 'שבת ל-8 נפשות' && curList().items.map((i) => i.n + i.q).join(',') === 'חלות5,יין2,דגים';
    out.parse = JSON.stringify(textItems27('• חלות × 5\nיין*2\n\nחלות'));
    return out;
  });
  assert(r.cards >= 2 && r.week, 'רשימת השבוע לא מוצגת ראשונה');
  assert(r.xss, 'שם רשימה לא מוגן מקוד');
  assert(r.carts >= 5 && r.rated, 'דירוג בעגלות לא עובד');
  assert(r.filtered === 1, 'סינון לפי נושא: ' + r.filtered);
  assert(r.closed && r.newList, 'ההוספה לרשימה חדשה לא עבדה');
  assert(r.parse === '[{"n":"חלות","q":"5"},{"n":"יין","q":"2"}]', 'פענוח המוצרים: ' + r.parse);
  D['rpc:shared_lists_feed'].forEach((x) => { x.status = 'approved'; });
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('commlists'); }, D);
  await page.waitForTimeout(700);
  const bo = await page.evaluate(() => { const m = document.querySelector('#boMain'); m.querySelector('[data-new27]').click();
    return { txt: m.textContent, nav: !!document.querySelector('#boNav [data-s="commlists"]'), ed: !!m.querySelector('.x27new [data-f="items"]'), week: !!m.querySelector('[data-week27]') }; });
  assert(bo.nav && bo.txt.includes('רשימות מהקהילה') && bo.ed && bo.week, 'הבק אופיס של רשימות מהקהילה לא נפתח כמו שצריך');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('📅 מעקב תוקף · 🥇 הכשרים · 🎤 רשימה קולית · 🕯️ ערב שבת', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(() => {
    const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
    stockSet('חלב', 2); expSet45('חלב', iso(1)); expSet45('יוגורט', iso(-2));
    const soon = expSoon45().map((x) => x.k).join(',');
    openExpiry45(); const sheet = document.querySelector('#v8SheetBody').textContent;
    applyKash45({ prod: { 'חלב|תנובה': ['הרב לנדא'], 'חלב|טרה': 5 } }); meData().kosher = ['הרב לנדא'];
    const k = [kashOk45(kashOf45('חלב', 'תנובה')), kashOf45('חלב', 'טרה').length];
    const v = voiceItems45('חלב לחם ביצים 2 קילו עגבניות').map((i) => i.name + (i.qty ? '×' + i.qty : '')).join(',');
    const one = voiceItems45('סיימתי קנייה').length;
    openShb45(); const shb = document.querySelector('#v8SheetBody').textContent; document.querySelector('[data-shb45ck]').click();
    return { soon, sheet: sheet.includes('פג תוקף') && sheet.includes('פג מחר'), k, v, one, shb: shb.includes('לבדוק לפני שבת'), left: shbLeft45(), total: shbItems45().length };
  });
  assert(r.soon === 'יוגורט,חלב', 'תוקף: ' + r.soon);
  assert(r.sheet, 'חלון מעקב התוקף לא מציג פג / פג מחר');
  assert(r.k[0] === true && r.k[1] === 0, 'הכשרים: ' + JSON.stringify(r.k));
  assert(r.v === 'חלב,לחם,ביצים,עגבניות×2 קילו', 'רשימה קולית: ' + r.v);
  assert(r.one <= 1, 'פקודה קולית התפרקה לכמה מוצרים');
  assert(r.shb && r.left === r.total - 1, 'ערב שבת: ' + JSON.stringify(r));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

if (process.env.BARCODE_Y4M) {
  await test('סריקת ברקוד (מצלמה מדומה, בלי סורק מובנה)', async () => {
    const { ctx, page } = await newPage({ camera: true });
    await page.evaluate(() => { window._got = null; openBarcodeScanner((c) => { window._got = c; }); });
    let got = null; for (let i = 0; i < 24 && !got; i++) { await page.waitForTimeout(500); got = await page.evaluate(() => window._got); }
    assert(got === '7290000066318', 'נסרק: ' + got);
    await ctx.close();
  });
}

await test('📝 פירוק ותיקון: "אפונה וגזר" נשאר מוצר אחד, "חלב ולחם" מתפרק, חומץ לא הופך לחומוס; רשימה חסרה לא מפילה את האתר', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(() => ({
    pg: parseItems('אפונה וגזר').map((x) => x.name),
    ml: parseItems('חלב ולחם').map((x) => x.name),
    mix: parseItems('אפונה וגזר וחלב').map((x) => x.name),
    vin: parseItems('חומץ').map((x) => x.name),
    typo: parseItems('שועית').map((x) => x.name),
  }));
  assert(JSON.stringify(r.pg) === '["אפונה וגזר"]', 'אפונה וגזר: ' + JSON.stringify(r.pg));
  assert(r.ml.length === 2, 'חלב ולחם: ' + JSON.stringify(r.ml));
  assert(JSON.stringify(r.mix) === '["אפונה וגזר","חלב"]', 'אפונה וגזר וחלב: ' + JSON.stringify(r.mix));
  assert(JSON.stringify(r.vin) === '["חומץ"]', 'חומץ: ' + JSON.stringify(r.vin));
  assert(JSON.stringify(r.typo) === '["שעועית"]', 'שועית: ' + JSON.stringify(r.typo));
  await page.evaluate(() => { state.active = 'nope'; render(); state.lists = []; render(); });
  assert(await page.evaluate(() => state.lists.length === 1 && state.active === state.lists[0].id), 'לא נוצרה רשימה במקום החסרה');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🧺 השוואת סל מלא ומחיר ליחידה: תיבות בלשונית המחירים, מה חסר בכל חנות, ומחיר לק"ג/לליטר', async () => {
  const { ctx, page, errors } = await newPage();
  const P = (product, chain, price) => ({ product, product_key: product, chain, price, currency: 'ILS', status: 'approved', created_at: new Date().toISOString() });
  const D = { prices: [P('חלב 1.5 ליטר', 'רמי לוי', 9.5), P('חלב 1.5 ליטר', 'שופרסל', 10.2), P('אורז 500 גרם', 'רמי לוי', 8), P('אורז 500 גרם', 'שופרסל', 6)] };
  const sz = await page.evaluate(() => ['חלב 1 ליטר', 'אורז 500 גרם', 'מים 6×1.5 ל', 'שוקולד 100 ג׳', 'מלפפון'].map((n) => { const z = size18(n); return z ? Math.round(z.q * 1000) / 1000 + z.u : '-'; }));
  assert(sz.join(',') === '1l,0.5kg,9l,0.1kg,-', 'גודל מתוך שם המוצר: ' + sz);
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'x@y.z' }; curList().items = []; addItem('חלב 1.5 ליטר', ''); addItem('אורז 500 גרם', ''); render(); setTab('prices'); }, D);
  assert(await page.locator('#bk18 #bk18Go').isVisible(), 'אין כפתור השוואת סל בלשונית המחירים');
  await page.click('#up18 summary');
  const ins = page.locator('#up18Rows input');
  await ins.nth(0).fill('500'); await ins.nth(1).fill('6');
  await page.locator('#up18Rows select').nth(1).selectOption('kg'); await ins.nth(2).fill('1'); await ins.nth(3).fill('10');
  const res = await page.locator('#up18Res').innerText();
  assert(/אריזה 2/.test(res) && /17%/.test(res), 'המחשבון לא מצא את הזולה: ' + res);
  await page.click('#bk18Go'); await page.waitForTimeout(300);
  const bk = await page.locator('#basketBody').innerText();
  assert(/לליטר/.test(bk) && /לק"ג/.test(bk), 'אין מחיר ליחידה בהשוואת הסל: ' + bk);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🏪 השוואת רשימה בין כל הסניפים בארץ (מהשרת שלנו): לפי עיר וקרוב אליי', async () => {
  const asked = [];
  const priceApi = (r) => {
    const u = new URL(r.request().url());
    assert(u.origin === new URL(BASE).origin && u.pathname.startsWith('/api/prices/'), 'האתר צריך לפנות לשרת המחירים דרך הדומיין שלו (/api/prices/), לא ישירות: ' + u.href);
    const path = u.pathname.replace('/api/prices', ''); asked.push(path + '?' + u.searchParams.toString());
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(b) });
    if (path === '/cities') return json([{ city: 'בני ברק', stores: 12 }]);
    const line = (q, name, cost, regular, deal) => ({ q, qty: 1, found: true, code: '1', name, price: regular, cost, regular, deal });
    return json({ items: [{ q: 'חלב', qty: 1 }, { q: 'במבה', qty: 3 }], missing: [], stores: [
      { store: '1:1', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'בני ברק', address: 'השומר 4', city: 'בני ברק', km: 1.2, total: 16.5, regular: 18, found: 2,
        lines: [line('חלב', 'חלב תנובה 3%', 6.5, 6.5), line('במבה', 'במבה 80 גרם', 10, 11.5, { text: '3 ב-10' })] },
      { store: '2:2', chain: 'SHUFERSAL', chain_name: 'שופרסל', name: 'דיל', address: 'ז׳בוטינסקי 80', city: 'בני ברק', total: 19.2, regular: 19.2, found: 1,
        lines: [line('חלב', 'חלב תנובה 3%', 7.1, 7.1), { q: 'במבה', qty: 3, found: false }] }] });
  };
  const { ctx, page, errors } = await newPage({ priceApi });
  await ctx.grantPermissions(['geolocation']); await ctx.setGeolocation({ latitude: 32.0807, longitude: 34.8338 });
  await page.evaluate(() => { sb = __stub({}); authUser = { id: 'me', email: 'x@y.z' }; applyConfig('collector', { public: true }); curList().items = []; addItem('חלב', ''); addItem('במבה', '3'); state.me = Object.assign(state.me || {}, { address: { city: 'בני ברק' } }); render(); openBasket(); });
  await page.waitForSelector('#srvCmp .srvSt');
  const t = await page.locator('#srvCmp').innerText();
  assert(/רמי לוי/.test(t) && /שופרסל/.test(t) && /1 מתוך 2/.test(t), 'אין השוואה בין הסניפים: ' + t);
  assert(asked.some((q) => q.startsWith('/compare') && /city=%D7%91%D7%A0%D7%99/.test(q) && /items=%D7%97%D7%9C%D7%91%7C%D7%91%D7%9E%D7%91%D7%94\*3/.test(q)), 'הבקשה לשרת לא נכונה: ' + asked.join(' , '));
  await page.click('#srvNear'); await page.waitForTimeout(800);
  assert(asked.some((q) => q.startsWith('/compare') && /lat=32\.08/.test(q) && /lng=34\.83/.test(q)), 'קרוב אליי לא שלח מיקום: ' + asked.join(' , '));
  await page.locator('#srvCmp .srvSt summary').first().click();
  assert(/3 ב-10/.test(await page.locator('#srvCmp .srvSt').first().innerText()), 'המבצע לא מוצג בפירוט הסניף');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('✅ הכי זול לכל הרשימה: משווים רק מוצרים זהים שיש בכל החנויות', async () => {
  const line = (q, code, cost) => ({ q, qty: 1, found: true, code, name: q, price: cost, cost, regular: cost });
  const miss = (q) => ({ q, qty: 1, found: false });
  const st = (store, chain_name, lines) => ({ store, chain: chain_name, chain_name, name: 'בני ברק', city: 'בני ברק', total: lines.reduce((a, l) => a + (l.cost || 0), 0), regular: 0, found: lines.filter((l) => l.found).length, lines });
  const priceApi = (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ items: [{ q: 'חלב', qty: 1 }, { q: 'לחם', qty: 1 }, { q: 'ביצים', qty: 1 }, { q: 'קפה', qty: 1 }], missing: [], stores: [
    // "זול" רק כי אין לו ביצים וקפה — בהשוואה הישנה הוא נראה הכי זול
    st('1:1', 'רשת א', [line('חלב', '1', 6), line('לחם', '2', 8), line('ביצים', '3', 12), line('קפה', '4', 30)]),
    st('2:2', 'רשת ב', [line('חלב', '1', 5), line('לחם', '2', 7), line('ביצים', '3', 13), miss('קפה')]),
    st('3:3', 'רשת ג', [line('חלב', '1', 7), line('לחם', '9', 4), line('ביצים', '3', 11), line('קפה', '4', 28)])] }) });
  const { ctx, page, errors } = await newPage({ priceApi });
  await page.evaluate(() => { applyConfig('collector', { public: true }); curList().items = []; ['חלב', 'לחם', 'ביצים', 'קפה'].forEach((n) => addItem(n, '')); state.me = Object.assign(state.me || {}, { address: { city: 'בני ברק' } }); render(); openBasket(); });
  await page.waitForSelector('#srvCmp .fair18');
  const t = await page.locator('#srvCmp .fair18').innerText();
  assert(/הושוו 3 מתוך 4/.test(t), 'צריך להשוות חלב, לחם וביצים (קפה חסר ברשת ב): ' + t);
  assert(/הכי זול לכל הרשימה: רשת ב/.test(t), 'רשת ב הכי זולה על אותם 3 מוצרים (25 מול 26): ' + t);
  assert(!/רשת ג/.test(t), 'ברשת ג הלחם הוא מוצר אחר — לא משווים אותה על הלחם: ' + t);
  assert(/לא נכללו[^]*קפה/.test(t), 'צריך לכתוב מה לא נכלל: ' + t);
  if (process.env.SHOTS) await page.locator('#basketOverlay').screenshot({ path: process.env.SHOTS + '/fair-phone.png' });
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('💰 כפתור "איפה הכי זול" ברשימה — נפתח בלשונית החנויות, והמנהל קובע אם ועד מתי', async () => {
  const priceApi = (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ items: [{ q: 'חלב', qty: 1 }], missing: [], stores: [{ store: '1:1', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'בני ברק', city: 'בני ברק', total: 6.5, regular: 6.5, found: 1, lines: [{ q: 'חלב', qty: 1, found: true, name: 'חלב', cost: 6.5, regular: 6.5 }] }] }) });
  const { ctx, page, errors } = await newPage({ priceApi });
  await page.evaluate(() => { applyConfig('collector', { public: true }); curList().items = []; render(); });
  await page.evaluate(() => { addItem('חלב', ''); render(); });
  assert(await page.locator('#paneList .cheap14').isVisible(), 'אין כפתור "איפה הכי זול" ברשימה');
  await page.click('#paneList .cheap14');
  await page.waitForSelector('#paneStores.on .seg [data-sview="cmp"].on');
  assert(await page.locator('.tab[data-t="prices"].on').count(), 'הלשונית לא סומנה');
  await page.fill('#cmpQ', 'חלב'); await page.press('#cmpQ', 'Enter');
  await page.waitForSelector('#basketOverlay.open #srvCmp .srvSt');
  assert(/חלב/.test(await page.locator('#basketOverlay .phead b').innerText()), 'חיפוש מוצר מהלשונית');
  await page.click('#btnCloseBasket');
  await page.evaluate(() => { addItem('חלב', ''); setTab('list'); render(); });
  assert(!(await page.locator('#paneList .buybar [data-basket]').count()), 'כפתור כפול: גם בשורת ההתקדמות וגם בבאנר');
  const promo = await page.evaluate(() => { const has = () => { render(); return !!document.querySelector('#paneList .cheap14'); };
    applyConfig('collector', { public: true, promo_off: true }); const off = has();
    applyConfig('collector', { public: true, promo_until: '2020-01-01' }); const past = has();
    applyConfig('collector', { public: true, promo_until: '2999-01-01' }); const future = has();
    return { off, past, future }; });
  assert(!promo.off && !promo.past && promo.future, 'כיבוי / תאריך: ' + JSON.stringify(promo));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🏬 הסניפים שלי: חיפוש בסניף אחד (/prices?store=) והשוואה בין כמה סניפים (/compare?stores=) — מוצר אחד וכל הסל', async () => {
  const asked = [];
  const S = [{ store: '1:1', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'בני ברק', address: 'השומר 4', city: 'בני ברק' }, { store: '2:2', chain: 'SHUFERSAL', chain_name: 'שופרסל', name: 'דיל', address: 'ז׳בוטינסקי 80', city: 'בני ברק' }];
  const line = (q, cost) => ({ q, qty: 1, found: true, code: '1', name: q + ' טרי', price: cost, cost, regular: cost });
  const priceApi = (r) => { const u = new URL(r.request().url()); const p = u.pathname.replace('/api/prices', ''); asked.push(p + '?' + u.searchParams.toString());
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (p === '/chains') return json([{ chain: 'RAMI_LEVY', name: 'רמי לוי' }, { chain: 'SHUFERSAL', name: 'שופרסל' }]);
    if (p === '/stores') return json(S); if (p === '/cities') return json([{ city: 'בני ברק', stores: 2 }]);
    if (p === '/prices') return json({ store: S[0], items: [{ q: 'חלב', qty: 1, matches: [{ code: '1', name: 'חלב תנובה 3%', price: 6.2, cost: 6.2, regular: 6.2 }] }] });
    const items = u.searchParams.get('items').split('|').map((q) => ({ q, qty: 1 }));
    return json({ items, missing: [], stores: [Object.assign({}, S[0], { total: 6.2 * items.length, regular: 6.2 * items.length, found: items.length, lines: items.map((i) => line(i.q, 6.2)) }), Object.assign({}, S[1], { total: 7.1 * items.length, regular: 7.1 * items.length, found: items.length, lines: items.map((i) => line(i.q, 7.1)) })] }); };
  const { ctx, page, errors } = await newPage({ priceApi });
  await page.evaluate(() => { sb = __stub({}); authUser = { id: 'me', email: 'x@y.z' }; applyConfig('collector', { public: true }); state.srvPicks = []; curList().items = []; addItem('חלב', ''); addItem('לחם', ''); state.me = Object.assign(state.me || {}, { address: { city: 'בני ברק' } }); storesView = 'cmp'; setTab('stores'); });
  await page.click('#myStAdd'); await page.waitForSelector('#myStRes [data-mystadd="1:1"]');
  assert(asked.some((q) => q.startsWith('/stores') && /city=/.test(q)), 'לא חיפשנו סניפים בעיר: ' + asked.join(' , '));
  await page.click('[data-mystadd="1:1"]');
  await page.fill('#myStQ', 'חלב'); await page.press('#myStQ', 'Enter'); await page.waitForSelector('#myStOut .mystres1');
  assert(asked.some((q) => q.startsWith('/prices') && /store=1%3A1/.test(q) && /items=%D7%97%D7%9C%D7%91/.test(q)), 'חיפוש בסניף אחד: ' + asked.join(' , '));
  assert(/חלב תנובה 3%/.test(await page.locator('#myStOut').innerText()), 'תוצאת החיפוש בסניף');
  await page.click('[data-mystadd="2:2"]'); asked.length = 0;
  await page.click('#myStGo'); await page.waitForSelector('#myStOut .rkrow');
  assert(asked.some((q) => q.startsWith('/compare') && /stores=1%3A1%2C2%3A2/.test(q)), 'השוואת מוצר בין סניפים: ' + asked.join(' , '));
  await page.click('#myStList'); await page.waitForSelector('#myStOut .mysttab');
  const t = await page.locator('#myStOut').innerText();
  assert(/הכי זול: רמי לוי/.test(t) && /סה"כ/.test(t), 'השוואת סל בין הסניפים: ' + t);
  assert(await page.evaluate(() => state.srvPicks.length === 2), 'הסניפים לא נשמרו');
  // גם בחלון השוואת הסל — כפתור "הסניפים שלי"
  await page.evaluate(() => { openBasket(); }); await page.waitForSelector('#basketOverlay.open #srvMine'); asked.length = 0;
  await page.click('#basketOverlay #srvMine'); await page.waitForTimeout(500);
  assert(asked.some((q) => q.startsWith('/compare') && /stores=1%3A1%2C2%3A2/.test(q)), 'הסניפים שלי בחלון הסל');
  await page.click('#btnCloseBasket');
  // יאמי עונה על מחירים מהשרת — וכשהשרת כבוי למשתמשים, חוזרת לדיווחי הקהילה
  const say = (q) => page.evaluate(async (q) => { await botReply(q); return state.bot[state.bot.length - 1].txt; }, q);
  const a = await say('כמה עולה חלב?');
  assert(/בני ברק/.test(a) && /רמי לוי/.test(a) && /קבצי המחירים/.test(a), 'יאמי לא ענתה מהשרת: ' + a);
  const b = await say('כמה עולה חלב בשופרסל');
  assert(/שופרסל/.test(b) && !/רמי לוי/.test(b), 'יאמי לא סיננה לפי רשת: ' + b);
  const c = await say('כמה עולה 3 כפול 4');
  assert(!/קבצי המחירים/.test(c), 'המחשבון נתפס כשאלת מחיר: ' + c);
  await page.evaluate(() => { authUser = null; myRole = null; applyConfig('collector', { public: false }); });
  const d = await say('כמה עולה חלב?');
  assert(!/קבצי המחירים/.test(d), 'יאמי ענתה מהשרת כשהוא כבוי למשתמשים: ' + d);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🔒 מי שלא מחובר: 3 חיפושי מחירים לניסיון, ובחיפוש הרביעי מבקשים להירשם', async () => {
  const asked = [];
  const priceApi = (r) => { asked.push(r.request().url()); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ q: 'x', qty: 1 }], missing: [], stores: [{ store: '1:1', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'א', city: 'בני ברק', total: 6, regular: 6, found: 1, lines: [{ q: 'x', qty: 1, found: true, name: 'x', cost: 6, regular: 6 }] }] }) }); };
  const { ctx, page, errors } = await newPage({ priceApi });
  const res = await page.evaluate(async () => { authUser = null; myRole = null; applyConfig('collector', { public: true }); localStorage.removeItem('yam_srv_tries');
    const out = [];
    for (const q of ['חלב', 'לחם', 'חלב', 'ביצים', 'במבה']) { try { await priceApi('/compare', { items: q, city: 'בני ברק', limit: 40 }); out.push('ok'); } catch (e) { out.push(e.message); } }
    return out; });
  assert(res.slice(0, 4).every((x) => x === 'ok'), '3 חיפושים שונים (וחזרה על חיפוש קודם) צריכים לעבוד: ' + res.join(' | '));
  assert(/להירשם|הרשמה/.test(res[4]) && asked.length === 4, 'החיפוש הרביעי לא נחסם: ' + res.join(' | ') + ' · ' + asked.length);
  assert(await page.locator('#v8Sheet.open #srvSign').isVisible(), 'אין חלון הרשמה');
  await page.evaluate(() => { localStorage.setItem('yam_srv_tries', '["a"]'); document.querySelector('#v8Sheet').classList.remove('open'); curList().items = []; storesView = 'cmp'; setTab('stores'); });
  assert(/יש לך 3 חיפושים לניסיון \(נשארו 2\)/.test(await page.locator('#paneStores').innerText()), 'אין הודעה מראש על 3 החיפושים');
  // מחובר — בלי הגבלה
  const ok = await page.evaluate(async () => { authUser = { id: 'me', email: 'x@y.z' }; try { await priceApi('/compare', { items: 'סוכר', city: 'בני ברק' }); return true; } catch (e) { return e.message; } });
  assert(ok === true, 'משתמש מחובר נחסם: ' + ok);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🏪 חיפוש לפי רשת: "רק אושר עד" — מוצר אחד וכל הסל (chain=), ויאמי לא מושפעת', async () => {
  const asked = [];
  const priceApi = (r) => { const u = new URL(r.request().url()); const p = u.pathname.replace('/api/prices', ''); asked.push(p + '?' + u.searchParams.toString());
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (p === '/chains') return json([{ chain: 'OSHER_AD', name: 'אושר עד' }, { chain: 'RAMI_LEVY', name: 'רמי לוי' }]);
    if (p === '/cities') return json([]);
    const ch = u.searchParams.get('chain'); const items = u.searchParams.get('items').split('|').map((q) => ({ q, qty: 1 }));
    const all = [['OSHER_AD', 'אושר עד', 6], ['RAMI_LEVY', 'רמי לוי', 6.5]].filter((x) => !ch || x[0] === ch);
    return json({ items, missing: [], stores: all.map((x, i) => ({ store: i + ':1', chain: x[0], chain_name: x[1], name: 'בני ברק', city: 'בני ברק', total: x[2], regular: x[2], found: items.length, lines: items.map((it) => ({ q: it.q, qty: 1, found: true, name: it.q, cost: x[2], regular: x[2] })) })) }); };
  const { ctx, page, errors } = await newPage({ priceApi });
  await page.evaluate(() => { sb = __stub({}); authUser = { id: 'me', email: 'x@y.z' }; applyConfig('collector', { public: true }); state.srvChain = ''; curList().items = []; addItem('חלב', ''); state.me = Object.assign(state.me || {}, { address: { city: 'בני ברק' } }); storesView = 'cmp'; setTab('stores'); });
  await page.waitForSelector('#cmpChain option[value="OSHER_AD"]', { state: 'attached' });
  asked.length = 0; await page.selectOption('#cmpChain', 'OSHER_AD'); await page.waitForSelector('#cmpList #srvCmp .srvSt');
  assert(asked.some((q) => q.startsWith('/compare') && /chain=OSHER_AD/.test(q)), 'הסל לא חיפש רק ברשת: ' + asked.join(' , '));
  assert(!/רמי לוי/.test((await page.locator('#cmpList .srvSt').allInnerTexts()).join(' ')), 'הסל מראה רשת אחרת');
  await page.fill('#cmpQ', 'חלב'); asked.length = 0; await page.click('#cmpGo'); await page.waitForSelector('#basketOverlay.open #srvCmp .srvSt');
  assert(asked.some((q) => q.startsWith('/compare') && /chain=OSHER_AD/.test(q)), 'מוצר אחד לא חיפש רק ברשת');
  assert(/רק באושר עד/.test(await page.locator('#basketOverlay .phead').innerText()), 'הכותרת לא אומרת באיזו רשת');
  await page.click('#btnCloseBasket');
  asked.length = 0; await page.evaluate(async () => { await yamiSrvPrice('כמה עולה חלב'); });
  assert(asked.some((q) => q.startsWith('/compare')) && !asked.some((q) => /chain=/.test(q)), 'יאמי הושפעה מבחירת הרשת: ' + asked.join(' , '));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🧹 סידור: 💬 צ\'אט ושיתוף האתר בראש המסך (בלי כפילות בתפריט ⚙️), ושורת המוצרים המהירים בלי ✕ — לחיצה ארוכה לעריכה', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate(() => { state.stats = { 'חלב': 5, 'לחם': 4, 'ביצים': 3 }; state.hideFavs = false; state.favHidden = []; curList().items = []; setTab('list'); render(); });
  assert(await page.locator('#btnChat').isVisible() && await page.evaluate(() => document.querySelector('#btnChat').nextElementSibling === document.querySelector('#btnBell')), 'הצ\'אט לא בראש המסך ליד הפעמון');
  assert(await page.locator('#btnShareSite').isVisible(), '"שתפו אותי" לא מופיע ליד הפעמון');
  await page.click('#btnMenu');
  assert(!(await page.locator('#miShareSite').count()) && !(await page.locator('#miNotif').isVisible()), 'שיתוף / התראות עדיין כפולים בתפריט');
  assert(await page.evaluate(() => !!document.querySelector('#hMenu details[data-g="talk"] #miChatSite')), 'הצ\'אט לא נשאר ב"קשר עם האתר"');
  await page.evaluate(() => document.querySelector('#btnMenu').click()); // בעיצוב 2.0 ההגדרות הן עמוד מלא (סגירה בחץ חזרה)
  assert(!(await page.locator('#favs .favx').count()) && !(await page.locator('#favs .favhide').count()), 'יש ✕ בשורת המוצרים המהירים');
  const bb = await page.locator('#favs [data-fav="לחם"]').boundingBox();
  await page.mouse.move(bb.x + 5, bb.y + 5); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up(); await page.waitForTimeout(200);
  assert(await page.locator('#v8Sheet.open [data-favrm="לחם"]').count(), 'לחיצה ארוכה לא פתחה עריכה');
  assert(!(await page.evaluate(() => curList().items.length)), 'לחיצה ארוכה הוסיפה לרשימה');
  await page.click('#v8Sheet [data-favrm="לחם"]');
  assert(!(await page.locator('#favs [data-fav="לחם"]').count()), 'ההורדה מהשורה לא עבדה');
  await page.click('#v8Sheet [data-favback="לחם"]');
  assert(await page.locator('#favs [data-fav="לחם"]').count(), 'ההחזרה לשורה לא עבדה');
  await page.evaluate(() => document.querySelector('#v8Sheet').classList.remove('open'));
  await page.click('#favs [data-fav="חלב"]');
  assert(await page.evaluate(() => curList().items.some((i) => i.n === 'חלב')), 'לחיצה רגילה לא הוסיפה');
  // הודעה חדשה בצ'אט: המספר על 💬 בראש המסך
  await page.evaluate(() => { const b = document.querySelector('#chatBadge'); b.hidden = false; b.textContent = '2'; }); await page.waitForTimeout(100);
  assert(await page.locator('#chatBadge').isVisible(), 'אין סימון להודעה חדשה על 💬');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('👁️ בק אופיס שולט מה המשתמשים רואים: כבוי = רק מנהל רואה (מצב בדיקה), ורשת מוסתרת לא מוצגת', async () => {
  const asked = [];
  const priceApi = (r) => { asked.push(r.request().url()); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ items: [{ q: 'חלב', qty: 1 }], missing: [], stores: [
    { store: '1:1', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'א', city: 'בני ברק', total: 6, regular: 6, found: 1, lines: [] },
    { store: '2:2', chain: 'SHUFERSAL', chain_name: 'שופרסל', name: 'ב', city: 'בני ברק', total: 7, regular: 7, found: 1, lines: [] }] }) }); };
  const { ctx, page, errors } = await newPage({ priceApi, viewport: { width: 1366, height: 820 } });
  // משתמש רגיל, המתג כבוי (ברירת המחדל): לא רואה כלום חדש
  const user = await page.evaluate(() => { authUser = null; myRole = null; srvCfg = null; curList().items = []; addItem('חלב', ''); render(); return { card: !!document.querySelector('#paneList .cheap14'), btn: !!document.querySelector('#paneList .buybar [data-basket]') }; });
  assert(!user.card && !user.btn, 'משתמש רגיל רואה את ההשוואה כשהמתג כבוי: ' + JSON.stringify(user));
  // השרת לא עונה (עוד לא הותקן): הודעה ברורה בעברית ולא "Failed to fetch"
  const down = await page.evaluate(async () => { const f = window.fetch; window.fetch = () => Promise.reject(new TypeError('Failed to fetch')); try { await priceApi('/health'); return ''; } catch (e) { return e.message; } finally { window.fetch = f; } });
  assert(/שרת המחירים לא זמין/.test(down), 'הודעה כשהשרת לא עונה: ' + down);
  // מנהל, המתג כבוי: רואה, עם הודעת מצב בדיקה, ורשת מוסתרת לא מופיעה
  await page.evaluate(() => { sb = __stub({}); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; applyConfig('collector', { public: false, hidden: ['RAMI_LEVY'] }); state.me = Object.assign(state.me || {}, { address: { city: 'בני ברק' } }); render(); });
  await page.evaluate(() => { storesView = 'cmp'; setTab('stores'); });
  await page.waitForSelector('#cmpList #srvCmp .srvSt');
  const t = await page.locator('#srvCmp').innerText();
  assert(/מצב בדיקה/.test(t) && /שופרסל/.test(t) && !/רמי לוי/.test(t), 'מצב בדיקה / רשת מוסתרת: ' + t);
  assert(asked.some((u) => /exclude=RAMI_LEVY/.test(u)), 'לא ביקשנו מהשרת להסתיר את הרשת');
  // לשונית החנויות: "💰 איפה הכי זול" ראשון, ומוצר אחד בכל הסניפים
  await page.evaluate(() => { setTab('stores'); });
  await page.waitForSelector('#paneStores .seg [data-sview="cmp"].on');
  assert(await page.locator('#paneStores #cmpList #srvCmp').count(), 'אין השוואת כל הרשימה בלשונית החנויות');
  await page.fill('#cmpQ', 'חלב'); asked.length = 0; await page.click('#cmpGo');
  await page.waitForSelector('#basketOverlay.open #srvCmp .srvSt');
  assert(asked.some((u) => /\/compare/.test(u) && /items=%D7%97%D7%9C%D7%91(&|$)/.test(u)), 'חיפוש מוצר לא פנה לשרת: ' + asked.join(' , '));
  assert(/חלב/.test(await page.locator('#basketOverlay .phead b').innerText()), 'כותרת חיפוש המוצר');
  await page.click('#btnCloseBasket');
  await page.evaluate(() => setTab('list'));
  // הבק אופיס: מתג ראשי + עמודת "מוצג למשתמשים", ושמירה
  const saved = await page.evaluate(async () => {
    const base = __stub({ collector_status: [{ chain: 'SHUFERSAL', name: 'שופרסל', stores: 300, items: 9000, last_ok: new Date().toISOString(), error: '' }] });
    const cfgRow = { value: { public: false, hidden: ['RAMI_LEVY'], chains: {} } };
    sb = Object.assign({}, base, { from: (n) => n !== 'site_config' ? base.from(n) : { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: cfgRow, error: null }) }) }), upsert: (row) => { window.__saved = row; return Promise.resolve({ error: null }); } } });
    window.uiConfirm = async () => true; openBO('prices'); await new Promise((r) => setTimeout(r, 1200));
    const box = document.querySelector('#colCard');
    const rami = box.querySelector('tr[data-col="RAMI_LEVY"] [data-colshow]'), shu = box.querySelector('tr[data-col="SHUFERSAL"] [data-colshow]');
    const before = { pub: box.querySelector('#colPublic').checked, rami: rami.checked, shu: shu.checked };
    box.querySelector('#colPublic').checked = true; rami.checked = true; shu.checked = false;
    box.querySelector('[data-colseg="feed"]').checked = false; box.querySelector('[data-colseg="dir"]').checked = false;
    box.querySelector('#colPromoUntil').value = '2026-11-01';
    box.querySelector('#colSave').click(); await new Promise((r) => setTimeout(r, 300));
    return { before, v: window.__saved && window.__saved.value };
  });
  assert(!saved.before.pub && !saved.before.rami && saved.before.shu, 'הבק אופיס לא מציג את ההגדרה: ' + JSON.stringify(saved.before));
  assert(saved.v && saved.v.public === true && JSON.stringify(saved.v.hidden) === '["SHUFERSAL"]' && JSON.stringify(saved.v.stores_off) === '["feed","dir"]' && saved.v.promo_off === false && saved.v.promo_until === '2026-11-01', 'השמירה: ' + JSON.stringify(saved.v));
  // מה שהמנהל הסתיר לא מופיע בלשונית החנויות; ביגוד וחתונה נשאר
  const segs = await page.evaluate(() => { document.querySelector('#bo').classList.add('hidden'); applyConfig('collector', { public: true, stores_off: ['feed', 'dir'] }); setTab('stores'); return Array.from(document.querySelectorAll('#paneStores .seg [data-sview]')).map((b) => b.dataset.sview).join(','); });
  assert(segs === 'cmp,prices,branches,clothing', 'הכפתורים בלשונית החנויות: ' + segs);
  // לשונית אחת "מחירים וחנויות": מעבר בין דיווחי המחירים לחלקי החנויות בשורת כפתורים אחת; ♿ נשארת צפה (חובה)
  const mg = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.tabs .tab[data-t]')).filter((b) => !b.hidden).map((b) => b.dataset.t).join(','); // כפתור הקבלה (data-x) הוא פעולה, לא לשונית
    document.querySelector('#paneStores .seg [data-sview="prices"]').click();
    const onPrices = document.querySelector('#panePrices').classList.contains('on') && !!document.querySelector('#panePrices > .seg.mg [data-sview="prices"].on');
    const tabOn = document.querySelector('.tab[data-t="prices"]').classList.contains('on');
    document.querySelector('#panePrices > .seg.mg [data-sview="clothing"]').click();
    const onClothing = document.querySelector('#paneStores').classList.contains('on') && !!document.querySelector('#paneStores .seg [data-sview="clothing"].on');
    setTab('list'); document.querySelector('.tab[data-t="prices"]').click();
    const back = document.querySelector('#paneStores').classList.contains('on');
    return { tabs, onPrices, tabOn, onClothing, back, fab: !!document.querySelector('#a11yFab'), a11y: !!document.querySelector('.hbtn#a11yBtn') };
  });
  assert(mg.tabs === 'list,hist,home,prices' && mg.onPrices && mg.tabOn && mg.onClothing && mg.back && mg.fab && !mg.a11y, 'לשונית מחירים וחנויות: ' + JSON.stringify(mg));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('📑 שכפול רשימה (מהרשימות ומההיסטוריה) + 💬 שליחה בוואטסאפ כטקסט מסודר, במקום אחד', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(async () => {
    ['חלב', 'עגבניות', 'לחם'].forEach((n) => addItem(n, n === 'חלב' ? '2' : ''));
    curList().items.find((i) => i.n === 'לחם').done = true;
    document.querySelector('#btnShare').click();
    const wa = decodeURIComponent(document.querySelector('#shWa').href.split('text=')[1]);
    const inSend = !!document.querySelector('#shSend #shWa') && !!document.querySelector('#shSend #shCopy') && !document.querySelector('#shSend #shBackup');
    const lists0 = state.lists.length; const src = curList();
    window.uiPrompt = async () => ''; document.querySelector('#chips [data-dup]').click(); await new Promise((r) => setTimeout(r, 0));
    const copy = curList();
    state.history.unshift({ ts: Date.now(), listName: 'שבת', items: [{ n: 'יין', q: '', e: '🍷' }, { n: 'חלות', q: '2', e: '🍞' }] });
    setTab('hist'); renderHist(); document.querySelector('#paneHist [data-hdup="0"]').click(); await new Promise((r) => setTimeout(r, 0));
    const fromHist = curList();
    return { wa, inSend, lists: state.lists.length - lists0, copyName: copy.name, copyIds: copy.items.every((i) => !src.items.some((x) => x.id === i.id)), copyDone: copy.items.some((i) => i.done), copyN: copy.items.length, hist: fromHist.name + ':' + fromHist.items.map((i) => i.n + i.q).join(',') };
  });
  assert(r.inSend, 'כפתורי השליחה לא מקובצים יחד');
  assert(/\*/.test(r.wa) && r.wa.includes('חלב × 2') && r.wa.includes('כבר נקנה') && r.wa.includes('🥕'), 'טקסט וואטסאפ: ' + r.wa);
  assert(r.lists === 2 && r.copyName.includes('עותק') && r.copyIds && !r.copyDone && r.copyN === 3, 'שכפול: ' + JSON.stringify(r));
  assert(r.hist === 'שבת (עותק):יין,חלות2', 'מההיסטוריה: ' + r.hist);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

// מצב לא מקוון בחנות: בלי קליטה רואים, מסמנים ומוסיפים; כשהקליטה חוזרת — הכל נשלח ומתמזג עם מה שהמשפחה הוסיפה
const SHOTS = process.env.SHOTS_DIR || '';
const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); } };
await test('📴 מצב לא מקוון: בלי קליטה מסמנים ומוסיפים, וכשהקליטה חוזרת הכל נשלח ומתמזג', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate(() => {
    const l = curList(); l.name = 'סופר'; l.items = [];
    ['חלב', 'לחם', 'ביצים', 'עגבניות'].forEach((n) => addItem(n));
    window.__ups = [];
    const lid = l.id;
    /* בענן: בזמן שלא הייתה קליטה, מישהו מהמשפחה הוסיף "קפה" */
    window.__remote = { lists: [{ id: lid, name: 'סופר', created: l.created, items: JSON.parse(JSON.stringify(l.items)).concat([{ id: 'fam1', n: 'קפה', q: '', c: 'אחר', done: false, ts: Date.now() + 1000 }]) }] };
    const q = (res) => { const c = { select() { return c; }, eq() { return c; }, maybeSingle() { return Promise.resolve(res()); }, update(d) { window.__ups.push(d); return { eq: () => Promise.resolve({ error: null }) }; } }; return c; };
    sb = window.__stub({}); const from = sb.from; sb.from = (n) => n === 'rooms' ? q(() => ({ data: { data: window.__remote }, error: null })) : from(n);
    authUser = { id: 'me', email: 'x@y.z' }; state.user.id = 'me'; delete state.user.offline; state.room = 'R1'; cloudOn = true; setTab('list'); render();
  });
  await ctx.setOffline(true); await page.waitForTimeout(300);
  await page.evaluate(() => { const l = curList(); const i = l.items.find((x) => x.n === 'לחם'); i.done = true; i.ts = Date.now(); save(); render(); addItem('גבינה'); });
  await page.waitForTimeout(1000);
  const off = await page.evaluate(() => ({ ups: window.__ups.length, pend: offPending, bar: document.querySelector('#offBar').textContent, vis: getComputedStyle(document.querySelector('#offBar')).display !== 'none', has: curList().items.map((i) => i.n + (i.done ? '✓' : '')) }));
  assert(off.ups === 0, 'בלי קליטה ניסה לשלוח לענן');
  assert(off.pend >= 2 && off.vis && /אין (קליטה|אינטרנט)/.test(off.bar) && /יישלחו/.test(off.bar), 'הפס לא מראה שאין קליטה: ' + off.bar);
  assert(off.has.includes('לחם✓') && off.has.includes('גבינה'), 'הסימון/ההוספה בלי קליטה לא נשמרו: ' + off.has);
  assert(await page.evaluate(() => JSON.parse(localStorage.getItem('yamh_app_v1')).lists.some((l) => l.items.some((i) => i.n === 'גבינה'))), 'לא נשמר בטלפון');
  await shot(page, '1-בחנות-בלי-קליטה');
  await ctx.setOffline(false); await page.waitForTimeout(1800);
  const on = await page.evaluate(() => ({ ups: window.__ups.length, pend: offPending, bar: document.querySelector('#offBar').textContent, pushed: (window.__ups.at(-1) || { data: {} }).data.lists, has: curList().items.map((i) => i.n + (i.done ? '✓' : '')) }));
  assert(on.ups >= 1 && on.pend === 0, 'כשהקליטה חזרה לא נשלח לענן');
  const names = on.pushed[0].items.map((i) => i.n + (i.done ? '✓' : ''));
  assert(names.includes('לחם✓') && names.includes('גבינה') && names.includes('קפה'), 'המיזוג לא נכון: ' + names);
  assert(on.has.includes('קפה'), 'מה שהמשפחה הוסיפה לא הופיע');
  assert(/סונכרנה/.test(on.bar), 'אין הודעה שהרשימה סונכרנה: ' + on.bar);
  await shot(page, '2-הקליטה-חזרה-סונכרן');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('📴 נכנסים בלי קליטה ותוקף הכניסה צריך חידוש — לא מוציאים מהחשבון, הרשימה נפתחת', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' });
  await ctx.route(/supabase\.(co|js)/, (r) => r.abort());
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(STUB);
  await ctx.addInitScript(() => {
    localStorage.setItem('yam_tour165', '1');
    if (!localStorage.getItem('yamh_app_v1')) localStorage.setItem('yamh_app_v1', JSON.stringify({ user: { id: 'me', name: 'בודק', email: 'x@y.z' }, lists: [{ id: 'L1', name: 'סופר', created: 1, items: [{ id: 'a', n: 'חלב', q: '', c: 'מוצרי חלב', done: false, ts: 1 }] }], active: 'L1' }));
    window.supabase = { createClient: () => { const c = window.__stub({}); c.auth.getSession = () => Promise.resolve({ data: { session: null }, error: { message: 'Failed to fetch' } }); return c; } };
  });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE); await page.waitForTimeout(2500);
  const r = await page.evaluate(() => ({ login: document.querySelector('#login').classList.contains('open'), user: state.user && state.user.id, items: curList().items.map((i) => i.n) }));
  assert(!r.login, 'נפתח מסך כניסה במקום הרשימה');
  assert(r.user === 'me' && r.items.includes('חלב'), 'המשתמש או הרשימה נמחקו');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('📴 האתר עצמו נפתח בלי קליטה (רענון בחנות) — מהעותק השמור בטלפון', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate(() => { curList().items = []; addItem('שמן'); });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await page.waitForTimeout(1500);
  assert(await page.evaluate(() => !!navigator.serviceWorker.controller), 'ה-service worker לא פעיל');
  /* משתמש מחובר שתוקף הכניסה שלו נגמר — בלי קליטה אי אפשר לחדש אותו */
  await page.evaluate(() => { state.user = { id: 'me', name: 'בודק', email: 'x@y.z' }; _localSave(); });
  await ctx.setOffline(true);
  await page.reload(); await page.waitForTimeout(2500);
  const r = await page.evaluate(() => ({ login: document.querySelector('#login').classList.contains('open'), items: curList().items.map((i) => i.n), bar: document.querySelector('#offBar').textContent }));
  assert(r.items.includes('שמן'), 'הרשימה לא נפתחה בלי קליטה');
  assert(!r.login, 'בלי קליטה נפתח מסך כניסה במקום הרשימה');
  assert(/אין (קליטה|אינטרנט)/.test(r.bar), 'אין פס "אין קליטה"');
  await shot(page, '3-רענון-בלי-קליטה');
  await ctx.setOffline(false);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🕯️ זמני שבת לפי העיר שבאזור האישי (גם בכתיב אחר וגם מהכתובת למשלוח), ושמירת שפה לא דורסת את העיר', async () => {
  const { ctx, page, errors } = await newPage();
  const r = await page.evaluate(() => {
    const out = {};
    state.city = 'ירושלים'; state.me = { address: {}, stores: [], orders: [], providers: [], city: 'בני-ברק' };
    out.spelled = shabbatTimes(userCity()).city;
    state.me.city = 'ב"ב'; out.alias = userCity();
    state.me.city = ''; state.me.address = { city: 'בני ברק' }; out.addr = userCity();
    state.me = { address: {}, stores: [], orders: [], providers: [], city: 'ירושלים' };
    openMe('info'); document.getElementById('maCity').value = 'בני ברק'; document.getElementById('meSaveAddr').click();
    out.afterAddr = [state.me.city, state.city, zmanimLoc().name];
    openIntl(); document.getElementById('ilSave').click();
    out.afterIntl = state.me.city;
    return out;
  });
  assert(r.spelled === 'בני ברק', 'בני-ברק עם מקף הוצג כ-' + r.spelled);
  assert(r.alias === 'בני ברק', 'ב"ב לא זוהה: ' + r.alias);
  assert(r.addr === 'בני ברק', 'העיר בכתובת למשלוח לא נלקחה: ' + r.addr);
  assert(r.afterAddr.every((x) => x === 'בני ברק'), 'שמירת כתובת בבני ברק לא עדכנה את העיר: ' + r.afterAddr);
  assert(r.afterIntl === 'בני ברק', 'שמירת שפה ומטבע דרסה את העיר ל-' + r.afterIntl);
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🪟 "רשימה חדשה" ושאר השאלות נפתחים בחלון של האתר ולא בחלון של הדפדפן', async () => {
  // הקוד נמצא ב-index.html ובקבצים js/*.js
  const src = [fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g, '')]
    .concat(fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'))).join('\n');
  const left = (src.match(/[^.\w$](prompt|confirm|alert)\(/g) || []);
  assert(!left.length, 'נשארו חלונות דפדפן בקוד: ' + left.join(' '));
  const { ctx, page, errors } = await newPage();
  let native = 0; page.on('dialog', (d) => { native++; d.dismiss().catch(() => {}); });
  await page.click('#chips [data-new]');
  await page.waitForSelector('.uid30 input');
  await page.fill('.uid30 input', 'קניות לשבת'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  const r = await page.evaluate(() => ({ open: !!document.querySelector('.uid30'), name: curList().name }));
  assert(!native && !r.open && r.name === 'קניות לשבת', 'רשימה חדשה: ' + JSON.stringify({ native, ...r }));
  const c = await page.evaluate(async () => { const p = uiConfirm('למחוק?'); await new Promise((r) => setTimeout(r, 50)); document.querySelector('.uid30 .u30no').click(); return await p; });
  assert(c === false, 'ביטול לא החזיר "לא"');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🔎 כל חיפוש ב"איפה הכי זול" נספר, ובבק אופיס ← 💰 מחירים רואים כמה חיפשו ומה הכי מחפשים', async () => {
  const api = (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(new URL(r.request().url()).pathname.endsWith('/chains') ? [] : { items: [{ q: 'חלב', qty: 1 }], stores: [], missing: [] }) });
  const { ctx, page, errors } = await newPage({ priceApi: api });
  const D = { 'rpc:admin_price_search_stats': { total: 57, users: 9, guests: 14, single: 41, lists: 16, yami: 6, repeat: 7, modes: { city: 40, near: 10, mine: 7 },
    days: [{ day: '2026-10-25', n: 12, people: 6 }, { day: '2026-10-27', n: 20, people: 9 }], top: [{ q: 'חלב', n: 18, single: 11, people: 12 }, { q: 'במבה', n: 9, single: 4, people: 7 }],
    cities: [{ city: 'בני ברק', n: 30 }], recent: [{ at: '2026-10-27T09:00:00Z', name: '<b>משה</b>', guest: false, staff: false, mode: 'city', src: 'yami', city: 'בני ברק', items: ['חלב'], n: 1 }] } };
  const calls = await page.evaluate(async (D) => { window.__rpc = []; sb = __stub(D); const r0 = sb.rpc; sb.rpc = (n, a) => { window.__rpc.push([n, a]); return r0(n, a); };
    authUser = null; applyConfig('collector', { public: true });
    await priceApi('/compare', { items: 'חלב|במבה*3', city: 'בני ברק', limit: 40 });
    await priceApi('/compare', { items: 'חלב|במבה*3', city: 'בני ברק', limit: 40 }); // אותו חיפוש שוב מיד — לא נספר פעמיים
    authUser = { id: 'me', email: 'x@y.z' }; await priceApi('/prices', { store: '1:39', items: 'לחם' });
    await priceApi('/cities', { q: 'בני' });
    await yamiSrvPrice('כמה עולה במבה');
    await new Promise((r) => setTimeout(r, 50)); return window.__rpc.filter((x) => x[0] === 'price_search_log').map((x) => x[1]); }, D);
  assert(calls.length === 3 && calls[2].p_src === 'yami' && calls[2].p_items.join() === 'במבה' && calls[0].p_src === 'site', 'חיפוש דרך יאמי: ' + JSON.stringify(calls[2]));
  assert(calls.length === 3, 'מספר החיפושים שנספרו: ' + JSON.stringify(calls));
  assert(calls[0].p_items.join() === 'חלב,במבה' && calls[0].p_mode === 'city' && calls[0].p_city === 'בני ברק' && /^[0-9a-f-]{36}$/.test(calls[0].p_guest || ''), 'חיפוש של אורח: ' + JSON.stringify(calls[0]));
  assert(calls[1].p_mode === 'store' && calls[1].p_guest === null && calls[1].p_items.join() === 'לחם', 'חיפוש של משתמש רשום: ' + JSON.stringify(calls[1]));
  await page.evaluate(() => { authUser = { id: 'own', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('prices'); }); await page.waitForTimeout(700);
  const r = await page.evaluate(() => { const c = document.querySelector('#psCard'); return c && { tiles: c.querySelectorAll('.pstile').length, txt: c.textContent, bars: c.querySelectorAll('.psday').length, xss: !!c.querySelector('td b b') }; });
  assert(r && r.tiles === 5 && r.txt.includes('23') && r.txt.includes('חלב') && r.bars >= 3 && !r.xss, 'כרטיס הסטטיסטיקה בבק אופיס: ' + JSON.stringify(r));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🧾 קבלה מקישור + 📷 צילום ישיר + 🛍️ תמונות במצב קנייה', async () => {
  const { ctx, page, errors } = await newPage();
  const SHOTS = process.env.SHOTS;
  const r = await page.evaluate(async () => {
    const calls = [];
    sb = window.__stub({}); authUser = { id: 'tester', email: 't@example.com' };
    const RC = { store: 'אושר עד', branch: 'בני ברק', date: '2026-11-18', total: 11.8, items: [{ name: 'חלב 3%', brand: 'תנובה', qty: 2, price: 5.9, total: 11.8 }], check: { ok: true, passes: 1 } };
    sb.functions.invoke = (n, o) => { calls.push(o.body); if (o.body.receiptUrl) return Promise.resolve({ data: { fetched: { kind: 'text', text: 'אושר עד\nחלב 3% | 2 | 11.80\nסה"כ 11.80', host: 'receipts.example.co.il' } }, error: null });
      return Promise.resolve({ data: { receipt: JSON.parse(JSON.stringify(RC)) }, error: null }); };
    openUpload('receipt');
    const cam = document.querySelector('#upCam'), gal = document.querySelector('#upFiles');
    const res = { cap: cam && cam.getAttribute('capture'), camMulti: cam && cam.multiple, galMulti: gal && gal.multiple, link: !!document.querySelector('#upUrl') };
    document.querySelector('#upUrl').value = 'הקבלה שלך מאושר עד: https://receipts.example.co.il/r/abc123. תודה!';
    document.querySelector('#upUrlGo').click();
    for (let k = 0; k < 40 && !document.querySelector('#upOut .rctbl'); k++) await new Promise((r) => setTimeout(r, 100));
    res.url = calls[0] && calls[0].receiptUrl; res.read = calls[1] && calls[1].vision; res.txt = calls[1] && calls[1].text;
    res.rows = document.querySelectorAll('#upOut .rctbl tr[data-ur]').length;
    // שומרים — בפעם הבאה מאותו אתר שם החנות מתמלא לבד (גם כשהקריאה טעתה בשם)
    document.querySelector('#urStore').value = 'אושר עד'; document.querySelector('#urPub').checked = false; document.querySelector('#urStock').checked = false;
    await confirmUpload(); res.closed = !document.querySelector('#v8Sheet.open');
    RC.store = 'אושר-עד בעמ'; openUpload('receipt'); document.querySelector('#upUrl').value = 'https://receipts.example.co.il/r/zzz'; document.querySelector('#upUrlGo').click();
    for (let k = 0; k < 40 && !document.querySelector('#upOut .rctbl'); k++) await new Promise((r) => setTimeout(r, 100));
    res.store2 = document.querySelector('#urStore') && document.querySelector('#urStore').value;
    // אתר קבלות מוכר (Pairzon / Weezmo): השרת מחזיר קבלה מסודרת — ישר למסך האישור, בלי קריאה של הבינה המלאכותית
    closeSheet(); calls.length = 0;
    const known = sb.functions.invoke; sb.functions.invoke = (n, o) => { calls.push(o.body); return Promise.resolve({ data: { fetched: { kind: 'receipt', host: 'osher.pairzon.com', receipt: { store: 'אושר עד', branch: 'בת הדר', date: '2026-11-17', total: 24, items: [{ name: 'אגוז קלוף במשקל', qty: 0.2, unit: 'ק״ג', price: 70, total: 14, barcode: '' }, { name: 'חלב 3%', qty: 2, price: 5, total: 10, barcode: '7290004131074' }], check: { ok: true, passes: 1, verified: true } } } }, error: null }); };
    openUpload('receipt'); document.querySelector('#upUrl').value = 'https://osher.pairzon.com/x.html?id=1&p=2'; document.querySelector('#upUrlGo').click();
    for (let k = 0; k < 40 && !document.querySelector('#upOut .rctbl'); k++) await new Promise((r) => setTimeout(r, 100));
    res.knownCalls = calls.length; res.knownRows = document.querySelectorAll('#upOut .rctbl tr[data-ur]').length; res.knownStore = (document.querySelector('#urStore') || {}).value;
    sb.functions.invoke = known;
    // שיתוף הודעת SMS עם קישור לקבלה אל האפליקציה — נפתחת העלאת קבלה והקישור נקרא לבד
    closeSheet(); calls.length = 0;
    paste20('תודה שקנית באושר עד! לצפייה בקבלה:\nhttps://receipts.example.co.il/r/xyz');
    for (let k = 0; k < 40 && !document.querySelector('#upOut .rctbl'); k++) await new Promise((r) => setTimeout(r, 100));
    res.shared = calls[0] && calls[0].receiptUrl; res.sharedRows = document.querySelectorAll('#upOut .rctbl tr[data-ur]').length;
    // רשימה רגילה שיש בה גם קישור — עדיין נכנסת לרשימה
    closeSheet(); const before = curList().items.length; paste20('חלב\nלחם\nביצים\nמתכון: https://example.com/r');
    res.listAdded = curList().items.length - before;
    return res;
  });
  assert(r.cap === 'environment' && !r.camMulti && r.galMulti && r.link, 'כפתורים: ' + JSON.stringify(r));
  assert(r.url === 'https://receipts.example.co.il/r/abc123', 'הקישור: ' + r.url);
  assert(r.read === 'receipt' && /חלב/.test(r.txt || '') && r.rows === 1, 'קריאה מהקישור: ' + JSON.stringify(r));
  assert(r.shared === 'https://receipts.example.co.il/r/xyz' && r.sharedRows === 1, 'שיתוף מה-SMS: ' + JSON.stringify(r));
  assert(r.closed && r.store2 === 'אושר עד', 'שם החנות לפי האתר: ' + JSON.stringify(r));
  assert(r.knownCalls === 1 && r.knownRows === 2 && r.knownStore === 'אושר עד', 'קבלה מאתר מוכר: ' + JSON.stringify(r));
  assert(r.listAdded === 3, 'רשימה עם קישור: ' + r.listAdded);
  if (SHOTS) { await page.evaluate(() => { document.querySelector('#v8SheetBody').scrollTop = 0; }); await page.screenshot({ path: SHOTS + '/2-קבלה-נקראה-מהקישור.png' }); }
  if (SHOTS) { await page.evaluate(() => { closeSheet(); openUpload('receipt'); document.querySelector('#upUrl').value = 'https://receipts.example.co.il/r/abc123'; }); await page.waitForTimeout(300); await page.screenshot({ path: SHOTS + '/1-העלאת-קבלה-צילום-וקישור.png' }); }
  // מצב קנייה: תמונה ליד המוצר, לחיצה עליה מגדילה ולא מסמנת כנקנה
  const s = await page.evaluate(async () => {
    closeSheet();
    const c = document.createElement('canvas'); c.width = c.height = 80; const x = c.getContext('2d'); x.fillStyle = '#2a9d8f'; x.fillRect(0, 0, 80, 80); x.fillStyle = '#fff'; x.fillRect(20, 10, 40, 60);
    const l = curList(); l.items = [{ id: 'm1', n: 'חלב', q: '2', c: 'מוצרי חלב', e: '🥛', done: false, ts: Date.now(), img: c.toDataURL('image/jpeg', 0.9) }, { id: 'b1', n: 'לחם', q: '', c: 'לחמים', e: '🍞', done: false, ts: Date.now() }];
    save(); render(); openShop26();
    const th = document.querySelector('#shop26 [data-s26img="m1"]');
    const vis = th && getComputedStyle(th).display !== 'none' && th.getBoundingClientRect().width > 30;
    th.click(); await new Promise((r) => setTimeout(r, 200));
    return { vis, zoom: !!document.querySelector('#zv:not([hidden])'), done: curList().items[0].done, emoji: !document.querySelector('#shop26 [data-s26="b1"] [data-s26img]') };
  });
  assert(s.vis && s.zoom && !s.done && s.emoji, 'מצב קנייה: ' + JSON.stringify(s));
  if (SHOTS) { await page.screenshot({ path: SHOTS + '/4-מצב-קנייה-תמונה-מוגדלת.png' }); await page.evaluate(() => document.querySelector('#zv [data-zv="x"]').click()); await page.waitForTimeout(200); await page.screenshot({ path: SHOTS + '/3-מצב-קנייה-עם-תמונות.png' }); }
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('🧾 אחרי סריקת קבלה: איפה היה יותר זול — ליד החנות שקנית (לפי הסניף) וליד הבית, בלי לבזבז חיפושים של אורח', async () => {
  const asked = [];
  const S = [{ store: '1:1', chain: 'RAMI_LEVY', chain_name: 'רמי לוי', name: 'בני ברק', address: 'השומר 4', city: 'בני ברק', lat: 32.09, lng: 34.83 },
    { store: '2:2', chain: 'OSHER_AD', chain_name: 'אושר עד', name: 'בני ברק', address: 'ירושלים 50', city: 'בני ברק', lat: 32.08, lng: 34.84 }];
  const PR = { '1:1': { 'חלב': 6.2, 'ביצים': 13.9 }, '2:2': { 'חלב': 5.5, 'ביצים': 12.9 } };
  const priceApi = (r) => { const u = new URL(r.request().url()); const p = u.pathname.replace('/api/prices', ''); asked.push(p + '?' + u.searchParams.toString());
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (p === '/stores') return json([S[0]]);
    const items = u.searchParams.get('items').split('|').map((x) => { const m = x.match(/^(.*)\*(\d+)$/); return m ? { q: m[1], qty: +m[2] } : { q: x, qty: 1 }; });
    return json({ items, missing: [], stores: S.map((s) => { const lines = items.map((it) => { const k = Object.keys(PR[s.store]).find((n) => it.q.includes(n)); const v = k && PR[s.store][k];
      return v ? { q: it.q, qty: it.qty, found: true, code: '1', name: k, price: v, cost: v * it.qty, regular: v * it.qty } : { q: it.q, qty: it.qty, found: false }; });
      return Object.assign({}, s, { km: 0.5, found: lines.filter((l) => l.found).length, total: 0, regular: 0, lines }); }) }); };
  const { ctx, page, errors } = await newPage({ priceApi });
  await page.evaluate(() => { sb = __stub({}); authUser = { id: 'me', email: 'x@y.z' }; applyConfig('collector', { public: true }); state.history = []; state.me = Object.assign(state.me || {}, { address: { city: 'בני ברק' } }); });
  const R = { store: 'רמי לוי', branch: 'בני ברק', total: 28.3, items: [{ name: 'חלב תנובה', qty: 2, price: 6.9, total: 13.8, barcode: '7290000000001' }, { name: 'ביצים L', qty: 1, price: 14.5, total: 14.5 }] };
  await page.evaluate((r) => { r.date = dayKey(new Date()); openUpload('receipt'); upMode = 'receipt'; upResult = { receipt: r }; showUploadReview(); document.querySelector('#urPub').checked = false; document.querySelector('#upConfirm').click(); }, R);
  await page.waitForSelector('#basketOverlay.open .rcxbest', { timeout: 5000 });
  const t = await page.locator('#rcxRes').innerText();
  assert(/אושר עד/.test(t) && /חוסכים/.test(t), 'ההצעה הזולה: ' + t);
  assert(asked.some((q) => q.startsWith('/stores') && /q=/.test(q)) && asked.some((q) => q.startsWith('/compare') && /lat=/.test(q)), 'חיפוש הסניף שקנית בו: ' + asked.join(' , '));
  assert(asked.some((q) => q.startsWith('/compare') && /stores=/.test(q)), 'ברקוד שלא נמצא — חיפוש חוזר לפי השם: ' + asked.join(' , '));
  assert(await page.evaluate(() => state.history[0].branch === 'בני ברק'), 'הסניף לא נשמר בקנייה');
  asked.length = 0; await page.click('[data-rcx="home"]'); await page.waitForTimeout(400);
  assert(asked.some((q) => q.startsWith('/compare') && new URLSearchParams(q.split('?')[1]).get('city') === 'בני ברק'), 'ליד הבית: ' + asked.join(' , '));
  await page.click('#btnCloseBasket');
  await page.evaluate(() => openMe('purchases')); await page.waitForSelector('#meBody [data-purcheap]');
  // אורח: לא נפתח לבד (כדי לא לבזבז את 3 החיפושים לניסיון)
  await page.evaluate(() => { document.querySelectorAll('.overlay.open').forEach((o) => o.classList.remove('open')); authUser = null; });
  await page.evaluate((r) => { r.date = dayKey(new Date()); openUpload('receipt'); upMode = 'receipt'; upResult = { receipt: r }; showUploadReview(); document.querySelector('#urPub').checked = false; document.querySelector('#upConfirm').click(); }, R);
  await page.waitForTimeout(1200);
  assert(!(await page.locator('#basketOverlay.open').count()), 'אצל אורח ההשוואה לא אמורה להיפתח לבד');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('☑️ בחירה מרובה ברשימה: בחר הכל, מכאן עד כאן, סימון, מחיקה והעברה/העתקה לרשימה אחרת', async () => {
  for (const vp of [{ width: 390, height: 844 }, { width: 1366, height: 820 }]) {
    const { ctx, page, errors } = await newPage({ viewport: vp });
    await page.evaluate(() => { document.querySelectorAll('#v8Sheet.open').forEach((x) => x.classList.remove('open')); ['חלב', 'לחם', 'ביצים', 'גבינה', 'עגבניות', 'מלפפונים'].forEach((n) => addItem(n, ''));
      state.lists.push({ id: 'L2', name: 'לשבת', items: [{ id: 'z1', n: 'חלב', q: '', c: 'מוצרי חלב', e: '🥛', done: false, ts: 1 }], created: 1 }); render(); });
    await page.click('[data-s88go]');
    await page.click('[data-s88="range"]'); await page.locator('#paneList .s88row').nth(1).click(); await page.locator('#paneList .s88row').nth(3).click();
    assert((await page.evaluate(() => sel88.state.ids.size)) === 3, 'טווח לא בחר 3');
    await page.locator('#paneList .s88row').nth(5).click({ modifiers: ['Shift'] });
    assert((await page.evaluate(() => sel88.state.ids.size)) === 5, 'Shift+לחיצה לא הוסיפה טווח');
    await page.click('[data-s88="check"]');
    assert((await page.evaluate(() => curList().items.filter((i) => i.done).length)) === 5, 'לא סומנו כנקנו');
    await page.click('[data-s88="all"]'); assert((await page.evaluate(() => sel88.state.ids.size)) === 6, 'בחר הכל');
    await page.click('[data-s88="open"]'); assert((await page.evaluate(() => sel88.state.ids.size)) === 1, 'רק מה שלא נקנה');
    await page.click('[data-s88="copy"]'); await page.click('[data-s88to="L2"]');
    let r = await page.evaluate(() => ({ cur: curList().items.length, l2: state.lists.find((l) => l.id === 'L2').items.map((i) => i.n) }));
    assert(r.cur === 6 && r.l2.join() === 'חלב', 'העתקה (חלב כבר שם — לא משכפלים): ' + JSON.stringify(r));
    await page.click('[data-s88go]'); await page.click('[data-s88="bought"]'); await page.click('[data-s88="move"]'); await page.click('[data-s88to="L2"]');
    r = await page.evaluate(() => ({ cur: curList().items.map((i) => i.n), l2: state.lists.find((l) => l.id === 'L2').items.map((i) => i.n), tomb: Object.keys(state.tomb.items).length }));
    assert(r.cur.join() === 'חלב' && r.l2.length === 6 && r.tomb >= 5, 'העברה: ' + JSON.stringify(r));
    await page.click('[data-s88go]'); await page.click('[data-s88="all"]'); await page.click('[data-s88="del"]');
    await page.waitForTimeout(200); await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && /^(אישור|כן|מחיקה|OK)/.test(x.textContent.trim()) && !x.closest('.sel88bar')); b && b.click(); });
    await page.waitForTimeout(200);
    assert((await page.evaluate(() => curList().items.length)) === 0, 'מחיקה של הנבחרים');
    assert(!errors.length, errors.join(' | '));
    await ctx.close();
  }
});

await test('⚙️ הגדרות עוברות עם החשבון בין מכשירים (תצוגת צ\'אטים, מצב כהה) + 👥 חשבון משותף מהשרת + 🔗 קישור הזמנה כשהאתר פתוח', async () => {
  // "השרת": שורת profiles אחת שמשותפת לשני המכשירים
  let srv = null;
  const mock = (srvIn, rooms) => {
    window.__srv = srvIn; window.__rooms = rooms || [];
    const base = __stub({ 'rpc:room_access': rooms && rooms.length ? { role: 'secondary', perms: {}, owner_name: 'יוסף' } : null, 'rpc:room_get': {} });
    const from = base.from;
    base.from = (n) => {
      if (n !== 'profiles') return from(n);
      const q = { _upd: null, select() { return q; }, eq() { return q; }, update(o) { q._upd = o; return q; },
        maybeSingle() { return Promise.resolve({ data: { settings: window.__srv }, error: null }); },
        then(res, rej) { if (q._upd && q._upd.settings) window.__srv = q._upd.settings; return Promise.resolve({ data: null, error: null }).then(res, rej); } };
      return q;
    };
    const rpc = base.rpc; base.rpc = (n, a) => n === 'my_rooms' ? Promise.resolve({ data: window.__rooms, error: null }) : rpc(n, a);
    sb = base; authUser = { id: 'u1', email: 'a@b.c' };
  };
  // מכשיר א' (האפליקציה): מפעילים תצוגת צ'אטים ומצב כהה
  {
    const { ctx, page, errors } = await newPage();
    await page.evaluate(mock, null);
    await page.evaluate(() => __setSync.pull(true)); await page.waitForTimeout(300);
    await page.evaluate(() => { document.querySelector('#miChats').click(); document.querySelector('#btnDark').click(); });
    await page.waitForTimeout(1800);
    srv = await page.evaluate(() => window.__srv);
    assert(srv && srv.v && srv.v.s.chatHome === true && srv.v.s.dark === true && srv.ts > 0, 'ההגדרות לא נשמרו בחשבון: ' + JSON.stringify(srv));
    assert(!errors.length, errors.join(' | '));
    await ctx.close();
  }
  // מכשיר ב' (האתר): בכניסה מקבלים את אותן הגדרות; שינוי כאן חוזר לחשבון
  {
    const { ctx, page, errors } = await newPage();
    await page.evaluate(mock, srv);
    await page.evaluate(() => __setSync.pull(true)); await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({ chat: !!state.chatHome, dark: document.body.classList.contains('dark'), cls: document.body.classList.contains('chathome') }));
    assert(st.chat && st.dark && st.cls, 'ההגדרות לא הגיעו למכשיר השני: ' + JSON.stringify(st));
    await page.evaluate(() => document.querySelector('#miChats').click()); await page.waitForTimeout(1800);
    const s2 = await page.evaluate(() => window.__srv);
    assert(s2.v.s.chatHome === false && s2.ts > srv.ts, 'כיבוי במכשיר השני לא נשמר: ' + JSON.stringify(s2));
    // שינוי מאוחר יותר במכשיר אחר גובר כשחוזרים לאפליקציה
    await page.evaluate(() => { window.__srv = { v: Object.assign({}, window.__srv.v, { s: Object.assign({}, window.__srv.v.s, { dark: false }) }), ts: Date.now() + 5000 }; });
    await page.evaluate(() => __setSync.pull(true)); await page.waitForTimeout(300);
    assert(await page.evaluate(() => !state.dark && !document.body.classList.contains('dark')), 'שינוי ממכשיר אחר לא הגיע');
    assert(!errors.length, errors.join(' | '));
    await ctx.close();
  }
  // 👥 הצטרפה כמשתמשת משנית בדפדפן — באפליקציה (מכשיר בלי state.follow) מתחברת לבד לחשבון המשותף
  {
    const { ctx, page, errors } = await newPage();
    await page.evaluate(`(${mock})(null, [{ code: 'YAMOWN1', owner: 'u1', role: 'owner' }, { code: 'ALIAS1234', owner: 'u0', role: 'secondary' }])`);
    await page.evaluate(() => { state.follow = null; });
    await page.evaluate(async () => { await startCloud(); }); await page.waitForTimeout(300);
    const f = await page.evaluate(() => ({ follow: state.follow, badge: (document.querySelector('#secBadge15') || {}).hidden }));
    assert(f.follow === 'ALIAS1234' && f.badge === false, 'לא התחבר לחשבון המשותף מהשרת: ' + JSON.stringify(f));
    // קישור הזמנה שנפתח כשהדף כבר פתוח (באפליקציה 2.0 רק ה-# משתנה)
    await page.evaluate(() => { window.__inv = null; const r = sb.rpc; sb.rpc = (n, a) => { if (n === 'room_invite_info') window.__inv = a.p_token; return n === 'room_invite_info' ? Promise.resolve({ data: { valid: true, owner: 'יוסף' }, error: null }) : r(n, a); }; closeSheet(); location.hash = '#join-' + 'a'.repeat(32); });
    await page.waitForTimeout(500);
    const j = await page.evaluate(() => ({ tok: window.__inv, hash: location.hash, sheet: !!document.querySelector('#jnGo') }));
    assert(j.tok === 'a'.repeat(32) && !j.hash && j.sheet, 'קישור ההזמנה לא נקלט בלי טעינה מחדש: ' + JSON.stringify(j));
    assert(!errors.length, errors.join(' | '));
    await ctx.close();
  }
});

await test('👁️ חשבון משותף: בעל החשבון בוחר מה השותף רואה (רשימות וחלקים) + שותף מוגבל לא רואה את מה שלא שותף', async () => {
  const mock = (st) => {
    window.__calls = [];
    const base = __stub({ 'rpc:merge_status': st, 'rpc:merge_share_set': { ok: true, share: { lists: ['L1'], view: { history: true, home: true, recipes: true, errands: false, budget: true } } }, 'rpc:room_get': { lists: [] }, 'rpc:merge_partner_put': true });
    const rpc = base.rpc; base.rpc = (n, a) => { window.__calls.push([n, a]); return rpc(n, a); };
    sb = base; authUser = { id: 'u1', email: 'a@b.c' };
  };
  // בעל החשבון
  {
    const { ctx, page, errors } = await newPage();
    await page.evaluate(() => { state.lists = [{ id: 'L1', name: 'קניות שבועיות', items: [{ id: 'a', n: 'חלב' }] }, { id: 'L2', name: 'מתנות', items: [] }]; });
    await page.evaluate(mock, { guest: null, partners: [{ user_id: 'p1', name: 'שרה', since: new Date().toISOString(), share: null }], pending: null });
    await page.evaluate(() => openMerge20()); await page.waitForTimeout(300);
    assert(await page.locator('[data-sh21="p1"]').isVisible(), 'אין כפתור "מה רואה" ליד השותף');
    assert(/רואה ועורך הכל/.test(await page.locator('.sh21s').first().textContent()), 'לא מוצג מה השותף רואה');
    await page.click('[data-sh21="p1"]'); await page.waitForTimeout(200);
    await page.check('input[name="sh21m"][value="pick"]');
    await page.check('[data-sl="L1"]'); await page.uncheck('[data-sv="errands"]');
    await page.click('#sh21Save'); await page.waitForTimeout(400);
    const c = await page.evaluate(() => window.__calls.find((x) => x[0] === 'merge_share_set'));
    assert(c && c[1].p_user === 'p1' && JSON.stringify(c[1].p_share.lists) === '["L1"]' && c[1].p_share.view.errands === false && c[1].p_share.view.history === true, 'הבחירה לא נשלחה לשרת: ' + JSON.stringify(c));
    assert(!errors.length, errors.join(' | '));
    await ctx.close();
  }
  // שותף מוגבל: תזכורות וסידורים לא שותפו — לא רואים אותם, והשמירה עוברת דרך השרת
  {
    const { ctx, page, errors } = await newPage();
    await page.evaluate(mock, { guest: { code: 'SABC', host_name: 'יוסף', since: new Date().toISOString(), share: { lists: ['L1'], view: { errands: false } } }, partners: [], pending: null });
    await page.evaluate(() => { roomAcc15 = { role: 'partner', share: { lists: ['L1'], view: { errands: false } }, perms: { view: { errands: false, lists: true } }, owner_name: 'יוסף' }; state.follow = 'SABC'; state.merge = { code: 'SABC', host: 'יוסף' }; applyPermsUi15(); });
    assert(await page.evaluate(() => document.body.classList.contains('noerr21') && !canSee15('errands') && canSee15('history')), 'החלקים שלא שותפו לא הוסתרו');
    await page.evaluate(() => { closeSheet(); openErrands(); }); await page.waitForTimeout(200);
    assert(!(await page.evaluate(() => document.querySelector('#v8Sheet').classList.contains('open'))), 'תזכורות נפתחו למרות שלא שותפו');
    await page.evaluate(() => { cloudOn = true; state.room = 'SABC'; pushCloud(); }); await page.waitForTimeout(1100);
    assert(await page.evaluate(() => window.__calls.some((x) => x[0] === 'merge_partner_put' && x[1].p_code === 'SABC') && !window.__calls.some((x) => x[0] === 'room_put')), 'שותף מוגבל לא שומר דרך merge_partner_put');
    await page.evaluate(() => openMerge20()); await page.waitForTimeout(300);
    assert(/מה משותף איתך/.test(await page.locator('#v8SheetBody').textContent()), 'השותף לא רואה מה שותף איתו');
    assert(!errors.length, errors.join(' | '));
    await ctx.close();
  }
});

await test('🛟 מקום מלא במכשיר: הפרופיל והחנויות שלי לא מתאפסים ברענון', async () => {
  const { ctx, page, errors } = await newPage();
  await page.evaluate(() => { state.user = { id: 'u1', name: 'בודק', email: '' }; save(); });
  // מעכשיו השמירה הגדולה נכשלת כאילו המקום בדפדפן מלא
  await page.evaluate(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (this === localStorage && k === 'yamh_app_v1') { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } return o.call(this, k, v); }; });
  await page.evaluate(() => { const me = meData(); me.city = 'בני ברק'; Object.assign(prof28(), { adults: 2, kids: 1, where: { super: 'רמי לוי' } }); meSave(); state.srvPicks = [{ store: 's1', chain: 'c', chain_name: 'רמי לוי' }]; save(); });
  await page.reload(); await page.waitForTimeout(1500);
  const r = await page.evaluate(() => { save(); return 0; }).then(() => page.evaluate(() => ({ city: meData().city, ppl: people28(prof28()), picks: (state.srvPicks || []).length, lite: !!(state.meLite && state.meLite.profile) })));
  assert(r.city === 'בני ברק' && r.ppl === 3 && r.picks === 1 && r.lite, 'הפרופיל או החנויות התאפסו: ' + JSON.stringify(r));
  // יציאה מהחשבון מוחקת גם את העותק הקטן
  await page.evaluate(() => safeSignOut()); assert(await page.evaluate(() => !localStorage.getItem('yam_me_keep_v1')), 'העותק נשאר אחרי יציאה');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('✅ ממתין לאישור: רואים בדיוק מה ממתין (כל הסוגים), ולחיצה קופצת ישר לפריט', async () => {
  const { ctx, page, errors } = await newPage({ viewport: { width: 1280, height: 900 } });
  const P = 'aaaaaaaa-1111-2222-3333-444444444444', R = 'bbbbbbbb-1111-2222-3333-444444444444', B = 'cccccccc-1111-2222-3333-444444444444';
  const D = {
    'rpc:staff_pending_items': [
      { kind: 'price', ref: P, title: 'חלב 3% — 6.90 ₪', detail: 'שופרסל · רמות', who: 'משה', created_at: '2026-11-17T09:00:00Z', pending: true },
      { kind: 'review', ref: R, title: '⭐⭐⭐⭐⭐ שרה', detail: 'אתר מצוין', who: 'שרה', created_at: '2026-11-17T08:00:00Z', pending: true },
      { kind: 'bizreq', ref: B, title: 'בקשת הצטרפות: מכולת דוד', detail: 'דוד · 050', who: 'דוד', created_at: '2026-11-17T07:00:00Z', pending: true }],
    prices: [{ id: P, product: 'חלב 3%', chain: 'שופרסל', branch: 'רמות', price: 6.9, currency: 'ILS', confirms: 0, wrong: 0, status: 'pending', created_at: '2026-11-17T09:00:00Z' }],
    site_reviews: [{ id: R, stars: 5, body: 'אתר מצוין', status: 'pending', created_at: '2026-11-17T08:00:00Z' }] };
  await page.evaluate((D) => { sb = __stub(D); authUser = { id: 'me', email: 'owner@x.com', email_confirmed_at: 'x', app_metadata: { yam_owner: true } }; openBO('pending'); }, D);
  await page.waitForTimeout(600);
  const bo = await page.$eval('#boMain', (e) => e.textContent);
  assert(bo.includes('חלב 3%') && bo.includes('מכולת דוד') && bo.includes('בקשת הצטרפות של עסק') && /ממתין לאישור \(3\)/.test(bo), 'לא רואים את כל מה שממתין: ' + bo.slice(0, 300));
  // בקשת הצטרפות אין לה אישור/דחייה כאן — יש "✔ קראתי" שמעלים אותה
  assert(await page.$('#boMain [data-pseen^="bizreq:"]'), 'אין "קראתי" לבקשת הצטרפות');
  await page.click('#boMain [data-pseen^="bizreq:"]'); await page.waitForTimeout(300);
  assert(!(await page.$eval('#boMain', (e) => e.textContent)).includes('מכולת דוד'), '"קראתי" לא העלים את הפריט');
  await page.click('#boMain [data-pjump*="price"]'); await page.waitForTimeout(900);
  const j = await page.evaluate(() => { const e = document.querySelector('#boMain .bojump'); return { cur: (document.querySelector('#boNav button.on') || {dataset:{}}).dataset.s, id: e && e.dataset.id }; });
  assert(j.cur === 'prices' && j.id === P, 'לחיצה על המחיר לא קפצה אליו: ' + JSON.stringify(j));
  await page.click('#boNav [data-s="dash"]'); await page.waitForTimeout(700);
  const dash = await page.$eval('#pdDash', (e) => e.textContent).catch(() => '');
  assert(dash.includes('ממתין לאישור (3)') && dash.includes('חלב 3%') && dash.includes('שרה'), 'בסקירה לא רואים מה ממתין: ' + dash.slice(0, 200));
  await page.click('#pdDash [data-pjump*="review"]'); await page.waitForTimeout(900);
  const r = await page.evaluate(() => { const e = document.querySelector('#boMain .bojump'); return { cur: (document.querySelector('#boNav button.on') || {dataset:{}}).dataset.s, id: e && e.dataset.id }; });
  assert(r.cur === 'reviews' && r.id === R, 'מהסקירה לא קפץ לחוות הדעת: ' + JSON.stringify(r));
  // קישור מהתוסף לכרום: #admin-prices&item=price:<id> פותח את הבק אופיס ישר על הפריט
  await page.evaluate((P) => { history.replaceState(null, '', '#admin-prices&item=price:' + P); openBO('prices'); }, P); await page.waitForTimeout(1200);
  const x = await page.evaluate(() => { const e = document.querySelector('#boMain .bojump'); return { cur: (document.querySelector('#boNav button.on') || {dataset:{}}).dataset.s, id: e && e.dataset.id }; });
  assert(x.cur === 'prices' && x.id === P, 'קישור מהתוסף לא קפץ לפריט: ' + JSON.stringify(x));
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await test('📈 גרף מחיר למוצר: "היה זול יותר בשבוע שעבר?" (/history)', async () => {
  const asked = [];
  const days = Array.from({ length: 14 }, (_, i) => ({ day: '2026-11-' + String(5 + i).padStart(2, '0'), n: 40, min: i < 9 ? 7.9 : 6.9, median: 8.5, max: 9.9, min_chain: i < 9 ? 'שופרסל' : 'רמי לוי' }));
  days[3] = { day: '2026-11-08', n: 0 }; // יום בלי נתונים — חור בקו, לא אפס
  const priceApi = (r) => { const u = new URL(r.request().url()); const p = u.pathname.replace('/api/prices', ''); asked.push(p + '?' + u.searchParams.toString());
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (p === '/history') return json({ code: '7290004131074', name: 'חלב תנובה 3% 1 ליטר', days });
    if (p === '/products') return json([{ code: '7290004131074', name: 'חלב תנובה 3% 1 ליטר', manufacturer: 'תנובה', stores: 40, chains: 5, min: 6.9, median: 8.5, max: 9.9 }]);
    return json([]); };
  const { ctx, page, errors } = await newPage({ priceApi });
  await page.evaluate(() => { authUser = { id: 'me', email: 'x@y.z' }; applyConfig('collector', { public: true }); curList().items = []; addItem('חלב', '');
    const it = curList().items[0]; Object.assign(it, { bc: '7290004131074', bn: 'חלב תנובה 3% 1 ליטר', bq: it.n }); save(); render(); pkOpen53(it.id); });
  await page.waitForSelector('#v8SheetBody [data-pkhist]'); await page.click('#v8SheetBody [data-pkhist]');
  await page.waitForSelector('#v8SheetBody svg.ph70');
  assert(asked.some((q) => q.startsWith('/history') && /code=7290004131074/.test(q)), 'לא ביקשנו היסטוריה: ' + asked.join(' , '));
  const t = await page.locator('#v8SheetBody').innerText();
  assert(/הוזל/.test(t) && /לפני שבוע/.test(t), 'אין סיכום "הוזל מלפני שבוע": ' + t);
  assert(await page.locator('#v8SheetBody svg.ph70 path.ph70lo').getAttribute('d').then((d) => (d.match(/M/g) || []).length === 2), 'יום בלי נתונים צריך להיות חור בקו');
  const box = await page.locator('#v8SheetBody svg.ph70').boundingBox();
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
  assert(await page.locator('#v8SheetBody .ph70tip').isVisible(), 'אין תווית בריחוף על הגרף');
  assert(!errors.length, errors.join(' | '));
  await ctx.close();
});

await browser.close(); server.close();
for (const r of results) console.log(r.join(' '));
const failed = results.filter((r) => r[0] === '❌').length;
console.log(failed ? `\n${failed} בדיקות נכשלו` : `\nכל ${results.length} הבדיקות עברו 🎉`);
process.exit(failed ? 1 : 0);
