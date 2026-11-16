
/* ================= v43: 💬 צ'אט עם האתר — תגובה להודעה מסוימת, עריכה, אימוג'י, תמונות (רק המנהל שולח) · 🎉/👋 מצטרף חדש מול משתמש קיים שחזר ================= */
try{
const $43=s=>document.querySelector(s);
const REACTS43=['👍','❤️','😂','😮','🙏','👏','✅','😢'];
const IMG43=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
(function(){const st=document.createElement('style');st.textContent=
  '.box43{display:flex;flex-direction:column;gap:8px;max-height:52vh;overflow-y:auto;overflow-x:hidden;overscroll-behavior-x:none;padding:6px 2px 12px;margin-bottom:8px}'+
  '.r43{display:flex}.r43.me{justify-content:flex-end}.r43.them{justify-content:flex-start}.r43.hasre{margin-bottom:12px}'+
  '.b43{position:relative;max-width:82%;min-width:0;background:var(--recv);border-radius:12px 12px 12px 3px;padding:8px 12px 5px;font-size:15px;line-height:1.5;overflow-wrap:anywhere;word-break:break-word;box-shadow:0 1px 1px rgba(0,0,0,.07)}'+
  '.r43.me .b43{background:var(--sent);border-radius:12px 12px 3px 12px}.hl43 .b43{box-shadow:0 0 0 2px var(--hdr2)}'+
  '.t43{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:2px 8px;font-size:11px;color:var(--muted);margin-top:3px}.ed43{font-style:italic}'+
  '.acts43{display:inline-flex;gap:0;margin-inline-end:auto}.acts43 button{border:0;background:none;padding:2px 5px;font-size:13px;line-height:1;cursor:pointer;opacity:.55;border-radius:6px;color:inherit;font-family:inherit}.acts43 button:hover,.acts43 button:focus-visible{opacity:1;background:rgba(0,0,0,.06)}'+
  '.b43 button.q43{display:block;width:100%;min-height:0;text-align:start;border:0;border-inline-start:3px solid var(--hdr2);background:rgba(127,127,127,.12);box-shadow:none;border-radius:6px;padding:4px 8px;margin:0 0 5px;font:inherit;font-size:13px;font-weight:400;line-height:1.4;cursor:pointer;color:inherit}'+
  '.q43 b{display:block;color:var(--hdr2);font-size:12px;font-weight:700}.q43 span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)}'+
  '.re43{position:absolute;bottom:-12px;inset-inline-start:10px;background:var(--panel,#fff);border:1px solid var(--line);border-radius:12px;padding:0 6px;font-size:13px;line-height:20px;box-shadow:0 1px 2px rgba(0,0,0,.1)}'+
  '.pick43{display:flex;flex-wrap:wrap;gap:2px;background:var(--panel,#fff);border:1px solid var(--line);border-radius:20px;padding:3px 6px;margin-top:6px;width:max-content;max-width:100%}'+
  '.pick43 button{border:0;background:none;color:var(--text);font-size:20px;line-height:1;padding:4px;cursor:pointer;border-radius:50%}.pick43 button.on{background:rgba(0,0,0,.1)}'+
  '.img43{display:block;max-width:100%;max-height:260px;border-radius:8px;margin:0 0 4px;cursor:zoom-in}'+
  '.bar43:empty{display:none}.bar43 .it43{display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.05);border-inline-start:3px solid var(--hdr2);border-radius:8px;padding:6px 10px;margin:0 0 6px;font-size:13px}'+
  '.bar43 .it43 span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bar43 img{width:44px;height:44px;object-fit:cover;border-radius:6px}.bar43 button{border:0;background:none;font-size:16px;cursor:pointer;color:inherit;padding:2px 6px}'+
  '.lb43{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out}.lb43 img{max-width:100%;max-height:100%;border-radius:8px}'+
  '.send161 .pic43{background:var(--panel);color:var(--text);border:1px solid var(--line)}.r43.them .b43{border:1px solid var(--line)}'+
  /* בבק אופיס יש איפוס של כל הריווחים (#bo *) — מחזירים אותם לצ'אט */
  '#bo .box43{padding:6px 2px 12px;margin-bottom:8px}#bo .b43{padding:8px 12px 5px}#bo .t43{margin-top:3px}#bo .b43 button.q43{padding:4px 8px;margin:0 0 5px}#bo .acts43 button{padding:2px 5px}#bo .re43{padding:0 6px}'+
  '#bo .pick43{padding:3px 6px;margin-top:6px}#bo .pick43 button{padding:4px}#bo .img43{margin:0 0 4px}#bo .bar43 .it43{padding:6px 10px;margin:0 0 6px}#bo .bar43 button{padding:2px 6px}#bo .box43 .day{margin:4px 0 8px}';document.head.appendChild(st);})();
function err43(e){const m=String(e&&e.message||e||'');
  return /images_admin_only/.test(m)?T('רק מנהל האתר יכול לשלוח תמונות','Only the site admin can send images'):/edit_not_allowed/.test(m)?T('אפשר לערוך רק הודעה שכתבת, עד 24 שעות אחרי השליחה','You can only edit your own message, up to 24 hours after sending'):m;}
/* staff=true: הצופה הוא המנהל. "שלי" = מה שהצופה כתב */
const mine43=(m,staff)=>staff?!!m.from_staff:!m.from_staff;
const canEdit43=(m,staff)=>mine43(m,staff)&&!!m.body&&(staff||Date.now()-new Date(m.created_at).getTime()<864e5);
const snip43=m=>m?(m.image&&!m.body?'📷 '+T('תמונה','Image'):String(m.body||'').replace(/\s+/g,' ').slice(0,100)):T('הודעה שנמחקה','Deleted message');
const who43=(m,staff)=>mine43(m,staff)?T('אני','Me'):m.from_staff?(m.author_name||T('צוות האתר','Site team')):(m.author_name||T('משתמש/ת','User'));
/* שליטה בצ'אט אחד: מציג את ההודעות ב-box, את פס "תגובה ל / עריכה / תמונה" ב-bar, ומטפל בלחיצות.
   o: {staff, uid, box, bar, text (textarea), head(m), tail(m)} */
function chat43(o){
  const c={staff:!!o.staff,uid:o.uid,box:o.box,msgs:[],mode:null,ref:null,image:'',picker:null};
  if(o.text&&window.emo45)window.emo45(o.text);
  c.busy=()=>!!(c.mode||c.image||c.picker||(o.text&&o.text.value.trim()));
  c.render=keep=>{const box=o.box;if(!box)return;const by={};c.msgs.forEach(m=>by[m.id]=m);let lastDay='';const atEnd=box.scrollHeight-box.scrollTop-box.clientHeight<40;const top=box.scrollTop;
    box.innerHTML=c.msgs.length?c.msgs.map(m=>{const d=new Date(m.created_at);const dk=dayKey(d);const sep=dk!==lastDay?'<div class="day"><span>'+esc(fmtDate(d))+'</span></div>':'';lastDay=dk;
      const me=mine43(m,c.staff),r=by[m.reply_to];const re=[m.react_user,m.react_staff].filter(Boolean);
      return sep+'<div class="r43 '+(me?'me':'them')+(re.length?' hasre':'')+'" data-mid="'+esc(m.id)+'" id="m43-'+esc(m.id)+'"><div class="b43">'+(o.head?o.head(m):'')+
        (m.reply_to?'<button class="q43" data-c43="jump" data-ref="'+esc(m.reply_to)+'" aria-label="'+T('מעבר להודעה המקורית','Go to the original message')+'"><b>'+esc(r?who43(r,c.staff):'')+'</b><span>'+esc(snip43(r))+'</span></button>':'')+
        (m.image&&IMG43.test(m.image)?'<img class="img43" src="'+esc(m.image)+'" alt="'+T('תמונה מצוות האתר','Image from the site team')+'" data-c43="zoom" loading="lazy">':'')+
        (m.body?esc(m.body).replace(/\n/g,'<br>'):'')+
        '<div class="t43"><span class="acts43"><button data-c43="reply" title="'+T('תגובה להודעה הזאת','Reply to this message')+'" aria-label="'+T('תגובה להודעה הזאת','Reply to this message')+'">↩️</button><button data-c43="react" title="'+T('אימוג׳י','Emoji')+'" aria-label="'+T('הוספת אימוג׳י להודעה','Add an emoji')+'" aria-expanded="'+(c.picker===m.id)+'">🙂</button>'+(canEdit43(m,c.staff)?'<button data-c43="edit" title="'+T('עריכת ההודעה','Edit message')+'" aria-label="'+T('עריכת ההודעה','Edit message')+'">✏️</button>':'')+'</span>'+
        (m.edited_at?'<span class="ed43">'+T('נערכה','edited')+'</span>':'')+'<span>'+fmtTime(d)+(o.tail?o.tail(m):'')+'</span></div>'+
        (re.length?'<span class="re43" aria-label="'+T('תגובות: ','Reactions: ')+esc(re.join(' '))+'">'+esc(re.join(''))+'</span>':'')+
        (c.picker===m.id?'<div class="pick43" role="group" aria-label="'+T('בחירת אימוג׳י','Pick an emoji')+'">'+REACTS43.map(e=>'<button data-c43="pick" data-em="'+e+'" class="'+(m[c.staff?'react_staff':'react_user']===e?'on':'')+'" aria-label="'+e+'">'+e+'</button>').join('')+'</div>':'')+
        '</div></div>';}).join(''):(o.empty||'');
    box.scrollTop=keep&&!atEnd?top:box.scrollHeight;
    if(o.bar)o.bar.innerHTML=(c.mode&&c.ref?'<div class="it43"><span>'+(c.mode==='edit'?'✏️ '+T('עריכת ההודעה','Editing message'):'↩️ '+T('תגובה ל','Reply to ')+'<b>'+esc(who43(c.ref,c.staff))+'</b>: '+esc(snip43(c.ref)))+'</span><button data-c43="cancel" aria-label="'+T('ביטול','Cancel')+'">✕</button></div>':'')+
      (c.image?'<div class="it43"><img src="'+esc(c.image)+'" alt=""><span>📷 '+T('התמונה תישלח עם ההודעה','The image will be sent with the message')+'</span><button data-c43="noimg" aria-label="'+T('הסרת התמונה','Remove image')+'">✕</button></div>':'');};
  c.reset=()=>{c.mode=null;c.ref=null;c.image='';c.picker=null;};
  c.click=async e=>{const b=e.target.closest('[data-c43]');if(!b)return false;e.stopPropagation();const k=b.dataset.c43;const row=b.closest('[data-mid]');const m=row&&c.msgs.find(x=>x.id===row.dataset.mid);
    if(k==='reply'&&m){if(c.mode==='edit'&&o.text)o.text.value='';c.mode='reply';c.ref=m;c.picker=null;c.render(true);o.text&&o.text.focus();}
    else if(k==='edit'&&m){c.mode='edit';c.ref=m;c.picker=null;c.image='';if(o.text){o.text.value=m.body;o.text.focus();}c.render(true);}
    else if(k==='cancel'){if(c.mode==='edit'&&o.text)o.text.value='';c.mode=null;c.ref=null;c.render(true);}
    else if(k==='noimg'){c.image='';c.render(true);}
    else if(k==='react'&&m){c.picker=c.picker===m.id?null:m.id;c.render(true);}
    else if(k==='pick'&&m){const col=c.staff?'react_staff':'react_user';const val=m[col]===b.dataset.em?'':b.dataset.em;
      const {error}=await sb.from('support_messages').update({[col]:val}).eq('id',m.id);if(error){flash('⚠️ '+err43(error));return true;}m[col]=val;c.picker=null;c.render(true);}
    else if(k==='jump'){const t=document.getElementById('m43-'+b.dataset.ref);if(t){t.scrollIntoView({block:'center',behavior:'smooth'});t.classList.add('hl43');setTimeout(()=>t.classList.remove('hl43'),1500);}else flash(T('ההודעה המקורית כבר לא מופיעה כאן','The original message is no longer shown'));}
    else if(k==='zoom'){const lb=document.createElement('div');lb.className='lb43';lb.setAttribute('role','dialog');lb.setAttribute('aria-label',T('תמונה','Image'));lb.innerHTML='<img src="'+esc(b.getAttribute('src'))+'" alt="">';lb.onclick=()=>lb.remove();document.body.appendChild(lb);}
    else if(k==='pic'){if(!c.staff)return true;const inp=document.createElement('input');inp.type='file';inp.accept='image/jpeg,image/png,image/webp';
      inp.onchange=async()=>{const f=inp.files&&inp.files[0];if(!f)return;try{const d=await fileToImage(f,1280,300000);if(!IMG43.test(d)||d.length>380000)throw 0;c.image=d;if(c.mode==='edit'){c.mode=null;c.ref=null;if(o.text)o.text.value='';}c.render(true);}catch(er){flash('⚠️ '+T('לא הצלחתי לקרוא את התמונה','Could not read the image'));}};inp.click();}
    return true;};
  /* שליחה / שמירת עריכה. extra = שדות נוספים להודעה חדשה (למשל נושא) */
  c.submit=async(text,extra)=>{text=String(text||'').trim();
    if(c.mode==='edit'&&c.ref){if(!text)return false;if(text===c.ref.body){c.reset();c.render(true);return 'same';}
      const {error}=await sb.from('support_messages').update({body:text.slice(0,4000)}).eq('id',c.ref.id);if(error){flash('⚠️ '+err43(error));return false;}c.reset();return 'edited';}
    if(!text&&!c.image)return false;
    const row=Object.assign({user_id:c.uid,body:text.slice(0,4000)},extra||{});if(c.mode==='reply'&&c.ref)row.reply_to=c.ref.id;if(c.image&&c.staff)row.image=c.image;
    const {error}=await sb.from('support_messages').insert(row);if(error){flash('⚠️ '+err43(error));return false;}c.reset();return 'sent';};
  return c;}
window.chat43=chat43;

/* ---------- 1. הלקוח: שירות לקוחות (מחליף את התצוגה של גרסה 10, אותו מראה ואותם נושאים) ---------- */
openChat=async function(){
  $43('#hMenu').classList.remove('open');
  const b=openSheet('💬 '+T('שירות לקוחות','Customer service'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');b.oninput=null;b.onchange=null;
  if(!sb||!authUser){b.innerHTML='<p class="muted-note">'+T('צריך להיות מחוברים כדי להתכתב 🙂','Sign in to chat 🙂')+'</p>';return;}
  const r=await loadChat();if(r===null){b.innerHTML='<p class="muted-note">'+T('הצ\'אט עוד לא זמין 🙏','Chat is not available yet 🙏')+'</p>';return;}
  try{const {data}=await sb.from('support_status').select('*').eq('user_id',authUser.id).maybeSingle();supStatus=data;}catch(e){}
  let ch=null;
  const draw=()=>{const open=!supStatus||supStatus.status==='open';const newTicket=!chatMsgs.length||(supStatus&&supStatus.status==='closed');const draft=$43('#chatText')?$43('#chatText').value:'';
    b.innerHTML='<div class="suphead"><div class="supav">🛒</div><div class="grow"><b>'+T('צוות רשימת קניות','Shopping List team')+'</b><small>🟢 '+T('עונים בדרך כלל תוך כמה שעות · א׳–ה׳ 9:00–21:00','Usually replies within a few hours')+'</small></div>'+(chatMsgs.length?'<span class="supst '+(open?'open':'closed')+'">'+(open?T('פנייה פתוחה','Open'):T('טופל ✓','Resolved ✓'))+'</span>':'')+'</div>'+
      (supStatus&&supStatus.topic&&open?'<div class="muted-note" style="margin:6px 0">📌 '+T('נושא: ','Topic: ')+esc(supStatus.topic)+'</div>':'')+
      '<div class="box43" id="chatBox" aria-live="polite"></div>'+
      (newTicket?'<div class="suptopics" role="group" aria-label="'+T('נושא הפנייה','Topic')+'">'+SUP_TOPICS.map(([t,ic])=>'<button class="chip'+(supTopic===t?' on':'')+'" data-stopic="'+esc(t)+'">'+ic+' '+esc(t)+'</button>').join('')+'</div>':'')+
      '<div class="bar43" id="chatBar43"></div>'+
      '<div class="row2"><textarea id="chatText" maxlength="4000" placeholder="'+T('כתבו הודעה...','Write a message...')+'" aria-label="'+T('ההודעה','Message')+'" style="min-height:52px"></textarea><button id="chatSend" style="flex:0 0 auto" aria-label="'+T('שליחה','Send')+'">➤</button></div>'+
      '<div class="row2" style="margin-top:6px"><button class="btn sec" id="chatBiz">🏪 '+T('יש לי עסק — בקשה להצטרף','I own a business')+'</button>'+(chatMsgs.length&&open?'<button class="btn sec" id="chatDone">✓ '+T('הבעיה נפתרה, תודה','Resolved, thanks')+'</button>':'')+'</div>'+
      (isAdmin()?'<p class="muted-note">🛠️ '+T('את הפניות של כל המשתמשים רואים ועונים בבק אופיס ← 💬 צ\'אט עם משתמשים.','Admin: all chats are in the back office.')+'</p>':'');
    const old=ch;ch=chat43({staff:false,uid:authUser.id,box:$43('#chatBox'),bar:$43('#chatBar43'),text:$43('#chatText'),
      empty:'<div class="empty">👋 '+T('שלום! איך אפשר לעזור? בחרו נושא וכתבו לנו — נחזור אליכם בהקדם.','Hi! How can we help? Pick a topic and write to us.')+'</div>',
      head:m=>(m.from_staff?'<b class="supwho">🛒 '+esc(m.author_name||T('צוות האתר','Site team'))+'</b><br>':'')+(m.topic&&!m.from_staff&&m.topic!=='broadcast'?'<small class="suptopic">'+esc(m.topic)+'</small><br>':''),
      tail:m=>m.from_staff?'':' '+(m.read_by_staff&&chatShowRead()?'<span class="ticks seen" title="'+T('נקרא','Read')+'">✓✓</span>':'<span class="ticks" title="'+T('נשלח','Sent')+'">✓</span>')});
    if(old){ch.mode=old.mode;ch.ref=old.ref;}ch.msgs=chatMsgs;$43('#chatText').value=draft;ch.render();};
  draw();
  const unread=chatMsgs.filter(m=>m.from_staff&&!m.read_by_user).map(m=>m.id);if(unread.length)sb.from('support_messages').update({read_by_user:true}).in('id',unread).then(()=>{chatMsgs.forEach(m=>{if(unread.includes(m.id))m.read_by_user=true;});const bd=$43('#chatBadge');if(bd)bd.hidden=true;});
  b.onclick=async e=>{
    if(ch&&await ch.click(e))return;
    const tp=e.target.closest('[data-stopic]');if(tp){supTopic=tp.dataset.stopic;b.querySelectorAll('[data-stopic]').forEach(x=>x.classList.toggle('on',x===tp));$43('#chatText').focus();return;}
    if(e.target.closest('#chatBiz')){openBizJoin();return;}
    if(e.target.closest('#chatDone')){const {error}=await sb.from('support_messages').insert({user_id:authUser.id,body:'✓ '+T('הבעיה נפתרה, תודה!','Resolved, thanks!')});if(!error){supStatus={status:'closed'};flash('🙏 '+T('תודה! שמחנו לעזור','Thanks!'));await loadChat();draw();}return;}
    if(e.target.closest('#chatSend')){const t=$43('#chatText').value.trim();if(!t)return;if(hasProfanity(t)){reportAbuse(t,'chat');flash('🙏 '+T('נא לכתוב בלשון נקייה','Please keep it clean'));return;}
      const editing=ch.mode==='edit';const newTicket=!editing&&(!chatMsgs.length||(supStatus&&supStatus.status==='closed'));if(newTicket&&!supTopic)supTopic='שאלה כללית';
      const btn=e.target.closest('#chatSend');btn.disabled=true;const res=await ch.submit(t,{topic:newTicket?supTopic:''});btn.disabled=false;if(!res)return;
      $43('#chatText').value='';
      if(res==='sent'){supStatus={status:'open',topic:newTicket?supTopic:(supStatus&&supStatus.topic)||''};supTopic='';}
      await loadChat();draw();if(res!=='same')flash(res==='edited'?'✏️ '+T('ההודעה עודכנה','Message updated'):'💬 '+T('נשלח — נענה בהקדם','Sent'));}
  };
  b.onkeydown=e=>{if(e.key==='Escape'&&ch&&(ch.mode||ch.picker)){e.stopPropagation();if(ch.mode==='edit')$43('#chatText').value='';ch.reset();ch.render(true);return;}
    if(e.target.id==='chatText'&&e.key==='Enter'&&!e.shiftKey&&!TOUCH_KB&&!e.isComposing){e.preventDefault();$43('#chatSend').click();}};
};

/* ---------- 2. המנהל: הודעות למשתמשים מתוך האתר (מחליף את השיחה של גרסה 16.1) ---------- */
let ch43=null;
drawThread161=async function(b,uid,quiet){
  if(quiet&&ch43&&ch43.uid===uid&&ch43.busy())return;
  const {data,error}=await sb.from('support_messages').select('id,from_staff,author_name,body,created_at,read_by_staff,read_by_user,topic,reply_to,edited_at,react_user,react_staff,image').eq('user_id',uid).order('created_at').limit(300);
  if(error){b.innerHTML='<p class="muted-note">⚠️ '+esc(error.message)+'</p>';return;}
  if(quiet&&ch43&&ch43.uid===uid&&$43('#adm161m')){ch43.msgs=data||[];ch43.render(true);}
  else{
    const t=adm161.threads.find(x=>x.user_id===uid)||{};let who=t.name||t.email;
    if(!who){if(!adm161.users){const {data:us}=await sb.rpc('admin_user_list');adm161.users=us||[];}const u=adm161.users.find(x=>x.id===uid)||{};who=u.name||u.email||'?';}
    b.innerHTML='<div id="adm161"><div class="m16h"><button class="mini" data-back161>→ '+T('כל השיחות','All')+'</button><b>💬 '+esc(who)+'</b>'+(t.email?'<small dir="ltr">'+esc(t.email)+'</small>':'')+'</div>'+
      '<div class="box43" id="adm161m" aria-live="polite"></div><div class="bar43" id="adm161bar"></div>'+
      '<div class="send161"><button class="pic43" data-c43="pic" title="'+T('שליחת תמונה (רק למנהל)','Send an image (admin only)')+'" aria-label="'+T('שליחת תמונה','Send an image')+'">📷</button><textarea id="adm161txt" rows="2" maxlength="4000" placeholder="'+T('כתבו הודעה...','Write a message...')+'" aria-label="'+T('ההודעה','Message')+'"></textarea><button id="adm161send" aria-label="'+T('שליחה','Send')+'">➤</button></div></div>';
    ch43=chat43({staff:true,uid,box:$43('#adm161m'),bar:$43('#adm161bar'),text:$43('#adm161txt'),empty:'<div class="empty">'+T('עוד אין הודעות — כתבו ראשונים 👇','No messages yet 👇')+'</div>',
      head:m=>m.from_staff?'':'<b class="supwho">'+esc(m.author_name||T('משתמש/ת','User'))+'</b><br>',
      tail:m=>(m.topic==='broadcast'?' · 📣':'')+(m.from_staff?' '+(m.read_by_user?'<span class="ticks seen" title="'+T('נקרא','Read')+'">✓✓</span>':'<span class="ticks" title="'+T('נשלח','Sent')+'">✓</span>'):'')});
    ch43.msgs=data||[];ch43.render();
    b.onclick=async e=>{if(await ch43.click(e))return;
      if(e.target.closest('[data-back161]')){adm161.open=null;ch43=null;await drawThreads161(b);return;}
      if(e.target.closest('#adm161send')){const btn=e.target.closest('#adm161send');btn.disabled=true;const res=await ch43.submit($43('#adm161txt').value);btn.disabled=false;if(!res)return;
        $43('#adm161txt').value='';if(res==='sent')logAct('message_user',who);await drawThread161(b,uid,'after');}};
    $43('#adm161txt').onkeydown=e=>{if(e.key==='Escape'&&(ch43.mode||ch43.picker)){e.stopPropagation();if(ch43.mode==='edit')e.target.value='';ch43.reset();ch43.render(true);return;}
      if(e.key==='Enter'&&!e.shiftKey&&!TOUCH_KB&&!e.isComposing){e.preventDefault();$43('#adm161send').click();}};}
  const unread=(data||[]).filter(m=>!m.from_staff&&!m.read_by_staff).map(m=>m.id);if(unread.length)sb.from('support_messages').update({read_by_staff:true}).in('id',unread).then(()=>{},()=>{});
};

/* ---------- 3. בק אופיס ← 💬 צ'אט עם משתמשים: אותן אפשרויות בשיחה הפתוחה ---------- */
let bo43=null;
window.boAfter&&window.boAfter('support',async main=>{const uid=window.boSupUser;const box=main&&main.querySelector('#supBox');if(!box||!uid){bo43=null;return;}
  const {data,error}=await sb.from('support_messages').select('id,from_staff,author_name,body,created_at,read_by_staff,read_by_user,topic,reply_to,edited_at,react_user,react_staff,image').eq('user_id',uid).order('created_at').limit(500);
  /* המסך כבר צויר מחדש בזמן הטעינה (למשל אחרי שליחה) — הקריאה החדשה תטפל בו */
  if(error||!box.isConnected||window.boSupUser!==uid)return;
  box.className='box43';box.removeAttribute('style');const reply=main.querySelector('#supReply');
  reply.insertAdjacentHTML('beforebegin','<div class="bar43" id="supBar43"></div>');
  reply.insertAdjacentHTML('afterend','<div class="row" style="margin-top:6px"><button class="btn sec sm" data-c43="pic">📷 שליחת תמונה</button><span class="muted" style="font-size:12px">רק מנהל יכול לשלוח תמונות. בכל הודעה: ↩️ תגובה להודעה · 🙂 אימוג׳י · ✏️ עריכה</span></div>');
  bo43=chat43({staff:true,uid,box,bar:main.querySelector('#supBar43'),text:reply,
    head:m=>(m.from_staff?'<b class="muted">'+esc(m.author_name||'צוות האתר')+'</b><br>':'')+(m.topic&&!m.from_staff?'<span class="pill">'+esc(m.topic)+'</span><br>':''),
    tail:m=>m.from_staff?(m.read_by_user?' · ✓✓ נקרא':' · ✓ נשלח'):''});
  bo43.msgs=data||[];bo43.render();
  if(main._c43)return;main._c43=true;
  /* לפני הטיפול של הבק אופיס: לחיצות על הצ'אט, ושליחה כשיש תגובה / עריכה / תמונה */
  main.addEventListener('click',async e=>{if(!bo43||!main.contains(bo43.box))return;
    const s=e.target.closest('#supSend,#supSendClose');if(!s){bo43.click(e);return;}
    if(!(bo43.mode||bo43.image))return;e.stopPropagation();
    const close=s.id==='supSendClose';s.disabled=true;const res=await bo43.submit(main.querySelector('#supReply').value);s.disabled=false;if(!res)return;
    if(close&&res==='sent')await sb.from('support_status').upsert({user_id:bo43.uid,status:'closed',updated_at:new Date().toISOString()});
    if(res!=='same')flash(res==='edited'?'✏️ ההודעה עודכנה':close?'📨 נשלח והפנייה נסגרה':'📨 נשלח');window.boShow&&window.boShow('support');},true);
  main.addEventListener('keydown',e=>{if(e.key==='Escape'&&bo43&&(bo43.mode||bo43.picker)&&main.contains(bo43.box)){e.stopPropagation();if(bo43.mode==='edit')main.querySelector('#supReply').value='';bo43.reset();bo43.render(true);}},true);
});

}catch(e){console.warn('v43',e);}
