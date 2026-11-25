#!/usr/bin/env python3
# Массовое добавление фото моделей: скачать снимок, вырезать фон (rembg, isnet-general-use), обрезать по мотоциклу,
# сохранить img/bikes/<слаг>.webp (до 800 px) и img/bikes/s/<слаг>.webp (240 px), записать источник в img/bikes/sources.json
# и пересобрать список BIKE_PHOTOS_MORE в js/data.js (между метками «фото, добавленные скриптом»).
#   python3 scripts/bike-photo-add.py кандидаты.jsonl [--force]
# Строка кандидатов: {"key": "Honda CRF250L", "urls": ["https://…", …], "source": "commons"|"web",
#                     "credit": "Автор, CC BY-SA 4.0" (для Commons), "page": "страница-источник"}
# Из нескольких ссылок берётся первая, где вырезанный мотоцикл похож на снимок сбоку (широкий, занимает 15–85 % кадра).
# Затем: python3 scripts/og-images.py и node scripts/build-pages.js
import sys, os, io, json, re, time, urllib.request, urllib.error, ssl
import numpy as np
from PIL import Image
from rembg import remove, new_session

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIG, SMALL = os.path.join(ROOT, "img", "bikes"), os.path.join(ROOT, "img", "bikes", "s")
SRC_JSON = os.path.join(BIG, "sources.json")
CA = "/root/.ccr/ca-bundle.crt"
CTX = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
UA = "MotoHelperPhotoBot/1.0 (+https://motohelper.ru)"


def slug(key):
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", key.lower()))


def fetch(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
                data = r.read(25_000_000)
            break
        except (ConnectionError, urllib.error.URLError) as e:  # обрыв соединения или 429 — повторить чуть позже
            busy = isinstance(e, urllib.error.HTTPError) and e.code == 429
            if (isinstance(e, urllib.error.HTTPError) and not busy) or i == tries - 1: raise
            time.sleep((int(e.headers.get("Retry-After") or 0) or 20 * (i + 1)) if busy else 3 * (i + 1))
    return Image.open(io.BytesIO(data)).convert("RGB")


def cutout(img, session):
    w, h = img.size
    k = min(1.0, 1600 / max(w, h))
    if k < 1: img = img.resize((int(w * k), int(h * k)), Image.LANCZOS)
    rgba = remove(img, session=session, post_process_mask=True)
    a = np.array(rgba)[..., 3]
    ys, xs = np.where(a > 40)
    if len(xs) < 500: return None, "пусто"
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    frac = (a > 40).sum() / a.size
    if bw / bh < 1.15: return None, "не сбоку (узкий силуэт %.2f)" % (bw / bh)
    if not 0.12 <= frac <= 0.85: return None, "силуэт %.0f%% кадра" % (frac * 100)
    if bw < 0.35 * a.shape[1]: return None, "мотоцикл мелкий в кадре"
    if x0 <= 1 or x1 >= a.shape[1] - 2: return None, "мотоцикл обрезан краем кадра"
    m = int(0.03 * max(bw, bh))
    box = (max(0, x0 - m), max(0, y0 - m), min(a.shape[1], x1 + m + 1), min(a.shape[0], y1 + m + 1))
    return rgba.crop(box), "ok"


def save(im, key):
    s = slug(key)
    big = im.copy(); big.thumbnail((800, 520), Image.LANCZOS)
    big.save(os.path.join(BIG, s + ".webp"), "WEBP", quality=78, method=6)
    sm = im.copy(); sm.thumbnail((240, 160), Image.LANCZOS)
    sm.save(os.path.join(SMALL, s + ".webp"), "WEBP", quality=80, method=6)


def update_data_js(keys, src):
    p = os.path.join(ROOT, "js", "data.js")
    s = open(p, encoding="utf-8").read()
    a, b = "/* ↓ фото, добавленные скриптом (scripts/bike-photo-add.py) */", "/* ↑ фото, добавленные скриптом */"
    body = "var BIKE_PHOTOS_MORE = " + json.dumps(sorted(keys), ensure_ascii=False, indent=0).replace("\n", "") + ";\n" \
           "BIKE_PHOTOS_MORE.forEach(function (k) { if (BIKE_PHOTOS.indexOf(k) < 0) BIKE_PHOTOS.push(k); });\n" \
           "/* автор и лицензия фото со свободной лицензией (Wikimedia Commons): [подпись, страница файла] */\n" \
           "var PHOTO_CREDIT = " + json.dumps({k: [v["credit"], v["page"]] for k, v in sorted(src.items()) if v.get("source") == "commons"}, ensure_ascii=False) + ";\n"
    block = a + "\n" + body + b
    if a in s:
        s = re.sub(re.escape(a) + r"[\s\S]*?" + re.escape(b), lambda m: block, s)
    else:
        anchor = "/* одинаковые фото у вариантов одной модели"
        s = s.replace(anchor, block + "\n" + anchor, 1)
    open(p, "w", encoding="utf-8").write(s)


def drop(keys):
    """убрать неудачные фото: python3 scripts/bike-photo-add.py --drop "Марка Модель" …"""
    src = json.load(open(SRC_JSON, encoding="utf-8"))
    for k in keys:
        src.pop(k, None)
        for d in (BIG, SMALL):
            f = os.path.join(d, slug(k) + ".webp")
            if os.path.exists(f): os.remove(f)
    json.dump(src, open(SRC_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    update_data_js(list(src.keys()), src)


def main():
    if len(sys.argv) > 2 and sys.argv[1] == "--drop":
        return drop(sys.argv[2:])
    if len(sys.argv) < 2: sys.exit(__doc__ or "кандидаты.jsonl")
    force = "--force" in sys.argv
    os.makedirs(SMALL, exist_ok=True)
    src = json.load(open(SRC_JSON, encoding="utf-8")) if os.path.exists(SRC_JSON) else {}
    session = new_session("isnet-general-use")
    done = fail = 0
    for line in open(sys.argv[1], encoding="utf-8"):
        line = line.strip()
        if not line: continue
        c = json.loads(line)
        key = c["key"]
        if key in src and not force: continue
        why = []
        for url in c.get("urls", [])[:12]:
            if "wikimedia.org" in url: time.sleep(2)  # бережно к серверам Wikimedia (иначе 429)
            try:
                im, res = cutout(fetch(url), session)
            except Exception as e:
                im, res = None, "ошибка: " + str(e)[:60]
            if im is not None:
                save(im, key)
                src[key] = {"url": url, "page": c.get("page", ""), "source": c.get("source", "web"), "credit": c.get("credit", "")}
                done += 1
                print("✓", key, "←", url[:90], flush=True)
                break
            why.append(res)
        else:
            fail += 1
            print("✗", key, "—", "; ".join(why)[:160], flush=True)
        if (done + fail) % 20 == 0:
            json.dump(src, open(SRC_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(src, open(SRC_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    update_data_js(list(src.keys()), src)
    print("готово: добавлено", done, "не вышло", fail, "всего в списке", len(src))


if __name__ == "__main__":
    main()
