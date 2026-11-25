
/* ================= גרסה 16.1: כל הטקסטים ניתנים לעריכה מהבק אופיס, צ׳אט של המנהל עם כל משתמש מתוך האתר, הודעה לכל המשתמשים ================= */
const $161=s=>document.querySelector(s);

/* ---------- טקסטים מהבק אופיס (site_config: texts) ---------- */
let textRules161=[];
/* מתכונים ודברי תורה הוסרו (נובמבר 2026): גם טקסט ששמור בבק אופיס (אודות, סיור, מה חדש, איך עושים) לא מזכיר אותם */
const OFF_RX161=/מתכון|מתכונים|מתכוני|recipe|דבר תורה|דברי תורה|דבר התורה|וורט|ד״ת|dvar torah|divrei torah/i;
function offRx161(){return OFF_RX161;}
function cleanOff161(s){const rx=offRx161();if(typeof s!=='string'||!rx||!rx.test(s))return s;
  s=s.replace(/(,\s*|\s+ו)מתכונים(\s*\([^)]*\))?(?=[,.\s])/g,'');
  const parts=s.split(/(\n| · |; )/),out=[];
  for(let i=0;i<parts.length;i+=2){if(!rx.test(parts[i]))out.push(out.length?parts[i-1]:'',parts[i]);}
  return out.join('').trim();}
function applyTexts161(v){v=v&&typeof v==='object'?v:{};
  ['story','tour'].forEach(k=>{if(typeof v[k]==='string')v[k]=cleanOff161(v[k]);});
  if(Array.isArray(v.changelog))v.changelog=v.changelog.map(c=>c&&typeof c==='object'?Object.assign({},c,{was:cleanOff161(String(c.was||'')),now:cleanOff161(String(c.now||''))}):c);
  if(Array.isArray(v.howto)){const rx=offRx161();if(rx)v.howto=v.howto.filter(h=>!(h&&rx.test(String(h.q||'')+' '+String(h.a||''))));}
  if(typeof v.story==='string'&&v.story.trim())ABOUT_STORY=v.story;
  if(Array.isArray(v.changelog)&&v.changelog.length){const saved=v.changelog.filter(c=>c&&c.v).map(c=>[String(c.v),String(c.date||''),String(c.was||''),String(c.now||'')]);
    /* גרסאות שנוספו בקוד אחרי השמירה בבק אופיס נשארות בראש הרשימה */
    const top=Math.max(parseFloat(saved.length?saved[0][0]:'0')||0,parseFloat(v.seenV)||0),have=new Set(saved.map(c=>c[0]));
    CHANGELOG=CHANGELOG.filter(c=>!have.has(c[0])&&parseFloat(c[0])>top).concat(saved);}
  if(typeof v.tour==='string'&&v.tour.trim())SITE_TOUR16=v.tour;
  if(Array.isArray(v.howto)&&v.howto.length){const extra=v.howto.filter(h=>h&&h.q&&h.a).map(h=>{const words=String(h.q).split(/[,،\n]/).map(x=>norm(x)).filter(Boolean);return [{test:t=>words.some(w=>t.includes(w))},String(h.a)];});HOWTO16=extra.concat(HOWTO16);}
  textRules161=(Array.isArray(v.replace)?v.replace:[]).filter(r=>r&&r.from&&String(r.from).length>=2).slice(0,100).map(r=>[String(r.from),String(r.to||'')]);
  replaceTexts161(document.body);
}
const _v161ApplyConfig=applyConfig;
applyConfig=function(key,v){if(key==='texts'){applyTexts161(v);return;}return _v161ApplyConfig.apply(this,arguments);};
if(sb)sb.from('site_config').select('value').eq('key','texts').maybeSingle().then(({data})=>{if(data&&data.value)applyTexts161(data.value);},()=>{});
/* החלפת מילים/משפטים בכל האתר (לא בבק אופיס ולא במה שמשתמשים כותבים) */
let replacing161=false;
function replaceTexts161(root){if(!textRules161.length||!root||replacing161)return;replacing161=true;
  try{const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||p.closest('#bo,script,style,textarea,[contenteditable],.nm,.bub .nm,#botMsgs .me'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});
    let n;while((n=w.nextNode())){let t=n.nodeValue,o=t;for(const [a,b] of textRules161)if(t.includes(a))t=t.split(a).join(b);if(t!==o)n.nodeValue=t;}
    root.querySelectorAll&&root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>{if(el.closest('#bo'))return;['placeholder','title','aria-label'].forEach(at=>{const v=el.getAttribute(at);if(!v)return;let t=v;for(const [a,b] of textRules161)if(t.includes(a))t=t.split(a).join(b);if(t!==v)el.setAttribute(at,t);});});
  }finally{replacing161=false;}}
let repT161=null;
new MutationObserver(()=>{if(!textRules161.length||replacing161)return;clearTimeout(repT161);repT161=setTimeout(()=>replaceTexts161(document.body),120);}).observe(document.body,{childList:true,subtree:true,characterData:true});

/* ---------- 💬 המנהל מתכתב עם כל משתמש — מתוך האתר עצמו ---------- */
let adm161={threads:[],users:null,open:null,timer:null};
async function openAdminChat161(userId){
  if(!sb||!authUser||!isAdmin()){flash('⛔');return;}
  $161('#hMenu').classList.remove('open');
  clearInterval(adm161.timer);adm161.open=userId||null;
  const b=openSheet('💬 '+T('הודעות למשתמשים','Messages'),'<div class="empty">'+T('טוען...','Loading...')+'</div>');
  if(userId)await drawThread161(b,userId);else await drawThreads161(b);
  adm161.timer=setInterval(async()=>{if(!$161('#v8Sheet').classList.contains('open')||!$161('#adm161')){clearInterval(adm161.timer);return;}if(adm161.open)await drawThread161(b,adm161.open,true);else await drawThreads161(b,true);},20000);
}
/* רשימת השיחות, בחירת משתמש, הודעה לכולם ושיחה אחת: js/040.js */
/* כפתור בתפריט (רק למנהלים) + כפתור "שליחת הודעה" ליד כל משתמש בבק אופיס */
(function(){const host=$161('#hMenu details[data-g="staff"] .mgbody')||$161('#hMenu');if(!host||$161('#miAdmChat'))return;
  const b=document.createElement('button');b.id='miAdmChat';b.className='admin-only';b.innerHTML='💬<span>'+T('הודעות למשתמשים','Messages to users')+'</span>';host.insertBefore(b,host.firstChild);b.onclick=()=>openAdminChat161();})();
window.openAdminChat161=openAdminChat161;
