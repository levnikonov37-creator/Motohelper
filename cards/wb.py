"""Чтение карточек Wildberries с их CDN (basket-NN.wbbasket.ru).

Поиск WB (search.wb.ru) из облака закрыт, а CDN с карточками открыт:
по артикулу отдаёт card.json, фото и данные продавца.
"""
import concurrent.futures as cf
import json
import os
import urllib.error
import urllib.request

UA = {"User-Agent": "Mozilla/5.0"}
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache")


def get(url, timeout=10):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception:
        return 0, b""


def _paths(nm):
    return nm // 100000, nm // 1000


_HOSTS_FILE = os.path.join(CACHE, "hosts.json")
_hosts = json.load(open(_HOSTS_FILE)) if os.path.exists(_HOSTS_FILE) else {}


def _guess_order(vol, hosts):
    """Корзины идут по возрастанию vol: начинаем с корзины ближайшего известного vol."""
    if not _hosts:
        return list(hosts)
    near = min(_hosts, key=lambda v: abs(int(v) - vol))
    b0 = _hosts[near]
    return sorted(hosts, key=lambda b: abs(b - b0))


def find_host(nm, hosts=range(1, 61)):
    """Номер корзины зависит от vol артикула; перебираем, начиная с вероятных."""
    vol, part = _paths(nm)

    def probe(b):
        host = f"basket-{b:02d}.wbbasket.ru"
        code, body = get(f"https://{host}/vol{vol}/part{part}/{nm}/info/ru/card.json", 8)
        return (b, host, body) if code == 200 else None

    order = _guess_order(vol, hosts)
    with cf.ThreadPoolExecutor(10) as ex:
        for i in range(0, len(order), 10):
            for res in ex.map(probe, order[i:i + 10]):
                if res:
                    b, host, body = res
                    _hosts[str(vol)] = b
                    os.makedirs(CACHE, exist_ok=True)
                    json.dump(_hosts, open(_HOSTS_FILE, "w"))
                    return host, body
    return None, None


def card(nm):
    """card.json + адрес хоста, или (None, None), если артикула нет."""
    host, body = find_host(nm)
    return (json.loads(body), host) if host else (None, None)


def image_url(host, nm, n=1, size="c516x688"):
    vol, part = _paths(nm)
    return f"https://{host}/vol{vol}/part{part}/{nm}/images/{size}/{n}.webp"


_suppliers = {}


def supplier(sid):
    """Юрлицо, ИНН, бренд магазина и почта, если продавец её указал."""
    if not sid:
        return {}
    if sid not in _suppliers:
        code, body = get(f"https://static-basket-01.wbbasket.ru/vol0/data/supplier-by-id/{sid}.json")
        _suppliers[sid] = json.loads(body) if code == 200 else {}
    return _suppliers[sid]
