package com.yamshopping.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * 🔔 מעקב מבצעים גם כשהאפליקציה סגורה (מ-2.2).
 * האתר (js/085.js) שולח את ההגדרה דרך YamApp.setDealWatch: אילו סניפים, ועל מה לעקוב (מילים מוכנות, או null = כל המבצעים).
 * הבדיקה ברקע (CheckJob) קוראת פעם בשעה ל-/api/prices/deals, ומתריעה רק על מבצע שעוד לא ראינו — אותה השוואה של האתר (dwId).
 * כשהמעקב כאן פעיל, האתר לא בודק בעצמו, כדי שלא יגיעו שתי התראות על אותו מבצע.
 */
final class Deals {
    private Deals() {
    }

    static final String K_CFG = "dw_cfg", K_SEEN = "dw_seen", K_AT = "dw_at", K_BASE = "dw_base";

    /** מהאתר. {"on":false} מכבה */
    static void set(Context c, String json) {
        SharedPreferences.Editor e = CheckJob.prefs(c).edit();
        try {
            JSONObject o = new JSONObject(json == null ? "{}" : json);
            JSONArray st = o.optJSONArray("stores");
            if (!o.optBoolean("on") || st == null || st.length() == 0) {
                e.remove(K_CFG).remove(K_SEEN).remove(K_BASE).apply();
                return;
            }
            JSONObject cfg = new JSONObject();
            JSONArray keys = new JSONArray();
            for (int i = 0; i < st.length() && i < 8; i++) {
                String k = st.optString(i, "");
                if (k.matches("[A-Za-z0-9_:.-]{1,60}")) keys.put(k);
            }
            cfg.put("stores", keys);
            JSONArray w = o.optJSONArray("words");
            if (w != null) {
                JSONArray ws = new JSONArray();
                for (int i = 0; i < w.length() && i < 300; i++) {
                    String s = norm(w.optString(i, ""));
                    if (s.length() >= 2 && s.length() <= 60) ws.put(s);
                }
                cfg.put("words", ws);
            }
            cfg.put("exclude", o.optString("exclude", "").replaceAll("[^A-Za-z0-9_,:.-]", ""));
            String who = o.optString("who", "");
            if (who.matches("[ug]:[0-9a-zA-Z-]{1,60}")) cfg.put("who", who);
            String old = CheckJob.prefs(c).getString(K_CFG, "");
            e.putString(K_CFG, cfg.toString());
            // בפעם הראשונה מקבלים מהאתר מה הוא כבר ראה — כדי לא להודיע שוב על אותם מבצעים
            if (old.isEmpty()) {
                JSONObject seen = o.optJSONObject("seen");
                if (seen != null) e.putString(K_SEEN, seen.toString());
                e.putBoolean(K_BASE, o.optBoolean("base"));
            }
            e.apply();
        } catch (Exception ignored) {
        }
    }

    static boolean on(Context c) {
        return !CheckJob.prefs(c).getString(K_CFG, "").isEmpty();
    }

    /** מ-CheckJob: פעם בשעה בערך */
    static void check(Context c) {
        SharedPreferences p = CheckJob.prefs(c);
        String raw = p.getString(K_CFG, "");
        if (raw.isEmpty()) return;
        long t = System.currentTimeMillis(), last = p.getLong(K_AT, 0);
        if (t - last < 55 * 60 * 1000L && t >= last) return;
        p.edit().putLong(K_AT, t).apply();
        try {
            JSONObject cfg = new JSONObject(raw);
            JSONArray keys = cfg.getJSONArray("stores");
            StringBuilder sk = new StringBuilder();
            for (int i = 0; i < keys.length(); i++) sk.append(i > 0 ? "," : "").append(keys.getString(i));
            List<String> words = null;
            JSONArray w = cfg.optJSONArray("words");
            if (w != null) {
                words = new ArrayList<>();
                for (int i = 0; i < w.length(); i++) words.add(w.getString(i));
                if (words.isEmpty()) return;
            }
            String url = CheckJob.SITE + "/api/prices/deals?per=25&stores=" + URLEncoder.encode(sk.toString(), "UTF-8")
                    + (cfg.optString("exclude").isEmpty() ? "" : "&exclude=" + URLEncoder.encode(cfg.optString("exclude"), "UTF-8"));
            HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
            con.setConnectTimeout(15000);
            con.setReadTimeout(25000);
            if (!cfg.optString("who").isEmpty()) con.setRequestProperty("X-Yam-Who", cfg.optString("who"));
            JSONObject d = new JSONObject(CheckJob.read(con));
            JSONObject seenAll = new JSONObject(p.getString(K_SEEN, "{}"));
            boolean base = p.getBoolean(K_BASE, false);
            JSONArray stores = d.optJSONArray("stores");
            for (int i = 0; stores != null && i < stores.length(); i++) {
                JSONObject x = stores.optJSONObject(i);
                if (x == null) continue;
                JSONObject s = x.optJSONObject("store");
                String k = s == null ? "" : s.optString("store", "");
                if (k.isEmpty()) continue;
                LinkedHashSet<String> seen = new LinkedHashSet<>();
                JSONArray sa = seenAll.optJSONArray(k);
                for (int j = 0; sa != null && j < sa.length(); j++) seen.add(sa.optString(j));
                List<JSONObject> fresh = new ArrayList<>();
                JSONArray deals = x.optJSONArray("deals");
                for (int j = 0; deals != null && j < deals.length(); j++) {
                    JSONObject pr = deals.optJSONObject(j);
                    if (pr == null || !match(pr.optString("name"), words)) continue;
                    String id = id(pr);
                    if (!seen.contains(id)) fresh.add(pr);
                    seen.remove(id);
                    seen.add(id);
                }
                JSONArray keep = new JSONArray();
                List<String> all = new ArrayList<>(seen);
                for (int j = Math.max(0, all.size() - 150); j < all.size(); j++) keep.put(all.get(j));
                seenAll.put(k, keep);
                // בפעם הראשונה על "כל המבצעים" — רק זוכרים מה כבר יש, כדי לא להציף
                if (fresh.isEmpty() || (!base && words == null)) continue;
                String chain = s.optString("chain_name", s.optString("chain", ""));
                String name = s.optString("name", ""), city = s.optString("city", "");
                String place = chain + (!name.isEmpty() && !name.equals(city) ? " " + name : "") + (city.isEmpty() ? "" : " · " + city);
                String title = fresh.size() == 1 ? fresh.get(0).optString("name") + " במבצע ב" + chain : fresh.size() + " מבצעים חדשים ב" + chain;
                StringBuilder body = new StringBuilder(place).append(": ");
                for (int j = 0; j < fresh.size() && j < 3; j++) {
                    JSONObject pr = fresh.get(j);
                    String txt = pr.optString("text", "");
                    body.append(j > 0 ? " · " : "").append(txt.isEmpty() ? pr.optString("name") : txt);
                    int pct = pr.optInt("pct", 0);
                    if (pct > 0) body.append(" (−").append(pct).append("%)");
                }
                if (fresh.size() > 3) body.append(" ועוד");
                Notifier.showUrl(c, Notifier.CH_GENERAL, 7700 + (k.hashCode() & 0xff), title, body.toString(), CheckJob.SITE + "/?tab=neardeals");
            }
            p.edit().putString(K_SEEN, seenAll.toString()).putBoolean(K_BASE, true).apply();
        } catch (Exception ignored) {
        }
    }

    // ---------- כמו באתר (js/085.js) ----------

    static String norm(String s) {
        return s == null ? "" : s.replaceAll("['’`׳\"]", "").replaceAll("\\s+", " ").trim();
    }

    static boolean match(String name, List<String> words) {
        if (words == null) return true;
        String n = norm(name);
        for (String x : words) {
            if (n.contains(x)) return true;
            boolean all = true;
            for (String t : x.split(" ")) if (t.isEmpty() || !n.contains(t)) { all = false; break; }
            if (all) return true;
        }
        return false;
    }

    /** dwId של האתר: hash של "קוד|מחיר|כמות|עד" — אותו חישוב בדיוק, כדי שמה שהאתר כבר ראה לא יחזור */
    static String id(JSONObject p) {
        String code = js(p.opt("code"));
        if (code.isEmpty()) code = js(p.opt("name"));
        String qty = js(p.opt("qty"));
        if (qty.isEmpty() || qty.equals("0") || qty.equals("false")) qty = "1";
        String s = code + "|" + js(p.opt("deal_price")) + "|" + qty + "|" + js(p.opt("until"));
        int h = 5381;
        for (int i = 0; i < s.length(); i++) h = (h << 5) + h + s.charAt(i);
        return Long.toString(h & 0xffffffffL, 36);
    }

    /** כמו String(x) ב-JavaScript, ל-null/מחרוזת/מספר */
    static String js(Object o) {
        if (o == null || o == JSONObject.NULL) return "";
        if (o instanceof Double) {
            double d = (Double) o;
            if (d == Math.rint(d) && !Double.isInfinite(d)) return Long.toString((long) d);
        }
        return String.valueOf(o);
    }
}
