
/* 👁️ חשבון משותף: בעל החשבון בוחר מה השותף רואה — אילו רשימות, והאם גם היסטוריה, הבית שלי, מתכונים, תזכורות וסידורים ותקציב.
   הבחירה נשמרת בשרת (room_members.share / merge_codes.share) והשרת הוא שמסנן: שותף מוגבל לא קורא את הטבלה ישירות,
   מקבל רק כינוי במקום קוד החשבון, וכותב רק דרך merge_partner_put — שלא נוגע במה שלא שותף איתו. אפשר לשנות בכל רגע. */
(function(){
  if(typeof openMerge20!=='function'||typeof canSee15!=='function')return;
  const SECS=[['history','🧾','היסטוריית קניות','Shopping history'],['home','🏠','הבית שלי (מה יש ומה חסר)','My home (stock)']].concat([
    ['errands','📌','תזכורות וסידורים','Reminders & errands'],['budget','💰','תקציב הבית','Home budget']]);
  const isPartner=()=>!!(roomAcc15&&roomAcc15.role==='partner');
  const shareSig=s=>{try{return JSON.stringify(s||null);}catch(e){return '';}};
  /* מה רואה השותף — בשורה אחת */
  function summary(sh){if(!sh)return T('רואה ועורך הכל','Sees and edits everything');
    const ls=Array.isArray(sh.lists)?sh.lists:null,v=sh.view||{};
    const lp=ls?(ls.length===1?T('רשימה אחת','1 list'):T(ls.length+' רשימות',ls.length+' lists')):T('כל הרשימות','All lists');
    const on=SECS.filter(x=>v[x[0]]!==false).map(x=>x[1]+' '+T(x[2],x[3]));
    return '📝 '+lp+(on.length?' · '+on.join(' · '):' · '+T('בלי שאר החלקים','nothing else'));}
  window.shareSummary21=summary;

  /* שותף מוגבל: מסתירים את מה שלא שותף איתו */
  const _cs=canSee15;
  canSee15=function(sec){if(isPartner()){const v=(roomAcc15.share&&roomAcc15.share.view)||{};return v[sec]!==false;}return _cs.apply(this,arguments);};
  const _ap=applyPermsUi15;
  applyPermsUi15=function(){const r=_ap.apply(this,arguments);
    try{const p=isPartner();document.body.classList.toggle('noerr21',p&&!canSee15('errands'));document.body.classList.toggle('nobd21',p&&!canSee15('budget'));
      if(p&&!canSee15('budget')&&typeof meTab!=='undefined'&&meTab==='budget'){meTab='home';try{renderMe();}catch(e){}}}catch(e){}
    return r;};
  const blocked=sec=>{if(isPartner()&&!canSee15(sec)){flash('👁️ '+T('בעל החשבון לא שיתף איתך את החלק הזה','The account owner did not share this with you'));return true;}return false;};
  if(typeof openErrands==='function'){const _oe=openErrands;openErrands=function(){if(blocked('errands'))return;return _oe.apply(this,arguments);};}
  if(typeof errAdd==='function'){const _ea=errAdd;errAdd=function(){if(blocked('errands'))return null;return _ea.apply(this,arguments);};}
  if(typeof renderMe==='function'){const _rm=renderMe;renderMe=function(){if(typeof meTab!=='undefined'&&meTab==='budget'&&isPartner()&&!canSee15('budget'))meTab='home';return _rm.apply(this,arguments);};}

  /* בעל החשבון שינה מה משותף — השותף עובר לתצוגה החדשה לבד (בדיקה פעם בדקה ובכל חזרה לאפליקציה) */
  let lastChk=0;
  async function recheck(){if(!state.merge||!sb||!authUser||document.hidden)return;const now=Date.now();if(now-lastChk<20000)return;lastChk=now;
    const m=await mergeFetch20();const g=m&&m.guest;if(!g||g.code!==state.follow)return;
    const mine=isPartner()?roomAcc15.share:null;
    if(shareSig(g.share)!==shareSig(mine)){stopCloud();clearInterval(roomPoll15);resetSynced();save(true);await startCloud();render();try{applyPermsUi15();}catch(e){}
      flash('👁️ '+T('בעל החשבון עדכן מה משותף איתך','The owner updated what is shared with you'));}}
  setInterval(recheck,60000);document.addEventListener('visibilitychange',recheck);

  /* עורך הבחירה: לשותף קיים (uid) או לקוד האיחוד שעוד לא נוצל (pending) */
  async function openShare(target,cur,name){
    const lists=(state.lists||[]).filter(l=>l&&l.id);const ls=cur&&Array.isArray(cur.lists)?cur.lists:null,v=(cur&&cur.view)||{};
    const who=target==='pending'?T('מי שיקליד את הקוד','whoever enters the code'):(name||'');
    const b=openSheet('👁️ '+T('מה ','What ')+who+T(' יראה',' will see'),
      '<div class="sh21">'+
      '<p class="muted-note">'+T('את/ה בוחר/ת מה משותף. השרת עצמו שומר על הבחירה — מה שלא סימנת לא מגיע למכשיר של השותף בכלל. אפשר לשנות בכל רגע.','You choose what is shared. The server enforces it — anything unticked never reaches their device. Change anytime.')+'</p>'+
      '<h4>📝 '+T('רשימות קניות','Shopping lists')+'</h4>'+
      '<label class="sh21o"><input type="radio" name="sh21m" value="all"'+(ls?'':' checked')+'> <span><b>'+T('כל הרשימות','All lists')+'</b><small>'+T('כולל רשימות חדשות שייפתחו בהמשך','Including new lists you open later')+'</small></span></label>'+
      '<label class="sh21o"><input type="radio" name="sh21m" value="pick"'+(ls?' checked':'')+'> <span><b>'+T('רק הרשימות שאבחר','Only the lists I pick')+'</b><small>'+T('רשימה שהשותף פותח בעצמו — גלויה לשניכם','A list they open themselves is visible to both of you')+'</small></span></label>'+
      '<div class="sh21l" id="sh21L"'+(ls?'':' hidden')+'>'+(lists.length?lists.map(l=>'<label><input type="checkbox" data-sl="'+esc(l.id)+'"'+(ls&&ls.includes(l.id)?' checked':'')+'> '+esc(l.name||T('רשימה','List'))+' <small>('+((l.items||[]).length)+')</small></label>').join(''):'<p class="muted-note">'+T('אין עדיין רשימות','No lists yet')+'</p>')+
        '<p class="muted-note">'+T('כשמשתפים רק חלק מהרשימות, גם תבניות, סטטיסטיקות ומוצרים קבועים לא משותפים.','When sharing only some lists, templates, stats and recurring items are not shared either.')+'</p></div>'+
      '<h4>🧩 '+T('עוד חלקים בחשבון','More parts of the account')+'</h4>'+
      SECS.map(([k,i,he,en])=>'<label class="sh21c"><input type="checkbox" data-sv="'+k+'"'+(v[k]===false?'':' checked')+'> '+i+' '+T(he,en)+'</label>').join('')+
      '<p class="muted-note">'+T('🧾 ההיסטוריה כוללת קניות מכל הרשימות.','🧾 History includes purchases from all lists.')+'</p>'+
      (target!=='pending'&&!cur?'<p class="muted-note">🔐 '+T('כשמגבילים שותף שראה הכל, קוד החשבון מתחלף לבד — כדי שלא יוכל לעקוף את ההגבלה.','Limiting a partner who saw everything changes the account code automatically.')+'</p>':'')+
      '<div class="row2"><button class="btn" id="sh21Save">💾 '+T('שמירה','Save')+'</button><button class="btn sec" id="sh21All">↺ '+T('לשתף הכל','Share everything')+'</button></div></div>');
    const lb=b.querySelector('#sh21L');
    b.querySelectorAll('input[name="sh21m"]').forEach(r=>r.onchange=()=>{lb.hidden=b.querySelector('input[name="sh21m"]:checked').value!=='pick';});
    const send=async(share,btn)=>{btn.disabled=true;
      const {data,error}=await sb.rpc('merge_share_set',{p_user:target==='pending'?null:target,p_share:share});btn.disabled=false;
      if(error||!data||data.error){flash('⚠️ '+((data&&data.error==='no_code')?T('הקוד כבר נוצל או שפג תוקפו','The code was used or expired'):(error&&error.message)||(isAdmin()?T('צריך להריץ שוב את קוד ה-SQL','Run the SQL again'):T('משהו השתבש','Something went wrong'))));return;}
      /* הקוד התחלף (הגבלה ראשונה) — מתחברים מחדש לחשבון עם הקוד החדש */
      if(target!=='pending'&&!cur&&data.share){try{stopCloud();await startCloud();render();}catch(e){}}
      flash('👁️ '+T('נשמר: ','Saved: ')+summary(data.share).replace(/<[^>]+>/g,''));openMerge20();};
    b.querySelector('#sh21Save').onclick=e=>{const pick=b.querySelector('input[name="sh21m"]:checked').value==='pick';
      const share={lists:pick?[...b.querySelectorAll('[data-sl]:checked')].map(c=>c.dataset.sl):null,view:{}};
      b.querySelectorAll('[data-sv]').forEach(c=>share.view[c.dataset.sv]=c.checked);send(share,e.currentTarget);};
    b.querySelector('#sh21All').onclick=e=>send(null,e.currentTarget);
  }
  window.openShare21=openShare;

  /* מסך האיחוד: מה כל שותף רואה + כפתור לשינוי; בקוד שעוד לא נוצל — לבחור מראש */
  const _om=openMerge20;
  openMerge20=async function(){const r=await _om.apply(this,arguments);
    try{const m=merge20||{};const b=document.querySelector('#v8SheetBody');if(!b||!b.querySelector('.mg20'))return r;
      if(m.guest){const sub=b.querySelector('.mg20-sub');if(sub&&m.guest.share)sub.insertAdjacentHTML('afterend','<div class="mg20-card sh21g"><h4>👁️ '+T('מה משותף איתך','What is shared with you')+'</h4><p>'+esc(summary(m.guest.share))+'</p><p class="muted-note">'+T('בעל החשבון בחר מה לשתף. מה שלא שותף נשאר רק אצלו.','The owner chose what to share.')+'</p></div>');
        if(sub&&m.guest.share)sub.innerHTML=sub.innerHTML.replace(T('שניכם רואים ועורכים את אותן רשימות, היסטוריה ו"הבית שלי".','You both see and edit the same lists, history and home.'),T('אתם עובדים יחד על מה שבעל החשבון שיתף איתך.','You work together on what the owner shared with you.'));}
      (m.partners||[]).forEach(p=>{const en=b.querySelector('[data-mg20end="'+CSS.escape(p.user_id)+'"]');if(!en)return;const row=en.closest('.mg20-p');
        const sm=row&&row.querySelector('small');if(sm)sm.insertAdjacentHTML('afterend','<small class="sh21s">'+esc(summary(p.share))+'</small>');
        en.insertAdjacentHTML('beforebegin','<button class="btn sm sec" data-sh21="'+esc(p.user_id)+'" data-nm="'+esc(p.name||'')+'">👁️ '+T('מה רואה','What they see')+'</button>');});
      const host=b.querySelector('#mg20Host');
      if(host&&m.pending){const c=host.querySelector('.mg20-code');if(c)c.insertAdjacentHTML('afterend','<p class="sh21s">👁️ '+esc(summary(m.pending.share))+'</p><button class="btn sec sm" data-sh21="pending">👁️ '+T('לבחור מה הוא/היא יראו','Choose what they will see')+'</button>');}
      else if(host){const p=host.querySelector('p');if(p)p.textContent=T('הקוד בתוקף 30 דקות ולשימוש אחד. אחרי שיוצרים אותו אפשר לבחור מה השותף יראה — את כל החשבון, או רק רשימות וחלקים מסוימים.','Valid 30 minutes, single use. After creating it you can choose what the partner will see.');}
      const note=b.querySelector('.mg20 > .mg20-note:last-child');if(note)note.textContent='💡 '+T('אפשר לבחור לכל שותף מה הוא רואה (👁️). רוצים גם להגביל פעולות (רק לראות, בלי למחוק)? בשביל זה יש "משתמשים משניים והרשאות".','Pick what each partner sees (👁️). For action limits use "Secondary users".');
    }catch(e){}
    return r;};
  document.addEventListener('click',e=>{const t=e.target.closest('#v8SheetBody [data-sh21]');if(!t)return;e.preventDefault();e.stopPropagation();
    const id=t.dataset.sh21,m=merge20||{};
    if(id==='pending')openShare('pending',m.pending&&m.pending.share,'');
    else{const p=(m.partners||[]).find(x=>x.user_id===id);openShare(id,p&&p.share,t.dataset.nm||'');}},true);
})();
