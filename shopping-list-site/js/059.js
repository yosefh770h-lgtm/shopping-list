
/* 🔄 עדכון לאפליקציה לאנדרואיד: מי שפותח גרסה ישנה רואה בכניסה פס קטן "יש עדכון" שנעלם לבד אחרי כמה שניות.
   רק הודעה — בלי הורדה מתוך האפליקציה (את העדכון מורידים מהאתר בדפדפן). הגרסה האחרונה — מ-download/app-version.json */
(function(){
  let APK_LATEST='2.1';
  const m=(navigator.userAgent||'').match(/YamShoppingApp\/([0-9.]+)/);if(!m)return;
  const older=(a,b)=>{a=a.split('.').map(Number);b=b.split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x<y;}return false;};
  function show(){
    if(document.querySelector('#apkUp56'))return;
    const d=document.createElement('div');d.id='apkUp56';d.setAttribute('role','status');
    d.innerHTML='<span role="button" tabindex="0" id="apkGo56">🔄 '+T('יש גרסה חדשה לאפליקציה ('+APK_LATEST+') · לפרטים','New app version ('+APK_LATEST+') · details')+'</span><button type="button" id="apkOk56" aria-label="'+T('סגירה','Close')+'">✕</button>';
    document.body.appendChild(d);
    const close=()=>{d.classList.remove('show');setTimeout(()=>d.remove(),400);};
    d.querySelector('#apkOk56').onclick=close;
    /* לחיצה: מה חדש, ושהעדכונים של האתר כבר מגיעים לבד. הורדה רק למי שרוצה את התוספות של הגרסה */
    d.querySelector('#apkGo56').onclick=()=>{close();const b=openSheet('🔄 '+T('גרסה חדשה לאפליקציה','New app version'),'<div class="apks53"><div id="apkInfo56"></div>'+
      '<p class="muted-note">✨ '+T('כל השיפורים באתר כבר נמצאים אצלך באפליקציה — הם מתעדכנים לבד, בלי להוריד כלום. הגרסה החדשה מוסיפה רק דברים של הטלפון עצמו (כמו התראות). אפשר להמשיך להשתמש באפליקציה הנוכחית.','Every site improvement is already in your app — it updates by itself. The new version only adds phone features (like notifications).')+'</p>'+
      '<a class="apkdl53" href="/download/yamshopping.apk" download="yamshopping.apk">⬇️ '+T('להורדת הגרסה החדשה','Download the new version')+'</a>'+
      '<p class="muted-note">'+T('אחרי ההורדה: לוחצים על הקובץ ← "עדכון". הרשימות והחשבון נשארים.','After downloading: open the file → Update. Your lists and account stay.')+'</p></div>');
      if(window.apkInfo57)apkInfo57(b.querySelector('#apkInfo56'),true);};
    d.querySelector('#apkGo56').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.currentTarget.click();}};
    requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add('show')));
    setTimeout(close,9000);
  }
  (window.apkVer57?apkVer57():Promise.resolve(null)).then(v=>{if(v&&v.version)APK_LATEST=v.version;if(older(m[1],APK_LATEST))setTimeout(show,2000);});
})();
