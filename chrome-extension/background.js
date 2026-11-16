// בודק כל דקה מה חדש באתר ומקפיץ התראה. השרת מחזיר רק מה שמותר לתפקיד של המחובר.
import { rpc, getSession, getSettings, logout, siteUrl, KINDS, kindsForRole, ApiError, checkUpdate } from './api.js';

const ALARM = 'yam-poll';
const MAX_EVENTS = 200;
const MAX_POPUPS = 6;

async function schedule() {
  const s = await getSettings();
  await chrome.alarms.clear(ALARM);
  chrome.alarms.create(ALARM, { periodInMinutes: Math.max(1, Number(s.interval) || 1), delayInMinutes: 0.1 });
}

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.alarms.onAlarm.addListener(a => { if (a.name === ALARM) poll(); });

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === 'poll') { poll().then(r => reply(r), e => reply({ error: e.message })); return true; }
  if (msg && msg.type === 'reschedule') { schedule().then(() => reply({ ok: true })); return true; }
});

const key = e => e.kind + ':' + e.ref;

async function setBadge(n, err) {
  await chrome.action.setBadgeBackgroundColor({ color: err ? '#c2413f' : '#b8476d' });
  await chrome.action.setBadgeText({ text: err ? '!' : (n > 0 ? (n > 99 ? '99+' : String(n)) : '') });
}

let running = null;
export function poll() { if (!running) running = doPoll().finally(() => { running = null; }); return running; }

async function doPoll() {
  if (!(await getSession())) { await setBadge(0); return { loggedIn: false }; }
  const settings = await getSettings();
  const st = await chrome.storage.local.get(['events', 'lastSeen', 'primed', 'unread', 'role']);
  try {
    // בודקים כל פעם מחדש שעדיין בצוות — אם ההרשאה בוטלה, מתנתקים מיד
    const role = await rpc('my_role');
    if (!role) {
      await logout();
      notify('yam-revoked', false, 'הגישה לתוסף הסתיימה', 'החשבון כבר לא מוגדר כצוות באתר.', '');
      return { loggedIn: false };
    }
    const allowed = new Set(kindsForRole(role).filter(k => settings.kinds[k] !== false));
    // קצת אחורה מהאירוע האחרון שראינו, כדי לא לפספס; כפילויות מסוננות לפי מזהה
    const since = st.lastSeen ? new Date(new Date(st.lastSeen).getTime() - 5 * 60000).toISOString() : null;
    const [rows, pending] = await Promise.all([rpc('staff_events', { p_since: since }), rpc('staff_pending')]);

    const old = st.events || [];
    const known = new Set(old.map(key));
    const fresh = (rows || []).filter(e => !known.has(key(e)));
    const events = fresh.concat(old)
      .map(e => { const u = (rows || []).find(r => key(r) === key(e)); return u ? { ...e, pending: u.pending } : e; })
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, MAX_EVENTS);
    const lastSeen = events.length ? events[0].created_at : st.lastSeen;

    const toShow = fresh.filter(e => allowed.has(e.kind) && (!settings.pendingOnly || e.pending));
    let unread = (st.unread || 0);
    // בפעם הראשונה אחרי כניסה לא מציפים בהתראות על דברים ישנים
    if (st.primed) {
      unread += toShow.length;
      if (settings.notify && toShow.length) {
        toShow.slice(0, MAX_POPUPS).forEach(e => {
          const k = KINDS[e.kind] || { label: e.kind };
          notify('yam|' + key(e), settings.sticky, k.label + (e.kind === 'feedback' ? ' חדשה' : e.kind === 'error' ? ' — חדשה' : e.pending ? ' — ממתין לאישור' : ''), e.kind === 'feedback' ? (e.detail || '') : e.title + (e.detail ? '\n' + e.detail : ''), (e.kind === 'feedback' ? e.title + ' · ' : '') + (e.who || ''));
        });
        if (toShow.length > MAX_POPUPS) notify('yam-more-' + Date.now(), settings.sticky, 'עוד ' + (toShow.length - MAX_POPUPS) + ' עדכונים חדשים', 'לחצו על אייקון התוסף כדי לראות הכל', '');
      }
      // חלון שקופץ על המסך ונשאר עד שמאשרים או סוגרים
      if (settings.popupWin !== false && toShow.length) await showAlertWindow(toShow);
    }
    await chrome.storage.local.set({ events, lastSeen, primed: true, unread, role, pending: pending || {}, lastPoll: new Date().toISOString(), lastError: '' });

    const pendingCount = Object.entries(pending || {}).filter(([k]) => allowed.has(k)).reduce((a, [, n]) => a + (Number(n) || 0), 0);
    await setBadge(pendingCount + (unread && !pendingCount ? unread : 0));
    updateCheck();
    return { loggedIn: true, fresh: toShow.length };
  } catch (e) {
    const msg = e instanceof ApiError && /staff_events|staff_pending|function/.test(e.message) ? 'צריך להריץ שוב את קוד ה-SQL של האתר (בק אופיס ← הגדרה ראשונית)' : e.message;
    await chrome.storage.local.set({ lastError: msg, lastPoll: new Date().toISOString() });
    if (e.code === 'no_session') { await setBadge(0); return { loggedIn: false }; }
    await setBadge(0, true);
    return { loggedIn: true, error: msg };
  }
}

// פעם ב-6 שעות בודקים אם יש גרסה חדשה לתוסף — ומודיעים פעם אחת לכל גרסה
async function updateCheck() {
  const { updCheckedAt = 0, updNotified = '' } = await chrome.storage.local.get(['updCheckedAt', 'updNotified']);
  if (Date.now() - updCheckedAt < 6 * 3600000) return;
  await chrome.storage.local.set({ updCheckedAt: Date.now() });
  const up = await checkUpdate();
  if (!up || up.version === updNotified) return;
  await chrome.storage.local.set({ updNotified: up.version, updUrl: up.url });
  chrome.notifications.create('yam-update', {
    type: 'basic', iconUrl: 'icons/icon-128.png', title: 'גרסה חדשה לתוסף (' + up.version + ')',
    message: (up.notes || 'יש עדכון לתוסף של רשימת קניות').slice(0, 250), priority: 1, requireInteraction: false,
    buttons: [{ title: 'הורדה' }, { title: 'אחר כך' }],
  });
}
async function openUpdate() {
  const { updUrl } = await chrome.storage.local.get('updUrl');
  if (/^https:\/\//.test(updUrl || '')) chrome.tabs.create({ url: updUrl });
  chrome.notifications.clear('yam-update');
}

async function showAlertWindow(items) {
  const { alertQueue = [], alertWin } = await chrome.storage.local.get(['alertQueue', 'alertWin']);
  const seen = new Set(alertQueue.map(key));
  const q = alertQueue.concat(items.filter(e => !seen.has(key(e))).map(e => ({ kind: e.kind, ref: e.ref, title: e.title, detail: e.detail, who: e.who, pending: e.pending, created_at: e.created_at }))).slice(-50);
  await chrome.storage.local.set({ alertQueue: q });
  if (alertWin) {
    try { await chrome.windows.update(alertWin, { focused: true, drawAttention: true }); return; } catch (e) { /* החלון נסגר */ }
  }
  try {
    const w = await chrome.windows.create({ url: 'alert.html', type: 'popup', width: 420, height: 560, focused: true });
    await chrome.storage.local.set({ alertWin: w.id });
  } catch (e) { console.error('alert window', e); }
}
chrome.windows.onRemoved.addListener(async id => {
  const { alertWin } = await chrome.storage.local.get('alertWin');
  if (alertWin === id) await chrome.storage.local.set({ alertWin: null });
});

// sticky = ההתראה נשארת על המסך עד שלוחצים עליה (ברירת מחדל), כדי שלא תפספס שום דבר חדש באתר
function notify(id, sticky, title, message, context) {
  chrome.notifications.create(id, {
    type: 'basic', iconUrl: 'icons/icon-128.png', title: title.slice(0, 100), message: message.slice(0, 300),
    contextMessage: (context || '').slice(0, 80), priority: 2, requireInteraction: !!sticky, silent: false,
    buttons: [{ title: 'פתיחה ואישור באתר' }, { title: 'סגירה' }],
  });
}

// לחיצה על התראה פותחת את הבק אופיס בלשונית הנכונה
async function openFromNotification(id) {
  let section = '';
  if (id.startsWith('yam|')) section = (KINDS[id.slice(4).split(':')[0]] || {}).section || '';
  chrome.tabs.create({ url: siteUrl(await getSettings(), section) });
  chrome.notifications.clear(id);
}
chrome.notifications.onButtonClicked.addListener((id, btn) => {
  if (id === 'yam-update') { if (btn === 0) openUpdate(); else chrome.notifications.clear(id); return; }
  if (btn === 0) openFromNotification(id); else chrome.notifications.clear(id);
});
chrome.notifications.onClicked.addListener(id => { if (id === 'yam-update') openUpdate(); else openFromNotification(id); });
