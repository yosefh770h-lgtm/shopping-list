
/* 🤖 גרסת האפליקציה לאנדרואיד: "עודכן לגרסה", "מה חדש", ומעקב אחרי עדכונים — מייל + התראה בפעמון, רק למי שלחץ "לעקוב".
   בכל גרסה חדשה: מעדכנים את download/app-version.json (גרסה, תאריך, מה חדש) ומחליפים את download/yamshopping.apk.
   המייל יוצא לבד מהפונקציה email (בריצה של כל שעה), וההתראה בפעמון מופיעה לעוקבים כשהם נכנסים לאתר. */
(function(){
  let vp=null;
  window.apkVer57=function(){if(!vp)vp=fetch('/download/app-version.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null)
    .then(v=>v&&/^\d{1,3}(\.\d{1,3}){0,3}$/.test(String(v.version||''))?v:null).catch(()=>null);return vp;};
  /* 🚀 באפליקציה 1.9 ומעלה: הגרסה שמגיעה לטלפון הזה. האפליקציה שואלת את השרת, כי בבק אופיס אפשר לשחרר גרסה רק לחלק מהמשתמשים */
  try{const A=window.YamApp,ai=A&&A.appInfo?JSON.parse(A.appInfo()||'{}'):{};
    if(ai.release&&typeof A.releaseCheck==='function'){const pub=window.apkVer57;let rp=null;
      window.apkVer57=function(){if(!rp)rp=new Promise(res=>{let done=false;const fin=v=>{if(!done){done=true;res(v);}};
        window.__rel69=j=>{let o={};try{o=JSON.parse(j||'{}');}catch(e){}
          if(!o.version){fin({version:String(ai.ver||''),notes:[]});return;}
          pub().then(p=>fin(p&&p.version===o.version?p:{version:String(o.version),notes:o.notes?String(o.notes).split(' · ').filter(Boolean):[]}));};
        try{A.releaseCheck();}catch(e){pub().then(fin);}
        setTimeout(()=>pub().then(fin),20000);});return rp;};}}catch(e){}
  const older=(a,b)=>{a=String(a||'0').split('.').map(Number);b=String(b).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x<y;}return false;};
  const fdate=d=>{try{return new Intl.DateTimeFormat('he-IL',{day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00'));}catch(e){return String(d);}};
  async function getFol(){if(!sb||!authUser)return null;try{const {data,error}=await sb.rpc('app_follow_get');return error||!data?null:data;}catch(e){return null;}}
  async function drawFol(box,v){if(!box)return;
    if(!sb||!authUser){box.innerHTML='<p class="muted-note">🔔 '+T('רוצים לדעת כשיוצאת גרסה חדשה? אחרי הכניסה לחשבון אפשר ללחוץ כאן "לעקוב אחרי עדכונים".','Want to know when a new version is out? Sign in and tap "Follow updates" here.')+'</p>';return;}
    const f=await getFol();if(!f){box.innerHTML='';return;}
    box.innerHTML=f.on
      ?'<button type="button" class="apk53 on57" id="folBtn57">✅ '+T('את/ה עוקב/ת אחרי עדכוני האפליקציה','You follow app updates')+'</button><p class="muted-note">'+T('כשתצא גרסה חדשה נשלח לך מייל והתראה בפעמון 🔔. לחיצה על הכפתור מפסיקה את המעקב.','When a new version is out you get an email and a bell notification 🔔. Tap to stop following.')+'</p>'
      :'<button type="button" class="apk53" id="folBtn57">🔔 '+T('לעקוב אחרי עדכונים','Follow updates')+'</button><p class="muted-note">'+T('כשתצא גרסה חדשה נשלח לך מייל והתראה בפעמון 🔔.','Get an email and a bell notification 🔔 when a new version is out.')+'</p>';
    box.querySelector('#folBtn57').onclick=async e=>{e.currentTarget.disabled=true;const on=!f.on;
      try{const {error}=await sb.rpc('app_follow_set',{p_on:on,p_ver:v?v.version:''});if(error)throw error;
        try{if(on&&v)localStorage.setItem('yam_apk_bell57',v.version);}catch(x){}
        flash(on?'🔔 '+T('נעדכן אותך במייל ובפעמון כשתצא גרסה חדשה','We will let you know when a new version is out'):'🔕 '+T('הפסקת לעקוב אחרי עדכוני האפליקציה','You stopped following app updates'));}
      catch(x){flash('⚠️ '+T('לא הצלחנו לשמור, נסו שוב','Could not save, try again'));}
      drawFol(box,v);};}
  /* בחלון ההורדה: גרסה, תאריך, מה חדש וכפתור המעקב. בהודעת העדכון שבאפליקציה — רק מה חדש */
  window.apkInfo57=async function(el,upd){if(!el)return;const v=await apkVer57();let h='';
    if(v){if(!upd)h+='<p class="ver57">📦 '+T('עודכן לגרסה','Updated to version')+' <b>'+esc(v.version)+'</b>'+(v.date?' · '+esc(fdate(v.date)):'')+'</p>';
      const n=(Array.isArray(v.notes)?v.notes:[]).slice(0,8);
      if(n.length)h+='<div class="new57"><b>✨ '+T('מה חדש בגרסה','What\'s new in version')+' '+esc(v.version)+'</b><ul>'+n.map(x=>'<li>'+esc(String(x))+'</li>').join('')+'</ul></div>';}
    if(upd){el.innerHTML=h;return;}
    el.innerHTML=h+'<div class="fol57"></div>';drawFol(el.querySelector('.fol57'),v);};
  /* התראה בפעמון — רק למי שעוקב, פעם אחת לכל גרסה */
  async function bell(){const f=await getFol();if(!f||!f.on)return;const v=await apkVer57();if(!v||!older(f.ver,v.version))return;
    let seen='';try{seen=localStorage.getItem('yam_apk_bell57')||'';}catch(e){}
    if(seen&&!older(seen,v.version))return;
    if(typeof notify==='function')notify('apk-'+v.version,'app',T('גרסה חדשה לאפליקציה לאנדרואיד: ','New Android app version: ')+v.version,
      ((Array.isArray(v.notes)?v.notes:[]).join(' · ')+' · '+T('להורדה: yamshopping.com/?apk','Download: yamshopping.com/?apk')).replace(/^ · /,''),'');
    try{localStorage.setItem('yam_apk_bell57',v.version);}catch(e){}}
  window.apkBell57=bell;
  {const _s=onSignedIn;onSignedIn=async function(){const r=await _s.apply(this,arguments);setTimeout(bell,5000);return r;};}
  /* הקישור "הפסקת המעקב" מהמייל: yamshopping.com/?appunf=... */
  const um=location.search.match(/[?&]appunf=([0-9a-f]{20,64})/);
  if(um){try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
    setTimeout(async()=>{try{const r=await fetch(SB_URL+'/functions/v1/email',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY},body:JSON.stringify({appunf:um[1]})});const d=await r.json();
      flash(d&&d.ok?'🔕 '+T('הפסקת לעקוב אחרי עדכוני האפליקציה. לא יישלחו אליך עוד מיילים על גרסאות חדשות.','You stopped following app updates.'):'ℹ️ '+T('המעקב אחרי עדכוני האפליקציה כבר הופסק','Already stopped'));}
      catch(e){flash('⚠️ '+T('לא הצלחנו להפסיק את המעקב, נסו שוב','Could not stop following, try again'));}},1200);}
})();
