
/* ================= 🙋 אישור כניסה ידני מהבק אופיס =================
   מי שלא מצליח להיכנס (שכח קוד, אין לו מייל, נחסם, נתקע באפליקציה) שולח בקשה ממסך הכניסה.
   המנהל מאשר בבק אופיס ← 🙋 אישור כניסה — והמשתמש נכנס מיד, בלי מייל. */
(function(){
const $=s=>document.querySelector(s);
const escL=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LRK='yam_login_req';
const NOMAIL='@nomail.yamshopping.com';
const USERNAME=/^[a-z0-9][a-z0-9._-]{2,29}$/i;
const loadReq=()=>{try{const v=JSON.parse(localStorage.getItem(LRK)||'null');return v&&v.id&&v.secret?v:null;}catch(e){return null;}};
const saveReq=v=>{try{if(v)localStorage.setItem(LRK,JSON.stringify(v));else localStorage.removeItem(LRK);}catch(e){}};
const st=document.createElement('style');st.textContent=
  '.lr60 .xcard{max-width:400px}.lr60 textarea{min-height:64px;resize:vertical}'+
  '.lr60 .lrcode{font:800 40px/1.1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:10px;text-align:center;direction:ltr;margin:10px 0;color:var(--hdr2)}'+
  '.lr60 .lrwait{display:flex;align-items:center;gap:8px;justify-content:center;font-size:14px;margin:6px 0 10px}'+
  '.lr60 .lrdot{width:10px;height:10px;border-radius:50%;background:var(--hdr2,#1e3a5f);animation:lr60p 1.2s infinite ease-in-out}'+
  '@keyframes lr60p{0%,100%{opacity:.25}50%{opacity:1}}'+
  '.lr60 p{font-size:14px;line-height:1.6;margin:4px 0}.lr60 .hp60{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}'+
  '#btnLoginReq{margin-top:2px}';
document.head.appendChild(st);
document.body.insertAdjacentHTML('beforeend','<div class="xmodal lr60" id="lrModal" hidden role="dialog" aria-modal="true" aria-labelledby="lrTitle"><div class="xcard form" id="lrBody"></div></div>');
const modal=$('#lrModal'),body=$('#lrBody');
let pollT=null,busy=false;
function close(){modal.hidden=true;clearTimeout(pollT);pollT=null;}
modal.addEventListener('click',e=>{if(e.target===modal&&!loadReq())close();});

/* כפתור במסך הכניסה */
const fb=$('#btnForgot');
if(fb&&!$('#btnLoginReq')){fb.insertAdjacentHTML('afterend','<button id="btnLoginReq" class="linkbtn" type="button">'+T('🙋 לא מצליחים להיכנס? בקשו אישור כניסה מהמנהל','🙋 Can\'t sign in? Ask the site manager to let you in')+'</button>');
  $('#btnLoginReq').onclick=()=>{const r=loadReq();if(r)showWait(r);else showForm();};}
const _slm=setLoginMode;setLoginMode=function(m){const r=_slm.apply(this,arguments);const b=$('#btnLoginReq');if(b)b.hidden=m==='signup';return r;};

function showForm(){
  const mail=(($('#inMail')||{}).value||'').trim();
  body.innerHTML='<h3 id="lrTitle">🙋 בקשת אישור כניסה</h3>'+
    '<p class="muted-note">'+T('שכחתם את הקוד, אין לכם מייל, או שהכניסה פשוט לא מצליחה? שלחו בקשה — מנהל האתר יאשר, ותיכנסו מיד.','Forgot your code, have no email, or sign-in just fails? Send a request — the site manager approves and you are in.')+'</p>'+
    '<input id="lrName" maxlength="40" placeholder="'+T('השם שלך','Your name')+'" autocomplete="name">'+
    '<input id="lrMail" maxlength="254" dir="ltr" style="text-align:right" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="'+T('המייל או שם המשתמש שלך (אם יש)','Your email or username (if any)')+'" value="'+escL(mail)+'">'+
    '<textarea id="lrNote" maxlength="300" placeholder="'+T('כמה מילים למנהל: מי אתם ומה קרה (למשל: אני משה מהבית הכנסת, שכחתי את הקוד)','A few words for the manager: who you are and what happened')+'"></textarea>'+
    '<div class="hp60" aria-hidden="true"><input id="lrHp" tabindex="-1" autocomplete="off"></div>'+
    '<div class="err" id="lrErr" role="alert"></div>'+
    '<div class="row2"><button id="lrSend">'+T('שליחת הבקשה','Send request')+'</button><button id="lrX" class="btn sec">'+T('ביטול','Cancel')+'</button></div>';
  modal.hidden=false;
  $('#lrX').onclick=close;
  setTimeout(()=>{try{$('#lrName').focus();}catch(e){}},80);
  $('#lrSend').onclick=async()=>{if(busy)return;
    const name=$('#lrName').value.trim(),email=$('#lrMail').value.trim().toLowerCase(),note=$('#lrNote').value.trim(),err=$('#lrErr');
    if(!name){err.textContent=T('נא לכתוב את השם','Please enter your name');return;}
    if(typeof hasProfanity==='function'&&(hasProfanity(name)||hasProfanity(note))){err.textContent=T('נא לכתוב בשפה מכבדת 🙂','Please keep it respectful 🙂');return;}
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!USERNAME.test(email)){err.textContent=T('המייל לא נראה תקין (אפשר גם להשאיר ריק)','That email does not look right (you can leave it empty)');return;}
    busy=true;$('#lrSend').disabled=true;err.textContent='';
    try{const r=await guard('lr_create',{name,email,note,hp:$('#lrHp').value});
      if(r.unavailable){err.textContent=AUTH_MSG.unavailable;return;}
      if(r.error==='rate'){err.textContent=T('נשלחו כבר כמה בקשות מהחיבור הזה. נסו שוב בעוד שעה, או חכו לאישור הבקשה הקודמת','Too many requests from this connection. Try again in an hour');return;}
      if(r.error||!r.id){err.textContent=AUTH_MSG[r.error]||AUTH_MSG.generic;return;}
      const v={id:r.id,secret:r.secret,code:r.code,at:Date.now()};saveReq(v);showWait(v);
    }finally{busy=false;const b=$('#lrSend');if(b)b.disabled=false;}};
}

function showWait(v){
  body.innerHTML='<h3 id="lrTitle">⏳ '+T('הבקשה נשלחה למנהל','Request sent')+'</h3>'+
    '<p>'+T('המספר של הבקשה שלך:','Your request number:')+'</p><div class="lrcode">'+escL(v.code)+'</div>'+
    '<p class="muted-note">'+T('אם המנהל מתקשר או שואל — תגידו לו את המספר הזה, כדי שיידע שזו באמת הבקשה שלכם.','If the manager asks, tell them this number so they know it is really you.')+'</p>'+
    '<div class="lrwait" id="lrState"><span class="lrdot"></span><span>'+T('מחכים לאישור... ברגע שהמנהל מאשר — נכנסים לבד','Waiting for approval... you will be signed in automatically')+'</span></div>'+
    '<p class="muted-note">'+T('אפשר לסגור את החלון ולחזור אחר כך — הבקשה נשמרת במכשיר הזה.','You can close this and come back later — the request is saved on this device.')+'</p>'+
    '<div class="row2"><button id="lrHide" class="btn sec">'+T('סגירה','Close')+'</button><button id="lrCancel" class="btn sec">'+T('ביטול הבקשה','Cancel request')+'</button></div>';
  modal.hidden=false;
  $('#lrHide').onclick=close;
  $('#lrCancel').onclick=async()=>{saveReq(null);close();try{await guard('lr_cancel',{id:v.id,secret:v.secret});}catch(e){}flash(T('הבקשה בוטלה','Request cancelled'));};
  poll(v);
}
function stateMsg(t){const s=$('#lrState');if(s)s.innerHTML=t;}
async function poll(v){clearTimeout(pollT);
  if(loadReq()===null||(typeof authUser!=='undefined'&&authUser)){return;}
  let r;try{r=await guard('lr_poll',{id:v.id,secret:v.secret});}catch(e){r={unavailable:true};}
  if(!loadReq())return;
  if(r&&r.status==='approved'&&r.session){saveReq(null);
    const ok=await useSession(r.session);close();
    if(!ok){flash(AUTH_MSG.generic);return;}
    afterApproved(r);return;}
  if(r&&['rejected','expired','gone','cancelled','used'].includes(r.status)){saveReq(null);
    stateMsg(r.status==='rejected'?'⛔ '+T('המנהל לא אישר את הבקשה. אפשר לפנות אליו ישירות.','The manager did not approve this request.'):'⌛ '+T('תוקף הבקשה עבר. אפשר לשלוח בקשה חדשה.','This request expired. You can send a new one.'));
    const c=$('#lrCancel');if(c)c.hidden=true;return;}
  if(modal.hidden&&document.hidden)return; /* לא מציקים לשרת כשלא מסתכלים — ממשיכים כשחוזרים */
  pollT=setTimeout(()=>poll(v),modal.hidden?10000:4000);
}
async function afterApproved(r){
  const user=r.username||'';
  await new Promise(res=>setTimeout(res,900));
  await uiAlert(user
    ?T('✅ המנהל אישר — נכנסתם!\n\nשם המשתמש שלכם: '+user+'\nבפעם הבאה כותבים אותו במקום המייל, יחד עם הקוד שתבחרו עכשיו.','✅ Approved — you are in!\n\nYour username: '+user+'\nNext time type it instead of an email, with the code you pick now.')
    :T('✅ המנהל אישר — נכנסתם!\n\nכדאי לבחור עכשיו קוד חדש, כדי שבפעם הבאה תיכנסו לבד עם המייל והקוד.','✅ Approved — you are in!\n\nPick a new code now so next time you can sign in on your own.'));
  try{openPwModal(false);}catch(e){}
}
/* חוזרים לאתר עם בקשה פתוחה — ממשיכים לבדוק */
document.addEventListener('visibilitychange',()=>{const v=loadReq();if(!document.hidden&&v&&!pollT&&!(typeof authUser!=='undefined'&&authUser))poll(v);});
setTimeout(()=>{const v=loadReq();if(!v)return;if(Date.now()-(v.at||0)>3*3600e3){saveReq(null);return;}if(typeof authUser!=='undefined'&&authUser){saveReq(null);return;}showWait(v);},2500);

/* ---------- כניסה עם שם משתמש (לחשבון בלי מייל) — כותבים את השם במקום המייל ---------- */
const lb=$('#btnLogin'),_login=lb&&lb.onclick;
/* ✉️ המנהל אישר את המייל מראש: השרת מחזיר חיבור עם approved — מציעים לבחור קוד חדש */
const _guardLr=guard;
guard=async function(action){const r=await _guardLr.apply(this,arguments);
  if(action==='login'&&r&&r.approved&&r.session)setTimeout(()=>{if(typeof authUser!=='undefined'&&authUser)afterApproved(r);},1500);return r;};
if(lb&&_login)lb.onclick=async function(ev){
  const m=$('#inMail'),v=(m.value||'').trim(),code=(($('#inCode')||{}).value||'');
  const acct=v&&!v.includes('@')&&USERNAME.test(v)?v.toLowerCase()+NOMAIL:v.toLowerCase();
  /* מייל בלי קוד — אולי המנהל אישר אותו מראש. אם לא — ממשיכים כרגיל (הודעה שצריך קוד) */
  if(loginMode!=='signup'&&code.length<8&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acct)&&sb){
    lb.disabled=true;let r=null;try{r=await guard('login',{email:acct,code:''});}catch(e){}finally{lb.disabled=false;}
    if(r&&r.approved&&r.session){if(await useSession(r.session)){loginErr('');return;}}}
  if(loginMode!=='signup'&&acct!==v.toLowerCase()){m.value=acct;
    try{return await _login.call(this,ev);}finally{if(m.value===acct)m.value=v;}}
  return _login.call(this,ev);};

/* ================= בק אופיס: 🙋 אישור כניסה ================= */
if(!window.boView)return;
(function(){const nav=$('#boNav');if(!nav||nav.querySelector('[data-s="loginreq"]'))return;
  const b=document.createElement('button');b.dataset.s='loginreq';b.innerHTML='🙋 אישור כניסה <span class="bobadge" id="boLrN" hidden></span>';
  const after=nav.querySelector('[data-s="security"]')||nav.querySelector('[data-s="users"]');if(after)after.after(b);else nav.appendChild(b);})();
const fmtL=d=>d?new Date(d).toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'}):'';
const agoL=d=>{const m=Math.floor((Date.now()-new Date(d).getTime())/60000);return m<1?'עכשיו':m<60?'לפני '+m+' דק׳':'לפני '+Math.floor(m/60)+' שע׳';};
const ST={pending:'⏳ ממתין',approved:'✅ אושר — ממתין שייכנס',pre:'✉️ אישור מראש',used:'🔑 נכנס',rejected:'⛔ נדחה',expired:'⌛ פג תוקף',cancelled:'↩️ בוטל ע״י המשתמש'};
const brL=ua=>{ua=ua||'';if(!ua)return '';const app=/YamShoppingApp\//.test(ua),dev=/iPhone|iPad/.test(ua)?'אייפון':/Android/.test(ua)?'טלפון אנדרואיד':/Windows|Macintosh|Linux|CrOS/.test(ua)?'מחשב':'';
  return '<span class="plk" style="font-weight:700;'+(app?'background:#d8f0e3;color:#0b5a3c':'background:#e3ecfb;color:#1d3f8a')+'">'+(app?'📱 מהאפליקציה':'🌐 מהאתר'+(dev?' · '+dev:''))+'</span>';};
let lrTimer=null;
async function lrCount(){if(!sb||typeof isAdmin!=='function'||!isAdmin())return;try{const {count}=await sb.from('login_requests').select('id',{count:'exact',head:true}).eq('status','pending').gt('created_at',new Date(Date.now()-120*60000).toISOString());const n=$('#boLrN');if(n){n.textContent=count||'';n.hidden=!count;}}catch(e){}}
setInterval(()=>{if(!document.hidden&&!$('#bo').classList.contains('hidden'))lrCount();},30000);
window.boView('loginreq',async function view(){
  const main=$('#boMain');clearTimeout(lrTimer);
  const {data,error}=await sb.from('login_requests').select('id,kind,code,name,email,note,ip,ua,status,user_email,created_at,decided_at,used_at,expires_at').order('created_at',{ascending:false}).limit(150);
  if(!$('#bo')||!main.isConnected)return;
  const rows=(data||[]).map(r=>Object.assign({},r,{status:r.status==='pending'&&Date.now()-new Date(r.created_at)>120*60000?'expired':r.status}));
  const pend=rows.filter(r=>r.status==='pending');
  const n=$('#boLrN');if(n){n.textContent=pend.length||'';n.hidden=!pend.length;}
  const card=r=>'<div class="card" style="border-inline-start:4px solid var(--hdr2,#1e3a5f)"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline">'+
    '<h2 style="margin:0">'+escL(r.name||'—')+'</h2><span style="font:800 22px ui-monospace,monospace;letter-spacing:4px" dir="ltr" title="המספר שמופיע אצל המשתמש">'+escL(r.code)+'</span></div>'+
    (r.email?'<div dir="ltr" style="text-align:right">📧 '+escL(r.email)+'</div>':'<div class="muted">בלי מייל</div>')+
    (r.note?'<p style="margin:6px 0;white-space:pre-wrap">💬 '+escL(r.note)+'</p>':'')+
    '<div style="font-size:13px;margin-top:4px">'+brL(r.ua)+' <span class="muted">· '+escL(agoL(r.created_at))+' · <span dir="ltr">'+escL(r.ip)+'</span></span></div>'+
    '<div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap"><button class="btn" data-lrok="'+r.id+'">✅ אישור כניסה</button><button class="btn sec" data-lrno="'+r.id+'">⛔ דחייה</button></div></div>';
  const {data:preData}=await sb.from('login_requests').select('id,user_email,name,expires_at,decided_at').eq('kind','pre').eq('status','approved').gt('expires_at',new Date().toISOString()).order('decided_at',{ascending:false}).limit(50);
  const pre=(preData||[]).filter(r=>new Date(r.expires_at)>Date.now());
  /* מי שנחסם או נכשל בכניסה ב-24 השעות האחרונות — אפשר לאשר לו כניסה בלי שיבקש */
  const {data:failData}=await sb.from('auth_events').select('kind,email,created_at').in('kind',['login_fail','login_locked']).gt('created_at',new Date(Date.now()-864e5).toISOString()).order('created_at',{ascending:false}).limit(1000);
  const preSet=new Set(pre.map(r=>r.user_email));const fails={};
  (failData||[]).forEach(e=>{const k=(e.email||'').toLowerCase();if(!k||preSet.has(k))return;const f=fails[k]||(fails[k]={email:k,n:0,locked:false,last:e.created_at});f.n++;if(e.kind==='login_locked')f.locked=true;});
  const failList=Object.values(fails).filter(f=>f.locked||f.n>=2).sort((a,b)=>(b.locked-a.locked)||(new Date(b.last)-new Date(a.last))).slice(0,30);
  const failCard='<div class="card"><h2>🔒 נחסמו / לא הצליחו להיכנס (24 שעות)</h2>'+(failList.length?'<p class="muted">לוחצים "אשר כניסה" — והוא ייכנס עם המייל בלבד בזמן שבחרת למעלה, בלי לבקש.</p><div class="tw"><table><thead><tr><th>מייל</th><th>מה קרה</th><th>מתי</th><th></th></tr></thead><tbody>'+
    failList.map(f=>'<tr><td dir="ltr" style="text-align:right">'+escL(f.email.replace(NOMAIL,' (שם משתמש)'))+'</td><td>'+(f.locked?'🔒 נחסם · ':'')+f.n+' ניסיונות</td><td style="white-space:nowrap">'+escL(agoL(f.last))+'</td><td><button class="btn" data-lrfail="'+escL(f.email)+'">✅ אשר כניסה</button></td></tr>').join('')+'</tbody></table></div>':'<p class="muted">אין כרגע מי שנחסם 👍</p>')+'</div>';
  const preCard='<div class="card" id="lrPreCard"><h2>✉️ אישור מראש לפי מייל</h2><p class="muted">כותבים את המייל (או שם המשתמש) של מי שצריך להיכנס. בזמן שבוחרים, הוא נכנס במסך הכניסה עם המייל בלבד, בלי קוד, פעם אחת. אחר כך הוא בוחר קוד חדש. גם חסימה של כניסות כושלות מתאפסת.</p>'+
    '<p class="muted">🔒 בזמן הזה כל מי שיכתוב את המייל הזה ייכנס לחשבון, לכן כדאי לאשר רק כשהאדם מולך / בטלפון, ולזמן קצר.</p>'+
    '<div class="row" style="gap:6px;flex-wrap:wrap"><input id="lrPreAcc" dir="ltr" style="flex:2 1 220px;text-align:right" autocapitalize="off" spellcheck="false" placeholder="מייל או שם משתמש"><select id="lrPreMin" style="flex:1 1 120px"><option value="15">ל-15 דקות</option><option value="30" selected>לחצי שעה</option><option value="60">לשעה</option><option value="180">ל-3 שעות</option><option value="1440">ליום</option></select><button class="btn" id="lrPreGo" style="flex:1 1 120px">✅ לאשר כניסה</button></div>'+
    (pre.length?'<div class="tw" style="margin-top:8px"><table><thead><tr><th>החשבון</th><th>בתוקף עד</th><th></th></tr></thead><tbody>'+pre.map(r=>'<tr><td dir="ltr" style="text-align:right">'+escL(r.user_email.replace(NOMAIL,' (שם משתמש)'))+'</td><td>'+escL(new Date(r.expires_at).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}))+'</td><td><button class="btn sec" data-lrrev="'+r.id+'">ביטול</button></td></tr>').join('')+'</tbody></table></div>':'')+'</div>';
  main.innerHTML=preCard+failCard+'<div class="card"><h2>🙋 אישור כניסה</h2><p class="muted">מי שלא מצליח להיכנס (שכח את הקוד, אין לו מייל, נחסם אחרי כניסות כושלות, או נתקע באפליקציה) לוחץ במסך הכניסה "בקשו אישור כניסה מהמנהל". כאן מאשרים — והוא נכנס מיד, בלי מייל. אחרי האישור הוא בוחר קוד חדש, וגם החסימה של הכניסות הכושלות מתאפסת.</p>'+
    '<p class="muted">🔒 לפני שמאשרים — לוודא שזה באמת האדם (למשל לשאול בטלפון מה המספר שמופיע אצלו). האישור נותן כניסה מלאה לחשבון.</p>'+
    (error?'<p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL (⚙️ הגדרה ראשונית). '+escL(error.message)+'</p>':'')+'</div>'+
    (pend.length?pend.map(card).join(''):'<div class="card muted">אין כרגע בקשות שממתינות 👍 (הדף מתרענן לבד)</div>')+
    '<div class="card"><h2>📜 בקשות אחרונות</h2><div class="tw"><table><thead><tr><th>מתי</th><th>שם</th><th>מאיפה</th><th>מייל שכתב</th><th>מצב</th><th>החשבון</th></tr></thead><tbody>'+
    (rows.filter(r=>r.status!=='pending'&&!(r.kind==='pre'&&r.status==='approved')).map(r=>'<tr><td style="white-space:nowrap">'+escL(fmtL(r.created_at))+'</td><td>'+(r.kind==='pre'?'✉️ ':'')+escL(r.name||(r.kind==='pre'?'אישור מראש':''))+'</td><td>'+brL(r.ua)+'</td><td dir="ltr" style="text-align:right">'+escL(r.email)+'</td><td>'+(ST[r.status]||escL(r.status))+'</td><td dir="ltr" style="text-align:right">'+escL((r.user_email||'').replace(NOMAIL,' (שם משתמש)'))+'</td></tr>').join('')||'<tr><td colspan="6" class="muted">אין עדיין</td></tr>')+
    '</tbody></table></div></div>';
  const M={forbidden:'⛔ רק מנהלים יכולים לאשר',forbidden_target:'⛔ כניסה לחשבון של הבעלים או של איש צוות — רק הבעלים יכולים לאשר',status:'הבקשה כבר לא ממתינה',gone:'הבקשה לא נמצאה',account:'מייל או שם משתמש לא תקין',domain:'המייל הזה לא מתאים (מייל זמני / לא אמיתי)',unavailable:AUTH_MSG.unavailable};
  $('#lrPreGo').onclick=async()=>{const b=$('#lrPreGo');let acc=$('#lrPreAcc').value.trim().toLowerCase(),min=+$('#lrPreMin').value;
    if(!acc){flash('כותבים מייל או שם משתמש');return;}
    if(!acc.includes('@')&&!USERNAME.test(acc)){await uiAlert('שם משתמש: 3–30 תווים, אותיות באנגלית, ספרות, נקודה, מקף או קו תחתון. למשל: moshe.cohen');return;}
    b.disabled=true;
    try{let x=await guard('lr_preapprove',{account:acc,minutes:min},true);
      if(x.error==='not_found'){
        if(!(await uiConfirm(acc.includes('@')?'אין חשבון עם המייל '+acc+'.\nלפתוח חשבון חדש על המייל הזה?':'אין עדיין חשבון עם שם המשתמש '+acc+'.\nלפתוח חשבון חדש בלי מייל?\nהוא ייכנס עם שם המשתמש, ואחר כך יבחר קוד.')))return;
        const name=((await uiPrompt('השם שלו (כך יופיע באתר):',''))||'').trim();
        x=await guard('lr_preapprove',{account:acc,minutes:min,create:true,name},true);}
      if(x.ok){await uiAlert('✅ אושר'+(x.created?' ונפתח חשבון חדש':'')+'.\n\nעכשיו הוא נכנס במסך הכניסה: כותב '+(acc.includes('@')?'את המייל '+acc:'את שם המשתמש '+acc)+' ולוחץ "כניסה" — בלי קוד.\nהאישור תקף '+$('#lrPreMin').selectedOptions[0].textContent.replace(/^ל-?/,'')+', לכניסה אחת.');view();return;}
      flash('⚠️ '+(M[x.error]||AUTH_MSG.generic));
    }finally{b.disabled=false;}};
  main.onclick=async e=>{
    const fl=e.target.closest('[data-lrfail]');if(fl){const em=fl.dataset.lrfail;$('#lrPreAcc').value=em.endsWith(NOMAIL)?em.slice(0,-NOMAIL.length):em;if(!(await uiConfirm('לאשר ל-'+$('#lrPreAcc').value+' כניסה עם המייל בלבד, '+$('#lrPreMin').selectedOptions[0].textContent+'?')))return;$('#lrPreGo').click();return;}
    const rv=e.target.closest('[data-lrrev]');if(rv){const x=await guard('lr_revoke',{id:rv.dataset.lrrev},true);flash(x.ok?'האישור בוטל':'⚠️ '+(x.error||'לא הצליח'));view();return;}
    const ok=e.target.closest('[data-lrok]'),no=e.target.closest('[data-lrno]');if(!ok&&!no)return;
    const r=rows.find(x=>x.id===(ok||no).dataset[ok?'lrok':'lrno']);if(!r)return;
    if(no){if(!(await uiConfirm('לדחות את הבקשה של '+(r.name||'')+'?')))return;const x=await guard('lr_reject',{id:r.id},true);flash(x.ok?'⛔ נדחה':'⚠️ '+(x.error||'לא הצליח'));view();return;}
    let acc=(await uiPrompt('לאיזה חשבון להכניס את '+(r.name||'המשתמש')+'?\nכותבים את המייל של החשבון, או שם משתמש (באנגלית) לחשבון בלי מייל.',r.email||''));
    if(acc==null)return;acc=String(acc).trim().toLowerCase();if(!acc){flash('צריך מייל או שם משתמש');return;}
    if(!acc.includes('@')&&!USERNAME.test(acc)){await uiAlert('שם משתמש: 3–30 תווים, אותיות באנגלית, ספרות, נקודה, מקף או קו תחתון. למשל: moshe.cohen');return;}
    ok.disabled=true;
    try{let x=await guard('lr_approve',{id:r.id,account:acc},true);
      if(x.error==='not_found'){
        if(!(await uiConfirm(acc.includes('@')?'אין חשבון עם המייל '+acc+'.\nלפתוח חשבון חדש על המייל הזה ולהכניס אליו את '+(r.name||'המשתמש')+'?':'אין עדיין חשבון עם שם המשתמש '+acc+'.\nלפתוח חשבון חדש בלי מייל, ולהכניס אליו את '+(r.name||'המשתמש')+'?\nבפעם הבאה הוא ייכנס עם שם המשתמש והקוד שיבחר.')))return;
        x=await guard('lr_approve',{id:r.id,account:acc,create:true,name:r.name},true);}
      if(x.ok){flash('✅ אושר'+(x.created?' — נפתח חשבון חדש':'')+'. המשתמש ייכנס תוך כמה שניות');view();return;}
      flash('⚠️ '+(M[x.error]||AUTH_MSG.generic));view();
    }finally{ok.disabled=false;}};
  lrTimer=setTimeout(()=>{if(!$('#bo').classList.contains('hidden')&&$('#boNav [data-s="loginreq"].on'))view();},15000);
});
})();
