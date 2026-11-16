
/* ================= גרסה 16.4: חנות שלא מכירים — שואלים את הלקוח אם להוסיף אותה לחנויות (עם קטגוריה) ================= */
const ASK164_KEY='yam_store_asked164';
const asked164=(()=>{try{return new Set(JSON.parse(localStorage.getItem(ASK164_KEY)||'[]'));}catch(e){return new Set();}})();
const saveAsked164=()=>{try{localStorage.setItem(ASK164_KEY,JSON.stringify(Array.from(asked164).slice(-300)));}catch(e){}};
const knownStore164=n=>{const k=norm(n);return allChainNames().some(c=>norm(c)===k);};
/* ניחוש קטגוריה לפי השם — הלקוח יכול לשנות */
function guessType164(n){const s=String(n||'');
  const R=[[/אונליין|online|\.co|\.com|משלוח/i,'online'],[/מכונ|vending|אוטומט/i,'vending'],[/פארם|pharm|סופר.?פארם|בית מרקחת/i,'pharm'],[/פיצ/,'pizza'],[/שווארמ|שוורמ/,'shawarma'],[/פלאפל|פלפל/,'falafel'],[/פיצוח|אגוז/,'nuts'],[/ממתק|סוכרי|שוקולד/,'sweets'],[/מאפ|לחם|בייגל|קונדיטור/,'bakery'],[/אטליז|בשר|קצב|דגים|עוף/,'butcher'],[/ירק|פירות|פרי/,'produce'],[/מכולת|מינימרקט|קיוסק|פיצוציה/,'grocery'],[/כלי בית|ניקיון|הום|home/i,'home']];
  for(const [re,t] of R)if(re.test(s)&&STORE_TYPES[t])return t;return 'supermarket';}
/* חלון השאלה. mustPick=true: באמצע דיווח מחיר — רק בוחרים קטגוריה (החנות תתווסף בכל מקרה) */
function askStore164(name,opt){opt=opt||{};return new Promise(res=>{
  let pick=STORE_TYPES[opt.type]?opt.type:guessType164(name);
  const ov=document.createElement('div');ov.className='qp15 open';ov.id='ask164';
  const types=Object.keys(STORE_TYPES);
  ov.innerHTML='<div class="qpcard"><div class="qphead"><b>🏪 '+(opt.mustPick?T('איזו חנות זו?','What kind of store?'):T('להוסיף את "'+esc(name)+'" לחנויות?','Add "'+esc(name)+'" to stores?'))+'</b><button aria-label="'+T('סגירה','Close')+'">✕</button></div>'+
    '<p class="muted164">'+(opt.mustPick?T('"'+esc(name)+'" חדשה באתר. בחרו קטגוריה — כך כולם ימצאו אותה ב"🏪 החנויות".','"'+esc(name)+'" is new. Pick a category.'):T('"'+esc(name)+'" עוד לא ברשימת החנויות של האתר. אם תוסיפו — היא תופיע ב"🏪 החנויות" בקטגוריה שתבחרו, וכולם יוכלו להשוות בה מחירים.','This store is not listed yet. Add it under a category?'))+'</p>'+
    '<div class="chips164">'+types.map(t=>'<button type="button" data-t164="'+t+'" class="'+(t===pick?'on':'')+'">'+STORE_TYPES[t][0]+' '+esc(T(STORE_TYPES[t][1],STORE_TYPES[t][2]))+'</button>').join('')+'</div>'+
    '<div class="br164"'+(pick==='online'?' hidden':'')+'><label class="muted164">'+T('סניף (לא חובה)','Branch (optional)')+'</label><div class="row2 wrap15"><input id="a164City" maxlength="40" placeholder="'+T('עיר','City')+'" value="'+esc(opt.city||'')+'"><input id="a164Addr" maxlength="120" placeholder="'+T('רחוב ומספר','Street')+'" value="'+esc(opt.addr||'')+'"></div></div>'+
    '<div class="row2 wrap15"><button class="btn" data-yes164>'+(opt.mustPick?'✔ '+T('אישור','OK'):'➕ '+T('כן, להוסיף','Yes, add'))+'</button>'+(opt.mustPick?'':'<button class="btn sec" data-no164>'+T('לא, תודה','No thanks')+'</button>')+'</div>'+
    (opt.mustPick||isStaff()?'':'<p class="muted164">'+T('חנות חדשה מופיעה לכולם אחרי אישור של צוות האתר.','New stores appear after approval.')+'</p>')+'</div>';
  document.body.appendChild(ov);
  const done=v=>{ov.remove();res(v);};
  ov.addEventListener('click',e=>{
    const t=e.target.closest('[data-t164]');if(t){pick=t.dataset.t164;ov.querySelectorAll('[data-t164]').forEach(b=>b.classList.toggle('on',b===t));ov.querySelector('.br164').hidden=pick==='online';return;}
    if(e.target.closest('[data-yes164]')){done({category:pick,city:(ov.querySelector('#a164City')||{}).value||'',addr:(ov.querySelector('#a164Addr')||{}).value||''});return;}
    if(e.target===ov||e.target.closest('.qphead button')||e.target.closest('[data-no164]'))done(opt.mustPick?{category:pick,city:'',addr:''}:null);
  });
});}
/* תור — שואלים על חנות אחת בכל פעם, כשאין חלון אחר פתוח */
const q164=[];let busy164=false,timer164=0;
function noteStore164(name,hint){name=String(name||'').trim().slice(0,40);
  if(!sb||!authUser||name.length<2||knownStore164(name)||asked164.has(norm(name))||hasProfanity(name))return;
  if(/^(לפי קבלה|from receipt|אחר|other|לא יודע|-+)$/i.test(name))return;
  if(q164.some(x=>norm(x.name)===norm(name)))return;
  q164.push({name,hint:hint||{}});clearTimeout(timer164);timer164=setTimeout(flush164,900);}
async function flush164(){if(busy164||!q164.length)return;
  const blocking=document.querySelector('#v8Sheet.open,#finishOverlay.open,#ask164,.qp15.open');if(blocking){timer164=setTimeout(flush164,1500);return;}
  busy164=true;const {name,hint}=q164.shift();
  try{if(!knownStore164(name)){const ans=await askStore164(name,hint);asked164.add(norm(name));saveAsked164();
    if(ans){const kind=ans.category==='online'?'online':'store';await addStoreOrBranch(name,kind,ans.city,ans.addr,'',ans.category);
      try{if(typeof renderStores==='function'&&document.querySelector('#storesList,#branchList'))renderStores();}catch(e){}}}}
  catch(e){}busy164=false;if(q164.length)timer164=setTimeout(flush164,600);}
/* דיווח מחיר על חנות חדשה — שואלים מה סוג החנות במקום לשים "סופרמרקט" אוטומטית */
const _v164AddStore=addStoreOrBranch;
addStoreOrBranch=async function(chain,kind,city,address,name,category){
  const c=String(chain||'').trim().slice(0,40);
  if(c&&!category&&kind!=='online'&&!knownStore164(c)){const ans=await askStore164(c,{mustPick:true});category=ans.category;if(category==='online')kind='online';asked164.add(norm(c));saveAsked164();}
  return _v164AddStore.call(this,chain,kind,city,address,name,category);};
/* מחיר שפורסם לחנות שלא קיימת (מקבלה, מיאמי וכו') */
const _v164InsertPrice=insertPrice;
insertPrice=async function(row){const err=await _v164InsertPrice.apply(this,arguments);try{if(!err&&row)noteStore164(row.chain,{});}catch(e){}return err;};
/* כל מקום שכותבים בו שם חנות: קבלה, סיום קנייה, "החנויות שלי", הזמנות קבועות, אנשי קשר */
document.addEventListener('click',e=>{const b=e.target.closest('#upConfirm,#finGo,#msAdd,#moAdd,#mpAdd');if(!b)return;
  const val=s=>{const x=document.querySelector(s);return x?x.value.trim():'';};
  if(b.id==='upConfirm'){const st=val('#urStore');if(st){const br=val('#urBranch');const p=br.split(/\s+[—-]\s+|,\s*/);setTimeout(()=>noteStore164(st,{city:p[0]||'',addr:p.slice(1).join(' ')}),50);}}
  else if(b.id==='finGo'){const n=val('#finStore');setTimeout(()=>noteStore164(n,{}),50);}
  else if(b.id==='msAdd'){const n=val('#msName'),k=val('#msKind');const x=val('#msExtra');setTimeout(()=>noteStore164(n,k==='online'?{type:'online'}:{addr:x}),50);}
  else if(b.id==='moAdd'){const n=val('#moStore');setTimeout(()=>noteStore164(n,{}),50);}
  else if(b.id==='mpAdd'){const n=val('#mpStore');setTimeout(()=>noteStore164(n,{}),50);}
},true);
