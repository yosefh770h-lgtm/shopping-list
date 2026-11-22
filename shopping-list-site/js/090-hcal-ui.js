/* 📅 הלוח העברי — באתר, באפליקציה הרגילה ובאפליקציה האופליין (אותו קוד בכולם):
   כרטיס מעל הרשימה (תאריך עברי, פרשה, דף יומי, הדלקת נרות, חג) ובלחיצה — זמני היום לפי עיר.
   החישובים ב-js/089-hcal.js (שלנו, בלי ספריות ובלי אינטרנט). העיר והדקות של הדלקת הנרות נשמרים במכשיר (yam_hcal). */
(function(){
if(!window.Hcal)return;
const {fromRd,rdOf,dow,gem,hdStr,hdStrEn,mName,mNameEn,parshaNums,parshaName,parshaEn,events,zmanim,CITIES,DAYS,daf}=Hcal;
const OFF=typeof OFF_APP!=='undefined'&&OFF_APP,EN=()=>typeof prefs!=='undefined'&&prefs.lang==='en';
const tt=(he,en)=>typeof T==='function'?T(he,en):he;
const DAYS_EN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Shabbat'];
const LS='yam_hcal',GEO='__geo',$h=s=>document.querySelector(s),e$=s=>typeof esc==='function'?esc(s):String(s);

/* ---------- העיר: מה שנבחר כאן ← המיקום המדויק (אם ביקשו) ← "העיר שלי" באתר ← ירושלים ---------- */
const raw=()=>{try{return JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){return {};}};
const setPref=o=>{try{localStorage.setItem(LS,JSON.stringify(Object.assign(raw(),o)));}catch(e){}};
function geoCity(){const g=!OFF&&typeof state!=='undefined'&&state.geo;if(!g||!g.lat)return null;
  const near=CITIES.slice().sort((a,b)=>Math.hypot(a.lat-g.lat,a.lon-g.lng)-Math.hypot(b.lat-g.lat,b.lon-g.lng))[0];
  return {name:g.city||tt('המיקום שלי','My location'),lat:g.lat,lon:g.lng,tz:near.tz,il:near.il,candle:near.candle,geo:1};}
function pref(){const p=raw();let c=null;
  if(p.city===GEO)c=geoCity();
  if(!c)c=CITIES.find(x=>x.name===p.city);
  if(!c&&!p.city&&!OFF&&typeof userCity==='function'){try{const u=userCity().replace(/[׳']/g,'\'').replace('קרית','קריית');c=CITIES.find(x=>x.name===u);}catch(e){}}
  c=c||CITIES[0];return {city:c,candle:p.candle>0?+p.candle:c.candle};}

const hm=(d,tz)=>{if(!d)return '—';try{return d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:tz});}catch(e){return d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit',hour12:false});}};
const dayName=r=>EN()?DAYS_EN[dow(r)]:DAYS[dow(r)];
const hDate=h=>EN()?hdStrEn(h):hdStr(h);
const evName=e=>EN()?e.en:e.he;
/* היום העברי מתחלף בשקיעה: אחרי השקיעה מציגים את התאריך של מחר ("אור ל...") */
function today(){const p=pref(),now=new Date(),rd=rdOf(now),z=zmanim(rd,p.city),night=!!(z&&z.set&&now>z.set);return {p,now,rd,hrd:night?rd+1:rd,night,z};}
const shabbatOf=rd=>rd+((6-dow(rd))+7)%7;
function parsha(sh,il){const pn=parshaNums(sh,il);if(pn&&pn.length)return tt('פרשת ','Parashat ')+(EN()?parshaEn(pn):parshaName(pn));
  return tt('שבת: ','Shabbat: ')+((events(sh,il)[0]||{})[EN()?'en':'he']||tt('חג','holiday'));}
function candles(t){const sh=shabbatOf(t.rd),zf=zmanim(sh-1,t.p.city);return zf&&zf.set?new Date(zf.set.getTime()-t.p.candle*6e4):null;}
const dayPfx=t=>t.night?tt('אור ל','Eve of '):tt('יום ','');

/* ---------- הכרטיס מעל הרשימה ---------- */
function card(){const t=today(),c=t.p.city,h=fromRd(t.hrd),sh=shabbatOf(t.hrd);
  const ev=events(t.hrd,c.il).filter(e=>e.k!=='omer').map(evName);
  const cand=candles(t),showCand=dow(t.rd)>=4&&dow(t.rd)<=5&&cand&&t.now<cand;
  return '<span class="hcico" aria-hidden="true"><b>'+gem(h.d)+'</b><small>'+e$(EN()?mNameEn(h.y,h.m):mName(h.y,h.m))+'</small></span>'+
    '<span class="hcmain"><span class="hct"><b>'+e$(hDate(h))+'</b><span class="hcd">'+e$(dayPfx(t)+dayName(t.hrd))+' · '+t.now.toLocaleDateString(EN()?'en-GB':'he-IL',{day:'numeric',month:'short'})+'</span></span>'+
    '<span class="hcchips">'+(ev.length?'<span class="hcc hcev">✨ '+e$(ev.join(' · '))+'</span>':'')+
      '<span class="hcc">📖 '+e$(parsha(sh,c.il))+'</span><span class="hcc">📚 '+e$(daf(t.now).replace(' דף ',' '))+'</span>'+
      (showCand?'<span class="hcc">🕯️ '+tt('נרות','Candles')+' <b dir="ltr">'+hm(cand,c.tz)+'</b></span>':'')+'</span></span>'+
    '<span class="hcgo" aria-hidden="true">‹</span>';}
function mount(){const pane=$h('#paneList');if(!pane)return;let b=pane.querySelector('.hcline');
  if(!b){const pill=pane.querySelector('.offpill');(pill||pane).insertAdjacentHTML(pill?'afterend':'afterbegin','<button class="hcline" type="button"></button>');b=pane.querySelector('.hcline');}
  const s=card();if(b.innerHTML!==s){b.innerHTML=s;b.setAttribute('aria-label',b.textContent.replace(/‹/g,'').trim());}}

/* ---------- המסך המלא: זמני היום, שבת הקרובה, מה בקרוב ---------- */
function sheet(){const t=today(),p=t.p,c=p.city,h=fromRd(t.hrd),tz=c.tz;
  /* אחרי השקיעה — כבר הזמנים של מחר (היום העברי הבא) */
  const zd=t.night?zmanim(t.rd+1,c):t.z,z=zd||{};
  const ev=events(t.hrd,c.il).map(evName);
  /* שבת הקרובה: הדלקת נרות ביום שישי, צאת השבת במוצאי שבת */
  const sh=shabbatOf(t.rd),zs=zmanim(sh,c),cand=candles(t);
  /* הזמן הבא של היום מודגש, ומה שעבר — באפור */
  const ROWS=[['עלות השחר','Dawn','alot','16.1°'],['משיכיר','Misheyakir','mish','11.5°'],['הנץ החמה','Sunrise','rise'],['סוף זמן ק"ש','Latest Shema','shmaMga','מג"א'],['סוף זמן ק"ש','Latest Shema','shma','גר"א'],
    ['סוף זמן תפילה','Latest Shacharit','tfMga','מג"א'],['סוף זמן תפילה','Latest Shacharit','tf','גר"א'],['חצות היום','Midday','chatzot'],['מנחה גדולה','Mincha Gedola','mg'],['מנחה קטנה','Mincha Ketana','mk'],
    ['פלג המנחה','Plag HaMincha','plag'],['שקיעה','Sunset','set'],['צאת הכוכבים','Nightfall','tzeit','8.5°']];
  const nx=ROWS.findIndex(r=>z[r[2]]&&z[r[2]]>t.now);
  const rows=ROWS.map((r,i)=>'<li class="'+(i===nx?'nx':z[r[2]]&&z[r[2]]<=t.now?'past':'')+'"><span>'+tt(r[0],r[1])+(r[3]?' <small>'+r[3]+'</small>':'')+(i===nx?' <em>'+tt('הבא','next')+'</em>':'')+'</span><b dir="ltr">'+hm(z[r[2]],tz)+'</b></li>').join('');
  /* החודש הקרוב: חגים וצומות */
  const up=[];for(let r=t.hrd+1;r<=t.hrd+30&&up.length<5;r++){const e=events(r,c.il).filter(x=>x.k!=='omer').map(evName);
    if(e.length){const hh=fromRd(r);up.push('<li><span class="hcdt"><b>'+(EN()?hh.d:gem(hh.d))+'</b>'+e$(EN()?mNameEn(hh.y,hh.m):mName(hh.y,hh.m))+'</span><span><b>'+e$(e.join(', '))+'</b><small>'+e$(dayName(r))+'</small></span></li>');}}
  const g=!OFF&&geoCity(),sel=raw().city===GEO&&g;
  const opts=(g?'<option value="'+GEO+'"'+(sel?' selected':'')+'>📍 '+e$(g.name)+'</option>':'')+CITIES.map(x=>'<option'+(!sel&&x.name===c.name?' selected':'')+'>'+e$(x.name)+'</option>').join('');
  const note=typeof ZMAN_NOTE!=='undefined'?ZMAN_NOTE:tt('⚠️ הזמנים מחושבים אוטומטית ונועדו לעזור בלבד — אין להסתמך עליהם להלכה. יש לבדוק בלוח מוסמך או לשאול רב.','⚠️ Times are computed automatically and are for convenience only.');
  const body='<div class="hcal">'+
    '<div class="hchero"><div class="hcbig">'+e$(dayPfx(t)+dayName(t.hrd))+', '+e$(hDate(h))+'</div>'+
      '<div class="hcsub">'+t.now.toLocaleDateString(EN()?'en-GB':'he-IL',{day:'numeric',month:'long',year:'numeric'})+(t.night?' · '+tt('אחרי השקיעה','after sunset'):'')+' · 📍 '+e$(c.name)+'</div>'+
      (ev.length?'<div class="hcevb">✨ '+e$(ev.join(' · '))+'</div>':'')+
      '<div class="hcrow"><span>📖 <b>'+e$(parsha(sh,c.il))+'</b></span><span>📚 '+tt('דף יומי','Daf Yomi')+': <b>'+e$(daf(t.now))+'</b></span></div></div>'+
    '<div class="hcshab"><div><small>🕯️ '+tt('הדלקת נרות','Candles')+'</small><b dir="ltr">'+hm(cand,tz)+'</b></div><div><small>✨ '+tt('צאת השבת','Shabbat ends')+'</small><b dir="ltr">'+hm(zs&&zs.tzeit,tz)+'</b></div><div><small>🌙 '+tt('ר"ת','Rabbeinu Tam')+'</small><b dir="ltr">'+hm(zs&&zs.rt,tz)+'</b></div></div>'+
    '<h3 class="hch">☀️ '+(t.night?tt('זמני מחר','Tomorrow\'s times'):tt('זמני היום','Today\'s times'))+' · '+e$(c.name)+'</h3>'+
    (zd?'<ul class="hczm">'+rows+'</ul>':'<p>'+tt('אין זריחה ושקיעה רגילים במקום הזה היום.','No regular sunrise/sunset here today.')+'</p>')+
    (up.length?'<h3 class="hch">🗓️ '+tt('בקרוב','Coming up')+'</h3><ul class="hcup">'+up.join('')+'</ul>':'')+
    '<div class="hcset"><label for="hcCity">📍 '+tt('עיר','City')+'<select id="hcCity">'+opts+'</select></label>'+
    '<label for="hcCand">🕯️ '+tt('נרות לפני השקיעה','Candles before sunset')+'<select id="hcCand">'+[18,20,22,30,40].map(n=>'<option value="'+n+'"'+(n===p.candle?' selected':'')+'>'+n+' '+tt('דק\'','min')+'</option>').join('')+'</select></label></div>'+
    (OFF?'':'<div class="hcbtns">'+(typeof exactLocation==='function'?'<button class="btn sec" id="hcGeo" type="button">📍 '+tt('לפי המיקום המדויק שלי','Use my exact location')+'</button>':'')+
      (typeof itimUrl==='function'?'<a class="btn sec" href="'+e$(itimUrl())+'" target="_blank" rel="noopener">📅 '+tt('לוח מלא — עיתים לבינה','Full calendar — Itim Labina')+'</a>':'')+'</div>')+
    '<p class="muted-note">'+(c.il?tt('פרשות ארץ ישראל','Israel parasha schedule'):tt('פרשות חוץ לארץ','Diaspora parasha schedule'))+' · '+tt('מחושב במכשיר, בגובה פני הים. שעות זמניות: גר"א מהנץ עד השקיעה, מג"א 72 דקות לפני ואחרי. יש לוחות שנוהגים אחרת — לדיוק בודקים בלוח של הקהילה.','Computed on your device at sea level. Some calendars differ — check your community calendar.')+'</p>'+
    '<p class="zmannote">'+note+'</p></div>';
  openSheet('📅 '+tt('לוח עברי וזמני היום','Jewish calendar & times'),body);}
function openZ(){sheet();}
window.openZmanim=openZ;{const mz=$h('#miZmanim');if(mz)mz.onclick=openZ;}
document.addEventListener('click',e=>{const x=e.target.closest&&e.target.closest('.hcline,#hcGeo');if(!x)return;e.preventDefault();
  if(x.id==='hcGeo'){exactLocation().then(g=>{if(g){setPref({city:GEO,candle:0});sheet();mount();}else if(typeof flash==='function')flash(tt('⚠️ לא קיבלתי מיקום — בדקו שהרשאת המיקום פתוחה','⚠️ No location permission'));});return;}
  sheet();},true);
document.addEventListener('change',e=>{const id=e.target&&e.target.id;if(id==='hcCity'){setPref({city:e.target.value,candle:0});sheet();mount();}
  else if(id==='hcCand'){setPref({candle:+e.target.value});sheet();mount();}});
const _r=render;render=function(){const r=_r.apply(this,arguments);try{mount();}catch(e){}return r;};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
setInterval(()=>{try{mount();}catch(e){}},60000); /* מתחלף לבד בשקיעה, בחצות ובשינוי של "הזמן הבא" */
document.head.insertAdjacentHTML('beforeend','<style id="hcal90">'+
  /* הכרטיס */
  '.hcline{display:flex;align-items:center;gap:9px;width:100%;text-align:start;border:1px solid var(--chipbr);background:var(--panel);color:var(--text);border-radius:14px;padding:6px 10px;margin:0 0 8px;font:inherit;cursor:pointer;box-shadow:0 1px 2px rgba(30,58,95,.06);transition:box-shadow .15s,transform .15s}'+
  '.hcline:hover{box-shadow:0 3px 10px rgba(30,58,95,.12)}.hcline:active{transform:scale(.99)}.hcline:focus-visible{outline:2px solid var(--pink);outline-offset:2px}'+
  '.hcico{flex:none;width:36px;height:36px;border-radius:10px;background:var(--pinkbg);color:#9c3358;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05}'+
  '.hcico b{font-size:14.5px}.hcico small{font-size:9.5px;font-weight:600;margin-top:1px}'+
  '.hcmain{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:3px 8px}.hct{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 6px;flex-basis:100%}.hct b{font-size:14px;color:var(--hdr2)}.hcd{font-size:12px;color:var(--muted)}'+
  '.hcchips{display:contents}.hcc{font-size:11.5px;line-height:1.25;background:var(--chat);border-radius:999px;padding:2px 7px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}'+
  '.hcc.hcev{background:var(--pinkbg);color:#9c3358;font-weight:600}.hcgo{flex:none;align-self:center;font-size:20px;line-height:1;color:var(--muted);white-space:nowrap}'+
  'body.dark .hct b{color:#e7e9ee}body.dark .hcico{color:#f6b6ca}body.dark .hcc.hcev{color:#f6b6ca}'+
  
  /* המסך המלא */
  '.hcal .hchero{background:linear-gradient(135deg,#1e3a5f,#2c5282);color:#fff;border-radius:16px;padding:14px 16px;margin:0 0 10px}'+
  '.hcal .hcbig{font-size:21px;font-weight:700;line-height:1.3}.hcal .hcsub{font-size:13px;opacity:.82;margin-top:2px}'+
  '.hcal .hcevb{display:inline-block;margin-top:8px;background:rgba(255,255,255,.16);border-radius:999px;padding:3px 10px;font-size:13px;font-weight:600}'+
  '.hcal .hcrow{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:10px;font-size:14px}'+
  '.hcal .hcshab{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 6px}.hcal .hcshab div{background:var(--panel);border:1px solid var(--chipbr);border-radius:14px;padding:9px 6px;text-align:center}'+
  '.hcal .hcshab small{display:block;font-size:12px;color:var(--muted)}.hcal .hcshab b{display:block;font-size:20px;font-variant-numeric:tabular-nums;margin-top:2px;color:var(--hdr2)}body.dark .hcal .hcshab b{color:#e7e9ee}'+
  '.hcal .hch{font-size:15px;margin:16px 2px 6px}'+
  '.hczm,.hcup{list-style:none;margin:0;padding:0;background:var(--panel);border:1px solid var(--chipbr);border-radius:14px;overflow:hidden}'+
  '.hczm li{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid var(--line);font-size:15px}.hczm li:first-child,.hcup li:first-child{border-top:0}'+
  '.hczm small{color:var(--muted);font-size:12px}.hczm b{font-variant-numeric:tabular-nums}.hczm li.past{color:var(--muted)}.hczm li.past b{font-weight:500}'+
  '.hczm li.nx{background:var(--pinkbg)}.hczm li.nx b{color:#9c3358;font-size:16px}.hczm em{font-style:normal;font-size:11px;font-weight:700;background:var(--pink);color:#fff;border-radius:999px;padding:1px 7px;margin-inline-start:4px;vertical-align:1px}'+
  'body.dark .hczm li.nx b{color:#f6b6ca}'+
  '.hcup li{display:flex;align-items:center;gap:10px;padding:8px 12px;border-top:1px solid var(--line)}'+
  '.hcup .hcdt{flex:none;width:52px;text-align:center;font-size:11px;color:var(--muted);line-height:1.15}.hcup .hcdt b{display:block;font-size:17px;color:var(--text)}'+
  '.hcup li>span:last-child{display:flex;flex-direction:column;font-size:14px}.hcup small{color:var(--muted);font-size:12px}'+
  '.hcset{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.hcset label{font-size:13px;color:var(--muted)}.hcal select{display:block;width:100%;margin-top:4px}'+
  '.hcbtns{display:grid;gap:8px;margin-top:10px}.hcbtns .btn{width:100%;text-align:center;text-decoration:none;display:block}'+
  '</style>');
})();
