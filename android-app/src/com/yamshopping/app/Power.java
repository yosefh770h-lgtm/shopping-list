package com.yamshopping.app;

import android.app.Activity;
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

    /** "ok" — פטור כבר יש, "ask" — אפשר לבקש, "na" — לא רלוונטי (לפני אנדרואיד 6, או שאי אפשר לבדוק) */
    static String state(Context c) {
        try {
            PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
            if (pm == null) return "na";
            return pm.isIgnoringBatteryOptimizations(c.getPackageName()) ? "ok" : "ask";
        } catch (Exception e) {
            return "na";
        }
    }

    /** פותח את חלון המערכת. true — נפתח חלון (התשובה תגיע כשחוזרים לאפליקציה) */
    static boolean ask(Activity a) {
        if (!"ask".equals(state(a))) return false;
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
