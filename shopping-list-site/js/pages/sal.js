/* 📣 הסל הזול השבוע בעיר (sal-zol-hashavua.html) — נובמבר 2026.
   סל קבוע של 12 מוצרים מוכרים, לפי ברקוד — אותו מוצר בדיוק בכל חנות, כדי שההשוואה תהיה הוגנת.
   נבחרו המוצרים שנמכרים כמעט בכל הרשתות (כ-72% מהסניפים מוכרים את כל ה-12). משווים רק חנויות שיש בהן את כל הסל.
   המחירים: שרת המחירים (/api/prices/compare), חנויות פיזיות בעיר בלבד, לפי מחיר המדף הרגיל — בלי מבצעים.
   מבצעים לא נכנסים כי רבים מהם מותנים ("קופון חלב ב-1 ₪", "למצטרפים", "4 ב-18") ואז הסל נראה זול ממה שבאמת משלמים.
   כל שבוע התמונה "מתחדשת" לבד — היא מחושבת מהמחירים של היום, עם הפרשה של השבת הקרובה.
   יוצא: תמונה לקבוצה (1080×1350), תמונה לסטטוס (1080×1920), ודף להדפסה (A4, עם QR). בתמונות אין דמויות — רק טקסט ולוגו. */
(function(){
'use strict';
const API='/api/prices',SITE='https://www.yamshopping.com/sal-zol-hashavua.html',KEY='yam_sal_city';
const BASKET=[
  ['חלב 3% בקרטון 1 ליטר','7290004131074'],
  ['קוטג׳ 5% 250 גרם','7290011194246'],
  ['גבינה לבנה 5% 500 גרם','7290002824183'],
  ['שמנת חמוצה 15% 200 מ״ל','7290000041858'],
  ['ספגטי 500 גרם','7290000060880'],
  ['אורז פרסי 1 ק״ג','7290000211442'],
  ['קפה נמס 200 גרם','7290000176420'],
  ['מיונז 500 גרם','7290000111186'],
  ['מים מינרליים 6×1.5 ליטר','7290019056973'],
  ['קורנפלקס 850 גרם','7290112494351'],
  ['שקדי מרק 400 גרם','7290000063140'],
  ['שוקולד חלב 100 גרם','7290008750677']];
/* סניפי משלוחים בלבד ("מרלוג אינטרנט", "און ליין") — לא חנות שנכנסים אליה */
const ONLINE=/אינטרנט|אונליין|און ליין|משלוח|online|וולט/i;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₪'+(Math.round(n*100)/100).toFixed(2).replace(/\.00$/,'');
const store={get(){try{return localStorage.getItem(KEY)||'';}catch(e){return '';}},set(v){try{localStorage.setItem(KEY,v);}catch(e){}}};
let cur=null; /* {city, top:[...], gap, week, updated, url} */

/* ---------- 📅 השבוע: פרשת השבת הקרובה (js/089-hcal.js) ---------- */
function weekLabel(){try{const H=window.Hcal,rd=H.rdOf(new Date()),sat=rd+((6-H.dow(rd))+7)%7,p=H.parshaName(H.parshaNums(sat,true));
  if(p)return 'שבוע פרשת '+p;const ev=(H.events(sat,true)||[]).find(e=>e.k==='chag'||e.k==='cm');return ev?'שבוע '+ev.base:'השבוע';}catch(e){return 'השבוע';}}
const dateStr=d=>d.getDate()+'.'+(d.getMonth()+1)+'.'+d.getFullYear();

/* ---------- 🏙️ ערים ---------- */
fetch('/cities-il.json').then(r=>r.json()).then(list=>{const dl=$('#cities');dl.innerHTML=list.map(c=>'<option value="'+esc(c)+'">').join('');}).catch(()=>{});

/* ---------- 🛒 החישוב ---------- */
async function run(city){
  city=String(city||'').trim().slice(0,40);if(!city){$('#st').textContent='כותבים שם של עיר';return;}
  store.set(city);const u=new URL(location.href);u.searchParams.set('city',city);history.replaceState(null,'',u.pathname+u.search);
  $('#st').textContent='⏳ בודקים את המחירים ב'+city+'...';$('#out').hidden=true;$('#go').disabled=true;
  try{
    /* בעיר גדולה יש יותר מ-60 סניפים (ירושלים ~150), וההשוואה בשרת מוגבלת ל-60 — אז קודם כל הסניפים בעיר, ואז השוואה בחלקים */
    const json=u=>fetch(API+u).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();});
    const h=json('/health').catch(()=>({}));
    const keys=(await json('/stores?'+new URLSearchParams({city,limit:'200'}))).filter(s=>!ONLINE.test(s.name||'')).map(s=>s.store);
    const items=BASKET.map(b=>b[0]+'#'+b[1]).join('|'),parts=[];for(let i=0;i<keys.length;i+=50)parts.push(keys.slice(i,i+50));
    const got=await Promise.all(parts.map(k=>json('/compare?'+new URLSearchParams({items,stores:k.join(','),limit:'60'}))));
    const full=got.flatMap(d=>d.stores||[]).filter(s=>s.found===BASKET.length&&s.regular>0&&!s.online).map(s=>({...s,total:s.regular})).sort((a,b)=>a.total-b.total);
    /* הסניף הכי זול מכל רשת — כדי שלא יופיעו חמישה סניפים של אותה רשת */
    const seen=new Set(),top=[];for(const s of full){const k=s.chain_name||s.chain;if(seen.has(k))continue;seen.add(k);top.push(s);if(top.length===5)break;}
    if(top.length<2){$('#st').innerHTML='😕 לא מצאנו ב'+esc(city)+' לפחות שתי רשתות שיש בהן את כל 12 המוצרים של הסל. אפשר לנסות עיר קרובה גדולה יותר.';return;}
    const hh=await h,updated=hh&&hh.updated?new Date(hh.updated*1000):new Date();
    cur={city,top,gap:full[full.length-1].total-full[0].total,branches:full.length,week:weekLabel(),updated,url:SITE+'?city='+encodeURIComponent(city)};
    show();$('#st').textContent='';
  }catch(e){console.warn('sal',e);$('#st').textContent='⚠️ שרת המחירים לא ענה כרגע. נסו שוב בעוד כמה דקות.';}
  finally{$('#go').disabled=false;}}

function show(){const c=cur,MED=['🥇','🥈','🥉','4','5'];
  $('#h1').textContent='הסל הזול השבוע ב'+c.city;
  $('#lead').textContent=c.week+' · 12 מוצרים מוכרים, אותו מוצר בדיוק בכל חנות';
  $('#res').innerHTML=c.top.map((s,i)=>'<li'+(i?'':' class="first"')+'><span class="n" aria-hidden="true">'+MED[i]+'</span><div class="w"><div class="c">'+esc(s.chain_name)+'</div><div class="a">'+esc([s.name,s.address].filter(Boolean).join(' · '))+'</div></div><span class="t">'+money(s.total)+'</span></li>').join('');
  const g=$('#gap');g.hidden=!(c.gap>=1);g.textContent='באותו סל בדיוק — פער של עד '+money(c.gap)+' בין החנויות ב'+c.city+' ('+c.branches+' סניפים נבדקו)';
  $('#items').innerHTML=BASKET.map(b=>'<li>'+esc(b[0])+'</li>').join('');
  $('#note').textContent=noteText();$('#plink').textContent=decodeURIComponent(c.url.replace('https://',''));
  $('#out').hidden=false;
  loadQr().then(m=>{$('#pqr').innerHTML=m?qrSvg(m):'';}).catch(()=>{});
  draw(1080,1350).then(cv=>{cv.toBlob(b=>{if(!b)return;const p=$('#prev');if(p._u)URL.revokeObjectURL(p._u);p._u=URL.createObjectURL(b);p.src=p._u;},'image/png');}).catch(()=>{});}
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
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1e3a5f');bg.addColorStop(1,'#13203a');x.fillStyle=bg;x.fillRect(0,0,W,H);
  /* כותרת */
  const logo=await img('/logo.png');let y=tall?150:86;
  if(logo){x.save();x.beginPath();x.arc(R-36,y-22,36,0,Math.PI*2);x.clip();x.drawImage(logo,R-72,y-58,72,72);x.restore();}
  x.fillStyle='#fff';x.font=F(700,34);x.fillText('ים שופינג · רשימת קניות',R-90,y-10);
  y+=tall?120:84;x.fillStyle='#ffd166';x.font=F(800,tall?78:70);fit(x,'הסל הזול השבוע',W-128);x.fillText('הסל הזול השבוע',R,y);
  y+=tall?92:74;x.fillStyle='#fff';x.font=F(800,tall?66:58);x.fillText(clip(x,'ב'+c.city,W-128),R,y);
  y+=tall?64:50;x.fillStyle='#c9d6ea';x.font=F(500,30);x.fillText(c.week+' · 12 מוצרים, אותו מוצר בכל חנות',R,y);
  /* כרטיס התוצאות */
  y+=tall?56:32;const rows=c.top.length,rh=tall?132:100,cardH=rows*rh+(c.gap>=1?96:24)+24;
  x.fillStyle='#fffdf7';round(x,48,y,W-96,cardH,28);x.fill();
  let ry=y+24;const MED=['#c9a227','#9aa3ad','#b0743a'];
  c.top.forEach((s,i)=>{const cy=ry+rh/2;
    if(i){x.fillStyle='#e3ddcf';x.fillRect(80,ry,W-160,2);}
    x.fillStyle=i<3?MED[i]:'#d9d3c4';x.beginPath();x.arc(R-44,cy,30,0,Math.PI*2);x.fill();
    x.fillStyle=i<3?'#fff':'#23231f';x.textAlign='center';x.font=F(800,32);x.fillText(String(i+1),R-44,cy+11);x.textAlign='right';
    x.fillStyle='#23231f';x.font=F(800,i?40:46);x.fillText(clip(x,s.chain_name,W-520),R-96,cy-(tall?6:4));
    x.fillStyle='#5f5f55';x.font=F(400,26);x.fillText(clip(x,[s.name,s.address].filter(Boolean).join(' · '),W-520),R-96,cy+34);
    x.textAlign='left';x.fillStyle=i?'#1e3a5f':'#2f6b3a';x.font=F(800,i?46:54);x.fillText(money(s.total),96,cy+16);x.textAlign='right';
    ry+=rh;});
  if(c.gap>=1){x.fillStyle='rgba(47,107,58,.12)';round(x,80,ry+8,W-160,72,16);x.fill();x.fillStyle='#2f6b3a';x.font=F(700,32);x.textAlign='center';
    x.fillText(clip(x,'פער של עד '+money(c.gap)+' על אותו סל בדיוק',W-200),W/2,ry+56);x.textAlign='right';}
  /* QR וקישור */
  const qs=tall?260:200,qy=H-qs-(tall?300:120);let m=null;try{m=await loadQr();}catch(e){m=null;}
  if(m){const w=m.getWidth(),k=Math.floor(qs/w),sz=k*w;x.fillStyle='#fff';round(x,64,qy-12,sz+24,sz+24,16);x.fill();x.fillStyle='#000';
    for(let a=0;a<w;a++)for(let b=0;b<w;b++)if(m.get(b,a))x.fillRect(76+b*k,qy+a*k,k,k);}
  x.fillStyle='#fff';x.font=F(800,40);x.fillText('הסל של העיר שלכם?',R,qy+52);
  x.fillStyle='#ffd166';x.font=F(700,34);x.fillText('סורקים או נכנסים:',R,qy+104);
  x.fillStyle='#fff';x.font=F(700,36);x.direction='ltr';x.textAlign='right';x.fillText('yamshopping.com',R,qy+156);x.direction='rtl';
  /* הבהרה */
  x.fillStyle='#9fb0c8';x.font=F(400,22);wrap(x,'מחירי '+dateStr(c.updated)+' מקבצי שקיפות המחירים של הרשתות, מחיר מדף רגיל בלי מבצעים. רק חנויות שיש בהן את כל הסל. המחיר בקופה קובע.',R,H-(tall?110:64),W-128,30);
  return cv;}
function round(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
function clip(x,t,max){t=String(t||'');if(x.measureText(t).width<=max)return t;while(t.length>1&&x.measureText(t+'…').width>max)t=t.slice(0,-1);return t+'…';}
function fit(x,t,max){let s=parseInt(x.font.match(/(\d+)px/)[1],10);while(s>24&&x.measureText(t).width>max){s-=2;x.font=x.font.replace(/\d+px/,s+'px');}}
function wrap(x,t,r,y0,max,lh){const w=t.split(' ');let line='';const lines=[];for(const p of w){const tt=line?line+' '+p:p;if(x.measureText(tt).width>max&&line){lines.push(line);line=p;}else line=tt;}lines.push(line);
  lines.forEach((l,i)=>x.fillText(l,r,y0+i*lh));}

/* ---------- 📤 שיתוף והורדה ---------- */
const fileName=(tag)=>'sal-zol-'+cur.city.replace(/[^֐-׿a-zA-Z0-9]+/g,'-')+'-'+tag+'.png';
const shareText=()=>'🛒 הסל הזול השבוע ב'+cur.city+': '+cur.top[0].chain_name+' — '+money(cur.top[0].total)+' ל-12 מוצרים מוכרים.\nלהשוואה המלאה: '+cur.url;
const blobOf=cv=>new Promise(ok=>cv.toBlob(ok,'image/png'));
async function download(W,H,tag){const b=await blobOf(await draw(W,H));if(!b)return;const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fileName(tag);
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),60000);
  $('#st').textContent='✅ התמונה נשמרה בהורדות — אפשר לצרף אותה בוואטסאפ.';}
async function share(){const b=await blobOf(await draw(1080,1350));const f=b&&new File([b],fileName('post'),{type:'image/png'});
  try{if(f&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:shareText()});return;}}catch(e){if(e&&e.name==='AbortError')return;}
  /* באפליקציה (WebView) ובמחשב אין שיתוף תמונה — שומרים את התמונה ושולחים את הטקסט עם הקישור */
  await download(1080,1350,'post');
  if(window.YamApp&&typeof window.YamApp.shareText==='function'){try{window.YamApp.shareText(shareText());}catch(e){}}
  else window.open('https://wa.me/?text='+encodeURIComponent(shareText()),'_blank','noopener');}

$('#pick').addEventListener('submit',e=>{e.preventDefault();run($('#city').value);});
$('#share').onclick=()=>{if(cur)share();};
$('#dlPost').onclick=()=>{if(cur)download(1080,1350,'post');};
$('#dlStatus').onclick=()=>{if(cur)download(1080,1920,'status');};
$('#print').onclick=()=>window.print();
/* בהדפסה — גם רשימת המוצרים שבסל (גם כשמדפיסים מתפריט הדפדפן) */
addEventListener('beforeprint',()=>{$('#det').open=true;});
const first=new URLSearchParams(location.search).get('city')||store.get();
if(first){$('#city').value=first;run(first);}
window.__sal={draw,BASKET,get cur(){return cur;}}; /* לבדיקות (tests/smoke.mjs) */
})();
