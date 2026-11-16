
/* ================= 🏪 חיפוש לפי רשת: "רק אושר עד" — למוצר אחד ולכל הסל (השרת: /compare?chain=) ================= */
(function(){
let chainsP=null;
function chainList(){if(!chainsP)chainsP=priceApi('/chains').then(cs=>(Array.isArray(cs)?cs:[]).filter(c=>c&&c.chain&&c.name&&!srvHidden().includes(c.chain)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'he')),()=>{chainsP=null;return [];});return chainsP;}
function curChain(){return typeof state.srvChain==='string'?state.srvChain:'';}
function setChain(c){state.srvChain=c;save();}
function chainName(c){return (window.__chainNames||{})[c]||c;}
/* כל השוואה מהאתר (לפי עיר או קרוב אליי) — רק ברשת שנבחרה. יאמי והסניפים שלי לא מושפעים */
const _chainApi=priceApi;
priceApi=function(path,params){
  if(path==='/compare'&&params&&!params.stores&&!('chain' in params)&&curChain())params=Object.assign({},params,{chain:curChain()});
  return _chainApi.call(this,path,params);};
function selectHtml(id){const c=curChain();
  return '<div class="row18 chainrow"><label class="il" for="'+id+'">🏪 '+T('באיזו רשת לחפש?','Which chain?')+'</label><select id="'+id+'" class="chainsel" aria-label="'+T('רשת','Chain')+'"><option value="">'+T('כל הרשתות','All chains')+'</option>'+(c?'<option value="'+esc(c)+'" selected>'+esc(chainName(c))+'</option>':'')+'</select></div>';}
async function fillSelect(sel){if(!sel||sel.dataset.filled)return;sel.dataset.filled='1';const cs=await chainList();const map=window.__chainNames=window.__chainNames||{};cs.forEach(x=>{map[x.chain]=x.name;});
  const c=curChain();sel.innerHTML='<option value="">'+T('כל הרשתות','All chains')+'</option>'+cs.map(x=>'<option value="'+esc(x.chain)+'"'+(x.chain===c?' selected':'')+'>'+esc(x.name)+'</option>').join('');}
/* לשונית "איפה הכי זול": בחירת הרשת בראש, לפני חיפוש המוצר והסל */
const _chainRender=renderStores;
renderStores=function(){const r=_chainRender.apply(this,arguments);try{if(storesView==='cmp'){const q=storesPane.querySelector('#cmpQ');const box=q&&q.closest('.rank');
  if(box&&!storesPane.querySelector('#cmpChain')){box.insertAdjacentHTML('beforebegin','<div class="rank chainbox">'+selectHtml('cmpChain')+'<div class="sub">'+T('בוחרים רשת, למשל רק אושר עד, והחיפוש של מוצר אחד וההשוואה של כל הסל יהיו רק בסניפים שלה.','Pick a chain to search only its branches.')+'</div></div>');fillSelect(storesPane.querySelector('#cmpChain'));}
  const h=storesPane.querySelector('#cmpList #srvCmp h3');if(h&&curChain())h.textContent='🧺 '+T('כל הרשימה — רק ב'+chainName(curChain()),'Whole list — '+chainName(curChain())+' only');}}catch(e){}return r;};
storesPane.addEventListener('change',e=>{if(e.target.id==='cmpChain'){setChain(e.target.value);renderStores();}});
/* חלון ההשוואה (מוצר אחד או סל): אותה בחירה, ומחשבים מחדש */
const _chainMount=srvBasketMount;
srvBasketMount=function(box){const r=_chainMount.apply(this,arguments);try{const w=box.querySelector('#srvCmp');/* בלשונית עצמה הבחירה כבר למעלה */if(w&&!w.querySelector('#srvChain')&&!storesPane.contains(w)){const row=w.querySelector('#srvCity').closest('.row18');row.insertAdjacentHTML('beforebegin',selectHtml('srvChain'));const sel=w.querySelector('#srvChain');fillSelect(sel);
  sel.onchange=()=>{setChain(sel.value);const c=w.querySelector('#srvCity');if(c&&c.value.trim())w.querySelector('#srvGo').click();else w.querySelector('#srvNear').click();};}}catch(e){}return r;};
/* כותרת חיפוש מוצר: "🔎 חלב — רק באושר עד" */
const _chainItem=srvItemOpen;
srvItemOpen=function(q){const r=_chainItem.apply(this,arguments);try{if(curChain())basketTitle('🔎 '+q.slice(0,40)+' — '+T('רק ב'+chainName(curChain()),chainName(curChain())+' only'));}catch(e){}return r;};
})();
