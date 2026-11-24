/* ================= תיקוני אבטחה ויציבות (אחרונים — עוטפים את הגרסאות הקודמות) ================= */
/* סנכרון: מנקים קודם את כל מה שהגיע, ואם משהו נכשל באמצע — מחזירים את המצב הקודם במקום להשאיר חצי עדכון */
(function(){const _inner=applyRemote;
  applyRemote=function(remote,replace){
    if(!remote||typeof remote!=='object'||Array.isArray(remote))return;
    try{cleanRoom(remote);}catch(e){console.warn('remote clean failed',e);return;}
    /* ברשימה משותפת של מישהו אחר — האזור האישי שלי לא מתעדכן ממנה */
    if(state.follow&&'me' in remote){remote=Object.assign({},remote);delete remote.me;}
    let snap=null;try{const o={active:state.active};SYNC_KEYS.forEach(k=>o[k]=state[k]);snap=typeof structuredClone==='function'?structuredClone(o):JSON.parse(JSON.stringify(o));}catch(e){}
    try{return _inner.call(this,remote,replace);}
    catch(e){console.warn('applyRemote failed — state restored',e);if(snap)Object.keys(snap).forEach(k=>{state[k]=snap[k];});}};
})();
/* יציאה: כל השרשרת רצה פעם אחת, ובסוף שומרים את המצב הנקי במכשיר */
(function(){const _inner=doLogout;doLogout=async function(){const r=await _inner.apply(this,arguments);try{save(true);}catch(e){}return r;};})();
