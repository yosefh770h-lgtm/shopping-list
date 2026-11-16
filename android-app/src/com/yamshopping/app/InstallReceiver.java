package com.yamshopping.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;

/** תשובה מהמערכת על התקנת העדכון: לבקש מהמשתמש לאשר, או לדווח שנכשל */
public class InstallReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = extraIntent(intent);
            if (confirm == null) return;
            confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            AppActivity a = AppActivity.current;
            try {
                if (a != null && !a.isFinishing()) a.startActivity(confirm); else c.startActivity(confirm);
            } catch (Exception e) {
                // האפליקציה ברקע — מבקשים לאשר מהתראה
                Notifier.show(c, Notifier.CH_UPDATES, 9001, "🔄 העדכון מוכן להתקנה", "לוחצים כאן ואז \"עדכון\"", confirm);
            }
            AppActivity.report("confirm", 100, "");
        } else if (status == PackageInstaller.STATUS_SUCCESS) {
            AppActivity.report("done", 100, "");
        } else if (status == PackageInstaller.STATUS_FAILURE_ABORTED) {
            AppActivity.report("cancel", 0, "");
        } else {
            String m = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            AppActivity.report("error", 0, "install_" + status + (m == null ? "" : ": " + m));
        }
    }

    @SuppressWarnings("deprecation")
    static Intent extraIntent(Intent i) {
        if (Build.VERSION.SDK_INT >= 33) return i.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
        return i.getParcelableExtra(Intent.EXTRA_INTENT);
    }
}
