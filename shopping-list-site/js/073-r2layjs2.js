
(function(){
  if(!document.body.classList.contains('r2'))return;
  const $=s=>document.querySelector(s),tt=(he,en)=>typeof T==='function'?T(he,en):he;
  const money=v=>'₪ '+Math.round(v).toLocaleString('he-IL');
  const ph=(t,s)=>'<div class="r2ph"><h2>'+esc(t)+'</h2>'+(s?'<div>'+esc(s)+'</div>':'')+'</div>';
  /* ---------- היסטוריה ---------- */
  function hist(){const p=$('#paneHist');if(!p||typeof state==='undefined'||!state.history.length||p.querySelector('.r2hc'))return;
    const amt=h=>{try{if(window.bdApi)return bdApi.tripAmt(h);const pd=state.budget&&state.budget.paid&&state.budget.paid[String(h.ts)];if(pd&&pd.z)return 0;if(pd&&pd.a>0)return pd.a;}catch(e){}const t=Number(h.total);return t>0?t:0;};
    /* מה קנו באותה קנייה — נפתח בלחיצה על השורה, כמו "היסטוריית הרשימות" במחשב */
    const its=h=>{const L=(h.listItems&&h.listItems.length?h.listItems:h.items)||[];return L.length?'<ul class="r2hits">'+L.map(x=>'<li><span>'+esc((x.e?x.e+' ':'')+(x.n||''))+'</span>'+(x.q&&String(x.q)!=='1'?'<small>×'+esc(x.q)+'</small>':'')+'</li>').join('')+'</ul>':'';};
    const rows=state.history.map((h,i)=>{const d=new Date(h.ts),a=amt(h);
      return '<div class="r2hw"><button type="button" class="r2hr" data-r2h="'+i+'"><span class="r2hn"><b>'+esc(h.listName||tt('קנייה','Shopping'))+'</b><small>'+[h.store,fmtDate(d)].filter(Boolean).map(esc).join(' • ')+' · '+(h.items||[]).length+' '+tt('מוצרים','items')+' <i class="r2ch">▾</i></small></span>'+(a?'<span class="r2ha">'+money(a)+'</span>':'')+'</button>'+
        '<div class="r2hx">'+its(h)+'<button class="chip" data-hview="'+i+'">👁️ '+tt('הצגת הרשימה','View the list')+'</button><button class="chip" data-hdup="'+i+'">📑 '+tt('שכפול לרשימה חדשה','Copy to a new list')+'</button><button class="chip" data-hadd="'+i+'">➕ '+tt('להוסיף לרשימה הנוכחית','Add to current list')+'</button></div></div>';}).join('');
    p.insertAdjacentHTML('afterbegin',ph(tt('היסטוריה','History'),tt('הקניות האחרונות שלך','Your recent shopping'))+'<div class="r2hc">'+rows+'</div><button type="button" class="r2hbig" data-hdup="0">'+tt('שחזור רשימה מקנייה קודמת','Restore a list from a previous trip')+'</button>');}
  document.addEventListener('click',e=>{const r=e.target.closest('[data-r2h]');if(r){r.parentElement.classList.toggle('open');}});
  if(typeof renderHist==='function'){const _rh=renderHist;renderHist=function(){const r=_rh.apply(this,arguments);try{hist();}catch(e){console.warn('r2h',e);}return r;};}
  /* ---------- הבית שלי ---------- */
  const go=id=>()=>{const b=document.getElementById(id);if(b)b.click();};
  /* האריחים של ההדמיה (בלי מתכונים) — בלי כפילויות: היסטוריה/קבלה/זמני היום נמצאים בלשוניות ובהגדרות; "קטגוריות" פותח את המלאי בבית לפי מחלקה */
  const nextOrder=()=>{try{const o=(meData().orders||[])[0];if(o)return [o.store,tt('עד יום ','by ')+DAYS[o.day]+"'"].filter(Boolean).join(' ');}catch(e){}return tt('מתי מזמינים','When you order');};
  const TILES=[['🧾',tt('הקניות שלי','My shopping'),()=>tt(monthTrips()+' קניות החודש',monthTrips()+' trips this month'),()=>setTab('hist')],
    ['⭐',tt('המלצות','Suggestions'),()=>tt('מה כנראה נגמר','Probably running out'),go('miRecurring')],
    ['🏬',tt('חנויות','Stores'),()=>tt('החנויות הקבועות','Your stores'),()=>{try{storesView='dir';}catch(e){}setTab('stores');}],
    ['⏰',tt('זמני הזמנה','Order times'),nextOrder,()=>{if(typeof openMe==='function')openMe('orders');}],
    ['🗂️',tt('קטגוריות','Categories'),()=>tt('מה יש בבית, לפי מחלקה','Your pantry by aisle'),()=>{$('#paneHome').classList.add('r2inv');$('#paneHome').scrollTop=0;}]];
  function monthTrips(){const m=new Date();return (state.history||[]).filter(h=>{const d=new Date(h.ts);return d.getMonth()===m.getMonth()&&d.getFullYear()===m.getFullYear();}).length;}
  function budget(){let lim=0,sp=0;try{const b=state.budget||{};lim=Number(b.limit)||Object.values(b.cats||{}).reduce((a,v)=>a+(+v||0),0);const m=new Date();
      (state.history||[]).forEach(h=>{const d=new Date(h.ts);if(d.getMonth()===m.getMonth()&&d.getFullYear()===m.getFullYear()){const pd=b.paid&&b.paid[String(h.ts)];sp+=window.bdApi?bdApi.tripAmt(h):pd&&pd.z?0:pd&&pd.a>0?pd.a:(Number(h.total)||0);}});
      (b.exp||[]).forEach(x=>{const d=new Date(x.ts);if(!x.del&&d.getMonth()===m.getMonth()&&d.getFullYear()===m.getFullYear())sp+=+x.amt||0;});}catch(e){}
    const mon=new Date().toLocaleDateString('he-IL',{month:'long'});
    return '<button type="button" class="r2bud" data-r2bud="1" data-noicon="1"><div class="r2bt"><b>💰 '+tt('תקציב ב'+mon,'Budget')+'</b><span>'+(lim?Math.round(lim).toLocaleString('he-IL')+' / '+Math.round(sp).toLocaleString('he-IL')+' ₪':tt('להגדרה ←','Set up ←'))+'</span></div>'+(lim?'<div class="r2bb"><i style="width:'+Math.min(100,Math.round(100*sp/lim))+'%"></i></div>':'')+'</button>';}
  function home(){const p=$('#paneHome');if(!p)return;const was=p.querySelector(':scope>.r2home');if(was)was.remove();
    p.insertAdjacentHTML('afterbegin','<div class="r2home" data-noicon="1"><button type="button" class="r2back" data-r2back="1">→ '+tt('הבית שלי','My home')+'</button>'+ph(tt('הבית שלי','My home'),tt('כל מה שקשור לבית במקום אחד','Everything about your home in one place'))+budget()+
      '<div class="r2grid">'+TILES.map((t,i)=>'<button type="button" class="r2tile'+(t[0]==='🍲'?' r2rec':'')+'" data-r2tile="'+i+'"><span class="r2ti">'+t[0]+'</span><b>'+esc(t[1])+'</b><small>'+esc(t[2]())+'</small></button>').join('')+'</div></div>');}
  document.addEventListener('click',e=>{const t=e.target.closest('[data-r2tile]');if(t){TILES[+t.dataset.r2tile][3]();return;}
    if(e.target.closest('[data-r2back]')){$('#paneHome').classList.remove('r2inv');return;}
    if(e.target.closest('[data-r2bud]')){const b=$('#miBudget50');if(b)b.click();}});
  if(typeof renderHome==='function'){const _rh=renderHome;renderHome=function(){const r=_rh.apply(this,arguments);try{home();}catch(e){console.warn('r2home',e);}return r;};}
  /* ---------- מחירים: כותרת + שמות קצרים לגלולות ---------- */
  const SEG={cmp:['איפה הכי זול','Cheapest'],feed:['מבצעים','Deals'],prices:['מוצר אחד','One product'],dir:['חנויות','Stores'],branches:['סניפים','Branches'],clothing:['ביגוד','Clothing']};
  function prices(pane){const p=$(pane);if(!p)return;p.querySelectorAll('.seg [data-sview]').forEach(b=>{const l=SEG[b.dataset.sview];if(l&&!b.dataset.r2){b.dataset.r2=1;b.textContent=tt(l[0],l[1]);}});
    if(p.querySelector(':scope>.r2ph'))return;const v=pane==='#panePrices'?'prices':(typeof storesView!=='undefined'?storesView:'cmp');
    const l=curList(),city=(state.user&&state.user.city)||'';
    const H={cmp:[tt('איפה הכי זול','Where is it cheapest'),tt('לרשימה "'+l.name+'"','For "'+l.name+'"')+(city?' • '+tt('ליד ','near ')+city:'')],prices:[tt('מחיר של מוצר','Product prices'),tt('חיפוש ודיווח מחיר','Search and report a price')],feed:[tt('מבצעים ועדכונים','Deals & updates'),''],dir:[tt('חנויות','Stores'),''],branches:[tt('סניפים','Branches'),''],clothing:[tt('ביגוד וחתונה','Clothing & wedding'),'']}[v]||['',''];
    if(H[0])p.insertAdjacentHTML('afterbegin',ph(H[0],H[1]));}
  if(typeof renderPrices==='function'){const _rp=renderPrices;renderPrices=function(){const r=_rp.apply(this,arguments);try{prices('#panePrices');}catch(e){}return r;};}
  if(typeof renderStores==='function'){const _rs=renderStores;renderStores=function(){const r=_rs.apply(this,arguments);try{prices('#paneStores');}catch(e){}return r;};}
  /* ---------- הגדרות: עמוד מלא ---------- */
  const m=$('#hMenu');
  if(m&&!m.querySelector('.r2sh')){
        m.insertAdjacentHTML('afterbegin','<div class="r2sh"><button type="button" data-r2close="1" aria-label="'+tt('חזרה','Back')+'">→</button><b>'+tt('הגדרות','Settings')+'</b></div><div class="r2pc"></div><div class="r2tc"></div>');
    m.addEventListener('click',e=>{if(e.target.closest('[data-r2close]')){m.classList.remove('open');e.stopPropagation();return;}
      const t=e.target.closest('[data-r2th]');if(t){e.stopPropagation();if(window.th36Set)th36Set(t.dataset.r2th);setTimeout(fill,50);}});}
  function fill(){if(!m)return;const u=(typeof state!=='undefined'&&state.user)||{},pro=window.pro2&&pro2.isPro&&pro2.isPro();
    const em=(typeof authUser!=='undefined'&&authUser&&authUser.email)||u.email||'';
    m.querySelector('.r2pc').innerHTML='<span class="r2pa">'+esc((u.name||'·').trim()[0]||'·')+'</span><span class="r2pn"><b>'+esc(u.name||tt('אורח','Guest'))+'</b><small dir="ltr">'+esc(em)+'</small></span>'+(pro?'<span class="pro2tag">PRO</span>':'');
    const cur=window.th36Get?th36Get():'sea';
    m.querySelector('.r2tc').innerHTML='<div class="r2tl">'+tt('צבע הלוגו והאייקון','Logo & icon color')+' <span class="pro2tag">PRO</span></div><div class="r2tg">'+(window.TH36||[]).map(t=>{const lock=t[t.length-1]&&!pro;
      return '<button type="button" class="r2tt'+(t[0]===cur?' on':'')+'" data-r2th="'+t[0]+'"><span class="r2sw" style="background:'+(t[0]==='night'?'#1d2129':t[0]==='sea'?'#1e3a5f':'#fff')+';'+(t[0]!=='sea'&&t[0]!=='night'?'box-shadow:inset 0 0 0 1px var(--line)':'')+'">'+
        '<svg class="ylogo" viewBox="-4 6 195 144" aria-hidden="true" style="--lg-t:'+(t[0]==='sea'||t[0]==='night'?'#fff':t[3])+';--lg-b:'+t[4]+';--lg-w:'+t[4]+';--lg-a:'+(t[0]==='sea'?'#1e3a5f':'#fff')+'"><use href="/logo-2.svg#yl"/></svg>'+(lock?'<span class="r2lock">🔒</span>':'')+'</span>'+esc(t[1])+'</button>';}).join('')+'</div>';}
  if(m){new MutationObserver(()=>{if(m.classList.contains('open'))fill();}).observe(m,{attributes:true,attributeFilter:['class']});}
})();
