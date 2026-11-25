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
CHANGELOG.unshift(['22','2026-11-25',
  'מה היה: הצ\'אט עם הצוות היה פשוט, ולא היה אפשר לדעת אם ההודעה הגיעה.',
  'מה חדש:\n💬 צ\'אט חדש ומעוצב עם הצוות\n✓ נשלח · ✓✓ הגיע · ✓✓ כחול נקרא\n📋 העתקת הודעה בלחיצה\n😊 תגובה מהירה עם אימוג\'י ותשובה להודעה מסוימת']);
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
   והאותיות בצבע currentColor — כחול כהה במצב בהיר ולבן במצב כהה, והעומק בזהב. SVG ולא תמונה, כי נטפרי חוסם תמונות.
   כאן האבנים קרובות יותר לשם מאשר בקובץ המקורי (פחות רווח מימין) כדי שהלוגו ייראה באמצע */
(function(){if(document.getElementById('yesod91'))return;const d=document.createElement('div');d.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><symbol id="yesod91" viewBox="0 0 303 53"><defs><linearGradient id="yesod91g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1d27a"/><stop offset=".5" stop-color="#c9a227"/><stop offset="1" stop-color="#8a6512"/></linearGradient></defs><g transform="translate(4 4.0)"><defs><path id="yesod91p" d="M223.4 15.0V5.0H219.2V0.5H229.1V15.0Z M204.2 26.6Q200.9 26.6 198.4 25.1Q195.9 23.6 194.5 21.0Q193.1 18.3 193.0 14.7L193.0 12.7Q193.0 11.3 193.4 9.8Q193.8 8.4 194.5 7.1Q195.1 5.9 196.0 5.2Q196.0 5.1 196.1 5.1Q196.2 5.0 196.3 5.0L196.2 4.9Q195.5 5.0 194.4 5.3Q193.3 5.5 192.4 5.8L191.4 1.6Q193.1 1.1 195.1 0.7Q197.2 0.4 199.4 0.2Q201.5 0.0 203.4 0.0Q207.3 0.0 209.9 1.4Q212.6 2.8 214.0 5.4Q215.5 8.1 215.5 12.0V14.7Q215.5 18.3 214.1 21.0Q212.7 23.6 210.1 25.1Q207.6 26.6 204.2 26.6ZM204.2 21.9Q205.9 21.9 207.2 21.0Q208.4 20.1 209.1 18.5Q209.8 16.9 209.8 14.8V12.1Q209.8 9.7 209.2 8.0Q208.5 6.4 207.2 5.5Q205.9 4.6 204.1 4.6Q202.4 4.6 201.2 5.5Q200.0 6.4 199.4 8.2Q198.7 9.9 198.7 12.4V14.8Q198.7 16.9 199.4 18.5Q200.1 20.1 201.3 21.0Q202.6 21.9 204.2 21.9Z M180.4 26.1V5.0H177.9V0.5H186.1V26.1Z M153.2 0.5H174.6V5.0H170.2V26.1H164.5V5.0H153.2Z M113.2 0.5V20.6Q115.1 21.4 117.3 21.9Q119.5 22.4 121.4 22.4Q124.4 22.4 126.8 21.5Q129.1 20.7 130.5 18.9Q131.8 17.1 131.8 14.3V0.5H137.3V14.9Q137.3 18.0 136.1 20.2Q134.8 22.4 132.7 23.9Q130.5 25.4 127.7 26.1Q124.9 26.8 121.7 26.8Q118.3 26.8 114.7 26.0Q111.1 25.2 107.8 23.6V0.5ZM118.5 18.4Q119.1 17.6 119.4 16.1Q119.7 14.6 119.7 12.7V0.5H125.2V11.6Q125.2 13.8 124.6 15.6Q124.1 17.4 123.1 18.4Z M81.7 26.1V21.7H94.6L100.2 21.5L103.3 21.9V26.1ZM94.6 24.8V9.8Q94.6 7.3 93.4 6.1Q92.2 5.0 89.6 5.0H83.1V0.5H90.0Q95.0 0.5 97.6 3.0Q100.2 5.4 100.2 10.0V24.8Z M71.5 15.0V5.0H67.2V0.5H77.1V15.0Z M52.3 26.6Q49.0 26.6 46.5 25.1Q44.0 23.6 42.5 21.0Q41.1 18.3 41.1 14.7L41.0 12.7Q41.0 11.3 41.4 9.8Q41.8 8.4 42.5 7.1Q43.2 5.9 44.0 5.2Q44.1 5.1 44.2 5.1Q44.2 5.0 44.3 5.0L44.3 4.9Q43.6 5.0 42.5 5.3Q41.4 5.5 40.5 5.8L39.4 1.6Q41.1 1.1 43.2 0.7Q45.3 0.4 47.4 0.2Q49.6 0.0 51.5 0.0Q55.3 0.0 58.0 1.4Q60.7 2.8 62.1 5.4Q63.5 8.1 63.5 12.0V14.7Q63.5 18.3 62.1 21.0Q60.7 23.6 58.2 25.1Q55.7 26.6 52.3 26.6ZM52.3 21.9Q53.9 21.9 55.2 21.0Q56.5 20.1 57.2 18.5Q57.9 16.9 57.9 14.8V12.1Q57.9 9.7 57.2 8.0Q56.5 6.4 55.2 5.5Q53.9 4.6 52.2 4.6Q50.5 4.6 49.3 5.5Q48.1 6.4 47.4 8.2Q46.7 9.9 46.7 12.4V14.8Q46.7 16.9 47.4 18.5Q48.1 20.1 49.4 21.0Q50.6 21.9 52.3 21.9Z M28.4 26.1V5.0H25.9V0.5H34.1V26.1Z M1.2 0.5H22.7V5.0H18.3V26.1H12.6V5.0H1.2Z"/></defs><g fill="url(#yesod91g)"><use href="#yesod91p" x="4.2" y="4.2"/><use href="#yesod91p" x="3.5" y="3.5"/><use href="#yesod91p" x="2.8" y="2.8"/><use href="#yesod91p" x="2.1" y="2.1"/><use href="#yesod91p" x="1.4" y="1.4"/><use href="#yesod91p" x="0.7" y="0.7"/></g><use href="#yesod91p" fill="currentColor"/><path d="M15.5 42.8V35.4H20.9V36.6H16.9V41.7H21.1V42.8ZM16.8 39.6V38.5H20.5V39.6Z M32.5 42.9Q31.6 42.9 30.9 42.7Q30.1 42.4 29.6 42.1L30.1 41.0Q30.5 41.3 31.2 41.6Q31.8 41.8 32.5 41.8Q33.1 41.8 33.4 41.7Q33.8 41.5 34.0 41.3Q34.1 41.1 34.1 40.8Q34.1 40.5 33.9 40.3Q33.7 40.1 33.3 40.0Q32.9 39.8 32.4 39.7Q31.9 39.6 31.5 39.5Q31.0 39.4 30.6 39.1Q30.2 38.9 30.0 38.5Q29.8 38.1 29.8 37.5Q29.8 36.9 30.1 36.4Q30.4 35.9 31.1 35.6Q31.7 35.3 32.7 35.3Q33.4 35.3 34.1 35.5Q34.7 35.7 35.2 36.0L34.8 37.1Q34.3 36.8 33.7 36.6Q33.2 36.5 32.7 36.5Q32.2 36.5 31.8 36.6Q31.4 36.8 31.3 37.0Q31.1 37.2 31.1 37.5Q31.1 37.8 31.4 38.0Q31.6 38.2 32.0 38.3Q32.4 38.5 32.8 38.6Q33.3 38.7 33.8 38.8Q34.3 39.0 34.6 39.2Q35.0 39.4 35.3 39.8Q35.5 40.2 35.5 40.7Q35.5 41.3 35.2 41.8Q34.9 42.3 34.2 42.6Q33.5 42.9 32.5 42.9Z M47.9 42.9Q47.1 42.9 46.3 42.7Q45.6 42.4 45.1 41.9Q44.5 41.3 44.2 40.7Q43.9 40.0 43.9 39.1Q43.9 38.3 44.2 37.6Q44.5 36.9 45.1 36.4Q45.6 35.9 46.3 35.6Q47.1 35.3 47.9 35.3Q48.8 35.3 49.5 35.6Q50.2 35.9 50.8 36.4Q51.3 36.9 51.6 37.6Q51.9 38.3 51.9 39.1Q51.9 40.0 51.6 40.7Q51.3 41.4 50.8 41.9Q50.2 42.4 49.5 42.7Q48.8 42.9 47.9 42.9ZM47.9 41.7Q48.5 41.7 49.0 41.5Q49.4 41.4 49.8 41.0Q50.1 40.7 50.3 40.2Q50.5 39.7 50.5 39.1Q50.5 38.6 50.3 38.1Q50.1 37.6 49.8 37.3Q49.4 36.9 49.0 36.7Q48.5 36.5 47.9 36.5Q47.4 36.5 46.9 36.7Q46.4 36.9 46.1 37.3Q45.7 37.6 45.5 38.1Q45.3 38.6 45.3 39.1Q45.3 39.7 45.5 40.2Q45.7 40.7 46.1 41.0Q46.4 41.4 46.9 41.5Q47.4 41.7 47.9 41.7Z M61.0 42.8V35.4H64.2Q65.4 35.4 66.3 35.9Q67.2 36.4 67.7 37.2Q68.2 38.0 68.2 39.1Q68.2 40.3 67.7 41.1Q67.2 41.9 66.3 42.4Q65.4 42.8 64.2 42.8ZM62.3 41.7H64.1Q65.0 41.7 65.6 41.4Q66.2 41.0 66.5 40.5Q66.9 39.9 66.9 39.1Q66.9 38.4 66.5 37.8Q66.2 37.2 65.6 36.9Q65.0 36.6 64.1 36.6H62.3Z M95.2 42.9Q94.4 42.9 93.6 42.7Q92.8 42.4 92.3 42.1L92.8 41.0Q93.2 41.3 93.9 41.6Q94.5 41.8 95.2 41.8Q95.8 41.8 96.2 41.7Q96.5 41.5 96.7 41.3Q96.9 41.1 96.9 40.8Q96.9 40.5 96.6 40.3Q96.4 40.1 96.0 40.0Q95.6 39.8 95.1 39.7Q94.7 39.6 94.2 39.5Q93.7 39.4 93.3 39.1Q92.9 38.9 92.7 38.5Q92.5 38.1 92.5 37.5Q92.5 36.9 92.8 36.4Q93.1 35.9 93.8 35.6Q94.4 35.3 95.4 35.3Q96.1 35.3 96.8 35.5Q97.4 35.7 97.9 36.0L97.5 37.1Q97.0 36.8 96.4 36.6Q95.9 36.5 95.4 36.5Q94.9 36.5 94.5 36.6Q94.2 36.8 94.0 37.0Q93.8 37.2 93.8 37.5Q93.8 37.8 94.1 38.0Q94.3 38.2 94.7 38.3Q95.1 38.5 95.5 38.6Q96.0 38.7 96.5 38.8Q97.0 39.0 97.3 39.2Q97.7 39.4 98.0 39.8Q98.2 40.2 98.2 40.7Q98.2 41.3 97.9 41.8Q97.6 42.3 96.9 42.6Q96.2 42.9 95.2 42.9Z M123.3 42.8V35.4H128.7V36.6H124.7V41.7H128.9V42.8ZM124.6 39.6V38.5H128.3V39.6Z M138.0 42.8V35.4H141.5Q142.8 35.4 143.5 36.0Q144.2 36.5 144.2 37.4Q144.2 38.0 143.9 38.4Q143.7 38.8 143.2 39.0Q142.7 39.2 142.2 39.2L142.4 38.9Q143.0 38.9 143.5 39.1Q144.0 39.3 144.3 39.8Q144.6 40.2 144.6 40.8Q144.6 41.8 143.9 42.3Q143.1 42.8 141.7 42.8ZM139.4 41.8H141.6Q142.4 41.8 142.8 41.5Q143.2 41.3 143.2 40.7Q143.2 40.1 142.8 39.9Q142.4 39.6 141.6 39.6H139.3V38.6H141.3Q142.1 38.6 142.4 38.3Q142.8 38.1 142.8 37.5Q142.8 37.0 142.4 36.8Q142.1 36.5 141.3 36.5H139.4Z M153.7 42.8V35.4H155.0V42.8Z M166.5 42.8V39.9L166.8 40.8L163.6 35.4H165.0L167.6 39.7H166.8L169.4 35.4H170.7L167.5 40.8L167.8 39.9V42.8Z M179.2 42.8V35.4H184.6V36.6H180.6V41.7H184.8V42.8ZM180.5 39.6V38.5H184.2V39.6Z M196.2 42.9Q195.4 42.9 194.6 42.7Q193.8 42.4 193.3 42.1L193.8 41.0Q194.2 41.3 194.9 41.6Q195.5 41.8 196.2 41.8Q196.8 41.8 197.2 41.7Q197.5 41.5 197.7 41.3Q197.9 41.1 197.9 40.8Q197.9 40.5 197.6 40.3Q197.4 40.1 197.0 40.0Q196.6 39.8 196.1 39.7Q195.7 39.6 195.2 39.5Q194.7 39.4 194.3 39.1Q193.9 38.9 193.7 38.5Q193.5 38.1 193.5 37.5Q193.5 36.9 193.8 36.4Q194.1 35.9 194.8 35.6Q195.4 35.3 196.4 35.3Q197.1 35.3 197.8 35.5Q198.4 35.7 198.9 36.0L198.5 37.1Q198.0 36.8 197.4 36.6Q196.9 36.5 196.4 36.5Q195.9 36.5 195.5 36.6Q195.2 36.8 195.0 37.0Q194.8 37.2 194.8 37.5Q194.8 37.8 195.1 38.0Q195.3 38.2 195.7 38.3Q196.1 38.5 196.5 38.6Q197.0 38.7 197.5 38.8Q198.0 39.0 198.3 39.2Q198.7 39.4 199.0 39.8Q199.2 40.2 199.2 40.7Q199.2 41.3 198.9 41.8Q198.6 42.3 197.9 42.6Q197.2 42.9 196.2 42.9Z M211.6 42.9Q210.8 42.9 210.0 42.7Q209.3 42.4 208.8 41.9Q208.2 41.3 207.9 40.7Q207.7 40.0 207.7 39.1Q207.7 38.3 207.9 37.6Q208.2 36.9 208.8 36.4Q209.3 35.9 210.0 35.6Q210.8 35.3 211.6 35.3Q212.5 35.3 213.2 35.6Q213.9 35.9 214.5 36.4Q215.0 36.9 215.3 37.6Q215.6 38.3 215.6 39.1Q215.6 40.0 215.3 40.7Q215.0 41.4 214.5 41.9Q213.9 42.4 213.2 42.7Q212.5 42.9 211.6 42.9ZM211.6 41.7Q212.2 41.7 212.7 41.5Q213.1 41.4 213.5 41.0Q213.8 40.7 214.0 40.2Q214.2 39.7 214.2 39.1Q214.2 38.6 214.0 38.1Q213.8 37.6 213.5 37.3Q213.1 36.9 212.7 36.7Q212.2 36.5 211.6 36.5Q211.1 36.5 210.6 36.7Q210.1 36.9 209.8 37.3Q209.4 37.6 209.2 38.1Q209.0 38.6 209.0 39.1Q209.0 39.7 209.2 40.2Q209.4 40.7 209.8 41.0Q210.1 41.4 210.6 41.5Q211.1 41.7 211.6 41.7Z M224.7 42.8V35.4H227.9Q229.1 35.4 230.0 35.9Q230.9 36.4 231.4 37.2Q231.9 38.0 231.9 39.1Q231.9 40.3 231.4 41.1Q230.9 41.9 230.0 42.4Q229.1 42.8 227.9 42.8ZM226.1 41.7H227.8Q228.7 41.7 229.3 41.4Q229.9 41.0 230.2 40.5Q230.6 39.9 230.6 39.1Q230.6 38.4 230.2 37.8Q229.9 37.2 229.3 36.9Q228.7 36.6 227.8 36.6H226.1Z" fill="currentColor"/><path d="M2.8 42.8V39.9L3.1 40.8L-0.0 35.4H1.3L3.9 39.7H3.1L5.7 35.4H7.0L3.8 40.8L4.1 39.9V42.8Z M112.4 42.8V35.4H113.7V42.8ZM107.2 42.8V35.4H108.6V42.8ZM108.4 39.7V38.5H112.5V39.7Z" fill="#c9a227"/><path d="M80.4 36.8 l2.3 2.3 -2.3 2.3 -2.3 -2.3z" fill="#c9a227"/></g><path d="M246 8 V45" stroke="rgba(201,162,39,.6)" stroke-width="1"/><g transform="translate(255 4.0)"><rect x="1.3" y="35.5" width="12.3" height="7.9" rx="0.9" fill="currentColor"/><rect x="16.3" y="35.5" width="12.3" height="7.9" rx="0.9" fill="currentColor"/><rect x="31.3" y="35.5" width="12.3" height="7.9" rx="0.9" fill="currentColor"/><rect x="8.8" y="26.2" width="12.3" height="7.9" rx="0.9" fill="url(#yesod91g)"/><rect x="23.8" y="26.2" width="12.3" height="7.9" rx="0.9" fill="url(#yesod91g)"/><rect x="16.3" y="16.8" width="12.3" height="7.9" rx="0.9" fill="url(#yesod91g)"/></g></symbol></svg>';document.body.appendChild(d.firstChild);})();
const mark91=(h)=>'<svg class="yk91logo" viewBox="0 0 303 53" height="'+h+'" width="'+Math.round(h*303/53)+'" role="img" aria-label="יסוד שביסוד"><use href="#yesod91"/></svg>';
/* 🔗 כתובת האתר של יסוד שביסוד — כשיש כתובת, כותבים אותה כאן (https://...) והקרדיט נהיה קישור. ריק = בלי קישור.
   באפליקציה האופליין אין אינטרנט, אז שם הקרדיט אף פעם לא קישור */
const CREDIT_URL='https://www.yamshopping.com/yesod/'; /* כשנטפרי יפתחו את yesod.yamshopping.com — אפשר לעבור לשם */
const credit91=(big)=>{const tag=CREDIT_URL&&!OFF_APP?'a':'div';
  return '<'+tag+' class="yk91'+(big?' big':'')+'"'+(tag==='a'?' href="'+esc(CREDIT_URL)+'" target="_blank" rel="noopener"':' role="note"')+' aria-label="'+L('נוצר על ידי יסוד שביסוד','Created by Yesod Shebiyesod')+'">'+'<small class="yk91t">'+(OFF_APP||myApp?L('האפליקציה נוצרה על ידי','App created by'):L('האתר נוצר על ידי','Site created by'))+'</small>'+mark91(big?30:22)+'</'+tag+'>';};

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
  m.insertAdjacentHTML('beforeend','<div id="verFoot91"><button type="button" id="verBtn91" aria-label="'+L('מה חדש — גרסת האתר ','What\'s new — site version ')+esc(APP_VERSION)+'">🌐 '+L('אתר','Site')+' '+esc(APP_VERSION)+' · '+esc(app)+'</button>'+credit91(false)+'</div>');
  $91('#verBtn91').onclick=()=>openWhatsNew();
  /* באפליקציה — הגרסה האחרונה שמחכה להורדה, אם יש */
  if(!OFF_APP&&!myApp&&window.apkVer57)apkVer57().then(v=>{if(v&&v.version){const x=$91('#verBtn91');if(x)x.innerHTML=x.innerHTML.replace(' '+APP_HIST[0].v,' '+esc(v.version));}},()=>{});})();

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
  '#verFoot91{border-top:1px solid var(--line);margin-top:4px;padding:6px 0 2px;text-align:center}#hMenu #verBtn91{display:block;width:100%;text-align:center;font-size:11.5px;color:var(--muted);padding:6px 4px}'+
  '.ver16{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;font-size:13px;color:var(--muted);margin:14px 0 0}.ver16 b{color:var(--text)}.ver16 .btn{flex-basis:100%;max-width:320px}';
document.head.appendChild(st);
})();
