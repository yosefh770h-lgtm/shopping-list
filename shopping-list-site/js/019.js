
/* ================= גרסה 16: הרשמה/כניסה/איפוס מוגנים בשרת (בלי שום שלב נוסף), מונה מחוברים,
   מכונות אוטומטיות לעסקים, יומן פעילות, תיקון עדכונים בפעמון, גרסה וסיפור באודות ================= */
const $16=s=>document.querySelector(s);
const APP_VERSION='20';
let CHANGELOG=[
 ['16.5','אוקטובר 2026',
  'מה היה: משתמש חדש היה צריך לגלות לבד מה יש באתר; רשימה לשבת או לחג בנו מאפס; ומוצר שנגמר בבית היה צריך להוסיף לרשימה בעצמכם.',
  'מה חדש: 🧭 סיור קצר למשתמשים חדשים (ואפשר לפתוח שוב מהתפריט ⚙️) · 📋 רשימות מוכנות לשבת, לחגים, לקנייה שבועית ולמנגל — מורידים מה שלא צריך ומוסיפים בלחיצה · 🏠 מוצר נגמר בבית? האתר מציע להוסיף אותו לרשימה מיד.'],
 ['16.4','אוקטובר 2026',
  'מה היה: חנות שכתבתם בקבלה או בסיום קנייה ולא הייתה באתר — נשארה רק אצלכם.',
  'מה חדש: 🏪 כותבים חנות שעוד לא באתר (בקבלה, בסיום קנייה, בדיווח מחיר או ב"החנויות שלי") — האתר שואל אם להוסיף אותה, ובוחרים לה קטגוריה (סופר, מכולת, ירקן, מאפייה, פארם ועוד). כך כולם ימצאו אותה ב"🏪 החנויות".'],
 ['16.0','אוקטובר 2026',
  'מה היה: עדכון שמחקתם בפעמון היה חוזר אחרי רענון.',
  'מה חדש: 🟢 רואים כמה מחוברים עכשיו לאתר · 🎰 לבעלי עסקים: ניהול מכונות אוטומטיות (פחיות, חטיפים, קפה ועוד) · 💬 צ׳אט ישיר עם צוות האתר והודעות מהצוות · 🔔 מחיקת עדכון בודד מהפעמון · ℹ️ מספר גרסה וסיפור האתר באודות · 👩‍🍳 יאמי מסבירה על כל מה שיש באתר.'],
 ['15.0','אוקטובר 2026',
  'מה היה: כמות רק ביחידות, מעבר בין קטגוריות רק בלחיצה, ומי שצירפתם קיבל גישה לכל הנתונים.',
  'מה חדש: 👥 משתמשים משניים — אתם בוחרים מה הם רואים ומה מותר להם · 🗂️ קטגוריות בריאות · ⚖️ כמויות בקילו, גרם וליטר · 👆 החלקה בין קטגוריות · ☰ תצוגת שורות · 👩‍🍳 יאמי שואלת כמה ולאן להוסיף · 🧾 הנחות ומבצעים בקבלות · 🕐 מנחה גדולה וקטנה.'],
 ['14.0','ספטמבר 2026','מה היה: ניהול העסק היה מפוזר בכמה מסכים.','מה חדש: "האתר העסקי" במסך מלא, לוגו ותמונות מוצרים, התראות לבעל העסק, פרסום מחירים אוטומטי.'],
 ['13.0','ספטמבר 2026','מה היה: האתר היה ללקוחות בלבד.','מה חדש: בעלי עסקים — פרופיל עסקי, הזמנות, סנכרון מאתר העסק, מדריך עסקים וספקים.']];

/* ---------- 🔐 הרשמה, כניסה ואיפוס — דרך הפונקציה המוגנת בשרת (auth-guard). המשתמש לא מרגיש שום הבדל ---------- */
let guardNonce='',guardNonceAt=0,formShownAt=Date.now();
async function guard(action,body,withAuth){
  if(!sb)return {unavailable:true};
  try{
    const opts={body:Object.assign({action},body||{})};
    if(withAuth){const {data}=await sb.auth.getSession();const t=data&&data.session&&data.session.access_token;if(t)opts.headers={Authorization:'Bearer '+t};}
    let {data,error}=await sb.functions.invoke('auth-guard',opts);
    if(error){const st=error.context&&error.context.status;
      if(error.context&&typeof error.context.json==='function'){try{data=await error.context.json();}catch(x){}}
      /* הפונקציה עוד לא הועלתה / לא זמינה — עובדים כמו קודם */
      if(!data||st===404||/FunctionsFetchError|FunctionsRelayError/.test(error.name||''))return {unavailable:true};}
    return data||{unavailable:true};
  }catch(e){return {unavailable:true};}
}
async function fetchNonce(){formShownAt=Date.now();const r=await guard('nonce');if(r&&r.nonce){guardNonce=r.nonce;guardNonceAt=Date.now();}}
/* מלכודת בוטים: שדה נסתר שאדם לא רואה ולא ממלא */
(function(){const s=$16('#lfSignup');if(s&&!$16('#inWebsite'))s.insertAdjacentHTML('beforeend','<div class="hp16" aria-hidden="true"><label for="inWebsite">Website</label><input id="inWebsite" name="website" type="text" tabindex="-1" autocomplete="off"></div>');})();
const _v16SetLoginMode=setLoginMode;
setLoginMode=function(m){const r=_v16SetLoginMode.apply(this,arguments);if(m==='signup')fetchNonce();return r;};
const _v16ShowLogin2=showLogin;
showLogin=function(){const r=_v16ShowLogin2.apply(this,arguments);formShownAt=Date.now();return r;};
const AUTH_MSG={
  mail:'לא הצלחנו לשלוח כרגע את מייל האישור. נסו שוב בעוד כמה דקות 🙏',
  current:'הקוד הנוכחי שגוי (מי שנכנס עם גוגל — משאירים את השדה ריק)',
  nonce:'הטופס פג תוקף — נסו שוב',
  domain:'כתובת המייל הזו לא מתאימה להרשמה (מייל זמני או לא אמיתי). נא להירשם עם המייל הקבוע שלך 🙂',
  rate:'נרשמו כבר כמה חשבונות מהחיבור הזה בשעה האחרונה. נסו שוב מאוחר יותר 🙂',
  exists:'המייל הזה כבר רשום — עברו ל"כניסה"',
  weak:'הקוד חלש מדי — לפחות 8 תווים, עם אותיות ומספרים',
  name:'נא לבחור שם',email:'נא להזין אימייל תקין',
  generic:'לא הצלחנו להשלים את הפעולה כרגע. נסו שוב בעוד רגע',
  not_confirmed:'צריך לאשר את המייל — בדקו את תיבת הדואר (גם בקידומי מכירות/ספאם)',
  expired:'הקישור פג תוקף (הוא תקף 30 דקות). בקשו קישור חדש ב"שכחתי סיסמה"',
  used:'הקישור הזה כבר נוצל. בקשו קישור חדש ב"שכחתי סיסמה"',
  reset_required:'מטעמי אבטחה צריך לקבוע קוד חדש — לחצו "שכחתי סיסמה" ונשלח לכם קישור למייל',
  reauth:'מטעמי אבטחה צריך להתחבר שוב עם Google ואז לקבוע קוד',
  unavailable:'השירות לא זמין כרגע. נסו שוב בעוד כמה דקות'};
const lockMsg=m=>'יותר מדי ניסיונות כניסה. מטעמי אבטחה הכניסה נחסמה ל-'+(m||15)+' דקות. אפשר ללחוץ "שכחתי סיסמה" ולקבל קישור לקוד חדש';
async function useSession(s){if(s&&s.access_token&&s.refresh_token){const {error}=await sb.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});return !error;}return false;}
const _v16LegacyLogin=document.querySelector('#btnLogin').onclick;
document.querySelector('#btnLogin').onclick=async function(ev){
  if(!sb){loginErr('אין חיבור לשרת');return;}
  const email=$16('#inMail').value.trim().toLowerCase(),code=$16('#inCode').value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){loginErr('נא להזין אימייל תקין');return;}
  if(code.length<8){loginErr('הקוד חייב להיות לפחות 8 תווים');return;}
  const btn=$16('#btnLogin');
  if(loginMode==='signup'){
    const name=$16('#inName').value.trim();
    if(!name){loginErr('נא לבחור שם');return;}
    if(hasProfanity(name)){loginErr('נא לבחור שם מכבד 🙂');return;}
    if(code!==$16('#inCode2').value){loginErr('הקודים לא זהים');return;}
    if(!/[0-9]/.test(code)||!/[^0-9]/.test(code)){loginErr('הקוד צריך לכלול גם אותיות וגם מספרים');return;}
    btn.disabled=true;loginErr('');
    try{
      if(!guardNonce||Date.now()-guardNonceAt>6*3600e3)await fetchNonce();
      /* השרת דוחה טופס שנשלח פחות מ-3 שניות אחרי שנפתח (הגנה מבוטים) — מחכים רגע אם צריך */
      const wait=3300-(Date.now()-guardNonceAt);if(wait>0)await new Promise(res=>setTimeout(res,wait));
      const r=await guard('signup',{email,code,name,hp:($16('#inWebsite')||{}).value||'',nonce:guardNonce,elapsed:Date.now()-formShownAt,redirect:location.origin+location.pathname});
      if(r.unavailable)return _v16LegacyLogin.call(this,ev);
      if(r.error){if(r.error==='nonce')fetchNonce();loginErr(AUTH_MSG[r.error]||AUTH_MSG.generic);return;}
      /* אימות מייל: החשבון נוצר, ונכנסים רק אחרי לחיצה על הקישור שנשלח למייל */
      if(r.verify){setLoginMode('login');$16('#inMail').value=email;$16('#inCode').value='';const c2=$16('#inCode2');if(c2)c2.value='';loginErr('');$16('#btnResend').hidden=false;
        (await uiAlert('📧 כמעט סיימנו!\n\nאם המייל '+email+' לא רשום עדיין — שלחנו אליו קישור לאישור. לוחצים על הקישור — ונכנסים לאתר.\nאם כבר יש לך חשבון — נכנסים עם המייל והקוד, או לוחצים "שכחתי סיסמה".\n\nלא הגיע תוך כמה דקות? בדקו בספאם / קידומי מכירות, או לחצו "שליחה מחדש".'));return;}
      if(!(await useSession(r.session))){setLoginMode('login');loginErr('');flash('✅ נרשמת! עכשיו נכנסים עם המייל והקוד');return;}
      $16('#inCode').value='';$16('#inCode2').value='';
    }catch(e){loginErr(authErrorHe(e));}finally{btn.disabled=false;}
    return;}
  btn.disabled=true;loginErr('');
  try{
    let r=await guard('login',{email,code});
    /* השרת לא ענה (רשת איטית / סינון) — מנסים שוב פעם אחת לפני שמוותרים */
    if(r.unavailable){await new Promise(res=>setTimeout(res,1200));r=await guard('login',{email,code});}
    /* מקלדת בטלפון הוסיפה רווח בסוף / בהתחלה — בודקים גם בלי הרווח */
    if(r.error==='invalid'&&code.trim()!==code&&code.trim().length>=8)r=await guard('login',{email,code:code.trim()});
    if(r.unavailable){
      /* חשבון ותיק מאוד (מלפני ההגנה בשרת) עוד עשוי להיכנס ישירות. אחרת — לא אומרים "קוד שגוי": הקוד בכלל לא נבדק */
      try{const {error}=await sb.auth.signInWithPassword({email,password:code});if(!error){$16('#inCode').value='';return;}}catch(e){}
      loginErr(T('לא הצלחנו להגיע לשרת הכניסה, ולכן הקוד לא נבדק. בדקו את החיבור לאינטרנט ונסו שוב בעוד רגע 🙏','Could not reach the sign-in server, so your code was not checked. Check your connection and try again 🙏'));return;}
    if(r.error==='locked'){loginErr(lockMsg(r.minutes));return;}
    if(r.error==='not_confirmed'){loginErr(AUTH_MSG.not_confirmed);$16('#btnResend').hidden=false;return;}
    if(r.error==='rate'){loginErr('יותר מדי ניסיונות. נסו שוב בעוד כמה דקות');return;}
    if(r.error==='reset_required'){loginErr(AUTH_MSG.reset_required);const fb=$16('#btnForgot');if(fb){fb.classList.add('hl16');try{fb.focus();}catch(x){}}return;}
    /* רק "invalid" אומר שהקוד באמת לא נכון. תקלה בשרת (generic) הוצגה פעם בטעות כ"קוד לא נכון" */
    if(r.error==='invalid'){loginErr('אימייל או קוד לא נכונים'+(r.left>0&&r.left<=3?' (נשארו '+r.left+' ניסיונות)':'')+' — אפשר ללחוץ "שכחתי סיסמה" ולקבל למייל קישור לקוד חדש'+(/YamShoppingApp\//.test(navigator.userAgent)?'. נרשמתם עם גוגל? אז עוד אין לכם קוד: לוחצים "שכחתי סיסמה", בוחרים קוד מהקישור במייל, ונכנסים איתו כאן':'. נרשמתם עם גוגל? אז נכנסים בכפתור "כניסה עם גוגל" (או קובעים קוד ב"שכחתי סיסמה")'));const fb=$16('#btnForgot');if(fb)fb.classList.add('hl16');return;}
    if(r.error){loginErr(AUTH_MSG[r.error]||AUTH_MSG.generic);return;}
    if(!(await useSession(r.session))){loginErr(AUTH_MSG.generic);return;}
    $16('#inCode').value='';
  }catch(e){loginErr(authErrorHe(e));}finally{btn.disabled=false;}
};
/* שכחתי את הקוד — אותה הודעה תמיד, גם אם המייל לא רשום */
document.querySelector('#btnForgot').onclick=async function(ev){
  if(!sb)return;const email=$16('#inMail').value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){loginErr('כתבו קודם את המייל שלכם למעלה');return;}
  const r=await guard('reset',{email,redirect:location.origin+location.pathname});
  if(r.unavailable){loginErr(AUTH_MSG.unavailable);return;}
  if(r.error==='rate'){loginErr('יותר מדי ניסיונות. נסו שוב בעוד כמה דקות');return;}
  loginErr('');flash('📧 אם המייל רשום אצלנו — נשלח אליו קישור לקביעת קוד חדש');
  (await uiAlert('📧 אם המייל '+email+' רשום אצלנו — נשלח אליו קישור לקביעת קוד חדש.\n\nפותחים את המייל ולוחצים על הקישור — ייפתח חלון לבחירת קוד חדש. הקישור תקף ל-30 דקות.\nלא הגיע תוך כמה דקות? בדקו בספאם / קידומי מכירות.'));
};
/* קביעת קוד חדש (מהקישור במייל או מהאזור האישי) */
document.querySelector('#pwSave').onclick=async function(ev){
  const c=$16('#pwNew').value,c2=$16('#pwNew2').value,err=$16('#pwErr');
  if(c.length<8||!/[0-9]/.test(c)||!/[^0-9]/.test(c)){err.textContent='הקוד חייב להיות לפחות 8 תווים, עם אותיות ומספרים';return;}
  if(c!==c2){err.textContent='הקודים לא זהים';return;}
  const b=$16('#pwSave');b.disabled=true;
  const cur=$16('#pwCurWrap').hidden?'':$16('#pwCur').value;
  try{const r=await guard('set_password',cur?{code:c,current:cur}:{code:c},true);
    if(r.unavailable){err.textContent=AUTH_MSG.unavailable;return;}
    if(r.error){err.textContent=AUTH_MSG[r.error]||AUTH_MSG.generic;return;}
    await useSession(r.session);
    $16('#pwModal').hidden=true;flash('🔑 הקוד עודכן בהצלחה — מעכשיו נכנסים איתו');
  }finally{b.disabled=false;}
};
/* כניסה עם גוגל — נרשמים ביומן (IP, דפדפן, שעה), ברקע */
const _v16OnSignedIn=onSignedIn;
onSignedIn=async function(user){const r=await _v16OnSignedIn.apply(this,arguments);
  try{const prov=user&&user.app_metadata&&user.app_metadata.provider;if(prov&&prov!=='email')guard('log_login',{},true);}catch(e){}
  logAct('login','');statsRefresh();return r;};

/* ---------- 🟢 מונה מחוברים ומשתמשים — ליד הפעמון ---------- */
(function(){const bell=$16('#btnBell');if(!bell||$16('#stats16'))return;
  bell.insertAdjacentHTML('beforebegin','<button class="stats16" id="stats16" type="button" title="'+T('מחוברים עכשיו · משתמשים באתר','Online now · Users')+'" hidden><span class="dot16"></span><b id="st16on">0</b><span class="sep16">·</span><span>👥</span><b id="st16us">0</b></button>');
  $16('#stats16').onclick=()=>flash('🟢 '+$16('#st16on').textContent+T(' מחוברים עכשיו · ',' online now · ')+'👥 '+$16('#st16us').textContent+T(' משתמשים באתר',' users'));})();
/* כברירת מחדל רק מנהלים רואים את המונה; בבק אופיס ← 🎛️ תצוגה אפשר להציג אותו גם למשתמשים */
const statsHiddenNow=()=>!uiCfg.statsShown&&!isAdmin();
async function statsRefresh(){if(!sb)return;if(statsHiddenNow()){$16('#stats16').hidden=true;return;}try{const {data}=await sb.rpc('site_stats');
  /* בזמן שחיכינו לשרת ייתכן שנטענה ההגדרה "להסתיר" — בודקים שוב לפני שמציגים */
  if(statsHiddenNow()){$16('#stats16').hidden=true;return;}
  /* השרת לא החזיר מספרים (המנהל הסתיר את המונה) — מסתירים גם אצל מי שהמונה כבר הוצג לו */
  if(!(data&&typeof data==='object'&&Number(data.users)>0)){$16('#stats16').hidden=true;return;}
  if(data&&typeof data==='object'&&Number(data.users)>0){$16('#st16on').textContent=Number(data.online)||0;$16('#st16us').textContent=(Number(data.users)||0).toLocaleString('he-IL');$16('#stats16').hidden=false;}}catch(e){}}
statsRefresh();setInterval(()=>{if(!document.hidden)statsRefresh();},60000);
const _statsApplyUi=applyUi;applyUi=function(){_statsApplyUi.apply(this,arguments);if(statsHiddenNow())$16('#stats16').hidden=true;else if($16('#stats16').hidden)statsRefresh();};

/* ---------- 🔔 מה שנמחק מהפעמון לא חוזר אחרי רענון ---------- */
const SEEN16='yam_inbox_seen';
let seen16=new Set();try{seen16=new Set(JSON.parse(localStorage.getItem(SEEN16)||'[]'));}catch(e){}
(inbox||[]).forEach(x=>seen16.add(x.id));
const saveSeen16=()=>{try{localStorage.setItem(SEEN16,JSON.stringify([...seen16].slice(-1500)));}catch(e){}};saveSeen16();
const _v16Notify=notify;
notify=function(id){if(id&&seen16.has(id))return false;const r=_v16Notify.apply(this,arguments);if(id){seen16.add(id);saveSeen16();}return r;};
/* מחיקה של עדכון בודד */
const _v16RenderNotif=renderNotif;
renderNotif=function(){_v16RenderNotif.apply(this,arguments);document.querySelectorAll('#notifBody [data-nid]').forEach(el=>{if(el.querySelector('.ndel16'))return;el.insertAdjacentHTML('beforeend','<button class="ndel16" data-ndel="'+esc(el.dataset.nid)+'" aria-label="'+T('מחיקת העדכון','Delete')+'">🗑️</button>');});};
$16('#notifBody').addEventListener('click',e=>{const d=e.target.closest('[data-ndel]');if(!d)return;e.stopPropagation();seen16.add(d.dataset.ndel);saveSeen16();inbox=inbox.filter(x=>x.id!==d.dataset.ndel);saveInbox();updateBell(false);renderNotif();},true);

/* גרסת האתר — בתחתית התפריט ☰, כדי לבדוק בקלות שהדפדפן טען את העדכון האחרון */
const SITE_BUILD='13.10.26';
(function(){const m=document.querySelector('#hMenu');if(!m||document.querySelector('#siteBuild'))return;
  m.insertAdjacentHTML('beforeend','<div id="siteBuild" style="text-align:center;font-size:11px;color:var(--muted);padding:8px 0 2px">'+T('גרסת האתר: ','Version: ')+SITE_BUILD+'</div>');})();

/* ---------- 🛠️ יומן פעילות (המנהל רואה מה כל אחד עושה) ---------- */
function logAct(action,detail){if(!sb||!authUser)return;try{sb.rpc('log_activity',{p_action:action,p_detail:String(detail||'').slice(0,300)}).then(()=>{},()=>{});}catch(e){}}
const _v16AddItem=addItem;
addItem=function(name,qty){const before=curList().items.length;const r=_v16AddItem.apply(this,arguments);if(curList().items.length>before)logAct('add_item',name+(qty?' ×'+qty:'')+' · '+curList().name);return r;};
const _v16ClearDone=clearDone;
clearDone=function(){const r=_v16ClearDone.apply(this,arguments);if(r)logAct('finish_shopping',r+' '+T('מוצרים','items')+' · '+(state.history[0]&&state.history[0].listName||''));return r;};
const _v16InsertPrice=insertPrice;
insertPrice=async function(row){const r=await _v16InsertPrice.apply(this,arguments);if(!r)logAct('price_report',(row.product||'')+' · '+(row.chain||'')+' · '+(row.price||''));return r;};
const _v16RemoveItem=removeItem;
removeItem=function(id){const it=curList().items.find(x=>x.id===id);const r=_v16RemoveItem.apply(this,arguments);if(it&&!curList().items.some(x=>x.id===id))logAct('remove_item',it.n);return r;};
document.addEventListener('click',e=>{if(e.target.closest('#invCreate'))logAct('invite_created','');if(e.target.closest('[data-mrm]'))logAct('member_removed','');if(e.target.closest('#fbSend'))logAct('feedback','');if(e.target.closest('#upConfirm'))logAct('upload_confirm',typeof upMode!=='undefined'?upMode:'');},true);
const _v16DoLogout=doLogout;
doLogout=async function(){logAct('logout','');return _v16DoLogout.apply(this,arguments);};

/* ---------- 🎰 מכונות אוטומטיות לעסקים: פחיות, חטיפים, קפה, מים ועוד ---------- */
const MKINDS={cans:['🥤','מכונת פחיות'],snacks:['🍫','מכונת חטיפים'],coffee:['☕','מכונת קפה'],water:['💧','מכונת מים'],ice:['🧊','מכונת קרח / גלידה'],toys:['🧸','מכונת צעצועים'],other:['🎰','מכונה אחרת']};
let mach16={list:[],open:null,err:''};
async function machLoad(){mach16.err='';const {data,error}=await sb.from('biz_machines').select('*').eq('chain',shop.chain).order('created_at');if(error){mach16.err=error.message;mach16.list=[];return;}mach16.list=data||[];}
const machFill=m=>{const s=m.slots||[];const cap=s.reduce((a,x)=>a+(Number(x.cap)||0),0),q=s.reduce((a,x)=>a+(Number(x.qty)||0),0);return cap?Math.round(100*q/cap):0;};
const machLow=m=>(m.slots||[]).filter(x=>x.product&&Number(x.qty)<=Math.max(1,Math.round((Number(x.cap)||0)*0.2))).length;
function machHtml(){
  if(mach16.err)return '<p class="muted-note">⚠️ '+(isAdmin()?T('צריך להריץ שוב את קוד ה-SQL. ',''):'')+esc(mach16.err)+'</p>';
  const m=mach16.open&&mach16.list.find(x=>x.id===mach16.open);
  if(m){const k=MKINDS[m.kind]||MKINDS.other;const need=(m.slots||[]).filter(s=>s.product&&Number(s.cap)>Number(s.qty));
    return '<div class="mecard"><div class="m16h"><button class="mini" data-mback="1">→ '+T('כל המכונות','All machines')+'</button><b>'+k[0]+' '+esc(m.name)+'</b><small>'+esc(m.location||'')+'</small></div>'+
      '<div class="m16kpi"><span>📦 '+T('מלאות','Full')+': <b>'+machFill(m)+'%</b></span><span>⚠️ '+T('עומדים להיגמר','Low')+': <b>'+machLow(m)+'</b></span><span>💰 '+T('בקופה','Cash')+': <b>'+fmtPrice(Number(m.cash)||0,myCurrency())+'</b></span><span>🔄 '+T('מילוי אחרון','Last refill')+': <b>'+(m.last_refill?esc(fmtDate(new Date(m.last_refill))):'—')+'</b></span></div>'+
      '<div class="row2 wrap15"><button data-mfill="1">🔄 '+T('מילוי מלא של כל התאים','Refill all')+'</button><button class="btn sec" data-mcash="1">💰 '+T('רישום כסף שנאסף','Record cash')+'</button><button class="btn sec" data-mneed="1">📋 '+T('מה להביא למילוי','Refill list')+' ('+need.length+')</button></div>'+
      '<div class="m16slots">'+(m.slots||[]).map((s,i)=>{const low=s.product&&Number(s.qty)<=Math.max(1,Math.round((Number(s.cap)||0)*0.2));return '<div class="m16slot'+(low?' low':'')+'" data-slot="'+i+'"><div class="m16code">'+esc(String(s.code||('#'+(i+1))))+'</div>'+
        '<input data-sf="product" value="'+esc(s.product||'')+'" placeholder="'+T('מוצר','Product')+'" maxlength="40" aria-label="'+T('מוצר בתא','Product')+'">'+
        '<div class="m16row"><label>'+T('מחיר','Price')+'<input data-sf="price" value="'+esc(String(s.price==null?'':s.price))+'" inputmode="decimal"></label><label>'+T('קיבולת','Capacity')+'<input data-sf="cap" value="'+esc(String(s.cap||''))+'" inputmode="numeric"></label></div>'+
        '<div class="m16q"><button data-sq="-1" title="'+T('נמכר אחד','Sold one')+'">−</button><b>'+(Number(s.qty)||0)+'/'+(Number(s.cap)||0)+'</b><button data-sq="1">+</button></div></div>';}).join('')+'</div>'+
      '<div class="row2 wrap15" style="margin-top:8px"><button class="btn sec" data-maddslot="1">➕ '+T('הוספת תא','Add slot')+'</button><button data-msave="1">💾 '+T('שמירת המוצרים והמחירים','Save')+'</button></div>'+
      '<label class="il">'+T('הערות (תקלות, מפתח, ספק...)','Notes')+'</label><textarea id="m16notes" maxlength="500">'+esc(m.notes||'')+'</textarea>'+
      '<div id="m16log" class="muted-note"></div><button class="btn sec" data-mdel="1" style="margin-top:10px">🗑️ '+T('מחיקת המכונה','Delete machine')+'</button></div>';}
  return '<div class="mecard"><h4>🎰 '+T('המכונות שלי','My machines')+' ('+mach16.list.length+')</h4><p class="muted-note">'+T('מכונות פחיות, חטיפים, קפה, מים ועוד: מה יש בכל תא, כמה נשאר, מה צריך להביא למילוי, כמה כסף נאסף — והתראה כשמשהו עומד להיגמר.','Track vending machines: slots, stock, refills and cash.')+'</p>'+
    (mach16.list.length?'<div class="m16list">'+mach16.list.map(m=>{const k=MKINDS[m.kind]||MKINDS.other;const f=machFill(m),low=machLow(m);return '<button class="m16card" data-mopen="'+esc(m.id)+'"><span class="m16ic">'+k[0]+'</span><span class="grow"><b>'+esc(m.name)+'</b><small>'+esc(k[1])+(m.location?' · '+esc(m.location):'')+'</small><span class="m16bar"><i style="width:'+f+'%"></i></span></span><span class="m16st">'+f+'%'+(low?'<em>⚠️ '+low+'</em>':'')+'</span></button>';}).join('')+'</div>':'<div class="empty">'+T('עוד אין מכונות. מוסיפים למטה 👇','No machines yet 👇')+'</div>')+
    '<h4>➕ '+T('הוספת מכונה','Add a machine')+'</h4><div class="m16add"><input id="m16name" maxlength="60" placeholder="'+T('שם (למשל: מכונה בלובי)','Name')+'"><select id="m16kind">'+Object.entries(MKINDS).map(([k,v])=>'<option value="'+k+'">'+v[0]+' '+v[1]+'</option>').join('')+'</select><input id="m16loc" maxlength="120" placeholder="'+T('מיקום / כתובת','Location')+'"><input id="m16n" inputmode="numeric" value="12" aria-label="'+T('מספר תאים','Slots')+'" title="'+T('מספר תאים','Slots')+'"><button id="m16go">➕ '+T('הוספה','Add')+'</button></div></div>';
}
function machCollect(m){document.querySelectorAll('#v8SheetBody [data-slot]').forEach(el=>{const s=m.slots[+el.dataset.slot];if(!s)return;el.querySelectorAll('[data-sf]').forEach(inp=>{const f=inp.dataset.sf;let v=inp.value.trim();if(f==='price')v=v===''?null:Math.max(0,parseFloat(v.replace(',','.'))||0);if(f==='cap')v=Math.max(0,parseInt(v,10)||0);if(f==='product')v=v.slice(0,40);s[f]=v;});});const n=$16('#m16notes');if(n)m.notes=n.value.slice(0,500);}
async function machSave(m,logKind,detail){m.updated_at=new Date().toISOString();const {error}=await sb.from('biz_machines').update({slots:m.slots,cash:m.cash,notes:m.notes,last_refill:m.last_refill,name:m.name,location:m.location,updated_at:m.updated_at}).eq('id',m.id);
  if(error){flash('⚠️ '+error.message);return false;}
  if(logKind)sb.from('biz_machine_log').insert({machine_id:m.id,chain:m.chain,kind:logKind,detail:detail||{},by_name:(state.user&&state.user.name)||''}).then(()=>{},()=>{});return true;}
function machRender(){const box=$16('#m16box');if(box)box.innerHTML=machHtml();if(mach16.open)machLog();}
async function machLog(){const el=$16('#m16log');if(!el)return;const {data}=await sb.from('biz_machine_log').select('kind,detail,by_name,created_at').eq('machine_id',mach16.open).order('created_at',{ascending:false}).limit(8);
  const L={refill:'🔄 '+T('מילוי','Refill'),sale:'🛒 '+T('מכירה','Sale'),cash:'💰 '+T('כסף נאסף','Cash'),fix:'🔧 '+T('תיקון','Fix')};
  el.innerHTML=(data||[]).length?'<b>'+T('פעולות אחרונות','Recent')+'</b><br>'+data.map(r=>esc(L[r.kind]||r.kind)+' · '+esc(fmtDate(new Date(r.created_at)))+' '+esc(fmtTime(new Date(r.created_at)))+(r.by_name?' · '+esc(r.by_name):'')+(r.detail&&r.detail.amount?' · '+esc(fmtPrice(r.detail.amount,myCurrency())):'')+(r.detail&&r.detail.units?' · '+esc(String(r.detail.units))+' '+T('יח׳','units'):'')).join('<br>'):'';}
const _v16DrawShop=drawShop;
drawShop=function(){_v16DrawShop.apply(this,arguments);const bar=$16('#shopTabs');if(!bar)return;
  if(!bar.querySelector('[data-shtab="machines"]'))bar.insertAdjacentHTML('beforeend','<button class="cb'+(shop.tab==='machines'?' on':'')+'" data-shtab="machines">🎰 '+T('מכונות','Machines')+'</button>');
  if(shop.tab!=='machines')return;
  bar.querySelectorAll('.cb').forEach(x=>x.classList.toggle('on',x.dataset.shtab==='machines'));
  const b=$16('#v8SheetBody');[...b.children].forEach(c=>{if(c!==bar&&c.id!=='shChain'&&!c.matches('p.muted-note:first-child'))c.remove();});
  const box=document.createElement('div');box.id='m16box';box.innerHTML='<div class="empty">'+T('טוען...','Loading...')+'</div>';b.appendChild(box);
  machLoad().then(machRender);};
document.addEventListener('click',async e=>{const box=e.target.closest('#m16box');if(!box)return;const t=e.target;
  const m=mach16.open&&mach16.list.find(x=>x.id===mach16.open);
  if(t.closest('#m16go')){const name=$16('#m16name').value.trim();if(!name){flash(T('צריך שם למכונה','Name needed'));return;}if(hasProfanity(name)){flash('🙏');return;}
    const kind=$16('#m16kind').value,n=Math.min(80,Math.max(1,parseInt($16('#m16n').value,10)||12));const cols=kind==='cans'?4:6;
    const slots=Array.from({length:n},(_,i)=>({code:String.fromCharCode(65+Math.floor(i/cols))+(i%cols+1),product:'',price:null,cap:kind==='cans'?10:8,qty:0}));
    const {data,error}=await sb.from('biz_machines').insert({chain:shop.chain,name,kind,location:$16('#m16loc').value.trim().slice(0,120),slots}).select().single();
    if(error){flash('⚠️ '+error.message);return;}mach16.list.push(data);mach16.open=data.id;logAct('machine_added',name);machRender();return;}
  const op=t.closest('[data-mopen]');if(op){mach16.open=op.dataset.mopen;machRender();return;}
  if(t.closest('[data-mback]')){mach16.open=null;machRender();return;}
  if(!m)return;
  if(t.closest('[data-maddslot]')){machCollect(m);const i=m.slots.length;m.slots.push({code:'#'+(i+1),product:'',price:null,cap:8,qty:0});machRender();return;}
  if(t.closest('[data-msave]')){machCollect(m);if(await machSave(m))flash('💾 '+T('נשמר','Saved'));machRender();return;}
  const sq=t.closest('[data-sq]');if(sq){machCollect(m);const s=m.slots[+sq.closest('[data-slot]').dataset.slot];const d=+sq.dataset.sq;const nq=Math.max(0,Math.min(Number(s.cap)||999,(Number(s.qty)||0)+d));if(nq===Number(s.qty))return;s.qty=nq;
    if(d<0&&s.price)m.cash=Math.round(((Number(m.cash)||0)+Number(s.price))*100)/100;
    await machSave(m,d<0?'sale':null,d<0?{slot:s.code,product:s.product,price:s.price}:null);machRender();
    if(d<0&&s.product&&nq<=Math.max(1,Math.round((Number(s.cap)||0)*0.2)))flash('⚠️ '+s.product+T(' עומד להיגמר במכונה',' is running low'));return;}
  if(t.closest('[data-mfill]')){machCollect(m);let units=0;m.slots.forEach(s=>{if(s.product&&Number(s.cap)>Number(s.qty)){units+=Number(s.cap)-Number(s.qty);s.qty=Number(s.cap);}});m.last_refill=new Date().toISOString();
    if(await machSave(m,'refill',{units}))flash('🔄 '+T('המכונה מולאה — ','Refilled — ')+units+T(' יחידות',' units'));machRender();return;}
  if(t.closest('[data-mcash]')){const v=(await uiPrompt(T('כמה כסף נאסף מהמכונה? (₪)','Cash collected?'),String(m.cash||'')));if(v===null)return;const a=Math.max(0,parseFloat(String(v).replace(',','.'))||0);
    if(await machSave(Object.assign(m,{cash:0}),'cash',{amount:a}))flash('💰 '+T('נרשם: ','Recorded: ')+fmtPrice(a,myCurrency()));machRender();return;}
  if(t.closest('[data-mneed]')){machCollect(m);const need={};m.slots.forEach(s=>{if(s.product&&Number(s.cap)>Number(s.qty))need[s.product]=(need[s.product]||0)+Number(s.cap)-Number(s.qty);});
    const txt='🎰 '+m.name+(m.location?' ('+m.location+')':'')+' — '+T('להביא למילוי','to refill')+':\n'+(Object.entries(need).map(([p,q])=>'• '+p+' ×'+q).join('\n')||T('הכל מלא 👍','All full 👍'));
    openSheetMini16(T('מה להביא למילוי','Refill list'),txt);return;}
  if(t.closest('[data-mdel]')){if(!(await uiConfirm(T('למחוק את המכונה "'+m.name+'"?','Delete machine?'))))return;const {error}=await sb.from('biz_machines').delete().eq('id',m.id);if(error){flash('⚠️ '+error.message);return;}mach16.list=mach16.list.filter(x=>x.id!==m.id);mach16.open=null;machRender();}
});
function openSheetMini16(title,txt){const ov=document.createElement('div');ov.className='qp15 open';ov.innerHTML='<div class="qpcard"><div class="qphead"><b>'+esc(title)+'</b><button aria-label="'+T('סגירה','Close')+'">✕</button></div><pre class="pre16">'+esc(txt)+'</pre><div class="row2 wrap15"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(txt)+'">💬 '+T('שליחה בוואטסאפ','WhatsApp')+'</a><button class="btn sec" data-cp16>📋 '+T('העתקה','Copy')+'</button></div></div>';
  document.body.appendChild(ov);ov.addEventListener('click',async e=>{if(e.target===ov||e.target.closest('.qphead button')){ov.remove();return;}if(e.target.closest('[data-cp16]')){try{await navigator.clipboard.writeText(txt);flash('📋 '+T('הועתק','Copied'));}catch(x){}}});}

/* ---------- ℹ️ אודות: מספר גרסה, הסיפור ומה חדש ---------- */
let ABOUT_STORY='רציתי מאוד לשתף בבית מה חסר — שכל אחד יוכל לראות ולהוסיף, ולא לשכוח שום דבר בקניות. מתוך הצורך הזה עלה במוחי רעיון לפתח את האתר, ולטובת כולם שיתפתי את מה שבניתי. תהנו מאוד! 🙏\n\nהיום "רשימת קניות" הוא הרבה יותר מרשימה: רשימה משותפת לכל המשפחה בזמן אמת, "הבית שלי" עם מה יש ומה חסר (כולל כמויות וקילו), צילום קבלות שמעדכן הכל לבד, השוואת מחירים ומבצעים באזור, יאמי — עוזרת חכמה לקניות, לוח עברי וזמני היום, משתמשים משניים עם הרשאות, ואזור מלא לבעלי עסקים. הכל בחינם, מאושר בנטפרי, בטלפון ובמחשב.';

const _v16OpenAbout=openAbout;
openAbout=function(){_v16OpenAbout.apply(this,arguments);const b=$16('#aboutBody');if(!b||b.querySelector('.ver16'))return;
  const story='<div class="story16"><h3>💚 '+T('איך זה התחיל','How it started')+'</h3>'+ABOUT_STORY.split(/\n{2,}/).map(x=>'<p>'+esc(x).replace(/\n/g,'<br>')+'</p>').join('')+'</div>';
  const log='<details class="chg16"><summary>🆕 '+T('מה חדש — לפי גרסאות','What\'s new by version')+'</summary>'+CHANGELOG.map(([v,d,was,now])=>'<div class="chgv"><b>'+T('גרסה ','Version ')+esc(v)+'</b> <small>'+esc(d)+'</small><p>'+esc(was)+'</p><p>'+esc(now)+'</p></div>').join('')+'</details>';
  const copy=b.querySelector('.about-copy');const html=story+log+'<p class="ver16">'+T('גרסה ','Version ')+APP_VERSION+'</p>';
  if(copy)copy.insertAdjacentHTML('beforebegin',html);else b.insertAdjacentHTML('beforeend',html);};
/* כל עדכון גרסה מספר פעם אחת מה היה ומה חדש */
setTimeout(()=>{try{const seenV=localStorage.getItem('yam_ver_seen');if(seenV===APP_VERSION)return;if(!state.user){return;}
  if(!seenV){localStorage.setItem('yam_ver_seen',APP_VERSION);return;} /* משתמש חדש — לא מציפים */
  if(!$16('#updPop').hidden)return;const c=CHANGELOG[0];
  showUpdates([{title:'🆕 '+T('עודכנו לגרסה ','Updated to version ')+c[0],body:c[2]+'\n\n'+c[3],created_at:new Date().toISOString()}]);
  const ok=$16('#updOk');const prev=ok.onclick;ok.onclick=function(){try{localStorage.setItem('yam_ver_seen',APP_VERSION);}catch(e){}ok.onclick=prev;$16('#updPop').hidden=true;};
}catch(e){}},6000);

/* ---------- 👩‍🍳 יאמי מסבירה בהרחבה על האתר, ומה חדש בכל גרסה ---------- */
let SITE_TOUR16=T('הנה כל מה שיש באתר "רשימת קניות" 💚 (חינם, מאושר בנטפרי, בטלפון ובמחשב):\n\n'+
 '📝 רשימה — כותבים או מקליטים 🎤 ("חלב 2 ולחם"), או ➕ ובוחרים ממאגר מוצרים לפי קטגוריות עם כמות (יח׳/ק״ג/גרם/ליטר/חבילות). אפשר לבחור את המוצר המדויק, מסמנים ✓ מה שנקנה, ו"סיום קנייה" שומר בהיסטוריה.\n'+
 '🗂️ הרשימות שלי — כמה רשימות במקביל, והיסטוריית הקניות לפי תאריך עם שכפול לרשימה חדשה.\n'+
 '🏠 הבית שלי — מה יש ומה חסר, כמות לכל מוצר (− / +), ו💰 תקציב הבית.\n'+
 '🧾 קבלות — מצלמים, ואני קוראת מוצרים, מחירים והנחות ומעדכנת את הבית.\n'+
 '💰 מחירים — "איפה הכי זול?" לכל הרשימה, מחירים לפי רשתות, מבצעים באזור.\n'+
 '🏪 עסקים — מדריך עסקים, הזמנה ישירה ומבצעים. בעלי עסקים: דף עסק, הזמנות, מלאי, קופה ומכונות אוטומטיות.\n'+
 '👥 משתמשים משניים — ⚙️ ← "משתמשים משניים והרשאות": קישור + סיסמה חד פעמית, ואתם קובעים מה מותר.\n'+
 '🕯️ זמני היום ושבת · 📋 רשימות מוכנות לשבת ולחגים · 🔔 התראות · 📐 גודל תצוגה · 🌙 מצב כהה · ♿ נגישות.\n\n'+
 'רוצים שאסביר משהו מסוים? כתבו למשל "איך מצרפים משתמש?" או "איך מצלמים קבלה?" 🙂','Here is everything the site offers 💚 — lists, history, home stock, budget, receipts, prices, businesses, secondary users, Shabbat times and more.');
let HOWTO16=[
 [/(משתמש משני|לצרף|להזמין).*(משתמש|בן משפחה|אשתי|בעלי|ילד|עוזרת)|איך מצרפים/,T('👥 צירוף משתמש משני:\n1. ⚙️ ← "משתמשים משניים והרשאות".\n2. מסמנים מה הוא יראה ומה מותר לו (להוסיף, לסמן, למחוק, לאשר קנייה, לעדכן את הבית).\n3. "יצירת קישור + סיסמה חד פעמית" ← שולחים בוואטסאפ/SMS/מייל.\n4. הוא נכנס לקישור, כותב שם וסיסמה — ומצטרף. אפשר להסיר אותו בכל רגע.','Secondary users: ⚙️ → Secondary users → create link + code.')],
 [/(איך|לצלם|העלאת).*(^|\s)(ה)?(קבלה|קבלות)(?=\s|$|[?？!.,])/,T('🧾 צילום קבלה: לוחצים על "🧾 קבלה" בצד (או ⚙️ ← קניות והבית) ← מצלמים את כל הקבלה (אפשר כמה תמונות) ← אני קוראת את המוצרים, המחירים וההנחות ← בודקים ומאשרים. הכל נכנס לבית ולהיסטוריה, ואפשר לפרסם את המחירים לכולם 💚','Receipts: tap 🧾 Receipt, photograph, confirm.')],
 [/(להתקין|התקנה|התקנת|מתקינים|מתקין|להוריד|מורידים|להוסיף|מוסיפים)\s.*(אפליקציה|מסך הבית)|^(איך|איפה)\s+(להתקין|מתקינים|מתקין)(\s+(את\s+)?(ה)?(אתר|אפליקציה))?[?？!.]*$/,T('📱 התקנה כאפליקציה:\n🍎 אייפון: ספארי ← כפתור השיתוף ← "הוספה למסך הבית".\n🤖 אנדרואיד: כרום ← תפריט ⋮ ← "התקנת האפליקציה".\n💻 מחשב: בכרום/אדג׳ — סמל ההתקנה בשורת הכתובת.','Install: Share → Add to Home Screen / ⋮ → Install app.')],
 [/(מכונה|מכונות|מכונת).*(פחיות|חטיפים|קפה|אוטומטי)|ניהול מכונות/,T('🎰 בעלי עסקים: "האתר העסקי" ← לשונית "🎰 מכונות" ← מוסיפים מכונה (פחיות, חטיפים, קפה...) ← לכל תא: מוצר, מחיר, קיבולת. "−" רושם מכירה, "מילוי מלא" ממלא הכל, "מה להביא למילוי" נותן רשימה לשליחה בוואטסאפ, ויש רישום של כסף שנאסף.','Business site → Machines tab.')]];
async function v16BotPre(raw){const t=norm(raw);
  if(/^(מה|איזה)\s.*(יש|אפשר|יודע|יודעת|עושה|עושים)\s.*(באתר|האתר|באפליקציה|האפליקציה)|^(הסבר|תסבירי|תסביר|ספרי|ספר)\s.*(על )?(האתר|האפליקציה)|איך (עובד|עובדת) (האתר|האפליקציה)|^(סיור|מדריך)( באתר)?$/.test(t)){botSay(SITE_TOUR16);return true;}
  if(/^(מה חדש|מה התחדש|עדכונים|מה השתנה|איזו גרסה|גרסה)(\s+(באתר|באפליקציה|בגרסה|בגרסה החדשה|בגרסה האחרונה|יש|עכשיו))*[?？!.]*$/.test(t)){const c=CHANGELOG[0];botSay('🆕 '+T('גרסה ','Version ')+c[0]+' ('+c[1]+')\n\n'+c[2]+'\n\n'+c[3]+'\n\n'+T('את כל הגרסאות אפשר לראות ב-⚙️ ← אודות האתר.','All versions: Menu → About.'));return true;}
  for(const [rx,ans] of HOWTO16)if(rx.test(t)){botSay(ans);return true;}
  return false;}
yamiStep(v16BotPre);
