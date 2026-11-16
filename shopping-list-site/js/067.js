
/* ================= 69: 🚀 שחרור גרסה של האפליקציה, ו-📲 התראה לטלפון — לכולם / רק לכמה משתמשים / לכולם חוץ מכמה (אפליקציה 1.9 ומעלה) =================
   כל גרסה שנבנית נשמרת באתר גם בשם download/yamshopping-<גרסה>.apk.
   כאן בוחרים למי היא מגיעה. האפליקציה (מ-1.9) שואלת את השרת (app_release_for) ומקבלת התראה ועדכון רק על מה ששוחרר אליה.
   גרסה שאין לה שחרור פעיל מגיעה לכולם כרגיל מתוך download/app-version.json. */
(function(){
  const $69=s=>document.querySelector(s);
  const nav=$69('#boNav');if(!nav||!window.boView)return;
  if(!nav.querySelector('[data-s="releases"]')){const b=document.createElement('button');b.dataset.s='releases';b.textContent='🚀 שחרור גרסה לאפליקציה';
    const ref=nav.querySelector('[data-s="announce"]')||nav.querySelector('[data-s="updates"]');if(ref)ref.after(b);else nav.appendChild(b);}
  const AUD={all:'👥 לכולם',only:'🎯 רק למשתמשים שבחרתי',except:'🚫 לכולם חוץ ממשתמשים שבחרתי'};
  const VER=/^\d{1,3}(\.\d{1,3}){1,2}$/;
  let users=null;
  const who=id=>{const u=(users||[]).find(x=>x.id===id);return u?(u.name||u.email||'משתמש/ת'):'משתמש/ת שנמחק/ה';};
  const hasFile=async v=>{try{const r=await fetch('/download/yamshopping-'+v+'.apk',{method:'HEAD',cache:'no-cache'});return r.ok;}catch(e){return null;}};
  window.boView('releases',async function(){const m=$69('#boMain');let aud='all',pick=[];
    m.innerHTML='<div class="card"><p class="muted">טוען…</p></div>';
    if(!users){const {data}=await sb.rpc('admin_user_list');users=data||[];}
    const pub=window.apkVer57?await apkVer57():null;
    async function list(){const box=m.querySelector('#rl69');if(!box)return;
      const {data,error}=await sb.from('app_releases').select('*').order('created_at',{ascending:false}).limit(100);
      if(error){box.innerHTML='<p class="muted">⚠️ '+(/app_releases/.test(error.message)?'צריך להריץ שוב את קוד ה-SQL ב-Supabase':esc(error.message))+'</p>';return;}
      if(!data.length){box.innerHTML='<p class="muted">עוד לא שוחררה גרסה מכאן. בינתיים כל גרסה מגיעה לכולם.</p>';return;}
      box.innerHTML='<div class="tw" tabindex="0" role="region" aria-label="שחרורים"><table><thead><tr><th>גרסה</th><th>למי</th><th>מצב</th><th></th></tr></thead><tbody>'+
        data.map(r=>'<tr><td><b>'+esc(r.version)+'</b><br><small class="muted">'+esc(new Date(r.created_at).toLocaleString('he-IL'))+'</small>'+(r.notes?'<br><small>'+esc(r.notes)+'</small>':'')+'</td>'+
          '<td>'+AUD[r.audience]+(r.audience!=='all'?'<br><small>'+(r.users||[]).map(u=>esc(who(u))).join(', ')+'</small>':'')+'</td>'+
          '<td>'+(r.active?'✅ פעיל':'⏸️ מושהה')+'</td>'+
          '<td style="white-space:nowrap"><button class="btn sec" data-t69="'+r.id+'" data-a="'+(r.active?'0':'1')+'">'+(r.active?'⏸️ להשהות':'▶️ להפעיל')+'</button> <button class="btn sec" data-d69="'+r.id+'" aria-label="מחיקה">🗑️</button></td></tr>').join('')+'</tbody></table></div>';}
    function chips(){const c=m.querySelector('#ch69');if(!c)return;
      c.innerHTML=pick.length?pick.map(id=>'<span class="plk" style="display:inline-flex;gap:6px;align-items:center;margin:2px">'+esc(who(id))+'<button type="button" class="btn sec" style="padding:0 6px" data-x69="'+id+'" aria-label="הסרה">✕</button></span>').join(''):'<span class="muted">עוד לא נבחרו משתמשים</span>';
      m.querySelector('#us69').hidden=aud==='all';}
    m.innerHTML='<div class="card"><h2>🚀 שחרור גרסה לאפליקציה</h2>'+
      '<p class="muted">בוחרים גרסה של האפליקציה ולמי היא מגיעה. מי שהיא מיועדת לו מקבל התראה בטלפון ויכול לעדכן מתוך האפליקציה. מי שלא, לא רואה אותה בכלל.</p>'+
      '<p class="muted">גרסה שלא שוחררה כאן מגיעה לכולם כרגיל. הגרסה הכללית עכשיו: <b>'+esc(pub&&pub.version||'?')+'</b>. זה עובד בטלפונים עם אפליקציה 1.9 ומעלה. משתמש מסוים אפשר לבחור רק אם הוא מחובר לחשבון באפליקציה.</p></div>'+
      '<div class="card"><h2>➕ שחרור חדש</h2>'+
      '<label for="v69">גרסה</label><input id="v69" dir="ltr" maxlength="11" placeholder="למשל 2.0" style="max-width:140px"> <span id="vf69" class="muted"></span>'+
      '<label for="nt69">מה חדש (לא חובה, מופיע בהתראה)</label><input id="nt69" maxlength="300" placeholder="למשל: תיקון בסורק">'+
      '<div class="row" role="radiogroup" aria-label="למי" style="gap:8px;flex-wrap:wrap;margin-top:8px">'+Object.keys(AUD).map(k=>'<button type="button" class="btn'+(k===aud?'':' sec')+'" data-au69="'+k+'" role="radio" aria-checked="'+(k===aud)+'">'+AUD[k]+'</button>').join('')+'</div>'+
      '<div id="us69" style="margin-top:8px"><label for="q69">הוספת משתמש (שם או מייל)</label><input id="q69" list="ul69" placeholder="מתחילים להקליד…"><datalist id="ul69">'+
        users.map(u=>'<option value="'+esc((u.name||'')+' <'+(u.email||u.id)+'>')+'">').join('')+'</datalist><div id="ch69" style="margin-top:6px"></div></div>'+
      '<button class="btn" id="go69" style="margin-top:10px">🚀 לשחרר</button></div>'+
      '<div class="card"><h2>📋 שחרורים</h2><div id="rl69"></div><p class="muted" style="margin-top:6px">⏸️ שחרור מושהה לא משפיע על אף אחד, והגרסה חוזרת להגיע לכולם כרגיל.</p></div>';
    chips();list();
    const setAud=k=>{aud=k;m.querySelectorAll('[data-au69]').forEach(b=>{const on=b.dataset.au69===k;b.classList.toggle('sec',!on);b.setAttribute('aria-checked',on);});chips();};
    const add=()=>{const q=m.querySelector('#q69'),v=q.value.trim();if(!v)return;const mm=v.match(/<([^>]+)>\s*$/),key=(mm?mm[1]:v).toLowerCase();
      const u=users.find(x=>(x.email||'').toLowerCase()===key||x.id===key)||users.find(x=>(x.name||'').trim()===v);
      if(!u){flash('לא נמצא משתמש כזה');return;}if(!pick.includes(u.id))pick.push(u.id);q.value='';chips();};
    m.querySelector('#q69').onchange=add;m.querySelector('#q69').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();add();}};
    let vt=0;m.querySelector('#v69').oninput=e=>{clearTimeout(vt);const v=e.target.value.trim(),f=m.querySelector('#vf69');f.textContent='';
      if(!VER.test(v))return;vt=setTimeout(async()=>{const ok=await hasFile(v);f.textContent=ok?'✅ הקובץ של הגרסה נמצא באתר':ok===false?'⚠️ הקובץ yamshopping-'+v+'.apk עוד לא נמצא באתר':'';},400);};
    m.onclick=async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
      if(d.au69){setAud(d.au69);return;}
      if(d.x69){pick=pick.filter(x=>x!==d.x69);chips();return;}
      if(d.t69){const {error}=await sb.from('app_releases').update({active:d.a==='1'}).eq('id',d.t69);if(error)flash('⚠️ '+error.message);list();return;}
      if(d.d69){if(!(await uiConfirm('למחוק את השחרור? הגרסה תחזור להגיע לכולם כרגיל.')))return;const {error}=await sb.from('app_releases').delete().eq('id',d.d69);if(error)flash('⚠️ '+error.message);list();return;}
      if(b.id==='go69'){const v=m.querySelector('#v69').value.trim(),notes=m.querySelector('#nt69').value.trim();
        if(!VER.test(v)){flash('כתבו מספר גרסה, למשל 2.0');return;}
        if(aud!=='all'&&!pick.length){flash('בחרו לפחות משתמש אחד');return;}
        const ok=await hasFile(v);if(ok===false&&!(await uiConfirm('הקובץ של גרסה '+v+' עוד לא נמצא באתר. עד שיעלה, מי שינסה לעדכן יקבל שגיאה. לשחרר בכל זאת?')))return;
        const names=pick.map(who).join(', ');
        if(!(await uiConfirm('לשחרר את גרסה '+v+'\n'+AUD[aud]+(aud!=='all'?':\n'+names:'')+'?')))return;
        b.disabled=true;const {error}=await sb.from('app_releases').insert({version:v,notes,audience:aud,users:aud==='all'?[]:pick});b.disabled=false;
        if(error){flash('⚠️ '+(/app_releases/.test(error.message)?'צריך להריץ שוב את קוד ה-SQL ב-Supabase':error.message));return;}
        flash('🚀 שוחרר! הטלפונים יקבלו התראה בבדיקה הבאה (עד כמה שעות)');pick=[];m.querySelector('#v69').value='';m.querySelector('#vf69').textContent='';m.querySelector('#nt69').value='';chips();list();}};
  });
  /* ---------- 📲 התראה לטלפון: הודעה שכותבים כאן מגיעה כהתראה באפליקציה (1.9 ומעלה), גם כשהיא סגורה ---------- */
  if(!nav.querySelector('[data-s="phonenote"]')){const b=document.createElement('button');b.dataset.s='phonenote';b.textContent='📲 התראה לטלפון';
    const ref=nav.querySelector('[data-s="releases"]');if(ref)ref.before(b);else nav.appendChild(b);}
  const LINKS=[['','פתיחת האפליקציה'],['/?tab=list','רשימת הקניות']];
  window.boView('phonenote',async function(){const m=$69('#boMain');let aud='all',pick=[];
    m.innerHTML='<div class="card"><p class="muted">טוען…</p></div>';
    if(!users){const {data}=await sb.rpc('admin_user_list');users=data||[];}
    async function list(){const box=m.querySelector('#nl69');if(!box)return;
      const {data,error}=await sb.from('app_notices').select('*').order('created_at',{ascending:false}).limit(50);
      let cnt={};try{const c=await sb.rpc('app_notice_counts');(c.data||[]).forEach(x=>cnt[x.notice_id]=x.phones);}catch(e){}
      if(error){box.innerHTML='<p class="muted">⚠️ '+(/app_notices/.test(error.message)?'צריך להריץ שוב את קוד ה-SQL ב-Supabase':esc(error.message))+'</p>';return;}
      if(!data.length){box.innerHTML='<p class="muted">עוד לא נשלחו התראות מכאן.</p>';return;}
      box.innerHTML='<div class="tw" tabindex="0" role="region" aria-label="התראות שנשלחו"><table><thead><tr><th>מתי</th><th>ההודעה</th><th>למי</th><th>הגיע ל</th></tr></thead><tbody>'+
        data.map(r=>'<tr><td style="white-space:nowrap">'+esc(new Date(r.created_at).toLocaleString('he-IL'))+'</td><td><b>'+esc(r.title)+'</b>'+(r.body?'<br><small>'+esc(r.body)+'</small>':'')+'</td>'+
          '<td>'+AUD[r.audience]+(r.audience!=='all'?'<br><small>'+(r.users||[]).map(u=>esc(who(u))).join(', ')+'</small>':'')+'</td><td style="white-space:nowrap">📱 '+(cnt[r.id]||0)+' טלפונים</td></tr>').join('')+'</tbody></table></div>'+
        '<p class="muted" style="margin-top:6px">"הגיע ל" — כמה טלפונים כבר קיבלו את ההתראה. טלפון בודק כשהאפליקציה פתוחה, וברקע כל רבע שעה עד כמה שעות (תלוי בחיסכון הסוללה בטלפון).</p>';}
    function chips(){const c=m.querySelector('#nch69');if(!c)return;
      c.innerHTML=pick.length?pick.map(id=>'<span class="plk" style="display:inline-flex;gap:6px;align-items:center;margin:2px">'+esc(who(id))+'<button type="button" class="btn sec" style="padding:0 6px" data-nx69="'+id+'" aria-label="הסרה">✕</button></span>').join(''):'<span class="muted">עוד לא נבחרו משתמשים</span>';
      m.querySelector('#nus69').hidden=aud==='all';}
    function pv(){const ti=m.querySelector('#nt169'),bi=m.querySelector('#nb69'),out=m.querySelector('#npv69');if(!ti||!bi||!out)return;const t=ti.value.trim()||'כותרת',b=bi.value.trim();const nm=aud==='only'&&pick.length?who(pick[0]):'משה';
      const f=s=>s.replace(/\{שם\}/g,nm);m.querySelector('#npv69').innerHTML='<b>'+esc(f(t))+'</b>'+(b?'<br>'+esc(f(b)):'');}
    m.innerHTML='<div class="card"><h2>📲 התראה לטלפון</h2>'+
      '<p class="muted">כותבים הודעה, והיא מגיעה כהתראה בטלפון למי שבחרת, גם כשהאפליקציה סגורה. ההתראה מגיעה בבדיקה הבאה של הטלפון, תוך רבע שעה בערך. בשבת ובלילה (22:00 עד 07:00) היא מחכה ומגיעה אחר כך.</p>'+
      '<p class="muted">✨ כותבים <b>{שם}</b> וזה מתחלף בשם של כל משתמש. למשל: "{שם}, עוד מעט נגמרים המבצעים". זה עובד באפליקציה 1.9 ומעלה. משתמש מסוים אפשר לבחור רק אם הוא מחובר לחשבון באפליקציה.</p></div>'+
      '<div class="card"><h2>✍️ התראה חדשה</h2>'+
      '<label for="nt169">כותרת</label><input id="nt169" maxlength="80" placeholder="למשל: {שם}, עוד מעט נגמרים המבצעים ⏰">'+
      '<label for="nb69">הודעה (לא חובה)</label><textarea id="nb69" maxlength="400" rows="2" style="width:100%" placeholder="למשל: המבצעים של השבוע נגמרים הערב"></textarea>'+
      '<label for="nu69">לחיצה על ההתראה פותחת</label><select id="nu69">'+LINKS.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select>'+
      '<div class="row" role="radiogroup" aria-label="למי" style="gap:8px;flex-wrap:wrap;margin-top:8px">'+Object.keys(AUD).map(k=>'<button type="button" class="btn'+(k===aud?'':' sec')+'" data-nau69="'+k+'" role="radio" aria-checked="'+(k===aud)+'">'+AUD[k]+'</button>').join('')+'</div>'+
      '<div id="nus69" style="margin-top:8px"><label for="nq69">הוספת משתמש (שם או מייל)</label><input id="nq69" list="nul69" placeholder="מתחילים להקליד…"><datalist id="nul69">'+
        users.map(u=>'<option value="'+esc((u.name||'')+' <'+(u.email||u.id)+'>')+'">').join('')+'</datalist><div id="nch69" style="margin-top:6px"></div></div>'+
      '<div class="card" style="background:var(--bg);margin-top:8px"><b>👀 כך זה ייראה בטלפון:</b><div class="v26card" id="npv69" style="margin-top:6px"></div></div>'+
      '<button class="btn" id="ngo69" style="margin-top:10px">📲 לשלוח</button></div>'+
      '<div class="card"><h2>📋 התראות שנשלחו</h2><div id="nl69"></div></div>';
    chips();pv();list();m.oninput=pv;
    const add=()=>{const q=m.querySelector('#nq69'),v=q.value.trim();if(!v)return;const mm=v.match(/<([^>]+)>\s*$/),key=(mm?mm[1]:v).toLowerCase();
      const u=users.find(x=>(x.email||'').toLowerCase()===key||x.id===key)||users.find(x=>(x.name||'').trim()===v);
      if(!u){flash('לא נמצא משתמש כזה');return;}if(!pick.includes(u.id))pick.push(u.id);q.value='';chips();pv();};
    m.querySelector('#nq69').onchange=add;m.querySelector('#nq69').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();add();}};
    m.onclick=async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
      if(d.nau69){aud=d.nau69;m.querySelectorAll('[data-nau69]').forEach(x=>{const on=x.dataset.nau69===aud;x.classList.toggle('sec',!on);x.setAttribute('aria-checked',on);});chips();pv();return;}
      if(d.nx69){pick=pick.filter(x=>x!==d.nx69);chips();pv();return;}
      if(b.id==='ngo69'){const title=m.querySelector('#nt169').value.trim(),body=m.querySelector('#nb69').value.trim(),url=m.querySelector('#nu69').value;
        if(!title){flash('כתבו כותרת');return;}if(aud!=='all'&&!pick.length){flash('בחרו לפחות משתמש אחד');return;}
        if(!(await uiConfirm('לשלוח התראה לטלפון\n'+AUD[aud]+(aud!=='all'?':\n'+pick.map(who).join(', '):'')+'?\n\n'+title+(body?'\n'+body:''))))return;
        b.disabled=true;const {error}=await sb.from('app_notices').insert({title,body,url,audience:aud,users:aud==='all'?[]:pick});b.disabled=false;
        if(error){flash('⚠️ '+(/app_notices/.test(error.message)?'צריך להריץ שוב את קוד ה-SQL ב-Supabase':error.message));return;}
        flash('📲 נשלח! מגיע לטלפונים תוך רבע שעה בערך');pick=[];m.querySelector('#nt169').value='';m.querySelector('#nb69').value='';chips();pv();list();}};
  });
})();
