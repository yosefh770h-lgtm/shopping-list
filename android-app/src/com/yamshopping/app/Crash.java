package com.yamshopping.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONObject;

/**
 * 🐞 2.2: כשהאפליקציה עצמה נסגרת בגלל תקלה (קריסה בקוד של האפליקציה, לא של האתר) או כשחלון האתר קורס —
 * נשמר בטלפון תיאור קצר: סוג התקלה, איפה בקוד, גרסת האפליקציה, דגם הטלפון וגרסת אנדרואיד.
 * בפתיחה הבאה האתר שואל YamApp.lastCrash() ושולח את זה ליומן התקלות בבק אופיס (js/026.js), ואז זה נמחק מהטלפון.
 * אין כאן שום תוכן של המשתמש: רק שם התקלה ושורות מהקוד שלנו.
 */
final class Crash {
    private static final String PREFS = "crash", KEY = "last";

    private Crash() { }

    /** פעם אחת בפתיחת האפליקציה: עוטף את הטיפול הרגיל של אנדרואיד בקריסות (שממשיך לעבוד כרגיל אחרי השמירה) */
    static void install(Context c) {
        final Context app = c.getApplicationContext();
        final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        if (prev instanceof Handler) return;
        Thread.setDefaultUncaughtExceptionHandler(new Handler(app, prev));
    }

    private static final class Handler implements Thread.UncaughtExceptionHandler {
        final Context app;
        final Thread.UncaughtExceptionHandler prev;
        Handler(Context app, Thread.UncaughtExceptionHandler prev) { this.app = app; this.prev = prev; }

        @Override
        public void uncaughtException(Thread t, Throwable e) {
            try {
                Throwable root = e;
                while (root.getCause() != null && root.getCause() != root) root = root.getCause();
                StringBuilder where = new StringBuilder();
                for (StackTraceElement f : root.getStackTrace()) {
                    if (!f.getClassName().startsWith("com.yamshopping")) continue;
                    if (where.length() > 0) where.append(" < ");
                    where.append(f.getClassName().replace("com.yamshopping.app.", "")).append('.').append(f.getMethodName()).append(':').append(f.getLineNumber());
                    if (where.length() > 200) break;
                }
                if (where.length() == 0 && root.getStackTrace().length > 0) where.append(root.getStackTrace()[0].toString());
                save(app, "💥 האפליקציה נסגרה בגלל תקלה: " + root.getClass().getSimpleName() + (root.getMessage() != null ? ": " + root.getMessage() : ""),
                        where.toString() + " · thread " + t.getName());
            } catch (Throwable ignored) {
            }
            if (prev != null) prev.uncaughtException(t, e);
        }
    }

    /** חלון האתר קרס (בדרך כלל נגמר הזיכרון) — האפליקציה כבר טוענת אותו מחדש, רק רושמים */
    static void rendererGone(Context c, boolean crashed) {
        save(c.getApplicationContext(), crashed ? "💥 חלון האתר קרס ונטען מחדש" : "💥 אנדרואיד סגר את חלון האתר (חסר זיכרון) ונטען מחדש", "onRenderProcessGone");
    }

    private static void save(Context app, String msg, String where) {
        try {
            JSONObject o = new JSONObject();
            o.put("msg", msg.length() > 300 ? msg.substring(0, 300) : msg);
            o.put("where", where.length() > 260 ? where.substring(0, 260) : where);
            o.put("device", (Build.MODEL == null ? "" : Build.MODEL) + " · Android " + Build.VERSION.RELEASE);
            o.put("at", System.currentTimeMillis());
            // commit ולא apply: האפליקציה עומדת להיסגר
            app.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, o.toString()).commit();
        } catch (Throwable ignored) {
        }
    }

    /** לאתר: התקלה האחרונה (JSON) או "" — ומוחק אותה, כדי שתישלח פעם אחת בלבד */
    static String take(Context c) {
        try {
            SharedPreferences p = c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String s = p.getString(KEY, "");
            if (!s.isEmpty()) p.edit().remove(KEY).apply();
            return s;
        } catch (Throwable e) {
            return "";
        }
    }
}
