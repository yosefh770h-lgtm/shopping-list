/* 📣 הסל הזול בעיר — איזה מוצרים בסל היום. משותף לדף (js/pages/sal.js) ולבק אופיס (js/034.js, "📣 הסל הזול").
   ההגדרה נשמרת ב-site_config, במפתח "sal":
     {items:[[שם, ברקוד], ...], mode:'fixed'|'daily', count:12}
   fixed — אותם מוצרים כל יום (כל הרשימה).
   daily — כל יום מבחר אחר של count מוצרים מתוך הרשימה. הבחירה לפי התאריך בישראל, אז כל מי שנכנס באותו יום רואה אותו סל.
   auto  — האתר בוחר לבד (auto()): count מוצרים שהכי מחפשים השבוע ב"איפה הכי זול", ושבועיים לפני חג גם מוצרים לחג.
           כשאין מספיק חיפושים — הרשימה (כמו fixed).
   כשאין הגדרה — סל ברירת המחדל: 12 מוצרים שכ-72% מהסניפים מוכרים את כולם (נבדק מול השרת, נובמבר 2026).
   מוסיפים לסל (בבק אופיס ובדף) רק מוצר שנמכר בהרבה סניפים — אחרת ברוב החנויות יש מוצר אחר במקומו ואי אפשר להשוות.
   שם המוצר כולל את שם החברה ("חלב תנובה 3%"), כי אנשים רוצים לדעת איזה מוצר בדיוק. */
(function(){
'use strict';
const DEFAULT=[
  ['חלב תנובה 3% בקרטון 1 ליטר','7290004131074'],
  ['קוטג׳ שטראוס 5% 250 גרם','7290011194246'],
  ['גבינה לבנה סקי 5% 500 גרם','7290002824183'],
  ['שמנת חמוצה יטבתה 15% 200 מ״ל','7290000041858'],
  ['ספגטי אסם מס׳ 8 500 גרם','7290000060880'],
  ['אורז פרסי סוגת 1 ק״ג','7290000211442'],
  ['קפה נמס עלית 200 גרם','7290000176420'],
  ['מיונז תלמה 500 גרם','7290000111186'],
  ['מים מינרליים עדן 6×1.5 ליטר','7290019056973'],
  ['קורנפלקס אלופים תלמה 850 גרם','7290112494351'],
  ['שקדי מרק אסם 400 גרם','7290000063140'],
  ['שוקולד פרה עלית 100 גרם','7290008750677']];
const MIN=3,MAX=40,MIN_STORES=1000; /* בערך חצי מהסניפים בארץ; כל מוצרי ברירת המחדל מעל 1,450 */
const clean=a=>(Array.isArray(a)?a:[]).filter(i=>Array.isArray(i)&&/^\d{5,14}$/.test(String(i[1]||''))).map(i=>[String(i[0]||i[1]).slice(0,60),String(i[1])])
  .filter((i,n,all)=>all.findIndex(j=>j[1]===i[1])===n).slice(0,200);
const today=d=>{try{return (d||new Date()).toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});}catch(e){const x=d||new Date();return x.getFullYear()+'-'+(x.getMonth()+1)+'-'+x.getDate();}};
/* ערבוב קבוע לפי התאריך (אותו יום = אותו סדר) */
function seeded(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return ((h^=h>>>16)>>>0)/4294967296;};}
function pick(cfg,date){const items=clean(cfg&&cfg.items);if(items.length<MIN)return DEFAULT.slice();
  if(!cfg||cfg.mode!=='daily')return items.slice(0,MAX);
  const n=Math.max(MIN,Math.min(MAX,parseInt(cfg.count,10)||12,items.length));if(n>=items.length)return items;
  const r=seeded('sal'+today(date)),a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  const keep=new Set(a.slice(0,n).map(i=>i[1]));return items.filter(i=>keep.has(i[1])); /* בסדר של הרשימה */}
/* 🏷️ שם החברה מתוך היצרן בקובץ ("שטראוס בריאות בע״מ" → שטראוס, "מחלבת יטבתה" → יטבתה) */
const SKIP=/^(מחלבת|מחלבות|פסטה|מופק|ממקור|בזלתי|קבוצת|חברת|תעשיות|מפעלי|יבוא|שיווק|סלטי|לא|ידוע)$/;
const words=m=>String(m||'').replace(/בע["״'׳]?מ|בי\.?וי\.?|[()".,״]/g,' ').split(/\s+/).filter(w=>w.length>1);
function brand(m){return words(m).filter(w=>!SKIP.test(w))[0]||'';}
/* השם שנשמר בסל: השם מהקובץ + החברה, אם אף מילה מהשם של החברה לא כתובה בו כבר ("טחינה ... צבר" של "סלטי צבר" נשאר כמו שהוא) */
function label(p){const n=String(p.name||p.code||'').trim(),b=brand(p.manufacturer);return (b&&!words(p.manufacturer).some(w=>n.includes(w))?n+' · '+b:n).slice(0,60);}
const ok=p=>(p.stores||0)>=MIN_STORES;
const fmt=n=>Number(n||0).toLocaleString('he-IL');
/* מה כותבים ליד מוצר בתוצאות החיפוש */
const badge=p=>ok(p)?'✅ אותו מוצר בדיוק ב-'+fmt(p.stores)+' סניפים'+(p.chains?' ('+p.chains+' רשתות)':'')
  :'⚠️ רק ב-'+fmt(p.stores)+' סניפים — בשאר החנויות יש מוצר אחר, אז אי אפשר להשוות';
/* 🕯️ שבועיים לפני חג — מוצרים לחג (לפי לוח השנה העברי של האתר, js/089-hcal.js) */
const HOLI=[['חנוכה',['שמן קנולה','שמן זית']],['פורים',['יין אדום מתוק','במבה']],['פסח',['מצות','יין אדום מתוק']],['שבועות',['שמנת מתוקה','גבינה צהובה']],
  ['ראש השנה',['דבש','יין אדום מתוק']],['סוכות',['יין אדום מתוק','חומוס']],['ט"ו בשבט',['תמרים','צימוקים']]];
function holidayTerms(date){try{const H=window.Hcal;if(!H)return [];const rd=H.rdOf(date||new Date()),seen=new Set(),out=[];
  for(let i=0;i<14;i++)for(const e of H.events(rd+i,true)||[]){const h=HOLI.find(([k])=>String(e.base||'').includes(k));if(h&&!seen.has(h[0])){seen.add(h[0]);out.push(...h[1]);}}
  return out;}catch(e){return [];}}
/* 🤖 האתר בוחר: terms = מילות החיפוש הכי נפוצות השבוע (sal_top_searches), search(q) = חיפוש מוצרים בשרת המחירים.
   לכל מילה — המוצר שנמכר בהכי הרבה סניפים (רק מעל MIN_STORES, ורק אם המילה כתובה בשם שלו: "סוכר" לא יביא סוכריות מנטה), ולא שני מוצרים מאותו סוג (לפי המילה הראשונה בשם: לא שני "חלב") */
const kindOf=n=>String(n||'').replace(/["'׳״]/g,'').trim().split(/\s+/)[0];
async function auto({terms,search,count,date}){const n=Math.max(MIN,Math.min(MAX,parseInt(count,10)||12));
  const qs=[...new Set([...holidayTerms(date),...(terms||[])].map(q=>String(q||'').trim()).filter(q=>q.length>1))].slice(0,n*2+6);
  const res=await Promise.all(qs.map(q=>Promise.resolve().then(()=>search(q)).catch(()=>[])));
  const out=[],kinds=new Set();
  for(let i=0;i<qs.length&&out.length<n;i++){const w=kindOf(qs[i]),best=(res[i]||[]).filter(p=>ok(p)&&String(p.name||'').replace(/["'׳״]/g,'').includes(w)).sort((a,b)=>b.stores-a.stores)[0];if(!best)continue;
    const k=kindOf(best.name);if(kinds.has(k)||out.some(o=>o[1]===best.code))continue;kinds.add(k);out.push([label(best),best.code]);}
  return out;}
window.SalPick={DEFAULT,MIN,MAX,MIN_STORES,clean,pick,today,brand,label,ok,badge,auto,holidayTerms};
})();
