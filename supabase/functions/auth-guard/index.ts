// הגנה על הרשמה, כניסה ואיפוס קוד — Supabase Edge Function בשם auth-guard.
// • חשוב: בהגדרות הפונקציה לכבות "Verify JWT" (מתחברים דרכה לפני שיש משתמש).
// • כל ההגנות בצד השרת ובשקט: דומיינים מזויפים/זמניים, הגבלת קצב לפי IP ומייל, מלכודת בוטים, טופס שנשלח מהר מדי,
//   תיעוד IP + דפדפן + שעה, קישור איפוס ל-30 דקות ולשימוש אחד, ניתוק כל המכשירים אחרי איפוס.
// • הקוד שהמשתמש בוחר לא נשמר אף פעם כטקסט: Supabase שומר רק bcrypt של "קוד נגזר" (HMAC עם סוד פנימי) —
//   כך אי אפשר לנחש קודים ישירות מול השרת ולעקוף את הגבלת הניסיונות.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const enc = new TextEncoder();
// הבעלים: רק חשבון שסומן yam_owner ב-app_metadata (משתמש לא יכול לשנות app_metadata בעצמו — רק SQL/השרת). שום מייל לא כתוב בקוד כבעלים
// deno-lint-ignore no-explicit-any
const isOwnerUser = (u: any) => !!u && !!u.email_confirmed_at && (u.app_metadata?.yam_owner === true || u.app_metadata?.yam_owner === "true");
// רק הדומיין שלנו — בלי *.netlify.app / *.vercel.app (כל אחד יכול לפתוח שם אתר ולקבל אליו קישורי אימות/איפוס)
const ALLOWED_REDIRECT = /^https:\/\/(www\.|server\.)?yamshopping\.com\//;

type Cfg = { signup_per_ip_hour: number; login_fail_max: number; login_window_min: number; reset_per_email_hour: number; reset_link_min: number; ip_allow: string[]; verify_email: boolean };
const DEF: Cfg = { signup_per_ip_hour: 3, login_fail_max: 5, login_window_min: 15, reset_per_email_hour: 3, reset_link_min: 30, ip_allow: [], verify_email: true };

let pepperCache = "";
async function pepper(): Promise<string> {
  if (pepperCache) return pepperCache;
  const { data, error } = await admin.from("auth_secret").select("pepper, guard_seen_at").eq("id", 1).maybeSingle();
  if (error || !data) throw new Error("auth_secret missing — run the SQL");
  if (!data.guard_seen_at) await admin.from("auth_secret").update({ guard_seen_at: new Date().toISOString() }).eq("id", 1);
  pepperCache = data.pepper;
  return pepperCache;
}
async function hmacHex(key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const b64u = (hex: string) => btoa(String.fromCharCode(...hex.match(/../g)!.map((h) => parseInt(h, 16)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// הקוד ש-Supabase שומר (כ-bcrypt): נגזר מהקוד של המשתמש + סוד שרק השרת מכיר
async function derive(email: string, code: string) { return "v1." + b64u(await hmacHex(await pepper(), email + ":" + code)); }

async function cfg(): Promise<Cfg> {
  const { data } = await admin.from("site_config").select("value").eq("key", "security").maybeSingle();
  const v = (data?.value || {}) as Partial<Cfg>;
  const n = (x: unknown, d: number, lo: number, hi: number) => { const k = Number(x); return Number.isFinite(k) ? Math.min(hi, Math.max(lo, Math.round(k))) : d; };
  return {
    signup_per_ip_hour: n(v.signup_per_ip_hour, DEF.signup_per_ip_hour, 1, 1000),
    login_fail_max: n(v.login_fail_max, DEF.login_fail_max, 3, 100),
    login_window_min: n(v.login_window_min, DEF.login_window_min, 5, 1440),
    reset_per_email_hour: n(v.reset_per_email_hour, DEF.reset_per_email_hour, 1, 20),
    reset_link_min: n(v.reset_link_min, DEF.reset_link_min, 5, 60),
    ip_allow: Array.isArray(v.ip_allow) ? v.ip_allow.map(String).slice(0, 200) : [],
    // אימות מייל בהרשמה — דלוק כברירת מחדל; מנהל האתר יכול לכבות ולהדליק בבק אופיס ← 🔐 אבטחה
    verify_email: v.verify_email !== false,
  };
}
// ה-IP של המשתמש — רק ממקור שהמשתמש לא יכול לזייף:
// • cf-connecting-ip — Cloudflare (שיושב לפני Supabase) דורס אותו תמיד בערך האמיתי.
// • x-real-ip — נקבע ע"י שער הכניסה של הפלטפורמה.
// • x-forwarded-for — הרשומה האחרונה בלבד (זו שהשרת שלפנינו הוסיף). הרשומה הראשונה נשלחת ע"י הלקוח עצמו
//   וכל אחד יכול לכתוב שם מה שהוא רוצה — מי שסמך עליה איפשר לעקוף הגבלות קצב, ip_allow, ולהעביר IP מזויף ל-Supabase Auth.
// כתובת פנימית של השרתים עצמם (לא של משתמש) — מדלגים עליה, אחרת כל המשתמשים ייראו כאותו IP ויחסמו יחד
const internalIp = (ip: string) => /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|0\.)/.test(ip) || /^(::1$|f[cd]|fe80:)/i.test(ip);
function clientIp(req: Request) {
  const cf = (req.headers.get("cf-connecting-ip") || "").trim();
  if (cf && !internalIp(cf)) return cf.slice(0, 64);
  const real = (req.headers.get("x-real-ip") || "").trim();
  if (real && !internalIp(real)) return real.slice(0, 64);
  // מהסוף להתחלה: הרשומה הראשונה מהסוף שאינה כתובת פנימית של הפלטפורמה
  const xff = (req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = xff.length - 1; i >= 0; i--) if (!internalIp(xff[i])) return xff[i].slice(0, 64);
  return "";
}
// מפתח ה-IP להגבלות קצב ולתיעוד: IPv4 כמו שהוא; IPv6 לפי ה-/64 (4 הקבוצות הראשונות) —
// לכל חיבור ביתי יש /64 שלם, ובלי זה אפשר להחליף כתובת בכל ניסיון ולעקוף כל הגבלה
function ipKey(ip: string) {
  let a = ip.trim().replace(/^\[|\]$/g, "").replace(/%.*$/, "").toLowerCase();
  if (!a.includes(":")) return a.slice(0, 64);
  const m4 = a.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (m4) return m4[1];
  // IPv4 בסוף כתובת IPv6 (למשל 64:ff9b::1.2.3.4) — נחשב כשתי קבוצות
  a = a.replace(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/, (_m, w, x, y, z) =>
    ((+w << 8) | +x).toString(16) + ":" + ((+y << 8) | +z).toString(16));
  const [head, tail] = a.split("::", 2);
  const h = head ? head.split(":") : [], t = tail === undefined ? [] : tail ? tail.split(":") : [];
  const full = tail === undefined ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t];
  if (full.length !== 8 || !full.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return a.slice(0, 64);
  return full.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":") + "::/64";
}
// טריגר במסד הנתונים חוסם כל שינוי סיסמה ב-auth.users בלי אישור חד-פעמי מכאן (auth_pw_allow, 2 דקות).
// חובה לקרוא לזה לפני כל updateUserById שמשנה סיסמה
async function allowPw(uid: string) {
  const { error } = await admin.from("auth_pw_allow").upsert({ user_id: uid, until: new Date(Date.now() + 120000).toISOString() });
  if (error) console.error("auth_pw_allow", error);
}
async function log(kind: string, email: string, ip: string, ua: string, user_id: string | null = null, detail = "") {
  await admin.from("auth_events").insert({ kind, email, ip, ua, user_id, detail: detail.slice(0, 200) });
}
async function countSince(kind: string, col: "email" | "ip", val: string, minutes: number) {
  if (!val) return 0;
  return await countWhere(kind, { [col]: val }, minutes);
}
// ספירה לפי כמה עמודות ביחד (למשל מייל + IP)
async function countWhere(kind: string, where: Record<string, string>, minutes: number) {
  if (Object.values(where).some((v) => !v)) return 0;
  let q = admin.from("auth_events").select("id", { count: "exact", head: true }).eq("kind", kind);
  for (const [k, v] of Object.entries(where)) q = q.eq(k, v);
  const { count } = await q.gt("created_at", new Date(Date.now() - minutes * 60000).toISOString());
  return count || 0;
}
// IP שכבר נכנס בהצלחה (בקוד או בגוגל) למייל הזה ב-30 הימים האחרונים
async function knownIp(email: string, ip: string) {
  if (!email || !ip) return false;
  const { count } = await admin.from("auth_events").select("id", { count: "exact", head: true })
    .eq("email", email).eq("ip", ip).in("kind", ["login", "google_login"])
    .gt("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
  return (count || 0) > 0;
}
// נעילת כניסה: לפי הצמד (מייל, IP), ותקרה לכל IP; ובנוסף תקרה גבוהה בהרבה למייל (מכל ה-IP ביחד) נגד ניחוש מבוזר.
// IP שכבר נכנס בהצלחה למייל הזה ב-30 הימים האחרונים פטור מהתקרה של המייל — כך מי שתוקף מבחוץ לא נועל את בעל החשבון
// במכשירים הרגילים שלו. מ-IP חדש בעל החשבון עלול להיחסם בזמן מתקפה מבוזרת — ואז "שכחתי את הקוד" עובד תמיד.
// counted = הניסיון הנוכחי כבר נרשם לפני הספירה (הרגיל). אם הרישום נכשל — מוסיפים אותו ידנית.
async function lockState(email: string, ip: string, c: Cfg, allowIp: boolean, counted = true) {
  const add = counted ? 0 : 1;
  const [fEI, fE, fI] = (await Promise.all([
    ip ? countWhere("login_fail", { email, ip }, c.login_window_min) : countSince("login_fail", "email", email, c.login_window_min),
    countSince("login_fail", "email", email, c.login_window_min),
    allowIp ? Promise.resolve(0) : countSince("login_fail", "ip", ip, c.login_window_min),
  ])).map((n, i) => n + (i === 2 && allowIp ? 0 : add));
  const capE = c.login_fail_max * 10;
  const known = fE > capE && await knownIp(email, ip);
  const why = fEI > c.login_fail_max ? "email_ip" : fE > capE && !known ? "email" : fI > c.login_fail_max ? "ip" : "";
  const left = Math.max(0, Math.min(c.login_fail_max - Math.max(fEI, fI), known ? Infinity : capE - fE));
  return { why, left };
}
// קריאה ל-Supabase Auth מהשרת, עם ה-IP האמיתי של המשתמש (כדי שהגבלות של Supabase יחולו על כל משתמש בנפרד)
async function gotrue(path: string, body: unknown, ip: string) {
  const r = await fetch(URL_ + "/auth/v1/" + path, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE, "Content-Type": "application/json", ...(ip ? { "Sb-Forwarded-For": ip, "X-Forwarded-For": ip } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data: data as Record<string, unknown> };
}
// מייל אימות של Supabase (התבנית "Confirm signup" בהגדרות Supabase ← Authentication ← Emails)
async function sendVerify(email: string, redirect: string, ip: string) {
  const q = ALLOWED_REDIRECT.test(redirect) ? "?redirect_to=" + encodeURIComponent(redirect) : "";
  const r = await gotrue("resend" + q, { type: "signup", email }, ip);
  if (!r.ok) console.error("resend", r.status, r.data);
  return r.ok;
}
const session = (d: Record<string, unknown>) => ({ access_token: d.access_token, refresh_token: d.refresh_token, expires_in: d.expires_in, expires_at: d.expires_at, token_type: d.token_type, user: d.user });
const validCode = (c: string) => c.length >= 8 && c.length <= 72 && /[0-9]/.test(c) && /[^0-9]/.test(c);
const validEmail = (e: string) => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
function jwtPayload(t: string): Record<string, unknown> {
  try { const p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(p + "===".slice((p.length + 3) % 4))); } catch { return {}; }
}
async function emailBlocked(e: string) {
  const { data } = await admin.rpc("auth_email_blocked", { p_email: e });
  return data === true;
}
async function nonce() { const t = Date.now().toString(36); return t + "." + (await hmacHex(await pepper(), "nonce:" + t)).slice(0, 32); }
async function nonceAge(n: string) {
  const [t, sig] = String(n || "").split(".");
  if (!t || !sig) return -1;
  if ((await hmacHex(await pepper(), "nonce:" + t)).slice(0, 32) !== sig) return -1;
  return Date.now() - parseInt(t, 36);
}

// ---------- 🙋 אישור כניסה ידני מהבק אופיס ----------
// חשבון בלי מייל: שם משתמש (אותיות באנגלית/ספרות) שנשמר כ-<שם>@nomail.yamshopping.com. לכתובת הזו לא נשלח אף מייל.
const NOMAIL = "@nomail.yamshopping.com";
const isNoMail = (e: string) => e.endsWith(NOMAIL);
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,29}$/;
// מייל או שם משתמש → המייל של החשבון
function accountEmail(v: string) {
  const a = v.trim().toLowerCase();
  if (a.includes("@")) return validEmail(a) ? a : "";
  return USERNAME.test(a) ? a + NOMAIL : "";
}
const sha256 = async (s: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const randHex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
const LR_PENDING_MIN = 120, LR_APPROVED_MIN = 60;
// מי שקורא: owner / admin (כמו is_admin במסד הנתונים — כולל אימות דו-שלבי אם הופעל לו) או ריק
async function staffRole(jwt: string): Promise<{ role: "owner" | "admin" | ""; id: string; email: string }> {
  const none = { role: "" as const, id: "", email: "" };
  if (!jwt) return none;
  const { data: ud } = await admin.auth.getUser(jwt);
  const u = ud?.user;
  if (!u) return none;
  const email = String(u.email || "").toLowerCase();
  let role: "owner" | "admin" | "" = isOwnerUser(u) ? "owner" : "";
  if (!role) {
    const { data: st } = await admin.from("staff").select("role").eq("user_id", u.id).maybeSingle();
    if ((st as { role?: string } | null)?.role === "admin") role = "admin";
  }
  if (role && (u.factors || []).some((f: { status?: string }) => f.status === "verified") && jwtPayload(jwt).aal !== "aal2") {
    const { data: m } = await admin.from("mfa_settings").select("off").eq("id", 1).maybeSingle();
    if ((m as { off?: boolean } | null)?.off !== true) role = "";
  }
  return { role, id: u.id, email };
}
// חיבור (session) למשתמש בלי קוד: קישור כניסה חד-פעמי שנוצר ונפדה כאן בשרת — שום מייל לא נשלח
async function sessionFor(email: string, ip: string) {
  for (const type of ["magiclink", "recovery"] as const) {
    const { data, error } = type === "magiclink" ? await admin.auth.admin.generateLink({ type: "magiclink", email }) : await admin.auth.admin.generateLink({ type: "recovery", email });
    const th = (data?.properties as { hashed_token?: string } | undefined)?.hashed_token;
    if (error || !th) { console.error("generateLink", type, error); continue; }
    const v = await gotrue("verify", { type, token_hash: th }, ip);
    if (v.ok && v.data.access_token) return session(v.data);
    console.error("verify", type, v.status, v.data);
  }
  return null;
}

// המנהל בוחר חשבון (מייל או שם משתמש); אם אין — אפשר לפתוח חדש. רק הבעלים מכניסים לחשבון של בעלים / איש צוות
async function resolveTarget(me: { role: string }, account: string, create: boolean, name: string, ip: string, ua: string):
  Promise<{ uid: string; email: string; created: boolean } | { error: string; status?: number; nomail?: boolean }> {
  const email = accountEmail(account);
  if (!email) return { error: "account" };
  const { data: st } = await admin.rpc("auth_user_state", { p_email: email });
  const found = Array.isArray(st) ? st[0] : st;
  let uid = found?.id ? String(found.id) : "", created = false;
  if (!uid) {
    if (!create) return { error: "not_found", nomail: isNoMail(email) };
    if (await emailBlocked(email)) return { error: "domain" };
    const nm = name.replace(/[<>]/g, "").trim().slice(0, 40) || email.split("@")[0];
    const { data: cu, error: ce } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name: nm, guard: await hmacHex(await pepper(), email) } });
    if (ce || !cu?.user) { console.error("lr createUser", ce); return { error: "generic" }; }
    uid = cu.user.id; created = true;
    await log("signup", email, ip, ua, uid, "admin_created");
  }
  if (me.role !== "owner") {
    const { data: sf } = await admin.from("staff").select("user_id").eq("user_id", uid).maybeSingle();
    if (sf) return { error: "forbidden_target", status: 403 };
    // בעלים שמזוהה לפי הסימון בחשבון (ולא לפי מייל) — גם לחשבון שלו רק בעלים יכולים להיכנס
    const { data: tu, error: te } = await admin.auth.admin.getUserById(uid);
    const tm = (tu?.user?.app_metadata || {}) as { yam_owner?: unknown };
    if (te || tm.yam_owner === true || tm.yam_owner === "true") return { error: "forbidden_target", status: 403 };
  }
  return { uid, email, created };
}
// המנהל אישר מראש — מוחקים את הכניסות הכושלות האחרונות של החשבון
async function clearFails(email: string) {
  await admin.from("auth_events").delete().eq("email", email).in("kind", ["login_fail", "login_locked"])
    .gt("created_at", new Date(Date.now() - 2 * 86400000).toISOString());
}
// ✉️ אישור מראש למייל: הכניסה הראשונה עם המייל הזה (בתוך הזמן) נכנסת בלי קוד — פעם אחת בלבד
async function claimPre(email: string, ip: string, rawIp: string, ua: string) {
  if (!email) return null;
  const now = new Date().toISOString();
  const { data: rows } = await admin.from("login_requests").select("id,user_id").eq("kind", "pre").eq("status", "approved")
    .eq("user_email", email).gt("expires_at", now).order("decided_at", { ascending: false }).limit(1);
  const row = (rows as { id: string; user_id: string | null }[] | null)?.[0];
  if (!row?.user_id) return null;
  const { data: claimed } = await admin.from("login_requests").update({ status: "used", used_at: now, ip, ua })
    .eq("id", row.id).eq("status", "approved").select("id");
  if (!claimed || !(claimed as unknown[]).length) return null;
  const s = await sessionFor(email, rawIp);
  if (!s) { await admin.from("login_requests").update({ status: "approved", used_at: null }).eq("id", row.id); return null; }
  await log("login", email, ip, ua, row.user_id, "admin_preapproved");
  return s;
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

Deno.serve(withOriginCheck(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const action = String(b.action || "");
  // rawIp — הכתובת המלאה (נשלחת ל-Supabase Auth); ip — המפתח המנורמל (/64 ב-IPv6) לספירה ולתיעוד
  const rawIp = clientIp(req), ip = ipKey(rawIp), ua = (req.headers.get("user-agent") || "").slice(0, 300);

  try {
    // ההגדרות — בתוך ה-try: תקלה במסד הנתונים מחזירה "generic" ולא קורסת
    const c = await cfg().catch((e) => { console.error("cfg", e); return DEF; });
    const allowIp = !!ip && c.ip_allow.map(ipKey).includes(ip);
    if (action === "nonce") return json({ nonce: await nonce() });

    // ---------- הרשמה ----------
    if (action === "signup") {
      const email = String(b.email || "").trim().toLowerCase(), code = String(b.code || ""), name = String(b.name || "").trim().slice(0, 40);
      // מלכודת בוטים: שדה נסתר שאדם לא רואה. מולא → דוחים בשקט
      if (String(b.hp || "") !== "") { await log("signup_blocked", email, ip, ua, null, "honeypot"); return json({ error: "generic" }); }
      // טופס שנשלח פחות מ-3 שניות אחרי שנפתח — לפי חותמת זמן חתומה מהשרת (nonce) בלבד.
      // את elapsed הלקוח יכול לכתוב כרצונו, לכן הוא לא נחשב: בלי nonce תקף אין הרשמה.
      const age = b.nonce ? await nonceAge(String(b.nonce)) : -1;
      if (age < 0 || age > 12 * 3600_000) { await log("signup_blocked", email, ip, ua, null, "nonce"); return json({ error: "nonce" }); }
      if (age < 3000) { await log("signup_blocked", email, ip, ua, null, "too_fast"); return json({ error: "generic" }); }
      if (!validEmail(email) || isNoMail(email)) return json({ error: "email" });
      if (await emailBlocked(email)) { await log("signup_blocked", email, ip, ua, null, "domain"); return json({ error: "domain" }); }
      if (!validCode(code)) return json({ error: "weak" });
      if (!name) return json({ error: "name" });
      if (!allowIp && await countSince("signup", "ip", ip, 60) >= c.signup_per_ip_hour) { await log("signup_blocked", email, ip, ua, null, "rate"); return json({ error: "rate" }); }
      const guard = await hmacHex(await pepper(), email);
      const verify = c.verify_email;
      // משתמש חדש מקבל תמיד הרשאות בסיסיות בלבד: רק שם — שום role / הרשאה מהלקוח
      const mk = async () => admin.auth.admin.createUser({ email, password: await derive(email, code), email_confirm: !verify, user_metadata: { name, guard } });
      const { data: cu, error: ce } = await mk();
      if (ce || !cu?.user) {
        const m = String(ce?.message || "").toLowerCase();
        if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
          // המייל כבר רשום. לא מוחקים ולא משנים קוד לחשבון קיים (אחרת אפשר "לתפוס" מראש חשבון של מישהו אחר עם קוד שהתוקף בחר).
          // לא מאומת → רק שולחים שוב את מייל האימות. מאומת → אותה תשובה כמו הרשמה חדשה, כדי שאי אפשר לגלות מי רשום.
          const { data: st } = await admin.rpc("auth_user_state", { p_email: email });
          const row = Array.isArray(st) ? st[0] : st;
          if (row && row.id && !row.confirmed) {
            // ייתכן שמישהו אחר בחר את הקוד של החשבון הזה — מסמנים "שנוי במחלוקת": כניסה עם קוד חסומה
            // עד שבעל המייל קובע קוד חדש דרך "שכחתי את הקוד" (קישור למייל)
            const { data: gu } = await admin.auth.admin.getUserById(String(row.id));
            const am0 = (gu?.user?.app_metadata || {}) as Record<string, unknown>;
            if (gu?.user && !am0.pw_contested) {
              const { error: me } = await admin.auth.admin.updateUserById(String(row.id), { app_metadata: { ...am0, pw_contested: true } });
              if (me) console.error("pw_contested", me);
            }
            // עד 3 מיילים לאותה כתובת בשעה (הרשמות + שליחות חוזרות)
            if (await countSince("signup", "email", email, 60) >= 3) { await log("signup_blocked", email, ip, ua, null, "email_rate"); return json({ ok: true, verify: true }); }
            await sendVerify(email, String(b.redirect || ""), rawIp);
            await log("signup", email, ip, ua, String(row.id), "verify_resent");
            return json({ ok: true, verify: true });
          }
          await log("signup_blocked", email, ip, ua, row?.id ? String(row.id) : null, "exists");
          return json(verify ? { ok: true, verify: true } : { error: "exists" });
        } else {
          if (m.includes("signup_blocked_domain")) return json({ error: "domain" });
          console.error("createUser", ce);
          return json({ error: "generic" });
        }
      }
      if (verify) {
        // שולחים מייל עם קישור לאימות. בלי אימות אי אפשר להיכנס — כך אף אחד לא יכול לפתוח חשבון על מייל של מישהו אחר
        const sent = await sendVerify(email, String(b.redirect || ""), rawIp);
        if (!sent) {
          await admin.auth.admin.deleteUser(cu.user.id).catch(() => {});
          await log("signup_blocked", email, ip, ua, null, "mail");
          return json({ error: "mail" });
        }
        await log("signup", email, ip, ua, cu.user.id, "verify_sent");
        return json({ ok: true, verify: true });
      }
      await log("signup", email, ip, ua, cu.user.id);
      const t = await gotrue("token?grant_type=password", { email, password: await derive(email, code) }, rawIp);
      return json(t.ok ? { ok: true, session: session(t.data) } : { ok: true, session: null });
    }

    // ---------- שליחה חוזרת של מייל האימות: תמיד אותה תשובה, גם אם המייל לא רשום ----------
    if (action === "resend_verify") {
      const email = String(b.email || "").trim().toLowerCase();
      if (!validEmail(email) || isNoMail(email)) return json({ ok: true });
      if (await countSince("signup", "email", email, 60) >= 3 || (!allowIp && await countSince("signup", "ip", ip, 60) >= 10)) return json({ ok: true });
      const { data: st } = await admin.rpc("auth_user_state", { p_email: email });
      const row = Array.isArray(st) ? st[0] : st;
      if (row && row.id && !row.confirmed) {
        await sendVerify(email, String(b.redirect || ""), rawIp);
        await log("signup", email, ip, ua, String(row.id), "verify_resent");
      }
      return json({ ok: true });
    }

    // ---------- כניסה ----------
    if (action === "login") {
      const email = String(b.email || "").trim().toLowerCase(), code = String(b.code || "");
      // ✉️ המנהל אישר את המייל הזה מראש — נכנסים בלי קוד (גם אם החשבון חסום אחרי כניסות כושלות)
      if (validEmail(email)) { const pre = await claimPre(email, ip, rawIp, ua); if (pre) return json({ ok: true, session: pre, approved: true, username: isNoMail(email) ? email.slice(0, -NOMAIL.length) : "" }); }
      if (!validEmail(email) || !code) return json({ error: "invalid" });
      // רושמים את הניסיון *לפני* הבדיקה מול Supabase Auth (כ-login_fail שמתעדכן בסוף) וסופרים אחרי הרישום —
      // כך גם עשרות בקשות במקביל לא יכולות לעבור את הבדיקה ביחד ולקבל יותר ניסיונות מהמותר.
      const { data: tryRow, error: tryErr } = await admin.from("auth_events")
        .insert({ kind: "login_fail", email, ip, ua, detail: "try" }).select("id").single();
      if (tryErr) console.error("login try row", tryErr);
      const tryId = (tryRow as { id?: number } | null)?.id;
      const setTry = async (patch: Record<string, unknown> | null) => {
        if (!tryId) return;
        const q = patch ? admin.from("auth_events").update(patch).eq("id", tryId) : admin.from("auth_events").delete().eq("id", tryId);
        const { error } = await q; if (error) console.error("login try update", error);
      };
      const st = await lockState(email, ip, c, allowIp, !!tryId);
      if (st.why) {
        // ניסיון חסום לא נספר ככישלון (כדי שהנעילה לא תתארך בלי סוף) — נרשם כ-login_locked
        if (tryId) await setTry({ kind: "login_locked", detail: st.why }); else await log("login_locked", email, ip, ua, null, st.why);
        return json({ error: "locked", minutes: c.login_window_min });
      }
      let t = await gotrue("token?grant_type=password", { email, password: await derive(email, code) }, rawIp);
      if (!t.ok && code.length <= 72) {
        // משתמש ותיק שעוד לא עבר לשיטה החדשה — מנסים את הקוד כמו שהוא, ואם הצליח מעבירים אותו לשיטה החדשה (פעם אחת, ברקע)
        const legacy = await gotrue("token?grant_type=password", { email, password: code }, rawIp);
        if (legacy.ok) {
          t = legacy;
          const uid = (legacy.data.user as { id?: string })?.id;
          if (uid) { await allowPw(uid); await admin.auth.admin.updateUserById(uid, { password: await derive(email, code) }); }
        }
      }
      if (t.ok && ((t.data.user as { app_metadata?: { pw_contested?: unknown } })?.app_metadata?.pw_contested === true)) {
        // החשבון נפתח בזמן שעוד לא אומת, וניסו להירשם אליו שוב — אולי הקוד נבחר ע"י מישהו אחר.
        // לא מחזירים חיבור: רק בעל המייל יכול להיכנס, דרך "שכחתי את הקוד"
        await admin.auth.admin.signOut(String(t.data.access_token || ""), "local").catch(() => {});
        const uid = (t.data.user as { id?: string })?.id || null;
        if (tryId) await setTry({ kind: "login_locked", user_id: uid, detail: "pw_contested" }); else await log("login_locked", email, ip, ua, uid, "pw_contested");
        return json({ error: "reset_required" });
      }
      if (t.ok) {
        const uid = (t.data.user as { id?: string })?.id || null;
        if (tryId) await setTry({ kind: "login", user_id: uid, detail: "" }); else await log("login", email, ip, ua, uid);
        return json({ ok: true, session: session(t.data) });
      }
      const code_ = String(t.data.error_code || t.data.code || "");
      if (code_ === "email_not_confirmed") { await setTry(null); return json({ error: "not_confirmed" }); }
      if (t.status === 429) { await setTry(null); return json({ error: "rate" }); }
      // רק תשובה "פרטים לא נכונים" מ-Supabase אומרת שהקוד לא נכון. כל תקלה אחרת (שרת, טריגר במסד, פסק זמן)
      // הוצגה עד עכשיו כ"קוד לא נכון" — עכשיו נרשמת ביומן עם הסיבה, והמשתמש מתבקש לנסות שוב
      const wrong = code_ === "invalid_credentials" || String(t.data.error || "") === "invalid_grant" || (t.status === 400 && !code_);
      if (!wrong) {
        console.error("login gotrue", t.status, t.data);
        const why = ("server:" + t.status + ":" + (code_ || String(t.data.msg || t.data.message || ""))).slice(0, 120);
        if (tryId) await setTry({ kind: "login_locked", detail: why }); else await log("login_locked", email, ip, ua, null, why);
        return json({ error: "generic" });
      }
      if (tryId) await setTry({ detail: "" }); else await log("login_fail", email, ip, ua);
      // הניסיון הנוכחי כבר נספר (נרשם לפני הבדיקה)
      return json({ error: "invalid", left: st.left });
    }

    // ---------- בקשת איפוס קוד: תמיד אותה תשובה, גם אם המייל לא רשום ----------
    if (action === "reset") {
      const email = String(b.email || "").trim().toLowerCase();
      const redirect = String(b.redirect || "");
      // חשבון בלי מייל — אין לאן לשלוח. מקבלים כניסה דרך "בקשת אישור כניסה" מהמנהל
      if (!validEmail(email)) return json({ ok: true });
      if (isNoMail(email)) return json({ ok: true, nomail: true });
      if (await countSince("reset_request", "email", email, 60) >= c.reset_per_email_hour || (!allowIp && await countSince("reset_request", "ip", ip, 60) >= 10)) {
        await log("reset_blocked", email, ip, ua); return json({ ok: true });
      }
      await log("reset_request", email, ip, ua);
      const q = ALLOWED_REDIRECT.test(redirect) ? "?redirect_to=" + encodeURIComponent(redirect) : "";
      const r = await gotrue("recover" + q, { email }, rawIp);
      if (!r.ok) console.error("recover", r.status, r.data);
      return json({ ok: true });
    }

    // ---------- קביעת קוד חדש (מהקישור במייל, או מהאזור האישי) ----------
    if (action === "set_password") {
      const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const { data: ud, error: ue } = await admin.auth.getUser(jwt);
      if (ue || !ud?.user) return json({ error: "auth" }, 401);
      const user = ud.user, email = String(user.email || "").toLowerCase(), code = String(b.code || "");
      if (!validCode(code)) return json({ error: "weak" });
      const p = jwtPayload(jwt);
      const amr = (Array.isArray(p.amr) ? p.amr : []) as { method?: string; timestamp?: number }[];
      const rec = amr.find((a) => ["recovery", "otp", "magiclink"].includes(String(a.method)));
      const sid = String(p.session_id || "");
      if (!rec) {
        // שינוי קוד מהאזור האישי (לא מקישור איפוס): חייבים את הקוד הנוכחי — כך מי שהשיג רק חיבור פתוח
        // (מכשיר שנשכח פתוח / טוקן שנגנב) לא יכול להשתלט על החשבון. מי שנכנס רק עם גוגל ואין לו קוד —
        // חייב כניסה טרייה (עד 10 דקות) עם גוגל באותו חיבור.
        const am = (user.app_metadata || {}) as { provider?: string; providers?: unknown };
        const provs = new Set<string>([
          ...(Array.isArray(am.providers) ? am.providers.map(String) : []),
          ...(am.provider ? [String(am.provider)] : []),
          ...((user.identities || []) as { provider?: string }[]).map((i) => String(i.provider || "")),
        ]);
        const hasPassword = provs.has("email") || provs.size === 0;
        if (hasPassword) {
          const current = String(b.current || "");
          if (!current || current.length > 200) return json({ error: "current" });
          // אותה נעילה כמו בכניסה — שהבדיקה כאן לא תהפוך לדרך לנחש קודים
          const { data: tryRow } = await admin.from("auth_events").insert({ kind: "login_fail", email, ip, ua, user_id: user.id, detail: "try:set_password" }).select("id").single();
          const tryId = (tryRow as { id?: number } | null)?.id;
          const st = await lockState(email, ip, c, allowIp, !!tryId);
          if (st.why) {
            if (tryId) await admin.from("auth_events").update({ kind: "login_locked", detail: st.why }).eq("id", tryId);
            return json({ error: "locked", minutes: c.login_window_min });
          }
          let ok = (await gotrue("token?grant_type=password", { email, password: await derive(email, current) }, rawIp)).ok;
          if (!ok && current.length <= 72) ok = (await gotrue("token?grant_type=password", { email, password: current }, rawIp)).ok;
          if (!ok) {
            if (tryId) await admin.from("auth_events").update({ detail: "set_password" }).eq("id", tryId);
            return json({ error: "current" });
          }
          if (tryId) await admin.from("auth_events").delete().eq("id", tryId);
        } else {
          const fresh = amr.some((a) => ["oauth", "otp"].includes(String(a.method)) && Date.now() / 1000 - Number(a.timestamp || 0) <= 600);
          if (!fresh) return json({ error: "reauth" });
        }
      }
      if (rec) {
        // הקישור תקף ל-30 דקות בלבד ולשימוש אחד
        if (Date.now() / 1000 - Number(rec.timestamp || 0) > c.reset_link_min * 60) return json({ error: "expired" });
        if (sid) {
          const { error: dup } = await admin.from("auth_reset_used").insert({ session_id: sid });
          if (dup) return json({ error: "used" });
        }
      }
      await allowPw(user.id);
      // קוד חדש מקישור במייל = בעל המייל האמיתי — מבטלים את הסימון "שנוי במחלוקת"
      const am1 = (user.app_metadata || {}) as Record<string, unknown>;
      const { error: pe } = await admin.auth.admin.updateUserById(user.id, {
        password: await derive(email, code),
        ...(rec && am1.pw_contested ? { app_metadata: { ...am1, pw_contested: false } } : {}),
      });
      if (pe) { console.error("updateUser", pe); return json({ error: "generic" }); }
      // מנתקים את כל החיבורים הפעילים של המשתמש (כל המכשירים)
      await admin.auth.admin.signOut(jwt, "global").catch(() => {});
      await log("password_changed", email, ip, ua, user.id, rec ? "reset_link" : "settings");
      // ונכנסים מחדש רק במכשיר הזה — כך המשתמש לא מרגיש שום שלב נוסף
      const t = await gotrue("token?grant_type=password", { email, password: await derive(email, code) }, rawIp);
      return json({ ok: true, session: t.ok ? session(t.data) : null });
    }

    // ---------- תיעוד כניסה עם גוגל (IP, דפדפן, שעה) ----------
    if (action === "log_login") {
      const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const { data: ud } = await admin.auth.getUser(jwt);
      const u = ud?.user;
      if (!u) return json({ ok: false });
      const prov = String((u.app_metadata as { provider?: string })?.provider || "");
      const sid = String(jwtPayload(jwt).session_id || "");
      const { count } = await admin.from("auth_events").select("id", { count: "exact", head: true }).eq("user_id", u.id).eq("detail", "s:" + sid);
      if (!count) await log(prov === "google" ? "google_login" : "login", String(u.email || "").toLowerCase(), ip, ua, u.id, "s:" + sid);
      return json({ ok: true });
    }

    // ---------- 🔐 קוד אימות דו-שלבי (Authenticator) — בדיקה כאן בשרת ----------
    // Supabase דוחה קוד נכון אם הבקשה "צור אתגר" והבקשה "בדוק קוד" הגיעו מכתובות IP שונות (mfa_ip_address_mismatch).
    // בחיבור דרך סינון (נטפרי וכד') או רשת סלולרית כל בקשה יכולה לצאת מכתובת אחרת — והקוד הנכון הוצג כ"לא נכון".
    // כאן שתי הבקשות יוצאות מאותו מקום, עם אותה כתובת, אחת אחרי השנייה.
    if (action === "mfa_verify") {
      const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const factor = String(b.factor_id || ""), code = String(b.code || "").replace(/\D/g, "");
      if (!jwt) return json({ error: "auth" }, 401);
      if (!/^[0-9a-f-]{36}$/i.test(factor) || code.length !== 6) return json({ error: "invalid" });
      const call = async (path: string, body: unknown) => {
        const r = await fetch(URL_ + "/auth/v1/" + path, {
          method: "POST",
          headers: { apikey: SERVICE, Authorization: "Bearer " + jwt, "Content-Type": "application/json", ...(rawIp ? { "Sb-Forwarded-For": rawIp, "X-Forwarded-For": rawIp } : {}) },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });
        const data = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, data: data as Record<string, unknown> };
      };
      const ch = await call("factors/" + factor + "/challenge", {});
      if (!ch.ok || !ch.data.id) {
        console.error("mfa challenge", ch.status, ch.data);
        return json({ error: ch.status === 429 ? "rate" : ch.status === 401 || ch.status === 403 ? "auth" : "generic" });
      }
      const v = await call("factors/" + factor + "/verify", { challenge_id: ch.data.id, code });
      if (v.ok && v.data.access_token) return json({ ok: true, session: session(v.data) });
      const ec = String(v.data.error_code || v.data.code || "");
      if (ec === "mfa_verification_failed" || ec === "mfa_challenge_expired") return json({ error: "invalid" });
      console.error("mfa verify", v.status, v.data);
      return json({ error: v.status === 429 ? "rate" : "generic", reason: ec.slice(0, 60) });
    }

    // ---------- 🙋 בקשת אישור כניסה (ממסך הכניסה, בלי חשבון) ----------
    if (action === "lr_create") {
      if (String(b.hp || "") !== "") return json({ error: "generic" });
      const name = String(b.name || "").replace(/[<>]/g, "").trim().slice(0, 40);
      const email = String(b.email || "").trim().toLowerCase().slice(0, 254);
      const note = String(b.note || "").replace(/[<>]/g, "").trim().slice(0, 300);
      if (!name) return json({ error: "name" });
      if (email && !validEmail(email) && !USERNAME.test(email)) return json({ error: "email" });
      const since = new Date(Date.now() - 3600_000).toISOString();
      if (!allowIp && ip) {
        const { count } = await admin.from("login_requests").select("id", { count: "exact", head: true }).eq("ip", ip).gt("created_at", since);
        if ((count || 0) >= 5) return json({ error: "rate" });
      }
      const { count: open } = await admin.from("login_requests").select("id", { count: "exact", head: true }).eq("status", "pending").gt("created_at", since);
      if ((open || 0) >= 300) return json({ error: "rate" });
      const secret = randHex(24), code = String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
      const { data: row, error: ie } = await admin.from("login_requests")
        .insert({ secret_hash: await sha256(secret), code, name, email, note, ip, ua }).select("id").single();
      if (ie || !row) { console.error("lr_create", ie); return json({ error: "generic" }); }
      await admin.rpc("login_request_push", { p_name: name, p_code: code }).then(() => {}, () => {});
      return json({ ok: true, id: (row as { id: string }).id, secret, code });
    }

    // ---------- 🙋 בדיקה אם המנהל אישר — ואם כן, מקבלים חיבור (פעם אחת בלבד) ----------
    if (action === "lr_poll" || action === "lr_cancel") {
      const id = String(b.id || ""), secret = String(b.secret || "");
      if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{48}$/.test(secret)) return json({ status: "gone" });
      const h = await sha256(secret);
      const { data: r } = await admin.from("login_requests").select("id,status,user_id,user_email,created_at,decided_at").eq("id", id).eq("secret_hash", h).maybeSingle();
      const row = r as { status: string; user_id: string | null; user_email: string; created_at: string; decided_at: string | null } | null;
      if (!row) return json({ status: "gone" });
      if (action === "lr_cancel") {
        if (row.status === "pending" || row.status === "approved") await admin.from("login_requests").update({ status: "cancelled" }).eq("id", id).in("status", ["pending", "approved"]);
        return json({ ok: true });
      }
      const age = (t: string | null) => t ? Date.now() - new Date(t).getTime() : Infinity;
      if (row.status === "pending") {
        if (age(row.created_at) > LR_PENDING_MIN * 60000) { await admin.from("login_requests").update({ status: "expired" }).eq("id", id).eq("status", "pending"); return json({ status: "expired" }); }
        return json({ status: "pending" });
      }
      if (row.status !== "approved") return json({ status: row.status });
      if (age(row.decided_at) > LR_APPROVED_MIN * 60000 || !row.user_id) { await admin.from("login_requests").update({ status: "expired" }).eq("id", id).eq("status", "approved"); return json({ status: "expired" }); }
      // תופסים את האישור לפני שיוצרים חיבור — כך שתי בדיקות במקביל לא מקבלות שני חיבורים
      const { data: claimed } = await admin.from("login_requests").update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", id).eq("status", "approved").select("id");
      if (!claimed || !(claimed as unknown[]).length) return json({ status: "pending" });
      const { data: gu } = await admin.auth.admin.getUserById(row.user_id);
      const em = String(gu?.user?.email || "").toLowerCase();
      const s = em ? await sessionFor(em, rawIp) : null;
      if (!s) {
        await admin.from("login_requests").update({ status: "approved", used_at: null }).eq("id", id);
        return json({ status: "pending", retry: true });
      }
      await log("login", em, ip, ua, row.user_id, "admin_approved");
      return json({ status: "approved", session: s, username: isNoMail(em) ? em.slice(0, -NOMAIL.length) : "", email: isNoMail(em) ? "" : em });
    }

    // ---------- 🙋 המנהל מאשר / דוחה (בבק אופיס) ----------
    if (action === "lr_approve" || action === "lr_reject") {
      const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const me = await staffRole(jwt);
      if (!me.role) return json({ error: "forbidden" }, 403);
      const id = String(b.id || "");
      const { data: r } = await admin.from("login_requests").select("id,status,name,created_at").eq("id", id).maybeSingle();
      const reqRow = r as { status: string; name: string; created_at: string } | null;
      if (!reqRow) return json({ error: "gone" });
      if (reqRow.status !== "pending") return json({ error: "status", status: reqRow.status });
      if (Date.now() - new Date(reqRow.created_at).getTime() > LR_PENDING_MIN * 60000) {
        await admin.from("login_requests").update({ status: "expired" }).eq("id", id).eq("status", "pending");
        return json({ error: "status", status: "expired" });
      }
      const now = new Date().toISOString();
      if (action === "lr_reject") {
        await admin.from("login_requests").update({ status: "rejected", decided_by: me.id, decided_at: now }).eq("id", id).eq("status", "pending");
        return json({ ok: true });
      }
      const t = await resolveTarget(me, String(b.account || ""), b.create === true, String(b.name || reqRow.name || ""), ip, ua);
      if ("error" in t) return json({ error: t.error, ...(t.nomail !== undefined ? { nomail: t.nomail } : {}) }, t.status || 200);
      const { uid, email, created } = t;
      const { data: upd } = await admin.from("login_requests")
        .update({ status: "approved", user_id: uid, user_email: email, decided_by: me.id, decided_at: now })
        .eq("id", id).eq("status", "pending").select("id");
      if (!upd || !(upd as unknown[]).length) return json({ error: "status" });
      // המנהל אישר — מוחקים את הכניסות הכושלות האחרונות של החשבון, כדי שגם בפעם הבאה ייכנס בלי חסימה
      await clearFails(email);
      return json({ ok: true, created, email });
    }

    // ---------- ✉️ אישור מראש לפי מייל (בבק אופיס): המשתמש נכנס עם המייל בלבד, פעם אחת, עד שהזמן נגמר ----------
    if (action === "lr_preapprove" || action === "lr_revoke") {
      const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const me = await staffRole(jwt);
      if (!me.role) return json({ error: "forbidden" }, 403);
      if (action === "lr_revoke") {
        await admin.from("login_requests").update({ status: "cancelled", decided_by: me.id, decided_at: new Date().toISOString() })
          .eq("id", String(b.id || "")).eq("kind", "pre").eq("status", "approved");
        return json({ ok: true });
      }
      const minutes = Math.min(1440, Math.max(5, Math.round(Number(b.minutes) || 30)));
      const t = await resolveTarget(me, String(b.account || ""), b.create === true, String(b.name || ""), ip, ua);
      if ("error" in t) return json({ error: t.error, ...(t.nomail !== undefined ? { nomail: t.nomail } : {}) }, t.status || 200);
      const now = Date.now();
      // אישור קודם שעוד פתוח לאותו חשבון — מתבטל, נשאר רק האחרון
      await admin.from("login_requests").update({ status: "cancelled" }).eq("kind", "pre").eq("status", "approved").eq("user_email", t.email);
      const { error: ie } = await admin.from("login_requests").insert({
        kind: "pre", secret_hash: "pre:" + randHex(16), code: "", name: String(b.name || "").replace(/[<>]/g, "").trim().slice(0, 40),
        email: t.email, user_id: t.uid, user_email: t.email, status: "approved", decided_by: me.id,
        decided_at: new Date(now).toISOString(), expires_at: new Date(now + minutes * 60000).toISOString(),
      });
      if (ie) { console.error("lr_preapprove", ie); return json({ error: "generic" }); }
      await clearFails(t.email);
      return json({ ok: true, created: t.created, email: t.email, minutes });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (err) {
    console.error(action, err);
    return json({ error: "generic" }, 500);
  }
}));
