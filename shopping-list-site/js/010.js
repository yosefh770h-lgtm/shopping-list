
/* ================= גרסה 10: התראות גם כשהאתר סגור, דיווח וחסימה על שפה, הבית שלי כמו חנות אונליין (תמונות ועריכה),
   צ'אט עסקי, השוואת מחירים לפי עיר, דיווחים ישנים בסוף ================= */
const $10=s=>document.querySelector(s);
const PUSH_SUPPORTED='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;

/* ---------- הקנייה הקודמת: לא מוסיפים אוטומטית — פותחים את היסטוריית הקניות והלקוח בוחר ---------- */
function pickItemsSheet(title,items,note){
  const l=curList();const inList=new Set(l.items.filter(i=>!i.done).map(i=>i.n));
  const b=openSheet(title,(note?'<p class="muted-note">'+note+'</p>':'')+
    '<div class="pickl">'+items.map((it,i)=>'<label class="pickrow"><input type="checkbox" data-pk="'+i+'"'+(inList.has(it.n)?' disabled':it.off?'':' checked')+'><span>'+emojiOf(it.n)+'</span><span class="grow">'+esc(it.n)+(it.q?' <small>×'+esc(it.q)+'</small>':'')+'</span>'+(inList.has(it.n)?'<small class="muted-note" style="margin:0">'+T('כבר ברשימה','already listed')+'</small>':'')+'</label>').join('')+'</div>'+
    '<div class="row2"><button class="btn sec" id="pkAll">☑️ '+T('הכל / כלום','All / none')+'</button><button id="pkAdd">🛒 '+T('להוסיף את המסומנים ל"'+esc(l.name)+'"','Add selected to "'+esc(l.name)+'"')+'</button></div>');
  b.onchange=null;b.oninput=null;
  b.onclick=e=>{
    if(e.target.closest('#pkAll')){const cbs=[...b.querySelectorAll('[data-pk]:not(:disabled)')];const all=cbs.every(c=>c.checked);cbs.forEach(c=>c.checked=!all);return;}
    if(e.target.closest('#pkAdd')){const sel=[...b.querySelectorAll('[data-pk]:checked:not(:disabled)')].map(c=>items[+c.dataset.pk]);
      if(!sel.length){flash(T('לא סימנת כלום 🙂','Nothing selected 🙂'));return;}
      const n=addMany(sel.map(x=>({n:x.n,q:x.q})));closeSheet();flash('🛒 '+T('נוספו '+n+' מוצרים לרשימה','Added '+n+' items'));}
  };
}
reorderLast=function(){
  if(!state.history.length){flash(T('עוד אין קנייה קודמת 🙂','No previous shopping yet 🙂'));return 0;}
  openMe('purchases');flash('🧾 '+T('אלה הקניות הקודמות — בוחרים קנייה ולוחצים "להוסיף לרשימה"','Your past purchases — pick one to add'));return 0;
};
/* כפתור "להוסיף לרשימה" בקנייה קודמת — בוחרים בדיוק אילו מוצרים */
document.querySelector('#meOverlay').addEventListener('click',e=>{const a=e.target.closest('#meBody [data-puradd]');if(!a)return;e.stopPropagation();e.preventDefault();
  const h=state.history[+a.dataset.puradd];if(!h)return;
  pickItemsSheet('🔁 '+T('מה להוסיף מהקנייה הזו?','What to add from this purchase?'),h.items.map(x=>({n:x.n,q:x.q})),esc(fmtDate(new Date(h.ts)))+(h.store?' · 🏪 '+esc(h.store):'')+' — '+T('מסמנים מה צריך שוב, ורק אז זה נכנס לרשימה.','tick what you need again.'));},true);

/* ---------- ניווט מהתראה (#chat) ---------- */
function routeHash(){const h=location.hash||'';
  if(h==='#chat'){history.replaceState(null,'',location.pathname);setTimeout(()=>openChat(),300);}}
addEventListener('hashchange',routeHash);

/* ---------- התראות לטלפון ולמחשב גם כשהאתר סגור (Web Push) ---------- */
let pushState={sub:null,prefs:null,key:null};
function b64uToBytes(s){const t=s.replace(/-/g,'+').replace(/_/g,'/');const p=t+'==='.slice((t.length+3)%4);return Uint8Array.from(atob(p),c=>c.charCodeAt(0));}
async function pushReg(){if(!PUSH_SUPPORTED)return null;try{return await navigator.serviceWorker.ready;}catch(e){return null;}}
/* בלי אישור התראות אין מינוי, אז לא שואלים את הדפדפן. גם חוסך קריאה, וגם עוקף באג ב-WebKit החדש (Playwright 1.65 בלינוקס) שבו getSubscription מקפיא את כל הדף */
async function pushRefresh(){const r=await pushReg();pushState.sub=r&&Notification.permission==='granted'?await r.pushManager.getSubscription():null;
  if(sb&&authUser){try{const {data}=await sb.from('push_prefs').select('*').eq('user_id',authUser.id).maybeSingle();pushState.prefs=data||null;}catch(e){}}}
async function pushEnable(){
  if(!PUSH_SUPPORTED){flash(/iPhone|iPad/.test(navigator.userAgent)?T('באייפון: קודם "הוספה למסך הבית" (שיתוף ← הוסף למסך הבית), ואז מפעילים מתוך האפליקציה 📲','On iPhone: Add to Home Screen first 📲'):T('הדפדפן הזה לא תומך בהתראות כשהאתר סגור 🙁','This browser does not support push 🙁'));return false;}
  if(!sb||!authUser){flash(T('צריך להיות מחוברים 🙂','Sign in first 🙂'));return false;}
  let p=Notification.permission;if(p==='default'){try{p=await Notification.requestPermission();}catch(e){}}
  if(p!=='granted'){flash(T('⚠️ הדפדפן חוסם התראות — מאשרים בהגדרות האתר (🔒 ליד הכתובת)','⚠️ Notifications are blocked in the browser'));return false;}
  try{
    if(!pushState.key){const {data,error}=await sb.functions.invoke('push',{method:'GET'});if(error||!data||!data.publicKey)throw new Error(isAdmin()?T('פונקציית השרת push לא עונה — צריך להעלות אותה (בק אופיס ← ⚙️ הגדרה ראשונית)','push function not deployed'):T('השירות עוד לא זמין','not available yet'));pushState.key=data.publicKey;}
    const r=await pushReg();let sub=await r.pushManager.getSubscription();
    if(!sub)sub=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(pushState.key)});
    const j=sub.toJSON();const {data:res,error}=await sb.rpc('push_subscribe',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_ua:navigator.userAgent.slice(0,200)});
    if(error||res!=='ok')throw new Error((error&&error.message)||res);
    prefs.notify=true;savePrefs();await pushRefresh();flash('📲 '+T('מעולה! מעכשיו יגיעו התראות גם כשהאתר סגור','Done! You will get notifications even when the site is closed'));return true;
  }catch(e){flash('⚠️ '+(e.message||e));return false;}
}
async function pushDisable(){const r=await pushReg();const sub=r&&await r.pushManager.getSubscription();
  if(sub){try{if(sb&&authUser)await sb.from('push_subs').delete().eq('endpoint',sub.endpoint);}catch(e){}try{await sub.unsubscribe();}catch(e){}}
  await pushRefresh();flash('🔕 '+T('ההתראות לטלפון/מחשב כובו','Push notifications off'));}
const PUSH_KINDS=[['chat','💬',T('תשובות מצוות האתר','Replies from the site team')],['deal','🏷️',T('מבצעים בחנויות שאני עוקב/ת','Deals at stores I follow')],['store','🏪',T('תשובות מחנויות','Replies from stores')],['info','🔔',T('תזכורות מהאתר','Reminders')]];
function pushCardHtml(){
  const on=!!pushState.sub;const pr=pushState.prefs||{max_per_day:6,quiet:false,shabbat:true,kinds:{}};const kinds=pr.kinds||{};
  return '<div class="mecard pushcard"><h4>📲 '+T('התראות לטלפון ולמחשב — גם כשהאתר סגור','Phone & computer notifications — even when closed')+'</h4>'+
    (on?'<p class="muted-note">✅ '+T('פעיל במכשיר הזה. לא נחפור — רק מה שחשוב, עד '+pr.max_per_day+' ביום, ולא בשבת.','Active on this device.')+'</p>'+
      '<div class="grid2"><label class="il">'+T('עד כמה התראות ביום','Max per day')+'<select id="ppMax">'+[2,4,6,10,20].map(n=>'<option'+(n===pr.max_per_day?' selected':'')+'>'+n+'</option>').join('')+'</select></label><div>'+
      '<label class="radio"><input type="checkbox" id="ppQuiet"'+(pr.quiet?' checked':'')+'> 🌙 '+T('לא בלילה (22:00–07:00)','Not at night')+'</label><label class="radio"><input type="checkbox" id="ppShabbat"'+(pr.shabbat?' checked':'')+'> 🕯️ '+T('לא בשבת','Not on Shabbat')+'</label></div></div>'+
      PUSH_KINDS.map(([k,ic,l])=>'<label class="radio"><input type="checkbox" data-pk2="'+k+'"'+(kinds[k]===false?'':' checked')+'> '+ic+' '+l+'</label>').join('')+
      '<div class="row2"><button class="btn sec" id="ppTest">🧪 '+T('שליחת התראת ניסיון','Send a test')+'</button><button class="btn sec" id="ppOff">🔕 '+T('כיבוי במכשיר הזה','Turn off here')+'</button></div>'
    :'<p class="muted-note">'+T('האתר יזכיר לך רק דברים חשובים: תשובה מהצוות, מבצע בחנות שאת/ה עוקב/ת — גם כשהאתר סגור. אפשר לבחור כמה ועל מה.','Get only important updates, even when the site is closed.')+'</p><button id="ppOn" style="width:100%">📲 '+T('להפעיל התראות במכשיר הזה','Enable on this device')+'</button>'+
      (/iPhone|iPad/.test(navigator.userAgent)&&!PUSH_SUPPORTED?'<p class="muted-note">🍎 '+T('באייפון: פותחים את האתר בספארי ← שיתוף ← "הוספה למסך הבית", נכנסים מהאייקון — ואז מפעילים כאן.','On iPhone: Add to Home Screen first.')+'</p>':''))+'</div>';
}
async function pushSavePrefs(){if(!sb||!authUser)return;const kinds={};document.querySelectorAll('[data-pk2]').forEach(c=>{if(!c.checked)kinds[c.dataset.pk2]=false;});
  const row={user_id:authUser.id,max_per_day:+($10('#ppMax')||{}).value||6,quiet:!!($10('#ppQuiet')||{}).checked,shabbat:!!($10('#ppShabbat')||{}).checked,kinds,updated_at:new Date().toISOString()};
  const {error}=await sb.from('push_prefs').upsert(row);if(error){flash('⚠️ '+error.message);return;}pushState.prefs=row;flash('💾 '+T('נשמר','Saved'));}
const _v10RenderNotif=renderNotif;
renderNotif=function(){_v10RenderNotif();const b=$10('#notifBody');if(!b)return;const sw=b.querySelector('#nSwitch');
  (sw||b.firstChild)&&(sw?sw.insertAdjacentHTML('afterend',pushCardHtml()):b.insertAdjacentHTML('afterbegin',pushCardHtml()));};
$10('#notifBody').addEventListener('click',async e=>{
  if(e.target.closest('#ppOn')){e.stopPropagation();if(await pushEnable())renderNotif();return;}
  if(e.target.closest('#ppOff')){e.stopPropagation();await pushDisable();renderNotif();return;}
  if(e.target.closest('#ppTest')){e.stopPropagation();const {data,error}=await sb.functions.invoke('push',{body:{test:true}});flash(error&&error.context&&error.context.status===429?'⏳ '+T('אפשר לשלוח התראת ניסיון פעם בדקה','One test per minute'):error?'⚠️ '+error.message:(data&&data.sent?'📲 '+T('נשלחה התראת ניסיון','Test sent'):'⚠️ '+T('לא נשלח — נסו לכבות ולהפעיל שוב','Not sent — try off/on')));return;}},true);
$10('#notifBody').addEventListener('change',e=>{if(e.target.closest('.pushcard')){e.stopPropagation();pushSavePrefs();}},true);

/* ---------- שפה לא נקייה: מדווח למנהל, והמנהל מחליט (אזהרה / השעיה / חסימה) ---------- */
let lastAbuseAt=0;
function reportAbuse(text,source){if(!sb||!authUser||isAdmin())return;if(Date.now()-lastAbuseAt<15000)return;lastAbuseAt=Date.now();
  let tx=String(text);if(tx.length>500){const w=profanityMatch(tx),i=w?tx.toLowerCase().indexOf(w):-1;tx=i>400?'…'+tx.slice(i-200,i+298):tx.slice(0,500);}
  sb.from('abuse_reports').insert({text:tx.slice(0,500),source:source||'bot',user_id:authUser.id}).then(()=>{},()=>{});}
/* קללות: הטיפול עבר ל-botReply עצמו (תחילת הקובץ) */
const _v10SendCurrent=sendCurrent;
sendCurrent=function(){const v=($10('#inText')||{}).value||'';if(v&&hasProfanity(v))reportAbuse(v,'list');return _v10SendCurrent();};
let myBan=null;
async function checkBan(){if(!sb||!authUser||isAdmin())return;try{const {data}=await sb.from('user_bans').select('*').eq('user_id',authUser.id).maybeSingle();myBan=data||null;}catch(e){return;}
  const active=myBan&&myBan.kind!=='warn'&&(!myBan.until||new Date(myBan.until)>new Date());
  const scr=$10('#banScreen');if(scr)scr.remove();
  if(active){document.body.insertAdjacentHTML('beforeend','<div id="banScreen" role="alertdialog" aria-modal="true"><div class="banbox"><div style="font-size:44px">'+(myBan.kind==='block'?'⛔':'⏸️')+'</div><h3>'+(myBan.kind==='block'?T('החשבון חסום','Your account is blocked'):T('החשבון מושעה','Your account is suspended')+(myBan.until?' '+T('עד','until')+' '+esc(fmtDate(new Date(myBan.until))):''))+'</h3>'+
      (myBan.reason?'<p>'+esc(myBan.reason)+'</p>':'')+'<p class="muted-note">'+T('האתר נועד לעזור לאנשים, ושומרים בו על לשון נקייה וכבוד. אפשר לכתוב לצוות האתר:','You can write to the site team:')+'</p>'+
      '<textarea id="banMsg" maxlength="2000" placeholder="'+T('הודעה לצוות...','Message to the team...')+'"></textarea><div class="row2"><button id="banSend">📨 '+T('שליחה לצוות','Send')+'</button><button class="btn sec" id="banOut">🚪 '+T('יציאה','Sign out')+'</button></div></div></div>');
    $10('#banSend').onclick=async()=>{const t=$10('#banMsg').value.trim();if(!t)return;const {error}=await sb.from('support_messages').insert({user_id:authUser.id,body:t.slice(0,2000),topic:'ערעור'});flash(error?'⚠️ '+error.message:'📨 '+T('נשלח — נחזור אליך','Sent'));if(!error)$10('#banMsg').value='';};
    $10('#banOut').onclick=()=>{$10('#banScreen').remove();doLogout();};return;}
  if(myBan&&myBan.kind==='warn'&&!myBan.seen){openSheet('⚠️ '+T('הודעה מצוות האתר','A message from the site team'),'<p>'+esc(myBan.reason||T('קיבלנו דיווח על שפה לא נקייה. האתר נועד לעזור לאנשים — נא לשמור על לשון נקייה ומכבדת. בפעם הבאה החשבון עלול להיות מושעה.','Please keep it clean.'))+'</p><button id="warnOk" style="width:100%">'+T('הבנתי 🙏','Understood 🙏')+'</button>').onclick=e=>{if(e.target.closest('#warnOk')){sb.rpc('ban_seen').then(()=>{},()=>{});myBan.seen=true;closeSheet();}};}
}
setInterval(()=>{if(authUser&&document.visibilityState==='visible')checkBan();},10*60000);

/* ---------- המוצרים שלי: שם, חברה, ברקוד, קטגוריה ותמונה — נשמר רק אצלי ---------- */
const MYP_KEY='yam_myprod_v1';let myProd={};
try{myProd=JSON.parse(localStorage.getItem(MYP_KEY))||{};}catch(e){myProd={};}
/* במכשיר נשמרות רק תמונות קטנות — כדי שלא ימלאו את המקום של הרשימות, העיר והשיחות עם יאמי (התמונות המלאות בשרת) */
function myProdSaveLocal(){const lite={};let room=600000;Object.keys(myProd).forEach(k=>{const v=Object.assign({},myProd[k]);if(v.image){if(v.image.length<=room)room-=v.image.length;else delete v.image;}lite[k]=v;});
  try{localStorage.setItem(MYP_KEY,JSON.stringify(lite));}catch(e){}}
async function loadMyProducts(){if(!sb||!authUser)return;try{const {data,error}=await sb.from('my_products').select('*').eq('user_id',authUser.id).limit(2000);if(error)return;
  const m={};(data||[]).forEach(r=>{const loc=myProd[r.pkey];if(loc&&loc._t&&loc._t>(Date.parse(r.updated_at)||0))return;m[r.pkey]={name:r.name,brand:r.brand,barcode:r.barcode,emoji:r.emoji,category:r.category,image:r.image};});myProd=Object.assign({},myProd,m);myProdSaveLocal();if(typeof tab!=='undefined'&&tab==='home')renderHome();}catch(e){}}
async function myProdSet(key,v){const cur=Object.assign({},myProd[key]||{},v,{_t:Date.now()});myProd[key]=cur;myProdSaveLocal();
  if(sb&&authUser){const {error}=await sb.from('my_products').upsert({user_id:authUser.id,pkey:key.slice(0,80),name:(cur.name||'').slice(0,80),brand:(cur.brand||'').slice(0,40),barcode:String(cur.barcode||'').replace(/\D/g,'').slice(0,20),emoji:(cur.emoji||'').slice(0,16),category:(cur.category||'').slice(0,30),image:cur.image||'',updated_at:new Date().toISOString()});if(error)flash('⚠️ '+error.message);}}
const pName=n=>(myProd[n]&&myProd[n].name)||n;
const pEmoji=n=>(myProd[n]&&myProd[n].emoji)||emojiOf(n);
const pImg=n=>(myProd[n]&&myProd[n].image)||'';
function shrinkData(dataUrl,max,q){return new Promise((res,rej)=>{const img=new Image();img.onerror=rej;img.onload=()=>{const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',q||0.8));};img.src=dataUrl;});}
async function fileToImage(file,max,limit){let d=await shrinkImage(file,max);let m=max,q=0.8;while(d.length>limit&&m>160){m=Math.round(m*0.75);q=Math.max(0.55,q-0.08);d=await shrinkData(d,m,q);}return d;}
function openProductEdit(n){
  const p=myProd[n]||{};const s=stockOf(n)||{};let img=p.image||'';
  const b=openSheet('✏️ '+T('עריכת מוצר — נשמר רק אצלך','Edit product — saved only for you'),
    '<div class="pedtop"><div class="pimg big" id="peImg">'+(safeImg(img)?'<img src="'+esc(safeImg(img))+'" alt="">':'<span>'+esc(pEmoji(n))+'</span>')+'</div><div class="grow"><label class="btn sec" style="display:block;text-align:center;cursor:pointer">📷 '+T('תמונה של המוצר','Product photo')+'<input type="file" id="peFile" accept="image/*" hidden></label>'+(img?'<button class="mini" id="peImgX" style="margin-top:6px">🗑️ '+T('הסרת התמונה','Remove photo')+'</button>':'')+'</div></div>'+
    '<label class="il" for="peName">'+T('שם (כמו שאת/ה קורא/ת לו)','Name')+'</label><input id="peName" maxlength="80" value="'+esc(pName(n))+'">'+
    '<div class="grid2"><div><label class="il" for="peBrand">'+T('חברה','Brand')+'</label><input id="peBrand" maxlength="40" value="'+esc(p.brand||s.brand||'')+'"></div><div><label class="il" for="peBc">'+T('ברקוד','Barcode')+'</label><input id="peBc" maxlength="20" inputmode="numeric" dir="ltr" value="'+esc(p.barcode||s.barcode||'')+'"></div>'+
    '<div><label class="il">'+T('אייקון','Icon')+'</label>'+icField('id="peEmoji"',p.emoji||'',true,emojiOf(n))+'</div><div><label class="il" for="peCat">'+T('קטגוריה','Category')+'</label><select id="peCat">'+CATS.map(c=>'<option'+(c===(p.category||resolveCat(n))?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></div>'+
    '<div><label class="il" for="peQty">'+T('כמה יש בבית','How many at home')+'</label><input id="peQty" type="number" min="0" step="0.5" value="'+stockQty(n)+'"></div></div>'+
    '<button id="peSave" style="width:100%;margin-top:10px">💾 '+T('שמירה','Save')+'</button><p class="muted-note">🔒 '+T('השינויים והתמונה נשמרים רק אצלך — לא משנים את המוצר לאחרים.','Changes are private to you.')+'</p>');
  b.oninput=null;
  b.onchange=async e=>{if(e.target.id!=='peFile')return;const f=e.target.files[0];if(!f)return;try{img=await fileToImage(f,420,150000);$10('#peImg').innerHTML='<img src="'+esc(safeImg(img))+'" alt="">';}catch(err){flash(T('⚠️ לא הצלחתי לקרוא את התמונה','⚠️ Could not read the image'));}};
  b.onclick=async e=>{
    if(e.target.closest('#peImgX')){img='';$10('#peImg').innerHTML='<span>'+esc(pEmoji(n))+'</span>';e.target.closest('#peImgX').remove();return;}
    if(e.target.closest('#peSave')){const name=$10('#peName').value.trim(),brand=$10('#peBrand').value.trim(),em=$10('#peEmoji').value.trim();
      if([name,brand,em].some(hasProfanity)){flash('🙏');return;}const bc=$10('#peBc').value.replace(/\D/g,'');
      await myProdSet(n,{name:name&&name!==n?name:'',brand,barcode:bc,emoji:em,category:$10('#peCat').value,image:img});
      const q=parseFloat($10('#peQty').value);if(!isNaN(q)&&q!==stockQty(n)){stockSet(n,q,{brand,barcode:bc});save();}
      closeSheet();renderHome();flash('💾 '+T('נשמר אצלך','Saved for you'));}
  };
}

/* ---------- הבית שלי — כמו חנות אונליין: כרטיסים עם תמונה, כמות ועריכה ---------- */
renderHome=function(){
  const p=document.querySelector('#paneHome');if(!p)return;
  const q=norm(state.homeQ||'');const missing=BASE.filter(n=>!pantryHas(n));const S=stockSummary();
  let html='<div class="homebar"><div class="kpis"><div class="kpi"><b>'+S.products+'</b><span>'+T('מוצרים בבית','products')+'</span></div><div class="kpi"><b>'+S.units+'</b><span>'+T('יחידות','units')+'</span></div><div class="kpi"><b>'+missing.length+'</b><span>'+T('חסרים מהבסיס','basics missing')+'</span></div></div>'+
    '<div class="homebtns"><button class="hbtn2" id="btnMissing">🧺 '+T('מה חסר לי בבית?','What am I missing?')+' ('+missing.length+')</button><button class="hbtn2" data-h10="inv">📦 '+T('מלאי בכמויות','Stock & quantities')+'</button><button class="hbtn2" data-h10="up">📤 '+T('העלאת מוצרים / תמונות','Upload products / photos')+'</button><button class="hbtn2" data-h10="scan">📷 '+T('סריקה','Scan')+'</button></div></div>';
  if(state.showMissing&&missing.length)html+='<div class="grp"><h3>'+T('חסר לך בבית לפי מצרכי בסיס','Missing basics')+'</h3>'+missing.map(n=>'<div class="mrow"><span>'+emojiOf(n)+'</span><span>'+esc(n)+'</span><button data-missing="'+esc(n)+'">➕ '+T('לרשימה','To list')+'</button></div>').join('')+'<div style="text-align:center;margin-top:8px"><button class="chip" data-addall="1">'+T('הוסף הכל לרשימה','Add all')+'</button></div></div>';
  html+='<div class="pantry-add"><input id="pantryAddInput" placeholder="'+T('הוספת מוצר משלך לבית...','Add your own product...')+'" aria-label="'+T('הוספת מוצר','Add product')+'"><select id="pantryAddCat" aria-label="'+T('קטגוריה','Category')+'">'+CATS.map(c=>'<option value="'+esc(c)+'">'+CATE[c]+' '+esc(c)+'</option>').join('')+'</select><button id="pantryAddBtn">➕ '+T('הוסף','Add')+'</button></div>';
  if(state.customPantry.length){const hid=!!state.hideCustom;
    html+='<div class="grp"><h3 class="grph">🧺 '+T('הפריטים שהוספתי בעצמי','Items I added')+' ('+state.customPantry.length+')<button class="mini" data-hidecustom="1">'+(hid?'👁️ '+T('הצגה','Show'):'🙈 '+T('הסתרה','Hide'))+'</button></h3>'+
      (hid?'':'<div class="hgrid">'+state.customPantry.map(n=>pcardHtml(n,true)).join('')+'</div>')+'</div>';}
  html+='<input id="homeSearch" placeholder="🔍 '+T('חיפוש במקרר...','Search the fridge...')+'" value="'+esc(state.homeQ||'')+'">';
  html+='<div id="homeCats">'+homeCatsHtml(q)+'</div>';
  p.innerHTML=html;doodleBg(p);
};
function pcardHtml(n,custom){const have=pantryHas(n);const img=pImg(n);const p=myProd[n]||{};const s=stockOf(n)||{};const brand=p.brand||s.brand||'';
  return '<div class="pcard'+(have?' have':'')+'" data-pan="'+esc(n)+'" title="'+T('לחיצה: יש / אין','Tap: have / not')+'"><button class="ptog18" data-pan="'+esc(n)+'" aria-pressed="'+have+'" aria-label="'+esc(pName(n))+' — '+(have?T('יש בבית','have it'):T('אין בבית','not at home'))+'"></button><button class="pedit" data-pedit="'+esc(n)+'" aria-label="'+T('עריכת','Edit')+' '+esc(pName(n))+'">✏️</button>'+(custom?'<button class="prm" data-rm="'+esc(n)+'" aria-label="'+T('הסרה','Remove')+'">✕</button>':'')+
    '<div class="pimg">'+(safeImg(img)?'<img src="'+esc(safeImg(img))+'" alt="" loading="lazy">':'<span>'+esc(pEmoji(n))+'</span>')+'</div><b>'+esc(pName(n))+'</b>'+(brand?'<small>'+esc(brand)+'</small>':'')+'<span class="pq">'+(have?'✓ '+T('יש','have')+' '+stockQty(n):T('אין','none'))+'</span></div>';}
homeCatsHtml=function(q){
  return CATS.map(c=>{const its=Object.keys(P).filter(n=>((myProd[n]&&myProd[n].category)||P[n].c)===c&&(!q||n.includes(q)||norm(pName(n)).includes(q)));if(!its.length)return '';
    its.sort((a,b)=>(pantryHas(b)?1:0)-(pantryHas(a)?1:0)||(pImg(b)?1:0)-(pImg(a)?1:0));
    return '<div class="grp"><h3>'+CATE[c]+' '+esc(c)+' <small>('+its.filter(pantryHas).length+'/'+its.length+')</small></h3><div class="hgrid">'+its.map(n=>pcardHtml(n,false)).join('')+'</div></div>';}).join('')||'<div class="empty">'+T('לא נמצא 🤷','Not found 🤷')+'</div>';
};
document.querySelector('#paneHome').addEventListener('click',e=>{
  const pe=e.target.closest('[data-pedit]');if(pe){e.stopPropagation();openProductEdit(pe.dataset.pedit);return;}
  const hc=e.target.closest('[data-hidecustom]');if(hc){e.stopPropagation();state.hideCustom=!state.hideCustom;save(true);renderHome();return;}
  const h=e.target.closest('[data-h10]');if(h){e.stopPropagation();const a=h.dataset.h10;if(a==='inv')openInventory();if(a==='up')openProductUpload();if(a==='scan')$10('#invScan')?$10('#invScan').click():(openInventory(),setTimeout(()=>$10('#invScan')&&$10('#invScan').click(),200));return;}},true);
document.querySelector('#paneHome').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('pcard')){e.preventDefault();e.target.click();}});

/* ---------- העלאת מוצרים: קובץ (CSV / אקסל) או תמונות של מוצרים עם ברקוד ---------- */
let pupRows=[];
function openProductUpload(){
  pupRows=[];
  const b=openSheet('📤 '+T('העלאת המוצרים שלי','Upload my products'),
    '<p class="muted-note">'+T('אפשר להעלות: <b>תמונות</b> של מוצרים (רואים את האריזה או הברקוד — יאמי מזהה את השם, החברה והברקוד, והתמונה נשמרת למוצר), או <b>קובץ</b> CSV / אקסל עם עמודות: מוצר, חברה, ברקוד, כמות. הכל נכנס ל"הבית שלי" רק אחרי אישור.','Upload product photos or a CSV/Excel file. Nothing is saved before you confirm.')+'</p>'+
    '<div class="row2"><label class="btn" style="text-align:center;cursor:pointer">📷 '+T('תמונות מוצרים','Product photos')+'<input type="file" id="pupImgs" accept="image/*" multiple hidden></label><label class="btn sec" style="text-align:center;cursor:pointer">📄 '+T('קובץ CSV / אקסל','CSV / Excel file')+'<input type="file" id="pupFile" accept=".csv,.txt,.xlsx,.xls,.ods" hidden></label></div>'+
    '<div id="pupStat" class="muted-note"></div><div id="pupList"></div>');
  b.oninput=null;
  const draw=()=>{$10('#pupList').innerHTML=pupRows.length?'<div class="urlist">'+pupRows.map((r,i)=>'<div class="urcard" data-pr="'+i+'"><div class="urtop"><input type="checkbox" data-f="on" checked aria-label="'+T('לכלול','Include')+'">'+(safeImg(r.image)?'<img class="pupimg" src="'+esc(safeImg(r.image))+'" alt="">':'')+'<input data-f="name" value="'+esc(r.name||'')+'" maxlength="80" aria-label="'+T('מוצר','Product')+'"></div><div class="urgrid"><label>'+T('חברה','Brand')+'<input data-f="brand" value="'+esc(r.brand||'')+'" maxlength="40"></label><label>'+T('ברקוד','Barcode')+'<input data-f="barcode" value="'+esc(r.barcode||'')+'" inputmode="numeric" dir="ltr"></label><label>'+T('כמות','Qty')+'<input data-f="qty" value="'+esc(String(r.qty||1))+'" inputmode="decimal"></label><label>'+T('קטגוריה','Category')+'<select data-f="cat">'+CATS.map(c=>'<option'+(c===(CATS.includes(r.category)?r.category:resolveCat(r.name||''))?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label></div></div>').join('')+'</div><button id="pupGo" style="width:100%">✅ '+T('אישור והוספה לבית שלי','Confirm and add to my home')+' ('+pupRows.length+')</button>':'';};
  b.onchange=async e=>{
    if(e.target.id==='pupFile'){const f=e.target.files[0];if(!f)return;$10('#pupStat').textContent=T('קורא...','Reading...');
      try{let table;if(/\.(xlsx|xls|ods)$/i.test(f.name)){const X=await loadXlsx();const wb=X.read(await f.arrayBuffer(),{type:'array'});table=X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false});}
        else{const buf=await f.arrayBuffer();let t=new TextDecoder('utf-8').decode(buf);if(t.includes('�'))try{t=new TextDecoder('windows-1255').decode(buf);}catch(err){}table=parseCsv(t.replace(/^﻿/,''));}
        const COLS={name:['מוצר','שם מוצר','שם המוצר','שם','product','name','item'],brand:['חברה','מותג','יצרן','brand','company'],barcode:['ברקוד','barcode','ean','מקט','מק"ט'],qty:['כמות','qty','quantity','יחידות'],category:['קטגוריה','category']};
        const mh=h=>{const k=String(h||'').trim().toLowerCase();for(const c in COLS)if(COLS[c].includes(k))return c;return null;};
        let hi=table.findIndex(r=>r.some(c=>mh(c)==='name'));const map={};if(hi<0){hi=-1;Object.assign(map,{0:'name',1:'brand',2:'barcode',3:'qty'});}else table[hi].forEach((c,i)=>{const k=mh(c);if(k)map[i]=k;});
        table.slice(hi+1).forEach(r=>{const o={};Object.entries(map).forEach(([i,k])=>o[k]=String(r[i]==null?'':r[i]).trim());if(o.name&&!hasProfanity(o.name))pupRows.push({name:o.name.slice(0,80),brand:(o.brand||'').slice(0,40),barcode:(o.barcode||'').replace(/\D/g,'').slice(0,20),qty:parseFloat(o.qty)||1,category:o.category||''});});
        pupRows=pupRows.slice(0,500);$10('#pupStat').textContent=T('נמצאו '+pupRows.length+' מוצרים — בודקים ומאשרים למטה','Found '+pupRows.length);draw();
      }catch(err){$10('#pupStat').textContent='⚠️ '+(err.message==='xlsx'?T('לא הצלחתי לקרוא אקסל — שמרו כ-CSV','Save as CSV'):err.message);}e.target.value='';return;}
    if(e.target.id==='pupImgs'){const fs=Array.from(e.target.files||[]).slice(0,12);e.target.value='';if(!fs.length)return;
      for(let i=0;i<fs.length;i++){$10('#pupStat').textContent='🔍 '+T('מזהה מוצר '+(i+1)+' מתוך '+fs.length+'...','Reading '+(i+1)+'/'+fs.length);
        let thumb='',big='';try{thumb=await fileToImage(fs[i],420,150000);big=await shrinkImage(fs[i],1280);}catch(err){continue;}
        let item={name:'',brand:'',barcode:'',qty:1,category:'',image:thumb};
        if(sb&&authUser){try{let {data,error}=await sb.functions.invoke('ai-chat',{body:{vision:'product',images:[big]}});if(error&&error.context&&typeof error.context.json==='function'){try{data=await error.context.json();}catch(x){}}
          const it=data&&data.product&&data.product.items&&data.product.items[0];if(it)item=Object.assign(item,{name:String(it.name||'').slice(0,80),brand:String(it.brand||'').slice(0,40),barcode:String(it.barcode||'').replace(/\D/g,'').slice(0,20),category:String(it.category||'')});}catch(err){}}
        if(!item.name&&item.barcode){const nm=await nameForBarcode(item.barcode);if(nm)item.name=nm;}
        pupRows.push(item);draw();}
      $10('#pupStat').textContent=T('בדקו את השמות (מה שלא זוהה — כותבים) ומאשרים 👇','Check the names and confirm 👇');return;}
  };
  b.onclick=async e=>{if(!e.target.closest('#pupGo'))return;
    const rows=[...b.querySelectorAll('[data-pr]')].map(el=>{const g=f=>{const x=el.querySelector('[data-f='+f+']');return x?(x.type==='checkbox'?x.checked:x.value.trim()):'';};return Object.assign({},pupRows[+el.dataset.pr],{on:g('on'),name:g('name'),brand:g('brand'),barcode:g('barcode').replace(/\D/g,''),qty:parseFloat(g('qty'))||1,category:g('cat')});}).filter(r=>r.on&&r.name);
    if(!rows.length){flash(T('אין מה להוסיף 🙂','Nothing to add 🙂'));return;}if(rows.some(r=>hasProfanity(r.name+' '+r.brand))){flash('🙏');return;}
    $10('#pupGo').disabled=true;
    for(const r of rows){const key=NORMP[norm(r.name)]||fuzzyResolve(r.name)||r.name;if(!P[key]){P[key]={e:CATE[r.category]||'🛒',c:CATS.includes(r.category)?r.category:resolveCat(key)};NORMP[norm(key)]=key;if(!state.customPantry.includes(key))state.customPantry.push(key);}
      stockAdd(key,r.qty,{brand:r.brand,barcode:r.barcode});await myProdSet(key,{name:r.name!==key?r.name:'',brand:r.brand,barcode:r.barcode,category:CATS.includes(r.category)?r.category:'',image:r.image||(myProd[key]||{}).image||''});}
    save();closeSheet();renderHome();flash('🏠 '+T('נוספו '+rows.length+' מוצרים לבית שלך','Added '+rows.length+' products'));};
}

/* ---------- דיווח על מבצע בכל חנות (עובר לאישור מנהל) ---------- */
function openDealReport(chain){
  const b=openSheet('📢 '+T('דיווח על מבצע','Report a deal'),
    '<p class="muted-note">💚 '+T('ראית מבצע בכל חנות שהיא? שתפו את כולם! הדיווח מתפרסם אחרי בדיקה קצרה של המנהל. נא לדווח רק מבצעים אמיתיים.','Saw a deal anywhere? Share it. Published after a quick check.')+'</p>'+
    '<label class="il" for="drChain">'+T('חנות / רשת','Store')+'</label><input id="drChain" list="drChains" maxlength="40" value="'+esc(chain||'')+'"><datalist id="drChains">'+allChainNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>'+
    '<label class="il" for="drBranch">'+T('סניף / עיר','Branch / city')+'</label><input id="drBranch" maxlength="120" value="'+esc(state.city||'')+'">'+
    '<label class="il" for="drTitle">'+T('המבצע (למשל: חלב תנובה 1+1)','The deal')+'</label><input id="drTitle" maxlength="120">'+
    '<label class="il" for="drBody">'+T('פרטים (לא חובה)','Details (optional)')+'</label><textarea id="drBody" maxlength="1000" style="min-height:60px"></textarea>'+
    '<div class="grid2"><div><label class="il" for="drUntil">'+T('בתוקף עד','Valid until')+'</label><input id="drUntil" type="date"></div><div><label class="il">'+T('תמונה (לא חובה)','Photo (optional)')+'</label><label class="btn sec" style="display:block;text-align:center;cursor:pointer">📷 '+T('צירוף','Attach')+'<input type="file" id="drImg" accept="image/*" hidden></label></div></div><div id="drPrev"></div>'+
    '<button id="drSend" style="width:100%;margin-top:10px">📢 '+T('שליחה','Send')+'</button>');
  let img='';b.oninput=null;
  b.onchange=async e=>{if(e.target.id!=='drImg')return;const f=e.target.files[0];if(!f)return;try{img=await fileToImage(f,900,350000);$10('#drPrev').innerHTML='<img src="'+esc(safeImg(img))+'" alt="" style="max-width:100%;border-radius:12px;margin-top:8px">';}catch(err){flash('⚠️');}};
  b.onclick=async e=>{if(!e.target.closest('#drSend'))return;if(!sb||!authUser){flash(T('צריך להיות מחוברים 🙂','Sign in first 🙂'));return;}
    const ch=$10('#drChain').value.trim(),title=$10('#drTitle').value.trim(),body=$10('#drBody').value.trim(),br=$10('#drBranch').value.trim();
    if(!ch||!title){flash(T('צריך חנות ומבצע','Store and deal needed'));return;}if([ch,title,body,br].some(hasProfanity)){reportAbuse(title+' '+body,'deal');flash('🙏');return;}
    const u=$10('#drUntil').value;const {error}=await sb.from('store_posts').insert({chain:ch.slice(0,40),branch:br.slice(0,120),kind:'deal',title:title.slice(0,120),body:body.slice(0,1000),image:img,ends_at:u?new Date(u+'T23:59:00').toISOString():null,created_by:authUser.id});
    if(error){flash('⚠️ '+error.message);return;}closeSheet();flash('📢 '+T('תודה! המבצע נשלח לאישור ויפורסם בקרוב 💚','Thanks! Sent for approval 💚'));};
}

/* ---------- צ'אט עם האתר — עסקי ומסודר ---------- */
const SUP_TOPICS=[['שאלה כללית','❓'],['תקלה באתר','🛠️'],['מחירים ומבצעים','💰'],['הצעה לשיפור','💡'],['עסקים ושיתופי פעולה','🏪'],['חשבון וכניסה','🔐'],['אחר','💬']];
let supStatus=null,supTopic='';
openChat=async function(){
  $10('#hMenu').classList.remove('open');
  const b=openSheet('💬 '+T('שירות לקוחות','Customer service'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');b.oninput=null;b.onchange=null;
  if(!sb||!authUser){b.innerHTML='<p class="muted-note">'+T('צריך להיות מחוברים כדי להתכתב 🙂','Sign in to chat 🙂')+'</p>';return;}
  const r=await loadChat();if(r===null){b.innerHTML='<p class="muted-note">'+T('הצ\'אט עוד לא זמין 🙏','Chat is not available yet 🙏')+'</p>';return;}
  try{const {data}=await sb.from('support_status').select('*').eq('user_id',authUser.id).maybeSingle();supStatus=data;}catch(e){}
  const draw=()=>{const open=!supStatus||supStatus.status==='open';const newTicket=!chatMsgs.length||(supStatus&&supStatus.status==='closed');
    let lastDay='';
    b.innerHTML='<div class="suphead"><div class="supav">🛒</div><div class="grow"><b>'+T('צוות רשימת קניות','Shopping List team')+'</b><small>🟢 '+T('עונים בדרך כלל תוך כמה שעות · א׳–ה׳ 9:00–21:00','Usually replies within a few hours')+'</small></div>'+(chatMsgs.length?'<span class="supst '+(open?'open':'closed')+'">'+(open?T('פנייה פתוחה','Open'):T('טופל ✓','Resolved ✓'))+'</span>':'')+'</div>'+
      (supStatus&&supStatus.topic&&open?'<div class="muted-note" style="margin:6px 0">📌 '+T('נושא: ','Topic: ')+esc(supStatus.topic)+'</div>':'')+
      '<div class="chatbox" id="chatBox">'+(chatMsgs.length?chatMsgs.map(m=>{const d=new Date(m.created_at);const dk=dayKey(d);const sep=dk!==lastDay?'<div class="day"><span>'+esc(fmtDate(d))+'</span></div>':'';lastDay=dk;
        return sep+'<div class="row '+(m.from_staff?'bot':'me')+'"><div class="bub">'+(m.from_staff?'<b class="supwho">🛒 '+esc(m.author_name||T('צוות האתר','Site team'))+'</b><br>':'')+(m.topic&&!m.from_staff?'<small class="suptopic">'+esc(m.topic)+'</small><br>':'')+esc(m.body).replace(/\n/g,'<br>')+'<div class="t">'+fmtTime(d)+(m.from_staff?'':' '+(m.read_by_staff&&chatShowRead()?'<span class="ticks seen" title="'+T('נקרא','Read')+'">✓✓</span>':'<span class="ticks" title="'+T('נשלח','Sent')+'">✓</span>'))+'</div></div></div>';}).join('')
        :'<div class="empty">👋 '+T('שלום! איך אפשר לעזור? בחרו נושא וכתבו לנו — נחזור אליכם בהקדם.','Hi! How can we help? Pick a topic and write to us.')+'</div>')+'</div>'+
      (newTicket?'<div class="suptopics" role="group" aria-label="'+T('נושא הפנייה','Topic')+'">'+SUP_TOPICS.map(([t,ic])=>'<button class="chip'+(supTopic===t?' on':'')+'" data-stopic="'+esc(t)+'">'+ic+' '+esc(t)+'</button>').join('')+'</div>':'')+
      '<div class="row2"><textarea id="chatText" maxlength="4000" placeholder="'+T('כתבו הודעה...','Write a message...')+'" style="min-height:52px"></textarea><button id="chatSend" style="flex:0 0 auto" aria-label="'+T('שליחה','Send')+'">➤</button></div>'+
      '<div class="row2" style="margin-top:6px"><button class="btn sec" id="chatBiz">🏪 '+T('יש לי עסק — בקשה להצטרף','I own a business')+'</button>'+(chatMsgs.length&&open?'<button class="btn sec" id="chatDone">✓ '+T('הבעיה נפתרה, תודה','Resolved, thanks')+'</button>':'')+'</div>'+
      (isAdmin()?'<p class="muted-note">🛠️ '+T('את הפניות של כל המשתמשים רואים ועונים בבק אופיס ← 💬 צ\'אט עם משתמשים.','Admin: all chats are in the back office.')+'</p>':'');
    const box=$10('#chatBox');box.scrollTop=box.scrollHeight;};
  draw();
  const unread=chatMsgs.filter(m=>m.from_staff&&!m.read_by_user).map(m=>m.id);if(unread.length)sb.from('support_messages').update({read_by_user:true}).in('id',unread).then(()=>{chatMsgs.forEach(m=>{if(unread.includes(m.id))m.read_by_user=true;});const bd=$10('#chatBadge');if(bd)bd.hidden=true;});
  b.onclick=async e=>{
    const tp=e.target.closest('[data-stopic]');if(tp){supTopic=tp.dataset.stopic;b.querySelectorAll('[data-stopic]').forEach(x=>x.classList.toggle('on',x===tp));$10('#chatText').focus();return;}
    if(e.target.closest('#chatBiz')){openBizJoin();return;}
    if(e.target.closest('#chatDone')){const {error}=await sb.from('support_messages').insert({user_id:authUser.id,body:'✓ '+T('הבעיה נפתרה, תודה!','Resolved, thanks!')});if(!error){supStatus={status:'closed'};flash('🙏 '+T('תודה! שמחנו לעזור','Thanks!'));await loadChat();draw();}return;}
    if(e.target.closest('#chatSend')){const t=$10('#chatText').value.trim();if(!t)return;if(hasProfanity(t)){reportAbuse(t,'chat');flash('🙏 '+T('נא לכתוב בלשון נקייה','Please keep it clean'));return;}
      const newTicket=!chatMsgs.length||(supStatus&&supStatus.status==='closed');if(newTicket&&!supTopic)supTopic='שאלה כללית';
      const {error}=await sb.from('support_messages').insert({user_id:authUser.id,body:t.slice(0,4000),topic:newTicket?supTopic:''});if(error){flash('⚠️ '+error.message);return;}
      supStatus={status:'open',topic:newTicket?supTopic:(supStatus&&supStatus.topic)||''};supTopic='';await loadChat();draw();flash('💬 '+T('נשלח — נענה בהקדם','Sent'));}
  };
  b.onkeydown=e=>{if(e.target.id==='chatText'&&e.key==='Enter'&&!e.shiftKey&&!TOUCH_KB&&!e.isComposing){e.preventDefault();$10('#chatSend').click();}};
};

/* ---------- זמני היום: הבהרה ---------- */
const ZMAN_NOTE=T('⚠️ הזמנים מחושבים אוטומטית ונועדו לעזור בלבד — אין להסתמך עליהם להלכה, ובמיוחד לא בדברים שהם מדאורייתא. יש לבדוק בלוח מוסמך או לשאול רב.','⚠️ Times are computed automatically and are for convenience only — do not rely on them for halachic purposes.');
const _v10OpenZmanim=openZmanim;openZmanim=function(){const r=_v10OpenZmanim.apply(this,arguments);const b=$10('#v8SheetBody');if(b&&!b.querySelector('.zmannote'))b.insertAdjacentHTML('afterbegin','<p class="zmannote">'+ZMAN_NOTE+'</p>');return r;};
const _v10ZmanimText=zmanimText;zmanimText=function(){return _v10ZmanimText.apply(this,arguments)+'\n\n'+ZMAN_NOTE;};

/* ---------- דיווחי מחיר: מה שעבר שבוע — יורד לסוף הרשימה כ"ישן" ---------- */
const STALE_MS=7*86400000;const isStale=r=>Date.now()-new Date(r.updated_at||r.created_at).getTime()>STALE_MS;
const STALE_TAG='<span class="stalebadge" title="'+T('הדיווח בן יותר משבוע — ייתכן שהמחיר כבר השתנה','Older than a week')+'">🕰️ '+T('ישן — ייתכן שלא רלוונטי','old — may be outdated')+'</span>';
const _v10RenderPriceResults=renderPriceResults;
renderPriceResults=function(){_v10RenderPriceResults();const el=$10('#priceResults');if(!el)return;
  el.querySelectorAll('.grp').forEach(g=>{const rows=[...g.querySelectorAll(':scope > .price-row[data-pid]')];if(!rows.length)return;
    const rec=id=>priceRows.find(r=>String(r.id)===id);const stale=rows.filter(x=>{const r=rec(x.dataset.pid);return r&&isStale(r);});
    stale.forEach(x=>{x.classList.add('stale');const m=x.querySelector('.price-row-main');if(m&&!m.querySelector('.stalebadge'))m.insertAdjacentHTML('beforeend',STALE_TAG);g.insertBefore(x,g.querySelector(':scope > .phist23'));});
    const fresh=rows.filter(x=>!stale.includes(x)).map(x=>rec(x.dataset.pid)).filter(r=>r&&r.status==='approved');const h=g.querySelector('h3');
    if(h&&stale.length&&fresh.length){const best=fresh.slice().sort((a,b)=>a.price-b.price)[0];const name=h.textContent.split(' — ')[0];h.textContent=name+' — '+T('הכי זול (עדכני)','cheapest (recent)')+': '+fmtPrice(best.price,best.currency)+' '+T('ב','at ')+best.chain;}});};
const _v10LatestHtml=latestHtml;
latestHtml=function(){const all=latestRows;const fresh=all.filter(r=>!isStale(r)),old=all.filter(isStale);
  try{latestRows=fresh;let h=fresh.length?_v10LatestHtml():'';latestRows=old;
    if(old.length)h+='<details class="grp oldrep"><summary>🕰️ '+T('דיווחים ישנים (יותר משבוע — ייתכן שלא רלוונטיים)','Older reports (over a week)')+' ('+old.length+')</summary>'+_v10LatestHtml()+'</details>';
    return h||_v10LatestHtml();}finally{latestRows=all;}};

/* ---------- v23: דיווחי מחיר — רואים גם את כל המחירים הקודמים, ומחולק לקטגוריות ---------- */
/* קטגוריה של מוצר בדיווח: מהמוצרים שלי / מאגר המוצרים / ניחוש לפי השם — ותמיד אחת מהקטגוריות שמוצגות (אחרת "אחר") */
function catOfPrice23(n){n=String(n||'');const k=NORMP[norm(n)]||n;let mp=null;try{mp=myProd&&myProd[k];}catch(e){}const c=(mp&&mp.category)||(P[k]&&P[k].c)||resolveCat(n);return CATS.includes(c)?c:'אחר';}
const HIST23_PAGE=30;const hist23={};
function histBox23(name){const n=priceRows.filter(r=>r.product===name).length;
  return '<details class="phist23" data-ph="'+esc(name)+'"><summary>📜 '+T('כל המחירים הקודמים','All previous prices')+' <small>('+n+(n>=HIST23_PAGE?'+':'')+')</small></summary><div class="phbody23"><div class="empty" style="padding:8px">'+T('טוען...','Loading...')+'</div></div></details>';}
function histRow23(r){const st=r.status==='pending'?' · ⏳ '+T('ממתין לאישור','pending'):r.status==='rejected'?' · 🚫 '+T('נדחה','rejected'):'';
  return '<div class="phrow23'+(isStale(r)?' stale':'')+'"><span class="phd">'+esc(dt(r.created_at))+'</span><span>'+(chainKind(r.chain)==='online'?'🌐 ':'')+esc(r.chain)+(r.branch?' — '+esc(r.branch):'')+'</span>'+
    (r.is_deal?'<span class="dealbadge">🔥 '+esc(r.deal_text||T('מבצע','Deal'))+'</span>':'')+(r.verified?'<span class="verified">✔</span>':'')+
    '<span class="muted-note" style="margin:0">'+crSlot('prices',r.id,{p:T('דווח ע״י ','by ')})+(r.updated_at?' · ✏️ '+esc(dt(r.updated_at)):'')+st+'</span><span class="pha">'+fmtPrice(r.price,r.currency)+'</span></div>';}
function drawHist23(name,box){const h=hist23[norm(name)];const body=box&&box.querySelector('.phbody23');if(!body||!h)return;
  const rows=h.rows.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  body.innerHTML=(rows.length?rows.map(histRow23).join(''):'<div class="empty" style="padding:8px">'+(h.loading?T('טוען...','Loading...'):T('אין דיווחים קודמים','No previous reports'))+'</div>')+
    (!h.done&&rows.length?'<button class="pr-act phmore23" data-phmore="'+esc(name)+'"'+(h.loading?' disabled':'')+'>⬇️ '+T('עוד מחירים קודמים','More previous prices')+'</button>':'');
  const sm=box.querySelector('summary small');if(sm)sm.textContent='('+rows.length+(h.done?'':'+')+')';}
/* כל הדיווחים על המוצר, מהחדש לישן, 30 בכל פעם. השרת (RLS) מחזיר רק מחירים מאושרים + שלי; מנהלים רואים הכל */
async function loadHist23(name,box,more){const k=norm(name);let h=hist23[k];
  if(!h||!more&&!h.loading&&Date.now()-h.at>60000)h=hist23[k]={rows:[],done:false,at:Date.now()};
  if(h.loading)return;
  if(!more&&h.rows.length){drawHist23(name,box);return;}
  const local=priceRows.concat(latestRows).filter(r=>norm(r.product)===k);
  if(sb&&authUser&&!h.done){h.loading=true;drawHist23(name,box);const off=h.rows.length;
    const run=cols=>sb.from('prices').select(cols).eq('product_key',k).order('created_at',{ascending:false}).range(off,off+HIST23_PAGE-1);
    try{let {data,error}=await run(PRICE_COLS+',product_key,is_deal,deal_text,valid_until');if(error)({data,error}=await run(PRICE_COLS+',product_key'));
      if(!error){const got=(data||[]).filter(r=>r&&r.id&&(r.product_key===k||norm(r.product)===k));const ids=new Set(h.rows.map(r=>r.id));got.forEach(r=>{if(!ids.has(r.id)){ids.add(r.id);h.rows.push(r);}});h.done=(data||[]).length<HIST23_PAGE;}else h.done=true;}catch(e){h.done=true;}
    h.loading=false;}
  else h.done=true;
  if(!h.rows.length){h.rows=local.filter((r,i,a)=>a.findIndex(x=>x.id===r.id)===i);}
  drawHist23(name,box);}
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.matches&&d.matches('details.phist23')&&d.open)loadHist23(d.dataset.ph,d,false);},true);
pricesPane.addEventListener('click',e=>{
  const m=e.target.closest('[data-phmore]');if(m){loadHist23(m.dataset.phmore,m.closest('details.phist23'),true);return;}
  const hb=e.target.closest('[data-hist23]');if(hb){const q=hb.dataset.hist23;priceQuery=q;const si=document.querySelector('#priceSearchInput');if(si)si.value=q;
    (async()=>{priceRows=await fetchPrices(q);renderPriceResults();const d=[...document.querySelectorAll('#priceResults details.phist23')].find(x=>x.dataset.ph===q);
      if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'});}else if(si)si.scrollIntoView({behavior:'smooth',block:'center'});})();}});
/* דיווחים אחרונים: לפי קטגוריות (עם מספר), אפשר לקפל, ו"עוד דיווחים" טוען עוד מהשרת */
const lat23Closed=new Set();let lat23DoneAt=-1,lat23Busy=false;
const _v23LatestHtml=latestHtml;
latestHtml=function(){const all=latestRows;if(!all.length)return _v23LatestHtml();
  const by={};all.forEach(r=>{const c=catOfPrice23(r.product);(by[c]=by[c]||[]).push(r);});
  try{return CATS.filter(c=>by[c]).map(c=>{latestRows=by[c];return '<details class="catsec lat23" data-lcat="'+esc(c)+'"'+(lat23Closed.has(c)?'':' open')+'><summary class="cathead">'+(CATE[c]||'🛒')+' '+esc(c)+' <small>('+by[c].length+')</small></summary>'+_v23LatestHtml()+'</details>';}).join('')+
    (all.length<40||all.length===lat23DoneAt?'':'<button class="pr-act phmore23" id="latMore23">⬇️ '+T('עוד דיווחים קודמים','More earlier reports')+'</button>');}finally{latestRows=all;}};
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.matches&&d.matches('details.lat23')){if(d.open)lat23Closed.delete(d.dataset.lcat);else lat23Closed.add(d.dataset.lcat);}},true);
pricesPane.addEventListener('click',async e=>{if(e.target.id!=='latMore23'||lat23Busy||!sb||!authUser)return;lat23Busy=true;e.target.disabled=true;const off=latestRows.length,N=40;
  const run=cols=>sb.from('prices').select(cols).eq('status','approved').order('created_at',{ascending:false}).range(off,off+N-1);
  try{let {data,error}=await run(PRICE_COLS+',wrong,is_deal,deal_text,valid_until,regular_price');if(error)({data,error}=await run(PRICE_COLS+',wrong,is_deal,deal_text,valid_until'));if(error)({data}=await run(PRICE_COLS));
    const got=(data||[]).filter(r=>r&&r.id&&!latestRows.some(x=>x.id===r.id));latestRows=latestRows.concat(got);if((data||[]).length<N)lat23DoneAt=latestRows.length;latestAt=Date.now();await loadMyVotes(got);}catch(e){}
  lat23Busy=false;const el=document.querySelector('#latestReports');if(el)el.innerHTML=latestHtml();});

/* ---------- יאמי: השוואת מחירים לפי עיר (מהדיווחים באתר + מהרשת) ---------- */
async function cityPriceCompare(product,city){
  if(!sb||!authUser){botSay(T('השוואת מחירים זמינה כשמחוברים 🙂','Sign in to compare prices 🙂'));return;}
  window.botTyping=true;renderBot();
  const key=norm(product).replace(/[%,()]/g,'');let rows=[];
  try{const {data}=await sb.from('prices').select('product,chain,branch,price,currency,created_at,updated_at,is_deal,deal_text,status').ilike('product_key','%'+key+'%').eq('status','approved').order('created_at',{ascending:false}).limit(600);rows=data||[];}catch(e){}
  const inCity=r=>!city||norm(r.branch||'').includes(norm(city))||allBranches().some(b=>b.chain===r.chain&&norm(b.city)===norm(city)&&(!r.branch||norm(r.branch).includes(norm(b.city))||norm(b.address||'').includes(norm(r.branch||'-'))));
  const best=new Map();rows.filter(inCity).forEach(r=>{const k=r.chain;const cur=best.get(k);const fresh=!isStale(r);if(!cur||(fresh&&!cur._f)||(fresh===cur._f&&r.price<cur.price))best.set(k,Object.assign({_f:fresh},r));});
  const ranked=[...best.values()].sort((a,b)=>(b._f-a._f)||a.price-b.price);
  let msg='📍 '+T('השוואת מחירים','Price comparison')+': '+product+(city?' '+T('ב','in ')+city:'')+'\n';
  if(ranked.length){msg+=T('מהדיווחים באתר:','From site reports:')+'\n'+ranked.slice(0,8).map((r,i)=>(i===0&&r._f?'🥇 ':(i+1)+'. ')+r.chain+(r.branch?' ('+r.branch+')':'')+' — '+fmtPrice(r.price,r.currency)+(r.is_deal?' 🔥'+(r.deal_text?' '+r.deal_text:''):'')+' · '+agoText(r.updated_at||r.created_at)+(r._f?'':' 🕰️')).join('\n');
    const f=ranked.filter(r=>r._f);if(f.length>1)msg+='\n💡 '+T('הכי משתלם עכשיו: ','Best now: ')+f[0].chain+' — '+T('חוסכים ','save ')+fmtPrice(f[f.length-1].price-f[0].price,f[0].currency)+T(' לעומת היקר',' vs. the priciest');}
  else msg+=T('עוד אין דיווחים באתר על זה'+(city?' ב'+city:'')+' 🤷 — אפשר לדווח בלשונית "מחירים".','No site reports yet 🤷');
  let web=null;try{let {data,error}=await sb.functions.invoke('ai-chat',{body:{webprices:{query:product,city:city||''}}});if(!error&&data&&data.web&&data.text)web=data;}catch(e){}
  window.botTyping=false;
  if(web)msg+='\n\n🌐 '+T('מהרשת (לא מאומת — כדאי לבדוק בחנות):','From the web (unverified):')+'\n'+web.text+((web.sources||[]).length?'\n🔗 '+web.sources.map(s=>s.title||s.url).slice(0,3).join(' · '):'');
  botSay(msg);
}

/* ---------- יאמי: פקודות חדשות ---------- */
async function v10BotPre(raw){
  const t=norm(raw);let m;
  if((m=t.match(/^(?:איפה|מה|באיזה סופר|באיזו חנות)\s+(?:הכי\s+)?(?:זול|זולה|משתלם|יותר זול)\s+(?:לקנות\s+)?(.+?)(?:\s+(?:ב|באזור|בעיר)\s*(\S.*))?$/))||(m=t.match(/^(?:השוואת מחירים|להשוות מחירים|תשווי מחירים|השווי מחירים)(?:\s+(?:של|ל|על))?\s+(.+?)(?:\s+(?:ב|באזור|בעיר)\s*(\S.*))?$/))){
    let prod=m[1].trim(),city=(m[2]||'').trim();const c2=findCityIn(' '+t+' ');if(!city&&c2&&prod.endsWith(c2)){city=c2;prod=prod.slice(0,-c2.length).replace(/\s+(ב|באזור)$/,'').trim();}
    if(city){const cc=findCityIn(' '+city+' ');if(cc)city=cc;else{prod=prod+' ב'+city;city='';}}if(!city)city=state.city||'';
    if(prod){await cityPriceCompare(prod,city);return true;}}
  if(/(לדווח על מבצע|דיווח על מבצע|ראיתי מבצע|מבצע חדש ב)/.test(t)||(/^(יש|יש עכשיו|גיליתי ש?יש)\s+מבצע\s+ב/.test(t)&&!/[?？]/.test(raw)&&!YAMI_ASK.test(t))){const ch=findChainIn(t);openDealReport(ch||'');botSay('📢 '+T('פתחתי דיווח מבצע — תודה שאת/ה עוזר/ת לכולם!','Opened deal report'));return true;}
  if(/(להעלות מוצרים|העלאת מוצרים|תמונות של מוצרים|קובץ מוצרים|תמונה למוצר)/.test(t)){openProductUpload();botSay('📤 '+T('פתחתי העלאת מוצרים — תמונות או קובץ, ואני מזהה','Opened product upload'));return true;}
  if(/(התראות לטלפון|התראות למחשב|התראות כשהאתר סגור|(^|\s)פוש(\s|$)|להפעיל התראות)/.test(t)){openNotif();botSay('📲 '+T('פתחתי את ההתראות — לוחצים "להפעיל התראות במכשיר הזה"','Opened notifications'));return true;}
  return false;
}
yamiStep(v10BotPre);

/* ---------- תפריט ---------- */
(function(){const m=$10('#hMenu');const after=$10('#miInv')||$10('#miNotif');after.insertAdjacentHTML('afterend','<button id="miDeal">📢<span>'+T('דיווח על מבצע','Report a deal')+'</span></button><button id="miProdUp">📤<span>'+T('העלאת מוצרים ותמונות','Upload products')+'</span></button>');
  $10('#miDeal').onclick=()=>{m.classList.remove('open');openDealReport();};$10('#miProdUp').onclick=()=>{m.classList.remove('open');openProductUpload();};})();

const _v10SetTab=setTab;setTab=function(t){const r=_v10SetTab.apply(this,arguments);document.body.dataset.tab=tab;return r;};document.body.dataset.tab=typeof tab!=='undefined'?tab:'list';
const _v10AfterEnter=afterEnter;afterEnter=function(){_v10AfterEnter();setTimeout(()=>{checkBan();loadMyProducts();pushRefresh();routeHash();},1500);};
if(state.user&&authUser)setTimeout(()=>{checkBan();loadMyProducts();pushRefresh();routeHash();},1500);
pushRefresh();
