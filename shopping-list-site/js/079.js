
/* ================= 💾 כמו אפליקציה רגילה: הכל נשמר במכשיר, ומסתנכרן כשיש אינטרנט =================
   הרשימות, הבית שלי, התזכורות וההגדרות כבר נשמרים במכשיר (localStorage / IndexedDB) ונשלחים לענן כשחוזר החיבור (offSync).
   כאן נוספים:
   1. השיחות עם יאמי — נשמרות במכשיר וגם בחשבון (טבלה user_sync, רק המשתמש עצמו קורא וכותב), כך שלא נעלמות
      בהתקנה מחדש או במכשיר חדש. הן לא עוברות לרשימה המשותפת עם המשפחה.
      מיזוג: לכל שיחה מזהה קבוע; הודעות משני המכשירים מתאחדות לפי הזמן; שיחה שנמחקה ("מצבה") לא חוזרת 30 יום.
   2. ביציאה מהחשבון: שולחים קודם מה שעוד לא נשלח (ואם אין אינטרנט — שואלים), ואז מוחקים מהמכשיר גם את הנתונים
      האישיים השמורים ב-IndexedDB — כדי שבמחשב משותף הבא בתור לא יראה כלום.
   אם הטבלה עוד לא נוצרה בשרת — הכל ממשיך לעבוד כמו קודם, רק בלי סנכרון השיחות. */
(function(){
  const DIRTY='yam_ps_dirty',MAXC=30,MAXM=150,MAXB=900000,TOMB_MS=30*864e5;
  let off=false,busy=false,again=false,timer=null,lastPull=0,sigNow='';
  const has=()=>!!(sb&&authUser&&!off);
  const curId=()=>{if(!state.botId||!/^[\w-]{1,40}$/.test(state.botId))state.botId=uid();return state.botId;};
  const dirty=v=>{try{v?localStorage.setItem(DIRTY,'1'):localStorage.removeItem(DIRTY);}catch(e){}};
  const isDirty=()=>{try{return !!localStorage.getItem(DIRTY);}catch(e){return false;}};
  const hasMe=msgs=>(msgs||[]).some(m=>m&&m.who==='me');
  /* מה שמגיע מהשרת — רק השדות שאנחנו מכירים, באורך מוגבל */
  function cleanMsg(m){if(!m||typeof m!=='object'||(m.who!=='me'&&m.who!=='bot')||typeof m.txt!=='string')return null;
    const ts=Number(m.ts);if(!isFinite(ts)||ts<=0)return null;const o={who:m.who,txt:m.txt.slice(0,6000),ts:Math.min(ts,Date.now()+864e5)};return o;}
  function cleanChat(c){if(!c||typeof c!=='object'||typeof c.id!=='string'||!/^[\w-]{1,40}$/.test(c.id)||!Array.isArray(c.msgs))return null;
    const msgs=c.msgs.slice(-MAXM).map(cleanMsg).filter(Boolean);if(!hasMe(msgs))return null;return mk(c.id,msgs);}
  function cleanTomb(t){const o={},lim=Date.now()-TOMB_MS;if(t&&typeof t==='object')Object.keys(t).slice(0,500).forEach(k=>{const v=Number(t[k]);if(/^[\w-]{1,40}$/.test(k)&&isFinite(v)&&v>=lim)o[k]=v;});return o;}
  const mk=(id,msgs)=>({id,title:chatTitle(msgs),ts:(msgs[msgs.length-1]||{}).ts||Date.now(),msgs});
  const key=m=>m.ts+'|'+m.who+'|'+m.txt.length+'|'+m.txt.slice(0,40);
  function mergeMsgs(a,b){const map=new Map();(a||[]).forEach(m=>{if(m&&typeof m.txt==='string')map.set(key(m),m);});(b||[]).forEach(m=>{const k=key(m);if(!map.has(k))map.set(k,m);});
    return [...map.values()].sort((x,y)=>(x.ts||0)-(y.ts||0)).slice(-MAXM);}
  /* כל השיחות של המכשיר הזה: השמורות + הפתוחה עכשיו */
  function localChats(){const out=(state.botChats||[]).filter(c=>c&&c.id&&Array.isArray(c.msgs)).map(c=>mk(c.id,c.msgs));
    if(hasMe(state.bot)){const id=curId();const i=out.findIndex(c=>c.id===id);const c=mk(id,state.bot);if(i>=0)out[i]=mk(id,mergeMsgs(state.bot,out[i].msgs));else out.push(c);}
    return out;}
  function payload(){const tomb=cleanTomb(state.chatTomb);let chats=localChats().filter(c=>!(tomb[c.id]>=c.ts)).sort((a,b)=>b.ts-a.ts).slice(0,MAXC+1)
      .map(c=>({id:c.id,ts:c.ts,msgs:c.msgs.map(m=>{const o={who:m.who,txt:String(m.txt).slice(0,6000),ts:m.ts};return o;})}));
    let p={v:1,cur:curId(),chats,tomb};while(chats.length>1&&JSON.stringify(p).length>MAXB){chats.pop();p.chats=chats;}return p;}
  const sigOf=p=>(p.chats||[]).map(c=>c.id+':'+c.ts+':'+(c.msgs||[]).length).sort().join(',')+'#'+Object.keys(p.tomb||{}).sort().join(',');
  const localSig=()=>{const b=state.bot||[],l=b[b.length-1];return [state.botId,b.length,l&&l.ts,(state.botChats||[]).map(c=>c.id+':'+(c.msgs||[]).length).join(','),Object.keys(state.chatTomb||{}).length].join('|');};
  /* ממזגים את מה שבחשבון לתוך המכשיר. initial = הפעם הראשונה אחרי כניסה: במכשיר חדש (בלי שיחה) — ממשיכים את השיחה האחרונה */
  function mergeIn(remote,initial){
    const rChats=(Array.isArray(remote.chats)?remote.chats:[]).slice(0,MAXC+5).map(cleanChat).filter(Boolean);
    const tomb=cleanTomb(state.chatTomb),rt=cleanTomb(remote.tomb);Object.keys(rt).forEach(k=>{if(!(tomb[k]>=rt[k]))tomb[k]=rt[k];});
    const map=new Map();localChats().forEach(c=>map.set(c.id,c));
    rChats.forEach(rc=>{const lc=map.get(rc.id);map.set(rc.id,lc?mk(rc.id,mergeMsgs(lc.msgs,rc.msgs)):rc);});
    for(const [id,c] of [...map])if(tomb[id]>=c.ts)map.delete(id);
    let cur=curId();
    const rcur=typeof remote.cur==='string'?remote.cur:'';
    if(initial&&!hasMe(state.bot)&&rcur&&map.has(rcur))cur=rcur;
    const cc=map.get(cur);
    /* לא מחליפים את השיחה הפתוחה באמצע תשובה של יאמי */
    if(cc&&!window.botTyping&&(cur!==state.botId||cc.msgs.length!==(state.bot||[]).length))state.bot=cc.msgs;
    state.botId=cur;
    state.botChats=[...map.values()].filter(c=>c.id!==cur).sort((a,b)=>b.ts-a.ts).slice(0,MAXC);
    state.chatTomb=tomb;}
  async function sync(initial){
    if(!has())return false;if(isOffline()){return false;}
    if(busy){again=true;return false;}busy=true;const me=authUser.id;
    try{
      const {data:row,error}=await sb.from('user_sync').select('data').eq('user_id',me).maybeSingle();
      if(error){if(/user_sync|PGRST205|42P01|does not exist|schema cache/i.test((error.code||'')+' '+(error.message||'')))off=true;return false;}
      if(!authUser||authUser.id!==me)return false; /* בינתיים יצאו מהחשבון */
      const remote=row&&row.data&&typeof row.data==='object'?row.data:null;
      lastPull=Date.now();
      if(remote){const before=localSig();mergeIn(remote,initial);if(localSig()!==before){_localSave();try{renderBot();}catch(e){}}}
      sigNow=localSig();
      const p=payload();
      if(!remote||sigOf(p)!==sigOf({chats:(remote.chats||[]).map(cleanChat).filter(Boolean),tomb:cleanTomb(remote.tomb)})||remote.cur!==p.cur){
        if(!p.chats.length&&!remote&&!Object.keys(p.tomb).length){dirty(false);return true;}
        const {error:we}=await sb.from('user_sync').upsert({user_id:me,data:p,updated_by:String(MID||''),updated_at:new Date().toISOString()});
        if(we)return false;}
      dirty(false);return true;
    }catch(e){return false;}
    finally{busy=false;if(again){again=false;clearTimeout(timer);timer=setTimeout(()=>sync(false),1500);}}
  }
  window.yamChatSync=sync;
  /* כל שמירה: אם השיחות השתנו — שולחים לחשבון אחרי רגע (ובלי אינטרנט — מסמנים, ונשלח כשיחזור) */
  const _save=save;save=function(){const r=_save.apply(this,arguments);try{if(authUser&&!off){const s=localSig();if(s!==sigNow){sigNow=s;dirty(true);clearTimeout(timer);timer=setTimeout(()=>sync(false),2500);}}}catch(e){}return r;};
  const _signed=onSignedIn;onSignedIn=async function(){const r=await _signed.apply(this,arguments);setTimeout(()=>sync(true),1200);return r;};
  if(typeof authUser!=='undefined'&&authUser)setTimeout(()=>sync(true),1200);
  window.addEventListener('online',()=>setTimeout(()=>sync(false),1500));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(isDirty()||Date.now()-lastPull>60000))sync(false);});
  /* מוחקים מ-IndexedDB את מה שנשמר לחשבון מסוים (מוצרים אישיים וכו'); נתונים ציבוריים (key|-) נשארים */
  async function clearUserCache(){try{const db=await dcDb();if(!db)return;await new Promise(res=>{try{const tx=db.transaction('kv','readwrite'),st=tx.objectStore('kv'),q=st.getAllKeys();
    q.onsuccess=()=>{(q.result||[]).forEach(k=>{if(typeof k==='string'&&!/\|-$/.test(k))st.delete(k);});};tx.oncomplete=tx.onerror=tx.onabort=()=>res();}catch(e){res();}});}catch(e){}
    try{Object.keys(DC.boot).forEach(k=>{if(!/\|-$/.test(k))delete DC.boot[k];});}catch(e){}}
  /* לפני יציאה: בלי אינטרנט ועם שינויים שלא נשמרו — שואלים; עם אינטרנט — שולחים לחשבון (עד 3 שניות) */
  onLogout('guard',async()=>{
    if(!authUser)return;
    const unsent=(typeof offPending!=='undefined'&&offPending)||isDirty();
    if(isOffline()&&unsent)return !!(await uiConfirm(T('אין עכשיו אינטרנט, ויש שינויים שעוד לא נשמרו בחשבון. אם תצאו עכשיו הם יימחקו מהמכשיר הזה. לצאת בכל זאת?','You are offline and some changes are not saved to your account yet. If you sign out now they will be removed from this device. Sign out anyway?')));
    if(!isOffline()){clearTimeout(timer);try{await Promise.race([sync(false),new Promise(r=>setTimeout(r,3000))]);}catch(e){}}});
  onLogout('before',()=>clearTimeout(timer));
  onLogout('after',async()=>{
    dirty(false);sigNow='';lastPull=0;
    try{localStorage.removeItem('yam_off_pending');offPending=0;offBar();}catch(e){}
    await clearUserCache();});
})();
