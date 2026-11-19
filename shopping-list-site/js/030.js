
/* ================= קבלות: צילום חד (בלי הקטנה שהורסת טקסט קטן), טבלת אישור עם בדיקת סכום ================= */
/* מה היה: כל תמונה הוקטנה ל-1600 פיקסלים בצד הארוך (JPEG 0.82) — קבלה ארוכה וצרה יצאה ברוחב של כמה מאות פיקסלים והספרות התמזגו.
   עכשיו: רוחב עד 1400 לקבלה, קבלה ארוכה נחתכת לחלקים חופפים, JPEG 0.9, ואפשרות חידוד (שחור-לבן + ניגודיות). */
(function(){
const $r=s=>document.querySelector(s);
const RC_MAXW=1400,RC_TILE=2000,RC_OVER=160,RC_TILES_PER_PHOTO=4,RC_MAX_CHARS=1200000;
const rcMaxParts=()=>isAdmin()?12:8;
let rcEnhance=true;try{rcEnhance=localStorage.getItem('yam_rc_enh')!=='0';}catch(e){}
const num=x=>{const v=parseFloat(String(x==null?'':x).replace(/[^\d.\-]/g,''));return isNaN(v)?0:v;};
const r2=x=>Math.round(x*100)/100;
const css=document.createElement('style');css.id='rcCss';css.textContent=
  '.rclink{margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)}.rclrow{display:flex;gap:6px;align-items:stretch}.rclrow input{flex:1 1 auto;min-width:0}.rclrow .btn{flex:0 0 auto;white-space:nowrap}'+
  '.rclhint{display:block;margin-top:6px;font-size:12px;color:var(--muted);line-height:1.5}'+
  '.rclok{margin:6px 0;font-size:13px;color:var(--hdr2);font-weight:700;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.rclok small{color:var(--muted);font-weight:400}'+
  '.rctips{margin:6px 0;font-size:13px}.rctips summary{cursor:pointer;color:var(--hdr2);font-weight:700}.rctips ul{margin:6px 0;padding-inline-start:20px;color:var(--text)}'+
  '.rctbl{width:100%;border-collapse:collapse;font-size:13px}.rctbl th{font-size:12px;color:var(--muted);font-weight:600;text-align:start;padding:4px 3px;border-bottom:1px solid var(--line)}'+
  '.rctbl td{padding:4px 3px;border-bottom:1px solid var(--line);vertical-align:top}.rctbl input:not([type=checkbox]){width:100%;min-width:0;box-sizing:border-box;padding:6px;border:1px solid var(--chipbr);border-radius:8px;background:var(--inputbg);color:var(--text);font-family:inherit;font-size:13px}'+
  '.rctbl input[type=checkbox]{width:20px;height:20px;margin-top:6px}.rctbl .c-name input[data-f=name]{font-weight:700}.rctbl .c-name .rcbrand{margin-top:4px;font-size:12px;padding:4px 6px}'+
  '.rctbl .c-qty{width:58px}.rctbl .c-price,.rctbl .c-tot{width:72px}.rctbl .c-bc{width:118px}.rctbl .c-del{width:34px}.rctbl .c-on{width:26px}'+
  '.rctbl .rcl{display:none;font-size:11px;color:var(--muted)}.rcraw{display:block;font-size:11px;color:var(--muted);margin-top:3px;word-break:break-word}'+
  '.rctbl button[data-rcdel]{background:none;border:1px solid var(--chipbr);border-radius:8px;width:32px;height:32px;cursor:pointer;color:var(--text)}'+
  '.rctbl input.rcunsure{background:#fff4d6;border:2px solid #b07800;color:#3d2a00}'+
  'body.dark .rctbl input.rcunsure{background:#3a3115;border-color:#e0b54a;color:#f6e7bd}'+
  '.rcsum{border-radius:12px;padding:10px;margin:10px 0;border:1px solid var(--line);background:var(--chipbg)}.rcsum .rcline{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;margin:3px 0}'+
  '.rcsum input{width:110px;padding:6px;border:1px solid var(--chipbr);border-radius:8px;background:var(--inputbg);color:var(--text);font-family:inherit;font-size:14px}'+
  '.rcstat{margin-top:8px;border-radius:10px;padding:8px 10px;font-weight:700;font-size:14px}'+
  '.rcstat[data-state=ok]{background:#e3f5e5;color:#1b5e20;border:1px solid #2e7d32}.rcstat[data-state=warn]{background:#fff4d6;color:#5c3d00;border:1px solid #b07800}.rcstat[data-state=none]{background:var(--panel);color:var(--text);border:1px dashed var(--chipbr)}'+
  'body.dark .rcstat[data-state=ok]{background:#1d3a26;color:#a8e8b6;border-color:#4caf6a}body.dark .rcstat[data-state=warn]{background:#3a3115;color:#f6e7bd;border-color:#e0b54a}'+
  '.rclegend{font-size:12px;color:var(--muted);margin:4px 0}.rclegend b{background:#fff4d6;color:#3d2a00;border:1px solid #b07800;border-radius:5px;padding:0 5px}body.dark .rclegend b{background:#3a3115;color:#f6e7bd;border-color:#e0b54a}'+
  '.rcbtns{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}.rcbtns button{flex:1}'+
  '@media (max-width:600px){.rctbl thead{display:none}.rctbl,.rctbl tbody{display:block}.rctbl tr{display:grid;grid-template-columns:26px repeat(3,minmax(0,1fr)) 34px;grid-template-areas:"on name name name del" ". qty price tot ." ". bc bc bc .";gap:4px 6px;padding:8px 0;border-bottom:1px solid var(--line)}'+
  '.rctbl td{display:block;border:none;padding:0;width:auto!important}.rctbl .c-on{grid-area:on}.rctbl .c-name{grid-area:name}.rctbl .c-del{grid-area:del}.rctbl .c-qty{grid-area:qty}.rctbl .c-price{grid-area:price}.rctbl .c-tot{grid-area:tot}.rctbl .c-bc{grid-area:bc}.rctbl .rcl{display:block}}';
document.head.appendChild(css);

/* ---------- הכנת התמונה ---------- */
async function rcBitmap(file){
  if(window.createImageBitmap){try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch(e){}}
  return await new Promise((res,rej)=>{const u=URL.createObjectURL(file);const im=new Image();im.onload=()=>{res(im);setTimeout(()=>URL.revokeObjectURL(u),0);};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('bad image'));};im.src=u;});}
/* שחור-לבן + מתיחת ניגודיות עדינה (נייר לבן, דיו כהה) — עוזר בקבלות תרמיות דהויות */
function rcEnhanceCanvas(c){const x=c.getContext('2d');const d=x.getImageData(0,0,c.width,c.height),p=d.data,n=p.length/4;const hist=new Uint32Array(256);
  for(let i=0;i<p.length;i+=4){const y=(p[i]*299+p[i+1]*587+p[i+2]*114)/1000|0;p[i]=y;hist[y]++;}
  let lo=0,hi=255,acc=0;while(lo<200&&(acc+=hist[lo])<n*0.01)lo++;acc=0;while(hi>lo+60&&(acc+=hist[hi])<n*0.02)hi--;
  if(hi-lo<80)lo=Math.max(0,hi-80);
  const lut=new Uint8ClampedArray(256);for(let v=0;v<256;v++){const t=Math.max(0,Math.min(1,(v-lo)/(hi-lo)));lut[v]=Math.round(255*Math.pow(t,1.15));}
  for(let i=0;i<p.length;i+=4){const v=lut[p[i]];p[i]=p[i+1]=p[i+2]=v;}
  x.putImageData(d,0,0);}
/* מחזיר חלק אחד או כמה חלקים חופפים (קבלה ארוכה), כל אחד JPEG חד ובגודל שהשרת מקבל */
async function rcPrep(file,enh){const bmp=await rcBitmap(file);const w0=bmp.naturalWidth||bmp.width,h0=bmp.naturalHeight||bmp.height;if(!w0||!h0)throw new Error('bad image');
  let s=Math.min(1,h0>w0*1.3?RC_MAXW/w0:2400/Math.max(w0,h0));let H=Math.round(h0*s);
  let n=H>RC_TILE*1.15?Math.ceil((H-RC_OVER)/(RC_TILE-RC_OVER)):1;
  if(n>RC_TILES_PER_PHOTO){n=RC_TILES_PER_PHOTO;s*=(n*(RC_TILE-RC_OVER)+RC_OVER)/H;H=Math.round(h0*s);}
  const W=Math.max(1,Math.round(w0*s)),th=n>1?Math.ceil((H+(n-1)*RC_OVER)/n):H,out=[];
  for(let i=0;i<n;i++){const y=n>1?Math.min(H-th,i*(th-RC_OVER)):0;const c=document.createElement('canvas');c.width=W;c.height=th;const x=c.getContext('2d');
    x.fillStyle='#fff';x.fillRect(0,0,W,th);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(bmp,0,y/s,w0,th/s,0,0,W,th);if(enh)rcEnhanceCanvas(c);
    let q=0.9,d=c.toDataURL('image/jpeg',q);while(d.length>RC_MAX_CHARS&&q>0.5){q-=0.08;d=c.toDataURL('image/jpeg',q);}out.push(d);c.width=c.height=0;}
  try{bmp.close&&bmp.close();}catch(e){}
  return out;}
window.rcPrep=rcPrep;
/* קבלה כקובץ PDF: כל עמוד מצויר לתמונה חדה ועובר את אותה הכנה כמו צילום (קבלה ארוכה נחתכת לחלקים חופפים).
   גרסה חדשה של pdf.js? לעדכן גם את script-src ב-CSP (למעלה, ב-vercel.json וב-_headers) */
/* הגרסה legacy: הגרסה הרגילה לא רצה ב-WebView ישן של אנדרואיד ("Setting up fake worker failed") */
const RC_PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js',RC_PDFJS_SRI='sha384-OemFRmhjDZwhIKuUld0HJozkF2YErsgDaCL41trxGQZt4/WgnopJQqQl2DvDZ07Z',RC_PDFW='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';
const RC_PDFW_SRI='sha384-sS8B4COeBqzQV9DaPpp5cbpF+xz2jPcFbN3L8FL3/dx0RMC6WLUwTUOFm0iFb1lw';
function rcScript(src,sri,glob){if(window[glob])return Promise.resolve(window[glob]);return new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=src;sc.integrity=sri;sc.crossOrigin='anonymous';sc.onload=()=>window[glob]?res(window[glob]):rej(new Error('pdfjs'));sc.onerror=()=>rej(new Error('pdfjs'));document.head.appendChild(sc);});}
/* ה-CSP לא מתיר Worker מכתובת זרה — טוענים את קוד ה-worker כסקריפט רגיל, ו-pdf.js מריץ אותו בדף עצמו */
/* WebView ישן (כרום לפני 92) — אין .at(), ו-pdf.js משתמש בו */
function rcPolyfill(){const at=function(n){n=Math.trunc(n)||0;if(n<0)n+=this.length;return n<0||n>=this.length?undefined:this[n];};
  [Array.prototype,String.prototype,Object.getPrototypeOf(Int8Array.prototype)].forEach(p=>{if(p&&!p.at)try{Object.defineProperty(p,'at',{value:at,writable:true,configurable:true});}catch(e){}});}
async function rcPdfLib(){rcPolyfill();const lib=await rcScript(RC_PDFJS,RC_PDFJS_SRI,'pdfjsLib');lib.GlobalWorkerOptions.workerSrc=RC_PDFW;try{await rcScript(RC_PDFW,RC_PDFW_SRI,'pdfjsWorker');}catch(e){}return lib;}
function rcInkBox(c,m){const W=c.width,H=c.height,p=c.getContext('2d').getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1;
  for(let y=0;y<H;y++){const r=y*W*4;for(let x=0;x<W;x++){const i=r+x*4;if(p[i]<235||p[i+1]<235||p[i+2]<235){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;y1=y;}}}
  if(x1<0)return null;m=m==null?24:m;x0=Math.max(0,x0-m);y0=Math.max(0,y0-m);x1=Math.min(W-1,x1+m);y1=Math.min(H-1,y1+m);return {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
/* עמוד של PDF → חלקים: קודם תצוגה קטנה כדי למצוא איפה יש דיו (קבלה צרה על דף A4, סוף עמוד ריק),
   ואז מציירים רק את האזור הזה ברוחב 1400 — ברצועות של עד 2000 פיקסלים עם חפיפה, כמו צילום של קבלה ארוכה.
   ככה אף קנבס לא גדול (טלפון, ובמיוחד אייפון, נכשל בקנבס ענק) ועמוד ריק לא נשלח בכלל */
const RC_PDF_BASE='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';
async function rcPdfParts(file,enh,room){const lib=await rcPdfLib();
  const pdf=await lib.getDocument({data:await file.arrayBuffer(),isEvalSupported:false,disableFontFace:true,cMapUrl:RC_PDF_BASE+'cmaps/',cMapPacked:true,standardFontDataUrl:RC_PDF_BASE+'standard_fonts/'}).promise;const parts=[];let more=false;
  const draw=async(pg,vp,w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);const x=c.getContext('2d');if(!x)throw new Error('canvas');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
    await pg.render({canvasContext:x,viewport:vp,background:'#fff'}).promise;return c;};
  try{for(let i=1;i<=pdf.numPages;i++){const left=room-parts.length;if(left<=0){more=true;break;}
    const pg=await pdf.getPage(i);const v1=pg.getViewport({scale:1});
    const ps=Math.min(700/v1.width,4000/v1.height);const pv=pg.getViewport({scale:ps});
    const prev=await draw(pg,pv,Math.ceil(pv.width),Math.ceil(pv.height));const bb=rcInkBox(prev,6);prev.width=prev.height=0;
    if(!bb){try{pg.cleanup();}catch(e){}continue;}
    const bw=bb.w/ps,bh=bb.h/ps;
    let sc=Math.min(6,RC_MAXW/bw);
    const fit=(left*(RC_TILE-RC_OVER)+RC_OVER)/bh;if(bh*sc>RC_TILE*1.15&&sc>fit){sc=Math.max(fit,Math.min(sc,800/bw));}
    const W=Math.max(1,Math.round(bw*sc)),H=Math.max(1,Math.round(bh*sc));
    const n=H>RC_TILE*1.15?Math.ceil((H-RC_OVER)/(RC_TILE-RC_OVER)):1,th=n>1?Math.ceil((H+(n-1)*RC_OVER)/n):H;
    for(let k=0;k<n;k++){if(parts.length>=room){more=true;break;}
      const y=n>1?Math.min(H-th,k*(th-RC_OVER)):0;
      const vp=pg.getViewport({scale:sc,offsetX:-bb.x/ps*sc,offsetY:-(bb.y/ps*sc+y)});
      const c=await draw(pg,vp,W,th);if(!rcInkBox(c,0)){c.width=c.height=0;continue;}
      if(enh)rcEnhanceCanvas(c);
      let q=0.9,d=c.toDataURL('image/jpeg',q);while(d.length>RC_MAX_CHARS&&q>0.5){q-=0.08;d=c.toDataURL('image/jpeg',q);}c.width=c.height=0;
      if(!/^data:image\/jpeg;base64,/.test(d))throw new Error('canvas');parts.push(d);}
    try{pg.cleanup();}catch(e){}}}
  finally{try{pdf.destroy();}catch(e){}}
  if(!parts.length)throw new Error('empty pdf');
  return {parts,more};}

/* ---------- מסך ההעלאה: טיפים, חידוד, וחלקים במקום תמונות ---------- */
/* כל תמונה (או קובץ PDF) = קבוצה אחת. קבלה ארוכה נחתכת בשקט לכמה חלקים שנשלחים לשרת, אבל מוצגת ונמחקת כתמונה אחת.
   (קודם כל חלק הופיע כתמונה נפרדת: 2 תמונות נראו כמו 4, ומחיקה של "תמונה" השאירה את החלק השני שלה) */
const rcGrp=new Map();let rcSeq=0;
const rcHas=key=>upImgs.some(d=>{const m=rcGrp.get(d);return m&&m.key===key;});
function rcAdd(parts,key){const g=++rcSeq;parts.forEach(d=>rcGrp.set(d,{g,key}));upImgs.push(...parts);}
function rcGroups(){const out=[],by={};upImgs.forEach((d,i)=>{const m=rcGrp.get(d),g=m?String(m.g):'x'+i;if(!by[g]){by[g]={g,idx:[]};out.push(by[g]);}by[g].idx.push(i);});return out;}
function rcRemove(g){const grp=rcGroups().find(x=>x.g===g);if(!grp)return;for(let k=grp.idx.length-1;k>=0;k--){rcGrp.delete(upImgs[grp.idx[k]]);upImgs.splice(grp.idx[k],1);}}
const rcFileKey=(f,enh)=>[f.name,f.size,f.lastModified,enh?1:0].join('|');
/* מביאים את הקבלה מהקישור דרך השרת (הדפדפן לא יכול לפתוח אתר אחר ישירות), ומיד קוראים אותה */
const rcB64=b=>{const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;};
let rcLinking=false,rcLinkHost='';
/* 🏪 איזו רשת שולחת קבלות מאיזה אתר — נלמד מהקבלות שאישרתם, וממלא את שם החנות לבד בפעם הבאה */
const rcHostKey='yam_rc_hosts';
const rcHosts=()=>{try{return JSON.parse(localStorage.getItem(rcHostKey)||'{}')||{};}catch(e){return {};}};
async function rcLink(){if(rcLinking)return;const inp=$r('#upUrl'),st=$r('#upUrlSt');if(!inp||!st)return;
  /* מדביקים לפעמים את כל ההודעה ("הקבלה שלך: https://...") — לוקחים ממנה את הקישור */
  const m=String(inp.value||'').match(/https?:\/\/[^\s<>"']+/i);
  if(!m){st.innerHTML='<p class="muted-note">⚠️ '+T('לא מצאתי קישור — מדביקים את הכתובת שמתחילה ב-https://','No link found — paste the address starting with https://')+'</p>';inp.focus();return;}
  const url=m[0].replace(/[).,;!?״"']+$/,'');inp.value=url;
  if(!sb||!authUser){st.innerHTML='<p class="muted-note">'+T('צריך להיות מחוברים 🙂','Sign in first 🙂')+'</p>';return;}
  const key='url|'+url;if(rcHas(key)){flash(T('ℹ️ הקבלה מהקישור הזה כבר נמצאת','ℹ️ This receipt is already added'));return;}
  rcLinking=true;const btn=$r('#upUrlGo');if(btn)btn.disabled=true;
  st.innerHTML='<div class="empty">🔗 '+T('פותחת את הקבלה מהקישור…','Opening the receipt link…')+'</div>';
  const send=async()=>{let data=null,error=null;try{({data,error}=await sb.functions.invoke('ai-chat',{body:{receiptUrl:url}}));}catch(e){error=e;}
    const code=error&&error.context&&error.context.status;if(error&&error.context&&typeof error.context.json==='function'){try{data=await error.context.json();}catch(e){}}return {data,code,error};};
  try{let r=await send();if(r.code===401){try{const {data:rs}=await sb.auth.refreshSession();if(rs&&rs.session)r=await send();}catch(e){}}
    if($r('#upUrlSt')!==st||upMode!=='receipt')return;
    const f=r.data&&r.data.fetched;
    if(!f){st.innerHTML='<p class="muted-note">⚠️ '+esc((r.data&&r.data.text)||(r.data&&r.data.disabled?T('קריאת קבלות צריכה את הבינה המלאכותית — היא עוד לא מופעלת באתר.','Reading needs the AI.'):T('לא הצלחתי לפתוח את הקישור 🙁','Could not open the link 🙁')))+'</p>';
      try{sb.rpc('log_client_error',{p_msg:('קבלה מקישור נכשלה: '+((r.data&&r.data.error)||r.code||'error')+' · '+(()=>{try{return new URL(url).hostname;}catch(e){return '';}})()).slice(0,300),p_src:'rcLink',p_ua:navigator.userAgent.slice(0,200),p_ver:String(typeof APP_VERSION!=='undefined'?APP_VERSION:''),...(window.errCtx?errCtx():{})}).then(()=>{},()=>{});}catch(e){}
      return;}
    rcLinkHost=String(f.host||'').toLowerCase().replace(/^www\./,'');
    /* אתר קבלות מוכר (אושר עד / Pairzon, Weezmo): השרת כבר קרא את הנתונים המסודרים — ישר למסך האישור, בלי בינה מלאכותית */
    if(f.kind==='receipt'&&f.receipt&&Array.isArray(f.receipt.items)){inp.value='';
      st.innerHTML='<p class="rclok">✅ '+T('הקבלה נקראה מהקישור','The receipt was read from the link')+' <small dir="ltr">'+esc(f.host||'')+'</small></p>';
      upResult={receipt:f.receipt};showUploadReview();return;}
    if(f.kind==='text'){const t=$r('#upText');if(t)t.value=String(f.text||'');
      st.innerHTML='<p class="rclok">✅ '+T('הקבלה מהקישור נקלטה','The receipt was fetched')+' <small dir="ltr">'+esc(f.host||'')+'</small> <button type="button" class="mini" id="upUrlX" aria-label="'+T('ביטול הקבלה מהקישור','Remove the linked receipt')+'">✕</button></p>';}
    else{const room=rcMaxParts()-upImgs.length;if(room<=0){st.innerHTML='<p class="muted-note">⚠️ '+T('אין מקום לעוד חלקים בקבלה הזו — מוחקים תמונה ומנסים שוב','No room — remove a photo and try again')+'</p>';return;}
      const u8=rcB64(f.data||'');
      if(f.kind==='pdf'){const file=new File([u8],'receipt.pdf',{type:'application/pdf'});const pr=await rcPdfParts(file,rcEnhance,room);if(pr.more)flash(T('⚠️ הקבלה ארוכה מדי לקריאה אחת — נכנסו רק העמודים הראשונים','⚠️ Only the first pages were added'));rcAdd(pr.parts,key);}
      else{const file=new File([u8],'receipt.jpg',{type:f.mime||'image/jpeg'});const parts=await rcPrep(file,rcEnhance);rcAdd(parts.slice(0,room),key);}
      drawThumbs();st.innerHTML='<p class="rclok">✅ '+T('הקבלה מהקישור נקלטה','The receipt was fetched')+' <small dir="ltr">'+esc(f.host||'')+'</small></p>';}
    inp.value='';
    /* "ישאב את הנתונים לבד" — מיד ממשיכים לקריאה ולמסך האישור */
    const go=$r('#upRead');if(go)go.click();}
  catch(err){console.error('receipt link',err);if($r('#upUrlSt')===st)st.innerHTML='<p class="muted-note">⚠️ '+T('לא הצלחתי לפתוח את הקבלה מהקישור','Could not open the linked receipt')+(err&&err.name==='PasswordException'?T(' — הקובץ נעול בסיסמה',' — the file is password protected'):'')+'</p>';}
  finally{rcLinking=false;const b2=$r('#upUrlGo');if(b2)b2.disabled=false;}}
const _open=openUpload;
openUpload=function(){
  /* פתיחה חדשה של החלון (לא מעבר בין "קבלה" ל"רשימה" בתוך החלון) — מתחילים נקי, בלי תמונות שנשארו מניסיון קודם */
  /* גם מעבר בין "קבלה" ל"רשימה" מנקה: תמונות של קבלה (שנחתכות לחלקים) לא נשלחות כרשימת קניות, ולהפך */
  const sh=document.getElementById('v8Sheet'),nm=arguments[0]||upMode;if(!(sh&&sh.classList.contains('open')&&$r('#upThumbs'))||nm!==upMode){upImgs.length=0;rcGrp.clear();rcLinkHost='';}
  const res=_open.apply(this,arguments);if(upMode!=='receipt')return res;
  const inp=$r('#upFiles'),b=$r('#v8SheetBody');if(!inp||!b)return res;
  const camL=($r('#upCam')||inp).closest('label');
  camL.insertAdjacentHTML('beforebegin','<details class="rctips"><summary>📸 '+T('איך לצלם כדי שהקריאה תהיה מדויקת','How to photograph for an accurate reading')+'</summary><ul>'+
    '<li>'+T('מניחים את הקבלה ישרה על משטח כהה, באור טוב ובלי צל או ברק.','Lay the receipt flat on a dark surface, good light, no shadow or glare.')+'</li>'+
    '<li>'+T('כל הקבלה בפוקוס וממלאת את התמונה לרוחב.','Keep it in focus and filling the frame width.')+'</li>'+
    '<li>'+T('קבלה ארוכה — כמה תמונות מלמעלה למטה, כל אחת חופפת קצת לקודמת (גם ההתחלה עם שם החנות וגם הסוף עם הסה״כ).','Long receipt: several photos top to bottom with a small overlap (include the header and the total).')+'</li></ul></details>'+
    '<label class="radio"><input type="checkbox" id="rcEnh"'+(rcEnhance?' checked':'')+'> ✨ '+T('חידוד טקסט לקבלה דהויה (שחור-לבן)','Sharpen faded text (black & white)')+'</label>');
  /* קבלה דיגיטלית (PDF) — כפתור נפרד, כי באפליקציה בוחר הקבצים מציג רק את הסוג הראשון שב-accept */
  inp.closest('label').insertAdjacentHTML('afterend','<label class="btn sec" style="display:block;text-align:center;cursor:pointer;margin-top:8px">📄 '+T('העלאת קבלה כקובץ PDF','Upload a PDF receipt')+'<input type="file" id="upPdf" accept="application/pdf,.pdf" multiple hidden></label>');
  /* 🔗 קבלה דיגיטלית מקישור (SMS / מייל / וואטסאפ) — בלי להוריד ולהעלות, ובלי צילומי מסך של קבלה ארוכה */
  const pdfL=$r('#upPdf').closest('label');
  pdfL.insertAdjacentHTML('afterend','<div class="rclink"><label class="il" for="upUrl">🔗 '+T('קבלה דיגיטלית? מדביקים כאן את הקישור שקיבלתם','Digital receipt? Paste its link here')+'</label>'+
    '<div class="rclrow"><input id="upUrl" type="url" inputmode="url" dir="ltr" autocomplete="off" placeholder="https://…"><button type="button" class="btn" id="upUrlGo">'+T('לקרוא מהקישור','Read the link')+'</button></div>'+
    '<small class="rclhint">💡 '+(/YamShoppingApp|; wv\)/.test(navigator.userAgent)?T('עוד יותר מהר: בהודעת ה-SMS של הקבלה לוחצים לחיצה ארוכה ← שיתוף ← "רשימת קניות", והקבלה נקראת לבד.','Even faster: long-press the receipt SMS → Share → "Shopping list".'):T('בטלפון עם האפליקציה: בהודעת ה-SMS של הקבלה לוחצים לחיצה ארוכה ← שיתוף ← "רשימת קניות", והקבלה נקראת לבד.','With the app: long-press the receipt SMS → Share → "Shopping list".'))+'</small>'+
    '<div id="upUrlSt" role="status"></div><textarea id="upText" hidden></textarea></div>');
  b.onchange=async e=>{
    if(e.target.id==='rcEnh'){rcEnhance=e.target.checked;try{localStorage.setItem('yam_rc_enh',rcEnhance?'1':'0');}catch(x){}return;}
    if(e.target.id==='upPdf'){const fs=Array.from(e.target.files||[]);e.target.value='';if(!fs.length)return;let full=false;
      const out=$r('#upOut');if(out)out.innerHTML='<div class="empty" role="status">📄 '+T('פותחת את קובץ ה-PDF…','Opening the PDF…')+'</div>';
      for(const f of fs){if(rcMaxParts()-upImgs.length<=0){full=true;break;}
        const key=rcFileKey(f,rcEnhance);if(rcHas(key)){flash(T('ℹ️ הקובץ הזה כבר נמצא','ℹ️ This file is already added'));continue;}
        try{const r=await rcPdfParts(f,rcEnhance,rcMaxParts()-upImgs.length);if(r.more)full=true;const parts=r.parts.filter(d=>!upImgs.includes(d));if(parts.length)rcAdd(parts,key);}
        catch(err){console.error('pdf receipt',err);flash(err&&err.name==='PasswordException'?T('⚠️ קובץ ה-PDF נעול בסיסמה — פתחו אותו ושמרו עותק בלי סיסמה','⚠️ The PDF is password protected'):T('⚠️ לא הצלחתי לפתוח את קובץ ה-PDF','⚠️ Could not open the PDF')+(err&&err.message==='empty pdf'?T(' — לא נמצא בו תוכן',' — it looks empty'):' ('+String((err&&(err.name+': '+err.message))||err).slice(0,90)+')'));}}
      if(out&&$r('#upOut')===out&&out.querySelector('.empty'))out.innerHTML='';
      if(full)flash(T('⚠️ הקבלה ארוכה מדי לקריאה אחת — נכנסו רק העמודים הראשונים','⚠️ The receipt is too long for one reading — only the first pages were added'));
      drawThumbs();return;}
    if(e.target.id!=='upFiles'&&e.target.id!=='upCam')return;const fs=Array.from(e.target.files||[]);e.target.value='';let full=false;
    for(const f of fs){const room=rcMaxParts()-upImgs.length;if(room<=0){full=true;break;}
      const key=rcFileKey(f,rcEnhance);if(rcHas(key)){flash(T('ℹ️ התמונה הזו כבר נמצאת','ℹ️ This photo is already added'));continue;}
      try{const parts=(await rcPrep(f,rcEnhance)).filter(d=>!upImgs.includes(d));if(parts.length>room)full=true;if(parts.length)rcAdd(parts.slice(0,room),key);}catch(err){flash(T('⚠️ לא הצלחתי לקרוא תמונה','⚠️ Could not read an image'));}}
    if(full)flash(T('⚠️ אין מקום לעוד תמונות בקבלה הזו — אפשר למחוק תמונה ולהוסיף אחרת','⚠️ No room for more photos in this receipt'));
    drawThumbs();};
  /* ✕ על תמונה — מוחק את התמונה עם כל החלקים שלה */
  const _click=b.onclick;b.onclick=e=>{const rm=e.target.closest('[data-rcrm]');if(rm){rcRemove(rm.dataset.rcrm);drawThumbs();return;}
    if(e.target.closest('#upUrlGo')){rcLink();return;}
    if(e.target.closest('#upUrlX')){const t=$r('#upText');if(t)t.value='';const st=$r('#upUrlSt');if(st)st.innerHTML='';return;}
    return _click&&_click.call(b,e);};
  const ui=$r('#upUrl');if(ui)ui.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();rcLink();}});
  return res;};
const _thumbs=drawThumbs;
drawThumbs=function(){if(upMode!=='receipt')return _thumbs.apply(this,arguments);const el=$r('#upThumbs');if(!el)return;const gs=rcGroups();
  el.innerHTML=gs.map(g=>'<span class="upth"><img src="'+esc(safeImg(upImgs[g.idx[0]]))+'" alt="" style="object-position:top"><button data-rcrm="'+esc(g.g)+'" aria-label="'+T('הסרת התמונה','Remove photo')+'">✕</button></span>').join('')+
    (gs.length?'<small>'+(gs.length===1?T('תמונה אחת','1 photo'):gs.length+' '+T('תמונות','photos'))+'</small>':'');};
/* לפני השליחה: התמונות יחד לא יותר מ-UP_BUDGET. משלוח כבד (1.8MB בארבעה חלקים) הפיל את פונקציית השרת
   (546 — נגמרו לה הזיכרון/זמן העיבוד) ובאינטרנט חלש נקטע באמצע ("Failed to send request").
   מקטינים בשלבים — קודם רק איכות ה-JPEG, ורק אם צריך גם את הגודל — ותמיד מהתמונה המקורית (בלי דחיסה על דחיסה) */
const UP_BUDGET=()=>upMode==='receipt'?1100000:900000;
const upBytes=d=>Math.round(d.length*3/4);
const upTotal=()=>upImgs.reduce((n,d)=>n+upBytes(d),0);
function upRecode(d,scale,q){return new Promise((res,rej)=>{const im=new Image();im.onerror=()=>rej(new Error('bad image'));im.onload=()=>{
  const W=Math.max(1,Math.round(im.width*scale)),H=Math.max(1,Math.round(im.height*scale)),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,W,H);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(im,0,0,W,H);const o=c.toDataURL('image/jpeg',q);c.width=c.height=0;res(o);};im.src=d;});}
async function upFit(){const budget=UP_BUDGET();if(!upImgs.length||upTotal()<=budget)return;
  const orig=upImgs.slice(),each=budget/orig.length;
  for(const [sc,q] of [[1,0.8],[1,0.7],[1,0.62],[0.85,0.62],[0.72,0.6],[0.6,0.58]]){
    for(let i=0;i<upImgs.length;i++){if(upImgs.length!==orig.length)return;if(upBytes(upImgs[i])<=each)continue;
      const d=upImgs[i];let n='';try{n=await upRecode(orig[i],sc,q);}catch(e){continue;}
      if(upImgs.length!==orig.length)return;if(!/^data:image\/jpeg;base64,/.test(n)||n.length>=d.length||upImgs[i]!==d)continue;
      const m=rcGrp.get(d);if(m){rcGrp.delete(d);rcGrp.set(n,m);}upImgs[i]=n;}
    if(upTotal()<=budget)break;}}
window.upFit=upFit;
const _read=readUpload;let upFitting=false;
readUpload=async function(){if(upFitting)return;const args=arguments;
  if(upImgs.length&&upTotal()>UP_BUDGET()){const o=$r('#upOut');if(o)o.innerHTML='<div class="empty" role="status">🗜️ '+T('מכינה את התמונות לשליחה…','Preparing the photos…')+'</div>';
    const m0=upMode;upFitting=true;try{await upFit();}catch(e){}finally{upFitting=false;}
    /* בזמן ההכנה החלון נסגר או הוחלף בין קבלה לרשימה — לא שולחים */
    if(upMode!==m0||$r('#upOut')!==o)return;}
  const p=_read.apply(this,args);if(upMode==='receipt'){const e=$r('#upOut .empty');if(e){e.setAttribute('role','status');e.textContent='🔍 '+T('קוראת את הקבלה שורה-שורה ובודקת מול הסה״כ… (בקבלה ארוכה עד דקה-שתיים)','Reading line by line and checking against the total… (up to 1–2 min)');}}return p;};

/* ---------- טבלת האישור ---------- */
const FIELD_HE={name:T('שם המוצר','Product'),qty:T('כמות','Qty'),price:T('מחיר ליח׳','Unit price'),total:T('סה״כ לשורה','Line total'),barcode:T('ברקוד','Barcode'),brand:T('חברה','Brand')};
/* שדות לבדיקה: מה שהבינה המלאכותית סימנה כלא בטוח + חשבון שלא מסתדר + ברקוד לא תקין */
function rcFlags(it){const u=new Set(Array.isArray(it.unsure)?it.unsure.map(String):[]);const q=num(it.qty)||1,pr=num(it.price),tot=num(it.total),lp=num(it.list_price),disc=Math.abs(num(it.discount));
  if(tot>0&&(pr||lp)){const exp=lp?lp*q-disc:pr*q;if(Math.abs(exp-tot)>0.05+0.005*q){u.add('price');u.add('total');}}
  if(!(tot>0))u.add('total');
  if(!String(it.name||'').trim()||/\?\s*$/.test(String(it.name||'')))u.add('name');
  const bc=String(it.barcode||'').replace(/\D/g,'');if(bc&&!/^\d{7,13}$/.test(bc))u.add('barcode');
  return u;}
window.rcFlags=rcFlags;
function rcInput(f,val,u,extra,cls){const un=u.has(f);const c=[cls||'',un?'rcunsure':''].filter(Boolean).join(' ');return '<input data-f="'+f+'" value="'+esc(val)+'"'+(extra||'')+(c?' class="'+c+'"':'')+' aria-label="'+esc(FIELD_HE[f])+(un?' — '+esc(T('לא בטוחה שקראתי נכון','Not sure I read this right')):'')+'"'+(un?' aria-invalid="true" title="'+esc(T('לא בטוחה שקראתי נכון — בדקו מול הקבלה','Not sure — check against the receipt'))+'"':'')+'>';}
function rcRow(it,i){const u=rcFlags(it);const q=num(it.qty)||1,tot=num(it.total);const unit=num(it.price)||(tot?tot/q:0);
  return '<tr data-ur="'+i+'"><td class="c-on"><input type="checkbox" data-f="on" checked aria-label="'+esc(T('לשמור את השורה','Keep this line'))+'"></td>'+
    '<td class="c-name">'+rcInput('name',String(it.name||'').replace(/\?\s*$/,''),u,' maxlength="60"')+rcInput('brand',it.brand||'',u,' maxlength="40" placeholder="'+esc(T('חברה','Brand'))+'"','rcbrand')+
      (it.deal?' <span class="urdeal">🔥 '+esc(it.deal)+'</span>':'')+(it.raw?'<small class="rcraw" dir="auto">'+esc(T('בקבלה: ','On receipt: ')+String(it.raw).slice(0,80))+'</small>':'')+'</td>'+
    '<td class="c-qty"><span class="rcl" aria-hidden="true">'+FIELD_HE.qty+'</span>'+rcInput('qty',String(it.qty||1),u,' inputmode="decimal"')+'</td>'+
    '<td class="c-price"><span class="rcl" aria-hidden="true">'+FIELD_HE.price+'</span>'+rcInput('price',unit?r2(unit):'',u,' inputmode="decimal"')+'</td>'+
    '<td class="c-tot"><span class="rcl" aria-hidden="true">'+FIELD_HE.total+'</span>'+rcInput('total',tot?r2(tot):'',u,' inputmode="decimal"')+'</td>'+
    '<td class="c-bc"><span class="rcl" aria-hidden="true">'+FIELD_HE.barcode+'</span>'+rcInput('barcode',String(it.barcode||'').replace(/\D/g,''),u,' inputmode="numeric" dir="ltr" maxlength="14"')+'</td>'+
    '<td class="c-del"><button type="button" data-rcdel aria-label="'+esc(T('מחיקת השורה','Delete line'))+'">🗑</button></td></tr>';}
/* סכום כל השורות (גם שורה שלא נשמרת — היא עדיין בקבלה) + פיקדון ושאר חיובים − הנחה כללית, מול הסה״כ לתשלום */
function rcRecalc(){const rc=upResult&&upResult.receipt;if(!rc)return;const st=$r('#rcStatus');if(!st)return;
  let sum=0;document.querySelectorAll('#upOut .rctbl tr[data-ur]').forEach(tr=>{sum+=num(tr.querySelector('[data-f=total]').value);});
  const extra=num(rc.deposit_total)+num(rc.extras_total)-Math.abs(num(rc.general_discount));sum=r2(sum+extra);
  const tot=num(($r('#rcTotal')||{}).value);const cur=myCurrency();$r('#rcSumV').textContent=fmtPrice(sum,cur);
  if(!(tot>0)){st.dataset.state='none';st.textContent='ℹ️ '+T('לא נמצא סה״כ בקבלה — הקלידו את הסה״כ לתשלום כדי לבדוק שהכל נקרא','No total found — type the total to check');return;}
  const diff=r2(tot-sum);
  if(Math.abs(diff)<=0.1){st.dataset.state='ok';st.textContent='✓ '+T('הסכום תואם לסה״כ בקבלה','The sum matches the receipt total')+(rc.check&&rc.check.passes>1?' '+T('(אחרי בדיקה חוזרת)','(after a second check)'):'');}
  else{st.dataset.state='warn';st.textContent='⚠️ '+T('הפרש של ','A difference of ')+fmtPrice(Math.abs(diff),cur)+' ('+(diff>0?T('חסר בשורות','lines are short'):T('יותר מהקבלה','more than the receipt'))+') — '+T('כנראה שורה חסרה או מחיר שנקרא לא נכון. בדקו את השדות המסומנים בצהוב, או הוסיפו שורה.','probably a missing line or a misread price. Check the highlighted fields or add a line.');}}
window.rcRecalc=rcRecalc;
const _show=showUploadReview;
showUploadReview=function(){if(upMode!=='receipt'||!upResult||!upResult.receipt)return _show.apply(this,arguments);
  const r=upResult.receipt;if(!Array.isArray(r.items))r.items=[];if(!r._norm){normalizeReceipt15(r);r._norm=true;}
  const out=$r('#upOut');if(!out)return;const now=new Date();const store=String(r.store||'').trim();const known=allChainNames().find(c=>norm(store).includes(norm(c))||norm(c).includes(norm(store)))||store;const cur=myCurrency();
  const disc=r.items.reduce((s,o)=>s+(num(o.discount)||0),0)||num(r.discounts_total);
  const extras=[num(r.deposit_total)?T('פיקדון ','Deposit ')+fmtPrice(num(r.deposit_total),cur):'',num(r.extras_total)?T('שקיות/עיגול ','Bags/rounding ')+fmtPrice(num(r.extras_total),cur):'',num(r.general_discount)?T('הנחה כללית −','General discount −')+fmtPrice(Math.abs(num(r.general_discount)),cur):''].filter(Boolean);
  out.innerHTML='<div class="mecard"><h4>🧾 '+T('בדקו ואשרו — כל שדה ניתן לתיקון','Check and confirm — every field can be edited')+'</h4><div class="grid2"><div><label class="il" for="urStore">'+T('חנות / רשת','Store')+'</label><input id="urStore" list="urStores" maxlength="40" value="'+esc(known)+'"><datalist id="urStores">'+allChainNames().map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist></div><div><label class="il" for="urBranch">'+T('סניף','Branch')+'</label><input id="urBranch" maxlength="120" value="'+esc(r.branch||'')+'"></div>'+
    '<div><label class="il" for="urDate">'+T('תאריך הקנייה','Purchase date')+'</label><input id="urDate" type="date" value="'+esc(/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')?r.date:dayKey(now))+'"></div><div><label class="il" for="urUp">'+T('הקבלה הועלתה','Uploaded')+'</label><input id="urUp" value="'+esc(fmtDate(now)+' '+fmtTime(now))+'" readonly></div></div>'+
    (r.check&&Array.isArray(r.check.cleaned)&&r.check.cleaned.length?'<p class="muted-note">🧹 '+T('תיקנתי לבד: ','Auto-fixed: ')+esc(r.check.cleaned.join(' · '))+'</p>':'')+
    '<p class="rclegend">'+T('מסומן ב','Marked in ')+'<b>'+T('צהוב','yellow')+'</b> = '+T('לא בטוחה שקראתי נכון — כדאי להשוות לקבלה. שינוי בכמות או במחיר מעדכן את הסה״כ לשורה.','not sure I read it right — compare with the receipt. Changing qty or price updates the line total.')+'</p>'+
    '<div class="tw"><table class="rctbl"><caption class="sr18">'+T('שורות הקבלה','Receipt lines')+'</caption><thead><tr><th scope="col"><span class="sr18">'+T('לשמור','Keep')+'</span></th><th scope="col">'+FIELD_HE.name+'</th><th scope="col">'+FIELD_HE.qty+'</th><th scope="col">'+FIELD_HE.price+'</th><th scope="col">'+FIELD_HE.total+'</th><th scope="col">'+FIELD_HE.barcode+'</th><th scope="col"><span class="sr18">'+T('מחיקה','Delete')+'</span></th></tr></thead><tbody>'+
      r.items.map(rcRow).join('')+'</tbody></table></div>'+
    '<div class="rcbtns"><button type="button" class="btn sec" id="rcAdd">➕ '+T('הוספת שורה','Add a line')+'</button></div>'+
    '<div class="rcsum"><div class="rcline"><span>🧮 '+T('סכום השורות','Lines sum')+(extras.length?' <small>('+T('כולל ','incl. ')+esc(extras.join(' · '))+')</small>':'')+'</span><b id="rcSumV"></b></div>'+
      (disc?'<div class="rcline"><span>🔥 '+T('הנחות בקבלה','Discounts')+'</span><span>'+fmtPrice(r2(disc),cur)+'</span></div>':'')+
      '<div class="rcline"><label for="rcTotal">🧾 '+T('סה״כ לתשלום בקבלה','Receipt total')+'</label><input id="rcTotal" inputmode="decimal" dir="ltr" value="'+(num(r.total)>0?r2(num(r.total)):'')+'"></div>'+
      '<div class="rcstat" id="rcStatus" role="status" aria-live="polite"></div></div>'+
    '<label class="radio"><input type="checkbox" id="urPub" checked> 📢 '+T('לפרסם את המחירים לכולם (עוזר לכל הקהילה לחסוך)','Publish the prices for everyone')+'</label>'+
    '<label class="radio"><input type="checkbox" id="urStock" checked> 🏠 '+T('להוסיף למה שיש לי בבית','Add to my home stock')+'</label>'+
    '<label class="radio"><input type="checkbox" id="urHist" checked> 🧾 '+T('לשמור כקנייה ב"מה קניתי ואיפה"','Save as a purchase')+'</label>'+
    '<p class="muted-note">💚 '+T('האתר נועד לעזור לאנשים — נא לפרסם רק מחירים נכונים.','Please publish only correct prices.')+'</p><button id="upConfirm" style="width:100%">✅ '+T('אישור ושמירה','Confirm and save')+'</button></div>';
  rcRecalc();
  out.oninput=e=>{const el=e.target;if(el.id==='rcTotal'){rcRecalc();return;}const tr=el.closest('tr[data-ur]');if(!tr)return;const f=el.dataset.f;
    el.classList.remove('rcunsure');el.removeAttribute('aria-invalid');
    const g=k=>tr.querySelector('[data-f='+k+']');const q=num(g('qty').value)||1;
    if(f==='qty'||f==='price'){const pr=num(g('price').value);if(pr)g('total').value=r2(pr*q);}
    else if(f==='total'){const t=num(g('total').value);if(t)g('price').value=r2(t/q);}
    if(f==='qty'||f==='price'||f==='total')['price','total'].forEach(k=>{g(k).classList.remove('rcunsure');g(k).removeAttribute('aria-invalid');});
    rcRecalc();};
  out.onclick=e=>{const del=e.target.closest('[data-rcdel]');if(del){const tr=del.closest('tr');const nx=tr.nextElementSibling||tr.previousElementSibling;tr.remove();rcRecalc();const fb=nx?nx.querySelector('[data-rcdel]'):$r('#rcAdd');if(fb)fb.focus();return;}
    if(e.target.closest('#rcAdd')){const tb=$r('#upOut .rctbl tbody');const i=Date.now();tb.insertAdjacentHTML('beforeend',rcRow({name:'',qty:1,total:'',unsure:[]},i));const n=tb.lastElementChild.querySelector('[data-f=name]');n.classList.remove('rcunsure');n.removeAttribute('aria-invalid');n.focus();rcRecalc();}};
  out.scrollIntoView({behavior:'smooth',block:'start'});};
/* שמירה כשהסכום עדיין לא מסתדר — שואלים לפני שמפרסמים מחירים לכולם */
const _confirm=confirmUpload;
confirmUpload=async function(){if(upMode==='receipt'){const st=$r('#rcStatus'),pub=$r('#urPub');if(st&&st.dataset.state==='warn'&&pub&&pub.checked&&!(await uiConfirm(T('הסכום עדיין לא תואם לסה״כ בקבלה — ייתכן שיש מחיר לא נכון. לפרסם את המחירים לכולם בכל זאת?','The sum still does not match the receipt total. Publish the prices anyway?'))))return;}return _confirm.apply(this,arguments);};
/* קבלה מקישור: אם כבר אישרתם קבלה מאותו אתר — שם החנות שבחרתם אז */
const _showH=showUploadReview;
showUploadReview=function(){const r=_showH.apply(this,arguments);try{if(upMode==='receipt'&&rcLinkHost){const known=rcHosts()[rcLinkHost],inp=$r('#urStore');if(known&&inp&&inp.value.trim()!==known){inp.value=known;inp.title=T('לפי קבלות קודמות מאותו קישור','From earlier receipts from this link');}}}catch(e){}return r;};
const _confirmH=confirmUpload;
confirmUpload=async function(){let host='',store='';try{if(upMode==='receipt'&&rcLinkHost){host=rcLinkHost;store=(($r('#urStore')||{}).value||'').trim().slice(0,40);}}catch(e){}
  const r=await _confirmH.apply(this,arguments);
  /* נשמר רק אחרי שהשמירה עברה (החלון נסגר) */
  try{if(host&&store&&!$r('#v8Sheet.open')){const m=rcHosts();m[host]=store;const ks=Object.keys(m);if(ks.length>30)delete m[ks[0]];localStorage.setItem(rcHostKey,JSON.stringify(m));}}catch(e){}
  return r;};
})();
