/* 🍪 הודעת עוגיות ואחסון במכשיר (נובמבר 2026).
   האתר לא משתמש בעוגיות פרסום או מעקב, ולא בכלי מעקב של צד שלישי. נשמר בדפדפן רק מה שצריך כדי שהאתר יעבוד:
   החיבור לחשבון, הרשימות, ההגדרות ועותק לעבודה בלי אינטרנט (localStorage / IndexedDB / Service Worker).
   לכן זו הודעה עם "הבנתי" (אין מה "לסרב" לו בלי שהאתר יפסיק לעבוד). הפירוט: privacy.html#cookies.
   מוצג פעם אחת לכל מכשיר; לא באפליקציה האופליין (אין בה אינטרנט בכלל). האישור נשמר ב-yam_cookie_ok (התאריך) */
(function(){
const KEY='yam_cookie_ok';
const get=()=>{try{return localStorage.getItem(KEY);}catch(e){return '1';}};
if(typeof OFF_APP!=='undefined'&&OFF_APP)return;
if(get())return;
function show(){if(get()||document.getElementById('ck88'))return;
  const d=document.createElement('div');d.id='ck88';d.setAttribute('role','region');d.setAttribute('aria-label',T('הודעה על עוגיות','Cookie notice'));
  d.innerHTML='<p>🍪 '+T('האתר שומר במכשיר רק מה שצריך כדי שיעבוד: החיבור לחשבון, הרשימות וההגדרות. אין עוגיות פרסום או מעקב.','This site stores on your device only what it needs to work: your sign-in, lists and settings. No advertising or tracking cookies.')+
    ' <a href="privacy.html#cookies" target="_blank" rel="noopener">'+T('לפרטים','Details')+'</a></p><button type="button" class="btn" id="ck88ok">'+T('הבנתי, מאשר/ת','OK, I agree')+'</button>';
  document.body.appendChild(d);
  /* מעל סרגל הלשוניות התחתון (מצב אפליקציה), כדי לא להסתיר אותו */
  const bar=[...document.querySelectorAll('.tabs,nav')].find(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.top>innerHeight*0.6&&r.bottom>=innerHeight-4;});
  if(bar)d.style.bottom=(innerHeight-bar.getBoundingClientRect().top+10)+'px';
  d.querySelector('#ck88ok').onclick=()=>{try{localStorage.setItem(KEY,new Date().toISOString().slice(0,10));}catch(e){}d.remove();};}
const st=document.createElement('style');
st.textContent='#ck88{position:fixed;inset-inline:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147483000;max-width:560px;margin:0 auto;display:flex;gap:10px;align-items:center;'+
  'padding:10px 12px;border-radius:14px;background:var(--card,#fff);color:var(--text,#222);border:1px solid var(--line,#ddd);box-shadow:0 6px 24px rgba(0,0,0,.18);font-size:13.5px;line-height:1.45}'+
  '#ck88 p{margin:0;flex:1}#ck88 a{color:inherit;text-decoration:underline}#ck88 .btn{flex:none;width:auto;margin:0;padding:8px 14px;font-size:14px;white-space:nowrap}';
document.head.appendChild(st);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1500));else setTimeout(show,1500);
})();
