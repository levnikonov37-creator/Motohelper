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
const GROUPS = new Set(["horiz", "cg", "cb", "zs4v", "dohc", "air", "liquid", "carb", "efi", "2t", "4t", "small", "big", "balancer", "jp", "eu", "in", "cn", "ru"]);
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
