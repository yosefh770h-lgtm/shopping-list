
/* ================= 🧾 אחרי סריקת קבלה: איפה היה יותר זול? =================
   משווים את מה ששילמתם בקבלה למחירים שבשרת המחירים (קבצי שקיפות המחירים של הרשתות) —
   בסניפים שליד החנות שקניתם בה, או ליד הבית. נפתח לבד אחרי אישור הקבלה, ואפשר לחזור מ"הקניות שלי" */
(function(){
const $c=s=>document.querySelector(s);
const rcN=x=>{const v=parseFloat(String(x==null?'':x).replace(/[^\d.]/g,''));return isFinite(v)?v:0;};
const okBc=b=>/^\d{7,13}$/.test(b);
/* אורח (3 חיפושים לניסיון) — לא פותחים לבד ולא מבזבזים לו חיפוש על בדיקה חוזרת */
const rcxFree=()=>typeof window.srvTriesLeft!=='function'||window.srvTriesLeft()===Infinity;
/* שורות הקבלה עם מחיר: מה קנינו, כמה, וכמה שילמנו. אותו מוצר פעמיים = שורה אחת */
function rcxLines(items){const by={};
  (items||[]).forEach(it=>{const pr=rcN(it.price);if(!(pr>0))return;const q=rcN(it.q)||1;const bc=String(it.barcode||'').replace(/\D/g,'');
    const k=okBc(bc)?bc:norm(it.n||'');if(!k)return;const o=by[k]||(by[k]={n:String(it.n||''),bc:okBc(bc)?bc:'',q:0,paid:0});o.q+=q;o.paid=rnd2(o.paid+pr*q);});
  return Object.values(by).slice(0,60);}
/* כמות שלמה נשלחת לשרת (בשביל מבצעי 2 ב-…); משקל (1.25 ק"ג) — מחשבים כאן לפי המחיר ליחידה */
const sendQty=q=>Number.isInteger(q)&&q>=2&&q<=99?q:1;
const itemsParam=(ls,byName)=>ls.map(l=>((byName||!l.bc)?l.n.replace(/[|*\n]/g,' ').trim().slice(0,80):l.bc)+(sendQty(l.q)>1?'*'+sendQty(l.q):'')).join('|');
async function rcxCompare(lines,where){
  const hid=srvHidden();
  const d=await priceApi('/compare',Object.assign({items:itemsParam(lines,false),limit:20,exclude:hid.join(',')},where));
  const st=d.stores||[];
  /* ברקוד שאין בשרת — מנסים שוב לפי השם, באותם סניפים */
  const miss=lines.map((l,n)=>l.bc&&!st.some(s=>s.lines[n]&&s.lines[n].found)?n:-1).filter(n=>n>=0);
  if(miss.length&&st.length&&rcxFree()){try{const d2=await priceApi('/compare',{items:itemsParam(miss.map(n=>lines[n]),true),stores:st.map(s=>s.store).join(','),limit:st.length});
    const byS={};(d2.stores||[]).forEach(s=>{byS[s.store]=s;});
    st.forEach(s=>{const s2=byS[s.store];if(s2)miss.forEach((n,j)=>{if(s2.lines[j]&&s2.lines[j].found)s.lines[n]=s2.lines[j];});});}catch(e){}}
  return st.filter(s=>!hid.includes(s.chain)).map(s=>{let paid=0,cost=0,found=0;
    const rows=lines.map((l,n)=>{const x=s.lines[n];if(!x||!x.found)return null;const c=rnd2(x.cost*l.q/(x.qty||1));found++;paid+=l.paid;cost+=c;return {l,x,c};});
    return Object.assign({},s,{rows,found,paid:rnd2(paid),cost:rnd2(cost),save:rnd2(paid-cost)});}).filter(s=>s.found>0);}
/* הסניף שקניתם בו — לפי שם הרשת והסניף שבקבלה */
const STOPW=/^(סניף|בע"?מ|בעמ|טל|טלפון|ח\.?פ|עוסק|מורשה|רחוב|רח)$/;
const words=s=>String(s||'').replace(/[^\p{L}\p{N}\s'"-]/gu,' ').split(/\s+/).filter(w=>w.length>=2&&!STOPW.test(w)&&!/^\d{5,}$/.test(w));
async function rcxFindStore(store,branch){
  const tries=[words(store+' '+branch).slice(0,5),words(branch).slice(0,4)];
  for(const t of tries){if(!t.length)continue;try{const r=await priceApi('/stores',{q:t.join(' '),limit:1});if(r&&r[0]&&r[0].lat!=null)return r[0];}catch(e){}}
  return null;}
function cityIn(text){const w=words(text);for(let len=3;len>=1;len--)for(let i=0;i+len<=w.length;i++){const c=knownCity(w.slice(i,i+len).join(' '));if(c)return c;}return '';}
const storeLabel=s=>esc(s.chain_name||'')+(s.brand?' · '+esc(s.brand):'')+(s.name?' '+esc(s.name):'');
function rcxDraw(res,st,lines,here){
  const cur=myCurrency();
  if(!st.length){res.innerHTML='<p class="muted-note">🤷 '+T('לא מצאנו באזור הזה מחירים למוצרים שבקבלה','No prices found here for the receipt items')+'</p>';return;}
  const isHere=s=>here&&s.store===here.store;
  const best=st.filter(s=>!isHere(s)&&s.save>0.5).sort((a,b)=>b.save-a.save)[0];
  let h='';
  if(best)h+='<div class="rank rcxbest"><h3>✅ '+T('ב','At ')+storeLabel(best)+(best.km!=null?' <small>('+best.km+T(' ק"מ',' km')+')</small>':'')+'</h3><p>'+
    T('היית משלם ','You would pay ')+'<b>'+fmtPrice(best.cost,cur)+'</b>'+T(' במקום ',' instead of ')+'<b>'+fmtPrice(best.paid,cur)+'</b>'+T(' על '+best.found+' מוצרים',' for '+best.found+' items')+
    ' — <b class="rcxsave">'+T('חוסכים ','save ')+fmtPrice(best.save,cur)+' ('+Math.round(100*best.save/Math.max(.01,best.paid))+'%)</b></p></div>';
  else h+='<div class="rank rcxbest ok"><h3>🎉 '+T('קנית במחיר טוב!','You paid a good price!')+'</h3><p>'+T('לא מצאנו באזור הזה מקום שהיה זול יותר למוצרים שקנית.','No cheaper place found here for what you bought.')+'</p></div>';
  /* כל מוצר — איפה הוא היה הכי זול */
  const per=lines.map((l,n)=>{let m=null;st.forEach(s=>{const r=s.rows[n];if(r&&(!m||r.c<m.c))m={c:r.c,s,x:r.x};});return m&&m.c<l.paid-0.05?{l,m}:null;}).filter(Boolean);
  if(per.length){const tot=rnd2(per.reduce((a,p)=>a+p.l.paid-p.m.c,0));
    h+='<div class="rank"><h3>🧩 '+T('מוצרים שהיו זולים יותר במקום אחר','Items that were cheaper elsewhere')+' <small>— '+T('עד ','up to ')+fmtPrice(tot,cur)+'</small></h3>'+
      per.map(p=>'<div class="merow">'+(thumb53('x')?thumb53(p.m.x.code||p.l.bc,p.m.x.name||p.l.n,p.l.n):'<span>'+emojiOf(p.l.n)+'</span>')+'<span class="grow">'+esc(p.l.n)+(p.l.q!==1?' ×'+rnd2(p.l.q):'')+'<small>'+storeLabel(p.m.s)+(p.m.s.km!=null?' · '+p.m.s.km+T(' ק"מ',' km'):'')+(p.m.x.deal?' · 🔥 '+esc(p.m.x.deal.text||T('מבצע','deal')):'')+'</small></span><b><s class="was18">'+fmtPrice(p.l.paid,cur)+'</s> '+fmtPrice(p.m.c,cur)+'</b></div>').join('')+'</div>';}
  /* הסניפים — מהחיסכון הכי גדול */
  const MED=['🥇','🥈','🥉'];
  const list=st.slice().sort((a,b)=>b.save-a.save).slice(0,10);
  h+='<div class="rank"><h3>🏪 '+T('אותם מוצרים בחנויות באזור','The same items in nearby stores')+'</h3>'+list.map((s,i)=>
    '<details class="srvSt"><summary class="rkrow"><span class="rkn">'+(isHere(s)?'📍':(s.save>0.5?(MED[i]||(i+1)):'▫️'))+'</span><span><b>'+storeLabel(s)+'</b><small> · '+esc([s.address,s.city].filter(Boolean).join(', '))+(s.km!=null?' · '+s.km+T(' ק"מ',' km'):'')+(isHere(s)?' · '+T('כאן קנית','where you bought'):'')+'</small></span>'+
    '<span class="amt">'+fmtPrice(s.cost,cur)+'</span><small>'+T('על '+s.found+' מתוך '+lines.length+' מוצרים · שילמת עליהם ',s.found+' of '+lines.length+' items · you paid ')+fmtPrice(s.paid,cur)+' · '+
    (s.save>0.5?'<b class="rcxsave">'+T('זול ב-','cheaper by ')+fmtPrice(s.save,cur)+'</b>':s.save<-0.5?T('יקר ב-','dearer by ')+fmtPrice(-s.save,cur):T('בערך אותו מחיר','about the same'))+'</small></summary>'+
    lines.map((l,n)=>{const r=s.rows[n];return '<div class="merow"><span>'+(r?(r.c<l.paid-0.05?'✅':'▫️'):'🤷')+'</span>'+(r?thumb53(r.x.code||l.bc,r.x.name||l.n,l.n):'')+'<span class="grow">'+esc(l.n)+(l.q!==1?' ×'+rnd2(l.q):'')+'<small>'+(r?esc(r.x.name||'')+(r.x.deal?' · 🔥 '+esc(r.x.deal.text||T('מבצע','deal')):''):T('אין בחנות','not in this store'))+' · '+T('שילמת ','you paid ')+fmtPrice(l.paid,cur)+'</small></span><b>'+(r?fmtPrice(r.c,cur):'—')+'</b></div>';}).join('')+'</details>').join('')+'</div>';
  const none=lines.filter((l,n)=>!st.some(s=>s.rows[n]));
  if(none.length)h+='<p class="muted-note">🤷 '+T('לא מצאנו בשרת: ','Not found on the server: ')+none.map(l=>esc(l.n)).join(', ')+'</p>';
  h+='<p class="muted-note">ℹ️ '+T('המחירים של היום, לפי קבצי שקיפות המחירים של הרשתות (כולל מבצעים לכל הלקוחות). ביום הקנייה המחירים יכלו להיות קצת אחרים.','Today\'s prices from the chains\' official price files. Prices on the purchase day may have differed.')+'</p>';
  res.innerHTML=h;}
async function openRcCheaper(h){
  if(!h)return;
  basketTitle('💡 '+T('איפה היה יותר זול?','Where was it cheaper?'));
  const box=$c('#basketBody');$c('#basketOverlay').classList.add('open');
  const lines=rcxLines(h.items);const cur=myCurrency();
  if(!lines.length){box.innerHTML='<div class="empty">'+T('אין בקבלה הזו מחירים להשוואה','No prices on this receipt to compare')+'</div>';return;}
  const paid=rnd2(lines.reduce((a,l)=>a+l.paid,0));const store=String(h.store||''),branch=String(h.branch||'');
  const city0=((meData().address||{}).city)||state.geoCity||userCity();
  box.innerHTML='<div class="rank rcxhead"><p>🧾 '+T('קנית ב','You bought at ')+'<b>'+esc(store||T('חנות','a store'))+'</b>'+(branch?' '+esc(branch):'')+' · '+esc(fmtDate(new Date(h.ts)))+'<br>'+T('שילמת ','You paid ')+'<b>'+fmtPrice(paid,cur)+'</b>'+T(' על '+lines.length+' מוצרים עם מחיר',' for '+lines.length+' priced items')+'</p>'+
    (srvPublic()?'':'<p class="muted-note" style="background:#fff3c4;color:#5a4300;border-radius:8px;padding:6px 8px">👁️ '+T('מצב בדיקה: רק מנהלים רואים את זה. מדליקים לכולם בבק אופיס ← 💰 מחירים.','Test mode: only admins see this.')+'</p>')+
    '<div class="rcxseg" role="group" aria-label="'+T('איפה לחפש','Where to look')+'"><button type="button" data-rcx="store" aria-pressed="true">🏪 '+T('ליד החנות שקנית','Near the store')+'</button><button type="button" data-rcx="home" aria-pressed="false">🏠 '+T('ליד הבית','Near home')+'</button></div>'+
    '<div class="row18" id="rcxHome" hidden><input id="rcxCity" list="rcxCities" autocomplete="off" value="'+esc(city0)+'" placeholder="'+T('עיר','City')+'" aria-label="'+T('עיר','City')+'"><datalist id="rcxCities"></datalist><button id="rcxGo">🔎 '+T('השוואה','Compare')+'</button><button class="sec" id="rcxNear">📍 '+T('קרוב אליי','Near me')+'</button></div>'+
    '<p class="muted-note" id="rcxWhere"></p></div><div id="rcxRes" aria-live="polite"></div>';
  const res=$c('#rcxRes'),whereEl=$c('#rcxWhere'),cityEl=$c('#rcxCity');
  let seq=0;
  const run=async(where,label,here)=>{const my=++seq;whereEl.textContent=label;res.innerHTML='<p class="muted-note">'+T('משווה... 🧮','Comparing... 🧮')+'</p>';
    try{const st=await rcxCompare(lines,where);if(my===seq)rcxDraw(res,st,lines,here);}catch(e){if(my===seq)res.innerHTML='<p class="muted-note">⚠️ '+esc(e.message||'')+'</p>';}};
  const home=()=>{const c=cityEl.value.trim();if(c)run({city:c},'🏠 '+T('סניפים ב','Branches in ')+c);};
  const nearStore=async()=>{const my=++seq;whereEl.textContent='';res.innerHTML='<p class="muted-note">🔎 '+T('מחפשת את הסניף שקנית בו...','Finding the branch you bought at...')+'</p>';
    const s=await rcxFindStore(store,branch);if(my!==seq)return;
    if(s){run({lat:Number(s.lat).toFixed(4),lng:Number(s.lng).toFixed(4),limit:15},'📍 '+T('סניפים ליד ','Branches near ')+(s.chain_name||'')+(s.name?' '+s.name:'')+(s.city?', '+s.city:''),s);return;}
    const c=cityIn(branch)||cityIn(store);
    if(c){run({city:c},'🏪 '+T('לא מצאתי את הסניף המדויק — סניפים ב','Branch not found — branches in ')+c);return;}
    res.innerHTML='<p class="muted-note">🤷 '+T('לא מצאתי איפה הסניף שקנית בו. אפשר לבחור "ליד הבית" או לכתוב עיר.','Could not find the branch. Try "Near home" or type a city.')+'</p>';};
  const seg=m=>{box.querySelectorAll('[data-rcx]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rcx===m)));$c('#rcxHome').hidden=m!=='home';if(m==='home')home();else nearStore();};
  box.querySelectorAll('[data-rcx]').forEach(b=>{b.onclick=()=>seg(b.dataset.rcx);});
  $c('#rcxGo').onclick=home;
  cityEl.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();home();}};
  let tmr=0;cityEl.oninput=()=>{clearTimeout(tmr);const q=cityEl.value.trim();if(q.length<2)return;tmr=setTimeout(async()=>{try{const cs=await priceApi('/cities',{q});$c('#rcxCities').innerHTML=cs.map(c=>'<option value="'+esc(c.city)+'">'+c.stores+' '+T('סניפים','branches')+'</option>').join('');}catch(e){}},250);};
  $c('#rcxNear').onclick=async()=>{const my=++seq;res.innerHTML='<p class="muted-note">📍 '+T('מאתרת מיקום...','Locating...')+'</p>';
    const g=await exactLocation()||await homeLocation();if(my!==seq)return;
    if(!g){res.innerHTML='<p class="muted-note">⚠️ '+T('לא הצלחנו לאתר מיקום. אפשר לבחור עיר.','Could not get your location. Pick a city.')+'</p>';return;}
    run({lat:g.lat.toFixed(4),lng:g.lng.toFixed(4),limit:15},'📍 '+T('הסניפים הכי קרובים אליך','Branches closest to you'));};
  if(store||branch)nearStore();else seg('home');}
window.openRcCheaper=openRcCheaper;
const rcxCan=h=>!!(h&&h.receipt&&srvShown()&&rcxLines(h.items).length);
window.rcxCan=rcxCan;
/* אחרי אישור הקבלה — פותחים לבד את ההשוואה */
const _rcxConfirm=confirmUpload;
confirmUpload=async function(){let branch='';const t0=Date.now();
  if(upMode==='receipt'){const b=$c('#urBranch');branch=b?b.value.trim().slice(0,60):'';}
  const res=await _rcxConfirm.apply(this,arguments);
  if(upMode==='receipt'){const h=(state.history||[]).find(x=>x&&x.receipt&&x.uploadedAt>=t0);
    if(h){if(branch&&!h.branch){h.branch=branch;save();}if(rcxCan(h)&&rcxFree())setTimeout(()=>openRcCheaper(h),700);}}
  return res;};
/* "הקניות שלי": כפתור לכל קבלה */
document.addEventListener('click',e=>{const b=e.target.closest('#meBody [data-purcheap]');if(!b)return;e.preventDefault();e.stopPropagation();openRcCheaper(state.history[+b.dataset.purcheap]);},true);
})();
