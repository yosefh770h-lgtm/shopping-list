// מקורות מחירים אוטומטיים — Supabase Edge Function בשם prices-sync.
// המנהל מוסיף בבק אופיס קישור (דף מוצרים באתר של חנות, או קובץ מחירים של רשת לפי חוק שקיפות המחירים — XML / GZ),
// והפונקציה מושכת ממנו מחירים ומעדכנת את טבלת המחירים — כל כמה שעות, אוטומטית (תזמון במסד הנתונים).
// • קובץ שקיפות מחירים (PriceFull / Price, גם .gz) — נקרא ישירות, הכי מדויק.
// • דף אינטרנט עם נתוני מוצר מובנים (JSON-LD) — נקרא ישירות.
// • כל דף אחר — Gemini מחלץ מוצרים ומחירים (צריך GEMINI_API_KEY).
// חשוב: בהגדרות הפונקציה לכבות "Verify JWT".
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
// הבעלים: רק חשבון שסומן yam_owner ב-app_metadata (משתמש לא יכול לשנות app_metadata בעצמו — רק SQL/השרת). שום מייל לא כתוב בקוד כבעלים
// deno-lint-ignore no-explicit-any
const isOwnerUser = (u: any) => !!u && !!u.email_confirmed_at && (u.app_metadata?.yam_owner === true || u.app_metadata?.yam_owner === "true");
// 🔐 אימות דו-שלבי: מי שהפעיל קוד מאפליקציית Authenticator נחשב מנהל רק בכניסה שבה הקליד את הקוד (aal2) — כמו public.mfa_ok() במסד
// deno-lint-ignore no-explicit-any
async function mfaOk(admin: any, user: { factors?: { status?: string }[] } | null | undefined, token: string) {
  if (!(user?.factors || []).some((f) => f.status === "verified")) return true;
  try { if (JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).aal === "aal2") return true; } catch { /* */ }
  // הבעלים כיבה את האימות הדו-שלבי לכל האתר (בבק אופיס)
  const { data } = await admin.from("mfa_settings").select("off").eq("id", 1).maybeSingle();
  return data?.off === true;
}
const MAX_ITEMS = 5000;
export const norm = (s: string) => (s || "").replace(/['’`׳"]/g, "").replace(/\s+/g, " ").trim();
type Item = { name: string; price: number; barcode?: string };

const tag = (blk: string, names: string[]) => { for (const n of names) { const m = blk.match(new RegExp("<" + n + ">\\s*([\\s\\S]*?)\\s*</" + n + ">", "i")); if (m) return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim(); } return ""; };
const unent = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
export function parseXml(x: string): Item[] {
  const out: Item[] = [];
  const re = /<(Item|Product)>([\s\S]*?)<\/\1>/gi; let m;
  while ((m = re.exec(x)) && out.length < MAX_ITEMS) {
    const b = m[2];
    const name = unent(tag(b, ["ItemName", "ItemNm", "ManufacturerItemDescription", "ProductName"]));
    const price = Number(tag(b, ["ItemPrice", "Price", "UnitOfMeasurePrice"]).replace(",", "."));
    const code = tag(b, ["ItemCode", "ItemCd", "Barcode"]).replace(/\D/g, "");
    if (name && price > 0 && price < 100000) out.push({ name, price, barcode: code.length >= 4 && code.length <= 20 ? code : undefined });
  }
  return out;
}
export function parseJsonLd(html: string): Item[] {
  const out: Item[] = [];
  const re = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi; let m;
  const visit = (o: unknown): void => {
    if (!o || typeof o !== "object" || out.length >= MAX_ITEMS) return;
    if (Array.isArray(o)) { o.forEach(visit); return; }
    const r = o as Record<string, unknown>;
    const t = String(r["@type"] || "");
    if (/Product/i.test(t) && r.name) {
      const offers = (Array.isArray(r.offers) ? r.offers[0] : r.offers) as Record<string, unknown> | undefined;
      const price = Number(offers?.price ?? (offers as Record<string, unknown> | undefined)?.lowPrice);
      const code = String(r.gtin13 || r.gtin || r.gtin12 || r.sku || "").replace(/\D/g, "");
      if (price > 0) out.push({ name: unent(String(r.name)), price, barcode: code.length >= 4 && code.length <= 20 ? code : undefined });
    }
    Object.values(r).forEach((v) => { if (v && typeof v === "object") visit(v); });
  };
  while ((m = re.exec(html))) { try { visit(JSON.parse(m[1].trim())); } catch { /* דילוג */ } }
  return out;
}
const MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash", "gemini-flash-lite-latest"];
async function parseWithAI(text: string): Promise<Item[]> {
  const keys = [Deno.env.get("GEMINI_API_KEY"), ...[2, 3, 4, 5].map((i) => Deno.env.get("GEMINI_API_KEY_" + i))].filter((k): k is string => !!k && k.length > 20); if (!keys.length) return [];
  for (const key of keys) {
  const prompt = `זה תוכן של דף מוצרים בחנות. חלצי את כל המוצרים והמחירים. החזירי JSON בלבד: {"items":[{"name":"שם המוצר","price":12.9,"barcode":"אם יש"}]}. מחיר = המחיר לצרכן בשקלים (מספר). אל תמציאי. עד 300 מוצרים.\n\n` + text.slice(0, 30000);
  for (const m of MODELS) {
    let r: Response;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 8192, responseMimeType: "application/json" } }),
        signal: AbortSignal.timeout(60000),
      });
    } catch (e) { console.error("gemini", m, e); return []; }
    if (!r.ok) { if (r.status === 404 || r.status === 429 || r.status >= 500) continue; break; }
    const d = await r.json();
    const t = (d?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
    try { const j = JSON.parse(t.match(/\{[\s\S]*\}/)?.[0] || "{}"); return (j.items || []).map((i: Record<string, unknown>) => ({ name: String(i.name || "").trim(), price: Number(i.price), barcode: String(i.barcode || "").replace(/\D/g, "") || undefined })).filter((i: Item) => i.name && i.price > 0 && i.price < 100000).slice(0, 300); } catch { return []; }
  }
  }
  return [];
}
// ---------- הגנה: הפונקציה מושכת רק כתובות ציבוריות (לא שרתים פנימיים / של Supabase) ----------
// שגיאה עם הודעה בטוחה להצגה בבק אופיס (בלי פרטים פנימיים)
class SafeError extends Error {}
const MAX_DOWNLOAD = 20 * 1024 * 1024;   // 20MB הורדה
const MAX_UNZIPPED = 50 * 1024 * 1024;   // 50MB אחרי פריסת gz
const MAX_REDIRECTS = 3;
const OWN_HOST = (() => { try { return new URL(Deno.env.get("SUPABASE_URL") || "").hostname.toLowerCase(); } catch { return ""; } })();
export function privateIPv4(h: string): boolean {
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 192 && b === 0 && Number(m[3]) === 0) || (a === 198 && (b === 18 || b === 19));
}
export function privateIPv6(h: string): boolean {
  const x = h.replace(/^\[|\]$/g, "").toLowerCase();
  if (!x.includes(":")) return false;
  if (x === "::" || x === "::1") return true;
  if (/^f[cd]/.test(x) || /^fe[89ab]/.test(x) || /^ff/.test(x)) return true;          // ULA / link-local / multicast
  if (x.startsWith("::ffff:") || x.startsWith("64:ff9b:") || x.startsWith("::")) return true; // IPv4 בתוך IPv6
  return false;
}
export function checkUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new SafeError("הקישור לא תקין"); }
  if (u.protocol !== "https:") throw new SafeError("רק קישורי https נתמכים");
  if (u.username || u.password) throw new SafeError("הקישור לא תקין");
  if (u.port && u.port !== "443") throw new SafeError("קישור עם פורט מיוחד לא נתמך");
  const h = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!h || !h.includes(".") || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") ||
      h === OWN_HOST || privateIPv4(h) || privateIPv6(h)) throw new SafeError("הקישור מפנה לכתובת פנימית — לא מורשה");
  return u;
}
// בדיקת DNS (אם הסביבה מאפשרת): שם שמצביע לכתובת פנימית — נחסם
async function checkDns(host: string) {
  // deno-lint-ignore no-explicit-any
  const resolve = (Deno as any).resolveDns as ((h: string, t: string) => Promise<string[]>) | undefined;
  if (!resolve || /^[\d.]+$/.test(host) || host.includes(":")) return;
  for (const t of ["A", "AAAA"]) {
    let addrs: string[] = [];
    try { addrs = await resolve(host, t); } catch { continue; }
    if (addrs.some((a) => privateIPv4(a) || privateIPv6(a))) throw new SafeError("הקישור מפנה לכתובת פנימית — לא מורשה");
  }
}
// קריאת גוף התשובה עם תקרת גודל (סופרים בייטים תוך כדי, לא סומכים על Content-Length)
async function readCapped(stream: ReadableStream<Uint8Array> | null, cap: number, what: string): Promise<Uint8Array> {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader(); const parts: Uint8Array[] = []; let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > cap) { await reader.cancel().catch(() => {}); throw new SafeError(what); }
    parts.push(value);
  }
  const out = new Uint8Array(n); let i = 0; for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}
async function safeFetch(raw: string): Promise<Response> {
  const signal = AbortSignal.timeout(20000);
  let url = checkUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await checkDns(url.hostname);
    const r = await fetch(url.href, { headers: { "User-Agent": "Mozilla/5.0 (compatible; YamShoppingBot/1.0; +https://yamshopping.com)", Accept: "*/*" }, redirect: "manual", signal });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location");
      await r.body?.cancel().catch(() => {});
      if (!loc) throw new SafeError("האתר החזיר שגיאה " + r.status);
      url = checkUrl(new URL(loc, url).href); // כל הפניה נבדקת מחדש
      continue;
    }
    return r;
  }
  throw new SafeError("יותר מדי הפניות בקישור");
}
async function readSource(url: string): Promise<{ items: Item[]; how: string }> {
  const r = await safeFetch(url);
  if (!r.ok) { await r.body?.cancel().catch(() => {}); throw new SafeError("האתר החזיר שגיאה " + r.status); }
  if (Number(r.headers.get("content-length") || 0) > MAX_DOWNLOAD) { await r.body?.cancel().catch(() => {}); throw new SafeError("הקובץ גדול מדי (מעל 20MB)"); }
  const buf = await readCapped(r.body, MAX_DOWNLOAD, "הקובץ גדול מדי (מעל 20MB)");
  let bytes = buf;
  if (buf[0] === 0x1f && buf[1] === 0x8b) bytes = await readCapped(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip")), MAX_UNZIPPED, "הקובץ גדול מדי אחרי פריסה (מעל 50MB)");
  let text = new TextDecoder("utf-8").decode(bytes);
  if (text.includes("\uFFFD")) { try { text = new TextDecoder("windows-1255").decode(bytes); } catch { /* נשאר */ } }
  if (/<(Item|Product)>[\s\S]*?<(ItemPrice|Price)>/i.test(text)) return { items: parseXml(text), how: "קובץ שקיפות מחירים" };
  const ld = parseJsonLd(text);
  if (ld.length) return { items: ld, how: "נתוני מוצר מובנים" };
  const plain = text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const ai = await parseWithAI(plain);
  return { items: ai, how: ai.length ? "בינה מלאכותית" : "לא נמצאו מחירים" };
}

// השוואה בזמן קבוע (שלא יהיה אפשר לנחש את המפתח לפי זמני תגובה)
function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
// deno-lint-ignore no-explicit-any
async function isAdminUser(admin: any, user: { id: string; email?: string; email_confirmed_at?: string; factors?: { status?: string }[] } | null | undefined, token?: string) {
  if (!user) return false;
  if (token !== undefined && !(await mfaOk(admin, user, token))) return false;
  if (isOwnerUser(user)) return true;
  const { data: s } = await admin.from("staff").select("role").eq("user_id", user.id).maybeSingle();
  return s?.role === "admin";
}

// רק האתר עצמו (וגרסאות התצוגה שלו ב-Vercel, התוסף ובדיקות מקומיות) יכול לקרוא לפונקציה מדפדפן.
// אתר זר שינסה לקרוא לפונקציה בשם משתמש מחובר ייחסם בדפדפן. (קריאות משרת לשרת לא שולחות Origin ולא מושפעות.)
const SITE_ORIGIN = "https://www.yamshopping.com";
const originAllowed = (o: string) =>
  /^https:\/\/(www\.|server\.)?yamshopping\.com$/.test(o) ||
  /^https:\/\/yamshopping(-[a-z0-9-]+)?\.vercel\.app$/.test(o) ||
  /^chrome-extension:\/\/[a-p]{32}$/.test(o) ||
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
const withOriginCheck = (handler: (req: Request) => Promise<Response>) => async (req: Request) => {
  const res = await handler(req);
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      res.headers.set("Access-Control-Allow-Origin", originAllowed(origin) ? origin : SITE_ORIGIN);
      res.headers.append("Vary", "Origin");
    } catch { /* תשובה עם כותרות נעולות — משאירים כמו שהיא */ }
  }
  return res;
};

if (typeof Deno !== "undefined" && Deno.serve) Deno.serve(withOriginCheck(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  let body: { run?: boolean; source_id?: string } = {};
  try { body = await req.json(); } catch { /* */ }
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = token ? await admin.auth.getUser(token) : { data: null };
  const user = u?.user || null;
  let sources: Record<string, unknown>[] = [];
  if (body.source_id) {
    // הרצה ידנית מהבק אופיס — רק מנהל
    let ok = await isAdminUser(admin, user, token);
    const { data } = await admin.from("price_sources").select("*").eq("id", body.source_id);
    sources = data || [];
    // גם בעל/אחראי העסק יכול להריץ את המקור של העסק שלו
    if (!ok && user && sources[0]) { const { data: m } = await admin.from("store_managers").select("chain").eq("user_id", user.id).eq("chain", String(sources[0].chain)).maybeSingle(); ok = !!m; }
    if (!ok) return json({ error: "forbidden" }, 403);
  } else {
    // הרצה מתוזמנת: רק מהמסד (כותרת x-cron-key עם המפתח הסודי מ-auth_secret) או מנהל מחובר.
    // אחרת כל אחד באינטרנט יכול להפעיל את הפונקציה שוב ושוב (משיכות + עלויות AI).
    let ok = false;
    const sent = (req.headers.get("x-cron-key") || "").trim();
    if (sent) {
      const { data: sec, error } = await admin.from("auth_secret").select("cron_key").eq("id", 1).maybeSingle();
      if (error) console.error("prices-sync: auth_secret.cron_key unavailable (run the SQL) — admin JWT only", error.message);
      else ok = sameSecret(sent, String((sec as { cron_key?: string } | null)?.cron_key || ""));
    }
    if (!ok) ok = await isAdminUser(admin, user, token);
    if (!ok) return json({ error: "unauthorized" }, 401);
    const { data } = await admin.from("price_sources").select("*").eq("active", true).limit(200);
    const now = Date.now();
    sources = (data || []).filter((s) => !s.last_run || now - new Date(String(s.last_run)).getTime() > Number(s.every_hours) * 3600000 - 120000).slice(0, 4);
  }

  // אישור מחירים: מחירים ממקור נכנסים כ"ממתין לאישור" — אלא אם מי שהוסיף את המקור הוא מנהל האתר (by_admin / created_by),
  // או בעל עסק שהוגדר לו אישור אוטומטי לרשת הזו. מקור ישן בלי created_by: יעד "prices" יכול היה ליצור רק מנהל (לפי ההרשאות במסד) → מאושר;
  // כל השאר → רק אם לאחד מבעלי הרשת יש אישור אוטומטי.
  const modCache = new Map<string, { status: string; verified: boolean }>();
  async function moderation(s: Record<string, unknown>) {
    const by = s.created_by ? String(s.created_by) : "";
    const key = by + "|" + String(s.chain) + "|" + String(s.target || "prices") + "|" + String(s.by_admin);
    if (modCache.has(key)) return modCache.get(key)!;
    let approved = false;
    try {
      if (s.by_admin === true) {
        // נקבע במסד ע"י טריגר (רק מנהל יכול לשנות): המקור נוצר ע"י מנהל האתר
        approved = true;
      } else if (by) {
        const { data: cu } = await admin.auth.admin.getUserById(by);
        approved = await isAdminUser(admin, cu?.user as { id: string; email?: string; email_confirmed_at?: string } | undefined);
        if (!approved) { const { data: m } = await admin.from("store_managers").select("auto_approve").eq("user_id", by).eq("chain", String(s.chain)).maybeSingle(); approved = m?.auto_approve === true; }
      } else if (s.by_admin !== false && String(s.target || "prices") === "prices") {
        approved = true;
      } else {
        const { data: ms } = await admin.from("store_managers").select("auto_approve").eq("chain", String(s.chain)).eq("auto_approve", true).limit(1);
        approved = !!ms?.length;
      }
    } catch (e) { console.error("moderation", e); approved = false; }
    const r = approved ? { status: "approved", verified: true } : { status: "pending", verified: false };
    modCache.set(key, r);
    return r;
  }

  const results = [];
  for (const s of sources) {
    // "תופסים" את המקור באופן אטומי — אם ריצה אחרת כבר תפסה אותו (בקשות במקביל), מדלגים
    const claimAt = new Date().toISOString();
    let claim = admin.from("price_sources").update({ last_run: claimAt }).eq("id", s.id);
    claim = s.last_run ? claim.eq("last_run", String(s.last_run)) : claim.is("last_run", null);
    const { data: claimed, error: claimErr } = await claim.select("id");
    if (claimErr) { console.error("claim", s.id, claimErr); continue; }
    if (!claimed?.length) continue;

    let status = "", count = 0;
    const runStart = claimAt;
    try {
      const { items, how } = await readSource(String(s.url));
      const mod = await moderation(s);
      const seen = new Set<string>(); const rows = [];
      for (const it of items) {
        const name = norm(it.name).slice(0, 60); const k = (it.barcode || name).toLowerCase(); if (!name || seen.has(k)) continue; seen.add(k);
        rows.push({ product: name, product_key: norm(name), chain: s.chain, branch: s.branch || "", price: Math.round(it.price * 100) / 100, barcode: it.barcode && /^\d{4,20}$/.test(it.barcode) ? it.barcode : null,
          status: mod.status, verified: mod.verified, by_id: null, by_name: "עדכון אוטומטי", source_id: s.id, currency: "ILS", created_at: runStart });
      }
      const target = String(s.target || "prices");
      if (rows.length && target !== "inventory") {
        // קודם מכניסים את המחירים החדשים, ורק אחרי שהכול הצליח מוחקים את הישנים של המקור —
        // כך תקלה באמצע לא מוחקת את כל המחירים
        try {
          for (let i = 0; i < rows.length; i += 500) { const { error } = await admin.from("prices").insert(rows.slice(i, i + 500)); if (error) throw new Error(error.message); count += Math.min(500, rows.length - i); }
        } catch (e) {
          await admin.from("prices").delete().eq("source_id", s.id).gte("created_at", runStart);
          throw e;
        }
        const { error: delErr } = await admin.from("prices").delete().eq("source_id", s.id).lt("created_at", runStart);
        if (delErr) console.error("delete old prices", s.id, delErr);
      }
      let inv = 0;
      if (rows.length && target !== "prices") {
        // מלאי העסק: מעדכנים מחיר (וברקוד) למוצר קיים, ומוסיפים מוצר חדש — בלי לגעת בכמויות שהעסק ניהל
        const { data: cur } = await admin.from("store_inventory").select("id, name, barcode").eq("chain", s.chain).limit(20000);
        const byBc = new Map<string, string>(), byName = new Map<string, string>();
        (cur || []).forEach((i) => { if (i.barcode) byBc.set(i.barcode, i.id); byName.set(String(i.name).toLowerCase(), i.id); });
        const fresh = [];
        for (const r of rows) {
          const id = (r.barcode && byBc.get(r.barcode)) || byName.get(r.product.toLowerCase());
          if (id) { await admin.from("store_inventory").update({ price: r.price, ...(r.barcode ? { barcode: r.barcode } : {}) }).eq("id", id); inv++; }
          else fresh.push({ chain: s.chain, name: r.product, price: r.price, barcode: r.barcode || "", qty: 0 });
        }
        for (let i = 0; i < fresh.length; i += 500) { const { error } = await admin.from("store_inventory").insert(fresh.slice(i, i + 500)); if (!error) inv += Math.min(500, fresh.length - i); }
        if (target === "inventory") count = inv;
      }
      const pend = target !== "inventory" && count && mod.status === "pending" ? " · ממתינים לאישור מנהל" : "";
      status = rows.length ? "✅ " + (target === "inventory" ? inv + " מוצרים עודכנו במלאי" : count + " מחירים" + (target === "both" ? " · " + inv + " במלאי" : "")) + " (" + how + ")" + pend : "⚠️ לא נמצאו מחירים בקישור (" + how + ")";
    } catch (e) {
      // בבק אופיס מוצגת הודעה כללית בלבד; הפרטים המלאים — רק ביומן השרת
      console.error("prices-sync source", s.id, e);
      status = "❌ " + (e instanceof SafeError ? e.message : (e as Error)?.name === "TimeoutError" ? "האתר לא ענה בזמן" : "לא הצלחנו לקרוא את המקור");
    }
    await admin.from("price_sources").update({ last_run: new Date().toISOString(), last_status: status.slice(0, 500), last_count: count }).eq("id", s.id);
    results.push({ id: s.id, status, count });
  }
  return json({ ok: true, ran: results.length, results });
}));
