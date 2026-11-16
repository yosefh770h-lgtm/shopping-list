
/* ================= נגישות לפי ת"י 5568 (WCAG 2 רמה AA): מקלדת, קוראי מסך, חלונות ================= */
(function(){
  /* 1. דילוג לתוכן הראשי */
  const sk=document.createElement('a');sk.className='skip18';sk.href='#';sk.textContent='דילוג לתוכן הראשי';
  sk.onclick=e=>{e.preventDefault();const p=document.querySelector('.pane.on')||document.querySelector('#paneList');if(p){p.setAttribute('tabindex','-1');p.focus();}};
  document.body.insertBefore(sk,document.body.firstChild);
  document.querySelectorAll('.pane').forEach(p=>{if(!p.getAttribute('role'))p.setAttribute('role','region');});
  const names={paneList:'רשימת הקניות',paneHist:'היסטוריה',paneHome:'הבית שלי',panePrices:'מחירים',paneStores:'חנויות',paneChats:'צ׳אטים'};
  Object.keys(names).forEach(id=>{const p=document.getElementById(id);if(p&&!p.getAttribute('aria-label'))p.setAttribute('aria-label',names[id]);});
  /* לשוניות: מצב נבחר לקוראי מסך */
  const tabs=()=>document.querySelectorAll('.tabs .tab').forEach(b=>b.setAttribute('aria-current',b.classList.contains('on')?'page':'false'));
  tabs();document.querySelector('.tabs')&&new MutationObserver(tabs).observe(document.querySelector('.tabs'),{subtree:true,attributes:true,attributeFilter:['class']});

  /* 2. חלונות (שכבות): תפקיד "דיאלוג", פוקוס נכנס לחלון, Tab נשאר בתוכו, Esc סוגר, והפוקוס חוזר למקום */
  const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const isOpen=o=>o.classList.contains('open')||(o.id==='bo'&&!o.classList.contains('hidden'))||(o.id==='updPop'&&!o.hidden);
  const stack=[];
  function titleOf(o){const t=o.querySelector('.phead b,.sheettitle,.qphead b,h2,b');return t?t.textContent.trim().slice(0,80):'חלון';}
  function onOpen(o){if(stack.includes(o))return;stack.push(o);o._ret=document.activeElement;
    o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');if(!o.getAttribute('aria-label'))o.setAttribute('aria-label',titleOf(o));
    const panel=o.querySelector('.panel,.qpcard,.ybcard,.updcard')||o;if(!panel.hasAttribute('tabindex'))panel.setAttribute('tabindex','-1');
    /* פוקוס על החלון עצמו — לא על שדה טקסט, כדי שלא תקפוץ מקלדת בטלפון */
    setTimeout(()=>{if(isOpen(o)&&!o.contains(document.activeElement))panel.focus({preventScroll:true});},30);}
  function onClose(o){const i=stack.indexOf(o);if(i<0)return;stack.splice(i,1);const r=o._ret;o._ret=null;if(r&&document.contains(r)&&r.offsetParent!==null)try{r.focus({preventScroll:true});}catch(e){}}
  function closeTop(){const o=stack[stack.length-1];if(!o)return false;
    const x=o.querySelector('#boClose,[id^=btnClose],.phead button,.qphead button,[aria-label="סגירה"],[aria-label="Close"],.updbtns .later');
    if(x){x.click();return true;}if(o.classList.contains('open')){o.classList.remove('open');return true;}return false;}
  function check(o){isOpen(o)?onOpen(o):onClose(o);}
  const watch=o=>{if(o._w18)return;o._w18=1;new MutationObserver(()=>check(o)).observe(o,{attributes:true,attributeFilter:['class','hidden']});check(o);};
  const scan=()=>document.querySelectorAll('.overlay,.qp15,#bo,#updPop,#ybPop').forEach(watch);
  scan();new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1&&(n.matches('.overlay,.qp15')||n.querySelector&&n.querySelector('.overlay,.qp15')))scan();
    stack.slice().forEach(o=>{if(!document.contains(o))onClose(o);});}).observe(document.body,{childList:true});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){const sp=document.getElementById('shpop18');if(sp)return;if(document.querySelector('#hMenu.open')){document.querySelector('#hMenu').classList.remove('open');document.querySelector('#btnMenu').focus();return;}if(closeTop())e.preventDefault();return;}
    if(e.key!=='Tab')return;const o=stack[stack.length-1];if(!o||!isOpen(o))return;
    const f=[...o.querySelectorAll(FOCUSABLE)].filter(x=>x.offsetParent!==null||x===document.activeElement);if(!f.length)return;
    const first=f[0],last=f[f.length-1];
    if(!o.contains(document.activeElement)){e.preventDefault();first.focus();return;}
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  /* תפריט ההגדרות ⚙️: מצב פתוח/סגור לקוראי מסך */
  const mb=document.querySelector('#btnMenu'),mm=document.querySelector('#hMenu');
  if(mb&&mm){mb.setAttribute('aria-expanded','false');mb.setAttribute('aria-controls','hMenu');new MutationObserver(()=>mb.setAttribute('aria-expanded',String(mm.classList.contains('open')))).observe(mm,{attributes:true,attributeFilter:['class']});}

  /* 3. שם נגיש תואם לטקסט שרואים על הכפתור (WCAG 2.5.3) */
  const EMO=/[\p{Extended_Pictographic}️‍]/gu;
  let lt=0;function fixLabels(){lt=0;document.querySelectorAll('button[aria-label],a[aria-label],[role=button][aria-label]').forEach(el=>{
    const vis=(el.innerText||'').replace(EMO,'').replace(/\s+/g,' ').trim();if(!vis||vis.length>60)return;
    /* השם המקורי נשמר בצד, כך שמספר שמתחלף (למשל בפעמון) לא נערם שוב ושוב */
    const cur=el.getAttribute('aria-label')||'';if(el.dataset.l18==null||(cur!==el.dataset.l18v))el.dataset.l18=cur;
    const orig=el.dataset.l18;let want=orig.replace(/\s+/g,' ').includes(vis)?orig:vis+' — '+orig;
    if(cur!==want)el.setAttribute('aria-label',want);el.dataset.l18v=want;});}
  fixLabels();new MutationObserver(()=>{if(!lt)lt=setTimeout(fixLabels,120);}).observe(document.body,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  /* 4. כפתורי בחירה (מצב כהה, תצוגה וכו') — מסומנים לקוראי מסך */
  document.addEventListener('click',()=>setTimeout(()=>{document.querySelectorAll('.seg button,.clseg button,.wedtabs button,.tchip,.catbar .cb').forEach(b=>b.setAttribute('aria-pressed',String(b.classList.contains('on'))));},0),true);
})();
