// Страницы моделей для поисковиков: m/<модель>/index.html, m/<марка>/index.html, m/index.html и sitemap.xml.
// Сайт — одно приложение на JavaScript, поисковики видят его плохо. Эти страницы — обычный HTML с главным
// (мотор, масло, свечи, зазоры, слабые места) и кнопкой «Открыть в MotoHelper».
//   node scripts/build-pages.js          — пересобрать
//   node scripts/build-pages.js --check  — только проверить, что страницы свежие (для тестов)
const fs = require("fs"), path = require("path"), vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SITE = "https://motohelper.ru/";
const OUT = path.join(ROOT, "m");
const check = process.argv.includes("--check");

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8") + "\n;this.__E = ENGINES; this.__B = BIKES;", ctx);
const ENGINES = ctx.__E, BIKES = ctx.__B.filter((b) => b.brand !== "Любая модель");

const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
const slugify = (s) => String(s).toLowerCase().split("").map((c) => (c in TR ? TR[c] : c)).join("")
  .replace(/\+/g, "-plus").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "model";
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const appLink = (b, vi) => "/#bike=" + encodeURIComponent(b.brand + " " + b.name) + "&v=" + vi;

/* адреса: марка → /m/kayo/, модель → /m/kayo-t2-300-enduro/ (повторы — с номером) */
const used = {}, brandSlug = {}, bikeSlug = new Map();
const uniq = (s) => { let x = s, i = 2; while (used[x]) x = s + "-" + i++; used[x] = 1; return x; };
const brands = [];
BIKES.forEach((b) => { if (!(b.brand in brandSlug)) { brandSlug[b.brand] = uniq(slugify(b.brand)); brands.push(b.brand); } });
BIKES.forEach((b) => bikeSlug.set(b, uniq(slugify(b.brand + " " + b.name))));

const CSS = `:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#07060C;color:#E9E6F5;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:#C4B5FD}main{max-width:860px;margin:0 auto;padding:16px 16px 48px}nav.crumbs{font-size:14px;color:#9A94B5;margin:4px 0 14px}
nav.crumbs a{color:#9A94B5}h1{font-size:28px;line-height:1.2;margin:0 0 6px;text-transform:uppercase;font-style:italic;letter-spacing:.01em}
.lead{color:#B9B3D6;margin:0 0 18px}.cta{display:inline-block;margin:6px 0 22px;padding:12px 18px;border-radius:10px;background:linear-gradient(135deg,#8B5CF6,#EC4899);color:#fff;font-weight:700;text-decoration:none}
section.ver{background:#100D1A;border:1px solid rgba(167,139,250,.25);border-left:3px solid #8B5CF6;border-radius:8px;padding:14px 16px;margin:0 0 18px}
h2{font-size:19px;margin:0 0 10px}h3{font-size:16px;margin:16px 0 8px}table{width:100%;border-collapse:collapse;font-size:15px}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid rgba(167,139,250,.14);vertical-align:top}th{color:#9A94B5;font-weight:500;width:42%}
ul.iss{padding-left:18px;margin:0}ul.iss li{margin:0 0 8px}.sev{font-size:12px;padding:1px 6px;border-radius:4px;background:rgba(236,72,153,.18);color:#F9A8D4;margin-right:6px}
.cols{columns:2 240px;padding-left:18px}.cols li{margin:0 0 6px;break-inside:avoid}footer{color:#7E789A;font-size:13px;margin-top:28px}`;

function page({ title, desc, canon, crumbs, body, ld }) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${canon}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="MotoHelper" />
<meta property="og:locale" content="ru_RU" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${canon}" />
<meta property="og:image" content="${SITE}img/og.jpg" />
<meta name="theme-color" content="#07060C" />
<link rel="icon" href="/img/icon-192.png" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<link rel="stylesheet" href="/m/m.css" />
</head>
<body>
<main>
<nav class="crumbs">${crumbs.map((c) => (c[1] ? `<a href="${c[1]}">${esc(c[0])}</a>` : esc(c[0]))).join(" › ")}</nav>
${body}
<footer>MotoHelper — ремонт, ТО и запчасти для мотоциклов, питбайков и мопедов. Данные — справочные: перед работой сверяйся с мануалом своего мотоцикла.</footer>
</main>
</body>
</html>
`;
}
const crumbLd = (crumbs) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c[0], item: c[1] ? SITE.replace(/\/$/, "") + c[1] : undefined })) });

function specRows(e, v) {
  const R = [];
  const add = (k, val) => { if (val != null && String(val).trim() && String(val) !== "—") R.push([k, val]); };
  add("Двигатель", e.name);
  add("Код мотора", e.code);
  add("Объём", e.cc ? e.cc + " см³" : "");
  add("Мощность", (v.hp || e.hp) ? (v.hp || e.hp) + " л.с." : "");
  add("Крутящий момент", e.torque);
  add("Тип", [e.stroke, e.cam].filter(Boolean).join(", "));
  add("Охлаждение", e.cooling);
  add("Питание", v.carb || e.carb);
  add("Коробка передач", e.gearbox);
  add("Запуск", e.start);
  add("Топливо", e.fuel);
  add("Масло", e.oil);
  add("Объём масла", e.oilVol);
  add("Замена масла", e.oilInt ? "каждые " + e.oilInt + " км" : "");
  add("Свеча", e.spark);
  add("Зазор свечи", e.gap);
  add("Зазор клапанов, впуск", e.valveIn);
  add("Зазор клапанов, выпуск", e.valveEx);
  add("Проверка клапанов", e.valveInt ? "каждые " + e.valveInt + " км" : "");
  add("Холостые обороты", e.idle);
  add("Главный жиклёр", e.jetMain);
  add("Жиклёр холостого хода", e.jetPilot);
  add("Охлаждающая жидкость", e.coolant);
  add("Компрессия", e.compression);
  return R;
}

const files = new Map(); // путь относительно корня → содержимое
const SEV = { high: "серьёзно", med: "важно", low: "мелочь" };

BIKES.forEach((b) => {
  const slug = bikeSlug.get(b), url = "/m/" + slug + "/", canon = SITE + "m/" + slug + "/";
  const full = b.brand + " " + b.name;
  const e0 = ENGINES[b.versions[0].engine];
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], [b.brand, "/m/" + brandSlug[b.brand] + "/"], [b.name, null]];
  const vers = b.versions.map((v, vi) => {
    const e = ENGINES[v.engine];
    const head = b.versions.length > 1 ? `<h2>${esc(v.years ? v.years + " · " : "")}${esc(e.code)}${v.approx ? " (≈ мотор подобран по похожей модели)" : ""}</h2>` : (v.approx ? `<p class="lead">Мотор подобран по похожей модели — сверь код на картере.</p>` : "");
    const iss = (e.issues || []).length ? `<h3>Слабые места и что делать</h3><ul class="iss">${e.issues.map((x) => `<li><span class="sev">${SEV[x.sev] || ""}</span><b>${esc(x.t)}</b>. ${esc(x.fix)}</li>`).join("")}</ul>` : "";
    return `<section class="ver">${head}<table>${specRows(e, v).map((r) => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join("")}</table>${iss}
<a class="cta" href="${appLink(b, vi)}">Открыть ${esc(full)} в MotoHelper — ремонт, запчасти, ИИ-механик</a></section>`;
  }).join("\n");
  const others = BIKES.filter((x) => x.brand === b.brand && x !== b).slice(0, 16);
  const body = `<h1>${esc(full)}</h1>
<p class="lead">${esc(b.type)}. Мотор ${esc(e0.code)}${e0.cc ? ", " + e0.cc + " см³" : ""}${e0.hp ? ", " + (b.versions[0].hp || e0.hp) + " л.с." : ""}: какое масло и сколько, свеча, зазоры клапанов, жиклёры и слабые места${b.versions.length > 1 ? " — по поколениям" : ""}.</p>
${vers}
${others.length ? `<h3>Другие модели ${esc(b.brand)}</h3><ul class="cols">${others.map((x) => `<li><a href="/m/${bikeSlug.get(x)}/">${esc(x.brand + " " + x.name)}</a></li>`).join("")}</ul><p><a href="/m/${brandSlug[b.brand]}/">Все модели ${esc(b.brand)} →</a></p>` : ""}`;
  const desc = `${full}: мотор ${e0.code}${e0.cc ? " (" + e0.cc + " см³" + (e0.hp ? ", " + (b.versions[0].hp || e0.hp) + " л.с." : "") + ")" : ""}, масло ${e0.oil || "—"}${e0.oilVol ? " " + e0.oilVol : ""}, свеча ${e0.spark || "—"}, зазоры клапанов ${e0.valveIn || "—"} / ${e0.valveEx || "—"}. Слабые места и ремонт.`;
  files.set("m/" + slug + "/index.html", page({ title: `${full} — масло, свечи, зазоры клапанов, слабые места | MotoHelper`, desc, canon, crumbs, body,
    ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: full, url: canon, inLanguage: "ru", description: desc }] }));
});

brands.forEach((br) => {
  const list = BIKES.filter((b) => b.brand === br);
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], [br, null]];
  const body = `<h1>${esc(br)}</h1><p class="lead">${list.length} ${list.length % 10 === 1 && list.length % 100 !== 11 ? "модель" : list.length % 10 >= 2 && list.length % 10 <= 4 && (list.length % 100 < 10 || list.length % 100 >= 20) ? "модели" : "моделей"}: мотор, масло, свечи, зазоры клапанов и слабые места.</p>
<ul class="cols">${list.map((b) => { const e = ENGINES[b.versions[0].engine]; return `<li><a href="/m/${bikeSlug.get(b)}/">${esc(b.name)}</a> <small>${esc(e.code)}</small></li>`; }).join("")}</ul>`;
  files.set("m/" + brandSlug[br] + "/index.html", page({ title: `${br}: все модели — масло, свечи, моторы | MotoHelper`, desc: `Справочник по мотоциклам ${br}: ${list.slice(0, 6).map((b) => b.name).join(", ")} и другие — мотор, масло, свечи, зазоры клапанов, слабые места.`,
    canon: SITE + "m/" + brandSlug[br] + "/", crumbs, body, ld: [crumbLd(crumbs)] }));
});

{
  const crumbs = [["MotoHelper", "/"], ["Каталог", null]];
  const body = `<h1>Каталог мотоциклов</h1><p class="lead">${BIKES.length} моделей мотоциклов, питбайков и мопедов: мотор, масло, свечи, зазоры клапанов и слабые места. <a href="/">Открыть MotoHelper</a></p>
<ul class="cols">${brands.map((br) => `<li><a href="/m/${brandSlug[br]}/">${esc(br)}</a> <small>${BIKES.filter((b) => b.brand === br).length}</small></li>`).join("")}</ul>`;
  files.set("m/index.html", page({ title: "Каталог мотоциклов, питбайков и мопедов — масло, свечи, моторы | MotoHelper", desc: `${BIKES.length} моделей: мотор, масло и его объём, свечи, зазоры клапанов, жиклёры и слабые места.`, canon: SITE + "m/", crumbs, body, ld: [crumbLd(crumbs)] }));
}

files.set("m/m.css", CSS + "\n");
const urls = [SITE, SITE + "m/"].concat(brands.map((br) => SITE + "m/" + brandSlug[br] + "/"), BIKES.map((b) => SITE + "m/" + bikeSlug.get(b) + "/"));
files.set("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u, i) => `  <url><loc>${u}</loc><changefreq>${i ? "monthly" : "weekly"}</changefreq><priority>${i === 0 ? "1.0" : i < 2 + brands.length ? "0.7" : "0.6"}</priority></url>`).join("\n")}\n</urlset>\n`);

/* сверка / запись: лишние старые страницы удаляем */
const existing = [];
(function walk(d) { if (!fs.existsSync(d)) return; fs.readdirSync(d, { withFileTypes: true }).forEach((x) => { const p = path.join(d, x.name); x.isDirectory() ? walk(p) : existing.push(path.relative(ROOT, p)); }); })(OUT);
const stale = existing.filter((f) => !files.has(f));
const changed = [...files].filter(([f, c]) => !fs.existsSync(path.join(ROOT, f)) || fs.readFileSync(path.join(ROOT, f), "utf8") !== c).map(([f]) => f);
if (check) {
  if (changed.length || stale.length) {
    console.error("Страницы моделей устарели (" + changed.length + " изменить, " + stale.length + " удалить). Запусти: node scripts/build-pages.js");
    process.exit(1);
  }
  console.log("OK: страницы моделей свежие — " + BIKES.length + " моделей, " + brands.length + " марок");
} else {
  stale.forEach((f) => fs.unlinkSync(path.join(ROOT, f)));
  (function prune(d) { if (!fs.existsSync(d)) return; fs.readdirSync(d, { withFileTypes: true }).forEach((x) => x.isDirectory() && prune(path.join(d, x.name))); if (d !== OUT && !fs.readdirSync(d).length) fs.rmdirSync(d); })(OUT);
  changed.forEach((f) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), files.get(f)); });
  console.log("Страницы моделей: " + BIKES.length + " моделей, " + brands.length + " марок; обновлено " + changed.length + ", удалено " + stale.length);
}
