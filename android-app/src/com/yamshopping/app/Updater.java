package com.yamshopping.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.os.Build;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * עדכון האפליקציה מתוך האפליקציה: מוריד את הגרסה החדשה מהאתר שלנו ומתקין אותה במקום הישנה.
 * אנדרואיד מבקש מהמשתמש אישור "עדכון" (חוץ ממקרים שהמערכת מאפשרת לדלג, אחרי עדכון ראשון מתוך האפליקציה).
 * הרשימות והחשבון נשארים, כי זו אותה אפליקציה עם אותה חתימה.
 */
final class Updater {
    static final String APK_URL = "https://www.yamshopping.com/download/yamshopping.apk";
    static final int MAX_BYTES = 60 * 1024 * 1024;
    static final String ACTION_STATUS = "com.yamshopping.app.INSTALL_STATUS";

    interface Progress {
        // state: start / download / verify / install / done / error / perm
        void on(String state, int pct, String msg);
    }

    static volatile boolean running;

    private Updater() {}

    static long versionCode(PackageInfo p) {
        return Build.VERSION.SDK_INT >= 28 ? p.getLongVersionCode() : legacyCode(p);
    }

    @SuppressWarnings("deprecation")
    static long legacyCode(PackageInfo p) {
        return p.versionCode;
    }

    static PackageInfo self(Context c) {
        try {
            return c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
        } catch (PackageManager.NameNotFoundException e) {
            return null;
        }
    }

    /** האם מותר לאפליקציה להתקין עדכון (אנדרואיד 8 ומעלה שואל פעם אחת "לאפשר התקנה ממקור זה") */
    static boolean canInstall(Context c) {
        return Build.VERSION.SDK_INT < 26 || c.getPackageManager().canRequestPackageInstalls();
    }

    static void start(Context ctx, Progress cb) {
        if (running) { cb.on("download", -1, ""); return; }
        running = true;
        final Context c = ctx.getApplicationContext();
        new Thread(() -> {
            File f = new File(c.getCacheDir(), "update.apk");
            try {
                cb.on("start", 0, "");
                download(f, Release.downloadUrl(c), cb);
                cb.on("verify", 100, "");
                PackageInfo mine = self(c);
                PackageInfo apk = c.getPackageManager().getPackageArchiveInfo(f.getAbsolutePath(), 0);
                if (apk == null || !c.getPackageName().equals(apk.packageName)) throw new Exception("bad_file");
                if (mine != null && versionCode(apk) <= versionCode(mine)) {
                    f.delete();
                    cb.on("latest", 100, apk.versionName == null ? "" : apk.versionName);
                    return;
                }
                cb.on("install", 100, apk.versionName == null ? "" : apk.versionName);
                try {
                    install(c, f);
                } catch (Exception e) {
                    // יש טלפונים (למשל Galaxy S22 עם סינון הדרן) שדוחים את PackageInstaller עוד לפני שההתקנה מתחילה
                    // ("Invalid install mode: -1"). אז פותחים את מסך ההתקנה הרגיל של אנדרואיד עם הקובץ שכבר ירד
                    if (!openInstaller(c)) throw e;
                    cb.on("confirm", 100, "fallback");
                }
            } catch (Exception e) {
                f.delete();
                cb.on("error", 0, e.getMessage() == null ? "error" : e.getMessage());
            } finally {
                running = false;
            }
        }, "yam-update").start();
    }

    static void download(File out, String url, Progress cb) throws Exception {
        URL u = new URL(url);
        HttpURLConnection con = null;
        for (int hop = 0; hop < 4; hop++) {
            con = (HttpURLConnection) u.openConnection();
            con.setInstanceFollowRedirects(false);
            con.setConnectTimeout(20000);
            con.setReadTimeout(30000);
            con.setRequestProperty("Cache-Control", "no-cache");
            int code = con.getResponseCode();
            if (code >= 300 && code < 400) {
                // הפניה — רק בתוך האתר שלנו, ורק ב-https
                URL next = new URL(u, con.getHeaderField("Location"));
                con.disconnect();
                if (!"https".equals(next.getProtocol()) || !AppActivity.isOurHost(next.getHost())) throw new Exception("bad_redirect");
                u = next;
                continue;
            }
            if (code != 200) throw new Exception("http_" + code);
            break;
        }
        long total = con.getContentLengthLong();
        if (total > MAX_BYTES) throw new Exception("too_big");
        long got = 0;
        int last = -1;
        try (InputStream in = con.getInputStream(); OutputStream o = new FileOutputStream(out)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) {
                got += n;
                if (got > MAX_BYTES) throw new Exception("too_big");
                o.write(buf, 0, n);
                int pct = total > 0 ? (int) (got * 100 / total) : -1;
                if (pct != last && (pct < 0 || pct % 5 == 0)) { last = pct; cb.on("download", pct, ""); }
            }
        } finally {
            con.disconnect();
        }
        if (got < 10000) throw new Exception("bad_file");
    }

    /** מסך ההתקנה הרגיל של אנדרואיד, עם הקובץ שירד (דרך CaptureProvider, רק לקריאה ורק למי שמקבל את ההרשאה) */
    static boolean openInstaller(Context c) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(CaptureProvider.UPDATE_URI, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            AppActivity a = AppActivity.current;
            if (a != null && !a.isFinishing()) a.startActivity(i); else c.startActivity(i);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    static void install(Context c, File f) throws Exception {
        PackageInstaller pi = c.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(c.getPackageName());
        if (Build.VERSION.SDK_INT >= 31) {
            // אחרי שהאפליקציה עדכנה את עצמה פעם אחת, אנדרואיד יכול לעדכן בלי לשאול שוב
            params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
        }
        int id = pi.createSession(params);
        try (PackageInstaller.Session s = pi.openSession(id)) {
            try (InputStream in = new FileInputStream(f); OutputStream o = s.openWrite("app.apk", 0, f.length())) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
                s.fsync(o);
            }
            Intent i = new Intent(c, InstallReceiver.class).setAction(ACTION_STATUS);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
            PendingIntent p = PendingIntent.getBroadcast(c, 7, i, flags);
            s.commit(p.getIntentSender());
        }
    }
}
