
(function(){
  if(!document.body.classList.contains('r2'))return;
  const $=s=>document.querySelector(s),tt=(he,en)=>typeof T==='function'?T(he,en):he,m=$('#hMenu');if(!m)return;
  const inapp=document.documentElement.classList.contains('inapp')||/YamShoppingApp\//.test(navigator.userAgent||'');
  const nat=()=>{try{return window.YamApp&&typeof YamApp.appInfo==='function'?JSON.parse(YamApp.appInfo()||'{}'):null;}catch(e){return null;}};
  const P=()=>typeof prefs!=='undefined'?prefs:{};const sv=()=>{try{savePrefs();}catch(e){}};
  const click=id=>{const b=document.getElementById(id);if(b)b.click();};
  let mailOn=null;
  /* חץ חזרה כמו בהדמיה */
  const back=m.querySelector('.r2sh [data-r2close]');if(back)back.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  /* ההגדרות של ההדמיה מיד אחרי צבע הלוגו; הכפתורים הנוספים (התקנה, עסק) נשארים במקומם תחת "עוד" */
  const tc=m.querySelector('.r2tc');
  (tc||m.querySelector('.r2pc')).insertAdjacentHTML('afterend','<div class="r2st" id="r2s1"></div><div class="r2st" id="r2s2"></div><div class="r2st" id="r2s3"></div><div class="r2more">'+tt('עוד','More')+'</div>');
  /* "מצב כהה" שהועבר לתפריט — כבר מופיע למעלה */
  m.querySelectorAll('.mgbody>button').forEach(b=>{if(/^\s*(מצב כהה|Dark mode)/.test(b.textContent))b.classList.add('r2dup');});
  /* הקבוצות תחת "עוד" סגורות — מסך הגדרות נקי כמו בהדמיה */
  m.querySelectorAll('details.mgrp').forEach(d=>{d.open=false;});
  const sw=(k,label,on)=>'<button type="button" class="r2row" role="switch" data-r2s="'+k+'" aria-checked="'+(!!on)+'"><span>'+esc(label)+'</span><span class="r2sw2" aria-hidden="true"></span></button>';
  const row=(k,label,val,cls)=>'<button type="button" class="r2row'+(cls?' '+cls:'')+'" data-r2s="'+k+'"><span>'+esc(label)+'</span>'+(val?'<span class="r2v">'+esc(val)+'</span>':'')+'</button>';
  const SIZE={auto:['אוטומטי','Automatic'],normal:['רגיל','Normal'],small:['קטן','Small'],xsmall:['קטן מאוד','Extra small']};
  function draw(){const p=P(),sz=SIZE[p.view66||'auto']||SIZE.auto,dark=document.body.classList.contains('dark');
    const canKeep=inapp||('wakeLock' in navigator);
    let city='';try{city=String(meData().city||(state.user&&state.user.city)||'').trim();}catch(e){}
    $('#r2s1').innerHTML='<h4>'+tt('תצוגה','Display')+'</h4>'+sw('dark',tt('מצב כהה','Dark mode'),dark)+row('size',tt('גודל כתב','Text size'),tt(sz[0],sz[1]))+row('lang','🌐 '+tt('שפה · Language','Language · שפה'),p.lang==='en'?'English':'עברית','r2lang')+(canKeep?sw('awake',tt('מסך לא נכבה בקנייה','Keep screen on while shopping'),!p.noAwake20):'');
    const notifOn=!!p.notify,drop=!(p.nOff&&p.nOff.drop),signed=typeof authUser!=='undefined'&&!!authUser;
    $('#r2s2').innerHTML='<h4>'+tt('התראות','Notifications')+'</h4>'+(inapp?sw('notify',tt('התראות ברקע','Background notifications'),notifOn):(signed?sw('mail',tt('התראות במייל','Email updates'),!!mailOn):sw('notify',tt('התראות בדפדפן','Browser notifications'),notifOn)))+sw('drop',tt('ירידות מחיר','Price drops'),drop);
    const n=nat();
    /* 🎯 דיוק מוצרים: דלוק — אחרי הוספת מוצר מציעים לבחור את המוצר המדויק; כבוי — המוצר נוסף בדיוק כמו שנכתב */
    const pkSw=typeof srvShown==='function'&&srvShown()?sw('pick',tt('דיוק מוצרים','Exact products'),!(typeof state!=='undefined'&&state.pick53off))+'<p class="r2hint">'+tt('דלוק: אחרי שמוסיפים מוצר מוצגת בחירה של המוצר המדויק. כבוי: המוצר נוסף בדיוק כמו שכתבתם.','On: after adding an item you pick the exact product. Off: the item is added exactly as typed.')+'</p>':'';
    $('#r2s3').innerHTML=pkSw+row('city',tt('העיר שלי','My city'),city?(typeof cityName==='function'?cityName(city):city):tt('לבחירה','Choose'))+(inapp?row('about',tt('על האפליקציה','About the app'),n&&n.ver?tt('גרסה ','Version ')+n.ver:''):'')+
      (signed||(typeof state!=='undefined'&&state.user&&!state.user.offline)?row('out',tt('יציאה מהחשבון','Sign out'),'','out'):'');}
  async function loadMail(){if(inapp||typeof sb==='undefined'||!sb||typeof authUser==='undefined'||!authUser)return;try{const {data,error}=await sb.rpc('email_weekly_get');if(!error){mailOn=!!data;draw();}}catch(e){}}
  m.addEventListener('click',async e=>{
    const pc=e.target.closest('.r2pc');if(pc){e.stopPropagation();if(e.target.closest('.r2pro'))click('miPro2');else click('miMe');return;}
    const r=e.target.closest('[data-r2s]');if(!r)return;e.stopPropagation();const k=r.dataset.r2s,p=P();
    if(k==='dark'){const d=document.getElementById('btnDark');if(d&&typeof d.onclick==='function')d.onclick();setTimeout(draw,30);}
    else if(k==='size'){click('miView66');}
    else if(k==='awake'){p.noAwake20=!p.noAwake20;sv();draw();}
    else if(k==='pick'){state.pick53off=!state.pick53off;try{save();}catch(x){}draw();flash(state.pick53off?'✍️ '+tt('דיוק מוצרים כבוי: מוצרים נוספים כמו שכותבים אותם','Exact products off: items are added as typed'):'🎯 '+tt('דיוק מוצרים דלוק: אחרי הוספת מוצר תוצג בחירה של המוצר המדויק','Exact products on: you\'ll pick the exact product after adding'));}
    else if(k==='drop'){p.nOff=p.nOff||{};p.nOff.drop=!p.nOff.drop;sv();draw();}
    else if(k==='notify'){if(p.notify){p.notify=false;sv();try{updateBell(false);}catch(x){}draw();}
      else{let ok=!('Notification' in window);if(!ok){let q=Notification.permission;if(q==='default'){try{q=await Notification.requestPermission();}catch(x){}}ok=q==='granted';}
        if(ok){p.notify=true;sv();flash('🔔 '+tt('ההתראות הופעלו','Notifications on'));}else flash('⚠️ '+tt('ההתראות חסומות בהגדרות הטלפון או הדפדפן','Notifications are blocked'));try{updateBell(false);}catch(x){}draw();}}
    else if(k==='mail'){const want=!mailOn;try{const {error}=await sb.rpc('email_weekly_set',{p_on:want});if(error)throw error;mailOn=want;flash(want?'📧 '+tt('המייל השבועי הופעל','Weekly email on'):'✔️ '+tt('המייל השבועי כובה','Weekly email off'));}catch(x){flash('⚠️ '+(x.message||x));}draw();}
    else if(k==='city'){if(typeof openMe==='function'){openMe('info');setTimeout(()=>{const c=$('#meCity');if(c){c.scrollIntoView({block:'center'});c.focus();}},350);}}
    else if(k==='about'){click('miAbout');}
    else if(k==='lang'){if(typeof openLang==='function')openLang();}
    else if(k==='out'){click('miLogout');}
  },true);
  /* הפרופיל: לחיצה פותחת את האזור האישי, ו-PRO פותח את מסך הפרו (גם למי שעוד לא פרו) */
  function prof(){const pc=m.querySelector('.r2pc');if(!pc)return;const pro=window.pro2&&pro2.isPro&&pro2.isPro();
    const t=pc.querySelector('.pro2tag');if(t&&!t.closest('.r2pro')){const b=document.createElement('button');b.type='button';b.className='r2pro';t.replaceWith(b);b.appendChild(t);}
    if(!pc.querySelector('.r2pro'))pc.insertAdjacentHTML('beforeend','<button type="button" class="r2pro off" aria-label="Yam shopping PRO"><span class="pro2tag">PRO</span></button>');
    const b=pc.querySelector('.r2pro');if(b)b.classList.toggle('off',!pro);
    const tl=m.querySelector('.r2tc .r2tl');if(tl&&!pro){const tg=tl.querySelector('.pro2tag');if(tg)tg.textContent='PRO';}}
  new MutationObserver(()=>{if(m.classList.contains('open')){setTimeout(()=>{prof();draw();},0);loadMail();}}).observe(m,{attributes:true,attributeFilter:['class']});
  try{draw();}catch(e){}
})();
