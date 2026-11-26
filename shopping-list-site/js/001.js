/* 📴 "רשימת קניות אופליין" (אפליקציה נפרדת, בלי אינטרנט בכלל): בלי ענן ובלי מחירים, ועם 📡 סנכרון (js/087-offsync.js) */
var OFF_APP=/YamShoppingOffline\//.test(navigator.userAgent||'');if(OFF_APP)document.documentElement.classList.add('offapp');
/* 🕰️ טלפון בלי אינטרנט לא מכוון את השעון לבד, ולפעמים הוא זז בשעות או בימים. כל "מה השתנה אחרון" (סימון, מחיקה) נקבע לפי השעה,
   אז באופליין השעה של האתר מתוקנת לפי הטלפון המחובר לאינטרנט שסונכרן איתו (בלוטות' / QR — js/087-offsync.js) */
if(OFF_APP){try{const off=Number(localStorage.getItem('yam_off_clock'))||0;if(off&&Math.abs(off)<4e11){const _now=Date.now.bind(Date);Date.now=()=>_now()+off;}}catch(e){}}
/* 🎤 באפליקציה 1.7 ומעלה: בחלון של האפליקציה הדפדפן לא מקליט בעצמו, אז "רשימה קולית" עוברת לזיהוי הדיבור של הטלפון דרך האפליקציה.
   מתנהג כמו SpeechRecognition של הדפדפן, כך ששאר האתר לא צריך לדעת את ההבדל */
(function(){var A=window.YamApp;if(!A||typeof A.speechStart!=='function')return;var cur=null,seq=0;
  function fire(r,t,o){o.type=t;o.target=r;o.preventDefault=function(){};var h=r['on'+t],l=(r._l&&r._l[t]||[]).slice();if(typeof h==='function')l.unshift(h);
    l.forEach(function(f){try{f.call(r,o);}catch(e){setTimeout(function(){throw e;});}});}
  function SR(){this.lang='he-IL';this.interimResults=false;this.continuous=false;this.maxAlternatives=1;this.onstart=this.onaudiostart=this.onresult=this.onerror=this.onend=null;this._id=0;}
  SR.prototype.addEventListener=function(t,f){this._l=this._l||{};(this._l[t]=this._l[t]||[]).push(f);};
  SR.prototype.removeEventListener=function(t,f){var l=this._l&&this._l[t];if(l){var i=l.indexOf(f);if(i>=0)l.splice(i,1);}};
  SR.prototype.start=function(){if(cur===this){var e=new Error('already started');e.name='InvalidStateError';throw e;}
    if(cur){var o=cur;cur=null;if(o._c)o._c.kill();else try{A.speechAbort(o._id);}catch(e){}setTimeout(function(){fire(o,'end',{});},0);}
    cur=this;this._id=++seq;this._c=null;this._heard=false;this._t0=Date.now();this._got=false;if(cloudOn()){cloud(this,true);return;}watch(this);try{A.speechStart(this._id,String(this.lang||document.documentElement.lang||'he-IL'),!!this.interimResults);}
    catch(e){var me=this;cur=null;setTimeout(function(){fire(me,'error',{error:'service-not-allowed'});fire(me,'end',{});},0);}};
  SR.prototype.stop=function(){if(cur!==this)return;if(this._c)this._c.done();else try{A.speechStop(this._id);}catch(e){}};
  SR.prototype.abort=function(){if(cur!==this)return;cur=null;if(this._c)this._c.kill();else try{A.speechAbort(this._id);}catch(e){}var me=this;setTimeout(function(){fire(me,'end',{});},0);};
  window.__yamSR=function(id,t,x){var r=cur;if(!r||r._id!==id)return;r._got=true;if(t!=='start'){clearTimeout(r._wd);r._wd=0;}
    if(t==='start'){fire(r,'start',{});fire(r,'audiostart',{});return;}
    if(t==='partial'||t==='final'){r._heard=true;var alt={transcript:String(x||''),confidence:t==='final'?0.9:0},res=[alt],list;res.isFinal=t==='final';res.item=function(i){return this[i];};
      list=[res];list.item=function(i){return this[i];};fire(r,'result',{resultIndex:0,results:list});return;}
    /* זיהוי הדיבור של הטלפון לא עובד (אין אפליקציית Google, או שהסינון חוסם אותה) — ממשיכים באותה הקלטה דרך האתר */
    if(t==='error'){var ms=Date.now()-r._t0;diag(x,ms);
      /* גם "לא שמעתי כלום" מיד בהתחלה (הטלפון בכלל לא הקשיב), או ביטול / תקלת מיקרופון של שירות הדיבור */
      if(!r._heard&&(FALL[x]||(x==='no-speech'&&ms<2500))){cloudRemember(x);r._id=++seq;cloud(r,false);return;}}
    if(t==='error'){fire(r,'error',{error:String(x||'network')});return;}
    if(t==='end'){cur=null;fire(r,'end',{});}};
  /* ☁️ הקלטה דרך האתר: מקליטים כאן (המיקרופון של חלון האפליקציה), נעצרים לבד כשמפסיקים לדבר, ושולחים WAV קצר
     לפענוח בבינה המלאכותית (ai-chat ← transcribe). ההקלטה לא נשמרת. אחרי שהטלפון נכשל פעם אחת — 7 ימים ישר בדרך הזאת */
  var FALL={'service-not-allowed':1,'network':1,'language-not-supported':1,'aborted':1,'audio-capture':1};
  /* שירות הדיבור של הטלפון לא ענה בכלל (4 שניות בלי "מתחיל", או 8 שניות בלי שום מילה כשמבקשים גם תוצאות ביניים, 12 בלי) — עוברים להקלטה דרך האתר */
  function watch(r){clearTimeout(r._wd);r._wd=setTimeout(function(){if(cur!==r||r._c||r._heard)return;
      if(!r._got){go('no-answer');return;}r._wd=setTimeout(function(){if(cur===r&&!r._c&&!r._heard)go('hang');},r.interimResults?4000:8000);},4000);
    function go(code){var old=r._id;try{A.speechAbort(old);}catch(e){}diag(code,Date.now()-r._t0);cloudRemember(code);var f=!r._got;r._id=++seq;cloud(r,f);}}
  /* כל תקלה של זיהוי הדיבור בטלפון נרשמת ביומן התקלות (עד 5 ביום מכל טלפון), כדי שנדע מה קרה בדגם הזה */
  function diag(code,ms){try{var k='yam_sr_diag',d=new Date().toDateString(),o=JSON.parse(localStorage.getItem(k)||'{}');if(o.d!==d)o={d:d,n:0};if(o.n>=5)return;o.n++;localStorage.setItem(k,JSON.stringify(o));
    if(window.sb)sb.rpc('log_client_error',Object.assign({p_msg:'🎤 זיהוי דיבור בטלפון: '+code+' אחרי '+Math.round(ms/100)/10+' שניות',p_src:'speech',p_ua:navigator.userAgent.slice(0,200),p_ver:String(typeof APP_VERSION!=='undefined'?APP_VERSION:'')},window.errCtx?errCtx():{})).then(function(){},function(){});}catch(e){}}
  function cloudOn(){try{return Number(localStorage.getItem('yam_sr_cloud'))>Date.now();}catch(e){return false;}}
  function cloudRemember(code){try{localStorage.setItem('yam_sr_cloud',String(Date.now()+7*864e5));}catch(e){}}
  function say(he,en){try{if(window.flash)flash(window.T?T(he,en):he);}catch(e){}}
  function cloud(r,fresh){var id=r._id,dead=false,stream=null,ctx=null,chunks=[],rate=16000,heard=false,quiet=0,total=0,floor=1,blocks=0,ended=false;
    var c=r._c={done:function(){if(!dead&&!ended)finish();},kill:function(){dead=true;cleanup();}};
    function live(){return !dead&&cur===r&&r._id===id;}
    function cleanup(){try{stream&&stream.getTracks().forEach(function(t){t.stop();});}catch(e){}try{ctx&&ctx.close();}catch(e){}stream=ctx=null;}
    function fail(code){cleanup();if(!live())return;cur=null;fire(r,'error',{error:code});fire(r,'end',{});}
    if(fresh){fire(r,'start',{});fire(r,'audiostart',{});}
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!(window.AudioContext||window.webkitAudioContext)){setTimeout(function(){fail('service-not-allowed');},0);return;}
    if(!window.sb||typeof authUser==='undefined'||!authUser){say('🎤 כדי להקליט בטלפון הזה צריך להתחבר לחשבון','🎤 Please sign in to use voice on this phone');setTimeout(function(){fail('service-not-allowed');},0);return;}
    try{if(!localStorage.getItem('yam_sr_cloud_tip')){localStorage.setItem('yam_sr_cloud_tip','1');say('🎤 בטלפון הזה ההקלטה נשלחת לפענוח בבינה המלאכותית ולא נשמרת','🎤 On this phone the recording is sent to AI for transcription and is not stored');}}catch(e){}
    navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(function(s){
      stream=s;if(!live()){cleanup();return;}
      ctx=new (window.AudioContext||window.webkitAudioContext)();var src=ctx.createMediaStreamSource(s),pr=ctx.createScriptProcessor(4096,1,1),sec=4096/ctx.sampleRate,step=ctx.sampleRate/rate;
      pr.onaudioprocess=function(ev){if(!live()||ended)return;var d=ev.inputBuffer.getChannelData(0),n=Math.floor(d.length/step),o=new Float32Array(n),sum=0,i;
        for(i=0;i<d.length;i++)sum+=d[i]*d[i];for(i=0;i<n;i++)o[i]=d[Math.floor(i*step)];chunks.push(o);
        var rms=Math.sqrt(sum/d.length);blocks++;if(blocks<=4)floor=Math.min(floor,rms);var thr=Math.max(0.012,floor*3);
        total+=sec;if(rms>thr){heard=true;quiet=0;}else quiet+=sec;
        /* נעצרים: 2.5 שניות שקט אחרי דיבור, 7 שניות בלי דיבור בכלל, או חצי דקה */
        if(heard&&quiet>2.5||total>30)finish();else if(!heard&&total>7){ended=true;fail('no-speech');}};
      src.connect(pr);pr.connect(ctx.destination);
    }).catch(function(e){fail(e&&(e.name==='NotAllowedError'||e.name==='SecurityError')?'not-allowed':'audio-capture');if(e&&e.name==='NotAllowedError')say('צריך לאשר גישה למיקרופון 🎤','Please allow microphone access 🎤');});
    function finish(){ended=true;var pcm=chunks;chunks=[];cleanup();if(!live())return;if(!heard){fail('no-speech');return;}
      var len=0;pcm.forEach(function(a){len+=a.length;});var buf=new DataView(new ArrayBuffer(44+len*2)),p=44;
      function w(o,str){for(var i=0;i<str.length;i++)buf.setUint8(o+i,str.charCodeAt(i));}
      w(0,'RIFF');buf.setUint32(4,36+len*2,true);w(8,'WAVE');w(12,'fmt ');buf.setUint32(16,16,true);buf.setUint16(20,1,true);buf.setUint16(22,1,true);
      buf.setUint32(24,rate,true);buf.setUint32(28,rate*2,true);buf.setUint16(32,2,true);buf.setUint16(34,16,true);w(36,'data');buf.setUint32(40,len*2,true);
      pcm.forEach(function(a){for(var i=0;i<a.length;i++,p+=2){var v=Math.max(-1,Math.min(1,a[i]));buf.setInt16(p,v<0?v*32768:v*32767,true);}});
      var fr=new FileReader();fr.onload=function(){if(!live())return;
        sb.functions.invoke('ai-chat',{body:{transcribe:{audio:fr.result,lang:String(r.lang||'he-IL')}}}).then(function(res){var d=res&&res.data;
          if(!live())return;
          if(d&&d.transcript){r._heard=true;var alt={transcript:d.transcript,confidence:0.9},rs=[alt];rs.isFinal=true;rs.item=function(i){return this[i];};var l=[rs];l.item=function(i){return this[i];};
            cur=null;fire(r,'result',{resultIndex:0,results:l});fire(r,'end',{});return;}
          if(d&&(d.limited||d.disabled||d.banned))say(d.text||'🎤 ההקלטה לא זמינה כרגע','🎤 Voice is not available right now');
          else if(d&&d.transcript==='')return fail('no-speech');
          else say('🎤 לא הצלחתי לפענח את ההקלטה — נסו שוב','🎤 Could not transcribe — try again');
          fail('network');},function(){fail('network');});};
      fr.readAsDataURL(new Blob([buf.buffer],{type:'audio/wav'}));}
  }
  try{window.SpeechRecognition=SR;window.webkitSpeechRecognition=SR;}catch(e){}})();