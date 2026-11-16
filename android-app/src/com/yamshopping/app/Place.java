package com.yamshopping.app;

/**
 * 2.0: קטעי JavaScript קטנים שהאפליקציה מריצה בתוך האתר.
 * SAVE_JS — זוכר איפה עומדים ברשימה (גלילה, ואיזה מוצר הבא בתור אחרי מה שסימנו) כשיוצאים מהאפליקציה.
 * RESTORE_JS — בפתיחה מחדש (גם אם הטלפון סגר את האפליקציה ברקע): גולל לאותו מקום, מסמן את המוצר במסגרת כתומה
 * ומראה למעלה "↩ חזרת לאותו מקום ברשימה".
 * BACK_JS — "חזור" חכם: סוגר חלון/תפריט פתוח באתר (כמו מקש Esc). מחזיר true אם משהו נסגר.
 */
final class Place {
    private Place() {}

    static final String SAVE_JS = "(function(){if(window.__yamPlace)return;window.__yamPlace=1;var nx='';"
            + "function P(){return document.querySelector('#paneList');}"
            + "function done(x){return !!(x.checked||x.classList.contains('on'));}"
            // סימנו מוצר — זוכרים את המוצר הבא שעוד לא סומן (שם ממשיכים)
            + "document.addEventListener('click',function(e){try{var t=e.target&&e.target.closest&&e.target.closest('[data-tgl]');var p=P();if(!t||!p||!p.contains(t))return;"
            + "var a=[].slice.call(p.querySelectorAll('[data-tgl]')),k=a.indexOf(t);nx='';for(var j=k+1;j<a.length;j++)if(!done(a[j])&&a[j]!==t){nx=a[j].getAttribute('data-tgl');break;}}catch(x){}},true);"
            + "function save(){try{var p=P();if(!p)return;var tb='',ac='';try{tb=tab;}catch(x){}try{ac=state.active||'';}catch(x){}"
            + "var a=nx;if(!a){var pt=p.getBoundingClientRect().top,r=p.querySelectorAll('[data-tgl]');for(var i=0;i<r.length;i++){var b=r[i].getBoundingClientRect();if(b.height>0&&b.top>=pt){a=r[i].getAttribute('data-tgl');break;}}}"
            + "localStorage.setItem('yam_place',JSON.stringify({t:Date.now(),tab:tb,list:ac,top:p.scrollTop,wy:window.scrollY||0,a:a,n:!!nx}));}catch(x){}}"
            + "document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')save();});window.addEventListener('pagehide',save);})();";

    static final String RESTORE_JS = "(function(){var d;try{d=JSON.parse(localStorage.getItem('yam_place')||'null');}catch(x){}"
            + "if(!d||Date.now()-d.t>12*3600000||d.tab!=='list'||!(d.top>40||d.wy>40||d.n))return;var n=0;"
            + "(function go(){n++;var p=document.querySelector('#paneList'),tb='',ac='';try{tb=tab;}catch(x){}try{ac=state.active||'';}catch(x){}"
            + "var r=p?p.querySelectorAll('[data-tgl]'):[];if((!p||!r.length||tb!=='list')&&n<40){setTimeout(go,200);return;}"
            + "if(!p||!r.length||tb!=='list'||(d.list&&ac&&d.list!==ac))return;"
            + "p.scrollTop=d.top;if(d.wy)window.scrollTo(0,d.wy);var el=null;"
            + "for(var i=0;i<r.length;i++)if(r[i].getAttribute('data-tgl')===d.a){el=r[i].closest('.it,.row')||r[i].parentElement;break;}"
            + "var dk=false;try{var c=getComputedStyle(document.body).backgroundColor.match(/\\d+/g);dk=c&&(+c[0]+ +c[1]+ +c[2])<300;}catch(x){}"
            + "if(el){var pb=p.getBoundingClientRect(),eb=el.getBoundingClientRect();if(eb.top<pb.top+50||eb.bottom>pb.bottom)el.scrollIntoView({block:'center'});"
            + "var o=el.style.outline,f=el.style.outlineOffset;el.style.outline='3px solid #f0a500';el.style.outlineOffset='3px';"
            + "setTimeout(function(){el.style.outline=o;el.style.outlineOffset=f;},2800);}"
            + "var b=document.createElement('div');b.id='yamPlacePill';b.setAttribute('role','status');b.textContent='↩ חזרת לאותו מקום ברשימה';"
            + "b.style.cssText='position:sticky;top:6px;z-index:6;margin:0 0 10px;padding:9px 16px;border-radius:999px;text-align:center;font-weight:700;font-size:14px;'"
            + "+'box-shadow:0 1px 4px rgba(0,0,0,.08);transition:opacity .5s;background:'+(dk?'#1f3d37':'#dff1ea')+';color:'+(dk?'#9fe3d0':'#0b5e55');"
            + "var old=document.getElementById('yamPlacePill');if(old)old.remove();p.insertBefore(b,p.firstChild);"
            + "setTimeout(function(){b.style.opacity='0';setTimeout(function(){b.remove();},600);},3500);})();})();";

    static final String BACK_JS = "(function(){try{var q='.open,.overlay,.qp15,#shpop18,#bo,#updPop,#ybPop,dialog[open]';"
            + "function sig(){var a=document.querySelectorAll(q),s=a.length+':';for(var i=0;i<a.length;i++)s+=a[i].className+(a[i].hidden?'h':'')+(a[i].open?'o':'')+',';return s;}"
            + "var b=sig(),ae=document.activeElement,t=ae&&ae!==document.body?ae:document;"
            + "var ev=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true});t.dispatchEvent(ev);"
            + "return ev.defaultPrevented||sig()!==b;}catch(e){return false;}})()";
}
