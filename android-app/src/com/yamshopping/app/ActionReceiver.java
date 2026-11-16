package com.yamshopping.app;

import android.app.RemoteInput;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import org.json.JSONObject;

import java.util.ArrayList;

/** הכפתורים שבהתראת ההודעות: "השב" (כותבים בתוך ההתראה) ו"סימון כנקרא" — בלי לפתוח את האפליקציה */
public class ActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        final Context c = ctx.getApplicationContext();
        // 2.0: "סמן כנקרא" / "הוסף לרשימה" בהתראות של הפעמון והתזכורות
        if (BellActions.ACTION_READ.equals(intent.getAction()) || BellActions.ACTION_ADD.equals(intent.getAction())) { BellActions.handle(c, intent); return; }
        final PendingResult pr = goAsync();
        final String action = intent.getAction();
        Bundle in = RemoteInput.getResultsFromIntent(intent);
        final CharSequence text = in == null ? null : in.getCharSequence(Inbox.KEY_REPLY);
        new Thread(() -> {
            try {
                String tok = Inbox.token(c);
                if (Inbox.ACTION_REPLY.equals(action) && text != null && text.toString().trim().length() > 0) {
                    String r = CheckJob.post(CheckJob.SB_URL + "/rest/v1/rpc/app_inbox_reply",
                            new JSONObject().put("p_token", tok).put("p_body", text.toString().trim()).toString());
                    if (r.contains("ok")) {
                        // התשובה נשלחה: מראים אותה בשיחה בשקט, ואז ההתראה נעלמת אחרי רגע
                        Inbox.show(c, new ArrayList<>(Inbox.load(c)), text.toString().trim());
                        Thread.sleep(2500);
                        Inbox.clear(c);
                    } else {
                        Notifier.showUrl(c, Notifier.CH_GENERAL, 6651, "⚠️ התשובה לא נשלחה", "פותחים את האפליקציה וכותבים בצ'אט", Inbox.CHAT_URL);
                    }
                } else if (Inbox.ACTION_READ.equals(action)) {
                    Inbox.markRead(c);
                }
            } catch (Exception e) {
                if (Inbox.ACTION_REPLY.equals(action))
                    Notifier.showUrl(c, Notifier.CH_GENERAL, 6651, "⚠️ התשובה לא נשלחה", "אין אינטרנט? פותחים את האפליקציה וכותבים בצ'אט", Inbox.CHAT_URL);
            } finally {
                pr.finish();
            }
        }, "yam-action").start();
    }
}
