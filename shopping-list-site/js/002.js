
/* uiPrompt / uiConfirm / uiAlert — כמו prompt/confirm/alert, אבל חלון מעוצב של האתר שמחזיר Promise.
   חלון אחד בכל פעם: אם מתבקשים כמה, הם מוצגים בתור. */
(function(){
  let queue=Promise.resolve();
  const tr=(he,en)=>{try{return typeof T==='function'?T(he,en):he;}catch(e){return he;}};
  const DANGER=/מחק|מחיק|למחוק|לחסום|להשעות|לצאת מהחשבון|delete|remove|block/i;
  function show(kind,msg,def){
    return new Promise(done=>{
      const prev=document.activeElement;
      const wrap=document.createElement('div');wrap.className='uid30';wrap.setAttribute('role',kind==='alert'?'alertdialog':'dialog');wrap.setAttribute('aria-modal','true');
      const box=document.createElement('div');box.className='u30box';wrap.appendChild(box);
      box.innerHTML='<div class="u30bar"></div>';
      const m=document.createElement('div');m.className='u30msg';m.id='uid30m'+Date.now();m.textContent=msg==null?'':String(msg);box.appendChild(m);wrap.setAttribute('aria-labelledby',m.id);
      if(!m.textContent)m.style.display='none';
      let inp=null;
      if(kind==='prompt'){inp=document.createElement('input');inp.type='text';inp.value=def==null?'':String(def);inp.setAttribute('aria-labelledby',m.id);box.appendChild(inp);}
      const btns=document.createElement('div');btns.className='u30btns';box.appendChild(btns);
      const ok=document.createElement('button');ok.type='button';ok.className='u30ok';ok.textContent=tr('אישור','OK');
      if(kind==='confirm'&&DANGER.test(m.textContent))ok.classList.add('danger');
      btns.appendChild(ok);
      let no=null;
      if(kind!=='alert'){no=document.createElement('button');no.type='button';no.className='u30no';no.textContent=tr('ביטול','Cancel');btns.appendChild(no);}
      const finish=v=>{document.removeEventListener('keydown',key,true);wrap.remove();try{prev&&prev.focus&&prev.focus({preventScroll:true});}catch(e){}done(v);};
      const yes=()=>finish(kind==='prompt'?inp.value:kind==='confirm'?true:undefined);
      const cancel=()=>finish(kind==='prompt'?null:kind==='confirm'?false:undefined);
      const key=e=>{
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}
        else if(e.key==='Enter'&&(e.target===inp||kind!=='prompt')&&e.target!==no){e.preventDefault();e.stopPropagation();yes();}
        else if(e.key==='Tab'){const f=[inp,ok,no].filter(Boolean);const i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?f.length-1:1))%f.length].focus();}
        else e.stopPropagation();
      };
      ok.onclick=yes;if(no)no.onclick=cancel;
      wrap.addEventListener('click',e=>{if(e.target===wrap)cancel();});
      document.addEventListener('keydown',key,true);
      document.body.appendChild(wrap);
      if(inp){inp.focus();inp.select();}else ok.focus();
    });
  }
  const enqueue=(k,m,d)=>{const p=queue.then(()=>show(k,m,d));queue=p.catch(()=>{});return p;};
  window.uiPrompt=(msg,def)=>enqueue('prompt',msg,def);
  window.uiConfirm=msg=>enqueue('confirm',msg);
  window.uiAlert=msg=>enqueue('alert',msg);
})();
