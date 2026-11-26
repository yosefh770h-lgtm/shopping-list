/* 📣 הסל הזול השבוע בעיר (sal-zol-hashavua.html) — נובמבר 2026.
   סל של מוצרים מוכרים לפי ברקוד — אותו מוצר בדיוק בכל חנות, כדי שההשוואה תהיה הוגנת. משווים רק חנויות שיש בהן את כל הסל.
   איזה מוצרים: המנהל קובע בבק אופיס (js/sal-pick.js — אותם מוצרים כל יום, או מבחר אחר כל יום).
   כל משתמש בוחר: "הסל של האתר" או "אני בוחר את המוצרים" (✏️) — הסל שלו נשמר אצלו, ועובר בקישור ובQR (?p=ברקודים) למי שמקבל את התמונה.
   בתמונה ובהדפסה: "נוצר ע״י ים שופינג", השם של מי שעשה את ההשוואה (רק אם כתב), ו"משתמש פרו" — פרו נבדק בשרת (pro_status) ורק הוא יכול לבחור צבע.
   המחירים: שרת המחירים (/api/prices/compare), חנויות פיזיות בעיר בלבד, לפי מחיר המדף הרגיל — בלי מבצעים.
   מבצעים לא נכנסים כי רבים מהם מותנים ("קופון חלב ב-1 ₪", "למצטרפים", "4 ב-18") ואז הסל נראה זול ממה שבאמת משלמים.
   כל שבוע התמונה "מתחדשת" לבד — היא מחושבת מהמחירים של היום, עם הפרשה של השבת הקרובה.
   יוצא: תמונה לקבוצה (1080×1350), תמונה לסטטוס (1080×1920), ודף להדפסה (A4, עם QR). בתמונות אין דמויות — רק טקסט ולוגו. */
(function(){
'use strict';
const API='/api/prices',SITE='https://www.yamshopping.com/sal-zol-hashavua.html',KEY='yam_sal_city',MINE='yam_sal_mine',SHOWI='yam_sal_showitems',USE='yam_sal_use',WHO='yam_sal_who',COL='yam_sal_color';
/* ההגדרה מהבק אופיס (site_config "sal") — קריאה ציבורית, כמו בשאר האתר */
const SB_URL='https://ygyfodxfbebnkwdcbjrp.supabase.co',SB_KEY='sb_publishable_ePRvA2OrDbBN3tbjbD3p-w_8maEwTCK';
const SP=window.SalPick;
let BASKET=SP.DEFAULT.slice(),custom=false,mode='fixed';
/* סניפי משלוחים בלבד ("מרלוג אינטרנט", "און ליין") — לא חנות שנכנסים אליה */
const ONLINE=/אינטרנט|אונליין|און ליין|משלוח|online|וולט/i;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₪'+(Math.round(n*100)/100).toFixed(2).replace(/\.00$/,'');
const ls={get(k){try{return localStorage.getItem(k)||'';}catch(e){return '';}},set(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}}};
const store={get:()=>ls.get(KEY),set:v=>ls.set(KEY,v)};
let cur=null; /* {city, top:[...], gap, week, updated, url} */

/* ---------- ⭐ פרו, שם וצבע ---------- */
/* אותם צבעים כמו ערכות הצבעים של האתר (js/043.js TH36); הראשון פתוח לכולם, השאר לפרו */
const COLORS=[['sea','כחול כהה','#1e3a5f'],['sky','תכלת','#1f74ad'],['mint','מנטה','#1b7d65'],['lilac','לילך','#7462c9'],['night','לילה','#2a2f3a']];
let pro=false;
/* הכניסה של המשתמש באתר (supabase-js שומר אותה כאן). פג תוקף — לא פרו עד שנכנסים לאתר שוב */
function session(){try{const s=JSON.parse(ls.get('sb-ygyfodxfbebnkwdcbjrp-auth-token')||'null');return s&&s.access_token&&s.expires_at*1000>Date.now()+30000?s:null;}catch(e){return null;}}
$('#who').value=ls.get(WHO);
const proReady=(async()=>{const s=session();if(!s)return;
  const m=(s.user&&s.user.user_metadata)||{};if(!ls.get(WHO)&&(m.name||m.full_name))$('#who').value=String(m.name||m.full_name).slice(0,30);
  try{const r=await fetch(SB_URL+'/rest/v1/rpc/pro_status',{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:'{}'});
    const d=r.ok?await r.json():null;pro=!!(d&&d.pro);}catch(e){}})();
/* 📊 מי השתמש — לבק אופיס ← 📣 הסל הזול (sal_log). אורח: רק המזהה האקראי של המכשיר, אותו מזהה כמו באתר (yam_guest_id).
   לאן שיתפו (וואטסאפ/ג'ימייל) הדפדפן לא מגלה — נשמר רק סוג הפעולה */
function guestId(){let id=ls.get('yam_guest_id');if(!/^[0-9a-f-]{36}$/.test(id)){id=crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g,()=>(Math.random()*16|0).toString(16));ls.set('yam_guest_id',id);}return id;}
const logged={};
function log(action){try{const s=session(),k=action+'|'+(cur?cur.city:'');if(logged[k]&&Date.now()-logged[k]<60000)return;logged[k]=Date.now();
  fetch(SB_URL+'/rest/v1/rpc/sal_log',{method:'POST',keepalive:true,headers:{apikey:SB_KEY,Authorization:'Bearer '+(s?s.access_token:SB_KEY),'Content-Type':'application/json'},
    body:JSON.stringify({p_guest:s?null:guestId(),p_action:action,p_city:cur?cur.city:'',p_custom:custom,p_n:BASKET.length})}).catch(()=>{});}catch(e){}}
/* נכנסו מתמונה או QR ששותפו (בקישור שבתמונה יש r=1) — נספר פעם אחת */
let arrived=new URLSearchParams(location.search).get('r')==='1';
const colorId=()=>{const c=ls.get(COL);return pro&&COLORS.some(k=>k[0]===c)?c:'sea';};
const hex=()=>COLORS.find(k=>k[0]===colorId())[2];
const shade=(h,k)=>'#'+[1,3,5].map(i=>Math.round(parseInt(h.substr(i,2),16)*k).toString(16).padStart(2,'0')).join('');
const who=()=>$('#who').value.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,30);
const creditText=()=>'נוצר ע״י ים שופינג'+(who()?(custom?' · המוצרים וההשוואה של ':' · ההשוואה של ')+who():'')+(pro?' · ⭐ משתמש פרו':'');
function applyColor(){const h=hex(),r=document.documentElement.style;r.setProperty('--hdr',h);
  if(!matchMedia('(prefers-color-scheme:dark)').matches)r.setProperty('--accent',h);else r.removeProperty('--accent');
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=h;
  $('#cols').innerHTML=COLORS.map(([id,n,c],i)=>{const lock=i&&!pro;return '<button type="button" data-col="'+id+'" style="background:'+c+'" aria-pressed="'+(id===colorId())+'" aria-label="'+n+(lock?' (לפרו)':'')+'">'+(lock?'🔒':'')+'</button>';}).join('');
  $('#proHint').hidden=pro;}
$('#cols').onclick=e=>{const b=e.target.closest('[data-col]');if(!b)return;
  if(b.dataset.col!=='sea'&&!pro){$('#proHint').hidden=false;$('#st').textContent='🔒 בחירת צבע פתוחה למשתמשי פרו';return;}
  ls.set(COL,b.dataset.col==='sea'?null:b.dataset.col);applyColor();if(cur)preview();};
let whoT=0;$('#who').oninput=()=>{ls.set(WHO,who()||null);if(!cur)return;$('#credit').textContent=creditText();clearTimeout(whoT);whoT=setTimeout(preview,400);};
applyColor();proReady.then(()=>{applyColor();if(cur){$('#credit').textContent=creditText();preview();}});

/* ---------- 📅 השבוע: פרשת השבת הקרובה (js/089-hcal.js) ---------- */
function weekLabel(){try{const H=window.Hcal,rd=H.rdOf(new Date()),sat=rd+((6-H.dow(rd))+7)%7,p=H.parshaName(H.parshaNums(sat,true));
  if(p)return 'שבוע פרשת '+p;const ev=(H.events(sat,true)||[]).find(e=>e.k==='chag'||e.k==='cm');return ev?'שבוע '+ev.base:'השבוע';}catch(e){return 'השבוע';}}
const dateStr=d=>d.getDate()+'.'+(d.getMonth()+1)+'.'+d.getFullYear();
/* 🕐 מתי עשו את ההשוואה — יום בשבוע, תאריך ושעה בשעון ישראל (המחירים משתנים מיום ליום) */
const DAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
function whenStr(d){let p={};try{new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jerusalem',weekday:'short',day:'numeric',month:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).forEach(x=>p[x.type]=x.value);}catch(e){}
  const wd=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday);
  return p.day?'ההשוואה נעשתה ביום '+DAYS[wd]+' '+p.day+'.'+p.month+'.'+p.year+' בשעה '+p.hour+':'+p.minute
    :'ההשוואה נעשתה ביום '+DAYS[d.getDay()]+' '+dateStr(d)+' בשעה '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}

/* ---------- 🏙️ ערים ---------- */
fetch('/cities-il.json').then(r=>r.json()).then(list=>{const dl=$('#cities');dl.innerHTML=list.map(c=>'<option value="'+esc(c)+'">').join('');}).catch(()=>{});

/* ---------- 🧺 איזה מוצרים בסל ---------- */
/* 1. קישור עם ?p= (מישהו שיתף סל שבחר)  2. הסל ששמרתי לעצמי  3. הבק אופיס  4. ברירת המחדל */
async function loadBasket(){
  const qp=new URLSearchParams(location.search).get('p');let mine=[];try{mine=SP.clean(JSON.parse(ls.get(MINE)||'[]'));}catch(e){mine=[];}
  if(qp){const codes=qp.split(',').filter(c=>/^\d{5,14}$/.test(c)).slice(0,SP.MAX);const known=new Map(mine.concat(SP.DEFAULT).map(i=>[i[1],i[0]]));
    if(codes.length>=SP.MIN){BASKET=codes.map(c=>[known.get(c)||c,c]);custom=true;return;}}
  if(mine.length>=SP.MIN&&ls.get(USE)!=='site'){BASKET=mine;custom=true;return;}
  try{const r=await fetch(SB_URL+'/rest/v1/site_config?key=eq.sal&select=value',{headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY}});
    const d=r.ok?await r.json():[];const cfg=d&&d[0]&&d[0].value;if(cfg){BASKET=SP.pick(cfg);mode=cfg.mode==='daily'?'daily':'fixed';}}catch(e){}
  custom=false;}
const basketReady=loadBasket().then(drawSrc);
function drawSrc(){$('#srcSite').setAttribute('aria-pressed',String(!custom));$('#srcMine').setAttribute('aria-pressed',String(custom));}
const N=()=>BASKET.length;
const title=()=>custom?'הסל שלי — איפה הכי זול':mode==='daily'?'הסל הזול היום':'הסל הזול השבוע';
const sub=()=>N()+(custom?' מוצרים שבחרתי':' מוצרים מוכרים');

/* ---------- 🛒 החישוב ---------- */
async function run(city){
  city=String(city||'').trim().slice(0,40);if(!city){$('#st').textContent='כותבים שם של עיר';return;}
  store.set(city);const u=new URL(location.href);u.searchParams.set('city',city);u.searchParams.delete('r');history.replaceState(null,'',u.pathname+u.search);
  $('#st').textContent='⏳ בודקים את המחירים ב'+city+'...';$('#out').hidden=true;$('#go').disabled=true;
  try{await basketReady;
    /* בעיר גדולה יש יותר מ-60 סניפים (ירושלים ~150), וההשוואה בשרת מוגבלת ל-60 — אז קודם כל הסניפים בעיר, ואז השוואה בחלקים */
    const json=u=>fetch(API+u).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();});
    const h=json('/health').catch(()=>({}));
    const keys=(await json('/stores?'+new URLSearchParams({city,limit:'200'}))).filter(s=>!ONLINE.test(s.name||'')).map(s=>s.store);
    const items=BASKET.map(b=>b[0]+'#'+b[1]).join('|'),parts=[];for(let i=0;i<keys.length;i+=50)parts.push(keys.slice(i,i+50));
    const got=await Promise.all(parts.map(k=>json('/compare?'+new URLSearchParams({items,stores:k.join(','),limit:'60'}))));
    const full=got.flatMap(d=>d.stores||[]).filter(s=>s.found===BASKET.length&&s.regular>0&&!s.online).map(s=>({...s,total:s.regular})).sort((a,b)=>a.total-b.total);
    /* הסניף הכי זול מכל רשת — כדי שלא יופיעו חמישה סניפים של אותה רשת */
    const seen=new Set(),top=[];for(const s of full){const k=s.chain_name||s.chain;if(seen.has(k))continue;seen.add(k);top.push(s);if(top.length===5)break;}
    /* שם המוצר שלא היה ידוע (סל מקישור) — מהקובץ של החנות הזולה */
    if(full[0])BASKET=BASKET.map(b=>{if(b[0]!==b[1])return b;const l=(full[0].lines||[]).find(l=>l.code===b[1].replace(/^0+/,''));return l&&l.name?[l.name,b[1]]:b;});
    if(top.length<2){$('#st').innerHTML='😕 לא מצאנו ב'+esc(city)+' לפחות שתי רשתות שיש בהן את כל '+N()+' המוצרים של הסל.'+(custom?' אפשר להוריד מהסל מוצר שלא נמכר בכל מקום (✏️ אני בוחר את המוצרים).':' אפשר לנסות עיר קרובה גדולה יותר.');return;}
    const hh=await h,updated=hh&&hh.updated?new Date(hh.updated*1000):new Date();
    cur={at:new Date(),city,top,gap:full[full.length-1].total-full[0].total,branches:full.length,week:weekLabel(),updated,url:SITE+'?city='+encodeURIComponent(city)+'&r=1'+(custom?'&p='+BASKET.map(b=>b[1]).join(','):'')};
    show();$('#st').textContent='';log('view');if(arrived){arrived=false;log('arrive');}
  }catch(e){console.warn('sal',e);$('#st').textContent='⚠️ שרת המחירים לא ענה כרגע. נסו שוב בעוד כמה דקות.';}
  finally{$('#go').disabled=false;}}

function show(){const c=cur,MED=['🥇','🥈','🥉','4','5'];
  $('#h1').textContent=(custom?'הסל שלי':title())+' ב'+c.city;
  $('#lead').textContent=c.week+' · '+sub()+', אותו מוצר בדיוק בכל חנות';
  $('#res').innerHTML=c.top.map((s,i)=>'<li'+(i?'':' class="first"')+'><span class="n" aria-hidden="true">'+MED[i]+'</span><div class="w"><div class="c">'+esc(s.chain_name)+'</div><div class="a">'+esc([s.name,s.address].filter(Boolean).join(' · '))+'</div></div><span class="t">'+money(s.total)+'</span></li>').join('');
  const g=$('#gap');g.hidden=!(c.gap>=1);g.textContent='באותו סל בדיוק — פער של עד '+money(c.gap)+' בין החנויות ב'+c.city+' ('+c.branches+' סניפים נבדקו)';
  $('#items').innerHTML=BASKET.map(b=>'<li>'+esc(b[0])+'</li>').join('');
  $('#credit').textContent=creditText();$('#when').textContent=whenStr(c.at);$('#note').textContent=noteText();$('#plink').textContent=decodeURIComponent(c.url.replace('https://','')).replace(/&(r|p)=.*/,'');
  $('#out').hidden=false;
  loadQr().then(m=>{$('#pqr').innerHTML=m?qrSvg(m):'';}).catch(()=>{});
  preview();}
function preview(){draw(1080,1350).then(cv=>{cv.toBlob(b=>{if(!b)return;const p=$('#prev');if(p._u)URL.revokeObjectURL(p._u);p._u=URL.createObjectURL(b);p.src=p._u;},'image/png');}).catch(()=>{});}
/* ⚖️ הבהרה (חוק הגנת הצרכן — פרסומת השוואתית לא מטעה): מאיפה המחירים, מאיזה תאריך, ושהמחיר בקופה קובע */
const noteText=()=>'המחירים מקבצי שקיפות המחירים שהרשתות מפרסמות לפי חוק, מעודכנים ל-'+dateStr(cur.updated)+', לפי מחיר המדף הרגיל, בלי מבצעים. רק חנויות שיש בהן את כל הסל. ייתכנו שינויים — המחיר בקופה הוא הקובע.';

/* ---------- 🔳 QR (ספריית ZXing שכבר באתר) ---------- */
let zx=null;
function loadQr(){if(!cur)return Promise.resolve(null);
  const make=()=>{const Z=window.ZXing,h=new Map();h.set(Z.EncodeHintType.ERROR_CORRECTION,Z.QRCodeDecoderErrorCorrectionLevel.M);h.set(Z.EncodeHintType.MARGIN,2);
    return new Z.QRCodeWriter().encode(cur.url,Z.BarcodeFormat.QR_CODE,0,0,h);};
  if(window.ZXing)return Promise.resolve(make());
  zx=zx||new Promise((ok,bad)=>{const s=document.createElement('script');s.src='/vendor/zxing-library-0.21.3.min.js';s.onload=ok;s.onerror=bad;document.head.appendChild(s);});
  return zx.then(make);}
function qrSvg(m){const w=m.getWidth();let d='';for(let y=0;y<w;y++)for(let x=0;x<w;x++)if(m.get(x,y))d+='M'+x+' '+y+'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+w+'" shape-rendering="crispEdges" role="img" aria-label="קוד QR לדף"><rect width="'+w+'" height="'+w+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';}

/* ---------- 🖼️ התמונה ---------- */
const img=src=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src;});
async function draw(W,H){const c=cur,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
  try{await Promise.all(['800 60px Rubik','500 30px Rubik'].map(f=>document.fonts.load(f,'אבג₪')));}catch(e){}
  const F=(w,s)=>w+' '+s+'px Rubik, Heebo, Arial, sans-serif',R=W-64,tall=H>1500;
  x.direction='rtl';x.textAlign='right';x.textBaseline='alphabetic';
  /* רקע */
  const bg=x.createLinearGradient(0,0,0,H);const hc=hex();bg.addColorStop(0,hc);bg.addColorStop(1,shade(hc,.62));x.fillStyle=bg;x.fillRect(0,0,W,H);
  /* כותרת */
  const logo=await img('/logo.png');let y=tall?150:86;
  if(logo){x.save();x.beginPath();x.arc(R-36,y-22,36,0,Math.PI*2);x.clip();x.drawImage(logo,R-72,y-58,72,72);x.restore();}
  x.fillStyle='#fff';x.font=F(700,34);x.fillText('ים שופינג · רשימת קניות',R-90,y-10);
  y+=tall?120:84;x.fillStyle='#ffd166';x.font=F(800,tall?78:70);fit(x,title(),W-128);x.fillText(title(),R,y);
  y+=tall?92:74;x.fillStyle='#fff';x.font=F(800,tall?66:58);x.fillText(clip(x,'ב'+c.city,W-128),R,y);
  y+=tall?64:50;x.fillStyle='#c9d6ea';x.font=F(500,30);x.fillText(clip(x,c.week+' · '+sub()+', אותו מוצר בכל חנות',W-128),R,y);
  /* כרטיס התוצאות */
  /* 🧺 רשימת המוצרים בקטן — רק למי שסימן "להראות בתמונה" */
  const withItems=$('#showItems').checked;let il=[];
  if(withItems){x.font=F(400,tall?24:21);const all=wrapLines(x,'בסל: '+BASKET.map(b=>b[0]).join(' · '),W-176),mx=tall?5:3;il=all.slice(0,mx);if(all.length>mx)il[mx-1]=clip(x,il[mx-1]+' …',W-176);}
  const ih=il.length?il.length*(tall?32:28)+18:0;
  /* הכרטיס צריך להיגמר לפני ה-QR: כשהרשימה ארוכה השורות מצטופפות קצת (לא פחות מ-84) */
  const qs=tall?260:200,qy=H-qs-(tall?300:150),extra=(c.gap>=1?96:24)+24+ih;
  y+=tall?56:32;const rows=c.top.length,rh=Math.max(76,Math.min(tall?132:100,Math.floor((qy-40-y-extra)/rows))),cardH=rows*rh+extra;
  x.fillStyle='#fffdf7';round(x,48,y,W-96,cardH,28);x.fill();
  let ry=y+24;const MED=['#c9a227','#9aa3ad','#b0743a'];
  c.top.forEach((s,i)=>{const cy=ry+rh/2;
    if(i){x.fillStyle='#e3ddcf';x.fillRect(80,ry,W-160,2);}
    x.fillStyle=i<3?MED[i]:'#d9d3c4';x.beginPath();x.arc(R-44,cy,30,0,Math.PI*2);x.fill();
    x.fillStyle=i<3?'#fff':'#23231f';x.textAlign='center';x.font=F(800,32);x.fillText(String(i+1),R-44,cy+11);x.textAlign='right';
    x.fillStyle='#23231f';x.font=F(800,i?40:46);x.fillText(clip(x,s.chain_name,W-520),R-96,cy-(tall?6:4));
    x.fillStyle='#5f5f55';x.font=F(400,26);x.fillText(clip(x,[s.name,s.address].filter(Boolean).join(' · '),W-520),R-96,cy+34);
    x.textAlign='left';x.fillStyle=i?hc:'#2f6b3a';x.font=F(800,i?46:54);x.fillText(money(s.total),96,cy+16);x.textAlign='right';
    ry+=rh;});
  if(c.gap>=1){x.fillStyle='rgba(47,107,58,.12)';round(x,80,ry+8,W-160,72,16);x.fill();x.fillStyle='#2f6b3a';x.font=F(700,32);x.textAlign='center';
    x.fillText(clip(x,'פער של עד '+money(c.gap)+' על אותו סל בדיוק',W-200),W/2,ry+56);x.textAlign='right';ry+=72;}
  if(il.length){x.fillStyle='#5f5f55';x.font=F(400,tall?24:21);il.forEach((l,i)=>x.fillText(l,R-24,ry+(tall?40:34)+i*(tall?32:28)));}
  /* QR וקישור — הריבוע הלבן תמיד באותו גודל ובאותו מקום, וה-QR באמצע שלו (קישור עם סל שלי ארוך יותר, וה-QR יוצא צפוף יותר) */
  let m=null;try{m=await loadQr();}catch(e){m=null;}
  const bx=64,by=qy-12,bs=qs+24;
  /* כל ה-QR ממלא את הריבוע (גם כשיש בו הרבה נקודות); כל נקודה מעוגלת לפיקסלים שלמים כדי שלא יהיו רווחים */
  if(m){const w=m.getWidth(),k=qs/w,P=v=>Math.round(bx+12+v*k),Q=v=>Math.round(by+12+v*k);x.fillStyle='#fff';round(x,bx,by,bs,bs,16);x.fill();x.fillStyle='#000';
    for(let a=0;a<w;a++)for(let b=0;b<w;b++)if(m.get(b,a))x.fillRect(P(b),Q(a),P(b+1)-P(b),Q(a+1)-Q(a));}
  /* הטקסט ליד ה-QR: מימין, ברוחב שנשאר, מתחיל בגובה של הריבוע */
  const cw=R-(bx+bs+32),L=tall?[46,58,58,52,36]:[42,50,50,46,34];let ty=by+L[0];
  x.fillStyle='#fff';x.font=F(800,tall?40:36);x.fillText(clip(x,'הסל של העיר שלכם?',cw),R,ty);ty+=L[1];
  x.fillStyle='#ffd166';x.font=F(700,tall?34:30);x.fillText('סורקים או נכנסים:',R,ty);ty+=L[2];
  x.fillStyle='#fff';x.font=F(700,tall?36:34);x.direction='ltr';x.textAlign='right';x.fillText('yamshopping.com',R,ty);x.direction='rtl';ty+=L[3];
  /* ✍️ נוצר ע״י ים שופינג + מי עשה את ההשוואה + פרו — שוברים שורה רק בין החלקים, לא באמצע שם */
  x.fillStyle='#ffd166';x.font=F(700,tall?26:24);segLines(x,creditText().split(' · '),cw).slice(0,2).forEach(l=>{x.fillText(l,R,ty);ty+=L[4];});
  x.fillStyle='#fff';x.font=F(500,tall?26:24);x.fillText(clip(x,'🕐 '+whenStr(c.at),cw),R,ty);
  /* הבהרה */
  x.fillStyle='#9fb0c8';x.font=F(400,22);wrap(x,'מחירי '+dateStr(c.updated)+' מקבצי שקיפות המחירים של הרשתות, מחיר מדף רגיל בלי מבצעים. רק חנויות שיש בהן את כל הסל. המחיר בקופה קובע.',R,H-(tall?110:58),W-128,30);
  return cv;}
function round(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
function clip(x,t,max){t=String(t||'');if(x.measureText(t).width<=max)return t;while(t.length>1&&x.measureText(t+'…').width>max)t=t.slice(0,-1);return t+'…';}
function fit(x,t,max){let s=parseInt(x.font.match(/(\d+)px/)[1],10);while(s>24&&x.measureText(t).width>max){s-=2;x.font=x.font.replace(/\d+px/,s+'px');}}
function wrapLines(x,t,max){const w=t.split(' ');let line='';const lines=[];for(const p of w){const tt=line?line+' '+p:p;if(x.measureText(tt).width>max&&line){lines.push(line);line=p;}else line=tt;}lines.push(line);return lines;}
function segLines(x,segs,max){const out=[];let line='';for(const g of segs){const t=line?line+' · '+g:g;if(line&&x.measureText(t).width>max){out.push(line);line=g;}else line=t;}if(line)out.push(line);return out.map(l=>clip(x,l,max));}
function wrap(x,t,r,y0,max,lh){wrapLines(x,t,max).forEach((l,i)=>x.fillText(l,r,y0+i*lh));}

/* ---------- 📤 שיתוף והורדה ---------- */
const fileName=(tag)=>'sal-zol-'+cur.city.replace(/[^֐-׿a-zA-Z0-9]+/g,'-')+'-'+tag+'.png';
const shareText=()=>'🛒 '+title()+' ב'+cur.city+': '+cur.top[0].chain_name+' — '+money(cur.top[0].total)+' ל-'+sub()+'.\nלהשוואה המלאה: '+cur.url;
const blobOf=cv=>new Promise(ok=>cv.toBlob(ok,'image/png'));
async function download(W,H,tag,quiet){if(!quiet)log(tag);const b=await blobOf(await draw(W,H));if(!b)return;const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fileName(tag);
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),60000);
  $('#st').textContent='✅ התמונה נשמרה בהורדות — אפשר לצרף אותה בוואטסאפ.';}
async function share(){const b=await blobOf(await draw(1080,1350));const f=b&&new File([b],fileName('post'),{type:'image/png'});
  try{if(f&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:shareText()});log('share');return;}}catch(e){if(e&&e.name==='AbortError')return;}
  /* באפליקציה (WebView) ובמחשב אין שיתוף תמונה — שומרים את התמונה ושולחים את הטקסט עם הקישור */
  await download(1080,1350,'post',true);
  if(window.YamApp&&typeof window.YamApp.shareText==='function'){log('app');try{window.YamApp.shareText(shareText());}catch(e){}}
  else{log('wa');window.open('https://wa.me/?text='+encodeURIComponent(shareText()),'_blank','noopener');}}

/* ---------- ✏️ שינוי המוצרים (נשמר אצל המשתמש בלבד) ---------- */
let draft=[];
function drawEd(){$('#edList').innerHTML=draft.map((b,i)=>'<li><span>'+esc(b[0])+'</span><button type="button" class="x" data-del="'+i+'" aria-label="להוריד את '+esc(b[0])+'">✕</button></li>').join('');
  $('#edN').textContent=draft.length+' מוצרים'+(draft.length<SP.MIN?' — צריך לפחות '+SP.MIN:draft.length>=SP.MAX?' (המקסימום)':'');$('#edSave').disabled=draft.length<SP.MIN;}
function savedMine(){try{return SP.clean(JSON.parse(ls.get(MINE)||'[]'));}catch(e){return [];}}
/* "אני בוחר את המוצרים": מתחילים מהסל שלי אם שמרתי, אחרת מהסל של האתר */
$('#srcMine').onclick=()=>{const m=savedMine();draft=(custom?BASKET:m.length>=SP.MIN?m:BASKET).slice();$('#ed').hidden=false;
  $('#srcMine').setAttribute('aria-pressed','true');$('#srcSite').setAttribute('aria-pressed','false');drawEd();$('#edQ').focus();};
/* "הסל של האתר": הסל שלי נשאר שמור לפעם הבאה */
$('#srcSite').onclick=async()=>{$('#ed').hidden=true;if(!custom){drawSrc();return;}ls.set(USE,'site');dropP();await loadBasket();drawSrc();if($('#city').value.trim())run($('#city').value);};
$('#edList').onclick=e=>{const b=e.target.closest('[data-del]');if(!b)return;draft.splice(+b.dataset.del,1);drawEd();};
let edT=0;$('#edQ').oninput=()=>{clearTimeout(edT);const q=$('#edQ').value.trim();if(q.length<2){$('#edRes').innerHTML='';return;}
  edT=setTimeout(async()=>{try{const r=await fetch(API+'/products?'+new URLSearchParams({q,limit:'8'}));const d=r.ok?await r.json():[];if($('#edQ').value.trim()!==q)return;
    $('#edRes').innerHTML=d.length?d.map(p=>'<li><button type="button" data-add="'+esc(p.code)+'" data-n="'+esc(SP.label(p))+'"'+(draft.some(b=>b[1]===p.code)||!SP.ok(p)?' disabled':'')+'>➕ '+esc(SP.label(p))+'<br><small>'+esc(SP.badge(p))+'</small></button></li>').join(''):'<li class="muted">לא נמצא מוצר</li>';}catch(e){$('#edRes').innerHTML='<li class="muted">החיפוש לא זמין כרגע</li>';}},300);};
$('#edRes').onclick=e=>{const b=e.target.closest('[data-add]');if(!b||draft.length>=SP.MAX)return;draft.push([b.dataset.n.slice(0,60),b.dataset.add]);b.disabled=true;drawEd();};
$('#edSave').onclick=()=>{BASKET=draft.slice();custom=true;ls.set(MINE,JSON.stringify(BASKET));ls.set(USE,null);dropP();$('#ed').hidden=true;drawSrc();run($('#city').value);};
$('#edCancel').onclick=()=>{$('#ed').hidden=true;drawSrc();};
function dropP(){const u=new URL(location.href);u.searchParams.delete('p');history.replaceState(null,'',u.pathname+u.search);}
/* 🧺 להראות בתמונה את רשימת המוצרים — נזכר אצל המשתמש */
$('#showItems').checked=ls.get(SHOWI)==='1';$('#showItems').onchange=()=>{ls.set(SHOWI,$('#showItems').checked?'1':null);if(cur)preview();};

$('#pick').addEventListener('submit',e=>{e.preventDefault();run($('#city').value);});
$('#share').onclick=()=>{if(cur)share();};
$('#dlPost').onclick=()=>{if(cur)download(1080,1350,'post');};
$('#dlStatus').onclick=()=>{if(cur)download(1080,1920,'status');};
$('#print').onclick=()=>window.print();
/* בהדפסה — גם רשימת המוצרים שבסל (גם כשמדפיסים מתפריט הדפדפן) */
addEventListener('beforeprint',()=>{$('#det').open=true;if(cur)log('print');});
const first=new URLSearchParams(location.search).get('city')||store.get();
if(first){$('#city').value=first;run(first);}
window.__sal={draw,get basket(){return BASKET;},get cur(){return cur;},get pro(){return pro;},proReady,creditText}; /* לבדיקות (tests/smoke.mjs) */
})();
