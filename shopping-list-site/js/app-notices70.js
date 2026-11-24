/* ================= 70: 📲 התראות מהבק אופיס גם כשהאפליקציה פתוחה (1.9 ומעלה) =================
   הבדיקה ברקע של אנדרואיד יכולה להתעכב בגלל חיסכון בסוללה. לכן כשהאפליקציה פתוחה האתר בודק בעצמו:
   מיד בפתיחה, כל 3 דקות, וכשחוזרים לאפליקציה. השרת זוכר איזה טלפון קיבל איזו התראה, כך שהיא לא תגיע פעמיים. */
(function(){
  if(!/YamShoppingApp\//.test(navigator.userAgent||''))return;
  const A=window.YamApp;let info={};try{info=A&&A.appInfo?JSON.parse(A.appInfo()||'{}'):{};}catch(e){}
  if(!info.release||typeof A.inboxLink!=='function'||typeof A.notify!=='function')return;
  let tok='',busy=false,last=0;
  const _nat=window.yamNat66;
  window.yamNat66=function(kind,a){if(kind==='token'&&/^[0-9a-f]{48}$/.test(String(a||''))){const first=!tok;tok=String(a);if(first)setTimeout(check,500);}return _nat&&_nat.apply(this,arguments);};
  async function check(){if(!tok||busy||typeof sb==='undefined'||!sb||document.hidden)return;const now=Date.now();if(now-last<60000)return;busy=true;last=now;
    try{const {data,error}=await sb.rpc('app_notices_for',{p_token:tok,p_since:null});
      if(!error&&Array.isArray(data))data.forEach(n=>{try{A.notify(String(n.title||''),String(n.body||''),'notice:'+n.id,String(n.url||''));}catch(e){}});}catch(e){}
    busy=false;}
  setTimeout(()=>{try{A.inboxLink();}catch(e){}},4000);
  setInterval(check,180000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
})();
