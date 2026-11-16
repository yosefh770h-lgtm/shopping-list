
/* ================= 🎯 בחירת מוצר מדויק לפני השוואת המחירים ==========   "חלב תנובה" יכול להיות שקית 1 ליטר בסניף אחד ובקבוק 2 ליטר בסניף אחר — וזו לא השוואה הוגנת.
   אחרי שכותבים מוצר, מציגים כמה מוצרים מתאימים מהשרת (/products), עם תמונה קטנה כשיש (המוצרים שלי או Open Food Facts, אחרת האימוג'י של הקטגוריה).
   בוחרים אחד ← הברקוד נשמר בפריט (bc, ושם המוצר ב-bn), ובהשוואה בין הסניפים שולחים "חלב תנובה#ברקוד" — אותו מוצר בדיוק בכל הסניפים.
   הבחירה נזכרת לפי השם (state.pick53), כך שבפעם הבאה שכותבים "חלב תנובה" היא נבחרת לבד. "לא משנה" — לא שואלים שוב על השם הזה. */
(function(){
const $pk=s=>document.querySelector(s);
let pkDown=false;const PK_CACHE={},PK_IMG={};
const pkMem=()=>(state.pick53&&typeof state.pick53==='object')?state.pick53:(state.pick53={});
/* הבחירה תקפה רק כל עוד שם הפריט לא השתנה (מי ששינה "חלב תנובה" ל"חלב יטבתה" — כבר לא אותו מוצר) */
const pkChosen=i=>i&&i.bc&&i.bq===i.n?i:null;
window.pkChosen53=pkChosen;
function pkOn(){return !pkDown&&!state.pick53off&&typeof srvShown==='function'&&srvShown();}
function pkFetch(q){const k=norm(q);if(PK_CACHE[k])return PK_CACHE[k];
  return PK_CACHE[k]=priceApi('/products',{q:q.replace(/[|*#\n]/g,' ').trim().slice(0,80),limit:8,exclude:srvHidden().join(',')})
    .then(r=>Array.isArray(r)?r:[]).catch(e=>{delete PK_CACHE[k];if(/404|not found/i.test(String(e&&e.message)))pkDown=true;return [];});}
/* תמונה: קודם מהמוצרים שלי (אותו ברקוד), ואחר כך Open Food Facts */
function pkImg(code){if(code in PK_IMG)return PK_IMG[code];
  let mine='';try{Object.values(typeof myProd==='object'&&myProd||{}).some(p=>{if(p&&p.image&&String(p.barcode||'')===code){mine=p.image;return true;}return false;});}catch(e){}
  if(mine)return PK_IMG[code]=Promise.resolve(mine);
  return PK_IMG[code]=pkOwn(code).then(own=>own||(typeof offProduct==='function'?offProduct(code):Promise.resolve(null)).then(o=>o&&o.img||'')).catch(()=>'');}
/* 📷 תמונות שצילמנו בעצמנו (product_photos, רק מאושרות) — בבקשה אחת לכל המוצרים שבחלון */
const PK_OWN={},PK_CR={};let pkOwnQ=[],pkOwnT=0;
function pkOwn(code){if(code in PK_OWN)return PK_OWN[code];
  return PK_OWN[code]=new Promise(res=>{pkOwnQ.push([code,res]);clearTimeout(pkOwnT);pkOwnT=setTimeout(async()=>{const q=pkOwnQ;pkOwnQ=[];const m={};
    try{if(sb){const {data}=await sb.from('product_photos').select('barcode,image,credit').eq('status','approved').in('barcode',q.map(x=>x[0]));(data||[]).forEach(r=>{m[r.barcode]=r.image;if(r.credit)PK_CR[r.barcode]=r.credit;});}}catch(e){}
    q.forEach(([c,r])=>r(m[c]||''));},30);});}
/* צילום מוצר: מקטינים ל-JPEG של עד 480 פיקסלים, נשלח לאישור המנהל (מנהל — מאושר מיד) */
function pkShrink(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const img=new Image();img.onerror=rej;img.onload=()=>{
  const k=Math.min(1,480/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
  let q=.82,d=c.toDataURL('image/jpeg',q);while(d.length>110000&&q>.35){q-=.12;d=c.toDataURL('image/jpeg',q);}d.length<=118000?res(d):rej(new Error('too big'));};img.src=fr.result;};fr.readAsDataURL(file);});}
async function pkSnap(code,name){if(!sb||!authUser){flash('🔑 '+T('כדי לצלם מוצר צריך להתחבר','Sign in to add a photo'));return false;}
  const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.setAttribute('capture','environment');
  const file=await new Promise(r=>{inp.onchange=()=>r(inp.files&&inp.files[0]);inp.click();});if(!file)return false;
  let image;try{image=await pkShrink(file);}catch(e){flash('⚠️ '+T('לא הצלחתי לפתוח את התמונה','Could not open the photo'));return false;}
  const admin=typeof isAdmin==='function'&&isAdmin();
  let credit='';if(await uiConfirm('📷 '+T('לכתוב קרדיט על התמונה? (למשל "צילום: יוסי כהן")','Show a credit on the photo?'))){
    const v=await uiPrompt(T('איך לכתוב את הקרדיט? (עד 40 תווים)','How should the credit read? (up to 40 characters)'),(state.user&&state.user.name)||'');
    credit=String(v||'').trim().slice(0,40);if(credit&&typeof hasProfanity==='function'&&hasProfanity(credit)){flash('🙏');return false;}}
  const {error}=await sb.from('product_photos').insert(Object.assign({barcode:String(code),name:String(name||'').slice(0,80),image,credit},admin?{status:'approved'}:{}));
  if(error){flash('⚠️ '+error.message);return false;}
  if(admin){PK_OWN[code]=Promise.resolve(image);if(credit)PK_CR[code]=credit;else delete PK_CR[code];delete PK_IMG[code];}
  flash(admin?'📷 '+T('התמונה נשמרה ומוצגת לכולם','Photo saved for everyone'):'📷 '+T('תודה! אחרי אישור התמונה תופיע לכולם, ותקבל/י '+repPts('pts_photo')+' נקודות מוניטין 🏅','Thanks! After approval it shows for everyone and you get '+repPts('pts_photo')+' reputation points 🏅'));return true;}
window.pkSnap53=pkSnap;
/* 📸 מהפרסומת בצד: חלון "מצלמים מוצר ומקבלים נקודות" — סורקים ברקוד (או מקלידים), ואז לחיצה על "לצלם" פותחת את המצלמה.
   (המצלמה נפתחת רק מלחיצה ישירה של המשתמש, לכן אחרי הסריקה יש כפתור נפרד.) יש גם קיצור למוצרים מדויקים שכבר ברשימה */
async function pkPromo(code,name){
  if(!sb||!authUser){flash('🔑 '+T('כדי לצלם מוצר ולקבל נקודות צריך להתחבר','Sign in to add photos and earn points'));return;}
  const items=(curList().items||[]).filter(i=>!i.done&&pkChosen(i));
  const b=openSheet('📸 '+T('מצלמים מוצר ומקבלים נקודות','Photograph products, earn points'),
    '<div class="muted-note" style="display:grid;gap:8px">'+
      '<p><b>📦 '+T('מה מצלמים?','What to photograph?')+'</b> '+T('כל מוצר מהסופר שיש לכם ביד בבית: חלב, גבינה, שימורים, חטיפים, שתייה, מוצרי ניקיון. כל מוצר עם ברקוד.','Any supermarket product with a barcode that you have at home.')+'</p>'+
      '<p><b>📷 '+T('איך?','How?')+'</b> '+T('1. סורקים את הברקוד (או מקלידים את המספר שמתחתיו). 2. מצלמים את האריזה מקדימה, שהשם יהיה קריא. 3. שולחים. צוות האתר בודק ומאשר.','1. Scan the barcode. 2. Photograph the front of the pack. 3. Send — the team approves.')+'</p>'+
      '<p><b>🏅 '+T('למה כדאי?','Why?')+'</b> '+T('על כל תמונה שמאושרת מקבלים <b>'+repPts('pts_photo')+' נקודות מוניטין</b>, ואפשר גם לכתוב את השם שלכם כקרדיט על התמונה. ובנוסף, התמונה מופיעה לכל המשתמשים ועוזרת להם לבחור בדיוק את המוצר הנכון בהשוואת המחירים, כך שכולם חוסכים.','Each approved photo earns '+repPts('pts_photo')+' reputation points, and helps everyone pick the exact product in price comparison.')+'</p>'+
      '<p>'+T('✅ טוב: מוצר אחד, מקדימה, תאורה טובה, רקע נקי. ❌ לא: אנשים, מדף שלם, תמונה מטושטשת, תמונה מהאינטרנט.','✅ Good: one product, front, good light. ❌ Not: people, whole shelf, blurry, from the web.')+'</p></div>'+
    (code?'<div class="bizhead"><div class="av">📦</div><div><b>'+esc(name||T('ברקוד ','Barcode ')+code)+'</b><small dir="ltr">'+esc(code)+'</small></div></div>'+
      '<button type="button" class="btn" data-ppsnap="'+esc(code)+'" style="width:100%;margin-top:8px">📷 '+T('לצלם את המוצר','Take the photo')+'</button>'+
      '<button type="button" class="btn sec" data-ppscan="1" style="width:100%;margin-top:8px">🔁 '+T('לסרוק מוצר אחר','Scan another product')+'</button>'
    :'<button type="button" class="btn" data-ppscan="1" style="width:100%;margin-top:8px">📷 '+T('לסרוק ברקוד של מוצר','Scan a product barcode')+'</button>')+
    (items.length?'<h4 style="margin-top:14px">'+T('או מוצר מהרשימה שלך:','Or a product from your list:')+'</h4>'+items.slice(0,12).map(i=>{const c=pkChosen(i);return '<div class="merow"><span>🎯</span><span class="grow"><b>'+esc(c.bn||i.n)+'</b></span><button type="button" class="btn sm sec" data-ppsnap="'+esc(c.bc)+'" data-ppname="'+esc(c.bn||i.n)+'">📷 '+T('לצלם','Photo')+'</button></div>';}).join(''):'')+
    '<p class="muted-note" style="margin-top:12px">💡 '+T('את המוניטין שלך רואים בתפריט ← המוניטין שלי.','Your reputation is in Menu → My reputation.')+'</p>');
  b.onclick=async e=>{
    if(e.target.closest('[data-ppscan]')){closeSheet();openBarcodeScanner(async c=>{c=String(c||'').replace(/\D/g,'');if(!c)return;let n='';
      try{const r=await sb.from('products').select('name,brand').eq('barcode',c).maybeSingle();if(r.data)n=r.data.name+(r.data.brand?' '+r.data.brand:'');}catch(err){}
      pkPromo(c,n);});return;}
    const t=e.target.closest('[data-ppsnap]');if(!t)return;
    if(await pkSnap(t.dataset.ppsnap,t.dataset.ppname||name||'')){t.disabled=true;t.textContent='✅ '+T('נשלח לאישור','Sent');}};
}
window.pkPromo53=pkPromo;
/* מהתראת "התמונה שלך אושרה" — פותחים את המוניטין שלי */
function pkRoute(){if(location.hash==='#me-rep'){history.replaceState(null,'',location.pathname);setTimeout(()=>{try{openMe('rep');}catch(e){}},600);}}
addEventListener('hashchange',pkRoute);pkRoute();
/* תמונות מ-Open Food Facts ברישיון CC BY-SA — חובה לתת קרדיט, אז מתחת לתמונות יש שורה קטנה עם קישור (רק כשבאמת הוצגה תמונה משם) */
const PK_OFF=/^https:\/\/images\.openfoodfacts\.org\//;
const pkCredit=()=>'<p class="pkcred" hidden>📷 '+T('תמונות המוצרים: ','Product photos: ')+'<a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> · '+
  '<a href="https://creativecommons.org/licenses/by-sa/3.0/deed.he" target="_blank" rel="noopener">CC BY-SA</a></p>';
function pkFillImgs(root){root.querySelectorAll('[data-pkimg]').forEach(el=>{const code=el.dataset.pkimg;
  pkImg(code).then(src=>{if(!src||!el.isConnected)return;el.innerHTML='<img src="'+esc(src)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">';
    const cr=PK_CR[code];if(cr&&src.startsWith('data:image/')){el.title=T('צילום: ','Photo: ')+cr;const by=root.querySelector('[data-pkby="'+code+'"]');if(by){by.textContent='📷 '+T('צילום: ','Photo: ')+cr;by.hidden=false;}}
    if(PK_OFF.test(src)){el.title=T('תמונה: Open Food Facts','Photo: Open Food Facts');const c=root.querySelector('.pkcred');if(c)c.hidden=false;}});});}
/* 🖼️ תמונה קטנה בהשוואה בין הסניפים (לפי מחירים ולפי פריטים): אותו מקור כמו בבחירת המוצר — המוצרים שלי, תמונות שצילמו ואושרו, Open Food Facts.
   עד שהתמונה נטענת (או כשאין) — הכרטיס בצבע הקטגוריה. נטען רק כשהשורה נראית על המסך (שורות בתוך סניף סגור לא נטענות) */
function pkThumb(code,name,typed,cls){code=String(code||'').replace(/\D/g,'');
  return '<span class="pkth'+(cls?' '+cls:'')+'"'+(code.length>=7?' data-pkth="'+code+'"':'')+' aria-hidden="true">'+pkArt(String(name||typed||''),typed)+'</span>';}
window.pkThumb53=pkThumb;
function pkThLoad(el){const code=el.dataset.pkth;pkImg(code).then(src=>{if(!src||!el.isConnected)return;const im=new Image();im.alt='';im.referrerPolicy='no-referrer';im.decoding='async';
  im.onload=()=>{if(!el.isConnected)return;el.textContent='';el.appendChild(im);el.classList.add('ph');el.removeAttribute('aria-hidden');el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',T('הגדלת התמונה','Enlarge photo'));
    const cr=PK_CR[code];if(cr&&src.startsWith('data:image/'))el.title=T('צילום: ','Photo: ')+cr;
    else if(PK_OFF.test(src)){el.title=T('תמונה: Open Food Facts','Photo: Open Food Facts');const box=el.closest('#srvRes,#myStOut,#basketBody');if(box&&!box.querySelector(':scope > .pkcred'))box.insertAdjacentHTML('beforeend',pkCredit().replace(' hidden',''));}};
  im.src=src;}).catch(()=>{});}
const pkThIO='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){pkThIO.unobserve(e.target);pkThLoad(e.target);}}),{rootMargin:'150px'}):null;
function pkThScan(){document.querySelectorAll('.pkth[data-pkth]:not([data-pkw])').forEach(el=>{el.dataset.pkw='1';if(pkThIO)pkThIO.observe(el);else pkThLoad(el);});}
let pkThT=0;new MutationObserver(()=>{clearTimeout(pkThT);pkThT=setTimeout(pkThScan,80);}).observe(document.body,{childList:true,subtree:true});
const pkRange=p=>{const cur=myCurrency();return p.min===p.max?fmtPrice(p.min,cur):fmtPrice(p.min,cur)+' – '+fmtPrice(p.max,cur);};
/* מוצר בלי תמונה: כרטיס מעוצב בצבע הקטגוריה, עם אייקון המוצר והגודל מהשם (1 ליטר, 80 גרם...) — כך לכל מוצר יש "תמונה" */
const PK_COL={'מוצרי חלב':['#e3f0ff','#1565c0'],'ירקות':['#e5f6e0','#2e7d32'],'פירות':['#ffe9e3','#c62828'],'לחמים':['#fbefdc','#8d5a1b'],'בשר ועוף':['#fde4e4','#b23b3b'],
  'דגים':['#e0f4f7','#00838f'],'שתייה':['#e6f3ff','#0277bd'],'רטבים וממרחים':['#fff2d9','#b26a00'],'שימורים':['#f1ecf9','#6a4c9c'],'מאפים וחטיפים':['#fff0db','#c25e00'],
  'מוצרי ניקיון':['#e2f5f3','#00796b'],'היגיינה':['#f7e8f5','#8e3b84'],'אחר':['#eef1f4','#455a64']};
const pkSize=n=>{const m=String(n||'').match(/(\d+(?:[.,]\d+)?)\s*(ליטר|ל'|מ"ל|מל|גרם|גר'|גר|ג'|ק"ג|קג|יח'|יחידות|יח)(?=\s|$|[^\u0590-\u05FF])/);
  if(!m)return '';const u={"ל'":'ליטר','מל':'מ"ל',"גר'":'גרם','גר':'גרם',"ג'":'גרם','קג':'ק"ג',"יח'":"יח'",'יחידות':"יח'",'יח':"יח'"}[m[2]]||m[2];return m[1].replace(',','.')+' '+u;};
function pkArt(name,typed){let c=resolveCat(name);if(c==='אחר'&&typed)c=resolveCat(typed);const [bg,fg]=PK_COL[c]||PK_COL['אחר'];const sz=pkSize(name);
  const e=emojiOf(name)!==CATE['אחר']?emojiOf(name):emojiOf(typed||name);const ic=typeof emoToSvg==='function'?emoToSvg(e,30,fg):esc(e);
  return '<span class="pkart" style="--pkbg:'+bg+';--pkfg:'+fg+'"><span class="pkic">'+(ic===esc(e)?'<span style="font-size:28px">'+esc(e)+'</span>':ic)+'</span>'+(sz?'<span class="pksz">'+esc(sz)+'</span>':'')+'</span>';}
function pkTiles(ps,name,sel){return ps.map(p=>'<button type="button" class="pkp'+(sel===p.code?' on':'')+'" data-pkcode="'+esc(p.code)+'">'+
  '<span class="pkimg" data-pkimg="'+esc(p.code)+'">'+pkArt(p.name,name)+'</span>'+
  '<span class="pkn">'+esc(p.name)+'</span><small class="pkby" data-pkby="'+esc(p.code)+'" hidden></small>'+(p.manufacturer?'<small>'+esc(p.manufacturer)+'</small>':'')+
  '<b>'+pkRange(p)+'</b><small>'+T('ב-'+p.stores+' סניפים · '+p.chains+' רשתות','in '+p.stores+' branches · '+p.chains+' chains')+'</small></button>').join('');}
function pkApply(it,p){it.bc=p.code;it.bn=String(p.name||'').slice(0,80);it.bq=it.n;it.ts=Date.now();
  PK_IMG[p.code]&&PK_IMG[p.code].then(src=>{if(/^https:\/\//.test(src||'')&&it.bc===p.code&&it.bimg!==src){it.bimg=src;save();render();}});
  pkMem()[norm(it.n)]={bc:it.bc,bn:it.bn};save();render();}
function pkClear(it){delete it.bc;delete it.bn;delete it.bq;delete it.bimg;it.ts=Date.now();delete pkMem()[norm(it.n)];save();render();}
const pkItem=id=>curList().items.find(x=>x.id===id);
/* כרטיס קטן מעל שורת ההוספה, בלי להסתיר את הרשימה. ✕ / "לא משנה" סוגרים */
function pkCard(it,ps){let o=$pk('#pk53');if(!o){o=document.createElement('div');o.id='pk53';o.setAttribute('role','dialog');o.setAttribute('aria-labelledby','pk53t');document.body.appendChild(o);}
  o.innerHTML='<div class="pkh"><b id="pk53t">🎯 '+T('איזה "'+esc(it.n)+'" בדיוק?','Which "'+esc(it.n)+'" exactly?')+'</b><button type="button" class="pkx" data-pkx="1" aria-label="'+T('סגירה','Close')+'">✕</button></div>'+
    '<p class="pksub">'+T('בוחרים מוצר אחד — וההשוואה בין החנויות תהיה על אותו מוצר בדיוק.','Pick one product, and stores are compared on that exact product.')+'</p>'+
    '<div class="pkrow">'+pkTiles(ps,it.n)+'</div>'+pkCredit()+
    '<div class="pkft"><button type="button" data-pkskip="1">'+T('לא משנה, כל מוצר מתאים','Any is fine')+'</button><button type="button" class="lnk" data-pkoff="1">'+T('לא לשאול יותר','Don\'t ask again')+'</button></div>';
  const r=$pk('#inputRow');const rr=r&&r.offsetParent?r.getBoundingClientRect():null;o.style.top=o.style.bottom=o.style.maxHeight=o.style.width=o.style.left=o.style.right='';o.hidden=false;
  /* החלון נפתח צמוד לשדה ההוספה: מעליו אם יש מקום (בטלפון השדה למטה), אחרת מתחתיו (במחשב השדה למעלה) — ותמיד בתוך המסך */
  const hh=o.offsetHeight,up=rr?rr.top-14:innerHeight-16,dn=rr?innerHeight-rr.bottom-14:0;
  if(!rr||up>=hh||up>=dn){o.style.bottom=(rr?Math.max(8,innerHeight-rr.top+6):8)+'px';o.style.maxHeight=Math.max(160,up)+'px';}
  else{o.style.top=(rr.bottom+6)+'px';o.style.maxHeight=Math.max(160,dn)+'px';}
  if(rr&&innerWidth>=900){o.style.width=Math.min(Math.max(rr.width,420),640)+'px';o.style.left=Math.max(8,rr.left+rr.width/2-Math.min(Math.max(rr.width,420),640)/2)+'px';o.style.right='auto';o.style.margin='0';}else o.style.margin='';pkFillImgs(o);
  const close=()=>{o.hidden=true;o.onclick=null;};
  o.onclick=e=>{if(e.target.closest('[data-pkx]')){close();return;}
    if(e.target.closest('[data-pkskip]')){pkMem()[norm(it.n)]={skip:1};save();close();return;}
    if(e.target.closest('[data-pkoff]')){state.pick53off=true;save();close();flash('🎯 '+T('דיוק מוצרים כובה. אפשר להדליק אותו שוב בהגדרות, ועדיין לבחור מוצר מדויק בלחיצה על המוצר ברשימה.','Exact products is off. Turn it back on in Settings, or tap an item to pick one.'));return;}
    const b=e.target.closest('[data-pkcode]');if(!b)return;const p=ps.find(x=>x.code===b.dataset.pkcode);const cur=pkItem(it.id);if(!p||!cur)return;
    close();pkApply(cur,p);flash('🎯 '+T('נבחר: ','Picked: ')+p.name);};
  clearTimeout(o._t);o._t=setTimeout(()=>{if(!o.hidden&&!o.matches(':hover')&&!o.contains(document.activeElement))close();},45000);}
/* בחירה (או שינוי) מהרשימה עצמה — חלון מלא */
async function pkOpen(id){const it=pkItem(id);if(!it)return;
  const b=openSheet('🎯 '+T('מוצר מדויק להשוואה','Exact product to compare'),'<p class="muted-note">'+T('מחפשת מוצרים... 🔎','Searching... 🔎')+'</p>');
  const ps=await pkFetch(it.n);const ch=pkChosen(it);
  if(!ps.length){b.innerHTML='<p class="muted-note">🤷 '+(pkDown?T('הבחירה עוד לא זמינה. נסו שוב בעוד שעה.','Not available yet. Try again later.'):T('לא מצאתי מוצרים מתאימים ל"'+esc(it.n)+'".','No matching products found.'))+'</p>';return;}
  b.innerHTML='<p class="muted-note">'+T('"'+esc(it.n)+'" — איזה מוצר בדיוק? ההשוואה בין החנויות תהיה על המוצר שבוחרים.','Which product exactly? Stores are compared on it.')+'</p>'+
    '<div class="pkgrid">'+pkTiles(ps,it.n,ch&&ch.bc)+'</div>'+pkCredit()+
    (ch?'<button type="button" class="btn sec" data-pksnap="1" style="width:100%;margin-top:10px">📷 '+T('יש לך את המוצר ביד? צלמו אותו — +'+repPts('pts_photo')+' נקודות מוניטין 🏅','Have it in hand? Take a photo — +'+repPts('pts_photo')+' reputation points 🏅')+'</button>'+
      '<button type="button" class="btn sec" data-pkclear="1" style="width:100%;margin-top:8px">↩️ '+T('ביטול הבחירה (כל מוצר מתאים)','Clear (any product)')+'</button>':'');
  pkFillImgs(b);
  b.onclick=async e=>{if(e.target.closest('[data-pkclear]')){pkClear(it);closeSheet();flash('↩️ '+T('הבחירה בוטלה','Cleared'));return;}
    if(e.target.closest('[data-pksnap]')){const c=pkChosen(it);if(c&&await pkSnap(c.bc,c.bn)&&PK_OWN[c.bc]){PK_OWN[c.bc].then(src=>{if(src){delete c.bimg;save();render();}});pkFillImgs(b);}return;}
    const t=e.target.closest('[data-pkcode]');if(!t)return;const p=ps.find(x=>x.code===t.dataset.pkcode);if(!p)return;pkApply(it,p);closeSheet();flash('🎯 '+T('נבחר: ','Picked: ')+p.name);};}
window.pkOpen53=pkOpen;window.pkCard53=pkCard;
/* 🎯 מתג "דיוק מוצרים" צמוד לכפתור התזכורות ברשימה — הכי נגיש. דלוק: אחרי הוספה מציעים מוצר מדויק; כבוי: המוצר נוסף כמו שנכתב */
const pkTgChip=()=>{const on=!state.pick53off;return '<button type="button" class="chip pk53tg'+(on?' pkon':'')+'" data-pk53tg="1" role="switch" aria-checked="'+on+'" title="'+T('דלוק: אחרי הוספת מוצר בוחרים את המוצר המדויק. כבוי: המוצר נוסף כמו שנכתב.','On: pick the exact product after adding. Off: added as typed.')+'"><span class="pk53ic" aria-hidden="true">🎯</span>'+T('דיוק מוצרים','Exact products')+'<span class="pk53sw" aria-hidden="true"></span></button>';};
const _pkRender=render;
/* בטלפון: בשורת הכפתורים של הרשימה (מיד אחרי שם הרשימה, לפי order ב-CSS). במחשב: הכי ימני, צמוד לכותרת הרשימה — לפני "תזכורות" */
function pkTgPlace(){const show=typeof srvShown==='function'&&srvShown();
  [['#chips','.errchip17'],['#r2lh .r2acts','.rem2b']].forEach(([box,after])=>{const c=$pk(box);if(!c)return;const old=c.querySelector('.pk53tg');if(old)old.remove();if(!show)return;
    const e=c.querySelector(after);if(e)e.insertAdjacentHTML(box==='#chips'?'afterend':'beforebegin',pkTgChip());else if(box==='#chips')c.insertAdjacentHTML('beforeend',pkTgChip());});}
/* אחרי שכל שאר הכפתורים ("+ רשימה", "תזכורות") נוספו לשורה */
render=function(){const r=_pkRender.apply(this,arguments);Promise.resolve().then(()=>{try{pkTgPlace();}catch(e){}});return r;};
document.addEventListener('click',e=>{const t=e.target.closest('[data-pk53tg]');if(!t)return;e.preventDefault();e.stopPropagation();
  state.pick53off=!state.pick53off;save();render();
  flash(state.pick53off?'✍️ '+T('דיוק מוצרים כבוי: מוצרים נוספים כמו שכותבים אותם','Exact products off: items are added as typed'):'🎯 '+T('דיוק מוצרים דלוק: אחרי הוספת מוצר תוצג בחירה של המוצר המדויק','Exact products on: you\'ll pick the exact product after adding'));},true);
/* אחרי שכתבו מוצר: אם כבר בחרו פעם מוצר לשם הזה — בוחרים אותו שוב; אחרת מציעים לבחור (רק כשיש לפחות 2 אפשרויות) */
async function pkAuto(name){if(!pkOn())return;const it=curList().items.find(i=>i.n===name&&!i.done);if(!it||pkChosen(it))return;
  const m=pkMem()[norm(name)];if(m&&m.skip)return;
  if(m&&m.bc){pkApply(it,{code:m.bc,name:m.bn});flash('🎯 '+T('כמו בפעם הקודמת: ','Same as last time: ')+m.bn);return;}
  const ps=await pkFetch(name);if(ps.length<2)return;const now=pkItem(it.id);if(!now||pkChosen(now)||now.done)return;pkCard(now,ps);}
/* מה נוסף מההקלדה: משווים את הפריטים לפני ואחרי (ההוספה יכולה לקרות גם מעט אחר כך, למשל אחרי בדיקה בשרת) */
const _pkSend=sendCurrent;
sendCurrent=function(){const l=curList(),before=new Set(l.items.map(i=>i.id));
  try{return _pkSend.apply(this,arguments);}finally{setTimeout(()=>{if(curList()!==l)return;const a=l.items.filter(i=>!before.has(i.id)&&!i.done);if(a.length===1)pkAuto(a[0].n);},400);}};
/* בהשוואה בין הסניפים: מוצר שנבחר נשלח עם הברקוד שלו */
srvItemsParam=function(items){const by={};(items||[]).forEach(i=>{const k=norm(i.n);if(!k||by[k])return;const qp=qtyParts(i.q);const c=pkChosen(i);
  by[k]=i.n.replace(/[|*#\n]/g,' ').trim()+(c?'#'+String(c.bc).replace(/\D/g,''):'')+(qp&&!qp.u&&qp.n>1?'*'+qp.n:'');});return Object.values(by).slice(0,60).join('|');};
/* ברשימה: המוצר שנבחר מופיע מתחת לשם (עם תמונה כשיש). לחיצה — שינוי או ביטול */
const pkChip=i=>{const c=pkChosen(i);if(!c||i.done)return '';
  return '<button type="button" class="pk53ch" data-pk53="'+esc(i.id)+'" title="'+T('המוצר שמשווים בין החנויות — לחיצה לשינוי','The product compared between stores — tap to change')+'">'+(c.bimg?'<img src="'+esc(c.bimg)+'" alt="" title="'+T('תמונה: Open Food Facts','Photo: Open Food Facts')+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':pkArt(c.bn||c.n,c.n).replace('class="pkart"','class="pkart sm"').replace(/<span class="pksz">.*?<\/span>/,''))+esc(c.bn||c.bc)+'</button>';};
const _pkBubble=bubble;
/* class="bub pkh" — כדי שה-CSS יוריד את המוצר לשורה משלו גם במכשירים שלא מכירים :has() (WebView ישן באנדרואיד) */
bubble=function(i){const h=_pkBubble.apply(this,arguments);const c=pkChip(i);return c?h.replace('<div class="bub">','<div class="bub pkh">').replace('<div class="bl2">',()=>c+'<div class="bl2">'):h;};
const _pkItemRow=itemRow;
const pkRe=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
itemRow=function(i){const h=_pkItemRow.apply(this,arguments);const c=pkChosen(i);if(!c||i.done)return h;
  return h.replace(new RegExp('(data-edititem="'+pkRe(esc(i.id))+'"[^>]*>'+pkRe(esc(i.n))+')'),m=>m+'<small class="pk53s" data-pk53="'+esc(i.id)+'">🎯 '+esc(c.bn||c.bc)+'</small>');};
$pk('#paneList').addEventListener('click',e=>{const t=e.target.closest('[data-pk53]');if(!t)return;e.stopPropagation();pkOpen(t.dataset.pk53);},true);
/* בחלון העריכה של מוצר: כפתור לבחירת מוצר מדויק */
const _pkEdit=openItemEdit;
openItemEdit=function(id){const res=_pkEdit.apply(this,arguments);try{const it=pkItem(id),b=$pk('#v8SheetBody');if(!it||!b||!(typeof srvShown==='function'&&srvShown())||b.querySelector('#pk53Edit'))return res;
  const at=b.querySelector('#ixph')||b.querySelector('#ieNote');if(!at)return res;const c=pkChosen(it);
  at.insertAdjacentHTML('afterend','<button type="button" class="btn sec" id="pk53Edit" style="width:100%;margin-top:8px">🎯 '+(c?T('מוצר להשוואה: ','Compared product: ')+esc(c.bn||c.bc):T('בחירת מוצר מדויק להשוואת מחירים','Pick an exact product for price comparison'))+'</button>');
  b.querySelector('#pk53Edit').onclick=()=>pkOpen(id);}catch(e){console.warn('pk53 edit',e);}return res;};
/* בהשוואת הסל: הסבר קצר כשיש מוצרים כלליים שלא נבחרו */
const _pkMount=srvBasketMount;
srvBasketMount=function(box,itemsArg){const r=_pkMount.apply(this,arguments);try{const w=box.querySelector('#srvCmp');if(!w||w.querySelector('.pk53tip')||pkDown)return r;
  const items=(itemsArg||curList().items.filter(i=>!i.done));const open=items.filter(i=>!pkChosen(i)),picked=items.length-open.length;if(!items.length)return r;
  const sub=w.querySelector('.sub');const tip=open.length?
    '🎯 '+T('כדי שההשוואה תהיה הוגנת (אותה אריזה בכל חנות), אפשר לבחור מוצר מדויק: לוחצים על המוצר ברשימה ← "בחירת מוצר מדויק".','For a fair comparison (same pack everywhere), tap an item in the list and pick the exact product.')+(picked?' '+T('(נבחרו כבר '+picked+' מתוך '+items.length+')','('+picked+' of '+items.length+' picked)'):''):
    '🎯 '+T('כל המוצרים נבחרו מדויק — משווים אותו מוצר בכל החנויות.','All items are exact — the same product is compared everywhere.');
  if(sub)sub.insertAdjacentHTML('afterend','<p class="muted-note pk53tip">'+tip+'</p>');}catch(e){}return r;};
/* 🛠️ בק אופיס (מנהלים): 📷 תמונות מוצרים שממתינות לאישור */
(function(){const nav=document.querySelector('#boNav');if(!nav||nav.querySelector('[data-s="pphotos"]'))return;
  const b=document.createElement('button');b.dataset.s='pphotos';b.textContent='📷 תמונות מוצרים';
  const after=nav.querySelector('[data-s="products"]');if(after)after.after(b);else nav.appendChild(b);
  let tab='pending';
  window.boView&&window.boView('pphotos',async function(){const m=document.querySelector('#boMain');
    m.innerHTML='<div class="card"><h2>📷 תמונות מוצרים</h2><p class="muted">משתמשים מצלמים מוצרים לפי ברקוד (בחלון בחירת המוצר). תמונה מאושרת מוצגת לכולם, ומחליפה את התמונה הקודמת של אותו ברקוד. מאשרים רק צילום של המוצר עצמו. על כל תמונה שמאשרים, המצלם מקבל '+repPts('pts_photo')+' נקודות מוניטין 🏅 והתראה.</p>'+
      '<div class="row2"><button class="btn'+(tab==='pending'?'':' sec')+'" data-ppt="pending">⏳ ממתינות</button><button class="btn'+(tab==='approved'?'':' sec')+'" data-ppt="approved">✅ מאושרות</button></div><div id="ppList"><p class="muted">טוען...</p></div></div>';
    const {data,error}=await sb.from('product_photos').select('id,barcode,name,image,status,created_at,by_id,credit').eq('status',tab).order('created_at',{ascending:false}).limit(60);
    const box=m.querySelector('#ppList');
    if(error){box.innerHTML='<p class="muted">⚠️ '+esc(error.message)+' — צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)</p>';return;}
    box.innerHTML=(data||[]).length?'<div class="pp53">'+data.map(r=>'<div class="pp53c"><img src="'+esc(r.image)+'" alt=""><b>'+esc(r.name||'')+'</b><small dir="ltr">'+esc(r.barcode)+'</small><small>'+(r.credit?'📷 קרדיט: '+esc(r.credit):'בלי קרדיט')+'</small><small>'+esc(new Date(r.created_at).toLocaleDateString('he-IL'))+'</small>'+
      '<div class="row2">'+(r.status!=='approved'?'<button class="btn" data-ppok="'+esc(r.id)+'">✅ אישור</button>':'')+'<button class="btn sec" data-ppno="'+esc(r.id)+'">'+(r.status==='approved'?'🗑️ הסרה':'❌ דחייה')+'</button></div></div>').join('')+'</div>'
      :'<p class="muted">'+(tab==='pending'?'אין תמונות שממתינות לאישור 🎉':'עוד אין תמונות מאושרות.')+'</p>';
    m.onclick=async e=>{const t=e.target.closest('[data-ppt]');if(t){tab=t.dataset.ppt;window.boShow('pphotos');return;}
      const a=e.target.closest('[data-ppok],[data-ppno]');if(!a)return;const yes=!!a.dataset.ppok;
      const {error:er}=await sb.from('product_photos').update({status:yes?'approved':'rejected'}).eq('id',a.dataset.ppok||a.dataset.ppno);
      if(er){flash('⚠️ '+er.message);return;}flash(yes?'✅ התמונה אושרה ומוצגת לכולם · המצלם קיבל '+repPts('pts_photo')+' מוניטין 🏅':'❌ התמונה הוסרה');window.boShow('pphotos');};});
})();
/* ℹ️ אודות ← 📜 קרדיטים ומקורות: מאיפה מגיעים המידע והתמונות, עם הרישיונות */
const _pkAbout=openAbout;
openAbout=function(){const r=_pkAbout.apply(this,arguments);try{const b=$pk('#aboutBody');if(!b||b.querySelector('.cred53'))return r;
  const a=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener">'+t+'</a>';
  const html='<details class="cred53"><summary>📜 '+T('קרדיטים ומקורות','Credits & sources')+'</summary><ul>'+
    '<li>📷 '+T('<b>תמונות ושמות מוצרים לפי ברקוד</b> — מהמאגר הפתוח ','<b>Product photos and names by barcode</b> — from the open database ')+a('https://world.openfoodfacts.org','Open Food Facts')+
      T('. המידע ברישיון ','. Data under ')+a('https://opendatacommons.org/licenses/odbl/1-0/','ODbL')+T(', והתמונות ברישיון ',', photos under ')+a('https://creativecommons.org/licenses/by-sa/3.0/deed.he','CC BY-SA')+
      T(' של מי שצילם אותן. לפניהן מוצגות תמונות שהעליתם ל"המוצרים שלי", ותמונות שמשתמשי האתר צילמו ואושרו (עם קרדיט למצלם, אם ביקש).',' by their photographers. Photos you added to "My products", and photos our users took (approved), come first.')+'</li>'+
    '<li>💰 '+T('<b>מחירים ומבצעים בסניפים</b> — מקבצי שקיפות המחירים שהרשתות מפרסמות לפי חוק.','<b>Branch prices and deals</b> — from the price transparency files the chains publish by law.')+'</li>'+
    '<li>📍 '+T('<b>איתור כתובות ומיקום</b> — ','<b>Address lookup</b> — ')+a('https://nominatim.openstreetmap.org','Nominatim')+' · © '+a('https://www.openstreetmap.org/copyright',T('התורמים של OpenStreetMap','OpenStreetMap contributors'))+'.</li>'+
    '<li>📖 '+T('<b>פסוקי פרשת השבוע</b> — ','<b>Weekly Torah portion verses</b> — ')+a('https://www.sefaria.org',T('ספריא','Sefaria'))+T(', לפי הרישיון שמצוין ליד כל טקסט.',', under the license shown next to each text.')+'</li>'+
    '</ul></details>';
  const v=b.querySelector('.nfbadge162')||b.querySelector('.ver16');if(v)v.insertAdjacentHTML('beforebegin',html);else b.insertAdjacentHTML('beforeend',html);}catch(e){console.warn('pk53 about',e);}return r;};
const st=document.createElement('style');st.textContent=
  '#pk53{position:fixed;inset-inline:8px;z-index:9400;max-width:640px;margin:0 auto;background:var(--panel,#fff);color:var(--text);border:1.5px solid var(--hdr2);border-radius:16px;box-shadow:0 8px 28px rgba(0,0,0,.22);padding:10px 12px 8px;box-sizing:border-box}#pk53[hidden]{display:none}#pk53{overflow-y:auto;overscroll-behavior:contain}#pk53 .pkrow{scrollbar-width:thin;scrollbar-color:var(--chipbr) transparent}#pk53 .pkrow::-webkit-scrollbar{height:6px}#pk53 .pkrow::-webkit-scrollbar-thumb{background:var(--chipbr);border-radius:6px}#pk53 .pkrow::-webkit-scrollbar-track{background:transparent}'+
  '.pk53tg{display:inline-flex;align-items:center;gap:6px}#r2lh .r2acts .pk53tg{gap:6px;border-radius:10px!important;padding:5px 12px!important;font-size:13px!important}#r2lh .r2acts .pk53tg .pk53sw{width:26px;height:16px}#r2lh .r2acts .pk53tg .pk53sw::after{width:12px;height:12px}#r2lh .r2acts .pk53tg.pkon .pk53sw::after{inset-inline-start:12px}@media (max-width:600px){#chips .pk53tg .pk53ic{display:none}#chips .pk53tg{padding-inline:10px;gap:5px}#chips .pk53tg .pk53sw{width:26px;height:16px}#chips .pk53tg .pk53sw::after{width:12px;height:12px}#chips .pk53tg.pkon .pk53sw::after{inset-inline-start:12px}}.pk53tg .pk53sw{position:relative;width:30px;height:18px;border-radius:9px;background:var(--line,#ccc);flex:0 0 auto;transition:background .15s}'+
  '.pk53tg .pk53sw::after{content:"";position:absolute;top:2px;inset-inline-start:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:inset-inline-start .15s}'+
  '.pk53tg.pkon .pk53sw{background:var(--hdr,#1e3a5f)}.pk53tg.pkon .pk53sw::after{inset-inline-start:14px}'+
  '#pk53 .pkh{display:flex;align-items:center;gap:8px}#pk53 .pkh b{flex:1;font-size:16px}#pk53 .pkx{background:none;border:0;font-size:18px;color:var(--muted);cursor:pointer;padding:2px 6px}'+
  '#pk53 .pksub{margin:2px 0 8px;color:var(--muted);font-size:13px}'+
  '#pk53 .pkrow{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}'+
  '.pkgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}'+
  '.pkp{flex:0 0 136px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;border:1px solid var(--chipbr,var(--line));background:var(--inputbg,var(--chat));color:var(--text);border-radius:12px;padding:8px 6px;font:inherit;cursor:pointer;min-width:0}'+
  '.pkp:hover,.pkp:focus-visible{border-color:var(--hdr2)}.pkp.on{outline:2px solid var(--hdr2);background:var(--chipbg)}'+
  '.pkp .pkimg{width:64px;height:64px;display:flex;align-items:center;justify-content:center;font-size:34px;border-radius:12px;background:#fff;overflow:hidden}'+
  '.pkart{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:12px;background:linear-gradient(150deg,#fff 0%,var(--pkbg) 70%);border:1px solid color-mix(in srgb,var(--pkfg) 18%,transparent);box-sizing:border-box}'+
  '.pkart .pkic{display:flex;width:40px;height:40px;border-radius:50%;background:#fff;align-items:center;justify-content:center;box-shadow:0 2px 6px color-mix(in srgb,var(--pkfg) 25%,transparent);color:var(--pkfg)}'+
  '.pkart .pksz{position:absolute;bottom:3px;inset-inline:3px;text-align:center;font-size:10px;font-weight:700;line-height:1.4;color:#fff;background:var(--pkfg);border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '.pkart.sm{width:20px;height:20px;border-radius:5px;flex-shrink:0}.pkart.sm .pkic{width:16px;height:16px;box-shadow:none;background:none}.pkart.sm .pkic svg{width:14px;height:14px}.pkp .pkimg img{max-width:100%;max-height:100%;object-fit:contain}'+
  '.pkp .pkn{font-size:13px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;min-height:3.75em}'+
  '.pkp small{font-size:12px;color:var(--muted)}.pkp b{font-size:14px;color:var(--hdr2)}'+
  '#pk53 .pkft{display:flex;gap:8px;align-items:center;margin-top:4px}#pk53 .pkft button{background:var(--chipbg);color:var(--text);border:0;border-radius:10px;padding:8px 12px;font:inherit;font-size:14px;cursor:pointer}'+
  '#pk53 .pkft button.lnk{background:none;color:var(--muted);text-decoration:underline;padding:8px 4px}'+
  '.pk53ch{display:inline-flex;align-items:center;gap:5px;max-width:100%;margin:3px 0 0;padding:2px 8px 2px 6px;border:1px solid var(--chipbr,var(--line));border-radius:10px;background:var(--chipbg);color:var(--text);font:inherit;font-size:12px;cursor:pointer;text-align:start;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}'+
  '.pk53ch img{width:20px;height:20px;object-fit:contain;border-radius:4px;background:#fff;flex-shrink:0}'+
  '.pk53s{display:block;font-size:12px;color:var(--hdr2)}'+
  /* כפתורים כלליים בחלונות (רקע ירוק, רוחב מלא) לא חלים על כרטיסי המוצרים */
  '#v8SheetBody .pkgrid button.pkp,#pk53 button.pkp{background:var(--inputbg,var(--chat))!important;color:var(--text)!important;width:auto!important;margin:0!important;font-weight:400!important;box-shadow:none!important}'+
  '#v8SheetBody .pkgrid button.pkp.on,#pk53 button.pkp.on{background:var(--chipbg)!important}'+
  '.pp53{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.pp53c{border:1px solid var(--line);border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:3px}'+
  '.pp53c img{width:100%;height:150px;object-fit:contain;background:#fff;border-radius:8px}.pp53c small{color:var(--muted);font-size:12px}'+
  '.pkth{position:relative;display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;flex-shrink:0;border-radius:10px;overflow:hidden;background:#fff;vertical-align:middle}'+
  '.pkth .pkart{border-radius:10px}.pkth .pkart .pkic{width:26px;height:26px;box-shadow:none}.pkth .pkart .pkic svg{width:17px;height:17px}.pkth .pkart .pkic span{font-size:18px!important}'+
  '.pkth .pkart .pksz{font-size:8px;bottom:1px;inset-inline:1px;border-radius:4px;line-height:1.3}'+
  '.pkth img{width:100%;height:100%;object-fit:contain;background:#fff}.pkth.ph{border:1px solid var(--line)}'+
  '.pkth.xs{width:24px;height:24px;border-radius:6px;margin-inline-end:5px}.pkth.xs .pkart{border-radius:6px}.pkth.xs .pkart .pkic{width:18px;height:18px;background:none}.pkth.xs .pkart .pkic svg{width:14px;height:14px}.pkth.xs .pkart .pkic span{font-size:13px!important}.pkth.xs .pksz{display:none}'+
  '.mysttab td .pkth.xs{width:22px;height:22px}.rkrow small .pkth.xs{width:34px;height:34px;margin-block:2px;border:1px solid var(--line)}.rkrow small .pkth.xs .pkart .pkic{width:24px;height:24px}'+
  '.pkby{color:var(--muted);font-size:11px}.pkby[hidden]{display:none}'+
  '.pkcred{margin:2px 0 4px;font-size:12px;color:var(--muted)}.pkcred[hidden]{display:none}.pkcred a{color:inherit}'+
  '.cred53{margin:12px 0 6px;border:1px solid var(--line);border-radius:12px;padding:8px 12px}.cred53 summary{cursor:pointer;font-weight:700;color:var(--hdr2)}'+
  '.cred53 ul{margin:8px 0 2px;padding-inline-start:18px}.cred53 li{margin:6px 0;font-size:14px;line-height:1.5}.cred53 a{color:var(--hdr2)}';
document.head.appendChild(st);
})();
