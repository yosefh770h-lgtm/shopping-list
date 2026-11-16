
/* ================= גרסה 18: ביגוד וחתונה עם המלצות לקוחות, חישובי מבצע, "מה כולם עושים", בלי קוד בשיתוף ================= */
const $18=s=>document.querySelector(s);

/* ---------- 🐞 הסבר בעברית לכל תקלה ביומן: מה קרה, איפה באתר ובאיזה מכשיר ---------- */
const ERR_AREAS=[[/alert/i,'🔔 התראות מחיר'],[/sav(Add|From|Months|ings)|openSavings/i,'💰 כמה חסכתי'],[/basket/i,'🛒 השוואת סל / איפה הכי זול'],[/upload|xlsx|csv/i,'📤 העלאת רשימה מקובץ'],
  [/receipt|ocr/i,'🧾 צילום קבלה'],[/scan|barcode|zxing|quagga/i,'📷 סריקת ברקוד'],[/yami|bot|botSay|ai[A-Z]|gemini/i,'👩‍🍳 יאמי (הצ׳אט)'],[/onboard|household|tour/i,'🧭 ההיכרות למשתמש חדש'],
  [/allerg/i,'⚠️ אלרגיות'],[/guest/i,'👀 אורחים'],[/news|showUpdates|upd/i,'🆕 מה חדש באתר'],[/push|notif|bell/i,'🔔 התראות לטלפון / פעמון'],[/torah|parasha|sefaria/i,'📜 דבר תורה'],
  [/recipe/i,'🍲 מתכונים'],[/shopMode|shopping|shopMd/i,'🛍️ מצב קנייה'],[/price/i,'💰 מחירים'],[/store|chain|branch|nearby|places/i,'🏪 חנויות'],[/login|auth|signup|otp|password/i,'🔐 כניסה והרשמה'],
  [/cloud|sync|realtime|channel/i,'☁️ סנכרון בין מכשירים'],[/share|whatsapp|gmail/i,'📤 שיתוף'],[/ref|invite|ambassador/i,'💌 הזמנת חברים'],[/calendar|hebcal|zman|shabbat|holiday/i,'📅 לוח שנה וזמני שבת'],
  [/event|party|qty|portion/i,'🧮 כמויות לאירועים'],[/pantry|inventory|home/i,'🏠 הבית שלי (מלאי)'],[/history/i,'🕘 היסטוריה'],[/BO|boView|admin|VIEWS/,'🛠️ הבק אופיס'],[/render|list|item|chip/i,'📝 רשימת הקניות']];
function errExplain(r){const msg=String(r.msg||''),src=String(r.src||''),ua=String(r.ua||'');let m;
  const fn=(src.match(/^([\w$.]+) · /)||[])[1]||(src.match(/(?:^|\s)at ([\w$.]+)/)||[])[1]||(msg.match(/ at ([\w$.]+)/)||[])[1]||'';
  const area=(ERR_AREAS.find(([re])=>re.test(fn))||[])[1];
  const where=area?area+(fn?' (בפונקציה '+fn+')':''):fn?'בפונקציה '+fn+' באתר':(src?'בקוד של האתר':'לא ידוע — תקלה בלי פרטים');
  let what='תקלה בקוד של האתר',tip='';
  /* אוסף המחירים בשרת (לא תקלה באתר אצל משתמש) — ההודעה עצמה כבר כתובה בעברית */
  if(r.ver==='collector'||/^server\./.test(ua)||/^collector /.test(src)){const cm=src.match(/^collector (\w+) · (.+)$/);
    return {what:msg.replace(/^אוסף המחירים · /,'')||'תקלה באוסף המחירים',where:'🏷️ אוסף המחירים בשרת'+(cm&&cm[2]!=='_summary'?' (רשת '+cm[2]+')':''),tip:'זו לא תקלה באתר. הפירוט בבק אופיס ← איסוף מחירים. בדרך כלל זמני (הרשת לא פרסמה קובץ באותו יום).',who:'השרת (אוסף המחירים)'};}
  const bot=(window.YAM_BOT_RX||/Googlebot|bingbot|crawler|spider/i).test(ua);
  if(/^קובץ קוד לא נטען/.test(msg)){what='קובץ מהקוד של האתר לא נטען אצל המשתמש ('+msg.replace(/^קובץ קוד לא נטען: /,'')+'). לרוב קליטה חלשה או סינון. האתר הראה למשתמש כפתור "לטעון מחדש".';tip='אם זה קורה אצל משתמש אחד — חיבור / סינון אצלו. אם אצל רבים — לבדוק שהקובץ קיים בשרת.';}
  else if(/before initialization/.test(msg)){what='חלק מהקוד רץ לפני שחלק אחר הספיק להיטען. לרוב תוצאה של קובץ קוד שלא נטען (חיבור חלש / סינון), ולא תקלה בפני עצמה.';tip='לבדוק אם באותה דקה יש תקלות "חסר רכיב בקוד" — זה אותו מקרה.';}
  else if((m=msg.match(/Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading '([^']+)'\))?/))||(m=msg.match(/(undefined|null) is not an object(?: \(evaluating '([^']+)'\))?/))){
    what='האתר ניסה להשתמש בנתון שלא היה קיים'+(m[2]?' ("'+m[2]+'")':'')+'. בדרך כלל נתון שחסר אצל המשתמש, למשל אחרי יציאה מהחשבון, החלפת משתמש או נתונים ישנים בדפדפן.';tip='להעביר את התקלה לתיקון. התיקון: לבדוק שהנתון קיים לפני שמשתמשים בו.';}
  else if((m=msg.match(/([\w$.]+) is not a function/))){what='האתר ניסה להפעיל פעולה שלא קיימת ("'+m[1]+'"). לרוב גרסה ישנה של האתר שנשמרה בדפדפן, או רכיב חיצוני שלא נטען.';tip='אם זה קרה רק פעם או פעמיים, רענון של הדף פותר. אם זה חוזר, להעביר לתיקון.';}
  else if((m=msg.match(/([\w$]+) is not defined|Can't find variable: ([\w$]+)/))){what='חסר רכיב בקוד ("'+(m[1]||m[2])+'"). לרוב קובץ קוד או ספרייה שלא נטענו, בגלל חיבור חלש או חסימה (למשל נטפרי). כמה תקלות כאלה באותה דקה אצל אותו מכשיר = קובץ אחד שלא נטען.';tip='לבדוק אם זה קורה אצל משתמש אחד בלבד (סינון / חיבור) או אצל רבים (תקלה באתר).';}
  else if(/QuotaExceeded|quota.*storage|exceeded the quota/i.test(msg)){what='נגמר המקום לשמירת נתונים בדפדפן של המשתמש.';tip='אצל המשתמש: לנקות נתוני גלישה ישנים. אם זה חוזר אצל הרבה משתמשים, להעביר לתיקון.';}
  else if(/429|RESOURCE_EXHAUSTED/i.test(msg)){what='נגמרה המכסה היומית של שירות הבינה המלאכותית (Gemini).';tip='מתאפס מחר. אפשר להוסיף מפתח נוסף GEMINI_API_KEY_2 בהגדרות הפונקציות ב-Supabase.';}
  else if(/SyntaxError|Unexpected token|Invalid regular expression|unexpected end/i.test(msg)){what=/JSON/i.test(msg)?'התקבלה מהשרת תשובה לא תקינה (לא בפורמט הצפוי).':'הדפדפן לא הצליח לקרוא חלק מהקוד. לרוב דפדפן ישן מאוד, או קובץ שנחסם או נקטע בדרך.';tip='לבדוק באיזה מכשיר ודפדפן זה קורה (בשורה "אצל").';}
  else if(/JWT|token.*expired|refresh_token|not authenticated|Invalid login/i.test(msg)){what='בעיה בהתחברות: הכניסה של המשתמש פגה או לא תקינה.';tip='בדרך כלל נפתר כשהמשתמש מתחבר מחדש.';}
  else if(/permission denied|42501|forbidden|row-level security/i.test(msg)){what='האתר ניסה פעולה שהמשתמש לא מורשה לעשות, והשרת חסם אותה (ההגנה עבדה).';tip='אם זה קורה הרבה: כנראה צריך להריץ שוב את קוד ה-SQL, או שיש באג.';}
  else if(/timeout|timed out|AbortError/i.test(msg)){what='פעולה לקחה יותר מדי זמן, כנראה חיבור איטי.';}
  else if(/function .* does not exist|Could not find the function|PGRST202/i.test(msg)){what='האתר קרא לפונקציה בשרת שעוד לא קיימת.';tip='להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית).';}
  else if(/^promise$|^\[object Object\]$/.test(msg.trim())){what='פעולה ברקע נכשלה בלי הודעה ברורה.';}
  const os=/iPhone|iPad/.test(ua)?'אייפון':/Android/.test(ua)?'אנדרואיד':/Windows/.test(ua)?'מחשב Windows':/Mac OS/.test(ua)?'מק':/Linux/.test(ua)?'לינוקס':'';
  const br=/Edg\//.test(ua)?'Edge':/SamsungBrowser/.test(ua)?'דפדפן סמסונג':/CriOS|Chrome\//.test(ua)?'כרום':/FxiOS|Firefox/.test(ua)?'פיירפוקס':/Safari\//.test(ua)?'ספארי':'';
  if(bot){tip='🤖 זה בוט של מנוע חיפוש, לא משתמש אמיתי — אפשר להתעלם.';}
  return {what,where:/^קובץ קוד לא נטען/.test(msg)?'📦 טעינת האתר':where,tip,who:bot?'🤖 בוט של מנוע חיפוש':[os,br].filter(Boolean).join(' · ')||'מכשיר לא ידוע'};}
window.errExplain=errExplain;
/* ---------- 🐞 יומן תקלות: שגיאה אצל משתמש נרשמת לבק אופיס (עד 10 בכל כניסה, בלי כפילויות) ---------- */
(function(){const seen=new Set();let n=0;
  const IGN=/ResizeObserver loop|^Script error\.?$|Non-Error promise rejection|AbortError|Load failed|Failed to fetch|NetworkError|extension:\/\//i;
  /* נובמבר 2026: בוטים של מנועי חיפוש (Googlebot מצייר את הדף כמו "כרום באנדרואיד", ולפעמים מדלג על קבצים) — לא נרשמים ביומן */
  const BOT=window.YAM_BOT_RX=/Googlebot|Google-InspectionTool|Storebot-Google|AdsBot|Mediapartners-Google|APIs-Google|Google-Read-Aloud|Chrome-Lighthouse|HeadlessChrome|bingbot|BingPreview|YandexBot|DuckDuckBot|Baiduspider|Applebot|facebookexternalhit|Bytespider|GPTBot|ClaudeBot|PetalBot|SemrushBot|AhrefsBot|crawler|spider/i;
  const isBot=BOT.test(navigator.userAgent||'');
  /* קובץ js שלא נטען (נרשם ב-index.html, window.__jsFail): נרשמת תקלה אחת ברורה, וה"חסר רכיב" / "לפני הגדרה" שנובעים ממנו לא נרשמים */
  const CASC=/is not defined|before initialization|Can't find variable/i;let failSent=false;
  const jsFail=()=>{const f=window.__jsFail;if(!f||!f.length||failSent)return;failSent=true;post('קובץ קוד לא נטען: '+Array.from(new Set(f)).join(', '),'script load');};
  const send=(msg,src)=>{if(window.__jsFail&&window.__jsFail.length){jsFail();if(CASC.test(String(msg||'')))return;}post(msg,src);};
  const post=(msg,src)=>{if(isBot)return;msg=String(msg||'').slice(0,500);src=String(src||'').slice(0,300);if(!msg||IGN.test(msg)||IGN.test(src))return;const k=msg+'|'+src;if(seen.has(k)||++n>10)return;seen.add(k);
    try{if(sb)sb.rpc('log_client_error',{p_msg:msg,p_src:src,p_ua:navigator.userAgent.slice(0,200),p_ver:String(typeof APP_VERSION!=='undefined'?APP_VERSION:'')}).then(()=>{},()=>{});}catch(e){}};
  const fnOf=st=>{const l=String(st||'').split('\n').map(x=>x.trim()).find(x=>/^at \S+ \(|^[\w$.]+@/.test(x))||'';const m=l.match(/^at (\S+) \(/)||l.match(/^([\w$.]+)@/);return m?m[1].replace(/^Object\.|^HTMLButtonElement\./,''):'';};
  window.addEventListener('error',e=>{if(e&&e.filename&&!e.filename.startsWith(location.origin))return;const fn=fnOf(e&&e.error&&e.error.stack);send(e.message,(fn?fn+' · ':'')+(e.filename||'').replace(location.origin,'')+':'+(e.lineno||0)+':'+(e.colno||0));});
  window.addEventListener('unhandledrejection',e=>{const r=e&&e.reason;const fn=r&&r.stack?fnOf(r.stack):'';send((r&&(r.message||r))||'promise',r&&r.stack?(fn?fn+' · ':'')+(String(r.stack).split('\n')[1]||'').trim():'');});
  window.logClientError=send;
  /* קובץ שלא נטען בלי תקלה אחריו — נרשם בסוף הטעינה. והמשתמש מקבל כפתור לטעון מחדש (אחרת חלק מהכפתורים פשוט לא עובדים) */
  const jsFailBar=()=>{const f=window.__jsFail;if(!f||!f.length||isBot||document.getElementById('jsFailBar'))return;jsFail();
    const tt=(he,en)=>typeof T==='function'?T(he,en):he;
    const d=document.createElement('div');d.id='jsFailBar';d.setAttribute('role','alert');
    d.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:99999;background:#fff4e5;color:#5a3500;border:1px solid #f0b46b;border-radius:14px;padding:10px 12px;display:flex;gap:10px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.18);font-size:15px;max-width:520px;margin:0 auto';
    d.innerHTML='<span style="flex:1">⚠️ '+tt('חלק מהאתר לא נטען (כנראה חיבור חלש).','Part of the site did not load (weak connection?).')+'</span>';
    const b=document.createElement('button');b.type='button';b.textContent='🔄 '+tt('לטעון מחדש','Reload');b.style.cssText='background:#1e3a5f;color:#fff;border:0;border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer';b.onclick=()=>location.reload();
    const x=document.createElement('button');x.type='button';x.textContent='✕';x.setAttribute('aria-label',tt('סגירה','Close'));x.style.cssText='background:none;border:0;font:inherit;cursor:pointer;color:inherit';x.onclick=()=>d.remove();
    d.append(b,x);document.body.appendChild(d);};
  if(document.readyState==='complete')setTimeout(jsFailBar,0);else window.addEventListener('load',jsFailBar);})();

/* ---------- 🔗 בשיתוף: בלי "הקוד שלי" (לא רלוונטי מאז המשתמשים המשניים). נשאר רק כשמחוברים לחשבון של מישהו אחר ---------- */
(function(){const fix=()=>{const b=$18('#cloudBtn');if(b)b.hidden=!/^(🔗|👥)/.test(b.textContent.trim());};fix();
  const b=$18('#cloudBtn');if(b)new MutationObserver(fix).observe(b,{childList:true,characterData:true,subtree:true});})();

/* ---------- 👀 עוד פעולות ביומן הפעילות (המנהל רואה ב"מה כולם עושים") ---------- */
const _v18ErrAdd=errAdd;errAdd=function(t){const before=errOpen().length;const e=_v18ErrAdd.apply(this,arguments);if(e&&errOpen().length>before)logAct('errand_add',e.t+(e.place?' · '+e.place:''));return e;};
const _v18ErrSet=errSet;errSet=function(id,patch){const e=(state.errands||[]).find(x=>x.id===id);const r=_v18ErrSet.apply(this,arguments);if(e){if(patch&&patch.del)logAct('errand_del',e.t);else if(patch&&patch.done)logAct('errand_done',e.t);}return r;};
const _v18OpenBasket=openBasket;openBasket=function(){logAct('basket',curList().name);return _v18OpenBasket.apply(this,arguments);};
const _v18OnScanned=onScanned;onScanned=function(code){logAct('scan',code);return _v18OnScanned.apply(this,arguments);};

/* ---------- 👗 ביגוד: נשים / גברים / חתונה ---------- */
const CLOTH_SUBS18={
  women:[['dresses','👗',T('שמלות וחליפות','Dresses & suits')],['tops','👚',T('חולצות וחצאיות','Tops & skirts')],['shoes','👠',T('נעליים','Shoes')],['bags','👜',T('תיקים ואקססוריז','Bags & accessories')],['head','🧣',T('כיסויי ראש ופאות','Head coverings & wigs')],['coats','🧥',T('מעילים','Coats')],['kids','🧒',T('ילדים ותינוקות','Kids & babies')]],
  men:[['suits','🤵',T('חליפות','Suits')],['shirts','👔',T('חולצות','Shirts')],['pants','👖',T('מכנסיים','Trousers')],['shoes','👞',T('נעליים','Shoes')],['hats','🎩',T('כובעים','Hats')],['coats','🧥',T('מעילים וקפוטות','Coats & frocks')],['tzitzit','🕊️',T('טליתות וציציות','Tallit & tzitzit')],['acc','⌚',T('עניבות, חגורות ושעונים','Ties, belts & watches')]]};
const WED_DEFAULT18={
  groom:['חליפת חתונה','קיטל','טלית','שעון','חולצות לבנות (4)','עניבה','נעליים','גרביים','חגורה','כובע','חליפה לשבע ברכות','מעיל','ציציות','בושם','תיק לשבוע הראשון'],
  bride:['שמלת כלה (קנייה או השכרה)','הינומה','נעלי כלה','שמלות לשבע ברכות','כיסויי ראש','פאה','תכשיטים','תיק ערב','חלוקים ופיג׳מות','נעלי בית','מעיל','בושם','איפור ושיער לחתונה']};
let wedCfg18=null,catCfg18=null,guideCfg18=null;
/* מה לעשות ולאן ללכת — ברירת מחדל לחתונה. המנהל עורך הכל בבק אופיס ← 👗 ביגוד והמלצות */
const GUIDE_DEFAULT18={women:[],men:[],
  groom:['חודשיים לפני | מזמינים חליפה — לוקח 2–3 שבועות כולל התאמה','חודש לפני | טלית, קיטל ושעון — שואלים בחנויות על מבצע לחתנים','שבועיים לפני | נעליים, חולצות ועניבה — מודדים יחד עם החליפה','שבוע לפני | מגהצים ומכינים תיק לחתונה ולשבע ברכות'],
  bride:['3 חודשים לפני | בוחרים שמלה (קנייה או השכרה) — המדידות לוקחות זמן','חודשיים לפני | פאה וכיסויי ראש — מזמינים ומסדרים','חודש לפני | נעליים, תכשיטים ושמלות לשבע ברכות','שבוע לפני | מדידה אחרונה, וקובעים תור לאיפור ולשיער']};
const _v18ApplyConfig=applyConfig;applyConfig=function(k,v){_v18ApplyConfig.apply(this,arguments);if(k==='wedding_lists')wedCfg18=v||null;if(k==='cloth_cats')catCfg18=v||null;if(k==='cloth_guide')guideCfg18=v||null;};
const guide18=k=>{const l=guideCfg18&&Array.isArray(guideCfg18[k])?guideCfg18[k]:GUIDE_DEFAULT18[k]||[];return l.map(x=>{const i=String(x).indexOf('|');return i>0?[x.slice(0,i).trim(),x.slice(i+1).trim()]:['',String(x).trim()];}).filter(x=>x[1]);};
const wedList18=k=>{const l=wedCfg18&&Array.isArray(wedCfg18[k])&&wedCfg18[k].length?wedCfg18[k]:WED_DEFAULT18[k];return l;};
let cl18={g:'women',sub:'',wed:'groom',shops:null,recs:null,votes:{},at:0,err:null};
async function loadCl18(force){
  if(!sb||!authUser){cl18.shops=[];cl18.recs=[];return;}
  if(cl18.shops&&!force&&Date.now()-cl18.at<5*60000)return;
  const [a,b,v,cnt]=await Promise.all([sb.from('clothing_shops').select('*').order('name').limit(800),sb.from('store_recs').select(COLS23.recs).order('created_at',{ascending:false}).limit(800),sb.from('cloth_votes').select('target,target_id,vote,user_id').limit(5000),sb.rpc('cloth_vote_counts')]);
  cl18.err=a.error||b.error||null;cl18.shops=(a.data||[]).sort((x,y)=>(y.featured?1:0)-(x.featured?1:0));cl18.recs=(b.data||[]).filter(r=>r.kind!=='category').sort((x,y)=>(y.official?1:0)-(x.official?1:0));cl18.at=Date.now();
  /* הסיכומים מגיעים מהשרת (אף אחד לא רואה מי הצביע מה); מהטבלה עצמה — רק ההצבעות שלי */
  const me=authUser&&authUser.id;cl18.votes={};const slot=x=>{const k=x.target+':'+x.target_id;return cl18.votes[k]=cl18.votes[k]||{ok:0,bad:0,mine:0};};
  if(cnt&&!cnt.error&&Array.isArray(cnt.data)){cnt.data.forEach(x=>{const o=slot(x);if(x.vote>0)o.ok+=Number(x.n)||0;else o.bad+=Number(x.n)||0;});(v.data||[]).forEach(x=>{if(x.user_id===me)slot(x).mine=x.vote;});}
  else (v.data||[]).forEach(x=>{const o=slot(x);if(x.vote>0)o.ok++;else o.bad++;if(x.user_id===me)o.mine=x.vote;});
}
const subsOf18=g=>{const k=g==='men'?'men':'women';const c=catCfg18&&Array.isArray(catCfg18[k])&&catCfg18[k].length?catCfg18[k]:null;return c?c.filter(x=>Array.isArray(x)&&x[0]&&x[2]):CLOTH_SUBS18[k];};
const subLabel18=(g,k)=>{const s=subsOf18(g).find(x=>x[0]===k);return s?s[1]+' '+s[2]:'';};
function shopsFor18(g,sub){return (cl18.shops||[]).filter(s=>(g==='wedding'?s.wedding&&(cl18.wed==='groom'?s.gender!=='women':s.gender!=='men'):(s.gender===g||s.gender==='both'))&&(!sub||(s.subs||[]).includes(sub)));}
function recsFor18(g,sub,kind){return (cl18.recs||[]).filter(r=>r.section===g&&(!sub||r.sub===sub)&&(!kind||r.kind===kind));}
function shopStars18(name){const rs=(cl18.recs||[]).filter(r=>r.status==='approved'&&r.stars&&norm(r.shop)===norm(name));if(!rs.length)return null;return {avg:Math.round(10*rs.reduce((a,r)=>a+r.stars,0)/rs.length)/10,n:rs.length};}
const stars18=n=>'<span class="stars18" aria-label="'+n+' '+T('כוכבים','stars')+'">'+'★'.repeat(Math.round(n))+'<span style="opacity:.3">'+'★'.repeat(5-Math.round(n))+'</span></span>';
/* ✅ נכון / ❌ לא נכון — כמו בדיווחי המחירים */
function votes18(target,id){const o=(cl18.votes||{})[target+':'+id]||{ok:0,bad:0,mine:0};
  return '<span class="vt18" role="group" aria-label="'+T('האם המידע נכון?','Is this correct?')+'"><button class="'+(o.mine>0?'on':'')+'" data-cvote="'+target+'|'+id+'|1" title="'+T('המידע נכון','Correct')+'">✅ '+T('נכון','Correct')+(o.ok?' <b>'+o.ok+'</b>':'')+'</button><button class="bad'+(o.mine<0?' on':'')+'" data-cvote="'+target+'|'+id+'|-1" title="'+T('המידע לא נכון — דיווח לצוות','Wrong — report')+'">❌ '+T('לא נכון','Wrong')+(o.bad?' <b>'+o.bad+'</b>':'')+'</button></span>';}
function shopCard18(s){const st=shopStars18(s.name);const where=[s.city,s.address].filter(Boolean).join(' · ');const web=/^https?:\/\//i.test(s.website)?s.website:(s.website?'https://'+s.website:'');
  return '<div class="shop18'+(s.featured?' feat':'')+'"><button class="shside18" data-sh18="shop|'+esc(s.id)+'" title="'+T('שיתוף','Share')+'" aria-label="'+T('שיתוף','Share')+'">📤</button><div class="t">'+(s.featured?'<span class="feat18">⭐ '+T('האתר ממליץ','Site pick')+'</span>':'')+'<b>'+esc(s.name)+'</b>'+(st?stars18(st.avg)+'<small class="meta">'+st.avg+' · '+st.n+' '+T('המלצות','reviews')+'</small>':'')+(s.status==='pending'?'<span class="rec18 pend" style="padding:1px 7px;margin:0">⏳ '+T('ממתין לאישור','pending')+'</span>':'')+'</div>'+
    (where?'<div class="meta">📍 '+esc(where)+'</div>':'')+((s.subs||[]).length&&cl18.g!=='wedding'?'<div class="meta">'+(s.subs||[]).map(k=>subLabel18(s.gender==='men'?'men':(s.gender==='women'?'women':cl18.g),k)).filter(Boolean).map(esc).join(' · ')+'</div>':'')+
    (s.about?'<p class="ab">'+esc(s.about)+'</p>':'')+crSlot('shops',s.id,{p:'💡 '+T('הוצע ע״י ','Suggested by '),b:1})+'<div class="acts">'+(where?'<a href="'+esc(wazeUrl(s.name+' '+where))+'" target="_blank" rel="noopener">🧭 '+T('ניווט','Navigate')+'</a>':'')+(s.phone?'<a href="tel:'+esc(s.phone.replace(/[^\d+]/g,''))+'">📞 '+esc(s.phone)+'</a>':'')+(web?'<a href="'+esc(web)+'" target="_blank" rel="noopener">🌐 '+T('אתר','Website')+'</a>':'')+'<button data-clrec="'+esc(s.name)+'">✍️ '+T('להמליץ','Recommend')+'</button></div>'+votes18('shop',s.id)+'</div>';}
function recCard18(r){return '<div class="rec18'+(r.official?' off':'')+'">'+(r.status==='approved'?'<button class="shside18" data-sh18="rec|'+esc(r.id)+'" title="'+T('שיתוף','Share')+'" aria-label="'+T('שיתוף','Share')+'">📤</button>':'')+(r.official?'<span class="feat18">⭐ '+T('האתר ממליץ','Site pick')+'</span> ':'')+(r.stars?stars18(r.stars)+' ':'')+(r.kind==='item'?'<b>💡 '+esc(r.body)+'</b>':'<b>'+esc(r.shop||'')+'</b>'+(r.city?' <small>· '+esc(r.city)+'</small>':''))+(r.status==='pending'?'<span class="pend">⏳ '+T('ממתין לאישור','pending')+'</span>':'')+
  (r.kind==='item'?'':'<p>'+esc(r.body)+'</p>')+'<small>— '+(r.official?esc(T('צוות האתר','Site team')):crSlot('clothing',r.id,{f:T('לקוח/ה','Customer')}))+' · '+esc(agoText(r.created_at))+'</small>'+(r.status==='approved'?votes18('rec',r.id):'')+'</div>';}
function cl18Html(){
  const g=cl18.g;
  let h='<div class="cl18" data-g="'+g+'"><div class="clhero"><h2>'+(g==='wedding'?'💍 '+T('קניות לחתונה','Wedding shopping'):(g==='men'?'🤵 ':'👗 ')+T('ביגוד ואופנה','Clothing & fashion'))+'</h2><p>'+(g==='wedding'?T('רשימת קניות מומלצת לחתן ולכלה, ואיפה כדאי לקנות — מהמלצות של זוגות ומשפחות.','A recommended list for groom and bride, and where to buy — from real recommendations.'):T('חנויות בגדים מסודרות לפי נשים וגברים וסוג — עם המלצות של לקוחות אמיתיים.','Clothing stores by women, men and type — with real customer recommendations.'))+'</p></div>'+
    '<div class="clseg" role="tablist">'+[['women','👩 '+T('נשים','Women')],['men','👨 '+T('גברים','Men')],['wedding','💍 '+T('חתונה','Wedding')]].map(([k,l])=>'<button role="tab" aria-selected="'+(g===k)+'" class="'+(g===k?'on':'')+'" data-clg="'+k+'">'+l+'</button>').join('')+'</div>';
  if(!sb||!authUser)return h+'<div class="empty">'+T('מתחברים לחשבון כדי לראות חנויות והמלצות 🙂','Sign in to see stores and recommendations 🙂')+'</div></div>';
  if(cl18.shops===null)return h+'<div class="empty">'+T('טוען...','Loading...')+'</div></div>';
  if(cl18.err&&isAdmin())h+='<p class="muted-note">⚠️ צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית)</p>';
  const guideCard=k=>{const gl=guide18(k);return gl.length?'<div class="guide18"><h3>🧭 '+T('מה לעשות ולאן ללכת','What to do & where to go')+'</h3>'+gl.map(([a,b2])=>'<div class="gstep">'+(a?'<b>'+esc(a)+'</b>':'')+'<span>'+esc(b2)+'</span></div>').join('')+'</div>':'';};
  if(g==='wedding'){const k=cl18.wed;const items=wedList18(k);const done=(state.wed18&&state.wed18[k])||{};const nDone=items.filter(i=>done[i]).length;
    const tips=recsFor18('wedding',k,'item').filter(r=>r.status==='approved'&&!items.some(i=>norm(i)===norm(r.body)));
    h+='<div class="wedtabs">'+[['groom','🤵 '+T('חתן','Groom')],['bride','👰 '+T('כלה','Bride')]].map(([x,l])=>'<button class="'+(k===x?'on':'')+'" data-clwed="'+x+'">'+l+'</button>').join('')+'</div>';
    h+=guideCard(k);
    h+='<div class="clh"><h3>📋 '+T('רשימת הקניות המומלצת','Recommended shopping list')+' <button class="pr-act" data-sh18="wed|'+k+'" title="'+T('לשתף את הרשימה','Share the list')+'" aria-label="'+T('לשתף את הרשימה','Share the list')+'">📤</button></h3><small class="muted-note" style="margin:0">'+nDone+'/'+items.length+'</small></div><div class="wedlist"><div class="wedprog"><i style="width:'+Math.round(100*nDone/Math.max(1,items.length))+'%"></i></div>'+
      items.map(i=>'<div class="wed18'+(done[i]?' on':'')+'" data-wedck="'+esc(i)+'" role="checkbox" aria-checked="'+!!done[i]+'" tabindex="0"><span class="bx">'+(done[i]?'✓':'')+'</span><span>'+esc(i)+'</span></div>').join('')+
      (tips.length?'<div class="clh" style="margin-top:10px"><h3 style="font-size:14px">💡 '+T('לקוחות ממליצים להוסיף','Customers suggest adding')+'</h3></div><div class="tips18">'+tips.slice(0,12).map(r=>'<button class="chip" data-wedtip="'+esc(r.body)+'">➕ '+esc(r.body)+'</button>').join('')+'</div>':'')+'</div>'+
      '<div class="clacts"><button data-wedlist="1">📝 '+T('להפוך לרשימת קניות','Make it a shopping list')+'</button><button class="sec" data-clnew="item">💡 '+T('להמליץ על מוצר','Suggest an item')+'</button></div>';
    const sh=shopsFor18('wedding',''),rs=recsFor18('wedding',k,'store');
    h+='<div class="clh"><h3>🛍️ '+T('איפה לקנות','Where to buy')+'</h3></div>'+(sh.map(shopCard18).join('')||'')+(rs.map(recCard18).join('')||'')+((!sh.length&&!rs.length)?'<div class="empty" style="padding:14px">'+T('עוד אין המלצות — היו הראשונים להמליץ 💚','No recommendations yet — be the first 💚')+'</div>':'');
    h+='<div class="clacts"><button data-clnew="store">✍️ '+T('להמליץ איפה לקנות','Recommend a store')+'</button><button class="sec" data-claddshop="1">➕ '+T('הוספת חנות','Add a store')+'</button></div>';
    return h+'</div>';}
  if(!cl18.sub){
    h+='<div class="clgrid">'+subsOf18(g).map(([k,ic,n])=>{const ns=shopsFor18(g,k).length,nr=recsFor18(g,k).filter(r=>r.status==='approved').length;
      return '<button class="clcard" data-clsub="'+k+'"><span class="ic">'+ic+'</span><b>'+esc(n)+'</b><small>'+(ns||nr?(ns===1?T('חנות אחת','1 store'):ns+' '+T('חנויות','stores'))+(nr?' · '+nr+' '+T('המלצות','reviews'):''):T('עוד אין — להמליץ?','None yet'))+'</small></button>';}).join('')+
      '<button class="clcard req" data-clcat="1"><span class="ic">＋</span><b>'+T('חסרה קטגוריה?','Missing a category?')+'</b><small>'+T('לבקש שנוסיף','Ask us to add it')+'</small></button></div>';
    h+=guideCard(g);
    const latest=recsFor18(g,'','store').filter(r=>r.status==='approved').slice(0,5);
    if(latest.length)h+='<div class="clh"><h3>⭐ '+T('המלצות אחרונות','Latest recommendations')+'</h3></div>'+latest.map(recCard18).join('');
    h+='<div class="clacts"><button data-clnew="store">✍️ '+T('להמליץ על חנות','Recommend a store')+'</button><button class="sec" data-claddshop="1">➕ '+T('הוספת חנות','Add a store')+'</button></div>';
    return h+'</div>';}
  const sh=shopsFor18(g,cl18.sub),rs=recsFor18(g,cl18.sub,'store');
  h+='<button class="clback" data-clsub="">→ '+T('כל הקטגוריות','All categories')+'</button><div class="clh"><h3>'+esc(subLabel18(g,cl18.sub))+' <button class="pr-act" data-sh18="cat|'+esc(g+'/'+cl18.sub)+'" title="'+T('לשתף את הקטגוריה','Share category')+'">📤</button></h3><small class="muted-note" style="margin:0">'+(sh.length===1?T('חנות אחת','1 store'):sh.length+' '+T('חנויות','stores'))+'</small></div>'+
    (sh.map(shopCard18).join('')||'<div class="empty" style="padding:12px">'+T('עוד אין חנויות כאן — מכירים חנות טובה? הוסיפו אותה 🙂','No stores yet — know a good one? Add it 🙂')+'</div>')+
    (rs.length?'<div class="clh"><h3>⭐ '+T('מה הלקוחות אומרים','What customers say')+'</h3></div>'+rs.map(recCard18).join(''):'')+
    '<div class="clacts"><button data-clnew="store">✍️ '+T('להמליץ על חנות','Recommend a store')+'</button><button class="sec" data-claddshop="1">➕ '+T('הוספת חנות','Add a store')+'</button></div>';
  return h+'</div>';
}
/* ---- טופס המלצה ---- */
function openRec18(kind,shop){
  if(!sb||!authUser){flash(T('צריך להתחבר','Sign in first'));return;}
  const g=cl18.g,sub=g==='wedding'?cl18.wed:cl18.sub;const isItem=kind==='item';
  const subSel=g==='wedding'?'':'<label class="il">'+T('קטגוריה','Category')+'</label><select id="rc18s">'+subsOf18(g).map(([k,ic,n])=>'<option value="'+k+'"'+(k===sub?' selected':'')+'>'+ic+' '+esc(n)+'</option>').join('')+'</select>';
  const b=openSheet(isItem?'💡 '+T('המלצה על מוצר ל'+(cl18.wed==='groom'?'חתן':'כלה'),'Suggest an item'):'✍️ '+T('המלצה על חנות','Recommend a store'),
    (isItem?'<p class="muted-note">'+T('מה עוד כדאי לקנות? ההמלצה תופיע לכולם אחרי אישור.','What else is worth buying? Shown after approval.')+'</p><label class="il" for="rc18b">'+T('המוצר','Item')+'</label><input id="rc18b" maxlength="80" placeholder="'+T('למשל: נעלי בית לשבע ברכות','e.g. slippers')+'">':
    '<p class="muted-note">'+T('ההמלצה שלך עוזרת לכולם לקנות נכון 💚 היא תופיע אחרי אישור של צוות האתר.','Your recommendation helps everyone 💚 Shown after approval.')+'</p>'+subSel+
    '<label class="il" for="rc18n">'+T('שם החנות','Store name')+'</label><input id="rc18n" maxlength="60" list="rc18l" value="'+esc(shop||'')+'"><datalist id="rc18l">'+(cl18.shops||[]).map(s=>'<option value="'+esc(s.name)+'">').join('')+'</datalist>'+
    '<label class="il" for="rc18c">'+T('עיר','City')+'</label><input id="rc18c" maxlength="40">'+
    '<label class="il">'+T('כמה כוכבים?','How many stars?')+'</label><div class="starpick" id="rc18st">'+[1,2,3,4,5].map(n=>'<button type="button" data-st="'+n+'" aria-label="'+n+'">★</button>').join('')+'</div>'+
    '<label class="il" for="rc18b">'+T('מה כדאי לדעת?','What should people know?')+'</label><textarea id="rc18b" maxlength="1000" style="min-height:90px" placeholder="'+T('שירות, מחירים, מבחר, מידות...','Service, prices, choice, sizes...')+'"></textarea>')+
    '<button id="rc18go" style="width:100%;margin-top:10px">📤 '+T('שליחה','Send')+'</button>');
  let stars=0;
  b.onclick=async e=>{const s=e.target.closest('[data-st]');if(s){stars=+s.dataset.st;b.querySelectorAll('[data-st]').forEach(x=>x.classList.toggle('on',+x.dataset.st<=stars));return;}
    if(!e.target.closest('#rc18go'))return;
    const body=($18('#rc18b').value||'').trim(),name=isItem?'':($18('#rc18n').value||'').trim(),city=isItem?'':($18('#rc18c').value||'').trim();
    if(body.length<2||(!isItem&&!name)){flash(isItem?T('מה המוצר?','Which item?'):T('צריך שם חנות וכמה מילים','Store name and a few words needed'));return;}
    if([body,name,city].some(hasProfanity)){flash('🙏');return;}
    const rec={section:g,sub:g==='wedding'?cl18.wed:(($18('#rc18s')||{}).value||sub||''),kind:isItem?'item':'store',shop:name,city,body:body.slice(0,1000),stars:stars||null,user_id:authUser.id,by_name:((state.user&&state.user.name)||'').slice(0,40),status:isStaff()?'approved':'pending'};
    e.target.disabled=true;const {error}=await sb.from('store_recs').insert(rec);e.target.disabled=false;
    if(error){flash('⚠️ '+(/store_recs/.test(error.message)?T('הפיצ\'ר עוד לא הופעל בשרת 🙏','Not enabled yet 🙏'):error.message));return;}
    logAct('cloth_rec',(rec.shop||rec.body)+' · '+rec.section+(rec.sub?'/'+rec.sub:''));
    closeSheet();flash('💚 '+(isStaff()?T('ההמלצה פורסמה','Published'):T('תודה! ההמלצה נשלחה לאישור','Thanks! Sent for approval')));await loadCl18(true);renderStores();};
}
/* ---- הוספת חנות ביגוד ---- */
function openAddShop18(){
  if(!sb||!authUser){flash(T('צריך להתחבר','Sign in first'));return;}
  const g=cl18.g==='men'?'men':'women';
  const b=openSheet('➕ '+T('הוספת חנות ביגוד','Add a clothing store'),'<p class="muted-note">'+(isStaff()?T('את/ה בצוות — יתווסף מיד.','You are staff — added immediately.'):T('תופיע לכולם אחרי אישור של צוות האתר.','Shown after approval.'))+'</p>'+
    '<label class="il" for="as18n">'+T('שם החנות','Store name')+'</label><input id="as18n" maxlength="60">'+
    '<label class="il" for="as18g">'+T('למי','For')+'</label><select id="as18g"><option value="women"'+(g==='women'?' selected':'')+'>👩 '+T('נשים','Women')+'</option><option value="men"'+(g==='men'?' selected':'')+'>👨 '+T('גברים','Men')+'</option><option value="both">👩👨 '+T('נשים וגברים','Both')+'</option></select>'+
    '<label class="il">'+T('מה מוכרים','What they sell')+'</label><div class="subpick" id="as18s"></div>'+
    '<label class="radio" style="margin-top:8px"><input type="checkbox" id="as18w"'+(cl18.g==='wedding'?' checked':'')+'> 💍 '+T('מתאים לחתונה','Good for weddings')+'</label>'+
    '<div class="grid2"><div><label class="il" for="as18c">'+T('עיר','City')+'</label><input id="as18c" maxlength="40"></div><div><label class="il" for="as18a">'+T('כתובת','Address')+'</label><input id="as18a" maxlength="120"></div><div><label class="il" for="as18p">'+T('טלפון','Phone')+'</label><input id="as18p" maxlength="30" type="tel" dir="ltr" style="text-align:right"></div><div><label class="il" for="as18x">'+T('אתר (לא חובה)','Website (optional)')+'</label><input id="as18x" maxlength="200" dir="ltr" style="text-align:right"></div></div>'+
    '<button id="as18go" style="width:100%;margin-top:10px">📤 '+T('שליחה','Send')+'</button>');
  const drawSubs=()=>{const gv=$18('#as18g').value;const L=gv==='both'?CLOTH_SUBS18.women.concat(CLOTH_SUBS18.men.filter(m=>!CLOTH_SUBS18.women.some(x=>x[0]===m[0]))):CLOTH_SUBS18[gv];
    $18('#as18s').innerHTML=L.map(([k,ic,n])=>'<label><input type="checkbox" value="'+k+'"'+(k===cl18.sub?' checked':'')+'> '+ic+' '+esc(n)+'</label>').join('');};
  drawSubs();$18('#as18g').onchange=drawSubs;
  b.onclick=async e=>{if(!e.target.closest('#as18go'))return;const v=id=>($18(id).value||'').trim();
    const rec={name:v('#as18n'),gender:$18('#as18g').value,subs:[...b.querySelectorAll('#as18s input:checked')].map(i=>i.value),wedding:$18('#as18w').checked,city:v('#as18c'),address:v('#as18a'),phone:v('#as18p'),website:v('#as18x'),created_by:authUser.id,status:isStaff()?'approved':'pending'};
    if(!rec.name||!rec.city){flash(T('צריך שם חנות ועיר','Store name and city needed'));return;}
    if([rec.name,rec.city,rec.address].some(hasProfanity)){flash('🙏');return;}
    e.target.disabled=true;const {error}=await sb.from('clothing_shops').insert(rec);e.target.disabled=false;
    if(error){flash('⚠️ '+(/clothing_shops/.test(error.message)?T('הפיצ\'ר עוד לא הופעל בשרת 🙏','Not enabled yet 🙏'):error.message));return;}
    logAct('cloth_shop',rec.name+' · '+rec.city);closeSheet();flash('💚 '+(isStaff()?T('החנות נוספה','Added'):T('תודה! נשלח לאישור','Thanks! Sent for approval')));await loadCl18(true);renderStores();};
}
/* ---- חתונה: סימון, רשימת קניות, המלצות ---- */
function wedToggle18(item){state.wed18=state.wed18||{};const k=cl18.wed;state.wed18[k]=state.wed18[k]||{};if(state.wed18[k][item])delete state.wed18[k][item];else state.wed18[k][item]=1;save(true);renderStores();}
function wedMakeList18(){const k=cl18.wed;const done=(state.wed18&&state.wed18[k])||{};const items=wedList18(k).filter(i=>!done[i]);
  const name=k==='groom'?T('חתונה — חתן 🤵','Wedding — groom 🤵'):T('חתונה — כלה 👰','Wedding — bride 👰');
  let l=state.lists.find(x=>x.name===name);if(!l){l={id:uid(),name,items:[],created:Date.now()};state.lists.push(l);}
  state.active=l.id;const n=addMany(items.map(n=>({n,q:''})));save();render();logAct('wedding_list',name+' · '+items.length);
  flash('📝 '+T('נוצרה רשימה "'+name+'" ('+(n||items.length)+' מוצרים)','List "'+name+'" created'));setTab('list');}
/* ---- חיבור ללשונית החנויות ---- */
const _v18RenderStores=renderStores;
renderStores=function(){
  if(storesView==='clothing'){
    storesPane.innerHTML='<div class="seg" role="tablist">'+[['feed','📰 '+T('מבצעים ועדכונים','Deals & updates')],['dir','🏪 '+T('החנויות','Stores')],['branches','📍 '+T('סניפים ווייז','Branches & Waze')],['clothing','👗 '+T('ביגוד וחתונה','Clothing & wedding')]].map(([k,l])=>'<button role="tab" data-sview="'+k+'" class="'+(storesView===k?'on':'')+'">'+l+'</button>').join('')+'</div>'+cl18Html();
    if(cl18.shops===null&&sb&&authUser)loadCl18().then(()=>{if(storesView==='clothing')renderStores();});
    return;}
  const r=_v18RenderStores.apply(this,arguments);
  try{const sg=storesPane.querySelector('.seg');if(sg&&!sg.querySelector('[data-sview="clothing"]'))sg.insertAdjacentHTML('beforeend','<button role="tab" data-sview="clothing">👗 '+T('ביגוד וחתונה','Clothing & wedding')+'</button>');}catch(e){}
  return r;};
storesPane.addEventListener('click',e=>{if(storesView!=='clothing')return;const t=e.target;
  const gB=t.closest('[data-clg]');if(gB){cl18.g=gB.dataset.clg;cl18.sub='';renderStores();return;}
  const sB=t.closest('[data-clsub]');if(sB){cl18.sub=sB.dataset.clsub;renderStores();storesPane.scrollTop=0;return;}
  const wB=t.closest('[data-clwed]');if(wB){cl18.wed=wB.dataset.clwed;renderStores();return;}
  const ck=t.closest('[data-wedck]');if(ck){wedToggle18(ck.dataset.wedck);return;}
  if(t.closest('[data-wedlist]')){wedMakeList18();return;}
  const tip=t.closest('[data-wedtip]');if(tip){addItem(tip.dataset.wedtip,'');tip.disabled=true;tip.textContent='✓ '+tip.dataset.wedtip;return;}
  const nw=t.closest('[data-clnew]');if(nw){openRec18(nw.dataset.clnew,'');return;}
  const rc=t.closest('[data-clrec]');if(rc){openRec18('store',rc.dataset.clrec);return;}
  if(t.closest('[data-claddshop]')){openAddShop18();return;}
  const cv=t.closest('[data-cvote]');if(cv){const [tg,id,v]=cv.dataset.cvote.split('|');vote18(tg,id,+v);return;}
  if(t.closest('[data-clcat]')){reqCat18();return;}});
async function vote18(target,id,v){
  if(!sb||!authUser){flash(T('צריך להתחבר','Sign in first'));return;}
  const k=target+':'+id,o=(cl18.votes||{})[k]||{mine:0};let error=null;
  if(o.mine===v){({error}=await sb.from('cloth_votes').delete().eq('user_id',authUser.id).eq('target',target).eq('target_id',id));if(!error)flash(T('ההצבעה בוטלה','Vote removed'));}
  else{let reason='';
    if(v<0){reason=(await uiPrompt(T('מה לא נכון? (למשל: החנות נסגרה, הטלפון שגוי, עברו כתובת)\nהצוות יקבל את הדיווח ויתקן.','What is wrong? The team will fix it.'),''));if(reason===null)return;reason=reason.trim().slice(0,300);if(hasProfanity(reason)){flash('🙏');return;}}
    ({error}=await sb.from('cloth_votes').upsert({user_id:authUser.id,by_name:((state.user&&state.user.name)||'').slice(0,40),target,target_id:id,vote:v,reason,handled:false},{onConflict:'user_id,target,target_id'}));
    if(!error){flash(v>0?'✅ '+T('תודה! סימנת שהמידע נכון','Thanks!'):'📨 '+T('תודה! הדיווח נשלח לצוות האתר','Thanks! Reported to the team'));if(v<0)logAct('cloth_report',target+' · '+reason);}}
  if(error){flash('⚠️ '+(/cloth_votes/.test(error.message)?T('הפיצ\'ר עוד לא הופעל בשרת 🙏','Not enabled yet 🙏'):error.message));return;}
  await loadCl18(true);renderStores();}
async function reqCat18(){
  if(!sb||!authUser){flash(T('צריך להתחבר','Sign in first'));return;}
  const g=cl18.g==='men'?'men':'women';
  const n=(await uiPrompt(T('איזו קטגוריה חסרה ב'+(g==='men'?'גברים':'נשים')+'? (למשל: בגדי ספורט, חנויות כלה)\nהבקשה תגיע לצוות האתר.','Which category is missing?'),''));if(!n||!n.trim())return;
  const body=n.trim().slice(0,60);if(hasProfanity(body)){flash('🙏');return;}
  const {error}=await sb.from('store_recs').insert({section:g,sub:'',kind:'category',body,user_id:authUser.id,by_name:((state.user&&state.user.name)||'').slice(0,40),status:'pending'});
  if(error){flash('⚠️ '+(/store_recs/.test(error.message)?T('הפיצ\'ר עוד לא הופעל בשרת 🙏','Not enabled yet 🙏'):error.message));return;}
  logAct('cloth_cat',g+' · '+body);flash('📨 '+T('תודה! הבקשה לקטגוריה "'+body+'" נשלחה לצוות האתר','Thanks! Request sent'));}
storesPane.addEventListener('keydown',e=>{const ck=e.target.closest&&e.target.closest('[data-wedck]');if(ck&&(e.key===' '||e.key==='Enter')){e.preventDefault();wedToggle18(ck.dataset.wedck);}});
/* 👗 מתג בבק אופיס (👗 ביגוד והמלצות ← למעלה): כבוי = אף אחד לא רואה ביגוד וחתונה — לא הכפתור, לא קישורים ששותפו, ולא תשובות של יאמי.
   נשמר ב-site_config ← collector ← stores_off (אותו מקום כמו הכפתורים של לשונית החנויות), אז זה עובד גם באתר וגם באפליקציה בלי גרסה חדשה */
function clothOn18(){return !(srvCfg&&Array.isArray(srvCfg.stores_off)&&srvCfg.stores_off.includes('clothing'));}
function openClothing18(g){if(!clothOn18()){setTab('stores');return;}setTab('stores');storesView='clothing';if(g)cl18.g=g;cl18.sub='';renderStores();}
/* ---- 💰 איפה הכי זול — כפתור ראשון בלשונית החנויות, והמנהל בוחר אילו כפתורים מוצגים (site_config ← collector ← stores_off) ---- */
const STORE_SEGS=[['cmp','💰 '+T('איפה הכי זול','Cheapest')],['feed','📰 '+T('מבצעים ועדכונים','Deals & updates')],['dir','🏪 '+T('החנויות','Stores')],['branches','📍 '+T('סניפים ווייז','Branches & Waze')],['clothing','👗 '+T('ביגוד וחתונה','Clothing & wedding')]];
function storeSegsOn(){const off=srvCfg&&Array.isArray(srvCfg.stores_off)?srvCfg.stores_off:[];
  return STORE_SEGS.filter(([k])=>k==='cmp'?srvShown():!off.includes(k)).map(([k])=>k);}
let cmpFirst=true;
const _v19RenderStores=renderStores;
renderStores=function(){
  const on=storeSegsOn();
  if(cmpFirst&&on.includes('cmp')){storesView='cmp';cmpFirst=false;}
  if(on.length&&!on.includes(storesView))storesView=on[0];
  const seg='<div class="seg" role="tablist">'+STORE_SEGS.filter(([k])=>on.includes(k)).map(([k,l])=>'<button role="tab" data-sview="'+k+'" class="'+(storesView===k?'on':'')+'" aria-selected="'+(storesView===k)+'">'+l+'</button>').join('')+'</div>';
  if(storesView==='cmp'){
    const items=curList().items.filter(i=>!i.done);
    storesPane.innerHTML=seg+'<div class="rank"><h3>🔎 '+T('מחיר של מוצר בכל החנויות','One product in every store')+'</h3><div class="row18"><input id="cmpQ" maxlength="60" placeholder="'+T('למשל: חלב תנובה 3%','e.g. milk')+'" aria-label="'+T('איזה מוצר','Which product')+'"><button id="cmpGo">🔎 '+T('השוואה','Compare')+'</button></div></div>'+
      '<div id="cmpList">'+(items.length?'':'<p class="muted-note">🧺 '+T('כשיהיו מוצרים ברשימה, כאן תופיע השוואה של כל הרשימה בין החנויות.','Add items to your list to compare the whole list.')+'</p>')+'</div>';
    if(items.length)try{srvBasketMount(storesPane.querySelector('#cmpList'),items);const h=storesPane.querySelector('#cmpList #srvCmp h3');if(h)h.textContent='🧺 '+T('כל הרשימה ('+items.length+') — בכל הסניפים','Your whole list in every branch');}catch(e){}
    doodleBg(storesPane);return;}
  const r=_v19RenderStores.apply(this,arguments);
  try{const sg=storesPane.querySelector('.seg');if(sg)sg.outerHTML=seg;}catch(e){}
  return r;};
/* ---- 💰 לשונית אחת "מחירים וחנויות": שורת כפתורים אחת מעל שני החלקים (דיווחי המחירים + כל מה שהיה בחנויות) ---- */
STORE_SEGS.splice(1,0,['prices','📊 '+T('דיווחי מחירים','Price reports')]);
const _mgSegsOn=storeSegsOn;
storeSegsOn=function(){const on=_mgSegsOn();return on.includes('prices')?on:on.concat('prices');};
function mgSegHtml(cur){const on=storeSegsOn();
  return '<div class="seg">'+STORE_SEGS.filter(([k])=>on.includes(k)).map(([k,l])=>'<button data-sview="'+k+'" class="'+(cur===k?'on':'')+'" aria-pressed="'+(cur===k)+'">'+l+'</button>').join('')+'</div>';}
const _mgRenderStores=renderStores;
renderStores=function(){
  if(storesView==='prices'||!storeSegsOn().some(k=>k!=='prices')){storesView=(storeSegsOn().find(k=>k!=='prices')||'feed');setTab('prices');return;}
  return _mgRenderStores.apply(this,arguments);};
const _mgRenderPrices=renderPrices;
renderPrices=function(){const r=_mgRenderPrices.apply(this,arguments);
  try{const p=document.querySelector('#panePrices');const old=p.querySelector(':scope > .seg.mg');if(old)old.remove();
    p.insertAdjacentHTML('afterbegin',mgSegHtml('prices'));p.firstElementChild.classList.add('mg');}catch(e){}
  return r;};
document.querySelector('#panePrices').addEventListener('click',e=>{const sv=e.target.closest('.seg.mg [data-sview]');if(!sv||sv.dataset.sview==='prices')return;
  e.stopPropagation();storesView=sv.dataset.sview;if(storesView==='cmp')cmpFirst=false;setTab('stores');if(storesView==='feed'&&typeof markFeedSeen==='function')markFeedSeen();},true);
/* לחיצה על הלשונית: חוזרים לחלק שהיה פתוח בפעם האחרונה; בפעם הראשונה — "איפה הכי זול" כשהוא מוצג, אחרת דיווחי המחירים */
let mgLast=null;
const _mgSetTab=setTab;
setTab=function(t){if(t==='prices'||t==='stores')mgLast=t;return _mgSetTab.apply(this,arguments);};
document.querySelector('.tab[data-t=prices]').onclick=()=>setTab(mgLast||(srvShown()?'stores':'prices'));
storesPane.addEventListener('click',e=>{if(storesView!=='cmp'||!e.target.closest('#cmpGo'))return;const q=storesPane.querySelector('#cmpQ').value.trim();if(q)srvItemOpen(q);else storesPane.querySelector('#cmpQ').focus();});
storesPane.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='cmpQ'){e.preventDefault();const q=e.target.value.trim();if(q)srvItemOpen(q);}});
/* יאמי: "חנויות ביגוד", "חליפות לגברים", "רשימה לחתונה" */
async function v18BotPre(raw){if(!clothOn18())return false;const t=norm(raw);
  if(/(רשימ[הת]?\s+(קניות\s+)?ל?חתונה|קניות\s+לחתונה|מה\s+(צריך\s+)?לקנות\s+לחתונה|ציוד\s+לחתונה)/.test(t)||(/(שמלת\s+כלה|(^|\s)לחתן|(^|\s)לכלה)(\s|$|[?？!.])/.test(t)&&t.split(' ').length<=5&&!YAMI_ASK.test(t)&&!/(מתנה|מתנות|ברכה|שיר|נאום|דרשה)/.test(t))){const bride=/כלה/.test(t);cl18.wed=bride?'bride':'groom';openClothing18('wedding');botSay('💍 '+T('פתחתי את "קניות לחתונה" — רשימה מומלצת ל'+(bride?'כלה':'חתן')+' ואיפה כדאי לקנות. אפשר להפוך אותה לרשימת קניות בלחיצה.','Opened wedding shopping.'));return true;}
  if(/(חנויות?\s+(ביגוד|בגדים|נעליים)|^(ה)?ביגוד(\s+(ל)?(גברים|נשים))?[?？!.]*$|איפה\s+(לקנות|קונים)\s+(בגדים|חליפ|נעליים|שמל|כובע)|^(חליפות|חליפה|בגדים|נעליים)\s+(ל)?(גברים|נשים|לגבר|לאישה))/.test(t)){const men=/(גבר|חליפ|כובע|קפוט|ציצית|טלית)/.test(t);openClothing18(men?'men':'women');botSay('👗 '+T('פתחתי את חנויות הביגוד — '+(men?'גברים':'נשים')+', לפי קטגוריות ועם המלצות של לקוחות.','Opened clothing stores.'));return true;}
  return false;}
yamiStep(v18BotPre);
/* ---------- יאמי: "בטל" עוצר כל שאלה פתוחה, ובקשה חדשה לא נבלעת בשאלות של "מתכון חדש" ---------- */
const CANCEL19=/^(בטל|ביטול|בטלי|עזוב|עזבי|תעזבי|לא רוצה|לא משנה הכל|עצור|stop|cancel)[.!]*$/i;
const CMD19=/^(עזרה|פרשת השבוע|זמני שבת|דבר תורה|הסידורים שלי|מה ברשימה|מה יש לי בבית|מה חסר|סיימתי קני|מצב כהה|מצב בהיר|איפה הכי זול|מבצעים)/;
function openFlows19(){return !!(botAdd15||state.addRecipeFlow||state.dtFlow||state.pending||state.pendingRecipe||state.pendingNav||state.pendingCholent||(typeof pendingStockAsk!=='undefined'&&pendingStockAsk)||state.aiRecipeOffer);}
function clearFlows19(){botAdd15=null;state.addRecipeFlow=null;state.dtFlow=null;state.pending=null;state.pendingRecipe=null;state.pendingNav=null;state.pendingCholent=false;state.aiRecipeOffer=null;try{pendingStockAsk=null;}catch(e){}save();}
/* הצעה של יאמי ("להוסיף הכל לרשימה?") תקפה רק להודעה שאחריה — אם דיברו על משהו אחר, "כן" מאוחר לא יוסיף פתאום 20 מוצרים */
let offerSeen19={pending:null,pendingRecipe:null};
function expireOffers19(){['pending','pendingRecipe'].forEach(k=>{const v=state[k];if(v&&offerSeen19[k]===v){state[k]=null;offerSeen19[k]=null;save();}else offerSeen19[k]=v||null;});}
async function v19BotPre(raw){const t=norm(raw);
  expireOffers19();
  if(CANCEL19.test(t)&&openFlows19()){clearFlows19();botSay(T('בסדר, ביטלתי 🙂','OK, cancelled 🙂'));return true;}
  /* באמצע "מתכון חדש" / "לשתף דבר תורה" כתבו פקודה מוכרת או שאלה — עוזבים את השאלות ועונים לבקשה */
  if((state.addRecipeFlow||state.dtFlow)&&(CMD19.test(t)||/[?？]$/.test(raw.trim()))){const was=state.addRecipeFlow?T('הוספת המתכון','adding the recipe'):T('שיתוף דבר התורה','sharing the dvar Torah');
    state.addRecipeFlow=null;state.dtFlow=null;save();botSay('↩️ '+T('עזבתי את '+was+' — אפשר להתחיל שוב מתי שרוצים.','Stopped '+was+'.'));return false;}
  return false;}
yamiStep(v19BotPre);

/* ---------- גרסה ---------- */
CHANGELOG.unshift(['18','אוקטובר 2026',
  'מה היה: מבצעים הופיעו בלי לחשב כמה באמת חוסכים; לא היה מקום לחנויות ביגוד; הבק אופיס היה שורה ארוכה של כפתורים; ובשיתוף הופיע קוד שכבר לא בשימוש.',
  'מה חדש: 👗 ביגוד וחתונה (בלשונית 🏪 חנויות) — נשים / גברים לפי קטגוריות, המלצות לקוחות עם כוכבים, "⭐ האתר ממליץ", ✅ נכון / ❌ לא נכון על כל חנות והמלצה, ובקשה לקטגוריה חדשה · 💍 רשימת קניות מומלצת לחתן ולכלה ו"מה לעשות ולאן ללכת" · 🔥 חישוב מבצעים מדויק — מחיר רגיל, מחיר מבצע וכמה חוסכים, גם על כל הרשימה · ⚡ האתר נטען מהר יותר · 🔗 בלי הקוד בשיתוף.']);
CHANGELOG.unshift(['19','אוקטובר 2026',
  'מה היה: את הרשימה, הכמויות והקנייה בחנות סידרתם לבד, ולא היה איך לדעת כמה חסכתם.',
  'מה חדש:\nעיצוב חדש ונקי: רקע בגווני ים וחול, אייקונים אחידים ושורות מוצר דקות, כך שרואים יותר מוצרים במסך\nכמה חסכתי: האתר מראה כמה חסכתם בקניות\nהתראות מחיר: עדכון כשמחיר של מוצר יורד מתחת למחיר שבחרתם\nמוצרים קבועים: מה שקונים כל שבוע נכנס לרשימה בלחיצה\nרשימה לפי חנויות: כל מוצר מסודר לפי החנות שבה קונים אותו\nכמויות חכמות: האתר מציע כמות לפי מספר הנפשות בבית\nמצב קנייה: מסך נוח לקנייה בחנות, מסודר לפי מחלקות\nתזכורת יום לפני הקנייה\nסריקת קבלה משופרת: קריאה מדויקת יותר, ואפשר לתקן את הפרטים לפני השמירה\nצ\'אט עם צוות האתר: אפשר להגיב להודעה מסוימת, לערוך הודעה ששלחתם ולסמן תגובה מהירה\nהתקנה בלחיצה אחת: כפתור ההתקנה מוסיף את האתר למסך הבית כמו אפליקציה\n"שתפו אותי": משתפים את האתר עם חברים בקישור אישי']);
CHANGELOG.unshift(['20','נובמבר 2026',
  'מה היה: קבלה אפשר היה להעלות רק כתמונה, בחנויות לא ראיתם את המבצעים של כל סניף, האתר היה בעברית בלבד, והגדרות שבחרתם נשארו רק במכשיר אחד.',
  'מה חדש:\nעיצוב 2.0: מסך כניסה חדש, "הבית שלי", ההגדרות, התזכורות והסידורים נקיים וברורים יותר\nתמונת העסק מופיעה בדף החנות ובכרטיסי החנויות\nחנויות קרובות מציגות את המבצעים האמיתיים בכל סניף\nהשוואת חנויות עם תמונת מוצר, ובחירת המוצר המדויק לפני ההשוואה\nקבלה אפשר להעלות גם כקובץ PDF\nברשימה: בחירה של כמה מוצרים יחד, והעברה או העתקה לרשימה אחרת\nהבית שלי פשוט יותר: יש בבית, נגמר וכל המוצרים, ואפשר למחוק מוצר\nמצלמים מוצר שאין לו תמונה ומקבלים נקודות מוניטין\nהאתר נפתח מהר יותר וממשיך לעבוד גם בלי אינטרנט\nההגדרות והפרופיל נשמרים בחשבון ועוברים בין האתר לאפליקציה\nאפשר לעבור לאנגלית: כפתור שפה בכניסה ובהגדרות\nבחירת אימוג\'י בצ\'אט עם שירות הלקוחות']);

/* ================= גרסה 18.2: 📤 שיתוף לכל הפלטפורמות — מוצר, דיווח מחיר, מבצע, קטגוריה, חנות, המלצה ורשימת חתונה ================= */
/* כל שיתוף כולל קישור שפותח בדיוק את מה ששותף באתר */
const SHARE_BASE18='https://www.yamshopping.com/';
const SHARE_NETS18=[
  ['wa','WhatsApp','#25D366','💬',(t,u)=>'https://wa.me/?text='+encodeURIComponent(t+'\n'+u)],
  ['gm','Gmail','#EA4335','✉️',(t,u,ti)=>'https://mail.google.com/mail/?view=cm&fs=1&su='+encodeURIComponent(ti)+'&body='+encodeURIComponent(t+'\n\n'+u)],
  ['em',T('מייל','Email'),'#6b7280','📧',(t,u,ti)=>'mailto:?subject='+encodeURIComponent(ti)+'&body='+encodeURIComponent(t+'\n\n'+u)],
  ['sms','SMS','#34C759','📱',(t,u)=>'sms:?&body='+encodeURIComponent(t+'\n'+u)]];
/* בועת שיתוף קטנה שנפתחת ליד כפתור ה-📤 שנלחץ */
let shAnchor18=null;
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('[data-share],[data-sh18],[data-shpost],[data-shcat],[data-shprod]');if(a)shAnchor18=a;},true);
function closeShare18(){const o=document.getElementById('shpop18');if(o)o.remove();document.removeEventListener('keydown',shKey18);}
function shKey18(e){if(e.key==='Escape')closeShare18();}
function openShare18(o){
  closeShare18();
  let url=SHARE_BASE18+(o.hash||'');const title=o.title||T('רשימת קניות','Shopping list'),text=String(o.text||'').trim()+'\n— '+T('ים שופינג · רשימת קניות','YamShopping');
  const nets=SHARE_NETS18.map(([k,n,c,ic])=>'<button class="shb18" data-net="'+k+'" title="'+esc(n)+'" aria-label="'+esc(n)+'"><span class="ic" style="background:'+c+'">'+ic+'</span><small>'+esc(n)+'</small></button>').join('')+
    '<button class="shb18" data-net="copy" aria-label="'+T('העתקת קישור','Copy link')+'"><span class="ic" style="background:#0f766e">🔗</span><small>'+T('העתקה','Copy')+'</small></button>'+
    (navigator.share?'<button class="shb18" data-net="more" aria-label="'+T('עוד אפליקציות','More apps')+'"><span class="ic" style="background:#8b5cf6">⋯</span><small>'+T('עוד','More')+'</small></button>':'');
  const pop=document.createElement('div');pop.id='shpop18';pop.className='shpop18';pop.setAttribute('role','dialog');pop.setAttribute('aria-label',T('שיתוף','Share'));
  pop.innerHTML='<div class="shh18"><b>📤 '+T('שיתוף','Share')+(o.what?' · '+esc(o.what):'')+'</b><button class="shx18" aria-label="'+T('סגירה','Close')+'">✕</button></div><div class="shr18">'+nets+'</div>';
  document.body.appendChild(pop);
  /* מיקום: מתחת לכפתור (או מעליו כשאין מקום), בתוך המסך */
  const an=shAnchor18&&document.body.contains(shAnchor18)?shAnchor18:null;const W=pop.offsetWidth,H=pop.offsetHeight,vw=innerWidth,vh=innerHeight;
  if(an){const r=an.getBoundingClientRect();let top=r.bottom+8,up=false;if(top+H>vh-8){top=r.top-H-8;up=true;}if(top<8)top=Math.max(8,(vh-H)/2);
    let left=r.left+r.width/2-W/2;left=Math.max(8,Math.min(left,vw-W-8));pop.style.top=top+'px';pop.style.left=left+'px';
    pop.classList.add(up?'up':'down');pop.style.setProperty('--ax',Math.max(14,Math.min(W-14,r.left+r.width/2-left))+'px');}
  else{pop.style.top=Math.max(8,(vh-H)/2)+'px';pop.style.left=Math.max(8,(vw-W)/2)+'px';}
  shAnchor18=null;
  setTimeout(()=>{const out=e=>{if(!pop.contains(e.target)){closeShare18();document.removeEventListener('pointerdown',out,true);}};document.addEventListener('pointerdown',out,true);},0);
  document.addEventListener('keydown',shKey18);
  const first=pop.querySelector('[data-net]');if(first)first.focus({preventScroll:true});
  pop.onclick=async e=>{if(e.target.closest('.shx18')){closeShare18();return;}const t=e.target.closest('[data-net]');if(!t)return;const k=t.dataset.net;
    /* קישור אישי: בוואטסאפ ובהעתקה שואלים קודם לאן (קבוצה / סטטוס...), ואז נוצר קישור שנספר בבק אופיס */
    if(o.track&&typeof shareWhere44==='function'&&(k==='wa'||k==='copy')&&!t.dataset.place){shareWhere44(pop,k);return;}
    if(o.track&&typeof shareTrack44==='function'){const nm=((pop.querySelector('#shPlace44')||{}).value||'').trim().slice(0,60);url=shareTrack44(k,t.dataset.place?t.dataset.place+(nm?': '+nm:''):'')||url;}
    logAct('share',k+' · '+(o.what||'')+' · '+String(o.text||'').split('\n')[0].slice(0,80));
    if(k==='copy'){try{await navigator.clipboard.writeText(text+'\n'+url);flash('🔗 '+T('הועתק — אפשר להדביק בכל מקום','Copied'));}catch(err){(await uiPrompt(T('העתיקו מכאן:','Copy:'),text+'\n'+url));}closeShare18();return;}
    if(k==='more'){closeShare18();try{await navigator.share({title,text,url});}catch(err){}return;}
    const n=SHARE_NETS18.find(x=>x[0]===k);if(!n)return;const href=n[4](text,url,title);closeShare18();
    if(/^(mailto|sms):/.test(href))location.href=href;else{const w=window.open(href,'_blank','noopener');if(!w)location.href=href;}};}
/* גלילה או שינוי גודל סוגרים את הבועה — חוץ מכשמקלידים בה (המקלדת בטלפון משנה את גודל המסך) */
const shAuto18=()=>{const p=document.getElementById('shpop18'),a=document.activeElement;if(p&&a&&a.tagName==='INPUT'&&p.contains(a))return;closeShare18();};addEventListener('scroll',shAuto18,true);addEventListener('resize',shAuto18);
/* דיווח מחיר (מהחיפוש ומהדיווחים האחרונים) */
sharePriceReport=function(name,chain,branch,price){openShare18({what:T('דיווח מחיר','Price report'),title:name+' — '+price,
  text:'💰 '+name+' — '+price+' '+T('ב','at ')+chain+(branch?' ('+branch+')':'')+'\n'+T('ראיתי ב"רשימת קניות" — השוואת מחירים בין הרשתות 👇','Seen on YamShopping 👇'),hash:'#p='+encodeURIComponent(name)});};
document.addEventListener('click',e=>{
  const sp=e.target.closest('[data-shpost]');if(sp){e.stopPropagation();const x=(storePosts||[]).find(p=>p.id===sp.dataset.shpost);if(x)openShare18({what:T('מבצע','Deal'),title:x.chain+' — '+x.title,text:'🏷️ '+x.chain+': '+x.title+(x.body?'\n'+String(x.body).slice(0,200):'')+(x.ends_at?'\n'+T('בתוקף עד ','Until ')+fmtDate(new Date(x.ends_at)):''),hash:'#store-'+encodeURIComponent(x.chain)});return;}
  const sc=e.target.closest('[data-shcat]');if(sc){e.stopPropagation();const sec=sc.closest('.catsec');const lines=sec?[...sec.querySelectorAll('.grp > h3')].slice(0,10).map(h=>'• '+h.textContent.replace(/^🏷️\s*/,'')):[];
    openShare18({what:T('קטגוריה','Category'),title:sc.dataset.shcat,text:(CATE[sc.dataset.shcat]||'🛒')+' '+sc.dataset.shcat+' — '+T('המחירים הכי זולים:','cheapest prices:')+'\n'+lines.join('\n'),hash:'#prices'});return;}
  const s8=e.target.closest('[data-sh18]');if(s8){e.stopPropagation();share18(s8.dataset.sh18);return;}
},true);
function share18(key){const [kind,id]=key.split('|');
  if(kind==='shop'){const x=(cl18.shops||[]).find(s=>s.id===id);if(!x)return;const st=shopStars18(x.name);
    openShare18({what:T('חנות','Store'),title:x.name,text:'👗 '+x.name+(st?' — '+'⭐'.repeat(Math.round(st.avg))+' ('+st.n+' '+T('המלצות','reviews')+')':'')+'\n'+[x.city,x.address].filter(Boolean).join(' · ')+(x.phone?'\n📞 '+x.phone:'')+(x.about?'\n'+x.about.slice(0,200):''),hash:'#cshop='+x.id});}
  if(kind==='rec'){const r=(cl18.recs||[]).find(x=>x.id===id);if(!r)return;
    openShare18({what:T('המלצה','Recommendation'),title:r.shop||r.body,text:(r.stars?'⭐'.repeat(r.stars)+' ':'')+(r.shop||'')+(r.city?' · '+r.city:'')+'\n„'+String(r.body).slice(0,300)+'"',hash:'#cloth='+r.section+(r.sub&&r.section!=='wedding'?'/'+r.sub:r.section==='wedding'?'/'+r.sub:'')});}
  if(kind==='cat'){const [g,sub]=id.split('/');const shops=shopsFor18(g,sub).slice(0,6);
    openShare18({what:T('קטגוריה','Category'),title:subLabel18(g,sub),text:subLabel18(g,sub)+' — '+(g==='men'?T('גברים','Men'):T('נשים','Women'))+'\n'+(shops.length?T('חנויות מומלצות:','Recommended stores:')+'\n'+shops.map(s=>'• '+s.name+(s.city?' ('+s.city+')':'')).join('\n'):T('חנויות והמלצות של לקוחות','Stores & customer recommendations')),hash:'#cloth='+g+'/'+sub});}
  if(kind==='wed'){const items=wedList18(id);
    openShare18({what:T('רשימה לחתונה','Wedding list'),title:id==='groom'?T('רשימת קניות לחתן','Groom list'):T('רשימת קניות לכלה','Bride list'),text:(id==='groom'?'🤵 '+T('רשימת קניות לחתן','Groom shopping list'):'👰 '+T('רשימת קניות לכלה','Bride shopping list'))+':\n'+items.map(i=>'☐ '+i).join('\n'),hash:'#cloth=wedding/'+id});}
}
/* מוצר מסריקת ברקוד */
const _v182Lookup=lookupBarcode;
lookupBarcode=async function(code){const r=await _v182Lookup.apply(this,arguments);try{const name=await nameForBarcode(code);const b=$18('#v8SheetBody');
  if(name&&b&&!b.querySelector('[data-shprod]')){b.insertAdjacentHTML('beforeend','<button class="clshare18" data-shprod="1">📤 '+T('לשתף את המוצר','Share this product')+'</button>');
    b.querySelector('[data-shprod]').onclick=()=>openShare18({what:T('מוצר','Product'),title:name,text:'🛒 '+name+'\n'+T('ברקוד ','Barcode ')+code+'\n'+T('איפה הכי זול? בודקים ב"רשימת קניות" 👇','Where is it cheapest? 👇'),hash:'#p='+encodeURIComponent(name)});}}catch(e){}return r;};
/* ---------- 🌍 Open Food Facts: שם, תמונה ואלרגנים לפי ברקוד (מאגר פתוח, ODbL — חובה לציין את המקור) ---------- */
const OFF_CACHE={};
const OFF_ALLERGENS={gluten:'גלוטן',milk:'חלב',eggs:'ביצים',nuts:'אגוזים',peanuts:'בוטנים',soybeans:'סויה','sesame-seeds':'שומשום',fish:'דגים',crustaceans:'סרטנים',molluscs:'רכיכות',celery:'סלרי',mustard:'חרדל',lupin:'תורמוס','sulphur-dioxide-and-sulphites':'סולפיטים'};
function offProduct(code){code=String(code||'').replace(/\D/g,'');if(code.length<8||code.length>14)return Promise.resolve(null);
  if(code in OFF_CACHE)return OFF_CACHE[code];
  const ac=typeof AbortController!=='undefined'?new AbortController():null;const tm=setTimeout(()=>ac&&ac.abort(),6000);
  return OFF_CACHE[code]=fetch('https://world.openfoodfacts.org/api/v2/product/'+code+'.json?fields=product_name,product_name_he,brands,image_front_small_url,allergens_tags,quantity',ac?{signal:ac.signal}:{})
    .then(r=>r.ok?r.json():null).then(d=>{if(!d||d.status!==1||!d.product)return null;const p=d.product;
      const name=String(p.product_name_he||p.product_name||'').replace(/\s+/g,' ').trim().slice(0,60);if(!name)return null;
      const img=/^https:\/\/images\.openfoodfacts\.org\//.test(p.image_front_small_url||'')?p.image_front_small_url:'';
      const allergens=Array.from(new Set((p.allergens_tags||[]).map(t=>{const k=String(t).replace(/^[a-z]{2}:/,'');return OFF_ALLERGENS[k]||k;}).filter(Boolean))).slice(0,10);
      return {name,brand:String(p.brands||'').split(',')[0].trim().slice(0,40),qty:String(p.quantity||'').slice(0,20),img,allergens,code};})
    .catch(()=>null).finally(()=>clearTimeout(tm));}
function offCard(o){return '<div class="offcard">'+(o.img?'<img src="'+esc(o.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'')+'<div><b>'+esc(o.name)+'</b>'+
  ((o.brand||o.qty)?'<small>'+esc([o.brand,o.qty].filter(Boolean).join(' · '))+'</small>':'')+
  (o.allergens.length?'<small class="offal">⚠️ '+T('אלרגנים: ','Allergens: ')+esc(o.allergens.join(', '))+'</small>':'')+
  '<small class="muted-note" style="margin:2px 0 0">'+T('מקור: ','Source: ')+'<a href="https://world.openfoodfacts.org/product/'+esc(o.code)+'" target="_blank" rel="noopener">Open Food Facts</a></small></div></div>';}
/* ברקוד שלא מכירים — לוקחים את השם מ-Open Food Facts (גם בסריקה רציפה לרשימה) */
const _offName=nameForBarcode;
nameForBarcode=async function(code){const n=await _offName.apply(this,arguments);if(n)return n;const o=await offProduct(code);return o?o.name+(o.brand&&!o.name.includes(o.brand)?' '+o.brand:''):'';};
/* בחלון הברקוד: תמונה, אלרגנים ומקור; ואם לא הכרנו את המוצר — ממלאים את השם */
const _offLookup=lookupBarcode;
lookupBarcode=async function(code){const r=await _offLookup.apply(this,arguments);try{const o=await offProduct(code);const b=$18('#v8SheetBody');
  if(o&&b&&!b.querySelector('.offcard')&&$18('#v8Sheet.open')){const inp=b.querySelector('input#bcName:not([type=hidden])');
    if(inp&&!inp.value)inp.value=o.name+(o.brand&&!o.name.includes(o.brand)?' '+o.brand:'');
    const note=inp&&b.querySelector('p.muted-note');if(note)note.textContent=T('לא היה אצלנו — מצאנו במאגר הפתוח Open Food Facts 👇 אפשר לתקן את השם לפני שמוסיפים.','Found in the open Open Food Facts database 👇');
    const at=b.querySelector('.row2');at?at.insertAdjacentHTML('beforebegin',offCard(o)):b.insertAdjacentHTML('beforeend',offCard(o));}}catch(e){}return r;};
/* ---------- 📤 "שתפו אותי" — כפתור קבוע בראש המסך לשיתוף האתר (וואטסאפ, טלגרם, העתקה...) ---------- */
(function(){const bell=document.getElementById('btnBell');if(!bell||document.getElementById('btnShareSite'))return;
  bell.insertAdjacentHTML('beforebegin','<button class="hbtn sharesite" id="btnShareSite" type="button" title="'+T('שתפו את האתר עם חברים ומשפחה','Share the site')+'" aria-label="'+T('שתפו את האתר עם חברים ומשפחה','Share the site with friends and family')+'">'+
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>'+
    '<small>'+T('שתפו אותי','Share me')+'</small></button>');
  document.getElementById('btnShareSite').onclick=e=>{shAnchor18=e.currentTarget;openShare18({what:T('האתר','the site'),title:T('רשימת קניות','Shopping list'),
    text:T('🛒 "רשימת קניות" — אתר חינמי לכל הבית: רשימה משותפת עם המשפחה, השוואת מחירים בין הרשתות, מה יש בבית וזמני שבת. ממליץ/ה בחום! 👇','🛒 A free site for the whole home: a shared list, price comparison and more 👇'),hash:''});};})();
/* ---------- קישורים ששותפו: פותחים בדיוק את מה ששותף ---------- */
const _v182Route=routeHash;
routeHash=function(){const h=decodeURIComponent(location.hash||'');let m;
  const done=()=>history.replaceState(null,'',location.pathname);
  if((m=h.match(/^#p=(.+)$/))){if(!sb||!authUser)return;done();const q=m[1].slice(0,60);setTab('prices');setTimeout(async()=>{priceQuery=q;const si=$18('#priceSearchInput');if(si)si.value=q;priceRows=await fetchPrices(q);renderPriceResults();},300);return;}
  if(h==='#prices'){done();setTab('prices');return;}
  if((m=h.match(/^#cloth=(women|men|wedding)(?:\/([\w-]+))?$/))){done();if(m[1]==='wedding'){cl18.wed=m[2]==='bride'?'bride':'groom';openClothing18('wedding');}else{openClothing18(m[1]);cl18.sub=m[2]||'';renderStores();}return;}
  if((m=h.match(/^#cshop=([0-9a-f-]{36})$/))){if(!sb||!authUser)return;done();if(!clothOn18()){setTab('stores');return;}openClothing18('women');loadCl18().then(()=>{const x=(cl18.shops||[]).find(s=>s.id===m[1]);if(!x)return;cl18.g=x.gender==='men'?'men':'women';cl18.sub=(x.subs||[])[0]||'';renderStores();
    setTimeout(()=>{const el=[...storesPane.querySelectorAll('.shop18')].find(c=>c.querySelector('[data-sh18="shop|'+x.id+'"]'));if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('hl18');}},200);});return;}
  return _v182Route.apply(this,arguments);};
if(/^#(p=|prices|cloth=|cshop=)/.test(location.hash))setTimeout(routeHash,2600);
try{render();}catch(e){}
