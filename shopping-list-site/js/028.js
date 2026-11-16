
/* ================= v24: 🔁 פריטים קבועים (קניות חוזרות) + יאמי שואלת כשהיא לא בטוחה =================
   "תכניס לרשימה 3 חלב מדי יומיים" → נכנס "חלב" ×3 לרשימה, ומעכשיו נכנס שוב אוטומטית כל יומיים.
   כלל: {id,n,q,every:ימים|null,days:[0..6]|null,list,last,next,ts,del?,off?} — נשמר ב-state.recurring ומסונכרן עם הרשימות (כמו הסידורים).
   מנוע: בטעינה, כשחוזרים לאתר וכל שעה — כלל שהגיע זמנו מוסיף את הפריט פעם אחת (גם אם האתר היה סגור כמה תקופות),
   ולא מוסיף אם הפריט כבר ברשימה ולא סומן. מזהה הפריט קבוע לכל תקופה — כך ששני מכשירים לא יוסיפו אותו פעמיים. */
if(!SYNC_KEYS.includes('recurring'))SYNC_KEYS.push('recurring');
const RC24_MAX=100,RC24_DAYS_HE=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'],RC24_DAYS_EN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const RC24_DL=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','שבת'];
/* ---------- ניקוי (מהענן / מהמכשיר / מגיבוי) ---------- */
function rc24CleanOne(r){if(!r||typeof r!=='object'||Array.isArray(r))return null;
  const n=String(r.n==null?'':r.n).replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,80);if(!n||hasProfanity(n))return null;
  let every=Number(r.every);every=Number.isInteger(every)&&every>=1&&every<=365?every:null;
  let days=Array.isArray(r.days)?[...new Set(r.days.map(Number).filter(d=>Number.isInteger(d)&&d>=0&&d<=6))].sort():null;if(days&&!days.length)days=null;
  if(every)days=null;if(!every&&!days)return null;
  const now=Date.now(),ts=v=>{v=Number(v);return isFinite(v)&&v>0?v:0;};
  const o={id:cleanId(r.id),n,q:cleanStr(r.q==null?'':r.q,40).replace(/[<>]/g,''),every,days,list:r.list?cleanId(r.list):'',last:Math.min(ts(r.last),now+864e5),next:Math.min(ts(r.next),now+400*864e5),ts:Math.min(ts(r.ts),now+864e5)};
  if(r.del)o.del=true;if(r.off)o.off=true;return o;}
function rc24CleanArr(a){if(!Array.isArray(a))return [];const old=Date.now()-30*864e5;
  return a.map(rc24CleanOne).filter(r=>r&&!(r.del&&r.ts<old)).slice(-RC24_MAX*2);}
const _v24CleanRoom=cleanRoom;
cleanRoom=function(d){d=_v24CleanRoom.apply(this,arguments);if(d&&typeof d==='object'&&'recurring' in d){if(Array.isArray(d.recurring))d.recurring=rc24CleanArr(d.recurring);else delete d.recurring;}return d;};
state.recurring=rc24CleanArr(state.recurring);
/* סנכרון: לפי מזהה, השינוי האחרון מנצח (גם מחיקה — נשמרת כ-del עד 30 יום) */
const _v24ApplyRemote=applyRemote;
applyRemote=function(remote,replace){const r=_v24ApplyRemote.apply(this,arguments);
  if(remote&&Array.isArray(remote.recurring)){
    if(replace)state.recurring=remote.recurring;
    else{const m={};(state.recurring||[]).forEach(x=>m[x.id]=x);remote.recurring.forEach(x=>{if(x&&x.id&&(!m[x.id]||(x.ts||0)>(m[x.id].ts||0)))m[x.id]=x;});state.recurring=Object.values(m);}
    setTimeout(rc24Run,300);}
  return r;};
const rc24Live=()=>(state.recurring||[]).filter(r=>!r.del);
/* ---------- זמנים ---------- */
function rc24Day0(ts){const d=new Date(ts);d.setHours(0,0,0,0);return d;}
function rc24Next(r,from){const d=rc24Day0(from);
  if(r.every){d.setDate(d.getDate()+r.every);return d.getTime();}
  for(let k=1;k<=7;k++){const x=new Date(d);x.setDate(d.getDate()+k);if(r.days.includes(x.getDay()))return x.getTime();}
  d.setDate(d.getDate()+7);return d.getTime();}
function rc24DayKey(ts){const d=new Date(ts);return d.getFullYear()+''+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');}
function rc24When(ts){if(!ts)return '';const d=new Date(ts),t0=rc24Day0(Date.now()).getTime(),diff=Math.round((rc24Day0(ts).getTime()-t0)/864e5);
  const day=T(d.getDay()===6?'שבת':'יום '+RC24_DL[d.getDay()],RC24_DAYS_EN[d.getDay()])+' '+d.getDate()+'.'+(d.getMonth()+1);
  return diff<=0?T('היום','today'):diff===1?T('מחר, ','tomorrow, ')+day:day;}
function rc24Label(r){
  if(r.days){const names=r.days.map(d=>T(RC24_DAYS_HE[d],RC24_DAYS_EN[d]));
    if(names.length===1)return r.days[0]===6?T('כל שבת','every Saturday'):T('כל יום '+names[0],'every '+names[0]);
    return T('בימי '+names.slice(0,-1).join(', ')+' ו'+names[names.length-1],'on '+names.join(', '));}
  const e=r.every;
  if(e===1)return T('כל יום','every day');if(e===2)return T('כל יומיים','every 2 days');if(e===7)return T('כל שבוע','every week');if(e===14)return T('כל שבועיים','every 2 weeks');
  if(e===30)return T('כל חודש','every month');if(e===60)return T('כל חודשיים','every 2 months');if(e%7===0)return T('כל '+(e/7)+' שבועות','every '+(e/7)+' weeks');
  return T('כל '+e+' ימים','every '+e+' days');}
/* ---------- הוספה בפועל לרשימה ---------- */
function rc24List(r){let l=r.list&&state.lists.find(x=>x.id===r.list);if(!l){l=curList()||state.lists[0];if(l)r.list=l.id;}return l;}
/* מחזיר 'added' / 'had' (כבר ברשימה ולא סומן) / '' */
function rc24Put(r,periodTs){const l=rc24List(r);if(!l)return '';
  if(l.items.some(i=>!i.done&&norm(i.n)===norm(r.n)))return 'had';
  const id=cleanId('rc'+r.id+'_'+rc24DayKey(periodTs));
  if(l.items.some(i=>i.id===id)||(state.tomb&&state.tomb.items&&state.tomb.items[id]))return '';
  const now=Date.now();l.items.push({id,n:r.n,q:r.q||'',c:resolveCat(r.n),e:emojiOf(r.n),done:false,ts:now,by:'🔁 '+T('קבוע','recurring')});
  state.stats[r.n]=(state.stats[r.n]||0)+1;return 'added';}
let rc24Busy=false;
function rc24Run(){if(rc24Busy||!Array.isArray(state.recurring))return 0;if(typeof can15==='function'&&!can15('add'))return 0;
  rc24Busy=true;let n=0,ch=false;const now=Date.now();
  try{state.recurring.forEach(r=>{if(r.del||r.off||!r.next||r.next>now)return;
    if(rc24Put(r,r.next)==='added')n++;r.last=now;r.next=rc24Next(r,now);r.ts=now;ch=true;});
    if(ch){save();try{render();}catch(e){}if(n)flash('🔁 '+T('נוספו לרשימה '+n+' פריטים קבועים','Added '+n+' recurring items'));}}
  finally{rc24Busy=false;}return n;}
setTimeout(rc24Run,1500);
setInterval(rc24Run,3600e3);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')rc24Run();});
/* כלל חדש (או עדכון כלל קיים לאותו מוצר באותה רשימה). מחזיר {r,res,upd} */
function rc24Add(o){if(!Array.isArray(state.recurring))state.recurring=[];const l=(o.list&&state.lists.find(x=>x.id===o.list))||curList();const now=Date.now();
  const ex=rc24Live().find(r=>norm(r.n)===norm(o.n)&&r.list===l.id);
  const r=ex||{id:uid(),n:String(o.n).trim().slice(0,80),list:l.id,last:0};
  r.q=String(o.q||(ex&&ex.q)||'').slice(0,40);r.every=o.every||null;r.days=o.every?null:(o.days||null);r.ts=now;delete r.off;
  if(!r.every&&!r.days)r.every=7;
  let res='';const addNow=r.every||o.addNow||r.days.includes(new Date(now).getDay());
  if(addNow){res=rc24Put(r,now);r.last=now;}
  r.next=rc24Next(r,now);
  if(!ex){state.recurring.push(r);if(rc24Live().length>RC24_MAX){const old=rc24Live()[0];old.del=true;old.ts=now;}}
  save();try{render();}catch(e){}return {r,res,upd:!!ex};}
function rc24Remove(r){r.del=true;r.ts=Date.now();save();}
/* ---------- פענוח "כל כמה זמן" מתוך משפט ---------- */
const RC24_NUM={'שני':2,'שתי':2,'שניים':2,'שתיים':2,'שלושה':3,'שלוש':3,'ארבעה':4,'ארבע':4,'חמישה':5,'חמש':5,'שישה':6,'שש':6,'שבעה':7,'שבע':7,'שמונה':8,'עשרה':10,'עשר':10};
const RC24_NUMW=Object.keys(RC24_NUM).join('|');
const RC24_DAYW='(?:ה)?(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)';
const RC24_WD=new RegExp('(?:^|\\s)(?:כל|מדי|בכל|בימי|ימי)\\s+(?:יום\\s+|ימי\\s+|ערב\\s+)?('+RC24_DAYW+'(?:\\s*,\\s*(?:יום\\s+)?'+RC24_DAYW+'|\\s+ו(?:ב?יום\\s+)?'+RC24_DAYW+')*)(?!\\s+(?:ימים|שבועות|חודשים))(?=\\s|$)');
const RC24_EV=new RegExp('(?:^|\\s)(?:כל|מדי|בכל|אחת\\s+ל|פעם\\s+ב|פעם\\s+אחת\\s+ב)\\s*(\\d{1,3}|'+RC24_NUMW+')?\\s*(יום|ימים|יומיים|שבוע|שבועות|שבועיים|חודש|חודשים|חודשיים)(?=\\s|$)');
const RC24_TW=new RegExp('(?:^|\\s)(פעמיים|(\\d|שתי|שלוש|ארבע)\\s+פעמים)\\s+(?:ב|ל)(שבוע|חודש)(?=\\s|$)');
const RC24_DAILY=/(?:^|\s)(?:כל|מדי|בכל)\s+(?:בוקר|ערב|יום\s+ביומו)(?=\s|$)/;
const RC24_VAGUE=/(?:^|\s)(?:באופן\s+קבוע|באופן\s+אוטומטי|כפריט\s+קבוע|כקבוע|קבוע|קבועה|קבועים|כל\s+פעם|אוטומטית|תמיד|כל\s+הזמן)(?=\s|$)/;
function rc24DayIdx(w){w=w.replace(/^ו?(?:ב?יום\s+)?/,'').replace(/^ה(?=(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)$)/,'');const i=RC24_DAYS_HE.indexOf(w);return i===6?5:i;}
/* מחזיר {every,days,addNow,rest,label} או {vague:true,rest} או null */
function rc24ParseFreq(s){s=' '+norm(s).replace(/[-–—]/g,' ').replace(/\s+/g,' ')+' ';let m;
  if((m=s.match(RC24_WD))){const days=[...new Set(m[1].split(/\s*,\s*|\s+(?=ו)/).map(x=>rc24DayIdx(x.trim())).filter(i=>i>=0))].sort();
    if(days.length)return {days,rest:s.replace(m[0],' ')};}
  if((m=s.match(RC24_TW))){const k=m[1]==='פעמיים'?2:(RC24_NUM[m[2]]||parseInt(m[2],10)||2);
    if(m[3]==='חודש')return {every:Math.max(1,Math.round(30/k)),rest:s.replace(m[0],' ')};
    if(k<=1)return {every:7,rest:s.replace(m[0],' ')};
    const days=k===2?[0,3]:k===3?[0,2,4]:k===4?[0,2,4,5]:[0,1,2,3,4,5].slice(0,Math.min(6,k));return {days,addNow:true,rest:s.replace(m[0],' ')};}
  if((m=s.match(RC24_EV))){const n=m[1]?(RC24_NUM[m[1]]||parseInt(m[1],10)):null,u=m[2];
    const every=u==='יום'?(n||1):u==='ימים'?n:u==='יומיים'?2:u==='שבוע'?7*(n||1):u==='שבועות'?(n?7*n:null):u==='שבועיים'?14:u==='חודש'?30*(n||1):u==='חודשים'?(n?30*n:null):u==='חודשיים'?60:null;
    if(every&&every>=1&&every<=365)return {every,rest:s.replace(m[0],' ')};}
  if((m=s.match(RC24_DAILY)))return {every:1,rest:s.replace(m[0],' ')};
  if((m=s.match(RC24_VAGUE)))return {vague:true,rest:s.replace(m[0],' ')};
  return null;}
/* תשובה קצרה לשאלה "כל כמה זמן?" — "יומיים", "שבוע", "3 ימים", "כל יום ראשון" */
function rc24ParseFreqAnswer(t){t=norm(t).replace(/^(?:אז\s+|בערך\s+|נגיד\s+)/,'');let f=rc24ParseFreq(t);if(f&&!f.vague&&!f.rest.trim())return f;
  if(!/^(?:כל|מדי|פעם)\s/.test(t)){f=rc24ParseFreq('כל '+t);if(f&&!f.vague&&!f.rest.trim())return f;}
  return null;}
/* ---------- מה המוצר? ---------- */
const RC24_VERB='תוסיפי|תוסיף|הוסיפי|הוסף|תוסיפו|להוסיף|תכניסי|תכניס|הכניסי|הכנס|להכניס|תרשמי|תרשום|רשמי|רשום|לרשום|תשימי|תשים|שימי|שים|לשים|תזמיני|תזמין|תקני|תקנה|קני|קנה|לקנות';
const RC24_FILL='לי|לנו|גם|בבקשה|את|עוד|לרשימה|ברשימה|לרשימת\\s+הקניות|ברשימת\\s+הקניות|לקניות|לסל|אוטומטית|באופן\\s+אוטומטי|שוב|יאמי|ימי|אני\\s+רוצה|אני\\s+צריכה|אני\\s+צריך|רוצה|צריכה|צריך|ש|ו';
function rc24Strip(s){s=' '+norm(s)+' ';const rx=new RegExp('\\s(?:'+RC24_VERB+'|'+RC24_FILL+')(?=\\s)','g');let p;do{p=s;s=s.replace(rx,' ');}while(s!==p);return s.replace(/\s+/g,' ').trim();}
const rc24Known=n=>!!(P[n]||(state.customPantry||[]).includes(n));
/* מוצר "בטוח": מוכר באתר, או (כשביקשו במפורש להוסיף) עד 3 מילים בלי מספרים, פעלים ומילות זמן */
function rc24OkName(n,explicit){if(!n||hasProfanity(n))return false;if(rc24Known(n))return true;
  return !!explicit&&n.split(' ').length<=3&&!/\d/.test(n)&&!yamiNotProduct(n);}
/* ניחוש: מוצר מוכר שמופיע בתוך המשפט ("חלב כי נגמר לנו" → חלב) */
function rc24Guess(s){const w=norm(s).split(' ').filter(Boolean);
  for(let len=3;len>=1;len--)for(let i=0;i+len<=w.length;i++){const c=w.slice(i,i+len).join(' ');const k=NORMP[c]||NORMP[c.replace(/^ה/,'')];
    if(k&&!/^(כל|יום|שבוע|חודש)$/.test(c)){const pq=w[i-1]&&/^\d{1,3}$/.test(w[i-1])?w[i-1]:'';return {n:k,q:pq};}}
  return null;}
/* פירוק לפריטים: {items:[{n,q}], unsure:bool (חלק נוחשו), none:bool (אין שום מוצר) } */
function rc24Items(text,explicit){const rest=rc24Strip(text);if(!rest)return {items:[],none:true};
  const its=parseItems(rest).slice(0,8);const out=[];let unsure=false,none=false;
  its.forEach(i=>{if(rc24OkName(i.name,explicit)){out.push({n:i.name,q:i.qty||''});return;}
    const g=rc24Guess(i.name);if(g){out.push({n:g.n,q:i.qty||g.q});unsure=true;}else none=true;});
  if(!its.length)none=true;return {items:out,unsure,none:none&&!out.length,partial:none&&out.length>0};}
/* ---------- תשובות יאמי (עם כפתורי תשובה מהירה) ---------- */
function rc24Say(txt,chips){botSay(txt);const m=state.bot[state.bot.length-1];if(m&&chips&&chips.length){m.chips=chips.slice(0,5);save(true);renderBot();}}
const RC24_CH_LIST={l:'🔁 '+T('הפריטים הקבועים','Recurring items'),a:'rc'};
const RC24_CH_FREQ=()=>[{l:T('כל יום','Every day'),s:'כל יום'},{l:T('כל יומיים','Every 2 days'),s:'כל יומיים'},{l:T('כל שבוע','Every week'),s:'כל שבוע'},{l:T('כל חודש','Every month'),s:'כל חודש'},{l:T('רק הפעם','Just once'),s:'רק הפעם'}];
const rc24ItemTxt=i=>(i.q?i.q+' ':'')+i.n;
function rc24Confirm(items,f){const out=[],had=[],when=[];let upd=false;
  items.forEach(i=>{const x=rc24Add({n:i.n,q:i.q,every:f.every,days:f.days,addNow:f.addNow,list:f.list});if(x.upd)upd=true;
    if(x.res==='added')out.push(rc24ItemTxt(i));else if(x.res==='had')had.push(i.n);when.push(x.r);});
  const r=when[0];const lab=rc24Label(r),nx=rc24When(r.next),names=items.map(rc24ItemTxt).join(', ');
  const lname=(rc24List(r)||{}).name||'';const lpart=state.lists.length>1&&lname?T(' "'+lname+'"',' "'+lname+'"'):'';
  let txt;
  if(out.length)txt='✅ '+T('הוספתי '+out.join(', ')+' לרשימה'+lpart+', ואוסיף שוב אוטומטית '+lab+' (הבא: '+nx+')','Added '+out.join(', ')+' to the list, and I will add again automatically '+lab+' (next: '+nx+')');
  else if(had.length)txt='✅ '+T(had.join(', ')+' כבר ברשימה'+lpart+' — לא הוספתי שוב. מעכשיו אוסיף אוטומטית '+lab+' (הבא: '+nx+')',had.join(', ')+' is already on the list. From now on I will add it '+lab+' (next: '+nx+')');
  else txt='🔁 '+T('מעולה! אוסיף '+names+' לרשימה'+lpart+' אוטומטית '+lab+' (הבא: '+nx+')','Great! I will add '+names+' automatically '+lab+' (next: '+nx+')');
  if(out.length&&had.length)txt+='\n'+T('('+had.join(', ')+' כבר ברשימה — לא הוספתי שוב)','('+had.join(', ')+' already on the list)');
  if(upd)txt+='\n'+T('(עדכנתי את הפריט הקבוע שהיה)','(updated the existing recurring item)');
  rc24Say(txt,[RC24_CH_LIST,{l:'↩️ '+T('בטלי את הקבוע','Undo recurring'),s:'בטלי את '+items[0].n+' הקבוע'}]);return true;}
function rc24AddOnce(items){items.forEach(i=>addItem(i.n,i.q||''));save();render();
  botSay(pick(['רשמתי לרשימה ✅','נוסף 🛒','בוצע 💪'])+'\n'+items.map(i=>'• '+i.n+(i.q?' ×'+i.q:'')).join('\n'));return true;}
function rc24ListTxt(){const rs=rc24Live();if(!rs.length)return T('עוד אין פריטים קבועים 🙂\nאפשר לכתוב לי למשל: "3 חלב כל יומיים" או "לחם כל יום ראשון".','No recurring items yet. Try: "3 milk every 2 days".');
  return '🔁 '+T('הפריטים הקבועים שלך:','Your recurring items:')+'\n'+rs.map(r=>'• '+rc24ItemTxt(r)+' — '+rc24Label(r)+(r.off?' ⏸️':' ('+T('הבא: ','next: ')+rc24When(r.next)+')')).join('\n');}
/* שאלה פתוחה של יאמי: {stage:'confirm'|'freq'|'name', items, f} */
let rc24Ask=null;
const RC24_YES='כן|נכון|בדיוק|בטח|סבבה|אוקיי|אוקי|יאללה|תוסיפי|תוסיף|הוסיפי|בסדר|אשמח|יופי|כן תוסיפי|ברור|רוצה|מאשרת|מאשר';
const RC24_NO='לא|לא תודה|בטל|ביטול|בטלי|עזבי|עזוב|תעזבי|לא צריך|אל תוסיפי|טעות|לא נכון|לא רוצה|לא משנה';
function rc24Find(name){let n=norm(name).replace(/^(?:את\s+)?/,'').trim();const rs=rc24Live();
  const t=[n,n.replace(/^ה/,''),NORMP[n],NORMP[n.replace(/^ה/,'')]].filter(Boolean);
  return rs.filter(r=>t.includes(norm(r.n)));}
async function v24BotPre(raw){
  const t=norm(raw);const src=String(raw||'');
  const looksQ=/[?？]\s*$/.test(src.trim())||/^(מה|איך|למה|מי|מתי|איפה|כמה|האם|היכן|אפשר|איזה|אילו)(\s|$)/.test(t)||YAMI_ASK.test(t);
  /* 1. תשובה לשאלה ששאלתי */
  if(rc24Ask){const a=rc24Ask;rc24Ask=null;
    if(yamiOnly(t,RC24_NO,'תודה'))return botSay(T('בסדר, לא הוספתי כלום 🙂 אפשר לכתוב רק את שם המוצר, למשל: "חלב" או "חלב כל יומיים".','OK, nothing added.')),true;
    if(a.stage==='confirm'){if(yamiOnly(t,RC24_YES,'לרשימה|אותו|אותה|אותם|את זה'))return a.f?rc24Confirm(a.items,a.f):rc24AddOnce(a.items);}
    else if(a.stage==='freq'){if(/^(?:רק\s+)?(?:הפעם|פעם\s+אחת|עכשיו|רק\s+עכשיו|לא\s+קבוע|רק\s+פעם\s+אחת)$/.test(t))return rc24AddOnce(a.items);
      const f=rc24ParseFreqAnswer(t);if(f)return rc24Confirm(a.items,Object.assign({list:a.f&&a.f.list},f));}
    else if(a.stage==='name'&&!looksQ){const p=rc24Items(t,true);
      if(p.items.length&&!p.unsure&&!p.partial)return a.f?rc24Confirm(p.items,a.f):rc24AddOnce(p.items);
      if(p.items.length){rc24Ask={stage:'confirm',items:p.items,f:a.f};rc24Say(T('רצית שאוסיף '+p.items.map(i=>'"'+rc24ItemTxt(i)+'"').join(', ')+(a.f&&a.f.every||a.f&&a.f.days?' '+rc24Label(a.f):'')+'?','Add '+p.items.map(rc24ItemTxt).join(', ')+'?'),[{l:'✅ '+T('כן, תוסיפי','Yes, add'),s:'כן'},{l:T('לא','No'),s:'לא'}]);return true;}}
    /* לא ענו על השאלה — ממשיכים כרגיל עם ההודעה החדשה */
  }
  /* 2. "מה הפריטים הקבועים שלי?" */
  if(/(?:^|\s)(?:ה)?(?:פריטים|מוצרים|קניות|דברים)\s+(?:ה)?(?:קבועים|קבועות|חוזרים|חוזרות|אוטומטיים)(?=\s|$)/.test(t)&&!/^(?:תוסיפי|תוסיף|הוסיפי|הוסף|תכניסי|תכניס)\s/.test(t)){
    if(/(?:תמחקי|מחקי|בטלי|תבטלי|תפסיקי)\s+(?:את\s+)?(?:כל\s+)?(?:ה)?(?:פריטים|מוצרים|קניות)/.test(t)){openRc24();botSay(T('פתחתי את הפריטים הקבועים — אפשר למחוק כל אחד בלחיצה על 🗑️','Opened recurring items.'));return true;}
    rc24Say(rc24ListTxt(),[RC24_CH_LIST]);return true;}
  /* 3. "תפסיקי להוסיף חלב" / "בטלי את החלב הקבוע" */
  let rm=t.match(/^(?:תפסיקי|תפסיק|הפסיקי|הפסק|להפסיק|די|אל|לא)\s+(?:עם\s+)?(?:להוסיף|להכניס|לרשום|תוסיפי|תוסיף|תכניסי|לשים)\s+(?:לי\s+|את\s+|יותר\s+|כל\s+פעם\s+|אוטומטית\s+)*(.+)$/);
  if(!rm)rm=t.match(/^(?:בטלי|תבטלי|בטל|תבטל|לבטל|מחקי|תמחקי|מחק|תמחק|תורידי|תוריד|הורידי|הסירי|הסר|תסירי)\s+(?:לי\s+)?(?:את\s+)?(.+?)\s+(?:ה)?(?:קבוע|קבועה|קבועים|קבועות|אוטומטי|אוטומטית|חוזר|חוזרת|מהקבועים|מהפריטים\s+הקבועים)$/);
  if(!rm){const m2=t.match(/^(?:בטלי|תבטלי|בטל|מחקי|תמחקי|תפסיקי)\s+(?:את\s+)?(?:ה)?(?:פריט\s+)?(?:ה)?(?:קבוע|אוטומטי)\s+(?:של\s+)?(.+)$/);if(m2)rm=m2;}
  if(rm){const name=rm[1].replace(/\s+(?:יותר|כבר|אוטומטית|לרשימה|כל\s+.+|מדי\s+.+)$/,'').trim();const hits=rc24Find(name);
    if(hits.length){hits.forEach(rc24Remove);try{render();}catch(e){}rc24Say('🛑 '+T('הפסקתי להוסיף '+hits[0].n+' אוטומטית. (מה שכבר ברשימה — נשאר)','Stopped adding '+hits[0].n+' automatically.'),[RC24_CH_LIST]);return true;}
    if(rc24Live().length||/(קבוע|אוטומט|תפסיק|הפסיק|יותר)/.test(t)){rc24Say('🤔 '+T('לא מצאתי פריט קבוע בשם "'+name+'".','No recurring item named "'+name+'".')+'\n'+rc24ListTxt(),rc24Live().length?[RC24_CH_LIST]:null);return true;}
  }
  /* 4. בקשת הוספה — עם "כל כמה זמן" (או בלי, כשהמוצר לא ברור) */
  if(looksQ)return false;
  const explicit=new RegExp('^(?:'+RC24_VERB+')(\\s|$)').test(t)||new RegExp('(?:^|\\s)(?:'+RC24_VERB+')\\s').test(' '+t.split(' ').slice(0,4).join(' ')+' ');
  const f=rc24ParseFreq(t);
  if(f){const rest=f.rest;const ln=rest.match(/(?:^|\s)(?:ל|ב)רשימת\s+(.+)$/);let list='';let restTxt=rest;
    if(ln){const lists=(state.lists||[]).slice().sort((x,y)=>norm(y.name).length-norm(x.name).length);const l=lists.find(x=>{const n=norm(x.name);return n&&(ln[1].trim()===n||ln[1].trim().startsWith(n+' '));});
      if(l){list=l.id;restTxt=rest.replace(ln[0],' ')+' '+ln[1].trim().slice(norm(l.name).length);}}
    const p=rc24Items(restTxt,explicit);
    if(f.vague){if(!explicit||!p.items.length||p.unsure)return false;
      rc24Ask={stage:'freq',items:p.items,f:{list}};rc24Say(T('כל כמה זמן להוסיף '+p.items.map(i=>i.n).join(', ')+'? 🙂','How often should I add '+p.items.map(i=>i.n).join(', ')+'?'),RC24_CH_FREQ());return true;}
    const ff={every:f.every||null,days:f.days||null,addNow:!!f.addNow,list};
    if(p.items.length&&!p.unsure&&!p.partial){if(typeof clearFlows19==='function')clearFlows19();return rc24Confirm(p.items,ff);}
    if(!explicit&&!(p.items.length&&p.unsure))return false;
    if(typeof clearFlows19==='function')clearFlows19();
    if(p.items.length){rc24Ask={stage:'confirm',items:p.items,f:ff};
      rc24Say(T('רצית שאוסיף '+p.items.map(i=>'"'+rc24ItemTxt(i)+'"').join(', ')+' לרשימה '+rc24Label(ff)+'?','Add '+p.items.map(rc24ItemTxt).join(', ')+' '+rc24Label(ff)+'?'),[{l:'✅ '+T('כן, תוסיפי','Yes, add'),s:'כן'},{l:T('לא','No'),s:'לא'}]);return true;}
    rc24Ask={stage:'name',items:[],f:ff};rc24Say(T('מה להוסיף '+rc24Label(ff)+'? 🙂 (רק שם המוצר, למשל: חלב)','What should I add '+rc24Label(ff)+'?'));return true;}
  /* 5. "תוסיפי חלב כי נגמר לנו" — לא מכניסים משפט שלם לרשימה; שואלים אם התכוונו ל"חלב" */
  if(/^תוסיפי\s/.test(t)){const body=t.slice(7);
    if(/^(?:(?:ל|ב)רשימת\s|מתכון|את\s+הכל|הכל|הכול)/.test(body))return false;
    const its=parseItems(body);if(!its.length||its.length>8)return false;
    const bad=its.filter(i=>!rc24Known(i.name)&&(yamiNotProduct(i.name)||i.name.split(' ').length>4));if(!bad.length)return false;
    const p=rc24Items(body,true);
    if(p.items.length){if(typeof clearFlows19==='function')clearFlows19();rc24Ask={stage:'confirm',items:p.items,f:null};
      rc24Say(T('רצית שאוסיף '+p.items.map(i=>'"'+rc24ItemTxt(i)+'"').join(', ')+' לרשימה?','Did you want me to add '+p.items.map(rc24ItemTxt).join(', ')+'?'),[{l:'✅ '+T('כן, תוסיפי','Yes, add'),s:'כן'},{l:T('לא','No'),s:'לא'}]);return true;}
    /* בלי שום מוצר מוכר: עם בינה מלאכותית — היא תבין; בלעדיה — שואלים מה להוסיף */
    if(!aiOff&&sb&&authUser)return false;
    if(typeof clearFlows19==='function')clearFlows19();
    rc24Ask={stage:'name',items:[],f:null};botSay(T('לא בטוחה שהבנתי מה להוסיף 🤔 מה בדיוק לרשום ברשימה? (רק שם המוצר, למשל: חלב)','Not sure what to add — which product?'));return true;}
  return false;}
yamiStep(v24BotPre);
/* "בטל" / מעבר נושא עוצרים גם את השאלה שלי */
const _v24OpenFlows=openFlows19,_v24ClearFlows=clearFlows19;
openFlows19=function(){return !!rc24Ask||_v24OpenFlows.apply(this,arguments);};
clearFlows19=function(){rc24Ask=null;return _v24ClearFlows.apply(this,arguments);};
/* ---------- משפט לא נכנס לרשימה כמוצר ---------- */
const _v24NotProduct=yamiNotProduct;
const RC24_NP_TIME=/(?:^|\s)(?:כל|מדי|פעם|פעמיים|פעמים|יומיים|שבוע|שבועיים|שבועות|בשבוע|לשבוע|חודש|חודשיים|חודשים|בחודש|לחודש|ימים|אתמול|מחר|מחרתיים|קבוע|קבועה|קבועים|באופן|אוטומטית|תמיד)(?=\s|$)/;
const RC24_NP_VERB=/(?:^|\s)(?:נגמר|נגמרה|נגמרו|נגמרים|צריך|צריכה|צריכים|רוצה|רוצים|תוסיפי|תוסיף|להוסיף|לקנות|קניתי|תקני|תזכירי|תזכיר|תכניסי|תכניס|תשימי|תשים|תרשמי|תרשום|לרשום|שאני|שאת|שיש|שאין|כדי|בגלל|אמרתי|ביקשתי|תעשי|לעשות|יהיה|היה|הייתה|תביאי|הבאתי|אכלנו|אכלתי|שתינו|כי|אין|אבל|לנו)(?=\s|$)/;
yamiNotProduct=function(name){const n=String(name||'').trim();if(_v24NotProduct(n))return true;
  if(NORMP[norm(n)])return false;
  return n.split(/\s+/).length>5||RC24_NP_TIME.test(n)||RC24_NP_VERB.test(n);};
/* ---------- כפתורי תשובה מהירה בהודעה האחרונה של יאמי ---------- */
(function(){const st=document.createElement('style');st.textContent=
  '.qr24{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px;max-width:85%}'+
  '.qr24 button{font:inherit;font-size:14px;border:1px solid var(--hdr2);background:var(--recv);color:var(--text);border-radius:16px;padding:6px 12px;cursor:pointer;min-height:34px}'+
  '.qr24 button:hover,.qr24 button:focus-visible{background:var(--sent)}'+
  '.rc24row{border:1px solid var(--line);border-radius:12px;padding:10px;margin-bottom:10px;background:var(--recv)}'+
  '.rc24top{display:flex;align-items:center;gap:8px}.rc24top .em{font-size:22px}.rc24top b{flex:1;min-width:0;overflow-wrap:anywhere}'+
  '.rc24top button{background:none;border:1px solid var(--chipbr);border-radius:10px;cursor:pointer;font-size:15px;padding:4px 8px;color:var(--text)}'+
  '.rc24ed{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:flex-end}.rc24ed label{display:flex;flex-direction:column;font-size:12px;color:var(--muted);gap:3px}'+
  '.rc24ed input,.rc24ed select{width:auto!important;min-width:0;margin:0!important;padding:7px 9px!important;font-size:14px!important}.rc24ed input[data-f=q]{width:76px!important}'+
  '.rc24wd{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.rc24wd label{display:inline-flex;align-items:center;gap:3px;font-size:13px;color:var(--text);border:1px solid var(--chipbr);border-radius:12px;padding:3px 8px;cursor:pointer}'+
  '.rc24wd input{width:auto!important;margin:0!important}'+
  '.rc24nx{display:block;font-size:12px;color:var(--muted);margin-top:6px}'+
  '.rc24new{border-top:1px dashed var(--chipbr);padding-top:10px;margin-top:6px}.rc24new .rc24ed input[data-f=n]{width:150px!important}'+
  '.rc24off b{opacity:.6}';
  document.head.appendChild(st);})();
const _v24RenderBot=renderBot;
renderBot=function(){const r=_v24RenderBot.apply(this,arguments);
  try{const last=state.bot[state.bot.length-1];if(window.botTyping||!last||last.who!=='bot'||!Array.isArray(last.chips)||!last.chips.length)return r;
    const p=document.querySelector('#botMsgs');const rows=p.querySelectorAll('.row.bot');const row=rows[rows.length-1];if(!row)return r;
    const d=document.createElement('div');d.className='qr24';d.setAttribute('role','group');d.setAttribute('aria-label',T('תשובות מהירות','Quick replies'));
    d.innerHTML=last.chips.map((c,i)=>'<button type="button" data-qr24="'+i+'">'+esc(String(c&&c.l||'').slice(0,40))+'</button>').join('');
    row.style.flexWrap='wrap';row.appendChild(d);d.style.flexBasis='100%';p.scrollTop=p.scrollHeight;}catch(e){}
  return r;};
document.querySelector('#botMsgs').addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-qr24]');if(!b)return;
  const last=state.bot[state.bot.length-1];const c=last&&Array.isArray(last.chips)&&last.chips[+b.dataset.qr24];if(!c)return;
  last.chips=null;save(true);
  if(c.a==='rc'){renderBot();openRc24();return;}
  if(typeof c.s==='string'&&c.s)sendToBot(c.s.slice(0,200));else renderBot();});
/* ---------- 🔁 חלון "פריטים קבועים": צפייה, עריכה, מחיקה והוספה ---------- */
const RC24_FREQS=[[1,'כל יום','Every day'],[2,'כל יומיים','Every 2 days'],[3,'כל 3 ימים','Every 3 days'],[4,'כל 4 ימים','Every 4 days'],[5,'כל 5 ימים','Every 5 days'],[7,'כל שבוע','Every week'],[10,'כל 10 ימים','Every 10 days'],[14,'כל שבועיים','Every 2 weeks'],[30,'כל חודש','Every month']];
function rc24FreqSel(r,id){const v=r&&r.days?'w':String(r?r.every:2);const opts=RC24_FREQS.slice();if(r&&r.every&&!opts.some(o=>o[0]===r.every))opts.push([r.every,rc24Label(r),rc24Label(r)]);
  return '<select data-f="fr" id="'+id+'">'+opts.map(o=>'<option value="'+o[0]+'"'+(String(o[0])===v?' selected':'')+'>'+esc(T(o[1],o[2]))+'</option>').join('')+'<option value="w"'+(v==='w'?' selected':'')+'>'+T('בימים קבועים בשבוע…','On set weekdays…')+'</option></select>';}
function rc24WdHtml(r,pre){const days=(r&&r.days)||[];return '<div class="rc24wd" role="group" aria-label="'+T('ימים בשבוע','Weekdays')+'"'+(r&&r.days?'':' hidden')+'>'+RC24_DAYS_HE.map((d,i)=>'<label><input type="checkbox" data-wd="'+i+'"'+(days.includes(i)?' checked':'')+'>'+esc(T(d,RC24_DAYS_EN[i].slice(0,3)))+'</label>').join('')+'</div>';}
function rc24ListSel(sel,id){if(state.lists.length<2)return '';return '<label for="'+id+'">'+T('לרשימה','List')+'<select data-f="l" id="'+id+'">'+state.lists.map(l=>'<option value="'+esc(l.id)+'"'+(l.id===sel?' selected':'')+'>'+esc(l.name)+'</option>').join('')+'</select></label>';}
function rc24RowHtml(r){const k=esc(r.id);
  return '<div class="rc24row'+(r.off?' rc24off':'')+'" data-rc="'+k+'"><div class="rc24top"><span class="em" aria-hidden="true">'+esc(emojiOf(r.n))+'</span><b>'+esc(r.n)+(r.q?' <small>×'+esc(r.q)+'</small>':'')+'</b>'+
    '<button type="button" data-rcoff aria-label="'+esc((r.off?T('להפעיל שוב: ','Resume: '):T('להשהות: ','Pause: '))+r.n)+'" title="'+(r.off?T('להפעיל שוב','Resume'):T('להשהות','Pause'))+'">'+(r.off?'▶️':'⏸️')+'</button>'+
    '<button type="button" data-rcdel aria-label="'+esc(T('מחיקת הפריט הקבוע ','Delete recurring ')+r.n)+'" title="'+T('מחיקה','Delete')+'">🗑️</button></div>'+
    '<div class="rc24ed"><label for="rcq_'+k+'">'+T('כמות','Qty')+'<input data-f="q" id="rcq_'+k+'" value="'+esc(r.q)+'" maxlength="20" inputmode="decimal" placeholder="1"></label>'+
    '<label for="rcf_'+k+'">'+T('כל כמה זמן','How often')+rc24FreqSel(r,'rcf_'+k)+'</label>'+rc24ListSel(r.list,'rcl_'+k)+'</div>'+rc24WdHtml(r)+
    '<span class="rc24nx">'+esc(rc24Label(r))+' · '+(r.off?T('מושהה','paused'):T('הבא: ','next: ')+esc(rc24When(r.next)))+(r.last?' · '+T('נוסף לאחרונה: ','last added: ')+esc(new Date(r.last).getDate()+'.'+(new Date(r.last).getMonth()+1)):'')+'</span></div>';}
function openRc24(){
  const rs=rc24Live();
  const sb0=openSheet('🔁 '+T('פריטים קבועים','Recurring items'),
    '<div id="rc24box"><p class="muted-note">'+T('פריטים שנכנסים לרשימה לבד, כל כמה זמן שבחרתם. אם הפריט כבר ברשימה ולא סומן — לא מוסיפים אותו שוב. אפשר גם לכתוב ליאמי: "3 חלב כל יומיים".','Items added to your list automatically. Tip: tell Yami "3 milk every 2 days".')+'</p>'+
    '<div id="rc24rows">'+(rs.length?rs.map(rc24RowHtml).join(''):'<p class="empty" style="padding:8px 0">'+T('עוד אין פריטים קבועים 🙂','No recurring items yet')+'</p>')+'</div>'+
    '<div class="rc24new" data-rcnew><b>➕ '+T('פריט קבוע חדש','New recurring item')+'</b><div class="rc24ed">'+
    '<label for="rcn_n">'+T('מוצר','Product')+'<input data-f="n" id="rcn_n" maxlength="60" placeholder="'+T('למשל: חלב','e.g. milk')+'"></label>'+
    '<label for="rcn_q">'+T('כמות','Qty')+'<input data-f="q" id="rcn_q" maxlength="20" inputmode="decimal" placeholder="1"></label>'+
    '<label for="rcn_f">'+T('כל כמה זמן','How often')+rc24FreqSel(null,'rcn_f')+'</label>'+rc24ListSel(state.active,'rcn_l')+
    '<button type="button" class="btn" id="rc24addBtn">'+T('הוספה','Add')+'</button></div>'+rc24WdHtml(null)+'</div></div>');
  const b=sb0.querySelector('#rc24box');
  const rowOf=el=>el.closest('[data-rc]');const ruleOf=row=>row&&rc24Live().find(r=>r.id===row.dataset.rc);
  const readFreq=box=>{const v=box.querySelector('[data-f=fr]').value;if(v!=='w')return {every:+v,days:null};
    const days=[...box.querySelectorAll('[data-wd]:checked')].map(x=>+x.dataset.wd);return {every:null,days:days.length?days:null};};
  b.addEventListener('change',e=>{const el=e.target;
    if(el.matches('[data-f=fr]')){const wd=(rowOf(el)||el.closest('[data-rcnew]')).querySelector('.rc24wd');if(wd)wd.hidden=el.value!=='w';
      if(el.value==='w'&&wd&&!wd.querySelector(':checked')){const c=wd.querySelector('[data-wd="'+new Date().getDay()+'"]');if(c)c.checked=true;}}
    const row=rowOf(el);const r=ruleOf(row);if(!r)return;const now=Date.now();
    if(el.matches('[data-f=q]'))r.q=String(el.value||'').replace(/[<>]/g,'').trim().slice(0,20);
    else if(el.matches('[data-f=l]')){if(state.lists.some(l=>l.id===el.value))r.list=el.value;}
    else if(el.matches('[data-f=fr],[data-wd]')){const f=readFreq(row);if(!f.every&&!f.days)return;r.every=f.every;r.days=f.days;r.next=rc24Next(r,r.last||now);if(r.next<now)r.next=rc24Next(r,now);}
    else return;
    r.ts=now;save();const nx=row.querySelector('.rc24nx');if(nx)nx.textContent=rc24Label(r)+' · '+(r.off?T('מושהה','paused'):T('הבא: ','next: ')+rc24When(r.next));flash('✔️ '+T('נשמר','Saved'));});
  b.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
    if(t.id==='rc24addBtn'){const box=t.closest('[data-rcnew]');const raw=box.querySelector('[data-f=n]').value.trim().slice(0,60);
      if(!raw||hasProfanity(raw)){flash(T('✏️ כתבו שם של מוצר','✏️ Enter a product'));box.querySelector('[data-f=n]').focus();return;}
      const its=parseItems(raw);const n=(its[0]&&its[0].name)||raw;const f=readFreq(box);if(!f.every&&!f.days){flash(T('בחרו לפחות יום אחד','Pick at least one day'));return;}
      const ls=box.querySelector('[data-f=l]');const x=rc24Add({n,q:box.querySelector('[data-f=q]').value.trim()||(its[0]&&its[0].qty)||'',every:f.every,days:f.days,list:ls?ls.value:state.active});
      flash('🔁 '+T(n+' — '+rc24Label(x.r)+(x.res==='added'?' (נוסף לרשימה עכשיו)':''),n+' — '+rc24Label(x.r)));openRc24();return;}
    const row=rowOf(t);const r=ruleOf(row);if(!r)return;
    if(t.hasAttribute('data-rcdel')){if(!(await uiConfirm(T('להפסיק להוסיף את "'+r.n+'" אוטומטית?','Stop adding "'+r.n+'" automatically?'))))return;rc24Remove(r);flash('🗑️ '+T('הפריט הקבוע נמחק','Recurring item deleted'));openRc24();return;}
    if(t.hasAttribute('data-rcoff')){const now=Date.now();if(r.off){delete r.off;if(!r.next||r.next<now)r.next=rc24Next(r,now);}else r.off=true;r.ts=now;save();openRc24();return;}});
  return sb0;}
/* בתפריט ☰ */
(function(){const m=document.querySelector('#hMenu');if(!m||document.querySelector('#miRecurring'))return;
  const btn=document.createElement('button');btn.id='miRecurring';btn.innerHTML='🔁<span>'+T('פריטים קבועים (קניות חוזרות)','Recurring items')+'</span>';
  /* ליד "סיימתי קנייה" — בתוך הקבוצה "קניות והבית" (התפריט כבר מחולק לקבוצות) */
  const after=document.querySelector('#miFinish');if(after&&m.contains(after))after.after(btn);else m.appendChild(btn);
  btn.onclick=()=>{m.classList.remove('open');openRc24();};})();
/* ---------- הבינה המלאכותית: פעולה recurring_add / recurring_remove ---------- */
const _v24DoAction=doAction;
doAction=function(a){try{if(a&&(a.type==='recurring_add'||a.type==='recurring_remove')){
    const its=(Array.isArray(a.items)?a.items:[]).slice(0,8).map(i=>({n:NORMP[norm(String(i&&i.name||''))]||String(i&&i.name||'').trim().slice(0,60),q:String(i&&i.qty||'').slice(0,20)})).filter(i=>i.n&&!hasProfanity(i.n)&&!yamiNotProduct(i.n));
    if(a.type==='recurring_remove'){its.forEach(i=>rc24Find(i.n).forEach(rc24Remove));try{render();}catch(e){}return;}
    let every=Number(a.every_days);every=Number.isInteger(every)&&every>=1&&every<=365?every:null;
    let days=Array.isArray(a.weekdays)?[...new Set(a.weekdays.map(Number).filter(d=>Number.isInteger(d)&&d>=0&&d<=6))]:null;if(days&&!days.length)days=null;
    if(!every&&!days)every=7;
    its.forEach(i=>rc24Add({n:i.n,q:i.q,every,days:every?null:days}));return;}}catch(e){console.warn('recurring action failed',e);}
  return _v24DoAction.apply(this,arguments);};
const _v24AiAction=aiAction;
aiAction=async function(a){if(a&&a.type==='recurring_remove'){const its=(Array.isArray(a.items)?a.items:[]).map(i=>String(i&&i.name||'').trim()).filter(Boolean).slice(0,8).join(', ');
  if(!(await uiConfirm('🤖 '+T('יאמי מבקשת להפסיק להוסיף אוטומטית: ','Yami wants to stop auto-adding: ')+its+'\n'+T('לאשר?','Confirm?'))))return;}
  return _v24AiAction.apply(this,arguments);};
const _v24AiContext=aiContext;
aiContext=function(){const s=_v24AiContext.apply(this,arguments);const rs=rc24Live();
  return s+'\nפריטים קבועים (נוספים לרשימה אוטומטית): '+(rs.length?rs.map(r=>rc24ItemTxt(r)+' '+rc24Label(r)).join(', '):'אין')+
    '\nבקשה כמו "3 חלב כל יומיים" = פעולת recurring_add (items, every_days או weekdays). אף פעם לא מוסיפים משפט שלם כמוצר — אם לא ברור מה להוסיף, שואלים.';};
