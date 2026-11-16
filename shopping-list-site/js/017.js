
/* ================= גרסה 15: קטגוריות בריאות + עריכה בבק אופיס, מוצר חדש → הבית שלי, כמויות וקילו, החלקה בין קטגוריות, תצוגת רשימה/רשת,
   הקלדה רק ברשימה, יאמי שואלת כמה ולאן, קבלות עם הנחות, משתמשים משניים עם הרשאות ================= */
const $15=s=>document.querySelector(s);
const myName15=()=>((roomAcc15&&roomAcc15.name)||(state.user&&state.user.name)||'').slice(0,40);
let roomAcc15=null,roomPoll15=null;

/* ---------- קטגוריות בריאות ---------- */
function insertCat15(name,emoji){if(!name||/[<>"'&\\]/.test(name))return;emoji=emoji&&cleanEmo(String(emoji),'');if(!CATS.includes(name)){const i=CATS.indexOf('אחר');CATS.splice(i<0?CATS.length:i,0,name);}CATE[name]=emoji||CATE[name]||'🛒';}
[['בריאות ותרופות','💊'],['ויטמינים ותוספים','🌿'],['מזון בריאות','🥗']].forEach(([n,e])=>insertCat15(n,e));
CATR.unshift(['בריאות ותרופות',/(תרופ|אקמול|נורופן|אדויל|אופטלגין|פלסטר|תחבוש|מדחום|סירופ|טיפות|משחה|חיטוי|אלכוג|גזה|אנטיביוט|כדורים ל)/],
  ['ויטמינים ותוספים',/(ויטמין|אומגה|מגנזיום|פרוביוט|תוסף|תוספי|חומצה פולית|אבקת חלבון)/],
  ['מזון בריאות',/(קינואה|שיבולת|גרנולה|צ׳יה|ציה|פשתן|כוסמין|אורגני|טופו|ללא גלוטן|טבעוני)/]);
[['אקמול','💊','בריאות ותרופות'],['נורופן','💊','בריאות ותרופות'],['אופטלגין','💊','בריאות ותרופות'],['פלסטרים','🩹','בריאות ותרופות'],['תחבושות','🩹','בריאות ותרופות'],['מדחום','🌡️','בריאות ותרופות'],['סירופ לשיעול','🧴','בריאות ותרופות'],['טיפות אף','💧','בריאות ותרופות'],['משחה לפצעים','🧴','בריאות ותרופות'],['אלכוג׳ל','🧴','בריאות ותרופות'],['מסכות פנים','😷','בריאות ותרופות'],['כדורים לאלרגיה','💊','בריאות ותרופות'],
 ['ויטמין C','🍊','ויטמינים ותוספים'],['ויטמין D','☀️','ויטמינים ותוספים'],['ויטמין B12','💊','ויטמינים ותוספים'],['מולטי ויטמין','💊','ויטמינים ותוספים'],['ברזל','💊','ויטמינים ותוספים'],['אומגה 3','🐟','ויטמינים ותוספים'],['מגנזיום','💊','ויטמינים ותוספים'],['סידן','🦴','ויטמינים ותוספים'],['פרוביוטיקה','💊','ויטמינים ותוספים'],['חומצה פולית','💊','ויטמינים ותוספים'],['אבקת חלבון','💪','ויטמינים ותוספים'],
 ['קינואה','🌾','מזון בריאות'],['שיבולת שועל','🥣','מזון בריאות'],['גרנולה','🥣','מזון בריאות'],['זרעי צ׳יה','🌱','מזון בריאות'],['זרעי פשתן','🌱','מזון בריאות'],['שקדים','🥜','מזון בריאות'],['אגוזי מלך','🌰','מזון בריאות'],['טופו','🧈','מזון בריאות'],['חלב שקדים','🥛','מזון בריאות'],['חלב שיבולת שועל','🥛','מזון בריאות'],['לחם כוסמין','🍞','מזון בריאות'],['קמח מלא','🌾','מזון בריאות'],['תמרים','🌴','מזון בריאות'],['אורז מלא','🍚','מזון בריאות']
].forEach(([n,e,c])=>{if(!P[n]){P[n]={e,c};NORMP[norm(n)]=n;}});
const BUILTIN_CATS15=CATS.slice();

/* ---------- קטגוריות שהמנהל עורך בבק אופיס (site_config: categories) ---------- */
let catCfg15={};
function applyCatCfg15(v){
  v=v&&typeof v==='object'?v:{};catCfg15=v;
  (Array.isArray(v.extra)?v.extra:[]).forEach(c=>{if(c&&c.name)insertCat15(String(c.name).slice(0,30),c.emoji);});
  Object.entries(v.emoji||{}).forEach(([c,e])=>{if(CATS.includes(c)&&e)CATE[c]=cleanEmo(String(e).slice(0,4),'');});
  (Array.isArray(v.hidden)?v.hidden:[]).forEach(c=>{const i=CATS.indexOf(c);if(i>=0&&c!=='אחר'){CATS.splice(i,1);Object.keys(P).forEach(n=>{if(P[n].c===c)P[n].c='אחר';});}});
  Object.entries(v.products||{}).forEach(([c,list])=>{if(!CATS.includes(c)||!Array.isArray(list))return;list.forEach(n=>{n=String(n||'').trim().slice(0,60);if(!n)return;P[n]=Object.assign({},P[n]||{},{c,e:(P[n]&&P[n].e)||CATE[c]||'🛒'});NORMP[norm(n)]=n;});});
  if(Array.isArray(v.order)&&v.order.length){const rank=c=>{const i=v.order.indexOf(c);return c==='אחר'?1e6:(i<0?5e5+CATS.indexOf(c):i);};CATS.sort((a,b)=>rank(a)-rank(b));}
  if(typeof tab!=='undefined'&&tab==='home')renderHome();
  if($15('#catOverlay')&&$15('#catOverlay').classList.contains('open'))renderCats($15('#inCatSearch').value);
}
// אייקון בלי אימוג'י (תו פרטי) לא נכנס לטקסט ששולחים בוואטסאפ
if(typeof shareText==='function'){const _shTx=shareText;shareText=function(){return plainEmo(_shTx.apply(this,arguments));};}
const _v15ApplyConfig=applyConfig;
applyConfig=function(key,v){if(key==='categories'){applyCatCfg15(v);return;}if(key==='icons'){applyIcons(v);return;}if(key==='secondary')return;return _v15ApplyConfig.apply(this,arguments);};
if(sb)sb.from('site_config').select('value').eq('key','categories').maybeSingle().then(({data})=>{if(data&&data.value)applyCatCfg15(data.value);},()=>{});

/* ---------- הקלדה והקלטה — רק בלשונית הרשימה (בבית יש חיפוש רגיל) ---------- */
const _v15SetTab=setTab;
setTab=function(t){const r=_v15SetTab.apply(this,arguments);if(tab!=='list')$15('#inputRow').classList.remove('on');applyPermsUi15();return r;};
/* 📢 פרסומות לפי דף: במעבר לשונית מתחלפים הבאנר והפרסומת בצד, ופופאפ שנבחר במיוחד לדף הזה מוצג כשנכנסים אליו */
{const _adSetTab=setTab;setTab=function(t){const r=_adSetTab.apply(this,arguments);
  try{if(adsCache.length||adHouse){renderBannerAd();renderSideAd();if(adsCache.some(a=>a.placement==='popup'&&a.page===tab&&!adSeenToday(a.id,'pop'))){adShownThisLoad=false;setTimeout(maybePopupAd,800);}}}catch(e){}return r;};}
if(typeof tab!=='undefined'&&tab!=='list')$15('#inputRow').classList.remove('on');

/* ---------- כמויות ויחידות (גם קילו) ---------- */
const UNITS15=[['','יח׳'],['ק״ג','ק״ג'],['גרם','גרם'],['ליטר','ליטר'],['חבילות','חבילות']];
const unitOf15=n=>{const s=stockOf(n);return (s&&s.u)||'';};
const stepOf15=u=>u==='גרם'?100:(u==='ק״ג'||u==='ליטר')?0.5:1;
const fmtQ15=(q,u)=>(Math.round(q*100)/100)+(u?' '+u:'');
let qpk15=null;
function openQtyPicker15(opts){
  /* opts: {title, emoji, q, u, okLabel, onOk(q,u)} */
  qpk15=opts;let el=$15('#qp15');
  if(!el){el=document.createElement('div');el.id='qp15';el.className='qp15';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el);
    el.addEventListener('click',e=>{
      if(e.target===el){el.classList.remove('open');return;}
      const inp=$15('#qp15n');let u=el.dataset.u||'';
      if(e.target.closest('[data-qpu]')){u=e.target.closest('[data-qpu]').dataset.qpu;el.dataset.u=u;el.querySelectorAll('[data-qpu]').forEach(b=>b.classList.toggle('on',b.dataset.qpu===u));if(u==='גרם'&&parseFloat(inp.value)<50)inp.value='500';if(u!=='גרם'&&parseFloat(inp.value)>=50)inp.value='1';return;}
      if(e.target.closest('[data-qps]')){const d=+e.target.closest('[data-qps]').dataset.qps;const st=stepOf15(u);let n=Math.round(((parseFloat(String(inp.value).replace(',','.'))||0)+d*st)*100)/100;if(n<st)n=st;inp.value=n;return;}
      if(e.target.closest('#qp15ok')){const n=parseFloat(String(inp.value).replace(',','.'));if(!(n>0)){flash(T('כמה? 🙂','How many? 🙂'));return;}el.classList.remove('open');qpk15&&qpk15.onOk(n,u);return;}
      if(e.target.closest('#qp15x')){el.classList.remove('open');}
    });
    el.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='qp15n'){e.preventDefault();$15('#qp15ok').click();}if(e.key==='Escape')el.classList.remove('open');});}
  el.dataset.u=opts.u||'';
  el.innerHTML='<div class="qpcard"><div class="qphead"><span class="qpem">'+esc(opts.emoji||'🛒')+'</span><b>'+esc(opts.title)+'</b><button id="qp15x" aria-label="'+T('סגירה','Close')+'">✕</button></div>'+
    '<div class="qprow"><button data-qps="-1" aria-label="'+T('פחות','Less')+'">−</button><input id="qp15n" inputmode="decimal" value="'+esc(String(opts.q||1))+'" aria-label="'+T('כמות','Quantity')+'"><button data-qps="1" aria-label="'+T('יותר','More')+'">+</button></div>'+
    '<div class="qpunits">'+UNITS15.map(([v,l])=>'<button data-qpu="'+v+'" class="'+((opts.u||'')===v?'on':'')+'">'+l+'</button>').join('')+'</div>'+
    '<button id="qp15ok" class="qpok">'+esc(opts.okLabel||T('אישור','OK'))+'</button></div>';
  el.classList.add('open');setTimeout(()=>{const i=$15('#qp15n');if(i){i.focus();i.select();}},60);
}
/* מאגר המוצרים (➕): לוחצים על מוצר → בוחרים כמה (יחידות / קילו / גרם...) → מוסיפים */
document.addEventListener('click',e=>{const b=e.target.closest('#catList [data-add]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();
  if(!can15('add')){flash(T('⛔ אין לך הרשאה להוסיף מוצרים','⛔ No permission to add'));return;}
  const name=b.dataset.add;const def=qtyParts(($15('#catQty')||{}).value||'1')||{n:1,u:''};
  const u=/^(ק"?ג|ק״ג|קילו)$/.test(def.u)?'ק״ג':(UNITS15.some(x=>x[0]===def.u)?def.u:'');
  openQtyPicker15({title:name,emoji:emojiOf(name),q:def.n||1,u,okLabel:'🛒 '+T('הוספה לרשימה','Add to list'),onOk:(n,uu)=>addItem(name,(n===1&&!uu)?'':(n+(uu?' '+uu:'')))});
},true);

/* ---------- הבית שלי: כמות על כל מוצר, תצוגת רשימה / רשת ---------- */
state.homeLayout=state.homeLayout||'grid';
const _v15Pcard=pcardHtml;
pcardHtml=function(n,custom){let h=_v15Pcard.apply(this,arguments);if(!pantryHas(n))return h;
  const q=stockQty(n),u=unitOf15(n);
  h=h.replace(/<span class="pq">[\s\S]*?<\/span>/,'<span class="pqs"><button data-qd="'+esc(n)+'" data-d="-1" aria-label="'+T('פחות','Less')+'">−</button><button class="pqv" data-qe15="'+esc(n)+'" aria-label="'+T('עריכת כמות','Edit quantity')+'">'+esc(fmtQ15(q,u))+'</button><button data-qd="'+esc(n)+'" data-d="1" aria-label="'+T('יותר','More')+'">+</button></span>');
  return h;};
const _v15RenderHome=renderHome;
renderHome=function(){_v15RenderHome.apply(this,arguments);const p=$15('#paneHome');if(!p)return;
  p.classList.toggle('hl-list',state.homeLayout==='list');
  const s=$15('#homeSearch');if(s&&!$15('#hl15')){s.insertAdjacentHTML('beforebegin','<div class="hl15" id="hl15" role="group" aria-label="'+T('תצוגה','View')+'"><span>'+T('תצוגה:','View:')+'</span><button data-hl="grid" class="'+(state.homeLayout!=='list'?'on':'')+'">▦ '+T('אחד ליד השני','Side by side')+'</button><button data-hl="list" class="'+(state.homeLayout==='list'?'on':'')+'">☰ '+T('אחד אחרי השני','One per row')+'</button></div>');}
  applyPermsUi15();};
document.addEventListener('click',e=>{
  const hl=e.target.closest('#paneHome [data-hl]');if(hl){e.stopImmediatePropagation();state.homeLayout=hl.dataset.hl;save(true);renderHome();return;}
  const qd=e.target.closest('#paneHome [data-qd],#paneHome [data-qe15]');if(!qd)return;e.preventDefault();e.stopImmediatePropagation();
  if(!can15('home_edit')){flash(T('⛔ אין לך הרשאה לעדכן את הבית','⛔ No permission'));return;}
  const n=qd.dataset.qd||qd.dataset.qe15,u=unitOf15(n);
  const done=()=>{save();const inCats=qd.closest('#homeCats');if(inCats)renderHomeCats();else renderHome();};
  if(qd.dataset.qe15){openQtyPicker15({title:pName(n),emoji:pEmoji(n),q:stockQty(n)||1,u,okLabel:'🏠 '+T('עדכון מה שיש בבית','Update home'),onOk:(q,uu)=>{stockSet(n,q,{u:uu});done();}});return;}
  const nq=Math.round((stockQty(n)+(+qd.dataset.d)*stepOf15(u))*100)/100;
  if(nq<=0){stockSet(n,0);flash('📝 '+T('נרשם שנגמר: ','Marked out: ')+pName(n));}else stockSet(n,nq,{u});
  done();
},true);
/* מוצר שעוד אין בבית — לחיצה = "יש" + בחירת כמות */
document.addEventListener('click',e=>{const c=e.target.closest('#paneHome .pcard[data-pan]');if(!c||e.target.closest('button:not(.ptog18)'))return;
  if(!can15('home_edit')){e.preventDefault();e.stopImmediatePropagation();flash(T('⛔ אין לך הרשאה לעדכן את הבית','⛔ No permission'));}},true);

/* ---------- החלקה עם האצבע בין הקטגוריות (ימינה / שמאלה) ---------- */
function swipe15(area,btnSel,onDone){
  let x0=null,y0=0,t0=0;
  area.addEventListener('touchstart',e=>{const t=e.target;if(t.closest('.catbar,input,textarea,select,.qp15,.hl15')){x0=null;return;}x0=e.touches[0].clientX;y0=e.touches[0].clientY;t0=Date.now();},{passive:true});
  area.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;
    if(Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)*0.6||Date.now()-t0>800)return;
    const btns=[...document.querySelectorAll(btnSel)];if(btns.length<2)return;const i=Math.max(0,btns.findIndex(b=>b.classList.contains('on')));
    const j=dx<0?Math.min(btns.length-1,i+1):Math.max(0,i-1);if(j===i)return;
    btns[j].click();if(onDone)onDone(dx<0?'l':'r');},{passive:true});
}
const slide15=(el,dir)=>{if(!el)return;el.classList.remove('sw15l','sw15r');void el.offsetWidth;el.classList.add(dir==='l'?'sw15l':'sw15r');};
swipe15($15('#paneHome'),'#paneHome .catbar [data-hcat]',d=>slide15($15('#homeCats'),d));
if($15('#catList'))swipe15($15('#catList'),'#catBar [data-ccat]',d=>slide15($15('#catList'),d));

/* ---------- מוצר שלא במאגר → מציעים קטגוריה ומוסיפים גם ל"הבית שלי" ---------- */
const known15=n=>!!(P[n]||NORMP[norm(n)]||(state.customPantry||[]).includes(n));
let unkQ15=[],unkT15=null,unkTries15=0;
const _v15AddItem=addItem;
addItem=function(name,qty){
  if(!can15('add')){flash(T('⛔ אין לך הרשאה להוסיף מוצרים','⛔ No permission to add'));return;}
  const wasKnown=known15(name);const l=curList();const had=l.items.some(i=>i.n===name&&!i.done);
  const r=_v15AddItem.apply(this,arguments);
  if(!had){const it=l.items.find(i=>i.n===name&&!i.done);if(it&&!it.by){it.by=myName15();save();}}
  if(!wasKnown&&name&&!hasProfanity(name)&&can15('home_edit')){unkQ15.push(name);clearTimeout(unkT15);unkT15=setTimeout(showUnknown15,700);}
  return r;};
async function showUnknown15(){
  const names=[...new Set(unkQ15)].filter(n=>!known15(n));
  if(!names.length){unkQ15=[];return;}
  if($15('#v8Sheet').classList.contains('open')||($15('#qp15')&&$15('#qp15').classList.contains('open'))){if(unkTries15++<20){unkT15=setTimeout(showUnknown15,2500);}return;}
  unkQ15=[];unkTries15=0;
  const opt=sel=>CATS.map(c=>'<option value="'+esc(c)+'"'+(c===sel?' selected':'')+'>'+CATE[c]+' '+esc(c)+'</option>').join('');
  const b=openSheet('🆕 '+T('מוצר חדש — לאיזו קטגוריה?','New product — which category?'),
    '<p class="muted-note">'+T('המוצרים האלה עוד לא במאגר. בחרתי קטגוריה שנראית לי מתאימה — אפשר לאשר, לשנות את השם או את הקטגוריה. הם יתווספו גם ל"הבית שלי" (כ"חסר", כי הם ברשימת הקניות).','These products are new. Confirm or edit the category — they will also be added to My home.')+'</p>'+
    names.map((n,i)=>{const g=resolveCat(n);return '<div class="unk15" data-unk="'+i+'" data-orig="'+esc(n)+'"><input type="checkbox" data-f="on" checked aria-label="'+T('לכלול','Include')+'"><input data-f="name" value="'+esc(n)+'" maxlength="60" aria-label="'+T('שם','Name')+'"><select data-f="cat" aria-label="'+T('קטגוריה','Category')+'">'+opt(g)+'</select>'+(g==='אחר'?'<small class="aig" data-aig="1">🤖 '+T('בודקת...','Checking...')+'</small>':'')+'</div>';}).join('')+
    '<div class="row2"><button id="unkOk">✅ '+T('אישור — להוסיף לבית שלי','Confirm')+'</button><button id="unkNo" class="btn sec">'+T('לא עכשיו','Not now')+'</button></div>');
  b.querySelector('#unkNo').onclick=closeSheet;
  /* מה שהמשתמש בחר בעצמו גובר על ההצעה של הבינה המלאכותית (שמגיעה כמה שניות אחרי) */
  b.querySelectorAll('[data-unk] [data-f=cat]').forEach(se=>se.addEventListener('change',()=>{se.dataset.touched='1';const s=se.parentNode.querySelector('[data-aig]');if(s)s.textContent='';}));
  b.querySelector('#unkOk').onclick=()=>{
    const l=curList();let n0=0;
    b.querySelectorAll('[data-unk]').forEach(r=>{if(!r.querySelector('[data-f=on]').checked)return;const orig=r.dataset.orig;let name=r.querySelector('[data-f=name]').value.trim().slice(0,60)||orig;if(hasProfanity(name))return;const cat=r.querySelector('[data-f=cat]').value;
      P[name]={e:(P[name]&&P[name].e)||CATE[cat]||'🛒',c:cat};NORMP[norm(name)]=name;if(!state.customPantry.includes(name))state.customPantry.push(name);
      l.items.forEach(i=>{if(i.n===orig){i.n=name;i.c=cat;i.e=P[name].e;i.cm=1;}});try{myProdSet(name,{category:cat});}catch(e){}stockSet(name,0);n0++;});
    save();render();closeSheet();if(n0)flash('🏠 '+T('נוסף ל"הבית שלי" — בקטגוריה שבחרת','Added to My home'));};
  /* ניחוש חכם לקטגוריה (בינה מלאכותית) — רק למה שלא זיהיתי לבד */
  const unsure=names.filter(n=>resolveCat(n)==='אחר');
  if(unsure.length&&sb&&authUser){try{let {data,error}=await sb.functions.invoke('ai-chat',{body:{categorize:{items:unsure,cats:CATS}}});if(error&&error.context&&typeof error.context.json==='function'){try{data=await error.context.json();}catch(x){}}
    const m=(data&&data.categories)||{};b.querySelectorAll('[data-unk]').forEach(r=>{const c=m[r.dataset.orig];const se=r.querySelector('[data-f=cat]');if(c&&CATS.includes(c)&&!se.dataset.touched)se.value=c;const s=r.querySelector('[data-aig]');if(s)s.textContent=c?'🤖 '+T('הצעה','Suggested'):'';});}catch(e){b.querySelectorAll('[data-aig]').forEach(s=>s.textContent='');}}
  else b.querySelectorAll('[data-aig]').forEach(s=>s.textContent='');
}

/* ---------- יאמי: "תוסיפי חלב" → שואלת כמה, ולאן (רשימה / יש בבית / חסר בבית) ---------- */
let botAdd15=null;
const NUMQ15={'חצי':0.5,'אחד':1,'אחת':1,'שני':2,'שתי':2,'שניים':2,'שתיים':2,'שלוש':3,'שלושה':3,'ארבע':4,'ארבעה':4,'חמש':5,'חמישה':5,'שש':6,'שישה':6,'שבע':7,'שבעה':7,'שמונה':8,'תשע':9,'עשר':10,'עשרה':10};
function parseQtyAnswer15(t){t=norm(t).replace(/^(בערך|רק|תשים|תשימי|שים|שימי)\s+/,'');
  const m=t.match(/^(\d+(?:[.,]\d+)?|חצי|אחד|אחת|שני|שתי|שניים|שתיים|שלוש|שלושה|ארבע|ארבעה|חמש|חמישה|שש|שישה|שבע|שבעה|שמונה|תשע|עשר|עשרה)?\s*(יח|יחידה|יחידות|קג|ק"ג|ק״ג|קילו|קילוגרם|גרם|ליטר|ליטרים|חבילה|חבילות)?$/);
  if(!m||(!m[1]&&!m[2]))return null;let n=m[1]?(NUMQ15[m[1]]||parseFloat(m[1].replace(',','.'))):1;const u0=m[2]||'';
  const u=/^(קג|ק"ג|ק״ג|קילו|קילוגרם)$/.test(u0)?'ק״ג':/^גרם$/.test(u0)?'גרם':/^ליטר/.test(u0)?'ליטר':/^חביל/.test(u0)?'חבילות':'';
  if(m[1]==='חצי'&&!u)return {n:0.5,u:'ק״ג'};return n>0?{n,u}:null;}
const qStr15=(n,u)=>(n===1&&!u)?'':(n+(u?' '+u:''));
function botAskNext15(){const a=botAdd15;if(!a)return false;
  const i=a.items.findIndex(x=>x.q==null);
  if(i>=0){a.cur=i;botSay(T('כמה '+a.items[i].name+'? 🙂 (למשל: 2, 1 ק״ג, חצי קילו, 500 גרם — או "לא משנה")','How many '+a.items[i].name+'?'));return true;}
  a.stage='where';
  botSay(T('לאן להוסיף?','Where to?')+'\n1️⃣ '+T('לרשימת הקניות (וגם לסמן שחסר בבית)','To the shopping list (and mark missing at home)')+'\n2️⃣ '+T('למה שיש לי בבית','To what I have at home')+'\n3️⃣ '+T('רק לסמן שחסר לי בבית','Only mark as missing at home')+'\n'+T('(אפשר לכתוב מספר או במילים)','(number or words)'));return true;}
function botFinish15(where){const a=botAdd15;botAdd15=null;const out=[];
  a.items.forEach(x=>{const name=x.name,qs=qStr15(x.q||1,x.u||'');
    if(where===1){addItem(name,qs);if(can15('home_edit'))stockSet(name,0);out.push('🛒 '+name+(qs?' ×'+qs:''));}
    else if(where===2){if(!known15(name)){P[name]={e:CATE[resolveCat(name)]||'🛒',c:resolveCat(name)};NORMP[norm(name)]=name;state.customPantry.push(name);}stockSet(name,x.q||1,{u:x.u||''});out.push('🏠 '+name+' — '+fmtQ15(x.q||1,x.u||''));}
    else{if(!known15(name)){P[name]={e:CATE[resolveCat(name)]||'🛒',c:resolveCat(name)};NORMP[norm(name)]=name;state.customPantry.push(name);}stockSet(name,0);out.push('❗ '+name+' — '+T('חסר בבית','missing'));}});
  save();render();
  return botSay((where===1?T('הוספתי לרשימה ✅ וסימנתי שחסר בבית','Added to the list ✅'):where===2?T('עדכנתי במה שיש לך בבית 🏠','Updated your home 🏠'):T('סימנתי שחסר בבית ❗','Marked as missing ❗'))+'\n'+out.join('\n'));}
/* עברו לנושא אחר באמצע "כמה?" / "לאן?" — לא מאבדים: מה שביקשו להוסיף נכנס לרשימת הקניות */
function keepPending15(){const a=botAdd15;botAdd15=null;if(!a||!a.items||!a.items.length)return;
  const out=a.items.map(x=>{const qs=qStr15(x.q||1,x.u||'');addItem(x.name,qs);return x.name+(qs?' ×'+qs:'');});save();render();
  botSay('🛒 '+T('הוספתי לרשימה: ','Added to the list: ')+out.join(', '));}
async function v15BotPre(raw){
  const t=norm(raw);
  if(botAdd15){const a=botAdd15;
    if(/^(בטל|ביטול|עזוב|לא משנה הכל|תעזבי)$/.test(t)){botAdd15=null;botSay(T('בסדר, ביטלתי 🙂','OK, cancelled 🙂'));return true;}
    if(a.stage==='name'){if(/^(אני )?(רוצה|צריך|צריכה)?\s*(להוסיף|תוסיפי|תוסיף|הוסף|הוסיפי|תוסיפו)(\s+(מוצר|משהו|פריט))?$/.test(t)){botSay(T('איזה מוצר להוסיף? 🙂','Which product?'));return true;}
      const c=yamiCanon(raw);if(/^תוסיפי /.test(c))raw=c.slice(7);const its=parseItems(raw);if(!its.length){botAdd15=null;return false;}a.items=its.map(i=>{const p=i.qty?(qtyParts(i.qty)||null):null;return {name:i.name,q:p?p.n:null,u:p?(/^(קג|קילו)$/.test(p.u)?'ק״ג':p.u):''};});a.stage='qty';return botAskNext15();}
    if(a.stage==='qty'){const it=a.items[a.cur];
      if(/^(לא משנה|לא יודע|לא יודעת|דלג|רגיל|סתם)$/.test(t)){it.q=1;it.u='';return botAskNext15();}
      const q=parseQtyAnswer15(raw);if(q){it.q=q.n;it.u=q.u;return botAskNext15();}keepPending15();}
    if(a.stage==='where'){
      if(/^(1|אחת|אחד|לרשימה|רשימה|לרשימת הקניות|לקניות|לסל)/.test(t))return botFinish15(1),true;
      if(/^(2|שתיים|שניים|יש לי|יש בבית|בבית|למה שיש)/.test(t))return botFinish15(2),true;
      if(/^(3|שלוש|חסר|חסר בבית|אין לי|נגמר)/.test(t))return botFinish15(3),true;
      keepPending15();}
  }
  /* "תוסיפי את הכל" כשאין שום דבר שמחכה — שואלת מה להוסיף, ולא מוסיפה "הכל" */
  const askProd=/^(אני )?(רוצה|רוצים|צריך|צריכה|בא לי)?\s*(להוסיף|הוספת|תוסיפי|תוסיף|הוסף|הוסיפי|תוסיפו)\s+(מוצר|משהו|פריט)$/.test(t)||
    (!state.pending&&!state.pendingRecipe&&/^(תוסיפי|תוסיף|הוסף|הוסיפי|תוסיפו)\s+(את\s+)?(הכל|הכול|אותם|זה|את זה)$/.test(t));
  if(askProd){botAdd15={stage:'name',items:[]};botSay(T('איזה מוצר להוסיף? 🙂','Which product?'));return true;}
  const looksQ=/[?？]$/.test(raw.trim())||/^(מה|איך|למה|מי|מתי|איפה|כמה|האם|היכן|אפשר)(\s|$)/.test(t)||YAMI_ASK.test(t);
  if(!looksQ&&ADDVERBS.test(t)&&t.length<120&&!/^(יש לי|יש בבית|אין לי|קניתי|הבאתי|השתמשתי|הסר|מחק|תמחק|למד|סיימתי|גמרתי|סיום|רשימה חדשה|עוד יכולות|עוד דבר תורה|עוד דת|עוד ד״ת|עוד בדיחה|עוד שאלה|עוד משהו$)/.test(t)&&!/(תוכנית|מתכון|חמין|צולנט|קנייה|קניה|קניות|הקנייה|עזרה|לעזור|תעזרי)/.test(t)&&!(/(^|\s)(ב|ל)?יום (ראשון|שני|שלישי|רביעי|חמישי|שישי)(\s|$)/.test(t)&&/(^|\s)(צריך|צריכה|רק)(\s|$)/.test(t))){
    const its=parseItems(raw);if(!its.length||its.length>8)return false;
    if(!its.every(i=>known15(i.name)||(i.name.split(' ').length<=4&&!yamiNotProduct(i.name))))return false;
    botAdd15={stage:'qty',items:its.map(i=>{const p=i.qty?(qtyParts(i.qty)||null):null;return {name:i.name,q:p?p.n:null,u:p?(/^(קג|קילו)$/.test(p.u)?'ק״ג':p.u):''};})};
    return botAskNext15();}
  /* "יש לי X" בלי כמות → שואלת כמה */
  const mh=t.match(/^(?:יש לי|יש בבית)\s+(.+)$/);
  if(mh&&!/\d/.test(mh[1])&&!looksQ&&!/^(חנות|סופר|עסק|מכולת|שאלה|בעיה|רעיון|זמן|הצעה|בקשה)(\s|$)/.test(mh[1])){const its=parseItems(mh[1]);if(its.length===1&&!its[0].qty&&can15('home_edit')){botAdd15={stage:'qty',items:[{name:its[0].name,q:null,u:''}],whereFixed:2};
    botSay(T('כמה '+its[0].name+' יש לך בבית? 🙂','How many '+its[0].name+' at home?'));botAdd15.cur=0;botAdd15.stage='qtyHave';return true;}}
  return false;
}
/* "יש לי X" → אחרי הכמות מעדכנים ישר בבית */
const _v15Pre=v15BotPre;
async function v15BotPre2(raw){
  if(botAdd15&&botAdd15.stage==='qtyHave'){const t=norm(raw);const it=botAdd15.items[0];
    if(/^(לא משנה|לא יודע|לא יודעת|דלג)$/.test(t)){it.q=1;}else{const q=parseQtyAnswer15(raw);if(!q){botAdd15=null;return false;}it.q=q.n;it.u=q.u;}
    botFinish15(2);return true;}
  return _v15Pre(raw);}
yamiStep(v15BotPre2);
/* "תוסיפי לרשימת שבת חלה" → חלה נכנסת לרשימה "שבת" (ולא מוצר בשם "לרשימת שבת חלה") */
yamiStep(async function namedListAdd(raw){
  const m=norm(raw).match(/^(?:תוסיפי|תוסיף|הוסיפי|הוסף|תוסיפו|תכניסי|תכניס|שימי|שים|תרשמי|רשמי)\s+(?:לי\s+|גם\s+)*(?:ל|ב)רשימת\s+(.+)$/);if(!m)return false;
  const rest=m[1];const lists=(state.lists||[]).slice().sort((x,y)=>norm(y.name).length-norm(x.name).length);
  const l=lists.find(x=>{const n=norm(x.name);return n&&(rest===n||rest.startsWith(n+' '));});
  if(!l){if(/^(ה)?קניות(\s|$)/.test(rest))return false;botSay(T('לא מצאתי רשימה כזאת 🤔 הרשימות שלך: ','No such list. Your lists: ')+state.lists.map(x=>x.name).join(', '));return true;}
  const items=rest.slice(norm(l.name).length).trim();const its=items?parseItems(items):[];
  if(!its.length){botSay(T('מה להוסיף לרשימה "'+l.name+'"? 🙂','What to add to "'+l.name+'"?'));return true;}
  const was=state.active;state.active=l.id;its.forEach(i=>addItem(i.name,i.qty||''));if(was!==l.id&&state.lists.some(x=>x.id===was))state.active=was;save();render();
  botSay('🛒 '+T('הוספתי לרשימה "'+l.name+'": ','Added to "'+l.name+'": ')+its.map(i=>i.name+(i.qty?' ×'+i.qty:'')).join(', '));return true;});
/* אחרי שליחה — שדה הכתיבה חוזר לגובה שורה אחת */
$15('#botSend').addEventListener('click',()=>{const t=$15('#botText');if(t)t.style.height='';});
$15('#botText').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!TOUCH_KB)setTimeout(()=>{e.target.style.height='';},0);});

/* ---------- קבלה: הנחות ומבצעים (שורות מינוס, "3 ב-10") — בלי כפילויות ---------- */
const rcptUnits15={};
function normalizeReceipt15(r){if(!r||!Array.isArray(r.items))return;
  const num=x=>{const v=parseFloat(String(x==null?'':x).replace(/[^\d.\-]/g,''));return isNaN(v)?0:v;};
  const out=[];
  r.items.forEach(it=>{const name=String(it.name||'').trim();const tot=num(it.total),pr=num(it.price);
    const isDisc=tot<0||pr<0||(/^(הנחה|הנחת|מבצע|קופון|זיכוי|discount)/.test(norm(name))&&!(num(it.qty)>0&&pr>0));
    if(isDisc&&out.length){const prev=out[out.length-1];const d=Math.abs(tot||pr);prev.discount=Math.round(((prev.discount||0)+d)*100)/100;
      prev.total=Math.round(((num(prev.total)||num(prev.price)*(num(prev.qty)||1))-d)*100)/100;const q=num(prev.qty)||1;prev.price=Math.round(prev.total/q*100)/100;
      prev.deal=(prev.deal?prev.deal+' · ':'')+(name||T('הנחה','Discount'));return;}
    if(isDisc)return;
    const key=norm(name)+'|'+norm(it.brand||'')+'|'+(it.barcode||'');const same=out.find(o=>o._k===key&&!(it.deal&&o.deal&&it.deal!==o.deal));
    if(same&&num(it.qty)>0){same.qty=Math.round((num(same.qty)+num(it.qty))*1000)/1000;same.total=Math.round((num(same.total)+(tot||pr*num(it.qty)))*100)/100;same.price=Math.round(same.total/same.qty*100)/100;if(it.discount)same.discount=Math.round(((same.discount||0)+num(it.discount))*100)/100;return;}
    const o=Object.assign({},it,{_k:key});if(!o.total&&pr)o.total=Math.round(pr*(num(it.qty)||1)*100)/100;
    if(it.discount&&num(it.discount)>0&&!o.deal)o.deal=T('הנחה','Discount')+' '+num(it.discount);
    if(/ק/.test(String(it.unit||''))&&/ג|קילו/.test(String(it.unit||'')))rcptUnits15[norm(name)]='ק״ג';
    out.push(o);});
  out.forEach(o=>{if(o.discount&&o.deal&&!/−/.test(o.deal))o.deal+=' (−'+o.discount+')';delete o._k;});
  r.items=out;r._sum=Math.round(out.reduce((s,o)=>s+num(o.total),0)*100)/100;}
const _v15ShowUpload=showUploadReview;
showUploadReview=function(){if(upMode==='receipt'&&upResult&&upResult.receipt&&!upResult.receipt._norm){normalizeReceipt15(upResult.receipt);upResult.receipt._norm=true;}
  const r=_v15ShowUpload.apply(this,arguments);
  if(upMode==='receipt'&&upResult&&upResult.receipt){const rc=upResult.receipt;const disc=rc.items.reduce((s,o)=>s+(Number(o.discount)||0),0)||Number(rc.discounts_total)||0;
    const box=$15('#upOut .urlist');if(box)box.insertAdjacentHTML('afterend','<p class="muted-note">🧮 '+T('סכום השורות: ','Lines sum: ')+fmtPrice(rc._sum||0,myCurrency())+(disc?' · 🔥 '+T('הנחות: ','Discounts: ')+fmtPrice(Math.round(disc*100)/100,myCurrency()):'')+(rc.total&&Math.abs((rc._sum||0)-rc.total)>1?' · ⚠️ '+T('לא תואם בדיוק לסה״כ בקבלה — כדאי לבדוק','Does not match the total — please check'):' ✔️')+'</p>');}
  return r;};
const _v15StockAdd=stockAdd;
stockAdd=function(n,q,extra){const u=rcptUnits15[norm(n)];if(u&&!(extra&&extra.u))extra=Object.assign({},extra||{},{u});return _v15StockAdd.call(this,n,q,extra);};

/* ---------- מי עשה מה: מי הוסיף, מי סימן שנקנה, מי אישר את הקנייה ---------- */
document.addEventListener('click',e=>{const el=e.target.closest('#paneList [data-tgl],#paneList [data-delitem],#paneList [data-finishpart]');if(!el)return;
  const d=el.dataset;
  if(d.tgl&&!can15('check')){e.preventDefault();e.stopImmediatePropagation();flash(T('⛔ אין לך הרשאה לסמן מוצרים','⛔ No permission'));return;}
  if(d.delitem&&!can15('delete')){e.preventDefault();e.stopImmediatePropagation();flash(T('⛔ אין לך הרשאה למחוק','⛔ No permission to delete'));return;}
  if(d.finishpart&&!can15('finish')){e.preventDefault();e.stopImmediatePropagation();flash(T('⛔ רק מי שקיבל הרשאה יכול לאשר קנייה','⛔ No permission to finish'));return;}
  if(d.tgl){const id=d.tgl;setTimeout(()=>{const i=curList().items.find(x=>x.id===id);if(!i)return;if(i.done)i.doneBy=myName15();else delete i.doneBy;save();},0);}
},true);
const _v15Bubble=bubble;
bubble=function(i){let h=_v15Bubble.apply(this,arguments);const me=myName15();const tags=[];
  if(i.by&&i.by!==me)tags.push('👤 '+esc(i.by));if(i.done&&i.doneBy&&i.doneBy!==me)tags.push('✓ '+esc(i.doneBy));
  if(tags.length)h=h.replace('<span class="t">','<span class="by15">'+tags.join(' · ')+'</span><span class="t">');return h;};
const _v15ClearDone=clearDone;
clearDone=function(){if(!can15('finish')){flash(T('⛔ רק מי שקיבל הרשאה יכול לאשר קנייה','⛔ No permission'));return null;}
  const l=curList();const done=l.items.filter(i=>i.done);const r=_v15ClearDone.apply(this,arguments);
  const h=state.history[0];if(r&&h&&!h.byId){h.by=myName15();h.byId=(authUser&&authUser.id)||'';h.items.forEach((x,k)=>{const src=done[k];if(src){if(src.by)x.by=src.by;if(src.doneBy)x.doneBy=src.doneBy;}});save();}
  return r;};
const _v15RemoveItem=removeItem;
removeItem=function(id){if(!can15('delete')){flash(T('⛔ אין לך הרשאה למחוק','⛔ No permission to delete'));return;}return _v15RemoveItem.apply(this,arguments);};

/* ---------- משתמשים משניים ---------- */
function can15(act){if(!roomAcc15||roomAcc15.role!=='secondary')return true;const p=roomAcc15.perms||{};
  if(act==='home_edit'&&p.view&&p.view.home===false)return false;return !(p.act&&p.act[act]===false);}
function canSee15(sec){if(!roomAcc15||roomAcc15.role!=='secondary')return true;const p=roomAcc15.perms||{};return !(p.view&&p.view[sec]===false);}
function applyPermsUi15(){
  const hide=(sel,h)=>document.querySelectorAll(sel).forEach(b=>{b.hidden=!!h;});
  hide('.tab[data-t="hist"]',!canSee15('history'));hide('.tab[data-t="home"]',!canSee15('home'));hide('.tab[data-t="list"]',!canSee15('lists'));
  hide('#miRecipes,#miRecipe',!canSee15('recipes'));
  if(typeof tab!=='undefined'&&((tab==='hist'&&!canSee15('history'))||(tab==='home'&&!canSee15('home')))){tab='list';setTimeout(()=>setTab('list'),0);}
  const sb15=$15('#secBadge15');if(sb15){sb15.hidden=!(roomAcc15&&roomAcc15.role==='secondary');if(!sb15.hidden)sb15.textContent='👥 '+T('מחובר/ת לחשבון של ','Linked to ')+(roomAcc15.owner_name||'');}
}
/* התחברות לחדר: משתמש משני קורא וכותב רק דרך השרת, לפי ההרשאות */
const _v15StartCloud=startCloud;
/* חשבון משותף (משתמש משני / קוד משפחתי) נשמר בשרת — לא רק במכשיר שבו הצטרפו.
   הצטרפו בדפדפן ונכנסו אחר כך באפליקציה (או במכשיר אחר)? מוצאים בשרת את החשבון שאני חבר/ה בו ומתחברים אליו */
async function mySharedRoom15(){if(!sb||!authUser||state.follow||state.merge)return null;
  try{const {data:rs,error}=await sb.rpc('my_rooms');if(error)return null;const o=(rs||[]).filter(x=>x&&x.role!=='owner'&&x.code);
    const sec=o.filter(x=>x.role==='secondary');return sec.length===1?sec[0]:(!sec.length&&o.length===1?o[0]:null);}catch(e){return null;}}
startCloud=async function(){
  clearInterval(roomPoll15);roomAcc15=null;
  {const pk=await mySharedRoom15();if(pk&&!state.follow){stopCloud();state.follow=pk.code;resetSynced();state.lists=[];save(true);
    flash('👥 '+T('מחובר/ת לחשבון המשותף','Connected to the shared account'));}}
  if(sb&&authUser&&state.follow){try{const {data}=await sb.rpc('room_access',{p_code:state.follow});roomAcc15=data||null;}catch(e){}
    /* בעל הרשימה החליף את הקוד — מוצאים את הקוד החדש של הרשימה שאני חבר/ה בה, בלי לאבד אותה */
    if(!roomAcc15){try{const {data:rs,error:re}=await sb.rpc('my_rooms');const o=(re?[]:rs||[]).filter(x=>x&&x.role!=='owner'&&x.code);
      /* הקוד שבידי הוא קוד ישן או הקוד האמיתי (שהוחלף בכינוי) — עוברים לחדר שאני חבר/ה בו; אם יש כמה, מעדיפים את זה שאני משני/ת בו */
      const sec=o.filter(x=>x.role==='secondary'),pk=sec.length===1?sec[0]:(o.length===1?o[0]:null);
      if(pk&&pk.code!==state.follow){state.follow=pk.code;save(true);const {data}=await sb.rpc('room_access',{p_code:state.follow});roomAcc15=data||null;flash('🔄 '+T('קוד הרשימה המשותפת התעדכן','Shared list code updated'));}}catch(e){}}}
  /* 👁️ שותף מוגבל בחשבון משותף — כמו משתמש משני: קורא וכותב רק דרך השרת, שמסנן לפי מה שבעל החשבון בחר */
  if(roomAcc15&&(roomAcc15.role==='secondary'||roomAcc15.role==='partner')){applyPermsUi15();return startSecondary15(state.follow);}
  const r=await _v15StartCloud.apply(this,arguments);
  if(sb&&authUser&&state.room){try{const {data}=await sb.rpc('room_access',{p_code:state.room});roomAcc15=data||null;}catch(e){}}
  applyPermsUi15();return r;};
async function pullSecondary15(first){
  const code=state.follow;if(!code)return;
  const {data,error}=await sb.rpc('room_get',{p_code:code});
  if(error)return;
  if(data==null){/* הוסר/ה ע"י המשתמש הראשי */flash('👋 '+T('המשתמש הראשי הסיר את הגישה שלך — חוזרים לרשימות שלך','Access removed'));
    clearInterval(roomPoll15);state.follow=null;roomAcc15=null;resetSynced();save(true);stopCloud();await startCloud();render();applyPermsUi15();return;}
  const before=JSON.stringify([state.lists,state.history,state.pantry,state.stock]);
  applyRemote(data,!!first);
  ['stock','missingHome','templates'].forEach(k=>{if(data[k]!==undefined)state[k]=first?data[k]:(k==='stock'?Object.assign({},data[k],state[k]||{}):data[k]);});
  save(true);if(JSON.stringify([state.lists,state.history,state.pantry,state.stock])!==before)render();
}
async function startSecondary15(code){
  state.room=code;cloudOn=true;save(true);
  await pullSecondary15(true);render();
  roomPoll15=setInterval(()=>{if(!document.hidden)pullSecondary15(false);},15000);
  const b=$15('#cloudBtn');if(b)b.textContent='👥 '+T('מחובר/ת לחשבון של ','Linked to ')+((roomAcc15&&roomAcc15.owner_name)||'');
}
const _v15PushCloud=pushCloud;
pushCloud=function(){
  if(!(roomAcc15&&(roomAcc15.role==='secondary'||roomAcc15.role==='partner')))return _v15PushCloud.apply(this,arguments);
  if(!cloudOn||!sb||!state.follow)return;
  clearTimeout(pushTimer);
  pushTimer=setTimeout(async()=>{try{const {data:latest}=await sb.rpc('room_get',{p_code:state.follow});if(latest&&typeof latest==='object')cleanRoom(latest);
    /* מחיקות שעשו אחרים (מצבות מהשרת) לא חוזרות */
    if(latest&&Array.isArray(latest.lists))state.lists=mergeLists(state.lists,latest.lists,latest.tomb);
    else if(latest&&latest.tomb){state.tomb=tombUnion(state.tomb,latest.tomb);state.lists=tombApply(state.lists,state.tomb);}
    const {error}=await sb.rpc(roomAcc15&&roomAcc15.role==='partner'?'merge_partner_put':'room_put',{p_code:state.follow,p_data:syncPayload(),p_by:myName15()});if(error)flash('⚠️ '+T('השמירה נכשלה — ','Save failed — ')+error.message);}catch(e){}},700);
};

/* הזמנה: קישור + סיסמה חד פעמית */
const PERM_LABELS15={view:[['lists',T('רשימות הקניות','Shopping lists')],['history',T('היסטוריית קניות','Shopping history')],['home',T('הבית שלי (מה יש ומה חסר)','My home')]].concat(RECIPES_OFF?[]:[['recipes',T('המתכונים שלי','My recipes')]]),
  act:[['add',T('להוסיף מוצרים','Add products')],['check',T('לסמן מה נקנה','Tick bought items')],['delete',T('למחוק מוצרים','Delete products')],['finish',T('לאשר קנייה (סיום קנייה)','Approve / finish shopping')],['home_edit',T('לעדכן מה יש בבית','Update home stock')]]};
const DEF_PERMS15={view:{lists:true,history:true,home:true,recipes:true},act:{add:true,check:true,delete:false,finish:true,home_edit:true}};
function permsForm15(p,pre){p=p||DEF_PERMS15;return '<div class="perm15"><b>👁️ '+T('מה הוא/היא יראו:','Can see:')+'</b>'+PERM_LABELS15.view.map(([k,l])=>'<label><input type="checkbox" data-pv="'+k+'"'+(p.view&&p.view[k]===false?'':' checked')+' id="'+pre+'v'+k+'"> '+l+'</label>').join('')+
  '<b>✋ '+T('מה מותר לעשות:','Can do:')+'</b>'+PERM_LABELS15.act.map(([k,l])=>'<label><input type="checkbox" data-pa="'+k+'"'+((p.act&&p.act[k]!==undefined?p.act[k]:DEF_PERMS15.act[k])?' checked':'')+' id="'+pre+'a'+k+'"> '+l+'</label>').join('')+'</div>';}
function readPerms15(box){const o={view:{},act:{}};box.querySelectorAll('[data-pv]').forEach(c=>o.view[c.dataset.pv]=c.checked);box.querySelectorAll('[data-pa]').forEach(c=>o.act[c.dataset.pa]=c.checked);return o;}
const permSummary15=p=>{p=p||{};const v=PERM_LABELS15.view.filter(([k])=>!(p.view&&p.view[k]===false)).map(x=>x[1]);const a=PERM_LABELS15.act.filter(([k])=>p.act?p.act[k]!==false&&(p.act[k]!==undefined||DEF_PERMS15.act[k]):DEF_PERMS15.act[k]).map(x=>x[1]);return '👁️ '+(v.join(', ')||T('כלום','nothing'))+'<br>✋ '+(a.join(', ')||T('רק צפייה','view only'));};
async function openMembers15(){
  if(!sb||!authUser){flash(T('צריך להיות מחוברים','Sign in first'));return;}
  if(roomAcc15&&roomAcc15.role==='secondary'){const b=openSheet('👥 '+T('משתמש משני','Secondary user'),'<p>'+T('את/ה מחובר/ת כמשתמש משני לחשבון של ','You are a secondary user of ')+'<b>'+esc(roomAcc15.owner_name||'')+'</b>.</p><p class="muted-note">'+permSummary15(roomAcc15.perms)+'</p><button id="secLeave" class="btn sec" style="width:100%">🚪 '+T('להתנתק ולחזור לרשימות שלי','Leave and return to my lists')+'</button>');
    b.querySelector('#secLeave').onclick=async()=>{if(!(await uiConfirm(T('להתנתק מהחשבון של '+(roomAcc15.owner_name||'')+'?','Leave?'))))return;try{await sb.rpc('leave_room',{p_code:state.follow});}catch(e){}clearInterval(roomPoll15);state.follow=null;roomAcc15=null;resetSynced();save(true);stopCloud();await startCloud();render();closeSheet();applyPermsUi15();flash('👋 '+T('חזרת לרשימות שלך','Back to your lists'));};return;}
  const b=openSheet('👥 '+T('משתמשים משניים','Secondary users'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');
  const {data,error}=await sb.rpc('room_members_list');
  if(error){b.innerHTML='<p class="muted-note">⚠️ '+(isAdmin()?T('צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית). ','Run the SQL again. '):'')+esc(error.message)+'</p>';return;}
  const d=data||{members:[],invites:[]};const lim=d.limit;const cnt=(d.members||[]).filter(m=>m.role==='secondary').length+(d.invites||[]).length;
  b.innerHTML='<p class="muted-note">'+T('משתמש משני מקבל גישה לנתונים שלך באפליקציה — ואת/ה מחליט/ה מה הוא רואה ומה מותר לו לעשות. כל פעולה שלו נרשמת עם השם שלו (למשל: מי אישר את הקנייה). אפשר להסיר בכל רגע.','Give access to your data with permissions you choose. Every action is recorded with their name. Remove anytime.')+'</p>'+
    (lim!=null?'<p class="muted-note">'+T('מותר עד ','Up to ')+lim+T(' משתמשים משניים (נקבע ע"י מנהל האתר)',' secondary users')+'</p>':'')+
    ((d.members||[]).length?'<h4>'+T('מחוברים','Members')+'</h4>'+(d.members||[]).map(m=>'<div class="mem15" data-mu="'+esc(m.user_id)+'"><div class="grow"><b>'+esc(m.name||T('משתמש','User'))+'</b> <small>'+(m.role==='secondary'?'· '+T('משני','secondary'):'· '+T('גישה מלאה (קוד משפחתי)','full access'))+' · '+esc(fmtDate(new Date(m.joined_at)))+'</small><div class="muted-note">'+(m.role==='secondary'?permSummary15(m.perms):T('רואה ועורך הכל','Sees and edits everything'))+'</div></div><div class="memb"><button class="btn sm sec" data-medit="'+esc(m.user_id)+'">✏️ '+T('הרשאות','Permissions')+'</button><button class="btn sm sec" data-mrm="'+esc(m.user_id)+'">🗑️ '+T('הסרה','Remove')+'</button></div></div>').join(''):'')+
    ((d.invites||[]).length?'<h4>'+T('הזמנות שעוד לא נוצלו','Pending invites')+'</h4>'+(d.invites||[]).map(i=>'<div class="mem15"><div class="grow">✉️ '+esc(i.label||T('הזמנה','Invite'))+' <small>· '+T('בתוקף עד ','valid until ')+esc(fmtDate(new Date(i.expires_at)))+'</small></div><button class="btn sm sec" data-icancel="'+esc(i.token)+'">'+T('ביטול','Cancel')+'</button></div>').join(''):'')+
    (!state.follow?'<div class="mem15"><div class="grow">🔑 '+T('קוד הרשימה: ','List code: ')+'<b dir="ltr">'+esc(state.room||'')+'</b><br><small>'+T('מישהו קיבל את הקוד ולא צריך גישה? מחליפים קוד — מי שכבר מחובר נשאר, והקוד הישן מפסיק לעבוד.','Code leaked? Change it — current members stay, the old code stops working.')+'</small></div><button class="mini" id="roomRotate19">🔄 '+T('החלפת קוד','Change code')+'</button></div>':'')+
    '<h4>➕ '+T('הזמנת משתמש משני','Invite a secondary user')+'</h4>'+
    (lim!=null&&cnt>=lim?'<p class="muted-note">⚠️ '+T('הגעת למספר המקסימלי של משתמשים משניים.','Limit reached.')+'</p>':
    '<input id="invLabel" maxlength="40" placeholder="'+T('למי? (למשל: אמא, דני) — רק בשבילך','For whom? (only for you)')+'">'+permsForm15(DEF_PERMS15,'ni')+'<button id="invCreate" style="width:100%">🔗 '+T('יצירת קישור + סיסמה חד פעמית','Create link + one-time code')+'</button><div id="invOut"></div>');
  b.onclick=async e=>{
    const t=e.target;
    if(t.closest('#invCreate')){const perms=readPerms15(b.querySelector('.perm15'));const label=($15('#invLabel').value||'').trim();if(hasProfanity(label)){flash('🙏');return;}
      t.disabled=true;const {data:inv,error:er}=await sb.rpc('room_invite_create',{p_perms:perms,p_label:label});t.disabled=false;
      if(er||!inv||inv.error){flash('⚠️ '+(inv&&inv.error==='limit'?T('הגעת למספר המקסימלי','Limit reached'):((er&&er.message)||'')));return;}
      const link=MAIN_SITE+'/#join-'+inv.token;/* הקישור והסיסמה החד פעמית נשלחים בנפרד — מי שרואה רק את ההודעה לא יכול להצטרף */
      const msg=T('הוזמנת להצטרף לרשימת הקניות שלי ב"רשימת קניות" 🛒\nנכנסים לקישור וכותבים את השם ואת הסיסמה החד פעמית — אותה אשלח לך בנפרד:\n','You are invited to my shopping list 🛒\nOpen the link and enter your name and the one-time code — I will send you the code separately:\n')+link;
      $15('#invOut').innerHTML='<div class="inv15"><p>✅ '+T('ההזמנה מוכנה (בתוקף 7 ימים, לשימוש אחד):','Invite ready (7 days, single use):')+'</p><label class="il">'+T('קישור','Link')+'</label><input readonly value="'+esc(link)+'" dir="ltr"><label class="il">'+T('סיסמה חד פעמית','One-time code')+'</label><input readonly value="'+esc(inv.otp)+'" dir="ltr" class="otp15">'+
        '<p class="muted-note">🔒 '+T('הסיסמה לא נשמרת אצלנו — רק כאן ועכשיו. הכפתורים למטה שולחים רק את הקישור; את הסיסמה שולחים בנפרד (הודעה אחרת או בעל פה).','The code is shown only now. The buttons below send only the link; send the code separately.')+'</p><button class="btn sec" id="invCopyCode" style="width:100%;margin-bottom:8px">🔢 '+T('העתקת הסיסמה החד פעמית','Copy the one-time code')+'</button><div class="row2 wrap15"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(msg)+'">💬 '+T('וואטסאפ','WhatsApp')+'</a><a class="btn sec" href="sms:?&body='+encodeURIComponent(msg)+'">✉️ SMS</a><a class="btn sec" href="mailto:?subject='+encodeURIComponent(T('הזמנה לרשימת הקניות שלי','Invite'))+'&body='+encodeURIComponent(msg)+'">📧 '+T('מייל','Email')+'</a><button class="btn sec" id="invCopy">📋 '+T('העתקת הקישור','Copy link')+'</button></div></div>';
      $15('#invCopy').onclick=async()=>{try{await navigator.clipboard.writeText(msg);flash('📋 '+T('הקישור הועתק','Link copied'));}catch(x){flash(msg);}};
      $15('#invCopyCode').onclick=async()=>{try{await navigator.clipboard.writeText(String(inv.otp));flash('🔢 '+T('הסיסמה הועתקה — שלחו אותה בהודעה נפרדת','Code copied — send it separately'));}catch(x){flash(String(inv.otp));}};return;}
    const rm=t.closest('[data-mrm]');if(rm){const row=rm.closest('[data-mu]');if(!(await uiConfirm(T('להסיר את '+row.querySelector('b').textContent+'? הגישה שלו/ה תיחסם מיד.','Remove this user?'))))return;const mm=(d.members||[]).find(x=>x.user_id===rm.dataset.mrm);const {error:er}=await sb.rpc('room_member_remove',{p_user:rm.dataset.mrm});flash(er?'⚠️ '+er.message:'🗑️ '+T('הוסר','Removed'));
      /* הסרת חבר עם גישה מלאה מחליפה את קוד הרשימה בשרת — מתחברים מחדש לקוד החדש כדי לא להמשיך לכתוב לישן */
      if(!er&&mm&&mm.role!=='secondary'&&!state.follow){stopCloud();await startCloud();render();}
      openMembers15();return;}
    if(t.closest('#roomRotate19')){if(!(await uiConfirm(T('להחליף את קוד הרשימה? הקוד הישן יפסיק לעבוד (מי שכבר מחובר נשאר מחובר).','Change the list code? The old code stops working.'))))return;
      const {data:nc,error:er}=await sb.rpc('room_rotate_code',{p_code:state.room});if(er||!nc){flash('⚠️ '+((er&&er.message)||T('לא הצלחתי להחליף','Could not change')));return;}
      state.room=nc;save(true);stopCloud();await startCloud();render();flash('✔️ '+T('הקוד הוחלף: ','New code: ')+nc);openMembers15();return;}
    const ic=t.closest('[data-icancel]');if(ic){await sb.rpc('room_invite_cancel',{p_token:ic.dataset.icancel});openMembers15();return;}
    const me=t.closest('[data-medit]');if(me){const m=(d.members||[]).find(x=>x.user_id===me.dataset.medit);const row=me.closest('[data-mu]');if(row.querySelector('.perm15'))return;
      row.insertAdjacentHTML('beforeend','<div class="pe15">'+(m.role!=='secondary'?'<p class="muted-note">'+T('כרגע יש לו/ה גישה מלאה. שמירה תהפוך אותו/ה למשתמש משני עם ההרשאות שתבחר/י.','Saving will make them a secondary user.')+'</p>':'')+'<input data-mname maxlength="40" value="'+esc(m.name||'')+'" placeholder="'+T('שם','Name')+'">'+permsForm15(m.role==='secondary'?m.perms:DEF_PERMS15,'me'+m.user_id.slice(0,6))+'<button data-msave="'+esc(m.user_id)+'">💾 '+T('שמירה','Save')+'</button></div>');return;}
    const ms=t.closest('[data-msave]');if(ms){const box=ms.closest('.pe15');const {error:er}=await sb.rpc('room_member_update',{p_user:ms.dataset.msave,p_perms:readPerms15(box),p_name:box.querySelector('[data-mname]').value.trim()});flash(er?'⚠️ '+er.message:'✔️ '+T('נשמר','Saved'));openMembers15();}
  };
}
/* כפתור בתפריט */
(function(){const host=$15('#hMenu details[data-g="acct"] .mgbody')||$15('#hMenu');if(!host)return;
  const b=document.createElement('button');b.id='miMembers';b.innerHTML='👥<span>'+T('משתמשים משניים והרשאות','Secondary users')+'</span>';host.insertBefore(b,host.firstChild);
  b.onclick=()=>{$15('#hMenu').classList.remove('open');openMembers15();};
  const badge=document.createElement('button');badge.id='secBadge15';badge.className='secbadge15';badge.hidden=true;badge.onclick=openMembers15;
  const ann=$15('#announce');if(ann)ann.insertAdjacentElement('beforebegin',badge);})();

/* הצטרפות מקישור: #join-XXXX → שם + סיסמה חד פעמית */
(function(){const m=(location.hash||'').match(/^#join-([a-f0-9]{20,64})$/);if(m){try{localStorage.setItem('yamJoin',m[1]);}catch(e){}history.replaceState(null,'',location.pathname);}})();
const joinToken15=()=>{try{return localStorage.getItem('yamJoin')||'';}catch(e){return '';}};
function joinLoginHint15(){const tok=joinToken15();const lc=$15('#login .lcard');if(!tok||!lc||$15('#joinHint15'))return;
  lc.insertAdjacentHTML('afterbegin','<div class="joinhint15" id="joinHint15">👥 '+T('קיבלת הזמנה להצטרף לרשימת קניות! קודם נכנסים או נרשמים (גם עם גוגל) — ואז כותבים שם וסיסמה חד פעמית.','You got an invite! Sign in first, then enter your name and code.')+'<button type="button" class="linkbtn" id="joinAnon15">⚡ '+T('כניסה מהירה בלי הרשמה','Quick entry without signing up')+'</button></div>');
  $15('#joinAnon15').onclick=async()=>{if(!sb)return;const {error}=await sb.auth.signInAnonymously();if(error)loginErr(T('כניסה מהירה לא מופעלת באתר — נרשמים עם מייל וקוד או עם גוגל 🙂','Quick entry is off — sign up instead'));};}
let joinWatch15=null;
async function checkJoin15(){const tok=joinToken15();if(!tok)return;if(!sb||!authUser){joinLoginHint15();return;}
  /* חלון אחר פתוח (למשל בחירת סוג חשבון) — מחכים שייסגר, ואז מציגים את ההצטרפות */
  if(!joinWatch15)joinWatch15=setInterval(()=>{if(!joinToken15()){clearInterval(joinWatch15);joinWatch15=null;return;}if(!$15('#jnGo')&&!$15('#v8Sheet').classList.contains('open'))checkJoin15();},3000);
  if($15('#v8Sheet').classList.contains('open')&&!$15('#jnGo'))return;if($15('#jnGo'))return;
  let info=null;try{const {data}=await sb.rpc('room_invite_info',{p_token:tok});info=data;}catch(e){}
  if(!info||!info.valid){try{localStorage.removeItem('yamJoin');}catch(e){}flash('⚠️ '+T('ההזמנה לא בתוקף (אולי כבר נוצלה או פגה). בקשו הזמנה חדשה.','Invite is not valid.'));return;}
  const b=openSheet('👥 '+T('הצטרפות לרשימת קניות','Join a shopping list'),'<p>'+esc(info.owner)+' '+T('הזמין/ה אותך להצטרף כמשתמש משני 🛒','invited you as a secondary user 🛒')+'</p>'+
    '<label class="il" for="jnName">'+T('השם שלך','Your name')+'</label><input id="jnName" maxlength="40" value="'+esc((state.user&&state.user.name)||'')+'" autocomplete="name">'+
    '<label class="il" for="jnOtp">'+T('סיסמה חד פעמית (קיבלת אותה עם הקישור)','One-time code')+'</label><input id="jnOtp" inputmode="numeric" maxlength="6" dir="ltr" autocomplete="one-time-code" class="otp15">'+
    '<p class="muted-note">'+T('אחרי ההצטרפות תראו את מה שהמשתמש הראשי שיתף איתכם. כל פעולה שלכם תירשם עם השם שלכם.','After joining you will see what was shared with you.')+'</p><div class="row2"><button id="jnGo">✅ '+T('הצטרפות','Join')+'</button><button id="jnNo" class="btn sec">'+T('לא עכשיו','Not now')+'</button></div><div class="err" id="jnErr" role="alert"></div>');
  b.querySelector('#jnNo').onclick=()=>{try{localStorage.removeItem('yamJoin');}catch(e){}closeSheet();};
  b.querySelector('#jnGo').onclick=async()=>{const name=$15('#jnName').value.trim(),otp=$15('#jnOtp').value.replace(/\D/g,'');
    if(!name||hasProfanity(name)){$15('#jnErr').textContent=T('נא לכתוב שם','Enter your name');return;}if(otp.length!==6){$15('#jnErr').textContent=T('הסיסמה החד פעמית היא 6 ספרות','The code has 6 digits');return;}
    const {data,error}=await sb.rpc('room_invite_accept',{p_token:tok,p_otp:otp,p_name:name});
    if(error||!data||data.error){const er=data&&data.error;$15('#jnErr').textContent=er==='bad_otp'?T('הסיסמה לא נכונה. נשארו '+Math.max(0,data.left)+' ניסיונות','Wrong code'):er==='self'?T('זו ההזמנה שלך עצמך 🙂','This is your own invite'):er==='used'||er==='expired'?T('ההזמנה כבר נוצלה או פגה — בקשו חדשה','Invite used or expired'):((error&&error.message)||T('משהו השתבש','Something went wrong'));return;}
    try{localStorage.removeItem('yamJoin');}catch(e){}
    stopCloud();state.follow=data.code;resetSynced();state.lists=[];save(true);
    await startCloud();if(!state.lists.length){state.lists=defState().lists;}if(!state.lists.find(l=>l.id===state.active))state.active=state.lists[0].id;
    save(true);render();closeSheet();applyPermsUi15();flash('🎉 '+T('הצטרפת! עכשיו רואים את הרשימות של ','Joined! ')+String(info.owner||''));};
}
const _v15OnSignedIn=onSignedIn;
onSignedIn=async function(){const r=await _v15OnSignedIn.apply(this,arguments);setTimeout(checkJoin15,900);return r;};
const _v15ShowLogin=showLogin;
showLogin=function(){const r=_v15ShowLogin.apply(this,arguments);joinLoginHint15();return r;};
/* אם כבר מחוברים כשהקוד הזה נטען — מתחברים מחדש לחדר עם ההרשאות, ובודקים הזמנה */
setTimeout(async()=>{if(sb&&authUser&&state.follow){stopCloud();await startCloud();render();}else if(sb&&authUser&&state.room){try{const {data}=await sb.rpc('room_access',{p_code:state.room});roomAcc15=data||null;}catch(e){}}try{render();}catch(e){}applyPermsUi15();checkJoin15();},1200);
joinLoginHint15();
