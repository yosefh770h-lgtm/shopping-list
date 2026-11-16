package com.yamshopping.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.webkit.WebView;

import org.json.JSONArray;

/**
 * 2.0: התראה עם כפתורים — אפשר לפעול ישר מתוך ההתראה, בלי לפתוח קודם את האפליקציה.
 * "סמן כנקרא" — ההתראה נעלמת, והפעמון באתר מסומן כנקרא בפעם הבאה שנכנסים.
 * "פתח רשימה" — להתראות על הרשימה (ערב שבת, יום קניות וכו').
 * "הוסף לרשימה" — למבצע חדש ברשת שעוקבים אחריה: המוצר נשמר בטלפון ומתווסף לרשימה כשנכנסים.
 */
final class BellActions {
    static final String ACTION_READ = "com.yamshopping.app.BELL_READ", ACTION_ADD = "com.yamshopping.app.BELL_ADD";
    static final String LIST_URL = CheckJob.SITE + "/?tab=list";
    static boolean applying;

    private BellActions() {}

    static boolean listRelated(String tag, String url) {
        if (url != null && url.contains("tab=list")) return true;
        if (tag == null) return false;
        for (String p : new String[]{"shb", "shopday:", "due:", "order:", "exp45:"}) if (tag.startsWith(p)) return true;
        return false;
    }

    /** מבצע חדש ברשת שעוקבים אחריה (לא "מבצע על" מוצר שכבר ברשימה) — אפשר להוסיף אותו לרשימה */
    static boolean addable(String tag, String title, String body) {
        return tag != null && tag.startsWith("deal:") && title != null && !title.contains("מבצע על") && !title.contains("📢")
                && body != null && body.trim().length() > 1 && body.trim().length() <= 80;
    }

    static void show(Context c, int id, String title, String body, String url, String tag) {
        show(c, Notifier.CH_GENERAL, id, title, body, url, tag);
    }

    @SuppressWarnings("deprecation")
    static void show(Context c, String channel, int id, String title, String body, String url, String tag) {
        if (!Notifier.allowed(c)) return;
        Notifier.channels(c);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        PendingIntent open = PendingIntent.getActivity(c, id, openIntent(c, url), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Icon none = Icon.createWithResource(c, c.getApplicationInfo().icon);

        Notification.Action first;
        if (addable(tag, title, body)) {
            Intent ai = new Intent(c, ActionReceiver.class).setAction(ACTION_ADD).putExtra("id", id).putExtra("tag", tag).putExtra("item", body.trim());
            first = new Notification.Action.Builder(none, "הוסף לרשימה",
                    PendingIntent.getBroadcast(c, id * 2 + 1, ai, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build();
        } else if (listRelated(tag, url)) {
            first = new Notification.Action.Builder(none, "פתח רשימה",
                    PendingIntent.getActivity(c, id + 50000, openIntent(c, LIST_URL), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build();
        } else {
            first = new Notification.Action.Builder(none, "פתח", open).build();
        }
        Intent ri = new Intent(c, ActionReceiver.class).setAction(ACTION_READ).putExtra("id", id).putExtra("tag", tag == null ? "" : tag);
        Notification.Action read = new Notification.Action.Builder(none, "סמן כנקרא",
                PendingIntent.getBroadcast(c, id * 2, ri, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build();

        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, channel) : new Notification.Builder(c);
        b.setSmallIcon(c.getApplicationInfo().icon)
                .setContentTitle(Notifier.clip(title, 120))
                .setContentText(Notifier.clip(body, 300))
                .setStyle(new Notification.BigTextStyle().bigText(Notifier.clip(body, 600)))
                .setColor(Color.parseColor(AppActivity.BRAND))
                .setShowWhen(true)
                .setAutoCancel(true)
                .setContentIntent(open)
                .addAction(first)
                .addAction(read);
        try {
            nm.notify(id, b.build());
        } catch (SecurityException ignored) {
        }
    }

    static Intent openIntent(Context c, String url) {
        Intent i = new Intent(c, AppActivity.class).setAction(Intent.ACTION_VIEW);
        Uri u = url == null || url.isEmpty() ? null : Uri.parse(url);
        if (u != null && AppActivity.isOurPage(u)) i.setData(u);
        return i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }

    /** הכפתורים נלחצו (ActionReceiver) — בלי לפתוח את האפליקציה */
    @SuppressWarnings("deprecation")
    static void handle(Context c, Intent intent) {
        int id = intent.getIntExtra("id", 0);
        String tag = intent.getStringExtra("tag");
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(id);
        push(c, "bell_read", tag);
        if (ACTION_ADD.equals(intent.getAction())) {
            String item = intent.getStringExtra("item");
            push(c, "bell_add", item);
            // אישור קצר שנעלם לבד
            if (nm != null && Notifier.allowed(c)) {
                Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, Notifier.CH_GENERAL) : new Notification.Builder(c);
                b.setSmallIcon(c.getApplicationInfo().icon).setColor(Color.parseColor(AppActivity.BRAND))
                        .setContentTitle("✓ נוסף לרשימה").setContentText(Notifier.clip(item, 120)).setAutoCancel(true)
                        .setContentIntent(PendingIntent.getActivity(c, id + 60000, openIntent(c, LIST_URL), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
                if (Build.VERSION.SDK_INT >= 26) b.setTimeoutAfter(5000);
                if (Build.VERSION.SDK_INT >= 26) b.setOnlyAlertOnce(true);
                try { nm.notify(id, b.build()); } catch (SecurityException ignored) { }
            }
        }
    }

    static synchronized void push(Context c, String key, String v) {
        if (v == null || v.isEmpty()) return;
        v = v.replace('\u2028', ' ').replace('\u2029', ' ');
        SharedPreferences p = CheckJob.prefs(c);
        try {
            JSONArray a = new JSONArray(p.getString(key, "[]"));
            for (int i = 0; i < a.length(); i++) if (v.equals(a.optString(i))) return;
            a.put(v);
            while (a.length() > 60) a.remove(0);
            p.edit().putString(key, a.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    /** כשהאתר פתוח: מסמנים בפעמון את מה שסומן כנקרא מההתראה, ומוסיפים לרשימה את מה שהוסיפו מההתראה */
    static void applyPending(Context c, WebView web) {
        if (web == null || applying) return;
        final SharedPreferences p = CheckJob.prefs(c);
        final String r = p.getString("bell_read", "[]"), a = p.getString("bell_add", "[]");
        if ("[]".equals(r) && "[]".equals(a)) return;
        applying = true;
        String js = "(function(R,A){try{if(typeof inbox==='undefined'||typeof state==='undefined'||!state.lists||!state.lists.length)return 'wait';"
                + "var ch=0;inbox.forEach(function(x){if(R.indexOf(x.id)>=0&&!x.read){x.read=true;ch=1;}});if(ch){saveInbox();updateBell(false);}"
                + "A.forEach(function(n){if(typeof n==='string'&&n)addItem(n,'');});return 'ok';}catch(e){return 'err';}})(" + r + "," + a + ")";
        try {
            web.evaluateJavascript(js, res -> {
                applying = false;
                if ("\"ok\"".equals(res)) {
                    // מוחקים רק את מה ששלחנו (אם בינתיים נוסף עוד — יישאר לפעם הבאה)
                    SharedPreferences.Editor e = p.edit();
                    if (r.equals(p.getString("bell_read", "[]"))) e.putString("bell_read", "[]");
                    if (a.equals(p.getString("bell_add", "[]"))) e.putString("bell_add", "[]");
                    e.apply();
                }
            });
        } catch (Exception e) {
            applying = false;
        }
    }
}
