
/* 📱/🌐 מי נכנס מהאפליקציה (APK) ומי מהאתר: כל כניסה ביומן "מי נכנס ומאיפה" מסומנת, וגם ב"מי מחובר עכשיו" */
(function(){
  const inApp=/YamShoppingApp\//.test(navigator.userAgent||''),_dev=device41;
  /* הסימון בתחילת "מכשיר", כדי שלא ייחתך (השרת שומר עד 60 תווים) */
  device41=function(){const d=_dev();return inApp?'אפליקציה APK · '+d.replace(/ · (Chrome|Samsung)( · מהאייקון)?$/,''):'אתר · '+d;};
  const pill=t=>/^אפליקציה APK/.test(t)?'<span class="plk pl-app">📱 אפליקציה</span>':/^אתר · /.test(t)?'<span class="plk pl-web">🌐 אתר</span>':'';
  /* ביומן הכניסות בבק אופיס: תגית בעמודת המכשיר + סינון */
  function decoVis(){const box=document.querySelector('#vis41b');if(!box)return;
    const f=(document.querySelector('#vis53p')||{}).value||'';
    box.querySelectorAll('tbody tr').forEach(tr=>{const td=tr.lastElementChild;if(!td)return;
      if(!td.dataset.p53){const t=td.textContent.trim();td.dataset.p53=/^אפליקציה APK/.test(t)?'app':/^אתר · /.test(t)?'web':'old';const pl=pill(t);
        if(pl){const sm=td.querySelector('small');if(sm)sm.textContent=t.replace(/^(אפליקציה APK|אתר) · /,'');const who=tr.children[1]||td;who.insertAdjacentHTML('beforeend','<br>'+pl);}}
      tr.style.display=!f||td.dataset.p53===f?'':'none';});}
  window.boAfter&&window.boAfter('guests',main=>{const card=main&&main.querySelector('#vis41');if(!card||card.querySelector('#vis53p'))return;
    const s=card.querySelector('#vis41k');if(s)s.insertAdjacentHTML('afterend','<select id="vis53p" style="max-width:190px"><option value="">אתר + אפליקציה</option><option value="app">📱 רק מהאפליקציה (APK)</option><option value="web">🌐 רק מהאתר</option></select>');
    const p=card.querySelector('#vis41 p.muted');if(p)p.insertAdjacentHTML('beforeend',' 📱 <b>אפליקציה</b> = מהאפליקציה לאנדרואיד (APK) · 🌐 <b>אתר</b> = מדפדפן. כניסות ישנות, מלפני הסימון, מופיעות בלי תגית.');
    card.querySelector('#vis53p').onchange=decoVis;
    new MutationObserver(decoVis).observe(card.querySelector('#vis41b'),{childList:true,subtree:true});decoVis();});
  /* "מי מחובר עכשיו": ליד כל שם — 📱 אפליקציה או 🌐 אתר, לפי איפה נראה בפעם האחרונה */
  const _on=openOnline;
  openOnline=async function(){await _on.apply(this,arguments);if(!isAdmin()||!sb)return;
    const el=document.querySelector('#onlineList');const rows=[...el.querySelectorAll('.mrow')];if(!rows.length)return;
    const [{users},{data}]=await Promise.all([adminFetch(),sb.rpc('admin_user_platforms').then(r=>r,()=>({}))]);if(!data)return;
    const by={};data.forEach(r=>by[r.user_id]=r);const on=users.filter(isOnline);let a=0,w=0;
    rows.forEach((row,i)=>{const u=on[i],r=u&&by[u.id];if(!r||row.querySelector('.plk'))return;const t=x=>x?+new Date(x):0;
      const app=t(r.app_at)>t(r.web_at);app?a++:w++;row.children[1].insertAdjacentHTML('afterend','<span class="plk pl-'+(app?'app':'web')+'" style="font-size:12px">'+(app?'📱 אפליקציה':'🌐 אתר')+'</span>');});
    const h=el.querySelector('h4');if(h&&(a||w))h.insertAdjacentHTML('beforeend',' <small style="font-weight:400;color:var(--muted)">· 📱 '+a+' באפליקציה · 🌐 '+w+' באתר</small>');};
  const mi=document.querySelector('#miOnline');if(mi)mi.onclick=openOnline;
})();
