package com.yamshopping.app;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceResponse;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * 🧳 2.1: עותק של האתר שנארז בתוך האפליקציה (assets/site, נבנה ב-build.sh מתוך shopping-list-site).
 * משמש רק כשהדף הראשי לא נטען בכלל — בפתיחה הראשונה אחרי התקנה בלי אינטרנט, או כשהשרת לא זמין.
 * הכתובות נשארות של www.yamshopping.com, כך שהרשימות שנשמרו בטלפון (localStorage / IndexedDB) מופיעות כרגיל.
 */
final class Offline {
    private Offline() {
    }

    private static Boolean has;

    static boolean has(Context c) {
        if (has == null) {
            try (InputStream in = c.getAssets().open("site/index.html")) {
                has = true;
            } catch (Exception e) {
                has = false;
            }
        }
        return has;
    }

    /** קובץ מהעותק הפנימי, או null (ואז הבקשה הולכת לרשת כרגיל — ובלי אינטרנט פשוט נכשלת) */
    static WebResourceResponse serve(Context c, Uri u) {
        if (u == null || !"https".equalsIgnoreCase(u.getScheme()) || !"www.yamshopping.com".equalsIgnoreCase(u.getHost())) return null;
        String path = u.getPath();
        if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
        // רק שמות קבצים פשוטים, בלי ".." — אי אפשר לצאת מהתיקייה
        if (path.contains("..") || !path.matches("/[A-Za-z0-9._/-]+")) return null;
        String mime = mime(path);
        if (mime == null) return null;
        try {
            InputStream in = c.getAssets().open("site" + path);
            Map<String, String> h = new HashMap<>();
            h.put("Cache-Control", "no-store");
            boolean text = mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json") || mime.endsWith("+xml");
            return new WebResourceResponse(mime, text ? "UTF-8" : null, 200, "OK", h, in);
        } catch (Exception e) {
            return null;
        }
    }

    static String mime(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        return null;
    }
}
