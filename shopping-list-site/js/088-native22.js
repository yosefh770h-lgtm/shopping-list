/* 📲 אפליקציה 2.2: מה שהאתר מעביר לאפליקציה כדי שיעבוד גם כשהיא סגורה.
   🏠 וידג'ט למסך הבית — שם הרשימה הפעילה, 4 מוצרים שעוד לא נקנו ו"ועוד N" (YamApp.setWidget). רק תצוגה: לחיצה פותחת את הרשימה, "+" פותח הוספה.
   🔔 מעקב מבצעים כשהאפליקציה סגורה — ההגדרה של js/085.js עוברת לאפליקציה (YamApp.setDealWatch), והיא בודקת פעם בשעה ברקע.
      כשהאפליקציה בודקת, האתר לא בודק בעצמו (dwCheck85), כדי שלא יגיעו שתי התראות על אותו מבצע.
   בגרסה 2.1 ובאתר אין את הגשרים, ושום דבר כאן לא רץ. */
(function(){
  const has=f=>{try{return !!(window.YamApp&&typeof YamApp[f]==='function');}catch(e){return false;}};
  if(OFF_APP||!(has('setWidget')||has('setDealWatch')))return;
  const info=()=>{try{return JSON.parse(YamApp.appInfo()||'{}');}catch(e){return {};}};
  let lastW='',lastD='',t=0;
  function widget(){if(!has('setWidget'))return;
    try{const l=curList(),open=(l.items||[]).filter(i=>i&&!i.done);
      const j=JSON.stringify({title:String(l.name||T('הרשימה','List')).slice(0,40),items:open.slice(0,4).map(i=>String(i.n||'').slice(0,40)+(i.q&&String(i.q)!=='1'?' ×'+String(i.q).slice(0,8):'')),
        more:Math.max(0,open.length-4),done:(l.items||[]).length-open.length,empty:T('הרשימה ריקה 🎉','The list is empty 🎉'),moreTxt:T('ועוד','and')});
      if(j!==lastW){lastW=j;YamApp.setWidget(j);}}catch(e){}}
  function deals(){if(!has('setDealWatch'))return;
    try{const w=state.dealWatch,on=!!(w&&w.on&&Array.isArray(w.stores)&&w.stores.length&&nearDealsOn());
      const words=on&&typeof window.dwWords85==='function'?dwWords85(w):null;
      const j=JSON.stringify(on?{on:true,stores:w.stores.slice(0,8).map(s=>s.k),words,exclude:srvHidden().join(','),who:(yamWho()||{})['X-Yam-Who']||'',base:!!w.base,seen:w.seen||{}}:{on:false});
      /* "מה ראיתי" משתנה כל הזמן — לא שולחים שוב רק בגללו */
      const sig=on?JSON.stringify([w.stores.map(s=>s.k),words,srvHidden()]):'off';
      if(sig!==lastD){lastD=sig;YamApp.setDealWatch(j);}}catch(e){}}
  const push=()=>{clearTimeout(t);t=setTimeout(()=>{widget();deals();},1500);};
  window.native22=push;
  /* כל שמירה (הוספה, סימון, מחיקה, מעבר רשימה, הגדרת מעקב) */
  const _s=save;save=function(){const r=_s.apply(this,arguments);push();return r;};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){clearTimeout(t);widget();deals();}});
  push();
  /* האפליקציה בודקת מבצעים ברקע — האתר מוותר על הבדיקה שלו */
  window.dwNative85=()=>{const i=info();return has('setDealWatch')&&i.bg!==false&&!!(state.dealWatch&&state.dealWatch.on);};
})();
