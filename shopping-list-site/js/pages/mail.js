(function(){
  var FN='https://ygyfodxfbebnkwdcbjrp.supabase.co/functions/v1/email';
  var KEY='sb_publishable_ePRvA2OrDbBN3tbjbD3p-w_8maEwTCK';
  var q=new URLSearchParams(location.search),t=(q.get('t')||'').trim(),a=q.get('a')||'';
  var m=document.getElementById('m');
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var head='<img class="logo" src="logo.png" alt=""><h1>רשימת קניות</h1>';
  var site='<a class="btn sec" href="/?src=mail">לכניסה לאתר</a>';
  function say(html){m.innerHTML=head+html;}
  function call(act,extra){
    var body={t:t,act:act};if(extra)for(var k in extra)body[k]=extra[k];
    return fetch(FN,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify(body)}).then(function(r){return r.json();});
  }
  function fail(){say('<p>לא הצלחנו למצוא את הקישור הזה 🤔</p><p class="muted">אפשר לכבות את המייל השבועי גם באתר: ⚙️ תפריט ← 📧 מייל שבועי, או לכתוב לנו ל-<a href="mailto:info@yamshopping.com?subject=unsubscribe">info@yamshopping.com</a></p>'+site);}
  var testNote=function(r){return r&&r.test?'<p class="muted">(זה מייל ניסיון — שום דבר לא השתנה באמת)</p>':'';};
  if(t==='preview'){say('<p>👀 זו רק תצוגה מקדימה של המייל.</p>'+site);return;}
  if(!/^[0-9a-f]{20,64}$/.test(t)){fail();return;}
  function unsubDone(r){
    say('<p>✔️ הוסרת מהמייל השבועי'+(r.email?' (<bdi>'+esc(r.email)+'</bdi>)':'')+'.</p><p class="muted">לא נשלח לך יותר. התחרטת? אפשר לחזור בלחיצה.</p>'+testNote(r)+
      '<button class="btn sec" id="re">📧 להחזיר את המייל השבועי</button>'+site);
    document.getElementById('re').onclick=function(){this.disabled=true;call('resub').then(function(x){if(!x||!x.ok)return fail();
      say('<p>💚 חזרת לרשימה! המייל הבא יגיע בעוד כמה ימים.</p>'+testNote(x)+site);},fail);};
  }
  if(a==='like'){
    say('<p class="muted">רגע...</p>');
    call('like').then(function(r){if(!r||!r.ok)return fail();say('<p style="font-size:40px;margin:6px 0">👍</p><p><b>תודה רבה!</b> שמחים שאהבת 💚</p>'+testNote(r)+site);},fail);
    return;
  }
  if(a==='unsub'){
    call('info').then(function(r){
      if(!r||!r.ok)return fail();
      if(!r.weekly){unsubDone(r);return;}
      say('<p>להפסיק לקבל את המייל השבועי'+(r.email?' ל-<bdi>'+esc(r.email)+'</bdi>':'')+'?</p>'+
        '<div class="reasons" role="radiogroup" aria-label="למה? (לא חובה)"><p class="muted" style="margin:0 0 4px">למה? (לא חובה — עוזר לנו להשתפר)</p>'+
        '<label><input type="radio" name="r" value="too_many"> יותר מדי מיילים</label>'+
        '<label><input type="radio" name="r" value="not_relevant"> התוכן לא רלוונטי לי</label>'+
        '<label><input type="radio" name="r" value="not_using"> אני לא משתמש/ת באתר</label>'+
        '<label><input type="radio" name="r" value="other"> אחר:</label><textarea id="why" maxlength="250" aria-label="סיבה אחרת"></textarea></div>'+
        testNote(r)+'<button class="btn" id="go">להסרה מהמייל השבועי</button>'+site);
      document.getElementById('go').onclick=function(){this.disabled=true;
        var c=document.querySelector('input[name=r]:checked'),why=(c?c.value:'')+(document.getElementById('why').value.trim()?': '+document.getElementById('why').value.trim():'');
        call('unsub',{reason:why.slice(0,290)}).then(function(x){if(!x||!x.ok)return fail();unsubDone(x);},fail);};
    },fail);
    return;
  }
  fail();
})();
