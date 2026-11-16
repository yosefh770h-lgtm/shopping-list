
/* ================= 🕵️ מי מעתיק את המחירים? (בק אופיס ← 💰 מחירים) =================
   שרת המחירים רושם כל בקשה, ובכל שעה מעלה ל-scrape_watch את מי שנראה חשוד: כלי אוטומטי, פנייה ישירה לשרת ולא דרך האתר,
   מעבר על הרבה סניפים או מוצרים, המון בקשות. לכל כתובת: מיקום משוער וספק (geo), חשבונות באתר שקשורים אליה (accounts),
   ומי זה כשידוע (השרת שלנו, הבדיקות של Claude, מנוע חיפוש). מכאן חוסמים כתובת (site_config 'scrape'), והשרת חוסם אותה תוך שעה.
   השרת שלנו וכתובות פנימיות אף פעם לא נחסמים. */
(function(){
const SW_WHY={bot:'🤖 כלי אוטומטי',direct:'⚡ פונה ישירות לשרת',direct_many:'⚡ הרבה פניות ישירות',stores:'🏪 עובר על הרבה סניפים',queries:'🔍 שואל על המון מוצרים',volume:'📈 המון בקשות',limited:'⛔ נעצר בהגבלה',blocked:'🚫 חסום וממשיך לנסות',hosting:'☁️ משרת בענן או VPN'};
const SW_LABEL={own:['🏠','השרת שלנו','הכתובת של השרת שהאתר רץ עליו. הוא בודק את עצמו מדי פעם. לא חשוד ואי אפשר לחסום.'],
  internal:['🏠','השרת עצמו (כתובת פנימית)','בקשה מתוך השרת עצמו, למשל בדיקה אוטומטית. לא גולש מבחוץ, ואי אפשר לחסום.'],
  claude:['🤖','הבדיקות של Claude','בדיקות שהרצתי מהענן כשעבדתי על האתר. לא מזיק.'],
  searchbot:['🔎','מנוע חיפוש או תצוגה מקדימה','גוגל, בינג, וואטסאפ וכדומה. נבדק גם לפי הספק, כדי שאי אפשר יהיה להתחזות.']};
const SW_HOW={login:['✅','נכנס/ה לאתר מהכתובת הזו'],signup:['✅','נרשם/ה לאתר מהכתובת הזו'],guest_signup:['✅','גלש/ה כאורח מהכתובת הזו ונרשם/ה אחר כך'],
  site:['❔','לפי הדפדפן — החשבון שהיה מחובר (לא מאומת, אפשר לזייף)'],guest:['👤','אורח בלי חשבון — אין מייל או שם']};
const swTool=ua=>{ua=String(ua||'');if(!ua.trim())return '❔ בלי זיהוי';
  const m=ua.match(/python-requests|python|curl|wget|scrapy|httpx|aiohttp|go-http-client|okhttp|node-fetch|axios|undici|java|headlesschrome|puppeteer|playwright|selenium|postman|powershell/i);
  if(m)return '🤖 '+m[0].toLowerCase();if(/googlebot|bingbot|whatsapp|facebookexternalhit|telegrambot/i.test(ua))return '🔎 '+(ua.match(/googlebot|bingbot|whatsapp|facebookexternalhit|telegrambot/i)[0]);
  if(/bot|spider|crawl/i.test(ua))return '🤖 רובוט';
  if(/iphone|ipad/i.test(ua))return '📱 אייפון';if(/android/i.test(ua))return '📱 אנדרואיד';if(/windows/i.test(ua))return '💻 מחשב Windows';if(/mac os/i.test(ua))return '💻 מק';return '💻 דפדפן';};
const flag=cc=>/^[A-Z]{2}$/.test(cc||'')?String.fromCodePoint(...[...cc].map(c=>0x1F1E6+c.charCodeAt(0)-65)):'🌍';
const place=g=>{g=g||{};const p=[g.city,g.region&&g.region!==g.city?g.region:'',g.country].filter(Boolean);return p.length?flag(g.country_code)+' '+p.join(', '):'';};
/* מפה קטנה: אריחים של OpenStreetMap (3×3) וסיכה במיקום המשוער */
function swMap(lat,lng){const z=9,n=2**z,x=(lng+180)/360*n,r=lat*Math.PI/180,y=(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n;
  const tx=Math.floor(x),ty=Math.floor(y),px=(x-tx)*256,py=(y-ty)*256;let t='';
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=((tx+dx)%n+n)%n,Y=ty+dy;if(Y<0||Y>=n)continue;
    t+='<img alt="" loading="lazy" src="https://tile.openstreetmap.org/'+z+'/'+X+'/'+Y+'.png" style="left:'+((dx+1)*256)+'px;top:'+((dy+1)*256)+'px">';}
  return '<div class="swmap" role="img" aria-label="מפה עם המיקום המשוער"><div class="swtiles" style="left:calc(50% - '+Math.round(256+px)+'px);top:calc(50% - '+Math.round(256+py)+'px)">'+t+'</div><span class="swpin" aria-hidden="true">📍</span><span class="swcircle" aria-hidden="true"></span></div>'+
    '<div class="muted" style="font-size:11px;margin-top:2px">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · <a href="https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lng+'#map=11/'+lat+'/'+lng+'" target="_blank" rel="noopener">פתיחה במפה גדולה</a></div>';}
/* עבר מ-💰 מחירים למסך משלו בקטגוריה 🛡️ בוטים ואבטחה */
const swRender=async main=>{if(!main||main.querySelector('#swCard')||!(typeof isAdmin==='function'&&isAdmin()))return;
  const html='<div class="card" id="swCard"><h2>🕵️ מי מעתיק את המחירים?</h2>'+
    '<p class="muted">שרת המחירים רושם כל בקשה ומסמן מי שנראה כמו העתקה: תוכנה אוטומטית, פנייה ישירה לשרת ולא דרך האתר, מעבר על הרבה סניפים או המון מוצרים. מתעדכן כל שעה. על כל חשוד חדש נשלחת התראה לטלפון ולתוסף הצוות. לחיצה על שורה מציגה את כל הפרטים.</p>'+
    '<div id="swBody" class="muted">טוען...</div></div>';
  main.insertAdjacentHTML('afterbegin',html);
  const box=main.querySelector('#swBody');
  const num=n=>(+n||0).toLocaleString('he-IL');
  const day=d=>{try{return new Date(d+'T12:00:00').toLocaleDateString('he-IL',{day:'numeric',month:'numeric'});}catch(e){return d;}};
  const when=d=>{if(!d)return '';try{return new Date(d).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}};
  let blocked=[];
  const saveBlocked=async(list,msg)=>{
    const {data:cur}=await sb.from('site_config').select('value').eq('key','scrape').maybeSingle();
    const v=Object.assign({},(cur&&cur.value)||{},{blocked:list});
    const {error}=await sb.from('site_config').upsert({key:'scrape',value:v,updated_at:new Date().toISOString()});
    if(error){flash('⚠️ '+error.message);return false;}blocked=list;flash(msg);return true;};
  const validIp=x=>/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(x)||/^[0-9a-f:]{3,39}(\/\d{1,3})?$/i.test(x);
  /* כתובת פנימית — השרת עצמו או רשת פרטית. אף פעם לא חוסמים */
  const internal=x=>/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(x)||/^(::1$|f[cd]|fe80:)/i.test(x);
  const v4=x=>{const m=String(x).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);return m?m.slice(1).reduce((a,o)=>a*256+(+o),0):null;};
  const inNet=(ip,net)=>{if(ip===net)return true;const [base,bits]=String(net).split('/');const a=v4(ip),b=v4(base),n=+bits;
    if(a===null||b===null||!(n>=0&&n<=32))return false;const size=2**(32-n);return Math.floor(a/size)===Math.floor(b/size);};
  const blockOf=ip=>blocked.find(b=>inNet(ip,b.ip));
  const isBlocked=ip=>!!blockOf(ip);
  let by={},ownIps=new Set();
  const label=r=>(r.geo&&r.geo.label)||(r.own?(internal(r.ip)?'internal':'own'):'');
  const mainAcc=r=>(r.accounts||[]).find(a=>['login','signup','guest_signup'].includes(a.how)&&(a.email||a.name));
  const whoLine=r=>{const lb=SW_LABEL[label(r)];if(lb)return '<span class="swlab">'+lb[0]+' '+esc(lb[1])+'</span>';
    const a=mainAcc(r);if(a)return '<span class="swacc">👤 '+esc(a.email||a.name)+'</span>';
    const s=(r.accounts||[]).find(a=>a.how==='site'&&a.email);if(s)return '<span class="muted">❔ אולי '+esc(s.email)+'</span>';
    return '<span class="muted">👤 אורח לא מזוהה</span>';};
  const blockBtn=r=>label(r)==='own'||label(r)==='internal'||internal(r.ip)||ownIps.has(r.ip)?'<span class="muted">🏠 לא נחסם</span>':
    isBlocked(r.ip)?'<button class="btn sec" data-swun="'+esc(blockOf(r.ip).ip)+'">✅ לבטל חסימה</button>':'<button class="btn" data-swblock="'+esc(r.ip)+'">🚫 לחסום</button>';
  const detail=r=>{const g=r.geo||{},lb=SW_LABEL[label(r)],eps=Object.entries(r.eps||{}).sort((a,b)=>b[1]-a[1]);
    const accs=r.accounts||[];const dir=r.n-r.site;
    let h='<div class="swdet"><div class="swdcol">';
    h+='<h4>🧭 מי זה</h4>'+(lb?'<p class="swlab">'+lb[0]+' <b>'+esc(lb[1])+'</b><br><small class="muted">'+esc(lb[2])+'</small></p>':'')+
      (accs.length?'<ul class="swacc-l">'+accs.map(a=>{const h2=SW_HOW[a.how]||['•',a.how];return '<li>'+h2[0]+' '+(a.email||a.name?'<b>'+esc(a.email||'')+'</b>'+(a.name?' · '+esc(a.name):''):'<span class="muted">מכשיר אורח'+(a.visits?' · '+num(a.visits)+' ביקורים':'')+'</span>')+'<br><small class="muted">'+esc(h2[1])+(a.at?' · '+when(a.at):'')+'</small></li>';}).join('')+'</ul>':
        (lb?'':'<p>👤 <b>אורח לא מזוהה.</b> מהכתובת הזו אף אחד לא נכנס לאתר עם חשבון, ולכן אין לנו מייל או שם. רואים רק את הכתובת, המיקום המשוער והכלי.</p>'));
    h+='<h4>📍 איפה (לפי כתובת ה-IP)</h4>'+(place(g)?'<p><b>'+place(g)+'</b></p>':'<p class="muted">אין מיקום לכתובת הזו'+(r.own?' (השרת שלנו)':'')+'.</p>')+
      (g.org?'<p>🏢 ספק / ארגון: <b dir="ltr">'+esc(g.org)+'</b>'+(g.asn?' <small class="muted" dir="ltr">AS'+esc(g.asn)+'</small>':'')+'</p>':'')+
      (g.hosting?'<p class="swwarn">☁️ <b>שרת בענן או VPN.</b> הכתובת שייכת לחברת שרתים, לא לבית או לטלפון. בדרך כלל זו תוכנה שרצה על שרת, או אדם שמסתיר את המיקום שלו. המיקום כאן הוא של השרת, לא שלו.</p>':
        g.org?'<p class="muted">🏠 נראה כמו חיבור רגיל של בית או טלפון.</p>':'')+
      (g.lat!=null&&g.lng!=null?swMap(+g.lat,+g.lng):'')+
      '<p class="muted swnote">ℹ️ <b>מה זה IP?</b> הכתובת של המחשב או הטלפון באינטרנט, כמו מספר טלפון. לפיה יודעים בערך באיזו עיר האדם נמצא ומי ספק האינטרנט שלו, אבל לא כתובת מדויקת או שם. את השם והמייל אפשר לדעת רק אם האדם נכנס לאתר עם חשבון מאותה כתובת.</p>';
    h+='</div><div class="swdcol"><h4>📦 מה עשה</h4><ul class="swfacts">'+
      '<li>📅 '+(r.days>1?r.days+' ימים · ':'')+'מ-'+when(r.first_at)+' עד '+when(r.last_at)+'</li>'+
      '<li>📨 <b>'+num(r.n)+'</b> בקשות'+(dir?' · ⚡ '+num(dir)+' ישירות לשרת':'')+(r.site?' · 🌐 '+num(r.site)+' דרך האתר':'')+'</li>'+
      (r.limited?'<li>⛔ '+num(r.limited)+' נעצרו בהגבלת הקצב</li>':'')+(r.blocked?'<li>🚫 '+num(r.blocked)+' נחסמו</li>':'')+
      '<li>🏪 '+num(r.stores)+' סניפים שונים · 🔍 '+num(r.queries)+' מוצרים שונים · 🏙️ '+num(r.cities)+' ערים</li>'+
      (eps.length?'<li>🔗 '+eps.map(([k,n])=>'<span dir="ltr">/'+esc(k)+'</span> '+num(n)).join(' · ')+'</li>':'')+'</ul>'+
      ((r.samples||[]).length?'<h4>🔍 מוצרים שחיפש</h4><p class="swtags">'+r.samples.map(x=>'<span class="swchip">'+esc(x)+'</span>').join('')+(r.queries>r.samples.length?' <small class="muted">ועוד '+num(r.queries-r.samples.length)+'</small>':'')+'</p>':'')+
      ((r.city_list||[]).length?'<h4>🏙️ ערים שחיפש</h4><p class="swtags">'+r.city_list.map(x=>'<span class="swchip">'+esc(x)+'</span>').join('')+'</p>':'')+
      '<h4>🛠️ הכלים</h4><ul class="swfacts">'+((r.uas&&r.uas.length?r.uas:[r.ua])).map(u=>'<li>'+esc(swTool(u))+'<br><small class="muted" dir="ltr">'+esc(u||'(ריק)')+'</small></li>').join('')+'</ul>'+
      ((r.reasons||[]).length?'<h4>🚨 למה חשוד</h4><p>'+r.reasons.map(x=>'<span class="swchip hot">'+esc(SW_WHY[x]||x)+'</span>').join('')+'</p>':'')+
      '<div style="margin-top:8px">'+blockBtn(r)+'</div></div></div>';
    return h;};
  const run=async()=>{
    const since=new Date(Date.now()-7*864e5).toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
    const [{data:rows,error},{data:cf}]=await Promise.all([sb.from('scrape_watch').select('*').gte('day',since).order('day',{ascending:false}).limit(1000),
      sb.from('site_config').select('value').eq('key','scrape').maybeSingle()]);
    if(error){box.textContent='⚠️ צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)';return;}
    blocked=Array.isArray(cf&&cf.value&&cf.value.blocked)?cf.value.blocked.filter(b=>b&&b.ip):[];
    const all=rows||[];const tot=all.filter(r=>r.ip==='*'),ips=all.filter(r=>r.ip!=='*');
    ownIps=new Set(ips.filter(r=>r.own).map(r=>r.ip));
    const t0=tot[0]||{n:0,site:0,ips:0,limited:0,blocked:0};
    by={};ips.forEach(r=>{const o=by[r.ip];if(!o){by[r.ip]=Object.assign({},r,{days:1,reasons:[...(r.reasons||[])],accounts:[...(r.accounts||[])]});return;}
      o.days++;o.n+=r.n;o.site+=r.site;o.limited+=r.limited;o.blocked+=r.blocked;o.stores=Math.max(o.stores,r.stores);o.queries=Math.max(o.queries,r.queries);
      if(r.first_at&&(!o.first_at||r.first_at<o.first_at))o.first_at=r.first_at;
      o.score=Math.max(o.score,r.score);(r.reasons||[]).forEach(x=>{if(!o.reasons.includes(x))o.reasons.push(x);});
      (r.accounts||[]).forEach(a=>{if(!o.accounts.some(b=>b.how===a.how&&(b.id||b.guest)===(a.id||a.guest)))o.accounts.push(a);});});
    const list=Object.values(by).sort((a,b)=>b.score-a.score||b.n-a.n);
    const sus=list.filter(r=>r.score>=2),calm=list.filter(r=>r.score<2).slice(0,20);
    const tile=(n,l,sub)=>'<div class="pstile"><b>'+n+'</b><span>'+l+'</span>'+(sub?'<small>'+sub+'</small>':'')+'</div>';
    const known=sus.filter(r=>mainAcc(r)).length;
    let h='<div class="pstiles">'+
      tile(num(t0.n),'בקשות מחירים'+(t0.day?' ב-'+day(t0.day):''),num(t0.ips)+' כתובות שונות')+
      tile(t0.n?Math.round(100*t0.site/t0.n)+'%':'—','דרך האתר',num(t0.n-t0.site)+' ישירות לשרת')+
      tile(num(sus.length),'כתובות חשודות',(sus.length?(known?num(known)+' עם חשבון באתר':'אף אחד לא מחובר עם חשבון'):'✅ לא נמצאה העתקה'))+
      tile(num(blocked.length),'חסומים',num(tot.reduce((a,x)=>a+(x.limited|0),0))+' בקשות נעצרו בהגבלה השבוע')+'</div>';
    if(!all.length)h='<p>⏳ השרת עוד לא שלח נתונים. זה מתחיל אחרי שהקוד החדש מגיע לשרת (לבד, בריצה השעתית הבאה).</p>';
    const L=['כתובת','מי זה','איפה','בקשות','סניפים / מוצרים','כלי','למה חשוד',''];
    const row=r=>{const g=r.geo||{};
      return '<tr class="swrow" data-swip="'+esc(r.ip)+'" tabindex="0" aria-expanded="false"><td data-l="'+L[0]+'" style="text-align:right"><bdi dir="ltr"><b>'+esc(r.ip)+'</b></bdi><br><small class="muted">'+day(r.day)+(r.days>1?' · '+r.days+' ימים':'')+'</small></td>'+
        '<td data-l="'+L[1]+'" class="swwho">'+whoLine(r)+'</td>'+
        '<td data-l="'+L[2]+'">'+(place(g)?esc(place(g)):'<span class="muted">—</span>')+(g.org?'<br><small class="muted" dir="ltr">'+esc(g.org)+'</small>':'')+(g.hosting?'<br><span class="swchip hot">☁️ שרת / VPN</span>':'')+'</td>'+
        '<td data-l="'+L[3]+'"><b>'+num(r.n)+'</b><br><small class="muted">'+(r.n-r.site?'⚡ '+num(r.n-r.site)+' ישירות':'🌐 דרך האתר')+'</small></td>'+
        '<td data-l="'+L[4]+'">🏪 '+num(r.stores)+' · 🔍 '+num(r.queries)+'</td>'+
        '<td data-l="'+L[5]+'" title="'+esc(r.ua||'')+'">'+esc(swTool(r.ua))+'</td>'+
        '<td data-l="'+L[6]+'">'+((r.reasons||[]).map(x=>'<span class="swchip'+(['bot','stores','queries','volume','direct_many','hosting'].includes(x)?' hot':'')+'">'+esc(SW_WHY[x]||x)+'</span>').join('')||'<span class="muted">—</span>')+'</td>'+
        '<td data-l="'+L[7]+'"><button class="btn sec" data-swmore="'+esc(r.ip)+'">🔎 כל הפרטים</button></td></tr>';};
    const head='<thead><tr>'+L.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead>';
    if(sus.length)h+='<h3 style="margin:12px 0 4px">🚨 חשודים בהעתקה</h3><div class="tw" tabindex="0" role="region" aria-label="חשודים בהעתקה"><table>'+head+'<tbody>'+sus.map(row).join('')+'</tbody></table></div>';
    else if(all.length)h+='<p style="margin:10px 0">✅ <b>לא נמצא מי שמעתיק</b> ב-7 הימים האחרונים. כל הבקשות נראות כמו אנשים שמשתמשים באתר.</p>';
    if(calm.length)h+='<details style="margin-top:8px"><summary><b>👥 שאר הכתובות, שלא נראות חשודות ('+calm.length+')</b></summary><div class="tw" tabindex="0" role="region" aria-label="שאר הכתובות"><table>'+head+'<tbody>'+calm.map(row).join('')+'</tbody></table></div></details>';
    h+='<h3 style="margin:14px 0 4px">🚫 כתובות חסומות</h3>'+(blocked.length?'<div class="swbl">'+blocked.map(b=>{const r=by[b.ip];const lb=r&&SW_LABEL[label(r)];const bad=internal(b.ip)||ownIps.has(b.ip);
        return '<span dir="ltr"'+(bad?' class="swbad"':'')+'><b>'+esc(b.ip)+'</b>'+(lb?' <small dir="rtl">'+lb[0]+' '+esc(lb[1])+'</small>':'')+(b.note?' <small class="muted" dir="rtl">'+esc(b.note)+'</small>':'')+(bad?' <small dir="rtl">⚠️ לא נחסם בפועל — זה השרת שלנו</small>':'')+'<button data-swun="'+esc(b.ip)+'" aria-label="לבטל את החסימה של '+esc(b.ip)+'">✕</button></span>';}).join('')+'</div>':'<p class="muted" style="margin:4px 0">אין כתובות חסומות.</p>')+
      '<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px"><input id="swIp" dir="ltr" placeholder="1.2.3.4" aria-label="כתובת לחסימה (אפשר גם טווח, למשל 1.2.3.0/24)" style="max-width:220px"><input id="swNote" placeholder="הערה (לא חובה)" aria-label="הערה" style="max-width:220px"><button class="btn" id="swAdd">🚫 לחסום</button></div>'+
      '<p class="muted" style="margin:8px 0 0">🛡️ <b>ההגנה בשרת:</b> משתמש באתר עד 120 בקשות בדקה ו-5,000 ביום. פנייה ישירה לשרת (רק סקריפטים עושים את זה) עד 30 בדקה ו-1,500 ביום. חסימה נכנסת לתוקף בשרת תוך שעה, ולא חלה על האתר עצמו, רק על המחירים מהשרת. השרת שלנו וכתובות פנימיות אף פעם לא נחסמים.</p>'+
      '<p class="muted" style="margin:4px 0 0;font-size:11px">מיקום לפי <a href="https://db-ip.com" target="_blank" rel="noopener">IP Geolocation by DB-IP</a></p>';
    box.className='';box.innerHTML=h;
    const block=async(ip,note)=>{ip=String(ip||'').trim();if(!validIp(ip)){flash('⚠️ כתובת לא תקינה');return;}if(isBlocked(ip)){flash('כבר חסום');return;}
      if(internal(ip)||ownIps.has(ip)){flash('🏠 זו הכתובת של השרת שלנו — אי אפשר לחסום אותה');return;}
      if(!await uiConfirm('לחסום את '+ip+' משרת המחירים?'))return;
      if(await saveBlocked(blocked.concat([{ip,note:String(note||'').slice(0,80),at:new Date().toISOString()}]),'🚫 נחסם. השרת יחסום תוך שעה'))run();};
    const toggle=tr=>{const nx=tr.nextElementSibling;if(nx&&nx.classList.contains('swdrow')){nx.remove();tr.setAttribute('aria-expanded','false');return;}
      const r=by[tr.dataset.swip];if(!r)return;tr.insertAdjacentHTML('afterend','<tr class="swdrow"><td colspan="8">'+detail(r)+'</td></tr>');tr.setAttribute('aria-expanded','true');wire(tr.nextElementSibling);};
    const wire=root=>{
      root.querySelectorAll('[data-swblock]').forEach(b=>b.onclick=e=>{e.stopPropagation();const r=by[b.dataset.swblock];const a=r&&mainAcc(r);block(b.dataset.swblock,r?(a?(a.email||a.name)+' · ':'')+(place(r.geo).replace(/^\S+\s/,'')||'')+' · '+num(r.n)+' בקשות':'');});
      root.querySelectorAll('[data-swun]').forEach(b=>b.onclick=async e=>{e.stopPropagation();if(await saveBlocked(blocked.filter(x=>x.ip!==b.dataset.swun),'✅ החסימה בוטלה (בשרת תוך שעה)'))run();});};
    box.querySelectorAll('tr.swrow').forEach(tr=>{tr.onclick=e=>{if(e.target.closest('button:not([data-swmore])'))return;toggle(tr);};tr.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(tr);}};});
    wire(box);
    box.querySelector('#swAdd').onclick=()=>block(box.querySelector('#swIp').value,box.querySelector('#swNote').value);
    /* קישור מהתוסף / מההתראה: #admin-scrapers&ip=1.2.3.4 פותח את הפרטים של הכתובת */
    const want=(location.hash.match(/[&?]ip=([0-9a-fA-F:.]+)/)||[])[1];const tr=want&&box.querySelector('tr.swrow[data-swip="'+CSS.escape(want)+'"]');
    if(tr){tr.closest('details')&&(tr.closest('details').open=true);toggle(tr);tr.scrollIntoView({block:'center'});}};
  await run();};
window.boView&&window.boView('scrapers',async function(){const m=document.querySelector('#boMain');if(!m)return;m.innerHTML='';await swRender(m);});
})();
