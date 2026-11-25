
/* ================= v45: 😊 בחירת אימוג'י בצ'אט שירות הלקוחות (כמו בוואטסאפ) =================
   כפתור 😊 בתוך שדה ההקלדה — גם אצל הלקוח, גם אצל המנהל באתר וגם בבק אופיס ← 💬 צ'אט עם משתמשים.
   לחיצה פותחת לוח אימוג'י לפי קטגוריות (ו"אחרונים"), ולחיצה על אימוג'י מכניסה אותו למקום של הסמן. */
try{
const EMO45=[
  ['🕘','אחרונים','Recent',''],
  ['😊','פרצופים','Smileys','😀 😃 😄 😁 😆 😅 😂 🤣 😊 🙂 😉 😍 🥰 😋 😎 🤩 🥳 😇 🤗 🤔 🤭 🤫 😐 😶 🙄 😏 😬 😌 😔 😴 🤒 🤧 😷 🥵 🥶 😵 🤯 😕 😟 🙁 😮 😯 😲 😳 🥺 😢 😭 😤 😩 😫 🥱'],
  ['👍','ידיים','Hands','👍 👎 👌 ✌️ 🤞 🤟 🤙 👋 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💪 👆 👇 👈 👉 ☝️ ✋ 🖐️ 👊 ✊'],
  ['❤️','לבבות וסימנים','Hearts & symbols','❤️ 🧡 💛 💚 💙 💜 🤍 🤎 🖤 💖 💗 💕 💯 ✅ ✔️ ❌ ❗ ❓ ⚠️ 🔥 ⭐ 🌟 ✨ 💡 🎉 🎊 🎁 🏆 🥇 👀 💬 📌 🔔 ⏰ ⏳ 🆕 🆗 ➕ ➖ 🔝'],
  ['🍎','אוכל','Food','🍎 🍏 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🥬 🥒 🌶️ 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🍞 🥖 🥯 🧀 🥚 🍳 🧈 🥞 🧇 🍗 🍔 🍟 🍕 🥙 🥗 🍝 🍚 🍲 🍣 🥟 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍯 🥛 ☕ 🍵 🧃 🥤 🧊 🧂 🍷'],
  ['🛒','קניות ובית','Shopping & home','🛒 🛍️ 🏪 🏬 💰 💵 💳 🧾 🏷️ 📦 🚚 🚗 🏠 🏡 🧺 🧹 🧼 🧽 🧴 🧻 🪣 🔑 📱 💻 ☎️ 📞 📧 📅 📝 ✏️ 📷 🎈 🕯️'],
  ['☀️','טבע','Nature','☀️ 🌤️ ⛅ 🌧️ ⛈️ ❄️ ☃️ 🌈 💧 🌊 🌸 🌼 🌻 🌹 🌷 🌱 🌿 🍀 🌳 🍂 🐶 🐱 🐰 🦁 🐻 🐼 🐨 🐮 🐔 🐟 🦋 🐝 🐞']];
/* אימוג'י גסים / פוגעניים — לא מופיעים בלוח, ונמחקים גם אם מקלידים אותם מהמקלדת של הטלפון */
const BAD45=/(?:\u{1F595}|\u{1F92C}|\u{1F4A9}|\u{1F51E}|\u{1F346}|\u{1F351}|\u{1F48B}|\u{1F608}|\u{1F47F}|\u{1F52A}|\u{1F52B}|\u{1F4A3}|\u{2620}|\u{1F480})(?:\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF}|\u{FE0F})?/gu;
const RK45='emo45recent';
const recent45=()=>{try{const a=JSON.parse(localStorage.getItem(RK45)||'[]');return Array.isArray(a)?a.filter(x=>typeof x==='string'&&x.length<12).slice(0,32):[];}catch(e){return [];}};
const addRecent45=e=>{try{localStorage.setItem(RK45,JSON.stringify([e].concat(recent45().filter(x=>x!==e)).slice(0,32)));}catch(er){}};
(function(){const st=document.createElement('style');st.textContent=
  '.emw45{position:relative;flex:1 1 auto;min-width:0;display:block;width:100%}'+
  '.emw45>textarea{display:block;width:100%;box-sizing:border-box;padding-right:44px!important}'+
  '.emw45>button.emb45{position:absolute;right:4px;left:auto;bottom:7px;width:36px!important;height:36px!important;min-height:0!important;min-width:0!important;flex:none!important;border:0!important;background:none!important;box-shadow:none!important;color:inherit!important;'+
    'font-size:22px!important;line-height:1!important;padding:0!important;margin:0!important;border-radius:50%!important;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.8}'+
  '.emw45>button.emb45:hover,.emw45>button.emb45:focus-visible,.emw45>button.emb45[aria-expanded=true]{opacity:1;background:rgba(127,127,127,.15)!important}'+
  '.emp45{border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:14px;margin:6px 0 0!important;padding:0!important;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}'+
  '.emt45{display:flex;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}'+
  '.emp45 .emt45 button{flex:1 0 auto;min-width:40px!important;width:auto!important;height:auto!important;min-height:0!important;border:0!important;border-bottom:3px solid transparent!important;border-radius:0!important;background:none!important;box-shadow:none!important;'+
    'color:inherit!important;font-size:20px!important;line-height:1.2!important;padding:7px 6px 5px!important;margin:0!important;cursor:pointer;opacity:.6}'+
  '.emp45 .emt45 button[aria-selected=true]{opacity:1;border-bottom-color:var(--hdr2)!important}'+
  '.emh45{font-size:12px;color:var(--muted);padding:6px 10px 0!important;margin:0!important}'+
  '.emg45{display:grid;grid-template-columns:repeat(auto-fill,minmax(42px,1fr));max-height:210px;overflow-y:auto;overscroll-behavior:contain;padding:4px 6px 8px!important}'+
  '.emp45 .emg45 button{width:auto!important;height:42px!important;min-height:0!important;min-width:0!important;border:0!important;background:none!important;box-shadow:none!important;color:inherit!important;'+
    'font-size:26px!important;line-height:1!important;padding:0!important;margin:0!important;border-radius:10px!important;cursor:pointer}'+
  '.emp45 .emg45 button:hover,.emp45 .emg45 button:focus-visible{background:rgba(127,127,127,.15)!important}'+
  '.eme45{grid-column:1/-1;padding:18px 8px!important;text-align:center;color:var(--muted);font-size:13px}';document.head.appendChild(st);})();
function emo45(ta){if(!ta||ta._emo45||!ta.parentNode)return;ta._emo45=1;
  const w=document.createElement('div');w.className='emw45';ta.parentNode.insertBefore(w,ta);w.appendChild(ta);
  const btn=document.createElement('button');btn.type='button';btn.className='emb45';btn.setAttribute('data-noicon','');btn.setAttribute('aria-expanded','false');
  const lab=()=>{const on=!!pan;btn.textContent=on?'⌨️':'😊';const t=on?T('סגירת האימוג׳י','Close emoji'):T('הוספת אימוג׳י','Add emoji');btn.title=t;btn.setAttribute('aria-label',t);btn.setAttribute('aria-expanded',String(on));};
  w.appendChild(btn);
  /* הלוח נפתח מתחת לשורת ההקלדה (בבק אופיס — מתחת לשדה) */
  const row=()=>w.closest('.cmp96')||(w.parentElement&&w.parentElement.matches('.row2')?w.parentElement:w);
  let pan=null,cat=recent45().length?0:1,pos=null;lab();
  const keep=()=>{if(document.activeElement===ta)pos=[ta.selectionStart,ta.selectionEnd];};
  ['keyup','click','select','input'].forEach(k=>ta.addEventListener(k,keep));ta.addEventListener('blur',()=>{pos=[ta.selectionStart,ta.selectionEnd];});
  const draw=()=>{if(!pan)return;const c=EMO45[cat];const list=cat===0?recent45():c[3].split(' ');
    pan.innerHTML='<div class="emt45" role="tablist" aria-label="'+T('קטגוריות אימוג׳י','Emoji categories')+'">'+EMO45.map((x,i)=>'<button type="button" role="tab" data-ecat="'+i+'" aria-selected="'+(i===cat)+'" title="'+T(x[1],x[2])+'" aria-label="'+T(x[1],x[2])+'">'+x[0]+'</button>').join('')+'</div>'+
      '<div class="emh45">'+T(c[1],c[2])+'</div>'+
      '<div class="emg45" role="group" aria-label="'+T(c[1],c[2])+'">'+(list.length?list.map(e=>'<button type="button" data-emo="'+e+'" aria-label="'+e+'">'+e+'</button>').join(''):'<div class="eme45">'+T('כאן יופיעו האימוג׳י שהשתמשתם בהם לאחרונה','Emoji you use will show up here')+'</div>')+'</div>';};
  const close=focus=>{if(pan){pan.remove();pan=null;}lab();if(focus)ta.focus();};
  const open=()=>{pan=document.createElement('div');pan.className='emp45';pan.setAttribute('data-noicon','');pan.setAttribute('role','dialog');pan.setAttribute('aria-label',T('בחירת אימוג׳י','Pick an emoji'));
    row().after(pan);draw();lab();
    /* בטלפון: מסתירים את המקלדת כדי שהלוח ייראה, כמו בוואטסאפ */
    if(TOUCH_KB&&document.activeElement===ta)ta.blur();
    pan.addEventListener('pointerdown',e=>{if(!TOUCH_KB&&e.target.closest('button'))e.preventDefault();});
    pan.addEventListener('click',e=>{e.stopPropagation();const t=e.target.closest('[data-ecat]');if(t){cat=+t.dataset.ecat;draw();const f=pan.querySelector('[data-ecat="'+cat+'"]');f&&f.focus();return;}
      const b=e.target.closest('[data-emo]');if(b)ins(b.dataset.emo);});
    pan.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close(true);}});};
  const ins=e=>{const v=ta.value;let [s,en]=document.activeElement===ta?[ta.selectionStart,ta.selectionEnd]:(pos||[v.length,v.length]);s=Math.min(s,v.length);en=Math.min(Math.max(en,s),v.length);
    const max=ta.maxLength>0?ta.maxLength:1e9;if(v.length-(en-s)+e.length>max){flash(T('ההודעה ארוכה מדי','The message is too long'));return;}
    ta.value=v.slice(0,s)+e+v.slice(en);const p=s+e.length;pos=[p,p];
    if(!TOUCH_KB){ta.focus();try{ta.setSelectionRange(p,p);}catch(er){}}
    ta.dispatchEvent(new Event('input',{bubbles:true}));addRecent45(e);};
  btn.addEventListener('pointerdown',e=>{if(!TOUCH_KB)e.preventDefault();});
  btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(pan)close(true);else open();});
  ta.addEventListener('input',()=>{BAD45.lastIndex=0;if(!BAD45.test(ta.value))return;const p=ta.selectionStart;const before=ta.value.slice(0,p).replace(BAD45,'');ta.value=before+ta.value.slice(p).replace(BAD45,'');try{ta.setSelectionRange(before.length,before.length);}catch(er){}flash('🙏 '+T('נא לשמור על לשון נקייה','Please keep it clean'));});
  ta.addEventListener('keydown',e=>{if(e.key==='Escape'&&pan){e.stopPropagation();e.preventDefault();close(false);}});
  /* בטלפון: חזרה להקלדה סוגרת את הלוח */
  ta.addEventListener('focus',()=>{if(TOUCH_KB&&pan)close(false);});}
window.emo45=emo45;
}catch(e){console.warn('v45',e);}
