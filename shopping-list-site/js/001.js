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
    if(cur){var o=cur;cur=null;try{A.speechAbort(o._id);}catch(e){}setTimeout(function(){fire(o,'end',{});},0);}
    cur=this;this._id=++seq;try{A.speechStart(this._id,String(this.lang||document.documentElement.lang||'he-IL'),!!this.interimResults);}
    catch(e){var me=this;cur=null;setTimeout(function(){fire(me,'error',{error:'service-not-allowed'});fire(me,'end',{});},0);}};
  SR.prototype.stop=function(){if(cur===this)try{A.speechStop(this._id);}catch(e){}};
  SR.prototype.abort=function(){if(cur!==this)return;cur=null;try{A.speechAbort(this._id);}catch(e){}var me=this;setTimeout(function(){fire(me,'end',{});},0);};
  window.__yamSR=function(id,t,x){var r=cur;if(!r||r._id!==id)return;
    if(t==='start'){fire(r,'start',{});fire(r,'audiostart',{});return;}
    if(t==='partial'||t==='final'){var alt={transcript:String(x||''),confidence:t==='final'?0.9:0},res=[alt],list;res.isFinal=t==='final';res.item=function(i){return this[i];};
      list=[res];list.item=function(i){return this[i];};fire(r,'result',{resultIndex:0,results:list});return;}
    if(t==='error'){fire(r,'error',{error:String(x||'network')});return;}
    if(t==='end'){cur=null;fire(r,'end',{});}};
  try{window.SpeechRecognition=SR;window.webkitSpeechRecognition=SR;}catch(e){}})();