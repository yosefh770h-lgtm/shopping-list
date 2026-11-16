
/* ================= גרסה 13: לקוח או בעל עסק, פרופיל עסקי מלא (גם מפעלים וספקים למוסדות), הזמנות, סנכרון מאתר העסק, מדריך עסקים ================= */
const $13=s=>document.querySelector(s);
Object.assign(STORE_TYPES,{factory:['🏭','מפעלים ויצרני מזון','Food factories'],supplier:['🚚','ספקי מזון למוסדות','Institutional suppliers'],catering:['🍱','קייטרינג','Catering'],restaurant:['🍽️','מסעדות','Restaurants']});
const BIZ_TYPES=['supermarket','grocery','produce','butcher','bakery','factory','supplier','catering','restaurant','nuts','sweets','pharm','online','other'];
const bizTypeLabel=k=>{const t=STORE_TYPES[k]||STORE_TYPES.other;return t[0]+' '+T(t[1],t[2]);};
const ORDER_ST={new:['🆕',T('חדשה','New')],confirmed:['✅',T('אושרה','Confirmed')],ready:['📦',T('מוכנה','Ready')],delivered:['🚚',T('נמסרה','Delivered')],cancelled:['✖️',T('בוטלה','Cancelled')]};

/* ---------- רק בעלי עסקים שאושרו רואים את ניהול החנות ---------- */
(function(){const upd=()=>{const b=$13('#miShop');if(b)b.hidden=!myStore;};upd();setInterval(upd,4000);})();
const _v13OpenShop=openShop;
openShop=async function(chain){if(!myStore&&!isAdmin())return openBizJoin();return _v13OpenShop(chain);};

/* ---------- בכניסה: לקוח או בעל עסק ---------- */
async function myAccountType(){if(state.acctType)return state.acctType;if(!sb||!authUser)return '';try{const {data}=await sb.from('profiles').select('account_type').eq('id',authUser.id).maybeSingle();if(data&&data.account_type&&data.account_type!=='customer'){state.acctType=data.account_type;save(true);}return state.acctType||'';}catch(e){return '';}}
async function setAccountType(t){state.acctType=t;save(true);if(sb&&authUser){try{await sb.from('profiles').update({account_type:t}).eq('id',authUser.id);}catch(e){}}}
function openAccountChooser(){
  const b=openSheet('👋 '+T('איך תרצו להשתמש באתר?','How will you use the site?'),
    '<p class="muted-note">'+T('אפשר לשנות בכל רגע מהתפריט ⚙️ ← החשבון שלי.','You can change this anytime.')+'</p>'+
    '<button class="acctpick" data-acct="customer"><span>🛒</span><span class="grow"><b>'+T('לקוח/ה','Customer')+'</b><small>'+T('רשימות קניות למשפחה, מה יש בבית, השוואת מחירים והזמנה מעסקים','Shopping lists, home stock, prices, ordering from businesses')+'</small></span></button>'+
    '<button class="acctpick" data-acct="business"><span>🏪</span><span class="grow"><b>'+T('בעל/ת עסק','Business')+'</b><small>'+T('סופר, מכולת, ירקן, מאפייה, מפעל או ספק מזון למוסדות, קייטרינג — ניהול מלאי, קופה, הזמנות מלקוחות ודף עסק','Store, factory, supplier, catering — stock, register, orders and a business page')+'</small></span></button>');
  b.onchange=null;b.oninput=null;
  b.onclick=async e=>{const p=e.target.closest('[data-acct]');if(!p)return;await setAccountType(p.dataset.acct);
    if(p.dataset.acct==='business'){if(myStore){closeSheet();flash('🏪 '+T('ברוכים הבאים! ניהול העסק נמצא בתפריט ⚙️','Welcome!'));openShop();}else openBizJoin();}
    else{closeSheet();flash('🛒 '+T('מעולה! בהצלחה בקניות 💚','Great!'));}};
}
/* טופס הצטרפות עסק — חובה לבעל עסק שעוד לא אושר */
openBizJoin=async function(){
  const b=openSheet('🏪 '+T('פרטי העסק שלי','My business'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');b.onchange=null;b.oninput=null;
  if(!sb||!authUser){b.innerHTML='<p class="muted-note">'+T('צריך להיות מחוברים 🙂','Sign in first 🙂')+'</p>';return;}
  if(myStore){b.innerHTML='<p class="muted-note">✅ '+T('העסק '+esc(myStore.chain)+' כבר מאושר.','Already approved.')+'</p><button id="bjGo" style="width:100%">🏪 '+T('לניהול העסק','Manage my business')+'</button>';b.onclick=e=>{if(e.target.closest('#bjGo'))openShop();};return;}
  let mine=[];try{const {data}=await sb.from('business_requests').select('*').eq('user_id',authUser.id).order('created_at',{ascending:false});mine=data||[];}catch(e){}
  const pend=mine.find(r=>r.status==='pending');
  b.innerHTML=(pend?'<div class="mecard pendbox"><h4>⏳ '+T('הבקשה של "'+esc(pend.business)+'" ממתינה לאישור','Your request is pending')+'</h4><p class="muted-note">'+T('נבדוק ונחזור אליך בהקדם (גם בצ\'אט ובהתראה). בינתיים אפשר להשתמש באתר כלקוח. אפשר גם לעדכן פרטים ולשלוח שוב.','We will get back to you soon.')+'</p><button class="btn sec" id="bjChat">💬 '+T('לכתוב לנו','Write to us')+'</button></div>':'')+
    (mine.filter(r=>r.status==='rejected').length&&!pend?'<p class="muted-note">'+T('בקשה קודמת לא אושרה — אפשר לעדכן ולשלוח שוב, או לכתוב לנו בצ\'אט.','A previous request was not approved.')+'</p>':'')+
    '<p class="muted-note">'+T('ממלאים פעם אחת — ואחרי אישור המנהל נפתח לך "ניהול העסק": מלאי, קופה, הזמנות מלקוחות, סנכרון מאתר ההזמנות שלך ודף עסק לשיתוף.','Fill once — after approval you get stock, register, orders and a business page.')+'</p>'+
    '<label class="il" for="bjBiz">'+T('שם העסק *','Business name *')+'</label><input id="bjBiz" list="bjChains" maxlength="40" value="'+esc(pend?pend.business:'')+'"><datalist id="bjChains">'+allChainNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>'+
    '<div class="grid2"><div><label class="il" for="bjCat">'+T('סוג העסק *','Type *')+'</label><select id="bjCat">'+BIZ_TYPES.map(k=>'<option value="'+k+'"'+(pend&&pend.category===k?' selected':'')+'>'+bizTypeLabel(k)+'</option>').join('')+'</select></div>'+
    '<div><label class="il" for="bjRole">'+T('התפקיד שלי','My role')+'</label><select id="bjRole"><option value="owner">'+T('בעל/ת העסק','Owner')+'</option><option value="manager">'+T('מנהל/ת / אחראי/ת','Manager')+'</option></select></div>'+
    '<div><label class="il" for="bjPhone">'+T('טלפון *','Phone *')+'</label><input id="bjPhone" inputmode="tel" dir="ltr" maxlength="30" value="'+esc(pend?pend.phone:((meData().address||{}).phone||''))+'"></div>'+
    '<div><label class="il" for="bjBranch">'+T('עיר / סניף','City / branch')+'</label><input id="bjBranch" maxlength="120" value="'+esc(pend?pend.branch:'')+'"></div></div>'+
    '<label class="il" for="bjAddr">'+T('כתובת העסק','Address')+'</label><input id="bjAddr" maxlength="200" value="'+esc(pend?pend.address||'':'')+'">'+
    '<label class="il" for="bjAud">'+T('קהל היעד שלכם (למשל: משפחות בשכונה, מוסדות, גנים, ישיבות, אירועים)','Target audience')+'</label><input id="bjAud" maxlength="300" value="'+esc(pend?pend.audience||'':'')+'">'+
    '<label class="il" for="bjMsg">'+T('ספרו קצת על העסק / קישור לאתר ההזמנות שלכם','About the business / ordering site link')+'</label><textarea id="bjMsg" maxlength="2000" style="min-height:70px">'+esc(pend?pend.message:'')+'</textarea>'+
    '<label class="il" for="bjName">'+T('השם שלי','My name')+'</label><input id="bjName" maxlength="60" value="'+esc((state.user&&state.user.name)||'')+'">'+
    '<button id="bjSend" style="width:100%;margin-top:10px">📨 '+T(pend?'עדכון ושליחה מחדש':'שליחה לאישור','Send for approval')+'</button>'+
    '<button class="btn sec" id="bjCust" style="width:100%;margin-top:6px">🛒 '+T('בינתיים להמשיך כלקוח','Continue as a customer for now')+'</button>';
  b.onclick=async e=>{
    if(e.target.closest('#bjChat')){openChat();return;}
    if(e.target.closest('#bjCust')){if(!pend)await setAccountType('customer');closeSheet();return;}
    if(!e.target.closest('#bjSend'))return;const v=id=>$13(id).value.trim();
    if(!v('#bjBiz')||!v('#bjPhone')){flash(T('צריך שם עסק וטלפון','Business name and phone needed'));return;}
    if([v('#bjBiz'),v('#bjBranch'),v('#bjName'),v('#bjMsg'),v('#bjAud'),v('#bjAddr')].some(hasProfanity)){reportAbuse(v('#bjBiz')+' '+v('#bjMsg'),'bizreq');flash('🙏');return;}
    const rec={business:v('#bjBiz').slice(0,40),branch:v('#bjBranch'),category:v('#bjCat'),role:v('#bjRole'),phone:v('#bjPhone'),name:v('#bjName'),message:v('#bjMsg'),audience:v('#bjAud'),address:v('#bjAddr'),user_id:authUser.id};
    let error;if(pend)({error}=await sb.from('business_requests').delete().eq('id',pend.id).eq('user_id',authUser.id));
    ({error}=await sb.from('business_requests').insert(rec));if(error){flash('⚠️ '+error.message);return;}
    await setAccountType('business');flash('📨 '+T('הבקשה נשלחה! נחזור אליך בהקדם','Request sent!'));openBizJoin();};
};
async function entryCheck(){if(!sb||!authUser||isAdmin())return;const t=await myAccountType();
  if(!t){setTimeout(()=>{if(!$13('#v8Sheet').classList.contains('open'))openAccountChooser();},1200);return;}
  if(t==='business'&&!myStore){try{const {data}=await sb.from('business_requests').select('status').eq('user_id',authUser.id).eq('status','pending').limit(1);if(!data||!data.length)setTimeout(()=>{if(!$13('#v8Sheet').classList.contains('open'))openBizJoin();},1200);}catch(e){}}}

/* ---------- ניהול העסק: לשוניות נוספות — הזמנות, פרופיל, סנכרון ---------- */
let shopOrders=[],ordFilter='open',shopSources=[];
const _v13DrawShop=drawShop;
drawShop=function(){
  const extra=[['orders','🛍️ '+T('הזמנות','Orders')+(shopOrders.filter(o=>o.status==='new').length?' ('+shopOrders.filter(o=>o.status==='new').length+')':'')],['profile','👤 '+T('פרופיל העסק','Profile')],['sync','🔄 '+T('סנכרון מהאתר שלי','Sync')]];
  const isExtra=['orders','profile','sync'].includes(shop.tab);const real=shop.tab;if(isExtra)shop.tab='share';
  _v13DrawShop();shop.tab=real;
  const bar=$13('#shopTabs');if(!bar)return;
  bar.insertAdjacentHTML('beforeend',extra.map(([k,l])=>'<button class="cb" data-shtab="'+k+'">'+l+'</button>').join(''));
  bar.querySelectorAll('.cb').forEach(x=>x.classList.toggle('on',x.dataset.shtab===shop.tab));
  if(!isExtra){addTemplateBtn();return;}
  const b=$13('#v8SheetBody');[...b.children].forEach(c=>{if(c!==bar&&c.id!=='shChain'&&!c.matches('p.muted-note:first-child'))c.remove();});
  const box=document.createElement('div');b.appendChild(box);
  if(shop.tab==='orders')box.innerHTML=ordersHtml();
  if(shop.tab==='profile')box.innerHTML=profileHtml();
  if(shop.tab==='sync')box.innerHTML=syncHtml();
};
function addTemplateBtn(){const f=$13('#shFile');if(!f||$13('#shTpl'))return;f.closest('.row2').insertAdjacentHTML('afterend','<button class="btn sec" id="shTpl" style="width:100%;margin-top:6px">⬇️ '+T('הורדת קובץ דוגמה (אקסל / CSV) למילוי','Download a template file')+'</button>');}
async function shopLoadExtra(){if(!sb||!shop.chain)return;
  try{const {data}=await sb.from('store_orders').select('*').eq('chain',shop.chain).order('created_at',{ascending:false}).limit(300);shopOrders=data||[];}catch(e){shopOrders=[];}
  try{const {data}=await sb.from('price_sources').select('*').eq('chain',shop.chain).order('created_at',{ascending:false});shopSources=data||[];}catch(e){shopSources=[];}
  try{const {data}=await sb.from('chains').select('category,about,audience,address,hours,phone,whatsapp,website,delivery_areas,min_order,order_phone,order_url,inventory_public,inventory_show_qty,show_prices,ordering_enabled').eq('name',shop.chain).maybeSingle();shop.row=Object.assign({},shop.row||{},data||{});}catch(e){}}
const _v13ShopLoad=shopLoad;shopLoad=async function(){await _v13ShopLoad();await shopLoadExtra();};
function ordersHtml(){const list=shopOrders.filter(o=>ordFilter==='all'||(ordFilter==='open'?['new','confirmed','ready'].includes(o.status):o.status===ordFilter));
  const c=shop.row||{};
  return (!c.ordering_enabled?'<p class="muted-note">ℹ️ '+T('קבלת הזמנות באתר כבויה — מפעילים בלשונית "👤 פרופיל העסק".','Online ordering is off — turn it on in Profile.')+'</p>':'')+
    '<div class="catbar">'+[['open',T('פתוחות','Open')],['new',T('חדשות','New')],['delivered',T('נמסרו','Delivered')],['all',T('הכל','All')]].map(([k,l])=>'<button class="cb'+(ordFilter===k?' on':'')+'" data-ordf="'+k+'">'+l+'</button>').join('')+'</div>'+
    (list.length?list.map(o=>'<div class="mecard ordcard" data-ord="'+o.id+'"><div class="ordtop"><b>'+ORDER_ST[o.status][0]+' '+esc(o.name)+'</b><span class="supst '+(o.status==='new'?'open':'closed')+'">'+ORDER_ST[o.status][1]+'</span></div>'+
      '<small class="muted-note">'+esc(fmtDate(new Date(o.created_at)))+' '+fmtTime(new Date(o.created_at))+(o.address?' · 📍 '+esc(o.address):'')+'</small>'+
      '<ul class="orditems">'+(o.items||[]).map(i=>'<li>'+esc(i.name)+' × '+fmtQ(i.qty||1)+'</li>').join('')+'</ul>'+(o.note?'<p class="muted-note">📝 '+esc(o.note)+'</p>':'')+(o.total>0?'<p><b>'+T('סה״כ: ','Total: ')+fmtPrice(o.total,'ILS')+'</b></p>':'')+
      '<div class="row2"><a class="mini" href="tel:'+esc(String(o.phone).replace(/[^\d+]/g,''))+'">📞 '+esc(o.phone)+'</a><a class="mini" target="_blank" rel="noopener" href="https://wa.me/'+esc(String(o.phone).replace(/\D/g,'').replace(/^0/,'972'))+'">💬 WhatsApp</a></div>'+
      (['new','confirmed','ready'].includes(o.status)?'<div class="row2">'+(o.status==='new'?'<button class="mini pri" data-ost="confirmed">✅ '+T('אישור','Confirm')+'</button>':'')+(o.status!=='ready'?'<button class="mini" data-ost="ready">📦 '+T('מוכנה','Ready')+'</button>':'')+'<button class="mini" data-ost="delivered">🚚 '+T('נמסרה','Delivered')+'</button><button class="mini" data-ost="cancelled">✖️ '+T('ביטול','Cancel')+'</button></div>':'')+'</div>').join('')
      :'<div class="empty">'+T('אין הזמנות כאן עדיין. כשתגיע הזמנה — תקבל/י התראה.','No orders here yet.')+'</div>');}
function profileHtml(){const c=shop.row||{};const ch=(k,l)=>'<label class="radio"><input type="checkbox" data-pf="'+k+'"'+(c[k]?' checked':'')+'> '+l+'</label>';
  const inp=(k,l,attrs)=>'<div><label class="il" for="pf_'+k+'">'+l+'</label><input id="pf_'+k+'" data-pf="'+k+'" value="'+esc(c[k]==null?'':String(c[k]))+'" '+(attrs||'')+'></div>';
  return '<div class="mecard"><h4>👤 '+T('פרופיל העסק — מה שהלקוחות רואים','Business profile')+'</h4>'+
    '<label class="il" for="pf_category">'+T('סוג העסק','Type')+'</label><select id="pf_category" data-pf="category">'+BIZ_TYPES.map(k=>'<option value="'+k+'"'+(c.category===k?' selected':'')+'>'+bizTypeLabel(k)+'</option>').join('')+'</select>'+
    '<label class="il" for="pf_about">'+T('על העסק','About')+'</label><textarea id="pf_about" data-pf="about" maxlength="2000" style="min-height:70px">'+esc(c.about||'')+'</textarea>'+
    '<label class="il" for="pf_audience">'+T('קהל היעד (למשל: מוסדות, גנים, ישיבות, משפחות)','Target audience')+'</label><input id="pf_audience" data-pf="audience" maxlength="300" value="'+esc(c.audience||'')+'">'+
    '<div class="grid2">'+inp('address',T('כתובת','Address'),'maxlength="200"')+inp('hours',T('שעות פתיחה','Hours'),'maxlength="600"')+inp('order_phone',T('טלפון להזמנות','Order phone'),'maxlength="30" inputmode="tel" dir="ltr"')+inp('whatsapp',T('וואטסאפ','WhatsApp'),'maxlength="30" inputmode="tel" dir="ltr"')+
    inp('order_url',T('אתר / קישור להזמנות','Ordering website'),'maxlength="300" dir="ltr" placeholder="https://"')+inp('min_order',T('הזמנת מינימום (₪)','Minimum order'),'type="number" min="0" step="1"')+'</div>'+
    '<label class="il" for="pf_delivery_areas">'+T('אזורי משלוח','Delivery areas')+'</label><input id="pf_delivery_areas" data-pf="delivery_areas" maxlength="300" value="'+esc(c.delivery_areas||'')+'"></div>'+
    '<div class="mecard"><h4>⚙️ '+T('מה מוצג לכולם — אתם מחליטים','What the public sees')+'</h4>'+
    ch('inventory_public','🌍 '+T('דף העסק והמלאי גלויים לכולם (גם במדריך העסקים)','Public business page & stock'))+ch('show_prices','💰 '+T('להראות מחירים','Show prices'))+ch('inventory_show_qty','🔢 '+T('להראות כמה נשאר מכל מוצר (אחרת רק יש / נגמר)','Show exact quantities'))+ch('ordering_enabled','🛍️ '+T('לקבל הזמנות דרך האתר','Accept orders on the site'))+
    '<button id="pfSave" style="width:100%;margin-top:8px">💾 '+T('שמירה','Save')+'</button></div>';}
function syncHtml(){return '<div class="mecard"><h4>🔄 '+T('סנכרון מלאי ומחירים מאתר ההזמנות שלכם','Sync from your ordering site')+'</h4><p class="muted-note">'+T('מדביקים קישור לאתר ההזמנות / לקטלוג / לקובץ המחירים שלכם — והמוצרים והמחירים מתעדכנים כאן לבד כל כמה שעות. הכמויות במלאי נשארות כמו שאתם מנהלים. אתרים שחוסמים רובוטים או נטענים רק ב-JavaScript לא תמיד עובדים — אז אפשר לייבא קובץ.','Paste your ordering site / catalog / price file link — items and prices update automatically.')+'</p>'+
    '<div class="row2"><input id="syUrl" dir="ltr" placeholder="https://..."><select id="syEvery" style="flex:0 0 auto;max-width:120px"><option value="6">'+T('כל 6 שע׳','every 6h')+'</option><option value="12" selected>'+T('כל 12 שע׳','every 12h')+'</option><option value="24">'+T('פעם ביום','daily')+'</option></select></div>'+
    (isAdmin()||(myStore&&myStore.auto_approve)?'<label class="radio"><input type="checkbox" id="syBoth"> 💰 '+T('לפרסם את המחירים גם בהשוואת המחירים באתר','Also publish to the price comparison')+'</label>':'')+'<button id="syAdd" style="width:100%">➕ '+T('הוספה ומשיכה עכשיו','Add and sync now')+'</button></div>'+
    (shopSources.length?'<div class="mecard"><h4>'+T('הקישורים שלי','My links')+'</h4>'+shopSources.map(s=>'<div class="merow" data-syid="'+s.id+'"><span class="grow"><b dir="ltr" style="word-break:break-all">'+esc(s.url.slice(0,70))+'</b><small>'+T('כל ','every ')+s.every_hours+T(' שע׳','h')+' · '+(s.last_run?agoText(s.last_run)+' · ':'')+esc(s.last_status||T('עוד לא רץ','not run yet'))+'</small></span><button class="mini" data-sy="run">🔄</button><button class="mini" data-sy="del">🗑️</button></div>').join('')+'</div>':'');}
document.querySelector('#v8SheetBody').addEventListener('click',async e=>{
  if(!$13('#shopTabs'))return;const t=e.target;
  const tb=t.closest('[data-shtab]');if(tb&&['orders','profile','sync'].includes(tb.dataset.shtab)){e.stopPropagation();shop.tab=tb.dataset.shtab;await shopLoadExtra();drawShop();return;}
  const of=t.closest('[data-ordf]');if(of){ordFilter=of.dataset.ordf;drawShop();return;}
  const os=t.closest('[data-ost]');if(os){const o=shopOrders.find(x=>x.id===os.closest('[data-ord]').dataset.ord);const st=os.dataset.ost;
    const note=st==='cancelled'?(await uiPrompt(T('סיבת הביטול (תישלח ללקוח, לא חובה):','Reason (optional):'),'')):'';if(note===null)return;
    const {error}=await sb.from('store_orders').update({status:st,status_note:(note||'').slice(0,500)}).eq('id',o.id);if(error){flash('⚠️ '+error.message);return;}
    if(st==='delivered'&&(await uiConfirm(T('להוריד את המוצרים של ההזמנה מהמלאי?','Deduct the order items from stock?')))){const rows=(o.items||[]).map(i=>({chain:shop.chain,item_id:/^[0-9a-f-]{36}$/.test(i.id||'')?i.id:null,name:String(i.name||'').slice(0,80),qty:Number(i.qty)||1,source:'manual'}));if(rows.length)await sb.from('store_sales').insert(rows);}
    flash(ORDER_ST[st][0]+' '+T('עודכן — הלקוח מקבל הודעה','Updated — the customer is notified'));await shopLoad();drawShop();return;}
  if(t.closest('#pfSave')){const p={};document.querySelectorAll('[data-pf]').forEach(x=>{p[x.dataset.pf]=x.type==='checkbox'?x.checked:x.value.trim();});
    if(['about','audience','address','hours','delivery_areas'].some(k=>hasProfanity(p[k]||''))){flash('🙏');return;}
    const {data,error}=await sb.rpc('store_settings',{p_chain:shop.chain,p});flash(error?'⚠️ '+error.message:data==='ok'?'💾 '+T('נשמר — מתעדכן אצל כולם','Saved'):data==='bad_url'?'⚠️ '+T('הקישור צריך להתחיל ב-https://','Link must start with https://'):'⚠️ '+data);if(data==='ok'){await shopLoad();loadChains();}return;}
  if(t.closest('#syAdd')){const url=$13('#syUrl').value.trim();if(!/^https:\/\/[^\s"'<>]+$/.test(url)||url.length>500){flash(T('צריך קישור שמתחיל ב-https://','Link must start with https://'));return;}
    const {data:row,error}=await sb.from('price_sources').insert({url,chain:shop.chain,every_hours:+$13('#syEvery').value,target:($13('#syBoth')&&$13('#syBoth').checked)?'both':'inventory'}).select('id').single();if(error){flash('⚠️ '+error.message);return;}await syncRun(row.id);return;}
  const sy=t.closest('[data-sy]');if(sy){const id=sy.closest('[data-syid]').dataset.syid;if(sy.dataset.sy==='run')return syncRun(id);
    if((await uiConfirm(T('למחוק את הקישור?','Delete this link?')))){await sb.from('price_sources').delete().eq('id',id);await shopLoad();drawShop();}return;}
  if(t.closest('#shTpl')){const csv='﻿מוצר,ברקוד,מחיר,כמות,מינימום,קטגוריה\nחלב 3% 1 ליטר,7290000000001,6.90,40,10,מוצרי חלב\nמגש עוף 20 מנות,,350,12,3,מנות מוכנות\n';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='stock-template.csv';a.click();flash('⬇️ '+T('נפתח באקסל — ממלאים ומייבאים','Opens in Excel'));return;}
},true);
async function syncRun(id){flash('🔄 '+T('מושך מהקישור... (עד דקה)','Syncing...'));let {data,error}=await sb.functions.invoke('prices-sync',{body:{source_id:id}});if(error&&error.context&&typeof error.context.json==='function'){try{data=await error.context.json();}catch(x){}}
  flash(data&&data.results&&data.results[0]?data.results[0].status:'⚠️ '+T('הסנכרון עוד לא זמין — יעבוד אחרי שהמנהל יפעיל אותו','Sync is not available yet'));await shopLoad();drawShop();}
/* ייבוא קובץ: קודם תצוגה מקדימה כמה יתעדכנו וכמה יתווספו — ורק אחרי אישור */
const _v13ShopImport=shopImport;
shopImport=async function(file,kind){if(kind!=='stock')return _v13ShopImport(file,kind);
  const real=sb.from.bind(sb);let plan={up:0,add:0};
  const fake=t=>t==='store_inventory'?{update:()=>({eq:async()=>{plan.up++;return {};}}),insert:async()=>{plan.add++;return {};}}:real(t);
  const realFlash=flash;flash=()=>{};sb.from=fake;try{await _v13ShopImport(file,kind);}finally{sb.from=real;flash=realFlash;}
  if(!plan.up&&!plan.add){flash(T('לא נמצאו שורות בקובץ 🤷 — אפשר להוריד קובץ דוגמה','No rows found'));return;}
  if(!(await uiConfirm(T('בקובץ: '+plan.up+' מוצרים קיימים יתעדכנו ו-'+plan.add+' מוצרים חדשים יתווספו. להמשיך?','Update '+plan.up+' and add '+plan.add+'?'))))return;
  return _v13ShopImport(file,kind);};

/* ---------- דף העסק לכולם: פרופיל + הזמנה ---------- */
openStorePublic=async function(chain){
  const b=openSheet('🏪 '+chain,'<div class="empty">'+T('טוען...','Loading...')+'</div>');b.onclick=null;b.onchange=null;b.oninput=null;b.onkeydown=null;
  if(!sb){b.innerHTML='<p class="muted-note">'+T('צריך חיבור לאינטרנט','Needs internet')+'</p>';return;}
  const {data,error}=await sb.rpc('store_public',{p_chain:chain});
  if(error||!data){b.innerHTML='<p class="muted-note">'+T('העסק לא משתף כרגע את הדף שלו 🙂','This business page is not public right now 🙂')+'</p>';return;}
  let q='',cart={};const items=data.items||[];const sp=data.show_prices!==false;
  const total=()=>Object.entries(cart).reduce((a,[id,n])=>{const i=items.find(x=>x.id===id);return a+(i&&i.price?i.price*n:0);},0);
  const draw=()=>{const qq=norm(q);const list=items.filter(i=>!qq||norm(i.name+' '+(i.category||'')).includes(qq));const byC={};list.forEach(i=>{const c=i.category||T('כללי','General');(byC[c]=byC[c]||[]).push(i);});
    const nCart=Object.values(cart).reduce((a,n)=>a+n,0);
    b.innerHTML='<div class="mecard bizpub"><div class="ordtop"><h4>🏪 '+esc(data.chain)+'</h4><span class="rcat">'+bizTypeLabel(data.category)+'</span></div>'+(data.about?'<p style="margin:4px 0">'+esc(data.about)+'</p>':'')+
      '<p class="muted-note">'+[data.audience?'👥 '+T('קהל יעד: ','For: ')+data.audience:'',data.address?'📍 '+data.address:'',data.hours?'🕐 '+data.hours:'',data.delivery_areas?'🚚 '+T('משלוחים: ','Delivery: ')+data.delivery_areas:'',data.min_order?'🧾 '+T('מינימום הזמנה: ','Min. order: ')+fmtPrice(data.min_order,'ILS'):'',data.updated_at?'🔄 '+T('עודכן ','updated ')+agoText(data.updated_at):''].filter(Boolean).map(esc).join('<br>')+'</p>'+
      '<div class="row2">'+(data.phone?'<a class="btn" href="tel:'+esc(data.phone.replace(/[^\d+]/g,''))+'">📞 '+esc(data.phone)+'</a>':'')+(data.whatsapp?'<a class="btn sec" href="https://wa.me/'+esc(data.whatsapp.replace(/\D/g,'').replace(/^0/,'972'))+'" target="_blank" rel="noopener">💬 WhatsApp</a>':'')+(safeUrl(data.url)?'<a class="btn sec" href="'+esc(safeUrl(data.url))+'" target="_blank" rel="noopener">🌐 '+T('לאתר','Website')+'</a>':'')+'</div></div>'+
      '<input id="spQ" placeholder="🔍 '+T('חיפוש מוצר...','Search...')+'" value="'+esc(q)+'">'+
      Object.keys(byC).map(c=>'<div class="mecard"><h4>'+esc(c)+'</h4>'+byC[c].map(i=>'<div class="merow'+(i.in_stock?'':' oos')+'"><span class="grow"><b>'+esc(i.name)+'</b><small>'+(i.in_stock?(i.qty!=null?'✅ '+T('במלאי: ','in stock: ')+fmtQ(i.qty)+(i.unit?' '+esc(i.unit):''):'✅ '+T('יש במלאי','in stock')):'❌ '+T('נגמר','out of stock'))+'</small></span>'+(sp&&i.price!=null?'<b>'+fmtPrice(i.price,'ILS')+'</b>':'')+
        (data.ordering&&i.in_stock?'<span class="qty"><button type="button" data-cm="'+i.id+'">−</button><button type="button" class="qv">'+(cart[i.id]||0)+'</button><button type="button" data-cp="'+i.id+'">+</button></span>':'<button class="mini" data-spadd="'+esc(i.name)+'" aria-label="'+T('לרשימה שלי','To my list')+'">🛒</button>')+'</div>').join('')+'</div>').join('')+
      (list.length?'':'<div class="empty">'+T('לא נמצא 🤷','Not found 🤷')+'</div>')+
      (data.ordering&&nCart?'<div class="cartbar"><span>🛍️ '+nCart+' '+T('פריטים','items')+(sp&&total()?' · <b>'+fmtPrice(total(),'ILS')+'</b>':'')+'</span><button id="coGo">'+T('להזמנה ←','Order ←')+'</button></div>':'');};
  const checkout=()=>{const a=meData().address||{};const lines=Object.entries(cart).filter(([,n])=>n>0).map(([id,n])=>{const i=items.find(x=>x.id===id);return {id,name:i.name,qty:n};});
    b.innerHTML='<button class="mini" id="coBack">→ '+T('חזרה למוצרים','Back')+'</button><div class="mecard"><h4>🛍️ '+T('ההזמנה שלי מ','My order from ')+esc(data.chain)+'</h4><ul class="orditems">'+lines.map(l=>'<li>'+esc(l.name)+' × '+esc(l.qty)+'</li>').join('')+'</ul>'+(sp&&total()?'<p><b>'+T('סה״כ משוער: ','Estimated total: ')+fmtPrice(total(),'ILS')+'</b></p>':'')+
      (data.min_order&&sp&&total()<data.min_order?'<p class="muted-note">⚠️ '+T('מינימום הזמנה: ','Minimum order: ')+fmtPrice(data.min_order,'ILS')+'</p>':'')+'</div>'+
      '<div class="grid2"><div><label class="il" for="coName">'+T('שם / שם המוסד *','Name *')+'</label><input id="coName" maxlength="60" value="'+esc((state.user&&state.user.name)||'')+'"></div><div><label class="il" for="coPhone">'+T('טלפון *','Phone *')+'</label><input id="coPhone" inputmode="tel" dir="ltr" maxlength="30" value="'+esc(a.phone||'')+'"></div></div>'+
      '<label class="il" for="coAddr">'+T('כתובת למשלוח','Delivery address')+'</label><input id="coAddr" maxlength="200" value="'+esc([a.street,a.city].filter(Boolean).join(', '))+'"><label class="il" for="coNote">'+T('הערות (מועד, כשרות, כמות מנות...)','Notes')+'</label><textarea id="coNote" maxlength="1000" style="min-height:60px"></textarea>'+
      (authUser?'<button id="coSend" style="width:100%;margin-top:10px">📨 '+T('שליחת ההזמנה','Send order')+'</button>':'<p class="muted-note">'+T('כדי להזמין דרך האתר צריך להתחבר — או להזמין ישירות בוואטסאפ:','Sign in to order here, or order on WhatsApp:')+'</p>')+
      (data.whatsapp?'<button class="btn sec" id="coWa" style="width:100%;margin-top:6px">💬 '+T('הזמנה בוואטסאפ','Order on WhatsApp')+'</button>':'');
    b.onclick=async e=>{if(e.target.closest('#coBack')){draw();bindList();return;}
      const nm=$13('#coName').value.trim(),ph=$13('#coPhone').value.trim(),ad=$13('#coAddr').value.trim(),nt=$13('#coNote').value.trim();
      if(e.target.closest('#coWa')){window.open('https://wa.me/'+data.whatsapp.replace(/\D/g,'').replace(/^0/,'972')+'?text='+encodeURIComponent(T('שלום, הזמנה מ"רשימת קניות":','Hello, an order:')+'\n'+lines.map(l=>'• '+l.name+' × '+l.qty).join('\n')+(nm?'\n'+nm:'')+(ad?'\n📍 '+ad:'')+(nt?'\n📝 '+nt:'')),'_blank','noopener');return;}
      if(!e.target.closest('#coSend'))return;if(!nm||ph.replace(/\D/g,'').length<9){flash(T('צריך שם וטלפון','Name and phone needed'));return;}if([nm,ad,nt].some(hasProfanity)){reportAbuse(nt,'order');flash('🙏');return;}
      $13('#coSend').disabled=true;const {error}=await sb.from('store_orders').insert({chain:data.chain,user_id:authUser.id,name:nm,phone:ph,address:ad,note:nt,items:lines});
      if(error){$13('#coSend').disabled=false;flash('⚠️ '+(/too many/.test(error.message)?T('יותר מדי הזמנות בשעה האחרונה','Too many orders'):error.message));return;}
      cart={};b.innerHTML='<div class="empty">🎉 '+T('ההזמנה נשלחה ל'+esc(data.chain)+'! תקבל/י הודעה כשהיא מאושרת. אפשר לעקוב ב"📦 ההזמנות שלי".','Order sent!')+'</div><button id="coMine" style="width:100%">📦 '+T('ההזמנות שלי','My orders')+'</button>';b.onclick=ev=>{if(ev.target.closest('#coMine'))openMyOrders();};};};
  const bindList=()=>{b.onclick=e=>{const a=e.target.closest('[data-spadd]');if(a){addItem(a.dataset.spadd,'');flash('🛒 '+a.dataset.spadd);return;}
    const p=e.target.closest('[data-cp]');if(p){cart[p.dataset.cp]=(cart[p.dataset.cp]||0)+1;draw();return;}
    const m=e.target.closest('[data-cm]');if(m){cart[m.dataset.cm]=Math.max(0,(cart[m.dataset.cm]||0)-1);if(!cart[m.dataset.cm])delete cart[m.dataset.cm];draw();return;}
    if(e.target.closest('#coGo'))checkout();};
    b.oninput=e=>{if(e.target.id!=='spQ')return;q=e.target.value;const pos=e.target.selectionStart;draw();const n=$13('#spQ');n.focus();n.setSelectionRange(pos,pos);};};
  draw();bindList();
};

/* ---------- ההזמנות שלי (לקוח) ---------- */
async function openMyOrders(){const b=openSheet('📦 '+T('ההזמנות שלי','My orders'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');b.onchange=null;b.oninput=null;
  if(!sb||!authUser){b.innerHTML='<p class="muted-note">'+T('צריך להיות מחוברים 🙂','Sign in first 🙂')+'</p>';return;}
  const {data}=await sb.from('store_orders').select('*').eq('user_id',authUser.id).order('created_at',{ascending:false}).limit(100);const list=data||[];
  b.innerHTML=list.length?list.map(o=>'<div class="mecard" data-mo="'+esc(o.id)+'"><div class="ordtop"><b>🏪 '+esc(o.chain)+'</b><span class="supst '+(o.status==='new'?'open':'closed')+'">'+ORDER_ST[o.status][0]+' '+ORDER_ST[o.status][1]+'</span></div><small class="muted-note">'+esc(fmtDate(new Date(o.created_at)))+'</small><ul class="orditems">'+(o.items||[]).map(i=>'<li>'+esc(i.name)+' × '+fmtQ(i.qty||1)+'</li>').join('')+'</ul>'+(o.total>0?'<b>'+fmtPrice(o.total,'ILS')+'</b>':'')+(o.status_note?'<p class="muted-note">💬 '+esc(o.status_note)+'</p>':'')+(o.status==='new'?'<button class="mini" data-mocancel="1">✖️ '+T('ביטול ההזמנה','Cancel')+'</button>':'')+'</div>').join('')
    :'<div class="empty">'+T('עוד אין הזמנות. מזמינים מדף של עסק ב"🏪 עסקים וספקים".','No orders yet.')+'</div><button id="moDir" style="width:100%">🏪 '+T('עסקים וספקים','Businesses')+'</button>';
  b.onclick=async e=>{if(e.target.closest('#moDir')){openBizDirectory();return;}const c=e.target.closest('[data-mocancel]');if(c&&(await uiConfirm(T('לבטל את ההזמנה?','Cancel the order?')))){const {error}=await sb.from('store_orders').update({status:'cancelled'}).eq('id',c.closest('[data-mo]').dataset.mo);flash(error?'⚠️ '+error.message:'✖️ '+T('בוטלה','Cancelled'));openMyOrders();}};}

/* ---------- מדריך עסקים וספקים ---------- */
async function openBizDirectory(){const b=openSheet('🏪 '+T('עסקים וספקים','Businesses & suppliers'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');b.onchange=null;
  if(!sb){b.innerHTML='<p class="muted-note">'+T('צריך חיבור לאינטרנט','Needs internet')+'</p>';return;}
  const {data,error}=await sb.rpc('biz_directory');const all=error?[]:(data||[]);let cat='',q='';
  const draw=()=>{const qq=norm(q);const list=all.filter(x=>(!cat||x.category===cat)&&(!qq||norm(x.chain+' '+x.about+' '+x.audience+' '+x.address).includes(qq)));const cats=[...new Set(all.map(x=>x.category))];
    b.innerHTML='<input id="bdQ" placeholder="🔍 '+T('חיפוש עסק, מוצר, אזור...','Search...')+'" value="'+esc(q)+'"><div class="catbar"><button class="cb'+(!cat?' on':'')+'" data-bdc="">'+T('הכל','All')+'</button>'+cats.map(c=>'<button class="cb'+(cat===c?' on':'')+'" data-bdc="'+c+'">'+bizTypeLabel(c)+'</button>').join('')+'</div>'+
      (list.length?list.map(x=>'<button class="bizcard" data-bdopen="'+esc(x.chain)+'"><span class="bzi">'+(STORE_TYPES[x.category]||STORE_TYPES.other)[0]+'</span><span class="grow"><b>'+esc(x.chain)+'</b><small>'+[x.about,x.audience?'👥 '+x.audience:'',x.address?'📍 '+x.address:'',x.delivery_areas?'🚚 '+x.delivery_areas:''].filter(Boolean).map(esc).join(' · ')+'</small><small>'+(x.ordering?'🛍️ '+T('אפשר להזמין','Ordering')+' · ':'')+x.items+' '+T('מוצרים','items')+'</small></span></button>').join('')
        :'<div class="empty">'+T('עוד אין עסקים שמשתפים כאן — בקרוב 🙂','No businesses yet 🙂')+'</div>')+
      '<p class="muted-note">🏪 '+T('יש לך עסק? ','Own a business? ')+'<a href="#" id="bdJoin">'+T('הצטרפות כבעל עסק','Join')+'</a></p>';};
  draw();b.onclick=e=>{const c=e.target.closest('[data-bdc]');if(c){cat=c.dataset.bdc;draw();return;}const o=e.target.closest('[data-bdopen]');if(o){openStorePublic(o.dataset.bdopen);return;}if(e.target.closest('#bdJoin')){e.preventDefault();openBizJoin();}};
  b.oninput=e=>{if(e.target.id!=='bdQ')return;q=e.target.value;const pos=e.target.selectionStart;draw();const n=$13('#bdQ');n.focus();n.setSelectionRange(pos,pos);};}

/* ---------- תפריט, יאמי וכניסה ---------- */
(function(){const g=document.querySelector('#hMenu details[data-g="shop"] .mgbody')||$13('#hMenu');
  g.insertAdjacentHTML('beforeend','<button id="miBizDir">🏪<span>'+T('עסקים וספקים (הזמנה ישירה)','Businesses & suppliers')+'</span></button><button id="miMyOrders">📦<span>'+T('ההזמנות שלי מעסקים','My orders')+'</span></button>');
  const a=document.querySelector('#hMenu details[data-g="acct"] .mgbody');if(a)a.insertAdjacentHTML('afterbegin','<button id="miAcct">🔁<span>'+T('לקוח או בעל עסק','Customer or business')+'</span></button>');
  const m=$13('#hMenu');$13('#miBizDir').onclick=()=>{m.classList.remove('open');openBizDirectory();};$13('#miMyOrders').onclick=()=>{m.classList.remove('open');openMyOrders();};if($13('#miAcct'))$13('#miAcct').onclick=()=>{m.classList.remove('open');openAccountChooser();};})();
async function v13BotPre(raw){const t=norm(raw);
  /* "קייטרינג" / "ספק מזון" לבד — המדריך; "תמליצי על קייטרינג טוב בבני ברק" — לבינה המלאכותית */
  if(/(עסקים וספקים|ספקים למוסדות|להזמין מספק|להזמין מעסק|מדריך עסקים|מדריך הספקים|ספקים באתר)/.test(t)||(/(ספק מזון|ספקי מזון|מפעל מזון|קייטרינג)/.test(t)&&t.split(' ').length<=3&&!YAMI_ASK.test(t))){openBizDirectory();botSay('🏪 '+T('פתחתי את מדריך העסקים והספקים — אפשר לסנן לפי סוג, לראות מלאי ולהזמין.','Opened the business directory.'));return true;}
  if(/(ההזמנות שלי|מה עם ההזמנה|סטטוס הזמנה)/.test(t)){openMyOrders();botSay('📦 '+T('פתחתי את ההזמנות שלך','Opened your orders'));return true;}
  if(/(הזמנות מלקוחות|הזמנות חדשות)/.test(t)&&myStore){shop.tab='orders';openShop();botSay('🛍️ '+T('פתחתי את ההזמנות של העסק','Opened your orders'));return true;}
  return false;}
yamiStep(v13BotPre);
const _v13AfterEnter=afterEnter;afterEnter=function(){_v13AfterEnter();setTimeout(entryCheck,4000);};
if(state.user&&authUser)setTimeout(entryCheck,4500);
