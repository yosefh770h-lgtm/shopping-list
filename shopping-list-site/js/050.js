
/* ================= 🔎 סטטיסטיקה של "איפה הכי זול": כל חיפוש מחירים מהשרת נשמר (price_search_log),
   ובבק אופיס ← 💰 מחירים רואים כמה מחפשים, כמה אנשים, ומה הכי מחפשים ================= */
(function(){
const seen={};
const _srvLogApi=priceApi;
priceApi=function(path,params){
  const isSearch=(path==='/compare'||path==='/prices')&&params&&params.items;
  /* מאיפה החיפוש: מיאמי או מהאתר (נבדק לפני ה-await, כשיאמי עוד במחסנית) */
  let src='site';if(isSearch)try{if(/yamiSrvPrice/.test(new Error().stack||''))src='yami';}catch(e){}
  const pr=_srvLogApi.apply(this,arguments);
  if(isSearch&&sb)pr.then(()=>{try{
    const items=String(params.items).split('|').map(x=>x.replace(/\*\d+$/,'').trim()).filter(Boolean).slice(0,60);if(!items.length)return;
    const mode=path==='/prices'?'store':params.stores?'mine':params.lat?'near':'city';
    const k=mode+'|'+(params.city||'')+'|'+items.join('|');if(seen[k]&&Date.now()-seen[k]<60000)return;seen[k]=Date.now();
    const guest=authUser?null:(typeof guestId27==='function'?guestId27():null);
    sb.rpc('price_search_log',{p_guest:guest,p_mode:mode,p_src:src,p_city:String(params.city||'').slice(0,40),p_items:items}).then(()=>{},()=>{});
  }catch(e){}},()=>{});
  return pr;};

/* ---------- בבק אופיס ← 💰 מחירים ---------- */
window.boAfter&&window.boAfter('prices',async main=>{if(!main||main.querySelector('#psCard')||!(typeof isAdmin==='function'&&isAdmin()))return;
  const html='<div class="card" id="psCard"><h2>🔎 כמה משתמשים ב"איפה הכי זול"</h2>'+
    '<p class="muted">כל חיפוש מחיר באתר (מוצר אחד, כל הרשימה, החנויות שלי, או שאלה ליאמי "כמה עולה...") נספר כאן. אורחים נספרים לפי המכשיר, בלי שם.</p>'+
    '<div class="row" style="margin:4px 0 8px;gap:12px;align-items:center;flex-wrap:wrap"><select id="psDays" style="max-width:150px;flex:0 0 auto"><option value="1">היום</option><option value="7">7 ימים</option><option value="30" selected>30 יום</option><option value="90">90 יום</option><option value="365">שנה</option></select>'+
    '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:0;color:var(--text);flex:0 1 auto"><input type="checkbox" id="psStaff" style="width:auto;flex:none;margin:0"> לספור גם חיפושים של הצוות</label></div><div id="psBody" class="muted">טוען...</div></div>';
  const col=main.querySelector('#colCard');if(col)col.insertAdjacentHTML('afterend',html);else main.insertAdjacentHTML('afterbegin',html);
  const box=main.querySelector('#psBody'),dSel=main.querySelector('#psDays'),stf=main.querySelector('#psStaff');
  const num=n=>(+n||0).toLocaleString('he-IL');
  const pct=(a,b)=>b?' <small class="muted">('+Math.round(100*a/b)+'%)</small>':'';
  const when=d=>{try{return new Date(d).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}};
  const MODE={city:'📍 לפי עיר',near:'🧭 קרוב אליי',mine:'🏬 החנויות שלי',store:'🏪 חנות אחת',other:'אחר'};
  const run=async()=>{box.className='muted';box.textContent='טוען...';
    const {data:d,error}=await sb.rpc('admin_price_search_stats',{p_days:+dSel.value||30,p_staff:stf.checked});
    if(error){box.textContent='⚠️ צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)';return;}
    if(!d||!d.total){box.textContent='עוד אין חיפושים בתקופה הזו.';return;}
    const people=(d.users|0)+(d.guests|0);
    const tile=(n,l,sub)=>'<div class="pstile"><b>'+n+'</b><span>'+l+'</span>'+(sub?'<small>'+sub+'</small>':'')+'</div>';
    let h='<div class="pstiles">'+
      tile(num(d.total),'חיפושים',(people?'בממוצע '+(Math.round(10*d.total/people)/10)+' לאדם':''))+
      tile(num(people),'אנשים שונים חיפשו',num(d.users)+' רשומים · '+num(d.guests)+' אורחים')+
      tile(num(d.repeat),'חזרו לחפש ביותר מיום אחד',people?Math.round(100*d.repeat/people)+'% מהמחפשים':'')+
      tile(num(d.single),'חיפושי מוצר אחד',num(d.lists)+' השוואות של רשימה שלמה')+
      tile(num(d.yami),'שאלו את יאמי',pct(d.yami,d.total).replace(/<[^>]+>/g,''))+'</div>';
    const byDay={};(Array.isArray(d.days)?d.days:[]).forEach(x=>byDay[x.day]=x);const days=[];
    {const ks=Object.keys(byDay).sort();if(ks.length){const end=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});for(let t=new Date(ks[0]+'T12:00:00Z');;t=new Date(t.getTime()+864e5)){const k=t.toISOString().slice(0,10);days.push(byDay[k]||{day:k,n:0,people:0});if(k>=end||days.length>400)break;}}}
    if(days.length>1){const mx=Math.max(1,...days.map(x=>x.n|0));
      h+='<h3 style="margin:12px 0 4px">📅 חיפושים לפי יום</h3><div class="psdays" role="img" aria-label="חיפושים לפי יום">'+days.map((x,i)=>'<div class="psday" title="'+esc(x.day)+': '+(x.n|0)+' חיפושים, '+(x.people|0)+' אנשים"><i style="height:'+Math.max(3,Math.round(100*(x.n|0)/mx))+'%"></i><small>'+((days.length-1-i)%Math.ceil(days.length/12)?'&nbsp;':esc(String(x.day).slice(8,10)+'/'+String(x.day).slice(5,7)))+'</small></div>').join('')+'</div>';}
    const top=Array.isArray(d.top)?d.top:[];
    if(top.length)h+='<h3 style="margin:12px 0 4px">🏆 מה הכי מחפשים</h3><div class="tw" tabindex="0" role="region" aria-label="המוצרים הכי מבוקשים"><table><thead><tr><th>#</th><th>מוצר</th><th>כמה פעמים</th><th>כמה אנשים</th><th>מתוכם חיפוש של המוצר לבד</th></tr></thead><tbody>'+
      top.map((r,i)=>'<tr><td>'+(i+1)+'</td><td><b>'+esc(r.q)+'</b></td><td>'+num(r.n)+'</td><td>'+num(r.people)+'</td><td>'+num(r.single)+'</td></tr>').join('')+'</tbody></table></div>'+
      '<p class="muted" style="margin-top:4px">"כמה פעמים" כולל גם מוצרים שהיו בתוך השוואה של רשימה שלמה.</p>';
    const modes=d.modes||{};const cities=Array.isArray(d.cities)?d.cities:[];
    h+='<div class="row" style="gap:18px;flex-wrap:wrap;align-items:flex-start;margin-top:8px">'+
      '<div><h3 style="margin:8px 0 4px">🔀 איך חיפשו</h3>'+Object.entries(modes).sort((a,b)=>b[1]-a[1]).map(([k,n])=>'<div>'+esc(MODE[k]||k)+': <b>'+num(n)+'</b>'+pct(n,d.total)+'</div>').join('')+'</div>'+
      (cities.length?'<div><h3 style="margin:8px 0 4px">🏙️ ערים</h3>'+cities.map(c=>'<div>'+esc(c.city)+': <b>'+num(c.n)+'</b></div>').join('')+'</div>':'')+'</div>';
    const rec=Array.isArray(d.recent)?d.recent:[];
    if(rec.length)h+='<details style="margin-top:10px"><summary><b>🕒 החיפושים האחרונים ('+rec.length+')</b></summary><div class="tw" tabindex="0" role="region" aria-label="החיפושים האחרונים"><table><thead><tr><th>מתי</th><th>מי</th><th>מה חיפש</th><th>איך</th></tr></thead><tbody>'+
      rec.map(r=>'<tr><td>'+when(r.at)+'</td><td>'+(r.guest?'<span class="muted">אורח</span>':esc(r.name||'משתמש/ת'))+(r.staff?' <small class="muted">(צוות)</small>':'')+'</td><td>'+(r.items||[]).map(esc).join(', ')+(r.n>8?' <small class="muted">ועוד '+(r.n-8)+'</small>':'')+'</td><td>'+esc(MODE[r.mode]||'')+(r.city?' '+esc(r.city):'')+(r.src==='yami'?' · 👩‍🍳 יאמי':'')+'</td></tr>').join('')+'</tbody></table></div></details>';
    box.className='';box.innerHTML=h;};
  dSel.onchange=run;stf.onchange=run;await run();});
})();
