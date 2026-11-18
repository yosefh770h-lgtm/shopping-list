// חלון התוסף: כניסה, מה ממתין לאישור, עדכונים אחרונים, חיפוש מחירים והגדרות
import { login, logout, getSession, getSettings, saveSettings, siteUrl, KINDS, ROLE_NAMES, kindsForRole, rpc, checkUpdate, searchPrices, searchProducts, groupPrices, DEFAULT_SITE } from './api.js';
import { $, esc, icon, paintIcons, kindOf, eventCard, onActClick, itemAttr } from './ui.js';

const VIEWS = ['vLogin', 'vMain', 'vSearch', 'vSettings'];
const OLD_DAYS = 30;
const send = msg => chrome.runtime.sendMessage(msg).catch(() => null);
let filter = '';
let prevUnread = 0;

function view(v) {
  for (const id of VIEWS) $('#' + id).hidden = id !== v;
  $('#btnSettings').hidden = $('#btnSearch').hidden = v === 'vLogin';
  $('#btnSearch').classList.toggle('on', v === 'vSearch');
  $('main').scrollTop = 0;
}
const current = () => VIEWS.find(id => !$('#' + id).hidden);
const backToMain = () => { view('vMain'); render(); };

async function openSite(section, item) { chrome.tabs.create({ url: siteUrl(await getSettings(), section, item) }); window.close(); }
const itemOf = el => { const v = el.dataset.item || '', i = v.indexOf('|'); return i > 0 ? { kind: v.slice(0, i), ref: v.slice(i + 1) } : null; };

// ---------- מסך ראשי ----------
function pendingChip(k, n) {
  const label = k === 'feedback' ? 'הערות שלא נקראו'
    : ['chat', 'message'].includes(k) ? KINDS[k].label + ' (לא נקראו)'
    : ['abuse', 'error'].includes(k) ? KINDS[k].label + ' (לטיפול)'
    : KINDS[k].label;
  return '<button class="chip hot" data-pk="' + k + '" data-open="' + KINDS[k].section + '">' + icon(KINDS[k].icon) + esc(label) + '<b>' + n + '</b></button>';
}

async function render() {
  const session = await getSession();
  if (!session) { $('#who').textContent = 'התראות ואישורים'; view('vLogin'); return; }
  const st = await chrome.storage.local.get(['role', 'events', 'pending', 'lastPoll', 'lastError']);
  const settings = await getSettings();
  const kinds = kindsForRole(st.role);
  $('#who').textContent = session.email + (ROLE_NAMES[st.role] ? ' · ' + ROLE_NAMES[st.role] : '');
  if (current() === 'vSettings' || current() === 'vSearch') return;
  if (current() !== 'vMain') view('vMain');

  const pend = Object.entries(st.pending || {}).filter(([k, n]) => kinds.includes(k) && n > 0);
  $('#pending').innerHTML = pend.length ? pend.map(([k, n]) => pendingChip(k, n)).join('')
    : '<div class="allclear">' + icon('check') + 'אין שום דבר שממתין לאישור</div>';

  $('#status').innerHTML = st.lastError ? '<span class="err">' + esc(st.lastError) + '</span>'
    : st.lastPoll ? 'נבדק ' + esc(new Date(st.lastPoll).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })) : 'בודק...';

  const events = (st.events || []).filter(e => kinds.includes(e.kind));
  const present = kinds.filter(k => events.some(e => e.kind === k));
  if (filter && !present.includes(filter)) filter = '';
  $('#filters').innerHTML = present.length > 1
    ? '<button class="chip' + (filter ? '' : ' on') + '" data-f="">הכל</button>' +
      present.map(k => '<button class="chip' + (filter === k ? ' on' : '') + '" data-f="' + k + '">' + icon(KINDS[k].icon) + esc(KINDS[k].label) + '</button>').join('')
    : '';
  const list = events.filter(e => (!filter || e.kind === filter) && (!settings.pendingOnly || e.pending)).slice(0, 100);
  $('#events').innerHTML = list.length
    ? list.map((e, i) => eventCard(e, { isNew: i < prevUnread && !filter })).join('')
    : '<li class="empty">' + icon('bell') + '<b>עוד אין עדכונים</b><span class="small">כל דבר חדש שיקרה באתר יופיע כאן</span></li>';
}

// רשימת "לאישור עכשיו" — כל מה שממתין, עם כפתורי אישור ודחייה
async function loadTodo() {
  if (!(await getSession())) return;
  const { role } = await chrome.storage.local.get('role');
  const kinds = kindsForRole(role);
  let rows;
  try { rows = (await rpc('staff_pending_items')) || []; }
  catch (err) {
    $('#todoWrap').hidden = false; $('#todoTtl').textContent = 'לאישור';
    $('#todo').innerHTML = '<li class="card"><span class="err">' + esc(/staff_pending_items|function/.test(err.message) ? 'כדי לאשר מכאן צריך להריץ שוב את קוד ה-SQL באתר (בק אופיס ← הגדרה ראשונית ← שלב 1)' : err.message) + '</span></li>';
    return;
  }
  rows = rows.filter(e => kinds.includes(e.kind)).slice(0, 40);
  $('#todoWrap').hidden = !rows.length;
  $('#todoTtl').textContent = 'לאישור עכשיו (' + rows.length + ')';
  $('#todo').innerHTML = rows.map(e => {
    const shown = e.kind === 'chain' ? { ...e, detail: { store: 'חנות', online: 'אונליין' }[e.detail] || e.detail } : e;
    return eventCard({ ...shown, pending: true }, { openBtn: true, extra: '<button class="lnk" data-open="' + esc(kindOf(e.kind).section) + '"' + itemAttr(e) + '>לפתוח ולראות באתר' + icon('external') + '</button>' }).replace('<li class="card', '<li data-tk="' + esc(e.kind) + '" class="card');
  }).join('');
}

// ---------- לחיצות ----------
document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]'); if (act) { e.stopPropagation(); onActClick(act, loadTodo); return; }
  // לחיצה על סוג למעלה: קופץ לפריטים מהסוג הזה ברשימת "לאישור עכשיו" (ואם אין שם — פותח את המסך באתר)
  const pk = e.target.closest('[data-pk]'); const first = pk && $('#todo [data-tk="' + pk.dataset.pk + '"]');
  if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'start' }); first.classList.remove('flash'); void first.offsetWidth; first.classList.add('flash'); return; }
  const o = e.target.closest('[data-open]'); if (o) { openSite(o.dataset.open, itemOf(o)); return; }
  const f = e.target.closest('[data-f]'); if (f) { filter = f.dataset.f; render(); return; }
  const tab = e.target.closest('[data-st]'); if (tab) { setTab(tab.dataset.st); doSearch(); return; }
  const pq = e.target.closest('[data-pq]'); if (pq) { $('#inQ').value = pq.dataset.pq; setTab('prices'); doSearch(); return; }
  const more = e.target.closest('[data-more]'); if (more) { more.closest('.pg').querySelectorAll('tr[hidden]').forEach(r => { r.hidden = false; }); more.remove(); return; }
  const ws = e.target.closest('[data-site]'); if (ws) openSitePrices(ws.dataset.site);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('.card[data-open]')) openSite(e.target.dataset.open, itemOf(e.target));
});

// ---------- חיפוש מוצרים ומחירים ----------
let sTab = 'prices', sTimer = null, sSeq = 0;
const money = (n, cur) => (cur && cur !== 'ILS' ? cur + ' ' : '₪') + Number(n).toFixed(2).replace(/\.00$/, '');
const fmtDate = iso => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });

function setTab(t) {
  sTab = t;
  document.querySelectorAll('#sTabs [data-st]').forEach(b => { const on = b.dataset.st === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
}
async function openSitePrices(q) {
  const s = await getSettings();
  let base = (s.site || DEFAULT_SITE).trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(base)) base = DEFAULT_SITE;
  chrome.tabs.create({ url: base + '/#p=' + encodeURIComponent(q) }); window.close();
}
async function showSearch() {
  view('vSearch');
  const { lastQ, lastTab } = await chrome.storage.local.get(['lastQ', 'lastTab']);
  setTab(lastTab || sTab);
  if (lastQ && !$('#inQ').value) $('#inQ').value = lastQ;
  $('#inQ').focus(); $('#inQ').select();
  doSearch();
}
function priceRowHtml(r, i, best) {
  const t = r.updated_at || r.created_at, old = Date.now() - new Date(t).getTime() > OLD_DAYS * 864e5;
  const tags = (r.status === 'pending' ? '<span class="tag pend">ממתין לאישור</span>' : '') +
    (String(r.origin || '').startsWith('collector') ? '<span class="tag auto" title="מחיר מייצג מקבצי שקיפות המחירים">שקיפות מחירים</span>' : r.verified ? '<span class="tag auto">מהחנות</span>' : '') +
    (r.is_deal ? '<span class="tag deal" title="' + esc(r.deal_text || '') + '">מבצע' + (r.deal_text && r.deal_text !== 'מבצע' ? ': ' + esc(r.deal_text) : '') + '</span>' : '') +
    (r.wrong > 0 ? '<span class="tag pend">דווח כלא נכון (' + Number(r.wrong) + ')</span>' : '');
  return '<tr' + (i >= 8 ? ' hidden' : '') + ' class="' + (r.price === best ? 'best' : '') + (old ? ' old' : '') + '"><td>' + esc(r.chain) + tags +
    '<span class="sub">' + (old ? icon('clock') : '') + (r.branch ? esc(r.branch) + ' · ' : '') + fmtDate(t) + '</span></td>' +
    '<td class="p">' + money(r.price, r.currency) + (r.regular_price && r.regular_price > r.price ? '<span class="sub"><s>' + money(r.regular_price, r.currency) + '</s></span>' : '') + '</td></tr>';
}
const emptyBox = (title, sub) => '<div class="empty">' + icon('search') + '<b>' + title + '</b>' + (sub ? '<span class="small">' + sub + '</span>' : '') + '</div>';

async function doSearch() {
  const q = $('#inQ').value.trim(), seq = ++sSeq;
  chrome.storage.local.set({ lastQ: q, lastTab: sTab });
  if (!q) { $('#sStatus').textContent = 'מחפשים לפי שם מוצר (אפשר כמה מילים) או לפי ברקוד. רואים את כל המחירים באתר, כולל מה שממתין לאישור.'; $('#sResults').innerHTML = ''; return; }
  $('#sStatus').textContent = 'מחפש...';
  try {
    if (sTab === 'products') {
      const rows = await searchProducts(q); if (seq !== sSeq) return;
      $('#sStatus').textContent = rows.length ? rows.length + (rows.length >= 60 ? '+' : '') + ' מוצרים בקטלוג · לחיצה מציגה את המחירים' : '';
      $('#sResults').innerHTML = rows.length ? rows.map(p => '<div class="pg"><div class="ph"><b>' + esc(p.name) + '</b>' + (p.barcode ? '<span class="bc">' + esc(p.barcode) + '</span>' : '') + '</div>' +
        '<div class="sum">' + [p.brand, p.category, p.unit].filter(Boolean).map(esc).join(' · ') + '</div>' +
        '<button class="lnk" data-pq="' + esc(p.barcode || p.name) + '">' + icon('tag') + 'המחירים של המוצר</button></div>').join('')
        : emptyBox('לא נמצא מוצר בקטלוג', 'בשם "' + esc(q) + '"');
      return;
    }
    const raw = await searchPrices(q); if (seq !== sSeq) return;
    const groups = groupPrices(raw);
    $('#sStatus').textContent = groups.length ? groups.length + ' מוצרים · ' + raw.length + (raw.length >= 300 ? '+' : '') + ' דיווחי מחיר · מהזול ליקר · שעון = לא עודכן ' + OLD_DAYS + ' יום' : '';
    $('#sResults').innerHTML = groups.length ? groups.slice(0, 40).map(g => {
      const best = g.rows[0].price, worst = g.rows[g.rows.length - 1].price, cur = g.rows[0].currency;
      return '<div class="pg"><div class="ph"><b>' + esc(g.product) + '</b>' + (g.barcode ? '<span class="bc">' + esc(g.barcode) + '</span>' : '') + '</div>' +
        '<div class="sum">' + g.rows.length + ' חנויות · ' + (best === worst ? money(best, cur) : money(best, cur) + ' עד ' + money(worst, cur)) + '</div>' +
        '<table>' + g.rows.map((r, i) => priceRowHtml(r, i, best)).join('') + '</table><div class="links">' +
        (g.rows.length > 8 ? '<button class="lnk" data-more="1">עוד ' + (g.rows.length - 8) + ' חנויות</button>' : '') +
        '<button class="lnk" data-site="' + esc(g.barcode || g.product) + '">פתיחה באתר' + icon('external') + '</button></div></div>';
    }).join('') : emptyBox('עוד אין מחירים על "' + esc(q) + '"', 'אפשר לנסות מילה אחת, או לחפש בלשונית "מוצרים בקטלוג"');
  } catch (err) { if (seq === sSeq) $('#sStatus').innerHTML = '<span class="err">' + esc(err.message || 'שגיאה בחיפוש') + '</span>'; }
}
$('#inQ').addEventListener('input', () => { clearTimeout(sTimer); sTimer = setTimeout(doSearch, 350); });
$('#inQ').addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(sTimer); doSearch(); } });
$('#btnSearch').onclick = () => (current() === 'vSearch' ? backToMain() : showSearch());
$('#btnSearch2').onclick = showSearch;
$('#btnSearchBack').onclick = backToMain;

// ---------- כניסה ----------
$('#btnLogin').onclick = async () => {
  const email = $('#inMail').value.trim(), code = $('#inCode').value, btn = $('#btnLogin');
  $('#loginErr').textContent = '';
  if (!email || !code) { $('#loginErr').textContent = 'צריך מייל וקוד'; return; }
  btn.disabled = true; btn.textContent = 'מתחבר...';
  try {
    await login(email, code);
    $('#inCode').value = '';
    await send({ type: 'reschedule' });
    await send({ type: 'poll' });
    await render(); loadTodo();
  } catch (err) { $('#loginErr').textContent = err.message || 'שגיאה בחיבור'; }
  finally { btn.disabled = false; btn.textContent = 'כניסה'; }
};
$('#inCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnLogin').click(); });

$('#btnBO').onclick = () => openSite('');
$('#btnRefresh').onclick = async () => {
  const b = $('#btnRefresh'); b.disabled = true; $('#status').textContent = 'בודק...';
  await send({ type: 'poll' }); await render(); await loadTodo(); b.disabled = false;
};

// ---------- הגדרות ----------
$('#btnSettings').onclick = async () => {
  if (current() === 'vSettings') { backToMain(); return; }
  const s = await getSettings(); const { role } = await chrome.storage.local.get('role');
  $('#kindBoxes').innerHTML = kindsForRole(role).map(k => '<label class="chk"><input type="checkbox" data-k="' + k + '"' + (s.kinds[k] !== false ? ' checked' : '') + '>' + icon(KINDS[k].icon) + '<span>' + esc(KINDS[k].label) + '</span></label>').join('');
  $('#setPendingOnly').checked = !!s.pendingOnly; $('#setNotify').checked = !!s.notify; $('#setSticky').checked = s.sticky !== false; $('#setPopupWin').checked = s.popupWin !== false;
  $('#setInterval').value = String(s.interval); $('#setSite').value = s.site;
  view('vSettings');
};
$('#btnBack').onclick = backToMain;
$('#btnSave').onclick = async () => {
  const s = await getSettings();
  document.querySelectorAll('#kindBoxes [data-k]').forEach(c => { s.kinds[c.dataset.k] = c.checked; });
  s.pendingOnly = $('#setPendingOnly').checked; s.notify = $('#setNotify').checked; s.sticky = $('#setSticky').checked; s.popupWin = $('#setPopupWin').checked;
  s.interval = Number($('#setInterval').value) || 1;
  const site = $('#setSite').value.trim().replace(/\/+$/, '');
  if (/^https:\/\/[^\s/]+/.test(site)) s.site = site;
  await saveSettings(s);
  await send({ type: 'reschedule' });
  await send({ type: 'poll' });
  backToMain();
};
$('#btnLogout').onclick = async () => { await logout(); view('vLogin'); render(); };

chrome.storage.onChanged.addListener(() => render());

// ---------- פתיחה ----------
(async () => {
  paintIcons();
  $('#ver').textContent = 'גרסה ' + chrome.runtime.getManifest().version;
  const { unread } = await chrome.storage.local.get('unread');
  prevUnread = unread || 0;
  await chrome.storage.local.set({ unread: 0 });  // פתחו את החלון = ראו את החדשים
  await render();
  if (await getSession()) { send({ type: 'poll' }).then(render); loadTodo(); }
  const up = await checkUpdate();
  if (up) {
    $('#upd').hidden = false;
    $('#upd').innerHTML = icon('download') + '<div><b>יש גרסה חדשה לתוסף (' + esc(up.version) + ')</b>' + (up.notes ? '<br>' + esc(up.notes) : '') + '<br>' +
      (/^https:\/\//.test(up.url) ? '<a href="' + esc(up.url) + '" target="_blank" rel="noopener">הורדה</a> · ' : '') + 'מחלצים לאותה תיקייה ← chrome://extensions ← רענון</div>';
  }
})();
