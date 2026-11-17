
/* ================= v45: 📅 מעקב תוקף · 🥇 סינון לפי הכשר · 🎤 רשימה קולית מהירה · 🕯️ מצב ערב שבת ================= */
const $45=s=>document.querySelector(s);
(function(){const st=document.createElement('style');st.textContent=
  '.exp45tag{display:inline-flex;align-items:center;gap:4px;margin-top:3px;font-size:12px;border-radius:10px;padding:1px 6px;border:1px solid var(--chipbr);background:var(--inputbg);color:var(--muted)}'+
  '.exp45tag input{border:0;background:transparent;color:inherit;font:inherit;font-size:12px;padding:0;max-width:118px}'+
  '.exp45tag.s,.exp45row.s small{color:#9a5b00}.exp45tag.s{border-color:#e0a63a;background:#fff4dc}.exp45tag.x,.exp45row.x small{color:#a3241b}.exp45tag.x{border-color:#d9534f;background:#fde2e1}'+
  'body.dark .exp45tag.s{background:#3d2f12;color:#f5c66b}body.dark .exp45tag.x{background:#3d1714;color:#f19a93}body.dark .exp45row.s small{color:#f5c66b}body.dark .exp45row.x small{color:#f19a93}'+
  '.exp45in{max-width:140px;padding:6px 8px;border:1px solid var(--chipbr);border-radius:10px;background:var(--inputbg);color:var(--text);font:inherit;font-size:13px}'+
  '.kash45bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:6px 4px 8px;font-size:14px}.kash45bar .check{margin:0}'+
  '.lnk45{background:none;border:0;color:var(--hdr2);font:inherit;font-size:14px;text-decoration:underline;cursor:pointer;padding:4px}'+
  '.kash45b{display:inline-block;font-size:11px;border-radius:8px;padding:0 5px;margin-inline-start:4px;background:var(--chipbg);color:var(--muted);vertical-align:middle}.kash45b.yes{background:#dff3e4;color:#17643a}.kash45b.no{background:#fde2e1;color:#a3241b}'+
  'body.dark .kash45b.yes{background:#173d24;color:#9be0b1}body.dark .kash45b.no{background:#3d1714;color:#f19a93}'+
  '.kash45card{border-radius:12px;padding:9px 12px;margin:8px 0;background:var(--chipbg);border:1px solid var(--chipbr)}.kash45card.yes{background:#dff3e4;border-color:#7cc596;color:#17643a}.kash45card.no{background:#fde2e1;border-color:#d9534f;color:#7a1712}'+
  'body.dark .kash45card.yes{background:#173d24;color:#9be0b1}body.dark .kash45card.no{background:#3d1714;color:#f19a93}'+
  '#voice45{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}#voice45[hidden]{display:none}'+
  '#voice45 .vcard{background:var(--panel,#fff);color:var(--text);width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:14px 16px 22px;max-height:85vh;overflow-y:auto;box-sizing:border-box}'+
  '#voice45 .vhead{display:flex;align-items:center;gap:8px}#voice45 .vhead b{flex:1;font-size:18px}#voice45 .vhead button{background:var(--chipbg);border:0;border-radius:10px;padding:6px 10px;font:inherit;cursor:pointer;color:var(--text)}'+
  '#voice45 .vmic{display:block;margin:12px auto 6px;width:84px;height:84px;border-radius:50%;border:0;background:var(--hdr2);color:#fff;font-size:34px;cursor:pointer}'+
  '#voice45 .vmic.on{animation:v45p 1.2s ease-in-out infinite}@keyframes v45p{0%,100%{box-shadow:0 0 0 0 rgba(30,58,95,.5)}50%{box-shadow:0 0 0 16px rgba(30,58,95,0)}}'+
  '@media (prefers-reduced-motion:reduce){#voice45 .vmic.on{animation:none;outline:4px solid var(--hdr2);outline-offset:4px}}'+
  '#voice45 .vstate{text-align:center;font-size:14px;color:var(--muted);margin:0 0 8px}#voice45 .vlive{min-height:24px;text-align:center;font-size:16px;margin:6px 0 10px}'+
  '#voice45 .vchips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px}#voice45 .vchips button{border:1px solid var(--chipbr);background:var(--inputbg);color:var(--text);border-radius:16px;padding:6px 10px;font:inherit;font-size:15px;cursor:pointer}'+
  '#voice45 .vchips button.off{opacity:.45;text-decoration:line-through}#voice45 .vbtns{display:flex;gap:8px}#voice45 .vbtns button{flex:1;padding:12px;border-radius:12px;border:0;background:var(--hdr2);color:#fff;font:inherit;font-weight:700;cursor:pointer}#voice45 .vbtns button.sec{background:var(--chipbg);color:var(--text)}'+
  '#voice45 .vbtns button:disabled{opacity:.5;cursor:default}'+
  '.shb45head{border-radius:14px;padding:12px 14px;margin:4px 0 10px;background:linear-gradient(135deg,#243b6b,#3c5aa6);color:#fff}.shb45head b{font-size:18px}.shb45head small{display:block;opacity:.9;margin-top:3px}'+
  '.shb45bar{height:8px;border-radius:6px;background:rgba(255,255,255,.25);margin-top:8px;overflow:hidden}.shb45bar i{display:block;height:100%;background:#f3c623}'+
  '.shb45row{display:flex;align-items:center;gap:10px;padding:8px 2px;border-bottom:1px solid var(--line)}.shb45row:last-child{border-bottom:0}.shb45row .grow{flex:1}.shb45row small{display:block;color:var(--muted);font-size:12px}'+
  '.shb45ck{width:32px;height:32px;flex:none;border-radius:50%;border:2px solid var(--hdr2);background:transparent;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'+
  '.shb45ck{background:transparent!important;color:#fff!important;min-width:0!important}.shb45row.done .shb45ck{background:var(--hdr2)!important}.shb45row.done b{text-decoration:line-through;opacity:.7}'+
  '.shb45ed{display:flex;gap:6px;margin:4px 0}.shb45ed input{flex:1}'+
  '.shb45chip{border-color:#3c5aa6!important}'+
  '.k45grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px}.k45grid label{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:14px;line-height:1.3;cursor:pointer}.k45grid input{width:20px!important;height:20px!important;min-width:20px;flex:none;margin:0}'+
  '.kash45bar input[type=checkbox],#k45only{width:20px!important;height:20px!important;min-width:20px;flex:none}';
  document.head.appendChild(st);})();
NCATS.exp=['📅','תזכורות תוקף למוצרים בבית','Expiry reminders for home products'];
NCATS.shb=['🕯️','מצב ערב שבת — מה לבדוק ומה נשאר לקנות','Erev Shabbat checklist'];

/* ---------- 📅 מעקב תוקף: לכל מוצר במלאי הבית אפשר לרשום עד מתי הוא טוב (נשמר במלאי, ולכן עובר לכל בני הבית) ---------- */
const EXP45=/^\d{4}-\d{2}-\d{2}$/;
function expOf45(n){const s=(state.stock||{})[pkey(n)];return s&&typeof s.exp==='string'&&EXP45.test(s.exp)?s.exp:'';}
function daysTo45(exp){const d=new Date(exp+'T00:00:00'),t=new Date();t.setHours(0,0,0,0);return Math.round((d-t)/DAY_MS);}
function expWarn45(){const v=Number(meData().expDays);return [1,2,3,5,7,14].includes(v)?v:3;}
function expTxt45(exp){const d=daysTo45(exp);
  if(d<-1)return T('פג לפני '+(-d)+' ימים','Expired '+(-d)+' days ago');if(d===-1)return T('פג אתמול','Expired yesterday');
  if(d===0)return T('פג היום','Expires today');if(d===1)return T('פג מחר','Expires tomorrow');
  return T('בתוקף עוד '+d+' ימים','Good for '+d+' more days');}
function expCls45(exp){const d=daysTo45(exp);return d<0?'x':d<=expWarn45()?'s':'ok';}
function fmtExp45(exp){const [y,m,d]=exp.split('-');return (+d)+'.'+(+m)+(String(new Date().getFullYear())===y?'':'.'+y.slice(2));}
function expSet45(n,exp){if(exp&&!EXP45.test(exp))return;const k=pkey(n);state.stock=state.stock||{};
  if(!state.stock[k]){if(!exp)return;stockSet(k,1);}
  const o=Object.assign({},state.stock[k]);if(exp)o.exp=exp;else delete o.exp;o.ts=Date.now();state.stock[k]=o;save();}
function expItems45(){return Object.keys(state.stock||{}).map(k=>({k,exp:expOf45(k),q:stockQty(k)})).filter(x=>x.exp).sort((a,b)=>a.exp<b.exp?-1:a.exp>b.exp?1:a.k.localeCompare(b.k,'he'));}
function expSoon45(){const w=expWarn45();return expItems45().filter(x=>daysTo45(x.exp)<=w);}
function openExpiry45(){
  const all=expItems45(),w=expWarn45();
  const gone=all.filter(x=>daysTo45(x.exp)<0),soon=all.filter(x=>{const d=daysTo45(x.exp);return d>=0&&d<=w;}),later=all.filter(x=>daysTo45(x.exp)>w);
  const noExp=Object.keys(state.pantry||{}).filter(k=>!expOf45(k)).sort((a,b)=>a.localeCompare(b,'he'));
  const row=x=>'<div class="merow exp45row '+expCls45(x.exp)+'"><span>'+emojiOf(x.k)+'</span><span class="grow"><b>'+esc(x.k)+'</b><small data-exp45txt="'+esc(x.k)+'">'+esc(expTxt45(x.exp))+' · '+esc(fmtExp45(x.exp))+(x.q&&x.q!==1?' · '+T('כמות ','Qty ')+x.q:'')+'</small></span>'+
    '<input type="date" class="exp45in" data-exp45="'+esc(x.k)+'" value="'+esc(x.exp)+'" aria-label="'+esc(T('תאריך התפוגה של ','Expiry date of ')+x.k)+'">'+
    '<button class="mini pri" data-exp45list="'+esc(x.k)+'" title="'+T('להוסיף לרשימת הקניות','Add to the shopping list')+'" aria-label="'+esc(T('להוסיף לרשימה: ','Add to list: ')+x.k)+'">🛒</button>'+
    '<button class="mini" data-exp45used="'+esc(x.k)+'" title="'+T('נגמר או נזרק — להוריד מהבית','Used up or thrown away')+'" aria-label="'+esc(T('נגמר: ','Used up: ')+x.k)+'">🗑️</button>'+
    '<button class="mini" data-exp45clr="'+esc(x.k)+'" aria-label="'+esc(T('למחוק את התאריך של ','Clear the date of ')+x.k)+'">✕</button></div>';
  const sec=(t,arr)=>arr.length?'<div class="mecard"><h4>'+t+' ('+arr.length+')</h4>'+arr.map(row).join('')+'</div>':'';
  const names=Array.from(new Set(Object.keys(state.pantry||{}).concat(Object.keys(P).slice(0,2000))));
  const b=openSheet('📅 '+T('מעקב תוקף','Expiry tracker'),
    '<p class="muted-note">'+T('רושמים עד מתי מוצר בבית טוב, ומקבלים תזכורת בפעמון לפני שהוא פג. מי שמחובר לאותה רשימה רואה את אותם תאריכים.','Write down when products expire and get a reminder before. Everyone on the same list sees the same dates.')+'</p>'+
    '<div class="mecard"><h4>➕ '+T('הוספת תאריך תפוגה','Add an expiry date')+'</h4><div class="row2"><input id="exp45n" list="exp45names" maxlength="60" placeholder="'+T('מוצר (למשל: יוגורט)','Product (e.g. yogurt)')+'" aria-label="'+T('מוצר','Product')+'"><input type="date" id="exp45d" class="exp45in" aria-label="'+T('תאריך תפוגה','Expiry date')+'"></div>'+
      '<datalist id="exp45names">'+names.map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist><button id="exp45add" style="width:100%;margin-top:6px">💾 '+T('שמירה','Save')+'</button></div>'+
    (all.length?sec('⛔ '+T('פג תוקף','Expired'),gone)+sec('⚠️ '+T('פג בקרוב','Expiring soon'),soon)+sec('✅ '+T('בתוקף','Still good'),later):'<div class="empty">'+T('עוד לא נרשמו תאריכי תפוגה 🙂','No expiry dates yet 🙂')+'</div>')+
    (noExp.length?'<details class="mecard"><summary>🏠 '+T('מוצרים בבית בלי תאריך','Home products without a date')+' ('+noExp.length+')</summary>'+noExp.slice(0,300).map(k=>'<div class="merow"><span>'+emojiOf(k)+'</span><span class="grow">'+esc(k)+'</span><input type="date" class="exp45in" data-exp45="'+esc(k)+'" aria-label="'+esc(T('תאריך התפוגה של ','Expiry date of ')+k)+'"></div>').join('')+'</details>':'')+
    '<div class="mecard"><h4>🔔 '+T('מתי להזכיר','When to remind')+'</h4><label class="il" for="exp45w">'+T('כמה ימים לפני שמוצר פג','How many days before')+'</label><select id="exp45w">'+[1,2,3,5,7,14].map(n=>'<option value="'+n+'"'+(n===w?' selected':'')+'>'+n+' '+T(n===1?'יום':'ימים',n===1?'day':'days')+'</option>').join('')+'</select>'+
      '<p class="muted-note">'+T('התזכורת מגיעה לפעמון 🔔 ולהתראות בטלפון ובמחשב כשהן פעילות.','Reminders go to the bell and to phone/desktop notifications when enabled.')+'</p></div>');
  b.onclick=async e=>{const el=e.target.closest('button');if(!el)return;const d=el.dataset;
    if(el.id==='exp45add'){const raw=$45('#exp45n').value.trim(),dt=$45('#exp45d').value;if(!raw){flash(T('איזה מוצר?','Which product?'));return;}if(!EXP45.test(dt)){flash(T('בחרו תאריך 📅','Pick a date 📅'));return;}if(hasProfanity(raw)){flash('🙏');return;}
      const name=NORMP[norm(raw)]||fuzzyResolve(raw)||raw;if(!P[name]){P[name]={e:emojiOf(name),c:resolveCat(name)};NORMP[norm(name)]=name;}
      expSet45(name,dt);flash('📅 '+T(name+' — '+expTxt45(dt),name+': '+expTxt45(dt)));openExpiry45();return;}
    if(d.exp45list){addItem(d.exp45list,'');return;}
    if(d.exp45used){if(!(await uiConfirm(T('להוריד את '+d.exp45used+' ממה שיש בבית?','Remove '+d.exp45used+' from home stock?'))))return;stockSet(d.exp45used,0);save();openExpiry45();return;}
    if(d.exp45clr){expSet45(d.exp45clr,'');openExpiry45();return;}};
}
/* שינוי תאריך — בחלון מעקב התוקף ובמלאי הבית. לא מציירים מחדש (כדי לא לקטוע הקלדה), רק מעדכנים את השורה */
document.addEventListener('change',e=>{const t=e.target;
  if(t.matches&&t.matches('[data-exp45]')){const k=t.dataset.exp45,v=t.value;if(v&&!EXP45.test(v))return;expSet45(k,v);
    const row=t.closest('.merow');if(row){const tag=t.closest('.exp45tag');if(tag){tag.className='exp45tag '+(v?expCls45(v):'');const sp=tag.querySelector('span');if(sp)sp.textContent=v?expTxt45(v):T('תוקף','Expiry');}
      const sm=row.querySelector('[data-exp45txt]');if(sm&&v)sm.textContent=expTxt45(v)+' · '+fmtExp45(v);if(row.classList.contains('exp45row')&&v)row.className='merow exp45row '+expCls45(v);}
    flash(v?'📅 '+k+' — '+expTxt45(v):'📅 '+T('התאריך נמחק','Date cleared'));return;}
  if(t.id==='exp45w'){meData().expDays=+t.value;meSave();openExpiry45();}});
/* במלאי הבית (📦): תאריך תפוגה ליד כל מוצר, ותאריך גם כשמוסיפים מוצר חדש */
const _v45Inv=openInventory;
openInventory=function(){const r=_v45Inv.apply(this,arguments);try{decorInv45();}catch(e){}return r;};
function decorInv45(){const b=$45('#v8SheetBody');if(!b||!b.querySelector('#invAddCard'))return;
  const q=b.querySelector('#invQty');if(q&&!b.querySelector('#invExp45'))q.closest('.row2').insertAdjacentHTML('afterend','<div class="row2"><label class="il" for="invExp45" style="align-self:center;margin:0">📅 '+T('תוקף (לא חובה)','Expiry (optional)')+'</label><input type="date" id="invExp45" class="exp45in"></div>');
  b.querySelectorAll('[data-sqe]').forEach(btn=>{const k=btn.dataset.sqe,row=btn.closest('.merow'),g=row&&row.querySelector('.grow');if(!g||g.querySelector('.exp45tag'))return;const e=expOf45(k);
    g.insertAdjacentHTML('beforeend','<label class="exp45tag '+(e?expCls45(e):'')+'"><input type="date" data-exp45="'+esc(k)+'" value="'+esc(e)+'" aria-label="'+esc(T('תאריך התפוגה של ','Expiry date of ')+k)+'"><span>'+esc(e?expTxt45(e):T('תוקף','Expiry'))+'</span></label>');});
  const kp=b.querySelector('.kpis');if(kp&&!b.querySelector('#exp45open')){const n=expSoon45().length;kp.insertAdjacentHTML('afterend','<button class="btn sec" id="exp45open" style="width:100%;margin:6px 0">📅 '+T('מעקב תוקף','Expiry tracker')+(n?' — '+T(n+' פגים בקרוב',n+' expiring soon'):'')+'</button>');}}
document.addEventListener('click',e=>{
  if(e.target.closest('#exp45open')){openExpiry45();return;}
  /* הוספה למלאי עם תאריך: שומרים את התאריך מיד אחרי שהמוצר נוסף */
  if(e.target.closest('#invAdd')){const d=$45('#invExp45'),n=$45('#invName');const dt=d&&d.value,raw=n&&n.value.trim();
    if(dt&&EXP45.test(dt)&&raw&&!hasProfanity(raw)){const name=NORMP[norm(raw)]||fuzzyResolve(raw)||raw;setTimeout(()=>{if(stockQty(name)>0){expSet45(name,dt);if($45('#invAddCard'))openInventory(true);}},0);}}},true);
/* תזכורת: פעם ביום, מה שפג או עומד לפוג */
function expCheck45(){try{if(!state.user)return;const due=expSoon45().filter(x=>daysTo45(x.exp)>=-3);if(!due.length)return;
  const names=due.slice(0,6).map(x=>x.k+' ('+expTxt45(x.exp)+')').join(' · ')+(due.length>6?' …':'');
  notify('exp45:'+dayKey(new Date()),'exp',due.length===1?T(due[0].k+' — '+expTxt45(due[0].exp),due[0].k+': '+expTxt45(due[0].exp)):T(due.length+' מוצרים בבית פגים בקרוב',due.length+' home products expire soon'),names,'');}catch(e){}}

/* ---------- 🥇 הכשרים: המנהל קובע לכל מוצר את ההכשר שלו, וכל משפחה בוחרת את ההכשרים שהיא מקפידה עליהם ---------- */
/* רשימת ברירת המחדל — המנהל עורך אותה בבק אופיס ← 🥇 הכשרים (מוסיף, משנה שם ומוחק) */
const KASH45_DEF=['בד"ץ העדה החרדית','בד"ץ בית יוסף','הרב לנדא','הרב רובין','בד"ץ שארית ישראל','בד"ץ מחזיקי הדת (בעלז)','בד"ץ חתם סופר','בד"ץ אגודת ישראל','יורה דעה (הרב מחפוד)','שבט הלוי (הרב וואזנר)','בד"ץ ויז\'ניץ','בד"ץ צאנז','רבנות מהדרין','רבנות (כשר)','OU','OK','Kof-K','Star-K'];
let kashCfg45={list:[],prod:{}};
const kashKey45=(name,brand)=>norm(name||'')+'|'+norm(brand||'').toLowerCase();
function applyKash45(v){v=v&&typeof v==='object'?v:{};const prod={};
  if(v.prod&&typeof v.prod==='object'&&!Array.isArray(v.prod))Object.keys(v.prod).forEach(k=>{if(/^(__proto__|constructor|prototype)$/.test(k)||k.length>200)return;const x=v.prod[k];const a=(Array.isArray(x)?x:[x]).filter(s=>typeof s==='string'&&s).map(s=>s.slice(0,40)).slice(0,6);if(a.length)prod[k]=a;});
  kashCfg45={list:Array.isArray(v.list)?v.list.filter(x=>typeof x==='string'&&x).map(x=>x.slice(0,40)).slice(0,80):[],prod};}
function kashList45(){return kashCfg45.list.length?kashCfg45.list:KASH45_DEF;}
function kashOf45(name,brand){return kashCfg45.prod[kashKey45(name,brand)]||[];}
function myKash45(){const a=meData().kosher;return Array.isArray(a)?a.filter(x=>typeof x==='string'&&x):[];}
/* true = בהכשר שבחרנו · false = בהכשר אחר · null = לא ידוע / לא בחרו */
function kashOk45(arr){const mine=myKash45();if(!mine.length||!arr.length)return null;return arr.some(h=>mine.some(m=>norm(m)===norm(h)));}
const _v45Cfg=applyConfig;applyConfig=function(key,v){const r=_v45Cfg.apply(this,arguments);if(key==='kashrut')applyKash45(v);if(key==='shabbatPrep')shbCfg45=v&&typeof v==='object'?v:{};return r;};
function catRefresh45(){const o=$45('#catOverlay.open');if(o&&typeof renderCats==='function'){const s=$45('#inCatSearch');renderCats(s?s.value:'');}}
if(sb)sb.from('site_config').select('key,value').in('key',['kashrut','shabbatPrep']).then(({data})=>{(data||[]).forEach(r=>{if(r.key==='kashrut')applyKash45(r.value);if(r.key==='shabbatPrep')shbCfg45=r.value&&typeof r.value==='object'?r.value:{};});catRefresh45();},()=>{});
function openKash45(){const mine=new Set(myKash45());const list=kashList45();const extra=[...mine].filter(m=>!list.some(x=>norm(x)===norm(m)));
  const box=(h,on)=>'<label><input type="checkbox" data-k45="'+esc(h)+'"'+(on?' checked':'')+'> '+esc(h)+'</label>';
  const b=openSheet('🥇 '+T('ההכשרים שלנו','Our hechsherim'),
    '<p class="muted-note">'+T('מסמנים על אילו הכשרים המשפחה מקפידה. במאגר המוצרים (➕) יופיע ההכשר ליד כל חברה, ואפשר להציג רק מוצרים בהכשרים האלה. גם בסריקת ברקוד נראה אם המוצר בהכשר שלכם.','Mark the hechsherim your family keeps. The product catalog shows each brand\'s hechsher and can show only yours.')+'</p>'+
    '<div class="v26card k45grid" role="group" aria-label="'+T('הכשרים','Hechsherim')+'">'+list.map(h=>box(h,[...mine].some(m=>norm(m)===norm(h)))).join('')+extra.map(h=>box(h,true)).join('')+'</div>'+
    '<div class="row2"><input id="k45new" maxlength="40" placeholder="'+T('הכשר אחר שלא ברשימה','Another hechsher')+'" aria-label="'+T('הכשר אחר','Another hechsher')+'"><button class="btn sec" id="k45add">➕ '+T('הוספה','Add')+'</button></div>'+
    '<label class="check" style="display:flex;margin:10px 0"><input type="checkbox" id="k45only"'+(meData().kosherOnly?' checked':'')+'> '+T('במאגר המוצרים — להציג רק מוצרים בהכשרים שסימנתי','In the catalog, show only products with these hechsherim')+'</label>'+
    '<div class="row2"><button id="k45save">💾 '+T('שמירה','Save')+'</button><button class="btn sec" id="k45scan">📷 '+T('לסרוק מוצר ולבדוק','Scan a product')+'</button></div>'+
    '<p class="muted-note">ℹ️ '+T('ההכשר מוצג לפי מה שהוזן במאגר האתר, ולא לכל מוצר יש מידע. תמיד לבדוק גם על האריזה.','Hechsher info comes from the site catalog and may be missing. Always check the package too.')+'</p>');
  b.onclick=e=>{const el=e.target.closest('button');if(!el)return;
    if(el.id==='k45add'){const v=$45('#k45new').value.trim().slice(0,40);if(!v)return;if(hasProfanity(v)){flash('🙏');return;}const g=b.querySelector('.v26card');if(![...g.querySelectorAll('[data-k45]')].some(x=>norm(x.dataset.k45)===norm(v)))g.insertAdjacentHTML('beforeend',box(v,true));$45('#k45new').value='';return;}
    if(el.id==='k45save'){meData().kosher=[...b.querySelectorAll('[data-k45]:checked')].map(x=>x.dataset.k45).slice(0,30);meData().kosherOnly=$45('#k45only').checked;meSave();flash('🥇 '+T('נשמר','Saved'));closeSheet();catRefresh45();return;}
    if(el.id==='k45scan'){closeSheet();openBarcodeScanner(code=>lookupBarcode(code));}};}
/* במאגר המוצרים: ההכשר ליד כל חברה, ואפשרות להציג רק את ההכשרים שלנו */
const _v45Cats=renderCats;
renderCats=function(q){const r=_v45Cats.apply(this,arguments);try{kashCats45();}catch(e){}return r;};
function kashCats45(){const list=$45('#catList');if(!list)return;
  let bar=$45('#kash45bar');if(!bar){bar=document.createElement('div');bar.id='kash45bar';bar.className='kash45bar';list.parentNode.insertBefore(bar,list);}
  const mine=myKash45(),on=!!meData().kosherOnly&&mine.length>0;
  bar.innerHTML=mine.length?'<label class="check"><input type="checkbox" id="kash45only"'+(on?' checked':'')+'> 🥇 '+T('רק בהכשרים שלנו','Only our hechsherim')+'</label><button class="lnk45" id="kash45edit">'+T('אילו הכשרים?','Which?')+'</button>':'<button class="lnk45" id="kash45edit">🥇 '+T('לבחור הכשרים ולסנן לפיהם','Pick hechsherim and filter')+'</button>';
  list.querySelectorAll('.brandrow').forEach(row=>{const head=row.previousElementSibling,n=head&&head.dataset.brands;if(!n)return;let hid=0;
    row.querySelectorAll('button.br[data-add]').forEach(btn=>{if(btn.querySelector('.kash45b'))return;const brand=btn.dataset.add.slice(n.length).trim();const k=kashOf45(n,brand);if(!k.length)return;const ok=kashOk45(k);
      btn.title=T('הכשר: ','Hechsher: ')+k.join(', ');btn.insertAdjacentHTML('beforeend','<span class="kash45b'+(ok===false?' no':ok?' yes':'')+'">'+esc(k[0])+(k.length>1?' +'+(k.length-1):'')+'</span>');
      if(on&&ok===false){btn.hidden=true;hid++;}});
    if(hid)row.insertAdjacentHTML('beforeend','<small class="muted-note" style="margin:0 4px">'+T('הוסתרו '+hid+' בהכשר אחר','Hid '+hid+' with another hechsher')+'</small>');});}
document.addEventListener('click',e=>{if(e.target.closest('#kash45edit'))openKash45();});
document.addEventListener('change',e=>{if(e.target.id==='kash45only'){meData().kosherOnly=e.target.checked;meSave();catRefresh45();}});
/* בסריקת ברקוד: מה ההכשר של המוצר, והאם הוא מההכשרים שלנו */
const _v45Lookup=lookupBarcode;
lookupBarcode=async function(code){const r=await _v45Lookup.apply(this,arguments);try{if(!sb)return r;const {data:p}=await sb.from('products').select('name,brand').eq('barcode',code).maybeSingle();
  const b=$45('#v8SheetBody');if(!p||!b||b.querySelector('.kash45card')||!$45('#v8Sheet.open'))return r;const k=kashOf45(p.name,p.brand);if(!k.length)return r;const ok=kashOk45(k);
  const h='<div class="kash45card'+(ok===false?' no':ok?' yes':'')+'">🥇 '+T('הכשר: ','Hechsher: ')+'<b>'+esc(k.join(', '))+'</b>'+(ok?' ✓':ok===false?'<br>⚠️ '+T('לא מההכשרים שסימנתם','Not one of your hechsherim'):'')+'</div>';
  const at=b.querySelector('.row2');at?at.insertAdjacentHTML('beforebegin',h):b.insertAdjacentHTML('beforeend',h);}catch(e){}return r;};

/* ---------- 🎤 רשימה קולית מהירה: אומרים "חלב, לחם, ביצים" — והכל נכנס בבת אחת ---------- */
const SR45=window.SpeechRecognition||window.webkitSpeechRecognition;
/* מפרקים משפט מדובר לפריטים: קודם לפי פסיקים ו"ו", ואחר כך לפי שמות מוצרים שמכירים (גם בלי הפסקות) */
function voiceItems45(text){const t=norm(String(text||'')).replace(/[.?!;:]+/g,' ').replace(/\s+/g,' ').trim();if(!t)return [];
  const out=[];
  parseItems(t).forEach(p=>{const w=norm(p.name).split(' ').filter(Boolean);
    if(P[p.name]||w.length<2){out.push(p);return;}
    const seg=segment45(w,p.qty);if(seg.filter(x=>P[x.name]).length>=2)seg.forEach(x=>out.push(x));else out.push(p);});
  const seen={};return out.filter(x=>{if(!x.name)return false;const k=norm(x.name);if(seen[k]){if(x.qty&&!seen[k].qty)seen[k].qty=x.qty;return false;}seen[k]=x;return true;});}
function segment45(w,tailQty){const U=new RegExp('^('+UNITS+')$'),isNum=s=>/^\d+(\.\d+)?$/.test(s)||!!NUMW[s];
  const numFirst=isNum(w[0]);const out=[];let unk=[],pend='';
  const flush=()=>{if(unk.length){out.push({name:unk.join(' '),qty:pend});pend='';unk=[];}};
  for(let i=0;i<w.length;){const tok=w[i];
    if(isNum(tok)){flush();let n=/^\d/.test(tok)?tok:String(NUMW[tok]);if(w[i+1]&&U.test(w[i+1])){n+=' '+w[i+1];i++;}i++;
      const last=out[out.length-1],atEnd=i>=w.length;if(!numFirst&&last&&!last.qty&&(atEnd||!/\s/.test(n)))last.qty=n;else pend=n;continue;}
    let hit=null;for(let L=Math.min(4,w.length-i);L>=1;L--){const nm=NORMP[norm(w.slice(i,i+L).join(' '))];if(nm){hit={nm,L};break;}}
    if(hit){flush();out.push({name:hit.nm,qty:pend});pend='';i+=hit.L;continue;}
    unk.push(tok);i++;}
  flush();const last=out[out.length-1];if(tailQty&&last&&!last.qty)last.qty=tailQty;return out;}
let v45={rec:null,on:false,fin:'',interim:'',off:new Set(),quiet:0,heard:false};
function voiceBox45(){let o=$45('#voice45');if(o)return o;o=document.createElement('div');o.id='voice45';o.hidden=true;o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-labelledby','voice45t');
  o.innerHTML='<div class="vcard"><div class="vhead"><b id="voice45t">🎤 '+T('רשימה קולית מהירה','Quick voice list')+'</b><button type="button" data-v45="x" aria-label="'+T('סגירה','Close')+'">✕</button></div>'+
    '<p class="muted-note">'+T('אומרים כמה מוצרים ברצף, למשל: "חלב, לחם, ביצים, 2 קילו עגבניות". לחיצה על מוצר מבטלת אותו.','Say several products in a row, e.g. "milk, bread, eggs". Tap a product to drop it.')+'</p>'+
    '<button type="button" class="vmic" data-v45="mic" aria-label="'+T('התחלה או עצירה של ההקלטה','Start or stop recording')+'">🎤</button><p class="vstate" aria-live="polite"></p><div class="vlive"></div><div class="vchips" role="group" aria-label="'+T('המוצרים ששמעתי','Products heard')+'"></div>'+
    '<div class="vbtns"><button type="button" data-v45="add" disabled>✅ '+T('להוסיף לרשימה','Add to list')+'</button><button type="button" class="sec" data-v45="clr">↺ '+T('מההתחלה','Start over')+'</button></div></div>';
  document.body.appendChild(o);
  o.addEventListener('click',e=>{if(e.target===o){voiceClose45();return;}const b=e.target.closest('[data-v45],[data-v45i]');if(!b)return;
    if(b.dataset.v45i!==undefined){const k=b.dataset.v45i;v45.off.has(k)?v45.off.delete(k):v45.off.add(k);voiceDraw45();return;}
    const a=b.dataset.v45;if(a==='x')voiceClose45();else if(a==='mic'){v45.on?voiceStop45():voiceStart45();}else if(a==='clr'){v45.fin='';v45.interim='';v45.off.clear();voiceDraw45();if(!v45.on)voiceStart45();}else if(a==='add')voiceAdd45();});
  o.addEventListener('keydown',e=>{if(e.key==='Escape')voiceClose45();});
  return o;}
function voiceDraw45(){const o=voiceBox45();const txt=(v45.fin+' '+v45.interim).trim();const its=voiceItems45(txt);
  o.querySelector('.vmic').classList.toggle('on',v45.on);o.querySelector('.vstate').textContent=v45.on?T('מקשיבה... מדברים עכשיו','Listening... speak now'):(txt?T('ההקלטה נעצרה — אפשר להמשיך בלחיצה על המיקרופון','Stopped — tap the mic to continue'):T('לוחצים על המיקרופון ומדברים','Tap the mic and speak'));
  o.querySelector('.vlive').textContent=txt?'"'+txt+'"':'';
  o.querySelector('.vchips').innerHTML=its.map(i=>{const k=norm(i.name);return '<button type="button" data-v45i="'+esc(k)+'" class="'+(v45.off.has(k)?'off':'')+'" aria-pressed="'+(!v45.off.has(k))+'">'+emojiOf(i.name)+' '+esc(i.name)+(i.qty?' ×'+esc(i.qty):'')+'</button>';}).join('');
  const n=its.filter(i=>!v45.off.has(norm(i.name))).length;const add=o.querySelector('[data-v45="add"]');add.disabled=!n&&!txt;
  add.textContent='✅ '+(n>1?T('להוסיף '+n+' מוצרים','Add '+n+' products'):T('להוסיף לרשימה','Add to list'));}
function voiceStart45(){if(!SR45)return;try{if(v45.rec){v45.rec.onend=null;v45.rec.abort();}}catch(e){}
  const rec=new SR45();rec.lang=prefs.lang==='en'?'en-US':'he-IL';rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=1;v45.rec=rec;v45.on=true;v45.heard=false;
  rec.onresult=ev=>{let fin='',inter='';for(let i=ev.resultIndex;i<ev.results.length;i++){const r=ev.results[i];if(r.isFinal)fin+=' '+r[0].transcript;else inter+=' '+r[0].transcript;}
    if(fin.trim()){v45.fin=(v45.fin+' '+fin.trim()).trim();v45.heard=true;}v45.interim=inter.trim();voiceDraw45();};
  rec.onerror=ev=>{if(ev&&(ev.error==='not-allowed'||ev.error==='service-not-allowed')){v45.on=false;flash(T('צריך לאשר גישה למיקרופון 🎤','Please allow microphone access 🎤'));}};
  /* בטלפונים ההקלטה נעצרת אחרי כל משפט — ממשיכים להקשיב עד שלוחצים עצירה, או אחרי שתי הפסקות בלי דיבור */
  rec.onend=()=>{v45.interim='';if(v45.on&&!$45('#voice45').hidden){v45.quiet=v45.heard?0:v45.quiet+1;if(v45.quiet<2){try{rec.start();v45.heard=false;return;}catch(e){}}}v45.on=false;v45.quiet=0;voiceDraw45();};
  try{rec.start();}catch(e){v45.on=false;flash(T('לא הצלחתי להקליט 😕','Could not record 😕'));}voiceDraw45();}
function voiceStop45(){v45.on=false;try{v45.rec&&v45.rec.stop();}catch(e){}voiceDraw45();}
function voiceClose45(){v45.on=false;try{if(v45.rec){v45.rec.onend=null;v45.rec.abort();}}catch(e){}v45.rec=null;const o=$45('#voice45');if(o)o.hidden=true;const m=$45('#btnMic');if(m){m.classList.remove('rec');try{m.focus();}catch(e){}}}
function openVoice45(){if(!SR45){flash(T('הדפדפן הזה לא תומך בהקלטה 😕 — נסו בכרום או בספארי','This browser cannot record 😕'));return;}
  const o=voiceBox45();v45.fin='';v45.interim='';v45.off.clear();v45.quiet=0;o.hidden=false;const m=$45('#btnMic');if(m)m.classList.add('rec');voiceStart45();setTimeout(()=>{const x=o.querySelector('.vmic');if(x)x.focus();},50);}
function voiceAdd45(){const txt=(v45.fin+' '+v45.interim).trim();const its=voiceItems45(txt).filter(i=>!v45.off.has(norm(i.name)));voiceClose45();if(!txt)return;
  /* משפט אחד (פקודה כמו "סיימתי קנייה" או מוצר אחד) — עובר כמו הקלדה רגילה */
  if(its.length<2){const el=$45('#inText');if(el){el.value=its.length===1&&!v45.off.size?txt:(its[0]?its[0].name+(its[0].qty?' '+its[0].qty:''):'');if(el.value)sendCurrent();}return;}
  if(its.some(i=>hasProfanity(i.name))){flash('🙏');return;}
  setTab('list');const l=curList();let added=0;
  its.forEach(i=>{const ex=l.items.find(x=>x.n===i.name&&!x.done);if(ex){const m=mergeQty(ex.q,i.qty);if(m!==ex.q){ex.q=m;ex.ts=Date.now();}return;}
    l.items.push({id:uid(),n:i.name,q:i.qty||'',c:resolveCat(i.name),e:emojiOf(i.name),done:false,ts:Date.now()});state.stats[i.name]=(state.stats[i.name]||0)+1;added++;});
  save();render();flash('🎤 '+T('נוספו '+added+' מוצרים: ','Added '+added+': ')+its.map(i=>i.name).join(', '));}
/* אפליקציה ישנה (עד 1.6) לא יודעת להקליט — מציעים לעדכן במקום הודעה שלא עוזרת */
(function(){const m=$45('#btnMic');if(!m||!/YamShoppingApp\//.test(navigator.userAgent||'')||(window.YamApp&&typeof YamApp.speechStart==='function'))return;
  m.style.opacity='';m.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();flash(T('🎤 כדי להקליט באפליקציה צריך לעדכן אותה לגרסה החדשה','🎤 Please update the app to use voice input'));if(window.openNatUpd66)setTimeout(openNatUpd66,600);},true);})();
(function(){const m=$45('#btnMic');if(m&&SR45){m.onclick=e=>{e.preventDefault();openVoice45();};m.title=T('רשימה קולית — אומרים כמה מוצרים ברצף','Voice list — say several products');}})();

/* ---------- 🕯️ מצב ערב שבת: רשימת בדיקה (נרות, יין, חלות...) + מה נשאר לקנות + תזכורת ---------- */
const SHB45_DEF=['נרות שבת','יין לקידוש','חלות','נרות הבדלה','בשמים','נייר חתוך לשבת','מגבונים','כלים חד פעמיים'];
let shbCfg45={};
function shbMe45(){const m=meData();if(!m.shb||typeof m.shb!=='object')m.shb={};return m.shb;}
function shbItems45(){const m=shbMe45();const a=Array.isArray(m.items)?m.items:(Array.isArray(shbCfg45.items)&&shbCfg45.items.length?shbCfg45.items:SHB45_DEF);return a.filter(x=>typeof x==='string'&&x).map(x=>x.slice(0,60)).slice(0,40);}
function shbOn45(){return shbCfg45.on!==false&&shbMe45().off!==true;}
function candleAt45(){try{const sh=shabbatTimes(userCity());if(!sh||!sh.candlesDate)return null;const m=String(sh.candles||'').match(/(\d{1,2}):(\d{2})/);if(!m)return null;const d=new Date(sh.candlesDate);d.setHours(+m[1],+m[2],0,0);return d;}catch(e){return null;}}
/* מתי במצב ערב שבת: חמישי ושישי (עד הדלקת נרות), וערב חג */
function erevChag45(d){if(typeof HC==='undefined'||!HC)return '';try{const t=new Date(d);t.setDate(t.getDate()+1);
  const isChag=x=>holidaysOn(x).filter(e=>e.getFlags()&HC.flags.CHAG);const tm=isChag(t);if(!tm.length||isChag(d).length)return '';return heName(tm[0]);}catch(e){return '';}}
function shbDay45(){const d=new Date(),chag=erevChag45(d);if(chag)return {kind:'chag',name:chag};const dow=d.getDay();return dow===4||dow===5?{kind:'shabbat',name:T('שבת','Shabbat')}:null;}
function shbNow45(){const dt=shbDay45();if(!dt)return null;const c=candleAt45();if(c&&dayKey(c)===dayKey(new Date())&&Date.now()>c.getTime())return null;
  const d=new Date();if(dt.kind==='chag')return {kind:'chag',name:dt.name,wk:dayKey(d)};const f=new Date(d);f.setDate(d.getDate()+((5-d.getDay()+7)%7));return {kind:'shabbat',name:dt.name,wk:dayKey(f)};}
function shbWeek45(){const s=shbNow45();if(s)return s.wk;const d=new Date();d.setDate(d.getDate()+((5-d.getDay()+7)%7));return dayKey(d);}
function shbDone45(){const m=shbMe45(),wk=shbWeek45();if(!m.done||m.done.wk!==wk)m.done={wk,v:{}};return m.done.v;}
function shbLeft45(){const v=shbDone45();return shbItems45().filter(n=>!v[n]).length;}
function openShb45(edit){const items=shbItems45(),v=shbDone45(),now=shbNow45(),sh=(()=>{try{return shabbatTimes(userCity());}catch(e){return null;}})();
  const done=items.filter(n=>v[n]).length,pct=items.length?Math.round(100*done/items.length):0;
  const inList=n=>state.lists.some(l=>l.items.some(i=>i.n===n&&!i.done));
  const open=state.lists.flatMap(l=>l.items.filter(i=>!i.done).map(i=>i.n));
  const par=(()=>{try{return nextParasha();}catch(e){return '';}})();
  const title=now&&now.kind==='chag'?T('ערב '+now.name,'Erev '+now.name):(new Date().getDay()===5?T('ערב שבת קודש','Erev Shabbat'):T('הכנות לשבת','Getting ready for Shabbat'));
  let h='<div class="shb45head"><b>🕯️ '+esc(title)+'</b>'+(par?'<small>📜 '+esc(par)+'</small>':'')+(sh&&sh.candles?'<small>'+esc(sh.city+': '+sh.candles+(sh.havdalah?' · '+sh.havdalah:''))+'</small>':'')+
    '<small>'+T('בדקתם '+done+' מתוך '+items.length,'Checked '+done+' of '+items.length)+'</small><div class="shb45bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'" aria-label="'+T('התקדמות','Progress')+'"><i style="width:'+pct+'%"></i></div></div>';
  if(edit){h+='<div class="mecard"><h4>✏️ '+T('עריכת רשימת הבדיקה','Edit the checklist')+'</h4><div id="shb45eds">'+items.map(n=>'<div class="shb45ed"><input data-shb45e maxlength="60" value="'+esc(n)+'" aria-label="'+T('פריט','Item')+'"><button class="mini" data-shb45x aria-label="'+esc(T('מחיקה: ','Delete: ')+n)+'">🗑️</button></div>').join('')+'</div>'+
      '<div class="row2"><button class="btn sec" id="shb45more">➕ '+T('פריט','Item')+'</button><button class="btn sec" id="shb45def">↺ '+T('ברירת מחדל','Default')+'</button></div><div class="row2"><button id="shb45sv">💾 '+T('שמירה','Save')+'</button><button class="btn sec" id="shb45cancel">'+T('ביטול','Cancel')+'</button></div></div>';}
  else{h+='<div class="mecard"><h4>✅ '+T('לבדוק לפני שבת','Check before Shabbat')+'</h4>'+(items.length?items.map(n=>{const ok=!!v[n],st=pantryHas(n)?'🏠 '+T('יש בבית','At home'):inList(n)?'🛒 '+T('כבר ברשימת הקניות','On the shopping list'):'';
      return '<div class="shb45row'+(ok?' done':'')+'"><button class="shb45ck" data-shb45ck="'+esc(n)+'" role="checkbox" aria-checked="'+ok+'" aria-label="'+esc(n)+'">'+(ok?'✓':'')+'</button><span class="grow"><b>'+esc(n)+'</b>'+(st?'<small>'+st+'</small>':'')+'</span>'+
        (ok||inList(n)?'':'<button class="mini pri" data-shb45add="'+esc(n)+'" aria-label="'+esc(T('להוסיף לרשימה: ','Add to list: ')+n)+'">🛒 '+T('לקנות','Buy')+'</button>')+'</div>';}).join(''):'<p class="muted-note">'+T('הרשימה ריקה — לחצו "עריכה" כדי להוסיף.','Empty — tap Edit to add.')+'</p>')+
      '<div class="row2"><button class="btn sec" id="shb45edit">✏️ '+T('עריכת הרשימה','Edit list')+'</button>'+(done?'<button class="btn sec" id="shb45reset">↺ '+T('לנקות סימונים','Clear checks')+'</button>':'')+'</div></div>';
    h+='<div class="mecard"><h4>🛒 '+T('מה נשאר לקנות','Still to buy')+' ('+open.length+')</h4>'+(open.length?'<p style="margin:4px 0">'+open.slice(0,40).map(n=>esc(emojiOf(n)+' '+n)).join(' · ')+(open.length>40?' …':'')+'</p><div class="row2"><button id="shb45shop">🛍️ '+T('מצב קנייה בחנות','Shopping mode')+'</button><button class="btn sec" id="shb45list">📝 '+T('לרשימה','To the list')+'</button></div>':'<p class="muted-note">'+T('הרשימה ריקה — הכל נקנה 🎉','Nothing left to buy 🎉')+'</p>')+'</div>';
    const m=shbMe45();h+='<div class="mecard"><h4>🔔 '+T('תזכורת לפני שבת','Reminder before Shabbat')+'</h4><label class="check" style="display:flex"><input type="checkbox" id="shb45on"'+(m.off===true?'':' checked')+(shbCfg45.on===false?' disabled':'')+'> '+T('להזכיר לי לבדוק לפני שבת וחג','Remind me before Shabbat and Yom Tov')+'</label>'+
      '<label class="il" for="shb45days">'+T('באילו ימים','On which days')+'</label><select id="shb45days"><option value="both"'+(m.days!=='thu'&&m.days!=='fri'?' selected':'')+'>'+T('חמישי ושישי','Thursday and Friday')+'</option><option value="thu"'+(m.days==='thu'?' selected':'')+'>'+T('רק חמישי','Thursday only')+'</option><option value="fri"'+(m.days==='fri'?' selected':'')+'>'+T('רק שישי','Friday only')+'</option></select>'+
      (shbCfg45.on===false?'<p class="muted-note">'+T('התזכורת כבויה כרגע לכל האתר.','Reminders are off site-wide.')+'</p>':'')+'</div>';}
  const b=openSheet('🕯️ '+T('מצב ערב שבת','Erev Shabbat mode'),h);
  b.onclick=async e=>{const el=e.target.closest('button');if(!el)return;const d=el.dataset;
    if(d.shb45ck!==undefined){const vv=shbDone45();vv[d.shb45ck]?delete vv[d.shb45ck]:(vv[d.shb45ck]=true);meSave();openShb45();render();return;}
    if(d.shb45add){addItem(d.shb45add,'');openShb45();return;}
    if(el.id==='shb45edit'){openShb45(true);return;}
    if(el.id==='shb45reset'){shbMe45().done={wk:shbWeek45(),v:{}};meSave();openShb45();render();return;}
    if(el.id==='shb45shop'){closeSheet();setTab('list');if(typeof openShop26==='function')openShop26();return;}
    if(el.id==='shb45list'){closeSheet();setTab('list');return;}
    if(d.shb45x!==undefined){el.closest('.shb45ed').remove();return;}
    if(el.id==='shb45more'){$45('#shb45eds').insertAdjacentHTML('beforeend','<div class="shb45ed"><input data-shb45e maxlength="60" aria-label="'+T('פריט','Item')+'"><button class="mini" data-shb45x aria-label="'+T('מחיקה','Delete')+'">🗑️</button></div>');const ins=b.querySelectorAll('[data-shb45e]');ins[ins.length-1].focus();return;}
    if(el.id==='shb45def'){if(!(await uiConfirm(T('לחזור לרשימת ברירת המחדל?','Go back to the default list?'))))return;delete shbMe45().items;meSave();openShb45();render();return;}
    if(el.id==='shb45cancel'){openShb45();return;}
    if(el.id==='shb45sv'){const a=[...b.querySelectorAll('[data-shb45e]')].map(i=>i.value.trim().slice(0,60)).filter(Boolean);if(a.some(hasProfanity)){flash('🙏');return;}
      shbMe45().items=Array.from(new Set(a)).slice(0,40);meSave();flash('🕯️ '+T('נשמר','Saved'));openShb45();render();}};
  b.onchange=e=>{if(e.target.id==='shb45on'){shbMe45().off=!e.target.checked;meSave();render();}if(e.target.id==='shb45days'){shbMe45().days=e.target.value;meSave();}};}
/* כפתור קטן ליד שמות הרשימות — רק בחמישי, בשישי ובערב חג */
const _v45Render=render;
render=function(){const r=_v45Render.apply(this,arguments);try{const c=$45('#chips');if(c&&!c.querySelector('.shb45chip')&&shbOn45()&&shbNow45()){const n=shbLeft45();
  c.insertAdjacentHTML('afterbegin','<button class="chip shb45chip" data-shb45open="1" title="'+T('מצב ערב שבת — מה לבדוק ומה נשאר לקנות','Erev Shabbat checklist')+'">🕯️ '+T('ערב שבת','Erev Shabbat')+(n?' <span class="n17">'+n+'</span>':' ✓')+'</button>');}}catch(e){}return r;};
document.addEventListener('click',e=>{const c=e.target.closest('[data-shb45open]');if(c){e.stopPropagation();openShb45();}},true);
function shbCheck45(){try{if(!state.user||!shbOn45())return;const s=shbNow45();if(!s)return;const m=shbMe45(),dow=new Date().getDay();
  if(s.kind==='shabbat'&&((m.days==='thu'&&dow!==4)||(m.days==='fri'&&dow!==5)))return;
  const left=shbItems45().filter(n=>!shbDone45()[n]),open=state.lists.reduce((a,l)=>a+l.items.filter(i=>!i.done).length,0);
  const title=s.kind==='chag'?T('ערב '+s.name+' — מצב ערב חג','Erev '+s.name):(dow===4?T('שבת בפתח — מה עוד צריך?','Shabbat is coming — what is missing?'):T('ערב שבת קודש — לבדוק לפני שבת','Erev Shabbat — check before Shabbat'));
  const body=(left.length?T('לבדוק: ','Check: ')+left.slice(0,5).join(', ')+(left.length>5?' …':''):T('הכל נבדק ✓','All checked ✓'))+(open?' · '+T('נשארו '+open+' מוצרים ברשימה','Still '+open+' items on the list'):'');
  if(left.length||open)notify('shb45:'+dayKey(new Date()),'shb',title,body,'list');
  /* בשישי: תזכורת נוספת כשלוש שעות לפני הדלקת נרות, אם עוד נשאר משהו */
  const c=candleAt45();if(dow===5&&c&&dayKey(c)===dayKey(new Date())){const ms=c.getTime()-Date.now();if(ms>0&&ms<3*3600000&&(left.length||open))notify('shb45b:'+dayKey(new Date()),'shb',T('עוד מעט שבת 🕯️','Shabbat soon 🕯️'),T('הדלקת נרות ב-','Candle lighting at ')+String(c.getHours()).padStart(2,'0')+':'+String(c.getMinutes()).padStart(2,'0')+' · '+body,'list');}}catch(e){}}
/* לחיצה על התראה של תוקף / ערב שבת — פותחת את החלון המתאים */
document.addEventListener('click',e=>{const it=e.target.closest('[data-nid]');if(!it)return;const id=it.dataset.nid||'';
  if(/^(exp45|shb45b?):/.test(id))setTimeout(()=>{const ov=$45('#notifOverlay');if(ov)ov.classList.remove('open');id.startsWith('exp45')?openExpiry45():openShb45();},0);});

/* ---------- תפריט, יאמי ובדיקות תקופתיות ---------- */
add26('miExp45','📅','מעקב תוקף','Expiry tracker','miInv',openExpiry45);
add26('miKash45','🥇','ההכשרים שלנו','Our hechsherim','miAlg27',openKash45);
add26('miShb45','🕯️','מצב ערב שבת','Erev Shabbat mode','miZmanim',()=>openShb45());
if(SR45)add26('miVoice45','🎤','רשימה קולית מהירה','Quick voice list','miExp45',()=>{setTab('list');openVoice45();});
yamiStep(async raw=>{const t=norm(String(raw||'')).replace(/[?!.]+$/,'').trim();
  if(/^(מעקב תוקף|תוקף|תאריכי תפוגה|מה פג תוקף|מה פג לי|מה עומד לפוג|מה פג בבית)$/.test(t)){const s=expSoon45();
    botSay('📅 '+(s.length?T('פג או עומד לפוג: ','Expiring: ')+s.slice(0,8).map(x=>x.k+' ('+expTxt45(x.exp)+')').join(', '):T('אין מוצרים שעומדים לפוג 👍','Nothing is about to expire 👍'))+'\n'+T('פתחתי את "מעקב תוקף" — שם מוסיפים ומעדכנים תאריכים.','Opened the expiry tracker.'));openExpiry45();return true;}
  if(/^(ההכשרים שלנו|ההכשרים שלי|הכשרים|סינון לפי הכשר)$/.test(t)){botSay('🥇 '+T('פתחתי את "ההכשרים שלנו" — מסמנים פעם אחת, והמאגר והסריקה יראו את ההכשר של כל מוצר.','Opened "Our hechsherim".'));openKash45();return true;}
  if(/^(מצב ערב שבת|ערב שבת|הכנות לשבת|מה חסר לשבת|רשימת בדיקה לשבת)$/.test(t)){const n=shbLeft45();botSay('🕯️ '+(n?T('נשארו '+n+' דברים לבדוק לפני שבת.','Still '+n+' things to check.'):T('הכל נבדק ✓','All checked ✓'))+' '+T('פתחתי את "מצב ערב שבת".','Opened Erev Shabbat mode.'));openShb45();return true;}
  if(/^(רשימה קולית|הקלטה קולית|רשימה בקול)$/.test(t)&&SR45){botSay('🎤 '+T('פתחתי הקלטה — אומרים כמה מוצרים ברצף.','Opened voice recording.'));openVoice45();return true;}
  return false;});
const _v45After=afterEnter;afterEnter=function(){const r=_v45After.apply(this,arguments);setTimeout(()=>{expCheck45();shbCheck45();render();},7000);return r;};
setInterval(()=>{if(document.visibilityState==='visible'){expCheck45();shbCheck45();}},20*60000);
if(state.user)setTimeout(()=>{expCheck45();shbCheck45();},8000);

/* ---------- 🛠️ בבק אופיס: 🥇 הכשרים (רשימה + הכשר לכל מוצר + העלאת קובץ) · 🕯️ ערב שבת (רשימת ברירת המחדל) ---------- */
async function cfg45(key){const {data}=await sb.from('site_config').select('value').eq('key',key).maybeSingle();return (data&&data.value)||{};}
async function setCfg45(key,value,msg){const {error}=await sb.from('site_config').upsert({key,value,updated_at:new Date().toISOString()});if(error){flash('⚠️ '+error.message);return false;}flash(msg||'✔️ נשמר — מתעדכן אצל כל המשתמשים');return true;}
try{const nav=$45('#boNav');if(nav){
  if(!nav.querySelector('[data-s="kashrut"]')){const b=document.createElement('button');b.dataset.s='kashrut';b.textContent='🥇 הכשרים';const a=nav.querySelector('[data-s="products"]');if(a)a.after(b);else nav.appendChild(b);}
  if(!nav.querySelector('[data-s="shabbat45"]')){const b=document.createElement('button');b.dataset.s='shabbat45';b.textContent='🕯️ מצב ערב שבת';const a=nav.querySelector('[data-s="kashrut"]');if(a)a.after(b);else nav.appendChild(b);}}
  window.boView&&window.boView('kashrut',async function(){const m=$45('#boMain');m.innerHTML='<div class="card muted">טוען...</div>';
    const [c,pr]=await Promise.all([cfg45('kashrut'),sb.from('products').select('name,brand,barcode').order('name').limit(10000)]);
    applyKash45(c);let list=kashList45().slice();const prod=Object.assign({},kashCfg45.prod);
    /* כל המוצרים עם חברה: מהמאגר במסד הנתונים + החברות המובנות באתר */
    const rows=[],seen=new Set();const push=(name,brand,bc)=>{const k=kashKey45(name,brand);if(seen.has(k))return;seen.add(k);rows.push({name,brand:brand||'',bc:bc||'',k});};
    ((pr&&pr.data)||[]).forEach(p=>push(p.name,p.brand,p.barcode));Object.keys(P).filter(n=>!P[n].brand).forEach(n=>brandsOf(n).forEach(b=>push(n,b,'')));
    Object.keys(prod).forEach(k=>{if(!seen.has(k)){const [n,b]=k.split('|');push(n,b,'');}});
    rows.sort((a,b)=>a.name.localeCompare(b.name,'he')||a.brand.localeCompare(b.brand,'he'));
    let q='',onlyMissing=false;
    const save=async msg=>{const clean={};Object.keys(prod).forEach(k=>{if(prod[k]&&prod[k].length)clean[k]=prod[k];});const v={list,prod:clean};const okk=await setCfg45('kashrut',v,msg);if(okk!==false)applyKash45(v);};
    const draw=()=>{const nq=norm(q);const vis=rows.filter(r=>(!nq||norm(r.name+' '+r.brand+' '+r.bc+' '+(prod[r.k]||[]).join(' ')).includes(nq))&&(!onlyMissing||!(prod[r.k]||[]).length));
      const tagged=rows.filter(r=>(prod[r.k]||[]).length).length;
      m.innerHTML='<div class="card"><h2>🥇 רשימת ההכשרים</h2><p class="muted">ההכשרים שמשתמשים יכולים לבחור ב"ההכשרים שלנו". אפשר לשנות שם, למחוק ולהוסיף. (שינוי שם לא משנה מוצרים שכבר סומנו בשם הישן.)</p><div id="k45l">'+
        list.map((h,i)=>'<div class="row" style="margin:4px 0"><input data-k45l="'+i+'" value="'+esc(h)+'" maxlength="40"><button class="btn sm sec" data-k45ld="'+i+'">🗑️</button></div>').join('')+'</div>'+
        '<div class="row" style="margin-top:6px"><input id="k45ln" maxlength="40" placeholder="הכשר חדש"><button class="btn sm" id="k45la">➕ הוספה</button><button class="btn sm" id="k45ls">💾 שמירת הרשימה</button></div></div>'+
        '<div class="card"><h2>📄 העלאת קובץ הכשרים</h2><p class="muted">CSV או Excel עם עמודות <b>מוצר</b>, <b>חברה</b>, <b>הכשר</b> (כמה הכשרים — מפרידים בפסיק). מוצר שכבר מסומן — ההכשר שלו מתעדכן לפי הקובץ.</p><input type="file" id="k45f" accept=".csv,.txt,.xlsx,.xls,.ods"><div class="muted" id="k45fs"></div></div>'+
        '<div class="card"><h2>📦 הכשר לכל מוצר ('+tagged+' מתוך '+rows.length+' מסומנים)</h2><div class="row" style="margin-bottom:8px"><input id="k45q" placeholder="חיפוש לפי מוצר, חברה, ברקוד או הכשר" value="'+esc(q)+'"><label class="check"><input type="checkbox" id="k45miss"'+(onlyMissing?' checked':'')+'> רק בלי הכשר</label></div>'+
        '<datalist id="k45dl">'+list.map(h=>'<option value="'+esc(h)+'">').join('')+'</datalist>'+
        '<div class="tw"><table><thead><tr><th>מוצר</th><th>חברה</th><th>ברקוד</th><th>הכשר (כמה — בפסיק)</th></tr></thead><tbody>'+vis.slice(0,400).map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(r.brand||'—')+'</td><td dir="ltr">'+esc(r.bc)+'</td><td><input data-k45p="'+esc(r.k)+'" list="k45dl" value="'+esc((prod[r.k]||[]).join(', '))+'" maxlength="160" style="min-width:180px"></td></tr>').join('')+'</tbody></table></div>'+
        (vis.length>400?'<p class="muted">מוצגים 400 ראשונים מתוך '+vis.length+' — חפשו כדי לצמצם.</p>':'')+'</div>';
      const qi=m.querySelector('#k45q');qi.oninput=()=>{q=qi.value;const pos=qi.selectionStart;draw();const n=m.querySelector('#k45q');n.focus();n.setSelectionRange(pos,pos);};
      m.querySelector('#k45miss').onchange=e=>{onlyMissing=e.target.checked;draw();};
      m.querySelector('#k45f').onchange=async e=>{const f=e.target.files[0];if(!f)return;const st=m.querySelector('#k45fs');st.textContent='קורא...';
        try{let table;const n=f.name.toLowerCase();
          if(/\.(xlsx|xls|ods)$/.test(n)){const X=await loadXlsx();const wb=X.read(await f.arrayBuffer(),{type:'array'});table=X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false});}
          else{const buf=await f.arrayBuffer();let t=new TextDecoder('utf-8').decode(buf);if(t.includes('�'))try{t=new TextDecoder('windows-1255').decode(buf);}catch(err){}table=parseCsv(t.replace(/^﻿/,''));}
          const C={name:['מוצר','שם מוצר','שם המוצר','שם','product','name'],brand:['חברה','מותג','יצרן','brand','company'],k:['הכשר','כשרות','הכשרים','kashrut','kosher','hechsher'],bc:['ברקוד','barcode','ean']};
          const mh=h=>{const s=String(h||'').trim().toLowerCase().replace(/[\s_\-]/g,'');for(const f2 in C)if(C[f2].some(x=>x.replace(/[\s_\-]/g,'')===s))return f2;return null;};
          let hi=table.findIndex(r=>r.some(c=>mh(c)==='k'));if(hi<0){st.textContent='⚠️ לא מצאתי עמודה בשם "הכשר"';return;}const map={};table[hi].forEach((c,i)=>{const k=mh(c);if(k&&!Object.values(map).includes(k))map[i]=k;});
          let n2=0;const byBc={};rows.forEach(r=>{if(r.bc)byBc[r.bc]=r;});
          table.slice(hi+1).forEach(r=>{const o={};Object.entries(map).forEach(([i,k])=>o[k]=String(r[i]==null?'':r[i]).trim());const ks=String(o.k||'').split(/\s*[,;]\s*/).map(x=>x.trim().slice(0,40)).filter(Boolean).slice(0,6);if(!ks.length)return;
            let key='';const bc=String(o.bc||'').replace(/\D/g,'');if(bc&&byBc[bc])key=byBc[bc].k;else if(o.name)key=kashKey45(o.name,o.brand||'');if(!key)return;
            prod[key]=ks;if(!seen.has(key)){const [a,b]=key.split('|');push(o.name||a,o.brand||b,bc);}ks.forEach(h=>{if(!list.some(x=>norm(x)===norm(h)))list.push(h);});n2++;});
          if(!n2){st.textContent='לא נמצאו שורות עם הכשר';return;}await save('🥇 עודכן הכשר ל-'+n2+' מוצרים');draw();}catch(err){st.textContent='⚠️ '+(err.message==='xlsx'?'לא הצלחתי לטעון את קורא האקסל — שמרו כ-CSV':err.message);}};};
    m.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
      const readList=()=>{list=[...m.querySelectorAll('[data-k45l]')].map(i=>i.value.trim().slice(0,40)).filter(Boolean);};
      if(b.dataset.k45ld!==undefined){readList();list.splice(+b.dataset.k45ld,1);draw();return;}
      if(b.id==='k45la'){readList();const v=m.querySelector('#k45ln').value.trim().slice(0,40);if(v&&!list.some(x=>norm(x)===norm(v)))list.push(v);draw();return;}
      if(b.id==='k45ls'){readList();list=Array.from(new Set(list));await save('🥇 רשימת ההכשרים נשמרה');draw();}};
    m.onchange=async e=>{const i=e.target.closest('[data-k45p]');if(!i)return;const ks=i.value.split(/\s*[,;]\s*/).map(x=>x.trim().slice(0,40)).filter(Boolean).slice(0,6);
      if(ks.length)prod[i.dataset.k45p]=ks;else delete prod[i.dataset.k45p];ks.forEach(h=>{if(!list.some(x=>norm(x)===norm(h)))list.push(h);});await save('💾 נשמר');};
    draw();});
  window.boView&&window.boView('shabbat45',async function(){const m=$45('#boMain');const c=await cfg45('shabbatPrep');let items=Array.isArray(c.items)&&c.items.length?c.items.slice():SHB45_DEF.slice();let on=c.on!==false;
    const draw=()=>{m.innerHTML='<div class="card"><h2>🕯️ מצב ערב שבת</h2><p class="muted">בחמישי, בשישי ובערב חג משתמשים רואים כפתור "🕯️ ערב שבת" ליד הרשימות ומקבלים תזכורת בפעמון: רשימת בדיקה (נרות, יין, חלות...) ומה נשאר לקנות. כאן קובעים את רשימת ברירת המחדל לכולם — כל משתמש יכול לערוך לעצמו.</p>'+
      '<label class="check"><input type="checkbox" id="s45on"'+(on?' checked':'')+'> מצב ערב שבת ותזכורות פעילים לכל האתר</label>'+
      '<h3 style="margin-top:12px">רשימת ברירת המחדל</h3>'+items.map((n,i)=>'<div class="row" style="margin:4px 0"><input data-s45="'+i+'" value="'+esc(n)+'" maxlength="60"><button class="btn sm sec" data-s45d="'+i+'">🗑️</button></div>').join('')+
      '<div class="row" style="margin-top:6px"><input id="s45n" maxlength="60" placeholder="פריט חדש"><button class="btn sm" id="s45a">➕ הוספה</button></div><div class="row" style="margin-top:10px"><button class="btn" id="s45sv">💾 שמירה</button><button class="btn sec" id="s45def">↺ ברירת המחדל המקורית</button></div></div>';};
    const read=()=>{items=[...m.querySelectorAll('[data-s45]')].map(i=>i.value.trim().slice(0,60)).filter(Boolean);on=m.querySelector('#s45on').checked;};
    m.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.s45d!==undefined){read();items.splice(+b.dataset.s45d,1);draw();return;}
      if(b.id==='s45a'){read();const v=m.querySelector('#s45n').value.trim().slice(0,60);if(v)items.push(v);draw();return;}
      if(b.id==='s45def'){items=SHB45_DEF.slice();draw();return;}
      if(b.id==='s45sv'){read();const v={items:Array.from(new Set(items)).slice(0,40),on};if(await setCfg45('shabbatPrep',v)!==false)shbCfg45=v;}};
    draw();});
  const g=[...document.querySelectorAll('#boNav .bogrp')].find(x=>x.querySelector('[data-s="products"]'));const kb=$45('#boNav [data-s="kashrut"]');if(g&&kb&&kb.parentNode!==g)g.querySelector('[data-s="products"]').after(kb);
}catch(e){console.warn('bo v45',e);}
