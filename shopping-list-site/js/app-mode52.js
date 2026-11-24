/* 📱 מצב אפליקציה — רק באפליקציית האנדרואיד */
(function(){
  if(!/YamShoppingApp\//.test(navigator.userAgent))return;
  const root=document.documentElement;root.classList.add('inapp');
  /* הלשוניות עוברות לתחתית המסך (אותם כפתורים, עם אותן פעולות) */
  const tabs=document.querySelector('header .tabs'),app=document.querySelector('.app');
  if(tabs&&app){tabs.classList.add('bot52');app.appendChild(tabs);
    const fit=()=>{const h=getComputedStyle(tabs).display==='none'?0:tabs.offsetHeight;root.style.setProperty('--bb52',h+'px');};
    fit();addEventListener('resize',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe(tabs);}
  /* כניסה: שורה קטנה של אבטחה במקום הקישורים של האתר */
  const lc=document.querySelector('#login .lcard');
  if(lc&&!document.querySelector('#lSec52'))lc.insertAdjacentHTML('beforeend','<div class="lsec52" id="lSec52">🔒 '+T('חיבור מאובטח · הקוד שלך מוצפן','Secure connection · your code is encrypted')+'</div>');
})();
