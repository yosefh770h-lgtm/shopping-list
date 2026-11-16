
(function(){
  const pane=document.querySelector('#paneHome');if(!pane||typeof renderHome!=='function')return;
  const Q=s=>document.querySelector(s);
  /* קטגוריה שלא ברשימת הקטגוריות (למשל מוצר שנשמר עם קטגוריה ישנה) נכנסת ל"אחר" — כדי שאף מוצר לא ייעלם מהתצוגה */
  const catOf=n=>{const c=(myProd[n]&&myProd[n].category)||(P[n]&&P[n].c)||resolveCat(n);return CATS.includes(c)?c:'אחר';};
  const outList=()=>(state.missingHome||[]).filter(n=>!pantryHas(n));
  if(!state.h71lay){state.h71lay=1;state.homeLayout='list';}
  const IC_LIST='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  const IC_GRID='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>';
  const view=()=>{if(state.homeView!=='have'&&state.homeView!=='out'&&state.homeView!=='all')state.homeView=pantryCount()?'have':'all';return state.homeView;};
  const inList=n=>{try{return curList().items.some(x=>x.n===n&&!x.done);}catch(e){return false;}};
  const grid=its=>'<div class="hgrid">'+its.map(n=>pcardHtml(n,(state.customPantry||[]).includes(n))).join('')+'</div>';
  const grouped=its=>CATS.map(c=>{const g=its.filter(n=>catOf(n)===c);if(!g.length)return '';
    g.sort((a,b)=>(pantryHas(b)?1:0)-(pantryHas(a)?1:0)||(pImg(b)?1:0)-(pImg(a)?1:0));
    return '<div class="grp"><h3>'+CATE[c]+' '+esc(c)+' <small>('+g.length+')</small></h3>'+grid(g)+'</div>';}).join('');
  const outRow=n=>'<div class="h71row"><span class="em">'+esc(pEmoji(n))+'</span><span class="nm">'+esc(pName(n))+'</span>'+
    (inList(n)?'<span class="inl">✓ '+T('ברשימה','On the list')+'</span>':'<button class="pri" data-missing="'+esc(n)+'">🛒 '+T('לרשימה','To list')+'</button>')+
    '<button data-h71got="'+esc(n)+'">✓ '+T('יש שוב','Got it')+'</button><button class="h72rm" data-h72one="'+esc(n)+'" title="'+T('מחיקה מ"הבית שלי"','Delete from My home')+'" aria-label="'+esc(T('מחיקת '+pName(n)+' מ"הבית שלי"','Delete '+pName(n)))+'">✕</button></div>';
  /* "נגמר" בתצוגת קוביות — כמו ב"יש בבית": תמונה, שם מלא (נשבר רק בין מילים) והכפתורים מתחת */
  const outTile=n=>{const img=safeImg(pImg(n));return '<div class="h73t">'+
    '<button class="h73x" data-h72one="'+esc(n)+'" title="'+T('מחיקה מ"הבית שלי"','Delete from My home')+'" aria-label="'+esc(T('מחיקת '+pName(n)+' מ"הבית שלי"','Delete '+pName(n)))+'">✕</button>'+
    '<div class="h73i">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy">':'<span>'+esc(pEmoji(n))+'</span>')+'</div>'+
    '<b class="h73n">'+esc(pName(n))+'</b>'+
    (inList(n)?'<span class="inl">✓ '+T('ברשימה','On the list')+'</span>':'<button class="pri" data-missing="'+esc(n)+'">🛒 '+T('לרשימה','To list')+'</button>')+
    '<button data-h71got="'+esc(n)+'">✓ '+T('יש שוב','Got it')+'</button></div>';};
  /* מחיקה: בוחרים מוצרים (או "בחירת הכל") ומוחקים אותם מ"הבית שלי" */
  let pk72=null;
  const selItems=v=>v==='out'?outList():Object.keys(state.pantry||{});
  const selFoot=()=>{const n=pk72?pk72.size:0;return '🗑️ '+(n?T('מחיקת '+n+' מוצרים מ"הבית שלי"','Delete '+n+' from My home'):T('בחרו מוצרים למחיקה','Pick products to delete'));};
  const selHtml=v=>{const its=selItems(v);if(!its.length){pk72=null;return '';}
    its.sort((a,b)=>CATS.indexOf(catOf(a))-CATS.indexOf(catOf(b))||String(pName(a)).localeCompare(String(pName(b)),'he'));
    const all=its.every(n=>pk72.has(n));let last='';
    return '<div class="h72bar"><b>'+(v==='out'?T('מה למחוק מ"נגמר"?','What to delete from "Ran out"?'):T('מה למחוק מ"יש בבית"?','What to delete from "At home"?'))+'</b>'+
      '<button data-h72all="1">'+(all?T('ביטול הבחירה','Clear'):T('בחירת הכל','Select all')+' ('+its.length+')')+'</button><button data-h72x="1">'+T('סיום','Done')+'</button></div>'+
      '<div class="h72list">'+its.map(n=>{const c=catOf(n);const h=(c!==last?'<div class="h72c">'+(CATE[c]||'🛒')+' '+esc(c)+'</div>':'');last=c;
        return h+'<label class="h72r"><input type="checkbox" data-h72p="'+esc(n)+'"'+(pk72.has(n)?' checked':'')+'><span class="em">'+esc(pEmoji(n))+'</span><span class="nm">'+esc(pName(n))+'</span></label>';}).join('')+'</div>'+
      '<div class="h72go"><button data-h72del="1"'+(pk72.size?'':' disabled')+'>'+selFoot()+'</button></div>';};

  homeCatsHtml=function(q){
    const v=view();
    if(pk72&&!q&&(v==='have'||v==='out')){const h=selHtml(v);if(h)return h;}
    pk72=null;
    if(q){ /* חיפוש: תמיד בכל המוצרים, ואם אין התאמה מדויקת — מציעים להוסיף */
      const all=Object.keys(P).filter(n=>n.includes(q)||norm(pName(n)).includes(q));
      const raw=(state.homeQ||'').trim();const exact=NORMP[norm(raw)];
      return (!exact&&raw?'<button class="h71add" data-h71add="1"><span style="font-size:22px">➕</span><span>'+T('להוסיף את','Add')+' <b>"'+esc(raw)+'"</b> '+T('למה שיש בבית','to my home')+'</span></button>':'')+
        (grouped(all)||'');}
    if(v==='out'){const o=outList();
      if(!o.length)return '<div class="h71empty">🙂 '+T('שום דבר לא נגמר.','Nothing ran out.')+'<br>'+T('כשמוצר נגמר (לוחצים − עד שמגיעים ל-0) הוא יופיע כאן, ומכאן מעבירים אותו לרשימה בלחיצה.','When something runs out it shows up here.')+'</div>';
      const need=o.filter(n=>!inList(n));
      return (state.homeLayout==='list'?'<div class="h71out">'+o.map(outRow).join('')+'</div>':'<div class="h73grid">'+o.map(outTile).join('')+'</div>')+(need.length>1?'<button class="h71all" data-h71allout="1">🛒 '+T('להעביר את כל ה-'+need.length+' לרשימה','Add all '+need.length+' to the list')+'</button>':'');}
    /* כל מה שסומן בבית — גם מוצרים שלא בקטלוג (למשל שנכנסו מסיום קנייה, מקבלה או ממכשיר אחר), בדיוק כמו ב"בחירה ומחיקה" */
    if(v==='have'){const h=Object.keys(state.pantry||{}).filter(pantryHas);
      if(h.length&&h.length<=12){h.sort((x,y)=>CATS.indexOf(catOf(x))-CATS.indexOf(catOf(y)));return grid(h);}
      return grouped(h)||'<div class="h71empty">'+T('עוד לא סימנתם מה יש בבית.','Nothing marked yet.')+'<br><button data-h71v="all">'+T('לסמן מה יש ←','Mark what I have ←')+'</button></div>';}
    /* כל המוצרים — סרגל קטגוריות */
    const all=Object.keys(P);const counts={};all.forEach(n=>{const c=catOf(n);counts[c]=(counts[c]||0)+1;});
    const sel=CATS.includes(state.homeCat)?state.homeCat:'';
    const bar='<div class="catbar" role="tablist" aria-label="'+T('קטגוריות','Categories')+'"><button class="cb'+(!sel?' on':'')+'" data-hcat="" role="tab" aria-selected="'+(!sel)+'">🧺 '+T('הכל','All')+'</button>'+
      CATS.filter(c=>counts[c]).map(c=>'<button class="cb'+(sel===c?' on':'')+'" data-hcat="'+esc(c)+'" role="tab" aria-selected="'+(sel===c)+'">'+CATE[c]+' '+esc(c)+'</button>').join('')+'</div>';
    return bar+grouped(sel?all.filter(n=>catOf(n)===sel):all);
  };

  renderHome=function(){
    const p=Q('#paneHome');if(!p)return;const v=view();const nOut=outList().length;
    let h='<div class="h71top"><input id="homeSearch" type="search" placeholder="🔍 '+T('חיפוש או הוספת מוצר...','Search or add a product...')+'" value="'+esc(state.homeQ||'')+'" aria-label="'+T('חיפוש או הוספת מוצר','Search or add a product')+'"><div class="h71lay2" role="group" aria-label="'+T('תצוגה','View')+'"><button data-h71lay="list" class="'+(state.homeLayout==='list'?'on':'')+'" aria-pressed="'+(state.homeLayout==='list')+'" aria-label="'+T('שורות','Rows')+'" title="'+T('שורות','Rows')+'">'+IC_LIST+'</button><button data-h71lay="grid" class="'+(state.homeLayout!=='list'?'on':'')+'" aria-pressed="'+(state.homeLayout!=='list')+'" aria-label="'+T('כרטיסים','Cards')+'" title="'+T('כרטיסים','Cards')+'">'+IC_GRID+'</button></div><button class="h71more" data-h71more="1" aria-label="'+T('עוד אפשרויות','More options')+'" title="'+T('עוד אפשרויות','More options')+'">⋯</button></div>'+
      '<div class="h71seg" role="tablist"><button role="tab" data-h71v="have" class="'+(v==='have'?'on':'')+'" aria-selected="'+(v==='have')+'">🏠 '+T('יש בבית','At home')+'<small>'+pantryCount()+'</small></button>'+
      '<button role="tab" data-h71v="out" class="'+(v==='out'?'on':'')+'" aria-selected="'+(v==='out')+'">❗ '+T('נגמר','Ran out')+(nOut?'<small>'+nOut+'</small>':'')+'</button>'+
      '<button role="tab" data-h71v="all" class="'+(v==='all'?'on':'')+'" aria-selected="'+(v==='all')+'">🧺 '+T('כל המוצרים','All')+'</button></div>';
    if(!pk72&&!state.homeQ&&(v==='have'||v==='out')&&selItems(v).length)h+='<div class="h72tools"><button data-h72sel="1">🗑️ '+T('בחירה ומחיקה','Select & delete')+'</button></div>';
    if(pantryCount()<3&&!state.homeQ&&!pk72)h+='<div class="h71hint">👆 '+T('לוחצים על מוצר שיש בבית — הוא נצבע ועובר ל"יש בבית". כשהוא נגמר לוחצים − , והוא עובר ל"נגמר" ומשם לרשימה.','Tap a product you have at home. When it runs out, tap − and it moves to "Ran out".')+'</div>';
    h+='<div id="homeCats">'+homeCatsHtml(norm(state.homeQ||''))+'</div>';
    p.innerHTML=h;p.classList.toggle('hl-list',state.homeLayout==='list');
    try{doodleBg(p);}catch(e){}try{applyPermsUi15();}catch(e){}
  };

  function moreSheet(){
    const miss=BASE.filter(n=>!pantryHas(n)&&!inList(n));
    const b=openSheet('⋯ '+T('עוד אפשרויות','More options'),'<div class="h71menu">'+
      '<button data-m71="scan">📷<div>'+T('סריקת ברקוד','Scan a barcode')+'<span>'+T('מוסיף את המוצר למה שיש בבית','Adds it to your home')+'</span></div></button>'+
      '<button data-m71="up">📤<div>'+T('העלאת מוצרים או תמונות','Upload products or photos')+'<span>'+T('הרבה מוצרים בבת אחת — מתמונות או מקובץ אקסל','Many at once')+'</span></div></button>'+
      '<button data-m71="inv">📦<div>'+T('טבלת המלאי המלאה','Full stock table')+'<span>'+T('כמויות, חברה, תאריך עדכון ותוקף','Quantities, brand, dates')+'</span></div></button>'+
      ((pantryCount()||outList().length)?'<button data-m71="del">🗑️<div>'+T('מחיקת מוצרים מהבית','Delete products from home')+'<span>'+T('אחד, כמה או הכל — למשל רשימה שנכנסה בטעות','One, several or all')+'</span></div></button>':'')+
      (miss.length?'<button data-m71="base">🧺<div>'+T('מצרכי בסיס שאין בבית','Missing basics')+' ('+miss.length+')<span>'+T('להעביר לרשימה בלחיצה אחת','Add to the list in one tap')+'</span></div></button>':'')+
      '</div>');
    b.onclick=e=>{const x=e.target.closest('[data-m71]');if(!x)return;const a=x.dataset.m71;
      if(a==='grid'||a==='list'){state.homeLayout=a;save(true);renderHome();closeSheet();return;}
      if(a==='up'){openProductUpload();return;}
      if(a==='del'){closeSheet();state.homeQ='';if(state.homeView!=='out'||!outList().length)state.homeView=pantryCount()?'have':'out';pk72=new Set();renderHome();try{Q('#paneHome').scrollTop=0;}catch(er){}return;}
      if(a==='inv'){openInventory();return;}
      if(a==='scan'){openInventory();setTimeout(()=>{const s=Q('#invScan');if(s)s.click();},200);return;}
      if(a==='base'){closeSheet();addMany(miss.map(n=>({n,q:''})));save();render();flash('🛒 '+T('נוספו '+miss.length+' מצרכים לרשימה','Added '+miss.length));}};
  }

  pane.addEventListener('click',e=>{
    const t=e.target.closest('[data-h71v],[data-h71lay],[data-h71more],[data-h71add],[data-h71got],[data-h71allout],[data-h72sel],[data-h72x],[data-h72all],[data-h72del],[data-h72one]');if(!t)return;
    e.preventDefault();e.stopImmediatePropagation();const d=t.dataset;
    if(d.h72x){pk72=null;renderHome();return;}
    if(d.h72all){const its=selItems(view());if(its.every(n=>pk72.has(n)))pk72.clear();else its.forEach(n=>pk72.add(n));renderHome();return;}
    if(d.h71v){if(pk72)pk72=new Set();state.homeView=d.h71v;if(d.h71v==='all')state.homeCat='';state.homeQ='';save(true);renderHome();return;}
    if(d.h71more){moreSheet();return;}
    if(d.h71lay){state.homeLayout=d.h71lay;save(true);renderHome();return;}
    if(typeof can15==='function'&&!can15('home_edit')){flash(T('⛔ אין לך הרשאה לעדכן את הבית','⛔ No permission'));return;}
    if(d.h71add){const raw=(state.homeQ||'').trim();if(!raw||hasProfanity(raw))return;
      addCustomPantryItem(raw,resolveCat(raw));const k=NORMP[norm(raw)]||raw;stockSet(k,1);state.homeQ='';state.homeView='have';save();renderHome();return;}
    if(d.h72sel){pk72=new Set();renderHome();return;}
    if(d.h72one){const n=d.h72one;homeDelete([n]);save();renderHome();flash('🗑️ '+T('נמחק מ"הבית שלי": ','Deleted: ')+pName(n));return;}
    if(d.h72del){if(!pk72||!pk72.size)return;const ks=[...pk72];
      (async()=>{if(!(await uiConfirm(T('למחוק '+ks.length+' מוצרים מ"הבית שלי"?\nהם לא יופיעו יותר ב"יש בבית" וב"נגמר". מוצרים שהוספת בעצמך יימחקו לגמרי.','Delete '+ks.length+' products from My home?'))))return;
        homeDelete(ks);pk72=null;save();renderHome();flash('🗑️ '+T('נמחקו '+ks.length+' מוצרים מ"הבית שלי"','Deleted '+ks.length));})();return;}
    if(d.h71got){stockSet(d.h71got,1);save();renderHome();flash('🏠 '+T('נרשם שיש: ','Marked: ')+pName(d.h71got));return;}
    if(d.h71allout){const need=outList().filter(n=>!inList(n));addMany(need.map(n=>({n,q:''})));save();render();renderHome();flash('🛒 '+T('נוספו '+need.length+' מוצרים לרשימה','Added '+need.length));}
  },true);
  pane.addEventListener('change',e=>{const c=e.target.closest('[data-h72p]');if(!c||!pk72)return;
    if(c.checked)pk72.add(c.dataset.h72p);else pk72.delete(c.dataset.h72p);
    const b=Q('#paneHome [data-h72del]');if(b){b.disabled=!pk72.size;b.textContent=selFoot();}
    const a=Q('#paneHome [data-h72all]');if(a){const its=selItems(view());a.textContent=its.every(n=>pk72.has(n))?T('ביטול הבחירה','Clear'):T('בחירת הכל','Select all')+' ('+its.length+')';}});
  /* Enter בחיפוש, כשאין התאמה מדויקת = הוספה */
  pane.addEventListener('keydown',e=>{if(e.target.id!=='homeSearch'||e.key!=='Enter')return;const b=Q('#paneHome [data-h71add]');if(b){e.preventDefault();b.click();}});
  try{if(document.querySelector('#paneHome.on'))renderHome();}catch(e){}
})();
