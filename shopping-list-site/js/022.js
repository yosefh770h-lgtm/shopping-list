
/* ================= גרסה 16.3: בעלי מכונות אוטומטיות — סוג עסק, גישה מהירה, וחיבור למסופון של המכונה בזמן אמת ================= */
STORE_TYPES.vending=['🎰','מכונות אוטומטיות (פחיות, חטיפים, קפה)','Vending machines'];
if(!BIZ_TYPES.includes('vending'))BIZ_TYPES.splice(Math.max(0,BIZ_TYPES.indexOf('other')),0,'vending');
const isVending163=()=>!!(shop&&shop.row&&shop.row.category==='vending');
/* בעל מכונות: "האתר העסקי" נפתח ישר על המכונות, והלשונית ראשונה */
const _v163OpenShop=openShop;
openShop=async function(chain){const r=await _v163OpenShop.apply(this,arguments);
  if(isVending163()&&!shop._m163){shop._m163=true;shop.tab='machines';drawShop();}
  return r;};
const _v163DrawShop=drawShop;
drawShop=function(){_v163DrawShop.apply(this,arguments);const bar=document.querySelector('#shopTabs');if(!bar)return;
  const mb=bar.querySelector('[data-shtab="machines"]');if(mb&&isVending163()&&bar.firstElementChild!==mb)bar.insertBefore(mb,bar.firstElementChild);
  if(shop.tab==='machines')mach163Live();};
/* בתפריט: "🎰 המכונות שלי" — לבעלי עסקים */
(function(){const host=document.querySelector('#hMenu details[data-g="shop"] .mgbody')||document.querySelector('#hMenu');if(!host||document.querySelector('#miMachines'))return;
  const b=document.createElement('button');b.id='miMachines';b.hidden=true;b.innerHTML='🎰<span>'+T('המכונות שלי (פחיות, חטיפים...)','My vending machines')+'</span>';host.insertBefore(b,host.firstChild);
  b.onclick=async()=>{document.querySelector('#hMenu').classList.remove('open');if(!myStore){openBizJoin();return;}await openShop(myStore.chain);shop.tab='machines';drawShop();};
  setInterval(()=>{b.hidden=!(typeof myStore!=='undefined'&&myStore);},4000);})();
/* זמן אמת: כשהמסופון מעדכן — המסך מתעדכן לבד */
let mach163Ch=null,mach163Chain='';
function mach163Live(){if(!sb||!shop.chain||mach163Chain===shop.chain)return;
  if(mach163Ch){try{sb.removeChannel(mach163Ch);}catch(e){}}mach163Chain=shop.chain;
  mach163Ch=sb.channel('mach-'+shop.chain).on('postgres_changes',{event:'*',schema:'public',table:'biz_machines',filter:'chain=eq.'+shop.chain},async()=>{
    if(shop.tab!=='machines'||!document.querySelector('#m16box'))return;const a=document.activeElement;if(a&&a.closest&&a.closest('#m16box')&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;
    await machLoad();machRender();}).subscribe();}
const online163=m=>m.last_seen&&Date.now()-new Date(m.last_seen).getTime()<20*60000;
/* מסך המכונה: חיבור למסופון */
const _v163MachHtml=machHtml;
machHtml=function(){let h=_v163MachHtml.apply(this,arguments);
  if(!mach16.open){
    h=h.replace(/<button class="m16card" data-mopen="([^"]+)">/g,(x,id)=>{const m=mach16.list.find(z=>z.id===id);if(!m||!m.external_id)return x;return x+'<span class="live163 '+(m.status==='error'?'err':online163(m)?'on':'off')+'" title="'+T('מסופון','Terminal')+'"></span>';});
    if(!isVending163()&&!mach16.list.length)h=h.replace('<h4>➕','<p class="muted-note">💡 '+T('בעל/ת מכונות בעיקר? ב"פרופיל" אפשר לבחור סוג עסק "🎰 מכונות אוטומטיות" — והמכונות ייפתחו ראשונות.','Mostly vending? Set your business type to Vending machines in Profile.')+'</p><h4>➕');
    return h;}
  const m=mach16.list.find(x=>x.id===mach16.open);if(!m)return h;
  const st=m.external_id?(m.status==='error'?'🔴 '+T('תקלה','Error')+(m.status_msg?': '+esc(m.status_msg):''):online163(m)?'🟢 '+T('מחובר — עדכון אחרון ','Online — last update ')+esc(fmtTime(new Date(m.last_seen))):'⚪ '+(m.last_seen?T('עדכון אחרון: ','Last update: ')+esc(fmtDate(new Date(m.last_seen)))+' '+esc(fmtTime(new Date(m.last_seen))):T('עוד לא התקבל עדכון מהמסופון','No update from the terminal yet'))):T('לא מחובר למסופון','Not connected');
  const url=SB_URL+'/functions/v1/pos';
  const ex=JSON.stringify({machines:[{id:m.external_id||'TERMINAL-123',sales:[{slot:'A1',qty:1,price:5,payment:'card'}],slots:[{slot:'A1',product:'קולה',qty:7,cap:10,price:5}],status:'ok'}]},null,1);
  const panel='<details class="term163"'+(m.external_id?'':' open')+'><summary>🔌 '+T('חיבור למסופון של המכונה — עדכון בזמן אמת','Connect the machine terminal (real time)')+' · <span>'+st+'</span></summary>'+
    '<p class="muted-note">'+T('כשהמכונה מחוברת, כל מכירה, מילוי ותקלה מתעדכנים כאן לבד — בזמן אמת, ואתם מקבלים התראה כשמשהו עומד להיגמר או כשיש תקלה.','When connected, every sale, refill and fault updates here automatically.')+'</p>'+
    '<ol class="nf162"><li>'+T('מזהה המסופון של המכונה (המספר הסידורי / מזהה המכשיר אצל ספק המסופון):','Terminal ID:')+'<div class="row2"><input id="t163id" maxlength="60" dir="ltr" value="'+esc(m.external_id||'')+'" placeholder="TERMINAL-123"><button id="t163save">💾 '+T('שמירה','Save')+'</button></div></li>'+
    '<li>'+T('מפתח החיבור של העסק (אותו מפתח משמש גם לחיבור הקופה — יצירה של מפתח חדש מבטלת את הקודם):','Business connection key:')+'<div class="row2"><button class="btn sec" id="t163key">🔑 '+T('יצירת מפתח','Create key')+'</button></div><div id="t163keyout"></div></li>'+
    '<li>'+T('שולחים לספק המסופון / מערכת הניהול של המכונות את הכתובת, המפתח ומבנה ההודעה — והם מגדירים שליחת עדכון (Webhook) בכל מכירה:','Send these to your terminal provider:')+
    '<label class="il">'+T('כתובת','URL')+'</label><input readonly dir="ltr" value="'+esc(url)+'"><label class="il">'+T('כותרת','Header')+'</label><input readonly dir="ltr" value="x-store-key: '+T('המפתח מסעיף 2','key from step 2')+'">'+
    '<label class="il">'+T('דוגמה (POST, JSON)','Example (POST, JSON)')+'</label><pre class="pre16 ex163" dir="ltr">'+esc(ex)+'</pre>'+
    '<button class="btn sec" id="t163copy">📋 '+T('העתקת כל פרטי החיבור','Copy connection details')+'</button></li></ol>'+
    '<p class="muted-note">'+T('אפשר גם לשלוח רק "slots" (מלאי מלא), "refill": true (מילוי), "cash" (כמה כסף בקופה), "status": "error" + "message" (תקלה). מכירה במזומן: "payment": "cash".','You can also send only slots, refill, cash or status.')+'</p></details>';
  return h.replace('<div class="row2 wrap15"><button data-mfill="1">',panel+'<div class="row2 wrap15"><button data-mfill="1">');};
document.addEventListener('click',async e=>{if(!e.target.closest('#m16box'))return;const m=mach16.open&&mach16.list.find(x=>x.id===mach16.open);if(!m)return;
  if(e.target.closest('#t163save')){const v=document.querySelector('#t163id').value.trim().slice(0,60);const {error}=await sb.from('biz_machines').update({external_id:v}).eq('id',m.id);if(error){flash('⚠️ '+(/duplicate|unique/.test(error.message)?T('המזהה הזה כבר משויך למכונה אחרת','This ID is used by another machine'):error.message));return;}m.external_id=v;flash('💾 '+T('נשמר','Saved'));machRender();return;}
  if(e.target.closest('#t163key')){if(!(await uiConfirm(T('ליצור מפתח חדש? מפתח קודם (גם של הקופה) יפסיק לעבוד.','Create a new key? The previous key stops working.'))))return;const {data,error}=await sb.rpc('store_api_key_new',{p_chain:m.chain});if(error){flash('⚠️ '+error.message);return;}
    document.querySelector('#t163keyout').innerHTML='<input readonly dir="ltr" id="t163k" value="'+esc(data)+'"><p class="muted-note">⚠️ '+T('שמרו את המפתח עכשיו — הוא מוצג פעם אחת בלבד.','Save it now — shown once.')+'</p>';return;}
  if(e.target.closest('#t163copy')){const k=(document.querySelector('#t163k')||{}).value||T('<המפתח>','<key>');const t='URL: '+SB_URL+'/functions/v1/pos\nHeader: x-store-key: '+k+'\nMethod: POST, Content-Type: application/json\nTerminal ID: '+(m.external_id||'')+'\n\n'+document.querySelector('.ex163').textContent;try{await navigator.clipboard.writeText(t);flash('📋 '+T('הועתק','Copied'));}catch(x){flash(t);}}
});
