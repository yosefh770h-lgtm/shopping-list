(function(){
  const tabs=document.querySelector('.tabs');if(!tabs||tabs.querySelector('.tabx14'))return;
  const tt=(he,en)=>typeof T==='function'?T(he,en):he;
  const ic=d=>'<svg viewBox="0 0 24 24" class="ic2" aria-hidden="true">'+d+'</svg>';
  const REC=ic('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>');
  tabs.insertAdjacentHTML('beforeend',
    '<button type="button" class="tab tabx14" data-x="receipt" aria-label="'+tt('העלאת קבלה','Upload a receipt')+'">'+REC+'<span class="r2tl">'+tt('קבלה','Receipt')+'</span></button>');
  tabs.addEventListener('click',e=>{const b=e.target.closest('.tabx14');if(!b)return;
    if(b.dataset.x==='receipt'&&typeof openUpload==='function')openUpload('receipt');});
})();
