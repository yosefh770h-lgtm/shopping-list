/* פרטי רכז הנגישות מתעדכנים מהבק אופיס (✏️ טקסטים ותוכן ← ♿ רכז נגישות) */
(function(){
  var U='https://ygyfodxfbebnkwdcbjrp.supabase.co',K='sb_publishable_ePRvA2OrDbBN3tbjbD3p-w_8maEwTCK';
  fetch(U+'/rest/v1/site_config?key=eq.a11y&select=value,updated_at',{headers:{apikey:K,Authorization:'Bearer '+K}}).then(function(r){return r.ok?r.json():[];}).then(function(rows){
    var v=rows&&rows[0]&&rows[0].value;if(!v)return;
    function set(id,t){var e=document.getElementById(id);if(e&&t)e.textContent=t;}
    set('cName',v.name);set('cPhone',v.phone);
    if(v.email){var m=document.getElementById('cMail');m.textContent=v.email;m.href='mailto:'+v.email;}
    if(v.note)set('cNote',v.note);
    if(v.updated){set('upd','עודכן: '+v.updated);}
  }).catch(function(){});
})();
