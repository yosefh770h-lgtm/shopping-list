
/* ================= גרסה 17: סידורים בדרך, פעמון שקט, יאמי מהירה ================= */
const $17=s=>document.querySelector(s);

/* ---------- 🔔 פעמון: בלי נקודה צהובה קבועה, ומה שנמחק לא חוזר ---------- */
/* הנקודה הצהובה סימנה "התראות פעילות" אבל נראתה כמו עדכון שלא נקרא — הורדנו אותה */
(function(){const st=document.createElement('style');st.textContent='.bellbtn.on::after{display:none}';document.head.appendChild(st);})();
/* ההצעה היומית (💡) לא עברה דרך "כבר ראיתי", ולכן חזרה אחרי כל רענון גם כשמחקו אותה */
const _v17NotifySugg=notifySugg;
notifySugg=function(id){if(id&&seen16.has(id))return;const r=_v17NotifySugg.apply(this,arguments);if(id){seen16.add(id);saveSeen16();}return r;};
/* "ניקוי" — כל מה שהיה בפעמון נשאר בגדר "נראה" */
$17('#notifBody').addEventListener('click',e=>{if(e.target.closest('#nClear')){(inbox||[]).forEach(x=>seen16.add(x.id));saveSeen16();}},true);

/* ---------- ⚡ יאמי מהירה: מעירים את השרת כשפותחים את יאמי, עוד לפני השאלה ---------- */
let warm17=0;
function warmAI17(){if(!sb||!authUser||aiOff||Date.now()-warm17<4*60000)return;warm17=Date.now();try{sb.functions.invoke('ai-chat',{body:{ping:true}}).catch(()=>{});}catch(e){}}
const _v17OpenBot=openBot;openBot=function(){const r=_v17OpenBot.apply(this,arguments);warmAI17();return r;};
document.addEventListener('focusin',e=>{if(e.target&&(e.target.id==='botText'||e.target.closest&&e.target.closest('#paneChats')))warmAI17();});
/* בלי השהייה מלאכותית לפני התשובה */
sendToBot=function(v){meSay(v);window.botTyping=true;renderBot();setTimeout(()=>{window.botTyping=false;botReply(v);},60);};

/* ---------- 🆕 "אחר כך" באמת אומר אחר כך ---------- */
/* קודם: מי שלחץ "אחר כך" קיבל את חלון העדכון שוב אחרי כל רענון. עכשיו: עדכון גרסה — פעם אחת בלבד (אפשר לקרוא שוב ב"אודות");
   עדכון מהבק אופיס — חוזר רק אחרי יום */
const UPD_LATER17='yam_upd_later';
$17('#updLater').addEventListener('click',()=>{try{localStorage.setItem('yam_ver_seen',APP_VERSION);localStorage.setItem(UPD_LATER17,String(Date.now()));}catch(e){}});
const _v17CheckUpdates=checkUpdates;
checkUpdates=async function(){try{if(Date.now()-Number(localStorage.getItem(UPD_LATER17)||0)<DAY_MS)return false;}catch(e){}return _v17CheckUpdates.apply(this,arguments);};
CHANGELOG.unshift(['17','אוקטובר 2026',
  'מה היה: סריקת ברקוד לא עבדה באייפון ובמחשב; מלל ארוך (כמו קישור) ברח מההודעה והצ\'אט זז ימינה ושמאלה; יאמי ענתה לאט; והפעמון הראה "עדכון" אחרי כל רענון.',
  'מה חדש: 🔍 האתר מופיע בגוגל — מחפשים "ים שופינג" או yamshopping · 📌 סידורים בדרך — תופרת, דואר, אישור מחלה... מופיעים בראש רשימת הקניות, ויאמי מנהלת אותם ("סידור: לעבור בדואר") · 📷 סריקת ברקוד עובדת בכל טלפון ומחשב · ⚡ יאמי עונה הרבה יותר מהר · 💬 הצ\'אט לא זז יותר לצדדים · 🔔 הפעמון שקט — בלי נקודה קבועה ובלי התראות שחוזרות.']);
/* הודעת פתיחה חד־פעמית בפעמון: האתר בגוגל */
setTimeout(()=>{try{if(state.user)notify('google-live-2026','deal','🎉 '+T('האתר מופיע בגוגל!','We are on Google!'),T('מחפשים בגוגל "ים שופינג" או yamshopping — ומגיעים ישר לכאן: www.yamshopping.com. אפשר לשתף עם המשפחה והחברים 💚','Search Google for "yamshopping" — www.yamshopping.com'),'');}catch(e){}},5000);

/* ---------- 📌 סידורים בדרך — מה עוד צריך לעשות כשיוצאים לקניות ---------- */
/* כל סידור: {id,t,place,due,done,ts,by,del} — נשמר עם הרשימות ומסונכרן לכל המשפחה */
if(!SYNC_KEYS.includes('errands'))SYNC_KEYS.push('errands');
state.errands=Array.isArray(state.errands)?state.errands:[];
const ERR_IDEAS=[['🧵','לעבור אצל התופרת','Pick up from the tailor'],['📄','לשלוח אישור מחלה','Send a sick note'],['📮','דואר — לאסוף חבילה','Post office pickup'],['💊','בית מרקחת','Pharmacy'],['🏦','בנק / כספומט','Bank / ATM'],['👞','סנדלר','Cobbler'],['🧺','ניקוי יבש','Dry cleaning'],['🔑','לשכפל מפתח','Copy a key']];
function errOpen(){return (state.errands||[]).filter(x=>!x.del&&!x.done);}
function errDone(){return (state.errands||[]).filter(x=>!x.del&&x.done).sort((a,b)=>(b.ts||0)-(a.ts||0));}
/* סדר הסידורים: מי שגררו קובע (o); בלי זה — לפי התאריך. דחיפות (pr): 1 ירוק, 2 כתום, 3 אדום */
const errO=e=>{const v=Number(e&&e.o);return e&&e.o!=null&&isFinite(v)?v:null;};
const errPr=e=>{const v=Number(e&&e.pr);return v===1||v===2||v===3?v:0;};
function errSorted(arr){const lg=(arr||[]).slice().sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));const ix=new Map(lg.map((e,i)=>[e,i]));
  return lg.sort((a,b)=>{const x=errO(a),y=errO(b);if(x!=null&&y!=null)return x-y||ix.get(a)-ix.get(b);if(x!=null)return -1;if(y!=null)return 1;return ix.get(a)-ix.get(b);});}
function errClean(){const old=Date.now()-30*DAY_MS;state.errands=(state.errands||[]).filter(x=>!((x.del||x.done)&&(x.ts||0)<old)).slice(-200);}
function errAdd(t,place,due){t=String(t||'').replace(/\s+/g,' ').trim().slice(0,120);if(!t||hasProfanity(t))return null;
  const ex=errOpen().find(x=>norm(x.t)===norm(t));if(ex)return ex;
  const e={id:uid(),t,place:String(place||'').trim().slice(0,80),due:/^\d{4}-\d{2}-\d{2}$/.test(due||'')?due:'',done:false,ts:Date.now(),by:(state.user&&state.user.name)||''};
  const os=errOpen().map(errO).filter(v=>v!=null);if(os.length)e.o=Math.max.apply(null,os)+1;
  state.errands.push(e);errClean();save();render();return e;}
function errSet(id,patch){const e=(state.errands||[]).find(x=>x.id===id);if(!e)return;Object.assign(e,patch,{ts:Date.now()});save();render();}
function errFind(q){const n=norm(q).replace(/^(את|ה)\s*/,'');if(!n)return null;const o=errOpen();
  return o.find(x=>norm(x.t)===n)||o.find(x=>norm(x.t).includes(n))||o.find(x=>n.includes(norm(x.t)))||o.find(x=>n.split(' ').filter(w=>w.length>2).some(w=>norm(x.t).includes(w)))||null;}
function errDueText(d){if(!d)return '';const t=new Date(d+'T12:00:00'),now=new Date();now.setHours(12,0,0,0);const days=Math.round((t-now)/DAY_MS);
  return days<0?T('⚠️ עבר הזמן','⚠️ overdue'):days===0?T('היום','today'):days===1?T('מחר','tomorrow'):t.toLocaleDateString(prefs.lang==='en'?'en-GB':'he-IL',{weekday:'short',day:'numeric',month:'numeric'});}
function errIcon(t){const n=norm(t);const hit=ERR_IDEAS.find(i=>n.includes(norm(i[1]).split(' ').pop())||n.includes(norm(i[1]).split(' ')[0]));return hit?hit[0]:'📌';}
function errRow(e,compact){
  const pr=errPr(e),PRN=[T('בלי סימון דחיפות','No urgency'),T('לא דחוף (ירוק)','Not urgent (green)'),T('דחוף (כתום)','Urgent (orange)'),T('דחוף מאוד (אדום)','Very urgent (red)')];
  return '<div class="err17'+(e.done?' done':'')+'" data-eid="'+esc(e.id)+'">'+
    (!compact&&!e.done?'<button type="button" class="edrag17" data-edrag="'+esc(e.id)+'" title="'+T('גררו כדי לשנות את הסדר','Drag to reorder')+'" aria-label="'+esc(T('הזזת '+e.t+' (חצים למעלה ולמטה)','Move '+e.t+' (arrow keys)'))+'">⋮</button>':'')+
    (!e.done?'<button type="button" class="epr17 p'+pr+'" data-epr="'+esc(e.id)+'" title="'+esc(PRN[pr])+' — '+T('לחיצה לשינוי','tap to change')+'" aria-label="'+esc(T('דחיפות: ','Urgency: ')+PRN[pr]+' — '+T('לחיצה לשינוי','tap to change'))+'"></button>':(pr?'<span class="epr17 p'+pr+'" aria-hidden="true"></span>':''))+
    '<button class="ck17" data-edone="'+esc(e.id)+'" aria-label="'+(e.done?T('להחזיר','Undo'):T('בוצע','Done'))+'">'+(e.done?'✓':'')+'</button>'+
    '<span class="et17"><b>'+esc(e.t)+'</b>'+((e.place||e.due)&&!compact?'<small>'+(e.place?'📍 '+esc(e.place):'')+(e.place&&e.due?' · ':'')+(e.due?'🗓️ '+esc(errDueText(e.due)):'')+'</small>':'')+(compact&&e.due?' <small class="due17">'+esc(errDueText(e.due))+'</small>':'')+'</span>'+
    (e.place&&!e.done?'<button class="mini" data-ewaze="'+esc(e.id)+'" aria-label="'+T('ניווט','Navigate')+'">🧭</button>':'')+
    (compact?'':'<button class="mini" data-edel="'+esc(e.id)+'" aria-label="'+T('מחיקה','Delete')+'">✕</button>')+'</div>';}
/* פס קטן בראש הרשימה — מופיע רק כשיש סידורים פתוחים */
function errStrip(){const o=errOpen();if(!o.length)return '';
  const top=errSorted(o).slice(0,3);
  return '<div class="errstrip17" role="region" aria-label="'+T('סידורים בדרך','Errands on the way')+'"><div class="eh17"><b>📌 '+T('סידורים בדרך','Errands on the way')+' ('+o.length+')</b><button class="lnk17" data-eopen="1">'+(o.length>3?T('הכל ←','All ←'):T('ניהול ←','Manage ←'))+'</button></div>'+top.map(e=>errRow(e,true)).join('')+'</div>';}
function errChip(){const n=errOpen().length;return '<button class="chip errchip17'+(n?' has':'')+'" data-eopen="1" title="'+T('סידורים ותזכורות לדרך','Errands & reminders')+'">📌 '+T('סידורים','Errands')+(n?' <span class="n17">'+n+'</span>':'')+'</button>';}
const _v17RenderList=renderList;
renderList=function(){const r=_v17RenderList.apply(this,arguments);try{const p=$17('#paneList');const s=errStrip();if(s){const em=p.querySelector('.empty');if(em)em.insertAdjacentHTML('beforebegin',s);else{const bar=p.querySelector('.buybar');if(bar)bar.insertAdjacentHTML('afterend',s);else p.insertAdjacentHTML('afterbegin',s);}}}catch(e){}return r;};
const _v17Render=render;
render=function(){const r=_v17Render.apply(this,arguments);try{const c=$17('#chips');if(c&&!c.querySelector('.errchip17'))c.insertAdjacentHTML('beforeend',errChip());}catch(e){}return r;};
function openErrands(focus){
  const b=openSheet('📌 '+T('סידורים ותזכורות לדרך','Errands & reminders'),'');
  const draw=()=>{const o=errSorted(errOpen()),d=errDone();
    b.innerHTML='<p class="muted-note">'+T('מה עוד צריך לעשות כשיוצאים לקניות — תופרת, דואר, אישור מחלה... מופיע בראש הרשימה, ואפשר גם לכתוב ליאמי "סידור: לעבור בדואר".','Things to do on the way — shown at the top of your list. You can also tell Yami "errand: post office".')+'</p>'+
      '<div class="row2"><input id="er17t" maxlength="120" placeholder="'+T('מה צריך לעשות? למשל: לאסוף מהתופרת','What to do? e.g. pick up from the tailor')+'"><button id="er17add" style="flex:0 0 auto">➕</button></div>'+
      '<details class="er17more"><summary>📍 '+T('איפה ומתי (לא חובה)','Where & when (optional)')+'</summary><div class="grid2"><div><label class="il" for="er17p">📍 '+T('איפה','Where')+'</label><input id="er17p" maxlength="80" placeholder="'+T('כתובת או שם המקום','Address or place')+'"></div><div><label class="il" for="er17d">🗓️ '+T('עד מתי','By when')+'</label><input id="er17d" type="date"></div></div></details>'+
      '<div class="ideas17">'+ERR_IDEAS.map(i=>'<button class="chip" data-eidea="'+esc(T(i[1],i[2]))+'">'+i[0]+' '+esc(T(i[1],i[2]))+'</button>').join('')+'</div>'+
      (o.length?'<h4>'+T('לעשות','To do')+' ('+o.length+')</h4>'+(o.length>1?'<p class="muted-note er17tip">⋮ '+T('גוררים כדי לשנות את הסדר · העיגול = כמה דחוף (לחיצה: ירוק → כתום → אדום)','Drag to reorder · the dot = urgency (tap: green → orange → red)')+'</p>':'')+'<div class="er17list">'+o.map(e=>errRow(e,false)).join('')+'</div>':'<div class="empty" style="padding:14px 0">'+T('אין סידורים פתוחים 🙂','No open errands 🙂')+'</div>')+
      (d.length?'<details class="er17done"><summary>✓ '+T('בוצעו','Done')+' ('+d.length+')</summary>'+d.slice(0,20).map(e=>errRow(e,false)).join('')+'<button class="mini" data-eclear="1" style="margin-top:6px">🗑️ '+T('ניקוי מה שבוצע','Clear done')+'</button></details>':'');
  };
  draw();if(focus!==false)setTimeout(()=>{const i=$17('#er17t');if(i&&!TOUCH_KB)i.focus();},80);
  const add=()=>{const t=$17('#er17t').value.trim();if(!t)return;if(hasProfanity(t)){flash('🙏');return;}
    const e=errAdd(t,$17('#er17p').value,$17('#er17d').value);if(e){flash('📌 '+T('נוסף לסידורים','Added'));draw();}};
  b.onclick=e=>{
    if(e.target.closest('#er17add')){add();return;}
    const idea=e.target.closest('[data-eidea]');if(idea){$17('#er17t').value=idea.dataset.eidea;$17('#er17t').focus();return;}
    const dn=e.target.closest('[data-edone]');if(dn){const x=state.errands.find(y=>y.id===dn.dataset.edone);if(x){errSet(x.id,{done:!x.done});if(x.done)flash('✓ '+T('כל הכבוד!','Nice!'));}draw();return;}
    const dl=e.target.closest('[data-edel]');if(dl){errSet(dl.dataset.edel,{del:true});draw();return;}
    const wz=e.target.closest('[data-ewaze]');if(wz){const x=state.errands.find(y=>y.id===wz.dataset.ewaze);if(x&&x.place)openWaze(x.place);return;}
    if(e.target.closest('[data-eclear]')){errDone().forEach(x=>{x.del=true;x.ts=Date.now();});save();render();draw();}};
  b.onkeydown=e=>{if(e.target.id==='er17t'&&e.key==='Enter'&&!e.isComposing){e.preventDefault();add();}};
}
document.addEventListener('click',e=>{
  const op=e.target.closest('[data-eopen]');if(op){e.stopPropagation();openErrands();return;}
  const strip=e.target.closest('.errstrip17');if(!strip)return;
  const dn=e.target.closest('[data-edone]');if(dn){const x=state.errands.find(y=>y.id===dn.dataset.edone);if(x){errSet(x.id,{done:true});flash('✓ '+T('בוצע: ','Done: ')+x.t);}return;}
  const wz=e.target.closest('[data-ewaze]');if(wz){const x=state.errands.find(y=>y.id===wz.dataset.ewaze);if(x&&x.place)openWaze(x.place);return;}
  if(e.target.closest('.et17'))openErrands(false);
},true);
/* בתפריט ⚙️ */
(function(){const a=$17('#miFinish');if(!a||$17('#miErr17'))return;a.insertAdjacentHTML('afterend','<button id="miErr17">📌<span>'+T('סידורים ותזכורות לדרך','Errands & reminders')+'</span></button>');$17('#miErr17').onclick=()=>{$17('#hMenu').classList.remove('open');openErrands();};})();
/* סנכרון משפחתי */
const _v17ApplyRemote=applyRemote;
applyRemote=function(remote,replace){_v17ApplyRemote(remote,replace);if(!remote||!Array.isArray(remote.errands))return;
  if(replace){state.errands=remote.errands;return;}
  const m={};(state.errands||[]).forEach(x=>m[x.id]=x);remote.errands.forEach(x=>{if(x&&x.id&&(!m[x.id]||(x.ts||0)>=(m[x.id].ts||0)))m[x.id]=x;});state.errands=Object.values(m);};
const _v17Logout=doLogout;doLogout=async function(){const r=await _v17Logout.apply(this,arguments);state.errands=[];return r;};
/* בשיתוף ובהדפסה של הרשימה */
const _v17ShareText=shareText;
shareText=function(){const s=_v17ShareText.apply(this,arguments);const o=errSorted(errOpen());if(!o.length)return s;
  const add='\n📌 '+T('סידורים בדרך:','Errands:')+'\n'+o.map(e=>'☐ '+e.t+(e.place?' ('+e.place+')':'')).join('\n')+'\n';
  const i=s.lastIndexOf('\n— ');return i>0?s.slice(0,i)+add+s.slice(i):s+add;};
/* בסיום קנייה — לא לשכוח את הסידורים */
const _v17Finish=finishList;
finishList=function(){const r=_v17Finish.apply(this,arguments);try{const o=errOpen();if(o.length)setTimeout(()=>flash('📌 '+T('לא לשכוח: ','Don\'t forget: ')+o.slice(0,2).map(e=>e.t).join(', ')+(o.length>2?' +'+(o.length-2):'')),1600);}catch(e){}return r;};

/* ---------- יאמי מנהלת את הסידורים ---------- */
async function v17BotPre(raw){const t=norm(raw);let m;
  if(/^(?:מה\s+)?(?:ה)?(?:סידורים|תזכורות|פתקים)(?:\s+שלי)?\??$/.test(t)||/^(?:my\s+)?errands\??$/i.test(t)||/^(מה עוד צריך לעשות|מה נשאר לעשות|מה יש לי לעשות|על מה לא לשכוח)\??$/.test(t)){
    const o=errSorted(errOpen());botSay(o.length?('📌 '+T('הסידורים שלך:','Your errands:')+'\n'+o.map((e,i)=>(i+1)+'. '+['','🟢 ','🟠 ','🔴 '][errPr(e)]+e.t+(e.place?' 📍 '+e.place:'')+(e.due?' · '+errDueText(e.due):'')).join('\n')+'\n\n'+T('סיימת משהו? כתבו "עשיתי '+o[0].t+'"','Done? Write "done '+o[0].t+'"')):T('אין סידורים פתוחים 🙂 להוספה: "סידור: לעבור אצל התופרת"','No open errands 🙂 Add one: "errand: tailor"'));return true;}
  if((m=raw.trim().match(/^(?:תוסיפי|תוסיף|הוסיפי|הוסף|להוסיף|תרשמי|רשמי)?\s*(?:סידור|תזכורת|פתק)\s*(?:חדש|חדשה)?\s*[:：\-]\s*(.+)$/))||(m=raw.trim().match(/^(?:תוסיפי|תוסיף|הוסיפי|הוסף|להוסיף|תרשמי|רשמי)\s+(?:סידור|תזכורת|פתק)\s+(.+)$/))||(m=raw.trim().match(/^(?:תזכירי|תזכיר|להזכיר)\s+לי\s+(.+)$/))||(m=raw.trim().match(/^(?:errand|reminder)\s*[:：]\s*(.+)$/i))){
    const parts=m[1].split(/\s*(?:,|،|\n|\s+וגם\s+)\s*/).map(s=>s.replace(/[.!]+$/,'').trim()).filter(Boolean).slice(0,10);
    const added=parts.map(p=>errAdd(p)).filter(Boolean);
    if(!added.length)return false;
    botSay('📌 '+T('רשמתי בסידורים:','Added to errands:')+'\n'+added.map(e=>'• '+e.t).join('\n')+'\n\n'+T('זה יופיע בראש רשימת הקניות, כדי שלא תשכחו בדרך 🙂','It shows at the top of your shopping list 🙂'));return true;}
  if((m=t.match(/^(?:עשיתי|סיימתי|בוצע|גמרתי|סגרתי)\s+(?:את\s+)?(?:ה)?(?:סידור\s+)?(.+)$/))){const e=errFind(m[1]);if(e){errSet(e.id,{done:true});const left=errOpen().length;botSay('✓ '+T('מעולה! סימנתי "'+e.t+'" כבוצע.','Great! Marked "'+e.t+'" done.')+(left?'\n'+T('נשארו עוד '+left+' סידורים.',left+' left.'):'\n🎉 '+T('כל הסידורים בוצעו!','All errands done!')));return true;}}
  if((m=t.match(/^(?:מחקי|תמחקי|מחק|תמחק|הסירי|תורידי)\s+(?:את\s+)?(?:ה)?(?:סידור|תזכורת|פתק)\s+(.+)$/))){const e=errFind(m[1]);if(e){errSet(e.id,{del:true});botSay('🗑️ '+T('מחקתי את "'+e.t+'"','Deleted "'+e.t+'"'));return true;}}
  if(/^(?:פתחי|תפתחי|פתח|תפתח)\s+(?:את\s+)?(?:ה)?(?:סידורים|תזכורות|פתקים)$/.test(t)){openErrands();botSay('📌 '+T('פתחתי את הסידורים','Opened your errands'));return true;}
  return false;}
yamiStep(v17BotPre);
/* הבינה המלאכותית יודעת על הסידורים ויכולה להוסיף/לסמן */
const _v17AiContext=aiContext;
aiContext=function(){const o=errOpen();return _v17AiContext.apply(this,arguments)+'\nסידורים פתוחים (דברים לעשות בדרך לקניות): '+(o.map(e=>e.t+(e.place?' @'+e.place:'')+(e.due?' עד '+e.due:'')).join(', ')||'אין');};
const _v17DoAction=doAction;
doAction=function(a){try{if(a&&(a.type==='add_errands'||a.type==='done_errands')){const its=(a.items||[]).map(i=>String(i&&i.name||'').trim()).filter(Boolean);
  if(a.type==='add_errands')its.forEach(n=>errAdd(n));else its.forEach(n=>{const e=errFind(n);if(e)errSet(e.id,{done:true});});return;}}catch(e){}return _v17DoAction.apply(this,arguments);};
/* "מה אפשר לעשות" של יאמי */
try{if(typeof HOWTO16!=='undefined')HOWTO16.unshift([/(איך|אפשר).*(סידור|סידורים|תזכורת|פתק)/,'📌 '+T('סידורים בדרך: כותבים לי "סידור: לעבור אצל התופרת" (או כמה ביחד עם פסיקים), "הסידורים שלי" לרשימה, ו"עשיתי תופרת" כשסיימתם. הם מופיעים בראש רשימת הקניות ובכפתור 📌 למעלה.','Errands: "errand: tailor", "my errands", "done tailor".')]);}catch(e){}
try{render();}catch(e){}
