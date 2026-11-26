
/* ================= v27: אורחים בלי יאמי, מעקב אנונימי על ניסיון בלי הרשמה, ספריא בבק אופיס, אלרגיות בבית ================= */
const $27=s=>document.querySelector(s);
const isGuest27=()=>!!(state.user&&state.user.guest&&!authUser);
/* ---------- 👩‍🍳 יאמי רק לרשומים ---------- */
function guestYami27(){const b=openSheet('👩‍🍳 '+T('יאמי','Yami'),'<div class="v26card" style="text-align:center"><div style="font-size:42px">👩‍🍳</div><p style="font-size:18px;margin:6px 0"><b>'+T('יאמי זמינה לרשומים בלבד','Yami is for members only')+'</b></p>'+
  '<p class="muted-note">'+T('ההרשמה בחינם ולוקחת חצי דקה — ומה שכבר עשית כאן עובר איתך לחשבון.','Sign-up is free and takes 30 seconds — what you did here moves to your account.')+'</p>'+
  '<button id="gy27" style="width:100%">'+T('הרשמה חינם','Sign up free')+'</button></div>');b.querySelector('#gy27').onclick=()=>{closeSheet();showLogin();};}
const _v27OpenBot=openBot;openBot=function(){if(isGuest27()){guestYami27();return;}return _v27OpenBot.apply(this,arguments);};
const _v27BotReply=botReply;botReply=async function(){if(isGuest27()){guestYami27();return;}return _v27BotReply.apply(this,arguments);};
const _v27SendToBot=sendToBot;sendToBot=function(){if(isGuest27()){guestYami27();return;}return _v27SendToBot.apply(this,arguments);};
document.addEventListener('click',e=>{if(!isGuest27())return;const t=e.target.closest('#botFab,#btnBot,.botfab,[data-openbot],#ruthyFab,.yamifab');if(t){e.preventDefault();e.stopImmediatePropagation();guestYami27();}},true);
/* ---------- 👀 מעקב אנונימי: מזהה אקראי של המכשיר ---------- */
function guestId27(){let id='';try{id=localStorage.getItem('yam_guest_id')||'';}catch(e){}if(!/^[0-9a-f-]{36}$/.test(id)){id=(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g,()=>(Math.random()*16|0).toString(16)));try{localStorage.setItem('yam_guest_id',id);}catch(e){}}return id;}
async function guestPing27(){if(!sb||!isGuest27())return;let last=0;try{last=+localStorage.getItem('yam_guest_ping')||0;}catch(e){}if(Date.now()-last<30*60000)return;
  try{await sb.rpc('guest_ping',{p_id:guestId27()});localStorage.setItem('yam_guest_ping',String(Date.now()));}catch(e){}}
async function guestConvert27(){let id='';try{id=localStorage.getItem('yam_guest_id')||'';}catch(e){}if(!id||!sb||!authUser)return;let done='';try{done=localStorage.getItem('yam_guest_conv')||'';}catch(e){}if(done===id)return;
  try{const {error}=await sb.rpc('guest_converted',{p_id:id});if(!error)localStorage.setItem('yam_guest_conv',id);}catch(e){}}
(function(){const g=$27('#btnGuest');if(!g)return;const o=g.onclick;g.onclick=function(){const r=o&&o.apply(this,arguments);guestId27();guestPing27();return r;};})();
const _v27After=afterEnter;afterEnter=function(){const r=_v27After.apply(this,arguments);guestPing27();return r;};
const _v27Signed=onSignedIn;onSignedIn=async function(){const wasGuest=!!(state.user&&state.user.guest);const r=await _v27Signed.apply(this,arguments);if(wasGuest||localStorage.getItem('yam_guest_id'))setTimeout(guestConvert27,1500);return r;};
/* בבק אופיס: 👀 ניסיון בלי הרשמה */
/* מוסיף לבק אופיס — רץ כשהבק אופיס נטען (js/lazy.js) */
window.boReady(()=>{
try{const nav=$27('#boNav');if(nav&&!nav.querySelector('[data-s="guests"]')){const b=document.createElement('button');b.dataset.s='guests';b.textContent='👀 ניסיון בלי הרשמה';const after=nav.querySelector('[data-s="referrals"]')||nav.querySelector('[data-s="users"]');if(after)after.after(b);else nav.appendChild(b);}
  window.boView&&window.boView('guests',async function(){const m=$27('#boMain');const {data,error}=await sb.rpc('admin_guest_stats');
    if(error||!data){m.innerHTML='<div class="card">⚠️ '+esc(error?error.message:'')+' — צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)</div>';return;}
    const pct=data.total?Math.round(100*data.converted/data.total):0;const when=t=>t?esc(new Date(t).toLocaleDateString('he-IL')+' '+new Date(t).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})):'';
    const tile=(n,l)=>'<div class="v26card" style="text-align:center;flex:1;min-width:120px"><div class="v26big" style="font-size:26px">'+n+'</div><small>'+l+'</small></div>';
    m.innerHTML='<div class="card"><h2>👀 ניסיון בלי הרשמה</h2><p class="muted">מי שלוחץ "לנסות קודם בלי הרשמה" נספר לפי מזהה אקראי של המכשיר בלבד — בלי שם, מייל או כתובת. כשהוא נרשם, רואים כאן מי הוא.</p>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+tile(data.total,'ניסו בסך הכל')+tile(data.d7,'ב-7 הימים האחרונים')+tile(data.d30,'ב-30 הימים האחרונים')+tile(data.returned,'חזרו יותר מפעם אחת')+tile(data.converted+' ('+pct+'%)','נרשמו אחר כך')+'</div></div>'+
      ((data.list||[]).length?'<div class="card"><h2>✅ נרשמו אחרי ניסיון</h2><div class="tw" tabindex="0" role="region" aria-label="טבלה"><table><thead><tr><th>מי</th><th>התחיל לנסות</th><th>נרשם</th><th>ביקורים</th></tr></thead><tbody>'+
        data.list.map(r=>'<tr><td><b>'+esc(r.name||'—')+'</b><br><small class="muted" dir="ltr">'+esc(r.email)+'</small></td><td>'+when(r.first_at)+'</td><td>'+when(r.converted_at)+'</td><td>'+(r.visits||1)+'</td></tr>').join('')+'</tbody></table></div></div>':'<div class="card muted">עוד אף אחד לא נרשם אחרי ניסיון.</div>');});
  const g=[...document.querySelectorAll('#boNav .bogrp')].find(x=>x.querySelector('[data-s="users"]'));const gb=$27('#boNav [data-s="guests"]');const ref=g&&(g.querySelector('[data-s="referrals"]')||g.querySelector('[data-s="users"]'));if(ref&&gb&&gb.parentNode!==g)ref.after(gb);
}catch(e){console.warn('bo guests',e);}
});
/* ---------- 📣 מאיפה הגיעו המבקרים: ?src= בקישור, או האתר שממנו הגיעו (גוגל, פייסבוק...). כל מכשיר נספר פעם אחת, בלי שום פרט מזהה ---------- */
/* מאיזו אפליקציה/פלטפורמה הגיעו: אנדרואיד מוסר "android-app://<האפליקציה>", ודפדפנים בתוך אפליקציות מסמנים את עצמם */
function appSrc41(){try{const r=(window.__yamRef||document.referrer||'').toLowerCase(),ua=navigator.userAgent||'';const m=r.match(/^android-app:\/\/([a-z0-9_.]+)/);
  if(m){const k=m[1];return /whatsapp/.test(k)?'whatsapp':/telegram/.test(k)?'telegram':/facebook\.orca/.test(k)?'messenger':/facebook/.test(k)?'facebook':/instagram/.test(k)?'instagram':/com\.google\.android\.gm$/.test(k)?'gmail':/googlequicksearchbox/.test(k)?'google':/yamshopping/.test(k)?'app':('app-'+k).slice(0,40);}
  if(/Instagram/.test(ua))return 'instagram';if(/FBAN|FBAV|FB_IAB/.test(ua))return 'facebook';if(/Telegram/i.test(ua))return 'telegram';if(/\bLine\//.test(ua))return 'line';}catch(e){}return '';}
function visitSrc40(){let s='';try{const q=new URLSearchParams(location.search);s=(q.get('src')||q.get('utm_source')||(q.get('s')?'share':'')).toLowerCase();}catch(e){}
  if(/^[a-z0-9._-]{1,40}$/.test(s))return s;
  const a=appSrc41();if(a)return a;
  try{const h=document.referrer?new URL(document.referrer).hostname.toLowerCase():'';if(h&&h!==location.hostname)return /(^|\.)google\./.test(h)?'google':/(^|\.)bing\./.test(h)?'bing':/facebook\.|(^|\.)fb\./.test(h)?'facebook':/whatsapp/.test(h)?'whatsapp':/(^|\.)t\.me$|telegram/.test(h)?'telegram':('site-'+h.replace(/^www\./,'').replace(/[^a-z0-9.-]/g,'')).slice(0,40);}catch(e){}
  return 'direct';}
(function(){let had='';try{had=localStorage.getItem('yam_src')||'';}catch(e){}if(had)return;
  /* מי שכבר השתמש באתר לפני שהמעקב נוסף — לא נספר כמבקר חדש */
  const src=(state&&state.user)?'existing':visitSrc40();try{localStorage.setItem('yam_src',src);}catch(e){}
  if(src!=='existing'&&sb)try{sb.rpc('visit_src',{p_src:src}).then(()=>{},()=>{});}catch(e){}})();
async function visitSignup40(){let src='';try{src=localStorage.getItem('yam_src')||'';}catch(e){}if(!src||src==='existing'||!sb||!authUser)return;
  /* רק חשבון חדש (נוצר ביממה האחרונה) — לא מי שנכנס ממכשיר חדש לחשבון ישן */
  const made=Date.parse(authUser.created_at||'');if(!(made>Date.now()-864e5))return;let done='';try{done=localStorage.getItem('yam_src_signup')||'';}catch(e){}if(done===authUser.id)return;
  try{const {error}=await sb.rpc('visit_src_signup',{p_src:src});if(!error)localStorage.setItem('yam_src_signup',authUser.id);}catch(e){}}
{const _v40Signed=onSignedIn;onSignedIn=async function(){const r=await _v40Signed.apply(this,arguments);setTimeout(visitSignup40,2000);return r;};}
window.boAfter&&window.boAfter('guests',async main=>{if(!main||main.querySelector('#src40'))return;
  main.insertAdjacentHTML('afterbegin','<div class="card" id="src40"><h2>📣 מאיפה הגיעו המבקרים — לפי מקור / קמפיין</h2><div class="row" style="margin:4px 0 8px"><select id="src40d" style="max-width:150px"><option value="7">7 ימים</option><option value="30" selected>30 יום</option><option value="90">90 יום</option><option value="365">שנה</option></select></div><p class="muted">כל מכשיר נספר פעם אחת, בביקור הראשון — בלי שם, מייל או כתובת. כדי לדעת איזה פרסום עובד, מוסיפים לקישור <span dir="ltr">?src=</span> ושם קצר באנגלית, למשל <span dir="ltr">yamshopping.com/?src=whatsapp</span> או <span dir="ltr">?src=qr-shul</span>.</p><div id="src40b" class="muted">טוען...</div></div>');
  const box=main.querySelector('#src40b');const dSel=main.querySelector('#src40d');
  const run=async()=>{const {data,error}=await sb.rpc('admin_visit_sources',{p_days:+dSel.value||30});
  if(error){box.textContent='⚠️ צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)';return;}
  const rows=Array.isArray(data)?data:[];if(!rows.length){box.textContent='עוד אין נתונים.';return;}
  const NM={direct:'ישירות (הקלידו את הכתובת / סימנייה)',google:'גוגל',bing:'בינג',facebook:'פייסבוק',whatsapp:'וואטסאפ',telegram:'טלגרם',shared:'רשימה משותפת',share:'קישור שיתוף אישי ("שתפו אותי")',shabbat:'דף "רשימת קניות לשבת"',pesach:'דף "רשימת קניות לפסח"',chanukah:'דף "רשימת קניות לחנוכה"',purim:'דף "רשימת קניות לפורים"',roshhashana:'דף "רשימת קניות לראש השנה"',sukkot:'דף "רשימת קניות לסוכות"',mechir:'דפי המחיר לפי מוצר ועיר',prices:'דף "השוואת מחירים"',qr:'מודעת QR'};
  box.className='';box.innerHTML='<div class="tw" tabindex="0" role="region" aria-label="מקורות מבקרים"><table><thead><tr><th>מקור</th><th>מבקרים חדשים</th><th>נרשמו</th><th>פעילים אחרי שבוע</th></tr></thead><tbody>'+
    rows.map(r=>{const pct=(a,b)=>b?' <small class="muted">('+Math.round(100*a/b)+'%)</small>':'';
      return '<tr><td>'+esc(NM[r.src]||r.src)+(NM[r.src]?' <small class="muted" dir="ltr">'+esc(r.src)+'</small>':'')+'</td><td>'+(r.visits|0)+'</td><td>'+(r.signups|0)+pct(r.signups|0,r.visits|0)+'</td><td>'+((r.week_old|0)?(r.active7|0)+' מתוך '+(r.week_old|0)+pct(r.active7|0,r.week_old|0):'<span class="muted">—</span>')+'</td></tr>';}).join('')+'</tbody></table></div>'+
    '<p class="muted" style="margin-top:6px">"פעילים אחרי שבוע" — מתוך מי שנרשם לפני יותר משבוע, כמה עוד נכנסו לאתר שבוע אחרי ההרשמה. כך רואים איזה פרסום מביא אנשים שנשארים.</p>';};
  dSel.onchange=run;await run();});
/* ---------- ⚠️ אלרגיות בבית: בוחרים פעם אחת, ובכל סריקת ברקוד מקבלים אזהרה ---------- */
const ALG27=['גלוטן','חלב','ביצים','אגוזים','בוטנים','סויה','שומשום','דגים','רכיכות','סלרי','חרדל','תורמוס','סולפיטים'];
const myAlg27=()=>{try{return Array.isArray(meData().allergies)?meData().allergies:[];}catch(e){return [];}};
function openAllergies27(){const cur=new Set(myAlg27());
  const b=openSheet('⚠️ '+T('אלרגיות ורגישויות בבית','Household allergies'),'<p class="muted-note">'+T('מסמנים למה יש רגישות אצלכם בבית. כשסורקים ברקוד של מוצר (📷), האתר בודק במאגר הפתוח Open Food Facts ומתריע אם המוצר מכיל משהו מזה.','Mark your household allergies. When you scan a barcode, we check Open Food Facts and warn you.')+'</p>'+
    '<div class="v26card" role="group" aria-label="'+T('אלרגנים','Allergens')+'">'+ALG27.map(a=>'<label class="check" style="display:inline-flex;min-width:120px;margin:4px 8px 4px 0"><input type="checkbox" data-a27="'+esc(a)+'"'+(cur.has(a)?' checked':'')+'> '+esc(a)+'</label>').join('')+'</div>'+
    '<div class="row2"><button id="al27save">💾 '+T('שמירה','Save')+'</button><button class="btn sec" id="al27scan">📷 '+T('לסרוק מוצר ולבדוק','Scan a product')+'</button></div>'+
    '<p class="muted-note">ℹ️ '+T('המידע מגיע מהמאגר הפתוח ועלול להיות חסר — תמיד לקרוא גם את התווית על האריזה.','Data may be incomplete — always read the label.')+'</p>');
  b.querySelector('#al27save').onclick=()=>{meData().allergies=[...b.querySelectorAll('[data-a27]:checked')].map(x=>x.dataset.a27);meSave();flash('⚠️ '+T('נשמר','Saved'));closeSheet();};
  b.querySelector('#al27scan').onclick=()=>{closeSheet();openBarcodeScanner(code=>lookupBarcode(code));};}
/* בכרטיס Open Food Facts: אזהרה אדומה כשיש התאמה לאלרגיות של הבית */
const _v27Card=offCard;offCard=function(o){let h=_v27Card.apply(this,arguments);try{const hit=(o.allergens||[]).filter(a=>myAlg27().includes(a));
  if(hit.length)h='<div role="alert" style="background:#fde2e1;color:#7a1712;border:2px solid #c0392b;border-radius:12px;padding:10px 12px;margin:8px 0;font-weight:700">⛔ '+T('שימו לב: המוצר מכיל ','Warning: contains ')+esc(hit.join(', '))+' — '+T('יש בבית רגישות לזה','someone at home is sensitive to it')+'</div>'+h;
  else if(myAlg27().length&&o.allergens)h+='<small class="muted-note">✅ '+T('לפי המאגר — בלי '+myAlg27().join(', '),'Per the database — none of: '+myAlg27().join(', '))+'</small>';}catch(e){}return h;};
add26('miAlg27','⚠️','אלרגיות בבית ובדיקת מוצר','Household allergies','miShop26',openAllergies27);
yamiStep(async raw=>{const t=String(raw||'').trim();if(/^(אלרגיות|אלרגנים|רגישויות|אלרגיה|בדיקת אלרגנים)$/.test(t)||/(יש|מכיל)\s+בזה\s+(בוטנים|גלוטן|חלב|ביצים|אגוזים|שומשום|סויה)/.test(t)){
  botSay('⚠️ '+T('פתחתי את "אלרגיות בבית" — מסמנים פעם אחת, ובכל סריקת ברקוד אתריע אם המוצר מכיל משהו מזה.','Opened household allergies.'));openAllergies27();return true;}return false;});
/* באזור האישי — קישור מהיר */
const _v27RenderMe=renderMe;renderMe=function(){const r=_v27RenderMe.apply(this,arguments);try{if(meTab==='info'){const b=$27('#meBody');if(b&&!b.querySelector('#me27alg')){const a=myAlg27();
  const anchor=b.querySelector('#me26inv');const html='<div class="mecard" id="me27alg"><h4>⚠️ '+T('אלרגיות בבית','Household allergies')+'</h4><p style="margin:4px 0">'+(a.length?esc(a.join(', ')):T('לא סומנו','None marked'))+'</p><button class="btn sec" id="me27a">'+T('עריכה','Edit')+'</button></div>';
  if(anchor)anchor.insertAdjacentHTML('afterend',html);else b.insertAdjacentHTML('afterbegin',html);b.querySelector('#me27a').onclick=()=>{$27('#meOverlay').classList.remove('open');openAllergies27();};}}}catch(e){}return r;};
