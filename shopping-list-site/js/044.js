
/* ================= 🛒 רשימות מהקהילה: משתפים רשימה לנושא, מדרגים 1–5 עגלות, מוסיפים לרשימה שלי בלחיצה ================= */
(function(){
const st=document.createElement('style');
st.textContent='.card27{background:var(--recv);border:1px solid var(--line);border-radius:14px;padding:12px;margin:0 0 10px}'+
  '.card27.week27{border:2px solid #f3c623;background:linear-gradient(180deg,rgba(243,198,35,.16),transparent 70%)}'+
  '.wk27{display:inline-block;background:#f3c623;color:#2b2b26;border-radius:12px;padding:2px 10px;font-weight:700;font-size:13px;margin-bottom:6px}'+
  '.h27{display:flex;gap:10px;align-items:center}.h27 .em27{font-size:30px;line-height:1}.h27 b{font-size:16px;display:block}.h27 small{color:var(--muted);font-size:13px}'+
  '.carts27{direction:ltr;display:inline-flex;gap:1px;font-size:18px;vertical-align:middle}.carts27 i{font-style:normal;filter:grayscale(1);opacity:.28}.carts27 i.on{filter:none;opacity:1}'+
  '.rt27{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:6px 0;font-size:14px;color:var(--muted)}'+
  '.pick27{display:inline-flex;direction:ltr;gap:2px}.pick27 button{background:none;border:none;font-size:24px;cursor:pointer;padding:2px 3px;filter:grayscale(1);opacity:.3;line-height:1;min-width:34px;min-height:34px}.pick27 button.on{filter:none;opacity:1}'+
  '.its27{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.its27 span{background:var(--chipbg);border:1px solid var(--chipbr);border-radius:12px;padding:2px 9px;font-size:13px}'+
  '.acts27{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.acts27 .btn{padding:8px 12px}'+
  '.pill27{display:inline-block;border-radius:10px;padding:1px 8px;font-size:12px;background:#fff1c7;color:#6a5200;margin-inline-start:6px}.pill27.no{background:#f6d6d6;color:#7a1f1f}'+
  '#cl27 .b165>*{flex-shrink:0}.tb27{display:flex;flex-shrink:0;gap:6px;overflow-x:auto;padding:2px 0 8px}.tb27 .chip.on{background:var(--hdr2);color:#fff;border-color:var(--hdr2)}'+
  '.ed27{display:flex;flex-direction:column;gap:6px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:8px}'+
  '.ed27 label{font-size:13px;color:var(--muted)}.ed27 input,.ed27 select,.ed27 textarea{width:100%;box-sizing:border-box;font:inherit;padding:8px;border-radius:10px;border:1px solid var(--chipbr);background:var(--inputbg);color:var(--text)}'+
  '.ed27 textarea[data-f=items]{min-height:150px}.ed27 .two27{display:grid;grid-template-columns:90px 1fr;gap:8px}.ed27 .ck27{display:flex;align-items:center;gap:6px;color:var(--text)}.ed27 .ck27 input{width:auto}'+
  '#cl27q{font:inherit;padding:9px 12px;border-radius:12px;border:1px solid var(--chipbr);background:var(--inputbg);color:var(--text)}'+
  'body.dark .pill27{background:#4a3f12;color:#f3e6a8}body.dark .pill27.no{background:#4a1d1d;color:#f3c0c0}';
document.head.appendChild(st);
})();
const CL27_CATS=[['שבת','🕯️','Shabbat'],['חגים','🎉','Holidays'],['שבועי','📅','Weekly'],['אירועים','🎈','Events'],['ניקיון','🧽','Cleaning'],['מזווה','🥫','Pantry'],['אחר','🛒','Other']];
const cl27={rows:[],mine:[],sort:'top',cat:'',q:'',err:''};
const catIc27=c=>(CL27_CATS.find(x=>x[0]===c)||[])[1]||'🛒';
const catTx27=c=>{const x=CL27_CATS.find(y=>y[0]===c);return x?T(x[0],x[2]):c;};
function carts27(avg){const n=Math.round(Number(avg)||0);let h='';for(let i=1;i<=5;i++)h+='<i'+(i<=n?' class="on"':'')+'>🛒</i>';
  return '<span class="carts27" role="img" aria-label="'+(Number(avg)||0)+' '+T('מתוך 5 עגלות','of 5 carts')+'">'+h+'</span>';}
function itemsText27(items){return (items||[]).map(i=>i.n+(i.q?' × '+i.q:'')).join('\n');}
function textItems27(t){let lines=String(t||'').split('\n').map(s=>s.trim()).filter(Boolean);if(lines.length===1&&lines[0].includes(','))lines=lines[0].split(',').map(s=>s.trim()).filter(Boolean);
  const seen=new Set();return lines.map(s=>{s=s.replace(/^[•\-–☐☑✓✔*]+\s*/,'');const m=s.match(/^(.*?)\s*[×*]\s*(.+)$/);return m?{n:m[1].trim().slice(0,60),q:m[2].trim().slice(0,20)}:{n:s.slice(0,60),q:''};})
    .filter(i=>i.n&&!seen.has(i.n)&&seen.add(i.n)).slice(0,150);}

/* טופס אחד — לשיתוף של משתמש, ולעריכה / הוספה של מנהל (באתר ובבק אופיס) */
function editor27(x){x=x||{};const staff=isStaff();
  return '<div class="ed27" data-ed27="'+esc(x.id||'')+'">'+
    '<label>'+T('שם הרשימה','List name')+'</label><input data-f="title" maxlength="60" value="'+esc(x.title||'')+'" placeholder="'+T('למשל: שבת לבית של 8 נפשות','e.g. Shabbat for a family of 8')+'">'+
    '<div class="two27"><div><label>'+T('אייקון','Icon')+'</label>'+icField('data-f="emoji"',x.emoji||'🛒')+'</div>'+
    '<div><label>'+T('נושא','Topic')+'</label><select data-f="category">'+CL27_CATS.map(c=>'<option value="'+c[0]+'"'+((x.category||'שבת')===c[0]?' selected':'')+'>'+c[1]+' '+catTx27(c[0])+'</option>').join('')+'</select></div></div>'+
    '<label>'+T('כמה מילים על הרשימה (לא חובה)','A few words (optional)')+'</label><textarea data-f="description" maxlength="500" rows="2" placeholder="'+T('למשל: מספיק לשלוש סעודות, בלי בשר','e.g. enough for three meals')+'">'+esc(x.description||'')+'</textarea>'+
    '<label>'+T('המוצרים — כל מוצר בשורה, ואם צריך כמות: אחרי ×','Items — one per line, quantity after ×')+'</label><textarea data-f="items" placeholder="'+T('חלות × 5\nיין × 2\nדגים','Challah × 5\nWine × 2')+'">'+esc(itemsText27(x.items))+'</textarea>'+
    '<button type="button" class="btn sec" data-imp27>📝 '+T('לייבא מהרשימה הנוכחית','Import my current list')+'</button>'+
    (staff?'<label>'+T('מצב','Status')+'</label><select data-f="status">'+[['approved','✅ מפורסמת'],['pending','⏳ ממתינה לאישור'],['rejected','🙈 לא פורסמה']].map(s=>'<option value="'+s[0]+'"'+((x.status||'approved')===s[0]?' selected':'')+'>'+s[1]+'</option>').join('')+'</select>'+
      '<label class="ck27"><input type="checkbox" data-f="featured"'+(x.featured?' checked':'')+'> 🏆 רשימת השבוע</label>'+
      '<label class="ck27"><input type="checkbox" data-f="show_author"'+(x.show_author?' checked':'')+'> להציג לכולם את שם המשתף'+(x.author?' ('+esc(x.author)+')':'')+'</label>':
      '<p class="muted-note">'+T('הרשימה תתפרסם לכולם אחרי אישור מנהל האתר. שמך לא מוצג.','Published after approval. Your name is not shown.')+'</p>')+
    '<div class="acts27"><button type="button" class="btn" data-save27>'+(x.id?'💾 '+T('שמירה','Save'):staff?'➕ '+T('הוספה','Add'):'📤 '+T('שליחה לאישור','Send for approval'))+'</button><button type="button" class="btn sec" data-cancel27>'+T('ביטול','Cancel')+'</button></div></div>';}
async function saveEditor27(ed){
  const v=f=>{const e=ed.querySelector('[data-f="'+f+'"]');return e?(e.type==='checkbox'?e.checked:e.value.trim()):undefined;};
  const o={title:v('title').slice(0,60),emoji:(v('emoji')||'🛒').slice(0,8),category:v('category')||'',description:v('description').slice(0,500),items:textItems27(v('items'))};
  if(!o.title){flash(T('צריך שם לרשימה','A name is needed'));return false;}
  if(!o.items.length){flash(T('צריך לפחות מוצר אחד','At least one item'));return false;}
  if(!isStaff()&&[o.title,o.description,o.items.map(i=>i.n+' '+i.q).join(' ')].some(hasProfanity)){flash('🙏 '+T('נא לכתוב בלשון נקייה','Please keep it clean'));return false;}
  if(isStaff()){o.status=v('status')||'approved';o.featured=!!v('featured');o.show_author=!!v('show_author');}
  const id=ed.dataset.ed27;const b=ed.querySelector('[data-save27]');b.disabled=true;
  const {error}=id?await sb.from('shared_lists').update(o).eq('id',id):await sb.from('shared_lists').insert(Object.assign(o,{author_id:authUser.id}));
  b.disabled=false;
  if(error){flash('⚠️ '+(/relation|does not exist|schema cache/.test(error.message)?T('צריך להריץ את קוד ה-SQL המעודכן','Database update needed'):error.message));return false;}
  flash(isStaff()?'✔️ '+T('נשמר','Saved'):'📨 '+T('תודה! הרשימה נשלחה לאישור המנהל','Thanks! Sent for approval'));return true;}

async function load27(){
  cl27.err='';if(!sb){cl27.err=T('אין חיבור לשרת','No connection');return;}
  const [a,m]=await Promise.all([sb.rpc('shared_lists_feed',{p_scope:isStaff()?'all':'public'}),authUser&&!isStaff()?sb.rpc('shared_lists_feed',{p_scope:'mine'}):{data:[]}]);
  if(a.error){cl27.err=isAdmin()?'⚠️ צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית)':T('הרשימות עוד לא זמינות 🙏','Not available yet 🙏');return;}
  cl27.rows=a.data||[];cl27.mine=(m&&m.data)||[];}
function card27(r,opt){opt=opt||{};const staff=isStaff();
  const st=r.status&&r.status!=='approved'?'<span class="pill27'+(r.status==='rejected'?' no':'')+'">'+(r.status==='pending'?'⏳ '+T('ממתינה לאישור','Waiting for approval'):'🙈 '+T('לא פורסמה','Not published'))+'</span>':'';
  const its=r.items||[];const prev=opt.full?its:its.slice(0,8);
  const meta=[catIc27(r.category)+' '+catTx27(r.category),its.length+' '+T('מוצרים','items'),r.adds?r.adds+' '+T('הוסיפו לרשימה','added it'):''].filter(Boolean).join(' · ');
  const canRate=authUser&&!r.is_mine&&(r.status||'approved')==='approved';
  return '<div class="card27'+(r.week&&!opt.bo?' week27':'')+'" data-cl27="'+esc(r.id)+'">'+(r.week?'<span class="wk27">🏆 '+T('רשימת השבוע','List of the week')+(staff&&!r.featured?' ('+T('לפי הדירוגים','by ratings')+')':'')+'</span>':'')+
    '<div class="h27"><span class="em27">'+esc(r.emoji||'🛒')+'</span><div><b>'+esc(r.title)+st+'</b><small>'+esc(meta)+(r.author?' · '+T('שיתף/ה: ','by ')+esc(r.author):'')+(opt.bo&&r.author_email?' <span dir="ltr">'+esc(r.author_email)+'</span>':'')+'</small></div></div>'+
    '<div class="rt27">'+(r.n?carts27(r.avg)+' <b>'+Number(r.avg).toFixed(1)+'</b> ('+r.n+' '+T('דירוגים','ratings')+')':T('עוד אין דירוג','No ratings yet'))+'</div>'+
    (r.description?'<div style="white-space:pre-wrap;margin:4px 0">'+esc(r.description)+'</div>':'')+
    '<div class="its27">'+prev.map(i=>'<span>'+esc(i.n)+(i.q?' ×'+esc(i.q):'')+'</span>').join('')+(its.length>prev.length?'<button class="mini" data-more27>+'+(its.length-prev.length)+' '+T('עוד','more')+'</button>':'')+'</div>'+
    (canRate?'<div class="rt27">'+T('הדירוג שלך:','Your rating:')+' <span class="pick27" role="radiogroup" aria-label="'+T('דירוג בעגלות','Rating in carts')+'">'+[1,2,3,4,5].map(n=>'<button type="button" data-rate27="'+n+'" role="radio" aria-checked="'+(r.mine===n)+'" aria-label="'+n+' '+T('עגלות','carts')+'"'+(n<=(r.mine||0)?' class="on"':'')+'>🛒</button>').join('')+'</span></div>':'')+
    '<div class="acts27">'+(opt.bo?'':'<button class="btn" data-add27>➕ '+T('להוסיף לרשימה שלי','Add to my list')+'</button>')+
      ((r.status||'approved')==='approved'?'<button class="btn sec" data-share27>🔗 '+T('שיתוף','Share')+'</button>':'')+
      (staff||r.is_mine?'<button class="btn sec" data-edit27>✏️ '+T('עריכה','Edit')+'</button>':'')+
      (staff&&r.status!=='approved'?'<button class="btn sec" data-st27="approved">✅ אישור ופרסום</button>':'')+
      (staff&&r.status==='pending'?'<button class="btn sec" data-st27="rejected">🙈 דחייה</button>':'')+
      (staff&&r.status==='approved'?'<button class="btn sec" data-st27="pending">🙈 הסתרה</button>':'')+
      (staff&&r.status==='approved'?'<button class="btn sec" data-week27="'+(r.featured?0:1)+'">🏆 '+(r.featured?'ביטול רשימת השבוע':'להכריז כרשימת השבוע')+'</button>':'')+
      (staff||r.is_mine?'<button class="btn sec bad" data-del27 aria-label="'+T('מחיקה','Delete')+'">🗑️</button>':'')+'</div>'+
    '<div class="x27"></div></div>';}
function body27(){
  if(cl27.err)return '<div class="empty">'+cl27.err+'</div>';
  const q=norm(cl27.q||'');const staff=isStaff();
  let rows=cl27.rows.filter(r=>(!cl27.cat||r.category===cl27.cat)&&(!q||norm(r.title+' '+r.description+' '+(r.items||[]).map(i=>i.n).join(' ')).includes(q)));
  if(cl27.sort==='new')rows=rows.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  else if(cl27.sort==='adds')rows=rows.slice().sort((a,b)=>b.adds-a.adds||b.score-a.score);
  else rows=rows.slice().sort((a,b)=>(b.week-a.week)||(b.score-a.score)||(b.n-a.n));
  const pend=staff?rows.filter(r=>r.status==='pending'):[];if(staff)rows=rows.filter(r=>r.status!=='pending');
  const wk=!cl27.q&&!cl27.cat&&cl27.sort==='top'?rows.find(r=>r.week):null;
  const chips=[['top','⭐ '+T('הכי מדורגות','Top rated')],['new','🆕 '+T('חדשות','Newest')],['adds','🔥 '+T('הכי מוסיפים','Most added')]].map(s=>'<button class="chip'+(cl27.sort===s[0]?' on':'')+'" data-sort27="'+s[0]+'">'+s[1]+'</button>').join('')+
    '<button class="chip'+(!cl27.cat?' on':'')+'" data-cat27="">'+T('הכל','All')+'</button>'+CL27_CATS.map(c=>'<button class="chip'+(cl27.cat===c[0]?' on':'')+'" data-cat27="'+c[0]+'">'+c[1]+' '+catTx27(c[0])+'</button>').join('');
  return '<p class="muted-note">'+T('רשימות שבני הקהילה בנו לכל נושא. מדרגים מ-1 עד 5 עגלות 🛒, והרשימות הכי טובות עולות למעלה. כל רשימה אפשר להוסיף לרשימה שלך בלחיצה.','Lists the community built. Rate 1–5 carts; the best rise to the top. Add any list to yours in one tap.')+'</p>'+
    '<div class="acts27" style="margin:0 0 10px"><button class="btn" data-new27>➕ '+(staff?'הוספת רשימה':T('לשתף רשימה משלי','Share my own list'))+'</button></div><div class="x27new"></div>'+
    (pend.length?'<h4 style="margin:8px 2px">⏳ ממתינות לאישור ('+pend.length+')</h4>'+pend.map(r=>card27(r)).join('')+'<hr>':'')+
    (wk?card27(wk):'')+
    '<input id="cl27q" type="search" placeholder="🔍 '+T('חיפוש רשימה או מוצר...','Search a list or item...')+'" value="'+esc(cl27.q)+'" style="width:100%;box-sizing:border-box;margin-bottom:6px">'+
    '<div class="tb27">'+chips+'</div><div class="ls27">'+list27(rows.filter(r=>r!==wk))+'</div>'+
    (cl27.mine.length?'<h4 style="margin:14px 2px 6px">📝 '+T('הרשימות ששיתפתי','Lists I shared')+'</h4>'+cl27.mine.map(r=>card27(r)).join(''):'');}
function list27(rows){return rows.length?rows.map(r=>card27(r)).join(''):'<div class="empty">'+(cl27.rows.length?T('לא נמצאו רשימות 🙂','No lists found 🙂'):T('עוד אין רשימות — '+GW2('תהיי','תהיה')+' הראשון/ה לשתף! 🛒','No lists yet — be the first! 🛒'))+'</div>';}
function find27(id){return cl27.rows.find(r=>r.id===id)||cl27.mine.find(r=>r.id===id);}

/* הוספה לרשימה שלי: בוחרים מה צריך (מה שכבר ברשימה / בבית — לא מסומן), ואז לרשימה הנוכחית או לרשימה חדשה */
function addPicker27(r){const l=curList();const inList=n=>l&&l.items.some(x=>x.n===n&&!x.done);const home=n=>typeof pantryHas==='function'&&pantryHas(n);
  return '<div class="ed27"><div class="row2 wrap15"><button type="button" class="btn sm sec" data-all27="1">✔ '+T('הכל','All')+'</button><button type="button" class="btn sm sec" data-all27="0">✖ '+T('כלום','None')+'</button></div><div class="ck165">'+
    (r.items||[]).map((i,k)=>'<label><input type="checkbox" value="'+k+'" '+(inList(i.n)||home(i.n)?'':'checked')+'> '+esc(emojiOf(i.n)||'')+' '+esc(i.n)+(i.q?' ×'+esc(i.q):'')+(inList(i.n)?' <small>('+T('כבר ברשימה','already listed')+')</small>':home(i.n)?' <small>('+T('יש בבית','at home')+')</small>':'')+'</label>').join('')+'</div>'+
    '<div class="acts27">'+(l?'<button type="button" class="btn" data-addto27="cur">➕ '+T('לרשימה','To list')+' "'+esc(l.name)+'"</button>':'')+'<button type="button" class="btn sec" data-addto27="new">📝 '+T('רשימה חדשה','New list')+'</button></div></div>';}
function addToMine27(r,idx,asNew){
  const its=(r.items||[]).filter((_,k)=>idx.includes(k));if(!its.length){flash(T('לא סומן אף מוצר','Nothing selected'));return false;}
  let l=asNew?null:curList();
  if(!l){l={id:uid(),name:String(r.title).slice(0,40),items:[],created:Date.now()};state.lists.push(l);state.active=l.id;}
  let added=0;its.forEach(i=>{const ex=l.items.find(x=>x.n===i.n&&!x.done);
    if(ex){const m=mergeQty(ex.q,i.q);if(m!==ex.q){ex.q=m;ex.ts=Date.now();}}
    else{l.items.push({id:uid(),n:i.n,q:i.q||'',c:resolveCat(i.n),e:emojiOf(i.n),done:false,ts:Date.now()});added++;}});
  save();render();if(sb&&authUser)sb.rpc('shared_list_added',{p_id:r.id}).then(()=>{},()=>{});
  flash('🛒 '+T('נוספו '+added+' מוצרים לרשימה "'+l.name+'"',added+' items added to "'+l.name+'"'));return true;}

async function act27(e,root,reload){
  const card=e.target.closest('[data-cl27]');const id=card&&card.dataset.cl27;const r=id&&find27(id);const x=card&&card.querySelector('.x27');
  let b;
  if((b=e.target.closest('[data-sort27]'))){cl27.sort=b.dataset.sort27;reload(false);return;}
  if((b=e.target.closest('[data-cat27]'))){cl27.cat=b.dataset.cat27;reload(false);return;}
  if(e.target.closest('[data-new27]')){if(needLogin26())return;const box=root.querySelector('.x27new');box.innerHTML=editor27(null);box.querySelector('[data-f=title]').focus();return;}
  if(e.target.closest('[data-imp27]')){const ed=e.target.closest('.ed27');const l=curList();if(!l||!l.items.length){flash(T('הרשימה הנוכחית ריקה','Your current list is empty'));return;}
    const ta=ed.querySelector('[data-f=items]');ta.value=itemsText27(l.items.filter(i=>!i.done).map(i=>({n:i.n,q:i.q})));const t=ed.querySelector('[data-f=title]');if(!t.value)t.value=l.name;return;}
  if(e.target.closest('[data-cancel27]')){const ed=e.target.closest('.ed27');ed.remove();return;}
  if(e.target.closest('[data-save27]')){const ed=e.target.closest('.ed27');if(await saveEditor27(ed))reload(true);return;}
  if((b=e.target.closest('[data-all27]'))){card.querySelectorAll('.ck165 input').forEach(c=>c.checked=b.dataset.all27==='1');return;}
  if(!r)return;
  if(e.target.closest('[data-more27]')){card.outerHTML=card27(r,{full:true,bo:!!root.closest('#bo')});return;}
  if(e.target.closest('[data-add27]')){if(x.firstChild){x.innerHTML='';return;}x.innerHTML=addPicker27(r);return;}
  if((b=e.target.closest('[data-addto27]'))){const idx=[...card.querySelectorAll('.ck165 input:checked')].map(c=>+c.value);
    if(addToMine27(r,idx,b.dataset.addto27==='new')){const ov=document.getElementById('cl27');if(ov)ov.remove();setTab('list');}return;}
  if(e.target.closest('[data-share27]')){const text=(r.emoji||'🛒')+' '+r.title+(r.n?' — '+T('דירוג','rated')+' '+Number(r.avg).toFixed(1)+'/5 🛒':'')+'\n'+(r.items||[]).slice(0,12).map(i=>'• '+i.n+(i.q?' ×'+i.q:'')).join('\n')+((r.items||[]).length>12?'\n…':'');
    if(typeof openShare18==='function')openShare18({what:T('רשימה','List'),title:r.title,text,hash:'#clist='+r.id});else copyText(text);return;}
  if((b=e.target.closest('[data-rate27]'))){if(needLogin26())return;const n=+b.dataset.rate27;
    const {error}=await sb.from('shared_list_ratings').upsert({list_id:r.id,user_id:authUser.id,carts:n},{onConflict:'list_id,user_id'});
    if(error){flash('⚠️ '+error.message);return;}r.mine=n;flash('🛒 '+T('תודה על הדירוג!','Thanks for rating!'));reload(true);return;}
  if(e.target.closest('[data-edit27]')){if(x.firstChild){x.innerHTML='';return;}x.innerHTML=editor27(r);return;}
  if((b=e.target.closest('[data-st27]'))){const {error}=await sb.from('shared_lists').update({status:b.dataset.st27}).eq('id',r.id);if(error){flash('⚠️ '+error.message);return;}flash('✔️ בוצע');reload(true);return;}
  if((b=e.target.closest('[data-week27]'))){const {error}=await sb.from('shared_lists').update({featured:b.dataset.week27==='1'}).eq('id',r.id);if(error){flash('⚠️ '+error.message);return;}flash(b.dataset.week27==='1'?'🏆 הוכרזה כרשימת השבוע':'✔️ בוטל');reload(true);return;}
  if(e.target.closest('[data-del27]')){if(!(await uiConfirm(T('למחוק את הרשימה "'+r.title+'" לצמיתות?','Delete this list?'))))return;const {error}=await sb.from('shared_lists').delete().eq('id',r.id);if(error){flash('⚠️ '+error.message);return;}flash('🗑️ '+T('נמחקה','Deleted'));reload(true);return;}
}

async function openCl27(focusId){
  const ov=sheet165('cl27','🛒 '+T('רשימות מהקהילה','Community lists'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');const box=ov.querySelector('.b165');
  const draw=()=>{box.innerHTML=body27();const q=box.querySelector('#cl27q');if(q)q.oninput=()=>{cl27.q=q.value;const staff=isStaff();const nq=norm(cl27.q||'');
    const rows=cl27.rows.filter(r=>(!staff||r.status!=='pending')&&(!cl27.cat||r.category===cl27.cat)&&(!nq||norm(r.title+' '+r.description+' '+(r.items||[]).map(i=>i.n).join(' ')).includes(nq)));
    box.querySelector('.ls27').innerHTML=list27(rows);};};
  const reload=async fresh=>{if(fresh)await load27();draw();};
  box.addEventListener('click',e=>act27(e,box,reload));
  await load27();draw();
  if(focusId){const el=box.querySelector('[data-cl27="'+focusId+'"]');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.outline='3px solid #f3c623';}}}
window.openCl27=openCl27;

/* תפריט ⚙️, יאמי וקישור ישיר (#clist=...) */
add26('miCl27','🛒','רשימות מהקהילה — לדרג ולהוסיף','Community lists','miWeek26',()=>openCl27());
document.addEventListener('click',e=>{if(e.target.closest('[data-cl27open]'))openCl27();});
yamiStep(async raw=>{const t=String(raw||'').trim();
  if(/^(רשימות מהקהילה|רשימות של הקהילה|רשימת השבוע|לשתף רשימה|רשימות משותפות)\??$/.test(t)){botSay('🛒 '+T('פתחתי את הרשימות מהקהילה — אפשר לדרג, להוסיף לרשימה שלך, ולשתף רשימה משלך','Opened community lists'));openCl27();return true;}
  return false;});
const _cl27Route=routeHash;
routeHash=function(){const m=(location.hash||'').match(/^#clist=([0-9a-f-]{36})$/);if(m){history.replaceState(null,'',location.pathname);setTimeout(()=>openCl27(m[1]),300);return;}return _cl27Route.apply(this,arguments);};
if(/^#clist=/.test(location.hash))setTimeout(routeHash,2600);

/* בבק אופיס: 🛒 רשימות מהקהילה — הכל במקום אחד: ממתינות, מפורסמות, רשימת השבוע, הוספה ועריכה */
try{const nav=document.querySelector('#boNav');if(nav&&!nav.querySelector('[data-s="commlists"]')){const b=document.createElement('button');b.dataset.s='commlists';b.textContent='🛒 רשימות מהקהילה';
    const after=nav.querySelector('[data-s="reviews"]');if(after)after.after(b);else nav.appendChild(b);}
  window.boView&&window.boView('commlists',async function(){const m=document.querySelector('#boMain');
    await load27();if(cl27.err){m.innerHTML='<div class="card">'+cl27.err+'</div>';return;}
    const by=s=>cl27.rows.filter(r=>r.status===s);const ratings=cl27.rows.reduce((a,r)=>a+r.n,0),adds=cl27.rows.reduce((a,r)=>a+r.adds,0);
    const auto=cl27.rows.find(r=>r.week&&!r.featured);
    m.innerHTML='<div class="stats"><div class="stat"><div class="n">'+by('pending').length+'</div><div class="l">ממתינות לאישור</div></div><div class="stat"><div class="n">'+by('approved').length+'</div><div class="l">מפורסמות</div></div><div class="stat"><div class="n">'+ratings+'</div><div class="l">דירוגים (עגלות)</div></div><div class="stat"><div class="n">'+adds+'</div><div class="l">הוספות לרשימות</div></div></div>'+
      '<div class="card" style="margin-top:14px"><h2>🛒 רשימות מהקהילה</h2><p class="muted">משתמשים משתפים רשימה לנושא, והיא מתפרסמת רק אחרי האישור שלך. אפשר לערוך הכל (כולל המוצרים), למחוק, להוסיף רשימות בעצמך, ולהכריז על 🏆 רשימת השבוע. אם לא הכרזת — מוצגת אוטומטית הרשימה עם הדירוג הכי טוב מהשבוע האחרון'+(auto?' (עכשיו: <b>'+esc(auto.title)+'</b>)':'')+'. את אותו הדבר אפשר לעשות גם ישר באתר: תפריט ⚙️ ← "🛒 רשימות מהקהילה".</p>'+
      '<button class="btn" data-new27>➕ הוספת רשימה</button><div class="x27new"></div></div>'+
      [['pending','⏳ ממתינות לאישור','אין 🎉'],['approved','✅ מפורסמות','אין עדיין'],['rejected','🙈 לא פורסמו','']].filter(s=>s[2]||by(s[0]).length)
        .map(s=>'<div class="card"><h2>'+s[1]+' ('+by(s[0]).length+')</h2>'+(by(s[0]).map(r=>card27(r,{bo:true})).join('')||'<p class="muted">'+s[2]+'</p>')+'</div>').join('');
    m.onclick=e=>act27(e,m,async()=>{window.boShow('commlists');});});
  const g=[...document.querySelectorAll('#boNav .bogrp')].find(x=>x.querySelector('[data-s="reviews"]'));const cb=document.querySelector('#boNav [data-s="commlists"]');if(g&&cb&&cb.parentNode!==g)g.querySelector('[data-s="reviews"]').after(cb);
}catch(e){console.warn('bo commlists',e);}
