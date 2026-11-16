
/* 🤖 הורדת האפליקציה לאנדרואיד: פריט בתפריט, ובמסך הכניסה בטלפון אנדרואיד. בתוך האפליקציה ובאייפון לא מופיע */
(function(){
  const ua=navigator.userAgent||'';
  if(/YamShoppingApp\//.test(ua)||/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1))return;
  const APK='/download/yamshopping.apk',isAndroid=/Android/i.test(ua);
  function sheet(src){
    const sh=document.querySelector('#v8Sheet');sh.classList.add('over53');
    new MutationObserver((m,o)=>{if(!sh.classList.contains('open')){sh.classList.remove('over53');o.disconnect();}}).observe(sh,{attributes:true,attributeFilter:['class']});
    const b=openSheet('🤖 '+T('האפליקציה לאנדרואיד','The Android app'),
      '<div class="apks53"><div id="apkInfo57"></div><p class="muted-note">'+T('אותה רשימה ואותו חשבון, באפליקציה משלה. עובדת גם בטלפון מסונן בלי כרום, עם סריקת ברקוד, מיקום וגיבוי לתיקיית ההורדות.','Same list and account in its own app. Works on filtered phones without Chrome, with barcode scanning, location and backups to Downloads.')+'</p>'+
      '<a class="apkdl53" id="apkDl53" href="'+APK+'" download="yamshopping.apk">⬇️ '+T('הורדת האפליקציה (APK)','Download the app (APK)')+'</a>'+
      '<ol><li>'+T('לוחצים על הקובץ שירד (או בהתראה "ההורדה הושלמה").','Open the downloaded file (or the "Download complete" notification).')+'</li>'+
      '<li>'+T('אם הטלפון שואל: "הגדרות" ← מאשרים "התקנה ממקור זה".','If asked: Settings → allow "Install from this source".')+'</li>'+
      '<li>'+T('לוחצים "התקנה", ואז "פתיחה". נכנסים עם המייל והקוד.','Tap Install, then Open. Sign in with your email and code.')+'</li></ol>'+
      (isAndroid?'':'<p class="muted-note">💻 '+T('מהמחשב: מורידים ושולחים את הקובץ לטלפון, או פותחים את האתר בטלפון ומורידים משם.','On a computer: download and send the file to your phone, or open the site on the phone.')+'</p>')+
      '<p class="muted-note">🔒 '+T('הקובץ חתום ומגיע ישר מהאתר שלנו. כל עדכון באתר מגיע לאפליקציה מעצמו.','The file is signed and comes straight from our site. Site updates reach the app automatically.')+'</p></div>');
    const a=b.querySelector('#apkDl53');if(a)a.addEventListener('click',()=>{setTimeout(()=>flash('⬇️ '+T('ההורדה התחילה','Download started')),300);if(window.apkLog55)apkLog55('download',typeof src==='string'?src:'');});
    if(window.apkInfo57)apkInfo57(b.querySelector('#apkInfo57'));
  }
  window.openApk53=sheet;
  /* תפריט: מתחת ל"התקנת האפליקציה" */
  const mi=document.querySelector('#miInstall');
  if(mi&&!document.querySelector('#miApk53')){mi.insertAdjacentHTML('afterend','<button id="miApk53">🤖<span>'+T('הורדת האפליקציה לאנדרואיד (APK)','Download the Android app (APK)')+'</span></button>');
    document.querySelector('#miApk53').onclick=()=>{document.querySelector('#hMenu').classList.remove('open');sheet('menu');};}
  /* עיצוב 2.0: במסך הכניסה כבר אין כפתור הורדה — רק בתפריט ובקישור הישיר */
  /* קישור ישיר: yamshopping.com/#apk או ?apk */
  if(/^#apk$/i.test(location.hash)||/[?&]apk(=|&|$)/i.test(location.search))setTimeout(()=>sheet('link'),600);
})();
