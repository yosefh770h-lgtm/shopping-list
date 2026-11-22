package com.yamshopping.app;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONObject;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 📡 סנכרון חי בבלוטות' בין שני טלפונים, בלי אינטרנט ובלי SMS ("רשימת קניות אופליין", ומגרסה 2.2 גם האפליקציה הרגילה).
 * בלוטות' רגיל (RFCOMM) — בלי שירותי גוגל, כך שעובד גם בטלפונים כשרים ובנגנים.
 *
 * חיבור עם קוד קצר: טלפון אחד "יוצר קוד" (listen) — 4 ספרות שמוצגות על המסך — והשני מקליד אותו (join).
 * הקוד הופך למזהה השירות (UUID), כך שהטלפון השני מוצא לבד את הטלפון הנכון מבין הקרובים, בלי לבחור מרשימה.
 * אחרי החיבור הערוץ נשאר פתוח: כל צד שולח הודעות (send) והאתר (js/087-offsync.js) מסנכרן כל שינוי מיד,
 * כל עוד הטלפונים קרובים. בפעם הבאה מתחברים ישר לכתובת שנשמרה (connect), בלי קוד ובלי חיפוש.
 * האירועים חוזרים לאתר כ-window.offBt({t:'state'|'msg', ...}).
 */
final class Bt {
    interface Out {
        void js(String json);
    }

    static final int REQ_PERM = 7301, REQ_ON = 7302, REQ_DISC = 7303;
    static final int MAX = 2 * 1024 * 1024, MAGIC = 0x59414d31; // "YAM1"

    private final Activity a;
    private final Out out;
    private final BluetoothAdapter ad;
    private volatile BluetoothServerSocket server;
    private volatile BluetoothSocket sock;
    private volatile DataOutputStream dos;
    private volatile int gen; // כל פעולה חדשה מבטלת את הקודמת
    private BroadcastReceiver rx;
    private String action = "", code = "", addr = "";
    private boolean visible, asked;

    @SuppressWarnings("deprecation")
    Bt(Activity a, Out out) {
        this.a = a;
        this.out = out;
        BluetoothAdapter x = null;
        try {
            x = BluetoothAdapter.getDefaultAdapter();
        } catch (Exception ignored) {
        }
        ad = x;
    }

    static UUID uuidFor(String code) {
        return UUID.nameUUIDFromBytes(("yamshopping-sync-" + code).getBytes(StandardCharsets.UTF_8));
    }

    private void emit(String t, String... kv) {
        try {
            JSONObject o = new JSONObject();
            o.put("t", t);
            for (int i = 0; i + 1 < kv.length; i += 2) o.put(kv[i], kv[i + 1]);
            out.js(o.toString());
        } catch (Exception ignored) {
        }
    }

    private String[] missing() {
        List<String> l = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 31) {
            l.add(Manifest.permission.BLUETOOTH_CONNECT);
            l.add(Manifest.permission.BLUETOOTH_SCAN);
            if (visible) l.add(Manifest.permission.BLUETOOTH_ADVERTISE);
        } else if ("join".equals(action)) {
            l.add(Manifest.permission.ACCESS_FINE_LOCATION); // עד אנדרואיד 11 — חיפוש טלפונים קרובים דורש הרשאת מיקום
        }
        List<String> miss = new ArrayList<>();
        for (String p : l) if (a.checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) miss.add(p);
        return miss.toArray(new String[0]);
    }

    String state() {
        try {
            JSONObject o = new JSONObject();
            o.put("has", ad != null);
            o.put("on", ad != null && ad.isEnabled());
            o.put("live", sock != null && dos != null);
            return o.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    /** יוצרים קוד: מחכים לטלפון השני. visible = לבקש מהמערכת שהטלפון ייראה לטלפונים קרובים (בפעם הראשונה) */
    void listen(String c, boolean vis) {
        start("listen", c, "", vis);
    }

    /** מקלידים קוד: מחפשים את הטלפון שמחכה עם הקוד הזה */
    void join(String c) {
        start("join", c, "", false);
    }

    /** מתחברים ישר לטלפון שכבר הוצמד (הכתובת נשמרה באתר) */
    void connect(String address, String c) {
        start("connect", c, address, false);
    }

    private void start(String act, String c, String address, boolean vis) {
        stop();
        action = act;
        code = c == null ? "" : c.replaceAll("[^0-9]", "");
        addr = address == null ? "" : address;
        visible = vis;
        asked = false;
        if (code.length() < 4) { emit("state", "s", "fail", "m", "code"); return; }
        go();
    }

    private void go() {
        if (ad == null) { emit("state", "s", "none"); return; }
        String[] miss = missing();
        if (miss.length > 0 && !asked) { asked = true; a.requestPermissions(miss, REQ_PERM); return; }
        if (miss.length > 0 && (Build.VERSION.SDK_INT >= 31 || "join".equals(action))) { emit("state", "s", "perm"); return; }
        if (!ad.isEnabled()) {
            try {
                a.startActivityForResult(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE), REQ_ON);
            } catch (Exception e) {
                emit("state", "s", "off");
            }
            return;
        }
        if ("listen".equals(action)) doListen();
        else if ("join".equals(action)) doJoin();
        else if ("connect".equals(action)) doConnect();
    }

    void onPermission() {
        if (!action.isEmpty()) go();
    }

    /** @return true אם הבקשה הייתה של הבלוטות' */
    boolean onResult(int code) {
        if (code == REQ_ON) {
            if (ad != null && ad.isEnabled()) go(); else emit("state", "s", "off");
            return true;
        }
        return code == REQ_DISC; // גלוי לחמש דקות, או שסירבו — ממשיכים לחכות בכל מקרה
    }

    @SuppressWarnings("MissingPermission")
    private void doListen() {
        final int g = gen;
        if (visible) {
            try {
                Intent d = new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
                d.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, 300);
                a.startActivityForResult(d, REQ_DISC);
            } catch (Exception ignored) {
            }
        }
        final UUID id = uuidFor(code);
        new Thread(() -> {
            BluetoothServerSocket s = null;
            try {
                s = ad.listenUsingInsecureRfcommWithServiceRecord("YamShoppingSync", id);
                server = s;
                String n = "";
                try { n = ad.getName(); } catch (Exception ignored) { }
                emit("state", "s", "wait", "code", code, "name", n == null ? "" : n);
                BluetoothSocket c = s.accept(visible ? 300000 : 3600000);
                if (g != gen) { closeQuiet(c); return; }
                live(c, g);
            } catch (IOException e) {
                if (g == gen) emit("state", "s", "fail", "m", "timeout");
            } catch (SecurityException e) {
                emit("state", "s", "perm");
            } finally {
                closeQuiet(s);
                if (server == s) server = null;
            }
        }, "bt-listen").start();
    }

    @SuppressWarnings("MissingPermission")
    private void doJoin() {
        final int g = gen;
        final Map<String, BluetoothDevice> found = new LinkedHashMap<>();
        try {
            for (BluetoothDevice d : ad.getBondedDevices()) found.put(d.getAddress(), d);
        } catch (SecurityException e) {
            emit("state", "s", "perm");
            return;
        }
        rx = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent i) {
                if (BluetoothDevice.ACTION_FOUND.equals(i.getAction())) {
                    BluetoothDevice d = i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (d != null) synchronized (found) { found.put(d.getAddress(), d); }
                } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(i.getAction())) {
                    unregister();
                    final List<BluetoothDevice> all;
                    synchronized (found) { all = new ArrayList<>(found.values()); }
                    new Thread(() -> tryAll(all, g), "bt-join").start();
                }
            }
        };
        IntentFilter f = new IntentFilter(BluetoothDevice.ACTION_FOUND);
        f.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        a.registerReceiver(rx, f);
        try {
            if (!ad.startDiscovery()) throw new SecurityException();
            emit("state", "s", "search");
        } catch (SecurityException e) {
            unregister();
            final List<BluetoothDevice> all = new ArrayList<>(found.values());
            new Thread(() -> tryAll(all, g), "bt-join").start();
        }
    }

    /** מנסים כל טלפון קרוב: רק מי שמחכה עם אותו קוד יענה */
    @SuppressWarnings("MissingPermission")
    private void tryAll(List<BluetoothDevice> all, int g) {
        UUID id = uuidFor(code);
        for (BluetoothDevice d : all) {
            if (g != gen) return;
            emit("state", "s", "try", "name", name(d));
            BluetoothSocket c = null;
            try {
                c = d.createInsecureRfcommSocketToServiceRecord(id);
                sock = c;
                c.connect();
                live(c, g);
                return;
            } catch (IOException | SecurityException e) {
                closeQuiet(c);
                if (sock == c) sock = null;
            }
        }
        if (g == gen) emit("state", "s", "notfound");
    }

    @SuppressWarnings("MissingPermission")
    private void doConnect() {
        final int g = gen;
        final String to = addr;
        new Thread(() -> {
            BluetoothSocket c = null;
            try {
                BluetoothDevice d = ad.getRemoteDevice(to);
                emit("state", "s", "try", "name", name(d));
                c = d.createInsecureRfcommSocketToServiceRecord(uuidFor(code));
                sock = c;
                c.connect();
                live(c, g);
            } catch (IOException | SecurityException | IllegalArgumentException e) {
                closeQuiet(c);
                if (sock == c) sock = null;
                if (g == gen) emit("state", "s", "away");
            }
        }, "bt-connect").start();
    }

    /** הערוץ פתוח: קוראים הודעות עד שהחיבור נקטע (הטלפונים התרחקו / כיבו בלוטות') */
    private void live(BluetoothSocket c, int g) throws IOException {
        sock = c;
        DataInputStream in = new DataInputStream(c.getInputStream());
        dos = new DataOutputStream(c.getOutputStream());
        emit("state", "s", "live", "name", name(c.getRemoteDevice()), "addr", c.getRemoteDevice().getAddress());
        try {
            while (g == gen) {
                if (in.readInt() != MAGIC) throw new IOException("not ours");
                int n = in.readInt();
                if (n < 0 || n > MAX) throw new IOException("too big");
                byte[] b = new byte[n];
                in.readFully(b);
                emit("msg", "data", new String(b, StandardCharsets.UTF_8));
            }
        } catch (IOException e) {
            if (g == gen) emit("state", "s", "lost");
        } finally {
            dos = null;
            closeQuiet(c);
            if (sock == c) sock = null;
        }
    }

    /** שולח הודעה בערוץ הפתוח (מהאתר). false = אין חיבור */
    boolean send(String s) {
        final DataOutputStream o = dos;
        if (o == null || s == null) return false;
        final byte[] b = s.getBytes(StandardCharsets.UTF_8);
        if (b.length > MAX) return false;
        new Thread(() -> {
            try {
                synchronized (o) {
                    o.writeInt(MAGIC);
                    o.writeInt(b.length);
                    o.write(b);
                    o.flush();
                }
            } catch (IOException e) {
                closeQuiet(sock); // הקורא יקבל שגיאה וידווח "lost"
            }
        }, "bt-send").start();
        return true;
    }

    @SuppressWarnings("MissingPermission")
    private static String name(BluetoothDevice d) {
        try {
            String n = d.getName();
            return n == null || n.isEmpty() ? d.getAddress() : n;
        } catch (Exception e) {
            return "";
        }
    }

    private static void closeQuiet(java.io.Closeable c) {
        if (c == null) return;
        try { c.close(); } catch (Exception ignored) { }
    }

    private void unregister() {
        if (rx == null) return;
        try { a.unregisterReceiver(rx); } catch (Exception ignored) { }
        rx = null;
    }

    @SuppressWarnings("MissingPermission")
    void stop() {
        gen++;
        unregister();
        try { if (ad != null) ad.cancelDiscovery(); } catch (Exception ignored) { }
        closeQuiet(server);
        server = null;
        closeQuiet(sock);
        sock = null;
        dos = null;
        action = "";
    }
}
