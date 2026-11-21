package com.yamshopping.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.json.JSONObject;

/**
 * חלון שפותח את האתר החי (yamshopping.com), כך שכל עדכון באתר מגיע מיד לאפליקציה.
 * מה שהחלון מוסיף על דפדפן רגיל: מצלמה לברקוד, מיקום, הורדת קבצים (גיבוי / CSV),
 * קישורים חיצוניים (וויז, וואטסאפ, מייל, טלפון) שנפתחים באפליקציות שלהם, ומסך "אין אינטרנט".
 */
public class AppActivity extends Activity {
    // ישר ל-www: הכתובת בלי www רק מפנה ל-www, ובלי אינטרנט ההפניה לא נטענת — וכך לא מגיעים לעותק השמור של האתר
    static final String HOME = "https://www.yamshopping.com/?source=android";
    static final String BRAND = "#1E3A5F"; // עיצוב 2.0: כחול כהה
    static final int REQ_WEB_PERMS = 1, REQ_GEO = 2, REQ_STORAGE = 3, REQ_FILE = 4, REQ_NOTIF = 5, REQ_CAPTURE = 6, REQ_CAPTURE_PERM = 7;
    static final int MAX_DOWNLOAD_BYTES = 30 * 1024 * 1024;

    // בתוך האפליקציה הדפים מקבלים סימון בדפדפן, כדי שהאתר ידע (למשל להסביר שכניסה עם גוגל לא עובדת כאן)
    static final String UA_MARK = " YamShoppingApp/2.1";

    // החלון הפתוח כרגע — כדי שהתקנת העדכון (שרצה ברקע) תוכל לדווח לאתר איפה היא עומדת
    static volatile AppActivity current;
    boolean pendingInstall, pendingBattery;
    // 🔴 המספר על אייקון האפליקציה — מה שהאתר דיווח אחרון
    final android.os.Handler ui = new android.os.Handler(android.os.Looper.getMainLooper());
    volatile int badgeN;
    final Runnable badgeRun = () -> {
        final android.content.Context app = getApplicationContext();
        final int n = badgeN;
        new Thread(() -> Badge.site(app, n), "yam-badge").start();
    };

    // הורדות blob: (גיבוי, CSV) — מעבירים לאפליקציה את התוכן כדי לשמור אותו בתיקיית ההורדות.
    // את הקובץ קוראים מהזיכרון ולא עם fetch, כי מדיניות האבטחה של האתר (CSP) חוסמת fetch ל-blob:
    static final String DOWNLOAD_JS = "(function(){if(window.__yamDl)return;window.__yamDl=1;"
            + "var blobs={},cu=URL.createObjectURL.bind(URL),rv=URL.revokeObjectURL.bind(URL);"
            + "URL.createObjectURL=function(o){var u=cu(o);if(o instanceof Blob)blobs[u]=o;return u;};"
            + "URL.revokeObjectURL=function(u){setTimeout(function(){delete blobs[u];rv(u);},60000);};"
            + "function send(n,t,b){YamApp.saveFile(n,t||'application/octet-stream',b||'');}"
            + "function grab(a){var h=a.href||'';if(!a.hasAttribute('download'))return false;var n=a.getAttribute('download')||'file';"
            + "if(/^data:/.test(h)){var i=h.indexOf(','),m=h.slice(5,i);"
            + "send(n,m.split(';')[0],/;base64/.test(m)?h.slice(i+1):btoa(unescape(encodeURIComponent(decodeURIComponent(h.slice(i+1))))));return true;}"
            + "if(!/^blob:/.test(h))return false;var b=blobs[h];if(!b){send(n,'','');return true;}"
            + "var fr=new FileReader();fr.onload=function(){var d=fr.result;send(n,b.type,d.slice(d.indexOf(',')+1));};"
            + "fr.onerror=function(){send(n,'','');};fr.readAsDataURL(b);return true;}"
            + "var oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(grab(this))return;return oc.apply(this,arguments);};"
            + "document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[download]');if(a&&grab(a))e.preventDefault();},true);"
            + "})();";

    WebView web;
    ProgressBar bar;
    View errorView, topBar;
    FrameLayout content;

    ValueCallback<Uri[]> fileCallback;
    boolean restorePlace; // 2.0: פתיחה רגילה (לא מקישור/התראה) — חוזרים לאותו מקום ברשימה
    long backAt; // 2.0: מתי לחצו "חזור" בפעם הראשונה כשאין מה לסגור
    boolean pendingPhoto; // תמונת ברקוד שצולמה בזמן שהאפליקציה נסגרה ברקע — נשלחת לאתר כשהוא נטען
    WebChromeClient.FileChooserParams pendingChooser; // מחכה להרשאת מצלמה לפני "לצלם את הברקוד"
    PermissionRequest pendingWebPerm;
    Speech speech;
    Bt bt; // 📡 2.2: סנכרון בבלוטות' עם "רשימת קניות אופליין" או עם טלפון אחר
    String pendingGeoOrigin;
    GeolocationPermissions.Callback pendingGeoCallback;
    String[] pendingSave; // name, mime, base64 — מחכה להרשאת אחסון (אנדרואיד 9 ומטה)

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        current = this;
        Crash.install(this); // 🐞 2.2: קריסה של האפליקציה נשמרת ונשלחת ליומן התקלות בפתיחה הבאה
        speech = new Speech(this);
        bt = new Bt(this, json -> runOnUiThread(() -> { if (web != null) web.evaluateJavascript("window.offBt&&offBt(" + json + ")", null); }));
        Notifier.channels(this);
        CheckJob.schedule(this);
        Wake.arm(this); // 🔋 2.2: גיבוי לבדיקה ברקע
        buildViews();
        setupWebView();
        setupBack();
        watchNetwork();
        Uri link = getIntent() != null ? getIntent().getData() : null;
        restorePlace = link == null;
        if (saved != null && web.restoreState(saved) != null) return;
        showSplash();
        String back = googleReturn(link);
        String in = back != null ? back : Incoming.url(getIntent());
        if (in != null) restorePlace = false;
        web.loadUrl(in != null ? in : HOME);
    }

    // ---------- מסך ----------

    void buildViews() {
        FrameLayout root = new FrameLayout(this);
        // הרקע מאחורי הפס התחתון: בצבע הדף (כהה במצב כהה) — עד שהאתר נטען ומודיע על הצבע שלו
        root.setBackgroundColor(getColor(R.color.page_bg));

        topBar = new View(this);
        topBar.setBackgroundColor(barColor);
        root.addView(topBar, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, Gravity.TOP));

        content = new FrameLayout(this);
        root.addView(content, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        web = new WebView(this);
        content.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        buildPtr();

        bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setVisibility(View.GONE);
        content.addView(bar, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(4), Gravity.TOP));

        errorView = buildErrorView();
        errorView.setVisibility(View.GONE);
        content.addView(errorView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        setContentView(root);
        this.root = root;
        drawBehindSystemBars(root);
        if (night(this)) barColor = getColor(R.color.page_bg);
        applyBarIcons();
        applyNavColor(getColor(R.color.page_bg));
    }

    // ---------- 🎨 מסך פתיחה: כחול כהה מהרגע הראשון, בלי הבזק לבן ----------
    FrameLayout root;
    View splash;
    boolean pageReady, revealing;

    static boolean night(android.content.Context c) {
        return (c.getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES;
    }

    // 🎬 2.1: אנימציית הפתיחה היא של האתר (#yi2 ב-index.html) — אותה אנימציה בדיוק כמו באתר.
    // האפליקציה מראה רק מסך כחול (#1e3a5f, הצבע של האנימציה ושל הדף בזמן הטעינה) עד שהדף מצויר, ואז האתר מנגן אותה.
    // (ב-2.0 הייתה כאן אנימציה נפרדת, שרצה רק בהפעלה מאפס — וראו אותה רק לפעמים)
    void showSplash() {
        View s = new View(this);
        s.setBackgroundColor(getColor(R.color.splash_bg));
        s.setClickable(true);
        root.addView(s, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        splash = s;
        // שורת הסטטוס והפס התחתון בצבע מסך הפתיחה — כל המסך בצבע אחד
        barColor = getColor(R.color.splash_bg);
        applyBarIcons();
        applyNavColor(getColor(R.color.splash_bg));
        // אם האתר מתעכב (קליטה חלשה) — לא מחכים יותר מ-6 שניות. גם אז הדף עצמו כחול עם שלוש נקודות עד שהוא מוכן
        ui.postDelayed(() -> { pageReady = true; maybeReveal(); }, 6000);
    }

    void maybeReveal() {
        if (splash == null || revealing || !pageReady) return;
        revealing = true;
        final View s = splash;
        // רגע קטן, כדי שהאנימציה של האתר כבר תהיה על המסך — בלי הבזק של הדף לפניה
        s.animate().alpha(0f).setStartDelay(120).setDuration(180).withEndAction(() -> {
            root.removeView(s);
            splash = null;
            revealing = false;
            syncNavColor();
        }).start();
    }

    // 🎬 2.1: חוזרים לאפליקציה אחרי זמן ארוך ברקע — האנימציה של האתר מופיעה שוב, כמו בפתיחה
    static final long SPLASH_AGAIN_MS = 30 * 60 * 1000L;
    long pausedAt;

    void splashAgain() {
        long t = pausedAt;
        pausedAt = 0;
        if (t == 0 || System.currentTimeMillis() - t < SPLASH_AGAIN_MS || splash != null) return;
        String u = web.getUrl();
        if (u == null || !isOurPage(Uri.parse(u)) || errorView.getVisibility() == View.VISIBLE) return;
        web.evaluateJavascript("window.yamSplashAgain&&yamSplashAgain()", null);
    }

    // ---------- 🔄 משיכה למטה לרענון: רק כשהדף בראש, ולא כשגוררים מוצר ----------
    // האתר מדווח בתחילת כל נגיעה אם אפשר למשוך (הדף וכל מה שמתחת לאצבע בראש, ולא ידית גרירה / חלון פתוח)
    static final String PTR_JS = "(function(){if(window.__yamPtr)return;window.__yamPtr=1;"
            + "document.addEventListener('touchstart',function(e){var ok=(window.scrollY||document.documentElement.scrollTop||0)<=0&&e.touches.length==1;"
            + "var el=e.target;while(ok&&el&&el.nodeType==1){var cs=getComputedStyle(el);"
            + "if(el.scrollTop>0||el.getAttribute('draggable')=='true'||cs.touchAction=='none'||/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))ok=false;"
            + "if(el.matches&&el.matches('dialog[open],[role=dialog],.modal,.sheet,.drag,.handle,[data-drag]'))ok=false;el=el.parentElement;}"
            + "try{YamApp.ptr(!!ok);}catch(x){}},{passive:true,capture:true});})();";
    volatile boolean ptrOk;
    View ptrView;
    float ptrY0, ptrX0;
    boolean ptrPulling, ptrBusy;

    void buildPtr() {
        FrameLayout c = new FrameLayout(this);
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        bg.setColor(night(this) ? Color.parseColor("#2A3230") : Color.WHITE);
        c.setBackground(bg);
        c.setElevation(dp(6));
        ProgressBar spin = new ProgressBar(this);
        spin.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(Color.parseColor(night(this) ? "#3FBFA6" : "#0B5E55")));
        c.addView(spin, new FrameLayout.LayoutParams(dp(26), dp(26), Gravity.CENTER));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(dp(40), dp(40), Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        c.setVisibility(View.GONE);
        content.addView(c, lp);
        ptrView = c;
    }

    @SuppressWarnings("ClickableViewAccessibility")
    boolean onPtrTouch(android.view.MotionEvent e) {
        if (ptrBusy || ptrView == null) return false;
        float max = dp(90), go = dp(64);
        switch (e.getActionMasked()) {
            case android.view.MotionEvent.ACTION_DOWN:
                ptrY0 = e.getY(); ptrX0 = e.getX(); ptrPulling = false;
                return false;
            case android.view.MotionEvent.ACTION_MOVE: {
                float dy = e.getY() - ptrY0, dx = Math.abs(e.getX() - ptrX0);
                if (!ptrPulling) {
                    if (!ptrOk || web.getScrollY() > 0 || dy < dp(12) || dx > dy) return false;
                    ptrPulling = true;
                    ptrY0 = e.getY();
                    // הדף מפסיק לקבל את המשיכה — כדי שלא ייגרר או ייבחר משהו
                    android.view.MotionEvent cancel = android.view.MotionEvent.obtain(e);
                    cancel.setAction(android.view.MotionEvent.ACTION_CANCEL);
                    web.onTouchEvent(cancel);
                    cancel.recycle();
                    ptrView.setVisibility(View.VISIBLE);
                    dy = 0;
                }
                float d = Math.min(max, Math.max(0, dy) * 0.5f);
                ptrView.setTranslationY(d - dp(40) + dp(12));
                ptrView.setAlpha(Math.min(1f, d / go));
                ptrView.setRotation(d * 3);
                return true;
            }
            case android.view.MotionEvent.ACTION_UP:
            case android.view.MotionEvent.ACTION_CANCEL:
                if (!ptrPulling) return false;
                ptrPulling = false;
                float d = Math.min(max, Math.max(0, e.getY() - ptrY0) * 0.5f);
                if (e.getActionMasked() == android.view.MotionEvent.ACTION_UP && d >= go * 0.75f) {
                    ptrBusy = true;
                    ptrView.animate().translationY(dp(16)).alpha(1f).setDuration(150).start();
                    if (offline && isOnline()) leaveOffline(); else web.reload();
                    // לא מחכים יותר מ-8 שניות
                    ui.postDelayed(this::ptrDone, 8000);
                } else {
                    ptrView.animate().translationY(-dp(40)).alpha(0f).setDuration(150).withEndAction(() -> ptrView.setVisibility(View.GONE)).start();
                }
                return true;
        }
        return ptrPulling;
    }

    void ptrDone() {
        if (!ptrBusy || ptrView == null) return;
        ptrBusy = false;
        ptrView.animate().translationY(-dp(40)).alpha(0f).setDuration(200).withEndAction(() -> ptrView.setVisibility(View.GONE)).start();
    }

    // ---------- הפס התחתון בצבע הדף (כהה במצב כהה), לפי הרקע של האתר ----------
    int navColor;

    @SuppressWarnings("deprecation")
    void applyNavColor(int c) {
        navColor = c;
        if (root != null) root.setBackgroundColor(c);
        boolean light = Color.luminance(c) > 0.5f;
        getWindow().setNavigationBarColor(c);
        if (Build.VERSION.SDK_INT >= 30) {
            android.view.WindowInsetsController wc = getWindow().getInsetsController();
            if (wc != null) wc.setSystemBarsAppearance(light ? android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS : 0, android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        } else if (Build.VERSION.SDK_INT >= 26 && root != null) {
            int f = root.getSystemUiVisibility();
            root.setSystemUiVisibility(light ? f | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : f & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }
    }

    /** קוראים מהאתר את צבע הרקע של הדף (body), ומעדכנים את הפס התחתון */
    void syncNavColor() {
        if (web == null) return;
        web.evaluateJavascript("(function(){var c=getComputedStyle(document.body).backgroundColor;if(!c||c=='rgba(0, 0, 0, 0)'||c=='transparent')c=getComputedStyle(document.documentElement).backgroundColor;return c;})()", v -> {
            if (v == null || (splash != null && !revealing)) return;
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?").matcher(v);
            if (!m.find()) return;
            if (m.group(4) != null && Float.parseFloat(m.group(4)) < 0.5f) return;
            applyNavColor(Color.rgb(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3))));
        });
    }

    // ---------- צבע שורת הסטטוס: לפי הכותרת של האתר (לבנה בעיצוב 2.0, כהה בלילה) ----------
    int barColor = Color.WHITE;

    @SuppressWarnings("deprecation")
    void applyBarIcons() {
        boolean light = Color.luminance(barColor) > 0.5f;
        if (topBar != null) topBar.setBackgroundColor(barColor);
        if (Build.VERSION.SDK_INT >= 30) {
            android.view.WindowInsetsController wc = getWindow().getInsetsController();
            if (wc != null) wc.setSystemBarsAppearance(light ? android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS : 0, android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
        } else if (Build.VERSION.SDK_INT >= 23 && root != null) {
            int f = root.getSystemUiVisibility();
            root.setSystemUiVisibility(light ? f | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR : f & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }

    View buildErrorView() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(getColor(R.color.page_bg));
        box.setPadding(dp(24), dp(24), dp(24), dp(24));
        box.setClickable(true);

        TextView icon = new TextView(this);
        icon.setText("📡");
        icon.setTextSize(TypedValue.COMPLEX_UNIT_SP, 56);
        icon.setGravity(Gravity.CENTER);
        box.addView(icon);

        TextView msg = new TextView(this);
        msg.setText("אין חיבור לאינטרנט\nבודקים את החיבור ולוחצים \"נסו שוב\"");
        msg.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        msg.setTextColor(Color.parseColor(night(this) ? "#E6E6E6" : "#333333"));
        msg.setGravity(Gravity.CENTER);
        msg.setPadding(0, dp(12), 0, dp(20));
        box.addView(msg);

        Button retry = new Button(this);
        retry.setText("נסו שוב");
        retry.setTextColor(Color.WHITE);
        retry.setBackgroundColor(Color.parseColor(BRAND));
        retry.setOnClickListener(v -> {
            errorView.setVisibility(View.GONE);
            offline = false;
            String u = web.getUrl();
            if (u == null || u.isEmpty() || u.startsWith("about:")) web.loadUrl(HOME); else web.reload();
        });
        box.addView(retry, new LinearLayout.LayoutParams(dp(160), dp(48)));
        return box;
    }

    // מאנדרואיד 15 האפליקציה מצוירת מתחת לשורת הסטטוס; מסדרים את זה בעצמנו בכל הגרסאות
    @SuppressWarnings("deprecation")
    void drawBehindSystemBars(View root) {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            root.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int l, t, r, b;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
                l = bars.left; t = bars.top; r = bars.right; b = Math.max(bars.bottom, ime.bottom);
            } else {
                l = insets.getSystemWindowInsetLeft(); t = insets.getSystemWindowInsetTop();
                r = insets.getSystemWindowInsetRight(); b = insets.getSystemWindowInsetBottom();
            }
            topBar.getLayoutParams().height = t;
            topBar.requestLayout();
            FrameLayout.LayoutParams p = (FrameLayout.LayoutParams) content.getLayoutParams();
            p.setMargins(l, t, r, b);
            content.setLayoutParams(p);
            return Build.VERSION.SDK_INT >= 30 ? WindowInsets.CONSUMED : insets.consumeSystemWindowInsets();
        });
    }

    int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    // ---------- החלון של האתר ----------

    void setupWebView() {
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false); // פרסומות וידאו מתנגנות בלי קול, כמו באתר
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);
        s.setUserAgentString(s.getUserAgentString() + UA_MARK);
        applyTextZoom(s);

        // מצב כהה: הדף כהה גם לפני שהאתר נטען — בלי הבזק לבן
        web.setBackgroundColor(getColor(R.color.page_bg));
        web.setOnTouchListener((v, ev) -> onPtrTouch(ev));
        web.addJavascriptInterface(new Bridge(), "YamApp");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        // קובץ רגיל להורדה (לא blob) — הדפדפן של הטלפון יודע להוריד אותו הכי טוב
        web.setDownloadListener((url, ua, disposition, mime, length) -> {
            if (url != null && (url.startsWith("https:") || url.startsWith("http:"))) openOutside(Uri.parse(url));
        });
    }

    // 2.0: גודל הכתב לפי הגדרות הטלפון — מי שהגדיל את הכתב בטלפון מקבל כתב גדול גם כאן (האתר עצמו מסדר את השורות)
    void applyTextZoom(WebSettings s) {
        float f = getResources().getConfiguration().fontScale;
        int z = Math.round((f > 0 ? f : 1f) * 100);
        z = Math.max(85, Math.min(200, z));
        if (s.getTextZoom() != z) s.setTextZoom(z);
    }

    static boolean isOurHost(String host) {
        if (host == null) return false;
        host = host.toLowerCase(Locale.ROOT);
        return host.equals("yamshopping.com") || host.endsWith(".yamshopping.com");
    }

    static boolean isOurPage(Uri u) {
        return u != null && "https".equalsIgnoreCase(u.getScheme()) && isOurHost(u.getHost());
    }

    // קישור ל-yamshopping.com (בלי www) — נפתח ישר ב-www, כמו שהאתר עובד (וגם בלי אינטרנט, מהעותק השמור)
    static String onWww(Uri u) {
        if (u != null && "yamshopping.com".equalsIgnoreCase(u.getHost()))
            return u.buildUpon().encodedAuthority("www.yamshopping.com").build().toString();
        return u == null ? HOME : u.toString();
    }

    boolean isOnline() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            NetworkInfo ni = cm != null ? cm.getActiveNetworkInfo() : null;
            return ni != null && ni.isConnected();
        } catch (SecurityException e) {
            return true;
        }
    }

    class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            if (!req.isForMainFrame()) return false;
            Uri u = req.getUrl();
            if (isOurPage(u)) return false;
            // כל השאר (וויז, וואטסאפ, מייל, טלפון, אתרים אחרים, כניסה עם גוגל) — באפליקציה המתאימה בטלפון
            openOutside(u);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            bar.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            bar.setVisibility(View.GONE);
            if (!pageReady) { pageReady = true; maybeReveal(); }
            ptrDone();
            Uri u = Uri.parse(url);
            if (isOurPage(u)) { view.evaluateJavascript(DOWNLOAD_JS, null); view.evaluateJavascript(PTR_JS, null); syncNavColor(); }
            if (isOurPage(u)) view.evaluateJavascript(Place.SAVE_JS, null);
            if (isOurPage(u) && restorePlace) { restorePlace = false; view.evaluateJavascript(Place.RESTORE_JS, null); }
            if (isOurPage(u)) BellActions.applyPending(AppActivity.this, view);
            if (isOurPage(u) && pendingPhoto) sendPendingPhoto();
        }

        // הדף קרס (למשל טלפון חלש שנגמר לו הזיכרון באמצע סריקה במצלמה). בלי זה אנדרואיד סוגר את כל האפליקציה;
        // במקום זה בונים חלון חדש וטוענים את האתר מחדש
        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            if (view != web) { try { view.destroy(); } catch (RuntimeException e) { } return true; }
            Crash.rendererGone(AppActivity.this, detail != null && detail.didCrash());
            String url = view.getUrl();
            recreateWebView(url != null && isOurPage(Uri.parse(url)) ? url : HOME);
            Toast.makeText(AppActivity.this, "האתר נטען מחדש", Toast.LENGTH_SHORT).show();
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
            // האתר עובד גם בלי אינטרנט (Service Worker); מסך שגיאה רק כשהדף הראשי לא נטען בכלל
            if (req.isForMainFrame()) mainFailed(req.getUrl());
        }

        // 🧳 2.1: השרת לא זמין (שגיאה 5xx) — כמו בלי אינטרנט, נפתח העותק שבתוך האפליקציה
        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest req, android.webkit.WebResourceResponse res) {
            if (req.isForMainFrame() && res != null && res.getStatusCode() >= 500 && !offline) mainFailed(req.getUrl());
        }

        @Override
        public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            return offline ? Offline.serve(AppActivity.this, req.getUrl()) : null;
        }

        @Override
        public void onPageCommitVisible(WebView view, String url) {
            // 2.1: הדף כבר מצויר (עם אנימציית הפתיחה של האתר) — מורידים את המסך הכחול
            if (!pageReady) { pageReady = true; maybeReveal(); }
        }
    }

    // 🧳 2.1: עותק של האתר בתוך האפליקציה. נטען רק כשהדף הראשי לא נטען (אין אינטרנט ואין עותק שמור של ה-Service Worker,
    // למשל בפתיחה הראשונה אחרי התקנה). הכתובת נשארת www.yamshopping.com — כך הרשימות שנשמרו בטלפון (localStorage) מופיעות.
    // בכל מצב אחר נטען האתר החי, כדי ששינויים באתר ימשיכו להגיע בלי גרסה חדשה
    volatile boolean offline;

    void mainFailed(Uri u) {
        if (!offline && isOurPage(u) && Offline.has(this)) {
            offline = true;
            errorView.setVisibility(View.GONE);
            String url = u.toString();
            ui.post(() -> web.loadUrl(url));
            return;
        }
        bar.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
        if (!pageReady) { pageReady = true; maybeReveal(); }
    }

    // הקליטה חזרה בזמן שהאפליקציה פתוחה על העותק הפנימי — חוזרים לאתר החי (לא באמצע הקלדה; אז זה יקרה בחזרה לאפליקציה)
    ConnectivityManager.NetworkCallback netBack;

    void watchNetwork() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            if (cm == null) return;
            netBack = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(android.net.Network n) {
                    ui.postDelayed(() -> {
                        if (!offline || web == null) return;
                        web.evaluateJavascript("(function(){var a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||document.querySelector('dialog[open]'));})()",
                                r -> { if (!"true".equals(r)) leaveOffline(); });
                    }, 2000);
                }
            };
            cm.registerDefaultNetworkCallback(netBack);
        } catch (Exception e) {
            netBack = null;
        }
    }

    /** האינטרנט חזר ואנחנו על העותק הפנימי — חוזרים לאתר החי */
    void leaveOffline() {
        if (!offline || !isOnline()) return;
        offline = false;
        String u = web.getUrl();
        web.loadUrl(u != null && isOurPage(Uri.parse(u)) ? u : HOME);
    }

    void recreateWebView(String url) {
        WebView old = web;
        speech.cancelQuietly();
        if (pendingWebPerm != null) { try { pendingWebPerm.deny(); } catch (RuntimeException e) { } pendingWebPerm = null; }
        if (pendingGeoCallback != null) { pendingGeoCallback.invoke(pendingGeoOrigin, false, false); pendingGeoCallback = null; pendingGeoOrigin = null; }
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        int at = Math.max(0, content.indexOfChild(old));
        content.removeView(old);
        try { old.destroy(); } catch (RuntimeException e) { }
        web = new WebView(this);
        content.addView(web, at, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setupWebView();
        bar.setVisibility(View.GONE);
        errorView.setVisibility(View.GONE);
        web.loadUrl(url);
    }

    void openOutside(Uri u) {
        try {
            Intent i;
            if ("intent".equalsIgnoreCase(u.getScheme())) {
                i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME);
                // רק אפליקציות שמוכנות להיפתח מקישור, ולא רכיבים פנימיים
                i.addCategory(Intent.CATEGORY_BROWSABLE);
                i.setComponent(null);
                i.setSelector(null);
                if (getPackageManager().resolveActivity(i, 0) == null) {
                    String fallback = i.getStringExtra("browser_fallback_url");
                    if (fallback != null && (fallback.startsWith("https:") || fallback.startsWith("http:"))) {
                        Uri f = Uri.parse(fallback);
                        if (isOurPage(f)) { web.loadUrl(onWww(f)); return; }
                        i = new Intent(Intent.ACTION_VIEW, f);
                    }
                }
            } else {
                i = new Intent(Intent.ACTION_VIEW, u);
                i.addCategory(Intent.CATEGORY_BROWSABLE);
            }
            startActivity(i);
        } catch (ActivityNotFoundException | java.net.URISyntaxException | SecurityException e) {
            Toast.makeText(this, "אין בטלפון אפליקציה שפותחת את הקישור הזה", Toast.LENGTH_SHORT).show();
        }
    }

    class Chrome extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int p) {
            bar.setProgress(p);
            bar.setVisibility(p < 100 ? View.VISIBLE : View.GONE);
        }

        // מצלמה (סריקת ברקוד) ומיקרופון — רק לאתר שלנו
        @Override
        public void onPermissionRequest(PermissionRequest req) {
            if (!isOurPage(req.getOrigin())) { req.deny(); return; }
            List<String> need = new ArrayList<>();
            for (String r : req.getResources()) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) need.add(Manifest.permission.CAMERA);
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) need.add(Manifest.permission.RECORD_AUDIO);
            }
            if (need.isEmpty()) { req.deny(); return; }
            if (pendingWebPerm != null) { try { pendingWebPerm.deny(); } catch (RuntimeException e) { } }
            pendingWebPerm = req;
            if (allGranted(need)) finishWebPerm();
            else requestPermissions(need.toArray(new String[0]), REQ_WEB_PERMS);
        }

        @Override
        public void onPermissionRequestCanceled(PermissionRequest req) {
            if (pendingWebPerm == req) pendingWebPerm = null;
        }

        // מיקום ("קרוב אליי") — רק לאתר שלנו
        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) {
            if (!isOurPage(Uri.parse(origin))) { cb.invoke(origin, false, false); return; }
            if (hasLocation()) { cb.invoke(origin, true, false); return; }
            if (pendingGeoCallback != null) pendingGeoCallback.invoke(pendingGeoOrigin, false, false);
            pendingGeoOrigin = origin;
            pendingGeoCallback = cb;
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_GEO);
        }

        // בחירת קובץ / תמונה (קבלה, תמונת מתכון, קובץ מחירים)
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = cb;
            // "לצלם את הברקוד" (capture): פותחים ישר את המצלמה של הטלפון, בלי וידאו חי באתר
            if (params.isCaptureEnabled() && acceptsImages(params.getAcceptTypes())) {
                pendingChooser = params;
                if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) startCapture();
                else requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAPTURE_PERM);
                return true;
            }
            Intent i = params.createIntent();
            if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            try {
                startActivityForResult(Intent.createChooser(i, null), REQ_FILE);
            } catch (ActivityNotFoundException e) {
                fileCallback = null;
                Toast.makeText(AppActivity.this, "אין בטלפון אפליקציה לבחירת קבצים", Toast.LENGTH_SHORT).show();
                return false;
            }
            return true;
        }
    }

    // תמונה מהמצלמה יכולה להיות 50 מגה-פיקסל; פענוח שלה בתוך הדף הוא מה שמקריס טלפון עם WebView ישן.
    // מקטינים כאן ל-1600 פיקסלים לכל היותר — יותר ממספיק לברקוד
    static boolean shrinkPhoto(File f) {
        try {
            android.graphics.BitmapFactory.Options o = new android.graphics.BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            android.graphics.BitmapFactory.decodeFile(f.getPath(), o);
            int w = o.outWidth, h = o.outHeight;
            if (w <= 0 || h <= 0) return false;
            int max = Math.max(w, h);
            if (max <= 1600) return true;
            int sample = 1;
            while (max / (sample * 2) >= 1600) sample *= 2;
            o = new android.graphics.BitmapFactory.Options();
            o.inSampleSize = sample;
            android.graphics.Bitmap b = android.graphics.BitmapFactory.decodeFile(f.getPath(), o);
            if (b == null) return false;
            float k = 1600f / Math.max(b.getWidth(), b.getHeight());
            if (k < 1f) {
                android.graphics.Bitmap s = android.graphics.Bitmap.createScaledBitmap(b, Math.round(b.getWidth() * k), Math.round(b.getHeight() * k), true);
                if (s != b) { b.recycle(); b = s; }
            }
            try (FileOutputStream out = new FileOutputStream(f)) {
                b.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, out);
            }
            b.recycle();
            return f.length() > 0;
        } catch (Exception | OutOfMemoryError e) {
            return false;
        }
    }

    void sendPendingPhoto() {
        pendingPhoto = false;
        try {
            File f = CaptureProvider.file(this);
            if (f.length() <= 0 || f.length() > 3_000_000) return;
            byte[] data = new byte[(int) f.length()];
            try (java.io.FileInputStream in = new java.io.FileInputStream(f)) {
                int n = 0, r;
                while (n < data.length && (r = in.read(data, n, data.length - n)) > 0) n += r;
            }
            String js = "window.yamAppPhoto&&window.yamAppPhoto('data:image/jpeg;base64," + Base64.encodeToString(data, Base64.NO_WRAP) + "')";
            web.evaluateJavascript(js, null);
        } catch (Exception | OutOfMemoryError e) { }
    }

    static boolean acceptsImages(String[] types) {
        if (types == null || types.length == 0) return true;
        for (String t : types) if (t == null || t.isEmpty() || t.startsWith("image/") || t.equals("*/*")) return true;
        return false;
    }

    // מצלמת הטלפון; אם אין או שלא אישרו מצלמה — חלון בחירת הקבצים הרגיל
    void startCapture() {
        WebChromeClient.FileChooserParams params = pendingChooser;
        pendingChooser = null;
        if (fileCallback == null) return;
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            try {
                File f = CaptureProvider.file(this);
                f.delete();
                Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                cam.putExtra(MediaStore.EXTRA_OUTPUT, CaptureProvider.URI);
                cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                cam.setClipData(android.content.ClipData.newRawUri("", CaptureProvider.URI));
                startActivityForResult(cam, REQ_CAPTURE);
                return;
            } catch (ActivityNotFoundException | SecurityException e) { }
        }
        if (params != null) {
            try { startActivityForResult(Intent.createChooser(params.createIntent(), null), REQ_FILE); return; }
            catch (ActivityNotFoundException e) { }
        }
        fileCallback.onReceiveValue(null);
        fileCallback = null;
    }

    boolean allGranted(List<String> perms) {
        for (String p : perms) if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) return false;
        return true;
    }

    boolean hasLocation() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    void finishWebPerm() {
        PermissionRequest req = pendingWebPerm;
        pendingWebPerm = null;
        if (req == null) return;
        // הבקשה אולי כבר בוטלה (הדף נסגר או נטען מחדש בזמן שחלון ההרשאה היה פתוח) — לא מפילים בגלל זה את האפליקציה
        try {
            List<String> ok = new ArrayList<>();
            for (String r : req.getResources()) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) ok.add(r);
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) ok.add(r);
            }
            if (ok.isEmpty()) req.deny(); else req.grant(ok.toArray(new String[0]));
        } catch (RuntimeException e) { }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        if (code == Bt.REQ_PERM) {
            bt.onPermission();
        } else if (code == Speech.REQ_MIC) {
            speech.onPermission(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
        } else if (code == REQ_WEB_PERMS) {
            finishWebPerm();
        } else if (code == REQ_CAPTURE_PERM) {
            startCapture();
        } else if (code == REQ_GEO) {
            if (pendingGeoCallback != null) pendingGeoCallback.invoke(pendingGeoOrigin, hasLocation(), false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        } else if (code == REQ_NOTIF) {
            tellJs("perm", notifState());
        } else if (code == REQ_STORAGE) {
            String[] p = pendingSave;
            pendingSave = null;
            if (p == null) return;
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) saveFile(p[0], p[1], p[2]);
            else Toast.makeText(this, "בלי הרשאת אחסון אי אפשר לשמור את הקובץ", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        if (code == Speech.REQ_INTENT) { speech.onActivityResult(result, data); return; }
        if (bt.onResult(code)) return;
        if (code == REQ_CAPTURE) {
            ValueCallback<Uri[]> cb = fileCallback;
            fileCallback = null;
            File f = CaptureProvider.file(this);
            boolean ok = result == RESULT_OK && f.length() > 0 && shrinkPhoto(f);
            if (cb != null) { cb.onReceiveValue(ok ? new Uri[]{CaptureProvider.URI} : null); return; }
            // שיאומי וטלפונים דומים סוגרים את האפליקציה ברקע בזמן שהמצלמה פתוחה, ואז הדף נטען מחדש ואין מי שמחכה לתמונה.
            // במקום לאבד אותה — מעבירים אותה לאתר כשהוא מוכן, והוא מחפש בה את הברקוד
            if (ok) { pendingPhoto = true; if (web.getProgress() >= 100) sendPendingPhoto(); }
            return;
        }
        if (code != REQ_FILE) { super.onActivityResult(code, result, data); return; }
        ValueCallback<Uri[]> cb = fileCallback;
        fileCallback = null;
        if (cb == null) return;
        Uri[] uris = null;
        if (result == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                uris = new Uri[n];
                for (int k = 0; k < n; k++) uris[k] = data.getClipData().getItemAt(k).getUri();
            } else if (data.getData() != null) {
                uris = new Uri[]{data.getData()};
            }
        }
        cb.onReceiveValue(uris);
    }

    // ---------- שמירת קבצים שהאתר מוריד ----------

    class Bridge {
        /** 📡 2.2: סנכרון בלי אינטרנט (js/087-offsync.js) — בלוטות' ושליחת קוד הסנכרון. רק מהאתר שלנו */
        @JavascriptInterface
        public String btState() {
            return bt.state();
        }

        @JavascriptInterface
        public void btHost(String pkg) {
            onOurPage(() -> bt.host(pkg));
        }

        @JavascriptInterface
        public void btFind(String pkg) {
            onOurPage(() -> bt.find(pkg));
        }

        @JavascriptInterface
        public void btConnect(String addr, String pkg) {
            onOurPage(() -> bt.connect(addr, pkg));
        }

        @JavascriptInterface
        public void btStop() {
            runOnUiThread(() -> bt.stop());
        }

        @JavascriptInterface
        public void shareText(String text) {
            if (text == null || text.isEmpty()) return;
            onOurPage(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TEXT, text);
                try {
                    startActivity(Intent.createChooser(i, null));
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(AppActivity.this, "אין בטלפון אפליקציה לשליחה", Toast.LENGTH_SHORT).show();
                }
            });
        }

        /** 🐞 2.2: הקריסה האחרונה של האפליקציה (JSON) או "" — האתר שולח אותה ליומן התקלות (js/026.js) */
        @JavascriptInterface
        public String lastCrash() {
            return Crash.take(getApplicationContext());
        }

        /** 🎨 פרו: מחליף את האייקון במסך הבית לפי ערכת הצבעים (sea / sky / mint / lilac / night) */
        @JavascriptInterface
        public void setIcon(String theme) {
            final String t = theme == null ? "" : theme;
            ui.post(() -> {
                try {
                    if (Icons.set(getApplicationContext(), t) && !t.equals("sea"))
                        Toast.makeText(AppActivity.this, "האייקון במסך הבית מתעדכן (בחלק מהטלפונים לוקח כמה שניות)", Toast.LENGTH_LONG).show();
                } catch (Exception ignored) {
                }
            });
        }

        /** צבע שורת הסטטוס, לפי הכותרת של האתר (#rrggbb) */
        @JavascriptInterface
        public void setBars(String hex) {
            if (hex == null || !hex.matches("#[0-9a-fA-F]{6}")) return;
            final int c = Color.parseColor(hex);
            ui.post(() -> { barColor = c; applyBarIcons(); syncNavColor(); });
        }

        /** 🔄 בתחילת כל נגיעה: האם אפשר למשוך כאן לרענון */
        @JavascriptInterface
        public void ptr(boolean ok) {
            ptrOk = ok;
        }

        /** 🧾 2.2: אושר עד (Pairzon) לא עונה לשרת שלנו, אבל כן לטלפון (חיבור רגיל בישראל). מביאים מכאן רק את נתוני הקבלה
         *  מהכתובת המדויקת של האתר (בלי עוגיות, בלי הפניות), ומחזירים לאתר: window.yamReceiptJson(id, טקסט או null) */
        @JavascriptInterface
        public void receiptJson(String url, String id) {
            final String u = url == null ? "" : url, cb = id == null ? "" : id;
            if (!cb.matches("[a-z0-9]{1,20}")) return;
            final boolean ok = u.matches("https://[a-z0-9-]{1,40}\\.pairzon\\.com/v1\\.0/documents/[0-9a-fA-F-]{36}\\?p=\\d{1,10}");
            new Thread(() -> {
                String out = null;
                if (ok) {
                    java.net.HttpURLConnection c = null;
                    try {
                        c = (java.net.HttpURLConnection) new java.net.URL(u).openConnection();
                        c.setInstanceFollowRedirects(false);
                        c.setUseCaches(false);
                        c.setConnectTimeout(10000);
                        c.setReadTimeout(15000);
                        c.setRequestProperty("Accept", "application/json");
                        if (c.getResponseCode() == 200) {
                            java.io.InputStream in = c.getInputStream();
                            java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
                            byte[] b = new byte[16384];
                            int n;
                            while ((n = in.read(b)) > 0) {
                                buf.write(b, 0, n);
                                if (buf.size() > 3_000_000) { buf.reset(); break; }
                            }
                            in.close();
                            if (buf.size() > 0) out = buf.toString("UTF-8");
                        }
                    } catch (Exception ignored) {
                    } finally {
                        if (c != null) c.disconnect();
                    }
                }
                final String js = "window.yamReceiptJson&&yamReceiptJson(" + JSONObject.quote(cb) + "," + (out == null ? "null" : JSONObject.quote(out)) + ")";
                ui.post(() -> { String pu = web.getUrl(); if (pu != null && isOurPage(Uri.parse(pu))) web.evaluateJavascript(js, null); });
            }).start();
        }

        /** גרסת האפליקציה ומה היא יודעת לעשות — האתר בודק כאן אם אפשר לעדכן מתוך האפליקציה */
        @JavascriptInterface
        public String appInfo() {
            try {
                android.content.pm.PackageInfo p = Updater.self(AppActivity.this);
                JSONObject o = new JSONObject();
                o.put("ver", p == null ? "" : p.versionName);
                o.put("code", p == null ? 0 : Updater.versionCode(p));
                o.put("selfUpdate", true);
                o.put("speech", true);
                o.put("inbox", true);
                o.put("release", true);
                o.put("icons", true);
                o.put("keepScreen", true);
                o.put("buzz", true);
                o.put("notif", notifState());
                o.put("battery", Power.state(AppActivity.this)); // 2.1: "ok" / "ask" / "na"; 2.2: גם "blocked"
                o.put("batLost", Power.lost(AppActivity.this)); // 2.2: היה "ללא הגבלות" והטלפון ביטל לבד
                o.put("autostart", Power.xiaomi()); // 2.1: שיאומי — צריך גם "הפעלה אוטומטית"
                o.put("receiptJson", true); // 2.2: קבלת אושר עד נפתחת מהטלפון
                o.put("splash", true); // 2.1: האתר מנגן את אנימציית הפתיחה (גם אחרי זמן ארוך ברקע)
                o.put("offline", Offline.has(AppActivity.this)); // 2.1: עותק של האתר בתוך האפליקציה
                o.put("offlineNow", offline);
                o.put("bg", CheckJob.enabled(AppActivity.this));
                o.put("shabbat", CheckJob.prefs(AppActivity.this).getBoolean("shabbat", true));
                o.put("sdk", Build.VERSION.SDK_INT);
                o.put("model", Build.MANUFACTURER + " " + Build.MODEL);
                return o.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        /** ☀ מצב קנייה: המסך לא נכבה עד שיוצאים ממנו */
        @JavascriptInterface
        public void keepScreen(boolean on) {
            Incoming.keepScreen(AppActivity.this, on);
        }

        /** 📳 רטט קצר — סריקת ברקוד הצליחה */
        @JavascriptInterface
        public void buzz(int ms) {
            Incoming.buzz(AppActivity.this, ms);
        }

        /** 🎤 הקלטה קולית: האתר מבקש להקשיב (id — מספר ההקלטה, lang — שפה, interim — גם מה שנשמע בינתיים) */
        @JavascriptInterface
        public void speechStart(int id, String lang, boolean interim) {
            runOnUiThread(() -> {
                String page = web.getUrl();
                if (page == null || !isOurPage(Uri.parse(page))) return;
                speech.start(id, lang, interim);
            });
        }

        @JavascriptInterface
        public void speechStop(int id) {
            runOnUiThread(() -> speech.stop(id));
        }

        @JavascriptInterface
        public void speechAbort(int id) {
            runOnUiThread(() -> speech.abort(id));
        }

        /** 🚀 איזו גרסה מגיעה לטלפון הזה (כללית, או ששוחררה בבק אופיס לחשבון). התשובה מגיעה לאתר ב-yamNat66("release", …) */
        @JavascriptInterface
        public void releaseCheck() {
            new Thread(() -> {
                Release.Info r = Release.best(AppActivity.this);
                String json = "{}";
                try {
                    JSONObject o = new JSONObject();
                    if (r != null) o.put("version", r.version).put("notes", r.notes);
                    json = o.toString();
                } catch (Exception ignored) {
                }
                final String out = json;
                runOnUiThread(() -> tellJs("release", out));
            }, "yam-release").start();
        }

        @JavascriptInterface
        public void installUpdate() {
            runOnUiThread(() -> {
                String page = web.getUrl();
                if (page == null || !isOurPage(Uri.parse(page))) return;
                startUpdate();
            });
        }

        @JavascriptInterface
        public String notifState() {
            return AppActivity.this.notifState();
        }

        @JavascriptInterface
        public void askNotify() {
            runOnUiThread(() -> {
                if (Notifier.allowed(AppActivity.this)) { tellJs("perm", "granted"); return; }
                if (Build.VERSION.SDK_INT >= 33) {
                    getSharedPreferences(CheckJob.PREFS, MODE_PRIVATE).edit().putBoolean("asked", true).apply();
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
                } else {
                    // ההתראות כובו בהגדרות הטלפון — פותחים את המסך שמדליקים בו
                    try {
                        startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName()));
                    } catch (Exception ignored) {
                    }
                    tellJs("perm", "denied");
                }
            });
        }

        /** 🔋 2.1: לבקש שהטלפון לא יעצור את הבדיקה ברקע בחיסכון סוללה. התשובה מגיעה לאתר ב-yamNat66("battery", "ok"/"ask"/"na") */
        @JavascriptInterface
        public void askBattery() {
            runOnUiThread(() -> {
                String page = web.getUrl();
                if (page == null || !isOurPage(Uri.parse(page))) return;
                if (Power.ask(AppActivity.this)) pendingBattery = true;
                else tellJs("battery", Power.state(AppActivity.this));
            });
        }

        /** 🔋 2.1: שיאומי — פותח את המסך "הפעלה אוטומטית" (או את פרטי האפליקציה בהגדרות, אם המסך לא נמצא) */
        @JavascriptInterface
        public void openAutostart() {
            runOnUiThread(() -> {
                String page = web.getUrl();
                if (page == null || !isOurPage(Uri.parse(page))) return;
                Power.openAutostart(AppActivity.this);
            });
        }

        /** התראה בטלפון (מהפעמון שבאתר: הוזלות, מבצעים, תזכורות) */
        @JavascriptInterface
        public void notify(String title, String body, String tag, String url) {
            runOnUiThread(() -> {
                String page = web.getUrl();
                if (page == null || !isOurPage(Uri.parse(page))) return;
                int id = 7000 + ((tag == null || tag.isEmpty() ? String.valueOf(System.currentTimeMillis()) : tag).hashCode() & 0xfff);
                String u = url == null || url.isEmpty() ? HOME : url;
                if (!u.startsWith("https:")) u = "https://www.yamshopping.com/" + u.replaceFirst("^\\.?/", "");
                // הודעה מהצוות — להתראת השיחה (אותה התראה כמו מהבדיקה ברקע, בלי כפילות)
                if (tag != null && tag.startsWith("chat:")) { Inbox.fromSite(AppActivity.this, tag.substring(5), body == null ? "" : body); return; }
                BellActions.show(AppActivity.this, id, title, body, u, tag);
            });
        }

        /** 💬 הודעות מהצוות גם כשהאפליקציה סגורה: האתר מבקש את המזהה של הטלפון כדי להצמיד אותו לחשבון.
         *  המזהה נשלח רק לדף הראשי של האתר שלנו (לא לחלונות פנימיים) */
        @JavascriptInterface
        public void inboxLink() {
            runOnUiThread(() -> {
                String page = web.getUrl();
                if (page == null || !isOurPage(Uri.parse(page))) return;
                tellJs("token", Inbox.token(AppActivity.this));
            });
        }

        /** אחרי שהאתר הצמיד את הטלפון לחשבון (true), או ביציאה מהחשבון (false) */
        @JavascriptInterface
        public void inboxOn(boolean on) {
            CheckJob.prefs(AppActivity.this).edit().putBoolean("inbox", on).apply();
            if (!on) Inbox.clear(AppActivity.this);
        }

        /** פתחו את הצ'אט באתר — ההתראה כבר לא צריכה להופיע */
        @JavascriptInterface
        public void clearChat() {
            Inbox.clear(AppActivity.this);
        }

        /** 🔴 כמה לא נקרא בפעמון שבאתר — בשביל המספר על אייקון האפליקציה (מ-2.0).
         *  מחכים רגע, כדי שהתראה שהאתר שולח באותו רגע כבר תופיע ולא תיספר פעמיים */
        @JavascriptInterface
        public void setBadge(int n) {
            badgeN = Math.max(0, n);
            ui.removeCallbacks(badgeRun);
            ui.postDelayed(badgeRun, 1500);
        }

        /** התראות ברקע (גרסה חדשה, מה חדש, ערב שבת) — מכבים ומדליקים מהאתר */
        @JavascriptInterface
        public void setBg(boolean on, boolean shabbat) {
            CheckJob.prefs(AppActivity.this).edit().putBoolean("on", on).putBoolean("shabbat", shabbat).apply();
        }

        @JavascriptInterface
        public void saveFile(String name, String mime, String base64) {
            runOnUiThread(() -> {
                String page = web.getUrl();
                if (page == null || !isOurPage(Uri.parse(page))) return;
                if (base64 == null || base64.isEmpty()) {
                    Toast.makeText(AppActivity.this, "ההורדה נכשלה — נסו שוב", Toast.LENGTH_LONG).show();
                    return;
                }
                if (base64.length() > MAX_DOWNLOAD_BYTES / 3 * 4 + 4) {
                    Toast.makeText(AppActivity.this, "הקובץ גדול מדי להורדה באפליקציה", Toast.LENGTH_LONG).show();
                    return;
                }
                if (Build.VERSION.SDK_INT < 29 && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    pendingSave = new String[]{name, mime, base64};
                    requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
                    return;
                }
                saveFile(name, mime, base64);
            });
        }
    }

    // ---------- עדכון האפליקציה והתראות — מהאתר ----------

    /** מעביר לאתר מה קורה עם העדכון: download / verify / install / confirm / done / error / perm / latest / cancel */
    static void report(String state, int pct, String msg) {
        AppActivity a = current;
        if (a == null) return;
        String js = "window.yamNat66&&yamNat66('update'," + JSONObject.quote(state) + "," + pct + "," + JSONObject.quote(msg == null ? "" : msg) + ")";
        a.runOnUiThread(() -> { if (a.web != null) a.web.evaluateJavascript(js, null); });
    }

    void startUpdate() {
        if (!Updater.canInstall(this)) {
            // אנדרואיד 8 ומעלה: פעם אחת מאשרים "לאפשר התקנה ממקור זה", ואז העדכון ממשיך לבד
            pendingInstall = true;
            report("perm", 0, "");
            try {
                startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())));
            } catch (Exception e) {
                pendingInstall = false;
                report("error", 0, "no_settings");
            }
            return;
        }
        Updater.start(this, AppActivity::report);
    }

    String notifState() {
        if (Notifier.allowed(this)) return "granted";
        if (Build.VERSION.SDK_INT >= 33 && getSharedPreferences(CheckJob.PREFS, MODE_PRIVATE).getBoolean("asked", false)
                && !shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) return "denied";
        if (Build.VERSION.SDK_INT < 33) return "denied"; // כובו בהגדרות הטלפון
        return "default";
    }

    void tellJs(String kind, String value) {
        String js = "window.yamNat66&&yamNat66(" + JSONObject.quote(kind) + "," + JSONObject.quote(value) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    static String safeName(String name) {
        String n = name == null ? "" : name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (n.isEmpty() || n.startsWith(".")) n = "file" + n;
        return n.length() > 100 ? n.substring(n.length() - 100) : n;
    }

    @SuppressWarnings("deprecation")
    void onOurPage(Runnable r) {
        runOnUiThread(() -> {
            String page = web == null ? null : web.getUrl();
            if (page != null && isOurPage(Uri.parse(page))) r.run();
        });
    }

    void saveFile(String name, String mime, String base64) {
        String file = safeName(name);
        if (mime == null || mime.isEmpty()) mime = "application/octet-stream";
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, file);
                v.put(MediaStore.Downloads.MIME_TYPE, mime);
                v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (uri == null) throw new java.io.IOException("insert failed");
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new java.io.IOException("no stream");
                    out.write(bytes);
                }
            } else {
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists() && !dir.mkdirs()) throw new java.io.IOException("no downloads folder");
                File f = new File(dir, file);
                for (int k = 1; f.exists(); k++) f = new File(dir, k + "-" + file);
                try (FileOutputStream out = new FileOutputStream(f)) {
                    out.write(bytes);
                }
                android.media.MediaScannerConnection.scanFile(this, new String[]{f.getAbsolutePath()}, new String[]{mime}, null);
            }
            Toast.makeText(this, "✅ נשמר בתיקיית ההורדות: " + file, Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "שמירת הקובץ נכשלה", Toast.LENGTH_LONG).show();
        }
    }

    // ---------- מחזור חיים ----------

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String back = googleReturn(intent.getData());
        String in = back != null ? back : Incoming.url(intent);
        if (in != null) web.loadUrl(in);
    }

    // 🔵 חזרה מכניסה עם גוגל בדפדפן: yamshopping://auth?code=... — האתר משלים את הכניסה עם הסוד ששמור רק כאן (PKCE)
    static String googleReturn(Uri u) {
        if (u == null || !"yamshopping".equalsIgnoreCase(u.getScheme()) || !"auth".equalsIgnoreCase(u.getHost())) return null;
        String code = null;
        try { code = u.getQueryParameter("code"); } catch (RuntimeException e) { }
        if (code != null && code.matches("[A-Za-z0-9_-]{6,200}")) return HOME + "&app_code=" + code;
        return HOME + "&app_auth_err=1";
    }

    // כפתור "חזרה" חוזר אחורה באתר, ורק כשאין לאן — יוצא מהאפליקציה
    void setupBack() {
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
        }
    }

    // 2.0: "חזור" חכם — קודם סוגר חלון או תפריט פתוח באתר, אחר כך חוזר אחורה,
    // ורק כשאין שום דבר פתוח: "לחץ שוב על 'חזור' כדי לצאת" (לחיצה שנייה תוך 2 שניות יוצאת)
    void goBack() {
        if (errorView.getVisibility() == View.VISIBLE || web.getUrl() == null || !isOurPage(Uri.parse(web.getUrl()))) { backFallback(); return; }
        web.evaluateJavascript(Place.BACK_JS, r -> { if (!"true".equals(r)) backFallback(); });
    }

    void backFallback() {
        if (web.canGoBack()) {
            errorView.setVisibility(View.GONE);
            web.goBack();
            return;
        }
        long now = System.currentTimeMillis();
        if (now - backAt < 2000) { finish(); return; }
        backAt = now;
        Toast.makeText(this, "לחץ שוב על \"חזור\" כדי לצאת", Toast.LENGTH_SHORT).show();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        goBack();
    }

    @Override
    protected void onResume() {
        super.onResume();
        current = this;
        web.onResume();
        applyTextZoom(web.getSettings());
        BellActions.applyPending(this, web);
        speech.onResume();
        splashAgain();
        // "סימון כנקרא" מההתראה שלא הגיע לשרת (למשל בלי קליטה) — שולחים שוב
        final android.content.Context app = getApplicationContext();
        new Thread(() -> Inbox.retryRead(app), "yam-read").start();
        // 🔋 חזרו מחלון "חיסכון סוללה" — מדווחים לאתר מה נבחר
        if (pendingBattery) {
            pendingBattery = false;
            tellJs("battery", Power.state(this));
        }
        // חזרו מ"לאפשר התקנה ממקור זה" — ממשיכים את העדכון לבד
        if (pendingInstall) {
            pendingInstall = false;
            if (Updater.canInstall(this)) Updater.start(this, AppActivity::report); else report("cancel", 0, "");
        }
        // חזרו לאפליקציה אחרי שהאינטרנט חזר — טוענים מחדש בלי ללחוץ
        if (offline) leaveOffline();
        else if (errorView.getVisibility() == View.VISIBLE && isOnline()) {
            errorView.setVisibility(View.GONE);
            web.reload();
        }
    }

    @Override
    protected void onPause() {
        pausedAt = System.currentTimeMillis();
        speech.onPause();
        web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        if (bt != null) bt.stop();
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (current == this) current = null;
        if (netBack != null) {
            try { ((ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE)).unregisterNetworkCallback(netBack); } catch (Exception ignored) { }
        }
        speech.destroy();
        web.destroy();
        super.onDestroy();
    }
}
