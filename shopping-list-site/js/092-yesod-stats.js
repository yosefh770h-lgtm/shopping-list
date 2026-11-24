/* ================= 92: 🌐 אתר יסוד שביסוד — כמה נכנסו, מאיפה, ומה הורידו =================
   בבק אופיס ← 👀 מבקרים (למי שיש הרשאת "מבקרים"). הנתונים אנונימיים: האתר שומר רק סוג אירוע, מקור, הדף שממנו הגיעו וסוג המכשיר
   (yesod_event ב-schema.sql). אין שם, אין חשבון ואין כתובת IP. */
window.boAfter&&window.boAfter('guests',async main=>{if(!main||main.querySelector('#ys92'))return;
  const $92=s=>card.querySelector(s);
  const card=document.createElement('div');card.className='card';card.id='ys92';
  card.innerHTML='<h2>🌐 אתר יסוד שביסוד</h2><p class="muted">כניסות ולחיצות על הורדה באתר <a href="https://yesod.yamshopping.com/" target="_blank" rel="noopener" dir="ltr">yesod.yamshopping.com</a>. בלי שמות: האתר לא יודע מי נכנס, רק מאיפה הגיע ומאיזה מכשיר.</p>'+
    '<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px"><select id="ys92d" style="max-width:150px"><option value="1">היום</option><option value="7">7 ימים</option><option value="30" selected>30 יום</option><option value="90">90 יום</option><option value="180">180 יום</option></select></div>'+
    '<div id="ys92b" class="muted">טוען...</div>';
  main.prepend(card);
  const ITEM={apk:'📱 האפליקציה לאנדרואיד',offline:'📴 אפליקציית אופליין',web:'🌐 מעבר לאתר רשימת קניות'};
  const when=t=>{const d=new Date(t);return d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric'})+' '+d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});};
  const count=(rows,f)=>rows.filter(f).length;
  const top=(rows,key)=>{const m={};rows.forEach(r=>{const k=r[key]||'';m[k]=(m[k]||0)+1;});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8);};
  const table=(title,head,list)=>'<h3 style="margin:14px 0 6px">'+title+'</h3>'+(list.length?'<div class="tw" tabindex="0" role="region" aria-label="'+esc(title)+'"><table><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+list.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<p class="muted">אין עדיין.</p>');
  const load=async()=>{const box=$92('#ys92b');box.className='muted';box.textContent='טוען...';
    const {data,error}=await sb.rpc('staff_yesod_events',{p_days:+$92('#ys92d').value||30});
    if(!card.isConnected)return;
    if(error){box.textContent='⚠️ '+(/forbidden|42501/.test(error.message)?'אין לך הרשאה לראות את הנתונים':'צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)');return;}
    const rows=data||[],views=rows.filter(r=>r.kind==='view'),dls=rows.filter(r=>r.kind==='download');
    const stat=(n,t)=>'<div style="flex:1;min-width:120px;border:1px solid var(--line,#ddd);border-radius:10px;padding:10px 12px"><div style="font-size:26px;font-weight:700">'+n+'</div><div class="muted">'+t+'</div></div>';
    box.className='';
    box.innerHTML='<div class="row" style="flex-wrap:wrap;gap:8px">'+stat(views.length,'כניסות')+stat(count(dls,r=>r.item==='apk'),ITEM.apk)+stat(count(dls,r=>r.item==='offline'),ITEM.offline)+stat(count(dls,r=>r.item==='web'),ITEM.web)+'</div>'+
      table('מאיפה הגיעו',['מקור','כניסות'],top(views,'src').map(([k,n])=>[esc(k==='direct'?'ישירות':k),n]))+
      table('הדף שבו היה הקישור',['דף','כניסות'],top(views,'referrer').map(([k,n])=>[k?'<span dir="ltr" style="overflow-wrap:anywhere">'+esc(k.replace(/^https?:\/\//,''))+'</span>':'<span class="muted">לא נמסר</span>',n]))+
      table('מכשירים',['מכשיר','כניסות'],top(views,'device').map(([k,n])=>[esc(k||'לא ידוע'),n]))+
      table('אחרונים',['מתי','מה','מקור','מכשיר'],rows.slice(0,50).map(r=>[when(r.at),r.kind==='view'?'👀 כניסה':'⬇️ '+esc(ITEM[r.item]||r.item),esc(r.src==='direct'?'ישירות':r.src),esc(r.device||'')]));};
  $92('#ys92d').onchange=load;
  await load();});
