/* רשימת קניות — Service Worker
   מאפשר לאפליקציה להיפתח גם בלי אינטרנט ולהיטען מהר.
   הנתונים עצמם (רשימות, מחירים) לא נשמרים כאן — הרשימה נשמרת בטלפון (localStorage) ונשלחת לשרת כשיש קליטה,
   ומוצרים / סניפים / מתכונים נשמרים בטלפון ב-IndexedDB (ראו cachedLoad ב-index.html). */
/* v15 (נובמבר 2026): מוחק את כל מה שנשמר עד עכשיו, כולל עותקים ישנים של האתר, וטוען מחדש פעם אחת חלונות פתוחים */
const CACHE = 'yam-shopping-v15';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/app-192.png', './icons/app-512.png', './privacy.html', './accessibility.html', './logo.png', './logo-2.svg', './vendor/fonts/fonts-2.css', './favicon.png', './cities-il.json'];
/* כמה זמן מחכים לשרת כשפותחים את האתר. בחנות עם קליטה חלשה מאוד — אחרי הזמן הזה נפתח העותק השמור,
   כדי שהרשימה לא "תיתקע" על מסך לבן. כשיש קליטה רגילה השרת עונה מהר, ותמיד נטענת הגרסה העדכנית */
const NAV_TIMEOUT = 6000;
/* ספריות קבועות (עם מספר גרסה) — אפשר לשמור אותן לתמיד */
/* נשמרות על השרת של האתר (תיקיית vendor) ולא באתר חיצוני — כך הן נטענות גם כשסינון חוסם את cdn.jsdelivr.net */
const CDN = [
  new URL('./vendor/supabase-js-2.117.2/supabase.js', self.location).href,
  new URL('./vendor/hebcal-core-6.10.0.min.js', self.location).href
];

/* 🚀 הקוד של האתר נמצא בקבצים נפרדים בתיקייה js/ (נובמבר 2026), כל אחד עם מספר גרסה בכתובת (?v=...).
   כך הדפדפן שומר אותם כבר מהודרים, והפתיחה מהירה בהרבה מקריאת 2.4MB קוד מתוך הדף בכל פתיחה.
   כתובת עם ?v= לא משתנה לעולם — אז נשמרת לתמיד ונטענת מהשמור בלי לשאול את השרת.
   חשוב: העמוד הראשי נשמר רק יחד עם כל קבצי ה-js שלו, כדי שבלי אינטרנט תמיד תהיה גרסה שלמה ותואמת */
const isJs = (url) => url.origin === self.location.origin && /^\/js\/[^/]+\.js$/.test(url.pathname);
/* lazy=false: רק מה שנטען בכל פתיחה. קבצים עם data-lazy (הבק אופיס, ראו js/lazy.js) לא יורדים מראש — רוב המשתמשים לא צריכים אותם,
   והם נשמרים כשמישהו נכנס אליהם בפעם הראשונה */
const jsOf = (html, lazy) => [...html.matchAll(/<script\b([^>]*)\ssrc="(\/js\/[^"]+)"/g)].filter((m) => lazy || !/\sdata-lazy=/.test(m[1])).map((m) => new URL(m[2], self.location).href);
async function storeHome(res) {
  const html = await res.clone().text();
  const c = await caches.open(CACHE);
  const want = jsOf(html);
  const missing = (await Promise.all(want.map((u) => c.match(u).then((h) => (h ? null : u))))).filter(Boolean);
  /* העמוד החדש נשמר תמיד — גם אם קובץ js אחד לא ירד עכשיו (סינון / קליטה). קודם במקרה כזה נשאר בטלפון ובמחשב
     העמוד הישן, ונפתח בכל פעם שהשרת התעכב — זה "האתר הקודם" שהופיע שוב ושוב. קובץ שחסר יורד מהאינטרנט כשהדף צריך אותו */
  await Promise.all(missing.map((u) => fetch(u).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null)));
  await c.put('./index.html', res);
  /* קבצי js של גרסאות קודמות — כבר לא צריך */
  const keep = new Set(jsOf(html, true));
  const keys = await c.keys();
  /* נובמבר 2026: גרסה קודמת של קובץ נמחקת רק כשהגרסה החדשה שלו כבר שמורה. קודם היא נמחקה מיד — ואם הקובץ החדש
     לא ירד (קליטה חלשה / סינון), בפתיחה הבאה בלי קליטה לא היה שום עותק שלו, והאתר נפתח "שבור" (יומן התקלות: עשר תקלות
     "חסר רכיב" — openUpload, confirmUpload, onScanned... — כולן כי קובץ אחד לא נטען). עכשיו נשאר העותק הקודם, ראו isJs למטה */
  const have = new Set(keys.map((k) => k.url));
  const lacking = new Set(want.filter((u) => !have.has(u)).map((u) => new URL(u).pathname));
  await Promise.all(keys.filter((k) => isJs(new URL(k.url)) && !keep.has(k.url) && !lacking.has(new URL(k.url).pathname)).map((k) => c.delete(k)));
}

/* דף מהאינטרנט (תמיד הגרסה העדכנית), ובלי קליטה / אחרי NAV_TIMEOUT — מהשמור */
function netFirst(req, url, cached) {
  /* אין קליטה בכלל — ישר מהשמור, בלי לחכות */
  if (self.navigator && self.navigator.onLine === false) return cached().then((r) => r || fetch(req));
  // cache: 'no-cache' — בודקים מול השרת בכל רענון, כדי שהדפדפן לא יחזיר עותק ישן מהזיכרון שלו
  const net = fetch(req, { cache: 'no-cache' })
    .then((res) => {
      if (res.ok && res.type === 'basic' && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'))) {
        storeHome(res.clone()).catch(() => null);
      }
      return res;
    });
  return new Promise((resolve) => {
    let done = false;
    const fallback = () => cached().then((r) => { if (r && !done) { done = true; resolve(r); } return r; });
    const t = setTimeout(fallback, NAV_TIMEOUT);
    net.then((res) => { clearTimeout(t); if (!done) { done = true; resolve(res); } })
      .catch(() => { clearTimeout(t); fallback().then((r) => { if (!done) { done = true; resolve(r || Response.error()); } }); });
  });
}

/* העמוד הראשי כשיש עותק שמור: מהשרת עד HOME_TIMEOUT. השרת מתעכב (קליטה חלשה) — פותחים את השמור,
   וכשהגרסה מהשרת מגיעה היא נשמרת לפתיחה הבאה, ואם היא שונה — מודיעים לדף ("✨ יש גרסה חדשה"), בלי לטעון מחדש לבד */
/* נובמבר 2026: 3.5 שניות → 1.5. בסרטון מהטלפון היו כ-3 שניות של מסך ריק בכל פתיחה — זה הזמן שחיכינו לשרת.
   עכשיו הדף עצמו קטן (310KB במקום 2.7MB, הקוד בקבצי js נפרדים שנשמרים בטלפון), אז כשיש קליטה סבירה הוא מגיע הרבה לפני כן */
const HOME_TIMEOUT = 1500;
function homeNet(req, url, hit) {
  if (self.navigator && self.navigator.onLine === false) return Promise.resolve(hit);
  const old = verOf(hit);
  let served = false;
  const net = fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok && res.type === 'basic') {
      storeHome(res.clone()).then(() => {
        const now = verOf(res);
        if (!served || !old || !now || old === now) return;
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) =>
          list.forEach((c) => c.postMessage({ type: 'yam-new-version', served: old, latest: now })));
      }).catch(() => null);
    }
    return res;
  });
  return new Promise((resolve) => {
    let done = false;
    const useHit = () => { if (!done) { done = true; served = true; resolve(hit); } };
    const t = setTimeout(useHit, HOME_TIMEOUT);
    net.then((res) => { clearTimeout(t); if (done) return; done = true; resolve(res.ok || !hit ? res : hit); })
      .catch(() => { clearTimeout(t); useHit(); });
  });
}

/* אותה גרסה מקבלת ETag שונה לפי הדחיסה ("...-zstd" / "...-gzip") — מנקים, כדי שלא תצא הודעת "גרסה חדשה" בלי עדכון */
const verOf = (r) => String((r && (r.headers.get('etag') || r.headers.get('last-modified'))) || '').replace(/^W\//, '').replace(/-(zstd|gzip|br|deflate)"$/, '"');

self.addEventListener('install', (event) => {
  /* כל קובץ נשמר בנפרד, וקובץ שלא נטען לא מפיל את ההתקנה.
     קודם (addAll) מספיק היה קובץ אחד שנחסם (למשל בסינון) או נכשל, וה-Service Worker החדש לא הותקן בכלל —
     והישן נשאר: זה שפותח קודם עותק ישן של האתר. גם הספריות נשמרות מראש, כדי שהאתר יעבוד בלי קליטה כבר מהפעם הבאה.
     העמוד הראשי נשמר דרך storeHome — רק יחד עם כל קבצי ה-js שלו (הדפדפן גם מהדר אותם כבר עכשיו, והפתיחה הבאה מהירה) */
  const put = (c, u, init) => fetch(u, init).then((res) => (res.ok && !res.redirected ? c.put(u, res) : null)).catch(() => null);
  const home = () => fetch('./index.html', { cache: 'reload' }).then((res) => (res.ok && !res.redirected ? storeHome(res) : null)).catch(() => null);
  event.waitUntil(caches.open(CACHE).then((c) => Promise.all(
    SHELL.filter((u) => u !== './index.html').map((u) => put(c, u, { cache: 'reload' })).concat(CDN.map((u) => put(c, u, { mode: 'cors', credentials: 'omit' })), [home()])
  )).catch(() => null).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const old = keys.filter((k) => k !== CACHE);
        return Promise.all(old.map((k) => caches.delete(k))).then(() => old.some((k) => k.startsWith('yam-shopping-')));
      })
      .then((hadOld) => self.clients.claim().then(() => {
        /* עיצוב 2.0: אם היה עותק ישן של האתר (העיצוב הקודם) — טוענים מחדש את החלונות הפתוחים פעם אחת,
           כדי שהעיצוב הישן לא יישאר על המסך עד הפתיחה הבאה. העותק החדש כבר נשמר ב-install, כך שזה מהיר */
        if (!hadOld) return;
        return self.clients.matchAll({ type: 'window' }).then((list) => Promise.all(list.map((c) =>
          ('navigate' in c) ? c.navigate(c.url).catch(() => null) : null)));
      }))
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // הורדת האפליקציה לאנדרואיד (/download/…) — ישר מהשרת, בלי לשמור ובלי "עותק שמור" במקום הקובץ
  if (url.origin === self.location.origin && url.pathname.startsWith('/download/')) return;

  // דפים אחרים: קודם מהאינטרנט (כדי לקבל תמיד את הגרסה העדכנית), ובלי אינטרנט — מהשמור
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    const cached = () => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'));
    /* העמוד הראשי (גם באפליקציה): ראו homeNet. בפעם הראשונה (אין עותק שמור) — netFirst */
    const isHome = url.pathname === '/' || url.pathname.endsWith('/index.html');
    if (isHome) {
      /* נובמבר 2026: קודם מהשרת, ורק בלי קליטה / כשהשרת מתעכב — מהעותק השמור.
         קודם הדף נפתח תמיד מהעותק השמור, והאתר מתעדכן כמה פעמים ביום — אז כמעט בכל פתיחה עלתה קודם גרסה ישנה
         (לפעמים עוד מלפני העיצוב החדש), ואחרי כמה שניות הדף נטען מחדש. כשהדף לא השתנה השרת עונה מהר "לא השתנה" (ETag), כך שזה כמעט לא מאט */
      const hitP = caches.match('./index.html');
      event.respondWith(hitP.then((hit) => hit ? homeNet(req, url, hit) : netFirst(req, url, cached)));
      return;
    }
    event.respondWith(netFirst(req, url, cached));
    return;
  }

  // ספריות עם גרסה קבועה: מהשמור, ואם אין — מהאינטרנט ושומרים
  if (CDN.includes(req.url)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // קבצי הקוד של האתר (js/…?v=…): מהשמור בלבד אם יש — הם לא משתנים לעולם. אין — מהאינטרנט ושומרים
  // והאינטרנט נכשל (קליטה חלשה / סינון) — הגרסה הקודמת של אותו קובץ מהשמור, אם יש. עדיף על דף שבור שחסר בו קובץ שלם
  if (isJs(url)) {
    const older = (res) => caches.match(req, { ignoreSearch: true }).then((o) => o || res || Response.error());
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok && url.search) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res.ok ? res : older(res);
      }, () => older(null)))
    );
    return;
  }

  // סרטוני פרסומות (/m/…) — לא שומרים (גדולים, ונטענים בחלקים); עובר רגיל לשרת
  if (url.origin === self.location.origin && url.pathname.startsWith('/m/')) return;

  // שרת המחירים (/api/…) — תמיד נתונים טריים מהשרת, לא שומרים
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // קבצים של האתר עצמו (אייקונים וכו'): מהשמור מיד, ומתעדכן ברקע
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
  // כל השאר (השרת של Supabase, גופנים) — לא נוגעים, עובר רגיל
});

// לחיצה על התראה — פותחת את האתר (או עוברת לחלון שכבר פתוח)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && 'focus' in c) { if ('navigate' in c) c.navigate(target).catch(() => {}); return c.focus(); }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});

// התראה מהשרת (גם כשהאתר סגור)
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'רשימת קניות', body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'רשימת קניות', {
    body: d.body || '', icon: './icons/app-192.png', badge: './icons/app-192.png', tag: d.tag || undefined, renotify: !!d.tag,
    dir: 'rtl', lang: 'he', data: { url: d.url || './' }
  }));
});
