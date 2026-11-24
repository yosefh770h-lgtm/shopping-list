(function(){
  var q=new URLSearchParams(location.search),code=q.get('code')||'',ok=/^[\w-]{6,200}$/.test(code);
  var link='intent://auth?'+(ok?'code='+encodeURIComponent(code):'error=1')+'#Intent;scheme=yamshopping;package=com.yamshopping.app;end';
  if(!/Android/i.test(navigator.userAgent)){link='/';document.getElementById('t').textContent='הכניסה מיועדת לאפליקציה';document.getElementById('m').textContent='כאן אפשר להיכנס ישר באתר.';document.getElementById('go').textContent='לאתר';}
  else if(!ok){document.getElementById('t').textContent='הכניסה עם גוגל לא הושלמה';document.getElementById('m').textContent='חוזרים לאפליקציה ומנסים שוב.';}
  document.getElementById('go').href=link;
  try{history.replaceState(null,'',location.pathname);}catch(e){}
  if(link!=='/')location.replace(link);
})();
