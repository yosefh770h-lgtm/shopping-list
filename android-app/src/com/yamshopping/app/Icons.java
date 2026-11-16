package com.yamshopping.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;

/**
 * 🎨 אייקון האפליקציה לפי ערכת הצבעים (פרו, גרסה 2.0).
 * לכל ערכה יש "כניסה" משלה במסך הבית (activity-alias במניפסט) עם אייקון משלה; מדליקים אחת ומכבים את השאר.
 * ".MainActivity" היא הכניסה המקורית — היא נשארת ברירת המחדל, כך שהאייקון ששמתם במסך הבית לפני 2.0 ממשיך לעבוד.
 */
final class Icons {
    private Icons() {}

    static final String[][] THEMES = {
            {"sea", ".MainActivity"},
            {"sky", ".IconSky"},
            {"mint", ".IconMint"},
            {"lilac", ".IconLilac"},
            {"night", ".IconNight"},
    };

    static ComponentName comp(Context c, String alias) {
        return new ComponentName(c.getPackageName(), c.getPackageName() + alias);
    }

    /** הכניסה שמוצגת עכשיו במסך הבית (בשביל המספר האדום על האייקון) */
    static String launcher(Context c) {
        PackageManager pm = c.getPackageManager();
        for (String[] t : THEMES) {
            if (t[0].equals("sea")) continue;
            try {
                if (pm.getComponentEnabledSetting(comp(c, t[1])) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) return comp(c, t[1]).getClassName();
            } catch (Exception ignored) {
            }
        }
        return comp(c, ".MainActivity").getClassName();
    }

    /** מחליף את האייקון. מחזיר false אם הערכה לא מוכרת או שכבר מוצגת */
    static boolean set(Context c, String theme) {
        String want = null;
        for (String[] t : THEMES) if (t[0].equals(theme)) want = t[1];
        if (want == null) return false;
        if (comp(c, want).getClassName().equals(launcher(c))) return false;
        PackageManager pm = c.getPackageManager();
        // קודם מדליקים את החדש ורק אז מכבים את הישן — כך אף פעם אין רגע בלי אייקון
        pm.setComponentEnabledSetting(comp(c, want), want.equals(".MainActivity") ? PackageManager.COMPONENT_ENABLED_STATE_DEFAULT : PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
        for (String[] t : THEMES) {
            if (t[1].equals(want)) continue;
            pm.setComponentEnabledSetting(comp(c, t[1]), t[1].equals(".MainActivity") ? PackageManager.COMPONENT_ENABLED_STATE_DISABLED : PackageManager.COMPONENT_ENABLED_STATE_DEFAULT, PackageManager.DONT_KILL_APP);
        }
        return true;
    }
}
