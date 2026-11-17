
(function(){
const $66=s=>document.querySelector(s);
const ls66=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)||'';if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){return '';}};
const inApp=/YamShoppingApp\//.test(navigator.userAgent||'');
/* מה האפליקציה בטלפון יודעת לעשות (מגרסה 1.3): עדכון מתוך האפליקציה והתראות בטלפון */
const nat=()=>{try{return window.YamApp&&typeof YamApp.appInfo==='function'?JSON.parse(YamApp.appInfo()||'{}'):null;}catch(e){return null;}};

/* ---------- 📐 גודל תצוגה ---------- */
function applyView66(){const v=prefs.view66||'auto';size66(v);const r=document.documentElement;
  r.classList.toggle('norail66',!!prefs.noRail66);r.classList.toggle('rail66',prefs.noRail66===false);r.classList.toggle('nosugg66',!!prefs.noSugg66);r.classList.toggle('norec66',RECIPES_OFF||!!prefs.noRec66);}
window.applyView66=applyView66;
applyView66();
const devName=()=>{const n=nat();const r=document.documentElement;const kind=r.classList.contains('dev66-tab')?T('טאבלט','Tablet'):r.classList.contains('dev66-pc')?T('מחשב','Computer'):T('טלפון','Phone');
  return kind+(n&&n.model?' · '+n.model:'')+' · '+T('מסך ','screen ')+Math.round(innerWidth)+'×'+Math.round(innerHeight);};
function openView66(){
  const v=prefs.view66||'auto',auto=size66('auto');size66(v);
  const autoTxt=auto==='xs'?T('קטן מאוד','extra small'):auto==='s'?T('קטן','small'):T('רגיל','normal');
  const opts=[['auto','📱 '+T('אוטומטי','Automatic'),T('לפי המסך שלך — עכשיו: ','Fits your screen — now: ')+autoTxt],['normal','🔤 '+T('רגיל','Normal'),T('הגודל הרגיל','Default size')],
    ['small','🔍 '+T('מסך קטן','Small screen'),T('הכל קטן יותר — נכנס יותר במסך','Everything smaller')],['xsmall','🔎 '+T('קטן מאוד','Extra small'),T('למסכים קטנים במיוחד','For very small screens')]];
  const chk=(id,on,txt)=>'<label class="radio"><input type="checkbox" data-v66="'+id+'"'+(on?' checked':'')+'> '+txt+'</label>';
  const a=prefs.a11y||{};
  const b=openSheet('📐 '+T('גודל תצוגה ונוחות','Display size & comfort'),'<div class="v66"><p class="dev66">'+esc(devName())+'</p>'+
    '<div class="opt66">'+opts.map(([k,l,d])=>'<button type="button" data-sz66="'+k+'" class="'+(k===v?'on':'')+'">'+l+'<small>'+esc(d)+'</small></button>').join('')+'</div>'+
    (a.size?'<p class="muted-note">♿ '+T('בנגישות בחרת טקסט גדול — הוא קובע את הגודל. אפשר לשנות ב"נגישות".','Accessibility text size is on and takes priority.')+'</p>':'')+
    '<h4>🧹 '+T('מה להציג במסך','What to show')+'</h4>'+
    chk('tick',!prefs.noTick66,T('ההסבר "מסמנים ✓ ליד מה שקנית"','The "tick ✓ what you bought" tip'))+
    chk('sugg',!prefs.noSugg66,T('הצעות לקנייה (מה כנראה נגמר, קנייה קודמת, הצעות של יאמי)','Shopping suggestions'))+
    chk('favs',!state.hideFavs,T('שורת המוצרים הקבועים ⭐','Favourites row ⭐'))+
    chk('rail',prefs.noRail66===false,T('הכפתורים בצד (מלאי, לבית, קבלה)','Side buttons (stock, add, receipt)'))+
    (RECIPES_OFF?'':chk('rec',!prefs.noRec66,T('מתכונים (ספר המתכונים, הוספת מתכון, והצעות מתכונים של יאמי)','Recipes (recipe book, add a recipe, Yami recipe offers)')))+
    '<p class="muted-note">'+T('נשמר במכשיר הזה.','Saved on this device.')+'</p></div>');
  b.onclick=e=>{const s=e.target.closest('[data-sz66]');if(!s)return;prefs.view66=s.dataset.sz66;savePrefs();applyView66();openView66();
    flash('📐 '+T('גודל התצוגה עודכן','Display size updated'));};
  b.onchange=e=>{const k=e.target.dataset.v66,on=e.target.checked;if(!k)return;
    if(k==='tick')prefs.noTick66=!on;
    if(k==='sugg'){prefs.noSugg66=!on;state.hideBotTips=!on;save(true);try{applyBotTips();}catch(x){}}
    if(k==='favs'){state.hideFavs=!on;if(on)state.favHidden=[];save(true);}
    if(k==='rail')prefs.noRail66=!on;
    if(k==='rec'){prefs.noRec66=!on;try{renderBotChips();}catch(x){}}
    savePrefs();applyView66();try{render();}catch(x){}};
}
window.openView66=openView66;
/* בתפריט ⚙️ ← תצוגה והגדרות */
(function(){const m=$66('#hMenu');if(!m||$66('#miView66'))return;const btn=document.createElement('button');btn.id='miView66';
  btn.innerHTML='📐<span>'+T('גודל תצוגה ומה להציג','Display size & what to show')+'</span>';btn.onclick=()=>{m.classList.remove('open');openView66();};
  const g=m.querySelector('details.mgrp[data-g="view"] .mgbody');if(g)g.insertBefore(btn,g.firstChild);else m.appendChild(btn);})();
/* ✕ ליד "מסמנים ✓ ליד מה שקנית" */
document.addEventListener('click',e=>{const x=e.target.closest('[data-tickx66]');if(!x)return;e.stopPropagation();prefs.noTick66=true;savePrefs();try{renderList();}catch(er){}
  flash('👍 '+T('ההסבר הוסתר — אפשר להחזיר ב⚙️ ← גודל תצוגה ומה להציג','Tip hidden — bring it back in ⚙️ → Display'));},true);
/* הסתרת ההצעות: בפעמון, ביאמי, וברשימה ריקה */
if(typeof notifySugg==='function'){const _ns=notifySugg;notifySugg=function(){if(prefs.noSugg66)return;return _ns.apply(this,arguments);};}
if(typeof v7Offers==='function'){const _o7=v7Offers;v7Offers=function(){if(prefs.noSugg66)return;return _o7.apply(this,arguments);};}
if(typeof v8Offers==='function'){const _o8=v8Offers;v8Offers=function(){if(prefs.noSugg66)return;return _o8.apply(this,arguments);};}
/* 🍲 מתכונים מוסתרים: לא פותחים את ספר המתכונים (גם לא מקישור או מפרסומת), יאמי לא מציעה מתכונים מיוזמתה, ואין כפתורי מתכונים בצ'אט */
if(typeof openRecipes==='function'){const _or=openRecipes;openRecipes=function(){if(RECIPES_OFF)return;if(prefs.noRec66){flash('🍲 '+T('המתכונים מוסתרים — אפשר להחזיר ב⚙️ ← גודל תצוגה ומה להציג','Recipes are hidden — turn them back on in ⚙️ → Display'));return;}return _or.apply(this,arguments);};}
if(typeof offerCholent==='function'){const _oc=offerCholent;offerCholent=function(){if(RECIPES_OFF||prefs.noRec66)return;return _oc.apply(this,arguments);};}
if(typeof v8Offers==='function'&&typeof markOffered==='function'){const _o8r=v8Offers;v8Offers=function(){if(RECIPES_OFF||prefs.noRec66)try{markOffered('shabbatrec');}catch(e){}return _o8r.apply(this,arguments);};}
if(typeof botChips==='function'){const _bc=botChips;botChips=function(){const b=_bc.apply(this,arguments);return RECIPES_OFF||prefs.noRec66?b.filter(c=>!/מתכון|להכין|חמין/.test(c)):b;};}

/* ---------- ✨ גרסה חדשה של האתר: האפליקציה (והאתר) מתעדכנים לבד ----------
   בודקים מול השרת אם הדף השתנה (ETag). כשחוזרים לאפליקציה ויש גרסה חדשה — טוענים אותה מחדש, רק כשלא באמצע הקלדה או חלון פתוח.
   אחרת מופיע כפתור קטן "לעדכן עכשיו". הרשימות שמורות בטלפון ובשרת, כך ששום דבר לא הולך לאיבוד. */
const UPD={base:'',hiddenAt:0,shown:false,busy:false};
/* אותה גרסה של הדף מקבלת ETag קצת אחר לפי הדחיסה ("...-zstd" / "...-gzip" / בלי), ולפעמים W/ מלפנים — למשל כשסינון או רשת מבקשים דחיסה אחרת.
   בלי הניקוי הזה הופיע "✨ יש גרסה חדשה" גם כשלא עלה שום עדכון */
function verKey66(s){return String(s||'').replace(/^W\//,'').replace(/-(zstd|gzip|br|deflate)"$/,'"');}
async function sig(){try{const r=await fetch('/',{method:'HEAD',cache:'no-store',credentials:'same-origin'});if(!r.ok)return '';
  return verKey66(r.headers.get('etag')||r.headers.get('last-modified')||'');}catch(e){return '';}}
function busy66(){const a=document.activeElement;if(a&&(a.tagName==='TEXTAREA'||(a.tagName==='INPUT'&&!/^(checkbox|radio|button)$/.test(a.type)))&&a.value)return true;
  if(document.querySelector('.overlay.open,.qp15.open,#updPop:not([hidden]),.ybpop:not([hidden])'))return true;
  const t=$66('#botText');return !!(t&&t.value.trim());}
function reload66(){ls66('yam_upd66',String(Date.now()));try{navigator.serviceWorker&&navigator.serviceWorker.getRegistration().then(r=>r&&r.update()).catch(()=>{});}catch(e){}
  setTimeout(()=>location.reload(),150);}
function pill66(){if(UPD.shown||$66('#upd66'))return;UPD.shown=true;const d=document.createElement('div');d.id='upd66';d.setAttribute('role','status');
  d.innerHTML='<span>✨ '+T('יש גרסה חדשה','A new version is ready')+'</span><button type="button" class="go">'+T('לעדכן עכשיו','Update now')+'</button><button type="button" class="x" aria-label="'+T('אחר כך','Later')+'">✕</button>';
  document.body.appendChild(d);requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add('show')));
  d.querySelector('.go').onclick=reload66;d.querySelector('.x').onclick=()=>{d.classList.remove('show');setTimeout(()=>d.remove(),400);};}
async function check66(resumed){if(UPD.busy||!navigator.onLine)return;UPD.busy=true;
  try{const s=await sig();if(!s)return;if(!UPD.base){UPD.base=s;return;}if(s===UPD.base)return;
    if(resumed&&!busy66())reload66();else pill66();}finally{UPD.busy=false;}}
window.check66=check66;
/* הדף נפתח מהעותק השמור (מהיר), ובשרת כבר יש גרסה חדשה יותר — היא נשמרה לפתיחה הבאה.
   מציגים "✨ יש גרסה חדשה", ו-UPD.base מקבל את הגרסה שפתוחה עכשיו — כך שכשחוזרים לאפליקציה היא מתעדכנת לבד (check66) */
window.onNewVer66=function(d){if(d&&d.served)UPD.base=verKey66(d.served);if(d&&d.latest&&verKey66(d.latest)===UPD.base)return;pill66();};
if(window.__yamNewVer)window.onNewVer66(window.__yamNewVer);
if(location.protocol==='https:'||/^(localhost|127\.)/.test(location.hostname)){
  setTimeout(()=>check66(false),4000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){UPD.hiddenAt=Date.now();return;}
    if(UPD.hiddenAt&&Date.now()-UPD.hiddenAt>20000)check66(true);else check66(false);});
  setInterval(()=>{if(!document.hidden)check66(false);},20*60000);
  addEventListener('online',()=>check66(false));}
/* אחרי עדכון: הודעה קטנה */
{const t=+ls66('yam_upd66');if(t){ls66('yam_upd66',null);if(Date.now()-t<60000)setTimeout(()=>flash('✨ '+T('האפליקציה עודכנה לגרסה החדשה','Updated to the latest version')),1200);}}

/* ---------- 🆕 "מה חדש באתר" גם למי שלא נכנס לחשבון (למשל רק הוריד את האפליקציה) ---------- */
async function guestNews66(force){if(!sb)return;const prof=authUser&&!authUser.is_anonymous;if(prof&&!force)return;
  let seen=ls66('yam_news66');if(!seen&&!force){ls66('yam_news66',new Date().toISOString());return;}
  try{const {data,error}=await sb.rpc('updates_public');if(error||!Array.isArray(data)||!data.length)return;
    const list=force?data.slice(0,5):data.filter(u=>u.created_at>seen).slice(0,5);if(!list.length){if(force)flash(T('אין עדכונים חדשים 🙂','Nothing new 🙂'));return;}
    if($66('#updPop')&&!$66('#updPop').hidden)return;showUpdates(list);ls66('yam_news66',data[0].created_at);}catch(e){}}
window.guestNews66=guestNews66;
setTimeout(()=>{if(!authUser||authUser.is_anonymous)guestNews66(false);},6000);
{const ok=$66('#updOk'),old=ok&&ok.onclick;if(ok)ok.onclick=async function(){ls66('yam_news66',new Date().toISOString());if(authUser&&!authUser.is_anonymous)return old&&old.apply(this,arguments);$66('#updPop').hidden=true;flash('✔ '+T('תודה! 🙂','Thanks! 🙂'));};}
/* קישור מהתראה בטלפון: ?whatsnew=1 */
if(/[?&]whatsnew=1/.test(location.search)){try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
  setTimeout(async()=>{if(authUser&&!authUser.is_anonymous&&typeof checkUpdates==='function'&&await checkUpdates())return;guestNews66(true);},2500);}

/* ---------- 🔄 עדכון האפליקציה לאנדרואיד מתוך האפליקציה (מגרסה 1.3) ---------- */
const ST={start:T('מתחילים…','Starting…'),download:T('מורידים את הגרסה החדשה','Downloading the new version'),verify:T('בודקים את הקובץ…','Checking the file…'),
  install:T('מתקינים… עוד רגע אנדרואיד ישאל "לעדכן?" — לוחצים "עדכון"','Installing… tap "Update" when Android asks'),confirm:T('לוחצים "עדכון" בחלון של אנדרואיד','Tap "Update" in the Android window'),
  done:T('✅ האפליקציה עודכנה! היא תיפתח מחדש','✅ Updated!'),perm:T('פעם אחת בלבד: מדליקים "לאפשר ממקור זה" וחוזרים לכאן — העדכון ימשיך לבד','One time only: allow "from this source" and come back'),
  latest:T('✅ כבר יש לך את הגרסה הכי חדשה','✅ You already have the latest version'),cancel:T('העדכון בוטל. אפשר לנסות שוב מתי שרוצים','Update cancelled — try again any time'),
  error:T('⚠️ העדכון לא הצליח — בודקים את האינטרנט ומנסים שוב','⚠️ Update failed — check the internet and try again'),
  /* 🛡️ סינון (נטפרי וכדומה) עצר את הקובץ: חסימה (418/403), הפניה לדף החסימה, או דף חסימה במקום הקובץ.
     בנטפרי כל קובץ חדש נבדק לפני שמותר להוריד אותו, אז גרסה שיצאה עכשיו יכולה להיחסם לכמה שעות */
  filter:T('🛡️ הסינון (למשל נטפרי) עוד לא אישר את הקובץ של הגרסה החדשה. כל קובץ חדש עובר אצלם בדיקה, וזה לוקח לפעמים כמה שעות. מנסים שוב מאוחר יותר, ואם זה לא מסתדר אפשר לבקש מהסינון לאשר את ההורדה מ-yamshopping.com. האפליקציה הנוכחית ממשיכה לעבוד כרגיל',
    '🛡️ Your content filter (e.g. NetFree) has not approved the new version file yet. New files are reviewed first, which can take a few hours. Try again later, or ask the filter to approve the download from yamshopping.com. The current app keeps working as usual')};
const filterErr66=m=>/^(http_(418|403|451)|bad_redirect|bad_file)\b/.test(String(m||''));
function openNatUpd66(){
  const n=nat();if(!n||!n.selfUpdate){if(window.openApkUpd56)openApkUpd56();return;}
  const b=openSheet('🔄 '+T('עדכון האפליקציה','Update the app'),'<div class="nu66 apks53"><div id="nuInfo66"></div>'+
    '<p class="muted-note">📱 '+T('הגרסה שלך: ','Your version: ')+'<b>'+esc(n.ver||'')+'</b></p>'+
    '<button type="button" class="go66" id="nuGo66">⬇️ '+T('לעדכן עכשיו','Update now')+'</button>'+
    '<div class="bar66" hidden><i></i></div><p class="st66" id="nuSt66" role="status" aria-live="polite"></p>'+
    '<p class="muted-note">'+T('הכל קורה בתוך האפליקציה. הרשימות והחשבון נשארים כמו שהם.','Everything happens inside the app. Your lists and account stay.')+'</p></div>');
  if(window.apkInfo57)apkInfo57(b.querySelector('#nuInfo66'),true);
  b.querySelector('#nuGo66').onclick=e=>{e.currentTarget.disabled=true;b.querySelector('.bar66').hidden=false;$66('#nuSt66').textContent=ST.start;try{YamApp.installUpdate();}catch(x){$66('#nuSt66').textContent=ST.error;e.currentTarget.disabled=false;}};
}
window.openNatUpd66=openNatUpd66;
/* האפליקציה מדווחת לאתר איך העדכון מתקדם, ומה ענו על ההרשאה להתראות */
window.yamNat66=function(kind,a,b,c){
  if(kind==='perm'){if(typeof window.__yamPerm66==='function')window.__yamPerm66(a);return;}
  /* 🔋 2.1: חזרו מחלון "חיסכון סוללה" */
  if(kind==='battery'){if(a==='ok')flash('✅ '+T('מעולה! ההתראות יגיעו גם כשהאפליקציה סגורה','Great! Notifications will arrive even when the app is closed'));try{renderNotif();}catch(e){}return;}
  if(kind==='release'){if(typeof window.__rel69==='function')window.__rel69(a);return;}
  if(kind!=='update')return;const st=$66('#nuSt66'),bar=document.querySelector('.nu66 .bar66 i'),go=$66('#nuGo66');
  let txt=a==='error'&&filterErr66(c)?ST.filter:(ST[a]||'');if(a==='error'&&window.updFail61)updFail61(c);if(a==='download'&&b>=0)txt+=' · '+b+'%';if(a==='latest'&&c)txt+=' ('+c+')';
  if(st)st.textContent=txt;else if(txt&&/^(done|error|latest|cancel|confirm|perm)$/.test(a))flash(txt);
  if(bar){bar.style.width=(a==='download'?Math.max(3,b):/^(verify|install|confirm|done)$/.test(a)?100:a==='start'?3:0)+'%';}
  if(go&&/^(error|cancel|latest)$/.test(a))go.disabled=false;};
/* הפס "יש גרסה חדשה" — באפליקציה 1.3 ומעלה עם כפתור "לעדכן" שמעדכן ישר מתוך האפליקציה */
if(inApp&&nat()){const mo=new MutationObserver(()=>{const p=$66('#apkUp56');if(!p||p.querySelector('.now66'))return;const go=p.querySelector('#apkGo56');
    p.querySelector('#apkOk56').insertAdjacentHTML('beforebegin','<button type="button" class="now66">'+T('לעדכן','Update')+'</button>');
    const open=()=>{p.classList.remove('show');openNatUpd66();};p.querySelector('.now66').onclick=open;if(go)go.onclick=open;});
  mo.observe(document.body,{childList:true});}
/* קישור מהתראה בטלפון: ?appupdate=1 */
if(/[?&]appupdate=1/.test(location.search)){try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}if(inApp)setTimeout(openNatUpd66,1800);}

/* ---------- 🔔 התראות בטלפון באפליקציה (מגרסה 1.3) ---------- */
if(inApp&&nat()){
  /* הטלפון כבר מרשה התראות (באנדרואיד 12 ומטה זה ככה מההתקנה), אבל לא לחצו אף פעם "להפעיל" — הכרטיס הראה "✅ פעיל",
     ובפועל התראות הפעמון (הוזלות, מבצעים, תזכורות) לא נשלחו לטלפון. מדליקים פעם אחת; מי שכיבה בעצמו נשאר כבוי */
  {const n0=nat();if(n0&&n0.notif==='granted'&&prefs.notify===undefined){prefs.notify=true;savePrefs();}}
  /* כרטיס ההתראות בפעמון: במקום התראות הדפדפן — התראות של הטלפון */
  pushCardHtml=function(){const n=nat()||{};const on=n.notif==='granted';
    return '<div class="mecard pushcard natcard66"><h4>📲 '+T('התראות בטלפון','Phone notifications')+'</h4>'+
      (on?'<p class="muted-note">✅ '+T('פעיל. מגיעות התראות גם כשהאפליקציה סגורה, בכל שעות היממה — רק לא בשבת.'+(nightApp(n)?' '+T('(בגרסה הזו של האפליקציה עדיין בלי לילה — בגרסה הבאה גם בלילה.)','(This app version still skips nights.)'):''),'On — even when the app is closed, any time except Shabbat.')+'</p>'+
        '<label class="radio"><input type="checkbox" id="nat66bg"'+(n.bg!==false?' checked':'')+'> 🆕 '+(n.release?T('מה חדש באתר (גם כשהאפליקציה סגורה)','What\'s new (even when closed)'):T('גרסה חדשה ומה חדש באתר (גם כשהאפליקציה סגורה)','New version & what\'s new (even when closed)'))+'</label>'+(n.release?'<p class="muted-note">🔄 '+T('על גרסה חדשה לאפליקציה מקבלים התראה תמיד.','You always get a notice about a new app version.')+'</p>':'')+
        '<label class="radio"><input type="checkbox" id="nat66shb"'+(n.shabbat!==false?' checked':'')+'> 🕯️ '+T('תזכורת ביום שישי בבוקר לבדוק את הרשימה לשבת','Friday morning Shabbat list reminder')+'</label>'+batHtml(n)+bgSeenHtml()
       :'<p class="muted-note">'+T('גרסה חדשה, מה חדש, תזכורות לשבת, הוזלות ומבצעים — ישר לטלפון.','New versions, what\'s new, Shabbat reminders, price drops — straight to your phone.')+'</p><button class="btn" id="nat66on">🔔 '+T('להפעיל התראות בטלפון','Turn on phone notifications')+'</button>')+'</div>';};
  /* 🔋 2.1: בטלפונים עם חיסכון סוללה חזק (שיאומי, סמסונג, הואווי) הבדיקה ברקע נעצרת כשסוגרים את האפליקציה,
     וההתראות מגיעות רק כשנכנסים. מבקשים את הפטור רק כשהמשתמש לוחץ — חלון של הטלפון, שאפשר לאשר או לסרב */
  const batHtml=n=>{if(!n.battery||n.battery==='na')return '';
    let h='<div class="bat66">';
    /* 🔋 2.2: "blocked" — הטלפון חוסם פעילות ברקע (במסך הסוללה של הטלפון אף אפשרות לא מסומנת, נמצא ב-Qin 3 Ultra).
       batLost — היה "ללא הגבלות" והטלפון ביטל לבד. בשניהם הכפתור פותח את הגדרות האפליקציה */
    if(n.battery==='blocked'||(n.batLost&&n.battery!=='ok'))h+='<p class="muted-note">🔋 '+(n.batLost?T('הטלפון ביטל לבד את "ללא הגבלות" לאפליקציה, ולכן ההתראות נעצרות כשהיא סגורה.','Your phone removed "Unrestricted" by itself, so notifications stop while the app is closed.'):T('הטלפון חוסם לאפליקציה לפעול ברקע, ולכן ההתראות נעצרות כשהיא סגורה.','Your phone blocks the app in the background, so notifications stop while it is closed.'))+' '+T('לוחצים, ובמסך שנפתח: סוללה ← "ללא הגבלות". אם יש שם "הפעלה אוטומטית" או "הפעלה ברקע" — להדליק גם אותן.','Tap, then Battery → "Unrestricted". Also turn on "Autostart"/"Run in background" if you see them.')+'</p>'+
      '<button type="button" class="btn" id="nat66bat">⚙️ '+T('לפתוח את הגדרות האפליקציה','Open app settings')+'</button>';
    else h+=n.battery==='ok'?'<p class="muted-note">🔋 '+T('הטלפון לא עוצר את ההתראות כשהאפליקציה סגורה.','Your phone won\'t block notifications while the app is closed.')+'</p>'
      :'<p class="muted-note">🔋 '+T('כדי שההתראות יגיעו גם כשהאפליקציה סגורה, צריך לאשר לה לפעול ברקע (היא בודקת פעם ברבע שעה בלבד, וזה כמעט לא צורך סוללה).','To get notifications while the app is closed, allow it to run in the background (it checks only every 15 minutes, barely any battery).')+'</p>'+
        '<button type="button" class="btn" id="nat66bat">🔋 '+T('לאשר פעילות ברקע','Allow background activity')+'</button>';
    if(n.autostart)h+='<p class="muted-note">📱 '+T('בשיאומי צריך גם להדליק "הפעלה אוטומטית" ל"רשימת קניות". לוחצים, ובמסך שנפתח מדליקים את המתג ליד האפליקציה.','On Xiaomi, also turn on "Autostart" for the app: tap below and switch it on.')+'</p>'+
      '<button type="button" class="btn" id="nat66auto">⚙️ '+T('לפתוח "הפעלה אוטומטית"','Open "Autostart"')+'</button>';
    return h+'</div>';};
  /* 📡 האם הבדיקה ברקע באמת רצה כשהאפליקציה סגורה? השרת רושם מתי הטלפון בדק לאחרונה (app_notices_for ← bg_at).
     כך רואים מיד אם הטלפון עוצר את האפליקציה, או שפשוט עכשיו לילה/שבת (אז ההתראות מחכות ומגיעות אחר כך) */
  const quietNow=()=>{let d,h;try{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jerusalem',weekday:'short',hour:'numeric',hour12:false}).formatToParts(new Date()).map(x=>[x.type,x.value]));d=p.weekday;h=(+p.hour)%24;}catch(e){return '';}
    if((d==='Fri'&&h>=15)||(d==='Sat'&&h<21))return 'shabbat';return (nightApp(nat()||{})&&(h>=22||h<7))?'night':'';};
  /* עד גרסה 2.1 האפליקציה לא מתריעה בלילה (22:00–07:00). מגרסה 2.2 — בכל שעות היממה, רק לא בשבת */
  const nightApp=n=>{const v=String(n.ver||'').split('.').map(Number);return !!n.ver&&((v[0]||0)<2||((v[0]||0)===2&&(v[1]||0)<2));};
  const bgSeenHtml=()=>{setTimeout(fillBgSeen,0);return '<p class="muted-note" id="bgSeen66" hidden></p>';};
  async function fillBgSeen(){const el=$66('#bgSeen66');if(!el||typeof sb==='undefined'||!sb||typeof authUser==='undefined'||!authUser)return;
    let r=null;try{const {data,error}=await sb.rpc('my_app_bg');if(error)return;r=data;}catch(e){return;}
    if(!r||!r.phones||!el.isConnected)return;
    const q=quietNow(),at=r.bg_at?Date.parse(r.bg_at):0,mins=at?Math.round((Date.now()-at)/60000):-1,linkedMins=r.linked_at?(Date.now()-Date.parse(r.linked_at))/60000:0;
    const ago=m=>m<60?T('לפני '+Math.max(1,m)+' דקות',Math.max(1,m)+' min ago'):m<48*60?T('לפני '+Math.round(m/60)+' שעות',Math.round(m/60)+' h ago'):T('לפני '+Math.round(m/1440)+' ימים',Math.round(m/1440)+' days ago');
    let t;
    if(q)t=(q==='night'?'🌙 '+T('עכשיו לילה (22:00–07:00): ההתראות לא קופצות בטלפון, ומגיעות בבוקר אחרי 07:00.','Night (22:00–07:00): notifications wait until 07:00.'):'🕯️ '+T('עכשיו שבת: ההתראות לא קופצות בטלפון, ומגיעות במוצאי שבת.','Shabbat: notifications wait until after Shabbat.'))+(at?' '+T('הבדיקה ברקע רצה לאחרונה ','Last background check ')+ago(mins)+'.':'');
    else if(at&&mins<=45)t='📡 '+T('הבדיקה ברקע עובדת — רצה לאחרונה ','Background check works — last ran ')+ago(mins)+'.';
    /* כשכבר יש פטור מחיסכון סוללה (battery==='ok') אין כפתור "פעילות ברקע" למעלה — אז לא שולחים אליו, אלא להגדרות האפליקציה.
       ככה זה ב-Qin 3 Ultra: הפטור דלוק, אבל מנהל הסוללה של הטלפון עדיין עוצר (ומבטל לבד את "ללא הגבלות") */
    else{const n=nat()||{},okBat=n.battery==='ok',fix=okBat?T('הטלפון עדיין עוצר את האפליקציה כשהיא סגורה. לוחצים על הכפתור, ובמסך שנפתח: סוללה ← "ללא הגבלות". אם יש שם "הפעלה אוטומטית" או "הפעלה ברקע" — להדליק גם אותן.','Your phone still stops the app while it is closed. Tap below, then Battery → "Unrestricted".'):(n.battery==='blocked'||n.batLost)?T('לפתוח את הגדרות האפליקציה למעלה ולבחור "ללא הגבלות".','Open the app settings above and choose "Unrestricted".'):T('לאשר "פעילות ברקע" למעלה, ובהגדרות הטלפון ← אפליקציות ← רשימת קניות ← סוללה ← "ללא הגבלה".','Allow background activity above.');
      if(at)t='⚠️ '+T('הבדיקה ברקע רצה לאחרונה ','Background check last ran ')+ago(mins)+'. '+T('כנראה הטלפון עוצר את האפליקציה כשהיא סגורה, ולכן ההתראות מגיעות רק כשנכנסים.','Your phone is probably stopping the app while it is closed.')+' '+fix;
      else if(linkedMins>60)t='⚠️ '+T('הבדיקה ברקע עוד לא רצה אף פעם כשהאפליקציה סגורה — הטלפון עוצר אותה.','The background check has never run while the app was closed.')+' '+fix;
      else return;
      el.textContent=t;el.hidden=false;
      if(okBat&&typeof YamApp!=='undefined'&&typeof YamApp.openAutostart==='function'&&!$66('#nat66set')){const b=document.createElement('button');b.type='button';b.className='btn';b.id='nat66set';b.textContent='⚙️ '+T('לפתוח את הגדרות האפליקציה','Open app settings');el.after(b);}
      return;}
    el.textContent=t;el.hidden=false;}
  document.addEventListener('click',e=>{const b=e.target.closest('#nat66bat,#nat66auto,#nat66set');if(!b)return;e.stopPropagation();
    try{if(b.id==='nat66bat')YamApp.askBattery();else YamApp.openAutostart();}catch(x){}},true);
  pushEnable=async function(){let p=Notification.permission;if(p!=='granted'){try{p=await Notification.requestPermission();}catch(e){}}
    if(p!=='granted'){flash('⚠️ '+T('ההתראות כבויות בהגדרות הטלפון — מדליקים שם ל"רשימת קניות"','Notifications are off in phone settings'));return false;}
    prefs.notify=true;savePrefs();try{updateBell(false);}catch(e){}flash('📲 '+T('מעולה! מעכשיו יגיעו התראות לטלפון','Done! Notifications are on'));return true;};
  pushDisable=async function(){prefs.notify=false;savePrefs();try{YamApp.setBg(false,false);}catch(e){}flash('🔕 '+T('ההתראות כובו','Notifications off'));};
  document.addEventListener('click',async e=>{if(!e.target.closest('#nat66on'))return;e.stopPropagation();if(await pushEnable()){try{YamApp.setBg(true,true);}catch(x){}renderNotif();}},true);
  document.addEventListener('change',e=>{if(e.target.id!=='nat66bg'&&e.target.id!=='nat66shb')return;
    try{YamApp.setBg(!!($66('#nat66bg')||{}).checked,!!($66('#nat66shb')||{}).checked);flash('💾 '+T('נשמר','Saved'));}catch(x){}},true);
  /* פעם אחת: הצעה קטנה להפעיל התראות (באנדרואיד 13 ומעלה צריך לאשר) */
  setTimeout(()=>{const n=nat();if(!n||n.notif!=='default'||ls66('yam_nask66')||!state.user||document.hidden)return;ls66('yam_nask66','1');
    const d=document.createElement('div');d.id='nAsk66';d.setAttribute('role','dialog');d.setAttribute('aria-label',T('התראות בטלפון','Phone notifications'));
    d.innerHTML='<b>🔔 '+T('לקבל התראות לטלפון?','Get phone notifications?')+'</b><p>'+T('על גרסה חדשה, מה חדש, תזכורת לפני שבת והוזלות במוצרים שלך. לא בשבת.','New versions, what\'s new, Shabbat reminders and price drops. Never on Shabbat.')+'</p>'+
      '<div class="r"><button type="button" class="y">'+T('כן, להפעיל','Yes, turn on')+'</button><button type="button" class="n">'+T('לא עכשיו','Not now')+'</button></div>';
    document.body.appendChild(d);d.querySelector('.n').onclick=()=>d.remove();
    d.querySelector('.y').onclick=async()=>{d.remove();if(await pushEnable())try{YamApp.setBg(true,true);}catch(x){}};},25000);
}
})();
