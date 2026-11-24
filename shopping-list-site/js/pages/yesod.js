/* אתר הבית של יסוד שביסוד (yesod/index.html): גרסת האפליקציה להורדה, סטטיסטיקה אנונימית וטופס יצירת קשר */
(() => {
  const SB = 'https://ygyfodxfbebnkwdcbjrp.supabase.co', KEY = 'sb_publishable_ePRvA2OrDbBN3tbjbD3p-w_8maEwTCK';
  const t0 = Date.now(), $ = (id) => document.getElementById(id);
  $('yr').textContent = new Date().getFullYear();
  // 📊 סטטיסטיקה אנונימית: כניסה אחת לכל טעינה, ולחיצה על הורדה (yesod_event ב-schema.sql). בלי עוגיות ובלי מזהה.
  const device = () => {
    const ua = navigator.userAgent || '';
    const kind = /iPad|Tablet/i.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? 'טאבלט' : /Mobi|iPhone|Android/.test(ua) ? 'טלפון' : 'מחשב';
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
    return [kind, os].filter(Boolean).join(' · ');
  };
  const src = (() => { try { const s = (new URLSearchParams(location.search).get('src') || '').toLowerCase(); return /^[a-z0-9._-]{1,40}$/.test(s) ? s : ''; } catch (e) { return ''; } })();
  const ref = (() => { try { const r = document.referrer || ''; return r && new URL(r).host !== location.host ? r.slice(0, 400) : ''; } catch (e) { return ''; } })();
  const track = (kind, item) => {
    try {
      fetch(SB + '/rest/v1/rpc/yesod_event', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY },
        body: JSON.stringify({ p_kind: kind, p_item: item || '', p_src: src, p_referrer: ref, p_device: device() })
      }).catch(() => {});
    } catch (e) {}
  };
  setTimeout(() => track('view'), 1500);
  document.querySelectorAll('[data-dl]').forEach((a) => a.addEventListener('click', () => track('download', a.dataset.dl)));

  fetch('/download/app-version.json', { cache: 'no-cache' }).then((r) => r.ok ? r.json() : null).then((v) => {
    if (!v || !v.version) return;
    $('apkV').textContent = v.version;
    if (v.date) $('apkD').textContent = v.date.split('-').reverse().join('.');
    (v.notes || []).forEach((n) => { const li = document.createElement('li'); li.textContent = n; $('apkN').appendChild(li); });
    if ((v.notes || []).length) $('news').hidden = false;
  }).catch(() => {});
  const out = $('out'), go = $('go'), f = $('f');
  const say = (t, ok) => { out.textContent = t; out.className = 'msg ' + (ok ? 'ok' : 'bad'); };
  const okContact = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^(0[2-9]\d{7,8}|972[2-9]\d{7,8})$/.test(v.replace(/\D/g, ''));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('nm').value.trim(), contact = $('ct').value.trim(), message = $('ms').value.trim();
    if (name.length < 2) { say('נא לכתוב שם'); $('nm').focus(); return; }
    if (!okContact(contact)) { say('נא לכתוב טלפון או מייל תקינים'); $('ct').focus(); return; }
    if (message.length < 5) { say('נא לכתוב כמה מילים על הפנייה'); $('ms').focus(); return; }
    if (!$('ok').checked) { say('כדי לשלוח צריך לאשר את הודעת הפרטיות'); $('ok').focus(); return; }
    go.disabled = true; say('שולחים…', true);
    try {
      const r = await fetch(SB + '/rest/v1/rpc/studio_contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY },
        body: JSON.stringify({ p_name: name, p_contact: contact, p_topic: $('tp').value, p_message: message,
                               p_consent: true, p_hp: $('wb').value, p_ms: Date.now() - t0 })
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || ''); }
      f.reset(); say('תודה! הפנייה התקבלה, ונחזור אליכם בהקדם.', true);
    } catch (err) {
      say((err && err.message) || 'השליחה לא הצליחה. בדקו את החיבור ונסו שוב.');
    } finally { go.disabled = false; }
  });
})();
