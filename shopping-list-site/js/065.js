
/* ================= בחירה מרובה ברשימה: בחר הכל, בחירת טווח (מכאן ועד כאן), פעולות על כמה מוצרים, העברה/העתקה לרשימה אחרת =================
   נכנסים בכפתור "☑️ בחירה" בפס העליון, או בלחיצה ארוכה על מוצר (טלפון), או Ctrl+A במחשב.
   טווח: Shift+לחיצה במחשב; בטלפון — כפתור "↕️ מכאן עד כאן" ואז לחיצה על המוצר הראשון והאחרון, או לחיצה ארוכה על המוצר האחרון.
   העברה בין רשימות יוצרת מוצר חדש ברשימת היעד (מזהה חדש) ומוחקת מהמקור עם "מצבה", כדי שהסנכרון לא יחזיר אותו */
(function(){
const $s=s=>document.querySelector(s);
const S={on:false,ids:new Set(),anchor:null,range:false,list:null};
const canDo=a=>typeof can15!=='function'||can15(a);
const rows=()=>[...document.querySelectorAll('#paneList [data-tgl]')].map(b=>({id:b.dataset.tgl,row:b.closest('.row,.it')})).filter(x=>x.row);
const order=()=>{const seen=new Set();return rows().map(x=>x.id).filter(id=>!seen.has(id)&&seen.add(id));};
const items=()=>curList().items.filter(i=>S.ids.has(i.id));
function start(id){if(!curList().items.length)return;S.on=true;S.ids=new Set(id?[id]:[]);S.anchor=id||null;S.range=false;S.list=state.active;decorate();}
function stop(){S.on=false;S.ids.clear();S.anchor=null;S.range=false;document.body.classList.remove('sel88');decorate();}
function pickRange(a,b){const o=order();let i=o.indexOf(a),j=o.indexOf(b);if(i<0||j<0)return;if(i>j)[i,j]=[j,i];for(let k=i;k<=j;k++)S.ids.add(o[k]);}
function tap(id,shift){
  if((shift||S.range)&&S.anchor&&S.anchor!==id){pickRange(S.anchor,id);S.range=false;S.anchor=id;decorate();return;}
  if(S.range&&!S.anchor){S.ids.add(id);S.anchor=id;decorate();return;}
  if(S.ids.has(id))S.ids.delete(id);else S.ids.add(id);S.anchor=id;decorate();}
function bar(){
  const n=S.ids.size,all=order().length,none=!n;
  const b=(attr,label,cls,dis)=>'<button type="button" '+attr+(cls?' class="'+cls+'"':'')+(dis?' disabled':'')+'>'+label+'</button>';
  return '<div class="sel88bar" role="toolbar" aria-label="'+T('פעולות על מוצרים שנבחרו','Actions for selected items')+'">'+
    '<div class="s88r"><span class="s88n" aria-live="polite">☑️ '+T('נבחרו '+n+' מתוך '+all,n+' of '+all+' selected')+'</span>'+b('data-s88="done"','✕ '+T('סיום','Done'),'pri')+'</div>'+
    '<div class="s88r s88sc">'+b('data-s88="all"',n===all&&all?'⬜ '+T('נקה הכל','Select none'):'☑️ '+T('בחר הכל','Select all'))+
      b('data-s88="range" aria-pressed="'+S.range+'"','↕️ '+T('מכאן עד כאן','Range'))+
      b('data-s88="inv"','🔄 '+T('הפוך בחירה','Invert'))+b('data-s88="open"','🔲 '+T('רק מה שלא נקנה','Not bought'))+b('data-s88="bought"','✓ '+T('רק מה שנקנה','Bought'))+'</div>'+
    (S.range?'<div class="s88hint">'+(S.anchor?T('עכשיו לחצו על המוצר האחרון — כל מה שבאמצע ייבחר','Now tap the last item — everything in between is selected'):T('לחצו על המוצר הראשון, ואחר כך על האחרון','Tap the first item, then the last one'))+'</div>':'')+
    '<div class="s88r">'+b('data-s88="check"','✓ '+T('קניתי','Bought'),'',none)+b('data-s88="uncheck"','↩️ '+T('לא נקנה','Not bought'),'',none)+
      b('data-s88="move"','➡️ '+T('העברה לרשימה','Move to list'),'',none)+b('data-s88="copy"','⧉ '+T('העתקה לרשימה','Copy to list'),'',none)+
      b('data-s88="del"','🗑️ '+T('מחיקה','Delete'),'bad',none)+'</div></div>';}
function decorate(){
  const p=$s('#paneList');if(!p)return;
  const old=p.querySelector('.sel88bar');if(old)old.remove();
  if(S.on&&(S.list!==state.active||!curList().items.length)){S.on=false;S.ids.clear();S.anchor=null;S.range=false;}
  document.body.classList.toggle('sel88',S.on);
  const bb=p.querySelector('.buybar');
  if(!S.on){p.querySelectorAll('.s88k').forEach(x=>x.remove());p.querySelectorAll('.s88row').forEach(r=>r.classList.remove('s88row','s88on','s88anc'));
    if(bb&&!bb.querySelector('[data-s88go]'))bb.insertAdjacentHTML('beforeend','<button type="button" class="sec sel88go" data-s88go="1" title="'+T('לבחור כמה מוצרים יחד (גם לחיצה ארוכה על מוצר)','Select several items (or long-press an item)')+'">☑️ '+T('בחירה','Select')+'</button>');
    return;}
  const ex=new Set(curList().items.map(i=>i.id));[...S.ids].forEach(id=>{if(!ex.has(id))S.ids.delete(id);});
  rows().forEach(({id,row})=>{row.classList.add('s88row');const on=S.ids.has(id);row.classList.toggle('s88on',on);row.classList.toggle('s88anc',S.range&&S.anchor===id);row.setAttribute('aria-selected',on?'true':'false');
    let k=row.querySelector('.s88k');if(!k){k=document.createElement('span');k.className='s88k';k.setAttribute('aria-hidden','true');const host=row.querySelector('.bl1')||row;host.prepend(k);}k.textContent=on?'✓':'';});
  const html=bar();if(bb)bb.insertAdjacentHTML('beforebegin',html);else p.insertAdjacentHTML('afterbegin',html);}
const _sRL=renderList;renderList=function(){const r=_sRL.apply(this,arguments);try{decorate();}catch(e){}return r;};
const _sR=render;render=function(){const r=_sR.apply(this,arguments);try{decorate();}catch(e){}return r;};

/* ---------- פעולות ---------- */
function setDone(v){if(!canDo('check')){flash(T('⛔ אין לך הרשאה לסמן מוצרים','⛔ No permission'));return;}
  const me=typeof myName15==='function'?myName15():'';let n=0;items().forEach(i=>{if(!!i.done===v)return;i.done=v;i.ts=Date.now();if(v&&me)i.doneBy=me;else delete i.doneBy;n++;});
  save();render();flash(v?'✓ '+T('סומנו '+n+' מוצרים כנקנו','Marked '+n+' as bought'):'↩️ '+T('בוטל הסימון ב-'+n+' מוצרים','Unmarked '+n+' items'));}
async function delSel(){if(!canDo('delete')){flash(T('⛔ אין לך הרשאה למחוק','⛔ No permission to delete'));return;}
  const l=curList(),its=items();if(!its.length)return;
  if(!(await uiConfirm(T('למחוק '+its.length+' מוצרים מהרשימה "'+l.name+'"?','Delete '+its.length+' items from "'+l.name+'"?'))))return;
  const saved=l.items.map((i,k)=>({i,k})).filter(x=>S.ids.has(x.i.id));
  tombAdd('items',its);l.items=l.items.filter(i=>!S.ids.has(i.id));stop();save();render();
  showUndo(T('נמחקו '+its.length+' מוצרים','Deleted '+its.length+' items'),()=>{const ll=state.lists.find(x=>x.id===l.id);if(!ll)return;
    saved.forEach(({i,k})=>{i.ts=Math.max(Date.now(),(state.tomb&&state.tomb.items&&state.tomb.items[i.id])||0)+1;if(state.tomb&&state.tomb.items)delete state.tomb.items[i.id];ll.items.splice(Math.min(k,ll.items.length),0,i);});save();render();});}
/* מעבירים/מעתיקים לרשימה אחרת. מוצר שכבר מחכה ברשימת היעד — מחברים כמויות במקום לשכפל */
function transfer(target,move){
  const src=curList(),its=items();if(!its.length||!target||target.id===src.id)return;
  if(!Array.isArray(target.items))target.items=[];
  const now=Date.now();let added=0,merged=0;
  its.forEach((i,k)=>{const done=move?!!i.done:false;const ex=!done&&target.items.find(x=>x.n===i.n&&!x.done);
    if(ex){const q=mergeQty(ex.q,i.q);if(q!==ex.q)ex.q=q;ex.ts=now+k;merged++;return;}
    const c=JSON.parse(JSON.stringify(i));c.id=uid();c.ts=now+k;delete c.o;if(!move){c.done=false;delete c.doneBy;}target.items.push(c);added++;});
  if(move){tombAdd('items',its);src.items=src.items.filter(i=>!S.ids.has(i.id));}
  const n=its.length;stop();save();render();
  flash((move?'➡️ '+T('הועברו '+n+' מוצרים','Moved '+n+' items'):'⧉ '+T('הועתקו '+n+' מוצרים','Copied '+n+' items'))+' '+T('לרשימה "'+target.name+'"','to "'+target.name+'"')+(merged?T(' ('+merged+' כבר היו שם — הכמות עודכנה)',' ('+merged+' merged)'):''));}
function pickList(move){
  if(move&&!canDo('delete')){flash(T('⛔ אין לך הרשאה להוציא מוצרים מהרשימה','⛔ No permission'));return;}
  const src=curList(),n=S.ids.size;if(!n)return;
  const others=state.lists.filter(l=>l&&l.id!==src.id);
  const b=openSheet((move?'➡️ '+T('להעביר '+n+' מוצרים ל…','Move '+n+' items to…'):'⧉ '+T('להעתיק '+n+' מוצרים ל…','Copy '+n+' items to…')),
    '<p class="muted-note">'+(move?T('המוצרים יוצאו מ"'+esc(src.name)+'" ויעברו לרשימה שתבחרו.','The items leave "'+esc(src.name)+'" and go to the list you choose.'):T('המוצרים יישארו גם ב"'+esc(src.name)+'".','The items also stay in "'+esc(src.name)+'".'))+'</p>'+
    '<div class="s88list">'+others.map(l=>'<button type="button" data-s88to="'+esc(l.id)+'"><span>🛒 '+esc(l.name)+'</span><small>'+T((l.items||[]).filter(i=>!i.done).length+' מוצרים',(l.items||[]).filter(i=>!i.done).length+' items')+'</small></button>').join('')+
    '<button type="button" class="new" data-s88to="__new"><span>➕ '+T('רשימה חדשה','New list')+'</span></button></div>');
  b.onclick=async e=>{const t=e.target.closest('[data-s88to]');if(!t)return;let target;
    if(t.dataset.s88to==='__new'){const nm=((await uiPrompt(T('שם הרשימה החדשה:','New list name:')))||'').trim().slice(0,40);if(!nm)return;if(hasProfanity(nm)){flash('🙏');return;}
      target={id:uid(),name:nm,items:[],created:Date.now()};state.lists.push(target);}
    else target=state.lists.find(l=>l.id===t.dataset.s88to);
    closeSheet();transfer(target,move);};}

/* ---------- לחיצות ---------- */
let lp=null,skipClick=0;
window.addEventListener('click',e=>{
  if(skipClick&&Date.now()-skipClick<800&&e.target.closest&&e.target.closest('#paneList')){skipClick=0;e.preventDefault();e.stopImmediatePropagation();return;}
  const go=e.target.closest&&e.target.closest('#paneList [data-s88go]');if(go){e.stopImmediatePropagation();start(null);return;}
  if(!S.on)return;
  const a=e.target.closest('#paneList [data-s88]');
  if(a){e.preventDefault();e.stopImmediatePropagation();const k=a.dataset.s88,o=order();
    if(k==='all'){if(S.ids.size===o.length)S.ids.clear();else o.forEach(id=>S.ids.add(id));decorate();}
    else if(k==='range'){S.range=!S.range;decorate();}
    else if(k==='done')stop();
    else if(k==='open'||k==='bought'){const want=k==='bought';S.ids=new Set(curList().items.filter(i=>!!i.done===want&&o.includes(i.id)).map(i=>i.id));decorate();}
    else if(k==='inv'){S.ids=new Set(o.filter(id=>!S.ids.has(id)));decorate();}
    else if(k==='check'||k==='uncheck')setDone(k==='check');
    else if(k==='move'||k==='copy')pickList(k==='move');
    else if(k==='del')delSel();
    return;}
  const r=e.target.closest('#paneList .s88row');if(!r)return;
  const id=(r.querySelector('[data-tgl]')||{}).dataset;if(!id||!id.tgl)return;
  e.preventDefault();e.stopImmediatePropagation();tap(id.tgl,e.shiftKey);},true);
/* לחיצה ארוכה על מוצר: נכנסים לבחירה עם המוצר. בתוך הבחירה — לחיצה ארוכה בוחרת את כל מה שבין המוצר הקודם לזה */
window.addEventListener('pointerdown',e=>{if(e.button>0||!e.target.closest)return;if(e.target.closest('[data-ixdrag],.sel88bar,input,textarea,select'))return;
  const r=e.target.closest('#paneList .row,#paneList .it');const t=r&&r.querySelector('[data-tgl]');if(!t)return;
  clearTimeout(lp&&lp.t);lp={x:e.clientX,y:e.clientY,id:t.dataset.tgl,t:setTimeout(()=>{const id=lp&&lp.id;lp=null;if(!id)return;skipClick=Date.now();
    try{navigator.vibrate&&navigator.vibrate(25);}catch(x){}
    if(!S.on)start(id);else if(S.anchor&&S.anchor!==id){pickRange(S.anchor,id);S.anchor=id;S.range=false;decorate();}else tap(id);},520)};},true);
const lpCancel=()=>{if(lp){clearTimeout(lp.t);lp=null;}};
window.addEventListener('pointermove',e=>{if(lp&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10)lpCancel();},true);
['pointerup','pointercancel','scroll'].forEach(n=>window.addEventListener(n,lpCancel,true));
window.addEventListener('contextmenu',e=>{if((skipClick&&Date.now()-skipClick<800||S.on)&&e.target.closest&&e.target.closest('#paneList .row,#paneList .it'))e.preventDefault();},true);
/* מקלדת: Ctrl+A בוחר את כל הרשימה, Esc יוצא */
document.addEventListener('keydown',e=>{const t=e.target;const typing=t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  if(e.key==='Escape'&&S.on&&!document.querySelector('#v8Sheet.open')){stop();return;}
  if((e.ctrlKey||e.metaKey)&&(e.key==='a'||e.key==='A'||e.code==='KeyA')&&!typing&&typeof tab!=='undefined'&&tab==='list'&&$s('#paneList.on')&&curList().items.length){
    e.preventDefault();if(!S.on)start(null);order().forEach(id=>S.ids.add(id));decorate();}});
window.sel88={start,stop,state:S,decorate};
})();
