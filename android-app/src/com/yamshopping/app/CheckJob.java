package com.yamshopping.app;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * בדיקה ברקע, כל רבע שעה (גם כשהאפליקציה סגורה), ומה שחדש מגיע כהתראה בטלפון:
 * 0. הודעות מצוות האתר בצ'אט (Inbox) — כהתראת שיחה, עם "השב" ו"סימון כנקרא".
 *    והודעות שנשלחות מהבק אופיס ← 📲 התראה לטלפון (Notices).
 * 1. גרסה חדשה לאפליקציה — לחיצה פותחת את העדכון בתוך האפליקציה. מגיע תמיד, גם כש"התראות ברקע" כבויות,
 *    ורק גרסה ששוחררה לחשבון הזה (בבק אופיס ← 🚀 שחרור גרסה).
 * 2. "מה חדש באתר" — מה שמפרסמים בבק אופיס ← 📢 פרסום עדכון. מגיע לכל מי שהתקין, גם בלי חשבון.
 * 3. ערב שבת — ביום שישי בבוקר, תזכורת לבדוק את הרשימה.
 * לא שולחים התראות בשבת (שעון ישראל). מ-2.2 — גם בלילה כן.
 */
public class CheckJob extends JobService {
    static final int JOB_ID = 67, OLD_JOB_ID = 66;
    static final String PREFS = "yam_bg";
    static final String SITE = "https://www.yamshopping.com";
    static final String SB_URL = "https://ygyfodxfbebnkwdcbjrp.supabase.co";
    // מפתח ציבורי (publishable) — אותו מפתח שנמצא באתר עצמו
    static final String SB_KEY = "sb_publishable_ePRvA2OrDbBN3tbjbD3p-w_8maEwTCK";

    static void schedule(Context c) {
        JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null) return;
        // 1.3–1.7: בדיקה כל 3 שעות. מ-1.8 כל רבע שעה (הכי מהר שאנדרואיד מאפשר), בשביל הודעות מהצוות
        if (js.getPendingJob(OLD_JOB_ID) != null) js.cancel(OLD_JOB_ID);
        if (js.getPendingJob(JOB_ID) != null) return;
        JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(c, CheckJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L, 5 * 60 * 1000L)
                .setPersisted(true)
                .build();
        try {
            js.schedule(job);
        } catch (Exception ignored) {
        }
    }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, MODE_PRIVATE);
    }

    static boolean enabled(Context c) {
        return prefs(c).getBoolean("on", true);
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            try {
                run(getApplicationContext());
            } catch (Exception ignored) {
            }
            jobFinished(params, false);
        }, "yam-check").start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }

    static Calendar il() {
        return Calendar.getInstance(TimeZone.getTimeZone("Asia/Jerusalem"));
    }

    /** שבת (מיום שישי 15:00 עד מוצאי שבת) — לא מתריעים. מ-2.2 בכל שאר שעות היממה, גם בלילה (בקשת הבעלים) */
    static boolean quiet(Calendar now) {
        int d = now.get(Calendar.DAY_OF_WEEK), h = now.get(Calendar.HOUR_OF_DAY);
        if (d == Calendar.SATURDAY && h < 21) return true;
        return d == Calendar.FRIDAY && h >= 15;
    }

    static void run(Context c) throws Exception {
        if (!Notifier.allowed(c)) return;
        Calendar now = il();
        if (quiet(now)) return;
        SharedPreferences p = prefs(c);
        // הודעות מהצוות — בכל בדיקה (כל רבע שעה). רק בטלפון שמחובר לחשבון (האתר הצמיד אותו)
        if (p.getBoolean("inbox", false)) Inbox.check(c);
        // הודעות שצוות האתר שולח מהבק אופיס — בכל בדיקה, לכל מי שהתקין (גם בלי חשבון)
        Notices.check(c);
        // 🔴 המספר על אייקון האפליקציה
        Badge.refresh(c);
        long t = System.currentTimeMillis();
        // גרסה חדשה לאפליקציה — תמיד, גם למי שכיבה "התראות ברקע" (מ-1.9). פעם בשלוש שעות בערך
        long lastVer = p.getLong("ver_at", 0);
        if (t - lastVer > 170 * 60 * 1000L || t < lastVer) {
            p.edit().putLong("ver_at", t).apply();
            checkVersion(c, p);
        }
        if (!enabled(c)) return;
        // "מה חדש באתר" — פעם בשלוש שעות בערך
        long last = p.getLong("slow_at", 0);
        if (t - last > 170 * 60 * 1000L || t < last) {
            p.edit().putLong("slow_at", t).apply();
            checkNews(c, p);
        }
        shabbat(c, p, now);
    }

    static void checkVersion(Context c, SharedPreferences p) {
        try {
            // מה מגיע לטלפון הזה — הגרסה הכללית, או מה ששוחרר בבק אופיס לחשבון שלו (Release)
            Release.Info r = Release.best(c);
            if (r == null || r.version.equals(p.getString("ver_told", ""))) return;
            Notifier.showUrl(c, Notifier.CH_UPDATES, 6601, "🔄 גרסה חדשה לאפליקציה (" + r.version + ")",
                    (r.notes.isEmpty() ? "" : r.notes + "\n") + "לוחצים כאן לעדכון בתוך האפליקציה", SITE + "/?appupdate=1");
            p.edit().putString("ver_told", r.version).apply();
        } catch (Exception ignored) {
        }
    }

    static void checkNews(Context c, SharedPreferences p) {
        try {
            String seen = p.getString("news_seen", "");
            String nowIso = iso(new Date());
            // בפעם הראשונה לא שולחים את כל מה שפורסם בעבר — רק מה שיתפרסם מעכשיו
            if (seen.isEmpty()) { p.edit().putString("news_seen", nowIso).apply(); return; }
            JSONArray a = new JSONArray(post(SB_URL + "/rest/v1/rpc/updates_public", "{}"));
            String newest = seen;
            int shown = 0;
            for (int i = 0; i < a.length(); i++) {
                JSONObject u = a.getJSONObject(i);
                String at = u.optString("created_at", "");
                if (at.compareTo(seen) <= 0) continue;
                if (at.compareTo(newest) > 0) newest = at;
                if (shown++ >= 2) continue;
                Notifier.showUrl(c, Notifier.CH_UPDATES, 6610 + i, "🆕 " + u.optString("title", "מה חדש"), u.optString("body", ""), SITE + "/?whatsnew=1");
            }
            if (!newest.equals(seen)) p.edit().putString("news_seen", newest).apply();
        } catch (Exception ignored) {
        }
    }

    static void shabbat(Context c, SharedPreferences p, Calendar now) {
        if (!p.getBoolean("shabbat", true)) return;
        if (now.get(Calendar.DAY_OF_WEEK) != Calendar.FRIDAY) return;
        int h = now.get(Calendar.HOUR_OF_DAY);
        if (h < 8 || h >= 14) return;
        String day = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(now.getTime());
        if (day.equals(p.getString("shb_told", ""))) return;
        Notifier.showUrl(c, Notifier.CH_GENERAL, 6620, "🕯️ ערב שבת קודש", "כדאי לבדוק את רשימת הקניות לשבת — מה עוד חסר?", SITE + "/?tab=list");
        p.edit().putString("shb_told", day).apply();
    }

    static String iso(Date d) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.ROOT);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(d);
    }

    static boolean newer(String a, String b) {
        String[] x = a.split("\\."), y = (b == null ? "0" : b).split("\\.");
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            int p = i < x.length ? num(x[i]) : 0, q = i < y.length ? num(y[i]) : 0;
            if (p != q) return p > q;
        }
        return false;
    }

    static int num(String s) {
        try { return Integer.parseInt(s.trim()); } catch (Exception e) { return 0; }
    }

    static String get(String url) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(15000);
        con.setReadTimeout(20000);
        con.setRequestProperty("Cache-Control", "no-cache");
        return read(con);
    }

    static String post(String url, String body) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(15000);
        con.setReadTimeout(20000);
        con.setRequestMethod("POST");
        con.setDoOutput(true);
        con.setRequestProperty("apikey", SB_KEY);
        con.setRequestProperty("Content-Type", "application/json");
        try (OutputStream o = con.getOutputStream()) {
            o.write(body.getBytes(StandardCharsets.UTF_8));
        }
        return read(con);
    }

    static String read(HttpURLConnection con) throws Exception {
        try {
            if (con.getResponseCode() != 200) throw new Exception("http_" + con.getResponseCode());
            try (InputStream in = con.getInputStream()) {
                ByteArrayOutputStream b = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0 && b.size() < 512 * 1024) b.write(buf, 0, n);
                return b.toString("UTF-8");
            }
        } finally {
            con.disconnect();
        }
    }
}
