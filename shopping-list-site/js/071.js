
/* ================= ⭐ Yam shopping PRO (עיצוב 2.0) =================
   החישוב כולו בשרת (pro_status) מתוך מה שהמשתמש כבר עשה: דיווחי מחירים, תמונות שאושרו, שיתופים לקהילה, חברים שהצטרפו דרך הקישור, ושיתוף האתר.
   כאן: מסך "הדרך שלך לפרו", פתיחת ערכות הצבעים למי שפרו, ובבק אופיס ← ⭐ מוניטין ופרו */
(function(){
const DEF={min_points:25,min_photos:5,min_shared:1,fast_friends:10,solo_points:70,pts_friend:3,pts_friend2:2,pts_share:1,share_day_max:3,pts_photo:3,pts_price:1,pts_recipe:4,pts_shared:2,pts_confirm:2,pts_bonus:1};
let st=null,test=null;
const ckey=()=>'yam_pro2_'+(authUser&&authUser.id||'');
function cached(){try{return JSON.parse(localStorage.getItem(ckey())||'null');}catch(e){return null;}}
function isPro(){if(test)return !!test.pro;if(!authUser)return false;if(st)return !!st.pro;const c=cached();return !!(c&&c.pro);}
async function refresh(){if(test||!sb||!authUser)return st;
  try{const {data,error}=await sb.rpc('pro_status');if(error||!data)return st;const was=isPro();st=data;
    try{localStorage.setItem(ckey(),JSON.stringify({pro:!!data.pro}));localStorage.setItem('yam_pro2_last',data.pro?'1':'0');}catch(e){}
    if(was!==!!data.pro&&window.th36Apply)th36Apply(th36Get());
    if(!was&&data.pro&&cached()&&!sessionStorage.getItem('pro2hi')){try{sessionStorage.setItem('pro2hi','1');}catch(e){}}
  }catch(e){}return st;}
const N=(c,k)=>{const v=Number(c&&c[k]);return isFinite(v)&&v>=0?v:DEF[k];};
async function open(){
  if(!authUser&&!test){flash('🔑 '+T('כדי לצבור מוניטין ולקבל פרו צריך להתחבר','Sign in to earn reputation and get Pro'));return;}
  const b=openSheet('⭐ Yam shopping PRO','<div class="empty">'+T('טוען...','Loading...')+'</div>');
  const s=test||await refresh();
  if(!s){b.innerHTML='<div class="empty">⚠️ '+T('עוד לא זמין — צריך להריץ את קוד ה-SQL המעודכן','Not available yet')+'</div>';return;}
  const c=s.cfg||DEF,mp=N(c,'min_points'),mph=N(c,'min_photos'),ms=N(c,'min_shared'),ff=N(c,'fast_friends'),sp=N(c,'solo_points');
  const ck=(ok)=>ok?'✅':'⬜';
  const done=[s.points>=mp,s.photos>=mph,s.shared>=ms].filter(Boolean).length;
  const pct=Math.round(100*(Math.min(1,s.points/Math.max(1,mp))+Math.min(1,s.photos/Math.max(1,mph))+Math.min(1,s.shared/Math.max(1,ms)))/3);
  let code='';try{code=typeof myRef29==='function'?await myRef29():'';}catch(e){}
  const yes=s.pro?'<div class="pro2yes"><div class="big">🎉</div><h3>'+T('יש לך Yam shopping PRO','You have Pro')+'</h3><p class="muted-note">'+
      ({staff:T('כחלק מהצוות — תודה!','As part of the team — thank you!'),manual:T('קיבלת פרו מהנהלת האתר.','Granted by the site team.'),fast:T('בזכות החברים שהזמנת 💚','Thanks to the friends you invited 💚'),points:T('בזכות המוניטין שצברת — כל הכבוד!','Thanks to your '+sp+' points — well done!')}[s.reason]||T('צברת את כל התנאים — כל הכבוד!','You met all the conditions — well done!'))+
      '</p><button type="button" class="btn" data-pro2theme="1">🎨 '+T('לבחור ערכת צבעים','Pick a color theme')+'</button></div>':'';
  b.innerHTML=yes+
    '<p class="muted-note" style="margin:0 0 8px">'+T('יש '+(1+(sp>0)+(ff>0))+' דרכים לקבל פרו — מספיקה אחת מהן:','There are '+(1+(sp>0)+(ff>0))+' ways to get Pro — any one is enough:')+'</p>'+
    '<div class="pro2way"><h3>🛤️ '+T('המסלול: '+mp+' מוניטין + תמונות + שיתוף','The path: '+mp+' reputation + photos + sharing')+'</h3><ul>'+
      '<li>'+ck(s.points>=mp)+' <span>'+mp+' '+T('מוניטין','reputation')+' <small>('+T('יש לך '+s.points,'you have '+s.points)+')</small></span></li>'+
      '<li>'+ck(s.photos>=mph)+' <span>'+mph+' '+T('תמונות מוצרים','product photos')+' <small>('+s.photos+' '+T('מתוך','of')+' '+mph+')</small></span></li>'+
      '<li>'+ck(s.shared>=ms)+' <span>'+T('שיתוף בקהילה או ברשימות מהקהילה','Share to the community')+'</span></li></ul>'+
      '<div class="pro2bar" role="progressbar" aria-valuenow="'+pct+'" aria-valuemin="0" aria-valuemax="100" aria-label="'+T('התקדמות לפרו','Progress to Pro')+'"><i style="width:'+pct+'%"></i></div>'+
      '<small style="display:block;margin-top:6px;opacity:.8">'+T(done+' מתוך 3 תנאים',done+' of 3 conditions')+'</small></div>'+
    (sp>0?'<div class="pro2way"><h3>💯 '+T(sp+' מוניטין = פרו',sp+' reputation = Pro')+'</h3><p>'+
      T('מי שצובר <b>'+sp+' מוניטין</b> מקבל פרו גם בלי שאר תנאי המסלול.','Reach <b>'+sp+' points</b> and get Pro even without the rest of the path.')+'</p>'+
      '<small style="display:block;opacity:.8">'+s.points+' '+T('מתוך','of')+' '+sp+' '+T('מוניטין','reputation')+'</small>'+
      '<div class="pro2bar"><i style="width:'+Math.min(100,Math.round(100*s.points/sp))+'%"></i></div></div>':'')+
    (ff>0?'<div class="pro2fast"><h3>🚀 '+T('מסלול מהיר: הזמנת חברים','Fast path: invite friends')+'</h3><p>'+
      T('כל חבר שנרשם מהקישור שלך: <b>+'+N(c,'pts_friend')+' מוניטין</b>, ואם הוא מביא חבר משלו: <b>עוד '+N(c,'pts_friend2')+'</b>.<br><b>'+ff+' חברים שנרשמו = פרו מיד</b>, גם בלי שאר התנאים. נחשב רק חבר שנרשם בפועל, לא כל שליחה של הקישור.',
        'Each friend who signs up via your link: <b>+'+N(c,'pts_friend')+'</b>, and <b>+'+N(c,'pts_friend2')+'</b> more if they bring a friend. <b>'+ff+' friends who signed up = Pro right away</b>. Only friends who actually sign up count.')+'</p>'+
      '<small class="muted-note">'+s.friends+' '+T('מתוך','of')+' '+ff+' '+T('חברים','friends')+'</small>'+
      '<div class="pro2bar"><i style="width:'+Math.min(100,Math.round(100*s.friends/ff))+'%"></i></div>'+
      (code?'<div class="row2"><button type="button" class="btn" data-pro2share="1">📤 '+T('שיתוף הקישור שלי','Share my link')+'</button><button type="button" class="btn sec" data-pro2copy="1">📋 '+T('העתקה','Copy')+'</button></div>':'')+'</div>':'')+
    '<div class="pro2pts"><h3>🏅 '+T('איך צוברים מוניטין','How to earn reputation')+'</h3>'+
      [['🤝',T('חבר שנרשם מהקישור שלך','A friend who signed up via your link'),N(c,'pts_friend')],
       ['🔁',T('החבר הביא חבר משלו','Your friend brought a friend'),N(c,'pts_friend2')],
       ['📣',T('שיתוף שמשתמש חדש נרשם ממנו (עד '+N(c,'share_day_max')+' ביום)','A share a new user signed up from (up to '+N(c,'share_day_max')+'/day)'),N(c,'pts_share')],
       ['📷',T('תמונת מוצר שאושרה','Approved product photo'),N(c,'pts_photo')],
       ['🏷️',T('דיווח מחיר שאושר','Approved price report'),N(c,'pts_price')],
       ['✅',T('מישהו אישר שהמחיר שלך נכון','Someone confirmed your price'),N(c,'pts_confirm')],
       ['🛒',T('רשימה או טיפ לקהילה','A list or tip for the community'),N(c,'pts_shared')]]
       .filter(r=>r[2]>0).map(r=>'<div><span>'+r[0]+' '+r[1]+'</span><b>+'+r[2]+'</b></div>').join('')+'</div>'+
    '<p class="muted-note" style="margin-top:10px">'+T('כל מה שחינם נשאר חינם. פרו רק מוסיף: ערכות צבעים לאתר, לאפליקציה, ללוגו ולאייקון.','Everything free stays free. Pro adds color themes for the site, app, logo and icon.')+'</p>';
  const url='https://www.yamshopping.com/?ref='+code;
  b.onclick=async e=>{
    if(e.target.closest('[data-pro2theme]')){openTheme36();return;}
    if(e.target.closest('[data-pro2share]')&&typeof openShare18==='function'){openShare18({hash:'?ref='+code,title:T('רשימת קניות — ים שופינג','YamShopping'),text:T('אני עושה את הקניות עם "ים שופינג" — רשימה משותפת למשפחה, איפה הכי זול, ויאמי שעוזרת. בחינם 💚','I shop with YamShopping — free shared lists and price comparison 💚')});return;}
    if(e.target.closest('[data-pro2copy]')){try{await navigator.clipboard.writeText(url);flash('📋 '+T('הועתק','Copied'));}catch(er){await uiPrompt(T('להעתקה:','Copy:'),url);}}};
}
window.pro2={isPro,refresh,open,cfg:k=>N((test||st||{}).cfg||DEF,k),__test:o=>{test=Object.assign({points:0,photos:0,shared:0,friends:0,friends2:0,shares:0,reason:'',cfg:DEF},o);if(window.th36Apply)th36Apply(th36Get());}};
/* בתפריט: ⭐ PRO, מתחת ל"ערכת צבעים" */
{const t=document.querySelector('#miTheme');if(t&&!document.querySelector('#miPro2')){t.insertAdjacentHTML('afterend','<button id="miPro2">⭐<span>Yam shopping PRO</span></button>');document.querySelector('#miPro2').onclick=()=>{document.querySelector('#hMenu').classList.remove('open');open();};}}
/* קישור ישיר: /#pro (מההתראה "קיבלת פרו") */
function route(){if(location.hash==='#pro'){history.replaceState(null,'',location.pathname+location.search);setTimeout(open,600);}}
addEventListener('hashchange',route);route();
const _sIn=onSignedIn;onSignedIn=async function(user){const r=_sIn.apply(this,arguments);setTimeout(()=>refresh().then(()=>{try{th36Apply(th36Get());}catch(e){}}),1500);return r;};
if(authUser)setTimeout(refresh,1500);

/* 🛠️ בק אופיס (מנהלים): ⭐ מוניטין ופרו — התנאים, הנקודות לכל פעולה, ופרו ידני */
const nav=document.querySelector('#boNav');
if(nav&&!nav.querySelector('[data-s="pro2"]')){const bt=document.createElement('button');bt.dataset.s='pro2';bt.textContent='⭐ מוניטין ופרו';
  const after=nav.querySelector('[data-s="reporters"]');if(after)after.before(bt);else nav.appendChild(bt);}
{const h=document.querySelector('#bo .bohead b');if(h&&window.yamLogo2&&!h.parentNode.querySelector('.ylogo'))h.insertAdjacentHTML('beforebegin',yamLogo2());}
let q='',flt='';
window.boView&&window.boView('pro2',async function(){const m=document.querySelector('#boMain');
  m.innerHTML='<h2 style="margin:4px 0 12px">⭐ מוניטין ופרו</h2><div class="stats" id="pro2stats"><div class="stat"><div class="n">…</div><div class="l">טוען</div></div></div><div class="bocols" style="margin-top:14px"><div class="card" id="pro2cfgc"></div><div class="card" id="pro2usersc"></div></div>';
  const [{data:sum,error:e1},{data:cfg}]=await Promise.all([sb.rpc('admin_pro_summary'),sb.rpc('pro_cfg')]);
  if(e1){m.querySelector('#pro2stats').innerHTML='<p class="muted">⚠️ '+esc(e1.message)+' — צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)</p>';return;}
  const S=sum||{};m.querySelector('#pro2stats').innerHTML=[[S.pro,'משתמשי פרו'],[S.manual,'קיבלו פרו ידני'],[S.joined_month,'הצטרפו מקישורים אישיים החודש'],[S.close,'קרובים לפרו']].map(([n,l])=>'<div class="stat"><div class="n">'+(+n||0)+'</div><div class="l">'+l+'</div></div>').join('');
  const c=Object.assign({},DEF,cfg||{});
  const F=[['h','🛤️ המסלול לפרו (כל השלושה יחד)'],['min_points','🏅 מוניטין'],['min_photos','📷 תמונות מוצרים'],['min_shared','🤝 שיתוף בקהילה'],['h','💯 מוניטין בלבד'],['solo_points','מוניטין = פרו גם בלי המסלול (0 = כבוי)'],['h','🚀 מסלול מהיר'],['fast_friends','חברים שנרשמו מהקישור = פרו מיד (0 = כבוי)'],
    ['h','🏅 מוניטין על כל פעולה (אותו מוניטין בכל האתר)'],['pts_friend','🤝 חבר שהצטרף מהקישור'],['pts_friend2','🔁 החבר הביא חבר (תוספת)'],['pts_share','📣 שיתוף שמשתמש חדש נרשם ממנו'],['share_day_max','📣 עד כמה שיתופים ביום'],['pts_photo','📷 תמונת מוצר שאושרה'],['pts_price','🏷️ דיווח מחיר שאושר'],['pts_shared','🛒 רשימה / טיפ לקהילה'],['pts_confirm','✅ מישהו אישר שהמחיר נכון'],['pts_bonus','⭐ שווי יחידת בונוס מהמנהל']];
  m.querySelector('#pro2cfgc').innerHTML='<h2>הגדרות</h2><div class="pro2cfg">'+F.map(([k,l])=>k==='h'?'<b style="grid-column:1/-1;margin-top:8px">'+l+'</b>':'<label for="pc_'+k+'">'+l+'</label><input id="pc_'+k+'" type="number" min="0" max="100000" inputmode="numeric" value="'+(+c[k]||0)+'">').join('')+'</div>'+
    '<p class="muted" style="margin-top:10px">מספיקה אחת משלוש הדרכים. חבר נחשב רק כשנרשם בפועל דרך הקישור. מנהלים וצוות מקבלים פרו אוטומטית. הנקודות מחושבות מהמסד, כך שאי אפשר לזייף אותן. מה שפרו מקבל: ערכות צבע לאתר, לאפליקציה, ללוגו ולאייקון.</p><button class="btn" id="pro2save" style="margin-top:6px">💾 שמירה</button>';
  m.querySelector('#pro2save').onclick=async()=>{const v={};F.forEach(([k])=>{if(k!=='h'){const x=Math.max(0,Math.min(100000,Math.round(+m.querySelector('#pc_'+k).value||0)));v[k]=x;}});
    const {error}=await sb.from('site_config').upsert({key:'rep',value:v,updated_at:new Date().toISOString()});flash(error?'⚠️ '+error.message:'✅ נשמר');if(!error)window.boShow('pro2');};
  const uc=m.querySelector('#pro2usersc');
  uc.innerHTML='<h2>פרו ידני</h2><div class="row"><input id="pro2q" placeholder="🔍 חיפוש משתמש (שם או מייל)" value="'+esc(q)+'" style="flex:1"><select id="pro2f" style="width:auto"><option value="">כולם</option><option value="pro"'+(flt==='pro'?' selected':'')+'>פרו</option><option value="close"'+(flt==='close'?' selected':'')+'>קרובים לפרו</option><option value="manual"'+(flt==='manual'?' selected':'')+'>ידני</option></select></div><div id="pro2list"><p class="muted">טוען...</p></div>';
  const load=async()=>{const box=uc.querySelector('#pro2list');const {data,error}=await sb.rpc('admin_pro_users',{p_q:q,p_filter:flt});
    if(error){box.innerHTML='<p class="muted">⚠️ '+esc(error.message)+'</p>';return;}
    const R={manual:'ידני',removed:'הוסר ידנית',staff:'צוות — אוטומטי',fast:'מסלול מהיר',earned:'צבר את התנאים',points:'מוניטין בלבד'};
    box.innerHTML=(data||[]).length?data.map(u=>'<div class="pro2u"><div class="grow"><b>'+esc(u.name||u.email||'—')+'</b> '+(u.pro?'<span class="pro2tag">PRO</span>':'')+'<small>'+esc(u.email||'')+' · '+u.points+' מוניטין · '+u.photos+' תמונות · '+u.friends+' חברים'+(u.reason?' · '+(R[u.reason]||''):'')+'</small></div>'+
      (isOwner()&&!u.staff?'<select data-pro2set="'+esc(u.user_id)+'" aria-label="פרו ל'+esc(u.name||u.email||'')+'"><option value="auto"'+(u.manual==null?' selected':'')+'>אוטומטי</option><option value="on"'+(u.manual===true?' selected':'')+'>פרו ✓</option><option value="off"'+(u.manual===false?' selected':'')+'>בלי פרו</option></select>':'')+'</div>').join(''):'<p class="muted">לא נמצאו משתמשים.</p>';};
  load();
  let tm;uc.querySelector('#pro2q').oninput=e=>{clearTimeout(tm);q=e.target.value.trim();tm=setTimeout(load,350);};
  uc.querySelector('#pro2f').onchange=e=>{flt=e.target.value;load();};
  uc.onchange=async e=>{const s=e.target.closest('[data-pro2set]');if(!s)return;const v=s.value==='on'?true:s.value==='off'?false:null;
    const {error}=await sb.rpc('admin_pro_set',{p_user:s.dataset.pro2set,p_val:v});flash(error?'⚠️ '+error.message:v===true?'⭐ קיבל פרו (ונשלחה לו התראה)':v===false?'הפרו הוסר':'חזר לחישוב אוטומטי');load();};
});
})();
