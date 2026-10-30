"""Слайды 1200×1600 для карточки WB по артикулу.

  python3 cards/slides.py 676557918 -o cards/out/676557918 [--spec spec.json]

Делает:
  1-main.png    — главный: деталь крупно, что это, главные цифры, для каких моторов
  2-compat.png  — совместимость по базе MotoHelper (мотор → марки и модели)
  3-specs.png   — характеристики и комплектация из карточки
  before-after.png — «было / стало» для первого сообщения продавцу
  spec.json     — тексты, из которых собраны слайды: поправь и запусти с --spec

Тексты по умолчанию собираются из карточки автоматически; лучше, когда их пишет
человек или Claude — для этого --spec.
"""
import argparse
import html
import io
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import wb  # noqa: E402

ACCENT = "#E8501E"   # оранжевый — плашки и акценты
INK = "#16181D"
BG = "#F3F4F6"       # ровный светлый фон без градиента: требование WB к главному фото

# слова, которые площадки запрещают на фото (TREBOVANIYA.md)
BANNED = re.compile(r"хит|топ\b|лучш|№\s?1|лидер продаж|скидк|акци|распродаж|купи|закажи|гарант\w* 100|100\s?%|оригинал|аналог|₽|руб", re.I)


# ---------- фото ----------

def fetch_photo(host, nm, n=1):
    for size in ("big", "c516x688"):
        code, body = wb.get(wb.image_url(host, nm, n, size))
        if code == 200:
            return Image.open(io.BytesIO(body)).convert("RGB")
    return None


def cut_background(im):
    """Убирает ровный светлый фон, залитый от краёв. Если фон не ровный — None."""
    small = im.copy()
    small.thumbnail((500, 500))
    if len(small.getcolors(1 << 16) or range(1 << 16)) < 80:  # заглушка WB «нет фото»
        return None
    a = np.asarray(small).astype(int)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    if bg.min() < 200 or (np.abs(border - bg).max(axis=1) < 30).mean() < 0.85:
        return None
    like = np.abs(a - bg).max(axis=2) < 28
    mask = np.zeros_like(like)
    mask[0], mask[-1], mask[:, 0], mask[:, -1] = like[0], like[-1], like[:, 0], like[:, -1]
    while True:  # заливка от краёв по пикселям фона
        grown = mask.copy()
        grown[1:] |= mask[:-1]; grown[:-1] |= mask[1:]
        grown[:, 1:] |= mask[:, :-1]; grown[:, :-1] |= mask[:, 1:]
        grown &= like
        if (grown == mask).all():
            break
        mask = grown
    keep, clean = _big_parts(~mask)
    if keep is None:
        return None
    alpha = Image.fromarray((keep * 255).astype("uint8")).resize(im.size, Image.LANCZOS)
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
    return (out.crop(box), clean) if box else None


def _big_parts(fg, share=0.04):
    """Оставляет крупные детали, выкидывает мелкие кусочки: надписи, размерные линии, логотипы."""
    h, w = fg.shape
    label = np.zeros((h, w), int)
    sizes = [0]
    for y in range(h):
        for x in range(w):
            if fg[y, x] and not label[y, x]:
                n = len(sizes); sizes.append(0)
                stack = [(y, x)]; label[y, x] = n
                while stack:
                    cy, cx = stack.pop(); sizes[n] += 1
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not label[ny, nx]:
                            label[ny, nx] = n; stack.append((ny, nx))
    if len(sizes) == 1:
        return None, 0
    big = max(sizes)
    good = [i for i, sz in enumerate(sizes) if i and sz >= big * share]
    # чистота: какая доля «не фона» приходится на крупные детали (надписи — много мелких кусков)
    small = sum(sz for i, sz in enumerate(sizes) if i and i not in good)
    many = sum(1 for i in good) > 6
    clean = 0 if many else sum(sizes[i] for i in good) / (sum(sizes) or 1) - small / (sum(sizes) or 1)
    return np.isin(label, good), clean


# ---------- тексты ----------

NUM = re.compile(r"(?<![A-Za-zА-Яа-я\d])(?:(?:D|d|Ø|ф)?\s?\d+(?:[.,]\d+)?\s?(?:мм|mm|см3|см³|сс|cc|куб|зуб)|\d{2}\s?[TтТ])(?![A-Za-zА-Яа-я\d])", re.I)


def auto_spec(card, compat):
    name = card.get("imt_name", "")
    head = re.split(r"\s(?:для|на)\s", name, maxsplit=1)[0]
    head = re.sub(r"\b(?:\d{3}[A-Z]{2,4}|ZS\w+|YX\d+|[A-Z]{1,3}\d{2,3})[\w-]*", "", head)
    head = re.sub(r"[/,()]+", " ", head)
    head = " ".join(head.split()[:4]).strip() or card.get("subj_name", "")
    nums = []
    for m in NUM.findall(name + " " + (card.get("description") or "")[:400]):
        m = re.sub(r"\s+", " ", m.strip())
        if m.lower() not in [n.lower() for n in nums]:
            nums.append(m)
    codes = []
    for e in compat["engines"]:
        c = re.sub(r"\s*\(.*", "", e["code"]).replace(" EFI", "")
        if c not in codes:
            codes.append(c)
    brands = [m["brand"] for m in compat["models"]][:4]
    return {
        "headline": head[:1].upper() + head[1:],
        "subline": ("Для моторов " + ", ".join(codes[:3])) if codes else "",
        "chips": nums[:3],
        "fits": ("Подходит: " + ", ".join(brands)) if brands else "",
    }


def check_spec(spec):
    text = json.dumps(spec, ensure_ascii=False)
    bad = sorted(set(m.group(0) for m in BANNED.finditer(text)))
    return bad


# ---------- вёрстка ----------

def page(body, extra_css=""):
    return f"""<!doctype html><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0}}
body{{width:1200px;height:1600px;background:{BG};font-family:Inter,"DejaVu Sans",sans-serif;color:{INK};
  position:relative;overflow:hidden}}
.h1{{font:800 96px/1.02 "Inter Display",Inter,sans-serif;letter-spacing:-2px}}
.sub{{font:600 44px/1.2 Inter;color:#3B3F48;margin-top:18px}}
.chip{{display:inline-block;background:{INK};color:#fff;font:700 46px/1 Inter;padding:20px 30px;border-radius:22px;margin:0 14px 14px 0}}
.bar{{position:absolute;left:0;right:0;bottom:0;background:{ACCENT};color:#fff;font:700 42px/1.25 Inter;padding:34px 70px}}
{extra_css}</style><body>{body}</body>"""


def main_slide(spec, photo_rel):
    e = html.escape
    chips = "".join(f'<span class="chip">{e(c)}</span>' for c in spec.get("chips", []))
    return page(f"""
<div style="position:absolute;left:70px;right:70px;top:80px">
  <div class="h1">{e(spec["headline"])}</div>
  <div class="sub">{e(spec.get("subline", ""))}</div>
</div>
<img src="{photo_rel}" style="position:absolute;left:90px;right:90px;top:360px;width:1020px;height:930px;object-fit:contain;
  filter:drop-shadow(0 30px 40px rgba(0,0,0,.18))">
<div style="position:absolute;left:70px;bottom:{170 if spec.get("fits") else 70}px">{chips}</div>
{f'<div class="bar">{e(spec["fits"])}</div>' if spec.get("fits") else ""}""")


def compat_slide(compat, fallback):
    e = html.escape
    codes = []
    for x in compat["engines"]:
        c = re.sub(r"\s*\(.*", "", x["code"])
        if c not in codes:
            codes.append(c)
    rows, shown = "", 0
    for m in compat["models"]:
        if shown >= 34:
            break
        names = m["names"][: 34 - shown]
        shown += len(names)
        rows += f'<div class="row"><b>{e(m["brand"])}</b><span>{e(", ".join(names))}</span></div>'
    total = sum(len(m["names"]) for m in compat["models"])
    if not rows:
        rows = f'<div class="row"><span>{e(fallback or "Уточните совместимость у продавца")}</span></div>'
    more = f'<div class="more">и ещё {total - shown} моделей с этими моторами</div>' if total > shown else ""
    return page(f"""
<div style="padding:80px 70px 0">
  <div class="h1" style="font-size:84px">Подходит на</div>
  <div style="margin-top:28px">{"".join(f'<span class="chip" style="background:{ACCENT}">{e(c)}</span>' for c in codes[:4])}</div>
  <div class="list">{rows}</div>{more}
</div>
<div class="bar" style="font-size:34px;background:{INK}">Сверьте код мотора: он выбит на картере у основания цилиндра</div>""",
        """.list{margin-top:30px;background:#fff;border-radius:28px;padding:20px 40px}
.row{display:flex;gap:24px;padding:18px 0;border-bottom:2px solid #eceef1;font:500 34px/1.3 Inter}
.row:last-child{border:0}.row b{min-width:250px;font-weight:800}.more{font:600 32px Inter;color:#555;margin:22px 8px}""")


def specs_slide(card):
    e = html.escape
    skip = re.compile(r"упаковк|Вес|ИНН|продав|Страна|Артикул|Модель|ОЕМ|Совместим", re.I)
    opts = [o for o in (card.get("options") or []) if not skip.search(o.get("name", ""))][:9]
    rows = "".join(f'<div class="row"><span>{e(o["name"])}</span><b>{e(str(o.get("value", ""))[:70])}</b></div>' for o in opts)
    return page(f"""
<div style="padding:80px 70px 0">
  <div class="h1" style="font-size:84px">Характеристики</div>
  <div class="list">{rows or '<div class="row"><span>—</span></div>'}</div>
</div>""", """.list{margin-top:40px;background:#fff;border-radius:28px;padding:20px 40px}
.row{display:flex;justify-content:space-between;gap:30px;padding:24px 0;border-bottom:2px solid #eceef1;font:500 36px/1.3 Inter}
.row:last-child{border:0}.row span{color:#5b606b}.row b{text-align:right;font-weight:700}""")


def before_after(old, new_png, out):
    new = Image.open(new_png).convert("RGB")
    h = 1200
    old = old.resize((int(old.width * h / old.height), h))
    new = new.resize((900, h))
    canvas = Image.new("RGB", (old.width + new.width + 60, h + 120), "white")
    canvas.paste(old, (0, 120)); canvas.paste(new, (old.width + 60, 120))
    from PIL import ImageDraw, ImageFont
    d = ImageDraw.Draw(canvas)
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 64)
    except OSError:
        f = ImageFont.load_default()
    d.text((20, 25), "Было", fill="#888", font=f)
    d.text((old.width + 80, 25), "Стало", fill=ACCENT, font=f)
    canvas.save(out, quality=88)


def build(nm, out, spec_path=None):
    os.makedirs(out, exist_ok=True)
    card, host = wb.card(nm)
    if not card:
        raise SystemExit(f"артикул {nm} не найден")
    text = " ".join([card.get("imt_name", ""), card.get("description") or "",
                     " ".join(str(o.get("value", "")) for o in card.get("options") or [])])
    compat = json.loads(subprocess.run(["node", os.path.join(HERE, "compat.js")], input=text,
                                       capture_output=True, text=True, check=True).stdout)
    photo = fetch_photo(host, nm)
    if photo is None:
        raise SystemExit("нет фото")
    photo.save(os.path.join(out, "original.jpg"), quality=90)
    # главное фото у продавца бывает уже с надписями — ищем среди фото чистое, на ровном фоне
    best = (None, 0)
    for n in range(1, min((card.get("media") or {}).get("photo_count", 1), 8) + 1):
        p = photo if n == 1 else fetch_photo(host, nm, n)
        res = p and cut_background(p)
        if res and res[1] > best[1]:
            best = res
        if best[1] > 0.97:
            break
    cut, clean = best
    (cut or photo).save(os.path.join(out, "product.png"))

    spec = json.load(open(spec_path, encoding="utf-8")) if spec_path else auto_spec(card, compat)
    json.dump(spec, open(os.path.join(out, "spec.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    bad = check_spec(spec)
    if bad:
        print("ВНИМАНИЕ, запрещённые площадками слова:", ", ".join(bad), file=sys.stderr)

    own = "; ".join(str(o.get("value", "")) for o in card.get("options") or [] if "овместим" in o.get("name", ""))
    files = {"1-main.html": main_slide(spec, "product.png"),
             "2-compat.html": compat_slide(compat, own),
             }
    if len([o for o in card.get("options") or [] if o.get("value")]) >= 4:
        files["3-specs.html"] = specs_slide(card)
    for name, doc in files.items():
        open(os.path.join(out, name), "w", encoding="utf-8").write(doc)
    subprocess.run(["node", os.path.join(HERE, "render.js")] + [os.path.join(out, f) for f in files], check=True)
    before_after(photo, os.path.join(out, "1-main.png"), os.path.join(out, "before-after.jpg"))
    return {"nm": nm, "out": out, "spec": spec, "cutout": cut is not None, "clean": round(clean, 3),
            "check": cut is None or clean < 0.93,
            "engines": [x["code"] for x in compat["engines"]], "banned": bad}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("nm", type=int)
    ap.add_argument("-o", "--out")
    ap.add_argument("--spec")
    a = ap.parse_args()
    print(json.dumps(build(a.nm, a.out or os.path.join(HERE, "out", str(a.nm)), a.spec), ensure_ascii=False))
