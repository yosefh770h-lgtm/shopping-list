(function(){function done(){var s=document.getElementById('bootHide');if(!s)return;s.remove();try{if(window.th36Apply&&window.th36Get)th36Apply(th36Get());}catch(e){}}
document.addEventListener('DOMContentLoaded',done);setTimeout(done,15000);})();
/* 🎨 ערכת הצבעים ומצב כהה מהפעם הקודמת — עוד לפני שמשהו מצויר, כדי שלא יעלה קודם "כחול כהה" ורק אחר כך הערכה שבחרתם.
   ⚙️ וגם "הכפתורים בצד" (מלאי, לבית, קבלה) למי שבחר להציג אותם — שלא יופיעו לשנייה וייעלמו */
(function(){try{var b=document.body,d=JSON.parse(localStorage.getItem('yam_boot36')||'null');
  if(d&&/^(sky|mint|lilac|night)$/.test(d.th))b.classList.add('th-'+d.th);if(d&&d.dark)b.classList.add('dark');
  var p=JSON.parse(localStorage.getItem('yamh_prefs')||'{}')||{};if(p.noRail66===false)document.documentElement.classList.add('rail66');}catch(e){}})();
/* מופיעה פעם אחת בכל פתיחה (sessionStorage). לא מופיעה: למי שביקש "בלי אנימציות", ובאפליקציה 2.0 — שם יש אנימציה של האפליקציה עצמה.
   מאפליקציה 2.1 האנימציה של האתר היא אנימציית הפתיחה של האפליקציה (האפליקציה מראה רק כחול עד שהדף מצויר),
   והאפליקציה מבקשת אותה שוב (yamSplashAgain) כשחוזרים אליה אחרי זמן ארוך ברקע */
(function(){var el=document.getElementById('yi2');if(!el)return;
  var tpl=el.cloneNode(true),p={};
  function calm(){try{p=JSON.parse(localStorage.getItem('yamh_prefs')||'{}')||{};}catch(e){p={};}
    return (p.a11y&&p.a11y.calm)||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);}
  function play(el){
    el.querySelector('.yi2t').textContent=p.lang==='en'?'Shared shopping list · Price comparison':'רשימת קניות משותפת · השוואת מחירים';
    el.hidden=false;
    var done=function(){if(el.parentNode)el.remove();};
    el.addEventListener('animationend',function(e){if(e.target===el&&e.animationName==='yi2out')done();});
    el.addEventListener('click',function(){el.style.animation='yi2out .35s cubic-bezier(.7,0,.25,1) forwards';setTimeout(done,400);});
    setTimeout(done,4300);}
  try{var ua=navigator.userAgent||'',v=/YamShoppingApp\/(\d+)\.(\d+)/.exec(ua),native=v&&+v[1]===2&&+v[2]===0;
    var quiet=calm();
    var seen=false;try{seen=sessionStorage.getItem('yi2seen')==='1';sessionStorage.setItem('yi2seen','1');}catch(e){}
    /* בבדיקות אוטומטיות (navigator.webdriver) לא מכסים את המסך, אלא אם ביקשו ?splash */
    var auto=navigator.webdriver&&!/[?&]splash\b/.test(location.search);
    if(native||quiet||seen||auto||/[?&]noSplash\b/.test(location.search))el.remove();else play(el);
  }catch(e){el.remove();}
  window.yamSplashAgain=function(){try{if(calm()||document.getElementById('yi2'))return;var n=tpl.cloneNode(true);document.body.appendChild(n);play(n);}catch(e){}};
})();
/* 🧩 קובץ קוד שלא נטען (קליטה חלשה / סינון) נרשם כאן — כדי שיומן התקלות יראה תקלה אחת ברורה ("קובץ js/009.js לא נטען"),
   ולא עשר תקלות "חסר רכיב בקוד" שכולן נובעות ממנו, ושהמשתמש יקבל כפתור לטעון מחדש (ראו 026.js) */
window.__jsFail=[];window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='SCRIPT'&&/\/js\/[^\/?]+\.js/.test(t.src||''))window.__jsFail.push(String(t.src).replace(location.origin,'').replace(/\?.*$/,''));},true);
/* 🛡️ כפתורים ותמונות בלי קוד בתוך ה-HTML (onclick=/onerror= נחסמים ב-CSP): במקום זה data-ui="<פעולה>" / data-gone, ומאזין אחד לכל הדף */
document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-ui]');if(!t)return;var a=t.getAttribute('data-ui');
  if(a==='unblur')t.style.filter='none';else if(a==='openBO'){if(window.openBO)window.openBO();}else if(a==='pro2'){if(window.pro2)window.pro2.open();}},true);
/* תמונה שלא נטענה: data-gone="1" מוחק אותה, data-gone="parent" מוחק את מה שעוטף אותה */
document.addEventListener('error',function(e){var t=e.target;if(!t||t.tagName!=='IMG'||!t.hasAttribute('data-gone'))return;var r=t.getAttribute('data-gone')==='parent'?t.parentNode:t;if(r&&r.parentNode)r.remove();},true);
