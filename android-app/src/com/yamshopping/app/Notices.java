package com.yamshopping.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * 📲 הודעות שצוות האתר שולח מהבק אופיס (מ-1.9): לכולם, רק למשתמשים מסוימים, או לכולם חוץ מכמה.
 * נבדק ברקע בכל בדיקה (כל רבע שעה), גם כשהאפליקציה סגורה. הטלפון שולח רק את המזהה הסודי שלו,
 * והשרת מחזיר רק הודעות שמיועדות לו, עם השם של המשתמש במקום {שם}.
 */
final class Notices {
    private Notices() {}

    static void check(Context c) {
        try {
            SharedPreferences p = CheckJob.prefs(c);
            String since = p.getString("notice_seen", "");
            // בפעם הראשונה לא מראים הודעות ישנות — רק מה שיישלח מעכשיו
            if (since.isEmpty()) { p.edit().putString("notice_seen", CheckJob.iso(new java.util.Date())).apply(); return; }
            JSONObject body = new JSONObject().put("p_token", Inbox.token(c)).put("p_since", since);
            JSONArray a = new JSONArray(CheckJob.post(CheckJob.SB_URL + "/rest/v1/rpc/app_notices_for", body.toString()));
            String newest = since;
            for (int i = 0; i < a.length(); i++) {
                JSONObject n = a.getJSONObject(i);
                String at = n.optString("created_at", "");
                if (at.compareTo(newest) > 0) newest = at;
                String url = n.optString("url", "");
                url = url.startsWith("/") && !url.startsWith("//") ? CheckJob.SITE + url : CheckJob.SITE + "/";
                Notifier.showUrl(c, Notifier.CH_NOTICES, 6660 + (Math.abs(n.optString("id").hashCode()) % 30),
                        n.optString("title", "ים שופינג"), n.optString("body", ""), url);
            }
            if (!newest.equals(since)) p.edit().putString("notice_seen", newest).apply();
        } catch (Exception ignored) {
        }
    }
}
