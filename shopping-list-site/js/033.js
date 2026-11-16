
/* ================= ⌨️ הקלדה חכמה — כל שדה שמקלידים בו מוצר =================
   מקלידים אות אחת ("ח") וכבר נפתחת רשימה: קודם מה שמתחיל בדיוק במה שהוקלד (חלב, חלה...), אחר כך מילה שנייה שמתחילה בזה
   ("גבינה חלב"), ובסוף מה שמכיל את זה. בין שווים — מה שהמשתמש קונה הכי הרבה, ואז הקצר. מקור: מאגר המוצרים, הרשימות,
   ההיסטוריה ודיווחי המחירים. בשדות הוספה (הרשימה, "הוספת מוצר לבית") בחירה מוסיפה מיד; בשדות חיפוש — ממלאת ומחפשת. */
const SMART_FIELDS={inText:'add',pantryAddInput:'add',inCatSearch:'fill',homeSearch:'fill',msProduct:'fill',prProduct:'fill',
  priceSearchInput:'fill',bcName:'fill',purQ:'fill',invName:'fill',invSearch:'fill',shName:'fill',shQ:'fill',spQ:'fill',npName:'fill',pq:'fill'};
const SMART_MAX=8;
let smartIn=null,smartBox=null,smartItems=[],smartAct=-1,smartNames=null,smartUse=null,smartPick=false;
const smartKey=s=>norm(String(s||'')).toLowerCase();
function smartCollect(el){
  const names=new Map(),use=new Map();
  const add=n=>{n=String(n||'').trim().slice(0,60);if(!n)return;const k=smartKey(n);if(k&&!names.has(k))names.set(k,n);};
  const used=n=>{const k=smartKey(n);if(k)use.set(k,(use.get(k)||0)+1);};
  try{Object.keys(P).forEach(add);}catch(e){}
  try{(state.lists||[]).forEach(l=>(l.items||[]).forEach(i=>{add(i.n);used(i.n);}));}catch(e){}
  try{(state.history||[]).forEach(h=>(h.items||[]).forEach(i=>{add(i.n);used(i.n);}));}catch(e){}
  try{if(typeof latestRows!=='undefined')(latestRows||[]).forEach(r=>add(r.product));}catch(e){}
  const dl=el.dataset.smList&&document.getElementById(el.dataset.smList);
  if(dl)dl.querySelectorAll('option').forEach(o=>add(o.value));
  smartNames=[...names.entries()];smartUse=use;
}
function smartRank(q){
  const nq=smartKey(q);if(!nq)return [];
  const out=[];
  for(const [k,n] of smartNames){
    let r;if(k===nq)r=0;else if(k.startsWith(nq))r=1;else if(k.split(/[\s\-–]+/).some(w=>w.startsWith(nq)))r=2;else if(k.includes(nq))r=3;else continue;
    out.push({n,r,u:smartUse.get(k)||0});
  }
  out.sort((a,b)=>a.r-b.r||b.u-a.u||a.n.length-b.n.length||a.n.localeCompare(b.n,'he'));
  /* מה שהוקלד כבר זהה למוצר היחיד — אין מה להציע */
  if(out.length===1&&out[0].r===0)return [];
  return out.slice(0,SMART_MAX);
}
function smartEnsureBox(){
  if(smartBox)return smartBox;
  const st=document.createElement('style');st.textContent=
    '.smart-ac{position:fixed;z-index:10050;max-height:260px;overflow-y:auto;background:var(--panel,#fdf9f0);color:var(--text);border:1px solid var(--chipbr);border-radius:12px;box-shadow:0 6px 22px rgba(0,0,0,.18);padding:4px 0;margin:0;list-style:none;font-family:inherit;direction:rtl}'+
    '.smart-ac[hidden]{display:none}.smart-ac li{display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:15px;cursor:pointer;min-height:24px}'+
    '.smart-ac li .sme{width:22px;text-align:center;flex:none}.smart-ac li b{font-weight:700}'+
    '.smart-ac li[aria-selected="true"],.smart-ac li:hover{background:rgba(127,127,127,.14)}';
  document.head.appendChild(st);
  smartBox=document.createElement('ul');smartBox.className='smart-ac';smartBox.id='smartAc';smartBox.setAttribute('role','listbox');
  smartBox.setAttribute('aria-label',T('הצעות','Suggestions'));smartBox.hidden=true;document.body.appendChild(smartBox);
  /* בלי לאבד את הפוקוס מהשדה כשנוגעים בהצעה (חשוב באייפון) */
  smartBox.addEventListener('pointerdown',e=>e.preventDefault());smartBox.addEventListener('mousedown',e=>e.preventDefault());
  smartBox.addEventListener('click',e=>{const li=e.target.closest('li[data-i]');if(li)smartChoose(+li.dataset.i);});
  return smartBox;
}
function smartPlace(){
  if(!smartIn||!smartBox||smartBox.hidden)return;
  const r=smartIn.getBoundingClientRect();if(!r.width){smartClose();return;}
  const vh=window.visualViewport?window.visualViewport.height:window.innerHeight;
  const w=Math.max(r.width,220),left=Math.min(Math.max(8,r.right-w),window.innerWidth-w-8);
  smartBox.style.width=w+'px';smartBox.style.left=left+'px';
  const below=vh-r.bottom,h=Math.min(260,smartBox.scrollHeight);
  /* כשהרשימה נפתחת למעלה — לא לעלות מעל הכותרת העליונה (במסך צר עם מקלדת פתוחה היא כיסתה את הלוגו והכפתורים) */
  const hd=document.querySelector('.app>header');const hb=hd&&hd.getClientRects().length?Math.max(0,hd.getBoundingClientRect().bottom):0;
  const above=r.top-Math.max(8,hb)-4;
  if(below<h+12&&above>below){smartBox.style.top='';smartBox.style.bottom=(window.innerHeight-r.top+4)+'px';smartBox.style.maxHeight=Math.max(96,Math.min(260,above))+'px';}
  else{smartBox.style.bottom='';smartBox.style.top=(r.bottom+4)+'px';smartBox.style.maxHeight=Math.max(96,Math.min(260,below-12))+'px';}
}
function smartRender(){
  const box=smartEnsureBox();box.textContent='';
  if(!smartItems.length){smartClose();return;}
  const q=smartKey(smartIn.value);
  smartItems.forEach((it,i)=>{
    const li=document.createElement('li');li.id='smartAc'+i;li.dataset.i=i;li.setAttribute('role','option');li.setAttribute('aria-selected',i===smartAct?'true':'false');
    const em=document.createElement('span');em.className='sme';em.setAttribute('aria-hidden','true');try{em.textContent=emojiOf(it.n);}catch(e){em.textContent='🛒';}
    const tx=document.createElement('span');
    /* מדגישים את החלק שהוקלד (כשהוא בתחילת השם) */
    if(it.r===1||it.r===0){const b=document.createElement('b');b.textContent=it.n.slice(0,smartIn.value.trim().length);tx.appendChild(b);tx.appendChild(document.createTextNode(it.n.slice(smartIn.value.trim().length)));}
    else tx.textContent=it.n;
    li.appendChild(em);li.appendChild(tx);box.appendChild(li);
  });
  box.hidden=false;smartIn.setAttribute('aria-expanded','true');
  if(smartAct>=0)smartIn.setAttribute('aria-activedescendant','smartAc'+smartAct);else smartIn.removeAttribute('aria-activedescendant');
  smartPlace();
}
function smartClose(){
  if(smartBox){smartBox.hidden=true;smartBox.textContent='';}
  if(smartIn){smartIn.setAttribute('aria-expanded','false');smartIn.removeAttribute('aria-activedescendant');}
  smartItems=[];smartAct=-1;
}
function smartChoose(i){
  const it=smartItems[i],el=smartIn;if(!it||!el)return;
  smartClose();el.value=it.n;smartPick=true;
  try{el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}finally{smartPick=false;}
  if(SMART_FIELDS[el.id]==='add')el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));
  else el.focus();
}
function smartAttach(el){
  if(el.dataset.smOn)return;el.dataset.smOn='1';
  const l=el.getAttribute('list');if(l){el.dataset.smList=l;el.removeAttribute('list');}
  el.setAttribute('autocomplete','off');el.setAttribute('role','combobox');el.setAttribute('aria-autocomplete','list');
  el.setAttribute('aria-controls','smartAc');el.setAttribute('aria-expanded','false');
}
document.addEventListener('focusin',e=>{const el=e.target;if(!(el instanceof HTMLInputElement)||!SMART_FIELDS[el.id])return;
  smartAttach(el);smartIn=el;smartCollect(el);});
document.addEventListener('input',e=>{const el=e.target;if(smartPick||!(el instanceof HTMLInputElement)||!SMART_FIELDS[el.id])return;
  if(smartIn!==el||!smartNames){smartAttach(el);smartIn=el;smartCollect(el);}
  smartItems=smartRank(el.value);smartAct=-1;smartRender();});
document.addEventListener('keydown',e=>{
  if(!e.isTrusted||!smartIn||e.target!==smartIn||!smartBox||smartBox.hidden)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const n=smartItems.length;smartAct=e.key==='ArrowDown'?(smartAct+1)%n:(smartAct<=0?n-1:smartAct-1);smartRender();}
  else if(e.key==='Enter'&&smartAct>=0){e.preventDefault();e.stopImmediatePropagation();smartChoose(smartAct);}
  else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();smartClose();}
  else if(e.key==='Enter'||e.key==='Tab')smartClose();
},true);
document.addEventListener('focusout',e=>{if(e.target===smartIn)setTimeout(()=>{if(document.activeElement!==smartIn)smartClose();},120);});
window.addEventListener('resize',smartPlace);
if(window.visualViewport)window.visualViewport.addEventListener('resize',smartPlace);
document.addEventListener('scroll',e=>{if(smartBox&&!smartBox.hidden&&!(e.target instanceof Node&&smartBox.contains(e.target)))smartPlace();},true);
