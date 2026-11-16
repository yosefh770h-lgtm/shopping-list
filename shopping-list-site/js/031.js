
/* ================= v23: קרדיט למדווחים — ממלא את החריצים (crSlot) בשמות =================
   משתמש רגיל: "דווח ע״י ..." רק כשהשם מוצג לכולם (לפי ההגדרה הכללית לסוג התוכן, או לפי המנהל לפריט הזה).
   מנהל / צוות: תמיד רואים את השם (+ מייל וקישור למשתמש — מנהל). למנהל יש גם כפתור: ברירת מחדל → הצג שם → הסתר שם. */
const CR23_CFG={prices:'prices',recipes:'recipes',torah:'torah',reviews:'reviews',clothing:'clothing',shops:'clothing'};
const CR23_TABLE={prices:'prices',recipes:'recipes',torah:'divrei_torah',reviews:'site_reviews',clothing:'store_recs',shops:'clothing_shops'};
let cr23Cache={},cr23Who='',cr23Timer=null,cr23Busy=false;
(function(){const st=document.createElement('style');st.textContent=
  '.cr23:empty{display:none}.cr23blk{display:block;font-size:12px;margin-top:2px;color:var(--muted)}'+
  '.cr23.cr23adm{display:inline-flex;flex-wrap:wrap;align-items:center;gap:3px 4px;vertical-align:middle}.cr23.cr23adm.cr23blk{display:flex}.cr23 .cr23n{font-weight:600;white-space:nowrap}.cr23 .cr23e{font-size:11px;opacity:.85;unicode-bidi:isolate}'+
  '.cr23 .cr23u{font:inherit;font-size:11px;padding:0 6px;border-radius:9px;border:1px solid var(--line);background:transparent;color:inherit;cursor:pointer}'+
  '.cr23 .cr23b{font:inherit;font-size:11px;padding:1px 7px;border-radius:10px;border:1px solid var(--line);background:transparent;color:inherit;cursor:pointer;white-space:nowrap}'+
  '.cr23 .cr23b.on{border-color:#2e7d32}.cr23 .cr23b.off{border-color:#b23b3b}.cr23 .cr23st{font-size:11px;margin-inline-start:3px}';
  document.head.appendChild(st);})();
/* ההגדרה הכללית מגיעה עם שאר ההגדרות (site_config 'credits') */
const _v23ApplyConfig=applyConfig;
applyConfig=function(k,v){if(k==='credits'){credCfg23=(v&&typeof v==='object')?v:{};cr23Redraw();return;}return _v23ApplyConfig.apply(this,arguments);};
function cr23Vis(kind,c){if(!c)return false;if(c.sys)return true;if(c.s===true||c.s===false)return c.s;const k=CR23_CFG[kind];return !!(k&&credCfg23[k]===true);}
function cr23Viewer(){return ((authUser&&authUser.id)||'-')+'|'+(isStaff()?1:0)+(isAdmin()?1:0);}
function cr23Html(kind,id,el){const c=(cr23Cache[kind]||{})[id];const p=el.dataset.crp||'',s=el.dataset.crs||'',f=el.dataset.crf||'';
  if(!isStaff()||el.dataset.crt)return c&&c.n&&(cr23Vis(kind,c)||isStaff())?esc(p+c.n+s):esc(f);
  if(!c||!c.n)return f?esc(f):'';
  const vis=cr23Vis(kind,c),adm=isAdmin();
  let h='<b class="cr23n" title="'+esc((c.e||'')+(CR23_CFG[kind]&&!c.sys?(vis?' · השם מוצג לכולם':' · השם מוסתר מהציבור'):''))+'">👤 '+esc(c.n)+'</b>';
  if(adm&&c.e&&el.closest('#bo'))h+='<span class="cr23e" dir="ltr">'+esc(c.e)+'</span>';
  if(adm&&c.u)h+='<button type="button" class="cr23u" data-cr23u="'+esc(c.e||c.n)+'" title="פתיחת המשתמש בבק אופיס">👥</button>';
  if(CR23_CFG[kind]&&!c.sys){
    if(adm){const lab=c.s===true?'👁️ הצג שם':c.s===false?'🙈 הסתר שם':'⚙️ לפי ברירת מחדל ('+(vis?'מוצג':'מוסתר')+')';
      h+='<button type="button" class="cr23b'+(c.s===true?' on':c.s===false?' off':'')+'" data-cr23b="'+esc(kind)+'|'+esc(id)+'" title="מי רואה את שם המדווח? לחיצה מחליפה: לפי ברירת מחדל → הצג שם → הסתר שם">'+lab+'</button>';}
    else h+='<small class="cr23st" title="'+(vis?'השם מוצג לכולם':'השם מוסתר מהציבור')+'">'+(vis?'👁️':'🙈')+'</small>';}
  return h+(s?'<span>'+esc(s)+'</span>':'');}
function cr23Paint(el){const [kind,id]=(el.dataset.crn||'').split('|');if(!kind||!id)return;el.innerHTML=cr23Html(kind,id,el);el.classList.toggle('cr23adm',isStaff()&&!el.dataset.crt&&!!el.querySelector('.cr23n'));el.dataset.crdone='1';}
function cr23Redraw(){document.querySelectorAll('[data-crn][data-crdone]').forEach(el=>{const [k,id]=el.dataset.crn.split('|');if((cr23Cache[k]||{})[id]!==undefined)cr23Paint(el);});}
/* שולף מהשרת את מה שעוד לא במטמון (לכל סוג — בקשה אחת, עד 300 בכל פעם) */
async function cr23Load(kind,ids){if(!sb||!ids.length)return;const m=cr23Cache[kind]=cr23Cache[kind]||{};
  for(let i=0;i<ids.length;i+=300){const part=ids.slice(i,i+300);part.forEach(id=>{if(!(id in m))m[id]=null;});
    try{const {data,error}=await sb.rpc('credit_names',{p_kind:kind,p_ids:part});if(error)continue;
      if(data&&typeof data==='object'&&!Array.isArray(data))Object.keys(data).forEach(id=>{m[id]=data[id]||null;});}catch(e){}}}
async function cr23Scan(){cr23Timer=null;if(cr23Busy){cr23Timer=setTimeout(cr23Scan,120);return;}
  const who=cr23Viewer();if(who!==cr23Who){cr23Who=who;cr23Cache={};document.querySelectorAll('[data-crn][data-crdone]').forEach(el=>delete el.dataset.crdone);}
  const els=[...document.querySelectorAll('[data-crn]:not([data-crdone])')];if(!els.length)return;
  const need={};els.forEach(el=>{const [k,id]=el.dataset.crn.split('|');if(!k||!id)return;if(!((cr23Cache[k]||{}).hasOwnProperty(id)))(need[k]=need[k]||new Set()).add(id);});
  cr23Busy=true;try{await Promise.all(Object.keys(need).map(k=>cr23Load(k,[...need[k]])));}finally{cr23Busy=false;}
  els.forEach(el=>{if(el.isConnected)cr23Paint(el);});}
function cr23Kick(){if(!cr23Timer)cr23Timer=setTimeout(cr23Scan,40);}
new MutationObserver(muts=>{for(const m of muts){if(m.addedNodes&&m.addedNodes.length){cr23Kick();return;}}}).observe(document.documentElement,{childList:true,subtree:true});
/* אחרי כניסה / שינוי תפקיד — מציירים מחדש לפי מי שמסתכל */
const _v23ApplyAdminUi=applyAdminUi;applyAdminUi=function(){const r=_v23ApplyAdminUi.apply(this,arguments);cr23Kick();return r;};
/* שמות גלויים לטקסט (למשל דבר תורה ששולחים מיאמי) — רק מה שמוצג לכולם */
async function crFill23(kind,rows,field){if(!rows||!rows.length)return rows;const ids=[...new Set(rows.map(r=>r&&r.id).filter(Boolean))].filter(id=>!((cr23Cache[kind]||{}).hasOwnProperty(id)));
  await cr23Load(kind,ids);const m=cr23Cache[kind]||{};rows.forEach(r=>{const c=r&&m[r.id];r[field]=c&&c.n&&cr23Vis(kind,c)?c.n:'';});return rows;}
/* כפתור המנהל: ברירת מחדל → הצג שם → הסתר שם */
document.addEventListener('click',async e=>{
  const u=e.target.closest&&e.target.closest('[data-cr23u]');
  if(u){e.preventDefault();e.stopPropagation();if(isAdmin()&&typeof window.boOpenUser23==='function')window.boOpenUser23(u.dataset.cr23u);return;}
  const b=e.target.closest&&e.target.closest('[data-cr23b]');if(!b)return;e.preventDefault();e.stopPropagation();
  if(!isAdmin()||!sb)return;const [kind,id]=b.dataset.cr23b.split('|');const c=(cr23Cache[kind]||{})[id];if(!c||!CR23_TABLE[kind])return;
  const next=c.s===true?false:c.s===false?null:true;b.disabled=true;
  const {error}=await sb.from(CR23_TABLE[kind]).update({show_author:next}).eq('id',id);b.disabled=false;
  if(error){flash('⚠️ '+error.message);return;}
  c.s=next;if(next===null)delete c.s;
  document.querySelectorAll('[data-crn="'+kind+'|'+id+'"]').forEach(cr23Paint);
  flash(next===true?'👁️ שם המדווח יוצג לכולם בפריט הזה':next===false?'🙈 שם המדווח מוסתר בפריט הזה':'⚙️ הפריט חזר לברירת המחדל ('+(cr23Vis(kind,c)?'מוצג':'מוסתר')+')');},true);
