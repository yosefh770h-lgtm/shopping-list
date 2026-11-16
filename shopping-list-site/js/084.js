
(function(){
  const tt=(he,en)=>typeof T==='function'?T(he,en):he;
  const catOf=i=>{const c=(i.c&&i.c!=='אחר')?i.c:(typeof resolveCat==='function'?resolveCat(i.n):'אחר');return (typeof CATS!=='undefined'&&CATS.includes(c))?c:'אחר';};
  const li=i=>'<li><span class="em">'+esc(i.e||'')+'</span><span class="tx"><b>'+esc(i.n||'')+'</b>'+(i.note?'<small>📝 '+esc(i.note)+'</small>':'')+'</span>'+
    (i.q&&String(i.q)!=='1'?'<span class="qq">×'+esc(i.q)+'</span>':'')+(Number(i.price)>0?'<span class="pr">'+esc(Number(i.price).toFixed(2))+' ₪</span>':'')+'</li>';
  const grouped=its=>{const order=(typeof CATS!=='undefined'?CATS:[]).concat(['אחר']);const by={};its.forEach(i=>{const c=catOf(i);(by[c]=by[c]||[]).push(i);});
    return Object.keys(by).sort((a,b)=>order.indexOf(a)-order.indexOf(b)).map(c=>'<h4>'+esc((typeof CATE!=='undefined'&&CATE[c])||'🛒')+' '+esc(c)+' ('+by[c].length+')</h4><ul>'+by[c].map(li).join('')+'</ul>').join('');};
  function viewHist73(idx){const h=(state.history||[])[idx];if(!h)return;
    const list=(h.listItems&&h.listItems.length?h.listItems:h.items)||[];
    const rc=h.receipt&&h.listItems&&h.listItems.length?(h.items||[]):[];
    let amt=0;try{const pd=state.budget&&state.budget.paid&&state.budget.paid[String(h.ts)];amt=pd&&pd.a>0?pd.a:(Number(h.total)||0);}catch(e){}
    const d=new Date(h.ts);
    const sub=[fmtDate(d),(typeof fmtTime==='function'?fmtTime(d):''),h.store?'🏪 '+h.store:'',list.length+' '+tt('מוצרים','items'),amt?'₪ '+Math.round(amt).toLocaleString('he-IL'):'',h.by?tt('סיים: ','By: ')+h.by:''].filter(Boolean);
    openSheet('📋 '+(h.listName||tt('קנייה','Shopping')),'<div class="hv73"><p class="hv73s">'+sub.map(esc).join(' · ')+'</p>'+
      (list.length?grouped(list):'<div class="empty">'+tt('אין מוצרים ברשומה הזו','No items in this record')+'</div>')+
      (rc.length?'<h4 style="margin-top:18px">🧾 '+tt('מה שהיה בקבלה','On the receipt')+' ('+rc.length+')</h4><ul>'+rc.map(li).join('')+'</ul>':'')+
      '<div class="row2"><button data-hv73dup="'+idx+'">📑 '+tt('שכפול לרשימה חדשה','Copy to a new list')+'</button><button class="btn sec" data-hv73add="'+idx+'">➕ '+tt('להוסיף לרשימה הנוכחית','Add to current list')+'</button></div></div>');}
  window.viewHist73=viewHist73;
  document.addEventListener('click',e=>{const v=e.target.closest&&e.target.closest('[data-hview]');if(v){e.preventDefault();e.stopPropagation();viewHist73(+v.dataset.hview);return;}
    const b=e.target.closest&&e.target.closest('[data-hv73dup],[data-hv73add]');if(!b)return;const h=(state.history||[])[+(b.dataset.hv73dup||b.dataset.hv73add)];if(!h)return;
    const hi=(h.listItems&&h.listItems.length?h.listItems:h.items)||[];closeSheet();
    if(b.dataset.hv73dup){dupList(h.listName,hi);setTab('list');return;}
    const n=addMany(hi);flash(n?'➕ '+tt('הוספתי '+n+' מוצרים לרשימה "'+curList().name+'"','Added '+n+' items'):tt('הכל כבר ברשימה ✔','Everything is already on the list ✔'));if(n)setTab('list');},true);
})();
