
/* ================= ערכות צבע אישיות — בחירה של כל משתמש לעצמו =================
   נשמר במכשיר לפי המשתמש (כמה בני משפחה על אותו מחשב — כל אחד עם הצבעים שלו), ובפרופיל בענן כדי שיעבור איתו לכל מכשיר.
   לא נשמר ברשימה המשותפת — כך שהבחירה שלך לא משנה את הצבעים אצל שאר המשפחה. */
try{
/* 🎨 עיצוב 2.0: "כחול כהה" (ורוד ושמנת) לכולם; תכלת, מנטה, לילך ולילה — למשתמשי פרו בלבד.
   הערכה משנה יחד את צבעי האתר, הלוגו, ובאפליקציה 2.0 גם את האייקון במסך הבית. ערכות ישנות (יער / שקיעה) חוזרות לברירת המחדל */
const TH36=[
  ['sea',T('כחול כהה','Navy'),T('ברירת המחדל','Default'),'#1e3a5f','#ec8aa8','#f6f3ec',0],
  ['sky',T('תכלת וורוד','Sky & pink'),'PRO','#1f74ad','#ec8aa8','#eef6fb',1],
  ['mint',T('מנטה ואפרסק','Mint & peach'),'PRO','#1b7d65','#f0955f','#eef6f2',1],
  ['lilac',T('לילך','Lilac'),'PRO','#7462c9','#ec8aa8','#f4f2fc',1],
  ['night',T('לילה','Night'),'PRO','#2a2f3a','#ec8aa8','#14171d',1]];
const TH36_IDS=TH36.map(t=>t[0]);
const th36Pro=id=>!!(TH36.find(t=>t[0]===id)||[])[6];
/* בזמן הטעינה (לפני שהחשבון נבדק) — לפי מה שנשמר בפעם הקודמת, כדי שהערכה לא תתחלף אחרי שהדף כבר מוצג */
const th36ProBoot=()=>{try{return localStorage.getItem('yam_pro2_last')==='1';}catch(e){return false;}};
/* הדף גדול, והחשבון יכול להיטען עוד לפני שקוד הפרו (בהמשך הדף) נקרא. אז לפי מה שנשמר בפעם הקודמת —
   אחרת ערכת פרו התחלפה ל"כחול כהה" בכל פתיחה, ואחרי כמה שניות חזרה (וגם האייקון במסך הבית "התעדכן" כל פעם מחדש) */
const th36Ok=id=>!th36Pro(id)||(window.pro2?!!window.pro2.isPro():th36ProBoot())||(!authUser&&th36ProBoot());
const th36Key=()=>authUser&&authUser.id?authUser.id:'guest';
/* הבחירה השמורה (גם אם כרגע אין פרו — כדי שתחזור כשיהיה) */
function th36Saved(k){k=k||th36Key();const m=prefs.themes||{};return TH36_IDS.includes(m[k])?m[k]:(TH36_IDS.includes(prefs.themeLast)?prefs.themeLast:'sea');}
function th36Get(k){const id=th36Saved(k);return th36Ok(id)?id:'sea';}
function th36Apply(id){
  if(!TH36_IDS.includes(id)||!th36Ok(id))id='sea';
  ['forest','sunset'].concat(TH36_IDS).forEach(t=>document.body.classList.toggle('th-'+t,t===id&&t!=='sea'));
  const meta=document.querySelector('meta[name="theme-color"]');
  const bar=id==='night'||state.dark?'#181b22':'#ffffff';
  if(meta)meta.setAttribute('content',bar);
  try{localStorage.setItem('yam_boot36',JSON.stringify({th:id,dark:!!state.dark}));}catch(e){}
  /* אפליקציה 2.0 ומעלה: שורת הסטטוס בצבע הכותרת, והאייקון במסך הבית מתחלף לפי הערכה (רק למשתמש מחובר — לא בגלל מצב אורח) */
  try{if(window.YamApp&&typeof YamApp.setBars==='function')YamApp.setBars(bar);}catch(e){}
  try{if(authUser&&window.YamApp&&typeof YamApp.setIcon==='function'&&prefs.iconLast!==id){YamApp.setIcon(id);prefs.iconLast=id;savePrefs();}}catch(e){}
}
function th36Set(id,fromCloud,k){
  if(!TH36_IDS.includes(id))return;
  if(!fromCloud&&!th36Ok(id)){if(window.pro2)window.pro2.open();return;}
  k=k||th36Key();const was=th36Get(k);
  prefs.themes=Object.assign({},prefs.themes,{[k]:id});prefs.themeLast=id;savePrefs();
  /* "לילה" הוא ערכה כהה — מדליקים מצב כהה; כשעוברים ממנה לערכה אחרת — מכבים */
  if(!fromCloud&&id!==was&&(id==='night'||was==='night')){state.dark=id==='night';document.body.classList.toggle('dark',state.dark);save(true);}
  th36Apply(th36Get(k));
  if(!fromCloud&&sb&&authUser){sb.from('profiles').update({color_theme:id}).eq('id',authUser.id).then(()=>{},()=>{});}
}
function openTheme36(){
  const cur=th36Get(),pro=!!(window.pro2&&window.pro2.isPro());
  const pv=(id,h,a,bg)=>'<span class="pv36" aria-hidden="true" style="background:'+bg+'"><svg viewBox="-4 6 195 144" style="--lg-t:'+(id==='night'?'#fff':h)+';--lg-b:'+a+';--lg-a:'+(id==='night'?'#1d2129':'#fff')+';--lg-w:'+a+'"><use href="/logo-2.svg#yl"/></svg><i><u style="background:'+h+'"></u><u style="background:'+a+'"></u><u style="background:'+h+'"></u></i></span>';
  const b=openSheet('🎨 '+T('עיצוב האתר והאפליקציה','Site & app theme'),
    '<div class="th36grid" role="radiogroup" aria-label="'+T('ערכת צבעים','Color theme')+'">'+TH36.map(([id,n,d,h,a,bg,isPro])=>{const lock=isPro&&!pro;
      return '<button type="button" class="th36'+(id===cur?' on':'')+(lock?' lock':'')+'" data-th="'+id+'" role="radio" aria-checked="'+(id===cur)+'"'+(lock?' aria-description="'+T('פתוח למשתמשי פרו','Pro only')+'"':'')+'>'+
      pv(id,h,a,bg)+'<span>'+(lock?'🔒 ':'')+n+'</span>'+(isPro?'<small><span class="pro2tag">PRO</span></small>':'<small>'+d+'</small>')+'</button>';}).join('')+'</div>'+
    '<p class="muted-note">'+(pro?T('הצבעים של האתר, האפליקציה, הלוגו והאייקון משתנים יחד. הבחירה אישית שלך בלבד — בני המשפחה רואים את מה שהם בחרו.','Site, app, logo and icon change together. Just for you.')
      :T('ערכות הצבעים הנוספות פתוחות למשתמשי פרו.','Extra themes are for Pro users.')+' <button type="button" class="linklike" data-pro2open="1">⭐ '+T('איך מקבלים פרו?','How do I get Pro?')+'</button>')+'</p>'+
    '<label class="radio"><input type="checkbox" id="th36Dark"'+(state.dark?' checked':'')+'> 🌙 '+T('מצב כהה (אפשר לשלב עם כל ערכה)','Dark mode (works with any theme)')+'</label>');
  b.onclick=e=>{if(e.target.closest('[data-pro2open]')){window.pro2&&window.pro2.open();return;}
    const x=e.target.closest('[data-th]');if(!x)return;if(!th36Ok(x.dataset.th)){window.pro2&&window.pro2.open();return;}
    th36Set(x.dataset.th);openTheme36();const n=TH36.find(t=>t[0]===x.dataset.th);flash('🎨 '+T('ערכת הצבעים: ','Theme: ')+n[1]);};
  b.onchange=e=>{if(e.target.id!=='th36Dark')return;state.dark=e.target.checked;document.body.classList.toggle('dark',state.dark);save(true);th36Apply(th36Get());};
}
const mi36=document.querySelector('#miTheme');if(mi36)mi36.onclick=openTheme36;
th36Apply(th36Get());
/* אחרי התחברות: הצבעים של המשתמש הזה (במכשיר), ואם שמר ערכה בענן ממכשיר אחר — היא קובעת */
const _v36Signed=onSignedIn;
onSignedIn=async function(user){
  try{th36Apply(th36Get(user&&user.id));}catch(e){}
  if(sb&&user&&user.id){sb.from('profiles').select('color_theme').eq('id',user.id).maybeSingle().then(({data,error})=>{
    if(!error&&data&&TH36_IDS.includes(data.color_theme)&&data.color_theme!==th36Saved(user.id))th36Set(data.color_theme,true,user.id);},()=>{});}
  return _v36Signed.apply(this,arguments);
};
window.th36Set=th36Set;window.th36Apply=th36Apply;window.th36Get=th36Get;window.TH36=TH36;
window.openTheme36=openTheme36;
}catch(e){console.warn('themes36',e);}
