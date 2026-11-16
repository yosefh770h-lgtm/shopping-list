
/* ================= v44: 📤 "שתפו אותי" — קישור אישי לכל שיתוף: מי שיתף, איפה (קבוצה / סטטוס...), כמה נכנסו ומי הצטרף ================= */
const $44=s=>document.querySelector(s);
const SH44_PLACES={wa:[['group','👥',T('קבוצה','Group')],['status','🟢',T('סטטוס','Status')],['private','👤',T('אדם אחד','One person')]],
  copy:[['group','👥',T('קבוצת וואטסאפ','WhatsApp group')],['status','🟢',T('סטטוס','Status')],['facebook','📘',T('פייסבוק','Facebook')],['other','✏️',T('מקום אחר','Elsewhere')]]};
/* בבועת השיתוף: לאן שולחים? (ושם הקבוצה / המקום, לא חובה) */
function shareWhere44(pop,k){const r=pop.querySelector('.shr18');if(!r)return;
  r.innerHTML=(SH44_PLACES[k]||[]).map(([p,ic,n])=>'<button class="shb18" data-net="'+k+'" data-place="'+p+'" aria-label="'+esc(n)+'"><span class="ic" style="background:'+(k==='wa'?'#25D366':'#0f766e')+'">'+ic+'</span><small>'+esc(n)+'</small></button>').join('');
  r.insertAdjacentHTML('beforebegin','<p class="shq44">'+(k==='wa'?T('לאן שולחים בוואטסאפ?','Where in WhatsApp?'):T('איפה תדביקו את הקישור?','Where will you paste it?'))+'</p>');
  r.insertAdjacentHTML('afterend','<input id="shPlace44" class="shin44" maxlength="60" aria-label="'+T('שם הקבוצה או המקום (לא חובה)','Group or place name (optional)')+'" placeholder="'+T('שם הקבוצה / המקום (לא חובה)','Group / place name (optional)')+'">');
  const b=pop.getBoundingClientRect();if(b.right>innerWidth-8)pop.style.left=Math.max(8,innerWidth-b.width-8)+'px';if(b.bottom>innerHeight-8)pop.style.top=Math.max(8,innerHeight-b.height-8)+'px';
  const f=r.querySelector('[data-place]');if(f)f.focus({preventScroll:true});}
/* יוצר קישור חדש (?s=) ורושם אותו בשרת — בלי לחכות, כדי שוואטסאפ ייפתח מיד */
function shareTrack44(k,place){if(!sb)return '';let tk='';
  try{const a=new Uint8Array(10);crypto.getRandomValues(a);tk=[...a].map(x=>'0123456789abcdefghijklmnopqrstuvwxyz'[x%36]).join('');}catch(e){return '';}
  try{sb.rpc('share_link_create',{p_token:tk,p_channel:k,p_place:place||'',p_device:guestId27()}).then(()=>{},()=>{});}catch(e){}
  return SHARE_BASE18+'?s='+tk;}
(function(){const b=$44('#btnShareSite');if(!b)return;
  b.onclick=e=>{shAnchor18=e.currentTarget;openShare18({what:T('האתר','the site'),track:true,title:T('רשימת קניות','Shopping list'),
    text:T('🛒 "רשימת קניות" — אתר חינמי לכל הבית: רשימה משותפת עם המשפחה, השוואת מחירים בין הרשתות, מה יש בבית וזמני שבת. ממליץ/ה בחום! 👇','🛒 A free site for the whole home — shared lists and price comparison. Highly recommended! 👇')});};})();
/* מי שנכנס דרך קישור כזה: המכשיר נספר פעם אחת (בלי פרטים מזהים); כשמתחברים — נרשם מי הצטרף */
(function(){let tk='';try{const q=new URLSearchParams(location.search);tk=(q.get('s')||'').toLowerCase();if(!/^[0-9a-z]{10}$/.test(tk))return;
  q.delete('s');history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:'')+location.hash);localStorage.setItem('yam_share44',tk);}catch(e){return;}
  if(sb)try{sb.rpc('share_visit',{p_token:tk,p_device:guestId27()}).then(()=>{},()=>{});}catch(e){}})();
async function shareJoin44(){let tk='';try{tk=localStorage.getItem('yam_share44')||'';}catch(e){}if(!/^[0-9a-z]{10}$/.test(tk)||!sb||!authUser)return;
  try{const {error}=await sb.rpc('share_join',{p_token:tk});if(!error)localStorage.removeItem('yam_share44');}catch(e){}}
{const _v44Signed=onSignedIn;onSignedIn=async function(){const r=await _v44Signed.apply(this,arguments);setTimeout(shareJoin44,2500);return r;};}
if(authUser)setTimeout(shareJoin44,3000);
/* ---------- 📤 בבק אופיס: קישורי שיתוף — מי שיתף, איפה, כמה נכנסו ומי הצטרף ---------- */
const SH44_NET={wa:'וואטסאפ',gm:'Gmail',em:'מייל',sms:'SMS',copy:'העתקת קישור',more:'שיתוף מהטלפון'};
const SH44_PL={group:'קבוצה',status:'סטטוס',private:'אדם אחד',facebook:'פייסבוק',other:'מקום אחר'};
function shPlace44(r){const s=String(r.place||''),i=s.indexOf(': '),key=i<0?s:s.slice(0,i),nm=i<0?'':s.slice(i+2);
  const base=r.channel==='copy'&&key?(key==='group'?'קבוצת וואטסאפ':key==='status'?'סטטוס':(SH44_PL[key]||key))+' (העתקה)':(SH44_NET[r.channel]||r.channel)+(key?' · '+(SH44_PL[key]||key):'');
  return {base,nm};}
try{const nav=$44('#boNav');if(nav&&!nav.querySelector('[data-s="shares"]')){const b=document.createElement('button');b.dataset.s='shares';b.textContent='📤 קישורי שיתוף';
    const after=nav.querySelector('[data-s="referrals"]')||nav.querySelector('[data-s="users"]');if(after)after.after(b);else nav.appendChild(b);}
  window.boView&&window.boView('shares',async function(){const m=$44('#boMain');m.innerHTML='<div class="card muted">טוען...</div>';
    const {data,error}=await sb.rpc('admin_share_links',{p_days:365});if(error){m.innerHTML='<div class="card">⚠️ '+esc(error.message)+' — צריך להריץ את קוד ה-SQL המעודכן (⚙️ הגדרה ראשונית)</div>';return;}
    const rows=Array.isArray(data)?data:[];let only=true;
    const when=t=>{const d=new Date(t);return esc(d.toLocaleDateString('he-IL')+' '+d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}));};
    const who=r=>r.sharer?'<b>'+esc(r.name||'—')+'</b><br><small class="muted" dir="ltr">'+esc(r.email||'')+'</small>':'<b>אורח</b> <small class="muted">(מכשיר <span dir="ltr">'+esc(r.device||'?')+'</span>)</small>';
    const joins=r=>(r.joins||[]).map(j=>esc(j.name||j.email||'—')+(j.new?' <span title="נרשם/ה דרך הקישור">🆕</span>':'')+(j.email&&j.name?' <small class="muted" dir="ltr">'+esc(j.email)+'</small>':'')).join('<br>')||'—';
    const draw=()=>{const vis=only?rows.filter(r=>r.visits>0||(r.joins||[]).length):rows;
      const tv=rows.reduce((a,r)=>a+(+r.visits||0),0),tj=rows.reduce((a,r)=>a+(r.joins||[]).length,0),tn=rows.reduce((a,r)=>a+(r.joins||[]).filter(j=>j.new).length,0);
      const agg=(keyf)=>{const o={};rows.forEach(r=>{const k=keyf(r);const x=o[k.k]=o[k.k]||{label:k.label,links:0,visits:0,joins:0,news:0};x.links++;x.visits+=+r.visits||0;x.joins+=(r.joins||[]).length;x.news+=(r.joins||[]).filter(j=>j.new).length;});return Object.values(o).sort((a,b)=>b.visits-a.visits||b.joins-a.joins||b.links-a.links);};
      const byPlace=agg(r=>{const p=shPlace44(r);return {k:p.base,label:esc(p.base)};});
      const bySharer=agg(r=>r.sharer?{k:r.sharer,label:who(r)}:{k:'g'+r.device,label:who(r)});
      const tbl=(head,list)=>'<div class="tw" tabindex="0" role="region" aria-label="טבלה"><table><thead><tr><th>'+head+'</th><th>קישורים</th><th>נכנסו</th><th>התחברו</th><th>מתוכם חדשים</th></tr></thead><tbody>'+
        list.map(x=>'<tr><td>'+x.label+'</td><td>'+x.links+'</td><td><b>'+x.visits+'</b></td><td>'+x.joins+'</td><td>'+x.news+'</td></tr>').join('')+'</tbody></table></div>';
      m.innerHTML='<div class="card"><h2>📤 קישורי שיתוף אישיים</h2><p class="muted">כל לחיצה על "שתפו אותי" בראש המסך יוצרת קישור משלה. רואים מי שיתף, איפה (בוואטסאפ: קבוצה, סטטוס או אדם אחד), כמה מכשירים נכנסו דרכו, ומי התחבר דרכו (🆕 = נרשם דרך הקישור). כניסות נספרות בלי שום פרט מזהה — שמות רואים רק של מי שהתחבר. השנה האחרונה.</p>'+
        '<p><b>'+rows.length+'</b> קישורים · <b>'+tv+'</b> כניסות · <b>'+tj+'</b> התחברו · <b>'+tn+'</b> נרשמו חדשים</p></div>'+
        (rows.length?'<div class="card"><h2>📍 לפי מקום</h2>'+tbl('איפה',byPlace)+'</div><div class="card"><h2>🏅 מי שיתף</h2>'+tbl('מי שיתף',bySharer)+'</div>'+
          '<div class="card"><h2>📋 כל הקישורים</h2><label class="check"><input type="checkbox" id="sh44only"'+(only?' checked':'')+'> רק קישורים שמישהו נכנס דרכם</label>'+
          (vis.length?'<div class="tw" tabindex="0" role="region" aria-label="טבלה"><table><thead><tr><th>מתי</th><th>מי שיתף</th><th>איפה</th><th>נכנסו</th><th>מי התחבר</th></tr></thead><tbody>'+
            vis.map(r=>{const p=shPlace44(r);return '<tr><td>'+when(r.at)+'</td><td>'+who(r)+'</td><td>'+esc(p.base)+(p.nm?'<br><small>'+esc(p.nm)+'</small>':'')+'</td><td><b>'+(+r.visits||0)+'</b></td><td>'+joins(r)+'</td></tr>';}).join('')+'</tbody></table></div>':'<p class="muted">עוד אף אחד לא נכנס דרך קישור.</p>')+'</div>'
         :'<div class="card muted">עוד לא שיתפו קישור אישי.</div>');
      const c=m.querySelector('#sh44only');if(c)c.onchange=()=>{only=c.checked;draw();};};
    draw();});
  const g=[...document.querySelectorAll('#boNav .bogrp')].find(x=>x.querySelector('[data-s="referrals"]'));const sb44=$44('#boNav [data-s="shares"]');if(g&&sb44&&sb44.parentNode!==g)g.querySelector('[data-s="referrals"]').after(sb44);
}catch(e){console.warn('bo shares',e);}
/* ---------- 👥 באזור האישי ובהזמנת חברים: מי הצטרף דרך הקישור שלי — רק השם, בלי מייל ---------- */
function sharePeople44(box){if(!box||!sb||!authUser)return;
  sb.rpc('my_share_people').then(({data,error})=>{if(error||!Array.isArray(data)||!box.isConnected)return;
    box.innerHTML=data.length?'<b>'+T('מי הצטרף דרכך','Who joined through you')+'</b> <small class="muted-note">'+T('(רק השם, בלי מייל · 🆕 = נרשם דרך הקישור)','(name only · 🆕 = signed up through your link)')+'</small><ul class="shp44">'+
      data.slice(0,100).map(p=>{const w=p.channel?shPlace44(p):null;return '<li>'+esc(p.name||'—')+(p.new?' 🆕':'')+' <small class="muted-note">'+esc(fmtDate(new Date(p.at)))+(w?' · '+esc(w.base)+(w.nm?' · '+esc(w.nm):''):'')+'</small></li>';}).join('')+'</ul>':'';},()=>{});}
{const _v44RenderMe=renderMe;renderMe=function(){const r=_v44RenderMe.apply(this,arguments);try{const c=$44('#me26inv');if(c&&!c.querySelector('#me44ppl')){c.insertAdjacentHTML('beforeend','<div id="me44ppl"></div>');sharePeople44(c.querySelector('#me44ppl'));}}catch(e){}return r;};}
{const _v44Inv=openInvite26;openInvite26=async function(){const r=await _v44Inv.apply(this,arguments);try{const row=$44('#inv26copy');const at=row&&row.parentNode;if(at&&!$44('#inv44ppl')){at.insertAdjacentHTML('afterend','<div id="inv44ppl" style="margin-top:10px"></div>');sharePeople44($44('#inv44ppl'));}}catch(e){}return r;};}
