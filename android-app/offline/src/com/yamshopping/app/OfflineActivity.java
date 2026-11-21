package com.yamshopping.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;

/**
 * 📴 "רשימת קניות אופליין" — אפליקציה נפרדת, בלי הרשאת אינטרנט בכלל (כדי שתתאים לטלפונים כשרים ולסינונים).
 * מציגה את אותו אתר שנארז בתוכה (assets/site, Offline.java), כך שהעיצוב זהה לאפליקציה הרגילה.
 * האתר מזהה אותה לפי YamShoppingOffline/ ב-User-Agent: בלי ענן, בלי מחירים, ועם 📡 סנכרון — QR, בלוטות' (Bt.java) וקוד שיתוף.
 */
public class OfflineActivity extends Activity implements Bt.Out {
    static final String VER = "1.0";
    static final String HOME = "https://www.yamshopping.com/";
    static final int REQ_CAM = 7401, REQ_FILE = 7402;

    WebView web;
    Bt bt;
    PermissionRequest pendingCam;
    ValueCallback<Uri[]> fileCb;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Crash.install(this);
        bt = new Bt(this, this);
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(false);
        s.setUserAgentString(s.getUserAgentString() + " YamShoppingApp/2.2 YamShoppingOffline/" + VER);
        float f = getResources().getConfiguration().fontScale;
        s.setTextZoom(Math.max(85, Math.min(200, Math.round((f > 0 ? f : 1f) * 100))));
        web.addJavascriptInterface(new Bridge(), "YamApp");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        if (b != null) web.restoreState(b);
        else web.loadUrl(HOME);
    }

    @Override
    protected void onSaveInstanceState(Bundle o) {
        super.onSaveInstanceState(o);
        if (web != null) web.saveState(o);
    }

    @Override
    protected void onDestroy() {
        if (bt != null) bt.stop();
        super.onDestroy();
    }

    static boolean ours(Uri u) {
        return u != null && "https".equalsIgnoreCase(u.getScheme()) && "www.yamshopping.com".equalsIgnoreCase(u.getHost());
    }

    /** אירוע מהבלוטות' לאתר */
    @Override
    public void js(String json) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript("window.offBt&&offBt(" + json + ")", null); });
    }

    class Client extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
            WebResourceResponse r = Offline.serve(OfflineActivity.this, req.getUrl());
            if (r != null) return r;
            // כל השאר (שרת, תמונות מבחוץ) — אין אינטרנט באפליקציה הזו: עונים מיד "לא נמצא" במקום לחכות
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0]));
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (ours(u)) return false;
            // 🔒 אין יציאה החוצה: לא דפדפן, לא קישורים, לא מייל. רק SMS (שליחת קוד הסנכרון) וחיוג — שניהם בלי אינטרנט
            String sc = u == null ? "" : String.valueOf(u.getScheme()).toLowerCase(java.util.Locale.ROOT);
            if (sc.equals("sms") || sc.equals("smsto") || sc.equals("tel")) {
                try { startActivity(new Intent(sc.equals("tel") ? Intent.ACTION_DIAL : Intent.ACTION_SENDTO, u)); } catch (ActivityNotFoundException ignored) { }
            }
            return true;
        }

        @Override
        public boolean onRenderProcessGone(WebView v, android.webkit.RenderProcessGoneDetail d) {
            Crash.rendererGone(OfflineActivity.this, d != null && d.didCrash());
            recreate();
            return true;
        }
    }

    class Chrome extends WebChromeClient {
        // מצלמה — רק לסריקת קוד QR של הסנכרון ולסריקת ברקוד
        @Override
        public void onPermissionRequest(PermissionRequest req) {
            boolean cam = false;
            for (String r : req.getResources()) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) cam = true;
            if (!cam || !ours(req.getOrigin())) { req.deny(); return; }
            if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                req.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                return;
            }
            if (pendingCam != null) { try { pendingCam.deny(); } catch (RuntimeException ignored) { } }
            pendingCam = req;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAM);
        }

        // בחירת קובץ (שחזור גיבוי, תמונה)
        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (fileCb != null) fileCb.onReceiveValue(null);
            fileCb = cb;
            try {
                startActivityForResult(Intent.createChooser(p.createIntent(), null), REQ_FILE);
                return true;
            } catch (ActivityNotFoundException e) {
                fileCb = null;
                return false;
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        if (code == REQ_CAM) {
            PermissionRequest r = pendingCam;
            pendingCam = null;
            if (r == null) return;
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) r.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else r.deny();
        } else if (code == Bt.REQ_PERM) {
            bt.onPermission();
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        if (bt.onResult(code)) return;
        if (code == REQ_FILE) {
            ValueCallback<Uri[]> cb = fileCb;
            fileCb = null;
            if (cb != null) cb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // קודם סוגרים חלון פתוח באתר (כמו באפליקציה הרגילה), ואם אין — חוזרים אחורה או יוצאים
        web.evaluateJavascript(Place.BACK_JS, r -> {
            if ("true".equals(r)) return;
            if (web.canGoBack()) web.goBack(); else finish();
        });
    }

    class Bridge {
        @JavascriptInterface
        public String appInfo() {
            try {
                JSONObject o = new JSONObject();
                o.put("offline", true);
                o.put("offApp", true);
                o.put("ver", VER);
                o.put("model", Build.MODEL == null ? "" : Build.MODEL);
                o.put("android", Build.VERSION.RELEASE);
                return o.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public String lastCrash() {
            return Crash.take(getApplicationContext());
        }

        @JavascriptInterface
        public void setBars(String hex) {
            if (hex == null || !hex.matches("#[0-9a-fA-F]{6}")) return;
            final int c = Color.parseColor(hex);
            runOnUiThread(() -> getWindow().setStatusBarColor(c));
        }

        @JavascriptInterface
        public void buzz(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v == null) return;
                int d = Math.max(10, Math.min(400, ms));
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void keepScreen(boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        /** ✉️ שליחת קוד הסנכרון — רק באפליקציית ה-SMS של הטלפון (לא בחירת אפליקציה, כדי שלא תהיה דרך לאפליקציות עם אינטרנט) */
        @JavascriptInterface
        public void shareText(String text) {
            if (text == null || text.isEmpty() || text.length() > 20000) return;
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:"));
                i.putExtra("sms_body", text);
                try {
                    startActivity(i);
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(OfflineActivity.this, "אין בטלפון אפליקציה לשליחה", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public String btState() {
            return bt.state();
        }

        @JavascriptInterface
        public void btListen(String code, boolean visible) {
            runOnUiThread(() -> bt.listen(code, visible));
        }

        @JavascriptInterface
        public void btJoin(String code) {
            runOnUiThread(() -> bt.join(code));
        }

        @JavascriptInterface
        public void btConnect(String addr, String code) {
            runOnUiThread(() -> bt.connect(addr, code));
        }

        /** הודעה בערוץ הפתוח לטלפון השני (סנכרון חי) */
        @JavascriptInterface
        public boolean btSend(String text) {
            return bt.send(text);
        }

        @JavascriptInterface
        public void btStop() {
            runOnUiThread(() -> bt.stop());
        }
    }
}
