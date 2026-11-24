/* 🔐 נעילת האתר (אם הופעלה במכשיר הזה): מסתירים הכל עוד לפני שהתוכן מצויר */try{if(/YamShoppingApp\//.test(navigator.userAgent)&&localStorage.getItem('yam_lock51'))document.documentElement.classList.add('lock51');}catch(e){}
/* 📐 גודל התצוגה (אוטומטי לפי המסך, או מה שנבחר בהגדרות) — עוד לפני שהתוכן מצויר, כדי שלא "יקפוץ".
   📲 באפליקציה 1.3 ומעלה: התראות האתר (Notification) עוברות להתראות של הטלפון דרך האפליקציה */
(function(){var r=document.documentElement,v='auto';try{v=(JSON.parse(localStorage.getItem('yamh_prefs')||'{}').view66)||'auto';}catch(e){}
  /* הגודל האוטומטי נקבע רק לפי גודל המסך של המכשיר (screen), ולא לפי גובה החלון:
     גובה החלון משתנה כשגוללים (שורת הכתובת נעלמת) וכשהמקלדת נפתחת, ואז הכתב והאייקונים "קפצו" בין גדלים */
  var sw0=screen.width||innerWidth||360,sh0=screen.height||innerHeight||700;
  window.size66=function(v){var mn=Math.min(sw0,sh0),mx=Math.max(sw0,sh0);
    var dev=mn>=600?(/Mobi|Android|iPad|Tablet/i.test(navigator.userAgent)||navigator.maxTouchPoints>1?'tab':'pc'):'phone';
    var a=v==='auto'?(dev!=='phone'?'':(mn<=330||mx<=600)?'xs':(mn<=360||mx<=700)?'s':''):v==='small'?'s':v==='xsmall'?'xs':'';
    r.classList.remove('sz66-s','sz66-xs','dev66-phone','dev66-tab','dev66-pc');if(a)r.classList.add('sz66-'+a);r.classList.add('dev66-'+dev);return a;};
  size66(v);
  var A=window.YamApp;if(!A||typeof A.notify!=='function')return;
  function N(t,o){o=o||{};try{A.notify(String(t||''),String(o.body||''),String(o.tag||''),String((o.data&&o.data.url)||''));}catch(e){}}
  Object.defineProperty(N,'permission',{get:function(){try{return A.notifState();}catch(e){return 'default';}}});
  N.requestPermission=function(cb){return new Promise(function(res){var done=function(s){window.__yamPerm66=null;res(s);if(typeof cb==='function')cb(s);};window.__yamPerm66=done;try{A.askNotify();}catch(e){done('denied');}});};
  try{window.Notification=N;}catch(e){}
  if(window.ServiceWorkerRegistration)try{ServiceWorkerRegistration.prototype.showNotification=function(t,o){N(t,o);return Promise.resolve();};}catch(e){}
})();
