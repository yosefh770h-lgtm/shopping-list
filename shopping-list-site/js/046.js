
/* ================= v45: 📷 סריקת ברקוד ישר משורת ההוספה · כל מוצר בקטגוריה המדויקת שלו ================= */
/* סדר הקביעה: מה שאני תיקנתי למוצר (נשמר אצלי) ← מה שהמנהל קבע במאגר המוצרים (לכולם) ← המאגר המובנה ← ניחוש לפי השם */
try{
const $45=s=>document.querySelector(s);
const catOk45=c=>!!c&&CATS.includes(c);
const myCat45=n=>{try{const m=myProd[n]||myProd[NORMP[norm(n)]];return m&&catOk45(m.category)?m.category:'';}catch(e){return '';}};
const dbCat45=n=>{try{const k=norm(n);const p=dbProducts.find(x=>norm(x.brand?x.name+' '+x.brand:x.name)===k);return p&&catOk45(p.category)?p.category:'';}catch(e){return '';}};
const _v45Resolve=resolveCat;
resolveCat=function(n){n=String(n||'');const m=myCat45(n);if(m)return m;if(P[n]&&P[n].c)return P[n].c;const k=NORMP[norm(n)];if(k&&P[k]&&P[k].c)return P[k].c;return _v45Resolve(n);};
/* מוצרים שכבר ברשימות: מעדכנים לקטגוריה הנכונה — אבל לא נוגעים במה שבחרתם בעצמכם */
function recat45(){let ch=false;
  (state.lists||[]).forEach(l=>(l.items||[]).forEach(i=>{if(i.cm)return;
    const want=myCat45(i.n)||dbCat45(i.n)||(!catOk45(i.c)||i.c==='אחר'?resolveCat(i.n):'');
    if(want&&catOk45(want)&&want!==i.c){i.c=want;ch=true;}}));
  if(ch){save();render();}}
const _v45LoadDb=loadDbProducts;
loadDbProducts=async function(){const r=await _v45LoadDb.apply(this,arguments);try{
  /* קטגוריה שהמנהל קבע במאגר גוברת על הניחוש המובנה */
  dbProducts.forEach(p=>{if(!catOk45(p.category))return;const full=p.brand?(p.name+' '+p.brand).trim():p.name;if(P[full])P[full].c=p.category;if(!p.brand&&P[p.name])P[p.name].c=p.category;});
  recat45();}catch(e){console.warn('v45 db',e);}return r;};
const _v45LoadMine=loadMyProducts;
loadMyProducts=async function(){const r=await _v45LoadMine.apply(this,arguments);try{recat45();}catch(e){}return r;};
setTimeout(()=>{try{recat45();}catch(e){}},1200);

/* מנהל: תיקון קטגוריה במאגר המוצרים — משפיע על כל המשתמשים */
async function catalogSetCat45(n,c){if(!sb||!isAdmin()||!catOk45(c))return false;
  const k=norm(n);const m=dbProducts.find(p=>norm(p.brand?p.name+' '+p.brand:p.name)===k);
  let r;
  if(m)r=await sb.from('products').update({category:c}).eq('name',m.name).eq('brand',m.brand||'').select('name');
  else{r=await sb.from('products').insert({name:n.slice(0,80),category:c,emoji:cleanEmo((P[n]&&P[n].e)||'',n).slice(0,16)}).select('name');
    if(r.error&&r.error.code==='23505')r=await sb.from('products').update({category:c}).eq('name_key',k).eq('brand','').select('name');}
  if(r.error){flash('⚠️ '+r.error.message);return false;}
  if(m)m.category=c;else dbProducts.push({name:n,brand:'',category:c,barcode:null,emoji:''});
  if(P[n])P[n].c=c;else{P[n]={e:CATE[c]||'🛒',c};NORMP[k]=n;}
  recat45();return true;}

/* עריכת מוצר ברשימה: הקטגוריה שבחרתם נזכרת לפעם הבאה; למנהל — גם תיקון לכולם */
let ie45=null;
const _v45OpenItemEdit=openItemEdit;
openItemEdit=function(id){const res=_v45OpenItemEdit.apply(this,arguments);try{
  const it=curList().items.find(x=>x.id===id);const b=$45('#v8SheetBody');const sel=b&&b.querySelector('#ieCat');if(!it||!sel)return res;
  ie45={id,n:it.n,c:it.c};
  const grid=sel.closest('.grid2');
  grid.insertAdjacentHTML('afterend','<p class="muted-note" style="margin:4px 2px 8px">📂 '+T('קטגוריה לא נכונה? משנים כאן — ומעכשיו המוצר ייכנס אליה תמיד.','Wrong category? Change it here — it will be remembered.')+'</p>'+
    (isAdmin()&&sb?'<label class="ie45adm" style="display:flex;gap:8px;align-items:center;justify-content:flex-start;margin:0 2px 10px;font-size:14px"><input type="checkbox" id="ieAll45" style="width:20px;height:20px;flex:0 0 auto;margin:0"><span style="flex:1">🛠️ '+T('לתקן במאגר המוצרים — לכל המשתמשים','Fix in the catalog for everyone')+'</span></label>':''));
}catch(e){console.warn('v45 edit',e);}return res;};
$45('#v8SheetBody').addEventListener('click',e=>{if(!e.target.closest||!e.target.closest('#ieSave')||!ie45)return;
  const b=$45('#v8SheetBody');const name=(b.querySelector('#ieName').value||'').trim(),cat=b.querySelector('#ieCat').value,all=!!(b.querySelector('#ieAll45')&&b.querySelector('#ieAll45').checked);const was=ie45;
  setTimeout(()=>{const it=curList().items.find(x=>x.id===was.id);if(!it||it.n!==name)return;
    if(cat!==was.c){it.cm=1;myProdSet(name,{category:cat});}
    else if(name!==was.n&&!it.cm){it.c=resolveCat(name);it.e=(P[name]&&P[name].e)||CATE[it.c]||emojiOf(name);}
    save();render();
    if(all)catalogSetCat45(name,cat).then(okk=>{if(okk)flash('🛠️ '+T('תוקן במאגר — לכל המשתמשים','Fixed for everyone'));});},0);},true);

/* מוצר חדש שבחרתם לו קטגוריה (החלון "לאיזו קטגוריה?") — נזכר גם אחרי רענון */
document.addEventListener('click',e=>{const ok=e.target.closest&&e.target.closest('#unkOk');if(!ok)return;
  const picks=[...$45('#v8SheetBody').querySelectorAll('[data-unk]')].filter(r=>r.querySelector('[data-f=on]').checked).map(r=>({n:(r.querySelector('[data-f=name]').value.trim().slice(0,60)||r.dataset.orig),c:r.querySelector('[data-f=cat]').value}));
  setTimeout(()=>{let ch=false;picks.forEach(p=>{if(!catOk45(p.c))return;myProdSet(p.n,{category:p.c});curList().items.forEach(i=>{if(i.n===p.n){i.cm=1;ch=true;}});});if(ch)save();},0);},true);

/* ברקוד שלימדתם אותי (מוצר שלא היה במאגר) — בפעם הבאה מזהים אותו לבד */
const myBarcode45=code=>{try{for(const k in myProd){if(myProd[k]&&myProd[k].barcode===code)return myProd[k].name||k;}}catch(e){}return '';};
const _v45NameFor=nameForBarcode;
nameForBarcode=async function(code){return myBarcode45(code)||await _v45NameFor.apply(this,arguments);};

/* חלון הברקוד: מראים את הקטגוריה ואפשר לתקן לפני ההוספה */
const _v45Lookup=lookupBarcode;
lookupBarcode=async function(code){const r=await _v45Lookup.apply(this,arguments);try{
  const b=$45('#v8SheetBody');const add=b&&b.querySelector('#bcAdd');const nm=b&&b.querySelector('#bcName');if(!add||!nm)return r;
  const unknown=nm.type!=='hidden';if(unknown&&!nm.value)nm.value=myBarcode45(code);
  const guess=()=>{const n=nm.value.trim();const d=dbProducts.find(p=>p.barcode===code);return (d&&catOk45(d.category)&&!myCat45(n))?d.category:(n?resolveCat(n):'אחר');};
  add.closest('.row2').insertAdjacentHTML('beforebegin','<label class="il" for="bcCat45">📂 '+T('קטגוריה','Category')+'</label><select id="bcCat45">'+CATS.map(c=>'<option value="'+esc(c)+'">'+(CATE[c]||'')+' '+esc(c)+'</option>').join('')+'</select>');
  const sel=b.querySelector('#bcCat45');sel.value=guess();let touched=false;
  sel.onchange=()=>{touched=true;};if(unknown)nm.addEventListener('input',()=>{if(!touched)sel.value=guess();});
  add.onclick=()=>{const n=nm.value.trim();if(!n){flash(T('מה שם המוצר?','Product name?'));return;}if(hasProfanity(n)){flash('🙏');return;}
    const c=sel.value,g=guess();
    if(!P[n]&&!NORMP[norm(n)]){P[n]={e:CATE[c]||'🛒',c};NORMP[norm(n)]=n;}
    addItem(n,'');
    const it=curList().items.find(i=>i.n===n&&!i.done);
    if(it&&it.c!==c){it.c=c;it.e=(P[n]&&P[n].e)||CATE[c]||emojiOf(n);}
    if(it&&c!==g)it.cm=1;
    if(c!==g||unknown)myProdSet(n,Object.assign({category:c},unknown?{barcode:code}:{}));
    save();render();closeSheet();$45('#catOverlay').classList.remove('open');};
}catch(e){console.warn('v45 barcode',e);}return r;};

/* 📷 בשורת ההוספה — לידו ➕ ו-🎤. סריקה אחת ← רואים מה המוצר, באיזו קטגוריה ואיפה הכי זול; "🔁 סריקה רציפה" — מוצר אחרי מוצר ישר לרשימה */
$45('#btnScan45').onclick=()=>{if(typeof can15==='function'&&!can15('add')){flash(T('⛔ אין לך הרשאה להוסיף מוצרים','⛔ No permission to add'));return;}openBarcodeScanner(listScan);};
}catch(e){console.warn('v45',e);}
