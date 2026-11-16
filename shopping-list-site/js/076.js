
/* מציג תמונה במסך מלא: צביטה, הקשה כפולה, גלגלת העכבר, גרירה, כפתורי + / − וסגירה */
(function(){
  const tt=(h,e)=>typeof T==='function'?T(h,e):h;
  let box,img,st,cap,s=1,x=0,y=0,last=null,lastPT='mouse';const pts=new Map();let pinch=null,drag=null,tapT=0,tapX=0,tapY=0;
  function build(){if(box)return;box=document.createElement('div');box.id='zv';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
    box.innerHTML='<div class="zvst"><img alt=""></div><div class="zvbar"><button type="button" data-zv="x" aria-label="'+tt('סגירה','Close')+'">✕</button><div class="zvzm"><button type="button" data-zv="in" aria-label="'+tt('הגדלה','Zoom in')+'">+</button><button type="button" data-zv="out" aria-label="'+tt('הקטנה','Zoom out')+'">−</button></div></div><div class="zvcap"></div>';
    document.body.appendChild(box);img=box.querySelector('img');st=box.querySelector('.zvst');cap=box.querySelector('.zvcap');
    box.addEventListener('click',e=>{const b=e.target.closest('[data-zv]');if(b){e.stopPropagation();const a=b.dataset.zv;if(a==='x')close();else zoomAt(a==='in'?s*1.6:s/1.6);return;}
      if(e.target!==st||s>1.01)return;const r=img.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
    st.addEventListener('wheel',e=>{e.preventDefault();zoomAt(s*Math.exp(-e.deltaY*0.0018),e.clientX,e.clientY);},{passive:false});
    st.addEventListener('dblclick',e=>{e.preventDefault();if(lastPT!=='mouse')return;zoomAt(s>1.05?1:2.5,e.clientX,e.clientY);});
    st.addEventListener('pointerdown',down);st.addEventListener('pointermove',move);['pointerup','pointercancel'].forEach(t=>st.addEventListener(t,up));
    document.addEventListener('keydown',e=>{if(box.hidden)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='+'||e.key==='='){zoomAt(s*1.6);}else if(e.key==='-'){zoomAt(s/1.6);}},true);}
  function apply(){const r=img.getBoundingClientRect();const w=r.width/s,h=r.height/s;const mx=Math.max(0,(w*s-innerWidth)/2+40),my=Math.max(0,(h*s-innerHeight)/2+40);
    if(s<=1){x=0;y=0;}else{x=Math.max(-mx,Math.min(mx,x));y=Math.max(-my,Math.min(my,y));}
    img.style.transform='translate('+x+'px,'+y+'px) scale('+s+')';box.classList.toggle('zin',s>1.01);}
  function zoomAt(ns,cx,cy){ns=Math.max(1,Math.min(6,ns));if(cx==null){cx=innerWidth/2;cy=innerHeight/2;}
    const ox=cx-innerWidth/2,oy=cy-innerHeight/2;x=ox-(ox-x)*(ns/s);y=oy-(oy-y)*(ns/s);s=ns;apply();}
  function down(e){lastPT=e.pointerType;if(e.target!==img&&e.pointerType==='mouse')return;st.setPointerCapture&&st.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,x,y};drag=null;}
    else if(pts.size===1){drag={sx:e.clientX,sy:e.clientY,x,y,moved:false};}}
  function move(e){if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&pts.size>=2){const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const ns=Math.max(1,Math.min(6,pinch.s*d/pinch.d));
      const ox=pinch.cx-innerWidth/2,oy=pinch.cy-innerHeight/2;const mx=(a.x+b.x)/2-pinch.cx,my=(a.y+b.y)/2-pinch.cy;
      x=ox-(ox-pinch.x)*(ns/pinch.s)+mx;y=oy-(oy-pinch.y)*(ns/pinch.s)+my;s=ns;apply();}
    else if(drag){const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(Math.abs(dx)+Math.abs(dy)>6)drag.moved=true;if(s>1.01){x=drag.x+dx;y=drag.y+dy;box.classList.add('zdrag');apply();}}}
  function up(e){if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);box.classList.remove('zdrag');
    if(pinch&&pts.size<2){pinch=null;if(pts.size===1){const p=[...pts.values()][0];drag={sx:p.x,sy:p.y,x,y,moved:true};}return;}
    if(drag&&!drag.moved&&e.type==='pointerup'&&e.pointerType!=='mouse'){const now=Date.now();
      if(now-tapT<400&&Math.hypot(e.clientX-tapX,e.clientY-tapY)<30){tapT=0;zoomAt(s>1.05?1:2.5,e.clientX,e.clientY);}else{tapT=now;tapX=e.clientX;tapY=e.clientY;}}
    if(!pts.size)drag=null;}
  function bigger(src){const m=/^(https:\/\/images\.openfoodfacts\.org\/.+)\.(?:100|200)\.(jpg|png)$/.exec(src);return m?m[1]+'.400.'+m[2]:src;}
  function open(src,caption,from){if(!src)return;build();last=from||document.activeElement;s=1;x=0;y=0;img.style.transform='';
    const big=bigger(src);img.referrerPolicy='no-referrer';img.onerror=big!==src?()=>{img.onerror=null;img.src=src;}:null;img.src=big;img.alt=caption||tt('תמונת המוצר','Product photo');
    cap.textContent=caption||'';box.hidden=false;document.documentElement.style.overflow='hidden';setTimeout(()=>{const c=box.querySelector('[data-zv="x"]');c&&c.focus();},30);}
  function close(){if(!box||box.hidden)return;box.hidden=true;pts.clear();pinch=drag=null;document.documentElement.style.overflow='';try{last&&last.focus&&last.focus({preventScroll:true});}catch(e){}}
  window.openZoomImg=open;
  function nameOf(el){const row=el.closest('.merow,tr,.pkp,small,li');let t='';if(row){const g=row.querySelector('.grow');t=(g?g.childNodes[0]&&g.childNodes[0].textContent:row.textContent)||'';}return String(t).trim().slice(0,80);}
  function srcOf(el){const im=el.tagName==='IMG'?el:el.querySelector('img');return im&&(im.currentSrc||im.src);}
  document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('.pkth.ph,img.ixbig');if(!t)return;const src=srcOf(t);if(!src)return;
    e.preventDefault();e.stopPropagation();open(src,t.classList.contains('ixbig')?t.alt:nameOf(t),t);},true);
  document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const t=e.target.closest&&e.target.closest('.pkth.ph');if(!t)return;e.preventDefault();e.stopPropagation();open(srcOf(t),nameOf(t),t);},true);
})();
