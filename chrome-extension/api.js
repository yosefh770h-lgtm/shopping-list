// חיבור ל-Supabase של האתר — אותו חשבון (מייל + קוד) כמו באתר.
// המפתח כאן הוא המפתח הציבורי של האתר (בדיוק כמו ב-index.html); ההרשאות נאכפות בשרת.
export const SB_URL = 'https://ygyfodxfbebnkwdcbjrp.supabase.co';
export const SB_KEY = 'sb_publishable_ePRvA2OrDbBN3tbjbD3p-w_8maEwTCK';
export const DEFAULT_SITE = 'https://yamshopping.com';

export const KINDS = {
  user:     { icon: 'userPlus', label: 'חשבון חדש (עוד לא נכנס)', section: 'users', adminOnly: true },
  feedback: { icon: 'mail', label: 'הערה / פנייה',     section: 'feedback', adminOnly: true },
  recipe:   { icon: 'book', label: 'מתכון',            section: 'recipes' },
  bot:      { icon: 'spark', label: 'לימוד לבוט',       section: 'bot' },
  chain:    { icon: 'store', label: 'חנות / רשת',       section: 'chains' },
  branch:   { icon: 'pin', label: 'סניף',             section: 'chains' },
  price:    { icon: 'tag', label: 'דיווח מחיר',       section: 'prices' },
  post:     { icon: 'megaphone', label: 'מבצע / עדכון מחנות', section: 'posts' },
  torah:    { icon: 'scroll', label: 'דבר תורה',         section: 'torah' },
  review:   { icon: 'star', label: 'חוות דעת על האתר', section: 'reviews' },
  flag:     { icon: 'flag', label: 'מחיר דווח כלא נכון', section: 'prices' },
  tip:      { icon: 'coin', label: 'טיפ לחיסכון', section: 'community' },
  suggest:  { icon: 'bulb', label: 'הצעה בלוח ההצעות', section: 'community' },
  message:  { icon: 'inbox', label: 'פנייה לחנות',      section: 'messages', adminOnly: true },
  chat:     { icon: 'chat', label: 'הודעה מלקוח בצ׳אט', section: 'support', adminOnly: true },
  bizreq:   { icon: 'building', label: 'בקשת הצטרפות עסק', section: 'bizreq',   adminOnly: true },
  abuse:    { icon: 'ban', label: 'שפה לא נקייה',     section: 'abuse',    adminOnly: true },
  error:    { icon: 'bug', label: 'תקלה באתר',        section: 'errors',   adminOnly: true },
  scrape:   { icon: 'eye', label: 'מישהו מעתיק את המחירים', section: 'prices', adminOnly: true },
  visit:    { icon: 'login', label: 'משתמש קיים חזר לאתר', section: 'guests' },
  signup:   { icon: 'user', label: 'משתמש חדש הצטרף עכשיו', section: 'guests' },
};
export const ROLE_NAMES = { owner: 'בעלים', admin: 'מנהל', moderator: 'צוות פיקוח' };
export const isAdminRole = r => r === 'owner' || r === 'admin';
export const kindsForRole = r => Object.keys(KINDS).filter(k => isAdminRole(r) || !KINDS[k].adminOnly);

export const DEFAULT_SETTINGS = { site: DEFAULT_SITE, notify: true, sticky: true, popupWin: true, pendingOnly: false, interval: 1, kinds: Object.fromEntries(Object.keys(KINDS).map(k => [k, true])) };

export async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings || {}), kinds: { ...DEFAULT_SETTINGS.kinds, ...((settings || {}).kinds || {}) } };
}
export async function saveSettings(s) { await chrome.storage.local.set({ settings: s }); }

// item = { kind, ref } — פותח את הבק אופיס ישר על הפריט עצמו (גולל אליו ומדגיש אותו)
export function siteUrl(settings, section, item) {
  let base = (settings.site || DEFAULT_SITE).trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(base)) base = DEFAULT_SITE;
  return base + '/#admin' + (section ? '-' + section : '') + (item && item.kind && item.ref ? '&item=' + item.kind + ':' + encodeURIComponent(item.ref) : '');
}

export class ApiError extends Error { constructor(msg, code) { super(msg); this.code = code; } }

async function authFetch(path, body) {
  const res = await fetch(SB_URL + '/auth/v1/' + path, {
    method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error_description || data.msg || data.message || ('HTTP ' + res.status), data.error_code || data.error || res.status);
  return data;
}

async function storeSession(d, email) {
  const session = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), email: (d.user && d.user.email) || email };
  await chrome.storage.local.set({ session });
  return session;
}

export async function getSession() { return (await chrome.storage.local.get('session')).session || null; }

// רענון הכניסה — פעם אחת בכל פעם (גם אם החלון והרקע מבקשים יחד)
async function refresh(force) {
  const run = async () => {
    const s = await getSession();
    if (!s) throw new ApiError('לא מחובר', 'no_session');
    if (!force && s.expires_at * 1000 - Date.now() > 90000) return s;
    try { return await storeSession(await authFetch('token?grant_type=refresh_token', { refresh_token: s.refresh_token }), s.email); }
    catch (e) {
      if (e.code === 'refresh_token_not_found' || e.code === 'refresh_token_already_used' || e.code === 'session_not_found' || e.code === 400 || e.code === 'invalid_grant') { await clearLocal(); throw new ApiError('צריך להתחבר שוב', 'no_session'); }
      throw e;
    }
  };
  return navigator.locks ? navigator.locks.request('yam-auth', run) : run();
}

export async function rpc(name, args = {}, retried) {
  const s = await refresh(false);
  const res = await fetch(SB_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (res.status === 401 && !retried) { await refresh(true); return rpc(name, args, true); }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.message || data.hint)) || ('HTTP ' + res.status);
    throw new ApiError(msg, (data && data.code) || res.status);
  }
  return data;
}

// קריאה ישירה מטבלה (GET). ההרשאות נאכפות בשרת (RLS): צוות רואה גם מחירים שממתינים לאישור.
export async function rest(path, retried) {
  const s = await refresh(false);
  const res = await fetch(SB_URL + '/rest/v1/' + path, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + s.access_token } });
  if (res.status === 401 && !retried) { await refresh(true); return rest(path, true); }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError((data && (data.message || data.hint)) || ('HTTP ' + res.status), (data && data.code) || res.status);
  return data;
}

// ---------- חיפוש מוצרים ומחירים (כמו בחיפוש המחירים באתר: לפי שם או ברקוד) ----------
const normQ = s => String(s || '').replace(/['’`׳"]/g, '').replace(/\s+/g, ' ').trim();
// ברקוד = התאמה מדויקת. טקסט = כל מילה צריכה להופיע בשם ("חלב תנובה" ימצא גם "חלב 3% תנובה")
function textFilter(col, q) {
  if (/^\d{4,20}$/.test(q)) return 'barcode=eq.' + q;
  const words = q.replace(/[%,()*.:\\]/g, ' ').split(' ').filter(Boolean).slice(0, 5);
  return 'and=(' + encodeURIComponent(words.map(w => col + '.ilike.*' + w + '*').join(',')) + ')';
}
const PRICE_COLS = 'id,product,chain,branch,price,currency,barcode,status,verified,is_deal,deal_text,valid_until,regular_price,origin,wrong,created_at,updated_at';
export async function searchPrices(q) {
  q = normQ(q); if (!q) return [];
  const run = cols => rest('prices?select=' + cols + '&' + textFilter('product_key', q) + '&order=created_at.desc&limit=300');
  try { return (await run(PRICE_COLS)) || []; }
  catch (e) { return (await run('id,product,chain,branch,price,currency,barcode,status,verified,created_at,updated_at')) || []; }  // לפני שהורץ קוד ה-SQL החדש
}
export async function searchProducts(q) {
  q = normQ(q); if (!q) return [];
  return (await rest('products?select=id,name,brand,category,barcode,emoji,unit&' + textFilter('name_key', q) + '&order=name.asc&limit=60')) || [];
}
// מקבצים לפי מוצר: לכל רשת+סניף רק המחיר האחרון, מהזול ליקר
export function groupPrices(rows) {
  const by = new Map();
  for (const r of rows) {
    const k = (r.barcode || normQ(r.product).toLowerCase());
    if (!by.has(k)) by.set(k, { product: r.product, barcode: r.barcode || '', rows: new Map() });
    const g = by.get(k), sk = r.chain + '|' + (r.branch || '');
    const t = x => new Date(x.updated_at || x.created_at).getTime();
    if (!g.rows.has(sk) || t(r) > t(g.rows.get(sk))) g.rows.set(sk, r);
  }
  return [...by.values()].map(g => ({ ...g, rows: [...g.rows.values()].sort((a, b) => a.price - b.price) }))
    .sort((a, b) => b.rows.length - a.rows.length);
}

export async function login(email, code) {
  email = String(email || '').trim().toLowerCase();
  let d = null;
  // כניסה דרך ההגנה של האתר (auth-guard): הגבלת ניסיונות ותיעוד בשרת. אם היא עוד לא הועלתה — כמו קודם.
  try {
    const r = await fetch(SB_URL + '/functions/v1/auth-guard', { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', email, code }) });
    if (r.status !== 404) {
      const g = await r.json().catch(() => ({}));
      if (g.error === 'locked') throw new ApiError('יותר מדי ניסיונות — הכניסה נחסמה ל-' + (g.minutes || 15) + ' דקות', 'locked');
      if (g.error === 'not_confirmed') throw new ApiError('המייל עוד לא אושר', 'not_confirmed');
      if (g.error) throw new ApiError('המייל או הקוד לא נכונים', 'bad_login');
      if (g.session && g.session.access_token) d = g.session;
    }
  } catch (e) { if (e instanceof ApiError) throw e; }
  if (!d) {
    try { d = await authFetch('token?grant_type=password', { email, password: code }); }
    catch (e) {
      if (/invalid login credentials/i.test(e.message)) throw new ApiError('המייל או הקוד לא נכונים', 'bad_login');
      if (/not confirmed/i.test(e.message)) throw new ApiError('המייל עוד לא אושר', 'not_confirmed');
      throw e;
    }
  }
  await storeSession(d, email);
  const role = await rpc('my_role');
  if (!role) { await logout(); throw new ApiError('התוסף פתוח רק לצוות ולמנהלי האתר', 'not_staff'); }
  await chrome.storage.local.set({ role, events: [], unread: 0, lastSeen: null, primed: false, pending: {} });
  return role;
}

async function clearLocal() {
  await chrome.storage.local.remove(['session', 'role', 'events', 'unread', 'lastSeen', 'primed', 'pending', 'alertQueue']);
  try { await chrome.action.setBadgeText({ text: '' }); } catch (e) {}
}

export async function logout() {
  const s = await getSession();
  if (s) {
    try { await fetch(SB_URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + s.access_token } }); } catch (e) {}
  }
  await clearLocal();
}

export function timeAgo(iso) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'עכשיו';
  if (m < 60) return 'לפני ' + m + ' דק׳';
  const h = Math.round(m / 60);
  if (h < 24) return 'לפני ' + h + ' שע׳';
  const d = Math.round(h / 24);
  return d === 1 ? 'אתמול' : 'לפני ' + d + ' ימים';
}

// ---------- אישור / דחייה ישר מהתוסף (הפעולה עצמה נעשית בשרת: staff_decide) ----------
const OK = { icon: 'check', label: 'אישור' }, NO = { icon: 'x', label: 'דחייה' }, DONE = { icon: 'check', label: 'טופל' };
export const ACTIONS = {
  recipe: [OK, NO], bot: [OK, NO], review: [OK, NO], chain: [OK, NO], branch: [OK, NO], price: [OK, NO], post: [OK, NO], torah: [OK, NO], tip: [OK, NO],
  flag: [{ icon: 'check', label: 'המחיר נכון' }, { icon: 'trash', label: 'המחיר לא נכון' }],
  suggest: [{ icon: 'check', label: 'ראיתי' }, { icon: 'hide', label: 'הסתרה' }],
  feedback: [{ icon: 'check', label: 'נקרא' }, { icon: 'trash', label: 'מחיקה' }],
  chat: [DONE], message: [DONE], abuse: [DONE], error: [DONE],
};
export async function decide(kind, ref, ok) {
  const r = await rpc('staff_decide', { p_kind: kind, p_ref: String(ref), p_ok: !!ok });
  // מסמנים אצלנו שהדבר טופל, כדי שייעלם מהרשימות מיד
  const st = await chrome.storage.local.get(['events', 'alertQueue']);
  const k = kind + ':' + ref;
  await chrome.storage.local.set({
    events: (st.events || []).map(e => (e.kind + ':' + e.ref) === k ? { ...e, pending: false } : e),
    alertQueue: (st.alertQueue || []).filter(e => (e.kind + ':' + e.ref) !== k),
  });
  return r;
}

// ---------- בדיקה אם יש גרסה חדשה של התוסף ----------
export const UPDATE_INFO = 'https://www.yamshopping.com/ext/version.json';
const vnum = v => String(v || '0').split('.').map(n => parseInt(n, 10) || 0);
export const newer = (a, b) => { const x = vnum(a), y = vnum(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
export async function checkUpdate() {
  try {
    const r = await fetch(UPDATE_INFO + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    const mine = chrome.runtime.getManifest().version;
    return j && newer(j.version, mine) ? { version: String(j.version), url: String(j.url || ''), notes: String(j.notes || '') } : null;
  } catch (e) { return null; }
}
