
/* בחירת שפה: עברית / English. הבחירה נשמרת במכשיר, והאתר נטען מחדש בשפה החדשה */
(function(){
  const G='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';
  const P=()=>typeof prefs!=='undefined'?prefs:{lang:'he'};const en=()=>P().lang==='en';
  function setLang(l){if(l!=='en')l='he';const p=P();if(p.lang===l){close();return;}p.lang=l;try{savePrefs();}catch(e){}
    try{localStorage.setItem('yamh_prefs',JSON.stringify(p));}catch(e){}location.reload();}
  const ov=document.getElementById('lang2ov');
  function close(){ov.classList.remove('open');}
  window.openLang=function(){ov.querySelectorAll('.lop').forEach(b=>b.classList.toggle('on',b.dataset.lang2===P().lang));
    document.getElementById('lang2n').textContent=en()?'Your lists, products and prices stay the same. Only buttons and labels change.':'הרשימות, המוצרים והמחירים נשארים כמו שהם. משתנים רק הכפתורים והכיתובים.';
    ov.classList.add('open');const b=ov.querySelector('.lop.on');if(b)b.focus();};
  ov.addEventListener('click',e=>{const b=e.target.closest('[data-lang2]');if(b){setLang(b.dataset.lang2);return;}if(e.target===ov)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ov.classList.contains('open'))close();});
  /* מסך הכניסה: כפתור קטן בפינה, כתוב בשפה השנייה */
  const lg=document.getElementById('login');
  if(lg&&!document.getElementById('lang2lg')){const b=document.createElement('button');b.type='button';b.id='lang2lg';b.className='lang2pill';b.lang=en()?'he':'en';
    b.innerHTML=G+'<span>'+(en()?'עברית':'English')+'</span>';b.setAttribute('aria-label',en()?'Language: switch to Hebrew':'Language: English');b.onclick=()=>setLang(en()?'he':'en');lg.prepend(b);}
  /* במחשב: כפתור שפה בפס העליון, ליד ההגדרות */
  const hb=document.querySelector('.app>header .hbtns');
  if(hb&&!document.getElementById('lang2hd')){const b=document.createElement('button');b.type='button';b.id='lang2hd';b.className='lang2pill';
    b.innerHTML=G+'<span>'+(en()?'English':'עברית')+'</span>';b.setAttribute('aria-label',en()?'Language':'שפה');b.title=en()?'Language':'שפה';b.onclick=window.openLang;hb.prepend(b);}
  /* מחירים: משתמש מחוץ לישראל מקבל הסבר — המחירים מגיעים מרשתות בישראל */
  function abroad(){let tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(e){}
    let c='';try{c=String((typeof meData==='function'&&meData().city)||(typeof state!=='undefined'&&state.user&&state.user.city)||'').trim();}catch(e){}
    const ilCity=c&&typeof CITIES!=='undefined'&&CITIES[c]&&!CITIES[c][3];
    return !ilCity&&(!!P().diaspora||(!!tz&&!/Jerusalem|Tel_Aviv|Hebron|Gaza/.test(tz)));}
  const T2=(h,e)=>en()?e:h;
  function note(){if(typeof tab==='undefined'||tab!=='prices')return;const p=document.getElementById('panePrices');if(!p||p.querySelector('.abroad2')||!abroad())return;
    const d=document.createElement('div');d.className='abroad2';
    d.innerHTML='<div style="font-size:34px" aria-hidden="true">🇮🇱</div><b>'+T2('המחירים הם של חנויות בישראל','Prices are for stores in Israel')+'</b><p>'+T2('השוואת המחירים מבוססת על מחירים שהרשתות בישראל מפרסמות. הרשימות, התקציב והצ׳אט עובדים בכל מקום.','Price comparison uses data published by Israeli supermarket chains. Your lists, budget and chat work everywhere.')+'</p><button type="button" class="btn" data-ab2city>'+T2('לבחור עיר בישראל','Choose an Israeli city')+'</button>';
    const h=p.querySelector('.r2ph');if(h)h.after(d);else p.prepend(d);}
  document.addEventListener('click',e=>{if(e.target.closest('[data-ab2city]')&&typeof openMe==='function'){openMe('info');setTimeout(()=>{const c=document.getElementById('meCity');if(c){c.scrollIntoView({block:'center'});c.focus();}},350);}});
  if(typeof renderPrices==='function'){const _rp=renderPrices;renderPrices=function(){const r=_rp.apply(this,arguments);try{note();if(r&&typeof r.then==='function')r.then(()=>{try{note();}catch(e){}});}catch(e){}return r;};}
  if(typeof setTab==='function'){const _st=setTab;setTab=function(){const r=_st.apply(this,arguments);try{setTimeout(note,0);}catch(e){}return r;};}
})();
