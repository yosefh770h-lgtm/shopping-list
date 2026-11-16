package com.yamshopping.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;

/** התראות בטלפון: עדכונים מהאתר, גרסה חדשה לאפליקציה, ערב שבת, והתראות הפעמון שבאתר */
final class Notifier {
    static final String CH_UPDATES = "updates", CH_GENERAL = "general", CH_NOTICES = "notices";

    private Notifier() {}

    static boolean allowed(Context c) {
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        return nm != null && nm.areNotificationsEnabled();
    }

    static void channels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel u = new NotificationChannel(CH_UPDATES, "עדכונים וחידושים", NotificationManager.IMPORTANCE_DEFAULT);
        u.setDescription("גרסה חדשה לאפליקציה ומה חדש באתר");
        nm.createNotificationChannel(u);
        NotificationChannel g = new NotificationChannel(CH_GENERAL, "תזכורות והתראות", NotificationManager.IMPORTANCE_DEFAULT);
        g.setDescription("ערב שבת, הוזלות מחיר, מבצעים ותזכורות מהרשימה");
        nm.createNotificationChannel(g);
        // 📲 הודעות שצוות האתר שולח מהבק אופיס — קופצות בראש המסך
        NotificationChannel n = new NotificationChannel(CH_NOTICES, "הודעות מים שופינג", NotificationManager.IMPORTANCE_HIGH);
        n.setDescription("הודעות שצוות האתר שולח, למשל מבצעים שעומדים להיגמר");
        nm.createNotificationChannel(n);
    }

    /** התראה שפותחת דף באתר שלנו (או את האפליקציה) */
    static void showUrl(Context c, String channel, int id, String title, String body, String url) {
        // 2.0: תזכורות והודעות — עם הכפתורים "פתח"/"פתח רשימה" ו"סמן כנקרא" ישר בהתראה
        if (CH_GENERAL.equals(channel) || CH_NOTICES.equals(channel)) { BellActions.show(c, channel, id, title, body, url, null); return; }
        Intent i = new Intent(c, AppActivity.class);
        i.setAction(Intent.ACTION_VIEW);
        Uri u = url == null || url.isEmpty() ? null : Uri.parse(url);
        if (u != null && AppActivity.isOurPage(u)) i.setData(u);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        show(c, channel, id, title, body, i);
    }

    @SuppressWarnings("deprecation")
    static void show(Context c, String channel, int id, String title, String body, Intent open) {
        if (!allowed(c)) return;
        channels(c);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        PendingIntent pi = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, channel) : new Notification.Builder(c);
        b.setSmallIcon(c.getApplicationInfo().icon)
                .setContentTitle(clip(title, 120))
                .setContentText(clip(body, 300))
                .setStyle(new Notification.BigTextStyle().bigText(clip(body, 600)))
                .setColor(Color.parseColor(AppActivity.BRAND))
                .setAutoCancel(true)
                .setContentIntent(pi);
        try {
            nm.notify(id, b.build());
        } catch (SecurityException ignored) {
        }
    }

    static String clip(String s, int n) {
        if (s == null) return "";
        return s.length() > n ? s.substring(0, n - 1) + "…" : s;
    }
}
