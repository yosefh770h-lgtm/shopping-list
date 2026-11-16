
/* ================= 🔗 איחוד שני חשבונות לחשבון משותף אחד =================
   א' יוצר קוד איחוד, ב' מקליד אותו — ומעכשיו שניהם רואים ועורכים את אותן רשימות, היסטוריה ו"הבית שלי" (גישה מלאה, בלי הרשאות).
   מה שהיה לב' נכנס לחשבון המשותף. החשבון הפרטי של ב' נשמר בצד, ולכן אפשר לצאת מהאיחוד בכל רגע — ולבחור אם לחזור אליו כמו שהיה
   או לקחת איתו עותק של מה שיש עכשיו בחשבון המשותף. האיחוד שמור בשרת: כל המכשירים של ב' עוברים לחשבון המשותף (ויוצאים ממנו) לבד. */
let merge20=null;
const $m20=s=>document.querySelector(s);
const initial20=n=>esc((String(n||'').trim()[0]||'?').toUpperCase());
const fmtCode20=c=>String(c||'').replace(/^(.{4})(.{4})$/,'$1-$2');
async function mergeFetch20(){
  if(!sb||!authUser)return null;
  try{const {data,error}=await sb.rpc('merge_status');if(error)return null;merge20=data||null;}catch(e){return null;}
  mergeBadge20();return merge20;}
function mergeBadge20(){
  let b=$m20('#mergeBadge20');const g=merge20&&merge20.guest;
  if(!b){const ann=$m20('#announce');if(!ann)return;b=document.createElement('button');b.id='mergeBadge20';b.className='secbadge15';b.hidden=true;b.onclick=()=>openMerge20();ann.insertAdjacentElement('beforebegin',b);}
  /* גם בעל החשבון רואה עם מי החשבון שלו משותף */
  const ps=(merge20&&merge20.partners)||[];const who=g?(g.host_name||''):ps.map(p=>p.name||'').join(', ');
  b.hidden=!who;if(who)b.textContent='🔗 '+T('חשבון משותף עם ','Shared account with ')+who;}
/* כל חיבור לענן בודק קודם בשרת אם החשבון מאוחד — ועובר לחשבון המשותף, או חוזר לחשבון הפרטי אם האיחוד הסתיים */
const _m20StartCloud=startCloud;
startCloud=async function(){
  const m=await mergeFetch20();
  if(m){const g=m.guest;
    if(g&&g.code){if(state.follow!==g.code){stopCloud();resetSynced();state.follow=g.code;}state.merge={code:g.code,host:g.host_name||''};save(true);}
    else if(state.merge){const was=state.merge;delete state.merge;if(state.follow===was.code){stopCloud();state.follow=null;resetSynced();}save(true);
      flash('🔗 '+T('האיחוד עם '+(was.host||'')+' הסתיים — חזרת לחשבון שלך','The account merge ended — back to your own account'));}}
  return _m20StartCloud.apply(this,arguments);};
/* האיחוד בוטל ממכשיר אחר / ע"י בעל החשבון — בודקים פעם בדקה */
setInterval(async()=>{if(document.hidden||!state.merge||!sb||!authUser)return;const m=await mergeFetch20();
  if(m&&!(m.guest&&m.guest.code===state.merge.code)){stopCloud();await startCloud();render();}},60000);
/* כפתור "שיתוף רשימה" הישן מנתק בלי לשאול — כשהחשבון מאוחד פותחים את מסך האיחוד */
document.addEventListener('click',e=>{if(state.merge&&e.target.closest('#cloudBtn')){e.preventDefault();e.stopImmediatePropagation();openMerge20();}},true);

const MERGE_ERR20={bad:T('הקוד לא נכון או שפג תוקפו. בקשו קוד חדש 🙂','Wrong or expired code'),self:T('זה הקוד שלך עצמך 🙂','This is your own code'),
  already:T('החשבון שלך כבר מאוחד עם חשבון אחר','Your account is already merged'),is_host:T('חשבונות אחרים מאוחדים לחשבון שלך. כדי להתאחד לחשבון אחר — קודם מבטלים אותם.','Other accounts are merged into yours'),
  limit:T('יותר מדי ניסיונות. נסו שוב בעוד שעה.','Too many tries — try again in an hour'),guest:T('החשבון שלך מאוחד לחשבון אחר — רק בעל החשבון המשותף יכול לצרף חשבונות','Only the main account can add accounts'),login:T('צריך להיות מחוברים','Sign in first')};

async function openMerge20(prefill){
  if(!sb||!authUser){flash(T('צריך להיות מחוברים לחשבון','Sign in first'));return;}
  const b=openSheet('🔗 '+T('איחוד חשבונות','Merge accounts'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');
  const m=await mergeFetch20();
  if(!m){b.innerHTML='<p class="muted-note">⚠️ '+(isAdmin()?T('צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית).','Run the SQL again.'):T('האיחוד לא זמין כרגע. נסו שוב מאוחר יותר.','Not available right now.'))+'</p>';return;}
  const me=(state.user&&state.user.name)||'';const g=m.guest,ps=m.partners||[];
  const hero=(a,bn,on)=>'<div class="mg20-hero"><div class="mg20-av">'+initial20(a)+'</div><div class="mg20-bridge'+(on?'':' off')+'"><i>'+(on?'🔗':'+')+'</i></div><div class="mg20-av '+(bn==null?'q':'b')+'">'+(bn==null?'?':initial20(bn))+'</div></div>';
  let h='<div class="mg20">';
  if(g){
    h+=hero(me,g.host_name,true)+'<h3 class="mg20-t">'+T('החשבון שלך מאוחד עם ','Your account is merged with ')+esc(g.host_name||'')+'</h3>'+
      '<p class="mg20-sub">'+T('מאז ','Since ')+esc(fmtDate(new Date(g.since)))+'<br>'+T('שניכם רואים ועורכים את אותן רשימות, היסטוריה ו"הבית שלי".','You both see and edit the same lists, history and home.')+'</p>'+
      '<div class="mg20-card"><h4>🚪 '+T('יציאה מהאיחוד','Leave the merge')+'</h4><p>'+T('החשבון שלך יחזור להיות נפרד. מה תרצו לקחת איתכם?','Your account becomes separate again. What do you want to keep?')+'</p>'+
      '<label class="mg20-opt"><input type="radio" name="mg20keep" value="1" checked><div><b>'+T('עותק של מה שיש עכשיו בחשבון המשותף','A copy of the shared account now')+'</b><span>'+T('כל הרשימות, ההיסטוריה ו"הבית שלי" כמו שהם עכשיו — יעברו גם לחשבון שלך.','All lists, history and home as they are now.')+'</span></div></label>'+
      '<label class="mg20-opt"><input type="radio" name="mg20keep" value="0"><div><b>'+T('החשבון שלי כמו שהיה לפני האיחוד','My account as it was before')+'</b><span>'+T('חוזרים בדיוק למה שהיה לך לפני שאיחדת.','Back to exactly what you had before merging.')+'</span></div></label>'+
      '<button class="btn mg20-danger" id="mg20Leave">🚪 '+T('יציאה מהאיחוד','Leave the merge')+'</button></div>';
  }else{
    if(ps.length){
      h+=hero(me,ps[0].name,true)+'<h3 class="mg20-t">'+T('החשבון שלך משותף','Your account is shared')+'</h3><p class="mg20-sub">'+T('מי שמאוחד/ת איתך רואה ועורך את כל הרשימות, ההיסטוריה ו"הבית שלי".','Merged accounts see and edit everything.')+'</p>'+
        '<div class="mg20-card"><h4>👥 '+T('מאוחדים עם החשבון שלך','Merged with your account')+'</h4>'+ps.map(p=>'<div class="mg20-p"><div class="mini-av">'+initial20(p.name)+'</div><div class="grow"><b>'+esc(p.name||'')+'</b><small>'+T('מאז ','Since ')+esc(fmtDate(new Date(p.since)))+'</small></div><button class="btn sm sec" data-mg20end="'+esc(p.user_id)+'" data-nm="'+esc(p.name||'')+'">✂️ '+T('ביטול איחוד','Unmerge')+'</button></div>').join('')+
        '<p>'+T('ביטול איחוד מחזיר אותו/ה לחשבון הפרטי שלו/ה. מה שיש בחשבון שלך נשאר אצלך.','Unmerging returns them to their own account. Your data stays with you.')+'</p></div>';
    }else{
      h+=hero(me,null,false)+'<h3 class="mg20-t">'+T('איחוד שני חשבונות לחשבון אחד','Merge two accounts into one')+'</h3><p class="mg20-sub">'+T('לבני זוג ולבני בית: שני חשבונות, אותן רשימות, אותה היסטוריה ואותו "הבית שלי" — בזמן אמת.','Two accounts, the same lists, history and home — live.')+'</p>'+
        '<ol class="mg20-steps"><li><b class="n">1</b><span>'+T('אחד מכם יוצר כאן קוד איחוד ושולח אותו.','One of you creates a merge code and sends it.')+'</span></li><li><b class="n">2</b><span>'+T('השני מקליד את הקוד — וכל מה שהיה לו מצטרף לחשבון המשותף.','The other enters it — their data joins the shared account.')+'</span></li><li><b class="n">3</b><span>'+T('רוצים להיפרד? יוצאים מהאיחוד בלחיצה, והחשבון הפרטי חוזר.','Want to split? Leave in one tap and get your own account back.')+'</span></li></ol>';
    }
    const busy=(roomAcc15&&roomAcc15.role==='secondary')||!!state.follow;
    if(!ps.length)h+='<div class="mg20-card"><h4>🔑 '+T('קיבלתי קוד איחוד','I got a merge code')+'</h4>'+
      (busy?'<p>⚠️ '+T('את/ה מחובר/ת כרגע לרשימה של מישהו אחר. כדי לאחד את החשבון, קודם מתנתקים ממנה (תפריט ← משתמשים משניים / שיתוף רשימה).','You are connected to someone else\'s list. Disconnect first.')+'</p>':
      '<input id="mg20In" class="mg20-in" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX" aria-label="'+T('קוד איחוד','Merge code')+'" value="'+esc(fmtCode20(prefill||''))+'">'+
      '<p>'+T('כל מה שיש בחשבון שלך יצטרף לחשבון המשותף. החשבון הפרטי שלך נשמר בצד.','Everything in your account joins the shared account. Your own account is kept aside.')+'</p>'+
      '<p class="mg20-err" id="mg20Err" role="alert"></p><button class="btn" id="mg20Go">🔗 '+T('איחוד החשבונות','Merge accounts')+'</button>')+'</div>'+
      '<div class="mg20-sep">'+T('או','or')+'</div>';
    h+='<div class="mg20-card" id="mg20Host"><h4>➕ '+(ps.length?T('צירוף חשבון נוסף','Add another account'):T('ליצור קוד איחוד','Create a merge code'))+'</h4>'+
      (m.pending?mergeCodeHtml20(m.pending):'<p>'+T('הקוד בתוקף 30 דקות ולשימוש אחד. מי שמקליד אותו מצטרף לחשבון שלך — עם גישה מלאה.','Valid 30 minutes, single use. Whoever enters it joins your account with full access.')+'</p><button class="btn sec" id="mg20New">🔑 '+T('יצירת קוד','Create a code')+'</button>')+'</div>';
  }
  h+='<p class="mg20-note">💡 '+T('רוצים לתת גישה חלקית בלבד (רק לראות, בלי למחוק וכו\')? בשביל זה יש "משתמשים משניים והרשאות".','Want partial access only? Use "Secondary users".')+'</p></div>';
  b.innerHTML=h;
  const inp=$m20('#mg20In');if(inp){inp.oninput=()=>{const v=inp.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);inp.value=v.length>4?v.slice(0,4)+'-'+v.slice(4):v;$m20('#mg20Err').textContent='';};
    inp.onkeydown=e=>{if(e.key==='Enter')$m20('#mg20Go').click();};}
  b.onclick=async e=>{const t=e.target;
    if(t.closest('#mg20New')){t.disabled=true;const {data,error}=await sb.rpc('merge_code_create');t.disabled=false;
      if(error||!data||data.error){flash('⚠️ '+((data&&MERGE_ERR20[data.error])||(error&&error.message)||''));return;}openMerge20();return;}
    if(t.closest('#mg20Cancel')){await sb.rpc('merge_code_cancel');openMerge20();return;}
    if(t.closest('#mg20Copy')){const c=fmtCode20(m.pending&&m.pending.code);try{await navigator.clipboard.writeText(c);flash('📋 '+T('הקוד הועתק','Code copied'));}catch(x){flash(c);}return;}
    if(t.closest('#mg20Go')){const c=(inp.value||'').replace(/[^A-Za-z0-9]/g,'');const err=$m20('#mg20Err');
      if(c.length!==8){err.textContent=T('קוד האיחוד הוא 8 תווים','The code has 8 characters');return;}
      if(!(await uiConfirm(T('לאחד את החשבון שלך? כל הרשימות, ההיסטוריה ו"הבית שלי" שלך יצטרפו לחשבון המשותף.','Merge your account?'))))return;
      t.disabled=true;const {data,error}=await sb.rpc('merge_accept',{p_code:c});t.disabled=false;
      if(error||!data||data.error){err.textContent=(data&&MERGE_ERR20[data.error])||(error&&error.message)||T('משהו השתבש','Something went wrong');return;}
      /* הרשימות שלי כבר בזיכרון — עוברים לחשבון המשותף בלי לאפס אותן, וכך הן מתמזגות לתוכו */
      stopCloud();state.follow=data.code;state.merge={code:data.code,host:data.host_name||''};save(true);
      await startCloud();render();try{applyPermsUi15();}catch(x){}
      flash('🎉 '+T('החשבונות אוחדו! עכשיו אתם עובדים על אותן רשימות','Accounts merged!'));openMerge20();return;}
    if(t.closest('#mg20Leave')){const keep=(b.querySelector('input[name="mg20keep"]:checked')||{}).value==='1';
      if(!(await uiConfirm(T('לצאת מהאיחוד עם '+((g&&g.host_name)||'')+'? לא תראו יותר את הרשימות המשותפות.','Leave the merge?'))))return;
      t.disabled=true;const {data,error}=await sb.rpc('merge_leave');t.disabled=false;
      if(error||!data){flash('⚠️ '+((error&&error.message)||T('לא הצלחתי לצאת מהאיחוד','Could not leave')));return;}
      stopCloud();delete state.merge;state.follow=null;if(!keep)resetSynced();save(true);
      await startCloud();render();try{applyPermsUi15();}catch(x){}
      flash('👋 '+(keep?T('יצאת מהאיחוד — עם עותק של כל הרשימות','Left the merge — with a copy'):T('יצאת מהאיחוד — חזרת לחשבון שלך','Left the merge — back to your account')));openMerge20();return;}
    const en=t.closest('[data-mg20end]');if(en){if(!(await uiConfirm(T('לבטל את האיחוד עם '+en.dataset.nm+'? הוא/היא יחזרו לחשבון הפרטי שלהם ולא יראו יותר את הרשימות שלך.','Unmerge?'))))return;
      en.disabled=true;const {data,error}=await sb.rpc('merge_end',{p_user:en.dataset.mg20end});
      flash(error||!data?'⚠️ '+((error&&error.message)||''):'✂️ '+T('האיחוד בוטל','Unmerged'));openMerge20();}
  };
}
function mergeCodeHtml20(p){const c=fmtCode20(p.code);const link=MAIN_SITE+'/#merge-'+p.code;
  const msg=T('בוא/י נאחד את החשבונות שלנו ב"רשימת קניות" 🛒 — ככה נעבוד על אותן רשימות.\nנכנסים לקישור (או לתפריט ← איחוד חשבונות) ומקלידים את הקוד: ','Let\'s merge our shopping-list accounts 🛒\nOpen the link (or Menu → Merge accounts) and enter the code: ')+c+'\n'+link;
  return '<div class="mg20-code" aria-label="'+T('קוד איחוד','Merge code')+'">'+esc(c)+'</div><p class="mg20-note">⏳ '+T('בתוקף עד ','Valid until ')+esc(new Date(p.expires_at).toLocaleTimeString(prefs.lang==='en'?'en-US':'he-IL',{hour:'2-digit',minute:'2-digit'}))+' · '+T('לשימוש אחד','single use')+'</p>'+
    '<div class="mg20-row"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(msg)+'">💬 '+T('שליחה בוואטסאפ','WhatsApp')+'</a><button class="btn sec" id="mg20Copy">📋 '+T('העתקת הקוד','Copy code')+'</button></div>'+
    '<button class="linkbtn" id="mg20Cancel" style="align-self:center">'+T('ביטול הקוד','Cancel the code')+'</button>';}
/* כפתור בתפריט, ליד "משתמשים משניים" */
(function(){const host=$m20('#hMenu details[data-g="acct"] .mgbody')||$m20('#hMenu');if(!host)return;
  const b=document.createElement('button');b.id='miMerge20';b.innerHTML='🔗<span>'+T('איחוד חשבונות','Merge accounts')+'</span>';
  const sec=$m20('#miMembers');if(sec&&sec.parentNode===host)sec.insertAdjacentElement('afterend',b);else host.insertBefore(b,host.firstChild);
  b.onclick=()=>{$m20('#hMenu').classList.remove('open');openMerge20();};})();
/* קישור עם קוד: #merge-XXXXXXXX — פותחים את מסך האיחוד עם הקוד אחרי הכניסה */
(function(){const mm=(location.hash||'').match(/^#merge-([A-Za-z0-9]{8})$/);if(mm){try{localStorage.setItem('yamMerge',mm[1].toUpperCase());}catch(e){}history.replaceState(null,'',location.pathname);}})();
function checkMergeLink20(){let c='';try{c=localStorage.getItem('yamMerge')||'';}catch(e){}if(!c||!sb||!authUser)return;
  if($m20('#v8Sheet').classList.contains('open')){setTimeout(checkMergeLink20,3000);return;}
  try{localStorage.removeItem('yamMerge');}catch(e){}openMerge20(c);}
const _m20OnSignedIn=onSignedIn;
onSignedIn=async function(){const r=await _m20OnSignedIn.apply(this,arguments);setTimeout(checkMergeLink20,1500);return r;};
setTimeout(()=>{if(sb&&authUser){mergeFetch20();checkMergeLink20();}},1800);
/* בבק אופיס (מנהלים): 🔗 מי איחד חשבונות עם מי, ואפשרות לבטל איחוד */
(function(){const nav=document.querySelector('#boNav');if(!nav||nav.querySelector('[data-s="merges"]'))return;
  const b=document.createElement('button');b.dataset.s='merges';b.textContent='🔗 חשבונות מאוחדים';
  const after=nav.querySelector('[data-s="secondary"]');if(after)after.after(b);else nav.appendChild(b);
  window.boView&&window.boView('merges',async function(){const m=document.querySelector('#boMain');
    const {data,error}=await sb.rpc('admin_merges');if(error||data==null){m.innerHTML='<div class="card">⚠️ '+esc((error&&error.message)||'')+' — צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)</div>';return;}
    const rows=data||[];const who=(n,e)=>'<b>'+esc(n||'—')+'</b><br><small class="muted" dir="ltr">'+esc(e||'')+'</small>';
    const when=t=>{const d=new Date(t);return esc(d.toLocaleDateString('he-IL')+' '+d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}));};
    m.innerHTML='<div class="card"><h2>🔗 חשבונות מאוחדים</h2><p class="muted">משתמשים שאיחדו את החשבון שלהם עם חשבון של מישהו אחר (תפריט ← איחוד חשבונות). שניהם רואים ועורכים את אותן רשימות. ביטול איחוד מחזיר את המשתמש לחשבון הפרטי שלו.</p><p><b>'+rows.length+'</b> איחודים פעילים</p></div>'+
      (rows.length?'<div class="card"><div class="tw" tabindex="0" role="region" aria-label="טבלה"><table><thead><tr><th>בעל החשבון</th><th>מי שהצטרף</th><th>מתי</th><th></th></tr></thead><tbody>'+
        rows.map(r=>'<tr data-g="'+esc(r.guest_id)+'"><td>'+who(r.host_name,r.host_email)+'</td><td>'+who(r.guest_name,r.guest_email)+'</td><td>'+when(r.since)+'</td><td><button class="btn sm" data-mend="1">✂️ ביטול איחוד</button></td></tr>').join('')+'</tbody></table></div></div>'
      :'<div class="card muted">עוד אף אחד לא איחד חשבונות.</div>');
    m.onclick=async e=>{const x=e.target.closest('[data-mend]');if(!x)return;const tr=x.closest('[data-g]');if(!(await uiConfirm('לבטל את האיחוד? המשתמש יחזור לחשבון הפרטי שלו.')))return;
      x.disabled=true;const {data:okd,error:er}=await sb.rpc('admin_merge_end',{p_guest:tr.dataset.g});flash(er||!okd?'⚠️ '+((er&&er.message)||'לא נמצא'):'✂️ האיחוד בוטל');window.boView&&document.querySelector('#boNav [data-s="merges"]').click();};});
  const g=[...document.querySelectorAll('#boNav .bogrp')].find(x=>x.querySelector('[data-s="secondary"]'));if(g&&b.parentNode!==g)g.querySelector('[data-s="secondary"]').after(b);
})();
