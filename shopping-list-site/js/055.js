
/* ================= v50: 💰 תקציב הבית — כל ההוצאות של הבית במקום אחד =================
   לשונית באזור האישי (וגם בתפריט ⚙️ וביאמי). התקציב החודשי, תקציב לכל קטגוריה (רשות), הוצאות ידניות והוצאות קבועות.
   הקניות נכנסות לבד: כל "סיום קנייה" וכל קבלה מ"הקניות שלי" נספרות בסופר (או בפארם) — לפי הסכום בקבלה,
   או לפי מה שכתבתם "כמה יצא בקופה". נשמר ב-state.budget ומסונכרן עם הרשימות לכל המשפחה (כמו הסידורים).
   מבנה: {limit,cats:{cat:limit},smt, exp:[{id,ts,amt,cat,note,by,mt,del?}], fixed:[{id,n,amt,cat,from,to,mt}], paid:{ts:{a,c,mt}}} */
(function(){
const $b=s=>document.querySelector(s);
if(!SYNC_KEYS.includes('budget'))SYNC_KEYS.push('budget');
const BD_CATS=[['super','🛒','סופר ומכולת','Groceries'],['pharm','🧴','פארם וניקיון','Pharmacy & cleaning'],['home','🏠','דירה וארנונה','Housing'],['bills','💡','חשבונות (חשמל, מים, גז, טלפון)','Bills'],
  ['edu','📚','חינוך וחוגים','Education'],['cloth','👕','ביגוד והנעלה','Clothing'],['trans','🚌','נסיעות ורכב','Transport'],['health','🩺','בריאות','Health'],
  ['shabbat','🕯️','שבת וחגים','Shabbat & holidays'],['tz','💝','צדקה ומעשרות','Charity'],['other','📦','אחר','Other']];
const BD_CAT=Object.fromEntries(BD_CATS.map(c=>[c[0],c]));
const BD_GUESS=[['bills',/חשמל|מים|גז|טלפון|סלולר|פלאפון|אינטרנט|נטפרי|קווי/],['home',/שכר דירה|שכירות|משכנתא|ארנונה|ועד בית|דירה|אינסטלטור|חשמלאי|תיקון/],
  ['edu',/גן|תלמוד תורה|ת"ת|תת|ישיבה|סמינר|חוג|שכר לימוד|מלמד|ספרים|מחברות|ציוד לבית ספר/],['cloth',/בגד|בגדים|נעל|ביגוד|חליפה|כובע|חולצ|גרביים/],
  ['trans',/אוטובוס|רב.?קו|מונית|דלק|רכב|נסיע|חניה|רכבת/],['health',/רופא|תרופ|קופת חולים|שיניים|משקפיים|בדיק/],['shabbat',/שבת|חג|יום טוב|פסח|סוכות|ארבעת המינים|נרות|יין|משלוח מנות/],
  ['tz',/צדקה|מעשר|תרומה|גמ"ח|גמח/],['pharm',/פארם|ניקיון|ניקוי|טיטולים|חיתולים|שמפו|סבון/],['super',/סופר|מכולת|ירקות|פירות|בשר|עוף|דגים|אוכל|לחם|חלות|קניות|ירקן|מאפייה/]];
const PHARM_RX=/פארם|super.?pharm|be\b|גוד.?פארם|ניו.?פארם/i;
const num=v=>{const n=Number(String(v==null?'':v).replace(/[^\d.\-]/g,''));return isFinite(n)?n:0;};
const r2=v=>Math.round(v*100)/100;
const mk=d=>mKey26(d);
const okMk=s=>typeof s==='string'&&/^\d{4}-\d{2}$/.test(s);
const nowTs=()=>Date.now();
function bdCatGuess(t){t=String(t||'');for(const [c,rx] of BD_GUESS)if(rx.test(t))return c;return 'other';}
/* ---------- ניקוי (מהענן / מגיבוי) ---------- */
function bdClean(o){o=o&&typeof o==='object'&&!Array.isArray(o)?o:{};const lim=v=>{v=num(v);return v>0&&v<10000000?r2(v):0;};
  const ts=v=>{v=Number(v);return isFinite(v)&&v>0?Math.min(v,nowTs()+400*864e5):0;};
  const cat=c=>BD_CAT[c]?c:'other';const str=(s,n)=>String(s==null?'':s).replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,n);
  const cats={};if(o.cats&&typeof o.cats==='object')Object.keys(o.cats).forEach(k=>{if(BD_CAT[k]&&lim(o.cats[k]))cats[k]=lim(o.cats[k]);});
  const exp=(Array.isArray(o.exp)?o.exp:[]).filter(x=>x&&typeof x==='object'&&x.id).map(x=>({id:cleanId(x.id),ts:ts(x.ts),amt:lim(x.amt),cat:cat(x.cat),note:str(x.note,80),by:str(x.by,40),mt:ts(x.mt),del:!!x.del})).filter(x=>x.ts&&(x.amt||x.del)).slice(-1500);
  const fixed=(Array.isArray(o.fixed)?o.fixed:[]).filter(x=>x&&typeof x==='object'&&x.id).map(x=>({id:cleanId(x.id),n:str(x.n,60),amt:lim(x.amt),cat:cat(x.cat),from:okMk(x.from)?x.from:mk(nowTs()),to:okMk(x.to)?x.to:'',mt:ts(x.mt)})).filter(x=>x.n&&x.amt).slice(-100);
  const paid={};if(o.paid&&typeof o.paid==='object')Object.keys(o.paid).slice(-600).forEach(k=>{const p=o.paid[k];if(!/^\d{6,16}$/.test(k)||!p||typeof p!=='object')return;paid[k]={a:lim(p.a),c:BD_CAT[p.c]?p.c:'',mt:ts(p.mt)};if(p.z)paid[k].z=1;});
  return {limit:lim(o.limit),cats,smt:ts(o.smt),exp,fixed,paid};}
function B(){if(!state.budget||typeof state.budget!=='object'||!Array.isArray(state.budget.exp)||!state.budget.paid)state.budget=bdClean(state.budget);return state.budget;}
function bdMerge(a,b){a=bdClean(a);b=bdClean(b);const o={...a};
  if((b.smt||0)>(a.smt||0)){o.limit=b.limit;o.cats=b.cats;o.smt=b.smt;}
  const byId=(x,y)=>{const m={};x.forEach(e=>m[e.id]=e);y.forEach(e=>{if(!m[e.id]||(e.mt||0)>=(m[e.id].mt||0))m[e.id]=e;});return Object.values(m);};
  o.exp=byId(a.exp,b.exp).sort((x,y)=>x.ts-y.ts);o.fixed=byId(a.fixed,b.fixed);
  o.paid={...a.paid};Object.keys(b.paid).forEach(k=>{if(!o.paid[k]||(b.paid[k].mt||0)>=(o.paid[k].mt||0))o.paid[k]=b.paid[k];});
  return o;}
function bdTidy(){const b=B(),old=nowTs()-60*864e5,far=nowTs()-800*864e5;b.exp=b.exp.filter(x=>!(x.del&&x.mt<old)&&x.ts>far);}
const _bdApply=applyRemote;
applyRemote=function(remote,replace){const r=_bdApply.apply(this,arguments);try{if(remote&&remote.budget&&typeof remote.budget==='object')state.budget=replace?bdClean(remote.budget):bdMerge(B(),remote.budget);}catch(e){}return r;};
onLogout('reset',()=>{state.budget=bdClean({});});
function bdSave(){bdTidy();save();try{bdAlerts();}catch(e){}}

/* ---------- החישוב לחודש ---------- */
function tripAmt(h){const p=B().paid[String(h.ts)];if(p&&p.z)return 0;if(p&&p.a>0)return p.a;if(num(h.total)>0)return r2(num(h.total));
  let s=0;(h.items||[]).forEach(i=>{const pr=num(i.price);if(pr>0)s+=pr*(parseFloat(i.q)>0?parseFloat(i.q):1);});return r2(s);}
function tripCat(h){const p=B().paid[String(h.ts)];if(p&&p.c)return p.c;return PHARM_RX.test(String(h.store||''))?'pharm':'super';}
function bdMonth(m){const b=B(),rows=[];
  (state.history||[]).forEach(h=>{if(!h||mk(h.ts)!==m)return;const a=tripAmt(h);
    rows.push({k:'t',id:String(h.ts),ts:h.ts,amt:a,cat:tripCat(h),note:(h.store?h.store:(h.listName||T('קנייה','Shopping'))),sub:(h.receipt?'🧾 '+T('קבלה','Receipt'):'✅ '+T('סיום קנייה','Finished list'))+' · '+(h.items||[]).length+' '+T('מוצרים','items'),by:h.by||'',unknown:!(a>0)});});
  b.exp.forEach(x=>{if(!x.del&&mk(x.ts)===m)rows.push({k:'e',id:x.id,ts:x.ts,amt:x.amt,cat:x.cat,note:x.note||T(BD_CAT[x.cat][2],BD_CAT[x.cat][3]),by:x.by});});
  const [y,mo]=m.split('-').map(Number);
  b.fixed.forEach(f=>{if(f.from<=m&&(!f.to||m<f.to))rows.push({k:'f',id:f.id,ts:new Date(y,mo-1,1,8).getTime(),amt:f.amt,cat:f.cat,note:f.n,sub:'🔁 '+T('הוצאה קבועה','Monthly')});});
  rows.sort((a,c)=>c.ts-a.ts);
  const by={};rows.forEach(r=>{by[r.cat]=r2((by[r.cat]||0)+r.amt);});
  return {rows,by,spent:r2(rows.reduce((s,r)=>s+r.amt,0)),unknown:rows.filter(r=>r.unknown).length};}
function bdPace(m,spent,limit){const now=new Date(),[y,mo]=m.split('-').map(Number),days=new Date(y,mo,0).getDate();
  const cur=mk(now)===m,day=cur?now.getDate():(m<mk(now)?days:0),left=days-day+(cur?1:0);
  return {days,day,left,perDay:left>0&&limit>spent?r2((limit-spent)/left):0,elapsed:days?day/days:0};}

/* ---------- התראות: 80% ו-100% מהתקציב ---------- */
function bdAlerts(){const b=B();if(!b.limit)return;const m=mk(nowTs()),s=bdMonth(m).spent,cur=myCurrency();
  if(s>=b.limit)notify('bd100-'+m,'order','💰 '+T('עברתם את תקציב הבית של החודש','Over this month\'s home budget'),T('הוצאתם '+fmtPrice(s,cur)+' מתוך '+fmtPrice(b.limit,cur),'Spent '+fmtPrice(s,cur)+' of '+fmtPrice(b.limit,cur)),'');
  else if(s>=b.limit*0.8)notify('bd80-'+m,'order','💰 '+T('הגעתם ל-80% מתקציב הבית','80% of the home budget used'),T('נשארו '+fmtPrice(b.limit-s,cur)+' עד סוף החודש','Left: '+fmtPrice(b.limit-s,cur)),'');}

/* ---------- המסך ---------- */
let bdM=null,bdOpenCat='',bdFormOpen=false;
const catOpts=sel=>BD_CATS.map(c=>'<option value="'+c[0]+'"'+(c[0]===sel?' selected':'')+'>'+c[1]+' '+esc(T(c[2],c[3]))+'</option>').join('');
const shortM=m=>esc(mName26(m).split(' ')[0]);
function bdHtml(){const b=B(),cur=myCurrency(),m=bdM=bdM||mk(nowTs()),now=mk(nowTs());const d=bdMonth(m),p=bdPace(m,d.spent,b.limit);
  const [y,mo]=m.split('-').map(Number),prev=mk(new Date(y,mo-2,1)),next=mk(new Date(y,mo,1));
  let h='<div class="bd50">';
  h+='<div class="bd50nav"><button class="mini" data-bd="m" data-m="'+prev+'" aria-label="'+T('החודש הקודם','Previous month')+'">‹ '+shortM(prev)+'</button><b>'+esc(mName26(m))+'</b>'+(m<now?'<button class="mini" data-bd="m" data-m="'+next+'" aria-label="'+T('החודש הבא','Next month')+'">'+shortM(next)+' ›</button>':'<span style="width:60px"></span>')+'</div>';
  /* הכרטיס הראשי */
  if(b.limit){const pct=d.spent/b.limit,left=r2(b.limit-d.spent),cls=pct>=1?'over':pct>=0.8?'near':'ok';
    const mood=pct>=1?'😬 '+T('עברתם את התקציב — לא נורא, מתכננים את החודש הבא','Over budget — plan next month'):
      (m===now&&p.elapsed>0.05&&pct<p.elapsed-0.1)?'👏 '+T('כל הכבוד! אתם מתחת לקצב','Great! Under pace'):
      (m===now&&pct>p.elapsed+0.1)?'🐢 '+T('קצת מעל הקצב — כדאי להאט','A bit above pace'):'🙂 '+T('בדיוק בקצב','Right on pace');
    h+='<div class="mecard bd50hero '+cls+'"><div class="bd50lbl">'+(left>=0?T('נשאר החודש','Left this month'):T('מעבר לתקציב','Over budget'))+'</div><div class="bd50big">'+fmtPrice(Math.abs(left),cur)+'</div>'+
      '<div class="bd50bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.min(100,Math.round(pct*100))+'" aria-label="'+T('ניצול התקציב','Budget used')+'"><i style="width:'+Math.min(100,Math.round(pct*100))+'%"></i>'+(m===now?'<u style="inset-inline-start:'+Math.round(p.elapsed*100)+'%" title="'+T('היום בחודש','Today')+'"></u>':'')+'</div>'+
      '<div class="bd50sub"><span>'+T('הוצאתם','Spent')+' <b>'+fmtPrice(d.spent,cur)+'</b> '+T('מתוך','of')+' '+fmtPrice(b.limit,cur)+' ('+Math.round(pct*100)+'%)</span>'+(m===now&&p.perDay?'<span>📅 '+T('אפשר עוד','About')+' <b>'+fmtPrice(p.perDay,cur)+'</b> '+T('ליום','a day')+' · '+p.left+' '+T('ימים','days')+'</span>':'')+'</div>'+
      '<div class="bd50mood">'+mood+'</div><button class="mini" data-bd="limit">✏️ '+T('שינוי התקציב','Change budget')+'</button></div>';}
  else h+='<div class="mecard bd50hero ok"><div class="bd50lbl">'+T('הוצאתם ב'+mName26(m),'Spent in '+mName26(m))+'</div><div class="bd50big">'+fmtPrice(d.spent,cur)+'</div>'+
    '<p class="muted-note">🎯 '+T('כמה אתם רוצים להוציא בחודש? קובעים תקציב — ונראה כמה נשאר, כמה אפשר ליום, ונתריע לפני שעוברים.','Set a monthly budget to see what is left.')+'</p>'+
    '<div class="bd50row"><input id="bdLimit" type="number" inputmode="decimal" min="0" step="50" placeholder="'+T('למשל 6000','e.g. 6000')+'" aria-label="'+T('תקציב חודשי','Monthly budget')+'"><button data-bd="setlimit">🎯 '+T('קביעת תקציב','Set budget')+'</button></div></div>';
  /* הוספת הוצאה */
  h+='<div class="mecard"><h4>➕ '+T('הוצאה חדשה','New expense')+'</h4><div class="bd50row"><input id="bdAmt" type="number" inputmode="decimal" min="0" step="0.1" placeholder="'+T('סכום','Amount')+' ('+esc(cur)+')" aria-label="'+T('סכום','Amount')+'"><input id="bdNote" maxlength="80" placeholder="'+T('על מה? למשל: חשמל, נעליים לילד','What for?')+'" aria-label="'+T('על מה','What for')+'"></div>'+
    '<div class="bd50chips" role="radiogroup" aria-label="'+T('קטגוריה','Category')+'">'+BD_CATS.map(c=>'<button type="button" role="radio" aria-checked="false" class="bd50chip" data-bdcat="'+c[0]+'">'+c[1]+' '+esc(T(c[2].replace(/ \(.*\)/,''),c[3]))+'</button>').join('')+'</div>'+
    '<div class="bd50row"><input id="bdDate" type="date" value="'+(m===now?dayKey(new Date()):m+'-01')+'" aria-label="'+T('תאריך','Date')+'"><button data-bd="add">💾 '+T('הוספה','Add')+'</button></div>'+
    '<p class="muted-note" style="margin:6px 0 0">🛒 '+T('קניות מהרשימה וקבלות נכנסות לבד. אפשר גם לכתוב ליאמי: "הוצאתי 200 על חשמל".','Shopping and receipts are added automatically.')+'</p></div>';
  /* לפי קטגוריות */
  const used=BD_CATS.filter(c=>d.by[c[0]]||b.cats[c[0]]);
  if(used.length){const mx=Math.max(1,...used.map(c=>Math.max(d.by[c[0]]||0,b.cats[c[0]]||0)));
    h+='<div class="mecard"><h4>📊 '+T('לאן הלך הכסף','Where the money went')+'</h4>'+used.sort((a,c)=>(d.by[c[0]]||0)-(d.by[a[0]]||0)).map(c=>{const v=d.by[c[0]]||0,l=b.cats[c[0]]||0,over=l&&v>l;
      return '<button type="button" class="bd50cat'+(bdOpenCat===c[0]?' on':'')+'" data-bd="cat" data-c="'+c[0]+'" aria-expanded="'+(bdOpenCat===c[0])+'"><span class="e">'+c[1]+'</span><span class="g"><span class="t"><span>'+esc(T(c[2],c[3]))+'</span><b'+(over?' class="bad"':'')+'>'+fmtPrice(v,cur)+(l?' / '+fmtPrice(l,cur):'')+'</b></span><span class="bd50mini"><i style="width:'+Math.round(100*Math.min(1,l?v/l:v/mx))+'%"'+(over?' class="bad"':'')+'></i></span></span></button>'+
        (bdOpenCat===c[0]?'<div class="bd50catx">'+d.rows.filter(r=>r.cat===c[0]).slice(0,30).map(r=>'<div class="bd50l"><span>'+esc(r.note)+'</span><small>'+esc(fmtDateShort(r.ts))+'</small><b>'+(r.unknown?'—':fmtPrice(r.amt,cur))+'</b></div>').join('')+'<button class="mini" data-bd="catlim" data-c="'+c[0]+'">🎯 '+(l?T('שינוי התקציב לקטגוריה','Change category budget'):T('תקציב לקטגוריה הזו','Budget for this category'))+'</button></div>':'');}).join('')+
      (BD_CATS.some(c=>!used.includes(c))?'<details class="bd50more"><summary>🎯 '+T('תקציב לקטגוריה נוספת','Budget another category')+'</summary><div class="bd50row"><select id="bdCatSel" aria-label="'+T('קטגוריה','Category')+'">'+catOpts('bills')+'</select><input id="bdCatLim" type="number" inputmode="decimal" min="0" placeholder="'+T('סכום לחודש','Monthly amount')+'" aria-label="'+T('סכום לחודש','Monthly amount')+'"><button data-bd="catadd">💾</button></div></details>':'')+'</div>';}
  /* ההוצאות של החודש */
  const miss=d.rows.filter(r=>r.unknown);
  h+='<div class="mecard"><h4>🧾 '+T('כל ההוצאות ב'+mName26(m),'All expenses in '+mName26(m))+' <small class="muted-note">('+d.rows.length+')</small></h4>'+
    (miss.length?'<p class="bd50tip">✍️ '+T(miss.length+' קניות בלי סכום — כתבו כמה יצא בקופה, וזה ייכנס לתקציב',miss.length+' purchases without an amount')+'</p>':'')+
    (d.rows.length?d.rows.slice(0,120).map(r=>{const c=BD_CAT[r.cat]||BD_CAT.other;
      return '<div class="merow bd50r"><span class="e" title="'+esc(T(c[2],c[3]))+'">'+c[1]+'</span><span class="grow"><b>'+esc(r.note)+'</b><small>'+esc(fmtDateShort(r.ts))+(r.sub?' · '+esc(r.sub):'')+(r.by?' · '+esc(r.by):'')+'</small>'+
        (r.k==='t'?'<select class="bd50sel" data-bdtc="'+r.id+'" aria-label="'+T('קטגוריה','Category')+'">'+catOpts(r.cat)+'</select>':'')+'</span><span class="bd50act">'+
        (r.unknown?'<span class="bd50pay"><input type="number" inputmode="decimal" min="0" step="0.1" data-bdpay="'+r.id+'" placeholder="'+T('כמה יצא?','How much?')+'" aria-label="'+T('כמה יצא בקופה','Amount paid')+'"><button class="mini pri" data-bd="pay" data-id="'+r.id+'" aria-label="'+T('שמירה','Save')+'">💾</button></span>':
         r.k==='f'?'<b class="amt">'+fmtPrice(r.amt,cur)+'</b>':
         '<button class="bd50amt" data-bd="'+(r.k==='e'?'edit':'repay')+'" data-id="'+r.id+'" title="'+T('תיקון הסכום','Fix amount')+'" aria-label="'+T('תיקון הסכום','Fix amount')+': '+esc(fmtPrice(r.amt,cur))+'">'+fmtPrice(r.amt,cur)+' ✏️</button>')+
        (r.k==='e'?'<button class="mini" data-bd="del" data-id="'+r.id+'" aria-label="'+T('מחיקה','Delete')+' '+esc(r.note)+'">🗑️</button>':'')+'</span></div>';}).join(''):
      '<p class="muted-note">'+T('עוד אין הוצאות בחודש הזה. מוסיפים למעלה, או מסיימים קנייה ברשימה — והיא תופיע כאן לבד.','No expenses this month yet.')+'</p>')+'</div>';
  /* הוצאות קבועות */
  const fx=b.fixed.filter(f=>!f.to||f.to>now);
  h+='<div class="mecard"><h4>🔁 '+T('הוצאות קבועות כל חודש','Monthly fixed expenses')+'</h4>'+
    (fx.length?fx.map(f=>'<div class="merow"><span>'+(BD_CAT[f.cat]||BD_CAT.other)[1]+'</span><span class="grow"><b>'+esc(f.n)+'</b></span><b class="amt">'+fmtPrice(f.amt,cur)+'</b><button class="mini" data-bd="fxdel" data-id="'+f.id+'" aria-label="'+T('הפסקה','Stop')+' '+esc(f.n)+'">🗑️</button></div>').join('')+
      '<p class="muted-note" style="margin:6px 0 0">'+T('סה״כ קבוע: ','Fixed total: ')+'<b>'+fmtPrice(fx.reduce((s,f)=>s+f.amt,0),cur)+'</b> '+T('בחודש','a month')+'</p>':'<p class="muted-note">'+T('שכר דירה, ארנונה, גן, ועד בית... מוסיפים פעם אחת — ונכנס לבד בכל חודש.','Rent, tuition... add once, counted every month.')+'</p>')+
    '<details class="bd50more"'+(bdFormOpen?' open':'')+'><summary>➕ '+T('הוצאה קבועה חדשה','New fixed expense')+'</summary><div class="bd50row"><input id="bdFxN" maxlength="60" placeholder="'+T('למשל: ארנונה','e.g. Rent')+'" aria-label="'+T('שם','Name')+'"><input id="bdFxA" type="number" inputmode="decimal" min="0" placeholder="'+T('סכום','Amount')+'" aria-label="'+T('סכום לחודש','Monthly amount')+'"></div><div class="bd50row"><select id="bdFxC" aria-label="'+T('קטגוריה','Category')+'">'+catOpts('home')+'</select><button data-bd="fxadd">💾 '+T('הוספה','Add')+'</button></div></details></div>';
  /* חצי שנה אחרונה */
  const ms=[];for(let i=5;i>=0;i--)ms.push(mk(new Date(new Date().getFullYear(),new Date().getMonth()-i,1)));
  const vals=ms.map(x=>bdMonth(x).spent),top=Math.max(1,b.limit,...vals);
  h+='<div class="mecard"><h4>📈 '+T('6 החודשים האחרונים','Last 6 months')+'</h4><div class="bd50bars" role="img" aria-label="'+esc(ms.map((x,i)=>mName26(x)+': '+fmtPrice(vals[i],cur)).join(', '))+'">'+
    (b.limit?'<u style="bottom:'+(18+Math.round(80*b.limit/top))+'px" title="'+T('התקציב','Budget')+'"></u>':'')+
    ms.map((x,i)=>'<button type="button" data-bd="m" data-m="'+x+'" class="'+(x===m?'on':'')+'" aria-label="'+esc(mName26(x))+'"><span>'+(vals[i]?Math.round(vals[i]):'')+'</span><i style="height:'+Math.round(80*vals[i]/top)+'px"'+(b.limit&&vals[i]>b.limit?' class="bad"':'')+'></i><span>'+shortM(x)+'</span></button>').join('')+'</div>'+
    '<div class="row2" style="margin-top:8px"><button class="btn sec" data-bd="share">📤 '+T('שיתוף סיכום החודש','Share month summary')+'</button><button class="btn sec" data-bd="savings">💚 '+T('כמה חסכתי','My savings')+'</button></div></div>';
  h+='<p class="muted-note">🔒 '+T('התקציב משותף רק עם מי שמחובר לרשימות המשפחתיות שלכם, ומתעדכן בכל המכשירים.','Shared only with your family list members, synced on all devices.')+'</p></div>';
  return h;}
function fmtDateShort(ts){try{return new Intl.DateTimeFormat(prefs.lang==='en'?'en-US':'he-IL',{day:'numeric',month:'short'}).format(new Date(ts));}catch(e){return dayKey(ts);}}
function bdRender(){if(meTab!=='budget')return;const body=$b('#meBody'),y=body?body.scrollTop:0;renderMe();const nb=$b('#meBody');if(nb)nb.scrollTop=y;}
function bdShareText(){const b=B(),cur=myCurrency(),m=bdM||mk(nowTs()),d=bdMonth(m);
  return '💰 '+T('תקציב הבית — ','Home budget — ')+mName26(m)+'\n'+T('הוצאנו: ','Spent: ')+fmtPrice(d.spent,cur)+(b.limit?' '+T('מתוך','of')+' '+fmtPrice(b.limit,cur):'')+'\n\n'+
    BD_CATS.filter(c=>d.by[c[0]]).sort((a,c)=>d.by[c[0]]-d.by[a[0]]).map(c=>c[1]+' '+T(c[2],c[3])+': '+fmtPrice(d.by[c[0]],cur)).join('\n')+'\n\n'+T('מתוך ים שופינג — www.yamshopping.com','via yamshopping.com');}

/* ---------- פעולות ---------- */
function addExp(amt,cat,note,ts){amt=num(amt);if(!(amt>0&&amt<10000000)){flash('⚠️ '+T('כתבו סכום','Enter an amount'));return null;}
  note=String(note||'').replace(/[<>]/g,'').trim().slice(0,80);if(hasProfanity(note)){flash('🙏');return null;}
  const e={id:uid(),ts:ts||nowTs(),amt:r2(amt),cat:BD_CAT[cat]?cat:bdCatGuess(note),note,by:(state.user&&state.user.name)||'',mt:nowTs(),del:false};B().exp.push(e);bdSave();return e;}
/* a='clear' — מוחקים את הסכום: הקנייה לא נספרת עד שכותבים סכום חדש (גם לא לפי הסה״כ שבקבלה) */
function setPaid(id,a,c){const b=B(),p=b.paid[id]||{a:0,c:'',mt:0};if(a==='clear'){p.a=0;p.z=1;}else if(a!=null){p.a=r2(num(a));delete p.z;}if(c!=null)p.c=BD_CAT[c]?c:'';p.mt=nowTs();b.paid[id]=p;bdSave();}
let bdPick='';
document.addEventListener('click',async e=>{const t=e.target.closest('#meBody [data-bd],#meBody [data-bdcat]');if(!t)return;
  if(t.dataset.bdcat){bdPick=t.dataset.bdcat;t.parentNode.querySelectorAll('[data-bdcat]').forEach(x=>{const on=x===t;x.classList.toggle('on',on);x.setAttribute('aria-checked',String(on));});return;}
  const a=t.dataset.bd,b=B(),id=t.dataset.id;e.preventDefault();
  if(a==='m'){bdM=t.dataset.m;bdOpenCat='';bdRender();return;}
  if(a==='setlimit'||a==='limit'){let v=a==='setlimit'?$b('#bdLimit').value:await uiPrompt(T('כמה התקציב החודשי של הבית?','Monthly home budget?'),b.limit?String(b.limit):'');if(v===null)return;
    v=num(v);if(v<0)return;b.limit=v>0?r2(v):0;b.smt=nowTs();bdSave();flash('🎯 '+(b.limit?T('התקציב נקבע: '+fmtPrice(b.limit,myCurrency())+' לחודש','Budget set'):T('התקציב בוטל','Budget removed')));bdRender();return;}
  if(a==='add'){const dv=$b('#bdDate').value,today=dayKey(new Date());const ts=/^\d{4}-\d{2}-\d{2}$/.test(dv)&&dv!==today?new Date(dv+'T12:00:00').getTime():nowTs();
    const x=addExp($b('#bdAmt').value,bdPick,$b('#bdNote').value,ts);if(x){bdPick='';bdM=mk(x.ts);flash('✅ '+T('נוסף: ','Added: ')+fmtPrice(x.amt,myCurrency())+' · '+BD_CAT[x.cat][1]+' '+T(BD_CAT[x.cat][2],BD_CAT[x.cat][3]));bdRender();}return;}
  if(a==='del'){const x=b.exp.find(y=>y.id===id);if(!x||!(await uiConfirm(T('למחוק את ההוצאה "'+x.note+'"?','Delete this expense?'))))return;x.del=true;x.mt=nowTs();bdSave();bdRender();return;}
  if(a==='edit'){const x=b.exp.find(y=>y.id===id);if(!x)return;const v=await uiPrompt(T('הסכום הנכון:','Correct amount:'),String(x.amt));if(v===null)return;if(!(num(v)>0))return;x.amt=r2(num(v));x.mt=nowTs();bdSave();bdRender();return;}
  if(a==='pay'){const i=$b('#meBody [data-bdpay="'+id+'"]');if(!i||!(num(i.value)>0)){flash('⚠️ '+T('כתבו כמה יצא בקופה','Enter the amount'));return;}setPaid(id,i.value,null);flash('💾 '+T('נכנס לתקציב','Added to the budget'));bdRender();return;}
  if(a==='repay'){const h=(state.history||[]).find(x=>String(x.ts)===id);const v=await uiPrompt(T('כמה יצא בקופה? (ריק = למחוק את הסכום)','How much was it? (empty = clear the amount)'),h?String(tripAmt(h)):'');if(v===null)return;
    if(!(num(v)>0)){if(!String(v).trim()&&await uiConfirm(T('למחוק את הסכום של הקנייה הזו? היא לא תיספר בהוצאות עד שתכתבו סכום חדש.','Clear this purchase amount?'))){setPaid(id,'clear',null);bdRender();}return;}setPaid(id,v,null);bdRender();return;}
  if(a==='cat'){bdOpenCat=bdOpenCat===t.dataset.c?'':t.dataset.c;bdRender();return;}
  if(a==='catlim'||a==='catadd'){const c=a==='catadd'?$b('#bdCatSel').value:t.dataset.c;let v=a==='catadd'?$b('#bdCatLim').value:await uiPrompt(T('כמה לחודש על '+T(BD_CAT[c][2],BD_CAT[c][3])+'? (0 = בלי)','Monthly budget for this category? (0 = none)'),String(b.cats[c]||''));if(v===null)return;
    v=num(v);if(v>0)b.cats[c]=r2(v);else delete b.cats[c];b.smt=nowTs();bdSave();bdRender();return;}
  if(a==='fxadd'){const n=$b('#bdFxN').value.replace(/[<>]/g,'').trim().slice(0,60),v=num($b('#bdFxA').value);if(!n||!(v>0)){flash('⚠️ '+T('חסר שם או סכום','Missing name or amount'));return;}if(hasProfanity(n)){flash('🙏');return;}
    b.fixed.push({id:uid(),n,amt:r2(v),cat:$b('#bdFxC').value,from:mk(nowTs()),to:'',mt:nowTs()});bdFormOpen=false;bdSave();flash('🔁 '+T('נוסף — ייכנס לבד כל חודש','Added — counted every month'));bdRender();return;}
  if(a==='fxdel'){const f=b.fixed.find(x=>x.id===id);if(!f||!(await uiConfirm(T('להפסיק את "'+f.n+'" מהחודש הבא? (החודשים שעברו נשארים)','Stop this from next month?'))))return;
    const n=new Date();f.to=mk(new Date(n.getFullYear(),n.getMonth()+1,1));if(f.from>=f.to)f.to=f.from;f.mt=nowTs();bdSave();bdRender();return;}
  if(a==='share'){const txt=bdShareText();if(navigator.share)navigator.share({text:txt}).catch(()=>{});else window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank','noopener');return;}
  if(a==='savings'){$b('#meOverlay').classList.remove('open');openSavings26();return;}
},true);
document.addEventListener('change',e=>{const s=e.target.closest('#meBody [data-bdtc]');if(!s)return;setPaid(s.dataset.bdtc,null,s.value);flash('🏷️ '+T('הקטגוריה עודכנה','Category updated'));bdRender();},true);
document.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const i=e.target.closest('#meBody #bdAmt,#meBody #bdNote,#meBody #bdLimit,#meBody [data-bdpay]');if(!i)return;e.preventDefault();
  const btn=i.dataset.bdpay?$b('#meBody [data-bd="pay"][data-id="'+i.dataset.bdpay+'"]'):i.id==='bdLimit'?$b('#meBody [data-bd="setlimit"]'):$b('#meBody [data-bd="add"]');if(btn)btn.click();},true);

/* ---------- באזור האישי: לשונית משלה, אריח בדף הבית שלו, ותזכורת ב"הקניות שלי" ---------- */
if(!ME_TABS.some(t=>t[0]==='budget'))ME_TABS.splice(1,0,['budget','💰 תקציב הבית','💰 Home budget']);
const _bdRenderMe=renderMe;
renderMe=function(){const r=_bdRenderMe.apply(this,arguments);try{const body=$b('#meBody');if(!body)return r;
  if(meTab==='budget'){body.innerHTML=bdHtml();}
  else if(meTab==='info'){const tiles=body.querySelector('.metiles');if(tiles&&!tiles.querySelector('[data-bdgo]')){const b=B(),s=bdMonth(mk(nowTs())).spent;
    tiles.insertAdjacentHTML('afterbegin','<button class="metile bd50tile" data-bdgo="1"><span>💰</span>'+T('תקציב הבית','Home budget')+'<small>'+(b.limit?T('נשאר ','Left ')+fmtPrice(Math.max(0,b.limit-s),myCurrency()):s?T('החודש: ','This month: ')+fmtPrice(s,myCurrency()):T('לקבוע תקציב','Set a budget'))+'</small></button>');}}
  else if(meTab==='purchases'&&!body.querySelector('.bd50strip')){const s=bdMonth(mk(nowTs()));if(s.rows.length)body.insertAdjacentHTML('afterbegin','<button class="bd50strip" data-bdgo="1">💰 '+T('החודש הוצאתם ','This month: ')+'<b>'+fmtPrice(s.spent,myCurrency())+'</b>'+(s.unknown?' · ✍️ '+T(s.unknown+' קניות בלי סכום',s.unknown+' without amount'):'')+' — '+T('לתקציב הבית','to the home budget')+' ‹</button>');}
}catch(e){console.warn('budget',e);}return r;};
document.addEventListener('click',e=>{const t=e.target.closest('#meBody [data-bdgo]');if(!t)return;e.preventDefault();e.stopPropagation();bdM=null;meTab='budget';renderMe();},true);
function openBudget(){bdM=null;bdOpenCat='';openMe('budget');}
window.openBudget=openBudget;
window.bdApi={B,setPaid,tripAmt,tripCat,bdSave,num,r2};
/* בתפריט ⚙️ — לפני "כמה חסכתי" */
try{add26('miBudget50','💰','תקציב הבית','Home budget','miFinish',openBudget);}catch(e){}

/* ---------- אחרי "סיום קנייה": כמה יצא בקופה? (רק למי שקבע תקציב) ---------- */
const _bdFinish=finishList;
finishList=function(silent,opts){const n=_bdFinish.apply(this,arguments);
  try{if(n&&!lastFinishTwin&&B().limit&&state.history[0]){const h=state.history[0];setTimeout(()=>askPaid(h),900);}}catch(e){}
  return n;};
function askPaid(h){if(document.querySelector('#bdAsk'))return;const ov=document.createElement('div');ov.id='bdAsk';ov.className='qp15 open';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-labelledby','bdAskT');
  ov.innerHTML='<div class="qpcard"><div class="qphead"><b id="bdAskT">💰 '+T('כמה יצא בקופה?','How much was it?')+'</b><button aria-label="'+T('סגירה','Close')+'" data-x>✕</button></div>'+
    '<p class="muted-note" style="margin:0 0 8px">'+T('כדי שהקנייה תיכנס לתקציב הבית'+(h.store?' ('+esc(h.store)+')':'')+'. אפשר גם לצלם את הקבלה 🧾.','So it counts in the home budget.')+'</p>'+
    '<div class="bd50row"><input id="bdAskV" type="number" inputmode="decimal" min="0" step="0.1" placeholder="'+T('סכום','Amount')+' ('+esc(myCurrency())+')" aria-label="'+T('סכום','Amount')+'"><button id="bdAskOk">💾 '+T('שמירה','Save')+'</button></div><button class="btn sec" data-x style="width:100%;margin-top:6px">'+T('אחר כך','Later')+'</button></div>';
  document.body.appendChild(ov);const close=()=>ov.remove();const inp=ov.querySelector('#bdAskV');setTimeout(()=>inp.focus(),50);
  ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-x]'))close();});
  const ok=()=>{if(!(num(inp.value)>0)){inp.focus();return;}setPaid(String(h.ts),inp.value,null);close();const b=B(),s=bdMonth(mk(nowTs())).spent;
    flash('💰 '+T('נכנס לתקציב · נשארו '+fmtPrice(Math.max(0,b.limit-s),myCurrency())+' החודש','Saved · left '+fmtPrice(Math.max(0,b.limit-s),myCurrency())));};
  ov.querySelector('#bdAskOk').onclick=ok;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();ok();}if(e.key==='Escape')close();};}

/* ---------- קבלה: שומרים את הסכום לתשלום שבקבלה ---------- */
const _bdConfirm=confirmUpload;
confirmUpload=async function(){let tot=0;const t0=nowTs();try{if(upMode==='receipt'&&upResult&&upResult.receipt)tot=num(upResult.receipt.total);}catch(e){}
  const res=await _bdConfirm.apply(this,arguments);
  try{if(tot>0&&tot<1000000){const h=(state.history||[]).find(x=>x&&x.receipt&&(x.uploadedAt||0)>=t0);if(h&&!(num(h.total)>0)){h.total=r2(tot);bdSave();}}}catch(e){}
  return res;};

/* ---------- יאמי ---------- */
yamiStep(async raw=>{const t=String(raw||'').trim().replace(/[?!.]+$/,'');let m;
  if(/^(תקציב|תקציב הבית|ניהול תקציב|התקציב( שלי| שלנו)?|כמה הוצאתי( החודש)?|כמה הוצאנו( החודש)?|ההוצאות( שלי| שלנו)?( החודש)?|כמה נשאר( בתקציב)?( החודש)?)$/.test(t)){
    const b=B(),d=bdMonth(mk(nowTs())),cur=myCurrency();
    botSay('💰 '+T('החודש הוצאתם ','This month you spent ')+fmtPrice(d.spent,cur)+(b.limit?' '+T('מתוך ','of ')+fmtPrice(b.limit,cur)+' — '+(b.limit>=d.spent?T('נשארו ','left ')+fmtPrice(b.limit-d.spent,cur):T('עברתם ב-','over by ')+fmtPrice(d.spent-b.limit,cur)):'. '+T('אפשר לקבוע תקציב חודשי בלשונית שפתחתי.','You can set a monthly budget in the tab I opened.')));
    openBudget();return true;}
  if((m=t.match(/^(?:הוצאתי|הוצאנו|שילמתי|שילמנו|הוצאה(?: של)?)\s+(\d[\d,]*(?:\.\d+)?)\s*(?:ש"ח|ש״ח|שח|₪|שקלים|שקל)?\s*(?:על|ל|עבור|ב|-)?\s*(.{0,60})$/))){
    const amt=num(m[1].replace(/,/g,'')),note=m[2].trim();if(!(amt>0))return false;
    const x=addExp(amt,bdCatGuess(note),note);if(!x)return true;const b=B(),s=bdMonth(mk(nowTs())).spent,cur=myCurrency();
    botSay('✅ '+T('רשמתי בתקציב הבית: ','Added to the home budget: ')+fmtPrice(x.amt,cur)+' · '+BD_CAT[x.cat][1]+' '+T(BD_CAT[x.cat][2],BD_CAT[x.cat][3])+(note?' ('+note+')':'')+(b.limit?'\n'+T('נשארו החודש ','Left this month ')+fmtPrice(Math.max(0,b.limit-s),cur):''));
    if(meTab==='budget')bdRender();return true;}
  return false;});

/* ---------- עיצוב ---------- */
const st=document.createElement('style');st.textContent=
  '.bd50nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.bd50nav b{font-size:18px}'+
  '.bd50hero{text-align:center;border-width:2px}.bd50hero.ok{border-color:var(--hdr2)}.bd50hero.near{border-color:#c98a00}.bd50hero.over{border-color:#c0392b}'+
  '.bd50lbl{font-size:14px;color:var(--muted)}.bd50big{font-size:34px;font-weight:800;margin:2px 0 8px;color:var(--hdr2)}.bd50hero.near .bd50big{color:#b07800}.bd50hero.over .bd50big{color:#c0392b}'+
  '.bd50bar{position:relative;height:14px;border-radius:8px;background:var(--chipbg);border:1px solid var(--chipbr);overflow:hidden;margin:4px 0 8px}.bd50bar i{position:absolute;inset-block:0;inset-inline-start:0;background:var(--hdr2);border-radius:8px;transition:width .4s}'+
  '.bd50hero.near .bd50bar i{background:#d99a12}.bd50hero.over .bd50bar i{background:#c0392b}.bd50bar u{position:absolute;inset-block:-2px;width:2px;background:var(--text);opacity:.55}'+
  '.bd50sub{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px;font-size:14px}.bd50mood{margin:8px 0 6px;font-weight:600;font-size:15px}'+
  '.bd50row{display:flex;gap:8px;align-items:center;margin-top:8px}.bd50row input,.bd50row select{flex:1;min-width:0;margin:0}.bd50row button{width:auto;margin:0;white-space:nowrap}'+
  '.bd50chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#meBody .bd50chip{background:var(--chipbg);color:var(--text);border:1px solid var(--chipbr);border-radius:16px;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer;width:auto;margin:0}#meBody .bd50chip.on{background:var(--hdr2);color:#fff;border-color:var(--hdr2)}'+
  '#meBody .bd50cat{display:flex;gap:10px;align-items:center;width:100%;background:none;border:none;border-bottom:1px solid var(--line);padding:8px 0;margin:0;font:inherit;color:var(--text);cursor:pointer;text-align:start}.bd50cat .e{font-size:22px}.bd50cat .g{flex:1;min-width:0}'+
  '.bd50cat .t{display:flex;justify-content:space-between;gap:8px;font-size:14px}.bd50cat .bad,.bd50 .bad{color:#c0392b}.bd50mini{display:block;height:7px;border-radius:5px;background:var(--chipbg);margin-top:5px;overflow:hidden}.bd50mini i{display:block;height:100%;background:var(--hdr2);border-radius:5px}.bd50mini i.bad{background:#c0392b}'+
  '.bd50catx{padding:4px 0 8px;padding-inline-start:34px;font-size:13px}.bd50l{display:flex;gap:8px;padding:3px 0}.bd50l span{flex:1}.bd50l small{color:var(--muted)}'+
  '.bd50r{flex-wrap:nowrap;align-items:flex-start}.bd50r .grow{min-width:0}.bd50act{display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex:none}.bd50r .e{font-size:20px}#meBody .bd50amt{background:none;color:var(--text);border:1px dashed var(--chipbr);border-radius:10px;padding:5px 8px;font-weight:700;white-space:nowrap;width:auto;margin:0}.bd50r .amt,.bd50 .amt{white-space:nowrap}.bd50pay{display:flex;gap:4px;align-items:center}.bd50pay input{width:96px;margin:0;padding:6px 8px}#meBody .bd50sel{display:block;width:auto;max-width:170px;margin:5px 0 0;padding:3px 6px;font-size:13px;border-radius:8px}'+
  '.bd50tip{background:#fff6d6;color:#5a4a00;border-radius:10px;padding:6px 10px;font-size:14px;margin:0 0 6px}body.dark .bd50tip{background:#3a3418;color:#f3e6a8}'+
  '.bd50more{margin-top:8px}.bd50more summary{cursor:pointer;color:var(--hdr2);font-weight:600;font-size:15px}'+
  '.bd50bars{position:relative;display:flex;align-items:flex-end;gap:6px;height:122px;margin-top:6px}#meBody .bd50bars button{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;font:inherit;font-size:11px;color:var(--muted);background:none;border:none;padding:0;margin:0;cursor:pointer;width:auto}'+
  '.bd50bars i{display:block;width:100%;background:var(--hdr2);opacity:.55;border-radius:5px 5px 0 0;min-height:2px}.bd50bars button.on i{opacity:1}.bd50bars i.bad{background:#c0392b}.bd50bars button.on span:last-child{color:var(--text);font-weight:700}'+
  '.bd50bars u{position:absolute;inset-inline:0;border-top:2px dashed #c98a00;pointer-events:none}'+
  '.bd50tile small{display:block;color:var(--hdr2);font-weight:700;margin-top:2px}'+
  '#meBody .bd50strip{display:block;width:100%;text-align:start;background:var(--recv);border:1.5px solid var(--hdr2);border-radius:12px;padding:10px 12px;margin:0 0 10px;font:inherit;color:var(--text);cursor:pointer}';
document.head.appendChild(st);
setTimeout(()=>{try{bdAlerts();}catch(e){}},4000);
})();
