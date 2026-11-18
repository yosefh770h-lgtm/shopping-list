/* 🚀 טעינה לפי הצורך (נובמבר 2026): חלקים כבדים שרוב המשתמשים לא פותחים — כרגע הבק אופיס (כ-390KB קוד) —
   לא נטענים בכל פתיחה של האתר, אלא רק בפעם הראשונה שנכנסים אליהם. בטלפונים חלשים זה מקצר את הפתיחה.
   ב-index.html הם כתובים כ-<script type="text/lazy" data-lazy="admin" src="/js/...?v=...">: הדפדפן לא מריץ ולא מוריד
   סקריפט מסוג כזה, אבל מספר הגרסה (?v=) נבדק כרגיל ב-tests/stamp-js.mjs. lazyLoad('admin') טוען את כולם, לפי הסדר בדף.

   הבק אופיס: קבצים אחרים רושמים בו מסכים כבר בטעינת האתר (boView / boAfter), וחלקם מוסיפים כפתורים לתפריט שלו (boReady).
   עד שהבק אופיס נטען — הכל נשמר בתור, ו-js/016.js מריץ את התור לפי הסדר המקורי מיד כשהוא נטען.
   openBO() ו-boOpenUser23() עד אז: טוענים את הבק אופיס ואז פותחים אותו. */
(function(){
  const groups={},done={};
  window.lazyLoad=function(g){
    if(groups[g])return groups[g];
    const srcs=[...document.querySelectorAll('script[type="text/lazy"][data-lazy="'+g+'"]')].map(t=>t.getAttribute('src')).filter(s=>!done[s]);
    groups[g]=new Promise((resolve,reject)=>{
      let left=srcs.length;if(!left){resolve();return;}
      /* async=false: מורידים את כולם במקביל, אבל מריצים לפי הסדר */
      srcs.forEach(src=>{const s=document.createElement('script');s.src=src;s.async=false;
        s.onload=()=>{done[src]=1;if(--left===0)resolve();};
        s.onerror=()=>{delete groups[g];s.remove();reject(new Error('הקובץ '+src.split('?')[0]+' לא נטען'));};
        document.head.appendChild(s);});
    });
    return groups[g];
  };

  const q=window.__boQ=[];
  window.boView=(k,fn)=>{q.push(['view',k,fn]);};
  window.boAfter=(k,fn)=>{q.push(['after',k,fn]);};
  window.boReady=fn=>{q.push(['ready',null,fn]);};
  const later=name=>{const stub=function(){const self=this,args=arguments;
    return lazyLoad('admin').then(()=>{if(window[name]===stub)throw new Error(name+' לא נמצא');return window[name].apply(self,args);})
      .catch(e=>{console.warn('lazy admin',e);if(typeof flash==='function')flash('⚠️ הבק אופיס לא נטען — בודקים את החיבור ומנסים שוב');});};
    return stub;};
  window.openBO=later('openBO');
  window.boOpenUser23=later('boOpenUser23');
})();
