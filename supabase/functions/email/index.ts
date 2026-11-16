// 📧 מייל שבועי למשתמשים — Supabase Edge Function בשם email (שליחה דרך Resend).
// • הגדרה חד־פעמית ב-Supabase ← Edge Functions ← Secrets:
//     RESEND_API_KEY          · מפתח מ-resend.com ← API Keys (חובה)
//     RESEND_WEBHOOK_SECRET   · מ-resend.com ← Webhooks (לא חובה — בשביל "מייל חזר" ו"דווח כספאם")
// • מסד הנתונים "דופק" על הפונקציה כל 5 דקות (email_poke). היא שולחת מהשעה שנקבעה עד 23:00, בשישי ובערב חג עד שעה וחצי
//   לפני השקיעה, ובמוצאי שבת/חג — 72 דקות אחרי השקיעה. לא בשבת ולא ביום טוב, ולכל היותר X מיילים ביום (ברירת מחדל 70 — אותו חשבון Resend שולח גם את מיילי ההרשמה ושחזור הקוד, ולכן משאירים להם מקום במכסה) — כך כל משתמש מקבל בתורו, לכל היותר פעם בשבוע.
// • בכל מייל: קישור להסרה (גם "בלחיצה אחת" של ג'ימייל), "אהבתי", ומעקב פתיחה ולחיצה.
// • "Verify JWT" כבוי (מסד הנתונים, Resend ודף ההסרה קוראים לה בלי משתמש) — היא בודקת בעצמה מי מנהל.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const enc = new TextEncoder();

const SB_URL = Deno.env.get("SUPABASE_URL") || "https://ygyfodxfbebnkwdcbjrp.supabase.co";
const FN_URL = SB_URL + "/functions/v1/email";
const SITE = "https://www.yamshopping.com";
const LOGO = SITE + "/logo.png";
const IMG_RE = /^https:\/\/ygyfodxfbebnkwdcbjrp\.supabase\.co\/storage\/v1\/object\/public\/mail\/[A-Za-z0-9._-]{1,120}$/;
const LINK_RE = /^https:\/\/(www\.)?yamshopping\.com(\/[^\s"'<>]*)?$/;
// חוק התקשורת (סעיף 30א): בדבר פרסומת — המילה "פרסומת" בתחילת הנושא, ושם, מען ודרכי יצירת קשר של השולח
export const POSTAL = "";
export const adSubject = (s: string) => (/^\s*פרסומת/.test(s) ? s : "פרסומת: " + s);
// הבעלים: רק חשבון שסומן yam_owner ב-app_metadata (משתמש לא יכול לשנות app_metadata בעצמו — רק SQL/השרת). שום מייל לא כתוב בקוד כבעלים
// deno-lint-ignore no-explicit-any
const isOwnerUser = (u: any) => !!u && !!u.email_confirmed_at && (u.app_metadata?.yam_owner === true || u.app_metadata?.yam_owner === "true");
const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));

export type Cfg = {
  auto: boolean; day_cap: number; month_cap: number; hour: number; minute: number; end_hour: number; draft_day: number; send_day: number;
  skip_empty: boolean; order: string; from_name: string; from_email: string; reply_to: string;
};
export const DEF: Cfg = {
  auto: false, day_cap: 70, month_cap: 2200, hour: 10, minute: 0, end_hour: 23, draft_day: 4, send_day: 0,
  skip_empty: true, order: "fair", from_name: "רשימת קניות", from_email: "news@yamshopping.com", reply_to: "info@yamshopping.com",
};
const num = (v: unknown, d: number, lo: number, hi: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
export function cfgOf(v: Record<string, unknown> | null | undefined): Cfg {
  v = v || {};
  const em = (s: unknown, d: string) => (typeof s === "string" && /^[^\s@<>"]{1,64}@(?:[a-z0-9-]+\.)*yamshopping\.com$/i.test(s.trim()) ? s.trim() : d);
  return {
    auto: v.auto === true,
    day_cap: num(v.day_cap, DEF.day_cap, 1, 5000),
    month_cap: num(v.month_cap, DEF.month_cap, 1, 1000000),
    hour: num(v.hour, DEF.hour, 8, 21),
    minute: Math.floor(num(v.minute, 0, 0, 55) / 5) * 5,
    end_hour: Math.max(num(v.hour, DEF.hour, 8, 21) + 1, num(v.end_hour, DEF.end_hour, 9, 23)),
    draft_day: num(v.draft_day, DEF.draft_day, 0, 4),
    send_day: num(v.send_day, DEF.send_day, 0, 6), // 5 = שישי, 6 = מוצאי שבת
    skip_empty: v.skip_empty !== false,
    order: ["fair", "inactive", "active", "new"].includes(String(v.order)) ? String(v.order) : "fair",
    from_name: typeof v.from_name === "string" && v.from_name.trim() ? v.from_name.trim().replace(/[<>"\r\n]/g, "").slice(0, 60) : DEF.from_name,
    from_email: em(v.from_email, DEF.from_email),
    reply_to: em(v.reply_to, DEF.reply_to),
  };
}

// ---------- שעון ישראל, שבת וימים טובים ----------
const IL_FMT = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "numeric", minute: "numeric", year: "numeric", month: "numeric", day: "numeric", hour12: false });
export function ilParts(d = new Date()) {
  const p = Object.fromEntries(IL_FMT
    .formatToParts(d).map((x) => [x.type, x.value]));
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), hour: Number(p.hour) % 24, min: Number(p.minute), ymd: `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}` };
}
const HEB_DAY = new Intl.DateTimeFormat("en-u-ca-hebrew", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long" });
function hebDay(d: Date) {
  const p = Object.fromEntries(HEB_DAY.formatToParts(d).map((x) => [x.type, x.value]));
  return p.month + " " + Number(p.day);
}
// ימים טובים בארץ ישראל + תשעה באב (ערב היום הזה = כל יום שלפניו)
const YT = new Set(["Tishri 1", "Tishri 2", "Tishri 10", "Tishri 15", "Tishri 22", "Nisan 15", "Nisan 21", "Sivan 6", "Av 9"]);
// שקיעה בירושלים (נוסחת NOAA, דיוק של דקה־שתיים) — כ-Date ב-UTC, לתאריך האזרחי ymd
export function sunset(ymd: string): Date {
  const noon = new Date(ymd + "T12:00:00Z");
  const n = Math.floor((noon.getTime() - Date.UTC(noon.getUTCFullYear(), 0, 1)) / 864e5) + 1;
  const g = (2 * Math.PI / 365) * (n - 1), r = Math.PI / 180, lat = 31.778 * r, lon = 35.235;
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * r) / (Math.cos(lat) * Math.cos(dec)) - Math.tan(lat) * Math.tan(dec)) / r;
  return new Date(Date.UTC(noon.getUTCFullYear(), noon.getUTCMonth(), noon.getUTCDate()) + (720 - 4 * (lon - ha) - eq) * 6e4);
}
const holy = (ymd: string) => { const d = new Date(ymd + "T12:00:00Z"); return d.getUTCDay() === 6 ? "shabbat" : YT.has(hebDay(d)) ? "yomtov" : ""; };
const nextYmd = (ymd: string) => new Date(new Date(ymd + "T12:00:00Z").getTime() + 864e5).toISOString().slice(0, 10);
export const AFTER_MIN = 72, BEFORE_MIN = 90, LAST_HOUR = 23;
// מתי מותר לשלוח: מהשעה שנקבעה עד 23:00. לא בשבת וביום טוב עד 72 דקות אחרי השקיעה (מוצאי שבת — מותר),
// ובערב שבת וערב חג — עד שעה וחצי לפני השקיעה
// manual = המנהל לחץ "להתחיל לשלוח" / "להריץ עכשיו" — אז לא מחכים לשעת ההתחלה (רק לא לפני 08:00)
export function sendWindow(cfg: Cfg, d = new Date(), manual = false): string {
  const t = ilParts(d), today = holy(t.ymd), tomorrow = holy(nextYmd(t.ymd));
  const set = sunset(t.ymd).getTime(), now = d.getTime();
  if (today && now < set + AFTER_MIN * 6e4) return today;
  if (tomorrow && now >= set - BEFORE_MIN * 6e4) return tomorrow === "shabbat" ? "erev" : "erevyt";
  if (t.hour >= Math.min(LAST_HOUR, cfg.end_hour || LAST_HOUR)) return "late";
  if (today) return ""; // מוצאי שבת/חג — מותר עד שעת הסיום
  if (manual ? t.hour < 8 : t.hour * 60 + t.min < cfg.hour * 60 + (cfg.minute || 0)) return "early";
  return "";
}

// מתי הריצה האוטומטית הבאה שבאמת תשלח: הריצות הן כל 5 דקות (pg_cron '*/5 * * * *')
export function nextRun(cfg: Cfg, from = new Date()): Date | null {
  const step = 5 * 6e4, t = new Date(Math.floor(from.getTime() / step) * step + step);
  // קודם בקפיצות של שעה עד שנפתח חלון, ואז אחורה בצעדים של 5 דקות לרגע הראשון
  for (let i = 0; i < 24 * 9; i++, t.setTime(t.getTime() + 36e5)) {
    if (sendWindow(cfg, t)) continue;
    let b = t.getTime();
    for (let k = 0; k < 11 && b - step > from.getTime() && !sendWindow(cfg, new Date(b - step)); k++) b -= step;
    return new Date(b);
  }
  return null;
}

// ---------- בניית המייל ----------
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
// שורה שמתחילה ב-"~" יוצאת באותיות קטנות (הערות, תנאים)
const para = (s: string) => s.split(/\r?\n/).map((l) => /^~\s*/.test(l) ? `<span style="font-size:13px;line-height:1.6;color:#5b6370">${esc(l.replace(/^~\s*/, ""))}</span>` : esc(l)).join("<br>");
const plain = (s: string) => s.replace(/^~\s*/gm, "");
export type Item = { title?: string; text?: string; image?: string; images?: string[]; link?: string };
export const MAX_IMGS = 6;
export type Campaign = { id?: string; subject: string; preheader?: string; intro?: string; items?: Item[]; outro?: string; cta?: string };
export function cleanItems(items: unknown): Item[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 8).map((x) => {
    const i = (x || {}) as Record<string, unknown>;
    return {
      title: String(i.title || "").slice(0, 120), text: String(i.text || "").slice(0, 1500),
      // כמה צילומי מסך לכל חידוש (images), ותמיכה במיילים ישנים עם תמונה אחת (image)
      images: [...new Set([i.image, ...(Array.isArray(i.images) ? i.images : [])].filter((u): u is string => typeof u === "string" && IMG_RE.test(u)))].slice(0, MAX_IMGS),
      link: typeof i.link === "string" && LINK_RE.test(i.link.trim()) ? i.link.trim() : "",
    };
  }).filter((i) => i.title || i.text || i.images.length);
}
export function linkFor(c: Campaign, n: number) {
  const items = cleanItems(c.items);
  const it = n > 0 ? items[n - 1] : null;
  const u = new URL(it?.link || SITE + "/");
  if (!u.searchParams.has("src")) u.searchParams.set("src", "mail");
  return u.toString();
}
// תאריך עברי באותיות (כ"א בחשוון תשפ"ז)
function gem(n: number) {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"], tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"], hund = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  let r = hund[Math.floor(n / 100)] + tens[Math.floor((n % 100) / 10)] + ones[n % 10];
  r = r.replace("יה", "טו").replace("יו", "טז");
  return r.length > 1 ? r.slice(0, -1) + '"' + r.slice(-1) : r + "'";
}
// פרשת השבוע בארץ ישראל, לשבת ymd (שבת בלבד; "" בשבת של חג או חול המועד)
const P1 = ["בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות", "ויצא", "וישלח", "וישב", "מקץ", "ויגש", "ויחי", "שמות", "וארא", "בא", "בשלח", "יתרו", "משפטים", "תרומה", "תצוה", "כי תשא", "ויקהל", "פקודי", "ויקרא", "צו", "שמיני", "תזריע", "מצורע", "אחרי מות", "קדושים", "אמור", "בהר", "בחוקותי"];
const P2 = ["במדבר", "נשא", "בהעלותך", "שלח", "קרח", "חוקת", "בלק", "פינחס", "מטות", "מסעי"];
const P3 = ["דברים", "ואתחנן", "עקב", "ראה", "שופטים", "כי תצא", "כי תבוא", "נצבים"];
const HEB_MD = new Intl.DateTimeFormat("en-u-ca-hebrew", { timeZone: "UTC", day: "numeric", month: "long" });
function hebMD(ymd: string) {
  const p = Object.fromEntries(HEB_MD.formatToParts(new Date(ymd + "T12:00:00Z")).map((x) => [x.type, x.value]));
  return { m: String(p.month), d: Number(p.day) };
}
const addDays = (ymd: string, n: number) => new Date(new Date(ymd + "T12:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
// מחלקים את הפרשות לשבתות שבין עוגנים קבועים, ומחברים פרשות כפולות לפי סדר קבוע עד שהמספר מתאים
function fit(names: string[], slots: number, pairs: string[]) {
  const out = names.slice();
  for (const a of pairs) {
    if (out.length <= slots) break;
    const i = out.indexOf(a);
    if (i >= 0 && i + 1 < out.length) out.splice(i, 2, a + "-" + out[i + 1]);
  }
  return out;
}
const parshaCache = new Map<string, string>();
export function parsha(ymd: string): string {
  if (parshaCache.has(ymd)) return parshaCache.get(ymd)!;
  let r = "";
  const h = hebMD(ymd);
  const rhDow = (d: string) => { let x = d; while (!(hebMD(x).m === "Tishri" && hebMD(x).d === 1)) x = addDays(x, -1); return new Date(x + "T12:00:00Z").getUTCDay(); };
  if (h.m === "Tishri" && h.d <= 22) {
    if (h.d >= 3 && h.d <= 9) r = [1, 2].includes(rhDow(ymd)) ? "וילך" : "האזינו";
    else if (h.d >= 11 && h.d <= 14) r = "האזינו";
  } else {
    // שמיני עצרת שלפני השבת הזאת, וראש השנה שאחריה
    let st = ymd; while (!(hebMD(st).m === "Tishri" && hebMD(st).d === 22)) st = addDays(st, -1);
    const sats: { ymd: string; m: string; d: number }[] = [];
    let x = addDays(st, (6 - new Date(st + "T12:00:00Z").getUTCDay() + 7) % 7 || 7);
    for (let out = false; ; x = addDays(x, 7)) { const k = hebMD(x); if (k.m !== "Tishri") out = true; else if (out) break; sats.push({ ymd: x, ...k }); }
    let rhd = addDays(sats[sats.length - 1].ymd, 1); while (!(hebMD(rhd).m === "Tishri" && hebMD(rhd).d === 1)) rhd = addDays(rhd, 1);
    const nextRh = new Date(rhd + "T12:00:00Z").getUTCDay();
    const holiday = (k: { m: string; d: number }) => (k.m === "Nisan" && k.d >= 15 && k.d <= 21) || (k.m === "Sivan" && k.d === 6);
    const ok = sats.filter((k) => !holiday(k));
    const iDev = ok.findLastIndex((k) => k.m === "Tamuz" || (k.m === "Av" && k.d <= 9));
    // שנה פשוטה: ויקהל-פקודי נפרדות רק כשצריך פחות חיבורים ופסח לא חל בשבת; כשפסח בשבת — בהר ובחוקותי נפרדות
    const leap = sats.some((k) => k.m === "Adar I"), pesachShabbat = sats.some((k) => k.m === "Nisan" && k.d === 15);
    const order = leap || pesachShabbat ? ["מטות", "ויקהל", "תזריע", "אחרי מות", "בהר", "חוקת"] : ["מטות", "תזריע", "אחרי מות", "בהר", "ויקהל", "חוקת"];
    const names = [...fit([...P1, ...P2], iDev, order), ...P3];
    if (![1, 2].includes(nextRh)) names[names.length - 1] = "נצבים-וילך";
    const i = ok.findIndex((k) => k.ymd === ymd);
    r = i >= 0 && names.length === ok.length ? names[i] : "";
  }
  parshaCache.set(ymd, r);
  return r;
}
export function dateLine(d = new Date()) {
  const t = ilParts(d);
  // במוצאי שבת (אחרי השקיעה) — כבר היום העברי הבא
  const night = t.day === 6 && d.getTime() >= sunset(t.ymd).getTime();
  const hd = night ? new Date(d.getTime() + 864e5) : d;
  const p = Object.fromEntries(new Intl.DateTimeFormat("he-u-ca-hebrew", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long", year: "numeric" }).formatToParts(hd).map((x) => [x.type, x.value]));
  const civ = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long", year: "numeric" }).format(d);
  const heb = `${gem(Number(p.day))} ב${p.month} ${gem(Number(p.year) % 1000)}`;
  let day = String(p.weekday);
  if (night) { const pr = parsha(t.ymd); day = "מוצאי שבת קודש" + (pr ? " פרשת " + pr : ""); }
  else if (t.day === 5) { const pr = parsha(addDays(t.ymd, 1)); day = "ערב שבת קודש" + (pr ? " פרשת " + pr : ""); }
  return `${day}, ${heb} · ${civ}`;
}
const FONT = "'Segoe UI',Arial,Helvetica,sans-serif";
export function render(c: Campaign, token: string, name: string, when = new Date()) {
  const items = cleanItems(c.items);
  const t = encodeURIComponent(token);
  const click = (n: number) => `${FN_URL}?c=${t}&n=${n}`;
  const page = (a: string) => `${SITE}/mail.html?t=${t}&a=${a}`;
  const hi = name ? `שלום ${esc(name.slice(0, 40))},` : "שלום רב,";
  const txt = "font-family:" + FONT + ";font-size:15px;line-height:1.75;color:#1d2939";
  const blocks = items.map((it, i) => {
    const ims = it.images || [];
    const one = (u: string, w: number) => `<a href="${click(i + 1)}" style="text-decoration:none"><img src="${esc(u)}" alt="${esc(it.title || "")}" width="${w}" style="display:block;width:100%;max-width:${w}px;height:auto;border:1px solid #e5e7eb;border-radius:6px"></a>`;
    // תמונה אחת — ברוחב מלא; כמה תמונות — שתיים בשורה
    let img = "";
    if (ims.length === 1) img = `<tr><td style="padding:14px 0 0">${one(ims[0], 536)}</td></tr>`;
    else if (ims.length > 1) {
      const rows: string[] = [];
      for (let k = 0; k < ims.length; k += 2) {
        rows.push(`<tr><td width="50%" valign="top" style="width:50%;padding:0 0 10px 5px">${one(ims[k], 263)}</td><td width="50%" valign="top" style="width:50%;padding:0 5px 10px 0">${ims[k + 1] ? one(ims[k + 1], 263) : "&nbsp;"}</td></tr>`);
      }
      img = `<tr><td style="padding:14px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl">${rows.join("")}</table></td></tr>`;
    }
    return `<tr><td style="padding:26px 0 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl">
${it.title ? `<tr><td style="font-family:${FONT};font-size:17px;line-height:1.5;font-weight:700;color:#1e3a5f;text-align:right;padding:0 0 6px">${esc(it.title)}</td></tr>` : ""}
${it.text ? `<tr><td style="${txt};text-align:right">${para(it.text)}</td></tr>` : ""}
${img}
</table></td></tr>${i < items.length - 1 ? `<tr><td style="padding:26px 0 0;border-bottom:1px solid #e8e3d8;font-size:0;line-height:0">&nbsp;</td></tr>` : ""}`;
  }).join("");
  const html = `<!doctype html>
<html lang="he" dir="rtl" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(c.subject)}</title>
<style>
body{margin:0!important;padding:0!important;width:100%!important;background:#f6f3ec}
a{color:#1e3a5f}
@media only screen and (max-width:620px){.wrap{width:100%!important}.px{padding-left:22px!important;padding-right:22px!important}}
</style>
</head>
<body style="margin:0;padding:0;background:#f6f3ec;direction:rtl">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${esc(c.preheader || "")}${"&#847;&zwnj;&nbsp;".repeat(60)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f3ec" dir="rtl"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:600px;max-width:600px">
<tr><td class="px" style="background:#ffffff;border-top:4px solid #1e3a5f;padding:22px 32px 18px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl"><tr>
<td style="text-align:right;vertical-align:middle"><a href="${click(0)}" style="text-decoration:none"><img src="${LOGO}" width="44" height="44" alt="רשימת קניות" style="display:inline-block;vertical-align:middle;border:0;border-radius:50%"><span style="font-family:${FONT};font-size:19px;font-weight:700;color:#1e3a5f;vertical-align:middle;padding-right:10px">רשימת קניות</span></a></td>
<td style="text-align:left;vertical-align:middle;font-family:${FONT};font-size:12px;color:#6b7280;white-space:nowrap">עדכון שבועי</td>
</tr></table></td></tr>
<tr><td class="px" style="background:#ffffff;padding:0 32px"><div style="border-top:1px solid #e8e3d8;font-size:0;line-height:0">&nbsp;</div></td></tr>
<tr><td class="px" style="background:#ffffff;padding:26px 32px 8px;text-align:right">
<div style="font-family:${FONT};font-size:12.5px;color:#6b7280;padding:0 0 14px">${esc(dateLine(when))}</div>
<div style="font-family:${FONT};font-size:22px;line-height:1.4;font-weight:700;color:#111827;padding:0 0 16px">${esc(c.subject || "עדכונים מרשימת קניות")}</div>
<div style="${txt};padding:0 0 4px">${hi}</div>
${c.intro ? `<div style="${txt}">${para(c.intro)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl">${blocks}</table>
${c.outro ? `<div style="${txt};padding:28px 0 0">${para(c.outro)}</div>` : ""}
</td></tr>
<tr><td class="px" align="right" style="background:#ffffff;padding:24px 32px 6px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl"><tr><td style="background:#1e3a5f;border-radius:4px;mso-padding-alt:12px 28px"><a href="${click(0)}" style="display:inline-block;padding:12px 28px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${esc(c.cta || "לכניסה לאתר")}</a></td></tr></table>
</td></tr>
<tr><td class="px" style="background:#ffffff;padding:26px 32px 28px;text-align:right">
<div style="${txt}">בברכה,<br><strong style="color:#111827">צוות רשימת קניות</strong><br><a href="${click(0)}" style="color:#1e3a5f;text-decoration:none">www.yamshopping.com</a></div>
</td></tr>
<tr><td class="px" style="background:#f3f6fa;border-top:1px solid #e8e3d8;padding:18px 32px;text-align:right">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl"><tr>
<td style="font-family:${FONT};font-size:13.5px;line-height:1.7;color:#1d2939;text-align:right">האם העדכון היה מועיל עבורך? <a href="${page("like")}" style="color:#1e3a5f;font-weight:700;text-decoration:underline">כן, תודה</a></td>
</tr><tr>
<td style="font-family:${FONT};font-size:13.5px;line-height:1.7;color:#1d2939;text-align:right;padding-top:6px">שאלות, הערות או הצעות? אפשר להשיב ישירות למייל זה, או לכתוב אלינו לכתובת <a href="mailto:info@yamshopping.com" style="color:#1e3a5f;text-decoration:underline">info@yamshopping.com</a></td>
</tr></table></td></tr>
<tr><td class="px" style="padding:20px 32px 6px;text-align:center;font-family:${FONT};font-size:12px;line-height:1.8;color:#8a9399">
הודעה זו נשלחה אליך מפני שנרשמת לאתר רשימת קניות. אנו שולחים עדכון אחד בשבוע לכל היותר.<br>
<a href="${page("unsub")}" style="color:#6b7280;text-decoration:underline">הסרה מרשימת התפוצה</a> &nbsp;·&nbsp; <a href="${SITE}/privacy.html" style="color:#6b7280;text-decoration:underline">מדיניות פרטיות</a><br>
${POSTAL ? `רשימת קניות · ${esc(POSTAL)} · info@yamshopping.com<br>\n` : ""}© ${when.getFullYear()} YAMSHOPPING · כל הזכויות שמורות
</td></tr>
</table></td></tr></table>
<img src="${FN_URL}?o=${t}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0">
</body></html>`;
  const text = [dateLine(when), "", name ? `שלום ${name.slice(0, 40)},` : "שלום רב,", c.intro || "", ...items.map((i) => [i.title, plain(i.text || "")].filter(Boolean).join("\n")), plain(c.outro || ""),
    `${c.cta || "לכניסה לאתר"}: ${SITE}/?src=mail`, "בברכה,\nצוות רשימת קניות\nwww.yamshopping.com",
    "שאלות והערות: אפשר להשיב למייל זה או לכתוב ל-info@yamshopping.com", POSTAL ? `רשימת קניות · ${POSTAL}` : undefined, `הסרה מרשימת התפוצה: ${page("unsub")}`].filter((x) => x !== undefined).join("\n\n").replace(/\n{3,}/g, "\n\n");
  return { html, text };
}

// ---------- Resend ----------
// deno-lint-ignore no-explicit-any
type Admin = any;
async function resendBatch(key: string, mails: Record<string, unknown>[], idem: string) {
  const r = await fetch("https://api.resend.com/emails/batch", {
    method: "POST", signal: AbortSignal.timeout(60000),
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "Idempotency-Key": idem },
    body: JSON.stringify(mails),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`resend ${r.status}: ${String(d?.message || d?.name || "").slice(0, 200)}`);
  return (Array.isArray(d?.data) ? d.data : []) as { id: string }[];
}
function mailFor(cfg: Cfg, c: Campaign, s: { token: string; email: string; name: string }, test = false) {
  const { html, text } = render(c, s.token, s.name);
  return {
    from: `${cfg.from_name} <${cfg.from_email}>`, to: [s.email], reply_to: cfg.reply_to,
    subject: (test ? "[ניסיון] " : "") + adSubject(c.subject || "מה חדש ברשימת קניות"), html, text,
    headers: {
      "List-Unsubscribe": `<${FN_URL}?lu=${encodeURIComponent(s.token)}>, <mailto:${cfg.reply_to}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

// ---------- 🤖 גרסה חדשה לאפליקציה לאנדרואיד — מייל רק למי שלחץ "לעקוב אחרי עדכונים" ----------
export type AppVer = { version: string; date?: string; notes: string[] };
export function appVerOf(v: unknown): AppVer | null {
  const o = (v || {}) as Record<string, unknown>;
  const version = String(o.version || "");
  if (!/^\d{1,3}(\.\d{1,3}){0,3}$/.test(version)) return null;
  const notes = (Array.isArray(o.notes) ? o.notes : []).map((x) => String(x || "").trim().slice(0, 300)).filter(Boolean).slice(0, 8);
  return { version, date: typeof o.date === "string" ? o.date.slice(0, 10) : "", notes };
}
export function appCampaign(a: AppVer): Campaign {
  return {
    subject: `עדכון לאפליקציה לאנדרואיד: גרסה ${a.version}`,
    preheader: a.notes.length ? a.notes.join(" · ").slice(0, 190) : "גרסה חדשה של האפליקציה מוכנה להורדה",
    intro: "ביקשת לקבל עדכון כשיוצאת גרסה חדשה של האפליקציה לאנדרואיד. הגרסה החדשה מוכנה להורדה באתר.",
    items: [{ title: `מה חדש בגרסה ${a.version}`, text: a.notes.map((n) => "• " + n).join("\n"), link: SITE + "/?apk" }],
    outro: "מורידים את הקובץ ומתקינים מעל הגרסה הקיימת. לא צריך למחוק אותה, והרשימות והחשבון נשארים.",
    cta: "להורדת הגרסה החדשה",
  };
}
function appMailFor(cfg: Cfg, c: Campaign, s: { token: string; email: string; name: string; unf: string }) {
  let { html, text } = render(c, s.token, s.name);
  const unf = `${SITE}/?appunf=${encodeURIComponent(s.unf)}`;
  // הכפתור הראשי — ישר לחלון ההורדה (n=1), והסרה = הפסקת המעקב (לא המייל השבועי)
  html = html.replaceAll(`${FN_URL}?c=${encodeURIComponent(s.token)}&n=0`, `${FN_URL}?c=${encodeURIComponent(s.token)}&n=1`)
    .replace(">עדכון שבועי<", ">עדכון לאפליקציה<")
    .replace(/האם העדכון היה מועיל עבורך\? <a [^>]*>כן, תודה<\/a>/, "תודה שבחרת באפליקציה של רשימת קניות!")
    .replace(/הודעה זו נשלחה אליך מפני שנרשמת לאתר רשימת קניות\. אנו שולחים עדכון אחד בשבוע לכל היותר\.<br>\n<a href="[^"]*"([^>]*)>הסרה מרשימת התפוצה<\/a>/,
      `הודעה זו נשלחה אליך מפני שביקשת לקבל עדכון על גרסאות חדשות של האפליקציה לאנדרואיד.<br>\n<a href="${unf}"$1>הפסקת המעקב אחרי עדכוני האפליקציה</a>`);
  text = text.replace(/הסרה מרשימת התפוצה: .*$/, `הפסקת המעקב אחרי עדכוני האפליקציה: ${unf}`);
  return {
    from: `${cfg.from_name} <${cfg.from_email}>`, to: [s.email], reply_to: cfg.reply_to, subject: c.subject, html, text,
    headers: { "List-Unsubscribe": `<${FN_URL}?au=${encodeURIComponent(s.unf)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
async function appRelease(admin: Admin, cfg: Cfg, key: string, budget: number, notes: string[]) {
  let a: AppVer | null = null;
  try {
    const r = await fetch(SITE + "/download/app-version.json?t=" + Date.now(), { signal: AbortSignal.timeout(10000), headers: { "Cache-Control": "no-cache" } });
    if (r.ok) a = appVerOf(await r.json());
  } catch { /* האתר לא ענה — ננסה בשעה הבאה */ }
  if (!a) { notes.push("app: no version"); return 0; }
  const { data: first } = await admin.rpc("app_follow_pick", { p_ver: a.version, p_limit: 1 });
  if (!first?.length) return 0;
  if (budget <= 0) { notes.push("app: cap reached"); return 0; }
  // שורת מייל אחת לכל גרסה (כדי שבבק אופיס יופיעו פתיחות ולחיצות, והשליחות נספרות במכסה)
  const tag = "app:" + a.version, c = appCampaign(a);
  let { data: camp } = await admin.from("email_campaigns").select("id").eq("note", tag).maybeSingle();
  if (!camp) {
    const now = new Date().toISOString();
    ({ data: camp } = await admin.from("email_campaigns").insert({ ...c, status: "done", note: tag, auto: false, created_by: null, started_at: now, finished_at: now }).select("id").single());
  }
  if (!camp) return 0;
  const cid = camp.id as string;
  let sent = 0, rounds = 0;
  while (budget > 0 && rounds++ < 50) {
    const n = Math.min(budget, 100);
    const { data: who } = await admin.rpc("app_follow_pick", { p_ver: a.version, p_limit: n });
    if (!who?.length) break;
    const list = who as { user_id: string; email: string; name: string; token: string }[];
    // מי שכבר קיבל מייל על הגרסה הזאת (למשל הרצה קודמת שנעצרה באמצע) — רק מסמנים
    const { data: had } = await admin.from("email_sends").select("user_id").eq("campaign_id", cid).eq("test", false).in("user_id", list.map((w) => w.user_id));
    const done = new Set((had || []).map((r: { user_id: string }) => r.user_id));
    if (done.size) await admin.from("app_follows").update({ notified_ver: a.version }).in("user_id", [...done]);
    const fresh = list.filter((w) => !done.has(w.user_id));
    if (!fresh.length) continue;
    const { data: ins, error } = await admin.from("email_sends").insert(fresh.map((w) => ({ campaign_id: cid, user_id: w.user_id, email: w.email, status: "queued" }))).select("id,token,user_id,email");
    if (error) { notes.push("app insert: " + error.message); break; }
    if (!ins?.length) break;
    const by = new Map(list.map((w) => [w.user_id, w]));
    try {
      const res = await resendBatch(key, ins.map((r: { token: string; email: string; user_id: string }) => appMailFor(cfg, c, { token: r.token, email: r.email, name: by.get(r.user_id)?.name || "", unf: by.get(r.user_id)?.token || "" })), "app-" + ins[0].token);
      for (let i = 0; i < ins.length; i++) {
        await admin.from("email_sends").update({ status: res[i]?.id ? "sent" : "failed", provider_id: res[i]?.id || "", sent_at: new Date().toISOString(), error: res[i]?.id ? "" : "no id" }).eq("id", ins[i].id);
        if (res[i]?.id) sent++;
      }
      await admin.from("app_follows").update({ notified_ver: a.version, mailed_at: new Date().toISOString() }).in("user_id", ins.map((r: { user_id: string }) => r.user_id));
    } catch (e) {
      await admin.from("email_sends").delete().in("id", ins.map((r: { id: number }) => r.id));
      notes.push("app: " + String((e as Error).message).slice(0, 120));
      break;
    }
    budget -= ins.length;
    if (list.length < n) break;
  }
  if (sent) notes.push(`app ${a.version}: ${sent} sent`);
  return sent;
}
async function appUnfollow(admin: Admin, tok: string) {
  if (!/^[0-9a-f]{20,64}$/.test(tok)) return false;
  const { data } = await admin.from("app_follows").delete().eq("token", tok).select("user_id");
  return !!data?.length;
}

// טיוטה מ"מה חדש" של השבוע האחרון
export function draftFrom(ups: { title: string; body: string }[]): Campaign {
  const items: Item[] = ups.slice(0, 6).map((u) => ({ title: u.title, text: u.body }));
  return {
    subject: ups.length ? "מה חדש ברשימת קניות: עדכוני השבוע" : "תזכורת שבועית מרשימת קניות",
    preheader: ups.length ? ups.map((u) => u.title).join(" · ").slice(0, 190) : "הרשימה המשפחתית, השוואת המחירים והעוזרת יאמי זמינים עבורך בכל עת",
    intro: ups.length ? "ריכזנו עבורך את העדכונים והשיפורים שנוספו השבוע לאתר ולאפליקציה." : "רצינו להזכיר שהרשימה המשפחתית, השוואת המחירים בין החנויות והעוזרת יאמי זמינים עבורך בכל עת, באתר ובאפליקציה.",
    items, outro: "תודה שבחרת ברשימת קניות. נשמח לשמוע ממך: אפשר להשיב ישירות למייל זה.", cta: "לכניסה לאתר",
  };
}
function nextSendAt(cfg: Cfg, from = new Date()) {
  // היום הבא (או היום, אם עוד לא הגענו לשעה) שבו יום השבוע = send_day, בשעה hour בשעון ישראל
  for (let i = 0; i < 8; i++) {
    const d = new Date(from.getTime() + i * 864e5);
    const p = ilParts(d);
    if (p.day !== cfg.send_day) continue;
    const off = ilOffset(d);
    // מוצאי שבת: 75 דקות אחרי השקיעה (הריצה של כל שעה תתחיל לשלוח מיד אחר כך)
    const at = p.day === 6 ? new Date(sunset(p.ymd).getTime() + (AFTER_MIN + 3) * 6e4)
      : new Date(Date.parse(`${p.ymd}T${String(cfg.hour).padStart(2, "0")}:${String(cfg.minute || 0).padStart(2, "0")}:00Z`) - off * 60000);
    if (at.getTime() > from.getTime()) return at;
  }
  return new Date(from.getTime() + 3 * 864e5);
}
function ilOffset(d: Date) { // דקות: שעון ישראל פחות UTC
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "longOffset" }).formatToParts(d).map((x) => [x.type, x.value]));
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(p.timeZoneName || "");
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 120;
}

// ---------- אימות ----------
function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0;
}
async function mfaOk(admin: Admin, user: { factors?: { status?: string }[] } | null | undefined, token: string) {
  if (!(user?.factors || []).some((f) => f.status === "verified")) return true;
  try { if (JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).aal === "aal2") return true; } catch { /* */ }
  const { data } = await admin.from("mfa_settings").select("off").eq("id", 1).maybeSingle();
  return data?.off === true;
}
async function adminUser(admin: Admin, token: string) {
  if (!token) return null;
  const { data: u } = await admin.auth.getUser(token);
  const usr = u?.user;
  if (!usr) return null;
  let ok = isOwnerUser(usr);
  if (!ok) { const { data: st } = await admin.from("staff").select("role").eq("user_id", usr.id).maybeSingle(); ok = st?.role === "admin"; }
  if (ok && !(await mfaOk(admin, usr, token))) ok = false;
  return ok ? usr : null;
}
// חתימת Webhook של Resend (Svix)
export async function svixOk(secret: string, id: string, ts: string, sig: string, body: string) {
  if (!secret || !id || !ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 600) return false;
  const raw = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${id}.${ts}.${body}`)));
  const want = btoa(String.fromCharCode(...mac));
  return sig.split(" ").some((s) => { const [v, b] = s.split(","); return v === "v1" && sameSecret(b || "", want); });
}

// ---------- פעולות לפי קישור מהמייל ----------
async function bySend(admin: Admin, token: string) {
  if (!/^[0-9a-f]{20,64}$/.test(token)) return null;
  const { data } = await admin.from("email_sends").select("id,campaign_id,user_id,email,test,opened_at,clicked_at,liked_at,unsub_at,opens,clicks").eq("token", token).maybeSingle();
  return data;
}
async function unsubscribe(admin: Admin, s: { id: number; user_id: string | null; test: boolean; unsub_at: string | null }, how: string, reason = "") {
  if (s.test || !s.user_id) return;
  const now = new Date().toISOString();
  if (!s.unsub_at) await admin.from("email_sends").update({ unsub_at: now }).eq("id", s.id);
  await admin.from("email_subs").upsert({ user_id: s.user_id, weekly: false, unsub_at: now, unsub_how: how, unsub_reason: reason.slice(0, 300), updated_at: now }, { onConflict: "user_id" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const admin = createClient(SB_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const url = new URL(req.url);
  try {
    // 1) פתיחה (תמונה שקופה)
    if (req.method === "GET" && url.searchParams.has("o")) {
      const s = await bySend(admin, url.searchParams.get("o") || "");
      if (s && !s.test) await admin.from("email_sends").update({ opened_at: s.opened_at || new Date().toISOString(), opens: (s.opens || 0) + 1 }).eq("id", s.id);
      return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } });
    }
    // 2) לחיצה על קישור במייל — רק לאתר שלנו (לא מעבירים לכתובת שרירותית)
    if (req.method === "GET" && url.searchParams.has("c")) {
      const s = await bySend(admin, url.searchParams.get("c") || "");
      let to = SITE + "/?src=mail";
      if (s) {
        const { data: c } = await admin.from("email_campaigns").select("items").eq("id", s.campaign_id).maybeSingle();
        to = linkFor({ subject: "", items: c?.items || [] }, num(url.searchParams.get("n"), 0, 0, 8));
        if (!s.test) await admin.from("email_sends").update({ clicked_at: s.clicked_at || new Date().toISOString(), clicks: (s.clicks || 0) + 1, opened_at: s.opened_at || new Date().toISOString() }).eq("id", s.id);
      }
      return new Response(null, { status: 302, headers: { Location: to, "Cache-Control": "no-store" } });
    }
    // 3) הסרה בלחיצה אחת מתוך תוכנת המייל (List-Unsubscribe-Post)
    if (req.method === "POST" && url.searchParams.has("lu")) {
      const s = await bySend(admin, url.searchParams.get("lu") || "");
      if (s) await unsubscribe(admin, s, "one-click");
      return new Response("ok", { headers: { "Content-Type": "text/plain" } });
    }
    // 3ב) הפסקת מעקב אחרי עדכוני האפליקציה בלחיצה אחת מתוך תוכנת המייל
    if (req.method === "POST" && url.searchParams.has("au")) {
      await appUnfollow(admin, url.searchParams.get("au") || "");
      return new Response("ok", { headers: { "Content-Type": "text/plain" } });
    }
    // 4) Webhook מ-Resend: נמסר / חזר / דווח כספאם / נפתח / לחצו
    if (req.method === "POST" && url.searchParams.get("hook") === "resend") {
      const body = await req.text();
      const secret = Deno.env.get("RESEND_WEBHOOK_SECRET") || "";
      if (!(await svixOk(secret, req.headers.get("svix-id") || "", req.headers.get("svix-timestamp") || "", req.headers.get("svix-signature") || "", body))) return json({ error: "bad signature" }, 401);
      const ev = JSON.parse(body || "{}");
      const pid = String(ev?.data?.email_id || "");
      if (!pid) return json({ ok: true });
      const { data: s } = await admin.from("email_sends").select("id,user_id,test,opened_at,clicked_at,delivered_at").eq("provider_id", pid).maybeSingle();
      if (!s) return json({ ok: true });
      const now = new Date().toISOString();
      const type = String(ev.type || "");
      if (type === "email.delivered") await admin.from("email_sends").update({ delivered_at: s.delivered_at || now }).eq("id", s.id);
      else if (type === "email.opened") await admin.from("email_sends").update({ opened_at: s.opened_at || now }).eq("id", s.id);
      else if (type === "email.clicked") await admin.from("email_sends").update({ clicked_at: s.clicked_at || now }).eq("id", s.id);
      else if (type === "email.bounced" && String(ev?.data?.bounce?.type || "Permanent") !== "Transient") {
        await admin.from("email_sends").update({ bounced_at: now, status: "bounced" }).eq("id", s.id);
        if (s.user_id && !s.test) await admin.from("email_subs").upsert({ user_id: s.user_id, status: "bounced", updated_at: now }, { onConflict: "user_id" });
      } else if (type === "email.complained") {
        await admin.from("email_sends").update({ complained_at: now, status: "complained" }).eq("id", s.id);
        if (s.user_id && !s.test) await admin.from("email_subs").upsert({ user_id: s.user_id, status: "complained", weekly: false, unsub_at: now, unsub_how: "spam", updated_at: now }, { onConflict: "user_id" });
      }
      return json({ ok: true });
    }
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const b = await req.json().catch(() => ({}));

    // 5א) מהאתר: yamshopping.com/?appunf=... (הקישור במייל על גרסה חדשה) — הפסקת המעקב
    if (typeof b.appunf === "string") return json({ ok: await appUnfollow(admin, b.appunf) });

    // 5) מהדף yamshopping.com/mail.html: הסרה / חזרה / אהבתי
    if (typeof b.t === "string" && typeof b.act === "string") {
      if (b.t === "preview") return json({ ok: true, preview: true });
      const s = await bySend(admin, b.t);
      if (!s) return json({ error: "not_found" }, 404);
      const masked = String(s.email).replace(/^(.)(.*)(.@.*)$/, (_m, a, mid, z) => a + "*".repeat(Math.min(6, mid.length)) + z);
      const { data: sub } = s.user_id ? await admin.from("email_subs").select("weekly,status").eq("user_id", s.user_id).maybeSingle() : { data: null };
      const on = !sub || (sub.weekly && sub.status === "ok");
      if (b.act === "info") return json({ ok: true, email: masked, weekly: on, test: s.test });
      if (b.act === "unsub") { await unsubscribe(admin, s, "link", String(b.reason || "")); return json({ ok: true, email: masked, weekly: false, test: s.test }); }
      if (b.act === "resub") {
        if (!s.test && s.user_id) {
          const now = new Date().toISOString();
          await admin.from("email_subs").upsert({ user_id: s.user_id, weekly: true, status: "ok", unsub_at: null, unsub_how: "", unsub_reason: "", updated_at: now, consent_at: now, consent_how: "mail" }, { onConflict: "user_id" });
          await admin.from("email_sends").update({ unsub_at: null }).eq("id", s.id);
        }
        return json({ ok: true, email: masked, weekly: true, test: s.test });
      }
      if (b.act === "like") {
        if (!s.test && !s.liked_at) await admin.from("email_sends").update({ liked_at: new Date().toISOString(), opened_at: s.opened_at || new Date().toISOString() }).eq("id", s.id);
        return json({ ok: true, liked: true, test: s.test });
      }
      return json({ error: "act" }, 400);
    }

    const { data: cfgRow } = await admin.from("site_config").select("value").eq("key", "email").maybeSingle();
    const cfg = cfgOf(cfgRow?.value);
    const KEY = Deno.env.get("RESEND_API_KEY") || "";
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");

    // 6) הריצה המתוזמנת (מסד הנתונים, עם המפתח הסודי) — או מנהל שלוחץ "להריץ עכשיו"
    let isCron = false;
    const cronSent = (req.headers.get("x-cron-key") || "").trim();
    if (cronSent) {
      const { data: sec } = await admin.from("auth_secret").select("cron_key").eq("id", 1).maybeSingle();
      isCron = sameSecret(cronSent, String(sec?.cron_key || ""));
    }
    const me = isCron ? null : await adminUser(admin, token);
    if (!isCron && !me) return json({ error: "unauthorized" }, 401);

    // --- פעולות מנהל ---
    if (me && b.status) {
      return json({ ok: true, key: !!KEY, webhook: !!Deno.env.get("RESEND_WEBHOOK_SECRET"), window: sendWindow(cfg), next_run: nextRun(cfg)?.toISOString() || null,
        next_run_tomorrow: (() => { const n = new Date(); const y = nextYmd(ilParts(n).ymd); const mid = new Date(Date.parse(y + "T00:00:00Z") - ilOffset(new Date(Date.parse(y + "T12:00:00Z"))) * 6e4); return nextRun(cfg, mid)?.toISOString() || null; })(), cfg, counts: (await admin.rpc("email_counts")).data || {} });
    }
    if (me && b.preview) {
      const c = typeof b.preview === "object" ? b.preview as Campaign : (await admin.from("email_campaigns").select("*").eq("id", String(b.preview)).maybeSingle()).data;
      if (!c) return json({ error: "not_found" }, 404);
      const { data: pr } = await admin.from("profiles").select("name").eq("id", me.id).maybeSingle();
      const r = render(c, "preview", String(pr?.name || ""));
      return json({ ok: true, subject: c.subject, html: r.html.replaceAll(`${FN_URL}?o=preview`, "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7") });
    }
    if (me && b.draft) {
      const { data: ups } = await admin.from("site_updates").select("title,body,created_at").eq("active", true).gt("created_at", new Date(Date.now() - 8 * 864e5).toISOString()).order("created_at", { ascending: false }).limit(6);
      return json({ ok: true, draft: draftFrom(ups || []) });
    }
    if (me && b.test) {
      if (!KEY) return json({ error: "no_key" }, 400);
      const { data: c } = await admin.from("email_campaigns").select("*").eq("id", String(b.test)).maybeSingle();
      if (!c) return json({ error: "not_found" }, 404);
      const { count } = await admin.from("email_sends").select("id", { count: "exact", head: true }).eq("test", true).gt("sent_at", new Date(Date.now() - 3600e3).toISOString());
      if ((count || 0) >= 10) return json({ error: "rate" }, 429);
      const to = String(b.to || me.email || "").trim().toLowerCase();
      if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(to)) return json({ error: "bad_email" }, 400);
      const { data: pr } = await admin.from("profiles").select("name").eq("id", me.id).maybeSingle();
      const { data: row, error } = await admin.from("email_sends").insert({ campaign_id: c.id, user_id: me.id, email: to, test: true, status: "queued" }).select("id,token").single();
      if (error) return json({ error: error.message }, 500);
      try {
        const [r] = await resendBatch(KEY, [mailFor(cfg, c, { token: row.token, email: to, name: String(pr?.name || "") }, true)], "test-" + row.token);
        await admin.from("email_sends").update({ status: "sent", provider_id: r?.id || "" }).eq("id", row.id);
        return json({ ok: true, to });
      } catch (e) {
        await admin.from("email_sends").update({ status: "failed", error: String((e as Error).message).slice(0, 300) }).eq("id", row.id);
        return json({ error: String((e as Error).message) }, 502);
      }
    }

    // --- הריצה: טיוטה אוטומטית, הפעלה בזמן, שליחה במנות ---
    const now = new Date();
    const il = ilParts(now);
    const notes: string[] = [];
    // א. טיוטה אוטומטית (ביום שנקבע, מ-09:00) — המנהל מקבל התראה ויכול לערוך עד יום השליחה
    if (cfg.auto && il.day === cfg.draft_day && il.hour >= 9) {
      const { count } = await admin.from("email_campaigns").select("id", { count: "exact", head: true }).eq("auto", true).gt("created_at", new Date(Date.now() - 5 * 864e5).toISOString());
      if (!count) {
        const { data: ups } = await admin.from("site_updates").select("title,body,created_at").eq("active", true).gt("created_at", new Date(Date.now() - 8 * 864e5).toISOString()).order("created_at", { ascending: false }).limit(6);
        if ((ups || []).length || !cfg.skip_empty) {
          const d = draftFrom(ups || []);
          const at = nextSendAt(cfg, now);
          const { error } = await admin.from("email_campaigns").insert({ ...d, status: "scheduled", send_at: at.toISOString(), auto: true, created_by: null, note: "טיוטה אוטומטית" });
          if (!error) {
            notes.push("draft");
            await admin.rpc("email_admin_push", { p_title: "📧 טיוטת המייל השבועי מוכנה", p_body: "אפשר לערוך, להוסיף צילומי מסך או לבטל בבק אופיס ← 📧 מייל שבועי. היא תישלח לבד בזמן שנקבע." });
          }
        } else notes.push("no updates this week");
      }
    }
    // ב. מייל מתוזמן שהגיע זמנו → בשליחה (הקודם, אם עוד לא הגיע לכולם, נסגר — המייל החדש עדכני יותר)
    // ("*" ולא "id,continues" — כדי שהשליחה תמשיך לעבוד גם לפני שמריצים את קוד ה-SQL שמוסיף את continues)
    const { data: due } = await admin.from("email_campaigns").select("*").eq("status", "scheduled").lte("send_at", now.toISOString()).order("send_at", { ascending: false }).limit(1);
    if (due?.length) {
      // מייל שממשיך מאיפה שמייל קודם נעצר — הקודם (גם אם הושהה) נסגר, והחדש ממשיך לשאר המשתמשים מאותו מקום בתור
      if (due[0].continues) await admin.from("email_campaigns").update({ status: "done", finished_at: now.toISOString(), note: "נעצר — ממשיך במייל חדש" }).eq("id", due[0].continues).in("status", ["sending", "paused"]);
      await admin.from("email_campaigns").update({ status: "done", finished_at: now.toISOString(), note: "הוחלף במייל חדש יותר" }).eq("status", "sending");
      await admin.from("email_campaigns").update({ status: "sending", started_at: now.toISOString() }).eq("id", due[0].id);
      notes.push("started");
    }
    const { data: cur } = await admin.from("email_campaigns").select("*").eq("status", "sending").maybeSingle();
    let sent = 0, failed = 0;
    const why = sendWindow(cfg, now, !isCron);
    if (!cur) notes.push("nothing to send");
    else if (!KEY) notes.push("no RESEND_API_KEY");
    else if (why) notes.push("window: " + why);
    else {
      const counts = ((await admin.rpc("email_counts")).data || {}) as { today?: number; month?: number };
      let budget = Math.min(cfg.day_cap - (counts.today || 0), cfg.month_cap - (counts.month || 0));
      if (budget <= 0) notes.push("cap reached");
      while (budget > 0) {
        const n = Math.min(budget, 100);
        const { data: who, error: pe } = await admin.rpc("email_pick", { p_campaign: cur.id, p_limit: n, p_gap: true, p_order: cfg.order });
        if (pe) { notes.push("pick: " + pe.message); break; }
        if (!who?.length) break;
        const rows = (who as { user_id: string; email: string; name: string }[]).map((w) => ({ campaign_id: cur.id, user_id: w.user_id, email: w.email, status: "queued" }));
        const { data: ins, error: ie } = await admin.from("email_sends").insert(rows).select("id,token,user_id,email");
        if (ie) { notes.push("insert: " + ie.message); break; }
        if (!ins?.length) break;
        const names = new Map((who as { user_id: string; name: string }[]).map((w) => [w.user_id, w.name]));
        try {
          const res = await resendBatch(KEY, ins.map((r: { token: string; email: string; user_id: string }) => mailFor(cfg, cur, { token: r.token, email: r.email, name: names.get(r.user_id) || "" })), "run-" + ins[0].token);
          for (let i = 0; i < ins.length; i++) {
            await admin.from("email_sends").update({ status: res[i]?.id ? "sent" : "failed", provider_id: res[i]?.id || "", sent_at: new Date().toISOString(), error: res[i]?.id ? "" : "no id" }).eq("id", ins[i].id);
            if (res[i]?.id) sent++; else failed++;
          }
        } catch (e) {
          // השליחה נכשלה כולה — מוחקים את השורות כדי לנסות שוב בשעה הבאה
          await admin.from("email_sends").delete().in("id", ins.map((r: { id: number }) => r.id));
          await admin.from("email_state").update({ last_error: String((e as Error).message).slice(0, 300), last_run: now.toISOString() }).eq("id", 1);
          return json({ ok: false, error: String((e as Error).message), sent });
        }
        budget -= ins.length;
        if (who.length < n) break;
      }
      // הגיע לכולם? (בלי לחכות לשבוע)
      const { data: left } = await admin.rpc("email_pick", { p_campaign: cur.id, p_limit: 1, p_gap: false });
      if (!left?.length) { await admin.from("email_campaigns").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", cur.id); notes.push("campaign done"); }
      else if (!sent && budget > 0) notes.push("waiting: weekly gap"); // כל מי שנשאר קיבל מייל אחר ב-6 הימים האחרונים
    }
    // ג. גרסה חדשה לאפליקציה לאנדרואיד — מייל למי שעוקב (באותן שעות, ובתוך אותה מכסה)
    if (KEY && !sendWindow(cfg, now, !isCron)) {
      const counts = ((await admin.rpc("email_counts")).data || {}) as { today?: number; month?: number };
      sent += await appRelease(admin, cfg, KEY, Math.min(cfg.day_cap - (counts.today || 0), cfg.month_cap - (counts.month || 0)), notes);
    }
    await admin.from("email_state").update({ last_run: now.toISOString(), ...(isCron ? { last_cron: now.toISOString() } : {}), ...(sent ? { last_sent: now.toISOString(), last_error: "" } : {}), last_note: notes.join(" · ").slice(0, 300) }).eq("id", 1);
    return json({ ok: true, sent, failed, notes });
  } catch (e) {
    console.error("email", e);
    return json({ error: "server" }, 500);
  }
});
