/* ---------- 🔥 מבצעים בסניפים הקרובים — לכולם, ומעקב מבצעים עם התראות (נובמבר 2026) ----------
   1. "מחירים ← מבצעים": בראש המסך מופיעים המבצעים האמיתיים בסניפים הכי קרובים (מקבצי המבצעים שהרשתות מפרסמות
      לפי חוק שקיפות המחירים), עם Waze. קודם זה הופיע רק כשהשוואת החנויות פתוחה לכולם. המנהל יכול לכבות בבק אופיס.
      לא מבקשים מיקום בלי לחיצה: משתמשים במיקום שכבר אושר (עד 6 שעות) או בכתובת מהאזור האישי, ואם אין — כפתור.
   2. 🔔 מעקב מבצעים: בוחרים סניף אחד, כמה או את כולם (עד 8), ועל מה: כל המבצעים / רק מוצרים מהרשימות / רק מוצרים
      שכותבים. נבדק כל שעה כשהאתר או האפליקציה פתוחים, ומבצע חדש מגיע כהתראה (פעמון + טלפון אם ההתראות פעילות).
      הכל נשמר רק במכשיר של המשתמש (state.dealWatch), בלי מידע חדש בשרת. */
(function(){
const $dw=s=>document.querySelector(s);
const DW_MAX=8,HOUR=3600000;
let ndCache=null,ndBusy=false;
const ndKm=k=>k==null?'':(k<1?Math.round(k*1000)+' '+T('מ׳','m'):(+k).toFixed(1)+' '+T('ק״מ','km'));
/* מיקום בלי לשאול: מיקום שאושר לאחרונה, או הכתובת מהאזור האישי (נשמרת אחרי איתור ראשון) */
async function ndAutoLoc(){
  if(state.geo&&typeof state.geo.lat==='number'&&Date.now()-(state.geo.ts||0)<6*HOUR)return Object.assign({src:'gps'},state.geo);
  const q=typeof homeAddrText==='function'?homeAddrText():'';if(!q)return null;
  if(state.ndHome&&state.ndHome.q===q)return {lat:state.ndHome.lat,lng:state.ndHome.lng,city:state.ndHome.city||'',label:q,src:'home'};
  const g=await homeLocation();if(!g)return null;state.ndHome={q,lat:g.lat,lng:g.lng,city:g.city||''};save();return g;}
function ndWhere(g){return g.label||(g.src==='gps'?T('המיקום שלך','your location'):g.city)||'';}
async function ndLoad(box,g){
  ndBusy=true;
  try{const p=nmFetchDeals(g);const inner=box.querySelector('#ndDeals');await nmLoadDeals(g,p,inner);const d=await p;ndCache={g,d,ts:Date.now()};
    if(inner&&inner.isConnected&&!inner.innerHTML)inner.innerHTML='<p class="muted-note">'+T('לא מצאתי כרגע מבצעים בסניפים הקרובים (עד 15 ק״מ).','No deals found at nearby branches right now.')+'</p>';}
  finally{ndBusy=false;}}
function ndHead(g){const w=state.dealWatch;
  return '<div class="ndh"><span class="grow">📍 '+(g?esc(ndWhere(g)):T('מבצעים בסניפים לידך','Deals near you'))+'</span>'+
    '<button class="mini" id="ndMore">'+T('כתובת אחרת וחנויות','Other address & stores')+'</button>'+
    '<button class="mini'+(w&&w.on?' pri':'')+'" data-dwopen="1">🔔 '+(w&&w.on?T('במעקב','Watching'):T('מעקב מבצעים','Watch deals'))+'</button></div>';}
function ndMount(){
  if(typeof storesView==='undefined'||storesView!=='feed'||!nearDealsOn())return;
  const pane=storesPane;const nb=pane.querySelector('#nearMe');const row=nb&&nb.parentNode;
  const box=document.createElement('div');box.id='ndBox';box.className='rank nd85';
  if(row&&row.classList.contains('row2')){row.after(box);nb.remove();if(!row.children.length)row.remove();}
  else{const sg=pane.querySelector('.seg');if(sg)sg.after(box);else pane.prepend(box);}
  if(ndCache&&Date.now()-ndCache.ts<30*60000){box.innerHTML=ndHead(ndCache.g)+'<div id="ndDeals"></div>';nmLoadDeals(ndCache.g,Promise.resolve(ndCache.d),box.querySelector('#ndDeals'));return;}
  box.innerHTML=ndHead(null)+'<div id="ndDeals"><div class="empty">'+T('מחפשת מבצעים לידך...','Looking for deals near you...')+'</div></div>';
  if(ndBusy)return;
  ndAutoLoc().then(g=>{if(!box.isConnected)return;
    if(!g){box.innerHTML=ndHead(null)+'<p class="muted-note" style="margin:6px 0">'+T('המבצעים האמיתיים בסניפים הכי קרובים אליך: מה במבצע, המחיר הרגיל, מחיר המבצע וכמה חוסכים.','Real deals at the branches closest to you.')+'</p><button class="btn" id="ndGps" style="width:100%">📍 '+T('להראות את המבצעים לידי','Show deals near me')+'</button>';return;}
    box.innerHTML=ndHead(g)+'<div id="ndDeals"></div>';ndLoad(box,g);}).catch(()=>{});}
const _ndRender=renderStores;
renderStores=function(){const r=_ndRender.apply(this,arguments);try{ndMount();}catch(e){console.warn('nd85',e);}return r;};
storesPane.addEventListener('click',async e=>{
  if(e.target.closest('#ndMore')){e.stopPropagation();openNearMe();return;}
  if(e.target.closest('#ndGps')){e.stopPropagation();const box=$dw('#ndBox');if(!box)return;box.querySelector('#ndGps').disabled=true;
    const g=await exactLocation();if(!box.isConnected)return;
    if(!g){openNearMe();return;}box.innerHTML=ndHead(g)+'<div id="ndDeals"></div>';ndLoad(box,g);}},true);
/* בסוף רשימת המבצעים (במסך המבצעים ובחלון "חנויות ומבצעים קרובים") — כפתור למעקב */
const _ndLoadDeals=nmLoadDeals;
nmLoadDeals=async function(g,dealsP,box){const r=await _ndLoadDeals.apply(this,arguments);
  try{const el=box||$dw('#nmDeals');if(el&&el.isConnected&&el.innerHTML&&!el.querySelector('[data-dwopen]')){if(g)el.dataset.g=JSON.stringify({lat:g.lat,lng:g.lng,label:ndWhere(g)});
    el.insertAdjacentHTML('beforeend','<button class="btn sec" data-dwopen="1" style="width:100%;margin-top:6px">🔔 '+T('להודיע לי על מבצעים חדשים בסניפים האלה','Tell me about new deals at these branches')+'</button>');}}catch(e){}
  return r;};

/* ---------- 🔔 מעקב מבצעים ---------- */
function dwHash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36);}
const dwId=p=>dwHash((p.code||p.name||'')+'|'+p.deal_price+'|'+(p.qty||1)+'|'+(p.until||''));
function dwWords(w){
  if(w.what==='list'){const s=new Set();(state.lists||[]).forEach(l=>(l.items||[]).forEach(i=>{if(!i.done)s.add(norm(i.n));}));return Array.from(s).filter(n=>n.length>=2);}
  if(w.what==='words')return String(w.words||'').split(/[,\n،]/).map(x=>norm(x.trim())).filter(n=>n.length>=2);
  return null;}
function dwMatch(p,words){if(!words)return true;const n=norm(p.name||'');return words.some(x=>n.includes(x)||x.split(' ').every(t=>t&&n.includes(t)));}
async function dwCheck(force){const w=state.dealWatch;
  if(window.dwNative85&&dwNative85())return 0; /* אפליקציה 2.2 בודקת ברקע בעצמה (js/088-native22.js) */
  if(!w||!w.on||!Array.isArray(w.stores)||!w.stores.length||!nearDealsOn())return 0;
  if(!force&&(document.hidden||Date.now()-(w.at||0)<55*60000))return 0;
  w.at=Date.now();save();
  let d;try{d=await priceApi('/deals',{stores:w.stores.slice(0,DW_MAX).map(s=>s.k).join(','),per:25,exclude:srvHidden().join(',')});}catch(e){return 0;}
  const words=dwWords(w);if(words&&!words.length)return 0;
  w.seen=w.seen||{};let total=0;
  ((d&&d.stores)||[]).forEach(x=>{const s=x.store||{};const k=s.store;if(!k)return;
    const seen=new Set(w.seen[k]||[]);const hits=(x.deals||[]).filter(p=>dwMatch(p,words));const fresh=hits.filter(p=>!seen.has(dwId(p)));
    hits.forEach(p=>seen.add(dwId(p)));w.seen[k]=Array.from(seen).slice(-150);
    /* בפעם הראשונה על "כל המבצעים" — רק זוכרים מה כבר יש, כדי לא להציף. על מוצרים מסוימים — מודיעים גם על מה שכבר במבצע */
    if(!fresh.length||(!w.base&&!words))return;total+=fresh.length;
    const place=(s.chain_name||s.chain||'')+(s.name&&s.name!==s.city?' '+s.name:'')+(s.city?' · '+s.city:'');
    const title=fresh.length===1?T(fresh[0].name+' במבצע ב'+(s.chain_name||s.chain),fresh[0].name+' is on sale at '+(s.chain_name||s.chain)):T(fresh.length+' מבצעים חדשים ב'+(s.chain_name||s.chain),fresh.length+' new deals at '+(s.chain_name||s.chain));
    const body=place+': '+fresh.slice(0,3).map(p=>(p.text||p.name)+(p.pct>0?' (−'+p.pct+'%)':'')).join(' · ')+(fresh.length>3?' '+T('ועוד','and more'):'');
    notify('dw-'+k+'-'+dwHash(fresh.map(dwId).join(',')),'deal',title,body,'neardeals');});
  w.base=true;save();return total;}
window.dwCheck85=dwCheck;window.dwWords85=dwWords;
async function openDealWatch(gHint){
  const b=openSheet('🔔 '+T('מעקב מבצעים','Deal watch'),'<div class="empty">'+T('מחפשת סניפים לידך...','Finding branches near you...')+'</div>');b.onclick=null;b.onchange=null;b.oninput=null;
  const w=state.dealWatch||{};
  let g=gHint||(ndCache&&ndCache.g)||(w.g&&w.g.lat?w.g:null)||await ndAutoLoc();
  if(!g)g=await exactLocation();
  if(!g){b.innerHTML='<p class="muted-note">'+T('כדי לעקוב צריך לדעת איפה את/ה: מאשרים מיקום, או כותבים כתובת ב"👤 האזור האישי".','Allow location or add your address first.')+'</p><button class="btn" id="dwNear" style="width:100%">📍 '+T('בחירת מיקום או כתובת','Pick a location')+'</button>';
    b.onclick=e=>{if(e.target.closest('#dwNear'))openNearMe();};return;}
  let st=[];try{st=((await priceApi('/stores',{lat:(+g.lat).toFixed(5),lng:(+g.lng).toFixed(5),limit:16,exclude:srvHidden().join(',')}))||[]).filter(x=>!x.online&&x.km!=null&&x.km<=15).slice(0,12);}catch(e){}
  (w.stores||[]).forEach(s=>{if(!st.some(x=>x.store===s.k))st.push({store:s.k,chain_name:s.c,name:s.n,address:s.a,city:'',km:null});});
  if(!st.length){b.innerHTML='<p class="muted-note">'+T('לא מצאתי סניפים עם קבצי מבצעים עד 15 ק״מ ממך.','No branches with deal files within 15 km.')+'</p>';return;}
  const on=new Set((w.stores||[]).map(s=>s.k));if(!on.size)st.slice(0,3).forEach(x=>on.add(x.store));
  const what=w.what||'all';
  const rad=(v,l,sub)=>'<label class="dwopt"><input type="radio" name="dwWhat" value="'+v+'"'+(what===v?' checked':'')+'><span><b>'+l+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</span></label>';
  b.innerHTML='<p class="muted-note">📍 '+esc(ndWhere(g))+' · '+T('נבדק כל שעה כשהאתר או האפליקציה פתוחים. מבצע חדש מגיע כהתראה בפעמון 🔔, ובטלפון כשההתראות פעילות.','Checked hourly while the site or app is open.')+'</p>'+
    '<div class="rank"><h3>🏪 '+T('באילו סניפים?','Which branches?')+'</h3><div class="row2" style="margin-bottom:4px"><button class="mini" id="dwAll">'+T('את כולם','All')+'</button><button class="mini" id="dwNone">'+T('ניקוי','Clear')+'</button><small class="muted-note" id="dwCnt" style="margin:0;align-self:center"></small></div>'+
      st.map(x=>'<label class="dwopt"><input type="checkbox" data-dwst="'+esc(x.store)+'" data-c="'+esc(x.chain_name||x.chain||'')+'" data-n="'+esc(x.name||'')+'" data-a="'+esc(srvAddr(x))+'"'+(on.has(x.store)?' checked':'')+'><span><b>'+esc(x.chain_name||x.chain||'')+'</b><small>'+esc(srvAddr(x))+(x.km!=null?' · '+ndKm(x.km):'')+'</small></span></label>').join('')+'</div>'+
    '<div class="rank"><h3>🏷️ '+T('על אילו מבצעים?','Which deals?')+'</h3>'+
      rad('all',T('כל המבצעים בסניפים','All deals at these branches'),T('הודעה אחת לכל סניף עם מה שחדש','One message per branch'))+
      rad('list',T('רק מוצרים מהרשימות שלי','Only products on my lists'),T('כשמוצר שברשימה נכנס למבצע','When an item on your list goes on sale'))+
      rad('words',T('רק מוצרים שאני בוחר/ת','Only products I choose'),'')+
      '<textarea id="dwWords" maxlength="400" placeholder="'+T('למשל: במבה, חיתולים, שמן קנולה','e.g. diapers, oil')+'" style="min-height:56px;margin-top:4px"'+(what==='words'?'':' hidden')+'>'+esc(w.words||'')+'</textarea></div>'+
    '<button id="dwSave" style="width:100%">🔔 '+T(w.on?'שמירה':'להתחיל לעקוב','Start watching')+'</button>'+
    (w.on?'<button class="btn sec" id="dwStop" style="width:100%;margin-top:6px">'+T('הפסקת המעקב','Stop watching')+'</button>':'')+
    (!prefs.notify?'<p class="muted-note" style="margin-top:8px">🔕 '+T('ההתראות לטלפון כבויות, אז המבצעים יופיעו רק בפעמון.','Phone notifications are off.')+' <button class="mini" id="dwNotif">'+T('להפעיל התראות','Turn on')+'</button></p>':'');
  const boxes=()=>Array.from(b.querySelectorAll('[data-dwst]'));
  const count=()=>{const n=boxes().filter(x=>x.checked).length;b.querySelector('#dwCnt').textContent=n+' '+T('נבחרו','selected')+(n>=DW_MAX?' ('+T('עד ','max ')+DW_MAX+')':'');boxes().forEach(x=>{x.disabled=!x.checked&&n>=DW_MAX;});};
  count();
  b.onchange=e=>{if(e.target.matches('[data-dwst]'))count();if(e.target.name==='dwWhat')b.querySelector('#dwWords').hidden=e.target.value!=='words';};
  b.onclick=async e=>{
    if(e.target.closest('#dwAll')){boxes().forEach(x=>x.checked=false);boxes().slice(0,DW_MAX).forEach(x=>x.checked=true);count();return;}
    if(e.target.closest('#dwNone')){boxes().forEach(x=>x.checked=false);count();return;}
    if(e.target.closest('#dwNotif')){closeSheet();openNotif();return;}
    if(e.target.closest('#dwStop')){state.dealWatch=Object.assign({},w,{on:false});save();flash(T('המעקב הופסק','Stopped'));closeSheet();try{renderStores();}catch(x){}return;}
    if(e.target.closest('#dwSave')){
      const sel=boxes().filter(x=>x.checked).slice(0,DW_MAX).map(x=>({k:x.dataset.dwst,c:x.dataset.c,n:x.dataset.n,a:x.dataset.a}));
      if(!sel.length){flash(T('בוחרים לפחות סניף אחד','Pick at least one branch'));return;}
      const wh=(b.querySelector('[name=dwWhat]:checked')||{}).value||'all';const words=b.querySelector('#dwWords').value.trim().slice(0,400);
      if(wh==='words'&&!words){flash(T('כותבים אילו מוצרים','Write which products'));b.querySelector('#dwWords').focus();return;}
      if(typeof hasProfanity==='function'&&hasProfanity(words)){flash('🙏');return;}
      const same=w.on&&w.what===wh&&(w.words||'')===words;
      const seen={};if(same)sel.forEach(s=>{if(w.seen&&w.seen[s.k])seen[s.k]=w.seen[s.k];});
      state.dealWatch={on:true,stores:sel,what:wh,words,g:{lat:+g.lat,lng:+g.lng,label:ndWhere(g)},seen,base:same&&!!w.base&&sel.every(s=>seen[s.k]),at:0};save();
      closeSheet();flash('🔔 '+T('מעכשיו אודיע לך על מבצעים חדשים ב-'+sel.length+' סניפים','Watching '+sel.length+' branches'));
      try{renderStores();}catch(x){}
      const n=await dwCheck(true);if(n)flash('🏷️ '+T('מצאתי כבר '+n+' מבצעים — בפעמון 🔔','Found '+n+' deals — see the bell'));}
  };}
window.openDealWatch=openDealWatch;
document.addEventListener('click',e=>{const t=e.target.closest('[data-dwopen]');if(!t)return;e.preventDefault();e.stopPropagation();
  let g=null;try{const host=t.closest('[data-g]');if(host)g=JSON.parse(host.dataset.g);}catch(x){}openDealWatch(g);},true);

/* לחיצה על ההתראה: למסך המבצעים (או לחלון הקרובים, אם המנהל הסתיר את "מבצעים") */
const _ndSetTab=setTab;
setTab=function(t){if(t!=='neardeals')return _ndSetTab.apply(this,arguments);
  const ok=typeof storeSegsOn!=='function'||storeSegsOn().includes('feed');storesView='feed';_ndSetTab('stores');if(!ok)openNearMe();};
try{if(new URLSearchParams(location.search).get('tab')==='neardeals')setTimeout(()=>setTab('neardeals'),1200);}catch(e){}

setTimeout(()=>dwCheck(),6000);
setInterval(()=>dwCheck(),15*60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)dwCheck();});

const st=document.createElement('style');
st.textContent='.nd85{margin:0 0 12px}.nd85 .ndh{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.nd85 .ndh .grow{flex:1 1 140px;font-weight:600;min-width:0;overflow-wrap:anywhere}.nd85 #ndDeals>.rank{margin:6px 0 0;padding:0;box-shadow:none;background:none;border:0}'+
  '.dwopt{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line,#e5e5e5);cursor:pointer;margin:0;color:var(--text)}.dwopt input{margin-top:3px;flex:0 0 auto;width:18px;height:18px}.dwopt span{display:flex;flex-direction:column;min-width:0}.dwopt small{color:var(--muted)}';
document.head.appendChild(st);
})();
