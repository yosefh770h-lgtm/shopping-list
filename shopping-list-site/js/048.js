
/* ================= משימות יום שלישי: הסניפים שלי (חיפוש בסניף אחד / השוואה בין כמה), יאמי עונה על מחירים מהשרת, וסידור ראש המסך ================= */
(function(){
const $t=s=>document.querySelector(s);
/* ---------- 🏬 הסניפים שלי: בוחרים סניפים מהשרת, נשמר במכשיר ובחשבון ---------- */
const MYST_MAX=8;
function myStores(){return Array.isArray(state.srvPicks)?state.srvPicks.filter(s=>s&&typeof s.store==='string'):[];}
function myStoresSet(a){state.srvPicks=a.slice(0,MYST_MAX);save();}
function myStLabel(s){return (s.online?'🌐 ':'')+(s.chain_name||s.chain||'')+(s.name?' · '+s.name:'');}
function myStAddr(s){return srvAddr(s);}
window.myStores=myStores;
let mySt={open:false,city:'',filter:'',rows:[],q:'',out:''};
function myStBoxHtml(){
  const ps=myStores(),items=curList().items.filter(i=>!i.done);
  let h='<div class="rank myst" id="myStBox"><h3>🏬 '+T('החנויות שלי: חיפוש והשוואה','My stores: search & compare')+'</h3>'+
    '<div class="sub">'+T('בוחרים חנות אחת כדי לחפש בה מוצרים, או 2 ומעלה כדי להשוות ביניהן מוצר או את כל הרשימה.','Pick one store to search in it, or two or more to compare them.')+'</div>';
  h+='<div class="mystchips">'+ps.map((s,i)=>'<span class="mystchip"><b>'+esc(s.chain_name||s.chain)+'</b> '+esc(s.name||'')+'<button type="button" data-mystdel="'+i+'" aria-label="'+T('להוריד את ','Remove ')+esc(myStLabel(s))+'">✕</button></span>').join('')+
    (ps.length<MYST_MAX?'<button type="button" class="sec mystadd" id="myStAdd" aria-expanded="'+mySt.open+'">➕ '+T(ps.length?'עוד חנות':'בחירת חנויות','Add store')+'</button>':'')+'</div>';
  if(mySt.open)h+='<div class="mystpick"><div class="row18"><input id="myStCity" list="myStCities" autocomplete="off" value="'+esc(mySt.city)+'" placeholder="'+T('עיר','City')+'" aria-label="'+T('באיזו עיר','Which city')+'"><datalist id="myStCities"></datalist>'+
    '<input id="myStFilter" autocomplete="off" value="'+esc(mySt.filter)+'" placeholder="'+T('רשת או רחוב (לא חובה)','Chain or street (optional)')+'" aria-label="'+T('סינון לפי רשת או רחוב','Filter by chain or street')+'"></div><div id="myStRes" class="mystres" aria-live="polite"></div></div>';
  if(ps.length){
    h+='<div class="row18"><input id="myStQ" maxlength="60" value="'+esc(mySt.q)+'" placeholder="'+T('איזה מוצר? למשל: חלב 3%','Which product?')+'" aria-label="'+T('איזה מוצר','Which product')+'"><button id="myStGo">🔎 '+(ps.length===1?T('חיפוש בחנות','Search store'):T('השוואה','Compare'))+'</button></div>'+
      (items.length?'<button class="sec" id="myStList" style="width:100%">🧺 '+(ps.length===1?T('כמה עולה כל הרשימה ('+items.length+') בחנות הזו','Whole list in this store'):T('כל הרשימה ('+items.length+') בחנויות שלי','Whole list in my stores'))+'</button>':'');
  }
  h+='<div id="myStOut" aria-live="polite">'+mySt.out+'</div></div>';
  return h;}
function myStDrawPick(){const box=$t('#myStRes');if(!box)return;const ps=myStores().map(s=>s.store);
  const rows=mySt.rows.slice(0,40);
  if(!mySt.city.trim()&&!mySt.filter.trim()){box.innerHTML='<p class="muted-note">'+T('כותבים עיר (ואם רוצים גם רשת או רחוב), ובוחרים חנות מהרשימה.','Type a city, then pick a store.')+'</p>';return;}
  if(!rows.length){box.innerHTML='<p class="muted-note">🤷 '+T('לא נמצאו סניפים','No branches found')+'</p>';return;}
  box.innerHTML=rows.map(s=>{const on=ps.includes(s.store);return '<div class="merow"><span class="grow"><b>'+esc(s.chain_name||s.chain)+'</b>'+(s.brand&&s.brand!==s.chain_name?' '+esc(s.brand):'')+' '+esc(s.name||'')+'<small>'+esc(myStAddr(s))+'</small></span>'+
    (on?'<span class="mini">✅ '+T('נבחר','Picked')+'</span>':'<button class="mini pri" data-mystadd="'+esc(s.store)+'">➕ '+T('לבחור','Pick')+'</button>')+'</div>';}).join('');}
async function myStLoadCity(){const c=mySt.city.trim(),f=mySt.filter.trim();if(!c&&f.length<2){mySt.rows=[];myStDrawPick();return;}
  const box=$t('#myStRes');if(box)box.innerHTML='<p class="muted-note">'+T('מחפשת חנויות... 🔎','Searching... 🔎')+'</p>';
  try{const hid=srvHidden();/* השרת מחפש לפי כמה מילים: רשת, תת-רשת, שם סניף, כתובת או עיר ("שופרסל דיל", "יש חסד בב") */
    mySt.rows=(await priceApi('/stores',{city:c,q:f,limit:200,exclude:hid.join(',')})||[]).filter(s=>!hid.includes(s.chain));}
  catch(e){mySt.rows=[];if(box)box.innerHTML='<p class="muted-note">⚠️ '+esc(e.message||'')+'</p>';return;}
  mySt.rows.sort((a,b)=>String(a.chain_name).localeCompare(String(b.chain_name),'he')||String(a.name).localeCompare(String(b.name),'he'));
  myStDrawPick();}
/* תוצאה: סניף אחד — המוצרים שנמצאו בו */
function myStDrawOne(d){const cur=myCurrency();const s=d.store||{};
  let h='<div class="mystres1"><p class="muted-note">🏪 <b>'+esc(myStLabel(s))+'</b>'+(myStAddr(s)?' · '+esc(myStAddr(s)):'')+'</p>';
  (d.items||[]).forEach(it=>{
    h+=(d.items.length>1?'<h4 class="mysth">'+esc(it.q)+(it.qty>1?' ×'+it.qty:'')+'</h4>':'');
    h+=it.matches&&it.matches.length?it.matches.map((m,i)=>'<div class="merow"><span>'+(i===0?'✅':'▫️')+'</span>'+thumb53(m.code,m.name,it.q)+'<span class="grow">'+esc(m.name)+'<small>'+(m.deal?'🔥 '+esc(m.deal.text||T('מבצע','deal'))+(m.deal.until?' · '+T('עד ','until ')+esc(m.deal.until):''):'')+unitTag18(m.name,m.price,cur,m.deal?' · ':'')+'</small></span><b>'+(m.deal&&m.cost<m.regular?'<s class="was18">'+fmtPrice(m.regular,cur)+'</s> ':'')+fmtPrice(m.cost,cur)+'</b></div>').join(''):'<p class="muted-note">🤷 '+T('לא נמצא בחנות הזו','Not found in this store')+'</p>';});
  return h+'</div>';}
/* תוצאה: כמה סניפים — דירוג, ולרשימה גם טבלה מוצר מול סניף */
function myStDrawMany(d){const cur=myCurrency();const MED=['🥇','🥈','🥉'];const st=(d.stores||[]);const n=(d.items||[]).length;
  if(!st.length)return '<p class="muted-note">🤷 '+T('לא נמצאו מחירים בחנויות שבחרת','No prices found in your stores')+'</p>';
  const full=st.filter(s=>s.found===n);const best=full.length>1?full[0]:null,worst=full.length>1?full[full.length-1]:null;
  let h='';
  if(best&&worst&&worst.total>best.total)h+='<p class="up18best">✅ '+T('הכי זול: '+esc(myStLabel(best))+' — '+fmtPrice(best.total,cur)+'. חוסכים '+fmtPrice(rnd2(worst.total-best.total),cur)+' לעומת היקר.','Cheapest: '+esc(myStLabel(best)))+'</p>';
  h+=st.map((s,i)=>{const one=n===1?s.lines[0]:null;const save=rnd2(s.regular-s.total);
    return '<div class="rkrow"><span class="rkn">'+(s.found?(MED[i]||(i+1)):'—')+'</span><span><b>'+esc(s.chain_name)+'</b> '+esc(s.name||'')+'<small> · '+esc(myStAddr(s))+'</small></span><span class="amt">'+(s.found?(save>0?'<s class="was18">'+fmtPrice(s.regular,cur)+'</s> ':'')+fmtPrice(s.total,cur):'—')+'</span>'+
      '<small>'+(one?(one.found?thumb53(one.code,one.name,one.q,'xs')+esc(one.name)+(one.deal?' · 🔥 '+esc(one.deal.text||''):''):T('אין בחנות','not in this store')):T('יש מחיר ל-'+s.found+' מתוך '+n+' מוצרים',s.found+' of '+n+' items')+(save>0?' · 🔥 '+T('חוסכים ','save ')+fmtPrice(save,cur):''))+'</small></div>';}).join('');
  if(n>1){const cols=st.slice(0,MYST_MAX);
    h+='<div class="mysttw"><table class="mysttab"><thead><tr><th>'+T('מוצר','Item')+'</th>'+cols.map(s=>'<th>'+esc(s.chain_name)+'<small>'+esc(s.name||'')+'</small></th>').join('')+'</tr></thead><tbody>'+
      d.items.map((it,k)=>{const vals=cols.map(s=>s.lines[k]&&s.lines[k].found?s.lines[k].cost:null);const min=Math.min(...vals.filter(v=>v!=null));
        const fl=cols.map(s=>s.lines[k]).find(l=>l&&l.found);return '<tr><td>'+(fl?thumb53(fl.code,fl.name,it.q,'xs'):'')+esc(it.q)+(it.qty>1?' ×'+it.qty:'')+'</td>'+cols.map((s,j)=>{const l=s.lines[k];return '<td'+(vals[j]!=null&&vals[j]===min&&cols.length>1?' class="low"':'')+' title="'+esc(l&&l.found?l.name:'')+'">'+(vals[j]!=null?fmtPrice(vals[j],cur)+(l.deal?' 🔥':''):'—')+'</td>';}).join('')+'</tr>';}).join('')+
      '<tr class="tot"><td>'+T('סה"כ','Total')+'</td>'+cols.map(s=>'<td>'+fmtPrice(s.total,cur)+'</td>').join('')+'</tr></tbody></table></div>';}
  if(d.missing&&d.missing.length)h+='<p class="muted-note">🤷 '+T('לא נמצאו: ','Not found: ')+d.missing.map(esc).join(', ')+'</p>';
  return h;}
async function myStRun(kind){const ps=myStores();const out=$t('#myStOut');if(!ps.length||!out)return;
  let items='';
  if(kind==='list')items=srvItemsParam(curList().items.filter(i=>!i.done));
  else{items=(($t('#myStQ')||{}).value||'').trim().replace(/[|*\n]/g,' ');mySt.q=items;if(!items){const q=$t('#myStQ');if(q)q.focus();return;}}
  if(!items)return;
  out.innerHTML='<p class="muted-note">'+T('מחשבת... 🧮','Calculating... 🧮')+'</p>';
  try{
    if(ps.length===1&&kind!=='list')mySt.out=myStDrawOne(await priceApi('/prices',{store:ps[0].store,items}));
    else mySt.out=myStDrawMany(await priceApi('/compare',{items,stores:ps.map(s=>s.store).join(','),limit:MYST_MAX}));
  }catch(e){mySt.out='<p class="muted-note">⚠️ '+esc(e.message||'')+'</p>';}
  out.innerHTML=mySt.out;}
function myStMount(){const after=storesPane.querySelector('#cmpList');if(!after||storesPane.querySelector('#myStBox'))return;
  if(!mySt.city)mySt.city=((meData().address||{}).city)||state.geoCity||'';
  after.insertAdjacentHTML('beforebegin',myStBoxHtml());
  if(mySt.open){myStLoadCity();}}
function myStRedraw(){const b=storesPane.querySelector('#myStBox');if(!b)return;b.outerHTML=myStBoxHtml();if(mySt.open)myStLoadCity();}
const _mystRender=renderStores;
renderStores=function(){const r=_mystRender.apply(this,arguments);try{if(storesView==='cmp'&&srvShown())myStMount();}catch(e){console.warn('myst',e);}return r;};
storesPane.addEventListener('click',e=>{const box=e.target.closest('#myStBox');if(!box)return;
  if(e.target.closest('#myStAdd')){mySt.open=!mySt.open;myStRedraw();if(mySt.open)setTimeout(()=>{const c=$t('#myStCity');if(c&&!c.value)c.focus();},0);return;}
  const a=e.target.closest('[data-mystadd]');if(a){const s=mySt.rows.find(x=>x.store===a.dataset.mystadd);if(!s)return;const ps=myStores();if(ps.some(x=>x.store===s.store))return;
    ps.push({store:s.store,chain:s.chain,chain_name:s.chain_name,name:s.name||'',address:s.address||'',city:s.city||''});myStoresSet(ps);if(ps.length>=MYST_MAX)mySt.open=false;mySt.out='';myStRedraw();flash('✅ '+T('נוסף: ','Added: ')+myStLabel(s));return;}
  const d=e.target.closest('[data-mystdel]');if(d){const ps=myStores();ps.splice(+d.dataset.mystdel,1);myStoresSet(ps);mySt.out='';myStRedraw();return;}
  if(e.target.closest('#myStGo')){myStRun('item');return;}
  if(e.target.closest('#myStList')){myStRun('list');return;}});
let mystT=0;
storesPane.addEventListener('input',e=>{
  if(e.target.id==='myStFilter'){mySt.filter=e.target.value;clearTimeout(mystT);mystT=setTimeout(myStLoadCity,350);return;}
  if(e.target.id==='myStQ'){mySt.q=e.target.value;return;}
  if(e.target.id==='myStCity'){mySt.city=e.target.value;clearTimeout(mystT);const q=mySt.city.trim();if(q.length<2)return;
    mystT=setTimeout(async()=>{try{const cs=await priceApi('/cities',{q});const dl=$t('#myStCities');if(dl)dl.innerHTML=cs.map(c=>'<option value="'+esc(c.city)+'">'+c.stores+' '+T('סניפים','branches')+'</option>').join('');
      if(cs.some(c=>norm(c.city)===norm(q)))myStLoadCity();}catch(err){}},350);}});
storesPane.addEventListener('change',e=>{if(e.target.id==='myStCity'){mySt.city=e.target.value;myStLoadCity();}});
storesPane.addEventListener('keydown',e=>{if(e.key!=='Enter')return;
  if(e.target.id==='myStQ'){e.preventDefault();myStRun('item');}
  else if(e.target.id==='myStCity'){e.preventDefault();mySt.city=e.target.value;myStLoadCity();}});
/* בהשוואת הסל (גם בחלון "השוואת סל מלא"): כפתור "🏬 הסניפים שלי" ליד "קרוב אליי" */
const _mystMount=srvBasketMount;
srvBasketMount=function(box,itemsArg){const r=_mystMount.apply(this,arguments);
  try{const ps=myStores();const w=box.querySelector('#srvCmp');if(!ps.length||!w||w.querySelector('#srvMine'))return r;
    const near=w.querySelector('#srvNear');near.insertAdjacentHTML('afterend','<button class="sec" id="srvMine">🏬 '+T('החנויות שלי','My stores')+' ('+ps.length+')</button>');
    w.querySelector('#srvMine').onclick=()=>{const c=w.querySelector('#srvCity');if(c)c.value='';const hid=srvHidden();
      /* אותו ציור כמו בעיר — דרך כפתור ההשוואה עם פרמטרים אחרים */
      const res=w.querySelector('#srvRes');res.innerHTML='<p class="muted-note">'+T('מחשבת... 🧮','Calculating... 🧮')+'</p>';
      const items=itemsArg||curList().items.filter(i=>!i.done);
      priceApi('/compare',{items:srvItemsParam(items),stores:ps.map(s=>s.store).join(','),limit:MYST_MAX,exclude:hid.join(',')}).then(d=>{res.innerHTML=myStDrawMany(d);},err=>{res.innerHTML='<p class="muted-note">⚠️ '+esc(err.message||'')+'</p>';});};
  }catch(e){}
  return r;};

/* ---------- 💰 יאמי: "כמה עולה X" / "איפה הכי זול X" / "X ברמי לוי או בשופרסל" — מהמחירים שהשרת אוסף מהרשתות ---------- */
let srvChainsP=null;
function srvChains(){if(!srvChainsP)srvChainsP=priceApi('/chains').catch(()=>{srvChainsP=null;return [];});return srvChainsP;}
const YPRICE=/^(?:(?:יאמי|ימי)\s+)?(?:(?:תגידי|תבדקי|תגיד|תבדוק)(?:\s+לי)?\s+)?(?:כמה\s+(?:עולה|עולים|עולות|זה\s+עולה)|מה\s+(?:המחיר|מחיר)\s+(?:של\s+)?|מחיר\s+(?:של\s+)?|איפה\s+(?:הכי\s+)?(?:זול|משתלם|כדאי)(?:\s+(?:לקנות|יותר))?|השוואת\s+מחיר(?:ים)?\s+(?:ל|של\s+)?|תשווי\s+(?:לי\s+)?(?:את\s+)?(?:ה)?מחיר(?:ים)?\s+(?:של\s+)?)\s*(.+)$/;
function ycityOf(q){/* "חלב בבני ברק" / "חלב ב-ירושלים" */
  const w=q.split(' ');for(let k=Math.min(3,w.length-1);k>=1;k--){const tail=w.slice(-k).join(' ').replace(/^ב-?/,'');if(!/^ב/.test(w[w.length-k]))continue;const c=knownCity(tail);if(c)return {q:w.slice(0,-k).join(' '),city:c};}
  return {q,city:''};}
async function yamiSrvPrice(raw){
  if(!(typeof srvShown==='function'&&srvShown()))return false;
  let t=norm(String(raw||'')).replace(/[?？!.]+$/,'').trim();
  const m=t.match(YPRICE);if(!m)return false;
  let q=m[1].replace(/^(?:את\s+)?(?:ה(?=\S{3,}))?/,'').trim();
  if(!q||/^[\d.\s+\-*/×x()]+$/.test(q)||/(^|\s)כפול(\s|$)/.test(q))return false;
  const isList=/^(?:ה)?(?:רשימה|סל|סל הקניות|רשימת הקניות|כל הרשימה|הקניות)(?:\s+שלי)?(?:\s|$)/.test(q)||/^לקנות\s+את\s+(?:כל\s+)?הרשימה/.test(q);
  /* סניפים שבחרתי / עיר / רשתות */
  let mine=false;if(/\s?ב(?:סניפים|סניף|חנויות)\s+שלי$/.test(q)){mine=true;q=q.replace(/\s?ב(?:סניפים|סניף|חנויות)\s+שלי$/,'').trim();}
  const cq=ycityOf(q);q=cq.q;
  let chains=[];try{const cs=await srvChains();
    cs.map(c=>c.name).filter(Boolean).sort((a,b)=>b.length-a.length).forEach(n=>{const rx=new RegExp('\\s(?:או\\s+|ו)?ב-?'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=\\s|$)');if(rx.test(' '+q)){chains.push(n);q=(' '+q).replace(rx,' ').trim();}});}catch(e){}
  q=q.replace(/\s+(?:או|ו)$/,'').trim();
  if(!q&&!isList)return false;
  const ps=(window.myStores?myStores():[]);
  const city=cq.city||((meData().address||{}).city)||state.geoCity||userCity();
  const items=isList?srvItemsParam(curList().items.filter(i=>!i.done)):q.replace(/[|*\n]/g,' ');
  if(!items){botSay(T('הרשימה ריקה 🙂','The list is empty 🙂'));return true;}
  const hid=srvHidden();
  const params=mine&&ps.length?{items,stores:ps.map(s=>s.store).join(','),limit:MYST_MAX}:{items,city,chain:'',limit:60,exclude:hid.join(',')};
  let d=null;try{d=await priceApi('/compare',params);}catch(e){return false;}
  let st=(d&&d.stores||[]).filter(s=>s.found>0&&!hid.includes(s.chain));
  /* "שופרסל" כולל גם את "שופרסל דיל" / "שופרסל שלי" — כל תת-רשת מגיעה כרשת נפרדת */const chainIs=(s,n)=>{const a=norm(s.chain_name),c=norm(n);return a===c||a.startsWith(c+' ');};
  if(chains.length)st=st.filter(s=>chains.some(n=>chainIs(s,n)));
  const where=mine&&ps.length?T('בחנויות שלך','in your stores'):'ב'+city;
  if(!st.length){if(isList||chains.length||mine){botSay('🤷 '+T('לא מצאתי מחירים '+where+(chains.length?' ב'+chains.join(' / '):'')+' ל"'+(isList?'הרשימה':q)+'".','No prices found.'));return true;}return false;}
  const cur=myCurrency();const MED=['🥇','🥈','🥉'];const n=(d.items||[]).length;
  const full=st.filter(s=>s.found===n);const rank=(full.length?full:st).slice().sort((a,b)=>a.total-b.total);
  const line=(s,i)=>(MED[i]||'•')+' '+fmtPrice(s.total,cur)+' · '+myStLabel(s)+(s.online?' ('+srvAddr(s)+')':s.address?' ('+s.address+')':'')+(n===1&&s.lines[0]&&s.lines[0].found?'\n   '+s.lines[0].name+(s.lines[0].deal?' · 🔥 '+(s.lines[0].deal.text||T('מבצע','deal')):''):(n>1&&s.found<n?' · '+T('יש '+s.found+' מתוך '+n,s.found+' of '+n):''));
  let msg='💰 '+(isList?T('כל הרשימה ('+n+' מוצרים)','Your list ('+n+' items)'):q)+' '+where+(chains.length?' — '+chains.join(' מול '):'')+':\n';
  if(chains.length>1){/* השוואה בין רשתות: הסניף הכי זול מכל רשת */
    const per=chains.map(c=>rank.find(s=>chainIs(s,c))).filter(Boolean).sort((a,b)=>a.total-b.total);
    msg+=per.map(line).join('\n');
    if(per.length>1&&per[per.length-1].total>per[0].total)msg+='\n\n✅ '+T('הכי זול ב'+per[0].chain_name+' — חוסכים '+fmtPrice(rnd2(per[per.length-1].total-per[0].total),cur),'Cheapest at '+per[0].chain_name);
  }else{
    msg+=rank.slice(0,4).map(line).join('\n');
    if(rank.length>4){const top=rank[rank.length-1];msg+='\n…\n'+T('הכי יקר מתוך '+rank.length+' חנויות: ','Most expensive of '+rank.length+': ')+fmtPrice(top.total,cur)+' · '+myStLabel(top);}
  }
  if(isList&&full.length<st.length)msg+='\n🤷 '+T('בחלק מהחנויות חסרים מוצרים — הדירוג לפי חנויות שיש בהן הכל.','Some stores are missing items.');
  if(d.missing&&d.missing.length)msg+='\n🤷 '+T('לא נמצאו: ','Not found: ')+d.missing.join(', ');
  msg+='\n\n📊 '+T('לפי קבצי המחירים הרשמיים של הרשתות. לפירוט: לשונית 💰 מחירים וחנויות.','From the chains\' official price files.');
  botSay(msg);return true;}
window.yamiSrvPrice=yamiSrvPrice;
yamiStep(yamiSrvPrice);

/* ---------- ראש המסך: 💬 התכתבות עם האתר ליד הפעמון (עם מספר הודעות חדשות). בתפריט ⚙️ בלי כפילויות:
   שיתוף האתר — בכפתור "שתפו אותי" למעלה, התראות — בפעמון, והתכתבות נשארת רק בתוך "קשר עם האתר" ---------- */
(function(){const n=$t('#miNotif');if(n){n.hidden=true;n.dataset.gone='1';}
  const old=$t('#miShareSite');if(old)old.remove();
  const c=$t('#btnChat'),bell=$t('#btnBell');if(c&&bell)bell.parentNode.insertBefore(c,bell);
  /* מנהל: 💬 פותח את ההתכתבות עם המשתמשים (כמו "הודעות למשתמשים"), והמספר עליו = הודעות ממשתמשים שעוד לא נקראו */
  if(!c)return;const adm=()=>typeof isAdmin==='function'&&isAdmin()&&typeof openAdminChat161==='function';
  const label=()=>{const t=adm()?T('הודעות מהמשתמשים','Messages from users'):T('התכתבות עם האתר','Chat with us');c.title=t;c.setAttribute('aria-label',t);};
  let busy=false;const badge=async()=>{label();if(!adm()||!sb||busy)return;busy=true;
    try{const {data,error}=await sb.rpc('support_threads');if(error||!adm())return;const n=(data||[]).reduce((a,x)=>a+(Number(x.unread)||0),0);
      const bd=$t('#chatBadge');if(bd){bd.hidden=!n;bd.textContent=n>99?'99+':String(n);}}catch(e){}finally{busy=false;}};
  c.onclick=e=>{e.stopPropagation();if(adm())openAdminChat161();else openChat();};
  const _lc=loadChat;loadChat=async function(){const r=await _lc.apply(this,arguments);if(adm())badge();return r;};
  window.admChatBadge=badge;
  /* אחרי שהמנהל סוגר את חלון ההודעות — המספר מתעדכן מיד */
  const sh=$t('#v8Sheet');if(sh)new MutationObserver(()=>{if(adm()&&!sh.classList.contains('open'))badge();}).observe(sh,{attributes:true,attributeFilter:['class']});
  setTimeout(badge,4000);setInterval(()=>{if(document.visibilityState==='visible')badge();},30000);})();

/* ---------- ⭐ שורת המוצרים המהירים: בלי ✕ — לחיצה מוסיפה, לחיצה ארוכה (או ✏️) פותחת עריכה ---------- */
function favEdit(focus){
  const hidden=state.favHidden||[];
  const favs=Object.entries(state.stats||{}).filter(f=>!hidden.includes(f[0])).sort((a,b)=>b[1]-a[1]).slice(0,6).map(f=>f[0]);
  const b=openSheet('⭐ '+T('עריכת המוצרים המהירים','Edit quick items'),
    '<p class="muted-note">'+T('אלה המוצרים שקונים הכי הרבה. לחיצה עליהם ברשימה מוסיפה אותם. כאן אפשר להוריד מוצר מהשורה, להחזיר מוצר שהורד, או להסתיר את כל השורה.','Your most bought items. Remove one, restore one, or hide the row.')+'</p>'+
    favs.map(n=>'<div class="merow'+(n===focus?' favfocus':'')+'"><span>⭐</span><span class="grow">'+esc(n)+'</span><button class="mini bad" data-favrm="'+esc(n)+'">🗑️ '+T('להוריד מהשורה','Remove')+'</button></div>').join('')+
    (hidden.length?'<h4 class="mysth">'+T('הורדו מהשורה','Removed')+'</h4>'+hidden.map(n=>'<div class="merow"><span>▫️</span><span class="grow">'+esc(n)+'</span><button class="mini" data-favback="'+esc(n)+'">↩️ '+T('להחזיר','Restore')+'</button></div>').join(''):'')+
    '<div class="row2" style="margin-top:10px"><button class="sec" data-favrowhide="1">🙈 '+T('להסתיר את כל השורה','Hide the whole row')+'</button></div>');
  b.onclick=e=>{const rm=e.target.closest('[data-favrm]'),bk=e.target.closest('[data-favback]');
    if(rm){state.favHidden=Array.from(new Set((state.favHidden||[]).concat(rm.dataset.favrm)));save(true);render();favEdit();return;}
    if(bk){state.favHidden=(state.favHidden||[]).filter(x=>x!==bk.dataset.favback);save(true);render();favEdit();return;}
    if(e.target.closest('[data-favrowhide]')){state.hideFavs=true;save(true);render();$t('#v8Sheet').classList.remove('open');flash(T('שורת המוצרים המהירים הוסתרה — אפשר להחזיר בתפריט ⚙️','Hidden — restore from ⚙️ menu'));}};}
window.favEdit=favEdit;
function favTidy(){const fr=$t('#favs');if(!fr||fr.style.display==='none')return;
  /* ✏️ פותח מצב עריכה מהיר: ✖ על כל מוצר מוריד אותו מיד מהשורה, בלי לפתוח חלון. ✔ מסיים, ⚙️ פותח את העריכה המלאה */
  const ed=!!window.favQuick;fr.classList.toggle('fquick',ed);
  fr.querySelectorAll(ed?'.favhide':'.favx,.favhide').forEach(x=>x.remove());
  fr.querySelectorAll('.favx').forEach(x=>{x.textContent='✖';x.title=T('להוריד מהשורה','Remove');});
  fr.querySelectorAll('.fav').forEach(b=>{b.title=ed?T('✖ מוריד מהשורה','✖ removes'):T('לחיצה מוסיפה לרשימה · ✏️ לעריכה מהירה','Tap to add · ✏️ to edit');});
  fr.querySelectorAll('.favedit,.favmore').forEach(x=>x.remove());
  /* במצב עריכה ✔ ו-⚙️ בתחילת השורה (ליד ⭐), שלא יברחו מחוץ למסך כשהשורה ארוכה */
  const at=ed&&fr.firstElementChild?fr.firstElementChild:null,put=h=>at?at.insertAdjacentHTML('afterend',h):fr.insertAdjacentHTML('beforeend',h);
  if(ed)put('<button class="favmore" data-favmore="1" title="'+T('עוד אפשרויות (להחזיר מוצר, להסתיר את השורה)','More options')+'" aria-label="'+T('עוד אפשרויות','More options')+'">⚙️</button>');
  put('<button class="favedit" data-favedit="1" title="'+(ed?T('סיום עריכה','Done'):T('עריכת המוצרים המהירים','Edit quick items'))+'" aria-label="'+(ed?T('סיום עריכה','Done'):T('עריכת המוצרים המהירים','Edit quick items'))+'">'+(ed?'✔':'✏️')+'</button>');}
const _favRender=render;
render=function(){const r=_favRender.apply(this,arguments);try{favTidy();}catch(e){}return r;};
favTidy();
(function(){const fr=$t('#favs');if(!fr)return;let tm=0,fired=false,sx=0,sy=0;
  fr.addEventListener('pointerdown',e=>{const f=e.target.closest('.fav');if(!f)return;fired=false;sx=e.clientX;sy=e.clientY;clearTimeout(tm);
    tm=setTimeout(()=>{fired=true;if(navigator.vibrate)try{navigator.vibrate(15);}catch(err){}favEdit(f.dataset.fav);},550);});
  fr.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)>10)clearTimeout(tm);});
  ['pointerup','pointercancel','pointerleave'].forEach(k=>fr.addEventListener(k,()=>clearTimeout(tm)));
  fr.addEventListener('contextmenu',e=>{const f=e.target.closest('.fav');if(!f)return;e.preventDefault();clearTimeout(tm);if(!fired)favEdit(f.dataset.fav);fired=true;});
  /* אחרי לחיצה ארוכה — לא להוסיף את המוצר לרשימה */
  fr.addEventListener('click',e=>{if(e.target.closest('[data-favedit]')){e.stopPropagation();window.favQuick=!window.favQuick;render();return;}
    if(e.target.closest('[data-favmore]')){e.stopPropagation();window.favQuick=false;render();favEdit();return;}
    if(window.favQuick&&e.target.closest('.fav')){e.stopPropagation();e.preventDefault();return;}
    if(fired&&e.target.closest('.fav')){e.stopPropagation();e.preventDefault();fired=false;}},true);})();
})();
