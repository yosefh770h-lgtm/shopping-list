
/* ================= v25: 🔁 פריטים קבועים — שיהיה קל למצוא =================
   1. יאמי שמה לב: מוצר שנוסף שוב ושוב (≥3 פעמים ב-30 יום, במרווח די קבוע) — מציעה פעם אחת להפוך אותו לקבוע.
      לכל היותר הצעה אחת ביום, אף פעם לא על מוצר שכבר קבוע, ו"לא תודה" נזכר. יאמי סגורה → בועה קטנה ליד יאמי; לחיצה פותחת את ההצעה.
   2. במסך "עריכת מוצר" (לחיצה על שם המוצר ברשימה): "🔁 להוסיף אוטומטית" + בחירת תדירות; אם כבר קבוע — "🔁 כל X" עם שינוי/הפסקה.
   3. כפתור קבוע אצל יאמי: "🔁 פריט קבוע". */
const RC25_STEPS=[1,2,3,4,5,7,14,30],RC25_WIN=30,RC25_DAY=864e5;
const rc25Day=ts=>Math.round(rc24Day0(ts).getTime()/RC25_DAY);
const rc25Data=()=>{const d=state.rcSug=(state.rcSug&&typeof state.rcSug==='object'&&!Array.isArray(state.rcSug))?state.rcSug:{};
  if(!d.adds||typeof d.adds!=='object')d.adds={};if(!d.asked||typeof d.asked!=='object')d.asked={};if(!d.no||typeof d.no!=='object')d.no={};return d;};
/* יומן הוספות קטן (במכשיר): לכל מוצר — הימים שבהם נוסף לאחרונה */
function rc25Log(name){const d=rc25Data(),k=norm(name);if(!k)return;const today=rc25Day(Date.now());
  const a=(Array.isArray(d.adds[k])?d.adds[k]:[]).filter(x=>Number.isInteger(x)&&today-x<=45);if(!a.includes(today))a.push(today);d.adds[k]=a.slice(-10);
  const ks=Object.keys(d.adds);if(ks.length>200)ks.sort((x,y)=>Math.max(...d.adds[x])-Math.max(...d.adds[y])).slice(0,ks.length-200).forEach(x=>delete d.adds[x]);}
/* רצף ימים קבוע? מחזיר את המרווח הממוצע בימים, או 0 */
function rc25Gap(days){const today=rc25Day(Date.now());
  const s=[...new Set(days.filter(x=>Number.isFinite(x)&&today-x<=RC25_WIN&&x<=today))].sort((a,b)=>a-b);
  if(s.length<3||s[s.length-1]!==today)return 0;
  const g=[];for(let i=1;i<s.length;i++)g.push(s[i]-s[i-1]);const mean=(s[s.length-1]-s[0])/(s.length-1);
  if(mean<1||Math.max(...g)>mean*1.75+0.5||Math.min(...g)<mean*0.4)return 0;return mean;}
const rc25Round=m=>RC25_STEPS.reduce((b,x)=>Math.abs(Math.log(x/m))<Math.abs(Math.log(b/m))?x:b,1);
/* כל כמה ימים המוצר נוסף/נקנה — מהיומן ומתאריכי הפריטים ברשימות, ואם אין מספיק — מהקניות שהסתיימו (היסטוריה) */
function rc25Pattern(name){const k=norm(name);if(!k)return 0;const today=rc25Day(Date.now());
  const adds=(rc25Data().adds[k]||[]).slice();
  (state.lists||[]).forEach(l=>(l.items||[]).forEach(i=>{if(i&&norm(i.n)===k&&i.ts&&!String(i.by||'').startsWith('🔁'))adds.push(rc25Day(i.ts));}));
  let m=rc25Gap(adds);
  if(!m){const h=(state.history||[]).filter(t=>t&&t.ts&&Array.isArray(t.items)&&t.items.some(i=>i&&norm(i.n)===k)).map(t=>rc25Day(t.ts));h.push(today);m=rc25Gap(h);}
  return m?rc25Round(m):0;}
const rc25HasRule=name=>rc24Live().some(r=>norm(r.n)===norm(name));
let rc25Pending=null,rc25Sug=null,rc25Await=false,rc25InReply=0;
function rc25Text(s){const lab=rc24Label({every:s.every});
  return '💡 '+T('שמתי לב ש'+GW2('את קונה','אתה קונה')+' '+s.n+' בערך '+lab+'. '+GW2('רוצה','רוצה')+' שאוסיף '+(/ים$|ות$/.test(s.n)?'אותם':'אותו')+' לבד?',
    'I noticed you buy '+s.n+' about '+lab+'. Want me to add it automatically?');}
function rc25Post(){const s=rc25Pending;if(!s)return;rc25Pending=null;
  if(rc25HasRule(s.n))return;const d=rc25Data();d.asked[norm(s.n)]=Date.now();
  rc25Sug=s;rc24Say(rc25Text(s),[{l:'✅ '+T('כן, '+rc24Label({every:s.every}),'Yes, '+rc24Label({every:s.every})),s:T('כן, '+rc24Label({every:s.every}),'yes')},{l:T('לא תודה','No thanks'),s:T('לא תודה','no thanks')}]);}
const rc25BotOpen=()=>{const b=document.querySelector('#botSheet');return !!(b&&b.classList.contains('open'));};
/* אחרי שהמשתמש הוסיף מוצר (בכל דרך) */
function rc25Added(name){try{
  if(!name||!state.user||(typeof uiCfg!=='undefined'&&uiCfg.botHidden)||document.body.classList.contains('bizmode'))return;
  rc25Log(name);const d=rc25Data(),k=norm(name),today=dayKey(new Date());
  if(d.day===today||rc25Pending||rc25Sug||d.asked[k]||d.no[k]||rc25HasRule(name))return;
  const every=rc25Pattern(name);if(!every)return;
  d.day=today;save(true);
  const l=curList();const it=l&&l.items.find(i=>norm(i.n)===k&&!i.done);
  rc25Pending={n:(it&&it.n)||name,q:(it&&it.q)||'',every,list:l&&l.id};
  if(rc25BotOpen()){if(!rc25InReply)setTimeout(rc25Post,350);}
  else showNudge(rc25Text(rc25Pending).replace(/\s*\S+ שאוסיף.*$/,'')+' '+T('לחצו כאן 🔁','Tap here 🔁'));
}catch(e){console.warn('rc25',e);}}
const _v25AddItem=addItem;
addItem=function(name,qty){const l=curList();const had=!!(l&&l.items.some(i=>i.n===name&&!i.done));const r=_v25AddItem.apply(this,arguments);
  if(!had&&l&&l.items.some(i=>i.n===name&&!i.done))rc25Added(name);return r;};
const _v25AddMany=addMany;
addMany=function(items){const l=curList();const before=new Set(l.items.filter(i=>!i.done).map(i=>i.n));const n=_v25AddMany.apply(this,arguments);
  if(n)l.items.filter(i=>!i.done&&!before.has(i.n)).forEach(i=>rc25Added(i.n));return n;};
/* תשובה של יאמי שבה נוסף מוצר — ההצעה מגיעה אחרי התשובה, כדי שהכפתורים יהיו בהודעה האחרונה */
const _v25BotReply=botReply;
botReply=async function(){rc25InReply++;try{return await _v25BotReply.apply(this,arguments);}finally{rc25InReply--;if(!rc25InReply&&rc25Pending&&rc25BotOpen())rc25Post();}};
const _v25OpenBot=openBot;
openBot=function(){const r=_v25OpenBot.apply(this,arguments);if(rc25Pending)rc25Post();return r;};
/* תשובה להצעה + הכפתור "🔁 פריט קבוע" */
yamiStep(async function v25BotPre(raw){
  const t=norm(String(raw||'').replace(YAMI_EMOJI,'')).replace(/[.!?？,]+$/,'').trim();
  if(rc25Sug){const s=rc25Sug;rc25Sug=null;
    if(/^(?:כן|yes)(?:[\s,]|$)/i.test(t)||yamiOnly(t,RC24_YES,'כל|'+RC24_NUMW+'|\\d+|יום|ימים|יומיים|שבוע|שבועיים|חודש'))
      return rc24Confirm([{n:s.n,q:s.q}],{every:s.every,days:null,list:s.list});
    if(/^(?:no|לא)(?:[\s,]|$)/i.test(t)||yamiOnly(t,RC24_NO,'תודה')){rc25Data().no[norm(s.n)]=Date.now();save();
      botSay('👍 '+T('בסדר, לא אציע שוב על '+s.n+'.\nאם '+GW2('תרצי','תרצה')+' — "🔁 פריט קבוע" בכפתורים למטה, או בעריכת מוצר ברשימה.','OK, I won\'t suggest '+s.n+' again.'));return true;}}
  if(/^(?:(?:להוסיף|הוספת|איך\s+מוסיפים|תוסיפי|הוסיפי)\s+)?פריט\s+קבוע(?:\s+חדש)?$/.test(t)){
    if(typeof clearFlows19==='function')clearFlows19();rc25Await=true;
    rc24Say('🔁 '+T('פריט קבוע נכנס לרשימה לבד, כל כמה זמן ש'+GW2('תבחרי','תבחר')+' (ואם הוא כבר ברשימה — לא נכנס פעמיים).\nמה להוסיף ובאיזו תדירות? '+GW2('כתבי','כתוב')+' למשל: "חלב כל יומיים" או "לחם כל יום שישי".',
      'A recurring item is added to your list automatically. What should I add, and how often? e.g. "milk every 2 days".'),[{l:'🔁 '+T('פתיחת הפריטים הקבועים','Open recurring items'),a:'rc'}]);return true;}
  if(rc25Await){rc25Await=false;
    if(!rc24ParseFreq(t)&&!/[?？]/.test(String(raw))&&t.split(' ').length<=4){const p=rc24Items(t,true);
      if(p.items.length&&!p.unsure&&!p.partial){rc24Ask={stage:'freq',items:p.items,f:{list:''}};
        rc24Say(T('כל כמה זמן להוסיף '+p.items.map(i=>i.n).join(', ')+'? 🙂','How often should I add '+p.items.map(i=>i.n).join(', ')+'?'),RC24_CH_FREQ());return true;}}}
  return false;});
const _v25ClearFlows=clearFlows19;
clearFlows19=function(){rc25Sug=null;rc25Await=false;return _v25ClearFlows.apply(this,arguments);};
const _v25BotChips=botChips;
botChips=function(){const b=_v25BotChips.apply(this,arguments);if(!b.includes('🔁 פריט קבוע')){const i=b.indexOf('📦 המלאי שלי');b.splice(i>=0?i+1:Math.min(2,b.length),0,'🔁 פריט קבוע');}return b;};
/* כפתור קבוע אצל יאמי: "📜 וורט" — כדי שידעו שאפשר לבקש דבר תורה (ביום חמישי ושישי — בהתחלה) */
const _dtBotChips=botChips;
botChips=function(){const b=_dtBotChips.apply(this,arguments);if(!TORAH_OFF&&!b.includes('📜 וורט')){const d=new Date().getDay();const i=b.indexOf('פרשת השבוע');b.splice(d===4||d===5?0:(i>=0?i+1:b.length),0,'📜 וורט');}return b;};
/* ---------- 🔁 בעריכת מוצר ---------- */
(function(){const st=document.createElement('style');st.textContent=
  '.rc25it{border:1px solid var(--line);background:var(--chipbg);border-radius:12px;padding:8px 10px;margin:10px 0}'+
  '.rc25it .rc25tg{font:inherit;font-size:14px;font-weight:700;border:1px solid var(--hdr2);background:var(--panel);color:var(--text);border-radius:18px;padding:7px 14px;cursor:pointer;min-height:38px}'+
  '.rc25it .rc25tg:hover,.rc25it .rc25tg:focus-visible{background:var(--sent)}'+
  '.rc25it small{display:block;color:var(--muted);font-size:13px;margin-top:4px}'+
  '.rc25ch{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.rc25ch[hidden],.rc25wd[hidden]{display:none}'+
  '.rc25ch button,.rc25wd button{font:inherit;font-size:14px;border:1px solid var(--chipbr);background:var(--recv);color:var(--text);border-radius:16px;padding:6px 12px;cursor:pointer;min-height:34px}'+
  '.rc25ch button[aria-pressed=true]{background:#0d7064;border-color:#0d7064;color:#fff}'+
  '.rc25ch button.rc25stop{border-color:#b23b3b;color:#9a2a2a}body.dark .rc25ch button.rc25stop{border-color:#e07a7a;color:#f2a8a8}'+
  '.rc25wd{margin-top:8px}.rc25wd .rc24wd{margin:0 0 6px}';
  document.head.appendChild(st);})();
const RC25_CHOICES=[[1,'כל יום','Every day'],[2,'כל יומיים','Every 2 days'],[3,'כל 3 ימים','Every 3 days'],[7,'כל שבוע','Weekly'],[14,'כל שבועיים','Every 2 weeks'],[30,'כל חודש','Monthly']];
function rc25ItemHtml(it){const l=curList();const r=rc24Live().find(x=>norm(x.n)===norm(it.n)&&x.list===l.id);
  return '<div class="rc25it" id="rc25it">'+
    '<button type="button" class="rc25tg" id="rc25tg" aria-expanded="false" aria-controls="rc25ch">🔁 '+(r?esc(rc24Label(r))+(r.off?' ⏸️':''):T('להוסיף אוטומטית','Add automatically'))+'</button>'+
    '<small>'+(r?esc(T('נכנס לרשימה לבד','Added automatically')+(r.off?' · '+T('מושהה','paused'):' · '+T('הבא: ','next: ')+rc24When(r.next)))+' · '+T('לחצו לשינוי או להפסקה','tap to change or stop'):T('המוצר ייכנס לרשימה לבד, כל כמה זמן ש'+GW2('תבחרי','תבחר'),'The item will be added to your list on a schedule'))+'</small>'+
    '<div class="rc25ch" id="rc25ch" role="group" aria-label="'+T('כל כמה זמן להוסיף','How often')+'" hidden>'+
    RC25_CHOICES.map(c=>'<button type="button" data-rc25ev="'+c[0]+'" aria-pressed="'+(!!(r&&!r.days&&r.every===c[0]))+'">'+esc(T(c[1],c[2]))+'</button>').join('')+
    '<button type="button" data-rc25wdo aria-pressed="'+(!!(r&&r.days))+'" aria-expanded="'+(!!(r&&r.days))+'" aria-controls="rc25wd">📅 '+T('ימים קבועים בשבוע','Set weekdays')+'</button>'+
    (r?'<button type="button" class="rc25stop" data-rc25stop>🛑 '+T('להפסיק','Stop')+'</button>':'')+'</div>'+
    '<div class="rc25wd" id="rc25wd"'+(r&&r.days?'':' hidden')+'>'+rc24WdHtml(r&&r.days?r:{days:[new Date().getDay()]})+'<button type="button" data-rc25wdsave>✅ '+T('שמירה','Save')+'</button></div></div>';}
let rc25Edit=null;
const _v25OpenItemEdit=openItemEdit;
openItemEdit=function(id){rc25Edit=null;const res=_v25OpenItemEdit.apply(this,arguments);try{
  const it=curList().items.find(x=>x.id===id);const b=document.querySelector('#v8SheetBody');const row=b&&b.querySelector('#ieSave')&&b.querySelector('#ieSave').closest('.row2');if(!it||!row)return res;
  const draw=open=>{const old=b.querySelector('#rc25it');const h=rc25ItemHtml(it);if(old)old.outerHTML=h;else row.insertAdjacentHTML('beforebegin',h);
    if(open){b.querySelector('#rc25ch').hidden=false;b.querySelector('#rc25tg').setAttribute('aria-expanded','true');}};
  const cur=()=>{const n=(b.querySelector('#ieName')||{}).value;const q=(b.querySelector('#ieQty')||{}).value;
    const nn=String(n||'').trim()&&!hasProfanity(n)?String(n).trim().slice(0,60):it.n;const qq=String(q==null?it.q:q).trim();return {n:nn,q:hasProfanity(qq)||qq==='1'?'':qq.slice(0,20)};};
  rc25Edit={it,draw,cur};draw(false);
}catch(e){console.warn('rc25 edit',e);}return res;};
document.querySelector('#v8SheetBody').addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#rc25it button');if(!t||!rc25Edit)return;
  const {it,draw,cur}=rc25Edit;const b=document.querySelector('#v8SheetBody');
  const set=f=>{const c=cur();const x=rc24Add({n:c.n,q:c.q,every:f.every||null,days:f.days||null,list:curList().id});delete rc25Data().no[norm(c.n)];save(true);
    flash('🔁 '+T(c.n+' — '+rc24Label(x.r)+(x.res==='added'?' (נוסף לרשימה עכשיו)':''),c.n+' — '+rc24Label(x.r)));draw(true);const p=b.querySelector('#rc25ch [aria-pressed=true]');if(p)p.focus();};
  if(t.id==='rc25tg'){const ch=b.querySelector('#rc25ch');ch.hidden=!ch.hidden;t.setAttribute('aria-expanded',String(!ch.hidden));if(!ch.hidden){const f=ch.querySelector('button');if(f)f.focus();}return;}
  if(t.dataset.rc25ev){set({every:+t.dataset.rc25ev});return;}
  if(t.hasAttribute('data-rc25wdo')){const w=b.querySelector('#rc25wd');w.hidden=!w.hidden;t.setAttribute('aria-expanded',String(!w.hidden));return;}
  if(t.hasAttribute('data-rc25wdsave')){const days=[...b.querySelectorAll('#rc25wd [data-wd]:checked')].map(x=>+x.dataset.wd);if(!days.length){flash(T('בחרו לפחות יום אחד','Pick at least one day'));return;}set({days});return;}
  if(t.hasAttribute('data-rc25stop')){const c=cur();rc24Live().filter(x=>(norm(x.n)===norm(it.n)||norm(x.n)===norm(c.n))&&x.list===curList().id).forEach(rc24Remove);
    try{render();}catch(er){}flash('🛑 '+T('הפסקתי להוסיף '+it.n+' אוטומטית','Stopped adding '+it.n+' automatically'));draw(false);b.querySelector('#rc25tg').focus();}});
