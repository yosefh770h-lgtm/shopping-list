
/* ================= גרסה 7: הרגלי קנייה, אזור אישי, פעמון התראות, חוות דעת, דירוג רשתות, מבצעים לפי מיקום ================= */
const GW2=(f,m)=>state.gender==='m'?m:f;
const DAY_MS=86400000;
const dayName=d=>T('יום '+DAYS[d],['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d]);
/* בזמני הזמנה — במקום "שבת": מוצאי שבת */
const orderDayName=d=>+d===6?T('מוצאי שבת','Saturday night'):dayName(d);
function meData(){state.me=Object.assign({address:{},stores:[],orders:[],providers:[]},state.me||{});['stores','orders','providers'].forEach(k=>{if(!Array.isArray(state.me[k]))state.me[k]=[];});if(!state.me.address||typeof state.me.address!=='object')state.me.address={};return state.me;}
function meSave(){meData().ts=Date.now();save();}

/* ---------- הרגלי קנייה: לומדים מההיסטוריה איפה קונים כל מוצר ובאיזו תדירות ---------- */
let habitMemo=null,habitMemoKey='';
function habits(){
  const h0=state.history[0];const key=state.history.length+'|'+(h0?h0.ts+'|'+(h0.store||''):'')+'|'+state.history.reduce((a,h)=>a+(h.store?1:0),0);
  if(habitMemo&&habitMemoKey===key)return habitMemo;
  const prods={},stores={},dows=[0,0,0,0,0,0,0],hours={};let items=0,withStore=0;
  state.history.forEach(h=>{
    const st=String(h.store||'').trim();if(st){stores[st]=(stores[st]||0)+1;withStore++;}
    const d=new Date(h.ts);dows[d.getDay()]++;const hr=d.getHours();const part=hr<12?T('בוקר','morning'):hr<17?T('צהריים','afternoon'):T('ערב','evening');hours[part]=(hours[part]||0)+1;
    (h.items||[]).forEach(i=>{if(!i||!i.n)return;items++;const p=prods[i.n]||(prods[i.n]={n:i.n,e:i.e||emojiOf(i.n),count:0,stores:{},times:[]});p.count++;p.times.push(h.ts);if(st)p.stores[st]=(p.stores[st]||0)+1;});
  });
  const list=Object.values(prods).map(p=>{
    p.times.sort((a,b)=>a-b);p.last=p.times[p.times.length-1];
    const days=Array.from(new Set(p.times.map(t=>Math.floor(t/DAY_MS))));
    p.every=days.length>=2?Math.max(1,Math.round((days[days.length-1]-days[0])/(days.length-1))):0;
    const se=Object.entries(p.stores).sort((a,b)=>b[1]-a[1]);p.store=se.length?se[0][0]:'';p.storePct=se.length?Math.round(100*se[0][1]/p.count):0;
    return p;}).sort((a,b)=>b.count-a.count||b.last-a.last);
  habitMemo={prods:list,byName:prods,stores,dows,hours,trips:state.history.length,items,withStore};habitMemoKey=key;
  return habitMemo;
}
function usualStore(n){const p=habits().byName[n];return p&&p.store?p.store:'';}
function dueItems(){
  const now=Date.now(),l=curList();const inList=new Set(l.items.filter(i=>!i.done).map(i=>i.n));
  return habits().prods.filter(p=>p.count>=2&&p.every>0&&!inList.has(p.n)&&(now-p.last)/DAY_MS>=p.every*0.9).slice(0,12);
}
/* הקנייה הקודמת — כולל קניות חלקיות באותו יום בכמה חנויות */
function lastShopping(){
  const h=state.history;if(!h.length)return null;const t0=h[0].ts;
  const trips=h.filter(x=>t0-x.ts<36*3600000);const m=new Map();
  trips.forEach(t=>(t.items||[]).forEach(i=>{if(i&&i.n&&!m.has(i.n))m.set(i.n,i);}));
  return {ts:t0,items:Array.from(m.values()),stores:Array.from(new Set(trips.map(t=>t.store).filter(Boolean)))};
}
function addMany(items){
  const l=curList();let n=0;
  items.forEach(it=>{const name=it.n||it.name;if(!name||l.items.some(x=>x.n===name&&!x.done))return;
    l.items.push({id:uid(),n:name,q:it.q||'',c:resolveCat(name),e:emojiOf(name),done:false,ts:Date.now()});state.stats[name]=(state.stats[name]||0)+1;n++;});
  if(n){save();render();}
  return n;
}
/* שכפול רשימה (מהרשימות או מההיסטוריה) — רשימה חדשה עם אותם מוצרים, כולם לא מסומנים */
async function dupList(name,items){
  const base=String(name||T('רשימה','List')).replace(/\s*\((?:עותק|copy)(?: \d+)?\)$/i,'').slice(0,30);
  const def=base+' ('+T('עותק','copy')+')';
  const n=(await uiPrompt(T('שם הרשימה החדשה:','New list name:'),def));if(n===null)return null;
  const nm=(n.trim()||def).slice(0,40);if(hasProfanity(nm)){flash('🙏');return null;}
  const seen=new Set();const its=[];
  (items||[]).forEach(i=>{const k=i&&(i.n||i.name);if(!k||seen.has(k))return;seen.add(k);
    its.push(Object.assign({id:uid(),n:k,q:i.q||'',c:i.c||resolveCat(k),e:i.e||emojiOf(k),done:false,ts:Date.now()},i.note?{note:String(i.note).slice(0,200)}:{}));});
  const l={id:uid(),name:nm,items:its,created:Date.now()};state.lists.push(l);state.active=l.id;save();render();
  flash('📑 '+T('נוצרה רשימה "'+nm+'" עם '+its.length+' מוצרים','Created "'+nm+'" with '+its.length+' items'));return l;}
function reorderLast(){
  const last=lastShopping();if(!last){flash(T('עוד אין קנייה קודמת 🙂','No previous shopping yet 🙂'));return 0;}
  const n=addMany(last.items);flash(n?('🔁 '+T('הוספתי '+n+' מוצרים מהקנייה הקודמת','Added '+n+' items from last time')):T('הכל כבר ברשימה ✔','Everything is already on the list ✔'));return n;
}
function myProductNames(){
  const s=new Set();habits().prods.slice(0,40).forEach(p=>s.add(p.n));
  state.lists.forEach(l=>l.items.forEach(i=>{if(!i.done)s.add(i.n);}));
  return Array.from(s);
}
function habitsSummary(max){
  const H=habits();if(!H.trips)return '';
  const topStores=Object.entries(H.stores).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const favDay=H.dows.indexOf(Math.max(...H.dows));
  return T('קניות שנרשמו: ','Trips: ')+H.trips+' · '+T('יום קנייה נפוץ: ','Usual day: ')+dayName(favDay)+
    (topStores.length?'\n'+T('חנויות: ','Stores: ')+topStores.map(([s,c])=>s+' ('+Math.round(100*c/Math.max(1,H.withStore))+'%)').join(', '):'')+
    '\n'+H.prods.slice(0,max||12).map(p=>'• '+p.n+' — '+T('נקנה ','bought ')+p.count+'×'+(p.store?T(' · בד״כ ב',' · usually at ')+p.store:'')+(p.every?T(' · כל ~',' · every ~')+p.every+T(' ימים',' days'):'')).join('\n');
}

/* ---------- סיום קנייה — רק מה שסימנת, ואיפה קנית (כדי ללמוד) ---------- */
function myStoreNames(){return Array.from(new Set(meData().stores.map(s=>s.name).concat(Object.keys(habits().stores)).concat(allChainNames()))).filter(Boolean);}
function guessStore(items){
  const c={};items.forEach(i=>{const s=usualStore(i.n);if(s)c[s]=(c[s]||0)+1;});
  const best=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];return best?best[0]:((meData().stores[0]||{}).name||'');
}
function openFinish(){
  document.querySelector('#hMenu').classList.remove('open');
  const l=curList();const done=l.items.filter(i=>i.done),all=l.items;
  if(!all.length){flash(T('הרשימה ריקה 🙂','The list is empty 🙂'));return;}
  const partial=done.length&&done.length<all.length;
  const b=document.querySelector('#finishBody');
  b.innerHTML=(partial?'<div class="radio" data-r="done"><input type="radio" name="finOnly" value="done" id="finDone" checked><label for="finDone">✅ '+T('רק מה שסימנתי שקניתי ('+done.length+') — השאר ('+(all.length-done.length)+') נשארים ברשימה לחנות הבאה','Only what I ticked ('+done.length+') — the rest stays for the next store')+'</label></div>'+
      '<div class="radio" data-r="all"><input type="radio" name="finOnly" value="all" id="finAll"><label for="finAll">🧺 '+T('את כל הרשימה ('+all.length+')','The whole list ('+all.length+')')+'</label></div>'
    :(!done.length?'<p class="muted-note">'+T('לא סימנת פריטים — כל הרשימה ('+all.length+') תעבור להיסטוריה. טיפ: אפשר לסמן ✓ רק את מה שקנית, ולסיים רק אותו 🙂','Nothing ticked — the whole list ('+all.length+') moves to history.')+'</p>':'<p class="muted-note">'+T('כל '+all.length+' הפריטים סומנו ✓','All '+all.length+' items are ticked ✓')+'</p>'))+
    '<label class="il" for="finStore">🏪 '+T('איפה קנית? (לא חובה — ככה יאמי לומדת איפה את/ה קונה כל מוצר)','Where did you buy? (optional — helps Yami learn)')+'</label>'+
    '<input id="finStore" list="finStores" maxlength="40" placeholder="'+T('למשל: רמי לוי, שופרסל אונליין...','e.g. store name')+'" value="'+esc(guessStore(partial?done:all))+'">'+
    '<datalist id="finStores">'+myStoreNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>'+
    '<button id="finGo" style="width:100%">✅ '+T('סיום','Finish')+'</button>';
  document.querySelector('#finishOverlay').classList.add('open');
  document.querySelector('#finGo').onclick=()=>{
    const r=b.querySelector('input[name=finOnly]:checked');const store=document.querySelector('#finStore').value.trim();
    if(hasProfanity(store)){flash('🙏');return;}
    const n=finishList(false,{only:r?r.value:(done.length?'done':'all'),store});
    if(n)document.querySelector('#finishOverlay').classList.remove('open');
  };
}

/* ---------- פעמון — התראות ועדכונים מהמערכת ---------- */
const INBOX_KEY='yamh_inbox';
let inbox=[];try{inbox=JSON.parse(localStorage.getItem(INBOX_KEY)||'[]');if(!Array.isArray(inbox))inbox=[];}catch(e){inbox=[];}
function saveInbox(){inbox=inbox.slice(0,80);try{localStorage.setItem(INBOX_KEY,JSON.stringify(inbox));}catch(e){}}
const NCATS={deal:['🏷️','מבצעים על מוצרים שאני קונה ומחנויות שאני עוקב/ת','Deals on my products & followed stores'],drop:['📉','הוזלות מחיר','Price drops'],order:['⏰','זמני הזמנה ומוצרים שכנראה נגמרו','Order times & running-out items'],app:['🤖','גרסה חדשה לאפליקציה לאנדרואיד (למי שעוקב)','New Android app version (if you follow)']};
function nCatOn(c){return !prefs.nOff||!prefs.nOff[c];}
function sysNotify(title,body,tag,url){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  const opt={body:String(body||''),icon:'icons/app-192.png',badge:'icons/app-192.png',tag:tag||'',lang:'he',dir:'rtl',data:{url:url||'./'}};
  const direct=()=>{try{new Notification(title,opt);}catch(e){}};
  /* באנדרואיד חייבים לשלוח דרך ה-Service Worker */
  if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration().then(r=>{if(r&&r.showNotification)r.showNotification(title,opt).catch(direct);else direct();}).catch(direct);else direct();
}
function notify(id,cat,title,body,tab){
  if(!id||inbox.some(x=>x.id===id)||!nCatOn(cat))return false;
  const icon=(NCATS[cat]||['🔔'])[0];
  inbox.unshift({id,cat,icon,title:String(title).slice(0,120),body:String(body||'').slice(0,300),tab:tab||'',ts:Date.now(),read:false});
  saveInbox();updateBell(true);
  if(prefs.notify)sysNotify(icon+' '+title,body,id,tab?'./?tab='+tab:'./');
  return true;
}
function updateBell(ring){
  const n=inbox.filter(x=>!x.read).length;const bd=document.querySelector('#bellBadge');bd.hidden=!n;bd.textContent=n>9?'9+':String(n);
  const btn=document.querySelector('#btnBell');btn.classList.toggle('on',!!prefs.notify);
  /* השם לקורא מסך כולל תמיד את המספר שרואים על הפעמון */
  btn.setAttribute('aria-label',(n?bd.textContent+' — ':'')+T('התראות ועדכונים מהמערכת','Notifications and updates'));
  btn.title=prefs.notify?T('ההתראות פעילות 🔔','Notifications on 🔔'):T('לחצו כדי לקבל עדכונים מהמערכת','Tap to get updates');
  if(ring&&n){btn.classList.remove('ring');void btn.offsetWidth;btn.classList.add('ring');}
}
function permText(){
  if(!('Notification' in window))return T('הדפדפן הזה לא תומך בהתראות מערכת — ההתראות יופיעו כאן בפעמון 🔔','This browser has no system notifications — you will see them here 🔔');
  if(Notification.permission==='denied')return T('⚠️ ההתראות חסומות בדפדפן. כדי לפתוח: לוחצים על המנעול 🔒 ליד כתובת האתר ← הרשאות ← התראות ← לאפשר.','⚠️ Notifications are blocked. Click the 🔒 next to the address → Notifications → Allow.');
  return T('ההתראות מגיעות כשהאתר/האפליקציה פתוחים או ברקע.','Notifications arrive while the site/app is open or in the background.');
}
function renderNotif(){
  const b=document.querySelector('#notifBody');
  const on=!!prefs.notify;
  b.innerHTML='<button class="switch'+(on?' on':'')+'" id="nSwitch" role="switch" aria-checked="'+on+'"><span class="tg"></span><span>'+(on?'🔔 '+T('את/ה מקבל/ת עדכונים מהמערכת','You get updates from the site'):'🔕 '+T('לחצו כאן כדי לקבל עדכונים מהמערכת','Tap to get updates from the site'))+'<small>'+esc(permText())+'</small></span></button>'+
    '<details class="grp" style="margin-bottom:10px"><summary>⚙️ '+T('על מה לעדכן אותי','What to notify me about')+'</summary>'+Object.keys(NCATS).map(c=>'<label class="radio" style="margin:6px 0 0"><input type="checkbox" data-ncat="'+c+'"'+(nCatOn(c)?' checked':'')+'> '+NCATS[c][0]+' '+T(NCATS[c][1],NCATS[c][2])+'</label>').join('')+'</details>'+
    (inbox.length?'<div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0"><h4 style="margin:0">🔔 '+T('העדכונים שלי','My updates')+'</h4><button class="mini" id="nClear">🗑️ '+T('ניקוי','Clear')+'</button></div>'+
      inbox.map(x=>'<div class="nitem'+(x.read?'':' unread')+'" data-nid="'+esc(x.id)+'"><span class="ni">'+esc(x.icon)+'</span><div class="nb"><b>'+esc(x.title)+'</b>'+(x.body?'<p>'+esc(x.body)+'</p>':'')+'<small>'+esc(agoText(x.ts))+' · '+fmtTime(new Date(x.ts))+'</small></div></div>').join('')
    :'<div class="empty">'+T('אין עדכונים חדשים 🙂<br>כאן יופיעו מבצעים על מוצרים שאת/ה קונה, הוזלות מחיר, תזכורות לשבת ועוד.','No updates yet 🙂')+'</div>');
}
function openNotif(){
  document.querySelector('#hMenu').classList.remove('open');
  renderNotif();document.querySelector('#notifOverlay').classList.add('open');
  setTimeout(()=>{inbox.forEach(x=>x.read=true);saveInbox();updateBell(false);},1200);
}
document.querySelector('#notifBody').addEventListener('click',async e=>{
  if(e.target.closest('#nSwitch')){
    if(prefs.notify){prefs.notify=false;savePrefs();flash('🔕 '+T('ההתראות כובו','Notifications off'));}
    else if(!('Notification' in window)){prefs.notify=true;savePrefs();flash('🔔 '+T('תקבלו עדכונים כאן בפעמון','You will get updates in the bell'));}
    else{let p=Notification.permission;if(p==='default'){try{p=await Notification.requestPermission();}catch(err){}}
      if(p==='granted'){prefs.notify=true;savePrefs();sysNotify('🔔 '+T('ההתראות הופעלו!','Notifications on!'),T('מעכשיו נעדכן אותך על מבצעים, הוזלות ותזכורות 💚','We will let you know about deals, price drops and reminders 💚'),'welcome','./');flash('🔔 '+T('ההתראות הופעלו!','Notifications on!'));}
      else{prefs.notify=false;savePrefs();flash(T('⚠️ הדפדפן לא אישר התראות','⚠️ Permission not granted'));}}
    updateBell(false);renderNotif();return;}
  if(e.target.closest('#nClear')){inbox=[];saveInbox();updateBell(false);renderNotif();return;}
  const it=e.target.closest('[data-nid]');if(it){const x=inbox.find(y=>y.id===it.dataset.nid);if(x){x.read=true;saveInbox();updateBell(false);if(x.tab){setTab(x.tab);document.querySelector('#notifOverlay').classList.remove('open');}}}
});
document.querySelector('#notifBody').addEventListener('change',e=>{const c=e.target.dataset.ncat;if(!c)return;prefs.nOff=prefs.nOff||{};prefs.nOff[c]=!e.target.checked;savePrefs();});
document.querySelector('#btnBell').onclick=e=>{e.stopPropagation();openNotif();};
document.querySelector('#miNotif').onclick=openNotif;
document.querySelector('#btnCloseNotif').onclick=()=>document.querySelector('#notifOverlay').classList.remove('open');

/* ---------- התראות על מוצרים במבצע והוזלות מחיר ---------- */
let saleCheckAt=0;
async function checkSaleAlerts(){
  if(!sb||!authUser||Date.now()-saleCheckAt<4*60000)return;saleCheckAt=Date.now();
  try{
    if(!storePosts.length)await loadFeed();
    const mine=myProductNames();const now=Date.now();
    storePosts.filter(p=>p.status==='approved'&&(p.kind!=='news'||follows.has(p.chain))&&(!p.ends_at||new Date(p.ends_at).getTime()>now)&&now-new Date(p.created_at).getTime()<10*DAY_MS).slice(0,40).forEach(p=>{
      const txt=norm(p.title+' '+(p.body||''));const hit=mine.filter(n=>norm(n).length>=2&&txt.includes(norm(n)));
      if(hit.length)notify('deal:'+p.id,'deal',T('מבצע על '+hit.slice(0,3).join(', '),'Deal on '+hit.slice(0,3).join(', ')),p.chain+' — '+p.title+(p.ends_at?T(' · עד ',' · until ')+new Date(p.ends_at).toLocaleDateString('he-IL'):''),'stores');
      else if(follows.has(p.chain))notify('deal:'+p.id,'deal',(p.kind==='news'?'📢 ':'')+T('חדש ב'+p.chain,'New at '+p.chain),p.title,'stores');
    });
    const keys=Array.from(new Set(mine.slice(0,50).map(norm))).filter(Boolean);if(!keys.length)return;
    const {data}=await sb.from('prices').select('id,product,product_key,chain,price,currency,created_at,updated_at,status').in('product_key',keys).eq('status','approved').order('created_at',{ascending:false}).limit(1500);
    const g={};(data||[]).forEach(r=>{const k=r.product_key+'|'+r.chain+'|'+r.currency;(g[k]=g[k]||[]).push(r);});
    Object.values(g).forEach(a=>{if(a.length<2)return;const [n,o]=a;if(now-new Date(n.updated_at||n.created_at).getTime()>14*DAY_MS)return;
      if(Number(n.price)<Number(o.price)*0.95)notify('drop:'+n.id,'drop',T(n.product+' הוזל ב'+n.chain,n.product+' is cheaper at '+n.chain),fmtPrice(o.price,o.currency)+' ← '+fmtPrice(n.price,n.currency)+' ('+Math.round(100*(1-n.price/o.price))+'%−)','prices');});
  }catch(e){console.warn('sale alerts',e);}
}

/* ---------- דבר תורה: תזכורת בחמישי, שישי וערב חג ---------- */
function erevChag(d){
  if(!HC)return '';try{const t=new Date(d);t.setDate(t.getDate()+1);
    const isChag=x=>holidaysOn(x).filter(e=>e.getFlags()&HC.flags.CHAG);
    const tm=isChag(t);if(!tm.length||isChag(d).length)return '';return heName(tm[0]);}catch(e){return '';}
}
function dtReminderToday(){
  if(TORAH_OFF)return null;
  const d=new Date(),dow=d.getDay();const chag=erevChag(d);
  if(chag)return {kind:'chag',name:chag};
  if(dow===4||dow===5)return {kind:'shabbat',name:T('שבת','Shabbat')};
  return null;
}
function showNudge(txt){const n=document.querySelector('#botNudge');document.querySelector('#botNudgeTxt').textContent=txt;n.hidden=false;clearTimeout(n._t);n._t=setTimeout(()=>{n.hidden=true;},25000);}
document.querySelector('#botNudge').addEventListener('click',e=>{document.querySelector('#botNudge').hidden=true;if(e.target.closest('#botNudgeX'))return;openBot();});
function offeredToday(k){state.lastOffers=state.lastOffers||{};return state.lastOffers[k]===dayKey(new Date());}
function markOffered(k){state.lastOffers=state.lastOffers||{};state.lastOffers[k]=dayKey(new Date());save(true);}

/* ---------- מבצעים ומחירים לפי מיקום ---------- */
function distKm(a,b,c,d){const R=6371,r=x=>x*Math.PI/180;const dl=r(c-a),dn=r(d-b);const h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function nearestCity(lat,lon){let best='',bd=1e9;Object.entries(CITIES).forEach(([n,c])=>{if(c[3])return;const d=distKm(lat,lon,c[0],c[1]);if(d<bd){bd=d;best=n;}});return {city:best,km:bd};}
function detectCity(){return new Promise(res=>{if(!navigator.geolocation)return res('');let done=false;const fin=v=>{if(!done){done=true;res(v);}};setTimeout(()=>fin(''),9000);
  navigator.geolocation.getCurrentPosition(p=>{const r=nearestCity(p.coords.latitude,p.coords.longitude);fin(r.km<40?r.city:'');},()=>fin(''),{timeout:8000,maximumAge:3600000});});}
function myCity(){return state.geoCity||(meData().address.city||'')||state.city||'';}
async function nearbyDeals(useGeo){
  let city='';if(useGeo){city=await detectCity();if(city){state.geoCity=city;save(true);}}
  city=city||myCity();
  if(!storePosts.length&&sb&&authUser)await loadFeed();
  const here=new Set(allBranches().filter(b=>b.city===city).map(b=>b.chain));meData().stores.forEach(s=>here.add(s.name));
  allChains().filter(c=>c.kind==='online').forEach(c=>here.add(c.name));
  const now=Date.now();const mine=myProductNames().map(norm).filter(n=>n.length>=2);
  const deals=storePosts.filter(p=>p.status==='approved'&&p.kind!=='news'&&(!p.ends_at||new Date(p.ends_at).getTime()>now)&&here.has(p.chain))
    .map(p=>({p,hit:mine.filter(n=>norm(p.title+' '+(p.body||'')).includes(n))})).sort((a,b)=>b.hit.length-a.hit.length||new Date(b.p.created_at)-new Date(a.p.created_at));
  return {city,deals,here};
}

/* ---------- איזו רשת הכי זולה? דירוג באחוזים ---------- */
let rankCache=null,rankAt=0,rankErr=false;
async function loadRanking(force){
  if(!sb||!authUser)return null;if(!force&&rankCache&&Date.now()-rankAt<10*60000)return rankCache;
  try{const {data,error}=await sb.rpc('chain_price_ranking',{p_days:90,p_currency:myCurrency()});if(error)throw error;rankCache=data||[];rankAt=Date.now();rankErr=false;}catch(e){rankErr=true;rankCache=null;}
  return rankCache;
}
function rankHtml(rows,title){
  const MED=['🥇','🥈','🥉'];
  if(!rows)return rankErr&&isAdmin()?'<div class="rank"><h3>🏆 '+T('איזו רשת הכי זולה?','Cheapest chain')+'</h3><div class="sub">⚠️ צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית)</div></div>':'';
  if(!rows.length)return '<div class="rank"><h3>🏆 '+(title||T('איזו רשת הכי זולה?','Which chain is cheapest?'))+'</h3><div class="sub">'+T('עוד אין מספיק דיווחים — צריך מחיר של אותו מוצר בלפחות 2 רשתות. כל דיווח עוזר לכולם 💚','Not enough reports yet — need the same product in at least 2 chains.')+'</div></div>';
  const tot=Math.max(...rows.map(r=>r.products));
  return '<div class="rank"><h3>🏆 '+(title||T('איזו רשת הכי זולה?','Which chain is cheapest?'))+'</h3><div class="sub">'+T('לפי מחירים שדווחו ב-90 הימים האחרונים, על מוצרים שיש להם מחיר בכמה רשתות. האחוז = בכמה מהמוצרים הרשת הכי זולה.','Based on the last 90 days. % = share of products where the chain is cheapest.')+'</div>'+
    rows.slice(0,10).map((r,i)=>'<div class="rkrow"><span class="rkn">'+(MED[i]||(i+1))+'</span><b>'+esc(r.chain)+'</b><span class="amt">'+r.cheapest_pct+'%</span><span class="rkbar"><i style="width:'+Math.max(3,r.cheapest_pct)+'%"></i></span><small>'+
      T('הכי זולה ב-'+r.cheapest+' מתוך '+r.products+' מוצרים','Cheapest on '+r.cheapest+' of '+r.products)+' · '+(Number(r.avg_above_pct)>0?T('יקרה בממוצע ב-'+r.avg_above_pct+'% מהמחיר הזול ביותר','on average '+r.avg_above_pct+'% above the cheapest'):T('תמיד במחיר הזול ביותר 🎉','always the cheapest 🎉'))+(r.products<Math.min(5,tot)?' · '+T('מעט נתונים','little data'):'')+'</small></div>').join('')+'</div>';
}
async function fillRanking(){const el=document.querySelector('#chainRank');if(!el)return;const rows=await loadRanking();const el2=document.querySelector('#chainRank');if(el2)el2.innerHTML=rankHtml(rows);}

/* ---------- מחיר ליחידה (לק"ג / לליטר / ליחידה) ---------- */
/* גודל האריזה מתוך שם המוצר, למשל "חלב 1 ליטר", "אורז 500 גרם", "מים 6×1.5 ל" */
const SIZE18_RE=/(?:(\d+)\s*[x×*]\s*)?(\d+(?:[.,]\d+)?)\s*(ק"ג|קג|קילו|ק״ג|גרם|גר|ג'|ג׳|ג(?=$|\s)|מ"ל|מל|מ״ל|ליטר|ל'|ל׳|ל(?=$|\s)|kg|g|ml|l|יחידות|יח'|יח׳|יח|רולים|כביסות)(?=$|[\s,.)])/i;
function size18(name){
  const m=String(name||'').match(SIZE18_RE);if(!m)return null;
  const cnt=m[1]?parseInt(m[1],10):1,n=parseFloat(m[2].replace(',','.'))*cnt,u=m[3].toLowerCase().replace(/["״'׳]/g,'');
  if(!(n>0))return null;
  if(/^(קג|קילו|kg)$/.test(u))return {q:n,u:'kg'};
  if(/^(גרם|גר|ג|g)$/.test(u))return {q:n/1000,u:'kg'};
  if(/^(ליטר|ל|l)$/.test(u))return {q:n,u:'l'};
  if(/^(מל|ml)$/.test(u))return {q:n/1000,u:'l'};
  return {q:n,u:'unit'};
}
const UNIT18={kg:['לק"ג','/kg'],l:['לליטר','/L'],unit:['ליחידה','/unit']};
function unitTag18(name,price,cur,pre){const z=size18(name);if(!z||!(Number(price)>0))return '';if(z.q===1)return '';
  return (pre||'')+'<small class="up18" title="'+T('מחיר ליחידה, לפי הגודל שבשם המוצר','Unit price, from the size in the product name')+'">'+fmtPrice(rnd2(price/z.q),cur)+' '+T(UNIT18[z.u][0],UNIT18[z.u][1])+'</small>';}
/* לשונית המחירים: השוואת סל מלא + מחשבון מחיר ליחידה, כל אחד בתיבה משלו */
let calc18=[{q:'',u:'g',p:''},{q:'',u:'g',p:''}];
const CALC18_U=[['g','גרם','g'],['kg','ק"ג','kg'],['ml','מ"ל','ml'],['l','ליטר','L'],['unit','יחידות','units']];
function basket18Open(id){const l=state.lists.find(x=>x.id===id);if(!l)return;if(l.id!==state.active){state.active=l.id;save();if(typeof render==='function')render();}openBasket();}
function tools18Html(){
  let h='';
  h+='<details class="rank tool18" id="bk18"'+((sb&&authUser)||srvShown()?' open':'')+'><summary><b>🧺 '+T('השוואת סל מלא בין החנויות','Full basket comparison')+'</b></summary>'+
    '<div class="sub">'+T('כמה עולה כל הרשימה בכל חנות, כולל מבצעים, ומה הכי משתלם: הכל בחנות אחת או כל מוצר איפה שהוא הכי זול.','What your whole list costs in each store, deals included.')+'</div>';
  if(((sb&&authUser)||srvShown())&&state.lists.length){
    h+='<div class="row18"><select id="bk18Pick" aria-label="'+T('איזו רשימה','Which list')+'">'+state.lists.map(l=>{const n=(l.items||[]).filter(i=>!i.done).length;return '<option value="'+esc(l.id)+'"'+(l.id===state.active?' selected':'')+'>'+esc(l.name)+' ('+n+')</option>';}).join('')+'</select><button id="bk18Go">💰 '+T('השוואה','Compare')+'</button></div>';
  }else h+='<div class="sub">'+T('צריך להיות מחוברים כדי להשוות 🙂','Sign in to compare 🙂')+'</div>';
  h+='</details>';
  h+='<details class="rank tool18" id="up18"><summary><b>🧮 '+T('מחשבון מחיר ליחידה (לק"ג / לליטר)','Unit price calculator')+'</b></summary>'+
    '<div class="sub">'+T('מה יותר משתלם? מכניסים גודל ומחיר של כל אריזה, ורואים כמה עולה ק"ג, ליטר או יחידה.','Which is cheaper? Enter each package size and price.')+'</div><div id="up18Rows"></div>'+
    '<div class="row18"><button class="sec" id="up18Add">➕ '+T('עוד אריזה','Another package')+'</button><button class="sec" id="up18Clr">🧹 '+T('ניקוי','Clear')+'</button></div><div id="up18Res" aria-live="polite"></div></details>';
  return h;
}
function calc18Base(r){const q=parseFloat(String(r.q).replace(',','.')),p=parseFloat(String(r.p).replace(',','.'));if(!(q>0)||!(p>0))return null;
  if(r.u==='g')return {per:p/(q/1000),u:'kg'};if(r.u==='kg')return {per:p/q,u:'kg'};if(r.u==='ml')return {per:p/(q/1000),u:'l'};if(r.u==='l')return {per:p/q,u:'l'};return {per:p/q,u:'unit'};}
function calc18Render(){
  const box=document.querySelector('#up18Rows');if(!box)return;
  box.innerHTML=calc18.map((r,i)=>'<div class="row18 up18row"><span class="rkn">'+(i+1)+'</span><input type="number" step="any" min="0" inputmode="decimal" data-c18="q" data-i="'+i+'" value="'+esc(r.q)+'" placeholder="'+T('גודל','Size')+'" aria-label="'+T('גודל אריזה','Package size')+' '+(i+1)+'"><select data-c18="u" data-i="'+i+'" aria-label="'+T('יחידה','Unit')+' '+(i+1)+'">'+CALC18_U.map(([k,he,en])=>'<option value="'+k+'"'+(r.u===k?' selected':'')+'>'+T(he,en)+'</option>').join('')+'</select><input type="number" step="0.01" min="0" inputmode="decimal" data-c18="p" data-i="'+i+'" value="'+esc(r.p)+'" placeholder="'+T('מחיר','Price')+'" aria-label="'+T('מחיר','Price')+' '+(i+1)+'">'+(calc18.length>2?'<button class="pr-act" data-c18del="'+i+'" aria-label="'+T('הסרה','Remove')+'">✕</button>':'')+'</div>').join('');
  calc18Result();
}
function calc18Result(){
  const el=document.querySelector('#up18Res');if(!el)return;const cur=myCurrency();
  const rs=calc18.map((r,i)=>Object.assign({i},calc18Base(r)||{})).filter(x=>x.per>0);
  if(!rs.length){el.innerHTML='';return;}
  if(new Set(rs.map(x=>x.u)).size>1){el.innerHTML='<p class="muted-note">⚠️ '+T('אי אפשר להשוות משקל לנפח או ליחידות. בחרו יחידות מאותו סוג.','Cannot compare weight with volume or units.')+'</p>';return;}
  const best=rs.slice().sort((a,b)=>a.per-b.per)[0],worst=rs.slice().sort((a,b)=>b.per-a.per)[0];
  el.innerHTML=rs.map(x=>'<div class="merow"><span>'+(x===best&&rs.length>1?'✅':'▫️')+'</span><span class="grow">'+T('אריזה ','Package ')+(x.i+1)+'</span><b>'+fmtPrice(rnd2(x.per),cur)+' '+T(UNIT18[x.u][0],UNIT18[x.u][1])+'</b></div>').join('')+
    (rs.length>1&&worst.per>best.per?'<p class="up18best">✅ '+T('הכי משתלם: אריזה '+(best.i+1)+', זולה ב-'+Math.round(100*(1-best.per/worst.per))+'% מהיקרה','Best: package '+(best.i+1)+', '+Math.round(100*(1-best.per/worst.per))+'% cheaper')+'</p>':'');
}
function bindTools18(root){
  const go=root.querySelector('#bk18Go');if(go)go.onclick=()=>basket18Open(root.querySelector('#bk18Pick').value);
  const up=root.querySelector('#up18');if(!up)return;
  up.addEventListener('input',e=>{const f=e.target.dataset.c18;if(!f)return;calc18[+e.target.dataset.i][f]=e.target.value;calc18Result();});
  up.addEventListener('click',e=>{const d=e.target.closest('[data-c18del]');if(d){calc18.splice(+d.dataset.c18del,1);calc18Render();}});
  root.querySelector('#up18Add').onclick=()=>{if(calc18.length<6){calc18.push({q:'',u:calc18[calc18.length-1].u,p:''});calc18Render();}};
  root.querySelector('#up18Clr').onclick=()=>{calc18=[{q:'',u:'g',p:''},{q:'',u:'g',p:''}];calc18Render();};
  calc18Render();
}

/* ---------- סל הקניות: איפה הכי זול לקנות את הרשימה ---------- */
async function basketCompare(itemsArg){
  const open=itemsArg||curList().items.filter(i=>!i.done);
  const byKey={};open.forEach(i=>{const k=norm(i.n);if(!byKey[k])byKey[k]={n:i.n,bc:(typeof window.pkChosen53==='function'&&window.pkChosen53(i)||{}).bc||'',mult:(qtyParts(i.q)&&!qtyParts(i.q).u)?qtyParts(i.q).n:1};});
  const keys=Object.keys(byKey);if(!keys.length)return null;
  const run=cols=>sb.from('prices').select(cols).in('product_key',keys).eq('status','approved').eq('currency',myCurrency()).order('created_at',{ascending:false}).limit(3000);
  const BASE='product,product_key,chain,price,currency,created_at,updated_at,status';
  let {data,error}=await run(BASE+',is_deal,deal_text,valid_until,regular_price');
  if(error)({data,error}=await run(BASE+',is_deal,deal_text,valid_until'));
  if(error)({data,error}=await run(BASE));
  if(error)throw error;
  const latest={};(data||[]).forEach(r=>{const k=r.product_key+'|'+r.chain;const t=new Date(r.updated_at||r.created_at).getTime();if(!latest[k]||t>latest[k].t)latest[k]={r,t};});
  /* לכל מוצר בכל חנות: כמה משלמים בפועל (עם המבצע, לפי הכמות ברשימה) וכמה היה עולה במחיר רגיל */
  const minBy={},chains={};
  Object.values(latest).forEach(({r})=>{const k=r.product_key;if(!byKey[k])return;const dc=dealCost(r,byKey[k].mult);const p=dc.cost;
    if(!minBy[k]||p<minBy[k].p)minBy[k]={p,reg:dc.regular,save:dc.save,deal:dc.deal&&dc.save>0,deal_text:r.deal_text||'',note:dc.note,chain:r.chain};
    const c=chains[r.chain]||(chains[r.chain]={chain:r.chain,keys:[],sum:0,reg:0,save:0,deals:0});c.keys.push(k);c.sum=rnd2(c.sum+p);c.reg=rnd2(c.reg+dc.regular);c.save=rnd2(c.save+dc.save);if(dc.deal&&dc.save>0)c.deals++;});
  const rows=Object.values(chains).map(c=>{const mins=c.keys.reduce((a,k)=>a+minBy[k].p,0);return Object.assign(c,{above:mins?Math.round(1000*(c.sum-mins)/mins)/10:0});}).sort((a,b)=>b.keys.length-a.keys.length||a.sum-b.sum);
  const found=Object.keys(minBy);
  return {items:open.length,keys,byKey,found,missing:keys.filter(k=>!minBy[k]).map(k=>byKey[k].n),rows,minBy,split:rnd2(found.reduce((a,k)=>a+minBy[k].p,0)),splitReg:rnd2(found.reduce((a,k)=>a+minBy[k].reg,0))};
}
function basketTitle(t){const b=document.querySelector('#basketOverlay .phead b');if(b)b.textContent=t;}
/* מוצר אחד בכל הסניפים — רק מהשרת שלנו */
function srvItemOpen(q){const box=document.querySelector('#basketBody');box.innerHTML='';basketTitle('🔎 '+q.slice(0,40));
  document.querySelector('#basketOverlay').classList.add('open');srvBasketMount(box,[{n:q,q:'',done:false}]);}
async function openBasket(itemsArg,label){
  basketTitle('💰 '+T('השוואת סל מלא בין החנויות','Full basket comparison'));
  const box=document.querySelector('#basketBody');box.innerHTML='<div class="empty">'+T('מחשבת... 🧮','Calculating... 🧮')+'</div>';
  document.querySelector('#basketOverlay').classList.add('open');
  if((!sb||!authUser)&&!srvShown()){box.innerHTML='<div class="empty">'+T('צריך להיות מחוברים 🙂','Sign in first 🙂')+'</div>';return;}
  if(!sb||!authUser){box.innerHTML='<p class="muted-note">🔑 '+T('להשוואה גם לפי דיווחי הקהילה צריך להתחבר 🙂','Sign in to also compare community price reports 🙂')+'</p>';try{srvBasketMount(box,itemsArg);}catch(e){}return;}
  let r=null;try{r=await basketCompare(itemsArg);}catch(e){box.innerHTML='<div class="empty">⚠️ '+esc(e.message||'')+'</div>';return;}
  if(!r){box.innerHTML='<div class="empty">'+T('אין מוצרים פתוחים ברשימה 🙂','No open items 🙂')+'</div>';return;}
  const cur=myCurrency();const MED=['🥇','🥈','🥉'];
  let h=(!itemsArg&&state.lists.length>1?'<div class="row18"><label class="il" for="bk18List">'+T('איזו רשימה להשוות?','Which list?')+'</label><select id="bk18List">'+state.lists.map(l=>'<option value="'+esc(l.id)+'"'+(l.id===state.active?' selected':'')+'>'+esc(l.name)+'</option>').join('')+'</select></div>':'')+'<p class="muted-note">'+T('נמצאו מחירים ל-'+r.found.length+' מתוך '+r.keys.length+' מוצרים ברשימה "'+esc(label||curList().name)+'". המחירים לפי דיווחי הקהילה והסופרים.','Prices found for '+r.found.length+' of '+r.keys.length+' items.')+'</p>';
  if(r.rows.length){
    const cheapestFull=r.rows.filter(x=>x.keys.length===r.found.length).sort((a,b)=>a.sum-b.sum)[0];
    /* שלוש שורות ברורות: מחיר רגיל · עם המבצעים · כמה חוסכים */
    const sums=(reg,cost)=>'<div class="sums18"><div><small>'+T('מחיר רגיל','Regular price')+'</small><b'+(reg>cost?' class="was"':'')+'>'+fmtPrice(reg,cur)+'</b></div><div><small>'+T('עם המבצעים','With deals')+'</small><b>'+fmtPrice(cost,cur)+'</b></div><div class="sv"><small>'+T('חוסכים','You save')+'</small><b>'+fmtPrice(rnd2(reg-cost),cur)+(reg>cost?' <i>('+Math.round(100*(reg-cost)/reg)+'%)</i>':'')+'</b></div></div>';
    if(cheapestFull&&r.found.length>1)h+='<div class="rank" style="border-color:var(--hdr2)"><h3>✅ '+T('הכי משתלם לקנות הכל ב'+esc(cheapestFull.chain),'Cheapest to buy everything at '+esc(cheapestFull.chain))+' — '+fmtPrice(cheapestFull.sum,cur)+'</h3>'+sums(cheapestFull.reg,cheapestFull.sum)+'</div>';
    h+='<div class="rank"><h3>🏪 '+T('השוואה בין החנויות','Store comparison')+'</h3>'+r.rows.slice(0,10).map((c,i)=>'<div class="rkrow"><span class="rkn">'+(MED[i]||(i+1))+'</span><b>'+esc(c.chain)+'</b><span class="amt">'+(c.save>0?'<s class="was18">'+fmtPrice(c.reg,cur)+'</s> ':'')+fmtPrice(c.sum,cur)+'</span><span class="rkbar"><i style="width:'+Math.round(100*c.keys.length/Math.max(1,r.found.length))+'%"></i></span><small>'+T('יש מחיר ל-'+c.keys.length+' מתוך '+r.found.length+' מוצרים','Prices for '+c.keys.length+' of '+r.found.length)+(c.save>0?' · 🔥 '+T(c.deals+' מבצעים — חוסכים '+fmtPrice(c.save,cur),c.deals+' deals — save '+fmtPrice(c.save,cur)):'')+' · '+(c.above>0?T('יקר ב-'+c.above+'% מהזול ביותר על אותם מוצרים',c.above+'% above cheapest'):T('הכי זול על המוצרים האלה 🎉','cheapest on these 🎉'))+(c.keys.length<r.found.length?'<br>🤷 '+T('אין כאן מחיר ל: ','No price here for: ')+r.found.filter(k=>!c.keys.includes(k)).map(k=>esc(r.byKey[k].n)).join(', '):'')+'</small></div>').join('')+'</div>';
    h+='<div class="rank"><h3>🧩 '+T('הכי חסכוני: כל מוצר איפה שהוא הכי זול','Max savings: each item where it is cheapest')+' — '+fmtPrice(r.split,cur)+'</h3>'+sums(r.splitReg,r.split)+r.found.map(k=>{const m=r.minBy[k];return '<div class="merow">'+(thumb53('x')?thumb53(r.byKey[k].bc,r.byKey[k].n):'<span>'+emojiOf(r.byKey[k].n)+'</span>')+'<span class="grow">'+esc(r.byKey[k].n)+(r.byKey[k].mult>1?' ×'+r.byKey[k].mult:'')+'<small>'+esc(m.chain)+(m.deal?' · 🔥 '+esc(m.deal_text||T('מבצע','deal'))+' · '+T('חוסכים ','save ')+fmtPrice(m.save,cur):'')+(m.note?' · 💡 '+esc(m.note):'')+unitTag18(r.byKey[k].n,m.p/Math.max(1,r.byKey[k].mult),cur,' · ')+'</small></span><b>'+(m.deal?'<s class="was18">'+fmtPrice(m.reg,cur)+'</s> ':'')+fmtPrice(m.p,cur)+'</b></div>';}).join('')+'</div>';
  }
  if(r.missing.length)h+='<p class="muted-note">🤷 '+T('עוד אין מחירים ל: ','No prices yet for: ')+r.missing.map(esc).join(', ')+'</p><button class="btn" id="bkReport">💰 '+T('לדווח מחיר — וכולם ירוויחו','Report a price')+'</button>';
  box.innerHTML=h;
  try{srvBasketMount(box,itemsArg);}catch(e){}
  const bl=document.querySelector('#bk18List');if(bl)bl.onchange=()=>basket18Open(bl.value);
  const rb=document.querySelector('#bkReport');if(rb)rb.onclick=()=>{document.querySelector('#basketOverlay').classList.remove('open');setTab('prices');};
}
/* ---------- 🏪 השוואה בין כל הסניפים בארץ — מהשרת שלנו (server.yamshopping.com) ----------
   השרת שומר את המחיר העדכני של כל מוצר בכל סניף (מקבצי שקיפות המחירים). בוחרים עיר או "קרוב אליי",
   ומקבלים כמה עולה הרשימה בכל סניף שם, כולל מבצעים לכל הלקוחות. */
/* שרת המחירים (server.yamshopping.com) דרך הדומיין הראשי — Vercel מעביר את /api/prices/* לשרת.
   כך המשתמשים לא פונים ישירות לכתובת אחרת (נטפרי וסינונים אחרים חוסמים כתובות לא מוכרות), ואין צורך ב-CORS */
const PRICE_API='/api/prices';
/* רמז (לא מאומת) מי שואל — כדי שבבק אופיס "מי מעתיק את המחירים?" יופיע החשבון ליד הכתובת */
function yamWho(){try{const w=authUser&&authUser.id?'u:'+authUser.id:(typeof guestId27==='function'&&localStorage.getItem('yam_guest_id')?'g:'+guestId27():'');return w?{'X-Yam-Who':w}:{};}catch(e){return {};}}
async function priceApi(path,params){const u=new URL(PRICE_API+path,location.origin);Object.entries(params||{}).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,v);});
  let r;try{r=await fetch(u.href,{mode:'cors',credentials:'omit',headers:yamWho(),signal:AbortSignal.timeout?AbortSignal.timeout(20000):undefined});}
  catch(e){throw new Error(T('שרת המחירים לא זמין כרגע. נסו שוב בעוד כמה דקות.','The price server is unavailable right now. Try again in a few minutes.'));}
  let j=null;try{j=await r.json();}catch(e){}
  if(!r.ok)throw new Error((j&&(j.error||j.detail))||T('השרת לא זמין כרגע','The price server is unavailable'));return j;}
/* 🖼️ תמונה קטנה של המוצר בהשוואות (נטען בבלוק בחירת המוצר המדויק למטה). בלי תמונה — כרטיס בצבע הקטגוריה */
function thumb53(code,name,typed,cls){return typeof window.pkThumb53==='function'?window.pkThumb53(code,name,typed,cls):'';}
function srvItemsParam(items){const by={};(items||[]).forEach(i=>{const k=norm(i.n);if(!k||by[k])return;const qp=qtyParts(i.q);by[k]=i.n.replace(/[|*\n]/g,' ').trim()+(qp&&!qp.u&&qp.n>1?'*'+qp.n:'');});return Object.values(by).slice(0,60).join('|');}
/* אתר הזמנות של רשת (שופרסל ONLINE...) — הכתובת בקובץ היא המחסן, ללקוח חשוב שזה משלוח */
function srvAddr(s){return s.online?T('הזמנה באתר — משלוח עד הבית','Order online — home delivery'):[s.address,s.city].filter(Boolean).join(', ');}
function srvBasketMount(box,itemsArg){
  if(!srvShown())return;
  const items=itemsArg||curList().items.filter(i=>!i.done);const param=srvItemsParam(items);if(!param)return;
  const hid=srvHidden();
  const city0=((meData().address||{}).city)||state.geoCity||userCity();
  const wrap=document.createElement('div');wrap.className='rank';wrap.id='srvCmp';
  wrap.innerHTML='<h3>🏪 '+T('השוואת חנויות — כל החנויות בארץ','Compare stores — every store in Israel')+'</h3>'+
    (srvPublic()?'':'<p class="muted-note" style="background:#fff3c4;color:#5a4300;border-radius:8px;padding:6px 8px">👁️ '+T('מצב בדיקה: רק מנהלים רואים את זה. מדליקים לכולם בבק אופיס ← 💰 מחירים.','Test mode: only admins see this. Turn it on for everyone in the back office.')+'</p>')+
    '<div class="sub">'+T('לפי קבצי שקיפות המחירים של הרשתות, מתעדכן כל שעה. בוחרים עיר או קרוב אליי. 🌐 = הזמנה מהאתר של הרשת, עם משלוח.','From the chains\' official price files, updated hourly. 🌐 = order online with delivery.')+'</div>'+
    '<div class="row18"><input id="srvCity" list="srvCities" autocomplete="off" value="'+esc(city0)+'" placeholder="'+T('עיר','City')+'" aria-label="'+T('עיר','City')+'"><datalist id="srvCities"></datalist>'+
    '<button id="srvGo">🔎 '+T('השוואה','Compare')+'</button><button class="sec" id="srvNear">📍 '+T('קרוב אליי','Near me')+'</button></div><div id="srvRes" aria-live="polite"></div>';
  box.prepend(wrap);
  const res=wrap.querySelector('#srvRes'),cityIn=wrap.querySelector('#srvCity');const cur=myCurrency();const MED=['🥇','🥈','🥉'];
  const draw=d=>{const st=(d.stores||[]).filter(s=>!hid.includes(s.chain)&&s.found>0).slice(0,20);
    if(!st.length){res.innerHTML='<p class="muted-note">🤷 '+T('לא נמצאו חנויות עם מחירים לרשימה הזו כאן','No stores found here')+'</p>';return;}
    res.innerHTML=st.map((s,i)=>{const save=Math.round((s.regular-s.total)*100)/100;
      return '<details class="srvSt"><summary class="rkrow"><span class="rkn">'+(MED[i]||(i+1))+'</span><span><b>'+(s.online?'🌐 ':'')+esc(s.chain_name)+(s.brand?' · '+esc(s.brand):'')+'</b> '+esc(s.name||'')+'<small> · '+esc(srvAddr(s))+(s.km!=null&&!s.online?' · '+s.km+T(' ק"מ',' km'):'')+'</small></span>'+
        '<span class="amt">'+(save>0?'<s class="was18">'+fmtPrice(s.regular,cur)+'</s> ':'')+fmtPrice(s.total,cur)+'</span><small>'+(d.items.length===1?(s.lines[0]&&s.lines[0].found?thumb53(s.lines[0].code,s.lines[0].name,s.lines[0].q,'xs')+esc(s.lines[0].name)+(s.lines[0].deal?' · 🔥 '+esc(s.lines[0].deal.text||''):''):T('אין בחנות','not in this store')):T('יש מחיר ל-'+s.found+' מתוך '+d.items.length+' מוצרים',s.found+' of '+d.items.length+' items'))+(save>0?' · 🔥 '+T('חוסכים ','save ')+fmtPrice(save,cur):'')+'</small></summary>'+
        s.lines.map(l=>'<div class="merow">'+(l.found&&thumb53(l.code)?thumb53(l.code,l.name,l.q):'<span>'+(l.found?'▫️':'🤷')+'</span>')+'<span class="grow">'+esc(l.q)+(l.qty>1?' ×'+l.qty:'')+(l.found?'<small>'+esc(l.name)+(l.deal?' · 🔥 '+esc(l.deal.text||T('מבצע','deal')):'')+'</small>':'<small>'+T('אין בחנות','not in this store')+'</small>')+'</span><b>'+(l.found?(l.deal&&l.cost<l.regular?'<s class="was18">'+fmtPrice(l.regular,cur)+'</s> ':'')+fmtPrice(l.cost,cur):'—')+'</b></div>').join('')+'</details>';}).join('')+
      (d.missing&&d.missing.length?'<p class="muted-note">🤷 '+T('לא נמצאו: ','Not found: ')+d.missing.map(esc).join(', ')+'</p>':'');};
  const run=async p=>{res.innerHTML='<p class="muted-note">'+T('מחשבת... 🧮','Calculating... 🧮')+'</p>';
    try{draw(await priceApi('/compare',Object.assign({items:param,limit:40,exclude:hid.join(',')},p)));}catch(e){res.innerHTML='<p class="muted-note">⚠️ '+esc(e.message||'')+'</p>';}};
  wrap.querySelector('#srvGo').onclick=()=>{const c=cityIn.value.trim();if(c)run({city:c});};
  cityIn.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();wrap.querySelector('#srvGo').click();}};
  let tmr=0;cityIn.oninput=()=>{clearTimeout(tmr);const q=cityIn.value.trim();if(q.length<2)return;tmr=setTimeout(async()=>{try{const cs=await priceApi('/cities',{q});wrap.querySelector('#srvCities').innerHTML=cs.map(c=>'<option value="'+esc(c.city)+'">'+c.stores+' '+T('סניפים','branches')+'</option>').join('');}catch(e){}},250);};
  wrap.querySelector('#srvNear').onclick=async()=>{res.innerHTML='<p class="muted-note">📍 '+T('מאתרת מיקום...','Locating...')+'</p>';
    const g=await exactLocation()||await homeLocation();if(!g){res.innerHTML='<p class="muted-note">⚠️ '+T('לא הצלחנו לאתר מיקום. אפשר לבחור עיר.','Could not get your location. Pick a city.')+'</p>';return;}
    run({lat:g.lat.toFixed(4),lng:g.lng.toFixed(4),limit:25});};
  if(city0)run({city:city0});
}
document.querySelector('#btnCloseBasket').onclick=()=>document.querySelector('#basketOverlay').classList.remove('open');

/* ---------- האזור האישי ---------- */
let meTab='info';
const ME_TABS=[['info','👤 פרטים וכתובת','👤 Details'],['products','🛒 המוצרים שלי','🛒 My products'],['stores','🏪 חנויות ואתרים','🏪 Stores & sites'],['orders','⏰ זמני הזמנה','⏰ Order times'],['providers','📞 נותני שירות','📞 Service contacts'],['habits','📊 הרגלי קנייה','📊 Habits']];
const PROV_ROLES={online_packer:['📦','אורז/ת משלוח אונליין','Online order packer'],delivery:['🚚','משלוח רגיל / שליח','Delivery / courier'],store_phone:['🏪','הזמנות טלפוניות מהחנות','Store phone orders'],other:['👤','אחר','Other']};
function telHref(p){return 'tel:'+String(p||'').replace(/[^\d+]/g,'');}
function waHref(p){let d=String(p||'').replace(/\D/g,'');if(d.startsWith('0'))d='972'+d.slice(1);return 'https://wa.me/'+d;}
function safeUrl(u){u=String(u||'').trim();if(!u)return '';if(!/^https?:\/\//i.test(u))u='https://'+u;try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:'';}catch(e){return '';}}
function ago(ts){return agoText(ts);}
function openMe(tab){document.querySelector('#hMenu').classList.remove('open');if(tab)meTab=tab;renderMe();document.querySelector('#meOverlay').classList.add('open');}
function renderMe(){
  const me=meData();
  document.querySelector('#meSeg').innerHTML=ME_TABS.map(([k,he,en])=>'<button data-metab="'+k+'"'+(meTab===k?' class="on"':'')+'>'+T(he,en)+'</button>').join('');
  const b=document.querySelector('#meBody');const H=habits();let h='';
  const shared='<p class="muted-note">🔒 '+T('נשמר בחשבון שלך ומשותף רק עם מי שמחובר לרשימות המשפחתיות שלך.','Saved to your account, shared only with your family list members.')+'</p>';
  if(meTab==='info'){
    const a=me.address;
    h+='<div class="mecard"><h4>👤 '+T('הפרטים שלי','My details')+'</h4>'+
      '<label class="il" for="meName">'+T('השם שלי (כך יופיע באתר)','My name')+'</label><input id="meName" maxlength="40" value="'+esc((state.user&&state.user.name)||'')+'">'+
      ((state.user&&state.user.email)?'<label class="il">'+T('מייל','Email')+'</label><input value="'+esc(state.user.email)+'" readonly dir="ltr" style="text-align:right">':'')+
      '<label class="il" for="meCity">'+T('העיר שלי (לזמני שבת ולמבצעים באזור)','My city')+'</label><input id="meCity" list="meCityList" maxlength="40" autocomplete="off" placeholder="'+T('התחילו להקליד — למשל בני ברק','Start typing a city')+'" value="'+esc(meData().city||state.city||'')+'"><datalist id="meCityList">'+Object.keys(CITIES).map(c=>'<option value="'+esc(c)+'">').join('')+'</datalist>'+
      '<div class="row2"><button id="meSaveInfo">💾 '+T('שמירה','Save')+'</button>'+(sb&&authUser?'<button class="btn sec" id="meCode">🔑 '+T('שינוי קוד כניסה','Change my code')+'</button>':'')+'</div></div>';
    h+='<div class="mecard"><h4>🚚 '+T('כתובת למשלוח','Delivery address')+'</h4><div class="grid2">'+
      '<div><label class="il" for="maStreet">'+T('רחוב ומספר','Street & number')+'</label><input id="maStreet" maxlength="80" value="'+esc(a.street||'')+'"></div>'+
      '<div><label class="il" for="maCity">'+T('עיר','City')+'</label><input id="maCity" maxlength="40" list="maCities" value="'+esc(a.city||'')+'"><datalist id="maCities">'+Object.keys(CITIES).map(c=>'<option value="'+esc(c)+'">').join('')+'</datalist></div>'+
      '<div><label class="il" for="maApt">'+T('קומה / דירה / כניסה','Floor / apt')+'</label><input id="maApt" maxlength="40" value="'+esc(a.apt||'')+'"></div>'+
      '<div><label class="il" for="maPhone">'+T('טלפון לשליח','Phone for the courier')+'</label><input id="maPhone" type="tel" maxlength="20" dir="ltr" style="text-align:right" value="'+esc(a.phone||'')+'"></div></div>'+
      '<label class="il" for="maNotes">'+T('הערות לשליח','Notes for the courier')+'</label><textarea id="maNotes" maxlength="300" style="min-height:60px" placeholder="'+T('למשל: להשאיר ליד הדלת, קוד לבניין...','e.g. leave at the door')+'">'+esc(a.notes||'')+'</textarea>'+
      '<div class="row2"><button id="meSaveAddr">💾 '+T('שמירת הכתובת','Save address')+'</button><button class="btn sec" id="meCopyAddr">📋 '+T('העתקה','Copy')+'</button></div>'+shared+'</div>';
  }
  if(meTab==='products'){
    const due=dueItems(),last=lastShopping();
    h+='<div class="mecard"><h4>🛒 '+T('המוצרים שאני קונה','The products I buy')+'</h4>'+
      ((last||due.length)?'<div class="row2" style="margin-bottom:8px">'+(last?'<button class="mini pri" data-me="reorder">🔁 '+T('הקנייה הקודמת ('+last.items.length+')','Last shopping ('+last.items.length+')')+'</button>':'')+(due.length?'<button class="mini" data-me="due">⏰ '+T('מה כנראה נגמר ('+due.length+')','Running out ('+due.length+')')+'</button>':'')+'</div>':'')+
      (H.prods.length?H.prods.slice(0,80).map(p=>'<div class="merow"><span>'+esc(p.e)+'</span><span class="grow"><b>'+esc(p.n)+'</b><small>'+T('נקנה '+p.count+' פעמים','bought '+p.count+'×')+(p.store?' · 🏪 '+esc(p.store)+(p.storePct<100?' ('+p.storePct+'%)':''):'')+(p.every?' · '+T('כל ~'+p.every+' ימים','every ~'+p.every+' days'):'')+' · '+T('לאחרונה','last')+': '+esc(ago(p.last))+'</small></span><button class="mini" data-addp="'+esc(p.n)+'">➕ '+T('לרשימה','Add')+'</button></div>').join('')
      :'<p class="muted-note">'+T('עוד אין היסטוריה 🙂 מסמנים ✓ ליד מה שקנית ולוחצים "סיום קנייה" — ואני לומדת אילו מוצרים את/ה קונה, איפה, וכל כמה זמן.','No history yet — tick what you bought and press "Finish shopping".')+'</p>')+'</div>';
  }
  if(meTab==='stores'){
    const sugg=Object.keys(H.stores).filter(s=>!me.stores.some(x=>x.name===s));
    h+='<div class="mecard"><h4>🏪 '+T('החנויות והאתרים שאני קונה בהם','Stores & websites I buy from')+'</h4>'+
      (me.stores.length?me.stores.map(s=>{const url=safeUrl(s.url);return '<div class="merow"><span>'+(s.kind==='online'?'🌐':'🏪')+'</span><span class="grow"><b>'+esc(s.name)+'</b><small>'+esc(s.kind==='online'?(s.url||T('אתר / אפליקציה','website')):(s.branch||''))+(H.stores[s.name]?' · '+T('קניתי שם '+H.stores[s.name]+' פעמים','bought there '+H.stores[s.name]+'×'):'')+'</small></span>'+
        (url?'<a class="mini" href="'+esc(url)+'" target="_blank" rel="noopener">🌐 '+T('לאתר','Open')+'</a>':'')+(s.kind!=='online'?'<a class="mini" href="'+esc(wazeUrl(s.name+' '+(s.branch||'')))+'" target="_blank" rel="noopener">🧭</a>':'')+
        '<button class="mini bad" data-rmstore="'+esc(s.id)+'" aria-label="'+T('הסרה','Remove')+'">✕</button></div>';}).join(''):'<p class="muted-note">'+T('עוד לא הוספת חנויות.','No stores yet.')+'</p>')+
      (sugg.length?'<p class="muted-note">💡 '+T('לפי ההיסטוריה את/ה קונה גם ב:','From your history you also buy at:')+' '+sugg.map(s=>'<button class="mini" data-addstore="'+esc(s)+'">➕ '+esc(s)+'</button>').join(' ')+'</p>':'')+
      '<h4 style="margin-top:12px">➕ '+T('הוספת חנות או אתר','Add a store or website')+'</h4>'+
      '<div class="grid2"><div><input id="msName" list="msChains" maxlength="40" placeholder="'+T('שם החנות / האתר','Store / site name')+'"><datalist id="msChains">'+allChainNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist></div>'+
      '<div><select id="msKind"><option value="store">🏪 '+T('חנות פיזית','Physical store')+'</option><option value="online">🌐 '+T('אתר / אונליין','Website / online')+'</option></select></div></div>'+
      '<input id="msExtra" maxlength="200" placeholder="'+T('סניף (עיר — רחוב) או כתובת האתר','Branch or website address')+'"><button id="msAdd">➕ '+T('הוספה','Add')+'</button>'+shared+'</div>';
  }
  if(meTab==='orders'){
    const favDay=H.trips?H.dows.indexOf(Math.max(...H.dows)):-1;const favPart=Object.entries(H.hours).sort((a,b)=>b[1]-a[1])[0];
    h+='<div class="mecard"><h4>⏰ '+T('זמני הזמנה קבועים','Regular order times')+'</h4><p class="muted-note">'+T('מתי מזמינים או קונים — ויאמי תזכיר לך באותו יום 🔔','When you order/shop — Yami reminds you that day 🔔')+'</p>'+
      (me.orders.length?me.orders.slice().sort((a,b)=>a.day-b.day||String(a.time).localeCompare(String(b.time))).map(o=>'<div class="merow"><span>📅</span><span class="grow"><b>'+esc(orderDayName(o.day))+(o.time?' · '+esc(o.time):'')+'</b><small>'+esc(o.store||'')+(o.note?' · '+esc(o.note):'')+'</small></span><button class="mini bad" data-rmorder="'+esc(o.id)+'">✕</button></div>').join(''):'')+
      (favDay>=0?'<p class="muted-note">📊 '+T('לפי ההיסטוריה: בדרך כלל קונים ב'+dayName(favDay)+(favPart?' ב'+favPart[0]:''),'Usually on '+dayName(favDay))+'</p>':'')+
      '<h4 style="margin-top:12px">➕ '+T('הוספת זמן הזמנה','Add an order time')+'</h4><div class="grid2">'+
      '<div><input id="moStore" list="moStores" maxlength="40" placeholder="'+T('חנות / אתר','Store / site')+'"><datalist id="moStores">'+myStoreNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist></div>'+
      '<div><select id="moDay">'+DAYS.map((d,i)=>'<option value="'+i+'"'+(i===4?' selected':'')+'>'+esc(orderDayName(i))+'</option>').join('')+'</select></div>'+
      '<div><input id="moTime" type="time" aria-label="'+T('שעה','Time')+'"></div><div><input id="moNote" maxlength="80" placeholder="'+T('הערה (למשל: עד 12:00 למשלוח מחר)','Note')+'"></div></div><button id="moAdd">➕ '+T('הוספה','Add')+'</button></div>';
  }
  if(meTab==='providers'){
    h+='<div class="mecard"><h4>📞 '+T('נותני שירות','Service contacts')+'</h4><p class="muted-note">'+T('מספרי טלפון של אורזי משלוחים אונליין, שליחים ומשלוחים רגילים — הכל במקום אחד, עם חיוג ווואטסאפ בלחיצה.','Phone numbers of online packers, couriers and deliveries.')+'</p>'+
      (me.providers.length?Object.keys(PROV_ROLES).map(rk=>{const list=me.providers.filter(p=>(PROV_ROLES[p.role]?p.role:'other')===rk);if(!list.length)return '';
        return '<h4 style="margin-top:8px">'+PROV_ROLES[rk][0]+' '+T(PROV_ROLES[rk][1],PROV_ROLES[rk][2])+'</h4>'+list.map(p=>'<div class="merow"><span class="grow"><b>'+esc(p.name||'')+'</b><small dir="ltr" style="text-align:right">'+esc(p.phone||'')+'</small>'+((p.store||p.note)?'<small>'+esc([p.store,p.note].filter(Boolean).join(' · '))+'</small>':'')+'</span>'+
          (p.phone?'<a class="mini pri" href="'+esc(telHref(p.phone))+'">📞 '+T('חיוג','Call')+'</a><a class="mini" href="'+esc(waHref(p.phone))+'" target="_blank" rel="noopener">💬</a>':'')+'<button class="mini bad" data-rmprov="'+esc(p.id)+'">✕</button></div>').join('');}).join(''):'<p class="muted-note">'+T('עוד לא הוספת מספרים.','No contacts yet.')+'</p>')+
      '<h4 style="margin-top:12px">➕ '+T('הוספת מספר','Add a contact')+'</h4><select id="mpRole">'+Object.keys(PROV_ROLES).map(k=>'<option value="'+k+'">'+PROV_ROLES[k][0]+' '+T(PROV_ROLES[k][1],PROV_ROLES[k][2])+'</option>').join('')+'</select>'+
      '<div class="grid2"><div><input id="mpName" maxlength="40" placeholder="'+T('שם','Name')+'"></div><div><input id="mpPhone" type="tel" maxlength="20" dir="ltr" style="text-align:right" placeholder="'+T('טלפון','Phone')+'"></div>'+
      '<div><input id="mpStore" list="moStores2" maxlength="40" placeholder="'+T('חנות (לא חובה)','Store (optional)')+'"><datalist id="moStores2">'+myStoreNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist></div><div><input id="mpNote" maxlength="80" placeholder="'+T('הערה (שעות, ימים...)','Note')+'"></div></div>'+
      '<button id="mpAdd">➕ '+T('הוספה','Add')+'</button>'+shared+'</div>';
  }
  if(meTab==='habits'){
    if(!H.trips)h+='<div class="mecard"><p class="muted-note">'+T('עוד אין מספיק נתונים 🙂 אחרי כמה קניות (מסמנים ✓ ולוחצים "סיום קנייה", ורושמים איפה קנית) — כאן יופיע ניתוח של הרגלי הקנייה שלך.','Not enough data yet.')+'</p></div>';
    else{
      const favDay=H.dows.indexOf(Math.max(...H.dows));const maxD=Math.max(1,...H.dows);
      const st=Object.entries(H.stores).sort((a,b)=>b[1]-a[1]);
      h+='<div class="kpis"><div class="kpi"><b>'+H.trips+'</b><span>'+T('קניות','trips')+'</span></div><div class="kpi"><b>'+H.items+'</b><span>'+T('מוצרים נקנו','items')+'</span></div><div class="kpi"><b>'+Math.round(H.items/H.trips)+'</b><span>'+T('בממוצע לקנייה','per trip')+'</span></div><div class="kpi"><b>'+esc(DAYS[favDay])+'</b><span>'+T('היום הקבוע','usual day')+'</span></div></div>';
      h+='<div class="mecard"><h4>🏪 '+T('איפה אני קונה','Where I shop')+'</h4>'+(st.length?st.slice(0,8).map(([s,c])=>'<div class="hbar"><span>'+esc(s)+'</span><i><b style="width:'+Math.round(100*c/Math.max(1,H.withStore))+'%"></b></i><span>'+Math.round(100*c/Math.max(1,H.withStore))+'%</span></div>').join(''):'<p class="muted-note">'+T('כשמסיימים קנייה — רושמים איפה קנית, ואז יופיע כאן.','Record the store when finishing a purchase.')+'</p>')+'</div>';
      h+='<div class="mecard"><h4>📅 '+T('באילו ימים','Which days')+'</h4>'+H.dows.map((c,i)=>'<div class="hbar"><span>'+esc(dayName(i))+'</span><i><b style="width:'+Math.round(100*c/maxD)+'%"></b></i><span>'+c+'</span></div>').join('')+'</div>';
      const mapped=H.prods.filter(p=>p.store).slice(0,40);
      if(mapped.length)h+='<div class="mecard"><h4>🧾 '+T('איפה קונים כל מוצר','Where each product is bought')+'</h4>'+mapped.map(p=>'<div class="merow"><span>'+esc(p.e)+'</span><span class="grow">'+esc(p.n)+'</span><span>🏪 '+esc(p.store)+(p.storePct<100?' <small style="display:inline">('+p.storePct+'%)</small>':'')+'</span></div>').join('')+'</div>';
      h+='<button id="meAiHabits" style="width:100%">🧠 '+T('לבקש מיאמי ניתוח וטיפים לחיסכון','Ask Yami for savings tips')+'</button>';
    }
  }
  b.innerHTML=h;
}
document.querySelector('#meSeg').addEventListener('click',e=>{const t=e.target.closest('[data-metab]');if(!t)return;meTab=t.dataset.metab;renderMe();});
document.querySelector('#meBody').addEventListener('click',async e=>{
  const me=meData();const el=e.target.closest('button,[data-addp]');if(!el)return;const d=el.dataset;const v=id=>{const x=document.getElementById(id);return x?x.value.trim():'';};
  if(el.id==='meSaveInfo'){const n=v('meName').slice(0,40);if(n&&hasProfanity(n)){flash('נא לבחור שם מכבד 🙂');return;}if(n&&state.user){state.user.name=n;if(typeof touchPresence==='function')touchPresence();}const mc=cleanCity(v('meCity'));if(mc&&hasProfanity(mc)){flash(T('נא לכתוב שם עיר 🙂','Please enter a city name 🙂'));return;}if(mc){const kc=knownCity(mc);meData().city=kc||mc;if(kc)state.city=kc;}meSave();flash('✔️ '+T('נשמר','Saved'));return;}
  if(el.id==='meCode'){openPwModal(true);return;}
  if(el.id==='meSaveAddr'){const a={street:v('maStreet'),city:v('maCity'),apt:v('maApt'),phone:v('maPhone'),notes:v('maNotes')};if(Object.values(a).some(hasProfanity)){flash('🙏');return;}const ac=knownCity(a.city);if(ac&&ac!==knownCity(me.city)){me.city=ac;state.city=ac;const mi=document.getElementById('meCity');if(mi)mi.value=ac;}/* עברו דירה — גם "העיר שלי" (זמני שבת) מתעדכנת */
    me.address=a;meSave();flash('🚚 '+T('הכתובת נשמרה','Address saved'));return;}
  if(el.id==='meCopyAddr'){const a=me.address;const t=[a.street,a.apt,a.city,a.phone,a.notes].filter(Boolean).join(', ');if(!t){flash(T('עוד אין כתובת','No address yet'));return;}try{await navigator.clipboard.writeText(t);flash('📋 '+T('הכתובת הועתקה','Copied'));}catch(err){(await uiPrompt(T('העתיקו מכאן:','Copy:'),t));}return;}
  if(d.me==='reorder'){reorderLast();return;}
  if(d.me==='due'){const its=dueItems();addMany(its);flash('⏰ '+T('נוספו '+its.length+' מוצרים','Added '+its.length));renderMe();return;}
  if(d.addp){addItem(d.addp,'');return;}
  if(d.rmstore){me.stores=me.stores.filter(s=>s.id!==d.rmstore);meSave();renderMe();return;}
  if(d.addstore){if(!me.stores.some(s=>s.name===d.addstore)){me.stores.push({id:uid(),name:d.addstore,kind:chainKind(d.addstore)==='online'?'online':'store',branch:'',url:''});meSave();}renderMe();return;}
  if(el.id==='msAdd'){const name=v('msName').slice(0,40),kind=v('msKind'),extra=v('msExtra').slice(0,200);if(!name){flash(T('צריך שם חנות','Store name needed'));return;}if([name,extra].some(hasProfanity)){flash('🙏');return;}
    if(me.stores.some(s=>s.name===name)){flash(T('כבר ברשימה','Already listed'));return;}
    me.stores.push({id:uid(),name,kind:kind==='online'?'online':'store',branch:kind==='online'?'':extra,url:kind==='online'?extra:''});meSave();renderMe();flash('🏪 '+T('נוסף','Added'));return;}
  if(d.rmorder){me.orders=me.orders.filter(o=>o.id!==d.rmorder);meSave();renderMe();return;}
  if(el.id==='moAdd'){const store=v('moStore').slice(0,40),note=v('moNote').slice(0,80);if([store,note].some(hasProfanity)){flash('🙏');return;}
    me.orders.push({id:uid(),store,day:+v('moDay')||0,time:v('moTime').slice(0,5),note});meSave();renderMe();flash('⏰ '+T('נשמר — אזכיר לך ב'+orderDayName(+v('moDay')||0),'Saved'));return;}
  if(d.rmprov){if(!(await uiConfirm(T('למחוק את המספר?','Delete this contact?'))))return;me.providers=me.providers.filter(p=>p.id!==d.rmprov);meSave();renderMe();return;}
  if(el.id==='mpAdd'){const p={id:uid(),role:v('mpRole'),name:v('mpName').slice(0,40),phone:v('mpPhone').slice(0,20),store:v('mpStore').slice(0,40),note:v('mpNote').slice(0,80)};
    if(!p.name&&!p.phone){flash(T('צריך שם או טלפון','Name or phone needed'));return;}if(p.phone&&!/^[\d+\-\s()*#]{3,20}$/.test(p.phone)){flash(T('⚠️ מספר טלפון לא תקין','⚠️ Invalid phone'));return;}
    if([p.name,p.store,p.note].some(hasProfanity)){flash('🙏');return;}me.providers.push(p);meSave();renderMe();flash('📞 '+T('נשמר','Saved'));return;}
  if(el.id==='meAiHabits'){document.querySelector('#meOverlay').classList.remove('open');openBot();sendToBot(T('נתחי את הרגלי הקנייה שלי ותני לי טיפים לחיסכון','Analyze my shopping habits and give me saving tips'));return;}
});
document.querySelector('#meBody').addEventListener('change',e=>{if(e.target.id==='msKind'){const x=document.querySelector('#msExtra');x.placeholder=e.target.value==='online'?T('כתובת האתר (למשל shufersal.co.il)','Website address'):T('סניף (עיר — רחוב)','Branch');}});
document.querySelector('#miMe').onclick=()=>openMe();
document.querySelector('#btnUser').onclick=()=>openMe('info');
document.querySelector('#btnCloseMe').onclick=()=>document.querySelector('#meOverlay').classList.remove('open');
['#meOverlay','#notifOverlay','#reviewsOverlay','#finishOverlay','#basketOverlay'].forEach(s=>document.querySelector(s).addEventListener('click',e=>{if(e.target.id===s.slice(1))e.target.classList.remove('open');}));
document.querySelector('#btnCloseFinish').onclick=()=>document.querySelector('#finishOverlay').classList.remove('open');

/* ---------- חוות דעת על האתר (1–5 כוכבים, מתפרסמות אחרי אישור מנהל) ---------- */
let myReview=null,reviewStars=0;
const starsTxt=n=>'<span class="stars" aria-label="'+n+' '+T('כוכבים','stars')+'">'+'★'.repeat(n)+'<span style="color:#d8d2c0">'+'★'.repeat(5-n)+'</span></span>';
async function openReviews(){
  document.querySelector('#hMenu').classList.remove('open');
  const box=document.querySelector('#reviewsBody');box.innerHTML='<div class="empty">'+T('טוען...','Loading...')+'</div>';
  document.querySelector('#reviewsOverlay').classList.add('open');
  if(!sb){box.innerHTML='<div class="empty">'+T('אין חיבור לשרת','No connection')+'</div>';return;}
  const [sum,list,mine]=await Promise.all([sb.rpc('site_rating'),sb.from('site_reviews').select('id,stars,body,reply,created_at,updated_at').eq('status','approved').order('created_at',{ascending:false}).limit(100),
    authUser?sb.from('site_reviews').select(COLS23.reviews).eq('user_id',authUser.id).maybeSingle():{data:null}]);
  if(sum.error&&list.error){box.innerHTML='<div class="empty">'+(isAdmin()?'⚠️ צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית)':T('חוות הדעת עוד לא זמינות 🙏','Reviews are not available yet 🙏'))+'</div>';return;}
  const s=(sum.data&&sum.data[0])||{avg_stars:0,total:0};myReview=mine.data||null;reviewStars=myReview?myReview.stars:0;
  const tot=Math.max(1,s.total);
  let h='<div class="rvsum"><div class="big">'+(s.total?Number(s.avg_stars).toFixed(1):'—')+'<small>'+starsTxt(Math.round(Number(s.avg_stars)||0))+'</small><small>'+s.total+' '+T('חוות דעת','reviews')+'</small></div><div class="rvbars">'+[5,4,3,2,1].map(n=>'<div><span>'+n+'★</span><i><b style="width:'+Math.round(100*(s['s'+n]||0)/tot)+'%"></b></i><span>'+(s['s'+n]||0)+'</span></div>').join('')+'</div></div>';
  if(authUser){
    h+='<div class="mecard"><h4>✍️ '+(myReview?T('חוות הדעת שלי','My review'):T('איך האתר בעיניך?','How do you like the site?'))+'</h4>'+
      (myReview?'<p class="muted-note">'+({pending:'⏳ '+T('ממתינה לאישור המנהל','Waiting for approval'),approved:'✅ '+T('פורסמה — תודה!','Published — thanks!'),rejected:'🙈 '+T('לא פורסמה','Not published')}[myReview.status]||'')+'</p>':'')+
      '<div class="starpick" id="rvStars" role="radiogroup" aria-label="'+T('דירוג','Rating')+'">'+[1,2,3,4,5].map(n=>'<button type="button" data-star="'+n+'" role="radio" aria-checked="'+(n===reviewStars)+'" aria-label="'+n+'"'+(n<=reviewStars?' class="on"':'')+'>★</button>').join('')+'</div>'+
      '<textarea id="rvBody" maxlength="1500" placeholder="'+T('מה אהבת? מה אפשר לשפר? (לא חובה)','What did you like? What can be better?')+'">'+esc(myReview?myReview.body:'')+'</textarea>'+
      '<button id="rvSend" style="width:100%">'+(myReview?T('עדכון חוות הדעת','Update review'):T('שליחה','Send'))+' ⭐</button><p class="muted-note">'+T('חוות הדעת מתפרסמת אחרי אישור מנהל האתר.','Reviews are published after approval.')+'</p></div>';
  }
  const rows=list.data||[];
  h+=rows.length?rows.map(r=>'<div class="rvcard"><div class="rvh"><span>'+starsTxt(r.stars)+' <b style="color:var(--text)">'+crSlot('reviews',r.id,{f:T('משתמש/ת','User')})+'</b></span><span>'+new Date(r.created_at).toLocaleDateString(prefs.lang==='en'?'en-GB':'he-IL')+'</span></div>'+(r.body?'<div style="white-space:pre-wrap">'+esc(r.body)+'</div>':'')+(r.reply?'<div class="rvr">💬 '+T('תגובת האתר','Reply')+': '+esc(r.reply)+'</div>':'')+'</div>').join(''):'<div class="empty">'+T('עוד אין חוות דעת — '+GW2('תהיי','תהיה')+' הראשון/ה! ⭐','No reviews yet — be the first! ⭐')+'</div>';
  box.innerHTML=h;
}
document.querySelector('#reviewsBody').addEventListener('click',async e=>{
  const st=e.target.closest('[data-star]');
  if(st){reviewStars=+st.dataset.star;document.querySelectorAll('#rvStars [data-star]').forEach(b=>{const on=+b.dataset.star<=reviewStars;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(+b.dataset.star===reviewStars));});return;}
  if(e.target.closest('#rvSend')){
    if(!reviewStars){flash(T('בחרו כמה כוכבים ⭐','Pick a star rating ⭐'));return;}
    const body=document.querySelector('#rvBody').value.trim().slice(0,1500);if(hasProfanity(body)){flash('🙏 '+T('נא לכתוב בלשון נקייה','Please keep it clean'));return;}
    const btn=e.target.closest('#rvSend');btn.disabled=true;
    const q=myReview?sb.from('site_reviews').update({stars:reviewStars,body}).eq('id',myReview.id):sb.from('site_reviews').insert({stars:reviewStars,body,user_id:authUser.id});
    const {error}=await q;btn.disabled=false;
    if(error){flash('⚠️ '+error.message);return;}
    flash(isStaff()?'✔️ '+T('נשמר','Saved'):'📨 '+T('תודה! חוות הדעת נשלחה לאישור המנהל','Thanks! Sent for approval'));openReviews();
  }
});
document.querySelector('#miReviews').onclick=openReviews;
document.querySelector('#btnCloseReviews').onclick=()=>document.querySelector('#reviewsOverlay').classList.remove('open');

/* ---------- יאמי: פקודות חדשות + הצעות יזומות ---------- */
let askStoreTs=0,pendingDtAsk=false;
const NOPE=/^(לא|דלג|אין|לא משנה|לא יודע|לא יודעת|עזוב|עזבי|בטל)(\s|$)/;
const YES2=/^(כן|בטח|יש|יש לי|בשמחה|רוצה|אשמח|אוקיי|אוקי|סבבה|כמובן)(\s|!|$)/;
function dealsText(r){
  const lines=r.deals.slice(0,8).map(({p,hit})=>'• 🏷️ '+p.chain+': '+p.title+(p.ends_at?' ('+T('עד ','until ')+new Date(p.ends_at).toLocaleDateString('he-IL')+')':'')+(hit.length?'\n   ⭐ '+T('מוצרים שאת/ה קונה: ','Your products: ')+hit.slice(0,4).join(', '):''));
  return lines.join('\n');
}
async function v7BotPre(raw){
  const t=norm(raw);
  if(hasProfanity(raw))return false;
  /* איפה קנית? — אחרי "סיימתי קנייה" */
  if(askStoreTs){
    const ts=askStoreTs;askStoreTs=0;
    if(NOPE.test(t))return botSay(T('בסדר 🙂','OK 🙂')),true;
    const store=raw.trim().replace(/^(ב|ב-|באתר של|בסופר|בחנות)\s*/,'').slice(0,40);
    if(store&&t.split(' ').length<=5){const hh=state.history.find(h=>h.ts===ts);if(hh){hh.store=store;save();}
      botSay(T('רשמתי שקנית ב'+store+' 🏪 — ככה אני לומדת איפה את/ה קונה כל מוצר, ואזכיר לך בפעם הבאה.','Noted: '+store+' 🏪'));return true;}
  }
  if(pendingDtAsk&&!TORAH_OFF){
    pendingDtAsk=false;
    if(YES2.test(t)){const cur=currentParashaName();state.dtFlow={step:'parasha',suggest:cur};save(true);botSay(T('איזה כיף! 📜 על איזו פרשה?','Great! 📜 Which parasha?')+(cur?'\n('+T('פרשת השבוע: '+cur+' — '+GW2('כתבי','כתוב')+' "כן"','This week: '+cur+' — write "yes"')+')':''));return true;}
    if(NOPE.test(t)){botSay(T('בסדר גמור 🙂 אם '+GW2('תרצי','תרצה')+' לשמוע דבר תורה — '+GW2('כתבי','כתוב')+' "דבר תורה". שבת שלום! 🕯️','No problem 🙂 Shabbat shalom! 🕯️'));return true;}
  }
  /* "כן" לקנייה הקודמת — מוסיפים עם הכמויות */
  if(state.pending&&state.pending.qty&&/^(כן|בסדר|סבבה|אישור|רוצה|בצע|טוב|מצוין|אוקיי|אוקי|יאללה|בטח|בשמחה|כמובן)(\s|$)|^(תוסיף|תוסיפי|הוסיפי|הוסף|תוסיפו)(\s|$)/.test(t)){
    const pd=state.pending;state.pending=null;const n=addMany(pd.items.map(x=>({n:x,q:pd.qty[x]||''})));
    botSay(T('הוספתי לרשימה ✅','Added ✅')+' ('+n+')\n'+pd.items.map(x=>'• '+x+(pd.qty[x]?' ×'+pd.qty[x]:'')).join('\n'));return true;}
  /* שיחה באמצע (מתכון, דבר תורה, בחירת סניף, שאלת כן/לא) — מעבירים ליאמי הרגילה */
  if(state.addRecipeFlow||state.dtFlow)return false;
  if(state.pendingNav&&/^\d{1,2}$/.test(t))return false;
  if((state.pendingCholent||state.pending||state.pendingRecipe)&&(/^(כן|בסדר|סבבה|אישור|רוצה|בצע|טוב|מצוין|אוקיי|אוקי|יאללה|בטח|בשמחה|כמובן)(\s|$)|^(תוסיף|תוסיפי|הוסיפי|הוסף|תוסיפו)(\s|$)/.test(t)||/^(לא|בטל|אין|לא עכשיו|לא צריך|לא תודה|אין צורך)(\s|$)/.test(t)))return false;
  /* סיום קנייה — רק מה שסומן, ואז "איפה קנית?" */
  if(/(סיימתי (את )?(ה)?קני|סיימתי לקנות|גמרתי (את )?(ה)?קני|גמרתי לקנות|סגרי (את )?(ה)?קנייה|סיום קנייה|קנינו הכל|קניתי הכל)/.test(t)){
    const l=curList();const partial=l.items.some(i=>i.done)&&l.items.some(i=>!i.done);
    const n=finishList(true);
    if(!n){botSay(T('הרשימה כבר ריקה 🙂 אין מה להעביר','The list is already empty 🙂'));return true;}
    const tw=lastFinishTwin;askStoreTs=tw?(tw.store?0:tw.ts):state.history[0].ts;
    botSay('✅ '+T('סימנתי שסיימת! '+n+' פריטים עברו להיסטוריה עם ✓✓ כחולים 🕘','Done! '+n+' items moved to history 🕘')+(tw?'\n🧾 '+T('צירפתי לקבלה שהעלית היום — הקנייה נספרת פעם אחת.','Joined to the receipt you uploaded today — counted once.'):'')+(partial?'\n🛒 '+T('מה שלא סימנת נשאר ברשימה — לחנות הבאה.','Unticked items stay on the list for the next store.'):'')+(askStoreTs?'\n\n🏪 '+T('איפה קנית? ('+GW2('כתבי','כתוב')+' שם חנות או "דלג")','Where did you buy? (store name or "skip")'):''));return true;
  }
  if(/(הקנייה הקודמת|הקניה הקודמת|קנייה קודמת|קניה קודמת|מה קניתי בפעם|מה קנינו בפעם|לחזור על הקני|אותה קנייה|אותה קניה)/.test(t)||(/(פעם קודמת|בפעם שעברה|כמו בפעם)/.test(t)&&(/(קני|לקנות|רשימה)/.test(t)||t.split(' ').length<=4))){
    const last=lastShopping();if(!last){botSay(T('עוד אין קנייה קודמת 🙂 אחרי שתסיימו קנייה — אזכור אותה.','No previous shopping yet 🙂'));return true;}
    const l=curList();const missing=last.items.filter(i=>!l.items.some(x=>x.n===i.n&&!x.done));
    if(!missing.length){botSay(T('כל מה שקנית בפעם הקודמת כבר ברשימה ✔','Everything from last time is already on the list ✔'));return true;}
    state.pendingCholent=false;pendingDtAsk=false;state.pending={items:missing.map(i=>i.n),qty:Object.fromEntries(missing.map(i=>[i.n,i.q||'']))};save();
    botSay('🔁 '+T('בפעם הקודמת ('+fmtDate(new Date(last.ts))+(last.stores.length?' · '+last.stores.join(', '):'')+') קנית:','Last time you bought:')+'\n'+missing.map(i=>'• '+(i.e||emojiOf(i.n))+' '+i.n+(i.q?' ×'+i.q:'')).join('\n')+'\n\n'+T('להוסיף הכל לרשימה? (כן/לא)','Add all to the list? (yes/no)'));return true;
  }
  if(/(מה (כנראה )?נגמר|הצעות לקנייה|מה בדרך כלל אני קונה|מה אני קונה בדרך כלל)/.test(t)||/(מה כדאי (לקנות|להוסיף)|תציעי לי)(\s+(לי|לנו|מה לקנות|מה להוסיף|מוצרים|היום|השבוע|בסופר|לרשימה))*[?？!.]*$/.test(t)){
    const due=dueItems();if(!due.length){const top=habits().prods.slice(0,8);botSay(top.length?T('לפי ההרגלים שלך, לא נראה שמשהו נגמר עכשיו 🙂\nהמוצרים שאת/ה הכי קונה: ','Nothing seems to be running out 🙂 Your top products: ')+top.map(p=>p.n).join(', '):T('עוד אין לי מספיק היסטוריה 🙂','Not enough history yet 🙂'));return true;}
    state.pendingCholent=false;pendingDtAsk=false;state.pending={items:due.map(p=>p.n)};save();
    botSay('⏰ '+T('לפי ההרגלים שלך, כנראה הגיע הזמן לקנות:','Based on your habits, probably time to buy:')+'\n'+due.map(p=>'• '+p.e+' '+p.n+' ('+T('כל ~'+p.every+' ימים, לאחרונה '+ago(p.last),'every ~'+p.every+' days')+')').join('\n')+'\n\n'+T('להוסיף לרשימה? (כן/לא)','Add to the list? (yes/no)'));return true;
  }
  const whereP=t.match(/^איפה (?:אני קונה|אני קונה את|קניתי|קנינו|קונים אצלנו) (?:את )?(?:ה)?(.+?)\??$/);
  if(whereP){const name=NORMP[norm(whereP[1])]||fuzzyResolve(whereP[1])||whereP[1];const p=habits().byName[name];
    botSay(p?(p.e+' '+name+': '+(p.store?T('בדרך כלל ב'+p.store+' ('+p.storePct+'%)','usually at '+p.store):T('עוד לא רשמת איפה','store not recorded yet'))+' · '+T('נקנה '+p.count+' פעמים','bought '+p.count+'×')+(p.every?' · '+T('כל ~'+p.every+' ימים','every ~'+p.every+' days'):'')):T('עוד לא קנית "'+name+'" דרך האתר 🙂','No record of "'+name+'" yet 🙂'));return true;}
  if(/^(הרגלי (ה)?קני(י)?ה( שלי)?|ההרגלים שלי|איפה אני קונה|איך אני קונה|סיכום הקניות שלי)\??$/.test(t)){
    const s=habitsSummary(12);botSay(s?('📊 '+T('הרגלי הקנייה שלך:','Your shopping habits:')+'\n'+s+'\n\n'+T('הכל מפורט ב"👤 האזור האישי" ← 📊','Details in "👤 My area" ← 📊')):T('עוד אין לי מספיק נתונים 🙂 מסמנים ✓ ומסיימים קנייה — ואני לומדת.','Not enough data yet 🙂'));return true;}
  if(/(נתחי|תנתחי|ניתוח).*(הרגל|קני)/.test(t)){
    if(await askAI())return true;
    const s=habitsSummary(15);botSay(s?('📊 '+s+'\n\n💡 '+T('טיפ: '+GW2('בדקי','בדוק')+' "איפה הכי זול?" ברשימה — ואראה לך באיזו חנות הסל הכי זול.','Tip: use "Cheapest store?" on the list.')):T('עוד אין לי מספיק נתונים 🙂','Not enough data yet 🙂'));return true;}
  /* מילות מיקום ("לידי", "באזור שלי") — רק כשמדובר בקניות; "פיצה טובה באזור שלי" הולכת לבינה המלאכותית */
  if((/(מבצעים|מבצע |מבצע$|הנחות|מוזל|הוזל|זול באזור)/.test(t)||(/(באזור שלי|לידי|קרוב אלי|קרוב לבית)/.test(t)&&(/(סופר|חנות|חנויות|מכולת|רשת|רשתות|לקנות|קניות|מחיר|זול)/.test(t)||t.split(' ').length<=2)))&&!/(דבר תורה|וורט)/.test(t)){
    botSay('📍 '+T('בודקת מבצעים לפי המיקום שלך...','Checking deals near you...'));
    const r=await nearbyDeals(/(לידי|באזור|קרוב|מיקום|כאן)/.test(t)||!myCity());
    const rows=await loadRanking();const here=(rows||[]).filter(x=>r.here.has(x.chain));
    let s=r.deals.length?('🏷️ '+T('מבצעים פעילים'+(r.city?' ב'+r.city:'')+':','Active deals'+(r.city?' in '+r.city:'')+':')+'\n'+dealsText(r)):(T('לא מצאתי כרגע מבצעים מדווחים'+(r.city?' ב'+r.city:'')+' 🤷','No reported deals'+(r.city?' in '+r.city:'')+' right now 🤷'));
    if(here.length)s+='\n\n💰 '+T('לפי הדיווחים, הרשת הכי זולה'+(r.city?' באזור':'')+': '+here[0].chain+' (הכי זולה ב-'+here[0].cheapest_pct+'% מהמוצרים)','Cheapest chain: '+here[0].chain);
    s+='\n\n🧭 '+T('לניווט: "נווטי ל<חנות> ב'+(r.city||'<עיר>')+'" · חנויות ומבצעים — בלשונית 🏪','Navigate: "navigate to <store>"')+(r.city?'':'\n📍 '+T('כדי שאדע איפה את/ה — '+GW2('אשרי','אשר')+' גישה למיקום, או '+GW2('בחרי','בחר')+' עיר ב"👤 האזור האישי"','Allow location or set your city in "👤 My area"'));
    botSay(s);return true;
  }
  if(/^(איפה הכי זול|איפה הכי משתלם|איזו רשת הכי זולה|איזה סופר הכי זול|מה הסופר הכי זול|הרשת הכי זולה|דירוג רשתות|איפה כדאי לקנות)( (את )?(ה)?רשימה| לקנות)?\??$/.test(t)){
    const rows=await loadRanking();
    let s=rows&&rows.length?('🏆 '+T('הרשתות הכי זולות לפי הדיווחים:','Cheapest chains by reports:')+'\n'+rows.slice(0,5).map((r,i)=>(['🥇','🥈','🥉'][i]||(i+1)+'.')+' '+r.chain+' — '+T('הכי זולה ב-'+r.cheapest_pct+'% מהמוצרים, יקרה בממוצע ב-'+r.avg_above_pct+'% מהזול','cheapest on '+r.cheapest_pct+'%, avg +'+r.avg_above_pct+'%')).join('\n')):T('עוד אין מספיק דיווחי מחיר כדי לדרג רשתות 🙏','Not enough price reports yet 🙏');
    if(curList().items.some(i=>!i.done)){s+='\n\n🛒 '+T('פתחתי לך השוואה של הרשימה שלך בין החנויות 👇','Opening a comparison of your list 👇');setTimeout(openBasket,600);}
    botSay(s);return true;
  }
  if(/(האזור האישי|הפרטים שלי|אזור אישי)/.test(t)){openMe();botSay('👤 '+T('פתחתי את האזור האישי','Opened your personal area'));return true;}
  if(/^(חוות דעת|חוות הדעת|ביקורות)[?？!.]*$/.test(t)||/(לדרג את האתר|דירוג לאתר|ביקורת על האתר|חוות דעת (על|ל)(ה)?אתר)/.test(t)){openReviews();botSay('⭐ '+T('פתחתי את חוות הדעת — תודה שאת/ה משתף/ת!','Opened reviews — thank you!'));return true;}
  if(/(נותני שירות|נותני השירות|טלפון של (ה)?(אורז|שליח|משלוח)|מספר של (ה)?(אורז|שליח|משלוח)|אורזי משלוח)/.test(t)||/^(ה)?(אורז|שליח)( שלי)?[?？!.]*$/.test(t)){
    const ps=meData().providers;if(!ps.length){openMe('providers');botSay(T('עוד לא שמרת מספרים 🙂 פתחתי את "📞 נותני שירות" — שם מוסיפים.','No contacts yet 🙂 Opened "📞 Service contacts".'));return true;}
    botSay('📞 '+T('נותני השירות שלך:','Your service contacts:')+'\n'+ps.map(p=>'• '+(PROV_ROLES[p.role]||PROV_ROLES.other)[0]+' '+(p.name||'')+' — '+(p.phone||'')+(p.store?' ('+p.store+')':'')).join('\n'));return true;}
  if(/(כתובת (ה)?משלוח|הכתובת שלי|כתובת למשלוח)/.test(t)){const a=meData().address;const s=[a.street,a.apt,a.city].filter(Boolean).join(', ');if(!s){openMe('info');botSay(T('עוד לא שמרת כתובת 🙂 פתחתי את האזור האישי.','No address yet 🙂'));return true;}botSay('🚚 '+s+(a.phone?'\n📞 '+a.phone:'')+(a.notes?'\n📝 '+a.notes:''));return true;}
  if(/^(התראות|עדכונים|הפעלת התראות|תפעילי התראות)$/.test(t)){openNotif();botSay('🔔 '+T('פתחתי את ההתראות','Opened notifications'));return true;}
  return false;
}
yamiStep(v7BotPre);
/* הקשר לבינה המלאכותית: הרגלים, חנויות, מבצעים באזור ודירוג רשתות */
const _v7AiContext=aiContext;
aiContext=function(){
  const me=meData();const H=habits();
  const deals=storePosts.filter(p=>p.status==='approved'&&p.kind!=='news'&&(!p.ends_at||new Date(p.ends_at)>new Date())).slice(0,12).map(p=>p.chain+': '+p.title);
  return _v7AiContext()+'\n'+[
    H.trips?('הרגלי הקנייה של המשתמש (מההיסטוריה):\n'+habitsSummary(25)):'הרגלי קנייה: עוד אין היסטוריה',
    me.stores.length?'החנויות/האתרים של המשתמש: '+me.stores.map(s=>s.name+(s.kind==='online'?' (אונליין)':'')).join(', '):'',
    me.orders.length?'זמני הזמנה קבועים: '+me.orders.map(o=>DAYS[o.day]+(o.time?' '+o.time:'')+' '+(o.store||'')).join(' · '):'',
    'עיר/מיקום: '+(myCity()||'לא ידוע'),
    deals.length?'מבצעים פעילים מהחנויות: '+deals.join(' | '):'',
    rankCache&&rankCache.length?'דירוג רשתות (הכי זולה קודם): '+rankCache.slice(0,6).map(r=>r.chain+' — הכי זולה ב-'+r.cheapest_pct+'%, יקרה בממוצע ב-'+r.avg_above_pct+'%').join(' · '):'',
    'כשמתאים — הציעי למשתמש מבצעים ומחירים מוזלים לפי המיקום וההרגלים שלו, הזכירי את הקנייה הקודמת, ואמרי איפה הכי משתלם לקנות כל מוצר.'
  ].filter(Boolean).join('\n');
};
/* הצעות יזומות כשפותחים את יאמי — פעם ביום לכל סוג */
function v7Offers(){
  if(!state.user)return;
  const asked=()=>state.pendingCholent||state.pending||pendingDtAsk||state.dtFlow||state.addRecipeFlow;
  const dt=dtReminderToday();
  if(dt&&botCfg.dtReminder!==false&&!offeredToday('dtask')){
    markOffered('dtask');
    const what=dt.kind==='chag'?T('ערב '+dt.name,'Erev '+dt.name):(new Date().getDay()===4?T('יום חמישי — שבת בפתח','Thursday — Shabbat is coming'):T('ערב שבת קודש','Erev Shabbat'));
    if(asked())botSay('📜 '+what+' 🕯️\n'+T('יש לך דבר תורה לשתף? '+GW2('כתבי','כתוב')+' "לשתף דבר תורה" ואעביר אותו למנהל — או "דבר תורה" כדי לקבל אחד.','Have a Dvar Torah to share? Write "share dvar torah".'));
    else{pendingDtAsk=true;botSay('📜 '+what+' 🕯️\n'+T('יש לך דבר תורה לשתף עם כולם? (כן/לא)','Do you have a Dvar Torah to share? (yes/no)'));}
  }
  const dow=new Date().getDay();const ord=meData().orders.filter(o=>+o.day===dow);
  if(ord.length&&!offeredToday('order')&&(dow!==6||new Date().getHours()>=19)){markOffered('order');botSay('⏰ '+T('תזכורת: היום יום הזמנה','Reminder: order day today')+' — '+ord.map(o=>(o.store||'')+(o.time?' '+T('בשעה','at')+' '+o.time:'')+(o.note?' ('+o.note+')':'')).join(' · '));}
  const due=dueItems();
  if(due.length&&!asked()&&!offeredToday('due')){markOffered('due');state.pending={items:due.map(p=>p.n)};save();
    botSay('⏰ '+T('לפי ההרגלים שלך, כנראה נגמרו:','Based on your habits, probably running out:')+' '+due.map(p=>p.n).join(', ')+'\n'+T('להוסיף לרשימה? (כן/לא)','Add to the list? (yes/no)'));}
  else if(!curList().items.length&&state.history.length&&!offeredToday('reorder')){markOffered('reorder');botSay('🔁 '+T('הרשימה ריקה — '+GW2('רוצה','רוצה')+' להתחיל מהקנייה הקודמת? '+GW2('כתבי','כתוב')+' "קנייה קודמת"','The list is empty — start from last time? Write "last shopping"'));}
  if(!offeredToday('deals')&&storePosts.length){
    nearbyDeals(false).then(r=>{if(!r.deals.length||offeredToday('deals'))return;markOffered('deals');const mineHits=r.deals.filter(x=>x.hit.length);
      botSay('📍 '+T('יש '+r.deals.length+' מבצעים פעילים'+(r.city?' באזור '+r.city:'')+(mineHits.length?' — '+mineHits.length+' מהם על מוצרים שאת/ה קונה ⭐':''),r.deals.length+' active deals'+(r.city?' near '+r.city:''))+'\n'+T(GW2('כתבי','כתוב')+' "מבצעים לידי" לפרטים','Write "deals near me"'));});
  }
}
const _v7OpenBot=openBot;
openBot=function(){_v7OpenBot();document.querySelector('#botNudge').hidden=true;v7Offers();};
document.querySelector('#botFab').onclick=()=>openBot();
/* בכל כניסה: תזכורות, התראות על מבצעים, דבר תורה */
function v7AfterEnter(){
  if(!state.user)return;
  const dt=dtReminderToday();
  if(dt&&botCfg.dtReminder!==false){
    const what=dt.kind==='chag'?T('ערב '+dt.name,'Erev '+dt.name):T('שבת מתקרבת','Shabbat is coming');
    if(!offeredToday('dtnudge')){markOffered('dtnudge');setTimeout(()=>showNudge('📜 '+what+' — '+T('יש לך דבר תורה לשתף? לחצו כאן 👩‍🍳','got a Dvar Torah to share? Tap here 👩‍🍳')),3500);}
    notify('torah:'+dayKey(new Date()),'torah',what+' 🕯️',T('יש לך דבר תורה? אפשר לשתף דרך יאמי — או לבקש ממנה דבר תורה על הפרשה.','Share a Dvar Torah through Yami, or ask her for one.'),'');
  }
  const dow=new Date().getDay();meData().orders.filter(o=>+o.day===dow&&(dow!==6||new Date().getHours()>=19)).forEach(o=>notify('order:'+o.id+':'+dayKey(new Date()),'order',T('היום יום הזמנה','Order day today')+(o.store?' — '+o.store:''),(o.time?T('בשעה ','at ')+o.time:'')+(o.note?' · '+o.note:''),'list'));
  const due=dueItems();if(due.length)notify('due:'+dayKey(new Date()),'order',T('כנראה נגמרו: ','Probably running out: ')+due.slice(0,4).map(p=>p.n).join(', '),T('לפי ההרגלים שלך — אפשר להוסיף בלחיצה מהרשימה הריקה או מיאמי','Based on your habits'),'list');
  setTimeout(checkSaleAlerts,6000);
}
/* ביציאה — מנקים את ההתראות של המשתמש מהמכשיר */
const _v7Logout=doLogout;
doLogout=async function(){inbox=[];saveInbox();updateBell(false);document.querySelector('#botNudge').hidden=true;askStoreTs=0;pendingDtAsk=false;return _v7Logout();};
const _v7AfterEnter=afterEnter;
afterEnter=function(){_v7AfterEnter();setTimeout(v7AfterEnter,2500);};
setInterval(()=>{if(document.visibilityState==='visible')checkSaleAlerts();},10*60*1000);
updateBell(false);
if(state.user&&authUser)setTimeout(v7AfterEnter,2500);
render();
