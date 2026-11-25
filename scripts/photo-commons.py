#!/usr/bin/env python3
# Кандидаты фото моделей с Wikimedia Commons (только свободные лицензии: CC0, PD, CC BY, CC BY-SA — с указанием автора).
# Для каждой модели без фото ищет файлы, в названии которых есть марка и код модели, и пишет строки для
# scripts/bike-photo-add.py:  {"key", "urls", "source": "commons", "credit": "Автор, CC BY-SA 4.0", "page": страница файла}
#   node -e '…список моделей…' > models.txt ;  python3 scripts/photo-commons.py models.txt > commons.jsonl
# models.txt — по строке «Марка<TAB>Модель». Запросы к API — не чаще 1 в секунду, с понятным User-Agent.
import sys, json, re, time, urllib.request, urllib.error, urllib.parse, ssl, os, html

CA = "/root/.ccr/ca-bundle.crt"
CTX = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
UA = "MotoHelperPhotoBot/1.0 (+https://motohelper.ru; photo lookup for model pages)"
API = "https://commons.wikimedia.org/w/api.php"
OK_LIC = re.compile(r"^(CC0|Public domain|PD|CC BY(-SA)? [0-9.]+|CC BY(-SA)?)", re.I)


def api(params, tries=4):
    q = urllib.parse.urlencode(dict(params, format="json", formatversion=2, maxlag=5))
    for i in range(tries):
        req = urllib.request.Request(API + "?" + q, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429 or i == tries - 1: raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 60 * (i + 1))


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def codes(name):
    """основной код модели: «CRF250L», «XT250», «R 1200 GS» → crf250l / xt250 / r1200gs"""
    n = re.sub(r"\([^)]*\)", " ", name)
    n = re.sub(r"\b(19|20)\d\d\b|[–-]\s*(19|20)?\d\d\b", " ", n)
    n = n.split("/")[0]
    toks = [t for t in re.split(r"\s+", n.strip()) if t]
    full = norm("".join(toks))
    withdig = [norm(t) for t in toks if re.search(r"\d", t) and len(norm(t)) >= 2]
    return full, withdig


def strip_html(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s or ""))).strip()


def find(brand, name):
    full, withdig = codes(name)
    if not full: return None
    r = api({"action": "query", "generator": "search", "gsrnamespace": 6, "gsrlimit": 20,
             "gsrsearch": "%s %s motorcycle" % (brand, re.sub(r"\([^)]*\)", "", name).split("/")[0]),
             "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 1600})
    pages = (r.get("query") or {}).get("pages") or []
    out = []
    b = norm(brand)
    for p in sorted(pages, key=lambda x: x.get("index", 99)):
        t = norm(p.get("title", ""))
        if b not in t and not (brand.lower() == "harley-davidson" and "harley" in t): continue
        if full not in t and not (withdig and all(w in t for w in withdig)): continue
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png"): continue
        if (ii.get("width") or 0) < 800 or (ii.get("width") or 0) < (ii.get("height") or 1): continue
        md = ii.get("extmetadata") or {}
        lic = strip_html((md.get("LicenseShortName") or {}).get("value"))
        if not OK_LIC.match(lic or ""): continue
        if (md.get("Restrictions") or {}).get("value"): continue
        artist = strip_html((md.get("Artist") or {}).get("value"))[:80] or "автор не указан"
        out.append({"url": ii.get("thumburl") or ii.get("url"), "credit": "%s, %s" % (artist, lic), "page": ii.get("descriptionurl", "")})
        if len(out) >= 4: break
    return out


def main():
    # необязательный второй аргумент — с какой строки продолжить (номер из строк «# N» в stderr)
    start = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    for n, line in enumerate(open(sys.argv[1], encoding="utf-8")):
        if n < start or "\t" not in line: continue
        brand, name = line.rstrip("\n").split("\t", 1)
        print("#", n, brand, name, file=sys.stderr, flush=True)
        try:
            c = find(brand, name)
        except Exception as e:
            print("ошибка", brand, name, e, file=sys.stderr); time.sleep(5); continue
        if c:
            # bike-photo-add берёт первую подходящую ссылку; подпись и страница — от неё (одинаковые у кандидатов не гарантированы,
            # поэтому строка на каждый кандидат: добавятся по очереди, первая удачная займёт модель)
            for x in c:
                print(json.dumps({"key": brand + " " + name, "urls": [x["url"]], "source": "commons", "credit": x["credit"], "page": x["page"]}, ensure_ascii=False), flush=True)
        time.sleep(3.0)


if __name__ == "__main__":
    main()
