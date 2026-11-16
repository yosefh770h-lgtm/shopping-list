
/* ================= 💬 תשובה מצוות האתר — רואים אותה מיד, גם בלי להיכנס לצ'אט =================
   עד עכשיו תשובה מהצוות הופיעה רק כמספר קטן על 💬 (שהתעדכן פעם בדקה וחצי), והתראה בטלפון הגיעה רק למי שהדליק את הפעמון.
   1. בדיקה בזמן אמת (Realtime על support_messages — כל אחד מקבל רק את ההודעות שלו, לפי ההרשאות בשרת),
      ובנוסף בדיקה קלה כל 30 שניות כשהמסך פתוח (רק מזהים, בלי התמונות) — למקרה שהזמן האמת לא זמין.
   2. הודעה קופצת באתר ובאפליקציה: "צוות האתר ענה לך" עם "לקריאה" שפותח את הצ'אט. כל הודעה קופצת פעם אחת.
   3. התראה בטלפון/בדפדפן גם בלי להדליק את הפעמון — זו תשובה לפנייה שהמשתמש עצמו שלח.
      מי שכיבה את הפעמון במפורש לא מקבל התראה (רק את ההודעה הקופצת). הטלפון עצמו עדיין צריך להרשות התראות.
   4. בפעמון: שורה בראש "יש לך X הודעות חדשות מצוות האתר" שפותחת את הצ'אט.
   5. אם הצ'אט כבר פתוח — ההודעה החדשה נכנסת לשיחה מיד, והטקסט שבאמצע הכתיבה נשאר. */
(function(){
  if(typeof loadChat!=='function'||typeof openChat!=='function')return;
  const $=s=>document.querySelector(s);
  const KEY='yam_chat_popped';
  let popped=[];try{popped=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(popped))popped=[];}catch(e){popped=[];}
  const savePopped=()=>{try{localStorage.setItem(KEY,JSON.stringify(popped.slice(-200)));}catch(e){}};
  let opening=0,rt=null,rtFor='';
  const unreadMsgs=()=>(Array.isArray(chatMsgs)?chatMsgs:[]).filter(m=>m.from_staff&&!m.read_by_user);
  const chatIsOpen=()=>{const s=$('#v8Sheet');return !!(s&&s.classList.contains('open')&&$('#v8SheetBody #chatBox'));};
  const txt=m=>String((m&&m.body)||'').trim()||(m&&m.image?'📷 '+T('תמונה','Photo'):'');

  /* 3. התראה בטלפון גם כשהפעמון לא הודלק (רק אם לא כובה במפורש) */
  chatTell=function(list){
    let told=[];try{told=JSON.parse(localStorage.getItem(CHAT_TOLD_KEY)||'[]');if(!Array.isArray(told))told=[];}catch(e){told=[];}
    const fresh=list.filter(m=>!told.includes(m.id));if(!fresh.length)return;
    const inApp=/YamShoppingApp\//.test(navigator.userAgent||'');
    fresh.forEach(m=>{if(prefs.notify!==false&&!(inApp&&Date.parse(m.created_at)<CHAT_T0))sysNotify(T('💬 צוות האתר ענה לך','💬 The team replied'),txt(m),'chat:'+m.id,'./?openchat=1');});
    try{localStorage.setItem(CHAT_TOLD_KEY,JSON.stringify(told.concat(fresh.map(m=>m.id)).slice(-200)));}catch(e){}
  };

  /* 2. הודעה קופצת */
  function hideToast(){const t=$('#chatPop');if(t){t.classList.remove('show');setTimeout(()=>t.remove(),250);}}
  function toast(m,n){
    hideToast();const d=document.createElement('div');d.id='chatPop';d.setAttribute('role','status');d.setAttribute('aria-live','polite');
    d.innerHTML='<button class="cp-main" data-cpopen><span class="cp-ic" aria-hidden="true">💬</span><span class="cp-tx"><b>'+(n>1?T('צוות האתר ענה לך ('+n+' הודעות חדשות)','The team replied ('+n+' new)'):T('צוות האתר ענה לך','The team replied'))+'</b><small>'+esc(txt(m).slice(0,140))+'</small></span><span class="cp-go">'+T('לקריאה','Read')+'</span></button><button class="cp-x" data-cpx aria-label="'+T('סגירה','Close')+'">✕</button>';
    document.body.appendChild(d);requestAnimationFrame(()=>d.classList.add('show'));
    d.onclick=e=>{e.stopPropagation();if(e.target.closest('[data-cpx]')){hideToast();return;}if(e.target.closest('[data-cpopen]')){hideToast();openChat();}};
    clearTimeout(toast._t);toast._t=setTimeout(hideToast,20000);
    const b=$('#btnChat');if(b){b.classList.remove('ring65');void b.offsetWidth;b.classList.add('ring65');setTimeout(()=>b.classList.remove('ring65'),2600);}
  }

  /* 5. הצ'אט פתוח — מרעננים אותו בלי לאבד את מה שבאמצע הכתיבה */
  async function refreshOpen(){
    const t=$('#chatText'),draft=t?t.value:'',focus=document.activeElement===t;
    await openChat();
    const n=$('#chatText');if(n){if(draft&&!n.value)n.value=draft;if(focus)n.focus();}
  }

  function after(){
    if(!authUser){unsub();return;}
    sub();
    const fresh=unreadMsgs().filter(m=>!popped.includes(m.id));
    if(!fresh.length)return;
    popped=popped.concat(fresh.map(m=>m.id));savePopped();
    if(opening)return;               /* בתוך פתיחת הצ'אט עצמה — ההודעות כבר מוצגות */
    if(chatIsOpen()){refreshOpen();return;}
    toast(fresh[fresh.length-1],unreadMsgs().length);
  }
  const _lc=loadChat;
  loadChat=async function(){const r=await _lc.apply(this,arguments);try{if(r)after();}catch(e){}return r;};
  const _oc=openChat;
  openChat=async function(){opening++;hideToast();try{return await _oc.apply(this,arguments);}finally{opening--;}};

  /* 1. זמן אמת + בדיקה קלה */
  function sub(){
    if(!sb||!authUser||authUser.is_anonymous||typeof sb.channel!=='function'||rtFor===authUser.id)return;
    unsub();rtFor=authUser.id;
    try{rt=sb.channel('sup-'+authUser.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'support_messages',filter:'user_id=eq.'+authUser.id},p=>{if(p&&p.new&&p.new.from_staff)loadChat();}).subscribe();}catch(e){rt=null;}
  }
  function unsub(){if(rt){try{sb.removeChannel(rt);}catch(e){}}rt=null;rtFor='';}
  let busy=false;
  async function peek(){
    if(busy||document.visibilityState!=='visible'||!sb||!authUser||authUser.is_anonymous)return;busy=true;
    try{const {data,error}=await sb.from('support_messages').select('id').eq('user_id',authUser.id).eq('from_staff',true).eq('read_by_user',false).limit(20);
      if(!error&&Array.isArray(data)){const known=new Set(unreadMsgs().map(m=>m.id));if(data.some(x=>!known.has(x.id))||data.length!==known.size)await loadChat();}}
    catch(e){}finally{busy=false;}
  }
  setInterval(peek,30000);

  /* 4. שורה בפעמון */
  const _rn=renderNotif;
  renderNotif=function(){const r=_rn.apply(this,arguments);try{
    const b=$('#notifBody');const n=unreadMsgs().length;if(!b||!n||b.querySelector('#nChat65'))return r;
    const last=unreadMsgs().slice(-1)[0];
    b.insertAdjacentHTML('afterbegin','<button class="nitem unread nchat65" id="nChat65"><span class="ni">💬</span><span class="nb"><b>'+(n>1?T('יש לך '+n+' הודעות חדשות מצוות האתר','You have '+n+' new messages from the team'):T('יש לך הודעה חדשה מצוות האתר','You have a new message from the team'))+'</b><p>'+esc(txt(last).slice(0,140))+'</p><small>'+T('לחצו לקריאה ולתשובה','Tap to read and reply')+'</small></span></button>');
  }catch(e){}return r;};
  document.addEventListener('click',e=>{if(!e.target.closest('#nChat65'))return;e.stopPropagation();const o=$('#notifOverlay');if(o)o.classList.remove('open');openChat();},true);
})();
