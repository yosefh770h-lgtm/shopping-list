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
/* הלוגו של יסוד שביסוד (company-site/logo/final/yesod-line-on-*.svg בתיקיית הפרויקט): נכנס לדף פעם אחת כ-symbol,
   והאותיות בצבע currentColor — כחול כהה במצב בהיר ולבן במצב כהה, והעומק בזהב. SVG ולא תמונה, כי נטפרי חוסם תמונות */
(function(){if(document.getElementById('yesod91'))return;const d=document.createElement('div');d.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><symbol id="yesod91" viewBox="0 0 251 48"><defs><path id="yesod91p" d="M232.9 17.5V8.3H229.0V2.6H240.2V17.5Z M214.0 29.0Q210.5 29.0 207.9 27.5Q205.3 26.0 203.8 23.3Q202.3 20.5 202.2 16.9L202.2 15.5Q202.2 14.3 202.5 13.0Q202.9 11.7 203.4 10.5Q203.9 9.3 204.5 8.6Q204.6 8.5 204.7 8.4Q204.8 8.4 204.8 8.3L204.8 8.2Q204.2 8.3 203.3 8.5Q202.3 8.8 201.7 8.9L200.4 3.6Q202.1 3.1 204.3 2.7Q206.4 2.4 208.7 2.2Q211.0 2.0 213.0 2.0Q217.1 2.0 220.0 3.4Q222.8 4.8 224.2 7.6Q225.7 10.3 225.7 14.4V16.9Q225.7 20.5 224.2 23.3Q222.8 26.0 220.2 27.5Q217.5 29.0 214.0 29.0ZM214.0 23.0Q215.3 23.0 216.3 22.3Q217.3 21.5 217.8 20.1Q218.4 18.7 218.4 16.9V14.6Q218.4 12.4 217.9 10.9Q217.4 9.4 216.4 8.7Q215.4 7.9 214.0 7.9Q212.5 7.9 211.6 8.7Q210.6 9.5 210.1 11.1Q209.6 12.6 209.5 15.0V16.9Q209.5 18.7 210.1 20.1Q210.6 21.5 211.6 22.3Q212.6 23.0 214.0 23.0Z M188.6 28.5V8.3H186.4V2.6H195.9V28.5Z M160.9 2.6H183.4V8.3H178.9V28.5H171.5V8.3H160.9Z M120.3 2.6V22.0Q122.1 22.7 124.2 23.2Q126.3 23.6 128.1 23.6Q131.0 23.6 133.3 22.8Q135.5 22.0 136.8 20.2Q138.1 18.5 138.1 15.7V2.6H145.2V16.5Q145.2 19.7 143.8 22.2Q142.5 24.6 140.2 26.2Q137.9 27.8 134.9 28.5Q131.8 29.3 128.4 29.3Q124.7 29.3 120.8 28.5Q116.9 27.6 113.3 25.9V2.6ZM124.8 20.0Q125.2 19.2 125.4 17.7Q125.6 16.2 125.6 14.5V2.6H132.6V12.9Q132.6 15.1 132.1 17.0Q131.6 19.0 130.8 20.0Z M86.8 28.5V22.8H99.0L106.3 22.6L109.3 23.1V28.5ZM99.0 26.8V11.7Q99.0 10.0 98.1 9.2Q97.1 8.3 95.3 8.3H88.2V2.6H95.9Q100.8 2.6 103.5 5.1Q106.3 7.6 106.3 12.1V26.8Z M75.3 17.5V8.3H71.3V2.6H82.5V17.5Z M56.3 29.0Q52.9 29.0 50.3 27.5Q47.7 26.0 46.2 23.3Q44.7 20.5 44.6 16.9L44.6 15.5Q44.6 14.3 44.9 13.0Q45.2 11.7 45.8 10.5Q46.3 9.3 46.9 8.6Q47.0 8.5 47.1 8.4Q47.1 8.4 47.2 8.3L47.2 8.2Q46.6 8.3 45.6 8.5Q44.7 8.8 44.1 8.9L42.7 3.6Q44.5 3.1 46.6 2.7Q48.8 2.4 51.1 2.2Q53.3 2.0 55.4 2.0Q59.5 2.0 62.3 3.4Q65.2 4.8 66.6 7.6Q68.1 10.3 68.1 14.4V16.9Q68.1 20.5 66.6 23.3Q65.2 26.0 62.5 27.5Q59.9 29.0 56.3 29.0ZM56.3 23.0Q57.7 23.0 58.7 22.3Q59.7 21.5 60.2 20.1Q60.8 18.7 60.8 16.9V14.6Q60.8 12.4 60.3 10.9Q59.8 9.4 58.8 8.7Q57.8 7.9 56.3 7.9Q54.9 7.9 53.9 8.7Q52.9 9.5 52.4 11.1Q51.9 12.6 51.9 15.0V16.9Q51.9 18.7 52.5 20.1Q53.0 21.5 54.0 22.3Q55.0 23.0 56.3 23.0Z M30.9 28.5V8.3H28.8V2.6H38.2V28.5Z M3.2 2.6H25.8V8.3H21.2V28.5H13.9V8.3H3.2Z"/></defs><g fill="#c9a227"><use href="#yesod91p" x="5.6" y="5.6"/><use href="#yesod91p" x="4.9" y="4.9"/><use href="#yesod91p" x="4.2" y="4.2"/><use href="#yesod91p" x="3.5" y="3.5"/><use href="#yesod91p" x="2.8" y="2.8"/><use href="#yesod91p" x="2.1" y="2.1"/><use href="#yesod91p" x="1.4" y="1.4"/><use href="#yesod91p" x="0.7" y="0.7"/></g><use href="#yesod91p" fill="currentColor"/><path d="M18.5 45.2V37.8H23.9V39.0H19.8V44.1H24.0V45.2ZM19.7 42.0V40.9H23.4V42.0Z M36.4 45.3Q35.5 45.3 34.7 45.1Q33.9 44.8 33.5 44.4L33.9 43.4Q34.4 43.7 35.0 44.0Q35.7 44.2 36.4 44.2Q37.0 44.2 37.3 44.1Q37.7 43.9 37.9 43.7Q38.0 43.5 38.0 43.2Q38.0 42.9 37.8 42.7Q37.5 42.5 37.1 42.4Q36.8 42.2 36.3 42.1Q35.8 42.0 35.4 41.9Q34.9 41.7 34.5 41.5Q34.1 41.3 33.9 40.9Q33.6 40.5 33.6 39.9Q33.6 39.3 33.9 38.8Q34.3 38.3 34.9 38.0Q35.6 37.7 36.6 37.7Q37.3 37.7 37.9 37.9Q38.6 38.1 39.1 38.4L38.6 39.4Q38.1 39.2 37.6 39.0Q37.1 38.9 36.6 38.9Q36.0 38.9 35.7 39.0Q35.3 39.1 35.2 39.4Q35.0 39.6 35.0 39.9Q35.0 40.2 35.2 40.4Q35.5 40.6 35.9 40.7Q36.2 40.9 36.7 41.0Q37.2 41.1 37.7 41.2Q38.1 41.3 38.5 41.6Q38.9 41.8 39.1 42.2Q39.4 42.6 39.4 43.1Q39.4 43.7 39.1 44.2Q38.7 44.7 38.1 45.0Q37.4 45.3 36.4 45.3Z M52.7 45.3Q51.9 45.3 51.2 45.0Q50.4 44.8 49.9 44.2Q49.3 43.7 49.0 43.0Q48.8 42.4 48.8 41.5Q48.8 40.7 49.0 40.0Q49.3 39.3 49.9 38.8Q50.4 38.3 51.2 38.0Q51.9 37.7 52.7 37.7Q53.6 37.7 54.3 38.0Q55.0 38.3 55.6 38.8Q56.1 39.3 56.4 40.0Q56.7 40.7 56.7 41.5Q56.7 42.4 56.4 43.0Q56.1 43.7 55.6 44.3Q55.0 44.8 54.3 45.0Q53.6 45.3 52.7 45.3ZM52.7 44.1Q53.3 44.1 53.8 43.9Q54.2 43.7 54.6 43.4Q54.9 43.0 55.1 42.6Q55.3 42.1 55.3 41.5Q55.3 41.0 55.1 40.5Q54.9 40.0 54.6 39.7Q54.2 39.3 53.8 39.1Q53.3 38.9 52.7 38.9Q52.2 38.9 51.7 39.1Q51.2 39.3 50.9 39.7Q50.5 40.0 50.3 40.5Q50.1 41.0 50.1 41.5Q50.1 42.1 50.3 42.6Q50.5 43.0 50.9 43.4Q51.2 43.7 51.7 43.9Q52.2 44.1 52.7 44.1Z M66.7 45.2V37.8H70.0Q71.2 37.8 72.1 38.3Q73.0 38.8 73.5 39.6Q74.0 40.4 74.0 41.5Q74.0 42.6 73.5 43.5Q73.0 44.3 72.1 44.8Q71.2 45.2 70.0 45.2ZM68.1 44.1H69.9Q70.7 44.1 71.3 43.7Q71.9 43.4 72.3 42.9Q72.6 42.3 72.6 41.5Q72.6 40.8 72.3 40.2Q71.9 39.6 71.3 39.3Q70.7 39.0 69.9 39.0H68.1Z M97.7 45.3Q96.9 45.3 96.1 45.1Q95.3 44.8 94.8 44.4L95.3 43.4Q95.7 43.7 96.4 44.0Q97.1 44.2 97.7 44.2Q98.3 44.2 98.7 44.1Q99.0 43.9 99.2 43.7Q99.4 43.5 99.4 43.2Q99.4 42.9 99.1 42.7Q98.9 42.5 98.5 42.4Q98.1 42.2 97.7 42.1Q97.2 42.0 96.7 41.9Q96.2 41.7 95.9 41.5Q95.5 41.3 95.2 40.9Q95.0 40.5 95.0 39.9Q95.0 39.3 95.3 38.8Q95.6 38.3 96.3 38.0Q97.0 37.7 98.0 37.7Q98.6 37.7 99.3 37.9Q99.9 38.1 100.4 38.4L100.0 39.4Q99.5 39.2 99.0 39.0Q98.4 38.9 98.0 38.9Q97.4 38.9 97.0 39.0Q96.7 39.1 96.5 39.4Q96.3 39.6 96.3 39.9Q96.3 40.2 96.6 40.4Q96.8 40.6 97.2 40.7Q97.6 40.9 98.1 41.0Q98.5 41.1 99.0 41.2Q99.5 41.3 99.9 41.6Q100.3 41.8 100.5 42.2Q100.7 42.6 100.7 43.1Q100.7 43.7 100.4 44.2Q100.1 44.7 99.4 45.0Q98.8 45.3 97.7 45.3Z M127.7 45.2V37.8H133.1V39.0H129.1V44.1H133.3V45.2ZM129.0 42.0V40.9H132.7V42.0Z M143.4 45.2V37.8H146.8Q148.2 37.8 148.9 38.4Q149.6 38.9 149.6 39.8Q149.6 40.3 149.3 40.8Q149.0 41.2 148.5 41.4Q148.1 41.6 147.5 41.6L147.7 41.3Q148.4 41.3 148.9 41.5Q149.4 41.7 149.6 42.1Q149.9 42.6 149.9 43.2Q149.9 44.2 149.2 44.7Q148.5 45.2 147.0 45.2ZM144.7 44.1H147.0Q147.7 44.1 148.1 43.9Q148.5 43.6 148.5 43.1Q148.5 42.5 148.1 42.3Q147.7 42.0 147.0 42.0H144.6V40.9H146.7Q147.4 40.9 147.8 40.7Q148.2 40.4 148.2 39.9Q148.2 39.4 147.8 39.2Q147.4 38.9 146.7 38.9H144.7Z M159.9 45.2V37.8H161.3V45.2Z M173.7 45.2V42.3L174.0 43.1L170.8 37.8H172.2L174.8 42.1H174.0L176.6 37.8H177.9L174.7 43.1L175.1 42.3V45.2Z M187.4 45.2V37.8H192.8V39.0H188.8V44.1H192.9V45.2ZM188.7 42.0V40.9H192.3V42.0Z M205.3 45.3Q204.4 45.3 203.6 45.1Q202.9 44.8 202.4 44.4L202.9 43.4Q203.3 43.7 204.0 44.0Q204.6 44.2 205.3 44.2Q205.9 44.2 206.2 44.1Q206.6 43.9 206.8 43.7Q206.9 43.5 206.9 43.2Q206.9 42.9 206.7 42.7Q206.5 42.5 206.1 42.4Q205.7 42.2 205.2 42.1Q204.7 42.0 204.3 41.9Q203.8 41.7 203.4 41.5Q203.0 41.3 202.8 40.9Q202.5 40.5 202.5 39.9Q202.5 39.3 202.9 38.8Q203.2 38.3 203.9 38.0Q204.5 37.7 205.5 37.7Q206.2 37.7 206.8 37.9Q207.5 38.1 208.0 38.4L207.6 39.4Q207.1 39.2 206.5 39.0Q206.0 38.9 205.5 38.9Q204.9 38.9 204.6 39.0Q204.2 39.1 204.1 39.4Q203.9 39.6 203.9 39.9Q203.9 40.2 204.1 40.4Q204.4 40.6 204.8 40.7Q205.2 40.9 205.6 41.0Q206.1 41.1 206.6 41.2Q207.0 41.3 207.4 41.6Q207.8 41.8 208.1 42.2Q208.3 42.6 208.3 43.1Q208.3 43.7 208.0 44.2Q207.6 44.7 207.0 45.0Q206.3 45.3 205.3 45.3Z M221.7 45.3Q220.8 45.3 220.1 45.0Q219.3 44.8 218.8 44.2Q218.3 43.7 218.0 43.0Q217.7 42.4 217.7 41.5Q217.7 40.7 218.0 40.0Q218.3 39.3 218.8 38.8Q219.3 38.3 220.1 38.0Q220.8 37.7 221.7 37.7Q222.5 37.7 223.2 38.0Q224.0 38.3 224.5 38.8Q225.0 39.3 225.3 40.0Q225.6 40.7 225.6 41.5Q225.6 42.4 225.3 43.0Q225.0 43.7 224.5 44.3Q224.0 44.8 223.2 45.0Q222.5 45.3 221.7 45.3ZM221.7 44.1Q222.2 44.1 222.7 43.9Q223.2 43.7 223.5 43.4Q223.9 43.0 224.1 42.6Q224.3 42.1 224.3 41.5Q224.3 41.0 224.1 40.5Q223.9 40.0 223.5 39.7Q223.2 39.3 222.7 39.1Q222.2 38.9 221.7 38.9Q221.1 38.9 220.6 39.1Q220.2 39.3 219.8 39.7Q219.4 40.0 219.3 40.5Q219.1 41.0 219.1 41.5Q219.1 42.1 219.3 42.6Q219.4 43.0 219.8 43.4Q220.1 43.7 220.6 43.9Q221.1 44.1 221.7 44.1Z M235.6 45.2V37.8H238.9Q240.1 37.8 241.0 38.3Q241.9 38.8 242.4 39.6Q242.9 40.4 242.9 41.5Q242.9 42.6 242.4 43.5Q241.9 44.3 241.0 44.8Q240.1 45.2 238.9 45.2ZM237.0 44.1H238.8Q239.6 44.1 240.2 43.7Q240.9 43.4 241.2 42.9Q241.5 42.3 241.5 41.5Q241.5 40.8 241.2 40.2Q240.9 39.6 240.2 39.3Q239.6 39.0 238.8 39.0H237.0Z" fill="currentColor"/><path d="M4.8 45.2V42.3L5.1 43.1L1.9 37.8H3.3L5.9 42.1H5.1L7.7 37.8H9.0L5.8 43.1L6.1 42.3V45.2Z M115.8 45.2V37.8H117.2V45.2ZM110.6 45.2V37.8H112.0V45.2ZM111.9 42.1V40.9H115.9V42.1Z" fill="#c9a227"/></symbol></svg>';document.body.appendChild(d.firstChild);})();
const mark91=(h)=>'<svg class="yk91logo" viewBox="0 0 251 48" height="'+h+'" width="'+Math.round(h*251/48)+'" role="img" aria-label="יסוד שביסוד"><use href="#yesod91"/></svg>';
/* 🔗 כתובת האתר של יסוד שביסוד — כשיש כתובת, כותבים אותה כאן (https://...) והקרדיט נהיה קישור. ריק = בלי קישור.
   באפליקציה האופליין אין אינטרנט, אז שם הקרדיט אף פעם לא קישור */
const CREDIT_URL='https://yamshopping.com/yesod/';
const credit91=(big)=>{const tag=CREDIT_URL&&!OFF_APP?'a':'div';
  return '<'+tag+' class="yk91'+(big?' big':'')+'"'+(tag==='a'?' href="'+esc(CREDIT_URL)+'" target="_blank" rel="noopener"':' role="note"')+' aria-label="'+L('נוצר על ידי יסוד שביסוד','Created by Yesod Shebiyesod')+'">'+'<small class="yk91t">'+(OFF_APP||myApp?L('האפליקציה נוצרה על ידי','App created by'):L('האתר נוצר על ידי','Site created by'))+'</small>'+mark91(big?34:20)+'</'+tag+'>';};

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
