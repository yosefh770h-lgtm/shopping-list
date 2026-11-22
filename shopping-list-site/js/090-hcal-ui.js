/* 📅 המסך של הלוח העברי באפליקציה האופליין: שורה מעל הרשימה (תאריך עברי, פרשה, חג) ובלחיצה — זמני היום לפי עיר.
   החישובים ב-js/089-hcal.js. העיר והדקות של הדלקת הנרות נשמרים בטלפון (yam_hcal). */
(function(){
if(typeof OFF_APP==='undefined'||!OFF_APP||!window.Hcal)return;
const {fromRd,rdOf,dow,gem,hdStr,mName,parshaNums,parshaName,events,zmanim,CITIES,DAYS,daf}=Hcal;

/* ---------- המסך (רק באפליקציה האופליין) ---------- */
const LS='yam_hcal',$h=s=>document.querySelector(s);
const pref=()=>{let p={};try{p=JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){}const c=CITIES.find(x=>x.name===p.city)||CITIES[0];
  return {city:c,candle:p.candle>0?+p.candle:c.candle};};
const setPref=o=>{try{localStorage.setItem(LS,JSON.stringify(Object.assign(JSON.parse(localStorage.getItem(LS)||'{}')||{},o)));}catch(e){}};
const hm=(d,tz)=>{if(!d)return '—';try{return d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:tz});}catch(e){return d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit',hour12:false});}};
/* היום העברי מתחלף בשקיעה: אחרי השקיעה מציגים את התאריך של מחר ("אור ל...") */
function today(){const p=pref(),now=new Date(),rd=rdOf(now),z=zmanim(rd,p.city),night=!!(z&&z.set&&now>z.set);return {p,now,rd,hrd:night?rd+1:rd,night,z};}
function shabbatOf(rd){return rd+((6-dow(rd))+7)%7;}
function line(){const t=today(),h=fromRd(t.hrd),sh=shabbatOf(t.hrd),pn=parshaNums(sh,t.p.city.il);
  const ev=(events(t.hrd,t.p.city.il).filter(e=>e.k!=='omer')[0]||{}).he;
  return (t.night?'אור ל':'יום ')+DAYS[dow(t.hrd)]+' · '+hdStr(h)+' · '+(pn&&pn.length?'פרשת '+parshaName(pn):'שבת: '+((events(sh,t.p.city.il)[0]||{}).he||'חג'))+(ev?' · '+ev:'')+' · דף יומי: '+daf(t.now);}
function sheet(){const t=today(),p=t.p,c=p.city,h=fromRd(t.hrd),z=t.z||{},tz=c.tz;
  const row=(l,d,n)=>'<tr><th>'+l+(n?' <small>'+n+'</small>':'')+'</th><td dir="ltr">'+hm(d,tz)+'</td></tr>';
  const ev=events(t.hrd,c.il).map(e=>e.he);
  /* שבת הקרובה: הדלקת נרות ביום שישי, צאת השבת במוצאי שבת */
  const sh=shabbatOf(t.rd),zf=zmanim(sh-1,c),zs=zmanim(sh,c),pn=parshaNums(sh,c.il);
  const cand=zf&&zf.set?new Date(zf.set.getTime()-p.candle*6e4):null;
  /* השבועיים הבאים: חגים וצומות */
  const up=[];for(let r=t.hrd+1;r<=t.hrd+30&&up.length<5;r++){const e=events(r,c.il).filter(x=>x.k!=='omer').map(x=>x.he);
    if(e.length)up.push('<li><b>'+DAYS[dow(r)]+' '+gem(fromRd(r).d)+' '+mName(fromRd(r).y,fromRd(r).m)+'</b> — '+e.join(', ')+'</li>');}
  const body='<div class="hcal">'+
    '<p class="hcbig">'+(t.night?'אור ל':'יום ')+DAYS[dow(t.hrd)]+', '+hdStr(h)+'</p>'+
    '<p class="muted-note">'+t.now.toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric'})+(t.night?' · אחרי השקיעה':'')+'</p>'+
    (ev.length?'<p class="hcev">'+ev.join(' · ')+'</p>':'')+
    '<div class="hcsh"><b>📖 '+(pn&&pn.length?'פרשת '+parshaName(pn):'שבת: '+((events(sh,c.il)[0]||{}).he||'חג'))+'</b>'+
      '<span>📚 דף יומי: <b>'+daf(t.now)+'</b></span><span>🕯️ הדלקת נרות: <b dir="ltr">'+hm(cand,tz)+'</b></span><span>✨ צאת השבת: <b dir="ltr">'+hm(zs&&zs.tzeit,tz)+'</b> · ר"ת <b dir="ltr">'+hm(zs&&zs.rt,tz)+'</b></span></div>'+
    '<h3 class="hch">☀️ זמני היום — '+c.name+'</h3>'+
    (t.z?'<table class="hczm">'+row('עלות השחר',z.alot,'16.1°')+row('משיכיר',z.mish,'11.5°')+row('הנץ החמה',z.rise)+row('סוף זמן ק"ש',z.shmaMga,'מג"א')+row('סוף זמן ק"ש',z.shma,'גר"א')+
      row('סוף זמן תפילה',z.tfMga,'מג"א')+row('סוף זמן תפילה',z.tf,'גר"א')+row('חצות היום',z.chatzot)+row('מנחה גדולה',z.mg)+row('מנחה קטנה',z.mk)+
      row('פלג המנחה',z.plag)+row('שקיעה',z.set)+row('צאת הכוכבים',z.tzeit,'8.5°')+'</table>':'<p>אין זריחה ושקיעה רגילים במקום הזה היום.</p>')+
    (up.length?'<h3 class="hch">🗓️ בקרוב</h3><ul class="hcup">'+up.join('')+'</ul>':'')+
    '<div class="row2"><label class="il" for="hcCity">📍 עיר<select id="hcCity">'+CITIES.map(x=>'<option'+(x===c?' selected':'')+'>'+x.name+'</option>').join('')+'</select></label>'+
    '<label class="il" for="hcCand">🕯️ נרות לפני השקיעה<select id="hcCand">'+[18,20,22,30,40].map(n=>'<option value="'+n+'"'+(n===p.candle?' selected':'')+'>'+n+' דק\'</option>').join('')+'</select></label></div>'+
    '<p class="muted-note">'+(c.il?'פרשות ארץ ישראל':'פרשות חוץ לארץ')+' · מחושב בטלפון, בגובה פני הים, לפי השעון של הטלפון. שעות זמניות: גר"א מהנץ עד השקיעה, מג"א 72 דקות לפני ואחרי. יש לוחות שנוהגים אחרת — לדיוק בודקים בלוח של הקהילה.</p></div>';
  openSheet('📅 לוח עברי וזמני היום',body);}
function mount(){const pane=$h('#paneList');if(!pane)return;let b=$h('.hcline');
  if(!b){const pill=$h('.offpill');(pill||pane.firstChild)?(pill||pane.firstChild).insertAdjacentHTML(pill?'afterend':'beforebegin','<button class="hcline" type="button"></button>'):pane.insertAdjacentHTML('afterbegin','<button class="hcline" type="button"></button>');b=$h('.hcline');}
  const s='📅 '+line();if(b.textContent!==s)b.textContent=s;}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.hcline')){e.preventDefault();sheet();}},true);
document.addEventListener('change',e=>{const id=e.target&&e.target.id;if(id==='hcCity'){setPref({city:e.target.value,candle:0});sheet();mount();}
  else if(id==='hcCand'){setPref({candle:+e.target.value});sheet();}});
/* "זמני היום" מהתפריט — באופליין פותח את המסך הזה (בלי הקישור לאתר ובלי מיקום מדויק, שצריכים אינטרנט) */
if(typeof openZmanim==='function'){openZmanim=sheet;const mz=$h('#miZmanim');if(mz)mz.onclick=sheet;}
const _r=render;render=function(){const r=_r.apply(this,arguments);try{mount();}catch(e){}return r;};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
setInterval(()=>{try{mount();}catch(e){}},60000); /* מתחלף לבד בשקיעה ובחצות */
document.head.insertAdjacentHTML('beforeend','<style id="hcal89">'+
  '.hcline{display:block;width:100%;text-align:start;border:1px solid var(--chipbr);background:var(--inputbg);color:var(--text);border-radius:12px;padding:7px 10px;margin:0 0 8px;font:inherit;font-size:13.5px;cursor:pointer;line-height:1.4}'+
  '.hcal .hcbig{font-size:20px;font-weight:700;margin:0 0 2px}.hcal .hcev{font-weight:700;color:var(--hdr2);margin:6px 0}'+
  '.hcal .hcsh{display:flex;flex-direction:column;gap:4px;border:1px solid var(--chipbr);border-radius:12px;padding:10px;margin:10px 0}'+
  '.hcal .hch{font-size:15px;margin:14px 0 6px}.hczm{width:100%;border-collapse:collapse;font-size:15px}.hczm th{text-align:start;font-weight:400;padding:5px 0;border-bottom:1px solid var(--chipbr)}'+
  '.hczm th small{color:var(--muted)}.hczm td{text-align:end;font-weight:700;border-bottom:1px solid var(--chipbr);font-variant-numeric:tabular-nums}'+
  '.hcup{margin:0;padding-inline-start:18px}.hcup li{margin:3px 0}.hcal select{display:block;width:100%;margin-top:4px}'+
  '</style>');
})();
