// יאמי AI — פונקציית שרת (Supabase Edge Function) שמחברת את הבוט לבינה מלאכותית.
// שתי אפשרויות, בוחרים בבק אופיס:
//   • Google Gemini — יש מסלול חינמי (עם מגבלת שאלות ליום). המפתח: GEMINI_API_KEY
//   • Claude (Anthropic) — בתשלום לפי שימוש. המפתח: ANTHROPIC_API_KEY
// המפתחות נשמרים כסוד בשרת בלבד ואף פעם לא מגיעים לדפדפן.
// ההגדרות (פעיל/כבוי, למי מותר, מודל, הוראות אישיות, מגבלה יומית) נשלטות מהבק אופיס.
import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

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
const ALLOWED_MODELS = ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5", "claude-fable-5-1"];
const FALLBACK_MODELS = ["claude-opus-5", "claude-fable-5-1"];

const SYSTEM_HEAD = `את "יאמי" — העוזרת החכמה של האתר "רשימת קניות", אתר שאברך פיתח כדי לעזור לכולם — להקל על ניהול הבית, הקניות וההכנות לשבת ולחג.
כללים:
- עני בשפה שבה המשתמש כתב (בדרך כלל עברית), בפשטות, בחום ובקצרה (אלא אם ביקשו פירוט). אפשר אימוג'י במידה.
- האתר משמש משפחות בישראל ובחו"ל — שימי לב למטבע, לעיר ולמנהגי ארץ ישראל/חו"ל שמופיעים בהקשר.
%%TOPIC%%
- כשצריך מידע עדכני מהאינטרנט (למשל מחירים או חנויות) — השתמשי בחיפוש ברשת, וסכמי במילים שלך.
- אין באתר מתכונים ואין דברי תורה: אל תתני ואל תציעי מתכונים, הוראות בישול או דברי תורה, ואל תזכירי אותם כחלק מהאתר. אם מבקשים — אמרי בנימוס שזה לא זמין, והציעי עזרה ברשימה, בבית או במחירים.
- שמרי על לשון נקייה ומכבדת. אסור בשום אופן לכתוב קללות, גסויות או תוכן לא צנוע — בשום שפה. אם מבקשים — סרבי בנימוס.
- אם המשתמש מבקש פעולה באתר (להוסיף/למחוק פריטים, לסיים קנייה, לעבור לשונית, לנווט לסופר וכו') — הפעילי את הכלי site_action עם הפעולות המתאימות, ואחר כך כתבי משפט קצר מה עשית.
- אל תמציאי מחירים או כתובות. אם אינך יודעת — אמרי זאת.`;
// מדריך האתר — כדי שיאמי תסביר בהרחבה מה יש באתר ואיך משתמשים בו
const SITE_GUIDE = `מידע על האתר "רשימת קניות" (yamshopping.com) — להסבר למשתמשים כשהם שואלים מה יש באתר או איך עושים משהו:
- חינמי לגמרי, פתוח לכולם (עם או בלי נטפרי) וגם מאושר בנטפרי, עובד בטלפון ובמחשב (אפשר להתקין כאפליקציה: באייפון — שיתוף ← הוספה למסך הבית; באנדרואיד — תפריט ⋮ ← התקנת האפליקציה).
- 📝 רשימה: כותבים או מקליטים 🎤 ("חלב 2 ולחם"), או ➕ ובוחרים ממאגר מוצרים לפי קטגוריות עם כמות (יח׳, ק״ג, גרם, ליטר, חבילות). מסמנים ✓ מה שנקנה, "סיום קנייה" שומר בהיסטוריה עם מי אישר. כמה רשימות, שיתוף בוואטסאפ/SMS/מייל.
- 🏠 הבית שלי: מה יש ומה חסר לפי קטגוריות, כמות לכל מוצר (− / +), החלקה בין קטגוריות, תצוגת כרטיסים או שורות, "מה חסר לי בבית?". מוצר חדש מקבל הצעת קטגוריה ונכנס גם לבית.
- 🧾 קבלות: מצלמים קבלה — המוצרים, המחירים וההנחות נקראים ונכנסים לבית ולהיסטוריה; אפשר לפרסם מחירים לכולם.
- 💰 מחירים: "איפה הכי זול?" לכל הרשימה, מחירים לפי רשתות וסניפים, דיווח מחירים, מבצעים בחנויות באזור.
- 🏪 חנויות ועסקים: מדריך עסקים, דף לכל עסק, הזמנה ישירה ומעקב ב"ההזמנות שלי", מעקב אחרי מבצעים. בעלי עסקים (באישור): דף עסק, הזמנות, מבצעים, מלאי ומחירים (גם סנכרון מהאתר שלהם), קופה, מה להזמין מהספק, ניהול מכונות אוטומטיות (פחיות, חטיפים, קפה).
- 👥 משתמשים משניים: ⚙️ ← "משתמשים משניים והרשאות" — מזמינים בקישור + סיסמה חד פעמית, בוחרים מה יראו ומה מותר להם; כל פעולה נרשמת בשם; אפשר להסיר בכל רגע.
- 🕯️ לוח עברי: זמני היום (כולל מנחה גדולה וקטנה ופלג המנחה), זמני שבת, פרשה, דף יומי.
- 📌 סידורים בדרך: דברים לעשות כשיוצאים לקניות (תופרת, דואר, בית מרקחת, לשלוח אישור מחלה) — כפתור 📌 סידורים למעלה, או לכתוב ליאמי "סידור: ...". מופיעים בראש רשימת הקניות, אפשר לסמן ✓, להוסיף מקום (עם ניווט) ותאריך.
- 🔔 התראות לטלפון, מצב כהה, נגישות, עברית/אנגלית. יצירת קשר: info@yamshopping.com.
כשמסבירים — תני הסבר מסודר וברור, עם השלבים בפועל (איפה ללחוץ).`;
const TOPIC_USER = `- את עוזרת רק בנושאים האלה: קניות, הכנות לשבת ולחגים (בהקשר של קניות), כשרות של מוצרים, מחירים וחיסכון במשק הבית, חנויות וסופרים, מה יש בבית ומה חסר, והשימוש באתר "רשימת קניות".
- על כל נושא אחר (פוליטיקה, חדשות, טכנולוגיה, לימודים, בריאות שאינה תזונה כללית, שיעורי בית, וכו') — עני בנימוס במשפט אחד בלבד שאת עוזרת רק בענייני קניות ומשק הבית, והציעי משהו קשור (למשל רשימה או השוואת מחירים). אל תעני על התוכן עצמו, גם אם מתעקשים.`;
const TOPIC_ADMIN = `- המשתמש הזה הוא מנהל האתר: מותר לך לעזור לו בכל נושא שהוא מבקש (גם מחוץ לקניות), בכבוד ובצניעות, וכולל שאלות על ניהול האתר.`;
// מתכונים ודברי תורה הוסרו מהאתר — שורות במדריך של המנהל שמזכירות אותם לא נשלחות לבינה המלאכותית
const cleanGuide = (g: string) => g.split("\n").filter((l) => !/(מתכון|מתכונים|מתכוני|דבר תורה|דברי תורה|וורט|ד״ת)/.test(l)).join("\n");
const systemFor = (isAdmin: boolean, guide?: string) => SYSTEM_HEAD.replace("%%TOPIC%%", isAdmin ? TOPIC_ADMIN : TOPIC_USER) + "\n\n" + (guide && guide.trim() ? "מידע על האתר (ממנהל האתר):\n" + cleanGuide(guide).slice(0, 6000) : SITE_GUIDE);


const SITE_ACTION_TOOL = {
  name: "site_action",
  description:
    "מבצע פעולות באתר רשימת הקניות של המשתמש. אפשר לשלוח כמה פעולות בבת אחת. " +
    "add_items: הוספת פריטים לרשימה (items: [{name, qty}]). remove_items: מחיקה (items). check_items: סימון כנקנה (items). " +
    "finish_shopping: סיום קנייה והעברה להיסטוריה. set_tab: מעבר לשונית (tab: list|hist|home|prices). " +
    "set_dark: מצב כהה (value: true/false). navigate_waze: ניווט בוויז (query: שם רשת + עיר/כתובת). " +
    "pantry_set: עדכון מה יש בבית (items, value). new_list: רשימה חדשה (name). switch_list: מעבר לרשימה (name). " +
    "print: הדפסה. share_whatsapp: שיתוף בוואטסאפ. open_about: פתיחת אודות. logout: יציאה מהאתר. " +
    "add_errands: הוספת סידורים/תזכורות לדרך — דברים לעשות כשיוצאים לקניות, כמו תופרת, דואר, אישור מחלה (items: [{name}]). done_errands: סימון סידור כבוצע (items). " +
    "recurring_add: פריט קבוע שנכנס לרשימה אוטומטית שוב ושוב (\"3 חלב כל יומיים\") — items: [{name, qty}] עם שם המוצר בלבד (לעולם לא משפט), ו-every_days (מספר ימים) או weekdays (0=ראשון … 6=שבת). recurring_remove: הפסקת פריט קבוע (items).",
  input_schema: {
    type: "object" as const,
    properties: {
      actions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "add_items", "remove_items", "check_items", "finish_shopping", "set_tab", "set_dark",
                "navigate_waze", "pantry_set", "new_list", "switch_list", "print", "share_whatsapp",
                "open_about", "logout", "add_errands", "done_errands", "recurring_add", "recurring_remove",
              ],
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, qty: { type: "string" } },
                required: ["name"],
              },
            },
            tab: { type: "string", enum: ["list", "hist", "home", "prices"] },
            value: { type: "boolean" },
            query: { type: "string" },
            name: { type: "string" },
            every_days: { type: "integer" },
            weekdays: { type: "array", items: { type: "integer" } },
          },
          required: ["type"],
        },
      },
    },
    required: ["actions"],
  },
};

type ChatTurn = { role: "user" | "assistant"; content: string };

// תקרות עלות למשתמש רגיל (למנהל — כמו קודם)
const USER_MAX_TOKENS = 2000;          // אורך תשובה בשיחה
const USER_TOOL_ROUNDS = 2;            // כמה סבבי כלים/חיפוש אחרי התשובה הראשונה
const USER_INPUT_CHARS = 20000;        // היסטוריה + הקשר ביחד (הודעות ישנות נחתכות קודם)
const USER_MAX_IMAGES = 3;
const USER_IMAGE_BYTES = 1.5 * 1024 * 1024;
// קבלה ארוכה נשלחת בחלקים חופפים (כל תמונה של קבלה ארוכה נחתכת בדפדפן לכמה חלקים כדי שהטקסט הקטן יישאר חד)
const USER_MAX_RECEIPT_IMAGES = 8;
const RECEIPT_TOTAL_BYTES = 9 * 1024 * 1024;
const RECEIPT_DEADLINE_MS = 120000;    // קריאה + בדיקה שנייה — בתוך מגבלת הזמן של פונקציית השרת
const PROVIDER_TIMEOUT_MS = 60000;     // לא מחכים לנצח לספק הבינה המלאכותית
// גודל התמונה בפועל (בבייטים) לפי אורך ה-base64
// מפתחות השרת: הישן (JWT) ואחריו החדשים (SUPABASE_SECRET_KEYS = {"default":"sb_secret_..."})
function serverKeys(): string[] {
  const out: string[] = [];
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) out.push(legacy);
  try { for (const v of Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"))) if (typeof v === "string" && v) out.push(v); } catch { /* */ }
  const single = Deno.env.get("SUPABASE_SECRET_KEY");
  if (single) out.push(single);
  return [...new Set(out)];
}
const dataUrlBytes = (d: string) => { const i = d.indexOf(","); return Math.floor((d.length - i - 1) * 3 / 4); };

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

  let reqBody: { ping?: boolean; messages?: ChatTurn[]; context?: string; diag?: boolean; vision?: string; images?: string[]; text?: string; webprices?: { query?: string; city?: string }; nearby?: { where?: string; kind?: string }; categorize?: { items?: unknown[]; cats?: unknown[] }; receiptUrl?: string } = {};
  try { reqBody = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  // "חימום": האתר שולח ping כשפותחים את יאמי, כדי שהשאלה עצמה לא תחכה להפעלה של השרת
  if (reqBody.ping) return json({ ok: true });

  const url = Deno.env.get("SUPABASE_URL")!;

  // מי שואל? (בודקים את הטוקן של המשתמש המחובר)
  // מפתח השרת: קודם הישן (SUPABASE_SERVICE_ROLE_KEY), ואם הוא לא עובד (מפתחות legacy כבויים / הוחלפו) — המפתחות החדשים (sb_secret_)
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  let admin = createClient(url, serverKeys()[0] || "", { auth: { persistSession: false } });
  let { data: userData, error: userErr } = await admin.auth.getUser(token);
  const tried = [userErr ? `k0:${userErr.status ?? ""} ${userErr.message}` : ""];
  for (const [i, k] of serverKeys().slice(1).entries()) {
    if (!userErr && userData?.user) break;
    const alt = createClient(url, k, { auth: { persistSession: false } });
    const r = await alt.auth.getUser(token);
    if (!r.error && r.data?.user) { admin = alt; userData = r.data; userErr = null; console.error("ai-chat: service key fallback", i + 1); break; }
    tried.push(`k${i + 1}:${r.error?.status ?? ""} ${r.error?.message ?? ""}`);
  }
  if (userErr || !userData?.user) {
    console.error("ai-chat unauthorized", token ? "token" : "no token", tried.join(" | "));
    // detail: למה השרת לא זיהה את המשתמש (בלי סודות) — נרשם ביומן התקלות באתר
    return json({ error: "unauthorized", detail: (token ? "" : "no token · ") + tried.filter(Boolean).join(" | ").slice(0, 300) }, 401);
  }
  const user = userData.user;
  let isAdmin = isOwnerUser(user);
  // כל הבדיקות במקביל ולא אחת אחרי השנייה (חוסך כמה סבבים לשרת בכל שאלה)
  const today = new Date().toISOString().slice(0, 10);
  const [staffRes, cfgRes, banRes, usageRes] = await Promise.all([
    // מנהלים נוספים (מהבק אופיס ← צוות) מקבלים את אותן הרשאות AI
    isAdmin ? Promise.resolve({ data: null }) : admin.from("staff").select("role").eq("user_id", user.id).maybeSingle(),
    // ההגדרות מהבק אופיס
    admin.from("site_config").select("value").eq("key", "ai").maybeSingle(),
    admin.from("user_bans").select("kind, until").eq("user_id", user.id).maybeSingle(),
    admin.from("ai_usage").select("count").eq("user_id", user.id).eq("day", today).maybeSingle(),
  ]);
  if (!isAdmin) isAdmin = (staffRes.data as { role?: string } | null)?.role === "admin";
  if (isAdmin && !(await mfaOk(admin, user, token))) isAdmin = false;
  const cfg = ((cfgRes.data as { value?: unknown } | null)?.value || {}) as Record<string, unknown>;

  // בדיקת חיבור מהבק אופיס (רק למנהל): מה מוגדר, ושאלת ניסיון אמיתית
  if (reqBody.diag) {
    if (!isAdmin) return json({ error: "forbidden" }, 403);
    const prov = cfg.provider === "claude" || cfg.provider === "gemini" ? String(cfg.provider) : (geminiKeys().length ? "gemini" : "claude");
    const out: Record<string, unknown> = {
      version: 2, enabled: !!cfg.enabled, audience: cfg.audience === "all" ? "all" : "admin", provider: prov,
      hasGeminiKey: geminiKeys().length > 0, geminiKeys: geminiKeys().length, hasClaudeKey: !!Deno.env.get("ANTHROPIC_API_KEY"),
      geminiModel: String(cfg.geminiModel || "gemini-2.5-flash"),
    };
    if (prov === "gemini" && out.hasGeminiKey) {
      const t = await geminiCall(geminiKeys()[0], String(out.geminiModel), "ענה במילה אחת.", [{ role: "user", parts: [{ text: "שלום" }] }], false);
      out.test = t.ok ? { ok: true, model: t.model, text: t.text } : { ok: false, status: t.status, model: t.model, error: t.error, tries: t.tries || [] };
    }
    return json(out);
  }
  // משתמש מושעה/חסום (החלטת מנהל בבק אופיס) — לא עונים
  if (!isAdmin) {
    const ban = banRes.data as { kind?: string; until?: string } | null;
    if (ban && ban.kind !== "warn" && (!ban.until || new Date(ban.until) > new Date())) return json({ banned: true, text: "החשבון מושעה כרגע 🙏 אפשר לפנות לצוות האתר בצ'אט." });
  }
  if (!cfg.enabled) return json({ disabled: true, reason: "off" });
  // לא נבחר ספק? משתמשים במפתח שקיים (קודם Gemini החינמי)
  const provider = cfg.provider === "claude" || cfg.provider === "gemini" ? String(cfg.provider)
    : (geminiKeys().length ? "gemini" : "claude");
  const apiKey = provider === "gemini" ? geminiKeys()[0] : Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ disabled: true, reason: "no_key" });
  if (cfg.audience !== "all" && !isAdmin) return json({ disabled: true, reason: "admin_only" });

  // תמונות: למשתמש רגיל עד 3 תמונות בכל פעם (בודקים לפני שמורידים מהמכסה)
  const maxImgs = reqBody.vision === "receipt" ? USER_MAX_RECEIPT_IMAGES : USER_MAX_IMAGES;
  if (!isAdmin && (reqBody.vision === "receipt" || reqBody.vision === "list" || reqBody.vision === "product") && Array.isArray(reqBody.images) && reqBody.images.length > maxImgs) {
    return json({ error: "too_many_images", text: `אפשר לשלוח עד ${maxImgs} תמונות בכל פעם 🙂` }, 400);
  }

  // מגבלה יומית למשתמש (למנהל אין מגבלה)
  const limit = Math.max(1, Math.min(1000, Number(cfg.dailyLimit) || 30));
  const LIMITED = { limited: true, text: "הגעת למכסת השאלות היומית לבינה המלאכותית 🙂 נמשיך מחר!" };
  if (!isAdmin) {
    // לוקחים "כרטיס" מהמכסה באופן אטומי במסד הנתונים *לפני* הפנייה לספק — כך בקשות במקביל לא עוקפות את המגבלה
    const { data: taken, error: takeErr } = await admin.rpc("ai_usage_take", { p_user: user.id });
    if (!takeErr && Number.isFinite(Number(taken))) {
      if (Number(taken) > limit) return json(LIMITED);
    } else {
      // הפונקציה עוד לא קיימת במסד (ה-SQL לא הורץ) — השיטה הישנה
      console.error("ai_usage_take unavailable — fallback", takeErr);
      const used = (usageRes.data as { count?: number } | null)?.count || 0;
      if (used >= limit) return json(LIMITED);
      const counted = Promise.resolve(admin.from("ai_usage").upsert({ user_id: user.id, day: today, count: used + 1 })).then(() => {}, (e: unknown) => console.error("ai_usage", e));
      (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime?.waitUntil(counted);
    }
  }

  const body = reqBody;

  // 🔗 קבלה דיגיטלית מקישור: השרת מביא את הדף פעם אחת (בשביל המשתמש, עם הקישור שלו) ומחזיר טקסט / PDF / תמונה.
  // לא שומרים את הקישור ולא את התוכן — הקריאה עצמה נעשית אחר כך כמו קבלה רגילה, והמשתמש מאשר לפני שמשהו נשמר
  if (typeof body.receiptUrl === "string") {
    const r = await fetchReceiptLink(body.receiptUrl);
    return json(r.ok ? { fetched: r } : { error: r.error, text: r.text }, r.ok ? 200 : 422);
  }

  // הצעת קטגוריה למוצרים חדשים שלא במאגר (המשתמש מאשר או משנה)
  if (body.categorize && typeof body.categorize === "object") {
    const items = (Array.isArray(body.categorize.items) ? body.categorize.items : []).map((x) => String(x).slice(0, 60)).filter(Boolean).slice(0, 30);
    const cats = (Array.isArray(body.categorize.cats) ? body.categorize.cats : []).map((x) => String(x).slice(0, 40)).filter(Boolean).slice(0, 60);
    if (!items.length || !cats.length) return json({ error: "no_input" }, 400);
    const prompt = `סווגי כל מוצר לאחת מהקטגוריות האלה בלבד: ${cats.join(" | ")}.\nהחזירי JSON בלבד במבנה {"items":[{"name":"שם המוצר בדיוק כמו שקיבלת","category":"אחת מהקטגוריות"}]}. אם לא בטוחה — "אחר".`;
    try {
      const raw = provider === "gemini"
        ? await visionGemini(apiKey, /^[a-z0-9.\-]{3,60}$/.test(String(cfg.geminiModel || "")) ? String(cfg.geminiModel) : "gemini-2.5-flash", prompt, [], items.join("\n"))
        : await visionClaude(apiKey, ALLOWED_MODELS.includes(String(cfg.model)) ? String(cfg.model) : "claude-opus-5", prompt, [], items.join("\n"), isAdmin ? 8000 : USER_MAX_TOKENS);
      const m = raw.match(/\{[\s\S]*\}/);
      const parsed = m ? JSON.parse(m[0]) : null;
      const out: Record<string, string> = {};
      (parsed?.items || []).forEach((r: { name?: string; category?: string }) => { if (r && r.name && cats.includes(String(r.category))) out[String(r.name)] = String(r.category); });
      return json({ categories: out });
    } catch (err) {
      console.error("categorize", err);
      return json({ categories: {} });
    }
  }
  // קריאת קבלה / רשימת קניות מצולמת או כתובה → מחזיר נתונים מסודרים (הלקוח מאשר לפני שמשהו נשמר)
  if (body.vision === "receipt" || body.vision === "list" || body.vision === "product") {
    let imgs = (Array.isArray(body.images) ? body.images : []).filter((x) => typeof x === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(x) && x.length < 3_000_000 && (isAdmin || dataUrlBytes(x) <= USER_IMAGE_BYTES))
      .slice(0, body.vision === "receipt" ? (isAdmin ? 12 : USER_MAX_RECEIPT_IMAGES) : (isAdmin ? 6 : USER_MAX_IMAGES));
    if (body.vision === "receipt") { let bytes = 0; imgs = [...new Set(imgs)].filter((x) => (bytes += dataUrlBytes(x)) <= RECEIPT_TOTAL_BYTES); }
    const txt = String(body.text || "").slice(0, body.vision === "receipt" ? 16000 : 8000);
    if (!imgs.length && !txt.trim()) return json({ error: "no_input" }, 400);
    const prompt = body.vision === "receipt" ? RECEIPT_PROMPT : body.vision === "product" ? PRODUCT_PROMPT : LIST_PROMPT;
    try {
      // קבלה: המודל החזק, בדיקה מול הסה״כ המודפס ובדיקה שנייה כשלא מסתדר
      if (body.vision === "receipt") {
        const rc = await readReceipt(provider, apiKey, cfg, imgs, txt);
        if (!rc) return json({ error: "parse_failed", text: "לא הצלחתי לקרוא את הקבלה 🙁 נסו צילום ישר וחד יותר, באור טוב." }, 422);
        return json({ receipt: rc });
      }
      const raw = provider === "gemini"
        ? await visionGemini(apiKey, /^[a-z0-9.\-]{3,60}$/.test(String(cfg.geminiModel || "")) ? String(cfg.geminiModel) : "gemini-2.5-flash", prompt, imgs, txt)
        : await visionClaude(apiKey, ALLOWED_MODELS.includes(String(cfg.model)) ? String(cfg.model) : "claude-opus-5", prompt, imgs, txt);
      const m = raw.match(/\{[\s\S]*\}/);
      const parsed = m ? JSON.parse(m[0]) : null;
      if (parsed && !Array.isArray(parsed.items) && parsed.name) parsed.items = [{ ...parsed }];
      if (!parsed || !Array.isArray(parsed.items)) return json({ error: "parse_failed", text: "לא הצלחתי לקרוא את התמונה 🙁 נסו צילום ישר וחד יותר, באור טוב." }, 422);
      parsed.items = parsed.items.slice(0, 200);
      return json({ [body.vision]: parsed });
    } catch (err) {
      console.error("vision", err);
      const st = (err as { status?: number })?.status;
      if (st === 429) return json({ text: "הגענו למכסת השאלות החינמית לרגע זה 😅 נסו שוב בעוד דקה." }, 429);
      if (st === 503 || (st && st >= 500) || st === 0) return json({ text: "הבינה המלאכותית של גוגל עמוסה כרגע 😅 נסו שוב בעוד דקה.", ...(isAdmin ? { detail: String((err as Error)?.message || err) } : {}) }, 503);
      return json({ error: "ai_failed", text: "לא הצלחתי לקרוא כרגע 🙁", ...(isAdmin ? { detail: String((err as Error)?.message || err) } : {}) }, 502);
    }
  }
  // חנויות קרובות מהרשת (חיפוש בגוגל דרך Gemini) — לפי כתובת / עיר / קואורדינטות
  if (body.nearby && typeof body.nearby === "object") {
    const nb = body.nearby as { where?: string; kind?: string };
    const where = String(nb.where || "").slice(0, 160), kind = String(nb.kind || "סופרמרקטים וחנויות מכולת").slice(0, 60);
    if (!where.trim()) return json({ error: "no_input" }, 400);
    if (provider !== "gemini") return json({ text: "", web: false });
    const gm = /^[a-z0-9.\-]{3,60}$/.test(String(cfg.geminiModel || "")) ? String(cfg.geminiModel) : "gemini-2.5-flash";
    const r = await geminiFetch(apiKey, gm, {
      contents: [{ role: "user", parts: [{ text: `חפשי בגוגל ${kind} הכי קרובים ל: ${where}. כתבי בעברית רשימה של עד 8 מקומות, מהקרוב לרחוק: שם — כתובת — מרחק משוער — שעות פתיחה אם ידוע — טלפון אם ידוע. אל תמציאי מקומות או כתובות; אם לא בטוחה — אל תכללי.` }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
    });
    if (!r.ok) return json({ text: "", web: false, ...(isAdmin ? { detail: `Gemini ${r.status} (${r.model}): ${r.error}` } : {}) });
    const cand = (r.data as { candidates?: { groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] } }[] })?.candidates?.[0];
    const sources = (cand?.groundingMetadata?.groundingChunks || []).map((c) => c.web).filter((w) => w && w.uri).slice(0, 5).map((w) => ({ title: String(w!.title || "").slice(0, 80), url: String(w!.uri) }));
    return json({ text: partsText(r.data).trim(), web: true, sources });
  }
  // השוואת מחירים מהרשת (חיפוש בגוגל דרך Gemini) — מוצג ללקוח כ"מהרשת, לא מאומת"
  if (body.webprices && typeof body.webprices === "object") {
    const wq = String(body.webprices.query || "").slice(0, 120), city = String(body.webprices.city || "").slice(0, 40);
    if (!wq.trim()) return json({ error: "no_input" }, 400);
    if (provider !== "gemini") return json({ text: "", web: false });
    const gm = /^[a-z0-9.\-]{3,60}$/.test(String(cfg.geminiModel || "")) ? String(cfg.geminiModel) : "gemini-2.5-flash";
    const r = await geminiFetch(apiKey, gm, {
      contents: [{ role: "user", parts: [{ text: `חפשי ברשת מחירים עדכניים בישראל של: ${wq}${city ? ` (באזור ${city})` : ""} ברשתות סופרמרקט (שופרסל, רמי לוי, ויקטורי, יוחננוף, אושר עד, יינות ביתן, חצי חינם, קרפור ועוד) ובאתרי השוואת מחירים. כתבי בעברית רשימה קצרה: רשת — מחיר — מקור, מהזול ליקר, ומשפט אחד מה הכי משתלם. אם לא מצאת מחיר אמין — אמרי זאת. אל תמציאי מחירים.` }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
    });
    if (!r.ok) return json({ text: "", web: false, ...(isAdmin ? { detail: `Gemini ${r.status} (${r.model}): ${r.error}` } : {}) });
    const cand = (r.data as { candidates?: { groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] } }[] })?.candidates?.[0];
    const sources = (cand?.groundingMetadata?.groundingChunks || []).map((c) => c.web).filter((w) => w && w.uri).slice(0, 5).map((w) => ({ title: String(w!.title || "").slice(0, 80), url: String(w!.uri) }));
    return json({ text: partsText(r.data).trim(), web: true, sources });
  }
  const turns = (body.messages || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-14)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  // הקשר (מה ברשימה, מה בבית, תאריך עברי) — מצורף להודעה האחרונה ולא להנחיות, כדי שההנחיות יישמרו בקאש
  const context = String(body.context || "").slice(0, 6000);
  // משתמש רגיל: תקרה לכל הטקסט שנשלח לספק — מורידים הודעות ישנות עד שנכנסים בתקרה
  if (!isAdmin) {
    let total = context.length + turns.reduce((n, t) => n + t.content.length, 0);
    while (total > USER_INPUT_CHARS && turns.length > 1) total -= turns.shift()!.content.length;
  }
  // ההיסטוריה חייבת להתחיל בהודעת משתמש ולהסתיים בהודעת משתמש
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return json({ error: "no_question" }, 400);

  const last = turns[turns.length - 1];
  const messages: Anthropic.Beta.BetaMessageParam[] = turns.slice(0, -1).map((t) => ({ role: t.role, content: t.content }));
  messages.push({
    role: "user",
    content: [
      { type: "text", text: `<site_context>\n${context}\n</site_context>` },
      { type: "text", text: last.content },
    ],
  });

  const instructions = String(cfg.instructions || "").slice(0, 6000);
  if (provider === "gemini") {
    const gModel = /^[a-z0-9.\-]{3,60}$/.test(String(cfg.geminiModel || "")) ? String(cfg.geminiModel) : "gemini-2.5-flash";
    return await askGemini(apiKey, gModel, isAdmin, systemFor(isAdmin, String(cfg.siteGuide || "")) + "\n- (בחיבור הזה אין חיפוש ברשת — עני מהידע שלך, ואם אינך בטוחה, אמרי זאת.)" + (instructions ? `\n\nהנחיות אישיות ממנהל האתר (עדיפות עליונה):\n${instructions}` : ""), turns, context);
  }

  const model = ALLOWED_MODELS.includes(String(cfg.model)) ? String(cfg.model) : "claude-opus-5";
  const effort = ["low", "medium", "high"].includes(String(cfg.effort)) ? String(cfg.effort) : "medium";
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: systemFor(isAdmin, String(cfg.siteGuide || "")) + (instructions ? `\n\nהנחיות אישיות ממנהל האתר (עדיפות עליונה):\n${instructions}` : ""), cache_control: { type: "ephemeral" } },
  ];
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: isAdmin ? 3 : USER_TOOL_ROUNDS, user_location: { type: "approximate", country: "IL", timezone: "Asia/Jerusalem" } },
    SITE_ACTION_TOOL,
  ];

  const client = new Anthropic({ apiKey, timeout: PROVIDER_TIMEOUT_MS, maxRetries: 1 });
  const useFallbacks = FALLBACK_MODELS.includes(model);
  const actions: unknown[] = [];
  let text = "";

  try {
    const rounds = isAdmin ? 5 : 1 + USER_TOOL_ROUNDS;
    for (let round = 0; round < rounds; round++) {
      const response = await client.beta.messages.create({
        model,
        max_tokens: isAdmin ? 16000 : USER_MAX_TOKENS,
        system,
        tools,
        messages,
        ...(model === "claude-haiku-4-5" ? {} : { output_config: { effort: effort as "low" | "medium" | "high" } }),
        ...(useFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });

      if (response.stop_reason === "refusal") {
        text = "על זה אני לא יכולה לעזור 🙏 אפשר לשאול משהו אחר?";
        break;
      }
      for (const block of response.content) if (block.type === "text") text += block.text;

      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }
      if (response.stop_reason === "tool_use") {
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          const input = block.input as { actions?: unknown[] };
          if (block.name === "site_action" && Array.isArray(input?.actions)) {
            actions.push(...input.actions.slice(0, 20));
            results.push({ type: "tool_result", tool_use_id: block.id, content: "הפעולות נשלחו לביצוע באתר." });
          } else {
            results.push({ type: "tool_result", tool_use_id: block.id, content: "כלי לא מוכר", is_error: true });
          }
        }
        messages.push({ role: "assistant", content: response.content });
        messages.push({ role: "user", content: results });
        text = "";
        continue;
      }
      break;
    }
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ text: "יש עומס כרגע 😅 נסו שוב בעוד דקה.", actions });
    if (err instanceof Anthropic.APIError) {
      console.error("anthropic error", err.status, err.message);
      return json({ error: "ai_failed", text: "משהו השתבש בחיבור לבינה המלאכותית 🙁" }, 502);
    }
    console.error(err);
    return json({ error: "ai_failed", text: "משהו השתבש 🙁" }, 500);
  }

  return json({ text: text.trim() || (actions.length ? "בוצע ✅" : "לא מצאתי תשובה 🤔"), actions });
}));

// ---------- Google Gemini (מסלול חינמי) ----------
// אותו כלי site_action, בפורמט של Gemini (function calling)
const geminiSchema = (x: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(x)) {
    if (k === "type") out.type = String(v).toUpperCase();
    else if (k === "properties") out.properties = Object.fromEntries(Object.entries(v as Record<string, Record<string, unknown>>).map(([pk, pv]) => [pk, geminiSchema(pv)]));
    else if (k === "items") out.items = geminiSchema(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
};
const GEMINI_TOOLS = [{
  function_declarations: [{
    name: SITE_ACTION_TOOL.name,
    description: SITE_ACTION_TOOL.description,
    parameters: geminiSchema(SITE_ACTION_TOOL.input_schema as unknown as Record<string, unknown>),
  }],
}];

type GPart = { text?: string; functionCall?: { name: string; args?: Record<string, unknown> }; functionResponse?: unknown; thought?: boolean };
// מודלים חלופיים — אם גוגל הפסיקה מודל, מנסים את הבא בתור
const GEMINI_FALLBACKS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-lite-latest"];
// שליחה לגוגל עם גיבוי: אם המודל עמוס (503), נכשל (5xx), במכסה (429) או לא קיים (404) — עוברים למודל הבא.
// אחרי שכל המודלים עמוסים — מחכים רגע ומנסים סיבוב נוסף. שגיאת מפתח/הרשאה — עוצרים מיד.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// כמה מפתחות Gemini (מכמה חשבונות גוגל): GEMINI_API_KEY, GEMINI_API_KEY_2 ... GEMINI_API_KEY_5 — כשאחד מגיע למכסה, עוברים לבא
function geminiKeys(first?: string): string[] {
  const ks = [first, Deno.env.get("GEMINI_API_KEY"), ...[2, 3, 4, 5].map((i) => Deno.env.get("GEMINI_API_KEY_" + i)), ...(Deno.env.get("GEMINI_API_KEYS") || "").split(",")]
    .map((k) => (k || "").trim()).filter((k) => k.length > 20);
  return [...new Set(ks)];
}
// opts (לקריאת קבלות): also — מודלים לנסות מיד אחרי הראשון; timeoutMs/deadline — זמן לכל מודל ותקרה כוללת (אחרי timeout ממשיכים למודל הבא)
type GeminiOpts = { also?: string[]; timeoutMs?: number; deadline?: number };
async function geminiFetch(apiKey: string, model: string, body: Record<string, unknown>, opts: GeminiOpts = {}):
  Promise<{ ok: boolean; status: number; model: string; error: string; data?: Record<string, unknown>; tries?: string[] }> {
  const keys = geminiKeys(apiKey);
  let last = { ok: false, status: 0, model, error: "no key" } as { ok: boolean; status: number; model: string; error: string; data?: Record<string, unknown>; tries?: string[] };
  for (let i = 0; i < keys.length; i++) {
    if (opts.deadline && opts.deadline - Date.now() < 8000) break;
    last = await geminiFetchOne(keys[i], model, body, opts);
    if (last.ok) return last;
    const quota = last.status === 429 || /quota|exhausted|rate.?limit/i.test(last.error);
    const badKey = last.status === 400 && /API key not valid|API_KEY_INVALID/i.test(last.error) || last.status === 403;
    if (!quota && !badKey) return last;
    if (i < keys.length - 1) console.error("gemini key " + (i + 1) + " " + (quota ? "quota" : "invalid") + " — trying key " + (i + 2));
  }
  return last;
}
async function geminiFetchOne(apiKey: string, model: string, body: Record<string, unknown>, opts: GeminiOpts = {}):
  Promise<{ ok: boolean; status: number; model: string; error: string; data?: Record<string, unknown>; tries?: string[] }> {
  const tryModels = [...new Set([model, ...(opts.also || []), ...GEMINI_FALLBACKS])];
  let last: { ok: boolean; status: number; model: string; error: string; tries?: string[] } = { ok: false, status: 0, model, error: "" };
  // מה קרה בכל מודל — כדי שבבדיקת החיבור יופיע הסיפור המלא ולא רק השגיאה של המודל האחרון
  const tries: string[] = [];
  let quotaHit: typeof last | null = null;
  for (let pass = 0; pass < 2; pass++) {
    if (pass) await sleep(2000);
    let busy = false;
    for (const m of tryModels) {
      let r: Response;
      const left = opts.deadline ? opts.deadline - Date.now() : Infinity;
      if (left < 8000) break;
      const send = (b: Record<string, unknown>) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify(b),
        signal: AbortSignal.timeout(Math.min(opts.timeoutMs || PROVIDER_TIMEOUT_MS, left)),
      });
      try {
        const b = fitModel(m, body);
        r = await send(b);
        // מודל שלא מקבל את הגדרת המהירות (גם כשגוגל עונה רק "invalid argument") — שולחים שוב בלעדיה
        if (r.status === 400 && b !== noThinking(b) && !/API key not valid|API_KEY_INVALID/i.test(await r.clone().text())) r = await send(noThinking(b));
      } catch (e) {
        last = { ok: false, status: 0, model: m, error: String(e) };
        // חיכינו כבר דקה שלמה — לא מנסים עוד מודלים (אחרת הבקשה תימשך דקות)
        if ((e as Error)?.name === "TimeoutError" && !opts.deadline) return last;
        tries.push(m + " " + String(e).slice(0, 100));
        busy = true; continue;
      }
      if (r.ok) return { ok: true, status: 200, model: m, error: "", data: await r.json() };
      const errText = (await r.text()).slice(0, 600);
      let msg = errText;
      try { msg = JSON.parse(errText)?.error?.message || errText; } catch { /* keep raw */ }
      last = { ok: false, status: r.status, model: m, error: msg };
      tries.push(m + " " + r.status + ": " + msg.slice(0, 140));
      console.error("gemini error", m, r.status, msg);
      const badKey = r.status === 403 || /API key not valid|API_KEY_INVALID/i.test(msg);
      if (badKey) return { ...last, tries };
      if (r.status === 429 || /quota|exhausted|rate.?limit/i.test(msg)) quotaHit = quotaHit || last;
      if (r.status >= 500) busy = true; // עומס זמני — שווה לנסות שוב; מכסה (429) — עוברים מיד למפתח הבא
      // כל שגיאה אחרת (מודל לא קיים, לא תומך בבקשה, מכסה, עומס) — עוברים למודל הבא
    }
    if (!busy) break;
  }
  // כולם נכשלו: אם אחד מהם היה במכסה — זו הסיבה האמיתית (ולא השגיאה של המודל האחרון ברשימה)
  return { ...(quotaHit || last), tries };
}
// מהירות: מודלי Flash "חושבים" לפני כל תשובה כברירת מחדל, וזה מה שגרם ליאמי לענות לאט.
// בשיחה עם יאמי מכבים את זה (thinkingBudget: 0). מודל שלא תומך (2.0, Pro) — שולחים בלי ההגדרה.
const FAST_THINKING = { thinkingBudget: 0 };
function noThinking(body: Record<string, unknown>): Record<string, unknown> {
  const gc = body.generationConfig as Record<string, unknown> | undefined;
  if (!gc?.thinkingConfig) return body;
  const { thinkingConfig: _drop, ...rest } = gc;
  return { ...body, generationConfig: rest };
}
const fitModel = (model: string, body: Record<string, unknown>) =>
  /flash/i.test(model) && !/(^|-)(1\.5|2\.0)-/.test(model) ? body : noThinking(body);
const partsText = (d?: Record<string, unknown>) =>
  ((d as { candidates?: { content?: { parts?: GPart[] } }[] })?.candidates?.[0]?.content?.parts || [])
    .filter((p: GPart) => typeof p.text === "string" && !p.thought).map((p: GPart) => p.text).join("");
async function geminiCall(apiKey: string, model: string, system: string, contents: { role: string; parts: GPart[] }[], withTools: boolean):
  Promise<{ ok: boolean; status?: number; model: string; error?: string; text?: string; cand?: Record<string, unknown>; tries?: string[] }> {
  const r = await geminiFetch(apiKey, model, {
    system_instruction: { parts: [{ text: system }] },
    contents,
    ...(withTools ? { tools: GEMINI_TOOLS } : {}),
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048, thinkingConfig: FAST_THINKING },
  });
  if (!r.ok) return r;
  const cand = (r.data as { candidates?: Record<string, unknown>[] })?.candidates?.[0];
  return { ok: true, model: r.model, cand, text: partsText(r.data) };
}

async function askGemini(apiKey: string, model: string, isAdmin: boolean, system: string, turns: ChatTurn[], context: string): Promise<Response> {
  const contents: { role: string; parts: GPart[] }[] = turns.map((t, i) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: i === turns.length - 1 ? `<site_context>\n${context}\n</site_context>\n\n${t.content}` : t.content }],
  }));
  const actions: unknown[] = [];
  let text = "";
  try {
    // משתמש רגיל: עד 2 סבבי כלים אחרי התשובה הראשונה
    for (let round = 0, rounds = isAdmin ? 4 : 1 + USER_TOOL_ROUNDS; round < rounds; round++) {
      const res = await geminiCall(apiKey, model, system, contents, true);
      if (!res.ok) {
        if (res.status === 429) return json({ text: "הגענו למכסת השאלות החינמית לרגע זה 😅 נסו שוב בעוד דקה (או מחר).", actions });
        if (res.status === 503 || res.status >= 500 || res.status === 0) return json({ text: "הבינה המלאכותית של גוגל עמוסה כרגע 😅 נסו שוב בעוד דקה.", actions, ...(isAdmin ? { detail: `Gemini ${res.status} (${res.model}): ${res.error}` } : {}) });
        return json({ error: "ai_failed", text: "משהו השתבש בחיבור לבינה המלאכותית 🙁", ...(isAdmin ? { detail: `Gemini ${res.status} (${res.model}): ${res.error}` } : {}) }, 502);
      }
      model = res.model;
      const cand = res.cand as { content?: { parts?: GPart[] }; finishReason?: string } | undefined;
      if (!cand) { text = "על זה אני לא יכולה לעזור 🙏 אפשר לשאול משהו אחר?"; break; }
      const parts: GPart[] = cand.content?.parts || [];
      const calls = parts.filter((p) => p.functionCall);
      text += res.text || "";
      if (!calls.length) {
        if (!text && cand.finishReason === "SAFETY") text = "על זה אני לא יכולה לעזור 🙏 אפשר לשאול משהו אחר?";
        break;
      }
      contents.push({ role: "model", parts });
      const responses: GPart[] = [];
      for (const c of calls) {
        const args = (c.functionCall!.args || {}) as { actions?: unknown[] };
        if (c.functionCall!.name === "site_action" && Array.isArray(args.actions)) {
          actions.push(...args.actions.slice(0, 20));
          responses.push({ functionResponse: { name: "site_action", response: { result: "הפעולות נשלחו לביצוע באתר." } } });
        } else {
          responses.push({ functionResponse: { name: c.functionCall!.name, response: { error: "כלי לא מוכר" } } });
        }
      }
      contents.push({ role: "user", parts: responses });
      text = "";
    }
  } catch (err) {
    console.error(err);
    return json({ error: "ai_failed", text: "משהו השתבש 🙁", ...(isAdmin ? { detail: String(err) } : {}) }, 500);
  }
  return json({ text: text.trim() || (actions.length ? "בוצע ✅" : "לא מצאתי תשובה 🤔"), actions });
}

// ---------- קריאת קבלות ורשימות (תמונה או טקסט) ----------
const RECEIPT_PROMPT = `את מומחית להעתקת קבלות מסופרמרקטים וחנויות בישראל. לפנייך קבלה אחת — לפעמים בכמה תמונות או חלקים של אותה קבלה ארוכה, לפי הסדר מלמעלה למטה. חלקים סמוכים חופפים מעט: השורות שבתחתית חלק אחד מופיעות שוב בראש החלק הבא — הן נספרות פעם אחת בלבד (כתבי אותן מהחלק הראשון שבו הן מופיעות, ואל תכתבי אותן שוב מהחלק הבא).
המטרה: העתקה מדויקת של הקבלה ל-JSON. דיוק חשוב יותר ממהירות — קראי לאט ובעיון.

איך לקרוא:
1. עברי על הקבלה שורה אחרי שורה מלמעלה למטה, ואל תדלגי על אף שורת מוצר. הטקסט העברי נקרא מימין לשמאל; המחירים בדרך כלל בצד שמאל של השורה.
2. כותרת: שם הרשת/החנות, סניף או כתובת, תאריך (בישראל הסדר הוא יום/חודש/שנה — המירי ל-YYYY-MM-DD) ושעה (HH:MM).
3. שורת מוצר: ב-raw — הטקסט בדיוק כפי שמודפס; ב-name — שם ברור בעברית פשוטה, עם פענוח קיצורים כשבטוחה (למשל "גב' צהובה" → גבינה צהובה, "1ל" → 1 ליטר). אם לא בטוחה בפענוח — השאירי כמו שמודפס.
4. כמות: "2 X 5.90", "2 יח' * 5.90" או שורת המשך מתחת למוצר ("2 × 5.90 = 11.80") → qty 2, list_price 5.90, total 11.80. בלי שורת כמות — qty 1.
5. מוצר במשקל: "1.235 ק"ג X 12.90" → qty 1.235, unit "ק״ג", list_price 12.90 (מחיר לק"ג), total 15.93.
6. הנחות: שורות עם מינוס ("-3.90" או "3.90-"), "הנחה", "מבצע", "הנחת מועדון", "קופון", "2+1", "3 ב-10" — הן לא מוצרים. צרפי כל הנחה לשורת המוצר שמעליה (או למוצר שהיא מציינת): discount = סכום ההנחה (חיובי), total = סה״כ השורה אחרי ההנחה, price = total חלקי qty, deal = תיאור המבצע כמו שכתוב. הנחה כללית שלא שייכת למוצר מסוים (הנחה על כל הקנייה, קופון בסוף הקבלה) → general_discount (חיובי).
7. פיקדון / פקדון על בקבוקים → deposit_total (סכום כל הפיקדונות), לא מוצר. שקיות, עיגול אגורות ושאר חיובים שאינם מוצר → extras_total (עיגול יכול להיות שלילי). שורה מבוטלת (ביטול / החזרה / כמות שלילית) — אם המוצר בוטל, אל תכללי אותו ואל תכללי את שורת הביטול.
8. מוצר שמופיע בכמה שורות נפרדות בקבלה (בתוך אותו חלק, לא בגלל החפיפה בין חלקים) — כתבי כל שורה כפי שהיא מופיעה (לא לאחד, לא לדלג).
8א. שורות שאינן מוצרים — לעולם לא ב-items: "סה"כ", "סה"כ ביניים", "סה"כ לתשלום", מע"מ, אמצעי תשלום (אשראי, מזומן, ויזה, ישראכרט, כרטיס, תשלומים), עודף, נקודות/יתרת מועדון, מספר עסקה/קופה/קופאי, ושורת "סה"כ הנחות". שורת הנחה היא אף פעם לא מוצר נפרד ואף פעם לא עם סכום חיובי.
8ב. part = מספר החלק (התמונה) שממנו העתקת את השורה (1 אם יש תמונה אחת).
9. ברקוד: 7 עד 13 ספרות שמודפסות בשורת המוצר או מתחתיה (בישראל לרוב מתחיל ב-729) — העתיקי ספרה-ספרה. קוד פנימי קצר של החנות (1–6 ספרות) אינו ברקוד. אם לא ברור — השאירי ריק.
10. total בראש ה-JSON = הסכום הסופי לתשלום ("סה"כ לתשלום", "לתשלום", "סה"כ") — לא הסכום ששולם במזומן, לא העודף ולא המע"מ. discounts_total = "סה"כ הנחות" / "חסכת" אם מודפס.
11. אי-ודאות: לכל שורה, הכניסי ל-unsure את שמות השדות שאינך בטוחה בהם (מטושטש, חתוך, מקופל, ספרה דומה לאחרת): "name", "qty", "price", "total", "barcode", "brand". עדיף לסמן מאשר לנחש בשקט.
12. לעולם אל תמציאי מוצרים, מחירים או ברקודים. שורה שלא קריאה — כתבי מה שאפשר וסמני ב-unsure.
13. בדיקה עצמית לפני התשובה: בכל שורה qty × list_price − discount = total. וסכום כל ה-total של השורות + deposit_total + extras_total − general_discount = total של הקבלה (עד 0.10). אם לא — חזרי לתמונה וחפשי: שורה שחסרה, ספרה שנקראה לא נכון (3/8, 1/7, 5/6, 0/8), הנחה שלא צורפה, או שורה שנספרה פעמיים בגלל חפיפה. אם עדיין לא מסתדר — השאירי את מה שכתוב בקבלה (אל תשני מספרים רק כדי שיתאים) וכתבי ב-notes מה לא מסתדר.
14. מספרים — רק מספרים עם נקודה עשרונית (בלי ₪).

החזירי JSON בלבד, בלי שום טקסט נוסף, במבנה:
{"store": "שם הרשת/החנות", "branch": "סניף/כתובת", "date": "YYYY-MM-DD", "time": "HH:MM",
 "total": מספר, "discounts_total": מספר, "general_discount": מספר, "deposit_total": מספר, "extras_total": מספר,
 "items": [{"part": מספר החלק, "raw": "הטקסט כפי שמודפס", "name": "שם ברור", "brand": "חברה/מותג אם ידוע", "qty": מספר, "unit": "יח׳ או ק״ג",
            "list_price": מחיר ליחידה לפני הנחה, "discount": הנחה לשורה (0 אם אין), "price": מחיר ליחידה אחרי הנחה, "total": סה״כ לשורה אחרי הנחה,
            "barcode": "ספרות בלבד או ריק", "deal": "תיאור המבצע או ריק", "unsure": ["שמות שדות"]}],
 "notes": "הערות קצרות אם משהו לא ברור"}`;
// מבנה ה-JSON לקבלה (Gemini מחזיר בדיוק את המבנה הזה)
const RC_STR = { type: "STRING" }, RC_NUM = { type: "NUMBER" };
const RECEIPT_SCHEMA = {
  type: "OBJECT",
  properties: {
    store: RC_STR, branch: RC_STR, date: RC_STR, time: RC_STR,
    total: RC_NUM, discounts_total: RC_NUM, general_discount: RC_NUM, deposit_total: RC_NUM, extras_total: RC_NUM,
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          part: RC_NUM, raw: RC_STR, name: RC_STR, brand: RC_STR, qty: RC_NUM, unit: RC_STR, list_price: RC_NUM, discount: RC_NUM, price: RC_NUM, total: RC_NUM,
          barcode: RC_STR, deal: RC_STR, unsure: { type: "ARRAY", items: { type: "STRING", enum: ["name", "qty", "price", "total", "barcode", "brand"] } },
        },
        propertyOrdering: ["part", "raw", "name", "brand", "qty", "unit", "list_price", "discount", "price", "total", "barcode", "deal", "unsure"],
        required: ["name", "total"],
      },
    },
    notes: RC_STR,
  },
  propertyOrdering: ["store", "branch", "date", "time", "items", "discounts_total", "general_discount", "deposit_total", "extras_total", "total", "notes"],
  required: ["items"],
};
const PRODUCT_PROMPT = `זו תמונה של מוצר (אריזה, מדף או ברקוד). החזירי JSON בלבד, בלי שום טקסט נוסף, במבנה:
{"items": [{"name": "שם המוצר בעברית פשוטה כולל גודל (למשל: חלב 3% 1 ליטר)", "brand": "החברה / המותג", "barcode": "מספר הברקוד אם רואים אותו, רק ספרות", "category": "קטגוריה (מוצרי חלב, ירקות ופירות, בשר ועוף, לחמים, ניקיון, היגיינה, משקאות, יבשים, קפואים, ממתקים וחטיפים, אחר)", "qty": 1}]}
כללים: אם יש כמה מוצרים שונים בתמונה — פריט לכל מוצר. אל תמציאי ברקוד — אם לא רואים, השאירי ריק.`;
const LIST_PROMPT = `זו רשימת קניות (כתב יד, צילום או טקסט). החזירי JSON בלבד, בלי שום טקסט נוסף, במבנה:
{"items": [{"name": "שם המוצר בעברית פשוטה", "qty": "כמות אם כתובה (למשל 2 או 1 ק״ג)", "brand": "חברה אם כתובה", "note": "הערה אם יש"}]}
כללים: פענחי גם כתב יד וקיצורים (למשל "ע. שרי" = עגבניות שרי). אל תוסיפי מוצרים שלא כתובים. אם משהו לא קריא — כתבי את הניחוש הכי סביר והוסיפי "?" בסוף השם.`;
const splitDataUrl = (d: string) => { const m = d.match(/^data:(image\/[a-z]+);base64,(.*)$/s)!; return { mime: m[1], data: m[2] }; };
async function visionGemini(apiKey: string, model: string, prompt: string, imgs: string[], txt: string): Promise<string> {
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  imgs.forEach((d) => { const { mime, data } = splitDataUrl(d); parts.push({ inline_data: { mime_type: mime, data } }); });
  if (txt.trim()) parts.push({ text: "הטקסט:\n" + txt });
  const r = await geminiFetch(apiKey, model, { contents: [{ role: "user", parts }], generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: "application/json" } });
  if (r.ok) return partsText(r.data);
  throw Object.assign(new Error(`Gemini ${r.status} (${r.model}): ${r.error}`), { status: r.status });
}
async function visionClaude(apiKey: string, model: string, prompt: string, imgs: string[], txt: string, maxTokens = 8000, effort?: "high", timeoutMs = PROVIDER_TIMEOUT_MS): Promise<string> {
  const client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: effort ? 0 : 1 });
  const content: Anthropic.Messages.ContentBlockParam[] = [];
  imgs.forEach((d, i) => {
    const { mime, data } = splitDataUrl(d);
    if (imgs.length > 1) content.push({ type: "text", text: `חלק ${i + 1} מתוך ${imgs.length}:` });
    content.push({ type: "image", source: { type: "base64", media_type: mime as "image/jpeg" | "image/png" | "image/webp", data } });
  });
  content.push({ type: "text", text: prompt + (txt.trim() ? "\n\nהטקסט:\n" + txt : "") });
  const r = await client.messages.create({
    model, max_tokens: maxTokens, messages: [{ role: "user", content }],
    // קבלות: חשיבה מעמיקה — דיוק חשוב יותר ממהירות
    ...(effort && model !== "claude-haiku-4-5" ? { output_config: { effort } } : {}),
  });
  return r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
}

// ---------- קבלה: קריאה, בדיקה מול הסה״כ המודפס, ובדיקה שנייה כשלא מסתדר ----------
type RcItem = Record<string, unknown>;
type ReceiptCheck = { sum: number; total: number | null; diff: number | null; ok: boolean | null; verified: boolean; passes: number; bad_lines: number[]; model?: string; cleaned?: string[] };
type Receipt = { items: RcItem[]; check?: ReceiptCheck; [k: string]: unknown };
// מספר מהקבלה: גם "3.90-" (מינוס אחרי המספר, כמו בקבלות בישראל) וגם "12,90" (פסיק עשרוני) — בלי להפוך אותם ל-3.90 או ל-1290
const rnum = (x: unknown) => {
  if (typeof x === "number") return Number.isFinite(x) ? x : 0;
  let s = String(x ?? "").trim();
  if (/^-?\d+,\d{1,2}-?$/.test(s.replace(/[^\d,\-]/g, ""))) s = s.replace(",", ".");
  s = s.replace(/[^\d.\-]/g, "");
  if (/^[^-].*-$/.test(s)) s = "-" + s.slice(0, -1);
  const v = parseFloat(s); return Number.isFinite(v) ? v : 0;
};
const r2 = (x: number) => Math.round(x * 100) / 100;
function parseReceipt(raw: string): Receipt | null {
  const s = String(raw || "").replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    const p = JSON.parse(s.slice(a, b + 1));
    if (!p || typeof p !== "object" || !Array.isArray(p.items)) return null;
    p.items = p.items.filter((it: unknown) => it && typeof it === "object").slice(0, 200);
    delete p.check;
    return p as Receipt;
  } catch { return null; }
}
// סכום השורות (+ פיקדון ושאר חיובים − הנחה כללית) מול הסה״כ לתשלום, ושורות שבהן כמות × מחיר לא יוצא סה״כ השורה
function checkReceipt(r: Receipt, passes: number): ReceiptCheck {
  const bad: number[] = [];
  let sum = 0;
  r.items.forEach((it, i) => {
    const q = rnum(it.qty) || 1, pr = rnum(it.price), lp = rnum(it.list_price), disc = Math.abs(rnum(it.discount));
    const tot = it.total != null && it.total !== "" ? rnum(it.total) : r2(pr * q);
    sum += tot;
    const expect = lp ? lp * q - disc : pr ? pr * q : tot;
    if (tot > 0 && Math.abs(expect - tot) > 0.05 + 0.005 * q) bad.push(i);
  });
  sum = r2(sum + rnum(r.deposit_total) + rnum(r.extras_total) - Math.abs(rnum(r.general_discount)));
  const total = rnum(r.total) > 0 ? r2(rnum(r.total)) : null;
  const diff = total == null ? null : r2(total - sum);
  const ok = diff == null ? null : Math.abs(diff) <= 0.1;
  return { sum, total, diff, ok, verified: ok === true, passes, bad_lines: bad };
}
// ---------- ניקוי אחרי הקריאה: מה שהמודל מוסיף בטעות בקבלה ארוכה ----------
// שורות סיכום/תשלום שנקראו כמוצר, שורות הנחה שנקראו כמוצר בסכום חיובי, ושורות שנספרו פעמיים בחפיפה בין החלקים
const RC_NON_ITEM = /סה["״'׳]?כ|סך הכל|סכום כולל|לתשלום|מע["״'׳]?מ|עודף|מזומן|אשראי|ויזה|מאסטרקארד|ישראכרט|אמריקן אקספרס|דיינרס|תשלומים|כרטיס אשראי|כרטיס חיוב|נקודות (מועדון|שנצברו|שמומשו)|יתרת|מספר עסקה|^\s*(sub)?total\b|^\s*vat\b|^\s*change\b|^\s*cash\b/i;
const RC_DISC = /^\s*(הנחה|הנחת|מבצע|קופון|זיכוי|הטבה|חסכת|discount|coupon)/i;
const rcText = (x: unknown) => String(x ?? "").replace(/["״'׳`.,:*\-\s]/g, "").toLowerCase();
function rcSame(a: RcItem, b: RcItem): boolean {
  if (Math.abs(rnum(a.total) - rnum(b.total)) > 0.01 || Math.abs((rnum(a.qty) || 1) - (rnum(b.qty) || 1)) > 0.001) return false;
  const ba = String(a.barcode || "").replace(/\D/g, ""), bb = String(b.barcode || "").replace(/\D/g, "");
  if (ba && bb) return ba === bb;
  const ra = rcText(a.raw), rb = rcText(b.raw);
  if (ra && rb) return ra === rb;
  return rcText(a.name) !== "" && rcText(a.name) === rcText(b.name);
}
const rcSum = (r: Receipt, skip: Set<number> = new Set()) =>
  r2(r.items.reduce((s, it, i) => s + (skip.has(i) ? 0 : rnum(it.total)), 0) + rnum(r.deposit_total) + rnum(r.extras_total) - Math.abs(rnum(r.general_discount)));
function cleanReceipt(r: Receipt): string[] {
  const notes: string[] = [];
  // 1. מספרים: "3.90-" → ‎-3.90, ושורה בלי total מקבלת מחיר × כמות
  r.items.forEach((it) => {
    for (const k of ["qty", "list_price", "discount", "price", "total"]) if (it[k] != null && it[k] !== "") it[k] = rnum(it[k]);
    if ((it.total == null || it.total === "") && rnum(it.price)) it.total = r2(rnum(it.price) * (rnum(it.qty) || 1));
  });
  // 2. שורות שאינן מוצרים (סה״כ, מע״מ, תשלום, עודף) — מסירים כשאין סה״כ להשוואה, או כשבלעדיהן הסכום קרוב יותר לסה״כ המודפס
  const hasBc = (it: RcItem) => /\d{7,}/.test(String(it.barcode || ""));
  const nonIdx = new Set<number>();
  r.items.forEach((it, i) => {
    const raw = String(it.raw || "");
    // ב-raw בודקים רק כשאין בו "2 X 5.90" — שורת המשך של מוצר יכולה להכיל "סה״כ" לשורה
    if (!hasBc(it) && (RC_NON_ITEM.test(String(it.name || "")) || (!/\d\s*[xX×*]\s*\d/.test(raw) && RC_NON_ITEM.test(raw)))) nonIdx.add(i);
  });
  const total0 = rnum(r.total) > 0 ? r2(rnum(r.total)) : null;
  if (nonIdx.size && (total0 == null || Math.abs(total0 - rcSum(r, nonIdx)) <= Math.abs(total0 - rcSum(r)) + 0.01)) {
    r.items = r.items.filter((_, i) => !nonIdx.has(i));
    notes.push(`הוסרו ${nonIdx.size} שורות סיכום/תשלום שנקראו כמוצר`);
  }
  // 3. הנחות שנקראו כשורה נפרדת — מצרפים למוצר שמעליהן
  const kept: RcItem[] = [];
  let discMoved = 0;
  for (const it of r.items) {
    const tot = rnum(it.total), pr = rnum(it.price);
    if (!hasBc(it) && (tot < 0 || pr < 0 || (RC_DISC.test(String(it.name || "")) || RC_DISC.test(String(it.raw || ""))))) {
      const a = r2(Math.abs(tot || pr));
      discMoved++;
      if (!a) continue;
      const prev = kept[kept.length - 1];
      if (!prev) { r.general_discount = r2(Math.abs(rnum(r.general_discount)) + a); continue; }
      const q = rnum(prev.qty) || 1, lp = rnum(prev.list_price) || rnum(prev.price), pd = Math.abs(rnum(prev.discount));
      // ההנחה כבר צורפה למוצר (סה״כ השורה כבר אחרי ההנחה) — לא מורידים פעמיים
      if (pd && Math.abs(pd - a) < 0.01 && Math.abs(lp * q - pd - rnum(prev.total)) < 0.05) continue;
      prev.discount = r2(pd + a);
      prev.total = r2(rnum(prev.total) - a);
      prev.price = r2(rnum(prev.total) / q);
      if (!rnum(prev.list_price) && lp) prev.list_price = lp;
      prev.deal = [String(prev.deal || ""), String(it.name || it.raw || "")].filter(Boolean).join(" · ");
      continue;
    }
    kept.push(it);
  }
  r.items = kept;
  if (discMoved) notes.push(`${discMoved} שורות הנחה צורפו למוצר שמעליהן`);
  // 4. כפילויות: שורות שבסוף חלק אחד ושוב בראש החלק הבא (חפיפה בין התמונות), ושורות זהות צמודות
  const boundary = new Set<number>(), adjacent = new Set<number>();
  const parts = r.items.map((it) => Math.round(rnum(it.part)));
  for (let i = 1; i < r.items.length; i++) {
    if (parts[i] > 0 && parts[i - 1] > 0 && parts[i] === parts[i - 1] + 1) {
      // i = השורה הראשונה בחלק החדש. מוצאים את החפיפה הארוכה ביותר: m השורות האחרונות של החלק הקודם = m הראשונות של החדש
      let a0 = i; while (a0 > 0 && parts[a0 - 1] === parts[i - 1]) a0--;
      let b1 = i; while (b1 < r.items.length && parts[b1] === parts[i]) b1++;
      for (let m = Math.min(8, i - a0, b1 - i); m > 0; m--) {
        let all = true;
        for (let j = 0; j < m && all; j++) all = rcSame(r.items[i - m + j], r.items[i + j]);
        if (all) { for (let j = 0; j < m; j++) boundary.add(i + j); break; }
      }
    } else if (rcSame(r.items[i - 1], r.items[i]) && !boundary.has(i - 1)) adjacent.add(i);
  }
  const total = rnum(r.total) > 0 ? r2(rnum(r.total)) : null;
  const before = rcSum(r);
  let drop = new Set<number>();
  if (total == null) drop = boundary; // אין סה״כ להשוואה — שורה שחוזרת בדיוק בגבול בין שתי תמונות היא כמעט תמיד חפיפה
  else if (before - total > 0.1 && (boundary.size || adjacent.size)) {
    const excess = r2(before - total);
    const near = (set: Set<number>) => Math.abs(r2(before - rcSum(r, set)) - excess) <= 0.1;
    if (boundary.size && near(boundary)) drop = boundary;
    else {
      // מחפשים קבוצה של שורות כפולות שהסרתן מביאה בדיוק לסה״כ המודפס (המועמדות מעטות — חיפוש מלא)
      const cand = [...boundary, ...adjacent].slice(0, 14);
      let best: number[] | null = null;
      for (let mask = 1; mask < 1 << cand.length; mask++) {
        const pick = cand.filter((_, k) => mask & (1 << k));
        if (best && pick.length >= best.length) continue;
        if (near(new Set(pick))) best = pick;
      }
      if (best) drop = new Set(best);
      else if (boundary.size && Math.abs(total - rcSum(r, boundary)) < Math.abs(total - before)) drop = boundary;
    }
  }
  if (drop.size) {
    r.items = r.items.filter((_, i) => !drop.has(i));
    notes.push(`הוסרו ${drop.size} שורות שנקראו פעמיים (חפיפה בין התמונות)`);
  }
  return notes;
}
// הבדיקה השנייה מחזירה רק את התיקונים (לא את כל הקבלה מחדש) — הכתיבה של JSON ארוך היא רוב זמן ההמתנה,
// והקריאה עצמה זהה: אותן תמונות, אותו מודל ואותה חשיבה. השורות ממוספרות ב-"i" כדי שהתיקון יפנה לשורה הנכונה
const verifyPrompt = (r: Receipt, c: ReceiptCheck) => `${RECEIPT_PROMPT.slice(0, RECEIPT_PROMPT.indexOf("החזירי JSON בלבד"))}
בדיקה שנייה של אותה קבלה: בקריאה הראשונה (ה-JSON למטה, כל שורה ממוספרת ב-"i" מ-0) סכום השורות יצא ${c.sum}, אבל הסה״כ לתשלום שנקרא הוא ${c.total} (הפרש ${c.diff}).${c.bad_lines.length ? `\nבשורות האלה כמות × מחיר − הנחה לא שווה לסה״כ השורה: ${c.bad_lines.slice(0, 30).join(", ")}.` : ""}
הסתכלי שוב בתמונות, שורה אחרי שורה, ומצאי את הסיבה: שורה שחסרה, ספרה שנקראה לא נכון, הנחה שלא צורפה, שורה שנספרה פעמיים בגלל חפיפה בין החלקים, פיקדון/שקית, או סה״כ לתשלום שנקרא לא נכון.
תקני רק את מה שבאמת שגוי. אל תשני מספרים רק כדי שהסכום יתאים — רק לפי מה שמודפס.
החזירי JSON בלבד, רק עם התיקונים (בלי להעתיק שוב שורות נכונות), במבנה:
{"fix": [{"i": מספר השורה, ורק השדות שצריך לשנות בה, באותם שמות שדות}],
 "add": [{"after": מספר השורה שאחריה נוספת השורה החסרה (‎-1 = לפני הראשונה), וכל השדות של שורת מוצר}],
 "remove": [מספרי שורות שלא היו צריכות להיות (כפולות בחפיפה, שורת סיכום או הנחה שנקראה כמוצר)],
 "total": מספר — רק אם הסה״כ לתשלום נקרא לא נכון, "general_discount", "deposit_total", "extras_total" — רק אם משתנים, "notes": "מה תיקנת"}
אם הכל נכון — {"fix": [], "add": [], "remove": []}.
הקריאה הראשונה:
${JSON.stringify({ ...r, check: undefined, items: r.items.map((it, i) => ({ i, ...it })) }).slice(0, 40000)}`;
// מבנה התיקונים (Gemini מחזיר בדיוק את המבנה הזה)
const RC_ITEM_PROPS = (RECEIPT_SCHEMA.properties.items.items as { properties: Record<string, unknown> }).properties;
const RECEIPT_FIX_SCHEMA = {
  type: "OBJECT",
  properties: {
    fix: { type: "ARRAY", items: { type: "OBJECT", properties: { i: RC_NUM, ...RC_ITEM_PROPS }, required: ["i"] } },
    add: { type: "ARRAY", items: { type: "OBJECT", properties: { after: RC_NUM, ...RC_ITEM_PROPS }, required: ["after", "name", "total"] } },
    remove: { type: "ARRAY", items: RC_NUM },
    total: RC_NUM, general_discount: RC_NUM, deposit_total: RC_NUM, extras_total: RC_NUM, notes: RC_STR,
  },
  propertyOrdering: ["fix", "add", "remove", "total", "general_discount", "deposit_total", "extras_total", "notes"],
  required: ["fix", "add", "remove"],
};
// מחילים את התיקונים על הקריאה הראשונה → קבלה מלאה חדשה (הראשונה לא משתנה). תשובה בצורה הישנה (קבלה מלאה) — מתקבלת כמו שהיא
function applyReceiptFix(base: Receipt, raw: string): Receipt | null {
  const s = String(raw || "").replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  let p: Record<string, unknown>;
  try { p = JSON.parse(s.slice(a, b + 1)); } catch { return null; }
  if (!p || typeof p !== "object") return null;
  if (Array.isArray(p.items) && !Array.isArray(p.fix)) return parseReceipt(s.slice(a, b + 1));
  const arr = (x: unknown) => (Array.isArray(x) ? x : []) as unknown[];
  const n = base.items.length, idx = (x: unknown) => { const v = Math.round(rnum(x)); return Number.isFinite(v) ? v : NaN; };
  const items: RcItem[] = base.items.map((it) => ({ ...it }));
  arr(p.fix).forEach((f) => {
    if (!f || typeof f !== "object") return;
    const { i, ...rest } = f as RcItem; const k = idx(i);
    if (k >= 0 && k < n) Object.assign(items[k], rest);
  });
  const gone = new Set(arr(p.remove).map(idx).filter((k) => k >= 0 && k < n));
  const adds = new Map<number, RcItem[]>();
  arr(p.add).forEach((x) => {
    if (!x || typeof x !== "object") return;
    const { after, ...rest } = x as RcItem; const k = Math.max(-1, Math.min(n - 1, idx(after)));
    if (!Number.isFinite(k) || !String(rest.name ?? rest.raw ?? "").trim()) return;
    (adds.get(k) || adds.set(k, []).get(k)!).push(rest);
  });
  const out: RcItem[] = [...(adds.get(-1) || [])];
  items.forEach((it, k) => { if (!gone.has(k)) out.push(it); out.push(...(adds.get(k) || [])); });
  const r: Receipt = { ...base, items: out.slice(0, 200) };
  delete r.check;
  for (const k of ["total", "general_discount", "deposit_total", "extras_total"]) if (p[k] != null && p[k] !== "" && Number.isFinite(rnum(p[k]))) r[k] = p[k];
  if (typeof p.notes === "string" && p.notes.trim()) r.notes = [base.notes, p.notes].filter(Boolean).join(" · ");
  return r;
}
async function receiptGemini(apiKey: string, strong: string, flash: string, prompt: string, imgs: string[], txt: string, deadline: number, schema: Record<string, unknown> = RECEIPT_SCHEMA): Promise<{ text: string; model: string }> {
  const parts: Record<string, unknown>[] = [];
  imgs.forEach((d, i) => { const { mime, data } = splitDataUrl(d); if (imgs.length > 1) parts.push({ text: `חלק ${i + 1} מתוך ${imgs.length}:` }); parts.push({ inline_data: { mime_type: mime, data } }); });
  parts.push({ text: prompt + (txt.trim() ? "\n\nהטקסט:\n" + txt : "") });
  // בלי thinkingBudget:0 — כאן המודל צריך לחשוב. maxOutputTokens גבוה כי החשיבה נספרת בתוכו (אחרת JSON של קבלה ארוכה נחתך)
  const gen: Record<string, unknown> = { temperature: 0, maxOutputTokens: 32768, responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingBudget: 8192 } };
  const opts: GeminiOpts = { also: [flash], timeoutMs: 85000, deadline };
  let r = await geminiFetch(apiKey, strong, { contents: [{ role: "user", parts }], generationConfig: gen }, opts);
  // מודל שלא מקבל את מבנה ה-JSON — שוב בלי המבנה (ההנחיות מתארות אותו גם בטקסט)
  if (!r.ok && r.status === 400 && /schema/i.test(r.error)) {
    const { responseSchema: _s, ...g2 } = gen;
    r = await geminiFetch(apiKey, strong, { contents: [{ role: "user", parts }], generationConfig: g2 }, opts);
  }
  if (r.ok) return { text: partsText(r.data), model: r.model };
  throw Object.assign(new Error(`Gemini ${r.status} (${r.model}): ${r.error}`), { status: r.status });
}
async function readReceipt(provider: string, apiKey: string, cfg: Record<string, unknown>, imgs: string[], txt: string): Promise<Receipt | null> {
  const deadline = Date.now() + RECEIPT_DEADLINE_MS;
  const okName = (x: unknown) => /^[a-z0-9.\-]{3,60}$/.test(String(x || "")) ? String(x) : "";
  // Gemini: קודם המודל החזק (Pro), ואם הוא לא זמין/במכסה — המודל שנבחר בבק אופיס ושאר המודלים. אפשר לקבוע אחר ב-site_config.ai.receiptModel
  const strong = okName(cfg.receiptModel) || "gemini-2.5-pro", flash = okName(cfg.geminiModel) || "gemini-2.5-flash";
  const claudeModel = ALLOWED_MODELS.includes(String(cfg.model)) ? String(cfg.model) : "claude-opus-5";
  const ask = async (prompt: string, schema?: Record<string, unknown>) => provider === "gemini"
    ? await receiptGemini(apiKey, strong, flash, prompt, imgs, txt, deadline, schema)
    : { text: await visionClaude(apiKey, claudeModel, prompt, imgs, txt, 16000, "high", Math.max(10000, deadline - Date.now())), model: claudeModel };
  const first = await ask(RECEIPT_PROMPT);
  let best = parseReceipt(first.text);
  if (!best) return null;
  let cleaned = cleanReceipt(best);
  let chk = checkReceipt(best, 1), model = first.model;
  // הסכום לא מסתדר — עוד סבב אחד: התמונות + הקריאה הראשונה, ומבקשים לתקן רק את מה שלא נכון
  if (chk.ok === false && imgs.length && deadline - Date.now() > 30000) {
    try {
      const second = await ask(verifyPrompt(best, chk), RECEIPT_FIX_SCHEMA);
      const fixed = applyReceiptFix(best, second.text);
      if (fixed && fixed.items.length) {
        if (!(rnum(fixed.total) > 0) && chk.total != null) fixed.total = chk.total;
        const cl2 = cleanReceipt(fixed);
        const c2 = checkReceipt(fixed, 2);
        if (c2.ok || Math.abs(c2.diff ?? Infinity) < Math.abs(chk.diff ?? Infinity)) { best = fixed; chk = c2; model = second.model; cleaned = cl2; }
        else chk = { ...chk, passes: 2 };
      } else chk = { ...chk, passes: 2 };
    } catch (e) { console.error("receipt verify", e); }
  }
  best.check = { ...chk, model, ...(cleaned.length ? { cleaned } : {}) };
  return best;
}

// ---------- קבלה דיגיטלית מקישור ----------
// רק כתובות ציבוריות (לא שרתים פנימיים), עד 4 הפניות, עד 6MB ו-12 שניות
const LINK_MAX_BYTES = 6_000_000;
const privIp = (h: string) => {
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const x = h.replace(/^\[|\]$/g, "").toLowerCase();
  if (x.includes(":")) return x === "::" || x === "::1" || /^(fc|fd|fe8|fe9|fea|feb)/.test(x) || /^::ffff:/.test(x);
  return false;
};
async function linkHostOk(u: URL): Promise<boolean> {
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password || (u.port && u.port !== "443" && u.port !== "80")) return false;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || /(^|\.)(localhost|local|internal|lan|home|corp|supabase\.co|supabase\.in)$/.test(h) || privIp(h)) return false;
  // גם השם צריך להצביע לכתובת ציבורית (לא לשרת פנימי)
  try {
    const ips = [...await Deno.resolveDns(h, "A").catch(() => [] as string[]), ...await Deno.resolveDns(h, "AAAA").catch(() => [] as string[])];
    if (ips.some(privIp)) return false;
  } catch { /* אין בדיקת DNS בסביבה הזו */ }
  return true;
}
const b64 = (u8: Uint8Array) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const decodeEnt = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n) || 32)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16) || 32));
function htmlToText(html: string): string {
  // נתונים שמוטמעים בדף (אתרים שבונים את הקבלה בדפדפן שומרים אותה לפעמים כ-JSON בתוך הדף)
  const data = [...html.matchAll(/<script\b[^>]*type=["']?application\/(?:ld\+)?json["']?[^>]*>([\s\S]*?)<\/script>/gi), ...html.matchAll(/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim()).filter((x) => x.length > 40).join("\n").slice(0, 8000);
  const body = html.replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(tr|p|div|li|h[1-6]|table|section)>/gi, "\n").replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, " ");
  const t = decodeEnt(body).split("\n").map((l) => l.replace(/[ \t\u00a0]+/g, " ").replace(/^\s*\|\s*|\s*\|\s*$/g, "").trim()).filter(Boolean).join("\n");
  return (t + (data ? "\n\nנתונים מהדף:\n" + data : "")).slice(0, 16000);
}
type LinkResult = { ok: true; kind: "pdf" | "image" | "text"; data?: string; mime?: string; text?: string; host: string } | { ok: false; error: string; text: string };
async function fetchReceiptLink(raw: string, depth = 0): Promise<LinkResult> {
  const BAD = { ok: false as const, error: "bad_url", text: "הקישור לא תקין — מעתיקים את כל הקישור של הקבלה (מתחיל ב-https://)" };
  let u: URL;
  try { u = new URL(String(raw).trim().slice(0, 2000)); } catch { return BAD; }
  const ua = { "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36", "Accept": "text/html,application/pdf,image/*;q=0.9,*/*;q=0.5", "Accept-Language": "he-IL,he;q=0.9" };
  let res: Response | null = null;
  try {
    for (let hop = 0; hop < 5; hop++) {
      if (!(await linkHostOk(u))) return BAD;
      res = await fetch(u, { redirect: "manual", headers: ua, signal: AbortSignal.timeout(12000) });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) { await res.body?.cancel(); u = new URL(loc, u); res = null; continue; }
      break;
    }
  } catch (e) {
    console.error("receipt link", String(e).slice(0, 200));
    return { ok: false, error: "fetch_failed", text: "לא הצלחתי לפתוח את הקישור (האתר לא ענה). נסו שוב, או שמרו את הקבלה כ-PDF והעלו אותה." };
  }
  if (!res) return { ok: false, error: "redirects", text: "הקישור מפנה יותר מדי פעמים — נסו לפתוח אותו בדפדפן ולהעתיק את הכתובת הסופית." };
  if (res.status === 401 || res.status === 403) return { ok: false, error: "blocked", text: "האתר של הקבלה לא מאפשר לפתוח אותה מכאן (צריך כניסה לחשבון או שהוא חוסם). אפשר לשמור את הקבלה כ-PDF ולהעלות." };
  if (res.status === 404 || res.status === 410) return { ok: false, error: "gone", text: "הקבלה לא נמצאה בקישור — אולי פג התוקף שלו." };
  if (!res.ok) return { ok: false, error: "http_" + res.status, text: "האתר של הקבלה החזיר שגיאה (" + res.status + "). נסו שוב מאוחר יותר." };
  // קוראים עד 6MB
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = []; let n = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.length; if (n > LINK_MAX_BYTES) { await reader.cancel(); return { ok: false, error: "too_big", text: "הקובץ בקישור גדול מדי." }; }
      chunks.push(value);
    }
  }
  const buf = new Uint8Array(n); let off = 0; for (const c of chunks) { buf.set(c, off); off += c.length; }
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const host = u.hostname;
  const isPdf = ct.includes("application/pdf") || (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46);
  if (isPdf) return { ok: true, kind: "pdf", data: b64(buf), host };
  const img = ct.match(/^image\/(jpeg|png|webp)/);
  if (img) return { ok: true, kind: "image", data: b64(buf), mime: "image/" + img[1], host };
  if (!ct.includes("html") && !ct.includes("text") && !ct.includes("json") && ct) return { ok: false, error: "type", text: "בקישור יש קובץ שאני לא יודעת לקרוא (" + ct.split(";")[0] + ")." };
  const cs = (ct.match(/charset=([\w-]+)/) || [])[1] || (new TextDecoder("latin1").decode(buf.subarray(0, 3000)).match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1] || "utf-8";
  let html = "";
  try { html = new TextDecoder(cs).decode(buf); } catch { html = new TextDecoder().decode(buf); }
  if (ct.includes("json")) return { ok: true, kind: "text", text: html.slice(0, 16000), host };
  // הקבלה עצמה בתוך מסגרת / הפניה בדף / קישור ל-PDF — הולכים אליה פעם אחת
  if (depth < 1) {
    const next = (html.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+url=([^"'>\s]+)/i) || [])[1]
      || (html.match(/<iframe\b[^>]+src=["']([^"']+)["']/i) || [])[1]
      || (html.match(/href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i) || [])[1];
    const text0 = htmlToText(html);
    if (next && text0.length < 400) {
      try { const r = await fetchReceiptLink(new URL(decodeEnt(next), u).toString(), depth + 1); if (r.ok) return r; } catch { /* */ }
    }
  }
  const text = htmlToText(html);
  // דף שבונה את הקבלה רק בדפדפן (בלי מחירים בקוד של הדף) — אין מה לקרוא מכאן
  if (text.replace(/\s/g, "").length < 120 || !/\d+[.,]\d{2}/.test(text)) {
    return { ok: false, error: "no_content", text: "האתר של הקבלה בונה אותה רק בתוך הדפדפן, ולכן אי אפשר לקרוא אותה מהקישור. הדרך הכי מהירה: פותחים את הקישור בכרום ← ⋮ ← שיתוף ← הדפסה ← שמירה כ-PDF, ומעלים כאן את ה-PDF — כל הקבלה בקובץ אחד, בלי צילומי מסך." };
  }
  return { ok: true, kind: "text", text, host };
}
