
/* ================= v26: עשרה דברים שמחזירים לאתר =================
   1 💰 כמה חסכתי · 2 🛒 הסל השבועי — איפה הכי זול השבוע · 3 🔔 התראת מחיר על מוצר · 4 🧮 כמה לקנות לשבת/לאירוע
   5 📋 רשימות לאירועים · 6 🛍️ מצב קנייה בחנות · 7 📲 קיצורי דרך מהאייקון · 8 👀 ניסיון בלי הרשמה
   9 🏆 המדווחים של החודש · 10 💌 הזמנת חברים */
const $26=s=>document.querySelector(s);
const mKey26=d=>{d=new Date(d);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
const HE_MONTHS26=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const mName26=k=>{const [y,m]=k.split('-');return T(HE_MONTHS26[+m-1],new Date(+y,+m-1,1).toLocaleString('en',{month:'long'}))+' '+y;};
(function(){const st=document.createElement('style');st.textContent=
  '.v26card{border:1px solid var(--chipbr);border-radius:14px;padding:12px 14px;margin:8px 0;background:var(--inputbg)}'+
  '.v26big{font-size:30px;font-weight:800;color:var(--hdr2);line-height:1.2}.v26row{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}.v26row:last-child{border-bottom:none}'+
  '.v26bars{display:flex;align-items:flex-end;gap:6px;height:90px;margin-top:8px}.v26bars div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;font-size:11px;color:var(--muted)}.v26bars i{display:block;width:100%;background:var(--hdr2);border-radius:5px 5px 0 0;min-height:2px}'+
  '.v26me{background:rgba(30,58,95,.12);border-radius:10px}.v26badge{display:inline-block;background:#f3c623;color:#2b2b26;border-radius:12px;padding:2px 10px;font-weight:700;font-size:13px}'+
  '.v26calc table{width:100%;border-collapse:collapse}.v26calc td{padding:6px 4px;border-bottom:1px solid var(--line)}.v26calc input[type=number]{width:90px}'+
  '#shop26{position:fixed;inset:0;z-index:9000;background:var(--chat,#f6f3ec);color:var(--text);display:flex;flex-direction:column}#shop26[hidden]{display:none}'+
  '#shop26 header{background:var(--hdr);color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px}#shop26 header b{flex:1;font-size:18px}#shop26 header button{background:rgba(255,255,255,.18);color:#fff;border:none;border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer}'+
  '#shop26 .sbody{flex:1;overflow-y:auto;padding:8px 12px 90px}#shop26 h3{margin:14px 4px 6px;font-size:15px;color:var(--hdr2)}'+
  '#shop26 .srow>span.sim26,body.r2 #shop26 .srow>span.sim26:nth-child(n){display:block!important;width:52px;height:52px;flex:none;border-radius:10px;overflow:hidden;background:#fff;border:1px solid var(--line);cursor:zoom-in}#shop26 .sim26 img{width:100%;height:100%;object-fit:cover;display:block}#shop26 .srow.done .sim26{opacity:.45}'+
  '#shop26 .srow{display:flex;align-items:center;gap:12px;width:100%;text-align:right;background:var(--inputbg);color:var(--text);border:1px solid var(--chipbr);border-radius:14px;padding:14px;margin:6px 0;font:inherit;font-size:20px;cursor:pointer;min-height:58px}'+
  '#shop26 .srow .ck{width:30px;height:30px;border-radius:50%;border:2px solid var(--hdr2);flex:none;display:flex;align-items:center;justify-content:center;font-size:18px}#shop26 .srow.done{background:transparent;border-style:dashed}#shop26 .srow.done .ck{background:var(--hdr2);color:#fff}#shop26 .srow.done .nm{text-decoration:line-through}#shop26 .srow .q{margin-inline-start:auto;font-size:15px;color:var(--muted)}'+
  '#shop26 footer{position:absolute;bottom:0;inset-inline:0;padding:10px 12px;background:var(--panel);border-top:1px solid var(--line);display:flex;gap:8px;align-items:center}#shop26 footer .pg{flex:1;font-weight:700}#shop26 footer button{padding:12px 16px;border-radius:12px;border:none;background:var(--hdr2);color:#fff;font:inherit;font-weight:700;cursor:pointer}'+
  '.guest26{display:flex;align-items:center;gap:8px;background:#fff6d6;color:#5a4a00;border-bottom:1px solid #eadb9a;padding:8px 14px;font-size:14px}.guest26 b{flex:1}.guest26 button{background:var(--hdr2);color:#fff;border:none;border-radius:10px;padding:6px 12px;font:inherit;cursor:pointer}'+
  'body.dark .guest26{background:#3a3418;color:#f3e6a8;border-color:#5a5226}';
  document.head.appendChild(st);})();
const add26=(id,ic,he,en,after,fn)=>{const m=$26('#hMenu');if(!m||$26('#'+id))return;const b=document.createElement('button');b.id=id;b.innerHTML=ic+'<span>'+T(he,en)+'</span>';
  const a=after&&$26('#'+after);if(a&&m.contains(a))a.after(b);else m.appendChild(b);b.onclick=()=>{m.classList.remove('open');fn();};};
const needLogin26=()=>{if(sb&&authUser)return false;flash(T('🙂 צריך להיות מחוברים — ההרשמה בחינם','🙂 Please sign in — it is free'));if(state.user&&state.user.guest)showLogin();return true;};

/* ---------- 1. 💰 כמה חסכתי ---------- */
state.savings=Array.isArray(state.savings)?state.savings:[];
state.basketSnaps=Array.isArray(state.basketSnaps)?state.basketSnaps:[];
function savAdd26(o){if(!Array.isArray(state.savings))state.savings=[];if(!(o.amt>0.009))return;if(o.key&&state.savings.some(x=>x.key===o.key))return;state.savings.push(Object.assign({ts:Date.now()},o,{amt:Math.round(o.amt*100)/100}));if(state.savings.length>400)state.savings=state.savings.slice(-400);save();}
/* כל השוואת "איפה הכי זול" נשמרת לכמה ימים — כשמסיימים קנייה באחת החנויות, החיסכון = החנות היקרה פחות זו שבחרתם */
const _v26Basket=basketCompare;
basketCompare=async function(itemsArg){const r=await _v26Basket.apply(this,arguments);
  try{if(!Array.isArray(state.basketSnaps))state.basketSnaps=[];if(r&&r.rows&&r.rows.length>1){const full=r.rows.filter(x=>x.keys.length===r.found.length);
    if(full.length>1){state.basketSnaps.unshift({ts:Date.now(),rows:full.map(x=>({chain:x.chain,sum:x.sum}))});state.basketSnaps=state.basketSnaps.filter(s=>Date.now()-s.ts<7*DAY_MS).slice(0,12);save();}}}catch(e){}
  return r;};
function savFromHistory26(){if(!Array.isArray(state.savings))state.savings=[];if(!Array.isArray(state.basketSnaps))state.basketSnaps=[];
  const same=(a,b)=>{a=norm(a||'').toLowerCase();b=norm(b||'').toLowerCase();return !!a&&!!b&&(a.includes(b)||b.includes(a));};
  (state.history||[]).slice(0,30).forEach(h=>{if(!h.store||(h.receipt&&!h.linked))return;const key='bk-'+h.ts;if(state.savings.some(x=>x.key===key))return;
    const snap=state.basketSnaps.find(s=>s.ts<=h.ts&&h.ts-s.ts<3*DAY_MS&&s.rows.some(r=>same(r.chain,h.store)));if(!snap)return;
    const mine=snap.rows.find(r=>same(r.chain,h.store)),max=Math.max(...snap.rows.map(r=>r.sum));
    savAdd26({key,ts:h.ts,amt:max-mine.sum,src:'basket',store:h.store});});
}
/* קבלה: ההנחות והמבצעים שבקבלה */
const _v26Confirm=confirmUpload;
confirmUpload=async function(){let disc=0,store='',key='';
  try{if(upMode==='receipt'&&upResult&&upResult.receipt){const r=upResult.receipt;disc=(r.items||[]).reduce((a,o)=>a+Math.abs(Number(o.discount)||0),0)||Math.abs(Number(r.discounts_total)||0);disc+=Math.abs(Number(r.general_discount)||0);store=String(r.store||'');key='rc-'+(r.date||'')+'-'+store+'-'+(r.total||'');}}catch(e){}
  const t0=Date.now();const res=await _v26Confirm.apply(this,arguments);
  if(disc>0&&state.history.some(h=>h.receipt&&h.uploadedAt>=t0))savAdd26({key,amt:disc,src:'receipt',store});
  return res;};
function savMonths26(){savFromHistory26();const by={};state.savings.forEach(s=>{const k=mKey26(s.ts);(by[k]=by[k]||{sum:0,basket:0,receipt:0,n:0});by[k].sum+=s.amt;by[k][s.src]=(by[k][s.src]||0)+s.amt;by[k].n++;});return by;}
function openSavings26(){
  const by=savMonths26(),cur=myCurrency(),now=new Date(),k=mKey26(now);const m=by[k]||{sum:0,basket:0,receipt:0,n:0};
  const months=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(mKey26(d));}
  const mx=Math.max(1,...months.map(x=>(by[x]||{}).sum||0));const total=Object.values(by).reduce((a,x)=>a+x.sum,0);
  let h='<div class="v26card" style="text-align:center"><div>'+T('החודש חסכת','You saved this month')+'</div><div class="v26big">'+fmtPrice(m.sum,cur)+'</div><small class="muted-note">'+mName26(k)+(total>m.sum?' · '+T('מאז ההתחלה: ','All time: ')+fmtPrice(total,cur):'')+'</small></div>';
  h+='<div class="v26card"><div class="v26row"><span>🧩 '+T('בחרת חנות זולה יותר (לפי "איפה הכי זול")','Picked a cheaper store')+'</span><b>'+fmtPrice(m.basket||0,cur)+'</b></div><div class="v26row"><span>🧾 '+T('הנחות ומבצעים בקבלות','Receipt discounts')+'</span><b>'+fmtPrice(m.receipt||0,cur)+'</b></div></div>';
  h+='<div class="v26card"><b>'+T('6 החודשים האחרונים','Last 6 months')+'</b><div class="v26bars" role="img" aria-label="'+esc(months.map(x=>mName26(x)+': '+fmtPrice((by[x]||{}).sum||0,cur)).join(', '))+'">'+months.map(x=>{const v=(by[x]||{}).sum||0;return '<div><span>'+(v?Math.round(v):'')+'</span><i style="height:'+Math.round(70*v/mx)+'px"></i><span>'+esc(mName26(x).split(' ')[0].slice(0,3))+'</span></div>';}).join('')+'</div></div>';
  h+='<p class="muted-note">💡 '+T('איך חוסכים עוד? לפני הקנייה — "💰 איפה הכי זול?" ברשימה, ואחרי הקנייה — מסיימים קנייה עם שם החנות או מצלמים את הקבלה. החישוב נעשה במכשיר שלך בלבד.','Tip: check "Cheapest store?" before shopping, then finish with the store name or upload the receipt. Calculated on your device only.')+'</p>';
  openSheet('💰 '+T('כמה חסכתי','My savings'),h);
}
/* סיכום חודשי: בתחילת חודש — הודעה בפעמון על החודש שעבר */
function savMonthly26(){try{const now=new Date(),prev=mKey26(new Date(now.getFullYear(),now.getMonth()-1,1));const v=(savMonths26()[prev]||{}).sum||0;
  if(v>=1)notify('sav-'+prev,'deal','🎉 '+T('ב'+mName26(prev)+' חסכת '+fmtPrice(v,myCurrency()),'You saved '+fmtPrice(v,myCurrency())+' in '+mName26(prev)),T('לחצו על "💰 כמה חסכתי" בתפריט לפירוט','Open "My savings" for details'),'list');}catch(e){}}

/* ---------- 2. 🛒 הסל השבועי: הפריטים הקבועים + מה שקונים הכי הרבה ---------- */
function weeklyItems26(){const out=new Map();
  try{(state.recurring||[]).filter(r=>!r.del).forEach(r=>out.set(norm(r.n),{n:r.n,q:r.q||''}));}catch(e){}
  try{const H=habits();Object.values(H.prods||H.products||{}).sort((a,b)=>b.count-a.count).forEach(p=>{if(out.size<25&&p.count>=3&&!out.has(norm(p.n)))out.set(norm(p.n),{n:p.n,q:''});});}catch(e){}
  if(!out.size)try{curList().items.filter(i=>!i.done).slice(0,25).forEach(i=>out.set(norm(i.n),{n:i.n,q:i.q||''}));}catch(e){}
  return [...out.values()].slice(0,25);}
const weekKey26=d=>{d=new Date(d);d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay());return dayKey(d);};
async function weeklyCheck26(force){
  if(!sb||!authUser)return null;const wk=weekKey26(new Date());if(!force&&state.weekBasket&&state.weekBasket.wk===wk)return state.weekBasket;
  const items=weeklyItems26();if(items.length<2)return null;
  let r=null;try{r=await basketCompare(items);}catch(e){return null;}
  if(!r||!r.rows||!r.rows.length)return null;
  const full=r.rows.filter(x=>x.keys.length===r.found.length).sort((a,b)=>a.sum-b.sum);if(!full.length)return null;
  const best=full[0],worst=full[full.length-1];
  state.weekBasket={wk,ts:Date.now(),chain:best.chain,sum:best.sum,save:Math.max(0,worst.sum-best.sum),worst:worst.chain,n:r.found.length,of:items.length};save();
  if(full.length>1&&state.weekBasket.save>=1)notify('wk-'+wk,'deal','🛒 '+T('הסל השבועי שלך הכי זול השבוע ב'+best.chain,'Your weekly basket is cheapest at '+best.chain),
    fmtPrice(best.sum,myCurrency())+' — '+T(fmtPrice(state.weekBasket.save,myCurrency())+' פחות מ'+worst.chain,fmtPrice(state.weekBasket.save,myCurrency())+' less than '+worst.chain),'list');
  return state.weekBasket;}
function openWeekly26(){if(needLogin26())return;const items=weeklyItems26();
  if(items.length<2){flash(T('🙂 עוד אין מספיק קניות קבועות — אחרי כמה קניות (או "🔁 פריטים קבועים") הסל השבועי יתמלא לבד','Not enough regular items yet'));return;}
  openBasket(items.map(i=>({n:i.n,q:i.q,done:false})),T('הסל השבועי שלי','My weekly basket'));weeklyCheck26(true);}

/* ---------- 📣 הסל הזול בעיר (sal-zol-hashavua.html): תזכורת פעם בשבוע, ביום חמישי, עם קישור לתמונה לשיתוף ---------- */
const openSal26=()=>{location.href='/sal-zol-hashavua.html?city='+encodeURIComponent(userCity());};
function salWeekly26(){const d=new Date();if(d.getDay()!==4&&d.getDay()!==5)return; /* חמישי ושישי — לפני שבת */
  const c=userCity();notify('sal-'+weekKey26(d),'deal','📣 '+T('הסל הזול השבוע ב'+c,'Cheapest basket this week in '+c),
    T('תמונה מוכנה לשיתוף בקבוצה ובסטטוס, לפי המחירים של היום','A ready image to share, with today\'s prices'),'sal');}
/* "sal" בהתראה (גם מהטלפון: ?tab=sal) פותח את הדף ולא לשונית */
const _salSetTab=setTab;setTab=function(t){if(t!=='sal')return _salSetTab.apply(this,arguments);openSal26();};
try{if(new URLSearchParams(location.search).get('tab')==='sal')setTimeout(openSal26,300);}catch(e){}
/* כרטיס בולט בראש "מחירים" ו"חנויות" — שכולם יראו שיש את זה */
function salCard26(pane){if(!pane||pane.querySelector('[data-sal26]'))return;
  pane.insertAdjacentHTML('afterbegin','<button type="button" class="sal26" data-sal26="1"><span class="sal26i" aria-hidden="true">📣</span><span class="sal26t"><b>'+esc(T('הסל הזול השבוע ב'+userCity(),'Cheapest basket this week in '+userCity()))+'</b><small>'+T('באיזו חנות הכי זול · תמונה לשיתוף · דף להדפסה','Which store is cheapest · image to share · page to print')+'</small></span><span class="sal26a" aria-hidden="true">‹</span></button>');}
{const _salRP=renderPrices;renderPrices=function(){const r=_salRP.apply(this,arguments);try{salCard26($26('#panePrices'));}catch(e){}return r;};
 const _salRS=renderStores;renderStores=function(){const r=_salRS.apply(this,arguments);try{salCard26($26('#paneStores'));}catch(e){}return r;};}
document.addEventListener('click',e=>{if(e.target.closest('[data-sal26]'))openSal26();});

/* ---------- 3. 🔔 התראת מחיר על מוצר ---------- */
state.priceAlerts=Array.isArray(state.priceAlerts)?state.priceAlerts:[];
function alertAdd26(n,max){if(!Array.isArray(state.priceAlerts))state.priceAlerts=[];n=String(n||'').trim().slice(0,60);max=Number(String(max).replace(',','.'));if(!n||!(max>0)){flash(T('⚠️ חסר מוצר או מחיר','Missing product or price'));return false;}
  state.priceAlerts=state.priceAlerts.filter(a=>norm(a.n)!==norm(n));state.priceAlerts.push({n,max,ts:Date.now()});save();
  flash('🔔 '+T('אודיע לך כש'+n+' יירד מתחת ל-'+fmtPrice(max,myCurrency()),'I will tell you when '+n+' drops below '+fmtPrice(max,myCurrency())));setTimeout(()=>alertsCheck26(true),300);return true;}
async function alertsCheck26(force){if(!Array.isArray(state.priceAlerts))state.priceAlerts=[];if(!sb||!authUser||!state.priceAlerts.length)return;
  if(!force&&state.alertsAt&&Date.now()-state.alertsAt<6*3600000)return;state.alertsAt=Date.now();save();
  for(const a of state.priceAlerts.slice(0,20)){let rows=[];try{rows=await fetchPrices(a.n);}catch(e){}
    const ok=(rows||[]).filter(r=>r.status!=='pending'&&(r.currency||'ILS')===myCurrency()&&(norm(r.product)===norm(a.n)||norm(r.product).startsWith(norm(a.n)+' ')));
    const latest={};ok.forEach(r=>{const k=r.chain;const t=new Date(r.updated_at||r.created_at).getTime();if(!latest[k]||t>latest[k].t)latest[k]={r,t};});
    const hits=Object.values(latest).map(x=>x.r).filter(r=>Number(r.price)<=a.max).sort((x,y)=>x.price-y.price);
    if(hits.length){const b=hits[0];a.hit={chain:b.chain,price:Number(b.price),ts:Date.now()};
      notify('pa-'+norm(a.n)+'-'+b.chain+'-'+b.price,'drop','🔔 '+T(a.n+' ירד ל-'+fmtPrice(b.price,myCurrency())+' ב'+b.chain,a.n+' is now '+fmtPrice(b.price,myCurrency())+' at '+b.chain),T('ביקשת התראה מתחת ל-'+fmtPrice(a.max,myCurrency()),'You asked for below '+fmtPrice(a.max,myCurrency())),'prices');}}
  save();}
function openAlerts26(pre){if(!Array.isArray(state.priceAlerts))state.priceAlerts=[];
  const cur=myCurrency();const list=state.priceAlerts.map((a,i)=>'<div class="v26row"><span>🔔 <b>'+esc(a.n)+'</b> — '+T('מתחת ל-','below ')+fmtPrice(a.max,cur)+(a.hit?'<br><small class="muted-note">✅ '+T('נמצא: '+fmtPrice(a.hit.price,cur)+' ב'+esc(a.hit.chain),'Found: '+fmtPrice(a.hit.price,cur)+' at '+esc(a.hit.chain))+'</small>':'')+'</span><button class="btn sm sec" data-pa26del="'+i+'" aria-label="'+T('מחיקת ההתראה על ','Delete alert for ')+esc(a.n)+'">🗑️</button></div>').join('');
  const b=openSheet('🔔 '+T('התראות מחיר','Price alerts'),
    '<p class="muted-note">'+T('בוחרים מוצר ומחיר — וכשמישהו מדווח מחיר נמוך יותר באחת החנויות, מגיעה התראה בפעמון 🔔.','Pick a product and a price — you will get a bell notification when a store reports lower.')+'</p>'+
    '<div class="v26card"><label class="il" for="pa26n">'+T('מוצר','Product')+'</label><input id="pa26n" maxlength="60" value="'+esc(pre||'')+'" placeholder="'+T('למשל: טיטולים','e.g. diapers')+'">'+
    '<label class="il" for="pa26p">'+T('להודיע כשהמחיר יורד מתחת ל-','Notify below')+' ('+esc(cur)+')</label><input id="pa26p" type="number" inputmode="decimal" step="0.1" min="0" placeholder="45">'+
    '<button id="pa26add" style="width:100%;margin-top:8px">🔔 '+T('הוספת התראה','Add alert')+'</button></div>'+
    (list?'<div class="v26card">'+list+'</div>':'<p class="muted-note">'+T('עוד אין התראות.','No alerts yet.')+'</p>'));
  b.onclick=e=>{if(e.target.closest('#pa26add')){if(needLogin26())return;if(alertAdd26($26('#pa26n').value,$26('#pa26p').value))openAlerts26();return;}
    const d=e.target.closest('[data-pa26del]');if(d){state.priceAlerts.splice(+d.dataset.pa26del,1);save();openAlerts26();}};
}
/* כפתור בתוצאות החיפוש במחירים */
const _v26PR=renderPriceResults;
renderPriceResults=function(){const r=_v26PR.apply(this,arguments);try{const el=$26('#priceResults');const q=(typeof priceQuery==='string'?priceQuery:'').trim();
  if(el&&q&&!/^\d+$/.test(q)&&!el.querySelector('[data-pa26]'))el.insertAdjacentHTML('afterbegin','<button class="btn sec" data-pa26="'+esc(q)+'" style="margin:0 0 10px">🔔 '+T('להודיע לי כש"'+esc(q)+'" יורד במחיר','Alert me when "'+esc(q)+'" gets cheaper')+'</button>');}catch(e){}return r;};
document.addEventListener('click',e=>{const b=e.target.closest('[data-pa26]');if(b)openAlerts26(b.dataset.pa26);});

/* ---------- 4+5. 🧮 כמה לקנות — לשבת ולאירועים (הערכה לפי מספר סועדים) ---------- */
/* [שם, כמה לאדם, יחידה, מינימום] — הערכה בלבד */
const CALC26={
  fri:[T('ליל שבת','Friday night'),[['חלות',.25,'',2],['יין לקידוש',.12,'בקבוקים',1],['דגים',1,'מנות',0],['מרק עוף',.35,'ליטר',0],['עוף',.3,'ק״ג',0],['אורז',.08,'ק״ג',0],['סלטים',.3,'קופסאות',2],['קוגל',.12,'תבניות',1],['שתייה',.3,'בקבוקים',2],['עוגה',.15,'',1],['כלים חד פעמיים',1,'סטים',0]]],
  sat:[T('סעודת שבת בצהריים','Shabbat lunch'),[['חלות',.25,'',2],['יין לקידוש',.12,'בקבוקים',1],['ביצים',1,'',0],['בשר לחמין',.2,'ק״ג',0],['תפוחי אדמה',.15,'ק״ג',0],['שעועית',.05,'ק״ג',0],['סלטים',.3,'קופסאות',2],['קוגל',.12,'תבניות',1],['שתייה',.3,'בקבוקים',2],['עוגה',.15,'',1]]],
  third:[T('סעודה שלישית','Third meal'),[['לחמניות',1,'',0],['סלטים',.25,'קופסאות',1],['דגים',.5,'מנות',0],['גבינה לבנה',.1,'',1],['שתייה',.2,'בקבוקים',1],['עוגה',.12,'',1]]],
  kiddush:[T('קידוש בבית הכנסת','Shul kiddush'),[['יין לקידוש',.07,'בקבוקים',1],['מיץ ענבים',.07,'בקבוקים',1],['עוגה',.1,'',1],['מאפים',.08,'מגשים',1],['קוגל',.1,'תבניות',1],['חמין מוכן',.1,'סירים',1],['חטיפים',.15,'שקיות',1],['שתייה',.17,'בקבוקים',2],['כלים חד פעמיים',1,'סטים',0]]],
  brit:[T('ברית (סעודת בוקר)','Brit (breakfast)'),[['לחמניות',1.5,'',0],['ביצים',1,'',0],['דגים',1,'מנות',0],['סלטים',.2,'קופסאות',2],['גבינה לבנה',.12,'',1],['עוגה',.1,'',1],['יין לקידוש',.07,'בקבוקים',1],['שתייה',.25,'בקבוקים',2],['קפה',.02,'חבילות',1],['כלים חד פעמיים',1,'סטים',0]]],
  bar:[T('בר מצווה (סעודה)','Bar mitzvah meal'),[['לחמניות',1.5,'',0],['מנה ראשונה',1,'מנות',0],['עוף',.3,'ק״ג',0],['אורז',.08,'ק״ג',0],['סלטים',.25,'קופסאות',2],['שתייה',.33,'בקבוקים',2],['יין',.1,'בקבוקים',1],['קינוח',1,'מנות',0],['כלים חד פעמיים',1,'סטים',0]]],
  sheva:[T('שבע ברכות','Sheva brachot'),[['חלות',.2,'',2],['יין',.12,'בקבוקים',2],['דגים',1,'מנות',0],['עוף',.3,'ק״ג',0],['אורז',.08,'ק״ג',0],['סלטים',.25,'קופסאות',2],['שתייה',.25,'בקבוקים',2],['קינוח',1,'מנות',0],['כלים חד פעמיים',1,'סטים',0]]]};
function calcRows26(type,n){const def=CALC26[type]||CALC26.fri;n=Math.max(1,Math.min(2000,Math.round(Number(n)||1)));
  return def[1].map(([name,per,unit,min])=>{let q=per*n;q=unit==='ק״ג'||unit==='ליטר'?Math.max(min,Math.ceil(q*2)/2):Math.max(min,Math.ceil(q-1e-9));return {name,q,unit};});}
function openCalc26(type,n){type=CALC26[type]?type:'fri';n=n||10;
  const draw=()=>{const rows=calcRows26(type,n);
    const b=openSheet('🧮 '+T('כמה לקנות?','How much to buy?'),'<div class="v26calc">'+
      '<label class="il" for="c26t">'+T('לאיזו סעודה / אירוע?','Which meal / event?')+'</label><select id="c26t">'+Object.entries(CALC26).map(([k,[l]])=>'<option value="'+k+'"'+(k===type?' selected':'')+'>'+esc(l)+'</option>').join('')+'</select>'+
      '<label class="il" for="c26n">'+T('כמה סועדים?','How many people?')+'</label><input id="c26n" type="number" inputmode="numeric" min="1" max="2000" value="'+n+'">'+
      '<table><caption class="sr18">'+T('כמויות מומלצות','Suggested amounts')+'</caption><tbody>'+rows.map((r,i)=>'<tr><td><input type="checkbox" data-c26="'+i+'" checked aria-label="'+esc(r.name)+'"></td><td>'+esc(emojiOf(r.name))+' '+esc(r.name)+'</td><td><b>'+r.q+'</b> '+esc(r.unit)+'</td></tr>').join('')+'</tbody></table>'+
      '<p class="muted-note">ℹ️ '+T('הערכה בלבד — כל בית והרגליו. אפשר לבטל סימון ולשנות כמויות ברשימה אחרי ההוספה.','An estimate only — adjust to your family.')+'</p>'+
      '<button id="c26add" style="width:100%">➕ '+T('הוספה לרשימה "'+esc(curList().name)+'"','Add to list')+'</button></div>');
    b.onchange=e=>{if(e.target.id==='c26t'){type=e.target.value;draw();}if(e.target.id==='c26n'){n=e.target.value;draw();}};
    b.onclick=e=>{if(!e.target.closest('#c26add'))return;let k=0;rows.forEach((r,i)=>{const c=b.querySelector('[data-c26="'+i+'"]');if(c&&c.checked){addItem(r.name,r.q+(r.unit?' '+r.unit:''));k++;}});save();render();closeSheet();
      flash('🧮 '+T('נוספו '+k+' מוצרים לרשימה','Added '+k+' items'));};};
  draw();}
/* רשימות מוכנות לאירועים (נערכות בבק אופיס ← 📋 רשימות מוכנות) */
try{[{e:'👶',n:'ברית',items:'לחמניות\nביצים\nדגים\nסלטים\nגבינה לבנה\nעוגה\nיין לקידוש\nשתייה\nקפה\nכלים חד פעמיים\nמפות חד פעמיות'},
  {e:'📖',n:'בר מצווה',items:'לחמניות\nמנה ראשונה\nעוף\nאורז\nסלטים\nשתייה\nיין\nקינוח\nכלים חד פעמיים\nמפות חד פעמיות\nממתקים לזריקה'},
  {e:'💍',n:'שבע ברכות',items:'חלות\nיין\nדגים\nעוף\nאורז\nסלטים\nשתייה\nקינוח\nכלים חד פעמיים\nמפות חד פעמיות'},
  {e:'🍰',n:'קידוש בבית הכנסת',items:'יין לקידוש\nמיץ ענבים\nעוגה\nמאפים\nקוגל\nחמין מוכן\nחטיפים\nשתייה\nכלים חד פעמיים'}].forEach(x=>{
  if(!READY165_DEFAULT.some(r=>r.n===x.n))READY165_DEFAULT.push(x);if(!READY165.some(r=>r.n===x.n)&&READY165.length===READY165_DEFAULT.length-1)READY165.push(x);});}catch(e){}

/* ---------- 6. 🛍️ מצב קנייה: לפי סדר המחלקות, כפתורים גדולים, המסך לא נכבה ---------- */
const AISLE26=['ירקות','פירות','לחמים','מוצרי חלב','בשר ועוף','דגים','שימורים','רטבים וממרחים','מאפים וחטיפים','שתייה','מוצרי ניקיון','היגיינה','אחר'];
let wake26=null;
async function wakeOn26(){try{if('wakeLock' in navigator){wake26=await navigator.wakeLock.request('screen');}}catch(e){wake26=null;}}
/* מוצר שנשמר פעם כ"אחר" (לפני תיקון הקטגוריות) — מחשבים שוב */
const cat26=i=>i.c&&i.c!=='אחר'?i.c:resolveCat(i.n);const aIdx26=i=>{const k=AISLE26.indexOf(cat26(i));return k<0?99:k;};
/* תמונה כמו ברשימה: התמונה שצילמתם למוצר, או התמונה של המוצר המדויק שנבחר להשוואת מחירים */
const img26=i=>{const a=typeof safeImg==='function'?safeImg(i.img):'';if(a)return a;return i.bc&&i.bq===i.n&&typeof safeImg==='function'?safeImg(i.bimg):'';};
function drawShop26(){const box=$26('#shop26');if(!box||box.hidden)return;const l=curList();
  const its=l.items.slice().sort((a,b)=>(a.done-b.done)||aIdx26(a)-aIdx26(b));
  const open=its.filter(i=>!i.done),done=its.filter(i=>i.done);let h='',last='';
  open.forEach(i=>{const c=AISLE26.includes(cat26(i))?cat26(i):'אחר';if(c!==last){h+='<h3>'+esc(CATE[c]||'🛒')+' '+esc(c)+'</h3>';last=c;}h+=row(i);});
  if(done.length)h+=done.map(row).join('');
  function row(i){const im=img26(i);return '<button class="srow'+(i.done?' done':'')+'" data-s26="'+esc(i.id)+'" aria-pressed="'+(i.done?'true':'false')+'"><span class="ck">'+(i.done?'✓':'')+'</span>'+(im?'<span class="sim26" data-s26img="'+esc(i.id)+'" title="'+T('הגדלת התמונה','View photo')+'"><img src="'+esc(im)+'" alt="" loading="lazy" referrerpolicy="no-referrer" data-gone="parent"></span>':'<span>'+esc(i.e||'')+'</span>')+'<span class="nmw"><span class="nm">'+esc(i.n)+'</span>'+(i.note&&!state.shopNoNotes?'<small class="snote">📝 '+esc(i.note)+'</small>':'')+'</span>'+(i.q?'<span class="q">×'+esc(i.q)+'</span>':'')+'</button>';}
  /* הערות למוצרים (למשל "רק של חברה מסוימת") — שורה שנייה מתחת לשם; כפתור 📝 בכותרת מסתיר / מציג */
  const hasN=l.items.some(i=>i.note&&!i.done),nb=box.querySelector('[data-s26n]');
  if(nb){nb.hidden=!hasN;nb.setAttribute('aria-pressed',state.shopNoNotes?'false':'true');nb.classList.toggle('off',!!state.shopNoNotes);}
  box.querySelector('.sbody').innerHTML=h||'<div class="empty">'+T('הרשימה ריקה 🙂','The list is empty 🙂')+'</div>';
  box.querySelector('.pg').textContent=T(done.length+' מתוך '+its.length,done.length+' of '+its.length);
  const bar=box.querySelector('.bar26 i');if(bar)bar.style.width=(its.length?Math.round(done.length*100/its.length):0)+'%';}
function openShop26(){let box=$26('#shop26');
  if(!box){box=document.createElement('div');box.id='shop26';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',T('מצב קנייה','Shopping mode'));
    box.innerHTML='<header><div class="t26"><b>'+T('מצב קנייה','Shopping mode')+'</b><small class="ln"></small></div><button data-s26n="1" class="s26n" hidden aria-pressed="true" title="'+T('להציג / להסתיר הערות','Show / hide notes')+'" aria-label="'+T('הערות למוצרים','Item notes')+'">📝</button><button data-s26x="1" aria-label="'+T('יציאה ממצב קנייה','Exit shopping mode')+'">✕</button></header><div class="pgc26"><div class="pgt26"><span class="pg"></span></div><div class="bar26"><i></i></div></div><div class="sbody"></div><footer><button data-s26fin="1">'+T('סיימתי קנייה','Done shopping')+'</button></footer>';
    document.body.appendChild(box);
    box.addEventListener('click',e=>{const pi=e.target.closest('[data-s26img]');if(pi){e.stopPropagation();const it=curList().items.find(x=>x.id===pi.dataset.s26img),src=it&&img26(it);if(src&&typeof openZoomImg==='function')openZoomImg(src,it.n,pi.closest('[data-s26]'));return;}
      const r=e.target.closest('[data-s26]');if(r){const i=curList().items.find(x=>x.id===r.dataset.s26);if(i){i.done=!i.done;i.ts=Date.now();save();render();drawShop26();try{navigator.vibrate&&navigator.vibrate(15);}catch(err){}}return;}
      if(e.target.closest('[data-s26x]')){closeShop26();return;}
      if(e.target.closest('[data-s26n]')){state.shopNoNotes=!state.shopNoNotes;save();drawShop26();return;}
      if(e.target.closest('[data-s26fin]')){closeShop26();openFinish();}});
    box.addEventListener('keydown',e=>{if(e.key==='Escape')closeShop26();});}
  box.querySelector('.ln').textContent=curList().name;box.hidden=false;drawShop26();wakeOn26();setTimeout(()=>{const x=box.querySelector('[data-s26x]');if(x)x.focus();},50);}
function closeShop26(){const b=$26('#shop26');if(b)b.hidden=true;try{wake26&&wake26.release();}catch(e){}wake26=null;}
document.addEventListener('visibilitychange',()=>{const b=$26('#shop26');if(!document.hidden&&b&&!b.hidden)wakeOn26();});
const _v26Render=render;
render=function(){const r=_v26Render.apply(this,arguments);try{const bar=$26('#paneList .buybar');if(bar&&!bar.querySelector('[data-shop26]'))bar.insertAdjacentHTML('beforeend','<button class="sec" data-shop26="1" title="'+T('מסך גדול לקנייה בחנות','Big screen for in-store shopping')+'">🛍️ '+T('מצב קנייה','Shopping mode')+'</button>');drawShop26();}catch(e){}return r;};
document.addEventListener('click',e=>{if(e.target.closest('[data-shop26]'))openShop26();});

/* ---------- 9. 🏆 המדווחים של החודש ---------- */
async function openTop26(){if(needLogin26())return;const b=openSheet('🏆 '+T('המדווחים של החודש','Top reporters this month'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');
  let rows=[];try{const {data,error}=await sb.rpc('reporters_month');if(error)throw error;rows=data||[];}catch(e){b.innerHTML='<div class="empty">⚠️ '+T('עוד לא זמין — צריך להריץ את קוד ה-SQL המעודכן','Not available yet')+'</div>';return;}
  const MED=['🥇','🥈','🥉'];const me=rows.find(r=>r.is_me);
  b.innerHTML='<p class="muted-note">'+T('כל דיווח מחיר שאושר החודש = נקודה, וכל "נכון" ממשתמש אחר = 2 נקודות. ככה כולם חוסכים 💚','Each approved report = 1 point, each confirmation = 2.')+'</p>'+
    (me?'<div class="v26card v26me" style="text-align:center">'+T('את/ה במקום','You are in place')+' <b style="font-size:22px">'+me.rank+'</b> '+T('החודש','this month')+(me.rank<=3?' '+MED[me.rank-1]:'')+'</div>':'<div class="v26card">'+T('עוד לא דיווחת החודש — כל דיווח מקדם אותך בטבלה! ⬆️','No reports from you yet this month!')+'</div>')+
    (rows.filter(r=>r.rank<=10).length?'<div class="v26card">'+rows.filter(r=>r.rank<=10).map(r=>'<div class="v26row'+(r.is_me?' v26me':'')+'"><span>'+(MED[r.rank-1]||r.rank+'.')+' '+(r.name?esc(r.name):T('מדווח/ת','A reporter'))+(r.is_me?' ('+T('את/ה','you')+')':'')+'</span><span>'+r.reports+' '+T('דיווחים','reports')+(r.confirms?' · ✅ '+r.confirms:'')+'</span></div>').join('')+'</div>':'<div class="empty">'+T('עוד אין דיווחים החודש — אולי את/ה הראשון/ה? 💰','No reports yet this month')+'</div>')+
    '<button class="btn" id="top26go" style="width:100%">💰 '+T('לדווח מחיר','Report a price')+'</button>';
  b.querySelector('#top26go').onclick=()=>{closeSheet();setTab('prices');};}
const _v26RP=renderPrices;
renderPrices=function(){const r=_v26RP.apply(this,arguments);try{const n=$26('#panePrices .price-note');if(n&&!$26('#panePrices [data-top26]'))n.insertAdjacentHTML('afterend','<button class="chip" data-top26="1" style="margin:0 0 8px">🏆 '+T('המדווחים של החודש','Top reporters this month')+'</button>');}catch(e){}return r;};
document.addEventListener('click',e=>{if(e.target.closest('[data-top26]'))openTop26();});

/* ---------- 10. 💌 הזמנת חברים ---------- */
try{const qp=new URLSearchParams(location.search),rf=(qp.get('ref')||'').toLowerCase();if(/^[0-9a-f]{8}$/.test(rf)){localStorage.setItem('yam_ref',rf);qp.delete('ref');history.replaceState(null,'',location.pathname+(qp.toString()?'?'+qp:'')+location.hash);}}catch(e){}
async function refClaim26(){let rf='';try{rf=localStorage.getItem('yam_ref')||'';}catch(e){}if(!rf||!sb||!authUser)return;
  try{const {data,error}=await sb.rpc('referral_claim',{p_code:rf});if(error)return;localStorage.removeItem('yam_ref');if(data===true)flash('💚 '+T('ברוכים הבאים! הצטרפת בהזמנה של חבר','Welcome! You joined through a friend'));}catch(e){}}
async function openInvite26(){if(needLogin26())return;const b=openSheet('💌 '+T('הזמנת חברים','Invite friends'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');
  let code='',n=0;try{const r1=await sb.rpc('my_ref_code');if(r1.error)throw r1.error;code=r1.data;const r2=await sb.rpc('my_referrals');n=Number(r2.data)||0;}catch(e){b.innerHTML='<div class="empty">⚠️ '+T('עוד לא זמין — צריך להריץ את קוד ה-SQL המעודכן','Not available yet')+'</div>';return;}
  const url='https://www.yamshopping.com/?ref='+code;let goal=3;try{const g=await sb.rpc('amb_min');if(!g.error&&+g.data>0)goal=+g.data;}catch(e){}
  b.innerHTML='<div class="v26card" style="text-align:center"><div>'+T('הצטרפו בזכותך','Joined thanks to you')+'</div><div class="v26big">'+n+'</div>'+(n>=goal?'<span class="v26badge">🎖️ '+T(GW2('שגרירה','שגריר')+' של ים שופינג','YamShopping ambassador')+'</span>':'<small class="muted-note">'+T('עוד '+(goal-n)+' ו'+GW2('את שגרירה','אתה שגריר')+' 🎖️','Only '+(goal-n)+' more to become an ambassador 🎖️')+'</small>')+'</div>'+
    '<p class="muted-note">'+T('שולחים את הקישור האישי. מי שנרשם דרכו נספר כאן, ורואים את השם שלו (בלי מייל).','Share your personal link. Whoever signs up through it is counted here (just the number).')+'</p>'+
    '<input value="'+esc(url)+'" readonly dir="ltr" aria-label="'+T('הקישור האישי','Personal link')+'" style="text-align:left">'+
    '<div class="row2"><button id="inv26share">📤 '+T('שיתוף','Share')+'</button><button class="btn sec" id="inv26copy">📋 '+T('העתקה','Copy')+'</button></div>';
  b.querySelector('#inv26share').onclick=()=>openShare18({hash:'?ref='+code,title:T('רשימת קניות — ים שופינג','YamShopping'),text:T('אני עושה את הקניות עם "ים שופינג" — רשימה משותפת למשפחה, איפה הכי זול, ויאמי שעוזרת. בחינם 💚','I shop with YamShopping — free shared lists and price comparison 💚')});
  b.querySelector('#inv26copy').onclick=async()=>{try{await navigator.clipboard.writeText(url);flash('📋 '+T('הועתק','Copied'));}catch(e){(await uiPrompt(T('להעתקה:','Copy:'),url));}};}

/* ---------- 8. 👀 ניסיון בלי הרשמה ---------- */
(function(){const g=$26('#btnGuest');if(!g)return;if(!sb)g.hidden=true;
  g.onclick=()=>{state.user={name:T('אורח','Guest'),email:'',offline:true,guest:true};save();hideLogin();afterEnter();guestBar26();};})();
function guestBar26(){const on=!!(state.user&&state.user.guest&&!authUser);let b=$26('#guest26');
  if(!on){if(b)b.remove();return;}
  if(!b){b=document.createElement('div');b.id='guest26';b.className='guest26';b.innerHTML='<b>👀 '+T('מצב ניסיון — נשמר רק במכשיר הזה','Trial mode — saved on this device only')+'</b><button type="button">'+T('הרשמה חינם','Sign up free')+'</button>';
    b.querySelector('button').onclick=()=>showLogin();const hd=document.querySelector('header');if(hd&&hd.parentNode)hd.after(b);else document.body.prepend(b);}}
const _v26SignedIn=onSignedIn;
onSignedIn=async function(user){if(state.user&&state.user.guest){delete state.user.guest;delete state.user.offline;}const r=await _v26SignedIn.apply(this,arguments);guestBar26();setTimeout(()=>{refClaim26();weeklyCheck26();alertsCheck26();savMonthly26();},2500);return r;};

/* ---------- 7. 📲 קיצורי דרך מהאייקון (?a=add / shop / cheap / yami) ---------- */
function shortcut26(){let a='';try{const qp=new URLSearchParams(location.search);a=qp.get('a')||'';if(!a)return;qp.delete('a');history.replaceState(null,'',location.pathname+(qp.toString()?'?'+qp:'')+location.hash);}catch(e){return;}
  setTimeout(()=>{if($26('#login.open'))return;if(a==='add'){setTab('list');const i=$26('#inText');if(i)i.focus();}else if(a==='shop'){setTab('list');openShop26();}else if(a==='cheap'){setTab('list');openBasket();}else if(a==='yami'){openBot();}},600);}
const _v26After=afterEnter;afterEnter=function(){const r=_v26After.apply(this,arguments);guestBar26();shortcut26();return r;};

/* ---------- 📲 2.0 באפליקציה: קיצורי דרך באייקון, "שיתוף" אל האפליקציה, מסך דלוק במצב קנייה, סריקה ירוקה ---------- */
/* ?a=new / scan / voice / add ("+" בווידג'ט, 2.2) — מהלחיצה הארוכה על האייקון. ?a=paste&t=... — טקסט ששיתפו אל ים שופינג (כל שורה מוצר). ?a=cheap נשאר אצל shortcut26 */
let app20={a:'',t:''};
try{const qp=new URLSearchParams(location.search),a=qp.get('a')||'';
  if(/^(new|scan|voice|add|paste)$/.test(a)){app20={a,t:a==='paste'?(qp.get('t')||'').slice(0,3000):''};qp.delete('a');qp.delete('t');history.replaceState(null,'',location.pathname+(qp.toString()?'?'+qp:'')+location.hash);}}catch(e){}
function run20(){if(!app20.a||$26('#login.open'))return; /* לא מחובר — מחכים לכניסה, ואז afterEnter קורא שוב */
  const {a,t}=app20;app20={a:'',t:''};
  setTimeout(()=>{try{setTab('list');
    if(a==='new'){const b=document.querySelector('#chips [data-new]');if(b)b.click();}
    else if(a==='scan'){const b=$26('#btnScan45');if(b)b.click();}
    else if(a==='voice'){const b=$26('#btnMic');if(b)b.click();}
    else if(a==='add'){const i=$26('#inText');if(i)i.focus();}
    else if(a==='paste')paste20(t);}catch(e){}},600);}
/* "תקנה בבקשה:\nחלב 3\nלחם\nביצים" ← חלב ×3, לחם, ביצים. שורת פתיחה שנגמרת בנקודתיים ושורות של קישורים לא נכנסות */
function paste20(text){
  /* 🧾 שיתפו לאפליקציה הודעה עם קישור לקבלה דיגיטלית (SMS / מייל / וואטסאפ) — פותחים העלאת קבלה וקוראים מהקישור, בלי להעתיק */
  const lk=String(text||'').match(/https?:\/\/(?!(?:www\.)?yamshopping\.com)[^\s<>"']+/i),rest=String(text||'').replace(/https?:\/\/\S+/gi,'').trim();
  if(lk&&(/קבל|חשבונית|receipt|invoice/i.test(rest)||rest.split(/\r?\n/).filter(x=>x.trim()).length<=2)&&typeof openUpload==='function'){
    setTab('list');openUpload('receipt');const u=document.querySelector('#upUrl'),go=document.querySelector('#upUrlGo');if(u&&go){u.value=lk[0];go.click();}return;}
  const lines=String(text||'').split(/\r?\n/).map(x=>x.replace(/^\s*(?:[-–•*·▪◦●○☐☑✓✔]+|\d+[.)])\s*/,'').trim()).filter(x=>x&&!/[:：]\s*$/.test(x)&&!/https?:\/\//i.test(x));
  const l=curList();let n=0;
  lines.forEach(line=>{(parseItems(line)||[]).forEach(it=>{const name=String(it.name||'').trim().slice(0,60);if(!name||hasProfanity(name))return;
    const ex=l.items.find(i=>i.n===name&&!i.done);
    if(ex){ex.q=mergeQty(ex.q,it.qty);ex.ts=Date.now();}
    else{l.items.push({id:uid(),n:name,q:it.qty||'',c:resolveCat(name),e:emojiOf(name),done:false,ts:Date.now()});state.stats[name]=(state.stats[name]||0)+1;}
    n++;});});
  if(!n){flash(T('לא מצאנו מוצרים בהודעה','No items found in the message'));return;}
  save();render();
  const old=$26('#paste20');if(old)old.remove();
  const d=document.createElement('div');d.id='paste20';d.setAttribute('role','status');
  d.textContent='✓ '+(n===1?T('נוסף מוצר אחד מההודעה','1 item added from the message'):T('נוספו '+n+' מוצרים מההודעה',n+' items added from the message'));
  const pane=$26('#paneList');if(pane)pane.insertAdjacentElement('beforebegin',d);setTimeout(()=>d.remove(),8000);}
const _v20After=afterEnter;afterEnter=function(){const r=_v20After.apply(this,arguments);run20();return r;};

/* ☀ מצב קנייה: המסך נשאר דלוק (באפליקציה דרך YamApp.keepScreen, בדפדפן wakeLock) ופס צהוב שאומר את זה. יוצאים — המסך חוזר להיכבות כרגיל */
const keep20=on=>{try{if(window.YamApp&&typeof YamApp.keepScreen==='function')YamApp.keepScreen(!!on);}catch(e){}};
keep20(false); /* טעינה מחדש של הדף באמצע קנייה — לא משאירים את המסך דלוק */
const _s20Open=openShop26,_s20Close=closeShop26;
openShop26=function(){const r=_s20Open.apply(this,arguments);const box=$26('#shop26');
  const off=typeof prefs!=='undefined'&&prefs.noAwake20,can=!off&&((window.YamApp&&typeof YamApp.keepScreen==='function')||('wakeLock' in navigator));if(!off)keep20(true);
  if(box&&can&&!box.querySelector('.awake20'))box.querySelector('header').insertAdjacentHTML('afterend','<div class="awake20" role="note">☀ '+T('המסך יישאר דלוק בזמן הקנייה','The screen stays on while you shop')+'</div>');
  return r;};
closeShop26=function(){keep20(false);return _s20Close.apply(this,arguments);};

/* "✓ נסרק: ..." על המצלמה */
function scanOk20(code,name){const w=document.querySelector('#scanOverlay .scanwrap');if(!w)return;let p=w.querySelector('.scanok20');
  if(!p){p=document.createElement('div');p.className='scanok20';p.setAttribute('role','status');w.appendChild(p);}
  const known=dbProducts.find(x=>x.barcode===code);const nm=name||(known?known.name+(known.brand?' '+known.brand:''):code);
  p.textContent='✓ '+T('נסרק: ','Scanned: ')+nm;p.classList.add('on');w.classList.add('ok20');
  clearTimeout(scanOk20.t);scanOk20.t=setTimeout(()=>{p.classList.remove('on');w.classList.remove('ok20');},1600);}
(function(){const st=document.createElement('style');st.textContent=
  '#paste20{margin:10px 16px 0;padding:12px 18px;border-radius:16px;background:#e1f2ec;color:#0b5e52;font-weight:700;font-size:15px}'+
  'body.dark #paste20{background:#17352e;color:#9fe3cb}'+
  '#shop26 .awake20{margin:16px 16px 0;padding:12px 18px;border-radius:999px;background:#fdf0c8;color:#6b4a00;font-weight:700;font-size:15px}'+
  'body.dark #shop26 .awake20{background:#3d3215;color:#f6d77a}'+
  '.scanwrap .scanok20{position:absolute;top:14px;left:50%;transform:translate(-50%,-8px);max-width:88%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#3ddc97;color:#0b3d2e;font-weight:700;font-size:16px;padding:10px 22px;border-radius:999px;opacity:0;transition:opacity .15s,transform .15s;pointer-events:none;z-index:3}'+
  '.scanwrap .scanok20.on{opacity:1;transform:translate(-50%,0)}'+
  '.scanwrap.ok20 .scanframe{border-color:#3ddc97}';document.head.appendChild(st);})();

/* בבק אופיס: 📣 הסל הזול — איזה מוצרים בסל (site_config "sal", החישוב ב-js/sal-pick.js) */
window.boReady(()=>{
try{const nav=document.querySelector('#boNav');if(nav&&!nav.querySelector('[data-s="sal"]')){const after=nav.querySelector('[data-s="prices"]');const b=document.createElement('button');b.dataset.s='sal';b.textContent='📣 הסל הזול';if(after)after.after(b);else nav.appendChild(b);}
  window.boView&&window.boView('sal',async function(){const m=document.querySelector('#boMain'),SP=window.SalPick;
    const {data}=await sb.from('site_config').select('value').eq('key','sal').maybeSingle();const v=(data&&data.value)||{};
    let items=SP.clean(v.items);if(items.length<SP.MIN)items=SP.DEFAULT.slice();let md=v.mode==='daily'?'daily':'fixed',cnt=Math.max(SP.MIN,parseInt(v.count,10)||12);const counts={};
    const today=()=>{const t=SP.pick({items,mode:md,count:cnt});return '<p class="muted">'+(md==='daily'?'היום ('+esc(SP.today())+') בסל '+t.length+' מוצרים: ':'בסל '+t.length+' מוצרים: ')+esc(t.map(i=>i[0]).join(' · '))+'</p>';};
    const draw=()=>{m.innerHTML='<div class="card"><h2>📣 הסל הזול בעיר</h2><p class="muted">המוצרים שבודקים בדף "הסל הזול" (<a href="/sal-zol-hashavua.html" target="_blank" rel="noopener">לדף</a>). משווים רק חנויות שיש בהן את <b>כל</b> המוצרים, אז כדאי לבחור מוצרים שנמכרים בהרבה סניפים (המספר בסוגריים). משתמשים יכולים לשנות לעצמם את הסל — זה לא משנה את ההגדרה כאן.</p>'+
      '<div class="row"><label><input type="radio" style="width:auto;margin-inline-end:6px" name="salMd" value="fixed"'+(md==='fixed'?' checked':'')+'> אותם מוצרים כל יום (כל הרשימה)</label></div>'+
      '<div class="row"><label><input type="radio" style="width:auto;margin-inline-end:6px" name="salMd" value="daily"'+(md==='daily'?' checked':'')+'> כל יום מבחר אחר מתוך הרשימה</label> <label'+(md==='daily'?'':' hidden')+'>— כמה מוצרים בכל יום: <input id="salCnt" type="number" min="'+SP.MIN+'" max="'+SP.MAX+'" value="'+cnt+'" style="width:80px"></label></div>'+
      today()+'</div>'+
      '<div class="card"><h2>🧺 הרשימה ('+items.length+')</h2><div class="tw" tabindex="0" role="region" aria-label="המוצרים בסל"><table><thead><tr><th>מוצר</th><th>ברקוד</th><th></th></tr></thead><tbody>'+
      items.map((i,n)=>'<tr><td><input data-nm="'+n+'" value="'+esc(i[0])+'" maxlength="60" aria-label="שם המוצר"></td><td dir="ltr">'+esc(i[1])+(counts[i[1]]?' <small class="muted">('+counts[i[1]]+' סניפים)</small>':'')+'</td><td><button class="btn sec" data-rm="'+n+'">🗑️</button></td></tr>').join('')+'</tbody></table></div>'+
      '<div class="row"><input id="salQ" type="search" placeholder="להוסיף מוצר: שם או ברקוד" maxlength="60" autocomplete="off"></div><div id="salRes"></div>'+
      '<div class="row"><button class="btn" id="salSave">💾 שמירה</button> <button class="btn sec" id="salDef">↩️ חזרה ל-12 המוצרים המקוריים</button></div></div>';};
    draw();
    m.oninput=e=>{const t=e.target;if(t.dataset.nm!=null){items[+t.dataset.nm][0]=t.value.slice(0,60);return;}
      if(t.id==='salCnt'){cnt=Math.max(SP.MIN,Math.min(SP.MAX,parseInt(t.value,10)||12));return;}
      if(t.id==='salQ'){clearTimeout(m._t);const q=t.value.trim();if(q.length<2){$26('#salRes').innerHTML='';return;}
        m._t=setTimeout(async()=>{try{const r=await fetch(PRICE_API+'/products?'+new URLSearchParams({q,limit:'8'}));const d=r.ok?await r.json():[];
          d.forEach(p=>counts[p.code]=p.stores);
          $26('#salRes').innerHTML=d.length?d.map(p=>'<button class="chip" data-addp="'+esc(p.code)+'" data-n="'+esc(p.name)+'"'+(items.some(i=>i[1]===p.code)?' disabled':'')+'>➕ '+esc(p.name)+' · '+esc(p.manufacturer||'')+' ('+(p.stores||0)+' סניפים)</button>').join(' '):'<p class="muted">לא נמצא</p>';}catch(err){$26('#salRes').innerHTML='<p class="muted">שרת המחירים לא ענה</p>';}},300);}};
    m.onchange=e=>{if(e.target.name==='salMd'){md=e.target.value;draw();}};
    m.onclick=async e=>{const t=e.target;
      if(t.closest('[data-rm]')){items.splice(+t.closest('[data-rm]').dataset.rm,1);draw();return;}
      if(t.closest('[data-addp]')){const b=t.closest('[data-addp]');if(items.length>=200)return;items.push([b.dataset.n.slice(0,60),b.dataset.addp]);draw();$26('#salQ').focus();return;}
      if(t.id==='salDef'){items=SP.DEFAULT.slice();md='fixed';draw();flash('לוחצים "שמירה" כדי שזה ייכנס לתוקף');return;}
      if(t.id==='salSave'){if(items.length<SP.MIN){flash('⚠️ צריך לפחות '+SP.MIN+' מוצרים');return;}
        const {error}=await sb.from('site_config').upsert({key:'sal',value:{items,mode:md,count:cnt},updated_at:new Date().toISOString()});
        flash(error?'⚠️ '+error.message:'✔️ נשמר — הדף "הסל הזול" מתעדכן אצל כולם');}};
  });
}catch(e){console.warn('bo sal',e);}
});

/* בבק אופיס (מנהלים): 💌 מי נרשם דרך מי */
/* מוסיף לבק אופיס — רץ כשהבק אופיס נטען (js/lazy.js) */
window.boReady(()=>{
try{const nav=document.querySelector('#boNav');if(nav&&!nav.querySelector('[data-s="referrals"]')){const after=nav.querySelector('[data-s="reporters"]');const b=document.createElement('button');b.dataset.s='referrals';b.textContent='💌 הזמנות חברים';if(after)after.after(b);else nav.appendChild(b);}
  window.boView&&window.boView('referrals',async function(){const m=document.querySelector('#boMain');
    const {data,error}=await sb.rpc('admin_referrals');if(error){m.innerHTML='<div class="card">⚠️ '+esc(error.message)+' — צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)</div>';return;}
    const rows=data||[];const by={};rows.forEach(r=>{const k=r.referrer_id;(by[k]=by[k]||{name:r.referrer_name,email:r.referrer_email,n:0,last:r.created_at}).n++;});
    const top=Object.values(by).sort((a,b)=>b.n-a.n);const who=(n,e)=>'<b>'+esc(n||'—')+'</b><br><small class="muted" dir="ltr">'+esc(e||'')+'</small>';
    const when=t=>{const d=new Date(t);return esc(d.toLocaleDateString('he-IL')+' '+d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}));};
    m.innerHTML='<div class="card"><h2>💌 הזמנות חברים</h2><p class="muted">כל מי שנרשם דרך קישור אישי של משתמש אחר. המזמין עצמו רואה באזור האישי כמה הצטרפו דרכו ואת השמות שלהם — בלי מיילים.</p>'+
      '<p><b>'+rows.length+'</b> נרשמו דרך הזמנה · <b>'+top.length+'</b> משתמשים הזמינו</p></div>'+
      (top.length?'<div class="card"><h2>🏅 מי הזמין הכי הרבה</h2><div class="tw" tabindex="0" role="region" aria-label="טבלה"><table><thead><tr><th>#</th><th>מזמין</th><th>הצטרפו</th><th>אחרון</th></tr></thead><tbody>'+
        top.map((t,i)=>'<tr><td>'+(i+1)+'</td><td>'+who(t.name,t.email)+(t.n>=3?' 🎖️':'')+'</td><td><b>'+t.n+'</b></td><td>'+when(t.last)+'</td></tr>').join('')+'</tbody></table></div></div>'+
       '<div class="card"><h2>📋 כל ההרשמות דרך הזמנה</h2><div class="tw" tabindex="0" role="region" aria-label="טבלה"><table><thead><tr><th>מתי</th><th>מי נרשם</th><th>דרך מי</th></tr></thead><tbody>'+
        rows.map(r=>'<tr><td>'+when(r.created_at)+'</td><td>'+who(r.referred_name,r.referred_email)+'</td><td>'+who(r.referrer_name,r.referrer_email)+'</td></tr>').join('')+'</tbody></table></div></div>'
      :'<div class="card muted">עוד אף אחד לא נרשם דרך קישור הזמנה.</div>');});
  const g=[...document.querySelectorAll('#boNav .bogrp')].find(x=>x.querySelector('[data-s="reporters"]'));const rb=document.querySelector('#boNav [data-s="referrals"]');if(g&&rb&&rb.parentNode!==g)g.querySelector('[data-s="reporters"]').after(rb);
}catch(e){console.warn('bo referrals',e);}
});
/* באזור האישי: כמה נרשמו דרכי */
const _v26RenderMe=renderMe;
renderMe=function(){const r=_v26RenderMe.apply(this,arguments);try{if(meTab==='info'&&sb&&authUser){const b=document.querySelector('#meBody');
  if(b&&!b.querySelector('#me26inv')){b.insertAdjacentHTML('afterbegin','<div class="mecard" id="me26inv"><h4>💌 '+T('הזמנת חברים','Invite friends')+'</h4><p style="margin:4px 0">'+T('נרשמו דרכך:','Joined through you:')+' <b id="me26n" style="font-size:20px">…</b> <span id="me26b"></span></p><button class="btn sec" id="me26open">📤 '+T('הקישור האישי שלי','My personal link')+'</button></div>');
    b.querySelector('#me26open').onclick=()=>{document.querySelector('#meOverlay').classList.remove('open');openInvite26();};
    sb.rpc('my_referrals').then(({data,error})=>{const n=error?null:Number(data)||0;const el=document.querySelector('#me26n');if(!el)return;el.textContent=n===null?'—':String(n);
      /* התג עצמו (🎖️ שגריר ועוד) — מהשרת, בגרסה 44 */});}}}catch(e){}return r;};

/* ---------- תפריט ⚙️ ---------- */
add26('miSave26','💰','כמה חסכתי','My savings','miFinish',openSavings26);
add26('miWeek26','🛒','הסל השבועי — איפה הכי זול השבוע','Weekly basket','miSave26',openWeekly26);
add26('miSal26','📣','הסל הזול בעיר — תמונה לשיתוף ולהדפסה','Cheapest basket in your city','miWeek26',()=>openSal26());
add26('miAlert26','🔔','התראות מחיר על מוצרים','Price alerts','miSal26',()=>openAlerts26());
add26('miShop26','🛍️','מצב קנייה בחנות','Shopping mode','miAlert26',()=>{setTab('list');openShop26();});
add26('miCalc26','🧮','כמה לקנות לשבת / לאירוע','How much to buy','miReady',()=>openCalc26());
add26('miTop26','🏆','המדווחים של החודש','Top reporters','miReviews',openTop26);
add26('miInv26','💌','הזמנת חברים','Invite friends','miTop26',openInvite26);

/* ---------- יאמי ---------- */
yamiStep(async raw=>{const t=String(raw||'').trim();let m;
  if(/^(כמה חסכתי|כמה חסכנו|החיסכון שלי)\??$/.test(t)){botSay('💰 '+T('פתחתי את "כמה חסכתי"','Opened "My savings"'));openSavings26();return true;}
  if(/^(הסל הזול|הסל הזול בעיר|איפה הסל הזול|הסל הזול השבוע)\??$/.test(t)){botSay('📣 '+T('פותחת את הסל הזול השבוע ב'+userCity(),'Opening the cheapest basket in '+userCity()));setTimeout(openSal26,600);return true;}
  if(/^(מצב קנייה|אני בסופר|אני בחנות)$/.test(t)){botSay('🛍️ '+T('בהצלחה בקנייה!','Happy shopping!'));setTab('list');openShop26();return true;}
  if(/^(הסל השבועי|הסל השבועי שלי|איפה הכי זול השבוע)\??$/.test(t)){botSay('🛒 '+T('בודקת איפה הסל הקבוע שלך הכי זול השבוע...','Checking your weekly basket...'));openWeekly26();return true;}
  if(/^(המדווחים של החודש|טבלת המדווחים)$/.test(t)){openTop26();botSay('🏆');return true;}
  if(/^(להזמין חבר|הזמנת חברים|להזמין חברים)$/.test(t)){openInvite26();botSay('💌');return true;}
  if((m=t.match(/(?:תודיעי|תודיע|תעדכני|תעדכן|התראה)\s*(?:לי)?\s*כש(?:ה)?(.{2,40}?)\s+(?:יורד|ירד|תרד|יורדת|יהיה|תהיה)\s+(?:מתחת\s+)?(?:ל|מ)[-\s]?(\d+(?:[.,]\d+)?)/))){if(needLogin26())return true;
    if(alertAdd26(m[1],m[2]))botSay('🔔 '+T('סגרנו! כש'+m[1]+' יירד מתחת ל-'+fmtPrice(Number(m[2].replace(',','.')),myCurrency())+' — אודיע בפעמון.','Done! I will notify you.'));return true;}
  if((m=t.match(/(ליל שבת|סעודת שבת|שבת בצהריים|סעודה שלישית|קידוש|ברית|בר[\s-]?מצו?וה|שבע ברכות|שבת)\D{0,25}?(\d{1,4})\s*(?:סועדים|אורחים|איש|אנשים|מוזמנים|נפשות)/))){
    const w=m[1],type=/קידוש/.test(w)?'kiddush':/שבע ברכות/.test(w)?'sheva':/ברית/.test(w)?'brit':/בר[\s-]?מצו?וה/.test(w)?'bar':/שלישית/.test(w)?'third':/צהריים|סעודת שבת/.test(w)?'sat':'fri';
    botSay('🧮 '+T('פתחתי מחשבון — '+CALC26[type][0]+' ל-'+m[2]+' סועדים. אפשר לשנות ולהוסיף לרשימה.','Opened the calculator.'));openCalc26(type,+m[2]);return true;}
  return false;});

/* בדיקות רקע — פעם בכמה שעות כשהאתר פתוח */
setInterval(()=>{if(!document.hidden){salWeekly26();if(authUser){weeklyCheck26();alertsCheck26();}}},3*3600000);
setTimeout(salWeekly26,4000);
if(authUser)setTimeout(()=>{weeklyCheck26();alertsCheck26();savMonthly26();refClaim26();},3000);
guestBar26();
