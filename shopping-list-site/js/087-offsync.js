/* 📡 סנכרון בלי אינטרנט (נובמבר 2026) — בין "רשימת קניות אופליין" (אפליקציה נפרדת בלי אינטרנט, OFF_APP),
   האפליקציה הרגילה והאתר. שלוש דרכים, אותה "חבילה":
     🔳 QR — טלפון אחד מציג, השני סורק (רשימה ארוכה = כמה קודים שמתחלפים לבד). עובד גם מול האתר במחשב.
     🔵 בלוטות' — טלפון מול טלפון (android-app Bt.java, מגרסה 2.2 גם באפליקציה הרגילה).
     ✉️ קוד שיתוף — טקסט ששולחים ב-SMS או מעתיקים, ומדביקים בטלפון השני.
   החבילה: "YAM1" + z (דחוס) / j (לא דחוס) + base64url של JSON עם הרשימות, המחיקות (tomb), המזווה, התכנונים ו-30 קניות אחרונות.
   המיזוג הוא אותו מיזוג של הענן (applyRemote → mergeLists לפי זמן השינוי של כל מוצר), כך ששום דבר לא נדרס ולא מוכפל.
   🔒 בחבילה יש רק נתוני רשימה — אין בה קישורים או פקודות, והיא עוברת את אותו ניקוי (cleanRoom) כמו נתונים מהענן.
   📴 מהאפליקציה האופליין עוברים גם: גרסה, דגם, ותקלות שנשמרו בטלפון (רק אם הסכימו) — והטלפון המחובר מעביר אותם
   ליומן התקלות 🐞 ול"מי הוריד" בבק אופיס (apk_log 'off_open'). בלי שם, בלי מספר טלפון ובלי תוכן הרשימה. */
(function(){
const PFX='YAM1',PART=500,LS_LAST='yam_off_last',LS_PEERS='yam_off_peers',LS_DIAG='yam_off_diag',LS_OK='yam_off_diag_ok';
const ls={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
const jget=(k,d)=>{try{const v=JSON.parse(ls.get(k)||'null');return v==null?d:v;}catch(e){return d;}};
const $o=s=>document.querySelector(s);
const nat=()=>window.YamApp||null;
const hasBt=()=>{const a=nat();return !!(a&&typeof a.btState==='function');};
const appInfo=()=>{try{const a=nat();return a&&typeof a.appInfo==='function'?JSON.parse(a.appInfo()||'{}'):{};}catch(e){return {};}};
const devId=()=>{try{return typeof guestId27==='function'?guestId27():'';}catch(e){return '';}};

/* ---------- 🐞 תקלות באפליקציה האופליין: נשמרות בטלפון עד הסנכרון הבא ---------- */
window.offDiagAdd=function(msg,src){if(!OFF_APP)return;const a=jget(LS_DIAG,[]);if(!Array.isArray(a)||a.some(x=>x&&x.m===msg&&x.s===src))return;
  a.push({m:String(msg||'').slice(0,500),s:String(src||'').slice(0,300),v:String(typeof APP_VERSION!=='undefined'?APP_VERSION:''),t:Date.now()});ls.set(LS_DIAG,JSON.stringify(a.slice(-30)));};
const diagOk=()=>ls.get(LS_OK);   // '1' = מסכים, '0' = לא, null = עוד לא שאלנו

/* ---------- אריזה ---------- */
const b64u=b=>{let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const ub64u=t=>{t=t.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';const s=atob(t),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;};
const pipe=(bytes,T)=>new Response(new Blob([bytes]).stream().pipeThrough(T)).arrayBuffer();
async function zip(json){const raw=new TextEncoder().encode(json);
  if(typeof CompressionStream==='function'){try{return 'z'+b64u(new Uint8Array(await pipe(raw,new CompressionStream('deflate'))));}catch(e){}}
  return 'j'+b64u(raw);}
async function unzip(t){const k=t[0],b=ub64u(t.slice(1));if(k==='j')return new TextDecoder().decode(b);
  if(typeof DecompressionStream!=='function')throw new Error('old');return new TextDecoder().decode(await pipe(b,new DecompressionStream('deflate')));}
/* ב-QR כל תו הוא עוד ריבוע לסרוק: בלי מה שהטלפון השני משלים לבד (אימוג'י וקטגוריה רגילים, כמות ריקה, "לא נקנה") ובלי תמונות */
function slim(l){return Object.assign({},l,{items:(l.items||[]).map(i=>{const o=Object.assign({},i);delete o.img;if(o.q==='')delete o.q;if(!o.done)delete o.done;
  try{if(o.e===emojiOf(o.n))delete o.e;if(o.c===resolveCat(o.n))delete o.c;}catch(e){}return o;})});}
async function pack(qr){seenAdd();
  const o={v:1,dev:devId(),name:myName(),at:Date.now(),off:OFF_APP?1:0,net:!OFF_APP&&!!sb&&navigator.onLine!==false?1:0,
    lists:qr?state.lists.map(slim):state.lists,tomb:state.tomb,pantry:state.pantry,customPantry:state.customPantry,plans:state.plans,history:qr?[]:(state.history||[]).slice(0,30)};/* ב-QR בלי היסטוריה — פחות קודים לסרוק */
  if(OFF_APP){const ai=appInfo();o.ver=String(ai.ver||'');o.model=String(ai.model||'');o.android=String(ai.android||'');
    if(diagOk()==='1'){const d=jget(LS_DIAG,[]);if(Array.isArray(d)&&d.length)o.diag=d.slice(-20);}}
  return PFX+(await zip(JSON.stringify(o)));}
window.offPack=pack;

/* ---------- מיזוג חבילה שהגיעה ---------- */
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const arr=x=>Array.isArray(x)?x:[];
function snap(){const m={};(state.lists||[]).forEach(l=>(l.items||[]).forEach(i=>{if(i)m[l.id+'|'+i.id]=(i.ts||0)+'|'+(i.done?1:0)+'|'+(i.q||'');}));return m;}
/* 🕰️ שעון שזז: האופליין לא מתחבר לאינטרנט, אז השעון שלו יכול לזוז בשעות ובימים. בלי תיקון, "השינוי האחרון מנצח" בוחר לא נכון —
   סימון באופליין לא עובר, ומה שנמחק חוזר. בבלוטות' וב-QR החבילה נוצרה לפני שניות, אז ההפרש בין השעה שבה היא נוצרה (at)
   לשעה כאן הוא ההפרש בין השעונים. האופליין מתקן לפי טלפון שמחובר לאינטרנט: מעכשיו (Date.now, js/001.js), ומה שנשמר אצלו
   "בעתיד" יורד לעכשיו. (לא מזיזים נתונים אחורה/קדימה בסיטונאות — חלק מהם הגיעו מהטלפון השני עם השעה הנכונה) */
const LS_CLOCK='yam_off_clock',LS_SEEN='yam_off_seen',SKEW=90e3;
function learnClock(o,via){if(!OFF_APP||!o.net||(via!=='bt'&&via!=='qr'))return;const at=Number(o.at);if(!isFinite(at)||at<=0)return;
  const d=at-Date.now();if(Math.abs(d)<SKEW)return;
  const off=(Number(ls.get(LS_CLOCK))||0)+d;if(Math.abs(off)>=4e11)return;ls.set(LS_CLOCK,String(off));
  const _n=Date.now;Date.now=()=>_n()+d;const now=Date.now(),c=v=>{v=Number(v);return isFinite(v)&&v>now?now:v;};
  (state.lists||[]).forEach(l=>{['created','nameTs','mtime'].forEach(k=>{if(l[k]!=null)l[k]=c(l[k]);});(l.items||[]).forEach(i=>{if(i&&i.ts)i.ts=c(i.ts);});});
  const t=state.tomb;if(t&&typeof t==='object')['items','lists'].forEach(k=>{const m=t[k];if(m&&typeof m==='object')Object.keys(m).forEach(id=>{m[id]=c(m[id]);});});}
/* 🧠 מה שכבר היה בטלפון הזה ואיננו — נמחק כאן. גם אחרי שהמחיקה נשכחה (30 יום) הוא לא חוזר מטלפון שלא סונכרן מאז */
const seenGet=()=>{const a=jget(LS_SEEN,[]);return new Set(Array.isArray(a)?a:[]);};
function seenAdd(){const s=seenGet();(state.lists||[]).forEach(l=>{s.delete('l:'+l.id);s.add('l:'+l.id);(l.items||[]).forEach(i=>{if(i&&i.id){s.delete('i:'+i.id);s.add('i:'+i.id);}});});
  const a=[...s];ls.set(LS_SEEN,JSON.stringify(a.slice(-8000)));}
function dropGone(remote){const s=seenGet();if(!s.size)return;const lids=new Set(),iids=new Set();
  (state.lists||[]).forEach(l=>{lids.add(l.id);(l.items||[]).forEach(i=>i&&iids.add(i.id));});
  remote.lists=remote.lists.filter(l=>!(l&&l.id&&s.has('l:'+l.id)&&!lids.has(l.id)));
  remote.lists.forEach(l=>{if(l&&Array.isArray(l.items))l.items=l.items.filter(i=>!(i&&i.id&&s.has('i:'+i.id)&&!iids.has(i.id)));});}
async function merge(code,via,peer){
  const m=String(code||'').replace(/\s+/g,'').match(/YAM1[zj][A-Za-z0-9_-]{8,}/);
  if(!m){flash(T('⚠️ זה לא קוד סנכרון של רשימת קניות','⚠️ This is not a shopping-list sync code'));return null;}
  if(m[0].length>1500000){flash(T('⚠️ הקוד גדול מדי','⚠️ Code too large'));return null;}
  let o;try{const j=await unzip(m[0].slice(4));if(j.length>4000000)throw 0;o=JSON.parse(j);}
  catch(e){flash(e&&e.message==='old'?T('⚠️ הטלפון הזה ישן מדי לקוד הדחוס — מעדכנים את "Android System WebView"','⚠️ This phone is too old for this code'):T('⚠️ הקוד לא שלם — בודקים שהועתק עד הסוף','⚠️ The code is incomplete'));return null;}
  if(!o||o.v!==1||!Array.isArray(o.lists)){flash(T('⚠️ הקוד לא מתאים לגרסה הזו','⚠️ Code does not match this version'));return null;}
  if(o.dev&&o.dev===devId()){flash(T('🙂 זה הקוד של הטלפון הזה עצמו — סורקים את הקוד בטלפון השני','🙂 That is this phone\'s own code'));return null;}
  /* רק נתוני רשימה עוברים (לא "האזור האישי", לא הגדרות, לא שיחות), ודרך אותו ניקוי של הענן */
  const remote={lists:o.lists.slice(0,60),tomb:o.tomb,pantry:obj(o.pantry),customPantry:arr(o.customPantry).filter(s=>typeof s==='string'&&s.length<=60).slice(0,500),
    plans:obj(o.plans),history:arr(o.history).filter(h=>h&&typeof h==='object').slice(0,30)};
  learnClock(o,via);
  seenAdd();dropGone(remote);
  align(remote);
  const a=snap();
  try{applyRemote(remote,false);}catch(e){flash(T('⚠️ המיזוג נכשל','⚠️ Merge failed'));try{window.logClientError&&logClientError('offsync merge: '+e.message,'087');}catch(x){}return null;}
  seenAdd();save();try{render();}catch(e){}
  const b=snap();let add=0,upd=0,del=0;for(const k in b){if(!(k in a))add++;else if(b[k]!==a[k])upd++;}for(const k in a)if(!(k in b))del++;
  const name=String(peer||o.name||o.model||'').replace(/[<>]/g,'').slice(0,40);
  const peers=obj(jget(LS_PEERS,{}));peers[String(o.dev||'?').slice(0,40)]={at:Date.now(),via,name,off:o.off?1:0};ls.set(LS_PEERS,JSON.stringify(peers));ls.set(LS_LAST,String(Date.now()));
  /* הצד השני מחובר לאינטרנט וקיבל את התקלות שלנו — אפשר למחוק אותן מהטלפון */
  if(OFF_APP&&o.net)ls.del(LS_DIAG);
  if(!OFF_APP&&o.off)relay(o,via);
  try{window.YamApp&&typeof YamApp.buzz==='function'&&YamApp.buzz(80);}catch(e){}
  return {add,upd,del,name,off:!!o.off};}
window.offMerge=merge;

/* 🧠 "אותה רשימה" ו"אותו מוצר" גם כשנוצרו בנפרד בשני הטלפונים לפני שהם סונכרנו (למשל "סופר" ו"חלב" בשניהם).
   בלי זה היו שתי רשימות "סופר" ושני "חלב". מאחדים לפי השם, למזהה הקטן מבין השניים — כך ששני הטלפונים מגיעים
   לאותם מזהים, ומאז כל סנכרון (גם אחרי כמה ימים) מזהה הכל לפי מזהה: מה שנוסף — נוסף, מה שהשתנה — מתעדכן לפי
   השינוי האחרון, ומה שנמחק — נמחק גם בצד השני ולא חוזר (tomb, 30 יום). המזהה הישן נקבר, כדי שגם הענן לא יחזיר אותו */
function align(remote){
  const tomb=cleanTomb(state.tomb),lid=new Set(state.lists.map(l=>l.id)),rid=new Set(remote.lists.map(l=>l&&l.id));
  remote.lists.forEach(rl=>{if(!rl||!rl.id||lid.has(rl.id)||tomb.lists[rl.id])return;
    const ll=state.lists.find(l=>!rid.has(l.id)&&norm(l.name)===norm(rl.name));if(!ll)return;
    const id=rl.id<ll.id?rl.id:ll.id;
    if(ll.id!==id){tombAdd('lists',[Object.assign({},ll)]);if(state.active===ll.id)state.active=id;ll.id=id;}
    rl.id=id;lid.add(id);rid.add(id);});
  remote.lists.forEach(rl=>{const ll=rl&&state.lists.find(l=>l.id===rl.id);if(!ll||!Array.isArray(rl.items))return;
    const lids=new Set((ll.items||[]).map(i=>i.id)),rids=new Set(rl.items.map(i=>i&&i.id));
    rl.items.forEach(ri=>{if(!ri||ri.done||!ri.id||lids.has(ri.id)||tomb.items[ri.id])return;
      const li=(ll.items||[]).find(i=>!i.done&&!rids.has(i.id)&&norm(i.n)===norm(ri.n));if(!li)return;
      const id=ri.id<li.id?ri.id:li.id;
      if(li.id!==id){tombAdd('items',[{id:li.id,ts:li.ts}]);li.id=id;}
      ri.id=id;lids.add(id);rids.add(id);});});}

/* האפליקציה האופליין "נראתה" + התקלות שלה → לבק אופיס, דרך הטלפון הזה (שיש בו אינטרנט) */
/* כל חיבור נרשם גם כ-off_sync: מי התחבר (האתר / האפליקציה הרגילה) ואיך (בלוטות' / QR / קוד) — לספירה "כמה מחוברים" בבק אופיס.
   בסנכרון חי כל שמירה עוברת כאן, ולכן פעם אחת לכל טעינת דף (והשרת סופר שוב רק אחרי 6 שעות) */
const relayed={};
function relay(o,via){if(!sb||navigator.onLine===false)return;
  const dev=/^[0-9a-f-]{36}$/.test(o.dev||'')?o.dev:'',ver=String(o.ver||'').replace(/[^0-9.]/g,'').slice(0,12);
  const device=[String(o.model||'').replace(/[^A-Za-z0-9 ._()-]/g,'').slice(0,30),o.android?'Android '+String(o.android).replace(/[^0-9.]/g,'').slice(0,6):''].filter(Boolean).join(' · ');
  const src=(/YamShoppingApp\//.test(navigator.userAgent||'')?'app':'site')+'-'+(['bt','qr','code'].includes(via)?via:'code');
  if(dev&&!relayed[dev+src]){relayed[dev+src]=1;
    try{sb.rpc('apk_log',{p_kind:'off_open',p_src:'offline',p_device:device,p_dev:dev,p_ver:ver}).then(()=>{},()=>{});}catch(e){}
    try{sb.rpc('apk_log',{p_kind:'off_sync',p_src:src,p_device:device,p_dev:dev,p_ver:ver}).then(()=>{},()=>{});}catch(e){}}
  arr(o.diag).slice(0,20).forEach(d=>{if(!d||typeof d.m!=='string')return;
    try{sb.rpc('log_client_error',{p_msg:d.m.slice(0,500),p_src:('📴 אופליין · '+String(d.s||'')).slice(0,300),p_ua:('YamShoppingOffline/'+ver).slice(0,200),p_ver:String(d.v||'').slice(0,12),p_app:ver,p_device:device,p_dev:dev}).then(()=>{},()=>{});}catch(e){}});}

/* ---------- 🔳 QR ---------- */
let qrTimer=0,rx={};
/* הסורק בטלפונים בלי שירותי גוגל (ZXing) לא מצליח לקרוא חלק קטן מהקודים. לכן כל קוד נבדק כאן לפני שמציגים אותו,
   ואם הוא לא נקרא — מציירים אותו מחדש ברמת תיקון שגיאות אחרת (ציור אחר לגמרי של אותו תוכן) */
function qrMatrix(Z,text){const E=Z.QRCodeDecoderErrorCorrectionLevel;let m=null;
  for(const lv of [E.L,E.M,E.Q]){const h=new Map();h.set(Z.EncodeHintType.ERROR_CORRECTION,lv);h.set(Z.EncodeHintType.MARGIN,2);
    m=new Z.QRCodeWriter().encode(text,Z.BarcodeFormat.QR_CODE,0,0,h);
    try{const w=m.getWidth(),c=document.createElement('canvas');c.width=c.height=w*4;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w*4,w*4);x.fillStyle='#000';
      for(let y=0;y<w;y++)for(let q=0;q<w;q++)if(m.get(q,y))x.fillRect(q*4,y*4,4,4);
      if(new Z.QRCodeReader().decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(c)))).getText()===text)return m;}catch(e){}}
  return m;}
function qrSvg(m){const w=m.getWidth();let d='';
  for(let y=0;y<w;y++)for(let x=0;x<w;x++)if(m.get(x,y))d+='M'+x+' '+y+'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+w+'" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="'+w+'" height="'+w+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';}
async function showQr(){clearInterval(qrTimer);const box=$o('#offQr');if(!box)return;box.innerHTML='<p class="muted-note">⏳</p>';
  let Z;try{Z=await loadZxing();}catch(e){box.innerHTML='<p class="muted-note">'+T('הקוד לא נטען','Could not load')+'</p>';return;}
  const code=(await pack(true)).slice(PFX.length),sid=Math.random().toString(36).slice(2,6).padEnd(4,'0'),n=Math.ceil(code.length/PART);
  const parts=n<=1?[PFX+code]:Array.from({length:n},(_,i)=>'Y1:'+sid+':'+(i+1)+':'+n+':'+code.slice(i*PART,(i+1)*PART));
  const svgs=parts.map(t=>qrSvg(qrMatrix(Z,t)));
  let i=0;const draw=()=>{if(!document.body.contains(box)){clearInterval(qrTimer);return;}
    box.innerHTML='<div class="offqr">'+svgs[i]+'</div>'+(n>1?'<p class="offqrn">'+T('קוד '+(i+1)+' מתוך '+n+' — מתחלף לבד, ממשיכים לכוון','Code '+(i+1)+' of '+n)+'</p>':'');i=(i+1)%n;};
  draw();if(n>1)qrTimer=setInterval(draw,900);}
/* נקרא מהסורק (js/009.js): 'more' = עוד חלקים, המצלמה נשארת פתוחה; 'done' = נקלט; null = לא שלנו */
window.offQrTake=function(code){code=String(code||'').trim();
  if(/^YAM1[zj]/.test(code)){got(code,'qr');return 'done';}
  const m=code.match(/^Y1:([a-z0-9]{4}):(\d{1,3}):(\d{1,3}):([A-Za-z0-9_-]*)$/);if(!m)return null;
  const n=+m[3];if(rx.sid!==m[1])rx={sid:m[1],n,p:{}};rx.p[m[2]]=m[4];const k=Object.keys(rx.p).length;
  if(k<n){const t='📡 '+T('נקלטו '+k+' מתוך '+n+' — ממשיכים לכוון אל הקוד','Got '+k+' of '+n+' — keep pointing');['#scanHint','#offQsHint'].forEach(q=>{const h=$o(q);if(h)h.textContent=t;});return 'more';}
  const full=PFX+Array.from({length:n},(_,i)=>rx.p[i+1]||'').join('');rx={};got(full,'qr');return 'done';};
/* 📷 סורק QR משלו — לא הסורק של ברקוד המוצרים (שחותך מלבן רחב, מקטין את התמונה ומחפש פסים, ולכן כמעט לא קרא את קוד הסנכרון).
   כאן: ריבוע באמצע התמונה בגודל מלא (עד 900 פיקסלים), רק QR, ואם המצלמה החיה לא עובדת בטלפון הזה — צילום תמונה */
let qs=null;
function qrScanClose(){if(!qs)return;qs.on=false;clearTimeout(qs.t);try{qs.stream&&qs.stream.getTracks().forEach(t=>t.stop());}catch(e){}const o=$o('#offQs');if(o)o.remove();qs=null;}
function qsHint(t){const h=$o('#offQsHint');if(h)h.textContent=t;}
async function scanQr(){rx={};qrScanClose();
  document.body.insertAdjacentHTML('beforeend','<div id="offQs" class="offqs" role="dialog" aria-modal="true" aria-label="'+T('סריקת קוד סנכרון','Scan sync code')+'">'+
    '<div class="offqsv"><video playsinline muted></video><i aria-hidden="true"></i></div><p id="offQsHint" aria-live="polite">⏳</p>'+
    '<div class="offqsb"><label class="btn" id="offQsPh">📸 '+T('לצלם תמונה במקום','Take a photo instead')+'<input type="file" accept="image/*" capture="environment" hidden></label>'+
    '<button type="button" class="btn" id="offQsX">'+T('סגירה','Close')+'</button></div></div>');
  const me=qs={on:true,t:0,stream:null},alive=()=>qs===me&&me.on;
  $o('#offQsX').onclick=qrScanClose;
  let Z;try{Z=await loadZxing();}catch(e){qsHint(T('הסורק לא נטען','Scanner failed to load'));return;}
  const hints=new Map();hints.set(Z.DecodeHintType.TRY_HARDER,true);const rd=new Z.QRCodeReader();
  let nat=null;try{if(typeof scanNativeOk==='function'&&scanNativeOk()&&(await BarcodeDetector.getSupportedFormats()).includes('qr_code'))nat=new BarcodeDetector({formats:['qr_code']});}catch(e){nat=null;}
  const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
  const dec=async()=>{if(nat){try{const c=await nat.detect(cv);if(c&&c.length)return c[0].rawValue;}catch(e){nat=null;}}
    try{return rd.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv))),hints).getText();}catch(e){return null;}};
  const take=t=>{if(!t||!alive())return false;const r=offQrTake(t);if(r==='done'){qrScanClose();return true;}
    if(r==null)qsHint(T('זה לא קוד סנכרון — מכוונים אל הקוד שבטלפון השני','Not a sync code'));return false;};
  /* צילום: גם בטלפון שהמצלמה החיה קורסת בו. רשימה ארוכה = כמה קודים, צילום לכל אחד */
  $o('#offQsPh input').onchange=async e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;qsHint('⏳');
    try{const u=URL.createObjectURL(f),im=new Image();await new Promise((ok,no)=>{im.onload=ok;im.onerror=no;im.src=u;});
      for(const mx of [1400,900]){const k=Math.min(1,mx/Math.max(im.width,im.height));cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);cx.drawImage(im,0,0,cv.width,cv.height);
        const t=await dec();if(t){URL.revokeObjectURL(u);if(!take(t)&&rx.n)qsHint(T('נקלטו '+Object.keys(rx.p).length+' מתוך '+rx.n+' — מצלמים את הקוד הבא','Got '+Object.keys(rx.p).length+' of '+rx.n));return;}}
      URL.revokeObjectURL(u);qsHint(T('לא נמצא קוד בתמונה — מצלמים מקרוב, ישר, שכל הקוד בתמונה','No code found — try closer'));}catch(er){qsHint(T('התמונה לא נפתחה','Could not open the photo'));}};
  const live=!(typeof scanPhotoMode==='function'&&scanPhotoMode())&&!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
  if(!live){qsHint(T('מצלמים את הקוד שבטלפון השני (📸)','Take a photo of the code on the other phone'));$o('#offQs .offqsv').hidden=true;return;}
  qsHint(T('מכוונים אל קוד הסנכרון בטלפון השני','Point at the sync code on the other phone'));
  try{me.stream=await getScanStream();}catch(e){if(alive()){qsHint(T('המצלמה לא נפתחה — מצלמים תמונה במקום (📸)','Camera unavailable — take a photo'));$o('#offQs .offqsv').hidden=true;}return;}
  if(!alive()){me.stream.getTracks().forEach(t=>t.stop());return;}
  const v=$o('#offQs video');v.srcObject=me.stream;try{await v.play();}catch(e){}
  const step=async()=>{if(!alive())return;
    try{const w=v.videoWidth,h=v.videoHeight;if(w&&h&&v.readyState>=2){const sd=Math.round(Math.min(w,h)*.9),k=Math.min(1,900/sd),z=Math.max(1,Math.round(sd*k));
      if(cv.width!==z){cv.width=cv.height=z;}cx.drawImage(v,(w-sd)/2,(h-sd)/2,sd,sd,0,0,z,z);if(take(await dec()))return;}}catch(e){}
    if(alive())me.t=setTimeout(step,120);};
  step();}
window.offQrScan=scanQr;

/* ---------- אחרי שהגיעה חבילה (מכל דרך) ---------- */
async function got(code,via,peer){const r=await merge(code,via,peer);if(!r)return;
  const msg='✅ '+T('סונכרן','Synced')+(r.name?' '+T('עם','with')+' '+r.name:'')+': '+T('נוספו '+r.add+', עודכנו '+r.upd+(r.del?', נמחקו '+r.del:''),r.add+' added, '+r.upd+' updated'+(r.del?', '+r.del+' removed':''));
  flash(msg);
  /* מי שסורק / מדביק מקבל את מה שיש בצד השני — וזהו, בלי לבקש "עכשיו לסרוק בחזרה" */
  open(via==='code'?'code':'qr',msg);}

/* ---------- 🔵 בלוטות' חי: קוד של 4 ספרות, ואז כל שינוי עובר מיד כל עוד הטלפונים קרובים ----------
   בערוץ עוברות הודעות JSON: {k:'hi',code,dev,name} (בדיקת הקוד) ו-{k:'pk',d:'YAM1...'} (החבילה המלאה, נדחסת).
   הטלפון שנשמר (LS_BT) מתחבר לבד בפתיחה הבאה: מי שיצר את הקוד מחכה, מי שהקליד מתחבר לכתובת. */
const LS_BT='yam_off_bt';
let bt={live:false,name:'',addr:'',code:'',role:'',st:'',retry:0,rt:0,sig:'',sendT:0};
const btPeer=()=>{const p=obj(jget(LS_BT,null));return p.code&&p.role?p:null;};
const sig=()=>{const s=JSON.stringify([state.lists,state.tomb,state.pantry,state.customPantry,state.plans]);let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return s.length+':'+h;};
const btSend=o=>{try{const a=nat();return !!(a&&a.btSend(JSON.stringify(o)));}catch(e){return false;}};
async function btPush(){bt.sig=sig();btSend({k:'pk',d:await pack()});}
function btText(){const n=esc(bt.name||'');
  const S={none:T('אין בלוטות\' בטלפון הזה — משתמשים ב-QR או בקוד שיתוף','No Bluetooth here — use QR or the share code'),
    perm:T('צריך לאשר את הרשאת הבלוטות\' (מכשירים בקרבת מקום) — לוחצים שוב ומאשרים','Allow the Bluetooth permission and try again'),
    off:T('הבלוטות\' כבוי — מדליקים ולוחצים שוב','Bluetooth is off'),
    wait:'<div class="offbig" dir="ltr">'+esc(bt.code)+'</div>'+T('מקלידים את הקוד הזה בטלפון השני (⌨️ "להקליד קוד"). מחכה...','Type this code on the other phone. Waiting...'),
    search:'🔎 '+T('מחפש את הטלפון עם הקוד '+esc(bt.code)+'... (עד חצי דקה)','Looking for the phone with code '+esc(bt.code)+'...'),
    'try':'🔄 '+T('בודק את ','Checking ')+n+'...',
    notfound:T('לא נמצא טלפון עם הקוד הזה. בודקים שבטלפון השני מוצג הקוד, שהטלפונים קרובים, ושהבלוטות\' דלוק בשניהם — ומנסים שוב.','No phone with this code was found. Check the code, distance and Bluetooth, then retry.')+(navigator.userAgent.match(/Android (8|9|10|11)\b/)?' '+T('בטלפון ישן צריך גם שהמיקום יהיה דלוק בזמן החיפוש.','On older phones, Location must be on while searching.'):''),
    live:'🟢 '+T('מחובר ל'+n+' — כל שינוי עובר מיד, כל עוד הטלפונים קרובים','Connected to '+n+' — every change syncs live'),
    lost:'🟠 '+T('החיבור ל'+n+' נקטע (התרחקו?). מתחבר שוב לבד כשיהיו קרובים','Connection lost. Will reconnect when close'),
    away:'🟠 '+T(n+' לא בטווח כרגע. מתחבר לבד כשיהיו קרובים',n+' is out of range. Will reconnect'),
    fail:'⚠️ '+T('לא הצליח. מנסים שוב','Failed — try again')};
  return S[bt.st]!=null?S[bt.st]:'';}
function btShow(){const e=$o('#offBtSt');if(e)e.innerHTML=btText();try{mount();}catch(er){}
  const d=$o('#offBtDis');if(d)d.hidden=!(bt.live||btPeer());}
function btLater(){clearTimeout(bt.rt);const p=btPeer();if(!p||bt.live)return;
  const wait=Math.min(120,30*Math.pow(2,bt.retry++))*1000;
  bt.rt=setTimeout(()=>{if(document.visibilityState==='visible')btAuto();else btLater();},wait);}
/* חיבור לבד לטלפון שכבר הוצמד */
function btAuto(){const p=btPeer(),a=nat();if(!p||!hasBt()||bt.live)return;
  try{if(!JSON.parse(a.btState()||'{}').on)return;}catch(e){return;}
  bt.code=p.code;bt.name=p.name||'';bt.role=p.role;
  try{if(p.role==='listen')a.btListen(p.code,false);else a.btConnect(p.addr,p.code);}catch(e){}}
window.offBt=function(e){if(!e||typeof e!=='object')return;
  if(e.t==='msg'){let m;try{m=JSON.parse(e.data);}catch(x){return;}if(!m||typeof m!=='object')return;
    if(m.k==='hi'){if(String(m.code)!==bt.code){try{nat().btStop();}catch(x){}bt.live=false;bt.st='fail';btShow();return;}
      bt.name=String(m.name||bt.name||'').replace(/[<>]/g,'').slice(0,40);
      ls.set(LS_BT,JSON.stringify({code:bt.code,role:bt.role,addr:bt.addr,name:bt.name,dev:String(m.dev||'').slice(0,40)}));btShow();return;}
    if(m.k==='pk'&&typeof m.d==='string'){merge(m.d,'bt',bt.name).then(r=>{bt.sig=sig();if(!r)return;
      if(r.add+r.upd+r.del)flash('🔄 '+T('עודכן מ'+(bt.name||'הטלפון השני')+': ','Updated from '+(bt.name||'the other phone')+': ')+T('נוספו '+r.add+', עודכנו '+r.upd+(r.del?', נמחקו '+r.del:''),r.add+' added, '+r.upd+' updated'));});}
    return;}
  if(e.t!=='state')return;
  bt.st=e.s;if(e.code)bt.code=e.code;
  if(e.s==='live'){bt.live=true;bt.retry=0;clearTimeout(bt.rt);bt.addr=e.addr||bt.addr;if(!bt.name)bt.name=e.name||'';
    const ai=appInfo();btSend({k:'hi',code:bt.code,dev:devId(),name:myName()||String(ai.model||T('הטלפון השני','The other phone'))});btPush();}
  else if(e.s==='lost'||e.s==='away'){bt.live=false;btLater();}
  else if(e.s!=='try'&&e.s!=='search')bt.live=false;
  btShow();};
/* כל שמירה (הוספה, סימון, מחיקה) → נשלחת לטלפון המחובר, אחרי שנייה של שקט */
const _btSave=save;save=function(){const r=_btSave.apply(this,arguments);
  if(bt.live){clearTimeout(bt.sendT);bt.sendT=setTimeout(()=>{if(bt.live&&sig()!==bt.sig)btPush();},1200);}return r;};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!bt.live&&btPeer()){bt.retry=0;btAuto();}});
setTimeout(btAuto,2500);
function btCreate(){const a=nat();if(!a)return;const r=new Uint16Array(1);crypto.getRandomValues(r);
  bt.code=String(1000+r[0]%9000);bt.role='listen';bt.name='';bt.addr='';bt.live=false;bt.st='wait';btShow();try{a.btListen(bt.code,true);}catch(e){}}
function btJoin(){const a=nat(),i=$o('#offBtCode');const c=String(i&&i.value||'').replace(/\D/g,'');
  if(c.length!==4){flash(T('מקלידים את 4 הספרות שמופיעות בטלפון השני','Type the 4 digits shown on the other phone'));if(i)i.focus();return;}
  bt.code=c;bt.role='join';bt.name='';bt.addr='';bt.live=false;bt.st='search';btShow();try{a.btJoin(c);}catch(e){}}
function btForget(){try{nat().btStop();}catch(e){}clearTimeout(bt.rt);ls.del(LS_BT);bt.live=false;bt.st='';bt.name='';btShow();open('bt');}

/* ---------- ✉️ קוד שיתוף ---------- */
async function showCode(){const t=$o('#offMine');if(!t)return;t.value=await pack();
  const sms=$o('#offSms');if(sms)sms.onclick=e=>{const a=nat();
    if(a&&typeof a.shareText==='function'){e.preventDefault();a.shareText(t.value);}else sms.href='sms:?body='+encodeURIComponent(t.value);};}

/* ---------- המסך ---------- */
let curTab='';
function ago(ts){if(!ts)return T('עוד לא סונכרן','Never synced');const m=Math.round((Date.now()-ts)/60000);
  return T('סונכרן ','Synced ')+(m<2?T('עכשיו','just now'):m<60?T('לפני '+m+' דקות',m+' min ago'):m<1440?T('לפני '+Math.round(m/60)+' שעות',Math.round(m/60)+' h ago'):T('לפני '+Math.round(m/1440)+' ימים',Math.round(m/1440)+' days ago'));}
function pendingN(){const last=+ls.get(LS_LAST)||0;let n=0;(state.lists||[]).forEach(l=>(l.items||[]).forEach(i=>{if(i&&(i.ts||0)>last)n++;}));return n;}
function open(tab,note){
  if(tab)curTab=tab;if(!curTab||(curTab==='bt'&&!hasBt()))curTab=hasBt()?'bt':'qr';
  const last=+ls.get(LS_LAST)||0,pn=pendingN();
  const tabs=[...(hasBt()?[['bt','🔵 '+T('בלוטות\'','Bluetooth')]]:[]),['qr','🔳 QR'],['code','✉️ '+T('קוד שיתוף','Share code')]];
  let body='<div class="offsync"><p class="offst">'+ago(last)+(pn&&last?' · '+T(pn+' שינויים מאז',pn+' changes since'):'')+'</p>'+(note?'<div class="offok" role="status">'+note+'</div>':'')+
    '<div class="offtabs" role="tablist">'+tabs.map(t=>'<button role="tab" data-offt="'+t[0]+'" aria-selected="'+(t[0]===curTab)+'">'+t[1]+'</button>').join('')+'</div>';
  /* סריקה אחת בלבד — בוחרים מי סורק: הטלפון/הנגן או המחשב. מי שסורק מקבל את כל מה שיש בשני. במכשיר בלי מצלמה (נגן) — רק מציגים */
  if(curTab==='qr')body+='<p class="muted-note">'+T('סורקים פעם אחת, מאיזה צד שנוח: מי שסורק מקבל את כל מה שיש בצד השני. במכשיר בלי מצלמה (נגן) — מציגים כאן את הקוד, וסורקים אותו מהמחשב או מהטלפון.','Scan once, from whichever side: the device that scans gets everything from the other. On a device without a camera, show this code and scan it from the other side.')+'</p>'+
    '<button class="btn" id="offScan" style="width:100%;margin-bottom:8px">📷 '+T('אני סורק את הקוד של הצד השני','I scan the other side\'s code')+'</button>'+
    '<p class="muted-note" id="offQrOr" style="margin:4px 0 0">🔳 '+T('או — הקוד שלי, לסריקה מהצד השני:','Or — my code, to scan from the other side:')+'</p><div id="offQr" class="offqrbox"></div>';
  else if(curTab==='bt'){const p=btPeer();body+='<p class="muted-note">'+T('בלי אינטרנט ובלי SMS: בטלפון אחד יוצרים קוד, ובשני מקלידים אותו. מאז, כל שינוי עובר מיד בין שני הטלפונים כל עוד הם קרובים — ובפעם הבאה הם מתחברים לבד.','No internet or SMS: create a code on one phone, type it on the other. Then every change syncs live while they are close.')+'</p>'+
    (bt.live?'':'<div class="row2"><button class="btn" id="offBtNew">🔢 '+T('ליצור קוד','Create a code')+'</button><button class="btn sec" id="offBtType">⌨️ '+T('להקליד קוד','Type a code')+'</button></div>'+
      '<div id="offBtJoin" class="row2" hidden><input id="offBtCode" type="tel" inputmode="numeric" maxlength="4" dir="ltr" placeholder="0000" aria-label="'+T('הקוד מהטלפון השני','Code from the other phone')+'" class="offcodein"><button class="btn" id="offBtGo">'+T('להתחבר','Connect')+'</button></div>')+
    '<div id="offBtSt" class="offbtst" role="status" aria-live="polite"></div>'+
    (!bt.live&&p?'<button class="btn sec" id="offBtAgain" style="width:100%">🔄 '+T('להתחבר שוב ל'+esc(p.name||'הטלפון השני'),'Reconnect to '+esc(p.name||'the other phone'))+'</button>':'')+
    '<button class="btn sec" id="offBtDis" style="width:100%;margin-top:6px"'+(bt.live||p?'':' hidden')+'>🔌 '+T('לנתק ולשכוח את הטלפון הזה','Disconnect and forget')+'</button>';}
  else body+='<p class="muted-note">'+T('שולחים את הקוד שלי ב-SMS (אפשר גם לטלפון בלי אינטרנט), ובטלפון השני מדביקים אותו למטה. הקוד ארוך — זה תקין.','Send my code by SMS and paste it on the other phone. It is long — that is fine.')+'</p>'+
    '<label class="il" for="offMine">'+T('הקוד שלי','My code')+'</label><textarea id="offMine" class="offcode" readonly dir="ltr"></textarea>'+
    '<div class="row2"><a class="btn" id="offSms" href="#" role="button">✉️ '+T('לשלוח ב-SMS','Send by SMS')+'</a><button class="btn sec" id="offCopy">📋 '+T('להעתיק','Copy')+'</button></div>'+
    '<label class="il" for="offIn">'+T('קיבלתי קוד מהטלפון השני','I got a code')+'</label><textarea id="offIn" class="offcode" dir="ltr" placeholder="YAM1..."></textarea>'+
    '<button class="btn" id="offGo" style="width:100%">🔄 '+T('למזג את הרשימות','Merge the lists')+'</button>';
  if(OFF_APP){const ok=diagOk();
    body+='<div class="offdiag">'+(ok==null?'<p>🐞 '+T('לשלוח בסנכרון גם דיווח אנונימי על תקלות באפליקציה (גרסה, דגם הטלפון ותיאור התקלה — בלי שם ובלי הרשימות), כדי שנוכל לתקן?','Also send anonymous error reports on sync?')+'</p><div class="row2"><button class="btn sec" data-offdiag="1">'+T('כן, מסכים','Yes')+'</button><button class="btn sec" data-offdiag="0">'+T('לא, תודה','No thanks')+'</button></div>'
      :'<label class="radio"><input type="checkbox" id="offDiagCb"'+(ok==='1'?' checked':'')+'> 🐞 '+T('לשלוח בסנכרון דיווח אנונימי על תקלות','Send anonymous error reports on sync')+'</label>')+'</div>';}
  else body+='<div class="offdiag"><button class="btn sec" id="offDlInfo" type="button" style="width:100%">📴 '+T('להוריד את "רשימת קניות אופליין" — לטלפון בלי אינטרנט','Download the offline app')+'</button>'+
    '<p class="muted-note">'+T('אפליקציה בלי אינטרנט בכלל (גם לא דרכה): רשימות, מזווה והיסטוריה, באותו עיצוב. מעבירים אליה את הקובץ ומסנכרנים איתה מכאן.','A no-internet app: lists, pantry and history. Sync with it from here.')+'</p></div>';
  body+='</div>';
  openSheet('📡 '+T('סנכרון בלי אינטרנט','Offline sync'),body);
  if(curTab==='qr'){showQr();noCam().then(n=>{const b=$o('#offScan'),o=$o('#offQrOr');if(!n||!b)return;b.hidden=true;if(o)o.textContent='🔳 '+T('הקוד שלי — סורקים אותו מהמחשב או מהטלפון:','My code — scan it from the computer or phone:');});}else if(curTab==='code')showCode();else btShow();}
/* נגן / מכשיר בלי מצלמה: אין מה לסרוק בו */
async function noCam(){try{if(!(navigator.mediaDevices&&navigator.mediaDevices.enumerateDevices))return true;const d=await navigator.mediaDevices.enumerateDevices();
  return d.length>0&&!d.some(x=>x.kind==='videoinput');}catch(e){return false;}}
window.offSyncOpen=open;

document.addEventListener('click',e=>{const t=e.target;if(!t||!t.closest)return;
  if(t.closest('#offDlInfo,#miOffApk')){e.preventDefault();const m=$o('#hMenu');if(m)m.classList.remove('open');dlSheet();return;}
  if(t.closest('#shOff,.offpill,#miOff,#btnOff')){e.preventDefault();const m=$o('#hMenu');if(m)m.classList.remove('open');const r=$o('#shareRow');if(r)r.classList.remove('open');open();return;}
  if(!t.closest('.offsync'))return;
  const tb=t.closest('[data-offt]');if(tb){open(tb.dataset.offt);return;}
  if(t.closest('#offDl')){try{sb&&sb.rpc('apk_log',{p_kind:'download',p_src:'offline',p_device:'',p_dev:devId(),p_ver:''}).then(()=>{},()=>{});}catch(er){}
    if(inAppSave()){e.preventDefault();appDl(t.closest('#offDl'));}return;}
  if(t.closest('#offScan')){scanQr();return;}
  if(t.closest('#offBtNew')){btCreate();return;}
  if(t.closest('#offBtType')){const j=$o('#offBtJoin');if(j){j.hidden=false;$o('#offBtCode').focus();}return;}
  if(t.closest('#offBtGo')){btJoin();return;}
  if(t.closest('#offBtAgain')){bt.retry=0;btAuto();return;}
  if(t.closest('#offBtDis')){btForget();return;}
  if(t.closest('#offCopy')){const v=($o('#offMine')||{}).value||'';(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(v):Promise.reject()).then(()=>flash('📋 '+T('הועתק','Copied')),()=>{const x=$o('#offMine');x.select();try{document.execCommand('copy');flash('📋 '+T('הועתק','Copied'));}catch(er){}});return;}
  if(t.closest('#offGo')){const v=($o('#offIn')||{}).value||'';got(v,'code');return;}
  const dg=t.closest('[data-offdiag]');if(dg){ls.set(LS_OK,dg.dataset.offdiag);if(dg.dataset.offdiag==='0')ls.del(LS_DIAG);open();return;}
},true);
document.addEventListener('change',e=>{if(e.target&&e.target.id==='offDiagCb'){ls.set(LS_OK,e.target.checked?'1':'0');if(!e.target.checked)ls.del(LS_DIAG);}});

/* 📴 מסך הפתיחה באפליקציה האופליין: אותו מסך כניסה של האתר (לוגו ועיצוב), אבל רק "מה השם שלך?" ונכנסים.
   אין חשבון ואין סיסמה — השם נשמר רק בטלפון, ומוצג לטלפון השני בסנכרון ("מחובר ל..."). הוא לא נשלח אלינו */
function offWelcome(){const lc=$o('#login .lcard');if(!lc)return;$o('#login').classList.add('offw');const le=$o('#loginErr');if(le)le.textContent='';
  if(!$o('#offName')){const h=lc.querySelector('h1'),p=lc.querySelector('p');
    if(h)h.textContent=T('רשימת קניות אופליין','Offline shopping list');
    if(p)p.textContent=T('רשימת קניות לכל הבית — בלי אינטרנט בכלל. מסנכרנים עם המשפחה בבלוטות\', בקוד QR או בקוד שיתוף.','A shopping list with no internet at all. Sync with family by Bluetooth, QR or a share code.');
    (p||h||lc).insertAdjacentHTML('afterend','<div class="offwel"><label class="il" for="offName">'+T('מה השם שלך?','What is your name?')+'</label>'+
      '<input id="offName" maxlength="40" autocomplete="name" placeholder="'+T('למשל: משפחת כהן','e.g. The Cohens')+'"><button id="offEnter" class="btn" type="button">'+T('כניסה','Enter')+'</button></div>');
    const go=()=>{const n=String($o('#offName').value||'').replace(/[<>]/g,'').trim().slice(0,40);
      if(!n){flash(T('כותבים שם — כך יראו אותך בטלפון השני בסנכרון','Type a name'));$o('#offName').focus();return;}
      state.user={name:n,email:'',offline:true};save();try{hideLogin();afterEnter();}catch(e){}try{mount();}catch(e){}};
    $o('#offEnter').onclick=go;$o('#offName').onkeydown=e=>{if(e.key==='Enter')go();};}
  try{showLogin();}catch(e){}}
if(OFF_APP&&!(state.user&&state.user.offline&&state.user.name))offWelcome();
/* 📴 לשוניות שכולן אינטרנט (חנויות, מחירים, מבצעים קרובים) — גם אם מגיעים אליהן מקישור או מיאמי, נשארים ברשימה */
if(OFF_APP&&typeof setTab==='function'){const _st=setTab;setTab=function(t){return _st.apply(this,/^(stores|prices|neardeals)$/.test(t)?['list']:arguments);};}
const myName=()=>String((state.user&&state.user.name)||'').slice(0,40);

/* ---------- ⬇️ איך מורידים את האפליקציה האופליין: מהתפריט, מחלון הסנכרון, או בקישור yamshopping.com/#offapk ---------- */
function dlSheet(){
  openSheet('📴 '+T('האפליקציה האופליין','The offline app'),'<div class="offsync">'+
    '<p class="muted-note">'+T('"רשימת קניות אופליין" — אפליקציה לאנדרואיד בלי אינטרנט בכלל (גם לא דרכה), לטלפונים כשרים, לנגנים ולמי שאין לו אינטרנט. אותו עיצוב, ומסנכרנים אותה עם האתר או עם האפליקציה בבלוטות\', ב-QR או בקוד.','An Android app with no internet at all. Same design; sync it with the site or app by Bluetooth, QR or code.')+'</p>'+
    '<a class="btn" id="offDl" href="/download/yamshopping-offline.apk" download="yamshopping-offline.apk" style="display:block;text-align:center;text-decoration:none">⬇️ '+T('הורדת האפליקציה האופליין (APK)','Download the offline app (APK)')+'</a>'+
    '<ol class="offsteps"><li>'+T('מורידים כאן — בטלפון עם אינטרנט או במחשב.','Download here, on a phone with internet or a computer.')+'</li>'+
    '<li>'+T('אם הטלפון שבו תשתמשו בלי אינטרנט: מעבירים אליו את הקובץ בכבל USB, בכרטיס זיכרון או בבלוטות\'.','For a phone without internet: copy the file over by USB cable, memory card or Bluetooth.')+'</li>'+
    '<li>'+T('פותחים את הקובץ בטלפון. אם הוא שואל — מאשרים "התקנה ממקור זה", ואז "התקנה".','Open the file. If asked, allow "Install from this source", then Install.')+'</li>'+
    '<li>'+T('פותחים את "רשימת קניות אופליין", כותבים שם — ונכנסים.','Open the app, type a name, and you are in.')+'</li></ol>'+
    '<p class="muted-note">🔗 '+T('לשלוח למישהו: ','To share: ')+'<span dir="ltr">yamshopping.com/#offapk</span></p></div>');}
window.offDlSheet=dlSheet;
/* בתוך האפליקציה הרגילה קישור הורדה רגיל נשלח לדפדפן של הטלפון — ובטלפון מסונן בלי דפדפן הוא נתקע.
   לכן שם מורידים את הקובץ כאן (מהאתר שלנו, עם התקדמות) ושומרים אותו ישר בתיקיית ההורדות (YamApp.saveFile) */
const inAppSave=()=>{try{return !OFF_APP&&!!(window.YamApp&&typeof YamApp.saveFile==='function');}catch(e){return false;}};
let dlBusy=false;
async function appDl(a){if(dlBusy)return;dlBusy=true;const txt=a.textContent,set=s=>{a.textContent=s;};
  try{set('⏳ '+T('מורידים...','Downloading...'));
    const r=await fetch(a.getAttribute('href'),{cache:'no-cache'});if(!r.ok)throw new Error('http '+r.status);
    const total=+r.headers.get('content-length')||0,rd=r.body&&r.body.getReader?r.body.getReader():null;let blob;
    if(rd){const parts=[];let got=0;for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;if(total)set('⏳ '+T('מורידים... ','Downloading... ')+Math.min(99,Math.round(got/total*100))+'%');}
      blob=new Blob(parts,{type:'application/vnd.android.package-archive'});}
    else blob=await r.blob();
    if(blob.size<100000)throw new Error('short');
    const b64=await new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>{const d=String(fr.result);ok(d.slice(d.indexOf(',')+1));};fr.onerror=no;fr.readAsDataURL(blob);});
    YamApp.saveFile(a.getAttribute('download')||'yamshopping-offline.apk','application/vnd.android.package-archive',b64);
    set('✅ '+T('נשמר בתיקיית ההורדות','Saved to Downloads'));
    const st=a.parentNode&&a.parentNode.querySelector('.offsteps');if(st&&!a.parentNode.querySelector('.offsaved'))st.insertAdjacentHTML('beforebegin','<p class="offok offsaved">📁 '+T('הקובץ yamshopping-offline.apk נמצא עכשיו בתיקיית "הורדות" (Downloads) של הטלפון. פותחים אותו מאפליקציית הקבצים כדי להתקין, או מעבירים אותו לטלפון השני.','The file is now in the phone\'s Downloads folder.')+'</p>');}
  catch(er){set(txt);flash(T('⚠️ ההורדה לא הצליחה — בודקים חיבור ומנסים שוב','⚠️ Download failed — check the connection and try again'));}
  finally{dlBusy=false;}}
if(!OFF_APP&&(/^#offapk$/i.test(location.hash)||/[?&]offapk(=|&|$)/i.test(location.search)))setTimeout(dlSheet,700);

/* ---------- כפתור הכניסה: בשורת "שיתוף עם המשפחה וגיבוי", ובאפליקציה האופליין גם פס קבוע מעל הרשימה ---------- */
function mount(){const k=$o('#shKeep');if(k&&!$o('#shOff'))k.insertAdjacentHTML('beforeend','<button id="shOff">📡 '+T('סנכרון בלי אינטרנט','Offline sync')+'</button>');
  /* גם בתפריט (⚙️), ליד "מצב קנייה בחנות" — שלא יצטרכו לחפש בחלון השיתוף */
  /* 📡 בכותרת, לפני הצ'אט והפעמון — הדרך הכי מהירה להתחבר. נקודה ירוקה כשיש חיבור חי */
  const hb=$o('#btnChat')||$o('#btnBell')||$o('#btnMenu');if(hb&&!$o('#btnOff'))hb.insertAdjacentHTML('beforebegin','<button class="hbtn" id="btnOff" type="button" title="'+T('סנכרון בלי אינטרנט','Offline sync')+'" aria-label="'+T('סנכרון בלי אינטרנט — בלוטות\', QR או קוד','Offline sync')+'">'+
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="7" height="14" rx="1.6"/><rect x="14.5" y="5" width="7" height="14" rx="1.6"/><path d="M10.5 10h3M12 8.5l1.5 1.5-1.5 1.5M13.5 14h-3M12 12.5L10.5 14l1.5 1.5"/></svg><i class="offdot" hidden></i></button>');
  {const d=$o('#btnOff .offdot');if(d)d.hidden=!bt.live;}
  /* ⬇️ הורדת האפליקציה האופליין — בתפריט, ליד הורדת האפליקציה הרגילה (באתר ובאפליקציה הרגילה) */
  const ap=!OFF_APP&&($o('#miApk53')||$o('#miInstall')||$o('#miShop26')||$o('#miFinish'));if(ap&&!$o('#miOffApk'))ap.insertAdjacentHTML('afterend','<button id="miOffApk">📴<span>'+T('הורדת האפליקציה האופליין (בלי אינטרנט)','Download the offline app (no internet)')+'</span></button>');
  const an=$o('#miShop26')||$o('#miFinish');if(an&&!$o('#miOff'))an.insertAdjacentHTML('beforebegin','<button id="miOff">📡<span>'+T('סנכרון בלי אינטרנט (בלוטות\', QR, קוד)','Offline sync (Bluetooth, QR, code)')+'</span></button>');
  if(!OFF_APP)return;const pane=$o('#paneList');if(!pane)return;let p=$o('.offpill');
  if(!p){pane.insertAdjacentHTML('afterbegin','<button class="offpill" type="button"></button>');p=$o('.offpill');}
  const last=+ls.get(LS_LAST)||0,pn=pendingN();p.textContent=bt.live?'🟢 '+T('מחובר ל'+(bt.name||'הטלפון השני')+' · סנכרון חי','Live sync with '+(bt.name||'the other phone')):'📡 '+T('סנכרון','Sync')+' · '+ago(last)+(pn&&last?' · '+T(pn+' שינויים ממתינים',pn+' pending'):'');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
const _offRender=render;render=function(){const r=_offRender.apply(this,arguments);try{mount();}catch(e){}return r;};

document.head.insertAdjacentHTML('beforeend','<style id="offsync87">'+
  '.offsync .offst{margin:0 0 6px;color:var(--muted);font-size:13px}'+
  '.offsync .offok{background:#e8f7ee;color:#14532d;border:1px solid #9ad6b0;border-radius:12px;padding:8px 10px;margin:0 0 8px;font-size:14px}'+
  '.offqrbox{display:flex;flex-direction:column;align-items:center;margin:6px 0 10px}.offqr{width:min(78vw,300px);background:#fff;padding:6px;border-radius:12px}.offqr svg{display:block;width:100%;height:auto}'+
  '.offqrn{margin:6px 0 0;font-size:13px;color:var(--muted)}'+
  '.offqs{position:fixed;inset:0;z-index:99999;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px}'+
  '.offqsv{position:relative;width:min(86vw,60vh);aspect-ratio:1;overflow:hidden;border-radius:16px;background:#111}.offqsv video{width:100%;height:100%;object-fit:cover}'+
  '.offqsv i{position:absolute;inset:5%;border:3px solid #fff;border-radius:12px;box-shadow:0 0 0 999px rgba(0,0,0,.35)}'+
  '#offQsHint{margin:0;text-align:center;font-size:16px;max-width:420px}.offqsb{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.offqsb .btn{cursor:pointer}'+
  '.offcode{width:100%;min-height:64px;font:12px/1.35 monospace;word-break:break-all;margin-bottom:6px}'+
  '.offsync .row2{display:flex;gap:8px;margin:6px 0}.offsync .row2>*{flex:1;text-align:center}'+
  '.offbtst{min-height:1.4em;font-size:14px;margin:6px 0}.offbig{font:700 44px/1.1 monospace;letter-spacing:10px;text-align:center;margin:6px 0 4px;color:var(--hdr2)}'+
  '.offcodein{font:700 24px monospace;letter-spacing:8px;text-align:center}'+
  '.offdiag{margin-top:12px;padding-top:10px;border-top:1px solid var(--line);font-size:14px}'+
  /* מסך הפתיחה: לוגו, כותרת, משפט אחד, ו"מה השם שלך?" — בלי שאר חלקי הכניסה (מייל, גוגל, בקשת אישור) */
  'html.offapp #login.offw .lcard>*{display:none!important}html.offapp #login.offw .lcard>#loginLogo{display:flex!important;order:-3;margin-top:auto!important}'+
  'html.offapp #login.offw#login .lcard>h1{display:block!important;order:-2}html.offapp #login.offw#login .lcard>p{display:block!important;order:-1}'+
  'html.offapp #login.offw .lcard>.offwel{display:flex!important;order:0;margin-bottom:auto!important}html.offapp #login.offw #btnLoginReq#btnLoginReq#btnLoginReq{display:none!important}'+
  '.offwel{flex-direction:column;gap:10px;margin-top:8px}.offwel input{font-size:18px}'+
  '#btnOff{position:relative}#btnOff .offdot{position:absolute;top:6px;inset-inline-end:6px;width:9px;height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 2px var(--hdr,#fff)}'+
  '.offsteps{margin:10px 0 6px;padding-inline-start:20px;line-height:1.55}.offsteps li{margin-bottom:4px}'+
  '.offpill{display:block;width:100%;margin:0 0 8px;padding:8px 12px;border:1px solid var(--chipbr);border-radius:14px;background:var(--inputbg);color:var(--text);font:inherit;font-size:14px;text-align:start;cursor:pointer}'+
  '@media (prefers-color-scheme:dark){.offsync .offok{background:#12301f;color:#c9f0d6;border-color:#2f6b47}}'+
  /* 📴 באפליקציה האופליין: מסתירים את מה שדורש אינטרנט (מחירים, וואטסאפ, ג׳ימייל) */
  'html.offapp .tab[data-t="prices"],html.offapp .tabx14,html.offapp #shWa,html.offapp #shGmail,html.offapp #btnChat,html.offapp #btnBell,html.offapp #btnShareSite,html.offapp #botFab,'+
  ['miMail','miBizDir','miMyOrders','miSave26','miWeek26','miCl27','miAlert26','miUpload','miProdUp','miDeal','miChatSite','miReviews','miTop26','miInv26','miComm44','miNews29','miNetfree','miMembers','miMerge20','miAcct','miLogout','miDelete','miTour','miLock51'].map(i=>'html.offapp #'+i).join(',')+','+
  /* חנויות, סניפים, מבצעים, "מוצר אחד" וביגוד — הכל נתונים מהאינטרנט; PRO וצבעי לוגו נעולים (קנייה דורשת אינטרנט); התראות וירידות מחיר; מוניטין (נקודות על פרסום מחירים) */
  'html.offapp .r2tile[data-r2tile="2"],html.offapp #r2s2,html.offapp .r2tc,html.offapp .pro2tag,html.offapp .r2pro,html.offapp [data-metab="rep"],html.offapp details.mgrp[data-g="acct"]{display:none!important}html.offapp .r2tile[data-r2tile="3"]{grid-column:1/-1}'+
  '.offtabs{display:flex;gap:6px;margin:4px 0 8px}.offtabs button{flex:1;border:1px solid var(--chipbr);background:var(--inputbg);color:var(--text);border-radius:18px;padding:8px 6px;font:inherit;font-size:14px;cursor:pointer}'+
  '.offtabs button[aria-selected=true]{background:var(--hdr2);border-color:var(--hdr2);color:#fff;font-weight:700}'+
  '</style>');
})();
