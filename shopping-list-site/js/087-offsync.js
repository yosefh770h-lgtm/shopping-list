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
const PFX='YAM1',PART=600,LS_LAST='yam_off_last',LS_PEERS='yam_off_peers',LS_DIAG='yam_off_diag',LS_OK='yam_off_diag_ok';
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
async function pack(){
  const o={v:1,dev:devId(),at:Date.now(),off:OFF_APP?1:0,net:!OFF_APP&&!!sb&&navigator.onLine!==false?1:0,
    lists:state.lists,tomb:state.tomb,pantry:state.pantry,customPantry:state.customPantry,plans:state.plans,history:(state.history||[]).slice(0,30)};
  if(OFF_APP){const ai=appInfo();o.ver=String(ai.ver||'');o.model=String(ai.model||'');o.android=String(ai.android||'');
    if(diagOk()==='1'){const d=jget(LS_DIAG,[]);if(Array.isArray(d)&&d.length)o.diag=d.slice(-20);}}
  return PFX+(await zip(JSON.stringify(o)));}
window.offPack=pack;

/* ---------- מיזוג חבילה שהגיעה ---------- */
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const arr=x=>Array.isArray(x)?x:[];
function snap(){const m={};(state.lists||[]).forEach(l=>(l.items||[]).forEach(i=>{if(i)m[l.id+'|'+i.id]=(i.ts||0)+'|'+(i.done?1:0)+'|'+(i.q||'');}));return m;}
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
  const a=snap();
  try{applyRemote(remote,false);}catch(e){flash(T('⚠️ המיזוג נכשל','⚠️ Merge failed'));try{window.logClientError&&logClientError('offsync merge: '+e.message,'087');}catch(x){}return null;}
  save();try{render();}catch(e){}
  const b=snap();let add=0,upd=0,del=0;for(const k in b){if(!(k in a))add++;else if(b[k]!==a[k])upd++;}for(const k in a)if(!(k in b))del++;
  const name=String(peer||o.model||'').replace(/[<>]/g,'').slice(0,40);
  const peers=obj(jget(LS_PEERS,{}));peers[String(o.dev||'?').slice(0,40)]={at:Date.now(),via,name,off:o.off?1:0};ls.set(LS_PEERS,JSON.stringify(peers));ls.set(LS_LAST,String(Date.now()));
  /* הצד השני מחובר לאינטרנט וקיבל את התקלות שלנו — אפשר למחוק אותן מהטלפון */
  if(OFF_APP&&o.net)ls.del(LS_DIAG);
  if(!OFF_APP&&o.off)relay(o);
  try{window.YamApp&&typeof YamApp.buzz==='function'&&YamApp.buzz(80);}catch(e){}
  return {add,upd,del,name,off:!!o.off};}
window.offMerge=merge;

/* האפליקציה האופליין "נראתה" + התקלות שלה → לבק אופיס, דרך הטלפון הזה (שיש בו אינטרנט) */
function relay(o){if(!sb||navigator.onLine===false)return;
  const dev=/^[0-9a-f-]{36}$/.test(o.dev||'')?o.dev:'',ver=String(o.ver||'').replace(/[^0-9.]/g,'').slice(0,12);
  const device=[String(o.model||'').replace(/[^A-Za-z0-9 ._()-]/g,'').slice(0,30),o.android?'Android '+String(o.android).replace(/[^0-9.]/g,'').slice(0,6):''].filter(Boolean).join(' · ');
  try{sb.rpc('apk_log',{p_kind:'off_open',p_src:'offline',p_device:device,p_dev:dev,p_ver:ver}).then(()=>{},()=>{});}catch(e){}
  arr(o.diag).slice(0,20).forEach(d=>{if(!d||typeof d.m!=='string')return;
    try{sb.rpc('log_client_error',{p_msg:d.m.slice(0,500),p_src:('📴 אופליין · '+String(d.s||'')).slice(0,300),p_ua:('YamShoppingOffline/'+ver).slice(0,200),p_ver:String(d.v||'').slice(0,12),p_app:ver,p_device:device,p_dev:dev}).then(()=>{},()=>{});}catch(e){}});}

/* ---------- 🔳 QR ---------- */
let qrTimer=0,rx={};
function qrSvg(Z,text){const h=new Map();h.set(Z.EncodeHintType.ERROR_CORRECTION,Z.QRCodeDecoderErrorCorrectionLevel.L);h.set(Z.EncodeHintType.MARGIN,2);
  const m=new Z.QRCodeWriter().encode(text,Z.BarcodeFormat.QR_CODE,0,0,h),w=m.getWidth();let d='';
  for(let y=0;y<w;y++)for(let x=0;x<w;x++)if(m.get(x,y))d+='M'+x+' '+y+'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+w+'" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="'+w+'" height="'+w+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';}
async function showQr(){clearInterval(qrTimer);const box=$o('#offQr');if(!box)return;box.innerHTML='<p class="muted-note">⏳</p>';
  let Z;try{Z=await loadZxing();}catch(e){box.innerHTML='<p class="muted-note">'+T('הקוד לא נטען','Could not load')+'</p>';return;}
  const code=(await pack()).slice(PFX.length),sid=Math.random().toString(36).slice(2,6).padEnd(4,'0'),n=Math.ceil(code.length/PART);
  const parts=n<=1?[PFX+code]:Array.from({length:n},(_,i)=>'Y1:'+sid+':'+(i+1)+':'+n+':'+code.slice(i*PART,(i+1)*PART));
  let i=0;const draw=()=>{if(!document.body.contains(box)){clearInterval(qrTimer);return;}
    box.innerHTML='<div class="offqr">'+qrSvg(Z,parts[i])+'</div>'+(n>1?'<p class="offqrn">'+T('קוד '+(i+1)+' מתוך '+n+' — מתחלף לבד, ממשיכים לכוון','Code '+(i+1)+' of '+n)+'</p>':'');i=(i+1)%n;};
  draw();if(n>1)qrTimer=setInterval(draw,900);}
/* נקרא מהסורק (js/009.js): 'more' = עוד חלקים, המצלמה נשארת פתוחה; 'done' = נקלט; null = לא שלנו */
window.offQrTake=function(code){code=String(code||'').trim();
  if(/^YAM1[zj]/.test(code)){got(code,'qr');return 'done';}
  const m=code.match(/^Y1:([a-z0-9]{4}):(\d{1,3}):(\d{1,3}):([A-Za-z0-9_-]*)$/);if(!m)return null;
  const n=+m[3];if(rx.sid!==m[1])rx={sid:m[1],n,p:{}};rx.p[m[2]]=m[4];const k=Object.keys(rx.p).length;
  if(k<n){const h=$o('#scanHint');if(h)h.textContent='📡 '+T('נקלטו '+k+' מתוך '+n+' — ממשיכים לכוון אל הקוד','Got '+k+' of '+n+' — keep pointing');return 'more';}
  const full=PFX+Array.from({length:n},(_,i)=>rx.p[i+1]||'').join('');rx={};got(full,'qr');return 'done';};
function scanQr(){rx={};if(typeof openBarcodeScanner!=='function')return;
  openBarcodeScanner(()=>flash(T('זה ברקוד של מוצר — סורקים את קוד ה-QR של הסנכרון בטלפון השני','That is a product barcode — scan the sync QR')));
  setTimeout(()=>{const h=$o('#scanHint');if(h)h.textContent='📡 '+T('מכוונים אל קוד הסנכרון בטלפון השני','Point at the sync code on the other phone');},300);}

/* ---------- אחרי שהגיעה חבילה (מכל דרך) ---------- */
async function got(code,via,peer){const r=await merge(code,via,peer);if(!r)return;
  const msg='✅ '+T('סונכרן','Synced')+(r.name?' '+T('עם','with')+' '+r.name:'')+': '+T('נוספו '+r.add+', עודכנו '+r.upd+(r.del?', נמחקו '+r.del:''),r.add+' added, '+r.upd+' updated'+(r.del?', '+r.del+' removed':''));
  flash(msg);
  /* ב-QR ובקוד: עכשיו הטלפון השני צריך לקבל את מה שיש כאן (כבר כולל את מה שהגיע ממנו) */
  open(via==='bt'?'bt':via==='code'?'code':'qr',msg+(via==='bt'?'':'<br>👉 '+T('עכשיו בטלפון השני סורקים / מדביקים את הקוד שלי — כדי ששניהם יהיו מעודכנים','Now let the other phone take my code too')));}

/* ---------- 🔵 בלוטות' ---------- */
let btDevs={};
const btSt=t=>{const e=$o('#offBtSt');if(e)e.innerHTML=t;};
window.offBt=function(e){if(!e||typeof e!=='object')return;
  if(e.t==='dev'){if(!e.addr||btDevs[e.addr])return;btDevs[e.addr]=1;const l=$o('#offBtDevs');if(l)l.insertAdjacentHTML('beforeend','<button class="btn sec offdev" data-btaddr="'+esc(e.addr)+'">'+(e.paired==='1'?'🔗 ':'📱 ')+esc(e.name||e.addr)+'</button>');return;}
  if(e.t==='got'){got(e.data,'bt',e.name);return;}
  const S={none:T('אין בלוטות\' בטלפון הזה — משתמשים ב-QR או בקוד','No Bluetooth on this phone — use QR or code'),
    perm:T('צריך לאשר את הרשאת הבלוטות\' (מכשירים בקרבת מקום) — לוחצים שוב ומאשרים','Allow the Bluetooth permission and try again'),
    off:T('הבלוטות\' כבוי — מדליקים ולוחצים שוב','Bluetooth is off'),
    wait:'⏳ '+T('מחכה לטלפון השני... שם לוחצים "לחפש טלפון" ובוחרים: ','Waiting... on the other phone tap "Find" and pick: ')+'<b>'+esc(e.name||'')+'</b>',
    search:'🔎 '+T('מחפש טלפונים קרובים...','Searching...'),
    found:e.scan==='0'?T('לא רואים את הטלפון? מצמדים אותם פעם אחת בהגדרות הבלוטות\' של הטלפון, וחוזרים לכאן','Not listed? Pair the phones once in Bluetooth settings'):T('לוחצים על הטלפון השני ברשימה','Tap the other phone'),
    busy:'🔄 '+T('מתחבר ל','Connecting to ')+esc(e.name||'')+'...',
    fail:'⚠️ '+T('החיבור נכשל. בטלפון השני צריך ללחוץ "לחכות לטלפון השני" — ואז מנסים שוב','Connection failed. On the other phone tap "Wait", then retry'),
    stopped:''};
  btSt(S[e.s]!=null?S[e.s]:'');};
async function btGo(kind,addr){const a=nat();if(!a)return;btSt('⏳');const p=await pack();
  try{if(kind==='host')a.btHost(p);else if(kind==='find'){btDevs={};const l=$o('#offBtDevs');if(l)l.innerHTML='';a.btFind(p);}else a.btConnect(addr,p);}catch(e){btSt('⚠️ '+esc(e.message||''));}}

/* ---------- ✉️ קוד שיתוף ---------- */
async function showCode(){const t=$o('#offMine');if(!t)return;t.value=await pack();
  const sms=$o('#offSms');if(sms)sms.onclick=e=>{const a=nat();
    if(a&&typeof a.shareText==='function'){e.preventDefault();a.shareText(t.value);}else sms.href='sms:?body='+encodeURIComponent(t.value);};}

/* ---------- המסך ---------- */
let curTab='qr';
function ago(ts){if(!ts)return T('עוד לא סונכרן','Never synced');const m=Math.round((Date.now()-ts)/60000);
  return T('סונכרן ','Synced ')+(m<2?T('עכשיו','just now'):m<60?T('לפני '+m+' דקות',m+' min ago'):m<1440?T('לפני '+Math.round(m/60)+' שעות',Math.round(m/60)+' h ago'):T('לפני '+Math.round(m/1440)+' ימים',Math.round(m/1440)+' days ago'));}
function pendingN(){const last=+ls.get(LS_LAST)||0;let n=0;(state.lists||[]).forEach(l=>(l.items||[]).forEach(i=>{if(i&&(i.ts||0)>last)n++;}));return n;}
function open(tab,note){
  if(tab)curTab=tab;if(curTab==='bt'&&!hasBt())curTab='qr';
  try{const a=nat();a&&typeof a.btStop==='function'&&a.btStop();}catch(e){}
  const last=+ls.get(LS_LAST)||0,pn=pendingN();
  const tabs=[['qr','🔳 QR'],...(hasBt()?[['bt','🔵 '+T('בלוטות\'','Bluetooth')]]:[]),['code','✉️ '+T('קוד שיתוף','Share code')]];
  let body='<div class="offsync"><p class="offst">'+ago(last)+(pn&&last?' · '+T(pn+' שינויים מאז',pn+' changes since'):'')+'</p>'+(note?'<div class="offok" role="status">'+note+'</div>':'')+
    '<div class="offtabs" role="tablist">'+tabs.map(t=>'<button role="tab" data-offt="'+t[0]+'" aria-selected="'+(t[0]===curTab)+'">'+t[1]+'</button>').join('')+'</div>';
  if(curTab==='qr')body+='<p class="muted-note">'+T('בטלפון אחד מציגים את הקוד, ובשני לוחצים "לסרוק". אחר כך מתחלפים — וכך שני הטלפונים מקבלים הכל.','One phone shows the code, the other scans. Then swap.')+'</p>'+
    '<div id="offQr" class="offqrbox"></div><button class="btn" id="offScan" style="width:100%">📷 '+T('לסרוק את הקוד של הטלפון השני','Scan the other phone\'s code')+'</button>';
  else if(curTab==='bt')body+='<p class="muted-note">'+T('בטלפון אחד לוחצים "לחכות", ובשני "לחפש" ובוחרים אותו. הרשימות מתאחדות בשני הטלפונים יחד.','One phone waits, the other finds it. Both get everything.')+'</p>'+
    '<div class="row2"><button class="btn" id="offBtHost">📥 '+T('לחכות לטלפון השני','Wait for the other phone')+'</button><button class="btn sec" id="offBtFind">🔎 '+T('לחפש טלפון','Find a phone')+'</button></div>'+
    '<p id="offBtSt" class="offbtst" role="status" aria-live="polite"></p><div id="offBtDevs" class="offdevs"></div>';
  else body+='<p class="muted-note">'+T('שולחים את הקוד שלי ב-SMS (אפשר גם לטלפון בלי אינטרנט), ובטלפון השני מדביקים אותו למטה. הקוד ארוך — זה תקין.','Send my code by SMS and paste it on the other phone. It is long — that is fine.')+'</p>'+
    '<label class="il" for="offMine">'+T('הקוד שלי','My code')+'</label><textarea id="offMine" class="offcode" readonly dir="ltr"></textarea>'+
    '<div class="row2"><a class="btn" id="offSms" href="#" role="button">✉️ '+T('לשלוח ב-SMS','Send by SMS')+'</a><button class="btn sec" id="offCopy">📋 '+T('להעתיק','Copy')+'</button></div>'+
    '<label class="il" for="offIn">'+T('קיבלתי קוד מהטלפון השני','I got a code')+'</label><textarea id="offIn" class="offcode" dir="ltr" placeholder="YAM1..."></textarea>'+
    '<button class="btn" id="offGo" style="width:100%">🔄 '+T('למזג את הרשימות','Merge the lists')+'</button>';
  if(OFF_APP){const ok=diagOk();
    body+='<div class="offdiag">'+(ok==null?'<p>🐞 '+T('לשלוח בסנכרון גם דיווח אנונימי על תקלות באפליקציה (גרסה, דגם הטלפון ותיאור התקלה — בלי שם ובלי הרשימות), כדי שנוכל לתקן?','Also send anonymous error reports on sync?')+'</p><div class="row2"><button class="btn sec" data-offdiag="1">'+T('כן, מסכים','Yes')+'</button><button class="btn sec" data-offdiag="0">'+T('לא, תודה','No thanks')+'</button></div>'
      :'<label class="radio"><input type="checkbox" id="offDiagCb"'+(ok==='1'?' checked':'')+'> 🐞 '+T('לשלוח בסנכרון דיווח אנונימי על תקלות','Send anonymous error reports on sync')+'</label>')+'</div>';}
  else body+='<div class="offdiag"><a class="btn sec" id="offDl" href="/download/yamshopping-offline.apk" style="display:block;text-align:center;text-decoration:none">📴 '+T('להוריד את "רשימת קניות אופליין" — לטלפון בלי אינטרנט','Download the offline app')+'</a>'+
    '<p class="muted-note">'+T('אפליקציה בלי אינטרנט בכלל (גם לא דרכה): רשימות, מזווה והיסטוריה, באותו עיצוב. מעבירים אליה את הקובץ ומסנכרנים איתה מכאן.','A no-internet app: lists, pantry and history. Sync with it from here.')+'</p></div>';
  body+='</div>';
  openSheet('📡 '+T('סנכרון בלי אינטרנט','Offline sync'),body);
  if(curTab==='qr')showQr();else if(curTab==='code')showCode();}
window.offSyncOpen=open;

document.addEventListener('click',e=>{const t=e.target;if(!t||!t.closest)return;
  if(t.closest('#shOff,.offpill')){e.preventDefault();open();return;}
  if(!t.closest('.offsync'))return;
  const tb=t.closest('[data-offt]');if(tb){open(tb.dataset.offt);return;}
  if(t.closest('#offDl')){try{sb&&sb.rpc('apk_log',{p_kind:'download',p_src:'offline',p_device:'',p_dev:devId(),p_ver:''}).then(()=>{},()=>{});}catch(er){}return;}
  if(t.closest('#offScan')){scanQr();return;}
  if(t.closest('#offBtHost')){btGo('host');return;}
  if(t.closest('#offBtFind')){btGo('find');return;}
  const dv=t.closest('[data-btaddr]');if(dv){btGo('connect',dv.dataset.btaddr);return;}
  if(t.closest('#offCopy')){const v=($o('#offMine')||{}).value||'';(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(v):Promise.reject()).then(()=>flash('📋 '+T('הועתק','Copied')),()=>{const x=$o('#offMine');x.select();try{document.execCommand('copy');flash('📋 '+T('הועתק','Copied'));}catch(er){}});return;}
  if(t.closest('#offGo')){const v=($o('#offIn')||{}).value||'';got(v,'code');return;}
  const dg=t.closest('[data-offdiag]');if(dg){ls.set(LS_OK,dg.dataset.offdiag);if(dg.dataset.offdiag==='0')ls.del(LS_DIAG);open();return;}
},true);
document.addEventListener('change',e=>{if(e.target&&e.target.id==='offDiagCb'){ls.set(LS_OK,e.target.checked?'1':'0');if(!e.target.checked)ls.del(LS_DIAG);}});

/* 📴 באפליקציה האופליין אין חשבון ואין כניסה — נכנסים ישר לרשימה, והכל נשמר בטלפון */
if(OFF_APP&&!(state.user&&state.user.offline&&!state.user.guest)){state.user={name:'',email:'',offline:true};save();
  try{hideLogin();afterEnter();}catch(e){}}

/* ---------- כפתור הכניסה: בשורת "שיתוף עם המשפחה וגיבוי", ובאפליקציה האופליין גם פס קבוע מעל הרשימה ---------- */
function mount(){const k=$o('#shKeep');if(k&&!$o('#shOff'))k.insertAdjacentHTML('beforeend','<button id="shOff">📡 '+T('סנכרון בלי אינטרנט','Offline sync')+'</button>');
  if(!OFF_APP)return;const pane=$o('#paneList');if(!pane)return;let p=$o('.offpill');
  if(!p){pane.insertAdjacentHTML('afterbegin','<button class="offpill" type="button"></button>');p=$o('.offpill');}
  const last=+ls.get(LS_LAST)||0,pn=pendingN();p.textContent='📡 '+T('סנכרון','Sync')+' · '+ago(last)+(pn&&last?' · '+T(pn+' שינויים ממתינים',pn+' pending'):'');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
const _offRender=render;render=function(){const r=_offRender.apply(this,arguments);try{mount();}catch(e){}return r;};

document.head.insertAdjacentHTML('beforeend','<style id="offsync87">'+
  '.offsync .offst{margin:0 0 6px;color:var(--muted);font-size:13px}'+
  '.offsync .offok{background:#e8f7ee;color:#14532d;border:1px solid #9ad6b0;border-radius:12px;padding:8px 10px;margin:0 0 8px;font-size:14px}'+
  '.offqrbox{display:flex;flex-direction:column;align-items:center;margin:6px 0 10px}.offqr{width:min(78vw,300px);background:#fff;padding:6px;border-radius:12px}.offqr svg{display:block;width:100%;height:auto}'+
  '.offqrn{margin:6px 0 0;font-size:13px;color:var(--muted)}'+
  '.offcode{width:100%;min-height:64px;font:12px/1.35 monospace;word-break:break-all;margin-bottom:6px}'+
  '.offsync .row2{display:flex;gap:8px;margin:6px 0}.offsync .row2>*{flex:1;text-align:center}'+
  '.offbtst{min-height:1.4em;font-size:14px}.offdevs{display:flex;flex-direction:column;gap:6px}'+
  '.offdiag{margin-top:12px;padding-top:10px;border-top:1px solid var(--line);font-size:14px}'+
  '.offpill{display:block;width:100%;margin:0 0 8px;padding:8px 12px;border:1px solid var(--chipbr);border-radius:14px;background:var(--inputbg);color:var(--text);font:inherit;font-size:14px;text-align:start;cursor:pointer}'+
  '@media (prefers-color-scheme:dark){.offsync .offok{background:#12301f;color:#c9f0d6;border-color:#2f6b47}}'+
  /* 📴 באפליקציה האופליין: מסתירים את מה שדורש אינטרנט (מחירים, וואטסאפ, ג׳ימייל) */
  'html.offapp .tab[data-t="prices"],html.offapp .tabx14,html.offapp #shWa,html.offapp #shGmail,html.offapp #btnChat,html.offapp #btnBell,html.offapp #btnShareSite,html.offapp #botFab,'+
  ['miMail','miBizDir','miMyOrders','miSave26','miWeek26','miCl27','miAlert26','miUpload','miProdUp','miDeal','miChatSite','miReviews','miTop26','miInv26','miComm44','miNews29','miNetfree','miMembers','miMerge20','miAcct','miLogout','miDelete'].map(i=>'html.offapp #'+i).join(',')+'{display:none!important}'+
  '.offtabs{display:flex;gap:6px;margin:4px 0 8px}.offtabs button{flex:1;border:1px solid var(--chipbr);background:var(--inputbg);color:var(--text);border-radius:18px;padding:8px 6px;font:inherit;font-size:14px;cursor:pointer}'+
  '.offtabs button[aria-selected=true]{background:var(--hdr2);border-color:var(--hdr2);color:#fff;font-weight:700}'+
  '</style>');
})();
