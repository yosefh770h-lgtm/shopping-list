/* ================= 🚧 מצב שיפוצים וזיהוי פריצה (בק אופיס ← 🛡️ בוטים ואבטחה ← 🚧 מצב שיפוצים) =================
   לחיצה אחת של הבעלים: האתר נסגר לכולם (במסד — 503 לכל בקשה, ובשרת — דף "האתר בשיפוצים"), וכל המחוברים מנותקים.
   פתיחה: השרת משווה את כל הקבצים ל-GitHub, ורק אם הכל זהה — נפתח. אחרת רואים כאן מה השתנה.
   הטבלה: site_lock (supabase/schema.sql), השומר בשרת: collector/yam/lockdown.py. */
(function(){
if(!window.boView)return;
const $s=s=>document.querySelector(s);
const when=d=>{try{return new Date(d).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}};
const ago=d=>{const m=Math.floor((Date.now()-new Date(d).getTime())/60000);return m<1?'עכשיו':m<60?'לפני '+m+' דק׳':m<1440?'לפני '+Math.floor(m/60)+' שע׳':'לפני '+Math.floor(m/1440)+' ימים';};
const KIND={kick:['🔌','חשבון נותק'],lock:['🚧','האתר נסגר'],unlock:['✅','האתר נפתח'],tamper:['🚨','חשד לפריצה'],perm:['👤','שינוי בהרשאות'],sys_change:['⚠️','שינוי בהגדרות השרת']};
const CMD='sudo env PYTHONPATH=/opt/yamshopping/repo/collector /opt/yamshopping/venv/bin/python -m yam.lockdown';
let poll=null;

if(!document.getElementById('ldCss')){const st=document.createElement('style');st.id='ldCss';st.textContent=
  '#ldMain .ldbig{display:flex;gap:14px;align-items:center;flex-wrap:wrap}#ldMain .ldbig .ic{font-size:44px;line-height:1}'+
  '#ldMain .ldbig h2{margin:0}#ldMain .ldstate.open{border-color:#2e9d6a}#ldMain .ldstate.closed{border-color:#d64545;background:rgba(214,69,69,.07)}'+
  '#ldMain .ldbtn{font-size:17px;padding:12px 18px;border-radius:12px;width:100%;max-width:360px}'+
  '#ldMain .ldbtn.red{background:#c0392b;border-color:#c0392b;color:#fff}#ldMain .ldbtn.green{background:#2e7d5b;border-color:#2e7d5b;color:#fff}'+
  '#ldMain .ldpill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600}'+
  '#ldMain .ldpill.on{background:#d8f0e3;color:#0b5a3c}#ldMain .ldpill.off{background:#fbe3e3;color:#8a1c1c}#ldMain .ldpill.wait{background:#fff3cd;color:#7a5600}'+
  '#ldMain ol.ldsteps{margin:4px 0;padding-inline-start:4px;list-style:none;line-height:1.5}#ldMain ol.ldsteps li{padding:8px 10px;border-inline-start:4px solid #bbb;margin:6px 0;border-radius:6px}#ldMain ol.ldsteps li.done{border-color:#2e9d6a}#ldMain ol.ldsteps li.now{border-color:#e08a00;background:rgba(224,138,0,.08)}#ldMain ol.ldsteps li.bad{border-color:#d64545;background:rgba(214,69,69,.08)}#ldMain .ldst{font-size:13px;font-weight:600}'+
  '#ldMain ul.ldl{margin:4px 0;padding-inline-start:18px;line-height:1.7}#ldMain .ldfiles{direction:ltr;text-align:left;font-size:12px;max-height:180px;overflow:auto;background:var(--bg2,rgba(0,0,0,.05));padding:8px;border-radius:8px}'+
  '#ldMain pre{direction:ltr;text-align:left;white-space:pre-wrap;word-break:break-all;background:var(--bg2,rgba(0,0,0,.05));padding:8px;border-radius:8px;font-size:12px;user-select:all}'+
  '#ldMain label.ldsw{display:flex;gap:10px;align-items:flex-start;margin:8px 0;font-size:15px}#ldMain label.ldsw input{width:auto;margin-top:4px;flex:0 0 auto}#ldMain td{overflow-wrap:anywhere}'+
  '@media (max-width:640px){#ldMain .tw{overflow:visible}#ldMain table,#ldMain tbody,#ldMain tr,#ldMain td{display:block;width:auto}#ldMain thead{display:none}'+
  '#ldMain tr{border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin:8px 0}#ldMain td{border:0;padding:2px 0;text-align:right!important}}';
  document.head.appendChild(st);}

window.boView('lockdown',async function(){const m=$s('#boMain');if(!m)return;clearInterval(poll);poll=null;
  if(!(typeof isAdmin==='function'&&isAdmin())){m.innerHTML='<div class="card">⛔ רק למנהל</div>';return;}
  const owner=typeof isOwner==='function'&&isOwner();
  const [lk,ev,ku,st,lg]=await Promise.all([sb.from('site_lock').select('*').eq('id',1).maybeSingle(),
    sb.from('security_events').select('*').in('kind',Object.keys(KIND)).order('at',{ascending:false}).limit(30),
    sb.from('kicked_users').select('*').order('at',{ascending:false}).limit(50),
    sb.from('staff').select('user_id,role'),
    sb.from('auth_events').select('user_id,email,ip,ua,kind,created_at').in('kind',['login','google_login']).gte('created_at',new Date(Date.now()-48*3600e3).toISOString()).order('created_at',{ascending:false}).limit(300)]);
  if(lk.error||!lk.data){m.innerHTML='<div class="card"><h2>🚧 מצב שיפוצים</h2><p>⚠️ צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית ← שלב 1).</p><p class="muted">'+esc((lk.error&&lk.error.message)||'')+'</p></div>';return;}
  const L=lk.data,closed=!!L.locked,srv=L.server_seen&&Date.now()-new Date(L.server_seen).getTime()<3*60e3,cd=L.check_detail||{};
  let h='<div id="ldMain">';
  /* --- המצב עכשיו --- */
  h+='<div class="card ldstate '+(closed?'closed':'open')+'"><div class="ldbig"><span class="ic" aria-hidden="true">'+(closed?'🚧':'🟢')+'</span><div style="flex:1;min-width:200px">'+
    '<h2>'+(closed?'האתר סגור — מצב שיפוצים':'האתר פתוח')+'</h2>'+
    (closed?'<p style="margin:4px 0">מאז '+when(L.locked_at)+' ('+ago(L.locked_at)+') · '+(L.src==='auto'?'🤖 נסגר אוטומטית':L.src==='server'?'🖥️ נסגר מהשרת':'👤 נסגר מכאן')+'</p>'+(L.reason?'<p class="muted" style="margin:0">'+esc(L.reason)+'</p>':''):'<p class="muted" style="margin:4px 0">כולם יכולים להיכנס ולהשתמש כרגיל.</p>')+
    '</div></div><p style="margin:10px 0 0">'+(srv?'<span class="ldpill on">🖥️ השומר בשרת פעיל</span> <small class="muted">דיווח '+ago(L.server_seen)+'</small>':
      L.server_seen?'<span class="ldpill off">⚠️ השומר בשרת לא מדווח מאז '+ago(L.server_seen)+'</span>':'<span class="ldpill wait">⏳ השומר בשרת עוד לא הותקן</span> <small class="muted">— הסגירה במסד והניתוק עובדים גם בלעדיו</small>')+'</p></div>';
  /* --- 🔌 לנתק את הפורץ (חשבון אחד, בלי לסגור את האתר) --- */
  const kicked=(ku.data||[]).filter(k=>!k.until||new Date(k.until)>new Date());
  const staffIds=new Set((st.data||[]).map(x=>x.user_id));const seen=new Set();
  const logins=(lg.data||[]).filter(e=>e.user_id&&staffIds.has(e.user_id)&&!seen.has(e.user_id+'|'+e.ip+'|'+e.ua)&&seen.add(e.user_id+'|'+e.ip+'|'+e.ua)).slice(0,15);
  const durSel='<select id="ldDur" aria-label="לכמה זמן"><option value="">עד שאשחרר</option><option value="24">ל-24 שעות</option><option value="168">לשבוע</option><option value="0">רק לנתק (יכול להיכנס שוב)</option></select>';
  /* --- 🧭 התהליך צעד אחרי צעד --- */
  const after=L.check_at&&(!L.locked_at||new Date(L.check_at)>=new Date(L.locked_at));
  const stp=[[srv?'done':'wait','👀 שמירה','השומר בשרת בודק כל 30 שניות שהקבצים זהים ל-GitHub, ושכל כניסה של הצוות היא ממכשיר מוכר.',srv?'פעיל':'השומר בשרת לא פעיל עכשיו'],
    [kicked.length?'now':'done','🔌 ניתוק הפורץ','כניסה של איש צוות ממכשיר חדש ← רק החשבון הזה מוקפא עד שתאשר. משתמשים רגילים והבעלים לא מנותקים אוטומטית.',kicked.length?'חשבונות מוקפאים: '+kicked.length+' — לבדוק למטה':'אין חשבונות מוקפאים'],
    [closed?'now':'done','🚧 סגירת האתר','קבצים שהשתנו בלי GitHub (שתי בדיקות ברצף), או תקיפה נוספת תוך שעה מניתוק ← האתר נסגר לכולם.',closed?'האתר סגור':'האתר פתוח'],
    [!closed?'done':L.open_req?'now':after?(L.check_ok?'done':'bad'):'wait','🔍 בדיקה מול GitHub','לפני פתיחה השרת משווה את כל הקבצים. אם משהו שונה — רואים בדיוק מה, ומתקנים.',!closed?'—':L.open_req?'בודק עכשיו…':after?(L.check_ok?'נקי':'נמצאו שינויים — ראה "הבדיקה האחרונה"'):'עוד לא נבדק'],
    [closed?'wait':'done','🟢 פתיחה','רק אחרי בדיקה נקייה האתר נפתח לכולם.',closed?'מחכה לבדיקה':'פתוח']];
  const SI={done:'✅',now:'🔶',bad:'⛔',wait:'⏳'};
  h+='<div class="card"><h2>🧭 התהליך — איפה זה עומד</h2><ol class="ldsteps">'+stp.map(x=>'<li class="'+x[0]+'"><b>'+SI[x[0]]+' '+x[1]+'</b> <span class="ldst">'+esc(x[3])+'</span><br><small class="muted">'+esc(x[2])+'</small></li>').join('')+'</ol>'+
    '<p class="muted" style="font-size:13px;margin:6px 0 0">טעות? חשבון שהוקפא: "✅ זה בסדר — לשחרר". אתר שנסגר: "לפתוח". קובץ בשרת שהוא שלך ותקין:</p><pre>'+esc(CMD)+' baseline</pre></div>';
  h+='<div class="card"><h2>🔌 לנתק את הפורץ — חשבון אחד</h2><p>קודם כל מנתקים רק אותו: כל החיבורים שלו נחתכים מיד, גם מה שכבר פתוח אצלו, והחשבון נחסם לכניסה. האתר ממשיך לעבוד לכל השאר.</p>'+
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><input id="ldKickEm" dir="ltr" placeholder="email@example.com" aria-label="מייל של החשבון" style="max-width:240px">'+durSel+'<button class="btn" id="ldKick" style="background:#c0392b;border-color:#c0392b;color:#fff">🔌 לנתק ולחסום</button></div>'+
    (logins.length?'<p style="margin:12px 0 2px"><b>כניסות של הצוות ב-48 השעות האחרונות:</b></p><div class="tw"><table><thead><tr><th>מתי</th><th>מי</th><th>מאיפה</th><th></th></tr></thead><tbody>'+
      logins.map(e=>'<tr><td style="white-space:nowrap">'+when(e.created_at)+'</td><td dir="ltr">'+esc(e.email)+'</td><td><bdi dir="ltr">'+esc(e.ip||'')+'</bdi><br><small class="muted" dir="ltr">'+esc(String(e.ua||'').slice(0,70))+'</small></td><td><button class="btn sec" data-ldk="'+esc(e.user_id)+'" data-lde="'+esc(e.email)+'">🔌 לנתק</button></td></tr>').join('')+'</tbody></table></div>':'')+
    (kicked.length?'<p style="margin:12px 0 2px"><b>חסומים עכשיו:</b></p><div class="tw"><table><thead><tr><th>מתי</th><th>סיבה</th><th>עד</th><th></th></tr></thead><tbody>'+
      kicked.map(k=>'<tr><td style="white-space:nowrap">'+when(k.at)+(k.auto?' <span class="ldpill wait">אוטומטי</span>':'')+'</td><td>'+esc(k.reason||'')+'</td><td>'+(k.until?when(k.until):'עד שחרור')+'</td><td><button class="btn sec" data-ldu="'+esc(k.user_id)+'">✅ זה בסדר — לשחרר</button></td></tr>').join('')+'</tbody></table></div>':'')+
    '<p class="muted" style="font-size:13px">אם אחרי הניתוק התקיפה ממשיכה (עוד חשבון, שינוי הרשאות, שינוי בשרת או בקבצים) — האתר כולו נסגר אוטומטית. את חשבון הבעלים לא מנתקים כאן: לזה הכפתור של מצב שיפוצים.</p></div>';
  /* --- כפתורים --- */
  if(!owner)h+='<div class="card"><p>🔒 רק הבעלים (עם אימות דו-שלבי) יכול לסגור ולפתוח את האתר.</p></div>';
  else if(!closed){
    h+='<div class="card"><h2>🚨 לסגור את האתר עכשיו</h2><p>לוחצים כשיש חשד לפריצה, או לפני עבודה גדולה. מה קורה מיד:</p><ul class="ldl">'+
      '<li>כל מי שנכנס לאתר או לאפליקציה רואה <b>"האתר בשיפוצים, נתראה בקרוב"</b>.</li><li><b>כל המחוברים מנותקים</b> (חוץ ממך במכשיר הזה). גם חשבון או סיסמה שנגנבו לא יעבדו.</li>'+
      '<li>הנתונים של כולם נשמרים — שום דבר לא נמחק.</li><li>אתה מקבל התראה לטלפון, וגם שאר המנהלים.</li></ul>'+
      '<label for="ldWhy" style="display:block;margin:10px 0 4px">סיבה (רק לך, לא מוצג למשתמשים)</label><input id="ldWhy" maxlength="300" placeholder="למשל: חשד שמישהו נכנס לחשבון">'+
      '<p style="margin:12px 0 0"><button class="btn ldbtn red" id="ldClose">🚧 לסגור את האתר לכולם</button></p></div>';
  }else{
    const pend=!!L.open_req;
    h+='<div class="card"><h2>🔍 לפתוח את האתר מחדש</h2><p>לפני שפותחים: השרת משווה את <b>כל</b> הקבצים של האתר ושל השרת לקוד ב-GitHub. רק אם הכל זהה — האתר נפתח. אם משהו שונה, האתר נשאר סגור ותראה כאן בדיוק מה.</p>'+
      (pend?'<p><span class="ldpill wait">⏳ השרת בודק עכשיו…</span> <small class="muted">(עד חצי דקה)</small></p>':'<p><button class="btn ldbtn green" id="ldOpen">🔍 לבדוק ולפתוח</button></p>')+
      '<p style="margin-top:14px"><button class="btn sec" id="ldForce">⚠️ לפתוח מיד, בלי בדיקה</button></p><p class="muted" style="font-size:13px">רק אם השומר בשרת לא מותקן או לא עונה, ואתה בטוח שהכל תקין.</p></div>';
  }
  /* --- תוצאת הבדיקה האחרונה --- */
  if(L.check_at){
    const ok=L.check_ok===true;
    h+='<div class="card"><h2>'+(ok?'✅':'⛔')+' הבדיקה האחרונה <small class="muted">'+when(L.check_at)+'</small></h2>'+
      (ok?'<p>כל הקבצים בשרת זהים ל-GitHub.</p>':'<p>נמצאו דברים ששונים מ-GitHub — לכן האתר לא נפתח:</p><ul class="ldl">'+(cd.problems||[]).map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>')+
      ((cd.files||[]).length?'<p style="margin:8px 0 2px">הקבצים:</p><div class="ldfiles">'+cd.files.map(f=>esc(f)).join('<br>')+'</div>':'')+
      ((cd.commits||[]).length?'<p style="margin:10px 0 2px">📝 מה נכנס ל-GitHub מאז הסגירה — כדאי לעבור על זה (או לבקש מ-Claude לבדוק) לפני הפתיחה:</p><div class="ldfiles">'+cd.commits.map(c=>esc(c)).join('<br>')+'</div>':'')+
      (!ok?'<p class="muted" style="font-size:13px">אם כל השינויים מוכרים לך (למשל עדכון שעשית בשרת בעצמך), אפשר לשמור את המצב בשרת כתקין:</p><pre>'+esc(CMD)+' baseline</pre>':'')+'</div>';
  }
  /* --- הגדרות --- */
  if(owner)h+='<div class="card"><h2>⚙️ סגירה אוטומטית</h2>'+
    '<label class="ldsw"><input type="checkbox" id="ldAutoT"'+(L.auto_tamper!==false?' checked':'')+'><span><b>כשקבצים בשרת משתנים בלי לעבור דרך GitHub</b> — סימן ברור לפריצה. מומלץ להשאיר דלוק.</span></label>'+
    '<label class="ldsw"><input type="checkbox" id="ldAutoK"'+(L.auto_kick_staff!==false?' checked':'')+'><span><b>איש צוות או מנהל שנכנס ממכשיר חדש — לנתק אותו מיד ולהקפיא את החשבון עד שתאשר</b>. אם זה באמת הוא, לוחצים כאן "זה בסדר — לשחרר".</span></label>'+
    '<label class="ldsw"><input type="checkbox" id="ldAutoE"'+(L.auto_escalate!==false?' checked':'')+'><span><b>אם אחרי ניתוק מגיעה עוד תקיפה תוך שעה — לסגור את כל האתר</b>.</span></label>'+
    '<label class="ldsw"><input type="checkbox" id="ldAutoD"'+(L.auto_new_device?' checked':'')+'><span><b>כשמנהל נכנס ממכשיר חדש</b> — זהירות: גם כשאתה עצמך מחליף טלפון, האתר ייסגר (ואז נכנסים שוב ופותחים). כבוי כברירת מחדל — ההתראה לטלפון נשלחת בכל מקרה.</span></label>'+
    '<p class="muted" style="font-size:13px">בכל מקרה מקבלים התראה מיידית על: קבצים שהשתנו, שינוי בהרשאות צוות או "בעלים", שינוי במפתחות הכניסה לשרת / משתמשים / משימות מתוזמנות, כניסה של מנהל ממכשיר חדש, והרבה ניסיונות סיסמה שנכשלו.</p></div>';
  /* --- התקנה בשרת וקישור מעקף --- */
  h+='<div class="card"><h2>🖥️ בשרת (Oracle Cloud Shell)</h2>'+(srv?'':'<p><b>התקנה (פעם אחת):</b></p><pre>sudo bash /opt/yamshopping/repo/collector/bin/lockdown-install.sh</pre><p class="muted" style="font-size:13px">הסקריפט לא נוגע ב-Caddyfile. בסוף הוא מדפיס שורה אחת להוסיף שם בעצמך, ואז מריצים אותו שוב והוא בודק שהכל עובד.</p>')+
    '<p style="margin:8px 0 2px">🔑 <b>לראות את האתר כשהוא סגור</b> (קישור סודי, רק לך):</p><pre>'+esc(CMD)+' pass</pre>'+
    '<p style="margin:8px 0 2px">סגירה / בדיקה / פתיחה ישר מהשרת (גם אם הבק אופיס לא נפתח):</p><pre>'+esc(CMD)+' on\n'+esc(CMD)+' check\n'+esc(CMD)+' off</pre></div>';
  /* --- יומן --- */
  const evs=ev.data||[];
  h+='<div class="card"><h2>📜 מה קרה</h2>'+(evs.length?'<div class="tw" tabindex="0" role="region" aria-label="יומן"><table><thead><tr><th>מתי</th><th>מה</th><th>פרטים</th></tr></thead><tbody>'+
    evs.map(e=>{const k=KIND[e.kind]||['🛡️',e.kind],d=e.detail||{};const t=d.reason||d.why||d.what||(e.kind==='unlock'?(d.force?'בלי בדיקה':'אחרי בדיקה'):'');
      return '<tr><td style="white-space:nowrap">'+when(e.at)+'</td><td>'+k[0]+' '+esc(k[1])+'</td><td>'+esc(t)+(e.kind==='lock'&&e.n?' · '+e.n+' נותקו':'')+(d.note?'<br><small class="muted">'+esc(d.note)+'</small>':'')+'</td></tr>';}).join('')+
    '</tbody></table></div>':'<p class="muted">✅ שקט. לא היה כלום.</p>')+'</div>';
  h+='</div>';m.innerHTML=h;
  const again=()=>{const b=$s('#boNav [data-s="lockdown"]');if(b)b.click();};
  const cl=$s('#ldClose');if(cl)cl.onclick=async()=>{
    if(!(await uiConfirm('לסגור את האתר לכולם עכשיו? כל המחוברים ינותקו, וכולם יראו "האתר בשיפוצים".')))return;
    cl.disabled=true;const {data,error}=await sb.rpc('site_lock_close',{p_reason:($s('#ldWhy').value||'').trim()});
    if(error){flash('⚠️ '+error.message);cl.disabled=false;return;}flash('🚧 האתר נסגר · '+(data|0)+' חיבורים נותקו');again();};
  const op=$s('#ldOpen');if(op)op.onclick=async()=>{op.disabled=true;const {data,error}=await sb.rpc('site_lock_open',{p_force:false});
    if(error){flash('⚠️ '+error.message);op.disabled=false;return;}
    if(data==='open'){flash('✅ האתר פתוח');again();return;}
    if(data==='no_server')flash('⚠️ השומר בשרת לא עונה — הבדיקה תרוץ כשהוא יחזור. אפשר גם "לפתוח מיד"');else flash('🔍 השרת בודק…');again();};
  const fo=$s('#ldForce');if(fo)fo.onclick=async()=>{
    if(!(await uiConfirm('לפתוח את האתר בלי לבדוק את הקבצים בשרת? אם הייתה פריצה ונשאר קוד זדוני — המשתמשים יקבלו אותו.')))return;
    const {error}=await sb.rpc('site_lock_open',{p_force:true});if(error){flash('⚠️ '+error.message);return;}flash('✅ האתר נפתח');again();};
  const sv=()=>sb.rpc('site_lock_settings',{p_auto_tamper:$s('#ldAutoT').checked,p_auto_new_device:$s('#ldAutoD').checked,p_auto_kick_staff:$s('#ldAutoK').checked,p_auto_escalate:$s('#ldAutoE').checked}).then(({error})=>flash(error?'⚠️ '+error.message:'💾 נשמר'));
  if($s('#ldAutoT'))['#ldAutoT','#ldAutoD','#ldAutoK','#ldAutoE'].forEach(x=>$s(x).onchange=sv);
  const KERR={no_user:'לא נמצא חשבון כזה',not_self:'אי אפשר לנתק את עצמך',owner_use_lockdown:'את חשבון הבעלים לא מנתקים כאן — במקרה כזה סוגרים את האתר (מצב שיפוצים)'};
  const kick=async(uid,em)=>{const d=$s('#ldDur').value;if(!(await uiConfirm('לנתק עכשיו את '+(em||'החשבון')+'? כל החיבורים שלו ייחתכו מיד'+(d==='0'?'.':' והוא לא יוכל להיכנס.'))))return;
    const {data,error}=await sb.rpc('security_kick',{p_user:uid||null,p_email:uid?null:em,p_hours:d===''?null:+d,p_reason:'נותק ידנית מהבק אופיס'});
    if(error){const k=Object.keys(KERR).find(x=>error.message.includes(x));flash('⚠️ '+(k?KERR[k]:error.message));return;}flash('🔌 נותק · '+(data|0)+' חיבורים נחתכו');again();};
  $s('#ldKick').onclick=()=>{const em=($s('#ldKickEm').value||'').trim();if(!/^\S+@\S+$/.test(em)){flash('⚠️ צריך מייל');return;}kick(null,em);};
  m.querySelectorAll('[data-ldk]').forEach(b=>b.onclick=()=>kick(b.dataset.ldk,b.dataset.lde));
  m.querySelectorAll('[data-ldu]').forEach(b=>b.onclick=async()=>{const {error}=await sb.rpc('security_unkick',{p_user:b.dataset.ldu});if(error){flash('⚠️ '+error.message);return;}flash('✅ שוחרר — יכול להיכנס שוב');again();});
  /* מחכים לתוצאת הבדיקה בשרת */
  if(closed&&L.open_req){let n=0;poll=setInterval(async()=>{if(!document.getElementById('ldMain')||++n>40){clearInterval(poll);return;}
    const {data}=await sb.from('site_lock').select('locked,open_req').eq('id',1).maybeSingle();if(data&&!data.open_req){clearInterval(poll);flash(data.locked?'⛔ נמצאו שינויים — האתר נשאר סגור':'✅ הכל תקין — האתר נפתח');again();}},5000);}
});

/* בלוח הראשי: כשהאתר סגור — שורה אדומה בראש, עם קישור */
window.boAfter&&window.boAfter('dash',async main=>{if(!main||main.querySelector('#ldDash')||!(typeof isAdmin==='function'&&isAdmin()))return;
  const {data}=await sb.from('site_lock').select('locked,locked_at,src').eq('id',1).maybeSingle();if(!data||!data.locked)return;
  main.insertAdjacentHTML('afterbegin','<div class="card" id="ldDash" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-color:#d64545;background:rgba(214,69,69,.07)"><b>🚧</b><span style="flex:1">האתר סגור (מצב שיפוצים) מאז '+esc(when(data.locked_at))+(data.src==='auto'?' · נסגר אוטומטית':'')+'</span><button class="btn" id="ldDashGo">לפרטים ולפתיחה</button></div>');
  main.querySelector('#ldDashGo').onclick=()=>{const b=$s('#boNav [data-s="lockdown"]');if(b)b.click();};});
})();
