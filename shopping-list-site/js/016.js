
/* ================= בק אופיס (רק למנהל) — נפתח מתוך האתר ================= */
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>(s||'').replace(/['’`׳"]/g,'').replace(/\s+/g,' ').trim();
const fmt=d=>d?new Date(d).toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'}):'';
const online=u=>Date.now()-new Date(u.last_seen).getTime()<5*60*1000;
let me=null;
async function ok(q,msg){const {error}=await q;if(error){flash('⚠️ '+error.message);return false;}if(msg)flash(msg);return true;}
const MOD_TABS=['mfa','dash','bot','chains','prices','reporters','posts','torah','reviews','products','community'];
const allowed=s=>s==='mfa'||(isAdmin()||MOD_TABS.includes(s)||(s==='guests'&&permOk('visitors')))&&tabPermOk(s)&&(s!=='guests'||permOk('visitors'));
window.openBO=function(sec){
  if(!sb||!isStaff()){flash('⛔ הבק אופיס פתוח רק לצוות האתר');return;}
  me=authUser;document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open'));closeAdPop();
  document.querySelectorAll('#boNav button').forEach(b=>b.hidden=!allowed(b.dataset.s));
  const roleName={owner:'בעלים',admin:'מנהל',moderator:'צוות פיקוח'}[isOwner()?'owner':myRole]||'';
  $('#bo').classList.remove('hidden');$('#boWho').textContent=me.email+(roleName?' · '+roleName:'');show(sec&&VIEWS[sec]&&allowed(sec)?sec:(allowed(cur)?cur:'dash'));
  if(location.hash!=='#admin')history.replaceState(null,'','#admin');
};
function closeBO(){$('#bo').classList.add('hidden');if(location.hash.startsWith('#admin'))history.replaceState(null,'',location.pathname);loadPublicData();}
$('#boClose').onclick=closeBO;
/* ---------- ניווט ---------- */
let cur='dash';
$('#boNav').onclick=e=>{const b=e.target.closest('button');if(b)show(b.dataset.s);};
function show(s){if(!allowed(s))s='dash';cur=s;document.querySelectorAll('#boNav button').forEach(b=>b.classList.toggle('on',b.dataset.s===s));const bm=$('#boMain');bm.oninput=null;bm.onchange=null;bm.innerHTML='<div class="card muted">טוען...</div>';VIEWS[s]();}
async function cfg(key){const {data}=await sb.from('site_config').select('value').eq('key',key).maybeSingle();return (data&&data.value)||{};}
async function setCfg(key,value,msg){return ok(sb.from('site_config').upsert({key,value,updated_at:new Date().toISOString()}),msg||'✔️ נשמר — מתעדכן אצל כל המשתמשים');}

/* "נראה לאחרונה" במילים: לפני 3 דקות / לפני שעתיים / אתמול */
function seenAgo(d){if(!d)return '';const m=Math.floor((Date.now()-new Date(d).getTime())/60000);if(m<2)return '🟢 עכשיו';if(m<60)return 'לפני '+m+' דקות';const h=Math.floor(m/60);if(h<24)return h===1?'לפני שעה':h===2?'לפני שעתיים':'לפני '+h+' שעות';const dd=Math.floor(h/24);return dd===1?'אתמול':dd===2?'שלשום':'לפני '+dd+' ימים';}
const VIEWS={
/* ---------- סקירה ---------- */
async dash(){
  const since=new Date(Date.now()-86400000).toISOString();
  const cnt=async(t,f)=>{let q=sb.from(t).select(COLS23[{prices:'prices',divrei_torah:'torah',site_reviews:'reviews',store_recs:'recs',store_posts:'posts',bot_knowledge:'kb'}[t]]?'id':'*',{count:'exact',head:true});if(f)q=f(q);const {count}=await q;return count||0;};
  const adm=isAdmin();const zero=async()=>0;
  const [pch,pbr,ppr,ppo,pdt,prv,pfl,pms]=await Promise.all([cnt('chains',q=>q.eq('status','pending')),cnt('branches',q=>q.eq('status','pending')),cnt('prices',q=>q.eq('status','pending')),cnt('store_posts',q=>q.eq('status','pending')),cnt('divrei_torah',q=>q.eq('status','pending')),cnt('site_reviews',q=>q.eq('status','pending')),cnt('prices',q=>q.gt('wrong',0)),adm?cnt('store_messages',q=>q.eq('is_read',false)):zero()]);
  const [users,on,kp,fb,pr]=await Promise.all([adm?cnt('profiles'):zero(),adm?cnt('profiles',q=>q.gt('last_seen',new Date(Date.now()-300000).toISOString())):zero(),cnt('bot_knowledge',q=>q.eq('status','pending')),adm?cnt('feedback',q=>q.eq('is_read',false)):zero(),cnt('prices',q=>q.gt('created_at',since))]);
  const tiles=[[users,'משתמשים רשומים','users'],[on,'מחוברים עכשיו 🟢','users'],[kp,'לימודי בוט לאישור','bot'],[fb,'הערות שלא נקראו','feedback'],[pr,'דיווחי מחיר ב-24 שעות','prices'],[pch+pbr,'חנויות/סניפים לאישור','chains'],[ppr,'מחירים מסופרים לאישור','prices'],[ppo,'מבצעי חנויות לאישור','posts'],[pdt,'דברי תורה לאישור','torah'],[prv,'חוות דעת לאישור ⭐','reviews'],[pfl,'מחירים שדווחו כ"לא נכון" ❌','prices'],[pms,'פניות לחנויות שלא נקראו 📨','messages']].filter(t=>allowed(t[2]));
  $('#boMain').innerHTML='<div class="stats">'+tiles.map(([n,l,s])=>'<div class="stat" style="cursor:pointer" data-go="'+s+'"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('')+'</div>'+
  '<div class="card" style="margin-top:14px"><h2>👋 שלום!</h2><p class="muted">מכאן אפשר לשנות את האתר בלי לגעת בקוד: לשלוט בבוט ובבינה המלאכותית, לעדכן סניפים, להחליף טקסטים וצבעים, ולראות מי הצטרף.</p></div>';
  $('#boMain').onclick=e=>{const g=e.target.closest('[data-go]');if(g)show(g.dataset.go);};
},
/* ---------- משתמשים: עריכה, אישור מייל, קישור לקוד חדש, מחיקה ---------- */
async users(){
  const res=await sb.rpc('admin_user_list');let users,full=!res.error;
  if(full)users=res.data||[];
  else{const {data}=await sb.from('profiles').select('id,name,email,created_at,last_seen').order('created_at',{ascending:false}).limit(5000);users=(data||[]).map(u=>Object.assign({role:'',confirmed:true},u));}
  /* 📍 העיר של כל משתמש (מהשאלה "באיזו עיר אתם גרים?") */
  const cr=await sb.rpc('admin_user_cities');const cityOk=!cr.error;const cityOf={};(cr.data||[]).forEach(r=>{cityOf[r.user_id]=r.city||'';});
  users.forEach(u=>{u.city=cityOf[u.id]||'';});
  /* 📣 מאיפה כל משתמש הגיע בפעם הראשונה */
  const srcOf={};try{const sr=await sb.rpc('admin_user_sources');(sr.data||[]).forEach(r=>{srcOf[r.user_id]=r.src||'';});}catch(e){}
  const srcTxt=s=>s?(typeof window.srcName41==='function'?window.srcName41(s):s):'';users.forEach(u=>{u.src=srcTxt(srcOf[u.id]);});
  const cityCnt={};users.forEach(u=>{const c=u.city||'(עוד לא בחרו)';cityCnt[c]=(cityCnt[c]||0)+1;});
  const cityRows=Object.entries(cityCnt).sort((a,b)=>b[1]-a[1]),cityMax=Math.max(1,...cityRows.map(r=>r[1]));
  const roleL={owner:'👑 בעלים',admin:'🛠️ מנהל',moderator:'👮 פיקוח'};
  const draw=q=>{q=(q||'').toLowerCase();const list=users.filter(u=>!q||(u.name+' '+u.email+' '+u.city+' '+(u.src||'')).toLowerCase().includes(q));
    $('#utb').innerHTML=list.map(u=>'<tr data-uid="'+esc(u.id)+'" data-mail="'+esc(u.email)+'"><td>'+(online(u)?'🟢':'⚪')+'</td><td><input data-f="name" value="'+esc(u.name)+'" maxlength="40" style="min-width:110px"></td><td dir="ltr" style="text-align:right">'+esc(u.email)+(u.provider&&u.provider!=='email'?' <span class="pill">'+esc(u.provider)+'</span>':'')+'</td><td>'+(u.city?esc(u.city):'<span class="muted">—</span>')+'</td><td>'+(u.src?esc(u.src):'<span class="muted">—</span>')+'</td><td>'+(roleL[u.role]||'')+'</td><td>'+(u.confirmed?'✔️':'<span class="pill">⏳ לא אושר</span>')+'</td><td>'+fmt(u.created_at)+'</td><td>'+fmt(u.last_seen)+'<br><small class="muted">'+seenAgo(u.last_seen)+'</small></td>'+
      '<td style="white-space:nowrap"><button class="btn sm" data-ua="save" title="שמירת השם">💾</button> '+(full&&!u.confirmed?'<button class="btn sm sec" data-ua="confirm" title="אישור המייל ידנית">✔️ אישור</button> ':'')+'<button class="btn sm sec" data-ua="reset" title="שליחת קישור לבחירת קוד חדש למייל של המשתמש">🔑</button> '+(u.role==='owner'||u.id===me.id?'':'<button class="btn sm bad" data-ua="del" title="מחיקת המשתמש">🗑️</button>')+'</td></tr>').join('');};
  $('#boMain').innerHTML='<div class="card"><h2>👥 המשתמשים שהצטרפו ('+users.length+') · מחוברים עכשיו: '+users.filter(online).length+'</h2>'+
    (full?'':'<p class="muted">⚠️ כדי לראות תפקידים, אישורי מייל ולמחוק משתמשים — צריך להריץ שוב את קוד ה-SQL (⚙️ הגדרה ראשונית).</p>')+
    '<p class="muted">✏️ משנים שם ולוחצים 💾 · 🔑 שולח למשתמש מייל עם קישור לבחירת קוד כניסה חדש · ✔️ מאשר מייל שלא הגיע · 🗑️ מוחק את המשתמש (את הבעלים אי אפשר למחוק).</p>'+
    '<div class="row" style="margin-bottom:10px"><input id="uq" placeholder="חיפוש לפי שם, מייל, עיר או מקור"><button class="btn sec" id="ucsv">⬇️ ייצוא לאקסל (CSV)</button></div><div class="tw"><table><thead><tr><th></th><th>שם</th><th>מייל</th><th>עיר</th><th>הגיע מ</th><th>תפקיד</th><th>מייל אושר</th><th>הצטרף</th><th>נראה לאחרונה</th><th></th></tr></thead><tbody id="utb"></tbody></table></div></div>';
  $('#boMain').insertAdjacentHTML('afterbegin','<div class="card"><h2>📍 משתמשים לפי עיר</h2>'+
    (cityOk?'<p class="muted">לחיצה על עיר מסננת את הטבלה למטה.</p>'+cityRows.map(([c,n])=>'<button class="cityrow" data-city="'+esc(c)+'"><span>'+esc(c)+'</span><b>'+n+'</b><i style="width:'+Math.round(n/cityMax*100)+'%"></i></button>').join('')
      :'<p class="muted">⚠️ כדי לראות ערים — צריך להריץ שוב את קוד ה-SQL (⚙️ הגדרה ראשונית).</p>')+'</div>');
  document.querySelectorAll('#boMain .cityrow').forEach(b=>b.onclick=()=>{const c=b.dataset.city==='(עוד לא בחרו)'?'':b.dataset.city;
    if(!c){const list=users.filter(u=>!u.city);$('#uq').value='';draw('');document.querySelectorAll('#utb tr').forEach(tr=>{tr.hidden=!list.some(u=>u.id===tr.dataset.uid);});}else{$('#uq').value=c;draw(c);}
    $('#uq').scrollIntoView({behavior:'smooth',block:'center'});});
  draw('');$('#uq').oninput=e=>draw(e.target.value);
  $('#ucsv').onclick=()=>{const csv='﻿שם,מייל,עיר,הגיע מ,תפקיד,מייל אושר,הצטרף,נראה לאחרונה\n'+users.map(u=>[u.name,u.email,u.city,u.src||'',roleL[u.role]||'',u.confirmed?'כן':'לא',fmt(u.created_at),fmt(u.last_seen)].map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='users.csv';a.click();};
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-ua]');if(!b)return;const tr=b.closest('tr');const id=tr.dataset.uid,mail=tr.dataset.mail;const u=users.find(x=>x.id===id)||{};
    if(b.dataset.ua==='save'){const n=tr.querySelector('[data-f=name]').value.trim().slice(0,40);if(!n){flash('צריך שם');return;}if(await ok(sb.from('profiles').update({name:n}).eq('id',id),'💾 השם עודכן'))u.name=n;}
    if(b.dataset.ua==='confirm'){const {data,error}=await sb.rpc('admin_confirm_user',{p_user:id});if(error||data!=='ok'){flash('⚠️ '+((error&&error.message)||({owner:'את מייל הבעלים אפשר לאשר רק מהמייל עצמו',forbidden:'אין הרשאה'}[data])||data));return;}flash('✔️ המייל אושר — המשתמש יכול להיכנס');u.confirmed=true;draw($('#uq').value);}
    if(b.dataset.ua==='reset'){if(!mail){flash('אין מייל');return;}if(!(await uiConfirm('לשלוח ל-'+mail+' מייל עם קישור לבחירת קוד כניסה חדש?')))return;const r=await guard('reset',{email:mail,redirect:location.origin+location.pathname});flash(r.unavailable?'⚠️ השירות לא זמין כרגע':r.error?'⚠️ '+String(r.error):'📧 נשלח קישור ל-'+mail);}
    if(b.dataset.ua==='del'){if(!(await uiConfirm('למחוק את המשתמש '+(u.name||'')+' ('+mail+') לצמיתות?\nיימחקו: החשבון, הרשימות וההרשאות שלו. מחירים ומתכונים שפרסם יישארו — בלי השם.')))return;
      if((await uiPrompt('כדי לאשר מחיקה, כתבו: מחק'))!=='מחק'){flash('המחיקה בוטלה');return;}
      const {data,error}=await sb.rpc('admin_delete_user',{p_user:id});
      if(error||data!=='deleted'){flash('⚠️ '+((error&&error.message)||({owner:'את הבעלים אי אפשר למחוק',self:'את עצמך מוחקים מהתפריט "מחיקת החשבון שלי"',forbidden:'רק הבעלים יכול למחוק מנהל',not_found:'המשתמש לא נמצא'}[data])||data));return;}
      users=users.filter(x=>x.id!==id);tr.remove();flash('🗑️ המשתמש נמחק');}
  };
},
/* ---------- הבוט וה-AI ---------- */
async bot(){
  const adm=isAdmin();
  const [ai,bc,kbRes,usage]=await Promise.all([adm?cfg('ai'):{},adm?cfg('bot'):{},sb.from('bot_knowledge').select(COLS23.kb).order('created_at',{ascending:false}).limit(2000),adm?sb.from('ai_usage').select('count').eq('day',new Date().toISOString().slice(0,10)):{data:[]}]);
  const kb=kbRes.data||[];const usedToday=(usage.data||[]).reduce((a,r)=>a+r.count,0);
  const kItem=k=>'<div class="item" data-id="'+k.id+'"><div class="row"><input data-f="q" value="'+esc(k.question)+'"><input data-f="a" value="'+esc(k.answer)+'"></div><div class="row" style="margin-top:6px;align-items:center"><span class="muted">'+crSlot('kb',k.id)+' · <span class="pill">'+({pending:'ממתין',approved:'פעיל לכולם',rejected:'נדחה'}[k.status])+'</span></span><button class="btn sm" data-act="save">💾</button>'+(k.status!=='approved'?'<button class="btn sm" data-act="approve">✅ אישור לכולם</button>':'')+(k.status==='pending'?'<button class="btn sm sec" data-act="reject">דחייה</button>':'')+'<button class="btn sm bad" data-act="del">🗑️</button></div></div>';
  const settingsHtml=!adm?'':
  '<div class="card"><h2>🧠 בינה מלאכותית</h2><p class="muted">כשהבוט לא יודע לענות — הוא שואל את הבינה המלאכותית, שיכולה לחפש באינטרנט מתכונים ותשובות, ולבצע פעולות באתר. דורש הגדרה חד־פעמית של פונקציית השרת ומפתח API (ראו README). שאלות היום: '+usedToday+'</p>'+
  '<div class="check"><input type="checkbox" id="aiOn" '+(ai.enabled?'checked':'')+'><label for="aiOn" style="margin:0;color:var(--text)">הבינה המלאכותית פעילה</label></div>'+
  '<div class="row"><div><label>ספק הבינה המלאכותית</label><select id="aiProv"><option value="gemini"'+(ai.provider!=='claude'?' selected':'')+'>Google Gemini — חינם (עם מגבלה יומית)</option><option value="claude"'+(ai.provider==='claude'?' selected':'')+'>Claude — בתשלום לפי שימוש</option></select></div>'+
  '<div><label>מודל Gemini</label><input id="aiGModel" list="aiGModels" dir="ltr" value="'+esc(ai.geminiModel||'gemini-2.5-flash')+'"><datalist id="aiGModels"><option value="gemini-2.5-flash"><option value="gemini-2.5-flash-lite"></datalist></div></div>'+
  '<p class="muted">💡 Gemini החינמי: מפתח בחינם מ-Google AI Studio (הוראות ב"⚙️ הגדרה ראשונית" ← שלב 3). יש מגבלת שאלות לדקה וליום (גוגל קובעת ומשנה אותה), ובמסלול החינמי גוגל רשאית להשתמש בשאלות לשיפור השירות שלה.</p>'+
  '<div class="row"><div><label>למי זה פתוח</label><select id="aiAud"><option value="admin"'+(ai.audience!=='all'?' selected':'')+'>רק לי (המנהל) — לבדיקה</option><option value="all"'+(ai.audience==='all'?' selected':'')+'>לכל המשתמשים</option></select></div>'+
  '<div><label>מודל</label><select id="aiModel">'+[['claude-opus-5','Claude Opus 5 — הכי חכם (מומלץ)'],['claude-sonnet-5','Claude Sonnet 5 — חכם וזול יותר'],['claude-haiku-4-5','Claude Haiku 4.5 — מהיר וזול'],['claude-fable-5-1','Claude Fable 5.1 — הכי חזק, יקר']].map(([v,l])=>'<option value="'+v+'"'+((ai.model||'claude-opus-5')===v?' selected':'')+'>'+l+'</option>').join('')+'</select></div>'+
  '<div><label>רמת חשיבה</label><select id="aiEffort">'+[['low','מהירה'],['medium','רגילה'],['high','מעמיקה']].map(([v,l])=>'<option value="'+v+'"'+((ai.effort||'medium')===v?' selected':'')+'>'+l+'</option>').join('')+'</select></div>'+
  '<div><label>מגבלת שאלות ליום לכל משתמש</label><input id="aiLimit" type="number" min="1" max="1000" value="'+(ai.dailyLimit||30)+'"></div></div>'+
  '<label>ההוראות האישיות שלך לבוט (אופי, סגנון, מה מותר ומה אסור, מידע עליך ועל האתר)</label><textarea id="aiInstr" style="min-height:140px" placeholder="למשל: תעני תמיד בקצרה. תמליצי על רשתות כשרות למהדרין. אל תמליצי על מוצרים בלי הכשר בד״ץ...">'+esc(ai.instructions||'')+'</textarea>'+
  '<button class="btn" id="aiSave" style="margin-top:10px">💾 שמירת הגדרות AI</button> <button class="btn sec" id="aiDiag" style="margin-top:10px">🔍 בדיקת חיבור</button><div id="aiDiagOut" style="margin-top:10px"></div></div>'+
  '<div class="card"><h2>💬 הגדרות הבוט</h2><label>הודעת פתיחה (ריק = ברירת מחדל)</label><textarea id="bWelcome" style="min-height:60px">'+esc(bc.welcome||'')+'</textarea>'+
  (TORAH_OFF?'<input type="checkbox" id="bDtRem" hidden '+(bc.dtReminder!==false?'checked':'')+'>':'<div class="check"><input type="checkbox" id="bDtRem" '+(bc.dtReminder!==false?'checked':'')+'><label for="bDtRem" style="margin:0;color:var(--text)">להזכיר בחמישי, בשישי ובערב חג: "יש לך דבר תורה לשתף?"</label></div>')+
  '<label>מילים חסומות נוספות (מופרדות בפסיקים) — בנוסף לרשימת הקללות המובנית</label><textarea id="bBanned" style="min-height:60px">'+esc((bc.bannedExtra||[]).join(', '))+'</textarea>'+
  '<button class="btn" id="bSave" style="margin-top:10px">💾 שמירה</button></div>';
  $('#boMain').innerHTML=settingsHtml+
  '<div class="card"><h2>➕ ללמד את הבוט (פעיל מיד לכולם)</h2><div class="row"><input id="kQ" placeholder="שאלה / מה המשתמש כותב"><input id="kA" placeholder="התשובה של הבוט"><button class="btn" id="kAdd">הוספה</button></div></div>'+
  '<div class="card"><h2>⏳ מה שמשתמשים לימדו — ממתין לאישור ('+kb.filter(k=>k.status==='pending').length+')</h2>'+(kb.filter(k=>k.status==='pending').map(kItem).join('')||'<p class="muted">אין</p>')+'</div>'+
  '<div class="card"><h2>📚 הידע הפעיל ('+kb.filter(k=>k.status==='approved').length+')</h2>'+(kb.filter(k=>k.status==='approved').map(kItem).join('')||'<p class="muted">אין עדיין</p>')+'</div>';
  if(adm){
  $('#aiDiag').onclick=async()=>{
    const o=$('#aiDiagOut');o.innerHTML='<p class="muted">בודק... (עד 20 שניות)</p>';
    let {data,error}=await sb.functions.invoke('ai-chat',{body:{diag:true}});
    if(error&&error.context&&typeof error.context.json==='function'){try{data=await error.context.json();}catch(e){}}
    const row=(okk,t,fix)=>'<div style="margin:4px 0">'+(okk?'✅':'❌')+' '+t+(fix&&!okk?'<div class="muted" style="margin-inline-start:22px">'+fix+'</div>':'')+'</div>';
    const fnUrl='https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions',secUrl='https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions/secrets';
    const st=error&&error.context&&error.context.status,em=String((data&&(data.message||data.msg||data.error))||'');
    if(error&&!(data&&data.version)&&(st===401||/invalid jwt|jwt|unauthorized/i.test(em))){
      o.innerHTML=row(false,'Supabase חוסם את הבקשה לפני שהיא מגיעה לפונקציה ('+esc(String(st||''))+(em?' · '+esc(em):'')+')','זו ההגדרה "Verify JWT". ב-<a href="'+fnUrl+'" target="_blank" rel="noopener">Edge Functions</a> ← לוחצים על <b>ai-chat</b> ← <b>Details</b> (או Settings) ← מכבים את <b>"Verify JWT with legacy secret"</b> / <b>"Enforce JWT verification"</b> ← <b>Save</b>. (הפונקציה בודקת בעצמה מי המשתמש, אז זה בטוח.) ואז לוחצים שוב על הבדיקה.');return;}
    if(error&&!(data&&data.version)&&st===404){o.innerHTML=row(false,'הפונקציה ai-chat לא קיימת בשרת (404)','ב-<a href="'+fnUrl+'" target="_blank" rel="noopener">Edge Functions</a> ← Deploy a new function ← Via Editor ← שם בדיוק <code dir="ltr">ai-chat</code> ← מדביקים את הקוד מ"⚙️ הגדרה ראשונית" ← Deploy.');return;}
    if(error&&!(data&&data.version)&&st>=500){o.innerHTML=row(false,'הפונקציה קרסה בשרת ('+esc(String(st))+(em?' · '+esc(em):'')+')','ב-<a href="'+fnUrl+'" target="_blank" rel="noopener">Edge Functions</a> ← ai-chat ← <b>Logs</b> — צלמו לי את השגיאה האדומה האחרונה. לרוב עוזר: Code ← Ctrl+A ← להדביק שוב את הקוד המעודכן ← Deploy.');return;}
    if(!data||(error&&!data.version)){const m=String((error&&error.message)||'');
      o.innerHTML=row(false,'פונקציית השרת ai-chat לא עונה'+(m?' ('+esc(m)+')':''),'כנראה הפונקציה לא הועלתה, או שהשם שלה לא בדיוק <code dir="ltr">ai-chat</code>. ב"⚙️ הגדרה ראשונית" ← שלב 3: מעתיקים את הקוד, ואז ב-<a href="'+fnUrl+'" target="_blank" rel="noopener">Edge Functions</a> ← ai-chat ← Code ← מחליפים הכל ← Deploy.');return;}
    if(!data.version){o.innerHTML=row(false,'בשרת רצה גרסה ישנה של הפונקציה (בלי Gemini)','צריך להעלות את הקוד החדש: "⚙️ הגדרה ראשונית" ← שלב 3 ← 📋 העתקת קוד הפונקציה ← ב-<a href="'+fnUrl+'" target="_blank" rel="noopener">Edge Functions</a> ← ai-chat ← Code ← Ctrl+A ← הדבקה ← Deploy.');return;}
    let h=row(true,'פונקציית השרת עובדת (גרסה חדשה)');
    h+=row(data.enabled,'הבינה המלאכותית מסומנת "פעילה"','מסמנים "הבינה המלאכותית פעילה" למעלה ולוחצים 💾 שמירה.');
    h+=row(true,'פתוחה ל: '+(data.audience==='all'?'כל המשתמשים':'רק לך (המנהל)'));
    h+=row(true,'ספק: '+(data.provider==='gemini'?'Google Gemini (חינם)':'Claude (בתשלום)'));
    if(data.provider==='gemini'){
      h+=row(data.hasGeminiKey,(data.geminiKeys>1?data.geminiKeys+' מפתחות Gemini שמורים בשרת (עוברים אוטומטית כשאחד מגיע למכסה)':'המפתח GEMINI_API_KEY שמור בשרת'),'ב-<a href="'+secUrl+'" target="_blank" rel="noopener">Supabase ← Secrets</a>: Name בדיוק <code dir="ltr">GEMINI_API_KEY</code>, Value = המפתח מ-<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> ← Save. אחרי שמירת מפתח חדש — עושים Deploy לפונקציה שוב.');
      if(data.test){const t=data.test;const e=String(t.error||'');
        const fix=/API key not valid|API_KEY_INVALID|permission|PERMISSION_DENIED/i.test(e)?'המפתח לא תקין. יוצרים מפתח חדש ב-<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">AI Studio</a>, ומחליפים אותו ב-<a href="'+secUrl+'" target="_blank" rel="noopener">Secrets</a> (מוחקים את הישן ושומרים חדש).'
          :/location|region|country|not supported/i.test(e)?'גוגל לא מאפשרת את המסלול החינמי מהמיקום של השרת. ב-Supabase אפשר לבדוק את אזור השרת; אחרת — בוחרים Claude.'
          :t.status===429||/quota|exhausted/i.test(e)?'הגעתם למכסה החינמית של גוגל. מחכים דקה (או עד מחר) ומנסים שוב, או מוסיפים עוד מפתח Gemini מחשבון גוגל אחר.'
          :'הודעת השגיאה של גוגל מופיעה למעלה — שלחו אותה לי ואעזור.';
        h+=row(t.ok,t.ok?'שאלת ניסיון לגוגל הצליחה ('+esc(t.model)+'): "'+esc(String(t.text||'').slice(0,60))+'"':'שאלת ניסיון לגוגל נכשלה ('+esc(String(t.status||''))+', '+esc(t.model||'')+'): '+esc(e),fix);
        if(!t.ok&&Array.isArray(t.tries)&&t.tries.length)h+='<details class="muted" style="margin:4px 0 8px"><summary>מה קרה בכל מודל ('+t.tries.length+')</summary><div dir="ltr" style="font-size:12px;white-space:pre-wrap">'+t.tries.map(x=>esc(String(x))).join('\n')+'</div></details>';}
    }else h+=row(data.hasClaudeKey,'המפתח ANTHROPIC_API_KEY שמור בשרת','ב-<a href="'+secUrl+'" target="_blank" rel="noopener">Supabase ← Secrets</a>: Name <code dir="ltr">ANTHROPIC_API_KEY</code> ← Save.');
    o.innerHTML=h+(data.enabled&&(!data.test||data.test.ok)?'<p class="muted">💡 יאמי עונה קודם בעצמה על דברים שהיא מכירה (רשימה, מתכונים, זמנים...) ופונה לבינה המלאכותית רק בשאלות אחרות. כדי לשאול את הבינה ישירות כותבים: <b>בינה: השאלה שלך</b></p>':'');
  };
  $('#aiSave').onclick=()=>setCfg('ai',{provider:$('#aiProv').value,geminiModel:($('#aiGModel').value.trim()||'gemini-2.5-flash').slice(0,60),enabled:$('#aiOn').checked,audience:$('#aiAud').value,model:$('#aiModel').value,effort:$('#aiEffort').value,dailyLimit:Math.max(1,Math.min(1000,+$('#aiLimit').value||30)),instructions:$('#aiInstr').value.trim()});
  $('#bSave').onclick=()=>setCfg('bot',{welcome:$('#bWelcome').value.trim(),dtReminder:$('#bDtRem').checked,bannedExtra:$('#bBanned').value.split(',').map(x=>x.trim()).filter(Boolean)});
  }
  $('#kAdd').onclick=async()=>{const q=$('#kQ').value.trim(),a=$('#kA').value.trim();if(!q||!a)return;if(await ok(sb.from('bot_knowledge').insert({question:q,answer:a,author_id:me.id,author_name:'מנהל האתר',status:'approved'}),'✅ נוסף'))show('bot');};
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;const it=b.closest('[data-id]');const id=it.dataset.id;const v=f=>it.querySelector('[data-f='+f+']').value.trim();let q;
    if(b.dataset.act==='save')q=sb.from('bot_knowledge').update({question:v('q'),answer:v('a')}).eq('id',id);
    if(b.dataset.act==='approve')q=sb.from('bot_knowledge').update({status:'approved',question:v('q'),answer:v('a')}).eq('id',id);
    if(b.dataset.act==='reject')q=sb.from('bot_knowledge').update({status:'rejected'}).eq('id',id);
    if(b.dataset.act==='del'){if(!(await uiConfirm('למחוק?')))return;q=sb.from('bot_knowledge').delete().eq('id',id);}
    if(await ok(q,'✔️ בוצע'))show('bot');};
},
/* ---------- רשתות, חנויות וסניפים ---------- */
async chains(){
  const [c,b]=await Promise.all([sb.from('chains').select('*').order('name'),sb.from('branches').select('*').order('chain').order('city').limit(5000)]);
  const chains=c.data||[],branches=b.data||[];
  const pc=chains.filter(x=>x.status==='pending'),pb=branches.filter(x=>x.status==='pending');
  const chainOpts='<datalist id="boChainList">'+chains.map(x=>'<option value="'+esc(x.name)+'">').join('')+'</datalist>';
  $('#boMain').innerHTML=chainOpts+
    ((pc.length||pb.length)?'<div class="card" style="border-color:#e0b100"><h2>⏳ ממתינים לאישור ('+(pc.length+pb.length)+')</h2><p class="muted">חנויות וסניפים שמשתמשים הוסיפו. אחרי אישור הם מופיעים לכולם.</p>'+
      pc.map(x=>'<div class="item" data-pchain="'+x.id+'"><div class="row" style="align-items:center"><span style="min-width:160px">🏪 <b>'+esc(x.name)+'</b> · '+(x.kind==='online'?'🌐 אונליין':'חנות')+'</span><button class="btn sm" data-act="okc">✅ אישור</button><button class="btn sm bad" data-act="noc">🗑️ דחייה</button></div></div>').join('')+
      pb.map(x=>'<div class="item" data-pbranch="'+x.id+'"><div class="row" style="align-items:center"><span style="min-width:160px">📍 <b>'+esc(x.chain)+'</b> · '+esc(x.city)+' — '+esc(x.address)+(x.name?' ('+esc(x.name)+')':'')+'</span><a class="btn sm sec" style="text-decoration:none;flex:0 0 auto;min-width:0" target="_blank" rel="noopener" href="https://waze.com/ul?q='+encodeURIComponent(x.chain+' '+x.address+' '+x.city)+'">🧭 בדיקה</a><button class="btn sm" data-act="okb">✅ אישור</button><button class="btn sm bad" data-act="nob">🗑️ דחייה</button></div></div>').join('')+'</div>':'')+
    '<div class="card"><h2>➕ הוספת חנות או סניף — כל חנות שתרצה</h2><p class="muted">אפשר לכתוב רשת קיימת או שם חדש (למשל "יוחננוף" — סניף פיזי). חנות חדשה תיווצר אוטומטית ותאושר מיד.</p>'+
      '<div class="row"><input id="bChain" list="boChainList" placeholder="שם הרשת / החנות"><select id="bKind" style="max-width:150px"><option value="store">🏪 חנות פיזית</option><option value="online">🌐 אונליין</option></select><select id="bCat" style="max-width:170px">'+Object.keys(STORE_TYPES).map(k=>'<option value="'+k+'">'+STORE_TYPES[k][0]+' '+STORE_TYPES[k][1]+'</option>').join('')+'</select><input id="bCity" placeholder="עיר"><input id="bAddr" placeholder="רחוב ומספר"><input id="bName" placeholder="שם הסניף (רשות)"><input id="cWeb" placeholder="אתר (לאונליין, רשות)" dir="ltr"><button class="btn" id="bAdd">הוספה</button></div></div>'+
    '<div class="card"><h2>🏪 רשתות וחנויות ('+chains.length+')</h2><div class="tw"><p class="muted">✏️ אפשר לשנות שם ואתר של כל חנות (גם כאלה שמשתמשים הוסיפו) — ולשמור ב-💾.</p><table><thead><tr><th>רשת</th><th>סוג חנות</th><th>אתר</th><th>סניפים</th><th></th></tr></thead><tbody>'+chains.filter(x=>x.status!=='pending').map(x=>'<tr data-cid="'+x.id+'" data-cname="'+esc(x.name)+'"><td><input data-cf="name" value="'+esc(x.name)+'" maxlength="40" style="min-width:110px"></td><td><select data-cat="'+x.id+'">'+Object.keys(STORE_TYPES).map(k=>'<option value="'+k+'"'+((x.category||'supermarket')===k?' selected':'')+'>'+STORE_TYPES[k][0]+' '+STORE_TYPES[k][1]+'</option>').join('')+'</select></td><td><input data-cf="web" value="'+esc(x.website||'')+'" dir="ltr" placeholder="https://" maxlength="200" style="min-width:120px"></td><td>'+branches.filter(b=>b.chain===x.name).length+'</td><td style="white-space:nowrap"><button class="btn sm" data-savechain="'+x.id+'" title="שמירת שם ואתר">💾</button> <button class="btn sm sec" data-hidechain="'+x.id+'" data-h="'+(x.hidden?'1':'')+'" title="'+(x.hidden?'להציג שוב באתר':'להסתיר מהאתר')+'">'+(x.hidden?'🙈 מוסתרת':'👁️ מוצגת')+'</button> <button class="btn sm sec" data-profchain="'+esc(x.name)+'" title="פרופיל ציבורי ופניות">ℹ️ פרופיל</button> <button class="btn sm bad" data-delchain="'+x.id+'">🗑️</button></td></tr>').join('')+'</tbody></table></div></div>'+
    '<div class="card"><h2>📍 סניפים ('+branches.filter(x=>x.status!=='pending').length+')</h2><div class="row" style="margin-bottom:8px"><input id="bFilter" placeholder="סינון לפי רשת / עיר / רחוב"><button class="btn sec" id="geoAll" title="מחפש את המיקום של כל סניף לפי הכתובת (OpenStreetMap)">📍 איתור מיקום אוטומטי לסניפים</button></div><p class="muted">📍 מיקום מדויק לסניפים מאפשר לאתר להציע ללקוח את החנויות והמבצעים הכי קרובים אליו. אפשר לאתר אוטומטית לפי הכתובת, או להדביק ידנית (lat / lng מגוגל מפות).</p><div class="tw"><table><thead><tr><th>רשת</th><th>עיר</th><th>כתובת</th><th>שם</th><th>מיקום</th><th></th></tr></thead><tbody id="btb"></tbody></table></div></div>';
  const list=branches.filter(x=>x.status!=='pending');
  $('#boMain').onchange=async e=>{const c=e.target.closest('[data-cat]');if(!c)return;const v=c.value;if(await ok(sb.from('chains').update({category:v,kind:v==='online'?'online':'store'}).eq('id',c.dataset.cat),'✔ סוג החנות עודכן'))loadChains();};
  const draw=f=>{f=norm(f);$('#btb').innerHTML=list.filter(b=>!f||norm(b.chain+' '+b.city+' '+b.address+' '+b.name).includes(f)).map(b=>'<tr data-id="'+esc(b.id)+'"><td>'+esc(b.chain)+'</td><td><input data-f="city" value="'+esc(b.city)+'"></td><td><input data-f="address" value="'+esc(b.address)+'"></td><td><input data-f="name" value="'+esc(b.name)+'"></td><td><input data-f="lat" value="'+(b.lat!=null?b.lat:'')+'" dir="ltr" style="width:90px" placeholder="lat"><input data-f="lng" value="'+(b.lng!=null?b.lng:'')+'" dir="ltr" style="width:90px;margin-top:3px" placeholder="lng"></td><td style="white-space:nowrap"><button class="btn sm" data-bsave>💾</button> <a class="btn sm sec" style="text-decoration:none" target="_blank" rel="noopener" href="https://waze.com/ul?q='+encodeURIComponent(b.chain+' '+b.address+' '+b.city)+'&navigate=yes">🧭</a> <button class="btn sm bad" data-bdel>🗑️</button></td></tr>').join('');};
  draw('');$('#bFilter').oninput=e=>draw(e.target.value);
  $('#bAdd').onclick=async()=>{
    const chain=$('#bChain').value.trim(),kind=$('#bKind').value,city=$('#bCity').value.trim();
    if(!chain){flash('צריך שם רשת/חנות');return;}
    if(!chains.some(x=>x.name===chain)){if(!await ok(sb.from('chains').insert({name:chain,kind,category:kind==='online'?'online':$('#bCat').value,website:$('#cWeb').value.trim()||null,created_by:me.id})))return;}
    if(city&&kind!=='online'){if(!await ok(sb.from('branches').insert({chain,city,address:$('#bAddr').value.trim(),name:$('#bName').value.trim(),created_by:me.id})))return;}
    flash('✅ נוסף');show('chains');loadChains();};
  $('#boMain').onclick=async e=>{
    const act=e.target.closest('[data-act]');
    if(act){const pcI=e.target.closest('[data-pchain]'),pbI=e.target.closest('[data-pbranch]');const a=act.dataset.act;let q;
      if(a==='okc')q=sb.from('chains').update({status:'approved'}).eq('id',pcI.dataset.pchain);
      if(a==='noc')q=sb.from('chains').delete().eq('id',pcI.dataset.pchain);
      if(a==='okb')q=sb.from('branches').update({status:'approved'}).eq('id',pbI.dataset.pbranch);
      if(a==='nob')q=sb.from('branches').delete().eq('id',pbI.dataset.pbranch);
      if(q&&await ok(q,a.startsWith('ok')?'✅ אושר':'🗑️ נדחה')){show('chains');loadChains();}return;}
    const hc=e.target.closest('[data-hidechain]');
    if(hc){const hide=!hc.dataset.h;if(await ok(sb.from('chains').update({hidden:hide}).eq('id',hc.dataset.hidechain),hide?'🙈 החנות הוסתרה מהאתר':'👁️ החנות מוצגת שוב')){show('chains');loadChains();}return;}
    const pc=e.target.closest('[data-profchain]');if(pc){closeBO();openBiz(pc.dataset.profchain);return;}
    const gb=e.target.closest('#geoAll');if(gb){geocodeBranches(branches,gb);return;}
    const sc=e.target.closest('[data-savechain]');
    if(sc){const tr=sc.closest('tr');const oldN=tr.dataset.cname,newN=tr.querySelector('[data-cf=name]').value.trim(),web=tr.querySelector('[data-cf=web]').value.trim();
      if(!newN){flash('צריך שם');return;}
      if(newN!==oldN){if(!(await uiConfirm('לשנות את השם "'+oldN+'" ל-"'+newN+'"?\nהשם יתעדכן בכל מקום: סניפים, מחירים, מבצעים, עוקבים ובעלי סופרים.')))return;
        const {data,error}=await sb.rpc('admin_rename_chain',{p_old:oldN,p_new:newN});
        if(error||data!=='ok'){flash('⚠️ '+((error&&error.message)||({exists:'כבר יש חנות בשם הזה',empty:'צריך שם',forbidden:'אין הרשאה'}[data])||data));return;}}
      if(await ok(sb.from('chains').update({website:web||null}).eq('id',sc.dataset.savechain),'💾 נשמר')){show('chains');loadChains();}return;}
    const dc=e.target.closest('[data-delchain]');if(dc){if((await uiConfirm('למחוק את הרשת? (הסניפים והמחירים שלה נשארים)'))&&await ok(sb.from('chains').delete().eq('id',dc.dataset.delchain),'🗑️ נמחקה'))show('chains');return;}
    const tr=e.target.closest('tr[data-id]');if(!tr)return;const id=tr.dataset.id;const v=f=>tr.querySelector('[data-f='+f+']').value.trim();
    if(e.target.closest('[data-bsave]'))await ok(sb.from('branches').update(Object.assign({city:v('city'),address:v('address'),name:v('name')},(v('lat')&&v('lng')&&!isNaN(+v('lat'))&&!isNaN(+v('lng')))?{lat:+v('lat'),lng:+v('lng')}:(!v('lat')&&!v('lng')?{lat:null,lng:null}:{}))).eq('id',id),'💾 נשמר');
    if(e.target.closest('[data-bdel]')&&(await uiConfirm('למחוק את הסניף?'))&&await ok(sb.from('branches').delete().eq('id',id),'🗑️ נמחק'))tr.remove();
  };
},
/* ---------- מחירים ---------- */
async prices(){
  const lim=window.boPriceLim23||300;
  const [{data},{data:pend}]=await Promise.all([sb.from('prices').select(COLS23.prices).order('created_at',{ascending:false}).limit(lim),sb.from('prices').select(COLS23.prices).eq('status','pending').order('created_at').limit(500)]);
  const rows=(data||[]).filter(r=>r.status!=='pending'),pending=pend||[];
  const pr=r=>'<tr data-id="'+r.id+'"><td>'+esc(r.product)+(r.barcode?'<br><span class="muted">'+esc(r.barcode)+'</span>':'')+'</td><td>'+esc(r.chain)+'</td><td>'+esc(r.branch)+'</td><td>'+fmtPrice(r.price,r.currency)+(r.verified?' <span class="pill">✔ רשמי</span>':'')+'</td><td>✅ '+r.confirms+(r.wrong?'<br><b style="color:var(--bad)">❌ '+r.wrong+'</b>':'')+(r.is_deal?'<br>🔥 '+esc(r.deal_text||'מבצע'):'')+'</td><td>'+crSlot('prices',r.id)+'</td><td>'+fmt(r.created_at)+(r.updated_at?'<br><span class="muted">נערך '+fmt(r.updated_at)+'</span>':'')+'</td><td style="white-space:nowrap">'+(r.status==='pending'?'<button class="btn sm" data-ok>✅</button> ':'')+'<button class="btn sm sec" data-edit title="עריכה">✏️</button> <button class="btn sm bad" data-del>🗑️</button></td></tr>';
  const allRows=rows.concat(pending);
  const head='<div class="tw"><table><thead><tr><th>מוצר</th><th>רשת</th><th>סניף</th><th>מחיר</th><th>נכון / לא נכון</th><th>מדווח</th><th>מתי</th><th></th></tr></thead><tbody>';
  $('#boMain').innerHTML='<div class="card"><h2>📄 העלאת קובץ מחירים</h2><p class="muted">מעלים הרבה מחירים בבת אחת — בלי להקליד אחד אחד. תומך ב-CSV, Excel וקבצי "שקיפות מחירים" של הרשתות (XML / XML.GZ).</p><div id="boBulk"></div></div>'+
    (pending.length?'<div class="card" style="border-color:#e0b100"><h2>⏳ מחירים מבעלי סופרים שממתינים לאישור ('+pending.length+')</h2><div class="row" style="margin-bottom:8px"><button class="btn" id="okAll">✅ אישור הכל</button></div>'+head+pending.map(pr).join('')+'</tbody></table></div></div>':'')+
    '<div class="card"><h2>💰 דיווחי מחיר אחרונים ('+rows.length+')</h2><p class="muted" style="margin-bottom:8px">דיווח שגוי? מתקנים אותו ב-✏️ או מוחקים ב-🗑️. מחולק לקטגוריות — כל הדיווחים, גם הקודמים, מהחדש לישן.</p>'+
    (()=>{const by={};rows.forEach(r=>{const c=typeof catOfPrice23==='function'?catOfPrice23(r.product):'אחר';(by[c]=by[c]||[]).push(r);});
      return CATS.filter(c=>by[c]).map(c=>'<details class="bopcat23" open style="margin:8px 0"><summary style="cursor:pointer;font-weight:700">'+(CATE[c]||'🛒')+' '+esc(c)+' <span class="muted">('+by[c].length+')</span></summary>'+head+by[c].map(pr).join('')+'</tbody></table></div></details>').join('');})()+
    ((data||[]).length>=lim?'<button class="btn sec" id="prMore23" style="margin-top:8px">⬇️ עוד דיווחים קודמים</button>':'')+'</div>';
  const dl=document.createElement('datalist');dl.id='prChainList';dl.innerHTML=allChainNames().map(n=>'<option value="'+esc(n)+'">').join('');$('#boMain').appendChild(dl);
  const dl2=document.createElement('datalist');dl2.id='prBranchList';dl2.innerHTML=allBranches().map(b=>'<option value="'+esc(b.city+(b.address?' — '+b.address:''))+'">').join('');$('#boMain').appendChild(dl2);
  bulkUI($('#boBulk'),{});
  if($('#okAll'))$('#okAll').onclick=async()=>{if(await ok(sb.from('prices').update({status:'approved'}).eq('status','pending'),'✅ כל המחירים אושרו'))show('prices');};
  $('#boMain').onclick=async e=>{if(e.target.id==='prMore23'){window.boPriceLim23=lim+300;show('prices');return;}const tr=e.target.closest('tr[data-id]');if(!tr)return;const id=tr.dataset.id;
    if(e.target.closest('[data-edit]')){const r=allRows.find(x=>x.id===id);if(!r)return;
      tr.innerHTML='<td><input data-pf="product" value="'+esc(r.product)+'" maxlength="60"><input data-pf="barcode" value="'+esc(r.barcode||'')+'" placeholder="ברקוד" inputmode="numeric" maxlength="20" style="margin-top:4px"></td><td><input data-pf="chain" list="prChainList" value="'+esc(r.chain)+'" maxlength="40"></td><td><input data-pf="branch" list="prBranchList" value="'+esc(r.branch||'')+'" maxlength="120"></td><td><input data-pf="price" type="number" step="0.01" min="0" value="'+esc(String(r.price))+'" style="max-width:90px"></td><td>'+r.confirms+'</td><td>'+crSlot('prices',r.id)+'</td><td>'+fmt(r.created_at)+'</td><td style="white-space:nowrap"><button class="btn sm" data-psave>💾</button> <button class="btn sm sec" data-pcancel>✕</button></td>';return;}
    if(e.target.closest('[data-pcancel]')){show('prices');return;}
    if(e.target.closest('[data-psave]')){const v=f=>tr.querySelector('[data-pf='+f+']').value.trim();const price=parseFloat(v('price'));const bc=v('barcode');
      if(!v('product')||!v('chain')||isNaN(price)||price<=0||price>=100000){flash('⚠️ צריך מוצר, רשת ומחיר תקין');return;}
      if(bc&&!/^\d{4,20}$/.test(bc)){flash('⚠️ ברקוד — ספרות בלבד');return;}
      if(await ok(sb.from('prices').update({product:v('product'),product_key:norm(v('product')),chain:v('chain'),branch:v('branch'),price:Math.round(price*100)/100,barcode:bc||null}).eq('id',id),'💾 המחיר עודכן'))show('prices');return;}
    if(e.target.closest('[data-ok]')&&await ok(sb.from('prices').update({status:'approved'}).eq('id',id),'✅ אושר'))tr.remove();
    if(e.target.closest('[data-del]')&&await ok(sb.from('prices').delete().eq('id',id),'🗑️ נמחק'))tr.remove();};
},
/* ---------- תוכן ועיצוב ---------- */
async content(){
  const [about,ann,theme]=await Promise.all([cfg('about'),cfg('announcement'),cfg('theme')]);
  $('#boMain').innerHTML='<div class="card"><h2>📢 הודעה בראש האתר</h2><div class="check"><input type="checkbox" id="anOn" '+(ann.on?'checked':'')+'><label for="anOn" style="margin:0;color:var(--text)">להציג את ההודעה</label></div><input id="anText" value="'+esc(ann.text||'')+'" placeholder="למשל: חג שמח! 🎉 מבצעי חג בנתיב החסד"><button class="btn" id="anSave" style="margin-top:8px">💾 שמירה</button></div>'+
  '<div class="card"><h2>ℹ️ טקסט נוסף בעמוד "אודות"</h2><p class="muted">מופיע מתחת לטקסט הקבוע (שאברך פיתח את האתר, נטפרי, יצירת קשר וזכויות היוצרים ל-YAMSHOPPING2026).</p><textarea id="abText">'+esc(about.text||'')+'</textarea><button class="btn" id="abSave" style="margin-top:8px">💾 שמירה</button></div>'+
  '';
  $('#anSave').onclick=()=>setCfg('announcement',{on:$('#anOn').checked,text:$('#anText').value.trim()});
  $('#abSave').onclick=()=>setCfg('about',{text:$('#abText').value.trim()});
},
/* ---------- הערות ---------- */
async feedback(){
  const {data}=await sb.from('feedback').select('*').order('created_at',{ascending:false}).limit(500);
  const rows=data||[];
  $('#boMain').innerHTML='<div class="card"><h2>💌 הערות והארות ('+rows.length+')</h2>'+(rows.map(f=>'<div class="item" data-id="'+esc(f.id)+'" style="'+(f.is_read?'opacity:.6':'')+'"><b>'+esc(f.name)+'</b> <span class="muted" dir="ltr">'+esc(f.email)+'</span> <span class="muted">· '+fmt(f.created_at)+'</span><p style="white-space:pre-wrap;margin:6px 0">'+esc(f.message)+'</p><div class="row">'+(f.is_read?'':'<button class="btn sm" data-read>✔️ סימון כנקרא</button>')+'<a class="btn sm sec" style="text-decoration:none" href="mailto:'+esc(f.email)+'?subject='+encodeURIComponent('תודה על ההערה — רשימת קניות')+'">↩️ מענה במייל</a><button class="btn sm bad" data-del>🗑️</button></div></div>').join('')||'<p class="muted">אין עדיין הערות</p>')+'</div>';
  $('#boMain').onclick=async e=>{const it=e.target.closest('[data-id]');if(!it)return;const id=it.dataset.id;
    if(e.target.closest('[data-read]')&&await ok(sb.from('feedback').update({is_read:true}).eq('id',id)))show('feedback');
    if(e.target.closest('[data-del]')&&(await uiConfirm('למחוק?'))&&await ok(sb.from('feedback').delete().eq('id',id),'🗑️ נמחק'))it.remove();};
}
};


/* תבניות לפרסומות בלי תמונה — ממלאות את הטופס, ואז משנים את הפרטים של המפרסם */
const AD_TPL=[
  {name:'1+1',emoji:'🥛',theme:'blue',title:'1+1 על כל מוצרי החלב',body:'השבוע בלבד, בכל הסניפים'},
  {name:'משלוח חינם',emoji:'🚚',theme:'green',title:'משלוח חינם עד הבית',body:'בהזמנה מעל 300 ₪'},
  {name:'סניף חדש',emoji:'🏪',theme:'teal',title:'נפתח סניף חדש בשכונה!',body:'מבצעי פתיחה כל השבוע'},
  {name:'לשבת',emoji:'🕯️',theme:'gold',title:'הכל לשבת במקום אחד',body:'חלות טריות, דגים ועופות במחירים מיוחדים'},
  {name:'הנחה',emoji:'🏷️',theme:'red',title:'20% הנחה על כל הסל',body:'בקנייה מעל 200 ₪, עד סוף השבוע'},
  {name:'ירקות',emoji:'🥕',theme:'green',title:'ירקות ופירות טריים',body:'מגיעים כל בוקר, במחירי שוק'},
  {name:'לחג',emoji:'🎉',theme:'purple',title:'מבצעי החג הגדולים',body:'כל מה שצריך לחג, במחיר שמשמח'},
  {name:'פרסמו כאן',emoji:'📢',theme:'green',title:'המבצע שלכם כאן',body:'לפרטים: info@yamshopping.com'}];
VIEWS.ads=async function(){
  const {data}=await sb.from('ads').select('*').order('created_at',{ascending:false}).limit(200);
  const ads=data||[];let editing=null,imgData='',videoUrl='',vidName='',hadVideo=false,hadFreq=false,hadPage=false,hadAud=false;
  const toLocal=d=>d?new Date(new Date(d).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  const status=a=>!a.active?'כבויה':(a.ends_at&&new Date(a.ends_at)<new Date())?'הסתיימה':(a.starts_at&&new Date(a.starts_at)>new Date())?'מתוזמנת':'פעילה';
  const adc=await cfg('ads'),aud=adc.audience||'all';
  /* 📸 כרטיס נוח לפרסומת בצד "מצלמים מוצר ומקבלים נקודות": עריכה, הדלקה/כיבוי, מחיקה, הדמיה וסטטוס — בלי למלא את הטופס הכללי */
  const PH_LINK='https://www.yamshopping.com/?a=photos',PH_DEF={title:'צלמו מוצר וקבלו '+repPts('pts_photo')+' מוניטין 🏅',body:'מה מצלמים? כל מוצר מהסופר שיש לכם ביד בבית: חלב, שימורים, חטיפים, מוצרי ניקיון.\nאיך? סורקים את הברקוד ומצלמים את האריזה מקדימה, ברור ועל רקע נקי.\nלמה כדאי? על כל תמונה שמאושרת מקבלים '+repPts('pts_photo')+' נקודות מוניטין, והתמונה עוזרת לכל המשפחות לזהות בדיוק את המוצר הנכון בהשוואת המחירים.',emoji:'📸',theme:'blue'};
  const ph=ads.find(a=>a.placement==='side'&&adAction(a.link_url)==='photos')||null;
  const phV=ph||PH_DEF,phPop=adc.side_pop===undefined?6:Math.max(0,+adc.side_pop||0);
  const phOthers=ads.filter(a=>a!==ph&&a.placement==='side'&&status(a)==='פעילה').length;
  const phState=()=>{if(!ph)return ['⚪','עוד לא פורסמה. ממלאים למטה ולוחצים "שמירה והפעלה".'];
    if(!ph.active)return ['⏸','כבויה כרגע. אף אחד לא רואה אותה.'];
    const st=status(ph);if(st==='הסתיימה')return ['⌛','הסתיים התאריך שנקבע לה, ולכן היא לא מוצגת.'];if(st==='מתוזמנת')return ['🕒','מתוזמנת ותתחיל בתאריך שנקבע.'];
    if(aud==='none')return ['⚠️','שמורה כפעילה, אבל למעלה ב"מי רואה את הפרסומות" מסומן "אף אחד", אז אף אחד לא רואה אותה.'];
    if(aud==='admins'||ph.audience==='admins')return ['🛠️','פועלת לבדיקה: רק מנהלים רואים אותה. כשהכל נראה טוב, מורידים את הסימון "רק אצל המנהלים" ושומרים.'];
    return ['🟢','פועלת עכשיו: כל המשתמשים המחוברים רואים אותה בצד המסך.'];};
  const [phIc,phTx]=phState();
  const phCard='<div class="card" id="phCard"><h2>📸 פרסומת בצד: מצלמים מוצרים ומקבלים נקודות</h2>'+
    '<p class="muted">הלשונית הכחולה בקצה המסך בטלפון. בכניסה הראשונה ביום היא קופצת פתוחה לכמה שניות ואז מחליקה לצד. לחיצה על הכפתור שבה פותחת למשתמש חלון שבו סורקים ברקוד ומצלמים את המוצר.</p>'+
    '<div style="font-size:16px;margin:8px 0"><b>'+phIc+' '+(ph&&ph.active&&phIc==='🟢'?'פועלת':'מצב')+':</b> '+esc(phTx)+'</div>'+
    (phOthers?'<p class="muted">ℹ️ יש עוד '+phOthers+' פרסומות פעילות בצד, והן מתחלפות עם זו כל 20 שניות. אם רוצים שרק זו תוצג, מכבים או מוחקים אותן כאן:</p>'+ads.filter(a=>a!==ph&&a.placement==='side'&&status(a)==='פעילה').map(a=>'<div class="item" data-id="'+a.id+'"><div class="row" style="align-items:center"><div style="min-width:140px">'+esc(adEmoji(a))+' <b>'+esc(a.title||'(ללא כותרת)')+'</b><div class="muted">👁 '+a.views+' · 👆 '+a.clicks+'</div></div><button class="btn sm sec" data-act="toggle">⏸ כיבוי</button><button class="btn sm bad" data-act="del">🗑️</button></div></div>').join(''):(!ph||!ph.active?'<p class="muted">ℹ️ כשאין פרסומת דולקת בצד, מופיעה שם "📢 המבצע שלכם כאן". ברגע שמדליקים את זו, היא תופיע במקומה.</p>':''))+
    (ph?'<div class="phStat"><span>👁 '+ph.views+' צפיות</span><span>👆 '+ph.clicks+' לחיצות'+(ph.views?' ('+Math.round(ph.clicks*100/ph.views)+'%)':'')+'</span><span id="phPhotos">📷 תמונות שנשלחו: …</span></div>':'')+
    '<div class="check"><input type="checkbox" id="phOn"'+(!ph||ph.active?' checked':'')+'><label for="phOn" style="margin:0;color:var(--text)">להציג את הפרסומת</label></div>'+
    '<div class="check"><input type="checkbox" id="phTest"'+(ph&&ph.audience==='admins'?' checked':'')+'><label for="phTest" style="margin:0;color:var(--text)">🛠️ רק אצל המנהלים (לבדוק לפני שכולם רואים)</label></div>'+
    '<label>כותרת</label><input id="phTitle" maxlength="80" value="'+esc(phV.title||'')+'">'+
    '<label>טקסט</label><textarea id="phBody" maxlength="400" style="min-height:110px">'+esc(phV.body||'')+'</textarea>'+
    '<button class="btn sm sec" type="button" id="phDef" style="margin-top:6px">📝 להחזיר לטקסט המומלץ (מה מצלמים, איך ולמה)</button>'+
    '<div class="row"><div><label>אימוג\'י (מופיע גם על הלשונית)</label><input id="phEmoji" maxlength="8" value="'+esc(phV.emoji||'')+'"></div><div><label>צבע רקע</label><select id="phTheme">'+Object.entries(AD_THEMES).map(([k,v])=>'<option value="'+k+'"'+((phV.theme||'blue')===k?' selected':'')+'>'+v+'</option>').join('')+'</select></div></div>'+
    '<div class="row"><div><label>🎈 קפיצה בכניסה (פעם ביום לכל משתמש)</label><select id="phPop">'+[[0,'לא לקפוץ, רק לשונית בצד'],[4,'פתוחה 4 שניות ואז לצד'],[6,'פתוחה 6 שניות ואז לצד'],[8,'פתוחה 8 שניות ואז לצד'],[12,'פתוחה 12 שניות ואז לצד']].map(([v,t])=>'<option value="'+v+'"'+(phPop===v?' selected':'')+'>'+t+'</option>').join('')+'</select></div><div><label>עד תאריך (רשות)</label><input id="phEnd" type="date" value="'+(ph&&ph.ends_at?esc(new Date(ph.ends_at).toISOString().slice(0,10)):'')+'"></div></div>'+
    '<small class="muted">הקפיצה חלה על כל פרסומת שבצד, גם בטלפון וגם במחשב.</small>'+
    '<label style="margin-top:10px">הדמיה בטלפון</label><div class="phMock"><div class="phmList"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="phmSide" id="phmSide"></div></div>'+
    '<div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px"><button class="btn sec" type="button" id="phDemo">▶ הדגמה: קופצת ועוברת לצד</button></div>'+
    '<div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px"><button class="btn" type="button" id="phSave">💾 '+(ph?'שמירת שינויים':'שמירה והפעלה')+'</button>'+
    (ph?'<button class="btn sec" type="button" id="phToggle">'+(ph.active?'⏸ כיבוי':'▶ הדלקה')+'</button><button class="btn sec" type="button" id="phLive">📱 לראות באתר עכשיו</button><button class="btn bad" type="button" id="phDel">🗑️ מחיקה</button>':'')+'</div></div>';
  $('#boMain').innerHTML=phCard+'<details id="adMore" class="card" style="padding:0"><summary style="padding:14px 16px;cursor:pointer;font-weight:700">⚙️ פרסומות של מפרסמים והגדרות מתקדמות (פרסומת חדשה, מי רואה, מידות)</summary><div class="card" id="adAud"><h2>👁️ מי רואה את הפרסומות באתר</h2><p class="muted">זו ברירת המחדל לכל הפרסומות, ונאכפת גם בשרת. לכל פרסומת אפשר לבחור בנפרד בטופס למטה (👁️ מי רואה). "אף אחד" מכבה את כל הפרסומות.</p>'+
    [['all','👥 כולם','כל המשתמשים המחוברים'],['admins','🛠️ רק מנהלים','לבדיקה: רק את/ה והמנהלים רואים, המשתמשים לא'],['none','🚫 אף אחד','הפרסומות לא מוצגות בכלל (גם לא למנהלים)']].map(([v,t,d])=>'<label class="check" style="display:flex;gap:8px;align-items:flex-start;margin:6px 0;cursor:pointer"><input type="radio" name="adAud" value="'+v+'"'+(aud===v?' checked':'')+' style="width:auto;margin-top:5px"><span><b>'+t+'</b><br><small class="muted">'+d+'</small></span></label>').join('')+
    '<div class="check" style="margin-top:10px"><input type="checkbox" id="adHouseChk"'+(adc.house!==false?' checked':'')+'><label for="adHouseChk" style="margin:0;color:var(--text)">כשאין פרסומת קבועה בצד — להציג שם "📢 המבצע שלכם כאן" (כך תמיד יש פרסומת פעילה בצד)</label></div>'+
    '<label style="margin-top:12px">⏱️ כמה פעמים להציג חלון קופץ ובאנר לכל משתמש (ברירת מחדל)</label><select id="adFreqSel">'+[['day','פעם אחת ביום'],['session','בכל כניסה לאתר'],['load','בכל ריענון של הדף']].map(([v,t])=>'<option value="'+v+'"'+((adc.freq||'day')===v?' selected':'')+'>'+t+'</option>').join('')+'</select>'+
    '<small class="muted">חל על כל פרסומת שלא בחרו לה תדירות משלה (בטופס הפרסומת למטה). הפרסומת הקבועה בצד מוצגת תמיד, בלי קשר להגדרה הזאת.</small></div>'+
    '<div class="card"><h2>📐 מידות למפרסמים</h2><div class="tw" tabindex="0" role="region" aria-label="מידות פרסומות"><table><thead><tr><th>סוג</th><th>תמונה</th><th>טקסט</th></tr></thead><tbody>'+
    '<tr><td><b>חלון קופץ (פופאפ)</b><br><small class="muted">לפי התדירות שבחרת למעלה</small></td><td dir="ltr">1080×1080</td><td>כותרת עד 80 תווים, טקסט עד 400</td></tr>'+
    '<tr><td><b>באנר מעל הרשימה</b><br><small class="muted">פס קטן, כל כניסה</small></td><td dir="ltr">300×300</td><td>כותרת עד 80 תווים, שורה קצרה</td></tr>'+
    '<tr><td><b>פרסומת קבועה בצד</b><br><small class="muted">תמיד מוצגת כלשונית קטנה בקצה האתר (בטלפון ובמחשב), שנפתחת בלחיצה</small></td><td dir="ltr">600×600</td><td>כותרת קצרה ועד 2 שורות טקסט</td></tr>'+
    '<tr><td><b>🎬 וידאו</b><br><small class="muted">בכל סוג פרסומת</small></td><td dir="ltr">MP4 / WebM · עד 50MB</td><td>מתנגן בלי קול ובלולאה, ואפשר להפעיל קול. 10–20 שניות עובד הכי טוב</td></tr></tbody></table></div>'+
    '<p class="muted">💡 <b>בלי תמונה בכלל:</b> בוחרים אימוג\'י וצבע רקע, והפרסומת מעוצבת מטקסט בלבד. כך אין תמונה שצריכה אישור של נטפרי או של סינון אחר, והיא מוצגת לכולם מיד.</p>'+
    '<p class="muted">תמונה (אם רוצים) מרובעת, JPG או PNG. התמונה מוקטנת אוטומטית ל-900 פיקסלים. להשאיר שוליים של 5% בלי טקסט (בטלפונים קטנים הקצוות נחתכים מעט). בבאנר התמונה קטנה מאוד — עדיף לוגו או מוצר אחד, בלי טקסט בתמונה.</p></div>'+
    '<div class="card"><h2 id="adFormTitle">➕ פרסומת חדשה</h2><p class="muted">מתאים לשיתופי פעולה עם רשתות. פופאפ מוצג לפי התדירות שבחרת למעלה, ואפשר לסגור אותו אחרי מספר השניות שתקבע. באנר מופיע כפס קטן מעל הרשימה.</p>'+
    '<div class="row"><div><label>כותרת</label><input id="adTitle" maxlength="80" placeholder="למשל: 1+1 על כל מוצרי החלב"></div><div><label>שם המפרסם / הרשת</label><input id="adAdv" maxlength="60" placeholder="למשל: נתיב החסד"></div></div>'+
    '<label>טקסט</label><textarea id="adBody" maxlength="400" style="min-height:70px" placeholder="פרטי המבצע"></textarea>'+
    '<label>תמונה (מהטלפון או מהמחשב)</label><input id="adFile" type="file" accept="image/*"><div class="row" style="margin-top:6px"><input id="adImgUrl" placeholder="או כתובת תמונה https://..." dir="ltr"><button class="btn sec" id="adImgClear" type="button">הסרת תמונה</button></div>'+
    '<label>🎬 וידאו (רשות, MP4 או WebM עד 50MB)</label><input id="adVidFile" type="file" accept="video/mp4,video/webm"><div class="row" style="margin-top:6px;align-items:center"><small class="muted" id="adVidInfo" style="flex:1">אין וידאו</small><button class="btn sec" id="adVidClear" type="button" hidden>הסרת וידאו</button></div>'+
    '<p class="muted" style="margin-top:4px">💡 כדאי להוסיף גם תמונה או אימוג\'י: מי שהסינון שלו חוסם וידאו יראה אותם במקום.</p>'+
    '<div class="row"><div><label>אימוג\'י (לפרסומת בלי תמונה)</label><input id="adEmoji" maxlength="8" placeholder="🥛"></div><div><label>צבע רקע</label><select id="adTheme"><option value="">—</option>'+Object.entries(AD_THEMES).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></div></div>'+
    '<label>🎨 תבניות מוכנות (בלי תמונה — עוברות בכל סינון)</label><div class="row" id="adTpl" style="flex-wrap:wrap;gap:6px">'+AD_TPL.map((t,i)=>'<button class="btn sm sec" type="button" data-tpl="'+i+'">'+t.emoji+' '+esc(t.name)+'</button>').join('')+'</div>'+
    '<div class="row"><div><label>👆 מה קורה כשלוחצים על הפרסומת</label><select id="adGo"><option value="">אין כפתור (רק תצוגה)</option><option value="url">🌐 קישור חיצוני (אתר של המפרסם, וואטסאפ וכו׳)</option>'+Object.entries(AD_ACTIONS).map(([k,v])=>'<option value="'+k+'">באתר: '+v[0]+'</option>').join('')+'</select></div><div id="adLinkBox"><label>קישור (מתחיל ב-https://)</label><input id="adLink" dir="ltr" placeholder="https://..."></div><div><label>סוג</label><select id="adPlace"><option value="popup">חלון קופץ (פופאפ)</option><option value="banner">באנר קטן מעל הרשימה</option><option value="side">קבועה בצד (תמיד מוצגת)</option></select></div><div><label>⏱️ כמה פעמים להציג את הפרסומת הזאת</label><select id="adFreqOne"><option value="">לפי ברירת המחדל למעלה</option><option value="day">פעם אחת ביום</option><option value="session">בכל כניסה לאתר</option><option value="load">בכל ריענון של הדף</option></select></div></div>'+
    '<div class="row"><div><label>📄 באיזה דף להציג</label><select id="adPageOne"><option value="">בכל הדפים</option>'+Object.entries(AD_PAGES).map(([k,l])=>'<option value="'+k+'">רק ב'+l+'</option>').join('')+'</select></div><div><label>👁️ מי רואה את הפרסומת הזאת</label><select id="adAudOne"><option value="">לפי ההגדרה הכללית למעלה</option><option value="all">👥 כולם</option><option value="admins">🛠️ רק מנהלים (לבדיקה)</option></select></div><div><label>אפשר לסגור אחרי (שניות)</label><input id="adClose" type="number" min="0" max="30" value="5"></div></div>'+
    '<div class="row"><div><label>מתאריך (רשות)</label><input id="adStart" type="datetime-local"></div><div><label>עד תאריך (רשות)</label><input id="adEnd" type="datetime-local"></div></div>'+
    '<div class="check"><input type="checkbox" id="adActive" checked><label for="adActive" style="margin:0;color:var(--text)">פעילה</label></div>'+
    '<label>תצוגה מקדימה</label><div id="ybPreview" style="max-width:340px"></div>'+
    '<div class="row" style="margin-top:10px"><button class="btn" id="adSave">💾 פרסום</button><button class="btn sec" id="adCancel" hidden>ביטול עריכה</button></div></div></details>'+
    '<div class="card"><h2>📢 הפרסומות ('+ads.length+')</h2><p class="muted">👁 צפיות = כמה משתמשים <b>מחוברים</b> שונים ראו את הפרסומת, כל אחד נספר פעם אחת ביום (גם אם ראה אותה כמה פעמים). אורחים בלי חשבון לא רואים פרסומות ולא נספרים.</p>'+(ads.map(a=>'<div class="item" data-id="'+a.id+'"><div class="row" style="align-items:center">'+(safeImg(a.image)?'<img src="'+esc(safeImg(a.image))+'" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px;flex:0 0 auto;min-width:0">':'')+(safeVideo(a.video)?'<span class="pill">🎬 וידאו</span>':'')+'<div style="min-width:160px"><b>'+esc(a.title||'(ללא כותרת)')+'</b><div class="muted">'+esc(a.advertiser||'')+' · '+({popup:'פופאפ',banner:'באנר',side:'קבועה בצד'}[a.placement]||a.placement)+(a.placement!=='side'&&AD_FREQS.includes(a.freq)?' · ⏱️ '+{day:'פעם ביום',session:'בכל כניסה',load:'בכל ריענון'}[a.freq]:'')+(AD_PAGES[a.page]?' · רק ב'+AD_PAGES[a.page]:'')+(a.audience==='admins'?' · 🛠️ רק מנהלים':a.audience==='all'?' · 👥 כולם':'')+' · <span class="pill">'+status(a)+'</span></div><div class="muted">👁 '+a.views+' צפיות · 👆 '+a.clicks+' לחיצות'+(a.views?' ('+Math.round(a.clicks*100/a.views)+'%)':'')+'</div></div>'+
      '<button class="btn sm sec" data-act="edit">✏️ עריכה</button><button class="btn sm sec" data-act="toggle">'+(a.active?'⏸ כיבוי':'▶ הפעלה')+'</button><button class="btn sm bad" data-act="del">🗑️</button></div></div>').join('')||'<p class="muted">עוד אין פרסומות</p>')+'</div>';
  {const phCur=()=>({title:$('#phTitle').value.trim(),body:$('#phBody').value.trim(),emoji:$('#phEmoji').value.trim(),theme:$('#phTheme').value,advertiser:'ים שופינג',link_url:PH_LINK,id:ph?ph.id:'preview'});
    const phDraw=()=>{const a=phCur(),w=$('#phmSide');const keep=w.className;w.innerHTML='<button class="ybsTab" type="button" tabindex="-1">'+esc(adEmoji(a)||'📢')+'<span>פרסומת</span></button><div class="ybsBody">'+adHtml(a).replace(/data-adclick="[^"]*"/g,'data-adclick="preview"')+'</div>';w.className=keep||'phmSide open';};
    ['#phTitle','#phBody','#phEmoji','#phTheme'].forEach(x=>$(x).addEventListener('input',phDraw));phDraw();
    $('#phDef').onclick=()=>{$('#phTitle').value=PH_DEF.title;$('#phBody').value=PH_DEF.body;$('#phEmoji').value=PH_DEF.emoji;$('#phTheme').value=PH_DEF.theme;phDraw();flash('📝 הטקסט המומלץ הוחזר. ללחוץ על "שמירה" כדי שיעלה לאתר');};
    let phT=[];const phDemo=()=>{phT.forEach(clearTimeout);const w=$('#phmSide');w.className='phmSide';const n=Math.max(3,+$('#phPop').value||4);
      phT=[setTimeout(()=>{w.className='phmSide open pop';},500),setTimeout(()=>{w.className='phmSide open pop closing';},500+n*1000),setTimeout(()=>{w.className='phmSide nudge';},950+n*1000),setTimeout(()=>{w.className='phmSide';},2700+n*1000)];};
    $('#phDemo').onclick=phDemo;$('#phmSide').onclick=e=>{const w=$('#phmSide');if(e.target.closest('.ybsTab')){phT.forEach(clearTimeout);w.className='phmSide open';}};
    if(ph)(async()=>{try{const since=ph.created_at;const q=st=>{let r=sb.from('product_photos').select('id',{count:'exact',head:true}).gte('created_at',since);return st?r.eq('status',st):r;};
      const [all,pend,okk]=await Promise.all([q(''),q('pending'),q('approved')]);const el=$('#phPhotos');if(el)el.textContent='📷 מאז שהפרסומת עלתה: '+(all.count||0)+' תמונות נשלחו · '+(okk.count||0)+' אושרו · '+(pend.count||0)+' ממתינות לאישור';}catch(e){const el=$('#phPhotos');if(el)el.remove();}})();
    $('#phSave').onclick=async()=>{const a=phCur();delete a.id;if(!a.title&&!a.emoji){flash('צריך לפחות כותרת או אימוג\'י');return;}
      const end=$('#phEnd').value;Object.assign(a,{placement:'side',close_after:0,active:$('#phOn').checked,audience:$('#phTest').checked?'admins':'all',ends_at:end?new Date(end+'T23:59:00').toISOString():null});
      const {error}=ph?await sb.from('ads').update(a).eq('id',ph.id):await sb.from('ads').insert(a);if(error){flash('⚠️ '+error.message);return;}
      const n=+$('#phPop').value||0;if(adc.side_pop!==n){await setCfg('ads',{...adc,side_pop:n},'💾');adSidePop=n;}
      flash(a.active?'📸 נשמר, והפרסומת בצד באוויר':'💾 נשמר (כבויה)');try{loadAds(true);}catch(e){}show('ads');};
    if(ph){$('#phToggle').onclick=async()=>{if(await ok(sb.from('ads').update({active:!ph.active}).eq('id',ph.id),ph.active?'⏸ הפרסומת כובתה':'▶ הפרסומת הודלקה')){try{loadAds(true);}catch(e){}show('ads');}};
      $('#phDel').onclick=async()=>{if(!(await uiConfirm('למחוק את הפרסומת בצד לגמרי? (אפשר גם רק לכבות אותה)')))return;if(await ok(sb.from('ads').delete().eq('id',ph.id),'🗑️ הפרסומת נמחקה')){try{loadAds(true);}catch(e){}show('ads');}};
      $('#phLive').onclick=async()=>{try{await loadAds(true);}catch(e){}const bo=document.querySelector('#bo');const x=document.querySelector('#boClose,#boX,[data-boclose]');if(x)x.click();else if(bo)bo.classList.add('hidden');
        try{setTab('list');}catch(e){}setTimeout(()=>{if(!window.sidePopNow())flash('⚠️ הפרסומת לא נטענה אצלך: בדוק שהיא דולקת ושמותר לך לראות פרסומות');},700);};}}
  const cur=()=>({title:$('#adTitle').value.trim(),advertiser:$('#adAdv').value.trim(),body:$('#adBody').value.trim(),image:imgData||$('#adImgUrl').value.trim(),link_url:$('#adLink').value.trim(),placement:$('#adPlace').value,close_after:Math.max(0,Math.min(30,+$('#adClose').value||0)),starts_at:$('#adStart').value?new Date($('#adStart').value).toISOString():null,ends_at:$('#adEnd').value?new Date($('#adEnd').value).toISOString():null,active:$('#adActive').checked,
    /* אימוג'י וצבע נשלחים רק כשנבחרו — כך השמירה עובדת גם לפני שמריצים את ה-SQL החדש */
    ...($('#adEmoji').value.trim()?{emoji:$('#adEmoji').value.trim()}:{}),...($('#adTheme').value?{theme:$('#adTheme').value}:{}),...(videoUrl||hadVideo?{video:videoUrl}:{}),...($('#adFreqOne').value||hadFreq?{freq:$('#adFreqOne').value}:{}),...($('#adPageOne').value||hadPage?{page:$('#adPageOne').value}:{}),...($('#adAudOne').value||hadAud?{audience:$('#adAudOne').value}:{})});
  /* הודעת שגיאה נשארת על המסך (לא רק הודעה קופצת שנעלמת אחרי שנייה) */
  const vidSync=(msg)=>{const i=$('#adVidInfo');const ok=videoUrl?'✅ 🎬 '+(vidName||decodeURIComponent(videoUrl.split('/').pop())):'אין וידאו';i.textContent=msg?(videoUrl?ok+' · ':'')+msg:ok;i.style.color=msg?'#c0392b':'';$('#adVidClear').hidden=!videoUrl;};
  /* בודקים שהדפדפן מצליח לנגן את הסרטון לפני שמעלים (למשל HEVC מאייפון לא מתנגן בכרום במחשב) */
  const canPlay=f=>new Promise(res=>{const v=document.createElement('video'),u=URL.createObjectURL(f);let done=false;const end=ok=>{if(done)return;done=true;URL.revokeObjectURL(u);res(ok);};
    v.muted=true;v.preload='metadata';v.onloadedmetadata=()=>end(v.videoWidth>0);v.onerror=()=>end(false);setTimeout(()=>end(true),8000);v.src=u;});
  const preview=()=>{const a=cur();$('#ybPreview').innerHTML='<div class="ybcard" style="animation:none;box-shadow:none;border:1px solid var(--line)">'+adHtml({...a,id:'preview'})+'</div>';};
  ['#adTitle','#adAdv','#adBody','#adImgUrl','#adLink','#adEmoji','#adTheme'].forEach(x=>$(x).addEventListener('input',preview));
  const goSync=()=>{const act=adAction($('#adLink').value.trim());$('#adGo').value=act||($('#adLink').value.trim()?'url':'');$('#adLinkBox').hidden=$('#adGo').value!=='url';};
  $('#adGo').onchange=()=>{const g=$('#adGo').value;$('#adLink').value=g==='url'?(adAction($('#adLink').value.trim())?'':$('#adLink').value):g?'https://www.yamshopping.com/?a='+g:'';$('#adLinkBox').hidden=g!=='url';preview();if(g==='url')$('#adLink').focus();};
  $('#adTpl').onclick=e=>{const b=e.target.closest('[data-tpl]');if(!b)return;const t=AD_TPL[+b.dataset.tpl];$('#adTitle').value=t.title;$('#adBody').value=t.body;$('#adEmoji').value=t.emoji;$('#adTheme').value=t.theme;imgData='';$('#adImgUrl').value='';$('#adFile').value='';preview();};
  $('#adFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{imgData=await shrinkImage(f);$('#adImgUrl').value='';preview();flash('🖼️ התמונה נטענה ('+Math.round(imgData.length/1024)+'KB)');}catch(err){flash('⚠️ לא הצלחתי לקרוא את התמונה');}};
  $('#adImgClear').onclick=()=>{imgData='';$('#adImgUrl').value='';$('#adFile').value='';preview();};
  /* 🎬 הסרטון עולה ל-Supabase Storage (דלי clips), ובפרסומת נשמרת רק הכתובת */
  $('#adVidFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;
    /* יש מחשבים/טלפונים שלא מוסרים את סוג הקובץ — אז לפי הסיומת */
    const typ=/^video\/(mp4|webm)$/.test(f.type)?f.type:/\.mp4$/i.test(f.name)?'video/mp4':/\.webm$/i.test(f.name)?'video/webm':'';
    /* הודעות השגיאה נשארות על המסך (הודעה קופצת נעלמת אחרי שנייה, ואז נראה כאילו לא נבחר קובץ) */
    if(!typ){vidSync('⚠️ "'+f.name+'" לא עלה: אפשר להעלות רק MP4 או WebM'+(/\.mov$/i.test(f.name)?' (קובץ MOV מאייפון צריך לייצא קודם ל-MP4)':''));e.target.value='';return;}
    if(f.size>50*1024*1024){vidSync('⚠️ "'+f.name+'" לא עלה: הסרטון גדול מ-50MB. אפשר לכווץ אותו ולנסות שוב');e.target.value='';return;}
    const name=Date.now()+'-'+Math.random().toString(36).slice(2,8)+(typ==='video/webm'?'.webm':'.mp4');
    $('#adVidInfo').textContent='⏳ בודק את הסרטון...';$('#adVidInfo').style.color='';$('#adSave').disabled=true;let msg='',done=false;
    try{const playable=await canPlay(f);
      $('#adVidInfo').textContent='⏳ מעלה את הסרטון ('+Math.round(f.size/1048576*10)/10+'MB)...';
      const {error}=await sb.storage.from(VID_BUCKET).upload(name,f,{contentType:typ,cacheControl:'31536000',upsert:false});
      if(error)throw error;videoUrl=sb.storage.from(VID_BUCKET).getPublicUrl(name).data.publicUrl;vidName=f.name;done=true;
      /* בעריכת פרסומת קיימת הסרטון נשמר בה מיד, כדי שלא ייעלם אם מרעננים בלי ללחוץ על "שמירת שינויים" */
      if(editing){const {error:e2}=await sb.from('ads').update({video:videoUrl}).eq('id',editing);if(e2)throw e2;hadVideo=true;const o=ads.find(x=>x.id===editing);if(o)o.video=videoUrl;flash('🎬 הסרטון עלה ונשמר בפרסומת');}
      else{msg='⚠️ הסרטון עלה, אבל עוד לא נשמר: צריך ללחוץ על "💾 פרסום" למטה. בלי זה הוא ייעלם ברענון.';flash('🎬 הסרטון עלה. עכשיו ללחוץ על "💾 פרסום"');}
      if(!playable)msg=(msg?msg+' ':'')+'⚠️ הסרטון עלה, אבל הדפדפן הזה לא מצליח לנגן אותו. כדאי MP4 רגיל (H.264), למשל לייצא אותו שוב מתוכנת העריכה.';}
    catch(err){const m=String(err&&err.message||err);console.warn('ad video upload failed',err);
      /* נרשם גם ביומן התקלות, כדי שיהיה אפשר לראות בדיוק מה השרת ענה */
      try{sb.rpc('log_client_error',{p_msg:('העלאת סרטון פרסומת נכשלה: '+m).slice(0,500),p_src:'adVidFile · '+f.name.slice(0,80)+' · '+typ+' · '+Math.round(f.size/1024)+'KB',p_ua:navigator.userAgent.slice(0,200),p_ver:String(typeof APP_VERSION!=='undefined'?APP_VERSION:'')}).then(()=>{},()=>{});}catch(e){}
      msg=/bucket|not found|row-level|policy|unauthorized|403|column|schema cache|ads_video_check/i.test(m)?'⚠️ הסרטון לא עלה: צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית), ואז לנסות שוב. ('+m.slice(0,80)+')'
        :'⚠️ הסרטון לא עלה: '+m.slice(0,140);flash(msg);}
    finally{$('#adSave').disabled=false;if(!done)e.target.value='';vidSync(msg);preview();}};
  $('#adVidClear').onclick=()=>{videoUrl='';vidName='';$('#adVidFile').value='';vidSync();preview();};
  const fill=a=>{editing=a?a.id:null;$('#adFormTitle').textContent=a?'✏️ עריכת פרסומת':'➕ פרסומת חדשה';$('#adTitle').value=a?a.title:'';$('#adAdv').value=a?a.advertiser:'';$('#adBody').value=a?a.body:'';imgData=a&&a.image.startsWith('data:')?a.image:'';$('#adImgUrl').value=a&&!a.image.startsWith('data:')?a.image:'';$('#adLink').value=a?a.link_url:'';$('#adPlace').value=a?a.placement:'popup';$('#adClose').value=a?a.close_after:5;$('#adStart').value=a?toLocal(a.starts_at):'';$('#adEnd').value=a?toLocal(a.ends_at):'';$('#adActive').checked=a?a.active:true;$('#adEmoji').value=a&&a.emoji||'';$('#adTheme').value=a&&a.theme||'';$('#adFreqOne').value=a&&AD_FREQS.includes(a.freq)?a.freq:'';hadFreq=!!(a&&a.freq);$('#adPageOne').value=a&&AD_PAGES[a.page]?a.page:'';hadPage=!!(a&&a.page);$('#adAudOne').value=a&&['all','admins'].includes(a.audience)?a.audience:'';hadAud=!!(a&&a.audience);videoUrl=a&&safeVideo(a.video)||'';vidName='';hadVideo=!!(a&&a.video);$('#adVidFile').value='';vidSync();$('#adCancel').hidden=!a;$('#adSave').textContent=a?'💾 שמירת שינויים':'💾 פרסום';goSync();preview();};
  fill(null);
  $('#adCancel').onclick=()=>fill(null);
  $('#adSave').onclick=async()=>{const a=cur();
    if(!a.title&&!a.image&&!a.emoji&&!a.video){flash('צריך לפחות כותרת, אימוג\'י, תמונה או וידאו');return;}
    if(a.link_url&&!/^https?:\/\//i.test(a.link_url)){flash('הקישור צריך להתחיל ב-https://');return;}
    if(a.image&&!safeImg(a.image)){flash('כתובת התמונה צריכה להתחיל ב-https://');return;}
    const q=editing?sb.from('ads').update(a).eq('id',editing):sb.from('ads').insert(a);
    const {error}=await q;
    /* שמירה שנכשלה: ההסבר נשאר על המסך (הודעה קופצת נעלמת אחרי שנייה, ואז נראה כאילו נשמר) */
    if(error){const m=String(error.message||error);flash('⚠️ '+m+(/column|schema cache/i.test(m)?' · צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית)':''));if(a.video)vidSync('⚠️ הפרסומת לא נשמרה'+(/column|schema cache|video/i.test(m)?': צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית). ':': ')+'('+m.slice(0,100)+')');return;}
    flash(editing?'💾 נשמר':'📢 הפרסומת עלתה לאוויר');show('ads');};
  $('#adAud').onchange=async e=>{
    if(e.target.id==='adFreqSel'){const f=e.target.value;if(!['day','session','load'].includes(f))return;if(await setCfg('ads',{...adc,freq:f},'⏱️ '+({day:'פעם ביום',session:'בכל כניסה',load:'בכל ריענון'}[f]))){adc.freq=f;adFreq=f;}return;}
    if(e.target.id==='adHouseChk'){const h=e.target.checked;if(await setCfg('ads',{...adc,house:h},h?'📢 בצד תמיד תהיה פרסומת':'הצד יהיה ריק כשאין פרסומת')){adc.house=h;adHouse=h;}return;}
    const v=e.target.value;if(!['all','admins','none'].includes(v))return;if(await setCfg('ads',{...adc,audience:v},v==='all'?'👥 הפרסומות מוצגות לכולם':v==='admins'?'🛠️ הפרסומות מוצגות רק למנהלים':'🚫 הפרסומות כבויות לכולם')){adc.audience=v;adsAudience=v;if(v==='none')hideAds();}};
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=b.closest('[data-id]').dataset.id;const a=ads.find(x=>x.id===id);
    if(b.dataset.act==='edit'){if(a&&a===ph){$('#phCard').scrollIntoView({behavior:'smooth'});return;}fill(a);$('#adMore').open=true;$('#adFormTitle').scrollIntoView({behavior:'smooth'});return;}
    if(b.dataset.act==='toggle'&&await ok(sb.from('ads').update({active:!a.active}).eq('id',id),a.active?'⏸ כובתה':'▶ הופעלה'))show('ads');
    if(b.dataset.act==='del'&&(await uiConfirm('למחוק את הפרסומת?'))&&await ok(sb.from('ads').delete().eq('id',id),'🗑️ נמחקה')){
      const v=safeVideo(a.video);if(v&&!ads.some(x=>x.id!==id&&x.video===v))sb.storage.from(v.includes('/public/clips/')?'clips':'ad-videos').remove([v.split('/').pop()]).then(()=>{},()=>{});show('ads');}};
};
/* מקטין תמונה לפני השמירה (עד 900 פיקסלים רוחב) כדי שתיטען מהר גם בטלפון */
function shrinkImage(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const img=new Image();
  img.onload=()=>{const max=900;let w=img.naturalWidth,h=img.naturalHeight;if(w>max){h=Math.round(h*max/w);w=max;}
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
    let q=0.85,d=c.toDataURL('image/jpeg',q);while(d.length>1400000&&q>0.4){q-=0.1;d=c.toDataURL('image/jpeg',q);}res(d);};
  img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('bad image'));};img.src=url;});}

VIEWS.updates=async function(){
  const {data}=await sb.from('site_updates').select('*').order('created_at',{ascending:false}).limit(100);
  const ups=data||[];
  const {count:total}=await sb.from('profiles').select('*',{count:'exact',head:true});
  const reads=await Promise.all(ups.map(u=>sb.rpc('update_read_count',{p_id:u.id}).then(r=>r.data||0,()=>0)));
  $('#boMain').innerHTML='<div class="card"><h2>🆕 עדכון חדש לכל המשתמשים</h2><p class="muted">כל משתמש יראה את העדכון פעם אחת, בחלון קטן אחרי הכניסה. כפתור "קראתי" נפתח רק אחרי שגוללים עד הסוף, ואפשר גם "אחר כך" — כך זה לא מציק. משתמשים חדשים לא יראו עדכונים ישנים.</p>'+
    '<label>כותרת</label><input id="upTitle" maxlength="120" placeholder="למשל: חדש! פרסומות ומבצעים מהרשתות"><label>תוכן העדכון</label><textarea id="upBody" maxlength="6000" style="min-height:140px" placeholder="מה חדש, מה השתנה, איך משתמשים..."></textarea><button class="btn" id="upSend" style="margin-top:8px">📣 פרסום לכולם</button></div>'+
    '<div class="card"><h2>📜 עדכונים שפורסמו</h2>'+(ups.map((u,i)=>'<div class="item" data-id="'+u.id+'"><b>'+esc(u.title)+'</b> <span class="pill">'+(u.active?'פעיל':'כבוי')+'</span><div class="muted">'+fmt(u.created_at)+' · ✔ קראו ואישרו: '+reads[i]+(total?' מתוך '+total:'')+'</div><p style="white-space:pre-wrap;margin:6px 0;font-size:14px">'+esc(u.body)+'</p><div class="row"><button class="btn sm sec" data-act="toggle">'+(u.active?'⏸ הסתרה':'▶ הצגה')+'</button><button class="btn sm bad" data-act="del">🗑️</button></div></div>').join('')||'<p class="muted">עוד אין עדכונים</p>')+'</div>';
  $('#upSend').onclick=async()=>{const t=$('#upTitle').value.trim(),b=$('#upBody').value.trim();if(!t||!b){flash('צריך כותרת ותוכן');return;}
    if(await ok(sb.from('site_updates').insert({title:t,body:b}),'📣 העדכון פורסם — יוצג לכל משתמש בכניסה הבאה'))show('updates');};
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=b.closest('[data-id]').dataset.id;const u=ups.find(x=>x.id===id);
    if(b.dataset.act==='toggle'&&await ok(sb.from('site_updates').update({active:!u.active}).eq('id',id)))show('updates');
    if(b.dataset.act==='del'&&(await uiConfirm('למחוק את העדכון?'))&&await ok(sb.from('site_updates').delete().eq('id',id),'🗑️ נמחק'))show('updates');};
};

/* 🔐 אימות דו-שלבי לחשבון הזה: קוד מתחלף מאפליקציית Authenticator. אחרי ההפעלה, בלי הקוד אין הרשאות ניהול (נבדק גם במסד) */
VIEWS.mfa=async function(){
  const {data:f,error}=await sb.auth.mfa.listFactors();if(error){$('#boMain').innerHTML='<div class="card">⚠️ '+esc(error.message)+'</div>';return;}
  const on=((f&&f.totp)||[]).find(x=>x.status==='verified');
  $('#boMain').innerHTML='<div class="card"><h2>🔐 אימות דו-שלבי</h2>'+(on
    ?'<p>✔️ <b>פעיל בחשבון הזה.</b> בכל כניסה חדשה תתבקש להקליד את הקוד מהאפליקציה. בלי הקוד האתר עובד, אבל בלי הרשאות ניהול.</p><p class="muted">מחליפים טלפון? קודם לבטל כאן ולהפעיל מחדש עם הטלפון החדש, ורק אחר כך למחוק את האפליקציה מהטלפון הישן.</p><button class="btn sec" data-mfaoff>ביטול האימות הדו-שלבי</button>'
    :'<p>כך גם מי שגילה את הסיסמה שלך לא יוכל להיכנס לבק אופיס. צריך אפליקציה בחינם: בטלפון <b>Google Authenticator</b>, ובמחשב התוסף <b>Authenticator</b> לכרום (authenticator.cc). במחשב מקלידים את המפתח שבשלב 2 במקום לסרוק.</p><button class="btn" data-mfaon>הפעלה</button><div id="mfaEnroll"></div>')+'</div><div id="mfaTeam"></div>';
  if(isOwner()){const [{data:st},{data:off}]=await Promise.all([sb.rpc('mfa_staff_status'),sb.rpc('mfa_global_off')]);
    $('#mfaTeam').innerHTML='<div class="card"><h2>🎚️ מתג לכל האתר</h2><p>'+(off?'⚠️ <b>האימות הדו-שלבי כבוי כרגע לכל האתר.</b> סיסמה לבד מספיקה לכל הצוות, גם למי שהפעיל קוד.':'✔️ <b>האימות הדו-שלבי פועל</b> לכל מי שהפעיל אותו.')+'</p><p class="muted">מטעמי אבטחה אי אפשר לכבות את האימות הדו-שלבי לכל הצוות בבת אחת. מי שאיבד טלפון — "איפוס" למטה, רק לו.</p>'+(off?'<button class="btn" data-mfaglobal="on">הדלקה מחדש לכל האתר</button>':'')+'</div>'+
      '<div class="card"><h2>👮 אימות דו-שלבי בצוות</h2><p class="muted">איש צוות החליף או איבד טלפון? לוחצים "איפוס", והוא נכנס עם הסיסמה בלבד ומפעיל מחדש מהטלפון החדש.</p><div class="tw"><table><thead><tr><th>מי</th><th>מייל</th><th>מצב</th><th></th></tr></thead><tbody>'+
      (st||[]).map(r=>'<tr><td>'+esc(r.name||'—')+'</td><td dir="ltr">'+esc(r.email)+'</td><td>'+(r.enrolled?'✔️ פעיל':'<span class="muted">לא הופעל</span>')+'</td><td>'+(r.enrolled?'<button class="btn sm sec" data-mfareset="'+esc(r.user_id)+'" data-mfaname="'+esc(r.name||r.email)+'">איפוס</button>':'')+'</td></tr>').join('')+'</tbody></table></div>'+
      '<details style="margin-top:10px"><summary>איבדת את הטלפון שלך עצמך ואין לך דרך להיכנס?</summary><p>נכנסים ל-Supabase ← SQL Editor ומריצים את השורה הזאת (היא מוחקת את האימות הדו-שלבי רק מחשבונות הבעלים):</p><pre dir="ltr" style="white-space:pre-wrap;user-select:all">delete from auth.mfa_factors where user_id in (select id from auth.users where raw_app_meta_data->>\'yam_owner\' = \'true\');</pre><p>אחר כך נכנסים לאתר עם הסיסמה, ומפעילים מחדש מכאן.</p></details></div>';}
  $('#boMain').onclick=async e=>{
    const gl=e.target.closest('[data-mfaglobal]');
    if(gl){const off=gl.dataset.mfaglobal==='off';if(off&&!(await uiConfirm('לכבות את האימות הדו-שלבי לכל האתר? עד שתדליק שוב, סיסמה לבד תספיק לכל הצוות.')))return;
      const {error:er}=await sb.rpc('mfa_set_off',{p_off:off});if(er){flash('⚠️ '+er.message);return;}flash(off?'כובה לכל האתר':'✔️ הודלק מחדש');VIEWS.mfa();return;}
    const rs=e.target.closest('[data-mfareset]');
    if(rs){if(!(await uiConfirm('לאפס את האימות הדו-שלבי של '+rs.dataset.mfaname+'? בכניסה הבאה הסיסמה תספיק, עד שיפעיל מחדש.')))return;
      const {error:er}=await sb.rpc('mfa_reset',{p_user:rs.dataset.mfareset});if(er){flash('⚠️ '+er.message);return;}
      if(rs.dataset.mfareset===(authUser&&authUser.id))await sb.auth.refreshSession();flash('✔️ אופס');VIEWS.mfa();return;}
    if(e.target.closest('[data-mfaoff]')){if(!(await uiConfirm('לבטל את האימות הדו-שלבי? החשבון יהיה מוגן רק בסיסמה.')))return;
      const {error:er}=await sb.auth.mfa.unenroll({factorId:on.id});if(er){flash('⚠️ '+er.message);return;}await sb.auth.refreshSession();flash('בוטל');VIEWS.mfa();return;}
    const onB=e.target.closest('[data-mfaon]');
    if(onB){onB.disabled=true;
      for(const x of ((f&&f.all)||[]).filter(x=>x.status!=='verified'))await sb.auth.mfa.unenroll({factorId:x.id}).catch(()=>{});
      const {data:en,error:er}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'yamshopping-'+Date.now().toString(36)});if(er){onB.disabled=false;flash('⚠️ '+er.message);return;}
      onB.hidden=true;
      $('#mfaEnroll').innerHTML='<ol class="steps"><li>בטלפון: ➕ ← סריקת קוד QR, ולסרוק את הקוד הזה:<br><img src="'+esc(en.totp.qr_code)+'" alt="קוד QR" style="width:200px;height:200px;background:#fff;padding:8px;border-radius:6px"></li><li>במחשב, או כשאי אפשר לסרוק: בתוסף לוחצים ➕ ← Manual Entry, ומדביקים ב-Secret את המפתח: <code dir="ltr">'+esc(en.totp.secret)+'</code></li><li>להקליד כאן את הקוד בן 6 הספרות שמופיע באפליקציה:<br><input id="mfaFirst" inputmode="numeric" maxlength="6" dir="ltr" style="max-width:160px;font-size:20px;letter-spacing:4px"> <button class="btn" data-mfaverify="'+esc(en.id)+'">אישור</button></li></ol>';return;}
    const v=e.target.closest('[data-mfaverify]');if(v){const code=($('#mfaFirst').value||'').replace(/\D/g,'');if(code.length!==6){flash('צריך 6 ספרות');return;}
      const {error:er}=await sb.auth.mfa.challengeAndVerify({factorId:v.dataset.mfaverify,code});if(er){flash('⚠️ הקוד לא נכון — נסו את הקוד הבא באפליקציה');return;}
      flash('✔️ האימות הדו-שלבי הופעל');VIEWS.mfa();}
  };
};
VIEWS.staff=async function(){
  const {data,error}=await sb.rpc('staff_list');const list=data||[];const own=isOwner();
  const roleHe={admin:'מנהל',moderator:'צוות פיקוח'};
  $('#boMain').innerHTML=(own?'<div class="card"><h2>👮 הוספת איש צוות</h2><p class="muted">האדם צריך להירשם לאתר קודם. אחר כך כותבים כאן את המייל שאיתו נרשם.<br><b>מנהל</b> — יכול כמעט הכל: משתמשים, פרסומות, עדכונים, הגדרות, AI (רק אתה יכול להוסיף ולהסיר צוות).<br><b>צוות פיקוח</b> — אישור מתכונים ולימודי בוט, רשתות וסניפים, ומחיקת מחירים שגויים. לא רואה מיילים של משתמשים.</p>'+
    '<div class="row"><input id="stEmail" type="email" dir="ltr" placeholder="המייל של איש הצוות"><select id="stRole" style="max-width:180px"><option value="moderator">צוות פיקוח</option><option value="admin">מנהל</option></select><button class="btn" id="stAdd">הוספה</button></div></div>':'<div class="card"><p class="muted">רק בעל האתר יכול להוסיף או להסיר אנשי צוות.</p></div>')+
    '<div class="card"><h2>הצוות ('+list.length+')</h2>'+(error?'<p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית"</p>':'')+(list.length?'<div class="tw"><table><thead><tr><th>שם</th><th>מייל</th><th>תפקיד</th><th>נוסף</th><th></th></tr></thead><tbody>'+list.map(x=>'<tr data-id="'+x.user_id+'"><td>'+esc(x.name)+'</td><td dir="ltr" style="text-align:right">'+esc(x.email)+'</td><td>'+(roleHe[x.role]||x.role)+'</td><td>'+fmt(x.added_at)+'</td><td>'+(own?'<button class="btn sm bad" data-rm>הסרה</button>':'')+'</td></tr>').join('')+'</tbody></table></div>':'<p class="muted">עוד אין אנשי צוות — רק אתה.</p>')+'</div>';
  if(own){
    $('#stAdd').onclick=async()=>{const em=$('#stEmail').value.trim();if(!em)return;
      const {data:r,error:e}=await sb.rpc('staff_add',{p_email:em,p_role:$('#stRole').value});
      const msg={ok:'✅ נוסף לצוות',not_found:'⚠️ לא נמצא משתמש עם המייל הזה — הוא צריך להירשם לאתר קודם',owner:'זה אתה 🙂',forbidden:'⛔ רק בעל האתר יכול להוסיף צוות',bad_role:'תפקיד לא תקין'};
      flash(e?'⚠️ '+e.message:(msg[r]||r));if(r==='ok')show('staff');};
    $('#boMain').onclick=async e=>{const b=e.target.closest('[data-rm]');if(!b)return;const id=b.closest('[data-id]').dataset.id;
      if((await uiConfirm('להסיר את איש הצוות?'))&&await ok(sb.rpc('staff_remove',{p_user:id}),'✔ הוסר'))show('staff');};
  }
};

VIEWS.stores=async function(){
  const {data,error}=await sb.rpc('store_manager_list');const list=data||[];
  $('#boMain').innerHTML='<datalist id="smChains">'+allChainNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist><datalist id="smBranches">'+allBranches().map(b=>'<option value="'+esc(b.city+(b.address?' — '+b.address:''))+'">').join('')+'</datalist>'+
    '<div class="card"><h2>🏪 הוספת בעל סופר / אחראי סופר</h2><p class="muted">יש שלושה סוגי משתמשים: <b>לקוח רגיל</b>, <b>בעל סופר</b> ו<b>אחראי סופר</b>. בעל/אחראי סופר מעדכן מחירים רק בסופר שלו, והמחירים שלו מסומנים "✔ רשמי". אתה מחליט אם המחירים שלו עולים מיד או מחכים לאישורך. האדם צריך להירשם לאתר קודם.</p>'+
    '<div class="row"><input id="smEmail" type="email" dir="ltr" placeholder="המייל שאיתו נרשם"><input id="smChain" list="smChains" placeholder="רשת / חנות"><input id="smBranch" list="smBranches" placeholder="סניף (ריק = כל הסניפים של הרשת)"><select id="smTitle" style="max-width:150px"><option value="owner">בעל סופר</option><option value="manager">אחראי סופר</option></select></div>'+
    '<div class="check"><input type="checkbox" id="smAuto"><label for="smAuto" style="margin:0;color:var(--text)">המחירים שלו עולים מיד, בלי אישור שלי</label></div><button class="btn" id="smAdd">שמירה</button></div>'+
    '<div class="card"><h2>בעלי ואחראי סופרים ('+list.length+')</h2>'+(error?'<p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית"</p>':'')+(list.length?'<div class="tw"><table><thead><tr><th>שם</th><th>מייל</th><th>סופר</th><th>תפקיד</th><th>עולה מיד?</th><th></th></tr></thead><tbody>'+list.map(x=>'<tr data-id="'+x.user_id+'"><td>'+esc(x.name)+'</td><td dir="ltr" style="text-align:right">'+esc(x.email)+'</td><td>'+esc(x.chain)+(x.branch?' — '+esc(x.branch):' (כל הסניפים)')+'</td><td>'+(x.title==='owner'?'בעל סופר':'אחראי סופר')+'</td><td><label style="margin:0;display:flex;gap:6px;align-items:center;color:var(--text)"><input type="checkbox" data-auto '+(x.auto_approve?'checked':'')+' style="width:auto"> '+(x.auto_approve?'כן':'באישורי')+'</label></td><td><button class="btn sm bad" data-rm>הסרה</button></td></tr>').join('')+'</tbody></table></div>':'<p class="muted">עוד אין</p>')+'</div>';
  $('#smAdd').onclick=async()=>{const {data:r,error:e}=await sb.rpc('store_manager_set',{p_email:$('#smEmail').value.trim(),p_chain:$('#smChain').value.trim(),p_branch:$('#smBranch').value.trim(),p_title:$('#smTitle').value,p_auto:$('#smAuto').checked});
    const msg={ok:'✅ נשמר',not_found:'⚠️ לא נמצא משתמש עם המייל הזה — הוא צריך להירשם לאתר קודם',forbidden:'⛔ אין הרשאה',bad_chain:'צריך לבחור רשת'};flash(e?'⚠️ '+e.message:(msg[r]||r));if(r==='ok')show('stores');};
  $('#boMain').onchange=async e=>{if(!e.target.matches('[data-auto]'))return;const id=e.target.closest('[data-id]').dataset.id;if(await ok(sb.rpc('store_manager_auto',{p_user:id,p_auto:e.target.checked}),e.target.checked?'✔ יעלה מיד':'✔ יעבור דרכך'))show('stores');};
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-rm]');if(!b)return;const id=b.closest('[data-id]').dataset.id;if((await uiConfirm('להסיר?'))&&await ok(sb.rpc('store_manager_remove',{p_user:id}),'✔ הוסר — חזר להיות לקוח רגיל'))show('stores');};
};

VIEWS.reporters=async function(){
  const {data,error}=await sb.rpc('reporter_scores');const list=data||[];
  $('#boMain').innerHTML='<div class="card"><h2>⭐ דירוג המדווחים</h2><p class="muted">זה אותו מוניטין שקובע פרו (הערכים נקבעים ב⭐ מוניטין ופרו): דיווח מאושר +'+repPts('pts_price')+', אישור ממשתמש אחר +'+repPts('pts_confirm')+', תמונה +'+repPts('pts_photo')+', וגם חברים ושיתופים. אפשר להוסיף או להוריד בונוס. תגים: 🥉 5 · 🥈 15 · 🥇 40 · 💎 70 — מוצגים ליד השם בכל מחיר.</p>'+(error?'<p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL</p>':'')+
    (list.length?'<div class="tw"><table><thead><tr><th>#</th><th>מדווח</th><th>דיווחים</th><th>אישורים</th><th>בונוס</th><th>מוניטין</th><th></th></tr></thead><tbody>'+list.map((r,i)=>'<tr data-id="'+r.user_id+'"><td>'+(i+1)+'</td><td>'+esc(r.name)+' '+repBadge(r.score)+'</td><td>'+r.reports+'</td><td>'+r.confirms+'</td><td>'+r.bonus+'</td><td><b>'+r.score+'</b></td><td style="white-space:nowrap"><button class="btn sm" data-d="5">+'+5*repPts('pts_bonus')+'</button> <button class="btn sm sec" data-d="-5">−'+5*repPts('pts_bonus')+'</button></td></tr>').join('')+'</tbody></table></div>':'<p class="muted">עוד אין דיווחים</p>')+'</div>';
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-d]');if(!b)return;const id=b.closest('[data-id]').dataset.id;if(await ok(sb.rpc('rep_bonus_add',{p_user:id,p_delta:+b.dataset.d}),'✔ עודכן'))show('reporters');};
};

VIEWS.backup=async function(){
  const own=isOwner();
  $('#boMain').innerHTML='<div class="card"><h2>💾 גיבוי מלא של האתר</h2><p class="muted">מוריד קובץ אחד עם כל הנתונים: הגדרות, מתכונים, ידע הבוט, רשתות וסניפים, מחירים, פרסומות, עדכונים, הערות, משתמשים, צוות ובעלי סופרים'+(own?', והרשימות של המשפחות':'')+'. מומלץ להוריד פעם בשבוע ולשמור במקום בטוח.</p><button class="btn" id="bkExport">⬇️ הורדת גיבוי מלא</button><div class="muted" id="bkStatus" style="margin-top:6px"></div></div>'+
    (own?'<div class="card"><h2>♻️ שחזור מגיבוי</h2><p class="muted">מחזיר נתונים מקובץ גיבוי. שורות קיימות מתעדכנות לגרסה שבקובץ, ושורות שנמחקו חוזרות. משתמשים ומייל לא משוחזרים (הם של מערכת ההתחברות).</p><input type="file" id="bkFile" accept=".json"><div class="muted" id="rsStatus" style="margin-top:6px"></div></div>':'')+
    '<div class="card"><h2>🕘 היסטוריית שינויים</h2><p class="muted">כל שינוי באתר נשמר כאן — מי שינה, מתי ומה. אפשר לשחזר גרסה קודמת בלחיצה.</p><div class="row" style="margin-bottom:8px"><select id="auTable"><option value="">כל הטבלאות</option>'+[['prices','מחירים'],['store_posts','מבצעי חנויות'],['divrei_torah','דברי תורה'],['chains','רשתות'],['branches','סניפים'],['ads','פרסומות'],['site_updates','עדכונים'],['site_config','הגדרות'],['bot_knowledge','ידע הבוט'],['staff','צוות'],['store_managers','בעלי סופרים'],['feedback','הערות']].map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select><button class="btn sec" id="auLoad">רענון</button></div><div id="auList"></div></div>';
  const TABLES=['site_config','bot_knowledge','chains','branches','prices','ads','site_updates','feedback','store_posts','divrei_torah'];
  const fetchAll=async(t)=>{let out=[],from=0;for(;;){const {data,error}=await sb.from(t).select('*').range(from,from+999);if(error)throw error;out=out.concat(data||[]);if(!data||data.length<1000)break;from+=1000;}return out;};
  $('#bkExport').onclick=async()=>{
    const st=$('#bkStatus');const dump={app:'yam-shopping',version:1,created_at:new Date().toISOString(),by:me.email,tables:{}};
    try{
      for(const t of TABLES.concat(['profiles'])){st.textContent='מגבה: '+t+'...';dump.tables[t]=await fetchAll(t);}
      st.textContent='מגבה: צוות ובעלי סופרים...';dump.tables.staff=(await sb.rpc('staff_list')).data||[];dump.tables.store_managers=(await sb.rpc('store_manager_list')).data||[];
      if(own){st.textContent='מגבה: רשימות המשפחות...';dump.tables.rooms=(await sb.rpc('backup_rooms')).data||[];}
      const n=Object.values(dump.tables).reduce((a,x)=>a+x.length,0);
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(dump)],{type:'application/json'}));a.download='yam-shopping-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();
      st.textContent='✔ הגיבוי ירד — '+n+' רשומות';
    }catch(e){st.textContent='⚠️ '+(e.message||e);}
  };
  if(own)$('#bkFile').onchange=async e=>{
    const f=e.target.files[0];if(!f)return;const st=$('#rsStatus');
    let dump;try{dump=JSON.parse(await f.text());}catch(err){st.textContent='⚠️ קובץ לא תקין';return;}
    if(!dump||dump.app!=='yam-shopping'||!dump.tables){st.textContent='⚠️ זה לא קובץ גיבוי של האתר';return;}
    if(!(await uiConfirm('לשחזר מגיבוי מ-'+fmt(dump.created_at)+'? נתונים קיימים יתעדכנו לגרסה שבקובץ.')))return;
    const pk={site_config:'key'};let done=0,fail=0;
    for(const t of TABLES){const rows=dump.tables[t]||[];for(let i=0;i<rows.length;i+=300){st.textContent='משחזר '+t+'... '+i+'/'+rows.length;const {error}=await sb.from(t).upsert(rows.slice(i,i+300),{onConflict:pk[t]||'id'});if(error){fail+=Math.min(300,rows.length-i);console.warn(t,error.message);}else done+=Math.min(300,rows.length-i);}}
    for(const r of (dump.tables.rooms||[])){const {data:okr}=await sb.rpc('restore_room',{p_code:r.code,p_owner:r.owner,p_data:r.data});okr?done++:fail++;}
    st.textContent='✔ שוחזרו '+done+' רשומות'+(fail?' · ⚠️ '+fail+' לא שוחזרו':'');loadPublicData();
  };
  const OPS={INSERT:'➕ נוסף',UPDATE:'✏️ שונה',DELETE:'🗑️ נמחק'};
  const label=r=>{const x=r.new_row||r.old_row||{};return x.name||x.title||x.product||x.question||x.key||x.chain||x.message||r.row_id||'';};
  /* הטעינה לוקחת רגע — אם בינתיים עברו ללשונית אחרת בבק אופיס, הרשימה כבר לא על המסך ואין מה לעדכן */
  const loadAudit=async()=>{
    const sel=$('#auTable');if(!sel)return;
    let q=sb.from('audit_log').select('*').order('at',{ascending:false}).limit(200);if(sel.value)q=q.eq('table_name',sel.value);
    const {data,error}=await q;if(!$('#auList'))return;if(error){$('#auList').innerHTML='<p class="muted">⚠️ '+esc(error.message)+' — להריץ שוב את ה-SQL</p>';return;}
    const rows=data||[];window.__audit=rows;
    $('#auList').innerHTML=rows.length?'<div class="tw"><table><thead><tr><th>מתי</th><th>מי</th><th>טבלה</th><th>פעולה</th><th>מה</th><th></th></tr></thead><tbody>'+rows.map((r,i)=>'<tr data-i="'+i+'"><td>'+fmt(r.at)+'</td><td>'+esc(r.actor_name||'מערכת')+'</td><td>'+esc(r.table_name)+'</td><td>'+(OPS[r.op]||esc(r.op))+'</td><td>'+esc(String(label(r)).slice(0,60))+'</td><td style="white-space:nowrap"><button class="btn sm sec" data-show>👁</button>'+(own&&r.table_name!=='staff'&&r.table_name!=='store_managers'?' <button class="btn sm" data-undo>↩️ שחזור</button>':'')+'</td></tr>').join('')+'</tbody></table></div>':'<p class="muted">אין עדיין שינויים</p>';
  };
  $('#auLoad').onclick=loadAudit;$('#auTable').onchange=loadAudit;loadAudit();
  $('#boMain').onclick=async e=>{const tr=e.target.closest('tr[data-i]');if(!tr)return;const r=(window.__audit||[])[+tr.dataset.i];if(!r)return;
    if(e.target.closest('[data-show]')){const nx=tr.nextElementSibling;if(nx&&nx.classList.contains('audiff')){nx.remove();return;}const d=document.createElement('tr');d.className='audiff';d.innerHTML='<td colspan="6"><pre style="white-space:pre-wrap;direction:ltr;text-align:left;font-size:12px;max-height:240px;overflow:auto">'+esc(JSON.stringify({before:r.old_row,after:r.new_row},(k,v)=>k==='image'&&typeof v==='string'&&v.length>80?v.slice(0,40)+'…':v,2))+'</pre></td>';tr.after(d);return;}
    if(e.target.closest('[data-undo]')){
      const pkk=r.table_name==='site_config'?'key':'id';
      const msg=r.op==='INSERT'?'למחוק את מה שנוסף?':r.op==='UPDATE'?'להחזיר לגרסה הקודמת?':'להחזיר את מה שנמחק?';
      if(!(await uiConfirm(msg)))return;let q;
      if(r.op==='INSERT')q=sb.from(r.table_name).delete().eq(pkk,r.new_row[pkk]);
      else q=sb.from(r.table_name).upsert(r.old_row,{onConflict:pkk});
      if(await ok(q,'↩️ שוחזר')){loadAudit();loadPublicData();}}
  };
};

VIEWS.posts=async function(){
  const {data,error}=await sb.from('store_posts').select(COLS23.posts).order('created_at',{ascending:false}).limit(300);const posts=data||[];
  const {data:fc}=await sb.rpc('chain_follower_counts');const fcount={};(fc||[]).forEach(r=>fcount[r.chain]=r.followers);
  const kindL={deal:'🏷️ מבצע',product:'🆕 מוצר חדש',news:'📢 עדכון'};
  const card=x=>'<div class="item" data-id="'+x.id+'"><div class="row" style="align-items:center">'+(safeImg(x.image)?'<img src="'+esc(safeImg(x.image))+'" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px;flex:0 0 auto;min-width:0">':'')+'<div style="min-width:180px"><b>'+esc(x.title)+'</b><div class="muted">'+esc(x.chain)+' · '+(kindL[x.kind]||'')+' · '+crSlot('posts',x.id)+' · '+fmt(x.created_at)+(x.updated_at?' · נערך '+fmt(x.updated_at):'')+(x.ends_at?' · עד '+fmt(x.ends_at):'')+'</div>'+(x.body?'<div style="font-size:13px;white-space:pre-wrap">'+esc(x.body)+'</div>':'')+'</div>'+
    (x.status==='pending'?'<button class="btn sm" data-act="ok">✅ אישור</button>':'')+'<button class="btn sm sec" data-act="edit">✏️ עריכה</button><button class="btn sm bad" data-act="del">🗑️</button></div>'+
    '<div class="poedit" hidden style="margin-top:8px"><div class="row"><select data-pe="kind" style="max-width:160px"><option value="deal"'+(x.kind==='deal'?' selected':'')+'>🏷️ מבצע</option><option value="product"'+(x.kind==='product'?' selected':'')+'>🆕 מוצר חדש</option><option value="news"'+(x.kind==='news'?' selected':'')+'>📢 עדכון</option></select><input data-pe="ends" type="date" value="'+(x.ends_at?new Date(x.ends_at).toISOString().slice(0,10):'')+'" title="בתוקף עד"></div><input data-pe="title" maxlength="120" value="'+esc(x.title)+'" style="margin-top:6px"><textarea data-pe="body" maxlength="2000" style="margin-top:6px;min-height:70px">'+esc(x.body||'')+'</textarea><div class="row" style="margin-top:6px"><button class="btn sm" data-act="esave">💾 שמירה</button>'+(x.image?'<button class="btn sm sec" data-act="noimg">🖼️ הסרת התמונה</button>':'')+'</div></div></div>';
  $('#boMain').innerHTML='<div class="card"><h2>📣 מבצעים ועדכונים של החנויות</h2><p class="muted">בעלי ואחראי סופרים מפרסמים מבצעים, מוצרים חדשים ועדכונים — וכל מי שעוקב אחרי החנות רואה אותם בלשונית "🏪 חנויות". אתה יכול לפרסם גם בשם כל חנות.</p>'+
    '<datalist id="poChains">'+allChainNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist><div class="row"><input id="poChain" list="poChains" placeholder="חנות"><select id="poKind" style="max-width:160px"><option value="deal">🏷️ מבצע</option><option value="product">🆕 מוצר חדש</option><option value="news">📢 עדכון</option></select><input id="poEnds" type="date" title="בתוקף עד"></div>'+
    '<input id="poTitle" maxlength="120" placeholder="כותרת" style="margin-top:6px"><textarea id="poBody" maxlength="2000" placeholder="פרטים" style="margin-top:6px;min-height:70px"></textarea><label>תמונה (רשות)</label><input id="poImg" type="file" accept="image/*"><button class="btn" id="poSend" style="margin-top:8px">פרסום</button></div>'+
    (error?'<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית"</p></div>':'')+
    '<div class="card"><h2>⏳ ממתינים לאישור ('+posts.filter(x=>x.status==='pending').length+')</h2>'+(posts.filter(x=>x.status==='pending').map(card).join('')||'<p class="muted">אין</p>')+'</div>'+
    '<div class="card"><h2>📰 מפורסמים ('+posts.filter(x=>x.status!=='pending').length+')</h2>'+(posts.filter(x=>x.status!=='pending').map(card).join('')||'<p class="muted">אין עדיין</p>')+'</div>'+
    '<div class="card"><h2>⭐ עוקבים לפי חנות</h2>'+(Object.keys(fcount).length?'<div class="tw"><table><thead><tr><th>חנות</th><th>עוקבים</th></tr></thead><tbody>'+Object.entries(fcount).sort((a,b)=>b[1]-a[1]).map(([c,n])=>'<tr><td>'+esc(c)+'</td><td>'+n+'</td></tr>').join('')+'</tbody></table></div>':'<p class="muted">עוד אין עוקבים</p>')+'</div>';
  let img='';
  $('#poImg').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{img=await shrinkPic(f);flash('🖼️ התמונה צורפה');}catch(err){flash('⚠️ לא הצלחתי לקרוא את התמונה');}};
  $('#poSend').onclick=async()=>{const chain=$('#poChain').value.trim(),title=$('#poTitle').value.trim();if(!chain||!title){flash('צריך חנות וכותרת');return;}
    const ends=$('#poEnds').value;
    if(await ok(sb.from('store_posts').insert({chain,kind:$('#poKind').value,title,body:$('#poBody').value.trim(),image:img,ends_at:ends?new Date(ends+'T23:59:00').toISOString():null,created_by:me.id}),'📣 פורסם'))show('posts');};
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=b.closest('[data-id]').dataset.id;
    if(b.dataset.act==='edit'){const ed=b.closest('[data-id]').querySelector('.poedit');ed.hidden=!ed.hidden;return;}
    if(b.dataset.act==='esave'||b.dataset.act==='noimg'){const it=b.closest('[data-id]');const v=f=>it.querySelector('[data-pe='+f+']').value.trim();
      const upd=b.dataset.act==='noimg'?{image:''}:{kind:v('kind'),title:v('title').slice(0,120),body:v('body').slice(0,2000),ends_at:v('ends')?new Date(v('ends')+'T23:59:00').toISOString():null};
      if(upd.title===''){flash('צריך כותרת');return;}
      if(await ok(sb.from('store_posts').update(upd).eq('id',id),'💾 נשמר'))show('posts');return;}
    if(b.dataset.act==='ok'&&await ok(sb.from('store_posts').update({status:'approved'}).eq('id',id),'✅ אושר'))show('posts');
    if(b.dataset.act==='del'&&(await uiConfirm('למחוק?'))&&await ok(sb.from('store_posts').delete().eq('id',id),'🗑️ נמחק'))show('posts');};
};

/* ---------- דברי תורה ---------- */
// גרסה חדשה לספרייה מ-cdn.jsdelivr.net? לעדכן גם את script-src ב-CSP (כאן למעלה, ב-vercel.json וב-_headers) — שם מותרות רק הגרסאות האלה
const JSZIP_SRC='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',JSZIP_SRI='sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG';
const PDFJS_SRC='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',PDFJS_SRI='sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e';
const PDFW_SRC='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
function loadLib(src,sri,glob){return window[glob]?Promise.resolve(window[glob]):new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=src;sc.integrity=sri;sc.crossOrigin='anonymous';sc.onload=()=>res(window[glob]);sc.onerror=()=>rej(new Error('load'));document.head.appendChild(sc);});}
/* קובץ → טקסט: Word (docx), PDF, TXT/MD/RTF */
async function fileToText(file){
  const n=file.name.toLowerCase();
  if(n.endsWith('.docx')){
    const JSZip=await loadLib(JSZIP_SRC,JSZIP_SRI,'JSZip');const zip=await JSZip.loadAsync(await file.arrayBuffer());
    const xml=await zip.file('word/document.xml').async('string');const doc=new DOMParser().parseFromString(xml,'application/xml');
    const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    return Array.from(doc.getElementsByTagNameNS(W,'p')).map(p=>Array.from(p.getElementsByTagNameNS(W,'t')).map(x=>x.textContent).join('')).join('\n').replace(/\n{3,}/g,'\n\n').trim();
  }
  if(n.endsWith('.pdf')){
    const lib=await loadLib(PDFJS_SRC,PDFJS_SRI,'pdfjsLib');lib.GlobalWorkerOptions.workerSrc=PDFW_SRC;
    const pdf=await lib.getDocument({data:await file.arrayBuffer(),isEvalSupported:false,disableFontFace:true}).promise;
    let out=[];for(let i=1;i<=Math.min(pdf.numPages,60);i++){const pg=await pdf.getPage(i);const tc=await pg.getTextContent();
      let line='',lastY=null,lines=[];tc.items.forEach(it=>{const y=Math.round(it.transform[5]);if(lastY!==null&&Math.abs(y-lastY)>3){lines.push(line);line='';}line+=(line&&!line.endsWith(' ')?' ':'')+it.str;lastY=y;});lines.push(line);out.push(lines.join('\n'));}
    return out.join('\n\n').replace(/[ \t]+\n/g,'\n').trim();
  }
  if(n.endsWith('.rtf')){const t=await file.text();return t.replace(/\\'([0-9a-f]{2})/gi,(m,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\u(-?\d+)\??/g,(m,c)=>String.fromCharCode(c<0?c+65536:+c)).replace(/\{\\[^{}]*\}|\\[a-z]+-?\d* ?|[{}]/gi,'').trim();}
  const buf=await file.arrayBuffer();let t=new TextDecoder('utf-8').decode(buf);if(t.includes('�'))try{t=new TextDecoder('windows-1255').decode(buf);}catch(e){}
  return t.trim();
}
VIEWS.torah=async function(){
  const {data,error}=await sb.from('divrei_torah').select(COLS23.torah).order('created_at',{ascending:false}).limit(1000);const all=data||[];
  const names=parashaNames();const cur=currentParashaName();
  const opts=sel=>names.map(n=>'<option'+(n===sel?' selected':'')+'>'+esc(n)+'</option>').join('');
  const card=d=>'<div class="item" data-id="'+d.id+'"><div class="row"><select data-f="parasha" style="max-width:170px">'+opts(d.parasha)+(names.includes(d.parasha)?'':'<option selected>'+esc(d.parasha)+'</option>')+'</select><input data-f="title" value="'+esc(d.title)+'" placeholder="כותרת"><input data-f="source_name" value="'+esc(d.source_name)+'" placeholder="מקור / בשם"></div>'+
    '<textarea data-f="body" style="margin-top:6px;min-height:110px">'+esc(d.body)+'</textarea><div class="row" style="margin-top:6px;align-items:center"><span class="muted">'+crSlot('torah',d.id)+' · '+fmt(d.created_at)+(d.updated_at?' · נערך '+fmt(d.updated_at):'')+' · <span class="pill">'+(d.status==='approved'?'מאושר':'ממתין')+'</span></span>'+
    '<button class="btn sm" data-act="save">💾</button>'+(d.status!=='approved'?'<button class="btn sm" data-act="ok">✅ אישור</button>':'')+'<button class="btn sm bad" data-act="del">🗑️</button></div></div>';
  const pend=all.filter(d=>d.status!=='approved'),appr=all.filter(d=>d.status==='approved');
  $('#boMain').innerHTML='<div class="card"><h2>📜 הוספת דבר תורה</h2><p class="muted">דברי התורה לא מופיעים כלשונית באתר — מבקשים אותם מהבוט ("דבר תורה", "דבר תורה על פרשת נח"). משתמשים יכולים לשתף דרך הבוט ("לשתף דבר תורה"), וזה מגיע לכאן לאישור.</p>'+
    '<div class="row"><select id="dtPar">'+opts(cur)+'</select><input id="dtTitle" placeholder="כותרת (רשות)"><input id="dtSrc" placeholder="מקור / בשם (רשות)"></div>'+
    '<label>קבצים (Word, PDF, טקסט) — הופכים לטקסט</label><input id="dtFile" type="file" multiple accept=".docx,.pdf,.txt,.md,.rtf"><div class="muted" id="dtFileSt"></div>'+
    '<label>הטקסט</label><textarea id="dtBody" style="min-height:160px" placeholder="אפשר להקליד, להדביק, או לבחור קובץ למעלה"></textarea>'+
    '<div class="row" style="margin-top:8px"><button class="btn" id="dtAdd">פרסום</button><button class="btn sec" id="dtMulti" hidden>העלאת כל הקבצים כדברי תורה נפרדים</button></div></div>'+
    (error?'<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית"</p></div>':'')+
    '<div class="card"><h2>⏳ ממתינים לאישור ('+pend.length+')</h2>'+(pend.map(card).join('')||'<p class="muted">אין</p>')+'</div>'+
    '<div class="card"><h2>📚 מאושרים ('+appr.length+')</h2><div class="row" style="margin-bottom:8px"><select id="dtFilter"><option value="">כל הפרשות</option>'+Array.from(new Set(appr.map(d=>d.parasha))).map(n=>'<option>'+esc(n)+'</option>').join('')+'</select></div><div id="dtList">'+(appr.map(card).join('')||'<p class="muted">עוד אין</p>')+'</div></div>';
  let files=[];
  $('#dtFile').onchange=async e=>{files=Array.from(e.target.files||[]);if(!files.length)return;const st=$('#dtFileSt');
    if(files.length===1){st.textContent='קורא את הקובץ...';try{const t=await fileToText(files[0]);$('#dtBody').value=t;if(!$('#dtTitle').value)$('#dtTitle').value=files[0].name.replace(/\.[^.]+$/,'');st.textContent='✔ הקובץ הפך לטקסט ('+t.length+' תווים) — אפשר לתקן לפני הפרסום';}catch(err){st.textContent='⚠️ לא הצלחתי לקרוא את הקובץ ('+(err.message||err)+')';}$('#dtMulti').hidden=true;}
    else{st.textContent='נבחרו '+files.length+' קבצים — כל קובץ יהפוך לדבר תורה נפרד לפרשה שנבחרה';$('#dtMulti').hidden=false;}};
  $('#dtAdd').onclick=async()=>{const body=$('#dtBody').value.trim();if(!body){flash('צריך טקסט');return;}
    if(await ok(sb.from('divrei_torah').insert({parasha:$('#dtPar').value,title:$('#dtTitle').value.trim(),source_name:$('#dtSrc').value.trim(),body,author_id:me.id,author_name:$('#dtSrc').value.trim()||'מנהל האתר',status:'approved'}),'📜 פורסם — אפשר לבקש מהבוט')){dtCache=null;show('torah');}};
  $('#dtMulti').onclick=async()=>{let done=0;for(const f of files){$('#dtFileSt').textContent='מעלה '+(done+1)+'/'+files.length+'...';try{const t=await fileToText(f);if(!t)continue;const {error}=await sb.from('divrei_torah').insert({parasha:$('#dtPar').value,title:f.name.replace(/\.[^.]+$/,''),source_name:$('#dtSrc').value.trim(),body:t.slice(0,20000),author_id:me.id,author_name:$('#dtSrc').value.trim()||'מנהל האתר',status:'approved'});if(!error)done++;}catch(e){}}
    flash('📜 הועלו '+done+' מתוך '+files.length);dtCache=null;show('torah');};
  $('#dtFilter').onchange=e=>{const v=e.target.value;$('#dtList').innerHTML=appr.filter(d=>!v||d.parasha===v).map(card).join('')||'<p class="muted">אין</p>';};
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;const it=b.closest('[data-id]');const id=it.dataset.id;const v=f=>it.querySelector('[data-f='+f+']').value.trim();let q;
    if(b.dataset.act==='save')q=sb.from('divrei_torah').update({parasha:v('parasha'),title:v('title'),source_name:v('source_name'),body:v('body')}).eq('id',id);
    if(b.dataset.act==='ok')q=sb.from('divrei_torah').update({status:'approved',parasha:v('parasha'),title:v('title'),source_name:v('source_name'),body:v('body')}).eq('id',id);
    if(b.dataset.act==='del'){if(!(await uiConfirm('למחוק?')))return;q=sb.from('divrei_torah').delete().eq('id',id);}
    if(await ok(q,'✔ בוצע')){dtCache=null;show('torah');}};
};

/* ---------- חוות דעת על האתר ---------- */
VIEWS.reviews=async function(){
  const [{data,error},sum]=await Promise.all([sb.from('site_reviews').select(COLS23.reviews).order('created_at',{ascending:false}).limit(1000),sb.rpc('site_rating')]);
  if(error){$('#boMain').innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית" — ואז יופיעו כאן חוות הדעת.</p></div>';return;}
  const all=data||[];const s=(sum.data&&sum.data[0])||{avg_stars:0,total:0};
  const st=n=>'<span style="color:#f5b301;direction:ltr;display:inline-block">'+'★'.repeat(n)+'<span style="opacity:.3">'+'★'.repeat(5-n)+'</span></span>';
  const card=r=>'<div class="item" data-id="'+r.id+'"><div class="row" style="align-items:center"><span style="min-width:200px">'+st(r.stars)+' <b>'+crSlot('reviews',r.id,{f:'—'})+'</b> <span class="muted">· '+fmt(r.created_at)+(r.updated_at?' · נערך '+fmt(r.updated_at):'')+' · <span class="pill">'+({pending:'ממתין',approved:'מפורסם',rejected:'לא פורסם'}[r.status])+'</span></span></span>'+
    '<select data-f="stars" style="max-width:110px">'+[5,4,3,2,1].map(n=>'<option value="'+n+'"'+(r.stars===n?' selected':'')+'>'+n+' ★</option>').join('')+'</select></div>'+
    '<label>חוות הדעת</label><textarea data-f="body" maxlength="1500" style="min-height:60px">'+esc(r.body)+'</textarea><label>תגובת האתר (תוצג מתחת לחוות הדעת — לא חובה)</label><input data-f="reply" maxlength="1500" value="'+esc(r.reply||'')+'">'+
    '<div class="row" style="margin-top:8px"><button class="btn sm" data-act="save">💾 שמירה</button>'+(r.status!=='approved'?'<button class="btn sm" data-act="ok">✅ אישור ופרסום</button>':'<button class="btn sm sec" data-act="hide">🙈 הסתרה</button>')+(r.status==='pending'?'<button class="btn sm sec" data-act="no">דחייה</button>':'')+'<button class="btn sm bad" data-act="del">🗑️</button></div></div>';
  const by=x=>all.filter(r=>r.status===x);
  $('#boMain').innerHTML='<div class="stats"><div class="stat"><div class="n">'+(s.total?Number(s.avg_stars).toFixed(1):'—')+' ★</div><div class="l">ממוצע ('+s.total+' מפורסמות)</div></div><div class="stat"><div class="n">'+by('pending').length+'</div><div class="l">ממתינות לאישור</div></div></div>'+
    '<div class="card" style="margin-top:14px"><h2>⏳ ממתינות לאישור ('+by('pending').length+')</h2><p class="muted">משתמשים מדרגים את האתר מ-1 עד 5 כוכבים (בתפריט ⚙️ ← "⭐ חוות דעת על האתר"). שום דבר לא מתפרסם בלי האישור שלך. אפשר לערוך, להגיב ולמחוק.</p>'+(by('pending').map(card).join('')||'<p class="muted">אין 🎉</p>')+'</div>'+
    '<div class="card"><h2>⭐ מפורסמות ('+by('approved').length+')</h2>'+(by('approved').map(card).join('')||'<p class="muted">אין עדיין</p>')+'</div>'+
    (by('rejected').length?'<div class="card"><h2>🙈 לא פורסמו ('+by('rejected').length+')</h2>'+by('rejected').map(card).join('')+'</div>':'');
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;const it=b.closest('[data-id]');const id=it.dataset.id;const v=f=>it.querySelector('[data-f='+f+']').value.trim();
    const edits={stars:+v('stars'),body:v('body').slice(0,1500),reply:v('reply').slice(0,1500)};let q;const a=b.dataset.act;
    if(a==='save')q=sb.from('site_reviews').update(edits).eq('id',id);
    if(a==='ok')q=sb.from('site_reviews').update(Object.assign(edits,{status:'approved'})).eq('id',id);
    if(a==='hide')q=sb.from('site_reviews').update({status:'pending'}).eq('id',id);
    if(a==='no')q=sb.from('site_reviews').update({status:'rejected'}).eq('id',id);
    if(a==='del'){if(!(await uiConfirm('למחוק את חוות הדעת לצמיתות?')))return;q=sb.from('site_reviews').delete().eq('id',id);}
    if(q&&await ok(q,'✔️ בוצע'))show('reviews');};
};
/* ---------- איתור מיקום לסניפים (OpenStreetMap, שנייה בין בקשה לבקשה) ---------- */
async function geocodeBranches(branches,btn){
  const todo=branches.filter(b=>b.status!=='pending'&&(b.lat==null||b.lng==null));
  if(!todo.length){flash('✔ לכל הסניפים כבר יש מיקום');return;}
  if(!(await uiConfirm('לאתר מיקום ל-'+todo.length+' סניפים לפי הכתובת? זה לוקח בערך שנייה לכל סניף.')))return;
  btn.disabled=true;let okN=0,miss=0;
  for(let i=0;i<todo.length;i++){const b=todo[i];btn.textContent='📍 '+(i+1)+' / '+todo.length;
    try{const q=encodeURIComponent((b.address?b.address+', ':'')+b.city+', ישראל');const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=he&q='+q);const j=await r.json();
      if(j&&j[0]){const {error}=await sb.from('branches').update({lat:+j[0].lat,lng:+j[0].lon}).eq('id',b.id);if(error)miss++;else okN++;}else miss++;}catch(e){miss++;}
    await new Promise(r=>setTimeout(r,1100));}
  btn.disabled=false;flash('📍 נמצא מיקום ל-'+okN+' סניפים'+(miss?' · לא נמצא ל-'+miss+' (אפשר להוסיף ידנית)':''));show('chains');loadChains();
}
/* ---------- מאגר מוצרים: העלאת קובץ בלי כפילויות ---------- */
VIEWS.products=async function(){
  const {data,error}=await sb.from('products').select('*').order('name').limit(10000);
  if(error){$('#boMain').innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית" — ואז אפשר להעלות מוצרים.</p></div>';return;}
  const all=data||[];
  $('#boMain').innerHTML='<div class="card"><h2>📄 העלאת קובץ מוצרים</h2><p class="muted">CSV או Excel עם עמודות: <b>מוצר</b>, <b>חברה</b> (מותג), קטגוריה, ברקוד, יחידה. מוצר שכבר קיים (אותו ברקוד, או אותו שם ואותה חברה) לא נכנס פעמיים — רק משלימים לו פרטים חסרים. המוצרים מופיעים מיד במאגר באתר (➕), מסודרים לפי חברות, ובסריקת ברקוד.</p>'+
    '<input type="file" id="pfFile" accept=".csv,.txt,.xlsx,.xls,.ods"><div id="pfPrev"></div><button class="btn" id="pfGo" hidden>⬆️ העלאה</button><div class="muted" id="pfStat"></div></div>'+
    '<div class="card"><h2>➕ מוצר בודד</h2><div class="row"><input id="npName" placeholder="שם המוצר (למשל: חלב 3%)"><input id="npBrand" placeholder="חברה (למשל: תנובה)"><select id="npCat">'+CATS.map(c=>'<option>'+esc(c)+'</option>').join('')+'</select><input id="npBc" placeholder="ברקוד" inputmode="numeric"><button class="btn" id="npAdd">הוספה</button></div></div>'+
    '<div class="card"><h2>📦 המוצרים במאגר ('+all.length+')</h2><div class="row" style="margin-bottom:8px"><input id="pq" placeholder="חיפוש לפי שם, חברה או ברקוד"><select id="pqc" aria-label="סינון לפי קטגוריה"><option value="">כל הקטגוריות</option><option value="-">⚠️ בלי קטגוריה ('+all.filter(x=>!CATS.includes(x.category)).length+')</option>'+CATS.map(c=>'<option>'+esc(c)+'</option>').join('')+'</select></div><div class="tw"><table><thead><tr><th>מוצר</th><th>חברה</th><th>קטגוריה</th><th>ברקוד</th><th></th></tr></thead><tbody id="ptb"></tbody></table></div></div>';
  const draw=q=>{q=norm(q||'');const fc=$('#pqc').value;$('#ptb').innerHTML=all.filter(x=>(!q||norm(x.name+' '+x.brand+' '+(x.barcode||'')).includes(q))&&(!fc||(fc==='-'?!CATS.includes(x.category):x.category===fc))).slice(0,500).map(x=>'<tr data-id="'+esc(x.id)+'"><td><input data-f="name" value="'+esc(x.name)+'" maxlength="80"></td><td><input data-f="brand" value="'+esc(x.brand)+'" maxlength="40" style="max-width:120px"></td><td><select data-f="category"><option value=""></option>'+CATS.map(c=>'<option'+(x.category===c?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></td><td><input data-f="barcode" value="'+esc(x.barcode||'')+'" dir="ltr" maxlength="20" style="max-width:140px"></td><td style="white-space:nowrap"><button class="btn sm" data-psv>💾</button> <button class="btn sm bad" data-pdl>🗑️</button></td></tr>').join('')+(all.length>500?'<tr><td colspan="5" class="muted">מוצגים 500 — חפשו כדי למצוא עוד</td></tr>':'');};
  draw('');$('#pq').oninput=e=>draw(e.target.value);$('#pqc').onchange=()=>draw($('#pq').value);
  let rows=[];
  const PCOLS={name:['מוצר','שם מוצר','שם המוצר','שם','תיאור','product','name','item','description'],brand:['חברה','מותג','יצרן','brand','manufacturer','company'],category:['קטגוריה','מחלקה','category'],barcode:['ברקוד','קוד','מקט','מק"ט','barcode','code','ean','sku'],unit:['יחידה','משקל','גודל','unit','size']};
  const mh=h=>{const k=String(h||'').trim().toLowerCase().replace(/[\s_\-]/g,'');for(const f in PCOLS)if(PCOLS[f].some(c=>c.replace(/[\s_\-]/g,'')===k))return f;return null;};
  $('#pfFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#pfStat').textContent='קורא...';
    try{let table;const n=f.name.toLowerCase();
      if(/\.(xlsx|xls|ods)$/.test(n)){const X=await loadXlsx();const wb=X.read(await f.arrayBuffer(),{type:'array'});table=X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false});}
      else{const buf=await f.arrayBuffer();let t=new TextDecoder('utf-8').decode(buf);if(t.includes('\ufffd'))try{t=new TextDecoder('windows-1255').decode(buf);}catch(err){}table=parseCsv(t.replace(/^\ufeff/,''));}
      let hi=table.findIndex(r=>r.some(c=>mh(c)==='name'));let map={};if(hi<0){hi=-1;map={0:'name',1:'brand',2:'category',3:'barcode'};}else table[hi].forEach((c,i)=>{const k=mh(c);if(k&&!Object.values(map).includes(k))map[i]=k;});
      const seen=new Set();let dup=0;rows=[];
      table.slice(hi+1).forEach(r=>{const o={};Object.entries(map).forEach(([i,k])=>o[k]=String(r[i]==null?'':r[i]).trim());if(!o.name)return;o.barcode=(o.barcode||'').replace(/\D/g,'');
        const key=o.barcode||(norm(o.name)+'|'+norm(o.brand||'').toLowerCase());if(seen.has(key)){dup++;return;}seen.add(key);rows.push(o);});
      const exists=rows.filter(o=>all.some(x=>(o.barcode&&x.barcode===o.barcode)||(norm(x.name)===norm(o.name)&&norm(x.brand).toLowerCase()===norm(o.brand||'').toLowerCase()))).length;
      $('#pfPrev').innerHTML='<div class="tw"><table><thead><tr><th>מוצר</th><th>חברה</th><th>קטגוריה</th><th>ברקוד</th></tr></thead><tbody>'+rows.slice(0,8).map(o=>'<tr><td>'+esc(o.name)+'</td><td>'+esc(o.brand||'')+'</td><td>'+esc(o.category||'')+'</td><td>'+esc(o.barcode||'')+'</td></tr>').join('')+'</tbody></table></div>';
      $('#pfStat').textContent='נמצאו '+rows.length+' מוצרים'+(dup?' · '+dup+' כפילויות בתוך הקובץ סוננו':'')+(exists?' · '+exists+' כבר קיימים — רק יושלמו פרטים':'')+'.';$('#pfGo').hidden=!rows.length;
    }catch(err){$('#pfStat').textContent='⚠️ '+(err.message==='xlsx'?'לא הצלחתי לטעון את קורא האקסל — שמרו כ-CSV':err.message);}};
  $('#pfGo').onclick=async()=>{$('#pfGo').disabled=true;let a=0,m=0,sk=0;
    for(let i=0;i<rows.length;i+=500){const {data:r,error:er}=await sb.rpc('import_products',{p_rows:rows.slice(i,i+500)});if(er){flash('⚠️ '+er.message);break;}a+=r.added;m+=r.merged;sk+=r.skipped;$('#pfStat').textContent='⬆️ '+Math.min(i+500,rows.length)+' / '+rows.length;}
    $('#pfGo').disabled=false;flash('📦 נוספו '+a+' · הושלמו '+m+(sk?' · דולגו '+sk:''));show('products');};
  $('#npAdd').onclick=async()=>{const n=$('#npName').value.trim();if(!n){flash('צריך שם');return;}
    const {data:r,error:er}=await sb.rpc('import_products',{p_rows:[{name:n,brand:$('#npBrand').value.trim(),category:$('#npCat').value,barcode:$('#npBc').value.trim()}]});if(er){flash('⚠️ '+er.message);return;}flash(r.added?'✅ נוסף':'ℹ️ המוצר כבר קיים — עודכנו פרטים חסרים');show('products');};
  $('#boMain').onclick=async e=>{const tr=e.target.closest('tr[data-id]');if(!tr)return;const id=tr.dataset.id;const v=f=>tr.querySelector('[data-f='+f+']').value.trim();
    if(e.target.closest('[data-psv]')){const bc=v('barcode').replace(/\D/g,'');if(bc&&!/^\d{4,20}$/.test(bc)){flash('⚠️ ברקוד — 4 עד 20 ספרות');return;}
      if(await ok(sb.from('products').update({name:v('name'),brand:v('brand'),category:v('category'),barcode:bc||null}).eq('id',id),'💾 נשמר')){const x=all.find(y=>y.id===id);if(x)Object.assign(x,{name:v('name'),brand:v('brand'),category:v('category'),barcode:bc||null});}}
    if(e.target.closest('[data-pdl]')&&(await uiConfirm('למחוק את המוצר מהמאגר?'))&&await ok(sb.from('products').delete().eq('id',id),'🗑️ נמחק'))tr.remove();};
};
/* ---------- פניות של לקוחות לחנויות ---------- */
VIEWS.messages=async function(){
  const {data,error}=await sb.from('store_messages').select('*').order('created_at',{ascending:false}).limit(500);
  if(error){$('#boMain').innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית".</p></div>';return;}
  const all=data||[];
  $('#boMain').innerHTML='<div class="card"><h2>📨 פניות מלקוחות לחנויות ('+all.length+')</h2><p class="muted">לקוחות פונים לחנויות מהפרופיל של החנות. בעל/אחראי החנות רואה ועונה על הפניות של החנות שלו; אתה רואה הכל, יכול לענות בשם החנות ולמחוק.</p>'+
    (all.length?all.map(m=>'<div class="item" data-id="'+m.id+'"><div class="row" style="align-items:center"><span style="min-width:200px"><b>'+esc(m.chain)+'</b> · '+esc(m.name||'—')+(m.phone?' · <span dir="ltr">'+esc(m.phone)+'</span>':'')+' · <span class="muted">'+fmt(m.created_at)+'</span> '+(m.is_read?'':'<span class="pill">חדש</span>')+'</span></div><div style="white-space:pre-wrap;margin:6px 0">'+esc(m.body)+'</div><label>תשובה</label><input data-f="reply" value="'+esc(m.reply||'')+'" maxlength="2000"><div class="row" style="margin-top:6px"><button class="btn sm" data-act="reply">💬 שמירת תשובה</button>'+(m.is_read?'':'<button class="btn sm sec" data-act="read">✔ סימון כנקרא</button>')+'<button class="btn sm bad" data-act="del">🗑️</button></div></div>').join(''):'<p class="muted">עוד אין פניות.</p>')+'</div>';
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;const it=b.closest('[data-id]');const id=it.dataset.id;let q;
    if(b.dataset.act==='reply')q=sb.from('store_messages').update({reply:it.querySelector('[data-f=reply]').value.trim(),is_read:true}).eq('id',id);
    if(b.dataset.act==='read')q=sb.from('store_messages').update({is_read:true}).eq('id',id);
    if(b.dataset.act==='del'){if(!(await uiConfirm('למחוק את הפנייה?')))return;q=sb.from('store_messages').delete().eq('id',id);}
    if(q&&await ok(q,'✔️ בוצע'))show('messages');};
};
/* ---------- 💬 צ'אט עם משתמשים (גרסה 9) ---------- */
let supUser=null;
VIEWS.support=async function(){
  const {data,error}=await sb.rpc('support_threads');
  if(error){$('#boMain').innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית" — ואז יופיע כאן הצ\'אט עם המשתמשים.</p></div>';return;}
  const th=data||[];if(supUser&&!th.some(t=>t.user_id===supUser))supUser=null;
  const list='<div class="card"><h2>💬 שיחות עם משתמשים ('+th.length+') · לא נקראו: '+th.reduce((a,t)=>a+t.unread,0)+'</h2><p class="muted">כל לקוח ובעל עסק יכול לכתוב לאתר מהכפתור 💬 שליד הפעמון. התשובה שלך מופיעה אצלו בצ\'אט ובפעמון.</p>'+
    (th.length?th.map(t=>'<div class="item" data-th="'+t.user_id+'" style="cursor:pointer'+(t.user_id===supUser?';outline:2px solid var(--ok)':'')+'"><div class="row" style="align-items:center"><span style="flex:1;min-width:200px"><b>'+esc(t.name||'—')+'</b> <span class="muted" dir="ltr">'+esc(t.email)+'</span><br><span class="muted">'+(t.last_from_staff?'↩️ אתה: ':'')+esc(String(t.last_body||'').slice(0,90))+'</span></span><span class="muted">'+fmt(t.last_at)+'</span>'+(t.unread?'<span class="badge" style="background:#25d366;color:#fff;border-radius:10px;padding:2px 8px">'+t.unread+'</span>':'')+'</div></div>').join(''):'<p class="muted">עוד אין הודעות.</p>')+'</div>';
  let conv='';
  if(supUser){const {data:ms}=await sb.from('support_messages').select('*').eq('user_id',supUser).order('created_at').limit(500);const t=th.find(x=>x.user_id===supUser)||{};
    conv='<div class="card" id="supConv"><h2>💬 '+esc(t.name||'')+' <span class="muted" dir="ltr">'+esc(t.email||'')+'</span></h2><div style="max-height:50vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:10px" id="supBox">'+
      (ms||[]).map(m=>'<div style="max-width:80%;align-self:'+(m.from_staff?'flex-end':'flex-start')+';background:'+(m.from_staff?'var(--chip)':'rgba(37,211,102,.15)')+';border-radius:12px;padding:8px 11px;white-space:pre-wrap;overflow-wrap:anywhere">'+(m.from_staff?'<b class="muted">'+esc(m.author_name||'צוות האתר')+'</b><br>':'')+esc(m.body)+'<div class="muted" style="font-size:11px">'+fmt(m.created_at)+(m.from_staff?(m.read_by_user?' · ✓✓ נקרא':' · ✓ נשלח'):'')+'</div></div>').join('')+
      '</div><textarea id="supReply" maxlength="2000" placeholder="כתבו תשובה..." style="min-height:70px"></textarea><div class="row" style="margin-top:6px"><button class="btn" id="supSend">📨 שליחה</button><button class="btn sec" id="supDel">🗑️ מחיקת כל השיחה</button></div></div>';
    if((ms||[]).some(m=>!m.from_staff&&!m.read_by_staff))sb.from('support_messages').update({read_by_staff:true}).eq('user_id',supUser).eq('from_staff',false).eq('read_by_staff',false).then(()=>{});}
  $('#boMain').innerHTML=conv+list;const bx=$('#supBox');if(bx)bx.scrollTop=bx.scrollHeight;
  $('#boMain').onclick=async e=>{const t=e.target.closest('[data-th]');if(t){supUser=t.dataset.th;show('support');return;}
    if(e.target.closest('#supSend')){const body=$('#supReply').value.trim();if(!body)return;if(await ok(sb.from('support_messages').insert({user_id:supUser,body:body.slice(0,2000)}),'📨 נשלח'))show('support');}
    if(e.target.closest('#supDel')&&(await uiConfirm('למחוק את כל השיחה עם המשתמש?'))&&await ok(sb.from('support_messages').delete().eq('user_id',supUser),'🗑️ נמחק')){supUser=null;show('support');}};
};
/* ---------- 🏪 בקשות הצטרפות של בעלי עסקים (גרסה 9) ---------- */
VIEWS.bizreq=async function(){
  const {data,error}=await sb.from('business_requests').select('*').order('created_at',{ascending:false}).limit(500);
  if(error){$('#boMain').innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית".</p></div>';return;}
  const all=data||[];const st={pending:'⏳ ממתינה',approved:'✅ אושרה',rejected:'🙈 נדחתה'};const roleL={owner:'בעל העסק',manager:'אחראי / מנהל סניף'};
  const card=r=>'<div class="item" data-id="'+r.id+'"><div class="row" style="align-items:center"><span style="flex:1;min-width:220px"><b>'+esc(r.business)+'</b>'+(r.branch?' · '+esc(r.branch):'')+' <span class="muted">· '+esc(roleL[r.role]||r.role)+' · '+esc(r.category)+' · '+fmt(r.created_at)+'</span><br>'+esc(r.name||'—')+' · <span dir="ltr">'+esc(r.email)+'</span>'+(r.phone?' · <a dir="ltr" href="tel:'+esc(r.phone.replace(/[^\d+]/g,''))+'">'+esc(r.phone)+'</a>':'')+'</span><span>'+st[r.status]+'</span></div>'+
    ((r.audience||r.address)?'<p class="muted" style="margin:4px 0">'+(r.audience?'👥 קהל יעד: '+esc(r.audience):'')+(r.address?' · 📍 '+esc(r.address):'')+'</p>':'')+
    (r.message?'<p style="white-space:pre-wrap;margin:6px 0">'+esc(r.message)+'</p>':'')+
    '<div class="row" style="margin-top:6px">'+(r.status!=='approved'?'<button class="btn sm" data-act="ok">✅ אישור — לחבר כ'+esc(roleL[r.role]||'')+'</button>':'')+(r.status==='pending'?'<button class="btn sm sec" data-act="no">🙈 דחייה</button>':'')+'<button class="btn sm sec" data-act="del">🗑️</button></div></div>';
  const by=x=>all.filter(r=>r.status===x);
  $('#boMain').innerHTML='<div class="card"><h2>🏪 בקשות הצטרפות ממתינות ('+by('pending').length+')</h2><p class="muted">בעלי עסקים ומנהלי סניפים מבקשים להצטרף מהתפריט ⚙️ ← "🏪 הצטרפות בעלי עסקים". אישור יוצר את החנות (אם עוד אין), מחבר את המשתמש כבעל/אחראי — והוא יכול לעדכן מחירים ומבצעים. לפני אישור כדאי להתקשר ולוודא שזה באמת העסק שלו.</p>'+(by('pending').map(card).join('')||'<p class="muted">אין בקשות חדשות</p>')+'</div>'+
    (by('approved').length+by('rejected').length?'<div class="card"><h2>📁 טופלו</h2>'+by('approved').concat(by('rejected')).map(card).join('')+'</div>':'');
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=b.closest('[data-id]').dataset.id;const r=all.find(x=>x.id===id);const a=b.dataset.act;
    if(a==='ok'){if(!(await uiConfirm('לאשר את '+r.business+' ולחבר את '+(r.email||r.name)+' כ'+(roleL[r.role]||'')+'?')))return;
      const {data:ch}=await sb.from('chains').select('name').ilike('name',r.business).limit(1);let chain=ch&&ch[0]&&ch[0].name;
      if(!chain){const {error:ce}=await sb.from('chains').insert({name:r.business.slice(0,40),kind:'store',category:r.category||'supermarket',status:'approved'});if(ce){flash('⚠️ '+ce.message);return;}chain=r.business.slice(0,40);}
      const {data:res,error:se}=await sb.rpc('store_manager_set',{p_email:r.email,p_chain:chain,p_branch:r.branch||'',p_title:r.role,p_auto:false});
      if(se||res!=='ok'){flash('⚠️ '+((se&&se.message)||({not_found:'לא נמצא משתמש עם המייל הזה'}[res]||res)));return;}
      await sb.from('business_requests').update({status:'approved'}).eq('id',id);
      await sb.rpc('store_settings',{p_chain:chain,p:{category:r.category||'other',audience:r.audience||'',address:r.address||r.branch||'',order_phone:r.phone||''}});
      if(r.user_id)await sb.from('support_messages').insert({user_id:r.user_id,body:'🎉 הבקשה של "'+chain+'" אושרה! אפשר לעדכן מחירים, מבצעים ופרופיל עסקי מהתפריט ⚙️ ← "🏪 החנות שלי". בהצלחה!'});
      flash('✅ אושר וחובר');show('bizreq');return;}
    if(a==='no'){const why=(await uiPrompt('סיבה (תישלח למבקש, לא חובה):',''));if(why===null)return;if(await ok(sb.from('business_requests').update({status:'rejected'}).eq('id',id),'✔ נדחתה')){if(r.user_id)await sb.from('support_messages').insert({user_id:r.user_id,body:'הבקשה להצטרף כעסק ("'+r.business+'") לא אושרה כרגע.'+(why?' '+why:'')+' אפשר לכתוב לנו כאן בצ\'אט 🙂'});show('bizreq');}return;}
    if(a==='del'&&(await uiConfirm('למחוק את הבקשה?'))&&await ok(sb.from('business_requests').delete().eq('id',id),'🗑️ נמחק'))show('bizreq');};
};
/* סקירה: מונים לצ'אט ולבקשות */
const _bo9Dash=VIEWS.dash;
VIEWS.dash=async function(){await _bo9Dash.call(VIEWS);if(!isAdmin()||cur!=='dash')return;
  const [{data:th},{count:bz}]=await Promise.all([sb.rpc('support_threads'),sb.from('business_requests').select('*',{count:'exact',head:true}).eq('status','pending')]);
  const un=(th||[]).reduce((a,t)=>a+t.unread,0);const s=$('#boMain .stats');if(!s||cur!=='dash')return;
  s.insertAdjacentHTML('afterbegin','<div class="stat" style="cursor:pointer" data-go="support"><div class="n">'+un+'</div><div class="l">💬 הודעות צ\'אט שלא נקראו</div></div><div class="stat" style="cursor:pointer" data-go="bizreq"><div class="n">'+(bz||0)+'</div><div class="l">🏪 בקשות הצטרפות עסקים</div></div>');};
/* ---------- 🚫 שפה ומשתמשים: דיווחים, אזהרה, השעיה וחסימה — בהחלטת המנהל (גרסה 10) ---------- */
VIEWS.abuse=async function(){
  const [{data:rep,error},{data:bans},{data:ul}]=await Promise.all([sb.from('abuse_reports').select('*').order('created_at',{ascending:false}).limit(2000),sb.from('user_bans').select('*'),sb.rpc('admin_user_list')]);
  if(error){$('#boMain').innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית".</p></div>';return;}
  const users={};(ul||[]).forEach(u=>users[u.id]=u);const banOf={};(bans||[]).forEach(b=>banOf[b.user_id]=b);
  const by={};(rep||[]).forEach(r=>{(by[r.user_id]=by[r.user_id]||[]).push(r);});
  Object.keys(banOf).forEach(id=>{if(!by[id])by[id]=[];});
  const ids=Object.keys(by).sort((a,b)=>(by[b].filter(r=>!r.handled).length-by[a].filter(r=>!r.handled).length)||((by[b][0]||{}).created_at||'').localeCompare((by[a][0]||{}).created_at||''));
  const banTxt=b=>!b?'':b.kind==='warn'?'<span class="pill">⚠️ קיבל/ה אזהרה'+(b.seen?' (ראה/תה)':'')+'</span>':b.kind==='block'?'<span class="pill" style="background:#f8d7da">⛔ חסום/ה</span>':(b.until&&new Date(b.until)<new Date()?'<span class="pill">⏸️ ההשעיה הסתיימה</span>':'<span class="pill" style="background:#fff3cd">⏸️ מושעה עד '+fmt(b.until)+'</span>');
  $('#boMain').innerHTML='<div class="card"><h2>🚫 שפה לא נקייה ומשתמשים ('+ids.length+')</h2><p class="muted">כשמשתמש כותב קללות או גסויות (ליאמי, ברשימה או בצ\'אט) — זה מגיע לכאן מיד, וגם לתוסף הכרום. <b>ההחלטה שלך:</b> ⚠️ אזהרה (המשתמש רואה הודעה) · ⏸️ השעיה לכמה ימים · ⛔ חסימה. משתמש מושעה/חסום לא יכול לפרסם כלום באתר, אבל יכול לכתוב לצוות בצ\'אט.</p>'+
    (ids.length?ids.map(id=>{const u=users[id]||{};const rs=by[id];const open=rs.filter(r=>!r.handled).length;const b=banOf[id];
      return '<div class="item" data-uid="'+id+'"><div class="row" style="align-items:center"><span style="flex:1;min-width:220px"><b>'+esc(u.name||(rs[0]||{}).name||'—')+'</b> <span class="muted" dir="ltr">'+esc(u.email||'')+'</span><br><span class="muted">'+rs.length+' דיווחים'+(open?' · <b style="color:var(--bad)">'+open+' חדשים</b>':'')+'</span></span>'+banTxt(b)+'</div>'+
        (rs.length?'<div class="muted" style="margin:6px 0">'+rs.slice(0,4).map(r=>'• '+fmt(r.created_at)+' ('+esc({bot:'ליאמי',list:'ברשימה',chat:'בצ\'אט',recipe:'במתכון',deal:'במבצע'}[r.source]||r.source)+'): <span style="filter:blur(3px)" title="לחיצה להצגה" onclick="this.style.filter=\'none\'">'+esc(r.text)+'</span>'+(()=>{const w=profanityMatch(r.text);return w?' <span class="pill" style="filter:blur(3px)" title="לחיצה להצגה" onclick="this.style.filter=\'none\'">🔎 זוהה בגלל: «'+esc(w)+'»</span>':' <span class="pill" style="background:#d4edda">✅ לפי המסנן של היום אין כאן מילה אסורה — כנראה דיווח שגוי</span>';})()).join('<br>')+'</div>':'')+
        '<div class="row" style="margin-top:6px"><button class="btn sm sec" data-ab="warn">⚠️ אזהרה</button><button class="btn sm sec" data-ab="suspend">⏸️ השעיה</button><button class="btn sm bad" data-ab="block">⛔ חסימה</button>'+(b?'<button class="btn sm" data-ab="unban">✅ ביטול</button>':'')+(open?'<button class="btn sm sec" data-ab="handled">✔️ טופל</button>':'')+(rs.length?'<button class="btn sm sec" data-ab="wrong" title="מוחק את הדיווחים של המשתמש הזה">🗑️ דיווח שגוי</button>':'')+'</div></div>';}).join(''):'<p class="muted">אין דיווחים 🎉</p>')+'</div>';
  $('#boMain').onclick=async e=>{const bt=e.target.closest('[data-ab]');if(!bt)return;const id=bt.closest('[data-uid]').dataset.uid;const a=bt.dataset.ab;const u=users[id]||{};
    if(a==='wrong'){if(!(await uiConfirm('זה דיווח שגוי? הדיווחים של '+(u.name||'המשתמש')+' יימחקו.')))return;if(await ok(sb.from('abuse_reports').delete().eq('user_id',id),'🗑️ הדיווח נמחק'))show('abuse');return;}
    if(a==='handled'){if(await ok(sb.from('abuse_reports').update({handled:true}).eq('user_id',id).eq('handled',false),'✔️ סומן כטופל'))show('abuse');return;}
    if(a==='unban'){if(!(await uiConfirm('לבטל את האזהרה/ההשעיה/החסימה?')))return;if(await ok(sb.from('user_bans').delete().eq('user_id',id),'✅ בוטל')){await sb.from('support_messages').insert({user_id:id,body:'✅ ההשעיה הוסרה — ברוכים השבים! נשמח שתמשיכו לשמור על לשון נקייה 💚'});show('abuse');}return;}
    let until=null,reason='';
    if(a==='suspend'){const d=(await uiPrompt('לכמה ימים להשעות את '+(u.name||'המשתמש')+'?','3'));if(d===null)return;const n=Math.max(1,Math.min(365,parseInt(d)||3));until=new Date(Date.now()+n*864e5).toISOString();reason=(await uiPrompt('סיבה (תוצג למשתמש):','שימוש בשפה לא נקייה באתר'))||'';}
    if(a==='block'){if(!(await uiConfirm('לחסום את '+(u.name||'המשתמש')+' לצמיתות?')))return;reason=(await uiPrompt('סיבה (תוצג למשתמש):','שימוש חוזר בשפה לא נקייה'))||'';}
    if(a==='warn'){reason=(await uiPrompt('נוסח האזהרה (המשתמש יראה אותה בכניסה הבאה):','קיבלנו דיווח על שפה לא נקייה. האתר נועד לעזור לאנשים — נא לשמור על לשון נקייה ומכבדת. בפעם הבאה החשבון עלול להיות מושעה.'));if(reason===null)return;}
    if(!await ok(sb.from('user_bans').upsert({user_id:id,kind:a,until,reason:reason.slice(0,500),by_id:me.id,seen:false,created_at:new Date().toISOString()}),a==='warn'?'⚠️ נשלחה אזהרה':a==='block'?'⛔ נחסם':'⏸️ הושעה'))return;
    await sb.from('abuse_reports').update({handled:true}).eq('user_id',id).eq('handled',false);
    if(a==='warn')await sb.from('support_messages').insert({user_id:id,body:'⚠️ '+reason});
    show('abuse');};
};
/* ---------- 💬 צ'אט עם משתמשים — מסודר: פתוחות/טופלו, נושא, תשובות מוכנות (גרסה 10) ---------- */
let supFilter='open';
const CANNED=['שלום! תודה שפנית אלינו 🙂 איך אפשר לעזור?','תודה על הדיווח! אנחנו בודקים ונעדכן בהקדם.','תוקן — אפשר לרענן את האתר ולנסות שוב 🙏','כדי לדווח מחיר: לשונית "מחירים" ← "דיווח מחיר" ← שם המוצר, החנות והמחיר.','לכניסה מחדש: במסך הכניסה לוחצים "שכחתי קוד" ומקבלים מייל לבחירת קוד חדש.','תודה רבה על ההצעה! העברנו אותה לצוות 💡','שמחנו לעזור! הפנייה נסגרה — אפשר תמיד לכתוב שוב 💚'];
VIEWS.support=async function(){
  const {data,error}=await sb.rpc('support_threads');
  if(error){$('#boMain').innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית".</p></div>';return;}
  const all=data||[];const th=all.filter(t=>supFilter==='all'||(t.status||'open')===supFilter);if(supUser&&!all.some(t=>t.user_id===supUser))supUser=null;window.boSupUser=supUser;
  const cnt=s=>all.filter(t=>(t.status||'open')===s).length;
  const list='<div class="card"><h2>💬 פניות ('+all.length+') · לא נקראו: '+all.reduce((a,t)=>a+t.unread,0)+'</h2><div class="row" style="margin-bottom:8px">'+[['open','🟢 פתוחות ('+cnt('open')+')'],['closed','✓ טופלו ('+cnt('closed')+')'],['all','הכל']].map(([k,l])=>'<button class="btn sm'+(supFilter===k?'':' sec')+'" data-sf="'+k+'">'+l+'</button>').join('')+'</div>'+
    (th.length?th.map(t=>'<div class="item" data-th="'+t.user_id+'" style="cursor:pointer'+(t.user_id===supUser?';outline:2px solid var(--ok)':'')+'"><div class="row" style="align-items:center"><span style="flex:1;min-width:200px"><b>'+esc(t.name||'—')+'</b> <span class="muted" dir="ltr">'+esc(t.email)+'</span>'+(t.topic?' <span class="pill">'+esc(t.topic)+'</span>':'')+'<br><span class="muted">'+(t.last_from_staff?'↩️ אתה: ':'')+esc(String(t.last_body||'').slice(0,90))+'</span></span><span class="muted">'+fmt(t.last_at)+'</span>'+(t.unread?'<span class="badge" style="background:#25d366;color:#fff;border-radius:10px;padding:2px 8px">'+t.unread+'</span>':'')+'</div></div>').join(''):'<p class="muted">אין פניות כאן.</p>')+'</div>';
  let conv='';
  if(supUser){const {data:ms}=await sb.from('support_messages').select('*').eq('user_id',supUser).order('created_at').limit(500);const t=all.find(x=>x.user_id===supUser)||{};const open=(t.status||'open')==='open';
    conv='<div class="card"><h2>💬 '+esc(t.name||'')+' <span class="muted" dir="ltr">'+esc(t.email||'')+'</span> '+(t.topic?'<span class="pill">'+esc(t.topic)+'</span> ':'')+'<span class="pill">'+(open?'🟢 פתוחה':'✓ טופלה')+'</span></h2><div style="max-height:50vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:10px" id="supBox">'+
      (ms||[]).map(m=>'<div style="max-width:80%;align-self:'+(m.from_staff?'flex-end':'flex-start')+';background:'+(m.from_staff?'var(--chip)':'rgba(37,211,102,.15)')+';border-radius:12px;padding:8px 11px;white-space:pre-wrap;overflow-wrap:anywhere">'+(m.from_staff?'<b class="muted">'+esc(m.author_name||'צוות האתר')+'</b><br>':'')+(m.topic&&!m.from_staff?'<span class="pill">'+esc(m.topic)+'</span><br>':'')+esc(m.body)+'<div class="muted" style="font-size:11px">'+fmt(m.created_at)+(m.from_staff?(m.read_by_user?' · ✓✓ נקרא':' · ✓ נשלח'):'')+'</div></div>').join('')+
      '</div><select id="supCanned"><option value="">📋 תשובה מוכנה...</option>'+CANNED.map(c=>'<option>'+esc(c)+'</option>').join('')+'</select><textarea id="supReply" maxlength="2000" placeholder="כתבו תשובה..." style="min-height:70px;margin-top:6px"></textarea>'+
      '<div class="row" style="margin-top:6px"><button class="btn" id="supSend">📨 שליחה</button><button class="btn sec" id="supSendClose">📨 שליחה וסגירת הפנייה</button>'+(open?'<button class="btn sec" id="supClose">✓ סימון כטופלה</button>':'<button class="btn sec" id="supReopen">↩️ פתיחה מחדש</button>')+'<button class="btn sec" id="supDel">🗑️ מחיקת השיחה</button></div></div>';
    if((ms||[]).some(m=>!m.from_staff&&!m.read_by_staff))sb.from('support_messages').update({read_by_staff:true}).eq('user_id',supUser).eq('from_staff',false).eq('read_by_staff',false).then(()=>{});}
  $('#boMain').innerHTML=conv+list;const bx=$('#supBox');if(bx)bx.scrollTop=bx.scrollHeight;
  const setSt=s=>sb.from('support_status').upsert({user_id:supUser,status:s,updated_at:new Date().toISOString()});
  $('#boMain').onchange=e=>{if(e.target.id==='supCanned'&&e.target.value){const r=$('#supReply');r.value=(r.value?r.value+'\n':'')+e.target.value;e.target.value='';r.focus();}};
  $('#boMain').onclick=async e=>{const f=e.target.closest('[data-sf]');if(f){supFilter=f.dataset.sf;show('support');return;}
    const t=e.target.closest('[data-th]');if(t){supUser=t.dataset.th;show('support');return;}
    const send=async close=>{const body=$('#supReply').value.trim();if(!body)return;if(!await ok(sb.from('support_messages').insert({user_id:supUser,body:body.slice(0,2000)}),close?'📨 נשלח והפנייה נסגרה':'📨 נשלח'))return;if(close)await setSt('closed');show('support');};
    if(e.target.closest('#supSend'))return send(false);
    if(e.target.closest('#supSendClose'))return send(true);
    if(e.target.closest('#supClose')){await ok(setSt('closed'),'✓ סומנה כטופלה');show('support');return;}
    if(e.target.closest('#supReopen')){await ok(setSt('open'),'↩️ נפתחה מחדש');show('support');return;}
    if(e.target.closest('#supDel')&&(await uiConfirm('למחוק את כל השיחה עם המשתמש?'))&&await ok(sb.from('support_messages').delete().eq('user_id',supUser),'🗑️ נמחק')){await sb.from('support_status').delete().eq('user_id',supUser);supUser=null;show('support');}};
};
/* סקירה: גם דיווחי שפה */
const _bo10Dash=VIEWS.dash;
VIEWS.dash=async function(){await _bo10Dash.call(VIEWS);if(!isAdmin()||cur!=='dash')return;
  const {count}=await sb.from('abuse_reports').select('*',{count:'exact',head:true}).eq('handled',false);const s=$('#boMain .stats');if(!s||cur!=='dash')return;
  s.insertAdjacentHTML('afterbegin','<div class="stat" style="cursor:pointer" data-go="abuse"><div class="n">'+(count||0)+'</div><div class="l">🚫 דיווחי שפה חדשים</div></div>');};
/* ---------- 🔗 מקורות מחירים אוטומטיים (גרסה 12) ---------- */
VIEWS.sources=async function(){
  const {data,error}=await sb.from('price_sources').select('*').order('created_at',{ascending:false});
  if(error){$('#boMain').innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית".</p></div>';return;}
  const all=data||[];
  $('#boMain').innerHTML='<datalist id="srcChains">'+allChainNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>'+
    '<div class="card"><h2>🔗 מקור מחירים חדש</h2><p class="muted">מדביקים קישור — והמחירים נמשכים ממנו לטבלת המחירים, ומתעדכנים לבד כל כמה שעות (מסומנים ✔ רשמי, "עדכון אוטומטי").<br>'+
    '<b>הכי טוב:</b> קובץ מחירים של רשת לפי חוק שקיפות המחירים (PriceFull / Price, גם ‎.gz) — כל הרשתות הגדולות מפרסמות אותם באתרי "שקיפות מחירים" שלהן. מעתיקים את הקישור לקובץ של הסניף.<br>'+
    'אפשר גם דף מוצרים באתר של חנות — אם יש בו נתוני מוצר מובנים הם נקראים ישירות, ואם לא — הבינה המלאכותית מנסה לחלץ (עד 300 מוצרים). אתרים שחוסמים רובוטים או נטענים רק עם JavaScript — לא תמיד יעבדו.</p>'+
    '<div class="row"><input id="srcUrl" dir="ltr" placeholder="https://..." style="flex:2;min-width:220px"><input id="srcChain" list="srcChains" placeholder="רשת / חנות"><input id="srcBranch" placeholder="סניף (לא חובה)"><select id="srcEvery" style="max-width:150px"><option value="3">כל 3 שעות</option><option value="6">כל 6 שעות</option><option value="12" selected>כל 12 שעות</option><option value="24">פעם ביום</option><option value="168">פעם בשבוע</option></select><button class="btn" id="srcAdd">➕ הוספה ומשיכה עכשיו</button></div></div>'+
    '<div class="card"><h2>המקורות ('+all.length+')</h2>'+(all.length?'<div class="tw"><table><thead><tr><th>קישור</th><th>רשת</th><th>תדירות</th><th>ריצה אחרונה</th><th>מצב</th><th></th></tr></thead><tbody>'+all.map(s=>'<tr data-id="'+s.id+'"><td dir="ltr" style="max-width:260px;word-break:break-all">'+(safeLink(s.url)?'<a href="'+esc(safeLink(s.url))+'" target="_blank" rel="noopener">'+esc(String(s.url).slice(0,80))+'</a>':esc(String(s.url||'').slice(0,80)))+'</td><td>'+esc(s.chain)+(s.branch?'<br><span class="muted">'+esc(s.branch)+'</span>':'')+'</td><td>כל '+s.every_hours+' שע׳</td><td>'+(s.last_run?fmt(s.last_run):'—')+'</td><td>'+esc(s.last_status||'')+'</td>'+
      '<td style="white-space:nowrap"><button class="btn sm" data-sa="run">🔄 עכשיו</button> <button class="btn sm sec" data-sa="toggle">'+(s.active?'⏸️ השהיה':'▶️ הפעלה')+'</button> <button class="btn sm bad" data-sa="del" title="מחיקה (כולל המחירים שנמשכו ממנו)">🗑️</button></td></tr>').join('')+'</tbody></table></div>':'<p class="muted">עוד אין מקורות.</p>')+'</div>';
  const run=async id=>{flash('🔄 מושך מחירים... (עד דקה)');let {data:r,error:e}=await sb.functions.invoke('prices-sync',{body:{source_id:id}});if(e&&e.context&&typeof e.context.json==='function'){try{r=await e.context.json();}catch(x){}}
    if(e&&!(r&&r.results)){flash('⚠️ '+(e.context&&e.context.status===404?'הפונקציה prices-sync עוד לא הועלתה (⚙️ הגדרה ראשונית ← שלב 5)':(e.message||'שגיאה')));return;}flash((r.results&&r.results[0]&&r.results[0].status)||'✔');show('sources');};
  $('#srcAdd').onclick=async()=>{const url=$('#srcUrl').value.trim(),chain=$('#srcChain').value.trim();if(!/^https?:\/\//.test(url)){flash('צריך קישור שמתחיל ב-https://');return;}if(!chain){flash('צריך לבחור רשת');return;}
    const {data:row,error:e}=await sb.from('price_sources').insert({url,chain:chain.slice(0,40),branch:$('#srcBranch').value.trim().slice(0,120),every_hours:+$('#srcEvery').value}).select('id').single();if(e){flash('⚠️ '+e.message);return;}run(row.id);};
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-sa]');if(!b)return;const id=b.closest('[data-id]').dataset.id;const s=all.find(x=>x.id===id);
    if(b.dataset.sa==='run')return run(id);
    if(b.dataset.sa==='toggle'&&await ok(sb.from('price_sources').update({active:!s.active}).eq('id',id),s.active?'⏸️ הושהה':'▶️ פעיל'))show('sources');
    if(b.dataset.sa==='del'&&(await uiConfirm('למחוק את המקור וגם את כל המחירים שנמשכו ממנו?'))&&await ok(sb.from('price_sources').delete().eq('id',id),'🗑️ נמחק'))show('sources');};
};
/* ---------- 🏬 עסקים: תמונת מצב של כל העסקים, כניסה לניהול של כל עסק (גרסה 13) ---------- */
VIEWS.biz=async function(){
  const {data,error}=await sb.rpc('biz_overview');
  if(error){$('#boMain').innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית".</p></div>';return;}
  const all=data||[];const pendQ=await sb.from('business_requests').select('*',{count:'exact',head:true}).eq('status','pending');
  const tl=k=>(STORE_TYPES[k]||STORE_TYPES.other)[0]+' '+(STORE_TYPES[k]||STORE_TYPES.other)[1];
  $('#boMain').innerHTML='<div class="stats"><div class="stat"><div class="n">'+all.length+'</div><div class="l">עסקים</div></div><div class="stat" style="cursor:pointer" data-go="bizreq"><div class="n">'+(pendQ.count||0)+'</div><div class="l">בקשות הצטרפות ממתינות</div></div><div class="stat"><div class="n">'+all.reduce((a,b)=>a+b.open_orders,0)+'</div><div class="l">הזמנות פתוחות</div></div><div class="stat"><div class="n">'+Math.round(all.reduce((a,b)=>a+Number(b.sales_30d||0),0)).toLocaleString('he-IL')+' ₪</div><div class="l">מכירות 30 יום (בקופות באתר)</div></div></div>'+
    '<div class="card" style="margin-top:14px"><h2>🏬 כל העסקים</h2><p class="muted">רק משתמשים שאישרת (בקשות הצטרפות / בעלי סופרים) רואים את "ניהול החנות". מכאן אפשר להיכנס לניהול של כל עסק בדיוק כמו בעל העסק — לתקן מלאי, מחירים, פרופיל והזמנות — להציץ בדף הציבורי, או להשבית עסק.</p>'+
    (all.length?'<div class="tw"><table><thead><tr><th>עסק</th><th>מנהלים</th><th>מלאי</th><th>הזמנות</th><th>מכירות 30 יום</th><th>מצב</th><th></th></tr></thead><tbody>'+all.map(b=>'<tr data-chain="'+esc(b.chain)+'"><td><b>'+esc(b.chain)+'</b><br><span class="muted">'+tl(b.category)+'</span></td><td class="muted" dir="ltr" style="max-width:180px;word-break:break-all">'+(b.manager_emails?esc(b.manager_emails):'<span style="color:var(--bad)">אין</span>')+'</td>'+
      '<td>'+b.items+(b.low_items?'<br><span class="muted">⚠️ '+b.low_items+' להזמין</span>':'')+(b.sources?'<br><span class="muted">🔄 '+b.sources+' סנכרון</span>':'')+(b.last_update?'<br><span class="muted">'+fmt(b.last_update)+'</span>':'')+'</td><td>'+b.open_orders+' פתוחות<br><span class="muted">'+b.orders_30d+' ב-30 יום</span></td><td>'+Math.round(b.sales_30d||0).toLocaleString('he-IL')+' ₪</td>'+
      '<td>'+(b.biz_active?'🟢 פעיל':'⏸️ מושבת')+(b.inventory_public?'<br>🌍 דף ציבורי':'')+(b.ordering?'<br>🛍️ מקבל הזמנות':'')+(b.hidden?'<br>🙈 מוסתר':'')+'</td>'+
      '<td style="white-space:nowrap"><button class="btn sm" data-bz="manage">⚙️ ניהול</button> <button class="btn sm sec" data-bz="public">👁️ דף</button> <button class="btn sm sec" data-bz="toggle">'+(b.biz_active?'⏸️ השבתה':'▶️ הפעלה')+'</button></td></tr>').join('')+'</tbody></table></div>':'<p class="muted">עוד אין עסקים. מאשרים בקשות הצטרפות ב"🏪 בקשות הצטרפות" או מקשרים ב"🏪 בעלי סופרים".</p>')+'</div>';
  $('#boMain').onclick=async e=>{const g=e.target.closest('[data-go]');if(g){show(g.dataset.go);return;}const b=e.target.closest('[data-bz]');if(!b)return;const chain=b.closest('[data-chain]').dataset.chain;
    if(b.dataset.bz==='manage'){closeBO();setTimeout(()=>openShop(chain),200);return;}
    if(b.dataset.bz==='public'){closeBO();setTimeout(()=>openStorePublic(chain),200);return;}
    if(b.dataset.bz==='toggle'){const row=all.find(x=>x.chain===chain);if(!(await uiConfirm((row.biz_active?'להשבית':'להפעיל')+' את '+chain+'? (עסק מושבת לא מופיע במדריך ולא מקבל הזמנות)')))return;if(await ok(sb.rpc('biz_set_active',{p_chain:chain,p_active:!row.biz_active}),'✔ עודכן'))show('biz');}};
};
/* ---------- גרסה 14: עריכה ומחיקה של עסקים, שליטה ב"אתר העסקי", "נקרא" בצ'אט, תמונות למוצרים ---------- */
const _bo14Biz=VIEWS.biz;
VIEWS.biz=async function(){await _bo14Biz.call(VIEWS);if(cur!=='biz')return;
  $('#boMain').insertAdjacentHTML('afterbegin','<div class="card"><h2>⚙️ הגדרות לכל העסקים</h2><div class="check"><input type="checkbox" id="bzMode"'+(uiCfg.bizMode!==false?' checked':'')+'><label for="bzMode" style="margin:0;color:var(--text)">בעלי עסקים מאושרים יכולים לעבור בין "האתר העסקי" (מסך מלא לניהול העסק) ל"אתר הרגיל"</label></div><p class="muted">כשכבוי — בעל העסק מנהל את העסק בחלון רגיל בתוך האתר.</p></div>');
  $('#bzMode').onchange=e=>setCfg('ui',Object.assign({},uiCfg,{bizMode:e.target.checked}));
  document.querySelectorAll('#boMain tr[data-chain] td:last-child').forEach(td=>td.insertAdjacentHTML('beforeend',' <button class="btn sm sec" data-bz="edit">✏️ פרופיל</button> <button class="btn sm bad" data-bz="delete">🗑️</button>'));
  const orig=$('#boMain').onclick;
  $('#boMain').onclick=async e=>{const b=e.target.closest('[data-bz]');if(!b)return orig&&orig(e);const chain=b.closest('[data-chain]').dataset.chain;
    if(b.dataset.bz==='edit'){closeBO();shop.tab='profile';setTimeout(()=>openShop(chain),200);return;}
    if(b.dataset.bz==='delete'){if((await uiPrompt('מחיקה לצמיתות של "'+chain+'" — כולל המלאי, ההזמנות, המכירות, הסניפים, המחירים והמנהלים שלו.\nכדי לאשר, כתבו את שם העסק בדיוק:'))!==chain){flash('המחיקה בוטלה');return;}
      const {data,error}=await sb.rpc('biz_delete',{p_chain:chain});flash(error?'⚠️ '+error.message:data==='ok'?'🗑️ העסק נמחק':'⚠️ '+data);if(data==='ok'){loadChains();show('biz');}return;}
    return orig&&orig(e);};
};
const _bo14Support=VIEWS.support;
VIEWS.support=async function(){await _bo14Support.call(VIEWS);if(cur!=='support')return;
  $('#boMain').insertAdjacentHTML('afterbegin','<div class="card"><div class="check"><input type="checkbox" id="chRead"'+(chatCfg.showRead!==false?' checked':'')+'><label for="chRead" style="margin:0;color:var(--text)">הלקוחות רואים ✓✓ כשקראתי את ההודעה שלהם</label></div><p class="muted">כשכבוי — הלקוח רואה רק ✓ "נשלח", גם אחרי שקראת.</p></div>');
  $('#chRead').onchange=async e=>{if(await setCfg('chat',{showRead:e.target.checked}))chatCfg.showRead=e.target.checked;};
};
const _bo14Products=VIEWS.products;
VIEWS.products=async function(){await _bo14Products.call(VIEWS);if(cur!=='products'||!$('#ptb'))return;
  const {data}=await sb.from('products').select('id,image');const img={};(data||[]).forEach(p=>img[p.id]=p.image||'');
  const dress=()=>document.querySelectorAll('#ptb tr[data-id]').forEach(tr=>{if(tr.querySelector('.pimgcell'))return;const i=img[tr.dataset.id];
    tr.insertAdjacentHTML('afterbegin','<td class="pimgcell"><label style="cursor:pointer;display:inline-flex;width:44px;height:44px;border-radius:8px;background:var(--chip);align-items:center;justify-content:center;overflow:hidden" title="תמונה למוצר">'+(i&&safeImg(i)?'<img src="'+esc(safeImg(i))+'" alt="" style="width:100%;height:100%;object-fit:cover">':'📷')+'<input type="file" accept="image/*" data-pimg="'+esc(tr.dataset.id)+'" hidden></label></td>');});
  const th=document.querySelector('#ptb')&&document.querySelector('#ptb').closest('table').querySelector('thead tr');if(th&&!th.querySelector('.pimgth'))th.insertAdjacentHTML('afterbegin','<th class="pimgth">תמונה</th>');
  const ptb=$('#ptb');if(cur!=='products'||!ptb)return;dress();new MutationObserver(dress).observe(ptb,{childList:true});
  $('#boMain').addEventListener('change',async e=>{const f=e.target.closest('[data-pimg]');if(!f||!f.files[0])return;try{const d=await fileToImage(f.files[0],420,150000);if(await ok(sb.from('products').update({image:d}).eq('id',f.dataset.pimg),'📷 התמונה נשמרה')){img[f.dataset.pimg]=d;const tr=f.closest('tr');tr.querySelector('.pimgcell').remove();dress();}}catch(err){flash('⚠️');}});
};
/* ---------- תצוגה ואזור אישי ---------- */
VIEWS.ui=async function(){
  const [u,m]=await Promise.all([cfg('ui'),cfg('me')]);
  const tabs=[['info','👤 פרטים וכתובת'],['budget','💰 תקציב הבית'],['products','🛒 המוצרים שלי'],['purchases','🧾 הקניות שלי'],['stores','🏪 חנויות ואתרים'],['orders','⏰ זמני הזמנה'],['providers','📞 נותני שירות'],['habits','📊 הרגלי קנייה']];
  const off=m.tabsOff||[];
  $('#boMain').innerHTML='<div class="card"><h2>🎛️ תצוגה</h2>'+
    '<div class="check"><input type="checkbox" id="uChat" '+(u.chatHome!==false?'checked':'')+'><label for="uChat" style="margin:0;color:var(--text)">לאפשר "תצוגת צ\'אטים" (כמו וואטסאפ) — כל משתמש בוחר בתפריט ⚙️</label></div>'+
    '<div class="check"><input type="checkbox" id="uBot" '+(u.botHidden?'checked':'')+'><label for="uBot" style="margin:0;color:var(--text)">להסתיר את הבוט יאמי מכל המשתמשים</label></div>'+
    '<div class="check"><input type="checkbox" id="uStats" '+(u.statsShown?'checked':'')+'><label for="uStats" style="margin:0;color:var(--text)">להציג למשתמשים כמה מחוברים עכשיו וכמה משתמשים יש (🟢 ליד הפעמון). בלי סימון — רק מנהלים רואים</label></div>'+
    '<button class="btn" id="uSave" style="margin-top:10px">💾 שמירה</button></div>'+
    '<div class="card"><h2>👤 האזור האישי</h2><label>טקסט פתיחה (מופיע למעלה באזור האישי)</label><textarea id="mIntro" style="min-height:60px" placeholder="כאן שומרים את כל מה שקשור אליך — וככה יאמי יודעת לעזור לך יותר טוב.">'+esc(m.intro||'')+'</textarea>'+
    '<label>אילו לשוניות להציג</label><div class="row" style="flex-wrap:wrap">'+tabs.map(([k,l])=>'<label class="check" style="min-width:160px"><input type="checkbox" data-tab="'+k+'" '+(off.includes(k)?'':'checked')+(k==='info'?' disabled':'')+'> '+l+'</label>').join('')+'</div>'+
    '<label>שדות נוספים בפרטים — שורה לכל שדה: שם השדה | טקסט לדוגמה</label><textarea id="mFields" style="min-height:80px" placeholder="קומה וקוד לבניין | למשל: קומה 3, קוד 1234#\nשעות נוחות למשלוח | למשל: אחרי 17:00">'+esc((m.fields||[]).map(f=>f.label+(f.placeholder?' | '+f.placeholder:'')).join('\n'))+'</textarea>'+
    '<label>סוגי נותני שירות נוספים — שורה לכל סוג (בנוסף ל: אורז משלוח אונליין, משלוח רגיל, הזמנות טלפוניות, אחר)</label><textarea id="mRoles" style="min-height:60px" placeholder="אינסטלטור\nחשמלאי">'+esc((m.roles||[]).join('\n'))+'</textarea>'+
    '<button class="btn" id="mSave" style="margin-top:10px">💾 שמירת האזור האישי</button></div>';
  $('#uSave').onclick=()=>setCfg('ui',Object.assign({},u,{chatHome:$('#uChat').checked,botHidden:$('#uBot').checked,statsShown:$('#uStats').checked}));
  $('#mSave').onclick=()=>{const fields=$('#mFields').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,20).map((x,i)=>{const [l,ph]=x.split('|').map(y=>(y||'').trim());return {id:'f_'+norm(l).replace(/\s/g,'_').slice(0,30),label:l.slice(0,60),placeholder:(ph||'').slice(0,100)};});
    setCfg('me',{intro:$('#mIntro').value.trim().slice(0,300),tabsOff:Array.from(document.querySelectorAll('[data-tab]')).filter(c=>!c.checked).map(c=>c.dataset.tab),fields,roles:$('#mRoles').value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,12)});};
};
VIEWS.setup=function(){
  $('#boMain').innerHTML='<div class="card"><h2>⚙️ שלב 1 — מסד הנתונים (פעם אחת, ובכל עדכון)</h2><p class="muted">ב-Supabase: SQL Editor ← New query ← מדביקים את כל הטקסט הזה ← Run. בטוח להריץ שוב — לא מוחק נתונים.</p><textarea class="sql" id="sqlBox" readonly></textarea><div class="row" style="margin-top:8px"><button class="btn" id="sqlCopy">📋 העתקה</button></div></div>'+
  '<div class="card"><h2>🔐 שלב 2 — הגדרות התחברות ב-Supabase</h2><p class="muted">Authentication ← URL Configuration: Site URL = כתובת האתר שלך, ולהוסיף אותה גם ב-Redirect URLs (עם /** בסוף).<br>Providers ← Email: להשאיר <b>Confirm email פעיל</b> (חשוב לאבטחת המנהל).<br>Password: אורך מינימלי 8.<br>(רשות) Providers ← Google.</p></div>'+
  '<div class="card"><h2>🧠 שלב 3 (רשות) — בינה מלאכותית</h2><p class="muted">הכל נעשה באתר של Supabase, בלי להתקין כלום. בערך 5 דקות:</p><ol class="steps">'+
  '<li><b>מפתח — בחינם (Gemini):</b> נכנסים ל-<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> עם חשבון גוגל ← <b>Create API key</b> ← מעתיקים (מתחיל ב-<code dir="ltr">AIza</code>).<br><small>רוצים את Claude בתשלום במקום? המפתח מ-<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com/settings/keys</a>, ושמו בשלב הבא: <code dir="ltr">ANTHROPIC_API_KEY</code>.</small></li>'+
  '<li><b>שומרים את המפתח ב-Supabase:</b> <a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions/secrets" target="_blank" rel="noopener">פתיחת דף ה-Secrets</a> ← בשדה Name כותבים <code dir="ltr">GEMINI_API_KEY</code> (או <code dir="ltr">ANTHROPIC_API_KEY</code> ל-Claude), ב-Value מדביקים את המפתח ← <b>Save</b>.</li>'+
  '<li><b>מעתיקים את קוד הפונקציה</b> בכפתור הזה: <button class="btn sm" id="fnCopy">📋 העתקת קוד הפונקציה</button></li>'+
  '<li><a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions" target="_blank" rel="noopener">פתיחת Edge Functions</a> ← <b>Deploy a new function</b> ← <b>Via Editor</b>.</li>'+
  '<li>בשם הפונקציה (למעלה, במקום השם שמופיע) כותבים בדיוק: <code dir="ltr">ai-chat</code></li>'+
  '<li>בחלון הקוד: מסמנים הכל (Ctrl+A), מוחקים, ומדביקים (Ctrl+V) את מה שהעתקתם בשלב 3.</li>'+
  '<li>לוחצים <b>Deploy function</b> ומחכים שיופיע שהפונקציה עלתה.</li>'+
  '<li><b>חשוב:</b> בפונקציה ai-chat ← <b>Details</b> ← מכבים את <b>"Verify JWT with legacy secret"</b> ← <b>Save</b>. (בלי זה מופיעה שגיאה 401 Invalid JWT. הפונקציה בודקת בעצמה מי המשתמש.)</li>'+
  '<li>חוזרים לכאן ← לשונית <b>"🤖 הבוט וה-AI"</b> ← מסמנים <b>"פעילה"</b> ← שמירה. בודקים: שואלים את יאמי שאלה כללית.</li></ol>'+
  '<p class="muted">בעדכון עתידי של הפונקציה: נכנסים ל-Edge Functions ← ai-chat ← <b>Code</b> ← מחליפים את כל הקוד בקוד החדש ← Deploy.</p><button class="btn sec" id="fnDl">⬇️ או: הורדת הקוד כקובץ (index.ts)</button></div>';
  $('#sqlBox').value=document.getElementById('setupSql').textContent.trim();
  $('#sqlCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('#sqlBox').value);flash('📋 הועתק — עכשיו להדביק ב-Supabase');}catch(e){$('#sqlBox').select();document.execCommand('copy');flash('📋 הועתק');}};
  $('#fnCopy').onclick=async()=>{const t=document.getElementById('aiFnSrc').textContent.trim()+'\n';try{await navigator.clipboard.writeText(t);flash('📋 הקוד הועתק — עכשיו להדביק ב-Supabase');}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();flash('📋 הועתק');}};
  $('#fnDl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([document.getElementById('aiFnSrc').textContent.trim()+'\n'],{type:'text/plain'}));a.download='index.ts';a.click();};
};
const _bo10Setup=VIEWS.setup;
VIEWS.setup=function(){_bo10Setup();
  $('#boMain').insertAdjacentHTML('beforeend','<div class="card"><h2>📲 שלב 4 — התראות לטלפון ולמחשב גם כשהאתר סגור</h2><p class="muted">בערך 3 דקות, פעם אחת. המפתחות נוצרים אוטומטית — אין מה להגדיר.</p><ol class="steps">'+
    '<li>מוודאים שהרצתם את קוד ה-SQL המעודכן (שלב 1) — הוא מפעיל גם את התוספים <code dir="ltr">pg_net</code> ו-<code dir="ltr">pg_cron</code>.</li>'+
    '<li>מעתיקים את קוד פונקציית ההתראות: <button class="btn sm" id="pushCopy">📋 העתקת קוד הפונקציה push</button></li>'+
    '<li><a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions" target="_blank" rel="noopener">פתיחת Edge Functions</a> ← <b>Deploy a new function</b> ← <b>Via Editor</b> ← שם הפונקציה בדיוק: <code dir="ltr">push</code> ← Ctrl+A ← Ctrl+V ← <b>Deploy function</b>.</li>'+
    '<li><b>חשוב:</b> <a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions/push/details" target="_blank" rel="noopener">push ← Details</a> ← מכבים <b>"Verify JWT with legacy secret"</b> ← <b>Save</b>.</li>'+
    '<li>באתר: 🔔 הפעמון ← <b>"📲 להפעיל התראות במכשיר הזה"</b> ← מאשרים ← <b>"🧪 שליחת התראת ניסיון"</b>. אם הגיעה — הכל עובד 🎉</li></ol>'+
    '<p class="muted">מה נשלח: תשובה בצ\'אט, תשובה מחנות, מבצע בחנות שעוקבים אחריה, ותזכורת עדינה פעם בשבוע למי שלא נכנס 5 ימים. למנהל: הודעות צ\'אט, בקשות הצטרפות ודיווחי שפה. בלי לילה, בלי שבת, ועד 6 ביום (כל משתמש יכול לשנות).</p><button class="btn sec" id="pushDl">⬇️ או: הורדת הקוד כקובץ</button></div>');
  const src=()=>document.getElementById('pushFnSrc').textContent.trim()+'\n';
  $('#pushCopy').onclick=async()=>{try{await navigator.clipboard.writeText(src());flash('📋 הקוד הועתק — עכשיו להדביק ב-Supabase');}catch(e){const ta=document.createElement('textarea');ta.value=src();document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();flash('📋 הועתק');}};
  $('#pushDl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([src()],{type:'text/plain'}));a.download='index.ts';a.click();};
};
const _bo12Setup=VIEWS.setup;
VIEWS.setup=function(){_bo12Setup();
  const fnCard=(id,name,title,why,jwtNote)=>'<li><b>'+title+'</b> — '+why+'<br><button class="btn sm" data-fncopy="'+id+'">📋 העתקת הקוד של '+name+'</button> ← <a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions" target="_blank" rel="noopener">Edge Functions</a> ← Deploy a new function ← Via Editor ← שם בדיוק: <code dir="ltr">'+name+'</code> ← Ctrl+A ← Ctrl+V ← Deploy ← ואז <a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions/'+name+'/details" target="_blank" rel="noopener">'+name+' ← Details</a> ← לכבות <b>Verify JWT</b> ← Save.'+(jwtNote||'')+'</li>';
  $('#boMain').insertAdjacentHTML('beforeend','<div class="card"><h2>🔑 עוד מפתחות Gemini (יותר שאלות ביום)</h2><p class="muted">לכל חשבון גוגל יש מכסה חינמית משלו. מוסיפים מפתחות — וכשאחד מגיע למכסה, יאמי עוברת אוטומטית לבא.</p><ol class="steps"><li>מתחברים לחשבון הגוגל הנוסף ונכנסים ל-<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> ← <b>Create API key</b> ← מעתיקים.</li><li><a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions/secrets" target="_blank" rel="noopener">Supabase ← Secrets</a> ← <b>Add new secret</b> ← Name: <code dir="ltr">GEMINI_API_KEY_2</code> (לחשבון השלישי: <code dir="ltr">GEMINI_API_KEY_3</code>) ← Value: המפתח ← <b>Save</b>.</li><li>בודקים: בק אופיס ← 🤖 הבוט וה-AI ← 🔍 בדיקת חיבור — יופיע כמה מפתחות נמצאו.</li></ol></div>');
  $('#boMain').insertAdjacentHTML('beforeend','<div class="card"><h2>🏪 שלב 5 — ניהול חנויות ומחירים אוטומטיים</h2><p class="muted">אחרי שהרצתם את קוד ה-SQL המעודכן (שלב 1):</p><ol class="steps">'+
    fnCard('posFnSrc','pos','חיבור קופה','מאפשר לתוכנת הקופה של חנות לעדכן מלאי ומכירות בלייב.')+
    fnCard('pricesFnSrc','prices-sync','מחירים אוטומטיים','מושך מחירים מקישורים שהוספתם בבק אופיס ← 🔗 מקורות מחירים, ומתעדכן לבד כל כמה שעות.')+'</ol></div>');
  document.querySelectorAll('[data-fncopy]').forEach(b=>b.onclick=async()=>{const t=document.getElementById(b.dataset.fncopy).textContent.trim()+'\n';try{await navigator.clipboard.writeText(t);flash('📋 הקוד הועתק — עכשיו להדביק ב-Supabase');}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();flash('📋 הועתק');}});
};
/* ---------- גרסה 15: עריכת קטגוריות ---------- */
VIEWS.categories=async function(){
  const v=await cfg('categories');v.extra=Array.isArray(v.extra)?v.extra:[];v.emoji=v.emoji||{};v.hidden=Array.isArray(v.hidden)?v.hidden:[];v.products=v.products||{};v.order=Array.isArray(v.order)?v.order:[];
  const all=()=>{const names=BUILTIN_CATS15.concat(v.extra.map(c=>c.name)).filter((c,i,a)=>c&&a.indexOf(c)===i);const rank=c=>{const i=v.order.indexOf(c);return c==='אחר'?1e6:(i<0?5e5+names.indexOf(c):i);};return names.sort((a,b)=>rank(a)-rank(b));};
  const draw=()=>{const list=all();
    $('#boMain').innerHTML='<div class="card"><h2>🗂️ קטגוריות</h2><p class="muted">הקטגוריות שמופיעות ב"הבית שלי", במאגר המוצרים וברשימה. אפשר להוסיף קטגוריה חדשה, לבחור אייקון לכל קטגוריה (לחיצה על האייקון), לשנות סדר, להסתיר, ולשייך מוצרים לקטגוריה (מוצר בכל שורה — מוצר קיים יעבור לקטגוריה הזו, מוצר חדש יתווסף למאגר). השינויים מגיעים לכל המשתמשים.</p>'+
      '<div class="row"><input id="ncName" maxlength="30" placeholder="שם קטגוריה חדשה (למשל: תינוקות)">'+icField('id="ncEmoji" maxlength="4" placeholder="🛒" aria-label="אייקון לקטגוריה החדשה"','')+'<button class="btn" id="ncAdd">➕ הוספה</button></div></div>'+
      list.map((c,i)=>{const custom=!BUILTIN_CATS15.includes(c);const hid=v.hidden.includes(c);const prods=(v.products[c]||[]).join('\n');
        return '<div class="card" data-cat="'+esc(c)+'" style="'+(hid?'opacity:.55':'')+'"><div class="row" style="align-items:center">'+icField('data-f="emoji" maxlength="4" aria-label="אייקון לקטגוריה '+esc(c)+'"',v.emoji[c]||(v.extra.find(x=>x.name===c)||{}).emoji||CATE[c]||'🛒')+'<b style="flex:1">'+esc(c)+(custom?' <small class="muted">(חדשה)</small>':'')+(hid?' <small class="muted">(מוסתרת)</small>':'')+'</b>'+
          '<button class="btn sm sec" data-mv="-1" '+(i===0?'disabled':'')+' title="למעלה">⬆️</button><button class="btn sm sec" data-mv="1" '+(i>=list.length-2||c==='אחר'?'disabled':'')+' title="למטה">⬇️</button>'+
          (c==='אחר'?'':'<button class="btn sm sec" data-hide="1">'+(hid?'👁️ הצגה':'🙈 הסתרה')+'</button>')+(custom?'<button class="btn sm sec" data-del="1">🗑️</button>':'')+'</div>'+
          '<details><summary class="muted">מוצרים בקטגוריה ('+((v.products[c]||[]).length)+' שהוספת)</summary><textarea data-f="prods" rows="4" style="width:100%;margin-top:6px" placeholder="מוצר בכל שורה">'+esc(prods)+'</textarea></details></div>';}).join('')+
      '<div class="card"><button class="btn" id="catSave" style="width:100%">💾 שמירה — מתעדכן אצל כולם</button></div>';
  };
  const collect=()=>{document.querySelectorAll('#boMain [data-cat]').forEach(card=>{const c=card.dataset.cat;const e=card.querySelector('[data-f=emoji]').value.trim();if(e)v.emoji[c]=e;const ex=v.extra.find(x=>x.name===c);if(ex&&e)ex.emoji=e;
    const ps=card.querySelector('[data-f=prods]').value.split('\n').map(x=>x.trim().slice(0,60)).filter(Boolean);if(ps.length)v.products[c]=Array.from(new Set(ps)).slice(0,500);else delete v.products[c];});};
  draw();
  $('#boMain').onclick=async e=>{
    if(e.target.closest('#ncAdd')){collect();const n=$('#ncName').value.trim().slice(0,30),em=$('#ncEmoji').value.trim()||'🛒';if(!n){flash('כתבו שם');return;}if(all().includes(n)){flash('כבר קיימת');return;}v.extra.push({name:n,emoji:em});draw();return;}
    const card=e.target.closest('[data-cat]');
    if(card&&e.target.closest('[data-mv]')){collect();const list=all().filter(c=>c!=='אחר');const c=card.dataset.cat;const i=list.indexOf(c),j=i+(+e.target.closest('[data-mv]').dataset.mv);if(i<0||j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];v.order=list;draw();return;}
    if(card&&e.target.closest('[data-hide]')){collect();const c=card.dataset.cat;v.hidden=v.hidden.includes(c)?v.hidden.filter(x=>x!==c):v.hidden.concat(c);draw();return;}
    if(card&&e.target.closest('[data-del]')){const c=card.dataset.cat;if(!(await uiConfirm('למחוק את הקטגוריה "'+c+'"? המוצרים שלה יעברו ל"אחר".')))return;collect();v.extra=v.extra.filter(x=>x.name!==c);delete v.products[c];delete v.emoji[c];v.order=v.order.filter(x=>x!==c);draw();return;}
    if(e.target.closest('#catSave')){collect();if(await setCfg('categories',v))applyCatCfg15(v);}
  };
};
/* ---------- אייקונים שהמנהל מוסיף: מספריית האייקונים (Lucide, מעל 2,000) או מתמונה — מופיעים בחלון "בחירת אייקון" אצל כולם ---------- */
let icLib=null;
async function icLoadLib(){if(!icLib){const r=await fetch('/vendor/lucide-1.49.0/icons.json');if(!r.ok)throw new Error('HTTP '+r.status);const o=await r.json();icLib={};Object.keys(o).forEach(n=>{if(Array.isArray(o[n])&&IC_SAFE.test(o[n][0]))icLib[n]=o[n];});}return icLib;}
// תמונה שהמנהל מעלה ← ריבוע קטן (PNG) שנשמר בהגדרות
function icImgFile(f,S){S=S||96;return new Promise((res,rej)=>{const u=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=S;const k=Math.min(S/(im.naturalWidth||S),S/(im.naturalHeight||S)),w=(im.naturalWidth||S)*k,h=(im.naturalHeight||S)*k;
    c.getContext('2d').drawImage(im,(S-w)/2,(S-h)/2,w,h);URL.revokeObjectURL(u);res(c.toDataURL('image/png'));};
  im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'));};im.src=u;});}
window.__icAdd=()=>show('icons');
VIEWS.icons=async function(){
  const v=await cfg('icons');v.list=Array.isArray(v.list)?v.list.filter(x=>x&&x.id):[];
  let pick=null;
  const box=(x,sz)=>'<svg viewBox="0 0 24 24" width="'+(sz||30)+'" height="'+(sz||30)+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icCustomSvg(x)+'</svg>';
  const shownEmo=e=>/[-]/.test(e)?'<span class="muted">—</span>':esc(e);
  const draw=()=>{
    $('#boMain').innerHTML='<div class="card"><h2>🎨 אייקונים</h2><p class="muted">כאן מוסיפים אייקונים חדשים לאתר: בוחרים מספריית האייקונים (מעל 2,000, באותו סגנון של האתר) או מעלים תמונה משלכם. אחרי השמירה האייקון מופיע אצל כל המשתמשים בחלון "בחירת אייקון" — בקטגוריות, במוצרים ובמתכונים. אם כותבים גם אימוג׳י, האייקון יופיע בכל מקום באתר שבו מופיע האימוג׳י הזה (וגם יחליף את האייקון הקודם שלו).</p>'+
      '<div class="icnew"><div class="icnewprev" id="icPrev" aria-live="polite">'+(pick?box(pick,40):'<span class="muted">?</span>')+'</div><div class="icnewbtns"><button class="btn sec" id="icLibOpen" type="button">📚 בחירה מהספרייה</button><label class="btn sec" style="cursor:pointer;margin:0">📤 העלאת תמונה משלי<input type="file" id="icFile" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label></div></div>'+
      '<div id="icLibBox" hidden><input id="icLibQ" type="search" placeholder="חיפוש בעברית או באנגלית (למשל: כלב, dog, flower, baby)" aria-label="חיפוש בספריית האייקונים" style="width:100%;margin:8px 0"><div id="icLibGrid" class="iclibgrid"></div><p class="muted" id="icLibMore"></p></div>'+
      '<div class="row" style="margin-top:10px"><input id="icName" maxlength="30" placeholder="שם האייקון (למשל: כלב)" aria-label="שם האייקון"><input id="icEmo" maxlength="4" placeholder="אימוג׳י (לא חובה)" aria-label="אימוג׳י שהאייקון מחליף (לא חובה)" style="max-width:150px"><button class="btn" id="icAdd" type="button">➕ הוספה ושמירה</button></div></div>'+
      '<div class="card"><h2>האייקונים שהוספת ('+v.list.length+')</h2>'+(v.list.length?'<div class="iclist">'+v.list.map(x=>'<div class="icrow" data-icid="'+esc(x.id)+'"><span class="icbig">'+box(x,30)+'</span><b>'+esc(x.he||'')+'</b><span>'+shownEmo(x.e||'')+'</span><button class="btn sm sec" data-icdel type="button" aria-label="מחיקת האייקון '+esc(x.he||'')+'">🗑️</button></div>').join('')+'</div>':'<p class="muted">עוד לא הוספת אייקונים.</p>')+'</div>';
  };
  const setPick=(p,name)=>{pick=p;const pv=$('#icPrev');if(pv)pv.innerHTML=box(pick,40);const nm=$('#icName');if(nm&&!nm.value.trim()&&name)nm.value=name;};
  const libDraw=()=>{const g=$('#icLibGrid');if(!g||!icLib)return;const q=$('#icLibQ').value.trim().toLowerCase();
    const he=q&&/[֐-׿]/.test(q)?Object.keys(IC_HE).filter(n=>IC_HE[n].includes(q)&&icLib[n]):[];
    const all=Object.keys(icLib).filter(n=>!q||he.includes(n)||n.includes(q)||icLib[n][1].includes(q));
    const ns=he.concat(all.filter(n=>!he.includes(n))).slice(0,240);
    g.innerHTML=ns.map(n=>'<button type="button" data-lib="'+esc(n)+'" title="'+esc(n)+'" aria-label="'+esc((IC_HE[n]||'').split(' ')[0]||n)+'"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icLib[n][0]+'</svg></button>').join('');
    $('#icLibMore').textContent=all.length>240?'מוצגים 240 מתוך '+all.length+' — כתבו מילה כדי לצמצם':(all.length?'':'לא נמצא. נסו מילה באנגלית (למשל dog, flower, baby).');};
  draw();
  $('#boMain').onchange=async e=>{if(e.target.id!=='icFile')return;const f=e.target.files[0];if(!f)return;
    try{let img=await icImgFile(f,96);if(img.length>80000)img=await icImgFile(f,64);setPick({img},f.name.replace(/\.[a-z0-9]+$/i,'').slice(0,30));}catch(err){flash('⚠️ לא הצלחתי לקרוא את התמונה');}};
  $('#boMain').oninput=e=>{if(e.target.id==='icLibQ')libDraw();};
  $('#boMain').onclick=async e=>{
    if(e.target.closest('#icLibOpen')){const b=$('#icLibBox');b.hidden=!b.hidden;if(!b.hidden){$('#icLibGrid').innerHTML='<p class="muted">טוען...</p>';try{await icLoadLib();libDraw();$('#icLibQ').focus();}catch(err){$('#icLibGrid').innerHTML='<p class="muted">⚠️ לא הצלחתי לטעון את הספרייה ('+esc(err.message)+')</p>';}}return;}
    const lb=e.target.closest('[data-lib]');if(lb){const n=lb.dataset.lib;document.querySelectorAll('#icLibGrid .on').forEach(x=>x.classList.remove('on'));lb.classList.add('on');setPick({svg:icLib[n][0]},(IC_HE[n]||'').split(' ')[0]||'');return;}
    if(e.target.closest('#icAdd')){
      const he=$('#icName').value.trim().slice(0,30);let em=$('#icEmo').value.trim().replace(/️/g,'');
      if(!pick){flash('בחרו אייקון מהספרייה או העלו תמונה');return;}if(!he){flash('כתבו שם לאייקון');$('#icName').focus();return;}
      if(em&&!EMO_ONE.test(em)){flash('בשדה האימוג׳י אפשר לשים אימוג׳י אחד בלבד');return;}
      if(em&&v.list.some(x=>x.e===em)){flash('כבר יש אייקון לאימוג׳י הזה');return;}
      if(!em){let c=0xE100;const used=new Set(v.list.map(x=>x.e));while(used.has(String.fromCharCode(c))&&c<0xF8FF)c++;em=String.fromCharCode(c);}
      const x={id:Date.now().toString(36),he,e:em};if(pick.img)x.img=pick.img;else x.svg=pick.svg;
      if(!icCustomSvg(x)){flash('⚠️ האייקון לא תקין');return;}
      v.list.push(x);if(await setCfg('icons',v,'✔️ האייקון נוסף — מופיע אצל כולם')){applyIcons(v);pick=null;draw();}else v.list.pop();return;}
    const row=e.target.closest('[data-icid]');
    if(row&&e.target.closest('[data-icdel]')){const x=v.list.find(y=>y.id===row.dataset.icid);if(!x||!(await uiConfirm('למחוק את האייקון "'+(x.he||'')+'"? איפה שבחרו אותו יופיע במקומו אייקון רגיל.')))return;
      const keep=v.list;v.list=v.list.filter(y=>y!==x);if(await setCfg('icons',v,'🗑️ האייקון נמחק')){applyIcons(v);draw();}else v.list=keep;}
  };
};
(function(){const st=document.createElement('style');
st.textContent='.icnew{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.icnewprev{width:64px;height:64px;border-radius:14px;border:2px dashed var(--line,#ccc);display:flex;align-items:center;justify-content:center;color:var(--accent,#2f7a4b);flex-shrink:0}'+
  '.icnewbtns{display:flex;gap:8px;flex-wrap:wrap}.iclibgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:6px;max-height:340px;overflow:auto;padding:2px}'+
  '.iclibgrid button{aspect-ratio:1;min-height:44px;border-radius:10px;border:1px solid var(--line,#ddd);background:var(--recv,#f7f7f7);color:var(--accent,#2f7a4b);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'+
  '.iclibgrid button.on{background:var(--accent,#2f7a4b);color:#fff}.iclist{display:flex;flex-direction:column;gap:6px}.icrow{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line,#eee)}.icrow b{flex:1}'+
  '.icbig{color:var(--accent,#2f7a4b);display:inline-flex}';
document.head.appendChild(st);})();
/* ---------- גרסה 15: משתמשים משניים — כמה יש לכל אחד, והגבלה ---------- */
VIEWS.secondary=async function(){
  const g=await cfg('secondary');
  const {data,error}=await sb.rpc('admin_secondary_overview');
  if(error){$('#boMain').innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL (⚙️ הגדרה ראשונית). '+esc(error.message)+'</p></div>';return;}
  const rows=data||[];
  $('#boMain').innerHTML='<div class="card"><h2>👥 משתמשים משניים</h2><p class="muted">כל משתמש יכול להזמין משתמשים משניים (בני משפחה, עובדים) בקישור + סיסמה חד פעמית, ולבחור מה הם רואים ומה מותר להם. כאן רואים כמה יש לכל אחד ומגבילים.</p>'+
    '<div class="row" style="align-items:center"><label style="flex:1">מקסימום לכל משתמש (ריק = בלי הגבלה)</label><input id="secMax" type="number" min="0" max="1000" value="'+esc(g.max==null?'':g.max)+'" style="max-width:110px"><button class="btn" id="secMaxSave">💾 שמירה</button></div></div>'+
    '<div class="card"><h2>לפי משתמש ('+rows.length+')</h2>'+(rows.length?'<div style="overflow-x:auto"><table><tr><th>משתמש</th><th>משניים</th><th>גישה מלאה (קוד)</th><th>הגבלה אישית</th><th></th></tr>'+
      rows.map(r=>'<tr data-u="'+esc(r.user_id)+'"><td><b>'+esc(r.name||'')+'</b><br><small dir="ltr">'+esc(r.email||'')+'</small></td><td>'+(r.count||0)+'</td><td>'+(r.full||0)+'</td><td><input type="number" min="0" max="1000" data-lim value="'+esc(r.limit==null?'':r.limit)+'" placeholder="כללי" style="max-width:90px"></td><td><button class="btn sm" data-limsave="1">💾</button></td></tr>').join('')+'</table></div>':'<p class="muted">עוד אף אחד לא הזמין משתמשים משניים.</p>')+'</div>';
  $('#boMain').onclick=async e=>{
    if(e.target.closest('#secMaxSave')){const v=$('#secMax').value.trim();await setCfg('secondary',{max:v===''?null:Math.max(0,parseInt(v,10)||0)});return;}
    const b=e.target.closest('[data-limsave]');if(b){const tr=b.closest('[data-u]');const v=tr.querySelector('[data-lim]').value.trim();await ok(sb.rpc('admin_set_secondary_limit',{p_user:tr.dataset.u,p_limit:v===''?null:parseInt(v,10)}),'✔️ נשמר');}
  };
};
/* ---------- גרסה 16: פרטי אבטחה ברשימת המשתמשים (IP, דפדפן, שעה) ---------- */
const _bo16Users=VIEWS.users;
VIEWS.users=async function(){await _bo16Users.call(VIEWS);if(cur!=='users')return;
  const {data,error}=await sb.rpc('admin_user_security');if(error||!data)return;
  const by={};data.forEach(r=>by[r.user_id]=r);
  const browser=ua=>{ua=ua||'';const os=/iPhone|iPad/.test(ua)?'iPhone':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Mac OS/.test(ua)?'Mac':/Linux/.test(ua)?'Linux':'';const br=/Edg\//.test(ua)?'Edge':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'';return [br,os].filter(Boolean).join(' · ')||(ua?ua.slice(0,30):'');};
  const deco=()=>document.querySelectorAll('#utb tr[data-uid]').forEach(tr=>{if(tr.querySelector('.sec16'))return;const r=by[tr.dataset.uid];if(!r)return;const td=tr.children[2];if(!td)return;
    td.insertAdjacentHTML('beforeend','<div class="sec16 muted" style="font-size:12px;line-height:1.5;margin-top:4px">'+
      (r.signup_at?'📝 '+esc(fmt(r.signup_at))+' · <span dir="ltr">'+esc(r.signup_ip||'?')+'</span> · '+esc(browser(r.signup_ua))+'<br>':'')+
      (r.login_at?'🔑 '+esc(fmt(r.login_at))+' · <span dir="ltr">'+esc(r.login_ip||'?')+'</span> · '+esc(browser(r.login_ua)):'🔑 —')+
      (r.fails_24h?'<br><b style="color:#c2410c">⚠️ '+r.fails_24h+' ניסיונות כושלים ב-24 שעות</b>':'')+'</div>');});
  deco();const tb=$('#utb');if(tb)new MutationObserver(deco).observe(tb,{childList:true});
};
/* ---------- גרסה 16: 🔐 אבטחה — הגדרות והיומן ---------- */
VIEWS.security=async function(){
  const c=Object.assign({signup_per_ip_hour:3,login_fail_max:5,login_window_min:15,reset_per_email_hour:3,reset_link_min:30,ip_allow:[],verify_email:true},await cfg('security'));const vOn=c.verify_email!==false;
  const {data:ev,error}=await sb.from('auth_events').select('kind,email,ip,ua,detail,created_at').order('created_at',{ascending:false}).limit(300);
  const K={signup:'📝 הרשמה',signup_blocked:'⛔ הרשמה נחסמה',login:'🔑 כניסה',login_fail:'❌ כניסה נכשלה',login_locked:'🔒 נחסם זמנית',google_login:'🟢 כניסה עם גוגל',reset_request:'📧 בקשת איפוס',reset_blocked:'⛔ איפוס נחסם',password_changed:'🔁 הקוד שונה'};
  const D={honeypot:'מלכודת בוטים',too_fast:'טופס נשלח מהר מדי',domain:'מייל לא אמיתי / זמני',owner:'מייל של בעלים',rate:'יותר מדי מאותו IP',email:'לפי מייל',ip:'לפי IP',reset_link:'מקישור איפוס',settings:'מהאזור האישי',verify_sent:'נשלח מייל אימות',verify_resent:'מייל אימות נשלח שוב',mail:'מייל האימות לא נשלח'};
  const list=ev||[];const n=k=>list.filter(e=>e.kind===k&&Date.now()-new Date(e.created_at)<86400000).length;
  $('#boMain').innerHTML='<div class="stats">'+[['signup','הרשמות היום'],['signup_blocked','הרשמות שנחסמו'],['login','כניסות'],['login_fail','כניסות שנכשלו'],['login_locked','חסימות זמניות'],['reset_request','בקשות איפוס']].map(([k,l])=>'<div class="stat"><div class="n">'+n(k)+'</div><div class="l">'+l+' (24 שעות)</div></div>').join('')+'</div>'+
    '<div class="card"><h2>📧 אימות מייל בהרשמה <span class="pill" style="background:'+(vOn?'#d8f0e3;color:#0b5a3c':'#fbe3e3;color:#8a1c1c')+';padding:3px 10px;border-radius:999px;font-size:13px">'+(vOn?'✅ פעיל':'⏸️ כבוי')+'</span></h2>'+
    '<p class="muted">כשפעיל: מי שנרשם מקבל מייל עם קישור, ורק אחרי שלוחץ עליו אפשר להיכנס. כך אף אחד לא יכול לפתוח חשבון על המייל של מישהו אחר (וגם לא לקבל דרכו הרשאות). כניסה עם גוגל לא מושפעת.</p>'+
    '<p class="muted">⚠️ המיילים נשלחים דרך Supabase. בלי שרת מיילים משלכם (Supabase ← Authentication ← SMTP) יש מגבלה של כמה מיילים בשעה — אם נרשמים מתלוננים שהמייל לא מגיע, אפשר לכבות כאן זמנית.</p>'+
    '<button class="btn'+(vOn?' sec':'')+'" id="scVerify">'+(vOn?'⏸️ לכבות את אימות המייל':'▶️ להפעיל את אימות המייל')+'</button></div>'+
    '<div class="card"><h2>🚨 התראות למנהל <span class="pill" style="background:'+(c.alerts_off!==true?'#d8f0e3;color:#0b5a3c':'#fbe3e3;color:#8a1c1c')+';padding:3px 10px;border-radius:999px;font-size:13px">'+(c.alerts_off!==true?'✅ פעיל':'⏸️ כבוי')+'</span></h2>'+
    '<p class="muted">כל 15 דקות השרת בודק את השעה האחרונה, ואם משהו חריג (הרבה כניסות כושלות, הרשמות שנחסמו, תקלות אצל משתמשים, או ניסיון לנחש סיסמאות) — כל המנהלים מקבלים התראה לטלפון. כל סוג לכל היותר פעם ב-6 שעות.</p>'+
    '<button class="btn'+(c.alerts_off!==true?' sec':'')+'" id="scAlerts">'+(c.alerts_off!==true?'⏸️ לכבות את ההתראות':'▶️ להפעיל את ההתראות')+'</button></div>'+
    '<div class="card"><h2>🔐 הגדרות אבטחה</h2><p class="muted">כל ההגנות עובדות בשרת וברקע — המשתמשים לא מרגישים בהן. דרושה הפונקציה auth-guard (⚙️ הגדרה ראשונית ← שלב 6).</p>'+
    '<div class="row"><label style="flex:1">מקסימום הרשמות מאותו IP בשעה</label><input id="sc1" type="number" min="1" max="1000" value="'+c.signup_per_ip_hour+'" style="max-width:100px"></div>'+
    '<div class="row"><label style="flex:1">מקסימום כניסות כושלות (לכל מייל / IP)</label><input id="sc2" type="number" min="3" max="100" value="'+c.login_fail_max+'" style="max-width:100px"></div>'+
    '<div class="row"><label style="flex:1">בתוך כמה דקות (וכמה זמן החסימה)</label><input id="sc3" type="number" min="5" max="1440" value="'+c.login_window_min+'" style="max-width:100px"></div>'+
    '<div class="row"><label style="flex:1">מקסימום בקשות איפוס לכל מייל בשעה</label><input id="sc4" type="number" min="1" max="20" value="'+c.reset_per_email_hour+'" style="max-width:100px"></div>'+
    '<div class="row"><label style="flex:1">תוקף קישור איפוס (דקות)</label><input id="sc5" type="number" min="5" max="60" value="'+c.reset_link_min+'" style="max-width:100px"></div>'+
    '<label>כתובות IP שלא מוגבלות (שורה לכל כתובת — למשל שרת הסינון של נטפרי, אם כל המשתמשים יוצאים ממנו)</label><textarea id="sc6" dir="ltr" rows="3">'+esc((c.ip_allow||[]).join('\n'))+'</textarea>'+
    '<button class="btn" id="scSave" style="margin-top:8px">💾 שמירה</button></div>'+
    '<div class="card"><h2>📜 יומן אבטחה (300 אחרונים)</h2>'+(error?'<p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL. '+esc(error.message)+'</p>':'')+
    '<div class="row"><input id="seq" placeholder="סינון לפי מייל או IP"><select id="sek"><option value="">הכל</option>'+Object.entries(K).map(([k,l])=>'<option value="'+k+'">'+l+'</option>').join('')+'</select></div>'+
    '<div class="tw"><table><thead><tr><th>מתי</th><th>מה</th><th>מייל</th><th>IP</th><th>דפדפן</th></tr></thead><tbody id="setb"></tbody></table></div></div>';
  const draw=()=>{const q=($('#seq').value||'').toLowerCase(),k=$('#sek').value;$('#setb').innerHTML=list.filter(e=>(!k||e.kind===k)&&(!q||(e.email+' '+e.ip).toLowerCase().includes(q))).map(e=>'<tr><td style="white-space:nowrap">'+esc(fmt(e.created_at))+'</td><td>'+(K[e.kind]||esc(e.kind))+(e.detail&&D[e.detail]?' <small class="muted">('+D[e.detail]+')</small>':'')+'</td><td dir="ltr" style="text-align:right">'+esc(e.email)+'</td><td dir="ltr" style="text-align:right">'+esc(e.ip)+'</td><td><small class="muted">'+esc((e.ua||'').slice(0,60))+'</small></td></tr>').join('')||'<tr><td colspan="5" class="muted">אין רישומים</td></tr>';};
  draw();$('#seq').oninput=draw;$('#sek').onchange=draw;
  $('#scSave').onclick=async()=>{const v=id=>parseInt($(id).value,10);await setCfg('security',Object.assign({},c,{signup_per_ip_hour:v('#sc1'),login_fail_max:v('#sc2'),login_window_min:v('#sc3'),reset_per_email_hour:v('#sc4'),reset_link_min:v('#sc5'),ip_allow:$('#sc6').value.split(/\s+/).map(x=>x.trim()).filter(Boolean).slice(0,200),verify_email:vOn}),'💾 נשמר');};
  $('#scAlerts').onclick=async()=>{const on=c.alerts_off!==true;if(await setCfg('security',Object.assign({},c,{alerts_off:on}),on?'⏸️ ההתראות כבויות':'✅ ההתראות פעילות'))VIEWS.security();};
  $('#scVerify').onclick=async()=>{if(vOn&&!(await uiConfirm('לכבות את אימות המייל? נרשמים חדשים ייכנסו מיד, בלי לאשר את המייל.')))return;if(await setCfg('security',Object.assign({},c,{verify_email:!vOn}),vOn?'⏸️ אימות המייל כבוי':'✅ אימות המייל פעיל'))VIEWS.security();};
};
/* ---------- גרסה 16: 📜 פעילות — מה כל אחד עושה באתר ---------- */
VIEWS.activity=async function(){
  const {data,error}=await sb.from('activity_log').select('user_id,name,action,detail,created_at').order('created_at',{ascending:false}).limit(1000);
  const A={login:'🔑 נכנס/ה',logout:'🚪 יצא/ה',add_item:'➕ הוסיף/ה לרשימה',remove_item:'🗑️ מחק/ה מהרשימה',finish_shopping:'✅ סיים/ה קנייה',price_report:'💰 דיווח מחיר',invite_created:'👥 יצר/ה הזמנה',member_removed:'👥 הסיר/ה משתמש',feedback:'💌 שלח/ה הערה',upload_confirm:'🧾 אישר/ה קבלה/רשימה',torah_submit:'📜 שלח/ה דבר תורה',machine_added:'🎰 הוסיף/ה מכונה'};
  const list=data||[];
  const people={};list.forEach(r=>{people[r.user_id]=people[r.user_id]||{name:r.name,n:0,last:r.created_at};people[r.user_id].n++;});
  $('#boMain').innerHTML='<div class="card"><h2>📜 פעילות באתר</h2><p class="muted">מה כל משתמש עושה: כניסות, הוספות לרשימה, סיום קניות, דיווחי מחיר, הזמנות ועוד (1000 הפעולות האחרונות, נשמר 180 יום). לחיצה על שם — רק הפעולות שלו.</p>'+(error?'<p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL. '+esc(error.message)+'</p>':'')+
    '<div class="row"><input id="acq" placeholder="חיפוש לפי שם או פירוט"><select id="aca"><option value="">כל הפעולות</option>'+Object.entries(A).map(([k,l])=>'<option value="'+k+'">'+l+'</option>').join('')+'</select><select id="acu"><option value="">כל המשתמשים</option>'+Object.entries(people).sort((a,b)=>b[1].n-a[1].n).map(([id,p])=>'<option value="'+esc(id)+'">'+esc(p.name||'?')+' ('+p.n+')</option>').join('')+'</select></div>'+
    '<div class="tw"><table><thead><tr><th>מתי</th><th>מי</th><th>מה</th><th>פירוט</th></tr></thead><tbody id="actb"></tbody></table></div></div>';
  const draw=()=>{const q=($('#acq').value||'').toLowerCase(),a=$('#aca').value,u=$('#acu').value;
    $('#actb').innerHTML=list.filter(r=>(!a||r.action===a)&&(!u||r.user_id===u)&&(!q||(r.name+' '+r.detail).toLowerCase().includes(q))).slice(0,500).map(r=>'<tr><td style="white-space:nowrap">'+esc(fmt(r.created_at))+'</td><td><a href="#" data-acuser="'+esc(r.user_id)+'">'+esc(r.name||'?')+'</a></td><td>'+(A[r.action]||esc(r.action))+'</td><td><small>'+esc(r.detail)+'</small></td></tr>').join('')||'<tr><td colspan="4" class="muted">אין פעולות</td></tr>';};
  draw();$('#acq').oninput=draw;$('#aca').onchange=draw;$('#acu').onchange=draw;
  $('#boMain').onclick=e=>{const l=e.target.closest('[data-acuser]');if(!l)return;e.preventDefault();$('#acu').value=l.dataset.acuser;draw();};
};
/* שלב 6 בהגדרה הראשונית: הפונקציה auth-guard */
const _bo16Setup=VIEWS.setup;
VIEWS.setup=function(){_bo16Setup();
  $('#boMain').insertAdjacentHTML('beforeend','<div class="card"><h2>🔐 שלב 6 — הגנה על הרשמה, כניסה ואיפוס קוד</h2><p class="muted">פעם אחת, כ-3 דקות. אחרי זה כל ההגנות עובדות בשרת וברקע.</p><ol class="steps">'+
    '<li>מריצים את קוד ה-SQL המעודכן (שלב 1).</li>'+
    '<li><button class="btn sm" data-fncopy="agFnSrc">📋 העתקת הקוד של auth-guard</button> ← <a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions" target="_blank" rel="noopener">Edge Functions</a> ← <b>Deploy a new function</b> ← <b>Via Editor</b> ← שם: <code dir="ltr">auth-guard</code> ← מדביקים ← <b>Deploy</b>.</li>'+
    '<li><b>חשוב:</b> <a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/functions/auth-guard/details" target="_blank" rel="noopener">auth-guard ← Details</a> ← מכבים <b>Verify JWT</b> ← Save.</li>'+
    '<li><a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/auth/providers" target="_blank" rel="noopener">Authentication ← Sign In / Providers ← Email</a>: <b>Email OTP Expiration</b> = <code>1800</code> (קישור איפוס תקף 30 דקות). אם "Confirm email" דלוק — אפשר להשאיר; ההרשמה דרך האתר לא דורשת אישור מייל.</li>'+
    '<li><a href="https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp/auth/rate-limits" target="_blank" rel="noopener">Authentication ← Rate Limits</a>: להעלות את "sign-ups and sign-ins" ל-<b>300</b> לכל 5 דקות (ההגבלה האמיתית לכל משתמש נעשית עכשיו אצלנו).</li></ol>'+
    '<p class="muted">בדיקה: בבק אופיס ← 🔐 אבטחה — אחרי כניסה אחת יופיע שם "🔑 כניסה". עד שהפונקציה מועלית, ההרשמה והכניסה ממשיכות לעבוד כמו קודם.</p></div>');
  document.querySelectorAll('[data-fncopy="agFnSrc"]').forEach(b=>b.onclick=async()=>{const t=document.getElementById('agFnSrc').textContent.trim()+'\n';try{await navigator.clipboard.writeText(t);flash('📋 הקוד הועתק — עכשיו להדביק ב-Supabase');}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();flash('📋 הועתק');}});
};
/* ---------- גרסה 16.4: הגדרה ראשונית — קישורים מדויקים לכל שלב, ושלב 2 מפורט ---------- */
const _bo164Setup=VIEWS.setup;
VIEWS.setup=function(){_bo164Setup();
  const P='https://supabase.com/dashboard/project/ygyfodxfbebnkwdcbjrp';
  const L=(href,txt)=>'<a href="'+href+'" target="_blank" rel="noopener"><b>'+txt+'</b> ↗</a>';
  const C=v=>'<code dir="ltr">'+esc(v)+'</code> <button class="btn sm sec" data-cp164="'+esc(v)+'" title="העתקה">📋</button>';
  const card=n=>[...document.querySelectorAll('#boMain .card')].find(c=>{const h=c.querySelector('h2');return h&&h.textContent.includes('שלב '+n+' ');});
  /* כל הקישורים במקום אחד — בראש הדף */
  $('#boMain').insertAdjacentHTML('afterbegin','<div class="card"><h2>🔗 כל הקישורים לניהול האתר — במקום אחד</h2><p class="muted">כל קישור נפתח בלשונית חדשה, ישר במקום הנכון. אם מבקשים להתחבר — מתחברים עם החשבון של האתר ולוחצים שוב על הקישור.</p><ul class="steps">'+
    '<li>🗄️ Supabase — '+L(P+'/sql/new','SQL Editor (להרצת קוד שלב 1)')+' · '+L(P+'/auth/users','רשימת המשתמשים')+' · '+L(P+'/editor','הטבלאות')+'</li>'+
    '<li>🔐 התחברות — '+L(P+'/auth/url-configuration','כתובות האתר (URL Configuration)')+' · '+L(P+'/auth/providers','שיטות כניסה (Email / Google)')+' · '+L(P+'/auth/rate-limits','הגבלות קצב')+' · '+L(P+'/auth/templates','נוסח המיילים')+'</li>'+
    '<li>⚡ פונקציות שרת — '+L(P+'/functions','Edge Functions')+' · '+L(P+'/functions/secrets','Secrets (מפתחות)')+'</li>'+
    '<li>🔵 גוגל — '+L('https://console.cloud.google.com/auth/clients','Google Cloud ← Clients')+' · '+L('https://console.cloud.google.com/auth/branding','מסך ההסכמה (Branding)')+' · '+L('https://aistudio.google.com/apikey','מפתח Gemini')+'</li>'+
    '<li>▲ אחסון ודומיין — '+L('https://vercel.com/dashboard','Vercel')+' · '+L('https://dash.cloudflare.com','Cloudflare (DNS)')+' · '+L('https://github.com/yosefh770h-lgtm/shopping-list','הקוד ב-GitHub')+'</li>'+
    '<li>🌐 האתר — '+L('https://www.yamshopping.com','www.yamshopping.com')+'</li></ul></div>');
  /* שלב 1 — קישור ישיר ל-SQL Editor */
  const c1=card(1);if(c1){const p=c1.querySelector('p.muted');if(p)p.innerHTML='<b>1.</b> לוחצים 📋 העתקה (למטה). <b>2.</b> '+L(P+'/sql/new','פותחים את SQL Editor — שאילתה חדשה')+'. <b>3.</b> לוחצים בחלון הלבן ← Ctrl+V ← <b>Run</b> (או Ctrl+Enter). <b>4.</b> מחכים ל-"Success". בטוח להריץ שוב בכל עדכון — לא מוחק נתונים.<br><small>אם מופיעה הודעה "destructive operation" — לוחצים <b>Run this query</b>.</small>';}
  /* שלב 2 — מפורט עם קישורים מדויקים וערכים להעתקה */
  const c2=card(2);if(c2)c2.outerHTML='<div class="card"><h2>🔐 שלב 2 — הגדרות התחברות ב-Supabase (פעם אחת, כ-5 דקות)</h2><ol class="steps">'+
    '<li><b>כתובת האתר:</b> '+L(P+'/auth/url-configuration','פתיחת URL Configuration')+'<br>• בשדה <b>Site URL</b> מוחקים מה שיש ומדביקים: '+C('https://yamshopping.com')+' ← <b>Save changes</b>.<br>• ב-<b>Redirect URLs</b> לוחצים <b>Add URL</b> ומוסיפים כל אחת מאלה (אחת בכל פעם ← <b>Save URLs</b>):<br>'+C('https://www.yamshopping.com/**')+'<br>'+C('https://yamshopping.com/**')+'<br><small>(הכוכביות בסוף חשובות — הן מאפשרות חזרה לאתר אחרי כניסה עם גוגל ואחרי איפוס קוד.)</small></li>'+
    '<li><b>כניסה במייל וקוד:</b> '+L(P+'/auth/providers','פתיחת Sign In / Providers')+' ← לוחצים על <b>Email</b>:<br>• <b>Enable Email provider</b> — דלוק.<br>• <b>Confirm email</b> — אפשר להשאיר כמו שהוא. ההרשמה באתר לא שולחת מייל אישור (אחרי שלב 6).<br>• <b>Minimum password length</b>: '+C('8')+'<br>• <b>Email OTP Expiration</b>: '+C('1800')+' (קישור איפוס תקף 30 דקות).<br>← <b>Save</b>.</li>'+
    '<li><b>כניסה עם גוגל (רשות):</b><br>• '+L('https://console.cloud.google.com/auth/clients','Google Cloud ← Clients')+' ← לוחצים על ה-Client שלכם (או <b>Create client</b> ← Web application).<br>• <b>Authorized JavaScript origins</b> ← Add URI: '+C('https://www.yamshopping.com')+' ושוב Add URI: '+C('https://yamshopping.com')+'<br>• <b>Authorized redirect URIs</b> — צריך להופיע בדיוק (לא לשנות!): '+C('https://ygyfodxfbebnkwdcbjrp.supabase.co/auth/v1/callback')+' ← <b>Save</b>.<br>• אם הכניסה עם גוגל כבר עובדת — סיימתם את הסעיף הזה. בפעם הראשונה בלבד: מעתיקים את <b>Client ID</b> ואת <b>Client secret</b> (גוגל מציגה את ה-secret רק ביצירה) ← '+L(P+'/auth/providers','Supabase ← Providers')+' ← <b>Google</b> ← Enable ← מדביקים את שניהם ← <b>Save</b>.<br>• שם האתר והלוגו שגוגל מציגה: '+L('https://console.cloud.google.com/auth/branding','מסך ההסכמה (Branding)')+' ← App name: '+C('רשימת קניות')+' ← בהמשך הדף <b>Authorized domains</b>: '+C('yamshopping.com')+' ← Save.</li>'+
    '<li><b>הגבלות קצב:</b> '+L(P+'/auth/rate-limits','פתיחת Rate Limits')+' ← <b>Rate limit for sign ups and sign ins</b>: '+C('300')+' ← Save. (ההגנה האמיתית לכל משתמש פועלת באתר עצמו — שלב 6.)</li>'+
    '<li><b>בדיקה:</b> '+L('https://www.yamshopping.com','פותחים את האתר')+' בחלון גלישה בסתר ← נכנסים עם מייל וקוד, ואם הפעלתם — גם עם גוגל. אחרי הכניסה צריך לחזור ל-yamshopping.com.</li></ol>'+
    '<p class="muted">❓ "redirect_uri_mismatch" בכניסה עם גוגל = הכתובת בסעיף 3 לא הועתקה בדיוק. חוזרים לאתר אחר אחרי כניסה = חסרה כתובת בסעיף 1.</p></div>';
  document.querySelectorAll('[data-cp164]').forEach(b=>b.onclick=async()=>{const t=b.dataset.cp164;try{await navigator.clipboard.writeText(t);flash('📋 הועתק: '+t);}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();flash('📋 הועתק');}});
};
/* כפתורי ההעתקה של הקוד פותחים עכשיו את הקובץ בגיטהאב (שם: כפתור "Copy raw file"). פונקציות השרת עולות לבד מגיטהאב בכל מיזוג */
const _boGhSetup=VIEWS.setup;
VIEWS.setup=function(){_boGhSetup();
  const gh=id=>{window.open(SRV_GH+SRV_PATH[id],'_blank','noopener');flash('📂 נפתח בגיטהאב — לוחצים על כפתור ההעתקה (Copy raw file) ומדביקים ב-Supabase');};
  const set=(el,id,txt)=>{if(!el)return;el.textContent=txt;el.onclick=e=>{e.preventDefault();gh(id);};};
  const box=$('#sqlBox');if(box){box.style.display='none';box.insertAdjacentHTML('afterend','<p class="muted">הקוד נמצא בקובץ <code dir="ltr">supabase/schema.sql</code> בגיטהאב (רק אתה רואה אותו).</p>');}
  set($('#sqlCopy'),'setupSql','📂 פתיחת קוד ה-SQL בגיטהאב');
  set($('#fnCopy'),'aiFnSrc','📂 פתיחת קוד הפונקציה בגיטהאב');set($('#fnDl'),'aiFnSrc','📂 פתיחת הקוד בגיטהאב');
  set($('#pushCopy'),'pushFnSrc','📂 פתיחת קוד push בגיטהאב');set($('#pushDl'),'pushFnSrc','📂 פתיחת הקוד בגיטהאב');
  document.querySelectorAll('[data-fncopy]').forEach(b=>set(b,b.dataset.fncopy,'📂 פתיחת הקוד בגיטהאב'));
  document.querySelectorAll('#boMain p.muted').forEach(p=>{if(p.innerHTML.includes('לוחצים 📋 העתקה (למטה)'))p.innerHTML=p.innerHTML.replace('לוחצים 📋 העתקה (למטה)','לוחצים 📂 פתיחת קוד ה-SQL בגיטהאב (למטה) ← Copy raw file');});
  $('#boMain').insertAdjacentHTML('afterbegin','<div class="card"><p class="muted">ℹ️ פונקציות השרת (Edge Functions) עולות לבד מגיטהאב בכל מיזוג. את קוד ה-SQL עדיין מריצים ידנית בשלב 1.</p></div>');
};
/* ---------- גרסה 16.5: 📋 רשימות מוכנות לשבת ולחגים — עריכה ---------- */
VIEWS.ready=async function(){
  const v=await cfg('readyLists');let lists=Array.isArray(v.lists)&&v.lists.length?v.lists:READY165.map(r=>Object.assign({},r));
  const draw=()=>{$('#boMain').innerHTML='<div class="card"><h2>📋 רשימות מוכנות</h2><p class="muted">הרשימות שהמשתמשים רואים ב-⚙️ ← "רשימות מוכנות לשבת ולחגים" ובכפתור שברשימה ריקה. בוחרים רשימה, מורידים מה שלא צריך ומוסיפים בלחיצה. מוצר בכל שורה. השינויים מגיעים לכולם.</p></div>'+
    lists.map((r,i)=>'<div class="card" data-ri="'+i+'"><div class="row" style="align-items:center"><input data-f="e" value="'+esc(r.e||'')+'" maxlength="4" style="max-width:70px;font-size:20px;text-align:center"><input data-f="n" value="'+esc(r.n||'')+'" maxlength="40" placeholder="שם הרשימה" style="flex:1">'+
      '<button class="btn sm sec" data-mv="-1" '+(i?'':'disabled')+'>⬆️</button><button class="btn sm sec" data-mv="1" '+(i<lists.length-1?'':'disabled')+'>⬇️</button><button class="btn sm sec" data-del="1">🗑️</button></div>'+
      '<textarea data-f="items" rows="6" style="width:100%;margin-top:6px" placeholder="מוצר בכל שורה">'+esc(r.items||'')+'</textarea></div>').join('')+
    '<div class="card"><div class="row"><button class="btn sec" id="rlAdd">➕ רשימה חדשה</button><button class="btn sec" id="rlReset">↩️ חזרה לרשימות המקוריות</button></div><button class="btn" id="rlSave" style="width:100%;margin-top:8px">💾 שמירה — מתעדכן אצל כולם</button></div>';};
  const collect=()=>{lists=[...document.querySelectorAll('#boMain [data-ri]')].map(c=>{const g=f=>c.querySelector('[data-f='+f+']').value;return {e:g('e').trim()||'📋',n:g('n').trim().slice(0,40),items:g('items').split('\n').map(x=>x.trim().slice(0,60)).filter(Boolean).slice(0,150).join('\n')};});};
  draw();
  $('#boMain').onclick=async e=>{const c=e.target.closest('[data-ri]');
    if(e.target.closest('#rlAdd')){collect();lists.push({e:'📋',n:'',items:''});draw();return;}
    if(e.target.closest('#rlReset')){if(!(await uiConfirm('לחזור לרשימות המקוריות? מה שלא נשמר יימחק.')))return;lists=READY165_DEFAULT.map(r=>Object.assign({},r));draw();return;}
    if(c&&e.target.closest('[data-mv]')){collect();const i=+c.dataset.ri,j=i+(+e.target.closest('[data-mv]').dataset.mv);[lists[i],lists[j]]=[lists[j],lists[i]];draw();return;}
    if(c&&e.target.closest('[data-del]')){collect();if(!(await uiConfirm('למחוק את הרשימה "'+(lists[+c.dataset.ri].n||'')+'"?')))return;lists.splice(+c.dataset.ri,1);draw();return;}
    if(e.target.closest('#rlSave')){collect();lists=lists.filter(r=>r.n&&r.items);if(!lists.length){flash('צריך לפחות רשימה אחת עם שם ומוצרים');return;}
      if(await setCfg('readyLists',{lists}))READY165=lists;draw();}
  };
};
/* ---------- גרסה 16.1: ✏️ טקסטים ותוכן — עריכת כל הטקסטים באתר ---------- */
VIEWS.texts=async function(){
  const v=Object.assign({story:'',changelog:[],tour:'',howto:[],replace:[]},await cfg('texts'));
  const ai=await cfg('ai');const guide0=ai.siteGuide||'';
  if(!v.changelog.length)v.changelog=CHANGELOG.map(([ver,date,was,now])=>({v:ver,date,was,now}));
  else{const top=Math.max(parseFloat(v.changelog[0]&&v.changelog[0].v)||0,parseFloat(v.seenV)||0),have=new Set(v.changelog.map(c=>String(c.v)));
    /* גרסה חדשה מהקוד שעוד לא נשמרה כאן — מופיעה ראשונה, ונשמרת בלחיצה על שמירה */
    v.changelog=CHANGELOG.filter(c=>!have.has(c[0])&&parseFloat(c[0])>top).map(([ver,date,was,now])=>({v:ver,date,was,now})).concat(v.changelog);}
  if(!v.story)v.story=ABOUT_STORY;if(!v.tour)v.tour=SITE_TOUR16;
  const draw=()=>{
    $('#boMain').innerHTML='<div class="card"><h2>✏️ טקסטים ותוכן</h2><p class="muted">כאן עורכים את הטקסטים שהלקוחות ובעלי העסקים רואים: הסיפור באודות, "מה חדש" בכל גרסה, ההסברים של יאמי — ואפשר להחליף כל מילה או משפט בכל האתר. השינויים מגיעים לכולם מיד. (הודעות קבועות נוספות: 🎨 תוכן ועיצוב · 🆕 עדכונים לאתר · 🤖 הבוט וה-AI.)</p></div>'+
      '<div class="card"><h2>ℹ️ הסיפור באודות</h2><textarea id="txStory" rows="7" style="width:100%">'+esc(v.story)+'</textarea><p class="muted">שורה ריקה = פסקה חדשה.</p></div>'+
      '<div class="card"><h2>🆕 מה חדש — לפי גרסאות</h2><p class="muted">הגרסה העליונה מוצגת פעם אחת לכל משתמש אחרי עדכון, וכל הגרסאות מופיעות באודות. כתבו רק מה שהמשתמשים מרגישים בפועל.</p><div id="txLog">'+
        v.changelog.map((c,i)=>'<div class="item" data-ci="'+i+'"><div class="row"><input data-cf="v" value="'+esc(c.v)+'" placeholder="גרסה" style="max-width:90px"><input data-cf="date" value="'+esc(c.date)+'" placeholder="תאריך" style="max-width:160px"><button class="btn sm sec" data-cdel="1">🗑️</button></div><label>מה היה</label><textarea data-cf="was" rows="2" style="width:100%">'+esc(c.was)+'</textarea><label>מה חדש</label><textarea data-cf="now" rows="3" style="width:100%">'+esc(c.now)+'</textarea></div>').join('')+
        '</div><button class="btn sec" id="txAddV">➕ גרסה חדשה (למעלה)</button></div>'+
      '<div class="card"><h2>👩‍🍳 יאמי — "מה יש באתר?"</h2><textarea id="txTour" rows="10" style="width:100%">'+esc(v.tour)+'</textarea></div>'+
      '<div class="card"><h2>👩‍🍳 יאמי — תשובות לשאלות</h2><p class="muted">כשמישהו כותב ליאמי שאלה שמכילה אחת מהמילים — היא עונה בדיוק את התשובה שכתבתם. כמה ניסוחים — מפרידים בפסיק.</p><div id="txHow">'+
        v.howto.map((h,i)=>'<div class="item" data-hi="'+i+'"><div class="row"><input data-hf="q" value="'+esc(h.q)+'" placeholder="מילים בשאלה, למשל: משלוח, משלוחים"><button class="btn sm sec" data-hdel="1">🗑️</button></div><textarea data-hf="a" rows="3" style="width:100%" placeholder="התשובה">'+esc(h.a)+'</textarea></div>').join('')+
        '</div><button class="btn sec" id="txAddH">➕ שאלה ותשובה</button></div>'+
      '<div class="card"><h2>🤖 מה הבינה המלאכותית יודעת על האתר</h2><p class="muted">ריק = ההסבר המובנה. מה שתכתבו כאן יאמי תשתמש בו כשהיא עונה על שאלות על האתר.</p><textarea id="txGuide" rows="8" style="width:100%">'+esc(ai.siteGuide||'')+'</textarea></div>'+
      '<div class="card"><h2>🔁 החלפת מילים ומשפטים בכל האתר</h2><p class="muted">כל מקום באתר שמופיע בו הטקסט משמאל — יוצג במקומו הטקסט מימין (כפתורים, כותרות, הסברים). לא משנה מה שמשתמשים כותבים, ולא את הבק אופיס.</p><div id="txRep">'+
        v.replace.map((r,i)=>'<div class="row" data-ri="'+i+'"><input data-rf="from" value="'+esc(r.from)+'" placeholder="הטקסט הקיים"><span>←</span><input data-rf="to" value="'+esc(r.to)+'" placeholder="הטקסט החדש"><button class="btn sm sec" data-rdel="1">🗑️</button></div>').join('')+
        '</div><button class="btn sec" id="txAddR">➕ החלפה</button></div>'+
      '<div class="card"><button class="btn" id="txSave" style="width:100%">💾 שמירה — מתעדכן אצל כולם</button></div>';
  };
  const collect=()=>{v.story=$('#txStory').value;v.tour=$('#txTour').value;
    v.changelog=[...document.querySelectorAll('#txLog [data-ci]')].map(el=>{const g=f=>el.querySelector('[data-cf='+f+']').value.trim();return {v:g('v'),date:g('date'),was:g('was'),now:g('now')};}).filter(c=>c.v);
    v.howto=[...document.querySelectorAll('#txHow [data-hi]')].map(el=>({q:el.querySelector('[data-hf=q]').value.trim(),a:el.querySelector('[data-hf=a]').value.trim()})).filter(h=>h.q&&h.a);
    v.replace=[...document.querySelectorAll('#txRep [data-ri]')].map(el=>({from:el.querySelector('[data-rf=from]').value,to:el.querySelector('[data-rf=to]').value})).filter(r=>r.from.trim().length>=2);
    ai.siteGuide=$('#txGuide').value.slice(0,6000);};
  draw();
  $('#boMain').onclick=async e=>{
    if(e.target.closest('#txAddV')){collect();v.changelog.unshift({v:'',date:new Date().toLocaleDateString('he-IL',{month:'long',year:'numeric'}),was:'',now:''});draw();return;}
    if(e.target.closest('#txAddH')){collect();v.howto.push({q:'',a:''});draw();return;}
    if(e.target.closest('#txAddR')){collect();v.replace.push({from:'',to:''});draw();return;}
    const cd=e.target.closest('[data-cdel]');if(cd){collect();v.changelog.splice(+cd.closest('[data-ci]').dataset.ci,1);draw();return;}
    const hd=e.target.closest('[data-hdel]');if(hd){collect();v.howto.splice(+hd.closest('[data-hi]').dataset.hi,1);draw();return;}
    const rd=e.target.closest('[data-rdel]');if(rd){collect();v.replace.splice(+rd.closest('[data-ri]').dataset.ri,1);draw();return;}
    if(e.target.closest('#txSave')){collect();if(!v.changelog.length){flash('צריך לפחות גרסה אחת');return;}v.seenV=APP_VERSION;
      const ok1=await setCfg('texts',v,'💾 נשמר — מתעדכן אצל כולם');if(guide0!==ai.siteGuide)await setCfg('ai',ai,'💾 נשמר');if(ok1)applyTexts161(v);}
  };
};
/* ---------- גרסה 16.1: הודעות מהבק אופיס — פותח את חלון ההתכתבות (אותו חלון כמו מהאתר) ---------- */
VIEWS.broadcast=async function(){
  $('#boMain').innerHTML='<div class="card"><h2>📣 הודעות למשתמשים</h2><p class="muted">אפשר לשלוח הודעה לכל המשתמשים (או רק ללקוחות / רק לבעלי עסקים), או להתכתב עם משתמש מסוים. ההודעות מגיעות לצ׳אט של המשתמש עם צוות האתר וכהתראה לטלפון. אפשר להתכתב גם מתוך האתר עצמו: ⚙️ ← ניהול האתר ← "הודעות למשתמשים".</p>'+
    '<div class="row"><select id="bcT"><option value="all">כל המשתמשים</option><option value="customers">רק לקוחות</option><option value="business">רק בעלי עסקים</option></select></div><textarea id="bcB" maxlength="4000" rows="5" style="width:100%" placeholder="ההודעה"></textarea><div class="row"><button class="btn" id="bcGo">📣 שליחה לכולם</button><button class="btn sec" id="bcChat">💬 להתכתבות עם משתמש מסוים</button></div></div>';
  $('#bcChat').onclick=()=>{closeBO();openAdminChat161();};
  $('#bcGo').onclick=async()=>{const body=$('#bcB').value.trim();if(!body){flash('כתבו הודעה');return;}if(!(await uiConfirm('לשלוח ל'+$('#bcT').selectedOptions[0].textContent+'?')))return;
    const {data,error}=await sb.rpc('admin_broadcast',{p_body:body,p_target:$('#bcT').value});if(error){flash('⚠️ '+error.message);return;}flash('📣 נשלח ל-'+(data||0)+' משתמשים');$('#bcB').value='';};
};
/* כפתור "💬 הודעה" ליד כל משתמש ברשימת המשתמשים */
const _bo161Users=VIEWS.users;
VIEWS.users=async function(){await _bo161Users.call(VIEWS);if(cur!=='users')return;
  const add=()=>document.querySelectorAll('#utb tr[data-uid]').forEach(tr=>{if(tr.querySelector('[data-msg161]'))return;const td=tr.lastElementChild;if(td)td.insertAdjacentHTML('afterbegin','<button class="btn sm sec" data-msg161="'+esc(tr.dataset.uid)+'" title="שליחת הודעה">💬</button> ');});
  add();const tb=$('#utb');if(tb)new MutationObserver(add).observe(tb,{childList:true});
  $('#boMain').addEventListener('click',e=>{const b=e.target.closest('[data-msg161]');if(!b)return;e.stopPropagation();closeBO();openAdminChat161(b.dataset.msg161);},true);
};

/* ================= גרסה 18: בק אופיס מסודר — תפריט בקבוצות, "מה כולם עושים", ביגוד והמלצות ================= */
if(!MOD_TABS.includes('clothing'))MOD_TABS.push('clothing');
/* ---------- תפריט בקבוצות: בצד במחשב, ובטלפון כפתור אחד שנפתח ---------- */
const BO_GROUPS=[
  ['📊','ראשי',['dash','pending','activity']],
  ['🛡️','בוטים ואבטחה',['shield','scrapers','security']],
  ['✅','לאישור ותוכן מהקהילה',['torah','reviews','clothing']],
  ['👥','משתמשים וקשר',['users','support','broadcast','feedback','abuse','secondary','reporters','staff']],
  ['🏪','חנויות ומחירים',['chains','biz','bizreq','stores','posts','messages','prices','sources','products','categories','icons','ready']],
  ['🎨','האתר והבוט',['texts','content','ui','bot','ads','updates']],
  ['⚙️','מערכת',['errors','backup','setup']]];
(function(){const nav=$('#boNav');if(!nav||nav.dataset.g18)return;nav.dataset.g18='1';
  if(!nav.querySelector('[data-s="clothing"]'))nav.insertAdjacentHTML('beforeend','<button data-s="clothing">👗 ביגוד והמלצות</button>');
  if(!nav.querySelector('[data-s="pending"]'))nav.insertAdjacentHTML('beforeend','<button data-s="pending">✅ ממתין לאישור <span class="bobadge" id="boPendN" hidden></span></button>');
  if(!nav.querySelector('[data-s="errors"]'))nav.insertAdjacentHTML('beforeend','<button data-s="errors">🐞 יומן תקלות</button>');
  /* 🛡️ בוטים ואבטחה — קטגוריה נפרדת, שנייה בתפריט (המסכים עצמם ב-js/086-shield.js וב-js/052.js) */
  if(!nav.querySelector('[data-s="shield"]'))nav.insertAdjacentHTML('beforeend','<button data-s="shield">🛡️ חומת הגנה ובוטים <span class="bobadge" id="boShN" hidden></span></button>');
  if(!nav.querySelector('[data-s="scrapers"]'))nav.insertAdjacentHTML('beforeend','<button data-s="scrapers">🕵️ מי מעתיק מחירים</button>');
  const act=nav.querySelector('[data-s="activity"]');if(act)act.textContent='👀 מה כולם עושים';
  const btns={};nav.querySelectorAll('button[data-s]').forEach(b=>btns[b.dataset.s]=b);
  const used=new Set();const frag=document.createDocumentFragment();
  const srch=document.createElement('input');srch.className='bonavq';srch.type='search';srch.placeholder='🔍 חיפוש בתפריט...';srch.setAttribute('aria-label','חיפוש בתפריט');frag.appendChild(srch);
  BO_GROUPS.forEach(([ic,name,keys])=>{const g=document.createElement('div');g.className='bogrp';g.innerHTML='<div class="bogh">'+ic+' '+name+'</div>';
    keys.forEach(k=>{if(btns[k]&&!used.has(k)){used.add(k);g.appendChild(btns[k]);}});if(g.children.length>1)frag.appendChild(g);});
  const rest=Object.keys(btns).filter(k=>!used.has(k));if(rest.length){const g=document.createElement('div');g.className='bogrp';g.innerHTML='<div class="bogh">➕ עוד</div>';rest.forEach(k=>g.appendChild(btns[k]));frag.appendChild(g);}
  nav.innerHTML='';nav.appendChild(frag);
  const tg=document.createElement('button');tg.id='boNavToggle';tg.type='button';tg.setAttribute('aria-expanded','false');tg.innerHTML='☰ <span id="boNavCur">📊 סקירה</span><i>▾</i>';nav.parentNode.insertBefore(tg,nav);
  tg.onclick=()=>{const o=!nav.classList.contains('open');nav.classList.toggle('open',o);tg.setAttribute('aria-expanded',String(o));if(o)setTimeout(()=>srch.focus(),50);};
  srch.oninput=()=>{const q=srch.value.trim();nav.querySelectorAll('.bogrp').forEach(g=>{let any=false;g.querySelectorAll('button[data-s]').forEach(b=>{const m=!q||b.textContent.includes(q);b.classList.toggle('qhide',!m);if(m&&!b.hidden)any=true;});g.classList.toggle('qhide',!any);});};
  const sync=()=>{const on=nav.querySelector('button.on');$('#boNavCur').textContent=on?on.textContent:'';nav.querySelectorAll('.bogrp').forEach(g=>g.classList.toggle('allhid',![...g.querySelectorAll('button[data-s]')].some(b=>!b.hidden)));};
  new MutationObserver(sync).observe(nav,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
  nav.addEventListener('click',e=>{if(e.target.closest('button[data-s]')){nav.classList.remove('open');tg.setAttribute('aria-expanded','false');srch.value='';srch.oninput();}});
  sync();})();

/* ---------- 👀 מה כולם עושים — כולל סידורים ---------- */
const ACT18={login:['🔑','נכנס/ה'],logout:['🚪','יצא/ה'],add_item:['➕','הוסיף/ה לרשימה'],remove_item:['🗑️','מחק/ה מהרשימה'],check_item:['✔️','סימן/ה שנקנה'],finish_shopping:['✅','סיים/ה קנייה'],
  errand_add:['📌','הוסיף/ה סידור'],errand_done:['☑️','סיים/ה סידור'],errand_del:['✖️','מחק/ה סידור'],new_list:['📝','רשימה חדשה'],basket:['💰','בדק/ה איפה הכי זול'],scan:['📷','סרק/ה ברקוד'],
  price_report:['💰','דיווח מחיר'],cloth_rec:['⭐','המליץ/ה על חנות ביגוד'],cloth_shop:['👗','הציע/ה חנות ביגוד'],wedding_list:['💍','יצר/ה רשימה לחתונה'],invite_created:['👥','יצר/ה הזמנה'],member_removed:['👥','הסיר/ה משתמש'],
  feedback:['💌','שלח/ה הערה'],upload_confirm:['🧾','אישר/ה קבלה/רשימה'],torah_submit:['📜','שלח/ה דבר תורה'],machine_added:['🎰','הוסיף/ה מכונה'],broadcast:['📣','שלח/ה הודעה לכולם'],message_user:['💬','שלח/ה הודעה למשתמש']};
const ACT_GROUPS18={'':'הכל',list:'📝 רשימות וקניות',errand:'📌 סידורים',price:'💰 מחירים',cloth:'👗 ביגוד וחתונה',user:'🔑 כניסות ומשתמשים'};
const actGroup18=a=>/^errand/.test(a)?'errand':/item|finish|list|basket|scan|upload/.test(a)?'list':/price/.test(a)?'price':/cloth|wedding/.test(a)?'cloth':'user';
/* כל הפעולות בטווח שבוחרים (לא רק האחרונות): מושכים בדפים של 1000 עד הסוף. השמירה בשרת נשארת 180 יום */
let acDays18=7,acShow18=500;
async function acFetch18(days){const since=new Date(Date.now()-days*864e5).toISOString();const out=[];let error=null;
  for(let i=0;i<200000;i+=1000){const r=await sb.from('activity_log').select('user_id,name,action,detail,created_at').gte('created_at',since).order('created_at',{ascending:false}).range(i,i+999);
    if(r.error){error=r.error;break;}const d=r.data||[];out.push(...d);if(d.length<1000)break;}
  return {data:out,error};}
VIEWS.activity=async function(){
  $('#boMain').innerHTML='<div class="card muted">טוען את כל הפעולות של '+(acDays18>=180?'180 הימים האחרונים':acDays18===1?'היום':acDays18+' הימים האחרונים')+'...</div>';
  const {data,error}=await acFetch18(acDays18);if(cur!=='activity')return;acShow18=500;
  const list=data||[];const dayK=d=>new Date(d).toDateString();const today=dayK(new Date());
  const people={};list.forEach(r=>{const p=people[r.user_id]=people[r.user_id]||{id:r.user_id,name:r.name,n:0,last:r.created_at,lastA:r.action,lastD:r.detail,err:0,open:{}};p.n++;
    if(/^errand/.test(r.action)){p.err++;const t=String(r.detail||'');if(!(t in p.open))p.open[t]=r.action==='errand_add';}});
  const tod=list.filter(r=>dayK(r.created_at)===today);
  const kp=(n,l)=>'<div class="stat"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>';
  $('#boMain').innerHTML='<div class="card"><h2>👀 מה כולם עושים</h2><p class="muted">כל מה שקורה באתר — כניסות, רשימות, סידורים, מחירים וביגוד (נשמר 180 יום). לחיצה על אדם — רק הפעולות שלו.</p><div class="seg18" style="margin-top:6px">'+[[1,'היום'],[7,'שבוע'],[30,'חודש'],[180,'הכל (180 יום)']].map(([d,l])=>'<button class="btn sec sm'+(d===acDays18?' on':'')+'" data-acdays="'+d+'">'+l+'</button>').join('')+'</div><p class="muted" style="margin:6px 0 0">'+list.length.toLocaleString('he-IL')+' פעולות בטווח הזה</p>'+(error?'<p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL. '+esc(error.message)+'</p>':'')+
    '<div class="stats" style="margin-top:10px">'+kp(new Set(tod.map(r=>r.user_id)).size,'פעילים היום')+kp(tod.length,'פעולות היום')+kp(tod.filter(r=>r.action==='errand_add').length,'📌 סידורים שנוספו היום')+kp(tod.filter(r=>r.action==='finish_shopping').length,'✅ קניות שהסתיימו היום')+'</div></div>'+
    '<div class="card"><h2>🧑‍🤝‍🧑 לפי אנשים</h2><div class="ppl18">'+Object.values(people).sort((a,b)=>new Date(b.last)-new Date(a.last)).slice(0,60).map(p=>{const openE=Object.entries(p.open).filter(([t,o])=>o&&t).map(([t])=>t);
      return '<button class="pp18" data-acuser="'+esc(p.id)+'"><b>'+esc(p.name||'?')+'</b><small>'+esc(fmt(p.last))+' · '+esc((ACT18[p.lastA]||['•',p.lastA]).join(' '))+'</small><small>'+p.n+' פעולות'+(p.err?' · 📌 '+p.err+' בסידורים':'')+'</small>'+(openE.length?'<span class="oe18">📌 '+esc(openE.slice(0,3).join(' · '))+(openE.length>3?' +'+(openE.length-3):'')+'</span>':'')+'</button>';}).join('')+'</div></div>'+
    '<div class="card"><h2>🕘 ציר זמן</h2><div class="seg18">'+Object.entries(ACT_GROUPS18).map(([k,l])=>'<button class="btn sec sm'+(k?'':' on')+'" data-ag="'+k+'">'+l+'</button>').join('')+'</div>'+
    '<div class="row" style="margin-top:8px"><input id="acq" placeholder="חיפוש לפי שם או פירוט"><select id="acu"><option value="">כל המשתמשים</option>'+Object.values(people).sort((a,b)=>b.n-a.n).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name||'?')+' ('+p.n+')</option>').join('')+'</select></div><div id="actl18"></div></div>';
  let grp='';
  const draw=()=>{const q=($('#acq').value||'').toLowerCase(),u=$('#acu').value;let lastDay='';
    const rows=list.filter(r=>(!grp||actGroup18(r.action)===grp)&&(!u||r.user_id===u)&&(!q||(r.name+' '+r.detail).toLowerCase().includes(q)));const total=rows.length;rows.splice(acShow18);
    $('#actl18').innerHTML=(rows.map(r=>{const d=new Date(r.created_at);const dk=d.toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'numeric'});const a=ACT18[r.action]||['•',r.action];
      const head=dk!==lastDay?'<div class="tlday">'+esc(dk)+'</div>':'';lastDay=dk;
      return head+'<div class="tl18 g-'+actGroup18(r.action)+'"><span class="tli">'+a[0]+'</span><span class="tlt">'+d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})+'</span><span class="tlb"><a href="#" data-acuser="'+esc(r.user_id)+'">'+esc(r.name||'?')+'</a> '+esc(a[1])+(r.detail?' — <small>'+esc(r.detail)+'</small>':'')+'</span></div>';}).join('')||'<p class="muted">אין פעולות</p>')+(total>rows.length?'<button class="btn sec" data-acmore style="width:100%;margin-top:10px">⬇️ עוד פעולות (מוצגות '+rows.length.toLocaleString('he-IL')+' מתוך '+total.toLocaleString('he-IL')+')</button>':'');};
  draw();$('#acq').oninput=()=>{acShow18=500;draw();};$('#acu').onchange=()=>{acShow18=500;draw();};
  $('#boMain').onclick=e=>{const dd=e.target.closest('[data-acdays]');if(dd){acDays18=+dd.dataset.acdays;VIEWS.activity();return;}
    if(e.target.closest('[data-acmore]')){acShow18+=1000;draw();return;}
    const g=e.target.closest('[data-ag]');if(g){grp=g.dataset.ag;acShow18=500;document.querySelectorAll('[data-ag]').forEach(b=>b.classList.toggle('on',b===g));draw();return;}
    const l=e.target.closest('[data-acuser]');if(!l)return;e.preventDefault();$('#acu').value=l.dataset.acuser;draw();$('#actl18').scrollIntoView({behavior:'smooth',block:'start'});};
};

/* ---------- 👗 ביגוד והמלצות: חנויות, המלצות לקוחות, ורשימות החתונה ---------- */
/* מתג ראשי: האם המשתמשים רואים בכלל את ביגוד וחתונה (באתר ובאפליקציה). נשמר ב-collector ← stores_off, כמו תיבת "👗 ביגוד וחתונה" באיסוף המחירים — שני המקומות תמיד מסונכרנים */
function clothSwitch18(c){const on=!((c&&c.stores_off)||[]).includes('clothing');
  return '<div class="card" style="border:2px solid '+(on?'var(--ok)':'#e0b400')+'"><label style="display:flex;gap:8px;align-items:center;cursor:pointer;font-size:15px"><input type="checkbox" id="clothShow18" style="width:auto;flex:0 0 auto;margin:0" '+(on?'checked':'')+'> <b>👁️ להציג את "ביגוד וחתונה" למשתמשים</b></label>'+
    '<p class="muted" style="margin:6px 0 0">'+(on?'✅ <b>מוצג עכשיו לכולם</b> — באתר ובאפליקציה.':'🙈 <b>מוסתר עכשיו מכולם</b> — באתר ובאפליקציה: אין כפתור ביגוד בלשונית החנויות, קישורים ששותפו לא נפתחים, ויאמי לא עונה על ביגוד וחתונה. כל החנויות וההמלצות נשמרות, וחוזרות כשמדליקים.')+'</p></div>';}
document.addEventListener('change',async e=>{if(!e.target||e.target.id!=='clothShow18')return;const box=e.target;box.disabled=true;
  const c=await cfg('collector');const off=(Array.isArray(c.stores_off)?c.stores_off:[]).filter(k=>k!=='clothing');if(!box.checked)off.push('clothing');
  await setCfg('collector',Object.assign({},c,{stores_off:off}),box.checked?'✅ ביגוד וחתונה מוצג שוב לכל המשתמשים':'🙈 ביגוד וחתונה הוסתר מכל המשתמשים');
  try{if(typeof applyConfig==='function')applyConfig('collector',Object.assign({},c,{stores_off:off}));}catch(err){}
  VIEWS.clothing();});
VIEWS.clothing=async function(){
  const [a,b,w,cc,gd,vv,colC]=await Promise.all([sb.from('clothing_shops').select('*').order('created_at',{ascending:false}).limit(1000),sb.from('store_recs').select(COLS23.recs).order('created_at',{ascending:false}).limit(1500),cfg('wedding_lists'),cfg('cloth_cats'),cfg('cloth_guide'),sb.from('cloth_votes').select('*').order('created_at',{ascending:false}).limit(3000),cfg('collector')]);
  if(a.error||b.error){$('#boMain').innerHTML='<div class="card"><h2>👗 ביגוד והמלצות</h2><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL (⚙️ הגדרה ראשונית ← שלב 1). '+esc((a.error||b.error).message)+'</p></div>';return;}
  const shops=a.data||[],all=b.data||[],votes=vv.data||[];const recs=all.filter(r=>r.kind!=='category'),cats=all.filter(r=>r.kind==='category');
  const CATS={women:(Array.isArray(cc.women)&&cc.women.length?cc.women:CLOTH_SUBS18.women).map(x=>x.slice()),men:(Array.isArray(cc.men)&&cc.men.length?cc.men:CLOTH_SUBS18.men).map(x=>x.slice())};
  const G={women:'👩 נשים',men:'👨 גברים',both:'👩👨 נשים וגברים'};const S={women:'👩 נשים',men:'👨 גברים',wedding:'💍 חתונה'};
  const subName=(sec,k)=>{const l=(CATS[sec]||[]).find(x=>x[0]===k)||(k==='groom'?[k,'🤵','חתן']:k==='bride'?[k,'👰','כלה']:null);return l?l[1]+' '+l[2]:k;};
  const vc=(t,id)=>{const l=votes.filter(x=>x.target===t&&x.target_id===id);return {ok:l.filter(x=>x.vote>0).length,bad:l.filter(x=>x.vote<0).length};};
  const reports=votes.filter(x=>x.vote<0&&!x.handled);const tname=x=>x.target==='shop'?((shops.find(s=>s.id===x.target_id)||{}).name||'(נמחקה)'):(((recs.find(r=>r.id===x.target_id)||{}).shop)||'המלצה');
  const pendS=shops.filter(s=>s.status==='pending'),pendR=recs.filter(r=>r.status==='pending'),pendC=cats.filter(r=>r.status==='pending');
  const shopRow=s=>{const v=vc('shop',s.id);return '<div class="item">'+(s.featured?'<span class="pill">⭐ האתר ממליץ</span> ':'')+'<b>'+esc(s.name)+'</b> <span class="pill">'+(G[s.gender]||'')+'</span>'+(s.wedding?' <span class="pill">💍 חתונה</span>':'')+(s.status==='pending'?' <span class="pill">⏳ ממתין</span>':'')+(v.ok||v.bad?' <span class="pill">✅ '+v.ok+' · ❌ '+v.bad+'</span>':'')+'<div class="muted">'+esc([s.city,s.address,s.phone].filter(Boolean).join(' · '))+'</div>'+crSlot('shops',s.id,{b:1})+'<div class="muted">'+(s.subs||[]).map(k=>esc(subName(s.gender==='men'?'men':'women',k))).join(' · ')+'</div>'+
    '<div class="row" style="margin-top:6px">'+(s.status==='pending'?'<button class="btn sm" data-csok="'+s.id+'">✔ אישור</button>':'')+'<button class="btn sm sec" data-csfeat="'+s.id+'">'+(s.featured?'☆ להוריד "האתר ממליץ"':'⭐ האתר ממליץ')+'</button><button class="btn sm sec" data-csed="'+s.id+'">✏️ עריכה</button><button class="btn sm bad" data-csdel="'+s.id+'">🗑️ מחיקה</button></div></div>';};
  const recRow=r=>{const v=vc('rec',r.id);return '<div class="item">'+(r.official?'<span class="pill">⭐ האתר ממליץ</span> ':'')+(r.stars?'⭐'.repeat(r.stars)+' ':'')+'<b>'+esc(r.kind==='item'?'💡 '+r.body:r.shop||'')+'</b> <span class="pill">'+esc(S[r.section]||'')+(r.sub?' · '+esc(subName(r.section,r.sub)):'')+'</span>'+(r.status==='pending'?' <span class="pill">⏳ ממתין</span>':'')+(v.ok||v.bad?' <span class="pill">✅ '+v.ok+' · ❌ '+v.bad+'</span>':'')+
    (r.kind==='item'?'':'<div>'+esc(r.body)+'</div>')+'<div class="muted">'+(r.official?'צוות האתר':crSlot('clothing',r.id))+(r.city?' · '+esc(r.city):'')+' · '+esc(fmt(r.created_at))+'</div><div class="row" style="margin-top:6px">'+(r.status==='pending'?'<button class="btn sm" data-crok="'+r.id+'">✔ אישור</button>':'')+'<button class="btn sm sec" data-cred="'+r.id+'">✏️ עריכה</button><button class="btn sm bad" data-crdel="'+r.id+'">🗑️ מחיקה</button></div></div>';};
  const wl=Object.assign({},WED_DEFAULT18,w||{});const gl=k=>(Array.isArray(gd[k])?gd[k]:GUIDE_DEFAULT18[k]||[]).join('\n');
  const tabs=[['pending','⏳ לאישור'+((pendS.length+pendR.length+pendC.length+reports.length)?' ('+(pendS.length+pendR.length+pendC.length+reports.length)+')':'')],['shops','🏬 חנויות'],['recs','⭐ המלצות'],['cats','🗂️ קטגוריות'],['wed','💍 חתונה ומדריך']];
  let tab=VIEWS.clothing.tab||((pendS.length+pendR.length+pendC.length+reports.length)?'pending':'shops');
  const draw=()=>{VIEWS.clothing.tab=tab;let h='<div class="stats" style="margin-bottom:12px"><div class="stat"><div class="n">'+shops.filter(s=>s.status==='approved').length+'</div><div class="l">חנויות ביגוד</div></div><div class="stat"><div class="n">'+recs.filter(r=>r.status==='approved').length+'</div><div class="l">המלצות מאושרות</div></div><div class="stat"><div class="n">'+(pendS.length+pendR.length+pendC.length)+'</div><div class="l">⏳ ממתינים לאישור</div></div><div class="stat"><div class="n">'+reports.length+'</div><div class="l">❌ דיווחים "לא נכון"</div></div></div>'+
    '<div class="seg18" style="margin-bottom:12px">'+tabs.map(([k,l])=>'<button class="btn sec'+(tab===k?' on':'')+'" data-ctab="'+k+'">'+l+'</button>').join('')+'</div>';
    if(tab==='pending'){
      h+='<div class="card"><h2>❌ דיווחים "לא נכון" ('+reports.length+')</h2>'+(reports.map(x=>'<div class="item"><b>'+esc(tname(x))+'</b> <span class="pill">'+(x.target==='shop'?'🏬 חנות':'⭐ המלצה')+'</span><div>'+(x.reason?'„'+esc(x.reason)+'"':'<span class="muted">(בלי פירוט)</span>')+'</div><div class="muted">'+esc(x.by_name||'')+' · '+esc(fmt(x.created_at))+'</div><div class="row" style="margin-top:6px"><button class="btn sm" data-cvh="'+x.id+'">✔ טופל</button>'+(x.target==='shop'?'<button class="btn sm sec" data-csed="'+x.target_id+'">✏️ לתקן את החנות</button>':'<button class="btn sm sec" data-cred="'+x.target_id+'">✏️ לתקן את ההמלצה</button>')+'</div></div>').join('')||'<p class="muted">אין דיווחים פתוחים 🎉</p>')+'</div>';
      h+='<div class="card"><h2>🗂️ בקשות לקטגוריה חדשה ('+pendC.length+')</h2>'+(pendC.map(r=>'<div class="item"><b>'+esc(r.body)+'</b> <span class="pill">'+esc(S[r.section]||'')+'</span><div class="muted">'+crSlot('clothing',r.id)+' · '+esc(fmt(r.created_at))+'</div><div class="row" style="margin-top:6px"><button class="btn sm" data-ccadd="'+r.id+'">✔ להוסיף את הקטגוריה</button><button class="btn sm bad" data-crdel="'+r.id+'">✕ לא עכשיו</button></div></div>').join('')||'<p class="muted">אין בקשות</p>')+'</div>';
      h+='<div class="card"><h2>⏳ חנויות והמלצות שממתינות ('+(pendS.length+pendR.length)+')</h2>'+(pendS.map(shopRow).join('')+pendR.map(recRow).join('')||'<p class="muted">הכל מאושר 🎉</p>')+'</div>';}
    if(tab==='shops'){
      h+='<div class="card" id="csForm"><h2 id="csTitle">➕ הוספת חנות ביגוד</h2><div class="row"><div><label>שם החנות</label><input id="csN" maxlength="60"></div><div><label>למי</label><select id="csG"><option value="women">👩 נשים</option><option value="men">👨 גברים</option><option value="both">👩👨 נשים וגברים</option></select></div><div><label>עיר</label><input id="csC" maxlength="40"></div></div>'+
        '<div class="row"><div><label>כתובת</label><input id="csA" maxlength="120"></div><div><label>טלפון</label><input id="csP" maxlength="30" dir="ltr"></div><div><label>אתר</label><input id="csW" maxlength="200" dir="ltr"></div></div>'+
        '<label>מה מוכרים (אפשר כמה)</label><div class="chips18" id="csSubs"></div><div class="check"><input type="checkbox" id="csWed"><label for="csWed" style="margin:0">💍 מתאים לחתונה (חתן / כלה)</label></div><div class="check"><input type="checkbox" id="csFeat"><label for="csFeat" style="margin:0">⭐ האתר ממליץ — מופיעה ראשונה עם תג</label></div><label>על החנות</label><textarea id="csAb" maxlength="600" style="min-height:60px"></textarea><input type="hidden" id="csId"><div class="row" style="margin-top:8px"><button class="btn" id="csSave">💾 שמירה</button><button class="btn sec" id="csNew" hidden>ביטול עריכה</button></div></div>'+
        '<div class="card"><h2>🏬 כל החנויות ('+shops.length+')</h2><input id="csQ" placeholder="🔍 חיפוש חנות" style="margin-bottom:6px"><div id="csList">'+(shops.map(shopRow).join('')||'<p class="muted">עוד אין חנויות</p>')+'</div></div>';}
    if(tab==='recs'){
      h+='<div class="card" id="crForm"><h2 id="crTitle">⭐ המלצה של האתר</h2><p class="muted">המלצה שכותבים כאן מתפרסמת מיד עם תג "⭐ האתר ממליץ". אפשר גם לערוך כל המלצה של לקוח.</p><div class="row"><div><label>איפה</label><select id="crSec"><option value="women">👩 נשים</option><option value="men">👨 גברים</option><option value="wedding">💍 חתונה</option></select></div><div><label>קטגוריה</label><select id="crSub"></select></div><div><label>סוג</label><select id="crKind"><option value="store">🏬 איפה לקנות</option><option value="item">💡 מוצר לרשימת החתונה</option></select></div></div>'+
        '<div class="row"><div><label>שם החנות</label><input id="crShop" maxlength="60" list="crShops"><datalist id="crShops">'+shops.map(s=>'<option value="'+esc(s.name)+'">').join('')+'</datalist></div><div><label>עיר</label><input id="crCity" maxlength="40"></div><div><label>כוכבים</label><select id="crStars"><option value="">—</option>'+[5,4,3,2,1].map(n=>'<option value="'+n+'">'+'⭐'.repeat(n)+'</option>').join('')+'</select></div></div>'+
        '<label>הטקסט</label><textarea id="crBody" maxlength="1000" style="min-height:70px"></textarea><div class="check"><input type="checkbox" id="crOff" checked><label for="crOff" style="margin:0">⭐ האתר ממליץ</label></div><input type="hidden" id="crId"><div class="row" style="margin-top:8px"><button class="btn" id="crSave">💾 שמירה</button><button class="btn sec" id="crNew" hidden>ביטול עריכה</button></div></div>'+
        '<div class="card"><h2>⭐ כל ההמלצות ('+recs.length+')</h2>'+(recs.map(recRow).join('')||'<p class="muted">עוד אין המלצות</p>')+'</div>';}
    if(tab==='cats'){
      const ed=k=>'<div class="card"><h2>'+(k==='women'?'👩 קטגוריות נשים':'👨 קטגוריות גברים')+'</h2><div id="cat_'+k+'">'+CATS[k].map((c,i)=>'<div class="row catrow" data-k="'+esc(c[0])+'"><div style="flex:0 0 124px;min-width:0">'+icField('class="ci" maxlength="4" aria-label="אייקון"',c[1])+'</div><div><input class="cn" value="'+esc(c[2])+'" maxlength="40" aria-label="שם"></div><div style="flex:0 0 auto;min-width:0"><button class="btn sm sec" data-cup="'+k+'|'+i+'">▲</button> <button class="btn sm bad" data-cdel="'+k+'|'+i+'">🗑️</button></div></div>').join('')+'</div><button class="btn sm sec" data-cnew="'+k+'" style="margin-top:6px">➕ קטגוריה חדשה</button></div>';
      h+='<p class="muted" style="margin-bottom:10px">משנים שם, אייקון וסדר, מוחקים ומוסיפים. חנויות שכבר משויכות לקטגוריה שנמחקה פשוט לא יופיעו בה.</p>'+ed('women')+ed('men')+'<button class="btn" id="catSave">💾 שמירת הקטגוריות</button> <button class="btn sec" id="catReset">↺ ברירת מחדל</button>';}
    if(tab==='wed'){
      h+='<div class="card"><h2>💍 רשימות הקניות לחתונה</h2><p class="muted">מה שמופיע ללקוחות כ"רשימה מומלצת". מוצר בכל שורה.</p><div class="row"><div><label>🤵 חתן</label><textarea id="wlG" style="min-height:220px">'+esc(wl.groom.join('\n'))+'</textarea></div><div><label>👰 כלה</label><textarea id="wlB" style="min-height:220px">'+esc(wl.bride.join('\n'))+'</textarea></div></div><button class="btn" id="wlSave" style="margin-top:8px">💾 שמירת הרשימות</button></div>'+
        '<div class="card"><h2>🧭 מה לעשות ולאן ללכת</h2><p class="muted">שלב בכל שורה: <b>מתי | מה עושים</b> (למשל: חודש לפני | קונים טלית וקיטל). שורה ריקה בכל הקטגוריה = לא מוצג.</p><div class="row"><div><label>🤵 חתן</label><textarea id="gdG" style="min-height:150px">'+esc(gl('groom'))+'</textarea></div><div><label>👰 כלה</label><textarea id="gdB" style="min-height:150px">'+esc(gl('bride'))+'</textarea></div></div><div class="row"><div><label>👩 נשים (כללי)</label><textarea id="gdW" style="min-height:90px">'+esc(gl('women'))+'</textarea></div><div><label>👨 גברים (כללי)</label><textarea id="gdM" style="min-height:90px">'+esc(gl('men'))+'</textarea></div></div><button class="btn" id="gdSave" style="margin-top:8px">💾 שמירת המדריך</button></div>';}
    $('#boMain').innerHTML=clothSwitch18(colC)+h;
    if(tab==='shops'){const drawSubs=(sel)=>{const gv=$('#csG').value;const L=gv==='both'?CATS.women.concat(CATS.men.filter(m=>!CATS.women.some(x=>x[0]===m[0]))):CATS[gv];
        $('#csSubs').innerHTML=L.map(([k,ic,n])=>'<label class="chip18"><input type="checkbox" value="'+esc(k)+'"'+((sel||[]).includes(k)?' checked':'')+'> '+esc(ic)+' '+esc(n)+'</label>').join('');};
      drawSubs([]);$('#csG').onchange=()=>drawSubs([...document.querySelectorAll('#csSubs input:checked')].map(i=>i.value));
      VIEWS.clothing.fillShop=s=>{$('#csTitle').textContent=s?'✏️ עריכת "'+s.name+'"':'➕ הוספת חנות ביגוד';$('#csId').value=s?s.id:'';$('#csN').value=s?s.name:'';$('#csG').value=s?s.gender:'women';$('#csC').value=s?s.city:'';$('#csA').value=s?s.address:'';$('#csP').value=s?s.phone:'';$('#csW').value=s?s.website:'';$('#csAb').value=s?s.about:'';$('#csWed').checked=!!(s&&s.wedding);$('#csFeat').checked=!!(s&&s.featured);drawSubs(s?s.subs:[]);$('#csNew').hidden=!s;};
      $('#csNew').onclick=()=>VIEWS.clothing.fillShop(null);
      $('#csQ').oninput=()=>{const q=$('#csQ').value.trim();$('#csList').innerHTML=shops.filter(s=>!q||(s.name+' '+s.city).includes(q)).map(shopRow).join('')||'<p class="muted">לא נמצא</p>';};
      $('#csSave').onclick=async()=>{const rec={name:$('#csN').value.trim(),gender:$('#csG').value,city:$('#csC').value.trim(),address:$('#csA').value.trim(),phone:$('#csP').value.trim(),website:$('#csW').value.trim(),about:$('#csAb').value.trim(),wedding:$('#csWed').checked,featured:$('#csFeat').checked,subs:[...document.querySelectorAll('#csSubs input:checked')].map(i=>i.value)};
        if(!rec.name){flash('צריך שם חנות');return;}const id=$('#csId').value;
        if(await ok(id?sb.from('clothing_shops').update(rec).eq('id',id):sb.from('clothing_shops').insert(Object.assign(rec,{status:'approved',created_by:me.id})),'✔️ נשמר'))VIEWS.clothing();};
      if(VIEWS.clothing.editShop){const s=shops.find(x=>x.id===VIEWS.clothing.editShop);VIEWS.clothing.editShop=null;if(s){VIEWS.clothing.fillShop(s);$('#csForm').scrollIntoView({behavior:'smooth'});}}}
    if(tab==='recs'){const subs=()=>{const sec=$('#crSec').value;const L=sec==='wedding'?[['groom','🤵','חתן'],['bride','👰','כלה']]:CATS[sec];$('#crSub').innerHTML=L.map(([k,ic,n])=>'<option value="'+esc(k)+'">'+esc(ic)+' '+esc(n)+'</option>').join('');};subs();$('#crSec').onchange=subs;
      VIEWS.clothing.fillRec=r=>{$('#crTitle').textContent=r?'✏️ עריכת המלצה':'⭐ המלצה של האתר';$('#crId').value=r?r.id:'';$('#crSec').value=r?r.section:'women';subs();if(r)$('#crSub').value=r.sub;$('#crKind').value=r?r.kind:'store';$('#crShop').value=r?r.shop:'';$('#crCity').value=r?r.city:'';$('#crStars').value=r&&r.stars?String(r.stars):'';$('#crBody').value=r?r.body:'';$('#crOff').checked=r?!!r.official:true;$('#crNew').hidden=!r;};
      $('#crNew').onclick=()=>VIEWS.clothing.fillRec(null);
      $('#crSave').onclick=async()=>{const rec={section:$('#crSec').value,sub:$('#crSub').value||'',kind:$('#crKind').value,shop:$('#crShop').value.trim(),city:$('#crCity').value.trim(),stars:$('#crStars').value?+$('#crStars').value:null,body:$('#crBody').value.trim(),official:$('#crOff').checked};
        if(rec.body.length<2){flash('צריך טקסט');return;}const id=$('#crId').value;
        if(await ok(id?sb.from('store_recs').update(rec).eq('id',id):sb.from('store_recs').insert(Object.assign(rec,{status:'approved',user_id:me.id,by_name:'צוות האתר'})),'✔️ נשמר'))VIEWS.clothing();};
      if(VIEWS.clothing.editRec){const r=recs.find(x=>x.id===VIEWS.clothing.editRec);VIEWS.clothing.editRec=null;if(r){VIEWS.clothing.fillRec(r);$('#crForm').scrollIntoView({behavior:'smooth'});}}}
    if(tab==='cats'){const read=k=>[...document.querySelectorAll('#cat_'+k+' .catrow')].map(r=>[r.dataset.k,r.querySelector('.ci').value.trim()||'🏷️',r.querySelector('.cn').value.trim()]).filter(x=>x[2]);
      $('#catSave').onclick=()=>setCfg('cloth_cats',{women:read('women'),men:read('men')});
      $('#catReset').onclick=async()=>{if((await uiConfirm('לחזור לקטגוריות ברירת המחדל?'))&&await setCfg('cloth_cats',{}))VIEWS.clothing();};}
    if(tab==='wed'){
      $('#wlSave').onclick=()=>setCfg('wedding_lists',{groom:$('#wlG').value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,60),bride:$('#wlB').value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,60)});
      const L=id=>$(id).value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,30);
      $('#gdSave').onclick=()=>setCfg('cloth_guide',{groom:L('#gdG'),bride:L('#gdB'),women:L('#gdW'),men:L('#gdM')});}
  };
  draw();
  $('#boMain').onclick=async e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
    if(d.ctab){tab=d.ctab;draw();return;}
    if(d.cnew){const k=d.cnew;CATS[k]=[...document.querySelectorAll('#cat_'+k+' .catrow')].map(r=>[r.dataset.k,r.querySelector('.ci').value,r.querySelector('.cn').value]);CATS[k].push(['c'+Date.now().toString(36),'🏷️','']);['women','men'].filter(x=>x!==k).forEach(x=>{CATS[x]=[...document.querySelectorAll('#cat_'+x+' .catrow')].map(r=>[r.dataset.k,r.querySelector('.ci').value,r.querySelector('.cn').value]);});draw();const rows=document.querySelectorAll('#cat_'+k+' .cn');rows[rows.length-1].focus();return;}
    if(d.cdel||d.cup){const [k,i]=(d.cdel||d.cup).split('|');['women','men'].forEach(x=>{CATS[x]=[...document.querySelectorAll('#cat_'+x+' .catrow')].map(r=>[r.dataset.k,r.querySelector('.ci').value,r.querySelector('.cn').value]);});
      if(d.cdel){if(!(await uiConfirm('למחוק את הקטגוריה? (נשמר רק אחרי "שמירת הקטגוריות")')))return;CATS[k].splice(+i,1);}else if(+i>0){const x=CATS[k].splice(+i,1)[0];CATS[k].splice(+i-1,0,x);}draw();return;}
    if(d.ccadd){const r=cats.find(x=>x.id===d.ccadd);if(!r)return;const k=r.section==='men'?'men':'women';const name=(await uiPrompt('שם הקטגוריה (אפשר לתקן):',r.body));if(!name)return;const ic=(await uiPrompt('אייקון (אימוג׳י):','🏷️'))||'🏷️';
      CATS[k].push(['c'+Date.now().toString(36),ic.trim().slice(0,4),name.trim().slice(0,40)]);
      if(await setCfg('cloth_cats',{women:CATS.women,men:CATS.men},'✔️ הקטגוריה נוספה')){await sb.from('store_recs').update({status:'approved'}).eq('id',r.id);VIEWS.clothing();}return;}
    if(d.cvh){if(await ok(sb.from('cloth_votes').update({handled:true}).eq('id',d.cvh),'✔️ סומן כטופל'))VIEWS.clothing();return;}
    if(d.csok){if(await ok(sb.from('clothing_shops').update({status:'approved'}).eq('id',d.csok),'✔️ אושר'))VIEWS.clothing();}
    else if(d.csfeat){const s=shops.find(x=>x.id===d.csfeat);if(s&&await ok(sb.from('clothing_shops').update({featured:!s.featured}).eq('id',s.id),s.featured?'הוסר':'⭐ מסומן "האתר ממליץ"'))VIEWS.clothing();}
    else if(d.csdel){if((await uiConfirm('למחוק את החנות?'))&&await ok(sb.from('clothing_shops').delete().eq('id',d.csdel),'🗑️ נמחק'))VIEWS.clothing();}
    else if(d.csed){if(tab!=='shops'){VIEWS.clothing.editShop=d.csed;tab='shops';draw();}else{VIEWS.clothing.fillShop(shops.find(s=>s.id===d.csed));$('#csForm').scrollIntoView({behavior:'smooth'});}}
    else if(d.cred){if(tab!=='recs'){VIEWS.clothing.editRec=d.cred;tab='recs';draw();}else{VIEWS.clothing.fillRec(recs.find(r=>r.id===d.cred));$('#crForm').scrollIntoView({behavior:'smooth'});}}
    else if(d.crok){if(await ok(sb.from('store_recs').update({status:'approved'}).eq('id',d.crok),'✔️ אושר'))VIEWS.clothing();}
    else if(d.crdel){if((await uiConfirm('למחוק?'))&&await ok(sb.from('store_recs').delete().eq('id',d.crdel),'🗑️ נמחק'))VIEWS.clothing();}};
};

/* ---------- ✅ ממתין לאישור — הכל במקום אחד ---------- */
if(!MOD_TABS.includes('pending'))MOD_TABS.push('pending');
const PK={bot:'🤖 לימוד לבוט',review:'⭐ חוות דעת על האתר',chain:'🏪 חנות חדשה',branch:'📍 סניף חדש',price:'💰 מחיר',post:'📣 מבצע של חנות',torah:'📜 דבר תורה',flag:'⚠️ מחיר שסומן "לא נכון"',feedback:'💌 הערה',chat:'💬 הודעה בצ׳אט',message:'📨 פנייה לחנות',abuse:'🚫 שפה לא נקייה',tip:'💰 טיפ לחיסכון',suggest:'💡 הצעה חדשה בלוח (✔ = ראיתי · ✖ = הסתרה)'};
const READ_ONLY_KINDS=['chat','message','abuse'];
const PCR23={bot:'kb',review:'reviews',price:'prices',flag:'prices',post:'posts',torah:'torah',chain:'chains',branch:'branches'};
async function pendingData(){
  const [p,cs,cr,cv]=await Promise.all([sb.rpc('staff_pending_items'),sb.from('clothing_shops').select('id,name,city,created_at').eq('status','pending').limit(200),sb.from('store_recs').select('id,kind,shop,body,section,created_at').eq('status','pending').limit(300),sb.from('cloth_votes').select('id,target,reason,by_name,created_at').eq('vote',-1).eq('handled',false).limit(300)]);
  const items=(p.data||[]).filter(x=>isAdmin()||!['feedback','chat','message','abuse'].includes(x.kind));
  const cloth=[].concat((cs.data||[]).map(x=>({c:'shop',id:x.id,title:'👗 חנות ביגוד: '+x.name,detail:x.city,crk:'shops',at:x.created_at})),
    (cr.data||[]).map(x=>({c:x.kind==='category'?'cat':'rec',id:x.id,title:(x.kind==='category'?'🗂️ בקשה לקטגוריה: ':x.kind==='item'?'💡 מוצר לחתונה: ':'⭐ המלצה: ')+(x.kind==='store'?x.shop:x.body),detail:x.kind==='store'?x.body:'',crk:'clothing',at:x.created_at})),
    (cv.data||[]).map(x=>({c:'report',id:x.id,title:'❌ דיווח "לא נכון" על '+(x.target==='shop'?'חנות ביגוד':'המלצה'),detail:x.reason,who:x.by_name,at:x.created_at})));
  return {items,cloth,err:p.error};}
async function updatePendBadge(){try{const d=await pendingData();const n=d.items.length+d.cloth.length;const b=$('#boPendN');if(b){b.hidden=!n;b.textContent=n;}}catch(e){}}
/* קוד השרת וה-SQL (כ-290KB) נטענים רק כשפותחים את הבק אופיס — לא אצל כל משתמש */
/* קוד השרת וה-SQL כבר לא נמצאים באתר הציבורי (הם חשפו את כל מבנה המסד לכל אחד). פותחים אותם בגיטהאב — מאגר פרטי, רק לבעלים */
const SRV_GH='https://github.com/yosefh770h-lgtm/shopping-list/blob/main/';
const SRV_PATH={setupSql:'supabase/schema.sql',pushFnSrc:'supabase/functions/push/index.ts',posFnSrc:'supabase/functions/pos/index.ts',pricesFnSrc:'supabase/functions/prices-sync/index.ts',agFnSrc:'supabase/functions/auth-guard/index.ts',aiFnSrc:'supabase/functions/ai-chat/index.ts'};
function loadServerCode(){if(!document.getElementById('srvCode')){const box=document.createElement('div');box.hidden=true;box.id='srvCode';
    Object.keys(SRV_PATH).forEach(id=>{const n=document.createElement('script');n.type='text/plain';n.id=id;box.appendChild(n);});document.body.appendChild(box);}
  return Promise.resolve(true);}
const _v18OpenBO=window.openBO;window.openBO=async function(){const args=arguments;if(sb&&isStaff()){const okc=await loadServerCode();if(!okc)flash('⚠️ חלק מהבק אופיס (קוד ההגדרה) לא נטען — בודקים את החיבור');}
  const r=_v18OpenBO.apply(this,args);if(sb&&isStaff())updatePendBadge();return r;};
VIEWS.pending=async function(){
  const d=await pendingData();const groups={};d.items.forEach(x=>{(groups[x.kind]=groups[x.kind]||[]).push(x);});
  const n=d.items.length+d.cloth.length;const b=$('#boPendN');if(b){b.hidden=!n;b.textContent=n;}
  let h='<div class="card"><h2>✅ ממתין לאישור ('+n+')</h2><p class="muted">כל מה שמחכה לך — דברי תורה, מחירים, חנויות, חוות דעת, ביגוד ודיווחים — במקום אחד. ✔ מאשר, ✖ דוחה.</p>'+(d.err?'<p class="muted">⚠️ '+esc(d.err.message)+' — צריך להריץ שוב את קוד ה-SQL.</p>':'')+(n?'':'<p style="font-size:18px;margin-top:10px">🎉 הכל מטופל!</p>')+'</div>';
  Object.keys(PK).filter(k=>groups[k]).forEach(k=>{h+='<div class="card"><h2>'+PK[k]+' ('+groups[k].length+')</h2>'+groups[k].map(x=>'<div class="item"><b>'+esc(x.title||'')+'</b>'+(x.detail?'<div style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(String(x.detail).slice(0,400))+'</div>':'')+'<div class="muted">'+(PCR23[k]?crSlot(PCR23[k],x.ref,{f:x.who||''}):esc(x.who||''))+' · '+esc(fmt(x.created_at))+'</div><div class="row" style="margin-top:6px">'+
    (READ_ONLY_KINDS.includes(k)?'<button class="btn sm" data-pd="'+esc(k)+'|'+esc(x.ref)+'|1">✔ טופל</button>':'<button class="btn sm" data-pd="'+esc(k)+'|'+esc(x.ref)+'|1">✔ אישור</button><button class="btn sm bad" data-pd="'+esc(k)+'|'+esc(x.ref)+'|0">✖ דחייה</button>')+'</div></div>').join('')+'</div>';});
  if(d.cloth.length)h+='<div class="card"><h2>👗 ביגוד וחתונה ('+d.cloth.length+')</h2>'+d.cloth.map(x=>'<div class="item"><b>'+esc(x.title)+'</b>'+(x.detail?'<div>'+esc(x.detail)+'</div>':'')+'<div class="muted">'+(x.crk?crSlot(x.crk,x.id):esc(x.who||''))+' · '+esc(fmt(x.at))+'</div><div class="row" style="margin-top:6px">'+
    (x.c==='shop'?'<button class="btn sm" data-pc="shop|'+x.id+'|1">✔ אישור</button><button class="btn sm bad" data-pc="shop|'+x.id+'|0">✖ דחייה</button>':x.c==='rec'?'<button class="btn sm" data-pc="rec|'+x.id+'|1">✔ אישור</button><button class="btn sm bad" data-pc="rec|'+x.id+'|0">✖ דחייה</button>':'<button class="btn sm sec" data-pgo="1">לטיפול ← 👗 ביגוד והמלצות</button>')+'</div></div>').join('')+'</div>';
  $('#boMain').innerHTML=h;
  $('#boMain').onclick=async e=>{const t=e.target.closest('button');if(!t)return;
    if(t.dataset.pgo){VIEWS.clothing.tab='pending';show('clothing');return;}
    if(t.dataset.pd){const [k,ref,ok1]=t.dataset.pd.split('|');t.disabled=true;const {error}=await sb.rpc('staff_decide',{p_kind:k,p_ref:ref,p_ok:ok1==='1'});if(error){flash('⚠️ '+error.message);t.disabled=false;return;}flash(ok1==='1'?'✔️ בוצע':'✖ נדחה');t.closest('.item').remove();updatePendBadge();return;}
    if(t.dataset.pc){const [c,id,ok1]=t.dataset.pc.split('|');const tb=c==='shop'?'clothing_shops':'store_recs';t.disabled=true;
      if(await ok(ok1==='1'?sb.from(tb).update({status:'approved'}).eq('id',id):sb.from(tb).delete().eq('id',id),ok1==='1'?'✔️ אושר':'✖ נדחה')){t.closest('.item').remove();updatePendBadge();}else t.disabled=false;}};
};

/* ---------- ✏️ גרסה 18.3: עריכה בכל מקום — בעלי סופרים, צוות, עדכונים לאתר, מקורות מחירים ---------- */
/* בעלי סופרים: ✏️ ממלא את הטופס למעלה, ו"שמירה" מעדכנת (אותו מייל = אותו אדם) */
const _e18Stores=VIEWS.stores;
VIEWS.stores=async function(){await _e18Stores.apply(this,arguments);if(cur!=='stores')return;
  const {data}=await sb.rpc('store_manager_list');const list=data||[];VIEWS.stores.list=list;
  document.querySelectorAll('#boMain tr[data-id]').forEach(tr=>{const td=tr.lastElementChild;if(td&&!td.querySelector('[data-e18sm]'))td.insertAdjacentHTML('afterbegin','<button class="btn sm sec" data-e18sm="'+esc(tr.dataset.id)+'">✏️ עריכה</button> ');});
  const add=$('#smAdd');if(add){add.insertAdjacentHTML('afterend',' <button class="btn sec" id="smCancel" hidden>ביטול עריכה</button>');$('#smCancel').onclick=()=>show('stores');}};
/* צוות: שינוי תפקיד */
const _e18Staff=VIEWS.staff;
VIEWS.staff=async function(){await _e18Staff.apply(this,arguments);if(cur!=='staff'||!isOwner())return;
  const {data}=await sb.rpc('staff_list');const list=data||[];
  document.querySelectorAll('#boMain tr[data-id]').forEach(tr=>{const x=list.find(y=>y.user_id===tr.dataset.id);const td=tr.children[2];if(!x||!td)return;
    td.innerHTML='<select data-e18role="'+esc(x.email)+'" style="min-width:120px"><option value="moderator"'+(x.role==='moderator'?' selected':'')+'>צוות פיקוח</option><option value="admin"'+(x.role==='admin'?' selected':'')+'>מנהל</option></select>';});};
/* עדכונים לאתר: עריכה של עדכון שפורסם */
const _e18Updates=VIEWS.updates;
VIEWS.updates=async function(){await _e18Updates.apply(this,arguments);if(cur!=='updates')return;
  document.querySelectorAll('#boMain .item[data-id] .row').forEach(r=>{if(!r.querySelector('[data-e18up]'))r.insertAdjacentHTML('afterbegin','<button class="btn sm sec" data-e18up="1">✏️ עריכה</button>');});
  /* "מה חדש" של הגרסה הנוכחית (מוצג לכל משתמש פעם אחת אחרי עדכון גרסה) */
  const c=typeof CHANGELOG!=='undefined'&&CHANGELOG[0]&&CHANGELOG[0][0]===APP_VERSION&&CHANGELOG[0];const m=document.querySelector('#boMain');
  if(c&&m&&!m.querySelector('#e18Ver'))m.insertAdjacentHTML('afterbegin','<div class="card" id="e18Ver"><h2>🆕 מה חדש בגרסה '+esc(c[0])+' <span class="pill">פעיל</span></h2><div class="muted">'+esc(c[1])+' · מוצג לכל משתמש רשום פעם אחת, בכניסה הראשונה אחרי עדכון הגרסה, ומופיע גם באודות</div><p style="white-space:pre-wrap;margin:6px 0;font-size:14px">'+esc(c[2]+'\n\n'+c[3])+'</p><div class="row"><button class="btn sm sec" id="e18VerEdit">✏️ עריכה</button><button class="btn sm sec" id="e18VerDel">🗑️ מחיקה</button></div></div>');
  const eb=document.querySelector('#e18VerEdit');if(eb)eb.onclick=e=>{e.stopPropagation();show('texts');};
  const db=document.querySelector('#e18VerDel');if(db)db.onclick=async e=>{e.stopPropagation();if(!(await uiConfirm('למחוק את "מה חדש" של גרסה '+c[0]+'? הוא יוסר מ"מה חדש באתר" ומהאודות אצל כולם.')))return;
    const t=Object.assign({},await cfg('texts'));const base=(Array.isArray(t.changelog)&&t.changelog.length?t.changelog:CHANGELOG.map(([ver,date,was,now])=>({v:ver,date,was,now}))).filter(x=>x&&String(x.v)!==c[0]);
    if(!base.length){flash('צריך לפחות גרסה אחת');return;}t.changelog=base;t.seenV=APP_VERSION;if(await setCfg('texts',t,'🗑️ נמחק')){applyTexts161(t);show('updates');}};};
/* מקורות מחירים: עריכה בשורה */
const _e18Sources=VIEWS.sources;
VIEWS.sources=async function(){await _e18Sources.apply(this,arguments);if(cur!=='sources')return;
  document.querySelectorAll('#boMain tr[data-id] td:last-child').forEach(td=>{if(!td.querySelector('[data-e18src]'))td.insertAdjacentHTML('afterbegin','<button class="btn sm sec" data-e18src="1">✏️</button> ');});};
/* ✅ ממתין לאישור: "✏️ לעריכה" — קופץ למקום שבו עורכים את הפריט, כדי לתקן לפני שמאשרים */
const EDIT_SEC18={bot:'bot',review:'reviews',chain:'chains',branch:'chains',price:'prices',post:'posts',torah:'torah',flag:'prices',tip:'community',suggest:'community'};
const _e18Pending=VIEWS.pending;
VIEWS.pending=async function(){await _e18Pending.apply(this,arguments);if(cur!=='pending')return;
  document.querySelectorAll('#boMain [data-pd]').forEach(b=>{const k=b.dataset.pd.split('|')[0];const row=b.parentNode;if(!EDIT_SEC18[k]||row.querySelector('[data-e18go]'))return;
    row.insertAdjacentHTML('beforeend','<button class="btn sm sec" data-e18go="'+EDIT_SEC18[k]+'">✏️ לעריכה ←</button>');});};
$('#boMain').addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.e18go){e.stopPropagation();show(d.e18go);return;}
  if(d.e18sm){e.stopPropagation();const x=(VIEWS.stores.list||[]).find(y=>y.user_id===d.e18sm);if(!x)return;
    $('#smEmail').value=x.email||'';$('#smChain').value=x.chain||'';$('#smBranch').value=x.branch||'';$('#smTitle').value=x.title==='owner'?'owner':'manager';$('#smAuto').checked=!!x.auto_approve;
    const h=$('#boMain .card h2');if(h)h.textContent='✏️ עריכת '+(x.name||x.email);$('#smAdd').textContent='💾 שמירת השינויים';$('#smCancel').hidden=false;h&&h.scrollIntoView({behavior:'smooth'});$('#smChain').focus();return;}
  if(d.e18up){e.stopPropagation();const it=t.closest('[data-id]');if(it.querySelector('.e18ed'))return;const id=it.dataset.id;
    const {data:u}=await sb.from('site_updates').select('title,body').eq('id',id).maybeSingle();if(!u)return;
    it.insertAdjacentHTML('beforeend','<div class="e18ed" style="margin-top:8px"><label>כותרת</label><input class="e18t" maxlength="120" value="'+esc(u.title)+'"><label>תוכן</label><textarea class="e18b" maxlength="6000" style="min-height:120px">'+esc(u.body)+'</textarea><div class="row" style="margin-top:6px"><button class="btn sm" data-e18upsave="1">💾 שמירה</button><button class="btn sm sec" data-e18upx="1">ביטול</button></div><p class="muted">מי שכבר קרא את העדכון לא יקבל אותו שוב.</p></div>');return;}
  if(d.e18upx){e.stopPropagation();t.closest('.e18ed').remove();return;}
  if(d.e18upsave){e.stopPropagation();const it=t.closest('[data-id]');const title=it.querySelector('.e18t').value.trim(),body=it.querySelector('.e18b').value.trim();if(!title||!body){flash('צריך כותרת ותוכן');return;}
    if(await ok(sb.from('site_updates').update({title,body}).eq('id',it.dataset.id),'✔️ העדכון נשמר'))show('updates');return;}
  if(d.e18src){e.stopPropagation();const tr=t.closest('tr[data-id]');const id=tr.dataset.id;const {data:x}=await sb.from('price_sources').select('*').eq('id',id).maybeSingle();if(!x)return;
    tr.innerHTML='<td colspan="6"><div class="row"><input class="e18u" dir="ltr" value="'+esc(x.url)+'" style="flex:2;min-width:220px"><input class="e18c" list="srcChains" value="'+esc(x.chain)+'" maxlength="40"><input class="e18br" value="'+esc(x.branch||'')+'" maxlength="120" placeholder="סניף"><select class="e18ev" style="max-width:150px">'+[3,6,12,24,168].map(h=>'<option value="'+h+'"'+(x.every_hours===h?' selected':'')+'>'+({3:'כל 3 שעות',6:'כל 6 שעות',12:'כל 12 שעות',24:'פעם ביום',168:'פעם בשבוע'}[h])+'</option>').join('')+'</select><button class="btn sm" data-e18srcsave="1">💾 שמירה</button><button class="btn sm sec" data-e18srcx="1">ביטול</button></div></td>';return;}
  if(d.e18srcx){e.stopPropagation();show('sources');return;}
  if(d.e18srcsave){e.stopPropagation();const tr=t.closest('tr[data-id]');const url=tr.querySelector('.e18u').value.trim(),chain=tr.querySelector('.e18c').value.trim();
    if(!/^https?:\/\//.test(url)){flash('צריך קישור שמתחיל ב-https://');return;}if(!chain){flash('צריך רשת');return;}
    if(await ok(sb.from('price_sources').update({url,chain:chain.slice(0,40),branch:tr.querySelector('.e18br').value.trim().slice(0,120),every_hours:+tr.querySelector('.e18ev').value}).eq('id',tr.dataset.id),'✔️ נשמר'))show('sources');return;}
},true);
$('#boMain').addEventListener('change',async e=>{const r=e.target.closest('[data-e18role]');if(!r)return;e.stopPropagation();
  const {data:res,error}=await sb.rpc('staff_add',{p_email:r.dataset.e18role,p_role:r.value});flash(error?'⚠️ '+error.message:res==='ok'?'✔️ התפקיד עודכן':'⚠️ '+res);show('staff');},true);

/* ---------- ♿ רכז נגישות — הפרטים שמופיעים בהצהרת הנגישות (חובה לפי תקנה 35) ---------- */
const _a11yTexts=VIEWS.texts;
VIEWS.texts=async function(){await _a11yTexts.apply(this,arguments);if(cur!=='texts')return;const v=await cfg('a11y');
  $('#boMain').insertAdjacentHTML('afterbegin','<div class="card"><h2>♿ רכז נגישות — הצהרת הנגישות</h2><p class="muted">לפי החוק (תקנה 35 לתקנות הנגישות), בהצהרת הנגישות חייבים להופיע <b>שם, טלפון ודוא"ל של רכז הנגישות</b> ותאריך עדכון. הפרטים מופיעים מיד ב-<a href="accessibility.html" target="_blank" rel="noopener">הצהרת הנגישות</a>.</p>'+
    (!v.name||!v.phone?'<p class="muted" style="color:var(--bad)">⚠️ עוד לא מולאו שם וטלפון של רכז הנגישות.</p>':'')+
    '<div class="row"><div><label>שם רכז הנגישות</label><input id="a11yN" maxlength="60" value="'+esc(v.name||'')+'"></div><div><label>טלפון</label><input id="a11yP" maxlength="30" dir="ltr" value="'+esc(v.phone||'')+'"></div><div><label>דוא"ל</label><input id="a11yE" maxlength="80" dir="ltr" value="'+esc(v.email||'info@yamshopping.com')+'"></div></div>'+
    '<label>הערה נוספת (לא חובה)</label><input id="a11yX" maxlength="200" value="'+esc(v.note||'')+'"><button class="btn" id="a11ySave" style="margin-top:8px">💾 שמירה</button></div>');
  $('#a11ySave').onclick=()=>{const d=new Date();setCfg('a11y',{name:$('#a11yN').value.trim(),phone:$('#a11yP').value.trim(),email:$('#a11yE').value.trim(),note:$('#a11yX').value.trim(),updated:d.toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric'})},'✔️ נשמר — מופיע בהצהרת הנגישות');};};

/* ---------- 🐞 יומן תקלות — מה נשבר אצל משתמשים ---------- */
VIEWS.errors=async function(){
  const {data,error}=await sb.from('client_errors').select('*').order('created_at',{ascending:false}).limit(500);
  const list=data||[];const by={};list.forEach(r=>{const k=r.msg+'|'+r.src;(by[k]=by[k]||{msg:r.msg,src:r.src,n:0,users:new Set(),last:r.created_at,ver:r.ver,ua:r.ua}).n++;if(r.user_id)by[k].users.add(r.user_id);});
  const rows=Object.values(by).sort((a,b)=>new Date(b.last)-new Date(a.last));
  $('#boMain').innerHTML='<div class="card"><h2>🐞 יומן תקלות</h2><p class="muted">כשמשהו נשבר אצל משתמש באתר, זה נרשם כאן אוטומטית (60 יום אחרונים). תקלות זהות מקובצות יחד. לכל תקלה כתוב בעברית מה קרה, באיזה חלק של האתר ובאיזה מכשיר.</p>'+(error?'<p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL. '+esc(error.message)+'</p>':'')+
    (rows.length?rows.map(r=>{const x=errExplain(r);return '<div class="item errx"><div style="font-size:16px;font-weight:700;margin-bottom:4px">📝 '+esc(x.what)+'</div><div>🔁 <b>כמה:</b> '+r.n+' פעמים · '+r.users.size+' משתמשים</div>'+
      '<div>📍 <b>איפה:</b> '+esc(x.where)+'</div><div>📱 <b>אצל:</b> '+esc(x.who)+'</div><div>🕐 <b>לאחרונה:</b> '+esc(fmt(r.last))+(r.ver?' · גרסה '+esc(r.ver):'')+'</div>'+
      (x.tip?'<div>💡 <b>מה לעשות:</b> '+esc(x.tip)+'</div>':'')+
      '<details><summary class="muted">🔧 פרטים טכניים</summary><div style="overflow-wrap:anywhere;direction:ltr;text-align:left;font-size:13px"><b>'+esc(r.msg)+'</b><br>'+esc(r.src)+'<br><span class="muted">'+esc(r.ua)+'</span></div></details></div>';}).join('')+'<button class="btn sec" id="errClr" style="margin-top:10px">🗑️ ניקוי היומן</button>':'<p style="font-size:18px;margin-top:8px">🎉 אין תקלות רשומות</p>')+'</div>';
  const c=$('#errClr');if(c)c.onclick=async()=>{if((await uiConfirm('לנקות את כל יומן התקלות?'))&&await ok(sb.from('client_errors').delete().gt('id',0),'🗑️ נוקה'))VIEWS.errors();};
};
/* ---------- 🏷️ v23: קרדיט למדווחים — מתי הציבור רואה מי דיווח/כתב ---------- */
const CR23_TYPES=[['prices','💰 דיווחי מחיר ומבצעים','"דווח ע״י ..." ליד כל מחיר'],['torah','📜 דברי תורה','"נשלח ע״י ..." (המקור / "בשם" מוצג תמיד)'],
  ['reviews','⭐ חוות דעת על האתר','שם הכותב/ת מעל חוות הדעת'],['clothing','👗 ביגוד וחתונה','מי המליץ / מי הציע את החנות']];
(function(){const nav=$('#boNav');if(!nav||nav.querySelector('[data-s="credits"]'))return;
  const b=document.createElement('button');b.dataset.s='credits';b.textContent='🏷️ קרדיט למדווחים';b.hidden=!isAdmin();
  const ref=nav.querySelector('[data-s="ui"]')||nav.querySelector('[data-s="texts"]');if(ref)ref.parentNode.insertBefore(b,ref.nextSibling);else nav.appendChild(b);})();
VIEWS.credits=async function(){
  const v=await cfg('credits');if(cur!=='credits')return;
  $('#boMain').innerHTML='<div class="card" id="cr23card"><h2>🏷️ קרדיט למדווחים</h2><p class="muted">אתה (וצוות הפיקוח) תמיד רואים מי דיווח או כתב כל דבר — כאן בבק אופיס וגם באתר עצמו. '+
    'כאן קובעים אם <b>כל השאר</b> יראו את שם המדווח. ברירת המחדל: מוסתר.</p>'+
    CR23_TYPES.map(([k,l,d])=>'<div class="check"><input type="checkbox" id="cr23_'+k+'" data-crk="'+k+'"'+(v[k]===true?' checked':'')+' role="switch"><label for="cr23_'+k+'" style="margin:0;color:var(--text)"><b>'+l+'</b> — הצג תמיד את שם המדווח <span class="muted">('+esc(d)+')</span></label></div>').join('')+
    '<p class="muted" id="cr23st"></p></div>'+
    '<div class="card"><h2>🎯 לפריט מסוים</h2><p class="muted">ליד כל פריט (כאן ברשימות של הבק אופיס, וגם באתר כשאתה מחובר) יש כפתור קטן ליד שם המדווח. כל לחיצה מחליפה:<br>'+
    '⚙️ <b>לפי ברירת מחדל</b> — כמו ההגדרה למעלה · 👁️ <b>הצג שם</b> — השם מוצג לכולם בפריט הזה · 🙈 <b>הסתר שם</b> — מוסתר בפריט הזה גם אם ההגדרה למעלה "מוצג".</p>'+
    '<p class="muted">🔒 השמות לא נשלחים בכלל לדפדפן של מי שלא אמור לראות אותם (נבדק בשרת). 👥 ליד השם פותח את המשתמש ברשימת המשתמשים.</p></div>';
  $('#cr23card').onchange=async e=>{const i=e.target.closest('[data-crk]');if(!i)return;const o={};CR23_TYPES.forEach(([k])=>{o[k]=!!($('#cr23_'+k)||{}).checked;});
    if(await setCfg('credits',o,i.checked?'👁️ מעכשיו שם המדווח מוצג לכולם':'🙈 מעכשיו שם המדווח מוסתר')){applyConfig('credits',o);$('#cr23st').textContent='✔️ נשמר';}else i.checked=!i.checked;};
};
/* 👥 ליד שם המדווח → רשימת המשתמשים, מסוננת עליו */
window.boOpenUser23=async function(q){if(!isAdmin())return;if($('#bo').classList.contains('hidden'))await window.openBO('users');else show('users');
  for(let i=0;i<40;i++){const inp=document.getElementById('uq');if(inp&&cur==='users'){inp.value=q||'';inp.dispatchEvent(new Event('input',{bubbles:true}));return;}await new Promise(r=>setTimeout(r,150));}};
/* מוצרים במאגר: מי הוסיף */
const _cr23Products=VIEWS.products;
VIEWS.products=async function(){await _cr23Products.apply(this,arguments);if(cur!=='products'||!$('#ptb'))return;
  const dress=()=>document.querySelectorAll('#ptb tr[data-id]').forEach(tr=>{if(tr.querySelector('.cr23'))return;const inp=tr.querySelector('[data-f="name"]');if(inp)inp.insertAdjacentHTML('afterend',crSlot('products',tr.dataset.id,{b:1}));});
  const ptb=$('#ptb');if(!ptb)return;dress();new MutationObserver(dress).observe(ptb,{childList:true});};
/* 🙋 המנהל יכול להיות גם בעל עסק וגם לקוח — כפתור שמכניס את המייל שלו לטופס */
const _ynStores=VIEWS.stores;
VIEWS.stores=async function(){await _ynStores.apply(this,arguments);if(cur!=='stores')return;const add=document.querySelector('#smAdd');if(!add||!authUser||!authUser.email)return;
  add.insertAdjacentHTML('afterend',' <button class="btn sec" id="smMe">🙋 גם אני בעל עסק — למלא את המייל שלי</button><p class="muted" style="margin-top:6px">אחרי השמירה: ⚙️ ← "האתר העסקי" לניהול העסק, ו"🛒 לאתר הרגיל" כדי לחזור להיות לקוח. אפשר לעבור ביניהם בכל רגע.</p>');
  document.querySelector('#smMe').onclick=()=>{document.querySelector('#smEmail').value=authUser.email;document.querySelector('#smTitle').value='owner';document.querySelector('#smChain').focus();flash('✍️ עכשיו בחרו את שם העסק ולחצו "שמירה"');};
  add.addEventListener('click',()=>{if(document.querySelector('#smEmail').value.trim().toLowerCase()===authUser.email.toLowerCase())setTimeout(()=>{if(typeof loadMyStore==='function')loadMyStore();},1500);},true);
};

/* בבק אופיס: 📣 הודעות למשתמשים ← "הודעה קופצת מיאמי" */
const _ynBroadcast=VIEWS.broadcast;
VIEWS.broadcast=async function(){await _ynBroadcast.apply(this,arguments);if(cur!=='broadcast')return;
  const m=document.querySelector('#boMain');
  m.insertAdjacentHTML('beforeend','<div class="card" id="ynCard"><h2>👩‍🍳 הודעה קופצת מיאמי</h2><p class="muted">ההודעה קופצת בבועה של יאמי (בפינת המסך) — פעם אחת לכל משתמש, בפעם הבאה שהוא באתר. אפשר לכולם או למשתמש אחד.</p>'+
    '<div class="row"><div><label>למי?</label><select id="ynT"><option value="">כל המשתמשים</option><option value="one">משתמש מסוים</option></select></div>'+
    '<div id="ynUW" hidden><label>משתמש (שם או מייל)</label><input id="ynU" list="ynUL" placeholder="🔍 חיפוש"><datalist id="ynUL"></datalist></div>'+
    '<div><label>כמה ימים להציג</label><select id="ynD"><option value="1">יום</option><option value="3">3 ימים</option><option value="7" selected>שבוע</option><option value="30">חודש</option></select></div></div>'+
    '<textarea id="ynB" maxlength="500" rows="3" style="width:100%" placeholder="מה יאמי תגיד? (עד 500 תווים)"></textarea><button class="btn" id="ynGo">👩‍🍳 פרסום ההודעה</button>'+
    '<h3 style="margin-top:14px">הודעות פעילות</h3><div id="ynList" class="muted">טוען...</div></div>');
  let users=[];
  const uid=()=>{const v=document.querySelector('#ynU').value.trim().toLowerCase();const u=users.find(x=>(x.email||'').toLowerCase()===v)||users.find(x=>((x.name||'')+' <'+(x.email||'')+'>').toLowerCase()===v);return u&&u.id;};
  const who=id=>{if(!id)return '📣 לכולם';const u=users.find(x=>x.id===id);return '👤 '+(u?(u.name||u.email):id.slice(0,8));};
  const list=async()=>{const {data,error}=await sb.from('yami_notes').select('id,user_id,body,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(100);
    const el=document.querySelector('#ynList');if(!el)return;
    if(error){el.innerHTML='⚠️ '+esc(error.message.includes('yami_notes')?'צריך להריץ את קוד ה-SQL המעודכן ב-Supabase':error.message);return;}
    el.innerHTML=(data||[]).map(n=>'<div class="item"><b>'+esc(who(n.user_id))+'</b> · '+esc(n.body)+'<div class="muted">עד '+esc(new Date(n.expires_at).toLocaleString('he-IL'))+' <button class="btn sm sec" data-yndel="'+esc(n.id)+'">🗑️ מחיקה</button></div></div>').join('')||'אין הודעות פעילות';};
  const t=document.querySelector('#ynT');t.onchange=()=>{document.querySelector('#ynUW').hidden=t.value!=='one';};
  sb.rpc('admin_user_list').then(({data})=>{users=data||[];const dl=document.querySelector('#ynUL');if(dl)dl.innerHTML=users.map(u=>'<option value="'+esc((u.name||'')+' <'+(u.email||'')+'>')+'">').join('');list();});
  document.querySelector('#ynGo').onclick=async()=>{const body=document.querySelector('#ynB').value.trim();if(!body){flash('כתבו מה יאמי תגיד');return;}
    let user_id=null;if(t.value==='one'){user_id=uid();if(!user_id){flash('בחרו משתמש מהרשימה');return;}}
    const days=+document.querySelector('#ynD').value||7;
    const {error}=await sb.from('yami_notes').insert({user_id,body,expires_at:new Date(Date.now()+days*864e5).toISOString()});
    if(error){flash('⚠️ '+(error.message.includes('yami_notes')?'צריך להריץ את קוד ה-SQL המעודכן ב-Supabase':error.message));return;}
    if(typeof logAct==='function')logAct('yami_note',(user_id?'user ':'all ')+body.slice(0,80));
    flash('👩‍🍳 פורסם — יקפוץ '+(user_id?'למשתמש':'לכולם'));document.querySelector('#ynB').value='';list();};
  document.querySelector('#ynList').onclick=async e=>{const d=e.target.closest('[data-yndel]');if(!d||!(await uiConfirm('למחוק את ההודעה?')))return;
    const {error}=await sb.from('yami_notes').delete().eq('id',d.dataset.yndel);if(error){flash('⚠️ '+error.message);return;}list();};
};
/* ---------- 🛰️ איסוף המחירים בשרת (server.yamshopping.com) — בראש לשונית המחירים ----------
   הרשתות הפעילות והשהיית שבת וחג נשמרות ב-site_config ← collector. השרת קורא אותן לפני כל ריצה,
   וכותב לכאן (collector_status) סטטוס לכל רשת: מתי עודכנה, כמה סניפים ומוצרים, ושגיאה אם הייתה. */
const COL_CHAINS={BAREKET:'עוף והודו ברקת',YAYNO_BITAN_AND_CARREFOUR:'קרפור',CITY_MARKET_KIRYATGAT:'סיטי מרקט קריית גת',CITY_MARKET_SHOPS:'סיטי מרקט',DOR_ALON:'דור אלון',GOOD_PHARM:'גוד פארם',HAZI_HINAM:'חצי חינם',HET_COHEN_NEW_SOURCE:'ח. כהן',KESHET:'קשת טעמים',KING_STORE:'קינג סטור',MAAYAN_2000:'מעיין 2000',MAHSANI_ASHUK_NEW_SOURCE:'מחסני השוק',NETIV_HASED:'נתיב החסד',MESHMAT_YOSEF_1:'משנת יוסף 1',MESHMAT_YOSEF_2:'משנת יוסף 2',OSHER_AD:'אושר עד',POLIZER:'פוליצר',RAMI_LEVY:'רמי לוי',SALACH_DABACH:'סאלח דבאח',SHEFA_BARCART_ASHEM:'שפע ברכת השם',SHUFERSAL:'שופרסל',SHUK_AHIR:'שוק העיר',STOP_MARKET:'סטופ מרקט',SUPER_PHARM:'סופר פארם',SUPER_YUDA:'סופר יודה',SUPER_SAPIR:'סופר ספיר',FRESH_MARKET_AND_SUPER_DOSH:'פרש מרקט',TIV_TAAM:'טיב טעם',VICTORY_NEW_SOURCE:'ויקטורי',YELLOW:'יילו',YOHANANOF:'יוחננוף',ZOL_VEBEGADOL:'זול ובגדול',WOLT:'וולט'};
const COL_OFF=['TIV_TAAM','SUPER_PHARM','DOR_ALON','YELLOW','WOLT'];
const _boPricesCol=VIEWS.prices;
VIEWS.prices=async function(){
  await _boPricesCol.apply(this,arguments);
  if(cur!=='prices'||!isAdmin())return;
  const [c,{data:st,error}]=await Promise.all([cfg('collector'),sb.from('collector_status').select('*').order('name')]);
  if(cur!=='prices')return;
  const rows=error?[]:(st||[]),by={};rows.forEach(r=>by[r.chain]=r);
  const flags=Object.assign({},c.chains||{});
  const keys=[...new Set(Object.keys(COL_CHAINS).concat(Object.keys(flags),rows.map(r=>r.chain)))].filter(k=>k!=='_server');
  const on=k=>flags[k]!==undefined?!!flags[k]:!COL_OFF.includes(k);
  const name=k=>(by[k]&&by[k].name&&k.indexOf('MESHMAT')<0?by[k].name:COL_CHAINS[k])||k;
  const srv=by._server,inf=(srv&&srv.info)||{};
  const mode=c.shabbat||'margin',margin=+c.margin_min||60;
  const pub=c.public===true,hid=Array.isArray(c.hidden)?c.hidden:[];
  const ago=d=>d?seenAgo(d)+' · '+fmt(d):'—';
  const line=k=>{const r=by[k]||{};const bad=!!r.error;
    return '<tr data-col="'+esc(k)+'"><td><label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" data-colon '+(on(k)?'checked':'')+'> <b>'+esc(name(k))+'</b></label><span class="muted" dir="ltr" style="font-size:11px">'+esc(k)+'</span></td>'+
      '<td><label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" data-colshow '+(hid.includes(k)?'':'checked')+' aria-label="מוצג למשתמשים: '+esc(name(k))+'"> 👁️</label></td>'+
      '<td>'+ago(r.last_ok)+'</td><td>'+(r.stores||0).toLocaleString('he-IL')+'</td><td>'+(r.items||0).toLocaleString('he-IL')+'</td>'+
      '<td>'+(!on(k)?'<span class="muted">⏸️ כבויה</span>':bad?'<b style="color:var(--bad)">❌ '+esc(r.error)+'</b>'+(r.last_run?'<br><span class="muted">ניסיון אחרון: '+fmt(r.last_run)+'</span>':''):r.last_ok?'✅':'<span class="muted">עוד לא רצה</span>')+'</td></tr>';};
  const card='<div class="card" id="colCard"><h2>🛰️ איסוף מחירים אוטומטי מהשרת</h2>'+
    '<p class="muted">השרת שלנו (server.yamshopping.com) מוריד לבד את קבצי שקיפות המחירים של כל הסניפים בכל הרשתות: הכל פעם ביום ב-05:30, ושינויים כל שעה. תקלות נשלחות ליומן התקלות 🐞.</p>'+
    (srv?'<p>🖥️ <b>השרת:</b> '+(srv.info&&srv.info.paused?'⏸️ מושהה עכשיו ('+esc(srv.info.paused)+')':'✅ פעיל')+' · ריצה אחרונה '+ago(srv.last_run)+(inf.mem_mb?' · זיכרון '+inf.mem_mb+'MB':'')+(inf.disk_free_gb!=null?' · דיסק פנוי '+inf.disk_free_gb+'GB':'')+(inf.db_mb!=null?' · מאגר '+inf.db_mb+'MB':'')+'</p>':
      '<p class="muted">⏳ השרת עוד לא דיווח. אחרי ההתקנה (collector/setup.sh) והריצה הראשונה יופיע כאן הסטטוס.'+(error?' (צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית")':'')+'</p>')+
    '<div class="card" style="margin:8px 0;padding:10px 12px;border:2px solid '+(pub?'var(--ok)':'#e0b400')+'">'+
      '<label style="display:flex;gap:8px;align-items:center;cursor:pointer;font-size:15px"><input type="checkbox" id="colPublic" '+(pub?'checked':'')+'> <b>👁️ להציג את השוואת החנויות לכל המשתמשים</b></label>'+
      '<p class="muted" style="margin:6px 0 0">'+(pub?'✅ <b>מוצג לכולם עכשיו.</b> ':'🔒 <b>כבוי: רק מנהלים רואים</b> את הכרטיס "איפה הרשימה שלך הכי זולה?" ואת השוואת החנויות, כדי שתוכל לבדוק לפני שכולם רואים. ')+
      'גם המחירים מהשרת עולים לאתר (להשוואה הרגילה) רק כשזה דלוק. בעמודה 👁️ בטבלה בוחרים אילו רשתות המשתמשים רואים: רשת בלי 👁️ ממשיכה להיאסף בשרת, אבל לא מוצגת לאף אחד, והמחירים שלה יורדים מהאתר.</p></div>'+
    '<div style="margin:8px 0"><label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:0;color:var(--text)"><input type="checkbox" id="colNear" '+(c.near_deals_off?'':'checked')+'> <b>📍 מבצעים בסניפים הקרובים — לכל המשתמשים</b></label><p class="muted" style="margin:4px 0 0">המבצעים האמיתיים מקבצי הרשתות בסניפים הכי קרובים למשתמש (עם כפתור Waze), ב"מחירים ← מבצעים", וגם מעקב מבצעים עם התראות. עובד גם כשהשוואת החנויות כבויה.</p></div>'+
    '<div style="margin:8px 0"><b>🏪 לשונית החנויות — אילו כפתורים המשתמשים רואים:</b><div class="row" style="flex-wrap:wrap;gap:14px;margin-top:6px">'+
      [['feed','📰 מבצעים ועדכונים'],['dir','🏪 החנויות'],['branches','📍 סניפים ווייז'],['clothing','👗 ביגוד וחתונה']].map(([k,l])=>'<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:0;color:var(--text)"><input type="checkbox" data-colseg="'+k+'" '+((c.stores_off||[]).includes(k)?'':'checked')+'> '+l+'</label>').join('')+
      '</div><p class="muted" style="margin:4px 0 0">"💰 איפה הכי זול" מופיע ראשון כשהשוואת החנויות מוצגת (המתג למעלה).</p></div>'+
    '<div style="margin:8px 0"><b>📣 באנר קטן "איפה הכי זול" בראש הרשימה:</b><div class="row" style="flex-wrap:wrap;gap:14px;align-items:center;margin-top:6px">'+
      '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:0;color:var(--text)"><input type="checkbox" id="colPromo" '+(c.promo_off?'':'checked')+'> להציג</label>'+
      '<label style="display:flex;gap:6px;align-items:center;margin:0;color:var(--text)">עד תאריך <input type="date" id="colPromoUntil" style="max-width:170px" value="'+esc(c.promo_until||new Date(Date.now()+7*864e5).toISOString().slice(0,10))+'"></label>'+
      '</div><p class="muted" style="margin:4px 0 0">כל מי שנכנס לאתר רואה אותו בכל כניסה עד התאריך. ✕ סוגר אותו עד הכניסה הבאה. לחיצה פותחת את ההשוואה בלשונית "מחירים וחנויות". מוצג רק כשהשוואת החנויות מוצגת (המתג למעלה).</p></div>'+
    '<div class="row" style="align-items:center;gap:8px;margin:8px 0"><label for="colShab"><b>🕯️ שבת וחג:</b></label><select id="colShab" style="max-width:260px">'+
      [['margin','השהיה עם מרווח'],['exact','השהיה בדיוק בזמני השבת'],['off','בלי השהיה']].map(([v,l])=>'<option value="'+v+'"'+(mode===v?' selected':'')+'>'+l+'</option>').join('')+'</select>'+
      '<label id="colMarginL"'+(mode==='margin'?'':' hidden')+'>מרווח <input id="colMargin" type="number" min="0" max="240" step="15" value="'+margin+'" style="max-width:80px"> דקות לפני הדלקת נרות ואחרי הצאת</label></div>'+
    '<p class="muted" style="margin:0 0 8px">לפי זמני ירושלים, ובחגים לפי לוח ארץ ישראל. בזמן ההשהיה השרת לא מוריד ולא מעלה כלום, וריצה שבאמצע נעצרת.</p>'+
    '<div class="tw"><table><thead><tr><th>רשת (נאספת?)</th><th>מוצג למשתמשים</th><th>עדכון אחרון</th><th>סניפים</th><th>מוצרים</th><th>מצב</th></tr></thead><tbody>'+keys.sort((a,b)=>name(a).localeCompare(name(b),'he')).map(line).join('')+'</tbody></table></div>'+
    '<div class="row" style="margin-top:8px"><button class="btn" id="colSave">💾 שמירת ההגדרות</button></div></div>';
  $('#boMain').insertAdjacentHTML('afterbegin',card);
  const box=$('#colCard');
  box.querySelector('#colShab').onchange=e=>{box.querySelector('#colMarginL').hidden=e.target.value!=='margin';};
  box.querySelector('#colSave').onclick=async()=>{
    const chains={},hidden=[];box.querySelectorAll('tr[data-col]').forEach(tr=>{chains[tr.dataset.col]=tr.querySelector('[data-colon]').checked;if(!tr.querySelector('[data-colshow]').checked)hidden.push(tr.dataset.col);});
    const isPub=box.querySelector('#colPublic').checked;
    if(isPub&&!pub&&!(await uiConfirm('להציג את השוואת החנויות לכל המשתמשים באתר?')))return;
    const m=Math.max(0,Math.min(240,parseInt(box.querySelector('#colMargin').value,10)||60));
    if(await setCfg('collector',Object.assign({},c,{chains,hidden,public:isPub,stores_off:Array.from(box.querySelectorAll('[data-colseg]')).filter(x=>!x.checked).map(x=>x.dataset.colseg),promo_off:!box.querySelector('#colPromo').checked,near_deals_off:!box.querySelector('#colNear').checked,promo_until:box.querySelector('#colPromoUntil').value||null,shabbat:box.querySelector('#colShab').value,margin_min:m}),'💾 נשמר — השרת יקרא את זה בריצה הבאה'))show('prices');};
};
/* ---------- 📱/🌐 משתמשים: מי משתמש מהאתר ומי מהאפליקציה לאנדרואיד ----------
   האפליקציה מסמנת את עצמה ("YamShoppingApp/" בדפדפן שלה). נספר בכל כניסה (touch_presence),
   ולפני כן — לפי ההרשמה והכניסות שנשמרו ביומן האבטחה. */
const PL={app:['📱','אפליקציה'],web:['🌐','אתר'],both:['📱🌐','גם וגם'],none:['❔','עוד לא ידוע']};
let plFilter='';
const _plUsers=VIEWS.users;
VIEWS.users=async function(){await _plUsers.apply(this,arguments);if(cur!=='users'||!$('#utb'))return;
  const {data,error}=await sb.rpc('admin_user_platforms');if(cur!=='users'||!$('#utb'))return;
  const card=document.createElement('div');card.className='card';card.id='plCard';
  if(error){card.innerHTML='<h2>📱 אתר או אפליקציה</h2><p class="muted">⚠️ כדי לראות מי משתמש מהאתר ומי מהאפליקציה — צריך להריץ שוב את קוד ה-SQL (⚙️ הגדרה ראשונית).</p>';$('#boMain').prepend(card);return;}
  const by={};(data||[]).forEach(r=>{by[r.user_id]=Object.assign({k:r.app_at&&r.web_at?'both':r.app_at?'app':r.web_at?'web':'none'},r);});
  const kindOf=id=>(by[id]||{}).k||'none';
  const ids=[...document.querySelectorAll('#utb tr[data-uid]')].map(tr=>tr.dataset.uid);
  const cnt={app:0,web:0,both:0,none:0};ids.forEach(id=>cnt[kindOf(id)]++);
  card.innerHTML='<h2>📱 מהאתר או מהאפליקציה</h2><p class="muted">📱 <b>אפליקציה</b> — האפליקציה לאנדרואיד · 🌐 <b>אתר</b> — דפדפן במחשב או בטלפון (גם אתר שהוצמד למסך הבית) · 📱🌐 משתמשים בשניהם. לחיצה מסננת את הטבלה.</p>'+
    '<div class="pltiles">'+['app','web','both','none'].map(k=>'<button class="pltile'+(plFilter===k?' on':'')+'" data-plf="'+k+'"><b>'+cnt[k]+'</b><span>'+PL[k][0]+' '+PL[k][1]+'</span></button>').join('')+'</div>';
  $('#boMain').prepend(card);
  const th=document.querySelector('#utb').closest('table').querySelector('thead tr');if(th&&!th.querySelector('.plth'))th.lastElementChild.insertAdjacentHTML('beforebegin','<th class="plth">אתר / אפליקציה</th>');
  const when=d=>d?fmt(d)+' · '+seenAgo(d):'';
  const deco=()=>document.querySelectorAll('#utb tr[data-uid]').forEach(tr=>{const k=kindOf(tr.dataset.uid);tr.classList.toggle('plhide',!!plFilter&&plFilter!==k);if(tr.querySelector('.pltd'))return;
    const r=by[tr.dataset.uid]||{};const tip=[r.app_at?'📱 אפליקציה: '+when(r.app_at):'',r.web_at?'🌐 אתר: '+when(r.web_at):''].filter(Boolean).join('\n');
    tr.lastElementChild.insertAdjacentHTML('beforebegin','<td class="pltd" title="'+esc(tip)+'"><span class="plk pl-'+k+'">'+PL[k][0]+' '+PL[k][1]+'</span>'+(r.signup_from?'<br><small class="muted">נרשם '+(r.signup_from==='app'?'מהאפליקציה':'מהאתר')+'</small>':'')+'</td>');});
  deco();new MutationObserver(deco).observe($('#utb'),{childList:true});
  card.onclick=e=>{const b=e.target.closest('[data-plf]');if(!b)return;plFilter=plFilter===b.dataset.plf?'':b.dataset.plf;card.querySelectorAll('[data-plf]').forEach(x=>x.classList.toggle('on',x.dataset.plf===plFilter));deco();};
};

/* ---------- 🔎 חיפוש מחירים: כל המחירים שיש במערכת למוצר — מקבצי שקיפות המחירים, מדיווחים וממקורות מחירים ---------- */
if(!MOD_TABS.includes('pricefind'))MOD_TABS.push('pricefind');
(function(){const nav=$('#boNav');if(!nav||nav.querySelector('[data-s="pricefind"]'))return;const b=document.createElement('button');b.dataset.s='pricefind';b.textContent='🔎 חיפוש מחירים';
  const a=nav.querySelector('[data-s="products"]');if(a)a.before(b);else nav.appendChild(b);})();
let pfLast='';
VIEWS.pricefind=async function(){
  $('#boMain').innerHTML='<div class="card" id="pfCard"><h2>🔎 חיפוש מחירים</h2><p class="muted">כותבים שם מוצר או ברקוד, ורואים כל מחיר שיש לו במערכת — מהזול ליקר: 🛰️ מקבצי שקיפות המחירים של הרשתות (מחיר מייצג לכל רשת), 👤 מדיווחים של משתמשים, ו-🔗 ממקורות מחירים וחנויות.</p>'+
    '<div class="row"><input id="pfQ" type="search" placeholder="למשל: חלב 3% תנובה · או ברקוד" autocomplete="off" maxlength="60" value="'+esc(pfLast)+'"><button class="btn" id="pfGo">🔎 חיפוש</button></div><div id="pfRes"></div></div>'+
    '<div class="card" id="pfSrvCard"><h2>🏪 המחיר בכל סניף בעיר</h2><p class="muted">מהשרת שלנו (server.yamshopping.com), שמחזיק את המחיר העדכני בכל סניף בארץ. בוחרים עיר — ורואים את המוצר בכל הסניפים שם, מהזול ליקר.</p>'+
    '<div class="row"><input id="pfCity" placeholder="עיר (למשל: בני ברק)" maxlength="40"><button class="btn sec" id="pfCityGo">🏪 הצגה</button></div><div id="pfSrv"></div></div>';
  const res=$('#pfRes'),q=$('#pfQ');
  const srcOf=r=>/^collector/.test(r.origin||'')?'<span class="pfsrc">🛰️ שקיפות מחירים</span>':r.origin?'<span class="pfsrc">🔗 '+esc(r.origin.replace(/^[a-z_]+:/i,''))+'</span>':'<span class="pfsrc">👤 '+esc(r.by_name||'משתמש')+'</span>';
  const run=async()=>{const t=q.value.trim().slice(0,60);pfLast=t;if(t.length<2){res.innerHTML='<p class="muted">כתבו לפחות 2 אותיות.</p>';return;}
    res.innerHTML='<p class="muted">מחפש...</p>';
    let qb=sb.from('prices').select('id,product,chain,branch,price,currency,barcode,is_deal,deal_text,valid_until,origin,status,by_name,confirms,wrong,created_at,updated_at');
    if(/^\d{4,20}$/.test(t.replace(/\s/g,'')))qb=qb.eq('barcode',t.replace(/\s/g,''));
    else t.split(/\s+/).filter(Boolean).slice(0,5).forEach(w=>{qb=qb.ilike('product','%'+w.replace(/[\\%_]/g,'\\$&')+'%');});
    const {data,error}=await qb.order('price',{ascending:true}).limit(1000);
    if(cur!=='pricefind'||pfLast!==t)return;
    if(error){res.innerHTML='<p class="muted">⚠️ '+esc(error.message)+'</p>';return;}
    const rows=data||[];if(!rows.length){res.innerHTML='<p class="muted">🤷 לא נמצאו מחירים ל"'+esc(t)+'". אפשר לנסות מילה אחת, או "המחיר בכל סניף בעיר" למטה.</p>';return;}
    const g={};rows.forEach(r=>{const k=norm(r.product).toLowerCase();(g[k]=g[k]||{name:r.product,bc:'',rows:[]}).rows.push(r);if(r.barcode&&!g[k].bc)g[k].bc=r.barcode;});
    const groups=Object.values(g).sort((a,b)=>b.rows.length-a.rows.length).slice(0,40);
    const old=d=>d&&Date.now()-new Date(d).getTime()>30*864e5;
    res.innerHTML='<p class="muted">נמצאו '+rows.length+(rows.length>=1000?'+':'')+' מחירים ל-'+Object.keys(g).length+' מוצרים'+(Object.keys(g).length>40?' (מוצגים 40 — כדאי לחפש מדויק יותר)':'')+'.</p>'+
      groups.map((x,i)=>{const p=x.rows.map(r=>+r.price),mn=Math.min(...p),mx=Math.max(...p),cu=x.rows[0].currency||'ILS';
        return '<details class="pfg"'+(i<3?' open':'')+'><summary><b>'+esc(x.name)+'</b>'+(x.bc?' <small class="muted" dir="ltr">'+esc(x.bc)+'</small>':'')+
          ' <span class="pfrng">'+(mn===mx?fmtPrice(mn,cu):fmtPrice(mn,cu)+' – '+fmtPrice(mx,cu))+'</span> <small class="muted">· '+x.rows.length+' מחירים · '+new Set(x.rows.map(r=>r.chain)).size+' רשתות</small></summary>'+
          '<div class="tw"><table><thead><tr><th>מחיר</th><th>רשת / חנות</th><th>סניף</th><th>מקור</th><th>עודכן</th></tr></thead><tbody>'+
          x.rows.map(r=>{const d=r.updated_at||r.created_at;return '<tr><td><b>'+fmtPrice(r.price,r.currency)+'</b>'+(r.is_deal?'<br><small class="pfdeal">🔥 '+esc(r.deal_text||'מבצע')+(r.valid_until?' · עד '+esc(new Date(r.valid_until).toLocaleDateString('he-IL')):'')+'</small>':'')+'</td>'+
            '<td>'+esc(r.chain)+'</td><td>'+(r.branch?esc(r.branch):'<span class="muted">כל הרשת</span>')+'</td><td>'+srcOf(r)+(r.status==='pending'?' <span class="pill">⏳ לאישור</span>':'')+(r.wrong?' <span class="pill">❌ '+r.wrong+'</span>':'')+'</td>'+
            '<td>'+fmt(d)+'<br><small class="muted">'+seenAgo(d).replace('🟢 ','')+(old(d)?' · ⚠️ ישן':'')+'</small></td></tr>';}).join('')+'</tbody></table></div></details>';}).join('');};
  $('#pfGo').onclick=run;q.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run();}};
  const srv=$('#pfSrv'),city=$('#pfCity');
  const runSrv=async()=>{const t=q.value.trim().slice(0,60),c=city.value.trim();if(t.length<2){srv.innerHTML='<p class="muted">כתבו קודם שם מוצר בחיפוש למעלה.</p>';return;}if(!c){srv.innerHTML='<p class="muted">בחרו עיר.</p>';return;}
    srv.innerHTML='<p class="muted">מחפש בכל הסניפים ב'+esc(c)+'...</p>';
    let d;try{d=await priceApi('/compare',{items:t.replace(/[|*\n]/g,' '),city:c,limit:60});}catch(e){srv.innerHTML='<p class="muted">⚠️ '+esc(e.message||'')+'</p>';return;}
    const st=(d.stores||[]).filter(s=>s.found>0&&s.lines&&s.lines[0]&&s.lines[0].found).sort((a,b)=>a.total-b.total);
    if(!st.length){srv.innerHTML='<p class="muted">🤷 לא נמצא המוצר בסניפים ב'+esc(c)+'.</p>';return;}
    srv.innerHTML='<p class="muted">'+st.length+' סניפים ב'+esc(c)+' · מהזול ליקר</p><div class="tw"><table><thead><tr><th>מחיר</th><th>המוצר בסניף</th><th>רשת</th><th>סניף</th></tr></thead><tbody>'+
      st.map(s=>{const l=s.lines[0];return '<tr><td><b>'+fmtPrice(l.cost)+'</b>'+(l.deal&&l.cost<l.regular?' <s class="muted">'+fmtPrice(l.regular)+'</s><br><small class="pfdeal">🔥 '+esc(l.deal.text||'מבצע')+'</small>':'')+'</td><td>'+esc(l.name||'')+(l.code?' <small class="muted" dir="ltr">'+esc(l.code)+'</small>':'')+'</td><td>'+esc(s.chain_name||s.chain||'')+(s.brand?' · '+esc(s.brand):'')+'</td><td>'+esc([s.name,s.address].filter(Boolean).join(' · '))+'</td></tr>';}).join('')+'</tbody></table></div>';};
  $('#pfCityGo').onclick=runSrv;city.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();runSrv();}};
  if(pfLast)run();else q.focus();
};
(function(){const st=document.createElement('style');st.textContent=
  '#plCard .pltiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:6px}'+
  '#plCard .pltile{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;background:var(--card,#fff);color:var(--text);cursor:pointer;font:inherit;text-align:start}'+
  '#plCard .pltile b{font-size:24px}#plCard .pltile.on{outline:2px solid var(--hdr2,#0f5d50);background:var(--chip)}'+
  '#utb tr.plhide{display:none}.plk{white-space:nowrap;border-radius:999px;padding:2px 8px;font-size:13px;background:var(--chip)}'+
  '#pfCard .pfg{border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin:8px 0}#pfCard .pfg summary{cursor:pointer;line-height:1.7}'+
  '#pfCard .pfrng{font-weight:700;color:var(--hdr2,#0f5d50);white-space:nowrap}.pfdeal{color:#c2410c}.pfsrc{white-space:nowrap}';document.head.appendChild(st);})();
/* הוספת מסך לבק אופיס מסקריפט אחר: boView('key', async function(){...}) */
window.boView=(k,fn)=>{if(typeof fn==='function')VIEWS[k]=fn;};
window.boShow=k=>show(k);
/* להוסיף תוכן בסוף מסך קיים בבק אופיס: boAfter('torah', async main=>{...}) */
window.boAfter=(k,fn)=>{const o=VIEWS[k];if(typeof o!=='function'||typeof fn!=='function')return;VIEWS[k]=async function(){const r=await o.apply(this,arguments);try{await fn($('#boMain'));}catch(e){console.warn('boAfter',k,e);}return r;};};
})();
