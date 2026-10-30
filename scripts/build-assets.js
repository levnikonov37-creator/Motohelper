// Сборка файлов сайта для браузера: сжатые копии и метки версий.
//   node scripts/build-assets.js          — собрать (её же запускает scripts/build-pages.js)
//   node scripts/build-assets.js --check  — только проверить, что сборка свежая (для тестов)
//
// Правишь js/data.js, js/app.js, js/bike-art.js, js/motion.js или css/app.css — потом запускай сборку.
// Что она делает:
//   1) сжимает эти файлы (esbuild) в *.min.js / app.min.css — браузеру меньше качать и разбирать;
//   2) в index.html ставит ссылки вида js/app.min.js?v=<хэш>: у каждой версии файла свой адрес,
//      поэтому телефон берёт файл из своей памяти и не спрашивает сервер (sw.js: «сначала кэш» для ?v=);
//   3) в sw.js пишет список этих файлов и VERSION по их хэшам — поднимать версию руками не нужно.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
let esbuild;
try {
  esbuild = require("esbuild");
} catch (e) {
  console.error("Нет esbuild — сначала поставь зависимости: npm ci");
  process.exit(1);
}

const ROOT = path.join(__dirname, "..");
const check = process.argv.includes("--check");

// исходник → сжатая копия (порядок — как в index.html)
const MIN = [
  ["css/app.css", "css/app.min.css"],
  ["js/data.js", "js/data.min.js"],
  ["js/bike-art.js", "js/bike-art.min.js"],
  ["js/app.js", "js/app.min.js"],
  ["js/motion.js", "js/motion.min.js"],
];
// уже сжаты — только метка версии
const VENDOR = ["vendor/react.production.min.js", "vendor/react-dom.production.min.js"];

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);

const out = {}; // путь → новое содержимое
const ver = {};
for (const [src, dst] of MIN) {
  const css = src.endsWith(".css");
  // es2019 / старые браузеры: сжатие не добавит синтаксиса, которого нет в исходниках (?. ?? и т. п.)
  const r = esbuild.transformSync(read(src), {
    loader: css ? "css" : "js",
    minify: true,
    charset: "utf8",
    legalComments: "none",
    target: css ? ["chrome87", "safari14", "firefox78"] : "es2019",
    logLevel: "silent",
  });
  out[dst] = r.code;
  ver[dst] = hash(r.code);
}
for (const f of VENDOR) ver[f] = hash(fs.readFileSync(path.join(ROOT, f)));
const url = (f) => f + "?v=" + ver[f];

// index.html: ссылки на исходники или на старые метки → сжатые файлы с новыми метками
const REF = {};
for (const [src, dst] of MIN) REF[src] = REF[dst] = dst;
for (const f of VENDOR) REF[f] = f;
let html = read("index.html");
const seen = new Set();
html = html.replace(/(src|href)="([^"?]+)(\?v=[0-9a-f]+)?"/g, (m, attr, p) => {
  if (!REF[p]) return m;
  seen.add(REF[p]);
  return attr + '="' + url(REF[p]) + '"';
});
const missing = Object.keys(ver).filter((f) => !seen.has(f));
if (missing.length) {
  console.error("В index.html нет ссылок на: " + missing.join(", "));
  process.exit(1);
}
out["index.html"] = html;

// sw.js: блок между метками пишет сборка
const BUILT = [...MIN.map(([, dst]) => dst), ...VENDOR].map(url);
let sw = read("sw.js");
const A = "// --- сборка (scripts/build-assets.js) пишет эти строки сама, руками не править ---";
const Z = "// --- конец сборки ---";
const i = sw.indexOf(A), j = sw.indexOf(Z);
if (i < 0 || j < i) {
  console.error("В sw.js нет блока сборки (" + A + " … " + Z + ")");
  process.exit(1);
}
const block = A + "\nconst VERSION = \"mh-" + hash(BUILT.join(" ")) + "\";\nconst BUILT = [\n" + BUILT.map((u) => '  "' + u + '",').join("\n") + "\n];\n";
out["sw.js"] = sw.slice(0, i) + block + sw.slice(j);

const changed = Object.keys(out).filter((f) => !fs.existsSync(path.join(ROOT, f)) || read(f) !== out[f]);
if (check) {
  if (changed.length) {
    console.error("Сборка устарела (" + changed.join(", ") + "). Запусти: node scripts/build-pages.js");
    process.exit(1);
  }
} else {
  changed.forEach((f) => fs.writeFileSync(path.join(ROOT, f), out[f]));
  const kb = (f) => Math.round(Buffer.byteLength(out[f]) / 1024);
  console.log("Сборка: " + MIN.map(([src, dst]) => src.split("/").pop() + " " + Math.round(fs.statSync(path.join(ROOT, src)).size / 1024) + "→" + kb(dst) + " КБ").join(", ") + "; обновлено файлов: " + changed.length);
}
