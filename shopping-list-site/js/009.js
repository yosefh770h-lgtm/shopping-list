
/* ================= גרסה 9: מלאי הבית בכמויות, עריכת מוצרים, קבלות ורשימות, סורק מהיר, צ'אט עם האתר, הצטרפות עסקים, מוניטין, תבניות קנייה ================= */
const $9=s=>document.querySelector(s);
const ZXING_SRC='/vendor/zxing-library-0.21.3.min.js',ZXING_SRI='sha384-BzBxP10ZE72aitqj5UMmUsbKFliP/DZqA8Wq+BNNhlIJDGoEd1tpkMYXOg9+n6sB';
if(!SYNC_KEYS.includes('stock'))SYNC_KEYS.push('stock','missingHome','templates');
state.stock=state.stock||{};state.missingHome=state.missingHome||[];state.templates=state.templates||[];
const _v9ApplyRemote=applyRemote;
applyRemote=function(remote,replace){_v9ApplyRemote(remote,replace);if(!remote)return;
  if(remote.stock&&typeof remote.stock==='object')state.stock=replace?remote.stock:Object.assign({},state.stock||{},remote.stock);
  if(Array.isArray(remote.missingHome))state.missingHome=replace?remote.missingHome:Array.from(new Set((state.missingHome||[]).concat(remote.missingHome))).filter(n=>!pantryHas(n));
  if(Array.isArray(remote.templates)){const ids=new Set((state.templates||[]).map(t=>t.id));state.templates=replace?remote.templates:(state.templates||[]).concat(remote.templates.filter(t=>!ids.has(t.id)));}};
onLogout('reset',()=>{state.stock={};state.missingHome=[];state.templates=[];});

/* ---------- מלאי הבית בכמויות ---------- */
const pkey=n=>NORMP[norm(n)]||norm(n);
function stockOf(n){const s=(state.stock||{})[pkey(n)];return s?s:null;}
function stockQty(n){const s=stockOf(n);return s?Number(s.q)||0:(pantryHas(n)?1:0);}
function stockSet(n,q,extra){const k=pkey(n);q=Math.max(0,Math.round((Number(q)||0)*100)/100);state.stock=state.stock||{};
  if(q<=0){delete state.stock[k];delete state.pantry[k];if(!state.missingHome.includes(k))state.missingHome.push(k);}
  else{state.stock[k]=Object.assign({},state.stock[k]||{},extra||{},{q,ts:Date.now()});state.pantry[k]=true;state.missingHome=state.missingHome.filter(x=>x!==k);}}
function stockAdd(n,q,extra){stockSet(n,stockQty(n)+(Number(q)||1),extra);}
function qtyNum(q){const p=qtyParts(q);return p?p.n:1;}
const _v9PantrySet=pantrySet;
pantrySet=function(name,val){const k=pkey(name);_v9PantrySet(name,val);state.stock=state.stock||{};state.missingHome=state.missingHome||[];
  if(val){if(!state.stock[k])state.stock[k]={q:1,ts:Date.now()};state.missingHome=state.missingHome.filter(x=>x!==k);}
  else{delete state.stock[k];if(!state.missingHome.includes(k))state.missingHome.push(k);}};
function stockSummary(){const ks=Object.keys(state.pantry||{});let units=0;ks.forEach(k=>units+=stockQty(k));return {products:ks.length,units:Math.round(units*100)/100};}
function markMissing(names,addToList){const added=[];names.forEach(n=>{stockSet(n,0);if(addToList){const l=curList();if(!l.items.some(i=>i.n===n&&!i.done)){l.items.push({id:uid(),n,q:'',c:resolveCat(n),e:emojiOf(n),done:false,ts:Date.now()});added.push(n);}}});save();render();return added;}

let invQ='';
function openInventory(focusAdd){
  const S=stockSummary();const q=norm(invQ);
  const keys=Object.keys(state.pantry||{}).filter(k=>!q||norm(k).includes(q)).sort((a,b)=>CATS.indexOf(resolveCat(a))-CATS.indexOf(resolveCat(b))||a.localeCompare(b,'he'));
  const byC={};keys.forEach(k=>{(byC[resolveCat(k)]=byC[resolveCat(k)]||[]).push(k);});
  const miss=(state.missingHome||[]).filter(k=>!pantryHas(k));
  const b=openSheet('📦 '+T('מה יש לי בבית','My home stock'),
    '<div class="kpis"><div class="kpi"><b>'+S.products+'</b><span>'+T('מוצרים בבית','products')+'</span></div><div class="kpi"><b>'+S.units+'</b><span>'+T('יחידות בסך הכל','units in total')+'</span></div><div class="kpi"><b>'+miss.length+'</b><span>'+T('חסרים בבית','missing')+'</span></div></div>'+
    '<div class="mecard" id="invAddCard"><h4>➕ '+T('הוספת מוצרים שלי','Add my products')+'</h4><div class="row2"><input id="invName" list="invNames" maxlength="60" placeholder="'+T('מוצר (למשל: חלב תנובה)','Product')+'"><input id="invQty" type="number" min="0" step="0.5" value="1" style="max-width:80px" aria-label="'+T('כמות','Quantity')+'"></div><datalist id="invNames">'+Object.keys(P).slice(0,3000).map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>'+
    '<div class="row2"><button id="invAdd">➕ '+T('הוספה לבית','Add to home')+'</button><button class="btn sec" id="invScan">📷 '+T('סריקה','Scan')+'</button><button class="btn sec" id="invReceipt">🧾 '+T('מקבלה','From receipt')+'</button></div><p class="muted-note">'+T('טיפ: אפשר לכתוב גם ברשימה או ליאמי "יש לי 3 חלב" או "אין לי ביצים".','Tip: tell Yami "I have 3 milk" or "no eggs".')+'</p></div>'+
    (miss.length?'<div class="mecard"><h4>❗ '+T('חסר בבית','Missing at home')+' ('+miss.length+')</h4>'+miss.map(k=>'<div class="merow"><span>'+emojiOf(k)+'</span><span class="grow">'+esc(k)+'</span><button class="mini pri" data-misslist="'+esc(k)+'">🛒 '+T('לרשימה','To list')+'</button><button class="mini" data-gothome="'+esc(k)+'">✓ '+T('יש','Have')+'</button><button class="mini" data-missx="'+esc(k)+'" aria-label="'+T('הסרה','Remove')+'">✕</button></div>').join('')+'<button class="btn" id="invMissAll" style="width:100%;margin-top:6px">🛒 '+T('להוסיף את כל החסר לרשימת הקניות','Add all missing to the list')+'</button></div>':'')+
    '<input id="invSearch" placeholder="🔍 '+T('חיפוש במלאי...','Search stock...')+'" value="'+esc(invQ)+'">'+
    (keys.length?Object.keys(byC).map(c=>'<div class="mecard"><h4>'+CATE[c]+' '+esc(c)+' ('+byC[c].length+')</h4>'+byC[c].map(k=>{const s=stockOf(k)||{};return '<div class="merow"><span>'+emojiOf(k)+'</span><span class="grow"><b>'+esc(k)+'</b>'+(s.brand||s.store||s.ts?'<small>'+[s.brand,s.store,s.ts?T('עודכן ','updated ')+agoText(s.ts):''].filter(Boolean).map(esc).join(' · ')+'</small>':'')+'</span><span class="qty"><button type="button" data-sq="'+esc(k)+'|-1" aria-label="'+T('פחות','Less')+'">−</button><button type="button" class="qv" data-sqe="'+esc(k)+'">'+stockQty(k)+'</button><button type="button" data-sq="'+esc(k)+'|1" aria-label="'+T('יותר','More')+'">+</button></span><button class="mini" data-sout="'+esc(k)+'" title="'+T('נגמר — להעביר לחסר','Ran out')+'">'+T('נגמר','Out')+'</button></div>';}).join('')+'</div>').join(''):'<div class="empty">'+T('עוד לא רשמת מה יש בבית 🙂 מוסיפים למעלה, מסיימים קנייה, או מעלים קבלה.','Nothing recorded yet 🙂')+'</div>'));
  if(focusAdd)setTimeout(()=>{const i=$9('#invName');if(i)i.focus();},200);
  b.oninput=e=>{if(e.target.id==='invSearch'){invQ=e.target.value;const pos=e.target.selectionStart;openInventory();const n=$9('#invSearch');n.focus();n.setSelectionRange(pos,pos);}};
  b.onclick=async e=>{const el=e.target.closest('button');if(!el)return;const d=el.dataset;
    if(el.id==='invAdd'){const n=$9('#invName').value.trim(),q=parseFloat($9('#invQty').value)||1;if(!n){flash(T('איזה מוצר?','Which product?'));return;}if(hasProfanity(n)){flash('🙏');return;}
      const name=NORMP[norm(n)]||fuzzyResolve(n)||n;if(!P[name]){P[name]={e:emojiOf(name),c:resolveCat(name)};NORMP[norm(name)]=name;}stockAdd(name,q);save();flash('🏠 '+T(name+' — יש לך עכשיו '+stockQty(name),name+': '+stockQty(name)));openInventory(true);return;}
    if(el.id==='invScan'){openBarcodeScanner(async code=>{const nm=await nameForBarcode(code);const n=nm||(await uiPrompt(T('מה המוצר עם הברקוד '+code+'?','Product for barcode '+code+'?')));if(!n)return;stockAdd(n,1,{barcode:code});save();flash('🏠 '+n+' +1');openInventory();});return;}
    if(el.id==='invReceipt'){openUpload('receipt');return;}
    if(el.id==='invMissAll'){const a=[];miss.forEach(k=>{const l=curList();if(!l.items.some(i=>i.n===k&&!i.done)){l.items.push({id:uid(),n:k,q:'',c:resolveCat(k),e:emojiOf(k),done:false,ts:Date.now()});a.push(k);}});save();render();flash('🛒 '+T('נוספו '+a.length+' מוצרים לרשימה','Added '+a.length));return;}
    if(d.misslist){addItem(d.misslist,'');return;}
    if(d.gothome){stockSet(d.gothome,1);save();openInventory();return;}
    if(d.missx){state.missingHome=state.missingHome.filter(x=>x!==d.missx);save();openInventory();return;}
    if(d.sq){const [k,dl]=d.sq.split('|');stockSet(k,stockQty(k)+Number(dl));save();openInventory();return;}
    if(d.sqe){const v=(await uiPrompt(T('כמה '+d.sqe+' יש בבית?','How many '+d.sqe+'?'),String(stockQty(d.sqe))));if(v===null)return;stockSet(d.sqe,parseFloat(v)||0);save();openInventory();return;}
    if(d.sout){stockSet(d.sout,0);save();if((await uiConfirm(T('להוסיף את '+d.sout+' לרשימת הקניות?','Add '+d.sout+' to the shopping list?'))))addItem(d.sout,'');openInventory();return;}
  };
}

/* ---------- כפתורים צדדיים: מלאי + הוספת מוצרים + קבלה ---------- */
(function(){const r=document.createElement('div');r.className='siderail';r.id='sideRail';
  r.innerHTML='<button id="srInv" title="'+T('מה יש לי בבית — כמה מכל מוצר','My home stock')+'" aria-label="'+T('מה יש לי בבית','My home stock')+'">📦<small>'+T('מלאי','Stock')+'</small></button><button id="srAdd" title="'+T('הוספת המוצרים שלי לבית','Add my products')+'" aria-label="'+T('הוספת המוצרים שלי','Add my products')+'">➕<small>'+T('לבית','Add')+'</small></button><button id="srUp" title="'+T('העלאת קבלה או רשימה','Upload receipt or list')+'" aria-label="'+T('העלאת קבלה או רשימה','Upload receipt or list')+'">🧾<small>'+T('קבלה','Receipt')+'</small></button>';
  document.body.appendChild(r);
  $9('#srInv').onclick=()=>openInventory();$9('#srAdd').onclick=()=>openInventory(true);$9('#srUp').onclick=()=>openUpload('receipt');})();

/* ---------- עריכת כל מוצר ברשימה ---------- */
function openItemEdit(id){
  const it=curList().items.find(x=>x.id===id);if(!it)return;
  const b=openSheet('✏️ '+T('עריכת מוצר','Edit item'),
    '<label class="il" for="ieName">'+T('שם המוצר (אפשר גם חברה, למשל "חלב תנובה")','Name')+'</label><input id="ieName" maxlength="60" value="'+esc(it.n)+'" list="ieNames"><datalist id="ieNames">'+Object.keys(P).slice(0,3000).map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>'+
    '<div class="grid2"><div><label class="il" for="ieQty">'+T('כמות','Quantity')+'</label><input id="ieQty" maxlength="20" value="'+esc(it.q||'')+'" placeholder="1"></div><div><label class="il" for="ieCat">'+T('קטגוריה','Category')+'</label><select id="ieCat">'+CATS.map(c=>'<option'+(c===it.c?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></div></div>'+
    '<label class="il" for="ieNote">'+T('הערה (למשל: רק בהכשר בד״ץ, הכי זול)','Note')+'</label><input id="ieNote" maxlength="80" value="'+esc(it.note||'')+'">'+
    '<div class="row2"><button id="ieSave">💾 '+T('שמירה','Save')+'</button><button class="btn sec" id="ieDel">🗑️ '+T('מחיקה','Delete')+'</button></div>');
  b.onclick=e=>{
    if(e.target.closest('#ieSave')){const n=$9('#ieName').value.trim();if(!n){flash(T('צריך שם','Name needed'));return;}const q=$9('#ieQty').value.trim(),note=$9('#ieNote').value.trim();if([n,q,note].some(hasProfanity)){flash('🙏');return;}
      it.n=n;it.q=q==='1'?'':q;it.c=$9('#ieCat').value;it.note=note;it.e=(P[n]&&P[n].e)||CATE[it.c]||emojiOf(n);it.ts=Date.now();save();render();closeSheet();flash('✏️ '+T('נשמר','Saved'));}
    if(e.target.closest('#ieDel')){closeSheet();removeItem(it.id);}
  };
}
$9('#paneList').addEventListener('click',e=>{const t=e.target.closest('[data-edititem]');if(t){e.stopPropagation();openItemEdit(t.dataset.edititem);}},true);

/* ---------- סיום קנייה: להוסיף למה שיש בבית? ---------- */
const _v9OpenFinish=openFinish;
openFinish=function(){_v9OpenFinish();const go=$9('#finGo');if(!go)return;
  go.insertAdjacentHTML('beforebegin','<label class="radio"><input type="checkbox" id="finStock" checked> 🏠 '+T('להוסיף את מה שקנינו למה שיש לי בבית (עם הכמויות)','Add what we bought to my home stock')+'</label>');
  const orig=go.onclick;go.onclick=()=>{const add=$9('#finStock').checked;const before=state.history[0];orig();const h=state.history[0];
    if(add&&h&&h!==before){h.items.forEach(i=>stockAdd(i.n,qtyNum(i.q),{store:h.store||''}));h.stocked=true;save();flash('🏠 '+T('עודכן מה יש בבית: '+h.items.length+' מוצרים','Home stock updated'));}};
};
let pendingStockAsk=null;

/* ---------- ברשימה: "אין לי X" / "יש לי 3 X" ---------- */
const _v9SendCurrent=sendCurrent;
sendCurrent=function(){
  const el=$9('#inText');const v=el.value.trim();if(!v)return _v9SendCurrent();
  const t=norm(v);let m;
  if((m=t.match(/^(אין לי|אין בבית|נגמר לי|נגמרו לי|נגמר|נגמרו|חסר לי|חסר|אזל|אזלו)\s+(.+)$/))){if(hasProfanity(v)){flash('🙏');return;}
    const its=parseItems(m[2]);const names=(its.length?its.map(i=>i.name):[m[2]]);el.value='';const added=markMissing(names,true);
    flash('❗ '+T('רשמתי שחסר בבית: '+names.join(', ')+(added.length?' — ונוסף לרשימה 🛒':''),'Marked missing'));return;}
  if((m=t.match(/^(יש לי|יש בבית|קניתי)\s+(.+)$/))){if(hasProfanity(v)){flash('🙏');return;}
    const its=parseItems(m[2]);if(!its.length)return _v9SendCurrent();el.value='';its.forEach(i=>stockSet(i.name,qtyNum(i.qty)));save();render();
    flash('🏠 '+T('עודכן בבית: ','Home updated: ')+its.map(i=>i.name+' ×'+qtyNum(i.qty)).join(', '));return;}
  return _v9SendCurrent();
};
$9('#btnSend').onclick=()=>sendCurrent();

/* ---------- העלאת קבלה / רשימת קניות (תמונות או טקסט) ---------- */
let upImgs=[],upMode='receipt',upResult=null;
function shrinkImage(file,max){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const img=new Image();img.onerror=rej;img.onload=()=>{const sc=Math.min(1,(max||1600)/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',0.82));};img.src=fr.result;};fr.readAsDataURL(file);});}
function openUpload(mode){
  upMode=mode||upMode;upResult=null;
  const b=openSheet(upMode==='receipt'?'🧾 '+T('העלאת קבלה','Upload a receipt'):'📝 '+T('העלאת רשימת קניות','Upload a shopping list'),
    '<div class="seg"><button data-um="receipt"'+(upMode==='receipt'?' class="on"':'')+'>🧾 '+T('קבלה מקנייה','Receipt')+'</button><button data-um="list"'+(upMode==='list'?' class="on"':'')+'>📝 '+T('רשימה כתובה','Written list')+'</button></div>'+
    '<p class="muted-note">'+(upMode==='receipt'?T('מצלמים את הקבלה (קבלה ארוכה — כמה תמונות), או מעלים קבלה דיגיטלית כקובץ PDF. יאמי קוראת את המוצרים, הכמויות, המחירים והחברות — ואתם מאשרים לפני שמשהו נשמר. 💚 המחירים יעזרו לכולם — נא לוודא שהם נכונים.','Photograph the receipt; you confirm before anything is saved.'):T('מצלמים רשימה בכתב יד או מדביקים טקסט — יאמי מפענחת, ואתם מאשרים לפני שזה נכנס לרשימה.','Photograph a handwritten list or paste text; you confirm first.'))+'</p>'+
    '<label class="btn" style="display:block;text-align:center;cursor:pointer">📷 '+T('לצלם עכשיו','Take a photo')+'<input type="file" id="upCam" accept="image/*" capture="environment" hidden></label>'+
    '<label class="btn sec" style="display:block;text-align:center;cursor:pointer;margin-top:8px">🖼️ '+T('בחירת תמונות מהגלריה','Choose photos from the gallery')+'<input type="file" id="upFiles" accept="image/*" multiple hidden></label>'+
    '<div class="upthumbs" id="upThumbs"></div>'+
    (upMode==='list'?'<label class="il" for="upText">'+T('או מקלידים / מדביקים את הרשימה:','Or type / paste the list:')+'</label><textarea id="upText" style="min-height:90px" placeholder="'+T('חלב 2\nלחם\nעגבניות 1 קג','milk 2\nbread')+'"></textarea>':'')+
    '<button id="upRead" style="width:100%;margin-top:8px">✨ '+T('לקרוא ולהציג לאישור','Read and show for approval')+'</button><div id="upOut"></div>');
  drawThumbs();
  b.onchange=async e=>{if(e.target.id!=='upFiles'&&e.target.id!=='upCam')return;const all=Array.from(e.target.files||[]),fs=all.slice(0,Math.max(0,(isAdmin()?6:3)-upImgs.length));if(fs.length<all.length)flash(T('⚠️ אפשר עד '+(isAdmin()?6:3)+' תמונות של רשימה','⚠️ Up to '+(isAdmin()?6:3)+' photos'));for(const f of fs){try{upImgs.push(await shrinkImage(f,1600));}catch(err){flash(T('⚠️ לא הצלחתי לקרוא תמונה','⚠️ Could not read an image'));}}e.target.value='';drawThumbs();};
  b.onclick=async e=>{
    const um=e.target.closest('[data-um]');if(um){openUpload(um.dataset.um);return;}
    const rm=e.target.closest('[data-uprm]');if(rm){upImgs.splice(+rm.dataset.uprm,1);drawThumbs();return;}
    if(e.target.closest('#upRead')){await readUpload();return;}
    if(e.target.closest('#upConfirm')){confirmUpload();return;}
  };
}
function drawThumbs(){const el=$9('#upThumbs');if(!el)return;el.innerHTML=upImgs.map((d,i)=>'<span class="upth"><img src="'+esc(safeImg(d))+'" alt=""><button data-uprm="'+i+'" aria-label="'+T('הסרה','Remove')+'">✕</button></span>').join('')+(upImgs.length?'<small>'+upImgs.length+'/'+(isAdmin()?6:3)+' '+T('תמונות','photos')+'</small>':'');}
async function readUpload(){
  const out=$9('#upOut');const txt=($9('#upText')||{}).value||'';
  if(!upImgs.length&&!txt.trim()){flash(T('מצלמים או מדביקים קודם 🙂','Add a photo or text first 🙂'));return;}
  if(!upImgs.length&&upMode==='list'){const items=txt.split(/\n|,|;/).map(x=>x.trim()).filter(Boolean).map(line=>{const p=parseItems(line)[0];return p?{name:p.name,qty:p.qty}:{name:line,qty:''};});upResult={list:{items}};return showUploadReview();}
  if(!sb||!authUser){out.innerHTML='<p class="muted-note">'+T('צריך להיות מחוברים 🙂','Sign in first 🙂')+'</p>';return;}
  out.innerHTML='<div class="empty">🔍 '+T('קוראת... (עד חצי דקה)','Reading... (up to 30s)')+'</div>';
  const mode=upMode;
  const t0=Date.now(),nImg=upImgs.length,kb=Math.round(upImgs.reduce((n,d)=>n+d.length,0)*3/4/1024);
  const send=async()=>{let data=null,error=null;try{({data,error}=await sb.functions.invoke('ai-chat',{body:{vision:mode,images:upImgs,text:txt}}));}catch(e){error=e;}
    const st=error&&error.context&&error.context.status;if(error&&error.context&&typeof error.context.json==='function'){try{data=await error.context.json();}catch(e){}}return {data,error,st};};
  let r=await send();
  /* 401: הטוקן של הכניסה פג (טלפון שהיה ברקע, אפליקציה שנפתחה אחרי זמן) — מחדשים את הכניסה ושולחים פעם אחת שוב */
  let refreshed=false;if(r.st===401){try{const {data:rs}=await sb.auth.refreshSession();refreshed=!!(rs&&rs.session);}catch(e){}if(refreshed)r=await send();}
  let {data,error}=r;const httpSt=r.st;
  /* 401 שלא מהפונקציה עצמה (היא עונה {error:"unauthorized"}) — Supabase חסם לפני הפונקציה: ההגדרה Verify JWT */
  const gw401=httpSt===401&&!(data&&data.error==='unauthorized');
  /* השרת לא זיהה את המשתמש — בודקים מהמכשיר אם הכניסה תקינה מול Supabase (אם כן — הבעיה בשרת, לא בחשבון) */
  let selfChk='';if(httpSt===401&&!gw401){try{const {data:u,error:ue}=await sb.auth.getUser();selfChk=u&&u.user?'תקינה':'לא תקינה'+(ue&&ue.message?' ('+String(ue.message).slice(0,60)+')':'');}catch(e){selfChk='לא נבדקה';}}
  /* בזמן הקריאה (עד חצי דקה) המשתמש פתח חלון אחר או החליף בין קבלה לרשימה — התשובה כבר לא שייכת למסך הזה */
  if($9('#upOut')!==out||upMode!==mode){flash('ℹ️ '+T('הקריאה הסתיימה אחרי שהחלון הוחלף — אפשר להעלות שוב','The reading finished after the window changed — please upload again'));return;}
  /* נכשל בלי הסבר מהשרת (החיבור נקטע, השרת לא ענה בזמן, התמונות כבדות מדי, החיבור פג) — אומרים מה קרה ורושמים ביומן התקלות */
  let why='';if(!data||(!data[upMode]&&!data.text&&!data.disabled)){const sec=Math.round((Date.now()-t0)/1000),code=httpSt||(data&&data.error)||(error?(error.name||'error'):'empty');
    why=gw401?T('השרת דחה את הבקשה (תקלה בהגדרות השרת, לא בחשבון שלכם). הצוות קיבל הודעה — נסו שוב מאוחר יותר.','The server rejected the request (a server setting). Please try later.')+(isAdmin()?' 🛠️ '+T('למנהל: Supabase ← Edge Functions ← ai-chat ← לכבות Verify JWT ← Save.',''):'')
      :httpSt===401&&refreshed?T('השרת לא הצליח לזהות את החשבון (תקלה בשרת, לא אצלכם). הצוות קיבל הודעה — נסו שוב מאוחר יותר.','The server could not verify the account (server issue). Please try later.')
      :code==='unauthorized'||httpSt===401?T('צריך להתחבר מחדש לחשבון ולנסות שוב.','Please sign in again.')
      :httpSt===413||httpSt===546||code==='no_input'?T('השרת לא הצליח לעבד את התמונות — נסו שוב, ואם זה חוזר: פחות תמונות.','The server could not process the photos — try again, or with fewer photos.')
      :httpSt===504||httpSt===408||sec>=140?T('הקריאה לקחה יותר מדי זמן — נסו שוב, או פחות תמונות.','It took too long — try again or with fewer photos.')
      :!httpSt&&error?T('החיבור לשרת נקטע באמצע השליחה (אינטרנט חלש או סינון). נסו שוב.','The connection was cut while sending. Try again.')
      :T('לא הצלחתי לקרוא 🙁','Could not read 🙁')+' ('+T('קוד','code')+' '+code+')';
    try{sb.rpc('log_client_error',{p_msg:('קריאת '+(mode==='receipt'?'קבלה':'רשימה')+' נכשלה: '+code+(gw401?' · נחסם לפני הפונקציה (Verify JWT?)':'')+(httpSt===401?' · חידוש כניסה: '+(refreshed?'הצליח':'נכשל')+(selfChk?' · הכניסה במכשיר: '+selfChk:''):'')+' · '+String((data&&(data.detail||data.message||data.msg||data.error))||(error&&error.message)||'').slice(0,160)).slice(0,500),p_src:'readUpload · '+nImg+' חלקים · '+kb+'KB · '+sec+' שנ׳ · '+(/YamShoppingApp|; wv\)/.test(navigator.userAgent)?'אפליקציה':'אתר'),p_ua:navigator.userAgent.slice(0,200),p_ver:String(typeof APP_VERSION!=='undefined'?APP_VERSION:''),...(window.errCtx?errCtx():{})}).then(()=>{},()=>{});}catch(e){}}
  if(!data||data.disabled||(!data[upMode])){out.innerHTML='<p class="muted-note">⚠️ '+esc(why||(data&&data.text)||(data&&data.disabled?T('קריאת קבלות ורשימות צריכה את הבינה המלאכותית — היא עוד לא מופעלת באתר.','Reading needs the AI, which is not enabled.'):T('לא הצלחתי לקרוא 🙁','Could not read 🙁')))+(isAdmin()&&data&&(data.detail||data.reason)?' ('+esc(data.detail||data.reason)+')':'')+'</p>'+(upMode==='list'?'<p class="muted-note">'+T('בינתיים אפשר להדביק את הרשימה כטקסט.','Meanwhile you can paste the list as text.')+'</p>':'');
    /* הכניסה במכשיר הזה כבר לא תקפה בשרת (וגם החידוש נכשל) — כפתור שמוציא ומחזיר למסך הכניסה */
    if(httpSt===401&&!gw401&&!refreshed){out.insertAdjacentHTML('beforeend','<button class="btn" id="upRelogin" style="width:100%;margin-top:6px">🔑 '+T('להתחבר מחדש','Sign in again')+'</button>');
      const rb=out.querySelector('#upRelogin');if(rb)rb.onclick=async ev=>{ev.stopPropagation();try{await sb.auth.signOut({scope:'local'});}catch(e){}try{closeSheet();}catch(e){}if(typeof showLogin==='function')showLogin();};}
    return;}
  upResult=data;showUploadReview();
}
function showUploadReview(){
  const out=$9('#upOut');if(!out||!upResult)return;const now=new Date();
  if(upMode==='receipt'){const r=upResult.receipt;const store=(r.store||'').trim();const known=allChainNames().find(c=>norm(store).includes(norm(c))||norm(c).includes(norm(store)))||store;
    out.innerHTML='<div class="mecard"><h4>🧾 '+T('בדקו ואשרו','Check and confirm')+'</h4><div class="grid2"><div><label class="il">'+T('חנות / רשת','Store')+'</label><input id="urStore" list="urStores" maxlength="40" value="'+esc(known)+'"><datalist id="urStores">'+allChainNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist></div><div><label class="il">'+T('סניף','Branch')+'</label><input id="urBranch" maxlength="120" value="'+esc(r.branch||'')+'"></div>'+
      '<div><label class="il">'+T('תאריך הקנייה','Purchase date')+'</label><input id="urDate" type="date" value="'+esc(/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')?r.date:dayKey(now))+'"></div><div><label class="il">'+T('הקבלה הועלתה','Uploaded')+'</label><input value="'+esc(fmtDate(now)+' '+fmtTime(now))+'" readonly></div></div>'+
      '<div class="urlist">'+r.items.map((it,i)=>{const unit=Number(it.price)||(Number(it.total)&&Number(it.qty)?Number(it.total)/Number(it.qty):0);return '<div class="urcard" data-ur="'+i+'"><div class="urtop"><input type="checkbox" data-f="on" checked aria-label="'+T('לכלול','Include')+'"><input data-f="name" value="'+esc(it.name||'')+'" maxlength="60" aria-label="'+T('מוצר','Product')+'">'+(it.deal?'<span class="urdeal">🔥 '+esc(it.deal)+'</span>':'')+'</div>'+
        '<div class="urgrid"><label>'+T('חברה','Brand')+'<input data-f="brand" value="'+esc(it.brand||'')+'" maxlength="40"></label><label>'+T('כמות','Qty')+'<input data-f="qty" value="'+esc(String(it.qty||1))+'" inputmode="decimal"></label><label>'+T('מחיר ליח׳','Unit price')+'<input data-f="price" value="'+(unit?Math.round(unit*100)/100:'')+'" inputmode="decimal"></label><label>'+T('ברקוד','Barcode')+'<input data-f="barcode" value="'+esc(it.barcode||'')+'" inputmode="numeric" dir="ltr"></label></div></div>';}).join('')+'</div>'+
      (r.total?'<p class="muted-note">'+T('סה״כ בקבלה: ','Receipt total: ')+fmtPrice(r.total,myCurrency())+'</p>':'')+
      '<label class="radio"><input type="checkbox" id="urPub" checked> 📢 '+T('לפרסם את המחירים לכולם (עוזר לכל הקהילה לחסוך)','Publish the prices for everyone')+'</label>'+
      '<label class="radio"><input type="checkbox" id="urStock" checked> 🏠 '+T('להוסיף למה שיש לי בבית','Add to my home stock')+'</label>'+
      '<label class="radio"><input type="checkbox" id="urHist" checked> 🧾 '+T('לשמור כקנייה ב"מה קניתי ואיפה"','Save as a purchase')+'</label>'+
      '<p class="muted-note">💚 '+T('האתר נועד לעזור לאנשים — נא לפרסם רק מחירים נכונים.','Please publish only correct prices.')+'</p><button id="upConfirm" style="width:100%">✅ '+T('אישור ושמירה','Confirm and save')+'</button></div>';
  }else{const items=(upResult.list&&upResult.list.items)||[];
    out.innerHTML='<div class="mecard"><h4>📝 '+T('זה מה שהבנתי — בדקו ואשרו','Here is what I read — confirm')+'</h4>'+
      items.map((it,i)=>'<div class="merow" data-ur="'+i+'"><input type="checkbox" data-f="on" checked style="width:auto"><input data-f="name" value="'+esc(String(it.name||'').replace(/\?$/,''))+'" maxlength="60" class="grow"'+(/\?$/.test(it.name||'')?' style="border-color:#e0a000" title="'+T('לא בטוחה שקראתי נכון','Not sure I read this right')+'"':'')+'><input data-f="qty" value="'+esc(String(it.qty||''))+'" placeholder="'+T('כמות','Qty')+'" style="width:70px"></div>').join('')+
      '<label class="il" for="ulTarget">'+T('לאן להוסיף?','Add to:')+'</label><select id="ulTarget"><option value="cur">'+T('לרשימה הפעילה: ','Active list: ')+esc(curList().name)+'</option><option value="new">'+T('לרשימה חדשה','A new list')+'</option></select>'+
      '<label class="radio"><input type="checkbox" id="ulMissing" checked> ❗ '+T('לרשום שהמוצרים האלה חסרים בבית','Mark these as missing at home')+'</label>'+
      '<button id="upConfirm" style="width:100%">✅ '+T('אישור והוספה','Confirm and add')+'</button></div>';}
  out.scrollIntoView({behavior:'smooth',block:'start'});
}
async function confirmUpload(){
  const rows=Array.from(document.querySelectorAll('#upOut [data-ur]')).map(r=>{const g=f=>{const x=r.querySelector('[data-f='+f+']');return x?(x.type==='checkbox'?x.checked:x.value.trim()):'';};return {on:g('on'),name:g('name'),brand:g('brand'),qty:g('qty'),price:parseFloat(String(g('price')).replace(/[^\d.]/g,'')),barcode:String(g('barcode')).replace(/\D/g,'')};}).filter(r=>r.on&&r.name);
  if(!rows.length){flash(T('לא נבחרו מוצרים','Nothing selected'));return;}
  if(rows.some(r=>hasProfanity(r.name)||hasProfanity(r.brand||''))){flash('🙏');return;}
  if(upMode==='list'){
    let l=curList();if($9('#ulTarget').value==='new'){const n=(await uiPrompt(T('שם הרשימה החדשה:','New list name:'),T('רשימה מצולמת','Scanned list')));if(n===null)return;l={id:uid(),name:(n.trim()||T('רשימה','List')).slice(0,40),items:[],created:Date.now()};state.lists.push(l);state.active=l.id;}
    rows.forEach(r=>{const name=NORMP[norm(r.name)]||fuzzyResolve(r.name)||r.name;if(!l.items.some(i=>i.n===name&&!i.done))l.items.push({id:uid(),n:name,q:r.qty||'',c:resolveCat(name),e:emojiOf(name),done:false,ts:Date.now()});if($9('#ulMissing').checked)stockSet(name,0);});
    save();render();closeSheet();upImgs=[];setTab('list');flash('📝 '+T('נוספו '+rows.length+' מוצרים לרשימה "'+l.name+'"','Added '+rows.length));return;}
  const store=$9('#urStore').value.trim().slice(0,40),branch=$9('#urBranch').value.trim().slice(0,120),date=$9('#urDate').value||dayKey(new Date());
  const pub=$9('#urPub').checked,addStock=$9('#urStock').checked,addHist=$9('#urHist').checked;
  if(pub&&!store){flash(T('⚠️ כדי לפרסם מחירים צריך לכתוב את שם החנות','⚠️ Store name needed to publish'));return;}
  const btn=$9('#upConfirm');btn.disabled=true;let pubN=0,pubErr='';
  if(pub&&sb&&authUser){for(const r of rows){if(!(r.price>0&&r.price<100000))continue;const product=(r.name+(r.brand&&!norm(r.name).includes(norm(r.brand))?' '+r.brand:'')).slice(0,60);
    const err=await insertPrice({product,chain:store,branch:branch||T('לפי קבלה','From receipt'),price:r.price,barcode:/^\d{4,20}$/.test(r.barcode)?r.barcode:null});if(err)pubErr=err.message;else pubN++;}}
  let ts=new Date(date+'T12:00:00').getTime();
  /* קנייה מהרשימה שכבר סיימתם באותו יום — הקבלה מצטרפת אליה במקום להירשם כקנייה נוספת */
  /* לאיזו קנייה הקבלה שייכת — המשתמש בוחר בחלון האישור (ברירת המחדל: הקנייה מאותו יום ומאותה חנות) */
  const twin=typeof window.rcLinkPick==='function'?window.rcLinkPick(ts,store):findTwinTrip(ts,store,false);
  const listed=n=>{const k=norm(n);return !!twin&&(twin.items||[]).some(x=>{const j=norm(x.n);return !!j&&(k.includes(j)||j.includes(k));});};
  if(addStock)rows.forEach(r=>{if(twin&&twin.stocked&&listed(r.name))return;stockAdd(NORMP[norm(r.name)]||r.name,parseFloat(r.qty)||1,{brand:r.brand||'',store,barcode:r.barcode||''});});
  const rcItems=rows.map(r=>({n:r.name,q:String(r.qty||''),e:emojiOf(r.name),brand:r.brand,price:r.price||null,barcode:r.barcode||''}));
  if(addHist&&twin){ts=twin.ts;twin.listItems=twin.items;twin.items=rcItems;twin.receipt=true;twin.linked=true;twin.uploadedAt=Date.now();if(store)twin.store=store;
    if(sb&&authUser){const at=new Date(ts).toISOString();sb.from('purchases').delete().eq('bought_at',at).then(()=>sb.from('purchases').insert(rows.map(r=>({product:r.name.slice(0,80),qty:String(r.qty||'').slice(0,20),store,bought_at:at})))).then(()=>{},()=>{});}}
  else if(addHist){state.history.unshift({ts,listName:T('קבלה','Receipt'),by:(state.user&&state.user.name)||'',store,receipt:true,uploadedAt:Date.now(),items:rcItems});state.history.sort((a,b)=>b.ts-a.ts);
    if(sb&&authUser)sb.from('purchases').insert(rows.map(r=>({product:r.name.slice(0,80),qty:String(r.qty||'').slice(0,20),store,bought_at:new Date(ts).toISOString()}))).then(()=>{},()=>{});}
  save();render();btn.disabled=false;closeSheet();upImgs=[];
  flash('🧾 '+T('נשמר!','Saved!')+(addHist&&twin?' 🔗 '+T('צורף לקנייה שסיימת ברשימה — לא נספר פעמיים','joined to your finished shopping — not counted twice'):'')+(pubN?' 📢 '+T('פורסמו '+pubN+' מחירים — תודה! המוניטין שלך עלה 🏅',pubN+' prices published'):'')+(pubErr?' ⚠️ '+pubErr:''));
}

/* ---------- סורק ברקוד מקצועי: מהיר, רציף, צפצוף, פנס ---------- */
let scanState={gen:0,on:false,cont:false,last:'',lastAt:0,reader:null,raf:0,track:null,list:[]};
/* צליל אחד שחוזר על עצמו — לא יוצרים נגן חדש בכל סריקה */
let beepCtx=null;function beep(){try{const C=window.AudioContext||window.webkitAudioContext;if(C){if(!beepCtx||beepCtx.state==='closed')beepCtx=new C();const a=beepCtx;if(a.state==='suspended')a.resume().catch(()=>{});const o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=1500;g.gain.value=0.08;o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+0.09);}}catch(e){}try{if(window.YamApp&&typeof YamApp.buzz==='function')YamApp.buzz(60);else navigator.vibrate&&navigator.vibrate(60);}catch(e){}}
function loadZxing(){return new Promise((res,rej)=>{if(window.ZXing)return res(window.ZXing);const s=document.createElement('script');s.src=ZXING_SRC;s.integrity=ZXING_SRI;s.crossOrigin='anonymous';s.onload=()=>res(window.ZXing);s.onerror=()=>rej(new Error('zxing'));document.head.appendChild(s);});}
async function nameForBarcode(code){
  const p=dbProducts.find(x=>x.barcode===code);if(p)return p.name+(p.brand?' '+p.brand:'');
  if(!sb)return '';
  try{const r=await sb.from('products').select('name,brand').eq('barcode',code).maybeSingle();if(r.data)return r.data.name+(r.data.brand?' '+r.data.brand:'');}catch(e){}
  if(authUser){try{const {data}=await sb.from('prices').select('product').eq('barcode',code).order('created_at',{ascending:false}).limit(1);if(data&&data[0])return data[0].product;}catch(e){}}
  return '';
}
function scanUi(){
  const ov=$9('#scanOverlay');if(ov.querySelector('.scanframe'))return;
  const v=$9('#scanVideo');const wrap=document.createElement('div');wrap.className='scanwrap';v.parentNode.insertBefore(wrap,v);wrap.appendChild(v);
  wrap.insertAdjacentHTML('beforeend','<div class="scanframe" aria-hidden="true"><i></i></div>');
  $9('#scanHint').insertAdjacentHTML('beforebegin','<div class="scanbar"><button class="btn sec" id="scTorch" type="button">🔦 '+T('פנס','Light')+'</button><button class="btn sec" id="scCont" type="button" aria-pressed="false">🔁 '+T('סריקה רציפה לרשימה','Continuous to list')+'</button></div><div class="scanbar"><label class="btn" id="scPhoto" style="text-align:center;cursor:pointer">📸 '+T('לצלם את הברקוד','Take a photo of the barcode')+'<input type="file" id="scPhotoIn" accept="image/*" capture="environment" hidden></label><button class="btn sec" id="scLive" type="button" hidden>🎥 '+T('לנסות סריקה חיה','Try live scan')+'</button></div><div id="scList" class="sclist"></div>');
  $9('#scPhotoIn').onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(f)scanFromPhoto(f);};
  $9('#scLive').onclick=()=>{scanPhotoMode(false);openBarcodeScanner(scanCb);};
  $9('#scTorch').onclick=async()=>{const t=scanState.track;if(!t)return;try{const on=!scanState.torch;await t.applyConstraints({advanced:[{torch:on}]});scanState.torch=on;$9('#scTorch').classList.toggle('on',on);}catch(e){flash(T('אין פנס במצלמה הזו','No flashlight on this camera'));}};
  $9('#scCont').onclick=()=>{scanState.cont=!scanState.cont;$9('#scCont').classList.toggle('on',scanState.cont);$9('#scCont').setAttribute('aria-pressed',String(scanState.cont));$9('#scanHint').textContent=scanState.cont?T('סורקים מוצר אחרי מוצר — כל אחד נכנס לרשימה','Scan item after item — each goes to the list'):T('מכוונים את המצלמה לברקוד','Point the camera at the barcode');};
}
async function onScanned(code,isQr){
  const now=Date.now();if(scanState.closing||(code===scanState.last&&now-scanState.lastAt<1800))return;scanState.last=code;scanState.lastAt=now;beep();
  if(isQr){/* 📡 קוד סנכרון (js/087-offsync.js): כמה קודים ברצף — המצלמה נשארת פתוחה עד שכולם נקלטו */
    const off=window.offQrTake?offQrTake(code):null;if(off==='more')return;closeBarcodeScanner();if(!off)onScannedQr(code);return;}
  /* 2.0: רטט קצר + "✓ נסרק: ..." ירוק ומסגרת ירוקה, ורק אז המצלמה נסגרת */
  if(!scanState.cont){scanOk20(code);scanState.closing=true;setTimeout(()=>{scanState.closing=false;closeBarcodeScanner();scanCb&&scanCb(code);},550);return;}
  scanOk20(code);
  const name=await nameForBarcode(code)||(T('מוצר ','Item ')+code);scanOk20(code,name);addItem(name,'');scanState.list.unshift(name);
  $9('#scList').innerHTML=scanState.list.slice(0,6).map(n=>'<span>✓ '+esc(n)+'</span>').join('');
}
/* קוד QR (ולא ברקוד של מוצר): קישור שלנו נפתח כאן, קישור אחר מוצג עם כפתור, וטקסט רגיל מוצג כמו שהוא */
function onScannedQr(text){
  const t=String(text||'').trim().slice(0,2000);let u=null;try{u=new URL(t);}catch(e){}
  if(u&&u.protocol==='https:'&&/(^|\.)yamshopping\.com$/i.test(u.hostname)){location.href=u.href;return;}
  const isLink=u&&(u.protocol==='https:'||u.protocol==='http:');
  openSheet('🔳 '+T('קוד QR','QR code'),'<p class="muted-note">'+T('זה קוד QR ולא ברקוד של מוצר. מה שכתוב בו:','This is a QR code, not a product barcode. It says:')+'</p><p dir="auto" style="word-break:break-all;user-select:text">'+esc(t)+'</p>'+(isLink?'<a class="btn" style="display:block;text-align:center" href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">🔗 '+T('לפתוח את הקישור','Open the link')+'</a>':''));
}
/* עוצרים מצלמה שנשארה פתוחה. טלפונים חלשים (למשל שיאומי Qin) קורסים כשפותחים את המצלמה פעם שנייה בזמן שהראשונה עוד דולקת */
function stopScanStream(s){try{(s||barcodeStream)&&(s||barcodeStream).getTracks().forEach(t=>t.stop());}catch(e){}if(!s||s===barcodeStream)barcodeStream=null;try{const v=$9('#scanVideo');if(v&&(!s||v.srcObject===s)){v.pause();v.srcObject=null;}}catch(e){}}
async function getScanStream(){
  const tries=[{video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},{video:{facingMode:{ideal:'environment'}},audio:false},{video:true,audio:false}];
  let last;for(const c of tries){try{return await navigator.mediaDevices.getUserMedia(c);}catch(e){last=e;if(e&&(e.name==='NotAllowedError'||e.name==='SecurityError'))break;}}
  throw last;
}
openBarcodeScanner=async function(cb){
  scanCb=cb||(code=>{const el=$9('#prBarcode');if(el)el.value=code;flash('📷 '+T('ברקוד נסרק: ','Scanned: ')+code);});
  /* לחיצה כפולה / פתיחה מחדש: קודם סוגרים את הסריקה הקודמת והמצלמה שלה */
  const gen=++scanState.gen;cancelAnimationFrame(scanState.raf);clearTimeout(scanState.raf);stopScanStream();
  scanUi();scanState.list=[];$9('#scList').innerHTML='';scanState.cont=false;$9('#scCont').classList.remove('on');$9('#scCont').hidden=!!cb&&cb.name!=='listScan';
  const ov=$9('#scanOverlay');ov.classList.add('open');const hint=$9('#scanHint');$9('#scanCode').value='';scanState.on=true;
  const alive=()=>scanState.on&&scanState.gen===gen&&ov.classList.contains('open');
  const live=!scanPhotoMode()&&!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
  ov.classList.toggle('scphoto',!live);$9('#scLive').hidden=live||!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
  if(!live){hint.textContent=T('מצלמים את הברקוד מקרוב, ישר ובאור טוב — או מקלידים את המספר שמתחת לפסים 🙂','Take a close, sharp photo of the barcode — or type the number 🙂');return;}
  hint.textContent=T('מכוונים את המצלמה לברקוד','Point the camera at the barcode');
  let stream=null;
  try{
    scanLiveMark(true);stream=await getScanStream();
    /* סגרו את הסורק בזמן שחיכינו לאישור המצלמה — לא משאירים אותה דולקת */
    if(!alive()){stopScanStream(stream);return;}
    barcodeStream=stream;scanState.track=stream.getVideoTracks()[0];
    try{const caps=scanState.track.getCapabilities&&scanState.track.getCapabilities();$9('#scTorch').hidden=!(caps&&caps.torch);if(caps&&caps.focusMode&&caps.focusMode.includes('continuous'))scanState.track.applyConstraints({advanced:[{focusMode:'continuous'}]}).catch(()=>{});}catch(e){$9('#scTorch').hidden=true;}
    const video=$9('#scanVideo');video.setAttribute('playsinline','');video.muted=true;video.srcObject=stream;
    try{await video.play();}catch(e){if(!alive())return;}
    if(!alive())return;
    /* מפענחים תמונה קטנה מתוך המסגרת (עד 640 פיקסלים) כמה פעמים בשנייה — ולא כל פריים בגודל מלא, שמעמיס על טלפון חלש עד קריסה */
    const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
    const grab=()=>{const w=video.videoWidth,h=video.videoHeight;if(!w||!h||video.readyState<2)return false;
      const sw=Math.round(w*.8),sh=Math.round(h*.6),k=Math.min(1,640/sw);const cw=Math.max(1,Math.round(sw*k)),ch=Math.max(1,Math.round(sh*k));
      if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch;}cx.drawImage(video,(w-sw)/2,(h-sh)/2,sw,sh,0,0,cw,ch);return true;};
    let native=null;if(scanNativeOk()){try{const fm=await window.BarcodeDetector.getSupportedFormats();const want=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf','qr_code'].filter(f=>fm.includes(f));if(want.some(f=>f!=='qr_code'))native=new window.BarcodeDetector({formats:want});}catch(e){}}
    if(!alive())return;
    let zx=null;
    const useZxing=async()=>{
      /* בלי סורק מובנה (אייפון, כרום במחשב, טלפונים בלי שירותי גוגל): מפענחים בעצמנו. BrowserMultiFormatReader של ZXing מחכה לאירוע 'playing' שכבר עבר אחרי video.play(), ולכן אף פעם לא סרק */
      let Z;try{Z=await loadZxing();}catch(e){if(alive())hint.textContent=T('הסורק לא נטען — בודקים את החיבור לאינטרנט, או מקלידים את המספר שמתחת לפסים 🙂','Scanner failed to load — type the number 🙂');return false;}
      const hints=new Map();hints.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E,Z.BarcodeFormat.CODE_128,Z.BarcodeFormat.CODE_39,Z.BarcodeFormat.ITF,Z.BarcodeFormat.QR_CODE]);
      const fast=new Z.MultiFormatReader();fast.setHints(hints);const hard=new Z.MultiFormatReader();const h2=new Map(hints);h2.set(Z.DecodeHintType.TRY_HARDER,true);hard.setHints(h2);
      zx={Z,fast,hard,n:0};return true;};
    if(!native&&!(await useZxing()))return;
    let fails=0;
    const step=async()=>{if(!alive())return;
      try{if(grab()){
        if(native){
          try{const codes=await native.detect(cv);fails=0;if(codes&&codes.length&&alive())await onScanned(codes[0].rawValue,codes[0].format==='qr_code');}
          catch(e){/* הסורק המובנה נכשל שוב ושוב (קורה בטלפונים בלי שירותי גוגל) — עוברים לסורק שלנו */if(++fails>=5){native=null;if(!(await useZxing()))return;}}
        }else if(zx){
          const rd=(++zx.n%4===0)?zx.hard:zx.fast;
          try{const r=rd.decodeWithState(new zx.Z.BinaryBitmap(new zx.Z.HybridBinarizer(new zx.Z.HTMLCanvasElementLuminanceSource(cv))));if(r&&alive())onScanned(r.getText(),r.getBarcodeFormat()===zx.Z.BarcodeFormat.QR_CODE);}catch(e){}
        }}}catch(e){}
      if(alive())scanState.raf=setTimeout(step,native?120:100);};
    step();
  }catch(e){if(stream&&scanState.gen===gen)stopScanStream(stream);if(alive())hint.textContent=T('לא הצלחתי לפתוח את המצלמה — מאשרים "מצלמה" בדפדפן, או מקלידים את הברקוד 🙂','Camera unavailable — allow camera or type the code 🙂');}
};
const _v9CloseScanner=closeBarcodeScanner;
closeBarcodeScanner=function(){scanState.on=false;scanState.gen++;cancelAnimationFrame(scanState.raf);clearTimeout(scanState.raf);if(scanState.reader){try{scanState.reader.stopContinuousDecode();}catch(e){}try{scanState.reader.reset();}catch(e){}scanState.reader=null;}scanState.track=null;scanState.torch=false;_v9CloseScanner();stopScanStream();scanLiveMark(false);};
/* יוצאים מהאפליקציה / מחליפים לשונית באמצע סריקה — סוגרים את המצלמה, כדי שלא תישאר תפוסה ותקריס בחזרה */
/* רק כשהמצלמה כבר דולקת: חלון אישור המצלמה באפליקציה גם הוא מסתיר את הדף לרגע, ואז לא סוגרים */
document.addEventListener('visibilitychange',()=>{if(document.hidden&&scanState.on&&barcodeStream)closeBarcodeScanner();});
window.addEventListener('pagehide',()=>{if(scanState.on)closeBarcodeScanner();});
/* האפליקציה נסגרה ברקע בזמן שהמצלמה של הטלפון הייתה פתוחה (קורה בשיאומי): התמונה מגיעה מהאפליקציה אחרי שהדף נטען מחדש */
window.yamAppPhoto=function(d){try{const bin=atob(String(d).split(',')[1]||''),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const b=new Blob([u],{type:'image/jpeg'});scanPhotoMode(true);openBarcodeScanner(code=>lookupBarcode(code));scanFromPhoto(b);}catch(e){}};
/* זיהוי קריסה: לפני שפותחים מצלמה חיה רושמים סימן, ובסגירה מוחקים. אם הדף נטען מחדש והסימן עוד שם — הדף קרס באמצע הסריקה
   (קורה בטלפונים חלשים, למשל שיאומי Qin). מאז הסורק במכשיר הזה עובד בצילום תמונה, ונרשם דיווח ביומן התקלות עם פרטי המכשיר */
/* הסורק המובנה של הדפדפן (BarcodeDetector) באנדרואיד עובר דרך שירותי גוגל. בטלפון בלי שירותי גוגל עם WebView ישן (למשל Qin 3 Ultra, כרום 91)
   הקריאה אליו מפילה את כל הדף — גם בצילום תמונה. לכן: לא ב-WebView ישן, ולא במכשיר שכבר קרס בסריקה; שם מפענחים רק עם ZXing */
function scanNativeOk(){if(!('BarcodeDetector' in window))return false;try{if(localStorage.getItem('yamScanNoNative')==='1')return false;}catch(e){}
  const ua=navigator.userAgent,m=ua.match(/Chrome\/(\d+)/);if(/Android/.test(ua)&&/; wv\)/.test(ua)&&m&&+m[1]<110)return false;return true;}
function scanPhotoMark(on){try{if(on)localStorage.setItem('yamScanPhotoTry',String(Date.now()));else localStorage.removeItem('yamScanPhotoTry');}catch(e){}}
function scanLiveMark(on){try{if(on)localStorage.setItem('yamScanLive',String(Date.now()));else localStorage.removeItem('yamScanLive');}catch(e){}}
function scanPhotoMode(v){try{if(v===undefined)return localStorage.getItem('yamScanPhoto')==='1';if(v)localStorage.setItem('yamScanPhoto','1');else localStorage.removeItem('yamScanPhoto');}catch(e){}return false;}
(function(){let p=0;try{p=+localStorage.getItem('yamScanPhotoTry')||0;localStorage.removeItem('yamScanPhotoTry');}catch(e){}
  if(p&&Date.now()-p<30*60000){try{localStorage.setItem('yamScanNoNative','1');}catch(e){}
    setTimeout(()=>{try{window.logClientError&&window.logClientError('📷 הדף קרס בזמן חיפוש ברקוד בתמונה','scan-photo-crash · native '+('BarcodeDetector' in window?'yes':'no'));}catch(e){}},6000);}})();
(function(){let t=0;try{t=+localStorage.getItem('yamScanLive')||0;localStorage.removeItem('yamScanLive');}catch(e){}
  if(!t||Date.now()-t>30*60000)return;scanPhotoMode(true);try{localStorage.setItem('yamScanNoNative','1');}catch(e){}
  const scr=(screen&&screen.width?screen.width+'x'+screen.height:'')+' dpr '+(window.devicePixelRatio||1)+' mem '+(navigator.deviceMemory||'?');
  setTimeout(()=>{try{window.logClientError&&window.logClientError('📷 הדף קרס בזמן סריקה במצלמה — במכשיר הזה הסורק עובר לצילום תמונה','scan-crash · '+scr);}catch(e){}},6000);})();
/* סריקה מתוך תמונה: בלי וידאו חי, אז גם טלפון חלש מצליח. מקטינים לרוחב 1600 לכל היותר, ומנסים גם מסובב (ברקוד שצולם לאורך) */
async function scanFromPhoto(file){
  const hint=$9('#scanHint');scanPhotoMark(true);try{await scanFromPhoto2(file,hint);}finally{scanPhotoMark(false);}}
async function scanFromPhoto2(file,hint){hint.textContent='⏳ '+T('מחפש ברקוד בתמונה...','Looking for a barcode...');
  /* תמונה מהמצלמה יכולה להיות עשרות מגה-פיקסלים. מפענחים אותה כבר מוקטנת (רוחב 1600), כי פענוח בגודל מלא מקריס טלפון חלש */
  let img=null;try{if(window.createImageBitmap)img=await createImageBitmap(file,{resizeWidth:1600,resizeQuality:'medium'});}catch(e){img=null;}
  if(!img){try{img=await new Promise((res,rej)=>{const u=URL.createObjectURL(file);const i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i);};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'));};i.src=u;});}
  catch(e){hint.textContent=T('לא הצלחתי לפתוח את התמונה — מנסים שוב או מקלידים את המספר 🙂','Could not open the photo — try again or type the number 🙂');return;}}
  const W=img.naturalWidth||img.width,H=img.naturalHeight||img.height,k=Math.min(1,1600/Math.max(W,H));
  const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
  const draw=rot=>{const w=Math.round(W*k),h=Math.round(H*k);if(rot){cv.width=h;cv.height=w;cx.setTransform(0,1,-1,0,h,0);}else{cv.width=w;cv.height=h;cx.setTransform(1,0,0,1,0,0);}cx.drawImage(img,0,0,w,h);cx.setTransform(1,0,0,1,0,0);};
  let found=null;
  if(scanNativeOk()){try{const fm=await window.BarcodeDetector.getSupportedFormats();const want=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf','qr_code'].filter(f=>fm.includes(f));
    if(want.length){const d=new window.BarcodeDetector({formats:want});for(const rot of [0,1]){draw(rot);const c=await d.detect(cv);if(c&&c.length){found={t:c[0].rawValue,qr:c[0].format==='qr_code'};break;}}}}catch(e){}}
  if(!found){let Z;try{Z=await loadZxing();}catch(e){hint.textContent=T('הסורק לא נטען — בודקים את החיבור לאינטרנט, או מקלידים את המספר 🙂','Scanner failed to load — type the number 🙂');return;}
    const h=new Map();h.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E,Z.BarcodeFormat.CODE_128,Z.BarcodeFormat.CODE_39,Z.BarcodeFormat.ITF,Z.BarcodeFormat.QR_CODE]);h.set(Z.DecodeHintType.TRY_HARDER,true);
    const rd=new Z.MultiFormatReader();rd.setHints(h);
    for(const rot of [0,1]){draw(rot);try{const r=rd.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv))));if(r){found={t:r.getText(),qr:r.getBarcodeFormat()===Z.BarcodeFormat.QR_CODE};break;}}catch(e){}}}
  cv.width=cv.height=0;try{img.close&&img.close();}catch(e){}
  if(!found){hint.textContent=T('לא מצאתי ברקוד בתמונה — מצלמים שוב מקרוב, ישר ובאור טוב, או מקלידים את המספר 🙂','No barcode found — take a closer, sharper photo or type the number 🙂');return;}
  scanState.last='';await onScanned(found.t,found.qr);
  if(scanState.cont&&$9('#scanOverlay').classList.contains('open'))hint.textContent='✓ '+T('נוסף — מצלמים את המוצר הבא','Added — photograph the next item');
}
$9('#btnCloseScan').onclick=()=>closeBarcodeScanner();
function listScan(code){lookupBarcode(code);}
function openListScanner(){openBarcodeScanner(listScan);setTimeout(()=>{if(!scanState.cont)$9('#scCont').click();},50);}

/* ---------- צ'אט עם האתר (לכל לקוח ובעל עסק) ---------- */
let chatMsgs=[],chatUnread=0;
(function(){const b=document.createElement('button');b.className='hbtn chatbtn';b.id='btnChat';b.title=T('התכתבות עם האתר','Chat with us');b.setAttribute('aria-label',T('התכתבות עם האתר','Chat with us'));
  b.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M7 11h10"/><path d="M7 15h6"/><path d="M7 7h8"/></svg><span class="bellbadge" id="chatBadge" hidden></span>';
  const bell=$9('#btnBell');bell.parentNode.insertBefore(b,bell);b.onclick=e=>{e.stopPropagation();openChat();};})();
async function loadChat(){if(!sb||!authUser)return [];try{const {data,error}=await sb.from('support_messages').select('*').eq('user_id',authUser.id).order('created_at').limit(300);if(error)return null;chatMsgs=data||[];}catch(e){return null;}
  chatUnread=chatMsgs.filter(m=>m.from_staff&&!m.read_by_user).length;const bd=$9('#chatBadge');bd.hidden=!chatUnread;bd.textContent=chatUnread;
  chatTell(chatMsgs.filter(m=>m.from_staff&&!m.read_by_user));
  return chatMsgs;}
/* הודעה מהצוות: התראה בטלפון פעם אחת בלבד, ולא בפעמון (יש לה מספר משלה על כפתור הצ'אט).
   באפליקציה: מה שהגיע כשהאפליקציה הייתה סגורה כבר הוצג בהתראה מהבדיקה ברקע — לא מקפיצים שוב כשנכנסים */
const CHAT_TOLD_KEY='yamh_chat_told',CHAT_T0=Date.now();
{const old=inbox.filter(x=>String(x.id||'').startsWith('chat:'));if(old.length){
  try{const t=JSON.parse(localStorage.getItem(CHAT_TOLD_KEY)||'[]');localStorage.setItem(CHAT_TOLD_KEY,JSON.stringify((Array.isArray(t)?t:[]).concat(old.map(x=>x.id.slice(5))).slice(-200)));}catch(e){}
  inbox=inbox.filter(x=>!String(x.id||'').startsWith('chat:'));saveInbox();}}
function chatTell(list){
  let told=[];try{told=JSON.parse(localStorage.getItem(CHAT_TOLD_KEY)||'[]');if(!Array.isArray(told))told=[];}catch(e){told=[];}
  const fresh=list.filter(m=>!told.includes(m.id));if(!fresh.length)return;
  const inApp=/YamShoppingApp\//.test(navigator.userAgent||'');
  fresh.forEach(m=>{if(prefs.notify&&!(inApp&&Date.parse(m.created_at)<CHAT_T0))sysNotify(T('הודעה חדשה מהאתר 💬','New message from us 💬'),m.body,'chat:'+m.id,'./');});
  try{localStorage.setItem(CHAT_TOLD_KEY,JSON.stringify(told.concat(fresh.map(m=>m.id)).slice(-200)));}catch(e){}
}
async function openChat(){
  $9('#hMenu').classList.remove('open');
  const b=openSheet('💬 '+T('התכתבות עם האתר','Chat with us'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');
  if(!sb||!authUser){b.innerHTML='<p class="muted-note">'+T('צריך להיות מחוברים כדי להתכתב 🙂','Sign in to chat 🙂')+'</p>';return;}
  const r=await loadChat();
  if(r===null){b.innerHTML='<p class="muted-note">'+(isAdmin()?'⚠️ צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית)':T('הצ\'אט עוד לא זמין 🙏','Chat is not available yet 🙏'))+'</p>';return;}
  const draw=()=>{b.innerHTML='<p class="muted-note">👋 '+T('כאן כותבים ישירות לצוות האתר — שאלה, הצעה, תקלה, או בקשה להצטרף כבעל עסק. נענה בהקדם 💚','Write to the site team — we will answer soon 💚')+'</p>'+
    '<div class="chatbox" id="chatBox">'+(chatMsgs.length?chatMsgs.map(m=>'<div class="row '+(m.from_staff?'bot':'me')+'"><div class="bub">'+(m.from_staff?'<b style="font-size:12px;color:var(--hdr2)">🏪 '+T('צוות האתר','Site team')+'</b><br>':'')+esc(m.body).replace(/\n/g,'<br>')+'<div class="t">'+esc(agoText(m.created_at))+' '+fmtTime(new Date(m.created_at))+'</div></div></div>').join(''):'<div class="empty">'+T('עוד אין הודעות — כתבו לנו!','No messages yet — write to us!')+'</div>')+'</div>'+
    '<div class="row2"><textarea id="chatText" maxlength="4000" placeholder="'+T('כתבו הודעה...','Write a message...')+'" style="min-height:52px"></textarea><button id="chatSend" style="flex:0 0 auto">➤</button></div>'+
    (isAdmin()?'<p class="muted-note">🛠️ '+T('את ההודעות של כל המשתמשים רואים ועונים בבק אופיס ← 💬 צ\'אט עם משתמשים.','Admin: all chats are in the back office.')+'</p>':'')+
    '<button class="btn sec" id="chatBiz" style="width:100%;margin-top:6px">🏪 '+T('יש לי חנות / סופר — בקשה להצטרף','I own a store — request to join')+'</button>';
    const box=$9('#chatBox');box.scrollTop=box.scrollHeight;};
  draw();
  const unread=chatMsgs.filter(m=>m.from_staff&&!m.read_by_user).map(m=>m.id);if(unread.length){sb.from('support_messages').update({read_by_user:true}).in('id',unread).then(()=>{chatMsgs.forEach(m=>{if(unread.includes(m.id))m.read_by_user=true;});$9('#chatBadge').hidden=true;});}
  b.onclick=async e=>{
    if(e.target.closest('#chatBiz')){openBizJoin();return;}
    if(e.target.closest('#chatSend')){const t=$9('#chatText').value.trim();if(!t)return;if(hasProfanity(t)){flash('🙏 '+T('נא לכתוב בלשון נקייה','Please keep it clean'));return;}
      const {error}=await sb.from('support_messages').insert({user_id:authUser.id,body:t.slice(0,4000)});if(error){flash('⚠️ '+error.message);return;}await loadChat();draw();flash('💬 '+T('נשלח — נענה בהקדם','Sent'));}
  };
  b.onkeydown=e=>{if(e.target.id==='chatText'&&e.key==='Enter'&&!e.shiftKey&&!TOUCH_KB&&!e.isComposing){e.preventDefault();$9('#chatSend').click();}};
}
setInterval(()=>{if(document.visibilityState==='visible'&&authUser)loadChat();},90000);
/* חוזרים לאתר או לאפליקציה (מהרקע, מחלון אחר, או כשהאינטרנט חזר) — בודקים מיד אם הצוות ענה, בלי לחכות לבדיקה הבאה.
   באפליקציה 2.0 הדף נשאר פתוח ברקע ולא נטען מחדש, ולכן בלי זה המספר על 💬 לא התעדכן עד שפתחו את הצ'אט */
{let lastChatChk=0;const chatNow=()=>{if(document.visibilityState!=='visible'||!sb||!authUser)return;const t=Date.now();if(t-lastChatChk<15000)return;lastChatChk=t;loadChat();};
  document.addEventListener('visibilitychange',chatNow);window.addEventListener('focus',chatNow);window.addEventListener('pageshow',chatNow);window.addEventListener('online',chatNow);}

/* ---------- בקשת הצטרפות של בעלי עסקים ---------- */
async function openBizJoin(){
  const b=openSheet('🏪 '+T('הצטרפות כבעל עסק','Join as a business'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');
  if(!sb||!authUser){b.innerHTML='<p class="muted-note">'+T('צריך להיות מחוברים 🙂','Sign in first 🙂')+'</p>';return;}
  let mine=[];try{const {data}=await sb.from('business_requests').select('*').eq('user_id',authUser.id).order('created_at',{ascending:false});mine=data||[];}catch(e){}
  b.innerHTML=(myStore?'<p class="muted-note">✅ '+T('את/ה כבר מקושר/ת לחנות '+esc(myStore.chain)+' — ✏️ עריכת הפרופיל בלשונית 🏪 חנויות.','You are already linked to '+esc(myStore.chain))+'</p>':'')+
    (mine.length?'<div class="mecard"><h4>📋 '+T('הבקשות שלי','My requests')+'</h4>'+mine.map(r=>'<div class="merow"><span class="grow"><b>'+esc(r.business)+'</b><small>'+esc(agoText(r.created_at))+'</small></span><span>'+({pending:'⏳ '+T('בבדיקה','Pending'),approved:'✅ '+T('אושרה','Approved'),rejected:'✕ '+T('לא אושרה','Declined')}[r.status])+'</span></div>').join('')+'</div>':'')+
    '<p class="muted-note">'+T('בעלי חנויות וסופרים מקבלים: פרופיל עסקי ציבורי, עדכון מחירים ומבצעים (גם בקובץ), ופניות מלקוחות. ממלאים — ואנחנו חוזרים אליכם.','Store owners get a public profile, price & deal updates and customer messages.')+'</p>'+
    '<label class="il">'+T('שם העסק','Business name')+'</label><input id="bjBiz" list="bjChains" maxlength="60"><datalist id="bjChains">'+allChainNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>'+
    '<div class="grid2"><div><label class="il">'+T('סניף / כתובת','Branch / address')+'</label><input id="bjBranch" maxlength="120"></div><div><label class="il">'+T('סוג העסק','Type')+'</label><select id="bjCat">'+Object.keys(STORE_TYPES).map(k=>'<option value="'+k+'">'+STORE_TYPES[k][0]+' '+esc(typeName(k))+'</option>').join('')+'</select></div>'+
    '<div><label class="il">'+T('התפקיד שלי','My role')+'</label><select id="bjRole"><option value="owner">'+T('בעל/ת העסק','Owner')+'</option><option value="manager">'+T('אחראי/ת סניף','Manager')+'</option></select></div><div><label class="il">'+T('טלפון','Phone')+'</label><input id="bjPhone" type="tel" maxlength="30" dir="ltr" style="text-align:right"></div></div>'+
    '<label class="il">'+T('השם שלי','My name')+'</label><input id="bjName" maxlength="60" value="'+esc((state.user&&state.user.name)||'')+'"><label class="il">'+T('מה תרצו לספר לנו?','Anything to add?')+'</label><textarea id="bjMsg" maxlength="2000" style="min-height:60px"></textarea>'+
    '<button id="bjSend" style="width:100%">📨 '+T('שליחת הבקשה','Send request')+'</button>';
  b.onclick=async e=>{if(!e.target.closest('#bjSend'))return;const v=id=>$9(id).value.trim();
    if(!v('#bjBiz')||!v('#bjPhone')){flash(T('צריך שם עסק וטלפון','Business name and phone needed'));return;}if([v('#bjBiz'),v('#bjBranch'),v('#bjName'),v('#bjMsg')].some(hasProfanity)){flash('🙏');return;}
    const {error}=await sb.from('business_requests').insert({business:v('#bjBiz'),branch:v('#bjBranch'),category:v('#bjCat'),role:v('#bjRole'),phone:v('#bjPhone'),name:v('#bjName'),message:v('#bjMsg'),user_id:authUser.id});
    if(error){flash('⚠️ '+error.message);return;}flash('📨 '+T('הבקשה נשלחה! נחזור אליך בהקדם','Request sent!'));openBizJoin();};
}

/* ---------- המוניטין שלי ---------- */
const REP_LEVELS=[[0,'🌱',T('חדש/ה בקהילה','Newcomer')],[5,'🥉',T('מדווח/ת','Reporter')],[15,'🥈',T('מדווח/ת פעיל/ה','Active reporter')],[40,'🥇',T('מוביל/ה בקהילה','Community leader')],[70,'💎',T('אלוף/ת הקהילה','Community champion')]];
if(!ME_TABS.some(t=>t[0]==='rep'))ME_TABS.splice(1,0,['rep','🏅 המוניטין שלי','🏅 My reputation']);
async function repHtml(){
  let me=null;if(sb&&authUser){try{if(window.pro2)await pro2.refresh();await loadRepScores();me=repScores[authUser.id]||null;}catch(e){}}
  const sc=me?me.score:0,reports=me?me.reports:0,confirms=me?me.confirms:0;
  let li=0;REP_LEVELS.forEach((l,i)=>{if(sc>=l[0])li=i;});const cur=REP_LEVELS[li],nxt=REP_LEVELS[li+1];
  const pct=nxt?Math.round(100*(sc-cur[0])/(nxt[0]-cur[0])):100;
  return '<div class="mehero"><div class="av">'+cur[1]+'</div><div><b>'+T('המוניטין שלך: ','Your reputation: ')+sc+' '+T('נקודות','points')+'</b><small>'+esc(cur[2])+(nxt?' · '+T('עוד '+(nxt[0]-sc)+' נקודות ל'+nxt[1]+' '+nxt[2],(nxt[0]-sc)+' more to '+nxt[2]):' · '+T('הגעת לרמה הכי גבוהה! 🎉','Top level! 🎉'))+'</small></div></div>'+
    '<div class="mecard"><div class="hbar"><span>'+cur[1]+' '+esc(cur[2])+'</span><i><b style="width:'+Math.max(4,pct)+'%"></b></i><span>'+(nxt?nxt[1]:'🏆')+'</span></div>'+
    '<div class="kpis" style="margin-top:8px"><div class="kpi"><b>'+reports+'</b><span>'+T('מחירים שדיווחת','prices reported')+'</span></div><div class="kpi"><b>'+confirms+'</b><span>'+T('אישורים שקיבלת','confirmations')+'</span></div><div class="kpi"><b>'+(me&&me.photos||0)+'</b><span>'+T('תמונות שאושרו','photos approved')+'</span></div><div class="kpi"><b>'+(me?me.bonus:0)+'</b><span>'+T('בונוס מהמנהל','bonus')+'</span></div></div></div>'+
    '<div class="mecard"><h4>🚀 '+T('איך עולים ברמה?','How to level up')+'</h4>'+
    '<div class="merow"><span>🏷️</span><span class="grow">'+T('כל מחיר נכון שמדווחים ומאושר','Each approved price you report')+'</span><b>+'+repPts('pts_price')+'</b></div>'+
    '<div class="merow"><span>✅</span><span class="grow">'+T('כל פעם שמישהו מאשר שהמחיר שלך נכון','Each time someone confirms your price')+'</span><b>+'+repPts('pts_confirm')+'</b></div>'+
    '<div class="merow"><span>📷</span><span class="grow">'+T('צילום מוצר שהמנהל מאשר — מופיע לכולם בבחירת המוצר','A product photo the admin approves')+'</span><b>+'+repPts('pts_photo')+'</b></div>'+
    '<div class="merow"><span>🧾</span><span class="grow">'+T('צילום קבלה — מפרסם הרבה מחירים בבת אחת','Upload a receipt — many prices at once')+'</span><b>+'+T('הרבה','lots')+'</b></div>'+
    '<div class="merow"><span>🤝</span><span class="grow">'+T('חברים, שיתופים ותרומה לקהילה — הרשימה המלאה במסך הפרו','Friends, shares and community — full list on the Pro screen')+'</span><b>+</b></div>'+
    '<div class="merow"><span>💎</span><span class="grow">'+T(repPts('solo_points')+' מוניטין = Yam shopping PRO','Reach '+repPts('solo_points')+' for Pro')+'</span><button type="button" class="mini pri" onclick="window.pro2&&pro2.open()">⭐ PRO</button></div>'+
    '<p class="muted-note">💚 '+T('האתר נועד לעזור לאנשים — נא לדווח רק מחירים ומידע נכונים. דיווח שמשתמשים מסמנים "לא נכון" נבדק ע״י המנהל.','Please report only correct information.')+'</p>'+
    '<div class="row2"><button class="btn" data-q9="report">💰 '+T('לדווח מחיר','Report a price')+'</button><button class="btn sec" data-q9="receipt">🧾 '+T('לצלם קבלה','Upload receipt')+'</button></div></div>';
}

/* ---------- קניות קודמות: לפי תאריך, להוסיף לרשימה, לשמור כתבנית ---------- */
function templatesHtml(){const ts=state.templates||[];
  return '<div class="mecard"><h4>⭐ '+T('תבניות קנייה','Shopping templates')+'</h4><p class="muted-note">'+T('למשל "קניות למנגל משפחתי" — בפעם הבאה לוחצים, מאשרים, ונפתחת רשימה מוכנה.','e.g. "Family BBQ" — next time one tap creates the list.')+'</p>'+
    (ts.length?ts.map(t=>'<div class="merow"><span>⭐</span><span class="grow"><b>'+esc(t.name)+'</b><small>'+t.items.slice(0,6).map(i=>esc(i.n)).join(', ')+(t.items.length>6?'…':'')+' ('+t.items.length+')</small></span><button class="mini pri" data-tpluse="'+esc(t.id)+'">🛒 '+T('ליצור רשימה','Create list')+'</button><button class="mini" data-tpledit="'+esc(t.id)+'">✏️</button><button class="mini bad" data-tpldel="'+esc(t.id)+'" aria-label="'+T('מחיקה','Delete')+'">✕</button></div>').join(''):'<p class="muted-note">'+T('עוד אין תבניות. לוחצים "⭐ לשמור כתבנית" ליד קנייה קודמת למטה, או ליד הרשימה הנוכחית.','No templates yet.')+'</p>')+
    '<button class="btn sec" data-tplcur="1" style="width:100%">⭐ '+T('לשמור את הרשימה הנוכחית כתבנית','Save the current list as a template')+'</button></div>';}
function saveTemplate(name,items){name=(name||'').trim().slice(0,40);if(!name||!items.length)return false;if(hasProfanity(name)){flash('🙏');return false;}
  state.templates=state.templates||[];state.templates.unshift({id:uid(),name,items:items.map(i=>({n:i.n,q:i.q||''})),ts:Date.now()});save();flash('⭐ '+T('נשמרה התבנית "'+name+'"','Template saved'));return true;}
async function useTemplate(id){const t=(state.templates||[]).find(x=>x.id===id);if(!t)return;
  if(!(await uiConfirm(T('ליצור רשימה חדשה "'+t.name+'" עם '+t.items.length+' מוצרים?\n\n'+t.items.map(i=>'• '+i.n+(i.q?' ×'+i.q:'')).join('\n'),'Create a new list "'+t.name+'"?'))))return;
  const l={id:uid(),name:t.name.slice(0,40),items:t.items.map(i=>({id:uid(),n:i.n,q:i.q||'',c:resolveCat(i.n),e:emojiOf(i.n),done:false,ts:Date.now()})),created:Date.now()};state.lists.push(l);state.active=l.id;save();render();setTab('list');
  const mo=$9('#meOverlay');if(mo)mo.classList.remove('open');closeSheet();flash('🛒 '+T('נפתחה הרשימה "'+t.name+'"','List created'));}
const _v9PurchasesHtml=purchasesHtml;
purchasesHtml=function(){
  const q=norm(state.purQ||'');const list=state.history.map((h,i)=>({h,i})).filter(({h})=>!q||norm((h.store||'')+' '+h.items.map(x=>x.n).join(' ')).includes(q)).sort((a,b)=>b.h.ts-a.h.ts);
  const byDay={};list.forEach(x=>{const k=dayKey(x.h.ts);(byDay[k]=byDay[k]||[]).push(x);});
  return templatesHtml()+'<div class="mecard"><h4>🧾 '+T('מה קניתי ואיפה — לפי תאריך','What I bought and where — by date')+'</h4><input id="purQ" placeholder="🔍 '+T('חיפוש מוצר או חנות...','Search...')+'" value="'+esc(state.purQ||'')+'">'+
    (list.length?Object.keys(byDay).slice(0,60).map(d=>'<div class="purday"><b>📅 '+esc(fmtDate(new Date(byDay[d][0].h.ts)))+' · '+esc(hebDate(new Date(byDay[d][0].h.ts)))+'</b>'+byDay[d].map(({h,i})=>'<div class="purcard"><div class="merow" style="border:none;padding:4px 0"><span>'+(h.receipt?'🧾':'🛍️')+'</span><span class="grow"><b>'+(h.store?'🏪 '+esc(h.store):esc(h.listName||''))+'</b><small>'+fmtTime(new Date(h.ts))+(h.by?' · '+esc(h.by):'')+(h.uploadedAt?' · '+T('קבלה הועלתה ','receipt uploaded ')+esc(agoText(h.uploadedAt)):'')+' · '+h.items.length+' '+T('מוצרים','items')+'</small></span></div>'+
      '<small class="purits">'+h.items.map(x=>esc(x.n)+(x.brand?' ('+esc(x.brand)+')':'')+(x.q?' ×'+esc(x.q):'')+(x.price?' · '+fmtPrice(x.price,myCurrency()):'')).join(' · ')+'</small>'+
      '<div class="row2" style="margin-top:6px"><button class="mini pri" data-puradd="'+i+'">➕ '+T('להוסיף לרשימה','Add to list')+'</button><button class="mini" data-purtpl="'+i+'">⭐ '+T('לשמור כתבנית','Save as template')+'</button></div>'+(typeof rcxCan==='function'&&rcxCan(h)?'<button class="mini rcxbtn" data-purcheap="'+i+'">💡 '+T('איפה היה יותר זול?','Where was it cheaper?')+'</button>':'')+'</div>').join('')+'</div>').join(''):'<p class="muted-note">'+T('עוד אין קניות. מסמנים ✓ ולוחצים "סיום קנייה", או מעלים קבלה 🧾.','No purchases yet.')+'</p>')+'</div>';
};
const _v9RenderMe=renderMe;
renderMe=function(){if(meTab==='rep'){_v9RenderMe();$9('#meBody').innerHTML='<div class="empty">'+T('טוען...','Loading...')+'</div>';repHtml().then(h=>{if(meTab==='rep')$9('#meBody').innerHTML=h;});return;}
  _v9RenderMe();
  if(meTab==='info'){$9('#meBody').insertAdjacentHTML('beforeend','<div class="mecard"><h4>🚪 '+T('החשבון','Account')+'</h4><div class="row2"><button class="btn sec" data-q9="chat">💬 '+T('התכתבות עם האתר','Chat with us')+'</button><button class="btn sec" data-q9="biz">🏪 '+T('יש לי עסק','I own a business')+'</button></div><button class="btn sec" data-q9="logout" style="width:100%;margin-top:8px;color:var(--bad,#b23b3b)">🚪 '+T('יציאה מהחשבון','Sign out')+'</button></div>');
    const tiles=$9('#meBody .metiles');if(tiles)tiles.insertAdjacentHTML('beforeend','<button class="metile" data-q9="inv"><span>📦</span>'+T('מה יש לי בבית','My home stock')+'</button><button class="metile" data-q9="rep"><span>🏅</span>'+T('המוניטין שלי','My reputation')+'</button>');}
};
$9('#meBody').addEventListener('click',async e=>{const q=e.target.closest('[data-q9]');
  if(q){const k=q.dataset.q9;
    if(k==='logout'){if((await uiConfirm(T('לצאת מהחשבון?','Sign out?')))){$9('#meOverlay').classList.remove('open');doLogout();}return;}
    if(k==='chat'){$9('#meOverlay').classList.remove('open');openChat();return;}
    if(k==='biz'){$9('#meOverlay').classList.remove('open');openBizJoin();return;}
    if(k==='inv'){$9('#meOverlay').classList.remove('open');openInventory();return;}
    if(k==='rep'){meTab='rep';renderMe();return;}
    if(k==='report'){$9('#meOverlay').classList.remove('open');setTab('prices');setTimeout(()=>{const a=$9('#prProduct');if(a)a.focus();},300);return;}
    if(k==='receipt'){$9('#meOverlay').classList.remove('open');openUpload('receipt');return;}}
  const a=e.target.closest('[data-puradd]');if(a){const h=state.history[+a.dataset.puradd];if(!h)return;const l=curList();const miss=h.items.filter(x=>!l.items.some(i=>i.n===x.n&&!i.done));
    if(!miss.length){flash(T('הכל כבר ברשימה ✔','Already on the list ✔'));return;}
    if(!(await uiConfirm(T('להוסיף '+miss.length+' מוצרים מהקנייה הזו לרשימה "'+l.name+'"?\n\n'+miss.map(x=>'• '+x.n+(x.q?' ×'+x.q:'')).join('\n'),'Add '+miss.length+' items to "'+l.name+'"?'))))return;
    addMany(miss.map(x=>({n:x.n,q:x.q})));flash('🛒 '+T('נוספו '+miss.length+' מוצרים','Added '+miss.length));return;}
  const tp=e.target.closest('[data-purtpl]');if(tp){const h=state.history[+tp.dataset.purtpl];if(!h)return;const n=(await uiPrompt(T('שם לתבנית (למשל: קניות למנגל משפחתי)','Template name'),h.store?T('קנייה ב'+h.store,'Shopping at '+h.store):''));if(n===null)return;if(saveTemplate(n,h.items))renderMe();return;}
  if(e.target.closest('[data-tplcur]')){const l=curList();if(!l.items.length){flash(T('הרשימה ריקה','The list is empty'));return;}const n=(await uiPrompt(T('שם לתבנית:','Template name:'),l.name));if(n===null)return;if(saveTemplate(n,l.items))renderMe();return;}
  const tu=e.target.closest('[data-tpluse]');if(tu){useTemplate(tu.dataset.tpluse);return;}
  const td=e.target.closest('[data-tpldel]');if(td){if(!(await uiConfirm(T('למחוק את התבנית?','Delete this template?'))))return;state.templates=state.templates.filter(t=>t.id!==td.dataset.tpldel);save();renderMe();return;}
  const te=e.target.closest('[data-tpledit]');if(te){const t=state.templates.find(x=>x.id===te.dataset.tpledit);if(!t)return;
    const nm=(await uiPrompt(T('שם התבנית:','Template name:'),t.name));if(nm===null)return;const its=(await uiPrompt(T('המוצרים (מופרדים בפסיקים, אפשר עם כמות: "חלב 2"):','Items (comma separated):'),t.items.map(i=>i.n+(i.q?' '+i.q:'')).join(', ')));if(its===null)return;
    if(hasProfanity(nm)||hasProfanity(its)){flash('🙏');return;}t.name=nm.trim().slice(0,40)||t.name;t.items=its.split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const p=parseItems(x)[0];return p?{n:p.name,q:p.qty||''}:{n:x,q:''};});save();renderMe();flash('✏️ '+T('התבנית עודכנה','Template updated'));}
},true);

/* ---------- פעמון: הצעות להוספה + הודעה לקהילה ---------- */
function notifySugg(id,title,names,tab){if(!names.length||inbox.some(x=>x.id===id))return;inbox.unshift({id,cat:'order',icon:'💡',title,body:names.join(', '),sugg:names.slice(0,12),tab:tab||'list',ts:Date.now(),read:false});saveInbox();updateBell(true);}
const _v9RenderNotif=renderNotif;
renderNotif=function(){_v9RenderNotif();const b=$9('#notifBody');
  b.insertAdjacentHTML('afterbegin','<p class="muted-note" style="background:var(--chipbg);border-radius:10px;padding:8px 10px">💚 '+T('האתר נועד לעזור לאנשים — נא לדווח רק מחירים ומידע נכונים. כל דיווח עוזר לכולם לחסוך.','This site exists to help people — please report only correct information.')+'</p>');
  inbox.forEach(x=>{if(!x.sugg)return;const el=b.querySelector('[data-nid="'+CSS.escape(x.id)+'"] .nb');if(el)el.insertAdjacentHTML('beforeend','<div class="suggrow">'+x.sugg.map(n=>'<button class="mini" data-suggadd="'+esc(n)+'">➕ '+esc(n)+'</button>').join('')+'<button class="mini pri" data-suggall="'+esc(x.id)+'">🛒 '+T('הכל','All')+'</button></div>');});
};
$9('#notifBody').addEventListener('click',e=>{const a=e.target.closest('[data-suggadd]');if(a){e.stopPropagation();addItem(a.dataset.suggadd,'');a.disabled=true;a.textContent='✓ '+a.dataset.suggadd;return;}
  const al=e.target.closest('[data-suggall]');if(al){e.stopPropagation();const x=inbox.find(y=>y.id===al.dataset.suggall);if(x){const n=addMany(x.sugg.map(s=>({n:s})));flash('🛒 '+T('נוספו '+n+' מוצרים','Added '+n));}}},true);
function makeSuggestions(){
  const l=curList();const inList=new Set(l.items.filter(i=>!i.done).map(i=>i.n));
  const due=dueItems().map(p=>p.n);const staples=((meData().profile||{}).staples||[]).filter(n=>!pantryHas(n));const miss=(state.missingHome||[]);
  const names=Array.from(new Set(due.concat(miss,staples))).filter(n=>!inList.has(n));
  if(names.length)notifySugg('sugg:'+dayKey(new Date()),T('💡 הצעה: אולי להוסיף לרשימה?','💡 Suggestion: add to your list?'),names,'list');
}

/* ---------- יאמי: אוצר מילים רחב יותר + פעולות לבעלי עסקים ---------- */
async function v9BotPre(raw){
  const t=norm(raw);if(hasProfanity(raw))return false;let m;
  if(pendingStockAsk){const p=pendingStockAsk;pendingStockAsk=null;if(/^(כן|בטח|סבבה|אוקיי|אוקי|יאללה|בשמחה|רוצה)/.test(t)){p.items.forEach(i=>stockAdd(i.n,qtyNum(i.q),{store:p.store||''}));save();botSay('🏠 '+T('עדכנתי מה יש בבית ('+p.items.length+' מוצרים). אפשר לראות ב"📦 מלאי".','Home stock updated.'));return true;}if(/^(לא|לא צריך|לא תודה|דלג)/.test(t)){botSay(T('בסדר 🙂','OK 🙂'));return true;}}
  if(askStoreTs){const ts=askStoreTs;setTimeout(()=>{if(!askStoreTs){const h=state.history.find(x=>x.ts===ts);if(h){pendingStockAsk={items:h.items,store:h.store};botSay('🏠 '+T('להוסיף את מה שקנית ('+h.items.length+' מוצרים) למה שיש לך בבית? (כן/לא)','Add what you bought to your home stock? (yes/no)'));}}},400);return false;}
  if(state.introFlow)return false;
  if((m=t.match(/^(?:כמה|יש לי כמה)\s+(.+?)\s+(?:יש לי|יש בבית|נשאר|נשארו)\??$/))||(m=t.match(/^(?:כמה יש לי|כמה נשאר לי|כמה נשארו לי)\s+(.+?)\??$/))){const n=NORMP[norm(m[1])]||fuzzyResolve(m[1])||m[1];const q=stockQty(n);botSay(q?'🏠 '+T('יש לך '+q+' '+n,'You have '+q+' '+n):'❗ '+T('אין לך '+n+' בבית. להוסיף לרשימה? '+GW2('כתבי','כתוב')+' "תוסיפי '+n+'"','You have no '+n));return true;}
  if((m=t.match(/^(?:יש לי|יש בבית|קניתי|הבאתי)\s+(.+)$/))&&/\d|שני|שתי|שלוש|ארבע|חמש/.test(m[1])){const its=parseItems(m[1]);if(its.length){its.forEach(i=>stockSet(i.name,qtyNum(i.qty)));save();renderHome();botSay('🏠 '+T('עדכנתי בבית: ','Updated: ')+its.map(i=>i.name+' ×'+qtyNum(i.qty)).join(', '));return true;}}
  if((m=t.match(/^(?:השתמשתי ב|השתמשנו ב|גמרתי את|גמרנו את|פתחתי|לקחתי)\s*(.+)$/))){const its=parseItems(m[1]);if(its.length){const out=[];its.forEach(i=>{const left=Math.max(0,stockQty(i.name)-qtyNum(i.qty));stockSet(i.name,left);out.push(i.name+': '+left);});save();botSay('🏠 '+T('עדכנתי: ','Updated: ')+out.join(', ')+(out.some(x=>/: 0$/.test(x))?'\n❗ '+T('מה שנגמר — נרשם כחסר בבית. להוסיף לרשימה? כתבו "תוסיפי ..."','Out of stock items marked missing.'):''));return true;}}
  if(/(המלאי שלי|מלאי הבית|מה יש לי בבית בכמויות|כמה יש לי מכל|רשימת המלאי)/.test(t)||/^((תפתחי|פתחי|תראי|הראי)\s+(לי\s+)?(את\s+)?)?(ה)?מלאי[?？!.]*$/.test(t)){openInventory();const S=stockSummary();botSay('📦 '+T('בבית: '+S.products+' מוצרים, '+S.units+' יחידות. פתחתי את המלאי.',S.products+' products at home.'));return true;}
  if(/(מה חסר בבית|מה אין לי|מה נגמר בבית|רשימת החסר)/.test(t)){const miss=(state.missingHome||[]).filter(n=>!pantryHas(n));if(!miss.length)return false;state.pending={items:miss};save();botSay('❗ '+T('חסר בבית: ','Missing: ')+miss.join(', ')+'\n'+T('להוסיף הכל לרשימה? (כן/לא)','Add all to the list? (yes/no)'));return true;}
  if(/^(ה)?(קבלה|קבלות|חשבונית)( חדשה)?[?？!.]*$/.test(t)||/(צילום|לצלם|תצלמי|צלמי|להעלות|העלאת|תעלי|סריקת|לסרוק|תסרקי)\s+(את\s+)?(ה)?(קבלה|קבלות|חשבונית)(?=\s|$|[?？!.,])/.test(t)){openUpload('receipt');botSay('🧾 '+T('פתחתי העלאת קבלה — מצלמים, ואני קוראת ומציגה לאישור.','Opened receipt upload.'));return true;}
  if(/(רשימה מצולמת|לצלם רשימה|להעלות רשימה|רשימה בכתב יד|לסרוק רשימה|להדביק רשימה)/.test(t)){openUpload('list');botSay('📝 '+T('פתחתי העלאת רשימה — מצלמים או מדביקים, ואני מפענחת לאישור.','Opened list upload.'));return true;}
  if(/(סריקה רציפה|לסרוק מוצרים|סריקת מוצרים)/.test(t)||/^(ה)?סורק[?？!.]*$/.test(t)){openListScanner();botSay('📷 '+T('פתחתי סריקה רציפה — כל מוצר שנסרק נכנס לרשימה.','Continuous scanning opened.'));return true;}
  if((m=t.match(/^(?:לשמור|שמרי|תשמרי|שמור)\s+(?:את\s+)?(?:ה)?רשימה\s+(?:כ|בתור\s+)?תבנית\s*(.*)$/))){const l=curList();if(!l.items.length){botSay(T('הרשימה ריקה 🙂','The list is empty 🙂'));return true;}saveTemplate(m[1]||l.name,l.items);botSay('⭐ '+T('שמרתי תבנית "'+(m[1]||l.name)+'". בפעם הבאה: "תבנית '+(m[1]||l.name)+'".','Template saved.'));return true;}
  const tpl=(state.templates||[]).find(x=>{const n=norm(x.name);if(!n||!t.includes(n)||!/(תבנית|רשימה|קניות|שוב|כמו)/.test(t))return false;
    const rest=t.replace(n,' ').replace(/(^|\s)(את|ה?תבנית|ה?רשימה|רשימת|ה?קניות|שוב|כמו|של|ל|לי|בבקשה|תפתחי|פתחי|תעשי|עשי|תשתמשי|השתמשי|תוסיפי|הוסיפי|הקודמת|פעם)(?=\s|$)/g,' ').trim();
    return !rest||rest.split(/\s+/).length<=1;});
  if(tpl){state.pending=null;useTemplate(tpl.id);botSay('⭐ '+T('תבנית "'+tpl.name+'"','Template "'+tpl.name+'"'));return true;}
  if(/(התבניות שלי|תבניות קנייה|תבנית קנייה|הקניות הקודמות שלי|קניות קודמות|היסטוריית קניות|מה קניתי ואיפה)/.test(t)){openMe('purchases');botSay('⭐ '+T('פתחתי את התבניות והקניות הקודמות — לפי תאריך. אפשר לצרף קנייה לרשימה או לשמור כתבנית.','Opened templates and past purchases.'));return true;}
  if(/(צ'?אט עם האתר|לדבר עם (ה)?(מנהל|אתר|צוות)|לפנות לאתר|פנייה לאתר|לכתוב למנהל|לפנות למנהל|צוות האתר|תמיכה של האתר)/.test(t)||/^(שירות לקוחות|תמיכה|יצירת קשר|צור קשר|תמיכה טכנית)[?？!.]*$/.test(t)){openChat();botSay('💬 '+T('פתחתי את ההתכתבות עם צוות האתר','Opened the chat with the site team'));return true;}
  if((/(להצטרף כבעל עסק|להצטרף כחנות|לפרסם את החנות שלי|לפרסם את העסק שלי)/.test(t)||(/(יש לי (חנות|סופר|עסק|מכולת)|בעל (חנות|סופר|עסק)|בעלת (חנות|סופר|עסק))/.test(t)&&t.split(' ').length<=6&&!YAMI_ASK.test(t)))&&!myStore){openBizJoin();botSay('🏪 '+T('איזה כיף! פתחתי טופס הצטרפות לבעלי עסקים.','Opened the business join form.'));return true;}
  if(/(המוניטין שלי|כמה נקודות|הנקודות שלי|הדירוג שלי|הרמה שלי)/.test(t)){openMe('rep');botSay('🏅 '+T('פתחתי את המוניטין שלך — שם רואים איך מתקדמים','Opened your reputation'));return true;}
  if((m=t.match(/^(?:ערכי|ערוך|תערכי|שני|שנה|תשני|תחליפי|החלף)\s+(?:את\s+)?(.+?)\s+(?:ל|ל-|לְ)\s*(.+)$/))){const l=curList();const from=NORMP[norm(m[1])]||m[1];const it=l.items.find(i=>i.n===from||norm(i.n)===norm(m[1]));if(it){const to=m[2].trim();if(/^\d/.test(to)){it.q=to;}else{it.n=NORMP[norm(to)]||to;it.e=emojiOf(it.n);it.c=resolveCat(it.n);}it.ts=Date.now();save();render();botSay('✏️ '+T('עדכנתי: ','Updated: ')+it.n+(it.q?' ×'+it.q:''));return true;}}
  if(myStore){
    if((m=raw.trim().match(/^(?:פרסם|פרסמי|תפרסמי|תפרסם)\s+מבצע\s*[:：-]?\s*(.+)$/))){const title=m[1].trim().slice(0,120);if(hasProfanity(title)){botSay('🙏');return true;}const {error}=await sb.from('store_posts').insert({chain:myStore.chain,branch:myStore.branch||'',kind:'deal',title,body:'',image:'',created_by:authUser.id});botSay(error?'⚠️ '+error.message:(myStore.auto_approve?'📣 '+T('פורסם לכל העוקבים של '+myStore.chain+'!','Published!'):'📨 '+T('נשלח לאישור המנהל','Sent for approval')));return true;}
    if((m=t.match(/^(?:עדכן|עדכני|תעדכני|תעדכן)\s+מחיר\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(?:ש"?ח|₪)?$/))){const err=await insertPrice({product:m[1],chain:myStore.chain,branch:myStore.branch||'',price:parseFloat(m[2]),barcode:null});botSay(err?'⚠️ '+err.message:'💰 '+T('עודכן: '+m[1]+' — '+fmtPrice(parseFloat(m[2]),myCurrency())+' ב'+myStore.chain,'Price updated'));return true;}
    if(/(פניות מלקוחות|הודעות מלקוחות|הפניות שלי|הפרופיל של החנות|פרופיל החנות)/.test(t)){openBiz(myStore.chain);botSay('🏪 '+T('פתחתי את הפרופיל והפניות של '+myStore.chain,'Opened your store'));return true;}
    if(/(עזרה לבעל עסק|מה אני יכול לעשות כבעל|פקודות לחנות)/.test(t)){botSay('🏪 '+T('מה אפשר לעשות דרכי, '+myStore.chain+':','What you can do:')+'\n• "פרסם מבצע: חלב 1+1"\n• "עדכן מחיר חלב 5.90"\n• "פניות מלקוחות"\n• "הפרופיל של החנות"\n• '+T('קובץ מחירים לשבוע — בלשונית 💰 מחירים ← הסופר שלי','Weekly price file — in 💰 Prices'));return true;}
  }
  if(/^(עוד יכולות|מה עוד אפשר|מה עוד אפשר לעשות|מה עוד את יודעת|מה חדש|יכולות חדשות|עזרה נוספת)(\s+(לעשות|באתר|כאן|פה))*[?？!.]*$/.test(t)){botSay('✨ '+T('עוד דברים שאפשר לבקש ממני:','More things I can do:')+'\n📦 "המלאי שלי" · "יש לי 3 חלב" · "השתמשתי בביצה" · "כמה חלב יש לי" · "מה חסר בבית"\n🧾 "צילום קבלה" · "להעלות רשימה" · "סריקה רציפה"\n⭐ "לשמור את הרשימה כתבנית מנגל" · "תבנית מנגל"\n✏️ "שני את חלב ל חלב תנובה" · "שני את חלב ל 3"\n🧮 "איך לחסוך" · "כמה זה 3 כפול 12.90"\n💬 "לדבר עם המנהל" · 🏪 "יש לי חנות" · 🏅 "המוניטין שלי"');return true;}
  return false;
}
yamiStep(v9BotPre);
const _v9BotChips=botChips;botChips=function(){const b=_v9BotChips();b.splice(2,0,'📦 המלאי שלי','🧾 צילום קבלה');b.push('✨ עוד יכולות');if(myStore)b.unshift('🏪 עזרה לבעל עסק');return b;};

/* ---------- תפריט ---------- */
(function(){const m=$9('#hMenu');const after=$9('#miNotif');after.insertAdjacentHTML('afterend','<button id="miChatSite">💬<span>'+T('התכתבות עם האתר','Chat with us')+'</span></button><button id="miInv">📦<span>'+T('מה יש לי בבית (מלאי)','My home stock')+'</span></button><button id="miUpload">🧾<span>'+T('העלאת קבלה / רשימה','Upload receipt / list')+'</span></button><button id="miBizJoin">🏪<span>'+T('הצטרפות כבעל עסק','Join as a business')+'</span></button>');
  $9('#miChatSite').onclick=()=>{m.classList.remove('open');openChat();};$9('#miInv').onclick=()=>{m.classList.remove('open');openInventory();};$9('#miUpload').onclick=()=>{m.classList.remove('open');openUpload('receipt');};$9('#miBizJoin').onclick=()=>{m.classList.remove('open');openBizJoin();};})();

/* התפריט תמיד נגלל ונכנס במסך — גם בטלפון קטן */
(function(){const m=$9('#hMenu');const fit=()=>{if(!m.classList.contains('open'))return;const top=m.getBoundingClientRect().top;const h=(window.visualViewport?visualViewport.height:innerHeight);m.style.maxHeight=Math.max(220,Math.floor(h-top-12))+'px';};
  new MutationObserver(fit).observe(m,{attributes:true,attributeFilter:['class']});addEventListener('resize',fit);if(window.visualViewport)visualViewport.addEventListener('resize',fit);})();
const _v9AfterEnter=afterEnter;afterEnter=function(){_v9AfterEnter();setTimeout(()=>{loadChat();makeSuggestions();},5000);};
if(state.user&&authUser)setTimeout(()=>{loadChat();makeSuggestions();},5000);
render();
