
/* ================= עיצוב 2: אייקוני קו אחידים במקום אימוג'י — בכל האתר =================
   האייקונים והמילון באים מ-ICONS2 / EMO_IC (למעלה בדף). מחליפים בכל מקום חוץ מהבק אופיס, שדות הקלדה,
   וגוף ההודעות שמשתמשים כותבים בהתכתבות עם האתר. בכותרות שדות, בחלונות אישור ובאפשרויות של תפריט נגלל — מורידים את האימוג'י.
   יושב כאן, מיד אחרי ICONS2 ולפני כל שאר הקוד, כדי שכבר מהציור הראשון לא יופיעו אימוג'י צבעוניים (גם בטלפון איטי). */
(function(){
  // שם לקורא מסך כשהאייקון הוא כל התוכן של הכפתור
  const HE={plus:'הוספה',x:'סגירה','send-horizontal':'שליחה',send:'שליחה',mic:'הקלטה',camera:'צילום','trash-2':'מחיקה',pencil:'עריכה',search:'חיפוש',check:'סימון','circle-check':'סימון',
    settings:'הגדרות',bell:'התראות',user:'משתמש',link:'שיתוף',printer:'הדפסה',moon:'מצב כהה','folder-open':'תצוגת קטגוריות','message-circle':'צ\'אט',info:'מידע',star:'מועדף',
    calendar:'תאריך',pin:'סידור',package:'מלאי',receipt:'קבלה','clipboard-list':'העתקה',save:'שמירה','archive-restore':'שחזור',download:'הורדה',upload:'העלאה',house:'הבית שלי',
    'list-todo':'רשימה','shopping-cart':'עגלה',store:'חנות',coins:'מחיר',clock:'היסטוריה',repeat:'חזרה','refresh-cw':'רענון','undo-2':'תגובה','thumbs-up':'אהבתי',heart:'אהבתי',
    lightbulb:'הצעות',eye:'הצגה','eye-off':'הסתרה','volume-2':'השמעה','volume-x':'השתקה',pause:'השהיה',play:'הפעלה','chef-hat':'יאמי',navigation:'ניווט',phone:'חיוג',minus:'הפחתה'};
  const NS='http://www.w3.org/2000/svg';
  /* 🚀 כל אייקון נבנה פעם אחת (innerHTML של SVG איטי), ומשם משכפלים — בפתיחה יש מאות אייקונים */
  const TPL=new Map();
  const mk=i=>{let t=TPL.get(i.n);const src=ICONS2[i.n];
    if(!t||t.__src!==src){t=document.createElementNS(NS,'svg');t.setAttribute('viewBox','0 0 24 24');t.setAttribute('class','ic2');t.setAttribute('aria-hidden','true');t.innerHTML=src;t.__src=src;TPL.set(i.n,t);}
    const s=t.cloneNode(true);s.dataset.n=i.n;
    if(i.c){s.dataset.c='';s.style.setProperty('--icc',i.c);}return s;};
  // לא נוגעים: בק אופיס, קוד, שדות הקלדה, ומה שמסומן במפורש
  const OFF='#bo,#adminOverlay,#botMsgs,script,style,noscript,[data-noicon]',TYPING='textarea,[contenteditable=""],[contenteditable="true"]';
  const ATTRS=['placeholder','title','aria-label'];
  function fix(t){
    const el=t.parentElement;if(!el)return;const v=t.nodeValue;
    if(!v||v.length<1)return;EMO_RE.lastIndex=0;if(!EMO_RE.test(v))return;
    if(el.closest(OFF)||el.closest(TYPING))return;
    // מה שמשתמש כתב בהתכתבות עם האתר (גוף ההודעה והציטוט שלה) — נשאר כמו שנכתב
    if(el.classList.contains('b43')||el.closest('.q43'))return;
    if(el.closest('option,optgroup,select')){const s=stripEmo(v);if(s!==v)t.nodeValue=s;return;}
    let last=0,out=[],hit=false;EMO_RE.lastIndex=0;
    for(const m of v.matchAll(EMO_RE)){const i=emoIcon(m[0]);hit=true;
      /* אימוג'י בלי אייקון מתאים — מורידים: אימוג'י רק אצל יאמי */
      if(!i){if(m.index>last)out.push(document.createTextNode(v.slice(last,m.index)));last=m.index+m[0].length;if(v[last]===' '&&(!m.index||v[m.index-1]===' '))last++;continue;}
      if(m.index>last)out.push(document.createTextNode(v.slice(last,m.index)));const ic=mk(i);ic.dataset.e=m[0];out.push(ic);last=m.index+m[0].length;}
    if(!hit)return;if(last<v.length)out.push(document.createTextNode(v.slice(last)));
    if(!out.some(n=>n.nodeType===1)&&!out.map(n=>n.nodeValue).join('').trim()&&!el.textContent.replace(v,'').trim())return;
    // אייקון לבד (סמל של מוצר, קטגוריה, כרטיס) — בצבע המותג; בכפתורים ובקישורים הוא בצבע הטקסט
    if(out.length===1&&out[0].nodeType===1&&el.childNodes.length===1&&!el.closest('button,a,[role="button"],header,.hmenu'))out[0].classList.add('solo');
    const f=document.createDocumentFragment();out.forEach(n=>f.appendChild(n));const firstIc=out.find(n=>n.nodeType===1);
    const host=el.closest('button,a,[role="button"]');t.replaceWith(f);
    if(host&&firstIc&&!host.getAttribute('aria-label')&&!host.getAttribute('aria-labelledby')&&!host.textContent.trim()){const nm=firstIc.dataset.n;host.setAttribute('aria-label',host.title||HE[nm]||nm);}}
  // לקורא מסך: אימוג'י בתווית ← מילה (תגובות להודעות, דירוג), ואם אין מילה — מורידים
  const SAY={'thumbs-up':'אהבתי',heart:'לב',laugh:'צחוק',sparkles:'וואו','heart-handshake':'תודה','circle-check':'מעולה',frown:'עצוב',smile:'חיוך',flame:'אש','smile-plus':'טעים','shopping-cart':'עגלה',star:'כוכב'};
  const say=v=>{EMO_RE.lastIndex=0;if(!EMO_RE.test(v))return v;const r=v.replace(EMO_RE,m=>{const i=emoIcon(m);return i?(SAY[i.n]?' '+SAY[i.n]+' ':''):m;}).replace(/\s{2,}/g,' ').trim();return r||v;};
  function fixAttrs(el){if(el.closest(OFF))return;ATTRS.forEach(a=>{const v=el.getAttribute(a);if(v){const s=a==='aria-label'?say(v):stripEmo(v);if(s!==v)el.setAttribute(a,s);}});}
  function walk(root){
    if(root.nodeType===3){fix(root);return;}
    if(root.nodeType!==1||root.closest(OFF))return;
    /* 🚀 בלי פונקציית סינון לכל צומת (הייתה הדבר הכי איטי בפתיחה) — הדפדפן עובר לבד על הטקסטים, ורק טקסט עם אימוג'י נבדק.
       מה שבתוך OFF (בק אופיס וכו') עדיין לא משתנה: fix ו-fixAttrs בודקים closest(OFF) */
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const ts=[];while(w.nextNode()){const v=w.currentNode.nodeValue;if(v&&/[^\u0000-\u00a8\u00aa-\u00ad\u00af-\u05ff]/.test(v))ts.push(w.currentNode);}
    const els=[...root.querySelectorAll('[placeholder],[title],[aria-label]')];if(ATTRS.some(a=>root.hasAttribute(a)))els.unshift(root);
    ts.forEach(fix);els.forEach(fixAttrs);}
  let q=new Set(),raf=0;
  new MutationObserver(ms=>{ms.forEach(m=>{if(m.type==='childList')m.addedNodes.forEach(n=>q.add(n));else if(m.type==='attributes')fixAttrs(m.target);else q.add(m.target);});
    if(q.size&&!raf)raf=requestAnimationFrame(()=>{raf=0;const a=[...q];q.clear();
      /* 🚀 בזמן שהדף נקרא כל צומת נכנס לתור בנפרד — עוברים רק על השורשים (מי שאב שלו כבר בתור, ייבדק דרכו), ולא שוב ושוב על אותם צמתים */
      const set=new Set(a);a.forEach(n=>{if(!n.isConnected)return;for(let p=n.parentNode;p;p=p.parentNode)if(set.has(p))return;walk(n);});});})
    .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  walk(document.body);
  // אחרי שנטענו אייקונים שהמנהל הוסיף: ממירים מה שעוד לא הומר, ומעדכנים אייקון שהוחלף לאותו אימוג'י
  window.__icRewalk=()=>{document.querySelectorAll('svg.ic2[data-e]').forEach(s=>{const i=emoIcon(s.dataset.e);if(i&&i.n!==s.dataset.n){s.dataset.n=i.n;s.innerHTML=ICONS2[i.n];}});walk(document.body);};
})();
