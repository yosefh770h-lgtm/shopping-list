
/* ================= ♿ בועת נגישות צפה (אפשר לגרור אותה לכל מקום במסך) ================= */
(function(){
  const q=x=>document.querySelector(x);
  const css=document.createElement('style');
  css.textContent='#a11yFab{position:fixed;z-index:30;width:46px;height:46px;border-radius:50%;border:2px solid #fff;background:#1557b0;color:#fff;font-size:24px;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:grab;touch-action:none;user-select:none;padding:0}#a11yFab:focus-visible{outline:3px solid #ffbf00;outline-offset:2px}#a11yFab.drag{cursor:grabbing;opacity:.85}body.bizmode #a11yFab{bottom:auto}@media print{#a11yFab{display:none}}';
  document.head.appendChild(css);
  /* שורה עליונה ולשוניות בטלפון צר: הכל נכנס בלי לגלול ובלי שהגלגל ייחתך */
  const hst=document.createElement('style');
  hst.textContent='header .tabs{gap:8px;justify-content:space-between}@media (max-width:420px){header .tabs .tab{font-size:13px;padding-inline:0}header .hbtns .hbtn{min-width:32px;padding:5px 2px}}';
  document.head.appendChild(hst);
  /* באפליקציית האנדרואיד אין בועה צפה (היא זזה ומפריעה) — הנגישות נשארת בתפריט ⚙️ */
  if(/YamShoppingApp\//.test(navigator.userAgent))return;
  const b=document.createElement('button');b.id='a11yFab';b.type='button';b.textContent='♿';
  b.setAttribute('aria-label',T('נגישות — הגדלת טקסט, ניגודיות ועוד','Accessibility options'));b.title=T('נגישות (אפשר לגרור)','Accessibility (drag to move)');
  document.body.appendChild(b);
  const mi=q('#miA11y');if(mi)mi.hidden=true;
  let pos=null;try{pos=JSON.parse(localStorage.getItem('a11yFabPos')||'null');}catch(e){}
  const place=()=>{const w=innerWidth,h=innerHeight;let x=pos?pos.x*w:w-58,y=pos?pos.y*h:h*0.45;
    x=Math.max(6,Math.min(w-52,x));y=Math.max(60,Math.min(h-120,y));b.style.left=x+'px';b.style.top=y+'px';};
  place();addEventListener('resize',place);
  let st=null,moved=false;
  b.addEventListener('pointerdown',e=>{st={x:e.clientX,y:e.clientY,l:b.offsetLeft,t:b.offsetTop};moved=false;b.setPointerCapture(e.pointerId);});
  b.addEventListener('pointermove',e=>{if(!st)return;const dx=e.clientX-st.x,dy=e.clientY-st.y;if(!moved&&Math.hypot(dx,dy)<6)return;moved=true;b.classList.add('drag');
    b.style.left=Math.max(6,Math.min(innerWidth-52,st.l+dx))+'px';b.style.top=Math.max(60,Math.min(innerHeight-120,st.t+dy))+'px';});
  const end=()=>{if(!st)return;st=null;b.classList.remove('drag');if(moved){pos={x:b.offsetLeft/innerWidth,y:b.offsetTop/innerHeight};try{localStorage.setItem('a11yFabPos',JSON.stringify(pos));}catch(e){}}};
  b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);
  b.addEventListener('click',e=>{if(moved){e.preventDefault();moved=false;return;}openA11y();});
})();

/* ================= 💬 הודעות קופצות של יאמי — המנהל כותב, וזה קופץ לכולם או למשתמש אחד ================= */
async function yamiNotesCheck(){
  if(!sb||!authUser)return;
  try{
    const {data,error}=await sb.from('yami_notes').select('id,body').or('user_id.is.null,user_id.eq.'+authUser.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(10);
    if(error||!data||!data.length)return;
    let seen=[];try{seen=JSON.parse(localStorage.getItem('yamiNotesSeen')||'[]');}catch(e){}
    const n=data.find(x=>!seen.includes(x.id));if(!n)return;
    seen.push(n.id);try{localStorage.setItem('yamiNotesSeen',JSON.stringify(seen.slice(-200)));}catch(e){}
    showNudge('👩‍🍳 '+n.body);
    const nb=document.querySelector('#botNudge');if(nb){clearTimeout(nb._t);nb._t=setTimeout(()=>{nb.hidden=true;},60000);}
  }catch(e){}
}
setTimeout(yamiNotesCheck,6000);setInterval(yamiNotesCheck,5*60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)yamiNotesCheck();});


/* ================= 📌 הבועה של יאמי תמיד צמודה לכפתור של יאמי ומצביעה עליו — בכל גודל מסך, באתר ובאפליקציה ================= */
(function(){
  const nb=document.querySelector('#botNudge');if(!nb)return;
  const st=document.createElement('style');
  st.textContent='.botnudge.atfab{margin:0!important;right:auto!important;transform:none!important}'+
    '.botnudge.atfab::after{content:"";position:absolute;bottom:-8px;left:var(--ytail,20px);width:14px;height:14px;background:inherit;border-right:1px solid var(--chipbr);border-bottom:1px solid var(--chipbr);transform:rotate(45deg);border-bottom-right-radius:3px}';
  document.head.appendChild(st);
  const SEL=['#botFab','#btnBot','.yamifab','#ruthyFab'];
  const fabRect=()=>{for(const s of SEL){const e=document.querySelector(s);if(!e)continue;const r=e.getBoundingClientRect();
    if(r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&getComputedStyle(e).visibility!=='hidden')return r;}return null;};
  const P=(k,v)=>nb.style.setProperty(k,v,'important');
  const clear=()=>{nb.classList.remove('atfab');['left','top','bottom','right','max-width','--ytail'].forEach(k=>nb.style.removeProperty(k));};
  function place(){
    if(nb.hidden)return;
    const r=fabRect();if(!r){clear();return;}
    const W=innerWidth,cx=r.left+r.width/2;
    nb.classList.add('atfab');
    P('max-width',Math.min(260,W-24)+'px');P('top','auto');P('right','auto');
    const bw=nb.offsetWidth;
    /* הזנב של הבועה יושב מעל מרכז הכפתור, והבועה לא יוצאת מהמסך */
    const left=Math.max(8,Math.min(W-bw-8,cx-24));
    P('left',left+'px');P('bottom',Math.max(8,innerHeight-r.top+14)+'px');
    P('--ytail',Math.max(10,Math.min(bw-24,cx-left-7))+'px');
  }
  let iv=0;
  const sync=()=>{if(nb.hidden){clearInterval(iv);iv=0;return;}place();if(!iv)iv=setInterval(place,500);};
  new MutationObserver(sync).observe(nb,{attributes:true,attributeFilter:['hidden']});
  addEventListener('resize',place);
  if(window.visualViewport)visualViewport.addEventListener('resize',place);
  sync();
})();
