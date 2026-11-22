
/* 🤖 מי מוריד את האפליקציה לאנדרואיד וכמה:
   1. באתר: לחיצה על "הורדת האפליקציה (APK)" נרשמת בשרת (מי — אם מחובר, אחרת מזהה המכשיר האנונימי; IP ומדינה נשמרים בשרת).
   2. באפליקציה: בפתיחה הראשונה בכל טלפון נרשם "הותקנה ונפתחה". אחרי כניסה לחשבון — השורות של המכשיר מצורפות לחשבון.
   3. בבק אופיס ← 👀 מבקרים: כמה הורידו, גרף לפי ימים, ומי הוריד — שם, מייל, עיר ומדינה, IP, מכשיר ומאיפה לחצו. */
(function(){
  const ua=navigator.userAgent||'',inApp=/YamShoppingApp\//.test(ua);
  const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)||'';localStorage.setItem(k,v);}catch(e){return '';}};
  const dev=()=>typeof guestId27==='function'?guestId27():'';
  /* באפליקציה: גם דגם הטלפון (למשל SM-A525F) מתוך ה-User-Agent — לא מזהה ייחודי, רק כדי לזהות התקנה מחדש באותו טלפון */
  const model=()=>{const m=ua.match(/Android [^;)]*; ([^;)]+?)(?: Build\/[^;)]*)?[;)]/);const x=m?m[1].replace(/[^A-Za-z0-9 ._()-]/g,'').trim().slice(0,30):'';return /^(K|wv|Linux|)$/.test(x)?'':x;};
  const dv=()=>{const d=(typeof device41==='function'?device41():'').replace(/^(אפליקציה APK|אתר) · /,'');const m=inApp?model():'';return m?d+' · '+m:d;};
  window.apkLog55=async function(kind,src){if(!sb)return;
    try{const {error}=await sb.rpc('apk_log',{p_kind:kind,p_src:src||'',p_device:dv(),p_dev:dev(),p_ver:(ua.match(/YamShoppingApp\/([0-9.]+)/)||[])[1]||''});
      if(!error&&kind==='download')ls('yam_apk_dl55',String(Date.now()));return !error;}catch(e){return false;}};
  /* פתיחה ראשונה של האפליקציה בטלפון הזה (מנסים שוב בפתיחה הבאה אם לא היה חיבור) */
  async function firstOpen(){if(!inApp||ls('yam_apk_open55'))return;if(await apkLog55('open','install'))ls('yam_apk_open55','1');}
  /* מי שנכנס לחשבון: מצרפים לחשבון את ההורדה / הפתיחה מהמכשיר הזה */
  async function claim(){if(!sb||!authUser||!(inApp||ls('yam_apk_dl55')))return;const k='yam_apk_claim55',v=authUser.id;if(ls(k)===v)return;
    try{const {error}=await sb.rpc('apk_claim',{p_dev:dev()});if(!error)ls(k,v);}catch(e){}}
  /* כל יום שבו האפליקציה נפתחה נרשם פעם אחת (ושוב אם נכנסו לחשבון או עדכנו את האפליקציה באותו יום) — כך רואים בבק אופיס את כל מי שמשתמש
     באפליקציה, לא משנה מאיפה הוריד אותה (האתר שלנו, אוגן פליי, קובץ שהועבר) ובאיזו גרסה */
  async function ping(){if(!inApp||!sb)return;const day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'}),ver=(ua.match(/YamShoppingApp\/([0-9.]+)/)||[])[1]||'',k='yam_apk_ping55',v=day+'|'+((authUser&&authUser.id)||'')+'|'+ver;
    if(ls(k)===v)return;try{const {error}=await sb.rpc('apk_ping',{p_dev:dev(),p_ver:ver,p_device:dv()});if(!error)ls(k,v);}catch(e){}}
  window.apkPing55=ping;
  /* 🟢 כל עוד האפליקציה פתוחה ומוצגת — כל 2 דקות מעדכנים שהטלפון עדיין בשימוש (כדי שיופיע ב"מי מחובר עכשיו", גם אורחים).
     אם עוד אין שורה להיום (למשל אחרי חצות) — שולחים דיווח רגיל */
  async function seen(){if(!inApp||!sb||document.hidden)return;try{const {data,error}=await sb.rpc('apk_seen',{p_dev:dev()});if(!error&&data===false){ls('yam_apk_ping55','-');ping();}}catch(e){}}
  setInterval(seen,120000);
  setTimeout(async()=>{await firstOpen();claim();ping();},4000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')ping();});
  {const _s=onSignedIn;onSignedIn=async function(){const r=await _s.apply(this,arguments);setTimeout(()=>{claim();ping();},3000);return r;};}

  /* ---------- בבק אופיס ---------- */
  const SRC={login:'מסך הכניסה',menu:'התפריט',link:'קישור #apk',install:'—',offline:'📴 האפליקציה האופליין'};
  const VIA=v=>v==='site'?'<small class="muted">🌐 הורד מהאתר שלנו</small>':v==='other'?'<span class="kd55 x">🔗 ממקום אחר</span>':'<small class="muted">מקור לא ידוע</small>';
  const when55=t=>{const d=new Date(t);return d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric'})+' '+d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});};
  const place=(r,adm)=>{const g=r.geo||{};const city=[g.city,g.region&&g.region!==g.city?g.region:'',g.country||(r.country==='IL'?'ישראל':r.country)].filter(Boolean).join(', ');
    let h=city?'📍 '+esc(city):(r.country?'📍 '+esc(r.country==='IL'?'ישראל':r.country):'<span class="muted">'+(r.ip&&r.geo==null?'המיקום יתעדכן תוך שעה':'לא ידוע')+'</span>');
    if(g.label==='own')h='🖥️ השרת שלנו';
    if(adm&&r.ip)h+='<br><small dir="ltr">'+(g.lat!=null?'<a href="https://www.openstreetmap.org/?mlat='+(+g.lat)+'&mlon='+(+g.lng)+'#map=11/'+(+g.lat)+'/'+(+g.lng)+'" target="_blank" rel="noopener noreferrer">'+esc(r.ip)+'</a>':esc(r.ip))+'</small>'+(g.org?'<br><small class="muted">'+esc(g.org)+(g.hosting?' · שרת/VPN':'')+'</small>':'');
    return h;};
  window.boAfter&&window.boAfter('guests',async main=>{if(!main||main.querySelector('#apk55'))return;
    const adm=typeof isAdmin==='function'&&isAdmin();
    const card=document.createElement('div');card.className='card';card.id='apk55';
    card.innerHTML='<h2>🤖 מי מוריד את האפליקציה וכמה</h2><p class="muted">כל לחיצה על "הורדת האפליקציה (APK)" באתר, וכל טלפון שבו האפליקציה נפתחה בפעם הראשונה (כלומר הותקנה). מי שלא מחובר מופיע כאורח — ואם נרשם או נכנס אחר כך, רואים מי זה.'+(adm?' IP ומיקום משוער (עיר) — לפי הכתובת, לא מדויק.':' IP מוצג רק למנהלים.')+(permOk('emails')?'':' המיילים מוסתרים — רק שמות.')+'</p>'+
      '<p class="muted">💡 כדי שכל הורדה תיספר, משתפים את הקישור <span dir="ltr">yamshopping.com/#apk</span> (נפתח חלון ההורדה). קישור ישיר לקובץ עצמו לא נספר.</p>'+
      '<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:6px"><select id="apk55d" style="max-width:150px"><option value="1">היום</option><option value="7">7 ימים</option><option value="30" selected>30 יום</option><option value="90">90 יום</option><option value="365">שנה</option></select>'+
      '<select id="apk55k" style="max-width:220px"><option value="">הורדות + פתיחות</option><option value="download">⬇️ רק הורדות</option><option value="open">📲 רק "הותקנה ונפתחה"</option><option value="other">🔗 רק מי שהוריד ממקום אחר</option><option value="off">📴 רק האפליקציה האופליין</option></select>'+
      '<select id="apk55w" style="max-width:200px"><option value="">כולם</option><option value="users">👤 רק משתמשים רשומים</option><option value="guests">רק אורחים</option></select><input id="apk55q" placeholder="חיפוש שם, מייל או עיר" style="max-width:200px"></div>'+
      '<div id="apk55b" class="muted">טוען...</div>'+
      '<h3>📱 מי משתמש באפליקציה — מכל מקום</h3><p class="muted">כל טלפון שבו האפליקציה נפתחה, לא משנה מאיפה הורידו אותה (האתר שלנו, אוגן פליי, קובץ שהועבר בוואטסאפ...) ובאיזו גרסה. נרשם פעם ביום לכל טלפון. "ממקום אחר" = לא הייתה לחיצה על ההורדה באתר שלנו מאותה רשת או מאותו חשבון ב-3 הימים שלפני ההתקנה (הערכה, לא ודאי).</p>'+
      '<p class="muted">🔄 בעמודת הגרסה: איזו גרסה יש עכשיו בכל טלפון, האם זו הגרסה האחרונה, ואם עדכן — מאיזו גרסה ומתי. נספר כל עדכון: מתוך האפליקציה, מהאתר או מכל מקום אחר (נרשם מ-2/11/2026).</p>'+
      '<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:6px"><select id="apk55v" style="max-width:240px" aria-label="סינון לפי גרסה"><option value="">כל הגרסאות</option><option value="new">✅ רק מי שבגרסה האחרונה</option><option value="old">⚠️ רק מי שבגרסה ישנה</option><option value="upd">🔄 רק מי שעדכן</option><option value="never">רק מי שלא עדכן מאז שהתקין</option><option value="now">🟢 רק מי שהאפליקציה פתוחה אצלו עכשיו</option><option value="reinst">🔁 רק מי שהסיר והתקין מחדש</option><option value="gone">🗑️ רק התקנות שהוסרו (או לא נפתחו חודש)</option></select></div>'+
      '<div id="apk55u" class="muted">טוען...</div>';
    main.prepend(card);
    let rows=[],plat=null,fol=null,offErr=null;
    const v=s=>card.querySelector(s).value;
    const draw=()=>{const k=v('#apk55k'),w=v('#apk55w'),q=v('#apk55q').trim().toLowerCase(),days=+v('#apk55d')||30;
      const list=rows.filter(r=>r.kind!=='off_live'&&(!k||(k==='other'?(r.kind==='open'||r.kind==='off_open')&&r.via==='other':k==='off'?/^off_/.test(r.kind)||r.src==='offline':r.kind===k))&&(!w||(w==='users'?!!r.user_id:!r.user_id))&&(!q||[r.name,r.email,r.ip,(r.geo||{}).city,(r.geo||{}).country].some(x=>String(x||'').toLowerCase().includes(q))));
      const box=card.querySelector('#apk55b');
      const dl=rows.filter(r=>r.kind==='download'),op=rows.filter(r=>r.kind==='open');
      const people=new Set(dl.map(r=>r.user_id||r.ip||r.id)).size;
      const kp='<div class="k55"><div><b>'+dl.length+'</b><small>⬇️ הורדות</small></div><div><b>'+people+'</b><small>👥 אנשים / מכשירים שהורידו</small></div>'+
        '<div><b>'+op.length+'</b><small>📲 הותקנה ונפתחה (טלפונים)</small></div><div><b>'+op.filter(r=>r.via==='other').length+'</b><small>🔗 מזה הורידו ממקום אחר (למשל אוגן פליי)</small></div><div><b>'+new Set(rows.filter(r=>r.user_id).map(r=>r.user_id)).size+'</b><small>👤 מזה רשומים (ידוע מי)</small></div>'+
        (plat!=null?'<div><b>'+plat+'</b><small>📱 משתמשים שנכנסו מהאפליקציה (מאז ומעולם)</small></div>':'')+
        (fol!=null?'<div><b>'+fol+'</b><small>🔔 עוקבים אחרי עדכוני האפליקציה (מייל + פעמון)</small></div>':'')+'</div>';
      /* גרף לפי ימים (או לפי שעות כשבוחרים "היום") */
      const nb=days===1?24:Math.min(days,90),step=days===1?36e5:Math.ceil(days/nb)*864e5,end=days===1?Math.ceil(Date.now()/36e5)*36e5:new Date(new Date().toDateString()).getTime()+864e5;
      const bins=Array.from({length:nb},()=>[0,0]);rows.forEach(r=>{if(/^off_/.test(r.kind))return;const i=nb-1-Math.floor((end-new Date(r.at))/step);if(i>=0&&i<nb)bins[i][r.kind==='download'?0:1]++;});
      const mx=Math.max(1,...bins.map(b=>b[0]+b[1]));
      const lab=t=>{const d=new Date(t);return days===1?d.getHours()+':00':d.getDate()+'/'+(d.getMonth()+1);};
      const chart='<div class="ch55" role="img" aria-label="גרף הורדות">'+bins.map((b,i)=>'<span title="'+lab(end-(nb-i)*step)+': '+b[0]+' הורדות, '+b[1]+' פתיחות"><i style="height:'+(b[0]/mx*100)+'%"></i><i class="o" style="height:'+(b[1]/mx*100)+'%"></i></span>').join('')+'</div>'+
        '<div class="chx55"><span>'+lab(end-nb*step)+'</span><span>'+lab(end-Math.ceil(nb/2)*step)+'</span><span>'+(days===1?'עכשיו':'היום')+'</span></div><div class="lg55"><i></i>הורדות <i class="o"></i>הותקנה ונפתחה</div>';
      /* 📴 האפליקציה האופליין: כמה טלפונים, כמה חיבורים, למה התחברו (אתר / אפליקציה) ואיך (בלוטות' / QR / קוד) */
      const sy=rows.filter(r=>r.kind==='off_sync'),cnt=f=>sy.filter(f).length;
      const offDevs=new Set(rows.filter(r=>/^off_/.test(r.kind)).map(r=>r.dev||'#'+r.id)).size,wk=new Set(sy.filter(r=>Date.now()-new Date(r.at)<7*864e5).map(r=>r.dev)).size;
      const offk='<h3 id="off55">📴 האפליקציה האופליין — כמה מחוברים</h3><div class="k55">'+[[offDevs,'📴 טלפונים עם האפליקציה האופליין שהתחברו'],[wk,'🟢 מזה התחברו ב-7 הימים האחרונים'],[sy.length,'🔗 חיבורים (נספר פעם ב-6 שעות לכל טלפון)'],
        [cnt(r=>/^site-/.test(r.src)),'🌐 חיבורים לאתר'],[cnt(r=>/^app-/.test(r.src)),'📱 חיבורים לאפליקציה הרגילה'],[cnt(r=>/-bt$/.test(r.src)),"🔵 בבלוטות'"],[cnt(r=>/-qr$/.test(r.src)),'🔳 ב-QR'],[cnt(r=>/-code$/.test(r.src)),'✉️ בקוד שיתוף'],
        [dl.filter(r=>r.src==='offline').length,'⬇️ הורדות של האופליין מהאתר'],[rows.filter(r=>r.kind==='off_open'&&r.via==='other').length,'🔗 אופליין שהגיעו ממקום אחר'],
        [new Set(rows.filter(r=>(r.kind==='off_live'||r.kind==='off_sync')&&Date.now()-new Date(r.at)<15*6e4).map(r=>r.dev)).size,'🟢 אופליין מחוברים עכשיו']].map(x=>'<div><b>'+x[0]+'</b><small>'+x[1]+'</small></div>').join('')+'</div>'+
        '<p class="muted">נספר כשאפליקציה אופליין מתחברת לאתר או לאפליקציה הרגילה (שם יש אינטרנט). חיבור בין שתי אפליקציות אופליין לא נספר, כי לשתיהן אין אינטרנט. החיבורים נספרים מ-22/11/2026.</p>'+offDevT();
      const OFFV={bt:"🔵 בלוטות'",qr:'🔳 QR',code:'✉️ קוד'};
      if(!list.length){box.className='';box.innerHTML=kp+offk+chart+'<p class="muted">אין הורדות בטווח הזה.</p>';return;}
      box.className='';box.innerHTML=kp+offk+chart+'<div class="tw" tabindex="0" role="region" aria-label="הורדות"><table><thead><tr><th>מתי</th><th>מה</th><th>מי</th><th>מאיפה</th><th>מכשיר</th><th>לחצו ב</th></tr></thead><tbody>'+
        list.map(r=>'<tr><td style="white-space:nowrap">'+when55(r.at)+'</td><td>'+(r.kind==='off_sync'?'<span class="kd55 o">📴 אופליין — התחברה '+(/^app-/.test(r.src)?'לאפליקציה':'לאתר')+' · '+(OFFV[String(r.src).split('-')[1]]||'')+'</span>'+(r.app_ver?'<br><small class="muted">גרסה '+esc(r.app_ver)+'</small>':''):r.kind==='off_open'?'<span class="kd55 o">📴 אופליין — נראתה בסנכרון</span>'+(r.app_ver?'<br><small class="muted">גרסה '+esc(r.app_ver)+'</small>':''):r.kind==='open'?'<span class="kd55 o">📲 הותקנה ונפתחה</span>'+(r.via?'<br>'+VIA(r.via):'')+(r.app_ver?'<br><small class="muted">גרסה '+esc(r.app_ver)+'</small>':''):'<span class="kd55">⬇️ הורדה</span>')+'</td>'+
          '<td>'+(r.user_id?'<b>'+esc(r.name||'משתמש/ת')+'</b>'+(r.guest?' <small class="muted">(הוריד/ה כאורח ונרשם/ה אחר כך)</small>':'')+(r.email?'<br><small class="muted" dir="ltr">'+esc(r.email)+'</small>':''):'<span class="muted">אורח/ת (לא מחובר)</span>')+'</td>'+
          '<td data-l="מאיפה">'+place(r,adm)+'</td><td data-l="מכשיר"><small>'+esc(r.device||'')+'</small></td>'+(r.kind!=='download'?'<td class="nol55"></td>':'<td data-l="לחצו ב"><small>'+esc(SRC[r.src]||r.src||'—')+'</small></td>')+'</tr>').join('')+'</tbody></table></div>'+
        '<p class="muted" style="margin-top:6px">'+list.length+' שורות</p>';};
    /* 📴 כל מכשיר אופליין בשורה: איזה מכשיר, גרסה, מתי ואיך התחבר, אצל מי — ומה צריך טיפול (גרסה ישנה, תקלות, שעון שזז, לא התחבר הרבה זמן) */
    const offDevT=()=>{const OV={bt:"🔵 בלוטות'",qr:'🔳 QR',code:'✉️ קוד'},od={};
      rows.filter(r=>/^off_/.test(r.kind)).forEach(r=>{const k=r.dev||'#'+r.id,x=od[k]=od[k]||{dev:r.dev,n:0,last:0,ver:'',device:'',who:new Set(),how:'',hat:0,via:'',live:0},t=+new Date(r.at);
        if(r.kind==='off_open')x.via=r.via||'';if((r.kind==='off_live'||r.kind==='off_sync')&&Date.now()-t<15*6e4)x.live=1;
        if(t>x.last){x.last=t;if(r.app_ver)x.ver=r.app_ver;if(r.device)x.device=r.device;}if(r.name)x.who.add(r.name);
        if(r.kind==='off_sync'){x.n++;if(t>x.hat){x.hat=t;x.how=r.src;}}});
      const ds=Object.values(od);if(!ds.length)return '';
      const top=ds.map(x=>x.ver).filter(Boolean).sort((a,b)=>vcmp(b,a))[0]||'';
      ds.forEach(x=>{const e=(offErr||[]).filter(r=>r.dev&&r.dev===x.dev),iss=[];
        if(top&&x.ver&&vcmp(x.ver,top)<0)iss.push('⬆️ גרסה ישנה ('+esc(x.ver)+') — כדאי להעביר אליו את '+esc(top));
        const ck=e.filter(r=>/שעון/.test(r.src||''));if(ck.length)iss.push('🕰️ '+esc(String(ck[0].msg).slice(0,90)));
        const er=e.filter(r=>!/שעון/.test(r.src||''));if(er.length){const w=typeof errExplain==='function'?errExplain(er[0]).what:er[0].msg;iss.push('🐞 '+er.length+' תקלות — '+esc(String(w).split(/\. /)[0].slice(0,90)));}
        if(Date.now()-x.last>14*864e5)iss.push('💤 לא התחבר '+Math.round((Date.now()-x.last)/864e5)+' ימים');
        x.iss=iss;});
      ds.sort((a,b)=>b.live-a.live||(b.iss.length?1:0)-(a.iss.length?1:0)||b.last-a.last);
      const bad=ds.filter(x=>x.iss.length).length,dn=d=>{const m=String(d||'').split(' · ');return esc((window.phName61&&phName61(m[0]))||m[0]||'מכשיר לא ידוע')+(m[1]?'<br><small class="muted">'+esc(m[1])+'</small>':'');};
      return '<h3 id="offd61">📴 מכשירים אופליין'+(bad?' · <span class="kd55 o">⚠️ '+bad+' צריכים טיפול</span>':' · <span class="kd55">✅ אין בעיות</span>')+'</h3>'+
        '<div class="tw" tabindex="0" role="region" aria-label="מכשירים אופליין"><table><thead><tr><th>מכשיר</th><th>גרסה</th><th>התחבר לאחרונה</th><th>הורד מ</th><th>חיבורים</th><th>אצל מי</th><th>מה צריך טיפול</th></tr></thead><tbody>'+
        ds.map(x=>'<tr><td data-l="מכשיר">'+(x.live?'🟢 ':'')+dn(x.device)+'</td><td data-l="גרסה"><b dir="ltr">'+esc(x.ver||'—')+'</b>'+(top&&x.ver&&vcmp(x.ver,top)>=0?' <span class="kd55">✅</span>':'')+'</td>'+
          '<td data-l="התחבר לאחרונה" style="white-space:nowrap">'+when55(new Date(x.last).toISOString())+(x.how?'<br><small class="muted">'+(/^app-/.test(x.how)?'📱 לאפליקציה':'🌐 לאתר')+' · '+(OV[x.how.split('-')[1]]||'')+'</small>':'')+'</td>'+
          '<td data-l="הורד מ">'+(x.via?VIA(x.via):'<small class="muted">—</small>')+'</td><td data-l="חיבורים">'+x.n+'</td><td data-l="אצל מי">'+([...x.who].map(esc).join(', ')||'<span class="muted">אורח/ת</span>')+'</td>'+
          '<td data-l="מה צריך טיפול">'+(x.iss.length?x.iss.map(t=>'<div class="kd55 o" style="display:block;margin:2px 0">'+t+'</div>').join(''):'<span class="kd55">✅ תקין</span>')+'</td></tr>').join('')+'</tbody></table></div>'+
        '<p class="muted">🟢 = מחובר עכשיו בבלוטות\' לאתר או לאפליקציה (מאופליין 1.4). "הורד מ": 🌐 = מי שסנכרן אותו הוריד את האופליין מהאתר שלנו בחודש שלפני (אותו חשבון או אותה רשת), 🔗 = הקובץ הגיע ממקום אחר. טלפון אופליין נראה כאן רק אחרי שהוא מסתנכרן פעם אחת עם האתר או עם האפליקציה הרגילה — לפני כן אין לו דרך לדווח.</p>'+
        (offErr==null?'<p class="muted">תקלות מהאופליין מופיעות כאן רק למנהל (יומן התקלות).</p>':'');};
    let act=null,latest='';
    if(window.apkVer57)apkVer57().then(x=>{if(x&&x.version){latest=String(x.version);drawU();}});
    const vcmp=(a,b)=>{a=String(a||'0').split('.').map(Number);b=String(b||'0').split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x-y;}return 0;};
    /* הגרסאות שהיו בטלפון לפי הסדר; אם אין היסטוריה — רק הגרסה הנוכחית */
    const vh=r=>{const a=(Array.isArray(r.vers)?r.vers:[]).filter(x=>x&&x.v);return a.length?a:(r.app_ver?[{v:r.app_ver,at:null}]:[]);};
    const vst=r=>{const ver=r.app_ver||'';return !ver?'':!latest?'':vcmp(ver,latest)>=0?'new':'old';};
    const onNow=r=>Date.now()-new Date(r.last_at)<5*6e4,sleep=r=>!r.next_at&&Date.now()-new Date(r.last_at)>30*864e5;
    /* 🔁 התקנה מחדש / הוסרה — לפי אותו חשבון (או אותה רשת לאורחים) + אותו דגם טלפון; "כנראה" כשאין התאמה מלאה */
    const inst56=r=>(onNow(r)?'<br><span class="kd55">🟢 פתוחה עכשיו</span>':'')+
      (r.prev_at?'<br><small class="kd55 o">🔁 '+(r.prev_sure?'':'כנראה ')+'הסיר/ה והתקין/ה מחדש</small><br><small class="muted">ההתקנה הקודמת בשימוש עד '+when55(r.prev_at)+'</small>':'')+
      (r.next_at?'<br><small class="kd55 x">🗑️ '+(r.next_sure?'':'כנראה ')+'הוסרה</small><br><small class="muted">הותקנה שוב ב-'+when55(r.next_at)+'</small>':sleep(r)?'<br><small class="muted">💤 לא נפתחה יותר מחודש — אולי הוסרה</small>':'');
    window.apkInst56=inst56;
    const drawU=()=>{const box=card.querySelector('#apk55u');if(act==null)return;
      if(typeof act==='string'){box.textContent=act;return;}
      const days=+v('#apk55d')||30,q=v('#apk55q').trim().toLowerCase(),w=v('#apk55w');
      const td=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
      const today=act.filter(r=>r.last_day===td).length,other=act.filter(r=>r.via==='other').length;
      const kp='<div class="k55"><div><b>'+act.length+'</b><small>📱 טלפונים שהשתמשו באפליקציה בטווח</small></div><div><b>'+today+'</b><small>☀️ השתמשו היום</small></div>'+
        '<div><b>'+other+'</b><small>🔗 מזה הורידו ממקום אחר</small></div><div><b>'+act.filter(r=>r.user_id).length+'</b><small>👤 ידוע מי (מחוברים)</small></div>'+
        (latest?'<div><b>'+act.filter(r=>vst(r)==='new').length+'</b><small>✅ בגרסה האחרונה ('+esc(latest)+')</small></div><div><b>'+act.filter(r=>vst(r)==='old').length+'</b><small>⚠️ בגרסה ישנה (עוד לא עדכנו)</small></div>':'')+
        '<div><b>'+act.filter(r=>vh(r).length>1).length+'</b><small>🔄 עדכנו את האפליקציה</small></div>'+
        '<div><b>'+act.filter(onNow).length+'</b><small>🟢 האפליקציה פתוחה עכשיו</small></div><div><b>'+act.filter(r=>r.prev_at).length+'</b><small>🔁 הסירו והתקינו מחדש</small></div></div>';
      /* כמה טלפונים בכל גרסה */
      const bv={};act.forEach(r=>{const k=r.app_ver||'?';bv[k]=(bv[k]||0)+1;});
      const vbar='<div class="vb55" aria-label="טלפונים לפי גרסה">'+Object.keys(bv).sort((a,b)=>vcmp(b,a)).map(k=>'<span class="'+(k==='?'?'':latest&&vcmp(k,latest)>=0?'n':'o')+'">'+(k==='?'?'גרסה לא ידועה':'גרסה '+esc(k))+' · <b>'+bv[k]+'</b></span>').join('')+'</div>';
      /* גרף: כמה טלפונים השתמשו בכל יום */
      const nb=Math.min(Math.max(days,7),90),cnt={};act.forEach(r=>(r.daily||[]).forEach(d=>{cnt[d]=(cnt[d]||0)+1;}));
      const dl=Array.from({length:nb},(_,i)=>{const d=new Date(Date.now()-(nb-1-i)*864e5);return d.toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});});
      const mx=Math.max(1,...dl.map(d=>cnt[d]||0)),lb=d=>{const p=d.split('-');return +p[2]+'/'+(+p[1]);};
      const chart='<div class="ch55" role="img" aria-label="גרף שימוש באפליקציה לפי ימים">'+dl.map(d=>'<span title="'+lb(d)+': '+(cnt[d]||0)+' טלפונים"><i class="u" style="height:'+((cnt[d]||0)/mx*100)+'%"></i></span>').join('')+'</div>'+
        '<div class="chx55"><span>'+lb(dl[0])+'</span><span>'+lb(dl[Math.floor(nb/2)])+'</span><span>היום</span></div><div class="lg55"><i class="u"></i>טלפונים שפתחו את האפליקציה באותו יום</div>';
      const list=act.filter(r=>(!w||(w==='users'?!!r.user_id:!r.user_id))&&(!q||[r.name,r.email,r.device].some(x=>String(x||'').toLowerCase().includes(q)))&&(v('#apk55k')!=='other'||r.via==='other'));
      const fv=v('#apk55v'),list2=list.filter(r=>!fv||(fv==='upd'?vh(r).length>1:fv==='never'?vh(r).length<=1:fv==='reinst'?!!r.prev_at:fv==='gone'?!!r.next_at||sleep(r):fv==='now'?onNow(r):vst(r)===fv));
      if(!list2.length){box.className='';box.innerHTML=kp+vbar+chart+'<p class="muted">אין שימוש באפליקציה בטווח הזה.</p>';return;}
      const dd=d=>{const p=String(d||'').split('-');return p.length===3?+p[2]+'/'+(+p[1]):'';};
      const vcell=r=>{const h=vh(r),st=vst(r);let o='<b dir="ltr">'+esc(r.app_ver||'—')+'</b>'+(st==='new'?' <span class="kd55">✅ אחרונה</span>':st==='old'?' <span class="kd55 o">⚠️ ישנה</span>':'');
        o+=h.length>1?'<br><small class="muted">🔄 עדכן: <span dir="ltr">'+h.map(x=>esc(x.v)).join(' → ')+'</span>'+(h[h.length-1].at?' ('+when55(h[h.length-1].at)+')':'')+'</small>'
          :'<br><small class="muted">לא עדכן'+(h[0]&&h[0].at?' · בגרסה הזו מ-'+when55(h[0].at).split(' ')[0]:'')+'</small>';return o;};
      box.className='';box.innerHTML=kp+vbar+chart+'<div class="tw" tabindex="0" role="region" aria-label="מי משתמש באפליקציה"><table><thead><tr><th>שימוש אחרון</th><th>מי</th><th>הורד מ</th><th>בכמה ימים</th><th>גרסה</th><th>מכשיר</th></tr></thead><tbody>'+
        list2.map(r=>'<tr><td style="white-space:nowrap">'+when55(r.last_at)+'</td><td>'+(r.user_id?'<b>'+esc(r.name||'משתמש/ת')+'</b>'+(r.email?'<br><small class="muted" dir="ltr">'+esc(r.email)+'</small>':''):'<span class="muted">אורח/ת (לא מחובר)</span>')+'</td>'+
          '<td data-l="הורד מ">'+VIA(r.via)+inst56(r)+'</td><td data-l="בכמה ימים">'+r.days_used+' <small class="muted">(מ-'+dd(r.first_day)+', '+r.opens+' פתיחות)</small></td>'+
          '<td data-l="גרסה">'+vcell(r)+'</td><td data-l="מכשיר"><small>'+esc(r.device||'')+'</small></td></tr>').join('')+'</tbody></table></div>'+
        '<p class="muted" style="margin-top:6px">'+list2.length+' טלפונים</p>';};
    const loadU=async()=>{const {data,error}=await sb.rpc('staff_apk_activity',{p_days:+v('#apk55d')||30});
      act=error?'⚠️ '+(/forbidden|42501/.test(error.message)?'אין לך הרשאה':'צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)'):(data||[]);drawU();};
    const load=async()=>{loadU();const {data,error}=await sb.rpc('staff_apk_downloads',{p_days:+v('#apk55d')||30});
      if(error){card.querySelector('#apk55b').textContent='⚠️ '+(/forbidden|42501/.test(error.message)?'אין לך הרשאה לראות מי הוריד':'צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)');return;}
      rows=data||[];draw();
      sb.from('client_errors').select('msg,src,dev,app_ver,created_at').like('src','📴 אופליין%').gt('created_at',new Date(Date.now()-30*864e5).toISOString()).order('created_at',{ascending:false}).limit(500)
        .then(({data,error})=>{offErr=error?null:(data||[]);draw();},()=>{});};
    if(adm)sb.rpc('admin_user_platforms').then(({data})=>{if(data){plat=data.filter(r=>r.app_at).length;draw();}},()=>{});
    sb.rpc('app_follow_count').then(({data})=>{if(typeof data==='number'){fol=data;draw();}},()=>{});
    card.querySelector('#apk55d').onchange=load;card.querySelector('#apk55v').onchange=drawU;['#apk55k','#apk55w'].forEach(s=>card.querySelector(s).onchange=()=>{draw();drawU();});card.querySelector('#apk55q').oninput=()=>{draw();drawU();};
    await load();});
  /* ⚠️ עדכון מתוך האפליקציה שלא הצליח — נשלח לשרת למה (סוג השגיאה, גרסה, דגם, wifi או סלולרי), כדי שבבק אופיס יראו מה הבעיה.
     http_418 / http_403 / bad_redirect / bad_file = כמעט תמיד סינון (נטפרי וכו') שעצר את הקובץ. ביטול של המשתמש לא נשלח */
  window.updFail61=async function(err){if(!inApp||!sb)return;
    try{const c=navigator.connection||{},t=String(c.type||''),net=/^(wifi|cellular|ethernet|none)$/.test(t)?t:(t?'other':'');
      /* הגרסה החדשה — לכל היותר 3 שניות, כדי שהדיווח לא יחכה (ולא ילך לאיבוד אם סוגרים את החלון) */
      let target='';try{const v=window.apkVer57&&await Promise.race([apkVer57(),new Promise(r=>setTimeout(()=>r(null),3000))]);target=(v&&v.version)||'';}catch(e){}
      /* גם גרסת האנדרואיד (למשל Android 14), כדי לדעת בדיוק איזה טלפון */
      const av=(ua.match(/Android ([0-9.]+)/)||[])[1]||'',device=av?dv().replace(/\bAndroid\b/,'Android '+av):dv();
      await sb.rpc('app_update_fail',{p_dev:dev(),p_ver:(ua.match(/YamShoppingApp\/([0-9.]+)/)||[])[1]||'',p_target:target,p_err:String(err||'error').slice(0,120),p_net:net,p_device:device});}catch(e){}};
  /* בבק אופיס ← 👀 מבקרים: מי לא הצליח לעדכן את האפליקציה ולמה */
  /* [כותרת, הסבר מלא]. install_<מספר> = הקובץ ירד ונבדק, ואנדרואיד (PackageInstaller) סירב להתקין:
     1 כללי, 2 נחסם, 4 קובץ פגום, 5 חתימה אחרת, 6 אין מקום, 7 לא מתאים לטלפון. install_ex = שגיאה בפתיחת ההתקנה עצמה */
  const WHY61=e=>{e=String(e||'');
    if(/^http_(418|403|451)|^bad_redirect|^bad_file/.test(e))return['🛡️ סינון עצר את ההורדה','הקובץ לא ירד: סינון האינטרנט (נטפרי וכו\') חסם אותו או החזיר דף חסימה במקומו. בדרך כלל זה עובר אחרי שהסינון מאשר את הקובץ החדש.'];
    /* "Invalid install mode: -1" — אנדרואיד דחה את בקשת ההתקנה עוד לפני שהתחילה, כאילו לא נאמר לו איזה סוג התקנה.
       האפליקציה שולחת תמיד "התקנה מלאה", אז משהו בטלפון משבש את הבקשה בדרך. נמצא ב-Samsung Galaxy S22 עם סינון הדרן
       (סינון שמנהל את הטלפון ומריץ אפליקציות בסביבה מוגבלת). מגרסה 2.2 האפליקציה פותחת במקרה כזה את מסך ההתקנה הרגיל של אנדרואיד */
    if(/Invalid install mode/i.test(e))return['🛡️ הטלפון לא נתן לפתוח את ההתקנה','הקובץ ירד במלואו ועבר בדיקה, אבל כשהאפליקציה ביקשה מאנדרואיד להתקין, הבקשה הגיעה משובשת ("Invalid install mode: -1"). האפליקציה שולחת תמיד בקשה תקינה, אז משהו בטלפון משבש אותה בדרך. כמעט תמיד זה סינון שמנהל את הטלפון (למשל הדרן). מה עושים עכשיו: להוריד את הגרסה החדשה מ-yamshopping.com בדפדפן ולהתקין ידנית, או לבקש מהסינון לאשר את העדכון. מגרסה 2.2 האפליקציה תעקוף את זה לבד ותפתח את מסך ההתקנה הרגיל של אנדרואיד.'];
    if(/^install_/.test(e)){
      if(/^install_2\b|restrict|block|polic|not allowed|DISALLOW|Security|permission/i.test(e))return['🛡️ הטלפון חסם את ההתקנה','הקובץ ירד במלואו ועבר בדיקה, אבל אנדרואיד סירב להתקין. זה קורה כשסינון שמנהל את הטלפון (הדרן וכדומה) מאשר כל אפליקציה וכל גרסה בנפרד, או כש"חוסם אוטומטי" של סמסונג דלוק. הפתרון: שהסינון יאשר את הגרסה החדשה.'];
      if(/^install_5\b/.test(e))return['📦 הותקנה ממקור אחר','האפליקציה בטלפון חתומה בחתימה אחרת (למשל הותקנה מחנות של הסינון), ולכן אנדרואיד לא מרשה לעדכן אותה מהאתר. מעדכנים מאותו מקום שממנו הותקנה.'];
      if(/^install_6\b/.test(e))return['💾 אין מקום בטלפון','הקובץ ירד, אבל אין בטלפון מספיק מקום פנוי כדי להתקין.'];
      if(/^install_(4|7)\b/.test(e))return['📦 הקובץ לא מתאים לטלפון','אנדרואיד אמר שהקובץ פגום או לא מתאים לגרסת האנדרואיד של הטלפון.'];
      return['📦 ההתקנה נכשלה','הקובץ ירד, אבל אנדרואיד לא הצליח להתקין. הקוד המדויק מופיע למטה.'];}
    if(/^too_big/.test(e))return['📏 הקובץ גדול מדי','הקובץ שהשרת שלח גדול מהמותר (מעל 60MB).'];
    if(/timeout|timed out|Unable to resolve|Failed to connect|reset|SSL|end of stream|http_5/i.test(e))return['📶 בעיית חיבור / שרת','ההורדה נקטעה באמצע: אינטרנט חלש, או שהשרת לא ענה.'];
    if(/^no_settings/.test(e))return['⚙️ אין מסך הרשאה להתקנה','בטלפון הזה אין את המסך "לאפשר התקנה ממקור זה" (כנראה הוסר או נחסם).'];
    return['❓ אחר','שגיאה לא מוכרת. הקוד המדויק מופיע למטה.'];};
  const ERR61=e=>WHY61(e)[0];
  /* דגם הטלפון בשם מוכר (סמסונג גלקסי S), למשל SM-S901B ← Galaxy S22 */
  const PH61=d=>{const m=String(d||'').match(/SM-S9(0[168]|1[168]|2[168]|3[168])/);if(!m)return '';const g={0:'22',1:'23',2:'24',3:'25'}[m[1][0]],k={1:'',6:'+',8:' Ultra'}[m[1][1]];return 'Samsung Galaxy S'+g+k;};
  window.phName61=PH61;
  /* 🐞 בלוח הראשי: תקלה שקרתה השבוע ב-3 מכשירים שונים או יותר (באתר או באפליקציה) — שורה בולטת עם הגרסה והדגם, לפני שמישהו מתלונן.
     רק למנהל (יומן התקלות פתוח רק לו) */
  window.boAfter&&window.boAfter('dash',async main=>{if(!main||main.querySelector('#err61d0'))return;
    const {data,error}=await sb.from('client_errors').select('msg,src,user_id,dev,ua,app_ver,device,ver').gt('created_at',new Date(Date.now()-7*864e5).toISOString()).neq('ver','collector').limit(1000);
    if(error||!Array.isArray(data)||!data.length)return;
    const g={};data.forEach(r=>{const k=r.msg+'|'+r.src,x=g[k]=g[k]||{r,d:new Set(),v:new Set(),m:new Set()};x.d.add(r.user_id||r.dev||r.ua);if(r.app_ver)x.v.add(r.app_ver);const md=String(r.device||'').split(' · ')[0];if(md&&!/^(Android|iOS) /.test(md))x.m.add(PH61(md)||md);});
    const top=Object.values(g).sort((a,c)=>c.d.size-a.d.size)[0];if(!top||top.d.size<3)return;
    const what=typeof errExplain==='function'?errExplain(top.r).what:top.r.msg;
    main.insertAdjacentHTML('afterbegin','<div class="card" id="err61d0" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-color:#d68a45"><b>🐞</b><span style="flex:1">'+
      esc('השבוע אותה תקלה קרתה ב-'+top.d.size+' מכשירים: '+String(what).split(/\. /)[0].slice(0,120)+(top.v.size?' · אפליקציה '+[...top.v].join(', '):' · באתר')+(top.m.size?' · '+[...top.m].slice(0,3).join(', '):''))+'</span><button class="btn sec" id="err61go">ליומן התקלות</button></div>');
    main.querySelector('#err61go').onclick=()=>{const b=document.querySelector('#boNav [data-s="errors"]');if(b)b.click();};});
  /* בלוח הראשי של הבק אופיס: אם השבוע נכשלו עדכונים — שורה בולטת עם קפיצה לפרטים */
  window.boAfter&&window.boAfter('dash',async main=>{if(!main||main.querySelector('#upf61d0'))return;
    const {data,error}=await sb.rpc('staff_app_update_errors',{p_days:7});if(error||!Array.isArray(data)||!data.length)return;
    main.insertAdjacentHTML('afterbegin','<div class="card" id="upf61d0" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-color:#d68a45"><b>⚠️</b><span style="flex:1">'+
      esc('השבוע נכשלו '+data.length+' עדכוני אפליקציה'+(data[0]?' · האחרון: '+WHY61(data[0].err)[0]+(PH61(data[0].device)?' ב-'+PH61(data[0].device):''):''))+'</span><button class="btn sec" id="upf61go">לפרטים</button></div>');
    main.querySelector('#upf61go').onclick=()=>{const b=document.querySelector('#boNav [data-s="guests"]');if(b)b.click();
      let n=0;const t=setInterval(()=>{const c=document.querySelector('#upf61');if(c||++n>40){clearInterval(t);if(c)c.scrollIntoView({behavior:'smooth',block:'start'});}},150);};});
  window.boAfter&&window.boAfter('guests',async main=>{if(!main||main.querySelector('#upf61'))return;
    const card=document.createElement('div');card.className='card';card.id='upf61';
    card.innerHTML='<h2>⚠️ עדכוני אפליקציה שנכשלו</h2><p class="muted">כל פעם שמישהו לחץ "לעדכן" באפליקציה וזה לא הצליח: מתי, מי, מאיזו גרסה לאיזו, סוג החיבור (wifi / סלולרי), הטלפון, והשגיאה המדויקת.</p>'+
      '<div class="row" style="gap:6px;margin-bottom:6px"><select id="upf61d" style="max-width:150px"><option value="1">היום</option><option value="7" selected>7 ימים</option><option value="30">30 יום</option><option value="90">90 יום</option></select></div><div id="upf61b" class="muted">טוען...</div>';
    /* למעלה בלשונית, ולא בסוף העמוד — שיראו מיד */
    main.prepend(card);
    const load=async()=>{const b=card.querySelector('#upf61b');const {data,error}=await sb.rpc('staff_app_update_errors',{p_days:+card.querySelector('#upf61d').value||7});
      if(error){b.textContent='⚠️ '+(/forbidden|42501/.test(error.message)?'אין לך הרשאה':'צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)');return;}
      const L=data||[];if(!L.length){b.textContent='אין עדכונים שנכשלו בטווח הזה 🙂';return;}
      const cnt={};L.forEach(r=>{const k=ERR61(r.err);cnt[k]=(cnt[k]||0)+1;});
      b.className='';b.innerHTML='<p>'+Object.entries(cnt).sort((a,c)=>c[1]-a[1]).map(([k,n])=>esc(k)+': <b>'+n+'</b>').join(' · ')+'</p>'+
        '<div class="tw" tabindex="0" role="region" aria-label="עדכונים שנכשלו"><table><thead><tr><th>מתי</th><th>מי</th><th>גרסה</th><th>חיבור</th><th>מכשיר</th><th>מה קרה</th></tr></thead><tbody>'+
        L.map(r=>'<tr><td style="white-space:nowrap">'+when55(r.at)+'</td><td>'+(r.user_id?'<b>'+esc(r.name||'משתמש/ת')+'</b>'+(r.email?'<br><small class="muted" dir="ltr">'+esc(r.email)+'</small>':''):'<span class="muted">אורח/ת</span>')+(r.ip?'<br><small dir="ltr">'+esc(r.ip)+'</small>':'')+'</td>'+
          '<td data-l="גרסה" dir="ltr">'+esc(r.app_ver||'?')+' → '+esc(r.target_ver||'?')+'</td><td data-l="חיבור">'+({wifi:'📶 Wi-Fi',cellular:'📱 סלולרי',ethernet:'🔌 כבל',none:'אין'}[r.net]||'<span class="muted">לא ידוע</span>')+'</td>'+
          '<td data-l="מכשיר">'+(PH61(r.device)?'<b>'+esc(PH61(r.device))+'</b><br>':'')+'<small>'+esc(r.device||'')+'</small></td><td data-l="מה קרה"><b>'+esc(WHY61(r.err)[0])+'</b><br><small>'+esc(WHY61(r.err)[1])+'</small><br><small class="muted" dir="ltr">'+esc(r.err)+'</small></td></tr>').join('')+'</tbody></table></div>';};
    card.querySelector('#upf61d').onchange=load;await load();});
})();

/* 🟢 למנהל: לחיצה על מספר המחוברים (ליד הפעמון) פותחת ישר את "מי מחובר עכשיו",
   ושם — גם הטלפונים שהאפליקציה פתוחה בהם עכשיו (כולל אורחים ומי שהוריד ממקום אחר), מי זה, ואם הסיר והתקין מחדש */
(function(){
  const st=document.querySelector('#stats16');
  if(st){const _c=st.onclick;st.onclick=function(e){if(typeof isAdmin==='function'&&isAdmin()&&typeof openOnline==='function'){openOnline();return;}if(_c)return _c.call(this,e);};
    st.addEventListener('mouseenter',()=>{if(typeof isAdmin==='function'&&isAdmin())st.title='מי מחובר עכשיו — לחיצה לרשימה';});}
  const _on=openOnline;
  openOnline=async function(){await _on.apply(this,arguments);if(typeof isAdmin!=='function'||!isAdmin()||!sb)return;
    const el=document.querySelector('#onlineList');if(!el||el.querySelector('#on56'))return;
    const box=document.createElement('div');box.id='on56';box.innerHTML='<h4 style="margin:14px 0 6px">📱 האפליקציה פתוחה עכשיו</h4><div class="empty">טוען...</div>';el.appendChild(box);
    const {data,error}=await sb.rpc('staff_apk_activity',{p_days:1}).then(r=>r,()=>({error:{message:''}}));
    if(error){box.lastChild.textContent=/forbidden|42501/.test(error.message||'')?'אין הרשאה לראות את האפליקציה':'צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)';return;}
    const td=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'}),all=(data||[]).filter(r=>r.last_day===td),now=all.filter(r=>Date.now()-new Date(r.last_at)<5*6e4),other=all.filter(r=>r.via==='other');
    const tm=t=>new Date(t).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
    const who=r=>r.user_id?'<b>'+esc(r.name||'משתמש/ת')+'</b>'+(r.email?' <small class="muted" dir="ltr">'+esc(r.email)+'</small>':''):'<span class="muted">אורח/ת (לא מחובר לחשבון)</span>';
    const via=r=>r.via==='other'?'<span class="kd55 x">🔗 הורד ממקום אחר</span>':r.via==='site'?'<small class="muted">🌐 הורד מהאתר</small>':'';
    const re=r=>r.prev_at?' <span class="kd55 o">🔁 '+(r.prev_sure?'':'כנראה ')+'התקין/ה מחדש</span>':'';
    const row=(r,live)=>'<div class="mrow" style="flex-wrap:wrap;gap:6px"><span>'+(live?'🟢':'⚪')+'</span><span>'+who(r)+'</span>'+via(r)+re(r)+
      '<small class="muted">'+(r.app_ver?'גרסה <span dir="ltr">'+esc(r.app_ver)+'</span> · ':'')+esc(r.device||'')+(live?'':' · נפתחה היום, אחרונה ב-'+tm(r.last_at))+'</small></div>';
    box.innerHTML='<h4 style="margin:14px 0 6px">📱 האפליקציה פתוחה עכשיו ('+now.length+')</h4>'+(now.length?now.map(r=>row(r,true)).join(''):'<div class="empty">אין טלפון שהאפליקציה פתוחה בו כרגע</div>')+
      '<h4 style="margin:14px 0 6px">🔗 הורידו ממקום אחר ופתחו היום ('+other.length+')</h4>'+(other.length?other.map(r=>row(r,now.includes(r))).join(''):'<div class="empty">אף אחד היום</div>')+
      '<p class="muted" style="font-size:12px;margin-top:10px">היום פתחו את האפליקציה '+all.length+' טלפונים. 🟢 = פתוחה ב-5 הדקות האחרונות. "הורד ממקום אחר" = לא הייתה לחיצה על הורדה באתר שלנו לפני ההתקנה. 🔁 = אותו חשבון ואותו דגם טלפון (לאורחים: אותה רשת), וההתקנה הקודמת הפסיקה לפני שהחדשה נפתחה.</p>'+
      '<button class="btn sec" id="on56bo" type="button">📊 כל ההיסטוריה בבק אופיס ← מבקרים</button>';
    /* 📴 אופליין מחוברים עכשיו (בלוטות' חי לאתר / לאפליקציה, מאופליין 1.4) */
    sb.rpc('staff_apk_downloads',{p_days:1}).then(({data:od})=>{const m={};(od||[]).filter(r=>(r.kind==='off_live'||r.kind==='off_sync')&&Date.now()-new Date(r.at)<15*6e4).forEach(r=>{if(!m[r.dev])m[r.dev]=r;});
      const l=Object.values(m),h=document.createElement('div');
      h.innerHTML='<h4 style="margin:14px 0 6px">📴 אופליין מחוברים עכשיו ('+l.length+')</h4>'+(l.length?l.map(r=>'<div class="mrow" style="flex-wrap:wrap;gap:6px"><span>🟢</span><span>'+(r.user_id?'<b>'+esc(r.name||'משתמש/ת')+'</b>':'<span class="muted">אורח/ת</span>')+'</span><small class="muted">'+(/^app-/.test(r.src)?'📱 לאפליקציה':'🌐 לאתר')+' · '+esc(r.device||'')+(r.app_ver?' · גרסה <span dir="ltr">'+esc(r.app_ver)+'</span>':'')+'</small></div>').join(''):'<div class="empty">אין טלפון אופליין מחובר כרגע</div>')+
        '<p class="muted" style="font-size:12px">רק חיבור חי בבלוטות\' (הטלפון האופליין עצמו בלי אינטרנט, אז רואים אותו דרך האתר / האפליקציה שהוא מחובר אליהם).</p>';
      const b=box.querySelector('#on56bo');if(b)box.insertBefore(h,b);},()=>{});
    box.querySelector('#on56bo').onclick=()=>{document.querySelector('#onlineOverlay').classList.remove('open');openBO('guests');};};
  const mi=document.querySelector('#miOnline');if(mi)mi.onclick=openOnline;
})();
