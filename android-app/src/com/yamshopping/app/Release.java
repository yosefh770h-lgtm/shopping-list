package com.yamshopping.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * 🚀 איזו גרסה מגיעה לטלפון הזה (מ-1.9).
 * בבק אופיס ← "שחרור גרסה" אפשר לשחרר גרסה לכולם, רק למשתמשים מסוימים, או לכולם חוץ מכמה.
 * כאן מחברים את שני המקורות:
 * - download/app-version.json: הגרסה הכללית, מה שמי שמוריד מהאתר מקבל.
 * - השרת (app_release_for): מה ששוחרר לחשבון שמחובר בטלפון, ואילו גרסאות לדלג עליהן כי שוחררו רק לאחרים.
 * אם השרת לא עונה, למשל אין אינטרנט, נשארים עם הגרסה הכללית כמו קודם.
 */
final class Release {
    private Release() {}

    static final class Info {
        final String version, notes, url;
        Info(String version, String notes, String url) { this.version = version; this.notes = notes; this.url = url; }
    }

    /** הגרסה הכי חדשה שמותרת לטלפון הזה, ורק אם היא חדשה מהמותקנת. null = אין מה לעדכן. */
    static Info best(Context c) {
        PackageInfo me = Updater.self(c);
        String mine = me == null ? "0" : me.versionName;
        Info pub = null, offer = null;
        JSONArray block = new JSONArray();
        try {
            JSONObject v = new JSONObject(CheckJob.get(CheckJob.SITE + "/download/app-version.json"));
            String ver = v.optString("version", "");
            JSONArray n = v.optJSONArray("notes");
            StringBuilder b = new StringBuilder();
            for (int i = 0; n != null && i < n.length() && i < 4; i++) b.append(i > 0 ? " · " : "").append(n.optString(i));
            if (!ver.isEmpty()) pub = new Info(ver, b.toString(), Updater.APK_URL);
        } catch (Exception ignored) {
        }
        try {
            JSONObject body = new JSONObject().put("p_token", Inbox.token(c));
            JSONObject r = new JSONObject(CheckJob.post(CheckJob.SB_URL + "/rest/v1/rpc/app_release_for", body.toString()));
            JSONArray bl = r.optJSONArray("block");
            if (bl != null) block = bl;
            JSONObject o = r.optJSONObject("offer");
            if (o != null) {
                String url = safeUrl(o.optString("url", ""));
                if (url != null) offer = new Info(o.optString("version", ""), o.optString("notes", ""), url);
            }
        } catch (Exception ignored) {
        }
        if (pub != null && blocked(block, pub.version)) pub = null;
        Info pick = pub;
        if (offer != null && !offer.version.isEmpty() && (pick == null || CheckJob.newer(offer.version, pick.version))) pick = offer;
        if (pick == null || !CheckJob.newer(pick.version, mine)) { remember(c, null); return null; }
        remember(c, pick);
        return pick;
    }

    static boolean blocked(JSONArray block, String ver) {
        for (int i = 0; i < block.length(); i++) if (ver.equals(block.optString(i))) return true;
        return false;
    }

    /** רק קובץ APK מתיקיית ההורדות שלנו */
    static String safeUrl(String u) {
        if (u == null || u.isEmpty()) return null;
        if (u.startsWith("/")) u = CheckJob.SITE + u;
        Uri x = Uri.parse(u);
        String path = x.getPath();
        if (!"https".equals(x.getScheme()) || x.getHost() == null || !AppActivity.isOurHost(x.getHost())) return null;
        if (path == null || !path.matches("^/download/yamshopping(-[0-9.]{1,12})?\\.apk$") || x.getQuery() != null) return null;
        return u;
    }

    /** מה שמצאנו נשמר, ו"לעדכן" מוריד בדיוק את הקובץ הזה */
    static void remember(Context c, Info i) {
        SharedPreferences.Editor e = CheckJob.prefs(c).edit();
        if (i == null) e.remove("rel_ver").remove("rel_url").remove("rel_notes");
        else e.putString("rel_ver", i.version).putString("rel_url", i.url).putString("rel_notes", i.notes);
        e.apply();
    }

    /** הקובץ להורדה: מה שנמצא בבדיקה האחרונה, ואם לא נמצא כלום, הקובץ הכללי */
    static String downloadUrl(Context c) {
        String u = safeUrl(CheckJob.prefs(c).getString("rel_url", ""));
        return u == null ? Updater.APK_URL : u;
    }
}
