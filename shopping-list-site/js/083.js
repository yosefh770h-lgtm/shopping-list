
/* ================= קנייה אחת = סכום אחד: עריכת הסכום של קנייה, מחיקתו, וחיבור קבלה לקנייה שכבר סיימתם =================
   מה היה: קבלה התחברה לבד רק לקנייה מאותו יום ומאותה חנות. קבלה מיום אחר, או משם חנות שנכתב אחרת — נרשמה כקנייה שנייה,
   והסכום נספר פעמיים בהוצאות החודש. עכשיו: בחלון אישור הקבלה בוחרים לאיזו קנייה היא שייכת, ובכל קנייה ("הקניות שלי" ובהיסטוריה)
   אפשר לתקן את הסכום, למחוק אותו, או לחבר אליה קבלה/קנייה. החיבור מסונכרן לכל המשפחה (state.histLinks). */
(function(){
const $t=s=>document.querySelector(s);
const num=v=>{const n=Number(String(v==null?'':v).replace(/[^\d.\-]/g,''));return isFinite(n)?n:0;};
const D=864e5,NEAR=14*D;
const hkey=h=>h.ts+'|'+h.listName;
const api=()=>window.bdApi||null;
const amtOf=h=>{const a=api();return a?a.tripAmt(h):num(h.total);};
if(!SYNC_KEYS.includes('histLinks'))SYNC_KEYS.push('histLinks');
const cleanLinks=a=>(Array.isArray(a)?a:[]).filter(x=>x&&typeof x==='object'&&typeof x.t==='string'&&typeof x.r==='string'&&x.t.length<=200&&x.r.length<=200).map(x=>({t:x.t,r:x.r,at:Number(x.at)||0})).slice(-200);
/* קנייה מהרשימה ↔ קבלה: מה אפשר לחבר (שבועיים לפני או אחרי, הקרובה ביותר והחנות התואמת קודם) */
function partners(h,range){if(!h||h.linked)return [];const want=!h.receipt;
  return (state.history||[]).filter(x=>x&&x!==h&&!x.linked&&!!x.receipt===want&&Math.abs(x.ts-h.ts)<=(range||NEAR))
    .sort((a,b)=>(sameShop(a.store,h.store)?0:1)-(sameShop(b.store,h.store)?0:1)||Math.abs(a.ts-h.ts)-Math.abs(b.ts-h.ts));}
window.tripPartners90=partners;
/* מאחדים: הקנייה מהרשימה נשארת (התאריך שלה), עם המוצרים והמחירים מהקבלה. הסכום — מהקבלה, ואם אין בה — מה שנכתב לקנייה */
function mergeTrips(t,r,fromSync){if(!t||!r||t===r||t.linked)return false;
  const a=api(),aR=amtOf(r),aT=amtOf(t),pR=a&&a.B().paid[String(r.ts)],pT=a&&a.B().paid[String(t.ts)];
  t.listItems=(t.items||[]).map(i=>({n:i.n,q:i.q,e:i.e}));t.items=r.items||[];t.receipt=true;t.linked=true;t.uploadedAt=r.uploadedAt||Date.now();
  if(r.store)t.store=r.store;if(r.branch)t.branch=r.branch;if(num(r.total)>0)t.total=num(r.total);if(r.stocked)t.stocked=true;
  const fin=aR>0?aR:aT;if(a&&fin>0&&(pR||pT)&&!fromSync)a.setPaid(String(t.ts),fin,pR&&pR.c?pR.c:null);
  state.history=state.history.filter(x=>x!==r);
  state.histGone=Array.isArray(state.histGone)?state.histGone:[];state.histGone.push(hkey(r));state.histGone=state.histGone.slice(-200);
  if(!fromSync){state.histLinks=cleanLinks(state.histLinks);state.histLinks.push({t:hkey(t),r:hkey(r),at:Date.now()});state.histLinks=state.histLinks.slice(-200);
    /* בשרת: שורות הקבלה כבר רשומות — מוחקים את שורות הקנייה מהרשימה (כמו באיחוד האוטומטי) */
    try{if(sb&&authUser)sb.from('purchases').delete().eq('bought_at',new Date(t.ts).toISOString()).then(()=>{},()=>{});}catch(e){}}
  return true;}
window.mergeTrips90=mergeTrips;
/* מכשיר אחר חיבר קבלה לקנייה — מחילים גם כאן, והקבלה שנבלעה לא חוזרת מהענן */
function applyLinks(){const L=cleanLinks(state.histLinks);if(!L.length||!Array.isArray(state.history))return false;let ch=false;
  L.forEach(l=>{const r=state.history.find(h=>h&&hkey(h)===l.r);if(!r)return;const t=state.history.find(h=>h&&hkey(h)===l.t);
    if(t&&!t.linked){if(mergeTrips(t,r,true))ch=true;}else if(t&&t.linked){state.history=state.history.filter(h=>h!==r);ch=true;}});
  return ch;}
const _ar=applyRemote;
applyRemote=function(remote){const mine=cleanLinks(state.histLinks);const res=_ar.apply(this,arguments);
  try{const seen=new Set(),all=[];cleanLinks(remote&&remote.histLinks).concat(mine).forEach(x=>{if(seen.has(x.r))return;seen.add(x.r);all.push(x);});state.histLinks=all.slice(-200);applyLinks();}catch(e){console.warn('links',e);}
  return res;};
setTimeout(()=>{try{if(applyLinks()){save();render();}}catch(e){}},0);

const dLine=h=>{const d=new Date(h.ts);return fmtDate(d)+' '+fmtTime(d);};
const label=h=>(h.receipt?'🧾 ':'🛍️ ')+esc(h.store||h.listName||T('קנייה','Shopping'))+' · '+esc(dLine(h))+' · '+(h.items||[]).length+' '+T('מוצרים','items')+(amtOf(h)>0?' · '+fmtPrice(amtOf(h),myCurrency()):'');

/* ---------- חלון אישור הקבלה: "של איזו קנייה הקבלה הזו?" ---------- */
let rcPrefer=0;
window.rcLinkPick=function(ts,store){const s=$t('#urLink');if(!s)return findTwinTrip(ts,store,false);if(s.value==='new')return null;
  return (state.history||[]).find(h=>h&&String(h.ts)===s.value&&!h.receipt&&!h.linked)||null;};
function linkOpts(){const s=$t('#urLink');if(!s)return;const dv=($t('#urDate')||{}).value,ts=/^\d{4}-\d{2}-\d{2}$/.test(dv||'')?new Date(dv+'T12:00:00').getTime():Date.now();const store=($t('#urStore')||{}).value||'';
  const c=partners({ts,store,receipt:true});const auto=findTwinTrip(ts,store,false);
  let pick=s.dataset.touched?s.value:(rcPrefer&&c.some(h=>h.ts===rcPrefer)?String(rcPrefer):auto?String(auto.ts):'new');
  s.innerHTML='<option value="new">🆕 '+T('קנייה חדשה — לא סיימתי אותה ברשימה','A new purchase — not finished in a list')+'</option>'+c.map(h=>'<option value="'+h.ts+'">'+label(h)+'</option>').join('');
  if(!s.querySelector('option[value="'+pick+'"]'))pick='new';s.value=pick;
  const n=$t('#urLinkNote');if(n)n.textContent=pick==='new'?(c.length?T('יש '+c.length+' קניות מהשבועיים האלה. אם הקבלה היא של אחת מהן — בחרו אותה, והסכום ייספר פעם אחת.','Pick the purchase if this receipt belongs to one — it will be counted once.'):T('לא מצאתי קנייה מהרשימה מהשבועיים האלה — הקבלה תישמר כקנייה חדשה.','No finished list nearby — saved as a new purchase.')):
    T('הקבלה תצטרף לקנייה הזו: תישאר קנייה אחת, עם המוצרים והמחירים מהקבלה, והסכום ייספר פעם אחת.','The receipt joins this purchase and is counted once.');}
const _show=showUploadReview;
showUploadReview=function(){const res=_show.apply(this,arguments);try{if(upMode!=='receipt')return res;const h=$t('#urHist');if(!h||$t('#urLink'))return res;
  h.closest('label').insertAdjacentHTML('afterend','<div class="lk90"><label class="il" for="urLink">🔗 '+T('של איזו קנייה הקבלה הזו?','Which purchase is this receipt for?')+'</label><select id="urLink"></select><small id="urLinkNote" class="muted-note" role="status"></small></div>');
  linkOpts();const s=$t('#urLink');s.onchange=()=>{s.dataset.touched='1';linkOpts();};
  ['#urDate','#urStore'].forEach(id=>{const x=$t(id);if(x)x.addEventListener('change',linkOpts);});
  h.addEventListener('change',()=>{s.disabled=!h.checked;});}catch(e){console.warn('rc link',e);}return res;};
/* הקבלה הצטרפה לקנייה שכבר כתבתם לה סכום — הסכום שבקבלה מחליף אותו (ולא נוסף עליו) */
const _conf=confirmUpload;
confirmUpload=async function(){const t0=Date.now();let tot=0,s=null;try{if(upMode==='receipt'){tot=num(upResult&&upResult.receipt&&upResult.receipt.total);s=window.rcLinkPick(0,'');}}catch(e){}
  const res=await _conf.apply(this,arguments);
  try{const a=api();if(s&&s.linked&&(s.uploadedAt||0)>=t0&&tot>0&&a){const p=a.B().paid[String(s.ts)];if(p&&(p.a>0||p.z)&&Math.abs(p.a-tot)>0.01){a.setPaid(String(s.ts),tot,null);flash('🔗 '+T('הקבלה צורפה לקנייה — הסכום עודכן ל-','Joined — the amount is now ')+fmtPrice(tot,myCurrency())+T(' (נספר פעם אחת)',' (counted once)'));}}}catch(e){}
  rcPrefer=0;return res;};

/* ---------- חלון לכל קנייה: הסכום, מחיקת הסכום, וחיבור לקבלה ---------- */
function refresh(){try{render();}catch(e){}try{const mo=$t('#meOverlay');if(mo&&mo.classList.contains('open'))renderMe();}catch(e){}}
function openTripTool(h){if(!h)return;const old=$t('#tr90');if(old)old.remove();const cur=myCurrency(),a=amtOf(h),noBd=document.body.classList.contains('nobd21')||!api();
  const p=api()&&api().B().paid[String(h.ts)],cleared=!!(p&&p.z),c=partners(h);
  const ov=document.createElement('div');ov.id='tr90';ov.className='qp15 open';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-labelledby','tr90T');
  ov.innerHTML='<div class="qpcard tr90"><div class="qphead"><b id="tr90T">'+(h.receipt?'🧾 ':'🛍️ ')+esc(h.store||h.listName||T('קנייה','Shopping'))+'</b><button aria-label="'+T('סגירה','Close')+'" data-x>✕</button></div>'+
    '<p class="muted-note" style="margin:0 0 8px">'+esc(dLine(h))+' · '+(h.items||[]).length+' '+T('מוצרים','items')+' · '+(h.linked?'🔗 '+T('סיום קנייה + קבלה — נספרת פעם אחת','List + receipt — counted once'):h.receipt?'🧾 '+T('קבלה','Receipt'):'✅ '+T('סיום קנייה','Finished list'))+'</p>'+
    (noBd?'':'<label class="il" for="tr90A">💰 '+T('כמה יצאה הקנייה','Amount paid')+'</label><div class="bd50row"><input id="tr90A" type="number" inputmode="decimal" min="0" step="0.1" value="'+(a>0?a:'')+'" placeholder="'+(cleared?T('הסכום נמחק','Cleared'):T('סכום','Amount'))+' ('+esc(cur)+')"><button id="tr90S">💾 '+T('שמירה','Save')+'</button></div>'+
      (a>0?'<button class="btn sec tr90del" id="tr90C">🗑️ '+T('מחיקת הסכום (טעיתי)','Clear the amount')+'</button>':'')+
      '<p class="muted-note">'+(cleared?T('הסכום נמחק — הקנייה לא נספרת בהוצאות החודש עד שתכתבו סכום.','Cleared — not counted until you enter an amount.'):T('זה הסכום שנספר בתקציב הבית ובהוצאות החודש.','This amount is counted in the home budget.'))+'</p>')+
    (h.linked?'':'<h5 class="tr90h">🔗 '+(h.receipt?T('של איזו קנייה הקבלה הזו?','Which purchase is this receipt for?'):T('יש קבלה על הקנייה הזו?','Is there a receipt for this purchase?'))+'</h5>'+
      (c.length?'<p class="muted-note" style="margin:0 0 6px">'+T('בוחרים — ותישאר קנייה אחת, עם המוצרים והמחירים מהקבלה, שנספרת פעם אחת.','Pick one — they become one purchase, counted once.')+'</p>'+c.slice(0,8).map(x=>'<button class="tr90c" data-trlink="'+x.ts+'">'+label(x)+'</button>').join(''):
        '<p class="muted-note">'+(h.receipt?T('אין קנייה מהרשימה מהשבועיים האלה.','No finished list nearby.'):T('אין קבלה מהשבועיים האלה שעוד לא חוברה.','No unlinked receipt nearby.'))+'</p>')+
      (h.receipt?'':'<button class="btn sec" id="tr90U" style="width:100%;margin-top:6px">🧾 '+T('להעלות את הקבלה של הקנייה הזו','Upload this purchase\'s receipt')+'</button>'))+'</div>';
  document.body.appendChild(ov);const close=()=>{ov.remove();document.removeEventListener('keydown',esc9,true);};const esc9=e=>{if(e.key==='Escape'){e.preventDefault();close();}};document.addEventListener('keydown',esc9,true);
  const inp=ov.querySelector('#tr90A');setTimeout(()=>{(inp||ov.querySelector('[data-x]')).focus();},50);
  ov.addEventListener('click',async e=>{if(e.target===ov||e.target.closest('[data-x]')){close();return;}
    if(e.target.closest('#tr90S')){if(!(num(inp.value)>0)){flash('⚠️ '+T('כתבו כמה יצא — או "מחיקת הסכום"','Enter an amount'));inp.focus();return;}api().setPaid(String(h.ts),inp.value,null);close();refresh();flash('💾 '+T('הסכום עודכן: ','Amount updated: ')+fmtPrice(num(inp.value),cur));return;}
    if(e.target.closest('#tr90C')){if(!(await uiConfirm(T('למחוק את הסכום של הקנייה הזו? היא לא תיספר בהוצאות החודש עד שתכתבו סכום חדש.','Clear this purchase amount?'))))return;api().setPaid(String(h.ts),'clear',null);close();refresh();flash('🗑️ '+T('הסכום נמחק','Amount cleared'));return;}
    if(e.target.closest('#tr90U')){close();rcPrefer=h.ts;const mo=$t('#meOverlay');if(mo)mo.classList.remove('open');openUpload('receipt');return;}
    const l=e.target.closest('[data-trlink]');if(l){const x=(state.history||[]).find(y=>String(y.ts)===l.dataset.trlink);if(!x)return;const t=h.receipt?x:h,r=h.receipt?h:x;
      const fin=amtOf(r)>0?amtOf(r):amtOf(t);
      if(!(await uiConfirm(T('לחבר את הקבלה לקנייה מ-'+dLine(t)+'?\nתישאר קנייה אחת, עם המוצרים והמחירים מהקבלה'+(fin>0?', והסכום ('+fmtPrice(fin,cur)+') ייספר פעם אחת':'')+'.','Join the receipt to this purchase? It will be counted once.'))))return;
      if(mergeTrips(t,r)){save();close();refresh();flash('🔗 '+T('חוברו — הקנייה נספרת פעם אחת','Joined — counted once')+(fin>0?' · '+fmtPrice(fin,cur):''));}return;}});
  inp&&(inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();ov.querySelector('#tr90S').click();}});}
window.openTripTool90=openTripTool;
document.addEventListener('click',e=>{const b=e.target.closest('[data-trtool]');if(!b)return;e.preventDefault();e.stopPropagation();openTripTool((state.history||[])[+b.dataset.trtool]);},true);
/* קבלה וקנייה מאותם ימים שעוד לא חוברו — כנראה אותה קנייה שנספרה פעמיים */
const maybeDup=h=>!h.linked&&partners(h,2*D).length>0;
const toolBtn=(i,h,cls)=>'<button class="'+cls+' tr90b'+(maybeDup(h)?' tr90warn':'')+'" data-trtool="'+i+'">'+(maybeDup(h)?'⚠️ '+T('אולי נספרה פעמיים — לחבר','Maybe counted twice — join'):'💰 '+T('סכום וקבלה','Amount & receipt'))+'</button>';
/* "הקניות שלי" באזור האישי */
const _rm=renderMe;
renderMe=function(){const res=_rm.apply(this,arguments);try{if(meTab!=='purchases')return res;
  document.querySelectorAll('#meBody .purcard').forEach(c=>{if(c.querySelector('[data-trtool]'))return;const b=c.querySelector('[data-puradd]');if(!b)return;const i=+b.dataset.puradd,h=state.history[i];if(!h)return;
    const a=amtOf(h),row=c.querySelector('.merow');if(row&&!document.body.classList.contains('nobd21'))row.insertAdjacentHTML('beforeend','<b class="tr90amt">'+(a>0?fmtPrice(a,myCurrency()):'—')+'</b>');
    b.parentNode.insertAdjacentHTML('afterend',toolBtn(i,h,'mini'));});}catch(e){console.warn('tr90',e);}return res;};
/* ההיסטוריה (העיצוב החדש / האפליקציה) */
const _rh=renderHist;
renderHist=function(){const res=_rh.apply(this,arguments);try{document.querySelectorAll('#paneHist .r2hw').forEach(w=>{const r=w.querySelector('[data-r2h]'),x=w.querySelector('.r2hx');if(!r||!x||x.querySelector('[data-trtool]'))return;
    const i=+r.dataset.r2h,h=state.history[i];if(!h)return;x.insertAdjacentHTML('beforeend',toolBtn(i,h,'chip'));if(maybeDup(h)&&!r.querySelector('.tr90dot'))r.querySelector('.r2hn small')&&r.querySelector('.r2hn small').insertAdjacentHTML('beforeend',' <span class="tr90dot">⚠️ '+T('אולי פעמיים','maybe twice')+'</span>');});}catch(e){console.warn('tr90h',e);}return res;};
})();
