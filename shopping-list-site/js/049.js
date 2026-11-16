
/* ================= 🔒 השוואת מחירים מהשרת: מי שלא מחובר מקבל 3 חיפושים לניסיון, ואז הרשמה ================= */
(function(){
const SRV_FREE=3,KEY='yam_srv_tries';
function tries(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function srvLocked(){return !authUser&&!(typeof isAdmin==='function'&&isAdmin());}
function srvSignup(){const b=openSheet('💰 '+T('איפה הכי זול','Where is it cheapest'),'<div class="v26card" style="text-align:center"><div style="font-size:42px">💰</div><p style="font-size:18px;margin:6px 0"><b>'+T('נגמרו '+SRV_FREE+' החיפושים לניסיון','Your '+SRV_FREE+' free searches are used up')+'</b></p>'+
  '<p class="muted-note">'+T('כדי להמשיך להשוות מחירים בכל הסניפים — נרשמים בחינם, בחצי דקה. מה שכבר עשית כאן עובר איתך לחשבון.','Sign up free to keep comparing prices.')+'</p>'+
  '<button id="srvSign" style="width:100%">'+T('הרשמה חינם','Sign up free')+'</button></div>');b.querySelector('#srvSign').onclick=()=>{if(typeof closeSheet==='function')closeSheet();showLogin();};}
window.srvTriesLeft=()=>srvLocked()?Math.max(0,SRV_FREE-tries().length):Infinity;
const _srvApi=priceApi;
priceApi=async function(path,params){
  if((path==='/compare'||path==='/prices')&&srvLocked()){
    const p=Object.assign({},params||{});delete p.limit;delete p.exclude;
    const k=path+'?'+Object.keys(p).sort().map(x=>x+'='+p[x]).join('&');const a=tries();
    if(!a.includes(k)){
      if(a.length>=SRV_FREE){srvSignup();throw new Error(T('נגמרו '+SRV_FREE+' החיפושים לניסיון. הרשמה חינם וממשיכים 🙂','Free searches used up. Sign up free to continue 🙂'));}
      a.push(k);try{localStorage.setItem(KEY,JSON.stringify(a.slice(-20)));}catch(e){}
      const left=SRV_FREE-a.length;setTimeout(()=>flash(left?'🔎 '+T('נשארו עוד '+left+' חיפושים לניסיון','Free searches left: '+left):'🔎 '+T('זה היה החיפוש האחרון לניסיון — אחר כך הרשמה חינם','That was your last free search')),300);}
  }
  return _srvApi.apply(this,arguments);};
/* הודעה מראש למי שלא מחובר: כמה חיפושים נשארו */
function triesNote(){const left=window.srvTriesLeft();if(left===Infinity)return '';
  return '<p class="muted-note srvtries">🎁 '+(left?T('יש לך '+SRV_FREE+' חיפושים לניסיון (נשארו '+left+'). אחר כך צריך להירשם לאתר — ההרשמה חינם.','You have '+SRV_FREE+' free searches ('+left+' left), then sign up free.'):T('נגמרו '+SRV_FREE+' החיפושים לניסיון. כדי להמשיך צריך להירשם לאתר — ההרשמה חינם.','Free searches used up. Sign up free to continue.'))+' <button type="button" class="mini pri" data-srvsign="1">'+T('הרשמה חינם','Sign up free')+'</button></p>';}
function addNote(box){if(!box||box.querySelector('.srvtries'))return;const h=triesNote();if(h)box.insertAdjacentHTML('afterbegin',h);}
const _srvMountT=srvBasketMount;
srvBasketMount=function(box){const r=_srvMountT.apply(this,arguments);try{const w=box.querySelector('#srvCmp');if(w){const h3=w.querySelector('h3');const h=triesNote();if(h&&h3&&!w.querySelector('.srvtries'))h3.insertAdjacentHTML('afterend',h);}}catch(e){}return r;};
const _srvRenderT=renderStores;
renderStores=function(){const r=_srvRenderT.apply(this,arguments);try{if(storesView==='cmp'){const rk=storesPane.querySelector('#cmpQ');addNote(rk&&rk.closest('.rank'));}}catch(e){}return r;};
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-srvsign]')){document.querySelectorAll('.overlay.open,#basketOverlay.open').forEach(o=>o.classList.remove('open'));showLogin();}});
})();
