// Совместимость запчасти по базе MotoHelper: находит коды моторов в тексте карточки
// и перечисляет модели с этими моторами.
//   echo "Поршневая YX140 56 мм" | node cards/compat.js
const vm = require("vm"), fs = require("fs"), path = require("path");

const ctx = { console: { log() {}, warn() {}, error() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "data.js"), "utf8") +
  ";this.ENGINES=ENGINES;this.BIKES=BIKES;", ctx);
const { ENGINES, BIKES } = ctx;

const norm = s => s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^ZS(?=\d)/, "");
const CODE = /\b(?:ZS)?\d{3}[A-Z]{2,4}(?:-\w{1,3})?\b|\b[A-Z]{1,3}\d{3}[A-Z]?\b|\b1P\d{2}[A-Z]{2,4}\b/g;

// алиас → ключи моторов
const ALIAS = {};
const add = (a, k) => { a = norm(a); if (a.length >= 4) (ALIAS[a] = ALIAS[a] || new Set()).add(k); };
for (const [k, e] of Object.entries(ENGINES)) {
  for (const t of [k, e.code || "", ...((e.code + " " + e.name).toUpperCase().match(CODE) || [])]) {
    add(t, k); add(t.replace(/-\w+$/, ""), k);
  }
}

function engines(text) {
  const tokens = text.toUpperCase().match(CODE) || [];
  const found = new Set();
  // точное совпадение с ключом базы (YX140, NC250, 172FMM) — берём всегда
  for (const t of tokens) {
    const bare = t.replace(/^ZS(?=\d)/, "");
    if (ENGINES[bare]) found.add(bare);
  }
  // заводской код мотора (ZS178MM-2) точнее названия модели (NX250): если он есть — ищем только по нему
  const motor = tokens.filter(t => /\d{2,3}[A-Z]{2,4}(-\w+)?$/.test(t) && /[A-Z]{2,}/.test(t.replace(/^ZS/, "")));
  for (const t of motor.length ? motor : tokens) {
    if (ENGINES[t.replace(/^ZS(?=\d)/, "")]) continue;
    // «ZS172FMM-3A» → сначала точный, потом без суффикса
    for (const cand of [t, t.replace(/-\w+$/, "")]) {
      const ks = ALIAS[norm(cand)];
      if (ks && ks.size <= 3) { ks.forEach(k => found.add(k)); break; }
    }
  }
  return [...found];
}

function models(engs, limit = 40) {
  const byBrand = {};
  for (const b of BIKES) {
    if (b.brand === "Любая модель") continue;
    if (b.versions.some(v => engs.includes(v.engine))) (byBrand[b.brand] = byBrand[b.brand] || []).push(b.name);
  }
  const brands = Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length);
  let n = 0;
  return brands.map(([brand, names]) => ({ brand, names: names.slice(0, Math.max(0, limit - n)) && (n += names.length, names) }));
}

function compat(text) {
  const engs = engines(text);
  return { engines: engs.map(k => ({ id: k, code: ENGINES[k].code, name: ENGINES[k].name, cc: ENGINES[k].cc })), models: models(engs) };
}

module.exports = { compat };
if (require.main === module) {
  const text = fs.readFileSync(0, "utf8");
  process.stdout.write(JSON.stringify(compat(text)));
}
