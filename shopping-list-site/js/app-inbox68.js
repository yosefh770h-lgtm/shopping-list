/* ================= 68: 💬 הודעות מהצוות כהתראה בטלפון גם כשהאפליקציה סגורה (אפליקציה 1.8 ומעלה) =================
   אחרי כניסה לחשבון: האפליקציה נותנת מזהה סודי של הטלפון, והאתר מצמיד אותו לחשבון (app_device_register).
   מעכשיו הבדיקה ברקע (כל רבע שעה) רואה הודעות חדשות מהצוות ומראה אותן כהתראת שיחה, עם "השב" ו"סימון כנקרא".
   ביציאה מהחשבון — הטלפון מתנתק. */
(function(){
  if(!/YamShoppingApp\//.test(navigator.userAgent||''))return;
  const A=window.YamApp;let info={};try{info=A&&A.appInfo?JSON.parse(A.appInfo()||'{}'):{};}catch(e){}
  if(!info.inbox||typeof A.inboxLink!=='function')return;
  let tok='',linkedFor='';
  const _nat=window.yamNat66;
  window.yamNat66=function(kind,a){if(kind==='token'){tok=String(a||'');link();return;}return _nat&&_nat.apply(this,arguments);};
  async function link(){if(!tok||!sb||!authUser||authUser.is_anonymous||linkedFor===authUser.id)return;
    try{const {data,error}=await sb.rpc('app_device_register',{p_token:tok});if(!error&&data==='ok'){linkedFor=authUser.id;A.inboxOn(true);}}catch(e){}}
  const ask=()=>{if(!authUser||authUser.is_anonymous)return;if(tok)link();else try{A.inboxLink();}catch(e){}};
  {const _s=onSignedIn;onSignedIn=async function(){const r=await _s.apply(this,arguments);setTimeout(ask,3000);return r;};}
  setTimeout(ask,6000);
  {const _o=doLogout;doLogout=async function(){try{A.inboxOn(false);if(tok&&sb)await Promise.race([sb.rpc('app_device_forget',{p_token:tok}),new Promise(r=>setTimeout(r,2000))]);}catch(e){}linkedFor='';return _o.apply(this,arguments);};}
  /* פתחו את הצ'אט — ההתראה בטלפון כבר לא צריכה להופיע */
  {const _c=openChat;openChat=async function(){try{A.clearChat();}catch(e){}return _c.apply(this,arguments);};}
  /* לחיצה על ההתראה: ?openchat=1 */
  if(/[?&]openchat=1/.test(location.search)){try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
    let n=0;const t=setInterval(()=>{if(authUser&&state.user){clearInterval(t);openChat();}else if(++n>40)clearInterval(t);},500);}
})();
