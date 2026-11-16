// חיבור קופה (POS) לחנות — Supabase Edge Function בשם pos.
// הקופה (או כל מערכת) שולחת מכירות ומלאי עם המפתח של החנות (בכותרת x-store-key), והאתר מעדכן את המלאי בלייב.
//   POST  { "sales": [{ "barcode": "729...", "name": "חלב", "qty": 2, "price": 5.9 }] }        ← מכירות (מוריד מהמלאי)
//   POST  { "stock": [{ "barcode": "729...", "name": "חלב", "qty": 40, "price": 5.9, "min_qty": 10, "mode": "set" }] } ← מלאי ("set" = כמות מדויקת, "add" = הוספה)
//   GET   ← מחזיר את כל המלאי של החנות (JSON)
//   POST  { "machines": [{ "id": "מזהה המסופון", "sales": [{ "slot": "A1", "qty": 1, "price": 5, "payment": "card" }],
//           "slots": [{ "slot": "A1", "product": "קולה", "qty": 8, "cap": 10, "price": 5 }], "refill": true, "cash": 120, "status": "ok", "message": "" }] }
//         ← מכונות אוטומטיות (פחיות, חטיפים, קפה...): מכירה מורידה מהתא, מלאי/מילוי מעדכן, תקלה שולחת התראה לבעל העסק.
//           "id" = מזהה המסופון שהוגדר למכונה באתר (האתר העסקי ← 🎰 מכונות ← 🔌 חיבור למסופון).
// חשוב: בהגדרות הפונקציה לכבות "Verify JWT" (הקופה מזדהה עם המפתח של החנות).
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-store-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const sha256 = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");
const num = (v: unknown) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
const bc = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(0, 20);
const txt = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
// גבולות סבירים לכמויות ומחירים (מספר סופי בלבד, לא NaN/Infinity, לא ענקי)
const MAX_QTY = 1e6, MAX_PRICE = 99999.99, MAX_SALE_QTY = 99999; // מכירה: כמו האילוץ במסד (abs(qty) < 100000)
const okQty = (n: number | null): n is number => n !== null && Number.isFinite(n) && Math.abs(n) <= MAX_QTY;
const okPrice = (n: number | null): n is number => n !== null && Number.isFinite(n) && n >= 0 && n <= MAX_PRICE;
const MAX_BODY = 2 * 1024 * 1024; // 2MB לבקשה

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const key = (req.headers.get("x-store-key") || (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")).trim();
  if (!/^yam_[0-9a-f]{64}$/.test(key)) return json({ error: "missing or bad x-store-key" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: k } = await admin.from("store_api_keys").select("chain").eq("key_hash", await sha256(key)).maybeSingle();
  if (!k) return json({ error: "unknown key" }, 401);
  const chain = k.chain as string;
  await admin.from("store_api_keys").update({ last_used: new Date().toISOString() }).eq("chain", chain);

  if (req.method === "GET") {
    const { data } = await admin.from("store_inventory").select("name, barcode, category, unit, price, qty, min_qty, visible, updated_at").eq("chain", chain).order("name").limit(10000);
    return json({ chain, items: data || [] });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);
  // תקרת גודל לבקשה (לא סומכים רק על Content-Length — סופרים גם את מה שבאמת הגיע)
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) return json({ error: "too_large", max_bytes: MAX_BODY }, 413);
  let body: { sales?: Record<string, unknown>[]; stock?: Record<string, unknown>[]; machines?: Record<string, unknown>[]; request_id?: unknown } = {};
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: "too_large", max_bytes: MAX_BODY }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
  } catch { return json({ error: "bad_json" }, 400); }

  // מניעת כפילויות: קופה ששולחת שוב את אותה בקשה (למשל אחרי ניתוק) עם אותו request_id — לא תוריד מלאי פעמיים.
  // משתמש בטבלה pos_requests אם קיימת במסד; אם לא — ממשיכים כרגיל (בלי הגנת כפילויות).
  const reqId = txt(body.request_id, 100);
  if (reqId) {
    const { error: dupErr } = await admin.from("pos_requests").insert({ chain, request_id: reqId });
    if (dupErr) {
      if (dupErr.code === "23505") return json({ ok: true, duplicate: true, chain, request_id: reqId });
      console.error("pos_requests unavailable — no idempotency", dupErr.code, dupErr.message);
    }
  }
  const out = { chain, sales: 0, stock_updated: 0, stock_added: 0, machines: 0, errors: [] as string[] };

  // ---------- מכונות אוטומטיות: עדכון בזמן אמת מהמסופון ----------
  for (const m of (Array.isArray(body.machines) ? body.machines : []).slice(0, 200)) {
    const ext = txt(m.id ?? m.terminal ?? m.device, 60);
    if (!ext) { out.errors.push("machine without id"); continue; }
    const { data: row } = await admin.from("biz_machines").select("id, name, slots, cash").eq("chain", chain).eq("external_id", ext).maybeSingle();
    if (!row) { out.errors.push("unknown machine id: " + ext + " — set it in the site (🎰 מכונות ← 🔌 חיבור למסופון)"); continue; }
    type Slot = { code?: string; product?: string; price?: number | null; cap?: number; qty?: number };
    const slots: Slot[] = Array.isArray(row.slots) ? row.slots as Slot[] : [];
    const find = (code: string) => { let x = slots.find((z) => String(z.code || "").toLowerCase() === code.toLowerCase()); if (!x) { x = { code, product: "", price: null, cap: 0, qty: 0 }; slots.push(x); } return x; };
    let cash = Number(row.cash) || 0; const logs: Record<string, unknown>[] = [];
    for (const st of (Array.isArray(m.slots) ? m.slots as Record<string, unknown>[] : []).slice(0, 200)) {
      const code = txt(st.slot ?? st.code, 10); if (!code) continue; const x = find(code);
      if (st.product !== undefined) x.product = txt(st.product, 40);
      const q = num(st.qty), c = num(st.cap ?? st.capacity), pr = num(st.price);
      if (okQty(c) && c >= 0) x.cap = c; if (okQty(q) && q >= 0) x.qty = q; if (okPrice(pr)) x.price = pr;
    }
    if (m.refill === true) { let units = 0; slots.forEach((x) => { if (x.product && Number(x.cap) > Number(x.qty)) { units += Number(x.cap) - Number(x.qty); x.qty = Number(x.cap); } }); logs.push({ kind: "refill", detail: { units, source: "terminal" } }); }
    for (const sl of (Array.isArray(m.sales) ? m.sales as Record<string, unknown>[] : []).slice(0, 1000)) {
      const code = txt(sl.slot ?? sl.code, 10); const q = num(sl.qty) ?? 1; const pr0 = num(sl.price);
      if (!okQty(q) || q === 0) { out.errors.push(ext + ": bad sale qty"); continue; }
      const pr = pr0 === null ? null : okPrice(pr0) ? pr0 : null;
      const x = code ? find(code) : null;
      if (x) x.qty = Math.max(0, Number(x.qty || 0) - q);
      if (String(sl.payment || "") === "cash" && pr) cash += pr * q;
      logs.push({ kind: "sale", detail: { slot: code, product: x?.product || txt(sl.product, 40), qty: q, price: pr ?? x?.price ?? null, payment: txt(sl.payment, 10), source: "terminal" } });
    }
    const cashNow = m.cash === undefined || m.cash === null || m.cash === "" ? null : num(m.cash); if (okQty(cashNow) && cashNow >= 0) cash = cashNow;
    const status = txt(m.status, 20), msg = txt(m.message, 200);
    const patch: Record<string, unknown> = { slots, cash: Math.round(cash * 100) / 100, last_seen: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (status) patch.status = status; if (m.message !== undefined) patch.status_msg = msg;
    if (m.refill === true) patch.last_refill = new Date().toISOString();
    if (status === "error") logs.push({ kind: "fix", detail: { message: msg, source: "terminal" } });
    const { error } = await admin.from("biz_machines").update(patch).eq("id", row.id);
    if (error) { out.errors.push(ext + ": " + error.message); continue; }
    if (logs.length) await admin.from("biz_machine_log").insert(logs.slice(0, 500).map((l) => ({ ...l, machine_id: row.id, chain, by_name: "🔌 מסופון" })));
    out.machines++;
  }

  const { data: inv } = await admin.from("store_inventory").select("id, name, barcode").eq("chain", chain).limit(20000);
  const byBc = new Map<string, string>(), byName = new Map<string, string>();
  (inv || []).forEach((i) => { if (i.barcode) byBc.set(i.barcode, i.id); byName.set(String(i.name).toLowerCase(), i.id); });

  for (const s of (Array.isArray(body.stock) ? body.stock : []).slice(0, 5000)) {
    const name = txt(s.name, 80), code = bc(s.barcode), qty = num(s.qty), price = num(s.price), minq = num(s.min_qty);
    const add = s.mode === "add";
    // כמות: מספר סופי עד מיליון; ב"set" (כמות מדויקת) — לא שלילית. ב"add" מותר שלילי (תיקון/החזרה)
    if (qty !== null && (!okQty(qty) || (!add && qty < 0))) { out.errors.push((name || code) + ": bad qty"); continue; }
    const id = (code && byBc.get(code)) || (name && byName.get(name.toLowerCase()));
    const patch: Record<string, unknown> = {};
    if (okPrice(price)) patch.price = price;
    if (okQty(minq) && minq >= 0) patch.min_qty = minq;
    if (s.category) patch.category = txt(s.category, 30);
    if (s.unit) patch.unit = txt(s.unit, 20);
    if (code) patch.barcode = code;
    if (id) {
      if (name) patch.name = name;
      if (qty !== null && add) {
        // הוספה לכמות: אין במסד פונקציה של qty = qty + x, לכן "השוואה והחלפה" — מעדכנים רק אם הכמות לא השתנתה
        // מאז שקראנו אותה, ואם השתנתה (עדכון במקביל) — קוראים שוב ומנסים עוד פעם (עד 5). כך לא הולכת לאיבוד הוספה.
        let done = false, lastErr = "";
        for (let tries = 0; tries < 5 && !done; tries++) {
          const { data: cur, error: ce } = await admin.from("store_inventory").select("qty").eq("id", id).single();
          if (ce) { lastErr = ce.message; break; }
          const was = Number(cur?.qty || 0), next = Math.max(-MAX_QTY, Math.min(MAX_QTY, was + qty));
          let q = admin.from("store_inventory").update({ ...patch, qty: next }).eq("id", id);
          q = cur?.qty === null || cur?.qty === undefined ? q.is("qty", null) : q.eq("qty", cur.qty);
          const { data: upd, error } = await q.select("id");
          if (error) { lastErr = error.message; break; }
          done = !!upd?.length;
        }
        if (done) out.stock_updated++; else out.errors.push((name || code) + ": " + (lastErr || "busy, retry"));
        continue;
      }
      if (qty !== null) patch.qty = qty;
      const { error } = await admin.from("store_inventory").update(patch).eq("id", id);
      if (error) out.errors.push((name || code) + ": " + error.message); else out.stock_updated++;
    } else if (name) {
      const { data: row, error } = await admin.from("store_inventory").insert({ chain, name, qty: qty ?? 0, ...patch }).select("id").single();
      if (error) out.errors.push(name + ": " + error.message);
      else { out.stock_added++; if (code) byBc.set(code, row.id); byName.set(name.toLowerCase(), row.id); }
    } else out.errors.push("שורת מלאי בלי שם וברקוד לא מוכר");
  }

  // מכירות: כמות סופית, לא 0, בגבולות האילוץ במסד (שורה אחת לא תקינה הייתה מפילה קבוצה שלמה של 500)
  const sales = [];
  for (const s of (Array.isArray(body.sales) ? body.sales : []).slice(0, 5000)) {
    const q = num(s.qty) ?? 1, pr = num(s.price), name = txt(s.name, 80), code = bc(s.barcode);
    if (!name && !code) continue;
    const qr = Math.round(q * 100) / 100; // העמודה במסד: 2 ספרות אחרי הנקודה
    if (qr === 0) continue; // כמו קודם: שורה בלי כמות פשוט מדלגים
    if (Math.abs(qr) > MAX_SALE_QTY) { out.errors.push((name || code) + ": bad sale qty"); continue; }
    if (pr !== null && !okPrice(pr)) { out.errors.push((name || code) + ": bad price"); continue; }
    sales.push({ chain, name, barcode: code, qty: qr, price: pr, source: "api", created_by: null });
  }
  for (let i = 0; i < sales.length; i += 500) {
    const { error } = await admin.from("store_sales").insert(sales.slice(i, i + 500));
    if (error) out.errors.push("sales: " + error.message); else out.sales += Math.min(500, sales.length - i);
  }
  return json({ ok: out.errors.length === 0, ...out, errors: out.errors.slice(0, 20) });
});
