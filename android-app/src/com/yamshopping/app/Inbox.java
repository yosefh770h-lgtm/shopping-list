package com.yamshopping.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Person;
import android.app.RemoteInput;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.Color;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.security.SecureRandom;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * 💬 הודעות מצוות האתר כהתראה בסגנון צ'אט: קופצת למעלה, מופיעה תחת "שיחות",
 * ואפשר "השב" ו"סימון כנקרא" ישר מההתראה — גם כשהאפליקציה סגורה.
 * הטלפון מזוהה בשרת רק במזהה סודי אקראי שנוצר כאן, והאתר מצמיד אותו לחשבון אחרי הכניסה.
 */
final class Inbox {
    static final String CH_MESSAGES = "messages";
    static final int NOTIF_ID = 6650;
    static final String SHORTCUT = "team_chat";
    static final String KEY_REPLY = "reply";
    static final String ACTION_REPLY = "com.yamshopping.app.REPLY", ACTION_READ = "com.yamshopping.app.READ";
    static final String CHAT_URL = CheckJob.SITE + "/?openchat=1";

    private Inbox() {}

    static synchronized String token(Context c) {
        SharedPreferences p = CheckJob.prefs(c);
        String t = p.getString("dev_token", "");
        if (t.length() == 48) return t;
        byte[] b = new byte[24];
        new SecureRandom().nextBytes(b);
        StringBuilder s = new StringBuilder();
        for (byte x : b) s.append(String.format(Locale.ROOT, "%02x", x));
        t = s.toString();
        p.edit().putString("dev_token", t).apply();
        return t;
    }

    static void channel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        // חשיבות גבוהה = קופצת בראש המסך, כמו הודעה מאפליקציית צ'אט
        NotificationChannel ch = new NotificationChannel(CH_MESSAGES, "הודעות מצוות האתר", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("כשצוות ים שופינג עונה לך בצ'אט");
        ch.setShowBadge(true);
        nm.createNotificationChannel(ch);
    }

    /** בדיקה ברקע: הודעות חדשות מהצוות */
    static void check(Context c) {
        try {
            retryRead(c);
            JSONObject body = new JSONObject().put("p_token", token(c));
            JSONArray a = new JSONArray(CheckJob.post(CheckJob.SB_URL + "/rest/v1/rpc/app_inbox", body.toString()));
            List<Msg> list = new ArrayList<>();
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                if (wasRead(c, o.optString("id"))) continue;
                list.add(new Msg(o.optString("id"), o.optString("body"), o.optString("author_name"), time(o.optString("created_at"))));
            }
            Collections.reverse(list); // מהישנה לחדשה
            show(c, list, null);
        } catch (Exception ignored) {
        }
    }

    /** הודעה שהאתר מצא כשהאפליקציה פתוחה — אותה התראה, בלי כפילות */
    static void fromSite(Context c, String id, String text) {
        // כבר סימנו "נקרא" מההתראה — לא מקפיצים אותה שוב כשנכנסים לאפליקציה
        if (wasRead(c, id)) return;
        List<Msg> list = new ArrayList<>(load(c));
        for (Msg m : list) if (m.id.equals(id)) return;
        list.add(new Msg(id, text, "", System.currentTimeMillis()));
        show(c, list, null);
    }

    static final class Msg {
        final String id, text, author;
        final long at;
        Msg(String id, String text, String author, long at) { this.id = id; this.text = text; this.author = author; this.at = at; }
    }

    static long time(String iso) {
        try {
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.ROOT);
            f.setTimeZone(TimeZone.getTimeZone("UTC"));
            return f.parse(iso.substring(0, 19)).getTime();
        } catch (Exception e) {
            return System.currentTimeMillis();
        }
    }

    static List<Msg> load(Context c) {
        List<Msg> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(CheckJob.prefs(c).getString("inbox_shown", "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                out.add(new Msg(o.optString("id"), o.optString("t"), o.optString("a"), o.optLong("at")));
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    static void save(Context c, List<Msg> list) {
        JSONArray a = new JSONArray();
        try {
            for (Msg m : list) a.put(new JSONObject().put("id", m.id).put("t", m.text).put("a", m.author).put("at", m.at));
        } catch (Exception ignored) {
        }
        CheckJob.prefs(c).edit().putString("inbox_shown", a.toString()).apply();
    }

    /**
     * מציג את השיחה. list = ההודעות שלא נקראו. מתריעים (קופץ + צליל) רק כשיש הודעה שעוד לא הוצגה.
     * myReply != null — אחרי "השב": מוסיפים את התשובה לשיחה בשקט.
     */
    static void show(Context c, List<Msg> list, String myReply) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (list.isEmpty() && myReply == null) {
            // הכל נקרא (למשל באתר) — מורידים את ההתראה
            if (!load(c).isEmpty()) { nm.cancel(NOTIF_ID); save(c, list); Badge.refresh(c); }
            return;
        }
        boolean fresh = false;
        List<Msg> old = load(c);
        for (Msg m : list) {
            boolean seen = false;
            for (Msg o : old) if (o.id.equals(m.id)) { seen = true; break; }
            if (!seen) fresh = true;
        }
        if (!fresh && myReply == null) return;
        if (list.size() > 6) list = list.subList(list.size() - 6, list.size());
        save(c, new ArrayList<>(list));
        if (!Notifier.allowed(c)) return;
        Notifier.channels(c);
        channel(c);

        Icon logo = Icon.createWithResource(c, c.getApplicationInfo().icon);
        Person team = new Person.Builder().setName("צוות ים שופינג").setIcon(logo).setKey("team").setImportant(true).build();
        Person me = new Person.Builder().setName("את/ה").setKey("me").build();
        Notification.MessagingStyle st = new Notification.MessagingStyle(me).setConversationTitle(null);
        for (Msg m : list) st.addMessage(new Notification.MessagingStyle.Message(m.text, m.at, team));
        if (myReply != null) st.addMessage(new Notification.MessagingStyle.Message(myReply, System.currentTimeMillis(), (Person) null));

        Intent open = new Intent(c, AppActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse(CHAT_URL))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pOpen = PendingIntent.getActivity(c, NOTIF_ID, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // "השב" — כותבים בתוך ההתראה
        Intent ri = new Intent(c, ActionReceiver.class).setAction(ACTION_REPLY);
        int mut = Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0;
        PendingIntent pReply = PendingIntent.getBroadcast(c, 1, ri, PendingIntent.FLAG_UPDATE_CURRENT | mut);
        RemoteInput input = new RemoteInput.Builder(KEY_REPLY).setLabel("כתיבת תשובה לצוות").build();
        Notification.Action reply = new Notification.Action.Builder(Icon.createWithResource(c, android.R.drawable.ic_menu_send), "↩️ השב", pReply)
                .addRemoteInput(input).setAllowGeneratedReplies(true).build();
        Intent mi = new Intent(c, ActionReceiver.class).setAction(ACTION_READ);
        PendingIntent pRead = PendingIntent.getBroadcast(c, 2, mi, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Action read = new Notification.Action.Builder(Icon.createWithResource(c, android.R.drawable.ic_menu_view), "✓ סימון כנקרא", pRead).build();

        shortcut(c, team, logo);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH_MESSAGES) : legacy(c);
        b.setSmallIcon(c.getApplicationInfo().icon)
                .setStyle(st)
                .setColor(Color.parseColor(AppActivity.BRAND))
                .setCategory(Notification.CATEGORY_MESSAGE)
                .setContentIntent(pOpen)
                .setAutoCancel(true)
                .setNumber(list.size())
                .setOnlyAlertOnce(myReply != null)
                .addAction(reply)
                .addAction(read);
        if (Build.VERSION.SDK_INT >= 30) b.setShortcutId(SHORTCUT);
        if (Build.VERSION.SDK_INT < 26) legacyHigh(b);
        try {
            nm.notify(NOTIF_ID, b.build());
        } catch (SecurityException ignored) {
        }
        Badge.refresh(c);
    }

    @SuppressWarnings("deprecation")
    static Notification.Builder legacy(Context c) {
        return new Notification.Builder(c);
    }

    @SuppressWarnings("deprecation")
    static void legacyHigh(Notification.Builder b) {
        b.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL);
    }

    /** "שיחה" אמיתית באנדרואיד 11 ומעלה — ההתראה מופיעה בחלק "שיחות" למעלה */
    static void shortcut(Context c, Person team, Icon logo) {
        if (Build.VERSION.SDK_INT < 30) return;
        try {
            ShortcutManager sm = c.getSystemService(ShortcutManager.class);
            if (sm == null) return;
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(CHAT_URL), c, AppActivity.class);
            ShortcutInfo si = new ShortcutInfo.Builder(c, SHORTCUT).setShortLabel("צוות ים שופינג").setLongLabel("צ'אט עם צוות ים שופינג")
                    .setIcon(logo).setIntent(i).setLongLived(true).setPerson(team).build();
            sm.pushDynamicShortcut(si);
        } catch (Exception ignored) {
        }
    }

    static void clear(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(NOTIF_ID);
        save(c, new ArrayList<>());
        Badge.refresh(c);
    }

    /**
     * "✓ סימון כנקרא" מההתראה (מ-2.0): זוכרים בטלפון אילו הודעות נקראו, כך שגם אם השרת עוד לא קיבל
     * את הסימון (למשל בלי קליטה) ההודעה לא קופצת שוב. אם השליחה לשרת נכשלה — מנסים שוב בבדיקה הבאה
     * וכשנכנסים לאפליקציה.
     */
    static void markRead(Context c) {
        SharedPreferences p = CheckJob.prefs(c);
        try {
            JSONArray r = new JSONArray(p.getString("inbox_read", "[]"));
            for (Msg m : load(c)) r.put(m.id);
            while (r.length() > 40) r.remove(0);
            p.edit().putString("inbox_read", r.toString()).putBoolean("inbox_read_pending", true).apply();
        } catch (Exception ignored) {
        }
        clear(c);
        retryRead(c);
    }

    static boolean wasRead(Context c, String id) {
        try {
            JSONArray r = new JSONArray(CheckJob.prefs(c).getString("inbox_read", "[]"));
            for (int i = 0; i < r.length(); i++) if (r.optString(i).equals(id)) return true;
        } catch (Exception ignored) {
        }
        return false;
    }

    static void retryRead(Context c) {
        SharedPreferences p = CheckJob.prefs(c);
        if (!p.getBoolean("inbox_read_pending", false)) return;
        try {
            CheckJob.post(CheckJob.SB_URL + "/rest/v1/rpc/app_inbox_read", new JSONObject().put("p_token", token(c)).toString());
            p.edit().putBoolean("inbox_read_pending", false).apply();
        } catch (Exception ignored) {
        }
    }
}
