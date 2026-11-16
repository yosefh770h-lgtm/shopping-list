# בונה את קובץ ה-APK הסופי: המשאבים מ-aapt2 + classes.dex, עם יישור 4 בתים
# (אנדרואיד 11 ומעלה דורש ש-resources.arsc יהיה לא דחוס ומיושר)
import sys, zipfile

def main(res_apk, dex, out):
    src = zipfile.ZipFile(res_apk)
    with open(out, 'wb') as f:
        dst = zipfile.ZipFile(f, 'w')
        items = [(i, src.read(i.filename)) for i in src.infolist()]
        items.append((zipfile.ZipInfo('classes.dex', date_time=(2008, 1, 1, 0, 0, 0)), open(dex, 'rb').read()))
        for info, data in items:
            stored = info.filename == 'resources.arsc' or info.filename.endswith('.png')
            zi = zipfile.ZipInfo(info.filename, date_time=(2008, 1, 1, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
            zi.external_attr = 0
            if stored:
                # מיקום הנתונים = מיקום הכותרת + 30 + אורך השם + אורך השדה הנוסף
                start = f.tell() + 30 + len(zi.filename.encode())
                zi.extra = b'\0' * ((4 - start % 4) % 4)
            dst.writestr(zi, data)
        dst.close()

if __name__ == '__main__':
    main(*sys.argv[1:])
