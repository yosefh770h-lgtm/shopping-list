
(function(){
  if(!document.body.classList.contains('r2'))return;
  const $=s=>document.querySelector(s),tt=(he,en)=>typeof T==='function'?T(he,en):he;
  /* יאמי — שקית ורודה עם פנים, כמו בהדמיה */
  const FACE='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 11V9a5 5 0 0 1 10 0v2" fill="none" stroke="#ec8aa8" stroke-width="2.4" stroke-linecap="round"/><rect x="5" y="10" width="22" height="18" rx="4" fill="#ec8aa8"/><circle cx="12.5" cy="17.5" r="1.6" fill="#1e3a5f"/><circle cx="19.5" cy="17.5" r="1.6" fill="#1e3a5f"/><path d="M12.5 21.5q3.5 3 7 0" fill="none" stroke="#1e3a5f" stroke-width="1.8" stroke-linecap="round"/></svg>';
  function head(){const a=$('#botSheet .ruthy-av');if(a&&!a.dataset.r2y){a.dataset.r2y=1;a.innerHTML=FACE;}
    const h=$('#botSheet .ruthy-head');if(h&&!h.querySelector('.r2yb')){h.insertAdjacentHTML('afterbegin','<button type="button" class="r2yb" aria-label="'+tt('חזרה','Back')+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>');
      h.querySelector('.r2yb').onclick=()=>{const c=$('#botClose');if(c)c.click();};}}
  /* מיקרופון: מכתיבים ליאמי ושולחים */
  function mic(){const i=$('#botInput');if(!i||$('#botMic'))return;
    i.insertAdjacentHTML('beforeend','<button type="button" class="ibtn" id="botMic" aria-label="'+tt('הכתבה ליאמי','Dictate to Yami')+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>');
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition,b=$('#botMic');if(!SR){b.hidden=true;return;}let rec=null;
    b.onclick=()=>{if(rec){rec.stop();return;}try{rec=new SR();rec.lang=(typeof lang!=='undefined'&&lang==='en')?'en-US':'he-IL';rec.interimResults=false;
      rec.onresult=ev=>{const t=$('#botText');t.value=ev.results[0][0].transcript;const s=$('#botSend');if(s)s.click();};
      rec.onend=rec.onerror=()=>{b.classList.remove('rec');rec=null;};b.classList.add('rec');rec.start();}catch(e){rec=null;b.classList.remove('rec');}};}
  /* כפתורי התשובה המהירה נכנסים לתוך הבועה */
  if(typeof renderBot==='function'){const _rb=renderBot;renderBot=function(){const r=_rb.apply(this,arguments);
    try{const q=$('#botMsgs .row.bot:last-of-type>.qr24'),b=q&&q.parentElement.querySelector('.bub');if(b){b.appendChild(q);q.style.flexBasis='';}}catch(e){}return r;};}
  /* הכפתור הצף של יאמי — אותה דמות */
  function fab(){const f=$('#botFab');if(f&&!f.dataset.r2y){f.dataset.r2y=1;const sm=f.querySelector('small');f.innerHTML=FACE;if(sm)f.appendChild(sm);const g=f.querySelector('svg');g.style.cssText='width:30px;height:30px';}}
  try{head();mic();fab();}catch(e){console.warn('r2yami',e);}
})();
