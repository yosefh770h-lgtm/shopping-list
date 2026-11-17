
/* ================= גרסה 12 (א): רקע מלא בכל המסך, מיקום משופר + חיפוש בגוגל, החנות הכי קרובה לכתובת ================= */
const $12=s=>document.querySelector(s);

/* ---------- רקע פירות וירקות — שכבה אחת קבועה מאחורי כל המסך, לא משנה כמה ארוכה הרשימה ---------- */
(function(){const em=['leafy-green','carrot','croissant','milk','apple','egg','grape','cherry','citrus','broccoli','banana','wheat','fish','cup-soda'];let t='';
  for(let i=0;i<14;i++){const x=(i*71)%340+10,y=(i*113)%400+24,sz=18+((i*7)%16),r=((i*29)%50)-25;t+='<g transform="translate('+x+' '+(y-sz)+') rotate('+r+' '+sz/2+' '+sz/2+') scale('+(sz/24)+')">'+ICONS2[em[i]]+'</g>';}
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="360" height="420" opacity="0.10" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+t+'</svg>';
  document.documentElement.style.setProperty('--dd','url("data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)+'")');})();
doodleBg=function(el){el.querySelectorAll(':scope > .dd').forEach(x=>x.remove());};
document.querySelectorAll('.pane > .dd').forEach(x=>x.remove());

async function v12BotPre(raw){
  const t=norm(raw);
  if(/(הכי קרוב|החנות הקרובה|סופר קרוב|חנויות קרובות|קרוב אליי|קרוב לבית|ליד הבית)/.test(t)&&yamiShopNear(t)){openNearMe();botSay('📍 '+T('פתחתי את החנויות הקרובות — לפי המיקום או הכתובת שלך, וגם חיפוש בגוגל.','Opened nearby stores.'));return true;}
  return false;
}
yamiStep(v12BotPre);

/* ---------- מיקום משופר ---------- */
const GEO_KEY='yam_geo_cache_v1';let geoCache={};try{geoCache=JSON.parse(localStorage.getItem(GEO_KEY))||{};}catch(e){}
let lastGeoCall=0;
async function geocode(q){q=String(q||'').trim();if(!q)return null;if(geoCache[q]!==undefined)return geoCache[q];
  const wait=1100-(Date.now()-lastGeoCall);if(wait>0)await new Promise(r=>setTimeout(r,wait));lastGeoCall=Date.now();
  try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=he&q='+encodeURIComponent(q));const j=await r.json();
    const v=j&&j[0]?{lat:+j[0].lat,lng:+j[0].lon}:null;geoCache[q]=v;try{localStorage.setItem(GEO_KEY,JSON.stringify(geoCache));}catch(e){}return v;}catch(e){return null;}}
/* מיקום מהטלפון: קודם מדויק, ואם לא עונה — מיקום משוער (מהיר יותר, גם בתוך בניין) */
exactLocation=function(){return new Promise(res=>{if(!navigator.geolocation)return res(null);let done=false;const fin=v=>{if(!done){done=true;res(v);}};
  const ok=p=>{const lat=p.coords.latitude,lng=p.coords.longitude;const nc=nearestCity(lat,lng);state.geo={lat,lng,acc:Math.round(p.coords.accuracy||0),city:nc.km<40?nc.city:'',ts:Date.now(),src:'gps'};if(nc.km<40)state.geoCity=nc.city;save(true);fin(state.geo);};
  const low=()=>navigator.geolocation.getCurrentPosition(ok,err=>{state.geoErr=err&&err.code===1?'denied':'fail';fin(null);},{enableHighAccuracy:false,timeout:12000,maximumAge:900000});
  setTimeout(()=>fin(state.geo&&Date.now()-state.geo.ts<3600000?state.geo:null),22000);
  navigator.geolocation.getCurrentPosition(ok,err=>{if(err&&err.code===1){state.geoErr='denied';fin(null);}else low();},{enableHighAccuracy:true,timeout:9000,maximumAge:300000});});};
function homeAddrText(){const a=(meData().address)||{};return [a.street,a.city].filter(Boolean).join(', ');}
async function homeLocation(){const q=homeAddrText();if(!q)return null;const g=await geocode(q+', ישראל')||await geocode(q);if(!g)return null;const nc=nearestCity(g.lat,g.lng);return {lat:g.lat,lng:g.lng,city:(meData().address||{}).city||(nc.km<40?nc.city:''),src:'home',label:q};}
/* סניפים בלי מיקום מדויק — מאתרים לפי הכתובת (שומר במכשיר, לא חוזר על זה) */
async function fillBranchPos(city,onProgress){const list=allBranches().filter(b=>(typeof b.lat!=='number'||typeof b.lng!=='number')&&(!city||norm(b.city)===norm(city))).slice(0,10);
  let n=0;for(const b of list){const g=await geocode((b.address?b.address+', ':'')+b.city+', ישראל');if(g){b.lat=g.lat;b.lng=g.lng;n++;}if(onProgress)onProgress(n,list.length);}return n;}
const mapsUrl=(what,g)=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(what+(g?' near '+g.lat.toFixed(5)+','+g.lng.toFixed(5):''));
const MAP_KINDS=[['🛒',T('סופרמרקט','Supermarket'),'סופרמרקט'],['🏪',T('מכולת','Grocery'),'מכולת'],['🥦',T('ירקן','Greengrocer'),'ירקות ופירות'],['🥩',T('קצביה','Butcher'),'קצביה'],['🥖',T('מאפייה','Bakery'),'מאפייה'],['💊',T('פארם','Pharmacy'),'פארם']];
/* 🔥 המבצעים האמיתיים בסניפים הקרובים — מקבצי המבצעים שהרשתות מפרסמות לפי חוק שקיפות המחירים (שרת המחירים, /deals).
   לכל סניף קרוב: המוצרים במבצע, המחיר הרגיל, מחיר המבצע וכמה חוסכים. נפתח ונסגר בלחיצה על הסניף. */
/* מתחילים להביא את המבצעים מיד כשיש מיקום — במקביל לאיתור הסניפים במפה */
/* פתוח לכולם (גם כשהשוואת החנויות עוד כבויה), אלא אם המנהל כיבה בבק אופיס ← איסוף מחירים */
function nearDealsOn(){return srvShown()||!(srvCfg&&srvCfg.near_deals_off===true);}
async function nmFetchDeals(g){if(!nearDealsOn()||!g||typeof g.lat!=='number')return null;
  if(g.lat<29||g.lat>34||g.lng<34||g.lng>36.5)return null; /* מחוץ לישראל אין קבצי מבצעים */
  const hid=srvHidden().join(',');
  try{const st=((await priceApi('/stores',{lat:g.lat.toFixed(5),lng:g.lng.toFixed(5),limit:12,exclude:hid}))||[]).filter(x=>!x.online&&x.km!=null&&x.km<=15).slice(0,6);
    return st.length?await priceApi('/deals',{stores:st.map(x=>x.store).join(','),per:10,exclude:hid}):null;}catch(e){return null;}}
async function nmLoadDeals(g,dealsP,box){box=box||$12('#nmDeals');if(!box||!dealsP)return;
  box.innerHTML='<div class="rank"><h3>🔥 '+T('מבצעים בסניפים הקרובים','Deals at nearby branches')+'</h3><div class="empty">'+T('טוענת את המבצעים...','Loading deals...')+'</div></div>';
  const d=await dealsP;
  if(!box.isConnected)return; /* בינתיים עברו לכתובת אחרת או סגרו */
  const list=d&&Array.isArray(d.stores)?d.stores.filter(x=>x&&x.store&&Array.isArray(x.deals)&&x.deals.length):[];
  if(!list.length){box.innerHTML='';return;}
  const dist=k=>k==null?'':' · <b>'+(k<1?Math.round(k*1000)+' '+T('מ׳','m'):(+k).toFixed(1)+' '+T('ק״מ','km'))+'</b>';
  const until=u=>u?' · '+T('עד ','until ')+new Date(u+'T12:00:00').toLocaleDateString(prefs.lang==='en'?'en-US':'he-IL'):'';
  box.innerHTML='<div class="rank"><h3>🔥 '+T('מבצעים בסניפים הקרובים','Deals at nearby branches')+'</h3>'+
    '<p class="muted-note" style="margin:0 0 6px">'+T('מקבצי המבצעים הרשמיים של הרשתות (מתעדכן כל שעה). מבצעי מועדון ובכרטיס אשראי לא מופיעים. כדאי לוודא בקופה.','From the chains\' official deal files (updated hourly). Club and card-only deals are not shown.')+'</p>'+
    list.map((x,i)=>{const s=x.store;const km=g&&s.lat!=null?distKm(g.lat,g.lng,s.lat,s.lng):null;
      return '<details class="nmdl"'+(i===0?' open':'')+'><summary><span class="grow"><b>'+esc(s.chain_name||s.chain||'')+'</b> · '+x.deals.length+' '+T('מבצעים','deals')+'<small>'+esc(srvAddr(s))+dist(km)+'</small></span>'+
        '<a class="mini" href="'+esc(wazeUrl([s.chain_name,s.address,s.city].filter(Boolean).join(' ')))+'" target="_blank" rel="noopener">🧭 Waze</a></summary>'+
        x.deals.map(p=>'<div class="merow"><span>🏷️</span><span class="grow"><b>'+esc(p.name||'')+'</b><small>'+esc(p.text||'')+(p.more>0?' · '+T('ועוד '+p.more+' מוצרים','+'+p.more+' more items'):'')+until(p.until)+'</small></span>'+
          '<span class="nmdp"><s>'+fmtPrice(p.regular)+'</s><b>'+(p.qty>1?p.qty+' '+T('ב-','for ')+fmtPrice(p.deal_price):fmtPrice(p.deal_price))+'</b>'+(p.pct>0?'<small>−'+p.pct+'%</small>':'')+'</span></div>').join('')+
        '</details>';}).join('')+'</div>';
}
(function(){const st=document.createElement('style');st.textContent='.nmdl{border-top:1px solid var(--line,#e5e5e5);padding:4px 0}.nmdl>summary{display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;padding:6px 0}.nmdl>summary::-webkit-details-marker{display:none}.nmdl>summary .grow small{display:block;color:var(--muted)}.nmdl>summary:before{content:"◂";color:var(--muted)}.nmdl[open]>summary:before{content:"▾"}.nmdp{display:flex;flex-direction:column;align-items:flex-end;white-space:nowrap;font-size:13px}.nmdp s{color:var(--muted);font-size:12px}.nmdp b{color:#c0392b}.nmdp small{color:#1e8449;font-weight:600}';document.head.appendChild(st);})();
openNearMe=async function(opt){opt=opt||{};
  const b=openSheet('📍 '+T('חנויות ומבצעים קרובים','Nearby stores & deals'),'');b.onclick=null;b.onchange=null;b.oninput=null;
  let mode=opt.mode||(state.nearMode)||(homeAddrText()?'home':'gps');
  const head=()=>'<div class="seg"><button data-nm="gps"'+(mode==='gps'?' class="on"':'')+'>📍 '+T('איפה שאני','Here')+'</button><button data-nm="home"'+(mode==='home'?' class="on"':'')+'>🏠 '+T('הכתובת שלי','My address')+'</button><button data-nm="type"'+(mode==='type'?' class="on"':'')+'>✏️ '+T('כתובת אחרת','Other')+'</button></div>';
  const draw=async()=>{const addr=homeAddrText();
    b.innerHTML=head()+(mode==='type'?'<div class="row2"><input id="nmAddr" placeholder="'+T('רחוב ומספר, עיר (למשל: רבי עקיבא 50, בני ברק)','Street, city')+'" value="'+esc(state.nearTyped||'')+'"><button id="nmGo" style="flex:0 0 auto">🔍</button></div>':'')+'<div id="nmBody"><div class="empty">'+T('מאתרת...','Locating...')+'</div></div>';
    let g=null;
    if(mode==='gps'){g=await exactLocation();if(!g){$12('#nmBody').innerHTML='<p class="muted-note">'+(state.geoErr==='denied'?'🔒 '+T('הדפדפן חוסם את המיקום. לוחצים על 🔒 ליד כתובת האתר ← "מיקום" ← "אפשר", ומרעננים. או בוחרים "🏠 הכתובת שלי".','Location is blocked in the browser.'):'⚠️ '+T('לא הצלחתי לקבל מיקום מהמכשיר (אולי GPS כבוי). אפשר לבחור "🏠 הכתובת שלי" או "✏️ כתובת אחרת".','Could not get your location.'))+'</p>';return;}}
    if(mode==='home'){if(!addr){$12('#nmBody').innerHTML='<p class="muted-note">'+T('עוד לא שמרת כתובת. כותבים רחוב ועיר ב"👤 האזור האישי" ← פרטים וכתובת.','No address saved yet.')+'</p><button id="nmMe">👤 '+T('לכתוב את הכתובת שלי','Add my address')+'</button>';return;}
      g=await homeLocation();if(!g){$12('#nmBody').innerHTML='<p class="muted-note">⚠️ '+T('לא מצאתי את הכתובת "'+esc(addr)+'" במפה. נסו לכתוב רחוב, מספר ועיר בדיוק.','Address not found.')+'</p>';return;}}
    if(mode==='type'){const q=(state.nearTyped||'').trim();if(!q){$12('#nmBody').innerHTML='<p class="muted-note">'+T('כותבים כתובת ולוחצים 🔍','Type an address')+'</p>';return;}
      const p=await geocode(q+', ישראל')||await geocode(q);if(!p){$12('#nmBody').innerHTML='<p class="muted-note">⚠️ '+T('לא מצאתי את הכתובת במפה','Address not found')+'</p>';return;}const nc=nearestCity(p.lat,p.lng);g={lat:p.lat,lng:p.lng,city:nc.km<40?nc.city:'',label:q};}
    const where=g.label||(g.src==='gps'?T('המיקום הנוכחי','current location'):g.city);
    const dealsP=nmFetchDeals(g);
    let nb=nearBranches(g,15);
    if(!nb.exact||nb.list.length<3){$12('#nmBody').innerHTML='<div class="empty">'+T('מאתרת את הסניפים במפה...','Placing branches on the map...')+'</div>';await fillBranchPos(g.city,(n,t)=>{const e=$12('#nmBody .empty');if(e)e.textContent=T('מאתרת סניפים במפה... '+n+'/'+t,'Locating '+n+'/'+t);});nb=nearBranches(g,15);}
    if(!storePosts.length&&sb&&authUser)await loadFeed();
    const chains=new Set(nb.list.map(x=>x.chain));const now=Date.now();
    const deals=storePosts.filter(p=>p.status==='approved'&&p.kind!=='news'&&(!p.ends_at||new Date(p.ends_at).getTime()>now)&&chains.has(p.chain));
    $12('#nmBody').innerHTML='<p class="muted-note">📍 '+esc(where||'')+(g.acc?' · '+T('דיוק ~','accuracy ~')+g.acc+T(' מ׳','m'):'')+'</p>'+
      '<div id="nmDeals"></div>'+
      (nb.list.length?'<div class="rank"><h3>🏪 '+T('הכי קרוב מהחנויות באתר','Nearest stores on the site')+'</h3>'+nb.list.slice(0,12).map(x=>'<div class="merow"><span>'+chainAv(x.chain)+'</span><span class="grow"><b>'+esc(x.chain)+'</b><small>'+esc(x.address||'')+(x.address?', ':'')+esc(x.city)+(x.km!=null?' · <b>'+(x.km<1?Math.round(x.km*1000)+' '+T('מ׳','m'):x.km.toFixed(1)+' '+T('ק״מ','km'))+'</b>':'')+'</small></span><a class="mini" href="'+esc(wazeUrl(branchQuery(x)))+'" target="_blank" rel="noopener">🧭 Waze</a><button class="mini" data-biz="'+esc(x.chain)+'">'+T('פרופיל','Profile')+'</button></div>').join('')+'</div>':'<p class="muted-note">'+T('אין עדיין באתר חנויות עם מיקום באזור הזה — אבל אפשר לחפש בגוגל 👇','No site stores here yet — search Google 👇')+'</p>')+
      (deals.length?'<div class="rank"><h3>🔥 '+T('מבצעים בחנויות הקרובות','Deals nearby')+'</h3>'+deals.slice(0,8).map(p=>'<div class="merow"><span>🏷️</span><span class="grow"><b>'+esc(p.title)+'</b><small>'+esc(p.chain)+(p.ends_at?' · '+T('עד ','until ')+new Date(p.ends_at).toLocaleDateString('he-IL'):'')+'</small></span></div>').join('')+'</div>':'')+
      '<div class="mecard"><h4>🔍 '+T('חיפוש בגוגל מפות — כל החנויות באזור','Google Maps — all stores around')+'</h4><div class="mapbtns">'+MAP_KINDS.map(([ic,l,q])=>'<a class="chip" href="'+esc(mapsUrl(q,g))+'" target="_blank" rel="noopener">'+ic+' '+l+'</a>').join('')+'</div>'+
      (sb&&authUser?'<button class="btn sec" id="nmWeb" style="width:100%;margin-top:8px">🌐 '+T('יאמי תחפש ברשת חנויות קרובות (שעות, טלפון)','Let Yami search the web')+'</button><div id="nmWebOut"></div>':'')+'</div>';
    b.dataset.where=(g.label||'')+(g.city?(g.label?', ':'')+g.city:'')||(g.lat.toFixed(4)+','+g.lng.toFixed(4));
    nmLoadDeals(g,dealsP);
  };
  b.onclick=async e=>{const m=e.target.closest('[data-nm]');if(m){mode=m.dataset.nm;state.nearMode=mode;save(true);draw();return;}
    if(e.target.closest('#nmGo')){state.nearTyped=$12('#nmAddr').value;save(true);draw();return;}
    if(e.target.closest('#nmMe')){closeSheet();openMe('info');setTimeout(()=>{const s=$12('#maStreet');if(s){s.scrollIntoView({block:'center'});s.focus();}},300);return;}
    const z=e.target.closest('[data-biz]');if(z){openBiz(z.dataset.biz);return;}
    if(e.target.closest('#nmWeb')){const out=$12('#nmWebOut');out.innerHTML='<div class="empty">🔍 '+T('מחפשת ברשת...','Searching...')+'</div>';
      let {data,error}=await sb.functions.invoke('ai-chat',{body:{nearby:{where:b.dataset.where}}});if(error&&error.context&&typeof error.context.json==='function'){try{data=await error.context.json();}catch(x){}}
      out.innerHTML=data&&data.web&&data.text?'<p class="muted-note">🌐 '+T('מהרשת (לא מאומת — כדאי לבדוק לפני שיוצאים):','From the web (unverified):')+'</p><div class="rsteps">'+esc(data.text).replace(/\n/g,'<br>')+'</div>'+((data.sources||[]).length?'<p class="muted-note">🔗 '+data.sources.slice(0,3).filter(s=>s&&safeLink(s.url)).map(s=>'<a href="'+esc(safeLink(s.url))+'" target="_blank" rel="noopener">'+esc(s.title||'מקור')+'</a>').join(' · ')+'</p>':'')
        :'<p class="muted-note">'+T('החיפוש ברשת לא זמין כרגע 🙁 — אפשר להשתמש בכפתורי גוגל מפות למעלה.','Web search unavailable — use the Google Maps buttons.')+(isAdmin()&&data&&data.detail?'<br><small>🔧 '+esc(aiErrShort(data.detail))+'</small>':'')+'</p>';}
  };
  b.onkeydown=e=>{if(e.target.id==='nmAddr'&&e.key==='Enter'){e.preventDefault();$12('#nmGo').click();}};
  draw();
};
/* באזור האישי: כפתור "החנויות הכי קרובות לכתובת שלי" */
const _v12RenderMe=renderMe;
renderMe=function(){_v12RenderMe.apply(this,arguments);const s=$12('#meSaveAddr');if(s&&!$12('#meNearAddr')){s.parentNode.insertAdjacentHTML('afterend','<button class="btn sec" id="meNearAddr" style="width:100%;margin-top:6px">📍 '+T('החנויות הכי קרובות לכתובת שלי','Stores nearest to my address')+'</button>');
  $12('#meNearAddr').onclick=()=>{$12('#meOverlay').classList.remove('open');openNearMe({mode:'home'});};}};
