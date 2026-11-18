
/* ================= הגדרות ענן (Supabase) ================= */
const SB_URL='https://ygyfodxfbebnkwdcbjrp.supabase.co';
const SB_KEY='sb_publishable_ePRvA2OrDbBN3tbjbD3p-w_8maEwTCK';
// הבעלים: רק חשבון שסומן yam_owner ב-app_metadata (רק SQL/השרת יכולים לסמן; שום מייל לא כתוב בקוד כבעלים)
const ownerFlag=u=>!!(u&&u.app_metadata&&(u.app_metadata.yam_owner===true||u.app_metadata.yam_owner==='true'));
const CONTACT_EMAIL='info@yamshopping.com';
const MAIN_SITE='https://yamshopping.com';
/* חזרה מכניסה עם גוגל שנחתה בכתובת הישנה (netlify/vercel) — אם הכניסה התחילה באתר החדש, ממשיכים אותה שם */
(function(){try{
  const h=location.hostname;if(!/\.netlify\.app$|\.vercel\.app$/.test(h))return;
  const u=location.search+location.hash;if(!/[?&#](code|access_token|error_description)=/.test(u))return;
  if(localStorage.getItem('oauthHere')){localStorage.removeItem('oauthHere');return;} /* הכניסה התחילה כאן — נשארים */
  location.replace(MAIN_SITE+location.pathname+u);
}catch(e){}})();
let sb=null;
try{if(window.supabase&&window.supabase.createClient)sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});}catch(e){console.error('supabase init failed',e);}
let authUser=null; /* המשתמש המחובר מ-Supabase */
/* תפקידים: בעלים (המייל שלך) · מנהל נוסף · צוות פיקוח — נקבעים בשרת, כאן רק מחליטים מה להציג */
let myRole=null;
let mfaPending=false; /* הופעל אימות דו-שלבי ועוד לא הוקלד קוד בכניסה הזאת — בלי הרשאות ניהול (כמו במסד) */
function isOwner(){return !!(authUser&&!mfaPending&&ownerFlag(authUser)&&authUser.email_confirmed_at);}
function isAdmin(){return isOwner()||myRole==='admin';}
function isStaff(){return isAdmin()||myRole==='moderator';}
function applyAdminUi(){document.body.classList.toggle('is-admin',isAdmin());document.body.classList.toggle('is-staff',isStaff());}
/* הרשאות לכל איש צוות (הבעלים בוחר בבק אופיס ← 👮 צוות). התפקיד הוא התקרה, וכאן רק מצמצמים בתוכו */
let myPerms=null;
function permOk(k){if(isOwner())return true;if(!isStaff())return false;if(!myPerms)return k==='visitors'||k==='notify'||(isAdmin()&&(k==='emails'||k==='delete_users'));return !!myPerms[k];}
function tabPermOk(s){if(isOwner()||!myPerms||!Array.isArray(myPerms.tabs))return true;return s==='dash'||myPerms.tabs.includes(s);}
/* 🔐 אימות דו-שלבי: מי שהפעיל קוד מאפליקציית Authenticator מתבקש להקליד אותו אחרי הכניסה. בלי הקוד — האתר עובד כרגיל, אבל בלי הרשאות ניהול */
function askMfaCode(again){return new Promise(res=>{const ov=document.createElement('div');ov.className='qp15 open';ov.id='mfaAsk';
  ov.innerHTML='<div class="qpcard"><div class="qphead"><b>🔐 '+T('קוד אימות','Verification code')+'</b><button aria-label="'+T('סגירה','Close')+'">✕</button></div>'+
    '<p class="muted164">'+(again?T('הקוד לא נכון או שפג תוקפו. נסו את הקוד החדש מהאפליקציה.','Wrong or expired code. Try the new code from the app.'):T('החשבון שלך מוגן באימות דו-שלבי. הקלידו את הקוד בן 6 הספרות מאפליקציית Authenticator.','Your account uses two-step sign-in. Type the 6-digit code from your Authenticator app.'))+'</p>'+
    '<input id="mfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr" style="font-size:22px;letter-spacing:6px;text-align:center">'+
    '<div class="row2 wrap15"><button class="btn" data-mfaok>✔ '+T('אישור','OK')+'</button><button class="btn sec" data-mfano>'+T('בלי הרשאות ניהול','Skip')+'</button></div></div>';
  document.body.appendChild(ov);const inp=ov.querySelector('#mfaCode');setTimeout(()=>inp.focus(),50);
  const done=v=>{ov.remove();res(v);};
  const go=()=>{const v=inp.value.replace(/\D/g,'');if(v.length===6)done(v);};
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')go();});
  ov.addEventListener('click',e=>{if(e.target.closest('[data-mfaok]'))go();else if(e.target===ov||e.target.closest('.qphead button')||e.target.closest('[data-mfano]'))done(null);});});}
let mfaSkip=false;
async function mfaGate(){mfaPending=false;try{
  const {data}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(!data||data.currentLevel!=='aal1'||data.nextLevel!=='aal2')return;
  try{const {data:off}=await sb.rpc('mfa_global_off');if(off===true)return;}catch(e){}
  mfaPending=true;if(mfaSkip)return;
  const {data:f}=await sb.auth.mfa.listFactors();const t=((f&&f.totp)||[]).find(x=>x.status==='verified');if(!t)return;
  for(let i=0;i<5;i++){const code=await askMfaCode(i>0);if(!code){mfaSkip=true;return;}if(await mfaVerify(t.id,code)){mfaPending=false;return;}}
}catch(e){}}
/* בדיקת הקוד בשרת (auth-guard): שם "צור אתגר" ו"בדוק קוד" יוצאים מאותה כתובת. מהדפדפן, בחיבור דרך סינון או סלולרי,
   כל בקשה יכולה לצאת מכתובת אחרת — ו-Supabase דחה קוד נכון ("הקוד לא נכון"). אם השרת לא זמין — כמו קודם, ועוד ניסיון אחד */
async function mfaVerify(factorId,code){
  if(typeof guard==='function'){const r=await guard('mfa_verify',{factor_id:factorId,code},true);
    if(r&&r.ok&&r.session){const {error}=await sb.auth.setSession({access_token:r.session.access_token,refresh_token:r.session.refresh_token});if(!error)return true;}
    if(r&&r.error==='invalid')return false;}
  for(let k=0;k<2;k++){const {error}=await sb.auth.mfa.challengeAndVerify({factorId,code});if(!error)return true;
    if(!/ip.address|mismatch/i.test((error.code||'')+' '+(error.message||'')))return false;}
  return false;}
async function loadRole(){myRole=null;myPerms=null;if(sb&&authUser){await mfaGate();try{const {data}=await sb.rpc('my_role');myRole=data||null;}catch(e){}
  if(myRole){try{const {data,error}=await sb.rpc('my_perms');if(!error)myPerms=data||null;}catch(e){}}}applyAdminUi();}
let MID='';try{if(!localStorage.getItem('yamh_mid'))localStorage.setItem('yamh_mid',Math.random().toString(36).slice(2,10));MID=localStorage.getItem('yamh_mid')||'';}catch(e){}
if(!MID)MID=Math.random().toString(36).slice(2,10);

/* ================= סינון קללות וגסויות — בכל שפה ================= */
const BAD_HE=['זונה','זונות','שרמוטה','שרמוטות','שרמוט','כוסאמק','כוסאמאק','כוס אמק','כוס אמא','כוס אחתק','כוסית','זין','זיין','לזיין','מזדיין','תזדיין','תזדייני','יזדיין','הזדיין','מזוין','בן זונה','בת זונה','מניאק','מנייאק','מניאקית','חרא','חארה','חרה עליך','סתום את הפה','מטומטם','מטומטמת','אידיוט','אידיוטית','דביל','דבילית','אהבל','טמבל','כלבה','שמוק','פאקינג','פאק','ימח שמך','לך תזדיין','קיבינימט','קוקסינל','הומו מסריח','מפגר','מפגרת','ביץ','מאניאק','יא חמאר','חמאר','כלב בן כלב','עוף מפה'];
const BAD_OTHER=['fuck','fck','fuk','f*ck','shit','sh1t','bitch','b1tch','bastard','asshole','arsehole','dick','cunt','whore','slut','motherf','wtf','stfu','piss','damn','crap','douche','retard','nigg','faggot','fag',
'блять','бля','сука','хуй','хуе','пизд','ебат','ёб','еба','мудак','нахуй','пидор','говно','шлюха',
'كس','شرموط','منيوك','زب','خرا','عرص','متناك','يلعن',
'puta','puto','mierda','cabron','cabrón','pendejo','coño','joder','verga',
'merde','putain','salope','connard','enculé','encule','batard',
'scheiße','scheisse','arschloch','hure','fotze','wichser','ficken',
'cazzo','vaffanculo','stronzo','porra','caralho','kurwa','orospu','siktir','amk'];
function stripNiqqud(t){return (t||'').replace(/[\u0591-\u05BD\u05BF-\u05C7]/g,'');}
let bannedExtra=[];
/* מחזיר את המילה האסורה שנמצאה (או '' אם אין). רק מילה שלמה — לא חלק ממילה רגילה,
   כדי שרשימת קניות רגילה לא תסומן בטעות כ"שפה לא נקייה". */
function normProfanity(s){return stripNiqqud(String(s||'')).toLowerCase().replace(/[0@]/g,'o').replace(/[1!|]/g,'i').replace(/\$/g,'s').replace(/[^\p{L}\p{N}\s*]/gu,' ').replace(/\s+/g,' ').trim();}
const PROFANITY_OK=['shitake','shiitake','shitakes'];
function profanityMatch(text){
  const t=' '+normProfanity(text)+' ';
  const tokens=t.trim().split(' ').filter(k=>!PROFANITY_OK.includes(k));
  const pre='והבלשכ';
  /* מילה שלמה, או עם אות שימוש אחת בתחילתה (ו/ה/ב/ל/ש/כ). ביטוי של כמה מילים — רק כשהוא מופיע בשלמותו */
  const wordHit=(w,inside)=>{
    if(!w)return false;
    if(w.includes(' '))return t.includes(' '+w+' ')||[...pre].some(c=>t.includes(' '+c+w+' '));
    return tokens.some(k=>k===w||(k.length===w.length+1&&pre.includes(k[0])&&k.slice(1)===w)||(inside&&w.length>=5&&k.includes(w)));
  };
  /* מהרשימה המובנית: קללות ארוכות ומובהקות (5 אותיות ומעלה) נתפסות גם בתוך מילה מודבקת */
  let hit=BAD_HE.find(w=>wordHit(w,true));if(hit)return hit;
  /* מילים שהצוות הוסיף בבק אופיס — רק כמילה שלמה, אף פעם לא כחלק ממילה אחרת */
  hit=bannedExtra.map(normProfanity).find(w=>wordHit(w,false));if(hit)return hit;
  return BAD_OTHER.find(w=>{
    if(/^[a-z*]+$/.test(w)){ if(w.length<=4)return tokens.some(k=>k===w||k.startsWith(w)&&k.length<=w.length+3); return tokens.some(k=>k.startsWith(w)||k.replace(/[^a-z*]/g,'').includes(w)); }
    return tokens.some(k=>w.length<=2?k===w:k.startsWith(w)||(w.length>=4&&k.replace(/[^a-zа-яё؀-ۿ*]/g,'').includes(w)));
  })||'';
}
function hasProfanity(text){return !!profanityMatch(text);}

/* ================= לוח עברי: חגים, פרשת השבוע, זמני שבת ================= */
const HC=window.hebcal||null;
const CITIES_ABROAD={'ניו יורק':[40.7128,-74.006,18,'America/New_York','New York'],'ברוקלין':[40.6782,-73.9442,18,'America/New_York','Brooklyn'],'לייקווד':[40.0821,-74.2097,18,'America/New_York','Lakewood'],'מונסי':[41.1112,-74.0685,18,'America/New_York','Monsey'],'מיאמי':[25.7617,-80.1918,18,'America/New_York','Miami'],'שיקגו':[41.8781,-87.6298,18,'America/Chicago','Chicago'],'לוס אנג׳לס':[34.0522,-118.2437,18,'America/Los_Angeles','Los Angeles'],'טורונטו':[43.6532,-79.3832,18,'America/Toronto','Toronto'],'מונטריאול':[45.5017,-73.5673,18,'America/Toronto','Montreal'],'מקסיקו סיטי':[19.4326,-99.1332,18,'America/Mexico_City','Mexico City'],'בואנוס איירס':[-34.6037,-58.3816,18,'America/Argentina/Buenos_Aires','Buenos Aires'],'לונדון':[51.5074,-0.1278,18,'Europe/London','London'],'מנצ׳סטר':[53.4808,-2.2426,18,'Europe/London','Manchester'],'אנטוורפן':[51.2194,4.4025,18,'Europe/Brussels','Antwerp'],'פריז':[48.8566,2.3522,18,'Europe/Paris','Paris'],'ציריך':[47.3769,8.5417,18,'Europe/Zurich','Zurich'],'מוסקבה':[55.7558,37.6173,18,'Europe/Moscow','Moscow'],'קייב':[50.4501,30.5234,18,'Europe/Kyiv','Kyiv'],'יוהנסבורג':[-26.2041,28.0473,18,'Africa/Johannesburg','Johannesburg'],'מלבורן':[-37.8136,144.9631,18,'Australia/Melbourne','Melbourne'],'סידני':[-33.8688,151.2093,18,'Australia/Sydney','Sydney']};
const IL=()=>!prefs.diaspora;
const CITIES={'ירושלים':[31.778,35.235,40],'בני ברק':[32.0807,34.8338,20],'בית שמש':[31.747,34.9881,30],'אלעד':[32.0522,34.9511,20],'מודיעין עילית':[31.933,35.0433,30],'ביתר עילית':[31.6966,35.115,40],'אשדוד':[31.8014,34.6435,20],'חיפה':[32.794,34.9896,30],'תל אביב':[32.0853,34.7818,20],'פתח תקווה':[32.084,34.8878,20],'נתניה':[32.3215,34.8532,20],'רחובות':[31.8928,34.8113,20],'צפת':[32.9646,35.496,30],'טבריה':[32.7922,35.5312,30],'באר שבע':[31.2518,34.7913,20],'רמת גן':[32.0684,34.8248,20],'חדרה':[32.434,34.919,20],'נתיבות':[31.4167,34.5833,20],'קרית גת':[31.61,34.7642,20],'בת ים':[32.0171,34.7454,20],'אשקלון':[31.6688,34.5743,20],'עמנואל':[32.161,35.136,20],'חריש':[32.46,35.05,20]};
const heName=e=>prefs.lang==='en'?e.render('en'):stripNiqqud(e.render('he-x-NoNikud')||e.render('he'));
const normHoliday=s=>stripNiqqud(s).replace(/["'׳״]/g,'').replace(/\s+/g,' ').trim();
Object.assign(CITIES,CITIES_ABROAD);
/* העיר של המשתמש (לזמני שבת): "העיר שלי" באזור האישי, ואם לא נבחרה — העיר שבכתובת למשלוח.
   מזהים גם כתיב אחר: "בני-ברק", ב"ב, פתח תקוה, קריית גת — אחרת זה נפל בשקט לירושלים */
const CITY_ALIAS={'בב':'בני ברק','תא':'תל אביב','תל אביב יפו':'תל אביב','פת':'פתח תקווה','ים':'ירושלים','מודיעין עלית':'מודיעין עילית','ביתר':'ביתר עילית'};
const cityLoose=v=>String(v||'').replace(/[\u0591-\u05C7]/g,'').replace(/["'׳״`]/g,'').replace(/[-־–—_.,]/g,' ').replace(/\s+/g,' ').trim().replace(/יי/g,'י').replace(/וו/g,'ו');
const CITY_LOOSE={};Object.keys(CITIES).forEach(c=>{CITY_LOOSE[cityLoose(c)]=c;});Object.keys(CITY_ALIAS).forEach(a=>{CITY_LOOSE[cityLoose(a)]=CITY_ALIAS[a];});
function knownCity(v){if(!v)return null;if(CITIES[v])return v;return CITY_LOOSE[cityLoose(v)]||null;}
function userCity(){const me=state.me||{};return knownCity(me.city)||knownCity(me.address&&me.address.city)||knownCity(state.city)||'ירושלים';}
const cityName=c=>prefs.lang==='en'&&CITIES[c]&&CITIES[c][4]?CITIES[c][4]:c;
/* ימי פטירה של צדיקים וגדולי ישראל (חודש לפי מספור hebcal: ניסן=1 … תשרי=7, אדר=12 — בשנה מעוברת נחשב אדר ב׳) */
const HILULOT=[[8,11,'רחל אמנו','Rachel Imeinu'],[8,3,'הרב עובדיה יוסף','Rav Ovadia Yosef'],[8,15,'החזון איש','the Chazon Ish'],[8,16,'הרב אלעזר מנחם מן שך','Rav Elazar Menachem Man Shach'],
  [9,12,'הרב אהרן יהודה לייב שטינמן','Rav Aharon Yehuda Leib Steinman'],[10,20,'הרמב״ם','the Rambam'],[11,4,'בבא סאלי','the Baba Sali'],[12,7,'משה רבנו','Moshe Rabbeinu'],
  [12,17,'הרב חיים קניבסקי','Rav Chaim Kanievsky'],[2,14,'רבי מאיר בעל הנס','Rabbi Meir Baal HaNes'],[4,28,'הרב יוסף שלום אלישיב','Rav Yosef Shalom Elyashiv'],
  [5,5,'האר״י הקדוש','the Arizal'],[6,24,'החפץ חיים','the Chafetz Chaim'],[7,19,'הגר״א','the Vilna Gaon']];
function hilulotOn(hd){const leap=hd.isLeapYear(),m=hd.getMonth(),dd=hd.getDate();
  return HILULOT.filter(([hm,hday])=>hday===dd&&(hm===12?m===(leap?13:12):hm===m)).map(([,,he,en])=>({getFlags:()=>0,render:l=>l==='en'?'Yahrzeit of '+en:'יום פטירת '+he}));}
/* ימים ממלכתיים מודרניים (ימי זיכרון לראשי ממשלה וכו׳) לא מוצגים; ימי פטירת צדיקים כן */
function holidaysOn(d){if(!HC)return [];try{const hd=new HC.HDate(d);return (HC.HebrewCalendar.getHolidaysOnDate(hd,IL())||[]).filter(e=>!(e.getFlags()&HC.flags.MODERN_HOLIDAY)).concat(hilulotOn(hd));}catch(e){return [];}}
function upcomingHolidays(days){
  if(!HC)return [];
  const start=new Date();start.setHours(0,0,0,0);const end=new Date(start.getTime()+days*86400000);
  try{return HC.HebrewCalendar.calendar({start,end,il:IL(),noModern:true}).filter(e=>!(e.getFlags()&(HC.flags.DAILY_LEARNING|HC.flags.OMER_COUNT|HC.flags.MOLAD|HC.flags.SHABBAT_MEVARCHIM|HC.flags.HEBREW_DATE)));}catch(e){return [];}
}
function mainHolidays(days){
  const seen=new Set();
  return upcomingHolidays(days).filter(e=>{const f=e.getFlags();if(f&(HC.flags.ROSH_CHODESH|HC.flags.SPECIAL_SHABBAT|HC.flags.MINOR_FAST))return false;
    const b=(e.basename&&e.basename())||heName(e);if(seen.has(b))return false;seen.add(b);return true;});
}
function nextParasha(){
  if(!HC)return '';
  const start=new Date();start.setHours(0,0,0,0);const end=new Date(start.getTime()+8*86400000);
  try{
    const evs=HC.HebrewCalendar.calendar({start,end,il:IL(),sedrot:true,noHolidays:false});
    const sat=evs.find(e=>e.getFlags()&HC.flags.PARSHA_HASHAVUA);
    if(sat)return heName(sat);
    const chag=evs.find(e=>e.getDate().greg().getDay()===6&&(e.getFlags()&HC.flags.CHAG));
    return chag?('השבת חג: '+heName(chag)):'';
  }catch(e){return '';}
}
function shabbatTimes(city){
  if(!HC)return null;
  const c=CITIES[city]||CITIES['ירושלים'];const name=CITIES[city]?city:'ירושלים';
  try{
    const inIsrael=!c[3];const loc=new HC.Location(c[0],c[1],inIsrael,c[3]||'Asia/Jerusalem',c[4]||name,inIsrael?'IL':'XX');
    const start=new Date();start.setHours(0,0,0,0);const end=new Date(start.getTime()+8*86400000);
    const evs=HC.HebrewCalendar.calendar({start,end,il:inIsrael,candlelighting:true,location:loc,candleLightingMins:c[2]});
    const cl=evs.find(e=>e.getDesc()==='Candle lighting');const hv=evs.find(e=>e.getDesc()==='Havdalah'&&(!cl||e.getDate().greg()>=cl.getDate().greg()));
    return {city:cityName(name),candles:cl?heName(cl):'',candlesDate:cl?cl.getDate().greg():null,havdalah:hv?heName(hv):''};
  }catch(e){return null;}
}
function jewishLine(){
  const today=holidaysOn(new Date()).map(heName);const par=nextParasha();
  let s='';
  if(today.length)s+=' · '+today.map(esc).join(' · ');
  if(par)s+='<span class="jday">📜 '+esc(par)+'</span>';
  return s;
}
function findHolidayDate(name){
  const want=normHoliday(name==='שמחת תורה'?'שמיני עצרת':name);
  const evs=upcomingHolidays(400);
  const hit=evs.find(e=>normHoliday(heName(e)).startsWith(want))||evs.find(e=>normHoliday(heName(e)).includes(want));
  return hit?{name:heName(hit),date:hit.getDate().greg()}:null;
}

/* ================= יאמי — הבוט ================= */
const DAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const DAYG=['יום ראשון שמח 🌟','יום שני מעולה 💪','יום שלישי פורה 🚀','יום רביעי נפלא ☀️','יום חמישי מוצלח 🎯 — זמן להתחיל לחשוב על החמין 🍲','שישי — יום של הכנות לשבת 🌸','שבת שלום ומנוחה 🕯️'];
const HELLO=['היי! 😊','שלום! 👋','אהלן! 🌿','היי, נחמד לראות אותך 😊'];
const HOWRU=['הכל טוב אצלי — הרשימות מסודרות והמקרר מחכה לשאלה 😄 ומה שלומך?','מעולה ברוך ה׳! תמיד כיף כששואלים 🙂 מה נשמע אצלך?','רגוע ונעים. בינתיים אף אחד לא שכח את החלב בסופר 😄'];
const THANKS=['בכיף! 😊','אין על מה 🙌','תמיד פה בשבילך 👍','זה בשביל זה אני כאן 💚'];
const JOKES=[
'שאלו את הבצל למה הוא בוכה. אמר: פשוט קצת קשור לי לקלף 🧅😢',
'הלחם נפל מהשולחן ואמר: "זהו, נגמרתי" 🍞😄',
'מה אומר הקפה לחלב? — בלעדייך אני מריר מדי ☕',
'הביצה שאלה את המחבת: "חם לך?" היא ענתה: "תמיד" 🍳',
'איזה ירק הכי טוב במחשבים? כרוב-נטיקה 💻🥬',
'האורז תמיד בקו, הפסטה תמיד מסודרת, ואני — תמיד ברשימה 🍚',
'שאלו את הלימון למה הוא חמוץ. ענה: "תנאי חיים" 🍋',
'למה הפסטה לא מפחדת מכלום? כי היא תמיד אל דנטה 🍝😎',
'הגזר הלך לבדיקת עיניים — התברר שהוא רואה מצוין בחושך 🥕👀',
'למה המלח והפלפל הם זוג מושלם? כי הם תמיד יודעים לתבל את הרגע 🧂',
'החמין אמר לפלטה: "בלעדייך הייתי נשאר קר כל השבת" 🍲😄',
'הקוגל התלונן: "כולם מדברים רק על החמין!" 🥔'];
let globalKnowledge=[];
function botSay(t){state.bot.push({who:'bot',txt:t,ts:Date.now()});if(state.bot.length>150)state.bot=state.bot.slice(-150);save();renderBot();}
function meSay(t){state.bot.push({who:'me',txt:t,ts:Date.now()});save();}
function findDay(t){for(let i=0;i<7;i++){if(t.includes('יום '+DAYS[i]))return i;}if(/(^|\s)(ל|ב)?שבת(\s|$)/.test(t)&&!/(זמני|כניסת|יציאת|פרשת|הדלקת)/.test(t))return 6;return -1;}
function pantryAll(){return Object.keys(state.pantry);}
function levenshtein(a,b){
  const m=a.length,n=b.length;if(!m)return n;if(!n)return m;
  let prev=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){const cur=[i];for(let j=1;j<=n;j++)cur[j]=a[i-1]===b[j-1]?prev[j-1]:1+Math.min(prev[j-1],prev[j],cur[j-1]);prev=cur;}
  return prev[n];
}
function fuzzyResolve(nameRaw){
  const key=norm(nameRaw);if(!key)return null;if(NORMP[key])return NORMP[key];
  /* לא "מתקנים" מה שלא ביקשו: מילה קצרה (עד 5 אותיות) נשארת כמו שנכתבה — חומץ ≠ חומוס.
     מילה ארוכה מתוקנת רק בטעות הקלדה של אות אחת (או שתיים מ-9 אותיות), רק כשהאות הראשונה זהה,
     ורק אם התיקון יחיד וברור. מוצר שכבר הוספתם בעבר — לא נוגעים בו */
  if(key.length<=5||(state&&state.stats&&state.stats[nameRaw.trim()]))return null;
  const th=key.length>=9?2:1;let best=null,bestD=99,tie=false;
  Object.keys(NORMP).forEach(k=>{if(k[0]!==key[0]||Math.abs(k.length-key.length)>th)return;const d=levenshtein(key,k);if(d>th)return;
    if(d<bestD){bestD=d;best=NORMP[k];tie=false;}else if(d===bestD&&NORMP[k]!==best)tie=true;});
  return tie?null:best;
}
/* ---- ניווט לסניפים ---- */
function wazeUrl(q){return 'https://waze.com/ul?q='+encodeURIComponent(q)+'&navigate=yes';}
function openWaze(q){const w=window.open(wazeUrl(q),'_blank','noopener');if(!w)location.href=wazeUrl(q);}
function branchLabel(b){return b.chain+' '+b.city+(b.address?' — '+b.address:'')+(b.name?' ('+b.name+')':'');}
function branchQuery(b){return b.chain+' '+(b.address?b.address+' ':'')+b.city;}
function findChainIn(t){const cs=allChainNames().slice().sort((a,b)=>b.length-a.length);return cs.find(c=>t.includes(norm(c)))||(/(ברכל|בר כל)/.test(t)?'בר כל טוב':null);}
function findCityIn(t){const cs=Array.from(new Set(Object.keys(CITIES).concat(allBranches().map(b=>b.city)))).sort((a,b)=>b.length-a.length);return cs.find(c=>t.includes(c))||null;}
/* ---- למידה ---- */
function knowledgeAnswer(t){
  const all=(state.knowledge||[]).concat(globalKnowledge);
  let best=null,bestScore=0;
  all.forEach(k=>{const q=norm(k.q||k.question||'');if(!q)return;
    let sc=0;if(q===t)sc=100;else if(q.length>=4&&t.includes(q)&&q.length*2>=t.length)sc=60+q.length;else if(t.length>=4&&q.includes(t)&&t.length*2>=q.length)sc=50;else if(Math.abs(q.length-t.length)<=3&&q.length>=5&&levenshtein(q,t)<=2)sc=45;
    if(sc>bestScore){bestScore=sc;best=k;}});
  return best?(best.a||best.answer):null;
}
async function submitKnowledge(q,a){
  if(!sb||!authUser)return false;
  try{const {error}=await sb.from('bot_knowledge').insert({question:q.slice(0,300),answer:a.slice(0,2000),author_id:authUser.id});return !error;}catch(e){return false;}
}


/* דברי תורה הוסרו מהאתר ומהאפליקציה (נובמבר 2026): יאמי עונה על בקשה כזו שהאפשרות לא זמינה */
/* אין באתר מתכונים (הוסרו בנובמבר 2026): יאמי לא נותנת ולא מציעה מתכונים, ועונה על שאלת מתכון בהפניה לרשימה */
const RECIPE_ASK_RX=/(מתכון|מתכונים|איך (מכינים|מבשלים|אופים)(\s|$)|מה (אפשר|אני יכול|אני יכולה|אפשר ל?)\s*(להכין|לבשל)|מה (לבשל|מבשלים|נבשל|להכין)(\s|$|[?？!.])|רעיונות לארוחה|תפריט לשבת|אוכל לשבת)/;

/* ---- ביצוע פעולות (גם מהבוט המקומי וגם מה-AI) ---- */
function doAction(a){
  try{
    const items=(a.items||[]).map(i=>({name:NORMP[norm(i.name)]||fuzzyResolve(i.name)||String(i.name||'').trim(),qty:String(i.qty||'')})).filter(i=>i.name&&!hasProfanity(i.name));
    switch(a.type){
      case 'add_items':items.forEach(i=>addItem(i.name,i.qty));break;
      case 'remove_items':{const l=curList();items.forEach(i=>{const idx=l.items.findIndex(x=>x.n===i.name&&!x.done);if(idx>=0)tombAdd('items',l.items.splice(idx,1));});save();render();break;}
      case 'check_items':{const l=curList();items.forEach(i=>{const it=l.items.find(x=>x.n===i.name&&!x.done);if(it){it.done=true;it.ts=Date.now();}});save();render();break;}
      case 'finish_shopping':finishList(true);break;
      case 'set_tab':if(['list','hist','home','prices'].includes(a.tab)){setTab(a.tab);document.querySelector('#botSheet').classList.remove('open');}break;
      case 'set_dark':state.dark=!!a.value;document.body.classList.toggle('dark',state.dark);save();break;
      case 'navigate_waze':if(a.query)openWaze(String(a.query));break;
      case 'pantry_set':items.forEach(i=>pantrySet(i.name,a.value!==false));save();renderHome();break;
      case 'new_list':if(a.name&&!hasProfanity(a.name)){const l={id:uid(),name:String(a.name).slice(0,40),items:[],created:Date.now()};state.lists.push(l);state.active=l.id;save();render();}break;
      case 'switch_list':{const l=state.lists.find(x=>norm(x.name)===norm(a.name||''));if(l){state.active=l.id;save();render();}break;}
      case 'print':printList();break;
      case 'share_whatsapp':window.open('https://wa.me/?text='+encodeURIComponent(shareText(true)),'_blank','noopener');break;
      case 'open_about':openAbout();break;
      case 'logout':setTimeout(doLogout,600);break;
    }
  }catch(e){console.error('action failed',a,e);}
}

/* פעולות שהבינה המלאכותית ביקשה: מה שמוחק/מסיים/מנתק — רק אחרי אישור של המשתמש; הוספה וניווט — אוטומטי */
const AI_DESTRUCTIVE=/^(remove_items|finish_shopping|logout|done_errands|clear\w*|delete\w*|\w*_delete|remove\w*|reset\w*)$/;
async function aiAction(a){if(!a||typeof a!=='object'||typeof a.type!=='string')return;
  if(AI_DESTRUCTIVE.test(a.type)){const its=(Array.isArray(a.items)?a.items:[]).map(i=>String(i&&i.name||'').trim()).filter(Boolean).slice(0,8).join(', ');
    const what={remove_items:T('למחוק מהרשימה: ','Remove from the list: ')+its,finish_shopping:T('לסיים את הקנייה ולהעביר להיסטוריה','Finish shopping and move to history'),logout:T('לצאת מהחשבון','Log out'),done_errands:T('לסמן סידורים כבוצעו: ','Mark errands done: ')+its}[a.type]||a.type;
    if(!(await uiConfirm('🤖 '+T('יאמי מבקשת ','Yami wants to ')+what+'\n'+T('לאשר?','Confirm?'))))return;}
  doAction(a);}

/* ---- בינה מלאכותית (Claude דרך פונקציית שרת מאובטחת) ---- */
let aiOff=false;
function aiContext(){
  const now=new Date();const l=curList();
  const open=l.items.filter(i=>!i.done).map(i=>i.n+(i.q?' ×'+i.q:''));
  const sh=shabbatTimes(userCity());
  return ['שם המשתמש: '+((state.user&&state.user.name)||'לא ידוע'),
    'פנייה למשתמש בלשון '+(state.gender==='m'?'זכר':'נקבה'),
    'שפת הממשק: '+(prefs.lang==='en'?'אנגלית':'עברית')+' · מטבע: '+myCurrency()+' · '+(prefs.diaspora?'חוץ לארץ':'ארץ ישראל')+' · עיר: '+userCity(),
    'היום: '+fmtDate(now)+' · '+hebDate(now)+' · '+fmtTime(now),
    'חג היום: '+(holidaysOn(now).map(heName).join(', ')||'אין'),
    'פרשת השבוע: '+(nextParasha()||'לא ידוע'),
    sh?('זמני שבת ב'+sh.city+': '+sh.candles+' · '+sh.havdalah):'',
    'הרשימה הפעילה "'+l.name+'": '+(open.join(', ')||'ריקה'),
    'רשימות קיימות: '+state.lists.map(x=>x.name).join(', '),
    'מה יש בבית: '+(pantryAll().join(', ')||'לא עודכן'),
    'אין באתר מתכונים: לא לתת מתכונים או הוראות בישול. לעזור ברשימה, בבית ובמחירים.',
    'רשתות: '+allChainNames().join(', ')].filter(Boolean).join('\n');
}
/* תקלה בחיבור לבינה המלאכותית (רשת / שרת) — אומרים את האמת, ולא עונים תשובה מוכנה שלא קשורה לשאלה */
const AI_NET_ERR=()=>'⚠️ '+T('יש תקלה בחיבור לבינה המלאכותית — נסו שוב עוד רגע 🙏','There is a connection problem with the AI — please try again in a moment 🙏');
async function askAI(){
  if(aiOff||!sb||!authUser)return false;
  /* בלי אינטרנט — לא מחכים לשרת: אומרים מיד מה כן אפשר */
  if(typeof isOffline==='function'&&isOffline()){botSay('📴 '+T('אין אינטרנט כרגע — אני עונה רק על דברים שבמכשיר (הרשימה, הבית שלי ותזכורות). לשאלה הזו נחזור כשיחזור החיבור 🙏','You are offline — I can only help with what is on this device (list, my home, reminders, saved recipes). Ask again when you are back online 🙏'));return true;}
  const hist=[];state.bot.slice(-14).forEach(m=>{const role=m.who==='me'?'user':'assistant';const last=hist[hist.length-1];if(last&&last.role===role)last.content+='\n'+m.txt;else hist.push({role,content:m.txt});});
  while(hist.length&&hist[0].role!=='user')hist.shift();
  if(!hist.length)return false;
  window.botTyping=true;renderBot();
  try{
    let {data,error}=await sb.functions.invoke('ai-chat',{body:{messages:hist,context:aiContext()}});
    window.botTyping=false;
    /* תקלה בשרת — למנהל מראים בדיוק מה הבעיה */
    if(error&&error.context&&typeof error.context.json==='function'){try{data=await error.context.json();}catch(e){}}
    if(error||!data){renderBot();if(isAdmin()){const st=error&&error.context&&error.context.status,em=String((data&&(data.detail||data.message||data.msg||data.error))||'');botSay('🛠️ (רק למנהל) הבינה המלאכותית לא ענתה'+(st?' ('+st+')':'')+(em?': '+em:(error&&error.message?': '+error.message:''))+((st===401||/jwt/i.test(em))?'\n👉 כנראה ההגדרה Verify JWT: ב-Supabase ← Edge Functions ← ai-chat ← Details ← לכבות "Verify JWT" ← Save.':st===404?'\n👉 הפונקציה ai-chat לא קיימת בשרת — צריך ליצור אותה (Deploy).':'')+'\nבדיקה מלאה: בק אופיס ← 🤖 הבוט וה-AI ← "🔍 בדיקת חיבור".');return true;}botSay(data&&typeof data.text==='string'&&data.text.trim()&&!hasProfanity(data.text)?data.text:AI_NET_ERR());return true;}
    if(data.disabled){aiOff=true;renderBot();if(isAdmin()&&!window._aiHint){window._aiHint=1;botSay('🛠️ (רק למנהל) הבינה המלאכותית כבויה: '+({off:'לא סומן "פעילה" בבק אופיס',no_key:'חסר מפתח בשרת (GEMINI_API_KEY ב-Supabase ← Secrets)',admin_only:'פתוחה רק למנהל'}[data.reason]||(data.reason||'בשרת רצה גרסה ישנה של הפונקציה — צריך להעלות את הקוד החדש'))+'.\nבדיקה מלאה: בק אופיס ← 🤖 ← "🔍 בדיקת חיבור".');return true;}return false;}
    (Array.isArray(data.actions)?data.actions:[]).slice(0,20).forEach(aiAction);
    const txt=String(data.text||'');
    botSay(hasProfanity(txt)?'🙏 בואו נדבר יפה — אפשר לשאול משהו אחר?':txt);
    return true;
  }catch(e){window.botTyping=false;renderBot();botSay(AI_NET_ERR());return true;}
}

/* ================= יאמי: איך מגיעה תשובה =================
   1. קללות וגסויות — עונים שאסור, ומדווחים לצוות.
   2. YAMI_STEPS — "מטפלים" לפי הסדר (החדש ביותר ראשון). הראשון שמחזיר true — הוא שענה.
      כל גרסה מוסיפה מטפל עם yamiStep(...) במקום לעטוף את botReply שוב ושוב.
   3. yamiCore — הבוט הבסיסי (רשימה, מתכונים, שבת, מה יש בבית), ובסוף הבינה המלאכותית. */
const YAMI_STEPS=[];
function yamiStep(fn){if(typeof fn==='function'&&!YAMI_STEPS.includes(fn))YAMI_STEPS.unshift(fn);}
async function botReply(raw){
  if(hasProfanity(raw)){if(typeof reportAbuse==='function')reportAbuse(raw,'bot');
    botSay('🙏 '+T('בואו נשמור על לשון נקייה — אני לא עונה על קללות וגסויות.\n⚠️ לתשומת לבך: שפה כזו מדווחת לצוות האתר, ושימוש חוזר עלול להוביל להשעיה מהאתר.','Please keep it clean. Repeated abuse is reported and may lead to suspension.'));return;}
  if(RECIPE_ASK_RX.test(norm(raw)))return botSay('🙂 '+T('אני עוזרת ברשימת הקניות, בבית ובמחירים. אפשר לכתוב לי למשל "מה חסר לי בבית?" או "איפה הכי זול?"','I help with your shopping list, your home and prices. Try "What am I missing at home?" or "Where is it cheapest?"'));
  raw=yamiDtCanon(yamiCanon(raw));
  for(const step of YAMI_STEPS){if(await step(raw))return;}
  return yamiCore(raw);
}
/* בקשת הוספה בכל ניסוח ("יאמי תוסיפי לי...", "תכניסי לי לרשימה...", "את יכולה להוסיף לי...", "שימי לי ברשימה...")
   הופכת ל"תוסיפי X" — כדי שהמילים של הבקשה לא ייכנסו לרשימה בתור מוצר */
/* ---- "רק ברכה / רק תודה": תשובה מוכנה רק כשזו כל ההודעה ----
   באג אמיתי: "מה קורה יש מצב שאת בודקת לי על פיצה טובה בבני ברק..." קיבל "רגוע ונעים..." כי "מה קורה" נמצא בתוך ההודעה.
   yamiOnly: מורידים את מילות הכוונה, מילות נימוס/פנייה, פיסוק ואימוג'י — ורק אם לא נשאר כלום, זו באמת רק ברכה. */
const YAMI_EMOJI=/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍⃣]/gu;
const YAMI_GREET='שלום|היי|הי|הלו|אהלן|הללו|בוקר טוב|בוקר אור|ערב טוב|לילה טוב|צהריים טובים|צהרים טובים|שבוע טוב|שבת שלום|חג שמח|מועדים לשמחה';
const YAMI_HOWRU='מה נשמע|מה קורה|מה שלומך|מה שלומכם|מה המצב|מה העניינים|מה איתך|מה הולך|איך הולך|איך את מרגישה|איך אתה מרגיש|איך את|איך אתה|מה חדש';
const YAMI_THANKS='תודה רבה|תודה|תודות|אלופה|אלוף|תותחית|תותח|כל הכבוד|יישר כח|יישר כוח';
const YAMI_FILL='יאמי|ימי|שלי|לך|לכם|רבה|מאוד|ממש|ענקית|ענק|גדולה|יקרה|יקר|נשמה|חמודה|את|אתה|באמת|היום|הבוקר|הערב|לכולם|וואו|אחי|גם|כן|אז|נו|יופי|מעולה|מצוין|אחלה|סבבה|נהדר|מושלם|נפלא|מלכה|אצלך|איתך|אצלכם|בבית';
const YAMI_ASK=/(^|\s)(יש מצב|תמליצי|תמליץ|להמליץ|המלצה|המלצות|ממליצה|ממליץ|תבדקי|תבדוק|בודקת|לבדוק|תחפשי|תחפש|לחפש|תמצאי|תמצא|מכירה|מכיר|את יודעת|אתה יודע|תסבירי|תסביר|איפה|היכן|איך|למה|מדוע)(?=\s|$|[?？!.,])/;
/* "הכי קרוב" / "סופר קרוב אליי" — כן; "פיצריה טובה קרוב אליי" — לא (זו שאלה לבינה המלאכותית) */
function yamiShopNear(t){return /(סופר|חנות|חנויות|מכולת|מרכול|רשת|רשתות|לקנות|קניות|מבצע|מבצעים)/.test(t)||t.split(' ').length<=3;}
/* "מוצר" שהוא בעצם משפט ("זה לא צחוק", "אני צריכה רעיון לשם") — לא מכניסים לרשימה */
function yamiNotProduct(name){const n=String(name||'').trim();return /^(זה|זאת|אני|את|אתה|הוא|היא|אנחנו|לא|יש|אין|מה|איך|למה|אם|כי|אבל)(\s|$)/.test(n)||/(^|\s)(עזרה|לעזור|תעזרי|רעיון|רעיונות|שאלה)(\s|$)/.test(n);}
function yamiBare(s){return ' '+String(s||'').replace(YAMI_EMOJI,' ').replace(/[.,!?？;:\-–—…~()"'״׳]+/g,' ').replace(/\s+/g,' ').trim()+' ';}
function yamiStripWords(s,words){const rx=new RegExp('\\sו?(?:'+words+')(?=\\s)','g');let p;do{p=s;s=s.replace(rx,' ');}while(s!==p);return s;}
/* true = ההודעה היא רק אחת ממילות הכוונה (words), ואולי גם extra ומילות נימוס — בלי שום בקשה אחרת */
function yamiOnly(t,words,extra){const s=yamiBare(t);if(!new RegExp('\\sו?(?:'+words+')(?=\\s)').test(s))return false;
  return !yamiStripWords(s,words+(extra?'|'+extra:'')+'|'+YAMI_FILL).trim();}
/* "היי, תוסיפי חלב" / "מה קורה? יש פיצה טובה בבני ברק?" — מורידים את הברכה שבהתחלה, כדי שהבקשה עצמה תגיע לטיפול הנכון.
   (לבינה המלאכותית נשלחת תמיד ההודעה המקורית, מתוך היסטוריית השיחה.) */
function yamiStripLead(t){
  const LEAD=new RegExp('^(?:'+YAMI_GREET+'|מה נשמע|מה קורה|מה שלומך|מה שלומכם|מה המצב|מה העניינים|מה איתך|מה הולך|'+YAMI_THANKS+'|יאמי|ימי|ועכשיו|עכשיו|ואגב|אגב)(?=[\\s,.!?？;:\\-–—…]|$)');
  for(let i=0;i<5;i++){const m=t.match(LEAD);if(!m)break;
    const rest=t.slice(m[0].length).replace(/^[\s,.!?？;:\-–—…]+/,'').replace(/^[\p{Extended_Pictographic}️‍\s]+/u,'');
    if(!rest||!yamiStripWords(yamiBare(rest),YAMI_FILL+'|'+YAMI_GREET+'|'+YAMI_HOWRU+'|'+YAMI_THANKS).trim()||/^(עם|אצל|על|של)(\s|$)/.test(rest))break;
    t=rest;}
  return t;}
function yamiCanon(raw){
  let t=String(raw||'').trim().replace(/^[\p{Extended_Pictographic}️‍\s]+/u,'');
  t=yamiStripLead(t);
  const call=t.match(/^(?:היי\s+|הי\s+|שלום\s+)?(?:יאמי|ימי)\s*[,!:.\-]*\s+(.+)$/);if(call)t=yamiStripLead(call[1].trim());
  const FILL='(?:לי|לנו|גם|בבקשה|את|עוד|לרשימה|ברשימה|לרשימת\\s+הקניות|ברשימת\\s+הקניות|לרשימת\\s+קניות|לקניות|לסל)';
  const re=new RegExp('^(?:בבקשה\\s+|אפשר\\s+|תוכלי\\s+|תוכל\\s+|את\\s+יכולה\\s+|אתה\\s+יכול\\s+|יכולה\\s+|יכול\\s+|אני\\s+רוצה\\s+|אני\\s+צריך\\s+|אני\\s+צריכה\\s+)?'+
    '(?:תוסיפי|תוסיף|הוסיפי|הוסף|תוסיפו|להוסיף|תכניסי|תכניס|הכניסי|הכנס|להכניס|תרשמי|תרשום|רשמי|רשום|לרשום|תשימי|תשים|שימי|שים|לשים)'+
    '((?:\\s+'+FILL+')*)\\s+(.+?)(?:\\s+'+FILL+')*\\s*[.!?]*$');
  const m=t.match(re);if(!m)return t===String(raw||'').trim()?raw:t;
  const rest=m[2].trim();
  /* לא נוגעים בבקשות שהן לא מוצרים לרשימת הקניות */
  if(!rest||/^(?:הכל|הכול|את הכל|אותם|אותו|אותה|את זה|זה|מוצר|מוצרים|משהו|פריט|מתכון|מתכונים|סידור|סידורים|תזכורת|תזכורות|פתק|משימה|דבר תורה|רשימה|רשימה חדשה|לב|תזכיר\S*|למזווה|לבית|לסידורים|לתזכורות)(?:\s|$)|^למה ש|^ש(?:אני|את|אתה|הוא|היא|יש|צריך)\s/.test(rest))return t===String(raw||'').trim()?raw:t;
  if(/^(ל|ב)רשימת\s+(?!הקניות|קניות)/.test((m[1]+' '+rest).trim()))return t===String(raw||'').trim()?raw:t;
  if(/(שיש לי|בבית|למלאי|למזווה)\s*$/.test(rest))return raw;
  return 'תוסיפי '+rest;
}
/* "וורט" / "חידוש" / "ד״ת" / "משהו על הפרשה" = דבר תורה. הופכים לנוסח אחד, כדי שלא יגיע לרשימת הקניות ("תביאי לי וורט") או לשאלת "כמה?" ("עוד וורט").
   "חידוש" רק כשאין בהודעה שום דבר אחר — "חידוש דרכון" הוא סידור, לא דבר תורה */
const YAMI_DT_WORD='(?:ה)?(?:דבר תורה|דברי תורה|ד״ת|דת|וורט|וורטים|ווארט|ורט|חידוש|חידושים|חידושי תורה|חידוש תורה|תורה|(?:משהו|רעיון|פנינה|הארה|מילה|פשט|דרשה|שיחה|ווארט) על (?:ה)?פרשה)';
const YAMI_DT_TAIL='(?:\\s+(?:על\\s+|ל|ב)?(?:ה)?(?:פרשה|פרשת\\s+\\S+(?:\\s+\\S+)?|שבת|תורה))*';
const YAMI_DT_ASK=new RegExp('^(?:(?:בבקשה|אפשר|יש לך|יש|תני לי|תני|תביאי לי|תביאי|תגידי לי|תגידי|תספרי לי|ספרי לי|אני רוצה|רוצה|אשמח ל|אשמח)\\s+)*(עוד\\s+|ועוד\\s+)?'+YAMI_DT_WORD+YAMI_DT_TAIL+'(?:\\s+בבקשה)?$');
const YAMI_DT_SHARE=new RegExp('^(?:אני\\s+)?(?:רוצה\\s+)?(?:(?:לשתף|אשתף|שתפי|להוסיף|אוסיף|לשלוח|אשלח|שלחי)\\s+(?:את\\s+)?'+YAMI_DT_WORD+'|יש לי\\s+'+YAMI_DT_WORD+'(?:\\s+(?:לשתף|לשלוח))?)'+YAMI_DT_TAIL+'$');
function yamiDtCanon(raw){
  const t=norm(raw).replace(/[?？!.]+$/,'').trim();
  if(YAMI_DT_SHARE.test(t))return 'לשתף דבר תורה';
  const m=t.match(YAMI_DT_ASK);if(!m)return raw;
  const par=t.match(/פרשת\s+\S+(?:\s+\S+)?/);
  return (m[1]?'עוד ':'')+'דבר תורה'+(par?' על '+par[0]:'');
}
async function yamiCore(raw){
  const t=norm(raw);const now=new Date();const dow=now.getDay();
  const YES=/^(כן|בסדר|סבבה|אישור|רוצה|בצע|טוב|מצוין|אוקיי|אוקי|יאללה|בטח|בשמחה)(\s|$)|^(תוסיף|תוסיפי|הוסיפי|הוסף|תוסיפו)(\s+(הכל|את הכל|אותם|את זה|הכול))?$/;
  /* שמירה על לשון נקייה */
  if(hasProfanity(raw))return botSay('🙏 בואו נשמור על לשון נקייה — אני לא עונה על קללות וגסויות, בשום שפה. אפשר לנסח שוב יפה? 🙂');
  /* ניווט שממתין לבחירה */
  if(state.pendingNav){
    const m=t.match(/^(\d{1,2})$/);const opts=state.pendingNav;
    if(m&&opts[+m[1]-1]){const b=opts[+m[1]-1];state.pendingNav=null;save();openWaze(branchQuery(b));return botSay('🧭 פותחת את וויז ל'+branchLabel(b)+' — נסיעה טובה!');}
    if(/^(לא|בטל|עזוב)/.test(t)){state.pendingNav=null;save();return botSay('בסדר 🙂');}
    state.pendingNav=null;
  }
  if(state.pending){
    if(YES.test(t)){
      const p=state.pending;state.pending=null;p.items.forEach(n=>addItem(n,''));
      return botSay('הוספתי הכל לרשימה ✅\n'+p.items.map(n=>'• '+n).join('\n'));}
    if(/^(לא|בטל|אין|לא עכשיו|לא צריך)/.test(t)){state.pending=null;save();return botSay('בסדר, לא נוגעים 🙂');}
  }

  /* דבר תורה הוסר: בקשה כזו מקבלת תשובה קצרה, ולא נכנסת לרשימה */
  if(/(דבר תורה|דברי תורה|וורט|ווארט|ד״ת|חידושי תורה|חידוש תורה)/.test(t)||/^(עוד\s+)?(ה)?(דת|חידוש|חידושים)(\s+(על\s+)?(ה)?פרשה|\s+לשבת|\s+בבקשה)?[?？!.]*$/.test(t))
    return botSay(T('האפשרות הזו כבר לא זמינה באתר 🙂 אפשר לשאול אותי על פרשת השבוע וזמני שבת.','This option is no longer available 🙂'));
  /* לימוד הבוט: "למד: שאלה = תשובה" / "כשאני אומר X תעני Y" */
  const teach=raw.trim().match(/^(?:תלמדי|תלמד|למדי|למד|לימוד|תזכרי|תזכור)\s*:?\s*(.+?)\s*(?:=|->|—|תעני|תענה|התשובה היא|התשובה)\s*:?\s*(.+)$/)||raw.trim().match(/^כש(?:אני )?(?:אומר|אומרת|שואל|שואלת|שואלים|כותבים)\s+(.+?)\s+(?:תעני|תענה|תגידי|תגיד)\s+(.+)$/);
  if(teach){
    const q=teach[1].replace(/^["״']|["״']$/g,'').trim(),a=teach[2].replace(/^["״']|["״']$/g,'').trim();
    if(!q||!a)return botSay('כדי ללמד אותי כותבים למשל:\nלמד: מה השעה של המנחה = מנחה בבית הכנסת ב־13:30');
    state.knowledge=(state.knowledge||[]).filter(k=>norm(k.q)!==norm(q));state.knowledge.push({q,a,ts:Date.now()});save();
    submitKnowledge(q,a);
    return botSay('למדתי! 🧠 מעכשיו כש'+GW('תשאלי','תשאל')+' "'+q+'" אענה: '+a+'\n(זה נשלח גם למנהל האתר — אם יאשר, כולם ירוויחו מזה 💚)');
  }
  const forget=t.match(/^(?:תשכחי|תשכח|שכחי|שכח)\s+(?:את\s+)?(.+)$/);
  if(forget){const before=(state.knowledge||[]).length;state.knowledge=(state.knowledge||[]).filter(k=>norm(k.q)!==norm(forget[1]));save();return botSay(state.knowledge.length<before?'שכחתי 🙂':'לא מצאתי דבר כזה שלימדו אותי 🤷');}
  if(/(מה לימדתי אותך|מה למדת ממני|מה אתה יודע ממני|מה את יודעת ממני)/.test(t)){
    const k=state.knowledge||[];return botSay(k.length?('מה שלמדתי ממך:\n'+k.map(x=>'• '+x.q+' ← '+x.a).join('\n')+'\n\nלמחיקה: "שכחי <שאלה>"'):'עוד לא לימדת אותי כלום 🙂 כותבים: למד: שאלה = תשובה');
  }
  /* עזרה */
  if(/^(עזרה|מה את יודעת|מה אפשר לעשות|איך משתמשים|הדרכה|מה את יודעת לעשות|מה אתה יודע|מה אתה יודע לעשות)(\s+(לעשות|כאן|פה|באתר|יאמי|בבקשה|בעצם))*[?？!.]*$/.test(t)){
    return botSay('הנה מה שאני יודעת 🤍\n🛒 "חלב 2 ולחם" — הוספה · "הסר חלב" — מחיקה · "סמני חלב" — נקנה\n✅ "סיימתי קנייה" — הכל עובר להיסטוריה עם ✓✓ כחולים\n🏠 "יש לי ביצים" / "אין לי חלב" / "מה חסר לי בבית?"\n📅 "איזה חג היום?" · "החג הבא" · "מתי פסח?" · "פרשת השבוע" · "זמני שבת בבני ברק"\n📍 "סניפים של נתיב החסד" · "נווט לבר כל טוב בבני ברק" · "כמה עולה חלב?"\n🧠 "למד: שאלה = תשובה" — ללמד אותי כל דבר\n⚙️ "מצב כהה" · "פתחי היסטוריה" · "רשימה חדשה לשבת" · "שתפי בוואטסאפ" · "הדפסה" · "אודות" · "התנתקות"');
  }
  /* תאריך, שעה, לוח עברי */
  if(/^(מה|כמה)\s+השעה(\s+(עכשיו|כרגע|בבקשה|יאמי))*[?？!.]*$/.test(t)||(/^שעה/.test(t)&&t.length<12))return botSay('עכשיו '+fmtTime(now)+' ⏰');
  if(/(זמני שבת|כניסת שבת|יציאת שבת|הדלקת נרות|מתי נכנסת שבת|מתי יוצאת שבת|הבדלה|מתי שבת)/.test(t)){
    const city=findCityIn(t)||userCity();/* שאלה על עיר אחרת לא משנה את העיר שבחרו */
    const sh=shabbatTimes(city);if(!sh)return botSay('לא הצלחתי לחשב זמני שבת כרגע 🙁');
    return botSay('🕯️ זמנים ב'+sh.city+(sh.candlesDate?' ('+fmtDate(sh.candlesDate)+')':'')+':\n'+sh.candles+'\n'+sh.havdalah+(nextParasha()?'\n📜 '+nextParasha():'')+'\n(אפשר לשאול על עיר אחרת, למשל "זמני שבת בבית שמש")');
  }
  if(/(פרשת השבוע|איזו פרשה|איזה פרשה|מה הפרשה|פרשה השבוע)/.test(t)&&!/(דבר תורה|וורט)/.test(t)){const p=nextParasha();return botSay(p?('📜 '+(p.startsWith('השבת')?p:'השבת: '+p)):'לא הצלחתי לחשב את הפרשה כרגע 🙁');}
  const whenM=t.match(/מתי\s+(?:יהיה\s+|יוצא\s+|חל\s+)?(?:חג\s+)?(ראש השנה|יום כיפור|יום כפור|סוכות|שמחת תורה|שמיני עצרת|חנוכה|טו בשבט|ט"ו בשבט|פורים|פסח|ל"ג בעומר|לג בעומר|שבועות|תשעה באב|ט באב|צום גדליה|עשרה בטבת|תענית אסתר|יז בתמוז|ראש חודש)/);
  if(whenM){
    let nm=whenM[1].replace('יום כיפור','יום כפור').replace('לג בעומר','ל"ג בעומר').replace('טו בשבט','ט"ו בשבט').replace('ט באב','תשעה באב').replace('יז בתמוז','יז בתמוז');
    const h=findHolidayDate(nm);
    return botSay(h?('📅 '+h.name+' — '+fmtDate(h.date)+' ('+hebDate(h.date)+')'):'לא מצאתי את החג הזה בשנה הקרובה 🤔');
  }
  if(/(החג הבא|החגים הבאים|מה החג הבא|מתי החג|חגים קרובים|לוח חגים)/.test(t)){
    const list=mainHolidays(150).slice(0,8);
    return botSay(list.length?('📅 החגים והמועדים הקרובים:\n'+list.map(e=>'• '+heName(e)+' — '+fmtDate(e.getDate().greg())+' ('+hebDate(e.getDate().greg())+')').join('\n')):'לא הצלחתי לחשב את לוח החגים כרגע 🙁');
  }
  if(/(איזה חג|מה החג|יש חג|חג היום)/.test(t)){
    const hs=holidaysOn(now).map(heName);const nx=mainHolidays(120).find(e=>e.getDate().greg()>now);
    return botSay(hs.length?('🎉 היום: '+hs.join(', ')+'\nמועדים לשמחה! 🙂'):('היום אין חג.'+(nx?' המועד הקרוב: '+heName(nx)+' — '+fmtDate(nx.getDate().greg()):'')));
  }
  if(/^(מה|איזה)?\s*(ה)?(תאריך(\s+(ה)?עברי)?|יום)(\s+היום)?[?？!.]*$/.test(t)||/^מה\s+היום[?？!.]*$/.test(t)||/^(איזה|מה)\s+(יום|תאריך)\s+(יש\s+)?היום[?？!.]*$/.test(t)){const hs=holidaysOn(now).map(heName);return botSay('היום '+fmtDate(now)+'\nבתאריך העברי: '+hebDate(now)+(hs.length?'\n🎉 '+hs.join(', '):'')+(nextParasha()?'\n📜 '+nextParasha():'')+' 📅');}
  /* בדיחה, תודה, ברכות */
  /* רק כשזו כל ההודעה (או כמעט) — "מה קורה, יש פיצה טובה בבני ברק?" ממשיך הלאה, לבינה המלאכותית */
  if(/(בדיחה|תצחיקי|תצחיק|משהו מצחיק)/.test(t)&&t.split(' ').length<=6)return botSay(pick(JOKES));
  if(yamiOnly(t,YAMI_THANKS,YAMI_GREET)||(/^(תודה רבה|תודה|תודות)\s+על\s/.test(t)&&t.split(' ').length<=8&&!/[?？]/.test(t)))return botSay(pick(THANKS));
  if(new RegExp('^(?:'+YAMI_GREET+')(?![\u0590-\u05FF])').test(t)&&yamiOnly(t,YAMI_GREET,YAMI_HOWRU+'|'+YAMI_THANKS)){
    return botSay(pick(HELLO)+' '+(state.user?state.user.name:'')+'!\n'+DAYG[dow]+'\nבמה אפשר לעזור? 😊');
  }
  if(yamiOnly(t,YAMI_HOWRU,YAMI_GREET))return botSay(pick(HOWRU));
  if(/^(מי את|מי אתה|מי את בכלל|מה שמך|אודות|אודות האתר|אודותייך)[?？!.]*$/.test(t)||/(מי בנה אותך|מי פיתח (אותך|את האתר|את יאמי)|מי יצר אותך|מי עשה את האתר)/.test(t)){openAbout();return botSay('אני יאמי 👩‍🍳 — העוזרת של "רשימת קניות". את האתר פיתח אברך, כדי לעזור לכולם — שיהיה הכי קל בבית, בקניות ובהכנות לשבת 💚 פתחתי לך את עמוד האודות.');}
  /* שליטה באתר */
  if(/(סיימתי (את )?(ה)?קני|סיימתי לקנות|גמרתי (את )?(ה)?קני|גמרתי לקנות|סגרי (את )?(ה)?קנייה|סיום קנייה|קנינו הכל|קניתי הכל)/.test(t)){
    const n=finishList(true);return botSay(n?('✅ סימנתי שסיימת את הקנייה! '+n+' פריטים עברו להיסטוריה עם ✓✓ כחולים 🕘\nקנייה מוצלחת!'):'הרשימה כבר ריקה 🙂 אין מה להעביר להיסטוריה.');
  }
  if(/(מצב כהה|מצב לילה|תחשיכי|מצב חשוך)/.test(t)){doAction({type:'set_dark',value:true});return botSay('🌙 עברתי למצב כהה');}
  if(/(מצב בהיר|מצב יום|תבהירי)/.test(t)){doAction({type:'set_dark',value:false});return botSay('☀️ עברתי למצב בהיר');}
  if(/(לשון זכר|כמו לגבר)/.test(t)||/^אני (גבר|בחור)[.!]*$/.test(t)){state.gender='m';save();updateGenderLabel();return botSay('מעכשיו אפנה אליך בלשון זכר 🙂');}
  if(/(לשון נקבה|כמו לאישה)/.test(t)||/^אני (אישה|בחורה)[.!]*$/.test(t)){state.gender='f';save();updateGenderLabel();return botSay('מעכשיו אפנה אלייך בלשון נקבה 🙂');}
  if(/^(אני\s+)?(רוצה\s+|רוצים\s+)?(התנתקות|התנתק|התנתקי|תתנתקי|להתנתק|תנתקי|נתקי|תנתקי אותי|נתקי אותי|צא מהאתר|צאי מהאתר|לצאת מהאתר|יציאה מהאתר|לצאת מהחשבון|יציאה מהחשבון|logout|log out)(\s+(אותי|מהאתר|מהחשבון|בבקשה))*[.!]*$/i.test(t)){botSay('להתראות '+((state.user&&state.user.name)||'')+'! 👋');setTimeout(doLogout,900);return;}
  const tabM=t.match(/^(?:תפתחי|פתחי|פתח|עברי|עבור|תעבירי|תעביר|תראי|תראה|לך|לכי)\s+(?:לי\s+)?(?:ל|את\s+ה|את\s+|ל?ה)?(היסטוריה|הסטוריה|מחירים|הבית שלי|בית|רשימה|מקרר)(?:\s+(?:שלי|בבקשה))?[.!]*$/);
  if(tabM){const map={'היסטוריה':'hist','הסטוריה':'hist','מחירים':'prices','הבית שלי':'home','בית':'home','מקרר':'home','רשימה':'list'};doAction({type:'set_tab',tab:map[tabM[1]]});return botSay('✔️ פתחתי את '+tabM[1]);}
  if(/^(אני\s+רוצה\s+)?(תדפיסי|הדפיסי|תדפיס|הדפס|הדפסה|הדפסת|להדפיס|pdf)(\s+(לי|את|בבקשה|ה?רשימה|הרשימה|רשימת הקניות|את הרשימה|pdf))*[.!]*$/i.test(t)){printList();return botSay('🖨️ פתחתי את חלון ההדפסה');}
  const SHARE_PRE='^(?:אני\\s+רוצה\\s+)?(?:תשתפי|שתפי|שתף|לשתף|שיתוף|תשלחי|שלחי|שלח|לשלוח)(?:\\s+(?:לי|את|ה?רשימה|הרשימה|רשימת הקניות|את הרשימה|בבקשה|לאשתי|לבעלי|למשפחה|לאמא|לאבא))*\\s+(?:ב|ל|דרך\\s+|ב-)?';
  if(new RegExp(SHARE_PRE+'(?:וואטסאפ|ווטסאפ|whatsapp)(?:\\s+(?:לי|בבקשה|את הרשימה))*[.!]*$','i').test(t)){doAction({type:'share_whatsapp'});return botSay('💬 פתחתי שיתוף בוואטסאפ');}
  if(new RegExp(SHARE_PRE+'(?:מייל|אימייל|ג׳ימייל|גימייל|gmail)(?:\\s+(?:לי|בבקשה|את הרשימה))*[.!]*$','i').test(t)){openGmail('רשימת קניות — '+curList().name,shareText());return botSay('📧 פותחת את ג׳ימייל');}
  const newListM=t.match(/^(?:רשימה חדשה|צרי רשימה|תפתחי רשימה)\s+(?:בשם\s+|ל)?(.+)$/);
  if(newListM){doAction({type:'new_list',name:newListM[1]});return botSay('📝 פתחתי רשימה חדשה: '+newListM[1]);}
  const swM=t.match(/^(?:עברי|עבור|תעבירי)\s+לרשימה\s+(?:של\s+)?(.+)$/);
  if(swM){const l=state.lists.find(x=>norm(x.name)===norm(swM[1])||norm(x.name).includes(norm(swM[1])));if(l){state.active=l.id;save();render();return botSay('✔️ עברתי לרשימה "'+l.name+'"');}return botSay('לא מצאתי רשימה כזאת. יש: '+state.lists.map(x=>x.name).join(', '));}
  if(/^(תנקי|נקי|נקה|מחקי|מחק|תמחקי|תמחק)\s+(את\s+)?(ה)?היסטוריה(\s+(של\s+)?(ה)?קניות)?[.!]*$/.test(t)){state.history=[];save();renderHist();return botSay('🗑️ ניקיתי את ההיסטוריה');}
  const markM=t.match(/^(?:סמני|סמן|תסמני|תסמן)\s+(?:את\s+)?(.+?)(?:\s+(?:כנקנה|שנקנה|כקנוי))?$/);
  if(markM){const its=parseItems(markM[1]);const l=curList();let n=0;its.forEach(i=>{const it=l.items.find(x=>x.n===i.name&&!x.done);if(it){it.done=true;it.ts=Date.now();n++;}});save();render();return botSay(n?('סימנתי כנקנה ✓✓ ('+n+')'):'לא מצאתי את זה ברשימה 🤷');}
  /* סניפים וניווט */
  if(/(נווט|נווטי|ניווט|וויז|ווייז|waze|קחי אותי|תיקחי אותי|איך מגיעים|איך להגיע)/.test(t)){
    const chain=findChainIn(t),city=findCityIn(t);
    if(!chain&&!city)return botSay('לאן לנווט? למשל: "נווטי לנתיב החסד בבני ברק" 🧭');
    /* "איך מגיעים למכון מור בבני ברק" — ניווט ליעד שכתבו, ולא רק לעיר */
    if(!chain){const dm=t.match(/(?:נווטי|נווט|תנווטי|ניווט|קחי אותי|תיקחי אותי|איך מגיעים|איך להגיע|איך אני מגיע|איך אני מגיעה)\s+(?:לי\s+)?(?:עד\s+|אל\s+)?(.+?)[?？!.]*$/);
      let dest=dm?dm[1].trim():'';if(/^ל\S/.test(dest)&&!(city&&dest.startsWith(city)))dest=dest.slice(1);
      if(dest&&dest.split(' ').length>=2&&dest!==city){openWaze(dest);return botSay('🧭 פותחת וויז: '+dest);}}
    const opts=allBranches().filter(b=>(!chain||b.chain===chain)&&(!city||b.city===city));
    const addr=opts.find(b=>b.address&&t.includes(norm(b.address)));
    if(addr){openWaze(branchQuery(addr));return botSay('🧭 פותחת וויז ל'+branchLabel(addr));}
    if(opts.length===1){openWaze(branchQuery(opts[0]));return botSay('🧭 פותחת וויז ל'+branchLabel(opts[0])+' — נסיעה טובה!');}
    if(opts.length>1){state.pendingNav=opts.slice(0,12);save();return botSay('לאיזה סניף? '+GW('כתבי','כתוב')+' את המספר:\n'+state.pendingNav.map((b,i)=>(i+1)+'. '+branchLabel(b)).join('\n'));}
    const q=(chain||'')+' '+(city||'');openWaze(q.trim());return botSay('🧭 פותחת וויז: '+q.trim());
  }
  if(/(סניפים|סניף|איפה יש|איפה נמצא|כתובת של)/.test(t)){
    const chain=findChainIn(t),city=findCityIn(t);
    /* "איפה יש פיצה טובה בבני ברק" — זו לא שאלה על סניפי הרשתות; רק "סניף/סניפים" או שם רשת */
    if(chain||(city&&/(סניפים|סניף)/.test(t))){
      const opts=allBranches().filter(b=>(!chain||b.chain===chain)&&(!city||b.city===city));
      if(!opts.length)return botSay('לא מצאתי סניפים כאלה ברשימה שלי 🤷 אפשר להוסיף סניף בלשונית 💰 מחירים.');
      state.pendingNav=opts.slice(0,15);save();
      return botSay('📍 '+(chain||'סניפים')+(city?' ב'+city:'')+':\n'+state.pendingNav.map((b,i)=>(i+1)+'. '+branchLabel(b)).join('\n')+(opts.length>15?'\n...ועוד '+(opts.length-15):'')+'\n\nלניווט בוויז — '+GW('כתבי','כתוב')+' את מספר הסניף 🧭');
    }
  }
  const priceM=t.match(/(?:כמה עולה|מה המחיר של|מחיר של|איפה הכי זול)\s+(?:ה)?(.+?)\??$/);
  if(priceM){
    const rows=await fetchPrices(priceM[1]);
    if(!rows.length&&priceM[1].split(' ').length>2&&await askAI())return;
    if(!rows.length)return botSay('עוד אין דיווחי מחיר על "'+priceM[1]+'" 🤷 אפשר לדווח בלשונית 💰 מחירים — וכולם ירוויחו!');
    rows.sort((a,b)=>a.price-b.price);
    return botSay('💰 '+priceM[1]+' — הכי זול:\n'+rows.slice(0,4).map(r=>'• ₪'+Number(r.price).toFixed(2)+' ב'+r.chain+(r.branch?' ('+r.branch+')':'')).join('\n'));
  }
  /* מה יש בבית */
  if(/(מה יש לי בבית|מה יש במקרר|מה יש לי$)/.test(t)){
    const have=pantryAll();
    return botSay(have.length?('בבית יש ('+have.length+'): '+have.map(n=>emojiOf(n)+' '+n).join(', ')):'עוד לא עדכנו אותי מה יש בבית 🙂 למשל: "יש לי חלב, ביצים ואורז"');
  }
  const haveQuery=raw.trim().match(/^(?:האם\s+)?(?:יש לי|יש בבית)\s+(.+?)\s*\?\s*$/);
  if(haveQuery){
    const guess=NORMP[norm(haveQuery[1])]||fuzzyResolve(haveQuery[1])||haveQuery[1].trim();
    return botSay(pantryHas(guess)?('כן, יש '+emojiOf(guess)+' '+guess+' בבית ✅'):('לא, אין '+guess+' בבית כרגע ❌ להוסיף לרשימה? '+GW('כתבי','כתוב')+' "תוסיפי '+guess+'"'));
  }
  if(/^(יש לי|יש בבית|קניתי)/.test(t)&&!YAMI_ASK.test(t)){
    const its=parseItems(t.replace(/^(יש לי|יש בבית|קניתי)/,''));
    /* "יש לי עסק קטן ואני צריכה רעיון לשם" — זו לא רשימת מוצרים */
    if(its.length&&its.every(i=>i.name.split(' ').length<=3&&!yamiNotProduct(i.name))){its.forEach(i=>pantrySet(i.name,true));
      if(/^קניתי/.test(t)){const l=curList();its.forEach(i=>{const it=l.items.find(x=>x.n===i.name&&!x.done);if(it){it.done=true;it.ts=Date.now();}});}
      save();render();
      return botSay('רשמתי: יש '+its.map(i=>emojiOf(i.name)+' '+i.name).join(', ')+' 🏠');}
  }
  if(/^(אין לי|נגמר|אזל)/.test(t)){
    const its=parseItems(t.replace(/^(אין לי|נגמר לי|נגמר|אזל לי|אזל)/,''));
    if(its.length){its.forEach(i=>pantrySet(i.name,false));state.pending={type:'missing',items:its.map(i=>i.name)};save();
      return botSay('עדכנתי שאין: '+its.map(i=>i.name).join(', ')+' 📝\nלהוסיף לרשימת הקניות? (כן/לא)');}
  }
  if(/^מה\s+(חסר|צריך לקנות|לקנות|נגמר)(\s+(לי|לנו))?(\s+(בבית|בסופר|היום|השבוע|במקרר|במטבח|בבקשה))?[?？!.]*$/.test(t)){
    const missing=BASE.filter(n=>!pantryHas(n));
    if(!missing.length)return botSay('וואו, הבית מלא! יש את כל מצרכי הבסיס 🎉');
    state.pending={type:'missing',items:missing};save();
    return botSay('לפי מה שעדכנו אותי, חסר בבית:\n'+missing.map(n=>emojiOf(n)+' '+n).join(', ')+'\n\nלהוסיף הכל לרשימה? (כן/לא)');
  }
  if(/(מה יש ברשימה|כמה פריטים|סיכום הרשימה|מה ברשימה)/.test(t)){
    const l=curList();const open=l.items.filter(i=>!i.done);
    if(!open.length)return botSay('הרשימה "'+l.name+'" ריקה 🎉');
    const byC={};open.forEach(i=>{(byC[i.c]=byC[i.c]||[]).push(i.n+(i.q?' ×'+i.q:''));});
    return botSay('ברשימה "'+l.name+'" יש '+open.length+' פריטים:\n\n'+Object.entries(byC).map(([c,ns])=>CATE[c]+' '+c+': '+ns.join(', ')).join('\n'));
  }
  /* מחיקה */
  if(/^(הסר|הסירי|תסירי|מחק|מחקי|תמחק|תמחקי|בטל|בטלי|תורידי|תוריד|להוריד|אין צורך)/.test(t)){
    const l=curList();const m2=t.match(/^(?:הסר|הסירי|תסירי|מחק|מחקי|תמחק|תמחקי|בטל|בטלי|אין צורך ב|תורידי|תוריד|להוריד)\s+(?:את\s+)?(.+)/);
    const its=parseItems(m2?m2[1]:t);let removed=0;
    its.forEach(i=>{const idx=l.items.findIndex(x=>x.n===i.name&&!x.done);if(idx>=0){tombAdd('items',l.items.splice(idx,1));removed++;}});
    save();render();
    return botSay(removed?('מחקתי ('+removed+') ✔️'):'לא מצאתי את זה ברשימה 🤷');
  }
  /* תוכניות לפי יום */
  const d=findDay(t);
  if(d>=0&&/(תוכנית|צריך|רק|תוסיף|הוסף|תרשום|תזכיר|רשום|מה יש)/.test(t)&&!YAMI_ASK.test(t)&&t.length<=80){
    const plan=state.plans[d]||[];
    if(/(מחק|הסר|בטל).*(תוכנית|יום)/.test(t)){delete state.plans[d];save();return botSay('מחקתי את התוכנית של יום '+DAYS[d]+' 🗑️');}
    if(/מה (יש|צריך)/.test(t))return botSay(plan.length?('התוכנית של יום '+DAYS[d]+':\n• '+plan.join('\n• ')):('אין עדיין תוכנית ליום '+DAYS[d]));
    if(/(הוסף|העבר|קנה).*(תוכנית)/.test(t)){if(!plan.length)return botSay('אין תוכנית ליום '+DAYS[d]+' 🤷');plan.forEach(n=>addItem(n,''));return botSay('העברתי את התוכנית של יום '+DAYS[d]+' לרשימה ✅');}
    const m2=t.match(/(?:רק|צריכה|צריך|תוסיף|הוסף|תרשום|רשום|תזכיר)\s+(.+)/);const its=parseItems(m2?m2[1]:t);
    if(its.length){state.plans[d]=its.map(i=>i.name);save();return botSay('שמרתי תוכנית ליום '+DAYS[d]+' 📅\n• '+its.map(i=>i.name).join('\n• '));}
  }
  /* מה שלימדו אותי */
  const known=knowledgeAnswer(t);
  if(known)return botSay(known);
  /* הוספה — רק כשיש כוונה ברורה */
  const hasIntent=ADDVERBS.test(t);const its=parseItems(t);
  const knownWords=its.filter(i=>NORMP[norm(i.name)]);
  const looksQuestion=/[?？]$/.test(raw.trim())||/^(מה|איך|למה|מי|מתי|איפה|כמה|האם|היכן|תסבירי|תסביר|ספרי|ספר|תני|תן|אפשר|מהו|מהי|מדוע|יש מצב)(\s|$)/.test(t)||YAMI_ASK.test(t);
  if(!looksQuestion&&its.length&&(hasIntent||knownWords.length===its.length)&&t.length<120&&!its.some(i=>!NORMP[norm(i.name)]&&yamiNotProduct(i.name))){
    its.forEach(i=>addItem(i.name,i.qty));
    return botSay(pick(['רשמתי לרשימה ✅','נוסף 🛒','בוצע 💪','יש! ✔️'])+'\n'+its.map(i=>'• '+i.name+(i.qty?' ×'+i.qty:'')).join('\n'));
  }
  /* כל השאר — הבינה המלאכותית (אם המנהל הפעיל אותה) */
  if(await askAI())return;
  /* בלי בינה מלאכותית: שאלה ארוכה / בקשה להמלצה / "תסתכלי על מה ששלחתי קודם" — לא מציעים "למד: <כל ההודעה>" */
  if(t.split(' ').length>5||/(קודם|ששלחתי|ששאלתי|שכתבתי|תסתכל|תסתכלי|שוב על|למעלה)/.test(t)||/(המלצ|תמליצ|ממליצ|להמליץ)/.test(t))
    return botSay('🙏 על זה אני צריכה את הבינה המלאכותית, והיא לא זמינה לי כרגע — אז אין לי תשובה טובה לתת.\nבינתיים אני כן יכולה לעזור עם הרשימה, מה יש בבית, מחירים וזמני שבת ("עזרה" — כל היכולות). אפשר לנסות לשאול שוב מאוחר יותר.');
  if(looksQuestion)return botSay('על זה אני עוד לא יודעת לענות 🤔\nאפשר ללמד אותי! למשל:\nלמד: '+raw.trim().replace(/[?？]+$/,'')+' = התשובה');
  botSay('לא בטוחה שהבנתי 🤔\nאפשר לנסות:\n• "תוסיפי חלב 2 ולחם"\n• "מה חסר לי בבית?"\n• "פרשת השבוע" / "זמני שבת"\n• "למד: שאלה = תשובה" — ללמד אותי\n• "עזרה" — כל היכולות שלי');
}

/* ================= חיבור ממשק יאמי ================= */
function botChips(){
  return ['מה חסר לי בבית?','סיימתי קנייה ✅','פרשת השבוע','זמני שבת','החג הבא','עזרה'];}
function renderBotChips(){document.querySelector('#botChips').innerHTML=botChips().map(c=>'<button data-chip="'+esc(c)+'">'+esc(c)+'</button>').join('');}
function openBot(){document.querySelector('#botSheet').classList.add('open');
  if(!state.bot.length)botSay((botCfg.welcome||('שלום '+(state.user?state.user.name:'')+'! 👩‍🍳 אני יאמי.\nאני עוזרת עם הקניות, הבית וההכנות לשבת — אפשר לכתוב לי הכל, או ללחוץ "עזרה".')));
  renderBotChips();renderBot();setTimeout(()=>document.querySelector('#botText').focus(),150);}
document.querySelector('#botFab').onclick=openBot;
document.querySelector('#botClose').onclick=()=>document.querySelector('#botSheet').classList.remove('open');
document.querySelector('#botSheet').addEventListener('click',e=>{if(e.target.id==='botSheet')e.target.classList.remove('open');});
function sendToBot(v){meSay(v);renderBot();setTimeout(()=>botReply(v),250);}
function botSendCurrent(){const v=document.querySelector('#botText').value.trim();if(!v)return;document.querySelector('#botText').value='';sendToBot(v.slice(0,1500));}
document.querySelector('#botSend').onclick=botSendCurrent;
/* Enter שולח; Shift+Enter (ובטלפון — Enter) יורד שורה. שולחים בטלפון עם כפתור החץ */
const TOUCH_KB=matchMedia('(pointer:coarse)').matches;
document.querySelector('#botText').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!TOUCH_KB&&!e.isComposing){e.preventDefault();botSendCurrent();}});
document.querySelector('#botText').addEventListener('input',e=>{const t=e.target;t.style.height='auto';t.style.height=Math.min(t.scrollHeight,120)+'px';});
document.querySelector('#botChips').addEventListener('click',e=>{const c=e.target.dataset.chip;if(!c)return;sendToBot(c.replace(/^🍲 /,'').replace(/ ✅$/,''));});

/* ================= התחברות מאובטחת (Supabase Auth) ================= */
let loginMode='login',failCount=0,lockUntil=0;
function setLoginMode(m){loginMode=m;
  document.querySelector('#ltLogin').classList.toggle('on',m==='login');document.querySelector('#ltSignup').classList.toggle('on',m==='signup');
  document.querySelector('#lfSignup').style.display=m==='signup'?'block':'none';document.querySelector('#lfSignup2').style.display=m==='signup'?'block':'none';
  document.querySelector('#inCode').setAttribute('autocomplete',m==='signup'?'new-password':'current-password');
  document.querySelector('#btnLogin').textContent=m==='signup'?T('הרשמה','Sign up'):T('כניסה','Sign in');document.querySelector('#loginErr').textContent='';}
document.querySelector('#ltLogin').onclick=()=>setLoginMode('login');
document.querySelector('#ltSignup').onclick=()=>setLoginMode('signup');
function loginErr(m){document.querySelector('#loginErr').textContent=m||'';}
function showLogin(){document.querySelector('#login').classList.add('open');document.querySelector('#btnOffline').style.display=sb?'none':'block';
  if(!sb)loginErr('⚠️ אין חיבור לשרת (אולי סינון רשת). אפשר להמשיך בלי חשבון.');}
function hideLogin(){document.querySelector('#login').classList.remove('open');}
function authErrorHe(e){const m=((e&&e.message)||'').toLowerCase();
  if(m.includes('invalid login'))return 'אימייל או קוד לא נכונים';
  if(m.includes('email not confirmed'))return 'צריך לאשר את המייל — בדקו את תיבת הדואר (גם בקידומי מכירות/ספאם)';
  if(m.includes('already registered')||m.includes('already been registered'))return 'המייל הזה כבר רשום — עברו ל"כניסה"';
  if(m.includes('rate limit')||m.includes('too many'))return 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות';
  if(m.includes('password'))return 'הקוד חלש מדי — לפחות 8 תווים, רצוי אותיות ומספרים';
  if(m.includes('network')||m.includes('fetch'))return 'אין חיבור לשרת — בדקו אינטרנט/סינון';
  return 'משהו השתבש: '+((e&&e.message)||'');}
document.querySelector('#btnLogin').onclick=async()=>{
  if(!sb){loginErr('אין חיבור לשרת');return;}
  if(Date.now()<lockUntil){loginErr('יותר מדי ניסיונות — נסו שוב בעוד '+Math.ceil((lockUntil-Date.now())/1000)+' שניות');return;}
  const email=document.querySelector('#inMail').value.trim().toLowerCase();const code=document.querySelector('#inCode').value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){loginErr('נא להזין אימייל תקין');return;}
  if(code.length<8){loginErr('הקוד חייב להיות לפחות 8 תווים');return;}
  const btn=document.querySelector('#btnLogin');btn.disabled=true;loginErr('');
  try{
    if(loginMode==='signup'){
      const name=document.querySelector('#inName').value.trim();
      if(!name){loginErr('נא לבחור שם');return;}
      if(hasProfanity(name)){loginErr('נא לבחור שם מכבד 🙂');return;}
      if(code!==document.querySelector('#inCode2').value){loginErr('הקודים לא זהים');return;}
      if(!/[0-9]/.test(code)||!/[^0-9]/.test(code)){loginErr('הקוד צריך לכלול גם אותיות וגם מספרים');return;}
      const {data,error}=await sb.auth.signUp({email,password:code,options:{data:{name,weekly_ok:!!(document.querySelector('#inWeekly')||{}).checked},emailRedirectTo:location.origin+location.pathname}});
      if(error){loginErr(authErrorHe(error));return;}
      if(!data.session){loginErr('');flash('📧 שלחנו מייל לאישור — אחרי האישור נכנסים עם המייל והקוד');setLoginMode('login');return;}
    }else{
      const {error}=await sb.auth.signInWithPassword({email,password:code});
      if(error){failCount++;if(failCount>=5){lockUntil=Date.now()+60000*Math.min(10,failCount-4);}loginErr(authErrorHe(error)+(/invalid login/i.test(error.message||'')?' — '+'אפשר ללחוץ "שכחתי סיסמה" ולקבל קישור לקוד חדש':''));document.querySelector('#btnResend').hidden=!/not confirmed/i.test(error.message||'');return;}
      failCount=0;
    }
    document.querySelector('#inCode').value='';document.querySelector('#inCode2').value='';
  }catch(e){loginErr(authErrorHe(e));}
  finally{btn.disabled=false;}
};
document.querySelector('#inCode').addEventListener('keydown',e=>{if(e.key==='Enter'&&loginMode==='login')document.querySelector('#btnLogin').click();});
document.querySelector('#inCode2').addEventListener('keydown',e=>{if(e.key==='Enter')document.querySelector('#btnLogin').click();});
document.querySelector('#btnForgot').onclick=async()=>{
  if(!sb)return;const email=document.querySelector('#inMail').value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){loginErr('כתבו קודם את המייל שלכם למעלה');return;}
  /* איפוס קוד רק דרך השרת המוגן (auth-guard) — אין מעקף ישיר */
  loginErr('השירות לא זמין כרגע. נסו שוב בעוד כמה דקות');
};
document.querySelector('#btnResend').onclick=async()=>{
  if(!sb)return;const email=document.querySelector('#inMail').value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){loginErr('כתבו קודם את המייל שלכם למעלה');return;}
  if(typeof guard==='function'){const r=await guard('resend_verify',{email,redirect:location.origin+location.pathname});if(!r.unavailable){loginErr('');flash('📧 אם החשבון עוד לא אושר — שלחנו שוב את מייל האישור');return;}}
  loginErr('השירות לא זמין כרגע. נסו שוב בעוד כמה דקות');
};
/* עין — להציג/להסתיר את הקוד */
document.addEventListener('click',e=>{const b=e.target.closest('.eye[data-eye]');if(!b)return;e.preventDefault();const inp=document.getElementById(b.dataset.eye);if(!inp)return;const show=inp.type==='password';inp.type=show?'text':'password';b.classList.toggle('on',show);b.setAttribute('aria-label',show?'הסתרת הקוד':'הצגת הקוד');b.title=show?'הסתרת הקוד':'הצגת הקוד';inp.focus();});
/* חלון לבחירת קוד חדש (אחרי לחיצה על הקישור במייל) */
/* מהאזור האישי (לא מקישור איפוס במייל) — צריך גם את הקוד הנוכחי, כדי שמי שגנב חיבור לא יוכל להשתלט על החשבון */
function openPwModal(fromSettings){
  const m=document.querySelector('#pwModal');m.hidden=false;document.querySelector('#pwErr').textContent='';
  document.querySelector('#pwCurWrap').hidden=fromSettings!==true;
  ['#pwCur','#pwNew','#pwNew2'].forEach(x=>{const el=document.querySelector(x);el.value='';el.type='password';});document.querySelectorAll('#pwModal .eye').forEach(b=>b.classList.remove('on'));
  setTimeout(()=>document.querySelector('#pwNew').focus(),100);
}
document.querySelector('#pwCancel').onclick=()=>{document.querySelector('#pwModal').hidden=true;};
document.querySelector('#pwSave').onclick=async()=>{
  const c=document.querySelector('#pwNew').value,c2=document.querySelector('#pwNew2').value,err=document.querySelector('#pwErr');
  if(c.length<8||!/[0-9]/.test(c)||!/[^0-9]/.test(c)){err.textContent='הקוד חייב להיות לפחות 8 תווים, עם אותיות ומספרים';return;}
  if(c!==c2){err.textContent='הקודים לא זהים';return;}
  const b=document.querySelector('#pwSave');b.disabled=true;
  /* שינוי קוד רק דרך השרת המוגן (auth-guard) — ראו בהמשך; כאן אין מעקף ישיר */
  try{err.textContent='השירות לא זמין כרגע. נסו שוב בעוד כמה דקות';}
  finally{b.disabled=false;}
};
document.querySelector('#pwNew2').addEventListener('keydown',e=>{if(e.key==='Enter')document.querySelector('#pwSave').click();});
/* בודקים מראש אם כניסה עם גוגל מופעלת ב-Supabase — כדי לא לשלוח את המשתמש לדף שגיאה */
let googleEnabled=null;
async function checkGoogleEnabled(){
  try{const r=await fetch(SB_URL+'/auth/v1/settings',{headers:{apikey:SB_KEY}});const j=await r.json();googleEnabled=!!(j&&j.external&&j.external.google);}catch(e){googleEnabled=null;}
  const b=document.querySelector('#btnGoogle');if(b)b.classList.toggle('off',googleEnabled===false);
  return googleEnabled;
}
checkGoogleEnabled();
/* 🔵 כניסה עם גוגל באפליקציה (מגרסה 2.0): גוגל לא מרשה להיכנס מתוך חלון של אפליקציה, לכן הכניסה נפתחת בדפדפן של הטלפון.
   בטוח (PKCE): הדפדפן מקבל רק קוד חד-פעמי, והקוד עובד רק יחד עם הסוד שנשמר כאן באפליקציה — אפליקציה אחרת שתתפוס אותו לא תוכל להשתמש בו.
   הדפדפן חוזר לאפליקציה דרך app-login.html, והאפליקציה טוענת את האתר עם app_code */
function appGoogleOK(){const m=navigator.userAgent.match(/YamShoppingApp\/(\d+)\.(\d+)/);return !!m&&+m[1]>=2;}
function appOAuthClient(){return window.supabase.createClient(SB_URL,SB_KEY,{auth:{flowType:'pkce',storageKey:'yam-app-oauth',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});}
function appOAuthClean(){try{Object.keys(localStorage).filter(k=>k.indexOf('yam-app-oauth')===0).forEach(k=>localStorage.removeItem(k));}catch(e){}}
async function appGoogleStart(){
  try{const {data,error}=await appOAuthClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/app-login.html',skipBrowserRedirect:true}});
    if(error||!data||!data.url)throw error||new Error('no url');
    loginErr(T('נפתח דפדפן לכניסה עם גוגל — אחרי הבחירה בחשבון חוזרים לכאן לבד 🙂','A browser opens for Google sign-in — you will come back here automatically 🙂'));
    location.href=data.url;
  }catch(e){loginErr(T('לא הצלחנו לפתוח את הכניסה עם גוגל. נסו שוב, או היכנסו עם מייל וסיסמה','Could not open Google sign-in. Try again, or use email and password'));}
}
(async function appGoogleReturn(){
  let q;try{q=new URLSearchParams(location.search);}catch(e){return;}
  const code=q.get('app_code'),bad=q.has('app_auth_err');if(!code&&!bad)return;
  q.delete('app_code');q.delete('app_auth_err');try{history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:'')+location.hash);}catch(e){}
  const fail=()=>{appOAuthClean();setTimeout(()=>{try{showLogin();loginErr(T('הכניסה עם גוגל לא הושלמה. אפשר לנסות שוב 🙂','Google sign-in was not completed. Please try again 🙂'));}catch(e){}},600);};
  if(bad||!sb||!/^[\w-]{6,200}$/.test(code)){fail();return;}
  try{const {data,error}=await appOAuthClient().auth.exchangeCodeForSession(code);
    if(error||!data||!data.session)throw error;
    const r=await sb.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
    appOAuthClean();if(r.error)throw r.error;
  }catch(e){fail();}
})();
document.querySelector('#btnGoogle').onclick=async()=>{
  /* באפליקציה ישנה (לפני 2.0) גוגל חוסמת כניסה מתוך חלון של אפליקציה — מסבירים איך נכנסים */
  if(/YamShoppingApp\//.test(navigator.userAgent)&&!appGoogleOK()){loginErr(T('כניסה עם גוגל עובדת מגרסה 2.0 של האפליקציה. בינתיים: לוחצים "שכחתי סיסמה", בוחרים סיסמה מהקישור שמגיע למייל, וחוזרים להיכנס כאן 🙂','Google sign-in works from app version 2.0. Meanwhile: tap "Forgot password", pick one from the email link, then sign in here 🙂'));return;}
  if(!sb){loginErr('אין חיבור לשרת');return;}
  if(googleEnabled===null)await checkGoogleEnabled();
  if(googleEnabled===false){loginErr('כניסה עם גוגל עוד לא הופעלה באתר — בינתיים נכנסים עם מייל וסיסמה 🙂');return;}
  if(/YamShoppingApp\//.test(navigator.userAgent)){appGoogleStart();return;}
  try{localStorage.setItem('oauthHere','1');}catch(e){}
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});
  if(error)loginErr(error.message.includes('not enabled')?'כניסה עם גוגל עוד לא הופעלה אצל מנהל האתר':authErrorHe(error));
};
document.querySelector('#btnOffline').onclick=async ()=>{
  const n=(await uiPrompt('השם שלך:'));if(!n||!n.trim())return;
  state.user={name:n.trim().slice(0,40),email:'',offline:true};save();hideLogin();afterEnter();
};
let signedInId=null;
async function onSignedIn(user){
  if(signedInId===user.id)return;signedInId=user.id;
  authUser=user;applyAdminUi();
  await loadRole();
  loadMyStore();
  const name=(user.user_metadata&&(user.user_metadata.name||user.user_metadata.full_name))||(state.user&&state.user.name)||(user.email||'').split('@')[0];
  if(state.user&&state.user.id&&state.user.id!==user.id){const dark=state.dark;state=defState();state.dark=dark;state.active=state.lists[0].id;} /* משתמש אחר באותו מכשיר — לא מערבבים נתונים */
  state.user={id:user.id,name:String(name).slice(0,40),email:user.email||''};save();
  hideLogin();
  try{const {data:prof}=await sb.from('profiles').select('name').eq('id',user.id).maybeSingle();if(prof&&prof.name){state.user.name=prof.name;save();}}catch(e){}
  touchPresence();
  await startCloud();
  loadPublicData();
  afterEnter();
  const admHash=location.hash.match(/^#admin(?:-([a-z]+))?(?:&|$)/);
  if(admHash&&isStaff())openBO(admHash[1]);
  else setTimeout(async()=>{await checkUpdates();loadAds();},1500); /* אם הוצג עדכון — הפרסומת מחכה שייסגר (maybePopupAd) */
  setTimeout(initStores,2000);
}
function afterEnter(){
  if(!state.bot.length)botSay('נעים להכיר, '+state.user.name+'! 👩‍🍳 אני יאמי — אפשר לכתוב לי בעברית חופשית, או ללחוץ על "עזרה".');
  dailyGreet();render();
}
function dailyGreet(){const k=dayKey(new Date());if(state.lastGreet===k)return;state.lastGreet=k;
  const d=new Date(),h=d.getHours(),dow=d.getDay();
  const tod=h<6?'לילה טוב':h<12?'בוקר טוב':h<17?'צהריים טובים':h<21?'ערב טוב':'לילה טוב';
  const hs=holidaysOn(d).map(heName);
  botSay(tod+' '+(state.user?state.user.name:'')+'! '+DAYG[dow]+(hs.length?'\n🎉 '+hs.join(', '):'')+(state.plans[dow]&&state.plans[dow].length?'\n📋 יש תוכנית להיום — ראו בבאנר':''));save();}
/* יציאה בטוחה: מכבים התראות למכשיר (כל עוד יש הרשאה למחוק את המנוי), יוצאים בשרת,
   ואם זה נכשל — לפחות מוחקים את החיבור מהמכשיר, כדי שהבא בתור לא יישאר מחובר בחשבון שלך */
async function safeSignOut(){
  if(sb){
    try{if(authUser&&typeof pushDisable==='function')await Promise.race([pushDisable().catch(()=>{}),new Promise(r=>setTimeout(r,2500))]);}catch(e){}
    try{localStorage.removeItem('yam_pro2_last');}catch(e){}let bad=false;try{const r=await sb.auth.signOut();if(r&&r.error)bad=true;}catch(e){bad=true;}
    if(bad){try{await sb.auth.signOut({scope:'local'});}catch(e){}}}
  try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith('sb-'))localStorage.removeItem(k);}}catch(e){}
  /* נתונים אישיים נוספים במכשיר */
  ['yam_myprod_v1','yam_geo_cache_v1','yam_inbox_seen','yamh_mid','yam_me_keep_v1'].forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
  try{myProd={};}catch(e){}try{geoCache={};}catch(e){}try{seen16=new Set();}catch(e){}
}
async function doLogout(){
  document.querySelector('#hMenu').classList.remove('open');
  stopCloud();
  await safeSignOut();
  authUser=null;signedInId=null;myRole=null;myStore=null;repScores={};follows=new Set();storePosts=[];feedPrices=[];feedSeenAt=null;storesView='feed';storeType='';openChain='';postImg='';dtCache=null;dtShown=new Set();updateStoresBadge();applyAdminUi();hideAds();
  const dark=state.dark,gender=state.gender;state=defState();state.dark=dark;state.gender=gender;state.active=state.lists[0].id;save(true);
  document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open'));
  setTab('list');render();setLoginMode('login');showLogin();
  flash(appTxt('👋 יצאת מהאתר'));
}
document.querySelector('#miLogout').onclick=async ()=>{if((await uiConfirm(T('לצאת מהחשבון?','Sign out?'))))doLogout();};
document.querySelector('#btnUser').onclick=async ()=>{
  const n=(await uiPrompt('השם שלך (כך יופיע באתר):',(state.user&&state.user.name)||''));
  if(n===null)return;const name=n.trim().slice(0,40);if(!name)return;
  if(hasProfanity(name)){flash('נא לבחור שם מכבד 🙂');return;}
  state.user.name=name;save();touchPresence();flash('✔️ השם עודכן');
};
/* p_app: מהאפליקציה לאנדרואיד או מהאתר — לבק אופיס ← 👥 משתמשים. אם בשרת עוד אין את הגרסה החדשה, ממשיכים בלי */
let presOld=false;
async function touchPresence(){if(!sb||!authUser)return;try{const a={p_name:(state.user&&state.user.name)||''};if(!presOld)a.p_app=/YamShoppingApp\//.test(navigator.userAgent||'');
  const r=await sb.rpc('touch_presence',a);if(r&&r.error&&!presOld&&(r.error.code==='PGRST202'||/p_app|touch_presence/.test(r.error.message||''))){presOld=true;await sb.rpc('touch_presence',{p_name:a.p_name});}}catch(e){}}
setInterval(()=>{if(document.visibilityState==='visible')touchPresence();},60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')touchPresence();});

/* ================= סנכרון ענן — "חדר" משפחתי עם קוד ================= */
/* customRecipes: מתכונים ששמרו פעם (לפני שהמתכונים הוסרו) — רק עוברים הלאה בסנכרון, כדי לא למחוק נתונים של משתמשים */
const SYNC_KEYS=['lists','history','plans','pantry','customPantry','customRecipes','stats','knowledge','me','tomb'];
/* האזור האישי (me) לא עובר לרשימה משותפת של מישהו אחר — רק לחדר שלי */
function syncPayload(){const o={};SYNC_KEYS.forEach(k=>{if(k==='me'&&state.follow)return;o[k]=state[k];});return o;}
/* יציאה מרשימה משותפת: מאפסים כל מה שהגיע ממנה (חוץ מהאזור האישי), והחדר שלי ימלא מחדש מהענן */
function resetSynced(){const d=defState();SYNC_KEYS.forEach(k=>{if(k==='me')return;state[k]=d[k]!==undefined?d[k]:(k==='tomb'?{items:{},lists:{}}:Array.isArray(state[k])?[]:{});});state.active=state.lists[0].id;}
function mergeLists(localLists,remoteLists,remoteTomb){
  localLists=localLists||[];remoteLists=(remoteLists||[]).map(cleanList).filter(Boolean);const byId={};
  localLists.forEach(l=>{byId[l.id]=JSON.parse(JSON.stringify(l));});
  remoteLists.forEach(rl=>{
    if(!byId[rl.id]){byId[rl.id]=rl;return;}
    const ll=byId[rl.id];const itemMap={};
    (ll.items||[]).forEach(i=>{itemMap[i.id]=i;});
    (rl.items||[]).forEach(i=>{if(!itemMap[i.id]||((i.ts||0)>=(itemMap[i.id].ts||0)))itemMap[i.id]=i;});
    ll.items=Object.values(itemMap).sort((a,b)=>itemKey(a)-itemKey(b));
    /* שם הרשימה: השינוי האחרון מנצח (בלי חותמת = 0) */
    if(rl.name&&(Number(rl.nameTs)||0)>=(Number(ll.nameTs)||0)){ll.name=rl.name;if(rl.nameTs)ll.nameTs=rl.nameTs;}
  });
  /* מה שנמחק באחד המכשירים לא חוזר */
  state.tomb=tombUnion(state.tomb,remoteTomb);
  return tombApply(Object.values(byId),state.tomb).sort((a,b)=>(a.created||0)-(b.created||0));
}
function applyRemote(remote,replaceLists){
  if(!remote||typeof remote!=='object')return;
  cleanRoom(remote);
  if(Array.isArray(remote.lists)&&remote.lists.length)state.lists=replaceLists?(state.tomb=tombUnion(state.tomb,remote.tomb),tombApply(remote.lists,state.tomb)):mergeLists(state.lists,remote.lists,remote.tomb);
  else if(remote.tomb){state.tomb=tombUnion(state.tomb,remote.tomb);state.lists=tombApply(state.lists,state.tomb);}
  if(!state.lists.length)state.lists=defState().lists;
  if(!state.lists.find(l=>l.id===state.active))state.active=state.lists[0]&&state.lists[0].id;
  if(Array.isArray(remote.history)){const seen=new Set(state.history.map(h=>h.ts+'|'+h.listName));state.history=state.history.concat(remote.history.filter(h=>!seen.has(h.ts+'|'+h.listName))).sort((a,b)=>b.ts-a.ts).slice(0,300);}
  if(replaceLists&&Array.isArray(remote.history))state.history=remote.history;
  state.plans={...(state.plans||{}),...(remote.plans||{})};
  state.pantry=replaceLists?(remote.pantry||{}):{...(remote.pantry||{}),...(state.pantry||{})};
  state.customPantry=Array.from(new Set([...(state.customPantry||[]),...(remote.customPantry||[])]));
  const rs=remote.customRecipes||[];state.customRecipes=(state.customRecipes||[]).filter(r=>!rs.some(x=>norm(x.n)===norm(r.n))).concat(rs);
  const rk=remote.knowledge||[];state.knowledge=(state.knowledge||[]).filter(k=>!rk.some(x=>norm(x.q)===norm(k.q))).concat(rk);
  const st={...(remote.stats||{})};Object.keys(state.stats||{}).forEach(k=>{st[k]=Math.max(st[k]||0,state.stats[k]);});state.stats=st;
  if(remote.me&&typeof remote.me==='object'&&(replaceLists||(remote.me.ts||0)>=((state.me&&state.me.ts)||0)))state.me=Object.assign({address:{},stores:[],orders:[],providers:[]},remote.me);
  (state.customPantry||[]).forEach(n=>{if(!P[n]){P[n]={e:'🛒',c:'אחר'};NORMP[norm(n)]=n;}});
  /* העיר שבחרו שמורה גם בענן — אם במכשיר היא אבדה, מחזירים אותה */
  if(!state.follow&&state.me&&knownCity(state.me.city))state.city=knownCity(state.me.city);
}
let roomChannel=null,pushTimer=null,cloudOn=false;
async function startCloud(){
  if(!sb||!authUser)return;
  try{
    let code=null;
    if(state.follow){const {data:ok,error:je}=await sb.rpc('join_room',{p_code:state.follow});if(je)throw je;if(ok)code=state.follow;else{flash('⚠️ הקוד של הרשימה המשותפת לא נמצא — חזרה לרשימה שלך');state.follow=null;resetSynced();}}
    if(!code){const {data,error}=await sb.rpc('ensure_my_room');if(error)throw error;code=data;}
    state.room=code;save(true);
    const {data:row,error:e2}=await sb.from('rooms').select('data').eq('code',code).maybeSingle();
    if(e2)throw e2;
    const remote=row&&row.data;
    if(remote&&remote.lists&&remote.lists.length){
      /* רשימה ריקה שנוצרה אוטומטית במכשיר — לא מכפילים אותה ליד הרשימות מהענן */
      if(state.lists.length===1&&!state.lists[0].items.length&&!remote.lists.some(l=>l.id===state.lists[0].id))state.lists=[];
      applyRemote(remote,false);
    }
    cloudOn=true;save();render();
    setTimeout(askCity,1200);
    if(roomChannel)sb.removeChannel(roomChannel);
    roomChannel=sb.channel('room-'+code).on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:'code=eq.'+code},payload=>{
      const n=payload.new;if(!n||n.updated_by===MID)return;
      applyRemote(n.data,false);save(true);render();flash('🔄 עודכן ממכשיר אחר');
    }).subscribe();
    const b=document.querySelector('#cloudBtn');if(b)b.textContent=state.follow?('🔗 רשימה משותפת: '+code):('☁️ הקוד שלי: '+code);
  }catch(e){console.error('cloud start failed',e);cloudOn=false;offMark(Math.max(offPending,1));offRetryLater();if(!isOffline())flash('⚠️ הסנכרון לענן לא זמין כרגע — שומר במכשיר');}
}
/* חובה: באיזו עיר גרים — לזמני שבת, למבצעים ולמחירים בסניפים הקרובים. נשמר ב-me.city (מסונכרן לענן).
   החלון לא נסגר עד שבוחרים עיר; מי שהצטרף לרשימה משותפת של המשפחה — העיר כבר שמורה אצל בעל הרשימה */
/* רשימת כל היישובים בישראל (data.gov.il, מאגר פתוח) + ערים בחו"ל — נטענת פעם אחת, לכל שדה "עיר" באתר */
let cityListP=null;
function fillCityList(dl){if(!dl)return;cityListP=cityListP||fetch('cities-il.json').then(r=>r.ok?r.json():[]).catch(()=>[]);
  cityListP.then(names=>{if(!Array.isArray(names)||!names.length||dl.dataset.full)return;dl.dataset.full='1';
    dl.innerHTML=Array.from(new Set(names.map(String).concat(Object.keys(CITIES_ABROAD)))).map(c=>'<option value="'+esc(c)+'">').join('');});}
function cleanCity(v){let c=String(v||'').replace(/\s+/g,' ').trim().slice(0,40);if(/^תל אביב[ -]*יפו$/.test(c))c='תל אביב';return c;}
document.addEventListener('focusin',e=>{if(e.target&&e.target.id==='meCity')fillCityList(document.getElementById('meCityList'));});
function askCity(){
  if(!authUser||state.follow||document.querySelector('#cityAsk'))return;
  if(String(meData().city||'').trim())return;
  /* הרשימה המלאה: כל היישובים בישראל מ-data.gov.il (מאגר פתוח, "רשימת ישובים בישראל") — cities-il.json; ובנוסף ערים בחו"ל */
  const ov=document.createElement('div');ov.id='cityAsk';ov.className='qp15 open';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  ov.innerHTML='<div class="qpcard"><div class="qphead"><b>📍 '+T('באיזו עיר אתם גרים?','Which city do you live in?')+'</b></div>'+
    '<p class="muted-note" style="margin:0">'+T('כדי להראות לכם זמני שבת, מבצעים ומחירים בסניפים הקרובים אליכם. אפשר לשנות אחר כך ב"הפרטים שלי".','So we can show Shabbat times, deals and prices near you. You can change it later.')+'</p>'+
    '<input id="cityAskIn" list="cityAskList" maxlength="40" autocomplete="off" placeholder="'+T('התחילו להקליד — למשל בני ברק','Start typing a city')+'" aria-label="'+T('העיר שלי','My city')+'">'+
    '<datalist id="cityAskList">'+Object.keys(CITIES).map(c=>'<option value="'+esc(c)+'">').join('')+'</datalist>'+
    '<p id="cityAskErr" role="alert" style="margin:0;color:var(--bad);font-weight:600" hidden></p>'+
    '<button class="btn" id="cityAskOk">'+T('שמירה','Save')+'</button></div>';
  document.body.appendChild(ov);
  const inp=ov.querySelector('#cityAskIn'),list=ov.querySelector('#cityAskList'),err=ov.querySelector('#cityAskErr');
  fillCityList(list);
  /* ההודעה בתוך החלון — הודעה צפה (flash) מוסתרת מאחורי הרקע הכהה */
  const bad=m=>{err.textContent=m;err.hidden=false;};
  inp.oninput=()=>{err.hidden=true;};
  inp.onkeydown=e=>{if(e.key==='Enter')ov.querySelector('#cityAskOk').click();};
  ov.querySelector('#cityAskOk').onclick=()=>{
    const c=cleanCity(inp.value);
    if(!c||c.length<2){bad(T('נא לבחור עיר 🙂','Please choose a city 🙂'));return;}
    if(hasProfanity(c)){bad(T('נא לכתוב שם עיר 🙂','Please enter a city name 🙂'));return;}
    const me=meData();const kc=knownCity(c);me.city=kc||c;me.ts=Date.now();
    if(kc){state.city=kc;savePrefs();}
    save();ov.remove();try{render();}catch(e){}
    flash('📍 '+T('נשמר: ','Saved: ')+cityName(c));
  };
}
function stopCloud(){cloudOn=false;clearTimeout(pushTimer);if(roomChannel&&sb){try{sb.removeChannel(roomChannel);}catch(e){}}roomChannel=null;}
function pushCloud(){
  if(!cloudOn||!sb||!state.room)return;
  clearTimeout(pushTimer);
  if(isOffline())return; /* בלי קליטה — הכל כבר שמור בטלפון, ונשלח כשהקליטה תחזור (offSync) */
  pushTimer=setTimeout(async()=>{
    /* קוראים את מה שיש בענן, ממזגים רשימות ומחיקות, ורק אז כותבים — כדי לא לדרוס שינויים של מכשיר אחר */
    try{const code=state.room;const {data:row,error:ge}=await sb.from('rooms').select('data').eq('code',code).maybeSingle();
      if(ge){offFailed(ge);return;}
      let base={};
      if(row&&row.data&&typeof row.data==='object'&&!Array.isArray(row.data)){base=cleanRoom(row.data);
        const before=JSON.stringify(state.lists);
        if(Array.isArray(base.lists)&&base.lists.length)state.lists=mergeLists(state.lists,base.lists,base.tomb);
        else if(base.tomb){state.tomb=tombUnion(state.tomb,base.tomb);state.lists=tombApply(state.lists,state.tomb);}
        if(!state.lists.length)state.lists=defState().lists;
        if(!state.lists.find(l=>l.id===state.active))state.active=state.lists[0].id;
        if(JSON.stringify(state.lists)!==before){_localSave();try{render();}catch(e){}}}
      const {error}=await sb.from('rooms').update({data:Object.assign({},base,syncPayload()),updated_by:MID,updated_at:new Date().toISOString()}).eq('code',code);
      if(error)offFailed(error);else offMark(0);}catch(e){offFailed(e);}
  },700);
}
const _localSave=save;
/* סופרים "שינוי שלא נשלח" רק כשמשהו שנשלח לענן באמת השתנה (ולא ברכה של יאמי או שמירה פנימית) */
let offSig=null;const offSigNow=()=>{try{return JSON.stringify(syncPayload());}catch(e){return '';}};
save=function(localOnly){_localSave();if(!localOnly){if(authUser||(state.user&&state.user.id&&!state.user.offline)){const sg=offSigNow(),ch=sg!==offSig;offSig=sg;if((isOffline()||offPending)&&ch)offMark(offPending+1);}pushCloud();}};

/* ================= מצב לא מקוון: בחנות בלי קליטה =================
   הרשימה תמיד נשמרת קודם בטלפון (localStorage), כך שאפשר לראות, לסמן ולהוסיף גם בלי אינטרנט.
   כאן סופרים כמה שינויים עוד לא הגיעו לענן, ושולחים אותם ברגע שהקליטה חוזרת.
   המיזוג (mergeLists) לפי זמן השינוי של כל מוצר — כך שמה שסימנתם בחנות לא נדרס, וגם שינויים של המשפחה נשמרים. */
const OFF_KEY='yam_off_pending';
let offPending=0,offRetryT=null,offOkT=null;try{offPending=+localStorage.getItem(OFF_KEY)||0;}catch(e){}
function isOffline(){return navigator.onLine===false;}
function offMark(n){const was=offPending;offPending=Math.max(0,n|0);try{offPending?localStorage.setItem(OFF_KEY,String(offPending)):localStorage.removeItem(OFF_KEY);}catch(e){}
  if(was&&!offPending&&!isOffline()){offBar(T('✅ חזרה הקליטה — הרשימה סונכרנה','✅ Back online — your list is synced'),true);return;}
  offBar();}
function offBar(okMsg,ok){const b=document.querySelector('#offBar');if(!b)return;clearTimeout(offOkT);
  let m='';
  if(okMsg)m=okMsg;
  else if(isOffline())m=T('📴 אין אינטרנט — הכל עובד מהמכשיר. מחירים, צ׳אט ושיתוף יחזרו עם החיבור','📴 Offline — everything works from this device. Prices, chat and sharing return when online')+(offPending&&authUser?T(' · '+offPending+' שינויים יישלחו',' · '+offPending+' changes to sync'):'');
  else if(offPending&&authUser)m=T('⏳ '+offPending+' שינויים עוד לא נשלחו — מנסים שוב...','⏳ '+offPending+' changes not sent yet — retrying...');
  b.textContent=m;b.classList.toggle('on',!!m);b.classList.toggle('ok',!!ok);
  if(ok)offOkT=setTimeout(()=>{b.classList.remove('on','ok');b.textContent='';},3500);}
function offRetryLater(){clearTimeout(offRetryT);offRetryT=setTimeout(offSync,20000);}
function offFailed(e){const msg=String((e&&e.message)||'');
  offMark(Math.max(offPending,1));offRetryLater();
  /* תקלת רשת (קליטה חלשה) — רק הפס הקטן; תקלה אחרת — מראים אותה */
  if(!isOffline()&&!/fetch|network|load failed|timeout|abort/i.test(msg))flash('⚠️ השמירה לענן נכשלה — '+msg);}
let offSyncing=false;
async function offSync(){
  clearTimeout(offRetryT);
  if(isOffline()||!sb||offSyncing){offBar();return;}
  offSyncing=true;
  try{
    /* נכנסו לאתר בלי קליטה — עכשיו מתחברים לחשבון ולענן (startCloud ממזג ושולח את מה שנשמר בטלפון) */
    if(!authUser){const {data}=await sb.auth.getSession();if(data&&data.session)await onSignedIn(data.session.user);else if(offPending)offRetryLater();}
    else if(!cloudOn)await startCloud();
    else if(offPending)pushCloud();
    else{/* אין מה לשלוח — רק מושכים מה שהמשפחה שינתה בזמן שלא הייתה קליטה */
      const {data:row,error}=await sb.from('rooms').select('data').eq('code',state.room).maybeSingle();
      if(!error&&row&&row.data){const before=JSON.stringify(state.lists);applyRemote(row.data,false);_localSave();if(JSON.stringify(state.lists)!==before)try{render();}catch(e){}}}
  }catch(e){offRetryLater();}
  finally{offSyncing=false;offBar();}
}
window.addEventListener('online',()=>{offBar();offSync();});
window.addEventListener('offline',()=>{offBar();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(offPending||!cloudOn))offSync();});
setTimeout(offBar,0);
(function addCloudButton(){
  const row=document.querySelector('#shKeep')||document.querySelector('#shareRow');if(!row)return;
  const b=document.createElement('button');b.id='cloudBtn';b.textContent='☁️ שיתוף רשימה עם המשפחה';
  b.onclick=async()=>{
    if(!sb||!authUser){flash('צריך להיות מחוברים לחשבון כדי לשתף');return;}
    if(state.follow){if((await uiConfirm('להתנתק מהרשימה המשותפת ולחזור לרשימות שלך?'))){try{await sb.rpc('leave_room',{p_code:state.follow});}catch(e){}state.follow=null;resetSynced();save(true);stopCloud();await startCloud();render();flash('חזרת לרשימות שלך 👤');}return;}
    const c=(await uiPrompt('🔑 הקוד של הרשימות שלך: '+(state.room||'')+'\nשלחו אותו לבני המשפחה — מי שמקליד אותו רואה ועורך את אותן רשימות בזמן אמת.\n\nקיבלתם קוד ממישהו אחר? הקלידו אותו כאן:',''));
    if(c===null)return;const entered=(c||'').trim().toUpperCase();
    if(!entered||entered===state.room){try{await navigator.clipboard.writeText(state.room);flash('📋 הקוד הועתק: '+state.room);}catch(e){}return;}
    if(!/^[A-Z0-9]{6,20}$/.test(entered)){flash('⚠️ קוד לא תקין');return;}
    const {data:ok}=await sb.rpc('join_room',{p_code:entered});
    if(!ok){flash('⚠️ '+T('הקוד לא נמצא, או שהגישה לרשימה הזו נחסמה','Code not found, or access was blocked'));return;}
    state.follow=entered;save(true);stopCloud();await startCloud();render();flash('🔗 התחברת לרשימה המשותפת!');
  };
  row.appendChild(b);
})();

/* ================= 💾 נתונים שמורים בטלפון (IndexedDB) =================
   בכל פתיחה הורדנו מחדש את כל המוצרים, הסניפים, הרשתות, המתכונים וההגדרות — גם כשלא השתנה כלום.
   עכשיו: מה שנשמר בפעם הקודמת מוצג מיד, ומתעדכן מהשרת ברקע רק כשעבר הזמן שנקבע לכל סוג (ttl).
   מנהלים תמיד מקבלים נתונים טריים (אחרי שמוצג השמור), וכל טעינה נוספת באותה פתיחה (למשל אחרי עריכה בבק אופיס) — תמיד מהשרת.
   אין IndexedDB (גלישה פרטית וכו') — עובד כמו קודם, ישר מהשרת. */
const DC={db:null,boot:{}};
function dcDb(){if(!DC.db)DC.db=new Promise(res=>{try{const r=indexedDB.open('yam-data',1);r.onupgradeneeded=()=>{try{r.result.createObjectStore('kv');}catch(e){}};r.onsuccess=()=>res(r.result);r.onerror=r.onblocked=()=>res(null);}catch(e){res(null);}});return DC.db;}
async function dcGet(k){const db=await dcDb();if(!db)return null;return new Promise(res=>{try{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null);}catch(e){res(null);}});}
async function dcSet(k,v){const db=await dcDb();if(!db)return;try{db.transaction('kv','readwrite').objectStore('kv').put({t:Date.now(),v},k);}catch(e){}}
async function cachedLoad(key,ttl,fetchFn,apply){
  const k=key+'|'+((typeof authUser!=='undefined'&&authUser&&authUser.id)||'-');
  const first=!DC.boot[k];DC.boot[k]=1;
  let c=null;
  if(first){c=await dcGet(k);if(c&&Array.isArray(c.v)){try{apply(c.v,true);}catch(e){}}else c=null;}
  const staff=(typeof isStaff==='function'&&isStaff())||(typeof isAdmin==='function'&&isAdmin());
  if(c&&!staff&&Date.now()-c.t<ttl)return;
  let d=null;try{d=await fetchFn();}catch(e){d=null;}
  if(!Array.isArray(d))return; /* שגיאה מהשרת — נשארים עם השמור */
  try{apply(d,false);}catch(e){}
  dcSet(k,d);
}
const HOUR_MS=3600000;

/* ================= נתונים ציבוריים: מתכונים, ידע, הגדרות, רשתות ================= */
let botCfg={},chainsCache=[],branchesCache=[],srvCfg=null;
/* מה המשתמשים רואים — נקבע בבק אופיס (site_config ← collector): public=true מציג לכולם, אחרת רק מנהלים רואים (מצב בדיקה).
   hidden = רשתות שלא מוצגות למשתמשים */
function srvPublic(){return !!(srvCfg&&srvCfg.public===true);}
function srvShown(){return srvPublic()||(typeof isAdmin==='function'&&isAdmin());}
function srvHidden(){return srvCfg&&Array.isArray(srvCfg.hidden)?srvCfg.hidden.filter(x=>typeof x==='string'):[];}
async function loadPublicData(){
  if(!sb)return;
  /* הכול במקביל (קודם אחד אחרי השני) */
  await Promise.all([
    /* הגדרות: קטנות וקובעות מתגים — תמיד מהשרת, אבל השמור מוצג מיד */
    cachedLoad('cfg',0,async()=>{const {data,error}=await sb.from('site_config').select('key,value');return error?null:(data||[]);},d=>d.forEach(r=>applyConfig(r.key,r.value))),
    cachedLoad('kb',6*HOUR_MS,async()=>{const {data,error}=await sb.from('bot_knowledge').select('question,answer').eq('status','approved').limit(2000);return error?null:(data||[]);},d=>{globalKnowledge=d.map(k=>({q:k.question,a:k.answer}));}),
    loadChains()
  ]);
}
async function loadChains(){
  if(!sb)return;
  await Promise.all([
    cachedLoad('chains',HOUR_MS,async()=>{let r=await sb.from('chains').select('name,kind,status,category').order('name');if(r.error)r=await sb.from('chains').select('name,kind,status').order('name');return r.error?null:(r.data||[]);},d=>{chainsCache=d;}),
    cachedLoad('branches',6*HOUR_MS,async()=>{let r=await sb.from('branches').select('chain,city,address,name,status,lat,lng').order('city').limit(5000);if(r.error)r=await sb.from('branches').select('chain,city,address,name,status').order('city').limit(5000);return r.error?null:(r.data||[]);},d=>{branchesCache=d;})
  ]);
  if(tab==='prices'){if(document.querySelector('#panePrices').contains(document.activeElement))updateBranchOptions();else renderPrices();}
  if(tab==='stores'&&!document.querySelector('#paneStores').contains(document.activeElement))renderStores();
}
function applyConfig(key,v){
  v=v||{};
  /* צבעי האתר הישנים מהניהול (theme) — בוטלו: הצבעים באים רק מעיצוב 2.0 ומערכת הצבעים של המשתמש */
  if(key==='ads'){adsAudience=['all','admins','none'].includes(v.audience)?v.audience:'all';adHouse=v.house!==false;adFreq=['day','session','load'].includes(v.freq)?v.freq:'day';adSidePop=Math.max(0,Math.min(30,+v.side_pop||0));}
  if(key==='announcement'){const a=document.querySelector('#announce');a.textContent=v.text||'';a.classList.toggle('on',!!(v.on&&v.text));}
  if(key==='bot'){botCfg=v;bannedExtra=Array.isArray(v.bannedExtra)?v.bannedExtra:[];}
  if(key==='about'){aboutText=v.text||'';if(typeof cleanOff161==='function')aboutText=cleanOff161(aboutText);}
  if(key==='collector'){srvCfg=v;try{if(typeof render==='function')render();}catch(e){}}
}
/* "איפה הכי זול" מוצג לפי המתג בבק אופיס (collector) — טוענים אותו מיד, גם בלי כניסה לחשבון (נכנסו בלי חשבון, או באפליקציה לפני שנכנסו).
   קודם נטען רק אחרי כניסה, אז מי שלא מחובר לא ראה את "איפה הכי זול" גם כשהמתג דלוק לכולם */
if(sb)sb.from('site_config').select('value').eq('key','collector').maybeSingle().then(({data})=>{if(data&&data.value&&!srvCfg)applyConfig('collector',data.value);},()=>{});

/* ================= מחירים, רשתות וסניפים ================= */
const STORE_TYPES={supermarket:['🛒','סופרמרקטים','Supermarkets'],grocery:['🏪','מכולות','Groceries'],produce:['🥕','ירקנים','Produce'],butcher:['🥩','אטליזים ודגים','Butchers & fish'],bakery:['🥖','מאפיות','Bakeries'],pharm:['💊','פארם וטואלטיקה','Pharmacies'],home:['🧽','כלי בית וניקיון','Home goods'],online:['🌐','אונליין','Online'],nuts:['🥜','חנויות פיצוחים','Nut shops'],pizza:['🍕','פיצריות','Pizzerias'],shawarma:['🥙','שווארמיות','Shawarma'],falafel:['🧆','פלאפל','Falafel'],sweets:['🍬','ממתקים','Sweets'],other:['🏬','אחר','Other']};
const DEFAULT_CHAINS=[{name:'נתיב החסד',kind:'store',category:'supermarket'},{name:'בר כל טוב',kind:'store',category:'supermarket'},{name:'רמי לוי',kind:'store',category:'supermarket'},{name:'יש חסד',kind:'store',category:'supermarket'},{name:'אושר עד',kind:'store',category:'supermarket'},{name:'רמי לוי אונליין',kind:'online',category:'online'},{name:'שופרסל אונליין',kind:'online',category:'online'},{name:'יוחננוף אונליין',kind:'online',category:'online'}];
function chainCategory(n){const c=allChains().find(x=>x.name===n);return (c&&STORE_TYPES[c.category])?c.category:(c&&c.kind==='online'?'online':'supermarket');}
/* סניפים עם רחובות (נאספו מהאינטרנט — ספטמבר 2026). מנהל האתר מעדכן/מוסיף מהבק אופיס. */
const BRANCH_SEED=[
['נתיב החסד','בני ברק','קוטלר 18'],['נתיב החסד','בני ברק','נויפלד 15'],['נתיב החסד','בני ברק','גניחובסקי 23'],['נתיב החסד','בני ברק','הרב קלישר 17','גני גד'],['נתיב החסד','בני ברק','ירמיהו 1'],['נתיב החסד','בני ברק','חבקוק 25'],['נתיב החסד','בני ברק','יגאל אלון 12'],['נתיב החסד','בני ברק','רשב"ם 15'],
['נתיב החסד','ירושלים','משה שאולי','נווה יעקב'],['נתיב החסד','ירושלים','פנים מאירות'],['נתיב החסד','בית שמש','מרים הנביאה 16'],['נתיב החסד','בית שמש','נחל שורק 11'],['נתיב החסד','אלעד','הרי"ף 1'],['נתיב החסד','אלעד','שמעיה 19'],
['נתיב החסד','אשדוד','רבי אליעזר בן הורקנוס 22'],['נתיב החסד','אשדוד','רבי אליעזר בן הורקנוס 8'],['נתיב החסד','אשדוד','הלל 8'],['נתיב החסד','אשדוד','רשב"י 12'],['נתיב החסד','מודיעין עילית','נתיבות המשפט 38'],
['נתיב החסד','חיפה',"שד' טרומפלדור 54",'נווה שאנן'],['נתיב החסד','נתניה','האר"י 20'],['נתיב החסד','רחובות','מנוחה ונחלה 7'],['נתיב החסד','בת ים','הרב ניסנבאום 25'],['נתיב החסד','חדרה','הגיבורים 52'],
['בר כל טוב','בני ברק','שלמה המלך 6'],['בר כל טוב','בני ברק','הרב אבו חצירא 20'],['בר כל טוב','בני ברק','רבי עקיבא 94'],['בר כל טוב','בני ברק','הרב קוק 5'],['בר כל טוב','ירושלים','אריה בן אליעזר 47','גילה'],['בר כל טוב','ירושלים','משה שאולי 10','נווה יעקב'],
['בר כל טוב','רמת גן','הרב לנדרס 1'],['בר כל טוב','רחובות','הרב זכריה מדר 27'],['בר כל טוב','רחובות','מבצע ליטני 8'],['בר כל טוב','רחובות','כובשי החרמון 10'],['בר כל טוב','מודיעין עילית','רבי שמעון בר יוחאי 35'],['בר כל טוב','אלעד','שמעון הצדיק 7'],
['בר כל טוב','צפת','צה"ל 13'],['בר כל טוב','נתיבות','הרב מזוז'],['בר כל טוב','אשדוד','רוזובסקי'],
['רמי לוי','ירושלים','הפרסה 3','רב מכר'],['רמי לוי','בני ברק','מבצע קדש 68','איילון'],['רמי לוי','ביתר עילית','החוזה מלובלין 2'],['רמי לוי','מודיעין','החרט 1'],
['יש חסד','בני ברק','שלמה המלך 12'],['יש חסד','בני ברק','עזרא 21'],['יש חסד','בני ברק','השומר 10'],['יש חסד','בני ברק','אהרונוביץ 10','מרכז רימונים'],['יש חסד','ירושלים','ברכת אברהם 22'],
['אושר עד','בני ברק','הקישון 11'],['אושר עד','ירושלים','בית הדפוס 29'],['אושר עד','ירושלים','שמגר 16'],['אושר עד','בית שמש','הגליל 6'],['אושר עד','אשדוד','בעלי המלאכה 6'],['אושר עד','אשדוד','המדע 11']
].map(([chain,city,address,name])=>({chain,city,address,name:name||''}));
function allChains(){const m=new Map();chainsCache.concat(DEFAULT_CHAINS).forEach(c=>{if(c&&c.name&&!m.has(c.name))m.set(c.name,c);});return Array.from(m.values());}
function allChainNames(){return allChains().map(c=>c.name);}
function chainKind(n){const c=allChains().find(x=>x.name===n);return c?c.kind:'store';}
function allBranches(){const src=branchesCache.length?branchesCache:BRANCH_SEED;const seen=new Set();return src.filter(b=>{const k=b.chain+'|'+b.city+'|'+(b.address||'');if(seen.has(k))return false;seen.add(k);return true;});}
let priceSort='cheap',priceQuery='',priceRows=[],priceTimer=null,barcodeStream=null,barcodeScanTimer=null,brChain='',brCity='',repScores={},myStore=null,editingPrice=null,showAddStore=false;
/* ---- מטבע ---- */
const CURRENCIES={ILS:'₪ שקל',USD:'$ דולר',EUR:'€ אירו',GBP:'£ לירה שטרלינג',CAD:'CA$ דולר קנדי',AUD:'A$ דולר אוסטרלי',ARS:'AR$ פסו',CHF:'CHF פרנק',ZAR:'R ראנד',MXN:'MX$ פסו מקסיקני',RUB:'₽ רובל',UAH:'₴ הריבנה'};
function myCurrency(){return (prefs&&CURRENCIES[prefs.currency])?prefs.currency:'ILS';}
function fmtPrice(v,cur){cur=typeof cur==='string'&&/^[A-Z]{3}$/.test(cur)?cur:'';try{return new Intl.NumberFormat(prefs.lang==='en'?'en-US':'he-IL',{style:'currency',currency:cur||'ILS',maximumFractionDigits:2}).format(Number(v));}catch(e){return Number(v).toFixed(2)+' '+(cur||'');}}
/* ---- דירוג מדווחים ---- */
/* 🏅 מוניטין — ספירה אחת לכל האתר (אותו מספר כמו בפרו). ערכי הנקודות מהגדרות הפרו בבק אופיס */
function repPts(k){try{if(window.pro2&&pro2.cfg)return pro2.cfg(k);}catch(e){}return {pts_photo:3,pts_price:1,pts_confirm:2,pts_bonus:1,solo_points:70}[k]||0;}
function repBadge(score){score=score||0;return score>=70?'💎':score>=40?'🥇':score>=15?'🥈':score>=5?'🥉':'';}
async function loadRepScores(){if(!sb||!authUser)return;try{const {data}=await sb.rpc('reporter_scores');repScores={};(data||[]).forEach(r=>repScores[r.user_id]=r);}catch(e){}}
async function loadMyStore(){myStore=null;if(!sb||!authUser)return;try{const {data}=await sb.rpc('my_store');myStore=(data&&data[0])||null;}catch(e){}}
/* בקשה חופשית ← איך המוצר נקרא בדיווחים ("סיגריות" ← מרלבורו, "מסכת פנים" ← מסכות / מסיכה) */
const SRCH_SYN={'סיגריות':['סיגרי','מרלבורו','ווינסטון','קאמל','פרלמנט','נובלס','טבק'],'סיגריה':['סיגרי','מרלבורו','ווינסטון','קאמל','פרלמנט','טבק'],
  'מסכת פנים':['מסכות פנים','מסיכ','מסכה'],'מסכה':['מסכות','מסיכ'],'מסיכה':['מסכות','מסכה'],'מסכות פנים':['מסכת פנים','מסיכ','מסכה'],
  'סוללות':['סולל','בטרי'],'בטריות':['סולל','בטרי'],'חיתולים':['טיטול','האגיס','פמפרס'],'טיטולים':['חיתול','האגיס','פמפרס']};
async function fetchPrices(q){
  q=norm(q);if(!sb||!authUser||!q)return [];
  const flt=[q].concat(SRCH_SYN[q]||[]).map(t=>'product_key.ilike.%'+t.replace(/[%,()]/g,'')+'%').join(',')+',barcode.eq.'+(/^\d+$/.test(q)?q:'0');
  const run=cols=>sb.from('prices').select(cols).or(flt).order('created_at',{ascending:false}).limit(150);
  try{let {data,error}=await run(PRICE_COLS+',wrong,is_deal,deal_text,valid_until,regular_price');if(error)({data,error}=await run(PRICE_COLS+',wrong,is_deal,deal_text,valid_until'));if(error)({data}=await run(PRICE_COLS));const rows=data||[];loadMyVotes(rows);return rows;}catch(e){return [];}
}
const PRICE_COLS='id,product,chain,branch,price,currency,barcode,confirms,created_at,updated_at,by_id,verified,status';
/* ההצבעות שלי ("נכון" / "לא נכון") על דיווחים שמוצגים */
let myVotes={};
async function loadMyVotes(rows){if(!sb||!authUser||!rows||!rows.length)return;const ids=rows.map(r=>r.id).filter(id=>!(id in myVotes));if(!ids.length)return;
  try{const {data,error}=await sb.rpc('my_price_votes',{p_ids:ids});if(error)return;ids.forEach(id=>{myVotes[id]=0;});(data||[]).forEach(v=>{myVotes[v.price_id]=v.vote;});document.querySelectorAll('[data-vote]').forEach(b=>{const [id,v]=b.dataset.vote.split('|');b.classList.toggle('on',myVotes[id]===+v);});}catch(e){}}
function voteBtns(r){const mv=myVotes[r.id]||0;return '<span class="votes" role="group" aria-label="'+T('האם המחיר נכון?','Is this price correct?')+'"><button class="pr-act vote ok'+(mv===1?' on':'')+'" data-vote="'+esc(r.id)+'|1" title="'+T('המחיר נכון','Correct')+'">✅ '+T('נכון','Correct')+' <b>'+(r.confirms||0)+'</b></button><button class="pr-act vote no'+(mv===-1?' on':'')+'" data-vote="'+esc(r.id)+'|-1" title="'+T('המחיר לא נכון','Wrong')+'">❌ '+T('לא נכון','Wrong')+' <b>'+(r.wrong||0)+'</b></button></span>';}
/* ---- חישוב מבצעים מדויק: כמה עולה במחיר רגיל, כמה במבצע, וכמה חוסכים ----
   מבינים: "3 ב-10", "1+1", "2+1", "השני בחצי מחיר", "השני ב-30%", "20% הנחה". מחיר רגיל — מהשדה regular_price כשמדווחים אותו */
function dealParse(t){t=String(t||'').replace(/[״"׳']/g,'').replace(/,/g,'.');let m;
  if((m=t.match(/(\d+)\s*\+\s*(\d+)/)))return {type:'xy',buy:+m[1],free:+m[2]};
  if((m=t.match(/השני[הי]?\s*(?:ב|ב-|ב־)?\s*(חצי|\d+(?:\.\d+)?\s*%)/)))return {type:'second',off:m[1]==='חצי'?.5:Math.min(1,parseFloat(m[1])/100)};
  if((m=t.match(/(\d+(?:\.\d+)?)\s*%/)))return {type:'pct',off:Math.min(.95,parseFloat(m[1])/100)};
  if((m=t.match(/(\d+)\s*(?:יח[׳']?|יחידות|ב?)?\s*(?:ב|ב-|ב־|ב–|ב\s*-)\s*(\d+(?:\.\d+)?)/))&&+m[1]>1)return {type:'nforx',n:+m[1],x:parseFloat(m[2])};
  if((m=t.match(/(\d+)\s*(?:ב|ב-)\s*(\d+(?:\.\d+)?)/i))&&+m[1]>1)return {type:'nforx',n:+m[1],x:parseFloat(m[2])};
  return null;}
const rnd2=n=>Math.round(n*100)/100;
function dealActive(r){return !!r.is_deal&&(!r.valid_until||new Date(r.valid_until+'T23:59:59')>=new Date());}
/* q יחידות של המוצר: {cost: כמה משלמים, regular: כמה היה עולה בלי מבצע, save, deal: האם המבצע חל, note} */
function dealCost(r,q){q=Math.max(1,Number(q)||1);const p=Number(r.price)||0;const reg0=Number(r.regular_price)>0?Number(r.regular_price):0;
  if(!dealActive(r)){const u=reg0||p;return {cost:rnd2(u*q),regular:rnd2(u*q),save:0,deal:false,note:''};}
  const d=dealParse(r.deal_text);let cost=p*q,reg=reg0,note='';
  if(d&&d.type==='nforx'){const u=reg||p;reg=u;const sets=Math.floor(q/d.n);cost=sets*d.x+(q-sets*d.n)*u;note=sets?'':T('המבצע מ-'+d.n+' יחידות','deal from '+d.n+' units');}
  else if(d&&d.type==='xy'){const u=reg||p;reg=u;const grp=d.buy+d.free;cost=(q-Math.floor(q/grp)*d.free)*u;note=q>=grp?'':T('המבצע מ-'+grp+' יחידות','deal from '+grp+' units');}
  else if(d&&d.type==='second'){const u=reg||p;reg=u;const pairs=Math.floor(q/2);cost=(q-pairs)*u+pairs*u*(1-d.off);note=pairs?'':T('המבצע מ-2 יחידות','deal from 2 units');}
  else if(d&&d.type==='pct'){if(reg){cost=Math.min(p,reg*(1-d.off))*q;}else reg=p/(1-d.off);}
  if(!reg||reg<p)reg=Math.max(reg||0,p);
  const regular=rnd2(reg*q);cost=rnd2(Math.min(cost,regular));return {cost,regular,save:rnd2(regular-cost),deal:true,note};}
function dealBadge(r){if(!r.is_deal)return '';if(!dealActive(r))return '<span class="dealbadge" style="opacity:.55;text-decoration:line-through" title="'+T('המבצע הסתיים','Deal ended')+'">'+T('מבצע שהסתיים','Ended deal')+'</span>';const until=r.valid_until?T(' · עד ',' · until ')+new Date(r.valid_until).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'}):'';
  const d=dealParse(r.deal_text),n=d&&d.type==='nforx'?d.n:d&&d.type==='xy'?d.buy+d.free:d&&d.type==='second'?2:1,c=dealCost(r,n);
  const calc=c.deal&&c.save>0?' <span class="dealcalc">'+(n>1?n+T(' יח׳: ',' units: '):'')+'<s>'+fmtPrice(c.regular,r.currency)+'</s> → <b>'+fmtPrice(c.cost,r.currency)+'</b> · '+T('חוסכים ','save ')+fmtPrice(c.save,r.currency)+' ('+Math.round(100*c.save/c.regular)+'%)</span>':'';
  return '<span class="dealbadge" title="'+T('מחיר מבצע','Deal price')+'">🔥 '+T('מבצע','Deal')+(r.deal_text?': '+esc(r.deal_text):'')+until+'</span>'+calc;}
const agoText=d=>{if(!d)return '';const days=Math.floor((Date.now()-new Date(d).getTime())/86400000);return days<=0?T('היום','today'):days===1?T('אתמול','yesterday'):T('לפני '+days+' ימים',days+' days ago');};
const dt=d=>new Date(d).toLocaleString(prefs.lang==='en'?'en-GB':'he-IL',{dateStyle:'short',timeStyle:'short'});
function renderPrices(){
  const p=document.querySelector('#panePrices');if(!p)return;
  const chains=allChains();
  let html='<div class="price-note">'+T('💡 המחירים כאן ציבוריים — כל דיווח ואישור נראה לכל המשתמשים 🌍 מחיר עם ✔ הגיע ישירות מהסופר.','💡 Prices here are public — every report is visible to all users 🌍 A ✔ price came directly from the store.')+'</div>';
  html+=tools18Html();
  if(myStore){
    html+='<div class="grp mystore"><h3>🏪 '+T('הסופר שלי','My store')+': '+esc(myStore.chain)+(myStore.branch?' — '+esc(myStore.branch):'')+' <small>('+(myStore.title==='owner'?T('בעל הסופר','owner'):T('אחראי','manager'))+(myStore.auto_approve?T(' · עולה מיד',' · published instantly'):T(' · באישור מנהל',' · needs approval'))+')</small></h3>'+
      '<div class="price-report"><input id="msProduct" placeholder="'+T('מוצר','Product')+'" list="prProductList" maxlength="60"><input id="msPrice" type="number" step="0.01" min="0" placeholder="'+T('מחיר','Price')+'"><input id="msBarcode" placeholder="'+T('ברקוד','Barcode')+'" inputmode="numeric" maxlength="20">'+
      (myStore.branch?'':'<input id="msBranch" placeholder="'+T('סניף','Branch')+'" list="prBranchList" maxlength="120">')+'<button id="msSubmit">'+T('עדכון מחיר','Update price')+'</button></div>'+
      '<div id="msBulk"></div></div>';
  }
  html+='<h3 class="pr-sec">📢 '+T('דיווחים אחרונים','Latest price reports')+'</h3><div id="latestReports">'+(latestRows.length?latestHtml():'<div class="empty" style="padding:14px">'+T('טוען...','Loading...')+'</div>')+'</div>';
  html+='<h3 class="pr-sec">💰 '+T('דיווח מחיר','Report a price')+'</h3><div class="price-report">';
  html+='<input id="prProduct" placeholder="'+T('שם המוצר','Product name')+'" list="prProductList" aria-label="'+T('שם המוצר','Product name')+'" maxlength="60">';
  html+='<datalist id="prProductList">'+Object.keys(P).map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>';
  html+='<input id="prChain" placeholder="'+T('רשת / חנות (או חדשה)','Chain / store (or new)')+'" list="prChainList" aria-label="'+T('רשת','Chain')+'" maxlength="40">';
  html+='<datalist id="prChainList">'+chains.map(c=>'<option value="'+esc(c.name)+'">'+(c.kind==='online'?'🌐':'🏪')+'</option>').join('')+'</datalist>';
  html+='<select id="prKind" aria-label="'+T('סוג','Type')+'" style="display:none"><option value="store">🏪 '+T('חנות פיזית','Physical store')+'</option><option value="online">🌐 '+T('אונליין','Online')+'</option></select>';
  html+='<input id="prBranch" placeholder="'+T('סניף (עיר — רחוב)','Branch (city — street)')+'" list="prBranchList" aria-label="'+T('סניף','Branch')+'" maxlength="120">';
  html+='<datalist id="prBranchList"></datalist>';
  html+='<input id="prPrice" type="number" step="0.01" min="0" placeholder="'+T('מחיר','Price')+' '+esc(CURRENCIES[myCurrency()].split(' ')[0])+'" aria-label="'+T('מחיר','Price')+'">';
  html+='<input id="prBarcode" placeholder="'+T('ברקוד (רשות)','Barcode (optional)')+'" inputmode="numeric" aria-label="'+T('ברקוד','Barcode')+'" maxlength="20">';
  html+='<button id="prScan" title="'+T('סריקת ברקוד','Scan barcode')+'" aria-label="'+T('סריקת ברקוד','Scan barcode')+'">📷</button>';
  html+='<label class="dealchk"><input type="checkbox" id="prDeal"> 🔥 '+T('זה מחיר מבצע','This is a deal price')+'</label><input id="prDealText" maxlength="120" placeholder="'+T('פרטי המבצע (למשל 1+1, 3 ב-10)','Deal details')+'" hidden><input id="prRegular" type="number" step="0.01" min="0" hidden placeholder="'+T('מחיר רגיל (לפני המבצע)','Regular price (before the deal)')+'" aria-label="'+T('מחיר רגיל','Regular price')+'"><input id="prUntil" type="date" hidden aria-label="'+T('בתוקף עד','Valid until')+'">';
  html+='<button id="prSubmit">'+T('דווח מחיר','Report')+'</button></div>';
  html+='<h3 class="pr-sec">🔍 '+T('השוואת מחירים','Compare prices')+'</h3>';
  html+='<input id="priceSearchInput" type="search" placeholder="'+T('חיפוש מוצר או ברקוד...','Search product or barcode...')+'" value="'+esc(priceQuery)+'" aria-label="'+T('חיפוש מחירים','Search prices')+'" autocomplete="off">';
  html+='<div class="srow"><select id="prSort" aria-label="'+T('סידור','Sort')+'"><option value="cheap">'+T('💲 הכי זול קודם','💲 Cheapest first')+'</option><option value="new"'+(priceSort==='new'?' selected':'')+'>'+T('🕘 הכי חדש קודם','🕘 Newest first')+'</option></select></div>';
  html+='<div id="priceResults"></div>';
  html+='<p class="muted-note">📍 '+T('חנויות, סניפים, ניווט ומבצעים — בלשונית "🏪 חנויות"','Stores, branches, Waze and deals — in the "🏪 Stores" tab')+'</p>';
  p.innerHTML=html;
  bindTools18(p);
  loadLatest();
  renderPriceResults();renderBranchList();updateBranchOptions();
  if(myStore)bulkUI(document.querySelector('#msBulk'),{chain:myStore.chain,branch:myStore.branch});
  doodleBg(p);
  if(!Object.keys(repScores).length)loadRepScores().then(()=>{if(priceRows.length)renderPriceResults();});
}
function latestPerStore(rows){const m=new Map();rows.forEach(r=>{const k=r.product+'|'+r.chain+'|'+(r.branch||'');const t=new Date(r.updated_at||r.created_at).getTime();const cur=m.get(k);if(!cur||t>new Date(cur.updated_at||cur.created_at).getTime())m.set(k,r);});return Array.from(m.values());}
function renderPriceResults(){
  const el=document.querySelector('#priceResults');if(!el)return;
  const chainsTxt=allChainNames().slice(0,6).join(', ');
  if(!norm(priceQuery)){el.innerHTML='<div class="empty">'+T('חפשו מוצר כדי להשוות מחירים בין '+esc(chainsTxt)+' ועוד — או דווחו מחיר חדש ✨','Search a product to compare prices — or report a new one ✨')+'</div>';return;}
  if(!sb||!authUser){el.innerHTML='<div class="empty">'+T('השוואת מחירים זמינה רק כשמחוברים לחשבון ☁️','Sign in to compare prices ☁️')+'</div>';return;}
  if(!priceRows.length){el.innerHTML='<div class="empty">'+T('עוד אין דיווחי מחיר על "'+esc(priceQuery)+'" 🤷<br>אפשר להיות הראשונים לדווח!','No prices yet for "'+esc(priceQuery)+'" 🤷')+'</div>';return;}
  const groups={};latestPerStore(priceRows).forEach(r=>{(groups[r.product]=groups[r.product]||[]).push(r);});
  const me=authUser&&authUser.id;
  const tNew=r=>new Date(r.updated_at||r.created_at).getTime();
  /* מסודר לפי סוג מוצר (מוצרי חלב, ירקות...) ובתוך כל סוג לפי שם המוצר */
  const byCat={};Object.entries(groups).forEach(([name,rows])=>{const c=typeof catOfPrice23==='function'?catOfPrice23(name):(CATS.includes(resolveCat(name))?resolveCat(name):'אחר');(byCat[c]=byCat[c]||[]).push([name,rows]);});
  const catOrder=CATS.filter(c=>byCat[c]);
  const renderGroup=([name,rows])=>{
    rows.sort((a,b)=>priceSort==='new'?tNew(b)-tNew(a):(a.currency===b.currency?a.price-b.price:(a.currency===myCurrency()?-1:1)));
    const best=rows.find(r=>r.status==='approved')||rows[0];
    return '<div class="grp"><h3>🏷️ '+esc(name)+' — '+T('הכי זול','cheapest')+': '+fmtPrice(best.price,best.currency)+' '+T('ב','at ')+esc(best.chain)+'</h3>'+rows.map(r=>{
      const online=chainKind(r.chain)==='online';const mine=r.by_id===me;const sc=repScores[r.by_id];
      if(editingPrice===r.id)return '<div class="price-row editing" data-pid="'+esc(r.id)+'"><div class="price-report"><input id="epProduct" value="'+esc(r.product)+'" maxlength="60" aria-label="'+T('מוצר','Product')+'"><input id="epPrice" type="number" step="0.01" min="0" value="'+esc(String(r.price))+'" aria-label="'+T('מחיר','Price')+'"><input id="epBranch" value="'+esc(r.branch||'')+'" maxlength="120" aria-label="'+T('סניף','Branch')+'"><input id="epBarcode" value="'+esc(r.barcode||'')+'" inputmode="numeric" maxlength="20" aria-label="'+T('ברקוד','Barcode')+'"><button data-epsave="'+esc(r.id)+'">💾 '+T('שמירה','Save')+'</button><button class="pr-act" data-epcancel="1">'+T('ביטול','Cancel')+'</button></div></div>';
      return '<div class="price-row'+(r.is_deal?' deal':'')+((r.wrong||0)>(r.confirms||0)?' doubt':'')+'" data-pid="'+esc(r.id)+'"><div class="price-row-main"><span class="pr-chain">'+(online?'🌐 ':'')+esc(r.chain)+'</span><span class="pr-branch">'+esc(r.branch||'')+'</span>'+(r.verified?'<span class="verified" title="'+T('מחיר רשמי מהסופר','Official store price')+'">✔ '+T('רשמי','official')+'</span>':'')+dealBadge(r)+'<span class="pr-amt">'+fmtPrice(r.price,r.currency)+unitTag18(r.product,r.price,r.currency)+'</span></div>'+((r.wrong||0)>(r.confirms||0)?'<div class="doubtnote">⚠️ '+T('משתמשים דיווחו שהמחיר לא נכון','Users reported this price as wrong')+'</div>':'')+
        '<div class="price-row-sub"><span class="pr-ago" title="'+esc(T('דווח: ','Reported: ')+dt(r.created_at)+(r.updated_at?T(' · נערך: ',' · edited: ')+dt(r.updated_at):''))+'">'+(r.status==='pending'?'⏳ '+T('ממתין לאישור','pending')+' · ':'')+crSlot('prices',r.id,{p:T('דווח ע״י ','by ')})+' '+repBadge(sc&&sc.score)+' · '+agoText(r.created_at)+(r.updated_at?' · ✏️ '+T('נערך','edited')+' '+agoText(r.updated_at):'')+(r.barcode?' · '+esc(r.barcode):'')+'</span>'+
        (mine?'<button class="pr-act" data-epedit="'+esc(r.id)+'" title="'+T('עריכה','Edit')+'">✏️</button><button class="pr-act" data-epdel="'+esc(r.id)+'" title="'+T('מחיקה','Delete')+'">🗑️</button>':voteBtns(r))+
        '<button class="pr-act" data-share="'+esc(JSON.stringify([name,r.chain,r.branch||'',fmtPrice(r.price,r.currency)]))+'" title="'+T('שיתוף','Share')+'">📤</button>'+
        (online?'':'<a class="pr-act" href="'+esc(wazeUrl(r.chain+' '+(r.branch||'')))+'" target="_blank" rel="noopener" title="Waze">🧭</a>')+
        '</div><div class="pr-times">'+T('דווח','Reported')+' '+dt(r.created_at)+(r.updated_at?' · '+T('נערך','Edited')+' '+dt(r.updated_at):'')+'</div></div>';}).join('')+(typeof histBox23==='function'?histBox23(name):'')+'</div>';
  };
  el.innerHTML=catOrder.map(c=>'<details class="catsec" open><summary class="cathead">'+CATE[c]+' '+esc(c)+' <small>('+byCat[c].length+')</small></summary><button class="pr-act shcat18" data-shcat="'+esc(c)+'" title="'+T('לשתף את הקטגוריה','Share category')+'" aria-label="'+T('לשתף את הקטגוריה','Share category')+' '+esc(c)+'">📤</button>'+byCat[c].sort((x,y)=>priceSort==='new'?Math.max(...y[1].map(tNew))-Math.max(...x[1].map(tNew)):x[0].localeCompare(y[0],'he')).map(renderGroup).join('')+'</details>').join('');
}
function renderBranchList(){
  const el=document.querySelector('#branchList');if(!el)return;
  const q=norm(brCity);
  const list=allBranches().filter(b=>(!brChain||b.chain===brChain)&&(!storeType||chainCategory(b.chain)===storeType)&&(!q||norm(b.city+' '+b.address+' '+b.name).includes(q)));
  if(!list.length){el.innerHTML='<div class="empty">'+T('לא נמצאו סניפים 🤷 אפשר להוסיף חנות או סניף ב"🏪 החנויות"','No branches found 🤷 Add one with ➕')+'</div>';return;}
  const shown=list.slice(0,brChain||q?200:40);
  el.innerHTML='<div class="grp">'+shown.map(b=>'<div class="branch"><span>'+chainAv(b.chain)+'</span><span class="bra"><b>'+esc(b.chain)+'</b> · '+esc(b.city)+(b.status==='pending'?' <span class="pill-p">⏳ '+T('ממתין לאישור','pending')+'</span>':'')+'<small>'+esc(b.address||'')+(b.name?' · '+esc(b.name):'')+'</small></span><a class="waze" href="'+esc(wazeUrl(branchQuery(b)))+'" target="_blank" rel="noopener" aria-label="Waze '+esc(branchLabel(b))+'">🧭 '+T('וויז','Waze')+'</a></div>').join('')+(list.length>shown.length?'<div class="empty">'+T('ועוד '+(list.length-shown.length)+' — בחרו רשת או עיר כדי לצמצם','and '+(list.length-shown.length)+' more — filter by chain or city')+'</div>':'')+'</div>';
}
function updateBranchOptions(){
  const chain=(document.querySelector('#prChain')||{}).value||'';
  const dl=document.querySelector('#prBranchList');if(!dl)return;
  const known=allChainNames().includes(chain.trim());
  const kindSel=document.querySelector('#prKind');if(kindSel)kindSel.style.display=chain.trim()&&!known?'block':'none';
  const online=known?chainKind(chain.trim())==='online':(kindSel&&kindSel.value==='online');
  const br=document.querySelector('#prBranch');if(br){br.placeholder=online?T('אונליין (לא חובה)','Online (optional)'):T('סניף (עיר — רחוב)','Branch (city — street)');}
  const want=(myStore&&!document.activeElement?.id?.startsWith('pr'))?myStore.chain:chain.trim();
  dl.innerHTML=allBranches().filter(b=>!want||b.chain===want).map(b=>'<option value="'+esc(b.city+(b.address?' — '+b.address:''))+'">').join('');
}
/* הוספת רשת/סניף — ממשתמש רגיל עובר לאישור מנהל (נאכף בשרת) */
async function addStoreOrBranch(chain,kind,city,address,name,category){
  chain=(chain||'').trim().slice(0,40);city=(city||'').trim().slice(0,40);address=(address||'').trim().slice(0,120);name=(name||'').trim().slice(0,60);
  if(!chain){flash(T('⚠️ צריך שם רשת/חנות','⚠️ Store name needed'));return false;}
  if([chain,city,address,name].some(hasProfanity)){flash('🙏');return false;}
  let pending=false;
  if(!allChainNames().includes(chain)){
    const cat=kind==='online'?'online':(STORE_TYPES[category]?category:'supermarket');
    const {error}=await sb.from('chains').insert({name:chain,kind:kind==='online'?'online':'store',category:cat,created_by:authUser.id});
    if(error&&!/duplicate/i.test(error.message)){flash('⚠️ '+error.message);return false;}
    chainsCache.push({name:chain,kind,category:kind==='online'?'online':(STORE_TYPES[category]?category:'supermarket'),status:isStaff()?'approved':'pending'});pending=!isStaff();
  }
  if(city&&kind!=='online'){
    const {error}=await sb.from('branches').insert({chain,city,address,name,created_by:authUser.id});
    if(error&&!/duplicate/i.test(error.message)){flash('⚠️ '+error.message);return false;}
    branchesCache.push({chain,city,address,name,status:isStaff()?'approved':'pending'});pending=pending||!isStaff();
  }
  flash(pending?T('📨 נשלח לאישור המנהל — תודה!','📨 Sent for approval — thanks!'):T('✔ נוסף','✔ Added'));
  return true;
}
async function insertPrice(row){
  const rec={product:row.product.slice(0,60),product_key:norm(row.product),chain:row.chain,branch:(row.branch||'').slice(0,120),price:Math.round(row.price*100)/100,currency:row.currency||myCurrency(),barcode:row.barcode||null,by_id:authUser.id,by_name:(state.user&&state.user.name)||''};
  if(row.is_deal){rec.is_deal=true;rec.deal_text=String(row.deal_text||'').slice(0,120);if(row.valid_until)rec.valid_until=row.valid_until;
    const rg=Number(row.regular_price);if(rg>rec.price&&rg<100000)rec.regular_price=Math.round(rg*100)/100;}
  let {error}=await sb.from('prices').insert(rec);
  /* עד שמריצים את קוד ה-SQL החדש אין עמודת "מחיר רגיל" — שומרים בלעדיה */
  if(error&&rec.regular_price&&/regular_price/.test(error.message||'')){delete rec.regular_price;({error}=await sb.from('prices').insert(rec));}
  latestAt=0;return error;
}
/* דיווחים אחרונים — מופיעים מיד בלשונית המחירים, בלי לחפש */
let latestRows=[],latestAt=0;
async function loadLatest(){
  if(!sb||!authUser){const el=document.querySelector('#latestReports');if(el)el.innerHTML='<div class="empty" style="padding:14px">'+T('מתחברים לחשבון כדי לראות דיווחים 🙂','Sign in to see reports 🙂')+'</div>';return;}
  if(Date.now()-latestAt>60000){
    const run=cols=>sb.from('prices').select(cols).eq('status','approved').order('created_at',{ascending:false}).limit(40);
    try{let {data,error}=await run(PRICE_COLS+',wrong,is_deal,deal_text,valid_until,regular_price');if(error)({data,error}=await run(PRICE_COLS+',wrong,is_deal,deal_text,valid_until'));if(error)({data}=await run(PRICE_COLS));latestRows=data||[];latestAt=Date.now();await loadMyVotes(latestRows);}catch(e){}
  }
  const el=document.querySelector('#latestReports');if(el)el.innerHTML=latestHtml();
}
function latestHtml(){
  if(!latestRows.length)return '<div class="empty" style="padding:14px">'+T('עוד אין דיווחים — '+(state.gender==='m'?'היה':'היי')+' הראשון/ה לדווח 💪','No reports yet — be the first 💪')+'</div>';
  const deals=latestRows.filter(r=>dealActive(r)),rest=latestRows.filter(r=>!dealActive(r));
  return '<div class="grp latest">'+deals.concat(rest).map(r=>{const online=chainKind(r.chain)==='online';const mine=authUser&&r.by_id===authUser.id;
    return '<div class="price-row'+(dealActive(r)?' deal':'')+((r.wrong||0)>(r.confirms||0)?' doubt':'')+'" data-pid="'+esc(r.id)+'"><div class="price-row-main"><span>'+emojiOf(r.product)+'</span><b class="pr-prod" title="'+esc(r.product)+'" role="button" tabindex="0" aria-expanded="false">'+esc(r.product)+'</b><span class="pr-chain">'+(online?'🌐 ':'')+esc(r.chain)+'</span>'+(r.verified?'<span class="verified">✔ '+T('רשמי','official')+'</span>':'')+dealBadge(r)+'<span class="pr-amt">'+fmtPrice(r.price,r.currency)+unitTag18(r.product,r.price,r.currency)+'</span></div>'+
      ((r.wrong||0)>(r.confirms||0)?'<div class="doubtnote">⚠️ '+T('משתמשים דיווחו שהמחיר לא נכון','Users reported this price as wrong')+'</div>':'')+
      '<div class="price-row-sub"><span class="pr-ago">'+esc(r.branch||'')+(r.branch?' · ':'')+crSlot('prices',r.id,{p:T('דווח ע״י ','by '),s:' · '})+agoText(r.created_at)+'</span>'+(mine?'<span class="muted-note" style="margin:0">'+T('הדיווח שלך','your report')+'</span>':voteBtns(r))+'<button class="pr-act" data-hist23="'+esc(r.product)+'" title="'+T('כל המחירים הקודמים של המוצר','All previous prices of this product')+'">📜</button><button class="pr-act" data-share="'+esc(JSON.stringify([r.product,r.chain,r.branch||'',fmtPrice(r.price,r.currency)]))+'" title="'+T('שיתוף','Share')+'">📤</button></div></div>';}).join('')+'</div>';
}
async function submitPriceReport(){
  const product=document.querySelector('#prProduct').value.trim(),chain=document.querySelector('#prChain').value.trim();
  let branch=document.querySelector('#prBranch').value.trim();const price=parseFloat(document.querySelector('#prPrice').value);const barcode=document.querySelector('#prBarcode').value.trim();
  if(!sb||!authUser){flash(T('⚠️ צריך להיות מחוברים לחשבון כדי לדווח','⚠️ Sign in to report'));return;}
  const isNew=!allChainNames().includes(chain);const kind=isNew?document.querySelector('#prKind').value:chainKind(chain);
  if(kind==='online'&&!branch)branch=T('אונליין','Online');
  if(!product||!chain||!branch||isNaN(price)||price<=0||price>=100000){flash(T('⚠️ צריך למלא מוצר, רשת, סניף ומחיר תקין','⚠️ Fill product, chain, branch and a valid price'));return;}
  const isDeal=!!(document.querySelector('#prDeal')||{}).checked,dealText=((document.querySelector('#prDealText')||{}).value||'').trim(),until=(document.querySelector('#prUntil')||{}).value||'';
  if(isDeal&&hasProfanity(dealText)){flash('🙏');return;}
  if(barcode&&!/^\d{4,20}$/.test(barcode)){flash(T('⚠️ ברקוד — ספרות בלבד','⚠️ Barcode: digits only'));return;}
  if([product,chain,branch].some(hasProfanity)){flash('🙏');return;}
  const btn=document.querySelector('#prSubmit');btn.disabled=true;
  try{
    if(isNew||(kind==='store'&&!allBranches().some(b=>b.chain===chain&&(b.city+(b.address?' — '+b.address:''))===branch))){
      const parts=branch.split(/\s+[—-]\s+/);await addStoreOrBranch(chain,kind,kind==='store'?parts[0]:'',parts.slice(1).join(' '),'');
    }
    const regular=parseFloat((document.querySelector('#prRegular')||{}).value||'');
    if(isDeal&&regular>0&&regular<=price){flash(T('⚠️ המחיר הרגיל צריך להיות גבוה ממחיר המבצע','⚠️ Regular price must be above the deal price'));return;}
    const error=await insertPrice({product,chain,branch,price,barcode,is_deal:isDeal,deal_text:dealText,valid_until:until||null,regular_price:isDeal&&regular>0?regular:null});
    if(error){flash(T('⚠️ הדיווח לא נשמר: ','⚠️ Not saved: ')+error.message);return;}
    loadLatest();
    flash(T('💰 תודה! המחיר דווח','💰 Thanks! Price reported'));
    ['#prProduct','#prBranch','#prPrice','#prBarcode','#prRegular'].forEach(s=>{const el=document.querySelector(s);if(el)el.value='';});
    priceQuery=product;const si=document.querySelector('#priceSearchInput');if(si)si.value=product;
    priceRows=await fetchPrices(product);renderPriceResults();renderBranchList();
  }finally{btn.disabled=false;}
}
async function submitMyStorePrice(){
  const product=document.querySelector('#msProduct').value.trim(),price=parseFloat(document.querySelector('#msPrice').value),barcode=document.querySelector('#msBarcode').value.trim();
  const branch=myStore.branch||(document.querySelector('#msBranch')||{}).value||'';
  if(!product||isNaN(price)||price<=0){flash(T('⚠️ מוצר ומחיר','⚠️ Product and price'));return;}
  if(barcode&&!/^\d{4,20}$/.test(barcode)){flash(T('⚠️ ברקוד — ספרות בלבד','⚠️ Barcode: digits only'));return;}
  const error=await insertPrice({product,chain:myStore.chain,branch:branch.trim(),price,barcode});
  if(error){flash('⚠️ '+error.message);return;}
  flash(myStore.auto_approve?T('✔ המחיר עודכן באתר','✔ Price published'):T('📨 המחיר נשלח לאישור המנהל','📨 Sent for approval'));
  ['#msProduct','#msPrice','#msBarcode'].forEach(x=>document.querySelector(x).value='');
  priceQuery=product;const si=document.querySelector('#priceSearchInput');if(si)si.value=product;priceRows=await fetchPrices(product);renderPriceResults();
}

/* ================= העלאת קובץ מחירים (CSV / Excel / קבצי שקיפות מחירים XML) ================= */
// גרסה חדשה לספרייה מ-cdn.jsdelivr.net? לעדכן גם את script-src ב-CSP (כאן למעלה, ב-vercel.json וב-_headers) — שם מותרות רק הגרסאות האלה
const XLSX_SRC='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',XLSX_SRI='sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw';
function loadXlsx(){return window.XLSX?Promise.resolve(window.XLSX):new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=XLSX_SRC;sc.integrity=XLSX_SRI;sc.crossOrigin='anonymous';sc.onload=()=>res(window.XLSX);sc.onerror=()=>rej(new Error('xlsx'));document.head.appendChild(sc);});}
const COLS={product:['מוצר','שם מוצר','שם המוצר','שם','תיאור','product','name','item','itemname','description','productname'],price:['מחיר','מחיר ליחידה','price','itemprice','unitprice','cost'],barcode:['ברקוד','קוד','מקט','מק"ט','barcode','itemcode','code','ean','sku'],chain:['רשת','חנות','chain','store','shop'],branch:['סניף','branch','storename','location'],deal:['מבצע','מבצעים','הנחה','deal','sale','promo','promotion'],until:['בתוקף עד','עד','תוקף','עד תאריך','valid until','validuntil','until','enddate','end']};
function mapHeader(h){const k=String(h||'').trim().toLowerCase().replace(/[\s_\-]/g,'');for(const f in COLS)if(COLS[f].some(c=>c.replace(/[\s_\-]/g,'')===k))return f;return null;}
/* עמודת "מבצע": כן/1/✓ או תיאור (1+1) — ועמודת "בתוקף עד" (31/12/2026 או 2026-12-31) */
function dealFields(r,weekEnd){
  const o={};const d=String(r.deal||'').trim();
  if(d&&!/^(לא|no|0|false|-)$/i.test(d)){o.is_deal=true;o.deal_text=/^(כן|yes|1|true|v|✓|✔|x)$/i.test(d)?'':d.slice(0,120);}
  const u=String(r.until||'').trim();let iso='';
  let m=u.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)iso=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
  m=u.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})$/);if(m)iso=(m[3].length===2?'20'+m[3]:m[3])+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  if(iso)o.valid_until=iso;else if(weekEnd)o.valid_until=weekEnd;
  return o;
}
function rowsFromTable(table){
  if(!table.length)return [];
  let hi=table.findIndex(r=>r.some(c=>mapHeader(c)==='product')&&r.some(c=>mapHeader(c)==='price'));
  let map;
  if(hi<0){hi=-1;map={0:'product',1:'price',2:'barcode'};}else{map={};table[hi].forEach((c,i)=>{const f=mapHeader(c);if(f&&!Object.values(map).includes(f))map[i]=f;});}
  return table.slice(hi+1).map(r=>{const o={};Object.entries(map).forEach(([i,f])=>o[f]=String(r[i]==null?'':r[i]).trim());o.price=parseFloat(String(o.price||'').replace(/[^\d.]/g,''));o.barcode=(o.barcode||'').replace(/\D/g,'');return o;}).filter(o=>o.product&&o.price>0&&o.price<100000);
}
function parseCsv(text){
  const first=text.split(/\r?\n/)[0]||'';const d=[',',';','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const out=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=c;}
    else if(c==='"')q=true;else if(c===d){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));out.push(row);row=[];cell='';}else cell+=c;}
  if(cell||row.length){row.push(cell);out.push(row);}
  return out;
}
function parsePriceXml(text){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  const items=Array.from(doc.getElementsByTagName('Item')).concat(Array.from(doc.getElementsByTagName('Product')));
  const g=(el,names)=>{for(const n of names){const x=el.getElementsByTagName(n)[0];if(x&&x.textContent.trim())return x.textContent.trim();}return '';};
  return items.map(it=>({product:g(it,['ItemName','ManufacturerItemDescription','ItemNm','ProductName']),price:parseFloat(g(it,['ItemPrice','Price','UnitOfMeasurePrice'])),barcode:g(it,['ItemCode','Barcode','ItemCd']).replace(/\D/g,'')})).filter(o=>o.product&&o.price>0&&o.price<100000);
}
async function parsePriceFile(file){
  const name=file.name.toLowerCase();
  if(/\.(xlsx|xls|ods)$/.test(name)){const X=await loadXlsx();const wb=X.read(await file.arrayBuffer(),{type:'array'});const sh=wb.Sheets[wb.SheetNames[0]];return rowsFromTable(X.utils.sheet_to_json(sh,{header:1,raw:false}));}
  let buf=await file.arrayBuffer();
  if(/\.gz$/.test(name)){if(!('DecompressionStream' in window))throw new Error(T('הדפדפן לא יודע לפתוח קובץ gz — פתחו אותו קודם','This browser cannot open .gz files'));buf=await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
  let text=new TextDecoder('utf-8').decode(buf);
  if(text.includes('�'))try{text=new TextDecoder('windows-1255').decode(buf);}catch(e){}
  if(/^\s*</.test(text))return parsePriceXml(text);
  return rowsFromTable(parseCsv(text.replace(/^﻿/,'')));
}
/* ממשק העלאה — משמש גם את בעל הסופר וגם את הבק אופיס */
function bulkUI(box,fixed){
  if(!box)return;fixed=fixed||{};let rows=[];
  box.innerHTML='<div class="bulk"><b>📄 '+T('העלאת קובץ מחירים','Upload a price file')+'</b><p class="muted-note">'+T('CSV או Excel עם עמודות: מוצר, מחיר, ברקוד'+(fixed.chain?'':', רשת, סניף')+'. אפשר גם קבצי "שקיפות מחירים" של הרשתות (XML או XML.GZ).','CSV or Excel with columns: product, price, barcode'+(fixed.chain?'':', chain, branch')+'. Chain price-transparency XML files work too.')+'</p>'+
    '<input type="file" class="bkFile" accept=".csv,.txt,.xlsx,.xls,.ods,.xml,.gz">'+
    (fixed.chain?'':'<div class="price-report" style="margin-top:6px"><input class="bkChain" list="prChainList" placeholder="'+T('רשת (אם אין בקובץ)','Chain (if not in file)')+'"><input class="bkBranch" list="prBranchList" placeholder="'+T('סניף (אם אין בקובץ)','Branch (if not in file)')+'"></div>')+
    (fixed.chain&&!fixed.branch?'<div class="price-report" style="margin-top:6px"><input class="bkBranch" list="prBranchList" placeholder="'+T('סניף','Branch')+'"></div>':'')+
    '<label class="dealchk"><input type="checkbox" class="bkWeek"> 📅 '+T('מחירי השבוע — בתוקף עד מוצאי שבת','This week\'s prices — valid until Saturday night')+'</label>'+
    '<p class="muted-note">🔥 '+T('מבצעים: עמודה בשם "מבצע" (כן / תיאור כמו 1+1) ועמודה "בתוקף עד" — ומחירי המבצע יוצגו בולט באתר.','Deals: add a "deal" column (yes / text) and "valid until".')+'</p>'+
    '<div class="bkPreview"></div><button class="bkGo" hidden>⬆️ '+T('העלאה','Upload')+'</button><div class="bkStatus muted-note"></div></div>';
  const $b=q=>box.querySelector(q);
  $b('.bkFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;$b('.bkStatus').textContent=T('קורא את הקובץ...','Reading...');
    try{rows=await parsePriceFile(f);}catch(err){rows=[];$b('.bkStatus').textContent='⚠️ '+(err.message==='xlsx'?T('לא הצלחתי לטעון את קורא האקסל — שמרו כ-CSV ונסו שוב','Excel reader failed — save as CSV'):err.message);return;}
    if(!rows.length){$b('.bkStatus').textContent=T('⚠️ לא נמצאו שורות עם מוצר ומחיר. בדקו שיש כותרות "מוצר" ו"מחיר".','⚠️ No rows with product and price found.');$b('.bkGo').hidden=true;return;}
    $b('.bkPreview').innerHTML='<div class="tw"><table class="utable"><tr><th>'+T('מוצר','Product')+'</th><th>'+T('מחיר','Price')+'</th><th>'+T('ברקוד','Barcode')+'</th>'+(fixed.chain?'':'<th>'+T('רשת','Chain')+'</th><th>'+T('סניף','Branch')+'</th>')+'</tr>'+rows.slice(0,8).map(r=>'<tr><td>'+esc(r.product)+'</td><td>'+esc(r.price)+'</td><td>'+esc(r.barcode||'')+'</td>'+(fixed.chain?'':'<td>'+esc(r.chain||'')+'</td><td>'+esc(r.branch||'')+'</td>')+'</tr>').join('')+'</table></div>';
    $b('.bkStatus').textContent=T('נמצאו '+rows.length+' מחירים. בדקו את התצוגה ולחצו "העלאה".','Found '+rows.length+' prices.');$b('.bkGo').hidden=false;};
  $b('.bkGo').onclick=async()=>{
    const defChain=fixed.chain||($b('.bkChain')?$b('.bkChain').value.trim():''),defBranch=fixed.branch||($b('.bkBranch')?$b('.bkBranch').value.trim():'');
    const cur=myCurrency();
    const weekEnd=(()=>{const d=new Date();d.setDate(d.getDate()+((6-d.getDay()+7)%7));return d.toISOString().slice(0,10);})();
    const useWeek=$b('.bkWeek')&&$b('.bkWeek').checked;
    const out=rows.map(r=>Object.assign(dealFields(r,useWeek?weekEnd:null),{product:r.product.slice(0,60),product_key:norm(r.product),chain:(fixed.chain||r.chain||defChain).slice(0,40),branch:((fixed.branch||r.branch||defBranch)||'').slice(0,120),price:Math.round(r.price*100)/100,currency:cur,barcode:(r.barcode&&/^\d{4,20}$/.test(r.barcode))?r.barcode:null,by_id:authUser.id,by_name:(state.user&&state.user.name)||''}));
    if(out.some(r=>!r.chain)){flash(T('⚠️ חסרה רשת — מלאו "רשת" או הוסיפו עמודה בקובץ','⚠️ Missing chain'));return;}
    $b('.bkGo').disabled=true;let done=0,failed=0;
    for(let i=0;i<out.length;i+=400){const chunk=out.slice(i,i+400);const {error}=await sb.from('prices').insert(chunk);if(error){failed+=chunk.length;$b('.bkStatus').textContent='⚠️ '+error.message;}else done+=chunk.length;$b('.bkStatus').textContent=T('הועלו ','Uploaded ')+done+' / '+out.length;}
    $b('.bkGo').disabled=false;$b('.bkGo').hidden=true;
    flash(failed?T('⚠️ חלק מהשורות לא עלו','⚠️ Some rows failed'):T('✔ הועלו '+done+' מחירים','✔ Uploaded '+done+' prices'));
    $b('.bkStatus').textContent=T('✔ הועלו '+done+' מחירים','✔ Uploaded '+done)+(failed?' · ⚠️ '+failed:'')+(myStore&&!myStore.auto_approve&&fixed.chain?T(' — ממתינים לאישור המנהל',' — pending approval'):'');
  };
}
async function sharePriceReport(name,chain,branch,price){
  const text=name+' — ₪'+price+' ב'+chain+(branch?' ('+branch+')':'')+' · מדווח דרך רשימת קניות 🛒';
  try{if(navigator.share){await navigator.share({title:name,text});return;}}catch(e){}
  try{await navigator.clipboard.writeText(text);flash('📋 הועתק — אפשר להדביק ולשלוח');}catch(e){(await uiPrompt('העתיקו מכאן:',text));}
}
async function openBarcodeScanner(){
  const ov=document.querySelector('#scanOverlay');ov.classList.add('open');
  const hint=document.querySelector('#scanHint');
  if(!('BarcodeDetector' in window)){hint.textContent='הדפדפן הזה לא תומך בסריקה אוטומטית — אפשר פשוט להקליד את הברקוד 🙂';return;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});barcodeStream=stream;
    const video=document.querySelector('#scanVideo');video.srcObject=stream;await video.play();
    const detector=new window.BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});
    const tick=async()=>{if(!ov.classList.contains('open'))return;
      try{const codes=await detector.detect(video);if(codes&&codes.length){document.querySelector('#prBarcode').value=codes[0].rawValue;closeBarcodeScanner();flash('📷 ברקוד נסרק: '+codes[0].rawValue);return;}}catch(e){}
      barcodeScanTimer=setTimeout(tick,350);};
    tick();
  }catch(e){hint.textContent='לא הצלחתי לפתוח את המצלמה — בדקו הרשאות מצלמה 🙁';}
}
function closeBarcodeScanner(){document.querySelector('#scanOverlay').classList.remove('open');clearTimeout(barcodeScanTimer);if(barcodeStream){barcodeStream.getTracks().forEach(t=>t.stop());barcodeStream=null;}}
const pricesPane=document.querySelector('#panePrices');
pricesPane.addEventListener('click',async e=>{
  if(e.target.id==='prScan'){openBarcodeScanner();return;}
  if(e.target.id==='prSubmit'){submitPriceReport();return;}
  if(e.target.id==='msSubmit'){submitMyStorePrice();return;}
  const ed=e.target.closest('[data-epedit]');if(ed){editingPrice=ed.dataset.epedit;renderPriceResults();return;}
  if(e.target.closest('[data-epcancel]')){editingPrice=null;renderPriceResults();return;}
  const sv=e.target.closest('[data-epsave]');
  if(sv){const price=parseFloat(document.querySelector('#epPrice').value),product=document.querySelector('#epProduct').value.trim(),barcode=document.querySelector('#epBarcode').value.trim();
    if(!product||isNaN(price)||price<=0){flash('⚠️');return;}if(barcode&&!/^\d{4,20}$/.test(barcode)){flash(T('⚠️ ברקוד — ספרות בלבד','⚠️ digits only'));return;}
    const {error}=await sb.from('prices').update({product:product.slice(0,60),product_key:norm(product),price:Math.round(price*100)/100,branch:document.querySelector('#epBranch').value.trim().slice(0,120),barcode:barcode||null}).eq('id',sv.dataset.epsave);
    if(error){flash('⚠️ '+error.message);return;}editingPrice=null;flash(T('💾 נשמר — מופיע מתי נערך','💾 Saved'));priceRows=await fetchPrices(priceQuery);renderPriceResults();return;}
  const dl=e.target.closest('[data-epdel]');
  if(dl){if(!(await uiConfirm(T('למחוק את הדיווח?','Delete this report?'))))return;const {error}=await sb.from('prices').delete().eq('id',dl.dataset.epdel);if(error){flash('⚠️ '+error.message);return;}priceRows=priceRows.filter(r=>r.id!==dl.dataset.epdel);renderPriceResults();flash('🗑️');return;}
  const vb=e.target.closest('[data-vote]');
  if(vb){if(!sb||!authUser)return;const [id,v]=vb.dataset.vote.split('|');vb.disabled=true;
    const {data,error}=await sb.rpc('vote_price',{p_id:id,p_vote:+v});vb.disabled=false;
    if(error||!data){flash(T('⚠️ לא הצלחתי לשמור — נסו שוב','⚠️ Could not save'));return;}
    if(data.own){flash(T('זה הדיווח שלך 🙂 אפשר לערוך אותו ב-✏️','This is your report 🙂'));return;}
    myVotes[id]=data.mine;[priceRows,latestRows].forEach(arr=>arr.forEach(r=>{if(r.id===id){r.confirms=data.ok;r.wrong=data.wrong;}}));
    document.querySelectorAll('[data-vote^="'+id+'|"]').forEach(b=>{const isOk=b.dataset.vote.endsWith('|1');b.classList.toggle('on',(isOk?1:-1)===data.mine);b.querySelector('b').textContent=isOk?data.ok:data.wrong;});
    flash(+v>0?T('✅ תודה! הדירוג של המדווח עלה','✅ Thanks!'):T('❌ תודה — נבדוק את המחיר','❌ Thanks — we will check it'));return;}
  const c=e.target.closest('[data-confirm]');
  if(c){if(!sb||!authUser)return;const {data,error}=await sb.rpc('confirm_price',{p_id:c.dataset.confirm});if(!error){flash(T('✅ תודה! הדירוג של המדווח עלה','✅ Thanks! Reporter rating went up'));c.textContent='✅ '+(data||'');c.disabled=true;}return;}
  const sh=e.target.closest('[data-share]');if(sh){try{const [n,ch,br,pr]=JSON.parse(sh.dataset.share);sharePriceReport(n,ch,br,pr);}catch(err){}return;}
});
/* חשוב: בזמן הקלדה מעדכנים רק את התוצאות — לא את שדה החיפוש עצמו (כך הרווח והאותיות לא "זורקים" החוצה) */
pricesPane.addEventListener('change',e=>{if(e.target.id==='prDeal'){['#prDealText','#prRegular','#prUntil'].forEach(x=>{const el=document.querySelector(x);if(el)el.hidden=!e.target.checked;});}});
pricesPane.addEventListener('input',e=>{
  if(e.target.id==='priceSearchInput'){priceQuery=e.target.value;clearTimeout(priceTimer);
    priceTimer=setTimeout(async()=>{const q=priceQuery;const rows=await fetchPrices(q);if(q===priceQuery){priceRows=rows;renderPriceResults();}},300);
    if(!norm(priceQuery)){priceRows=[];renderPriceResults();}}
  if(e.target.id==='prChain')updateBranchOptions();
});
pricesPane.addEventListener('change',e=>{if(e.target.id==='prSort'){priceSort=e.target.value;renderPriceResults();}if(e.target.id==='prKind')updateBranchOptions();});
pricesPane.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  if(e.target.id==='prPrice'){e.preventDefault();submitPriceReport();}
  if(e.target.id==='msPrice'){e.preventDefault();submitMyStorePrice();}
  if(e.target.id==='priceSearchInput')e.preventDefault();
});
document.querySelector('#btnCloseScan').onclick=closeBarcodeScanner;
document.querySelector('#scanOverlay').addEventListener('click',e=>{if(e.target.id==='scanOverlay')closeBarcodeScanner();});

/* ================= שיתוף בג׳ימייל — פותח את האפליקציה בטלפון ================= */
function openGmail(subject,body){
  const web='https://mail.google.com/mail/?view=cm&fs=1&su='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  const ua=navigator.userAgent||'';
  if(/Android/i.test(ua)){
    location.href='intent://co?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)+'#Intent;scheme=googlegmail;package=com.google.android.gm;S.browser_fallback_url='+encodeURIComponent(web)+';end';
    return;
  }
  if(/iPhone|iPad|iPod/i.test(ua)){
    const t=setTimeout(()=>{if(document.visibilityState==='visible')location.href=web;},1400);
    document.addEventListener('visibilitychange',function h(){if(document.visibilityState==='hidden'){clearTimeout(t);document.removeEventListener('visibilitychange',h);}});
    location.href='googlegmail://co?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    return;
  }
  window.open(web,'_blank','noopener');
}
document.querySelector('#shGmail').onclick=()=>openGmail('רשימת קניות — '+curList().name,shareText());


/* שגיאת AI קצרה וברורה למנהל (בלי JSON ארוך) */
function aiErrShort(d){d=String(d||'');
  if(/429|RESOURCE_EXHAUSTED|quota/i.test(d))return 'למנהל: נגמרה המכסה היומית של Gemini (429). היא מתאפסת מחר. אפשר להוסיף מפתח נוסף בשם GEMINI_API_KEY_2 בהגדרות הפונקציות ב-Supabase.';
  if(/401|403|API key|PERMISSION_DENIED/i.test(d))return 'למנהל: מפתח Gemini לא תקין או חסום. כדאי לבדוק את GEMINI_API_KEY בהגדרות הפונקציות ב-Supabase.';
  if(/timeout|timed out|abort/i.test(d))return 'למנהל: Gemini לא ענה בזמן. כדאי לנסות שוב בעוד דקה.';
  return 'למנהל: '+d.replace(/\s+/g,' ').slice(0,140)+(d.length>140?'…':'');}
/* ================= פרסומות — פופאפ ובאנר, אפשר לסגור אחרי כמה שניות ================= */
let adsCache=[],adTimer=null,adShownThisLoad=false,adsAudience='all',adHouse=true,adSideTimer=null,adSideIdx=0,adSidePop=0; /* מי רואה פרסומות: all · admins (רק מנהלים, לבדיקה) · none */
const AD_KEY='yamh_ads_seen';
function adSeenMap(){try{return JSON.parse(localStorage.getItem(AD_KEY)||'{}');}catch(e){return {};}}
/* כמה פעמים פופאפ ובאנר מוצגים (המנהל בוחר): day — פעם ביום · session — בכל כניסה לאתר (לשונית חדשה) · load — בכל ריענון */
let adFreq='day';const adLoadSeen=new Set();
/* לכל פרסומת אפשר לבחור תדירות משלה; בלי בחירה — לפי ההגדרה הכללית */
const AD_FREQS=['day','session','load'];
/* לכל פרסומת: באיזה דף להציג ('' = בכל הדפים) ולמי ('' = לפי ההגדרה הכללית · all · admins) */
const AD_PAGES={list:'📝 רשימה',hist:'🕘 היסטוריה',home:'🏠 הבית שלי',prices:'💰 מחירים',stores:'🏪 חנויות'};
/* הפרסומת הקבועה בצד מוצגת רק בדף הראשי (📝 רשימה). באנר ופופאפ — לפי הדף שנבחר להם בבק אופיס */
const AD_MAIN='list';
const adOnPage=a=>!AD_PAGES[a.page]||a.page===tab;
const adForMe=a=>((a.audience==='all'||a.audience==='admins')?a.audience:adsAudience)!=='admins'||isAdmin();
function adFreqOf(id){const a=adsCache.find(x=>x.id===id);return a&&AD_FREQS.includes(a.freq)?a.freq:adFreq;}
function markAdSeen(id,kind){const k=kind+':'+id;adLoadSeen.add(k);const adFreq=adFreqOf(id);
  if(adFreq==='session'){try{sessionStorage.setItem('yamh_ad_'+k,'1');}catch(e){}return;}
  if(adFreq==='day'){try{const m=adSeenMap();m[k]=dayKey(new Date());localStorage.setItem(AD_KEY,JSON.stringify(m));}catch(e){}}}
function adSeenToday(id,kind){const k=kind+':'+id;const adFreq=adFreqOf(id);if(adLoadSeen.has(k)&&adFreq!=='load')return true;
  if(adFreq==='load')return adLoadSeen.has(k);
  if(adFreq==='session'){try{return sessionStorage.getItem('yamh_ad_'+k)==='1';}catch(e){return false;}}
  return adSeenMap()[k]===dayKey(new Date());}
/* תמונה: רק data:image (png/jpeg/webp/gif ב-base64 נקי) או https בלי גרשיים/רווחים/<> · קישור: רק http(s) */
const safeImg=u=>{u=typeof u==='string'?u.trim():'';return /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/i.test(u)||/^https:\/\/[^\s"'<>()\\`]+$/i.test(u)?u:'';};
/* וידאו: רק מהדליים שלנו ב-Supabase Storage (זה גם מה שה-CSP מתיר).
   סרטונים חדשים עולים לדלי clips: חוסמי פרסומות (למשל בכרום) חוסמים כל כתובת שיש בה ad-videos, ואז הסרטון לא מתנגן */
const VID_BUCKET='clips';
/* באתר עצמו הסרטון נטען דרך הכתובת של האתר (/m/c/…, השרת מעביר ל-Supabase): חוסמי פרסומות חוסמים וידאו מאתרים חיצוניים, לא מהאתר עצמו */
const vidSrc=u=>{const m=/\/public\/(ad-videos|clips)\/([A-Za-z0-9._-]+)$/.exec(safeVideo(u));return m?'/m/'+(m[1]==='clips'?'c':'a')+'/'+m[2]:'';};
const ourVid=u=>!!safeVideo(u)||/^\/m\/[ac]\/[A-Za-z0-9._-]+$/.test(u||'');
const safeVideo=u=>{u=typeof u==='string'?u.trim():'';return /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/(ad-videos|clips)\/[A-Za-z0-9._-]+$/.test(u)?u:'';};
const adNoMotion=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};
const safeLink=u=>{u=typeof u==='string'?u.trim():'';return /^https?:\/\/[^\s"'<>\\`]+$/i.test(u)?u:'';};
function adEvent(id,kind){if(sb&&authUser)sb.rpc('ad_event',{p_id:id,p_kind:kind}).then(()=>{},()=>{});}
async function loadAds(skipPopup){
  if(!sb||!authUser)return;
  if(adsAudience==='none'){hideAds();return;}
  /* מנהל רואה בטבלה גם פרסומות כבויות / שהסתיימו — מסננים כאן, כדי שיוצג רק מה שבאמת באוויר */
  try{const {data}=await sb.from('ads').select('*').order('created_at',{ascending:false}).limit(30);const now=Date.now();adsCache=(data||[]).filter(a=>a.active!==false&&adForMe(a)&&(!a.starts_at||Date.parse(a.starts_at)<=now)&&(!a.ends_at||Date.parse(a.ends_at)>now));}catch(e){adsCache=[];}
  adsLoadedAt=Date.now();{const b=document.querySelector('#ybTop'),d=document.querySelector('#ybSide');if(b)delete b.dataset.id;if(d)delete d.dataset.k;}renderBannerAd();renderSideAd();
  if(!skipPopup)setTimeout(maybePopupAd,2500);
}
/* מי שהאתר פתוח אצלו מזמן (אפליקציה בטלפון, לשונית שנשארה פתוחה) לא היה רואה פרסומת חדשה עד שייכנס מחדש.
   עכשיו: כשחוזרים לאתר, וגם כל 30 דקות כשהוא מוצג — טוענים שוב את הפרסומות (לכל היותר פעם ב-10 דקות) */
let adsLoadedAt=0;
function refreshAds(){if(!sb||!authUser||document.hidden||Date.now()-adsLoadedAt<10*60000)return;const bo=document.querySelector('#bo');if(bo&&!bo.classList.contains('hidden'))return;loadAds();}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(refreshAds,1500);});
setInterval(refreshAds,30*60000);
/* פרסומת בלי תמונה: אימוג'י גדול על רקע צבעוני — אין כאן תמונה, ולכן אין מה לחסום בסינון (נטפרי וכדומה) */
const AD_THEMES={green:'ירוק',blue:'כחול',gold:'זהב',purple:'סגול',red:'אדום',teal:'טורקיז'};
const adTheme=a=>AD_THEMES[a.theme]?a.theme:'green';
const adEmoji=a=>String(a.emoji||'').slice(0,8);
function adHero(a){return (adEmoji(a)||AD_THEMES[a.theme])?'<div class="ybhero t-'+adTheme(a)+'" aria-hidden="true">'+esc(adEmoji(a))+'</div>':'';}
/* לאן הכפתור מוביל: קישור חיצוני (למבצע של המפרסם), או פעולה בתוך האתר — נשמרת כ-https://www.yamshopping.com/?a=<פעולה> */
const AD_ACTIONS={
  scan:['📷 לסריקת ברקוד',()=>{setTab('list');openListScanner();}],
  share:['🔗 לשיתוף הרשימה',()=>{setTab('list');document.querySelector('#btnShare').click();}],
  cheap:['💰 איפה הכי זול',()=>{setTab('list');openBasket();}],
  prices:['💲 למחירים',()=>setTab('prices')],
  yami:['🤖 לשאול את יאמי',()=>openBot()],
  install:['📲 להוספה למסך הבית',()=>document.querySelector('#miInstall').click()],
  chat:['💬 לכתוב לנו',()=>openChat()],
  photos:['📸 לצלם מוצר ולקבל נקודות',()=>{if(window.pkPromo53)window.pkPromo53();}]};
const adAction=u=>{const m=String(u||'').match(/^https:\/\/(?:www\.)?yamshopping\.com\/\?a=([a-z]+)$/);return m&&AD_ACTIONS[m[1]]?m[1]:'';};
const adLinkAttrs=(link,id)=>'href="'+esc(link)+'"'+(adAction(link)?'':' target="_blank" rel="noopener sponsored"')+' data-adclick="'+esc(id)+'"';
function adHtml(a){
  const img=safeImg(a.image),link=safeLink(a.link_url),act=adAction(link);
  /* גם לחיצה על התמונה עצמה (למשל על "לחצו כאן" שמצויר בה) מובילה לאותו מקום */
  const pic=img?'<img src="'+esc(img)+'" alt="'+esc(a.title||a.advertiser||'פרסומת')+'">':adHero(a);
  const vid=safeVideo(a.video);
  /* וידאו: בלי קול ובלולאה (מי שביקש פחות תנועה — רק עם כפתור הפעלה). התמונה / האימוג'י נשארים מתחת כגיבוי אם הסרטון נחסם */
  const top=vid?'<div class="ybvid"><video src="'+esc(vidSrc(vid))+'"'+(img?' poster="'+esc(img)+'"':'')+' muted loop playsinline preload="metadata"'+(adNoMotion()?' controls':' autoplay')+' aria-label="'+esc(a.title||a.advertiser||'פרסומת')+'"></video>'+
    '<button class="ybsnd" type="button" data-adsnd aria-label="הפעלת קול">🔇</button>'+(pic?'<div class="ybvfb">'+pic+'</div>':'')+'</div>':(link&&pic?'<a class="ybpic" '+adLinkAttrs(link,a.id)+'>'+pic+'</a>':pic);
  return top+
    '<div class="ybtxt"><span class="ybtag">פרסומת'+(a.advertiser?' · '+esc(a.advertiser):'')+'</span>'+(a.title?'<b>'+esc(a.title)+'</b>':'')+(a.body?'<p>'+esc(a.body)+'</p>':'')+
    (link?'<a class="ybcta" '+adLinkAttrs(link,a.id)+'>'+(act?AD_ACTIONS[act][0]:'למבצע ←')+'</a>':'')+'</div>';
}
/* פופאפ לא קופץ מעל חלון אחר (עדכון, היכרות, חלון פתוח). קודם הוא פשוט וויתר — ורוב המשתמשים לא ראו אותו אף פעם.
   עכשיו הוא מחכה עד שהמסך פנוי (בודק כל 3 שניות, עד 5 דקות) */
let adPopWait=null;
function maybePopupAd(tries){tries=tries|0;clearTimeout(adPopWait);
  if(adShownThisLoad||!authUser)return;
  const upd=document.querySelector('#updPop'),login=document.querySelector('#login'),bo=document.querySelector('#bo'),open0=document.querySelector('#ybPop');
  if(document.hidden||(open0&&!open0.hidden)||document.querySelector('#ybSide.pop')||document.querySelector('.overlay.open')||(upd&&!upd.hidden)||(login&&login.classList.contains('open'))||(bo&&!bo.classList.contains('hidden'))){
    if(tries<100)adPopWait=setTimeout(()=>maybePopupAd(tries+1),3000);return;}
  const pool0=adsCache.filter(a=>a.placement==='popup'&&adOnPage(a)&&!adSeenToday(a.id,'pop'));
  if(!pool0.length)return;
  /* פרסומת שנבחרה במיוחד לדף הזה קודמת לפרסומת של כל הדפים */
  const mine=pool0.filter(a=>a.page===tab),pool=mine.length?mine:pool0;
  /* קודם פרסומת שמוצגת פעם ביום / בכל כניסה (שלא תפספס את התור שלה), ובריענונים הבאים — זו שמוצגת בכל ריענון */
  const rare=pool.filter(x=>adFreqOf(x.id)!=='load'),pick=rare.length?rare:pool;
  const a=pick[Math.floor(Math.random()*pick.length)];
  adShownThisLoad=true;markAdSeen(a.id,'pop');adEvent(a.id,'view');
  const pop=document.querySelector('#ybPop'),body=document.querySelector('#ybPopBody'),x=document.querySelector('#ybPopX'),cnt=document.querySelector('#ybPopCount');
  if(!pop||!body||!x||!cnt)return; /* חוסם פרסומות מחק את החלון */
  body.innerHTML=adHtml(a);
  let left=Math.max(0,Math.min(30,a.close_after|0));
  const tick=()=>{if(left<=0){x.disabled=false;cnt.textContent='✕';x.setAttribute('aria-label','סגירת הפרסומת');return;}cnt.textContent=left;x.setAttribute('aria-label','אפשר לסגור בעוד '+left+' שניות');left--;adTimer=setTimeout(tick,1000);};
  x.disabled=true;clearTimeout(adTimer);tick();
  pop.hidden=false;
}
function closeAdPop(){clearTimeout(adTimer);const p=document.querySelector('#ybPop');if(p){p.hidden=true;p.querySelectorAll('video').forEach(v=>{try{v.pause();}catch(e){}});}}
function renderBannerAd(){
  const el=document.querySelector('#ybTop');if(!el)return;
  const ok=x=>x.placement==='banner'&&adOnPage(x)&&!adSeenToday(x.id,'ban');
  const a=adsCache.find(x=>ok(x)&&x.page===tab)||adsCache.find(x=>ok(x)&&adFreqOf(x.id)!=='load')||adsCache.find(ok);
  if(!a){el.hidden=true;el.innerHTML='';delete el.dataset.id;return;}
  if(el.dataset.id===a.id&&!el.hidden)return; /* מעבר לשונית עם אותה פרסומת — לא מציירים מחדש */
  el.dataset.id=a.id;
  const img=safeImg(a.image),link=safeLink(a.link_url);
  const vid=safeVideo(a.video);
  el.innerHTML=(img?'<img src="'+esc(img)+'" alt="">':vid?'<video src="'+esc(vidSrc(vid))+'" muted loop playsinline preload="metadata"'+(adNoMotion()?'':' autoplay')+' aria-hidden="true"></video>':(adEmoji(a)||AD_THEMES[a.theme])?'<span class="ybem t-'+adTheme(a)+'" aria-hidden="true">'+esc(adEmoji(a))+'</span>':'')+'<span class="t"><b>'+esc(a.title||a.advertiser||'פרסומת')+'</b><small>פרסומת'+(a.advertiser?' · '+esc(a.advertiser):'')+(a.body?' · '+esc(a.body):'')+'</small></span>'+
    (link?'<a '+adLinkAttrs(link,a.id)+'>'+(adAction(link)?AD_ACTIONS[adAction(link)][0].split(' ').slice(1).join(' '):'למבצע')+'</a>':'')+'<button class="bx" type="button" data-banx="'+esc(a.id)+'" disabled aria-label="סגירה">'+(Math.max(0,a.close_after|0)||'✕')+'</button>';
  el.hidden=false;adEvent(a.id,'view');
  const bx=el.querySelector('.bx');let left=Math.max(0,Math.min(30,a.close_after|0));
  if(!left){bx.disabled=false;return;}
  const t=setInterval(()=>{left--;if(left<=0){clearInterval(t);bx.disabled=false;bx.textContent='✕';}else bx.textContent=left;},1000);
}
/* פרסומת קבועה בצד — תמיד מוצגת (בלי סגירה ובלי "פעם ביום"), מתחלפת כל 20 שניות. כשאין פרסומת צד, ואם המנהל לא כיבה, מוצג "המבצע שלכם כאן" */
const AD_HOUSE={id:'house',title:'המבצע שלכם כאן',body:'משפחות רואות את הפרסומת בדיוק כשהן מכינות את רשימת הקניות.\nלפרטים: info@yamshopping.com',emoji:'📢',theme:'green',advertiser:'ים שופינג',image:'',link_url:''};
function renderSideAd(){
  const el=document.querySelector('#ybSide');
  const pool=tab===AD_MAIN?adsCache.filter(a=>a.placement==='side'&&adOnPage(a)):[];if(!pool.length&&adHouse&&tab===AD_MAIN)pool.push(AD_HOUSE);
  /* מעבר לשונית עם אותן פרסומות — לא מציירים מחדש (הסבב ממשיך) */
  const key=pool.map(a=>a.id).join(',');if(el&&key&&el.dataset.k===key&&!el.hidden&&el.innerHTML)return;
  clearInterval(adSideTimer);if(!el)return;el.dataset.k=key;
  if(!pool.length){el.hidden=true;el.innerHTML='';return;}
  const seen=new Set();
  const draw=()=>{const a=pool[adSideIdx%pool.length];
    el.innerHTML='<button class="ybsTab" type="button" aria-label="פרסומת (לפתיחה)">'+esc(adEmoji(a)||'📢')+'<span>פרסומת</span></button><div class="ybsBody"><button class="ybsMin" type="button" aria-label="הקטנת הפרסומת">✕</button>'+adHtml(a)+'</div>';
    if(a.id!=='house'&&!seen.has(a.id)){seen.add(a.id);adEvent(a.id,'view');}};
  draw();el.hidden=false;
  if(pool.length>1)adSideTimer=setInterval(()=>{if(!el.classList.contains('open')){adSideIdx++;draw();}},20000);
  setTimeout(()=>sidePop(pool[adSideIdx%pool.length]),1200);
}
/* 🎈 פרסומת בצד שקופצת: בטלפון (מסך צר), פעם ביום לכל פרסומת, נפתחת לבד ל-X שניות (המנהל בוחר) ואז מחליקה לקצה ונשארת כלשונית.
   מחכה שהמסך יהיה פנוי (חלון פתוח, פופאפ, כניסה, בק אופיס). נגיעה בפרסומת עוצרת את הסגירה האוטומטית */
let adSidePopT=null;
const SIDEPOP_KEY='yamh_sidepop';
function sidePopSeen(id){try{return (JSON.parse(localStorage.getItem(SIDEPOP_KEY)||'{}'))[id]===dayKey(new Date());}catch(e){return false;}}
function sidePopMark(id){try{const m=JSON.parse(localStorage.getItem(SIDEPOP_KEY)||'{}');m[id]=dayKey(new Date());localStorage.setItem(SIDEPOP_KEY,JSON.stringify(m));}catch(e){}}
function sidePop(a,force,tries){tries=tries|0;const el=document.querySelector('#ybSide');
  if(!el||el.hidden||!a||a.id==='house'||(!adSidePop&&!force))return;
  if(!force&&sidePopSeen(a.id))return;
  const upd=document.querySelector('#updPop'),login=document.querySelector('#login'),bo=document.querySelector('#bo'),pop=document.querySelector('#ybPop');
  if(document.hidden||(pop&&!pop.hidden)||document.querySelector('.overlay.open')||document.querySelector('#v8Sheet.open')||(upd&&!upd.hidden)||(login&&login.classList.contains('open'))||(bo&&!bo.classList.contains('hidden'))){
    if(tries<60)setTimeout(()=>sidePop(a,force,tries+1),3000);return;}
  if(el.classList.contains('open'))return;
  sidePopMark(a.id);clearTimeout(adSidePopT);
  el.classList.remove('closing','nudge');el.classList.add('open','pop');
  adSidePopT=setTimeout(()=>{if(!el.classList.contains('pop'))return;el.classList.add('closing');
    adSidePopT=setTimeout(()=>{el.classList.remove('open','pop','closing');el.classList.add('nudge');adSidePopT=setTimeout(()=>el.classList.remove('nudge'),1700);},450);},Math.max(3,adSidePop||6)*1000);}
window.sidePopNow=()=>{const el=document.querySelector('#ybSide');if(el)el.classList.remove('open','pop','closing');const a=adsCache.find(x=>x.placement==='side'&&adAction(x.link_url)==='photos')||adsCache.find(x=>x.placement==='side');sidePop(a,true);return !!a;};
/* נגיעה בפרסומת בזמן שהיא קפצה — נשארת פתוחה עד שסוגרים ב-✕ */
document.querySelector('#ybSide')?.addEventListener('pointerdown',e=>{const sd=e.currentTarget;if(sd.classList.contains('pop')&&!sd.classList.contains('closing')){clearTimeout(adSidePopT);sd.classList.remove('pop');}});
function hideAds(){adsCache=[];closeAdPop();const el=document.querySelector('#ybTop');if(el){el.hidden=true;el.innerHTML='';delete el.dataset.id;}adShownThisLoad=false;clearInterval(adSideTimer);const sd=document.querySelector('#ybSide');if(sd){sd.hidden=true;sd.innerHTML='';sd.classList.remove('open');delete sd.dataset.k;}}
/* חוסמי פרסומות (למשל בכרום) מוחקים את #ybSide / #ybPop מהדף — בלי הבדיקה האתר כולו נתקע בטעינה */
document.querySelector('#ybSide')?.addEventListener('click',e=>{const sd=e.currentTarget;if(e.target.closest('.ybsTab'))sd.classList.add('open');else if(e.target.closest('.ybsMin')){clearTimeout(adSidePopT);sd.classList.remove('open','pop','closing');}});
{const x=document.querySelector('#ybPopX');if(x)x.onclick=closeAdPop;}
document.querySelector('#ybPop')?.addEventListener('click',e=>{if(e.target.id==='ybPop'&&!document.querySelector('#ybPopX')?.disabled)closeAdPop();});
document.addEventListener('click',e=>{const c=e.target.closest('[data-adclick]');if(c){if(c.dataset.adclick!=='preview')adEvent(c.dataset.adclick,'click');const act=adAction(c.getAttribute('href'));
  if(act){e.preventDefault();if(c.dataset.adclick==='preview'){flash('בלחיצה באתר: '+AD_ACTIONS[act][0]);return;}if(c.closest('#ybPop'))closeAdPop();const sd=c.closest('#ybSide');if(sd)sd.classList.remove('open');try{AD_ACTIONS[act][1]();}catch(err){}return;}}const b=e.target.closest('[data-banx]');if(b&&!b.disabled){markAdSeen(b.dataset.banx,'ban');renderBannerAd();}});
/* 🔇/🔊 קול בסרטון; סרטון שלא נטען (נחסם בסינון או חיבור חלש) מוסתר ובמקומו התמונה / האימוג'י */
document.addEventListener('click',e=>{const b=e.target.closest('[data-adsnd]');if(!b)return;e.preventDefault();const v=b.parentNode.querySelector('video');if(!v)return;
  v.muted=!v.muted;if(!v.muted){v.play().catch(()=>{});}b.textContent=v.muted?'🔇':'🔊';b.setAttribute('aria-label',v.muted?'הפעלת קול':'השתקה');});
/* 🎬 סרטון שלא נטען ישירות מהשרת: יש חוסמי פרסומות וסינונים שחוסמים רק טעינת וידאו (אבל לא הורדת קבצים רגילה).
   אז מורידים אותו כקובץ ומנגנים מהזיכרון (blob:) — כך הוא מתנגן גם אצלם. רק אם גם זה נכשל — מציגים את התמונה / האימוג'י */
const vidBlobCache=new Map();
function vidViaBlob(u){let p=vidBlobCache.get(u);
  if(!p){p=fetch(u).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.blob();}).then(b=>URL.createObjectURL(b.type?b:new Blob([b],{type:'video/mp4'})));
    vidBlobCache.set(u,p);p.catch(()=>vidBlobCache.delete(u));}
  return p;}
document.addEventListener('error',e=>{const v=e.target;if(!v||v.tagName!=='VIDEO')return;const w=v.closest('.ybvid');
  const orig=v.dataset.orig||v.getAttribute('src')||'';
  if(!v.dataset.orig&&ourVid(orig)){v.dataset.orig=orig;
    vidViaBlob(orig).then(bu=>{v.src=bu;if(w)w.classList.remove('fail');if(v.autoplay)v.play().catch(()=>{});
      const inf=v.closest('#ybPreview')&&document.querySelector('#adVidInfo');if(inf&&!inf.textContent.includes('דרך עקיפה'))inf.textContent+=' 🎬 הסרטון מתנגן (בדרך עקיפה: משהו בדפדפן חוסם טעינה ישירה של וידאו, אז האתר מוריד אותו ומנגן).';},
      ()=>vidFailed(v,w,orig,false));
    return;}
  vidFailed(v,w,orig,true);},true);
function vidFailed(v,w,orig,blobTried){if(w)w.classList.add('fail');
  const inf=v.closest('#ybPreview')&&document.querySelector('#adVidInfo');
  if(inf&&!inf.textContent.includes('לא נטען בתצוגה')){const code=v.error&&v.error.code||0;
    inf.textContent=(inf.style.color?inf.textContent+' ':'')+'⚠️ הסרטון לא נטען בתצוגה המקדימה. 🔎 בודק למה...';inf.style.color='#c0392b';
    adVidDiag(orig,code,blobTried).then(t=>{inf.textContent=inf.textContent.replace('🔎 בודק למה...','🔎 '+t+' מי שלא רואה את הסרטון יראה את האימוג\'י או התמונה.');
      try{sb.rpc('log_client_error',{p_msg:('סרטון פרסומת לא מתנגן: '+t).slice(0,500),p_src:'ybPreview · קוד '+code+(blobTried?' · גם מהזיכרון':''),p_ua:navigator.userAgent.slice(0,200),p_ver:String(typeof APP_VERSION!=='undefined'?APP_VERSION:'')}).then(()=>{},()=>{});}catch(e){}});}
  else if(v.closest('#ybTop'))v.remove();}
/* למה סרטון לא מתנגן: שואלים את השרת ישירות מה הוא מחזיר בכתובת של הסרטון */
async function adVidDiag(u,code,blobTried){
  try{const r=await fetch(u,{method:'HEAD',cache:'no-store'});const ct=(r.headers.get('content-type')||'').split(';')[0];
    if(r.status===400||r.status===404)return 'השרת ענה שהסרטון לא נמצא ('+r.status+'). כנראה דלי הסרטונים לא מוגדר כציבורי: להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית).';
    if(!r.ok)return 'השרת ענה '+r.status+' על הסרטון.';
    if(!/^video\//.test(ct))return 'בכתובת של הסרטון חוזר משהו שהוא לא סרטון ('+(ct||'בלי סוג')+'). אם יש סינון אינטרנט, כנראה הוא מחליף את הסרטון בדף חסימה.';
    if(blobTried)return 'הסרטון שמור בשרת ותקין ('+ct+'), אבל הדפדפן הזה לא מצליח לפענח אותו גם אחרי שהורד'+(code?' (קוד '+code+')':'')+'. כנראה הקידוד שלו לא נתמך: כדאי לייצא אותו שוב כ-MP4 רגיל (H.264) ולהעלות מחדש.';
    if(/\/public\/ad-videos\/|^\/m\/a\//.test(u))return 'הסרטון שמור בשרת ותקין, אבל הדפדפן חוסם אותו'+(code?' (קוד '+code+')':'')+'. כנראה חוסם פרסומות בדפדפן חוסם כתובות עם "ad-videos". הסרטון הזה הועלה בגרסה הקודמת: להסיר אותו ולהעלות שוב, והוא יישמר במקום שלא נחסם.';
    return 'הסרטון שמור בשרת ותקין ('+ct+'), אבל הדפדפן הזה לא מנגן אותו'+(code?' (קוד '+code+')':'')+'. בדרך כלל זה חוסם פרסומות בדפדפן, סינון אינטרנט (נטפרי, רימון וכו\'), או קידוד שהדפדפן לא תומך בו. כדאי לבדוק בחלון גלישה בסתר או מטלפון.';}
  catch(e){return 'אין גישה לכתובת של הסרטון בכלל. כנראה סינון האינטרנט חוסם את השרת של הסרטונים.';}}
document.addEventListener('keydown',e=>{const p=document.querySelector('#ybPop'),x=document.querySelector('#ybPopX');if(e.key==='Escape'&&p&&x&&!p.hidden&&!x.disabled)closeAdPop();});
/* לחיצה על שם מוצר או מבצע שנחתכו מציגה את כל מה שרשום */
function togglePrProd(el){const row=el.closest('.price-row');if(!row)return;const on=row.classList.toggle('full');row.querySelectorAll('.pr-prod').forEach(b=>b.setAttribute('aria-expanded',on?'true':'false'));}
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('.price-row .pr-prod,.price-row-main .dealbadge');if(el)togglePrProd(el);});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const el=e.target.closest&&e.target.closest('.pr-prod');if(!el)return;e.preventDefault();togglePrProd(el);});


/* ================= לשונית חנויות: עדכונים ומבצעים, מעקב, חנויות לפי סוג, סניפים ================= */
let storesView='feed',storeType='',feedSort='new',feedFollowOnly=true,follows=new Set(),storePosts=[],feedPrices=[],feedSeenAt=null,followerCounts={},openChain='',postImg='';
const storesPane=document.querySelector('#paneStores');
const typeIcon=c=>(STORE_TYPES[chainCategory(c)]||STORE_TYPES.other)[0];
/* תמונת העסק (לוגו) של חנות — נטענת פעם אחת כשנכנסים ללשונית החנויות */
let chainLogos={},chainLogosLoaded=false;
const chainLogo=c=>safeImg(chainLogos[c]);
const chainAv=c=>{const l=chainLogo(c);return l?'<img class="chlogo" src="'+esc(l)+'" alt="" loading="lazy">':typeIcon(c);};
function loadChainLogos(){if(chainLogosLoaded||!sb)return;chainLogosLoaded=true;
  cachedLoad('chainlogos',6*HOUR_MS,async()=>{const {data,error}=await sb.from('chains').select('name,logo').eq('status','approved').neq('logo','').limit(500);return error?null:(data||[]);},d=>{const m={};(d||[]).forEach(x=>{if(x&&x.name&&x.logo)m[x.name]=x.logo;});const changed=JSON.stringify(Object.keys(m).sort())!==JSON.stringify(Object.keys(chainLogos).sort());chainLogos=m;
    if(changed&&tab==='stores'&&!document.querySelector('#paneStores').contains(document.activeElement))renderStores();}).catch(()=>{chainLogosLoaded=false;});}
const typeName=k=>{const t=STORE_TYPES[k]||STORE_TYPES.other;return T(t[1],t[2]);};
async function loadFollows(){follows=new Set();if(!sb||!authUser)return;try{const {data}=await sb.from('store_follows').select('chain');(data||[]).forEach(r=>follows.add(r.chain));}catch(e){}}
async function loadFeed(){
  if(!sb||!authUser)return;
  try{const {data}=await sb.from('store_posts').select(COLS23.posts).order('created_at',{ascending:false}).limit(200);storePosts=data||[];}catch(e){storePosts=[];}
  try{const {data}=await sb.from('prices').select('id,product,chain,branch,price,currency,created_at,updated_at,status').eq('verified',true).order('created_at',{ascending:false}).limit(300);feedPrices=(data||[]).filter(r=>r.status==='approved');}catch(e){feedPrices=[];}
}
function feedItems(){
  const items=storePosts.filter(p=>p.status==='approved'||p.created_by===(authUser&&authUser.id)).map(p=>({type:'post',chain:p.chain,at:p.created_at,p}));
  const days={};feedPrices.forEach(r=>{const k=r.chain+'|'+dayKey(r.created_at);(days[k]=days[k]||{type:'prices',chain:r.chain,at:r.created_at,rows:[]}).rows.push(r);});
  return items.concat(Object.values(days));
}
function newFeedCount(){if(!feedSeenAt||!follows.size)return 0;return feedItems().filter(i=>follows.has(i.chain)&&new Date(i.at)>new Date(feedSeenAt)).length;}
function updateStoresBadge(){const n=newFeedCount();const b=document.querySelector('#storesBadge');b.hidden=!n;b.textContent=n>9?'9+':n;}
async function initStores(){
  if(!sb||!authUser)return;
  await Promise.all([loadFollows(),loadFeed()]);
  try{const {data}=await sb.from('profiles').select('feed_seen_at').eq('id',authUser.id).maybeSingle();feedSeenAt=data&&data.feed_seen_at;}catch(e){}
  const n=newFeedCount();updateStoresBadge();
  if(n)setTimeout(()=>flash(T('🔔 '+n+' עדכונים חדשים מהחנויות שאת/ה עוקב/ת — בלשונית 🏪','🔔 '+n+' new updates from stores you follow')),4500);
}
setInterval(async()=>{
  if(!sb||!authUser||document.visibilityState!=='visible'||!follows.size)return;
  const before=newFeedCount();await loadFeed();const after=newFeedCount();updateStoresBadge();
  if(after>before){if(typeof checkSaleAlerts==='function'){saleCheckAt=0;checkSaleAlerts();}
    if(tab==='stores'&&storesView==='feed'&&!storesPane.contains(document.activeElement))renderStores();}
},5*60*1000);
async function openStoresTab(){
  renderStores();
  if(sb&&authUser){await Promise.all([loadFeed(),loadFollows()]);try{const {data}=await sb.rpc('chain_follower_counts');followerCounts={};(data||[]).forEach(r=>followerCounts[r.chain]=r.followers);}catch(e){}
    if(!storesPane.contains(document.activeElement))renderStores();}
  if(storesView==='feed')markFeedSeen();
}
async function markFeedSeen(){if(!sb||!authUser)return;const now=new Date().toISOString();feedSeenAt=now;updateStoresBadge();try{await sb.from('profiles').update({feed_seen_at:now}).eq('id',authUser.id);}catch(e){}}
async function toggleFollow(chain){
  if(!sb||!authUser){flash(T('צריך להתחבר','Sign in first'));return;}
  if(follows.has(chain)){const {error}=await sb.from('store_follows').delete().eq('chain',chain);if(!error){follows.delete(chain);followerCounts[chain]=Math.max(0,(followerCounts[chain]||1)-1);flash(T('הפסקת לעקוב אחרי ','Unfollowed ')+chain);}}
  else{const {error}=await sb.from('store_follows').insert({chain});if(!error){follows.add(chain);followerCounts[chain]=(followerCounts[chain]||0)+1;flash(T('⭐ עכשיו את/ה עוקב/ת אחרי '+chain+' — מבצעים ועדכונים יופיעו כאן','⭐ Following '+chain));}else flash('⚠️ '+error.message);}
  renderStores();
}
function typeChips(){
  const present=new Set(allChains().filter(c=>c.status!=='pending').map(c=>chainCategory(c.name)));
  return '<div class="typechips">'+['',...Object.keys(STORE_TYPES).filter(k=>present.has(k))].map(k=>'<button class="tchip'+(storeType===k?' on':'')+'" data-stype="'+k+'">'+(k?STORE_TYPES[k][0]+' '+typeName(k):T('הכל','All'))+'</button>').join('')+'</div>';
}
function followBtn(c){const on=follows.has(c);return '<button class="followbtn'+(on?' on':'')+'" data-follow="'+esc(c)+'" aria-pressed="'+on+'">'+(on?'⭐ '+T('עוקב/ת','Following'):'☆ '+T('מעקב','Follow'))+'</button>';}
function renderStores(){
  const p=storesPane;
  let html='<div class="seg" role="tablist">'+[['feed','📰 '+T('מבצעים ועדכונים','Deals & updates')],['dir','🏪 '+T('החנויות','Stores')],['branches','📍 '+T('סניפים ווייז','Branches & Waze')]].map(([k,l])=>'<button role="tab" data-sview="'+k+'" class="'+(storesView===k?'on':'')+'">'+l+(k==='feed'&&newFeedCount()?' <span class="tbadge in">'+newFeedCount()+'</span>':'')+'</button>').join('')+'</div>';
  html+=typeChips();
  if(storesView==='feed')html+=feedHtml();else if(storesView==='dir')html+=dirHtml();else html+=branchesHtml();
  p.innerHTML=html;
  if(storesView==='branches'){renderBranchList();}
  doodleBg(p);
}
function feedHtml(){
  let h='';
  if(myStore)h+='<details class="grp postform"'+(postImg?' open':'')+'><summary>📣 '+T('פרסום מבצע או עדכון בשם','Post a deal or update for')+' '+esc(myStore.chain)+'</summary><p class="muted-note">'+(myStore.auto_approve?T('יופיע מיד אצל כל העוקבים.','Shown to all followers immediately.'):T('יופיע אחרי אישור מנהל האתר.','Shown after admin approval.'))+'</p>'+
    '<div class="form"><select id="spKind"><option value="deal">🏷️ '+T('מבצע','Deal')+'</option><option value="product">🆕 '+T('מוצר חדש','New product')+'</option><option value="news">📢 '+T('עדכון','News')+'</option></select><input id="spTitle" maxlength="120" placeholder="'+T('כותרת — למשל: 1+1 על כל הגבינות','Title')+'"><textarea id="spBody" maxlength="2000" placeholder="'+T('פרטים (רשות)','Details (optional)')+'"></textarea>'+
    '<label class="il">'+T('תמונה (רשות)','Image (optional)')+'</label><input id="spImg" type="file" accept="image/*"><label class="il">'+T('בתוקף עד (רשות)','Valid until (optional)')+'</label><input id="spEnds" type="date"><button id="spSend">'+T('פרסום','Publish')+'</button></div></details>';
  h+='<div class="srow feedctl"><select id="feedSort" aria-label="'+T('סידור','Sort')+'"><option value="new">🕘 '+T('החדשים קודם','Newest first')+'</option><option value="old"'+(feedSort==='old'?' selected':'')+'>⏳ '+T('הישנים קודם','Oldest first')+'</option></select>'+
    '<label class="fonly"><input type="checkbox" id="feedFollow" '+(feedFollowOnly?'checked':'')+'> '+T('רק חנויות שאני עוקב/ת','Only stores I follow')+'</label>'+
    (('Notification' in window)&&Notification.permission==='default'?'<button class="pr-act" id="notifOn" type="button">🔔 '+T('התראות','Alerts')+'</button>':'')+'</div>';
  let items=feedItems().filter(i=>(!storeType||chainCategory(i.chain)===storeType)&&(!feedFollowOnly||follows.has(i.chain)));
  items.sort((a,b)=>feedSort==='old'?new Date(a.at)-new Date(b.at):new Date(b.at)-new Date(a.at));
  if(!items.length){
    return h+'<div class="empty">'+(feedFollowOnly&&!follows.size?T('עוד לא עוקבים אחרי אף חנות 🙂<br>עברו ל"🏪 החנויות" ולחצו ☆ מעקב — ומבצעים ועדכונים יופיעו כאן.','Not following any store yet 🙂<br>Go to "🏪 Stores" and tap ☆ Follow.'):T('אין עדיין עדכונים כאן','Nothing here yet'))+'</div>';
  }
  const kindL={deal:'🏷️ '+T('מבצע','Deal'),product:'🆕 '+T('מוצר חדש','New product'),news:'📢 '+T('עדכון','News')};
  return h+'<div class="feed">'+items.slice(0,80).map(i=>{
    const isNew=feedSeenAt&&new Date(i.at)>new Date(feedSeenAt)&&follows.has(i.chain);
    const head='<div class="fhead"><span class="fstore">'+chainAv(i.chain)+' <b>'+esc(i.chain)+'</b></span>'+(isNew?'<span class="newdot">'+T('חדש','New')+'</span>':'')+'<span class="fdate">'+agoText(i.at)+'</span>'+followBtn(i.chain)+'</div>';
    if(i.type==='post'){const x=i.p;const img=safeImg(x.image);const expired=x.ends_at&&new Date(x.ends_at)<new Date();
      return '<article class="fcard'+(expired?' expired':'')+'" style="position:relative"><button class="shside18" data-shpost="'+esc(x.id)+'" title="'+T('שיתוף','Share')+'" aria-label="'+T('שיתוף','Share')+'">📤</button>'+head+(img?'<img src="'+esc(img)+'" alt="" loading="lazy">':'')+'<div class="fbody"><span class="fkind">'+(kindL[x.kind]||'')+(x.status==='pending'?' · ⏳ '+T('ממתין לאישור','pending'):'')+'</span><h4>'+esc(x.title)+'</h4>'+(x.body?'<p>'+esc(x.body)+'</p>':'')+(x.ends_at?'<small>'+(expired?T('הסתיים ','Ended '):T('בתוקף עד ','Valid until '))+fmtDate(new Date(x.ends_at))+'</small>':'')+
        (myStore&&x.created_by===authUser.id?'<div><button class="pr-act" data-spdel="'+esc(x.id)+'">🗑️ '+T('מחיקה','Delete')+'</button></div>':'')+'</div></article>';}
    return '<article class="fcard">'+head+'<div class="fbody"><span class="fkind">💰 '+T('מחירים רשמיים חדשים','New official prices')+' ('+i.rows.length+')</span><div class="fprices">'+i.rows.slice(0,8).map(r=>'<div><span>'+esc(r.product)+'</span><b>'+fmtPrice(r.price,r.currency)+'</b></div>').join('')+(i.rows.length>8?'<small>+'+(i.rows.length-8)+' '+T('נוספים — חפשו בלשונית המחירים','more — search in Prices')+'</small>':'')+'</div></div></article>';
  }).join('')+'</div>';
}
function dirHtml(){
  const chains=allChains().filter(c=>c.status!=='pending'||isStaff()).filter(c=>!storeType||chainCategory(c.name)===storeType);
  const byType={};chains.forEach(c=>{const k=chainCategory(c.name);(byType[k]=byType[k]||[]).push(c);});
  let h='<p class="muted-note">'+T('לחצו ☆ מעקב כדי לקבל את המבצעים והעדכונים של החנות בלשונית "מבצעים ועדכונים".','Tap ☆ Follow to get the store\'s deals and updates.')+'</p>';
  h+=Object.keys(STORE_TYPES).filter(k=>byType[k]).map(k=>'<section class="grp typesec"><h3>'+STORE_TYPES[k][0]+' '+typeName(k)+' <small>('+byType[k].length+')</small></h3>'+
    byType[k].sort((a,b)=>a.name.localeCompare(b.name,'he')).map(c=>{const brs=allBranches().filter(b=>b.chain===c.name);const open=openChain===c.name;
      return '<div class="chainrow"><button class="chainname" data-openchain="'+esc(c.name)+'" aria-expanded="'+open+'"><b>'+(chainLogo(c.name)?chainAv(c.name)+' ':'')+esc(c.name)+'</b><small>'+(c.kind==='online'?T('אונליין','online'):brs.length+' '+T('סניפים','branches'))+(followerCounts[c.name]?' · '+followerCounts[c.name]+' '+T('עוקבים','followers'):'')+(c.status==='pending'?' · ⏳':'')+'</small></button>'+followBtn(c.name)+'</div>'+
        (open&&brs.length?'<div class="chainbr">'+brs.map(b=>'<div class="branch"><span class="bra">'+esc(b.city)+'<small>'+esc(b.address||'')+(b.name?' · '+esc(b.name):'')+'</small></span><a class="waze" href="'+esc(wazeUrl(branchQuery(b)))+'" target="_blank" rel="noopener">🧭 '+T('וויז','Waze')+'</a></div>').join('')+'</div>':'');}).join('')+'</section>').join('')||'<div class="empty">'+T('אין חנויות מהסוג הזה עדיין','No stores of this type yet')+'</div>';
  h+='<details class="grp"'+(showAddStore?' open':'')+'><summary>➕ '+T('הוספת חנות או סניף','Add a store or branch')+'</summary><p class="muted-note">'+(isStaff()?T('את/ה בצוות — יתווסף מיד.','You are staff — added immediately.'):T('יישלח לאישור מנהל, ואחרי האישור יופיע לכולם.','Will be sent for admin approval.'))+'</p>'+
    '<div class="price-report"><input id="baChain" list="prChainList2" placeholder="'+T('שם הרשת / החנות','Chain / store name')+'" maxlength="40"><datalist id="prChainList2">'+allChainNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist><select id="baCat">'+Object.keys(STORE_TYPES).map(k=>'<option value="'+k+'">'+STORE_TYPES[k][0]+' '+typeName(k)+'</option>').join('')+'</select><input id="baCity" placeholder="'+T('עיר','City')+'" maxlength="40"><input id="baAddr" placeholder="'+T('רחוב ומספר','Street & number')+'" maxlength="120"><input id="baName" placeholder="'+T('שם הסניף (רשות)','Branch name (optional)')+'" maxlength="60"><button id="baSubmit">'+T('הוספה','Add')+'</button></div></details>';
  return h;
}
function branchesHtml(){
  const chains=allChains().filter(c=>c.kind!=='online'&&(!storeType||chainCategory(c.name)===storeType));
  return '<div class="srow"><select id="brChain" aria-label="'+T('בחירת רשת','Choose chain')+'"><option value="">'+T('כל החנויות','All stores')+'</option>'+chains.map(c=>'<option'+(c.name===brChain?' selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select>'+
    '<input id="brCity" placeholder="'+T('עיר / רחוב','City / street')+'" value="'+esc(brCity)+'" aria-label="'+T('סינון לפי עיר','Filter by city')+'" autocomplete="off"></div><div id="branchList"></div>';
}
storesPane.addEventListener('click',async e=>{
  const sv=e.target.closest('[data-sview]');if(sv){storesView=sv.dataset.sview;renderStores();if(storesView==='feed')markFeedSeen();return;}
  const st=e.target.closest('[data-stype]');if(st){storeType=st.dataset.stype;renderStores();return;}
  const fb=e.target.closest('[data-follow]');if(fb){toggleFollow(fb.dataset.follow);return;}
  const oc=e.target.closest('[data-openchain]');if(oc){openChain=openChain===oc.dataset.openchain?'':oc.dataset.openchain;renderStores();return;}
  if(e.target.id==='notifOn'){try{await Notification.requestPermission();}catch(err){}renderStores();return;}
  if(e.target.id==='baSubmit'){if(!sb||!authUser)return;const v=x=>document.querySelector(x).value;const cat=v('#baCat');
    if(await addStoreOrBranch(v('#baChain'),cat==='online'?'online':'store',v('#baCity'),v('#baAddr'),v('#baName'),cat)){showAddStore=false;renderStores();}return;}
  if(e.target.id==='spSend'){
    const title=document.querySelector('#spTitle').value.trim(),body=document.querySelector('#spBody').value.trim();
    if(!title){flash(T('צריך כותרת','Title needed'));return;}if([title,body].some(hasProfanity)){flash('🙏');return;}
    const ends=document.querySelector('#spEnds').value;
    const {error}=await sb.from('store_posts').insert({chain:myStore.chain,branch:myStore.branch||'',kind:document.querySelector('#spKind').value,title,body,image:postImg,ends_at:ends?new Date(ends+'T23:59:00').toISOString():null,created_by:authUser.id});
    if(error){flash('⚠️ '+error.message);return;}postImg='';
    flash(myStore.auto_approve?T('📣 פורסם לכל העוקבים','📣 Published'):T('📨 נשלח לאישור המנהל','📨 Sent for approval'));await loadFeed();renderStores();return;}
  const del=e.target.closest('[data-spdel]');if(del){if(!(await uiConfirm(T('למחוק?','Delete?'))))return;const {error}=await sb.from('store_posts').delete().eq('id',del.dataset.spdel);if(!error){storePosts=storePosts.filter(x=>x.id!==del.dataset.spdel);renderStores();}return;}
});
storesPane.addEventListener('change',async e=>{
  if(e.target.id==='feedSort'){feedSort=e.target.value;renderStores();}
  if(e.target.id==='feedFollow'){feedFollowOnly=e.target.checked;renderStores();}
  if(e.target.id==='brChain'){brChain=e.target.value;renderBranchList();}
  if(e.target.id==='spImg'){const f=e.target.files[0];if(!f)return;try{postImg=await shrinkPic(f);flash(T('🖼️ התמונה צורפה','🖼️ Image attached'));}catch(err){flash('⚠️');}}
});
storesPane.addEventListener('input',e=>{if(e.target.id==='brCity'){brCity=e.target.value;renderBranchList();}});
function shrinkPic(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const img=new Image();
  img.onload=()=>{const max=900;let w=img.naturalWidth,h=img.naturalHeight;if(w>max){h=Math.round(h*max/w);w=max;}
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
    let q=0.85,d=c.toDataURL('image/jpeg',q);while(d.length>1400000&&q>0.4){q-=0.1;d=c.toDataURL('image/jpeg',q);}res(d);};
  img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('bad image'));};img.src=url;});}

/* ================= עדכונים לאתר — מוצגים פעם אחת, מאשרים אחרי שקוראים הכל ================= */
async function checkUpdates(){
  if(!sb||!authUser)return false;
  try{
    const {data:prof}=await sb.from('profiles').select('updates_seen_at').eq('id',authUser.id).maybeSingle();
    if(!prof||!prof.updates_seen_at)return false;
    const {data}=await sb.from('site_updates').select('id,title,body,created_at').gt('created_at',prof.updates_seen_at).order('created_at',{ascending:false}).limit(5);
    if(!data||!data.length)return false;
    showUpdates(data);return true;
  }catch(e){return false;}
}
function showUpdates(list){
  const body=document.querySelector('#updBody'),ok=document.querySelector('#updOk'),hint=document.querySelector('#updHint');
  body.innerHTML=list.map(u=>'<div class="u"><b>'+esc(u.title)+'</b><small>'+fmtDate(new Date(u.created_at))+'</small><p>'+esc(u.body)+'</p></div>').join('');
  ok.disabled=true;hint.hidden=false;
  document.querySelector('#updPop').hidden=false;body.scrollTop=0;
  const check=()=>{if(body.scrollTop+body.clientHeight>=body.scrollHeight-8){ok.disabled=false;hint.hidden=true;}};
  body.onscroll=check;setTimeout(check,1200); /* טקסט קצר שנכנס כולו — מתאפשר אחרי רגע */
}
document.querySelector('#updOk').onclick=async()=>{
  document.querySelector('#updPop').hidden=true;
  try{await sb.rpc('mark_updates_seen');}catch(e){}
  flash('✔ תודה! 🙂');
};
document.querySelector('#updLater').onclick=()=>{document.querySelector('#updPop').hidden=true;};


/* ================= בין־לאומי: שפה, מטבע, ישראל/חו"ל ================= */
const I18N=[
 ['#login h1','t','רשימת קניות משותפת','Shared shopping list'],['#login .lcard > p','t','רשימה אחת לכל המשפחה — כולם רואים מיד מה צריך. השוואת מחירים, מה יש בבית, תאריך עברי וחגים, ועוזרת חכמה. חינם.','One shopping list for the whole family — prices, home stock, Hebrew dates and holidays, and a smart helper. Free, on phone and computer.'],
 ['.lfeat span:nth-child(1)','t','🎤 הוספה בקול','🎤 Voice input'],['.lfeat span:nth-child(2)','t','👩‍🍳 עוזרת חכמה','👩‍🍳 Smart assistant'],['.lfeat span:nth-child(3)','t','🔄 סנכרון עם המשפחה','🔄 Family sync'],
 ['#ltLogin','t','כניסה','Sign in'],['#ltSignup','t','הרשמה','Sign up'],
 ['#inName','p','השם שלך (כך יופיע באתר)','Your name (shown on the site)'],['#inMail','p','מייל','Email'],['#inCode','p','סיסמה','Password'],['#inCode2','p','שוב את הקוד — לאימות','Repeat the code'],
 ['#btnForgot','t','שכחתי סיסמה','Forgot password'],['.lcard .tiny','t','🔒 חיבור מאובטח · הקוד שלך מוצפן ואף אחד לא רואה אותו','🔒 Secure connection · your code is encrypted'],
 ['#brand b','t','רשימת קניות','Shopping List'],
 ['#miMe span','t','האזור האישי שלי','My personal area'],['#miNotif span','t','התראות ועדכונים','Notifications'],['#miReviews span','t','חוות דעת על האתר','Site reviews'],['[data-forward=btnDark] span','t','מצב כהה','Dark mode'],['#miTheme span','t','ערכת צבעים','Color theme'],['[data-forward=btnGroup] span','t','תצוגת קטגוריות','Category view'],['[data-forward=btnPrint] span','t','הדפסה / PDF','Print / PDF'],['[data-forward=btnShare] span','t','שליחה בוואטסאפ ושיתוף','Send on WhatsApp & share'],['#shSendLbl','t','📤 שליחת הרשימה כטקסט מסודר','📤 Send the list as neat text'],['#shKeepLbl','t','☁️ שיתוף עם המשפחה וגיבוי','☁️ Family sharing & backup'],
 ['#miFinish span','t','סיום קנייה (להיסטוריה)','Finish shopping'],['#miIntl span','t','שפה, מטבע ומיקום','Language, currency & location'],['#miAbout span','t','אודות האתר','About'],['#miOnline span','t','מי מחובר עכשיו','Who is online'],['#miAdmin span','t','ניהול האתר','Site management'],['#miBackoffice span','t','בק אופיס','Back office'],['#miLogout span','t','יציאה מהחשבון','Sign out'],['#miInstall span','t','התקנת האפליקציה (טלפון ומחשב)','Install the app (phone & computer)'],['#miDelete span','t','מחיקת החשבון שלי','Delete my account'],
 ['.tab[data-t=list]','t','📝 רשימה','📝 List'],['.tab[data-t=hist]','t','🕘 היסטוריה','🕘 History'],['.tab[data-t=home]','t','🏠 הבית שלי','🏠 My home'],['.tab[data-t=prices] .tlbl','t','💰 מחירים וחנויות','💰 Prices & stores'],
 ['#inText','p','מה להוסיף?','What to add?'],['#inQty','p','כמות','Qty'],['#botText','p','לשאול את יאמי...','Ask Yami...'],['.ruthy-head small','t','● עוזרת הקניות שלך','● Your shopping assistant'],
 ['#shWa','t','💬 וואטסאפ','💬 WhatsApp'],['#shGmail','t','📧 ג׳ימייל','📧 Gmail'],['#shCopy','t','📋 העתקה','📋 Copy'],['#shBackup','t','💾 גיבוי','💾 Backup'],['#shRestore','t','📥 שחזור','📥 Restore'],
 ['#catOverlay .phead b','t','כל המוצרים לפי קטגוריות','All products by category'],['#inCatSearch','p','🔍 חיפוש מוצר...','🔍 Search product...'],
 ['#aboutOverlay .phead b','t','ℹ️ אודות האתר','ℹ️ About'],
 ['#updTitle','t','🆕 מה חדש באתר','🆕 What\'s new'],['#updLater','t','אחר כך','Later'],['#updOk','t','קראתי ✔','I\'ve read it ✔'],['#updHint','t','גללו עד הסוף כדי לאשר 👇','Scroll to the end to confirm 👇'],
 ['#intlTitle','t','🌍 שפה, מטבע ומיקום','🌍 Language, currency & location'],
 ['#btnGuest','t','👀 לנסות עכשיו, בלי הרשמה','👀 Try it now, no sign-up'],['#botFab small','t','יאמי','Yami'],['.ruthy-head b','t','יאמי','Yami']
];
function applyLang(){
  const en=prefs.lang==='en';
  document.documentElement.lang=en?'en':'he';document.documentElement.dir=en?'ltr':'rtl';
  I18N.forEach(([sel,kind,he,enT])=>{document.querySelectorAll(sel).forEach(el=>{if(kind==='p')el.placeholder=en?enT:appTxt(he);else el.textContent=en?enT:appTxt(he);});});
  const stt=document.querySelector('.tab[data-t=stores]');if(stt&&stt.firstChild)stt.firstChild.textContent=T('🏪 חנויות','🏪 Stores');
  {const lt=document.querySelector('#lTerms');if(lt)lt.innerHTML=T('<a href="privacy.html" target="_blank" rel="noopener">פרטיות</a> · <a href="accessibility.html" target="_blank" rel="noopener">נגישות</a>','<a href="privacy.html" target="_blank" rel="noopener">Privacy</a> · <a href="accessibility.html" target="_blank" rel="noopener">Accessibility</a>');}
  const g=document.querySelector('#btnGoogle');if(g){const tn=Array.from(g.childNodes).find(n=>n.nodeType===3&&n.textContent.trim());if(tn)tn.textContent=' '+T('כניסה עם גוגל','Sign in with Google');}
  if(typeof setLoginMode==='function')setLoginMode(loginMode);
  updateGenderLabel&&updateGenderLabel();
}
function openIntl(){
  document.querySelector('#hMenu').classList.remove('open');
  const cities=Object.keys(CITIES);
  document.querySelector('#intlBody').innerHTML=
    '<label class="il">'+T('שפת האתר','Language')+'</label><select id="ilLang"><option value="he">עברית</option><option value="en">English</option></select>'+
    '<label class="il">'+T('מטבע למחירים','Currency')+'</label><select id="ilCur">'+Object.entries(CURRENCIES).map(([k,v])=>'<option value="'+k+'">'+esc(v)+' ('+k+')</option>').join('')+'</select>'+
    '<label class="il">'+T('איפה אתם גרים? (לחגים ולפרשת השבוע)','Where do you live? (for holidays and the weekly parasha)')+'</label><select id="ilReg"><option value="il">'+T('ארץ ישראל','Israel')+'</option><option value="abroad">'+T('חוץ לארץ (יום טוב שני)','Outside Israel (2nd day of Yom Tov)')+'</option></select>'+
    '<label class="il">'+T('עיר לזמני שבת','City for Shabbat times')+'</label><select id="ilCity">'+cities.map(c=>'<option value="'+esc(c)+'">'+esc(cityName(c))+'</option>').join('')+'</select>'+
    '<p class="muted-note">'+T('ההגדרות נשמרות במכשיר הזה. יאמי מדברת עברית; אם מנהל האתר הפעיל בינה מלאכותית — היא עונה גם בשפות אחרות.','Saved on this device. Yami speaks Hebrew; if the site admin enabled AI, it answers in other languages too.')+'</p>'+
    '<button id="ilSave">'+T('שמירה','Save')+'</button>';
  document.querySelector('#ilLang').value=prefs.lang;document.querySelector('#ilCur').value=myCurrency();
  document.querySelector('#ilReg').value=prefs.diaspora?'abroad':'il';document.querySelector('#ilCity').value=userCity();
  document.querySelector('#intlOverlay').classList.add('open');
}
document.querySelector('#miIntl').onclick=openIntl;
document.querySelector('#btnCloseIntl').onclick=()=>document.querySelector('#intlOverlay').classList.remove('open');
document.querySelector('#intlOverlay').addEventListener('click',e=>{
  if(e.target.id==='intlOverlay'){e.target.classList.remove('open');return;}
  if(e.target.id==='ilCity'||e.target.id!=='ilSave')return;
  prefs.lang=document.querySelector('#ilLang').value;prefs.currency=document.querySelector('#ilCur').value;prefs.diaspora=document.querySelector('#ilReg').value==='abroad';
  /* העיר משתנה רק אם בחרו עיר אחרת — שמירת שפה/מטבע לא דורסת את העיר שבאזור האישי */
  const ilc=document.querySelector('#ilCity').value;if(ilc!==userCity()){state.city=ilc;meData().city=ilc;meData().ts=Date.now();}savePrefs();save();
  document.querySelector('#intlOverlay').classList.remove('open');applyLang();render();if(tab==='prices')renderPrices();
  flash(T('✔ נשמר','✔ Saved'));
});
document.querySelector('#intlBody').addEventListener('change',e=>{if(e.target.id==='ilCity'&&CITIES[e.target.value]&&CITIES[e.target.value][3])document.querySelector('#ilReg').value='abroad';});

/* ================= אודות ================= */
let aboutText='';
function openAbout(){
  document.querySelector('#hMenu').classList.remove('open');
  const aboutT=typeof cleanOff161==='function'?cleanOff161(aboutText):aboutText;const custom=aboutT?'<p>'+esc(aboutT).replace(/\n/g,'<br>')+'</p>':'';
  document.querySelector('#aboutBody').innerHTML=
    '<div style="text-align:center;margin:6px 0 10px">'+logoSvg().replace('class="logo"','class="logo" style="height:70px"')+'</div>'+
    T('<p>את האתר <b>"רשימת קניות"</b> פיתח <b>אברך</b>, כדי <b>לעזור לכולם</b> — שיהיה הכי קל בבית, בקניות ובהכנות לשבת 🕯️</p>'+
      '<p>🛡️ האתר <b>פתוח לכולם — עם או בלי נטפרי</b>, וגם <b>מאושר בנטפרי</b> למשתמשי נטפרי.</p>'+
      '<p>האתר נועד לעזור ולחסוך <b>זמן וכסף</b>: רשימות קניות משותפות לכל המשפחה, השוואת מחירים בין הרשתות, תאריך עברי, חגים ופרשת השבוע, ועוזרת חכמה — יאמי 👩‍🍳.</p>',
      '<p><b>Shopping List</b> was built by a kollel scholar to help everyone — making home life, shopping and Shabbat preparations as easy as possible 🕯️</p>'+
      '<p>🛡️ Approved on NetFree, for NetFree users.</p>'+
      '<p>It helps you save <b>time and money</b>: shared family lists, price comparison between stores, the Hebrew date, holidays and the weekly parasha, and a smart assistant — Yami 👩‍🍳.</p>')+
    custom+
    '<h3>💌 '+T('כל הערה והארה תבוא בברכה — נשמח לשמור איתכם על קשר','We welcome every comment — let\'s keep in touch')+'</h3>'+
    '<p>'+T('אפשר לכתוב לנו למייל:','Email us:')+' <a href="mailto:'+CONTACT_EMAIL+'?subject='+encodeURIComponent(T('רשימת קניות — הערה','Shopping List — feedback'))+'" dir="ltr">'+CONTACT_EMAIL+'</a> <button type="button" class="pr-act" id="copyMail">📋</button></p>'+
    '<div class="form"><textarea id="fbText" placeholder="'+T('או לכתוב כאן — מה אפשר לשפר? מה חסר?','Or write here — what can we improve?')+'" maxlength="3000"></textarea><button id="fbSend">'+T('שליחה למנהל האתר','Send to the site team')+'</button></div>'+
    '<p class="about-copy" style="text-align:center;margin-top:16px">© '+T('כל הזכויות שמורות ל-YAMSHOPPING2026','All rights reserved to YAMSHOPPING2026')+' · <a href="privacy.html" target="_blank" rel="noopener" style="color:inherit">'+T('מדיניות פרטיות','Privacy policy')+'</a> · <a href="accessibility.html" target="_blank" rel="noopener" style="color:inherit">'+T('הצהרת נגישות','Accessibility statement')+'</a></p>';
  document.querySelector('#aboutOverlay').classList.add('open');
}
document.querySelector('#miAbout').onclick=openAbout;
document.querySelector('#btnCloseAbout').onclick=()=>document.querySelector('#aboutOverlay').classList.remove('open');
document.querySelector('#aboutOverlay').addEventListener('click',async e=>{
  if(e.target.id==='aboutOverlay'){e.target.classList.remove('open');return;}
  if(e.target.id==='copyMail'){try{await navigator.clipboard.writeText(CONTACT_EMAIL);flash('📋 '+CONTACT_EMAIL);}catch(err){(await uiPrompt('',CONTACT_EMAIL));}return;}
  if(e.target.id==='fbSend'){
    const msg=document.querySelector('#fbText').value.trim();if(!msg)return;
    if(hasProfanity(msg)){flash('🙏 נא לכתוב בלשון נקייה');return;}
    if(!sb||!authUser){flash('צריך להיות מחוברים כדי לשלוח');return;}
    const {error}=await sb.from('feedback').insert({message:msg.slice(0,3000),user_id:authUser.id});
    if(error)flash('⚠️ לא נשלח: '+error.message);else{document.querySelector('#fbText').value='';flash('💌 תודה רבה! ההודעה נשלחה');}
  }
});

/* ================= פנייה בלשון זכר/נקבה ================= */
function GW(fem,masc){return state.gender==='m'?masc:fem;}
function updateGenderLabel(){const el=document.querySelector('#miGenderLabel');if(el)el.textContent='פנייה: '+(state.gender==='m'?'זכר':'נקבה');}
document.querySelector('#miGender').onclick=()=>{
  state.gender=state.gender==='m'?'f':'m';save();updateGenderLabel();
  flash(state.gender==='m'?'🗣️ מעכשיו פונים אליך בלשון זכר':'🗣️ מעכשיו פונים אלייך בלשון נקבה');
  document.querySelector('#hMenu').classList.remove('open');
};

/* ================= סיום קנייה → היסטוריה (עם ✓✓ כחולים) ================= */
/* סיום קנייה: אם סימנת חלק מהפריטים — רק הם עוברים להיסטוריה, והשאר נשארים ברשימה לחנות הבאה */
/* קנייה אחת = רשומה אחת: סיום קנייה וקבלה מאותו יום (ומאותה חנות, כשהיא ידועה בשתיהן) מתאחדים — שהקנייה לא תיספר פעמיים */
var lastFinishTwin=null;
function localDay(ts){const d=new Date(ts);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function sameShop(a,b){a=norm(a||'').toLowerCase();b=norm(b||'').toLowerCase();return !a||!b||a.includes(b)||b.includes(a);}
function findTwinTrip(ts,store,receipt){const k=localDay(ts);return (state.history||[]).find(h=>h&&!h.linked&&!!h.receipt===receipt&&localDay(h.ts)===k&&sameShop(h.store,store))||null;}
function finishList(silent,opts){
  opts=opts||{};const l=curList();lastFinishTwin=null;
  if(!l.items.length){if(!silent)flash('הרשימה כבר ריקה 🙂');return 0;}
  const anyDone=l.items.some(i=>i.done);
  const only=opts.only||(anyDone?'done':'all');
  const take=only==='done'?l.items.filter(i=>i.done):l.items.slice();
  if(!take.length){if(!silent)flash('אין פריטים מסומנים 🙂');return 0;}
  const store=String(opts.store||'').trim().slice(0,40);
  const twin=findTwinTrip(Date.now(),store,true);
  /* כבר הועלתה קבלה מהקנייה הזו — הסימונים מצטרפים אליה (הקבלה, עם המחירים, היא הרשומה), ולא נוספת קנייה שנייה */
  if(twin){twin.linked=true;twin.listItems=take.map(i=>({n:i.n,q:i.q,e:i.e,c:i.c,note:i.note||undefined}));if(!twin.store&&store)twin.store=store;lastFinishTwin=twin;}
  else state.history.unshift({ts:Date.now(),listName:l.name,by:(state.user&&state.user.name)||'',store,items:take.map(i=>({n:i.n,q:i.q,e:i.e,c:i.c,note:i.note||undefined}))});
  const ids=new Set(take.map(i=>i.id));tombAdd('items',take);l.items=l.items.filter(i=>!ids.has(i.id));
  save();render();
  const left=l.items.length;
  flash('✅ '+take.length+' '+T('פריטים עברו להיסטוריה','items moved to history')+(store?' · 🏪 '+store:'')+(left?' · '+T('נשארו '+left+' ברשימה','left: '+left):'')+(twin?' · 🧾 '+T('צורף לקבלה מאותו יום — לא נספר פעמיים','joined to the receipt from the same day — not counted twice'):''));
  return take.length;
}
document.querySelector('#miFinish').onclick=()=>{document.querySelector('#hMenu').classList.remove('open');openFinish();};

/* ================= ניהול (רק למנהל האתר) ================= */
async function adminFetch(){
  const out={users:[],kb:[],fb:[]};if(!sb||!isStaff())return out;
  const adm=isAdmin();
  const [u,k,f]=await Promise.all([
    !adm?{data:[]}:sb.from('profiles').select('id,name,email,created_at,last_seen').order('created_at',{ascending:false}).limit(1000),
    sb.from('bot_knowledge').select('id,question,answer').eq('status','pending').order('created_at'),
    !adm?{data:[]}:sb.from('feedback').select('id,name,email,message,created_at,is_read').order('created_at',{ascending:false}).limit(50)]);
  out.users=u.data||[];out.kb=k.data||[];out.fb=f.data||[];return out;
}
const isOnline=u=>Date.now()-new Date(u.last_seen).getTime()<5*60*1000;
function usersTable(users){
  return '<table class="utable"><tr><th></th><th>שם</th><th>מייל</th><th>הצטרף</th><th>נראה לאחרונה</th></tr>'+users.map(u=>'<tr><td>'+(isOnline(u)?'🟢':'⚪')+'</td><td>'+esc(u.name)+'</td><td dir="ltr" style="text-align:right">'+esc(u.email)+'</td><td>'+new Date(u.created_at).toLocaleDateString('he-IL')+'</td><td>'+new Date(u.last_seen).toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'})+'</td></tr>').join('')+'</table>';
}
async function openOnline(){
  document.querySelector('#hMenu').classList.remove('open');if(!isAdmin())return;
  const el=document.querySelector('#onlineList');el.innerHTML='<div class="empty">טוען...</div>';
  document.querySelector('#onlineOverlay').classList.add('open');
  const {users}=await adminFetch();const on=users.filter(isOnline);
  el.innerHTML='<h4 style="margin:6px 0">🟢 מחוברים עכשיו ('+on.length+')</h4>'+(on.length?on.map(u=>'<div class="mrow"><span>🟢</span><span>'+esc(u.name)+'</span><span style="color:var(--muted);font-size:12px" dir="ltr">'+esc(u.email)+'</span></div>').join(''):'<div class="empty">אף אחד לא מחובר כרגע</div>');
}
async function renderAdminPanel(){
  const box=document.querySelector('#adminBody');if(!isStaff()){box.innerHTML='';return;}
  box.innerHTML='<div class="empty">טוען...</div>';
  const d=await adminFetch();
  let html='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px"><button class="btn" onclick="openBO()">🏢 פתיחת הבק אופיס המלא</button></div>';
  if(isAdmin())html+='<h4>👥 המשתמשים שהצטרפו ('+d.users.length+') · מחוברים עכשיו: '+d.users.filter(isOnline).length+'</h4><div style="overflow-x:auto;margin:6px 0 14px">'+usersTable(d.users)+'</div>';
  html+='<h4 style="margin-top:14px">🧠 דברים שלימדו את הבוט — ממתינים ('+d.kb.length+')</h4>';
  html+=d.kb.length?d.kb.map(k=>'<div class="mrow" style="flex-wrap:wrap"><span style="flex:1">❓ '+esc(k.question)+'<br>💬 '+esc(k.answer)+' <small style="color:var(--muted)">'+crSlot('kb',k.id)+'</small></span><button data-kapprove="'+k.id+'">✅</button><button data-kreject="'+k.id+'" style="background:#b23b3b">🗑️</button></div>').join(''):'<div class="empty">אין</div>';
  if(isAdmin())html+='<h4 style="margin-top:14px">💌 הערות אחרונות</h4>'+(d.fb.length?d.fb.slice(0,10).map(f=>'<div class="grp" style="margin-top:6px;font-size:13px"><b>'+esc(f.name)+'</b> <span dir="ltr" style="color:var(--muted)">'+esc(f.email)+'</span><div style="white-space:pre-wrap">'+esc(f.message)+'</div></div>').join(''):'<div class="empty">אין הערות</div>');
  box.innerHTML=html;
}
document.querySelector('#adminBody').addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b||!isStaff())return;
  const ds=b.dataset;let q=null;
  if(ds.kapprove)q=sb.from('bot_knowledge').update({status:'approved'}).eq('id',ds.kapprove);
  if(ds.kreject)q=sb.from('bot_knowledge').update({status:'rejected'}).eq('id',ds.kreject);
  if(!q)return;const {error}=await q;flash(error?'⚠️ '+error.message:'✔️ בוצע');renderAdminPanel();loadPublicData();
});
document.querySelector('#miOnline').onclick=openOnline;
document.querySelector('#btnCloseOnline').onclick=()=>document.querySelector('#onlineOverlay').classList.remove('open');
document.querySelector('#onlineOverlay').addEventListener('click',e=>{if(e.target.id==='onlineOverlay')e.target.classList.remove('open');});
document.querySelector('#miAdmin').onclick=()=>{document.querySelector('#hMenu').classList.remove('open');if(!isStaff())return;renderAdminPanel();document.querySelector('#adminOverlay').classList.add('open');};
document.querySelector('#miBackoffice').onclick=()=>{document.querySelector('#hMenu').classList.remove('open');openBO();};
document.querySelector('#btnCloseAdmin').onclick=()=>document.querySelector('#adminOverlay').classList.remove('open');
document.querySelector('#adminOverlay').addEventListener('click',e=>{if(e.target.id==='adminOverlay')e.target.classList.remove('open');});

/* ================= טאבים וכפתורים ================= */
let tab='list';
function setTab(t){tab=t;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.t===(t==='stores'?'prices':t)));
  document.querySelector('#paneList').classList.toggle('on',t==='list');
  document.querySelector('#paneHist').classList.toggle('on',t==='hist');
  document.querySelector('#paneHome').classList.toggle('on',t==='home');
  document.querySelector('#panePrices').classList.toggle('on',t==='prices');
  document.querySelector('#paneStores').classList.toggle('on',t==='stores');
  document.querySelector('#inputRow').classList.toggle('on',t!=='hist'&&t!=='prices'&&t!=='stores');
  if(t==='prices')renderPrices();
  if(t==='stores')openStoresTab();
  if(t==='hist'&&paneStale.hist){paneStale.hist=0;renderHist();}
  if(t==='home'&&paneStale.home){paneStale.home=0;renderHome();}
  state.lastTab=t;save(true);}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.t));
function sendCurrent(){const v=document.querySelector('#inText').value.trim();if(!v)return;
  if(hasProfanity(v)){flash('🙏 נא לכתוב בלשון נקייה');return;}
  document.querySelector('#inText').value='';
  const q=document.querySelector('#inQty').value.trim();document.querySelector('#inQty').value='';
  const its=parseItems(v);if(its.length)its.forEach(i=>addItem(i.name,i.qty||q));else addItem(v,q);}
document.querySelector('#btnSend').onclick=sendCurrent;
document.querySelector('#inText').addEventListener('keydown',e=>{if(e.key==='Enter')sendCurrent();});
document.querySelector('#chips').addEventListener('click',async e=>{
  const dup=e.target.dataset.dup;
  if(dup){const l=state.lists.find(x=>x.id===dup);if(l)dupList(l.name,l.items);return;}
  const del=e.target.dataset.del;
  if(del){if((await uiConfirm('למחוק את הרשימה?'))){tombAdd('lists',[del]);state.lists=state.lists.filter(l=>l.id!==del);if(state.active===del)state.active=state.lists[0].id;save();render();}return;}
  if(e.target.dataset.new){const n=(await uiPrompt('שם הרשימה החדשה:'));if(n&&n.trim()&&!hasProfanity(n)){const l={id:uid(),name:n.trim().slice(0,40),items:[],created:Date.now()};state.lists.push(l);state.active=l.id;save();render();}return;}
  const c=e.target.closest('.chip');if(c&&c.dataset.id){state.active=c.dataset.id;save(true);render();}});
document.querySelector('#favs').addEventListener('click',e=>{
  if(e.target.dataset.favx){state.favHidden=Array.from(new Set((state.favHidden||[]).concat(e.target.dataset.favx)));save(true);render();flash(T('הוסר מהשורה — אפשר להחזיר ב-✏️ ← ⚙️','Removed — restore via ✏️ → ⚙️'));return;}
  if(e.target.dataset.favhide){state.hideFavs=true;save(true);render();flash(T('שורת המועדפים הוסתרה — אפשר להחזיר בתפריט ⚙️','Hidden — restore from ⚙️ menu'));return;}
  if(e.target.dataset.fav)addItem(e.target.dataset.fav,'');});
document.querySelector('#banner').addEventListener('click',e=>{
  if(e.target.dataset.planadd){(state.plans[new Date().getDay()]||[]).forEach(n=>{if(!curList().items.find(i=>i.n===n&&!i.done))addItem(n,'');});}});
document.querySelector('#paneList').addEventListener('click',e=>{
  if(e.target.closest('[data-cheapopen]')){storesView='cmp';if(typeof cmpFirst!=='undefined')cmpFirst=false;setTab('stores');}});
document.querySelector('#paneList').addEventListener('click',async e=>{
  const el=e.target.closest('[data-tgl],[data-delitem],[data-qm],[data-qp],[data-qe],[data-finishpart],[data-basket],[data-reorder],[data-due]');if(!el)return;
  const d=el.dataset;
  if(d.tgl){const i=curList().items.find(x=>x.id===d.tgl);if(i){i.done=!i.done;i.ts=Date.now();save();render();}return;}
  if(d.delitem){removeItem(d.delitem);return;}
  if(d.qm||d.qp){const id=d.qm||d.qp;const i=curList().items.find(x=>x.id===id);if(i)setItemQty(id,stepQty(i.q,d.qp?1:-1));return;}
  if(d.qe){const i=curList().items.find(x=>x.id===d.qe);if(!i)return;const v=(await uiPrompt(T('כמות עבור "'+i.n+'" (למשל 2, 1.5 קג, 3 חבילות):','Quantity for "'+i.n+'":'),i.q||'1'));if(v===null)return;if(hasProfanity(v)){flash('🙏');return;}setItemQty(i.id,v.trim()==='1'?'':v);return;}
  if(d.finishpart){openFinish();return;}
  if(d.basket){openBasket();return;}
  if(d.reorder){reorderLast();return;}
  if(d.due){const its=dueItems();its.forEach(x=>addItem(x.n,''));flash('⏰ '+T('הוספתי '+its.length+' מוצרים לפי ההרגלים שלך','Added '+its.length+' items'));return;}
});
document.querySelector('#paneHist').addEventListener('click',async e=>{
  const hb=e.target.closest('[data-hdup],[data-hadd]');
  if(hb){const h=state.history[+(hb.dataset.hdup||hb.dataset.hadd)];if(!h)return;
    if(hb.dataset.hdup){dupList(h.listName,h.items);setTab('list');return;}
    const n=addMany(h.items||[]);flash(n?'➕ '+T('הוספתי '+n+' מוצרים לרשימה "'+curList().name+'"','Added '+n+' items'):T('הכל כבר ברשימה ✔','Everything is already on the list ✔'));if(n)setTab('list');return;}
  if(e.target.dataset.clearhist){if((await uiConfirm('לנקות את כל ההיסטוריה?'))){state.history=[];save();renderHist();}}});
document.querySelector('#paneHome').addEventListener('click',e=>{
  if(e.target.id==='btnMissing'){state.showMissing=!state.showMissing;save(true);renderHome();return;}
  if(e.target.id==='pantryAddBtn'){const v=document.querySelector('#pantryAddInput').value;const c=document.querySelector('#pantryAddCat').value;if(!hasProfanity(v)&&addCustomPantryItem(v,c))document.querySelector('#pantryAddInput').value='';return;}
  const editT=e.target.closest('[data-edit]');if(editT){renameCustomPantryItem(editT.dataset.edit);return;}
  const rmT=e.target.closest('[data-rm]');if(rmT){removeCustomPantryItem(rmT.dataset.rm);return;}
  const panT=e.target.closest('[data-pan]');
  if(panT){const n=panT.dataset.pan;pantrySet(n,!pantryHas(n));save();
    const q=document.querySelector('#homeSearch');if(q&&q.value)renderHomeCats();else renderHome();
    flash(pantryHas(n)?('🏠 נרשם שיש: '+n):('📝 נרשם שאין: '+n));return;}
  const missT=e.target.closest('[data-missing]');if(missT){addItem(missT.dataset.missing,'');return;}
  if(e.target.dataset.addall){const missing=BASE.filter(n=>!pantryHas(n));missing.forEach(n=>addItem(n,''));flash('הוספתי '+missing.length+' מצרכים לרשימה 🧺');}});
/* חיפוש במקרר — מעדכן רק את התוצאות, שדה החיפוש נשאר פתוח להקלדה */
document.querySelector('#paneHome').addEventListener('input',e=>{if(e.target.id==='homeSearch'){state.homeQ=e.target.value;save(true);renderHomeCats();}});
document.querySelector('#paneHome').addEventListener('keydown',e=>{
  if(e.target.id==='pantryAddInput'&&e.key==='Enter'){const v=e.target.value;const c=document.querySelector('#pantryAddCat').value;if(!hasProfanity(v)&&addCustomPantryItem(v,c))e.target.value='';}});
document.querySelector('#undoBtn').onclick=()=>{if(undoAction)undoAction();document.querySelector('#undoBox').classList.remove('show');undoAction=null;clearTimeout(undoTimer);};
document.querySelector('#btnMenu').onclick=e=>{e.stopPropagation();document.querySelector('#hMenu').classList.toggle('open');};
document.querySelector('#hMenu').addEventListener('click',e=>{
  const b=e.target.closest('[data-forward]');if(!b)return;
  document.querySelector('#hMenu').classList.remove('open');document.querySelector('#'+b.dataset.forward).click();});
document.addEventListener('click',e=>{const m=document.querySelector('#hMenu');if(m.classList.contains('open')&&!m.contains(e.target)&&e.target.id!=='btnMenu')m.classList.remove('open');});
document.querySelector('#btnShare').onclick=()=>{document.querySelector('#shareRow').classList.toggle('open');bindShare();};
document.querySelector('#btnPrint').onclick=printList;
document.querySelector('#btnDark').onclick=()=>{state.dark=!state.dark;document.body.classList.toggle('dark',state.dark);save(true);if(window.th36Apply)th36Apply(th36Get());};
/* 🗂️ תצוגת קטגוריות: הבחירה נשמרת בחשבון (profiles.list_by_cat) ועוברת לכל מכשיר — אתר, אפליקציה ומחשב.
   null בענן = המשתמש עוד לא בחר מאז שזה נוסף; אז מעלים את מה שנבחר במכשיר הזה (אם בחר קטגוריות) */
function groupToCloud(id){if(sb&&id)sb.from('profiles').update({list_by_cat:!!state.group}).eq('id',id).then(()=>{},()=>{});}
document.querySelector('#btnGroup').onclick=()=>{state.group=!state.group;flash(state.group?'🗂️ תצוגת קטגוריות':'💬 תצוגת צ׳אט');save(true);renderList();groupToCloud(authUser&&authUser.id);};
{const _grpSigned=onSignedIn;onSignedIn=async function(user){const r=await _grpSigned.apply(this,arguments);
  if(sb&&user&&user.id)sb.from('profiles').select('list_by_cat').eq('id',user.id).maybeSingle().then(({data,error})=>{if(error||!data)return;
    if(data.list_by_cat==null){if(state.group)groupToCloud(user.id);return;}
    if(data.list_by_cat!==!!state.group){state.group=data.list_by_cat;save(true);renderList();}},()=>{});
  return r;};}
document.querySelector('#shCopy').onclick=async()=>{try{await navigator.clipboard.writeText(shareText());flash('הרשימה הועתקה ✓');}catch(e){(await uiPrompt('העתיקו מכאן:',shareText()));}};
document.querySelector('#shBackup').onclick=()=>{const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='yamh-backup-'+dayKey(new Date())+'.json';a.click();flash('גיבוי הורד 💾');};
document.querySelector('#shRestore').onclick=()=>document.querySelector('#fileRestore').click();
document.querySelector('#fileRestore').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);if(!d||!Array.isArray(d.lists))throw 0;
    const keep={user:state.user,room:state.room,follow:state.follow,dark:state.dark};
    SYNC_KEYS.forEach(k=>{if(d[k]!==undefined)state[k]=d[k];});Object.assign(state,keep);
    if(!state.lists.find(l=>l.id===state.active))state.active=state.lists[0].id;save();render();flash('📥 שוחזר מהגיבוי');}catch(err){flash('קובץ לא תקין 😕');}};
  r.readAsText(f);};
function renderCats(q){q=(q||'').trim();
  document.querySelector('#catList').innerHTML=CATS.map(c=>{
    const its=Object.keys(P).filter(n=>P[n].c===c&&(!q||n.includes(q)));if(!its.length)return '';
    return '<h4>'+CATE[c]+' '+c+'</h4><div class="pgrid">'+its.map(n=>'<button data-add="'+esc(n)+'">'+P[n].e+' '+esc(n)+'</button>').join('')+'</div>';
  }).join('')||'<div class="empty">לא נמצא 😕</div>';}
document.querySelector('#btnPlus').onclick=()=>{renderCats('');document.querySelector('#inCatSearch').value='';document.querySelector('#catQty').value='1';document.querySelector('#catOverlay').classList.add('open');};
document.querySelector('#btnCloseCat').onclick=()=>document.querySelector('#catOverlay').classList.remove('open');
document.querySelector('#catOverlay').addEventListener('click',e=>{if(e.target.id==='catOverlay')e.target.classList.remove('open');});
document.querySelector('#inCatSearch').oninput=e=>renderCats(e.target.value);
document.querySelector('#catList').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;const q=(document.querySelector('#catQty').value||'').trim();addItem(b.dataset.add,q==='1'?'':q);});
document.querySelector('#catQm').onclick=()=>{const el=document.querySelector('#catQty');el.value=stepQty(el.value,-1)||'1';};
document.querySelector('#catQp').onclick=()=>{const el=document.querySelector('#catQty');el.value=stepQty(el.value,1)||'1';};
(()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){document.querySelector('#btnMic').style.opacity=.4;return;}
 let rec=null;
 document.querySelector('#btnMic').onclick=()=>{if(rec){rec.stop();return;}
   rec=new SR();rec.lang='he-IL';rec.interimResults=false;
   rec.onresult=ev=>{document.querySelector('#inText').value=ev.results[0][0].transcript;sendCurrent();};
   rec.onend=()=>{document.querySelector('#btnMic').classList.remove('rec');rec=null;};
   rec.onerror=()=>{document.querySelector('#btnMic').classList.remove('rec');rec=null;flash('לא הצלחתי להקליט 😕');};
   document.querySelector('#btnMic').classList.add('rec');rec.start();flash('🎤 מקליט... מדברים עכשיו');};})();

if(window.top!==window.self){try{window.top.location=window.self.location;}catch(e){document.body.innerHTML='';}}
/* ================= אפליקציה לטלפון (PWA): התקנה, עבודה בלי אינטרנט ================= */
let deferredInstall=null;
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent||'');
/* העמוד נפתח מהעותק השמור בטלפון; אם ברקע נמצאה גרסה חדשה — ה-Service Worker מודיע כאן (ראו onNewVer66) */
try{if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{const d=e.data||{};if(d.type!=='yam-new-version')return;{const k=x=>String(x||'').replace(/^W\//,'').replace(/-(zstd|gzip|br|deflate)"$/,'"');if(d.served&&k(d.served)===k(d.latest))return;}window.__yamNewVer=d;/* נפתח עותק ישן מהשמור, והדף רק עכשיו עלה — טוענים מחדש מיד (בלי לחכות ללחיצה), כדי שלא יראו גרסה / עיצוב ישנים. לכל היותר פעם בדקה, כדי שלא ייטען שוב ושוב */try{const ae=document.activeElement;let last=0;try{last=+sessionStorage.getItem('yam_autoreload')||0;}catch(x){}if(performance.now()<12000&&Date.now()-last>60000&&!(ae&&/^(INPUT|TEXTAREA)$/.test(ae.tagName))){try{sessionStorage.setItem('yam_autoreload',String(Date.now()));}catch(x){}location.reload();return;}}catch(e){}if(typeof window.onNewVer66==='function')window.onNewVer66(d);});}catch(e){}
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{r.update().catch(()=>{});document.addEventListener('visibilitychange',()=>{if(!document.hidden)r.update().catch(()=>{});});}).catch(()=>{});});}
/* כפתור ההתקנה מופיע תמיד (גם כשהדפדפן לא מציע התקנה בעצמו), חוץ מכשכבר בתוך האפליקציה */
const inAndroidApp=/YamShoppingApp\//.test(navigator.userAgent||'');
function syncInstallBtn(){const b=document.querySelector('#miInstall');if(b)b.hidden=inAndroidApp||isStandalone();}
syncInstallBtn();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;syncInstallBtn();});
window.addEventListener('appinstalled',()=>{deferredInstall=null;flash(T('📲 האפליקציה הותקנה!','📲 App installed!'));});
async function installNow(){if(!deferredInstall)return false;deferredInstall.prompt();try{await deferredInstall.userChoice;}catch(e){}deferredInstall=null;return true;}
/* לחיצה אחת: אם הדפדפן מאפשר — מתקין ישר. אחרת (אייפון, או דפדפן שלא מאפשר) — הוראה קצרה למכשיר הזה בלבד */
document.querySelector('#miInstall').onclick=async()=>{
  document.querySelector('#hMenu').classList.remove('open');
  if(await installNow())return;
  const isAndroid=/Android/i.test(navigator.userAgent||'');
  const tip=isIOS?T('בספארי: לוחצים על כפתור השיתוף (ריבוע עם חץ) ← "הוספה למסך הבית".','In Safari: tap Share → "Add to Home Screen".')
    :isAndroid?T('בכרום: תפריט ⋮ ← "הוספה למסך הבית" או "התקנת האפליקציה".','In Chrome: menu ⋮ → "Add to Home screen" or "Install app".')
    :T('בכרום או אדג׳: לוחצים על סמל ההתקנה בצד ימין של שורת הכתובת.','In Chrome or Edge: click the install icon at the end of the address bar.');
  openSheet('📲 '+T('התקנת האפליקציה','Install the app'),'<p class="muted-note" style="margin:6px 0;line-height:1.8">'+tip+'</p>');
};
/* מחיקת חשבון — דרישה של Google Play */
document.querySelector('#miDelete').onclick=async()=>{
  document.querySelector('#hMenu').classList.remove('open');
  if(!sb||!authUser){flash(T('צריך להיות מחוברים','Sign in first'));return;}
  if(isOwner()){(await uiAlert(T('את חשבון בעל האתר אי אפשר למחוק מתוך האתר.','The site owner account cannot be deleted here.')));return;}
  if(!(await uiConfirm(T('למחוק את החשבון לצמיתות?\nיימחקו: השם, המייל, הרשימות שלך, ההיסטוריה והמעקבים.\nמחירים ותוכן ציבורי שפרסמת יישארו — בלי השם שלך.\nאי אפשר לבטל.','Delete your account permanently?\nYour name, email, lists, history and follows will be deleted. Prices and public content you posted stay, without your name. This cannot be undone.'))))return;
  const typed=(await uiPrompt(T('כדי לאשר, כתבו: מחק','To confirm, type: DELETE')));
  if(!typed||!['מחק','delete'].includes(typed.trim().toLowerCase())){flash(T('המחיקה בוטלה','Cancelled'));return;}
  const {data,error}=await sb.rpc('delete_my_account');
  if(error||data!=='deleted'){flash('⚠️ '+((error&&error.message)||data||''));return;}
  try{localStorage.removeItem(KEY);}catch(e){}
  flash(T('החשבון נמחק. תודה שהייתם איתנו 💚','Account deleted. Thank you 💚'));
  setTimeout(doLogout,800);
};
/* קיצורי דרך מהאייקון של האפליקציה (?tab=prices וכו') */
/* ================= אתחול ================= */
/* 🎨 עיצוב 2.0: הלוגו החדש (Yam עם ה-a בשקית). מצויר מהקובץ logo-2.svg, והצבעים שלו באים מהערכה (משתני --lg-*) */
window.yamLogo2=(cls)=>'<svg class="ylogo'+(cls?' '+cls:'')+'" viewBox="-4 6 195 144" role="img" aria-label="Yam shopping — ים שופינג"><use href="/logo-2.svg#yl"/></svg>';
document.querySelector('#brand').insertAdjacentHTML('afterbegin',yamLogo2());
/* 🏠 לחיצה על הלוגו (באתר ובאפליקציה) מחזירה לדף הראשי: סוגרת חלונות פתוחים ועוברת לרשימה (או לצ'אטים בתצוגת צ'אטים) */
{const br=document.querySelector('#brand');br.style.cursor='pointer';br.setAttribute('role','link');br.title=T('לדף הראשי','Home');
  br.addEventListener('click',e=>{if(e.target.closest('#btnBack'))return;
    document.querySelectorAll('.overlay.open,.sheet.open,#v8Sheet.open').forEach(o=>o.classList.remove('open'));
    const m=document.querySelector('#hMenu');if(m)m.classList.remove('open');
    setTab(document.body.classList.contains('chathome')?'chats':'list');try{window.scrollTo({top:0,behavior:'smooth'});}catch(err){window.scrollTo(0,0);}});}
{const ll=document.querySelector('#loginLogo');if(ll){ll.insertAdjacentHTML('beforeend',yamLogo2());ll.insertAdjacentHTML('afterend','<div class="ltag2" style="display:none">'+T('רשימה אחת לכל הבית. כולם מוסיפים, ורואים איפה הכי זול.','One list for the whole home. Everyone adds, and you see where it\'s cheapest.')+'</div>');}}

load();offSig=offSigNow();
document.body.classList.toggle('dark',state.dark);
applyLang();
updateGenderLabel();
let startTab=state.lastTab||'list';try{const qt=new URLSearchParams(location.search).get('tab');if(qt&&['list','hist','home','prices','stores'].includes(qt))startTab=qt;}catch(e){}
setTab(startTab);
render();
(async function boot(){
  /* הספרייה של השרת לא נטענה (בלי קליטה בפתיחה, או שסינון חסם אותה) — מי שכבר נכנס במכשיר הזה ממשיך מהנתונים שבמכשיר, בלי מסך כניסה */
  if(!sb){if(state.user&&state.user.offline){afterEnter();}else if(state.user&&state.user.id){hideLogin();afterEnter();offBar();}else showLogin();return;}
  sb.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY')setTimeout(openPwModal,300);
    if(event==='SIGNED_IN'&&session&&(!authUser||authUser.id!==session.user.id))setTimeout(()=>onSignedIn(session.user),0);
    if(event==='TOKEN_REFRESHED'&&session)authUser=session.user;
    if(event==='SIGNED_OUT'&&authUser){authUser=null;signedInId=null;stopCloud();applyAdminUi();showLogin();}
  });
  /* קישור מהמייל דרך הדומיין שלנו (?th=...&type=...) — מאמתים כאן, כדי שבמייל יופיע רק yamshopping.com */
  try{const qp=new URLSearchParams(location.search),th=qp.get('th'),tp=qp.get('type');
    if(th&&['email','signup','recovery','magiclink','invite','email_change'].includes(tp)){
      qp.delete('th');qp.delete('type');history.replaceState(null,'',location.pathname+(qp.toString()?'?'+qp:'')+location.hash);
      const {error}=await sb.auth.verifyOtp({token_hash:th,type:tp});
      if(error)setTimeout(()=>flash('⚠️ הקישור כבר נוצל או שפג תוקפו — אפשר לבקש קישור חדש'),500);
    }}catch(e){}
  try{
    const {data,error:se}=await sb.auth.getSession();
    if(data&&data.session){if(!authUser)await onSignedIn(data.session.user);}
    else if(state.user&&state.user.guest){afterEnter();}
    /* בלי קליטה (בחנות) ותוקף הכניסה צריך חידוש — לא מוציאים מהחשבון: פותחים את הרשימה מהטלפון, ומתחברים כשהקליטה חוזרת */
    else if(state.user&&state.user.id&&(isOffline()||se)){hideLogin();afterEnter();offBar();offRetryLater();}
    else{if(state.user&&!state.user.offline){state.user=null;save(true);}showLogin();}
  }catch(e){if(state.user&&state.user.id){hideLogin();afterEnter();offRetryLater();}else showLogin();}
})();
