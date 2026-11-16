
/* ================= גרסה 16.5: סיור למשתמש חדש · רשימות מוכנות לשבת ולחגים · "נגמר בבית" ← לרשימה ================= */
const $165=s=>document.querySelector(s);
function sheet165(id,title,html){const old=document.getElementById(id);if(old)old.remove();const ov=document.createElement('div');ov.className='qp15 open';ov.id=id;
  ov.innerHTML='<div class="qpcard"><div class="qphead"><b>'+title+'</b><button aria-label="'+T('סגירה','Close')+'" data-x165>✕</button></div><div class="b165">'+html+'</div></div>';
  document.body.appendChild(ov);ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-x165]'))ov.remove();});return ov;}

/* ---------- 🧭 סיור קצר למשתמש חדש ---------- */
const TOUR165=[
  ['💚',T('ברוכים הבאים ל"רשימת קניות"!','Welcome!'),T('אתר חינמי לכל הבית — בטלפון ובמחשב. פתוח לכולם, עם או בלי נטפרי. הנה סיור קצר:','A free site for the whole home. Here is a short tour:')],
  ['📝',T('הרשימה','The list'),T('כותבים למטה מה צריך (אפשר גם כמות: "חלב 2") ולוחצים ➤, או מקליטים 🎤. אחרי ההוספה אפשר לבחור את המוצר המדויק (חברה וגודל).\nבחנות — לוחצים על מוצר כדי לסמן שנקנה, ובסוף "סיום קנייה" שומר את הקנייה בהיסטוריה.','Type what you need and tap ➤, or record 🎤. You can pick the exact product. Tap an item in the store to mark it bought.')],
  ['🗂️',T('הרשימות שלי','My lists'),T('אפשר לנהל כמה רשימות (לבית, לשבת, לחנות מסוימת) ולעבור ביניהן בלחיצה. במחשב הרשימות מופיעות בעמודה בצד.\nבלשונית "היסטוריה" רואים את הקניות הקודמות לפי תאריך, ואפשר לשכפל קנייה קודמת לרשימה חדשה.','Keep several lists and switch with a tap. The History tab shows past trips by date, and you can copy one to a new list.')],
  ['👥',T('רשימה משותפת','Shared list'),T('כל המשפחה רואה ומוסיפה לאותה רשימה בזמן אמת: ⚙️ ← משתמשים משניים והרשאות ← שולחים קישור וסיסמה חד פעמית, ובוחרים מה מותר לכל אחד.','The whole family shares one list in real time: ⚙️ → Secondary users.')],
  ['🔁',T('פריטים קבועים','Recurring items'),T('קונים חלב כל יומיים? כותבים ליאמי "3 חלב כל יומיים" — והוא ייכנס לרשימה לבד, בזמן. לשינוי או הפסקה: ⚙️ ← קניות והבית ← "🔁 פריטים קבועים".','Write to Yami "3 milk every 2 days" and it is added by itself.')],
  ['🏠',T('הבית שלי','My home'),T('רואים מה יש בבית ומה נגמר, והאתר מציע להוסיף לרשימה בלחיצה. יש גם 💰 תקציב הבית — כמה הוצאתם החודש מול התקציב.','See what you have at home and add what ran out in one tap. There is also a home budget.')],
  ['💰',T('מחירים וחנויות','Prices & stores'),T('משווים מחירים בין הרשתות, רואים מבצעים, ומוצאים סניפים עם ניווט בוויז. צילום קבלה 🧾 מעדכן הכל לבד.','Compare prices, see deals and find branches. A receipt photo updates everything.')],
  ['📷',T('סריקת ברקוד','Barcode scan'),T('סורקים ברקוד של מוצר — ומקבלים את שם המוצר, תמונה, אלרגנים ומחירים בחנויות. אפשר לסרוק ברצף ישר לרשימה.','Scan a barcode for the name, photo, allergens and prices.')],
  ['👩‍🍳',T('יאמי — העוזרת','Yami — your helper'),T('בכפתור 👩‍🍳 יאמי (בפינת המסך) כותבים מה צריך: "תוסיפי ביצים", "מה חסר לי בבית?" או "איפה הכי זול?". הכפתורים מעל שורת הכתיבה הם קיצורים.','Ask Yami to add items, check what is missing or find the cheapest store.')],
  ['🕯️',T('שבת וחגים','Shabbat & holidays'),T('ב-⚙️ ← "שבת וחגים": זמני היום ושבת לעיר שלכם, ו📋 רשימות מוכנות לשבת ולחגים — בוחרים רשימה ומוסיפים בלחיצה.','In ⚙️ → Shabbat & holidays: daily times and ready lists for Shabbat and holidays.')],
  ['📐',T('תצוגה','Display'),T('ב-⚙️ ← "גודל תצוגה ומה להציג" מגדילים את הכתב ובוחרים מה יופיע באתר. יש גם 🌙 מצב כהה ו♿ נגישות.\nשאלה לצוות? ⚙️ ← קשר עם האתר.','In ⚙️ → Display size: bigger text, dark mode, accessibility. Questions? ⚙️ → Contact us.')],
  ['📲',T('כמו אפליקציה','Like an app'),T('באנדרואיד אפשר להוריד את האפליקציה שלנו. באייפון: כפתור השיתוף ⬆️ ← "הוספה למסך הבית".\nזהו — אפשר להתחיל! 🎉','Android: download our app. iPhone: Share → Add to Home Screen.')]
];
function openTour165(){let i=0;const ov=sheet165('tour165','🧭 '+T('סיור באתר','Site tour'),'');
  const draw=()=>{const [ic,h,t]=TOUR165[i];ov.querySelector('.b165').innerHTML='<div class="t165"><div class="ic165">'+ic+'</div><h3>'+esc(h)+'</h3><p>'+esc(t).replace(/\n/g,'<br>')+'</p></div>'+
    '<div class="dots165">'+TOUR165.map((_,j)=>'<i class="'+(j===i?'on':'')+'"></i>').join('')+'</div>'+
    '<div class="row2 wrap15">'+(i?'<button class="btn sec" data-p165>→ '+T('הקודם','Back')+'</button>':'<button class="btn sec" data-x165>'+T('דלג','Skip')+'</button>')+
    '<button class="btn" data-n165>'+(i<TOUR165.length-1?T('הבא','Next')+' ←':'🎉 '+T('בואו נתחיל','Let\'s start'))+'</button></div>';};
  draw();try{localStorage.setItem('yam_tour165','1');}catch(e){}
  ov.addEventListener('click',e=>{if(e.target.closest('[data-n165]')){if(i<TOUR165.length-1){i++;draw();}else ov.remove();}else if(e.target.closest('[data-p165]')){i--;draw();}});}
/* מוצג פעם אחת — רק למשתמש חדש (בלי היסטוריה ועם רשימה כמעט ריקה) */
let tourTries165=0;
function tryTour165(){try{if(localStorage.getItem('yam_tour165'))return;
  const lg=document.querySelector('#login');const onLogin=lg&&getComputedStyle(lg).display!=='none';
  if(!state.user||onLogin||!authUser){if(++tourTries165<60)setTimeout(tryTour165,4000);return;}
  const fresh=!(state.history||[]).length&&(state.lists||[]).reduce((a,l)=>a+(l.items||[]).length,0)<=3;
  if(!fresh){localStorage.setItem('yam_tour165','1');return;}
  if(document.querySelector('.qp15.open,#v8Sheet.open,#updPop:not([hidden])')){if(++tourTries165<60)setTimeout(tryTour165,4000);return;}openTour165();}catch(e){}}
setTimeout(tryTour165,2500);

/* ---------- 📋 רשימות מוכנות לשבת ולחגים (המנהל עורך בבק אופיס) ---------- */
let READY165=[
  {e:'🕯️',n:'שבת',items:'חלות\nיין לקידוש\nנרות שבת\nעוף\nדגים\nתפוחי אדמה\nבצל\nגזר\nביצים\nחומוס\nטחינה\nסלטים\nקוגל\nבשר לחמין\nשעועית\nגריסים\nעוגה\nשתייה\nמפיות\nכלים חד פעמיים\nנייר אלומיניום'},
  {e:'🍎',n:'ראש השנה',items:'תפוחים\nדבש\nרימונים\nתמרים\nסילקא\nכרתי\nגזר\nדלעת\nראש דג\nחלות עגולות\nיין לקידוש\nנרות\nעוף\nבשר\nעוגת דבש\nפירות חדשים'},
  {e:'🌿',n:'סוכות',items:'חלות\nיין לקידוש\nנרות\nעוף\nבשר\nתפוחי אדמה\nסלטים\nשתייה\nכלים חד פעמיים\nמפות חד פעמיות\nעוגות\nפירות'},
  {e:'🕎',n:'חנוכה',items:'סופגניות\nשמן זית\nשמן לטיגון\nתפוחי אדמה\nבצל\nקמח\nביצים\nשמנת חמוצה\nנרות חנוכה\nפתילות\nמטבעות שוקולד'},
  {e:'🎭',n:'פורים',items:'יין\nחלות\nעוף\nבשר\nאוזני המן\nשוקולדים\nחטיפים\nשתייה קלה\nמגשי משלוח מנות\nצלופן\nסלסילות\nכלים חד פעמיים'},
  {e:'🍷',n:'פסח',items:'מצות שמורות\nיין\nמיץ ענבים\nחזרת\nחסה\nכרפס\nביצים\nזרוע\nחרוסת\nאגוזים\nתפוחים\nקמח מצה\nתפוחי אדמה\nעוף\nבשר\nשמן כשר לפסח\nמלח\nסוכר\nנייר כסף\nכלים חד פעמיים'},
  {e:'🧀',n:'שבועות',items:'גבינה לבנה\nגבינה צהובה\nשמנת מתוקה\nשמנת חמוצה\nחמאה\nבצק עלים\nעוגת גבינה\nלזניה\nפסטה\nחלב\nביצים\nירקות לסלט\nפירות'},
  {e:'🛒',n:'קנייה שבועית בסיסית',items:'חלב\nלחם\nביצים\nגבינה לבנה\nקוטג\'\nעגבניות\nמלפפונים\nבצל\nתפוחי אדמה\nבננות\nתפוחים\nאורז\nפסטה\nשמן\nסוכר\nקפה\nנייר טואלט\nסבון כלים'},
  {e:'🔥',n:'מנגל',items:'פחמים\nמצת\nסטייקים\nקבבים\nכנפיים\nפרגיות\nפיתות\nחומוס\nטחינה\nסלטים\nבצל\nעגבניות\nשתייה\nכלים חד פעמיים\nמפות חד פעמיות'}
];
const READY165_DEFAULT=READY165.slice();
const _v165ApplyConfig=applyConfig;
applyConfig=function(key,value){if(key==='readyLists'&&value&&Array.isArray(value.lists)&&value.lists.length)READY165=value.lists;return _v165ApplyConfig.apply(this,arguments);};
const readyItems165=r=>String(r.items||'').split('\n').map(x=>x.trim()).filter(Boolean);
function openReady165(){const m=$165('#hMenu');if(m)m.classList.remove('open');
  const ov=sheet165('ready165','📋 '+T('רשימות מוכנות','Ready lists'),'<p class="muted164">'+T('בוחרים רשימה, מורידים את מה שלא צריך, ומוסיפים בלחיצה.','Pick a list, untick what you don\'t need, and add.')+'</p><div class="g165">'+
    READY165.map((r,i)=>'<button data-r165="'+i+'"><span>'+esc(r.e||'📋')+'</span>'+esc(r.n)+'<small>'+readyItems165(r).length+' '+T('מוצרים','items')+'</small></button>').join('')+'</div>');
  ov.addEventListener('click',e=>{const b=e.target.closest('[data-r165]');if(!b)return;const r=READY165[+b.dataset.r165];const its=readyItems165(r);const l=curList();
    const inList=n=>l.items.some(x=>x.n===n&&!x.done);
    ov.querySelector('.qphead b').textContent=(r.e||'📋')+' '+r.n;
    ov.querySelector('.b165').innerHTML='<div class="row2 wrap15"><button class="btn sm sec" data-all165="1">✔ '+T('הכל','All')+'</button><button class="btn sm sec" data-all165="0">✖ '+T('כלום','None')+'</button></div><div class="ck165">'+
      its.map(n=>'<label><input type="checkbox" value="'+esc(n)+'" '+(inList(n)||pantryHas(n)?'':'checked')+'> '+esc(emojiOf(n)||'')+' '+esc(n)+(inList(n)?' <small>('+T('כבר ברשימה','already listed')+')</small>':pantryHas(n)?' <small>('+T('יש בבית','at home')+')</small>':'')+'</label>').join('')+'</div>'+
      '<div class="row2 wrap15"><button class="btn" data-add165="cur">➕ '+T('לרשימה','To list')+' "'+esc(l.name)+'"</button><button class="btn sec" data-add165="new">📝 '+T('רשימה חדשה','New list')+'</button></div>';
    ov.onclick=ev=>{const a=ev.target.closest('[data-all165]');if(a){ov.querySelectorAll('.ck165 input').forEach(c=>c.checked=a.dataset.all165==='1');return;}
      const d=ev.target.closest('[data-add165]');if(!d)return;const pick=[...ov.querySelectorAll('.ck165 input:checked')].map(c=>({n:c.value,q:''}));
      if(!pick.length){flash(T('לא נבחרו מוצרים','Nothing selected'));return;}
      if(d.dataset.add165==='new'){const nl={id:uid(),name:r.n.slice(0,40),items:[],created:Date.now()};state.lists.push(nl);state.active=nl.id;}
      const before=curList().items.length;addMany(pick);save();render();try{setTab('list');}catch(x){}ov.remove();
      flash('📋 '+T('נוספו '+(curList().items.length-before)+' מוצרים לרשימה "'+curList().name+'"','Added'));};
  });}
/* כפתור ברשימה ריקה + בתפריט */
const _v165Render=render;
render=function(){const r=_v165Render.apply(this,arguments);try{const em=$165('#paneList .empty');if(em&&!em.querySelector('[data-ready165]')){let w=em.querySelector('.emptybtns');if(!w){w=document.createElement('div');w.className='emptybtns';em.appendChild(w);}
  w.insertAdjacentHTML('beforeend','<button class="chip" data-ready165="1">📋 '+T('רשימות מוכנות לשבת ולחגים','Ready lists for Shabbat & holidays')+'</button>');}}catch(e){}return r;};
document.addEventListener('click',e=>{if(e.target.closest('[data-ready165]'))openReady165();});
(function(){const a=$165('#miAbout');if(!a)return;
  /* בתפריט ⚙️ ← "שבת וחגים" (אחרי זמני היום) */
  if(!$165('#miReady')){const z=$165('#miTorah16')||$165('#miZmanim');(z||a).insertAdjacentHTML(z?'afterend':'beforebegin','<button id="miReady">📋<span>'+T('רשימות מוכנות לשבת ולחגים','Ready lists')+'</span></button>');}
  if(!$165('#miTour'))a.insertAdjacentHTML('beforebegin','<button id="miTour">🧭<span>'+T('סיור באתר','Site tour')+'</span></button>');
  $165('#miReady').onclick=openReady165;$165('#miTour').onclick=()=>{$165('#hMenu').classList.remove('open');openTour165();};})();
try{render();}catch(e){}

/* ---------- "נגמר בבית" ← להוסיף לרשימה? ---------- */
const OUT165_OFF='yam_out165_off';let out165=[],out165T=0;
function noteOut165(n){try{if(localStorage.getItem(OUT165_OFF))return;}catch(e){}if(!n||out165.includes(n))return;out165.push(n);clearTimeout(out165T);out165T=setTimeout(showOut165,700);}
function showOut165(){const l=curList();const names=out165.filter(n=>!l.items.some(x=>x.n===n&&!x.done));out165=[];if(!names.length)return;
  const old=$165('#out165');if(old)old.remove();
  const bar=document.createElement('div');bar.id='out165';bar.setAttribute('role','status');
  bar.innerHTML='<span>🏠 '+T('נגמר בבית: ','Ran out: ')+'<b>'+esc(names.slice(0,4).join(', ')+(names.length>4?' +'+(names.length-4):''))+'</b></span><button class="btn sm" data-oa165>➕ '+T('לרשימה','Add to list')+'</button><button class="btn sm sec" data-ox165 aria-label="'+T('סגירה','Close')+'">✕</button>'+
    '<button class="lnk165" data-off165>'+T('לא לשאול יותר','Don\'t ask again')+'</button>';
  document.body.appendChild(bar);const kill=setTimeout(()=>bar.remove(),12000);
  bar.onclick=e=>{if(e.target.closest('[data-oa165]')){addMany(names.map(n=>({n,q:''})));save();render();flash('✅ '+T('נוסף לרשימה "'+curList().name+'"','Added'));}
    else if(e.target.closest('[data-off165]')){try{localStorage.setItem(OUT165_OFF,'1');}catch(x){}flash(T('בסדר — אפשר להפעיל שוב מ"הבית שלי"','OK'));}
    else if(!e.target.closest('[data-ox165]'))return;clearTimeout(kill);bar.remove();};}
const _v165StockSet=stockSet;
stockSet=function(n,q){const had=stockQty(n)>0||pantryHas(n);const r=_v165StockSet.apply(this,arguments);try{if(had&&!(Number(q)>0))noteOut165(n);}catch(e){}return r;};
const _v165PantrySet=pantrySet;
pantrySet=function(name,val){const had=pantryHas(name);const r=_v165PantrySet.apply(this,arguments);try{if(had&&!val)noteOut165(name);}catch(e){}return r;};
