/* 🆕 מה חדש, מספרי גרסה והיסטוריית עדכונים (כסלו תשפ"ז, נובמבר 2026)
   • מספר גרסה אמיתי (לא תאריך): האתר — APP_VERSION (js/019.js), האפליקציה — download/app-version.json והגרסה המותקנת בטלפון (UA).
   • מסך אחד "🆕 מה חדש" עם שתי לשוניות: 🌐 באתר / 📱 באפליקציה. בכל אחת: מה חדש בעדכון האחרון, ומתחת היסטוריית עדכונים.
     באתר — גם ההודעות שהצוות פרסם בבק אופיס (site_updates). באפליקציה — גם "בקרוב בגרסה הבאה" והאפליקציה האופליין.
   • קרדיט "נוצר על ידי יסוד שביסוד" — בתחתית התפריט ☰, באודות ובמסך מה חדש.
   כשמשחררים APK חדש: מעבירים את הסעיפים מ-APP_NEXT ל-download/app-version.json (שם הם נקראים אוטומטית כ"מה חדש"),
   מוסיפים את הגרסה הקודמת ל-APP_HIST, ומעדכנים את APP_NEXT מתוך android/לגרסה-*.md שבתיקיית הפרויקט.
   באפליקציה האופליין: מוסיפים ל-OFF_HIST בכל גרסה (הקוד שלה ארוז בתוכה, אז השינוי מגיע אליה רק בגרסה הבאה שלה). */
(function(){
const $91=s=>document.querySelector(s);
/* בלי T: T מחליף באפליקציה "מה חדש באתר" ל"באפליקציה", וכאן צריך את שתי המילים כמו שהן */
const L=(he,en)=>prefs.lang==='en'?en:he;
const UA=navigator.userAgent||'';
const myApp=(UA.match(/YamShoppingApp\/([0-9.]+)/)||[])[1]||'';
const myOff=(UA.match(/YamShoppingOffline\/([0-9.]+)/)||[])[1]||'';

/* ---------- 🔖 גרסת האתר הנוכחית ---------- */
CHANGELOG.unshift(['21','2026-11-24',
  'מה היה: קבלה מקישור ב-SMS לא תמיד נפתחה, ההשוואה "איזו רשת הכי זולה" חישבה לא נכון, והגרסה של האתר הופיעה כתאריך.',
  'מה חדש:\n🧾 קבלה מקישור ב-SMS (אושר עד, אייס ועוד) נפתחת ישר, ואפשר לצלם קבלה ישר מהמצלמה\n📈 גרף מחיר לכל מוצר: רואים אם היה זול יותר בשבוע שעבר\n💰 "הכי זול לכל הרשימה" משווה רק מוצרים זהים שיש בכל החנויות, עם מחירים מכל הרשתות שברשימה של משרד הכלכלה\n⚡ האתר נפתח מהר בערך פי 1.8\n📅 לוח עברי: תאריך, פרשת השבוע, דף יומי וזמני היום\n📴 סנכרון עם "רשימת קניות אופליין" בבלוטות\', בקוד QR או בקוד שיתוף, והורדת האפליקציה האופליין\n🔄 עדכון של האתר לא מנתק את הבלוטות\', ואחרי טעינה מחדש הוא מתחבר שוב לבד\n🆕 מסך "מה חדש" חדש: מספר הגרסה, מה חדש באתר ובאפליקציה, והיסטוריית עדכונים']);

/* ---------- 📱 היסטוריית האפליקציה לאנדרואיד (הגרסה האחרונה נקראת מ-download/app-version.json) ---------- */
const APP_HIST=[
 {v:'2.2',date:'2026-11-22',notes:[]},
 {v:'2.1',date:'2026-11-11',notes:['האפליקציה נפתחת גם בלי אינטרנט, כבר מהפעם הראשונה אחרי ההתקנה','התראות מגיעות גם כשהאפליקציה סגורה, גם בשיאומי ובסמסונג','אנימציית הפתיחה של הלוגו, כמו באתר, גם כשחוזרים לאפליקציה אחרי זמן']},
 {v:'2.0',date:'2026-11-08',notes:['עיצוב חדש: אייקון חדש ואנימציית פתיחה','מספר אדום על האייקון: כמה עדכונים מחכים לכם','קישור של yamshopping.com נפתח ישר באפליקציה','שיתוף טקסט אל האפליקציה: כל שורה נכנסת כמוצר','4 קיצורי דרך בלחיצה ארוכה על האייקון','המסך לא נכבה במצב קנייה, ורטט כשסורקים ברקוד','כניסה עם חשבון גוגל','הודעה שסימנתם "נקרא" לא קופצת שוב']},
 {v:'1.9',date:'',notes:['התראה על גרסה חדשה מגיעה גם למי שכיבה את ההתראות ברקע','גרסה חדשה יכולה להגיע קודם לחלק מהמשתמשים, כדי לבדוק שהכל תקין']},
 {v:'1.0–1.8',date:'',notes:['הגרסאות הראשונות של האפליקציה לאנדרואיד']}];
/* 🔜 מה יגיע בגרסה הבאה של האפליקציה (לפי android/לגרסה-2.3.md) — באתר זה כבר מוכן */
const APP_NEXT={v:'2.3',notes:['קבלה מקישור מקוצר ב-SMS (אושר עד, אייס ועוד) נפתחת ישר מהטלפון','חיבור הבלוטות\' מול המחשב לא מתנתק, ומתחבר שוב לבד']};
/* 📴 רשימת קניות אופליין */
const OFF_HIST=[
 {v:'1.5',date:'2026-11-22',notes:['חיבור הבלוטות\' מול המחשב לא מתנתק, מתחבר שוב לבד ושולח רק מה שהשתנה']},
 {v:'1.4',date:'2026-11-22',notes:['סנכרון בבלוטות\' גם מהמחשב, בקובץ USB ובמייל','לוח עברי ודף יומי, בלי אינטרנט','רואים מי מחובר עכשיו']},
 {v:'1.3',date:'2026-11-22',notes:['סורק QR משלה: סריקה אחת מאיזה צד שרוצים, וגם "פנים מול פנים"']},
 {v:'1.2',date:'2026-11-22',notes:['בלי פרסומת בצד']},
 {v:'1.1',date:'2026-11-22',notes:['מוסתר כל מה שצריך אינטרנט','השעון מתיישר לפי הטלפון שמסנכרנים איתו, ורשימות שנמחקו לא חוזרות']},
 {v:'1.0',date:'2026-11-21',notes:['הגרסה הראשונה: רשימות קניות בלי אינטרנט בכלל, וסנכרון בקוד QR, בבלוטות\' או בקוד שיתוף']}];

/* ---------- 📆 תאריך עברי לכל גרסה ---------- */
const GREG={'ספטמבר 2026':'אלול תשפ״ו – תשרי תשפ״ז','אוקטובר 2026':'תשרי – חשון תשפ״ז','נובמבר 2026':'חשון – כסלו תשפ״ז'};
function day91(s){s=String(s||'').trim();const m=s.match(/^(\d{4})-(\d\d)-(\d\d)$/);
  if(m){const dt=new Date(+m[1],+m[2]-1,+m[3],12);
    if(prefs.lang==='en')return dt.toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'});
    try{if(window.Hcal)return Hcal.hdStr(Hcal.fromRd(Hcal.rdOf(dt)));}catch(e){}return dt.toLocaleDateString('he-IL');}
  return prefs.lang==='en'?s:(GREG[s]||s);}
/* "מה חדש: א · ב" או שורה לכל דבר — לרשימה */
const lines91=s=>String(s||'').replace(/^\s*מה (חדש|היה):\s*/,'').split(/\n| · /).map(x=>x.replace(/^\s*[-•*]\s*/,'').trim()).filter(Boolean);
const ul91=a=>a.length?'<ul class="wn91ul">'+a.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
const older91=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)<(y[i]||0);}return false;};

/* ---------- ✨ הקרדיט ---------- */
let gid91=0;
function mark91(sz){const g='yk91g'+(++gid91);
  return '<svg class="yk91m" viewBox="0 0 40 40" width="'+sz+'" height="'+sz+'" aria-hidden="true" focusable="false"><defs><linearGradient id="'+g+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a5f"/><stop offset="1" stop-color="#2a8f87"/></linearGradient></defs>'+
    '<rect x="1" y="1" width="38" height="38" rx="11" fill="url(#'+g+')"/>'+
    '<path d="M11 14.5 6.5 20 11 25.5M29 14.5 33.5 20 29 25.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<text x="20" y="27.5" text-anchor="middle" font-size="20" font-weight="800" fill="#fff" font-family="\'Frank Ruhl Libre\',David,\'Times New Roman\',serif">י</text>'+
    '<path d="M31 4.5l1.1 2.4 2.4 1.1-2.4 1.1L31 11.5l-1.1-2.4-2.4-1.1 2.4-1.1z" fill="#f2c14e"/></svg>';}
/* ✏️ השם והסמל של החברה: כאן ובפונקציה mark91 (הסמל הזמני — האות י׳; יוחלף בלוגו כשיאושר)
   🔗 כתובת האתר של יסוד שביסוד — כשיש כתובת, כותבים אותה כאן (https://...) והקרדיט נהיה קישור. ריק = בלי קישור.
   באפליקציה האופליין אין אינטרנט, אז שם הקרדיט אף פעם לא קישור */
const CREDIT_URL='https://yamshopping.com/yiddishkeit/';
const credit91=(big)=>{const tag=CREDIT_URL&&!OFF_APP?'a':'div';
  return '<'+tag+' class="yk91'+(big?' big':'')+'"'+(tag==='a'?' href="'+esc(CREDIT_URL)+'" target="_blank" rel="noopener"':' role="note"')+' aria-label="'+L('נוצר על ידי יסוד שביסוד','Created by Yesod Shebiyesod')+'">'+mark91(big?40:26)+
  '<span class="yk91t"><small>'+(OFF_APP||myApp?L('האפליקציה נוצרה על ידי','App created by'):L('האתר נוצר על ידי','Site created by'))+'</small><b>יסוד שביסוד</b></span></'+tag+'>';};

/* ---------- 🆕 המסך ---------- */
function siteTab91(news){const c=CHANGELOG[0]||[];
  let h='<div class="wn91card now"><div class="wn91h"><b>🌐 '+L('מה חדש בגרסה','New in version')+' '+esc(c[0]||APP_VERSION)+'</b><small>'+esc(day91(c[1]))+'</small></div>'+ul91(lines91(c[3]))+
    (c[2]?'<p class="wn91was">'+esc(String(c[2]).replace(/^\s*מה היה:\s*/,L('לפני העדכון: ','Before: ')))+'</p>':'')+'</div>';
  if(news&&news.length)h+='<h4 class="wn91sec">📢 '+L('הודעות מהצוות','Team announcements')+'</h4>'+news.map(u=>'<div class="wn91card"><div class="wn91h"><b>'+esc(u.title||'')+'</b><small>'+esc(fmtDate(new Date(u.created_at)))+'</small></div>'+ul91(lines91(u.body))+'</div>').join('');
  const rest=CHANGELOG.slice(1);
  if(rest.length)h+='<h4 class="wn91sec">🕰️ '+L('היסטוריית עדכונים — האתר','Update history — site')+'</h4><div class="wn91tl">'+rest.map(([v,d,was,now])=>
    '<details><summary><span class="wn91v">'+esc(v)+'</span><span>'+L('גרסה ','Version ')+esc(v)+'</span><small>'+esc(day91(d))+'</small></summary>'+ul91(lines91(now))+'</details>').join('')+'</div>';
  return h;}
function appTab91(latest){
  const hist=APP_HIST.map(x=>Object.assign({},x));
  if(latest&&latest.version){const i=hist.findIndex(x=>x.v===String(latest.version)),e={v:String(latest.version),date:latest.date||'',notes:(latest.notes||[]).map(String)};if(i>=0)hist[i]=e;else hist.unshift(e);}
  const top=hist[0];let h='';
  if(myApp)h+='<p class="wn91mine">📱 '+L('אצלך מותקנת גרסה','You have version')+' <b>'+esc(myApp)+'</b>'+(older91(myApp,top.v)?' · <button type="button" class="wn91up" data-wn91up>🔄 '+L('יש גרסה חדשה','New version')+' '+esc(top.v)+'</button>':' · ✅ '+L('הכי חדשה','Up to date'))+'</p>';
  if(!OFF_APP){
    h+='<div class="wn91card now"><div class="wn91h"><b>📱 '+L('מה חדש באפליקציה — גרסה','New in the app — version')+' '+esc(top.v)+'</b><small>'+esc(day91(top.date))+'</small></div>'+ul91(top.notes)+'</div>';
    if(APP_NEXT&&older91(top.v,APP_NEXT.v))h+='<div class="wn91card next"><div class="wn91h"><b>🔜 '+L('בקרוב בגרסה','Coming in version')+' '+esc(APP_NEXT.v)+'</b></div>'+ul91(APP_NEXT.notes)+'</div>';
    h+='<h4 class="wn91sec">🕰️ '+L('היסטוריית עדכונים — האפליקציה לאנדרואיד','Update history — Android app')+'</h4><div class="wn91tl">'+hist.slice(1).map(x=>
      '<details><summary><span class="wn91v">'+esc(x.v)+'</span><span>'+L('גרסה ','Version ')+esc(x.v)+'</span><small>'+esc(day91(x.date))+'</small></summary>'+ul91(x.notes)+'</details>').join('')+'</div>';}
  const o=OFF_HIST[0];
  h+='<h4 class="wn91sec">📴 '+L('רשימת קניות אופליין','Offline shopping list')+(myOff?' · '+L('אצלך','yours')+' '+esc(myOff):'')+'</h4><div class="wn91tl">'+OFF_HIST.map((x,i)=>
    '<details'+(OFF_APP&&!i?' open':'')+'><summary><span class="wn91v">'+esc(x.v)+'</span><span>'+L('גרסה ','Version ')+esc(x.v)+(x===o?' · '+L('האחרונה','latest'):'')+'</span><small>'+esc(day91(x.date))+'</small></summary>'+ul91(x.notes)+'</details>').join('')+'</div>';
  return h;}
async function openWhatsNew(tab){
  tab=tab||(OFF_APP?'app':'site');
  const b=openSheet('🆕 '+L('מה חדש','What\'s new'),'<div class="empty">'+L('טוען...','Loading...')+'</div>');
  let latest=null,news=[];
  await Promise.all([
    (window.apkVer57&&!OFF_APP?apkVer57().then(v=>{latest=v;},()=>{}):Promise.resolve()),
    (sb?Promise.resolve(sb.from('site_updates').select('id,title,body,created_at,active').order('created_at',{ascending:false}).limit(10)).then(r=>{news=((r&&r.data)||[]).filter(u=>u.active!==false);},()=>{}):Promise.resolve())]);
  const appV=(latest&&latest.version)||(typeof APK_LATEST56!=='undefined'?APK_LATEST56:APP_HIST[0].v);
  const pill=(k,ic,lbl,v)=>'<button type="button" role="tab" class="wn91tab'+(tab===k?' on':'')+'" aria-selected="'+(tab===k)+'" data-wn91t="'+k+'"><span>'+ic+' '+lbl+'</span><b>'+L('גרסה ','v')+esc(v)+'</b></button>';
  const draw=()=>{b.innerHTML='<div class="wn91">'+
      '<div class="wn91tabs" role="tablist">'+pill('site','🌐',L('באתר','Site'),APP_VERSION)+pill('app',OFF_APP?'📴':'📱',L('באפליקציה','App'),OFF_APP?(myOff||OFF_HIST[0].v):(myApp||appV))+'</div>'+
      '<div role="tabpanel">'+(tab==='site'?siteTab91(news):appTab91(latest))+'</div>'+credit91(true)+'</div>';};
  draw();
  b.onclick=e=>{const t=e.target.closest('[data-wn91t]');if(t){tab=t.dataset.wn91t;draw();return;}
    if(e.target.closest('[data-wn91up]')){const s=$91('#apkGo56');if(s)s.click();else location.href='/#apk';}};}
window.openWhatsNew=openWhatsNew;

/* ---------- ☰ תחתית התפריט: שתי הגרסאות + הקרדיט ---------- */
(function(){const m=$91('#hMenu');if(!m||$91('#verFoot91'))return;
  const app=OFF_APP?'📴 '+L('אופליין','Offline')+' '+(myOff||OFF_HIST[0].v):'📱 '+L('אפליקציה','App')+' '+(myApp||APP_HIST[0].v);
  m.insertAdjacentHTML('beforeend','<div id="verFoot91"><button type="button" id="verBtn91" aria-label="'+L('מה חדש — גרסת האתר ','What\'s new — site version ')+esc(APP_VERSION)+'">🌐 '+L('אתר','Site')+' '+esc(APP_VERSION)+' · '+esc(app)+' · <u>'+L('מה חדש','What\'s new')+'</u></button>'+credit91(false)+'</div>');
  $91('#verBtn91').onclick=()=>openWhatsNew();
  /* באפליקציה — הגרסה האחרונה שמחכה להורדה, אם יש */
  if(!OFF_APP&&!myApp&&window.apkVer57)apkVer57().then(v=>{if(v&&v.version){const x=$91('#verBtn91');if(x)x.innerHTML=x.innerHTML.replace(' '+APP_HIST[0].v+' ·',' '+esc(v.version)+' ·');}},()=>{});})();

/* ---------- ℹ️ אודות: הגרסאות, כפתור "מה חדש" והקרדיט ---------- */
const _o91=openAbout;
openAbout=function(){const r=_o91.apply(this,arguments);try{const v=$91('#aboutBody .ver16');if(v&&!v.dataset.wn91){v.dataset.wn91='1';
  v.innerHTML='<span>🌐 '+L('גרסת האתר','Site version')+' <b>'+esc(APP_VERSION)+'</b></span>'+(OFF_APP?'<span>📴 '+L('גרסת האפליקציה','App version')+' <b>'+esc(myOff||OFF_HIST[0].v)+'</b></span>':'<span>📱 '+L('גרסת האפליקציה','App version')+' <b>'+esc(myApp||APP_HIST[0].v)+'</b></span>')+
    '<button type="button" class="btn sec" data-wn91open>🆕 '+L('מה חדש והיסטוריית עדכונים','What\'s new & update history')+'</button>';
  v.insertAdjacentHTML('afterend',credit91(true));
  v.querySelector('[data-wn91open]').onclick=()=>{$91('#aboutOverlay').classList.remove('open');openWhatsNew();};}}catch(e){console.warn('wn91 about',e);}return r;};

/* 👩‍🍳 "מה חדש?" ליאמי — פותח את המסך */
yamiStep(async raw=>{if(/^(מה חדש|מה חדש באתר|מה חדש באפליקציה|עדכונים|מה התחדש|היסטוריית עדכונים|איזו גרסה|גרסה)\??$/.test(String(raw||'').trim())){openWhatsNew();botSay('🆕 '+T('פתחתי את "מה חדש" — מה חדש באתר ובאפליקציה, והיסטוריית העדכונים','Opened what\'s new'));return true;}return false;});

const st=document.createElement('style');st.textContent=
  '.wn91tabs{display:flex;gap:8px;margin:0 0 10px}.wn91 .wn91tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 6px;border-radius:14px;border:1.5px solid var(--chipbr);background:var(--inputbg)!important;color:var(--text)!important;font:inherit;cursor:pointer;box-shadow:none}'+
  '.wn91 .wn91tab b{font-size:12px;color:var(--muted);font-weight:600}.wn91 .wn91tab.on{border-color:var(--hdr2);background:var(--hdr2)!important;color:#fff!important}.wn91 .wn91tab.on b{color:#fff;opacity:.85}'+
  '.wn91card{border:1px solid var(--chipbr);border-radius:14px;padding:10px 14px;margin:8px 0;background:var(--inputbg)}.wn91card.now{border-color:var(--hdr2);border-inline-start-width:4px}.wn91card.next{border-style:dashed}'+
  '.wn91h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}.wn91h small,.wn91tl small{color:var(--muted);font-size:12px}'+
  '.wn91ul{margin:6px 0 2px;padding-inline-start:18px}.wn91ul li{margin:4px 0;line-height:1.55;font-size:14px}.wn91was{margin:8px 0 0;font-size:12.5px;color:var(--muted);line-height:1.5}'+
  '.wn91sec{margin:16px 2px 6px;font-size:14px;color:var(--hdr2)}.wn91mine{margin:2px 2px 8px;font-size:14px}.wn91up{font:inherit;font-size:13px;border:0;background:var(--hdr2);color:#fff;border-radius:10px;padding:3px 10px;cursor:pointer}'+
  '.wn91tl{border-inline-start:2px solid var(--line);margin-inline-start:12px;padding-inline-start:0}.wn91tl details{position:relative;padding:2px 0 2px 0}'+
  '.wn91tl summary{display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;padding:6px 0;margin-inline-start:-13px}.wn91tl summary::-webkit-details-marker{display:none}'+
  '.wn91v{min-width:24px;height:24px;padding:0 5px;box-sizing:border-box;border-radius:12px;background:var(--panel);border:2px solid var(--hdr2);color:var(--hdr2);font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}'+
  '.wn91tl summary small{margin-inline-start:auto}.wn91tl details[open] .wn91v{background:var(--hdr2);color:#fff}.wn91tl .wn91ul{margin:0 0 8px;padding-inline-start:34px}'+
  'a.yk91{text-decoration:none;cursor:pointer}a.yk91:hover .yk91t b{text-decoration:underline}.yk91{display:flex;align-items:center;justify-content:center;gap:8px;margin:6px auto 2px;color:var(--muted)}.yk91t{display:flex;flex-direction:column;line-height:1.2;text-align:start}.yk91t small{font-size:10.5px}'+
  '.yk91t b{font-size:13px;font-weight:800;letter-spacing:.2px;background:linear-gradient(90deg,var(--hdr2),#2a8f87);-webkit-background-clip:text;background-clip:text;color:transparent}'+
  '.yk91.big{margin:18px auto 6px;padding:10px 16px;border:1px solid var(--chipbr);border-radius:16px;width:max-content;max-width:100%;box-sizing:border-box;background:linear-gradient(135deg,var(--inputbg),var(--chipbg))}.yk91.big .yk91t small{font-size:12px}.yk91.big .yk91t b{font-size:17px}'+
  '.yk91m{flex:0 0 auto;filter:drop-shadow(0 2px 4px rgba(30,58,95,.25))}'+
  'html.dark .yk91t b,body.dark .yk91t b{background:linear-gradient(90deg,#9cc7ff,#6fd6c8);-webkit-background-clip:text;background-clip:text}'+
  '#verFoot91{border-top:1px solid var(--line);margin-top:4px;padding:6px 0 2px;text-align:center}#hMenu #verBtn91{display:block;width:100%;text-align:center;font-size:11.5px;color:var(--muted);padding:6px 4px}#verBtn91 u{color:var(--hdr2);text-decoration:none;font-weight:700}'+
  '.ver16{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;font-size:13px;color:var(--muted);margin:14px 0 0}.ver16 b{color:var(--text)}.ver16 .btn{flex-basis:100%;max-width:320px}';
document.head.appendChild(st);
})();
