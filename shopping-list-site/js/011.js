
/* ================= גרסה 11: פשוט וידידותי — תפריט מחולק לקטגוריות, סרגל קטגוריות בבית ובמאגר המוצרים ================= */
const $11=s=>document.querySelector(s);
/* ---------- תפריט ⚙️ מחולק לקבוצות (נפתחות בלחיצה) ---------- */
(function(){
  const m=$11('#hMenu');if(!m)return;
  const pick=sel=>sel.map(x=>x.startsWith('fw:')?m.querySelector('[data-forward="'+x.slice(3)+'"]'):m.querySelector('#'+x)).filter(Boolean);
  const GROUPS=[
    ['shop','🛒',T('קניות והבית','Shopping & home'),['miFinish','miInv','miUpload','miProdUp','miDeal','fw:btnShare','fw:btnPrint']],
    ['food','🕯️',T('שבת וחגים','Shabbat & holidays'),['miRecipes','miRecipe','miZmanim']],
    ['talk','💬',T('קשר עם האתר','Contact us'),['miChatSite','miReviews','miBizJoin','miAbout']],
    ['view','🎨',T('תצוגה והגדרות','Display & settings'),['miTheme','fw:btnDark','fw:btnGroup','miChats','miFavs','miA11y','miGender','miIntl']],
    ['staff','🛠️',T('ניהול האתר','Site admin'),['miOnline','miAdmin','miBackoffice']],
    ['acct','👤',T('החשבון שלי','My account'),['miLogout','miDelete']]];
  let openG='';try{openG=localStorage.getItem('yam_menu_open')||'shop';}catch(e){openG='shop';}
  const used=new Set(['miMe','miNotif','miInstall']);
  GROUPS.forEach(([k,ic,label,ids])=>{const btns=pick(ids);if(!btns.length)return;btns.forEach(b=>used.add(b.id||b.dataset.forward));
    const d=document.createElement('details');d.className='mgrp'+(k==='staff'?' staff-grp':'');d.dataset.g=k;if(k===openG)d.open=true;
    d.innerHTML='<summary><span>'+ic+'</span><span class="grow">'+label+'</span></summary><div class="mgbody"></div>';
    btns.forEach(b=>d.querySelector('.mgbody').appendChild(b));m.appendChild(d);});
  /* מה שלא שויך — לקבוצה "עוד" (כדי ששום כפתור לא ייעלם) */
  const rest=[...m.children].filter(c=>c.tagName==='BUTTON'&&!used.has(c.id||c.dataset.forward));
  if(rest.length){const d=document.createElement('details');d.className='mgrp';d.dataset.g='more';d.innerHTML='<summary><span>➕</span><span class="grow">'+T('עוד','More')+'</span></summary><div class="mgbody"></div>';rest.forEach(b=>d.querySelector('.mgbody').appendChild(b));m.appendChild(d);}
  m.addEventListener('toggle',e=>{const d=e.target;if(!d.classList||!d.classList.contains('mgrp')||!d.open)return;
    m.querySelectorAll('details.mgrp[open]').forEach(x=>{if(x!==d)x.open=false;});try{localStorage.setItem('yam_menu_open',d.dataset.g);}catch(err){}},true);
})();

/* ---------- הבית שלי: סרגל קטגוריות למעלה — במקום לגלול הרבה ---------- */
state.homeCat=state.homeCat||'';
homeCatsHtml=function(q){
  const catOf=n=>(myProd[n]&&myProd[n].category)||P[n].c;
  const match=n=>!q||n.includes(q)||norm(pName(n)).includes(q);
  const all=Object.keys(P).filter(match);
  const counts={};all.forEach(n=>{const c=catOf(n);counts[c]=counts[c]||{t:0,h:0};counts[c].t++;if(pantryHas(n))counts[c].h++;});
  const sel=q?'':state.homeCat;const haveN=all.filter(pantryHas).length;
  const bar='<div class="catbar" role="tablist" aria-label="'+T('קטגוריות','Categories')+'"><button class="cb'+(!sel?' on':'')+'" data-hcat="" role="tab" aria-selected="'+(!sel)+'">🧺 '+T('הכל','All')+'</button><button class="cb'+(sel==='have'?' on':'')+'" data-hcat="have" role="tab">✓ '+T('מה שיש לי','What I have')+' <small>'+haveN+'</small></button>'+
    CATS.filter(c=>counts[c]).map(c=>'<button class="cb'+(sel===c?' on':'')+'" data-hcat="'+esc(c)+'" role="tab" aria-selected="'+(sel===c)+'">'+CATE[c]+' '+esc(c)+(counts[c].h?' <small>'+counts[c].h+'</small>':'')+'</button>').join('')+'</div>';
  const groups=CATS.filter(c=>!sel||sel==='have'||sel===c).map(c=>{let its=all.filter(n=>catOf(n)===c);if(sel==='have')its=its.filter(pantryHas);if(!its.length)return '';
    its.sort((a,b)=>(pantryHas(b)?1:0)-(pantryHas(a)?1:0)||(pImg(b)?1:0)-(pImg(a)?1:0));
    return '<div class="grp"><h3>'+CATE[c]+' '+esc(c)+' <small>('+its.filter(pantryHas).length+'/'+its.length+')</small></h3><div class="hgrid">'+its.map(n=>pcardHtml(n,false)).join('')+'</div></div>';}).join('');
  return bar+(groups||'<div class="empty">'+(sel==='have'?T('עוד לא סימנת מה יש בבית 🙂 לוחצים על מוצר כדי לסמן "יש".','Nothing marked yet 🙂'):T('לא נמצא 🤷','Not found 🤷'))+'</div>');
};
document.querySelector('#paneHome').addEventListener('click',e=>{const c=e.target.closest('[data-hcat]');if(!c)return;e.stopPropagation();
  state.homeCat=c.dataset.hcat;save(true);renderHomeCats();const bar=document.querySelector('#paneHome .catbar');if(bar){const on=bar.querySelector('.on');if(on)on.scrollIntoView({inline:'center',block:'nearest'});const top=bar.getBoundingClientRect().top;if(top<0||top>innerHeight/2)bar.scrollIntoView({block:'start'});}},true);

/* ---------- מאגר המוצרים (➕): סרגל קטגוריות למעלה ---------- */
let catCat='';
(function(){const s=$11('#inCatSearch');if(!s)return;const bar=document.createElement('div');bar.className='catbar';bar.id='catBar';s.insertAdjacentElement('afterend',bar);
  bar.addEventListener('click',e=>{const c=e.target.closest('[data-ccat]');if(!c)return;catCat=c.dataset.ccat;renderCats($11('#inCatSearch').value);$11('#catList').scrollTop=0;});})();
const _v11RenderCats=renderCats;
renderCats=function(q){_v11RenderCats(q);const list=$11('#catList'),bar=$11('#catBar');if(!list)return;const searching=!!norm(q||'');
  const heads=[...list.querySelectorAll('h4')];
  if(bar)bar.innerHTML=searching?'':'<button class="cb'+(!catCat?' on':'')+'" data-ccat="">🧺 '+T('הכל','All')+'</button>'+heads.map(h=>{const c=h.textContent.replace(/^\S+\s/,'').trim();return '<button class="cb'+(catCat===c?' on':'')+'" data-ccat="'+esc(c)+'">'+esc(h.textContent)+'</button>';}).join('');
  if(!searching&&catCat)heads.forEach(h=>{const c=h.textContent.replace(/^\S+\s/,'').trim();const hide=c!==catCat;h.style.display=hide?'none':'';const nx=h.nextElementSibling;if(nx)nx.style.display=hide?'none':'';});
  const on=bar&&bar.querySelector('.on');if(on)on.scrollIntoView({inline:'center',block:'nearest'});};
