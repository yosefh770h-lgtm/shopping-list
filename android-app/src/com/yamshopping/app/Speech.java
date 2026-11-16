package com.yamshopping.app;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.widget.Toast;

import java.util.ArrayList;

import org.json.JSONObject;

/**
 * 🎤 הקלטה קולית ("רשימה קולית") בתוך האפליקציה.
 * בחלון האתר באפליקציה הדפדפן לא מקליט בעצמו, ולכן האתר מעביר את ההקלטה לכאן (YamApp.speechStart)
 * ומקבל בחזרה את מה שנשמע (window.__yamSR) — בדיוק כמו SpeechRecognition של הדפדפן.
 * משתמשים בזיהוי הדיבור של הטלפון (בדרך כלל של גוגל). אם אין שירות כזה — חלון הדיבור של גוגל.
 */
class Speech implements RecognitionListener {
    static final int REQ_MIC = 8, REQ_INTENT = 9;

    final AppActivity a;
    SpeechRecognizer sr;
    int id;              // מספר ההקלטה שהאתר נתן — כדי שתשובה של הקלטה ישנה לא תגיע להקלטה חדשה
    boolean active;      // ההקלטה הזאת פתוחה עכשיו
    boolean interim;     // האתר רוצה גם את מה שנשמע בינתיים (לפני סוף המשפט)
    String lang = "he-IL";
    boolean waitingPerm, beginOnResume, resumed = true;

    Speech(AppActivity a) {
        this.a = a;
    }

    // ---------- מהאתר ----------

    void start(int newId, String newLang, boolean wantInterim) {
        if (active || waitingPerm) cancelQuietly();
        id = newId;
        lang = newLang == null || newLang.isEmpty() ? "he-IL" : newLang;
        interim = wantInterim;
        if (a.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            begin();
            return;
        }
        // כבר סירבו פעם עם "לא לשאול שוב" — הטלפון לא יציג שוב את השאלה, אז פותחים את מסך ההרשאות של האפליקציה
        boolean asked = CheckJob.prefs(a).getBoolean("micAsked", false);
        if (asked && !a.shouldShowRequestPermissionRationale(Manifest.permission.RECORD_AUDIO)) {
            Toast.makeText(a, "כדי להקליט, מאשרים \"מיקרופון\" בהרשאות של האפליקציה", Toast.LENGTH_LONG).show();
            try {
                a.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + a.getPackageName())));
            } catch (ActivityNotFoundException | SecurityException ignored) {
            }
            fail("not-allowed");
            return;
        }
        CheckJob.prefs(a).edit().putBoolean("micAsked", true).apply();
        waitingPerm = true;
        a.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
    }

    void stop(int forId) {
        if (forId != id || !active) return;
        if (sr != null) {
            try { sr.stopListening(); } catch (RuntimeException e) { fail("aborted"); }
        }
    }

    // האתר ביטל — הוא כבר יודע שההקלטה נגמרה, לא שולחים לו כלום
    void abort(int forId) {
        if (forId == id) cancelQuietly();
    }

    // ---------- מהאפליקציה ----------

    void onPermission(boolean granted) {
        if (!waitingPerm) return;
        waitingPerm = false;
        if (!granted) { fail("not-allowed"); return; }
        // חלון ההרשאה עוצר את האפליקציה לרגע; מתחילים להקשיב כשהיא חוזרת לפנים
        if (resumed) begin(); else beginOnResume = true;
    }

    void onResume() {
        resumed = true;
        if (beginOnResume) { beginOnResume = false; begin(); }
    }

    // יצאו מהאפליקציה באמצע הקלטה — מפסיקים להקשיב
    void onPause() {
        resumed = false;
        if (active && sr != null) {
            try { sr.cancel(); } catch (RuntimeException ignored) { }
            finish();
        }
    }

    void destroy() {
        cancelQuietly();
        if (sr != null) { try { sr.destroy(); } catch (RuntimeException ignored) { } sr = null; }
    }

    void onActivityResult(int result, Intent data) {
        if (!active) return;
        ArrayList<String> r = data == null ? null : data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (result == android.app.Activity.RESULT_OK && r != null && !r.isEmpty() && r.get(0) != null) js("final", r.get(0));
        else js("error", "no-speech");
        finish();
    }

    // ---------- ההקלטה ----------

    Intent intent() {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, a.getPackageName());
        return i;
    }

    void begin() {
        if (!resumed) { fail("aborted"); return; }
        active = true;
        if (sr != null) { try { sr.destroy(); } catch (RuntimeException ignored) { } sr = null; }
        try {
            if (SpeechRecognizer.isRecognitionAvailable(a)) {
                sr = SpeechRecognizer.createSpeechRecognizer(a);
                sr.setRecognitionListener(this);
                Intent i = intent();
                i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, interim);
                sr.startListening(i);
                js("start", "");
                return;
            }
        } catch (RuntimeException e) {
            if (sr != null) { try { sr.destroy(); } catch (RuntimeException ignored) { } sr = null; }
        }
        // אין בטלפון שירות זיהוי דיבור שאפשר לחבר ישירות — מנסים את חלון הדיבור של גוגל
        try {
            Intent i = intent();
            i.putExtra(RecognizerIntent.EXTRA_PROMPT, lang.startsWith("he") ? "מדברים עכשיו..." : "Speak now...");
            a.startActivityForResult(i, REQ_INTENT);
            js("start", "");
        } catch (ActivityNotFoundException | SecurityException e) {
            Toast.makeText(a, "בטלפון הזה אין זיהוי דיבור (צריך את אפליקציית Google)", Toast.LENGTH_LONG).show();
            fail("service-not-allowed");
        }
    }

    void cancelQuietly() {
        waitingPerm = false;
        beginOnResume = false;
        if (active && sr != null) { try { sr.cancel(); } catch (RuntimeException ignored) { } }
        active = false;
    }

    void fail(String code) {
        active = true;
        js("error", code);
        finish();
    }

    void finish() {
        if (!active) return;
        active = false;
        js("end", "");
    }

    void js(String type, String text) {
        String s = "window.__yamSR&&__yamSR(" + id + "," + JSONObject.quote(type) + "," + JSONObject.quote(text == null ? "" : text) + ")";
        try { a.web.evaluateJavascript(s, null); } catch (RuntimeException ignored) { }
    }

    static String first(Bundle b) {
        ArrayList<String> r = b == null ? null : b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return r == null || r.isEmpty() || r.get(0) == null ? "" : r.get(0);
    }

    static String webError(int e) {
        switch (e) {
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "no-speech";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "not-allowed";
            case SpeechRecognizer.ERROR_AUDIO:
                return "audio-capture";
            case SpeechRecognizer.ERROR_CLIENT:
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "aborted";
            case 12: // ERROR_LANGUAGE_NOT_SUPPORTED
            case 13: // ERROR_LANGUAGE_UNAVAILABLE
                return "language-not-supported";
            default:
                return "network";
        }
    }

    // ---------- תשובות מזיהוי הדיבור ----------

    @Override public void onReadyForSpeech(Bundle params) { }
    @Override public void onBeginningOfSpeech() { }
    @Override public void onRmsChanged(float rmsdB) { }
    @Override public void onBufferReceived(byte[] buffer) { }
    @Override public void onEndOfSpeech() { }
    @Override public void onEvent(int eventType, Bundle params) { }

    @Override
    public void onPartialResults(Bundle b) {
        if (!active || !interim) return;
        String t = first(b);
        if (!t.isEmpty()) js("partial", t);
    }

    @Override
    public void onResults(Bundle b) {
        if (!active) return;
        String t = first(b);
        if (t.isEmpty()) js("error", "no-speech"); else js("final", t);
        finish();
    }

    @Override
    public void onError(int e) {
        if (!active) return;
        js("error", webError(e));
        finish();
    }
}
