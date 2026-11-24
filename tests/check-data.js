// Проверка базы (js/data.js — каталог, js/kb.js — инструкции и диагностика) без браузера: node tests/check-data.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const ctx = {};
// каталог должен работать и без базы знаний: сайт показывает первый экран до того, как она загрузится.
// Поэтому js/data.js не читает и не меняет то, что объявлено в js/kb.js, — следим за каждым обращением.
const KB_NAMES = ["GUIDES", "DIAG", "CAUSES", "SYMPTOMS", "CONDITIONS", "FAULTS", "OBD", "REF", "WIRE", "WIRING", "NO_CVT_GUIDES"];
const kbVal = {}, kbReads = [];
let inData = true;
for (const k of KB_NAMES) Object.defineProperty(ctx, k, { configurable: true, enumerable: true,
  get() { if (inData) kbReads.push(k + " — " + ((new Error().stack || "").split("\n").find((l) => l.includes("js/data.js")) || "").trim()); return kbVal[k]; },
  set(v) { kbVal[k] = v; } });
vm.createContext(ctx);
let kbBefore = null;
for (const f of ["js/data.js", "js/kb.js"]) {
  try {
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  } catch (x) {
    const at = (x.stack || "").split("\n").find((l) => l.includes(f));
    console.error(f + " не загрузился: " + x.message + (at ? "\n  " + at.trim() : ""));
    if (f === "js/data.js") console.error("Частая причина — модель ссылается на двигатель, которого нет в ENGINES.");
    else console.error("js/kb.js выполняется после js/data.js: проверь, что нужное ему из каталога там есть.");
    process.exit(1);
  }
  if (f === "js/data.js") { inData = false; kbBefore = KB_NAMES.map((k) => [k, JSON.stringify(kbVal[k])]); }
}
const { ENGINES, BIKES, PARTS, GUIDES, TUNING, TUNE_GUIDE } = ctx;

const errors = [];
const fail = (msg) => errors.push(msg);

// марки в списке — в порядке русской сортировки (sortBikes сортирует своей функцией brandSortKey, без Intl)
{
  const brands = [...new Set(BIKES.map((b) => b.brand))].filter((b) => b !== "Любая модель");
  const ru = brands.slice().sort(new Intl.Collator("ru").compare);
  const at = ru.findIndex((b, i) => b !== brands[i]);
  if (at >= 0) fail("Порядок марок не как у русской сортировки: «" + brands[at] + "» вместо «" + ru[at] + "» — поправь brandSortKey в js/data.js");
}

// js/data.js не трогает базу знаний: до загрузки js/kb.js в ней пустые заготовки
for (const [k, v] of kbBefore) if (!["[]", "{}"].includes(v)) fail("js/data.js меняет " + k + " — это база знаний, её место в js/kb.js");
for (const r of kbReads.slice(0, 5)) fail("js/data.js читает базу знаний (" + r + ") — до загрузки js/kb.js там пусто; перенеси этот код в js/kb.js");

// Типы мотоциклов, которые понимает интерфейс (BF_TYPES в js/app.js)
const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const typesSrc = app.match(/const BF_TYPES = (\[[^\]]*\])/);
const TYPES = typesSrc ? JSON.parse(typesSrc[1]) : null;
if (!TYPES) fail("Не найден BF_TYPES в js/app.js");

// Двигатели
const GROUPS = new Set(["horiz", "cg", "cb", "zs4v", "dohc", "air", "liquid", "carb", "efi", "2t", "4t", "small", "big", "balancer", "jp", "eu", "in", "cn", "ru", "cvt", "kick", "estart", "shaft", "belt", "pv"]); // kick / estart — по полю start (кик / электростартер); shaft / belt — по приводу (кардан / ремень); pv — 2Т с клапаном выпуска
for (const [id, e] of Object.entries(ENGINES)) {
  for (const f of ["code", "name", "stroke", "cooling", "spark"]) if (!e[f]) fail(`Двигатель ${id}: пустое поле ${f}`);
  if (!(e.cc > 0)) fail(`Двигатель ${id}: объём cc = ${e.cc}`);
  if (!(e.hp > 0)) fail(`Двигатель ${id}: мощность hp = ${e.hp}`);
  if (!Array.isArray(e.groups) || !e.groups.length) fail(`Двигатель ${id}: нет groups`);
  else e.groups.forEach((g) => GROUPS.has(g) || fail(`Двигатель ${id}: неизвестная группа "${g}"`));
  if ((e.groups || []).includes("carb") && (e.groups || []).includes("efi")) fail(`Двигатель ${id}: одновременно carb и efi`);
  try {
    const pk = ctx.enginePeak(e);
    if (!pk || !(pk.peak > 0)) fail(`Двигатель ${id}: enginePeak вернул ${JSON.stringify(pk)}`);
    ctx.maintItems(e);
    ctx.carbRange(e);
  } catch (x) {
    fail(`Двигатель ${id}: ошибка расчёта — ${x.message}`);
  }
}

// Мотоциклы
const seen = new Set();
BIKES.forEach((b, i) => {
  const key = b.brand + "|" + b.name;
  if (seen.has(key)) fail(`Дубль модели: ${b.brand} ${b.name}`);
  seen.add(key);
  if (!b.brand || !b.name) fail(`Мотоцикл #${i}: нет марки или названия`);
  if (TYPES && !TYPES.includes(b.type)) fail(`${key}: неизвестный тип "${b.type}"`);
  if (!b.versions || !b.versions.length) fail(`${key}: нет версий`);
  (b.versions || []).forEach((v) => {
    const e = ENGINES[v.engine];
    if (!e) return fail(`${key}: нет двигателя ${v.engine}`);
    if (v.hp != null && !(v.hp > 0)) fail(`${key}: неверная мощность версии ${v.hp}`);
    try {
      const s = ctx.speedFor(e, b, {}, [], {});
      const top = s && (s.v != null ? s.v : s.top != null ? s.top : s);
      if (typeof top === "number" && !(top > 0 && top < 400)) fail(`${key}: странная максималка ${top}`);
      ctx.defaultSprockets(b, e);
    } catch (x) {
      fail(`${key}: ошибка расчёта скорости — ${x.message}`);
    }
  });
});
// Мотор в названии модели (китайские моторы) должен совпадать с мотором в базе:
// «K23 NB300» не может стоять на PR300, «с мотором ZS182MN» — на NB300 и т.п.
const NAME_ENGINE = [
  // уточнённые варианты одного семейства (FIXCN_*: число передач, инжектор) считаются тем же мотором
  [/NB300|174MN-5/i, ["NB300", "FIXCN_NB300_5", "FIXCN_NB300E_5"]], [/174MN-3|CBS300/i, ["CBS300"]], [/\b174\b|174MN(?!-)/i, ["NB300", "CBS300"]],
  [/CB300RL/i, ["FIXCN_CB300RL_6", "FIXCN_CB300RL_5"]], [/177FMN/i, ["FIXCN_PR300PRO"]],
  [/CB300(?!RL)(?![\s\S]*177FMN)|175FMM/i, ["175FMM"]], [/NC300|182MN/i, ["NC300", "NB300E"]], [/YBS/i, ["YBS300", "YBS300G2"]],
  [/PR250|172FMM-5/i, ["172FMM-5", "FIXCN_PR250_5"]], [/PR300/i, ["PR300", "FIXCN_PR300_5", "FIXCN_PR300_6", "PR300E", "FIXCN_PR300PRO"]], [/NC250|177MM/i, ["NC250", "NC250E"]], [/NC450|194MQ/i, ["NC450", "NC450C"]],
];
const JP_EU = new Set(["Honda", "Yamaha", "Kawasaki", "Suzuki", "KTM", "Husqvarna", "GasGas", "BMW", "Triumph", "Ducati", "Aprilia"]);
BIKES.forEach((b) => {
  if (JP_EU.has(b.brand)) return;
  NAME_ENGINE.forEach(([re, ok]) => {
    if (re.test(b.name) && !b.versions.some((v) => ok.includes(v.engine)))
      fail(`${b.brand} ${b.name}: в названии мотор ${b.name.match(re)[0]}, а в базе ${b.versions.map((v) => v.engine).join(", ")}`);
  });
});
Object.keys(ctx.ENGINE_AKA || {}).forEach((id) => ENGINES[id] || fail(`ENGINE_AKA: нет двигателя ${id}`));

const anyIdx = BIKES.findIndex((b) => b.brand === "Любая модель");
if (anyIdx >= 0 && BIKES.slice(anyIdx).some((b) => b.brand !== "Любая модель")) fail("«Любая модель» должна идти в конце списка");

// Запчасти
const partIds = new Set();
PARTS.forEach((p) => {
  if (partIds.has(p.id)) fail(`Дубль id запчасти: ${p.id}`);
  partIds.add(p.id);
  if (!(p.price > 0)) fail(`Запчасть ${p.id}: цена ${p.price}`);
  (p.fit || []).forEach((f) => ENGINES[f] || GROUPS.has(f) || fail(`Запчасть ${p.id}: fit "${f}" — нет такого двигателя или группы`));
});
// Детали двигателя подписаны кодом своего мотора: у мотора 174 не должно быть деталей «ZS182MN» и наоборот
const engIds = Object.keys(ENGINES).sort((a, b) => b.length - a.length);
const engCodes = [...new Set(Object.values(ENGINES).map((e) => e.code))];
PARTS.forEach((p) => {
  const own = engIds.find((k) => p.id.startsWith(k + "-"));
  if (!own) return;
  const mine = ENGINES[own].code;
  const other = engCodes.find((c) => c !== mine && c.length < p.name.length && p.name.endsWith(" " + c) && !p.name.endsWith(" " + mine));
  if (other) fail(`Запчасть ${p.id} «${p.name}»: в названии код ${other}, а мотор ${own} — ${mine}`);
  // общие детали — только у моторов с одинаковым кодом (ZS177MM и ZS177MM EFI), а не 174 с 182
  (p.fit || []).forEach((f) => {
    if (f !== own && ENGINES[f] && ENGINES[f].code.split(" ")[0] !== mine.split(" ")[0])
      fail(`Запчасть ${p.id} «${p.name}» подходит к ${f} (${ENGINES[f].code}), хотя сделана под ${mine}`);
  });
});

// Объём в названии модели должен совпадать с мотором: «Sportster 1200» не может стоять на моторе 883.
// Не считаем: числа меньше 200 при моторе больше 600 (кубические дюймы «114», индексы «T120», «M-72», «AF35»)
// и модели, где число — индекс, а не объём (список ниже).
const CC_OK = new Set(["Урал М-67 / ИМЗ-8.103", "Sharmax PowerMax 330", "ИЖ 49", "ИЖ 56", "Ковровец К-55 / К-58", "Минск М-103", "Минск М-104", "Минск М-105", "Минск М-106",
  "Тула ТМЗ-5.951", "Тула ТМЗ-5.952", "BMW F 650 GS (двухцилиндровый)", "Honda Dio AF62", "Honda Dio AF68", "Honda Tact AF75", "MMZ 065", "Promax MX300 BigBore", "Promax MX350PR", "Hammer Wolf 67", "Hammer Wolf 072"]);
const ccBad = [];
BIKES.forEach((b) => {
  if (b.brand === "Любая модель" || CC_OK.has(b.brand + " " + b.name)) return;
  const name = b.name.replace(/\([^)]*\)/g, " ").replace(/\b\d{2}\/\d{2}\b/g, " ").replace(/\b(19|20)\d\d\b/g, " ");
  const nums = (name.match(/\d{2,4}/g) || []).map(Number).filter((n) => n >= 49 && n <= 2100);
  if (!nums.length) return;
  b.versions.forEach((v) => {
    const e = ENGINES[v.engine];
    const best = nums.reduce((m, n) => (Math.abs(n - e.cc) < Math.abs(m - e.cc) ? n : m), nums[0]);
    if (best < 200 && e.cc > 600) return;
    if (Math.abs(best - e.cc) / best > 0.15) ccBad.push(`${b.brand} ${b.name}${v.years ? " [" + v.years + "]" : ""}: в названии ${best}, мотор ${v.engine} — ${e.cc} см³`);
  });
});
ccBad.forEach((m) => fail("Объём не совпадает: " + m));

// Инструкции и тюнинг
const guideIds = new Set();
GUIDES.forEach((g) => {
  if (guideIds.has(g.id)) fail(`Дубль инструкции: ${g.id}`);
  guideIds.add(g.id);
  if (!g.steps || !g.steps.length) fail(`Инструкция ${g.id}: нет шагов`);
});
Object.entries(TUNE_GUIDE || {}).forEach(([t, g]) => guideIds.has(g) || fail(`TUNE_GUIDE.${t}: нет инструкции "${g}"`));
Object.entries(ctx.SEASON || {}).forEach(([w, S]) => {
  if (!guideIds.has(S.guide)) fail(`SEASON.${w}: нет инструкции "${S.guide}"`);
  S.items.forEach((it) => it[3] && !guideIds.has(it[3]) && fail(`SEASON.${w}.${it[0]}: нет инструкции "${it[3]}"`));
});
TUNING.forEach((t) => {
  if (!t.id || !t.title) fail(`Доработка без id или названия: ${JSON.stringify(t).slice(0, 80)}`);
});

// Фото моделей: модель есть в базе, оба файла (800 px и миниатюра) на месте
{
  const keys = new Set(BIKES.map((b) => b.brand + " " + b.name));
  for (const k of ctx.BIKE_PHOTOS || []) {
    if (!keys.has(k)) fail("BIKE_PHOTOS: нет модели «" + k + "»");
    const f = ctx.bikePhotoSlug(k) + ".webp";
    for (const d of ["img/bikes/", "img/bikes/s/"]) if (!fs.existsSync(path.join(root, d + f))) fail("BIKE_PHOTOS: нет файла " + d + f);
  }
}

// признаки мотора — без повторов
for (const [id, e] of Object.entries(ENGINES)) if (new Set(e.groups).size !== e.groups.length) fail("Мотор " + id + ": повторяются признаки " + e.groups.join(","));
// тюнинг под класс мотоцикла: защита картера — не для дорожного спорта, у мопеда — свой прямоток,
// безымянного «slip-on» не предлагаем никому; у каждой доработки — узел из TUNE_NODES
{
  const by = (key) => BIKES.find((b) => b.brand + " " + b.name === key) || BIKES.find((b) => (b.brand + " " + b.name).indexOf(key) === 0);
  const okFor = (id, key) => { const b = by(key), t = TUNING.find((x) => x.id === id); return !!(b && t && ctx.tuningFor(t, ENGINES[b.versions[0].engine], b).ok); };
  const cases = [["skid", "Yamaha YZF-R6", false], ["skid", "Motoland XR250", true], ["sliders", "Yamaha YZF-R6", true], ["ex-moped", "Motoland Alpha", true],
    ["ex-fmf", "Motoland Alpha", false], ["ex-cn-fmf", "Motoland XR250", true], ["slip", "Motoland XR250", false], ["mousse", "Harley-Davidson Fat Boy", false], ["crashbars", "Harley-Davidson Fat Boy", true],
    /* звёзды и цепь — только у цепного привода: не у вариатора, кардана и ремня */
    ["sp-tq", "Honda PCX 125", false], ["x-ring", "BMW R 1250 GS", false], ["sp-sp", "Harley-Davidson Fat Boy", false], ["chainguide", "BMW R 1250 GS", false], ["x-ring", "Motoland XR250", true],
    /* скутер: вариатор и ЦПГ под свой мотор; у 2Т нет масла в картере и клапана выпуска; у мопеда с коробкой вариатора нет */
    ["cvt-rollers", "Honda Dio AF34", true], ["bore-2t70", "Honda Dio AF34", true], ["oilcool", "Honda Dio AF34", false], ["pv-spring", "Honda Dio AF34", false],
    ["bore-qmb72", "Irbis Nirvana 50", true], ["cvt-unlock", "Irbis Nirvana 50", true], ["cvt-unlock", "Honda Dio AF34", false], ["bore-2t70", "Honda PCX 125", false],
    ["cvt-rollers", "Honda PCX 125", true], ["cvt-rollers", "Motoland Alpha", false], ["oilcool", "Motoland XR250", true],
    /* FCR с ускорительным насосом — для 280–300-кубовых 4-клапанных, не для 250 на PE30 */
    ["carb-fcr", "Kayo T6 300", true], ["carb-fcr", "Kayo K1 300", true], ["carb-fcr", "Kayo T2 250", false],
    /* карбюратор — не для инжектора; мотоциклетное сцепление и защита радиаторов — не для скутера */
    ["pwk", "Yamaha TMAX 530", false], ["pwk", "Kayo K1 300", true], ["clutch", "Yamaha TMAX 530", false], ["radbrace", "Honda PCX 125", false]];
  for (const [id, key, want] of cases) if (by(key) && okFor(id, key) !== want) fail("Тюнинг по классу: «" + id + "» для " + key + " — " + (want ? "должно подходить" : "не должно подходить"));
  /* запчасти под мотор и класс: мусс и карбюратор — не для R6, звёзды — не для вариатора и кардана */
  const pOk = (kind, key) => { const b = by(key); if (!b) return null; const e = ENGINES[b.versions[0].engine]; return PARTS.some((p) => p.kind === kind && ctx.partFor(p, e, b)); };
  for (const [kind, key, want] of [["mousse", "Yamaha YZF-R6", false], ["mousse", "Motoland XR250", true], ["carb", "Yamaha YZF-R6", false], ["carb", "Motoland XR250", true],
    ["sprocketF", "Honda PCX", false], ["sprocketF", "BMW R 1250 GS", false], ["skid", "Yamaha YZF-R6", false], ["skid", "Motoland XR250", true],
    /* скутер: без троса сцепления, лапки КПП, спиц; 2Т — без маслорадиатора; свои ремень и ролики есть */
    ["clutchcable", "Honda Dio AF34", false], ["shiftlever", "Honda PCX", false], ["spokes", "Honda Dio AF34", false], ["oilcooler", "Honda Dio AF34", false],
    ["cvtbelt", "Honda Dio AF34", true], ["clutchcable", "Motoland Alpha", true]]) {
    const got = pOk(kind, key);
    if (got !== null && got !== want) fail("Запчасти под класс: «" + kind + "» для " + key + " — " + (want ? "должна быть" : "не должна быть"));
  }
  /* инструкции — только где узел есть: кардан, ремень, цепь, клапаны, спицы */
  for (const [gid, id, want] of [["shaft-oil", "R1250", true], ["shaft-oil", "172FMM", false], ["belt-drive", "HD_M8_107", true], ["chain", "R1250", false], ["chain", "172FMM", true],
    ["jp-valves-shim", "HON_AF34E", false], ["spokes", "HON_AF34E", false], ["multi-sync", "HON_JF28E", false], ["trial-setup", "TR2T", true], ["trial-setup", "KTM300TPI", false]]) {
    if (ENGINES[id] && ctx.guideOk({ id: gid }, ENGINES[id]) !== want) fail("Инструкция «" + gid + "» для " + id + " — " + (want ? "должна быть" : "не должна быть"));
  }
  /* диагностика: у скутера нет КПП и цепи, у кардана — цепи, у 2Т — клапанов, на инжекторе — карбюратора */
  const DG = (id) => (ctx.DIAG || []).find((d) => d.id === id), SY = (id) => [].concat(...(ctx.SYMPTOMS || []).map((c) => c.items)).find((i) => i[0] === id);
  for (const [kind, xid, id, want] of [["d", "gears", "HON_AF34E", false], ["d", "chain", "R1250", false], ["d", "chain", "172FMM", true], ["s", "tick", "HON_AF34E", false],
    ["s", "popintake", "HON_JF28E", false], ["s", "tick", "172FMM", true]]) {
    const it = kind === "d" ? DG(xid) : SY(xid), e = ENGINES[id];
    if (it && e && (kind === "d" ? ctx.kbOk(it, e) : ctx.symOk(it, e)) !== want) fail("Диагностика «" + xid + "» для " + id + " — " + (want ? "должна быть" : "не должна быть"));
  }
  /* генеральная репетиция: детали и логика «по классу» — чтобы старые ошибки не вернулись */
  const fitsE = (p, e) => ctx.fits(p, e);
  for (const id of Object.keys(ENGINES)) {
    const e = ENGINES[id];
    if (e.stroke === "2T") {
      const bad = PARTS.find((p) => ["camchain", "tensioner", "valvein", "valveex", "camshaft", "oilfilter", "vcgasket", "shims"].indexOf(p.kind) >= 0 && fitsE(p, e));
      if (bad) fail("2Т без ГРМ и клапанов: «" + bad.name + "» подходит к " + id);
      if (e.timing && e.timing !== "—") fail("2Т: у " + id + " привод ГРМ «" + e.timing + "»");
      if (e.groups.indexOf("pv") < 0) { const pv = PARTS.find((p) => p.kind === "pv" && fitsE(p, e)); if (pv) fail("Клапан выпуска у мотора без него: " + id); }
    }
    if (e.groups.indexOf("liquid") < 0) { const bad = PARTS.find((p) => ["coolant", "waterpump", "thermostat", "radcap"].indexOf(p.kind) >= 0 && fitsE(p, e)); if (bad) fail("Воздушное охлаждение, а подходит «" + bad.name + "»: " + id); }
    if (/:\s*1\b/.test(e.compression || "") && !/мануал|бар/.test(e.compression)) fail("Компрессия — степень сжатия, а не давление: " + id + " «" + e.compression + "»");
    /* масло к ТО — той вязкости, что в паспорте 4Т */
    const vis = e.stroke !== "2T" && (String(e.oil || "").match(/(\d+)W-?(\d+)/i) || [])[0];
    const oil = vis && ctx.partByKind("oil", e);
    if (oil && oil.name.toUpperCase().replace(/[\s-]/g, "").indexOf(vis.toUpperCase().replace(/[\s-]/g, "")) < 0) fail("Масло к ТО " + id + ": в паспорте " + vis + ", а предлагается «" + oil.name + "»");
  }
  for (const p of PARTS) if (p.kind === "spark" && /по мануалу|по каталогу/i.test(p.name)) fail("Деталь-свеча без кода: " + p.id);
  /* мощность и момент должны сходиться: пик мощности на 2 200–15 500 об/мин (иначе момент списан с другого мотора) */
  for (const id of Object.keys(ENGINES)) { const e = ENGINES[id], hp = parseFloat(e.hp), m = /([\d.,]+)\s*Н·м/.exec(String(e.torque || ""));
    if (hp && m) { const rpm = hp * 7121 / parseFloat(m[1].replace(",", ".")); if (rpm > 15500 || rpm < 2200) fail("Мощность и момент не сходятся у " + id + ": " + e.hp + " л.с. при " + e.torque + " (пик ≈ " + Math.round(rpm) + " об/мин)"); } }
  const nodes = new Set((ctx.TUNE_NODES || []).map((n) => n[0]));
  for (const t of TUNING) if (!nodes.has(ctx.tuneNode(t))) fail("Тюнинг: у «" + t.id + "» нет узла (TUNE_NODES)");
  for (const r of ctx.CARB_UP || []) for (const id of (r.ladder || []).concat([r.up, r.bore, r.boreCarb]).filter(Boolean)) if (!TUNING.find((t) => t.id === id)) fail("CARB_UP: нет доработки «" + id + "»");
}

/* Telegram-канал: время по Москве, без повторов, по длине влезает в Telegram, картинки на месте, ссылки — на свои страницы */
{
  const tg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "tg/posts.json"), "utf8"));
  const ids = new Set(), slots = new Set();
  for (const p of tg.posts) {
    if (ids.has(p.id)) fail("Telegram: повтор id поста " + p.id); ids.add(p.id);
    if (!/^\d{4}-\d\d-\d\d$/.test(p.date) || !/^(09|12|18):00$/.test(p.time || "")) fail("Telegram: дата или время не по расписанию (09:00, 12:00, 18:00) у " + p.id + ": " + p.date + " " + p.time);
    if (slots.has(p.date + " " + p.time)) fail("Telegram: два поста в одно время " + p.date + " " + p.time); slots.add(p.date + " " + p.time);
    if (!p.text || p.text.length > 4096) fail("Telegram: пустой или слишком длинный пост " + p.id);
    if (p.photo && p.text.length > 1024) fail("Telegram: подпись к картинке длиннее 1024 знаков у " + p.id + " (" + p.text.length + ")");
    if (p.photo && !fs.existsSync(path.join(__dirname, "..", p.photo.replace("https://motohelper.ru/", "")))) fail("Telegram: нет картинки " + p.photo);
    for (const u of p.text.match(/https:\/\/motohelper\.ru\/[^\s]*/g) || []) { const f = u.replace("https://motohelper.ru/", "").split(/[#?]/)[0].replace(/[).,]+$/, "");
      if (f && !fs.existsSync(path.join(__dirname, "..", f, f.endsWith("/") ? "index.html" : ""))) fail("Telegram: ссылка на несуществующую страницу в " + p.id + ": " + u); }
  }
}

if (errors.length) {
  console.error(`Найдено ошибок: ${errors.length}`);
  errors.slice(0, 200).forEach((e) => console.error(" - " + e));
  process.exit(1);
}
console.log(`OK: ${Object.keys(ENGINES).length} двигателей, ${BIKES.length} моделей, ${PARTS.length} запчастей, ${GUIDES.length} инструкций`);
