
/* עיצוב 2.0 — המבנה של ההדמיה (טלפון / מחשב). לא משנה פעולות: רק מזיז את אותם כפתורים ומוסיף כותרת וכרטיסים */
(function(){
  if(!document.body.classList.contains('r2'))return;
  const $=s=>document.querySelector(s),root=document.documentElement,app=$('.app'),tabs=$('.tabs'),hrow=$('.app>header .hrow'),hb=$('.app>header .hbtns');
  const tt=(he,en)=>typeof T==='function'?T(he,en):he;
  /* תוויות הלשוניות: קצרות בתחתית, מלאות בתפריט העליון */
  const LBL={list:['רשימה','הרשימה','List','List'],prices:['מחירים','מחירים וחנויות','Prices','Prices & stores'],home:['הבית שלי','הבית שלי','My home','My home'],hist:['היסטוריה','היסטוריה','History','History']};
  const TIC={list:'list-todo',prices:'wallet',home:'house',hist:'clock'};
  function labels(d){tabs.querySelectorAll('.tab').forEach(b=>{const l=LBL[b.dataset.t];if(!l)return;const host=b.querySelector('.tlbl')||b;
    let s=host.querySelector('.r2tl');if(!s){[...host.childNodes].forEach(n=>{if(n.nodeType===3&&n.textContent.trim())n.remove();});s=document.createElement('span');s.className='r2tl';host.appendChild(s);}
    /* האייקון: אם התווית נכתבה מחדש (שפה/מגדר) ונמחקה לפני שהאימוג'י הפך לאייקון — מחזירים אותו כאן, כדי שלא יישאר רק טקסט */
    if(!host.querySelector('svg')&&typeof ICONS2!=='undefined'&&ICONS2[TIC[b.dataset.t]])s.insertAdjacentHTML('beforebegin','<svg viewBox="0 0 24 24" class="ic2" aria-hidden="true" data-n="'+TIC[b.dataset.t]+'">'+ICONS2[TIC[b.dataset.t]]+'</svg>');
    s.textContent=tt(d?l[1]:l[0],d?l[3]:l[2]);});}
  /* עיגול האזור האישי (במחשב) */
  if(hb&&!$('#r2av')){hb.insertAdjacentHTML('beforeend','<button type="button" id="r2av" title="'+tt('האזור האישי שלי','My account')+'" aria-label="'+tt('האזור האישי שלי','My account')+'"></button>');
    $('#r2av').onclick=()=>{const m=$('#miMe');if(m)m.click();};}
  function av(){const a=$('#r2av');if(!a)return;const n=(typeof state!=='undefined'&&state.user&&state.user.name)||'';a.textContent=(n.trim()[0]||'·');}
  /* כותרת הרשימה + שדה ההוספה מעל הרשימה */
  if(!$('#r2lh')){$('#paneList').insertAdjacentHTML('beforebegin','<div id="r2lh"><div class="r2t"><div><h2 id="r2ln"></h2><div class="r2s" id="r2ls"></div></div><span class="r2badge" id="r2lb" hidden></span><div class="r2acts"><button type="button" id="r2share">'+tt('שיתוף','Share')+'</button><button type="button" class="pri" id="r2shop">'+tt('מצב קנייה','Shopping mode')+'</button></div></div></div>');
    $('#r2share').onclick=()=>{const b=$('#btnShare');if(b)b.click();};
    /* חלון השיתוף נסגר בלחיצה מחוץ לו או ב-Esc */
    const shClose=()=>{const r=$('#shareRow');if(r)r.classList.remove('open');};
    document.addEventListener('pointerdown',ev=>{const r=$('#shareRow');if(!r||!r.classList.contains('open')||r.contains(ev.target))return;if(ev.target.closest('#r2share,#btnShare,[data-forward="btnShare"]'))return;shClose();},true);
    document.addEventListener('keydown',ev=>{if(ev.key==='Escape')shClose();});$('#r2shop').onclick=()=>{if(typeof openShop26==='function')openShop26();};}
  const ir=$('#inputRow');if(ir){ir.classList.add('r2in');$('#r2lh').after(ir);const t=$('#inText');if(t)t.placeholder=tt('מה להוסיף?','What to add?');}
  /* עמודת הרשימות (מחשב) */
  if(!$('#r2side')){app.insertAdjacentHTML('beforeend','<aside id="r2side" aria-label="'+tt('הרשימות שלי','My lists')+'"></aside>');}
  /* הרשימות שלי: הרשימה הנוכחית מקופלת (רק השם) ונפתחת בלחיצה; מתחתיה "היסטוריית הרשימות" לפי תאריך, כל אחת נפתחת בלחיצה */
  let r2cur=false;const r2ho=new Set();
  const r2it=i=>'<li class="'+(i.done?'dn':'')+'"><span>'+esc(i.e||'')+' '+esc(i.n||'')+'</span>'+(i.q&&String(i.q)!=='1'?'<small>×'+esc(i.q)+'</small>':'')+'</li>';
  const r2d=ts=>{try{return new Intl.DateTimeFormat(typeof prefs!=='undefined'&&prefs.lang==='en'?'en-US':'he-IL',{day:'numeric',month:'numeric',year:'numeric'}).format(new Date(ts));}catch(e){return '';}};
  function side(){const s=$('#r2side');if(!s||typeof state==='undefined')return;const L=state.lists||[];
    const c=L.find(l=>l.id===state.active)||L[0];const its=(c&&c.items)||[];
    const cur=c?'<div class="r2acc'+(r2cur?' op':'')+'"><button type="button" class="r2l on r2ah" data-r2cur="1" aria-expanded="'+r2cur+'"><b>'+esc(c.name)+'</b><small>'+its.length+' '+tt('מוצרים','items')+' <i class="r2ch">▾</i></small></button>'+
      (r2cur?'<ul class="r2its">'+(its.length?its.map(r2it).join(''):'<li class="r2mt">'+tt('הרשימה ריקה','The list is empty')+'</li>')+'</ul>':'')+'</div>':'';
    const oth=L.filter(l=>l!==c).map(l=>'<button type="button" class="r2l" data-r2l="'+esc(l.id)+'"><b>'+esc(l.name)+'</b><small>'+(l.items||[]).length+' '+tt('מוצרים','items')+'</small></button>').join('');
    const H=(state.history||[]).map((h,i)=>({h,i})).filter(x=>x.h&&x.h.ts).sort((a,b)=>b.h.ts-a.h.ts).slice(0,12);
    const hist=H.length?'<h4 class="r2hh">'+tt('היסטוריית הרשימות','List history')+'</h4><div class="r2hl">'+H.map(({h,i})=>{const o=r2ho.has(h.ts),hi=(h.listItems&&h.listItems.length?h.listItems:h.items)||[];
      return '<div class="r2acc'+(o?' op':'')+'"><button type="button" class="r2l r2ah" data-r2hx="'+h.ts+'" aria-expanded="'+o+'"><b>'+esc(h.listName||tt('קנייה','Shopping'))+'<em>'+esc(r2d(h.ts))+(h.store?' · '+esc(h.store):'')+'</em></b><small>'+hi.length+' '+tt('מוצרים','items')+' <i class="r2ch">▾</i></small></button>'+
        (o?'<ul class="r2its">'+hi.map(r2it).join('')+'</ul><div class="r2hb"><button type="button" data-r2hdup="'+i+'">📑 '+tt('לרשימה חדשה','To a new list')+'</button><button type="button" data-r2hadd="'+i+'">➕ '+tt('להוסיף לנוכחית','Add to current')+'</button></div>':'')+'</div>';}).join('')+'</div>'+
      ((state.history||[]).length>H.length?'<button type="button" class="r2hall" data-r2hall="1">'+tt('לכל ההיסטוריה','All history')+' ←</button>':''):'';
    s.innerHTML='<div class="r2box"><h3>'+tt('הרשימות שלי','My lists')+'</h3>'+cur+oth+
      '<button type="button" class="r2new" data-r2new="1">+ '+tt('רשימה חדשה','New list')+'</button>'+hist+'</div>';}
  document.addEventListener('click',e=>{const l=e.target.closest('[data-r2l]');if(l){r2cur=false;const c=document.querySelector('#chips .chip[data-id="'+CSS.escape(l.dataset.r2l)+'"]');if(c)c.click();return;}
    if(e.target.closest('[data-r2cur]')){r2cur=!r2cur;side();return;}
    const hx=e.target.closest('[data-r2hx]');if(hx){const k=+hx.dataset.r2hx;r2ho.has(k)?r2ho.delete(k):r2ho.add(k);side();return;}
    const hb=e.target.closest('[data-r2hdup],[data-r2hadd]');if(hb){const h=state.history[+(hb.dataset.r2hdup||hb.dataset.r2hadd)];if(!h)return;const hi=(h.listItems&&h.listItems.length?h.listItems:h.items)||[];
      if(hb.dataset.r2hdup){dupList(h.listName,hi);setTab('list');return;}
      const n=addMany(hi);flash(n?'➕ '+tt('הוספתי '+n+' מוצרים לרשימה "'+curList().name+'"','Added '+n+' items'):tt('הכל כבר ברשימה ✔','Everything is already on the list ✔'));return;}
    if(e.target.closest('[data-r2hall]')){setTab('hist');return;}
    if(e.target.closest('[data-r2new]')){const c=document.querySelector('#chips [data-new]');if(c)c.click();return;}
    if(e.target.closest('[data-r2cheap]')){try{storesView='cmp';if(typeof cmpFirst!=='undefined')cmpFirst=false;}catch(_){}setTab('stores');}});
  function head(){if(typeof state==='undefined'||typeof curList!=='function')return;const l=curList();const n=(l.items||[]).length,d=(l.items||[]).filter(i=>i.done).length;
    $('#r2ln').textContent=l.name||'';$('#r2ls').textContent=n+' '+tt('מוצרים','items')+(d?' • '+d+' '+tt('בעגלה','in the cart'):'');
    const sh=l.members&&l.members.length?l.members.length:0;const b=$('#r2lb');b.hidden=!sh;if(sh)b.textContent=tt('משותפת עם '+sh,'Shared with '+sh);}
  function card(){const p=$('#paneList');const rows=[...p.children].filter(x=>x.classList.contains('row'));if(!rows.length)return;
    const c=document.createElement('div');c.className='r2card';rows[0].before(c);rows.forEach(r=>c.appendChild(r));
    /* כמות עם יחידה ("1 ק\"ג") מוצגת כמו בהדמיה, בלי × */
    c.querySelectorAll('.qv,.q').forEach(q=>{const m=q.textContent.match(/^×(\d+(?:\.\d+)?\s*\D.*)$/);if(m){q.textContent=m[1];q.style.direction='rtl';}});}
  const _rl=renderList;renderList=function(){const r=_rl.apply(this,arguments);try{card();head();side();av();}catch(e){console.warn('r2',e);}return r;};
  /* יאמי כעמודה קבועה במחשב */
  let yamiOn=false;function yami(){if(root.classList.contains('r2d')&&document.body.dataset.tab==='list'&&!yamiOn&&!(typeof uiCfg!=='undefined'&&uiCfg.botHidden)){yamiOn=true;try{if(!(typeof isGuest27==='function'&&isGuest27())){openBot();const bs=document.querySelector('#botSheet');bs.classList.remove('open');bs.classList.add('r2dock');[60,400,1200].forEach(t=>setTimeout(()=>{const a=document.activeElement;if(a&&a.id==='botText')a.blur();},t));}}catch(e){}}}
  function mode(){const d=innerWidth>=1000&&!root.classList.contains('inapp');root.classList.toggle('r2d',d);root.classList.toggle('r2m',!d);
    if(d){tabs.classList.remove('bot52');if(tabs.parentElement!==hrow)hb.before(tabs);}
    else{tabs.classList.add('bot52');if(tabs.parentElement!==app)app.appendChild(tabs);}
    const h=getComputedStyle(tabs).display==='none'?0:tabs.offsetHeight;root.style.setProperty('--bb52',(d?0:h)+'px');labels(d);yami();}
  mode();addEventListener('resize',mode);
  const _st=setTab;setTab=function(){const r=_st.apply(this,arguments);try{dock();yami();if(tab==='list'){head();side();}}catch(e){}return r;};
  /* במחשב יאמי מוצגת כעמודה (מחלקה r2dock, לא open — כדי שלא תיחשב חלון פתוח) רק בלשונית הרשימה */
  function dock(){}
  try{renderList();}catch(e){}
})();
