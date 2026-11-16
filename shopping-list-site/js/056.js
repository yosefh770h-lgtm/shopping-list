
(function(){
const $=s=>document.querySelector(s);
const inApp=/YamShoppingApp\//.test(navigator.userAgent);

/* ================= 🔐 כניסה והרשמה במייל וקוד — בלי צורך בגוגל ================= */
const card=$('#login .lcard');
if(card&&!$('#lSw51')){ /* עיצוב 2.0: גם באתר — כפתור "הרשמה חדשה" כמו בהדמיה (הלשוניות הישנות הוסתרו) */
  /* מעבר ברור בין כניסה להרשמה, מתחת לכפתור */
  $('#btnLogin').insertAdjacentHTML('afterend','<button type="button" class="lsw51" id="lSw51"></button>');
  /* הסבר קצר בהרשמה: רק מייל וקוד */
  $('#lfSignup').insertAdjacentHTML('afterbegin','<p class="lhint51" id="lHint51">'+T('הרשמה בחינם עם מייל וקוד שאתם בוחרים. נשלח למייל קישור לאישור — ונכנסים.','Free sign-up with your email and a code you choose. We email you a link to confirm.')+'</p>');
  /* "או" לפני גוגל. באפליקציה ישנה (לפני 2.0) גוגל חוסמת כניסה מתוך האפליקציה — שם לא מציגים את הכפתור */
  const g=$('#btnGoogle');
  if(g){g.insertAdjacentHTML('beforebegin','<div class="lor51" id="lOr51">'+T('או','or')+'</div>');if(inApp&&!appGoogleOK()){g.hidden=true;$('#lOr51').hidden=true;}}
  $('#lSw51').onclick=()=>{setLoginMode(loginMode==='signup'?'login':'signup');const f=loginMode==='signup'?$('#inName'):$('#inMail');try{f&&f.focus();}catch(e){}};
}
function swText(){/* עיצוב 2.0: כמו בהדמיה — "מייל" ו"סיסמה" (גם באתר) */
  {const im=$('#inMail'),ic=$('#inCode');if(im)im.placeholder=T('מייל','Email');if(ic)ic.placeholder=loginMode==='signup'?T('סיסמה (לפחות 8 תווים)','Password (8+ characters)'):T('סיסמה','Password');}
  const b=$('#lSw51');if(!b)return;
  b.innerHTML=loginMode==='signup'?T('כבר נרשמת? <b>כניסה</b>','Already registered? <b>Sign in</b>'):T('<b>הרשמה חדשה</b>','<b>Sign up</b>');
  const f=$('#btnForgot');if(f)f.hidden=loginMode==='signup';}
const _setMode=setLoginMode;
setLoginMode=function(m){const r=_setMode.apply(this,arguments);swText();return r;};
swText();

/* "שכחתי סיסמה" בלי מייל בשדה — שואלים את המייל, במקום להודיע שגיאה */
const fb=$('#btnForgot'),_forgot=fb&&fb.onclick;
if(inApp&&fb&&_forgot)fb.onclick=async function(ev){
  const m=$('#inMail');let v=(m.value||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){
    v=((await uiPrompt(T('לאיזה מייל לשלוח קישור לקביעת קוד חדש?','Which email should we send the reset link to?'),''))||'').trim().toLowerCase();
    if(!v)return;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){loginErr(T('נא להזין אימייל תקין','Enter a valid email'));return;}
    m.value=v;}
  fb.classList.remove('hl16');return _forgot.call(this,ev);};

/* קישור ישיר להרשמה: yamshopping.com/#signup (או ?signup) — נפתח מיד מסך ההרשמה */
const wantSignup=/^#(signup|register|הרשמה)$/i.test(decodeURIComponent(location.hash||''))||/[?&]signup\b/.test(location.search);
if(wantSignup)setTimeout(()=>{if(typeof authUser!=='undefined'&&authUser)return;showLogin();setLoginMode('signup');
  try{history.replaceState(null,'',location.pathname+location.search.replace(/[?&]signup\b(=[^&]*)?/,'').replace(/^&/,'?'));}catch(e){}},900);
window.signupLink51=()=>location.origin+'/#signup';

/* ================= 🔐 נעילת האתר במכשיר הזה: קוד מספרים, ואם יש — טביעת אצבע / זיהוי פנים =================
   רק אם המשתמש הפעיל. בלי הפעלה — האתר פתוח כמו תמיד. הכל נשמר רק במכשיר הזה (localStorage). */
const KEY='yam_lock51',SEEN='yam_lock51_seen';
const load=()=>{if(!inApp)return null;try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v&&v.hash?v:null;}catch(e){return null;}};
const store=v=>{try{if(v)localStorage.setItem(KEY,JSON.stringify(v));else localStorage.removeItem(KEY);}catch(e){}};
const b64=a=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4)),c=>c.charCodeAt(0));
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
async function pinHash(pin,salt){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
  return b64(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unb64(salt),iterations:150000,hash:'SHA-256'},k,256));}
/* טביעת אצבע / זיהוי פנים: דרך הדפדפן (WebAuthn) — עובד בכרום בטלפון ובמחשב, ובספארי באייפון */
async function bioAvailable(){try{return !!(window.PublicKeyCredential&&PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());}catch(e){return false;}}
async function bioCreate(){
  const u=(state&&state.user)||{};
  const c=await navigator.credentials.create({publicKey:{challenge:rnd(32),rp:{name:'YamShopping'},
    user:{id:rnd(16),name:u.email||u.name||'yamshopping',displayName:u.name||'YamShopping'},
    pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
    authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},timeout:60000,attestation:'none'}});
  return c?b64(c.rawId):'';}
async function bioCheck(id){
  const c=await navigator.credentials.get({publicKey:{challenge:rnd(32),allowCredentials:[{type:'public-key',id:unb64(id)}],userVerification:'required',timeout:60000}});
  return !!c;}

let locked=false,fails=0,waitUntil=0,entry='';
function unlock(){locked=false;fails=0;entry='';const o=$('#lock51');if(o)o.remove();document.documentElement.classList.remove('lock51');try{sessionStorage.setItem(SEEN,String(Date.now()));}catch(e){}}
function drawDots(){const d=$('#lock51 .dots');if(!d)return;d.innerHTML=Array.from({length:Math.max(4,entry.length)},(_,i)=>'<i'+(i<entry.length?' class="on"':'')+'></i>').join('');}
async function tryPin(){const L=load();if(!L){unlock();return;}
  if(Date.now()<waitUntil){$('#lock51 .err').textContent=T('נא להמתין ','Please wait ')+Math.ceil((waitUntil-Date.now())/1000)+T(' שניות',' s');return;}
  if(entry.length<L.len)return;
  if(await pinHash(entry,L.salt)===L.hash){unlock();return;}
  fails++;entry='';drawDots();const d=$('#lock51 .dots');d.classList.remove('bad');void d.offsetWidth;d.classList.add('bad');
  if(fails>=10){await forgot(true);return;}
  if(fails>=5)waitUntil=Date.now()+30000*(fails-4);
  $('#lock51 .err').textContent=T('הקוד לא נכון','Wrong code')+(fails>=5?' · '+T('נא להמתין ','wait ')+(30*(fails-4))+T(' שניות',' s'):'');}
async function useBio(){const L=load();if(!L||!L.bio)return;try{if(await bioCheck(L.bio))unlock();}catch(e){const er=$('#lock51 .err');if(er)er.textContent=T('לא זוהה — אפשר להקליד את הקוד','Not recognized — type your code');}}
/* שכחתי את קוד הנעילה: יוצאים מהחשבון ומבטלים את הנעילה. נכנסים שוב עם המייל והקוד */
async function forgot(auto){
  if(!auto&&!(await uiConfirm(T('לבטל את הנעילה? כדי לשמור על החשבון, נצא ממנו במכשיר הזה, ותיכנסו שוב עם המייל וקוד הכניסה.','Remove the lock? For safety you will be signed out on this device and sign in again with your email and code.'))))return;
  store(null);unlock();
  try{if(typeof doLogout==='function')await doLogout();}catch(e){}
  try{showLogin();}catch(e){}
  flash(auto?T('🔐 יותר מדי ניסיונות — יצאנו מהחשבון. נכנסים שוב עם המייל והקוד','🔐 Too many tries — signed out. Sign in again'):T('🔓 הנעילה בוטלה. נכנסים עם המייל והקוד','🔓 Lock removed. Sign in with your email and code'));}
function showLock(){const L=load();if(!L){document.documentElement.classList.remove('lock51');return;}
  if(locked&&$('#lock51'))return;locked=true;entry='';document.documentElement.classList.add('lock51');
  const o=document.createElement('div');o.id='lock51';o.setAttribute('role','dialog');o.setAttribute('aria-label',T('האתר נעול','Locked'));
  o.innerHTML='<div class="lk"><img src="/logo.png" alt=""><h2>🔒 '+T('האתר נעול','Locked')+'</h2><p>'+(L.bio?T('טביעת אצבע / זיהוי פנים, או קוד הנעילה','Fingerprint / face, or your lock code'):T('הקלידו את קוד הנעילה','Enter your lock code'))+'</p>'+
    '<div class="dots" aria-hidden="true"></div><div class="err" role="alert"></div>'+
    '<div class="pad">'+[1,2,3,4,5,6,7,8,9].map(n=>'<button data-k="'+n+'">'+n+'</button>').join('')+
    '<button class="ic" data-k="bio" aria-label="'+T('טביעת אצבע','Fingerprint')+'"'+(L.bio?'':' style="visibility:hidden"')+'>👆</button><button data-k="0">0</button><button class="ic" data-k="del" aria-label="'+T('מחיקה','Delete')+'">⌫</button></div>'+
    (L.bio?'<button class="bio" data-k="bio">👆 '+T('פתיחה בטביעת אצבע / פנים','Unlock with fingerprint / face')+'</button>':'')+
    '<div><button class="forgot" data-k="forgot">'+T('שכחתי את קוד הנעילה','Forgot my lock code')+'</button></div></div>';
  document.body.appendChild(o);drawDots();
  o.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;const k=b.dataset.k;
    if(k==='bio')useBio();else if(k==='forgot')forgot(false);else if(k==='del'){entry=entry.slice(0,-1);drawDots();}
    else if(entry.length<8){entry+=k;drawDots();if(entry.length>=L.len)tryPin();}});
  if(L.bio)setTimeout(useBio,350);}
document.addEventListener('keydown',e=>{if(!locked)return;const L=load();if(!L)return;
  if(/^\d$/.test(e.key)&&entry.length<8){entry+=e.key;drawDots();if(entry.length>=L.len)tryPin();e.preventDefault();}
  else if(e.key==='Backspace'){entry=entry.slice(0,-1);drawDots();e.preventDefault();}},true);
/* מתי ננעל: בפתיחה, וכשחוזרים לאתר אחרי הזמן שנבחר */
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{const L=load();if(!L)return;
  if(document.hidden){hiddenAt=Date.now();if(!L.after)document.documentElement.classList.add('lock51');}
  else if(hiddenAt&&Date.now()-hiddenAt>=L.after*60000)showLock();else if(!locked)document.documentElement.classList.remove('lock51');});
/* בפתיחה: אם כבר נפתח בלשונית הזאת בדקות האחרונות (רענון) — לא נועלים שוב */
(function(){const L=load();if(!L){document.documentElement.classList.remove('lock51');return;}
  let seen=0;try{seen=+sessionStorage.getItem(SEEN)||0;}catch(e){}
  if(seen&&L.after&&Date.now()-seen<L.after*60000){document.documentElement.classList.remove('lock51');return;}
  showLock();})();
window.addEventListener('pagehide',()=>{if(!locked)try{sessionStorage.setItem(SEEN,String(Date.now()));}catch(e){}});
/* יציאה מהחשבון מבטלת את הנעילה (שהמשתמש הבא במכשיר לא יינעל בחוץ) */
try{if(sb)sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT'&&load()){store(null);if(locked)unlock();}});}catch(e){}

/* ---------- ההגדרות: תפריט ⚙️ ← "נעילת האתר" ---------- */
async function openLock51(){
  const L=load(),bioOk=await bioAvailable();
  const ov=document.createElement('div');ov.className='qp15 open';ov.id='lkSet51';
  const close=()=>ov.remove();
  const draw=(view)=>{const L=load();let h='<div class="qpcard lk51"><div class="qphead"><b>🔐 '+T('נעילת האתר במכשיר הזה','Lock the site on this device')+'</b><button aria-label="'+T('סגירה','Close')+'" data-x>✕</button></div>';
    if(view==='pin'){
      h+='<p class="note" style="margin:0 0 8px">'+T('בוחרים קוד של 4 עד 8 ספרות. הקוד נשמר רק במכשיר הזה, מוצפן.','Pick a 4–8 digit code. Saved only on this device, encrypted.')+'</p>'+
        '<input class="pinin" id="lkP1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" placeholder="••••" aria-label="'+T('קוד נעילה','Lock code')+'">'+
        '<input class="pinin" id="lkP2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" placeholder="'+T('שוב — לאימות','Again')+'" aria-label="'+T('שוב את הקוד','Repeat code')+'">'+
        '<p class="err" id="lkErr" role="alert"></p><div class="row51"><button class="btn" data-a="savepin">✔ '+T('שמירה','Save')+'</button><button class="btn sec" data-a="back">'+T('ביטול','Cancel')+'</button></div>';
    }else{
      h+='<p class="note" style="margin:0 0 10px">'+T('כשהנעילה פועלת, כדי לפתוח את האתר צריך קוד מספרים או טביעת אצבע / זיהוי פנים. בלי הפעלה — האתר נשאר פתוח כרגיל.','When on, opening the site needs a number code or fingerprint / face. Off — the site stays open as usual.')+'</p>'+
        '<div class="opt"><span style="font-size:24px">🔢</span><div class="grow"><b>'+T('קוד מספרים','Number code')+'</b><small>'+(L?T('פועל · ','On · ')+L.len+T(' ספרות',' digits'):T('כבוי — האתר פתוח','Off — the site is open'))+'</small>'+
          '<div class="row51"><button class="btn'+(L?' sec':'')+'" data-a="pin">'+(L?T('החלפת הקוד','Change code'):T('הפעלת נעילה','Turn on'))+'</button>'+(L?'<button class="btn sec" data-a="off">'+T('כיבוי הנעילה','Turn off')+'</button>':'')+'</div></div></div>'+
        '<div class="opt"><span style="font-size:24px">👆</span><div class="grow"><b>'+T('טביעת אצבע / זיהוי פנים','Fingerprint / face')+'</b><small>'+
          (!bioOk?(inApp?T('באפליקציה עדיין לא זמין — אפשר להשתמש בקוד מספרים. בדפדפן כרום בטלפון זה עובד.','Not available in the app yet — use a number code. Works in Chrome.'):T('לא זמין במכשיר או בדפדפן הזה — אפשר להשתמש בקוד מספרים.','Not available on this device/browser — use a number code.'))
            :!L?T('קודם מפעילים קוד מספרים (גיבוי, למקרה שהטביעה לא מזוהה).','Turn on a number code first (a backup).')
            :L.bio?T('פועל','On'):T('כבוי','Off'))+'</small>'+
          (bioOk&&L?'<div class="row51"><button class="btn'+(L.bio?' sec':'')+'" data-a="'+(L.bio?'biooff':'bioon')+'">'+(L.bio?T('כיבוי','Turn off'):T('הפעלה','Turn on'))+'</button></div>':'')+'</div></div>'+
        (L?'<div class="opt"><span style="font-size:24px">⏱️</span><div class="grow"><b>'+T('מתי לנעול','When to lock')+'</b><select id="lkAfter" style="margin-top:6px">'+
          [[0,T('בכל פעם שיוצאים מהאתר','Every time I leave')],[1,T('אחרי דקה','After 1 minute')],[5,T('אחרי 5 דקות','After 5 minutes')],[15,T('אחרי רבע שעה','After 15 minutes')],[60,T('אחרי שעה','After 1 hour')]]
            .map(([v,t])=>'<option value="'+v+'"'+(L.after===v?' selected':'')+'>'+t+'</option>').join('')+'</select></div></div>':'')+
        '<p class="note">🔒 '+T('הנעילה שומרת על המכשיר הזה בלבד. שכחתם את קוד הנעילה? יוצאים מהחשבון ונכנסים שוב עם המייל והקוד.','The lock protects this device only. Forgot the lock code? Sign out and sign in again with your email and code.')+'</p>';
    }
    ov.innerHTML=h+'</div>';const f=ov.querySelector('#lkP1');if(f)setTimeout(()=>f.focus(),60);};
  ov.addEventListener('click',async e=>{if(e.target===ov||e.target.closest('[data-x]')){close();return;}
    const a=e.target.closest('[data-a]');if(!a)return;const k=a.dataset.a,L=load();
    if(k==='pin'){draw('pin');return;}
    if(k==='back'){draw();return;}
    if(k==='savepin'){const p1=ov.querySelector('#lkP1').value,p2=ov.querySelector('#lkP2').value,er=ov.querySelector('#lkErr');
      if(!/^\d{4,8}$/.test(p1)){er.textContent=T('הקוד צריך להיות 4 עד 8 ספרות','The code must be 4–8 digits');return;}
      if(/^(\d)\1+$/.test(p1)||'0123456789'.includes(p1)||'9876543210'.includes(p1)){er.textContent=T('קוד קל מדי לניחוש — נסו קוד אחר','Too easy to guess — try another');return;}
      if(p1!==p2){er.textContent=T('הקודים לא זהים','The codes do not match');return;}
      const salt=b64(rnd(16));store({hash:await pinHash(p1,salt),salt,len:p1.length,bio:L&&L.bio||'',after:L?L.after:1});
      try{sessionStorage.setItem(SEEN,String(Date.now()));}catch(x){}
      flash('🔐 '+T('הנעילה פועלת','Lock is on'));draw();return;}
    if(k==='off'){if(!(await uiConfirm(T('לכבות את הנעילה? האתר ייפתח בלי קוד.','Turn off the lock? The site will open without a code.'))))return;store(null);flash('🔓 '+T('הנעילה כובתה','Lock is off'));draw();return;}
    if(k==='bioon'&&L){try{const id=await bioCreate();if(!id)throw 0;L.bio=id;store(L);flash('👆 '+T('טביעת אצבע / זיהוי פנים הופעלו','Fingerprint / face is on'));}catch(x){flash('⚠️ '+T('לא הצלחנו להפעיל — נסו שוב','Could not turn it on — try again'));}draw();return;}
    if(k==='biooff'&&L){L.bio='';store(L);draw();return;}
  });
  ov.addEventListener('change',e=>{if(e.target.id==='lkAfter'){const L=load();if(L){L.after=+e.target.value;store(L);flash('✔ '+T('נשמר','Saved'));}}});
  document.body.appendChild(ov);draw();
}
window.openLock51=openLock51;
if(inApp)try{add26('miLock51','🔐','נעילת האתר (טביעת אצבע / קוד)','Lock the site (fingerprint / code)','miLogout',openLock51);const it=$('#miLock51'),lo=$('#miLogout');if(it&&lo)lo.before(it);}catch(e){}
/* גם באזור האישי, ליד "שינוי קוד כניסה" */
if(inApp&&typeof renderMe==='function'){const _rm=renderMe;renderMe=function(){const r=_rm.apply(this,arguments);const c=$('#meCode');
  if(c&&!$('#meLock51')){c.insertAdjacentHTML('afterend','<button class="btn sec" id="meLock51">🔐 '+T('נעילת האתר','Site lock')+'</button>');$('#meLock51').onclick=openLock51;}return r;};}
})();
