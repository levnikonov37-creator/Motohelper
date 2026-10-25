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
// подпись версии: «2014–2020 · CP3 847»; без годов — заводская подпись версии («PR250 · ZS172FMM»), а не «Версия 2»
function verName(v, vi, e) {
  if (v.years) return v.years + " · " + e.code;
  const l = (v.label || "").replace(/,\s*[\d.]+\s*см³$/, "");
  if (!l) return "Версия " + (vi + 1) + " · " + e.code;
  return l.indexOf(e.code) >= 0 ? l : l + " · " + e.code;
}
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const appLink = (b, vi) => "/#bike=" + encodeURIComponent(b.brand + " " + b.name) + "&v=" + vi;

/* адреса: марка → /m/kayo/, модель → /m/kayo-t2-300-enduro/ (повторы — с номером) */
const used = {}, brandSlug = {}, bikeSlug = new Map();
const uniq = (s) => { let x = s, i = 2; while (used[x]) x = s + "-" + i++; used[x] = 1; return x; };
const brands = [];
BIKES.forEach((b) => { if (!(b.brand in brandSlug)) { brandSlug[b.brand] = uniq(slugify(b.brand)); brands.push(b.brand); } });
BIKES.forEach((b) => bikeSlug.set(b, uniq(slugify(b.brand + " " + b.name))));

const POPULAR = ["Motoland", "Kayo", "Regulmoto", "BSE", "Avantis", "Progasi", "Racer", "Irbis", "Stels", "Sharmax", "CFMOTO", "Honda", "Yamaha", "Kawasaki", "Suzuki", "KTM", "Husqvarna", "BMW", "Harley-Davidson", "Ducati"];
/* алфавит: сначала латиница A–Z, потом русские марки; числа в названиях — по значению (T2 < T10) */
const COLL = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const cyr = (s) => /^[а-яё]/i.test(s);
const abc = (a, b) => (cyr(a) - cyr(b)) || COLL.compare(a, b);
const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
const ENG_N = new Set(BIKES.flatMap((b) => b.versions.map((v) => v.engine))).size;

const CSS = `:root{color-scheme:dark;--bg:#000000;--card:#0E0E0E;--card2:#151515;--line:rgba(255,255,255,0.132);--ink:#F2F2F2;--muted:#9A9A9A;--acc:#FFFFFF;--acc2:#E6E6E6;--pink:#8F8F8F;
--display:"Russo One","Arial Black",Impact,sans-serif;--cond:"Fira Sans Condensed","Arial Narrow",Arial,sans-serif;--body:"Fira Sans","Segoe UI",Roboto,Arial,sans-serif}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 var(--body);
background-image:radial-gradient(70% 40% at 85% -5%,rgba(255,255,255,0.154),transparent 70%),radial-gradient(50% 30% at 0% 10%,rgba(255,255,255,0.049),transparent 70%);background-repeat:no-repeat}
a{color:var(--acc2)}img{max-width:100%}
.top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:12px;padding:10px 16px;background:rgba(0,0,0,0.86);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.logo{display:flex;align-items:center;gap:9px;color:var(--ink);text-decoration:none;font:400 17px var(--display);letter-spacing:.02em}
.logo i{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--acc),var(--pink));font:400 13px var(--display);font-style:normal;color:#fff;box-shadow:0 0 18px -4px rgba(255,255,255,0.28)}
.top .open{margin-left:auto;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.315);color:var(--ink);text-decoration:none;font:600 14px var(--cond);white-space:nowrap}
main{max-width:940px;margin:0 auto;padding:14px 16px 96px}
.crumbs{font:500 13px var(--cond);color:var(--muted);margin:4px 0 14px;letter-spacing:.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.crumbs a{color:var(--muted);text-decoration:none}.crumbs a:hover{color:var(--acc2)}
.hero{position:relative;overflow:hidden;padding:20px 18px;border-radius:14px;border:1px solid var(--line);background:linear-gradient(140deg,rgba(255,255,255,0.121),rgba(10,10,10,.9) 55%);margin-bottom:18px}
.hero::after{content:"";position:absolute;right:-60px;top:-40px;width:200px;height:200px;background:linear-gradient(135deg,transparent 45%,rgba(255,255,255,0.077) 46%,rgba(255,255,255,0.077) 54%,transparent 55%);pointer-events:none}
.kick{font:600 12px var(--cond);letter-spacing:.14em;text-transform:uppercase;color:var(--acc2)}
h1{font:400 clamp(26px,7vw,40px)/1.08 var(--display);margin:6px 0 8px;text-transform:uppercase;font-style:italic;text-shadow:0 0 26px rgba(255,255,255,0.21);overflow-wrap:anywhere}
.lead{color:#C8C8C8;margin:0;max-width:640px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.chip{font:600 13px var(--cond);padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.088);border:1px solid rgba(255,255,255,0.18);color:var(--acc2);text-decoration:none;white-space:nowrap}
a.chip:hover,button.chip:hover,.chip.on{background:var(--acc);color:#fff;border-color:var(--acc)}button.chip{cursor:pointer;font-family:var(--cond)}
h2{font:400 20px var(--display);text-transform:uppercase;font-style:italic;margin:26px 0 12px;letter-spacing:.01em}h3{font:600 15px var(--cond);text-transform:uppercase;letter-spacing:.08em;color:var(--acc2);margin:0 0 10px}
.search{position:relative;margin:0 0 6px}.search input{width:100%;padding:14px 16px 14px 44px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:16px var(--body);outline:none}
.search input:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(255,255,255,0.138)}.search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);opacity:.6}
.res{display:none;margin:8px 0 0}.res.on{display:grid}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}.grid.models{grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.card{position:relative;display:block;padding:12px 14px;border-radius:10px;background:var(--card);border:1px solid var(--line);border-left:3px solid var(--acc);color:var(--ink);text-decoration:none;transition:transform .15s,border-color .15s,background .15s}
.card:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.42);background:var(--card2)}.card b{display:block;font:600 16px var(--cond);letter-spacing:.01em;line-height:1.25}
.card small{display:block;color:var(--muted);font:500 13px var(--cond);margin-top:3px}.card .n{position:absolute;right:12px;top:12px;font:400 15px var(--display);color:var(--acc2)}
.card.big{padding:16px 14px;border-left-color:var(--pink)}.card.big b{font:400 18px var(--display);font-style:italic;text-transform:uppercase;padding-right:36px}
.letter{font:400 16px var(--display);color:var(--acc2);margin:18px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin:0 0 14px}.tile{padding:10px 12px;border-radius:10px;background:var(--card2);border:1px solid var(--line)}
.tile span{display:block;font:500 12px var(--cond);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.tile b{display:block;font:400 18px/1.25 var(--display);margin-top:2px;overflow-wrap:anywhere}
.ver{padding:16px;border-radius:14px;background:var(--card);border:1px solid var(--line);margin:0 0 16px}.ver>h2{margin-top:0}
.groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.grp{padding:12px 14px;border-radius:10px;background:rgba(15,15,15,0.7);border:1px solid rgba(255,255,255,0.084)}
.grp dl{margin:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:6px 12px;font-size:15px}.grp dt{color:var(--muted)}.grp dd{margin:0;font-weight:500;overflow-wrap:anywhere}
.iss{display:grid;gap:8px;margin:14px 0 0;padding:0;list-style:none}.iss li{padding:10px 12px;border-radius:10px;background:rgba(15,15,15,0.7);border-left:3px solid #E6E6E6}
.iss li.high{border-left-color:#F43F5E}.iss li.med{border-left-color:#BDBDBD}.iss b{display:block}.iss .sev{font:600 11px var(--cond);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.cta{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:12px 18px;border-radius:10px;background:linear-gradient(135deg,var(--acc),var(--pink));color:#fff;font:600 16px var(--cond);text-decoration:none;box-shadow:0 10px 26px -12px rgba(255,255,255,0.315)}
.sticky{position:fixed;left:0;right:0;bottom:0;z-index:6;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(0,0,0,0.92);border-top:1px solid var(--line);display:flex;justify-content:center}
.sticky .cta{margin:0;width:100%;max-width:520px;justify-content:center}
.note{color:var(--muted);font-size:14px;margin:8px 0 0}.hide{display:none!important}
footer{color:#8A8A8A;font-size:13px;margin-top:30px;border-top:1px solid var(--line);padding-top:14px}
@media (min-width:720px){.sticky{display:none}main{padding-bottom:48px}}
/* моно: чёрно-белый стиль, как в приложении */
body{background-color:#000;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:48px 48px;background-repeat:repeat}
.top{background:rgba(0,0,0,.9);border-bottom-color:rgba(255,255,255,.14)}
.logo i{background:#fff;color:#000;border-radius:3px;box-shadow:none;font-style:italic}
.top .open{border-color:#fff;color:#fff}
.hero{border-radius:4px;border-color:rgba(255,255,255,.28);background:linear-gradient(135deg,transparent 0 46%,#fff 46% 52%,transparent 52% 58%,rgba(255,255,255,.55) 58% 60%,transparent 60%) right top/72px 72px no-repeat,radial-gradient(90% 120% at 0% 100%,#050505 30%,rgba(5,5,5,.6) 55%,transparent 80%),radial-gradient(circle,rgba(255,255,255,.2) 1.1px,transparent 1.5px) 0 0/9px 9px,#050505}
.hero::after{display:none}
h1,h2{text-shadow:none}
.kick,h3,.letter,.card .n{color:#fff}
.chip{background:#0A0A0A;border-color:rgba(255,255,255,.28);color:#fff;border-radius:3px}
a.chip:hover,button.chip:hover,.chip.on{background:#fff;color:#000;border-color:#fff}
.card,.tile{border-radius:4px;border-color:rgba(255,255,255,.14)}
.card{border-left:2px solid #fff}.card.big{border-left-color:#fff}
.card:hover{border-color:rgba(255,255,255,.5);background:#121212}
.cta{background:#fff;color:#000;border-radius:3px;box-shadow:4px 4px 0 rgba(255,255,255,.22)}
.cta:active{background:#000;color:#fff}
.search input{border-radius:4px}.search input:focus{border-color:#fff;box-shadow:0 0 0 1px #fff}
a{color:#fff}
`;

const SEARCH_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`;
/* поиск по каталогу: индекс m/index.json грузится при первом вводе */
const SEARCH_JS = `(function(){var i=document.getElementById("q"),o=document.getElementById("res"),idx=null;if(!i)return;
var norm=function(s){return String(s).toLowerCase().replace(/ё/g,"е").replace(/[^a-zа-я0-9]+/g," ").trim()};
function show(){var q=norm(i.value);if(!q){o.className="grid models res";o.innerHTML="";return}if(!idx){fetch("/m/index.json").then(function(r){return r.json()}).then(function(j){idx=j.map(function(x){x.s=norm(x.b+" "+x.n+" "+x.e+" "+x.t);return x});show()});return}
var w=q.split(" "),r=idx.filter(function(x){return w.every(function(t){return x.s.indexOf(t)>=0})}).slice(0,40);
o.className="grid models res on";o.innerHTML=r.length?r.map(function(x){return '<a class="card" href="/m/'+x.u+'/"><b>'+x.b+' '+x.n+'</b><small>'+x.t+' · '+x.e+'</small></a>'}).join(""):'<p class="note">Ничего не нашлось — попробуй марку или код мотора («174», «PR300»).</p>'}
i.addEventListener("input",show)})();`;
/* фильтр по типу на странице марки */
const FILTER_JS = `(function(){var b=document.querySelectorAll("[data-t]");document.querySelectorAll("button[data-f]").forEach(function(c){c.addEventListener("click",function(){var f=c.getAttribute("data-f");
document.querySelectorAll("button[data-f]").forEach(function(x){x.classList.toggle("on",x===c)});b.forEach(function(x){x.classList.toggle("hide",f!=="*"&&x.getAttribute("data-t")!==f)})})})})();`;

function page({ title, desc, canon, crumbs, body, ld, js, sticky }) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
<meta name="theme-color" content="#000000" />
<link rel="icon" href="/img/icon-192.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans+Condensed:wght@500;600&family=Fira+Sans:wght@400;500&family=Russo+One&display=swap" />
<link rel="stylesheet" href="/m/m.css" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="top"><a class="logo" href="/"><i>MH</i>MotoHelper</a><a class="open" href="${sticky || "/"}">Открыть приложение</a></header>
<main>
<nav class="crumbs">${crumbs.map((c) => (c[1] ? `<a href="${c[1]}">${esc(c[0])}</a>` : esc(c[0]))).join(" › ")}</nav>
${body}
<footer>MotoHelper — ремонт, ТО и запчасти для мотоциклов, питбайков и мопедов: диагностика, инструкции, ИИ-механик. Данные справочные — перед работой сверяйся с мануалом своего мотоцикла. <a href="/m/">Каталог</a> · <a href="/">Приложение</a></footer>
</main>
${sticky ? `<div class="sticky"><a class="cta" href="${sticky}">Открыть в MotoHelper: ремонт, запчасти, ИИ</a></div>` : ""}
${js ? `<script>${js}</script>` : ""}
</body>
</html>
`;
}
const crumbLd = (crumbs) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c[0], item: c[1] ? SITE.replace(/\/$/, "") + c[1] : undefined })) });

/* характеристики группами: мотор / масло и ТО / зажигание и клапаны / питание */
/* моточасы: тот же пересчёт, что в приложении (kmPerHour в js/app.js) — по износу мотора */
function kmh(km, e, b) {
  const t = b && b.type || "";
  const k = /Питбайк|Кросс|Эндуро|Мотард|Триал/i.test(t) ? 50 : /Скутер|Мопед/i.test(t) || e.cvt ? 40 : t ? 60 : e.cc > 300 ? 60 : 50;
  const h = km / k, r = h >= 20 ? Math.round(h / 5) * 5 : Math.max(1, Math.round(h));
  return "каждые " + Number(km).toLocaleString("ru-RU").replace(/\u00a0/g, " ") + "\u00a0км · ≈\u00a0" + r + "\u00a0моточ.";
}
function specGroups(e, v, b) {
  const ok = (x) => x != null && String(x).trim() && String(x) !== "—";
  const g = (title, rows) => ({ title, rows: rows.filter((r) => ok(r[1])) });
  return [
    g("Мотор", [["Двигатель", e.name], ["Код", e.code], ["Объём", e.cc ? e.cc + " см³" : ""], ["Мощность", (v.hp || e.hp) ? (v.hp || e.hp) + " л.с." : ""], ["Момент", e.torque], ["Тип", [e.stroke, e.cam].filter(Boolean).join(", ")], ["Охлаждение", e.cooling], ["Коробка", e.gearbox], ["Запуск", e.start], ["Компрессия", e.compression]]),
    g("Масло и ТО", [["Масло", e.oil], ["Объём масла", e.oilVol], ["Замена масла", e.oilInt ? kmh(e.oilInt, e, b) : ""], ["Антифриз", e.coolant], ["Топливо", e.fuel]]),
    g("Свеча и клапаны", [["Свеча", e.spark], ["Зазор свечи", e.gap], ["Клапаны, впуск", e.valveIn], ["Клапаны, выпуск", e.valveEx], ["Проверка клапанов", e.valveInt ? kmh(e.valveInt, e, b) : ""]]),
    g("Питание", [["Карбюратор / впрыск", v.carb || e.carb], ["Главный жиклёр", e.jetMain], ["Жиклёр ХХ", e.jetPilot], ["Игла", e.needle], ["Холостые", e.idle]]),
  ].filter((x) => x.rows.length);
}
const tiles = (e, v) => [["Объём", e.cc ? e.cc + " см³" : ""], ["Мощность", (v.hp || e.hp) ? (v.hp || e.hp) + " л.с." : ""], ["Масло", e.oilVol ? String(e.oilVol).replace(/\s*\(.*\)/, "") : ""], ["Свеча", e.spark ? String(e.spark).split(/\s*\/\s*/)[0] : ""]]
  .filter((t) => t[1]).map((t) => `<div class="tile"><span>${t[0]}</span><b>${esc(t[1])}</b></div>`).join("");

const files = new Map(); // путь относительно корня → содержимое
const SEV = { high: "серьёзно", med: "важно", low: "мелочь" };
const engShort = (b) => { const e = ENGINES[b.versions[0].engine]; return [e.code, e.cc ? e.cc + " см³" : "", (b.versions[0].hp || e.hp) ? (b.versions[0].hp || e.hp) + " л.с." : ""].filter(Boolean).join(" · "); };
const modelCard = (b, withBrand) => `<a class="card" href="/m/${bikeSlug.get(b)}/" data-t="${esc(b.type)}"><b>${esc((withBrand ? b.brand + " " : "") + b.name)}</b><small>${esc(b.type)} · ${esc(engShort(b))}</small></a>`;

BIKES.forEach((b) => {
  const slug = bikeSlug.get(b), canon = SITE + "m/" + slug + "/";
  const full = b.brand + " " + b.name;
  const e0 = ENGINES[b.versions[0].engine];
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], [b.brand, "/m/" + brandSlug[b.brand] + "/"], [b.name, null]];
  const vers = b.versions.map((v, vi) => {
    const e = ENGINES[v.engine];
    const head = b.versions.length > 1 ? `<h2>${esc(verName(v, vi, e))}</h2>` : "";
    const approx = v.approx ? `<p class="note">≈ Мотор подобран по похожей модели — сверь код на картере.</p>` : "";
    const groups = `<div class="groups">${specGroups(e, v, b).map((g) => `<div class="grp"><h3>${g.title}</h3><dl>${g.rows.map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl></div>`).join("")}</div>`;
    const iss = (e.issues || []).length ? `<h2>Слабые места</h2><ul class="iss">${e.issues.map((x) => `<li class="${x.sev}"><span class="sev">${SEV[x.sev] || ""}</span><b>${esc(x.t)}</b>${esc(x.fix)}</li>`).join("")}</ul>` : "";
    return `<section class="ver">${head}<div class="tiles">${tiles(e, v)}</div>${approx}${groups}${iss}
<a class="cta" href="${appLink(b, vi)}">Ремонт, запчасти и ИИ-механик для ${esc(full)} →</a></section>`;
  }).join("\n");
  const others = BIKES.filter((x) => x.brand === b.brand && x !== b).slice(0, 12);
  const body = `<section class="hero"><div class="kick">${esc(b.brand)} · ${esc(b.type)}</div><h1>${esc(b.name)}</h1>
<p class="lead">Мотор ${esc(e0.code)}${e0.cc ? ", " + e0.cc + " см³" : ""}${e0.hp ? ", " + (b.versions[0].hp || e0.hp) + " л.с" : ""}. Какое масло и сколько, свеча, зазоры клапанов, жиклёры и слабые места${b.versions.length > 1 ? " — по поколениям" : ""}.</p>
${b.versions.length > 1 ? `<div class="chips">${b.versions.map((v, vi) => `<span class="chip">${esc(verName(v, vi, ENGINES[v.engine]))}</span>`).join("")}</div>` : ""}</section>
${vers}
${others.length ? `<h2>Другие модели ${esc(b.brand)}</h2><div class="grid models">${others.map((x) => modelCard(x)).join("")}</div><p><a class="chip" href="/m/${brandSlug[b.brand]}/">Все модели ${esc(b.brand)} →</a></p>` : ""}`;
  const desc = `${full}: мотор ${e0.code}${e0.cc ? " (" + e0.cc + " см³" + (e0.hp ? ", " + (b.versions[0].hp || e0.hp) + " л.с." : "") + ")" : ""}, масло ${e0.oil || "—"}${e0.oilVol ? " " + e0.oilVol : ""}, свеча ${e0.spark || "—"}, зазоры клапанов ${e0.valveIn || "—"} / ${e0.valveEx || "—"}. Слабые места и ремонт.`;
  files.set("m/" + slug + "/index.html", page({ title: `${full} — масло, свечи, зазоры клапанов, слабые места | MotoHelper`, desc, canon, crumbs, body, sticky: appLink(b, 0),
    ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: full, url: canon, inLanguage: "ru", description: desc }] }));
});

brands.forEach((br) => {
  const list = BIKES.filter((b) => b.brand === br).sort((a, b) => COLL.compare(a.name, b.name));
  const types = [...new Set(list.map((b) => b.type))];
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], [br, null]];
  const body = `<section class="hero"><div class="kick">Каталог · марка</div><h1>${esc(br)}</h1><p class="lead">${list.length} ${plural(list.length, "модель", "модели", "моделей")}: мотор, масло, свечи, зазоры клапанов и слабые места.</p>
${types.length > 1 ? `<div class="chips"><button class="chip on" data-f="*">Все</button>${types.map((t) => `<button class="chip" data-f="${esc(t)}">${esc(t)}</button>`).join("")}</div>` : ""}</section>
<div class="grid models">${list.map((b) => modelCard(b)).join("")}</div>`;
  files.set("m/" + brandSlug[br] + "/index.html", page({ title: `${br}: все модели — масло, свечи, моторы | MotoHelper`, desc: `Справочник по мотоциклам ${br}: ${list.slice(0, 6).map((b) => b.name).join(", ")} и другие — мотор, масло, свечи, зазоры клапанов, слабые места.`,
    canon: SITE + "m/" + brandSlug[br] + "/", crumbs, body, ld: [crumbLd(crumbs)], js: types.length > 1 ? FILTER_JS : "" }));
});

{
  const crumbs = [["MotoHelper", "/"], ["Каталог", null]];
  const count = (br) => BIKES.filter((b) => b.brand === br).length;
  const pop = POPULAR.filter((br) => br in brandSlug).sort(abc);
  const byLetter = {};
  brands.slice().sort(abc).forEach((br) => { const l = br[0].toUpperCase(); (byLetter[l] = byLetter[l] || []).push(br); });
  const body = `<section class="hero"><div class="kick">Справочник</div><h1>Каталог мотоциклов</h1>
<p class="lead">Мотоциклы, питбайки и мопеды: мотор, масло и сколько заливать, свечи, зазоры клапанов, жиклёры и слабые места.</p>
<div class="chips"><span class="chip">${BIKES.length} ${plural(BIKES.length, "модель", "модели", "моделей")}</span><span class="chip">${brands.length} ${plural(brands.length, "марка", "марки", "марок")}</span><span class="chip">${ENG_N} ${plural(ENG_N, "мотор", "мотора", "моторов")}</span></div></section>
<div class="search">${SEARCH_ICON}<input id="q" type="search" placeholder="Найти модель: «Kayo T2», «CRF250», «174»" autocomplete="off" aria-label="Поиск модели" /></div>
<div id="res" class="grid models res"></div>
<h2>Популярные марки</h2><div class="grid">${pop.map((br) => `<a class="card big" href="/m/${brandSlug[br]}/"><b>${esc(br)}</b><span class="n">${count(br)}</span></a>`).join("")}</div>
<h2>Все марки</h2>${Object.keys(byLetter).map((l, i, ls) => `${cyr(l) && !cyr(ls[i - 1] || "a") ? `<h2>Российские марки</h2>` : ""}<div class="letter">${esc(l)}</div><div class="grid">${byLetter[l].map((br) => `<a class="card" href="/m/${brandSlug[br]}/"><b>${esc(br)}</b><small>${count(br)} ${plural(count(br), "модель", "модели", "моделей")}</small></a>`).join("")}</div>`).join("")}`;
  files.set("m/index.html", page({ title: "Каталог мотоциклов, питбайков и мопедов — масло, свечи, моторы | MotoHelper", desc: `${BIKES.length} моделей: мотор, масло и его объём, свечи, зазоры клапанов, жиклёры и слабые места.`, canon: SITE + "m/", crumbs, body, ld: [crumbLd(crumbs)], js: SEARCH_JS }));
  files.set("m/index.json", JSON.stringify(BIKES.map((b) => { const e = ENGINES[b.versions[0].engine]; return { b: b.brand, n: b.name, u: bikeSlug.get(b), t: b.type, e: e.code + (e.cc ? " · " + e.cc + " см³" : "") }; })) + "\n");
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
