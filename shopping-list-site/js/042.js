
/* ================= v44: 🤝 קהילה =================
   💡 לוח הצעות — "גם אני רוצה", וסטטוסים (חדש / בבדיקה / בעבודה / נוסף לאתר) שהמנהל משנה ישר מהלוח
   💰 טיפים לחיסכון — מתפרסמים רק אחרי אישור מנהל · 🔥 מבצעים שמצאתי — משתמשים מאשרים שהמבצע עדיין בתוקף
   🎖️ שגרירים ותגים — אוטומטי למי שהביא חברים, והמנהל נותן / עורך / מוריד תג לכל אחד
   ❌ מחיר שגוי — המדווח כותב מה המחיר הנכון, והמנהל מטפל בלחיצה (באתר, בבק אופיס וב"ממתין לאישור")
   הכל באותו לוח — גם באתר (תפריט ⚙️ ← 🤝 קהילה) וגם בבק אופיס (🤝 קהילה), והמנהל עורך הכל ישר מתוכו. */
(function(){
const $44=s=>document.querySelector(s);
(function(){const st=document.createElement('style');st.textContent=
  '.hub44 .tabs44{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;margin-bottom:4px;border-bottom:1px solid var(--line)}'+
  '.hub44 .tabs44 button{flex:0 0 auto;border:1px solid var(--chipbr);background:var(--inputbg);color:var(--text);border-radius:18px;padding:7px 14px;font:inherit;font-size:14px;cursor:pointer}'+
  '.hub44 .tabs44 button[aria-selected=true]{background:var(--hdr2);border-color:var(--hdr2);color:#fff;font-weight:700}'+
  '.hub44 .chips44{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.hub44 .chips44 button{border:1px solid var(--chipbr);background:transparent;color:var(--text);border-radius:14px;padding:4px 11px;font:inherit;font-size:13px;cursor:pointer}'+
  '.hub44 .chips44 button.on{background:rgba(30,58,95,.15);border-color:var(--hdr2);font-weight:700}'+
  '.c44{border:1px solid var(--chipbr);border-radius:14px;padding:12px 14px;margin:8px 0;background:var(--inputbg);color:var(--text)}.c44.pin{border-color:#e0b100;box-shadow:0 0 0 1px #e0b100 inset}.c44.dim{opacity:.6}'+
  '.c44 h4{margin:0 0 4px;font-size:16px;display:flex;gap:6px;align-items:flex-start}.c44 h4>span:first-child{flex:1}.c44 h4 .st44{flex:0 0 auto}.c44 p{margin:4px 0;white-space:pre-wrap;overflow-wrap:anywhere}'+
  '.c44 .meta{font-size:13px;color:var(--muted);margin-top:4px}.c44 .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}'+
  '.c44 .acts button,.pf44 .acts button,.hub44 .b44{border:1px solid var(--chipbr);background:var(--panel,#fff);color:var(--text);border-radius:12px;padding:6px 11px;font:inherit;font-size:14px;cursor:pointer}'+
  '.c44 .acts button.on{background:var(--hdr2);border-color:var(--hdr2);color:#fff;font-weight:700}.c44 .acts button.bad{color:#b3261e}.hub44 .b44.main{background:var(--hdr2);border-color:var(--hdr2);color:#fff;font-weight:700}'+
  '.st44{display:inline-block;border-radius:10px;padding:1px 9px;font-size:13px;font-weight:700;white-space:nowrap;background:#e8eef0;color:#2b3a40}'+
  '.st44.new{background:#e3f2fd;color:#0d47a1}.st44.review{background:#fff3cd;color:#6b5000}.st44.working{background:#ffe0cc;color:#8a3a00}.st44.done{background:#d7f5dd;color:#145a24}.st44.declined{background:#eee;color:#555}'+
  'body.dark .st44{filter:brightness(.85)}.bd44{display:inline-block;background:#f3c623;color:#2b2b26;border-radius:10px;padding:0 7px;font-size:12px;font-weight:700;margin-inline-start:4px}'+
  '.who44{font-weight:600}.reply44{border-inline-start:3px solid var(--hdr2);padding:4px 8px;margin:6px 0;background:rgba(30,58,95,.07);border-radius:6px;white-space:pre-wrap}'+
  '.hub44 .form44{border:1px dashed var(--hdr2);border-radius:14px;padding:10px 12px;margin:8px 0}.hub44 .form44 label{display:block;font-size:13px;color:var(--muted);margin:6px 0 2px}'+
  '.hub44 input,.hub44 textarea,.hub44 select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--chipbr);border-radius:10px;background:var(--inputbg);color:var(--text);font:inherit}'+
  '.hub44 textarea{min-height:70px}.hub44 .row44{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.hub44 .row44>*{flex:1 1 140px}.hub44 .chk44{display:flex;gap:6px;align-items:center;font-size:14px}.hub44 .chk44 input{width:auto}'+
  '.hub44 .intro44{font-size:14px;color:var(--muted);margin:4px 0 8px}.hub44 .rk44{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--line);align-items:center}.hub44 .rk44:last-child{border-bottom:none}'+
  '.hub44 .rk44.me{background:rgba(30,58,95,.1);border-radius:8px;padding-inline:6px}.hub44 .warn44{color:#b3261e;font-weight:600;font-size:13px}.hub44 .ok44{color:#1b7a34;font-weight:600;font-size:13px}'+
  '.pf44{border:1px solid var(--chipbr);border-radius:12px;padding:10px 12px;margin:8px 0;background:var(--inputbg)}.pf44 .rep{font-size:13px;border-top:1px dashed var(--line);padding-top:4px;margin-top:4px}'+
  '.pf44{line-height:1.6}.pf44 .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}.pf44 .acts>*{flex:0 0 auto}.hub44 .pf44 input,#bo .pf44 input{width:110px!important;margin:0!important;padding:6px 8px;border:1px solid var(--chipbr);border-radius:10px;background:var(--inputbg);color:var(--text);font:inherit}';
  document.head.appendChild(st);
  /* בבק אופיס יש איפוס של כל הריווחים (#bo *) — מחזירים אותם ללוח הקהילה */
  const st2=document.createElement('style');st2.textContent=
  '#bo .hub44 .tabs44{padding:2px 0 8px;margin-bottom:6px}#bo .hub44 .tabs44 button{padding:7px 14px}#bo .hub44 .chips44{margin:8px 0}#bo .hub44 .chips44 button{padding:4px 11px}'+
  '#bo .c44{padding:12px 14px;margin:8px 0}#bo .c44 h4{margin:0 0 6px}#bo .c44 p{margin:4px 0}#bo .c44 .meta{margin-top:4px}#bo .c44 .acts,#bo .pf44 .acts{margin-top:8px}'+
  '#bo .c44 .acts button,#bo .pf44 .acts button,#bo .hub44 .b44{padding:6px 11px}#bo .st44{padding:1px 9px}#bo .bd44{padding:0 7px;margin-inline-start:4px}#bo .reply44{padding:4px 8px;margin:6px 0}'+
  '#bo .hub44 .form44{padding:10px 12px;margin:8px 0}#bo .hub44 .form44 label{margin:6px 0 2px}#bo .hub44 .intro44{margin:4px 0 10px}#bo .hub44 .rk44{padding:8px 0}#bo .hub44>h4,#bo .hub44 .body44>h4{margin:12px 0 4px}'+
  '#bo .pf44{padding:10px 12px;margin:8px 0}#bo .pf44 .rep{padding-top:4px;margin-top:4px}#bo .hub44 .chk44{margin:6px 0}';
  document.head.appendChild(st2);})();

const ST44={new:['🆕','חדש','New'],review:['👀','בבדיקה','Under review'],working:['🛠️','בעבודה','In progress'],done:['✅','נוסף לאתר','Added to the site'],declined:['🚫','לא מתאים כרגע','Not for now']};
const TIPCAT44=['קניות','מבצעים','אוכל ובישול','ניקיון','שבת וחגים','כללי'];
const stPill44=s=>'<span class="st44 '+esc(s)+'">'+(ST44[s]?ST44[s][0]+' '+T(ST44[s][1],ST44[s][2]):esc(s))+'</span>';
const badges44=b=>(Array.isArray(b)?b:[]).map(x=>'<span class="bd44" title="'+esc(x.l||'')+'">'+esc(x.e||'')+(x.l?' '+esc(x.l):'')+'</span>').join('');
const who44=(n,b)=>'<span class="who44">'+esc(n||T('משתמש/ת','User'))+'</span>'+badges44(b);
const staff44=()=>!!(sb&&authUser&&typeof isStaff==='function'&&isStaff());
const admin44=()=>!!(sb&&authUser&&typeof isAdmin==='function'&&isAdmin());
const sqlErr44=e=>'<div class="c44">⚠️ '+T('עוד לא זמין — צריך להריץ את קוד ה-SQL המעודכן (בק אופיס ← ⚙️ הגדרה ראשונית)','Not available yet — the SQL update must be run')+(e&&e.message&&staff44()?'<div class="meta" dir="ltr">'+esc(e.message)+'</div>':'')+'</div>';
const errMsg44=e=>{const m=String((e&&e.message)||e||'');return m.includes('too_many')?T('הגעת למקסימום להיום 🙂 אפשר להמשיך מחר','Daily limit reached'):m.includes('locked')?T('ההצעה כבר בטיפול — אי אפשר לשנות אותה','Already being handled'):'⚠️ '+m;};
const H44={tab:'sugg',filter:'all',dealF:'all',sugg:[],tips:[],deals:[],amb:[],badges:[],users:null,edit:null,form:false,ambMin:3,box:null,bo:false};

/* ---------- פתיחה ---------- */
window.openCommunity44=function(tab){if(needLogin26())return;const b=openSheet('🤝 '+T('קהילה — הצעות, טיפים ומבצעים','Community'),'');H44.bo=false;mount44(b,tab);};
function mount44(box,tab){H44.box=box;if(tab)H44.tab=tab;H44.edit=null;H44.form=false;
  box.innerHTML='<div class="hub44"><div class="tabs44" role="tablist"></div><div class="body44"><div class="empty">'+T('טוען...','Loading...')+'</div></div></div>';
  box.onclick=click44;box.onchange=change44;box.oninput=null;load44();}
async function load44(){const t=H44.tab;drawTabs44();const body=H44.box&&H44.box.querySelector('.body44');if(!body)return;
  try{
    if(t==='sugg'){const {data,error}=await sb.rpc('suggestions_list');if(error)throw error;H44.sugg=data||[];}
    else if(t==='tips'){const {data,error}=await sb.rpc('tips_list');if(error)throw error;H44.tips=data||[];}
    else if(t==='deals'){const {data,error}=await sb.rpc('deals_found',{p_days:45});if(error)throw error;H44.deals=data||[];}
    else if(t==='amb'){const [a,m,my]=await Promise.all([sb.rpc('community_ambassadors'),sb.rpc('amb_min'),sb.rpc('my_badges')]);if(a.error)throw a.error;H44.amb=a.data||[];H44.ambMin=+m.data||3;H44.myBadges=my.data||[];
      if(admin44()){const r=await sb.rpc('admin_badges');H44.badges=r.data||[];}}
    else if(t==='flags'){const {data,error}=await sb.rpc('staff_flagged_prices');if(error)throw error;H44.flags=data||[];}
  }catch(e){if(H44.tab===t)body.innerHTML=sqlErr44(e);return;}
  if(H44.tab===t)draw44();}
function drawTabs44(){const bar=H44.box&&H44.box.querySelector('.tabs44');if(!bar)return;
  const tabs=[['sugg','💡 '+T('לוח הצעות','Ideas')],['tips','💰 '+T('טיפים לחיסכון','Saving tips')],['deals','🔥 '+T('מבצעים שמצאתי','Deals found')],['amb','🎖️ '+T('שגרירים','Ambassadors')]];
  if(staff44())tabs.push(['flags','❌ '+T('מחירים שגויים','Wrong prices')]);
  bar.innerHTML=tabs.map(([k,l])=>'<button role="tab" data-t44="'+k+'" aria-selected="'+(H44.tab===k)+'">'+l+'</button>').join('');}
function draw44(){const body=H44.box&&H44.box.querySelector('.body44');if(!body)return;drawTabs44();
  body.innerHTML=({sugg:drawSugg44,tips:drawTips44,deals:drawDeals44,amb:drawAmb44,flags:()=>'<p class="intro44">'+T('כל מחיר שמשתמשים סימנו "לא נכון" — עם המחיר הנכון שהם כתבו. ✔ המחיר נכון מנקה את הדיווחים, 🔄 מעדכן ומודיע למדווחים.','')+'</p>'+flagsHtml44(H44.flags||[])}[H44.tab]||drawSugg44)();}

/* ---------- 💡 לוח הצעות ---------- */
function suggForm44(x){const st=staff44();x=x||{};
  return '<div class="form44" data-sf44="'+esc(x.id||'')+'"><label>'+T('הרעיון בקצרה','The idea in short')+'</label><input data-f="title" maxlength="120" value="'+esc(x.title||'')+'" placeholder="'+T('למשל: אפשרות להדפיס את הרשימה לפי מחלקות','e.g. print the list by aisles')+'">'+
    '<label>'+T('פרטים (לא חובה)','Details (optional)')+'</label><textarea data-f="body" maxlength="2000">'+esc(x.body||'')+'</textarea>'+
    (st?'<div class="row44"><div><label>'+T('סטטוס','Status')+'</label><select data-f="status">'+Object.keys(ST44).map(k=>'<option value="'+k+'"'+((x.status||'new')===k?' selected':'')+'>'+ST44[k][0]+' '+ST44[k][1]+'</option>').join('')+'</select></div>'+
      '<div><label>'+T('תוספת ל"גם אני רוצה" (ידני)','Extra votes')+'</label><input data-f="extra_votes" type="number" step="1" value="'+(+x.extra_votes||0)+'"></div></div>'+
      '<label>'+T('תגובת האתר (מוצגת לכולם)','Site reply (public)')+'</label><textarea data-f="reply" maxlength="1000" style="min-height:50px">'+esc(x.reply||'')+'</textarea>'+
      '<div class="row44"><label class="chk44"><input type="checkbox" data-f="pinned"'+(x.pinned?' checked':'')+'> 📌 '+T('נעוץ למעלה','Pinned')+'</label><label class="chk44"><input type="checkbox" data-f="hidden"'+(x.hidden?' checked':'')+'> 🙈 '+T('מוסתר מהמשתמשים','Hidden')+'</label></div>':'')+
    '<div class="row44" style="margin-top:8px"><button class="b44 main" data-ssave44="1">💾 '+(x.id?T('שמירה','Save'):T('פרסום ההצעה','Post'))+'</button><button class="b44" data-x44="1">'+T('ביטול','Cancel')+'</button></div></div>';}
function drawSugg44(){const st=staff44();const f=H44.filter;
  const cnt=k=>H44.sugg.filter(x=>x.status===k).length;
  const list=H44.sugg.filter(x=>f==='all'?(st||x.status!=='declined'):f==='mine'?x.is_mine:x.status===f);
  return '<p class="intro44">💡 '+T('יש לכם רעיון לשפר את האתר? כתבו אותו כאן. אהבתם רעיון של מישהו אחר? לחצו "🙋 גם אני רוצה" — מה שהכי הרבה רוצים, נכנס ראשון. כשהסטטוס משתנה תקבלו עדכון.','Have an idea? Post it. Like someone else\'s? Tap "Me too".')+'</p>'+
    (H44.form&&!H44.edit?suggForm44():'<button class="b44 main" data-snew44="1" style="width:100%">➕ '+T('הצעה חדשה','New idea')+'</button>')+
    '<div class="chips44" role="group" aria-label="'+T('סינון','Filter')+'">'+[['all',T('הכל','All')],['new',ST44.new[0]+' '+T('חדש','New')+' ('+cnt('new')+')'],['review',ST44.review[0]+' '+T('בבדיקה','Review')+' ('+cnt('review')+')'],['working',ST44.working[0]+' '+T('בעבודה','In progress')+' ('+cnt('working')+')'],['done',ST44.done[0]+' '+T('נוסף לאתר','Done')+' ('+cnt('done')+')'],['mine','👤 '+T('שלי','Mine')]].concat(st?[['declined',ST44.declined[0]+' '+T('לא מתאים','Declined')+' ('+cnt('declined')+')']]:[])
      .map(([k,l])=>'<button data-sf44f="'+k+'" class="'+(f===k?'on':'')+'" aria-pressed="'+(f===k)+'">'+l+'</button>').join('')+'</div>'+
    (list.map(x=>H44.edit===x.id?suggForm44(x):
      '<div class="c44'+(x.pinned?' pin':'')+(x.hidden?' dim':'')+'" data-sid44="'+esc(x.id)+'"><h4><span>'+(x.pinned?'📌 ':'')+esc(x.title)+'</span>'+stPill44(x.status)+'</h4>'+(x.body?'<p>'+esc(x.body)+'</p>':'')+
        (x.reply?'<div class="reply44">💬 <b>'+T('תגובת האתר:','Site reply:')+'</b> '+esc(x.reply)+'</div>':'')+
        '<div class="meta">'+T('הוצע ע״י ','By ')+who44(x.author,x.badges)+' · '+agoText(x.created_at)+(x.status_at?' · '+T('סטטוס עודכן ','status updated ')+agoText(x.status_at):'')+(x.hidden?' · 🙈 '+T('מוסתר','hidden'):'')+'</div>'+
        '<div class="acts"><button data-svote44="'+esc(x.id)+'" class="'+(x.my_vote?'on':'')+'" aria-pressed="'+(!!x.my_vote)+'">🙋 '+T('גם אני רוצה','Me too')+' · <b>'+(+x.votes||0)+'</b></button>'+
        (st?'<select data-sst44="'+esc(x.id)+'" aria-label="'+T('סטטוס','Status')+'" style="width:auto;padding:5px 8px">'+Object.keys(ST44).map(k=>'<option value="'+k+'"'+(x.status===k?' selected':'')+'>'+ST44[k][0]+' '+ST44[k][1]+'</option>').join('')+'</select>'+
          '<button data-spin44="'+esc(x.id)+'" title="'+T('נעיצה','Pin')+'">'+(x.pinned?'📌 '+T('ביטול נעיצה','Unpin'):'📌 '+T('נעיצה','Pin'))+'</button><button data-shide44="'+esc(x.id)+'">'+(x.hidden?'👁️ '+T('הצגה','Show'):'🙈 '+T('הסתרה','Hide'))+'</button>':'')+
        ((st||(x.is_mine&&x.status==='new'))?'<button data-sedit44="'+esc(x.id)+'">✏️ '+T('עריכה','Edit')+'</button>':'')+
        ((st||x.is_mine)?'<button class="bad" data-sdel44="'+esc(x.id)+'">🗑️</button>':'')+'</div></div>').join('')||'<div class="empty">'+T('עוד אין כאן הצעות — אולי את/ה הראשון/ה? 💡','No ideas here yet')+'</div>');}

/* ---------- 💰 טיפים לחיסכון ---------- */
function tipForm44(x){x=x||{};const st=staff44();
  return '<div class="form44" data-tf44="'+esc(x.id||'')+'"><label>'+T('הטיפ','The tip')+'</label><textarea data-f="body" maxlength="600" placeholder="'+T('למשל: ביום חמישי בערב יש הנחות על לחמים ועוגות','e.g. Thursday evening bread discounts')+'">'+esc(x.body||'')+'</textarea>'+
    '<label>'+T('נושא','Topic')+'</label><select data-f="category">'+TIPCAT44.map(c=>'<option'+((x.category||'כללי')===c?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select>'+
    (st?'<div class="row44"><label class="chk44"><input type="checkbox" data-f="approved"'+(x.status!=='pending'?' checked':'')+'> ✔ '+T('מאושר ומוצג לכולם','Approved')+'</label><label class="chk44"><input type="checkbox" data-f="pinned"'+(x.pinned?' checked':'')+'> 📌 '+T('נעוץ','Pinned')+'</label></div>':'<p class="intro44">⏳ '+T('הטיפ יתפרסם אחרי בדיקה קצרה של המנהל.','Published after a quick check.')+'</p>')+
    '<div class="row44" style="margin-top:8px"><button class="b44 main" data-tsave44="1">💾 '+(x.id?T('שמירה','Save'):T('שליחה','Send'))+'</button><button class="b44" data-x44="1">'+T('ביטול','Cancel')+'</button></div></div>';}
function tipCard44(x){const st=staff44();if(H44.edit===x.id)return tipForm44(x);
  return '<div class="c44'+(x.pinned?' pin':'')+'" data-tid44="'+esc(x.id)+'"><p style="font-size:16px">'+(x.pinned?'📌 ':'')+'💡 '+esc(x.body)+'</p><div class="meta">'+(x.category?'<span class="st44">'+esc(x.category)+'</span> · ':'')+who44(x.author,x.badges)+' · '+agoText(x.created_at)+(x.status==='pending'?' · <b>⏳ '+T('ממתין לאישור','Waiting for approval')+'</b>':'')+'</div>'+
    '<div class="acts">'+(x.status==='approved'?'<button data-tlike44="'+esc(x.id)+'" class="'+(x.my_like?'on':'')+'" aria-pressed="'+(!!x.my_like)+'">👍 '+T('מועיל','Helpful')+' · <b>'+(+x.likes||0)+'</b></button>':'')+
    (st&&x.status==='pending'?'<button class="on" data-tok44="'+esc(x.id)+'">✔ '+T('אישור ופרסום','Approve')+'</button>':'')+
    (st?'<button data-tpin44="'+esc(x.id)+'">📌</button>':'')+((st||x.is_mine)?'<button data-tedit44="'+esc(x.id)+'">✏️ '+T('עריכה','Edit')+'</button><button class="bad" data-tdel44="'+esc(x.id)+'">🗑️</button>':'')+'</div></div>';}
function drawTips44(){const st=staff44();const pend=H44.tips.filter(x=>x.status==='pending'),ok=H44.tips.filter(x=>x.status!=='pending');const f=H44.filter;
  const cats=TIPCAT44.filter(c=>ok.some(x=>x.category===c));const shown=ok.filter(x=>f==='all'||!TIPCAT44.includes(f)||x.category===f);
  return '<p class="intro44">💰 '+T('טיפים קטנים שחוסכים הרבה — מהמשתמשים, לכולם. כל טיפ עובר אישור לפני שהוא מתפרסם.','Small tips that save a lot. Every tip is checked first.')+'</p>'+
    (H44.form&&!H44.edit?tipForm44():'<button class="b44 main" data-tnew44="1" style="width:100%">➕ '+T('שליחת טיפ','Send a tip')+'</button>')+
    (pend.length?'<h4 style="margin:12px 0 4px">⏳ '+(st?T('ממתינים לאישור שלך','Waiting for your approval'):T('הטיפים שלי שממתינים לאישור','My pending tips'))+' ('+pend.length+')</h4>'+pend.map(tipCard44).join(''):'')+
    (cats.length>1?'<div class="chips44">'+['all'].concat(cats).map(c=>'<button data-tf44f="'+esc(c)+'" class="'+((f===c||(c==='all'&&!TIPCAT44.includes(f)))?'on':'')+'">'+(c==='all'?T('הכל','All'):esc(c))+'</button>').join('')+'</div>':'')+
    (shown.map(tipCard44).join('')||'<div class="empty">'+T('עוד אין טיפים — שתפו את הראשון! 💰','No tips yet')+'</div>');}

/* ---------- 🔥 מבצעים שמצאתי ---------- */
function drawDeals44(){const st=staff44();const f=H44.dealF;
  const list=H44.deals.filter(x=>f==='all'||(f==='users'?!x.by_store:x.by_store));
  return '<p class="intro44">🔥 '+T('מבצעים שמשתמשים ראו בחנויות. ראיתם שהמבצע עדיין קיים? לחצו "✅ עדיין בתוקף". נגמר? "❌ כבר נגמר" — ככה כולם יודעים מה אמיתי.','Deals people found in stores. Confirm if still valid.')+'</p>'+
    '<button class="b44 main" data-dnew44="1" style="width:100%">📢 '+T('דיווח על מבצע שמצאתי','Report a deal I found')+'</button>'+
    '<div class="chips44">'+[['all',T('הכל','All')],['users','🙋 '+T('משתמשים מצאו','Found by users')],['store','🏪 '+T('מהחנויות','From stores')]].map(([k,l])=>'<button data-df44="'+k+'" class="'+(f===k?'on':'')+'">'+l+'</button>').join('')+'</div>'+
    (list.map(x=>{const doubt=x.gone>x.ok&&x.gone>=2;
      if(H44.edit===x.id)return '<div class="form44" data-df44id="'+esc(x.id)+'"><label>'+T('המבצע','The deal')+'</label><input data-f="title" maxlength="120" value="'+esc(x.title)+'"><label>'+T('פרטים','Details')+'</label><textarea data-f="body" maxlength="1000">'+esc(x.body||'')+'</textarea><div class="row44"><div><label>'+T('סניף / עיר','Branch')+'</label><input data-f="branch" maxlength="120" value="'+esc(x.branch||'')+'"></div><div><label>'+T('בתוקף עד','Valid until')+'</label><input data-f="ends" type="date" value="'+(x.ends_at?esc(String(x.ends_at).slice(0,10)):'')+'"></div></div><div class="row44" style="margin-top:8px"><button class="b44 main" data-dsave44="1">💾 '+T('שמירה','Save')+'</button><button class="b44" data-x44="1">'+T('ביטול','Cancel')+'</button></div></div>';
      return '<div class="c44'+(doubt?' dim':'')+'" data-did44="'+esc(x.id)+'"><h4><span>🔥 '+esc(x.title)+'</span><span class="st44">'+(x.by_store?'🏪 '+T('מהחנות','Store'):'🙋 '+T('משתמש מצא','User found'))+'</span></h4>'+
        '<div><b>'+esc(x.chain)+'</b>'+(x.branch?' · '+esc(x.branch):'')+(x.ends_at?' · '+T('בתוקף עד ','until ')+esc(new Date(x.ends_at).toLocaleDateString('he-IL')):'')+'</div>'+(x.body?'<p>'+esc(x.body)+'</p>':'')+
        '<div class="meta">'+who44(x.author,x.badges)+' · '+agoText(x.created_at)+'</div>'+
        (doubt?'<div class="warn44">⚠️ '+T('משתמשים דיווחו שהמבצע כנראה נגמר','People say this deal probably ended')+'</div>':x.ok?'<div class="ok44">✅ '+x.ok+' '+T('אישרו שעדיין בתוקף','confirmed still valid')+(x.last_ok?' · '+T('אחרון ','last ')+agoText(x.last_ok):'')+'</div>':'')+
        '<div class="acts">'+(x.is_mine?'<span class="meta">'+T('המבצע שדיווחת 💚','Your report 💚')+'</span>':'<button data-dvote44="'+esc(x.id)+'|1" class="'+(x.my_vote===1?'on':'')+'">✅ '+T('עדיין בתוקף','Still valid')+' · <b>'+x.ok+'</b></button><button data-dvote44="'+esc(x.id)+'|-1" class="'+(x.my_vote===-1?'on':'')+'">❌ '+T('כבר נגמר','Ended')+' · <b>'+x.gone+'</b></button>')+
        (x.has_image?'<button data-dimg44="'+esc(x.id)+'">📷 '+T('תמונה','Photo')+'</button>':'')+
        (st?'<button data-dedit44="'+esc(x.id)+'">✏️ '+T('עריכה','Edit')+'</button><button class="bad" data-ddel44="'+esc(x.id)+'">🗑️</button>':'')+'</div><div class="img44"></div></div>';}).join('')||'<div class="empty">'+T('עוד אין מבצעים מהזמן האחרון — ראיתם מבצע? דווחו! 🔥','No recent deals')+'</div>');}

/* ---------- 🎖️ שגרירים ותגים ---------- */
function drawAmb44(){const ad=admin44();const MED=['🥇','🥈','🥉'];const my=H44.myBadges||[];
  let h='<p class="intro44">🎖️ '+T('מי שמביא '+H44.ambMin+' חברים דרך הקישור האישי מקבל תג "שגריר" — והתג מופיע ליד השם בכל הלוח. יש גם תגים מיוחדים שהמנהל נותן למי שעוזר במיוחד.','Bring '+H44.ambMin+' friends with your personal link to become an ambassador.')+'</p>'+
    '<div class="c44" style="text-align:center">'+(my.length?T('התגים שלך: ','Your badges: ')+badges44(my):T('עוד אין לך תג — כל חבר שמצטרף מקרב אותך 💌','No badge yet'))+'<div class="acts" style="justify-content:center"><button class="on" data-inv44="1">💌 '+T('הקישור האישי שלי','My personal link')+'</button></div></div>';
  const rows=H44.amb;
  h+='<h4 style="margin:12px 0 4px">🏅 '+T('השגרירים והמזמינים המובילים','Ambassadors & top inviters')+'</h4>'+(rows.length?'<div class="c44">'+rows.map((r,i)=>'<div class="rk44'+(r.is_me?' me':'')+'"><span>'+(MED[i]||(i+1)+'.')+' '+who44(r.name,r.badges)+(r.is_me?' ('+T('את/ה','you')+')':'')+'</span><span class="meta">'+(r.joined?r.joined+' '+T('הצטרפו','joined'):'')+'</span></div>').join('')+'</div>':'<div class="empty">'+T('עוד אין שגרירים — אולי את/ה הראשון/ה? 💌','No ambassadors yet')+'</div>');
  if(!ad)return h;
  if(H44.users===null){H44.users=[];sb.rpc('admin_user_list').then(({data})=>{H44.users=data||[];const dl=$44('#u44list');if(dl)dl.innerHTML=H44.users.map(u=>'<option value="'+esc((u.name||'')+' <'+(u.email||'')+'>')+'">').join('');});}
  const ed=H44.badgeEdit||{};
  h+='<div class="form44"><h4 style="margin:0">🛠️ '+T('ניהול תגים (רק למנהל)','Badge admin')+'</h4>'+
    '<div class="row44"><div><label>'+T('כמה חברים צריך כדי לקבל אוטומטית תג שגריר','Friends needed for automatic ambassador')+'</label><input id="amb44min" type="number" min="1" max="999" value="'+H44.ambMin+'"></div><div style="flex:0 0 auto;align-self:flex-end"><button class="b44" data-ambmin44="1">💾 '+T('שמירה','Save')+'</button></div></div>'+
    '<h4 style="margin:12px 0 0">'+(ed.id||ed.user_id?'✏️ '+T('עריכת תג של ','Edit badge of ')+esc(ed.name||ed.email||''):'➕ '+T('הענקת תג למשתמש','Give a badge'))+'</h4>'+
    (ed.id||ed.user_id?'':'<label>'+T('משתמש (שם או מייל)','User (name or email)')+'</label><input id="bd44user" list="u44list" placeholder="'+T('מתחילים להקליד...','Start typing...')+'"><datalist id="u44list">'+(H44.users||[]).map(u=>'<option value="'+esc((u.name||'')+' <'+(u.email||'')+'>')+'">').join('')+'</datalist>')+
    '<div class="row44"><div><label>'+T('סוג','Type')+'</label><select id="bd44kind"'+(ed.id||ed.user_id?' disabled':'')+'><option value="amb"'+(ed.kind==='amb'?' selected':'')+'>🎖️ '+T('שגריר','Ambassador')+'</option><option value="custom"'+(ed.kind==='custom'||!ed.kind?' selected':'')+'>🏅 '+T('תג אחר','Other badge')+'</option></select></div>'+
    '<div style="flex:0 1 90px"><label>'+T('סמל','Emoji')+'</label><input id="bd44emoji" maxlength="8" value="'+esc(ed.emoji||'🏅')+'"></div><div><label>'+T('שם התג','Badge name')+'</label><input id="bd44label" maxlength="40" value="'+esc(ed.label||'')+'" placeholder="'+T('למשל: מדווח מצטיין','e.g. Top reporter')+'"></div></div>'+
    '<div class="chips44" data-noicon="1">'+['🎖️','🏅','⭐','🥇','💎','🏆','💚','🛒','👩‍🍳','📢'].map(e=>'<button data-emo44="'+e+'">'+e+'</button>').join('')+'</div>'+
    '<label>'+T('הערה פנימית (לא מוצגת)','Internal note')+'</label><input id="bd44note" maxlength="200" value="'+esc(ed.note||'')+'">'+
    '<label class="chk44"><input type="checkbox" id="bd44hidden"'+(ed.hidden?' checked':'')+'> 🚫 '+T('התג מוסתר (הורדת התג מהמשתמש)','Hidden (badge removed)')+'</label>'+
    '<div class="row44" style="margin-top:8px"><button class="b44 main" data-bdsave44="1">💾 '+T('שמירת התג','Save badge')+'</button>'+(ed.id||ed.user_id?'<button class="b44" data-bdx44="1">'+T('ביטול','Cancel')+'</button>':'')+'</div></div>'+
    '<h4 style="margin:12px 0 4px">📋 '+T('כל התגים','All badges')+' ('+H44.badges.length+')</h4>'+
    (H44.badges.map((b,i)=>'<div class="c44'+(b.hidden?' dim':'')+'"><b>'+esc(b.emoji)+' '+esc(b.label||(b.kind==='amb'?'שגריר':''))+'</b> — '+esc(b.name||'—')+' <span class="meta" dir="ltr">'+esc(b.email||'')+'</span>'+
      '<div class="meta">'+(b.auto?'🤖 '+T('אוטומטי (הביא '+b.joined+' חברים)','automatic'):b.kind==='amb'?'🎖️ '+T('שגריר — ניתן ידנית','ambassador — manual')+(b.joined?' · '+b.joined+' '+T('חברים','friends'):''):'🏅 '+T('תג מיוחד','custom'))+(b.hidden?' · 🚫 '+T('מוסתר','hidden'):'')+(b.note?' · 📝 '+esc(b.note):'')+'</div>'+
      '<div class="acts"><button data-bdedit44="'+i+'">✏️ '+T('עריכה','Edit')+'</button>'+(b.hidden?'<button data-bdhide44="'+i+'|0">👁️ '+T('החזרת התג','Restore')+'</button>':'<button data-bdhide44="'+i+'|1">🚫 '+T('הורדת התג','Remove')+'</button>')+(b.id?'<button class="bad" data-bddel44="'+i+'" title="'+(b.kind==='amb'?T('מחיקה — חוזר להיות אוטומטי לפי מספר החברים','Delete — back to automatic'):T('מחיקה','Delete'))+'">🗑️</button>':'')+'</div></div>').join('')||'<div class="empty">'+T('עוד אין תגים','No badges yet')+'</div>');
  return h;}

/* ---------- ❌ מחירים שסומנו "לא נכון" — לצוות ---------- */
function flagsHtml44(rows){if(!rows.length)return '<div class="empty">🎉 '+T('אין דיווחים על מחירים שגויים','No wrong-price reports')+'</div>';
  return rows.map(r=>{const sugs=[...new Set((r.reports||[]).map(x=>x.price).filter(p=>p!=null).map(Number))];
    return '<div class="pf44" data-pfid44="'+esc(r.id)+'"><b>'+esc(r.product)+'</b> · '+esc(r.chain)+(r.branch?' · '+esc(r.branch):'')+' — <b>'+fmtPrice(r.price,r.currency)+'</b> <span class="meta">(✅ '+(+r.confirms||0)+' / ❌ '+(+r.wrong||0)+' · '+T('דווח ע״י ','by ')+esc(r.by_name||'—')+' '+agoText(r.created_at)+')</span>'+
      (r.reports||[]).map(x=>'<div class="rep">❌ '+esc(x.name||T('משתמש/ת','User'))+(x.price!=null?' — '+T('המחיר הנכון: ','right price: ')+'<b>'+fmtPrice(+x.price,r.currency)+'</b>':' — '+T('לא כתב מחיר','no price given'))+(x.note?' · "'+esc(x.note)+'"':'')+' <span class="meta">'+agoText(x.at)+'</span></div>').join('')+
      '<div class="acts"><button data-pfx44="correct">✔ '+T('המחיר נכון','Price is right')+'</button>'+sugs.map(p=>'<button data-pfx44="update" data-pfp44="'+p+'">🔄 '+T('לעדכן ל-','Update to ')+fmtPrice(p,r.currency)+'</button>').join('')+
      '<input type="number" step="0.01" min="0" aria-label="'+T('מחיר אחר','Other price')+'" placeholder="'+T('מחיר אחר','Other')+'"><button data-pfx44="update">💾 '+T('עדכון','Update')+'</button><button class="bad" data-pfx44="delete" style="color:#b3261e">🗑️ '+T('מחיקת הדיווח','Delete')+'</button></div></div>';}).join('');}
async function flagAct44(btn,after){const box=btn.closest('[data-pfid44]');if(!box)return false;const id=box.dataset.pfid44,act=btn.dataset.pfx44;let p=null;
  if(act==='update'){p=btn.dataset.pfp44!=null?+btn.dataset.pfp44:parseFloat((box.querySelector('input[type=number]')||{}).value);if(!(p>0&&p<100000)){flash(T('⚠️ כתבו מחיר תקין','⚠️ Enter a valid price'));return true;}}
  if(act==='delete'&&!(await uiConfirm(T('למחוק את דיווח המחיר הזה?','Delete this price report?'))))return true;
  btn.disabled=true;const {data,error}=await sb.rpc('staff_price_fix',{p_id:id,p_action:act,p_price:p});btn.disabled=false;
  if(error||(data!=='ok'&&data!=='gone')){flash('⚠️ '+((error&&error.message)||data));return true;}
  flash(act==='correct'?'✔ '+T('סומן כנכון — הדיווחים נוקו','Marked correct'):act==='update'?'🔄 '+T('המחיר עודכן, והמדווחים קיבלו תודה','Price updated'):'🗑️ '+T('נמחק','Deleted'));
  box.remove();if(typeof after==='function')after();return true;}

/* ---------- לחיצות ---------- */
const row44=(arr,id)=>arr.find(x=>x.id===id);
const vals44=f=>{const o={};f.querySelectorAll('[data-f]').forEach(i=>{o[i.dataset.f]=i.type==='checkbox'?i.checked:i.value.trim();});return o;};
async function run44(q,msg){const {error}=await q;if(error){flash(errMsg44(error));return false;}if(msg)flash(msg);return true;}
async function click44(e){const t=e.target.closest('button');if(!t||!H44.box||!H44.box.contains(t))return;const d=t.dataset;
  if(d.t44){H44.tab=d.t44;H44.filter='all';H44.edit=null;H44.form=false;H44.badgeEdit=null;const b=H44.box.querySelector('.body44');if(b)b.innerHTML='<div class="empty">'+T('טוען...','Loading...')+'</div>';load44();return;}
  if(d.x44){H44.edit=null;H44.form=false;draw44();return;}
  /* 💡 הצעות */
  if(d.snew44){H44.form=true;H44.edit=null;draw44();const i=H44.box.querySelector('[data-sf44] [data-f=title]');if(i)i.focus();return;}
  if(d.sf44f){H44.filter=d.sf44f;draw44();return;}
  if(d.ssave44){const f=t.closest('[data-sf44]');const v=vals44(f);const id=f.dataset.sf44;
    if(v.title.length<2){flash(T('כתבו את הרעיון בכמה מילים','Write the idea'));return;}
    if(!staff44()&&[v.title,v.body].some(hasProfanity)){reportAbuse(v.title+' '+v.body,'suggest');flash('🙏');return;}
    const row={title:v.title.slice(0,120),body:(v.body||'').slice(0,2000)};
    if(staff44()){Object.assign(row,{status:v.status||'new',reply:(v.reply||'').slice(0,1000),pinned:!!v.pinned,hidden:!!v.hidden,extra_votes:Math.max(-100000,Math.min(100000,parseInt(v.extra_votes,10)||0))});}
    t.disabled=true;const okk=await run44(id?sb.from('suggestions').update(row).eq('id',id):sb.from('suggestions').insert(Object.assign({created_by:authUser.id},row)),id?'💾 '+T('נשמר','Saved'):'💡 '+T('תודה! ההצעה פורסמה בלוח','Thanks! Your idea is posted'));t.disabled=false;
    if(okk){H44.edit=null;H44.form=false;load44();}return;}
  if(d.svote44){const x=row44(H44.sugg,d.svote44);if(!x)return;t.disabled=true;const {data,error}=await sb.rpc('suggestion_vote',{p_id:x.id,p_on:!x.my_vote});t.disabled=false;
    if(error||data==null){flash(errMsg44(error||T('לא נמצא','Not found')));return;}x.my_vote=!x.my_vote;x.votes=data;draw44();if(x.my_vote)flash('🙋 '+T('נספר! נעדכן כשיהיה חדש','Counted!'));return;}
  if(d.sedit44){H44.edit=d.sedit44;H44.form=false;draw44();return;}
  if(d.spin44){const x=row44(H44.sugg,d.spin44);if(x&&await run44(sb.from('suggestions').update({pinned:!x.pinned}).eq('id',x.id)))load44();return;}
  if(d.shide44){const x=row44(H44.sugg,d.shide44);if(x&&await run44(sb.from('suggestions').update({hidden:!x.hidden}).eq('id',x.id),x.hidden?'👁️':'🙈'))load44();return;}
  if(d.sdel44){if(!(await uiConfirm(T('למחוק את ההצעה?','Delete this idea?'))))return;if(await run44(sb.from('suggestions').delete().eq('id',d.sdel44),'🗑️'))load44();return;}
  /* 💰 טיפים */
  if(d.tnew44){H44.form=true;H44.edit=null;draw44();const i=H44.box.querySelector('[data-tf44] [data-f=body]');if(i)i.focus();return;}
  if(d.tf44f){H44.filter=d.tf44f;draw44();return;}
  if(d.tsave44){const f=t.closest('[data-tf44]');const v=vals44(f);const id=f.dataset.tf44;
    if(v.body.length<5){flash(T('הטיפ קצר מדי','Too short'));return;}
    if(!staff44()&&hasProfanity(v.body)){reportAbuse(v.body,'tip');flash('🙏');return;}
    const row={body:v.body.slice(0,600),category:(v.category||'').slice(0,30)};if(staff44()){row.status=v.approved?'approved':'pending';row.pinned=!!v.pinned;}
    t.disabled=true;const okk=await run44(id?sb.from('saving_tips').update(row).eq('id',id):sb.from('saving_tips').insert(Object.assign({created_by:authUser.id},row)),staff44()?'💾 '+T('נשמר','Saved'):'💰 '+T('תודה! הטיפ נשלח לאישור ויתפרסם בקרוב 💚','Thanks! Sent for approval 💚'));t.disabled=false;
    if(okk){H44.edit=null;H44.form=false;load44();}return;}
  if(d.tlike44){const x=row44(H44.tips,d.tlike44);if(!x)return;t.disabled=true;const {data,error}=await sb.rpc('tip_like',{p_id:x.id,p_on:!x.my_like});t.disabled=false;if(error||data==null){flash(errMsg44(error||'?'));return;}x.my_like=!x.my_like;x.likes=data;draw44();return;}
  if(d.tok44){t.disabled=true;const {error}=await sb.rpc('staff_decide',{p_kind:'tip',p_ref:d.tok44,p_ok:true});if(error){t.disabled=false;flash(errMsg44(error));return;}flash('✔ '+T('הטיפ פורסם — ומי ששלח קיבל הודעה','Published'));load44();return;}
  if(d.tpin44){const x=row44(H44.tips,d.tpin44);if(x&&await run44(sb.from('saving_tips').update({pinned:!x.pinned}).eq('id',x.id)))load44();return;}
  if(d.tedit44){H44.edit=d.tedit44;H44.form=false;draw44();return;}
  if(d.tdel44){if(!(await uiConfirm(T('למחוק את הטיפ?','Delete this tip?'))))return;if(await run44(sb.from('saving_tips').delete().eq('id',d.tdel44),'🗑️'))load44();return;}
  /* 🔥 מבצעים */
  if(d.dnew44){if(H44.bo){flash(T('דיווח על מבצע נעשה מהאתר (תפריט ⚙️ ← 📢 דיווח על מבצע)','Report from the site'));return;}openDealReport();return;}
  if(d.df44){H44.dealF=d.df44;draw44();return;}
  if(d.dvote44){const [id,v]=d.dvote44.split('|');const x=row44(H44.deals,id);if(!x)return;const nv=x.my_vote===+v?0:+v;t.disabled=true;
    const {data,error}=await sb.rpc('deal_vote',{p_id:id,p_vote:nv});t.disabled=false;if(error||!data||data.error){flash(errMsg44(error||T('המבצע כבר לא קיים','Deal is gone')));return;}
    if(data.own){flash(T('זה המבצע שדיווחת 🙂','Your own report 🙂'));return;}x.ok=+data.ok;x.gone=+data.gone;x.my_vote=+data.mine;if(nv>0)x.last_ok=new Date().toISOString();draw44();
    flash(nv>0?'✅ '+T('תודה! עכשיו כולם יודעים שהמבצע עדיין קיים','Thanks!'):nv<0?'❌ '+T('תודה על העדכון','Thanks for the update'):'↩️');return;}
  if(d.dimg44){const c=t.closest('[data-did44]');const box=c&&c.querySelector('.img44');if(!box)return;if(box.innerHTML){box.innerHTML='';return;}
    const {data}=await sb.from('store_posts').select('image').eq('id',d.dimg44).maybeSingle();const src=data&&safeImg(data.image);box.innerHTML=src?'<img src="'+esc(src)+'" alt="'+T('תמונת המבצע','Deal photo')+'" style="max-width:100%;border-radius:12px;margin-top:8px">':'';return;}
  if(d.dedit44){H44.edit=d.dedit44;draw44();return;}
  if(d.dsave44){const f=t.closest('[data-df44id]');const v=vals44(f);if(!v.title){flash(T('צריך את המבצע','Deal needed'));return;}
    if(await run44(sb.from('store_posts').update({title:v.title.slice(0,120),body:(v.body||'').slice(0,1000),branch:(v.branch||'').slice(0,120),ends_at:v.ends?new Date(v.ends+'T23:59:00').toISOString():null}).eq('id',f.dataset.df44id),'💾 '+T('נשמר','Saved'))){H44.edit=null;load44();}return;}
  if(d.ddel44){if(!(await uiConfirm(T('למחוק את המבצע?','Delete this deal?'))))return;if(await run44(sb.from('store_posts').delete().eq('id',d.ddel44),'🗑️'))load44();return;}
  /* 🎖️ שגרירים ותגים */
  if(d.inv44){if(H44.bo){flash(T('הקישור האישי נמצא באתר ← 💌 הזמנת חברים','Open it on the site'));return;}openInvite26();return;}
  if(d.ambmin44){const n=parseInt(($44('#amb44min')||{}).value,10);if(!(n>=1&&n<=999)){flash(T('מספר בין 1 ל-999','1–999'));return;}
    const {data:cur}=await sb.from('site_config').select('value').eq('key','community').maybeSingle();
    if(await run44(sb.from('site_config').upsert({key:'community',value:Object.assign({},(cur&&cur.value)||{},{amb_min:n}),updated_at:new Date().toISOString()}),'💾 '+T('נשמר — מתעדכן לכולם','Saved')))load44();return;}
  if(d.emo44){const i=$44('#bd44emoji');if(i)i.value=d.emo44;if(d.emo44==='🎖️'){const k=$44('#bd44kind');if(k&&!k.disabled)k.value='amb';}return;}
  if(d.bdedit44){const b=H44.badges[+d.bdedit44];if(!b)return;H44.badgeEdit=Object.assign({},b);draw44();const i=$44('#bd44label');if(i){i.scrollIntoView({behavior:'smooth',block:'center'});i.focus();}return;}
  if(d.bdx44){H44.badgeEdit=null;draw44();return;}
  if(d.bdsave44||d.bdhide44){let ed=H44.badgeEdit||{},hidden;
    if(d.bdhide44){const [i,h]=d.bdhide44.split('|');ed=H44.badges[+i];if(!ed)return;hidden=h==='1';}
    let uid=ed.user_id||null;
    if(!d.bdhide44&&!ed.id&&!uid){const raw=($44('#bd44user')||{}).value||'';const m=raw.match(/<([^>]+)>\s*$/);const q=(m?m[1]:raw).trim().toLowerCase();
      const u=(H44.users||[]).find(x=>(x.email||'').toLowerCase()===q)||(H44.users||[]).find(x=>(x.name||'').trim().toLowerCase()===q);if(!u){flash(T('בחרו משתמש מהרשימה','Pick a user from the list'));return;}uid=u.id;}
    const kind=d.bdhide44?ed.kind:(ed.kind||($44('#bd44kind')||{}).value||'custom');
    const args=d.bdhide44?{p_id:ed.id||null,p_user:uid,p_kind:kind,p_emoji:ed.emoji,p_label:ed.label,p_note:ed.note||'',p_hidden:hidden}
      :{p_id:ed.id||null,p_user:uid,p_kind:kind,p_emoji:($44('#bd44emoji')||{}).value||'',p_label:($44('#bd44label')||{}).value||'',p_note:($44('#bd44note')||{}).value||'',p_hidden:!!($44('#bd44hidden')||{}).checked};
    if(kind==='amb'&&!args.p_label)args.p_label='שגריר';
    t.disabled=true;const {data,error}=await sb.rpc('admin_badge_save',args);t.disabled=false;
    if(error||data!=='ok'){flash('⚠️ '+((error&&error.message)||({need_label:T('צריך שם לתג','Badge needs a name'),bad:T('בלי התווים < > " &','No < > " &'),no_user:T('המשתמש לא נמצא','User not found')}[data])||data));return;}
    flash(d.bdhide44?(hidden?'🚫 '+T('התג הורד','Badge removed'):'👁️ '+T('התג הוחזר','Badge restored')):'🎖️ '+T('התג נשמר — מופיע ליד השם','Badge saved'));H44.badgeEdit=null;load44();return;}
  if(d.bddel44){const b=H44.badges[+d.bddel44];if(!b||!b.id)return;if(!(await uiConfirm(b.kind==='amb'?T('למחוק? תג השגריר יחזור להיות אוטומטי לפי מספר החברים שהביא.','Delete? Ambassador goes back to automatic.'):T('למחוק את התג?','Delete this badge?'))))return;
    if(await run44(sb.from('user_badges').delete().eq('id',b.id),'🗑️'))load44();return;}
  /* ❌ מחירים שגויים */
  if(d.pfx44){await flagAct44(t);return;}
}
function change44(e){const s=e.target.closest('[data-sst44]');if(!s)return;const x=row44(H44.sugg,s.dataset.sst44);if(!x)return;
  run44(sb.from('suggestions').update({status:s.value}).eq('id',x.id),stPill44(s.value).replace(/<[^>]+>/g,'')+' — '+T('מי שהציע ומי שרצה יקבלו עדכון','followers will be notified')).then(okk=>{if(okk)load44();else s.value=x.status;});}

/* ---------- ❌ "לא נכון" על מחיר: מה המחיר הנכון? ---------- */
document.addEventListener('click',e=>{const vb=e.target.closest('[data-vote$="|-1"]');if(!vb||!sb||!authUser)return;const id=vb.dataset.vote.split('|')[0];
  const row=vb.closest('[data-pid]');const chain=row&&row.querySelector('.pr-chain'),amt=row&&row.querySelector('.pr-amt');const grp=row&&row.closest('.grp');const h3=grp&&grp.querySelector('h3');
  const prod=h3?h3.textContent.replace(/^🏷️\s*/,'').split(' — ')[0]:'';
  setTimeout(()=>{const b=openSheet('❌ '+T('מה לא נכון במחיר?','What is wrong with the price?'),
    '<div class="hub44"><p class="intro44">'+T('תודה! כדי שנוכל לתקן מהר — כתבו מה המחיר הנכון (לא חובה).','Thanks! Tell us the right price (optional).')+'</p>'+
    '<div class="c44"><b>'+esc(prod)+'</b>'+(chain?' · '+esc(chain.textContent):'')+(amt?' — '+T('מופיע: ','shown: ')+'<b>'+esc(amt.textContent)+'</b>':'')+'</div>'+
    '<label class="il" for="wp44p">'+T('המחיר הנכון','The right price')+'</label><input id="wp44p" type="number" step="0.01" min="0" inputmode="decimal">'+
    '<label class="il" for="wp44n">'+T('הערה (למשל: המבצע נגמר, זה מחיר ליחידה)','Note (optional)')+'</label><input id="wp44n" maxlength="300">'+
    '<div class="row44" style="margin-top:10px"><button class="b44 main" id="wp44go">📤 '+T('שליחה למנהל','Send')+'</button><button class="b44" id="wp44x">'+T('בלי פרטים','Skip')+'</button></div></div>');
    b.onchange=null;b.oninput=null;
    b.onclick=async ev=>{if(ev.target.closest('#wp44x')){closeSheet();return;}if(!ev.target.closest('#wp44go'))return;
      const ps=$44('#wp44p').value.trim(),p=ps?parseFloat(ps):null,n=$44('#wp44n').value.trim();if(ps&&!(p>0&&p<100000)){flash(T('⚠️ מחיר לא תקין','⚠️ Invalid price'));return;}
      if(n&&hasProfanity(n)){reportAbuse(n,'price');flash('🙏');return;}
      const {data,error}=await sb.rpc('price_wrong_report',{p_id:id,p_price:p,p_note:n});
      if(error||!data||data.error){flash(errMsg44(error||(data&&data.error)||'?'));return;}closeSheet();flash('❌ '+T('תודה! המנהל יבדוק ויתקן 💚','Thanks! We will fix it 💚'));};
    const i=$44('#wp44p');if(i)i.focus();},450);});

/* מנהל / צוות — ליד מחיר שסומן "לא נכון" באתר: 🛠️ טיפול ישר מכאן */
async function openFlagFix44(id){const b=openSheet('🛠️ '+T('טיפול במחיר שדווח כלא נכון','Fix a reported price'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');
  const {data,error}=await sb.rpc('staff_flagged_prices');if(error){b.innerHTML=sqlErr44(error);return;}
  const r=(data||[]).filter(x=>x.id===id);b.innerHTML='<div class="hub44">'+(r.length?flagsHtml44(r):'<div class="empty">✔ '+T('אין דיווחים פתוחים על המחיר הזה','No open reports')+'</div>')+'</div>';
  b.onchange=null;b.oninput=null;b.onclick=async e=>{const t=e.target.closest('[data-pfx44]');if(!t)return;await flagAct44(t,()=>{closeSheet();if(typeof fetchPrices==='function'&&typeof priceQuery!=='undefined'&&priceQuery){fetchPrices(priceQuery).then(rows=>{priceRows=rows;renderPriceResults();});}});};}
try{const _rpr44=renderPriceResults;renderPriceResults=function(){const r=_rpr44.apply(this,arguments);try{if(staff44())document.querySelectorAll('[data-vote$="|-1"]').forEach(vb=>{const n=+((vb.querySelector('b')||{}).textContent||0);const row=vb.closest('[data-pid]');
    if(n>0&&row&&!row.querySelector('[data-pfix44]'))vb.parentNode.insertAdjacentHTML('afterend','<button class="pr-act" data-pfix44="'+esc(row.dataset.pid)+'" title="'+T('טיפול במחיר (צוות)','Fix (staff)')+'">🛠️ '+T('טיפול','Fix')+'</button>');});}catch(e){}return r;};}catch(e){}
document.addEventListener('click',e=>{const f=e.target.closest('[data-pfix44]');if(f){e.stopPropagation();openFlagFix44(f.dataset.pfix44);}},true);

/* ---------- תפריט ⚙️, יאמי, וקישורים מהתראות (#community) ---------- */
add26('miComm44','🤝','קהילה — הצעות, טיפים ומבצעים','Community','miInv26',()=>openCommunity44());
yamiStep(async raw=>{const t=String(raw||'').trim().replace(/[?!.]+$/,'');
  if(/^(לוח (ה)?הצעות|יש לי (הצעה|רעיון)( לאתר)?|הצעה לאתר|רעיון לאתר|הצעות לשיפור)$/.test(t)){openCommunity44('sugg');botSay('💡 '+T('פתחתי את לוח ההצעות — אפשר להציע ולהצביע','Opened the ideas board'));return true;}
  if(/^(טיפ(ים)? (ל|של )?חיסכון|יש לי טיפ|טיפים|לשתף טיפ)$/.test(t)){openCommunity44('tips');botSay('💰 '+T('פתחתי את הטיפים לחיסכון','Opened saving tips'));return true;}
  if(/^(מבצע(ים)? שמצאתי|מבצעים שמשתמשים מצאו|מבצעים מהקהילה)$/.test(t)){openCommunity44('deals');botSay('🔥');return true;}
  if(/^(שגרירים|תג שגריר|השגרירים|התגים שלי)$/.test(t)){openCommunity44('amb');botSay('🎖️');return true;}
  if(/^(קהילה|הקהילה)$/.test(t)){openCommunity44();botSay('🤝');return true;}
  return false;});
try{const _rh44=routeHash;routeHash=function(){const h=location.hash||'';const m=h.match(/^#community(?:-(sugg|tips|deals|amb))?$/);if(m){history.replaceState(null,'',location.pathname);setTimeout(()=>openCommunity44(m[1]),500);return;}return _rh44.apply(this,arguments);};
  if(/^#community/.test(location.hash))setTimeout(()=>routeHash(),2500);}catch(e){}
/* באזור האישי: התגים שלי (במקום "3 חברים = שגריר" הקבוע) */
try{const _rm44=renderMe;renderMe=function(){const r=_rm44.apply(this,arguments);try{const bd=document.querySelector('#me26b');if(bd&&sb&&authUser&&!bd.dataset.b44){bd.dataset.b44='1';sb.rpc('my_badges').then(({data,error})=>{if(!error&&Array.isArray(data))bd.innerHTML=badges44(data);});}}catch(e){}return r;};}catch(e){}

/* ---------- בק אופיס: 🤝 קהילה (אותו לוח, עם כל העריכות) + ❌ מחירים שגויים בראש לשונית המחירים ---------- */
try{const nav=document.querySelector('#boNav');if(nav&&!nav.querySelector('[data-s="community"]')){const b=document.createElement('button');b.dataset.s='community';b.textContent='🤝 קהילה';const after=nav.querySelector('[data-s="reviews"]');if(after)after.after(b);else nav.appendChild(b);}
  window.boView&&window.boView('community',async function(){const m=document.querySelector('#boMain');m.onclick=null;H44.bo=true;
    m.innerHTML='<div class="card"><h2>🤝 קהילה</h2><p class="muted">לוח ההצעות, הטיפים לחיסכון, המבצעים שמשתמשים מצאו, השגרירים והתגים, ודיווחי "מחיר שגוי" — הכל כאן, וגם באתר עצמו (תפריט ⚙️ ← 🤝 קהילה). משנים סטטוס, עורכים, מאשרים ומוחקים ישר מהלוח.</p></div><div class="card" id="bo44"></div>';
    mount44(m.querySelector('#bo44'),'sugg');});
  window.boAfter&&window.boAfter('prices',async main=>{const {data,error}=await sb.rpc('staff_flagged_prices');if(error||!data||!data.length)return;
    main.insertAdjacentHTML('afterbegin','<div class="card hub44" id="bo44flags" style="border-color:#b3261e"><h2>❌ מחירים שמשתמשים סימנו "לא נכון" ('+data.length+')</h2><p class="muted">מה שהמדווחים כתבו שהוא המחיר הנכון. ✔ המחיר נכון — מנקה את הדיווחים · 🔄 לעדכן — מתקן ומודיע למדווחים · 🗑️ — מוחק את הדיווח.</p>'+flagsHtml44(data)+'</div>');
    const c=main.querySelector('#bo44flags');c.addEventListener('click',async e=>{const t=e.target.closest('[data-pfx44]');if(!t)return;e.stopPropagation();await flagAct44(t,()=>{const h=c.querySelector('h2');const n=c.querySelectorAll('[data-pfid44]').length;if(h)h.textContent='❌ מחירים שמשתמשים סימנו "לא נכון" ('+n+')';if(!n)c.remove();});},true);});
}catch(e){console.warn('bo community',e);}
})();
