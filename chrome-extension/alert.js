// חלון שקופץ על המסך כשיש משהו חדש באתר — נשאר עד שמאשרים (פותחים) או סוגרים
import { getSettings, siteUrl } from './api.js';
import { $, icon, paintIcons, kindOf, eventCard, actionsHtml, onActClick } from './ui.js';

const queue = async () => (await chrome.storage.local.get('alertQueue')).alertQueue || [];
const setQueue = q => chrome.storage.local.set({ alertQueue: q });

async function render() {
  const q = await queue();
  if (!q.length) { window.close(); return; }
  $('#hdr').textContent = q.length === 1 ? 'עדכון חדש באתר' : q.length + ' עדכונים חדשים באתר';
  $('#list').innerHTML = q.map((e, i) => {
    const hasActs = !!actionsHtml(e);
    const extra = '<div class="acts"><button class="btn sm' + (hasActs ? ' sec' : '') + '" data-open="' + i + '">' + icon('external') + '<span>' + (hasActs ? 'פתיחה באתר' : 'פתיחה ואישור באתר') + '</span></button>' +
      '<button class="btn sm sec" data-close="' + i + '">' + icon('x') + '<span>סגירה</span></button></div>';
    return eventCard(e, { openBtn: true, extra });
  }).join('');
}

document.addEventListener('click', async e => {
  const act = e.target.closest('[data-act]'); if (act) { onActClick(act); return; }
  const o = e.target.closest('[data-open]'), c = e.target.closest('[data-close]');
  if (o || c) {
    const q = await queue(), i = Number((o || c).dataset[o ? 'open' : 'close']), ev = q[i];
    q.splice(i, 1); await setQueue(q);
    if (o && ev) chrome.tabs.create({ url: siteUrl(await getSettings(), kindOf(ev.kind).section) });
    render(); return;
  }
  if (e.target.closest('#openAll')) { chrome.tabs.create({ url: siteUrl(await getSettings(), '') }); await setQueue([]); window.close(); return; }
  if (e.target.closest('#closeAll')) { await setQueue([]); window.close(); }
});
chrome.storage.onChanged.addListener(ch => { if (ch.alertQueue) render(); });
paintIcons();
render();
