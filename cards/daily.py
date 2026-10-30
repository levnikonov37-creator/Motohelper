"""Утренняя пачка лидов: подготовить → (Claude проверяет) → отправить в Telegram.

  python3 cards/daily.py prepare [-n 12]      → cards/out/<дата>/batch.json + слайды
  python3 cards/daily.py send   [batch.json]   → каждый лид в Telegram владельцу
  python3 cards/daily.py drop <supplier_id> --why "..."  → не предлагать продавца

Артикулы берутся из cards/data/*.txt (новые дописывает утренняя задача).
Состояние — cards/data/state.json: какие артикулы уже смотрели и каким продавцам что
предложено. Там только номера WB, без имён и почт: репозиторий публичный.
Для отправки нужны переменные окружения TELEGRAM_BOT_TOKEN и TG_CHAT_ID.
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import glob
import json
import os
import sys
import urllib.request
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import leads  # noqa: E402
import slides  # noqa: E402

STATE = os.path.join(HERE, "data", "state.json")
REOFFER_DAYS = 60


def load_state():
    if os.path.exists(STATE):
        return json.load(open(STATE, encoding="utf-8"))
    return {"seen": [], "sellers": {}}


def save_state(st):
    st["seen"] = sorted(set(st["seen"]))
    json.dump(st, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=0)


def prepare(n, min_score):
    st = load_state()
    today = dt.date.today().isoformat()
    out = os.path.join(HERE, "out", today)
    os.makedirs(out, exist_ok=True)

    ids = [i for i in leads.read_ids(sorted(glob.glob(os.path.join(HERE, "data", "*.txt"))))
           if i not in set(st["seen"])]
    print(f"новых артикулов: {len(ids)}", file=sys.stderr)
    with cf.ThreadPoolExecutor(4) as ex:
        rows = [r for r in ex.map(leads.audit, ids) if r]
    st["seen"] += ids

    # худшая карточка у каждого продавца, которому ещё ничего не предлагали
    cutoff = (dt.date.today() - dt.timedelta(days=REOFFER_DAYS)).isoformat()
    worst = {}
    for r in sorted(rows, key=lambda r: -r["score"]):
        sid = str(r["supplier_id"])
        prev = st["sellers"].get(sid)
        if r["foreign"] or r["score"] < min_score or sid in worst:
            continue
        if prev and (prev["status"] != "offered" or prev["date"] > cutoff):
            continue
        worst[sid] = r

    batch = []
    for sid, r in list(worst.items())[: n * 2]:
        if len(batch) >= n:
            break
        try:
            res = slides.build(r["nm"], os.path.join(out, str(r["nm"])))
        except SystemExit as e:
            print(f"{r['nm']}: {e}", file=sys.stderr)
            continue
        batch.append({
            "supplier_id": sid, "shop": r["shop"], "legal": r["legal"], "inn": r["inn"], "email": r["email"],
            "seller_url": f"https://www.wildberries.ru/seller/{sid}", "nm": r["nm"], "card_url": r["url"],
            "title": r["title"], "score": r["score"], "problems": r["problems"],
            "message": leads.message(r["shop"] or f"продавец {sid}", [r]),
            "slides": res["out"], "check": res["check"], "banned": res["banned"], "spec": res["spec"],
        })
    path = os.path.join(out, "batch.json")
    json.dump(batch, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    save_state(st)
    print(f"в пачке {len(batch)}, проверить глазами: {sum(b['check'] for b in batch)} -> {path}", file=sys.stderr)
    return path


# ---------- Telegram ----------

def tg(method, fields, files=None):
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    url = f"https://api.telegram.org/bot{token}/{method}"
    if files:
        b = uuid.uuid4().hex
        body = b""
        for k, v in fields.items():
            body += f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
        for k, p in files.items():
            body += (f'--{b}\r\nContent-Disposition: form-data; name="{k}"; filename="{os.path.basename(p)}"\r\n'
                     "Content-Type: application/octet-stream\r\n\r\n").encode() + open(p, "rb").read() + b"\r\n"
        body += f"--{b}--\r\n".encode()
        req = urllib.request.Request(url, body, {"Content-Type": f"multipart/form-data; boundary={b}"})
    else:
        req = urllib.request.Request(url, json.dumps(fields).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def contact_line(b):
    parts = [f"почта: {b['email']}" if b["email"] else "почты нет — искать по названию в TG/VK",
             f"ИНН {b['inn']}" if b["inn"] else ""]
    return " · ".join(p for p in parts if p)


def send(path):
    batch = json.load(open(path, encoding="utf-8"))
    chat = os.environ["TG_CHAT_ID"]
    st = load_state()
    today = dt.date.today().isoformat()
    tg("sendMessage", {"chat_id": chat, "text": f"Лиды на {today}: {len(batch)}. "
                       "На каждого: фото «было/стало», ниже текст — скопировать и отправить продавцу вместе с картинкой 1-main.png."})
    for i, b in enumerate(batch, 1):
        caption = (f"{i}. {b['shop']} — {b['legal']}\n{contact_line(b)}\n"
                   f"Карточка: {b['card_url']}\nМагазин: {b['seller_url']}\nПроблемы: {b['problems']}")
        tg("sendPhoto", {"chat_id": chat, "caption": caption[:1024]},
           {"photo": os.path.join(b["slides"], "before-after.jpg")})
        tg("sendDocument", {"chat_id": chat}, {"document": os.path.join(b["slides"], "1-main.png")})
        tg("sendMessage", {"chat_id": chat, "text": b["message"]})
        st["sellers"][b["supplier_id"]] = {"status": "offered", "date": today, "nm": b["nm"]}
    save_state(st)
    print(f"отправлено в Telegram: {len(batch)}", file=sys.stderr)


def drop(sid, why):
    st = load_state()
    st["sellers"][str(sid)] = {"status": "skip", "date": dt.date.today().isoformat(), "why": why}
    save_state(st)
    path = os.path.join(HERE, "out", dt.date.today().isoformat(), "batch.json")
    if os.path.exists(path):  # убрать из сегодняшней пачки
        batch = [b for b in json.load(open(path, encoding="utf-8")) if b["supplier_id"] != str(sid)]
        json.dump(batch, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("prepare"); p.add_argument("-n", type=int, default=12); p.add_argument("--min-score", type=int, default=6)
    s = sub.add_parser("send"); s.add_argument("batch", nargs="?")
    d = sub.add_parser("drop"); d.add_argument("supplier_id"); d.add_argument("--why", default="")
    a = ap.parse_args()
    if a.cmd == "prepare":
        print(prepare(a.n, a.min_score))
    elif a.cmd == "send":
        send(a.batch or os.path.join(HERE, "out", dt.date.today().isoformat(), "batch.json"))
    else:
        drop(a.supplier_id, a.why)
