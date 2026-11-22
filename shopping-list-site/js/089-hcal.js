/* 📅 לוח עברי באפליקציה האופליין (נובמבר 2026): תאריך עברי, פרשת השבוע, חגים וצומות, ספירת העומר וזמני היום.
   הכל מחושב בטלפון — בלי אינטרנט. החישובים נבדקו מול לוח מוכר (tests/hcal.mjs):
     📆 התאריך — לפי חשבון המולד והדחיות (כל יום בשנים 1900–2300).
     📖 הפרשה — לפי סוג השנה (יום ראש השנה ואורך השנה): 14 סוגים × ארץ ישראל / חוץ לארץ, כמו בשולחן ערוך או"ח תכח.
     ☀️ הזמנים — לפי מיקום השמש (נוסחת NOAA), בגובה פני הים. שעות זמניות לפי הגר"א ולפי המג"א (72 דקות).
   ברירת המחדל: מוצג רק באפליקציה האופליין (OFF_APP). העיר והדקות של הדלקת הנרות נשמרים בטלפון (yam_hcal). */
(function(){
/* ---------- 📆 תאריך עברי ---------- */
/* חודשים כמו בתורה: 1 = ניסן ... 7 = תשרי ... 12 = אדר (אדר א' בשנה מעוברת), 13 = אדר ב' */
const leap=y=>(7*y+1)%19<7;
function elapsed(y){const m=Math.floor((235*y-234)/19),p=12084+13753*m;let d=29*m+Math.floor(p/25920);if((3*(d+1))%7<3)d++;return d;}
const nyCache={};
function newYear(y){if(nyCache[y]!=null)return nyCache[y];const a=elapsed(y-1),b=elapsed(y),c=elapsed(y+1);
  return nyCache[y]=-1373427+b+(c-b===356?2:b-a===382?1:0);} /* מספר היום (RD) של א' בתשרי */
const yLen=y=>newYear(y+1)-newYear(y);
function mLen(y,m){if(m===2||m===4||m===6||m===10||m===13)return 29;if(m===12&&!leap(y))return 29;
  if(m===8)return yLen(y)%10===5?30:29;if(m===9)return yLen(y)%10===3?29:30;return 30;}
const months=y=>leap(y)?13:12;
/* סדר החודשים בשנה: מתשרי */
const order=y=>{const a=[7,8,9,10,11,12];if(leap(y))a.push(13);return a.concat([1,2,3,4,5,6]);};
function toRd(y,m,d){let r=newYear(y);for(const mm of order(y)){if(mm===m)break;r+=mLen(y,mm);}return r+d-1;}
function fromRd(rd){let y=Math.floor((rd+1373427)/365.2468)+3761;while(newYear(y+1)<=rd)y++;while(newYear(y)>rd)y--;
  let r=newYear(y);for(const m of order(y)){const n=mLen(y,m);if(rd<r+n)return {y,m,d:rd-r+1,rd};r+=n;}}
/* תאריך לועזי מקומי ↔ RD (1 בינואר שנה 1 = 1) */
const rdOf=dt=>Math.floor(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())/864e5)+719163;
const dateOf=rd=>{const u=new Date((rd-719163)*864e5);return new Date(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate(),12);};
const dow=rd=>((rd%7)+7)%7; /* 0 = ראשון ... 6 = שבת */

/* ---------- גימטריה ---------- */
function gem(n){const L=[[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק'],[90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],[40,'מ'],[30,'ל'],[20,'כ'],[10,'י'],[9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],[5,'ה'],[4,'ד'],[3,'ג'],[2,'ב'],[1,'א']];
  let s='';n=n%1000;while(n>0){if(n===15){s+='טו';break;}if(n===16){s+='טז';break;}for(const [v,c] of L)if(n>=v){s+=c;n-=v;break;}}
  return s.length>1?s.slice(0,-1)+'"'+s.slice(-1):s+"'";}
const MN={1:'ניסן',2:'אייר',3:'סיון',4:'תמוז',5:'אב',6:'אלול',7:'תשרי',8:'חשון',9:'כסלו',10:'טבת',11:'שבט',12:'אדר',13:'אדר ב\''};
const mName=(y,m)=>m===12&&leap(y)?'אדר א\'':MN[m];
const DAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const hdStr=h=>gem(h.d)+' '+mName(h.y,h.m)+' '+gem(h.y);

/* ---------- 📖 פרשת השבוע ---------- */
const PAR=['בראשית','נח','לך לך','וירא','חיי שרה','תולדות','ויצא','וישלח','וישב','מקץ','ויגש','ויחי','שמות','וארא','בא','בשלח','יתרו','משפטים','תרומה','תצוה','כי תשא','ויקהל','פקודי','ויקרא','צו','שמיני','תזריע','מצורע','אחרי מות','קדושים','אמור','בהר','בחוקותי','במדבר','נשא','בהעלותך','שלח','קרח','חוקת','בלק','פינחס','מטות','מסעי','דברים','ואתחנן','עקב','ראה','שופטים','כי תצא','כי תבוא','נצבים','וילך','האזינו','וזאת הברכה'];
const PAIR=[22,27,29,32,39,42,51]; /* פרשות מחוברות: ויקהל-פקודי, תזריע-מצורע, אחרי מות-קדושים, בהר-בחוקותי, חוקת-בלק, מטות-מסעי, נצבים-וילך */
/* לכל סוג שנה (i/d = ארץ ישראל / חו"ל, יום ראש השנה, אורך השנה): תו לכל שבת מהשבת הראשונה בשנה.
   '0' = שבת של חג (אין פרשה), '1'..'f' = פרשה אחת (1 = בראשית), 'g'..'m' = פרשות מחוברות לפי PAIR */
const SEQ={"i1-385":"de0123456789:;<=>?@ABCDEFGHIJKL0MNOPQRSTUVWXYZ[\\]^_`abc","i1-353":"de0123456789:;<=>?@ABCDEgHI0JhiOjRSTUVWXYl\\]^_`abm","i4-354":"e00123456789:;<=>?@ABCDEgHI0JhiOPQRSTUVWXYl\\]^_`abc","i1-355":"de0123456789:;<=>?@ABCDEgHI0JhiOjRSTUVWXYl\\]^_`abm","i6-383":"0e00123456789:;<=>?@ABCDEFGHIJKL0MNOPQRSTUVWXYl\\]^_`abm","i6-385":"0e00123456789:;<=>?@ABCDEFGHIJKL0MNOPQRSTUVWXYl\\]^_`abm","i6-353":"0e00123456789:;<=>?@ABCDEgHI0JhiOjRSTUVWXYl\\]^_`abc","i2-384":"de0123456789:;<=>?@ABCDEFGHIJKL0MNOPQRSTUVWXYZ[\\]^_`abc","i6-355":"0e00123456789:;<=>?@ABCDEgHI0JhiOjRSTUVWXYl\\]^_`abm","i4-383":"e00123456789:;<=>?@ABCDEFGHIJKLM0NOPQRSTUVWXYZ[\\]^_`abc","i2-354":"de0123456789:;<=>?@ABCDEgHI0JhiOjRSTUVWXYl\\]^_`abm","i4-385":"e00123456789:;<=>?@ABCDEFGHIJKLM0NOPQRSTUVWXYZ[\\]^_`abm","i1-383":"de0123456789:;<=>?@ABCDEFGHIJKL0MNOPQRSTUVWXYl\\]^_`abm","i4-355":"e00123456789:;<=>?@ABCDEFGHI0JhiOjRSTUVWXYl\\]^_`abc","d1-385":"de0123456789:;<=>?@ABCDEFGHIJKL00MNOPQRSTUVWXYl\\]^_`abc","d1-353":"de0123456789:;<=>?@ABCDEgHI0JhiOjRSTUVWXYl\\]^_`abm","d4-354":"e00123456789:;<=>?@ABCDEgHI00JhiOjRSTUVWXYl\\]^_`abc","d1-355":"de0123456789:;<=>?@ABCDEgHI0JhiOjR0STUVkYl\\]^_`abm","d6-383":"0e00123456789:;<=>?@ABCDEFGHIJKL0MNOPQRSTUVWXYl\\]^_`abm","d6-385":"0e00123456789:;<=>?@ABCDEFGHIJKL0MNOPQR0STUVkYl\\]^_`abm","d6-353":"0e00123456789:;<=>?@ABCDEgHI0JhiOjRSTUVWXYl\\]^_`abc","d2-384":"de0123456789:;<=>?@ABCDEFGHIJKL00MNOPQRSTUVWXYl\\]^_`abc","d6-355":"0e00123456789:;<=>?@ABCDEgHI0JhiOjRSTUVWXYl\\]^_`abm","d4-383":"e00123456789:;<=>?@ABCDEFGHIJKLM0NOPQRSTUVWXYZ[\\]^_`abc","d2-354":"de0123456789:;<=>?@ABCDEgHI0JhiOjR0STUVkYl\\]^_`abm","d4-385":"e00123456789:;<=>?@ABCDEFGHIJKLM0NOPQRSTUVWXYZ[\\]^_`abm","d1-383":"de0123456789:;<=>?@ABCDEFGHIJKL0MNOPQR0STUVkYl\\]^_`abm","d4-355":"e00123456789:;<=>?@ABCDEFGHI0JhiOjRSTUVWXYl\\]^_`abc"};
/* rd של שבת → מספרי הפרשות (0 = בראשית), [] = שבת של חג */
function parshaNums(rd,il){const h=fromRd(rd),ny=newYear(h.y),seq=SEQ[(il?'i':'d')+dow(ny)+'-'+yLen(h.y)];if(!seq)return null;
  const first=ny+((6-dow(ny))+7)%7,c=seq.charCodeAt((rd-first)/7)-48;
  return c===0?[]:c<=54?[c-1]:[PAIR[c-55]-1,PAIR[c-55]];}
const parshaName=n=>n&&n.length?n.map(i=>PAR[i]).join('-'):'';

/* ---------- 🕎 חגים, צומות, ראש חודש ועומר (מה שמוצג ליום מסוים) ---------- */
function events(rd,il){const h=fromRd(rd),{y,m,d}=h,w=dow(rd),ev=[];const add=s=>ev.push(s);
  if(m===7){if(d<=2)add('ראש השנה'+(d===2?' (יום ב\')':''));
    if((d===3&&w!==6)||(d===4&&w===0))add('צום גדליה');if(d===9)add('ערב יום כיפור');if(d===10)add('יום כיפור');
    if(d===14)add('ערב סוכות');if(d===15)add('סוכות');if(d===16&&!il)add('סוכות (יום ב\')');
    if(d>=(il?16:17)&&d<=20)add('חול המועד סוכות');if(d===21)add('הושענא רבה');
    if(d===22)add(il?'שמיני עצרת ושמחת תורה':'שמיני עצרת');if(d===23&&!il)add('שמחת תורה');}
  if(m===6&&d===29)add('ערב ראש השנה');
  /* חנוכה: מכ"ה בכסלו, שמונה ימים */
  {const ch=rd-toRd(y,9,25)+1;const ch2=rd-toRd(y-1,9,25)+1;const n=ch>=1&&ch<=8?ch:ch2>=1&&ch2<=8?ch2:0;if(n)add('חנוכה — נר '+gem(n));}
  if(m===10&&d===10)add('עשרה בטבת');if(m===11&&d===15)add('ט"ו בשבט');
  const adar=leap(y)?13:12;
  if(m===adar){if((d===13&&w!==6)||(d===11&&w===4))add('תענית אסתר');if(d===14)add('פורים');if(d===15)add('שושן פורים');}
  if(leap(y)&&m===12){if(d===14)add('פורים קטן');if(d===15)add('שושן פורים קטן');}
  if(m===1){if(d===14)add('ערב פסח');if(d===15)add('פסח');if(d===16&&!il)add('פסח (יום ב\')');
    if(d>=(il?16:17)&&d<=20)add('חול המועד פסח');if(d===21)add('שביעי של פסח');if(d===22&&!il)add('אחרון של פסח');}
  if(m===2&&d===14)add('פסח שני');if(m===2&&d===18)add('ל"ג בעומר');
  if(m===3){if(d===5)add('ערב שבועות');if(d===6)add('שבועות');if(d===7&&!il)add('שבועות (יום ב\')');}
  if(m===4&&((d===17&&w!==6)||(d===18&&w===0)))add('צום י"ז בתמוז');
  if(m===5){if((d===9&&w!==6)||(d===10&&w===0))add('תשעה באב');if(d===15)add('ט"ו באב');}
  if((d===30)||(d===1&&m!==7))add('ראש חודש '+(d===30?mName(y,order(y)[order(y).indexOf(m)+1]):mName(y,m)));
  const om=rd-toRd(y,1,16)+1;if(om>=1&&om<=49)add('היום '+gem(om).replace(/["']/g,'')+' ('+om+') לעומר');
  return ev;}

/* ---------- ☀️ זמני היום (NOAA) ---------- */
const RAD=Math.PI/180;
/* זמן UTC (בדקות מחצות UTC) שבו השמש בזווית alt (שלילי = מתחת לאופק). up=true זריחה / false שקיעה. null = אין באותו יום */
function sunTime(rd,lat,lon,alt,up){let t=up?360:1080;
  for(let i=0;i<3;i++){const jd=rd+1721424.5+t/1440,T=(jd-2451545)/36525;
    const L0=(280.46646+T*(36000.76983+T*0.0003032))%360,M=357.52911+T*(35999.05029-0.0001537*T),e=0.016708634-T*(0.000042037+0.0000001267*T);
    const C=Math.sin(M*RAD)*(1.914602-T*(0.004817+0.000014*T))+Math.sin(2*M*RAD)*(0.019993-0.000101*T)+Math.sin(3*M*RAD)*0.000289;
    const om=125.04-1934.136*T,lam=L0+C-0.00569-0.00478*Math.sin(om*RAD);
    const eps0=23+(26+(21.448-T*(46.815+T*(0.00059-T*0.001813)))/60)/60,eps=eps0+0.00256*Math.cos(om*RAD);
    const dec=Math.asin(Math.sin(eps*RAD)*Math.sin(lam*RAD));
    const yv=Math.tan(eps/2*RAD)**2,eqt=4/RAD*(yv*Math.sin(2*L0*RAD)-2*e*Math.sin(M*RAD)+4*e*yv*Math.sin(M*RAD)*Math.cos(2*L0*RAD)-0.5*yv*yv*Math.sin(4*L0*RAD)-1.25*e*e*Math.sin(2*M*RAD));
    const ch=(Math.sin(alt*RAD)-Math.sin(lat*RAD)*Math.sin(dec))/(Math.cos(lat*RAD)*Math.cos(dec));if(ch>1||ch<-1)return null;
    const ha=Math.acos(ch)/RAD;t=720-4*(lon+(up?ha:-ha))-eqt;}
  return t;}
const at=(rd,min)=>min==null?null:new Date((rd-719163)*864e5+min*6e4);
function zmanim(rd,c){const lat=c.lat,lon=c.lon,S=(a,u)=>sunTime(rd,lat,lon,a,u);
  const rise=S(-0.833,true),set=S(-0.833,false);if(rise==null||set==null)return null;
  const gra=(set-rise)/12,ma=(set-rise+144)/12;
  const o={alot:S(-16.1,true),mish:S(-11.5,true),rise,shmaMga:rise-72+3*ma,shma:rise+3*gra,tfMga:rise-72+4*ma,tf:rise+4*gra,
    chatzot:rise+6*gra,mg:rise+6.5*gra,mk:rise+9.5*gra,plag:rise+10.75*gra,set,tzeit:S(-8.5,false),rt:set+72};
  const r={};for(const k in o)r[k]=at(rd,o[k]);return r;}

/* ---------- 📍 ערים (קו רוחב, קו אורך, אזור זמן, ארץ ישראל?) — ונרות שבת: ירושלים 40, חיפה 30, ברירת מחדל 18 דקות ---------- */
const IL='Asia/Jerusalem';
const CITIES=[['ירושלים',31.769,35.216,IL,1,40],['בני ברק',32.081,34.834,IL,1],['בית שמש',31.747,34.988,IL,1],['מודיעין עילית',31.933,35.041,IL,1],
  ['ביתר עילית',31.697,35.115,IL,1],['אלעד',32.052,34.951,IL,1],['תל אביב',32.081,34.781,IL,1],['פתח תקווה',32.084,34.888,IL,1],['רחובות',31.893,34.811,IL,1],
  ['אשדוד',31.804,34.655,IL,1],['אשקלון',31.669,34.574,IL,1],['קריית גת',31.610,34.764,IL,1],['נתניה',32.322,34.853,IL,1],['חיפה',32.794,34.990,IL,1,30],
  ['רכסים',32.749,35.097,IL,1],['צפת',32.965,35.496,IL,1],['טבריה',32.794,35.530,IL,1],['עמנואל',32.160,35.137,IL,1],['באר שבע',31.252,34.791,IL,1],
  ['ערד',31.259,35.213,IL,1],['ניו יורק',40.713,-74.006,'America/New_York',0],['לייקווד',40.082,-74.210,'America/New_York',0],
  ['מונסי',41.111,-74.069,'America/New_York',0],['לוס אנג\'לס',34.052,-118.244,'America/Los_Angeles',0],['טורונטו',43.653,-79.383,'America/Toronto',0],
  ['מונטריאול',45.502,-73.567,'America/Toronto',0],['לונדון',51.507,-0.128,'Europe/London',0],['מנצ\'סטר',53.481,-2.243,'Europe/London',0],
  ['אנטוורפן',51.219,4.403,'Europe/Brussels',0],['פריז',48.857,2.352,'Europe/Paris',0],['ציריך',47.377,8.541,'Europe/Zurich',0],
  ['יוהנסבורג',-26.204,28.047,'Africa/Johannesburg',0],['בואנוס איירס',-34.604,-58.382,'America/Argentina/Buenos_Aires',0]]
  .map(a=>({name:a[0],lat:a[1],lon:a[2],tz:a[3],il:!!a[4],candle:a[5]||18}));

window.Hcal={fromRd,toRd,rdOf,dateOf,dow,leap,gem,hdStr,mName,parshaNums,parshaName,events,zmanim,sunTime,CITIES,DAYS};
if(typeof OFF_APP==='undefined'||!OFF_APP)return;

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
  const ev=events(t.hrd,t.p.city.il).filter(s=>!/לעומר/.test(s))[0];
  return (t.night?'אור ל':'יום ')+DAYS[dow(t.hrd)]+' · '+hdStr(h)+' · '+(pn&&pn.length?'פרשת '+parshaName(pn):'שבת: '+(events(sh,t.p.city.il)[0]||'חג'))+(ev?' · '+ev:'');}
function sheet(){const t=today(),p=t.p,c=p.city,h=fromRd(t.hrd),z=t.z||{},tz=c.tz;
  const row=(l,d,n)=>'<tr><th>'+l+(n?' <small>'+n+'</small>':'')+'</th><td dir="ltr">'+hm(d,tz)+'</td></tr>';
  const ev=events(t.hrd,c.il);
  /* שבת הקרובה: הדלקת נרות ביום שישי, צאת השבת במוצאי שבת */
  const sh=shabbatOf(t.rd),zf=zmanim(sh-1,c),zs=zmanim(sh,c),pn=parshaNums(sh,c.il);
  const cand=zf&&zf.set?new Date(zf.set.getTime()-p.candle*6e4):null;
  /* השבועיים הבאים: חגים וצומות */
  const up=[];for(let r=t.hrd+1;r<=t.hrd+30&&up.length<5;r++){const e=events(r,c.il).filter(s=>!/לעומר/.test(s));
    if(e.length)up.push('<li><b>'+DAYS[dow(r)]+' '+gem(fromRd(r).d)+' '+mName(fromRd(r).y,fromRd(r).m)+'</b> — '+e.join(', ')+'</li>');}
  const body='<div class="hcal">'+
    '<p class="hcbig">'+(t.night?'אור ל':'יום ')+DAYS[dow(t.hrd)]+', '+hdStr(h)+'</p>'+
    '<p class="muted-note">'+t.now.toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric'})+(t.night?' · אחרי השקיעה':'')+'</p>'+
    (ev.length?'<p class="hcev">'+ev.join(' · ')+'</p>':'')+
    '<div class="hcsh"><b>📖 '+(pn&&pn.length?'פרשת '+parshaName(pn):'שבת: '+(events(sh,c.il)[0]||'חג'))+'</b>'+
      '<span>🕯️ הדלקת נרות: <b dir="ltr">'+hm(cand,tz)+'</b></span><span>✨ צאת השבת: <b dir="ltr">'+hm(zs&&zs.tzeit,tz)+'</b> · ר"ת <b dir="ltr">'+hm(zs&&zs.rt,tz)+'</b></span></div>'+
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
