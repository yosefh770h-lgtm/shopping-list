
/* ================= v28: היכרות חובה קצרה — הבית, איפה קונים, הקצב; אחוז מילוי; כמויות לבד; רשימה לפי חנויות; תזכורת יום לפני ================= */
const $28=s=>document.querySelector(s);
const prof28=()=>{const me=meData();me.profile=me.profile&&typeof me.profile==='object'?me.profile:{};return me.profile;};
const WHERE28=[['super','🛒','סופר — הקנייה הגדולה'],['veg','🥕','ירקות ופירות'],['meat','🍗','בשר ועוף'],['bread','🍞','לחם ומאפים'],['pharm','🧴','פארם וניקיון'],['online','🌐','אונליין']];
const LOCAL28={veg:'ירקן שכונתי',meat:'אטליז שכונתי',bread:'מאפייה שכונתית',pharm:'פארם שכונתי',super:'מכולת שכונתית',online:''};
const people28=p=>(+p.adults||0)+(+p.kids||0)+(+p.babies||0)||(+p.people||0);
/* אחוז מילוי — 8 פרטים */
function profileChecks28(){const me=meData(),p=prof28(),w=p.where||{};
  return [[T('כמה נפשות בבית','Household size'),people28(p)>0],[T('עיר','City'),!!String(me.city||'').trim()],[T('הסופר העיקרי','Main supermarket'),!!w.super],
    [T('איפה קונים ירקות, בשר ולחם','Where you buy produce, meat, bread'),['veg','meat','bread'].every(k=>w[k])],[T('יום הקנייה הגדולה','Big shopping day'),p.day!=null&&p.day!==''],
    [T('כל כמה זמן קונים','How often'),!!p.every],[T('בחנות או אונליין','Store or online'),!!p.mode],[T('אלרגיות בבית','Allergies'),Array.isArray(me.allergies)&&(me.allergies.length>0||!!p.noAllergies)]];}
const profilePct28=()=>{const c=profileChecks28();return Math.round(100*c.filter(x=>x[1]).length/c.length);};
const needStep1_28=()=>!(people28(prof28())>0&&String(meData().city||'').trim());
(function(){const st=document.createElement('style');st.textContent=
  '#onb28 .qpcard{max-width:480px;max-height:92vh;overflow-y:auto;gap:10px}#onb28 h3{margin:0;font-size:18px}#onb28 .dots{display:flex;gap:6px;justify-content:center}#onb28 .dots i{width:28px;height:6px;border-radius:3px;background:var(--line)}#onb28 .dots i.on{background:var(--hdr2)}'+
  '#onb28 .cnt{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}#onb28 .cnt b{min-width:28px;text-align:center;font-size:20px}#onb28 .cnt button{width:40px;height:40px;border-radius:50%;border:1px solid var(--chipbr);background:var(--inputbg);color:var(--text);font-size:20px;cursor:pointer}'+
  '#onb28 .chips{display:flex;flex-wrap:wrap;gap:6px}#onb28 .chips button{border:1px solid var(--chipbr);background:var(--inputbg);color:var(--text);border-radius:16px;padding:7px 12px;font:inherit;cursor:pointer}#onb28 .chips button[aria-pressed="true"]{background:var(--hdr2);color:#fff;border-color:var(--hdr2)}'+
  '#onb28 .wh{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center}#onb28 .wh select{padding:8px;border-radius:10px;border:1px solid var(--chipbr);background:var(--inputbg);color:var(--text);font:inherit}'+
  '#onb28 input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid var(--chipbr);border-radius:12px;background:var(--inputbg);color:var(--text);font:inherit;font-size:16px}'+
  '#onb28 .nav{display:flex;gap:8px;margin-top:4px}#onb28 .nav button{flex:1;padding:13px;border-radius:12px;border:none;background:var(--hdr2);color:#fff;font:inherit;font-weight:700;font-size:16px;cursor:pointer}#onb28 .nav button.sec{background:var(--inputbg);color:var(--text);border:1px solid var(--chipbr);font-weight:600}#onb28 .err{color:var(--bad,#b3261e);font-weight:600;margin:0}'+
  '.pbar28{height:10px;border-radius:5px;background:var(--line);overflow:hidden;margin:6px 0}.pbar28 i{display:block;height:100%;background:var(--hdr2)}';document.head.appendChild(st);})();
/* opts.force — נפתח גם למי שמחובר לבית משותף (לחיצה מפורשת); opts.back — בסיום חוזרים לאזור האישי */
function openOnboarding28(start,opts){opts=opts||{};if(!authUser||(state.follow&&!opts.force))return;let step=start||(needStep1_28()?1:2);const old=$28('#onb28');if(old)old.remove();
  const ov=document.createElement('div');ov.id='onb28';ov.className='qp15 open';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-labelledby','onb28t');document.body.appendChild(ov);
  const p=prof28();p.where=p.where||{};
  if(p.adults==null&&p.people){p.adults=Math.min(+p.people,2);p.kids=Math.max(0,+p.people-2);p.babies=0;}
  const chains=()=>Array.from(new Set(allChainNames().concat((meData().stores||[]).map(s=>s.name)).filter(Boolean))).slice(0,60);
  const chip=(k,v,label,on)=>'<button type="button" data-'+k+'="'+esc(String(v))+'" aria-pressed="'+(on?'true':'false')+'">'+label+'</button>';
  const draw=()=>{const dots='<div class="dots" aria-hidden="true">'+[1,2,3].map(i=>'<i class="'+(i<=step?'on':'')+'"></i>').join('')+'</div>';let h='';
    if(step===1)h='<h3 id="onb28t">👋 '+T('נעים להכיר! כמה שאלות קצרות','Nice to meet you!')+'</h3><p class="muted-note" style="margin:0">'+T('ככה האתר ויאמי ידעו כמויות לבד, יציעו מה צריך ויחשבו איפה הכי זול בשבילכם. (1 מתוך 3)','So the site and Yami can suggest amounts and what you need. (1 of 3)')+'</p>'+
      '<b>👨‍👩‍👧 '+T('כמה נפשות בבית?','How many people at home?')+'</b>'+
      [['adults',T('מבוגרים','Adults')],['kids',T('ילדים','Children')],['babies',T('תינוקות','Babies')]].map(([k,l])=>'<div class="cnt"><span>'+l+'</span><span style="display:flex;align-items:center;gap:8px"><button type="button" data-dec="'+k+'" aria-label="'+l+' − 1">−</button><b aria-live="polite" id="onb28_'+k+'">'+(+p[k]||0)+'</b><button type="button" data-inc="'+k+'" aria-label="'+l+' + 1">+</button></span></div>').join('')+
      '<label class="il" for="onb28city"><b>📍 '+T('באיזו עיר גרים?','Which city?')+'</b></label><input id="onb28city" list="onb28cl" maxlength="40" autocomplete="off" value="'+esc(meData().city||'')+'" placeholder="'+T('התחילו להקליד — למשל בני ברק','Start typing')+'"><datalist id="onb28cl">'+Object.keys(CITIES).map(c=>'<option value="'+esc(c)+'">').join('')+'</datalist>'+
      '<p class="err" id="onb28err" role="alert" hidden></p><div class="nav"><button id="onb28next">'+T('הבא ←','Next')+'</button></div>';
    if(step===2)h='<h3 id="onb28t">🏪 '+T('איפה קונים כל דבר?','Where do you buy what?')+'</h3><p class="muted-note" style="margin:0">'+T('ככה הרשימה תתחלק לפי חנויות, ו"איפה הכי זול" יחשב לפי המקומות שלכם. (2 מתוך 3)','Splits your list by store. (2 of 3)')+'</p><div class="wh">'+
      WHERE28.map(([k,ic,l])=>{const cur=p.where[k]||'';const opts=['',...chains(),LOCAL28[k],'—'].filter((x,i,a)=>x!==undefined&&a.indexOf(x)===i);if(cur&&!opts.includes(cur))opts.splice(1,0,cur);
        return '<label for="onb28w_'+k+'">'+ic+' '+T(l,l)+'</label><select id="onb28w_'+k+'" data-w="'+k+'">'+opts.filter(x=>x!==null).map(o=>'<option value="'+esc(o)+'"'+(o===cur?' selected':'')+'>'+(o===''?T('בחרו...','Choose...'):o==='—'?T('לא קונים את זה','We don\'t buy this'):esc(o))+'</option>').join('')+'</select>';}).join('')+'</div>'+
      '<div class="nav"><button class="btn sec" id="onb28later">'+T('אחר כך','Later')+'</button><button id="onb28next">'+T('הבא ←','Next')+'</button></div>';
    if(step===3)h='<h3 id="onb28t">📅 '+T('הקצב של הבית','Your shopping rhythm')+'</h3><p class="muted-note" style="margin:0">'+T('ככה יאמי תזכיר יום לפני ותציע מה כנראה נגמר. (3 מתוך 3)','So Yami can remind you the day before. (3 of 3)')+'</p>'+
      '<b>'+T('באיזה יום הקנייה הגדולה?','Big shopping day?')+'</b><div class="chips">'+[0,1,2,3,4,5,6].map(d=>chip('day',d,orderDayName(d),+p.day===d&&p.day!=null&&p.day!=='')).join('')+chip('day','',T('אין יום קבוע','No fixed day'),p.day==='')+'</div>'+
      '<b>'+T('כל כמה זמן?','How often?')+'</b><div class="chips">'+[['week',T('כל שבוע','Weekly')],['2w',T('כל שבועיים','Every 2 weeks')],['often',T('כמה פעמים בשבוע','Several times a week')]].map(([v,l])=>chip('every',v,l,p.every===v)).join('')+'</div>'+
      '<b>'+T('איך קונים?','How do you shop?')+'</b><div class="chips">'+[['store',T('בחנות','In store')],['online',T('אונליין','Online')],['both',T('גם וגם','Both')]].map(([v,l])=>chip('mode',v,l,p.mode===v)).join('')+'</div>'+
      '<b>⚠️ '+T('אלרגיות בבית (רשות)','Allergies (optional)')+'</b><div class="chips">'+ALG27.map(a=>chip('alg',a,esc(a),(meData().allergies||[]).includes(a))).join('')+chip('alg','',T('אין','None'),!!p.noAllergies&&!(meData().allergies||[]).length)+'</div>'+
      '<div class="nav"><button class="btn sec" id="onb28later">'+T('אחר כך','Later')+'</button><button id="onb28next">✅ '+T('סיום','Done')+'</button></div>';
    ov.innerHTML='<div class="qpcard">'+dots+h+'</div>';
    if(step===1){const dl=ov.querySelector('#onb28cl');if(typeof fillCityList==='function')fillCityList(dl);}
    setTimeout(()=>{const f=ov.querySelector('h3');if(f){f.tabIndex=-1;f.focus();}},30);};
  const bad=m=>{const e=ov.querySelector('#onb28err');if(e){e.textContent=m;e.hidden=false;}else flash(m);};
  const finish=later=>{p.onb=Object.assign({},p.onb,later?{later:Date.now()}:{done:Date.now()});p.people=people28(p);if(!later)p.done=true;meSave();ov.remove();try{render();}catch(e){}
    if(opts.back&&typeof openMe==='function'){try{openMe('info');}catch(e){}}
    flash(later?'🙂 '+T('אפשר להשלים מתי שתרצו — באזור האישי','You can finish anytime in your personal area'):'💚 '+T('תודה! הפרופיל מולא '+profilePct28()+'%','Thanks! Profile '+profilePct28()+'% complete'));};
  ov.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
    if(d.inc||d.dec){const k=d.inc||d.dec;p[k]=Math.max(0,Math.min(20,(+p[k]||0)+(d.inc?1:-1)));ov.querySelector('#onb28_'+k).textContent=p[k];return;}
    if('day' in d){p.day=d.day===''?'':+d.day;draw();return;}if(d.every){p.every=d.every;draw();return;}if(d.mode){p.mode=d.mode;draw();return;}
    if('alg' in d){let a=meData().allergies||[];if(d.alg===''){a=[];p.noAllergies=true;}else{p.noAllergies=false;a=a.includes(d.alg)?a.filter(x=>x!==d.alg):a.concat(d.alg);}meData().allergies=a;meSave();draw();return;}
    if(t.id==='onb28later'){finish(true);return;}
    if(t.id==='onb28next'){
      if(step===1){const c=cleanCity(ov.querySelector('#onb28city').value);if(people28(p)<1){bad(T('כמה נפשות בבית? לפחות 1 🙂','At least 1 person 🙂'));return;}
        if(!c||c.length<2||hasProfanity(c)){bad(T('נא לבחור עיר 🙂','Please choose a city 🙂'));return;}
        const kc=knownCity(c);meData().city=kc||c;if(kc){state.city=kc;try{savePrefs();}catch(err){}}p.people=people28(p);meSave();step=2;draw();return;}
      if(step===2){ov.querySelectorAll('[data-w]').forEach(s=>{if(s.value)p.where[s.dataset.w]=s.value;else delete p.where[s.dataset.w];});
        const ms=meData().stores;Object.values(p.where).forEach(n=>{if(n&&n!=='—'&&!ms.some(s=>s.name===n))ms.push({id:uid(),name:n});});meSave();step=3;draw();return;}
      if(step===3){finish(false);return;}}});
  ov.addEventListener('change',e=>{const s=e.target.closest('[data-w]');if(s){if(s.value)p.where[s.dataset.w]=s.value;else delete p.where[s.dataset.w];}});
  ov.addEventListener('keydown',e=>{if(e.key!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();if(step>1)finish(true);},true);
  /* שלב 1 חובה: אם משהו אחר סוגר את החלון — פותחים שוב */
  new MutationObserver(()=>{if(document.body.contains(ov)&&step===1&&!ov.classList.contains('open'))ov.classList.add('open');}).observe(ov,{attributes:true,attributeFilter:['class']});
  draw();}
/* במקום חלון "באיזו עיר" — ההיכרות (שלב 1 חובה, כולל העיר) */
const _v28AskCity=askCity;askCity=function(){if(!authUser||state.follow||$28('#onb28'))return;const p=prof28();
  if(needStep1_28())return openOnboarding28(1);
  if(!(p.onb&&(p.onb.done||p.onb.later)))return openOnboarding28(2);};
/* תזכורת עדינה פעם ביום כשהפרופיל לא מלא */
function nudge28(){if(!authUser||state.follow)return;const pct=profilePct28();if(pct>=100)return;const k=dayKey(new Date());const p=prof28();if(p.nudged===k)return;
  if(p.onb&&p.onb.later&&Date.now()-p.onb.later<DAY_MS)return;p.nudged=k;meSave();
  notify('onb-'+k,'order','📊 '+T('הפרופיל שלך מולא '+pct+'%','Your profile is '+pct+'% complete'),T('עוד כמה לחיצות — ויאמי תדע כמויות ותזכיר מה צריך. לחצו להשלמה','A few taps and Yami will know amounts'),'list');}
document.addEventListener('click',e=>{const it=e.target.closest('[data-id^="onb-"],[data-nid^="onb-"]');if(it)setTimeout(()=>openOnboarding28(),50);});
/* ---------- 📊 באזור האישי: אחוז מילוי + מה חסר ---------- */
const _v28RenderMe=renderMe;renderMe=function(){const r=_v28RenderMe.apply(this,arguments);try{if(meTab==='info'&&authUser){const b=$28('#meBody');if(b&&!b.querySelector('#me28')){const pct=profilePct28(),miss=profileChecks28().filter(x=>!x[1]).map(x=>x[0]);
  b.insertAdjacentHTML('afterbegin','<div class="mecard" id="me28"><h4>📊 '+T('הפרופיל שלך מולא','Your profile is')+' '+pct+'%</h4><div class="pbar28" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'" aria-label="'+T('מילוי הפרופיל','Profile completion')+'"><i style="width:'+pct+'%"></i></div>'+
    (miss.length?'<p class="muted-note" style="margin:4px 0">'+T('חסר: ','Missing: ')+esc(miss.join(' · '))+'</p><button id="me28go">'+T('להשלים עכשיו','Complete now')+'</button>':'<p style="margin:4px 0">💚 '+T('הכל מולא — יאמי מכירה אתכם!','All set!')+'</p><button class="btn sec" id="me28go">'+T('עריכה','Edit')+'</button>')+'</div>');
  b.querySelector('#me28go').onclick=()=>{$28('#meOverlay').classList.remove('open');openOnboarding28(needStep1_28()?1:(miss.some(m=>/סופר|ירקות|supermarket|produce/i.test(m))?2:(miss.length?3:1)),{force:true,back:true});};}}}catch(e){}return r;};
/* ---------- 🔢 כמויות לבד ---------- */
/* כמה קונים לנפש לשבוע (הערכה); [כמות לנפש, יחידה, מינימום] */
const QTY28={'חלב':[0.8,'',1],'לחם':[0.5,'',1],'חלה':[0.35,'',2],'ביצים':[0.25,'תבניות',1],'יוגורט':[1.5,'',2],'גבינה לבנה':[0.3,'',1],'קוטג׳':[0.3,'',1],'גבינה צהובה':[0.1,'חבילות',1],
  'עוף':[0.4,'ק״ג',1],'בשר טחון':[0.15,'ק״ג',0.5],'עגבניות':[0.4,'ק״ג',1],'מלפפונים':[0.4,'ק״ג',1],'תפוחי אדמה':[0.5,'ק״ג',1],'בצל':[0.2,'ק״ג',0.5],'תפוחים':[0.4,'ק״ג',1],'בננות':[0.35,'ק״ג',0.5],
  'מים':[0.3,'שישיות',1],'שישיית מים':[0.3,'',1],'מיץ':[0.3,'',1],'נייר טואלט':[0.12,'חבילות',1],'חיתולים':[0,'',1],'פיתה':[1,'',5],'לחמניות':[1,'',4],'שוקו':[1,'',2],'אורז':[0.12,'ק״ג',1],'פסטה':[0.15,'',1]};
function learnedQty28(n){const qs=[];(state.history||[]).slice(0,60).forEach(h=>(h.items||[]).forEach(i=>{if(i&&i.n===n){const q=qtyParts(i.q);if(q&&q.n>0)qs.push(q);}}));
  if(qs.length<3)return null;qs.sort((a,b)=>a.n-b.n);const m=qs[Math.floor(qs.length/2)];return m.n+(m.u?' '+m.u:'');}
function suggestQty28(n){const learned=learnedQty28(n);if(learned)return {q:learned,why:T('לפי הקניות הקודמות','from your past shopping')};
  const p=prof28();const ppl=people28(p);const r=QTY28[n];if(!r||!ppl||!r[0])return null;const wk=p.every==='2w'?2:p.every==='often'?0.5:1;
  let v=r[0]*ppl*wk;v=r[1]==='ק״ג'?Math.max(r[2],Math.round(v*2)/2):Math.max(r[2],Math.round(v));if(!(v>0))return null;if(v===1&&!r[1])return null;
  return {q:String(v)+(r[1]?' '+r[1]:''),why:T('לפי '+ppl+' נפשות','for '+ppl+' people')};}
const _v28Add=addItem;addItem=function(name,qty){if((qty===''||qty==null)&&authUser&&!state.follow){const ex=curList().items.find(i=>i.n===name&&!i.done);
  if(!ex){const s=suggestQty28(name);if(s){const r=_v28Add.call(this,name,s.q);flash('✅ '+name+' ×'+s.q+' — '+s.why+T(' (אפשר לשנות)',' (you can change it)'));return r;}}}
  return _v28Add.apply(this,arguments);};
/* ---------- 🏪 הרשימה לפי חנויות ---------- */
const storeOf28=i=>{const w=prof28().where||{};const c=i.c&&i.c!=='אחר'?i.c:resolveCat(i.n);const k=c==='ירקות'||c==='פירות'?'veg':c==='בשר ועוף'||c==='דגים'?'meat':c==='לחמים'?'bread':c==='היגיינה'||c==='מוצרי ניקיון'||c==='בריאות ותרופות'?'pharm':'super';
  const s=w[k]&&w[k]!=='—'?w[k]:'';return s||(w.super&&w.super!=='—'?w.super:'')||(w.online&&w.online!=='—'?w.online:'')||T('בלי חנות','No store');};
const _v28Render=render;render=function(){const r=_v28Render.apply(this,arguments);try{const p=$28('#paneList');const w=prof28().where||{};const has=Object.values(w).some(v=>v&&v!=='—');if(!p||!has)return r;
  const bar=p.querySelector('.buybar');if(bar&&!bar.querySelector('[data-bystore28]'))bar.insertAdjacentHTML('beforeend','<button class="sec" data-bystore28="1" aria-pressed="'+(state.byStore28?'true':'false')+'">🏪 '+(state.byStore28?T('רגיל','Normal'):T('לפי חנות','By store'))+'</button>');
  if(state.byStore28&&bar){const l=curList();const groups={};l.items.forEach(i=>{const s=storeOf28(i);(groups[s]=groups[s]||[]).push(i);});
    const keep=bar.outerHTML;p.innerHTML=keep+Object.entries(groups).map(([s,its])=>'<div class="grp"><h3>🏪 '+esc(s)+' ('+its.filter(i=>!i.done).length+')</h3>'+its.map(itemRow).join('')+'</div>').join('');}}catch(e){}return r;};
document.addEventListener('click',e=>{if(e.target.closest('[data-bystore28]')){state.byStore28=!state.byStore28;save();render();}});
/* ---------- 📅 יום לפני הקנייה הגדולה: יאמי שואלת מה צריך ---------- */
function dayBefore28(){if(!authUser||state.follow)return;const p=prof28();if(p.day==null||p.day==='')return;const now=new Date();const tomorrow=(now.getDay()+1)%7;if(+p.day!==tomorrow)return;
  const k='db-'+dayKey(now);if(inbox.some(x=>x.id===k))return;
  const inList=new Set(curList().items.filter(i=>!i.done).map(i=>i.n));
  const names=Array.from(new Set([...(typeof dueItems==='function'?dueItems().map(x=>x.n):[]),...((p.staples)||[]),...((state.recurring||[]).filter(r=>!r.del).map(r=>r.n))])).filter(n=>!inList.has(n)).slice(0,12);
  const label=names.map(n=>{const s=suggestQty28(n);return s?n+' ×'+s.q:n;});
  if(names.length)notifySugg(k,'🛒 '+T('מחר יום הקנייה שלך ('+orderDayName(+p.day)+') — מה צריך?','Tomorrow is your shopping day — what do you need?'),names,'list');
  else notify(k,'order','🛒 '+T('מחר יום הקנייה שלך ('+orderDayName(+p.day)+')','Tomorrow is your shopping day'),T('כדאי לבדוק מה חסר בבית 🙂','Check what is missing at home'),'list');
  /* ההודעה של יאמי מחכה לפתיחה הבאה של יאמי — כדי שתופיע אחרונה, אחרי ברכות היום */
  if(label.length){state.dayBeforeMsg28={k,text:'🛒 '+T('מחר יום הקנייה שלך! לפי מה שאני יודעת עליכם, כנראה צריך: ','Tomorrow is your shopping day! You probably need: ')+label.join(', ')+'.\n'+T('לכתוב "להוסיף הכל"? או לבחור בפעמון 🔔','Write "add all" or pick in the bell 🔔')};state.pendingDayBefore28=names;save();}}
function sayDayBefore28(){const m=state.dayBeforeMsg28;if(!m||m.said)return;if(!String(m.k).endsWith(dayKey(new Date())))return;m.said=true;save();botSay(m.text);}
const _v28OpenBot=openBot;openBot=function(){const r=_v28OpenBot.apply(this,arguments);setTimeout(sayDayBefore28,350);return r;};
yamiStep(async raw=>{const t=String(raw||'').trim();if(/^(להוסיף הכל|תוסיפי הכל|כן להוסיף|הוסיפי הכל)$/.test(t)&&Array.isArray(state.pendingDayBefore28)&&state.pendingDayBefore28.length){
  const ns=state.pendingDayBefore28;state.pendingDayBefore28=null;ns.forEach(n=>addItem(n,''));save();render();botSay('✅ '+T('הוספתי '+ns.length+' מוצרים לרשימה, עם כמויות לפי הבית שלכם.','Added '+ns.length+' items.'));return true;}
  if(/^(היכרות|פרופיל|לעדכן פרופיל|הפרופיל שלי)$/.test(t)){openOnboarding28(0,{force:true});botSay('👋 '+T('פתחתי את ההיכרות — אפשר לעדכן הכל.','Opened the profile setup.'));return true;}return false;});
/* המחשבון לשבת מתחיל ממספר הנפשות */
const _v28Calc=openCalc26;openCalc26=function(type,n){if(!n){const ppl=people28(prof28());if(ppl)n=ppl;}return _v28Calc.call(this,type,n);};
/* היכרות דרך יאמי (ישנה) — שומרת גם את מספר הנפשות כמבוגרים */
const _v28AfterSigned=onSignedIn;onSignedIn=async function(){const r=await _v28AfterSigned.apply(this,arguments);setTimeout(()=>{nudge28();dayBefore28();},4000);return r;};
if(authUser)setTimeout(()=>{nudge28();dayBefore28();},4000);
setInterval(()=>{if(!document.hidden&&authUser)dayBefore28();},3*3600000);
