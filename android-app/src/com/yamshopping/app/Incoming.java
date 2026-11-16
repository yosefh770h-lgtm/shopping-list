package com.yamshopping.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 2.0 — מה שנכנס לאפליקציה מבחוץ, ועוד שני דברים קטנים לטלפון:
 *  1. 🔗 קישור ל-yamshopping.com (מוואטסאפ, מייל...) נפתח ישר באפליקציה ולא בדפדפן.
 *  2. 📤 "שיתוף" של טקסט אל ים שופינג — המוצרים נכנסים לרשימה, כל שורה מוצר.
 *  3. 📲 קיצורי הדרך בלחיצה ארוכה על האייקון (res/xml/shortcuts.xml) מגיעים כקישור ?a=...
 *  4. ☀ המסך לא נכבה במצב קנייה (keepScreen).
 *  5. 📳 רטט קצר כשסריקת ברקוד מצליחה (buzz).
 */
final class Incoming {
    private Incoming() {}

    private static final Pattern OUR_LINK = Pattern.compile("https://(?:www\\.)?yamshopping\\.com\\S*", Pattern.CASE_INSENSITIVE);

    /** הכתובת שצריך לפתוח בגלל ה-Intent, או null אם אין מה לפתוח */
    static String url(Intent i) {
        if (i == null) return null;
        if (Intent.ACTION_SEND.equals(i.getAction())) {
            CharSequence cs = i.getCharSequenceExtra(Intent.EXTRA_TEXT);
            String t = cs == null ? "" : cs.toString().trim();
            if (t.isEmpty()) return null;
            // שיתפו רק קישור שלנו — פותחים אותו
            Matcher m = OUR_LINK.matcher(t);
            if (m.find() && t.replace(m.group(), "").trim().length() < 3) {
                Uri u = Uri.parse(m.group());
                if (AppActivity.isOurPage(u)) return AppActivity.onWww(u);
            }
            if (t.length() > 3000) t = t.substring(0, 3000);
            return AppActivity.HOME + "&a=paste&t=" + Uri.encode(t);
        }
        Uri link = i.getData();
        if (link != null && AppActivity.isOurPage(link)) return AppActivity.onWww(link);
        return null;
    }

    static void keepScreen(Activity a, boolean on) {
        a.runOnUiThread(() -> {
            if (on) a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
    }

    @SuppressWarnings("deprecation")
    static void buzz(Context c, int ms) {
        try {
            ms = Math.max(10, Math.min(ms, 300));
            Vibrator v = (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(ms);
        } catch (Exception ignored) {}
    }
}
