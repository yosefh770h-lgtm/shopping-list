# יוצר "סרטון מצלמה" קטן עם ברקוד EAN-13, לבדיקה של סריקת הברקוד בלי מצלמה אמיתית.
# שימוש: python3 make_barcode_y4m.py out.y4m   (צריך: pip install python-barcode pillow)
import sys
import barcode
from barcode.writer import ImageWriter
from PIL import Image

out = sys.argv[1] if len(sys.argv) > 1 else 'barcode.y4m'
W, H = 640, 480
img = barcode.get('ean13', '7290000066318', writer=ImageWriter()).render({'module_width': 0.5, 'module_height': 20, 'quiet_zone': 6})
img = img.convert('RGB')
img.thumbnail((440, 300))
frame = Image.new('RGB', (W, H), (235, 235, 235))
frame.paste(img, ((W - img.width) // 2, (H - img.height) // 2))
y, cb, cr = frame.convert('YCbCr').split()
cb, cr = cb.resize((W // 2, H // 2)), cr.resize((W // 2, H // 2))
with open(out, 'wb') as f:
    f.write(f'YUV4MPEG2 W{W} H{H} F15:1 Ip A1:1 C420jpeg\n'.encode())
    for _ in range(30):
        f.write(b'FRAME\n' + y.tobytes() + cb.tobytes() + cr.tobytes())
print('ok', out)
