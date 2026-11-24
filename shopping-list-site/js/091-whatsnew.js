/* 🆕 מה חדש, מספרי גרסה והיסטוריית עדכונים (כסלו תשפ"ז, נובמבר 2026)
   • מספר גרסה אמיתי (לא תאריך): האתר — APP_VERSION (js/019.js), האפליקציה — download/app-version.json והגרסה המותקנת בטלפון (UA).
   • מסך אחד "🆕 מה חדש" עם שתי לשוניות: 🌐 באתר / 📱 באפליקציה. בכל אחת: מה חדש בעדכון האחרון, ומתחת היסטוריית עדכונים.
     באתר — גם ההודעות שהצוות פרסם בבק אופיס (site_updates). באפליקציה — גם "בקרוב בגרסה הבאה" והאפליקציה האופליין.
   • קרדיט "נוצר על ידי יסוד שביסוד" — בתחתית התפריט ☰, באודות ובמסך מה חדש.
   כשמשחררים APK חדש: מעבירים את הסעיפים מ-APP_NEXT ל-download/app-version.json (שם הם נקראים אוטומטית כ"מה חדש"),
   מוסיפים את הגרסה הקודמת ל-APP_HIST, ומעדכנים את APP_NEXT מתוך android/לגרסה-*.md שבתיקיית הפרויקט.
   באפליקציה האופליין: מוסיפים ל-OFF_HIST בכל גרסה (הקוד שלה ארוז בתוכה, אז השינוי מגיע אליה רק בגרסה הבאה שלה). */
(function(){
const $91=s=>document.querySelector(s);
/* בלי T: T מחליף באפליקציה "מה חדש באתר" ל"באפליקציה", וכאן צריך את שתי המילים כמו שהן */
const L=(he,en)=>prefs.lang==='en'?en:he;
const UA=navigator.userAgent||'';
const myApp=(UA.match(/YamShoppingApp\/([0-9.]+)/)||[])[1]||'';
const myOff=(UA.match(/YamShoppingOffline\/([0-9.]+)/)||[])[1]||'';

/* ---------- 🔖 גרסת האתר הנוכחית ---------- */
CHANGELOG.unshift(['21','2026-11-24',
  'מה היה: קבלה מקישור ב-SMS לא תמיד נפתחה, ההשוואה "איזו רשת הכי זולה" חישבה לא נכון, והגרסה של האתר הופיעה כתאריך.',
  'מה חדש:\n🧾 קבלה מקישור ב-SMS (אושר עד, אייס ועוד) נפתחת ישר, ואפשר לצלם קבלה ישר מהמצלמה\n📈 גרף מחיר לכל מוצר: רואים אם היה זול יותר בשבוע שעבר\n💰 "הכי זול לכל הרשימה" משווה רק מוצרים זהים שיש בכל החנויות, עם מחירים מכל הרשתות שברשימה של משרד הכלכלה\n⚡ האתר נפתח מהר בערך פי 1.8\n📅 לוח עברי: תאריך, פרשת השבוע, דף יומי וזמני היום\n📴 סנכרון עם "רשימת קניות אופליין" בבלוטות\', בקוד QR או בקוד שיתוף, והורדת האפליקציה האופליין\n🔄 עדכון של האתר לא מנתק את הבלוטות\', ואחרי טעינה מחדש הוא מתחבר שוב לבד\n🆕 מסך "מה חדש" חדש: מספר הגרסה, מה חדש באתר ובאפליקציה, והיסטוריית עדכונים']);

/* ---------- 📱 היסטוריית האפליקציה לאנדרואיד (הגרסה האחרונה נקראת מ-download/app-version.json) ---------- */
const APP_HIST=[
 {v:'2.2',date:'2026-11-22',notes:[]},
 {v:'2.1',date:'2026-11-11',notes:['האפליקציה נפתחת גם בלי אינטרנט, כבר מהפעם הראשונה אחרי ההתקנה','התראות מגיעות גם כשהאפליקציה סגורה, גם בשיאומי ובסמסונג','אנימציית הפתיחה של הלוגו, כמו באתר, גם כשחוזרים לאפליקציה אחרי זמן']},
 {v:'2.0',date:'2026-11-08',notes:['עיצוב חדש: אייקון חדש ואנימציית פתיחה','מספר אדום על האייקון: כמה עדכונים מחכים לכם','קישור של yamshopping.com נפתח ישר באפליקציה','שיתוף טקסט אל האפליקציה: כל שורה נכנסת כמוצר','4 קיצורי דרך בלחיצה ארוכה על האייקון','המסך לא נכבה במצב קנייה, ורטט כשסורקים ברקוד','כניסה עם חשבון גוגל','הודעה שסימנתם "נקרא" לא קופצת שוב']},
 {v:'1.9',date:'',notes:['התראה על גרסה חדשה מגיעה גם למי שכיבה את ההתראות ברקע','גרסה חדשה יכולה להגיע קודם לחלק מהמשתמשים, כדי לבדוק שהכל תקין']},
 {v:'1.0–1.8',date:'',notes:['הגרסאות הראשונות של האפליקציה לאנדרואיד']}];
/* 🔜 מה יגיע בגרסה הבאה של האפליקציה (לפי android/לגרסה-2.3.md) — באתר זה כבר מוכן */
const APP_NEXT={v:'2.3',notes:['קבלה מקישור מקוצר ב-SMS (אושר עד, אייס ועוד) נפתחת ישר מהטלפון','חיבור הבלוטות\' מול המחשב לא מתנתק, ומתחבר שוב לבד']};
/* 📴 רשימת קניות אופליין */
const OFF_HIST=[
 {v:'1.5',date:'2026-11-22',notes:['חיבור הבלוטות\' מול המחשב לא מתנתק, מתחבר שוב לבד ושולח רק מה שהשתנה']},
 {v:'1.4',date:'2026-11-22',notes:['סנכרון בבלוטות\' גם מהמחשב, בקובץ USB ובמייל','לוח עברי ודף יומי, בלי אינטרנט','רואים מי מחובר עכשיו']},
 {v:'1.3',date:'2026-11-22',notes:['סורק QR משלה: סריקה אחת מאיזה צד שרוצים, וגם "פנים מול פנים"']},
 {v:'1.2',date:'2026-11-22',notes:['בלי פרסומת בצד']},
 {v:'1.1',date:'2026-11-22',notes:['מוסתר כל מה שצריך אינטרנט','השעון מתיישר לפי הטלפון שמסנכרנים איתו, ורשימות שנמחקו לא חוזרות']},
 {v:'1.0',date:'2026-11-21',notes:['הגרסה הראשונה: רשימות קניות בלי אינטרנט בכלל, וסנכרון בקוד QR, בבלוטות\' או בקוד שיתוף']}];

/* ---------- 📆 תאריך עברי לכל גרסה ---------- */
const GREG={'ספטמבר 2026':'אלול תשפ״ו – תשרי תשפ״ז','אוקטובר 2026':'תשרי – חשון תשפ״ז','נובמבר 2026':'חשון – כסלו תשפ״ז'};
function day91(s){s=String(s||'').trim();const m=s.match(/^(\d{4})-(\d\d)-(\d\d)$/);
  if(m){const dt=new Date(+m[1],+m[2]-1,+m[3],12);
    if(prefs.lang==='en')return dt.toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'});
    try{if(window.Hcal)return Hcal.hdStr(Hcal.fromRd(Hcal.rdOf(dt)));}catch(e){}return dt.toLocaleDateString('he-IL');}
  return prefs.lang==='en'?s:(GREG[s]||s);}
/* "מה חדש: א · ב" או שורה לכל דבר — לרשימה */
const lines91=s=>String(s||'').replace(/^\s*מה (חדש|היה):\s*/,'').split(/\n| · /).map(x=>x.replace(/^\s*[-•*]\s*/,'').trim()).filter(Boolean);
const ul91=a=>a.length?'<ul class="wn91ul">'+a.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
const older91=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)<(y[i]||0);}return false;};

/* ---------- ✨ הקרדיט ---------- */
/* הלוגו של יסוד שביסוד (company-site/logo/final/yesod-logo-on-*.svg בתיקיית הפרויקט): נכנס לדף פעם אחת כ-symbol,
   והאותיות בצבע currentColor — כחול כהה במצב בהיר ולבן במצב כהה, והעומק בזהב. SVG ולא תמונה, כי נטפרי חוסם תמונות */
(function(){if(document.getElementById('yesod91'))return;const d=document.createElement('div');d.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><symbol id="yesod91" viewBox="0 0 333 53"><defs><linearGradient id="yesod91g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1d27a"/><stop offset=".5" stop-color="#c9a227"/><stop offset="1" stop-color="#8a6512"/></linearGradient></defs><g transform="translate(4 4.0)"><defs><path id="yesod91p" d="M230.9 15.5V6.3H227.0V0.6H238.2V15.5Z M212.0 27.0Q208.5 27.0 205.9 25.5Q203.3 24.0 201.8 21.3Q200.3 18.5 200.2 14.9L200.2 13.5Q200.2 12.3 200.5 11.0Q200.9 9.7 201.4 8.5Q201.9 7.3 202.5 6.6Q202.6 6.5 202.7 6.4Q202.8 6.4 202.8 6.3L202.8 6.2Q202.2 6.3 201.3 6.5Q200.3 6.8 199.7 6.9L198.4 1.6Q200.1 1.1 202.3 0.7Q204.4 0.4 206.7 0.2Q209.0 0.0 211.0 0.0Q215.1 0.0 218.0 1.4Q220.8 2.8 222.2 5.6Q223.7 8.3 223.7 12.4V14.9Q223.7 18.5 222.2 21.3Q220.8 24.0 218.2 25.5Q215.5 27.0 212.0 27.0ZM212.0 21.0Q213.3 21.0 214.3 20.3Q215.3 19.5 215.8 18.1Q216.4 16.7 216.4 14.9V12.6Q216.4 10.4 215.9 8.9Q215.4 7.4 214.4 6.7Q213.4 5.9 212.0 5.9Q210.5 5.9 209.6 6.7Q208.6 7.5 208.1 9.1Q207.6 10.6 207.5 13.0V14.9Q207.5 16.7 208.1 18.1Q208.6 19.5 209.6 20.3Q210.6 21.0 212.0 21.0Z M186.6 26.5V6.3H184.4V0.6H193.9V26.5Z M158.9 0.6H181.4V6.3H176.9V26.5H169.5V6.3H158.9Z M118.3 0.6V20.0Q120.1 20.7 122.2 21.2Q124.3 21.6 126.1 21.6Q129.0 21.6 131.3 20.8Q133.5 20.0 134.8 18.2Q136.1 16.5 136.1 13.7V0.6H143.2V14.5Q143.2 17.7 141.8 20.2Q140.5 22.6 138.2 24.2Q135.9 25.8 132.9 26.5Q129.8 27.3 126.4 27.3Q122.7 27.3 118.8 26.5Q114.9 25.6 111.3 23.9V0.6ZM122.8 18.0Q123.2 17.2 123.4 15.7Q123.6 14.2 123.6 12.5V0.6H130.6V10.9Q130.6 13.1 130.1 15.0Q129.6 17.0 128.8 18.0Z M84.8 26.5V20.8H97.0L104.3 20.6L107.3 21.1V26.5ZM97.0 24.8V9.7Q97.0 8.0 96.1 7.2Q95.1 6.3 93.3 6.3H86.2V0.6H93.9Q98.8 0.6 101.5 3.1Q104.3 5.6 104.3 10.1V24.8Z M73.3 15.5V6.3H69.3V0.6H80.5V15.5Z M54.3 27.0Q50.9 27.0 48.3 25.5Q45.7 24.0 44.2 21.3Q42.7 18.5 42.6 14.9L42.6 13.5Q42.6 12.3 42.9 11.0Q43.2 9.7 43.8 8.5Q44.3 7.3 44.9 6.6Q45.0 6.5 45.1 6.4Q45.1 6.4 45.2 6.3L45.2 6.2Q44.6 6.3 43.6 6.5Q42.7 6.8 42.1 6.9L40.7 1.6Q42.5 1.1 44.6 0.7Q46.8 0.4 49.1 0.2Q51.3 0.0 53.4 0.0Q57.5 0.0 60.3 1.4Q63.2 2.8 64.6 5.6Q66.1 8.3 66.1 12.4V14.9Q66.1 18.5 64.6 21.3Q63.2 24.0 60.5 25.5Q57.9 27.0 54.3 27.0ZM54.3 21.0Q55.7 21.0 56.7 20.3Q57.7 19.5 58.2 18.1Q58.8 16.7 58.8 14.9V12.6Q58.8 10.4 58.3 8.9Q57.8 7.4 56.8 6.7Q55.8 5.9 54.3 5.9Q52.9 5.9 51.9 6.7Q50.9 7.5 50.4 9.1Q49.9 10.6 49.9 13.0V14.9Q49.9 16.7 50.5 18.1Q51.0 19.5 52.0 20.3Q53.0 21.0 54.3 21.0Z M28.9 26.5V6.3H26.8V0.6H36.2V26.5Z M1.2 0.6H23.8V6.3H19.2V26.5H11.9V6.3H1.2Z"/></defs><g fill="url(#yesod91g)"><use href="#yesod91p" x="5.6" y="5.6"/><use href="#yesod91p" x="4.9" y="4.9"/><use href="#yesod91p" x="4.2" y="4.2"/><use href="#yesod91p" x="3.5" y="3.5"/><use href="#yesod91p" x="2.8" y="2.8"/><use href="#yesod91p" x="2.1" y="2.1"/><use href="#yesod91p" x="1.4" y="1.4"/><use href="#yesod91p" x="0.7" y="0.7"/></g><use href="#yesod91p" fill="currentColor"/><path d="M16.2 43.2V35.8H21.6V37.0H17.6V42.1H21.8V43.2ZM17.5 40.0V38.9H21.2V40.0Z M33.9 43.3Q33.0 43.3 32.2 43.1Q31.4 42.8 31.0 42.4L31.4 41.4Q31.9 41.7 32.5 42.0Q33.2 42.2 33.9 42.2Q34.5 42.2 34.8 42.1Q35.2 41.9 35.4 41.7Q35.5 41.5 35.5 41.2Q35.5 40.9 35.3 40.7Q35.0 40.5 34.7 40.4Q34.3 40.2 33.8 40.1Q33.3 40.0 32.9 39.9Q32.4 39.7 32.0 39.5Q31.6 39.3 31.4 38.9Q31.1 38.5 31.1 37.9Q31.1 37.3 31.5 36.8Q31.8 36.3 32.4 36.0Q33.1 35.7 34.1 35.7Q34.8 35.7 35.4 35.9Q36.1 36.1 36.6 36.4L36.1 37.4Q35.6 37.2 35.1 37.0Q34.6 36.9 34.1 36.9Q33.5 36.9 33.2 37.0Q32.8 37.1 32.7 37.4Q32.5 37.6 32.5 37.9Q32.5 38.2 32.7 38.4Q33.0 38.6 33.4 38.7Q33.7 38.9 34.2 39.0Q34.7 39.1 35.2 39.2Q35.6 39.3 36.0 39.6Q36.4 39.8 36.6 40.2Q36.9 40.6 36.9 41.1Q36.9 41.7 36.6 42.2Q36.2 42.7 35.6 43.0Q34.9 43.3 33.9 43.3Z M50.0 43.3Q49.1 43.3 48.4 43.0Q47.7 42.8 47.1 42.2Q46.6 41.7 46.3 41.0Q46.0 40.4 46.0 39.5Q46.0 38.7 46.3 38.0Q46.6 37.3 47.1 36.8Q47.7 36.3 48.4 36.0Q49.1 35.7 50.0 35.7Q50.9 35.7 51.6 36.0Q52.3 36.3 52.8 36.8Q53.4 37.3 53.7 38.0Q54.0 38.7 54.0 39.5Q54.0 40.4 53.7 41.0Q53.4 41.7 52.8 42.3Q52.3 42.8 51.6 43.0Q50.9 43.3 50.0 43.3ZM50.0 42.1Q50.6 42.1 51.0 41.9Q51.5 41.7 51.8 41.4Q52.2 41.0 52.4 40.6Q52.6 40.1 52.6 39.5Q52.6 39.0 52.4 38.5Q52.2 38.0 51.8 37.7Q51.5 37.3 51.0 37.1Q50.6 36.9 50.0 36.9Q49.4 36.9 49.0 37.1Q48.5 37.3 48.1 37.7Q47.8 38.0 47.6 38.5Q47.4 39.0 47.4 39.5Q47.4 40.1 47.6 40.6Q47.8 41.0 48.1 41.4Q48.5 41.7 49.0 41.9Q49.4 42.1 50.0 42.1Z M63.7 43.2V35.8H67.0Q68.2 35.8 69.1 36.3Q70.0 36.8 70.5 37.6Q71.0 38.4 71.0 39.5Q71.0 40.6 70.5 41.5Q70.0 42.3 69.1 42.8Q68.2 43.2 67.0 43.2ZM65.1 42.1H66.9Q67.7 42.1 68.3 41.7Q68.9 41.4 69.3 40.9Q69.6 40.3 69.6 39.5Q69.6 38.8 69.3 38.2Q68.9 37.6 68.3 37.3Q67.7 37.0 66.9 37.0H65.1Z M98.0 43.3Q97.1 43.3 96.3 43.1Q95.5 42.8 95.1 42.4L95.5 41.4Q96.0 41.7 96.6 42.0Q97.3 42.2 98.0 42.2Q98.6 42.2 98.9 42.1Q99.3 41.9 99.4 41.7Q99.6 41.5 99.6 41.2Q99.6 40.9 99.4 40.7Q99.1 40.5 98.7 40.4Q98.4 40.2 97.9 40.1Q97.4 40.0 96.9 39.9Q96.5 39.7 96.1 39.5Q95.7 39.3 95.5 38.9Q95.2 38.5 95.2 37.9Q95.2 37.3 95.5 36.8Q95.9 36.3 96.5 36.0Q97.2 35.7 98.2 35.7Q98.9 35.7 99.5 35.9Q100.2 36.1 100.7 36.4L100.2 37.4Q99.7 37.2 99.2 37.0Q98.7 36.9 98.2 36.9Q97.6 36.9 97.3 37.0Q96.9 37.1 96.7 37.4Q96.6 37.6 96.6 37.9Q96.6 38.2 96.8 38.4Q97.1 38.6 97.4 38.7Q97.8 38.9 98.3 39.0Q98.8 39.1 99.2 39.2Q99.7 39.3 100.1 39.6Q100.5 39.8 100.7 40.2Q101.0 40.6 101.0 41.1Q101.0 41.7 100.6 42.2Q100.3 42.7 99.7 43.0Q99.0 43.3 98.0 43.3Z M127.5 43.2V35.8H132.9V37.0H128.8V42.1H133.0V43.2ZM128.7 40.0V38.9H132.4V40.0Z M142.9 43.2V35.8H146.3Q147.6 35.8 148.3 36.4Q149.0 36.9 149.0 37.8Q149.0 38.3 148.8 38.8Q148.5 39.2 148.0 39.4Q147.6 39.6 147.0 39.6L147.2 39.3Q147.8 39.3 148.3 39.5Q148.8 39.7 149.1 40.1Q149.4 40.6 149.4 41.2Q149.4 42.2 148.7 42.7Q148.0 43.2 146.5 43.2ZM144.2 42.1H146.4Q147.2 42.1 147.6 41.9Q148.0 41.6 148.0 41.1Q148.0 40.5 147.6 40.3Q147.2 40.0 146.4 40.0H144.1V38.9H146.2Q146.9 38.9 147.3 38.7Q147.7 38.4 147.7 37.9Q147.7 37.4 147.3 37.2Q146.9 36.9 146.2 36.9H144.2Z M159.2 43.2V35.8H160.6V43.2Z M172.7 43.2V40.3L173.0 41.1L169.8 35.8H171.2L173.8 40.1H173.0L175.6 35.8H176.9L173.7 41.1L174.0 40.3V43.2Z M186.1 43.2V35.8H191.5V37.0H187.5V42.1H191.7V43.2ZM187.4 40.0V38.9H191.1V40.0Z M203.8 43.3Q202.9 43.3 202.1 43.1Q201.3 42.8 200.9 42.4L201.4 41.4Q201.8 41.7 202.5 42.0Q203.1 42.2 203.8 42.2Q204.4 42.2 204.7 42.1Q205.1 41.9 205.3 41.7Q205.4 41.5 205.4 41.2Q205.4 40.9 205.2 40.7Q205.0 40.5 204.6 40.4Q204.2 40.2 203.7 40.1Q203.2 40.0 202.8 39.9Q202.3 39.7 201.9 39.5Q201.5 39.3 201.3 38.9Q201.0 38.5 201.0 37.9Q201.0 37.3 201.4 36.8Q201.7 36.3 202.3 36.0Q203.0 35.7 204.0 35.7Q204.7 35.7 205.3 35.9Q206.0 36.1 206.5 36.4L206.0 37.4Q205.6 37.2 205.0 37.0Q204.5 36.9 204.0 36.9Q203.4 36.9 203.1 37.0Q202.7 37.1 202.6 37.4Q202.4 37.6 202.4 37.9Q202.4 38.2 202.6 38.4Q202.9 38.6 203.3 38.7Q203.7 38.9 204.1 39.0Q204.6 39.1 205.1 39.2Q205.5 39.3 205.9 39.6Q206.3 39.8 206.6 40.2Q206.8 40.6 206.8 41.1Q206.8 41.7 206.5 42.2Q206.1 42.7 205.5 43.0Q204.8 43.3 203.8 43.3Z M219.9 43.3Q219.0 43.3 218.3 43.0Q217.6 42.8 217.1 42.2Q216.5 41.7 216.2 41.0Q215.9 40.4 215.9 39.5Q215.9 38.7 216.2 38.0Q216.5 37.3 217.1 36.8Q217.6 36.3 218.3 36.0Q219.0 35.7 219.9 35.7Q220.8 35.7 221.5 36.0Q222.2 36.3 222.8 36.8Q223.3 37.3 223.6 38.0Q223.9 38.7 223.9 39.5Q223.9 40.4 223.6 41.0Q223.3 41.7 222.8 42.3Q222.2 42.8 221.5 43.0Q220.8 43.3 219.9 43.3ZM219.9 42.1Q220.5 42.1 220.9 41.9Q221.4 41.7 221.8 41.4Q222.1 41.0 222.3 40.6Q222.5 40.1 222.5 39.5Q222.5 39.0 222.3 38.5Q222.1 38.0 221.8 37.7Q221.4 37.3 220.9 37.1Q220.5 36.9 219.9 36.9Q219.3 36.9 218.9 37.1Q218.4 37.3 218.0 37.7Q217.7 38.0 217.5 38.5Q217.3 39.0 217.3 39.5Q217.3 40.1 217.5 40.6Q217.7 41.0 218.0 41.4Q218.4 41.7 218.9 41.9Q219.3 42.1 219.9 42.1Z M233.6 43.2V35.8H236.9Q238.1 35.8 239.0 36.3Q239.9 36.8 240.4 37.6Q240.9 38.4 240.9 39.5Q240.9 40.6 240.4 41.5Q239.9 42.3 239.0 42.8Q238.1 43.2 236.9 43.2ZM235.0 42.1H236.8Q237.6 42.1 238.2 41.7Q238.9 41.4 239.2 40.9Q239.5 40.3 239.5 39.5Q239.5 38.8 239.2 38.2Q238.9 37.6 238.2 37.3Q237.6 37.0 236.8 37.0H235.0Z" fill="currentColor"/><path d="M2.8 43.2V40.3L3.1 41.1L-0.0 35.8H1.3L3.9 40.1H3.1L5.7 35.8H7.0L3.8 41.1L4.1 40.3V43.2Z M115.8 43.2V35.8H117.2V43.2ZM110.6 43.2V35.8H112.0V43.2ZM111.9 40.1V38.9H115.9V40.1Z" fill="#c9a227"/><path d="M83.1 37.1 l2.3 2.3 -2.3 2.3 -2.3 -2.3z" fill="#c9a227"/></g><path d="M267.0 8 V45.2746875" stroke="rgba(201,162,39,.6)" stroke-width="1"/><g transform="translate(284.0 4.0)"><rect x="1.4" y="35.8" width="12.4" height="7.9" rx="0.9" fill="currentColor"/><rect x="16.4" y="35.8" width="12.4" height="7.9" rx="0.9" fill="currentColor"/><rect x="31.5" y="35.8" width="12.4" height="7.9" rx="0.9" fill="currentColor"/><rect x="8.9" y="26.4" width="12.4" height="7.9" rx="0.9" fill="url(#yesod91g)"/><rect x="24.0" y="26.4" width="12.4" height="7.9" rx="0.9" fill="url(#yesod91g)"/><rect x="16.4" y="17.0" width="12.4" height="7.9" rx="0.9" fill="url(#yesod91g)"/></g></symbol></svg>';document.body.appendChild(d.firstChild);})();
const mark91=(h)=>'<svg class="yk91logo" viewBox="0 0 333 53" height="'+h+'" width="'+Math.round(h*333/53)+'" role="img" aria-label="יסוד שביסוד"><use href="#yesod91"/></svg>';
/* 🔗 כתובת האתר של יסוד שביסוד — כשיש כתובת, כותבים אותה כאן (https://...) והקרדיט נהיה קישור. ריק = בלי קישור.
   באפליקציה האופליין אין אינטרנט, אז שם הקרדיט אף פעם לא קישור */
const CREDIT_URL='https://yamshopping.com/yesod/';
const credit91=(big)=>{const tag=CREDIT_URL&&!OFF_APP?'a':'div';
  return '<'+tag+' class="yk91'+(big?' big':'')+'"'+(tag==='a'?' href="'+esc(CREDIT_URL)+'" target="_blank" rel="noopener"':' role="note"')+' aria-label="'+L('נוצר על ידי יסוד שביסוד','Created by Yesod Shebiyesod')+'">'+'<small class="yk91t">'+(OFF_APP||myApp?L('האפליקציה נוצרה על ידי','App created by'):L('האתר נוצר על ידי','Site created by'))+'</small>'+mark91(big?36:26)+'</'+tag+'>';};

/* ---------- 🆕 המסך ---------- */
function siteTab91(news){const c=CHANGELOG[0]||[];
  let h='<div class="wn91card now"><div class="wn91h"><b>🌐 '+L('מה חדש בגרסה','New in version')+' '+esc(c[0]||APP_VERSION)+'</b><small>'+esc(day91(c[1]))+'</small></div>'+ul91(lines91(c[3]))+
    (c[2]?'<p class="wn91was">'+esc(String(c[2]).replace(/^\s*מה היה:\s*/,L('לפני העדכון: ','Before: ')))+'</p>':'')+'</div>';
  if(news&&news.length)h+='<h4 class="wn91sec">📢 '+L('הודעות מהצוות','Team announcements')+'</h4>'+news.map(u=>'<div class="wn91card"><div class="wn91h"><b>'+esc(u.title||'')+'</b><small>'+esc(fmtDate(new Date(u.created_at)))+'</small></div>'+ul91(lines91(u.body))+'</div>').join('');
  const rest=CHANGELOG.slice(1);
  if(rest.length)h+='<h4 class="wn91sec">🕰️ '+L('היסטוריית עדכונים — האתר','Update history — site')+'</h4><div class="wn91tl">'+rest.map(([v,d,was,now])=>
    '<details><summary><span class="wn91v">'+esc(v)+'</span><span>'+L('גרסה ','Version ')+esc(v)+'</span><small>'+esc(day91(d))+'</small></summary>'+ul91(lines91(now))+'</details>').join('')+'</div>';
  return h;}
function appTab91(latest){
  const hist=APP_HIST.map(x=>Object.assign({},x));
  if(latest&&latest.version){const i=hist.findIndex(x=>x.v===String(latest.version)),e={v:String(latest.version),date:latest.date||'',notes:(latest.notes||[]).map(String)};if(i>=0)hist[i]=e;else hist.unshift(e);}
  const top=hist[0];let h='';
  if(myApp)h+='<p class="wn91mine">📱 '+L('אצלך מותקנת גרסה','You have version')+' <b>'+esc(myApp)+'</b>'+(older91(myApp,top.v)?' · <button type="button" class="wn91up" data-wn91up>🔄 '+L('יש גרסה חדשה','New version')+' '+esc(top.v)+'</button>':' · ✅ '+L('הכי חדשה','Up to date'))+'</p>';
  if(!OFF_APP){
    h+='<div class="wn91card now"><div class="wn91h"><b>📱 '+L('מה חדש באפליקציה — גרסה','New in the app — version')+' '+esc(top.v)+'</b><small>'+esc(day91(top.date))+'</small></div>'+ul91(top.notes)+'</div>';
    if(APP_NEXT&&older91(top.v,APP_NEXT.v))h+='<div class="wn91card next"><div class="wn91h"><b>🔜 '+L('בקרוב בגרסה','Coming in version')+' '+esc(APP_NEXT.v)+'</b></div>'+ul91(APP_NEXT.notes)+'</div>';
    h+='<h4 class="wn91sec">🕰️ '+L('היסטוריית עדכונים — האפליקציה לאנדרואיד','Update history — Android app')+'</h4><div class="wn91tl">'+hist.slice(1).map(x=>
      '<details><summary><span class="wn91v">'+esc(x.v)+'</span><span>'+L('גרסה ','Version ')+esc(x.v)+'</span><small>'+esc(day91(x.date))+'</small></summary>'+ul91(x.notes)+'</details>').join('')+'</div>';}
  const o=OFF_HIST[0];
  h+='<h4 class="wn91sec">📴 '+L('רשימת קניות אופליין','Offline shopping list')+(myOff?' · '+L('אצלך','yours')+' '+esc(myOff):'')+'</h4><div class="wn91tl">'+OFF_HIST.map((x,i)=>
    '<details'+(OFF_APP&&!i?' open':'')+'><summary><span class="wn91v">'+esc(x.v)+'</span><span>'+L('גרסה ','Version ')+esc(x.v)+(x===o?' · '+L('האחרונה','latest'):'')+'</span><small>'+esc(day91(x.date))+'</small></summary>'+ul91(x.notes)+'</details>').join('')+'</div>';
  return h;}
async function openWhatsNew(tab){
  tab=tab||(OFF_APP?'app':'site');
  const b=openSheet('🆕 '+L('מה חדש','What\'s new'),'<div class="empty">'+L('טוען...','Loading...')+'</div>');
  let latest=null,news=[];
  await Promise.all([
    (window.apkVer57&&!OFF_APP?apkVer57().then(v=>{latest=v;},()=>{}):Promise.resolve()),
    (sb?Promise.resolve(sb.from('site_updates').select('id,title,body,created_at,active').order('created_at',{ascending:false}).limit(10)).then(r=>{news=((r&&r.data)||[]).filter(u=>u.active!==false);},()=>{}):Promise.resolve())]);
  const appV=(latest&&latest.version)||(typeof APK_LATEST56!=='undefined'?APK_LATEST56:APP_HIST[0].v);
  const pill=(k,ic,lbl,v)=>'<button type="button" role="tab" class="wn91tab'+(tab===k?' on':'')+'" aria-selected="'+(tab===k)+'" data-wn91t="'+k+'"><span>'+ic+' '+lbl+'</span><b>'+L('גרסה ','v')+esc(v)+'</b></button>';
  const draw=()=>{b.innerHTML='<div class="wn91">'+
      '<div class="wn91tabs" role="tablist">'+pill('site','🌐',L('באתר','Site'),APP_VERSION)+pill('app',OFF_APP?'📴':'📱',L('באפליקציה','App'),OFF_APP?(myOff||OFF_HIST[0].v):(myApp||appV))+'</div>'+
      '<div role="tabpanel">'+(tab==='site'?siteTab91(news):appTab91(latest))+'</div>'+credit91(true)+'</div>';};
  draw();
  b.onclick=e=>{const t=e.target.closest('[data-wn91t]');if(t){tab=t.dataset.wn91t;draw();return;}
    if(e.target.closest('[data-wn91up]')){const s=$91('#apkGo56');if(s)s.click();else location.href='/#apk';}};}
window.openWhatsNew=openWhatsNew;

/* ---------- ☰ תחתית התפריט: שתי הגרסאות + הקרדיט ---------- */
(function(){const m=$91('#hMenu');if(!m||$91('#verFoot91'))return;
  const app=OFF_APP?'📴 '+L('אופליין','Offline')+' '+(myOff||OFF_HIST[0].v):'📱 '+L('אפליקציה','App')+' '+(myApp||APP_HIST[0].v);
  m.insertAdjacentHTML('beforeend','<div id="verFoot91"><button type="button" id="verBtn91" aria-label="'+L('מה חדש — גרסת האתר ','What\'s new — site version ')+esc(APP_VERSION)+'">🌐 '+L('אתר','Site')+' '+esc(APP_VERSION)+' · '+esc(app)+' · <u>'+L('מה חדש','What\'s new')+'</u></button>'+credit91(false)+'</div>');
  $91('#verBtn91').onclick=()=>openWhatsNew();
  /* באפליקציה — הגרסה האחרונה שמחכה להורדה, אם יש */
  if(!OFF_APP&&!myApp&&window.apkVer57)apkVer57().then(v=>{if(v&&v.version){const x=$91('#verBtn91');if(x)x.innerHTML=x.innerHTML.replace(' '+APP_HIST[0].v+' ·',' '+esc(v.version)+' ·');}},()=>{});})();

/* ---------- ℹ️ אודות: הגרסאות, כפתור "מה חדש" והקרדיט ---------- */
const _o91=openAbout;
openAbout=function(){const r=_o91.apply(this,arguments);try{const v=$91('#aboutBody .ver16');if(v&&!v.dataset.wn91){v.dataset.wn91='1';
  v.innerHTML='<span>🌐 '+L('גרסת האתר','Site version')+' <b>'+esc(APP_VERSION)+'</b></span>'+(OFF_APP?'<span>📴 '+L('גרסת האפליקציה','App version')+' <b>'+esc(myOff||OFF_HIST[0].v)+'</b></span>':'<span>📱 '+L('גרסת האפליקציה','App version')+' <b>'+esc(myApp||APP_HIST[0].v)+'</b></span>')+
    '<button type="button" class="btn sec" data-wn91open>🆕 '+L('מה חדש והיסטוריית עדכונים','What\'s new & update history')+'</button>';
  v.insertAdjacentHTML('afterend',credit91(true));
  v.querySelector('[data-wn91open]').onclick=()=>{$91('#aboutOverlay').classList.remove('open');openWhatsNew();};}}catch(e){console.warn('wn91 about',e);}return r;};

/* 👩‍🍳 "מה חדש?" ליאמי — פותח את המסך */
yamiStep(async raw=>{if(/^(מה חדש|מה חדש באתר|מה חדש באפליקציה|עדכונים|מה התחדש|היסטוריית עדכונים|איזו גרסה|גרסה)\??$/.test(String(raw||'').trim())){openWhatsNew();botSay('🆕 '+T('פתחתי את "מה חדש" — מה חדש באתר ובאפליקציה, והיסטוריית העדכונים','Opened what\'s new'));return true;}return false;});

const st=document.createElement('style');st.textContent=
  '.wn91tabs{display:flex;gap:8px;margin:0 0 10px}.wn91 .wn91tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 6px;border-radius:14px;border:1.5px solid var(--chipbr);background:var(--inputbg)!important;color:var(--text)!important;font:inherit;cursor:pointer;box-shadow:none}'+
  '.wn91 .wn91tab b{font-size:12px;color:var(--muted);font-weight:600}.wn91 .wn91tab.on{border-color:var(--hdr2);background:var(--hdr2)!important;color:#fff!important}.wn91 .wn91tab.on b{color:#fff;opacity:.85}'+
  '.wn91card{border:1px solid var(--chipbr);border-radius:14px;padding:10px 14px;margin:8px 0;background:var(--inputbg)}.wn91card.now{border-color:var(--hdr2);border-inline-start-width:4px}.wn91card.next{border-style:dashed}'+
  '.wn91h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}.wn91h small,.wn91tl small{color:var(--muted);font-size:12px}'+
  '.wn91ul{margin:6px 0 2px;padding-inline-start:18px}.wn91ul li{margin:4px 0;line-height:1.55;font-size:14px}.wn91was{margin:8px 0 0;font-size:12.5px;color:var(--muted);line-height:1.5}'+
  '.wn91sec{margin:16px 2px 6px;font-size:14px;color:var(--hdr2)}.wn91mine{margin:2px 2px 8px;font-size:14px}.wn91up{font:inherit;font-size:13px;border:0;background:var(--hdr2);color:#fff;border-radius:10px;padding:3px 10px;cursor:pointer}'+
  '.wn91tl{border-inline-start:2px solid var(--line);margin-inline-start:12px;padding-inline-start:0}.wn91tl details{position:relative;padding:2px 0 2px 0}'+
  '.wn91tl summary{display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;padding:6px 0;margin-inline-start:-13px}.wn91tl summary::-webkit-details-marker{display:none}'+
  '.wn91v{min-width:24px;height:24px;padding:0 5px;box-sizing:border-box;border-radius:12px;background:var(--panel);border:2px solid var(--hdr2);color:var(--hdr2);font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}'+
  '.wn91tl summary small{margin-inline-start:auto}.wn91tl details[open] .wn91v{background:var(--hdr2);color:#fff}.wn91tl .wn91ul{margin:0 0 8px;padding-inline-start:34px}'+
  'a.yk91{text-decoration:none;cursor:pointer}.yk91{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;margin:6px auto 2px;color:var(--muted)}.yk91t{font-size:10.5px;line-height:1.2}'+
  '.yk91logo{display:block;color:#13294b;max-width:100%;height:auto}html.dark .yk91logo,body.dark .yk91logo{color:#fff}'+
  '.yk91.big{margin:18px auto 6px;padding:12px 20px 10px;border:1px solid var(--chipbr);border-radius:16px;width:max-content;max-width:100%;box-sizing:border-box;background:linear-gradient(135deg,var(--inputbg),var(--chipbg))}.yk91.big .yk91t{font-size:12px}'+
  '#verFoot91{border-top:1px solid var(--line);margin-top:4px;padding:6px 0 2px;text-align:center}#hMenu #verBtn91{display:block;width:100%;text-align:center;font-size:11.5px;color:var(--muted);padding:6px 4px}#verBtn91 u{color:var(--hdr2);text-decoration:none;font-weight:700}'+
  '.ver16{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;font-size:13px;color:var(--muted);margin:14px 0 0}.ver16 b{color:var(--text)}.ver16 .btn{flex-basis:100%;max-width:320px}';
document.head.appendChild(st);
})();
