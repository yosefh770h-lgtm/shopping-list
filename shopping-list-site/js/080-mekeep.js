
/* 🛟 הפרופיל ו"החנויות שלי" לא הולכים לאיבוד ברענון או בעדכון.
   1) כשהמקום בדפדפן מלא, השמירה הגדולה של האתר נכשלת בשקט, ואחרי רענון חוזרים הנתונים הישנים (פרופיל 0%, בלי חנויות).
      לכן שומרים גם עותק קטן ונפרד (yam_me_keep_v1) של האזור האישי ושל החנויות שבחרו. עותק קטן נשמר גם כשהמקום כמעט נגמר,
      ובטעינה, אם הוא חדש יותר מהשמירה הגדולה, מחזירים ממנו.
   2) אם גם השמירה המקוצרת נכשלה, מנסים שמירה מקוצרת עוד יותר (בלי שיחות ישנות ובלי מטמונים שאפשר לבנות מחדש).
   3) הפרופיל (עיר, נפשות, איפה קונים, אלרגיות) והחנויות שבחרו נשמרים גם בחשבון (profiles.settings), כך שהם חוזרים
      גם למי שמחובר לבית משותף (שם האזור האישי לא נשמר ברשימה המשותפת), ובכל מכשיר. עד שמריצים את ה-SQL של settings
      זה פשוט לא נשלח, והעותק במכשיר ממשיך לשמור. */
(function(){
  const K='yam_me_keep_v1';
  const uidNow=()=>(state&&state.user&&state.user.id)||'';
  const lite=me=>{if(!me||typeof me!=='object')return null;const o={ts:+me.ts||0};
    if(me.city)o.city=me.city;if(me.profile&&typeof me.profile==='object'&&Object.keys(me.profile).length)o.profile=me.profile;
    if(Array.isArray(me.allergies))o.allergies=me.allergies;if(Array.isArray(me.stores)&&me.stores.length)o.stores=me.stores;
    return Object.keys(o).length>1&&JSON.stringify(o).length<3500?o:null;};
  /* מה שהגיע מהחשבון חדש יותר מהאזור האישי במכשיר — ממזגים אליו */
  function fromLite(){const l=state&&state.meLite;if(!l||typeof l!=='object')return;const me=meData();if((+l.ts||0)<=(+me.ts||0))return;
    ['city','profile','allergies','stores'].forEach(k=>{if(l[k]!==undefined)me[k]=l[k];});me.ts=+l.ts;
    if(!state.follow&&typeof knownCity==='function'&&knownCity(me.city))state.city=knownCity(me.city);}
  function keep(at){try{const u=uidNow();if(!u)return;
    localStorage.setItem(K,JSON.stringify({uid:u,at,me:state.me||null,srvPicks:Array.isArray(state.srvPicks)?state.srvPicks:[]}));}catch(e){}}
  function harder(){try{const o=Object.assign({},state,{botChats:(state.botChats||[]).slice(0,2).map(c=>Object.assign({},c,{msgs:(c.msgs||[]).slice(-10)})),
      bot:(state.bot||[]).slice(-20),history:(state.history||[]).slice(0,30),basketSnaps:[],lastOffers:{},savings:(state.savings||[]).slice(0,30)});
    localStorage.setItem(KEY,JSON.stringify(o));return true;}catch(e){return false;}}
  /* בטעינה: השמירה הגדולה ישנה יותר מהעותק הקטן — מחזירים את הפרופיל והחנויות */
  try{const k=JSON.parse(localStorage.getItem(K)||'null');
    if(k&&k.uid&&k.uid===uidNow()&&(+k.at||0)>(+state.keepAt||0)){
      if(k.me&&typeof k.me==='object'&&(+k.me.ts||0)>=(+(state.me&&state.me.ts)||0))state.me=Object.assign({address:{},stores:[],orders:[],providers:[]},k.me);
      if(Array.isArray(k.srvPicks))state.srvPicks=k.srvPicks;
      state.keepAt=+k.at;console.info('profile/stores restored from small device copy');}}catch(e){}
  fromLite();
  const _keepSave=save;save=function(){let at=0;
    try{fromLite();const l=lite(state.me);if(l)state.meLite=l;at=Date.now();state.keepAt=at;}catch(e){}
    const r=_keepSave.apply(this,arguments);
    /* גם השמירה המקוצרת לא נכנסה — מקצרים עוד */
    if(at){keep(at);if(lsTight){let ok=false;try{ok=(localStorage.getItem(KEY)||'').indexOf('"keepAt":'+at)>=0;}catch(e){}if(!ok)harder();}}
    return r;};
})();
/* תמונות העסקים בכרטיסי החנויות */
(function(){if(typeof renderStores!=='function')return;const _r=renderStores;renderStores=function(){const r=_r.apply(this,arguments);try{loadChainLogos();}catch(e){}return r;};})();
