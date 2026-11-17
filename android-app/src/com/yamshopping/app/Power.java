package com.yamshopping.app;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import java.util.Locale;

/**
 * 🔋 2.1: שההתראות יגיעו גם כשהאפליקציה סגורה.
 * הבדיקה ברקע (CheckJob, כל רבע שעה) נדחית בטלפונים עם חיסכון סוללה אגרסיבי (שיאומי, סמסונג, הואווי).
 * 1. פטור מאופטימיזציית סוללה — חלון של המערכת, שהמשתמש מאשר או מסרב. מבקשים רק כשהמשתמש לחץ בכרטיס ההתראות באתר.
 * 2. בשיאומי צריך גם "הפעלה אוטומטית" — אין לזה חלון אישור, רק מסך בהגדרות. פותחים אותו, והאתר מסביר מה להדליק.
 */
final class Power {
    private Power() {
    }

    /**
     * "ok" — פטור כבר יש, "ask" — אפשר לבקש, "na" — לא רלוונטי (לפני אנדרואיד 6, או שאי אפשר לבדוק).
     * 🔋 2.2: "blocked" — הטלפון חוסם לאפליקציה לפעול ברקע (המשתמש או מנהל הסוללה של היצרן בחרו "מוגבל"),
     * גם אם הפטור מחיסכון סוללה דלוק. זה המצב שבו במסך הסוללה של הטלפון אף אפשרות לא מסומנת (נמצא ב-Qin 3 Ultra).
     * חלון הפטור לא עוזר כאן — צריך לפתוח את הגדרות האפליקציה ולבחור "ללא הגבלות".
     */
    static String state(Context c) {
        try {
            if (Build.VERSION.SDK_INT >= 28) {
                ActivityManager am = (ActivityManager) c.getSystemService(Context.ACTIVITY_SERVICE);
                if (am != null && am.isBackgroundRestricted()) return "blocked";
            }
            PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
            if (pm == null) return "na";
            boolean ok = pm.isIgnoringBatteryOptimizations(c.getPackageName());
            if (ok) CheckJob.prefs(c).edit().putBoolean("bat_was_ok", true).apply();
            return ok ? "ok" : "ask";
        } catch (Exception e) {
            return "na";
        }
    }

    /** 🔋 2.2: היה אישור "ללא הגבלות" והטלפון ביטל אותו לבד — האתר מסביר את זה במקום לבקש כאילו בפעם הראשונה */
    static boolean lost(Context c) {
        String s = state(c);
        return !"ok".equals(s) && !"na".equals(s) && CheckJob.prefs(c).getBoolean("bat_was_ok", false);
    }

    /** פותח את חלון המערכת. true — נפתח חלון (התשובה תגיע כשחוזרים לאפליקציה) */
    static boolean ask(Activity a) {
        String st = state(a);
        if ("blocked".equals(st)) {
            // 🔋 2.2: הטלפון חוסם פעילות ברקע — רק המשתמש יכול לשחרר, בהגדרות האפליקציה ← סוללה ← "ללא הגבלות"
            try {
                a.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + a.getPackageName())));
                return true;
            } catch (Exception e) {
                return false;
            }
        }
        if (!"ask".equals(st)) return false;
        try {
            a.startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + a.getPackageName())));
            return true;
        } catch (Exception e) {
            // יש טלפונים שחסמו את החלון — פותחים את רשימת האפליקציות של חיסכון הסוללה
            try {
                a.startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
    }

    static boolean xiaomi() {
        String m = (Build.MANUFACTURER + " " + Build.BRAND).toLowerCase(Locale.ROOT);
        return m.contains("xiaomi") || m.contains("redmi") || m.contains("poco");
    }

    static final ComponentName[] AUTOSTART = {
            new ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
            new ComponentName("com.miui.securitycenter", "com.miui.powercenter.PowerSettings"),
    };

    static Intent autostartIntent(Context c) {
        if (!xiaomi()) return null;
        PackageManager pm = c.getPackageManager();
        for (ComponentName cn : AUTOSTART) {
            Intent i = new Intent().setComponent(cn);
            try {
                if (pm.resolveActivity(i, 0) != null) return i;
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    static void openAutostart(Activity a) {
        Intent i = autostartIntent(a);
        try {
            if (i != null) { a.startActivity(i); return; }
        } catch (Exception ignored) {
        }
        // לא מצאנו את המסך — פרטי האפליקציה בהגדרות (שם יש "הפעלה אוטומטית" / "חיסכון בסוללה")
        try {
            a.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + a.getPackageName())));
        } catch (Exception ignored) {
        }
    }
}
