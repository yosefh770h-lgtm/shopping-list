
/* ================= 73: 🔴 מספר אדום על אייקון האפליקציה — כמה עדכונים לא נקראו בפעמון =================
   האפליקציה (מ-2.0) מוסיפה לזה את ההודעות מהצוות ומהבק אופיס שלא נקראו. באתר שמותקן כאפליקציה — דרך הדפדפן.
   ?notif=1 (לחיצה על ההתראה השקטה של המספר) פותח את הפעמון. */
(function(){
  let last=-1;
  function sync(){let n=0;try{n=inbox.filter(x=>!x.read).length;}catch(e){}if(n===last)return;last=n;
    try{if(window.YamApp&&typeof YamApp.setBadge==='function')YamApp.setBadge(n);}catch(e){}
    try{if(navigator.setAppBadge){const p=n?navigator.setAppBadge(n):navigator.clearAppBadge();if(p&&p.catch)p.catch(()=>{});}}catch(e){}}
  {const _u=updateBell;updateBell=function(){const r=_u.apply(this,arguments);sync();return r;};}
  sync();
  if(/[?&]notif=1/.test(location.search)){try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
    setTimeout(()=>{try{openNotif();}catch(e){}},1500);}

  /* פעם אחת, בטלפון סמסונג באפליקציה: איך רואים מספר על האייקון ולא רק נקודה */
  const ua=navigator.userAgent||'';
  if(/YamShoppingApp\//.test(ua)&&/SM-[A-Z0-9]|SAMSUNG/i.test(ua))setTimeout(()=>{
    try{if(localStorage.getItem('yamh_badge_tip')||document.hidden||document.querySelector('#nAsk66')||!state.user)return;
      if(!window.YamApp||typeof YamApp.notifState!=='function'||YamApp.notifState()!=='granted')return;
      localStorage.setItem('yamh_badge_tip','1');}catch(e){return;}
    const d=document.createElement('div');d.id='nAsk66';d.setAttribute('role','dialog');d.setAttribute('aria-label',T('מספר על האייקון','Number on the icon'));
    d.innerHTML='<b>🔴 '+T('לראות על האייקון כמה התראות מחכות','See how many notifications are waiting')+'</b><p>'+
      T('בטלפון סמסונג: הגדרות ← התראות ← הגדרות מתקדמות ← תגי סמל האפליקציה ← לבחור "מספר". מעכשיו על אייקון האפליקציה יופיע עיגול אדום עם מספר ולא רק נקודה.','On Samsung: Settings → Notifications → Advanced settings → App icon badges → choose "Number".')+'</p>'+
      '<div class="r"><button type="button" class="y">'+T('הבנתי','Got it')+'</button></div>';
    document.body.appendChild(d);d.querySelector('.y').onclick=()=>d.remove();
  },60000);
})();
