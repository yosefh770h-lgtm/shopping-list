package com.yamshopping.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * 🔋 2.2: גיבוי לבדיקה ברקע (CheckJob).
 * בחלק מהטלפונים (למשל Qin 3 Ultra) מנהל הסוללה דוחה את JobScheduler לשעה ויותר, גם כשבחרו "ללא הגבלות".
 * כאן יש עוד דרך להתעורר: התראת שעון של המערכת (AlarmManager, "מותר גם בחיסכון") בערך כל רבע שעה,
 * ואחרי הפעלה מחדש של הטלפון ואחרי עדכון של האפליקציה.
 * הבדיקה עצמה רצה רק אם לא רצה ב-12 הדקות האחרונות (CheckJob.claim), כך שלא בודקים פעמיים.
 */
public class Wake extends BroadcastReceiver {
    static final String ACTION = "com.yamshopping.app.WAKE";
    static final long EVERY = 15 * 60 * 1000L;

    static void arm(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent i = new Intent(c, Wake.class).setAction(ACTION);
            PendingIntent pi = PendingIntent.getBroadcast(c, 6702, i,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            long at = System.currentTimeMillis() + EVERY;
            // לא מדויק בכוונה (לא צריך הרשאת "שעון מעורר"), אבל מותר גם כשהטלפון במצב חיסכון (Doze)
            if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else am.set(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        final Context app = c.getApplicationContext();
        arm(app);
        CheckJob.schedule(app);
        if (!CheckJob.claim(app)) return;
        final PendingResult done = goAsync();
        new Thread(() -> {
            try {
                CheckJob.run(app);
            } catch (Exception ignored) {
            }
            done.finish();
        }, "yam-wake").start();
    }
}
