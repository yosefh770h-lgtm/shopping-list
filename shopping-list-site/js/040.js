/* ================= 💬 צ'אט עם המשתמשים — מראה מודרני (נובמבר 2026)
   מקום אחד לשלושת המסכים: הלקוח (שירות לקוחות), המנהל מתוך האתר, והבק אופיס (תיבת פניות בשני חלקים).
   בכל הודעה: סרגל קטן עם אימוג'י, תגובה להודעה ועריכה (במחשב — כשעוברים עם העכבר, בטלפון — בנגיעה בהודעה).
   העיצוב ב-js/site.css תחת "צ'אט מודרני". ================= */
try{
const $43=s=>document.querySelector(s);
const REACTS43=['👍','❤️','🙏','😂','😮','✅'];
const IMG43=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
const SVG43={
  send:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
  reply:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  img:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
  cart:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/></svg>',
  ok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  copy:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  tk1:'<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M2 7.5l3.5 3.5L13 3"/></svg>',
  tk2:'<svg viewBox="0 0 24 14" aria-hidden="true"><path d="M2 7.5l3.5 3.5L13 3"/><path d="M10 10l1 1L18.5 3"/></svg>',
  undo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>',
  del:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'};
function err43(e){const m=String(e&&e.message||e||'');
  return /images_admin_only/.test(m)?T('רק מנהל האתר יכול לשלוח תמונות','Only the site admin can send images'):/edit_not_allowed/.test(m)?T('אפשר לערוך רק הודעה שכתבת, עד 24 שעות אחרי השליחה','You can only edit your own message, up to 24 hours after sending'):m;}
/* staff=true: הצופה הוא המנהל. "שלי" = מה שהצופה כתב */
const mine43=(m,staff)=>staff?!!m.from_staff:!m.from_staff;
const canEdit43=(m,staff)=>mine43(m,staff)&&!!m.body&&(staff||Date.now()-new Date(m.created_at).getTime()<864e5);
const snip43=m=>m?(m.image&&!m.body?'📷 '+T('תמונה','Image'):String(m.body||'').replace(/\s+/g,' ').slice(0,100)):T('הודעה שנמחקה','Deleted message');
const who43=(m,staff)=>mine43(m,staff)?T('אני','Me'):m.from_staff?(m.author_name||T('צוות האתר','Site team')):(m.author_name||T('משתמש/ת','User'));
/* ראשי תיבות וצבע קבוע לכל משתמש (לתמונה העגולה) */
const ini96=s=>{const w=String(s||'').replace(/[^\p{L}\p{N}\s]/gu,' ').trim().split(/\s+/).filter(Boolean);return w.length?(w[0][0]+(w[1]?w[1][0]:'')).toUpperCase():'?';};
const hue96=id=>{let h=0;String(id||'').split('').forEach(c=>h=(h*31+c.charCodeAt(0))>>>0);return h%5;};
const avatar96=(name,id,cls)=>'<span class="av96 c'+hue96(id)+(cls?' '+cls:'')+'" aria-hidden="true">'+esc(ini96(name))+'</span>';
/* שורת הכתיבה: תיבה עגולה עם אימוג'י (ו-📷 למנהל) וכפתור שליחה עגול */
function composer96(id,sendId,opt){opt=opt||{};
  return '<div class="cmp96"><div class="box96">'+(opt.pic?'<button type="button" class="ib96" data-c43="pic" title="'+T('שליחת תמונה (רק למנהל)','Send an image (admin only)')+'" aria-label="'+T('שליחת תמונה','Send an image')+'" data-noicon>'+SVG43.img+'</button>':'')+
    '<textarea id="'+id+'" rows="1" maxlength="4000" placeholder="'+(opt.ph||T('כתבו הודעה...','Write a message...'))+'" aria-label="'+T('ההודעה','Message')+'"></textarea></div>'+
    '<button type="button" class="send96" id="'+sendId+'" aria-label="'+T('שליחה','Send')+'" title="'+T('שליחה','Send')+'" data-noicon>'+SVG43.send+'</button></div>';}
/* התיבה גדלה עם הטקסט (עד 5 שורות בערך) */
function grow96(ta){if(!ta||ta._g96)return;ta._g96=1;const fit=()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,132)+'px';};ta.addEventListener('input',fit);fit();}
/* שליטה בצ'אט אחד: מציג את ההודעות ב-box, את פס "תגובה ל / עריכה / תמונה" ב-bar, ומטפל בלחיצות.
   o: {staff, uid, box, bar, text (textarea), tag(m) — תגית קטנה בראש ההודעה, tail(m) — אחרי השעה, empty} */
function chat43(o){
  const c={staff:!!o.staff,uid:o.uid,box:o.box,msgs:[],mode:null,ref:null,image:''};
  if(o.text){if(window.emo45)window.emo45(o.text);grow96(o.text);}
  c.busy=()=>!!(c.mode||c.image||(o.text&&o.text.value.trim())||(c.box&&c.box.querySelector('.r43.open')));
  c.render=keep=>{const box=o.box;if(!box)return;const by={};c.msgs.forEach(m=>by[m.id]=m);let lastDay='',prev=null;const atEnd=box.scrollHeight-box.scrollTop-box.clientHeight<40;const top=box.scrollTop;
    box.innerHTML=c.msgs.length?c.msgs.map(m=>{const d=new Date(m.created_at);const dk=dayKey(d);const sep=dk!==lastDay?'<div class="day"><span>'+esc(fmtDate(d))+'</span></div>':'';
      const me=mine43(m,c.staff),r=by[m.reply_to];const re=[m.react_user,m.react_staff].filter(Boolean);
      /* הודעות רצופות של אותו צד (עד 5 דקות) מתקבצות: בלי שם חוזר ועם רווח קטן */
      const cont=!sep&&prev&&mine43(prev,c.staff)===me&&!!prev.from_staff===!!m.from_staff&&d-new Date(prev.created_at)<3e5;lastDay=dk;prev=m;
      const mineCol=c.staff?'react_staff':'react_user';
      return sep+'<div class="r43 '+(me?'me':'them')+(cont?' cont':'')+(re.length?' hasre':'')+'" data-mid="'+esc(m.id)+'" id="m43-'+esc(m.id)+'">'+
        '<div class="b43" tabindex="0">'+
        '<div class="tool43" role="toolbar" aria-label="'+T('פעולות להודעה','Message actions')+'">'+REACTS43.map(e=>'<button type="button" data-c43="pick" data-em="'+e+'" class="'+(m[mineCol]===e?'on':'')+'" aria-label="'+T('תגובה ','React ')+e+'">'+e+'</button>').join('')+
          '<span class="sep43"></span><button type="button" data-c43="reply" title="'+T('תגובה להודעה הזאת','Reply to this message')+'" aria-label="'+T('תגובה להודעה הזאת','Reply to this message')+'" data-noicon>'+SVG43.reply+'</button>'+
          (m.body?'<button type="button" data-c43="copy" title="'+T('העתקת ההודעה','Copy message')+'" aria-label="'+T('העתקת ההודעה','Copy message')+'" data-noicon>'+SVG43.copy+'</button>':'')+
          (canEdit43(m,c.staff)?'<button type="button" data-c43="edit" title="'+T('עריכת ההודעה','Edit message')+'" aria-label="'+T('עריכת ההודעה','Edit message')+'" data-noicon>'+SVG43.edit+'</button>':'')+'</div>'+
        (!me&&!cont?'<b class="nm43">'+esc(who43(m,c.staff))+'</b>':'')+(o.tag?o.tag(m):'')+
        (m.reply_to?'<button type="button" class="q43" data-c43="jump" data-ref="'+esc(m.reply_to)+'" aria-label="'+T('מעבר להודעה המקורית','Go to the original message')+'"><b>'+esc(r?who43(r,c.staff):'')+'</b><span>'+esc(snip43(r))+'</span></button>':'')+
        (m.image&&IMG43.test(m.image)?'<img class="img43" src="'+esc(m.image)+'" alt="'+T('תמונה מצוות האתר','Image from the site team')+'" data-c43="zoom" loading="lazy">':'')+
        (m.body?'<span class="tx43">'+esc(m.body).replace(/\n/g,'<br>')+'</span>':'')+
        '<span class="t43">'+(m.edited_at?'<i>'+T('נערכה','edited')+'</i>':'')+fmtTime(d)+(o.tail?o.tail(m):'')+'</span>'+
        (re.length?'<span class="re43" aria-label="'+T('תגובות: ','Reactions: ')+esc(re.join(' '))+'">'+esc(re.join(''))+'</span>':'')+
        '</div></div>';}).join(''):(o.empty||'');
    box.scrollTop=keep&&!atEnd?top:box.scrollHeight;
    if(o.bar)o.bar.innerHTML=(c.mode&&c.ref?'<div class="it43"><span>'+(c.mode==='edit'?'✏️ '+T('עריכת ההודעה','Editing message'):'↩️ '+T('תגובה ל','Reply to ')+'<b>'+esc(who43(c.ref,c.staff))+'</b>: '+esc(snip43(c.ref)))+'</span><button type="button" data-c43="cancel" aria-label="'+T('ביטול','Cancel')+'">✕</button></div>':'')+
      (c.image?'<div class="it43"><img src="'+esc(c.image)+'" alt=""><span>📷 '+T('התמונה תישלח עם ההודעה','The image will be sent with the message')+'</span><button type="button" data-c43="noimg" aria-label="'+T('הסרת התמונה','Remove image')+'">✕</button></div>':'');};
  c.reset=()=>{c.mode=null;c.ref=null;c.image='';};
  const closeTools=except=>c.box&&c.box.querySelectorAll('.r43.open').forEach(x=>{if(x!==except)x.classList.remove('open');});
  c.click=async e=>{const b=e.target.closest('[data-c43]');
    /* נגיעה בהודעה עצמה (בטלפון) פותחת / סוגרת את הסרגל שלה */
    if(!b){const row=c.box&&c.box.contains(e.target)&&e.target.closest('.r43');if(row&&!e.target.closest('a')){closeTools(row);row.classList.toggle('open');return true;}closeTools();return false;}
    e.stopPropagation();const k=b.dataset.c43;const row=b.closest('[data-mid]');const m=row&&c.msgs.find(x=>x.id===row.dataset.mid);
    if(k==='reply'&&m){if(c.mode==='edit'&&o.text)o.text.value='';c.mode='reply';c.ref=m;c.render(true);o.text&&o.text.focus();}
    else if(k==='copy'&&m){copy96(m.body);row.classList.remove('open');}
    else if(k==='edit'&&m){c.mode='edit';c.ref=m;c.image='';if(o.text){o.text.value=m.body;o.text.dispatchEvent(new Event('input'));o.text.focus();}c.render(true);}
    else if(k==='cancel'){if(c.mode==='edit'&&o.text)o.text.value='';c.mode=null;c.ref=null;c.render(true);}
    else if(k==='noimg'){c.image='';c.render(true);}
    else if(k==='pick'&&m){const col=c.staff?'react_staff':'react_user';const val=m[col]===b.dataset.em?'':b.dataset.em;
      const {error}=await sb.from('support_messages').update({[col]:val}).eq('id',m.id);if(error){flash('⚠️ '+err43(error));return true;}m[col]=val;c.render(true);}
    else if(k==='jump'){const t=document.getElementById('m43-'+b.dataset.ref);if(t){t.scrollIntoView({block:'center',behavior:'smooth'});t.classList.add('hl43');setTimeout(()=>t.classList.remove('hl43'),1500);}else flash(T('ההודעה המקורית כבר לא מופיעה כאן','The original message is no longer shown'));}
    else if(k==='zoom'){const lb=document.createElement('div');lb.className='lb43';lb.setAttribute('role','dialog');lb.setAttribute('aria-label',T('תמונה','Image'));lb.innerHTML='<img src="'+esc(b.getAttribute('src'))+'" alt="">';lb.onclick=()=>lb.remove();document.body.appendChild(lb);}
    else if(k==='pic'){if(!c.staff)return true;const inp=document.createElement('input');inp.type='file';inp.accept='image/jpeg,image/png,image/webp';
      inp.onchange=async()=>{const f=inp.files&&inp.files[0];if(!f)return;try{const d=await fileToImage(f,1280,300000);if(!IMG43.test(d)||d.length>380000)throw 0;c.image=d;if(c.mode==='edit'){c.mode=null;c.ref=null;if(o.text)o.text.value='';}c.render(true);}catch(er){flash('⚠️ '+T('לא הצלחתי לקרוא את התמונה','Could not read the image'));}};inp.click();}
    return true;};
  /* Escape: קודם סוגר סרגל / תגובה / עריכה */
  c.escape=()=>{if(c.box&&c.box.querySelector('.r43.open')){closeTools();return true;}if(c.mode||c.image){if(c.mode==='edit'&&o.text)o.text.value='';c.reset();c.render(true);return true;}return false;};
  /* שליחה / שמירת עריכה. extra = שדות נוספים להודעה חדשה (למשל נושא) */
  c.submit=async(text,extra)=>{text=String(text||'').trim();
    if(c.mode==='edit'&&c.ref){if(!text)return false;if(text===c.ref.body){c.reset();c.render(true);return 'same';}
      const {error}=await sb.from('support_messages').update({body:text.slice(0,4000)}).eq('id',c.ref.id);if(error){flash('⚠️ '+err43(error));return false;}c.reset();return 'edited';}
    if(!text&&!c.image)return false;
    const row=Object.assign({user_id:c.uid,body:text.slice(0,4000)},extra||{});if(c.mode==='reply'&&c.ref)row.reply_to=c.ref.id;if(c.image&&c.staff)row.image=c.image;
    const {error}=await sb.from('support_messages').insert(row);if(error){flash('⚠️ '+err43(error));return false;}c.reset();return 'sent';};
  return c;}
window.chat43=chat43;
const enterSends96=(e,btn)=>{if(e.key==='Enter'&&!e.shiftKey&&!TOUCH_KB&&!e.isComposing){e.preventDefault();btn&&btn.click();}};
/* ✓ נשלח · ✓✓ אפור הגיע למכשיר · ✓✓ כחול נקרא (כחול רק אם המנהל הפעיל "הלקוחות רואים ✓✓ כשקראתי") */
const ticks96=(read,got,show)=>read&&show?'<span class="ticks seen" title="'+T('נקרא','Read')+'" aria-label="'+T('נקרא','Read')+'">'+SVG43.tk2+'</span>':
  (read||got)?'<span class="ticks got" title="'+T('הגיע','Delivered')+'" aria-label="'+T('הגיע','Delivered')+'">'+SVG43.tk2+'</span>':'<span class="ticks" title="'+T('נשלח','Sent')+'" aria-label="'+T('נשלח','Sent')+'">'+SVG43.tk1+'</span>';
/* העתקת הודעה */
async function copy96(t){try{await navigator.clipboard.writeText(t);}catch(e){const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(er){}ta.remove();}flash('📋 '+T('ההודעה הועתקה','Message copied'));}
/* ✓✓ "הגיע": בכל טעינה של הצ'אט (בפתיחה, כל דקה וחצי, וכשחוזרים לאתר/לאפליקציה) — מסמנים שההודעות של הצד השני הגיעו למכשיר */
const _lc96=loadChat;loadChat=async function(){const r=await _lc96.apply(this,arguments);
  try{if(sb&&authUser){if(isAdmin())sb.from('support_messages').update({delivered_staff:true}).eq('from_staff',false).eq('delivered_staff',false).then(()=>{},()=>{});
    const ids=(chatMsgs||[]).filter(m=>m.from_staff&&m.delivered_user===false).map(m=>m.id);
    if(ids.length)sb.from('support_messages').update({delivered_user:true}).in('id',ids).then(({error})=>{if(!error)chatMsgs.forEach(m=>{if(ids.includes(m.id))m.delivered_user=true;});},()=>{});}}catch(e){}
  return r;};

/* ---------- 1. הלקוח: שירות לקוחות ---------- */
openChat=async function(){
  $43('#hMenu').classList.remove('open');
  const b=openSheet('💬 '+T('שירות לקוחות','Customer service'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');b.oninput=null;b.onchange=null;
  if(!sb||!authUser){b.innerHTML='<p class="muted-note">'+T('צריך להיות מחוברים כדי להתכתב 🙂','Sign in to chat 🙂')+'</p>';return;}
  const r=await loadChat();if(r===null){b.innerHTML='<p class="muted-note">'+T('הצ\'אט עוד לא זמין 🙏','Chat is not available yet 🙏')+'</p>';return;}
  try{const {data}=await sb.from('support_status').select('*').eq('user_id',authUser.id).maybeSingle();supStatus=data;}catch(e){}
  let ch=null;
  const draw=()=>{const open=!supStatus||supStatus.status==='open';const newTicket=!chatMsgs.length||(supStatus&&supStatus.status==='closed');const draft=$43('#chatText')?$43('#chatText').value:'';
    b.innerHTML='<div class="c96 cu96"><div class="hd96"><span class="av96 brand" aria-hidden="true" data-noicon>'+SVG43.cart+'</span><div class="who96"><b>'+T('צוות רשימת קניות','Shopping List team')+'</b><small>'+T('עונים בדרך כלל תוך כמה שעות · א׳–ה׳ 9:00–21:00','Usually replies within a few hours')+'</small></div>'+
        (chatMsgs.length?'<span class="st96 '+(open?'open':'closed')+'">'+(open?T('פנייה פתוחה','Open'):T('טופל ✓','Resolved ✓'))+'</span>':'')+
        '<button type="button" class="x96" data-close96 aria-label="'+T('סגירה','Close')+'" title="'+T('סגירה','Close')+'" data-noicon>'+SVG43.close+'</button></div>'+
      (supStatus&&supStatus.topic&&open?'<div class="tp96">📌 '+T('נושא: ','Topic: ')+esc(supStatus.topic)+'</div>':'')+
      '<div class="box43" id="chatBox" aria-live="polite" data-noicon></div>'+
      (newTicket?'<div class="qr96" data-noicon role="group" aria-label="'+T('נושא הפנייה','Topic')+'">'+SUP_TOPICS.map(([t,ic])=>'<button type="button" class="'+(supTopic===t?'on':'')+'" data-stopic="'+esc(t)+'" aria-pressed="'+(supTopic===t)+'">'+ic+' '+esc(t)+'</button>').join('')+'</div>':
        '<div class="qr96" data-noicon role="group" aria-label="'+T('תשובות מהירות','Quick replies')+'"><button type="button" data-qk96="'+esc(T('תודה רבה! 👍','Thanks! 👍'))+'">👍 '+T('תודה','Thanks')+'</button><button type="button" data-qk96="'+esc(T('יש לי עוד שאלה:','One more question:'))+' ">❓ '+T('עוד שאלה','Another question')+'</button><button type="button" id="chatBiz">🏪 '+T('יש לי עסק','I own a business')+'</button></div>')+
      '<div class="bar43" id="chatBar43"></div>'+composer96('chatText','chatSend')+
      (chatMsgs.length&&open?'<div class="ft96"><button type="button" class="ok" id="chatDone">✓ '+T('הבעיה נפתרה','Resolved')+'</button></div>':'')+
      (isAdmin()?'<p class="muted-note">🛠️ '+T('את הפניות של כל המשתמשים רואים ועונים בבק אופיס ← 💬 צ\'אט עם משתמשים.','Admin: all chats are in the back office.')+'</p>':'')+'</div>';
    const old=ch;ch=chat43({staff:false,uid:authUser.id,box:$43('#chatBox'),bar:$43('#chatBar43'),text:$43('#chatText'),
      empty:'<div class="hi96">👋 '+T('שלום! איך אפשר לעזור? בחרו נושא וכתבו לנו — נחזור אליכם בהקדם.','Hi! How can we help? Pick a topic and write to us.')+'</div>',
      tag:m=>m.topic&&!m.from_staff&&m.topic!=='broadcast'?'<span class="tg43">📌 '+esc(m.topic)+'</span>':'',
      tail:m=>m.from_staff?'':ticks96(m.read_by_staff,m.delivered_staff,chatShowRead())});
    if(old){ch.mode=old.mode;ch.ref=old.ref;}ch.msgs=chatMsgs;const ta=$43('#chatText');ta.value=draft;ta.dispatchEvent(new Event('input'));ch.render();};
  draw();
  const unread=chatMsgs.filter(m=>m.from_staff&&!m.read_by_user).map(m=>m.id);if(unread.length)sb.from('support_messages').update({read_by_user:true}).in('id',unread).then(()=>{chatMsgs.forEach(m=>{if(unread.includes(m.id))m.read_by_user=true;});const bd=$43('#chatBadge');if(bd)bd.hidden=true;});
  b.onclick=async e=>{
    if(ch&&await ch.click(e))return;
    const tp=e.target.closest('[data-stopic]');if(tp){supTopic=tp.dataset.stopic;b.querySelectorAll('[data-stopic]').forEach(x=>{x.classList.toggle('on',x===tp);x.setAttribute('aria-pressed',String(x===tp));});$43('#chatText').focus();return;}
    if(e.target.closest('#chatBiz')){openBizJoin();return;}
    if(e.target.closest('[data-close96]')){$43('#btnCloseSheet').click();return;}
    const qk=e.target.closest('[data-qk96]');if(qk){const ta=$43('#chatText');ta.value=(ta.value?ta.value+' ':'')+qk.dataset.qk96;ta.dispatchEvent(new Event('input'));ta.focus();return;}
    if(e.target.closest('#chatDone')){const {error}=await sb.from('support_messages').insert({user_id:authUser.id,body:'✓ '+T('הבעיה נפתרה, תודה!','Resolved, thanks!')});if(!error){supStatus={status:'closed'};flash('🙏 '+T('תודה! שמחנו לעזור','Thanks!'));await loadChat();draw();}return;}
    if(e.target.closest('#chatSend')){const t=$43('#chatText').value.trim();if(!t)return;if(hasProfanity(t)){reportAbuse(t,'chat');flash('🙏 '+T('נא לכתוב בלשון נקייה','Please keep it clean'));return;}
      const editing=ch.mode==='edit';const newTicket=!editing&&(!chatMsgs.length||(supStatus&&supStatus.status==='closed'));if(newTicket&&!supTopic)supTopic='שאלה כללית';
      const btn=e.target.closest('#chatSend');btn.disabled=true;const res=await ch.submit(t,{topic:newTicket?supTopic:''});btn.disabled=false;if(!res)return;
      $43('#chatText').value='';
      if(res==='sent'){supStatus={status:'open',topic:newTicket?supTopic:(supStatus&&supStatus.topic)||''};supTopic='';}
      await loadChat();draw();if(res!=='same')flash(res==='edited'?'✏️ '+T('ההודעה עודכנה','Message updated'):'💬 '+T('נשלח — נענה בהקדם','Sent'));}
  };
  b.onkeydown=e=>{if(e.key==='Escape'&&ch&&ch.escape()){e.stopPropagation();return;}
    if(e.target.id==='chatText')enterSends96(e,$43('#chatSend'));};
};

/* ---------- 2. המנהל: הודעות למשתמשים מתוך האתר (רשימת השיחות ב-js/020.js) ---------- */
let ch43=null;
drawThread161=async function(b,uid,quiet){
  if(quiet&&ch43&&ch43.uid===uid&&ch43.busy())return;
  const {data,error}=await sb.from('support_messages').select('*').eq('user_id',uid).order('created_at').limit(300);
  if(error){b.innerHTML='<p class="muted-note">⚠️ '+esc(error.message)+'</p>';return;}
  if(quiet&&ch43&&ch43.uid===uid&&$43('#adm161m')){ch43.msgs=data||[];ch43.render(true);}
  else{
    const t=adm161.threads.find(x=>x.user_id===uid)||{};let who=t.name||t.email;
    if(!who){if(!adm161.users){const {data:us}=await sb.rpc('admin_user_list');adm161.users=us||[];}const u=adm161.users.find(x=>x.id===uid)||{};who=u.name||u.email||'?';}
    b.innerHTML='<div id="adm161" class="c96"><div class="hd96"><button type="button" class="bk96" data-back161 aria-label="'+T('לכל השיחות','All conversations')+'" title="'+T('לכל השיחות','All conversations')+'" data-noicon>'+SVG43.back+'</button>'+avatar96(who,uid)+
        '<div class="who96"><b>'+esc(who)+'</b>'+(t.email?'<small dir="ltr">'+esc(t.email)+'</small>':'')+'</div></div>'+
      '<div class="box43" id="adm161m" aria-live="polite" data-noicon></div><div class="bar43" id="adm161bar"></div>'+composer96('adm161txt','adm161send',{pic:true})+'</div>';
    ch43=chat43({staff:true,uid,box:$43('#adm161m'),bar:$43('#adm161bar'),text:$43('#adm161txt'),empty:'<div class="hi96">'+T('עוד אין הודעות — כתבו ראשונים 👇','No messages yet 👇')+'</div>',
      tail:m=>(m.topic==='broadcast'?' · 📣':'')+(m.from_staff?ticks96(m.read_by_user,m.delivered_user,true):'')});
    ch43.msgs=data||[];ch43.render();
    b.onclick=async e=>{if(await ch43.click(e))return;
      if(e.target.closest('[data-back161]')){adm161.open=null;ch43=null;await drawThreads161(b);return;}
      if(e.target.closest('#adm161send')){const btn=e.target.closest('#adm161send');btn.disabled=true;const res=await ch43.submit($43('#adm161txt').value);btn.disabled=false;if(!res)return;
        $43('#adm161txt').value='';if(res==='sent')logAct('message_user',who);await drawThread161(b,uid,'after');}};
    $43('#adm161txt').onkeydown=e=>{if(e.key==='Escape'&&ch43.escape()){e.stopPropagation();return;}enterSends96(e,$43('#adm161send'));};}
  const unread=(data||[]).filter(m=>!m.from_staff&&!m.read_by_staff).map(m=>m.id);if(unread.length)sb.from('support_messages').update({read_by_staff:true}).in('id',unread).then(()=>{},()=>{});
};

/* ---------- 3. בק אופיס ← 💬 צ'אט עם משתמשים: תיבת פניות — רשימה בצד ושיחה פתוחה ---------- */
const CANNED96=['שלום! תודה שפנית אלינו 🙂 איך אפשר לעזור?','תודה על הדיווח! אנחנו בודקים ונעדכן בהקדם.','תוקן — אפשר לרענן את האתר ולנסות שוב 🙏','כדי לדווח מחיר: לשונית "מחירים" ← "דיווח מחיר" ← שם המוצר, החנות והמחיר.','לכניסה מחדש: במסך הכניסה לוחצים "שכחתי קוד" ומקבלים מייל לבחירת קוד חדש.','תודה רבה על ההצעה! העברנו אותה לצוות 💡','שמחנו לעזור! הפנייה נסגרה — אפשר תמיד לכתוב שוב 💚'];
const sup96={filter:'open',uid:null,q:'',threads:[],seq:0};
let bo43=null;
const date96=d=>d?new Date(d).toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric'}):'—';
async function side96(sd,t){
  if(!sup96.users||Date.now()-sup96.usersAt>3e5){try{const {data}=await sb.rpc('admin_user_list');sup96.users=data||[];sup96.usersAt=Date.now();}catch(e){sup96.users=[];}}
  if(!sd.isConnected||sup96.uid!==t.user_id)return;
  const u=(sup96.users||[]).find(x=>x.id===t.user_id)||{};const on=u.last_seen&&Date.now()-new Date(u.last_seen).getTime()<5*60*1000;
  const kv=(k,v)=>'<div class="kv96"><span>'+k+'</span><b>'+v+'</b></div>';
  sd.innerHTML='<div class="pf96">'+avatar96(t.name||t.email,t.user_id,'lg')+'<b>'+esc(t.name||u.name||'—')+'</b><small dir="ltr">'+esc(t.email||u.email||'')+'</small>'+(on?'<span class="on96">מחובר עכשיו</span>':'')+'</div>'+
    '<h5>פרטים</h5>'+kv('נרשם',esc(date96(u.created_at)))+kv('נראה לאחרונה',on?'עכשיו':esc(u.last_seen?when96(u.last_seen):'—'))+kv('הודעות בשיחה',esc(t.total||0))+kv('נושא',esc(t.topic||'—'))+kv('מצב',(t.status||'open')==='open'?'פתוחה':'טופלה')+
    (typeof window.boOpenUser23==='function'&&(t.email||u.email)?'<h5>פעולות</h5><button type="button" class="hb96 wide" data-user96="'+esc(t.email||u.email)+'">👤 פתיחת המשתמש</button>':'');}
const when96=d=>{d=new Date(d);const now=new Date();if(dayKey(d)===dayKey(now))return fmtTime(d);const y=new Date(now);y.setDate(y.getDate()-1);if(dayKey(d)===dayKey(y))return 'אתמול';return d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric'});};
window.boView&&window.boView('support',async function(){const main=$43('#boMain');const seq=++sup96.seq;
  const {data,error}=await sb.rpc('support_threads');if(seq!==sup96.seq)return;
  if(error){main.innerHTML='<div class="card"><p class="muted">⚠️ צריך להריץ שוב את קוד ה-SQL מ"⚙️ הגדרה ראשונית".</p></div>';return;}
  sup96.threads=data||[];if(sup96.uid&&!sup96.threads.some(t=>t.user_id===sup96.uid))sup96.uid=null;
  const all=sup96.threads,cnt=s=>all.filter(t=>(t.status||'open')===s).length,unread=all.reduce((a,t)=>a+(t.unread||0),0);
  main.innerHTML='<div class="c96 in96'+(sup96.uid?' has':'')+'"><aside class="ls96" aria-label="פניות">'+
      '<div class="lh96"><b>💬 פניות</b>'+(unread?'<span class="n96">'+unread+' לא נקראו</span>':'')+'</div>'+
      '<label class="q96">'+SVG43.search+'<input id="supQ96" type="search" placeholder="חיפוש לפי שם, מייל או תוכן..." aria-label="חיפוש פנייה" value="'+esc(sup96.q)+'"></label>'+
      '<div class="tabs96" role="group" aria-label="סינון">'+[['open','פתוחות · '+cnt('open')],['closed','טופלו · '+cnt('closed')],['all','הכל']].map(([k,l])=>'<button type="button" data-sf="'+k+'" aria-pressed="'+(sup96.filter===k)+'" class="'+(sup96.filter===k?'on':'')+'">'+l+'</button>').join('')+'</div>'+
      '<div class="items96" id="supList96"></div>'+
      '<label class="rd96"><input type="checkbox" id="chRead"'+(chatCfg.showRead!==false?' checked':'')+'> הלקוחות רואים ✓✓ כשקראתי (כשכבוי — רק ✓ "נשלח")</label></aside>'+
    '<section class="cv96" id="supConv96" aria-label="שיחה"></section><aside class="sd96" id="supSide96" aria-label="פרטי המשתמש"></aside></div>';
  const drawList=()=>{const q=norm(sup96.q).toLowerCase();
    const th=all.filter(t=>(sup96.filter==='all'||(t.status||'open')===sup96.filter)&&(!q||(norm(t.name)+' '+t.email+' '+norm(t.last_body)).toLowerCase().includes(q)));
    $43('#supList96').innerHTML=th.length?th.map(t=>'<button type="button" class="it96'+(t.user_id===sup96.uid?' on':'')+(t.unread?' un':'')+'" data-th="'+esc(t.user_id)+'">'+avatar96(t.name||t.email,t.user_id)+
      '<span class="tx96"><span class="r1"><b>'+esc(t.name||t.email||'—')+'</b><small>'+esc(when96(t.last_at))+'</small></span>'+
      '<span class="r2"><span>'+(t.last_from_staff?'↩️ אתה: ':'')+esc(String(t.last_body||'').slice(0,90))+'</span>'+(t.unread?'<i class="cnt96">'+t.unread+'</i>':'')+'</span>'+
      (t.topic||(t.status||'open')==='closed'?'<span class="tg96">'+((t.status||'open')==='closed'?'✓ טופלה':'')+(t.topic&&(t.status||'open')==='closed'?' · ':'')+esc(t.topic||'')+'</span>':'')+'</span></button>').join(''):'<p class="muted em96">אין פניות כאן.</p>';};
  const drawConv=async()=>{const cv=$43('#supConv96');const uid=sup96.uid;
    main.querySelector('.in96').classList.toggle('has',!!uid);
    const sd=$43('#supSide96');sd.innerHTML='';
    if(!uid){bo43=null;cv.innerHTML='<div class="none96">💬<br>בחרו פנייה מהרשימה</div>';return;}
    const t=all.find(x=>x.user_id===uid)||{};const open=(t.status||'open')==='open';
    /* פרטי המשתמש בצד (מסכים רחבים) */
    side96(sd,t);
    cv.innerHTML='<div class="hd96"><button type="button" class="bk96" data-back96 aria-label="לכל הפניות" title="לכל הפניות" data-noicon>'+SVG43.back+'</button>'+avatar96(t.name||t.email,uid)+
        '<div class="who96"><b>'+esc(t.name||'—')+'</b><small dir="ltr">'+esc(t.email||'')+'</small></div>'+
        (t.topic?'<span class="st96 tp">'+esc(t.topic)+'</span>':'')+'<span class="st96 '+(open?'open':'closed')+'">'+(open?'פתוחה':'✓ טופלה')+'</span>'+
        (open?'<button type="button" class="hb96 pri" id="supClose">'+SVG43.ok+' סימון כטופל</button>':'<button type="button" class="hb96" id="supReopen">'+SVG43.undo+' פתיחה מחדש</button>')+
        '<button type="button" class="hb96 ic" id="supDel" title="מחיקת השיחה" aria-label="מחיקת השיחה" data-noicon>'+SVG43.del+'</button></div>'+
      '<div class="box43" id="supBox" aria-live="polite" data-noicon><div class="hi96">טוען...</div></div>'+
      '<div class="qr96 can96" data-noicon role="group" aria-label="תשובות מוכנות">'+CANNED96.map((c,i)=>'<button type="button" data-can="'+i+'" title="'+esc(c)+'">⚡ '+esc(c.length>34?c.slice(0,32)+'…':c)+'</button>').join('')+'</div>'+
      '<div class="bar43" id="supBar43"></div>'+composer96('supReply','supSend',{pic:true,ph:'כתבו תשובה...'})+
      '<div class="ft96"><button type="button" id="supSendClose">📨 שליחה וסגירת הפנייה</button></div>';
    const {data:ms,error:er}=await sb.from('support_messages').select('*').eq('user_id',uid).order('created_at').limit(500);
    if(seq!==sup96.seq||sup96.uid!==uid)return;
    if(er){$43('#supBox').innerHTML='<p class="muted">⚠️ '+esc(er.message)+'</p>';return;}
    bo43=chat43({staff:true,uid,box:$43('#supBox'),bar:$43('#supBar43'),text:$43('#supReply'),empty:'<div class="hi96">עוד אין הודעות</div>',
      tag:m=>m.topic&&!m.from_staff&&m.topic!=='broadcast'?'<span class="tg43">📌 '+esc(m.topic)+'</span>':'',
      tail:m=>(m.topic==='broadcast'?' · 📣':'')+(m.from_staff?ticks96(m.read_by_user,m.delivered_user,true):'')});
    bo43.msgs=ms||[];bo43.render();
    $43('#supReply').onkeydown=e=>{if(e.key==='Escape'&&bo43&&bo43.escape()){e.stopPropagation();return;}enterSends96(e,$43('#supSend'));};
    if((ms||[]).some(m=>!m.from_staff&&!m.read_by_staff))sb.from('support_messages').update({read_by_staff:true}).eq('user_id',uid).eq('from_staff',false).eq('read_by_staff',false).then(()=>{t.unread=0;drawList();},()=>{});};
  drawList();await drawConv();
  const setSt=s=>sb.from('support_status').upsert({user_id:sup96.uid,status:s,updated_at:new Date().toISOString()});
  const okq=async(q,msg)=>{const {error:e}=await q;if(e){flash('⚠️ '+e.message);return false;}if(msg)flash(msg);return true;};
  main.oninput=e=>{if(e.target.id==='supQ96'){sup96.q=e.target.value;drawList();}};
  main.onchange=async e=>{if(e.target.id==='chRead'){const v=e.target.checked;if(await okq(sb.from('site_config').upsert({key:'chat',value:Object.assign({},chatCfg,{showRead:v}),updated_at:new Date().toISOString()}),'✔️ נשמר'))chatCfg.showRead=v;}};
  main.onkeydown=e=>{if(e.key==="Escape"&&bo43&&main.contains(bo43.box)&&bo43.escape())e.stopPropagation();};
  main.onclick=async e=>{
    if(bo43&&main.contains(bo43.box)&&await bo43.click(e))return;
    const f=e.target.closest('[data-sf]');if(f){sup96.filter=f.dataset.sf;main.querySelectorAll('[data-sf]').forEach(x=>{x.classList.toggle('on',x===f);x.setAttribute('aria-pressed',String(x===f));});drawList();return;}
    const t=e.target.closest('[data-th]');if(t){sup96.uid=t.dataset.th;drawList();await drawConv();const ta=$43('#supReply');if(ta&&!TOUCH_KB)ta.focus();return;}
    const us=e.target.closest('[data-user96]');if(us){window.boOpenUser23(us.dataset.user96);return;}
    if(e.target.closest('[data-back96]')){sup96.uid=null;drawList();await drawConv();return;}
    const cn=e.target.closest('[data-can]');if(cn){const r=$43('#supReply');r.value=(r.value?r.value+'\n':'')+CANNED96[+cn.dataset.can];r.dispatchEvent(new Event('input'));r.focus();return;}
    const send=async close=>{if(!bo43)return;const btn=e.target.closest('button');btn.disabled=true;const res=await bo43.submit($43('#supReply').value);btn.disabled=false;if(!res)return;
      if(close&&res==='sent')await setSt('closed');if(res==='sent')logAct('message_user',(all.find(x=>x.user_id===sup96.uid)||{}).name||'');
      if(res!=='same')flash(res==='edited'?'✏️ ההודעה עודכנה':close?'📨 נשלח והפנייה נסגרה':'📨 נשלח');window.boShow('support');};
    if(e.target.closest('#supSend'))return send(false);
    if(e.target.closest('#supSendClose'))return send(true);
    if(e.target.closest('#supClose')){if(await okq(setSt('closed'),'✓ סומנה כטופלה'))window.boShow('support');return;}
    if(e.target.closest('#supReopen')){if(await okq(setSt('open'),'↩️ נפתחה מחדש'))window.boShow('support');return;}
    if(e.target.closest('#supDel')&&(await uiConfirm('למחוק את כל השיחה עם המשתמש?'))&&await okq(sb.from('support_messages').delete().eq('user_id',sup96.uid),'🗑️ נמחק')){await sb.from('support_status').delete().eq('user_id',sup96.uid);sup96.uid=null;window.boShow('support');}};
});

}catch(e){console.warn('v43',e);}
