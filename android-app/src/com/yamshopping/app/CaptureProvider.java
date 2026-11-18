package com.yamshopping.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

// קובץ אחד שאפליקציית המצלמה של הטלפון כותבת אליו את התמונה ("לצלם את הברקוד"), והאתר קורא ממנו.
// רק הקובץ הזה, בתיקיית המטמון של האפליקציה, ורק למי שקיבל הרשאה לכתובת הזו
public class CaptureProvider extends ContentProvider {
    static final String AUTHORITY = "com.yamshopping.app.capture";
    static final String NAME = "scan.jpg";
    static final Uri URI = Uri.parse("content://" + AUTHORITY + "/" + NAME);
    // קובץ העדכון שירד (Updater), למסך ההתקנה של אנדרואיד כשאי אפשר להתקין ישירות — רק לקריאה
    static final String UPDATE = "update.apk";
    static final Uri UPDATE_URI = Uri.parse("content://" + AUTHORITY + "/" + UPDATE);

    static File file(android.content.Context c) {
        File dir = new File(c.getCacheDir(), "capture");
        dir.mkdirs();
        return new File(dir, NAME);
    }

    @Override public boolean onCreate() { return true; }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (UPDATE.equals(uri.getLastPathSegment()))
            return ParcelFileDescriptor.open(new File(getContext().getCacheDir(), UPDATE), ParcelFileDescriptor.MODE_READ_ONLY);
        if (!NAME.equals(uri.getLastPathSegment())) throw new FileNotFoundException();
        int m = mode != null && mode.contains("w")
                ? ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_TRUNCATE
                : ParcelFileDescriptor.MODE_READ_ONLY;
        return ParcelFileDescriptor.open(file(getContext()), m);
    }

    @Override
    public Cursor query(Uri uri, String[] proj, String sel, String[] args, String sort) {
        boolean upd = UPDATE.equals(uri.getLastPathSegment());
        File f = upd ? new File(getContext().getCacheDir(), UPDATE) : file(getContext());
        MatrixCursor c = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        c.addRow(new Object[]{upd ? UPDATE : NAME, f.length()});
        return c;
    }

    @Override public String getType(Uri uri) { return UPDATE.equals(uri.getLastPathSegment()) ? "application/vnd.android.package-archive" : "image/jpeg"; }
    @Override public Uri insert(Uri uri, ContentValues v) { return null; }
    @Override public int delete(Uri uri, String s, String[] a) { return 0; }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
