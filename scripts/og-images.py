#!/usr/bin/env python3
# Картинки для превью в соцсетях (og:image) у моделей со своим фото: img/og/<фото>.jpg, 1200×630.
# Фото из img/bikes/<фото>.webp вписывается в тёмный фон, справа снизу — подпись MotoHelper.
# JPG, а не webp: так превью точно показывают ВКонтакте и Telegram. Запуск после добавления фото:
#   python3 scripts/og-images.py        (нужен Pillow: pip install pillow)
import os, glob
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, "img", "bikes"), os.path.join(ROOT, "img", "og")
os.makedirs(OUT, exist_ok=True)
W, H = 1200, 630
font = None
for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
    if os.path.exists(f): font = ImageFont.truetype(f, 34); break
made = 0
for src in sorted(glob.glob(os.path.join(SRC, "*.webp"))):
    dst = os.path.join(OUT, os.path.basename(src)[:-5] + ".jpg")
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src): continue
    ph = Image.open(src).convert("RGB")
    k = min((W - 80) / ph.width, (H - 80) / ph.height)
    ph = ph.resize((int(ph.width * k), int(ph.height * k)), Image.LANCZOS)
    bg = Image.new("RGB", (W, H), (11, 13, 17))
    bg.paste(ph, ((W - ph.width) // 2, (H - ph.height) // 2))
    if font:
        d = ImageDraw.Draw(bg)
        d.text((W - 36, H - 30), "MotoHelper", font=font, fill=(242, 242, 242), anchor="rb")
    bg.save(dst, "JPEG", quality=82, optimize=True, progressive=True)
    made += 1
print("og-картинок создано:", made, "всего:", len(glob.glob(os.path.join(OUT, "*.jpg"))))
