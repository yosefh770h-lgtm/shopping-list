// התראות לטלפון ולמחשב גם כשהאתר סגור (Web Push) — Supabase Edge Function בשם push.
// • המפתחות (VAPID) נוצרים אוטומטית בפעם הראשונה ונשמרים בטבלה push_keys — אין מה להגדיר.
// • מסד הנתונים מכניס התראות לתור (push_queue) ו"דופק" על הפונקציה; היא שולחת לפי ההעדפות של כל משתמש:
//   לא יותר מ-X ביום, לא בלילה (22:00–07:00), לא בשבת, ובלי כפילויות — שהאתר יזכיר את עצמו אבל לא יחפור.
// • חשוב: בהגדרות הפונקציה לכבות "Verify JWT" (מסד הנתונים קורא לה בלי משתמש).
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const SUBJECT = "mailto:info@yamshopping.com";
const enc = new TextEncoder();

export const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64u = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/"); const p = t + "===".slice((t.length + 3) % 4);
  return Uint8Array.from(atob(p), (c) => c.charCodeAt(0));
};
const concat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
}

// הצפנה לפי RFC 8291 (aes128gcm)
export async function encryptPayload(p256dh: string, authSecret: string, payload: Uint8Array) {
  const uaPub = unb64u(p256dh), auth = unb64u(authSecret);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode("WebPush: info\0"), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(payload, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
export async function vapidAuth(endpoint: string, publicKey: string, privateJwk: JsonWebKey) {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const key = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${publicKey}`;
}
export async function newKeys() {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]) as CryptoKeyPair;
  return { public_key: b64u(new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey))), private_jwk: await crypto.subtle.exportKey("jwk", kp.privateKey) };
}

// שעון ישראל
function ilNow(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "numeric", minute: "numeric", hour12: false })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), mins: (Number(p.hour) % 24) * 60 + Number(p.minute) };
}
export function blocked(prefs: { quiet: boolean; shabbat: boolean }, d = new Date()) {
  const { day, mins } = ilNow(d);
  if (prefs.shabbat && ((day === 5 && mins >= 15 * 60) || (day === 6 && mins < 20 * 60 + 30))) return "shabbat";
  if (prefs.quiet && (mins >= 22 * 60 || mins < 7 * 60)) return "quiet";
  return "";
}
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
// שולחים רק לשרתי ההתראות המוכרים של הדפדפנים — לא לכל כתובת שמישהו רשם כ"מכשיר" (אחרת השרת שלנו נשלח לכתובות שרירותיות)
export function knownPushHost(endpoint: string): boolean {
  let u: URL;
  try { u = new URL(endpoint); } catch { return false; }
  if (u.protocol !== "https:" || (u.port && u.port !== "443")) return false;
  const h = u.hostname.toLowerCase();
  return h === "fcm.googleapis.com" || h === "web.push.apple.com" ||
    h.endsWith(".push.services.mozilla.com") || h.endsWith(".notify.windows.com") || h.endsWith(".push.apple.com");
}
// השוואה בזמן קבוע
function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
// התראת ניסיון: פעם בדקה לכל משתמש לכל היותר
const TEST_EVERY_MS = 60000;
const lastTest = new Map<string, number>();

// כמה זמן לא לשלוח שוב התראה עם אותו "תג" (שלא יחפור)
const dedupeMinutes = (tag: string) => tag.startsWith("chat:") || tag.startsWith("staffchat:") ? 20 : tag.startsWith("react:") ? 24 * 60 : 6 * 60;

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
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // מפתחות VAPID (נוצרים פעם אחת)
  let { data: keys } = await admin.from("push_keys").select("public_key, private_jwk").eq("id", 1).maybeSingle();
  if (!keys) {
    const k = await newKeys();
    const { error } = await admin.from("push_keys").insert({ id: 1, ...k });
    if (error) ({ data: keys } = await admin.from("push_keys").select("public_key, private_jwk").eq("id", 1).maybeSingle());
    else keys = k;
  }
  if (!keys) return json({ error: "no_keys" }, 500);
  if (req.method === "GET") return json({ publicKey: keys.public_key, version: 1 });

  let body: { test?: boolean; publicKey?: boolean } = {};
  try { body = await req.json(); } catch { /* ריצה רגילה */ }
  if (body.publicKey) return json({ publicKey: keys.public_key, version: 1 });

  // בדיקה מהאתר: שולחים למשתמש עצמו התראת ניסיון (בלי שעות שקטות)
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (body.test) {
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    // הגבלה: פעם בדקה למשתמש. זיכרון מקומי (מהיר, אבל לכל מופע של הפונקציה בנפרד) +
    // רישום בתור כשורה "skipped" מסוג test (לא נספרת במכסה היומית ולא בכפילויות, כי שם סופרים רק "sent") —
    // קודם רושמים ואז סופרים, כך שגם שתי בקשות במקביל לא יעברו שתיהן.
    const prev = lastTest.get(u.user.id) || 0;
    if (Date.now() - prev < TEST_EVERY_MS) return json({ error: "rate", retry_in: Math.ceil((TEST_EVERY_MS - (Date.now() - prev)) / 1000) }, 429);
    lastTest.set(u.user.id, Date.now());
    if (lastTest.size > 5000) lastTest.clear();
    const { error: qe } = await admin.from("push_queue").insert({ user_id: u.user.id, kind: "test", title: "test", status: "skipped", note: "test" });
    if (qe) console.error("push test mark", qe);
    else {
      const { count } = await admin.from("push_queue").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).eq("kind", "test").eq("note", "test")
        .gt("created_at", new Date(Date.now() - TEST_EVERY_MS).toISOString());
      if ((count || 0) > 1) return json({ error: "rate", retry_in: 60 }, 429);
    }
    const { data: subs } = await admin.from("push_subs").select("*").eq("user_id", u.user.id);
    const res = [];
    for (const s of subs || []) res.push(await sendOne(admin, keys, s, { title: "✅ ההתראות עובדות!", body: "ככה ייראו העדכונים מרשימת קניות 💚", url: "/", tag: "test" }));
    return json({ sent: res.filter((r) => r === "ok").length, results: res });
  }

  // ריצה רגילה (מרוקנים את התור): רק מהמסד (כותרת x-cron-key עם המפתח הסודי מ-auth_secret) או מנהל מחובר
  {
    let ok = false;
    const sent = (req.headers.get("x-cron-key") || "").trim();
    if (sent) {
      const { data: sec, error } = await admin.from("auth_secret").select("cron_key").eq("id", 1).maybeSingle();
      if (error) console.error("push: auth_secret.cron_key unavailable (run the SQL) — admin JWT only", error.message);
      else ok = sameSecret(sent, String((sec as { cron_key?: string } | null)?.cron_key || ""));
    }
    if (!ok && token) {
      const { data: u } = await admin.auth.getUser(token);
      const usr = u?.user;
      if (usr) {
        ok = isOwnerUser(usr);
        if (!ok) { const { data: st } = await admin.from("staff").select("role").eq("user_id", usr.id).maybeSingle(); ok = st?.role === "admin"; }
        if (ok && !(await mfaOk(admin, usr, token))) ok = false;
      }
    }
    if (!ok) return json({ error: "unauthorized" }, 401);
  }
  // ריצה רגילה: מרוקנים את התור
  const runId = crypto.randomUUID().slice(0, 8);
  await admin.from("push_queue").update({ status: "skipped", note: "old" }).eq("status", "queued").lt("created_at", new Date(Date.now() - 3 * 864e5).toISOString());
  const { data: open } = await admin.from("push_queue").select("id").eq("status", "queued").eq("note", "").order("id").limit(300);
  if (!open?.length) return json({ ok: true, sent: 0 });
  const { data: mine } = await admin.from("push_queue").update({ note: "run:" + runId }).in("id", open.map((r) => r.id)).eq("note", "").eq("status", "queued").select("*");
  let sent = 0, deferred = 0, skipped = 0;
  const byUser = new Map<string, typeof mine>();
  for (const q of mine || []) { if (!byUser.has(q.user_id)) byUser.set(q.user_id, []); byUser.get(q.user_id)!.push(q); }
  for (const [uid, items] of byUser) {
    const { data: pr } = await admin.from("push_prefs").select("*").eq("user_id", uid).maybeSingle();
    const prefs = { max_per_day: 6, quiet: false, shabbat: true, kinds: {} as Record<string, boolean>, ...(pr || {}) };
    const why = blocked(prefs);
    if (why) { await admin.from("push_queue").update({ note: "" }).in("id", items!.map((q) => q.id)); deferred += items!.length; continue; }
    const { count: today } = await admin.from("push_queue").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "sent").gt("sent_at", new Date(Date.now() - 864e5).toISOString());
    let budget = prefs.max_per_day - (today || 0);
    const { data: subs } = await admin.from("push_subs").select("*").eq("user_id", uid);
    // 📲 טלפון עם האפליקציה: הוא לא מקבל Web Push, אלא מושך את מה שסומן כאן "sent" (app_notices_for, כל רבע שעה)
    const { count: phones } = await admin.from("app_devices").select("token", { count: "exact", head: true }).eq("user_id", uid);
    const seenTags = new Set<string>();
    for (const q of items!) {
      const mark = (status: string, note: string) => admin.from("push_queue").update({ status, note, sent_at: status === "sent" ? new Date().toISOString() : null }).eq("id", q.id);
      if (prefs.kinds && prefs.kinds[q.kind] === false) { await mark("skipped", "kind off"); skipped++; continue; }
      if (q.tag) {
        if (seenTags.has(q.tag)) { await mark("skipped", "dup"); skipped++; continue; }
        seenTags.add(q.tag);
        const { count: dup } = await admin.from("push_queue").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("tag", q.tag).eq("status", "sent")
          .gt("sent_at", new Date(Date.now() - dedupeMinutes(q.tag) * 60000).toISOString());
        if (dup) { await mark("skipped", "recent"); skipped++; continue; }
      }
      if (budget <= 0) { await mark("skipped", "daily cap"); skipped++; continue; }
      if (!subs?.length && !phones) { await mark("skipped", "no device"); skipped++; continue; }
      let ok = 0;
      for (const s of subs || []) if ((await sendOne(admin, keys, s, { title: q.title, body: q.body, url: q.url, tag: q.tag || q.kind })) === "ok") ok++;
      if (phones) ok++;
      await mark(ok ? "sent" : "failed", ok ? (subs?.length ? "" : "app") : "send failed");
      if (ok) { sent++; budget--; }
    }
  }
  return json({ ok: true, sent, deferred, skipped });
}));

// deno-lint-ignore no-explicit-any
async function sendOne(admin: any, keys: { public_key: string; private_jwk: JsonWebKey }, s: { endpoint: string; p256dh: string; auth_key: string }, msg: Record<string, string>) {
  if (!knownPushHost(s.endpoint)) { console.error("push: unknown push host — skipped"); return "err host"; }
  try {
    const payload = enc.encode(JSON.stringify(msg));
    const r = await fetch(s.endpoint, {
      signal: AbortSignal.timeout(10000),
      method: "POST",
      headers: {
        Authorization: await vapidAuth(s.endpoint, keys.public_key, keys.private_jwk),
        "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "normal",
      },
      body: await encryptPayload(s.p256dh, s.auth_key, payload),
    });
    if (r.status === 404 || r.status === 410) { await admin.from("push_subs").delete().eq("endpoint", s.endpoint); return "gone"; }
    if (!r.ok) { console.error("push", r.status, (await r.text()).slice(0, 200)); return "err " + r.status; }
    await admin.from("push_subs").update({ last_ok: new Date().toISOString() }).eq("endpoint", s.endpoint);
    return "ok";
  } catch (e) { console.error("push", e); return "err"; }
}
