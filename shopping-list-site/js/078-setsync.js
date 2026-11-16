
/* ⚙️ הגדרות אישיות שעוברות עם החשבון לכל מכשיר — אתר, אפליקציה ומחשב (profiles.settings).
   משנים הגדרה (למשל תצוגת צ'אטים כמו וואטסאפ) באפליקציה — והיא מופיעה גם באתר, ולהפך. השינוי האחרון גובר.
   מה שתלוי במכשיר עצמו (הרשאת התראות, אייקון, מיקום) נשאר במכשיר. תצוגת קטגוריות וערכת צבעים כבר נשמרות בחשבון בנפרד */
(function(){
  const SK=['dark','chatHome','gender','hideBotTips','hideFavs','favHidden','homeLayout','hideCustom','byStore28','srvPicks','meLite'];
  const PK=['lang','currency','diaspora','a11y','view66','noSugg66','noTick66','noRail66','noAwake20','nOff'];
  const DEF={gender:'f',lang:'he',currency:'ILS',view66:'auto'};
  const REC='yam_set_sync';
  const snap=()=>{const v={s:{},p:{}};SK.forEach(k=>{if(state&&state[k]!==undefined)v.s[k]=state[k];});PK.forEach(k=>{if(prefs[k]!==undefined)v.p[k]=prefs[k];});return v;};
  const sig=v=>{try{return JSON.stringify(v);}catch(e){return '';}};
  const getRec=()=>{try{return JSON.parse(localStorage.getItem(REC)||'null')||null;}catch(e){return null;}};
  const putRec=r=>{try{localStorage.setItem(REC,JSON.stringify(r));}catch(e){}};
  const uidNow=()=>(authUser&&authUser.id)||(state&&state.user&&state.user.id)||'';
  /* הגדרה "שנבחרה" (לא ברירת המחדל) — לפעם הראשונה, כשעוד לא ידוע מה השתנה אחרון */
  const chosen=(k,x)=>!(x===undefined||x===null||x===false||x===''||x===DEF[k]||(Array.isArray(x)&&!x.length)||(x&&typeof x==='object'&&!Array.isArray(x)&&!Object.keys(x).length));
  const mergeFirst=(l,r)=>{const o={s:{},p:{}};['s','p'].forEach(g=>{const L=l[g]||{},R=r[g]||{};
    new Set(Object.keys(L).concat(Object.keys(R))).forEach(k=>{o[g][k]=chosen(k,R[k])?R[k]:(k in L?L[k]:R[k]);});});return o;};
  let pushT=null,busy=false,lastPull=0;
  async function push(){clearTimeout(pushT);const r=getRec();if(!sb||!authUser||!r||r.synced||r.uid!==authUser.id)return;
    const v=snap(),sg=sig(v);if(sg.length>7500)return;
    try{const {error}=await sb.from('profiles').update({settings:{v,ts:r.ts||Date.now()}}).eq('id',authUser.id);
      if(!error){const n=getRec();if(n&&n.sig===sg){n.synced=true;n.first=false;putRec(n);}}}catch(e){}}
  /* כל שמירה: אם אחת ההגדרות השתנתה — רושמים מתי, ושולחים לחשבון */
  function note(){if(busy||!state)return;const sg=sig(snap()),r=getRec(),u=uidNow();
    if(r&&r.sig===sg&&r.uid===u)return;
    /* פעם ראשונה במכשיר הזה (או משתמש אחר) — עוד לא ידוע מתי ההגדרות השתנו */
    const first=!r||r.uid!==u||!!r.first;
    putRec({uid:u,sig:sg,ts:first?0:Date.now(),synced:false,first});clearTimeout(pushT);pushT=setTimeout(push,1200);}
  function apply(v,rec){const old=snap();busy=true;
    try{const s=v.s||{},p=v.p||{};
      SK.forEach(k=>{if(k in s)state[k]=s[k];});PK.forEach(k=>{if(k in p&&p[k]!=null)prefs[k]=p[k];});
      putRec(Object.assign({sig:sig(snap())},rec));
      try{savePrefs();}catch(e){}try{save(true);}catch(e){}}finally{busy=false;}
    if((old.p.lang||'he')!==(prefs.lang||'he')){if(!rec.synced)push().finally(()=>location.reload());else location.reload();return;}
    const tryF=f=>{try{f();}catch(e){}};
    tryF(()=>document.body.classList.toggle('dark',!!state.dark));tryF(()=>{if(window.th36Apply)th36Apply(th36Get());});
    tryF(applyA11y);tryF(applyView66);tryF(applyBotTips);tryF(updateGenderLabel);tryF(applyChatHome);
    if(!!old.s.chatHome!==!!state.chatHome)tryF(()=>setTab(state.chatHome?'chats':'list'));
    tryF(render);if(!rec.synced)push();}
  /* בכניסה ובכל חזרה לאפליקציה/לאתר: מושכים מהחשבון. מה שהשתנה אחרון (כאן או במכשיר אחר) — גובר */
  async function pull(force){if(!sb||!authUser)return;const now=Date.now();if(!force&&now-lastPull<20000)return;lastPull=now;
    let data=null;try{const res=await sb.from('profiles').select('settings').eq('id',authUser.id).maybeSingle();if(res.error)return;data=res.data;}catch(e){return;}
    const uid=authUser.id,local=snap(),cur=sig(local);let r=getRec();
    if(!r||r.uid!==uid)r={uid,sig:cur,ts:0,synced:false,first:true};
    else if(r.sig!==cur)r={uid,sig:cur,ts:r.first?0:Date.now(),synced:false,first:!!r.first};
    putRec(r);
    const rem=data&&data.settings&&data.settings.v&&typeof data.settings.v==='object'?data.settings:null;
    if(!rem){/* עוד לא נשמר בחשבון — מעלים את מה שיש במכשיר הזה */r.ts=r.ts||Date.now();putRec(r);push();return;}
    const rts=+rem.ts||0;
    if(r.first){/* המכשיר הזה עוד לא סונכרן: מצרפים — מה שנבחר במכשיר אחד או בחשבון נשמר בשניהם */
      const m=mergeFirst(local,rem.v);if(sig(m)===cur&&sig(rem.v)===cur){r.synced=true;r.first=false;r.ts=rts;putRec(r);return;}
      apply(m,{uid,ts:Date.now(),synced:false,first:false});return;}
    if(!r.synced&&r.ts>rts){push();return;}
    if(sig(rem.v)!==cur)apply(rem.v,{uid,ts:rts,synced:true,first:false});
    else{r.synced=true;r.ts=Math.max(r.ts,rts);putRec(r);}}
  const _setSave=save;save=function(){const x=_setSave.apply(this,arguments);note();return x;};
  const _setPrefs=savePrefs;savePrefs=function(){const x=_setPrefs.apply(this,arguments);note();return x;};
  const _setSigned=onSignedIn;onSignedIn=async function(){const x=await _setSigned.apply(this,arguments);pull(true);return x;};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull(false);});
  setTimeout(()=>{if(authUser)pull(true);},1500);
  window.__setSync={pull,push,snap};
})();

/* 👥 הצטרפו לחשבון המשותף ממכשיר אחר (למשל בדפדפן) כשהאפליקציה כבר פתוחה — בחזרה אליה מתחברים לבד */
(function(){let last=0;
  document.addEventListener('visibilitychange',async()=>{if(document.hidden||!sb||!authUser||state.follow||state.merge)return;
    const now=Date.now();if(now-last<60000)return;last=now;
    try{const pk=await mySharedRoom15();if(pk&&!state.follow){stopCloud();await startCloud();render();applyPermsUi15();}}catch(e){}});
})();

/* 🔗 קישור הזמנה (#join-...) או איחוד (#merge-...) שנפתח כשהאתר/האפליקציה כבר פתוחים — רק ה-# משתנה והדף לא נטען מחדש.
   באפליקציה 2.0 קישור מוואטסאפ נפתח בתוך האפליקציה הפתוחה בדיוק כך */
window.addEventListener('hashchange',()=>{const h=location.hash||'';
  const j=h.match(/^#join-([a-f0-9]{20,64})$/),m=h.match(/^#merge-([A-Za-z0-9]{8})$/);if(!j&&!m)return;
  try{localStorage.setItem(j?'yamJoin':'yamMerge',j?j[1]:m[1].toUpperCase());}catch(e){}
  history.replaceState(null,'',location.pathname+location.search);
  try{if(j)checkJoin15();else checkMergeLink20();}catch(e){}});

/* ⏰ תזכורות וסידורים בעיצוב 2.0: כניסה ברורה (כרטיס בבית שלי, גלולה ברשימה, כפתור ליד שיתוף במחשב) והחלון בסגנון החדש */
(function(){
  if(!document.body.classList.contains('r2')||typeof openErrands!=='function')return;
  const $=s=>document.querySelector(s),tt=(he,en)=>typeof T==='function'?T(he,en):he;
  const TITLE=()=>tt('תזכורות וסידורים','Reminders & errands');
  const _os=openSheet;openSheet=function(){const sh=$('#v8Sheet');if(sh)sh.classList.remove('rem2');return _os.apply(this,arguments);};
  const _oe=openErrands;openErrands=function(){const r=_oe.apply(this,arguments);const sh=$('#v8Sheet'),t=$('#v8SheetTitle');if(sh)sh.classList.add('rem2');if(t)t.textContent='📌 '+TITLE();return r;};
  errChip=function(){const n=errOpen().length;return '<button class="chip errchip17'+(n?' has':'')+'" data-eopen="1" title="'+esc(TITLE())+'">📌 '+tt('תזכורות','Reminders')+(n?' <span class="n17">'+n+'</span>':'')+'</button>';};
  errStrip=function(){const o=errOpen();if(!o.length)return '';const top=errSorted(o).slice(0,3);
    return '<div class="errstrip17" role="region" aria-label="'+esc(TITLE())+'"><div class="eh17"><b>📌 '+tt('תזכורות','Reminders')+' <span class="rem2n">'+o.length+'</span></b><button class="lnk17" data-eopen="1">'+(o.length>3?tt('הכל ←','All ←'):tt('ניהול ←','Manage ←'))+'</button></div>'+top.map(e=>errRow(e,true)).join('')+'</div>';};
  /* כפתור ליד "שיתוף" ו"מצב קנייה" (מוצג במחשב) */
  function acts(){const a=$('#r2lh .r2acts');if(!a)return;let b=a.querySelector('.rem2b');
    if(!b){a.insertAdjacentHTML('afterbegin','<button type="button" class="rem2b" data-eopen="1"></button>');b=a.querySelector('.rem2b');}
    const n=errOpen().length;b.title=TITLE();b.innerHTML='📌 '+tt('תזכורות','Reminders')+(n?' <span class="n17">'+n+'</span>':'');}
  /* כרטיס בבית שלי, מתחת לתקציב */
  function homeCard(){const h=$('#paneHome .r2home');if(!h)return;const old=h.querySelector('.r2rem');if(old)old.remove();
    const o=errSorted(errOpen()),nx=o[0];
    const sub=o.length?(o.length===1?tt('תזכורת אחת','1 reminder'):tt(o.length+' תזכורות',o.length+' reminders'))+' · '+nx.t+(nx.due?' ('+errDueText(nx.due)+')':''):tt('מה צריך לעשות בדרך — דואר, תופרת, בנק...','Things to do on the way');
    const html='<button type="button" class="r2rem" data-eopen="1"><span class="rem2i">📌</span><span class="rem2t"><b>'+esc(TITLE())+'</b><small>'+esc(sub)+'</small></span><span class="rem2go">'+(o.length?tt('הכל ←','All ←'):tt('להוספה ←','Add ←'))+'</span></button>';
    const g=h.querySelector('.r2grid');if(g)g.insertAdjacentHTML('beforebegin',html);else h.insertAdjacentHTML('beforeend',html);}
  const _rl=renderList;renderList=function(){const r=_rl.apply(this,arguments);try{acts();}catch(e){}return r;};
  if(typeof renderHome==='function'){const _rh=renderHome;renderHome=function(){const r=_rh.apply(this,arguments);try{homeCard();}catch(e){console.warn('rem2',e);}return r;};}
  const _es=errSet;errSet=function(){const r=_es.apply(this,arguments);try{homeCard();}catch(e){}return r;};
  const mi=$('#miErr17 span');if(mi)mi.textContent=TITLE();
  try{const c=$('#chips .errchip17');if(c)c.remove();render();if(document.querySelector('#paneHome.on'))renderHome();}catch(e){}
})();
