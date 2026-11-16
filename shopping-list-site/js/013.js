
/* ================= גרסה 12 (ב): ניהול חנות — מלאי, קופה, מה להזמין, שיתוף לכולם, חיבור לקופה ================= */
const POS_URL='https://ygyfodxfbebnkwdcbjrp.supabase.co/functions/v1/pos';
let shop={chain:'',tab:'inv',items:[],q:'',cart:[],timer:null};
function myShopChains(){if(isAdmin())return allChainNames();return myStore?[myStore.chain]:[];}
async function shopLoad(){if(!sb||!shop.chain)return;const {data,error}=await sb.from('store_inventory').select('*').eq('chain',shop.chain).order('name').limit(10000);if(error){shop.err=error.message;return;}shop.err='';shop.items=data||[];try{const r=await sb.from('chains').select('inventory_public,inventory_show_qty,order_phone,order_url').eq('name',shop.chain).maybeSingle();shop.row=r.data||{};}catch(e){shop.row={};}}
const fmtQ=n=>{n=Number(n)||0;return Number.isInteger(n)?String(n):n.toFixed(2).replace(/\.?0+$/,'');};
async function openShop(chain){
  const chains=myShopChains();if(!chains.length){openBizJoin();return;}
  shop.chain=chain||shop.chain||chains[0];if(!chains.includes(shop.chain))shop.chain=chains[0];
  const b=openSheet('🏪 '+T('ניהול החנות שלי','My store'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');b.oninput=null;b.onchange=null;b.onkeydown=null;
  await shopLoad();drawShop();
  clearInterval(shop.timer);shop.timer=setInterval(async()=>{if(!$12('#v8Sheet').classList.contains('open')||!$12('#shopTabs')){clearInterval(shop.timer);return;}if(shop.tab==='inv'||shop.tab==='order'){const before=JSON.stringify(shop.items.map(i=>[i.id,i.qty]));await shopLoad();if(JSON.stringify(shop.items.map(i=>[i.id,i.qty]))!==before&&!document.activeElement.closest('#v8SheetBody input'))drawShop();}},30000);
}
function drawShop(){
  const b=$12('#v8SheetBody');const chains=myShopChains();
  const low=shop.items.filter(i=>Number(i.qty)<=Number(i.min_qty));
  const tabs=[['inv','📦 '+T('מלאי','Stock')+' ('+shop.items.length+')'],['pos','🧾 '+T('קופה','Register')],['order','📋 '+T('להזמין','To order')+(low.length?' ('+low.length+')':'')],['share','🔗 '+T('שיתוף','Share')],['api','🔌 '+T('חיבור קופה','POS link')]];
  let h=(chains.length>1?'<select id="shopChain">'+chains.map(c=>'<option'+(c===shop.chain?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select>':'<p class="muted-note" style="margin:0 0 6px">🏪 <b>'+esc(shop.chain)+'</b> · '+T('מתעדכן אוטומטית כל 30 שניות','auto-refreshes every 30s')+'</p>')+
    '<div class="catbar" id="shopTabs">'+tabs.map(([k,l])=>'<button class="cb'+(shop.tab===k?' on':'')+'" data-shtab="'+k+'">'+l+'</button>').join('')+'</div>'+(shop.err?'<p class="muted-note">⚠️ '+esc(shop.err)+(isAdmin()?' — '+T('צריך להריץ שוב את קוד ה-SQL','run the SQL again'):'')+'</p>':'');
  if(shop.tab==='inv'){const q=norm(shop.q);const list=shop.items.filter(i=>!q||norm(i.name+' '+i.barcode+' '+i.category).includes(q));
    const S=shop.items.reduce((a,i)=>{a.u+=Number(i.qty)||0;a.v+=(Number(i.qty)||0)*(Number(i.price)||0);return a;},{u:0,v:0});
    h+='<div class="kpis"><div class="kpi"><b>'+shop.items.length+'</b><span>'+T('מוצרים','items')+'</span></div><div class="kpi"><b>'+fmtQ(S.u)+'</b><span>'+T('יחידות במלאי','units')+'</span></div><div class="kpi"><b>'+fmtPrice(S.v,'ILS')+'</b><span>'+T('שווי המלאי','stock value')+'</span></div></div>'+
      '<details class="mecard" id="shAddBox"'+(shop.items.length?'':' open')+'><summary class="shsum">➕ '+T('מוצר חדש / עדכון / ייבוא','Add / update / import')+'</summary><div class="grid2"><input id="shName" placeholder="'+T('שם המוצר','Name')+'" maxlength="80" list="shNames"><input id="shBc" placeholder="'+T('ברקוד','Barcode')+'" inputmode="numeric" dir="ltr" maxlength="20"><input id="shPrice" type="number" step="0.01" min="0" placeholder="'+T('מחיר ₪','Price')+'"><input id="shQty" type="number" step="1" placeholder="'+T('כמות במלאי','Qty')+'"><input id="shMin" type="number" step="1" min="0" placeholder="'+T('להזמין כשנשאר (מינימום)','Reorder at')+'"><input id="shCat" placeholder="'+T('קטגוריה','Category')+'" list="shCats" maxlength="30"></div>'+
      '<datalist id="shNames">'+shop.items.map(i=>'<option value="'+esc(i.name)+'">').join('')+'</datalist><datalist id="shCats">'+CATS.map(c=>'<option value="'+esc(c)+'">').join('')+'</datalist>'+
      '<div class="row2"><button id="shSave">💾 '+T('שמירה','Save')+'</button><button class="btn sec" id="shScan">📷 '+T('סריקה','Scan')+'</button><label class="btn sec" style="text-align:center;cursor:pointer">📄 '+T('ייבוא קובץ','Import file')+'<input type="file" id="shFile" accept=".csv,.txt,.xlsx,.xls" hidden></label></div><p class="muted-note">'+T('קובץ: עמודות מוצר, ברקוד, מחיר, כמות, מינימום, קטגוריה (אפשר לייצא מתוכנת הקופה).','File columns: name, barcode, price, qty, min, category.')+'</p></details>'+
      '<input id="shQ" placeholder="🔍 '+T('חיפוש במלאי...','Search stock...')+'" value="'+esc(shop.q)+'">'+
      (list.length?'<div class="shoplist">'+list.slice(0,400).map(i=>{const lowI=Number(i.qty)<=Number(i.min_qty);return '<div class="merow'+(lowI?' lowstock':'')+'" data-shid="'+i.id+'"><span class="grow"><b>'+esc(i.name)+'</b><small>'+[i.barcode,i.category,i.price!=null?fmtPrice(i.price,'ILS'):'',lowI?'⚠️ '+T('להזמין','reorder'):''].filter(Boolean).map(esc).join(' · ')+(i.visible?'':' · 🙈')+'</small></span><span class="qty"><button type="button" data-shq="-1" aria-label="'+T('פחות','Less')+'">−</button><button type="button" class="qv" data-shset="1">'+fmtQ(i.qty)+'</button><button type="button" data-shq="1" aria-label="'+T('יותר','More')+'">+</button></span><button class="mini" data-shedit="1" aria-label="'+T('עריכה','Edit')+'">✏️</button></div>';}).join('')+'</div>'
        :'<div class="empty">'+T('עוד אין מוצרים — מוסיפים למעלה, סורקים או מייבאים קובץ.','No items yet.')+'</div>');}
  if(shop.tab==='pos'){const tot=shop.cart.reduce((a,c)=>a+(Number(c.price)||0)*c.qty,0);
    h+='<div class="mecard"><h4>🧾 '+T('מכירה מהירה','Quick sale')+'</h4><div class="row2"><input id="posQ" list="shNames2" placeholder="'+T('שם או ברקוד','Name or barcode')+'"><button id="posAdd" style="flex:0 0 auto">➕</button><button class="btn sec" id="posScan" style="flex:0 0 auto">📷</button></div><datalist id="shNames2">'+shop.items.map(i=>'<option value="'+esc(i.name)+'">').join('')+'</datalist>'+
      (shop.cart.length?shop.cart.map((c,k)=>'<div class="merow"><span class="grow"><b>'+esc(c.name)+'</b><small>'+(c.price!=null?fmtPrice(c.price,'ILS'):'')+'</small></span><span class="qty"><button type="button" data-cq="'+k+'|-1">−</button><button type="button" class="qv">'+c.qty+'</button><button type="button" data-cq="'+k+'|1">+</button></span><button class="mini" data-cx="'+k+'">✕</button></div>').join('')+
        '<div class="postotal">'+T('סה״כ','Total')+': <b>'+fmtPrice(tot,'ILS')+'</b></div><button id="posDone" style="width:100%">✅ '+T('סיום מכירה — להוריד מהמלאי','Complete sale')+'</button>':'<p class="muted-note">'+T('מוסיפים מוצרים (או סורקים), ובסוף "סיום מכירה" — והמלאי מתעדכן מיד.','Add items, then complete the sale.')+'</p>')+'</div><div id="posToday"></div>';}
  if(shop.tab==='order'){h+=(low.length?'<div class="mecard"><h4>📋 '+T('צריך להזמין','Need to order')+' ('+low.length+')</h4>'+low.map(i=>{const need=Math.max(1,Math.ceil(Number(i.min_qty)*2-Number(i.qty)));return '<div class="merow"><span class="grow"><b>'+esc(i.name)+'</b><small>'+T('נשאר ','left ')+fmtQ(i.qty)+' · '+T('מינימום ','min ')+fmtQ(i.min_qty)+'</small></span><b>'+T('להזמין ~','order ~')+need+'</b></div>';}).join('')+
      '<div class="row2"><button id="ordWa">💬 '+T('שליחה לספק בוואטסאפ','Send to supplier')+'</button><button class="btn sec" id="ordCsv">⬇️ '+T('קובץ','File')+'</button></div></div>':'<div class="empty">✅ '+T('אין מה להזמין — כל המוצרים מעל המינימום.','Nothing to order.')+'</div>')+'<p class="muted-note">'+T('מגדירים "מינימום" לכל מוצר במלאי, וכשהכמות יורדת אליו — הוא מופיע כאן.','Set a minimum per item.')+'</p>';}
  if(shop.tab==='share'){const c=shop.row||{};const url=location.origin+location.pathname+'#store-'+encodeURIComponent(shop.chain);
    h+='<div class="mecard"><h4>🔗 '+T('דף החנות לכולם','Public store page')+'</h4><p class="muted-note">'+T('כשמפעילים — כל אחד (גם בלי להירשם) רואה את המוצרים, המחירים ומה יש במלאי, עם טלפון להזמנות וקישור לאתר שלכם.','When on, anyone can see your items, prices and stock.')+'</p>'+
      '<label class="radio"><input type="checkbox" id="shPub"'+(c.inventory_public?' checked':'')+'> 🌍 '+T('לשתף את המלאי והמחירים עם כולם','Share stock & prices publicly')+'</label><label class="radio"><input type="checkbox" id="shShowQty"'+(c.inventory_show_qty?' checked':'')+'> 🔢 '+T('להראות כמה נשאר מכל מוצר (אחרת רק "יש / נגמר")','Show exact quantities')+'</label>'+
      '<div class="grid2"><div><label class="il" for="shPhone">'+T('טלפון להזמנות','Order phone')+'</label><input id="shPhone" inputmode="tel" dir="ltr" maxlength="30" value="'+esc(c.order_phone||'')+'"></div><div><label class="il" for="shUrl">'+T('קישור לאתר / הזמנות','Order website')+'</label><input id="shUrl" dir="ltr" maxlength="300" placeholder="https://" value="'+esc(c.order_url||'')+'"></div></div>'+
      '<button id="shPubSave" style="width:100%;margin-top:8px">💾 '+T('שמירה','Save')+'</button>'+
      '<div class="row2" style="margin-top:8px"><button class="btn sec" id="shPubOpen">👁️ '+T('תצוגה מקדימה','Preview')+'</button><button class="btn sec" id="shPubWa">💬 '+T('שיתוף בוואטסאפ','Share on WhatsApp')+'</button><button class="btn sec" id="shPubCopy">📋 '+T('העתקת קישור','Copy link')+'</button></div><p class="muted-note" dir="ltr" style="word-break:break-all">'+esc(url)+'</p></div>'+
      '<div class="mecard"><h4>💰 '+T('לפרסם את המחירים בהשוואת המחירים','Publish prices to the comparison')+'</h4><p class="muted-note">'+T('המחירים מהמלאי יופיעו בלשונית "מחירים" עם ✔ רשמי — לקוחות שמחפשים מוצר יראו אתכם.','Your prices appear as official in the price comparison.')+'</p><button class="btn sec" id="shPubPrices" style="width:100%">📢 '+T('לפרסם עכשיו','Publish now')+' ('+shop.items.filter(i=>i.price>0&&i.visible).length+')</button></div>';}
  if(shop.tab==='api'){h+='<div class="mecard"><h4>🔌 '+T('חיבור לקופה — עדכון אוטומטי בלייב','Connect your POS')+'</h4><p class="muted-note">'+T('כל מכירה בקופה מורידה מהמלאי באתר אוטומטית. נותנים לספק תוכנת הקופה (או למי שמחבר) את הכתובת והמפתח, והוא שולח מכירות ומלאי.','Give your POS provider the address and key.')+'</p><div id="apiInfo" class="muted-note">'+T('בודק...','Checking...')+'</div>'+
      '<button id="apiNew" style="width:100%">🔑 '+T('יצירת מפתח חדש (מבטל את הקודם)','Create a new key')+'</button><div id="apiKeyOut"></div>'+
      '<details class="grp" style="margin-top:8px"><summary>📄 '+T('הוראות למתכנת / לספק הקופה','Instructions for the developer')+'</summary><pre class="apidoc" dir="ltr">POST '+esc(POS_URL)+'\nHeader: x-store-key: &lt;KEY&gt;\n\n// sales (reduces stock)\n{"sales":[{"barcode":"7290000000001","qty":2,"price":5.9}]}\n\n// stock ("set" = exact, "add" = add)\n{"stock":[{"barcode":"7290000000001","name":"חלב 3%","qty":40,"price":5.9,"min_qty":10,"mode":"set"}]}\n\nGET '+esc(POS_URL)+'  → all items (JSON)</pre></details>'+
      '<p class="muted-note">'+T('אין חיבור ישיר? אפשר כל ערב לייצא מהקופה דוח מכירות ולייבא אותו כאן:','No direct link? Import the daily sales report:')+'</p><label class="btn sec" style="display:block;text-align:center;cursor:pointer">📄 '+T('ייבוא דוח מכירות (מוצר/ברקוד, כמות, מחיר)','Import sales report')+'<input type="file" id="salesFile" accept=".csv,.txt,.xlsx,.xls" hidden></label></div>';}
  b.innerHTML=h;
  if(shop.tab==='pos')shopToday();
  if(shop.tab==='api')sb.rpc('store_api_key_info',{p_chain:shop.chain}).then(({data})=>{const r=data&&data[0];const el=$12('#apiInfo');if(el)el.textContent=r?T('✅ יש מפתח פעיל מ-','✅ Key active since ')+fmtDate(new Date(r.created_at))+(r.last_used?T(' · שימוש אחרון: ',' · last used: ')+agoText(r.last_used):T(' · עוד לא היה בו שימוש',' · not used yet')):T('אין עדיין מפתח.','No key yet.');});
}
async function shopToday(){const el=$12('#posToday');if(!el)return;const since=new Date();since.setHours(0,0,0,0);
  const {data}=await sb.from('store_sales').select('name,qty,total,created_at,source').eq('chain',shop.chain).gte('created_at',since.toISOString()).order('created_at',{ascending:false}).limit(500);
  const rows=data||[];const sum=rows.reduce((a,r)=>a+(Number(r.total)||0),0);
  el.innerHTML='<div class="mecard"><h4>📈 '+T('מכירות היום','Today')+': '+fmtPrice(sum,'ILS')+' ('+rows.length+')</h4>'+rows.slice(0,15).map(r=>'<div class="merow"><span class="grow">'+esc(r.name)+' ×'+fmtQ(r.qty)+'<small>'+fmtTime(new Date(r.created_at))+(r.source!=='manual'?' · '+esc(r.source):'')+'</small></span><b>'+fmtPrice(r.total||0,'ILS')+'</b></div>').join('')+'</div>';}
function shopFind(q){q=String(q||'').trim();if(!q)return null;const d=q.replace(/\D/g,'');return shop.items.find(i=>d.length>=4&&i.barcode===d)||shop.items.find(i=>norm(i.name)===norm(q))||null;}
async function shopImport(file,kind){
  let table;if(/\.(xlsx|xls)$/i.test(file.name)){const X=await loadXlsx();const wb=X.read(await file.arrayBuffer(),{type:'array'});table=X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false});}
  else{const buf=await file.arrayBuffer();let t=new TextDecoder('utf-8').decode(buf);if(t.includes('�'))try{t=new TextDecoder('windows-1255').decode(buf);}catch(e){}table=parseCsv(t.replace(/^﻿/,''));}
  const COLS={name:['מוצר','שם','שם מוצר','שם המוצר','תיאור','product','name','item','description'],barcode:['ברקוד','barcode','ean','מקט','קוד','code'],price:['מחיר','price','מחיר לצרכן'],qty:['כמות','qty','quantity','מלאי','stock','נמכר'],min:['מינימום','min','min_qty','נקודת הזמנה'],category:['קטגוריה','מחלקה','category']};
  const mh=h=>{const k=String(h||'').trim().toLowerCase();for(const c in COLS)if(COLS[c].includes(k))return c;return null;};
  let hi=table.findIndex(r=>r.some(c=>mh(c)==='name'||mh(c)==='barcode'));const map={};if(hi<0){hi=-1;Object.assign(map,{0:'name',1:'barcode',2:'price',3:'qty',4:'min',5:'category'});}else table[hi].forEach((c,i)=>{const k=mh(c);if(k)map[i]=k;});
  const rows=table.slice(hi+1).map(r=>{const o={};Object.entries(map).forEach(([i,k])=>o[k]=String(r[i]==null?'':r[i]).trim());return o;}).filter(o=>o.name||o.barcode);
  const n=v=>{const x=parseFloat(String(v||'').replace(',','.'));return isNaN(x)?null:x;};
  if(kind==='sales'){const sales=rows.map(o=>({chain:shop.chain,name:(o.name||'').slice(0,80),barcode:(o.barcode||'').replace(/\D/g,'').slice(0,20),qty:n(o.qty)||1,price:n(o.price),source:'import'}));
    for(let i=0;i<sales.length;i+=500){const {error}=await sb.from('store_sales').insert(sales.slice(i,i+500));if(error){flash('⚠️ '+error.message);return;}}flash('🧾 '+T('יובאו '+sales.length+' שורות מכירה — המלאי עודכן','Imported '+sales.length));return;}
  let up=0,add=0;for(const o of rows.slice(0,5000)){const ex=shopFind(o.barcode)||shopFind(o.name);const rec={};if(o.name)rec.name=o.name.slice(0,80);if(o.barcode)rec.barcode=o.barcode.replace(/\D/g,'').slice(0,20);if(n(o.price)!=null)rec.price=n(o.price);if(n(o.qty)!=null)rec.qty=n(o.qty);if(n(o.min)!=null)rec.min_qty=n(o.min);if(o.category)rec.category=o.category.slice(0,30);
    if(ex){const {error}=await sb.from('store_inventory').update(rec).eq('id',ex.id);if(!error)up++;}else if(rec.name){const {error}=await sb.from('store_inventory').insert(Object.assign({chain:shop.chain},rec));if(!error)add++;}}
  flash('📦 '+T('עודכנו '+up+' · נוספו '+add,'Updated '+up+' · added '+add));
}
document.querySelector('#v8SheetBody').addEventListener('click',async e=>{
  if(!$12('#shopTabs'))return;const t=e.target;
  const tb=t.closest('[data-shtab]');if(tb){shop.tab=tb.dataset.shtab;await shopLoad();drawShop();return;}
  const row=t.closest('[data-shid]');const it=row&&shop.items.find(i=>i.id===row.dataset.shid);
  if(it&&t.closest('[data-shq]')){const nq=Number(it.qty)+Number(t.closest('[data-shq]').dataset.shq);const {error}=await sb.from('store_inventory').update({qty:nq}).eq('id',it.id);if(error){flash('⚠️ '+error.message);return;}it.qty=nq;drawShop();return;}
  if(it&&t.closest('[data-shset]')){const v=(await uiPrompt(T('כמה '+it.name+' יש במלאי?','How many?'),fmtQ(it.qty)));if(v===null)return;const nq=parseFloat(v);if(isNaN(nq))return;await sb.from('store_inventory').update({qty:nq}).eq('id',it.id);it.qty=nq;drawShop();return;}
  if(it&&t.closest('[data-shedit]')){$12('#shAddBox').open=true;['shName','shBc','shPrice','shQty','shMin','shCat'].forEach((id,k)=>{$12('#'+id).value=[it.name,it.barcode,it.price??'',fmtQ(it.qty),fmtQ(it.min_qty),it.category][k];});$12('#shName').scrollIntoView({block:'center'});$12('#shName').focus();
    if((await uiConfirm(T('למחוק את "'+it.name+'" מהמלאי? (ביטול = רק לערוך למעלה)','Delete "'+it.name+'"? (Cancel = just edit above)')))){await sb.from('store_inventory').delete().eq('id',it.id);await shopLoad();drawShop();}return;}
  if(t.closest('#shSave')){const name=$12('#shName').value.trim(),bc=$12('#shBc').value.replace(/\D/g,'');if(!name&&!bc){flash(T('צריך שם או ברקוד','Name or barcode'));return;}if(hasProfanity(name)){flash('🙏');return;}
    const ex=shopFind(bc)||shopFind(name);const v=id=>$12('#'+id).value.trim();const rec={};if(name)rec.name=name.slice(0,80);if(bc)rec.barcode=bc;if(v('shPrice')!=='')rec.price=parseFloat(v('shPrice'));if(v('shQty')!=='')rec.qty=parseFloat(v('shQty'));if(v('shMin')!=='')rec.min_qty=parseFloat(v('shMin'));if(v('shCat'))rec.category=v('shCat').slice(0,30);
    const {error}=ex?await sb.from('store_inventory').update(rec).eq('id',ex.id):await sb.from('store_inventory').insert(Object.assign({chain:shop.chain},rec));if(error){flash('⚠️ '+error.message);return;}
    flash('💾 '+(ex?T('עודכן','Updated'):T('נוסף','Added')));await shopLoad();drawShop();return;}
  if(t.closest('#shScan')){openBarcodeScanner(async code=>{closeBarcodeScanner();const ex=shopFind(code);openShop(shop.chain).then(()=>{if(ex){$12('#shQ').value=ex.name;shop.q=ex.name;drawShop();}else{$12('#shBc').value=code;nameForBarcode(code).then(n=>{if(n&&$12('#shName'))$12('#shName').value=n;});}});});return;}
  if(t.closest('#posAdd')||t.closest('#posScan')){const add=q=>{const ex=shopFind(q);if(!ex){flash(T('לא נמצא במלאי: ','Not in stock: ')+q);return;}const c=shop.cart.find(x=>x.id===ex.id);if(c)c.qty++;else shop.cart.push({id:ex.id,name:ex.name,price:ex.price,qty:1});drawShop();};
    if(t.closest('#posScan')){openBarcodeScanner(code=>{closeBarcodeScanner();openShop(shop.chain).then(()=>add(code));});return;}add($12('#posQ').value);return;}
  const cq=t.closest('[data-cq]');if(cq){const [k,d]=cq.dataset.cq.split('|');const c=shop.cart[+k];c.qty=Math.max(1,c.qty+Number(d));drawShop();return;}
  const cx=t.closest('[data-cx]');if(cx){shop.cart.splice(+cx.dataset.cx,1);drawShop();return;}
  if(t.closest('#posDone')){const rows=shop.cart.map(c=>({chain:shop.chain,item_id:c.id,qty:c.qty,price:c.price,source:'manual'}));const {error}=await sb.from('store_sales').insert(rows);if(error){flash('⚠️ '+error.message);return;}
    flash('✅ '+T('נמכר — המלאי עודכן','Sold — stock updated'));shop.cart=[];await shopLoad();drawShop();return;}
  if(t.closest('#ordWa')||t.closest('#ordCsv')){const low=shop.items.filter(i=>Number(i.qty)<=Number(i.min_qty));const lines=low.map(i=>[i.name,i.barcode,Math.max(1,Math.ceil(Number(i.min_qty)*2-Number(i.qty)))]);
    if(t.closest('#ordWa')){window.open('https://wa.me/?text='+encodeURIComponent('📋 '+T('הזמנה עבור ','Order for ')+shop.chain+':\n'+lines.map(l=>'• '+l[0]+' — '+l[2]).join('\n')),'_blank','noopener');}
    else{const csv='﻿מוצר,ברקוד,כמות להזמנה\n'+lines.map(l=>l.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='order.csv';a.click();}return;}
  if(t.closest('#shPubSave')){const {data,error}=await sb.rpc('store_inventory_settings',{p_chain:shop.chain,p_public:$12('#shPub').checked,p_show_qty:$12('#shShowQty').checked,p_phone:$12('#shPhone').value.trim(),p_url:$12('#shUrl').value.trim()});
    flash(error?'⚠️ '+error.message:({ok:'💾 '+T('נשמר','Saved'),bad_url:'⚠️ '+T('הקישור צריך להתחיל ב-https://','Link must start with https://'),forbidden:'⛔'}[data]||data));if(!error&&data==='ok'){await shopLoad();}return;}
  if(t.closest('#shPubOpen')){openStorePublic(shop.chain);return;}
  const url=location.origin+location.pathname+'#store-'+encodeURIComponent(shop.chain);
  if(t.closest('#shPubWa')){window.open('https://wa.me/?text='+encodeURIComponent('🏪 '+shop.chain+' — '+T('המוצרים והמחירים שלנו, מתעדכן בלייב:','our items and prices, live:')+'\n'+url),'_blank','noopener');return;}
  if(t.closest('#shPubCopy')){try{await navigator.clipboard.writeText(url);flash('📋 '+T('הועתק','Copied'));}catch(err){(await uiPrompt(T('העתיקו:','Copy:'),url));}return;}
  if(t.closest('#shPubPrices')){const its=shop.items.filter(i=>i.price>0&&i.visible);if(!its.length||!(await uiConfirm(T('לפרסם '+its.length+' מחירים בהשוואת המחירים?','Publish '+its.length+' prices?'))))return;
    const rows=its.map(i=>({product:i.name.slice(0,60),product_key:norm(i.name.slice(0,60)),chain:shop.chain,branch:'',price:Number(i.price),currency:'ILS',barcode:/^\d{4,20}$/.test(i.barcode)?i.barcode:null,by_id:authUser.id,by_name:(state.user&&state.user.name)||''}));
    let ok=0;for(let i=0;i<rows.length;i+=300){const {error}=await sb.from('prices').insert(rows.slice(i,i+300));if(error){flash('⚠️ '+error.message);break;}ok+=Math.min(300,rows.length-i);}if(ok)flash('📢 '+T('פורסמו '+ok+' מחירים','Published '+ok));return;}
  if(t.closest('#apiNew')){if(!(await uiConfirm(T('ליצור מפתח חדש? מפתח קודם יפסיק לעבוד.','Create a new key? The old one stops working.'))))return;const {data,error}=await sb.rpc('store_api_key_new',{p_chain:shop.chain});if(error){flash('⚠️ '+error.message);return;}
    $12('#apiKeyOut').innerHTML='<p class="muted-note">⚠️ '+T('שמרו את המפתח עכשיו — הוא לא יוצג שוב:','Save this key now — it will not be shown again:')+'</p><pre class="apidoc" dir="ltr">'+esc(data)+'</pre><button class="btn sec" id="apiCopy">📋 '+T('העתקה','Copy')+'</button>';$12('#apiCopy').onclick=()=>navigator.clipboard.writeText(data).then(()=>flash('📋'));return;}
});
document.querySelector('#v8SheetBody').addEventListener('change',async e=>{if(!$12('#shopTabs'))return;
  if(e.target.id==='shChain'){shop.chain=e.target.value;shop.cart=[];await shopLoad();drawShop();return;}
  if(e.target.id==='shFile'||e.target.id==='salesFile'){const f=e.target.files[0];if(!f)return;try{await shopImport(f,e.target.id==='salesFile'?'sales':'stock');}catch(err){flash('⚠️ '+(err.message==='xlsx'?T('שמרו כ-CSV','Save as CSV'):err.message));}await shopLoad();drawShop();}});
document.querySelector('#v8SheetBody').addEventListener('input',e=>{if(e.target.id!=='shQ')return;shop.q=e.target.value;const pos=e.target.selectionStart;drawShop();const n=$12('#shQ');if(n){n.focus();n.setSelectionRange(pos,pos);}});
document.querySelector('#v8SheetBody').addEventListener('keydown',e=>{if(e.target.id==='posQ'&&e.key==='Enter'){e.preventDefault();$12('#posAdd').click();}});

/* ---------- דף החנות לכולם (#store-שם) ---------- */
async function openStorePublic(chain){
  const b=openSheet('🏪 '+chain,'<div class="empty">'+T('טוען...','Loading...')+'</div>');b.onclick=null;b.onchange=null;b.oninput=null;b.onkeydown=null;
  if(!sb){b.innerHTML='<p class="muted-note">'+T('צריך חיבור לאינטרנט','Needs internet')+'</p>';return;}
  const {data,error}=await sb.rpc('store_public',{p_chain:chain});
  if(error||!data){b.innerHTML='<p class="muted-note">'+T('החנות לא משתפת כרגע את המלאי שלה 🙂','This store is not sharing its stock right now 🙂')+'</p>';return;}
  let q='';const items=data.items||[];
  const draw=()=>{const qq=norm(q);const list=items.filter(i=>!qq||norm(i.name+' '+(i.category||'')).includes(qq));const byC={};list.forEach(i=>{(byC[i.category||T('כללי','General')]=byC[i.category||T('כללי','General')]||[]).push(i);});
    b.innerHTML='<div class="mecard"><h4>🏪 '+esc(data.chain)+'</h4>'+(data.about?'<p class="muted-note" style="margin:0">'+esc(data.about)+'</p>':'')+'<p class="muted-note">'+[data.address,data.hours].filter(Boolean).map(esc).join(' · ')+(data.updated_at?' · 🔄 '+T('עודכן ','updated ')+agoText(data.updated_at):'')+'</p>'+
      '<div class="row2">'+(data.phone?'<a class="btn" href="tel:'+esc(data.phone.replace(/[^\d+]/g,''))+'">📞 '+T('להזמנות','Order')+' '+esc(data.phone)+'</a>':'')+(data.whatsapp?'<a class="btn sec" href="https://wa.me/'+esc(data.whatsapp.replace(/\D/g,'').replace(/^0/,'972'))+'" target="_blank" rel="noopener">💬 WhatsApp</a>':'')+(safeUrl(data.url)?'<a class="btn sec" href="'+esc(safeUrl(data.url))+'" target="_blank" rel="noopener">🌐 '+T('לאתר','Website')+'</a>':'')+'</div></div>'+
      '<input id="spQ" placeholder="🔍 '+T('חיפוש מוצר...','Search...')+'" value="'+esc(q)+'">'+
      Object.keys(byC).map(c=>'<div class="mecard"><h4>'+esc(c)+'</h4>'+byC[c].map(i=>'<div class="merow'+(i.in_stock?'':' oos')+'"><span class="grow"><b>'+esc(i.name)+'</b><small>'+(i.in_stock?(i.qty!=null?'✅ '+T('במלאי: ','in stock: ')+fmtQ(i.qty)+(i.unit?' '+esc(i.unit):''):'✅ '+T('יש במלאי','in stock')):'❌ '+T('נגמר','out of stock'))+'</small></span>'+(i.price!=null?'<b>'+fmtPrice(i.price,'ILS')+'</b>':'')+'<button class="mini" data-spadd="'+esc(i.name)+'" aria-label="'+T('לרשימה','To list')+'">🛒</button></div>').join('')+'</div>').join('')+
      (list.length?'':'<div class="empty">'+T('לא נמצא 🤷','Not found 🤷')+'</div>');};
  draw();
  b.oninput=e=>{if(e.target.id!=='spQ')return;q=e.target.value;const pos=e.target.selectionStart;draw();const n=$12('#spQ');n.focus();n.setSelectionRange(pos,pos);};
  b.onclick=e=>{const a=e.target.closest('[data-spadd]');if(a){addItem(a.dataset.spadd,'');flash('🛒 '+a.dataset.spadd);}};
}
const _v12RouteHash=routeHash;
routeHash=function(){const h=location.hash||'';const m=h.match(/^#store-(.+)$/);if(m){const name=decodeURIComponent(m[1]);history.replaceState(null,'',location.pathname);setTimeout(()=>openStorePublic(name),500);return;}return _v12RouteHash();};
removeEventListener('hashchange',_v12RouteHash);addEventListener('hashchange',()=>routeHash());

/* ---------- כניסה לניהול החנות: תפריט + פרופיל החנות + יאמי ---------- */
(function(){const g=document.querySelector('#hMenu details[data-g="shop"] .mgbody')||$12('#hMenu');g.insertAdjacentHTML('afterbegin','<button id="miShop">🏪<span>'+T('ניהול החנות שלי (מלאי וקופה)','My store (stock & register)')+'</span></button>');
  $12('#miShop').onclick=()=>{$12('#hMenu').classList.remove('open');openShop();};
  const upd=()=>{const b=$12('#miShop');if(b)b.hidden=!myStore;};upd();})();
async function v12bBotPre(raw){const t=norm(raw);
  if(/(ניהול החנות|ניהול מלאי|המלאי של החנות|קופה של החנות|מה צריך להזמין לחנות|מה להזמין לחנות)/.test(t)&&(myStore||isAdmin())){if(/להזמין/.test(t))shop.tab='order';openShop();botSay('🏪 '+T('פתחתי את ניהול החנות','Opened your store'));return true;}
  return false;}
yamiStep(v12bBotPre);
const _v12bAfterEnter=afterEnter;afterEnter=function(){_v12bAfterEnter();setTimeout(routeHash,2500);};
if(/^#store-/.test(location.hash))setTimeout(routeHash,3000);
