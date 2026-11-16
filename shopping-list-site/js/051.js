
/* ================= ✂️ כמה מוצרים בשורה אחת: "חומוס טחינה וחלב" ← חומוס · טחינה · חלב =================
   בפעם-פעמיים הראשונות שואלים אם לחלק. אחרי שתי תשובות זהות ברצף — עושים כך לבד (עם "ביטול" אחרי חלוקה אוטומטית).
   מחלקים רק כשלפחות שתי מילים הן מוצרים שאנחנו מכירים, ושם מוצר מוכר ("גבינה צהובה", "שמן זית") לא מתפרק */
(function(){
const $56=s=>document.querySelector(s);
[['סיגריות','🚬','אחר'],['סוללות','🔋','אחר']].forEach(([n,e,c])=>{if(!P[n]){P[n]={e,c};NORMP[norm(n)]=n;}});
{const al={'סיגריה':'סיגריות','סגריות':'סיגריות','מסכת פנים':'מסכות פנים','מסיכת פנים':'מסכות פנים','מסיכות פנים':'מסכות פנים','מסכה לפנים':'מסכות פנים','בטריות':'סוללות'};
  Object.keys(al).forEach(a=>{if(!NORMP[norm(a)]&&P[al[a]])NORMP[norm(a)]=al[a];});}
const CMD56=/^(אין לי|אין בבית|נגמר לי|נגמרו לי|נגמר|נגמרו|חסר לי|חסר|אזל|אזלו|יש לי|יש בבית|קניתי)\s/;
function splitPref56(){const s=state.splitPref&&Array.isArray(state.splitPref.a)?state.splitPref:(state.splitPref={a:[]});return s;}
/* 'split' / 'keep' אחרי שתי תשובות זהות אחרונות, אחרת 'ask' */
function splitMode56(){const a=splitPref56().a,n=a.length;return n>=2&&a[n-1]===a[n-2]?(a[n-1]==='y'?'split':'keep'):'ask';}
function splitAnswer56(x){const s=splitPref56();s.a=s.a.concat(x).slice(-4);save();}
/* מה היה נכנס בלי חלוקה, ומה נכנס עם חלוקה לפי שמות מוצרים */
function splitPlan56(v){if(!v||CMD56.test(norm(v))||hasProfanity(v)||typeof voiceItems45!=='function')return null;
  const base=parseItems(v),smart=voiceItems45(v);
  return smart.length>=2&&smart.length>base.length&&smart.filter(i=>P[i.name]).length>=2?smart:null;}
/* דרך addItem — כדי שהרשאות ("אין לך הרשאה להוסיף"), "מי הוסיף" וכמות שמתחברת לפריט קיים יעבדו כרגיל */
function addMany56(its,q){const l=curList(),before=new Set(l.items.map(x=>x.id));
  its.forEach(i=>addItem(i.name,i.qty||q||''));
  return curList().items.filter(x=>!before.has(x.id)).map(x=>x.id);}
const _v56SendCurrent=sendCurrent;
function keep56(v,q){const el=$56('#inText'),qi=$56('#inQty');el.value=v;if(qi)qi.value=q;_v56SendCurrent();}
function doSplit56(v,its,q,auto){$56('#inText').value='';const qi=$56('#inQty');if(qi)qi.value='';
  const ids=addMany56(its,q);const names=its.map(i=>i.name).join(' · ');
  if(auto)showUndo('✂️ '+T('חילקתי ל-'+its.length+' מוצרים: '+names,'Split into '+its.length+': '+names),()=>{
    const l=curList();const gone=l.items.filter(x=>ids.includes(x.id));l.items=l.items.filter(x=>!ids.includes(x.id));if(gone.length)tombAdd('items',gone);save();render();splitAnswer56('n');keep56(v,q);});
  else flash('✂️ '+T('נוספו '+its.length+' מוצרים: ','Added '+its.length+': ')+names);}
function ask56(v,its,q){let o=$56('#split56');
  if(!o){o=document.createElement('div');o.id='split56';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-labelledby','split56t');document.body.appendChild(o);
    const st=document.createElement('style');st.textContent=
      '#split56{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}#split56[hidden]{display:none}'+
      '#split56 .scard{background:var(--panel,#fff);color:var(--text);width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:16px 16px 22px;box-sizing:border-box}'+
      '#split56 b.t{display:block;font-size:18px;margin-bottom:4px}#split56 .typed{color:var(--muted);margin:0 0 10px;font-size:15px}'+
      '#split56 .chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}#split56 .chips span{border:1px solid var(--chipbr);background:var(--inputbg);border-radius:16px;padding:6px 10px;font-size:15px}'+
      '#split56 .btns{display:flex;gap:8px}#split56 .btns button{flex:1;padding:12px;border-radius:12px;border:0;background:var(--hdr2);color:#fff;font:inherit;font-weight:700;cursor:pointer}'+
      '#split56 .btns button.sec{background:var(--chipbg);color:var(--text)}#split56 small{display:block;color:var(--muted);margin-top:10px;font-size:13px}';
    document.head.appendChild(st);}
  o.innerHTML='<div class="scard"><b class="t" id="split56t">✂️ '+T('לחלק ל-'+its.length+' מוצרים נפרדים?','Split into '+its.length+' separate items?')+'</b>'+
    '<p class="typed">'+T('כתבת: ','You typed: ')+'"'+esc(v)+'"</p>'+
    '<div class="chips">'+its.map(i=>'<span>'+emojiOf(i.name)+' '+esc(i.name)+(i.qty?' ×'+esc(i.qty):'')+'</span>').join('')+'</div>'+
    '<div class="btns"><button type="button" data-s56="y">✂️ '+T('כן, לחלק','Yes, split')+'</button><button type="button" class="sec" data-s56="n">📝 '+T('להשאיר כמו שכתבתי','Keep as typed')+'</button></div>'+
    '<small>'+T('נשאל פעם-פעמיים, ואחר כך נזכור מה נוח לך.','We will ask once or twice, then remember what you prefer.')+'</small></div>';
  o.hidden=false;const close=()=>{o.hidden=true;o.onclick=null;o.onkeydown=null;const el=$56('#inText');try{el&&el.focus();}catch(e){}};
  o.onclick=e=>{if(e.target===o){close();return;}const b=e.target.closest('[data-s56]');if(!b)return;const yes=b.dataset.s56==='y';close();splitAnswer56(yes?'y':'n');
    if(yes)doSplit56(v,its,q,false);else keep56(v,q);};
  o.onkeydown=e=>{if(e.key==='Escape')close();};
  setTimeout(()=>{const b=o.querySelector('[data-s56="y"]');if(b)b.focus();},30);}
sendCurrent=function(){const el=$56('#inText');const v=(el&&el.value||'').trim();const its=splitPlan56(v);if(!its)return _v56SendCurrent();
  const q=(($56('#inQty')||{}).value||'').trim();const mode=splitMode56();
  if(mode==='keep')return _v56SendCurrent();
  if(mode==='split'){doSplit56(v,its,q,true);return;}
  el.value='';ask56(v,its,q);};
window.splitPlan56=splitPlan56;
})();
