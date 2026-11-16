
/* ================= 📧 מייל שבועי — בק אופיס + מתג למשתמש ================= */
(function(){
const $m=s=>document.querySelector(s);
const escM=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtM=d=>d?new Date(d).toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'}):'';
const IMG_RE_M=/^https:\/\/ygyfodxfbebnkwdcbjrp\.supabase\.co\/storage\/v1\/object\/public\/mail\/[A-Za-z0-9._-]{1,120}$/;
const DAYS_M=['ראשון','שני','שלישי','רביעי','חמישי','שישי','מוצאי שבת'];
const ST_M={draft:'📝 טיוטה',scheduled:'⏰ מתוזמן',sending:'📤 בשליחה',paused:'⏸ מושהה',done:'✅ הסתיים',canceled:'✖ בוטל'};
const HOW_M={link:'קישור במייל','one-click':'כפתור "ביטול מנוי" בתוכנת המייל',site:'מתג באתר',spam:'דיווח ספאם'};
const WHY_M={too_many:'יותר מדי מיילים',not_relevant:'לא רלוונטי',not_using:'לא משתמש באתר',other:'אחר'};
const MAX_ITEMS=6;
const WIN_M={shabbat:'שבת',yomtov:'יום טוב',erev:'ערב שבת',erevyt:'ערב חג',early:'לפני שעת ההתחלה של השליחה האוטומטית — לחיצה על "להתחיל לשלוח" שולחת מיד, מ-08:00',late:'אחרי שעת הסיום'};
const noteM=n=>{const w=/^window: (\w+)/.exec(n);if(w)return '⏸️ עכשיו לא שולחים ('+(WIN_M[w[1]]||w[1])+')';return {'nothing to send':'אין מייל בשליחה','cap reached':'הגעת למכסה היומית','started':'התחיל','draft':'נוצרה טיוטה','no RESEND_API_KEY':'Resend לא מחובר','waiting: weekly gap':'כל מי שנשאר קיבל מייל אחר ב-6 הימים האחרונים — מחכים','campaign done':'המייל הגיע לכולם'}[n]||n;};
async function fnM(body){let {data,error}=await sb.functions.invoke('email',{body});
  if(error&&error.context&&typeof error.context.json==='function'){try{data=await error.context.json();}catch(e){}}
  return {data:data||{},error:error&&!(data&&data.ok)?(data&&data.error)||error.message:null};}

/* ---------- למשתמש: ⚙️ תפריט ← 📧 מייל שבועי ---------- */
async function openMailPref(){
  if(!sb||!authUser){flash(T('🙂 צריך להיות מחוברים','🙂 Please sign in'));return;}
  const {data:on,error}=await sb.rpc('email_weekly_get');if(error){flash('⚠️ '+error.message);return;}
  if(on){if(await uiConfirm(T('📧 המייל השבועי פעיל.\nפעם בשבוע לכל היותר: מה חדש באתר ובאפליקציה.\n\nלהפסיק לקבל אותו?','📧 The weekly email is on (at most once a week).\n\nStop receiving it?'))){
      const r=await sb.rpc('email_weekly_set',{p_on:false});flash(r.error?'⚠️ '+r.error.message:T('✔️ המייל השבועי כובה','✔️ Weekly email turned off'));}}
  else if(await uiConfirm(T('📧 המייל השבועי כבוי אצלך.\n\nלהפעיל אותו? (פעם בשבוע לכל היותר)','📧 The weekly email is off.\n\nTurn it on? (at most once a week)'))){
    const r=await sb.rpc('email_weekly_set',{p_on:true});flash(r.error?'⚠️ '+r.error.message:T('💚 המייל השבועי הופעל','💚 Weekly email turned on'));}
}
try{if(typeof add26==='function')add26('miMail','📧','מייל שבועי','Weekly email','miNotif',openMailPref);}catch(e){console.warn('mail pref',e);}
try{if(typeof yamiStep==='function')yamiStep(async raw=>{if(sb&&authUser&&/^(מייל שבועי|להסיר מייל|הסרה מהמייל|בלי מיילים)\??$/.test(String(raw||'').trim())){openMailPref();return true;}return false;});}catch(e){}

/* ---------- בק אופיס ← 📧 מייל שבועי ---------- */
try{const nav=$m('#boNav');if(nav&&!nav.querySelector('[data-s="mail"]')){const b=document.createElement('button');b.dataset.s='mail';b.textContent='📧 מייל שבועי';
  const ref=nav.querySelector('[data-s="updates"]');if(ref)ref.after(b);else nav.appendChild(b);}}catch(e){}

let edM=null;      // המייל שבעריכה (או null = רשימת המיילים)
let subM='list';   // list | edit | rcpt | unsubs
let campsM=[],statsM={}; // המיילים והסטטיסטיקה — בשביל "להמשיך מאיפה שנעצר" בעריכה
let rcptM=null,rcptFilter='all',dayM=null;
// יום בשעון ישראל (00:00–00:00) כ-YYYY-MM-DD
const ilDayM=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(d?new Date(d):new Date());
const dayLabelM=ymd=>{const d=new Date(ymd+'T12:00:00Z');const today=ilDayM(),yest=ilDayM(Date.now()-864e5);
  return (ymd===today?'<b>היום</b> · ':ymd===yest?'אתמול · ':'')+'יום '+['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][d.getUTCDay()]+' '+d.getUTCDate()+'/'+(d.getUTCMonth()+1);};
const hmM=d=>d?new Date(d).toLocaleTimeString('he-IL',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit'}):'';
const pct=(a,b)=>b?' ('+Math.round(a*100/b)+'%)':'';

/* מקטין צילום מסך לפני ההעלאה (עד 1200 פיקסלים רוחב) */
function shrinkM(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const img=new Image();
  img.onload=()=>{const max=1200;let w=img.naturalWidth,h=img.naturalHeight;if(w>max){h=Math.round(h*max/w);w=max;}
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
    let q=0.86;const go=()=>c.toBlob(b=>{if(!b)return rej(new Error('bad image'));if(b.size>1500000&&q>0.45){q-=0.1;go();}else res(b);},'image/jpeg',q);go();};
  img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('bad image'));};img.src=url;});}

async function viewMail(){
  const m=$m('#boMain');if(!m)return;
  if(subM==='edit'&&edM)return drawEditor(m);
  if(subM==='rcpt'&&rcptM)return drawRecipients(m);
  if(subM==='unsubs')return drawUnsubs(m);
  if(subM==='day'&&dayM)return drawDay(m);
  const [st,camps,stats,aud,state,cfgRow,daily]=await Promise.all([fnM({status:true}),sb.from('email_campaigns').select('*').order('created_at',{ascending:false}).limit(60),
    sb.rpc('email_campaign_stats'),sb.rpc('email_audience'),sb.from('email_state').select('*').eq('id',1).maybeSingle(),sb.from('site_config').select('value').eq('key','email').maybeSingle(),sb.rpc('email_daily',{p_days:14})]);
  const s=st.data||{};const cfg=Object.assign({auto:false,day_cap:70,month_cap:2200,hour:10,minute:0,end_hour:23,draft_day:4,send_day:0,skip_empty:true,order:'fair'},(cfgRow.data&&cfgRow.data.value)||{});
  const A=aud.data||{};const cnt=A.counts||s.counts||{};const S={};(stats.data||[]).forEach(x=>S[x.campaign_id]=x);const es=state.data||{};
  const reach=Math.max(0,(A.confirmed||0)-(A.unsub||0)-(A.bounced||0));
  const per=Math.max(1,Math.min(+cfg.day_cap||70,100));
  const daysToAll=Math.ceil(reach/per);
  const setup=!s.key?'<div class="card" style="border-color:#e0a100"><h2>🔌 חיבור Resend (פעם אחת)</h2><ol style="padding-inline-start:20px;line-height:1.9;font-size:14px">'+
    '<li>נרשמים ב-<a href="https://resend.com/signup" target="_blank" rel="noopener">resend.com</a> (חינם).</li>'+
    '<li>Domains ← Add Domain ← <b>yamshopping.com</b> ← מעתיקים את רשומות ה-DNS שמופיעות שם להגדרות הדומיין, ולוחצים Verify.</li>'+
    '<li>API Keys ← Create API Key (הרשאה: Sending access) ← מעתיקים.</li>'+
    '<li>Supabase ← Edge Functions ← Secrets ← מוסיפים <code>RESEND_API_KEY</code> עם המפתח.</li>'+
    '<li>(מומלץ) Resend ← Webhooks ← Add Endpoint: <code dir="ltr">https://ygyfodxfbebnkwdcbjrp.supabase.co/functions/v1/email?hook=resend</code> · אירועים: delivered, bounced, complained · מעתיקים את ה-Signing secret ל-Supabase בשם <code>RESEND_WEBHOOK_SECRET</code>.</li>'+
    '<li>חוזרים לכאן ושולחים מייל ניסיון 🧪.</li></ol>'+(st.error?'<p class="err">⚠️ פונקציית השרת email לא עונה ('+escM(st.error)+') — צריך להעלות אותה ולהריץ את קוד ה-SQL.</p>':'')+'</div>':'';
  const camp=(camps.data||[]);campsM=camp;statsM=S;
  const curC=camp.find(c=>c.status==='sending');
  const [lft,cron]=await Promise.all([curC?sb.rpc('email_left',{p_campaign:curC.id}):Promise.resolve({data:null}),sb.rpc('email_cron_info')]);
  m.innerHTML=setup+
   '<div class="stats">'+
     [[reach,'יקבלו את המייל'],[(cnt.today||0)+' / '+per,'נשלחו היום'],[(cnt.month||0)+' / '+(cfg.month_cap||2200),'נשלחו ב-30 יום'],[A.unsub||0,'הסירו את עצמם'],[(A.bounced||0)+(A.complained||0),'חזרו / דיווחו ספאם']]
     .map(([n,l],i)=>'<div class="stat"'+(i>=3?' style="cursor:pointer" data-unsubs="1"':'')+'><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('')+'</div>'+
   dayCardM(daily,camp,S,cnt,per,reach,s,es,cfg,lft.data,cron)+'<div class="card" style="margin-top:14px"><h2>📧 מייל שבועי</h2><p class="muted">כל משתמש מקבל לכל היותר מייל אחד בשבוע. עד '+per+' מיילים ביום (המכסה החינמית של Resend היא 100 ביום ו-3,000 בחודש, והיא משותפת עם מיילי ההרשמה, האימות ושחזור הקוד — לכן משאירים להם מקום), ולכן מייל אחד מגיע לכולם בערך תוך '+daysToAll+' ימי שליחה. מי מקבל קודם — לפי מה שבוחרים למטה. לא שולחים בשבת וביום טוב (במוצאי שבת וחג — מ-72 דקות אחרי השקיעה), רק בין השעות שקובעים למטה (עד 23:00 לכל המאוחר), ובשישי ובערב חג רק עד שעה וחצי לפני השקיעה.</p>'+
     '<p class="muted">Resend: '+(s.key?'✅ מחובר':'❌ לא מחובר')+' · דיווחי "חזר" ו"ספאם": '+(s.webhook?'✅':'➖ לא מוגדר')+(s.window?' · עכשיו לא שולחים ('+(WIN_M[s.window]||s.window)+')':' · עכשיו זמן שליחה')+
     (es.last_run?' · ריצה אחרונה: '+fmtM(es.last_run)+(es.last_note?' ('+escM(String(es.last_note).split(' · ').map(noteM).join(' · '))+')':''):'')+'</p>'+(es.last_error?'<p class="err">⚠️ שגיאה אחרונה: '+escM(es.last_error)+'</p>':'')+
     '<div class="row" style="gap:8px;margin-top:8px"><button class="btn" data-new="blank">✏️ מייל חדש</button><button class="btn sec" data-new="news">📝 מייל חדש מ"מה חדש" של השבוע</button><button class="btn sec" data-unsubs="1">🙋 מי הסיר את עצמו</button><button class="btn sec" data-run="1">🔄 להריץ עכשיו</button></div></div>'+
   '<div class="card"><h2>🤖 שליחה אוטומטית</h2>'+
     '<label class="check"><input type="checkbox" id="mAuto"'+(cfg.auto?' checked':'')+'> כל שבוע: טיוטה אוטומטית מ"מה חדש", ואם לא שיניתי — היא נשלחת לבד</label>'+
     '<div class="row"><div><label for="mDraftDay">הטיוטה מוכנה ביום</label><select id="mDraftDay">'+DAYS_M.slice(0,5).map((d,i)=>'<option value="'+i+'"'+(+cfg.draft_day===i?' selected':'')+'>'+d+'</option>').join('')+'</select></div>'+
     '<div><label for="mSendDay">והשליחה מתחילה ביום</label><select id="mSendDay">'+DAYS_M.map((d,i)=>'<option value="'+i+'"'+(+cfg.send_day===i?' selected':'')+'>'+d+'</option>').join('')+'</select></div>'+
     '<div><label for="mHour">שולחים כל יום בשעה</label><input id="mHour" type="time" step="300" min="08:00" max="21:55" value="'+String(+cfg.hour||10).padStart(2,'0')+':'+String(+cfg.minute||0).padStart(2,'0')+'"></div>'+
     '<div><label for="mEnd">עד שעה</label><select id="mEnd">'+[12,13,14,15,16,17,18,19,20,21,22,23].map(h=>'<option value="'+h+'"'+((+cfg.end_hour||23)===h?' selected':'')+'>'+h+':00</option>').join('')+'</select></div>'+
     '<div><label for="mCap">כמה ביום (מומלץ 70: נשאר מקום למיילי הכניסה)</label><input id="mCap" type="number" min="1" max="5000" value="'+(+cfg.day_cap||70)+'"></div></div>'+
     '<label for="mOrder">מי מקבל קודם (כשאי אפשר לשלוח לכולם באותו יום). בסדר "לפי הסדר" עוברים ברשימה בדיוק לפי הסדר, יום אחרי יום, בלי לדלג — מי שקיבל מייל אחר בשבוע האחרון פשוט עוצר את התור עד שיעבור השבוע שלו.</label><select id="mOrder">'+[['fair','בתורות: מי שלא קיבל מייל הכי הרבה זמן'],['inactive','לפי הסדר: מהכי פחות פעיל באתר ועד הכי פעיל'],['active','לפי הסדר: מהכי פעיל ועד הכי פחות פעיל'],['new','לפי הסדר: מהנרשמים החדשים ועד הוותיקים']].map(([v,l])=>'<option value="'+v+'"'+(cfg.order===v?' selected':'')+'>'+l+'</option>').join('')+'</select>'+
     '<label class="check"><input type="checkbox" id="mSkip"'+(cfg.skip_empty!==false?' checked':'')+'> שבוע בלי חידושים ב"מה חדש" — לא לשלוח (אחרת נשלחת תזכורת קצרה)</label>'+
     '<p class="muted">כשהטיוטה מוכנה מגיעה אליך התראה. אפשר לערוך אותה, להוסיף צילומי מסך, לשלוח ניסיון או לבטל — עד שעת השליחה.</p><button class="btn" id="mSaveCfg">💾 שמירה</button></div>'+
   '<div class="card"><h2>📬 המיילים</h2>'+(camp.length?camp.map(c=>{const x=S[c.id]||{};const sent=+x.sent||0;
     return '<div class="item" data-id="'+c.id+'"><b>'+escM(c.subject||'(בלי נושא)')+'</b> <span class="pill">'+(ST_M[c.status]||c.status)+'</span>'+(c.auto?' <span class="pill">🤖 אוטומטי</span>':'')+
       '<div class="muted">'+(c.status==='scheduled'&&c.send_at?'⏰ יישלח: '+fmtM(c.send_at)+' · ':'')+(c.started_at?'התחיל: '+fmtM(c.started_at)+' · ':'')+(c.finished_at?'הסתיים: '+fmtM(c.finished_at)+' · ':'')+'נוצר: '+fmtM(c.created_at)+(c.note?' · '+escM(c.note):'')+'</div>'+
       (c.continues?'<div class="muted">🔁 ממשיך מאיפה שנעצר: '+escM((camp.find(k=>k.id===c.continues)||{}).subject||'מייל קודם')+' — מי שכבר קיבל אותו לא יקבל את זה</div>':'')+
       (c.status==='paused'?'<div class="muted">⏸ מושהה. אפשר ✏️ לערוך אותו ואז ▶ להמשיך מאותו מקום, או 🔁 ליצור מייל חדש שממשיך מאיפה שזה נעצר.</div>':'')+
       (sent||x.tests?'<div style="font-size:14px;margin:4px 0">📤 נשלחו <b>'+sent+'</b>'+(+x.delivered?' · 📬 נמסרו '+x.delivered:'')+' · 👀 נפתחו <b>'+(+x.opened||0)+'</b>'+pct(+x.opened||0,sent)+' · 🖱️ לחצו '+(+x.clicked||0)+pct(+x.clicked||0,sent)+' · 👍 אהבו '+(+x.liked||0)+' · 🙋 הסירו '+(+x.unsub||0)+' · 🚫 ספאם '+(+x.complained||0)+' · ↩️ חזרו '+(+x.bounced||0)+(+x.failed?' · ⚠️ נכשלו '+x.failed:'')+(+x.tests?' · 🧪 ניסיון '+x.tests:'')+'</div>':'')+
       '<div class="row" style="gap:6px;margin-top:6px">'+
       (['draft','scheduled','paused'].includes(c.status)?'<button class="btn sm" data-act="edit">✏️ עריכה</button>':'')+
       '<button class="btn sm sec" data-act="preview">👀 תצוגה</button><button class="btn sm sec" data-act="test">🧪 ניסיון אליי</button>'+
       (['draft','scheduled'].includes(c.status)?'<button class="btn sm" data-act="now">📤 להתחיל לשלוח</button>':'')+
       (c.status==='sending'?'<button class="btn sm sec" data-act="pause">⏸ השהיה</button>':'')+
       (c.status==='paused'?'<button class="btn sm" data-act="resume">▶ המשך שליחה</button>':'')+
       (['scheduled','sending','paused'].includes(c.status)?'<button class="btn sm sec" data-act="cancel">✖ עצירה</button>':'')+
       (sent||x.tests?'<button class="btn sm sec" data-act="rcpt">👥 נמענים</button>':'')+
       (contOk(c,x)?'<button class="btn sm sec" data-act="cont" title="מייל חדש שיישלח רק למי שעוד לא קיבל את המייל הזה, מאותו מקום בתור">🔁 מייל חדש שממשיך מכאן</button>':'')+
       '<button class="btn sm sec" data-act="copy">📄 שכפול</button>'+
       (!sent?'<button class="btn sm bad" data-act="del">🗑️</button>':'')+'</div></div>';}).join(''):'<p class="muted">עוד אין מיילים. לחצו "✏️ מייל חדש" או "📝 מייל חדש מ"מה חדש"".</p>')+'</div>'+
   '<div id="mPrev"></div>';
  clearInterval(window.__mailCd);const tick=()=>{const els=m.querySelectorAll('[data-cd]');if(!els.length||!m.isConnected){clearInterval(window.__mailCd);return;}
    els.forEach(el=>{const ms=new Date(el.dataset.cd)-Date.now();if(ms<=0){el.textContent='(רץ עכשיו…)';if(ms<-90000&&subM==='list'){clearInterval(window.__mailCd);viewMail();}return;}const h=Math.floor(ms/36e5),mi=Math.floor(ms%36e5/6e4),se=Math.floor(ms%6e4/1e3);
      el.textContent='(בעוד '+(h?h+':'+String(mi).padStart(2,'0'):mi)+':'+String(se).padStart(2,'0')+(h?' שעות':' דקות')+')';});};tick();window.__mailCd=setInterval(tick,1000);
  m.onclick=async e=>{const g=e.target.closest('[data-gocfg]');if(g){e.preventDefault();const x=$m('#mHour');if(x){x.scrollIntoView({block:'center'});x.focus();}return;}
    const b=e.target.closest('button,[data-unsubs],[data-day]');if(!b)return;
    if(b.dataset.unsubs){subM='unsubs';viewMail();return;}
    if(b.dataset.reload){viewMail();return;}
    if(b.dataset.day){dayM=b.dataset.day;rcptFilter='all';subM='day';viewMail();return;}
    if(b.dataset.run){b.disabled=true;const r=await fnM({run:true});b.disabled=false;flash(r.error?'⚠️ '+r.error:'🔄 נשלחו '+(r.data.sent||0)+(r.data.notes&&r.data.notes.length?' · '+r.data.notes.map(noteM).join(' · '):''));viewMail();return;}
    if(b.dataset.new){let d={subject:'',preheader:'',intro:'',items:[{title:'',text:'',image:'',link:''}],outro:'תודה שבחרת ברשימת קניות. נשמח לשמוע ממך: אפשר להשיב ישירות למייל זה.',cta:'לכניסה לאתר',status:'draft'};
      if(b.dataset.new==='news'){b.disabled=true;const r=await fnM({draft:true});b.disabled=false;if(r.error){flash('⚠️ '+r.error);return;}d=Object.assign(d,r.data.draft||{});if(!(d.items||[]).length)flash('ℹ️ לא היו עדכונים ב"מה חדש" בשבוע האחרון — זו טיוטת תזכורת');}
      edM=d;subM='edit';viewMail();return;}
    if(b.id==='mSaveCfg'){const v={auto:$m('#mAuto').checked,draft_day:+$m('#mDraftDay').value,send_day:+$m('#mSendDay').value,...(()=>{const [h,mi]=String($m('#mHour').value||'10:00').split(':').map(Number);const hh=Math.max(8,Math.min(21,h||10));return {hour:hh,minute:Math.floor((mi||0)/5)*5,end_hour:Math.max(hh+1,+$m('#mEnd').value||23)};})(),day_cap:Math.max(1,Math.min(5000,+$m('#mCap').value||70)),skip_empty:$m('#mSkip').checked,order:$m('#mOrder').value,month_cap:cfg.month_cap||2200};
      if(v.day_cap>80&&v.day_cap<=100&&!(await uiConfirm('⚠️ מיילי ההרשמה, האימות ושחזור הקוד יוצאים מאותו חשבון Resend ונספרים באותה מכסה של 100 ביום. אם המייל השבועי ינצל כמעט הכל, משתמשים חדשים עלולים לא לקבל מייל אימות. להמשיך?')))return;
      if(v.day_cap>100&&!(await uiConfirm('יותר מ-100 ביום עובר את המכסה החינמית של Resend (צריך מנוי בתשלום). להמשיך?')))return;
      const {error}=await sb.from('site_config').upsert({key:'email',value:v,updated_at:new Date().toISOString()});flash(error?'⚠️ '+error.message:'💾 נשמר');viewMail();return;}
    const it=b.closest('[data-id]');if(!it||!b.dataset.act)return;const id=it.dataset.id;const c=camp.find(x=>x.id===id);if(!c)return;const a=b.dataset.act;
    if(a==='edit'){edM=JSON.parse(JSON.stringify(c));subM='edit';viewMail();return;}
    if(a==='cont'){edM={subject:c.subject,preheader:c.preheader,intro:c.intro,items:JSON.parse(JSON.stringify(c.items||[])),outro:c.outro,cta:c.cta,status:'draft',continues:id};subM='edit';viewMail();
      flash('🔁 מייל חדש שממשיך מאיפה ש"'+(c.subject||'')+'" נעצר — אפשר להחליף את כל התוכן');return;}
    if(a==='copy'){edM={subject:c.subject,preheader:c.preheader,intro:c.intro,items:JSON.parse(JSON.stringify(c.items||[])),outro:c.outro,cta:c.cta,status:'draft'};subM='edit';viewMail();return;}
    if(a==='preview'){await showPreview(id);return;}
    if(a==='test'){await sendTest(id,b);return;}
    if(a==='rcpt'){rcptM=c;rcptFilter='all';subM='rcpt';viewMail();return;}
    if(a==='now'){const par=c.continues&&camp.find(k=>k.id===c.continues);
      if(!(await uiConfirm('להתחיל לשלוח את "'+(c.subject||'')+'"?\n\n'+(c.continues?'🔁 ממשיך מאיפה ש"'+((par&&par.subject)||'המייל הקודם')+'" נעצר: יישלח רק למי שעוד לא קיבל אותו, מאותו מקום בתור, עד '+per+' מיילים ביום. המייל הקודם ייעצר.':'יישלחו עד '+per+' מיילים ביום, עד שכולם יקבלו (בערך '+daysToAll+' ימי שליחה). אם יש מייל אחר בשליחה — הוא ייעצר.'))))return;
      if(!(await okM(sb.from('email_campaigns').update({status:'scheduled',send_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id))))return;
      const r=await fnM({run:true});flash(r.error?'⚠️ '+r.error:'📤 התחיל! נשלחו עכשיו '+(r.data.sent||0)+(r.data.notes&&r.data.notes.length?' · '+r.data.notes.map(noteM).join(' · '):''));viewMail();return;}
    if(a==='pause'){if(await okM(sb.from('email_campaigns').update({status:'paused'}).eq('id',id),'⏸ הושהה — אפשר לערוך ולהמשיך, או 🔁 מייל חדש שממשיך מכאן'))viewMail();return;}
    if(a==='resume'){await sb.from('email_campaigns').update({status:'paused'}).eq('status','sending');if(await okM(sb.from('email_campaigns').update({status:'sending'}).eq('id',id),'▶ ממשיך'))viewMail();return;}
    if(a==='cancel'){if((await uiConfirm('לעצור את המייל? מי שעוד לא קיבל — לא יקבל.'))&&await okM(sb.from('email_campaigns').update({status:'canceled',finished_at:new Date().toISOString()}).eq('id',id),'✖ נעצר'))viewMail();return;}
    if(a==='del'){if((await uiConfirm('למחוק את המייל?'))&&await okM(sb.from('email_campaigns').delete().eq('id',id),'🗑️ נמחק'))viewMail();return;}
  };
}
/* אפשר "להמשיך מאיפה שנעצר" ממייל שכבר יצא לחלק מהמשתמשים (לא ממיילי עדכון האפליקציה) */
function contOk(c,x){return ['sending','paused','canceled','done'].includes(c.status)&&(+((x||{}).sent)||0)>0&&!/^app:/.test(c.note||'');}
async function okM(q,msg){const {error}=await q;if(error){flash('⚠️ '+error.message);return false;}if(msg)flash(msg);return true;}
async function showPreview(idOrObj){
  const r=await fnM({preview:idOrObj});if(r.error){flash('⚠️ '+r.error);return;}
  const box=$m('#mPrev');if(!box)return;
  box.innerHTML='<div class="card"><h2>👀 תצוגה מקדימה — '+escM(r.data.subject||'')+'</h2><p class="muted">ככה זה ייראה בתיבת המייל (הקישורים כאן לא פעילים).</p><iframe id="mFrame" title="תצוגה מקדימה של המייל" sandbox="" style="width:100%;height:720px;border:1px solid var(--line);border-radius:12px;background:#fff"></iframe><button class="btn sec" id="mClosePrev" style="margin-top:8px">✕ סגירה</button></div>';
  $m('#mFrame').srcdoc=r.data.html||'';$m('#mClosePrev').onclick=()=>box.innerHTML='';box.scrollIntoView({behavior:'smooth'});}
async function sendTest(id,btn){
  const to=(authUser&&authUser.email)||'';
  if(!(await uiConfirm('לשלוח מייל ניסיון אל '+to+'?\n(הקישורים בו לא ישנו כלום אצל אף אחד)')))return;
  if(btn)btn.disabled=true;const r=await fnM({test:id,to});if(btn)btn.disabled=false;
  flash(r.error?'⚠️ '+({no_key:'Resend עוד לא מחובר (RESEND_API_KEY)',rate:'אפשר עד 10 מיילי ניסיון בשעה'}[r.error]||r.error):'🧪 נשלח אל '+r.data.to+' — בדקו את תיבת הדואר (גם בקידומי מכירות/ספאם)');}

/* ---------- עריכת מייל ---------- */
const MAX_IMGS_M=6;
/* כל צילומי המסך של חידוש (גם ממיילים ישנים עם תמונה אחת) */
function imgsOf(it){it=it||{};return [...new Set([it.image].concat(Array.isArray(it.images)?it.images:[]).filter(u=>IMG_RE_M.test(u||'')))].slice(0,MAX_IMGS_M);}
function collect(m){
  const d=edM;const ct=$m('#meCont');if(ct)d.continues=ct.value||null;d.subject=$m('#meSubj').value.trim();d.preheader=$m('#mePre').value.trim();d.intro=$m('#meIntro').value;d.outro=$m('#meOutro').value;d.cta=$m('#meCta').value.trim()||'לכניסה לאתר';
  const old=d.items||[];d.items=[...m.querySelectorAll('[data-item]')].map((r,k)=>({title:r.querySelector('[data-f="title"]').value.trim(),text:r.querySelector('[data-f="text"]').value,images:imgsOf(old[k]),link:r.querySelector('[data-f="link"]').value.trim()}));
  return d;}
function drawEditor(m){
  const d=edM;const items=(d.items&&d.items.length?d.items:[{title:'',text:'',images:[],link:''}]);
  m.innerHTML='<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">'+(d.id?'✏️ עריכת מייל':'✏️ מייל חדש')+'</h2><button class="btn sec" id="meBack" style="flex:0">→ חזרה לרשימה</button></div>'+
    (d.status==='scheduled'&&d.send_at?'<p class="muted">⏰ מתוזמן ל-'+fmtM(d.send_at)+'</p>':'')+
    '<label for="meSubj">נושא המייל (מה שרואים בתיבת הדואר)</label><input id="meSubj" maxlength="150" value="'+escM(d.subject)+'" placeholder="למשל: 🆕 מה חדש השבוע ברשימת קניות">'+
    '<label for="mePre">שורה מקדימה (מופיעה ליד הנושא, לא חובה)</label><input id="mePre" maxlength="200" value="'+escM(d.preheader||'')+'">'+
    '<label for="meIntro">פתיחה (אחרי "שלום [שם],")</label><textarea id="meIntro" maxlength="3000">'+escM(d.intro||'')+'</textarea></div>'+
    '<div class="card"><h2>🆕 מה חדש — עד '+MAX_ITEMS+' חידושים, לכל אחד עד '+MAX_IMGS_M+' צילומי מסך</h2>'+
    items.map((it,i)=>'<div class="item" data-item="'+i+'"><b>חידוש '+(i+1)+'</b>'+
      '<label>כותרת</label><input data-f="title" maxlength="120" value="'+escM(it.title||'')+'">'+
      '<label>הסבר קצר</label><textarea data-f="text" maxlength="1500" style="min-height:70px">'+escM(it.text||'')+'</textarea>'+
      (()=>{const ims=imgsOf(it);return '<label>צילומי מסך'+(ims.length?' ('+ims.length+')':'')+' — תמונה אחת מוצגת ברוחב מלא, כמה תמונות — שתיים בשורה</label><div class="row" style="align-items:flex-start;gap:8px">'+
        ims.map((u,j)=>'<div style="flex:0 0 auto;min-width:0;position:relative"><img src="'+escM(u)+'" alt="" style="width:110px;height:150px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block"><div class="row" style="gap:4px;margin-top:4px">'+(j>0?'<button class="btn sm sec" data-imgl="'+i+':'+j+'" title="להזיז קדימה" style="flex:0">→</button>':'')+'<button class="btn sm sec" data-rmimg="'+i+':'+j+'" title="להסיר" style="flex:0">✕</button>'+(j<ims.length-1?'<button class="btn sm sec" data-imgr="'+i+':'+j+'" title="להזיז אחורה" style="flex:0">←</button>':'')+'</div></div>').join('')+
        (ims.length<MAX_IMGS_M?'<label class="btn sec" style="flex:0 0 auto;margin:0;color:var(--text)">📷 '+(ims.length?'עוד תמונות':'העלאת תמונות')+'<input type="file" accept="image/*" multiple data-up="'+i+'" hidden></label>':'')+'</div>';})()+
      '<label>קישור באתר (לא חובה — לאן מגיעים בלחיצה על התמונה)</label><input data-f="link" dir="ltr" maxlength="300" placeholder="https://yamshopping.com/..." value="'+escM(it.link||'')+'">'+
      '<div class="row" style="gap:6px;margin-top:6px">'+(i>0?'<button class="btn sm sec" data-up1="'+i+'" style="flex:0">⬆️</button>':'')+(i<items.length-1?'<button class="btn sm sec" data-dn1="'+i+'" style="flex:0">⬇️</button>':'')+'<button class="btn sm bad" data-rmit="'+i+'" style="flex:0">🗑️ הסרת החידוש</button></div></div>').join('')+
    (items.length<MAX_ITEMS?'<button class="btn sec" id="meAdd" style="margin-top:8px">＋ עוד חידוש</button>':'')+'</div>'+
    '<div class="card"><label for="meOutro">סיום</label><textarea id="meOutro" maxlength="1500" style="min-height:60px">'+escM(d.outro||'')+'</textarea>'+
    '<label for="meCta">טקסט הכפתור הירוק</label><input id="meCta" maxlength="40" value="'+escM(d.cta||'לכניסה לאתר')+'">'+
    '<p class="muted">בכל מייל נוסף לבד: תאריך עברי ולועזי, "שלום [שם]", חתימה של צוות רשימת קניות, "האם העדכון היה מועיל?", כתובת info@yamshopping.com לתשובות (אפשר גם פשוט להשיב למייל), וקישור להסרה מרשימת התפוצה.</p>'+
    contPick(d)+
    '<label for="meWhen">מתי להתחיל לשלוח (לא חובה)</label><input id="meWhen" type="datetime-local" value="'+(d.send_at?toLocalInput(d.send_at):'')+'">'+
    '<div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="meSave">💾 שמירה</button><button class="btn sec" id="mePrevBtn">👀 תצוגה מקדימה</button><button class="btn sec" id="meTest">🧪 שמירה וניסיון אליי</button><button class="btn" id="meSched">⏰ שמירה ותזמון</button></div></div><div id="mPrev"></div>';
  m.oninput=null;
  m.onchange=async e=>{if(e.target.id==='meCont'){collect(m);drawEditor(m);return;}const f=e.target.closest('[data-up]');if(!f||!f.files||!f.files.length)return;const i=+f.dataset.up;collect(m);
    const it=edM.items[i];const ims=imgsOf(it);const files=[...f.files].slice(0,MAX_IMGS_M-ims.length);if(f.files.length>files.length)flash('ℹ️ אפשר עד '+MAX_IMGS_M+' תמונות לכל חידוש');
    let n=0;try{for(const file of files){flash('⏳ מעלה '+(n+1)+' מתוך '+files.length+'...');const blob=await shrinkM(file);const name=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)+'.jpg';
      const {error}=await sb.storage.from('mail').upload(name,blob,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false});if(error)throw error;
      ims.push(sb.storage.from('mail').getPublicUrl(name).data.publicUrl);n++;}
      flash(n>1?'📷 עלו '+n+' תמונות':'📷 התמונה עלתה');}catch(er){flash('⚠️ '+(er.message||er));}
    it.images=ims;delete it.image;drawEditor(m);};
  m.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
    if(b.id==='meBack'){if(await uiConfirm('לחזור בלי לשמור?')){edM=null;subM='list';viewMail();}return;}
    collect(m);const its=edM.items;
    if(b.id==='meAdd'){its.push({title:'',text:'',images:[],link:''});drawEditor(m);return;}
    if(b.dataset.rmit!=null){its.splice(+b.dataset.rmit,1);if(!its.length)its.push({title:'',text:'',images:[],link:''});drawEditor(m);return;}
    const ij=(b.dataset.rmimg||b.dataset.imgl||b.dataset.imgr||'').split(':');if(ij.length===2){const it=its[+ij[0]],j=+ij[1];const ims=it.images=imgsOf(it);delete it.image;
      if(b.dataset.rmimg)ims.splice(j,1);else{const k=b.dataset.imgl?j-1:j+1;[ims[j],ims[k]]=[ims[k],ims[j]];}drawEditor(m);return;}
    if(b.dataset.up1!=null){const i=+b.dataset.up1;[its[i-1],its[i]]=[its[i],its[i-1]];drawEditor(m);return;}
    if(b.dataset.dn1!=null){const i=+b.dataset.dn1;[its[i+1],its[i]]=[its[i],its[i+1]];drawEditor(m);return;}
    const bad=its.find(x=>x.link&&!/^https:\/\/(www\.)?yamshopping\.com(\/|$)/.test(x.link));if(bad){flash('⚠️ קישור יכול להיות רק לאתר yamshopping.com');return;}
    if(b.id==='mePrevBtn'){await showPreview(cleanEd());return;}
    if(!edM.subject){flash('צריך נושא למייל');$m('#meSubj').focus();return;}
    if(b.id==='meSched'){const w=$m('#meWhen').value;if(!w){flash('בחרו מתי להתחיל לשלוח');$m('#meWhen').focus();return;}
      const at=new Date(w);if(at.getDay()===6){flash('⚠️ בשבת לא שולחים — בחרו יום אחר');return;}edM.status='scheduled';edM.send_at=at.toISOString();}
    const id=await save();if(!id)return;
    if(b.id==='meTest'){await sendTest(id,b);return;}
    flash(b.id==='meSched'?'⏰ נשמר ומתוזמן ל-'+fmtM(edM.send_at):'💾 נשמר');edM=null;subM='list';viewMail();};
}
/* למי לשלוח: לכולם מההתחלה, או להמשיך מאיפה שמייל קודם נעצר (רק לפני שהמייל הזה התחיל לצאת) */
function contPick(d){
  if(d.id&&(+((statsM[d.id]||{}).sent)||0)>0)return d.continues?'<p class="muted">🔁 ממשיך מאיפה ש"'+escM((campsM.find(k=>k.id===d.continues)||{}).subject||'מייל קודם')+'" נעצר</p>':'';
  const opts=campsM.filter(c=>c.id!==d.id&&contOk(c,statsM[c.id]));
  if(!opts.length&&!d.continues)return '';
  const par=campsM.find(k=>k.id===d.continues);
  return '<label for="meCont">למי לשלוח</label><select id="meCont"><option value="">לכולם, מההתחלה של הרשימה</option>'+
    opts.map(c=>'<option value="'+c.id+'"'+(d.continues===c.id?' selected':'')+'>🔁 להמשיך מאיפה ש"'+escM((c.subject||'(בלי נושא)').slice(0,60))+'" נעצר (קיבלו '+(+statsM[c.id].sent)+')</option>').join('')+'</select>'+
    '<p class="muted" id="meContNote">'+(d.continues?'מי שכבר קיבל את "'+escM((par||{}).subject||'')+'" לא יקבל את המייל הזה. השליחה ממשיכה לשאר המשתמשים מאותו מקום בתור, וכשהמייל הזה יתחיל לצאת — הקודם ייעצר.':'כשבוחרים "להמשיך" — מי שכבר קיבל את המייל הקודם לא יקבל את החדש, והשליחה ממשיכה מאותו מקום בתור.')+'</p>';}
function toLocalInput(iso){const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());}
function cleanEd(){const d=edM;return {subject:d.subject,preheader:d.preheader||'',intro:d.intro||'',outro:d.outro||'',cta:d.cta||'לכניסה לאתר',
  items:(d.items||[]).map(i=>{const ims=imgsOf(i);return {title:i.title||'',text:i.text||'',images:ims,image:ims[0]||'',link:i.link||''};}).filter(i=>i.title||i.text||i.images.length).slice(0,MAX_ITEMS)};}
async function save(){const row=Object.assign(cleanEd(),{status:edM.status||'draft',send_at:edM.send_at||null,updated_at:new Date().toISOString()});
  // continues נשלח רק כשצריך — כדי שהשמירה תעבוד גם לפני שמריצים את קוד ה-SQL המעודכן
  if(edM.continues||(edM.id&&'continues' in edM))row.continues=edM.continues||null;
  const err=e=>{flash('⚠️ '+(/continues/.test(e.message||'')?'כדי "להמשיך מאיפה שנעצר" צריך להריץ פעם אחת את קוד ה-SQL המעודכן (בק אופיס ← ⚙️ הגדרה ראשונית ← שלב 1)':e.message));return null;};
  if(edM.id){const {error}=await sb.from('email_campaigns').update(row).eq('id',edM.id);if(error)return err(error);return edM.id;}
  const {data,error}=await sb.from('email_campaigns').insert(row).select('id').single();if(error)return err(error);edM.id=data.id;return data.id;}

/* ---------- למי נשלח ומה עשו ---------- */
async function drawRecipients(m){
  const c=rcptM;const {data,error}=await sb.rpc('email_recipients',{p_campaign:c.id});
  if(error){m.innerHTML='<div class="card"><p class="err">⚠️ '+escM(error.message)+'</p><button class="btn sec" id="rBack">→ חזרה</button></div>';$m('#rBack').onclick=()=>{subM='list';viewMail();};return;}
  const all=data||[];
  const F={all:['הכל',()=>true],opened:['👀 פתחו',r=>r.opened_at],notopened:['לא פתחו',r=>!r.opened_at&&!r.test],clicked:['🖱️ לחצו',r=>r.clicked_at],liked:['👍 אהבו',r=>r.liked_at],unsub:['🙋 הסירו',r=>r.unsub_at],spam:['🚫 ספאם',r=>r.complained_at],bounced:['↩️ חזרו',r=>r.bounced_at||r.status==='failed'],test:['🧪 ניסיון',r=>r.test]};
  const list=all.filter(F[rcptFilter][1]);
  const yes=d=>d?'<span title="'+escM(fmtM(d))+'">✔</span>':'';
  m.innerHTML='<div class="card"><div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h2 style="margin:0">👥 '+escM(c.subject)+'</h2><button class="btn sec" id="rBack" style="flex:0 0 auto;white-space:nowrap">→ חזרה לרשימה</button></div>'+dupNoteM(all)+'<p class="muted" style="margin:0">כל אחד מקבל כל מייל פעם אחת בלבד — מסד הנתונים חוסם שליחה כפולה של אותו מייל לאותו אדם, וגם בין מייל למייל עוברים לפחות 6 ימים.</p>'+
    '<div class="row" style="gap:6px;margin:10px 0;flex-wrap:wrap">'+Object.entries(F).map(([k,[l,f]])=>'<button class="btn sm'+(k===rcptFilter?'':' sec')+'" data-rf="'+k+'" style="flex:0 0 auto;white-space:nowrap">'+l+' ('+all.filter(f).length+')</button>').join('')+'</div>'+
    '<input id="rQ" placeholder="חיפוש לפי שם או מייל"><p class="muted">"נפתח" נמדד לפי טעינת התמונות במייל — בחלק מתוכנות הדואר זה לא מדויק (חוסמות תמונות או טוענות אותן לבד).</p>'+
    '<div class="tw"><table><tr><th>שם</th><th>מייל</th><th>נשלח</th><th>נפתח</th><th>לחץ</th><th>👍</th><th>הסיר</th><th>ספאם</th><th>חזר</th></tr>'+
    list.map(r=>'<tr data-q="'+escM((r.name+' '+r.email).toLowerCase())+'"><td>'+escM(r.name)+(r.test?' 🧪':'')+'</td><td dir="ltr" style="text-align:right">'+escM(r.email)+'</td><td>'+fmtM(r.sent_at)+(r.status==='failed'?' ⚠️ '+escM(r.error):'')+'</td><td>'+yes(r.opened_at)+(r.opens>1?' ×'+r.opens:'')+'</td><td>'+yes(r.clicked_at)+'</td><td>'+yes(r.liked_at)+'</td><td>'+yes(r.unsub_at)+'</td><td>'+yes(r.complained_at)+'</td><td>'+yes(r.bounced_at)+'</td></tr>').join('')+
    '</table></div>'+(list.length?'':'<p class="muted">אין</p>')+'</div>';
  $m('#rQ').oninput=e=>{const q=e.target.value.trim().toLowerCase();m.querySelectorAll('tr[data-q]').forEach(tr=>tr.hidden=!!q&&!tr.dataset.q.includes(q));};
  m.onchange=null;
  m.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='rBack'){subM='list';viewMail();return;}if(b.dataset.rf){rcptFilter=b.dataset.rf;drawRecipients(m);}};
}
/* ---------- 📅 נשלח לפי יום ---------- */
// האם השעון האוטומטי רץ? (pg_cron דופק על הפונקציה כל 5 דקות)
function cronWarnM(cfg,cur,es,cron){
  if(!(cfg.auto||cur))return '';
  const last=es.last_cron?new Date(es.last_cron):null,old=!last||Date.now()-last>20*6e4;
  if(!old)return '<p class="muted" style="margin:0 0 6px">🟢 השעון האוטומטי רץ (בדיקה אחרונה: '+hmM(last)+')</p>';
  const c=(cron&&cron.data)||{},j=c.job||{},r=(c.runs||[])[0];
  let why;
  if(cron&&cron.error)why='צריך להריץ שוב את קוד ה-SQL.';
  else if(c.cron===false)why='התוסף pg_cron לא מופעל ב-Supabase (Database ← Extensions ← pg_cron ← Enable), ואז להריץ שוב את קוד ה-SQL.';
  else if(!j.schedule)why='המשימה yam-mail לא קיימת — להריץ שוב את קוד ה-SQL.';
  else if(j.schedule!=='*/5 * * * *')why='המשימה עדיין על הזמנים הישנים ('+escM(j.schedule)+') — להריץ שוב את קוד ה-SQL.';
  else if(r&&r.status!=='succeeded')why='הריצה האחרונה נכשלה: '+escM(r.msg||r.status);
  else if(!last)why='עוד לא הגיעה אף ריצה אוטומטית — אם העלית עכשיו את הפונקציה email, חכה 5 דקות. אם זה לא משתנה: לוודא שהתוסף pg_net מופעל (Database ← Extensions).';
  else why='אם העלית עכשיו את הפונקציה email, חכה 5 דקות. אחרת: לוודא שהתוספים pg_cron ו-pg_net מופעלים (Database ← Extensions) ולהריץ שוב את ה-SQL.';
  return '<p class="err" style="margin:4px 0 8px">⚠️ השליחה האוטומטית לא רצה'+(last?' מאז '+fmtM(last):'')+'. '+why+' בינתיים אפשר לשלוח בכפתור "📤 לשלוח עכשיו".</p>';
}
const dupNoteM=rows=>{const seen={},d=[];rows.filter(r=>!r.test).forEach(r=>{const k=(r.subject||'')+'|'+r.user_id;if(seen[k])d.push(r);seen[k]=1;});
  const n=new Set(rows.filter(r=>!r.test).map(r=>r.user_id)).size;
  return '<p style="margin:6px 0">'+(d.length?'<span class="err">⚠️ '+d.length+' נמענים קיבלו את אותו מייל פעמיים: '+d.map(r=>escM(r.email)).join(', ')+'</span>':'✅ <b>'+n+'</b> אנשים שונים — אף אחד לא קיבל את אותו מייל פעמיים')+'</p>';};
function dayCardM(daily,camp,S,cnt,per,reach,s,es,cfg,LF,cron){
  if(daily.error)return '<div class="card" style="margin-top:14px"><h2>📅 נשלח לפי יום</h2><p class="err">⚠️ '+escM(daily.error.message)+(/find the function|does not exist|schema cache/i.test(daily.error.message)?' — צריך להריץ שוב את קוד ה-SQL (בק אופיס ← ⚙️ הגדרה ראשונית).':' — נסה לרענן בעוד רגע.')+'</p><button class="btn sec" data-reload="1">🔄 רענון</button></div>';
  const rows=daily.data||[];const by={};rows.forEach(r=>{(by[r.day]=by[r.day]||[]).push(r);});
  const today=ilDayM();const days=[];for(let i=0;i<14;i++)days.push(ilDayM(Date.now()-i*864e5));
  const cur=camp.find(c=>c.status==='sending'),next=camp.filter(c=>c.status==='scheduled'&&c.send_at).sort((a,b)=>a.send_at<b.send_at?-1:1)[0];
  const sentToday=+cnt.today||0,left=cur?(LF?(+LF.ready||0)+(+LF.waiting||0):Math.max(0,reach-(+((S[cur.id]||{}).sent)||0))):0,ready=LF?+LF.ready||0:left,waiting=LF?+LF.waiting||0:0;
  const whenM=iso=>{if(!iso)return '';const d=ilDayM(iso);return (d===today?'היום':d===ilDayM(Date.now()+864e5)?'מחר':'יום '+['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][new Date(d+'T12:00:00Z').getUTCDay()]+' '+d.slice(8)+'/'+(+d.slice(5,7)))+' בשעה '+hmM(iso);};
  const capHit=sentToday>=per,nr=capHit?s.next_run_tomorrow:s.next_run;
  const live=nr&&cur&&ready?'<div style="font-size:15px;margin:2px 0 6px">⏱️ <b>השליחה האוטומטית הבאה: '+whenM(nr)+'</b> <span class="muted" data-cd="'+escM(nr)+'"></span></div>':'';
  let now;
  if(!s.key)now='❌ Resend לא מחובר — שום מייל לא יוצא.';
  else if(!cur)now='💤 אין מייל בשליחה עכשיו.'+(next?' ⏰ המייל הבא ("'+escM(next.subject)+'") מתחיל: '+fmtM(next.send_at)+'.':(cfg.auto?' 🤖 הטיוטה האוטומטית תיווצר ביום '+DAYS_M[+cfg.draft_day]+'.':' השליחה האוטומטית כבויה — שולחים ידנית.'));
  else if(!left)now='✅ "'+escM(cur.subject)+'" כבר הגיע כמעט לכולם.';
  else if(!ready&&waiting)now='⏳ כל '+waiting+' שעוד לא קיבלו את "'+escM(cur.subject)+'" קיבלו מייל אחר ב-6 הימים האחרונים. כדי לא להציף אותם, כל אחד יקבל אותו כשיעברו 6 ימים מהמייל הקודם שלו — זה יקרה לבד.';
  else if(capHit)now='✅ היום כבר נשלחו '+sentToday+' (המכסה היומית). "'+escM(cur.subject)+'" ממשיך לבד — נשארו עוד כ-'+left+'.';
  else if(s.window)now='⏸️ עכשיו לא שולחים ('+(WIN_M[s.window]||s.window)+'). "'+escM(cur.subject)+'" ימשיך לבד כשיגיע הזמן — נשארו עוד כ-'+left+'.';
  else now='🔄 "'+escM(cur.subject)+'" בשליחה: היום נשלחו '+sentToday+' מתוך '+per+' — נשארו עוד כ-'+left+'. כל ריצה שולחת עד שמגיעים למכסה של היום.';
  const tot=k=>(by[today]||[]).reduce((a,r)=>a+(+r[k]||0),0);
  return '<div class="card" style="margin-top:14px"><h2>📅 נשלח לפי יום</h2>'+
    '<p style="margin:4px 0 8px"><b>היום ('+dayLabelM(today).replace(/<[^>]+>/g,'')+', מ-00:00):</b> נשלחו <b>'+tot('sent')+'</b>'+(tot('failed')?' · ⚠️ נכשלו '+tot('failed'):'')+(tot('tests')?' · 🧪 ניסיון '+tot('tests'):'')+'</p>'+
    live+'<p class="muted" style="margin:0 0 4px">'+now+' <a href="#" data-gocfg="1">⚙️ לשנות שעות</a></p>'+
    (cur&&ready?'<p style="margin:6px 0">'+(capHit?'<span class="muted">הגעת למכסה של היום ('+per+'). אפשר להעלות אותה בהגדרות למטה.</span>':'<button class="btn" data-run="1" style="flex:0 0 auto">📤 לשלוח עכשיו (עד '+Math.min(per-sentToday,ready)+' מיילים)</button>')+'</p>':'')+
    (LF&&cur?'<p class="muted" style="margin:0 0 4px">👥 נשארו: <b>'+ready+'</b> מוכנים לקבל עכשיו'+(waiting?' · '+waiting+' מחכים (קיבלו מייל אחר ב-6 הימים האחרונים)':'')+'</p>':'')+
    cronWarnM(cfg,cur,es,cron)+
    (es.last_run?'<p class="muted" style="margin:0 0 10px">ריצה אחרונה: '+fmtM(es.last_run)+(es.last_note?' · '+escM(String(es.last_note).split(' · ').map(noteM).join(' · ')):'')+(es.last_error?' · <span class="err">⚠️ '+escM(es.last_error)+'</span>':'')+'</p>':'')+
    '<div class="tw"><table><tr><th>יום</th><th>מייל</th><th>נשלחו</th><th>👀 נפתחו</th><th>🖱️ לחצו</th><th>👍</th><th>🙋 הסירו</th><th>⚠️</th><th>שעות</th><th></th></tr>'+
    days.map(d=>{const rs=by[d]||[];
      if(!rs.length)return '<tr style="opacity:.55"><td>'+dayLabelM(d)+'</td><td colspan="9">לא נשלח</td></tr>';
      return rs.map((r,i)=>'<tr'+(d===today?' style="background:var(--soft,#eef7f3)"':'')+'><td>'+(i?'':dayLabelM(d))+'</td><td>'+escM(r.subject||'—')+(+r.tests?' <span class="muted">· 🧪 ניסיון '+r.tests+'</span>':'')+'</td><td><b>'+(+r.sent)+'</b></td><td>'+(+r.opened)+pct(+r.opened,+r.sent)+'</td><td>'+(+r.clicked)+'</td><td>'+(+r.liked)+'</td><td>'+(+r.unsub)+'</td><td>'+(+r.failed||'')+'</td><td dir="ltr">'+hmM(r.first_at)+(r.last_at!==r.first_at?'–'+hmM(r.last_at):'')+'</td><td>'+(i?'':'<button class="btn sm sec" data-day="'+d+'" style="flex:0">👥 למי</button>')+'</td></tr>').join('');}).join('')+
    '</table></div><p class="muted">יום = 00:00 עד 00:00 (שעון ישראל). "נפתחו" ו"לחצו" מתעדכנים גם בימים הבאים — הם שייכים ליום שבו המייל נשלח.</p></div>';
}
async function drawDay(m){
  const {data,error}=await sb.rpc('email_day_recipients',{p_day:dayM});
  const back='<button class="btn sec" id="dBack" style="flex:0 0 auto;white-space:nowrap">→ חזרה</button>';
  if(error){m.innerHTML='<div class="card"><p class="err">⚠️ '+escM(error.message)+'</p>'+back+'</div>';m.onclick=e=>{if(e.target.closest('#dBack')){subM='list';viewMail();}};return;}
  const all=data||[];
  const F={all:['הכל',()=>true],opened:['👀 פתחו',r=>r.opened_at],notopened:['לא פתחו',r=>!r.opened_at&&!r.test],clicked:['🖱️ לחצו',r=>r.clicked_at],liked:['👍 אהבו',r=>r.liked_at],unsub:['🙋 הסירו',r=>r.unsub_at],bad:['⚠️ נכשלו / חזרו',r=>r.status==='failed'||r.bounced_at||r.complained_at],test:['🧪 ניסיון',r=>r.test]};
  if(!F[rcptFilter])rcptFilter='all';
  const list=all.filter(F[rcptFilter][1]);
  const many=new Set(all.map(r=>r.subject)).size>1;
  const yes=d=>d?'<span title="'+escM(fmtM(d))+'">✔</span>':'';
  m.innerHTML='<div class="card"><div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h2 style="margin:0">📅 '+dayLabelM(dayM)+' — למי נשלח</h2>'+back+'</div>'+(!many&&all.length?'<p class="muted" style="margin:4px 0 0">'+escM(all[0].subject)+'</p>':'')+dupNoteM(all)+
    '<div class="row" style="gap:6px;margin:10px 0;flex-wrap:wrap">'+Object.entries(F).map(([k,[l,f]])=>'<button class="btn sm'+(k===rcptFilter?'':' sec')+'" data-rf="'+k+'" style="flex:0 0 auto;white-space:nowrap">'+l+' ('+all.filter(f).length+')</button>').join('')+'</div>'+
    '<input id="dQ" placeholder="חיפוש לפי שם או מייל">'+
    '<div class="tw"><table><tr><th>שעה</th><th>שם</th><th>מייל</th>'+(many?'<th>איזה מייל</th>':'')+'<th>נפתח</th><th>לחץ</th><th>👍</th><th>הסיר</th><th>בעיה</th></tr>'+
    list.map(r=>'<tr data-q="'+escM((r.name+' '+r.email).toLowerCase())+'"><td dir="ltr">'+hmM(r.sent_at)+'</td><td>'+escM(r.name)+(r.test?' 🧪':'')+'</td><td dir="ltr" style="text-align:right">'+escM(r.email)+'</td>'+(many?'<td>'+escM(r.subject)+'</td>':'')+'<td>'+yes(r.opened_at)+(r.opens>1?' ×'+r.opens:'')+'</td><td>'+yes(r.clicked_at)+'</td><td>'+yes(r.liked_at)+'</td><td>'+yes(r.unsub_at)+'</td><td>'+(r.status==='failed'?'⚠️ '+escM(r.error||'נכשל'):r.bounced_at?'↩️ חזר':r.complained_at?'🚫 ספאם':'')+'</td></tr>').join('')+
    '</table></div>'+(list.length?'':'<p class="muted">אין</p>')+'</div>';
  $m('#dQ').oninput=e=>{const q=e.target.value.trim().toLowerCase();m.querySelectorAll('tr[data-q]').forEach(tr=>tr.hidden=!!q&&!tr.dataset.q.includes(q));};
  m.onchange=null;
  m.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='dBack'){subM='list';viewMail();return;}if(b.dataset.rf){rcptFilter=b.dataset.rf;drawDay(m);}};
}
async function drawUnsubs(m){
  const {data,error}=await sb.rpc('email_unsubs');
  m.innerHTML='<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">🙋 מי הסיר את עצמו / מייל שחזר / ספאם</h2><button class="btn sec" id="uBack" style="flex:0">→ חזרה</button></div>'+
    (error?'<p class="err">⚠️ '+escM(error.message)+'</p>':'<div class="tw"><table><tr><th>שם</th><th>מייל</th><th>מה</th><th>מתי</th><th>איך</th><th>סיבה</th></tr>'+
    (data||[]).map(r=>{const why=String(r.unsub_reason||'');const k=why.split(':')[0];
      return '<tr><td>'+escM(r.name)+'</td><td dir="ltr" style="text-align:right">'+escM(r.email)+'</td><td>'+(r.status==='complained'?'🚫 דיווח ספאם':r.status==='bounced'?'↩️ המייל חוזר':'🙋 הסיר')+'</td><td>'+fmtM(r.unsub_at||r.updated_at)+'</td><td>'+escM(HOW_M[r.unsub_how]||r.unsub_how||'')+'</td><td>'+escM(WHY_M[k]?WHY_M[k]+why.slice(k.length):why)+'</td></tr>';}).join('')+'</table></div>'+((data||[]).length?'':'<p class="muted">אף אחד עדיין 🙂</p>'))+'</div>';
  m.onchange=null;m.onclick=e=>{if(e.target.closest('#uBack')){subM='list';viewMail();}};
}
if(window.boView)window.boView('mail',async function(){const m=$m('#boMain');if(m){m.onchange=null;m.oninput=null;}subM='list';edM=null;rcptM=null;dayM=null;await viewMail();});
})();
/* ---------- הסכמה למייל השבועי (חוק התקשורת, סעיף 30א): מי שעוד לא נשאל — שואלים פעם אחת, אחרי שהאתר נטען ---------- */
(function(){let asked=false;
  async function askWeekly(){if(asked||!sb||!authUser)return;const em=String(authUser.email||'').toLowerCase();
    if(authUser.is_anonymous||!em||em.endsWith('@nomail.yamshopping.com'))return;asked=true;
    try{const {data:st,error}=await sb.rpc('email_consent_state');if(error||st!=='ask')return;
      const yes=await uiConfirm(T('📧 רוצים לקבל מייל שבועי מהאתר?\nפעם בשבוע לכל היותר: מבצעים ומה חדש באתר ובאפליקציה.\nאפשר להסיר בכל רגע (תפריט ← 📧 מייל שבועי).','📧 Would you like a weekly email from us?\nAt most once a week: deals and what is new.\nYou can unsubscribe anytime (menu → 📧 Weekly email).'));
      const r=await sb.rpc('email_weekly_set',{p_on:!!yes});if(!r.error&&yes)flash(T('💚 תודה! המייל השבועי הופעל','💚 Thanks! Weekly email is on'));
    }catch(e){asked=false;}}
  try{if(sb)sb.auth.onAuthStateChange((ev,session)=>{if(session&&(ev==='SIGNED_IN'||ev==='INITIAL_SESSION'))setTimeout(askWeekly,9000);if(ev==='SIGNED_OUT')asked=false;});}catch(e){}
})();
