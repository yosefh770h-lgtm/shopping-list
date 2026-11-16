
/* ================= גרסה 14: תפריט מתומצת, "האתר העסקי" ↔ "האתר הרגיל", לוגו ותמונות מוצרים, פניות והתראות לעסק, סנכרון מלא ================= */
const $14=s=>document.querySelector(s);
NCATS.biz=['🏪','עדכונים לעסק שלי (הזמנות, פניות, מלאי)','My business updates'];
const bizModeAllowed=()=>!!myStore&&uiCfg.bizMode!==false;

/* ---------- תפריט מתומצת: שני כפתורים צמודים לעסק (רק לעסק מאושר), שניים ללקוח ---------- */
(function(){const m=$14('#hMenu');if(!m)return;
  ['miShop','miBizJoin'].forEach(id=>{const b=$14('#'+id);if(b){b.hidden=true;b.dataset.gone='1';}});
  const pair=(id,a,b)=>'<div class="mpair" id="'+id+'">'+a+b+'</div>';
  const top=$14('#miNotif');
  top.insertAdjacentHTML('afterend',pair('mBizPair','<button id="miBizSite">🏪<span>'+T('האתר העסקי','Business site')+'</span></button>','<button id="miBizInbox">🛍️<span>'+T('הזמנות ופניות','Orders & messages')+'<b class="mbadge" id="bizBadge" hidden></b></span></button>'));
  const dir=$14('#miBizDir'),mo=$14('#miMyOrders');
  if(dir&&mo){const shop=document.querySelector('#hMenu details[data-g="shop"] .mgbody');shop.insertAdjacentHTML('afterbegin',pair('mCustPair','',''));const p=$14('#mCustPair');p.appendChild(dir);p.appendChild(mo);
    dir.querySelector('span').textContent=T('עסקים וספקים','Businesses');mo.querySelector('span').textContent=T('ההזמנות שלי','My orders');}
  const acct=$14('#miAcct');if(acct)acct.querySelector('span').textContent=T('סוג החשבון (לקוח / עסק)','Account type');
  $14('#miBizSite').onclick=()=>{m.classList.remove('open');if(bizModeAllowed())enterBizMode();else openShop();};
  $14('#miBizInbox').onclick=()=>{m.classList.remove('open');shop.tab='orders';if(bizModeAllowed())enterBizMode();else openShop();};
  const upd=()=>{const p=$14('#mBizPair');if(p)p.hidden=!myStore;const s=$14('#miBizSite span');if(s)s.textContent=uiCfg.bizMode===false?T('ניהול העסק','My business'):T('האתר העסקי','Business site');};upd();setInterval(upd,4000);$14('#btnMenu').addEventListener('click',upd,true);
})();
const chatBizBtn=()=>{const b=$14('#chatBiz');if(b&&!myStore)b.remove();};
new MutationObserver(chatBizBtn).observe($14('#v8SheetBody'),{childList:true});

/* ---------- "האתר העסקי": מסך מלא לניהול העסק, ומעבר מהיר לאתר הרגיל ---------- */
let leavingBiz=false;
function enterBizMode(){if(!bizModeAllowed()){openShop();return;}state.bizMode=true;save(true);document.body.classList.add('bizmode');openShop(myStore.chain).then(bizHeader);}
function exitBizMode(){state.bizMode=false;save(true);document.body.classList.remove('bizmode');leavingBiz=true;closeSheet();leavingBiz=false;flash('🛒 '+T('עברת לאתר הרגיל','Switched to the regular site'));}
function bizHeader(){const h=$14('#v8Sheet .phead');if(!h)return;let x=$14('#bizExit');
  if(document.body.classList.contains('bizmode')){if(!x){h.insertAdjacentHTML('beforeend','<button id="bizExit" class="bizswitch">🛒 '+T('לאתר הרגיל','Regular site')+'</button>');$14('#bizExit').onclick=exitBizMode;}
    const t=$14('#v8SheetTitle');const logo=shop.row&&shop.row.logo;if(t)t.innerHTML=(safeImg(logo)?'<img class="tlogo" src="'+esc(safeImg(logo))+'" alt="">':'🏪 ')+esc(shop.chain||'');}
  else if(x)x.remove();}
const _v14CloseSheet=closeSheet;
closeSheet=function(){_v14CloseSheet.apply(this,arguments);if(document.body.classList.contains('bizmode')&&!leavingBiz)setTimeout(()=>{if(!$14('#v8Sheet').classList.contains('open'))openShop(myStore&&myStore.chain).then(bizHeader);},60);};
document.addEventListener('click',e=>{if(e.target.closest('#btnCloseSheet')&&document.body.classList.contains('bizmode')&&!$14('#shopTabs')){e.stopPropagation();openShop(myStore.chain).then(bizHeader);}},true);
const _v14DrawShop=drawShop;
drawShop=function(){_v14DrawShop();bizHeader();
  const bar=$14('#shopTabs');if(!bar)return;
  if(!bar.querySelector('[data-shtab="msgs"]'))bar.insertAdjacentHTML('beforeend','<button class="cb'+(shop.tab==='msgs'?' on':'')+'" data-shtab="msgs">💬 '+T('פניות','Messages')+(shopMsgs.filter(m=>!m.is_read).length?' ('+shopMsgs.filter(m=>!m.is_read).length+')':'')+'</button>');
  if(shop.tab==='msgs'){bar.querySelectorAll('.cb').forEach(x=>x.classList.toggle('on',x.dataset.shtab==='msgs'));const b=$14('#v8SheetBody');[...b.children].forEach(c=>{if(c!==bar&&c.id!=='shChain'&&!c.matches('p.muted-note:first-child'))c.remove();});
    const box=document.createElement('div');box.innerHTML=msgsHtml();b.appendChild(box);}
  /* תמונות מוצרים במלאי */
  if(shop.tab==='inv')document.querySelectorAll('#v8SheetBody [data-shid]').forEach(r=>{const it=shop.items.find(i=>i.id===r.dataset.shid);if(!it||r.querySelector('.invimg'))return;
    r.insertAdjacentHTML('afterbegin','<label class="invimg" title="'+T('תמונה למוצר','Product photo')+'">'+(safeImg(it.image)?'<img src="'+esc(safeImg(it.image))+'" alt="">':'📷')+'<input type="file" accept="image/*" data-invimg="'+esc(it.id)+'" hidden></label>');});
  /* לוגו ופרסום מחירים בפרופיל */
  if(shop.tab==='profile'&&!$14('#pfLogoBox')){const c=shop.row||{};const first=$14('#v8SheetBody .mecard');if(first)first.insertAdjacentHTML('afterbegin','<div id="pfLogoBox" class="pflogo"><div class="lg">'+(safeImg(c.logo)?'<img src="'+esc(safeImg(c.logo))+'" alt="">':'🏪')+'</div><div class="grow"><b>'+T('לוגו / תמונת העסק','Business logo')+'</b><small class="muted-note" style="display:block;margin:0">'+T('מופיע בדף העסק, במדריך העסקים ובאתר העסקי','Shown on your page and in the directory')+'</small><label class="btn sec" style="display:inline-block;cursor:pointer;margin-top:6px">📷 '+T(c.logo?'החלפה':'העלאה','Upload')+'<input type="file" id="pfLogo" accept="image/*" hidden></label>'+(c.logo?' <button class="mini" id="pfLogoX">'+T('הסרה','Remove')+'</button>':'')+'</div></div>');
    const pub=document.querySelector('#v8SheetBody [data-pf="show_prices"]');if(pub&&!document.querySelector('[data-pf="publish_prices"]'))pub.closest('label').insertAdjacentHTML('afterend','<label class="radio"><input type="checkbox" data-pf="publish_prices"'+(c.publish_prices?' checked':'')+'> 📢 '+T('לפרסם את המחירים אוטומטית בהשוואת המחירים באתר (מתעדכן לבד בכל שינוי)','Auto-publish my prices to the site price comparison')+'</label>');}
};
let shopMsgs=[];
const _v14LoadExtra=shopLoadExtra;
shopLoadExtra=async function(){await _v14LoadExtra();if(!sb||!shop.chain)return;
  try{const {data}=await sb.from('chains').select('logo,publish_prices').eq('name',shop.chain).maybeSingle();shop.row=Object.assign({},shop.row||{},data||{});}catch(e){}
  try{const {data}=await sb.from('store_messages').select('*').eq('chain',shop.chain).order('created_at',{ascending:false}).limit(200);shopMsgs=data||[];}catch(e){shopMsgs=[];}};
function msgsHtml(){return shopMsgs.length?shopMsgs.map(m=>'<div class="mecard" data-msg="'+m.id+'"><div class="ordtop"><b>'+esc(m.name||T('לקוח','Customer'))+'</b><span class="supst '+(m.is_read?'closed':'open')+'">'+(m.is_read?T('נקרא','Read'):T('חדש','New'))+'</span></div><small class="muted-note">'+esc(fmtDate(new Date(m.created_at)))+' '+fmtTime(new Date(m.created_at))+(m.phone?' · <a href="tel:'+esc(m.phone.replace(/[^\d+]/g,''))+'">'+esc(m.phone)+'</a>':'')+'</small><p style="white-space:pre-wrap;margin:6px 0">'+esc(m.body)+'</p>'+
  (m.reply?'<p class="muted-note">↩️ '+T('התשובה שלך: ','Your reply: ')+esc(m.reply)+'</p>':'')+'<div class="row2"><input data-rep placeholder="'+T('תשובה ללקוח (מגיעה אליו בהתראה)','Reply to the customer')+'" maxlength="2000"><button class="mini pri" data-sendrep2="1">📨</button></div></div>').join('')
  :'<div class="empty">'+T('עוד אין פניות מלקוחות. כשמישהו כותב לעסק — זה מגיע לכאן ובהתראה.','No messages yet.')+'</div>';}
document.querySelector('#v8SheetBody').addEventListener('click',async e=>{if(!$14('#shopTabs'))return;const t=e.target;
  const tb=t.closest('[data-shtab="msgs"]');if(tb){e.stopPropagation();shop.tab='msgs';await shopLoad();drawShop();const unread=shopMsgs.filter(m=>!m.is_read).map(m=>m.id);if(unread.length)sb.from('store_messages').update({is_read:true}).in('id',unread).then(()=>{});return;}
  const sr=t.closest('[data-sendrep2]');if(sr){const card=sr.closest('[data-msg]');const v=card.querySelector('[data-rep]').value.trim();if(!v)return;if(hasProfanity(v)){flash('🙏');return;}
    const {error}=await sb.from('store_messages').update({reply:v.slice(0,2000),is_read:true}).eq('id',card.dataset.msg);flash(error?'⚠️ '+error.message:'📨 '+T('נשלח ללקוח','Sent'));await shopLoad();drawShop();return;}
  if(t.closest('#pfLogoX')){const {data}=await sb.rpc('store_settings',{p_chain:shop.chain,p:{logo:''}});if(data==='ok'){flash('🗑️');await shopLoad();drawShop();}return;}
},true);
document.querySelector('#v8SheetBody').addEventListener('change',async e=>{if(!$14('#shopTabs'))return;
  if(e.target.id==='pfLogo'){const f=e.target.files[0];if(!f)return;try{const img=await fileToImage(f,320,150000);const {data,error}=await sb.rpc('store_settings',{p_chain:shop.chain,p:{logo:img}});flash(error?'⚠️ '+error.message:data==='ok'?'✅ '+T('הלוגו עודכן','Logo updated'):'⚠️ '+data);await shopLoad();drawShop();}catch(err){flash('⚠️');}return;}
  const ii=e.target.closest('[data-invimg]');if(ii){const f=ii.files[0];if(!f)return;try{const img=await fileToImage(f,420,150000);const {error}=await sb.from('store_inventory').update({image:img}).eq('id',ii.dataset.invimg);flash(error?'⚠️ '+error.message:'📷 '+T('התמונה נשמרה','Photo saved'));await shopLoad();drawShop();}catch(err){flash('⚠️');}}},true);

/* ---------- התראות לבעל העסק גם בתוך האתר (פעמון) ---------- */
let bizSeen={};try{bizSeen=JSON.parse(localStorage.getItem('yam_biz_seen'))||{};}catch(e){}
async function bizPoll(){if(!sb||!authUser||!myStore)return;const ch=myStore.chain;let n=0;
  try{const {data}=await sb.from('store_orders').select('id,name,status,created_at,items').eq('chain',ch).eq('status','new').order('created_at',{ascending:false}).limit(30);
    (data||[]).forEach(o=>{n++;notify('bizord:'+o.id,'biz','🛍️ '+T('הזמנה חדשה מ','New order from ')+o.name,(o.items||[]).length+' '+T('מוצרים','items'),'');});}catch(e){}
  try{const {data}=await sb.from('store_messages').select('id,name,body,is_read').eq('chain',ch).eq('is_read',false).limit(30);(data||[]).forEach(m=>{n++;notify('bizmsg:'+m.id,'biz','💬 '+T('פנייה מ','Message from ')+(m.name||T('לקוח','customer')),m.body,'');});}catch(e){}
  try{const {data}=await sb.from('store_inventory').select('id,name,qty,min_qty').eq('chain',ch).limit(5000);(data||[]).filter(i=>Number(i.min_qty)>0&&Number(i.qty)<=Number(i.min_qty)).slice(0,5).forEach(i=>notify('bizlow:'+i.id+':'+dayKey(new Date()),'biz','📋 '+T('צריך להזמין: ','Reorder: ')+i.name,T('נשארו ','Left ')+fmtQ(i.qty),''));}catch(e){}
  const bd=$14('#bizBadge');if(bd){bd.hidden=!n;bd.textContent=n;}}
setInterval(()=>{if(document.visibilityState==='visible')bizPoll();},60000);

/* ---------- סנכרון: פרופיל העסק בלשונית "חנויות" = אותו פרופיל של ניהול העסק ---------- */
const _v14OpenBiz=openBiz;
openBiz=async function(name){
  if(myStore&&myStore.chain===name){shop.tab='profile';return bizModeAllowed()?enterBizMode():openShop(name);}
  if(sb){try{const {data}=await sb.rpc('store_public',{p_chain:name});if(data)return openStorePublic(name);}catch(e){}}
  return _v14OpenBiz(name);};

/* ---------- דף העסק לכולם: עיצוב נקי עם תמונות ---------- */
const _v14OpenStorePublic=openStorePublic;
openStorePublic=async function(chain){await _v14OpenStorePublic(chain);const b=$14('#v8SheetBody');
  const dress=async()=>{let data=null;try{({data}=await sb.rpc('store_public',{p_chain:chain}));}catch(e){}if(!data)return;
    const apply=()=>{const head=b.querySelector('.bizpub h4');if(head&&safeImg(data.logo)&&!b.querySelector('.bizpub .plogo'))head.insertAdjacentHTML('beforebegin','<img class="plogo" src="'+esc(safeImg(data.logo))+'" alt="">');
      (Array.isArray(data.items)?data.items:[]).forEach(i=>{if(!i||!safeImg(i.image))return;const btn=b.querySelector('[data-cp="'+CSS.escape(String(i.id))+'"],[data-spadd="'+CSS.escape(String(i.name||''))+'"]');const row=btn&&btn.closest('.merow');if(row&&!row.querySelector('.pubimg'))row.insertAdjacentHTML('afterbegin','<img class="pubimg" src="'+esc(safeImg(i.image))+'" alt="" loading="lazy">');});};
    apply();new MutationObserver(apply).observe(b,{childList:true});};
  dress();};
const _v14OpenBizDirectory=openBizDirectory;
openBizDirectory=async function(){await _v14OpenBizDirectory();let logos={};try{const {data}=await sb.rpc('biz_directory');(data||[]).forEach(x=>{if(x.logo)logos[x.chain]=x.logo;});}catch(e){}
  const b=$14('#v8SheetBody');const apply=()=>b.querySelectorAll('[data-bdopen]').forEach(c=>{const l=logos[c.dataset.bdopen];const i=c.querySelector('.bzi');if(safeImg(l)&&i&&!i.querySelector('img'))i.innerHTML='<img src="'+esc(safeImg(l))+'" alt="">';});apply();new MutationObserver(apply).observe(b,{childList:true});};

/* ---------- צ'אט: המנהל מחליט אם הלקוחות רואים "נקרא" ---------- */
let chatCfg={showRead:true};
const _v14ApplyConfig=applyConfig;applyConfig=function(k,v){_v14ApplyConfig(k,v);if(k==='chat')chatCfg=Object.assign({showRead:true},v||{});};
function chatShowRead(){return chatCfg.showRead!==false;}

/* ---------- כניסה: עסק מאושר שהיה באתר העסקי — חוזר אליו ---------- */
const _v14AfterEnter=afterEnter;afterEnter=function(){_v14AfterEnter();setTimeout(()=>{bizPoll();if(state.bizMode&&bizModeAllowed())enterBizMode();},3500);};
if(state.user&&authUser)setTimeout(()=>{bizPoll();if(state.bizMode&&bizModeAllowed())enterBizMode();},4000);
