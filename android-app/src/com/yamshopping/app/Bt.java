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

import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattServer;
import android.bluetooth.BluetoothGattServerCallback;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.os.ParcelUuid;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.ArrayDeque;
import java.util.Arrays;

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
 *
 * 💻 מול מחשב (Web Bluetooth בכרום / אדג'): כשיוצרים קוד, הטלפון גם "מפרסם" את עצמו בבלוטות' חסכוני (BLE) עם שירות
 * שמזהה שלו נגזר מהקוד (bleUuid). באתר במחשב מקלידים את אותו קוד, הדפדפן מוצא רק את הטלפון הזה, ומתחבר.
 * ההודעות עוברות באותו פורמט (YAM1 + אורך + JSON): המחשב כותב ל-RX, והטלפון שולח ב-TX (notify) בחתיכות לפי ה-MTU.
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

    /* ---- 💻 BLE מול מחשב ---- */
    static final UUID BLE_RX = UUID.fromString("59414d31-0001-4000-8000-000000000000"); // המחשב כותב
    static final UUID BLE_TX = UUID.fromString("59414d31-0002-4000-8000-000000000000"); // הטלפון שולח (notify)
    static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    private BluetoothGattServer gs;
    private BluetoothLeAdvertiser adv;
    private AdvertiseCallback advCb;
    private BluetoothGattCharacteristic tx;
    private volatile BluetoothDevice bleDev;
    private volatile boolean bleLive;
    private volatile int mtu = 23;
    private final ByteArrayOutputStream rxBuf = new ByteArrayOutputStream(), prep = new ByteArrayOutputStream();
    private final ArrayDeque<byte[]> txQ = new ArrayDeque<>();
    private boolean txBusy;
    private int txSeq;
    private final android.os.Handler main;

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
        main = new android.os.Handler(a.getMainLooper());
    }

    /** מזהה השירות של BLE לפי הקוד — אותו חישוב באתר (js/087-offsync.js) */
    static UUID bleUuid(String code) {
        return UUID.fromString("59414d31-0000-4000-8000-00000000" + code);
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
            if (visible || "listen".equals(action)) l.add(Manifest.permission.BLUETOOTH_ADVERTISE); // גם בשביל המחשב (BLE)
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
            o.put("live", (sock != null && dos != null) || bleLive);
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
        final boolean ble = startBle(g);
        final UUID id = uuidFor(code);
        new Thread(() -> {
            BluetoothServerSocket s = null;
            try {
                s = ad.listenUsingInsecureRfcommWithServiceRecord("YamShoppingSync", id);
                server = s;
                String n = "";
                try { n = ad.getName(); } catch (Exception ignored) { }
                emit("state", "s", "wait", "code", code, "name", n == null ? "" : n, "ble", ble ? "1" : "0");
                BluetoothSocket c = s.accept(visible ? 300000 : 3600000);
                if (g != gen || bleLive) { closeQuiet(c); return; }
                stopBle();
                live(c, g);
            } catch (IOException e) {
                if (g == gen && !bleLive) { stopBle(); emit("state", "s", "fail", "m", "timeout"); }
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
        if (bleLive) return bleSend(s);
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
        stopBle();
        action = "";
    }

    /* ================= 💻 BLE: הטלפון כשרת, המחשב מתחבר מהדפדפן ================= */

    /** @return true אם הטלפון יכול לפרסם את עצמו למחשב (בחלק מהנגנים אין BLE מפרסם) */
    @SuppressWarnings({"MissingPermission", "deprecation"})
    private boolean startBle(final int g) {
        stopBle();
        try {
            if (!ad.isMultipleAdvertisementSupported()) return false;
            adv = ad.getBluetoothLeAdvertiser();
            BluetoothManager bm = (BluetoothManager) a.getSystemService(Context.BLUETOOTH_SERVICE);
            if (adv == null || bm == null) return false;
            final UUID svcId = bleUuid(code);
            gs = bm.openGattServer(a, new BluetoothGattServerCallback() {
                @Override
                public void onConnectionStateChange(BluetoothDevice d, int status, int st) {
                    if (st == BluetoothProfile.STATE_CONNECTED) {
                        /* בלי זה אנדרואיד רואה שאף אפליקציה "לא מחזיקה" את החיבור שהמחשב פתח, ומנתק אחרי כמה שניות.
                           connect(d, false) על חיבור שכבר קיים רק מסמן שהאפליקציה משתמשת בו */
                        try { if (gs != null && g == gen) gs.connect(d, false); } catch (Exception ignored) { }
                    } else if (st == BluetoothProfile.STATE_DISCONNECTED && d.equals(bleDev)) {
                        bleDev = null;
                        if (bleLive) {
                            bleLive = false;
                            synchronized (txQ) { txQ.clear(); txBusy = false; }
                            if (g == gen) {
                                emit("state", "s", "lost");
                                /* מפרסמים שוב מיד — המחשב מנסה להתחבר שוב לבד, בלי להקליד את הקוד */
                                main.post(() -> { if (g == gen && !bleLive && gs != null) advertise(svcId, true); });
                            }
                        }
                    }
                }

                @Override
                public void onMtuChanged(BluetoothDevice d, int m) {
                    mtu = Math.max(23, Math.min(m, 517));
                }

                @Override
                public void onDescriptorWriteRequest(BluetoothDevice d, int req, BluetoothGattDescriptor ds, boolean prepared, boolean resp, int off, byte[] v) {
                    if (resp) gs.sendResponse(d, req, BluetoothGatt.GATT_SUCCESS, off, v);
                    if (bleDev != null && !d.equals(bleDev)) return; // מחשב אחד בכל פעם
                    if (v != null && v.length > 0 && v[0] != 0) { // המחשב נרשם לקבל הודעות — החיבור מוכן
                        bleDev = d;
                        bleLive = true;
                        synchronized (rxBuf) { rxBuf.reset(); }
                        synchronized (txQ) { txQ.clear(); txBusy = false; }
                        closeQuiet(server); // לא מחכים יותר לטלפון בבלוטות' רגיל
                        stopAdvertising();
                        String n = "";
                        try { n = d.getName(); } catch (Exception ignored) { }
                        emit("state", "s", "live", "name", n == null || n.isEmpty() ? "PC" : n, "addr", "", "via", "ble");
                    }
                }

                @Override
                public void onDescriptorReadRequest(BluetoothDevice d, int req, int off, BluetoothGattDescriptor ds) {
                    gs.sendResponse(d, req, BluetoothGatt.GATT_SUCCESS, 0, new byte[]{(byte) (d.equals(bleDev) ? 1 : 0), 0});
                }

                @Override
                public void onCharacteristicWriteRequest(BluetoothDevice d, int req, BluetoothGattCharacteristic ch, boolean prepared, boolean resp, int off, byte[] v) {
                    if (!d.equals(bleDev)) { if (resp) gs.sendResponse(d, req, BluetoothGatt.GATT_FAILURE, off, null); return; }
                    if (prepared) synchronized (prep) { prep.write(v, 0, v.length); }
                    else feed(v, g);
                    if (resp) gs.sendResponse(d, req, BluetoothGatt.GATT_SUCCESS, off, v);
                }

                @Override
                public void onExecuteWrite(BluetoothDevice d, int req, boolean execute) {
                    byte[] b;
                    synchronized (prep) { b = prep.toByteArray(); prep.reset(); }
                    if (execute && d.equals(bleDev)) feed(b, g);
                    gs.sendResponse(d, req, BluetoothGatt.GATT_SUCCESS, 0, null);
                }

                @Override
                public void onNotificationSent(BluetoothDevice d, int status) {
                    synchronized (txQ) { txBusy = false; txSeq++; }
                    pump();
                }
            });
            if (gs == null) return false;
            BluetoothGattService svc = new BluetoothGattService(svcId, BluetoothGattService.SERVICE_TYPE_PRIMARY);
            BluetoothGattCharacteristic rx = new BluetoothGattCharacteristic(BLE_RX,
                    BluetoothGattCharacteristic.PROPERTY_WRITE, BluetoothGattCharacteristic.PERMISSION_WRITE);
            tx = new BluetoothGattCharacteristic(BLE_TX, BluetoothGattCharacteristic.PROPERTY_NOTIFY, BluetoothGattCharacteristic.PERMISSION_READ);
            tx.addDescriptor(new BluetoothGattDescriptor(CCCD, BluetoothGattDescriptor.PERMISSION_READ | BluetoothGattDescriptor.PERMISSION_WRITE));
            svc.addCharacteristic(rx);
            svc.addCharacteristic(tx);
            gs.addService(svc);
            advertise(svcId, true);
            return true;
        } catch (SecurityException | IllegalStateException e) {
            stopBle();
            return false;
        }
    }

    /** השם בתשובה לסריקה — כדי שבמחשב יופיע שם הטלפון. שם ארוך מדי → בלי שם */
    @SuppressWarnings("MissingPermission")
    private void advertise(final UUID svcId, final boolean withName) {
        if (adv == null) return;
        AdvertiseSettings set = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                .setConnectable(true).setTimeout(0).build();
        AdvertiseData data = new AdvertiseData.Builder().addServiceUuid(new ParcelUuid(svcId)).setIncludeDeviceName(false).build();
        AdvertiseData scan = new AdvertiseData.Builder().setIncludeDeviceName(withName).build();
        advCb = new AdvertiseCallback() {
            @Override
            public void onStartFailure(int err) {
                if (withName && err == ADVERTISE_FAILED_DATA_TOO_LARGE) advertise(svcId, false);
            }
        };
        try {
            adv.startAdvertising(set, data, scan, advCb);
        } catch (SecurityException | IllegalStateException ignored) {
        }
    }

    /** מקבלים חתיכות מהמחשב ומרכיבים הודעות שלמות: YAM1 + אורך + תוכן */
    private void feed(byte[] v, int g) {
        if (v == null || v.length == 0) return;
        synchronized (rxBuf) {
            rxBuf.write(v, 0, v.length);
            for (;;) {
                byte[] b = rxBuf.toByteArray();
                if (b.length < 8) return;
                java.nio.ByteBuffer bb = java.nio.ByteBuffer.wrap(b);
                int magic = bb.getInt(), n = bb.getInt();
                if (magic != MAGIC || n < 0 || n > MAX) { rxBuf.reset(); return; }
                if (b.length < 8 + n) return;
                String msg = new String(b, 8, n, StandardCharsets.UTF_8);
                rxBuf.reset();
                rxBuf.write(b, 8 + n, b.length - 8 - n);
                if (g == gen) emit("msg", "data", msg);
            }
        }
    }

    private boolean bleSend(String s) {
        if (s == null || bleDev == null) return false;
        byte[] b = s.getBytes(StandardCharsets.UTF_8);
        if (b.length > MAX) return false;
        byte[] f = java.nio.ByteBuffer.allocate(8 + b.length).putInt(MAGIC).putInt(b.length).put(b).array();
        int step = Math.max(20, mtu - 3);
        synchronized (txQ) {
            for (int i = 0; i < f.length; i += step) txQ.add(Arrays.copyOfRange(f, i, Math.min(f.length, i + step)));
        }
        pump();
        return true;
    }

    /** שולחים חתיכה אחת בכל פעם — הבאה אחרי onNotificationSent */
    @SuppressWarnings({"MissingPermission", "deprecation"})
    private void pump() {
        byte[] c;
        BluetoothDevice d = bleDev;
        synchronized (txQ) {
            if (txBusy || d == null || gs == null || tx == null) return;
            c = txQ.poll();
            if (c == null) return;
            txBusy = true;
        }
        /* אם onNotificationSent לא חזר (קורה בחלק מהטלפונים) — לא נתקעים: ממשיכים לחתיכה הבאה אחרי שנייה */
        final int seq = ++txSeq;
        main.postDelayed(() -> { boolean go; synchronized (txQ) { go = txBusy && txSeq == seq; if (go) txBusy = false; } if (go) pump(); }, 1000);
        try {
            boolean ok;
            if (Build.VERSION.SDK_INT >= 33) ok = gs.notifyCharacteristicChanged(d, tx, false, c) == BluetoothGatt.GATT_SUCCESS;
            else { tx.setValue(c); ok = gs.notifyCharacteristicChanged(d, tx, false); }
            if (!ok) { synchronized (txQ) { txQ.addFirst(c); txBusy = false; txSeq++; } main.postDelayed(this::pump, 30); }
        } catch (SecurityException e) {
            synchronized (txQ) { txBusy = false; }
        }
    }

    @SuppressWarnings("MissingPermission")
    private void stopAdvertising() {
        try { if (adv != null && advCb != null) adv.stopAdvertising(advCb); } catch (Exception ignored) { }
        advCb = null;
    }

    @SuppressWarnings("MissingPermission")
    private void stopBle() {
        stopAdvertising();
        adv = null;
        BluetoothDevice d = bleDev;
        try { if (gs != null && d != null) gs.cancelConnection(d); } catch (Exception ignored) { }
        try { if (gs != null) gs.close(); } catch (Exception ignored) { }
        gs = null;
        tx = null;
        bleDev = null;
        bleLive = false;
        synchronized (txQ) { txQ.clear(); txBusy = false; }
    }
}
