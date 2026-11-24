/* ================= v23: קרדיט למדווחים — מי דיווח / כתב =================
   השמות לא נקראים מהטבלאות (השרת חוסם) — במקומם שמים "חריץ" (crSlot), והקוד בסוף הדף ממלא אותו מ-credit_names:
   המנהל/הצוות תמיד רואים את השם; לשאר — רק כשהמנהל בחר להציג (לכל סוג תוכן, או לפריט מסוים). */
const COLS23={
  prices:'id,product,product_key,chain,branch,price,barcode,by_id,confirms,created_at,status,verified,updated_at,currency,wrong,is_deal,deal_text,valid_until,source_id,inv_id,regular_price',
  reviews:'id,user_id,stars,body,reply,status,created_at,updated_at',
  posts:'id,chain,branch,kind,title,body,image,ends_at,status,created_by,created_at,updated_at',
  recs:'id,section,sub,kind,shop,city,body,stars,user_id,status,created_at,official',
  kb:'id,question,answer,author_id,status,created_at'};
let credCfg23={}; /* site_config 'credits' — ברירת המחדל לכל סוג תוכן (הכל מוסתר) */
/* kind: prices · reviews · clothing (המלצות) · shops (חנויות ביגוד) · posts · kb · products · chains · branches
   o.p = לפני השם (למשתמשים) · o.s = אחרי השם · o.f = מה שמוצג כשהשם מוסתר · o.b = בשורה נפרדת · o.t = טקסט בלבד (בתוך כפתור) */
function crSlot(kind,id,o){o=o||{};if(!id)return o.f?esc(o.f):'';
  return '<span class="cr23'+(o.b?' cr23blk':'')+'" data-crn="'+esc(kind)+'|'+esc(id)+'"'+(o.p?' data-crp="'+esc(o.p)+'"':'')+(o.s?' data-crs="'+esc(o.s)+'"':'')+(o.f?' data-crf="'+esc(o.f)+'"':'')+(o.t?' data-crt="1"':'')+'>'+(o.f?esc(o.f):'')+'</span>';}
