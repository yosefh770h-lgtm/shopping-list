
/* ================= v29: "שתפו אותי" עם הקישור האישי · פרסום עדכון מהבק אופיס (הודעה קצרה / מה חדש) · "מה חדש" קצר ונוח ================= */
const $29=s=>document.querySelector(s);
/* ---------- 📤 "שתפו אותי" — מי שמחובר משתף את הקישור האישי שלו (נספר בהזמנת חברים) ---------- */
let refCode29='';
async function myRef29(){if(!sb||!authUser)return '';const k='yam_refcode_'+authUser.id;try{refCode29=refCode29||localStorage.getItem(k)||'';}catch(e){}
  if(/^[0-9a-f]{8}$/.test(refCode29))return refCode29;try{const {data,error}=await sb.rpc('my_ref_code');if(!error&&/^[0-9a-f]{8}$/.test(String(data||''))){refCode29=String(data);try{localStorage.setItem(k,refCode29);}catch(e){}}}catch(e){}return refCode29;}
(function(){const b=$29('#btnShareSite');if(!b)return;const orig=b.onclick;
  b.onclick=async function(e){const el=e.currentTarget;const code=await myRef29();if(!code)return orig&&orig.call(this,e);
    shAnchor18=el;openShare18({what:T('האתר','the site'),hash:'?ref='+code,title:T('רשימת קניות','Shopping list'),
      text:T('🛒 "רשימת קניות" — אתר חינמי לכל הבית: רשימה משותפת עם המשפחה, השוואת מחירים בין הרשתות, מה יש בבית וזמני שבת. ממליץ/ה בחום! 👇','🛒 A free site for the whole home — shared lists and price comparison. Highly recommended! 👇')});};})();
/* ---------- 🆕 "מה חדש" — קצר: נקודות, בלי חובת גלילה ---------- */
function updHtml29(u){const lines=String(u.body||'').split('\n').map(x=>x.replace(/^\s*[-•*]\s*/,'').trim()).filter(Boolean);
  return '<div class="u"><b>'+esc(u.title)+'</b>'+(lines.length>1?'<ul style="margin:6px 0 0;padding-inline-start:18px">'+lines.map(l=>'<li style="margin:3px 0">'+esc(l)+'</li>').join('')+'</ul>':'<p>'+esc(lines[0]||'')+'</p>')+'</div>';}
showUpdates=function(list){const body=$29('#updBody'),ok=$29('#updOk'),hint=$29('#updHint');
  body.innerHTML=list.slice(0,3).map(updHtml29).join('');ok.disabled=false;ok.textContent=T('הבנתי 👍','Got it 👍');if(hint)hint.hidden=true;$29('#updPop').hidden=false;body.scrollTop=0;setTimeout(()=>ok.focus(),50);};
async function openNews29(){if(!sb){flash(T('אין חיבור כרגע','Offline'));return;}const b=openSheet('🆕 '+T('מה חדש באתר','What\'s new'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');
  const {data}=await sb.from('site_updates').select('id,title,body,created_at,active').order('created_at',{ascending:false}).limit(10);const list=(data||[]).filter(u=>u.active!==false);
  /* בראש: "מה חדש" של גרסת האתר הנוכחית */
  const c=typeof CHANGELOG!=='undefined'&&CHANGELOG[0]&&CHANGELOG[0][0]===APP_VERSION&&CHANGELOG[0];const ver=c?'<div class="v26card">'+updHtml29({title:T('גרסה ','Version ')+c[0],body:String(c[3]).replace(/^\s*מה חדש:\s*/,'')}).replace('<div class="u">','<div>')+'<small class="muted-note">'+esc(c[1])+'</small></div>':'';
  b.innerHTML=ver+(list.length?list.map(u=>'<div class="v26card">'+updHtml29(u).replace('<div class="u">','<div>')+'<small class="muted-note">'+esc(fmtDate(new Date(u.created_at)))+'</small></div>').join(''):(ver?'':'<div class="empty">'+T('עוד אין עדכונים 🙂','No updates yet 🙂')+'</div>'));}
add26('miNews29','🆕','מה חדש באתר','What\'s new','miAbout',openNews29);
yamiStep(async raw=>{if(sb&&authUser&&/^(מה חדש|מה חדש באתר|עדכונים|מה התחדש)\??$/.test(String(raw||'').trim())){openNews29();botSay('🆕 '+T('פתחתי את "מה חדש באתר"','Opened what\'s new'));return true;}return false;});
/* ---------- 📢 בבק אופיס: פרסום עדכון — בוחרים הודעה קצרה לכולם או "מה חדש" ---------- */
const DRAFT29T='חדש באתר רשימת קניות';
const DRAFT29=['🔢 כמויות לבד לפי מספר הנפשות בבית','🛍️ מצב קנייה, מסך נוח לקנייה בחנות לפי מחלקות','🏪 הרשימה מתחלקת לפי חנויות, ירקן, אטליז וסופר','📅 תזכורת מיאמי יום לפני הקנייה','💰 כמה חסכתם החודש','🛒 באיזו חנות הקנייה הקבועה שלכם הכי זולה השבוע','🔔 התראה כשמוצר שאתם מחכים לו יורד במחיר','🧮 כמה לקנות לשבת ולאירועים לפי מספר האורחים','📋 רשימות מוכנות לברית, בר מצווה, שבע ברכות וקידוש','⚠️ אזהרה על אלרגיות כשסורקים ברקוד','⌨️ הצעות כבר מהאות הראשונה שמקלידים','🏆 טבלת המדווחים של החודש','💌 קישור אישי לכל אחד, רואים כמה נרשמו דרככם ומקבלים תג שגריר'];
const N29=Math.max(5,DRAFT29.length);
/* מוסיף לבק אופיס — רץ כשהבק אופיס נטען (js/lazy.js) */
window.boReady(()=>{
try{const nav=$29('#boNav');if(nav&&!nav.querySelector('[data-s="announce"]')){const b=document.createElement('button');b.dataset.s='announce';b.textContent='📢 פרסום עדכון';const g=[...nav.querySelectorAll('.bogrp')].find(x=>x.querySelector('[data-s="updates"]'));const ref=nav.querySelector('[data-s="updates"]');if(ref)ref.before(b);else (g||nav).appendChild(b);}
  window.boView&&window.boView('announce',async function(){const m=$29('#boMain');let mode='news';
    const draw=()=>{const lines=[...m.querySelectorAll('[data-l29]')].map(i=>i.value);
      m.innerHTML='<div class="card"><h2>📢 פרסום עדכון למשתמשים</h2><p class="muted">בוחרים מה לשלוח. כל משתמש רואה את זה פעם אחת, קצר וברור — בלי לגלול ובלי חפירות.</p>'+
        '<div class="row" role="radiogroup" aria-label="סוג העדכון" style="gap:8px;flex-wrap:wrap">'+
        '<button class="btn'+(mode==='short'?'':' sec')+'" data-m29="short" role="radio" aria-checked="'+(mode==='short')+'">📣 הודעה קצרה לכולם</button>'+
        '<button class="btn'+(mode==='news'?'':' sec')+'" data-m29="news" role="radio" aria-checked="'+(mode==='news')+'">🆕 מה חדש באתר</button></div></div>'+
        (mode==='short'?
          '<div class="card"><h2>📣 הודעה קצרה</h2><p class="muted">שורה אחת (עד 160 תווים). קופצת מיאמי לכל משתמש פעם אחת, במשך שבוע.</p><textarea id="s29" maxlength="160" rows="2" style="width:100%" placeholder="למשל: 🎉 חדש! כפתור מצב קנייה לקנייה בחנות"></textarea><p class="muted"><span id="s29n">0</span>/160</p>'+
          '<label class="check"><input type="checkbox" id="s29chat"> גם הודעה בצ\'אט של כל משתמש (מגיעה גם כהתראה לטלפון למי שהפעיל התראות)</label>'+
          '<div class="card" style="background:var(--bg)"><b>👀 כך זה ייראה:</b><div class="v26card" id="s29pv" style="margin-top:6px">👩‍🍳 …</div></div><button class="btn" id="s29go">📣 שליחה לכולם</button></div>'
         :'<div class="card"><h2>🆕 מה חדש באתר</h2><p class="muted">כותרת ושורות קצרות (שורה לכל חידוש). מוצג לכל משתמש פעם אחת בכניסה הבאה, עם "הבנתי 👍" — ואפשר לחזור אליו בתפריט ← "מה חדש באתר".</p>'+
          '<label for="n29t">כותרת</label><input id="n29t" maxlength="80" value="מה חדש באתר 🎉">'+
          [...Array(N29).keys()].map(i=>'<label for="n29l'+i+'">שורה '+(i+1)+'</label><input id="n29l'+i+'" data-l29="'+i+'" maxlength="90" value="'+esc(lines[i]||'')+'">').join('')+
          '<div class="row" style="gap:8px"><button class="btn sec" id="n29draft">📝 טיוטה מהעדכונים האחרונים</button><button class="btn sec" id="n29clear">🧹 ניקוי</button></div>'+
          '<label class="check"><input type="checkbox" id="n29yami" checked> גם שורה קצרה מיאמי: "🆕 יש עדכונים באתר"</label>'+
          '<div class="card" style="background:var(--bg)"><b>👀 כך זה ייראה:</b><div class="v26card" id="n29pv" style="margin-top:6px"></div></div><button class="btn" id="n29go">🆕 פרסום לכולם</button></div>')+
        '<div class="card muted">ניהול ועריכה של עדכונים שפורסמו: ← <a href="#" data-go29="updates">🆕 עדכונים לאתר</a> · הודעות יאמי: ← <a href="#" data-go29="broadcast">📣 הודעות למשתמשים</a></div>';
      pv();};
    const pv=()=>{const s=m.querySelector('#s29');if(s){m.querySelector('#s29n').textContent=s.value.length;m.querySelector('#s29pv').textContent='👩‍🍳 '+(s.value.trim()||'…');}
      const t=m.querySelector('#n29t');if(t){const ls=[...m.querySelectorAll('[data-l29]')].map(i=>i.value.trim()).filter(Boolean);m.querySelector('#n29pv').innerHTML=updHtml29({title:t.value.trim()||'…',body:ls.join('\n')||'…'});}};
    m.oninput=pv;
    m.onclick=async e=>{const b=e.target.closest('button,a');if(!b)return;const d=b.dataset;
      if(d.m29){mode=d.m29;draw();return;}if(d.go29){e.preventDefault();window.boShow(d.go29);return;}
      if(b.id==='n29draft'){m.querySelector('#n29t').value=DRAFT29T;DRAFT29.forEach((x,i)=>{const el=m.querySelector('#n29l'+i);if(el)el.value=x;});pv();return;}
      if(b.id==='n29clear'){m.querySelectorAll('[data-l29]').forEach(i=>i.value='');pv();return;}
      if(b.id==='s29go'){const body=m.querySelector('#s29').value.trim();if(!body){flash('כתבו הודעה');return;}if(!(await uiConfirm('לשלוח לכל המשתמשים?\n\n'+body)))return;
        const {error}=await sb.from('yami_notes').insert({body});if(error){flash('⚠️ '+error.message);return;}
        if(m.querySelector('#s29chat').checked){const r=await sb.rpc('admin_broadcast',{p_body:body,p_target:'all'});if(r.error)flash('⚠️ '+r.error.message);}
        flash('📣 נשלח! כל משתמש יראה את זה פעם אחת');m.querySelector('#s29').value='';pv();return;}
      if(b.id==='n29go'){const title=m.querySelector('#n29t').value.trim();const ls=[...m.querySelectorAll('[data-l29]')].map(i=>i.value.trim()).filter(Boolean);
        if(!title||!ls.length){flash('צריך כותרת ולפחות שורה אחת');return;}if(!(await uiConfirm('לפרסם לכל המשתמשים?\n\n'+title+'\n• '+ls.join('\n• '))))return;
        const {error}=await sb.from('site_updates').insert({title,body:ls.join('\n')});if(error){flash('⚠️ '+error.message);return;}
        if(m.querySelector('#n29yami').checked)await sb.from('yami_notes').insert({body:'🆕 יש עדכונים באתר! כתבו לי "מה חדש" או ⚙️ ← מה חדש באתר'});
        flash('🆕 פורסם! כל משתמש יראה את זה פעם אחת בכניסה הבאה');window.boShow('updates');}};
    draw();});
}catch(e){console.warn('bo announce',e);}
});
