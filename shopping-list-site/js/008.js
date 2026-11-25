
/* ================= גרסה 8 ================= */
let uiCfg={},meCfg={};
const $8=s=>document.querySelector(s);
function openSheet(title,html){$8('#v8SheetTitle').textContent=title;const b=$8('#v8SheetBody');b.innerHTML=html||'';$8('#hMenu').classList.remove('open');$8('#v8Sheet').classList.add('open');return b;}
function closeSheet(){$8('#v8Sheet').classList.remove('open');}
$8('#btnCloseSheet').onclick=closeSheet;
$8('#v8Sheet').addEventListener('click',e=>{if(e.target.id==='v8Sheet')closeSheet();});
function copyText(t){return navigator.clipboard.writeText(t).then(()=>flash('📋 '+T('הועתק','Copied'))).catch(async ()=>(await uiPrompt(T('העתיקו מכאן:','Copy:'),t)));}

/* ---------- מוצרים לפי חברות (מותגים) ---------- */
const BRANDS={
'חלב':['תנובה','טרה','שטראוס','יטבתה'],'שוקו':['תנובה','טרה','יטבתה'],'גבינה לבנה':['תנובה','שטראוס','טרה','גד'],'קוטג׳':['תנובה','שטראוס','טרה'],'גבינה צהובה':['עמק','תנובה','גד'],
'יוגורט':['דנונה','יופלה','תנובה'],'מעדן':['מילקי','דני','יופלה'],'שמנת':['תנובה','טרה'],'חמאה':['תנובה'],'ביצים':['גדולות L','ענקיות XL','חופש'],
'לחם':['אנג׳ל','ברמן','דוידוביץ'],'פיתה':['אנג׳ל','ברמן'],'לחמניות':['אנג׳ל','ברמן'],'חלה':['אנג׳ל','ברמן','דוידוביץ'],
'עוף':['עוף טוב','זוגלובק','מאמא עוף'],'חזה עוף':['עוף טוב','זוגלובק'],'נקניקים':['זוגלובק','טירת צבי','יחיעם'],'טונה':['סטארקיסט','ויליפוד','אחלה'],
'מים':['נביעות','מי עדן','נסטלה'],'שישיית מים':['נביעות','מי עדן'],'קולה':['קוקה קולה','זירו'],'מיץ':['פרימור','ספרינג','תפוזינה'],'קפה':['עלית','נסקפה','ג׳ייקובס','לנדוור'],'תה':['ויסוצקי','ליפטון'],'יין':['כרמל','ברקן','תשבי'],'בירה':['גולדסטאר','מכבי','טובורג'],
'קטשופ':['אסם','היינץ'],'מיונז':['תלמה','הלמנס'],'חומוס':['אחלה','צבר','שטראוס'],'טחינה':['הנסיך','אחוה','הר ברכה'],'ממרח שוקולד':['השחר העולה','נוטלה'],'ממרח חלווה':['אחוה','הנסיך'],
'פסטה':['אסם','ברילה'],'אורז':['סוגת','עדן','תבואות'],'קמח':['סוגת','שטיבל'],'סוכר':['סוגת'],'שמן זית':['יד מרדכי','עץ הזית'],'שמן':['עין בר','זוגלובק'],
'חטיף במבה':['אסם'],'ביסלי':['אסם'],'שוקולד':['עלית','פרה','מילקה'],'עוגיות':['אסם','לוטוס','מאפיית ברמן'],'גלידה':['שטראוס','נסטלה','בן אנד ג׳ריס'],
'סבון כלים':['פיירי','סנו','פלמוליב'],'אבקת כביסה':['אריאל','סנו מקסימה','פרסיל','טאצ׳'],'מרכך':['בדין','סנו'],'נייר טואלט':['לילי','שניה','טאצ׳'],'נייר סופג':['לילי','שניה'],'מגבונים':['האגיס','טאצ׳'],'אקונומיקה':['סנו','קליר'],
'שמפו':['פינוק','כיף','הד אנד שולדרס','פנטן'],'מרכך שיער':['פינוק','כיף','פנטן'],'תחליב רחצה':['פינוק','כיף','דאב','קרמה'],'סבון ידיים':['פינוק','כיף','דאב'],
'משחת שיניים':['קולגייט','סיגנל','סנסודיין'],'דאודורנט':['דאב','רקסונה','פינוק'],'חיתולים':['האגיס','טיטולים'],'מגבוני תינוק':['האגיס','טיטולים'],'טישו לאף':['לילי','טאצ׳']
};
[['תחליב רחצה','🧴','היגיינה'],['מרכך שיער','🧴','היגיינה'],['שמרים','🫙','רטבים וממרחים'],['שמיר','🌿','ירקות'],['שומשום','🌰','רטבים וממרחים'],['פירורי לחם','🍞','רטבים וממרחים'],['אטריות','🍝','רטבים וממרחים'],['פטריות קפואות','🍄','ירקות']].forEach(([n,e,c])=>{if(!P[n]){P[n]={e,c};NORMP[norm(n)]=n;}});
let dbProducts=[];
function registerBrand(name,brand){const full=(name+' '+brand).trim();if(!P[full]){P[full]={e:(P[name]&&P[name].e)||emojiOf(name),c:(P[name]&&P[name].c)||resolveCat(name),brand:true};NORMP[norm(full)]=full;}return full;}
Object.entries(BRANDS).forEach(([n,bs])=>bs.forEach(b=>registerBrand(n,b)));
function brandsOf(n){const s=new Set(BRANDS[n]||[]);dbProducts.forEach(p=>{if(p.brand&&norm(p.name)===norm(n))s.add(p.brand);});return Array.from(s);}
/* עד 10,000 מוצרים — הכי כבד בפתיחה. נשמר בטלפון ומתעדכן מהשרת פעם בכמה שעות */
async function loadDbProducts(){if(!sb)return;await cachedLoad('products',6*HOUR_MS,async()=>{const {data,error}=await sb.from('products').select('name,brand,category,barcode,emoji').limit(10000);return error?null:(data||[]);},data=>{dbProducts=data.filter(p=>p&&typeof p.name==='string'&&p.name);
  dbProducts.forEach(p=>{const c=CATS.includes(p.category)?p.category:resolveCat(p.name);if(!P[p.name]){P[p.name]={e:p.emoji?cleanEmo(p.emoji,p.name):(CATE[c]||'🛒'),c};NORMP[norm(p.name)]=p.name;}if(p.brand)registerBrand(p.name,p.brand);});});}
let catOpen='';
renderCats=function(q){q=norm(q||'');
  const base=Object.keys(P).filter(n=>!P[n].brand);
  const hit=n=>!q||norm(n).includes(q)||brandsOf(n).some(b=>norm(b).includes(q)||norm(n+' '+b).includes(q));
  $8('#catList').innerHTML=CATS.map(c=>{
    const its=base.filter(n=>P[n].c===c&&hit(n));if(!its.length)return '';
    return '<h4>'+CATE[c]+' '+c+'</h4><div class="pgrid">'+its.map(n=>{const bs=brandsOf(n);const open=catOpen===n||(q&&bs.some(b=>norm(b).includes(q)));
      return (bs.length?'<button class="hasb'+(open?' open':'')+'" data-brands="'+esc(n)+'" aria-expanded="'+open+'">'+P[n].e+' '+esc(n)+'</button>':'<button data-add="'+esc(n)+'">'+P[n].e+' '+esc(n)+'</button>')+
        (open?'<div class="brandrow"><small>'+T('בחרו חברה — או "כללי":','Pick a brand — or "any":')+'</small><button data-add="'+esc(n)+'">'+T('כללי','Any')+'</button>'+bs.map(b=>'<button class="br" data-add="'+esc(n+' '+b)+'">'+esc(b)+'</button>').join('')+'</div>':'');}).join('')+'</div>';
  }).join('')||'<div class="empty">'+T('לא נמצא 😕','Not found 😕')+'</div>';
};
$8('#catList').addEventListener('click',e=>{const b=e.target.closest('[data-brands]');if(!b)return;catOpen=catOpen===b.dataset.brands?'':b.dataset.brands;renderCats($8('#inCatSearch').value);});
/* סריקת ברקוד בתוך המאגר */
(function(){const ph=$8('#catOverlay .phead');const row=document.createElement('div');row.className='catscan';
  row.innerHTML='<button class="btn sec" id="catScan" type="button">📷 '+T('סריקת ברקוד של מוצר','Scan a barcode')+'</button>';ph.insertAdjacentElement('afterend',row);
  $8('#catScan').onclick=()=>openBarcodeScanner(code=>lookupBarcode(code));})();

/* ---------- סורק ברקוד כללי (גם לדיווח מחיר וגם למציאת מוצר) ---------- */
let scanCb=null;
openBarcodeScanner=async function(cb){
  scanCb=cb||(code=>{const el=$8('#prBarcode');if(el)el.value=code;flash('📷 '+T('ברקוד נסרק: ','Scanned: ')+code);});
  const ov=$8('#scanOverlay');ov.classList.add('open');const hint=$8('#scanHint');$8('#scanCode').value='';
  if(!('BarcodeDetector' in window)||!navigator.mediaDevices){hint.textContent=T('הדפדפן הזה לא סורק לבד — מקלידים את המספר שמתחת לפסים 🙂','This browser cannot scan — type the number under the bars 🙂');return;}
  hint.textContent=T('מכוונים את המצלמה לברקוד','Point the camera at the barcode');
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});barcodeStream=stream;
    const video=$8('#scanVideo');video.srcObject=stream;await video.play();
    const detector=new window.BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});
    const tick=async()=>{if(!ov.classList.contains('open'))return;
      try{const codes=await detector.detect(video);if(codes&&codes.length){const c=codes[0].rawValue;closeBarcodeScanner();scanCb&&scanCb(c);return;}}catch(e){}
      barcodeScanTimer=setTimeout(tick,350);};
    tick();
  }catch(e){hint.textContent=T('לא הצלחתי לפתוח את המצלמה — אפשר להקליד את הברקוד 🙂','Camera unavailable — type the code 🙂');}
};
$8('#scanGo').onclick=()=>{const c=$8('#scanCode').value.replace(/\D/g,'');if(c.length<4){flash(T('⚠️ ברקוד — לפחות 4 ספרות','⚠️ At least 4 digits'));return;}closeBarcodeScanner();scanCb&&scanCb(c);};
$8('#scanCode').addEventListener('keydown',e=>{if(e.key==='Enter')$8('#scanGo').click();});
async function lookupBarcode(code){
  const b=openSheet('📷 '+T('ברקוד ','Barcode ')+code,'<div class="empty">'+T('מחפשת...','Searching...')+'</div>');
  let prod=null,rows=[];
  if(sb){try{const r=await sb.from('products').select('name,brand,category,emoji').eq('barcode',code).maybeSingle();prod=r.data||null;}catch(e){}
    if(authUser){try{const {data}=await sb.from('prices').select(PRICE_COLS).eq('barcode',code).eq('status','approved').order('created_at',{ascending:false}).limit(60);rows=latestPerStore(data||[]);}catch(e){}}}
  const name=prod?(prod.name+(prod.brand?' '+prod.brand:'')):(rows[0]&&rows[0].product)||'';
  if(!name){b.innerHTML='<p class="muted-note">'+T('עוד לא מכירים את הברקוד הזה 🤷 — אפשר להוסיף אותו בדיווח מחיר, וכולם ירוויחו.','Unknown barcode 🤷 — add it with a price report.')+'</p><input id="bcName" maxlength="60" placeholder="'+T('מה המוצר?','What is the product?')+'"><div class="row2"><button id="bcAdd">➕ '+T('לרשימה','Add to list')+'</button><button class="btn sec" id="bcReport">💰 '+T('לדווח מחיר','Report price')+'</button></div>';}
  else{rows.sort((a,b2)=>a.price-b2.price);
    b.innerHTML='<div class="bizhead"><div class="av">'+esc(prod&&prod.emoji||emojiOf(name))+'</div><div><b>'+esc(name)+'</b><small>'+(prod?T('מתוך מאגר המוצרים','From the product catalog'):T('לפי דיווחים של משתמשים וחנויות','From user and store reports'))+'</small></div></div>'+
      (rows.length?'<div class="rank"><h3>💰 '+T('מחירים','Prices')+'</h3>'+rows.slice(0,8).map((r,i)=>'<div class="merow"><span>'+(i===0?'🥇':'🏪')+'</span><span class="grow"><b>'+esc(r.chain)+'</b><small>'+esc(prWhere(r))+' · '+agoText(r.created_at)+(r.verified?' · ✔ '+T('רשמי','official'):'')+'</small></span><b>'+fmtPrice(r.price,r.currency)+'</b></div>').join('')+'</div>':'<p class="muted-note">'+T('עוד אין מחירים לברקוד הזה.','No prices yet.')+'</p>')+
      '<input type="hidden" id="bcName" value="'+esc(name)+'"><div class="row2"><button id="bcAdd">➕ '+T('לרשימה','Add to list')+'</button><button class="btn sec" id="bcReport">💰 '+T('לדווח מחיר','Report price')+'</button></div>';}
  $8('#bcAdd').onclick=()=>{const n=$8('#bcName').value.trim();if(!n){flash(T('מה שם המוצר?','Product name?'));return;}if(hasProfanity(n)){flash('🙏');return;}addItem(n,'');closeSheet();$8('#catOverlay').classList.remove('open');};
  $8('#bcReport').onclick=()=>{const n=$8('#bcName').value.trim();closeSheet();$8('#catOverlay').classList.remove('open');setTab('prices');setTimeout(()=>{const a=$8('#prProduct'),c=$8('#prBarcode');if(a)a.value=n;if(c)c.value=code;if(a)a.focus();},300);};
}

const _v8BotChips=botChips;
botChips=function(){const b=_v8BotChips();b.push('🤝 היכרות');b.push('🧮 איך לחסוך');return b;};

/* ---------- עוד בדיחות ---------- */
JOKES.push(
'למה העגבנייה הסמיקה? כי היא ראתה את רוטב הסלט 🍅😳',
'מה אמר הלחם לחמאה? "אני מרוח עלייך" 🧈🍞',
'למה המלפפון לא הולך למסיבות? כי הוא תמיד נכבש 🥒',
'השוקולד אמר לגלידה: "את סתם קרה אליי" 🍫🍦',
'למה הרשימה שלי כל כך רגועה? כי סימנתי ✓ על כל הלחצים 😌',
'קניתי פלפל — ועכשיו הכל אצלי חריף מדי 🌶️',
'למה הבננה הלכה לרופא? כי היא לא הרגישה "קילוף" 🍌',
'מה אמר הקוגל לחלה? "בלעדייך זה לא שבת" 🍞🍮',
'למה הקפה הגיש תלונה? הוא הרגיש שמכים אותו כל בוקר ☕😅',
'הזמנתי משלוח של שעונים — הגיעו בדיוק בזמן ⏰',
'למה התפוח לא מאחר אף פעם? כי הוא עם "ליבה" במקום הנכון 🍎',
'אמרו לאורז שהוא קשה — אז הוא פשוט ספג את זה 🍚');

/* ---------- שיחות נפרדות עם יאמי ---------- */
function chatTitle(msgs){const m=(msgs||[]).find(x=>x.who==='me');return m?m.txt.slice(0,40):T('שיחה','Chat');}
/* לכל שיחה מזהה קבוע (state.botId) — כדי שהשיחה תסתנכרן בין המכשירים כאותה שיחה ולא תוכפל */
function archiveCurrent(){const cid=state.botId||uid();state.botId=uid();if((state.bot||[]).some(m=>m.who==='me')){state.botChats=(state.botChats||[]).filter(x=>x.id!==cid);state.botChats.unshift({id:cid,title:chatTitle(state.bot),ts:(state.bot[state.bot.length-1]||{}).ts||Date.now(),msgs:state.bot.slice(-150)});state.botChats=state.botChats.slice(0,30);}}
function newBotChat(silent){archiveCurrent();state.bot=[];state.pending=null;state.introFlow=null;save(true);$8('#botResume').hidden=true;
  botSay(silent?T('שיחה חדשה 🙂 במה אפשר לעזור?','New chat 🙂 How can I help?'):T('פתחתי שיחה חדשה ✨ במה אפשר לעזור, '+((state.user&&state.user.name)||'')+'?','New chat ✨ How can I help?'));}
$8('#botNew').onclick=()=>newBotChat();
$8('#botList').onclick=()=>{
  const list=state.botChats||[];
  const b=openSheet('🗂️ '+T('השיחות שלי עם יאמי','My chats with Yami'),
    '<button id="bcNewChat" style="width:100%;margin-bottom:10px">＋ '+T('שיחה חדשה','New chat')+'</button>'+
    (list.length?list.map(c=>'<div class="merow"><span>💬</span><span class="grow" data-openchat="'+esc(c.id)+'" style="cursor:pointer"><b>'+esc(c.title)+'</b><small>'+esc(agoText(c.ts))+' · '+c.msgs.length+' '+T('הודעות','messages')+'</small></span><button class="mini" data-openchat="'+esc(c.id)+'">'+T('פתיחה','Open')+'</button><button class="mini bad" data-delchat="'+esc(c.id)+'" aria-label="'+T('מחיקה','Delete')+'">✕</button></div>').join(''):'<p class="muted-note">'+T('עוד אין שיחות קודמות.','No previous chats.')+'</p>'));
  b.onclick=e=>{
    if(e.target.closest('#bcNewChat')){closeSheet();newBotChat();return;}
    const o=e.target.closest('[data-openchat]');if(o){const c=(state.botChats||[]).find(x=>x.id===o.dataset.openchat);if(!c)return;state.botChats=state.botChats.filter(x=>x.id!==c.id);archiveCurrent();state.bot=c.msgs;state.botId=c.id;save(true);closeSheet();renderBot();$8('#botResume').hidden=true;return;}
    const d=e.target.closest('[data-delchat]');if(d){state.botChats=(state.botChats||[]).filter(x=>x.id!==d.dataset.delchat);state.chatTomb=Object.assign({},state.chatTomb,{[d.dataset.delchat]:Date.now()});save(true);$8('#botList').click();}
  };
};
$8('#botResume').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$8('#botResume').hidden=true;if(b.dataset.r==='new')newBotChat();});
/* הסתרת ההצעות בבוט */
function applyBotTips(){$8('#botChips').classList.toggle('off',!!state.hideBotTips);$8('#botTips').classList.toggle('off',!!state.hideBotTips);$8('#botTips').title=state.hideBotTips?T('להציג את ההצעות','Show suggestions'):T('להסתיר את ההצעות','Hide suggestions');}
$8('#botTips').onclick=()=>{state.hideBotTips=!state.hideBotTips;save(true);applyBotTips();flash(state.hideBotTips?T('💡 ההצעות הוסתרו — לחיצה על 💡 מחזירה','Suggestions hidden — tap 💡 to bring back'):T('💡 ההצעות חזרו','Suggestions shown'));};

/* ---------- הכרות: יאמי שואלת כמה שאלות ולומדת את הלקוח ---------- */
const INTRO_Q=[
['people',()=>T('כמה נפשות אתם בבית? 🙂 (מספר, או "דלג")','How many people at home?')],
['stores',()=>T('איפה בדרך כלל קונים? אפשר כמה — למשל: רמי לוי, שוק העיר אונליין, המכולת השכונתית','Where do you usually shop?')],
['day',()=>T('באיזה יום בדרך כלל עושים את הקנייה הגדולה? ואם יש סיבה — ספרו לי (למשל: "יום ראשון, כי המשלוח חינם")','Which day do you usually shop, and why?')],
['staples',()=>T('מה קונים כמעט כל שבוע? (למשל: חלב, לחם, ביצים, עוף)','What do you buy almost every week?')],
['mode',()=>T('קונים יותר אונליין, בחנות — או גם וגם?','Online, in store, or both?')],
['notes',()=>T('ויש משהו שחשוב שאדע? כשרות, חברות שאוהבים, תקציב... (או "אין")','Anything else I should know?')]];
function introAsk(){const f=state.introFlow;const q=INTRO_Q[f.step];botSay((f.step===0?'':'👍 ')+q[1]()+(f.step===0?'':'\n('+(f.step+1)+'/'+INTRO_Q.length+')'));}
function startIntro(){state.introFlow={step:0};state.pending=null;save(true);botSay(T('איזה כיף! 🤝 כמה שאלות קצרות — ואדע לעזור לך הרבה יותר טוב. אפשר תמיד לכתוב "דלג" או "בטל".','Great! A few short questions 🤝'));introAsk();}
function findDayIn(t){if(/מוצאי שבת|מוצ"ש|מוצש/.test(t))return 6;for(let i=0;i<6;i++){if(t.includes('יום '+DAYS[i])||t.includes('ב'+DAYS[i])||(i>0&&t.split(' ').includes(DAYS[i]))||t.split(' ').includes(DAYS[i]))return i;}if(/ראשון/.test(t))return 0;return -1;}
function introAnswer(raw){
  const t=norm(raw);const f=state.introFlow;const me=meData();me.profile=me.profile||{};const skip=/^(דלג|לא יודע|לא יודעת|אין|לא)$/.test(t);
  if(/^(בטל|ביטול|עצור|די)$/.test(t)){state.introFlow=null;save(true);return botSay(T('בסדר גמור 🙂 אפשר להמשיך מתי שתרצו — "היכרות".','OK 🙂'));}
  const key=INTRO_Q[f.step][0];
  if(!skip){
    if(key==='people'){const n=parseInt(t.replace(/\D/g,''))||NUMW[t.split(' ')[0]]||0;if(n)me.profile.people=n;}
    if(key==='stores'){raw.split(/,|\s+ו(?=[א-ת])|\n|;/).map(x=>x.trim().replace(/^(ב|ב-|באתר של|בסופר|בחנות)\s*/,'')).filter(x=>x&&x.length<=40&&!hasProfanity(x)).forEach(n=>{if(!me.stores.some(s=>s.name===n))me.stores.push({id:uid(),name:n,kind:/אונליין|אתר|online|\.co/.test(n)||chainKind(n)==='online'?'online':'store',branch:'',url:''});});me.profile.stores=raw.trim().slice(0,200);}
    if(key==='day'){const d=findDayIn(t);if(d>=0){me.profile.day=d;const why=raw.replace(/^[^,]*?(כי|בגלל|מאחר)/,'$1').trim();const st=(me.stores[0]||{}).name||'';if(!me.orders.some(o=>+o.day===d))me.orders.push({id:uid(),store:st,day:d,time:'',note:(/כי|בגלל/.test(raw)?why:'').slice(0,80)});}me.profile.dayText=raw.trim().slice(0,200);}
    if(key==='staples'){const its=parseItems(raw);me.profile.staples=Array.from(new Set((its.length?its.map(i=>i.name):raw.split(/,|\s+ו(?=[א-ת])/).map(x=>x.trim()).filter(Boolean)))).slice(0,40);}
    if(key==='mode')me.profile.mode=/אונליין|online|אתר/.test(t)&&!/(גם|וגם|שניהם)/.test(t)?'online':/(גם|וגם|שניהם)/.test(t)?'both':'store';
    if(key==='notes')me.profile.notes=raw.trim().slice(0,300);
  }
  f.step++;meSave();
  if(f.step<INTRO_Q.length){save(true);return introAsk();}
  state.introFlow=null;me.profile.done=true;meSave();
  const p=me.profile;
  return botSay(T('תודה רבה! 💚 עכשיו אני מכירה אותך קצת:','Thank you! 💚 Here is what I learned:')+'\n'+[
    p.people?'👨‍👩‍👧 '+p.people+' '+T('נפשות','people'):'',
    me.stores.length?'🏪 '+me.stores.map(s=>s.name).join(', '):'',
    p.day!=null?'📅 '+T('קנייה גדולה ב','Big shop on ')+orderDayName(p.day):'',
    (p.staples||[]).length?'🛒 '+T('כל שבוע: ','Weekly: ')+p.staples.join(', '):'',
    p.mode?'🚚 '+({online:T('בעיקר אונליין','mostly online'),store:T('בעיקר בחנות','mostly in store'),both:T('גם וגם','both')}[p.mode]):'',
    p.notes?'📝 '+p.notes:''].filter(Boolean).join('\n')+'\n\n'+T('אזכיר לך ביום הקנייה, אציע מה להוסיף ואחפש מבצעים בשבילך. אפשר לעדכן הכל ב"👤 האזור האישי".','I will remind you on shopping day and look for deals. Update anytime in "👤 My area".'));
}

/* ---------- זמני היום, שבת ודף יומי (מחושב במכשיר) ---------- */
/* הדף היומי — מחושב ב-js/089-hcal.js (Hcal.daf) */
function dafYomi(d){try{return HC?HC.daf(d||new Date()):'';}catch(e){return '';}}
function zmanimLoc(){const g=state.geo;if(g&&g.lat&&Date.now()-(g.ts||0)<30*DAY_MS)return {lat:g.lat,lng:g.lng,name:g.city||T('המיקום שלי','My location')};const uc=userCity(),c=CITIES[uc];return {lat:c[0],lng:c[1],name:cityName(uc),tz:c[3]};}
function itimUrl(){const l=zmanimLoc();return 'https://itimlabina.co.il/calendar/weekly?address='+encodeURIComponent(l.name+', ישראל')+'&lat='+l.lat.toFixed(6)+'&lng='+l.lng.toFixed(6);}
function zmanimToday(){
  if(!HC)return null;const l=zmanimLoc();
  try{const z0=HC.zmanim(HC.rdOf(new Date()),{lat:l.lat,lon:l.lng}),z={};['alot','rise','shma','chatzot','mg','mk','plag','set','tzeit'].forEach(k=>{const v=z0&&z0[k];z[k]=()=>v;});
    const f=d=>{try{return d&&!isNaN(d)?new Intl.DateTimeFormat('he-IL',{hour:'2-digit',minute:'2-digit',timeZone:l.tz||'Asia/Jerusalem'}).format(d):'—';}catch(e){return fmtTime(d);}};
    return {place:l.name,alot:f(z.alot()),sunrise:f(z.rise()),shma:f(z.shma()),chatzot:f(z.chatzot()),minchaG:f(z.mg()),minchaK:f(z.mk()),plag:f(z.plag()),sunset:f(z.set()),tzeit:f(z.tzeit()),daf:dafYomi()};}catch(e){return null;}
}
function zmanimText(){const z=zmanimToday();if(!z)return T('לא הצלחתי לחשב זמנים כרגע 🙁','Could not compute times 🙁');
  return '📅 '+T('זמני היום ב','Times today in ')+z.place+' ('+hebDate(new Date())+'):\n🌅 '+T('זריחה','Sunrise')+': '+z.sunrise+'\n📖 '+T('סוף זמן ק"ש (גר"א)','Latest Shema')+': '+z.shma+'\n☀️ '+T('חצות','Midday')+': '+z.chatzot+'\n🕐 '+T('מנחה גדולה','Mincha Gedola')+': '+z.minchaG+'\n🕓 '+T('מנחה קטנה','Mincha Ketana')+': '+z.minchaK+'\n🕔 '+T('פלג המנחה','Plag HaMincha')+': '+z.plag+'\n🌇 '+T('שקיעה','Sunset')+': '+z.sunset+'\n✨ '+T('צאת הכוכבים','Nightfall')+': '+z.tzeit+'\n📚 '+T('הדף היומי: ','Daf Yomi: ')+z.daf+'\n\n'+T('לוח מלא ומדויק לפי המנהגים — באתר "עיתים לבינה":','Full calendar at Itim Labina:')+'\n'+itimUrl();}
/* המסך של זמני היום — js/090-hcal-ui.js (openZmanim) */

/* ---------- מיקום מדויק: החנויות והמבצעים הכי קרובים ---------- */
function exactLocation(){return new Promise(res=>{if(!navigator.geolocation)return res(null);let done=false;const fin=v=>{if(!done){done=true;res(v);}};setTimeout(()=>fin(null),12000);
  navigator.geolocation.getCurrentPosition(p=>{const lat=p.coords.latitude,lng=p.coords.longitude;const nc=nearestCity(lat,lng);state.geo={lat,lng,city:nc.km<40?nc.city:'',ts:Date.now()};if(nc.km<40)state.geoCity=nc.city;save(true);fin(state.geo);},()=>fin(null),{enableHighAccuracy:true,timeout:10000,maximumAge:600000});});}
function nearBranches(g,maxKm){
  const withPos=allBranches().filter(b=>typeof b.lat==='number'&&typeof b.lng==='number').map(b=>Object.assign({km:distKm(g.lat,g.lng,b.lat,b.lng)},b)).filter(b=>b.km<=(maxKm||15)).sort((a,b)=>a.km-b.km);
  if(withPos.length)return {exact:true,list:withPos};
  const city=g.city||myCity();return {exact:false,list:allBranches().filter(b=>b.city===city)};
}
async function openNearMe(){
  const b=openSheet('📍 '+T('קרוב אליך','Near you'),'<div class="empty">'+T('מאתרת את המיקום שלך...','Finding your location...')+'</div>');
  const g=await exactLocation();
  if(!g){b.innerHTML='<p class="muted-note">'+T('לא קיבלתי מיקום. כדי לראות חנויות ומבצעים קרובים — מאשרים "מיקום" בדפדפן (ליד כתובת האתר), או בוחרים עיר ב"👤 האזור האישי".','No location. Allow location in the browser, or set your city in "👤 My area".')+'</p>';return;}
  if(!storePosts.length&&sb&&authUser)await loadFeed();
  const nb=nearBranches(g,15);const chains=new Set(nb.list.map(x=>x.chain));const now=Date.now();
  const deals=storePosts.filter(p=>p.status==='approved'&&p.kind!=='news'&&(!p.ends_at||new Date(p.ends_at).getTime()>now)&&chains.has(p.chain));
  b.innerHTML='<p class="muted-note">📍 '+(nb.exact?T('לפי המיקום המדויק שלך','By your exact location'):T('לפי העיר: ','By city: ')+esc(g.city||myCity()||'—')+' · '+T('(למנהל: אפשר להוסיף מיקום מדויק לסניפים בבק אופיס)',''))+'</p>'+
    (deals.length?'<div class="rank"><h3>🔥 '+T('מבצעים קרובים','Deals nearby')+'</h3>'+deals.slice(0,10).map(p=>'<div class="merow"><span>🏷️</span><span class="grow"><b>'+esc(p.title)+'</b><small>'+esc(p.chain)+(p.ends_at?' · '+T('עד ','until ')+new Date(p.ends_at).toLocaleDateString('he-IL'):'')+'</small></span><button class="mini" data-biz="'+esc(p.chain)+'">'+T('לחנות','Store')+'</button></div>').join('')+'</div>':'<p class="muted-note">'+T('אין כרגע מבצעים מדווחים בחנויות הקרובות.','No reported deals nearby right now.')+'</p>')+
    (nb.list.length?'<div class="rank"><h3>🏪 '+T('חנויות קרובות','Stores nearby')+'</h3>'+nb.list.slice(0,20).map(x=>'<div class="merow"><span>'+chainAv(x.chain)+'</span><span class="grow"><b>'+esc(x.chain)+'</b><small>'+esc(x.city)+' · '+esc(x.address||'')+(x.km!=null?' · '+(x.km<1?Math.round(x.km*1000)+' '+T('מ׳','m'):x.km.toFixed(1)+' '+T('ק"מ','km')):'')+'</small></span><button class="mini" data-biz="'+esc(x.chain)+'">ℹ️</button><a class="mini" href="'+esc(wazeUrl(branchQuery(x)))+'" target="_blank" rel="noopener">🧭</a></div>').join('')+'</div>':'<p class="muted-note">'+T('לא מצאתי סניפים קרובים ברשימה שלנו.','No branches found nearby.')+'</p>');
  b.onclick=e=>{const z=e.target.closest('[data-biz]');if(z)openBiz(z.dataset.biz);};
}
/* "מבצעים לידי" — משתמש במיקום המדויק כשיש לסניפים מיקום */
const _v8NearbyDeals=nearbyDeals;
nearbyDeals=async function(useGeo){
  if(useGeo){const g=await exactLocation();if(g){const nb=nearBranches(g,10);if(nb.exact){const r=await _v8NearbyDeals(false);const here=new Set(nb.list.map(x=>x.chain));r.here=here;
    const now=Date.now();const mine=myProductNames().map(norm).filter(n=>n.length>=2);
    r.deals=storePosts.filter(p=>p.status==='approved'&&p.kind!=='news'&&(!p.ends_at||new Date(p.ends_at).getTime()>now)&&here.has(p.chain)).map(p=>({p,hit:mine.filter(n=>norm(p.title+' '+(p.body||'')).includes(n))})).sort((a,b)=>b.hit.length-a.hit.length);
    r.city=g.city?g.city+' ('+T('לפי המיקום המדויק','exact location')+')':T('קרוב אליך','near you');return r;}}}
  return _v8NearbyDeals(useGeo);
};

/* ---------- פרופיל עסקי של חנות + פנייה לחנות ---------- */
async function openBiz(name){
  const b=openSheet(typeIcon(name)+' '+name,'<div class="empty">'+T('טוען...','Loading...')+'</div>');
  let c=allChains().find(x=>x.name===name)||{name};
  if(sb){try{const {data}=await sb.from('chains').select('*').eq('name',name).maybeSingle();if(data)c=data;}catch(e){}}
  const canEdit=!!(authUser&&(isStaff()||(myStore&&myStore.chain===name)));
  const brs=allBranches().filter(x=>x.chain===name);const now=Date.now();
  const deals=storePosts.filter(p=>p.chain===name&&p.status==='approved'&&(!p.ends_at||new Date(p.ends_at).getTime()>now)).slice(0,8);
  const web=safeUrl(c.website||'');const wa=c.whatsapp?waHref(c.whatsapp):'';
  let h='<div class="biz"><div class="bizhead"><div class="av">'+(safeImg(c.logo)?'<img src="'+esc(safeImg(c.logo))+'" alt="">':typeIcon(name))+'</div><div><b>'+esc(name)+'</b><small>'+esc(typeName(chainCategory(name)))+(followerCounts[name]?' · '+followerCounts[name]+' '+T('עוקבים','followers'):'')+(c.hidden?' · 🙈 '+T('מוסתרת','hidden'):'')+'</small></div></div>'+
    (c.about?'<p style="white-space:pre-wrap;line-height:1.7">'+esc(c.about)+'</p>':'')+
    '<div class="bizinfo">'+(c.address?'<div><span>📍</span><span>'+esc(c.address)+'</span></div>':'')+(c.hours?'<div><span>🕘</span><span style="white-space:pre-wrap">'+esc(c.hours)+'</span></div>':'')+(c.phone?'<div><span>📞</span><span dir="ltr">'+esc(c.phone)+'</span></div>':'')+'</div>'+
    '<div class="bizlinks">'+followBtn(name)+(c.phone?'<a class="mini pri" href="'+esc(telHref(c.phone))+'">📞 '+T('חיוג','Call')+'</a>':'')+(wa?'<a class="mini" href="'+esc(wa)+'" target="_blank" rel="noopener">💬 WhatsApp</a>':'')+(web?'<a class="mini" href="'+esc(web)+'" target="_blank" rel="noopener">🌐 '+T('לאתר החנות','Website')+'</a>':'')+(c.address?'<a class="mini" href="'+esc(wazeUrl(name+' '+c.address))+'" target="_blank" rel="noopener">🧭 '+T('ניווט','Navigate')+'</a>':'')+'</div>'+
    (deals.length?'<div class="rank"><h3>🔥 '+T('מבצעים ועדכונים','Deals & updates')+'</h3>'+deals.map(p=>'<div class="merow"><span>'+(p.kind==='deal'?'🏷️':p.kind==='product'?'🆕':'📢')+'</span><span class="grow"><b>'+esc(p.title)+'</b><small>'+esc((p.body||'').slice(0,120))+(p.ends_at?' · '+T('עד ','until ')+new Date(p.ends_at).toLocaleDateString('he-IL'):'')+'</small></span></div>').join('')+'</div>':'')+
    (brs.length?'<details class="grp"><summary>📍 '+T('סניפים','Branches')+' ('+brs.length+')</summary>'+brs.map(x=>'<div class="branch"><span class="bra">'+esc(x.city)+'<small>'+esc(x.address||'')+(x.name?' · '+esc(x.name):'')+'</small></span><a class="waze" href="'+esc(wazeUrl(branchQuery(x)))+'" target="_blank" rel="noopener">🧭</a></div>').join('')+'</details>':'');
  if(authUser&&!canEdit)h+='<div class="mecard"><h4>✉️ '+T('פנייה לחנות','Contact the store')+'</h4><textarea id="bzMsg" maxlength="2000" placeholder="'+T('מה תרצו לשאול? (למשל: יש משלוחים לבני ברק?)','Your question')+'" style="min-height:70px"></textarea><input id="bzPhone" type="tel" maxlength="30" dir="ltr" style="text-align:right" placeholder="'+T('טלפון לחזרה (לא חובה)','Phone for a reply (optional)')+'"><button id="bzSend" style="width:100%">'+T('שליחה לחנות','Send')+' ✉️</button><p class="muted-note">'+T('החנות תראה את השם שלך, את ההודעה ואת הטלפון (אם כתבת). התשובה תגיע אליך כאן ובפעמון 🔔','The store sees your name, message and phone (if given).')+'</p><div id="bzMine"></div></div>';
  if(canEdit)h+='<div class="mecard"><h4>✏️ '+T('עריכת הפרופיל של החנות','Edit store profile')+'</h4>'+
    '<label class="il">'+T('על החנות','About')+'</label><textarea id="bzAbout" maxlength="2000" style="min-height:80px">'+esc(c.about||'')+'</textarea>'+
    '<div class="grid2"><div><label class="il">'+T('טלפון','Phone')+'</label><input id="bzP" maxlength="30" dir="ltr" value="'+esc(c.phone||'')+'"></div><div><label class="il">WhatsApp</label><input id="bzW" maxlength="30" dir="ltr" value="'+esc(c.whatsapp||'')+'"></div>'+
    '<div><label class="il">'+T('כתובת','Address')+'</label><input id="bzA" maxlength="200" value="'+esc(c.address||'')+'"></div><div><label class="il">'+T('אתר','Website')+'</label><input id="bzWeb" maxlength="200" dir="ltr" value="'+esc(c.website||'')+'"></div></div>'+
    '<label class="il">'+T('שעות פתיחה','Opening hours')+'</label><textarea id="bzH" maxlength="600" style="min-height:60px" placeholder="'+T('א׳–ה׳ 8:00–22:00 · ו׳ 7:00–14:00','Sun–Thu 8–22')+'">'+esc(c.hours||'')+'</textarea><button id="bzSave" style="width:100%">💾 '+T('שמירת הפרופיל','Save profile')+'</button></div>'+
    '<div class="mecard"><h4>📨 '+T('פניות מלקוחות','Customer messages')+'</h4><div id="bzInbox"><div class="empty">'+T('טוען...','Loading...')+'</div></div></div>';
  h+='</div>';b.innerHTML=h;
  const loadMine=async()=>{const el=$8('#bzMine');if(!el)return;const {data}=await sb.from('store_messages').select('*').eq('chain',name).eq('user_id',authUser.id).order('created_at',{ascending:false}).limit(10);
    el.innerHTML=(data||[]).map(m=>'<div class="msg"><div>'+esc(m.body)+'</div><small class="muted-note" style="margin:0">'+esc(agoText(m.created_at))+'</small>'+(m.reply?'<div class="rep">💬 '+esc(name)+': '+esc(m.reply)+'</div>':'<small class="muted-note" style="margin:0">⏳ '+T('ממתין לתשובה','Waiting for a reply')+'</small>')+'</div>').join('');};
  const loadInbox=async()=>{const el=$8('#bzInbox');if(!el)return;const {data,error}=await sb.from('store_messages').select('*').eq('chain',name).order('created_at',{ascending:false}).limit(100);
    if(error){el.innerHTML='<p class="muted-note">'+(isAdmin()?'⚠️ צריך להריץ שוב את קוד ה-SQL':T('אין פניות','No messages'))+'</p>';return;}
    el.innerHTML=(data||[]).length?(data||[]).map(m=>'<div class="msg'+(m.is_read?'':' unread')+'" data-mid="'+esc(m.id)+'"><div><b>'+esc(m.name||T('לקוח/ה','Customer'))+'</b>'+(m.phone?' · <span dir="ltr">'+esc(m.phone)+'</span>':'')+' · <small>'+esc(agoText(m.created_at))+'</small></div><div style="white-space:pre-wrap">'+esc(m.body)+'</div>'+(m.reply?'<div class="rep">'+T('התשובה שלך: ','Your reply: ')+esc(m.reply)+'</div>':'')+'<div class="row2"><input data-rep placeholder="'+T('תשובה...','Reply...')+'" maxlength="2000"><button class="mini pri" data-sendrep>'+T('שליחה','Send')+'</button>'+(m.phone?'<a class="mini" href="'+esc(waHref(m.phone))+'" target="_blank" rel="noopener">💬</a>':'')+'</div></div>').join(''):'<p class="muted-note">'+T('עוד אין פניות 🙂','No messages yet 🙂')+'</p>';
    const unread=(data||[]).filter(m=>!m.is_read).map(m=>m.id);if(unread.length)sb.from('store_messages').update({is_read:true}).in('id',unread).then(()=>{});};
  if(authUser&&!canEdit)loadMine();if(canEdit)loadInbox();
  b.onclick=async e=>{
    const fb=e.target.closest('[data-follow]');if(fb){await toggleFollow(fb.dataset.follow);openBiz(name);return;}
    if(e.target.closest('#bzSend')){const body=$8('#bzMsg').value.trim(),phone=$8('#bzPhone').value.trim();if(!body){flash(T('מה תרצו לכתוב?','Write a message'));return;}if(hasProfanity(body)){flash('🙏');return;}
      const {error}=await sb.from('store_messages').insert({chain:name,body:body.slice(0,2000),phone:phone.slice(0,30),user_id:authUser.id});if(error){flash('⚠️ '+error.message);return;}$8('#bzMsg').value='';flash('✉️ '+T('נשלח לחנות!','Sent!'));loadMine();return;}
    if(e.target.closest('#bzSave')){const v=id=>$8(id).value.trim();const p={about:v('#bzAbout'),phone:v('#bzP'),whatsapp:v('#bzW'),address:v('#bzA'),website:v('#bzWeb'),hours:v('#bzH')};if(Object.values(p).some(hasProfanity)){flash('🙏');return;}
      const {data,error}=await sb.rpc('store_profile_update',{p_chain:name,p});if(error||data!=='ok'){flash('⚠️ '+((error&&error.message)||data));return;}flash('💾 '+T('הפרופיל נשמר','Saved'));openBiz(name);return;}
    const sr=e.target.closest('[data-sendrep]');if(sr){const m=sr.closest('[data-mid]');const t=m.querySelector('[data-rep]').value.trim();if(!t)return;if(hasProfanity(t)){flash('🙏');return;}
      const {error}=await sb.from('store_messages').update({reply:t.slice(0,2000),is_read:true}).eq('id',m.dataset.mid);if(error){flash('⚠️ '+error.message);return;}flash('💬 '+T('התשובה נשלחה','Reply sent'));loadInbox();}
  };
}
storesPane.addEventListener('click',e=>{const z=e.target.closest('[data-biz]');if(z){e.stopPropagation();openBiz(z.dataset.biz);}else if(e.target.closest('#nearMe')){openNearMe();}},true);
const _v8RenderStores=renderStores;
renderStores=function(){_v8RenderStores();
  const top=document.createElement('div');top.className='row2';top.style.marginBottom='10px';
  top.innerHTML='<button class="btn" id="nearMe">📍 '+T('חנויות ומבצעים קרובים אליי','Stores & deals near me')+'</button>'+(myStore?'<button class="btn sec" data-biz="'+esc(myStore.chain)+'">🏪 '+T('החנות שלי: פרופיל ופניות','My store: profile & messages')+'</button>':'');
  storesPane.insertBefore(top,storesPane.querySelector('.seg')?storesPane.querySelector('.seg').nextSibling:storesPane.firstChild);
  storesPane.querySelectorAll('.chainrow').forEach(r=>{const n=r.querySelector('[data-openchain]');if(n&&!r.querySelector('[data-biz]')){const bt=document.createElement('button');bt.className='followbtn';bt.dataset.biz=n.dataset.openchain;bt.textContent='ℹ️ '+T('פרופיל','Profile');r.insertBefore(bt,r.lastElementChild);}});
  storesPane.querySelectorAll('.fhead .fstore').forEach(f=>{const n=f.querySelector('b');if(n){f.style.cursor='pointer';f.dataset.biz=n.textContent;}});
};

/* ---------- תצוגת צ'אטים (כמו וואטסאפ) ---------- */
function chatHomeAllowed(){return uiCfg.chatHome!==false;}
function chatHomeOn(){return chatHomeAllowed()&&!!state.chatHome;}
function renderChats(){
  const p=$8('#paneChats');if(!p)return;const l=curList();const open=l.items.filter(i=>!i.done);const h0=state.history[0];const lastBot=(state.bot||[]).slice(-1)[0];
  const unread=inbox.filter(x=>!x.read).length;const lr=latestRows[0];
  const rows=[
    ['list','📝',T('הרשימה','My list')+' · '+esc(l.name),open.length?open.slice(0,5).map(i=>esc(i.n)).join(', ')+(open.length>5?'…':''):T('הרשימה ריקה','Empty'),open.length,l.items.length?Math.max(...l.items.map(i=>i.ts||0)):0],
    ['bot','👩‍🍳',T('יאמי — העוזרת','Yami — assistant'),lastBot?esc(lastBot.txt.split('\n')[0].slice(0,70)):T('שואלים אותי הכל','Ask me anything'),0,lastBot?lastBot.ts:0],
    ['hist','🕘',T('היסטוריית קניות','Purchase history'),h0?esc((h0.store?h0.store+' · ':'')+h0.items.map(i=>i.n).slice(0,4).join(', ')):T('עוד אין קניות','No purchases yet'),0,h0?h0.ts:0],
    ['prices','💰',T('מחירים ומבצעים','Prices & deals'),lr?esc(lr.product+' — '+lr.chain):T('השוואת מחירים בין הרשתות','Compare prices'),0,lr?new Date(lr.created_at).getTime():0],
    ['stores','🏪',T('חנויות','Stores'),T('מבצעים, סניפים, פרופילים','Deals, branches, profiles'),typeof newFeedCount==='function'?newFeedCount():0,0],
    ['home','🏠',T('הבית שלי','My home'),T('מה יש במקרר','What is in the fridge'),0,0],
    ['me','👤',T('האזור האישי','My area'),T('כתובת, חנויות, נותני שירות, הרגלים','Address, stores, contacts'),0,0],
    ['notif','🔔',T('התראות','Notifications'),inbox[0]?esc(inbox[0].title):T('אין עדכונים חדשים','No new updates'),unread,inbox[0]?inbox[0].ts:0]
  ].filter(r=>!(r[0]==='bot'&&uiCfg.botHidden));
  p.innerHTML='<div class="chatlist">'+rows.map(([k,ic,t,sub,cnt,ts])=>'<button class="chatrow" data-chat="'+k+'"><span class="av">'+ic+'</span><span class="cb"><b>'+t+'</b><small>'+sub+'</small></span><span class="cm">'+(ts?'<span>'+fmtTime(new Date(ts))+'</span>':'')+(cnt?'<span class="cnt">'+(cnt>99?'99+':cnt)+'</span>':'')+'</span></button>').join('')+'</div>';
}
$8('#paneChats').addEventListener('click',e=>{const r=e.target.closest('[data-chat]');if(!r)return;const k=r.dataset.chat;
  if(k==='bot'){openBot();return;}if(k==='me'){openMe();return;}if(k==='notif'){openNotif();return;}setTab(k);});
const _v8SetTab=setTab;
setTab=function(t){
  if(t==='chats'&&!chatHomeOn())t='list';
  _v8SetTab(t);
  const inChats=t==='chats';$8('#paneChats').classList.toggle('on',inChats);document.body.classList.toggle('inchats',inChats);
  if(inChats){$8('#inputRow').classList.remove('on');renderChats();}
};
function applyChatHome(){const on=chatHomeOn();document.body.classList.toggle('chathome',on);$8('#miChats').hidden=!chatHomeAllowed();$8('#miChatsLabel').textContent=on?T('חזרה לתצוגת לשוניות','Back to tabs view'):T('תצוגת צ\'אטים (כמו וואטסאפ)','Chats view (like WhatsApp)');}
$8('#miChats').onclick=()=>{$8('#hMenu').classList.remove('open');state.chatHome=!state.chatHome;save(true);applyChatHome();setTab(state.chatHome?'chats':'list');flash(state.chatHome?'💬 '+T('תצוגת צ\'אטים','Chats view'):'📑 '+T('תצוגת לשוניות','Tabs view'));};
$8('#btnBack').onclick=()=>setTab('chats');
const _v8Render=render;
render=function(){_v8Render();if(tab==='chats')renderChats();$8('#miFavs').hidden=!(state.hideFavs||(state.favHidden||[]).length);};
$8('#miFavs').onclick=()=>{$8('#hMenu').classList.remove('open');state.hideFavs=false;state.favHidden=[];save(true);render();flash('⭐ '+T('המועדפים חזרו','Favourites are back'));};

/* ---------- הגדרות מהבק אופיס: הסתרת הבוט, תצוגת צ'אטים, אזור אישי ---------- */
function applyUi(){const hide=!!uiCfg.botHidden;$8('#botFab').hidden=hide;if(hide){$8('#botNudge').hidden=true;$8('#botSheet').classList.remove('open');}applyChatHome();if(!chatHomeAllowed()&&tab==='chats')setTab('list');if(tab==='chats')renderChats();}
const _v8ApplyConfig=applyConfig;
applyConfig=function(key,v){_v8ApplyConfig(key,v);if(key==='ui'){uiCfg=v||{};applyUi();}if(key==='me'){meCfg=v||{};applyMeCfg();}};
const _v8ShowNudge=showNudge;showNudge=function(t){if(uiCfg.botHidden)return;_v8ShowNudge(t);};
/* בפתיחה הראשונה — קודם ההיכרות, בלי הצעות אחרות באותו רגע */
let skipOffersOnce=false;
const _v8V7Offers=v7Offers;v7Offers=function(){if(skipOffersOnce)return;_v8V7Offers();};
const _v8OpenBot=openBot;
openBot=function(){if(uiCfg.botHidden)return;aiOff=false;
  const me0=meData();skipOffersOnce=!!state.user&&!(me0.profile&&me0.profile.done)&&!state.introOffered&&!state.introFlow;
  const last=(state.bot||[]).slice(-1)[0];const idle=last&&Date.now()-(last.ts||0)>30*60000&&(state.bot||[]).some(m=>m.who==='me');
  _v8OpenBot();applyBotTips();skipOffersOnce=false;
  if(idle){const r=$8('#botResume');r.innerHTML='<span>👋 '+T('ברוך/ה השב/ה! להמשיך מאיפה שעצרנו?','Welcome back! Continue where we left off?')+'</span><button class="mini pri" data-r="cont">'+T('להמשיך','Continue')+'</button><button class="mini" data-r="new">＋ '+T('שיחה חדשה','New chat')+'</button>';r.hidden=false;}
  v8Offers();
};
$8('#botFab').onclick=()=>openBot();

/* ---------- אזור אישי: ידידותי, וניתן לעריכה מהבק אופיס ---------- */
if(!ME_TABS.some(t=>t[0]==='purchases'))ME_TABS.splice(2,0,['purchases','🧾 הקניות שלי','🧾 My purchases']);
function applyMeCfg(){(meCfg.roles||[]).forEach((r,i)=>{if(r&&String(r).trim())PROV_ROLES['c'+i]=['📌',String(r).trim(),String(r).trim()];});}
const _v8RenderMe=renderMe;
renderMe=function(){
  const tabsOff=(meCfg.tabsOff||[]);if(tabsOff.includes(meTab))meTab='info';
  if(meTab==='purchases'){_v8RenderMe();$8('#meBody').innerHTML=purchasesHtml();}
  else _v8RenderMe();
  $8('#meSeg').querySelectorAll('[data-metab]').forEach(b=>{if(tabsOff.includes(b.dataset.metab))b.remove();});
  if(meTab==='info'){const me=meData();const nm=(state.user&&state.user.name)||'';
    const hero='<div class="mehero"><div class="av">'+esc((nm||'🙂').slice(0,1))+'</div><div><b>'+T('שלום','Hello')+' '+esc(nm)+' 👋</b><small>'+esc(meCfg.intro||T('כאן שומרים את כל מה שקשור אליך — וככה יאמי יודעת לעזור לך יותר טוב.','Everything about you, so Yami can help better.'))+'</small></div></div>'+
      '<div class="metiles"><button class="metile" data-q="intro"><span>🤝</span>'+(me.profile&&me.profile.done?T('לעדכן את ההיכרות','Update intro'):T('שיחת היכרות עם יאמי','Intro chat with Yami'))+'</button><button class="metile" data-q="reorder"><span>🔁</span>'+T('הקנייה הקודמת','Last shopping')+'</button><button class="metile" data-q="providers"><span>📞</span>'+T('נותני שירות','Contacts')+'</button><button class="metile" data-q="purchases"><span>🧾</span>'+T('מה קניתי ואיפה','What I bought')+'</button></div>';
    const fields=(meCfg.fields||[]).filter(f=>f&&f.label);
    const custom=fields.length?'<div class="mecard"><h4>📝 '+T('פרטים נוספים','More details')+'</h4>'+fields.map((f,i)=>'<label class="il" for="mcf'+i+'">'+esc(f.label)+'</label><input id="mcf'+i+'" data-cf="'+esc(f.id||f.label)+'" maxlength="200" placeholder="'+esc(f.placeholder||'')+'" value="'+esc(((me.custom||{})[f.id||f.label])||'')+'">').join('')+'<button id="mcfSave">💾 '+T('שמירה','Save')+'</button></div>':'';
    const prof=me.profile&&me.profile.done?'<div class="mecard"><h4>🤝 '+T('מה יאמי יודעת עליך','What Yami knows about you')+'</h4><p class="muted-note">'+[me.profile.people?me.profile.people+' '+T('נפשות','people'):'',me.profile.day!=null?T('קנייה גדולה ב','Big shop: ')+orderDayName(me.profile.day):'',(me.profile.staples||[]).length?T('כל שבוע: ','Weekly: ')+me.profile.staples.join(', '):'',me.profile.notes||''].filter(Boolean).map(esc).join(' · ')+'</p></div>':'';
    $8('#meBody').insertAdjacentHTML('afterbegin',hero+prof);$8('#meBody').insertAdjacentHTML('beforeend',custom);}
};
function purchasesHtml(){
  const q=norm(state.purQ||'');const list=state.history.filter(h=>!q||norm((h.store||'')+' '+h.items.map(i=>i.n).join(' ')).includes(q));
  return '<div class="mecard"><h4>🧾 '+T('מה קניתי ואיפה','What I bought and where')+'</h4><input id="purQ" placeholder="🔍 '+T('חיפוש מוצר או חנות...','Search product or store...')+'" value="'+esc(state.purQ||'')+'">'+
    (list.length?list.slice(0,100).map(h=>'<div class="merow"><span>🛍️</span><span class="grow"><b>'+esc(fmtDate(new Date(h.ts)))+' · '+fmtTime(new Date(h.ts))+'</b><small>'+(h.store?'🏪 '+esc(h.store)+' · ':'')+esc(h.listName||'')+(h.by?' · '+esc(h.by):'')+'</small><small>'+h.items.map(i=>esc(i.n)+(i.q?' ×'+esc(i.q):'')).join(' · ')+'</small></span></div>').join(''):'<p class="muted-note">'+T('עוד אין קניות. מסמנים ✓ ולוחצים "סיום קנייה" — וכל קנייה נשמרת כאן, עם החנות.','No purchases yet.')+'</p>')+'</div>';
}
$8('#meBody').addEventListener('click',e=>{const t=e.target.closest('[data-q]');if(t){const q=t.dataset.q;
  if(q==='intro'){$8('#meOverlay').classList.remove('open');openBot();startIntro();}
  if(q==='reorder')reorderLast();if(q==='providers'){meTab='providers';renderMe();}if(q==='purchases'){meTab='purchases';renderMe();}return;}
  if(e.target.closest('#mcfSave')){const me=meData();me.custom=me.custom||{};let bad=false;$8('#meBody').querySelectorAll('[data-cf]').forEach(i=>{if(hasProfanity(i.value))bad=true;me.custom[i.dataset.cf]=i.value.trim().slice(0,200);});if(bad){flash('🙏');return;}meSave();flash('💾 '+T('נשמר','Saved'));}},true);
$8('#meBody').addEventListener('input',e=>{if(e.target.id==='purQ'){state.purQ=e.target.value;const pos=e.target.selectionStart;renderMe();const n=$8('#purQ');if(n){n.focus();n.setSelectionRange(pos,pos);}}});

/* ---------- יומן קניות בשרת (כל הקניות נשמרות) ---------- */
const _v8FinishList=finishList;
finishList=function(silent,opts){const n=_v8FinishList(silent,opts);
  if(n&&!lastFinishTwin&&sb&&authUser){const h=state.history[0];const at=new Date(h.ts).toISOString();
    sb.from('purchases').insert(h.items.map(i=>({product:String(i.n).slice(0,80),qty:String(i.q||'').slice(0,20),store:String(h.store||'').slice(0,40),bought_at:at}))).then(()=>{},()=>{});}
  return n;};
/* קניות שנרשמו פעמיים לפני התיקון (סיום קנייה + קבלה מאותו יום) — מאחדים לקנייה אחת. הקבלה שנבלעה נזכרת, כדי שסנכרון ממכשיר אחר לא יחזיר אותה */
function mergeOldTwins(){
  if(!Array.isArray(state.history))return false;state.histGone=Array.isArray(state.histGone)?state.histGone:[];
  const gone=new Set(state.histGone);let ch=false;
  const kept=state.history.filter(h=>!(h&&gone.has(h.ts+'|'+h.listName)));if(kept.length!==state.history.length){state.history=kept;ch=true;}
  state.history.filter(h=>h&&h.receipt&&!h.linked).forEach(r=>{
    const t=state.history.find(h=>h&&!h.receipt&&!h.linked&&localDay(h.ts)===localDay(r.ts)&&sameShop(h.store,r.store));if(!t)return;
    t.listItems=t.items;t.items=r.items;t.receipt=true;t.linked=true;t.uploadedAt=r.uploadedAt||Date.now();if(r.store)t.store=r.store;
    state.history=state.history.filter(h=>h!==r);state.histGone.push(r.ts+'|'+r.listName);ch=true;
    /* בשרת: הקבלה כבר רשומה — מוחקים את שורות הקנייה מהרשימה */
    if(sb&&authUser)sb.from('purchases').delete().eq('bought_at',new Date(t.ts).toISOString()).then(()=>{},()=>{});});
  state.histGone=state.histGone.slice(-200);return ch;}
setTimeout(()=>{try{if(mergeOldTwins()){save();render();}}catch(e){}},0);
{const _ar=applyRemote;applyRemote=function(){const r=_ar.apply(this,arguments);try{mergeOldTwins();}catch(e){}return r;};}
function syncPurchaseStore(ts,store){if(!sb||!authUser||!store)return;sb.from('purchases').update({store:store.slice(0,40)}).eq('bought_at',new Date(ts).toISOString()).then(()=>{},()=>{});}

/* ---------- נגישות ---------- */
function applyA11y(){const a=prefs.a11y||{};const r=document.documentElement;r.classList.toggle('a11y-l',a.size===1);r.classList.toggle('a11y-xl',a.size===2);r.classList.toggle('a11y-hc',!!a.hc);r.classList.toggle('a11y-links',!!a.links);r.classList.toggle('a11y-calm',!!a.calm);}
function openA11y(){const a=prefs.a11y||{};
  const b=openSheet('♿ '+T('נגישות','Accessibility'),'<label class="il">'+T('גודל הטקסט','Text size')+'</label><div class="a11yopt">'+[[0,'א',T('רגיל','Normal')],[1,'א',T('גדול','Large')],[2,'א',T('גדול מאוד','Extra large')]].map(([v,l,n])=>'<button class="btn sec'+((a.size||0)===v?' on':'')+'" data-size="'+v+'" style="font-size:'+(14+v*4)+'px">'+l+' '+n+'</button>').join('')+'</div>'+
    [['hc',T('ניגודיות גבוהה','High contrast')],['links',T('קו תחתון לקישורים','Underline links')],['calm',T('בלי אנימציות','No animations')]].map(([k,n])=>'<label class="radio"><input type="checkbox" data-a="'+k+'"'+(a[k]?' checked':'')+'> '+n+'</label>').join('')+
    '<p class="muted-note">'+T('ההגדרות נשמרות במכשיר הזה. אפשר גם להגדיל עם ctrl ו-+ במחשב, או לפתוח את יאמי ולכתוב בקול 🎤','Saved on this device.')+'</p>'+
    '<p class="muted-note">⌨️ '+T('עובדים עם מקלדת? Tab לעבור בין כפתורים, Enter להפעלה, Esc לסגירת חלון.','Keyboard: Tab to move, Enter to activate, Esc to close.')+'</p>'+
    '<a class="btn sec" href="accessibility.html" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:8px;text-decoration:none">♿ '+T('הצהרת הנגישות ופנייה לרכז הנגישות','Accessibility statement & contact')+'</a>');
  b.onclick=e=>{const s=e.target.closest('[data-size]');if(s){prefs.a11y=Object.assign({},prefs.a11y,{size:+s.dataset.size});savePrefs();applyA11y();openA11y();}};
  b.onchange=e=>{const k=e.target.dataset.a;if(k){prefs.a11y=Object.assign({},prefs.a11y,{[k]:e.target.checked});savePrefs();applyA11y();}};
}
$8('#miA11y').onclick=openA11y;applyA11y();

/* ---------- תזכורת: עוד לא קנית ביום שבו את/ה רגיל/ה לקנות ---------- */
function usualDays(){const me=meData();const m=new Map();
  me.orders.forEach(o=>m.set(+o.day,o));if(me.profile&&me.profile.day!=null&&!m.has(+me.profile.day))m.set(+me.profile.day,{store:(me.stores[0]||{}).name||'',note:''});
  const H=habits();if(H.trips>=4){const fd=H.dows.indexOf(Math.max(...H.dows));if(!m.has(fd))m.set(fd,{store:Object.entries(H.stores).sort((a,b)=>b[1]-a[1]).map(x=>x[0])[0]||'',note:''});}
  return m;}
function checkShopDay(){
  if(!state.user)return;const d=new Date(),dow=d.getDay(),hr=d.getHours();const u=usualDays().get(dow);if(!u)return;
  if(dow===6?hr<19:hr<12)return;
  if(state.history.some(h=>dayKey(h.ts)===dayKey(d)))return;
  const what=T('היום '+orderDayName(dow)+' — בדרך כלל את/ה קונה'+(u.store?' ב'+u.store:'')+(u.note?' ('+u.note+')':'')+'.','Today is your usual shopping day'+(u.store?' at '+u.store:'')+'.');
  if(notify('shopday:'+dayKey(d),'order',T('עוד לא נרשמה קנייה היום 🛒','No purchase recorded today 🛒'),what+' '+T('רוצה שאכין רשימה?','Want me to prepare a list?'),'list'))showNudge('🛒 '+what+' '+T('לחצו כאן ואעזור להכין את הרשימה 👩‍🍳','Tap and I will help 👩‍🍳'));
}
setInterval(()=>{if(document.visibilityState==='visible')checkShopDay();},30*60000);

/* ---------- הצעות יזומות נוספות כשפותחים את יאמי ---------- */
let pendingIntroAsk=false;
function v8Offers(){
  if(!state.user)return;const busy=()=>state.pending||state.introFlow||pendingIntroAsk;
  const me=meData();
  if(!(me.profile&&me.profile.done)&&!state.introOffered&&!state.introFlow){state.pending=null;state.introOffered=true;save(true);pendingIntroAsk=true;
    botSay(T('💚 אפשר להכיר אותך קצת? כמה שאלות קצרות (איפה קונים, באיזה יום, מה קונים כל שבוע) — ואני אדע לעזור לך הרבה יותר טוב. (כן/לא)','Can I get to know you? A few short questions (yes/no)'));return;}
  const d=new Date().getDay();
  const u=usualDays().get(d);
  if(u&&!state.history.some(h=>dayKey(h.ts)===dayKey(new Date()))&&!offeredToday('shopday-bot')&&!busy()){markOffered('shopday-bot');
    const st=(me.profile&&me.profile.staples||[]).filter(n=>!curList().items.some(i=>i.n===n&&!i.done));
    if(st.length){state.pending={items:st};save();botSay('🛒 '+T('היום '+orderDayName(d)+' — יום הקנייה שלך'+(u.store?' ('+u.store+(u.note?', '+u.note:'')+')':'')+'.\nלהוסיף את מה שקונים כל שבוע: ','Shopping day today. Add your weekly items: ')+st.join(', ')+'? (כן/לא)');}
    else botSay('🛒 '+T('היום '+orderDayName(d)+' — יום הקנייה שלך'+(u.store?' ('+u.store+(u.note?', '+u.note:'')+')':'')+'. '+GW2('צריכה','צריך')+' עזרה ברשימה?','Shopping day today. Need help with the list?'));}
}

/* ---------- יאמי חכמה יותר: חישובים, חיסכון, שאלות "איך עושים", זמנים ---------- */
function calcExpr(t){
  let x=t.replace(/כפול|פי|x|×/g,'*').replace(/חלקי|לחלק ל|÷/g,'/').replace(/ועוד|פלוס|\+/g,'+').replace(/פחות|מינוס/g,'-').replace(/[^\d.+\-*/() ]/g,' ').trim();
  if(!/\d/.test(x)||!/[+\-*/]/.test(x)||!/^[\d.+\-*/() ]+$/.test(x))return null;
  /* מחשבון קטן בלי eval (אסור לפי מדיניות האבטחה של האתר): + - * / וסוגריים */
  const tk=x.replace(/\s+/g,'').match(/\d+(?:\.\d+)?|[+\-*/()]/g)||[];let i=0;
  const num=()=>{const c=tk[i];if(c==='('){i++;const v=add();if(tk[i]!==')')throw 0;i++;return v;}if(c==='-'){i++;return -num();}if(c===undefined||isNaN(+c))throw 0;i++;return +c;};
  const mul=()=>{let v=num();while(tk[i]==='*'||tk[i]==='/'){const op=tk[i++];const r=num();v=op==='*'?v*r:v/r;}return v;};
  const add=()=>{let v=mul();while(tk[i]==='+'||tk[i]==='-'){const op=tk[i++];const r=mul();v=op==='+'?v+r:v-r;}return v;};
  try{const v=add();if(i!==tk.length)return null;return isFinite(v)?Math.round(v*100)/100:null;}catch(e){return null;}
}
const UNIT_RE=/(\d+(?:\.\d+)?)\s*(קילו|ק"?ג|קג|גרם|גר|ג׳|ליטר|ל׳|מ"?ל|מל|יחידות|יח׳|יח|יחידה|פריטים|רולים|כביסות)?\s*(?:ב|ב-|במחיר|ב־)\s*(\d+(?:\.\d+)?)/g;
function unitCompare(raw){
  const m=[...raw.matchAll(UNIT_RE)];if(m.length<2)return null;
  const toBase=(n,u)=>{u=(u||'').replace(/["׳]/g,'');if(/^(גרם|גר|ג)$/.test(u))return [n/1000,'ק"ג'];if(/^(קילו|קג)$/.test(u))return [n,'ק"ג'];if(/^(מל)$/.test(u))return [n/1000,'ליטר'];if(/^(ליטר|ל)$/.test(u))return [n,'ליטר'];return [n,u||T('יחידה','unit')];};
  const opts=m.map(x=>{const [q,u]=toBase(parseFloat(x[1]),x[2]);const p=parseFloat(x[3]);return {txt:x[0].trim(),per:p/q,u};});
  const best=opts.slice().sort((a,b)=>a.per-b.per)[0];const worst=opts.slice().sort((a,b)=>b.per-a.per)[0];
  return '🧮 '+T('מחיר ליחידה:','Unit price:')+'\n'+opts.map(o=>'• '+o.txt+' → '+fmtPrice(o.per,myCurrency())+' '+T('ל','per ')+o.u+(o===best?' ✅':'')).join('\n')+'\n\n'+T('הכי משתלם: ','Best: ')+best.txt+(worst.per>best.per?' — '+T('חוסך '+Math.round(100*(1-best.per/worst.per))+'% לעומת היקר','saves '+Math.round(100*(1-best.per/worst.per))+'%'):'');
}
async function savingsText(){
  if(!sb||!authUser)return T('צריך להיות מחוברים כדי לחשב 🙂','Sign in to calculate 🙂');
  let r=null;try{r=await basketCompare();}catch(e){}
  if(!r)return T('הרשימה ריקה 🙂 כתבו מה צריך — ואחשב איפה הכי זול.','The list is empty 🙂');
  if(!r.found.length)return T('עוד אין דיווחי מחיר למוצרים ברשימה 🤷 כל דיווח בלשונית 💰 עוזר לכולם.','No prices for your items yet 🤷');
  const cur=myCurrency();const full=r.rows.filter(x=>x.keys.length===r.found.length).sort((a,b)=>a.sum-b.sum);
  let s='🧮 '+T('חישוב לרשימה "'+curList().name+'" ('+r.found.length+' מתוך '+r.keys.length+' מוצרים עם מחיר):','Calculation for your list:')+'\n';
  if(full.length){s+='\n🏪 '+T('הכל בחנות אחת:','All in one store:')+'\n'+full.slice(0,4).map((x,i)=>(i===0?'🥇 ':'• ')+x.chain+': '+fmtPrice(x.sum,cur)).join('\n');}
  s+='\n\n🧩 '+T('כל מוצר בחנות הכי זולה: ','Each item at its cheapest store: ')+fmtPrice(r.split,cur);
  if(full.length){const save=full[full.length-1].sum-full[0].sum;if(save>0.5)s+='\n💰 '+T('ההפרש בין החנות היקרה לזולה: ','Difference cheapest vs priciest: ')+fmtPrice(save,cur);const save2=full[0].sum-r.split;if(save2>0.5)s+='\n➕ '+T('אם מפצלים בין חנויות — חוסכים עוד ','Splitting saves another ')+fmtPrice(save2,cur);}
  const deals=storePosts.filter(p=>p.status==='approved'&&p.kind==='deal'&&(!p.ends_at||new Date(p.ends_at)>new Date())).filter(p=>r.keys.some(k=>norm(p.title+' '+(p.body||'')).includes(k)));
  if(deals.length)s+='\n\n🔥 '+T('מבצעים על מוצרים מהרשימה:','Deals on your items:')+'\n'+deals.slice(0,5).map(p=>'• '+p.chain+': '+p.title).join('\n');
  if(r.missing.length)s+='\n\n🤷 '+T('אין עדיין מחיר ל: ','No price yet for: ')+r.missing.join(', ');
  return s+'\n\n'+T('טיפ: לחצו "💰 איפה הכי זול?" ברשימה לפירוט מלא.','Tip: tap "💰 Cheapest store?" on the list.');
}
const HOWTO=[
[/(איך|איפה).*(מוסיפ|להוסיף).*(מוצר|פריט)|איך מוסיפים/,'➕ '+'כותבים בשורה למטה מה צריך (למשל "חלב 2 ולחם") ולוחצים ➤ — או ➕ למאגר המוצרים, שם בוחרים גם חברה וכמות. אפשר גם בקול 🎤 או לכתוב לי.'],
[/(איך|איפה).*(כמות)/,'🔢 ליד כל מוצר יש ➖ ו-➕. לחיצה על המספר מאפשרת לכתוב כמות חופשית, כמו "1.5 קג".'],
[/(איך|איפה).*(מוחק|למחוק|מסיר)/,'🗑️ לוחצים ✕ ליד המוצר. התחרטת? מופיע כפתור "ביטול" לכמה שניות.'],
[/(איך|איפה).*(מסמנ|לסמן|קניתי חלק|כמה חנויות|כמה סופרים)/,'✓ לוחצים על העיגול ליד מוצר שקנית. בסוף — "סיום — רק מה שקניתי": רק מה שסימנת עובר להיסטוריה, והשאר נשאר לחנות הבאה.'],
[/(איך|איפה).*(משתפ|לשתף|המשפחה)/,'🔗 תפריט ⚙️ ← "שיתוף" ← "☁️ שיתוף רשימה עם המשפחה" — שולחים את הקוד, וכולם רואים ועורכים את אותה רשימה.'],
[/(איך|איפה).*(מדווח|לדווח).*(מחיר)/,'💰 לשונית "מחירים" ← "דיווח מחיר": מוצר, רשת, סניף ומחיר (אפשר לסמן 🔥 מבצע). מיד כולם רואים — ואפשר לסמן "נכון / לא נכון" על כל דיווח.'],
[/(איך|איפה).*(ברקוד|לסרוק)/,'📷 ➕ (המאגר) ← "סריקת ברקוד של מוצר" — ורואים מה המוצר ואיפה הכי זול.'],
[/(איך|איפה).*(התראות|עדכונים|פעמון)/,'🔔 לוחצים על הפעמון למעלה ← מפעילים "לקבל עדכונים מהמערכת".'],
[/(איך|איפה).*(צור קשר|לפנות|פנייה).*(חנות|סופר)/,'✉️ לשונית "חנויות" ← ℹ️ פרופיל של החנות ← "פנייה לחנות".'],
[/(מה זה האתר|מה האתר הזה|מה אפשר לעשות באתר|למה האתר)/,'🛒 "רשימת קניות" עוזרת לכל בית: רשימה משותפת למשפחה, השוואת מחירים ומבצעים, היסטוריית קניות, זמני שבת — ואני, יאמי, כאן כדי לעזור בכל דבר 💚']];
async function v8BotPre(raw){
  const t=norm(raw);if(hasProfanity(raw))return false;
  if(state.introFlow){introAnswer(raw);return true;}
  if(/^(בינה|בינה מלאכותית|ai|שאלה לבינה)\s*[:：]/i.test(raw.trim())){aiOff=false;if(!(await askAI()))botSay(T('הבינה המלאכותית לא זמינה כרגע 🙏','AI is not available right now 🙏'));return true;}
  if(pendingIntroAsk){pendingIntroAsk=false;if(/^(כן|בטח|בשמחה|יאללה|אוקיי|אוקי|סבבה|קדימה|למה לא)/.test(t)){startIntro();return true;}if(/^(לא|לא עכשיו|אחר כך|אח"כ|לא תודה)/.test(t)){botSay(T('בסדר גמור 🙂 מתי שתרצו — כתבו "היכרות".','No problem 🙂 Write "intro" anytime.'));return true;}}
  if(askStoreTs){const ts=askStoreTs;setTimeout(()=>{const h=state.history.find(x=>x.ts===ts);if(h&&h.store)syncPurchaseStore(ts,h.store);},50);return false;}
  if(/^(היכרות|שיחת היכרות|תכירי אותי|להכיר|תלמדי אותי|תשאלי אותי)/.test(t)){startIntro();return true;}
  if(/^(בואי\s+|בוא\s+|יאללה\s+)?(שיחה חדשה|נושא חדש|להתחיל מחדש|נתחיל מחדש|נתחיל שיחה חדשה|להתחיל שיחה חדשה)[.!]*$/.test(t)){newBotChat();return true;}
  if(/(זריחה|שקיעה|מנחה גדולה|מנחה קטנה|פלג המנחה|זמני היום|זמנים להיום|דף יומי|הדף היומי|צאת הכוכבים|חצות|סוף זמן|עלות השחר|זמנים של היום)/.test(t)){botSay(zmanimText());return true;}
  if(/(זמני שבת|כניסת שבת|יציאת שבת|הדלקת נרות|מתי נכנסת שבת|מתי יוצאת שבת)/.test(t)&&!findCityIn(t)){const sh=shabbatTimes(userCity());if(sh){botSay('🕯️ '+T('זמנים ב','Times in ')+sh.city+':\n'+sh.candles+'\n'+sh.havdalah+(nextParasha()?'\n📜 '+nextParasha():'')+'\n\n'+T('ללוח המלא — "עיתים לבינה":','Full calendar:')+'\n'+itimUrl());return true;}}
  const uc=unitCompare(raw);if(uc&&/(משתלם|זול|כדאי|עדיף|יותר טוב|השוואה|השווי)/.test(t)){botSay(uc);return true;}
  if(/(כמה זה|כמה יוצא|תחשבי|חשבי|חשב|כמה עולה)/.test(t)||/^[\d.\s+\-*/×x()]+$/.test(raw.trim())){const v=calcExpr(t.replace(/(כמה זה|כמה יוצא|תחשבי|חשבי|חשב|כמה עולה)/g,''));if(v!==null){botSay('🧮 '+v.toLocaleString('he-IL'));return true;}}
  if(/(איך (לחסוך|חוסכים|לצאת הכי זול|יוצאים הכי זול)|כמה (יעלה|תעלה|עולה) (לי )?(ה)?רשימה|כמה תעלה הקנייה|חישוב (ה)?רשימה|איך לחסוך|תחסכי לי)/.test(t)||t==='איך לחסוך'){botSay(await savingsText());return true;}
  if(/(קרוב אליי|הכי קרוב|חנויות קרובות|סופר קרוב|ליד הבית)/.test(t)&&yamiShopNear(t)){openNearMe();botSay('📍 '+T('פתחתי את החנויות והמבצעים הכי קרובים אליך','Opened stores & deals near you'));return true;}
  if((/ברקוד/.test(t)&&t.split(' ').length<=5)||/^(לסרוק|תסרקי|סריקה|לסרוק מוצר|לסרוק ברקוד)[.!]*$/.test(t)){openBarcodeScanner(code=>lookupBarcode(code));botSay('📷 '+T('פתחתי את הסורק — מכוונים לברקוד, או מקלידים את המספר','Scanner opened'));return true;}
  /* "איך מוחקים?" על האתר — כן; "איך מוחקים כתם קפה מחולצה" — לא (הולך לבינה המלאכותית) */
  if(t.split(' ').length<=3||/(^|\s)(ה|ב|מה|ל|מ)?(רשימה|רשימת|מוצר|מוצרים|פריט|פריטים|אתר|כאן|פה|יאמי|אפליקציה|מחיר|מחירים|ברקוד|קנייה|קניה|קניות|משפחה)(?=\s|$|[?？!.,])/.test(t))
    for(const [re,ans] of HOWTO)if(re.test(t)){botSay(ans);return true;}
  return false;
}
yamiStep(v8BotPre);
const _v8AiContext=aiContext;
aiContext=function(){const me=meData();const p=me.profile||{};return _v8AiContext()+'\n'+[p.done?'מה המשתמש סיפר על עצמו: '+[p.people?p.people+' נפשות':'',p.day!=null?'קנייה גדולה ב'+orderDayName(p.day):'',p.dayText||'',(p.staples||[]).length?'קונה כל שבוע: '+p.staples.join(', '):'',p.mode?'אופן קנייה: '+p.mode:'',p.notes||''].filter(Boolean).join(' · '):'',
  'סגנון: היי חמה, נחמדה ותמיד מחפשת לעזור. כשמבקשים חישוב — חשבי במדויק, הראי את החישוב ואמרי כמה חוסכים.'].filter(Boolean).join('\n');};

/* ---------- אתחול גרסה 8 ---------- */
const _v8LoadPublic=loadPublicData;
loadPublicData=async function(){const a=_v8LoadPublic();loadDbProducts();await a;};
const _v8AfterEnter2=afterEnter;
afterEnter=function(){_v8AfterEnter2();setTimeout(()=>{checkShopDay();checkReplies();},4000);if(chatHomeOn()&&tab!=='chats')setTab('chats');};
async function checkReplies(){if(!sb||!authUser)return;try{const {data}=await sb.from('store_messages').select('id,chain,reply,replied_at').eq('user_id',authUser.id).neq('reply','').order('replied_at',{ascending:false}).limit(10);
  (data||[]).forEach(m=>notify('reply:'+m.id,'deal',T('תשובה מ'+m.chain,'Reply from '+m.chain),m.reply,'stores'));}catch(e){}}
applyBotTips();applyChatHome();
if(chatHomeOn())setTab('chats');else if(tab==='chats')setTab('list');
if(state.user&&authUser)setTimeout(()=>{checkShopDay();checkReplies();},4000);
