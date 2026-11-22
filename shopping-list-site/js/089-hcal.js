/* 📅 לוח עברי באפליקציה האופליין (נובמבר 2026): תאריך עברי, פרשת השבוע, חגים וצומות, ספירת העומר וזמני היום.
   הכל מחושב בטלפון — בלי אינטרנט. החישובים נבדקו מול לוח מוכר (tests/hcal.mjs):
     📆 התאריך — לפי חשבון המולד והדחיות (כל יום בשנים 1900–2300).
     📖 הפרשה — לפי סוג השנה (יום ראש השנה ואורך השנה): 14 סוגים × ארץ ישראל / חוץ לארץ, כמו בשולחן ערוך או"ח תכח.
     ☀️ הזמנים — לפי מיקום השמש (נוסחת NOAA), בגובה פני הים. שעות זמניות לפי הגר"א ולפי המג"א (72 דקות).
   משמש את כל האתר (תאריך עברי, חגים, פרשה, זמני שבת, יאמי) — במקום ספריית hebcal (רישיון GPL, לא מתאים לקוד סגור).
   המסך של הלוח באפליקציה האופליין: js/090-hcal-ui.js */
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
  return s.length>1?s.slice(0,-1)+'״'+s.slice(-1):s+'׳';} /* גרשיים וגרש עבריים, כמו בלוחות */
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

/* ---------- 🕎 חגים, צומות, ראש חודש ועומר ליום מסוים ----------
   כל אירוע: {he, en, k, base}. k: chag = יום טוב (אסור במלאכה), cm = חול המועד, fast = צום, rc = ראש חודש, omer, minor = שאר הימים.
   base = השם בלי "יום ב'" / "נר" — לזיהוי אותו חג בכמה ימים */
const MEN={1:'Nisan',2:'Iyyar',3:'Sivan',4:'Tamuz',5:'Av',6:'Elul',7:'Tishrei',8:'Cheshvan',9:'Kislev',10:'Tevet',11:"Sh'vat",12:'Adar',13:'Adar II'};
const mNameEn=(y,m)=>m===12&&leap(y)?'Adar I':MEN[m];
function events(rd,il){const h=fromRd(rd),{y,m,d}=h,w=dow(rd),ev=[];
  const add=(he,en,k,base)=>ev.push({he,en,k,base:base||he});
  if(m===7){if(d<=2)add('ראש השנה'+(d===2?' (יום ב\')':''),'Rosh Hashana'+(d===2?' II':''),'chag','ראש השנה');
    if((d===3&&w!==6)||(d===4&&w===0))add('צום גדליה','Tzom Gedaliah','fast');if(d===9)add('ערב יום כיפור','Erev Yom Kippur','minor');if(d===10)add('יום כיפור','Yom Kippur','chag');
    if(d===14)add('ערב סוכות','Erev Sukkot','minor');if(d===15)add('סוכות','Sukkot','chag');if(d===16&&!il)add('סוכות (יום ב\')','Sukkot II','chag','סוכות');
    if(d>=(il?16:17)&&d<=20)add('חול המועד סוכות','Sukkot (Chol HaMoed)','cm');if(d===21)add('הושענא רבה','Hoshana Raba','cm');
    if(d===22)add(il?'שמיני עצרת ושמחת תורה':'שמיני עצרת',il?'Shmini Atzeret & Simchat Torah':'Shmini Atzeret','chag','שמיני עצרת');if(d===23&&!il)add('שמחת תורה','Simchat Torah','chag');}
  if(m===6&&d===29)add('ערב ראש השנה','Erev Rosh Hashana','minor');
  /* חנוכה: "נר א'" ביום שבערבו מדליקים אותו (כ"ד בכסלו), עד נר ח'; ולמחרת — "יום ח'" (זאת חנוכה) */
  {const c=r=>{const n=rd-r+1;return n>=1&&n<=9?n:0;},n=c(toRd(y,9,24))||c(toRd(y-1,9,24));
    if(n&&n<=8)add('חנוכה — נר '+gem(n),'Chanukah: '+n+' candle'+(n>1?'s':''),'minor','חנוכה');else if(n===9)add('חנוכה — יום ח\' (זאת חנוכה)','Chanukah: 8th day','minor','חנוכה');}
  if(m===10&&d===10)add('עשרה בטבת','Asara B\'Tevet','fast');if(m===11&&d===15)add('ט"ו בשבט','Tu BiShvat','minor');
  const adar=leap(y)?13:12;
  if(m===adar){if((d===13&&w!==6)||(d===11&&w===4))add('תענית אסתר','Ta\'anit Esther','fast');if(d===14)add('פורים','Purim','minor');if(d===15)add('שושן פורים','Shushan Purim','minor');}
  if(leap(y)&&m===12){if(d===14)add('פורים קטן','Purim Katan','minor');if(d===15)add('שושן פורים קטן','Shushan Purim Katan','minor');}
  if(m===1){if(d===14)add('ערב פסח','Erev Pesach','minor');if(d===15)add('פסח','Pesach','chag');if(d===16&&!il)add('פסח (יום ב\')','Pesach II','chag','פסח');
    if(d>=(il?16:17)&&d<=20)add('חול המועד פסח','Pesach (Chol HaMoed)','cm');if(d===21)add('שביעי של פסח','Pesach VII','chag');if(d===22&&!il)add('אחרון של פסח','Pesach VIII','chag');}
  if(m===2&&d===14)add('פסח שני','Pesach Sheni','minor');if(m===2&&d===18)add('ל"ג בעומר','Lag BaOmer','minor');
  if(m===3){if(d===5)add('ערב שבועות','Erev Shavuot','minor');if(d===6)add('שבועות','Shavuot','chag');if(d===7&&!il)add('שבועות (יום ב\')','Shavuot II','chag','שבועות');}
  if(m===4&&((d===17&&w!==6)||(d===18&&w===0)))add('צום י"ז בתמוז','Tzom Tammuz','fast');
  if(m===5){if((d===9&&w!==6)||(d===10&&w===0))add('תשעה באב','Tish\'a B\'Av','fast');if(d===15)add('ט"ו באב','Tu B\'Av','minor');}
  if(d===30||(d===1&&m!==7)){const mm=d===30?order(y)[order(y).indexOf(m)+1]:m;add('ראש חודש '+mName(y,mm),'Rosh Chodesh '+mNameEn(y,mm),'rc');}
  const om=rd-toRd(y,1,16)+1;if(om>=1&&om<=49)add('היום '+gem(om).replace(/[״׳]/g,'')+' ('+om+') לעומר','Omer day '+om,'omer');
  return ev;}
/* שם הפרשה באנגלית (לממשק באנגלית) */
const PAR_EN=['Bereshit','Noach','Lech-Lecha','Vayera','Chayei Sara','Toldot','Vayetzei','Vayishlach','Vayeshev','Miketz','Vayigash','Vayechi','Shemot','Vaera','Bo','Beshalach','Yitro','Mishpatim','Terumah','Tetzaveh','Ki Tisa','Vayakhel','Pekudei','Vayikra','Tzav','Shmini','Tazria','Metzora','Achrei Mot','Kedoshim','Emor','Behar','Bechukotai','Bamidbar','Nasso',"Beha'alotcha","Sh'lach",'Korach','Chukat','Balak','Pinchas','Matot','Masei','Devarim','Vaetchanan','Eikev',"Re'eh",'Shoftim','Ki Teitzei','Ki Tavo','Nitzavim','Vayeilech',"Ha'azinu",'Vezot Haberakhah'];
const parshaEn=n=>n&&n.length?n.map(i=>PAR_EN[i]).join('-'):'';
const hdStrEn=h=>h.d+' '+mNameEn(h.y,h.m)+' '+h.y;

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


/* ---------- 📚 הדף היומי (המחזור ה-14 התחיל בברכות ב' ב-5 בינואר 2020; 2,711 דפים). נבדק מול לוח מוכר ---------- */
const SHAS=[['ברכות',64],['שבת',157],['עירובין',105],['פסחים',121],['שקלים',22],['יומא',88],['סוכה',56],['ביצה',40],['ראש השנה',35],['תענית',31],['מגילה',32],['מועד קטן',29],['חגיגה',27],['יבמות',122],['כתובות',112],['נדרים',91],['נזיר',66],['סוטה',49],['גיטין',90],['קידושין',82],['בבא קמא',119],['בבא מציעא',119],['בבא בתרא',176],['סנהדרין',113],['מכות',24],['שבועות',49],['עבודה זרה',76],['הוריות',14],['זבחים',120],['מנחות',110],['חולין',142],['בכורות',61],['ערכין',34],['תמורה',34],['כריתות',28],['מעילה',22],['קינים',25],['תמיד',33],['מידות',37],['נדה',73]];
function dafYomi(d){d=d||new Date();const days=Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(2020,0,5))/864e5);let n=((days%2711)+2711)%2711;
  for(const [m,last] of SHAS){const first=m==='קינים'?23:m==='תמיד'?26:m==='מידות'?34:2;const cnt=last-first+1;if(n<cnt){const daf=first+n;const g=gem(daf);return m+' דף '+g;}n-=cnt;}return '';}
window.Hcal={daf:dafYomi,fromRd,toRd,rdOf,dateOf,dow,leap,gem,hdStr,hdStrEn,mName,mNameEn,parshaNums,parshaName,parshaEn,events,zmanim,sunTime,CITIES,DAYS};
})();
