// רכיבי תצוגה משותפים לחלון התוסף ולחלון ההתראה: אייקונים (SVG, בלי אימוג'י), כרטיס עדכון וכפתורי אישור/דחייה.
import { KINDS, ACTIONS, timeAgo, decide } from './api.js';

export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// אייקונים בקו אחיד (24×24, stroke) — מצוירים כאן, בלי ספרייה חיצונית
const P = {
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  userPlus: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6',
  login: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M22 6l-10 7L2 6',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  scroll: 'M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z',
  spark: 'M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2zM19 3v4M21 5h-4',
  store: 'M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8M7 7h.01',
  megaphone: 'M3 11l18-5v12L3 14zM11.6 16.8a3 3 0 1 1-5.8-1.6',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  coin: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  building: 'M4 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18zM9 6h1M14 6h1M9 10h1M14 10h1M9 14h1M14 14h1M10 22v-4h4v4',
  ban: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M4.9 4.9l14.2 14.2',
  bug: 'M8 2l1.9 1.9M16 2l-1.9 1.9M9 7.1V6a3 3 0 1 1 6 0v1.1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6 13H2M22 13h-4M3 21l3.2-2.6M21 21l-3.2-2.6M3 7l3 2M21 7l-3 2',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1',
  refresh: 'M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  trash: 'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2',
  hide: 'M9.9 4.2A10 10 0 0 1 12 4c6.4 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.6 8 10 8a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2',
  external: 'M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  back: 'M5 12h14M12 5l7 7-7 7',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0M12 9v4M12 17h.01',
  box: 'M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7M3.3 7L12 12l8.7-5M12 22V12',
};
export const icon = (name, cls = '') => '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (P[name] || P.bell) + '"/></svg>';

// מכניס אייקונים לכל אלמנט ב-HTML שמסומן data-i="שם"
export function paintIcons(root = document) {
  root.querySelectorAll('[data-i]').forEach(el => { if (!el.querySelector('svg.i')) el.insertAdjacentHTML('afterbegin', icon(el.dataset.i)); });
}

export const kindOf = k => KINDS[k] || { icon: 'bell', label: k, section: '' };

// תווית סטטוס לעדכון שממתין לטיפול
export function pendLabel(kind) {
  if (['feedback', 'chat', 'message'].includes(kind)) return 'לא נקרא';
  if (kind === 'abuse' || kind === 'error') return 'לטיפול';
  return 'ממתין לאישור';
}

// כפתורי אישור/דחייה לעדכון שממתין (הפעולה עצמה נעשית בשרת)
export function actionsHtml(e) {
  const a = ACTIONS[e.kind];
  if (!a || !e.pending) return '';
  const ref = esc(String(e.ref));
  const b = (x, ok, sec) => '<button class="btn sm' + (sec ? ' sec' : '') + '" data-act="1" data-kind="' + esc(e.kind) + '" data-ref="' + ref + '" data-ok="' + ok + '">' + icon(x.icon) + '<span>' + x.label + '</span></button>';
  return '<div class="acts">' + b(a[0], 1) + (a[1] ? b(a[1], 0, true) : '') + '</div>';
}

// כרטיס עדכון אחד. opts: { isNew, openBtn, extra }
export function eventCard(e, opts = {}) {
  const k = kindOf(e.kind);
  const when = e.created_at ? '<time title="' + esc(new Date(e.created_at).toLocaleString('he-IL')) + '">' + timeAgo(e.created_at) + '</time>' : '';
  return '<li class="card' + (opts.isNew ? ' new' : '') + '"' + (opts.openBtn ? '' : ' data-open="' + esc(k.section) + '" tabindex="0"') + '>' +
    '<div class="meta"><span class="kind">' + icon(k.icon) + esc(k.label) + (e.pending ? '<span class="pill">' + pendLabel(e.kind) + '</span>' : '') + '</span>' + when + '</div>' +
    '<div class="t">' + esc(e.title) + '</div>' +
    (e.detail ? '<div class="d">' + esc(e.detail) + '</div>' : '') +
    (e.who ? '<div class="who">' + icon('user') + esc(e.who) + '</div>' : '') +
    actionsHtml(e) + (opts.extra || '') + '</li>';
}

// לחיצה על אישור/דחייה. דחייה/מחיקה — רק בלחיצה שנייה ("בטוח?")
export async function onActClick(btn, after) {
  const ok = btn.dataset.ok === '1';
  const lbl = btn.querySelector('span');
  if (!ok && !btn.dataset.armed) {
    btn.dataset.armed = '1'; btn.dataset.label = lbl.textContent; lbl.textContent = 'בטוח? לחצו שוב'; btn.classList.add('armed');
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; lbl.textContent = btn.dataset.label; btn.classList.remove('armed'); } }, 4000);
    return;
  }
  const box = btn.closest('.acts'); box.querySelectorAll('button').forEach(b => { b.disabled = true; });
  try {
    const r = await decide(btn.dataset.kind, btn.dataset.ref, ok);
    box.innerHTML = '<span class="done">' + icon(ok || r === 'gone' ? 'check' : 'trash') + (r === 'gone' ? 'כבר טופל' : ok ? 'בוצע' : 'נדחה') + '</span>';
    try { chrome.runtime.sendMessage({ type: 'poll' }); } catch (e) { /* הרקע ישן — יבדוק בפעם הבאה */ }
    if (after) setTimeout(after, 700);
  } catch (e) {
    box.querySelectorAll('button').forEach(b => { b.disabled = false; });
    box.insertAdjacentHTML('beforeend', '<span class="err small">' + esc(/staff_decide|function/.test(e.message) ? 'צריך להריץ שוב את קוד ה-SQL באתר' : e.message) + '</span>');
  }
}
