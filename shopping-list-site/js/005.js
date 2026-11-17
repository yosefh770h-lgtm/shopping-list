
/* הקישור המדויק שדרכו נכנסו והדף שממנו הגיעו — נשמרים לפני שהאתר מנקה פרמטרים מהכתובת */
try{window.__yamLand=location.href;window.__yamRef=document.referrer||'';}catch(e){}
/* מקום מלא בדפדפן (בעיקר מתמונות של מוצרים) — מפנים מקום ומנסים שוב, ולא נותנים לאתר להיתקע */
(function(){try{const S=Storage.prototype,orig=S.setItem;
  const isQuota=e=>!!e&&(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||e.code===22||e.code===1014);
  /* שלב 1: מוחקים מטמונים (אפשר לבנות מחדש). שלב 2 (רק אם עדיין אין מקום): מורידים תמונות של מוצרים */
  window.__lsFree=function(keep,images){
    try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k!==keep&&/cache/i.test(k))localStorage.removeItem(k);}}catch(e){}
    if(!images)return;
    try{const k='yam_myprod_v1';if(k!==keep){const m=JSON.parse(localStorage.getItem(k)||'{}');Object.keys(m).forEach(n=>{if(m[n]&&m[n].image)delete m[n].image;});orig.call(localStorage,k,JSON.stringify(m));}}catch(e){try{localStorage.removeItem('yam_myprod_v1');}catch(e2){}}};
  S.setItem=function(k,v){if(this!==window.localStorage)return orig.call(this,k,v);window.__lsFull=false;
    try{return orig.call(this,k,v);}catch(e){if(!isQuota(e))throw e;
      window.__lsFree(k,false);try{return orig.call(this,k,v);}catch(e2){}
      window.__lsFree(k,true);try{return orig.call(this,k,v);}catch(e3){window.__lsFull=true;console.warn('storage full',k);throw e3;}}};
}catch(e){}})();
/* ================= עזרים ================= */
/* העדפות אישיות למכשיר: שפה, מטבע, ישראל/חו"ל */
let prefs={lang:'he',currency:'ILS',diaspora:false};
try{prefs=Object.assign(prefs,JSON.parse(localStorage.getItem('yamh_prefs')||'{}'));}catch(e){}
/* שפה בפתיחה הראשונה: רק למשתמש חדש (בלי נתונים שמורים) שהטלפון/המחשב שלו לא בעברית ולא בשעון ישראל — אנגלית. מי שכבר משתמש לא מושפע */
try{const sp=JSON.parse(localStorage.getItem('yamh_prefs')||'{}');if(!sp.lang&&!localStorage.getItem('yamh_app_v1')){const nl=String((navigator.languages&&navigator.languages[0])||navigator.language||'he').toLowerCase();let tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(e){}
  if(!/^(he|iw|ar|yi)/.test(nl)&&!/Jerusalem|Tel_Aviv|Hebron|Gaza/.test(tz))prefs.lang='en';}}catch(e){}
function savePrefs(){try{localStorage.setItem('yamh_prefs',JSON.stringify(prefs));}catch(e){}}
/* 📱 באפליקציה לאנדרואיד: מה שמדבר על "האתר" כמקום שנמצאים בו — נכתב "האפליקציה" (יציאה, אודות, שפה, נעילה...).
   "צוות האתר", "כתובת האתר" וכדומה נשארים כמו שהם */
const IN_APP_UA=/YamShoppingApp\//.test(navigator.userAgent||'');
const APP_WORDS=[['יציאה מהאתר','יציאה מהאפליקציה'],['יצאת מהאתר','יצאת מהאפליקציה'],['לצאת מהאתר','לצאת מהאפליקציה'],['שיוצאים מהאתר','שיוצאים מהאפליקציה'],
  ['אודות האתר','אודות האפליקציה'],['חוות דעת על האתר','חוות דעת על האפליקציה'],['שפת האתר','שפת האפליקציה'],['נעילת האתר','נעילת האפליקציה'],['האתר נעול','האפליקציה נעולה'],
  ['מה חדש באתר','מה חדש באפליקציה'],['כשהאתר סגור','כשהאפליקציה סגורה'],['כך יופיע באתר','כך יופיע באפליקציה'],['בכל כניסה לאתר','בכל כניסה לאפליקציה']];
const appTxt=s=>{if(!IN_APP_UA||typeof s!=='string'||s.indexOf('אתר')<0)return s;APP_WORDS.forEach(([a,b])=>{if(s.indexOf(a)>=0)s=s.split(a).join(b);});return s;};
const T=(he,en)=>prefs.lang==='en'?en:appTxt(he);
const $=s=>document.querySelector(s);
const esc=s=>String(s==null||s===false?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const hebDate=d=>{try{if(window.hebcal)return prefs.lang==='en'?new hebcal.HDate(d).render('en'):new hebcal.HDate(d).renderGematriya(true);}catch(e){}return new Intl.DateTimeFormat('he-u-ca-hebrew',{day:'numeric',month:'long',year:'numeric'}).format(d);};
/* תאריך פגום (למשל מנתונים ישנים/מסונכרנים) לא מפיל את הדף — מחזירים מחרוזת ריקה */
const okDate=d=>{const t=d instanceof Date?d.getTime():new Date(d).getTime();return isFinite(t);};
const fmtDate=d=>okDate(d)?new Intl.DateTimeFormat(prefs.lang==='en'?'en-US':'he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d):'';
const fmtTime=d=>okDate(d)?new Intl.DateTimeFormat('he-IL',{hour:'2-digit',minute:'2-digit'}).format(d):'';
const dayKey=d=>new Date(d).toISOString().slice(0,10);
function norm(s){return (s||'').replace(/['’`׳"]/g,'').replace(/\s+/g,' ').trim();}
function flash(m){const f=document.querySelector('#flash');f.textContent=m;f.classList.add('show');clearTimeout(f._t);f._t=setTimeout(()=>f.classList.remove('show'),2400);}
let undoAction=null,undoTimer=null;
function showUndo(text,action){
  undoAction=action;
  const box=document.querySelector('#undoBox');
  document.querySelector('#undoText').textContent=text;
  box.classList.add('show');
  clearTimeout(undoTimer);undoTimer=setTimeout(()=>{box.classList.remove('show');undoAction=null;},5000);
}

/* לוגו — כתב יד, שתי שורות, גל לא מושלם */
function logoSvg(){return '<img class="logo" src="'+location.origin+'/logo.png" alt="ים שופינג — YamShopping">';}

/* ================= מאגר מוצרים ================= */
const CATS=['מוצרי חלב','ירקות','פירות','לחמים','בשר ועוף','דגים','שתייה','רטבים וממרחים','שימורים','מאפים וחטיפים','מוצרי ניקיון','היגיינה','אחר'];
const CATE={'מוצרי חלב':'🧀','ירקות':'🥕','פירות':'🍎','לחמים':'🍞','בשר ועוף':'🍗','דגים':'🐟','שתייה':'🥤','רטבים וממרחים':'🫙','שימורים':'🥫','מאפים וחטיפים':'🍪','מוצרי ניקיון':'🧼','היגיינה':'🧴','אחר':'🛒'};
const P={};
[['חלב','🥛'],['חלב סויה','🥛'],['שוקו','🥛'],['יוגורט','🥛'],['מעדן','🍮'],['קוטג׳','🥣'],['גבינה','🧀'],['גבינה לבנה','🧀'],['גבינה צהובה','🧀'],['שמנת','🥛'],['חמאה','🧈'],['ביצים','🥚'],
['לחם','🍞'],['פיתה','🫓'],['לחמניות','🥖'],
['עגבניות','🍅'],['עגבניות שרי','🍅'],['מלפפונים','🥒'],['גזר','🥕'],['בצל','🧅'],['תפוחי אדמה','🥔'],['פלפלים','🫑'],['חסה','🥬'],['שום','🧄'],['ברוקולי','🥦'],['תירס','🌽'],['זיתים','🫒'],
['תפוחים','🍎'],['בננות','🍌'],['תותים','🍓'],['ענבים','🍇'],['תפוזים','🍊'],['לימונים','🍋'],['אבוקדו','🥑'],['אבטיח','🍉'],['מנגו','🥭'],
['עוף','🍗'],['עוף טחון','🍗'],['הודו טחון','🦃'],['חזה עוף','🍗'],['חזה עוף פרוס לשניצלים','🍗'],['בשר טחון','🥩'],['קציצות','🥩'],['קבב','🥩'],['נקניקים','🌭'],
['טונה','🐟'],['סלמון','🐟'],
['מים','💧'],['שישיית מים','💧'],['מים בטעמים','🍹'],['קולה','🥤'],['פפסי','🥤'],['מיץ','🧃'],['מיץ תפוזים','🧃'],['קפה','☕'],['תה','🍵'],['בירה','🍺'],['יין','🍷'],
['רוטב סויה','🍶'],['רוטב ברביקיו','🥫'],['רוטב צ׳ילי מתוק','🌶️'],['קטשופ','🥫'],['מיונז','🥫'],['חרדל','🥫'],['שמן זית','🫒'],['חומוס','🥣'],['טחינה','🥣'],['ממרח שוקולד','🍫'],['ממרח חלווה','🍯'],['דבש','🍯'],['סוכר','🫙'],['קמח','🫙'],['אורז','🍚'],['פסטה','🍝'],['מלח','🧂'],
['חטיף במבה','🥜'],['ביסלי','🥜'],['עוגיות','🍪'],['קרקרים','🥨'],['פופקורן','🍿'],['שוקולד','🍫'],['גלידה','🍦'],
['סבון כלים','🧼'],['סבון ידיים','🧼'],['נייר טואלט','🧻'],['נייר סופג','🧻'],['מגבונים','🧻'],['אבקת כביסה','🧺'],['מרכך','🧺'],['שקיות זבל','🗑️'],
['שמפו','🧴'],['משחת שיניים','🪥'],['מברשת שיניים','🪥'],['טישו לאף','🤧'],['קיסמי אוזניים','👂'],
['פרחים','💐'],['מתנה לחג','🎁'],['נרות','🕯️']
].forEach(r=>{P[r[0]]={e:r[1]};});
const CATR=[['שימורים',/^(?!.*(קפוא|טרי|קמח|שמן|פתית|חטי[ףפ]|דגני|סטייק|פילה|במבה))(?=.*(שימור|בקופס|קופסת|קופסאות|משומר|טונה|סרדינ|תירס|זיתים|חמוצ|כבוש|רסק|מרוסק|אפונה|שעועית|גרגרי חומוס|לקט ירקות|בסירופ|חלב קוקוס|קורנביף|ארטישוק|(?:^|\s)פול(?:\s|$)))/],['בשר ועוף',/(עוף|הודו|בשר|קבב|נקניק|שניצל|כבד|קציצ)/],['מוצרי חלב',/(חלב|גבינ|קוטג|שמנת|חמאה|יוגורט|מעדן|ביצ|שוקו)/],['לחמים',/(לחם|פיתה|לחמנ|בייגל)/],['שתייה',/(מים|קולה|פפסי|מיץ|קפה|^תה(?: |$)| תה(?: |$)|בירה|יין|שתייה|סודה)/],['רטבים וממרחים',/(רוטב|קטשופ|מיונז|חרדל|סויה|שמן|חומוס|טחינ|ממרח|דבש|סוכר|קמח|אורז|פסטה|מלח|תבלי[ןנ]|זית|תירס)/],['ירקות',/(ירק|עגבני|מלפפו[ןנ]|גזר|בצל|חסה|כרוב|שום|פלפל|ברוקולי|תרד|שרי)/],['פירות',/(תפוח|בננ|תות|ענב|תפוז|לימו[ןנ]|אבוקדו|אבטיח|מנגו|אננס|פירות)/],['דגים',/(טונה|סלמון|בורי|סרדינ)/],['מאפים וחטיפים',/(חטי[ףפ]|במבה|ביסלי|עוגי|קרקר|פופקורן|שוקולד|גלידה|ופל)/],['מוצרי ניקיון',/(נייר טואלט|נייר סופג|מגבונ|אבקת כביסה|מרכך|ניקיון|שקיות זבל|סבון כלים)/],['היגיינה',/(שמפו|משחת|מברשת שיניים|טישו|קיסמי|אוזניים|סבון ידיים)/],['אחר',/(פרח|מתנה|נרות|בלו[ןנ])/]];
CATS.forEach(c=>Object.keys(P).forEach(n=>{if(!P[n].c){for(const[cc,rx]of CATR){if(rx.test(n)){P[n].c=cc;break;}}if(!P[n].c)P[n].c='אחר';}}));
const EXTRA=[
['יוגורט טבעי','🥛','מוצרי חלב'],['גבינת שמנת','🧀','מוצרי חלב'],['לאבנה','🧀','מוצרי חלב'],['חלב עיזים','🥛','מוצרי חלב'],
['כרוב לבן','🥬','ירקות'],['כרוב סגול','🥬','ירקות'],['תרד','🥬','ירקות'],['פטריות','🍄','ירקות'],['בטטה','🍠','ירקות'],['קישוא','🥒','ירקות'],['חציל','🍆','ירקות'],['סלק','🥕','ירקות'],['צנון','🥕','ירקות'],['כוסברה','🌿','ירקות'],['פטרוזיליה','🌿','ירקות'],['נענע','🌿','ירקות'],
['קיווי','🥝','פירות'],['אפרסק','🍑','פירות'],['נקטרינה','🍑','פירות'],['משמש','🍑','פירות'],['רימון','🍎','פירות'],['דובדבנים','🍒','פירות'],['אננס','🍍','פירות'],['פירות יער','🫐','פירות'],
['כבד עוף','🍗','בשר ועוף'],['נתחי בקר','🥩','בשר ועוף'],['כרעיים עוף','🍗','בשר ועוף'],['אנטריקוט','🥩','בשר ועוף'],
['פילה סלמון','🐟','דגים'],['בורי','🐟','דגים'],['דג אמנון','🐟','דגים'],
['לחם מלא','🍞','לחמים'],['חלה','🍞','לחמים'],['בייגל','🥯','לחמים'],
['סודה','🥤','שתייה'],['מיץ ענבים','🧃','שתייה'],['משקה אנרגיה','🥤','שתייה'],['שוקו בקרטון','🧃','שתייה'],
['עדשים','🫘','רטבים וממרחים'],['שעועית','🫘','שימורים'],['פתיתים','🍚','רטבים וממרחים'],['קוסקוס','🍚','רטבים וממרחים'],['תבלין קארי','🧂','רטבים וממרחים'],['פפריקה','🧂','רטבים וממרחים'],['כמון','🧂','רטבים וממרחים'],['אורגנו','🧂','רטבים וממרחים'],['רסק עגבניות','🥫','שימורים'],['פלפל שחור','🧂','רטבים וממרחים'],
['וופלים','🧇','מאפים וחטיפים'],['תפוצ׳יפס','🥔','מאפים וחטיפים'],['פיצוחים','🥜','מאפים וחטיפים'],['בייגלה','🥨','מאפים וחטיפים'],['עוגת שיש','🍰','מאפים וחטיפים'],
['אקונומיקה','🧴','מוצרי ניקיון'],['מגבון לרצפה','🧻','מוצרי ניקיון'],['נוזל ניקוי אמבטיה','🧴','מוצרי ניקיון'],['ספריי לחלונות','🧴','מוצרי ניקיון'],['כפפות ניקיון','🧤','מוצרי ניקיון'],['ספוגים','🧽','מוצרי ניקיון'],
['דאודורנט','🧴','היגיינה'],['קרם גוף','🧴','היגיינה'],['פדים','🧴','היגיינה'],['מגבוני תינוק','🧻','היגיינה'],['חיתולים','🍼','היגיינה'],['קרם הגנה','🧴','היגיינה'],
['נרות שבת','🕯️','אחר'],['בלונים','🎈','אחר'],
['טונה בשמן','🐟','שימורים'],['טונה במים','🐟','שימורים'],['סרדינים','🐟','שימורים'],['תירס בקופסה','🌽','שימורים'],['זיתים ירוקים','🫒','שימורים'],['זיתים שחורים','🫒','שימורים'],['מלפפונים חמוצים','🥒','שימורים'],['גרגרי חומוס','🫘','שימורים'],['חומוס בקופסה','🫘','שימורים'],['שעועית אפויה','🫘','שימורים'],['אפונה בקופסה','🥫','שימורים'],['פול','🫘','שימורים'],['עגבניות מרוסקות','🍅','שימורים'],['פטריות בקופסה','🍄','שימורים'],['אננס בקופסה','🍍','שימורים'],['אפרסקים בסירופ','🍑','שימורים'],['לקט ירקות','🥫','שימורים'],['חלב קוקוס','🥥','שימורים'],
['בשר לחמין','🥩','בשר ועוף'],['גריסים','🌾','רטבים וממרחים'],['חיטה','🌾','רטבים וממרחים'],['שמן','🫗','רטבים וממרחים'],['רוטב טריאקי','🍶','רטבים וממרחים'],['סילאן','🍯','רטבים וממרחים'],['חמין מוכן','🍲','אחר'],['חומץ','🫗','רטבים וממרחים'],['חומץ תפוחים','🍎','רטבים וממרחים'],['חומץ בלסמי','🫗','רטבים וממרחים'],['חומץ בן יין','🍇','רטבים וממרחים'],['אפונה וגזר','🥫','שימורים']
];
EXTRA.forEach(([n,e,c])=>{if(!P[n])P[n]={e:e,c:c};});
const ALIAS={'קוקה':'קולה','קוקה קולה':'קולה','שניצל':'חזה עוף פרוס לשניצלים','שניצלים':'חזה עוף פרוס לשניצלים','טישו':'טישו לאף','קייסמי':'קיסמי אוזניים','קיסמי':'קיסמי אוזניים','בקבוק מים':'מים','קרטון מים':'שישיית מים','ארגז מים':'שישיית מים','שישייה':'שישיית מים','במבה':'חטיף במבה','עגבניה':'עגבניות','מלפפון':'מלפפונים','תפוח':'תפוחים','תפוח אדמה':'תפוחי אדמה','בננה':'בננות','תפוז':'תפוזים','לימון':'לימונים','תות':'תותים','ביצה':'ביצים','צ׳ילי מתוק':'רוטב צ׳ילי מתוק','ברביקיו':'רוטב ברביקיו','חלווה':'ממרח חלווה','נוטלה':'ממרח שוקולד','בצלים':'בצל','גזרים':'גזר','טריאקי':'רוטב טריאקי','טאריקי':'רוטב טריאקי','שועית':'שעועית','חומס':'חומוס','קופסת טונה':'טונה','קופסת תירס':'תירס בקופסה','חמוצים':'מלפפונים חמוצים','מלפפון חמוץ':'מלפפונים חמוצים','שימורי תירס':'תירס בקופסה','אננס משומר':'אננס בקופסה','פטריות משומרות':'פטריות בקופסה','צולנט':'בשר לחמין','בשר לצולנט':'בשר לחמין','בשר לטשולנט':'בשר לחמין','תפוא':'תפוחי אדמה','תפו"א':'תפוחי אדמה','חרדה':'חרדל','פיצוחי יער':'פירות יער'};
const NORMP={};Object.keys(P).forEach(n=>NORMP[norm(n)]=n);Object.keys(ALIAS).forEach(a=>NORMP[norm(a)]=ALIAS[a]);
function resolveCat(n){if(P[n]&&P[n].c)return P[n].c;for(const[cc,rx]of CATR)if(rx.test(n))return cc;return 'אחר';}
function emojiOf(n){return (P[n]&&P[n].e)||CATE[resolveCat(n)]||'🛒';}
/* ניקוי נתונים של רשימות (מהענן / מהמכשיר / מבני משפחה) — מזהים, אימוג'י וטקסטים, כדי שאף אחד לא יוכל להזריק קוד לדף */
const cleanStr=(s,n)=>String(s==null?'':s).slice(0,n);
/* חותמת זמן: מספר סופי בין 0 למחר; עתיד רחוק (זיוף/שעון שבור) → עכשיו */
const cleanTs=v=>{v=Number(v);if(!isFinite(v)||v<0)return 0;return v>Date.now()+864e5?Date.now():v;};
function cleanId(id){if(typeof id==='string'&&/^[\w-]{1,64}$/.test(id))return id;const s=String(id==null?'':id).replace(/[^\w-]/g,'').slice(0,64);return s||uid();}
function cleanEmo(e,n){return typeof e==='string'&&e&&e.length<=16&&!/[<>"'&\\]/.test(e)?e:emojiOf(String(n||''));}
function cleanItem(i){if(!i||typeof i!=='object')return null;const o=Object.assign({},i);o.n=cleanStr(o.n,200);o.q=cleanStr(o.q,40);o.e=cleanEmo(o.e,o.n);
  if(o.id!==undefined)o.id=cleanId(o.id);if(o.note!=null)o.note=cleanStr(o.note,200);if(o.o!==undefined){const v=Number(o.o);if(isFinite(v))o.o=v;else delete o.o;}if(o.img!==undefined&&!(typeof o.img==='string'&&o.img.length<=90000&&/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(o.img)))delete o.img;if(o.done!==undefined)o.done=!!o.done;if(o.ts!==undefined)o.ts=cleanTs(o.ts);
  if(o.c!==undefined&&(typeof o.c!=='string'||o.c.length>40||/[<>"'&]/.test(o.c)))o.c=resolveCat(o.n);['by','doneBy','store'].forEach(k=>{if(o[k]!=null)o[k]=cleanStr(o[k],60);});return o;}
function cleanList(l){if(!l||typeof l!=='object')return null;const o=Object.assign({},l);o.id=cleanId(o.id);o.name=cleanStr(o.name,80);o.created=cleanTs(o.created);if(o.nameTs!==undefined)o.nameTs=cleanTs(o.nameTs);if(o.mtime!==undefined)o.mtime=cleanTs(o.mtime);
  o.items=(Array.isArray(o.items)?o.items:[]).map(i=>{const x=cleanItem(i);if(x&&x.id===undefined)x.id=uid();if(x){x.done=!!x.done;x.ts=x.ts||0;if(!x.c)x.c=resolveCat(x.n);}return x;}).filter(Boolean);return o;}
function cleanHist(h){if(!h||typeof h!=='object')return null;const o=Object.assign({},h);o.ts=cleanTs(o.ts);o.listName=cleanStr(o.listName,80);['by','store','byId','branch'].forEach(k=>{if(o[k]!=null)o[k]=cleanStr(o[k],60);});
  o.items=(Array.isArray(o.items)?o.items:[]).map(cleanItem).filter(Boolean);return o;}
function cleanTomb(t){const o={items:{},lists:{}};if(t&&typeof t==='object')['items','lists'].forEach(k=>{const m=t[k];if(m&&typeof m==='object')Object.keys(m).forEach(id=>{const v=Number(m[id]);if(isFinite(v)&&v>0&&v<=Date.now()+864e5&&/^[\w-]{1,64}$/.test(id))o[k][id]=v;});});return o;}
function cleanRoom(d){if(!d||typeof d!=='object')return d;
  if(Array.isArray(d.lists))d.lists=d.lists.map(cleanList).filter(Boolean);
  if(Array.isArray(d.history))d.history=d.history.map(cleanHist).filter(Boolean);
  if(d.tomb!==undefined)d.tomb=cleanTomb(d.tomb);
  if(Array.isArray(d.customRecipes))d.customRecipes=d.customRecipes.filter(r=>r&&typeof r==='object').map(r=>Object.assign({},r,{n:cleanStr(r.n,80),e:cleanEmo(r.e,'')}));
  /* שאר המפתחות המסונכרנים: סוג לא נכון → מתעלמים מהמפתח (לא מוחקים מה שיש במכשיר) */
  const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),BADK=/^(__proto__|constructor|prototype)$/;
  const objMap=(o,f)=>{const r={};Object.keys(o).forEach(k=>{if(BADK.test(k)||k.length>200)return;const v=f(o[k]);if(v!==undefined)r[k]=v;});return r;};
  const strArr=(a,n)=>a.filter(x=>typeof x==='string'&&x&&x.length<=n);
  const objArr=a=>a.filter(isObj);
  if('lists' in d&&!Array.isArray(d.lists))delete d.lists;
  if('history' in d&&!Array.isArray(d.history))delete d.history;
  if('customRecipes' in d&&!Array.isArray(d.customRecipes))delete d.customRecipes;
  ['customPantry','missingHome'].forEach(k=>{if(k in d){if(Array.isArray(d[k]))d[k]=strArr(d[k],80);else delete d[k];}});
  if('knowledge' in d){if(Array.isArray(d.knowledge))d.knowledge=objArr(d.knowledge).filter(k=>typeof k.q==='string'&&k.q).map(k=>Object.assign({},k,{q:cleanStr(k.q,300),a:cleanStr(k.a,2000)}));else delete d.knowledge;}
  if('templates' in d){if(Array.isArray(d.templates))d.templates=objArr(d.templates).map(t=>Object.assign({},t,{id:cleanId(t.id),name:cleanStr(t.name,40),items:(Array.isArray(t.items)?t.items:[]).filter(i=>isObj(i)&&typeof i.n==='string').map(i=>Object.assign({},i,{n:cleanStr(i.n,200),q:cleanStr(i.q,40)}))}));else delete d.templates;}
  if('errands' in d){if(Array.isArray(d.errands))d.errands=objArr(d.errands).filter(x=>x.id!=null).map(x=>Object.assign({},x,{id:cleanId(x.id),ts:cleanTs(x.ts)}));else delete d.errands;}
  if('plans' in d){if(isObj(d.plans))d.plans=objMap(d.plans,v=>Array.isArray(v)?strArr(v,200):undefined);else delete d.plans;}
  if('pantry' in d){if(isObj(d.pantry))d.pantry=objMap(d.pantry,v=>v?true:undefined);else delete d.pantry;}
  if('stats' in d){if(isObj(d.stats))d.stats=objMap(d.stats,v=>{v=Number(v);return isFinite(v)&&v>0?Math.min(v,1e6):undefined;});else delete d.stats;}
  if('stock' in d){if(isObj(d.stock))d.stock=objMap(d.stock,v=>{if(!isObj(v))return undefined;const o=Object.assign({},v);const q=Number(o.q);o.q=isFinite(q)?q:1;if(o.ts!==undefined)o.ts=cleanTs(o.ts);return o;});else delete d.stock;}
  if('me' in d){if(isObj(d.me)){const m=Object.assign({},d.me);m.address=isObj(m.address)?m.address:{};['stores','orders','providers'].forEach(k=>{m[k]=Array.isArray(m[k])?objArr(m[k]):[];});if(m.ts!==undefined)m.ts=cleanTs(m.ts);d.me=m;}else delete d.me;}
  return d;}
/* "מצבות" — מה שנמחק נזכר 30 יום, כדי שמכשיר אחר שעוד מחזיק אותו לא יחזיר אותו בסנכרון */
const TOMB_DAYS=30,TOMB_MAX=2000;
function tombPrune(t){const now=Date.now(),lim=now-TOMB_DAYS*864e5;['items','lists'].forEach(k=>{const e=Object.entries(t[k]||{}).filter(x=>typeof x[1]==='number'&&isFinite(x[1])&&x[1]>=lim&&x[1]<=now+864e5).sort((a,b)=>b[1]-a[1]).slice(0,TOMB_MAX);t[k]=Object.fromEntries(e);});return t;}
/* המצבה תמיד אחרי העריכה האחרונה של מה שנמחק (גם אם השעון של מכשיר אחר קצת מקדים), עד יום קדימה */
function tombAdd(kind,ids){const t=state.tomb=cleanTomb(state.tomb);const now=Date.now(),cap=now+864e5;
  const tsOf=id=>{let m=0;(state.lists||[]).forEach(l=>{if(kind==='lists'){if(l.id===id)m=Math.max(m,listMtime(l));}else (l.items||[]).forEach(i=>{if(i.id===id)m=Math.max(m,Number(i.ts)||0);});});return m;};
  (ids||[]).forEach(x=>{const o=x&&typeof x==='object',id=o?x.id:x;if(!id)return;const ts=o?(kind==='lists'?listMtime(x):Number(x.ts)||0):tsOf(id);t[kind][id]=Math.min(cap,Math.max(now,ts+1));});tombPrune(t);}
function tombUnion(a,b){const A=cleanTomb(a),B=cleanTomb(b);['items','lists'].forEach(k=>Object.keys(B[k]).forEach(id=>{if(!(A[k][id]>=B[k][id]))A[k][id]=B[k][id];}));return tombPrune(A);}
/* מורידים מהרשימות כל מה שנמחק (אלא אם נערך אחרי המחיקה) */
/* רשימה שנמחקה חוזרת רק אם נערכה אחרי המחיקה (פריט, שם או יצירה מאוחרים יותר) */
/* סדר המוצרים ברשימה: מי שגררו מוצר קובע לו מקום (o); בלי זה — לפי זמן ההוספה */
const itemKey=i=>Number(i&&i.o!=null?i.o:i&&i.ts)||0;
function listMtime(l){let m=Math.max(Number(l.created)||0,Number(l.nameTs)||0,Number(l.mtime)||0);(l.items||[]).forEach(i=>{const v=Number(i&&i.ts)||0;if(v>m)m=v;});return m;}
function tombApply(lists,t){t=t||cleanTomb(null);return (lists||[]).filter(l=>!(t.lists[l.id]>=listMtime(l))).map(l=>{const its=(l.items||[]).filter(i=>!(t.items[i.id]>=(i.ts||0)));return its.length===(l.items||[]).length?l:Object.assign({},l,{items:its});});}
const BASE=['חלב','לחם','ביצים','גבינה','חמאה','עגבניות','מלפפונים','בצל','תפוחי אדמה','אורז','פסטה','שמן זית','סוכר','קמח','קפה','תה','מלח','קטשופ','מיונז','טונה','חומוס','נייר טואלט','סבון כלים','שמפו','מים'];

/* ================= נתונים ================= */
const KEY='yamh_app_v1';
let state=null;
function defState(){return {priceAlerts:[],savings:[],basketSnaps:[],user:null,ownerCode:null,follow:null,lists:[{id:uid(),name:'סופר',items:[],created:Date.now()}],active:null,history:[],plans:{},bot:[],stats:{},pantry:{},customPantry:[],customRecipes:[],dark:false,group:false,lastGreet:'',lastTab:'list',homeQ:'',showMissing:false,pending:null,pendingRecipe:null,pendingNav:null,dtFlow:null,pendingCholent:false,lastCholentOffer:'',knowledge:[],gender:'f',room:null,city:'ירושלים',me:{address:{},stores:[],orders:[],providers:[]},geoCity:'',lastOffers:{}};}
function load(){
  try{state=JSON.parse(localStorage.getItem(KEY));}catch(e){}
  if(!state||typeof state!=='object'||Array.isArray(state))state=defState();
  const d=defState();Object.keys(d).forEach(k=>{if(state[k]===undefined)state[k]=d[k];});
  if(!Array.isArray(state.lists))state.lists=[];if(!Array.isArray(state.history))state.history=[];
  try{cleanRoom(state);state.tomb=tombPrune(cleanTomb(state.tomb));}catch(e){console.warn('clean failed',e);}
  Object.keys(d).forEach(k=>{if(state[k]===undefined)state[k]=d[k];});
  if(!state.lists.length)state.lists=d.lists;
  if(!state.lists.find(l=>l.id===state.active))state.active=state.lists[0].id;
  state.plans=state.plans||{};state.bot=state.bot||[];state.stats=state.stats||{};state.history=state.history||[];state.pantry=state.pantry||{};state.customPantry=state.customPantry||[];state.customRecipes=state.customRecipes||[];state.knowledge=state.knowledge||[];delete state.adminUnlocked;
  /* register any previously-saved custom pantry items into the runtime catalog so they resolve everywhere (bot, search) */
  state.customPantry.forEach(n=>{if(!P[n]){P[n]={e:'🛒',c:'אחר'};NORMP[norm(n)]=n;}});
}
/* שמירה במכשיר. אם המקום בדפדפן התמלא (בעיקר מתמונות של מוצרים) — מפנים מקום ושומרים שוב,
   אחרת העיר, השיחות עם יאמי וההגדרות היו נעלמים בכל רענון */
let lsTight=false,lsFullWarned=false;
function lsTrimmed(){return Object.assign({},state,{botChats:(state.botChats||[]).slice(0,5).map(c=>Object.assign({},c,{msgs:(c.msgs||[]).slice(-40)})),history:(state.history||[]).slice(0,120)});}
function save(){
  /* עדיין אין מקום (גם אחרי שפינינו מטמונים ותמונות) — שומרים במכשיר עותק מקוצר (שיחות ישנות והיסטוריה ארוכה).
     בזיכרון ובענן הכל נשאר מלא, כך שהקיצור לא נדחף לרשימה המשותפת */
  if(!lsTight){try{localStorage.setItem(KEY,JSON.stringify(state));return;}catch(e){lsTight=true;}}
  try{localStorage.setItem(KEY,JSON.stringify(lsTrimmed()));}catch(e){console.warn('local save failed',e);}
  if(!lsFullWarned){lsFullWarned=true;try{flash(T('⚠️ האחסון במכשיר מלא — נשמרת רק ההיסטוריה האחרונה במכשיר','⚠️ Device storage is full — only recent history is kept on this device'));}catch(e){}}}
/* הרשימה הפעילה. אם היא חסרה (אחרי איחוד/מעבר חשבון, סנכרון מהענן או שחזור גיבוי) — עוברים לרשימה הראשונה, ואם אין רשימות בכלל — יוצרים אחת ריקה */
const curList=()=>{if(!Array.isArray(state.lists))state.lists=[];let l=state.lists.find(x=>x&&x.id===state.active);
  if(!l){if(!state.lists.length)state.lists=defState().lists;l=state.lists[0];state.active=l.id;}
  if(!Array.isArray(l.items))l.items=[];return l;};
function pantryHas(name){const c=NORMP[norm(name)]||norm(name);return !!state.pantry[c];}
function pantrySet(name,val){const c=NORMP[norm(name)]||norm(name);if(val)state.pantry[c]=true;else delete state.pantry[c];}
function pantryCount(){return Object.keys(state.pantry).length;}
function addCustomPantryItem(nameRaw,catRaw){
  const name=(nameRaw||'').trim();
  if(!name)return false;
  const cat=CATS.includes(catRaw)?catRaw:'אחר';
  const key=norm(name);
  const already=NORMP[key];
  if(already&&state.customPantry.includes(already)){flash('⚠️ "'+already+'" כבר ברשימת הבית');return false;}
  if(already&&P[already]){ /* it's a catalog item the user is re-adding on purpose — just mark it as tracked */ }
  else{P[name]={e:CATE[cat]||'🛒',c:cat};NORMP[key]=name;}
  const finalName=NORMP[key]||name;
  if(!state.customPantry.includes(finalName))state.customPantry.push(finalName);
  save();renderHome();
  flash('🏠 "'+finalName+'" נוסף לבית שלך ('+cat+')');
  return true;
}
async function renameCustomPantryItem(oldName){
  const n=((await uiPrompt('שם חדש עבור "'+oldName+'":',oldName))||'').trim();
  if(!n||n===oldName)return;
  const had=pantryHas(oldName);
  state.customPantry=state.customPantry.map(x=>x===oldName?n:x);
  if(!P[n]){P[n]={e:P[oldName]?.e||'🛒',c:P[oldName]?.c||'אחר'};}
  NORMP[norm(n)]=n;
  pantrySet(oldName,false);pantrySet(n,had);
  save();renderHome();
}
function removeCustomPantryItem(name){
  state.customPantry=state.customPantry.filter(n=>n!==name);
  pantrySet(name,false);
  save();renderHome();
  flash('🗑️ "'+name+'" הוסר מהבית שלך');
}

/* ================= פירוק טקסט למוצרים ================= */
const NUMW={'אחד':1,'אחת':1,'שני':2,'שניים':2,'שתי':2,'שתיים':2,'שלוש':3,'שלושה':3,'ארבע':4,'ארבעה':4,'חמש':5,'חמישה':5,'שש':6,'שבע':7,'שבעה':7,'שמונה':8,'תשע':9,'תשעה':9,'עשר':10,'עשרה':10,'עשרים':20};
const UNITS='קג|קילו|ליטר|גרם|חבילות|חבילה|שקיות|שקית|ארגז|קופסאות|קופסה|בקבוקים|בקבוק|יחידות|מארזים|מארז';
let compoundRx=null,compoundN=-1;
function COMPOUND_RX(){const ks=Object.keys(NORMP);if(compoundRx&&compoundN===ks.length)return compoundRx;compoundN=ks.length;
  const c=ks.filter(k=>/\sו[א-ת]/.test(k)).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  compoundRx=c.length?new RegExp('(?<![א-ת])('+c.join('|')+')(?![א-ת])','g'):/(?!)/g;return compoundRx;}
function parseItems(text){
  let s=' '+norm(text)+' ';
  s=s.replace(/\s(בבקשה|גם|עוד|רק)\s/g,' ').trim().replace(/^(אני צריך|אני צריכה|אני רוצה|צריך|צריכה|תוסיף לי|תוסיפי לי|תוסיף|תוסיפי|תוסיפו|הוסיפי|הוסף לי|הוסף|תרשמו|תרשמי|רשמי|תרשום|רשום|לקנות|תקני|תקנה|קני|קנה|תביאי|תביא|תכניסי|תכניס|שימי|תשימי)\s+/,'').trim();
  let qty='';const numRe=new RegExp('(\\d+)\\s*('+UNITS+')?\\s*$');
  let m=s.match(numRe);
  if(m&&m[1]){qty=m[1]+(m[2]?' '+m[2]:'');s=s.slice(0,m.index);}
  else{const tk=s.trim().split(' ');const last=tk[tk.length-1];
    if(NUMW[last]){qty=''+NUMW[last];tk.pop();const u=tk[tk.length-1];if(u&&new RegExp('^('+UNITS+')$').test(u)){qty+=' '+u;tk.pop();}s=tk.join(' ');}
  }
  /* מוצר ששמו כולל "ו" (אפונה וגזר) — לא מפרקים לשני פריטים. "חלב ולחם" עדיין מתפרק */
  const keep=[];const keepCompound=seg=>seg.replace(COMPOUND_RX(),m=>{keep.push(m);return '\u0001'+(keep.length-1)+'\u0001';});
  const parts=keepCompound(s).split(/\s*,\s*|\s+ו(?=[א-ת])/).map(x=>x.replace(/\u0001(\d+)\u0001/g,(_,i)=>keep[+i])).map(x=>x.replace(/^(את|את ה|של|ל)\s+/,'').trim()).filter(Boolean);
  const out=[];
  parts.forEach(p=>{
    let q2='';const m2=p.match(new RegExp('^(\\d+)\\s*('+UNITS+')?\\s+'));
    if(m2){q2=m2[1]+(m2[2]?' '+m2[2]:'');p=p.slice(m2[0].length);}
    const m3=p.match(new RegExp('\\s(\\d+)\\s*('+UNITS+')?$'));
    if(!q2&&m3){q2=m3[1]+(m3[2]?' '+m3[2]:'');p=p.slice(0,m3.index).trim();}
    const w=p.split(' ');
    if(w.length&&NUMW[w[0]]){q2=q2||(''+NUMW[w[0]]);w.shift();p=w.join(' ').trim();}
    if(!p)return;
    out.push({name:NORMP[norm(p)]||fuzzyResolve(p)||p,qty:(q2||(parts.length===1?qty:'')||'')});
  });
  return out;
}
const ADDVERBS=/(הוסף|הוסיפי|תוסיף|תוסיפי|תוספי|רשום|רשמי|תרשום|תרשמי|תרשמו|צריך|צריכה|קנה|קני|תקנ|לקנות|תביא|תביאי|תכניסי|תכניס|שימי|תשימי|עוד)/;

/* ================= פעולות רשימה ================= */
function mergeQty(oldQ,newQ){
  oldQ=(oldQ||'').trim();newQ=(newQ||'').trim();
  if(!newQ)return oldQ;
  if(!oldQ)return newQ;
  const m1=oldQ.match(/^([\d.]+)\s*(.*)$/),m2=newQ.match(/^([\d.]+)\s*(.*)$/);
  if(m1&&m2&&m1[2].trim()===m2[2].trim()){
    const sum=parseFloat(m1[1])+parseFloat(m2[1]);
    return sum+(m1[2]?(' '+m1[2]):'');
  }
  return newQ; /* different units / not both numeric — fall back to the newest value */
}
function addItem(name,qty){
  const l=curList();const ex=l.items.find(i=>i.n===name&&!i.done);
  if(ex){const merged=mergeQty(ex.q,qty);if(merged!==ex.q){ex.q=merged;ex.ts=Date.now();}flash('⚠️ כבר ברשימה — הכמות עודכנה ל'+(merged?(' ×'+merged):'ללא כמות'));}
  else{l.items.push({id:uid(),n:name,q:qty||'',c:resolveCat(name),e:emojiOf(name),done:false,ts:Date.now()});
    state.stats[name]=(state.stats[name]||0)+1;flash('✅ '+name+' נוסף');}
  save();render();
}
let lastRemoved=null;
function removeItem(id){
  const l=curList();const idx=l.items.findIndex(i=>i.id===id);if(idx<0)return;
  lastRemoved={listId:l.id,item:l.items[idx],idx};
  l.items.splice(idx,1);tombAdd('items',[lastRemoved.item]);save();render();
  showUndo('הפריט "'+lastRemoved.item.n+'" נמחק',()=>{
    const ll=state.lists.find(x=>x.id===lastRemoved.listId);
    if(ll){const it=lastRemoved.item;it.ts=Math.max(Date.now(),(state.tomb&&state.tomb.items&&state.tomb.items[it.id])||0)+1;if(state.tomb&&state.tomb.items)delete state.tomb.items[it.id];ll.items.splice(Math.min(lastRemoved.idx,ll.items.length),0,lastRemoved.item);save();render();}
  });
}
function clearDone(){const l=curList();const done=l.items.filter(i=>i.done);
  if(!done.length){flash('אין פריטים מסומנים לסיום 🙂');return null;}
  state.history.unshift({ts:Date.now(),listName:l.name,by:(state.user&&state.user.name)||'',items:done.map(i=>({n:i.n,q:i.q,e:i.e}))});
  tombAdd('items',done);l.items=l.items.filter(i=>!i.done);save();render();
  return done.length;}

/* ================= תאריך ושיתוף ================= */
/* טקסט מסודר לשליחה: מקובץ לפי קטגוריות, עם כמויות; wa=true מוסיף הדגשה של וואטסאפ */
function shareText(wa){
  const l=curList();const now=new Date();const B=x=>wa?'*'+x+'*':x;
  const open=l.items.filter(i=>!i.done),done=l.items.filter(i=>i.done);
  const line=i=>'▫️ '+i.n+(i.q?' × '+i.q:'')+'\n';
  let s='🛒 '+B(l.name)+'\n'+fmtDate(now)+' · '+hebDate(now)+'\n';
  if(!open.length&&!done.length)s+='\n'+T('(הרשימה ריקה)','(The list is empty)')+'\n';
  if(open.length){s+=T(open.length+' מוצרים לקנות','To buy: '+open.length)+'\n';
    const cat=i=>i.c||'אחר';const byCat=c=>open.filter(i=>cat(i)===c);
    const used=CATS.concat(Array.from(new Set(open.map(cat)))).filter((c,k,a)=>a.indexOf(c)===k&&byCat(c).length);
    if(used.length<2){s+='\n';open.forEach(i=>s+=line(i));}
    else used.forEach(c=>{s+='\n'+(CATE[c]||'🛒')+' '+B(c)+'\n';byCat(c).forEach(i=>s+=line(i));});}
  if(done.length){s+='\n✅ '+B(T('כבר נקנה','Already bought'))+'\n';done.forEach(i=>s+='☑ '+i.n+'\n');}
  s+='\n— '+T('רשימת קניות','Shopping List')+' 💚 yamshopping.com';return s;
}
function bindShare(){
  const t=encodeURIComponent(shareText());
  document.querySelector('#shWa').href='https://wa.me/?text='+encodeURIComponent(shareText(true));
  document.querySelector('#shSms').href='sms:?body='+t;
}
function printList(){
  const l=curList();const now=new Date();
  const row=i=>'<tr><td class="cb"></td><td class="em">'+emoToSvg(i.e,20,'#1e3a5f')+'</td><td>'+esc(i.n)+'</td><td class="q">'+(i.q?'×'+esc(i.q):'')+'</td></tr>';
  let body='';
  if(state.group){
    CATS.forEach(c=>{const its=l.items.filter(i=>(CATS.includes(i.c)?i.c:'אחר')===c);if(!its.length)return;
      body+='<h2>'+esc(c)+'</h2><table>'+its.map(row).join('')+'</table>';});
    if(!l.items.length)body='<p class="e">הרשימה ריקה</p>';
  }else{
    body='<table>'+(l.items.length?l.items.map(row).join(''):'<p class="e">הרשימה ריקה</p>')+'</table>';
  }
  const w=window.open('','_blank');
  if(!w){flash(T('⚠️ הדפדפן חסם את חלון ההדפסה — אפשרו חלונות קופצים לאתר ונסו שוב','⚠️ The print window was blocked — allow pop-ups and try again'));return;}
  w.document.write('<html dir="rtl" lang="he"><head><meta charset="utf-8"><title>הדפסה — '+esc(l.name)+'</title><style>body{font-family:Heebo,Arial,sans-serif;color:#222;max-width:700px;margin:24px auto}.hdr{display:flex;align-items:center;gap:14px;border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px}.hdr svg,.hdr img{height:56px}.hdr h1{margin:0;font-size:22px}.hdr .d{font-size:13px;color:#667}h2{font-size:15px;color:#1e3a5f;margin:18px 0 4px}table{width:100%;border-collapse:collapse}td{padding:8px 6px;border-bottom:1px solid #e5e5e5;font-size:15px}.cb{width:26px}.cb::before{content:"";display:block;width:18px;height:18px;border:2px solid #1e3a5f;border-radius:4px}.em{width:34px;font-size:20px}.q{width:90px;color:#667;font-size:13px}.foot{margin-top:26px;padding-top:10px;border-top:1px solid #ddd;font-size:12px;color:#888;text-align:center}.e{color:#999}</style></head><body><div class="hdr">'+logoSvg()+'<div><h1>'+esc(l.name)+'</h1><div class="d">'+fmtDate(now)+' · '+hebDate(now)+' · '+fmtTime(now)+'</div></div></div>'+body+'<div class="foot">רשימת קניות · נעשה באהבה 💚</div></body></html>');
  w.document.close();w.focus();setTimeout(()=>w.print(),350);
}

/* ================= רינדור ================= */
function doodleBg(el){
  const em=['🍅','🥕','🍞','🥛','🍎','🧀','🍇','🥑','🍋','🥒','🍉','🥨'];
  el.querySelectorAll('.dd span').forEach(s=>s.remove());
  let d=el.querySelector('.dd');
  if(!d){d=document.createElement('div');d.className='dd';d.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none';el.prepend(d);}
  for(let i=0;i<22;i++){const s=document.createElement('span');s.textContent=em[i%em.length];
    s.style.cssText='position:absolute;opacity:.10;right:'+(Math.random()*90)+'%;top:'+(Math.random()*95)+'%;font-size:'+(16+Math.random()*20)+'px';d.appendChild(s);}
}
function render(){
  document.querySelector('#chips').innerHTML=state.lists.map(l=>'<button class="chip'+(l.id===state.active?' on':'')+'" data-id="'+esc(l.id)+'">'+esc(l.name)+(l.id===state.active?'<span class="x dup" data-dup="'+esc(l.id)+'" title="'+T('שכפול הרשימה','Duplicate list')+'" aria-label="'+T('שכפול הרשימה','Duplicate list')+'">⧉ '+T('שכפול','Copy')+'</span>':'')+(l.id===state.active&&state.lists.length>1?'<span class="x" data-del="'+esc(l.id)+'">✕</span>':'')+'</button>').join('')+'<button class="chip" data-new="1" aria-label="'+T('רשימה חדשה','New list')+'">'+T('+ רשימה','+ List')+'</button>';
  const favHidden=new Set(state.favHidden||[]);
  const favs=Object.entries(state.stats).filter(f=>!favHidden.has(f[0])).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const fr=document.querySelector('#favs');
  if(favs.length&&!state.hideFavs){fr.style.display='flex';fr.innerHTML='<span title="'+T('מוצרים שקונים הרבה — לחיצה מוסיפה לרשימה','Frequent items — tap to add')+'">⭐</span>'+favs.map(f=>'<span class="favwrap"><button class="fav" data-fav="'+esc(f[0])+'">'+esc(f[0])+'</button><button class="favx" data-favx="'+esc(f[0])+'" aria-label="'+T('להסיר את '+esc(f[0])+' מהמועדפים','Remove')+'" title="'+T('להסיר מכאן','Remove')+'">✕</button></span>').join('')+'<button class="favhide" data-favhide="1" title="'+T('להסתיר את שורת המועדפים (אפשר להחזיר בתפריט ⚙️)','Hide this row')+'">'+T('הסתרה','Hide')+'</button>';}
  else fr.style.display='none';
  const dow=new Date().getDay();const plan=state.plans[dow]||[];
  const b=document.querySelector('#banner');
  if(plan.length){const l=curList();const missing=plan.filter(n=>!l.items.find(i=>i.n===n));
    b.classList.add('open');
    b.innerHTML='<span>📋 תוכנית להיום: <b>'+plan.map(esc).join(', ')+'</b></span>'+(missing.length?'<button data-planadd="1">הוסף לרשימה ('+missing.length+')</button>':'<span style="color:var(--muted)">הכל כבר ברשימה ✔</span>');
  }else b.classList.remove('open');
  renderList();renderHist();renderHome();renderBot();bindShare();
}
/* 💰 איפה הכי זול — כרטיס קבוע בראש הרשימה (כשהשוואת הסניפים מוצגת: לכולם, או רק למנהל במצב בדיקה).
   כל הרשימה (כשיש בה מוצרים) + חיפוש של מוצר אחד בכל הסניפים */
/* 💰 "איפה הכי זול" ברשימה — המנהל מדליק ובוחר עד מתי (collector ← promo_off / promo_until) */
function cheapPromoOn(){if(!(typeof srvShown==='function'&&srvShown()))return false;const c=srvCfg||{};if(c.promo_off)return false;
  return !(c.promo_until&&new Date()>new Date(c.promo_until+'T23:59:59'));}
/* 14: במקום הבאנר הכחול הגדול — כפתור קטן "💰 איפה הכי זול" באותה שורה של "בחירה" ו"מצב קנייה" (כדי שהמסך בטלפון לא ייראה עמוס) */
function cheapPill(){
  if(!cheapPromoOn())return '';
  return '<button type="button" class="sec cheap14" data-cheapopen="1" title="'+T('השוואת מחירים בכל החנויות','Compare prices in every store')+'">💰 '+T('איפה הכי זול','Cheapest')+'</button>';
}
function cheapBox(nOpen){
  const b=cheapPill();return (b&&!nOpen)?'<div class="cheaprow14">'+b+'</div>':'';
}
function renderList(){
  const l=curList();const p=document.querySelector('#paneList');
  if(!l.items.length){
    const hasHist=state.history.length>0,due=typeof dueItems==='function'?dueItems().length:0;
    const cp=cheapPill().replace('class="sec cheap14"','class="chip cheap14"');
    p.innerHTML='<div class="empty">'+T('הרשימה ריקה 🛒<br>כתבו למטה מה צריך — או שאלו את יאמי 👩‍🍳','Your list is empty 🛒<br>Type below what you need — or ask Yami 👩‍🍳')+
      ((hasHist||due||cp)?'<div class="emptybtns">'+cp+(hasHist?'<button class="chip" data-reorder="1">🔁 '+T('להוסיף את הקנייה הקודמת','Add my previous shopping')+'</button>':'')+(due?'<button class="chip" data-due="1">⏰ '+T('מה כנראה נגמר ('+due+')','Probably running out ('+due+')')+'</button>':'')+'</div>':'')+'</div>';
    doodleBg(p);return;}
  const nDone=l.items.filter(i=>i.done).length,nAll=l.items.length,nOpen=nAll-nDone;
  const bar='<div class="buybar"><div class="prog">🛒 '+(nDone?T('קנית '+nDone+' מתוך '+nAll,'Bought '+nDone+' of '+nAll):prefs.noTick66?T(nAll+' מוצרים ברשימה',nAll+' items on the list'):T('מסמנים ✓ ליד מה שקנית — אפשר לקנות בכמה חנויות','Tick ✓ what you bought — shop across several stores')+'<button type="button" class="tickx66" data-tickx66="1" title="'+T('להסתיר את ההסבר','Hide this tip')+'" aria-label="'+T('להסתיר את ההסבר','Hide this tip')+'">✕</button>')+'<div class="bar"><i style="width:'+Math.round(100*nDone/nAll)+'%"></i></div></div>'+
    (nOpen>=1&&sb&&authUser&&!(typeof srvShown==='function'&&srvShown())?'<button class="sec" data-basket="1" title="'+T('איפה הכי זול לקנות את הרשימה','Where is this list cheapest')+'">💰 '+T('איפה הכי זול?','Cheapest store?')+'</button>':'')+
    cheapPill()+(nDone?'<button data-finishpart="1">✅ '+(nOpen?T('סיום — רק מה שקניתי','Finish — only what I bought'):T('סיום קנייה','Finish shopping'))+'</button>':'')+'</div>';
  const cheap='';
  if(state.group){
    p.innerHTML=bar+cheap+(CATS.map(c=>{const its=l.items.filter(i=>(CATS.includes(i.c)?i.c:'אחר')===c);if(!its.length)return '';
      return '<div class="grp"><h3>'+esc(CATE[c])+' '+esc(c)+' ('+its.length+')</h3>'+its.map(itemRow).join('')+'</div>';}).join('')||'<div class="empty">ריק</div>');
  }else{
    const open=l.items.filter(i=>!i.done),done=l.items.filter(i=>i.done);
    p.innerHTML=bar+cheap+'<div class="day"><span>'+fmtDate(new Date())+' · '+hebDate(new Date())+(typeof jewishLine==='function'?jewishLine():'')+'</span></div>'+
      open.map(bubble).join('')+
      (done.length?'<div class="day"><span>נקנו ✓</span></div>'+done.map(bubble).join(''):'');
  }
  doodleBg(p);
}
/* כמות: "2", "1.5 קג", "3 חבילות" — אפשר לשנות ב־/+ או בלחיצה על המספר */
function qtyParts(q){const m=String(q||'').trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);return m?{n:parseFloat(m[1]),u:m[2].trim()}:null;}
function stepQty(q,d){
  const p=qtyParts(q)||{n:1,u:''};const step=(p.n%1||(p.u&&p.n<1))?0.5:1;
  let n=Math.round((p.n+d*step)*100)/100;
  if(n<step)n=p.u?step:1;
  return (!p.u&&n===1)?'':(n+(p.u?' '+p.u:''));
}
function qtyCtl(i){return '<span class="qty"><button type="button" data-qm="'+esc(i.id)+'" aria-label="'+T('פחות','Less')+'">−</button><button type="button" class="qv" data-qe="'+esc(i.id)+'" title="'+T('לשנות כמות','Change quantity')+'">'+(i.q?'×'+esc(i.q):'×1')+'</button><button type="button" data-qp="'+esc(i.id)+'" aria-label="'+T('יותר','More')+'">+</button></span>';}
function setItemQty(id,q){const i=curList().items.find(x=>x.id===id);if(!i)return;i.q=String(q||'').trim().slice(0,20);i.ts=Date.now();save();render();}
function itemHint(i){const st=typeof usualStore==='function'?usualStore(i.n):'';return st&&!i.done?'<span class="hint" title="'+T('איפה קונים את זה בדרך כלל','Where you usually buy it')+'">🏪 '+esc(st)+'</span>':'';}
function itemRow(i){return '<div class="it"><input type="checkbox" '+(i.done?'checked':'')+' data-tgl="'+esc(i.id)+'" aria-label="'+T('נקנה','Bought')+'"><span>'+esc(i.e)+'</span><span data-edititem="'+esc(i.id)+'" style="cursor:pointer;'+(i.done?'text-decoration:line-through;color:var(--muted)':'')+'">'+esc(i.n)+'</span>'+itemHint(i)+(i.done?(i.q?'<span class="q">×'+esc(i.q)+'</span>':''):qtyCtl(i))+'<button class="del" data-delitem="'+esc(i.id)+'" aria-label="'+T('מחיקה','Delete')+'">✕</button></div>';}
function bubble(i){
  const t=new Date(i.ts||Date.now());
  return '<div class="row '+(i.done?'me':'bot')+'"><div class="bub"><div class="bl1"><button type="button" class="chk'+(i.done?' on':'')+'" data-tgl="'+esc(i.id)+'" aria-pressed="'+(i.done?'true':'false')+'" title="'+(i.done?T('לבטל סימון','Unmark'):T('קניתי ✓','Bought ✓'))+'">'+(i.done?'✓':'')+'</button><span class="em">'+esc(i.e)+'</span><span class="nm" data-edititem="'+esc(i.id)+'" title="'+T('לחצו לעריכה','Tap to edit')+'">'+esc(i.n)+(i.note?'<small class="inote">'+esc(i.note)+'</small>':'')+'</span></div>'+
    '<div class="bl2">'+(i.done?(i.q?'<span class="q">×'+esc(i.q)+'</span>':'')+'<span class="tick" title="נקנה">✓✓</span>':qtyCtl(i)+itemHint(i))+
    '<span class="t">'+fmtTime(t)+'</span><button class="del" data-delitem="'+esc(i.id)+'" title="מחיקה" aria-label="'+T('מחיקה','Delete')+'">✕</button></div></div></div>';
}
function renderHist(){
  const p=document.querySelector('#paneHist');
  if(!state.history.length){p.innerHTML='<div class="empty">'+T('עוד אין היסטוריית קניות 🕘<br>סמנו פריטים כנקנו וסיימו קנייה','No shopping history yet 🕘<br>Check off items and finish shopping')+'</div>';doodleBg(p);return;}
  p.innerHTML=state.history.map((h,idx)=>{
    const d=new Date(h.ts);
    return '<div class="hcard"><div class="d">🛍️ '+esc(h.listName)+(h.store?' · 🏪 '+esc(h.store):'')+' · '+fmtDate(d)+' · '+hebDate(d)+' · '+fmtTime(d)+'</div><div class="its">'+h.items.map(i=>esc(i.e)+' '+esc(i.n)+(i.q?' ×'+esc(i.q):'')).join(' · ')+'</div><div class="by"><span class="tick">✓✓</span> הקנייה הושלמה'+(h.by?' · אושר ע״י '+esc(h.by):'')+'</div>'+
      '<div class="hacts"><button class="chip" data-hview="'+idx+'">👁️ '+T('הצגת הרשימה','View the list')+'</button><button class="chip" data-hdup="'+idx+'">📑 '+T('שכפול לרשימה חדשה','Copy to a new list')+'</button><button class="chip" data-hadd="'+idx+'">➕ '+T('להוסיף לרשימה הנוכחית','Add to current list')+'</button></div></div>';
  }).join('')+'<div style="text-align:center;margin:14px"><button class="chip" data-clearhist="1">🗑️ נקה היסטוריה</button></div>';
  doodleBg(p);
}
function renderHome(){
  const p=document.querySelector('#paneHome');
  const q=norm(state.homeQ||'');
  const missing=BASE.filter(n=>!pantryHas(n));
  let html='<div class="homebtns"><button class="hbtn2" id="btnMissing">🧺 מה חסר לי בבית? ('+missing.length+')</button><button class="hbtn2" id="btnHomeCount">🏠 יש לי '+pantryCount()+' מוצרים</button></div>';
  if(state.showMissing&&missing.length){
    html+='<div class="grp"><h3>חסר לך בבית לפי מצרכי בסיס</h3>'+missing.map(n=>'<div class="mrow"><span>'+emojiOf(n)+'</span><span>'+esc(n)+'</span><button data-missing="'+esc(n)+'">➕ לרשימה</button></div>').join('')+
      '<div style="text-align:center;margin-top:8px"><button class="chip" data-addall="1">הוסף הכל לרשימה</button></div></div>';
  }
  html+='<div class="pantry-add"><input id="pantryAddInput" placeholder="הוספת מוצר משלך לבית..." aria-label="הוספת מוצר מותאם אישית"><select id="pantryAddCat" aria-label="קטגוריה">'+CATS.map(c=>'<option value="'+esc(c)+'">'+CATE[c]+' '+esc(c)+'</option>').join('')+'</select><button id="pantryAddBtn">➕ הוסף</button></div>';
  if(state.customPantry.length){
    html+='<div class="grp"><h3>🧺 הפריטים שהוספתי בעצמי</h3>'+state.customPantry.map(n=>{
      const have=pantryHas(n);
      return '<div class="pitem'+(have?'':' off')+'"><span data-pan="'+esc(n)+'" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer"><span>'+(P[n]?P[n].e:'🛒')+'</span><span>'+esc(n)+'</span></span>'+(have?'<span class="have">✓ יש לי</span>':'<span style="font-size:12px;color:var(--muted)">אין</span>')+'<button class="edit" data-edit="'+esc(n)+'" title="עריכת שם" aria-label="עריכת שם">✎</button><button class="rm" data-rm="'+esc(n)+'" title="הסרה מהבית" aria-label="הסרה מהבית">✕</button></div>';
    }).join('')+'</div>';
  }
  html+='<input id="homeSearch" placeholder="🔍 חיפוש במקרר..." value="'+esc(state.homeQ||'')+'">';
  html+='<div id="homeCats">'+homeCatsHtml(q)+'</div>';
  p.innerHTML=html;
  doodleBg(p);
}
function renderHomeCats(){const el=document.querySelector('#homeCats');if(!el){renderHome();return;}el.innerHTML=homeCatsHtml(norm(state.homeQ||''));}
function homeCatsHtml(q){
  return CATS.map(c=>{
    const its=Object.keys(P).filter(n=>P[n].c===c&&(!q||n.includes(q)));
    if(!its.length)return '';
    return '<div class="grp"><h3>'+esc(CATE[c])+' '+esc(c)+'</h3>'+its.map(n=>{
      const have=pantryHas(n);
      return '<div class="pitem'+(have?'':' off')+'" data-pan="'+esc(n)+'"><span>'+P[n].e+'</span><span>'+esc(n)+'</span>'+(have?'<span class="have">✓ יש לי</span>':'<span style="margin-inline-start:auto;font-size:12px;color:var(--muted)">אין</span>')+'</div>';
    }).join('')+'</div>';
  }).join('');
}
/* קישורים בתשובות של יאמי: במקום כתובת ארוכה באנגלית — קישור לחיץ עם שם בעברית ("📅 עיתים לבינה").
   מקבל טקסט שכבר עבר esc, ולכן הכתובת לא יכולה לשבור את התגית (גרשיים ו-< כבר מוחלפים). */
function botLinks(h){return h.replace(/https?:\/\/[^\s<]+/g,u=>{let tail='';const m=u.match(/[.,;:!?)\]]+$/);if(m&&!/\(/.test(u)){tail=m[0];u=u.slice(0,-tail.length);}
  let host='';try{host=new URL(u.replace(/&amp;/g,'&')).hostname.replace(/^www\./,'');}catch(e){return u+tail;}
  const nm=/itimlabina\./.test(host)?'📅 '+T('עיתים לבינה — לוח הזמנים המלא','Itim Labina — full calendar'):/(^|\.)waze\.com$/.test(host)?'🧭 '+T('ניווט ב-Waze','Navigate with Waze'):/(^|\.)google\.[a-z.]+$/.test(host)&&/\/maps/.test(u)?'🗺️ '+T('פתיחה במפה','Open map'):/(^|\.)sefaria\.org/.test(host)?'📖 '+T('ספריא','Sefaria'):/yamshopping\.com$/.test(host)?'🔗 '+T('ים שופינג','YamShopping'):'🔗 '+host;
  return '<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+nm+'</a>'+tail;});}
function renderBot(){
  const p=document.querySelector('#botMsgs');
  p.innerHTML=(state.bot.map(m=>'<div class="row '+(m.who==='me'?'me':'bot')+'"><div class="bub">'+(m.who==='me'?esc(m.txt):botLinks(esc(m.txt))).replace(/\n/g,'<br>')+'<div class="t">'+fmtTime(new Date(m.ts))+'</div></div></div>').join('')||'<div class="empty">רגע, אני מתארגנת... 👩‍🍳</div>')+(window.botTyping?'<div class="row bot"><div class="bub"><span class="typing"><span></span><span></span><span></span></span></div></div>':'');
  /* 🚀 בזמן שהדף עוד נקרא — גלילה לסוף רק פעם אחת בסוף (קריאת scrollHeight מחשבת מחדש את כל הדף, וזה קרה כאן כמה פעמים בכל פתיחה) */
  if(document.readyState==='loading'){if(!window.__botScrollQ){window.__botScrollQ=1;document.addEventListener('DOMContentLoaded',()=>{window.__botScrollQ=0;const q=document.querySelector('#botMsgs');if(q)q.scrollTop=q.scrollHeight;},{once:true});}}
  else p.scrollTop=p.scrollHeight;
}
