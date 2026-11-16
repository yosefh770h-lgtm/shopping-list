/* ================= 🛡️ חומת הגנה ובוטים (בק אופיס ← 🛡️ בוטים ואבטחה) =================
   מה רואים כאן: האם חומת ההגנה בשרת פעילה, עומס וחיבורים בשעות האחרונות, כל חסימה וכל ניסיון פריצה (security_events),
   חסימות במסד (rate_blocks), ומכאן משחררים, חוסמים לתמיד, מוסיפים כתובת מותרת (נטפרי) ומשנים את הספים.
   השומר בשרת (collector/yam/shield.py) קורא את ההגדרות (site_config 'shield') כל 20 שניות. */
(function(){
if(!window.boView)return;
const $s=s=>document.querySelector(s);
const num=n=>(+n||0).toLocaleString('he-IL');
const when=d=>{try{return new Date(d).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}};
const ago=d=>{const m=Math.floor((Date.now()-new Date(d).getTime())/60000);return m<1?'עכשיו':m<60?'לפני '+m+' דק׳':m<1440?'לפני '+Math.floor(m/60)+' שע׳':'לפני '+Math.floor(m/1440)+' ימים';};
const KIND={flood:['🛡️','הצפה נחסמה','יותר מדי חיבורים בבת אחת מכתובת אחת'],ddos:['🚨','התקפת עומס (DDoS)','קפיצה חדה בחיבורים מהרבה כתובות — ההגנה הוחמרה ל-15 דקות'],
  probe:['🚨','ניסיון פריצה','חיפש קבצים רגישים או כלי ניהול שאין אצלנו (למשל ‎/.env, wp-login)'],direct:['⚡','פנייה ישירה לשרת','פנה ל-server.yamshopping.com ולא דרך האתר — נחסם'],
  ssh:['🔑','ניחוש סיסמה לשרת','ניסיונות כניסה כושלים ל-SSH'],db_rate:['🗄️','הצפת בקשות למסד','יותר מדי בקשות כתיבה בדקה ל-Supabase'],
  load:['🔥','עומס גבוה על השרת',''],down:['🔴','האתר לא ענה',''],up:['🟢','האתר חזר',''],unblock:['✅','שוחרר ע״י מנהל','']};
const ALERTS=[['flood','הצפה שנחסמה'],['ddos','התקפת עומס'],['probe','ניסיון פריצה'],['down','האתר לא עונה / חזר'],['load','עומס גבוה'],['db_rate','חסימה במסד'],['direct','פנייה ישירה לשרת'],['ssh','ניחוש סיסמה ל-SSH']];
const ALERT_DEF={flood:1,ddos:1,probe:1,down:1,up:1,load:1,db_rate:1};
const DEF={rate:40,burst:200,conns:300,block_min:10,shared_mult:10,probe_hours:24,direct_min:60,ssh_max:10,db_user_per_min:600,db_ip_per_min:600,db_block_min:10};
const validIp=x=>/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(x)||/^[0-9a-f:]{3,39}(\/\d{1,3})?$/i.test(x);
const flag=cc=>/^[A-Z]{2}$/.test(cc||'')?String.fromCodePoint(...[...cc].map(c=>0x1F1E6+c.charCodeAt(0)-65))+' ':'';
const geoTxt=g=>{g=g||{};const p=[g.city,g.country].filter(Boolean).join(', ');return (p?flag(g.country_code)+p:'')+(g.org?' · '+g.org:'')+(g.hosting?' · ☁️ שרת/VPN':'');};
async function getCfg(key){const {data}=await sb.from('site_config').select('value').eq('key',key).maybeSingle();return (data&&data.value)||{};}
async function saveCfg(key,patch,msg){const cur=await getCfg(key);const v=Object.assign({},cur,patch);
  const {error}=await sb.from('site_config').upsert({key,value:v,updated_at:new Date().toISOString()});if(error){flash('⚠️ '+error.message);return null;}if(msg)flash(msg);return v;}

if(!document.getElementById('shCss')){const st=document.createElement('style');st.id='shCss';st.textContent=
  '#shMain .pstiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:6px 0}'+
  '#shMain .pstile{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}'+
  '#shMain .pstile b{font-size:22px;color:var(--hdr2,var(--text))}#shMain .pstile small{color:var(--muted);font-size:12px}'+
  '#shMain .pstile.hot{border-color:#d64545;background:rgba(214,69,69,.08)}#shMain .pstile.ok{border-color:#2e9d6a}'+
  '#shMain .shpill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;vertical-align:middle}'+
  '#shMain .shpill.on{background:#d8f0e3;color:#0b5a3c}#shMain .shpill.off{background:#fbe3e3;color:#8a1c1c}#shMain .shpill.wait{background:#fff3cd;color:#7a5600}'+
  '#shMain .shchart{width:100%;height:120px;display:block}#shMain .shchart .a{fill:var(--hdr,#2e7d5b);opacity:.75}#shMain .shchart .d{fill:#d64545}'+
  '#shMain .shlegend{font-size:12px;color:var(--muted);display:flex;gap:14px;flex-wrap:wrap}#shMain .shlegend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-inline-end:4px;vertical-align:middle}'+
  '#shMain .shchip{display:inline-block;border-radius:999px;padding:1px 8px;margin:1px 2px;font-size:12px;background:var(--line,#eee);white-space:nowrap}'+
  '#shMain .shlist span{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:2px 4px 2px 10px;margin:3px}'+
  '#shMain .shlist button{border:0;background:none;cursor:pointer;font-size:14px;color:var(--muted)}'+
  '#shMain .shgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px 16px}#shMain .shgrid label{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px}'+
  '#shMain .shgrid input[type=checkbox]{width:auto;flex:0 0 auto;margin:0}#shMain .shgrid label span{flex:1}#shMain .shgrid input[type=number]{max-width:90px}#shMain td .btn{padding:4px 8px;font-size:12px;margin:1px}'+
  '@media (max-width:640px){#shMain .tw{overflow:visible}#shMain table,#shMain tbody,#shMain tr,#shMain td{display:block;width:auto}#shMain thead{display:none}'+
  '#shMain tr{border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin:8px 0}#shMain td{border:0;padding:2px 0;text-align:right!important}#shMain td[data-l]:not([data-l=""])::before{content:attr(data-l) ": ";color:var(--muted);font-size:12px}}'+
  '#shMain pre{direction:ltr;text-align:left;white-space:pre-wrap;word-break:break-all;background:var(--bg2,rgba(0,0,0,.05));padding:8px;border-radius:8px;font-size:12px;user-select:all}';
  document.head.appendChild(st);}

/* גרף עמודות קטן: חיבורים חדשים בדקה (ירוק) ומה שנחסם (אדום), לפי השעות האחרונות */
function chart(rows,hours){if(!rows.length)return '<p class="muted">אין עדיין מדידות.</p>';
  const W=600,H=120,now=Date.now(),from=now-hours*3600e3,bins=Math.min(120,hours*12),bw=W/bins;const a=new Array(bins).fill(0),d=new Array(bins).fill(0);
  rows.forEach(r=>{const t=new Date(r.at).getTime();if(t<from)return;const i=Math.min(bins-1,Math.floor((t-from)/(now-from)*bins));a[i]+=(r.data.new|0);d[i]+=(r.data.drop|0)+(r.data.flood|0);});
  const mx=Math.max(1,...a,...d);let s='';
  for(let i=0;i<bins;i++){const ha=a[i]/mx*(H-4),hd=d[i]/mx*(H-4);
    if(ha)s+='<rect class="a" x="'+(i*bw+.5).toFixed(1)+'" y="'+(H-ha).toFixed(1)+'" width="'+Math.max(1,bw-1).toFixed(1)+'" height="'+ha.toFixed(1)+'"/>';
    if(hd)s+='<rect class="d" x="'+(i*bw+.5).toFixed(1)+'" y="'+(H-hd).toFixed(1)+'" width="'+Math.max(1,bw-1).toFixed(1)+'" height="'+hd.toFixed(1)+'"/>';}
  return '<svg class="shchart" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="חיבורים חדשים ונחסמים ב-'+hours+' השעות האחרונות">'+s+'</svg>'+
    '<div class="shlegend"><span><i style="background:var(--hdr,#2e7d5b)"></i>חיבורים חדשים</span><span><i style="background:#d64545"></i>נחסמו</span><span>שיא: '+num(mx)+' ב-'+Math.round(hours*60/bins)+' דקות</span><span style="margin-inline-start:auto">'+hours+' שעות אחורה ← עכשיו</span></div>';}

window.boView('shield',async function(){const m=$s('#boMain');if(!m)return;
  if(!(typeof isAdmin==='function'&&isAdmin())){m.innerHTML='<div class="card">⛔ רק למנהל</div>';return;}
  try{localStorage.setItem('shSeen',new Date().toISOString());}catch(e){}const bdg=$s('#boShN');if(bdg)bdg.hidden=true;
  let hours=+(sessionStorage.getItem('shHours')||6)||6;
  const since=new Date(Date.now()-7*864e5).toISOString();
  const [ev,ld,rb,cf,sec]=await Promise.all([
    sb.from('security_events').select('*').gte('at',since).order('at',{ascending:false}).limit(400),
    sb.from('shield_load').select('at,data').gte('at',new Date(Date.now()-24*3600e3).toISOString()).order('at',{ascending:true}).limit(1500),
    sb.from('rate_blocks').select('*').gt('until',new Date().toISOString()).order('at',{ascending:false}).limit(200),
    getCfg('shield'),getCfg('security')]);
  if(ev.error){m.innerHTML='<div class="card"><h2>🛡️ חומת הגנה ובוטים</h2><p>⚠️ צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית ← שלב 1).</p><p class="muted">'+esc(ev.error.message)+'</p></div>';return;}
  const events=ev.data||[],load=ld.data||[],dblocks=rb.data||[];const c=Object.assign({},DEF,cf||{});
  const last=load[load.length-1],alive=last&&Date.now()-new Date(last.at).getTime()<4*60e3,L=(last&&last.data)||{};
  const day=events.filter(e=>Date.now()-new Date(e.at).getTime()<864e5),cnt=k=>day.filter(e=>e.kind===k).length;
  const hourRows=load.filter(r=>Date.now()-new Date(r.at).getTime()<3600e3);const sum=k=>hourRows.reduce((a,r)=>a+(+r.data[k]||0),0);
  const serverOn=c.on!==false,dbOn=c.db_off!==true;const al=Object.assign({},ALERT_DEF,c.alerts||{});
  const pill=alive&&serverOn?'<span class="shpill on">✅ פעילה</span>':!serverOn?'<span class="shpill off">⏸️ כבויה</span>':load.length?'<span class="shpill off">⚠️ לא מדווחת כבר '+ago(last.at)+'</span>':'<span class="shpill wait">⏳ עוד לא הותקנה בשרת</span>';
  const attack=alive&&L.attack;const loadPct=L.cores?Math.round(100*L.load1/L.cores):0;
  const tile=(n,l,sub,cls)=>'<div class="pstile'+(cls?' '+cls:'')+'"><b>'+n+'</b><span>'+l+'</span>'+(sub?'<small>'+sub+'</small>':'')+'</div>';
  let h='<div id="shMain">';
  h+='<div class="card"><h2>🛡️ חומת ההגנה בשרת '+pill+(attack?' <span class="shpill off">🚨 מצב התקפה</span>':'')+'</h2>'+
    '<p class="muted">עוצרת בתוך השרת, מיד: כתובת שפותחת יותר מ-'+num(c.rate)+' חיבורים בשנייה (או '+num(c.burst)+' בבת אחת) נחסמת ל-'+num(c.block_min)+' דקות. כשמגיעה קפיצה חדה מהרבה כתובות (DDoS), ההגנה מוחמרת לבד ל-15 דקות. גוגל, בינג, השרת שלנו והכתובות המותרות לא נחסמים, וכתובות משותפות כמו נטפרי מקבלות סף גבוה פי '+num(c.shared_mult)+'. על כל אירוע נשלחת התראה מיידית לטלפון ולתוסף.</p>'+
    '<div class="pstiles">'+
    tile(alive?(L.up===false?'🔴 לא':'🟢 כן'):'—','האתר עונה',alive?'נבדק '+ago(last.at):'',alive&&L.up===false?'hot':'')+
    tile(num(sum('new')),'חיבורים בשעה האחרונה',alive?num(L.est)+' פתוחים עכשיו':'')+
    tile(num(L.blocked||0),'כתובות חסומות עכשיו',num(sum('drop')+sum('flood'))+' בקשות נחסמו בשעה',(L.blocked|0)>0?'hot':'')+
    tile(alive?loadPct+'%':'—','עומס על המעבד',alive?'זיכרון '+(L.mem|0)+'%':'',loadPct>200?'hot':'')+
    tile(num(cnt('flood')+cnt('ddos')),'הצפות שנחסמו',cnt('ddos')?'🚨 '+cnt('ddos')+' התקפות עומס':'ב-24 שעות',cnt('ddos')?'hot':'')+
    tile(num(cnt('probe')+cnt('ssh')),'ניסיונות פריצה',num(cnt('direct'))+' פניות ישירות לשרת · 24 שעות',cnt('probe')?'hot':'')+
    tile(num(cnt('db_rate')),'חסימות במסד',dbOn?'ב-24 שעות':'⏸️ ההגבלה במסד כבויה')+'</div>'+
    '<div class="row" style="gap:6px;margin:8px 0 2px;flex-wrap:wrap">'+[1,6,24].map(x=>'<button class="btn'+(x===hours?'':' sec')+'" data-shh="'+x+'">'+(x===1?'שעה':x===24?'יממה':x+' שעות')+'</button>').join('')+'</div>'+
    '<div id="shChart">'+chart(load,hours)+'</div></div>';
  if(!alive)h+='<div class="card"><h2>⚙️ התקנה בשרת (פעם אחת)</h2><p>חומת ההגנה רצה בשרת באורקל. כדי להפעיל אותה, פותחים טרמינל לשרת (כמו בהתקנה של האוסף) ומדביקים:</p>'+
    '<pre>sudo bash /opt/yamshopping/repo/collector/bin/shield-install.sh</pre><p class="muted">הקוד מגיע לשרת לבד תוך שעה מהמיזוג. ההתקנה לא נוגעת ב-Caddyfile ולא ב-SSH. אחרי דקה המסך הזה יתחיל להתמלא. הסרה: אותה פקודה עם <span dir="ltr">--remove</span>. כיבוי מיידי: הכפתור למטה.</p></div>';
  /* --- יומן --- */
  const blockedNow=new Set([...((c.blocked||[]).map(b=>b.ip))]);const allowed=new Set((c.allow||[]).map(a=>a.ip));
  const actions=e=>{if(!e.ip)return '';let b='';const live=['flood','probe','direct','ssh'].includes(e.kind)&&Date.now()-new Date(e.at).getTime()<((e.detail&&e.detail.min)||10)*60e3;
    if(live)b+='<button class="btn sec" data-shun="'+esc(e.ip)+'">✅ שחרור</button>';
    if(e.kind==='db_rate')b+='<button class="btn sec" data-shdb="'+esc(e.ip)+'">✅ שחרור במסד</button>';
    if(!allowed.has(e.ip))b+='<button class="btn sec" data-shallow="'+esc(e.ip)+'" title="למשל שרת הסינון של נטפרי">🤝 תמיד מותר</button>';
    if(!blockedNow.has(e.ip))b+='<button class="btn" data-shblock="'+esc(e.ip)+'">🚫 חסימה קבועה</button>';return b;};
  const desc=e=>{const d=e.detail||{};const k=KIND[e.kind]||['🛡️',e.kind,''];let t=k[2];
    if(e.kind==='probe'||e.kind==='direct')t=(d.path?'<span dir="ltr">'+esc(d.path)+'</span>':'')+(d.min?' · נחסם '+(d.min>=60?Math.round(d.min/60)+' שע׳':d.min+' דק׳'):d.shared?' · כתובת משותפת — רק הבקשה נחסמה':'');
    else if(e.kind==='flood')t='נחסם ל-'+(d.min||10)+' דקות';
    else if(e.kind==='ddos')t=num(e.n)+' חיבורים בדקה (בדרך כלל '+num(d.base)+') · '+num(d.blocked)+' כתובות נחסמו'+((d.top||[]).length?'<br><small class="muted" dir="ltr">'+esc(d.top.join(', '))+'</small>':'');
    else if(e.kind==='db_rate')t=num(e.n)+' בקשות כתיבה בדקה · חסום '+(d.min||10)+' דק׳'+(d.user?' · <small class="muted">חשבון '+esc(String(d.user).slice(0,8))+'…</small>':'');
    else if(e.kind==='ssh')t=num(e.n)+' כישלונות · חסום ל-SSH '+(d.min||60)+' דק׳';
    else if(e.kind==='load'||e.kind==='down')t=esc(d.why||'');
    if(d.ua)t+='<br><small class="muted" dir="ltr">'+esc(String(d.ua).slice(0,90))+'</small>';return t;};
  const KF=[['','הכל'],['flood','🛡️ הצפות'],['ddos','🚨 DDoS'],['probe','🚨 פריצה'],['direct','⚡ ישירות'],['ssh','🔑 SSH'],['db_rate','🗄️ מסד'],['load','🔥 עומס / נפילה']];
  h+='<div class="card"><h2>📜 מה קרה (7 ימים)</h2><div class="row" style="gap:8px;flex-wrap:wrap"><input id="shQ" placeholder="סינון לפי כתובת" dir="ltr" style="max-width:200px"><select id="shK">'+KF.map(([k,l])=>'<option value="'+k+'">'+l+'</option>').join('')+'</select></div>'+
    '<div class="tw" tabindex="0" role="region" aria-label="יומן אבטחה"><table><thead><tr><th>מתי</th><th>מה</th><th>כתובת</th><th>פרטים</th><th></th></tr></thead><tbody id="shTb"></tbody></table></div></div>';
  /* --- חסימות במסד --- */
  h+='<div class="card"><h2>🗄️ חסומים עכשיו במסד (Supabase)</h2>'+(dblocks.length?'<div class="tw"><table><thead><tr><th>מי</th><th>עד</th><th>בקשות</th><th></th></tr></thead><tbody>'+
    dblocks.map(b=>'<tr><td dir="ltr" style="text-align:right">'+esc(b.k.startsWith('u:')?'חשבון '+b.k.slice(2,10)+'…':b.ip)+(b.k.startsWith('u:')&&b.ip?'<br><small class="muted">'+esc(b.ip)+'</small>':'')+'</td><td>'+when(b.until)+'</td><td>'+num(b.n)+'</td><td><button class="btn sec" data-shrb="'+esc(b.k)+'">✅ שחרור</button></td></tr>').join('')+
    '</tbody></table></div>':'<p class="muted">אין. ✅</p>')+'<p class="muted" style="font-size:13px">מי שעובר '+num(c.db_user_per_min)+' בקשות כתיבה בדקה (משתמש מחובר — לפי החשבון, אורח — לפי הכתובת) נחסם ל-'+num(c.db_block_min)+' דקות. מנהלים ומפתח השרת לא נחסמים.</p></div>';
  /* --- רשימות --- */
  const list=(arr,attr,empty)=>(arr&&arr.length)?'<div class="shlist">'+arr.map(x=>'<span dir="ltr"><b>'+esc(x.ip)+'</b>'+(x.note?' <small class="muted" dir="rtl">'+esc(x.note)+'</small>':'')+'<button '+attr+'="'+esc(x.ip)+'" aria-label="הסרה של '+esc(x.ip)+'">✕</button></span>').join('')+'</div>':'<p class="muted" style="margin:4px 0">'+empty+'</p>';
  h+='<div class="card"><h2>📋 רשימות</h2><h3 style="margin:6px 0 2px">🚫 חסומים לתמיד (כל האתר)</h3>'+list(c.blocked,'data-shbx','אין.')+
    '<h3 style="margin:10px 0 2px">🤝 מותרים תמיד (לא מוגבלים)</h3><p class="muted" style="margin:0;font-size:13px">למשל שרת הסינון של נטפרי, אם רואים שהוא נחסם. אפשר גם טווח (1.2.3.0/24). גם הכתובות ב-🔐 אבטחה ← "לא מוגבלות" נחשבות.</p>'+list(c.allow,'data-shax','אין. (כתובות שיותר מ-3 חשבונות נכנסים מהן מזוהות לבד כמשותפות)')+
    '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px"><input id="shIp" dir="ltr" placeholder="1.2.3.4" aria-label="כתובת" style="max-width:200px"><input id="shNote" placeholder="הערה (לא חובה)" aria-label="הערה" style="max-width:200px"><button class="btn" id="shAddB">🚫 לחסום</button><button class="btn sec" id="shAddA">🤝 להתיר</button></div></div>';
  /* --- הגדרות --- */
  const inp=(k,l,min,max)=>'<label>'+l+'<input type="number" id="sh_'+k+'" min="'+min+'" max="'+max+'" value="'+esc(c[k])+'"></label>';
  h+='<div class="card"><h2>⚙️ הגדרות</h2><div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:8px">'+
    '<button class="btn'+(serverOn?' sec':'')+'" id="shOn">'+(serverOn?'⏸️ לכבות את חומת ההגנה בשרת':'▶️ להפעיל את חומת ההגנה בשרת')+'</button>'+
    '<button class="btn'+(dbOn?' sec':'')+'" id="shDb">'+(dbOn?'⏸️ לכבות את ההגבלה במסד':'▶️ להפעיל את ההגבלה במסד')+'</button></div>'+
    '<div class="shgrid">'+inp('rate','חיבורים חדשים בשנייה לכתובת',5,10000)+inp('burst','בבת אחת',20,100000)+inp('conns','חיבורים פתוחים לכתובת',20,100000)+inp('block_min','דקות חסימה על הצפה',1,1440)+
    inp('shared_mult','כתובת משותפת (נטפרי) — פי',1,100)+inp('probe_hours','שעות חסימה על ניסיון פריצה',0,720)+inp('direct_min','דקות חסימה על פנייה ישירה',0,1440)+inp('ssh_max','ניחושי SSH עד חסימה (0=כבוי)',0,1000)+
    inp('db_user_per_min','כתיבות בדקה במסד (משתמש)',0,100000)+inp('db_ip_per_min','כתיבות בדקה במסד (אורח לפי IP)',0,100000)+inp('db_block_min','דקות חסימה במסד',1,1440)+'</div>'+
    '<h3 style="margin:12px 0 4px">🔔 התראה מיידית לטלפון על</h3><div class="shgrid">'+ALERTS.map(([k,l])=>'<label><span>'+l+'</span><input type="checkbox" data-shal="'+k+'"'+(al[k]?' checked':'')+'></label>').join('')+'</div>'+
    '<p class="muted" style="font-size:13px">אותו סוג מאותה כתובת — לכל היותר פעם בחצי שעה, וכל סוג לכל היותר פעם ב-3 דקות (עם "ועוד X"), כדי שהטלפון לא יוצף. כל ההתראות נעצרות גם מ-🔐 אבטחה ← התראות למנהל.</p>'+
    '<button class="btn" id="shSave" style="margin-top:6px">💾 שמירה</button> <button class="btn sec" id="shDef">↩️ ברירות מחדל</button></div>';
  /* --- הסבר כן --- */
  h+='<div class="card"><h2>ℹ️ מה ההגנה הזו יכולה ומה לא</h2><ul style="margin:0;padding-inline-start:18px;line-height:1.7">'+
    '<li>✅ <b>עוצרת:</b> בוט או סקריפט שמציף מכתובת אחת או מכמה עשרות, סורקים שמחפשים פרצות, ניחוש סיסמאות לשרת, פנייה ישירה לשרת המחירים, והצפת בקשות למסד.</li>'+
    '<li>⚠️ <b>לא יכולה לעצור לבד:</b> התקפה גדולה מאוד (אלפי מחשבים, או כמות מידע שממלאת את קו האינטרנט של השרת). במקרה כזה החסימה בשרת עובדת, אבל הקו עצמו מלא — וזה אפשרי לעצור רק לפני שהתנועה מגיעה לשרת.</li>'+
    '<li>☁️ <b>Supabase</b> כבר נמצא מאחורי הגנה כזו של הספק שלו. האתר עצמו (השרת באורקל) לא.</li>'+
    '<li>💡 <b>אם תהיה התקפה גדולה:</b> אפשר להדליק את הענן הכתום של Cloudflare (Proxied) על yamshopping.com ו-www — זה חינם, והדומיין כבר מנוהל שם. לפני כן כדאי לבדוק שנטפרי עדיין פותחים את האתר דרך Cloudflare, ולהגדיר בשרת את הכתובת האמיתית של המשתמשים. לא מומלץ להדליק סתם, רק כשצריך.</li></ul></div>';
  h+='</div>';m.innerHTML=h;
  /* --- יומן: ציור וסינון --- */
  const draw=()=>{const q=($s('#shQ').value||'').trim(),k=$s('#shK').value;const rows=events.filter(e=>(!k||e.kind===k||(k==='load'&&['down','up'].includes(e.kind)))&&(!q||(e.ip||'').includes(q)));
    $s('#shTb').innerHTML=rows.slice(0,300).map(e=>{const kk=KIND[e.kind]||['🛡️',e.kind];const g=geoTxt((e.detail||{}).geo);
      return '<tr><td style="white-space:nowrap" data-l="">'+when(e.at)+' <small class="muted">('+ago(e.at)+')</small></td><td data-l="">'+kk[0]+' <b>'+esc(kk[1])+'</b>'+(e.src==='db'?' <span class="shchip">מסד</span>':e.src==='api'?' <span class="shchip">API</span>':'')+'</td>'+
        '<td data-l="כתובת"><bdi dir="ltr"><b>'+esc(e.ip||'—')+'</b></bdi>'+(g?'<br><small class="muted">'+esc(g)+'</small>':'')+'</td><td data-l="">'+desc(e)+'</td><td data-l="">'+actions(e)+'</td></tr>';}).join('')||'<tr><td colspan="5" class="muted">'+(events.length?'אין התאמות':'✅ שקט. לא נחסם כלום ב-7 הימים האחרונים.')+'</td></tr>';};
  draw();$s('#shQ').oninput=draw;$s('#shK').onchange=draw;
  m.querySelectorAll('[data-shh]').forEach(b=>b.onclick=()=>{hours=+b.dataset.shh;try{sessionStorage.setItem('shHours',hours);}catch(e){}m.querySelectorAll('[data-shh]').forEach(x=>x.className='btn'+(+x.dataset.shh===hours?'':' sec'));$s('#shChart').innerHTML=chart(load,hours);});
  const again=()=>VIEWS_shield();
  const addTo=async(key,ip,note)=>{ip=String(ip||'').trim();if(!validIp(ip)){flash('⚠️ כתובת לא תקינה');return;}const cur=await getCfg('shield');const arr=Array.isArray(cur[key])?cur[key]:[];
    if(arr.some(x=>x.ip===ip)){flash('כבר ברשימה');return;}
    if(key==='blocked'&&!(await uiConfirm('לחסום את '+ip+' מכל האתר?')))return;
    const other=key==='blocked'?'allow':'blocked';const patch={[key]:arr.concat([{ip,note:String(note||'').slice(0,80),at:new Date().toISOString()}]).slice(-500)};
    if(Array.isArray(cur[other]))patch[other]=cur[other].filter(x=>x.ip!==ip);
    if(key==='allow')patch.unblock=(Array.isArray(cur.unblock)?cur.unblock:[]).filter(u=>Date.now()-new Date(u.at).getTime()<15*60e3).concat([{ip,at:new Date().toISOString()}]);
    if(await saveCfg('shield',patch,key==='blocked'?'🚫 נחסם — בשרת תוך חצי דקה':'🤝 נוסף למותרים — משתחרר תוך חצי דקה'))again();};
  const delFrom=async(key,ip)=>{const cur=await getCfg('shield');if(await saveCfg('shield',{[key]:(cur[key]||[]).filter(x=>x.ip!==ip)},'✔️ הוסר'))again();};
  m.querySelector('#shMain').addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
    if(d.shun){const cur=await getCfg('shield');const u=(Array.isArray(cur.unblock)?cur.unblock:[]).filter(x=>Date.now()-new Date(x.at).getTime()<15*60e3).concat([{ip:d.shun,at:new Date().toISOString()}]);
      if(await saveCfg('shield',{unblock:u},'✅ ישוחרר בשרת תוך חצי דקה'))b.disabled=true;}
    else if(d.shdb){const {error}=await sb.from('rate_blocks').delete().eq('ip',d.shdb);if(error)flash('⚠️ '+error.message);else{flash('✅ שוחרר');again();}}
    else if(d.shrb){const {error}=await sb.from('rate_blocks').delete().eq('k',d.shrb);if(error)flash('⚠️ '+error.message);else{flash('✅ שוחרר');again();}}
    else if(d.shallow)addTo('allow',d.shallow,'');
    else if(d.shblock)addTo('blocked',d.shblock,'');
    else if(d.shbx)delFrom('blocked',d.shbx);
    else if(d.shax)delFrom('allow',d.shax);});
  $s('#shAddB').onclick=()=>addTo('blocked',$s('#shIp').value,$s('#shNote').value);
  $s('#shAddA').onclick=()=>addTo('allow',$s('#shIp').value,$s('#shNote').value);
  $s('#shOn').onclick=async()=>{if(serverOn&&!(await uiConfirm('לכבות את חומת ההגנה בשרת? כל החסימות בשרת יורדו תוך חצי דקה.')))return;if(await saveCfg('shield',{on:!serverOn},serverOn?'⏸️ כבוי':'▶️ פעיל'))again();};
  $s('#shDb').onclick=async()=>{if(await saveCfg('shield',{db_off:dbOn},dbOn?'⏸️ ההגבלה במסד כבויה':'▶️ ההגבלה במסד פעילה'))again();};
  $s('#shSave').onclick=async()=>{const p={};Object.keys(DEF).forEach(k=>{const v=parseInt($s('#sh_'+k).value,10);if(Number.isFinite(v))p[k]=v;});
    const a={};m.querySelectorAll('[data-shal]').forEach(x=>a[x.dataset.shal]=x.checked);a.up=a.down;p.alerts=a;
    if(p.rate<10||p.burst<50){if(!(await uiConfirm('ספים נמוכים מאוד עלולים לחסום משתמשים אמיתיים. לשמור בכל זאת?')))return;}
    if(await saveCfg('shield',p,'💾 נשמר — בשרת תוך חצי דקה'))again();};
  $s('#shDef').onclick=async()=>{if(await saveCfg('shield',Object.assign({},DEF,{alerts:ALERT_DEF}),'↩️ חזר לברירות המחדל'))again();};
});
let VIEWS_shield=()=>{const b=document.querySelector('#boNav [data-s="shield"]');if(b)b.click();};

/* מונה על הכפתור בתפריט: אירועים חשובים מאז הביקור האחרון במסך */
async function shBadge(){try{if(!(typeof isAdmin==='function'&&isAdmin())||!sb)return;let seen='';try{seen=localStorage.getItem('shSeen')||'';}catch(e){}
  const since=seen&&Date.now()-new Date(seen).getTime()<7*864e5?seen:new Date(Date.now()-864e5).toISOString();
  const {count}=await sb.from('security_events').select('id',{count:'exact',head:true}).gt('at',since).in('kind',['flood','ddos','probe','down','load','db_rate']);
  const b=document.querySelector('#boShN');if(b){b.hidden=!count;b.textContent=count>99?'99+':count;}}catch(e){}}
const nav=document.querySelector('#boNav');if(nav)nav.addEventListener('click',()=>setTimeout(shBadge,500));
setTimeout(shBadge,4000);

/* בלוח הראשי של הבק אופיס: שורה קצרה על מצב ההגנה, עם קישור */
window.boAfter&&window.boAfter('dash',async main=>{if(!main||main.querySelector('#shDash')||!(typeof isAdmin==='function'&&isAdmin()))return;
  const since=new Date(Date.now()-864e5).toISOString();
  const [{data:ev},{data:ld}]=await Promise.all([sb.from('security_events').select('kind').gte('at',since).limit(1000),sb.from('shield_load').select('at,data').order('at',{ascending:false}).limit(1)]);
  if(!ev)return;const n=k=>ev.filter(e=>e.kind===k).length;const last=ld&&ld[0];const alive=last&&Date.now()-new Date(last.at).getTime()<4*60e3;
  const bad=n('ddos')||n('down');const txt=(alive?(last.data.attack?'🚨 מצב התקפה עכשיו · ':'')+'חומת ההגנה פעילה':'⏳ חומת ההגנה עוד לא פעילה בשרת')+' · 24 שעות: '+n('flood')+' הצפות, '+(n('probe')+n('ssh'))+' ניסיונות פריצה'+(n('ddos')?', '+n('ddos')+' התקפות עומס':'')+(n('down')?', '+n('down')+' נפילות':'');
  main.insertAdjacentHTML('afterbegin','<div class="card" id="shDash" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap'+(bad?';border-color:#d64545':'')+'"><b>🛡️</b><span style="flex:1">'+esc(txt)+'</span><button class="btn sec" id="shDashGo">לפרטים</button></div>');
  main.querySelector('#shDashGo').onclick=()=>VIEWS_shield();});
})();
