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
import java.util.List;
import java.util.UUID;

/**
 * 📡 סנכרון בבלוטות' בין שני טלפונים, בלי אינטרנט (האפליקציה האופליין, ומגרסה 2.2 גם האפליקציה הרגילה).
 * בלוטות' רגיל (RFCOMM) — בלי שירותי גוגל, כך שעובד גם בטלפונים כשרים כמו Qin.
 * טלפון אחד "מחכה" (host), השני מחפש ומתחבר (connect). כל צד שולח את חבילת הסנכרון שלו (הטקסט YAM1... מ-js/087-offsync.js)
 * ומקבל את של השני, והאתר ממזג. הלקוח שולח ראשון ואז קורא, המארח קורא ואז שולח — כך אף צד לא נתקע.
 * האירועים חוזרים לאתר כ-window.offBt({t:...}).
 */
final class Bt {
    interface Out {
        void js(String json);
    }

    static final UUID ID = UUID.fromString("6f1c2a4e-3b7d-4e55-9a10-59a8d3c1f0b7");
    static final String NAME = "YamShoppingSync";
    static final int REQ_PERM = 7301, REQ_ON = 7302, REQ_DISC = 7303;
    static final int MAX = 2 * 1024 * 1024;

    private final Activity a;
    private final Out out;
    private final BluetoothAdapter ad;
    private volatile BluetoothServerSocket server;
    private volatile BluetoothSocket sock;
    private BroadcastReceiver rx;
    private String action = "", pkg = "", addr = "";

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

    private void emit(String t, String... kv) {
        try {
            JSONObject o = new JSONObject();
            o.put("t", t);
            for (int i = 0; i + 1 < kv.length; i += 2) o.put(kv[i], kv[i + 1]);
            out.js(o.toString());
        } catch (Exception ignored) {
        }
    }

    private String[] perms() {
        List<String> l = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 31) {
            l.add(Manifest.permission.BLUETOOTH_CONNECT);
            l.add(Manifest.permission.BLUETOOTH_SCAN);
            l.add(Manifest.permission.BLUETOOTH_ADVERTISE);
        } else if ("find".equals(action)) {
            l.add(Manifest.permission.ACCESS_FINE_LOCATION); // עד אנדרואיד 11 — החיפוש של טלפונים קרובים דורש הרשאת מיקום
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
            return o.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    void host(String p) {
        start("host", p, "");
    }

    void find(String p) {
        start("find", p, "");
    }

    void connect(String address, String p) {
        start("connect", p, address);
    }

    private void start(String act, String p, String address) {
        stop();
        action = act;
        pkg = p == null ? "" : p;
        addr = address == null ? "" : address;
        go();
    }

    private boolean asked;

    private void go() {
        if (ad == null) { emit("state", "s", "none"); return; }
        String[] miss = perms();
        if (miss.length > 0 && !asked) { asked = true; a.requestPermissions(miss, REQ_PERM); return; }
        asked = false;
        if (miss.length > 0 && Build.VERSION.SDK_INT >= 31) { emit("state", "s", "perm"); return; }
        if (!ad.isEnabled()) {
            try {
                a.startActivityForResult(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE), REQ_ON);
            } catch (Exception e) {
                emit("state", "s", "off");
            }
            return;
        }
        if ("host".equals(action)) doHost();
        else if ("find".equals(action)) doFind(miss.length == 0);
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
        return code == REQ_DISC; // גלוי לשלוש דקות, או שסירבו — ממשיכים לחכות בכל מקרה (טלפון מצומד עדיין יכול להתחבר)
    }

    @SuppressWarnings("MissingPermission")
    private void doHost() {
        try {
            Intent d = new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
            d.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, 180);
            a.startActivityForResult(d, REQ_DISC);
        } catch (Exception ignored) {
        }
        final String mine = pkg;
        new Thread(() -> {
            BluetoothServerSocket s = null;
            try {
                s = ad.listenUsingInsecureRfcommWithServiceRecord(NAME, ID);
                server = s;
                String n = "";
                try { n = ad.getName(); } catch (Exception ignored) { }
                emit("state", "s", "wait", "name", n == null ? "" : n);
                BluetoothSocket c = s.accept(180000);
                closeQuiet(s);
                server = null;
                sock = c;
                String peer = name(c.getRemoteDevice());
                emit("state", "s", "busy", "name", peer);
                String got = read(new DataInputStream(c.getInputStream()));
                write(new DataOutputStream(c.getOutputStream()), mine);
                try { Thread.sleep(400); } catch (InterruptedException ignored) { }
                emit("got", "data", got, "name", peer);
            } catch (IOException e) {
                if (server != null || sock != null) emit("state", "s", "fail", "m", String.valueOf(e.getMessage()));
                else emit("state", "s", "stopped");
            } catch (SecurityException e) {
                emit("state", "s", "perm");
            } finally {
                closeQuiet(s);
                server = null;
                closeQuiet(sock);
                sock = null;
            }
        }, "bt-host").start();
    }

    @SuppressWarnings("MissingPermission")
    private void doFind(boolean canScan) {
        try {
            for (BluetoothDevice d : ad.getBondedDevices()) emit("dev", "name", name(d), "addr", d.getAddress(), "paired", "1");
        } catch (SecurityException e) {
            emit("state", "s", "perm");
            return;
        }
        if (!canScan) { emit("state", "s", "found", "scan", "0"); return; }
        rx = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent i) {
                if (BluetoothDevice.ACTION_FOUND.equals(i.getAction())) {
                    BluetoothDevice d = i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (d != null) emit("dev", "name", name(d), "addr", d.getAddress(), "paired", "0");
                } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(i.getAction())) {
                    emit("state", "s", "found", "scan", "1");
                }
            }
        };
        IntentFilter f = new IntentFilter(BluetoothDevice.ACTION_FOUND);
        f.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        a.registerReceiver(rx, f);
        try {
            ad.startDiscovery();
            emit("state", "s", "search");
        } catch (SecurityException e) {
            emit("state", "s", "found", "scan", "0");
        }
    }

    @SuppressWarnings("MissingPermission")
    private void doConnect() {
        final String mine = pkg, to = addr;
        try { ad.cancelDiscovery(); } catch (Exception ignored) { }
        new Thread(() -> {
            BluetoothSocket c = null;
            try {
                BluetoothDevice d = ad.getRemoteDevice(to);
                String peer = name(d);
                emit("state", "s", "busy", "name", peer);
                try {
                    c = d.createInsecureRfcommSocketToServiceRecord(ID);
                    sock = c;
                    c.connect();
                } catch (IOException first) {
                    closeQuiet(c);
                    // חלק מהטלפונים מסכימים רק לחיבור מוצפן — אז אנדרואיד מציג חלון צימוד, ואחריו ממשיכים
                    c = d.createRfcommSocketToServiceRecord(ID);
                    sock = c;
                    c.connect();
                }
                write(new DataOutputStream(c.getOutputStream()), mine);
                String got = read(new DataInputStream(c.getInputStream()));
                emit("got", "data", got, "name", peer);
            } catch (IOException e) {
                if (sock != null) emit("state", "s", "fail", "m", String.valueOf(e.getMessage()));
            } catch (SecurityException e) {
                emit("state", "s", "perm");
            } catch (IllegalArgumentException e) {
                emit("state", "s", "fail", "m", "bad address");
            } finally {
                closeQuiet(c);
                sock = null;
            }
        }, "bt-connect").start();
    }

    private static void write(DataOutputStream o, String s) throws IOException {
        byte[] b = (s == null ? "" : s).getBytes(StandardCharsets.UTF_8);
        o.writeInt(0x59414d31); // "YAM1"
        o.writeInt(b.length);
        o.write(b);
        o.flush();
    }

    private static String read(DataInputStream in) throws IOException {
        if (in.readInt() != 0x59414d31) throw new IOException("not ours");
        int n = in.readInt();
        if (n < 0 || n > MAX) throw new IOException("too big");
        byte[] b = new byte[n];
        in.readFully(b);
        return new String(b, StandardCharsets.UTF_8);
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

    @SuppressWarnings("MissingPermission")
    void stop() {
        if (rx != null) {
            try { a.unregisterReceiver(rx); } catch (Exception ignored) { }
            rx = null;
        }
        try { if (ad != null) ad.cancelDiscovery(); } catch (Exception ignored) { }
        BluetoothServerSocket s = server;
        server = null;
        closeQuiet(s);
        BluetoothSocket c = sock;
        sock = null;
        closeQuiet(c);
        action = "";
    }
}
