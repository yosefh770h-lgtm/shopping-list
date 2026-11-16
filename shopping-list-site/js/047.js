
/* ================= מוצר ברשימה: גרירה לשינוי הסדר, הערה ותמונה מהגלריה ================= */
/* גרירה: ידית ⋮⋮ ליד כל מוצר שעוד לא נקנה (עכבר, מגע, או חצים במקלדת). הסדר נשמר במוצר (o) ועובר לכל המשפחה.
   תמונה: נשמרת מוקטנת (עד 360 פיקסלים) בתוך המוצר, ומוצגת במקום האימוג'י. לחיצה עליה מגדילה. */
(function(){
const $ix=s=>document.querySelector(s);
const ixItem=id=>curList().items.find(x=>x.id===id);
const ixHandle=i=>i.done?'':'<button type="button" class="ixdrag" data-ixdrag="'+esc(i.id)+'" title="'+T('גררו כדי לשנות את הסדר','Drag to reorder')+'" aria-label="'+T('הזזת '+i.n+' (חצים למעלה ולמטה)','Move '+i.n+' (arrow keys)')+'">⋮</button>';
const ixThumb=i=>'<button type="button" class="ixth" data-ixphoto="'+esc(i.id)+'" title="'+T('הגדלת התמונה','View photo')+'" aria-label="'+T('תמונה של '+i.n,'Photo of '+i.n)+'"><img src="'+esc(i.img)+'" alt=""></button>';
const _ixBubble=bubble;
bubble=function(i){let h=_ixBubble.apply(this,arguments);
  if(i.img)h=h.replace('<span class="em">'+esc(i.e)+'</span>',ixThumb(i));
  return h.replace('<div class="bl1">','<div class="bl1">'+ixHandle(i));};
const _ixItemRow=itemRow;
itemRow=function(i){let h=_ixItemRow.apply(this,arguments);
  if(i.img)h=h.replace('<span>'+esc(i.e)+'</span>',ixThumb(i));
  if(i.note)h=h.replace(esc(i.n)+'</span>',esc(i.n)+'<small class="inote">'+esc(i.note)+'</small></span>');
  return h.replace('<div class="it">','<div class="it">'+ixHandle(i));};

/* ---------- סדר ---------- */
/* מזיזים את המוצר לפני/אחרי מוצר אחר. רק המוצר שזז מקבל מקום חדש (באמצע בין השכנים), כדי לא "לגעת" בשאר */
function ixMove(id,targetId,after){
  const l=curList(),its=l.items,from=its.findIndex(x=>x.id===id);if(from<0||id===targetId)return false;
  const it=its.splice(from,1)[0];let to=its.findIndex(x=>x.id===targetId);if(to<0){its.splice(from,0,it);return false;}
  if(after)to++;its.splice(to,0,it);
  const now=Date.now();let ok=true;for(let k=1;k<its.length;k++)if(k!==to&&k!==to+1&&itemKey(its[k])<=itemKey(its[k-1])){ok=false;break;}
  const prev=its[to-1],next=its[to+1];
  if(ok&&(!prev||!next||itemKey(next)-itemKey(prev)>1e-6)){
    it.o=prev&&next?(itemKey(prev)+itemKey(next))/2:prev?itemKey(prev)+1:itemKey(next)-1;it.ts=now;}
  else{/* הסדר הישן לא היה עקבי — ממספרים מחדש את כל הרשימה */
    const base=Math.min(now,itemKey(its[0])||now);its.forEach((x,k)=>{x.o=base+k;x.ts=now;});}
  save();render();return true;}
window.ixMove=ixMove;

const ixRowOf=el=>el.closest('#paneList .row,#paneList .it');
const ixSibs=row=>[...row.parentElement.children].filter(r=>r.matches('.row,.it')&&r.querySelector('[data-ixdrag]'));
let ixDrag=null;
function ixScroller(){return $ix('#paneList');}
document.addEventListener('pointerdown',e=>{const hd=e.target.closest&&e.target.closest('#paneList [data-ixdrag]');if(!hd||e.button>0)return;
  if(typeof can15==='function'&&!can15('add')){flash(T('⛔ אין לך הרשאה לשנות את הרשימה','⛔ No permission'));return;}
  e.preventDefault();const row=ixRowOf(hd);if(!row)return;
  try{hd.setPointerCapture(e.pointerId);}catch(er){}
  ixDrag={id:hd.dataset.ixdrag,hd,row,sibs:ixSibs(row),y0:e.clientY,sc0:ixScroller().scrollTop,moved:false,target:null,after:false,pid:e.pointerId,timer:null,lastY:e.clientY};
});
function ixMark(){const d=ixDrag;d.sibs.forEach(r=>r.classList.remove('ixbefore','ixafter'));d.target=null;
  const y=d.lastY;let best=null;
  d.sibs.forEach(r=>{if(r===d.row)return;const b=r.getBoundingClientRect();const mid=b.top+b.height/2;
    if(y<mid){if(!best||b.top<best.b.top)best={r,b,after:false};}});
  /* מתחת לכל השורות → אחרי האחרונה */
  if(!best){const last=d.sibs.filter(r=>r!==d.row).pop();if(last)best={r:last,after:true};}
  if(!best)return;
  /* אם המקום החדש הוא בדיוק המקום הנוכחי — אין מה להזיז */
  const i=d.sibs.indexOf(d.row),j=d.sibs.indexOf(best.r);
  if((!best.after&&j===i+1)||(best.after&&j===i-1))return;
  d.target=best.r;d.after=best.after;best.r.classList.add(best.after?'ixafter':'ixbefore');}
function ixFollow(){const d=ixDrag;if(!d)return;const sc=ixScroller();
  d.row.style.transform='translateY('+(d.lastY-d.y0+sc.scrollTop-d.sc0)+'px)';ixMark();}
document.addEventListener('pointermove',e=>{const d=ixDrag;if(!d||e.pointerId!==d.pid)return;e.preventDefault();d.lastY=e.clientY;
  if(!d.moved){if(Math.abs(e.clientY-d.y0)<4)return;d.moved=true;d.row.classList.add('ixdragging');document.body.classList.add('ixbusy');}
  ixFollow();
  /* גלילה אוטומטית ליד הקצוות */
  const sc=ixScroller(),b=sc.getBoundingClientRect(),edge=60;clearInterval(d.timer);d.timer=null;
  const sp=e.clientY<b.top+edge?-12:e.clientY>b.bottom-edge-70?12:0;
  if(sp)d.timer=setInterval(()=>{sc.scrollTop+=sp;ixFollow();},30);
},{passive:false});
function ixEnd(e){const d=ixDrag;if(!d||(e&&e.pointerId!==d.pid))return;ixDrag=null;clearInterval(d.timer);
  d.sibs.forEach(r=>r.classList.remove('ixbefore','ixafter'));d.row.classList.remove('ixdragging');d.row.style.transform='';document.body.classList.remove('ixbusy');
  if(!d.moved||!d.target||(e&&e.type==='pointercancel'))return;
  const tid=d.target.querySelector('[data-ixdrag]').dataset.ixdrag;const sc=ixScroller().scrollTop;
  if(ixMove(d.id,tid,d.after)){ixScroller().scrollTop=sc;const h=$ix('#paneList [data-ixdrag="'+d.id+'"]');if(h){const r=ixRowOf(h);r.classList.add('ixdropped');setTimeout(()=>r.classList.remove('ixdropped'),700);}}}
document.addEventListener('pointerup',ixEnd);document.addEventListener('pointercancel',ixEnd);
/* מקלדת: חץ למעלה/למטה מזיז את המוצר צעד אחד */
document.addEventListener('keydown',e=>{const hd=e.target.closest&&e.target.closest('#paneList [data-ixdrag]');if(!hd||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;
  e.preventDefault();const row=ixRowOf(hd),sibs=ixSibs(row),i=sibs.indexOf(row),j=i+(e.key==='ArrowUp'?-1:1);if(j<0||j>=sibs.length)return;
  const id=hd.dataset.ixdrag;if(ixMove(id,sibs[j].querySelector('[data-ixdrag]').dataset.ixdrag,j>i)){const h=$ix('#paneList [data-ixdrag="'+id+'"]');if(h)h.focus();}});
/* לחיצה על הידית לבד לא עושה כלום (וגם לא פותחת עריכה) */
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#paneList [data-ixdrag]')){e.preventDefault();e.stopPropagation();}},true);

/* ---------- תמונה ---------- */
function ixShrink(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const img=new Image();img.onerror=rej;img.onload=()=>{
  let max=360,q=0.72,d='';for(let k=0;k<8;k++){const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*sc));c.height=Math.max(1,Math.round(img.height*sc));
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);d=c.toDataURL('image/jpeg',q);c.width=c.height=0;
    if(d.length<=60000)break;if(q>0.5)q-=0.1;else max=Math.round(max*0.8);}
  d.length<=90000?res(d):rej(new Error('too big'));};img.src=fr.result;};fr.readAsDataURL(file);});}
function ixPhotoHtml(it){return '<div class="ixph" id="ixph"><span class="il">'+T('תמונה של המוצר (למשל האריזה שצריך לקנות)','Product photo')+'</span>'+
  '<div class="ixphrow">'+(it.img?'<img src="'+esc(it.img)+'" alt="'+T('התמונה של '+esc(it.n),'Photo')+'">':'')+
  '<label class="btn sec ixpick">🖼️ '+(it.img?T('החלפת התמונה','Change photo'):T('הוספת תמונה מהגלריה','Add a photo from the gallery'))+'<input type="file" accept="image/*" id="ixFile" hidden></label>'+
  (it.img?'<button type="button" class="btn sec" id="ixRm">🗑️ '+T('הסרת התמונה','Remove photo')+'</button>':'')+'</div></div>';}
const _ixOpenItemEdit=openItemEdit;
openItemEdit=function(id){const res=_ixOpenItemEdit.apply(this,arguments);try{
  const it=ixItem(id),b=$ix('#v8SheetBody'),note=b&&b.querySelector('#ieNote');if(!it||!note)return res;
  note.placeholder=T('למשל: רק בקבוק זכוכית','e.g. glass bottle only');
  note.insertAdjacentHTML('afterend',ixPhotoHtml(it));
  const redraw=()=>{const o=b.querySelector('#ixph');if(o)o.outerHTML=ixPhotoHtml(it);bind();};
  const bind=()=>{const f=b.querySelector('#ixFile');if(f)f.onchange=async()=>{const file=f.files&&f.files[0];if(!file)return;
      try{it.img=await ixShrink(file);it.ts=Date.now();save();render();redraw();flash('🖼️ '+T('התמונה נשמרה','Photo saved'));}catch(er){flash(T('⚠️ לא הצלחתי לפתוח את התמונה','⚠️ Could not open the photo'));}};
    const rm=b.querySelector('#ixRm');if(rm)rm.onclick=()=>{delete it.img;it.ts=Date.now();save();render();redraw();flash('🗑️ '+T('התמונה הוסרה','Photo removed'));};};
  bind();
}catch(e){console.warn('ix edit',e);}return res;};
/* לחיצה על התמונה ברשימה — תמונה גדולה */
$ix('#paneList').addEventListener('click',e=>{const t=e.target.closest('[data-ixphoto]');if(!t)return;e.stopPropagation();const it=ixItem(t.dataset.ixphoto);if(!it||!it.img)return;
  const b=openSheet('🖼️ '+it.n,'<img class="ixbig" src="'+esc(it.img)+'" alt="'+esc(it.n)+'">'+(it.note?'<p class="muted-note">📝 '+esc(it.note)+'</p>':'')+'<div class="row2"><button id="ixEd">✏️ '+T('עריכה','Edit')+'</button></div>');
  b.querySelector('#ixEd').onclick=()=>openItemEdit(it.id);},true);
})();
