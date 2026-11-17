
/* ================= v41: 📣 מי נכנס ומאיפה (שם, פלטפורמה, הקישור המדויק והדף שממנו הגיעו) · 👮 הרשאות לכל איש צוות · 🛎️ התראות לצוות בלי תוסף ================= */
try{
const $41=s=>document.querySelector(s);
const when41=t=>{if(!t)return '';const d=new Date(t);return d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric'})+' '+d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});};
const SRC41={direct:'ישירות / קישור בלי מקור',google:'גוגל',bing:'בינג',facebook:'פייסבוק',instagram:'אינסטגרם',messenger:'מסנג׳ר',whatsapp:'וואטסאפ',telegram:'טלגרם',gmail:'ג׳ימייל',line:'Line',app:'האפליקציה שלנו',shared:'רשימה משותפת',shabbat:'דף "רשימת קניות לשבת"',pesach:'דף "רשימת קניות לפסח"',chanukah:'דף "רשימת קניות לחנוכה"',prices:'דף "השוואת מחירים"',qr:'מודעת QR'};
const ICON41={whatsapp:'💬',google:'🔎',facebook:'📘',instagram:'📸',telegram:'✈️',gmail:'✉️',direct:'🔗',app:'📱'};
function srcName41(s){s=s||'direct';if(SRC41[s])return (ICON41[s]||'📣')+' '+SRC41[s];if(/^site-/.test(s))return '🌐 '+s.slice(5);if(/^app-/.test(s))return '📱 '+s.slice(4);return '📣 '+s;}
window.srcName41=srcName41;

/* ---------- 1. רישום כניסה: הקישור המדויק (רק פרמטרים בטוחים — בלי קודי הצטרפות או סיסמאות), הדף שממנו הגיעו, ומכשיר ---------- */
const KEEP41=['src','utm_source','utm_medium','utm_campaign','utm_content','utm_term','tab'];
function landing41(){try{const u=new URL(window.__yamLand||location.href);const q=new URLSearchParams();KEEP41.forEach(k=>{const v=u.searchParams.get(k);if(v)q.set(k,v.slice(0,60));});
  const h=/^#(store-|p=|prices|cloth=|cshop=)/.test(u.hash)?u.hash.slice(0,120):'';return (u.origin+u.pathname+(q.toString()?'?'+q:'')+h).slice(0,400);}catch(e){return '';}}
function referrer41(){const r=window.__yamRef||'';try{if(!r)return '';const u=new URL(r);if(u.hostname===location.hostname)return '';
  /* הדף שבו היה הקישור — בלי פרמטרים אישיים של האתר ההוא */
  return (/^android-app:/.test(r)?r:(u.origin+u.pathname)).slice(0,400);}catch(e){return '';}}
function device41(){const ua=navigator.userAgent||'';const tab=/iPad|Tablet/i.test(ua)||(/Android/.test(ua)&&!/Mobile/.test(ua))||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  const kind=tab?'טאבלט':/Mobi|iPhone|Android/.test(ua)?'טלפון':'מחשב';
  const os=/Android/.test(ua)?'Android':/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?'iOS':/Windows/.test(ua)?'Windows':/Mac OS X/.test(ua)?'Mac':/CrOS/.test(ua)?'ChromeOS':/Linux/.test(ua)?'Linux':'';
  const br=/FBAN|FBAV|FB_IAB/.test(ua)?'דפדפן פייסבוק':/Instagram/.test(ua)?'דפדפן אינסטגרם':/SamsungBrowser/.test(ua)?'Samsung':/Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox|FxiOS/.test(ua)?'Firefox':/Chrome|CriOS/.test(ua)?'Chrome':/Safari/.test(ua)?'Safari':'';
  let app='';try{if(matchMedia('(display-mode: standalone)').matches||navigator.standalone)app='מהאייקון';}catch(e){}
  return [kind,os,br,app].filter(Boolean).join(' · ');}
function src41(){try{const u=new URL(window.__yamLand||location.href);const s=(u.searchParams.get('src')||u.searchParams.get('utm_source')||'').toLowerCase();if(/^[a-z0-9._-]{1,40}$/.test(s))return s;}catch(e){}
  return typeof visitSrc40==='function'?visitSrc40():'direct';}
async function visitPing41(){if(!sb)return;const who=authUser?authUser.id:'anon';let done='';try{done=sessionStorage.getItem('yam_vp41')||'';}catch(e){}
  if(done===who||(done&&done!=='anon'&&who==='anon'))return;
  try{const {error}=await sb.rpc('visit_ping',{p_src:src41(),p_landing:landing41(),p_referrer:referrer41(),p_device:device41()});if(!error)sessionStorage.setItem('yam_vp41',who);}catch(e){}}
setTimeout(visitPing41,5000);
{const _v41Signed=onSignedIn;onSignedIn=async function(){const r=await _v41Signed.apply(this,arguments);setTimeout(visitPing41,2500);setTimeout(staffBell41,3000);return r;};}

/* ---------- 2. בבק אופיס ← 👀 מבקרים: מי נכנס, מאיזו פלטפורמה, מאיזה קישור ומאיזה דף ---------- */
window.boAfter&&window.boAfter('guests',async main=>{if(!main||main.querySelector('#vis41'))return;
  const card=document.createElement('div');card.className='card';card.id='vis41';
  card.innerHTML='<h2>👤 מי נכנס ומאיפה</h2><p class="muted">כל כניסה לאתר (פעם בחצי שעה לכל אדם): מי זה, מאיזו פלטפורמה הגיע, הקישור המדויק שלחץ עליו והדף שבו היה הקישור. אורח שלא נרשם מופיע בלי שם.'+(permOk('emails')?'':' המיילים מוסתרים — רק שמות.')+'</p>'+
    '<p class="muted">💡 וואטסאפ, טלגרם ורוב האפליקציות לא מוסרים מאיזו קבוצה או שיחה לחצו. גוגל מוסר רק "גוגל", בלי מה חיפשו. כדי לדעת בדיוק — משתפים כל מקום עם קישור משלו, למשל <span dir="ltr">yamshopping.com/?src=wa-group-beitar</span>. מה שבא אחרי <span dir="ltr">?src=</span> יופיע כאן כמקור.</p>'+
    '<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px"><select id="vis41d" style="max-width:150px"><option value="1">היום</option><option value="7" selected>7 ימים</option><option value="30">30 יום</option><option value="90">90 יום</option></select>'+
    '<select id="vis41k" style="max-width:190px"><option value="">כולם</option><option value="users">👋 רק משתמשים קיימים שחזרו</option><option value="signup">🎉 רק מי שהצטרף עכשיו</option><option value="guests">רק אורחים</option></select><select id="vis41s" style="max-width:220px"><option value="">כל המקורות</option></select><input id="vis41q" placeholder="חיפוש שם" style="max-width:180px"></div>'+
    '<div id="vis41b" class="muted">טוען...</div>';
  const after=main.querySelector('#src40');if(after)after.after(card);else main.prepend(card);
  let rows=[];
  const draw=()=>{const k=$41('#vis41k').value,sv=$41('#vis41s').value,q=$41('#vis41q').value.trim();
    const list=rows.filter(r=>(!k||(k==='users'&&r.user_id&&r.kind==='visit')||(k==='signup'&&r.kind==='signup')||(k==='guests'&&!r.user_id))&&(!sv||r.src===sv)&&(!q||(r.name||'').includes(q)||(r.email||'').includes(q)));
    const box=$41('#vis41b');if(!list.length){box.className='muted';box.textContent='אין כניסות בטווח הזה.';return;}
    const link=u=>u?'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" dir="ltr" style="overflow-wrap:anywhere">'+esc(u.replace(/^https?:\/\//,''))+'</a>':'<span class="muted">—</span>';
    const ref=u=>!u?'<span class="muted">לא נמסר</span>':/^android-app:/.test(u)?'📱 אפליקציה: <span dir="ltr">'+esc(u.replace(/^android-app:\/\//,''))+'</span>':link(u);
    box.className='';box.innerHTML='<div class="tw" tabindex="0" role="region" aria-label="כניסות"><table><thead><tr><th>מתי</th><th>מי</th><th>מאיפה (פלטפורמה)</th><th>הקישור שנכנסו אליו</th><th>הדף שבו היה הקישור</th><th>מכשיר</th></tr></thead><tbody>'+
      list.map(r=>'<tr><td style="white-space:nowrap">'+when41(r.at)+'</td><td>'+(r.user_id?'<b>'+esc(r.name||'משתמש/ת')+'</b>'+(r.kind==='signup'?' <span class="pill">🎉 הצטרף/ה עכשיו</span>':' <span class="pill">👋 חזר/ה</span>')+(r.email?'<br><small class="muted" dir="ltr">'+esc(r.email)+'</small>':''):'<span class="muted">אורח/ת (לא רשום)</span>')+'</td><td>'+esc(srcName41(r.src))+'</td><td>'+link(r.landing)+'</td><td>'+ref(r.referrer)+'</td><td><small>'+esc(r.device||'')+'</small></td></tr>').join('')+'</tbody></table></div>'+
      '<p class="muted" style="margin-top:6px">'+list.length+' כניסות · '+new Set(list.filter(r=>r.user_id).map(r=>r.user_id)).size+' אנשים רשומים</p>';};
  const load=async()=>{const d=+(card.querySelector('#vis41d')||{}).value||7;const {data,error}=await sb.rpc('staff_visits',{p_since:new Date(Date.now()-d*864e5).toISOString(),p_limit:2000});
    /* עברו למסך אחר בזמן הטעינה — המסך הזה כבר לא מוצג */
    if(!card.isConnected)return;
    if(error){$41('#vis41b').textContent='⚠️ '+(/forbidden|42501/.test(error.message)?'אין לך הרשאה לראות כניסות':'צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)');return;}
    rows=data||[];const ss=$41('#vis41s'),cv=ss.value;ss.innerHTML='<option value="">כל המקורות</option>'+[...new Set(rows.map(r=>r.src||'direct'))].map(s=>'<option value="'+esc(s)+'"'+(s===cv?' selected':'')+'>'+esc(srcName41(s))+'</option>').join('');draw();};
  $41('#vis41d').onchange=load;$41('#vis41k').onchange=draw;$41('#vis41s').onchange=draw;$41('#vis41q').oninput=draw;
  /* לחיצה על מקור בטבלה למעלה — מסננת את הרשימה לפי המקור הזה */
  const st=main.querySelector('#src40');if(st)st.addEventListener('click',e=>{const tr=e.target.closest('tbody tr');if(!tr)return;const sm=tr.querySelector('small[dir="ltr"]');const raw=sm?sm.textContent.trim():tr.cells[0].textContent.trim();
    const ss=$41('#vis41s');if([...ss.options].some(o=>o.value===raw)){ss.value=raw;draw();card.scrollIntoView({behavior:'smooth',block:'start'});}});
  await load();});
/* שם הלשונית: מבקרים ומקורות */
try{const gb=$41('#boNav [data-s="guests"]');if(gb)gb.textContent='👀 מבקרים — מי ומאיפה';}catch(e){}

/* ---------- 3. 👮 הרשאות לכל איש צוות (רק הבעלים) ---------- */
const MODTABS41=['pending','bot','chains','prices','reporters','posts','reviews','products','clothing','guests'];
const PERM41=[['visitors','👀 לראות מי נכנס ומאיפה (שמות, מקור, קישור)'],['notify','🛎️ לקבל התראות על כניסות והרשמות'],['emails','✉️ לראות מיילים של משתמשים'],['delete_users','🗑️ למחוק משתמשים']];
/* מה שרק "מנהל" יכול: אם מסמנים אחד מאלה לצוות פיקוח — הוא עובר אוטומטית לתפקיד מנהל (עם רק מה שסומן) */
const ADMONLY41=k=>k==='delete_users'||(k!=='visitors'&&k!=='notify'&&k!=='emails'&&!MODTABS41.includes(k));
function permEditor41(x,pr){const p=pr||{};const isMod=x.role==='moderator';
  const def={visitors:true,notify:true,emails:!isMod,delete_users:!isMod};
  const val=k=>typeof p[k]==='boolean'?p[k]:def[k];
  const navBtns=[...document.querySelectorAll('#boNav button[data-s]')].map(b=>[b.dataset.s,b.textContent.trim()]).filter(([s])=>s!=='dash'&&s!=='staff'&&s!=='staffact');
  const tabs=Array.isArray(p.tabs)?p.tabs:null;
  const tabOn=s=>tabs?tabs.includes(s):(!isMod||MODTABS41.includes(s));
  const lock=k=>ADMONLY41(k)?' <small class="muted" title="מסמנים — והוא יעבור לתפקיד מנהל">🔑</small>':'';
  return '<div class="card" id="perm41" data-u="'+esc(x.user_id)+'" data-mail="'+esc(x.email)+'" data-role="'+esc(x.role)+'"><h2>⚙️ הרשאות: '+esc(x.name||x.email)+' <small class="muted">(עכשיו: '+(isMod?'צוות פיקוח':'מנהל')+')</small></h2>'+
    '<p class="muted">מסמנים בדיוק מה מותר לו. מה שמסומן ב-🔑 הוא של מנהל: אם מסמנים אותו — התפקיד עובר אוטומטית ל"מנהל", והוא עדיין יראה רק את מה שסימנת. אם לא מסומן אף 🔑 — הוא נשאר / חוזר להיות "צוות פיקוח".</p>'+
    '<h3 style="margin:10px 0 4px">מה הוא רואה ועושה</h3>'+PERM41.map(([k,l])=>'<label class="check" style="display:flex;gap:6px;align-items:center;margin:4px 0"><input type="checkbox" data-pk41="'+k+'"'+(val(k)?' checked':'')+'> '+l+lock(k)+'</label>').join('')+
    '<h3 style="margin:12px 0 4px">אילו לשוניות בבק אופיס</h3>'+
    '<div id="pt41list" style="display:flex;flex-wrap:wrap;gap:4px 14px;margin:6px 0 10px">'+navBtns.map(([s,l])=>'<label class="check" style="display:inline-flex;gap:4px;align-items:center;min-width:170px"><input type="checkbox" data-pt41="'+esc(s)+'"'+(tabOn(s)?' checked':'')+'> '+esc(l)+lock(s)+'</label>').join('')+'</div>'+
    '<div class="row" style="gap:6px;margin-bottom:8px"><button class="btn sm sec" type="button" id="p41all">✔️ לסמן הכל</button><button class="btn sm sec" type="button" id="p41none">✖ לנקות הכל</button></div>'+
    '<p class="muted">📊 "סקירה" תמיד פתוחה. מיילים, מחיקת משתמשים וכניסות נחסמים גם בשרת.</p>'+
    '<div class="row"><button class="btn" id="p41save">💾 שמירה</button><button class="btn sec" id="p41reset">↩️ ברירת המחדל של התפקיד</button><button class="btn sec" id="p41x">סגירה</button></div></div>';}
window.boAfter&&window.boAfter('staff',async main=>{if(!main||!isOwner())return;
  const [{data:list},{data:pl,error}]=await Promise.all([sb.rpc('staff_list'),sb.rpc('staff_perms_list')]);if(error)return;
  const P={};(pl||[]).forEach(r=>{P[r.user_id]=r;});
  const intro=main.querySelector('.card .muted');if(intro&&!intro.querySelector('.p41n'))intro.insertAdjacentHTML('beforeend','<br><span class="p41n">⚙️ <b>הרשאות</b> — לכל איש צוות אפשר לבחור בדיוק מה הוא רואה ומה הוא עושה (כפתור ⚙️ בשורה שלו).</span>');
  main.querySelectorAll('tr[data-id]').forEach(tr=>{const td=tr.lastElementChild;if(td&&!td.querySelector('[data-p41]'))td.insertAdjacentHTML('afterbegin','<button class="btn sm sec" data-p41="'+esc(tr.dataset.id)+'">⚙️ הרשאות</button> ');
    const pr=(P[tr.dataset.id]||{}).perms||{};if(Object.keys(pr).length&&tr.children[0]&&!tr.children[0].querySelector('.p41c'))tr.children[0].insertAdjacentHTML('beforeend',' <small class="pill p41c">הרשאות מותאמות</small>');});
  /* הנתונים מתעדכנים בכל טעינה של המסך — המאזין נרשם פעם אחת וקורא תמיד את העדכני */
  main._p41d={list:list||[],P};
  if(main._p41)return;main._p41=1;
  main.addEventListener('click',async e=>{const {list,P}=main._p41d||{list:[],P:{}};const b=e.target.closest('[data-p41],#p41save,#p41reset,#p41x,#p41all,#p41none');if(!b)return;e.stopPropagation();
    if(b.id==='p41all'||b.id==='p41none'){$41('#perm41').querySelectorAll('[data-pt41]').forEach(c=>{c.checked=b.id==='p41all';});return;}
    if(b.dataset.p41){const x=(list||[]).find(y=>y.user_id===b.dataset.p41);if(!x)return;const old=$41('#perm41');if(old)old.remove();
      main.insertAdjacentHTML('beforeend',permEditor41(x,(P[x.user_id]||{}).perms));$41('#perm41').scrollIntoView({behavior:'smooth',block:'start'});return;}
    const ed=$41('#perm41');if(!ed)return;const uid=ed.dataset.u;
    if(b.id==='p41x'){ed.remove();return;}
    let perms={};
    if(b.id==='p41save'){ed.querySelectorAll('[data-pk41]').forEach(c=>{perms[c.dataset.pk41]=c.checked;});
      perms.tabs=[...ed.querySelectorAll('[data-pt41]:checked')].map(c=>c.dataset.pt41);
      /* התפקיד נקבע לפי מה שסומן: משהו של מנהל → מנהל; אחרת → צוות פיקוח */
      const want=(perms.delete_users||perms.tabs.some(ADMONLY41))?'admin':'moderator';
      if(want!==ed.dataset.role){const {data:rr,error:re}=await sb.rpc('staff_add',{p_email:ed.dataset.mail,p_role:want});
        if(re||rr!=='ok'){flash('⚠️ '+(re?re.message:rr));return;}flash(want==='admin'?'🔑 עבר לתפקיד מנהל':'👮 עבר לתפקיד צוות פיקוח');}
      if(want==='moderator')perms.delete_users=false;}
    const {data:r,error:er}=await sb.rpc('staff_perms_set',{p_user:uid,p_perms:perms});
    if(er||r!=='ok'){flash('⚠️ '+(er?er.message:r));return;}flash(b.id==='p41save'?'✔️ ההרשאות נשמרו — יחולו אצלו בכניסה הבאה לבק אופיס':'↩️ חזר לברירת המחדל');window.boShow&&window.boShow('staff');},true);});
/* משתמשים: מי שאין לו הרשאת מחיקה — בלי כפתור מחיקה */
window.boAfter&&window.boAfter('users',async main=>{if(main&&!permOk('delete_users'))main.querySelectorAll('[data-ua="del"]').forEach(b=>b.remove());});
/* התראות לטלפון: סוג חדש לצוות — כניסות והרשמות */
if(typeof pushCardHtml==='function'&&typeof PUSH_KINDS!=='undefined'){const _p41=pushCardHtml;pushCardHtml=function(){const want=isStaff()&&permOk('visitors')&&permOk('notify');
  /* שתי התראות נפרדות: 🎉 משתמש חדש שהצטרף עכשיו · 👋 משתמש קיים שחזר לאתר */
  [['signups','🎉','משתמשים חדשים שהצטרפו עכשיו (לצוות)'],['visits','👋','משתמשים קיימים שחזרו לאתר (לצוות)']].forEach(k=>{const i=PUSH_KINDS.findIndex(x=>x[0]===k[0]);
    if(want&&i<0)PUSH_KINDS.push(k);if(!want&&i>=0)PUSH_KINDS.splice(i,1);});return _p41.apply(this,arguments);};}

/* ---------- 4. 🛎️ התראות לצוות בתוך האתר — בלי תוסף, גם בטאבלט ובטלפון ---------- */
let bell41=null,feed41=[],poll41=null,since41=null;
const seen41=()=>{try{return +localStorage.getItem('yam_sb41_seen')||0;}catch(e){return 0;}};
const KIND41={visit:'👋',signup:'🎉',recipe:'📝',bot:'🤖',chain:'🏪',branch:'📍',price:'💰',post:'📣',torah:'📜',review:'⭐',flag:'⚠️',chat:'💬',bizreq:'🏪',message:'📨',feedback:'💌',user:'🙋',error:'🐞'};
function bellDraw41(){if(!bell41)return;const s=seen41();const n=feed41.filter(x=>+new Date(x.at)>s).length;const c=bell41.querySelector('b');c.hidden=!n;c.textContent=n>99?'99+':n;}
function bellPanel41(){const old=$41('#sbp41');if(old){old.remove();return;}const s=seen41();
  const p=document.createElement('div');p.id='sbp41';p.setAttribute('role','dialog');p.setAttribute('aria-label','התראות צוות');
  p.innerHTML='<div class="sbp41h"><b>🛎️ מה חדש באתר</b><button aria-label="סגירה" data-x>✕</button></div>'+
    (feed41.length?feed41.slice(0,80).map(x=>'<button class="sbp41i'+(+new Date(x.at)>s?' new':'')+'" data-go="'+(x.kind==='visit'||x.kind==='signup'?'guests':'pending')+'"><span>'+(KIND41[x.kind]||'🔔')+'</span><span><b>'+esc(x.title)+'</b>'+(x.detail?'<br><small>'+esc(x.detail)+'</small>':'')+'<br><small class="muted">'+when41(x.at)+'</small></span></button>').join(''):'<p class="muted" style="padding:10px">אין חדש ב-24 השעות האחרונות.</p>')+
    '<div class="sbp41f"><button class="btn sm sec" data-push>📲 התראות גם כשהאתר סגור</button><button class="btn sm sec" data-bo>🏢 לבק אופיס</button></div>';
  document.body.appendChild(p);try{localStorage.setItem('yam_sb41_seen',String(Date.now()));}catch(e){}bellDraw41();
  p.onclick=async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.x!==undefined){p.remove();return;}
    if(b.dataset.push!==undefined){if(typeof pushEnable==='function'){const ok1=await pushEnable();if(ok1)flash('📲 מעכשיו תקבל התראה על כניסות והרשמות גם כשהאתר סגור (אפשר לכבות בפעמון 🔔)');}return;}
    p.remove();window.openBO&&window.openBO(b.dataset.go||'dash');};}
async function bellPoll41(first){if(!sb||!isStaff()||document.hidden&&!first)return;
  const from=since41||new Date(Date.now()-864e5).toISOString();const now=new Date().toISOString();const got=[];
  if(permOk('visitors')){try{const {data}=await sb.rpc('staff_visits',{p_since:from,p_limit:200});(data||[]).forEach(r=>{
    if(r.kind==='visit'&&!r.user_id)got.push({kind:'visit',at:r.at,title:'אורח/ת נכנס/ה',detail:srcName41(r.src)+(r.device?' · '+r.device:''),anon:1});
    else got.push({kind:r.kind,at:r.at,title:(r.name||'משתמש/ת')+(r.kind==='signup'?' — משתמש/ת חדש/ה, הצטרף/ה עכשיו':' — משתמש/ת קיים/ת, חזר/ה לאתר'),detail:srcName41(r.src)+(r.device?' · '+r.device:'')});});}catch(e){}}
  try{const {data}=await sb.rpc('staff_events',{p_since:from});(data||[]).forEach(r=>{if(r.kind==='user'||r.kind==='visit'||r.kind==='signup')return;got.push({kind:r.kind,at:r.created_at,title:r.title||'',detail:(r.who?r.who+' · ':'')+String(r.detail||'').slice(0,120)});});}catch(e){}
  since41=now;const keyOf=x=>x.kind+'|'+x.at+'|'+x.title;const have=new Set(feed41.map(keyOf));const fresh=got.filter(x=>!have.has(keyOf(x)));
  feed41=fresh.concat(feed41).sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,200);bellDraw41();
  if(first)return;const s=seen41();const named=fresh.filter(x=>!x.anon&&+new Date(x.at)>s);
  if(named.length){const t=named.length===1?(KIND41[named[0].kind]||'🔔')+' '+named[0].title+' · '+named[0].detail:'🛎️ '+named.length+' דברים חדשים באתר';flash(t);
    if(document.hidden&&'Notification' in window&&Notification.permission==='granted'&&!(typeof pushState!=='undefined'&&pushState.sub)){try{const r=await navigator.serviceWorker.ready;r.showNotification('ים שופינג — צוות',{body:t,tag:'staff41',icon:'/icons/app-192.png'});}catch(e){}}}}
function staffBell41(){if(!sb||!isStaff()||!permOk('notify')){if(bell41){bell41.remove();bell41=null;}clearInterval(poll41);poll41=null;return;}
  if(!bell41){const st=document.createElement('style');st.textContent='#sb41{position:relative;font-size:18px}'+
    '#sb41 b{position:absolute;top:-4px;inset-inline-end:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#c62828;color:#fff;font-size:12px;line-height:20px}'+
    '#sbp41{position:fixed;inset-inline-start:12px;top:64px;z-index:9001;width:min(400px,calc(100vw - 24px));max-height:min(72vh,580px);overflow:auto;overscroll-behavior:contain;background:var(--panel,#fff);color:var(--text,#1d2939);border:1px solid var(--line,#e8e3d8);border-radius:16px;box-shadow:0 12px 34px rgba(13,17,24,.28)}'+
    'body.dark #sbp41{box-shadow:0 12px 34px rgba(0,0,0,.6)}'+
    '.sbp41h{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;position:sticky;top:0;z-index:1;background:#1e3a5f;color:#fff;font-size:15px}.sbp41h button{border:0;background:none;font-size:18px;line-height:1;padding:4px 6px;border-radius:8px;cursor:pointer;color:inherit}.sbp41h button:hover{background:rgba(255,255,255,.14)}'+
    'body.dark .sbp41h{background:#12161d;border-bottom:1px solid var(--line,#2a303b)}'+
    '.sbp41i{display:flex;gap:10px;width:100%;text-align:start;border:0;border-bottom:1px solid var(--line,#e8e3d8);background:none;padding:10px 14px;cursor:pointer;color:inherit;font:inherit;line-height:1.45}.sbp41i:hover{background:var(--chat,#f6f3ec)}.sbp41i b{color:var(--text,#1d2939)}.sbp41i small{overflow-wrap:anywhere;color:var(--muted,#5b6370)}.sbp41i.new{background:rgba(30,58,95,.07);box-shadow:inset -3px 0 0 #1e3a5f}body.dark .sbp41i.new{background:rgba(157,184,224,.1);box-shadow:inset -3px 0 0 #9db8e0}'+
    '.sbp41f{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;position:sticky;bottom:0;background:inherit;border-top:1px solid var(--line,#e8e3d8)}';document.head.appendChild(st);
    bell41=document.createElement('button');bell41.id='sb41';bell41.title='מה חדש באתר (לצוות)';bell41.setAttribute('aria-label','התראות צוות');bell41.innerHTML='🛎️<b hidden></b>';bell41.onclick=bellPanel41;bell41.className='hbtn';const hb41=document.querySelector('#btnBell');if(hb41)hb41.parentNode.insertBefore(bell41,hb41);else document.body.appendChild(bell41);}
  if(!poll41){bellPoll41(true);poll41=setInterval(()=>bellPoll41(false),60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)bellPoll41(false);});}}
/* ---------- 5. 🕵️ פעולות הצוות — הבעלים רואה כל מה שכל איש צוות עשה ופתח ---------- */
/* כל מסך בבק אופיס שאיש צוות פותח נרשם ביומן הפעולות */
try{[...document.querySelectorAll('#boNav button[data-s]')].map(b=>b.dataset.s).concat(['staffact']).forEach(k=>window.boAfter&&window.boAfter(k,async()=>{if(isStaff()&&!isOwner()&&typeof logAct==='function')logAct('bo_view',k);}));}catch(e){}
const TBL41={site_config:'הגדרות האתר',recipes:'מתכונים',bot_knowledge:'לימודי בוט',chains:'חנויות',branches:'סניפים',prices:'מחירים',ads:'פרסומות',site_updates:'עדכונים לאתר',staff:'צוות',store_managers:'בעלי סופרים',feedback:'הערות',store_posts:'מבצעי חנויות',divrei_torah:'דברי תורה',site_reviews:'חוות דעת',products:'מוצרים',profiles:'פרטי משתמש',user_bans:'חסימות ואזהרות',support_messages:'צ׳אט עם משתמשים',abuse_reports:'דיווחי שפה',business_requests:'בקשות הצטרפות',store_messages:'פניות לחנויות',price_sources:'מקורות מחירים',clothing_shops:'חנויות ביגוד',store_recs:'המלצות',cloth_votes:'דיווחי ביגוד',yami_notes:'הודעות יאמי',store_inventory:'מלאי חנות',biz_machines:'מכונות',client_errors:'יומן תקלות',users:'משתמשים'};
const OP41={INSERT:'➕ הוסיף',UPDATE:'✏️ שינה',DELETE:'🗑️ מחק',CONFIRM:'✅ אישר מייל'};
try{const nav=$41('#boNav');if(nav&&!nav.querySelector('[data-s="staffact"]')){const b=document.createElement('button');b.dataset.s='staffact';b.textContent='🕵️ פעולות הצוות';const st=nav.querySelector('[data-s="staff"]');if(st)st.after(b);else nav.appendChild(b);}}catch(e){}
{const _o41=window.openBO;window.openBO=async function(){const r=await _o41.apply(this,arguments);const b=$41('#boNav [data-s="staffact"]');if(b&&!isOwner())b.hidden=true;return r;};}
window.boView&&window.boView('staffact',async function(){const m=$41('#boMain');if(!isOwner()){m.innerHTML='<div class="card">⛔ רק לבעל האתר</div>';return;}
  const {data:staff}=await sb.rpc('staff_list');
  m.innerHTML='<div class="card"><h2>🕵️ פעולות הצוות</h2><p class="muted">כל מה שאנשי הצוות עשו: כל שינוי (הוספה, עריכה, מחיקה, אישור, חסימה, תשובה בצ׳אט, מחיקת משתמש) וכל מסך שפתחו בבק אופיס. שינויים אפשר לשחזר מ"💾 גיבוי והיסטוריה". נשמר עד שנה (מסכים שנפתחו — חצי שנה).</p>'+
    '<div class="row" style="flex-wrap:wrap;gap:6px"><select id="sa41u" style="max-width:220px"><option value="">כל הצוות</option>'+(staff||[]).map(x=>'<option value="'+esc(x.user_id)+'">'+esc(x.name||x.email)+' · '+(x.role==='admin'?'מנהל':'צוות פיקוח')+'</option>').join('')+'</select>'+
    '<select id="sa41d" style="max-width:140px"><option value="1">היום</option><option value="7" selected>7 ימים</option><option value="30">30 יום</option><option value="180">חצי שנה</option></select>'+
    '<select id="sa41k" style="max-width:190px"><option value="">שינויים ומסכים</option><option value="change">רק שינויים</option><option value="activity">רק מסכים ופעולות</option></select></div></div><div id="sa41b" class="card muted">טוען...</div>';
  const load=async()=>{const box=$41('#sa41b');if(!box)return;box.className='card muted';box.textContent='טוען...';
    const k=($41('#sa41k')||{}).value||'';
    const {data,error}=await sb.rpc('owner_staff_actions',{p_user:($41('#sa41u')||{}).value||null,p_days:+($41('#sa41d')||{}).value||7});
    /* עברו למסך אחר בזמן הטעינה — המסך הזה כבר לא מוצג */
    if(!box.isConnected)return;
    if(error){box.textContent='⚠️ '+(/timeout/i.test(error.message)?'הטעינה לקחה יותר מדי זמן — נסו טווח קצר יותר או איש צוות אחד':/does not exist|schema cache|PGRST202/.test(error.message)?'צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)':error.message);return;}
    const rows=(data||[]).filter(r=>!k||r.kind===k);
    if(!rows.length){box.textContent='אין פעולות בטווח הזה.';return;}
    const tabName=s=>{const b=$41('#boNav [data-s="'+s+'"]');return b?b.textContent.trim():s;};
    box.className='card';box.innerHTML='<div class="tw" tabindex="0" role="region" aria-label="פעולות הצוות"><table><thead><tr><th>מתי</th><th>מי</th><th>מה עשה</th><th>על מה</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td style="white-space:nowrap">'+when41(r.at)+'</td><td><b>'+esc(r.actor_name||'')+'</b><br><small class="muted">'+(r.role==='admin'?'מנהל':'צוות פיקוח')+'</small></td><td>'+
        (r.kind==='change'?esc((OP41[r.op]||r.op)+' · '+(TBL41[r.what]||r.what))+(r.changed?'<br><small class="muted">שדות: '+esc(r.changed)+'</small>':''):r.what==='bo_view'?'👁️ פתח מסך':'⚡ '+esc(r.what))+'</td><td style="overflow-wrap:anywhere">'+
        (r.kind==='activity'&&r.what==='bo_view'?esc(tabName(r.title)):esc(String(r.title||'').slice(0,200)))+'</td></tr>').join('')+'</tbody></table></div><p class="muted" style="margin-top:6px">'+rows.length+' פעולות</p>';};
  $41('#sa41u').onchange=load;$41('#sa41d').onchange=load;$41('#sa41k').onchange=load;await load();});
{const _v41Role=loadRole;loadRole=async function(){const r=await _v41Role.apply(this,arguments);setTimeout(staffBell41,500);return r;};}
setTimeout(staffBell41,4000);
}catch(e){console.warn('v41',e);}
