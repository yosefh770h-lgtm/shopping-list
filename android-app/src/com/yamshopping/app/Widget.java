package com.yamshopping.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * 🏠 וידג'ט הרשימה במסך הבית (מ-2.2). רק תצוגה: שם הרשימה הפעילה, עד 4 מוצרים שעוד לא נקנו ו"ועוד N".
 * לחיצה פותחת את האפליקציה על הרשימה, ו-"+" פותח אותה עם שורת ההוספה (?a=add, js/034.js).
 * את התוכן שולח האתר בכל שמירה (YamApp.setWidget, js/088-native22.js), והוא נשמר כאן כדי להופיע גם כשהאפליקציה סגורה.
 */
public class Widget extends AppWidgetProvider {
    static final String K = "widget";
    static final int[] ITEMS = {R.id.w_i1, R.id.w_i2, R.id.w_i3, R.id.w_i4};

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        draw(c, m, ids);
    }

    /** מהאתר */
    static void set(Context c, String json) {
        if (json == null || json.length() > 4000) return;
        CheckJob.prefs(c).edit().putString(K, json).apply();
        refresh(c);
    }

    static void refresh(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        if (m == null) return;
        int[] ids = m.getAppWidgetIds(new ComponentName(c, Widget.class));
        if (ids != null && ids.length > 0) draw(c, m, ids);
    }

    static void draw(Context c, AppWidgetManager m, int[] ids) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_list);
        try {
            JSONObject o = new JSONObject(CheckJob.prefs(c).getString(K, "{}"));
            String title = o.optString("title", "");
            if (!title.isEmpty()) v.setTextViewText(R.id.w_title, "🛒 " + title);
            JSONArray a = o.optJSONArray("items");
            int n = a == null ? 0 : a.length();
            for (int i = 0; i < ITEMS.length; i++) {
                if (i < n) {
                    v.setTextViewText(ITEMS[i], "○  " + a.optString(i));
                    v.setViewVisibility(ITEMS[i], View.VISIBLE);
                } else v.setViewVisibility(ITEMS[i], View.GONE);
            }
            int more = o.optInt("more", 0);
            if (more > 0) v.setTextViewText(R.id.w_more, o.optString("moreTxt", "ועוד") + " " + more + "…");
            else if (n == 0 && o.has("items")) v.setTextViewText(R.id.w_more, o.optString("empty", "הרשימה ריקה 🎉"));
            else v.setTextViewText(R.id.w_more, "");
        } catch (Exception ignored) {
        }
        v.setOnClickPendingIntent(R.id.w_root, open(c, CheckJob.SITE + "/?source=widget", 7801));
        v.setOnClickPendingIntent(R.id.w_add, open(c, CheckJob.SITE + "/?source=widget&a=add", 7802));
        m.updateAppWidget(ids, v);
    }

    static PendingIntent open(Context c, String url, int req) {
        Intent i = new Intent(c, AppActivity.class);
        i.setAction(Intent.ACTION_VIEW);
        i.setData(Uri.parse(url));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
