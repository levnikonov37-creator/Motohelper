#!/usr/bin/env python3
# Починка фото моделей (img/bikes/*.webp): при вырезании белого фона вместе с ним пропадали белые детали мотоцикла
# (пластик, номерной щиток, боковины) — на тёмном фоне сайта они выглядели чёрными дырами.
# Как чиним: кладём фото на белый фон (как в исходном снимке) и даём нейросети вырезать мотоцикл заново (rembg, модель
# isnet-general-use). Добавляем только то, что она считает мотоциклом, внутри силуэта и не в колёсах (просветы между
# спицами — настоящие); уже вырезанное не трогаем. Добавленное — белое, как было на снимке.
#   pip install pillow numpy scipy "rembg[cpu]"     (модель ~180 МБ скачается при первом запуске)
#   python3 scripts/bike-photo-repair.py img/bikes/<фото>.webp …   — затем: python3 scripts/og-images.py,
#   node scripts/tg-cards.js <id карточек> и node scripts/build-pages.js
# Маленькая копия img/bikes/s/<фото>.webp (240 px) пересоздаётся из починенной.
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from rembg import remove, new_session

WHITE = np.array([238, 239, 242], np.float32)


def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def repair(path, session):
    A = np.array(Image.open(path).convert("RGBA"), np.float32)
    rgb, a = A[..., :3], A[..., 3] / 255
    on_white = Image.new("RGBA", (A.shape[1], A.shape[0]), (255, 255, 255, 255))
    on_white.alpha_composite(Image.fromarray(A.astype(np.uint8), "RGBA"))
    m = np.array(remove(on_white.convert("RGB"), session=session, only_mask=True).convert("L"), np.float32) / 255
    solid = a > 0.8
    inside = ndi.binary_fill_holes(ndi.binary_closing(solid, structure=disk(6)))
    ys, xs = np.nonzero(solid)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    # колёса: круги у нижних углов силуэта — между спицами не заливаем
    R = 0.27 * (y1 - y0)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    wheels = np.zeros_like(solid)
    for cx in (x0 + 1.05 * R, x1 - 1.05 * R):
        wheels |= (xx - cx) ** 2 + (yy - (y1 - R)) ** 2 <= (0.97 * R) ** 2
    # нейросеть уверена, что это мотоцикл, а на фото — дыра или полупрозрачная серая кромка
    add = inside & ~wheels & ((m > a + 0.15) | ((m > 0.5) & (a < 0.95)))
    out = A.copy()
    over_white = rgb * a[..., None] + WHITE * (1 - a[..., None])
    out[..., :3][add] = over_white[add]
    out[..., 3] = np.where(add, np.maximum(a, m), a) * 255
    img = Image.fromarray(out.clip(0, 255).astype(np.uint8), "RGBA")
    img.save(path, "WEBP", quality=88, method=6)
    small = os.path.join(os.path.dirname(path), "s", os.path.basename(path))
    if os.path.isdir(os.path.dirname(small)):
        s = img.copy()
        s.thumbnail((240, 240), Image.LANCZOS)
        s.save(small, "WEBP", quality=85, method=6)
    return int(add.sum())


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("укажи файлы: python3 scripts/bike-photo-repair.py img/bikes/<фото>.webp …")
    session = new_session("isnet-general-use")
    for p in sys.argv[1:]:
        print(os.path.basename(p), "восстановлено пикселей:", repair(p, session), flush=True)
