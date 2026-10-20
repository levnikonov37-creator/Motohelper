// Проверка базы (js/data.js) без браузера: node tests/check-data.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const ctx = {};
vm.createContext(ctx);
try {
  vm.runInContext(fs.readFileSync(path.join(root, "js/data.js"), "utf8"), ctx, { filename: "js/data.js" });
} catch (x) {
  const at = (x.stack || "").split("\n").find((l) => l.includes("js/data.js"));
  console.error("js/data.js не загрузился: " + x.message + (at ? "\n  " + at.trim() : ""));
  console.error("Частая причина — модель ссылается на двигатель, которого нет в ENGINES.");
  process.exit(1);
}
const { ENGINES, BIKES, PARTS, GUIDES, TUNING, TUNE_GUIDE } = ctx;

const errors = [];
const fail = (msg) => errors.push(msg);

// Типы мотоциклов, которые понимает интерфейс (BF_TYPES в js/app.js)
const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const typesSrc = app.match(/const BF_TYPES = (\[[^\]]*\])/);
const TYPES = typesSrc ? JSON.parse(typesSrc[1]) : null;
if (!TYPES) fail("Не найден BF_TYPES в js/app.js");

// Двигатели
const GROUPS = new Set(["horiz", "cg", "cb", "zs4v", "dohc", "air", "liquid", "carb", "efi", "2t", "4t", "small", "big", "balancer", "jp", "eu", "in", "cn", "ru", "cvt"]);
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
  [/NB300|174MN-5/i, ["NB300"]], [/174MN-3|CBS300/i, ["CBS300"]], [/\b174\b|174MN(?!-)/i, ["NB300", "CBS300"]],
  [/CB300|175FMM/i, ["175FMM"]], [/NC300|182MN/i, ["NC300", "NB300E"]], [/YBS/i, ["YBS300", "YBS300G2"]],
  [/PR250|172FMM-5/i, ["172FMM-5"]], [/PR300/i, ["PR300"]], [/NC250|177MM/i, ["NC250", "NC250E"]], [/NC450|194MQ/i, ["NC450", "NC450C"]],
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
const CC_OK = new Set(["Урал М-67 / ИМЗ-8.103", "ИЖ 49", "ИЖ 56", "Ковровец К-55 / К-58", "Минск М-103", "Минск М-104", "Минск М-105", "Минск М-106",
  "Тула ТМЗ-5.951", "Тула ТМЗ-5.952", "BMW F 650 GS (двухцилиндровый)", "Honda Dio AF62", "Honda Dio AF68", "Honda Tact AF75"]);
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
TUNING.forEach((t) => {
  if (!t.id || !t.title) fail(`Доработка без id или названия: ${JSON.stringify(t).slice(0, 80)}`);
});

if (errors.length) {
  console.error(`Найдено ошибок: ${errors.length}`);
  errors.slice(0, 200).forEach((e) => console.error(" - " + e));
  process.exit(1);
}
console.log(`OK: ${Object.keys(ENGINES).length} двигателей, ${BIKES.length} моделей, ${PARTS.length} запчастей, ${GUIDES.length} инструкций`);
