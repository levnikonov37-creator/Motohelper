"""Ищет продавцов со слабыми карточками на Wildberries.

  python3 cards/leads.py артикулы.txt [ещё.txt ...] -o cards/out

На входе любые тексты со ссылками на товары WB или голыми артикулами.
На выходе в папке -o:
  cards.csv   — каждая карточка: что с ней не так и сколько баллов слабости
  leads.csv   — российские продавцы, самые слабые сверху, с готовым первым сообщением
                (китайские магазины выкидываются: им не написать, --keep-foreign оставит)
  report.html — то же с главными фото, смотреть глазами перед отправкой
"""
import argparse
import concurrent.futures as cf
import csv
import html
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wb  # noqa: E402

try:
    from PIL import Image
except ImportError:
    Image = None

COMPAT_KEYS = ("овместим", "Марка", "Модель", "двигател")


def read_ids(paths):
    ids = []
    for p in paths:
        text = open(p, encoding="utf-8").read()
        found = re.findall(r"catalog/(\d{6,11})", text) or re.findall(r"\b(\d{6,11})\b", text)
        ids += [int(x) for x in found]
    return list(dict.fromkeys(ids))


def bare_main_photo(url):
    """Доля почти белых пикселей: голое фото товара на белом без оформления."""
    if not Image:
        return None
    code, body = wb.get(url.replace("c516x688", "c246x328"))
    if code != 200:
        return None
    im = Image.open(io.BytesIO(body)).convert("RGB").resize((60, 80))
    raw = im.tobytes()
    white = sum(1 for i in range(0, len(raw), 3) if min(raw[i:i + 3]) > 232)
    return white / (len(raw) // 3) > 0.5


def audit(nm):
    c, host = wb.card(nm)
    if not c:
        return None
    opts = c.get("options") or []
    sid = (c.get("selling") or {}).get("supplier_id")
    brand = (c.get("selling") or {}).get("brand_name", "")
    compat = [o.get("value", "") for o in opts if any(k in o.get("name", "") for k in COMPAT_KEYS)]
    compat = [v for v in compat if v and v.strip().lower() != brand.strip().lower()]
    media = c.get("media") or {}
    photos = media.get("photo_count", 0)
    desc = len(c.get("description") or "")
    img = wb.image_url(host, nm)

    problems, score = [], 0
    if photos <= 3:
        problems.append(f"всего {photos} фото"); score += 3
    elif photos <= 5:
        problems.append(f"мало фото ({photos})"); score += 1
    if not compat:
        problems.append("не указана совместимость"); score += 3
    if desc < 300:
        problems.append(f"короткое описание ({desc} знаков)"); score += 2
    if len(opts) < 5:
        problems.append(f"мало характеристик ({len(opts)})"); score += 1
    if not media.get("has_video"):
        problems.append("нет видео"); score += 1
    if bare_main_photo(img):
        problems.append("главное фото без оформления"); score += 3

    s = wb.supplier(sid)
    legal, inn = s.get("supplierName", ""), s.get("inn", "")
    foreign = bool(re.search(r"[\u4e00-\u9fff]", legal)) or bool(inn and not re.fullmatch(r"\d{10}|\d{12}", inn))
    return {
        "nm": nm, "url": f"https://www.wildberries.ru/catalog/{nm}/detail.aspx",
        "title": c.get("imt_name", ""), "subject": c.get("subj_name", ""),
        "photos": photos, "video": bool(media.get("has_video")), "desc_len": desc,
        "options": len(opts), "compat": "; ".join(compat)[:150],
        "score": score, "problems": ", ".join(problems), "img": img,
        "supplier_id": sid or "", "shop": s.get("trademark") or s.get("supplierName", ""),
        "legal": legal, "inn": inn, "email": s.get("email", ""), "foreign": foreign,
    }


HUMAN = [
    ("главное фото без оформления", "главное фото — товар на белом почти без информации, в ленте его легко пролистать"),
    ("не указана совместимость", "в характеристиках не указано, на какие моторы и модели она подходит — а для запчасти это главный вопрос покупателя и фильтр в поиске"),
    ("фото", "фото мало, покупателю не на что смотреть"),
    ("описание", "описание совсем короткое"),
]


def message(shop, cards):
    worst = cards[0]
    said = []
    for key, text in HUMAN:
        if key in worst["problems"] and len(said) < 2:
            said.append(text)
    issues = "; ".join(said) or "карточку можно заметно усилить"
    return (
        f"Здравствуйте! Посмотрел ваш магазин {shop} на Wildberries. "
        f"В карточке «{worst['title'][:60]}» (арт. {worst['nm']}) {issues}. "
        "Я делаю инфографику для мотозапчастей и сам разбираюсь в китайских моторах — "
        "совместимость указываю точно. Могу бесплатно переделать главный слайд этой карточки, "
        "чтобы вы сравнили. Прислать?"
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="+")
    ap.add_argument("-o", "--out", default="cards/out")
    ap.add_argument("--min-score", type=int, default=3)
    ap.add_argument("--keep-foreign", action="store_true", help="не выкидывать китайских продавцов")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    ids = read_ids(a.inputs)
    print(f"артикулов: {len(ids)}", file=sys.stderr)
    with cf.ThreadPoolExecutor(4) as ex:
        rows = [r for r in ex.map(audit, ids) if r]
    rows.sort(key=lambda r: -r["score"])

    with open(os.path.join(a.out, "cards.csv"), "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["nm"], delimiter=";")
        w.writeheader(); w.writerows(rows)

    shops = {}
    for r in rows:
        shops.setdefault(r["supplier_id"], []).append(r)
    leads = []
    for sid, cards in shops.items():
        if cards[0]["score"] < a.min_score or (cards[0]["foreign"] and not a.keep_foreign):
            continue
        shop = cards[0]["shop"] or f"продавец {sid}"
        leads.append({
            "shop": shop, "legal": cards[0]["legal"], "inn": cards[0]["inn"], "email": cards[0]["email"],
            "seller_url": f"https://www.wildberries.ru/seller/{sid}" if sid else "",
            "cards_seen": len(cards), "worst_score": cards[0]["score"],
            "worst_card": cards[0]["url"], "message": message(shop, cards),
        })
    leads.sort(key=lambda l: (-l["worst_score"], -l["cards_seen"]))
    with open(os.path.join(a.out, "leads.csv"), "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(leads[0].keys()) if leads else ["shop"], delimiter=";")
        w.writeheader(); w.writerows(leads)

    write_report(os.path.join(a.out, "report.html"), rows, leads)
    print(f"карточек: {len(rows)}, продавцов в работу: {len(leads)} -> {a.out}", file=sys.stderr)


def write_report(path, rows, leads):
    e = html.escape
    items = "".join(
        f'<div class="c"><a href="{e(r["url"])}"><img src="{e(r["img"])}" loading="lazy"></a>'
        f'<b>{r["score"]}</b> {e(r["title"][:70])}<br><small>{e(r["shop"])}</small>'
        f'<p>{e(r["problems"])}</p></div>'
        for r in rows
    )
    table = "".join(
        f'<tr><td>{e(l["shop"])}<br><small>{e(l["legal"])} · ИНН {e(l["inn"])} · {e(l["email"])}</small></td>'
        f'<td>{l["worst_score"]}</td><td><a href="{e(l["seller_url"])}">магазин</a></td>'
        f'<td>{e(l["message"])}</td></tr>'
        for l in leads
    )
    open(path, "w", encoding="utf-8").write(f"""<!doctype html><meta charset="utf-8">
<title>Продавцы со слабыми карточками</title>
<style>body{{font:14px system-ui;margin:16px}}.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}}
.c img{{width:100%;aspect-ratio:3/4;object-fit:cover;background:#eee}}.c p{{color:#b00;margin:4px 0}}
table{{border-collapse:collapse}}td{{border:1px solid #ccc;padding:6px;vertical-align:top}}</style>
<h1>Продавцы ({len(leads)})</h1><table>{table}</table>
<h1>Карточки ({len(rows)}), слабые сверху</h1><div class="g">{items}</div>""")


if __name__ == "__main__":
    main()
