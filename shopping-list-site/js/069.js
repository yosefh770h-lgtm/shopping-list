
/* ================= 72: "הבית שלי" — מחיקה, "אין לי" לא חוזר לבד, וסידורים בגרירה עם עיגול דחיפות ================= */
(function(){
/* ---------- מתי השתנה כל מוצר בבית (homeMod) ----------
   בעבר הסנכרון איחד את "יש בבית" משני המכשירים, אז מוצר שסימנו "אין לי" חזר ממכשיר אחר (או מהאפליקציה) אחרי זמן מה.
   עכשיו לכל מוצר נשמר מתי שינו אותו, ובסנכרון השינוי האחרון מנצח — גם במחיקה. */
if(!SYNC_KEYS.includes('homeMod'))SYNC_KEYS.push('homeMod');
const HM_DAYS=180,HM_MAX=4000,BADK=/^(__proto__|constructor|prototype)$/;
function hmClean(m){if(!m||typeof m!=='object'||Array.isArray(m))return {};const now=Date.now(),lim=now-HM_DAYS*864e5,cap=now+864e5;
  return Object.fromEntries(Object.entries(m).filter(([k,v])=>k&&k.length<=200&&!BADK.test(k)&&typeof v==='number'&&isFinite(v)&&v>=lim&&v<=cap).sort((a,b)=>b[1]-a[1]).slice(0,HM_MAX));}
function hmMerge(a,b){const o=Object.assign({},a);Object.keys(b).forEach(k=>{if(!(o[k]>=b[k]))o[k]=b[k];});return hmClean(o);}
state.homeMod=hmClean(state.homeMod);
function homeTouch(n){const k=pkey(n);if(!k||BADK.test(k))return;const m=state.homeMod=state.homeMod||{};m[k]=Math.max(Date.now(),(m[k]||0)+1);}
window.homeTouch=homeTouch;
const _hmStock=stockSet;stockSet=function(n){const r=_hmStock.apply(this,arguments);try{homeTouch(n);}catch(e){}return r;};
const _hmPantry=pantrySet;pantrySet=function(n){const r=_hmPantry.apply(this,arguments);try{homeTouch(n);}catch(e){}return r;};
/* מוצרים מהמאגר הקבוע (לא מה שהמשתמש הוסיף) — כדי לדעת מה מוחקים לגמרי */
const CAT0=new Set(Object.keys(P).filter(n=>!(state.customPantry||[]).includes(n)));
const custOf=(arr,k)=>(Array.isArray(arr)?arr:[]).filter(c=>typeof c==='string'&&pkey(c)===k);
function hmStatus(src,k){return {p:!!(src.pantry&&src.pantry[k]),s:src.stock&&src.stock[k]&&typeof src.stock[k]==='object'?JSON.parse(JSON.stringify(src.stock[k])):null,
  m:Array.isArray(src.missingHome)&&src.missingHome.some(x=>x===k||(typeof x==='string'&&pkey(x)===k)),c:custOf(src.customPantry,k)};}
function hmPut(k,st){state.pantry=state.pantry||{};state.stock=state.stock||{};
  if(st.p)state.pantry[k]=true;else delete state.pantry[k];
  if(st.s)state.stock[k]=st.s;else delete state.stock[k];
  state.missingHome=(state.missingHome||[]).filter(x=>x!==k&&pkey(x)!==k);if(st.m&&!st.p)state.missingHome.push(k);
  const was=custOf(state.customPantry,k);state.customPantry=(state.customPantry||[]).filter(c=>pkey(c)!==k).concat(st.c);
  st.c.forEach(n=>{if(!P[n]){P[n]={e:'🛒',c:'אחר'};NORMP[norm(n)]=n;}});
  was.forEach(n=>{if(!st.c.includes(n)&&!CAT0.has(n))delete P[n];});}
let homeFix=null;
const _hmApply=applyRemote;
applyRemote=function(remote,replace){
  const loc={pantry:Object.assign({},state.pantry||{}),stock:JSON.parse(JSON.stringify(state.stock||{})),missingHome:(state.missingHome||[]).slice(),customPantry:(state.customPantry||[]).slice()};
  const lm=hmClean(state.homeMod);
  const r=_hmApply.apply(this,arguments);
  try{homeFix=null;if(!remote||typeof remote!=='object')return r;
    const rm=hmClean(remote.homeMod);
    if(replace){state.homeMod=rm;return r;}
    const fix={};
    new Set(Object.keys(lm).concat(Object.keys(rm))).forEach(k=>{const lt=lm[k]||0,rt=rm[k]||0;if(lt===rt)return;fix[k]=rt>lt?hmStatus(remote,k):hmStatus(loc,k);});
    Object.keys(fix).forEach(k=>hmPut(k,fix[k]));
    state.homeMod=hmMerge(lm,rm);homeFix=fix;
  }catch(e){console.warn('home sync',e);}
  return r;};
/* משתמש משני: אחרי המשיכה הקוד הישן דורס את המלאי — מחזירים את מה שהוחלט */
if(typeof pullSecondary15==='function'){const _hmPull=pullSecondary15;
  pullSecondary15=async function(){homeFix=null;const r=await _hmPull.apply(this,arguments);
    try{if(homeFix&&Object.keys(homeFix).length){const f=homeFix;homeFix=null;Object.keys(f).forEach(k=>hmPut(k,f[k]));save(true);if(document.querySelector('#paneHome.on'))renderHome();}}catch(e){}
    return r;};}
onLogout('reset',()=>{state.homeMod={};});

/* ---------- מחיקה מ"הבית שלי" ---------- */
function homeDelete(names){const ks=new Set((names||[]).map(pkey).filter(Boolean));
  ks.forEach(k=>{hmPut(k,{p:false,s:null,m:false,c:[]});homeTouch(k);});
  return ks.size;}
window.homeDelete=homeDelete;
/* ה-✕ הישן על מוצר שהוספתי — מוחק באמת (ולא מעביר ל"נגמר") */
removeCustomPantryItem=function(name){homeDelete([name]);save();renderHome();flash('🗑️ "'+name+'" '+T('נמחק מ"הבית שלי"','deleted from My home'));};

/* ---------- 📌 סידורים: עיגול דחיפות ---------- */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button[data-epr]');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  const x=(state.errands||[]).find(y=>y.id===b.dataset.epr);if(!x)return;
  const nx=(errPr(x)+1)%4;const sheetOpen=!!b.closest('#v8SheetBody');
  errSet(x.id,{pr:nx});
  if(sheetOpen){const row=b.closest('.err17');if(row)row.outerHTML=errRow(x,false);}
  flash(['⚪ '+T('בלי סימון','No mark'),'🟢 '+T('לא דחוף','Not urgent'),'🟠 '+T('דחוף','Urgent'),'🔴 '+T('דחוף מאוד','Very urgent')][nx]);
},true);

/* ---------- 📌 סידורים: גרירה לשינוי הסדר (עכבר, מגע, או חצים במקלדת) ---------- */
function errReorder(ids){const now=Date.now();ids.forEach((id,i)=>{const x=(state.errands||[]).find(y=>y.id===id);if(x){x.o=i+1;x.ts=now;}});save();render();}
const eRows=list=>[...list.querySelectorAll(':scope>.err17')].filter(r=>r.querySelector('[data-edrag]'));
const eIds=list=>eRows(list).map(r=>r.dataset.eid);
function eScroller(el){for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const cs=getComputedStyle(p);if(/(auto|scroll)/.test(cs.overflowY)&&p.scrollHeight>p.clientHeight)return p;}return document.scrollingElement||document.documentElement;}
let ed=null;
document.addEventListener('pointerdown',e=>{const hd=e.target.closest&&e.target.closest('.er17list [data-edrag]');if(!hd||e.button>0)return;
  e.preventDefault();const row=hd.closest('.err17'),list=row&&row.parentElement;if(!row)return;
  try{hd.setPointerCapture(e.pointerId);}catch(er){}
  const sc=eScroller(list);
  ed={row,list,sibs:eRows(list),y0:e.clientY,sc,sc0:sc.scrollTop,moved:false,target:null,after:false,pid:e.pointerId,timer:null,lastY:e.clientY};});
function eMark(){const d=ed;d.sibs.forEach(r=>r.classList.remove('ebefore','eafter'));d.target=null;let best=null;
  d.sibs.forEach(r=>{if(r===d.row)return;const b=r.getBoundingClientRect();if(d.lastY<b.top+b.height/2&&(!best||b.top<best.b.top))best={r,b,after:false};});
  if(!best){const last=d.sibs.filter(r=>r!==d.row).pop();if(last)best={r:last,after:true};}
  if(!best)return;const i=d.sibs.indexOf(d.row),j=d.sibs.indexOf(best.r);
  if((!best.after&&j===i+1)||(best.after&&j===i-1))return;
  d.target=best.r;d.after=best.after;best.r.classList.add(best.after?'eafter':'ebefore');}
function eFollow(){const d=ed;if(!d)return;d.row.style.transform='translateY('+(d.lastY-d.y0+d.sc.scrollTop-d.sc0)+'px)';eMark();}
document.addEventListener('pointermove',e=>{const d=ed;if(!d||e.pointerId!==d.pid)return;e.preventDefault();d.lastY=e.clientY;
  if(!d.moved){if(Math.abs(e.clientY-d.y0)<4)return;d.moved=true;d.row.classList.add('edragging');document.body.classList.add('ebusy');}
  eFollow();
  const b=d.sc.getBoundingClientRect(),top=Math.max(0,b.top),bot=Math.min(innerHeight,b.bottom),edge=50;clearInterval(d.timer);d.timer=null;
  const sp=e.clientY<top+edge?-10:e.clientY>bot-edge?10:0;if(sp)d.timer=setInterval(()=>{d.sc.scrollTop+=sp;eFollow();},30);
},{passive:false});
function eEnd(e){const d=ed;if(!d||(e&&e.pointerId!==d.pid))return;ed=null;clearInterval(d.timer);
  d.sibs.forEach(r=>r.classList.remove('ebefore','eafter'));d.row.classList.remove('edragging');d.row.style.transform='';document.body.classList.remove('ebusy');
  if(!d.moved||!d.target||(e&&e.type==='pointercancel'))return;
  if(d.after)d.target.after(d.row);else d.target.before(d.row);
  errReorder(eIds(d.list));}
document.addEventListener('pointerup',eEnd);document.addEventListener('pointercancel',eEnd);
document.addEventListener('keydown',e=>{const hd=e.target.closest&&e.target.closest('.er17list [data-edrag]');if(!hd||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;
  e.preventDefault();const row=hd.closest('.err17'),list=row.parentElement,rs=eRows(list),i=rs.indexOf(row),j=i+(e.key==='ArrowUp'?-1:1);if(j<0||j>=rs.length)return;
  if(j<i)rs[j].before(row);else rs[j].after(row);errReorder(eIds(list));hd.focus();});
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-edrag]')){e.preventDefault();e.stopPropagation();}},true);
})();
