package com.yamshopping.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;

/**
 * 🔴 מספר אדום על אייקון האפליקציה (מ-2.0): כמה התראות מחכות.
 * הסכום: מה שלא נקרא בפעמון שבאתר + הודעות מהצוות שלא נקראו + הודעות מהבק אופיס שעוד בשורת ההתראות.
 *
 * רוב הטלפונים (סמסונג, שיאומי ועוד) סופרים את ההתראות שבשורת ההתראות. לכן כשבפעמון יש עדכונים
 * שלא הגיעו כהתראה (למשל כשההתראות באתר כבויות), שמים התראה שקטה אחת — בלי צליל ובלי לקפוץ —
 * עם המספר, כדי שהמספר יופיע על האייקון. כשהכל נקרא, ההתראות של הפעמון יורדות והמספר נעלם.
 * בטלפונים ישנים יותר (ובהואווי/אונור) שולחים את המספר גם ישירות למסך הבית.
 */
final class Badge {
    static final String CH_BADGE = "badge";
    static final int SUMMARY_ID = 6690;
    static final int BELL_FROM = 7000, BELL_TO = 7000 + 0xfff;
    static final int NOTICE_FROM = 6660, NOTICE_TO = 6689;

    private Badge() {}

    /** האתר מדווח כמה לא נקרא בפעמון */
    static void site(Context c, int n) {
        CheckJob.prefs(c).edit().putInt("bell_unread", Math.max(0, n)).apply();
        refresh(c);
    }

    static synchronized void refresh(Context c) {
        try {
            int bell = CheckJob.prefs(c).getInt("bell_unread", 0);
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            int bellShown = 0, notices = 0;
            if (nm != null) {
                StatusBarNotification[] act = nm.getActiveNotifications();
                for (StatusBarNotification s : act) {
                    int id = s.getId();
                    if (id >= BELL_FROM && id <= BELL_TO) {
                        // הכל נקרא בפעמון — גם ההתראות שלו בשורת ההתראות כבר לא צריכות להופיע
                        if (bell == 0) nm.cancel(id); else bellShown++;
                    } else if (id >= NOTICE_FROM && id <= NOTICE_TO) notices++;
                }
                int missing = bell - bellShown;
                if (missing > 0) summary(c, nm, bell, missing); else nm.cancel(SUMMARY_ID);
            }
            launcher(c, bell + Inbox.load(c).size() + notices);
        } catch (Exception ignored) {
        }
    }

    /** התראה שקטה אחת שמחזיקה את המספר על האייקון */
    @SuppressWarnings("deprecation")
    static void summary(Context c, NotificationManager nm, int bell, int number) {
        if (!Notifier.allowed(c)) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CH_BADGE, "מספר על האייקון", NotificationManager.IMPORTANCE_MIN);
            ch.setDescription("כמה עדכונים מחכים בפעמון — בשקט, בלי צליל");
            ch.setShowBadge(true);
            ch.setSound(null, null);
            nm.createNotificationChannel(ch);
        }
        Intent open = new Intent(c, AppActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse(CheckJob.SITE + "/?notif=1"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        android.app.PendingIntent pi = android.app.PendingIntent.getActivity(c, SUMMARY_ID, open,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH_BADGE) : new Notification.Builder(c);
        b.setSmallIcon(c.getApplicationInfo().icon)
                .setContentTitle("🔔 " + (bell == 1 ? "עדכון חדש אחד בפעמון" : bell + " עדכונים חדשים בפעמון"))
                .setContentText("לוחצים כאן כדי לראות")
                .setColor(android.graphics.Color.parseColor(AppActivity.BRAND))
                .setNumber(number)
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setContentIntent(pi);
        if (Build.VERSION.SDK_INT >= 26) b.setBadgeIconType(Notification.BADGE_ICON_SMALL);
        else b.setPriority(Notification.PRIORITY_MIN);
        try {
            nm.notify(SUMMARY_ID, b.build());
        } catch (SecurityException ignored) {
        }
    }

    /** מסכי בית שמקבלים את המספר ישירות (סמסונג ו-LG ישנים, הואווי ואונור) */
    static void launcher(Context c, int n) {
        String pkg = c.getPackageName(), cls = Icons.launcher(c);
        try {
            Intent i = new Intent("android.intent.action.BADGE_COUNT_UPDATE");
            i.putExtra("badge_count", n);
            i.putExtra("badge_count_package_name", pkg);
            i.putExtra("badge_count_class_name", cls);
            c.sendBroadcast(i);
        } catch (Exception ignored) {
        }
        String m = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase(java.util.Locale.ROOT);
        if (m.contains("huawei") || m.contains("honor")) {
            try {
                Bundle b = new Bundle();
                b.putString("package", pkg);
                b.putString("class", cls);
                b.putInt("badgenumber", n);
                c.getContentResolver().call(Uri.parse("content://com.huawei.android.launcher.settings/badge/"), "change_badge", null, b);
            } catch (Exception ignored) {
            }
        }
    }
}
