// Страницы для поисковиков: m/<модель>/, m/<марка>/, m/motor/<мотор>/, m/remont/<инструкция>/, m/polomka/<неисправность>/,
// m/index.html и sitemap.xml.
// Сайт — одно приложение на JavaScript, поисковики видят его плохо. Эти страницы — обычный HTML с главным
// (мотор, масло, свечи, зазоры, слабые места) и кнопкой «Открыть в MotoHelper».
//   node scripts/build-pages.js          — пересобрать
//   node scripts/build-pages.js --check  — только проверить, что страницы свежие (для тестов)
const fs = require("fs"), path = require("path"), vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SITE = "https://motohelper.ru/";
const OUT = path.join(ROOT, "m");
const check = process.argv.includes("--check");
// сначала — сжатые файлы сайта и метки версий (index.html, sw.js); --check тоже передаётся
require("./build-assets");

const ctx = {};
vm.createContext(ctx);
// каталог (js/data.js) и база знаний (js/kb.js) — в том же порядке, что на сайте
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8"), ctx, { filename: "js/data.js" });
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/kb.js"), "utf8") + "\n;this.__E = ENGINES; this.__B = BIKES; this.__G = GUIDES; this.__D = DIAG; this.__NC = NO_CVT_GUIDES; this.__W = WIRING; this.__C = CAUSES; this.__WC = WIRE; this.__AKA = ENGINE_AKA; this.__P = BIKE_PHOTOS; this.__PS = bikePhotoSlug; this.__PC = typeof PHOTO_CREDIT === 'object' ? PHOTO_CREDIT : {};", ctx);
const ENGINES = ctx.__E, BIKES = ctx.__B.filter((b) => b.brand !== "Любая модель");
const GUIDES = ctx.__G, DIAG = ctx.__D, NO_CVT = ctx.__NC, AKA = ctx.__AKA || {};
// свои фото моделей (img/bikes): путь к снимку или ""
const PHOTOS = new Set(ctx.__P || []);
/* картинка для превью в соцсетях: своя у моделей с фото (img/og/<фото>.jpg — делает scripts/og-images.py), иначе общая */
const ogOf = (b) => { if (!b || !PHOTOS.has(b.brand + " " + b.name)) return ""; const f = "img/og/" + ctx.__PS(b.brand + " " + b.name) + ".jpg"; return fs.existsSync(path.join(ROOT, f)) ? SITE + f : ""; };
const photoOf = (b, small) => (PHOTOS.has(b.brand + " " + b.name) ? "/img/bikes/" + (small ? "s/" : "") + ctx.__PS(b.brand + " " + b.name) + ".webp" : "");

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
/* «о» / «об»: перед гласным звуком — «об» («об Avantis», «об AGB-37», «об Урале») */
const oOb = (w) => (/^[aeiouаеёиоуыэюяAEIOUАЕЁИОУЫЭЮЯ]/.test(String(w).trim()) ? "об " : "о ") + w;
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const appLink = (b, vi) => "/#bike=" + encodeURIComponent(b.brand + " " + b.name) + "&v=" + vi;

/* адреса: марка → /m/kayo/, модель → /m/kayo-t2-300-enduro/ (повторы — с номером) */
const used = {}, brandSlug = {}, bikeSlug = new Map();
/* как марку пишут по-русски — так её часто и ищут («масло в мотолэнд», «свечи кайо»): в заголовок, описание и разметку */
const BRAND_RU = { Honda: "Хонда", Yamaha: "Ямаха", Kawasaki: "Кавасаки", Suzuki: "Сузуки", BMW: "БМВ", KTM: "КТМ", "Harley-Davidson": "Харлей-Дэвидсон",
  Kayo: "Кайо", Motoland: "Мотолэнд", Ducati: "Дукати", Triumph: "Триумф", Husqvarna: "Хускварна", Racer: "Рейсер", Regulmoto: "Регулмото",
  Progasi: "Прогаси", Avantis: "Авантис", BSE: "БСЕ", Aprilia: "Априлия", Beta: "Бета", CFMOTO: "СФМОТО", GasGas: "ГазГаз", Benelli: "Бенелли",
  Bajaj: "Баджадж", "Moto Guzzi": "Мото Гуцци", "Royal Enfield": "Роял Энфилд", Indian: "Индиан", Irbis: "Ирбис", Voge: "Воге", Hyosung: "Хьосунг",
  "MV Agusta": "МВ Агуста", Zontes: "Зонтес", Ataki: "Атаки", Sherco: "Шерко", Apollo: "Аполло", Kews: "Кевс", Jawa: "Ява", Stels: "Стелс",
  Sharmax: "Шармакс", Promax: "Промакс", Zuumav: "Зумав", Lifan: "Лифан", Keeway: "Кивей", Kove: "Кове", Kymco: "Кимко", Piaggio: "Пьяджио",
  Hasky: "Хаски", Motax: "Мотакс", Vespa: "Веспа", Wels: "Велс", Daelim: "Даелим", Fuego: "Фуего", Geon: "Геон", Kovi: "Кови", Loncin: "Лончин",
  Tekken: "Теккен", Gilera: "Джилера", Peugeot: "Пежо", Simson: "Симсон", Derbi: "Дерби", Shineray: "Шинерай", Zongshen: "Зонгшен", Patron: "Патрон",
  Hawk: "Хоук", Viper: "Вайпер", Darex: "Дарекс", Hero: "Хиро", Husaberg: "Хусаберг", Cagiva: "Кагива", Buell: "Бьюэлл", Victory: "Виктори",
  Fantic: "Фантик", Samax: "Самакс", Rockot: "Рокот", Baltmotors: "Балтмоторс", Xmotos: "Иксмотос", Lifan: "Лифан" };
const uniq = (s) => { let x = s, i = 2; while (used[x]) x = s + "-" + i++; used[x] = 1; return x; };
const brands = [];
["motor", "remont", "polomka", "sravnenie", "podborka", "tuning", "provodka"].forEach((x) => (used[x] = 1)); // разделы моторов, инструкций и поломок
BIKES.forEach((b) => { if (!(b.brand in brandSlug)) { brandSlug[b.brand] = uniq(slugify(b.brand)); brands.push(b.brand); } });
BIKES.forEach((b) => bikeSlug.set(b, uniq(slugify(b.brand + " " + b.name))));

const POPULAR = ["Motoland", "Kayo", "Regulmoto", "BSE", "Avantis", "Progasi", "Racer", "Irbis", "Stels", "Sharmax", "CFMOTO", "Honda", "Yamaha", "Kawasaki", "Suzuki", "KTM", "Husqvarna", "BMW", "Harley-Davidson", "Ducati"];
/* алфавит: сначала латиница A–Z, потом русские марки; числа в названиях — по значению (T2 < T10) */
const COLL = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const cyr = (s) => /^[а-яё]/i.test(s);
const abc = (a, b) => (cyr(a) - cyr(b)) || COLL.compare(a, b);
const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
const ENG_N = new Set(BIKES.flatMap((b) => b.versions.map((v) => v.engine))).size;

const CSS = `.fbk{margin:18px 0 8px}.fbk summary{cursor:pointer;display:inline-block;padding:10px 14px;border:1px solid var(--line);border-radius:12px;font:600 15px var(--cond)}.fbk form{display:grid;gap:8px;margin-top:10px}.fbk select,.fbk input,.fbk textarea{padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:15px var(--body);min-width:0}.fbk textarea{resize:vertical}.fbk-btns{display:flex;flex-wrap:wrap;gap:8px}.fbk button{padding:12px 16px;border:1px solid var(--line);border-radius:8px;background:var(--card2);color:var(--ink);font:600 15px var(--cond);cursor:pointer}.fbk button[type=submit]{background:#fff;color:#000;border-color:#fff}.fbk button:disabled{opacity:.5}.fbk-msg{margin:8px 0 0;color:var(--muted)}
:root{color-scheme:dark;--bg:#000000;--card:#0E0E0E;--card2:#151515;--line:rgba(255,255,255,0.132);--ink:#F2F2F2;--muted:#9A9A9A;--acc:#FFFFFF;--acc2:#E6E6E6;--pink:#8F8F8F;
--display:"Russo One","Arial Black",Impact,sans-serif;--cond:"Fira Sans Condensed","Fira Sans Condensed Fallback","Arial Narrow",Arial,sans-serif;--body:"Fira Sans","Fira Sans Fallback","Segoe UI",Roboto,Arial,sans-serif}
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
.tile span{display:block;font:500 12px var(--cond);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.tile b{display:block;font:400 18px/1.25 var(--display);margin-top:2px;overflow-wrap:break-word}.tile b.long{font-size:15px;line-height:1.3}
.ver{padding:16px;border-radius:14px;background:var(--card);border:1px solid var(--line);margin:0 0 16px}.ver>h2{margin-top:0}
.groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.grp{padding:12px 14px;border-radius:10px;background:rgba(15,15,15,0.7);border:1px solid rgba(255,255,255,0.084)}
.grp dl{margin:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:6px 12px;font-size:15px}.grp dt{color:var(--muted)}.grp dd{margin:0;font-weight:500;overflow-wrap:anywhere}
.iss{display:grid;gap:8px;margin:14px 0 0;padding:0;list-style:none}.iss li{padding:10px 12px;border-radius:10px;background:rgba(15,15,15,0.7);border-left:3px solid #E6E6E6}
.iss li.high{border-left-color:#F43F5E}.iss li.med{border-left-color:#BDBDBD}.iss b{display:block}.iss .sev{font:600 11px var(--cond);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.cta{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:12px 18px;border-radius:10px;background:linear-gradient(135deg,var(--acc),var(--pink));color:#fff;font:600 16px var(--cond);text-decoration:none;box-shadow:0 10px 26px -12px rgba(255,255,255,0.315)}
.sticky{position:fixed;left:0;right:0;bottom:0;z-index:6;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:#000;border-top:1px solid var(--line);display:flex;justify-content:center}
.sticky .cta{margin:0;width:100%;max-width:520px;justify-content:center}
.note{color:var(--muted);font-size:14px;margin:8px 0 0}.hide{display:none!important}
.mreq{grid-column:1/-1;display:grid;gap:8px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--card)}.mreq b{font:600 17px var(--cond)}.mreq input{padding:12px;border-radius:8px;border:1px solid var(--line);background:var(--card2);color:var(--ink);font:15px var(--body);min-width:0}.mreq button{padding:12px 16px;border:1px solid #fff;border-radius:8px;background:#fff;color:#000;font:600 15px var(--cond);cursor:pointer}.mreq button:disabled{opacity:.5}.mreq-open{grid-column:1/-1;padding:12px 16px;border:1px dashed var(--line);border-radius:12px;background:none;color:var(--ink);font:600 15px var(--cond);cursor:pointer}
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
/* инструкции и поломки */
.steps{margin:0;padding:0;list-style:none;counter-reset:st;display:grid;gap:8px}.steps li{position:relative;padding:12px 14px 12px 48px;border-radius:4px;background:#0E0E0E;border:1px solid rgba(255,255,255,.14)}
.steps li::before{counter-increment:st;content:counter(st);position:absolute;left:12px;top:11px;width:26px;height:26px;display:grid;place-items:center;background:#fff;color:#000;font:400 14px var(--display);border-radius:3px}
.steps .no{display:block;margin-top:8px;padding:8px 10px;border-left:2px solid #F43F5E;background:rgba(244,63,94,.07);font-size:15px}.steps .no b{display:block}
.steps .hint{display:block;color:var(--muted);font-size:14px;margin-top:4px}
.steps strong{font-weight:700;color:#fff}
:root{--holo:linear-gradient(100deg,#3AF2CF 0%,#4E95FF 35%,#9B6BFF 65%,#FF6FD0 100%);--hot-rgb:143,132,255;--hot2-rgb:78,149,255;--hot-ink:#06060F;--hot:rgb(var(--hot-rgb));--hot2:rgb(var(--hot2-rgb))}
.cta,.ask button,.rv button{background:var(--holo)!important;color:var(--hot-ink)!important;border-color:transparent!important;box-shadow:none!important}.kick{background:var(--holo);-webkit-background-clip:text;background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent}h2::before{background:var(--holo)!important}.ask{border-color:rgba(var(--hot-rgb),.35)}.ask-out{border-left-color:var(--hot)}
.ask{margin:26px 0 8px;padding:14px;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:#0B0B0B}.ask h2{margin-top:0}.ask form{display:flex;gap:8px;align-items:flex-end}
.ask textarea{flex:1;min-height:46px;resize:vertical;padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:15px var(--body)}.ask textarea:focus{outline:none;border-color:#fff}
.ask button{padding:12px 16px;border:0;border-radius:8px;background:#fff;color:#000;font:600 15px var(--cond);cursor:pointer}.ask button:disabled{opacity:.5}
.rv{margin:26px 0 8px}.rv-item{padding:12px 14px;margin:0 0 8px;border:1px solid var(--line);border-radius:8px;background:var(--card)}.rv-item p{margin:6px 0 0;white-space:pre-wrap}.rv-head{font:500 14px var(--cond);color:var(--muted)}.rv-head b{color:var(--ink)}
.rv-add summary{cursor:pointer;display:inline-block;padding:10px 14px;border:1px solid rgba(255,255,255,.3);border-radius:8px;font:600 15px var(--cond)}.rv-add form{display:grid;gap:8px;margin-top:10px}.rv-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rv input,.rv textarea{padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:15px var(--body);min-width:0}.rv textarea{resize:vertical}.rv button{justify-self:start;padding:12px 16px;border:0;border-radius:8px;background:#fff;color:#000;font:600 15px var(--cond);cursor:pointer}.rv button:disabled{opacity:.5}
.ask-out{display:none;white-space:pre-wrap;margin-top:12px;padding:12px;border-left:2px solid #fff;background:#111;font-size:15px;line-height:1.5}.ask-out.on{display:block}.ask .note{margin:10px 0 0}.steps .opts{margin:8px 0 0;padding-left:18px;display:grid;gap:6px}.steps .opts li{padding:0;border:0;background:none;font-size:15px}.steps .opts li::before{content:none}
.ph{color:#fff;font-weight:600;border-bottom:1px dashed rgba(255,255,255,.5)}
.tblw{overflow-x:auto;margin:0 0 8px;border:1px solid rgba(255,255,255,.14);border-radius:4px}.tbl{border-collapse:collapse;width:100%;font-size:14px;min-width:520px}
.tbl th,.tbl td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.1);text-align:left;vertical-align:top}.tbl th{font:600 12px var(--cond);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);background:#0A0A0A}
.tbl td a{overflow-wrap:anywhere}.meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
ul.plain{margin:0;padding-left:20px}ul.plain li{margin:3px 0}
.hero h1{padding-right:52px}
.ad{margin:22px 0 0;min-height:90px}
.tbl.cmp{min-width:0;table-layout:fixed}.tbl:not(.cmp) td:first-child{white-space:nowrap}.tbl.cmp th:first-child,.tbl.cmp td:first-child{width:30%;color:var(--muted)}.tbl.cmp td{overflow-wrap:anywhere}
.faq{display:grid;gap:8px}.faq details{border:1px solid rgba(255,255,255,.14);border-radius:4px;background:#0E0E0E}
.faq summary{cursor:pointer;padding:12px 14px;font:600 16px var(--cond);list-style:none}.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";float:right;color:var(--muted)}.faq details[open] summary::after{content:"–"}.faq p{margin:0;padding:0 14px 12px;color:#D0D0D0}
/* v70 «Гараж» — как в приложении: графит, спокойные заголовки (Unbounded), мягкие карточки */
:root{--display:"Unbounded","Unbounded Fallback","Fira Sans",Arial,sans-serif;--bg:#0C0E12;--card:#161A21;--card2:#1C2129;--line:rgba(255,255,255,.075);--ink:#EEF1F5;--muted:#8E98A6}
body{background:radial-gradient(900px 520px at 70% -160px,rgba(124,132,255,.16),transparent 70%),#0C0E12!important;color:var(--ink)}
h1,h2,.card.big b,.tile b{font-style:normal!important;text-transform:none!important;text-shadow:none!important;letter-spacing:-.01em!important}
h1{font-weight:700!important}h2{font-weight:600!important;font-size:19px!important}.card.big b{font-family:"Fira Sans",Arial,sans-serif!important;font-weight:600!important;font-size:17px!important}
.hero{background:radial-gradient(120% 90% at 80% 0%,rgba(124,132,255,.2),transparent 55%),linear-gradient(160deg,#161A22,#12151B 60%,#0F1216)!important;border:1px solid var(--line)!important;border-radius:22px!important}
.hero::before,.hero::after{display:none!important}
.card,.tile,.faq details,.steps li,.ask,.rv-item,.tblw{background:var(--card)!important;border:1px solid var(--line)!important;border-radius:16px!important}
.card{border-left-width:1px!important}.card:hover{background:var(--card2)!important;border-color:rgba(255,255,255,.16)!important}
.kick{background:linear-gradient(95deg,#5FA8FF,#8A8CFF)!important;-webkit-background-clip:text!important;background-clip:text!important}
/* фото моделей: снимок без фона на тёмной «студии» */
.mphoto{margin:14px 0 4px;padding:4% 4% 3%;border-radius:12px;background:radial-gradient(120% 90% at 50% 100%,#2a2c30 0%,#141518 55%,#0c0c0d 100%);border:1px solid rgba(255,255,255,.1)}
.mphoto img{display:block;width:100%;max-width:640px;height:auto;margin:0 auto;filter:drop-shadow(0 14px 14px rgba(0,0,0,.6))}
.mphoto figcaption{margin-top:6px;text-align:center;font-size:11px;opacity:.6}.mphoto figcaption a{color:inherit}
.card.ph{display:grid;grid-template-columns:96px 1fr;column-gap:12px;align-items:center}.card.ph img{grid-row:span 2;width:96px;height:60px;object-fit:contain;filter:drop-shadow(0 4px 4px rgba(0,0,0,.5))}
.card.ph small{grid-column:2}
.showcase{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.show{display:flex;flex-direction:column;gap:2px;padding:10px 12px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(120% 90% at 50% 100%,#24262a 0%,#111214 60%,#0b0b0c 100%);color:var(--ink);text-decoration:none;transition:transform .15s,border-color .15s}
.show:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.4)}.show img{width:100%;height:120px;object-fit:contain;margin-bottom:6px;filter:drop-shadow(0 8px 8px rgba(0,0,0,.55))}.show small{color:var(--muted);font:500 13px var(--cond)}.show b{font:600 17px/1.2 var(--cond)}
`;

const SEARCH_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`;
/* поиск по каталогу: индекс m/index.json грузится при первом вводе */
/* русские названия и раскладка — те же, что в поиске приложения (BF_ALIAS, BF_TR, BF_LOOK, BF_RU/EN в js/app.js):
   «кайо т2», «альфа», «альфы», «хр250», «rfqj» (не та раскладка) находят модель */
const SR_MAP = (() => {
  const A = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8");
  const cut = (a, b) => { const i = A.indexOf(a), j = i < 0 ? -1 : A.indexOf(b, i); if (i < 0 || j < 0) throw new Error("build-pages: в js/app.js не найдено «" + a + "»"); return A.slice(i, j); };
  const c = {};
  vm.createContext(c);
  vm.runInContext((cut("const BF_ALIAS = {", "\n};") + "\n};\n" + cut("const BF_RU = ", "function bfAlts")).replace(/^const /gm, "var ") + "\nthis.M={ru:BF_RU,en:BF_EN,tr:BF_TR,look:BF_LOOK,alias:BF_ALIAS};", c);
  const alias = {};
  Object.keys(c.M.alias).forEach((k) => { if (k.indexOf(" ") < 0) alias[k] = String(c.M.alias[k]).split(/[ -]/)[0]; });
  return { ru: c.M.ru, en: c.M.en, tr: c.M.tr, look: c.M.look, alias };
})();
/* поиск по каталогу: индекс m/index.json грузится при первом вводе; файл m/search.js — общий для каталога и страницы 404 */
const SEARCH_JS = `(function(){var i=document.getElementById("q"),o=document.getElementById("res"),idx=null,busy=0;if(!i)return;
var A=${JSON.stringify(SR_MAP)};
var norm=function(s){return String(s).toLowerCase().replace(/ё/g,"е").replace(/[^a-zа-я0-9]+/g," ").trim()};
function alts(t){if(!/[а-я]/.test(t)){var ru=t.split("").map(function(c){var k=A.en.indexOf(c);return k<0?c:A.ru[k]}).join(""),o0=A.alias[ru]?[t,A.alias[ru]]:[t];if(/ks/.test(t))o0.push(t.replace(/ks/g,"x"));return o0}var tr=function(m){return t.split("").map(function(c){return m[c]!=null?m[c]:(A.tr[c]!=null?A.tr[c]:c)}).join("")};
var lay=t.split("").map(function(c){var k=A.ru.indexOf(c);return k<0?c:A.en[k]}).join("").replace(/[^a-z0-9]/g,""),out=[t,lay,tr({}),tr(A.look)];
var st=t.replace(/[аеиоуыэюяйь]+$/,""),al=A.alias[t];if(!al&&st.length>=4)for(var k in A.alias)if(k.indexOf(st)===0){al=A.alias[k];break}if(al)out.push(al);if(/кс/.test(t))out.push(tr({}).replace(/ks/g,"x"));return out}
/* опечатка в слове (4+ букв): 1 ошибка, для длинных (7+) — до 2: «motolend» → motoland, «kaio» → kayo; удвоенные буквы — не ошибка («appolo» → apollo) */
function typo(a,w){if(a.length<4||w.length<3||!/[a-zа-я]/.test(a))return false;var sq=function(x){return x.replace(/(.)\\1+/g,"$1")};if(sq(a)===sq(w))return true;var L=a.length>=7?2:1;if(Math.abs(a.length-w.length)>L)return false;var m=a.length,n=w.length,d=[],i,j;for(i=0;i<=m;i++){d[i]=[i];for(j=1;j<=n;j++)d[i][j]=i?0:j}
for(i=1;i<=m;i++){var best=1e9;for(j=1;j<=n;j++){var c=a[i-1]===w[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);if(i>1&&j>1&&a[i-1]===w[j-2]&&a[i-2]===w[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);if(d[i][j]<best)best=d[i][j]}if(best>L)return false}return d[m][n]<=L}
/* опечатки — только если слово точно не встречается ни в одной модели («альфа» — это Alpha, а не Alga) */
function hit(x,a){return a.some(function(t){return x.s.indexOf(t)>=0})||(!a.ex&&a.some(function(t){return x.w.some(function(v){return typo(t,v)})}))}
/* очки: слово в названии модели важнее, чем в коде мотора, а код — важнее объёма и типа; с начала слова — выше */
function sc(x,a){var m=0;a.forEach(function(t){var f=function(s,v){var k=s.indexOf(t);if(k<0)return;m=Math.max(m,k===0||s[k-1]===" "?v+1:v)};f(x.nm,4);f(x.nm2,3);f(x.cd,2);f(x.s,0);if(!a.ex&&x.w.some(function(v){return typo(t,v)}))m=Math.max(m,3)});return m}
function show(){var q=norm(i.value);if(!q){o.className="grid models res";o.innerHTML="";return}if(!idx){if(busy)return;busy=1;fetch("/m/index.json").then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){busy=0;idx=j.map(function(x){x.nm=norm(x.b+" "+x.n);x.nm2=x.nm.replace(/ /g,"");x.cd=norm(String(x.e).split("·")[0]);x.s=norm(x.b+" "+x.n+" "+x.e+" "+x.t+" "+(x.m||"")+" "+(x.k||"")).replace(/ /g,"")+" "+norm(x.b+" "+x.n+" "+x.e+" "+x.t+" "+(x.m||"")+" "+(x.k||""));x.w=norm(x.b+" "+x.n+" "+(x.m||"")+" "+(x.k||"")).split(" ").filter(function(v){return v.length>=3});return x});show()}).catch(function(){busy=0;o.className="grid models res on";o.innerHTML='<p class="note">Поиск не загрузился — проверь интернет и набери запрос ещё раз. Модель можно найти и по маркам ниже.</p>'});return}
var words=q.split(" "),w=words.map(function(t){var a=alts(t);a.ex=idx.some(function(x){return a.some(function(u){return x.w.some(function(v){return v.indexOf(u)>=0})})});return a}),hint="",find=function(ws){return idx.filter(function(x){return ws.every(function(a){return hit(x,a)})})},r=find(w);
/* ничего: пробуем без одного слова, потом без двух — оставляем самый полный запрос, по которому что-то есть */
if(!r.length&&w.length>1){for(var d1=w.length-1;d1>=0&&!r.length;d1--){r=find(w.filter(function(a,k){return k!==d1}));if(r.length){hint=words[d1];w=w.filter(function(a,k){return k!==d1})}}
for(var d2=w.length-1;d2>=0&&!r.length&&w.length>2;d2--)for(var d3=d2-1;d3>=0&&!r.length;d3--){r=find(w.filter(function(a,k){return k!==d2&&k!==d3}));if(r.length){hint=words[d3]+", "+words[d2];w=w.filter(function(a,k){return k!==d2&&k!==d3})}}}
r=r.map(function(x,n){return[x,w.reduce(function(s,a){return s+sc(x,a)},0),n]}).sort(function(a,b){return b[1]-a[1]||a[2]-b[2]}).slice(0,40).map(function(y){return y[0]});
o.className="grid models res on";o.innerHTML=(r.length&&hint?'<p class="note">Без «'+hint+'» — нет такого слова в названиях:</p><button class="mreq-open" type="button">Нет моей модели? Напиши — добавим</button>':"")+(r.length?r.map(function(x){return '<a class="card" href="/m/'+x.u+'/"><b>'+x.b+' '+x.n+'</b><small>'+x.t+' · '+x.e+'</small></a>'}).join("")+(hint?"":'<button class="mreq-open" type="button">Нет моей модели? Напиши — добавим</button>'):'<p class="note">Ничего не нашлось — попробуй марку или код мотора («174», «PR300»).</p>'+rq(i.value))}
/* «Нет моей модели»: заявка уходит на сервер, владельцу — сводка в утреннем отчёте; только модель и мотор, без контактов */
function rq(v){return '<div class="mreq"><b>Нет твоей модели? Напиши — добавим</b><input class="mrm" maxlength="80" placeholder="Марка и модель, например Kayo T4 300" value="'+String(v||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})+'"><input class="mre" maxlength="40" placeholder="Мотор, если знаешь: 172FMM, NB300…"><button type="button" class="mrs">Отправить</button><p class="note mrn"></p></div>'}
o.addEventListener("click",function(e){var t=e.target;if(t.classList.contains("mreq-open")){t.outerHTML=rq(i.value);return}if(!t.classList.contains("mrs"))return;var b=t.parentNode,m=b.querySelector(".mrm").value.trim(),en=b.querySelector(".mre").value.trim(),n=b.querySelector(".mrn");if(m.length<3){n.textContent="Напиши марку и модель";return}t.disabled=true;n.textContent="Отправляю…";
fetch("/ai-config.json",{cache:"no-cache"}).then(function(r){return r.json()}).then(function(j){return fetch(j.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({modelreq:{model:m,engine:en,q:i.value,page:location.pathname}})})}).then(function(r){return r.json()}).then(function(j){if(!j.ok)throw 0;b.innerHTML='<b>Спасибо! Заявка у нас</b><p class="note">Добавим модель в ближайшие дни, если найдём данные о моторе. Пока можно выбрать мотор по коду с картера — в разделе «Моторы».</p>'}).catch(function(){t.disabled=false;n.textContent="Не отправилось — проверь интернет и попробуй ещё раз"})});
i.addEventListener("input",show);try{var pq=new URLSearchParams(location.search).get("q");if(pq&&!i.value)i.value=pq}catch(x){}if(i.value)show()})();`;
/* фильтр по типу на странице марки */
const FILTER_JS = `(function(){var b=document.querySelectorAll("[data-t]");document.querySelectorAll("button[data-f]").forEach(function(c){c.addEventListener("click",function(){var f=c.getAttribute("data-f");
document.querySelectorAll("button[data-f]").forEach(function(x){x.classList.toggle("on",x===c)});b.forEach(function(x){x.classList.toggle("hide",f!=="*"&&x.getAttribute("data-t")!==f)})})})})();`;

/* «Поделиться» (Telegram, ВКонтакте, WhatsApp, системное меню телефона, копия ссылки), подписка на канал и «Установить на телефон» —
   на всех страницах каталога: люди сами приводят друзей и возвращаются. Скрипт — m/share.js */
const shareBar = (canon, title) => { const u = encodeURIComponent(canon), t = encodeURIComponent(title.replace(/ \| MotoHelper$/, ""));
  return `<div class="share" data-u="${canon}" data-t="${esc(title.replace(/ \| MotoHelper$/, ""))}"><b>Поделиться страницей</b><div class="chips"><button type="button" class="chip share-sys" hidden>Отправить…</button><a class="chip" data-via="tg" href="https://t.me/share/url?url=${u}&amp;text=${t}" target="_blank" rel="nofollow noopener">Telegram</a><a class="chip" data-via="vk" href="https://vk.com/share.php?url=${u}&amp;title=${t}" target="_blank" rel="nofollow noopener">ВКонтакте</a><a class="chip" data-via="wa" href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="nofollow noopener">WhatsApp</a><button type="button" class="chip share-copy">Скопировать ссылку</button></div><span class="share-msg small" aria-live="polite"></span></div>`; };
const SUB = `<aside class="sub"><b>Мотоцикл дня в 18:00 и советы по ремонту</b><p class="small">Каждый день — модель с интересным фактом, маслом и слабыми местами, через день — полезный совет. В канале MotoHelper.</p><div class="chips"><a class="chip" href="https://t.me/motohelperru">Канал в Telegram</a><a class="chip" href="https://vk.com/motohelper_ru37">Группа ВКонтакте</a><button type="button" class="chip inst" hidden>Установить MotoHelper на телефон</button></div></aside>`;
const SHARE_JS = `(function(){var g=function(v){if(window.ym)try{ym(113844391,"reachGoal","share",{via:v})}catch(x){}};var bar=document.querySelector(".share");
if(bar){var u=bar.getAttribute("data-u"),t=bar.getAttribute("data-t"),msg=bar.querySelector(".share-msg");bar.querySelectorAll("a[data-via]").forEach(function(a){a.addEventListener("click",function(){g(a.getAttribute("data-via"))})});
var sy=bar.querySelector(".share-sys");if(sy&&navigator.share){sy.hidden=false;sy.addEventListener("click",function(){navigator.share({title:t,url:u}).then(function(){g("system")}).catch(function(){})})}
var cp=bar.querySelector(".share-copy");if(cp)cp.addEventListener("click",function(){var ok=function(){msg.textContent="Ссылка скопирована — отправь другу";g("copy")},no=function(){window.prompt("Скопируй ссылку:",u)};if(navigator.clipboard)navigator.clipboard.writeText(u).then(ok,no);else no()})}
var ib=document.querySelector(".inst"),dp=null;if(ib){addEventListener("beforeinstallprompt",function(e){e.preventDefault();dp=e;ib.hidden=false});ib.addEventListener("click",function(){if(!dp)return;dp.prompt();dp.userChoice.then(function(c){if(c&&c.outcome==="accepted")g("install");dp=null;ib.hidden=true})})}})();`;
/* реклама РСЯ на страницах каталога — только если в ai-config.json задан rsya.blockId */
const SITE_CFG = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "ai-config.json"), "utf8")); } catch (e) { return {}; } })();
const RSYA_ID = SITE_CFG.rsya && /^R-A-[\d-]+$/.test(SITE_CFG.rsya.blockId || "") ? SITE_CFG.rsya.blockId : "";
const AD = RSYA_ID ? `<div class="ad" id="yandex_rtb_${RSYA_ID}"></div><script>window.yaContextCb=window.yaContextCb||[]</script><script src="https://yandex.ru/ads/system/context.js" async></script><script>window.yaContextCb.push(function(){Ya.Context.AdvManager.render({blockId:"${RSYA_ID}",renderTo:"yandex_rtb_${RSYA_ID}"})})</script>` : "";
const METRIKA = `<!-- Yandex.Metrika counter --><script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();/* счётчик — только на motohelper.ru: локальные проверки и автотесты не засчитываются как визиты */if(!/(^|\.)motohelper\.ru$/.test(location.hostname))return;for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js?id=113844391","ym");ym(113844391,"init",{webvisor:true,clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true,trackHash:false});</script><noscript><div><img src="https://mc.yandex.ru/watch/113844391" style="position:absolute;left:-9999px" alt="" /></div></noscript><!-- /Yandex.Metrika counter -->`;
/* «Спроси механика» на странице: вопрос уходит на сервер ИИ (адрес — из ai-config.json) вместе с темой страницы,
   ответ печатается потоком. Скрипт — m/ask.js (ниже), общий для всех страниц, кэшируется браузером. */
/* Отзывы владельцев: одобренные хранятся на сервере ИИ (?reviews=<адрес модели>) и подгружаются скриптом m/rv.js;
   раз в неделю задача по расписанию выгружает их в reviews.json — тогда они попадают прямо в HTML (их видит поиск). */
const REVIEWS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "reviews.json"), "utf8")); } catch (e) { return {}; } })();
const rvItem = (x) => `<div class="rv-item"><div class="rv-head"><b>${esc(x.name || "Владелец")}</b>${x.km ? ` · пробег ${esc(x.km)}` : ""}${x.t ? ` · ${esc(String(x.t).slice(0, 7).split("-").reverse().join("."))}` : ""}</div><p>${esc(x.text)}</p></div>`;
const rvBlock = (slug, model, short) => { const items = REVIEWS[slug] || [];
  return `<section class="rv" data-slug="${slug}" data-model="${esc(model)}"><h2>Отзывы владельцев ${esc(short)}</h2><div class="rv-list">${items.map(rvItem).join("") || `<p class="note rv-empty">Пока нет отзывов. Ездишь на ${esc(short)}? Расскажи, что ломалось и на каком пробеге — это поможет другим.</p>`}</div>
<details class="rv-add"><summary>Написать отзыв</summary><form><div class="rv-row"><input name="name" maxlength="40" placeholder="Имя (необязательно)" aria-label="Имя" /><input name="km" maxlength="20" placeholder="Пробег" aria-label="Пробег" /></div><textarea name="text" aria-label="Текст отзыва" rows="4" minlength="30" maxlength="1500" required placeholder="Что нравится, что ломалось и на каком пробеге, какое масло и запчасти ставил"></textarea><button type="submit">Отправить</button><p class="rv-msg note"></p></form></details></section>`; };
const RV_JS = `(function(){var box=document.querySelector(".rv");if(!box)return;var list=box.querySelector(".rv-list"),f=box.querySelector("form"),msg=box.querySelector(".rv-msg"),ep=null;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function item(x){var d=el("div","rv-item"),h=el("div","rv-head"),b=el("b",null,x.name||"Владелец");h.appendChild(b);var extra=(x.km?" · пробег "+x.km:"")+(x.t?" · "+String(x.t).slice(0,7).split("-").reverse().join("."):"");if(extra)h.appendChild(document.createTextNode(extra));d.appendChild(h);d.appendChild(el("p",null,x.text));return d}
function render(items){if(!items||!items.length)return;list.textContent="";items.forEach(function(x){list.appendChild(item(x))})}
fetch("/ai-config.json").then(function(r){return r.json()}).then(function(j){ep=j.endpoint;return fetch(ep+"/?reviews="+encodeURIComponent(box.dataset.slug))}).then(function(r){return r.json()}).then(function(j){render(j.items)}).catch(function(){});
f.addEventListener("submit",function(e){e.preventDefault();if(!ep)return;var b=f.querySelector("button");b.disabled=true;msg.textContent="Проверяю отзыв…";
fetch(ep,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({review:{slug:box.dataset.slug,model:box.dataset.model,name:f.elements.name.value,km:f.elements.km.value,text:f.elements.text.value}})}).then(function(r){return r.json().then(function(j){return{s:r.status,j:j}})}).then(function(o){
if(o.j.published){var e=list.querySelector(".rv-empty");if(e)e.remove();list.insertBefore(item(o.j.item),list.firstChild);f.reset();msg.textContent="Спасибо! Отзыв опубликован.";if(window.ym)try{ym(113844391,"reachGoal","review")}catch(x){}}
else msg.textContent=o.s===429?"Сегодня больше отзывов отправить нельзя.":o.j.error==="short"?"Напиши чуть подробнее — хотя бы пару предложений.":"Спасибо! Отзыв не прошёл автоматическую проверку: без ссылок, контактов и мата, пожалуйста."}).catch(function(){msg.textContent="Не получилось отправить — попробуй позже."}).then(function(){b.disabled=false})})})();`;
/* «Значение не совпадает?» — владелец сообщает, что на странице не так (или что всё сходится с мануалом).
   Сообщение уходит на сервер сайта (как «Сообщить о неточности» в приложении); скрипт — m/fb.js */
const fbBlock = (bike, engine, keys) => `<details class="fbk" data-bike="${esc(bike)}" data-engine="${esc(engine)}"><summary>Значение не совпадает с мануалом? Сообщи</summary>
<form><select name="k" aria-label="Что не так"><option value="">Что не так</option>${keys.map((k) => `<option>${esc(k)}</option>`).join("")}<option>Другое</option></select><textarea name="t" aria-label="Что не так и откуда данные" rows="3" maxlength="2000" required placeholder="Как у тебя и откуда: «по мануалу объём масла 1.3 л», «на наклейке другая свеча»"></textarea><input name="c" maxlength="120" placeholder="Как с тобой связаться (необязательно)" aria-label="Контакт" /><div class="fbk-btns"><button type="submit">Отправить</button><button type="button" class="fbk-ok">Всё совпадает с мануалом</button></div></form><p class="fbk-msg" role="status"></p></details>`;
const FB_JS = `(function(){var box=document.querySelector(".fbk");if(!box)return;var f=box.querySelector("form"),msg=box.querySelector(".fbk-msg"),ep=null;
fetch("/ai-config.json").then(function(r){return r.json()}).then(function(j){ep=j.endpoint}).catch(function(){});
function send(text){if(!ep){msg.textContent="Сервер сайта сейчас недоступен — попробуй позже.";return}var bs=f.querySelectorAll("button");for(var i=0;i<bs.length;i++)bs[i].disabled=true;msg.textContent="Отправляю…";
fetch(ep,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({feedback:{bike:box.dataset.bike,engine:box.dataset.engine,text:text,contact:f.elements.c.value,page:location.href}})}).then(function(r){return r.json()}).then(function(j){if(!j.ok)throw 0;f.reset();msg.textContent="Спасибо! Проверим и поправим — по таким сообщениям данные и уточняются.";if(window.ym)try{ym(113844391,"reachGoal","page_fix")}catch(x){}})
.catch(function(){msg.textContent="Не получилось отправить — попробуй позже."}).then(function(){for(var i=0;i<bs.length;i++)bs[i].disabled=false})}
f.addEventListener("submit",function(e){e.preventDefault();var t=f.elements.t.value.trim();if(t.length<3)return;var k=f.elements.k.value;send((k?"✗ "+k+": ":"")+t)});
box.querySelector(".fbk-ok").addEventListener("click",function(){send("✓ Данные страницы совпадают с мануалом / мотоциклом владельца"+(f.elements.t.value.trim()?": "+f.elements.t.value.trim():""))})})();`;
const askBlock = (about) => `<section class="ask" data-ctx="${esc(about)}"><h2>Спроси механика</h2><form><textarea name="q" rows="2" maxlength="600" placeholder="Например: не заводится на холодную — что проверить?" required></textarea><button type="submit">Спросить</button></form><div class="ask-out" aria-live="polite"></div><p class="note">Отвечает ИИ по базе MotoHelper — сверяйся с мануалом. Подробный разговор с фото — в <a href="/#ai=1">ИИ-механике MotoHelper</a>.</p></section>`;
const ASK_JS = `(function(){var box=document.querySelector(".ask");if(!box)return;var f=box.querySelector("form"),out=box.querySelector(".ask-out"),btn=f.querySelector("button"),ep=null;
fetch("/ai-config.json").then(function(r){return r.json()}).then(function(j){ep=j.endpoint}).catch(function(){});
function show(t){out.textContent="";t.split(/(https:\\/\\/motohelper\\.ru\\/[^\\s)]*)/).forEach(function(x,i){if(i%2){var a=document.createElement("a");a.href=x.replace(/[.,]$/,"");a.textContent=x;out.appendChild(a)}else out.appendChild(document.createTextNode(x))})}
f.addEventListener("submit",function(e){e.preventDefault();var q=f.q.value.trim();if(q.length<3||!ep)return;btn.disabled=true;out.className="ask-out on";out.textContent="Механик думает…";var txt="",buf="";
fetch(ep,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ask:q,ctx:box.dataset.ctx})}).then(function(r){if(!r.ok||!r.body)throw new Error(r.status===429?"Слишком много вопросов за сегодня — продолжи в Telegram-боте.":"ИИ сейчас перегружен — попробуй через минуту.");var rd=r.body.getReader(),dec=new TextDecoder();
function pump(){return rd.read().then(function(c){if(c.done){if(!txt)throw new Error("Пустой ответ — попробуй ещё раз.");return}buf+=dec.decode(c.value,{stream:true});var i;while((i=buf.indexOf("\\n"))>=0){var l=buf.slice(0,i).trim();buf=buf.slice(i+1);if(l.indexOf("data:")!==0)continue;try{var j=JSON.parse(l.slice(5));txt+=j.response||(j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content)||""}catch(x){}}show(txt.replace(/\\*\\*/g,"").replace(/^#+\\s*/gm,""));return pump()})}return pump()})
.catch(function(err){out.textContent=err.message||"Не получилось — попробуй ещё раз."}).then(function(){btn.disabled=false;if(window.ym)try{ym(113844391,"reachGoal","page_ask")}catch(x){}})})})();`;

/* Яндекс показывает ~70 знаков заголовка и ~160–200 описания: длинный заголовок теряет « | MotoHelper»,
   длинное описание обрезается по последней запятой или точке до 220 знаков */
// заголовок «основа + хвост»: самый длинный хвост, при котором влезает в 75 знаков; длинную основу режем по слову
/* диапазоны и единицы не рвём по строкам («0.6–0.7 мм» целиком) */
const nbv = (t) => String(t).replace(/(\d)\s*([–-])\s*(\d)/g, "$1\u2060$2\u2060$3").replace(/(\d) (мм|л|Н·м|бар|км|см³|л\.с\.|об\/мин|моточ\.|ч)(?![\wа-яё])/g, "$1\u00a0$2");
const pickTitle = (base, tails) => { const t = tails.map((x) => base + x).find((x) => x.length <= 75); if (t) return t;
  /* обрезаем название так, чтобы с последним хвостом влезло в 75 знаков */
  let b = base.slice(0, Math.max(30, 74 - tails[tails.length - 1].length)).replace(/[\s,/:;–—-]+\S*$/, "").replace(/[\s,:;–—-]+(и|в|с|на|по|для|или|а|от|до|без)$/i, ""); if ((b.match(/\(/g) || []).length > (b.match(/\)/g) || []).length) b = b.replace(/\s*\([^)]*$/, ""); return b + tails[tails.length - 1]; };
const fitTitle = (t) => (t.length > 70 ? t.replace(/ \| MotoHelper$/, "") : t);
/* значение для описания в выдаче: без источника в скобках и уточнений после «;» — «10W-40 (JASO MA)» → «10W-40»,
   «около 1.2 л, контроль по смотровому окну (руководство Kayo 2022…)» → «около 1.2 л, контроль по смотровому окну» */
const brief = (s) => { let x = String(s || ""); for (let i = 0; i < 3; i++) x = x.replace(/\s*\([^()]*\)/g, ""); return x.split(/;\s/)[0].replace(/≈\s*/g, "около ").replace(/\s+/g, " ").replace(/[,\s]+$/, "").trim(); };
/* масло: только марка/вязкость («Двигатель: 20W-50, сухой картер…» → «20W-50»); зазоры: «0.06 / 0.08 мм» */
const briefOil = (s) => brief(s).replace(/^[А-ЯЁа-яё ]+:\s*/, "").split(/,\s/)[0];
const briefValves = (a, b) => { const v = (x) => brief(x).replace(/\s*мм.*$/i, "").replace(/\s*на холодном.*$/i, ""); return a && b && /\d/.test(a) ? v(a) + " / " + v(b) + " мм" : ""; };
const fitDesc = (d) => { if (d.length <= 200) return d; const cut = d.slice(0, 200), i = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf(". "), cut.lastIndexOf("; ")); let r = i > 110 ? cut.slice(0, i) : cut.replace(/\s+\S*$/, "");
  /* незакрытая скобка после обрезки — режем до неё */
  if ((r.match(/\(/g) || []).length > (r.match(/\)/g) || []).length) r = r.slice(0, r.lastIndexOf("("));
  return r.replace(/[,;:\s—–(-]+$/, "") + "."; };
/* метки версий у общих файлов каталога (m.css, скрипты): после выкладки браузер берёт новый файл сразу, а service worker —
   из кэша, пока метка та же (файлы с ?v= у него «сначала кэш»). В страницу пишем заглушку, в конце сборки — хэш файла */
const assetV = () => ({ css: "@@V:m/m.css@@", ask: "@@V:m/ask.js@@", rv: "@@V:m/rv.js@@", fb: "@@V:m/fb.js@@", share: "@@V:m/share.js@@" });
function page({ title, desc, canon, canonTo, crumbs, body, ld, js, sticky, ask, rv, fb, image }) {
  title = fitTitle(title);
  desc = fitDesc(desc);
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<script>if(location.protocol==="http:"&&/(^|\\.)motohelper\\.ru$/.test(location.hostname))location.replace("https://"+location.host+location.pathname+location.search+location.hash);</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${canonTo || canon}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="MotoHelper" />
<meta property="og:locale" content="ru_RU" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${canonTo || canon}" />
<meta property="og:image" content="${image || SITE + "img/og.jpg"}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="#000000" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" type="image/png" sizes="120x120" href="/img/favicon-120.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/img/icon-192.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="preload" href="/fonts/fira-sans-400-normal.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/m/m.css?v=${assetV().css}" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="top"><a class="logo" href="/"><i>MH</i>MotoHelper</a><a class="open" href="${sticky || "/"}">Открыть приложение</a></header>
<main>
<nav class="crumbs">${crumbs.map((c) => (c[1] ? `<a href="${c[1]}">${esc(c[0])}</a>` : esc(c[0]))).join(" › ")}</nav>
${body}
${shareBar(canon, title)}
${ask ? askBlock(ask) : ""}
${SUB}
${AD}
<footer>MotoHelper — ремонт, ТО и запчасти для мотоциклов, питбайков и мопедов: диагностика, инструкции, ИИ-механик. Данные справочные — перед работой сверяйся с мануалом своего мотоцикла.<nav class="fnav" aria-label="Разделы"><a href="/m/">Каталог</a><a href="/m/polomka/">Неисправности</a><a href="/m/remont/">Инструкции</a><a href="/m/motor/">Моторы</a><a href="/m/tuning/">Тюнинг</a><a href="/m/provodka/">Электрика</a><a href="/m/podborka/">Подборки</a><a href="/m/sravnenie/">Сравнения</a><a href="/">Приложение</a><a href="/#ai=1">ИИ-механик</a><a href="https://t.me/motohelperru">Канал в Telegram</a><a href="https://vk.com/motohelper_ru37">Группа ВКонтакте</a></nav></footer>
</main>
${sticky ? `<div class="sticky"><a class="cta" href="${sticky}">Открыть в MotoHelper: ремонт, запчасти, ИИ</a></div>` : ""}
${js ? `<script>${js}</script>` : ""}
${ask ? `<script src="/m/ask.js?v=${assetV().ask}" defer></script>` : ""}
${rv ? `<script src="/m/rv.js?v=${assetV().rv}" defer></script>` : ""}
${fb ? `<script src="/m/fb.js?v=${assetV().fb}" defer></script>` : ""}
<script src="/m/share.js?v=${assetV().share}" defer></script>
${METRIKA}
</body>
</html>
`;
}
const crumbLd = (crumbs) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c[0], item: c[1] ? SITE.replace(/\/$/, "") + c[1] : undefined })) });

/* характеристики группами: мотор / масло и ТО / зажигание и клапаны / питание */
/* моточасы: тот же пересчёт, что в приложении (kmPerHour в js/app.js) — по износу мотора */
/* кроссовую технику и питбайки обслуживают по моточасам (как в приложении: bikeClass → cross / pit / kids) */
function hoursBike(e, b) {
  const t = (b && b.type) || "";
  if (/^(Мопед|Скутер|Спорт|Чоппер|Нейкед|Триал|Мотард|Тур-эндуро|Турер|Лёгкий эндуро|Классика)$/.test(t)) return false;
  return t === "Питбайк" || t === "Кросс-эндуро" || e.stroke === "2T";
}
function hoursEvery(km, kind, e, b) {
  if (!hoursBike(e, b) || e.hours) return "";
  const h = kind === "oil" ? (km <= 1000 ? 10 : 15) : Math.max(15, Math.min(30, Math.round(km / 500) * 5));
  return "каждые " + h + "\u00a0моточ. · ≈\u00a0" + (h * 50).toLocaleString("ru-RU").replace(/\u00a0/g, " ") + "\u00a0км";
}
/* слабые места для ответа «Какие слабые места у …?» — без служебной пометки «цифры типовые, смотри мануал» */
const weak = (e) => (e.issues || []).filter((x) => !/^Цифры по модели — типовые/.test(x.t));
/* вопрос-ответ про клапаны: гидрокомпенсаторы — «регулировать не нужно»; числа — без источника в скобках, «на холодном» один раз */
const valveFaq = (e, name, tail) => { const a = String(e.valveIn || ""), b = String(e.valveEx || "");
  if (/гидрокомпенс/i.test(a + b)) return ["Нужно ли регулировать клапаны на " + name + "?", "Нет: стоят гидрокомпенсаторы — зазор держится сам и не регулируется" + (tail || "")];
  if (!/\d/.test(a) || !/\d/.test(b) || /мануал/i.test(a + b)) return null;
  const v = (x) => brief(x).replace(/\s*на холодн\S*.*$/i, "");
  return ["Какие зазоры клапанов на " + name + "?", "Впуск " + v(a) + ", выпуск " + v(b) + ", на холодном моторе" + (tail || "")]; };
function kmh(km, e, b) {
  const t = b && b.type || "";
  const k = /Питбайк|Кросс|Эндуро|Мотард|Триал/i.test(t) ? 50 : /Скутер|Мопед/i.test(t) || e.cvt ? 40 : t ? 60 : e.cc > 300 ? 60 : 50;
  const h = km / k, r = h >= 20 ? Math.round(h / 5) * 5 : Math.max(1, Math.round(h));
  return "каждые " + Number(km).toLocaleString("ru-RU").replace(/\u00a0/g, " ") + "\u00a0км · ≈\u00a0" + r + "\u00a0моточ.";
}
function specGroups(e, v, b) {
  const ok = (x) => x != null && String(x).trim() && String(x) !== "—";
  const g = (title, id, rows) => ({ title, id, rows: rows.filter((r) => ok(r[1])) });
  return [
    g("Мотор", "motor", [["Двигатель", e.name], ["Код", e.code], ["Объём", e.cc ? e.cc + " см³" : "", "cc"], ["Мощность", (v.hp || e.hp) ? (v.hp || e.hp) + " л.с." : "", v.hp ? "" : "hp"], ["Момент", e.torque, "torque"], ["Тип", [e.stroke, e.cam && e.stroke === "2T" ? lc1(e.cam) : e.cam].filter(Boolean).join(", "), "cam"], ["Охлаждение", e.cooling], ["Коробка", e.gearbox, "gearbox"], ["Запуск", e.start], ["Компрессия", e.compression, "compression"]]),
    g("Масло и ТО", "maslo", [["Масло", e.oil, "oil"], [e.stroke === "2T" ? (e.cvt || (e.groups || []).indexOf("cvt") >= 0 ? "Масло в редуктор" : "Масло КПП") : "Объём масла", e.oilVol, "oilVol"], [e.stroke === "2T" ? (e.cvt || (e.groups || []).indexOf("cvt") >= 0 ? "Замена масла в редукторе" : "Замена масла КПП") : "Замена масла", e.oilInt ? hoursEvery(e.oilInt, "oil", e, b) || kmh(e.oilInt, e, b) : ""], ["Антифриз", e.coolant, "coolant"], ["Топливо", e.fuel]]),
    g(e.stroke === "2T" ? "Свеча" : "Свеча и клапаны", "svecha", [["Свеча", e.spark, "spark"], ["Зазор свечи", e.gap, "gap"], ["Клапаны, впуск", e.valveIn, "valveIn"], ["Клапаны, выпуск", e.valveEx, "valveEx"], ["Проверка клапанов", e.valveInt ? hoursEvery(e.valveInt, "valve", e, b) || kmh(e.valveInt, e, b) : ""]]),
    g("Питание", "pitanie", [["Карбюратор / впрыск", v.carb || e.carb, v.carb ? "" : "carb"], ["Главный жиклёр", e.jetMain, "jetMain"], ["Жиклёр ХХ", e.jetPilot, "jetPilot"], ["Игла", e.needle, "needle"], ["Холостые", e.idle, "idle"]]),
  ].filter((x) => x.rows.length);
}
/* «Гаражные» блоки страницы мотора и модели: быстрые переходы, ✓ у цифр из руководства, моменты затяжки, смесь для 2T */
const VF = `<i class="vf" title="Сверено с руководством">✓</i>`;
const TYP = `<i class="typ" title="Типовое значение для мотора такого класса — сверь с мануалом">типовое</i>`;
/* у объёма масла и зазоров клапанов без сверки — видимая пометка «типовое» прямо у цифры: сноску внизу страницы в гараже не читают */
const RISKY = ["oilVol", "valveIn", "valveEx"];
const DIS = `<i class="typ" title="Руководства дают разные значения — сверь со своим мануалом">мануалы расходятся</i>`;
const ddv = (e, r) => `<dd>${esc(r[1])}${r[2] && e.dis && e.dis[r[2]] ? DIS : r[2] && e.ex && e.ex[r[2]] ? VF : r[2] && RISKY.indexOf(r[2]) >= 0 && /\d/.test(r[1]) ? TYP : ""}</dd>`;
const grpHtml = (g, e, pfx) => `<div class="grp" id="${pfx}${g.id}"><h3>${g.title}</h3><dl>${g.rows.map((r) => `<dt>${esc(r[0])}</dt>${ddv(e, r)}`).join("")}</dl></div>`;
const premix = (e) => e.stroke === "2T" && /premix/i.test(e.oil || "");
function mixHtml(e, pfx) {
  if (!premix(e)) return "";
  const m = String(e.oil).match(/1\s*:\s*(\d{2,3})|(\d{2,3})\s*:\s*1/), own = m ? Number(m[1] || m[2]) : 0;
  const rs = own ? [own] : [33, 40, 50];
  const ml = (l, n) => Math.round((l * 1000) / n);
  return `<div class="grp" id="${pfx}smes"><h3>Смесь бензин : масло</h3><dl>${[1, 5, 10].map((l) => `<dt>${l} л бензина</dt><dd>${rs.map((n) => (rs.length > 1 ? `1:${n} — ` : "") + ml(l, n) + " мл").join("<br>")}</dd>`).join("")}</dl>
<p class="small">${own ? `Пропорция 1:${own} — из данных мотора.` : "Пропорцию смотри на банке масла и в мануале: чаще всего 1:40–1:50 для синтетики."} На обкатке — гуще, 1:25–1:30. Масло лей в канистру до бензина и взбалтывай.</p></div>`;
}
function torqueHtml(e, b, pfx) {
  /* типовых строк — 10 самых ходовых; строки из руководства мотора добавляются сверх них, чтобы не вытеснять оси и звёзды */
  const rows = (ctx.torqueFor(e, b) || []).slice(0, 10 + (e.torq || []).length);
  const own = rows.some((r) => r[2]);
  return `<div class="grp" id="${pfx}momenty"><h3>Моменты затяжки</h3><dl>${rows.map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}${r[2] ? VF : ""}</dd>`).join("")}</dl>
<p class="small">${own ? "✓ — из руководства этого мотора, остальное — типовые значения по резьбе." : "Типовые значения по месту и резьбе. Резьбу в алюминии не перетягивай — динамометрический ключ дешевле головки."}</p></div>`;
}
const srcNote = (e) => e.ex && Object.keys(e.ex).length
  ? `<p class="note src">✓ — цифра сверена с руководством (завода или официального дилера). Без отметки — типовое значение для мотора такого класса: перед работой сверь со своим мануалом.</p>`
  : `<p class="note src">Цифры по этому мотору — типовые для его класса: заводских данных в базе пока нет. Перед работой сверь со своим мануалом, а если знаешь точные — отправь ниже, проверим и исправим.</p>`;
function jumpNav(e, pfx, hasIss, hasCross, hasBuy, hasFork) {
  const L = [["maslo", "Масло"], ["svecha", e.stroke === "2T" ? "Свеча" : "Свеча и клапаны"], ["momenty", "Моменты"], hasCross && ["analogi", "Аналоги запчастей"], hasFork && ["vilka", "Вилка"], hasBuy && ["kupit", "Где купить"], premix(e) && ["smes", "Смесь 2T"], carbUp(e) && ["karb", "Карбюратор побольше"], hasIss && ["slabye", "Слабые места"]].filter(Boolean);
  return `<nav class="jump" aria-label="Быстрый переход">${L.map((x) => `<a href="#${pfx}${x[0]}">${x[1]}</a>`).join("")}</nav>`;
}
/* кнопки в инструменты приложения — сразу в нужный раздел для этого мотоцикла (см. rvFromHash в js/app.js) */
function toolsNav(e, link) {
  const carb = !/впрыск|инжектор|efi|tpi/i.test(String(e.carb || "")) && (e.groups || []).indexOf("efi") < 0;
  const L = [["r=find", "Что сломалось?"], ["r=wiring", "Схема электрики"], ["r=specs", "Моменты и шины"], ["r=tune", carb ? "Тюнинг и карбюратор" : ctx.hasChain(e) ? "Тюнинг и звёзды" : "Тюнинг"], ["r=to", "ТО по пробегу"], ["ai=1", "Спросить ИИ"]];
  return `<nav class="tools" aria-label="Инструменты в приложении"><span>В приложении:</span>${L.map((x) => `<a href="${link}&${x[0]}">${x[1]}</a>`).join("")}</nav>`;
}
/* аналоги расходников модели (CROSS / crossRows в js/data.js): фильтры, колодки, АКБ */
function crossHtml(b, pfx) {
  const rows = b ? ctx.crossRows(b) : [];
  if (!rows.length) return "";
  return `<div class="grp" id="${pfx}analogi"><h3>Аналоги расходников</h3><dl>${rows.map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>
<p class="small">Номера HiFlo, K&amp;N, EBC, Yuasa и оригинальные (OEM) — по каталогам производителей. Перед покупкой сверь по году выпуска и по старой детали.</p></div>`;
}
/* «Вилка»: объём масла на перо, марка и уровень — из мануала модели (FORK в data.js); если данных нет — честно и ссылка на инструкцию */
function forkHtml(b, pfx) {
  const rows = b ? ctx.forkRows(b) : [];
  const L = b && ctx.FORK ? ctx.FORK[b.brand + "|" + b.name] || [] : [];
  if (!rows.length) return `<div class="grp" id="${pfx}vilka"><h3>Вилка</h3><p class="small">Заводского объёма масла в вилке для этой модели в базе пока нет. Меняй по уровню: одинаково в обоих перьях, по мануалу своей вилки.</p><p><a class="chip" href="/m/remont/fork-oil/">Как поменять масло в вилке →</a></p></div>`;
  const src = Array.from(new Set(L.map((x) => x[4]))).join("; ");
  const lvl = (x) => x + (/трубы|штока/.test(x) ? "" : " от верха трубы, перо сжато, без пружины");
  /* несколько поколений — по строке на каждое: объём крупно, масло и уровень под ним */
  const dl = L.length > 1 ? L.map((x) => `<dt>${esc(x[0] || "Все годы")}</dt><dd><b>${esc(x[2])}</b>${VF}${x[1] ? `<br><span class="small">масло: ${esc(x[1])}</span>` : ""}${x[3] ? `<br><span class="small">уровень: ${esc(lvl(x[3]))}</span>` : ""}</dd>`).join("")
    : rows.map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}${VF}</dd>`).join("");
  return `<div class="grp" id="${pfx}vilka"><h3>Вилка${L.length === 1 && L[0][0] ? " · " + esc(L[0][0]) : ""}</h3><dl>${dl}</dl>
<p class="small">Источник: ${esc(src)}. «В сухую» — после разборки и просушки пера, «при замене» — после слива.</p><p><a class="chip" href="/m/remont/fork-oil/">Как поменять масло в вилке →</a></p></div>`;
}
/* «Где купить»: поиск точного номера расходника на площадках (те же магазины и партнёрские ссылки, что в приложении — ai-config.json) */
const SHOPS = [["Ozon", "https://www.ozon.ru/search/?text="], ["WB", "https://www.wildberries.ru/catalog/0/search.aspx?search="], ["Маркет", "https://market.yandex.ru/search?text="], ["Авито", "https://www.avito.ru/rossiya?q="], ["AliExpress", "https://aliexpress.ru/wholesale?SearchText="]];
function shopLink(sh, q) {
  const url = sh[1] + encodeURIComponent(q), a = SITE_CFG.aff && SITE_CFG.aff[sh[0]];
  const aff = typeof a === "string" && /^https:\/\//.test(a);
  const href = aff ? (a.indexOf("{url}") >= 0 ? a.replace("{url}", encodeURIComponent(url)) : a + encodeURIComponent(url)) : url;
  const erid = aff && /[?&]erid=([^&]+)/.exec(a);
  return `<a href="${esc(href)}" target="_blank" rel="nofollow noopener${aff ? " sponsored" : ""}"${aff ? ` title="Реклама. ${sh[0]}${erid ? ", erid: " + esc(decodeURIComponent(erid[1])) : ""}"` : ""}>${sh[0]}${aff ? "<small> реклама</small>" : ""}</a>`;
}
function buyItems(e, b) {
  const L = [];
  const sp = String(e.spark || "").split(/\s*[\/(;,]/)[0].trim();
  if (sp && /[A-Z]{1,5}\d/.test(sp)) L.push(["Свеча", sp, "свеча " + sp]);
  const grade = String(e.oil || "").split(/[,(;]/)[0].trim();
  if (/\d+W-?\d+/i.test(grade)) L.push(["Масло", grade + (/JASO|MA2?\b/.test(String(e.oil)) ? " JASO MA" : ""), "моторное масло " + grade.match(/\d+W-?\d+/i)[0] + " мото 4T"]);
  (b ? ctx.crossRows(b) : []).forEach((r) => {
    const code = String(r[1]).split(" · ")[0].replace(/\s*\([^)]*\)/g, "").split(" / ")[0].trim();
    if (code && /\d/.test(code)) L.push([r[0], code, code]);
  });
  return L;
}
function buyHtml(e, b, pfx) {
  const L = buyItems(e, b);
  if (!L.length) return "";
  return `<div class="grp buy" id="${pfx}kupit"><h3>Где купить</h3>${L.map((x) => `<div class="buyrow"><b>${esc(x[0])}: ${esc(x[1])}</b><span>${SHOPS.map((sh) => shopLink(sh, x[2])).join("")}</span></div>`).join("")}
<p class="small">Ищем точный номер на площадках. Перед покупкой сверь номер со старой деталью.</p></div>`;
}
const garageGroups = (e, v, b, pfx, cross, first) => `<div class="groups">${specGroups(e, v, b).map((g) => grpHtml(g, e, pfx)).join("")}${torqueHtml(e, b, pfx)}${cross ? crossHtml(b, pfx) : ""}${first && b ? forkHtml(b, pfx) : ""}${buyHtml(e, cross ? b : null, pfx)}${mixHtml(e, pfx)}</div>${srcNote(e)}`;
/* шпаргалка — первое, что видно на телефоне: масло, свеча, клапаны крупно, у каждой цифры — откуда она (✓ мануал или «типовое»);
   плитка ведёт к своему блоку с подробностями */
const RNG = /\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?/;
const real = (x) => x != null && String(x).trim() && String(x) !== "—" && !/мануал/i.test(String(x)) && /\d/.test(String(x));
function cheat(e, v, pfx, b) {
  const ex = (k) => !!(e.ex && e.ex[k]);
  const T = [];
  if (real(e.oilVol)) {
    const ov = String(e.oilVol).replace(/≈\s*/g, ""), m = ov.match(/\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*(?:мл|л)(?![а-яё])/);
    const big = m ? m[0] : ov.split(/[(;,]/)[0];
    const rest = m ? ov.slice(m.index + m[0].length).split(/[(;]/)[0].replace(/^[\s,.—-]+/, "").trim() : "";
    const grade = real(e.oil) || /\w/.test(String(e.oil || "")) ? String(e.oil || "").split(/[,(;]/)[0].trim() : "";
    T.push([e.stroke === "2T" ? ((e.groups || []).indexOf("cvt") >= 0 ? "Масло в редуктор" : "Масло КПП") : "Масло", big, [grade, rest.length <= 48 ? rest : ""].filter(Boolean).join(" · "), e.dis && e.dis.oilVol ? "dis" : ex("oilVol"), "maslo"]);
  }
  if (real(e.spark) || /[A-Z]{1,4}\d/.test(String(e.spark || ""))) {
    const sp = String(e.spark).split(/\s*[\/(;,]/)[0].trim(), gap = real(e.gap) ? String(e.gap).split(/\s*\(/)[0] : "";
    if (sp) T.push(["Свеча", sp, gap ? "зазор " + gap : "", e.dis && e.dis.spark ? "dis" : ex("spark"), "svecha"]);
  }
  const vi = String(e.valveIn || "").match(RNG), ve = String(e.valveEx || "").match(RNG);
  if (e.stroke !== "2T" && vi && ve && /мм/.test(String(e.valveIn) + String(e.valveEx)))
    T.push(["Клапаны", vi[0].replace(/\s+/g, "") + " / " + ve[0].replace(/\s+/g, ""), e.dis && e.dis.note ? e.dis.note + " — мм, на холодном" : "впуск / выпуск, мм, на холодном", e.dis && (e.dis.valveIn || e.dis.valveEx) ? "dis" : ex("valveIn") && ex("valveEx"), "svecha", 1]);
  if (premix(e)) { const r = String(e.oil).match(/1\s*:\s*\d{2,3}/); if (r) T.push(["Смесь 2T", r[0].replace(/\s+/g, ""), "бензин : масло", false, "smes"]); }
  const fk = b ? ctx.forkShort(b) : null;
  if (fk && fk.vol) {
    const tot = fk.vol.match(/всего (\d+)\s*(см³|мл)/), ca = fk.vol.match(/картридж (\d+)/), ou = fk.vol.match(/наружная камера (\d+)/), one = fk.vol.match(/\d+(?:[.,]\d+)?(?:\s*±\s*\d+(?:[.,]\d+)?)?\s*(?:см³|мл)/);
    const big = tot ? tot[1] + " " + tot[2] : ca && ou ? ca[1] + " + " + ou[1] + " мл" : one ? one[0] : "";
    if (big) T.push(["Вилка, на перо", big, [String(fk.oil || "").split(/\s*\(/)[0], fk.n > 1 && fk.years ? fk.years : ""].filter(Boolean).join(" · "), true, "vilka"]);
  }
  if (e.cc) T.push(["Объём", Math.round(e.cc * 10) / 10 + " см³", (v.hp || e.hp) ? (v.hp || e.hp) + " л.с." : "", null, "motor"]);
  return T.map((t) => `<a class="tile k${t[5] ? " wide" : ""}" href="#${pfx}${t[4]}"><span>${t[0]}</span><b>${esc(t[1])}</b>${t[2] ? `<small>${esc(t[2])}</small>` : ""}${t[3] === true ? `<em class="src ok">✓ по мануалу</em>` : t[3] === "dis" ? `<em class="src">мануалы расходятся — сверь со своим</em>` : t[3] === false ? `<em class="src">типовое — сверь</em>` : ""}</a>`).join("");
}

const files = new Map(); // путь относительно корня → содержимое
const SEV = { high: "серьёзно", med: "важно", low: "мелочь" };
/* «Карбюратор побольше» — что ставят вместо заводского (CARB_UP в data.js, те же советы, что в разделе «Тюнинг» приложения) */
const carbUp = (e) => {
  const row = typeof ctx.carbUpFor === "function" ? ctx.carbUpFor(e) : null;
  if (!row) return null;
  const T = (id) => { const t = id && ctx.TUNING.find((x) => x.id === id); return t && ctx.tuningFor(t, e).ok ? t : null; };
  const spec = (t) => ctx.tuneCarbJets(t, e);
  const pr = (t) => (t.lo != null ? (t.lo === t.hi ? "" : t.lo.toLocaleString("ru-RU") + "–") + t.hi.toLocaleString("ru-RU") + " ₽" : "");
  const lad = (row.ladder || []).map(T).filter(Boolean), bore = T(row.bore), bc = bore && T(row.boreCarb);
  return { lad, up: T(row.up), bore, bc, row, spec, pr };
};
/* у мотора есть страница «Тюнинг»: карбюраторный, на 3+ моделях, есть что поставить (карбюратор побольше, бигбор или свап) */
const tuneEligible = (id) => { const e = ENGINES[id]; if (!e || (bikesOf[id] || []).length < 3 || (e.groups || []).indexOf("carb") < 0) return false;
  return !!ctx.carbUpFor(e) || ctx.TUNING.some((t) => /^(bore|swap)/.test(t.id) && ctx.tuningFor(t, e).ok); };
/* популярные модели со своей страницей «Тюнинг <модель>» (остальным хватает страницы тюнинга мотора) */
const MODEL_TUNE_KEYS = ["Kayo T2 250", "Kayo T4 250", "Kayo K1 250", "Kayo K2 250", "Motoland XT250 HS", "Motoland TT250", "Regulmoto Sport-003 PR", "Avantis Enduro 250 CARB ARS",
  "Progasi Super Max 250 RR", "BSE Z5 250", "Motoland XR250", "Motoland XR250 Lite", "Kayo K1 300", "Kayo T4 300", "Kayo K2 300", "Kayo T2 300 Enduro",
  "Kayo T6 300", "Kayo K6 300", "Kayo K6-R 300", "Kayo K5 300 Enduro", "Motoland XT300", "Motoland XT300 HS 21/18", "Regulmoto Crosstrec 300", "Progasi Endurance 300",
  "Sharmax PowerMax 300", "BSE Z7 300", "Progasi Race 300", "Avantis Enduro 300 PRO CARB", "Motoland XT300 HS", "Motoland XR300", "Kayo K1-L 300 MX",
  "Kayo K6 250", "Kayo T6 250 Enduro", "BSE M2 250", "Motoland WRX250 NC", "Kayo K6 300 FCR", "Motoland WRX300 NC", "BSE T9", "Regulmoto Nibbi 300",
  "Regulmoto Legend 300 PRO", "Motoland 300 Enduro GL300", "Motoland FX 300", "Regulmoto Fargo 300",
  "Kayo Basic 125", "Kayo TT125", "Kayo Classic 150", "Kayo TT140", "Kayo KT160", "Kayo Classic 190", "Motoland TT155", "Kayo TS155",
  "Motoland RZ200", "Racer Enduro RC200GY-C2", "Racer Enduro RC250GY-C2",
  "Motoland Alpha", "Racer Alpha", "Regulmoto Alpha 110", "Motoland Orion 110", "Motoland Delta 110", "Stels Delta",
  "Honda Dio AF34", "Honda Dio AF18", "Yamaha Jog Artistic 3YK", "Irbis Nirvana 50"];
const modelTuneHas = (b) => !!b && MODEL_TUNE_KEYS.indexOf(b.brand + " " + b.name) >= 0 && tuneEligible(b.versions[0].engine);
const carbUpHtml = (e, pfx, link) => {
  const c = carbUp(e);
  /* без «карбюратора побольше» (скутеры: тюнинг идёт через вариатор) — хотя бы ссылка на страницу тюнинга мотора */
  if (!c) return tuneEligible(e.id) ? `<h2 id="${pfx}tune">Тюнинг ${esc(e.code)}</h2><p>${(e.groups || []).indexOf("cvt") >= 0 ? "Ролики и пружины вариатора, снятие ограничителей, ЦПГ побольше и карбюратор под неё — с ценами и нюансами." : "Бигбор, карбюратор, выхлоп и зажигание — с ценами и нюансами."}</p><div class="chips"><a class="chip" href="/m/motor/${engSlug[e.id]}/tuning/">Весь тюнинг ${esc(e.code)} →</a></div>` : "";
  const card = (kick, t, note, price) => `<div class="cu-card"><span class="cu-kick">${kick}</span>${t ? `<b>${esc(t.title)}</b>` : ""}${t && t.eff ? `<span class="cu-eff">${esc(t.eff)}</span>` : ""}${t && c.spec(t) && !/главный/i.test(note) ? `<span class="cu-spec">${esc(c.spec(t))}</span>` : ""}<p>${esc(note)}</p>${price ? `<span class="cu-price">${esc(price)}</span>` : ""}</div>`;
  const borePrice = c.bore ? "цилиндр " + c.pr(c.bore) + (c.bc ? " + карбюратор " + c.pr(c.bc) : "") : "";
  return `<h2 id="${pfx}karb">Карбюратор побольше: что поставить вместо ${esc(e.carb)}</h2>${c.row.tip ? `<p class="note">${esc(c.row.tip)}</p>` : ""}<div class="cu">${c.lad.map((t, i) => card(c.lad.length > 1 ? "Вариант " + (i + 1) : "Резвее, мотор не вскрывать", t, t.body, c.pr(t))).join("")}${c.bore ? card("Мощнее — с бигбором: " + esc(c.bore.title), c.bc, c.row.boreNote, borePrice) : ""}</div>
${c.row.nuance && c.row.nuance.length ? `<ul class="cu-nu">${c.row.nuance.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<p class="note">Жиклёры после замены подбирают по свече: светло-коричневая — норма, белая — бедно и перегрев.${link ? ` <a href="${link}">Собрать тюнинг-проект под свой мотоцикл →</a>` : ""}</p>${tuneEligible(e.id) ? `<p><a class="chip" href="/m/motor/${engSlug[e.id]}/tuning/">Весь тюнинг ${esc(e.code)}: бигбор, выхлоп, зажигание →</a></p>` : ""}`;
};
const engShort = (b) => { const e = ENGINES[b.versions[0].engine]; return [e.code, e.cc ? e.cc + " см³" : "", (b.versions[0].hp || e.hp) ? (b.versions[0].hp || e.hp) + " л.с." : ""].filter(Boolean).join(" · "); };
/* витрина каталога: модели с фото — по одной-две от марки, чтобы были разные */
const showcase = () => {
  /* сначала самые продаваемые (флагманы и модели со страницами тюнинга), затем — с фото, по две-три от марки */
  const seen = {}, top = FLAGSHIP.concat(MODEL_TUNE_KEYS).map((n) => BIKES.find((b) => b.brand + " " + b.name === n)).filter((b, i, a) => b && a.indexOf(b) === i);
  const list = top.concat(BIKES.filter((b) => photoOf(b) && top.indexOf(b) < 0).sort((a, b) => COLL.compare(a.brand, b.brand) || COLL.compare(a.name, b.name))).filter((b) => (seen[b.brand] = (seen[b.brand] || 0) + 1) <= 3);
  return list.length ? `<h2>Популярные модели</h2><div class="grid models">${list.slice(0, 16).map((b) => modelCard(b, true)).join("")}</div>` : "";
};
const OFTEN = [["Масло и свечи Kayo T2 250", "/m/kayo-t2-250/"], ["Тюнинг мопеда Альфа", "/m/motoland-alpha/tuning/"], ["Тюнинг 172FMM: бигбор и карбюратор", "/m/motor/zs172fmm/tuning/"],
  ["Kayo T2 или Motoland TT250", "/m/sravnenie/motoland-tt250-vs-kayo-t2-250/"], ["Схема электрики питбайка без АКБ", "/m/provodka/ac/"], ["Какое масло заливать: таблица", "/m/maslo/"],
  ["Зазоры клапанов: таблица", "/m/klapany/"], ["Эндуро 250: какой выбрать", "/m/podborka/enduro-250/"], ["Не заводится питбайк", "/m/polomka/start/"], ["Регулировка клапанов", "/m/remont/valves/"]];
const oftenHtml = () => { const L = OFTEN.filter((x) => fs.existsSync(path.join(ROOT, x[1].slice(1), "index.html")));
  return L.length ? `<h2>Часто ищут</h2><div class="chips">${L.map((x) => `<a class="chip" href="${x[1]}">${esc(x[0])}</a>`).join("")}</div>` : ""; };
const modelCard = (b, withBrand) => { const ph = photoOf(b, true); return `<a class="card${ph ? " ph" : ""}" href="/m/${bikeSlug.get(b)}/" data-t="${esc(b.type)}">${ph ? `<img src="${ph}" alt="" loading="lazy" width="240" height="150">` : ""}<b>${esc((withBrand ? b.brand + " " : "") + b.name)}</b><small>${esc(b.type)} · ${esc(engShort(b))}</small></a>`; };


/* ===== моторы, инструкции, поломки: отдельные страницы под запросы «масло 172FMM», «зазоры клапанов», «не заводится» ===== */
const okEng = (only, e) => !only || only.some((x) => x === e.id || (e.groups || []).indexOf(x) >= 0);
const guidesOf = (e) => GUIDES.filter((g) => okEng(g.only, e) && !(e.cvt && NO_CVT.indexOf(g.id) >= 0) && ctx.guideOk(g, e));
const diagOf = (e) => DIAG.filter((d) => ctx.kbOk(d, e));
/* поломка → симптомы (js/kb.js SYMPTOMS): по весам причин (CAUSES.w) и их инструкциям (CAUSES.guide) — «Как починить» */
const DIAG_SYM = { start: ["nostart"], cold: ["hardcold", "coldnorev"], hot: ["hardhot"], idle: ["stallidle", "idle"], backfire: ["backfire", "popintake"],
  smoke: ["smokeblack", "smokeblue", "smokewhite", "smokecold"], knock: ["tick", "rattle", "knockbottom", "ping"], power: ["nopower", "notop"], overheat: ["overheat"],
  coolant: ["coolantloss", "coolantpush", "milkyoil"], efi: ["check"], clutch: ["clutchslip", "clutchdrag"], gears: ["jumpgear", "hardshift"], starter: ["nocrank", "starterspin"],
  electric: ["lights", "nolights"], brakes: ["brakesoft", "brakerear", "brakepulse", "brakedrag", "squeal"], suspension: ["forkleak", "forkbottom", "clunk", "suspsqueak"],
  plug: ["plugblack", "plugwhite", "plugwet"], "stall-gear": ["stallgear"], hesitate: ["hesitate", "misfire"], flooding: ["fuelsmell", "plugwet"], leak: ["oilleak", "oilconsume"],
  vibration: ["vibe", "wobble"], noneutral: ["clutchdrag"], charge: ["batdrain", "drainnight"], fuses: ["fusesblow"], kick: ["kickslip"], fan: ["overheat"], "fuel-use": ["fuelsmell"] };
const fixGuides = (d, e) => { const sc = {};
  (ctx.__C || []).forEach((c) => (DIAG_SYM[d.id] || []).forEach((k) => { if (c.guide && c.w && c.w[k]) sc[c.guide] = Math.max(sc[c.guide] || 0, c.w[k]); }));
  return Object.keys(sc).sort((a, b) => sc[b] - sc[a]).map((id) => GUIDES.find((g) => g.id === id)).filter((g) => g && (!e || guidesOf(e).indexOf(g) >= 0)).slice(0, 6); };
const fixHtml = (d, e) => { const L = fixGuides(d, e); return L.length ? `<h2>Как починить</h2><div class="chips">${L.map((g) => `<a class="chip" href="/m/remont/${g.id}/">${esc(g.title)}</a>`).join("")}</div>` : ""; };
const KEY_GUIDES = ["oil", "valves", "valves-dohc", "valves-screw", "spark", "carb-tune", "carb-clean", "chain"];
const bikesOf = {}; // мотор → модели
BIKES.forEach((b) => b.versions.forEach((v) => { const l = (bikesOf[v.engine] = bikesOf[v.engine] || []); if (l.indexOf(b) < 0) l.push(b); }));
const engIds = Object.keys(bikesOf).sort((a, b) => COLL.compare(ENGINES[a].code, ENGINES[b].code));
const engSlug = {}, usedE = {};
engIds.forEach((id) => { let x = slugify(ENGINES[id].code), i = 2; const b0 = x; while (usedE[x]) x = b0 + "-" + i++; usedE[x] = 1; engSlug[id] = x; });
const dupCode = {};
engIds.forEach((id) => (dupCode[ENGINES[id].code] = (dupCode[ENGINES[id].code] || 0) + 1));
const popular = engIds.slice().sort((a, b) => bikesOf[b].length - bikesOf[a].length);
const CMP_BRANDS = ["Motoland", "Kayo", "Regulmoto", "BSE", "Avantis", "Progasi", "Racer", "Irbis", "Stels", "Sharmax", "Apollo", "JHL", "Kove", "CFMOTO"];
/* марки, по которым много поисковых запросов «не заводится / глохнет …» — им страницы поломок по моделям тоже */
const PROB_BRANDS = CMP_BRANDS.concat(["Kews", "Zuumav", "Fuego", "Motax", "Hasky", "GR7", "Kovi", "Ataki", "Promax", "Xmotos", "Tekken", "Zontes", "Voge", "Minsk", "Минск"]);
const FLAGSHIP = ["Motoland TT250", "Kayo T2 250", "Regulmoto Sport-003 PR", "Avantis Enduro 250", "Progasi Super Max 250 RR", "BSE Z8", "Kayo K1 300", "Regulmoto Athlete 300", "Avantis A7 NEW", "Motoland TT125", "BSE PH10 125"];
/* «модель + поломка»: /m/<модель>/<поломка>/ — шаги проверки с цифрами именно этого мотора (свеча, зазоры, ХХ).
   Только популярные модели: флагманы и по 4 базовые модели каждой марки из CMP_BRANDS на 30 самых частых моторах,
   иначе страниц с одинаковым мотором было бы слишком много. */
const PROB = { start: "{M} не заводится", cold: "{M} глохнет на холодную", hot: "{M} глохнет на горячую", idle: "{M} не держит холостые", smoke: "{M} дымит",
  knock: "Стучит мотор {M}", power: "{M} не тянет", overheat: "{M} перегревается", "stall-gear": "{M} глохнет при включении передачи", charge: "На {M} садится аккумулятор" };
const probBikes = new Set(BIKES.filter((b) => FLAGSHIP.indexOf(b.brand + " " + b.name) >= 0));
/* частые моторы — те, что стоят хотя бы на 10 моделях. Порог, а не «первые 40»: при пополнении базы рейтинг сдвигается,
   и страницы «модель + поломка» у моделей на моторе, выпавшем из топа, пропадали бы из поиска. С порогом они только добавляются */
const topE = new Set(popular.filter((id) => bikesOf[id].length >= 10));
PROB_BRANDS.forEach((br) => BIKES.filter((b) => b.brand === br && topE.has(b.versions[0].engine)).sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name)).slice(0, CMP_BRANDS.indexOf(br) >= 0 ? 8 : 4).forEach((b) => probBikes.add(b)));
/* страницы, которые уже есть (в репозитории), не убираем: новая модель может вытеснить старую из «первых 4 / 8 марки»,
   а удалённая страница выпадает из поиска. Пропадают они, только если модель убрали из базы */
BIKES.forEach((b) => { if (fs.existsSync(path.join(OUT, bikeSlug.get(b), "start", "index.html"))) probBikes.add(b); });
// первая буква строчная, остальное как есть: «Слишком жирная смесь 2T» → «слишком жирная смесь 2T»
const lc1 = (t) => (/^[А-ЯЁ][а-яё]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const probsFor = (b) => { const e = ENGINES[b.versions[0].engine]; return DIAG.filter((d) => PROB[d.id] && ctx.kbOk(d, e)); };
/* «модель + поломка» на одном моторе — почти одинаковые страницы (шаги и цифры общие). Для мотора, на котором 2+ таких модели,
   главная страница — «ZS172FMM не заводится: Kayo T2 250, Motoland TT250…» (/m/motor/<мотор>/<поломка>/): в её заголовке
   названия моделей, а страницы моделей остаются для людей, но canonical указывает на неё — поиск не делит вес между копиями */
const PROB_RANK = (b) => { const f = FLAGSHIP.indexOf(b.brand + " " + b.name), c = CMP_BRANDS.indexOf(b.brand); return (f >= 0 ? f : 50) * 100 + (c >= 0 ? c : 60); };
const PROB_GROUP = {};
[...probBikes].sort((a, b) => PROB_RANK(a) - PROB_RANK(b) || COLL.compare(a.brand + " " + a.name, b.brand + " " + b.name)).forEach((b) => (PROB_GROUP[b.versions[0].engine] = PROB_GROUP[b.versions[0].engine] || []).push(b));
const engProbUrl = (id, did) => (PROB_GROUP[id] && PROB_GROUP[id].length >= 2 && engSlug[id] ? "/m/motor/" + engSlug[id] + "/" + did + "/" : "");
/* «1E6 / 583 — Yamaha XT500 (воздушный)», а не «… (Yamaha XT500 (воздушный))»: без скобок внутри скобок */
const engTitle = (e) => e.code + (e.name && e.name.indexOf(e.code) < 0 ? (/[()]/.test(e.name + e.code) ? " — " + e.name : " (" + e.name + ")") : "");
/* значения в шагах ({valveIn}, {spark}…) свои у каждого мотора: в тексте — название, ниже — таблица по популярным моторам */
const PH = { valveIn: "зазор впуска", valveEx: "зазор выпуска", spark: "свеча", gap: "зазор свечи", idle: "обороты ХХ", jetMain: "главный жиклёр", jetPilot: "жиклёр ХХ",
  oil: "масло", oilVol: "объём масла", sparkTorque: "момент затяжки свечи", compression: "компрессия", coolant: "антифриз", needle: "положение иглы", fuel: "топливо",
  valveInt: "интервал проверки клапанов", cooling: "охлаждение", ignition: "зажигание", hp: "мощность", name: "мотор" };
/* в тексте шага — короткая отсылка к таблице («Залей нужное масло — объём по таблице»), без таблицы — «по мануалу» */
const PHI = { valveIn: "по таблице", valveEx: "по таблице", spark: "нужной марки", gap: "зазор по таблице", idle: "по таблице", jetMain: "по таблице", jetPilot: "по таблице",
  oil: "нужное масло", oilVol: "объём по таблице", sparkTorque: "момент по таблице", compression: "норма по таблице", coolant: "по таблице", needle: "по таблице", fuel: "по таблице" };
/* подстановка вместо {gap}, {oilVol}…: если в тексте перед ней уже стоит то же слово («зазор {gap}»), его не повторяем —
   «зазор по таблице», а не «зазор зазор по таблице»; пара «{valveIn} / {valveEx}» — одно «по таблице» */
const phVal = (k, inTable, t, off) => { const v = inTable && inTable.indexOf(k) >= 0 ? PHI[k] || "по таблице" : "по мануалу";
  const prev = ((t.slice(Math.max(0, off - 20), off).match(/([А-Яа-яЁё]+)[\s:]*$/) || [])[1] || "").toLowerCase(), first = v.split(" ")[0];
  return v.indexOf(" ") > 0 && prev && prev === first.toLowerCase() ? v.slice(first.length + 1) : v; };
const phPair = (t) => t.replace(/\{valveIn\}\s*\/\s*\{valveEx\}/g, "{valveIn}");
const phPlain = (t, inTable) => { const x = phPair(String(t)); return x.replace(/\{(\w+)\}/g, (m, k, off) => phVal(k, inTable, x, off)); };
const phText = (t, inTable) => { const x = esc(phPair(String(t))); return x.replace(/\{(\w+)\}/g, (m, k, off) => `<span class="ph">${phVal(k, inTable, x, off)}</span>`); };
const phKeys = (texts) => [...new Set(texts.join(" ").match(/\{(\w+)\}/g) || [])].map((x) => x.slice(1, -1)).filter((k) => PH[k] && k !== "name");
function valuesTable(keys, okFn) {
  keys = keys.filter((k) => ["cooling", "ignition", "hp", "valveInt"].indexOf(k) < 0).slice(0, 6);
  const none = { html: "", keys: [] };
  if (!keys.length) return none;
  const rows = popular.filter((id) => okFn(ENGINES[id]) && keys.some((k) => ENGINES[id][k] && ENGINES[id][k] !== "—")).slice(0, 15);
  if (!rows.length) return none;
  return { keys, html: `<h2>Значения для популярных моторов</h2><p class="note">Подчёркнутое в шагах — своё у каждого мотора. Нет твоего в таблице — найди его в <a href="/m/motor/">списке моторов</a> или выбери мотоцикл в приложении.</p>
<div class="tblw"><table class="tbl"><tr><th>Мотор</th>${keys.map((k) => `<th>${PH[k]}</th>`).join("")}</tr>${rows.map((id) => { const e = ENGINES[id];
    return `<tr><td><a href="/m/motor/${engSlug[id]}/">${esc(e.code)}</a></td>${keys.map((k) => `<td>${esc(e[k] && e[k] !== "—" ? e[k] : "—")}</td>`).join("")}</tr>`; }).join("")}</table></div>` };
}

/* ===== подборки (тип + объём) и сравнения популярных моделей одного класса — только по данным базы ===== */
const CC_CLS = (cc) => (cc <= 55 ? 50 : cc <= 75 ? 70 : cc <= 115 ? 110 : cc <= 135 ? 125 : cc <= 165 ? 150 : cc <= 215 ? 200 : cc <= 265 ? 250 : cc <= 320 ? 300 : cc <= 480 ? 450 : cc <= 700 ? 600 : cc <= 950 ? 900 : 1200);
const TYPE_MANY = { "Эндуро": "Эндуро", "Питбайк": "Питбайки", "Мопед": "Мопеды", "Скутер": "Скутеры", "Мотард": "Мотарды", "Кросс-эндуро": "Кросс-эндуро", "Тур-эндуро": "Тур-эндуро", "Лёгкий эндуро": "Лёгкие эндуро", "Спорт": "Спортбайки", "Нейкед": "Нейкеды", "Чоппер": "Чопперы", "Классика": "Классические мотоциклы", "Турер": "Туреры", "Триал": "Триал" };
const hpOf = (b, v) => Number(v.hp || ENGINES[v.engine].hp) || 0;
const groups = {};
BIKES.forEach((b) => { const e = ENGINES[b.versions[0].engine]; if (!e.cc) return; const k = b.type + "|" + CC_CLS(e.cc); (groups[k] = groups[k] || []).push(b); });
const podSlug = {};
const podKeys = Object.keys(groups).filter((k) => groups[k].length >= 5).sort((a, b) => groups[b].length - groups[a].length);
podKeys.forEach((k) => { const [t, c] = k.split("|"); podSlug[k] = slugify(t) + "-" + c; });
const podName = (k) => { const [t, c] = k.split("|"); return (TYPE_MANY[t] || t) + " " + c + " см³"; };
/* сравнения: в классе (тип + объём) по одной модели от популярной марки — та, у которой больше поколений; до 6 марок, все пары */
const compareByGroup = {}, compares = [];
/* самые продаваемые модели — в сравнениях их класса они выбираются первыми */
/* модели, у которых уже есть страницы сравнений (в репозитории), при прочих равных остаются в сравнениях:
   новая модель марки с более коротким названием не должна вытеснять их — иначе старые страницы пропали бы из поиска */
const OLD_CMP = new Set();
try { fs.readdirSync(path.join(OUT, "sravnenie"), { withFileTypes: true }).filter((d) => d.isDirectory()).forEach((d) => d.name.split("-vs-").forEach((x) => OLD_CMP.add(x))); } catch (e) {}
Object.keys(groups).forEach((k) => {
  const pick = {};
  groups[k].filter((b) => CMP_BRANDS.indexOf(b.brand) >= 0).forEach((b) => { const p = pick[b.brand]; const fl = (x) => FLAGSHIP.indexOf(x.brand + " " + x.name) >= 0;
    const st = (x) => (OLD_CMP.has(bikeSlug.get(x)) ? 1 : 0);
    if (!p || fl(b) > fl(p) || (fl(b) === fl(p) && (st(b) > st(p) || (st(b) === st(p) && (b.versions.length > p.versions.length || (b.versions.length === p.versions.length && b.name.length < p.name.length)))))) pick[b.brand] = b; });
  const reps = Object.values(pick).sort((a, b) => CMP_BRANDS.indexOf(a.brand) - CMP_BRANDS.indexOf(b.brand)).slice(0, 6);
  for (let i = 0; i < reps.length; i++) for (let j = i + 1; j < reps.length; j++) {
    const c = { a: reps[i], b: reps[j], k, slug: bikeSlug.get(reps[i]) + "-vs-" + bikeSlug.get(reps[j]), title: reps[i].brand + " " + reps[i].name + " или " + reps[j].brand + " " + reps[j].name };
    compares.push(c); (compareByGroup[k] = compareByGroup[k] || []).push(c);
  }
});
/* перелинковка моделей: соседи по алфавиту внутри марки (а не первые 12 — иначе весь вес у одних и тех же),
   похожие модели других марок того же класса (тип + объём) — ближайшие по мощности, сравнения с участием модели */
const SIB = {};
brands.forEach((br) => (SIB[br] = BIKES.filter((x) => x.brand === br).sort((x, y) => COLL.compare(x.name, y.name))));
const neighbours = (b) => { const sib = SIB[b.brand] || [], i0 = sib.indexOf(b), n = sib.length;
  return n <= 13 ? sib.filter((x) => x !== b) : [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6].map((d) => sib[(i0 + d + n) % n]); };
const clsKey = (b) => { const e = ENGINES[b.versions[0].engine]; return e.cc ? b.type + "|" + CC_CLS(e.cc) : ""; };
const BY_HP = {};
Object.keys(groups).forEach((k) => (BY_HP[k] = groups[k].slice().sort((x, y) => hpOf(x, x.versions[0]) - hpOf(y, y.versions[0]) || COLL.compare(x.brand + " " + x.name, y.brand + " " + y.name))));
const similar = (b, skip) => { const k = clsKey(b), L = BY_HP[k] || [], j = L.indexOf(b), out = [];
  for (let d = 1; out.length < 8 && d < L.length; d++) [L[j - d], L[j + d]].forEach((x) => { if (x && x.brand !== b.brand && skip.indexOf(x) < 0 && out.length < 8) out.push(x); });
  return out; };
const CMP_OF = new Map();
compares.forEach((c) => [c.a, c.b].forEach((x) => { if (!CMP_OF.has(x)) CMP_OF.set(x, []); CMP_OF.get(x).push(c); }));
/* свечи: страницы «Свеча NGK <код>: аналоги и на каких мотоциклах» — по таблице аналогов SPARK_X (js/data.js) */
const SPARK_CODES = Object.keys(ctx.SPARK_X || {});
const sparkRe = (k) => new RegExp("(^|[^A-Z0-9])" + k.replace(/-/g, "\\-") + "([^A-Z0-9-]|$)");
const sparkOf = (e) => { const sp = String(e.spark || "").toUpperCase(); return SPARK_CODES.filter((k) => { const x = ctx.SPARK_X[k]; return sparkRe(k).test(sp) || (x[0] && sparkRe(x[0]).test(sp)) || (x[1] && sparkRe(x[1]).test(sp)); }); };
const SPARK_ENG = {};
engIds.forEach((id) => sparkOf(ENGINES[id]).forEach((k) => (SPARK_ENG[k] = SPARK_ENG[k] || []).push(id)));
const sparkSlug = (k) => "ngk-" + slugify(k);
/* расходники по номеру (HiFlo, K&N, EBC, Yuasa) — страницы «на какие мотоциклы подходит» для номеров, что стоят на 3+ моделях */
const CONS_KIND = { oil: ["Масляный фильтр", "HiFlo", "hiflo"], air: ["Воздушный фильтр", "K&N", "kn"], pf: ["Тормозные колодки", "EBC", "ebc"], pr: ["Тормозные колодки", "EBC", "ebc"], pads: ["Тормозные колодки", "EBC", "ebc"], bat: ["Аккумулятор", "Yuasa", "yuasa"] };
const CONS = {};
Object.keys(ctx.CROSS || {}).forEach((name) => { const b = BIKES.find((x) => x.brand + " " + x.name === name); if (!b) return;
  (ctx.CROSS[name] || []).forEach((r) => Object.keys(r).forEach((f) => { if (!CONS_KIND[f]) return; [].concat(r[f]).forEach((code) => { if (!code || /^OEM\b/i.test(code)) return;
    const key = CONS_KIND[f][2] + "-" + slugify(code), x = (CONS[key] = CONS[key] || { key, code, kind: f, rows: [] });
    x.rows.push({ b, y: r.y || "", where: f === "pf" ? "перед" : f === "pr" ? "зад" : "" }); }); })); });
const CONS_PAGES = Object.values(CONS).filter((x) => new Set(x.rows.map((r) => r.b)).size >= 3);
const consOf = (b) => CONS_PAGES.filter((x) => x.rows.some((r) => r.b === b));
const consChips = (b) => consOf(b).map((x) => `<a class="chip" href="/m/rashodnik/${x.key}/">${esc(CONS_KIND[x.kind][1] + " " + x.code)}: на какие ещё мотоциклы →</a>`).join("");
const sparkChips = (e) => sparkOf(e).filter((k) => SPARK_ENG[k]).map((k) => `<a class="chip" href="/m/svecha/${sparkSlug(k)}/">Свеча NGK ${esc(k)}: аналоги →</a>`).join("");
const WIRE_ANCHOR = { ac: "Схема электрики без АКБ (AC-CDI)", dc: "Схема электрики с АКБ (DC-CDI)", efi: "Схема электрики инжектора (ЭБУ)", points: "Схема контактного зажигания" };
/* подпись поломки без названия модели: «На {M} садится аккумулятор» → «Садится аккумулятор» */
const PROB_SHORT = { charge: "Садится аккумулятор", knock: "Стучит мотор" };
const probShort = (id) => PROB_SHORT[id] || PROB[id].replace("{M} ", "").replace(" {M}", "").replace(/^./, (c) => c.toUpperCase());
BIKES.forEach((b) => {
  const slug = bikeSlug.get(b), canon = SITE + "m/" + slug + "/";
  const full = b.brand + " " + b.name;
  const e0 = ENGINES[b.versions[0].engine];
  const two0 = e0.stroke === "2T", cvt0 = (e0.groups || []).indexOf("cvt") >= 0, jet0 = (e0.groups || []).indexOf("carb") >= 0 ? "жиклёры" : "ТО";
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], [b.brand, "/m/" + brandSlug[b.brand] + "/"], [b.name, null]];
  const vers = b.versions.map((v, vi) => {
    const e = ENGINES[v.engine];
    const head = b.versions.length > 1 ? `<h2>${esc(verName(v, vi, e))}</h2>` : "";
    const approx = v.approx ? `<p class="note">≈ Мотор подобран по похожей модели — сверь код на картере.</p>` : "";
    const pfx = b.versions.length > 1 ? "v" + (vi + 1) + "-" : "";
    const cross = vi === 0 && ctx.crossRows(b).length > 0;
    const groups = (head ? "" : `<h2 class="vh">Характеристики и ТО</h2>`) + garageGroups(e, v, b, pfx, cross, vi === 0);
    const iss = weak(e).length ? `<h2 id="${pfx}slabye">Слабые места</h2><ul class="iss">${weak(e).map((x) => `<li class="${x.sev}"><span class="sev">${SEV[x.sev] || ""}</span><b>${esc(x.t)}</b>${esc(x.fix)}</li>`).join("")}</ul>` : "";
    const keyG = guidesOf(e).filter((g) => KEY_GUIDES.indexOf(g.id) >= 0);
    const more = `<div class="chips"><a class="chip" href="/m/motor/${engSlug[v.engine]}/">Всё о моторе ${esc(e.code)} →</a>${sparkChips(e)}<a class="chip" href="/m/provodka/${ctx.wiringType(e)}/">${WIRE_ANCHOR[ctx.wiringType(e)] || "Схема электрики"}</a>${keyG.map((g) => `<a class="chip" href="/m/remont/${g.id}/">${esc(g.title)}</a>`).join("")}</div>`;
    return `<section class="ver">${head}<div class="tiles">${cheat(e, v, pfx, vi === 0 ? b : null)}</div>${jumpNav(e, pfx, weak(e).length, cross, buyItems(e, cross ? b : null).length > 0, vi === 0)}${toolsNav(e, appLink(b, vi))}${approx}${groups}${iss}${carbUpHtml(e, pfx, appLink(b, vi) + "&r=tune")}${vi === 0 && consOf(b).length ? `<div class="chips">${consChips(b)}</div>` : ""}${vi === 0 && modelTuneHas(b) ? `<div class="chips"><a class="chip" href="/m/${slug}/tuning/">Тюнинг ${esc(full)} по шагам: резвее, мощнее, быстрее →</a></div>` : ""}${more}
<a class="cta" href="${appLink(b, vi)}">Ремонт, запчасти и ИИ-механик для ${esc(full)} →</a><div class="chips"><a class="chip" href="${appLink(b, vi)}&amp;add=1">☆ Сохранить ${esc(b.versions.length > 1 ? full + " (" + verName(v, vi, e) + ")" : full)} в гараж — журнал ТО и напоминания</a></div></section>`;
  }).join("\n");
  const others = neighbours(b);
  // модели других марок на том же моторе: запчасти и советы у них общие — и перелинковка каталога
  const twins = (bikesOf[b.versions[0].engine] || []).filter((x) => x !== b && x.brand !== b.brand && x.brand !== "Любая модель").slice(0, 10);
  const ck = clsKey(b), sim = similar(b, twins), myCmp = CMP_OF.get(b) || [];
  /* вопрос-ответ: то, что спрашивают в поиске («какое масло в Kayo T2») — видимым блоком и разметкой FAQPage */
  const v0 = b.versions[0], multi = b.versions.length > 1 ? " (" + verName(v0, 0, e0) + ")" : "";
  const okv = (x) => x && x !== "—" && !/мануал/i.test(x);
  const dot = (t) => (/[.!?]$/.test(t) ? t : t + ".");
  const lc = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const faq = [
    okv(e0.oil) && ["Какое масло заливать в " + full + "?", e0.oil + (okv(e0.oilVol) ? ", объём " + e0.oilVol : "") + (e0.oilInt ? ". Замена " + kmh(e0.oilInt, e0, b).replace(/\u00a0/g, " ") : "") + multi],
    okv(e0.spark) && ["Какая свеча на " + full + "?", e0.spark + (okv(e0.gap) ? ", зазор " + e0.gap : "") + multi],
    valveFaq(e0, full, multi),
    ["Какой мотор стоит на " + full + "?", (e0.name && e0.name.indexOf(e0.code) >= 0 ? e0.name : e0.code + (e0.name ? " (" + e0.name + ")" : "")) + (e0.cc ? ", " + Math.round(e0.cc) + " см³" : "") + ((v0.hp || e0.hp) ? ", " + (v0.hp || e0.hp) + " л.с." : "") + multi],
    weak(e0).length && ["Какие слабые места у " + full + "?", weak(e0).slice(0, 3).map((x) => x.t + (x.fix ? " — " + lc(x.fix.replace(/\.$/, "")) : "")).join("; ")],
  ].filter(Boolean).map((q) => [q[0], dot(q[1])]);
  const faqHtml = `<h2>Частые вопросы</h2><div class="faq">${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join("")}</div>`;
  const ru = BRAND_RU[b.brand], fullRu = ru ? ru + " " + b.name : "";
  const body = `<section class="hero"><div class="kick">${esc(b.brand)}${ru ? " (" + esc(ru) + ")" : ""} · ${esc(b.type)}</div><h1>${esc(full)}</h1>
<p class="lead">Мотор ${esc(e0.code)}${e0.cc ? ", " + e0.cc + " см³" : ""}${e0.hp ? ", " + (b.versions[0].hp || e0.hp) + " л.с" : ""}. ${two0 ? (cvt0 ? "Какое масло 2T и в редуктор" : "Какое масло 2T и в коробку") + ", свеча, " + jet0 + " и слабые места" : "Какое масло и сколько, свеча, зазоры клапанов" + (jet0 === "жиклёры" ? ", жиклёры" : "") + " и слабые места"}${b.versions.length > 1 ? " — по поколениям" : ""}.</p>
${b.versions.length > 1 ? `<div class="chips">${b.versions.map((v, vi) => `<span class="chip">${esc(verName(v, vi, ENGINES[v.engine]))}</span>`).join("")}</div>` : ""}${b.aka && b.aka.length ? (b.versions.length > 1 ? `<p class="note">У продавцов эта модель называется по-разному: ${esc(b.aka.map((n) => b.brand + " " + n).join(", "))}. Это одна машина — версии отличаются только мотором.</p>` : `<p class="note">Также продаётся как: ${esc(b.aka.join(", "))}.</p>`) : ""}${photoOf(b) ? `<figure class="mphoto"><img src="${photoOf(b)}" alt="${esc(full)}" width="800" height="500" fetchpriority="high">${(ctx.__PC || {})[b.brand + " " + b.name] ? `<figcaption><a href="${esc(ctx.__PC[b.brand + " " + b.name][1])}" target="_blank" rel="noopener nofollow">Фото: ${esc(ctx.__PC[b.brand + " " + b.name][0])} · Wikimedia Commons</a></figcaption>` : ""}</figure>` : ""}</section>
${vers}
${probBikes.has(b) ? `<h2>Частые поломки ${esc(full)}</h2><div class="chips">${probsFor(b).map((d) => `<a class="chip" href="/m/${slug}/${d.id}/">${esc(probShort(d.id))}</a>`).join("")}</div>` : ""}
${probBikes.has(b) ? "" : `<h2>Если ${esc(full)} не заводится, глохнет или дымит</h2><div class="chips">${probsFor(b).slice(0, 8).map((d) => `<a class="chip" href="/m/polomka/${d.id}/">${esc(probShort(d.id))}</a>`).join("")}</div>`}
${faqHtml}
${myCmp.length ? `<h2>Сравнения ${esc(full)}</h2><div class="chips">${myCmp.map((c) => `<a class="chip" href="/m/sravnenie/${c.slug}/">${esc(c.title)}</a>`).join("")}</div>` : ""}
<p class="small">Сравнить с другими моторами: <a href="/m/maslo/">масло — таблица</a> · <a href="/m/svechi/">свечи — таблица</a>${two0 ? "" : ` · <a href="/m/klapany/">зазоры клапанов — таблица</a>`}</p>
${fbBlock(full, e0.code, two0 ? ["Масло", "Объём масла в КПП / редуктор", "Свеча", jet0 === "жиклёры" ? "Карбюратор и жиклёры" : "Инжектор", "Мотор", "Мощность"] : ["Масло", "Объём масла", "Свеча", "Зазоры клапанов", jet0 === "жиклёры" ? "Карбюратор и жиклёры" : "Инжектор", "Мотор", "Мощность"])}
${twins.length ? `<h2>Этот же мотор ${esc(e0.code)} стоит на</h2><div class="chips">${twins.map((x) => `<a class="chip" href="/m/${bikeSlug.get(x)}/">${esc(x.brand + " " + x.name)}</a>`).join("")}</div><p><a class="chip" href="/m/motor/${engSlug[b.versions[0].engine]}/">Всё о моторе ${esc(e0.code)} →</a></p>` : ""}
${sim.length ? `<h2>Похожие на ${esc(full)}: ${esc(podName(ck).charAt(0).toLowerCase() + podName(ck).slice(1))} других марок</h2><div class="grid models">${sim.map((x) => modelCard(x, true)).join("")}</div>` : ""}${podSlug[ck] ? `<p><a class="chip" href="/m/podborka/${podSlug[ck]}/">Все ${esc(podName(ck).toLowerCase())} в одной таблице: какой выбрать →</a></p>` : ""}
${rvBlock(slug, full, b.name)}
${others.length ? `<h2>Другие модели ${esc(b.brand)}</h2><div class="grid models">${others.map((x) => modelCard(x)).join("")}</div><p><a class="chip" href="/m/${brandSlug[b.brand]}/">Все ${SIB[b.brand].length} ${plural(SIB[b.brand].length, "модель", "модели", "моделей")} ${esc(b.brand)} →</a></p>` : ""}`;
  const desc = `${full}: мотор ${e0.code}${e0.cc ? (/[()]/.test(e0.code) ? ", " : " (") + e0.cc + " см³" + (e0.hp ? ", " + (b.versions[0].hp || e0.hp) + " л.с." : "") + (/[()]/.test(e0.code) ? "" : ")") : ""}, масло ${two0 ? (briefOil(e0.oil) || "2T").replace(/^масло\s+/i, "").replace(/2T\s+масло(?![а-яё])/gi, "2T") + (e0.oilVol && /\d/.test(e0.oilVol) ? ", " + ((v) => /редуктор|КПП|коробк/i.test(v) ? v : (cvt0 ? "в редуктор " : "в КПП ") + v)(brief(e0.oilVol).split(",")[0]) : "") : (briefOil(e0.oil) || "—") + (e0.oilVol && /\d/.test(e0.oilVol) ? " " + brief(e0.oilVol).split(",")[0] : "")}, свеча ${brief(e0.spark).split(" / ")[0] || "—"}${briefValves(e0.valveIn, e0.valveEx) ? ", зазоры клапанов " + briefValves(e0.valveIn, e0.valveEx) : ""}. Слабые места и ремонт.`;
  const descRu = fullRu ? desc.replace(full + ":", /[()]/.test(full) ? full + " / " + fullRu + ":" : full + " (" + fullRu + "):") : desc;
  files.set("m/" + slug + "/index.html", page({ rv: true, fb: true, image: ogOf(b), ask: full + " (мотор " + e0.code + ")", title: pickTitle(full, two0 ? [...(fullRu ? [" (" + ru + ") — масло 2T, свеча, " + jet0 + ", слабые места", " (" + ru + ") — масло 2T, свеча, " + jet0] : []), " — масло 2T, свеча, " + jet0 + ", слабые места | MotoHelper", " — масло 2T, свеча, " + jet0 + ", слабые места", " — масло 2T, свеча, " + jet0, ": масло 2T, свеча"] : [...(fullRu ? [" (" + ru + ") — масло, свечи, зазоры клапанов, слабые места", " (" + ru + ") — масло, свечи, зазоры клапанов"] : []), " — масло, свечи, зазоры клапанов, слабые места | MotoHelper", " — масло, свечи, зазоры клапанов, слабые места", " — масло, свечи, зазоры клапанов", ": масло, свечи, клапаны"]), desc: descRu, canon, crumbs, body, sticky: appLink(b, 0),
    ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: full, alternateName: fullRu || undefined, url: canon, inLanguage: "ru", description: descRu },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }] }));
});

brands.forEach((br) => {
  const list = BIKES.filter((b) => b.brand === br).sort((a, b) => COLL.compare(a.name, b.name));
  const types = [...new Set(list.map((b) => b.type))];
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], [br, null]];
  const body = `<section class="hero"><div class="kick">Каталог · марка${BRAND_RU[br] ? " · " + esc(BRAND_RU[br]) : ""}</div><h1>${esc(br)}</h1><p class="lead">${list.length} ${plural(list.length, "модель", "модели", "моделей")}: мотор, масло, свечи, зазоры клапанов и слабые места.</p>
${types.length > 1 ? `<div class="chips"><button class="chip on" data-f="*">Все</button>${types.map((t) => `<button class="chip" data-f="${esc(t)}">${esc(t)}</button>`).join("")}</div>` : ""}</section>
<div class="grid models">${list.map((b) => modelCard(b)).join("")}</div>
${(() => { const ks = podKeys.filter((k) => groups[k].some((b) => b.brand === br)); return ks.length ? `<h2>Подборки с моделями ${esc(br)}</h2><div class="chips">${ks.map((k) => `<a class="chip" href="/m/podborka/${podSlug[k]}/">${esc(podName(k))}: какой выбрать</a>`).join("")}</div>` : ""; })()}
${(() => { const cs = compares.filter((c) => c.a.brand === br || c.b.brand === br); return cs.length ? `<h2>Сравнения ${esc(br)}</h2><div class="chips">${cs.slice(0, 24).map((c) => `<a class="chip" href="/m/sravnenie/${c.slug}/">${esc(c.title)}</a>`).join("")}</div>` : ""; })()}
${(() => { const ts = list.filter((b) => modelTuneHas(b)); return ts.length ? `<h2>Тюнинг ${esc(br)}</h2><div class="chips">${ts.map((b) => `<a class="chip" href="/m/${bikeSlug.get(b)}/tuning/">Тюнинг ${esc(br + " " + b.name)}</a>`).join("")}</div>` : ""; })()}
${(() => { const n = {}; list.forEach((b) => b.versions.forEach((v) => (n[v.engine] = (n[v.engine] || 0) + 1))); const es = Object.keys(n).filter((id) => engSlug[id]).sort((a, b) => n[b] - n[a]).slice(0, 8);
  return es.length ? `<h2>Моторы ${esc(br)}</h2><div class="chips">${es.map((id) => `<a class="chip" href="/m/motor/${engSlug[id]}/">${esc(ENGINES[id].code)} — масло, свеча, клапаны</a>`).join("")}</div>` : ""; })()}`;
  files.set("m/" + brandSlug[br] + "/index.html", page({ title: `${br}${BRAND_RU[br] ? " (" + BRAND_RU[br] + ")" : ""}: все модели — масло, свечи, моторы | MotoHelper`, desc: `Справочник по мотоциклам ${br}${BRAND_RU[br] ? " (" + BRAND_RU[br] + ")" : ""}: ${list.slice(0, 6).map((b) => b.name).join(", ")} и другие — мотор, масло, свечи, зазоры клапанов, слабые места.`,
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
<div class="grid" style="margin-bottom:14px"><a class="card big" href="/m/polomka/"><b>Неисправности</b></a><a class="card big" href="/m/remont/"><b>Инструкции</b></a><a class="card big" href="/m/motor/"><b>Моторы</b></a><a class="card big" href="/m/tuning/"><b>Тюнинг по моторам</b></a><a class="card big" href="/m/provodka/"><b>Схемы электрики</b></a><a class="card big" href="/m/maslo/"><b>Масло по моторам</b></a><a class="card big" href="/m/svechi/"><b>Свечи и аналоги</b></a><a class="card big" href="/m/rashodnik/"><b>Расходники по номерам</b></a><a class="card big" href="/m/klapany/"><b>Зазоры клапанов</b></a><a class="card big" href="/m/podborka/"><b>Подборки</b></a><a class="card big" href="/m/sravnenie/"><b>Сравнения</b></a></div>
<div class="search">${SEARCH_ICON}<input id="q" type="search" placeholder="Найти модель: «Kayo T2», «CRF250», «174»" autocomplete="off" aria-label="Поиск модели" /></div>
<div id="res" class="grid models res"></div>
${showcase()}
${oftenHtml()}
<h2>Популярные марки</h2><div class="grid">${pop.map((br) => `<a class="card big" href="/m/${brandSlug[br]}/"><b>${esc(br)}</b><span class="n">${count(br)}</span></a>`).join("")}</div>
<h2>Все марки</h2>${Object.keys(byLetter).map((l, i, ls) => `${cyr(l) && !cyr(ls[i - 1] || "a") ? `<h2>Российские марки</h2>` : ""}<div class="letter">${esc(l)}</div><div class="grid">${byLetter[l].map((br) => `<a class="card" href="/m/${brandSlug[br]}/"><b>${esc(br)}</b><small>${count(br)} ${plural(count(br), "модель", "модели", "моделей")}</small></a>`).join("")}</div>`).join("")}`;
  files.set("m/search.js", SEARCH_JS + "\n");
  files.set("m/index.html", page({ title: "Каталог мотоциклов, питбайков и мопедов — масло, свечи, моторы | MotoHelper", desc: `${BIKES.length} моделей: мотор, масло и его объём, свечи, зазоры клапанов, жиклёры и слабые места.`, canon: SITE + "m/", crumbs, body, ld: [crumbLd(crumbs)], js: SEARCH_JS }));
  files.set("m/index.json", JSON.stringify(BIKES.map((b) => { const e = ENGINES[b.versions[0].engine]; const mk = [...new Set(b.versions.map((v) => (ENGINES[v.engine] || {}).maker).filter(Boolean))].join(" ");
    return Object.assign({ b: b.brand, n: b.name, u: bikeSlug.get(b), t: b.type, e: e.code + (e.cc ? " · " + e.cc + " см³" : "") }, mk && mk !== b.brand ? { m: mk } : {}, b.aka && b.aka.length ? { k: b.aka.join(" ") } : {}); })) + "\n");
}


/* мотор: /m/motor/<код>/ */
engIds.forEach((id) => {
  const e = ENGINES[id], list = bikesOf[id], b0 = list[0], slug = engSlug[id], canon = SITE + "m/motor/" + slug + "/";
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Моторы", "/m/motor/"], [e.code, null]];
  const aka = AKA[id] ? String(AKA[id]).split(/\s+/).filter((x) => x && x.toLowerCase() !== String(e.code).toLowerCase()) : [];
  const groups = `<h2 class="vh">Характеристики и ТО</h2>` + garageGroups(e, {}, b0, "");
  const iss = weak(e).length ? `<h2 id="slabye">Слабые места ${esc(e.code)}</h2><ul class="iss">${weak(e).map((x) => `<li class="${x.sev}"><span class="sev">${SEV[x.sev] || ""}</span><b>${esc(x.t)}</b>${esc(x.fix)}</li>`).join("")}</ul>` : "";
  const gs = guidesOf(e), ds = diagOf(e);
  const tName = dupCode[e.code] > 1 && e.name && e.name !== e.code ? e.name : e.code;
  /* вопрос-ответ по мотору: так спрашивают в поиске («какое масло в 172FMM», «зазор клапанов NB300») — видимым блоком и разметкой FAQPage */
  const okv = (x) => x && x !== "—" && !/мануал/i.test(x);
  const dot = (t) => (/[.!?]$/.test(t) ? t : t + ".");
  const lc = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const oilEvery = e.oilInt ? (hoursEvery(e.oilInt, "oil", e, b0) || kmh(e.oilInt, e, b0)).replace(/\u00a0/g, " ") : "";
  const valveEvery = e.valveInt ? (hoursEvery(e.valveInt, "valve", e, b0) || kmh(e.valveInt, e, b0)).replace(/\u00a0/g, " ") : "";
  const carbOk = okv(e.carb) && !/впрыск|инжектор|efi|tpi/i.test(e.carb);
  const jets = [okv(e.jetMain) && "главный жиклёр " + e.jetMain, okv(e.jetPilot) && "жиклёр холостого хода " + e.jetPilot, okv(e.needle) && "игла: " + e.needle].filter(Boolean);
  const names = list.slice(0, 8).map((x) => x.brand === "Любая модель" ? x.name : x.brand + " " + x.name);
  const faq = [
    okv(e.oil) && ["Какое масло заливать в мотор " + tName + "?", e.oil + (okv(e.oilVol) ? ", объём " + e.oilVol : "") + (oilEvery ? ". Замена " + oilEvery : "")],
    okv(e.spark) && ["Какая свеча стоит на " + tName + "?", e.spark + (okv(e.gap) ? ", зазор " + e.gap : "")],
    valveFaq(e, tName, valveEvery && !/гидрокомпенс/i.test(String(e.valveIn)) ? ". Проверять " + valveEvery : ""),
    carbOk && ["Какой карбюратор и жиклёры у " + tName + "?", e.carb + (jets.length ? "; " + jets.join(", ") : "") + ". Это базовая настройка — по высоте, погоде и выхлопу подбирают по свече"],
    carbUp(e) && ["Какой карбюратор поставить на " + tName + ", чтобы был резвее?", (carbUp(e).lad.length ? "Варианты: " + carbUp(e).lad.map((t) => t.title.replace(/^Карбюратор\s*/, "")).join(", ") + ". " : "") + (carbUp(e).row.nuance ? carbUp(e).row.nuance[0] + " " : "") + (carbUp(e).row.tip || "") + (carbUp(e).bore ? " С бигбором: " + carbUp(e).row.boreNote : "")],
    okv(e.fuel) && ["Какой бензин заливать в " + tName + "?", e.fuel],
    names.length && ["На каких мотоциклах стоит " + tName + "?", names.join(", ") + (list.length > names.length ? " и ещё " + (list.length - names.length) + " " + plural(list.length - names.length, "модель", "модели", "моделей") : "")],
    weak(e).length && ["Какие слабые места у " + tName + "?", weak(e).slice(0, 3).map((x) => x.t + (x.fix ? " — " + lc(x.fix.replace(/\.$/, "")) : "")).join("; ")],
  ].filter(Boolean).map((q) => [q[0], dot(q[1])]);
  const faqHtml = faq.length ? `<h2>Частые вопросы о ${esc(tName)}</h2><div class="faq">${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join("")}</div>` : "";
  const body = `<section class="hero"><div class="kick">Мотор${e.cc ? " · " + e.cc + " см³" : ""}${e.stroke ? " · " + esc(e.stroke) : ""}</div><h1>${esc(e.code)}</h1>
<p class="lead">${esc(e.name || e.code)}: ${e.stroke === "2T" ? "какое масло 2T и сколько в " + ((e.groups || []).indexOf("cvt") >= 0 ? "редуктор" : "КПП") + ", свеча и зазор" : "какое масло и сколько заливать, свеча и зазор, зазоры клапанов"}${(e.groups || []).indexOf("carb") >= 0 ? ", жиклёры" : ""}, слабые места. Стоит на ${list.length} ${plural(list.length, "модели", "моделях", "моделях")}.</p>
</section>
<section class="ver"><div class="tiles">${cheat(e, {}, "")}</div>${jumpNav(e, "", weak(e).length, false, buyItems(e, null).length > 0)}${toolsNav(e, appLink(b0, b0.versions.findIndex((v) => v.engine === id)))}${groups}${iss}${carbUpHtml(e, "", appLink(b0, b0.versions.findIndex((v) => v.engine === id)) + "&r=tune")}
<a class="cta" href="${appLink(b0, b0.versions.findIndex((v) => v.engine === id))}">Ремонт, запчасти и ИИ-механик для ${esc(e.code)} →</a></section>
<h2>Мотоциклы с мотором ${esc(e.code)}</h2><div class="grid models">${list.slice(0, 60).map((x) => modelCard(x, true)).join("")}</div>${list.length > 60 ? `<div class="chips">${list.slice(60).map((x) => `<a class="chip" href="/m/${bikeSlug.get(x)}/">${esc(x.brand + " " + x.name)}</a>`).join("")}</div>` : ""}
${ds.length ? `<h2>Неисправности</h2><div class="chips">${ds.map((d) => engProbUrl(id, d.id) && PROB[d.id] ? `<a class="chip" href="${engProbUrl(id, d.id)}">${esc(PROB[d.id].replace("{M}", e.code))}</a>` : `<a class="chip" href="/m/polomka/${d.id}/">${esc(d.title)}</a>`).join("")}</div>` : ""}
${gs.length ? `<h2>Инструкции для ${esc(e.code)}</h2><div class="chips">${gs.map((g) => `<a class="chip" href="/m/remont/${g.id}/">${esc(g.title)}</a>`).join("")}</div>` : ""}
${faqHtml}
${fbBlock("", e.code + " [" + id + "]", ["Масло", "Объём масла", "Свеча", "Зазоры клапанов", "Карбюратор и жиклёры", "Слабые места", "На каких моделях стоит"])}
<div class="chips">${sparkChips(e)}${tuneEligible(id) ? `<a class="chip" href="/m/motor/${slug}/tuning/">Тюнинг ${esc(e.code)} →</a>` : ""}<a class="chip" href="/m/provodka/${ctx.wiringType(e)}/">${WIRE_ANCHOR[ctx.wiringType(e)] || "Схема электрики"}</a><a class="chip" href="/m/maslo/">Масло для других моторов</a><a class="chip" href="/m/svechi/">Свечи: таблица по моторам</a><a class="chip" href="/m/klapany/">Зазоры клапанов: таблица</a></div>`;
  /* 2Т: масло — в бачок или смесь, объём — в КПП или редуктор; клапанов нет */
  const twoE = e.stroke === "2T", cvtE = (e.groups || []).indexOf("cvt") >= 0;
  const oilE = twoE ? (briefOil(e.oil) || "2T").replace(/^масло\s+/i, "").replace(/2T\s+масло(?![а-яё])/gi, "2T") + (e.oilVol && /\d/.test(e.oilVol) ? ", " + ((v) => /редуктор|КПП|коробк/i.test(v) ? v : (cvtE ? "в редуктор " : "в КПП ") + v)(brief(e.oilVol).split(",")[0]) : "")
    : (briefOil(e.oil) || "—") + (e.oilVol && /\d/.test(e.oilVol) ? " " + brief(e.oilVol).split(",")[0] : "");
  const desc = `Мотор ${dupCode[e.code] > 1 && e.name ? e.name : engTitle(e)}${e.cc ? ", " + e.cc + " см³" : ""}: масло ${oilE}, свеча ${brief(e.spark).split(" / ")[0] || "—"}${e.gap ? " (зазор " + brief(e.gap) + ")" : ""}${briefValves(e.valveIn, e.valveEx) ? ", клапаны " + briefValves(e.valveIn, e.valveEx) : ""}. На каких мотоциклах стоит, слабые места, ремонт.`;
  files.set("m/motor/" + slug + "/index.html", page({ fb: true, ask: "мотор " + tName, title: pickTitle(tName, twoE ? [" — масло 2T, свеча, " + ((e.groups || []).indexOf("carb") >= 0 ? "жиклёры" : "ТО") + " | MotoHelper", " — масло 2T, свеча, " + ((e.groups || []).indexOf("carb") >= 0 ? "жиклёры" : "ТО"), ": масло 2T, свеча"] : [" — масло и объём, свеча, зазоры клапанов | MotoHelper", " — масло, свеча, зазоры клапанов", ": масло, свеча, клапаны"]), desc, canon, crumbs, body, sticky: appLink(b0, 0),
    ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: "Мотор " + e.code, url: canon, inLanguage: "ru", description: desc }]
      .concat(faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }] : []) }));
});
{
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Моторы", null]];
  const byLetter = {};
  engIds.forEach((id) => { const l = String(ENGINES[id].code)[0].toUpperCase(); (byLetter[l] = byLetter[l] || []).push(id); });
  const card = (id) => { const e = ENGINES[id]; return `<a class="card" href="/m/motor/${engSlug[id]}/"><b>${esc(e.code)}</b><small>${[e.cc ? e.cc + " см³" : "", bikesOf[id].length + " " + plural(bikesOf[id].length, "модель", "модели", "моделей")].filter(Boolean).join(" · ")}</small></a>`; };
  const body = `<section class="hero"><div class="kick">Справочник</div><h1>Моторы</h1><p class="lead">${engIds.length} ${plural(engIds.length, "мотор", "мотора", "моторов")}: масло и объём, свечи, зазоры клапанов, жиклёры, слабые места и на каких мотоциклах стоят.</p></section>
<div class="chips"><a class="chip" href="/m/maslo/">Масло: таблица по моторам</a><a class="chip" href="/m/svechi/">Свечи: таблица по моторам</a><a class="chip" href="/m/klapany/">Зазоры клапанов: таблица</a><a class="chip" href="/m/tuning/">Тюнинг: бигбор, карбюратор, вариатор</a></div>
<h2>Самые распространённые</h2><div class="grid">${popular.slice(0, 24).map(card).join("")}</div>
<h2>Все моторы</h2>${Object.keys(byLetter).sort(abc).map((l) => `<div class="letter">${esc(l)}</div><div class="grid">${byLetter[l].map(card).join("")}</div>`).join("")}`;
  files.set("m/motor/index.html", page({ title: "Моторы мотоциклов и питбайков: масло, свечи, зазоры клапанов | MotoHelper", desc: `${engIds.length} моторов — 172FMM, 174MN, PR300, NC250 и другие: масло и объём, свечи, зазоры клапанов, слабые места.`, canon: SITE + "m/motor/", crumbs, body, ld: [crumbLd(crumbs)] }));
}

/* инструкция: /m/remont/<id>/ */
GUIDES.forEach((g) => {
  const canon = SITE + "m/remont/" + g.id + "/";
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Инструкции", "/m/remont/"], [g.title, null]];
  const okE = (e) => okEng(g.only, e) && !(e.cvt && NO_CVT.indexOf(g.id) >= 0) && ctx.guideOk(g, e);
  const vt = valuesTable(phKeys(g.steps), okE);
  const plain = g.steps.map((x) => phPlain(x, vt.keys));
  const body = `<section class="hero"><div class="kick">Инструкция</div><h1>${esc(g.title)}</h1>
<div class="meta">${g.time ? `<span class="chip">⏱ ${esc(g.time)}</span>` : ""}${g.diff ? `<span class="chip">${esc(g.diff)}</span>` : ""}<span class="chip">${g.steps.length} ${plural(g.steps.length, "шаг", "шага", "шагов")}</span></div></section>
${(g.tools || []).length ? `<h2>Понадобится</h2><ul class="plain">${g.tools.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
<h2>Пошагово</h2><ol class="steps">${g.steps.map((x) => `<li>${phText(x, vt.keys)}</li>`).join("")}</ol>
${vt.html}
<a class="cta" href="/#g=${g.id}">Открыть с цифрами для своего мотоцикла →</a>
<p>Не нашёл ответ? Опиши поломку <a href="/#ai=1">ИИ-механику MotoHelper</a> — выбери свою модель, и он ответит с её цифрами.</p>
${(() => { const ds = DIAG.filter((d) => fixGuides(d).indexOf(g) >= 0); return ds.length ? `<h2>Когда это нужно</h2><div class="chips">${ds.map((d) => `<a class="chip" href="/m/polomka/${d.id}/">${esc(d.title)}</a>`).join("")}</div>` : ""; })()}
${(() => { const T = { oil: ["/m/maslo/", "Какое масло и сколько: таблица по моторам"], spark: ["/m/svechi/", "Свечи и зазор: таблица по моторам"], valves: ["/m/klapany/", "Зазоры клапанов: таблица по моторам"], "valves-dohc": ["/m/klapany/", "Зазоры клапанов: таблица по моторам"], "valves-screw": ["/m/klapany/", "Зазоры клапанов: таблица по моторам"] }[g.id];
  const fl = FLAGSHIP.map((n) => BIKES.find((x) => x.brand + " " + x.name === n)).filter((x) => x && okE(ENGINES[x.versions[0].engine])).slice(0, 8);
  return (T ? `<p><a class="chip" href="${T[0]}">${T[1]} →</a></p>` : "") + (fl.length ? `<h2>Цифры для популярных моделей</h2><div class="chips">${fl.map((x) => `<a class="chip" href="/m/${bikeSlug.get(x)}/">${esc(x.brand + " " + x.name)}</a>`).join("")}</div>` : ""); })()}
${(() => { const L = GUIDES.filter((x) => x.area && x.area === g.area), i = L.indexOf(g); if (L.length < 2 || i < 0) return "";
  const pr = L[(i - 1 + L.length) % L.length], nx = L[(i + 1) % L.length];
  return `<div class="pn">${pr !== g ? `<a class="chip" href="/m/remont/${pr.id}/">← ${esc(pr.title)}</a>` : ""}${nx !== g && nx !== pr ? `<a class="chip" href="/m/remont/${nx.id}/">${esc(nx.title)} →</a>` : ""}</div>`; })()}
<h2>Другие инструкции</h2><div class="chips">${GUIDES.filter((x) => x !== g && x.area && x.area === g.area).slice(0, 12).concat(GUIDES.filter((x) => KEY_GUIDES.indexOf(x.id) >= 0 && x !== g)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 16).map((x) => `<a class="chip" href="/m/remont/${x.id}/">${esc(x.title)}</a>`).join("")}<a class="chip" href="/m/remont/">Все инструкции →</a></div>`;
  const desc = (g.title + ": " + plain.slice(0, 3).join(" ")).slice(0, 230).replace(/\s+\S*$/, "") + "…";
  const ld = { "@context": "https://schema.org", "@type": "HowTo", name: g.title, inLanguage: "ru", url: canon, step: plain.map((t, i) => ({ "@type": "HowToStep", position: i + 1, text: t })) };
  if (g.tools && g.tools.length) ld.tool = g.tools.map((t) => ({ "@type": "HowToTool", name: t }));
  /* «30 мин», «1–1.5 ч» → PT30M, PT1H (берём меньшее) */
  { const m = String(g.time || "").match(/^([\d.,]+)(?:[–-][\d.,]+)?\s*(мин|ч)/); if (m) { const n = parseFloat(m[1].replace(",", ".")); ld.totalTime = m[2] === "ч" ? "PT" + (Number.isInteger(n) ? n + "H" : Math.round(n * 60) + "M") : "PT" + Math.round(n) + "M"; } }
  files.set("m/remont/" + g.id + "/index.html", page({ ask: "инструкция «" + g.title + "»", title: pickTitle(g.title, [" на мотоцикле и питбайке — пошагово | MotoHelper", " на мотоцикле и питбайке — пошагово", " — пошагово", ""]), desc, canon, crumbs, body, sticky: "/#g=" + g.id, ld: [crumbLd(crumbs), ld] }));
});
{
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Инструкции", null]];
  const body = `<section class="hero"><div class="kick">Ремонт своими руками</div><h1>Инструкции</h1><p class="lead">${GUIDES.length} ${plural(GUIDES.length, "инструкция", "инструкции", "инструкций")} по ремонту и обслуживанию мотоциклов, питбайков и скутеров: по шагам, с инструментом и цифрами для своего мотора.</p></section>
<h2>Самое нужное</h2><div class="grid">${GUIDES.filter((g) => KEY_GUIDES.indexOf(g.id) >= 0).map((g) => `<a class="card big" href="/m/remont/${g.id}/"><b>${esc(g.title)}</b></a>`).join("")}</div>
<h2>Все инструкции</h2><div class="grid models">${GUIDES.slice().sort((a, b) => a.title.localeCompare(b.title, "ru")).map((g) => `<a class="card" href="/m/remont/${g.id}/"><b>${esc(g.title)}</b><small>${[g.time, g.diff].filter(Boolean).map(esc).join(" · ")}</small></a>`).join("")}</div>`;
  files.set("m/remont/index.html", page({ title: "Ремонт мотоцикла и питбайка своими руками — инструкции | MotoHelper", desc: `${GUIDES.length} пошаговых инструкций: замена масла, регулировка клапанов, настройка карбюратора, цепь, тормоза, электрика.`, canon: SITE + "m/remont/", crumbs, body, ld: [crumbLd(crumbs)] }));
}

/* поломка: /m/polomka/<id>/ — дерево проверок шагами */
DIAG.forEach((d) => {
  const canon = SITE + "m/polomka/" + d.id + "/";
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Неисправности", "/m/polomka/"], [d.title, null]];
  const texts = [];
  d.steps.forEach((st) => [st.q, st.hint, st.efiQ, st.onNo && st.onNo.action, st.onYes && st.onYes.action].concat((st.options || []).map((o) => o.result.action)).forEach((t) => t && texts.push(t)));
  const okE = (e) => !d.only || d.only.some((x) => (e.groups || []).indexOf(x) >= 0);
  const vt = valuesTable(phKeys(texts), okE), ph = (t) => phText(t, vt.keys);
  const res = (r, word) => r && typeof r === "object" ? `<span class="no"><b>${esc(word)} → ${esc(r.result || "")}</b>${ph(r.action || "")}</span>` : "";
  const opts = (st) => (st.options ? `<ul class="opts">${st.options.map((o) => `<li><b>${esc(o.text)} → ${esc(o.result.result)}.</b> ${ph(o.result.action || "")}</li>`).join("")}</ul>` : "");
  const steps = d.steps.map((st) => `<li>${ph(st.q)}${st.efiQ ? `<span class="hint">На инжекторе: ${ph(st.efiQ)}</span>` : ""}${st.hint ? `<span class="hint">${ph(st.hint)}</span>` : ""}${res(st.onYes, st.yes || "Да")}${res(st.onNo, st.no || "Нет")}${opts(st)}</li>`).join("");
  const causes = d.steps.flatMap((st) => [st.onYes, st.onNo].concat((st.options || []).map((o) => o.result))).filter((r) => r && typeof r === "object" && r.result).map((r) => lc1(r.result));
  const body = `<section class="hero"><div class="kick">Неисправность</div><h1>${esc(d.title)}</h1><p class="lead">Проверяй по порядку — от простого к сложному. ${causes.length ? "Частые причины: " + esc(causes.slice(0, 5).join(", ")) + "." : ""}</p></section>
<h2>Что проверить</h2><ol class="steps">${steps}</ol>
${vt.html}
${fixHtml(d)}
${(() => { let L = [...probBikes].filter((b) => probsFor(b).indexOf(d) >= 0).sort((a, b) => (FLAGSHIP.indexOf(b.brand + " " + b.name) >= 0) - (FLAGSHIP.indexOf(a.brand + " " + a.name) >= 0) || COLL.compare(a.brand + " " + a.name, b.brand + " " + b.name));
  if (!L.length || !PROB[d.id]) return "";
  /* модели на одном моторе — одной ссылкой на страницу «мотор + поломка», остальные — на страницу модели */
  const seenE = new Set(); L = L.filter((b) => { const id = b.versions[0].engine; if (!engProbUrl(id, d.id)) return true; if (seenE.has(id)) return false; seenE.add(id); return true; });
  const chip = (b) => { const id = b.versions[0].engine, u = engProbUrl(id, d.id); return u ? `<a class="chip" href="${u}">${esc(PROB[d.id].replace("{M}", ENGINES[id].code))} (${esc(PROB_GROUP[id].slice(0, 2).map((x) => x.brand + " " + x.name).join(", "))}${PROB_GROUP[id].length > 2 ? "…" : ""})</a>` : `<a class="chip" href="/m/${bikeSlug.get(b)}/${d.id}/">${esc(PROB[d.id].replace("{M}", b.brand + " " + b.name))}</a>`; };
  return `<h2>${esc(d.title)} — проверка с цифрами своей модели</h2><div class="chips">${L.slice(0, 24).map(chip).join("")}</div>${L.length > 24 ? `<details class="more"><summary>Все модели (${L.length})</summary><div class="chips">${L.slice(24).map(chip).join("")}</div></details>` : ""}`; })()}
<a class="cta" href="/#d=${d.id}">Пройти проверку в MotoHelper под свой мотоцикл →</a>
<p>Не нашёл ответ? Опиши поломку <a href="/#ai=1">ИИ-механику MotoHelper</a> — выбери свою модель, и он ответит с её цифрами.</p>
<h2>Другие неисправности</h2><div class="chips">${DIAG.filter((x) => x !== d).map((x) => `<a class="chip" href="/m/polomka/${x.id}/">${esc(x.title)}</a>`).join("")}</div>`;
  const desc = `${d.title} — мотоцикл, питбайк, скутер: что проверить по шагам${causes.length ? " (" + causes.slice(0, 4).join(", ") + ")" : ""} и как исправить.`;
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: d.steps.filter((st) => st.onNo && st.onNo.result || st.onYes && st.onYes.result).slice(0, 8).map((st) => {
    const r = typeof st.onNo === "object" ? st.onNo : st.onYes;
    const pl = (t) => phPlain(t, vt.keys);
    return { "@type": "Question", name: pl(st.q), acceptedAnswer: { "@type": "Answer", text: pl(r.result + ". " + r.action) } };
  }) };
  files.set("m/polomka/" + d.id + "/index.html", page({ ask: "неисправность «" + d.title + "»", title: `${d.title}: причины и что проверить — мотоцикл, питбайк | MotoHelper`, desc, canon, crumbs, body, sticky: "/#d=" + d.id, ld: [crumbLd(crumbs)].concat(faq.mainEntity.length ? [faq] : []) }));
});

/* «Про модель»: тип, объём, мощность, мотор, охлаждение, КПП, другие названия, версии + вилка и аналоги расходников —
   своё у каждой модели, чтобы страницы поломок и тюнинга моделей на одном моторе не были копиями друг друга */
function modelAbout(b) {
  const e = ENGINES[b.versions[0].engine], full = b.brand + " " + b.name;
  const dotEnd = (t) => (/[.!?]$/.test(t) ? t : t + ".");
  const verTxt = b.versions.length > 1 ? dotEnd("Версии: " + b.versions.map((v, vi) => verName(v, vi, ENGINES[v.engine]) + (hpOf(b, v) ? " — " + hpOf(b, v) + " л.с." : "")).join("; ")) : "";
  const gbx = String(e.gearbox || "").split(",")[0].trim().replace(/^(\d[\d–-]*)\s*ст\.?$/, "КПП $1 ступ.");
  const about = `<h2>Про ${esc(full)}</h2><p>${esc(dotEnd([full + " — " + String(b.type || "").toLowerCase(), e.cc ? Math.round(e.cc) + " см³" : "", hpOf(b, b.versions[0]) ? hpOf(b, b.versions[0]) + " л.с." : "", "мотор " + e.code, e.cooling ? "охлаждение " + String(e.cooling).toLowerCase() : "", gbx].filter(Boolean).join(", ")))}${b.aka && b.aka.length ? " Также продаётся как " + esc(b.aka.join(", ")) + "." : ""} ${esc(verTxt)}</p>`;
  const modelGroups = [ctx.crossRows(b).length ? crossHtml(b, "") : "", ctx.forkRows && ctx.forkRows(b).length ? forkHtml(b, "") : ""].filter(Boolean).join("");
  return { about, modelGroups };
}
/* «модель + поломка» (см. PROB выше) */
const probPages = [];
probBikes.forEach((b) => {
  const slug = bikeSlug.get(b), full = b.brand + " " + b.name, e = ENGINES[b.versions[0].engine], efi = (e.groups || []).indexOf("efi") >= 0;
  const val = (k) => (k === "name" ? e.code : e[k] && e[k] !== "—" ? e[k] : null);
  /* в тексте шагов и описании — значение без источника в скобках («D8EA», а не «D8EA (руководство Kayo 2022…)»); полное — в плитках «Цифры» */
  const valB = (k) => (val(k) ? brief(val(k)) || val(k) : null);
  const fillT = (t) => String(t).replace(/\{(\w+)\}/g, (m, k) => valB(k) || "по мануалу");
  const fill = (t) => esc(t).replace(/\{(\w+)\}/g, (m, k) => (valB(k) ? `<strong>${esc(valB(k))}</strong>` : "по мануалу"));
  // варианты ответа про 2T не показываем на 4T-моторе и наоборот
  const fitOpt = (o) => (e.stroke === "2T" ? !/\b4T\b/.test(o.text) : !/\b2T\b/.test(o.text));
  /* на инжекторе карбюраторных советов (жиклёры, игла, поплавок, подсос) не даём — смесь считает ЭБУ */
  const act = (r) => (r.skip2t && e.stroke === "2T" ? "Для 2T: износ поршня и колец, проверь лепестковый клапан и прокладки картера." : efi && /жикл|игл[аеуы]|поплав|подсос|карбюр/i.test(r.action || "") ? "На инжекторе: проверь давление топлива и форсунку, датчики (температуры, дросселя, лямбда) и ошибки ЭБУ — смесь считает блок, жиклёров нет." : r.action || "");
  const res = (r, word) => (r && typeof r === "object" ? `<span class="no"><b>${esc(word)} → ${esc(r.result || "")}</b>${fill(act(r))}</span>` : "");
  const list = probsFor(b);
  const nums = [["Свеча", val("spark") && val("spark") + (val("gap") ? ", зазор " + val("gap") : "")], ["Клапаны (на холодную)", val("valveIn") && "впуск " + val("valveIn") + ", выпуск " + (val("valveEx") || "—")],
    ["Масло", val("oil") && val("oil") + (val("oilVol") ? ", " + val("oilVol") : "")], ["Обороты ХХ", val("idle")], ["Компрессия", val("compression")], [efi ? "Питание" : "Карбюратор", efi ? "инжектор" : val("carb")], ["Главный жиклёр", !efi && val("jetMain")]].filter((x) => x[1]);
  /* своё у модели (а не только у мотора): страницы «модель + поломка» на одном моторе иначе почти одинаковые */
  const { about, modelGroups } = modelAbout(b);
  const sameEng = [...probBikes].filter((x) => x !== b && x.versions[0].engine === b.versions[0].engine).slice(0, 8);
  const myCmpP = CMP_OF.get(b) || [];
  list.forEach((d) => {
    const phrase = PROB[d.id].replace("{M}", full), canon = SITE + "m/" + slug + "/" + d.id + "/", grp = engProbUrl(b.versions[0].engine, d.id);
    const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], [b.brand, "/m/" + brandSlug[b.brand] + "/"], [b.name, "/m/" + slug + "/"], [d.title, null]];
    const steps = d.steps.map((st) => `<li>${fill(efi && st.efiQ ? st.efiQ : st.q)}${st.hint ? `<span class="hint">${fill(st.hint)}</span>` : ""}${res(st.onYes, st.yes || "Да")}${res(st.onNo, st.no || "Нет")}${st.options ? `<ul class="opts">${st.options.filter(fitOpt).map((o) => `<li><b>${esc(o.text)} → ${esc(o.result.result)}.</b> ${fill(act(o.result))}</li>`).join("")}</ul>` : ""}</li>`).join("");
    const causes = d.steps.flatMap((st) => [st.onYes, st.onNo].concat((st.options || []).filter(fitOpt).map((o) => o.result))).filter((r) => r && typeof r === "object" && r.result).map((r) => lc1(r.result));
    const iss = weak(e).length ? `<h2>Слабые места мотора ${esc(e.code)}</h2><ul class="iss">${weak(e).map((x) => `<li class="${x.sev}"><span class="sev">${SEV[x.sev] || ""}</span><b>${esc(x.t)}</b>${esc(x.fix)}</li>`).join("")}</ul>` : "";
    const body = `<section class="hero"><div class="kick">${esc(b.brand)} · неисправность</div><h1>${esc(phrase)}</h1><p class="lead">Проверка по шагам для мотора ${esc(e.code)}${e.cc ? " (" + e.cc + " см³)" : ""} — с его цифрами. Иди по порядку, от простого к сложному.${causes.length ? " Частые причины: " + esc(causes.slice(0, 4).join(", ")) + "." : ""}</p></section>
${nums.length ? `<h2>Цифры ${esc(e.code)}</h2><div class="tiles">${nums.map((x) => `<div class="tile"><small>${esc(x[0])}</small><b${String(x[1]).length > 14 ? ' class="long"' : ""}>${nbv(esc(x[1]))}</b></div>`).join("")}</div>` : ""}
<h2>Что проверить</h2><ol class="steps">${steps}</ol>
${iss}
${about}
${modelGroups ? `<div class="groups">${modelGroups}</div>` : ""}
<a class="cta" href="${appLink(b, 0)}&d=${d.id}">Пройти проверку в MotoHelper для ${esc(full)} →</a>
${sameEng.filter((x) => probsFor(x).indexOf(d) >= 0).length ? `<h2>${esc(d.title)} на других моделях с мотором ${esc(e.code)}</h2><div class="chips">${sameEng.filter((x) => probsFor(x).indexOf(d) >= 0).map((x) => `<a class="chip" href="/m/${bikeSlug.get(x)}/${d.id}/">${esc(PROB[d.id].replace("{M}", x.brand + " " + x.name))}</a>`).join("")}</div>` : ""}
${myCmpP.length ? `<h2>Сравнения ${esc(full)}</h2><div class="chips">${myCmpP.map((c) => `<a class="chip" href="/m/sravnenie/${c.slug}/">${esc(c.title)}</a>`).join("")}</div>` : ""}
<p>Не нашёл ответ? Опиши поломку <a href="${appLink(b, 0)}&amp;ai=1">ИИ-механику MotoHelper</a> — он знает ${esc(full)}.</p>
${fixHtml(d, e)}
<h2>Другие поломки ${esc(full)}</h2><div class="chips">${list.filter((x) => x !== d).map((x) => `<a class="chip" href="/m/${slug}/${x.id}/">${esc(PROB[x.id] ? PROB[x.id].replace("{M}", full) : x.title)}</a>`).join("")}<a class="chip" href="/m/${slug}/">Всё ${esc(oOb(full))} →</a><a class="chip" href="/m/motor/${engSlug[b.versions[0].engine]}/">Всё о моторе ${esc(e.code)} →</a></div>
${grp ? `<p><a class="chip" href="${grp}">${esc(PROB[d.id].replace("{M}", e.code))}: все модели с этим мотором →</a></p>` : ""}
<p><a href="/m/polomka/${d.id}/">${esc(d.title)} — общая проверка для любого мотоцикла</a></p>`;
    const desc = `${phrase}: что проверить по шагам — свеча ${valB("spark") ? valB("spark").split(" / ")[0] : "по мануалу"}${briefValves(val("valveIn"), val("valveEx")) ? ", зазоры клапанов " + briefValves(val("valveIn"), val("valveEx")) : ""}${causes.length ? ". Причины: " + causes.slice(0, 3).join(", ") : ""}.`;
    const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: d.steps.filter((st) => (st.onNo && st.onNo.result) || (st.onYes && st.onYes.result)).slice(0, 6).map((st) => {
      const r = typeof st.onNo === "object" ? st.onNo : st.onYes;
      return { "@type": "Question", name: fillT(efi && st.efiQ ? st.efiQ : st.q), acceptedAnswer: { "@type": "Answer", text: fillT(r.result + ". " + act(r)) } };
    }) };
    /* FAQPage здесь не ставим: вопросы одинаковые у всех моделей на этом моторе — для поиска это шаблон */
    void faq;
    files.set("m/" + slug + "/" + d.id + "/index.html", page({ ask: phrase + " (мотор " + e.code + ")", canonTo: grp ? SITE + grp.slice(1) : undefined, image: ogOf(b), title: pickTitle(phrase, [": причины и что проверить | MotoHelper", ": причины и что проверить", ": причины", ""]), desc, canon, crumbs, body, sticky: appLink(b, 0) + "&d=" + d.id, ld: [crumbLd(crumbs)] }));
    if (!grp) probPages.push(canon);
  });
});

/* «ZS172FMM не заводится: Kayo T2 250, Motoland TT250…» — главная страница группы (см. PROB_GROUP) */
const engProbPages = [];
Object.keys(PROB_GROUP).filter((id) => engProbUrl(id, "x")).forEach((id) => {
  const L = PROB_GROUP[id], b = L[0], e = ENGINES[id], efi = (e.groups || []).indexOf("efi") >= 0, slugE = engSlug[id];
  const val = (k) => (k === "name" ? e.code : e[k] && e[k] !== "—" ? e[k] : null);
  const valB = (k) => (val(k) ? brief(val(k)) || val(k) : null);
  const fillT = (t) => String(t).replace(/\{(\w+)\}/g, (m, k) => valB(k) || "по мануалу");
  const fill = (t) => esc(t).replace(/\{(\w+)\}/g, (m, k) => (valB(k) ? `<strong>${esc(valB(k))}</strong>` : "по мануалу"));
  const fitOpt = (o) => (e.stroke === "2T" ? !/\b4T\b/.test(o.text) : !/\b2T\b/.test(o.text));
  const act = (r) => (r.skip2t && e.stroke === "2T" ? "Для 2T: износ поршня и колец, проверь лепестковый клапан и прокладки картера." : efi && /жикл|игл[аеуы]|поплав|подсос|карбюр/i.test(r.action || "") ? "На инжекторе: проверь давление топлива и форсунку, датчики (температуры, дросселя, лямбда) и ошибки ЭБУ — смесь считает блок, жиклёров нет." : r.action || "");
  const res = (r, word) => (r && typeof r === "object" ? `<span class="no"><b>${esc(word)} → ${esc(r.result || "")}</b>${fill(act(r))}</span>` : "");
  const nums = [["Свеча", val("spark") && val("spark") + (val("gap") ? ", зазор " + val("gap") : "")], ["Клапаны (на холодную)", val("valveIn") && "впуск " + val("valveIn") + ", выпуск " + (val("valveEx") || "—")],
    ["Масло", val("oil") && val("oil") + (val("oilVol") ? ", " + val("oilVol") : "")], ["Обороты ХХ", val("idle")], ["Компрессия", val("compression")], [efi ? "Питание" : "Карбюратор", efi ? "инжектор" : val("carb")], ["Главный жиклёр", !efi && val("jetMain")]].filter((x) => x[1]);
  const list = probsFor(b);
  const names = (n) => L.slice(0, n).map((x) => x.brand + " " + x.name);
  list.forEach((d) => {
    const phrase = PROB[d.id].replace("{M}", e.code), url = "/m/motor/" + slugE + "/" + d.id + "/", canon = SITE + url.slice(1);
    const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Моторы", "/m/motor/"], [e.code, "/m/motor/" + slugE + "/"], [d.title, null]];
    const steps = d.steps.map((st) => `<li>${fill(efi && st.efiQ ? st.efiQ : st.q)}${st.hint ? `<span class="hint">${fill(st.hint)}</span>` : ""}${res(st.onYes, st.yes || "Да")}${res(st.onNo, st.no || "Нет")}${st.options ? `<ul class="opts">${st.options.filter(fitOpt).map((o) => `<li><b>${esc(o.text)} → ${esc(o.result.result)}.</b> ${fill(act(o.result))}</li>`).join("")}</ul>` : ""}</li>`).join("");
    const causes = d.steps.flatMap((st) => [st.onYes, st.onNo].concat((st.options || []).filter(fitOpt).map((o) => o.result))).filter((r) => r && typeof r === "object" && r.result).map((r) => lc1(r.result));
    const iss = weak(e).length ? `<h2>Слабые места мотора ${esc(e.code)}</h2><ul class="iss">${weak(e).map((x) => `<li class="${x.sev}"><span class="sev">${SEV[x.sev] || ""}</span><b>${esc(x.t)}</b>${esc(x.fix)}</li>`).join("")}</ul>` : "";
    const models = L.filter((x) => probsFor(x).indexOf(d) >= 0);
    const body = `<section class="hero"><div class="kick">${esc(e.code)} · неисправность</div><h1>${esc(phrase)}: ${esc(names(3).join(", "))}${L.length > 3 ? " и другие" : ""}</h1><p class="lead">Проверка по шагам для мотора ${esc(e.code)}${e.cc ? " (" + e.cc + " см³)" : ""} — с его цифрами. Подходит для ${models.length} ${plural(models.length, "модели", "моделей", "моделей")} с этим мотором. Иди по порядку, от простого к сложному.${causes.length ? " Частые причины: " + esc(causes.slice(0, 4).join(", ")) + "." : ""}</p></section>
${nums.length ? `<h2>Цифры ${esc(e.code)}</h2><div class="tiles">${nums.map((x) => `<div class="tile"><small>${esc(x[0])}</small><b${String(x[1]).length > 14 ? ' class="long"' : ""}>${nbv(esc(x[1]))}</b></div>`).join("")}</div>` : ""}
<h2>Что проверить</h2><ol class="steps">${steps}</ol>
${iss}
<h2>${esc(d.title)}: модели с мотором ${esc(e.code)}</h2><div class="chips">${models.map((x) => `<a class="chip" href="/m/${bikeSlug.get(x)}/${d.id}/">${esc(PROB[d.id].replace("{M}", x.brand + " " + x.name))}</a>`).join("")}</div>
${fixHtml(d, e)}
<a class="cta" href="${appLink(b, 0)}&d=${d.id}">Пройти проверку в MotoHelper под свой мотоцикл →</a>
<h2>Другие поломки ${esc(e.code)}</h2><div class="chips">${list.filter((x) => x !== d).map((x) => `<a class="chip" href="/m/motor/${slugE}/${x.id}/">${esc(PROB[x.id].replace("{M}", e.code))}</a>`).join("")}<a class="chip" href="/m/motor/${slugE}/">Всё о моторе ${esc(e.code)} →</a></div>
<p><a href="/m/polomka/${d.id}/">${esc(d.title)} — общая проверка для любого мотоцикла</a></p>`;
    const desc = `${phrase} (${names(3).join(", ")}${L.length > 3 ? " и др." : ""}): что проверить по шагам — свеча ${valB("spark") ? valB("spark").split(" / ")[0] : "по мануалу"}${briefValves(val("valveIn"), val("valveEx")) ? ", клапаны " + briefValves(val("valveIn"), val("valveEx")) : ""}${causes.length ? ". Причины: " + causes.slice(0, 3).join(", ") : ""}.`;
    const faq = d.steps.filter((st) => (st.onNo && st.onNo.result) || (st.onYes && st.onYes.result)).slice(0, 6).map((st) => { const r = typeof st.onNo === "object" ? st.onNo : st.onYes;
      return { "@type": "Question", name: fillT(efi && st.efiQ ? st.efiQ : st.q), acceptedAnswer: { "@type": "Answer", text: fillT(r.result + ". " + act(r)) } }; });
    const title = [`${phrase}: ${names(2).join(", ")} — что проверить | MotoHelper`, `${phrase}: ${names(2).join(", ")} — что проверить`, `${phrase}: ${names(1)[0]} и др. — что проверить`, `${phrase}: ${names(1)[0]} и другие`, `${phrase}: причины и что проверить`].find((x) => x.length <= 75) || phrase;
    files.set("m/motor/" + slugE + "/" + d.id + "/index.html", page({ ask: phrase, title, desc, canon, crumbs, body, sticky: appLink(b, 0) + "&d=" + d.id,
      ld: [crumbLd(crumbs)].concat(faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq }] : []) }));
    engProbPages.push(canon);
  });
});
{
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Неисправности", null]];
  const body = `<section class="hero"><div class="kick">Диагностика</div><h1>Неисправности</h1><p class="lead">Не заводится, глохнет, дымит, не тянет, стреляет — проверки по шагам, от простого к сложному.</p></section>
<div class="grid models">${DIAG.map((d) => `<a class="card" href="/m/polomka/${d.id}/"><b>${esc(d.title)}</b><small>${d.steps.length} ${plural(d.steps.length, "проверка", "проверки", "проверок")}</small></a>`).join("")}</div>`;
  files.set("m/polomka/index.html", page({ title: "Неисправности мотоцикла и питбайка: причины и проверка по шагам | MotoHelper", desc: "Не заводится, глохнет, дымит, перегревается, не тянет — что проверить по шагам и как починить мотоцикл, питбайк или скутер.", canon: SITE + "m/polomka/", crumbs, body, ld: [crumbLd(crumbs)] }));
}


compares.forEach((c) => {
  const A = c.a, Bk = c.b, va = A.versions[0], vb = Bk.versions[0], ea = ENGINES[va.engine], eb = ENGINES[vb.engine];
  const na = A.brand + " " + A.name, nb = Bk.brand + " " + Bk.name, canon = SITE + "m/sravnenie/" + c.slug + "/";
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Сравнения", "/m/sravnenie/"], [c.title, null]];
  const ga = specGroups(ea, va, A), gb = specGroups(eb, vb, Bk);
  const titles = [...new Set(ga.map((g) => g.title).concat(gb.map((g) => g.title)))];
  const val = (gs, t, r) => { const g = gs.find((x) => x.title === t); const row = g && g.rows.find((x) => x[0] === r); return row ? row[1] : "—"; };
  const tables = titles.map((t) => { const rowsN = [...new Set([].concat(...[ga, gb].map((gs) => (gs.find((x) => x.title === t) || { rows: [] }).rows.map((r) => r[0]))))];
    return `<h3>${esc(t)}</h3><div class="tblw"><table class="tbl cmp"><tr><th></th><th>${esc(na)}</th><th>${esc(nb)}</th></tr>${rowsN.map((r) => `<tr><td>${esc(r)}</td><td>${esc(val(ga, t, r))}</td><td>${esc(val(gb, t, r))}</td></tr>`).join("")}</table></div>`; }).join("");
  const ha = hpOf(A, va), hb = hpOf(Bk, vb), sev = (e) => (e.issues || []).filter((x) => x.sev === "high").length;
  const facts = [
    ha && hb ? (ha === hb ? `Мощность одинаковая — ${ha} л.с.` : `Мощнее ${ha > hb ? na : nb}: ${Math.max(ha, hb)} л.с. против ${Math.min(ha, hb)}.`) : "",
    va.engine === vb.engine ? `Мотор одинаковый — ${ea.code}: детали мотора подходят к обоим.` : `Моторы разные: ${ea.code} и ${eb.code}.`,
    ea.oilInt && eb.oilInt && ea.oilInt !== eb.oilInt ? `Масло реже менять на ${ea.oilInt > eb.oilInt ? na : nb}: каждые ${Math.max(ea.oilInt, eb.oilInt).toLocaleString("ru-RU")} км против ${Math.min(ea.oilInt, eb.oilInt).toLocaleString("ru-RU")}.` : "",
    ea.cooling && eb.cooling && ea.cooling !== eb.cooling ? `Охлаждение: ${na} — ${ea.cooling.toLowerCase()}, ${nb} — ${eb.cooling.toLowerCase()}.` : "",
    `Серьёзных слабых мест в базе: ${na} — ${sev(ea)}, ${nb} — ${sev(eb)}.`,
  ].filter(Boolean);
  const others = (compareByGroup[c.k] || []).filter((x) => x !== c).slice(0, 10);
  const body = `<section class="hero"><div class="kick">Сравнение</div><h1>${esc(na)} или ${esc(nb)}</h1><p class="lead">Мотор, мощность, масло, свечи, зазоры клапанов и слабые места — рядом, по данным базы MotoHelper.</p></section>
<h2>Коротко</h2><ul class="plain">${facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
<h2>Характеристики</h2>${tables}
<div class="chips"><a class="chip" href="/m/${bikeSlug.get(A)}/">Всё ${esc(oOb(na))} →</a><a class="chip" href="/m/${bikeSlug.get(Bk)}/">Всё ${esc(oOb(nb))} →</a>${groups[c.k] && podSlug[c.k] ? `<a class="chip" href="/m/podborka/${podSlug[c.k]}/">Все ${esc(podName(c.k).toLowerCase())} →</a>` : ""}</div>
${others.length ? `<h2>Другие сравнения</h2><div class="chips">${others.map((x) => `<a class="chip" href="/m/sravnenie/${x.slug}/">${esc(x.title)}</a>`).join("")}</div>` : ""}`;
  files.set("m/sravnenie/" + c.slug + "/index.html", page({ title: [`${na} или ${nb} — что выбрать: сравнение | MotoHelper`, `${na} или ${nb} — что выбрать: сравнение`, `${na} или ${nb} — что выбрать`, `${na} или ${nb}: сравнение`, `${na} или ${nb}`].find((x) => x.length <= 75) || `${na} или ${nb}`, desc: `${na} против ${nb}: ${facts.slice(0, 2).join(" ")} Масло, свечи, зазоры клапанов, слабые места.`.slice(0, 300), canon, crumbs, body, sticky: appLink(A, 0), ld: [crumbLd(crumbs)] }));
});
{
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Сравнения", null]];
  const byK = Object.keys(compareByGroup).sort((a, b) => compareByGroup[b].length - compareByGroup[a].length);
  const body = `<section class="hero"><div class="kick">Что выбрать</div><h1>Сравнения</h1><p class="lead">${compares.length} ${plural(compares.length, "сравнение", "сравнения", "сравнений")} популярных моделей одного класса: мотор, мощность, масло, слабые места.</p></section>
${byK.map((k) => `<h2>${esc(podName(k))}</h2><div class="chips">${compareByGroup[k].map((c) => `<a class="chip" href="/m/sravnenie/${c.slug}/">${esc(c.title)}</a>`).join("")}</div>`).join("")}`;
  files.set("m/sravnenie/index.html", page({ title: "Сравнение мотоциклов и питбайков — что выбрать | MotoHelper", desc: "Kayo или Motoland, BSE или Regulmoto: сравнения популярных эндуро и питбайков одного класса — мотор, мощность, масло, слабые места.", canon: SITE + "m/sravnenie/", crumbs, body, ld: [crumbLd(crumbs)] }));
}

podKeys.forEach((k) => {
  const list = groups[k].slice().sort((a, b) => hpOf(b, b.versions[0]) - hpOf(a, a.versions[0]) || COLL.compare(a.brand + a.name, b.brand + b.name));
  const name = podName(k), canon = SITE + "m/podborka/" + podSlug[k] + "/";
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Подборки", "/m/podborka/"], [name, null]];
  const engCount = {}; list.forEach((b) => (engCount[b.versions[0].engine] = (engCount[b.versions[0].engine] || 0) + 1));
  const topEng = Object.keys(engCount).sort((a, b) => engCount[b] - engCount[a])[0];
  const brandsN = new Set(list.map((b) => b.brand)).size;
  const top = list[0], topHp = hpOf(top, top.versions[0]);
  const facts = [
    topHp ? `Самый мощный — <a href="/m/${bikeSlug.get(top)}/">${esc(top.brand + " " + top.name)}</a>: ${topHp} л.с.` : "",
    engCount[topEng] > 1 ? `Чаще всего стоит мотор <a href="/m/motor/${engSlug[topEng]}/">${esc(ENGINES[topEng].code)}</a> — на ${engCount[topEng]} ${plural(engCount[topEng], "модели", "моделях", "моделях")}: запчасти к нему найти проще всего.` : "",
  ].filter(Boolean);
  const rows = list.map((b) => { const v = b.versions[0], e = ENGINES[v.engine];
    return `<tr><td><a href="/m/${bikeSlug.get(b)}/">${esc(b.brand + " " + b.name)}</a></td><td><a href="/m/motor/${engSlug[v.engine]}/">${esc(e.code)}</a></td><td>${hpOf(b, v) || "—"}</td><td>${esc(e.cooling || "—")}</td><td>${esc(e.oilVol || "—")}</td><td>${e.oilInt ? esc(kmh(e.oilInt, e, b).replace(/^каждые /, "")) : "—"}</td></tr>`; }).join("");
  const cmp = (compareByGroup[k] || []).slice(0, 12);
  /* «какой выбрать»: самые частые моторы класса — плюсы и минусы из данных (охлаждение, клапаны, балансир, инжектор, тюнинг, слабые места) */
  const gE = (e, x) => (e.groups || []).indexOf(x) >= 0;
  const engTop = Object.keys(engCount).filter((id) => engCount[id] >= 2 && ENGINES[id]).sort((a, b) => engCount[b] - engCount[a]).slice(0, 6);
  const pros = (id) => { const e = ENGINES[id]; return [id === topEng && engTop.length > 1 && "запчасти найти проще всего",
    gE(e, "liquid") && "жидкостное охлаждение — не перегревается в пробках и на медленной езде", gE(e, "dohc") ? "DOHC — тянет на верхах" : gE(e, "zs4v") || /4 клапан/.test(e.cam || "") ? "4 клапана — бодрее на верхах" : "",
    gE(e, "balancer") && "балансирный вал — меньше вибрация", gE(e, "efi") && "инжектор — уверенный пуск в холод, без настройки карбюратора",
    e.stroke === "4T" && gE(e, "carb") && !gE(e, "dohc") && "простой: обслуживание своими руками", tuneEligible(id) && "есть тюнинг: бигбор и карбюратор побольше"].filter(Boolean).slice(0, 4); };
  const cons = (id) => { const e = ENGINES[id]; return (e.issues || []).filter((x) => (x.sev === "high" || x.sev === "med") && !/не подход|не став/i.test(x.t)).map((x) => x.t)
    .concat([e.stroke === "4T" && gE(e, "air") && gE(e, "big") && "воздушное — греется в жару и на медленной езде", e.stroke === "2T" && "2T: ЦПГ меняют по моточасам, масло — в бензин или бачок"]).filter(Boolean).slice(0, 3); };
  const hpE = (id) => { const L = list.filter((b) => b.versions[0].engine === id).map((b) => hpOf(b, b.versions[0])).filter(Boolean); return L.length ? Math.max.apply(null, L) : ENGINES[id].hp; };
  const choose = engTop.length > 1 ? `<h2 id="vybor">Какой мотор выбрать</h2><p class="note">Самые частые моторы в этом классе. Плюсы и минусы — из данных по мотору и его слабых мест; подробнее — на странице мотора.</p><div class="tu">${engTop.map((id) => { const e = ENGINES[id], models = list.filter((b) => b.versions[0].engine === id);
    return `<div class="tu-item"><div class="tu-top"><b><a href="/m/motor/${engSlug[id]}/">${esc(e.code)}</a></b><span class="cu-price">${engCount[id]} ${plural(engCount[id], "модель", "модели", "моделей")}</span></div><span class="cu-eff">${esc([e.cc ? Math.round(e.cc) + " см³" : "", hpE(id) ? "до " + hpE(id) + " л.с." : "", String(e.cooling || "").toLowerCase(), String(e.cam || "").split(/[;(]/)[0].trim()].filter(Boolean).join(" · "))}</span>${pros(id).length ? `<ul class="tu-ul pc-plus">${pros(id).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${cons(id).length ? `<ul class="tu-ul pc-minus">${cons(id).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<p class="small">${models.slice(0, 3).map((b) => `<a href="/m/${bikeSlug.get(b)}/">${esc(b.brand + " " + b.name)}</a>`).join(", ")}${models.length > 3 ? " и другие" : ""}</p></div>`; }).join("")}</div>` : "";
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  const liq = engTop.filter((id) => gE(ENGINES[id], "liquid")).map((id) => ENGINES[id].code);
  const pfaq = [engTop.length > 1 && ["Какой " + lower.replace(/ см³$/, "") + " выбрать?", "Чаще всего в этом классе стоит " + ENGINES[topEng].code + " — к нему проще всего найти запчасти. " + (liq.length ? "Жидкостное охлаждение (не перегревается на медленной езде): " + liq.slice(0, 3).join(", ") + ". " : "") + (topHp ? "Самый мощный — " + top.brand + " " + top.name + ", " + topHp + " л.с." : "")],
    topHp && ["Какой самый мощный " + lower.replace(/ см³$/, "") + "?", top.brand + " " + top.name + " — " + topHp + " л.с., мотор " + ENGINES[top.versions[0].engine].code + "."]].filter(Boolean);
  const body = `<section class="hero"><div class="kick">Подборка</div><h1>${esc(name)}</h1><p class="lead">${list.length} ${plural(list.length, "модель", "модели", "моделей")} от ${brandsN} ${plural(brandsN, "марки", "марок", "марок")}: мотор, мощность, охлаждение, масло и как часто его менять. Отсортировано по мощности.</p></section>
${facts.length ? `<ul class="plain">${facts.map((f) => `<li>${f}</li>`).join("")}</ul>` : ""}
${choose}
<h2>Все модели</h2><div class="tblw"><table class="tbl"><tr><th>Модель</th><th>Мотор</th><th>л.с.</th><th>Охлаждение</th><th>Масло</th><th>Замена масла</th></tr>${rows}</table></div>
${pfaq.length ? `<h2>Частые вопросы</h2><div class="faq">${pfaq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join("")}</div>` : ""}
${cmp.length ? `<h2>Сравнения</h2><div class="chips">${cmp.map((c) => `<a class="chip" href="/m/sravnenie/${c.slug}/">${esc(c.title)}</a>`).join("")}</div>` : ""}
<h2>Другие подборки</h2><div class="chips">${podKeys.filter((x) => x !== k && x.split("|")[0] === k.split("|")[0]).concat(podKeys.filter((x) => x.split("|")[0] !== k.split("|")[0]).slice(0, 6)).slice(0, 14).map((x) => `<a class="chip" href="/m/podborka/${podSlug[x]}/">${esc(podName(x))}</a>`).join("")}</div>`;
  files.set("m/podborka/" + podSlug[k] + "/index.html", page({ title: pickTitle(name, engTop.length > 1 ? [": какой выбрать — моторы, мощность, масло | MotoHelper", ": какой выбрать — моторы, мощность, масло", ": какой выбрать", ": все модели"] : [": все модели — мотор, мощность, масло | MotoHelper", ": все модели — мотор, мощность, масло", ": все модели"]),
    desc: `${name}: ${list.length} ${plural(list.length, "модель", "модели", "моделей")}${engTop.length > 1 ? ". Какой мотор выбрать: " + engTop.slice(0, 4).map((id) => ENGINES[id].code).join(", ") + " — плюсы, минусы и слабые места" : " — " + list.slice(0, 4).map((b) => b.brand + " " + b.name).join(", ")}. Мощность, охлаждение, масло.`, canon, crumbs, body,
    ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "ItemList", name, numberOfItems: list.length, itemListElement: list.slice(0, 100).map((b, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "m/" + bikeSlug.get(b) + "/", name: b.brand + " " + b.name })) }]
      .concat(pfaq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: pfaq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }] : []) }));
});
{
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Подборки", null]];
  const byType = {}; podKeys.forEach((k) => (byType[k.split("|")[0]] = byType[k.split("|")[0]] || []).push(k));
  const body = `<section class="hero"><div class="kick">Выбор мотоцикла</div><h1>Подборки</h1><p class="lead">Все модели одного класса в одной таблице: мотор, мощность, охлаждение, масло.</p></section>
${Object.keys(byType).map((t) => `<h2>${esc(TYPE_MANY[t] || t)}</h2><div class="grid">${byType[t].sort((a, b) => +a.split("|")[1] - +b.split("|")[1]).map((k) => `<a class="card" href="/m/podborka/${podSlug[k]}/"><b>${esc(podName(k))}</b><small>${groups[k].length} ${plural(groups[k].length, "модель", "модели", "моделей")}</small></a>`).join("")}</div>`).join("")}`;
  files.set("m/podborka/index.html", page({ title: "Подборки мотоциклов, питбайков и эндуро по объёму | MotoHelper", desc: "Эндуро 250, эндуро 300, питбайки 125 и 150 и другие классы: все модели в одной таблице — мотор, мощность, масло.", canon: SITE + "m/podborka/", crumbs, body, ld: [crumbLd(crumbs)] }));
}

/* Telegram-канал: tg/posts.json (что и когда публиковать — читает ИИ-сервер) и tg/cards.json (из чего scripts/tg-cards.js
   рисует картинки img/tg/<id>.jpg). Расписание, советы, праздники и факты — в scripts/tg-posts.js, свои посты — в tg/manual.json. */
{
  const manual = JSON.parse(fs.readFileSync(path.join(ROOT, "tg/manual.json"), "utf8"));
  const tg = require("./tg-posts")({ ROOT, SITE, ENGINES, BIKES, GUIDES, bikesOf, engSlug, bikeSlug, brandSlug, brief, briefOil, briefValves, plural,
    PHOTOS, photoSlug: ctx.__PS, SPARK_X: ctx.SPARK_X || {}, FLAGSHIP, MODEL_TUNE_KEYS, manual });
  files.set("tg/posts.json", JSON.stringify({ _: "Собрано scripts/build-pages.js (scripts/tg-posts.js + tg/manual.json). Время — по Москве. Свои посты — в tg/manual.json", channel: manual.channel, posts: tg.posts }, null, 1) + "\n");
  files.set("tg/cards.json", JSON.stringify({ _: "Картинки постов: node scripts/tg-cards.js рисует недостающие img/tg/<id>.jpg", cards: tg.cards }, null, 1) + "\n");
  const miss = tg.posts.filter((p) => p.date >= require("./tg-posts").START && !p.photo).length;
  if (miss && !check) console.log("Telegram: " + miss + " постов без картинки — запусти node scripts/tg-cards.js и пересобери");
}

/* Telegram-бот: справочник для ответов в личке, разбитый на мелкие файлы tg/idx/<первые 2 знака>.json — у сервера на
   бесплатном тарифе 10 мс процессора на запрос, поэтому он читает только файлы для слов вопроса.
   В файле: слово латиницей → [[вес, номер строки]]; строки — по 100 в tg/idx/l<номер/100>.json;
   инструкции и поломки — tg/idx/g.json с основами слов. */
{
  const ok = (v) => v && v !== "—";
  const facts = (e) => [e.code + (e.cc ? " " + Math.round(e.cc) + " см³" : "") + (e.hp ? " " + e.hp + " л.с." : ""), ok(e.oil) ? "масло " + e.oil + (ok(e.oilVol) ? " " + e.oilVol : "") : "", ok(e.spark) ? "свеча " + e.spark + (ok(e.gap) ? " зазор " + e.gap : "") : "", ok(e.valveIn) ? "клапаны впуск " + e.valveIn + " выпуск " + (e.valveEx || "—") : "", e.start ? "запуск " + e.start + (e.groups.indexOf("kick") < 0 ? " (кикстартера нет)" : "") + (e.groups.indexOf("estart") < 0 ? " (электростартера нет)" : "") : ""].filter(Boolean).join("; ");
  // те же правила, что в worker/motohelper-ai.js (latTokens, tokW)
  const LAT = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
  const latTokens = (x) => { const w = String(x).toLowerCase().split("").map((c) => (c in LAT ? LAT[c] : c)).join("").match(/[a-z0-9]+/g) || []; return w.concat(w.slice(1).map((y, i) => w[i] + y)); };
  const tokW = (t) => (/\d/.test(t) && /[a-z]/.test(t) ? (t.length > 2 ? 3 : 2) : /^\d+$/.test(t) ? 1 : t.length >= 4 ? 1 : 0);
  const inv = {}, lines = [];
  const add = (name, line) => { const id = lines.push(line) - 1; new Set(latTokens(name)).forEach((t) => { const w = tokW(t); if (w) (inv[t] = inv[t] || []).push([w, id]); }); };
  BIKES.forEach((b) => add(b.brand + " " + b.name, b.brand + " " + b.name + ": мотор " + facts(ENGINES[b.versions[0].engine]) + " — " + SITE + "m/" + bikeSlug.get(b) + "/"));
  engIds.forEach((id) => add(ENGINES[id].code, "Мотор " + facts(ENGINES[id]) + " — " + SITE + "m/motor/" + engSlug[id] + "/"));
  const shards = {};
  Object.keys(inv).sort().forEach((t) => { if (inv[t].length > 40) return; const c = t.slice(0, 2); (shards[c] = shards[c] || {})[t] = inv[t]; }); // слишком общие слова («250», «motoland») не ищем
  Object.keys(shards).forEach((c) => files.set("tg/idx/" + c + ".json", JSON.stringify(shards[c]) + "\n"));
  for (let i = 0; i * 100 < lines.length; i++) files.set("tg/idx/l" + i + ".json", JSON.stringify(lines.slice(i * 100, i * 100 + 100)) + "\n");
  // основа слова без окончания: «масло»/«масла» → «масл», «цепь»/«цепи» → «цеп» (так же в worker/motohelper-ai.js)
  const stems = (x) => (String(x).toLowerCase().replace(/ё/g, "е").match(/[а-я]{4,}/g) || []).map((w) => w.slice(0, Math.max(3, Math.min(5, w.length - 1))));
  const g = GUIDES.map((x) => [x.title, SITE + "m/remont/" + x.id + "/"]).concat(DIAG.map((x) => [x.title, SITE + "m/polomka/" + x.id + "/"])).map((x) => [x[0] + " — " + x[1], [...new Set(stems(x[0]))]]);
  files.set("tg/idx/g.json", JSON.stringify(g) + "\n");
}

/* «гаражный» режим: кнопки под палец в перчатке (не меньше 44 px), быстрые переходы, ✓ у цифр из руководства, яркость на солнце */
const GARAGE_CSS = `.share,.sub{margin:22px 0 8px;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.03)}.share>b,.sub>b{display:block;font:700 16px var(--cond);margin-bottom:4px}.share .chips,.sub .chips{margin:8px 0 0}.share button.chip,.sub button.chip{cursor:pointer;color:inherit;font:inherit;border:1px solid var(--line);background:var(--card)}.share-msg{display:block;margin-top:6px;color:#3DDC97}.sub p{margin:0}.pn{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin:14px 0}.chip[hidden]{display:none}.chip{max-width:100%;white-space:normal;overflow-wrap:anywhere}details.more{margin:6px 0 10px}details.more>summary{cursor:pointer;display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border:1px solid var(--line);border-radius:10px;font:600 15px var(--cond)}.vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.pc-plus li::marker{content:"+ ";color:#3DDC97}.pc-minus li::marker{content:"– ";color:#F5B041}.wr-static{background:#0E1013;border:1px solid var(--line);border-radius:14px;padding:8px;margin:8px 0}.wr-static svg{width:100%;max-width:520px;height:auto;display:block;margin:0 auto}.wr-legend{list-style:none;padding:0;margin:8px 0;display:grid;gap:8px}.wr-legend li{display:flex;gap:10px;align-items:center;line-height:1.35}.wr-legend i{width:30px;height:8px;border-radius:4px;flex:none}.nw,.tu-top .cu-price{white-space:nowrap}.tr-role{display:inline-block;padding:0 7px;border-radius:999px;font:700 11px/1.6 var(--cond);text-transform:uppercase;letter-spacing:.04em;border:1px solid currentColor;vertical-align:1px}.r-main{color:#8A8CFF}.r-must{color:#F5B041}.r-opt{color:var(--muted)}.tu-ul{margin:4px 0 0;padding-left:18px}.tu-ul li{margin:2px 0}.tu-stage li .small{color:var(--muted)}.tu{display:grid;gap:10px;margin:8px 0}@media(min-width:700px){.tu{grid-template-columns:1fr 1fr}}.tu-item{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03)}.tu-top{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.tu-top b{font-size:16px}.tu-top b a{display:inline-block;padding:12px 0;margin:-12px 0}.tu-item p{margin:2px 0 0;font-size:15px;line-height:1.45}.tu-g{font-size:14px;margin-top:4px}.tu-stages{display:grid;gap:10px;margin:6px 0 10px}@media(min-width:700px){.tu-stages{grid-template-columns:1fr 1fr}}.tu-stage{padding:12px 14px;border-radius:12px;border:1px solid rgba(138,140,255,.45);background:rgba(138,140,255,.06)}.tu-stage h3{margin:0 0 2px;font-size:17px}.tu-stage ol{margin:8px 0 6px;padding-left:20px;line-height:1.5}.tu-sum{margin:0;font-weight:700}.cu{display:grid;gap:10px;margin:8px 0}@media(min-width:700px){.cu{grid-template-columns:1fr 1fr}}.cu-card{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03)}.cu-kick{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#8A8CFF}.cu-card b{font-size:17px}.cu-spec{color:#9BD4FF;font-size:14px;font-weight:600}.cu-eff{color:#B9C2CF;font-size:14px}.cu-nu{margin:6px 0 4px;padding-left:20px;font-size:15px;line-height:1.5}.cu-nu li{margin:4px 0}.cu-card p{margin:2px 0 0;font-size:15px;line-height:1.45}.cu-price{font-weight:700;font-size:15px}.chip{display:inline-flex;align-items:center;min-height:44px;padding:8px 14px;font-size:15px;border-radius:10px}
.chips{gap:8px}.crumbs a{display:inline-block;padding:12px 0}
.jump{display:flex;gap:8px;overflow-x:auto;margin:0 0 14px;padding-bottom:4px;scrollbar-width:none}.jump::-webkit-scrollbar{display:none}
.jump a{flex:0 0 auto;display:inline-flex;align-items:center;min-height:48px;padding:0 18px;border-radius:12px;background:#fff;color:#000;font:600 16px var(--cond);text-decoration:none}
.jump a:active{transform:scale(.97)}
.vf{font-style:normal;font-weight:700;color:#3ddc84;margin-left:6px}
.tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px}.tools span{width:100%;font:600 13px var(--cond);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.tools a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.28);color:#fff;font:600 15px var(--cond);text-decoration:none}
.grp .small{font-size:13px;color:var(--muted);margin:8px 0 0}
.grp[id],h2[id]{scroll-margin-top:72px}
.note.src{font-size:14px}
footer a{display:inline-block;padding:12px 0}
.logo i{background:linear-gradient(135deg,#3AF2CF 0%,#4E95FF 38%,#9B6BFF 68%,#FF6FD0 100%);color:#0A0A0A;border-radius:9px;font-weight:900;box-shadow:0 6px 18px -8px rgba(155,107,255,.8)}
.tile.k{display:block;color:inherit;text-decoration:none;min-height:44px}.tile.k:active{transform:scale(.98)}
.tile.k b{font-size:24px;line-height:1.15;margin-top:4px}.tile.k.wide{grid-column:1/-1}.tile.k small{display:block;margin-top:4px;font:500 14px/1.3 var(--body);color:var(--muted)}
.tile .src{display:inline-block;margin-top:6px;font:600 12px var(--cond);font-style:normal;letter-spacing:.04em;text-transform:uppercase;color:#f5b041}.tile .src.ok{color:#3ddc84}
.typ{font-style:normal;margin-left:8px;padding:1px 6px;border-radius:6px;border:1px solid rgba(245,176,65,.6);color:#f5b041;font:600 11px var(--cond);letter-spacing:.04em;text-transform:uppercase;vertical-align:2px;white-space:nowrap}
.buyrow{padding:10px 0;border-top:1px solid var(--line)}.buyrow:first-of-type{border-top:0}.buyrow b{display:block;font:600 16px var(--body)}
.buyrow span{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:8px;margin-top:8px;padding-bottom:2px;scrollbar-width:none}.buyrow span::-webkit-scrollbar{display:none}.buyrow a{flex:0 0 auto}.buyrow a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.28);color:#fff;font:600 15px var(--cond);text-decoration:none}
.buyrow a small{margin-left:6px;font-size:11px;color:var(--muted)}
@media (max-width:600px){.mphoto{padding:2% 4%}.mphoto img{max-height:190px;width:auto;max-width:100%}.hero .lead{font-size:15px;margin-bottom:6px}.tiles{grid-template-columns:1fr 1fr}}
@media (prefers-contrast:more){:root{--muted:#d0d0d0}.grp,.tile{border-color:#fff!important}.grp dt{color:#e6e6e6}.tile .src{color:#ffc65c}}
/* генеральная репетиция: таблицы на телефоне — первый столбец на месте, подсказка-тень справа, без разрывов кодов посреди слова */
.tbl td a{overflow-wrap:normal}.tbl:not(.cmp) td,.tbl:not(.cmp) th{min-width:5.5em}
.tbl:not(.cmp) tr>:first-child{position:sticky;left:0;z-index:1;background:var(--card)}.tbl:not(.cmp) tr>th:first-child{background:#0A0A0A}
.tbl.cmp td,.tbl.cmp th{overflow-wrap:break-word;hyphens:auto}
.tblw{background:linear-gradient(270deg,var(--card) 40%,rgba(22,26,33,0)) 100% 0/28px 100% no-repeat local,linear-gradient(270deg,rgba(255,255,255,.16),transparent) 100% 0/14px 100% no-repeat scroll,var(--card)!important}
.tbl td small{font-size:13px}.iss .sev,.typ,.tr-role{font-size:12px}
/* заголовки внутри карточки версии — с отступом сверху (кроме первого) */
.ver>h2:not(:first-child){margin-top:26px}
/* каталог на узком телефоне — две колонки */
@media(max-width:400px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.showcase{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.grid .card{min-width:0;overflow-wrap:break-word;hyphens:auto}.card.big b{font-size:16px}.show img{height:84px}.show b{font-size:15px}}
/* плитки с цифрами без дыр */
.tile.k.wide+.tile.k:last-child{grid-column:1/-1}
@media(min-width:700px){.tiles:has(>.tile.k){grid-template-columns:repeat(5,minmax(0,1fr))}.tile.k.wide,.tile.k.wide+.tile.k:last-child{grid-column:span 2}}
/* компьютер: характеристики колонками без растяжения, «Где купить» не обрезается, фото не на весь экран */
@media(min-width:900px){.groups{display:block;columns:3 260px;column-gap:12px}.groups>.grp,.groups>*{break-inside:avoid;margin:0 0 12px}.mphoto img{max-height:340px;width:auto;margin:0 auto}}
.buyrow span{flex-wrap:wrap;overflow:visible}
/* надписи-чипы, которые не нажимаются (версии) — тише кнопок */
span.chip{min-height:30px;padding:3px 10px;font:500 13px var(--cond);background:transparent;border-color:rgba(255,255,255,.14);color:var(--muted)}
/* схема электрики на телефоне — крупно, прокруткой вбок */
@media(max-width:600px){.wr-static{overflow-x:auto}.wr-static svg{width:520px;max-width:none}}
.wr-legend li{display:grid;grid-template-columns:30px 8.5em 1fr;column-gap:10px}.wr-legend i{box-shadow:0 0 0 1px rgba(255,255,255,.3)}
/* якоря быстрого перехода — не ярче главной кнопки; на компьютере переносятся */
.jump a{background:var(--card2);color:var(--ink);border:1px solid rgba(255,255,255,.18);min-height:44px}@media(min-width:700px){.jump{flex-wrap:wrap;overflow:visible}}
.search input{border-radius:14px}.top{padding-inline:max(16px,calc((100% - 940px)/2 + 16px))}
/* подвал: ссылки списком без дыр */
.tile b.long{overflow-wrap:anywhere}.fnav{display:flex;flex-wrap:wrap;gap:0 16px;margin-top:8px}.fnav a{display:inline-flex;align-items:center;min-height:40px;padding:0}`;
files.set("m/m.css", fs.readFileSync(path.join(ROOT, "fonts/fonts.css"), "utf8") + "\n" + CSS + "\n" + GARAGE_CSS + "\n");
files.set("m/ask.js", ASK_JS + "\n");
files.set("m/share.js", SHARE_JS + "\n");
files.set("m/rv.js", RV_JS + "\n");
files.set("m/fb.js", FB_JS + "\n");
/* сводные таблицы по моторам: /m/maslo/, /m/svechi/, /m/klapany/ — под общие запросы («какое масло заливать в мотоцикл»,
   «свеча на питбайк», «зазоры клапанов таблица»). Значения — из базы, «по мануалу» не показываем. */

/* «Свеча NGK CR8E: аналоги и на каких мотоциклах стоит» — запросы «cr8e аналог», «d8ea на какие мотоциклы» */
const SPARK_PAGES = [];
{
  const okv = (x) => x && x !== "—" && !/мануал/i.test(x);
  const most = (L) => { const c = {}; L.filter(Boolean).forEach((v) => (c[v] = (c[v] || 0) + 1)); const t = Object.keys(c).sort((a, b) => c[b] - c[a])[0]; return t ? [t, c[t], L.filter(Boolean).length] : null; };
  const heat = (k) => +((k.match(/[A-Z]+(\d{1,2})/) || [])[1] || 0);
  SPARK_CODES.filter((k) => SPARK_ENG[k]).forEach((k) => {
    const x = ctx.SPARK_X[k], ids = SPARK_ENG[k].slice().sort((a, b) => (bikesOf[b] || []).length - (bikesOf[a] || []).length);
    const models = [...new Set([].concat(...ids.map((id) => bikesOf[id] || [])))].filter((b) => b.brand !== "Любая модель");
    const gap = most(ids.map((id) => okv(ENGINES[id].gap) ? brief(ENGINES[id].gap) : "")), tq = most(ids.map((id) => okv(ENGINES[id].sparkTorque) ? brief(ENGINES[id].sparkTorque) : ""));
    /* соседи по калильному числу той же серии: CR7E — горячее, CR9E — холоднее */
    const fam = k.replace(/\d{1,2}/, "#"), sib = SPARK_CODES.filter((y) => y !== k && y.replace(/\d{1,2}/, "#") === fam && SPARK_ENG[y]).sort((a, b) => heat(a) - heat(b));
    const slug = sparkSlug(k), canon = SITE + "m/svecha/" + slug + "/";
    const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Свечи", "/m/svechi/"], ["NGK " + k, null]];
    const an = ["Denso " + x[0]].concat(x[1] ? ["Torch " + x[1]] : []);
    const faq = [
      ["Чем заменить свечу NGK " + k + "?", "Прямые аналоги: " + an.join(", ") + ". Калильное число и резьба у них те же — ставь любую из них."],
      gap && ["Какой зазор у свечи NGK " + k + "?", (gap[1] >= gap[2] / 2 ? "Чаще всего " : "Обычно ") + gap[0] + " — но смотри мануал своего мотора: зазор зависит от системы зажигания."],
      ["На какие мотоциклы ставится NGK " + k + "?", models.slice(0, 8).map((b) => b.brand + " " + b.name).join(", ") + (models.length > 8 ? " и ещё " + (models.length - 8) + " " + plural(models.length - 8, "модель", "модели", "моделей") : "") + "."],
      sib.length && ["Можно ли поставить свечу холоднее или горячее?", "У NGK чем больше цифра, тем свеча холоднее. Соседние: " + sib.map((y) => "NGK " + y + (heat(y) < heat(k) ? " (горячее)" : " (холоднее)")).join(", ") + ". Холоднее ставят после тюнинга и при езде на высоких оборотах, горячее — если свеча чёрная от нагара на коротких поездках."]
    ].filter(Boolean).map((q) => [q[0], /[.!?]$/.test(q[1]) ? q[1] : q[1] + "."]);
    const body = `<section class="hero"><div class="kick">Свеча зажигания</div><h1>Свеча NGK ${esc(k)}: аналоги и на каких мотоциклах стоит</h1>
<p class="lead">Аналоги: ${esc(an.join(", "))}. Стоит на ${ids.length} ${plural(ids.length, "моторе", "моторах", "моторах")} и ${models.length} ${plural(models.length, "модели", "моделях", "моделях")} в базе MotoHelper.</p></section>
<h2>Аналоги</h2><div class="tblw"><table class="tbl"><tr><th>NGK</th><th>Denso</th><th>Torch</th></tr><tr><td>${esc(k)}</td><td>${esc(x[0] || "—")}</td><td>${esc(x[1] || "—")}</td></tr></table></div>
<ul class="plain">${gap ? `<li>Зазор: <b>${esc(gap[0])}</b>${gap[2] > 1 ? ` (так у ${gap[1]} из ${gap[2]} моторов)` : ""}</li>` : ""}${tq ? `<li>Момент затяжки: <b>${esc(tq[0])}</b></li>` : ""}<li>Проверять и менять — по регламенту мотора; цвет нагара подскажет смесь: <a href="/m/polomka/plug/">цвет свечи</a>.</li></ul>
<h2>Моторы со свечой ${esc(k)}</h2><div class="chips">${ids.slice(0, 30).map((id) => `<a class="chip" href="/m/motor/${engSlug[id]}/">${esc(ENGINES[id].code)}${ENGINES[id].cc ? " · " + Math.round(ENGINES[id].cc) + " см³" : ""}</a>`).join("")}</div>
<h2>Мотоциклы со свечой ${esc(k)}</h2><div class="chips">${models.slice(0, 40).map((b) => `<a class="chip" href="/m/${bikeSlug.get(b)}/">${esc(b.brand + " " + b.name)}</a>`).join("")}</div>${models.length > 40 ? `<p class="small">И ещё ${models.length - 40} — на страницах моторов выше.</p>` : ""}
${sib.length ? `<h2>Горячее и холоднее</h2><div class="chips">${sib.map((y) => `<a class="chip" href="/m/svecha/${sparkSlug(y)}/">NGK ${esc(y)} ${heat(y) < heat(k) ? "— горячее" : "— холоднее"}</a>`).join("")}</div>` : ""}
<h2>Частые вопросы</h2><div class="faq">${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join("")}</div>
<div class="chips"><a class="chip" href="/m/remont/spark/">Как проверить и поменять свечу →</a><a class="chip" href="/m/svechi/">Свечи: таблица по моторам →</a></div>`;
    const desc = `Свеча NGK ${k}: аналоги ${an.join(", ")}${gap ? ", зазор " + gap[0] : ""}. На каких мотоциклах стоит: ${models.slice(0, 3).map((b) => b.brand + " " + b.name).join(", ")}${models.length > 3 ? " и другие" : ""}.`;
    files.set("m/svecha/" + slug + "/index.html", page({ title: pickTitle("Свеча NGK " + k, [": аналоги Denso, Torch и на какие мотоциклы | MotoHelper", ": аналоги Denso, Torch и на какие мотоциклы", ": аналоги и мотоциклы", ""]), desc, canon, crumbs, body, ask: "свеча NGK " + k,
      ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: "Свеча NGK " + k, url: canon, inLanguage: "ru", description: desc },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }] }));
    SPARK_PAGES.push({ k, canon, n: models.length });
  });
}

/* «Масляный фильтр HiFlo HF204RC: на какие мотоциклы подходит» — по таблице аналогов расходников CROSS */
{
  CONS_PAGES.forEach((x) => {
    const [what, brand] = CONS_KIND[x.kind], title = what + " " + brand + " " + x.code, canon = SITE + "m/rashodnik/" + x.key + "/";
    const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Расходники", "/m/rashodnik/"], [brand + " " + x.code, null]];
    const byB = new Map(); x.rows.forEach((r) => { const L = byB.get(r.b) || []; L.push(r); byB.set(r.b, L); });
    const models = [...byB.keys()].sort((a, c) => COLL.compare(a.brand + " " + a.name, c.brand + " " + c.name));
    const engs = [...new Set(models.map((b) => b.versions[0].engine))].filter((id) => engSlug[id]);
    const brands = [...new Set(models.map((b) => b.brand))];
    const rowsHtml = models.map((b) => { const L = byB.get(b), yrs = [...new Set(L.map((r) => r.y).filter(Boolean))].join(", "), wh = [...new Set(L.map((r) => r.where).filter(Boolean))].sort((p, q) => (p === "перед" ? -1 : 1) - (q === "перед" ? -1 : 1)).join(" и ");
      return `<tr><td><a href="/m/${bikeSlug.get(b)}/">${esc(b.brand + " " + b.name)}</a></td><td>${esc(yrs || "все годы")}</td>${x.kind === "pf" || x.kind === "pr" || x.kind === "pads" ? `<td>${esc(wh || "—")}</td>` : ""}</tr>`; }).join("");
    const pads = x.kind === "pf" || x.kind === "pr" || x.kind === "pads";
    const faq = [
      ["На какие мотоциклы подходит " + brand + " " + x.code + "?", models.slice(0, 10).map((b) => b.brand + " " + b.name).join(", ") + (models.length > 10 ? " и ещё " + (models.length - 10) + " " + plural(models.length - 10, "модель", "модели", "моделей") : "") + ". Годы выпуска — в таблице: у некоторых моделей номер зависит от поколения."],
      ["Как не ошибиться с " + what.toLowerCase() + "?", "Сверь номер по году выпуска и по старой детали: " + (x.kind === "oil" ? "диаметр, резьбу и высоту фильтра" : x.kind === "air" ? "форму и размер воздушного фильтра" : x.kind === "bat" ? "размеры, полярность и ёмкость аккумулятора" : "форму колодки и крепление в суппорте") + ". Оригинальный номер (OEM) — в мануале и каталоге производителя."]
    ];
    const body = `<section class="hero"><div class="kick">${esc(what)}</div><h1>${esc(title)}: на какие мотоциклы подходит</h1>
<p class="lead">${models.length} ${plural(models.length, "модель", "модели", "моделей")} ${brands.length > 1 ? "от " + brands.length + " " + plural(brands.length, "марки", "марок", "марок") : brands[0]} в базе MotoHelper. Номера ${esc(brand)} — по каталогам производителя; перед покупкой сверь по году выпуска и по старой детали.</p></section>
<h2>Мотоциклы</h2><div class="tblw"><table class="tbl"><tr><th>Модель</th><th>Годы</th>${pads ? "<th>Ось</th>" : ""}</tr>${rowsHtml}</table></div>
${engs.length ? `<h2>Моторы</h2><div class="chips">${engs.slice(0, 20).map((id) => `<a class="chip" href="/m/motor/${engSlug[id]}/">${esc(ENGINES[id].code)}</a>`).join("")}</div>` : ""}
<h2>Частые вопросы</h2><div class="faq">${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join("")}</div>
<div class="chips"><a class="chip" href="/m/rashodnik/">Все расходники по номерам →</a>${x.kind === "oil" ? `<a class="chip" href="/m/remont/oil/">Как поменять масло и фильтр →</a>` : x.kind === "air" ? `<a class="chip" href="/m/remont/airfilter/">Как обслужить воздушный фильтр →</a>` : pads ? `<a class="chip" href="/m/remont/pads/">Как поменять колодки →</a>` : ""}</div>`;
    const desc = `${title}: на какие мотоциклы подходит — ${models.slice(0, 4).map((b) => b.brand + " " + b.name).join(", ")}${models.length > 4 ? " и ещё " + (models.length - 4) : ""}. Годы выпуска и моторы.`;
    files.set("m/rashodnik/" + x.key + "/index.html", page({ title: pickTitle(title, [": на какие мотоциклы подходит | MotoHelper", ": на какие мотоциклы подходит", ": мотоциклы", ""]), desc, canon, crumbs, body,
      ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: title, url: canon, inLanguage: "ru", description: desc },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }] }));
    x.canon = canon; x.n = models.length;
  });
  /* каталог расходников по номерам */
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Расходники", null]];
  const group = (kinds, h) => { const L = CONS_PAGES.filter((x) => kinds.indexOf(x.kind) >= 0).sort((a, b) => b.n - a.n);
    return L.length ? `<h2>${h}</h2><div class="chips">${L.map((x) => `<a class="chip" href="/m/rashodnik/${x.key}/">${esc(CONS_KIND[x.kind][1] + " " + x.code)} · ${x.n}</a>`).join("")}</div>` : ""; };
  const body = `<section class="hero"><div class="kick">Расходники</div><h1>Расходники по номерам: на какие мотоциклы подходят</h1><p class="lead">Масляные фильтры HiFlo, воздушные K&amp;N, колодки EBC и аккумуляторы Yuasa — какой номер на какие мотоциклы. Цифра — сколько моделей в базе.</p></section>
${group(["oil"], "Масляные фильтры HiFlo")}${group(["air"], "Воздушные фильтры K&amp;N")}${group(["pf", "pr", "pads"], "Тормозные колодки EBC")}${group(["bat"], "Аккумуляторы Yuasa")}
<div class="chips"><a class="chip" href="/m/svechi/">Свечи: таблица и аналоги →</a><a class="chip" href="/m/maslo/">Масло: таблица по моторам →</a></div>`;
  if (CONS_PAGES.length) files.set("m/rashodnik/index.html", page({ title: "Расходники мотоцикла по номерам: фильтры HiFlo, K&N, колодки EBC | MotoHelper", desc: "Масляные фильтры HiFlo, воздушные K&N, колодки EBC и аккумуляторы Yuasa: какой номер на какие мотоциклы подходит, по годам выпуска.", canon: SITE + "m/rashodnik/", crumbs, body, ld: [crumbLd(crumbs)] }));
}
const HUBS = [];
{
  const okv = (x) => x && x !== "—" && !/мануал/i.test(x);
  const REG = [["cn", "Китайские, корейские и тайваньские моторы"], ["jp", "Японские моторы"], ["eu", "Европейские и американские моторы"], ["in", "Индийские моторы"], ["ru", "Моторы СССР и России"]];
  const regOf = (e) => { const g = e.groups || []; return g.indexOf("jp") >= 0 ? "jp" : g.indexOf("eu") >= 0 || /Harley|Buell|Indian|Victory/i.test(e.maker || "") ? "eu" : g.indexOf("in") >= 0 ? "in" : g.indexOf("ru") >= 0 ? "ru" : "cn"; };
  const LIMIT = { cn: 80, jp: 60, eu: 50, in: 20, ru: 20 };
  const engCell = (id) => { const e = ENGINES[id]; return `<td><a href="/m/motor/${engSlug[id]}/">${esc(e.code)}</a><br><small>${[e.cc ? Math.round(e.cc) + " см³" : "", e.stroke || "", bikesOf[id].length + " " + plural(bikesOf[id].length, "модель", "модели", "моделей")].filter(Boolean).join(" · ")}</small></td>`; };
  /* самое частое значение среди моторов, подходящих под условие: «чаще всего — 10W-40 (у 120 из 180)» */
  const mostOf = (ids, f) => { const c = {}; ids.forEach((id) => { const v = f(ENGINES[id]); if (v) c[v] = (c[v] || 0) + 1; }); const top = Object.keys(c).sort((a, b) => c[b] - c[a])[0];
    return top && c[top] >= ids.length / 3 ? [top, c[top], ids.length] : null; }; // редкое «самое частое» — не ответ
  /* «из 121 китайского мотора» / «из 75 китайских моторов» (родительный падеж после «из N») */
  const ofN = (n, one, many) => n + " " + (n % 10 === 1 && n % 100 !== 11 ? one : many);
  /* объём масла: от–до у большинства (без крайних 10 %) и типичный */
  const volRange = (ids) => { const v = ids.map((id) => parseFloat(String(ENGINES[id].oilVol).replace(",", ".").replace(/^[^\d]*/, ""))).filter((x) => x > 0 && x < 10).sort((a, b) => a - b);
    if (v.length < 10) return null; const q = (k) => v[Math.min(v.length - 1, Math.floor(k * v.length))]; return [q(0.1), q(0.5), q(0.9), v.length]; };
  const oilBase = (o) => { const m = String(o).match(/\b\d{1,2}W-?\d{2}\b/); return m ? m[0].replace(/W(\d)/, "W-$1") : ""; };
  const defs = [
    { slug: "maslo", kick: "Масло", h1: "Какое масло заливать в мотоцикл", title: "Какое масло заливать в мотоцикл и питбайк: таблица по моторам | MotoHelper",
      lead: "Масло, объём и интервал замены для популярных моторов — китайских, японских, европейских. Нажми на мотор — там свеча, клапаны, жиклёры и слабые места.",
      cols: ["Масло", "Объём", "Замена"], has: (e) => okv(e.oil) && okv(e.oilVol),
      row: (e, id) => [e.oil, e.oilVol, e.oilInt ? (hoursEvery(e.oilInt, "oil", e, bikesOf[id][0]) || kmh(e.oilInt, e, bikesOf[id][0])).replace(/^каждые /, "") : "—"],
      faq: (ids) => { const cn4 = ids.filter((id) => regOf(ENGINES[id]) === "cn" && ENGINES[id].stroke !== "2T" && ENGINES[id].cc >= 100 && ENGINES[id].cc <= 300);
        const t = mostOf(cn4, (e) => oilBase(e.oil)), v = volRange(cn4.filter((id) => ENGINES[id].cc >= 240));
        return [t && ["Какое масло заливать в китайский мотоцикл или питбайк?", `Чаще всего — ${t[0]} для мотоциклов (JASO MA / MA2, с мокрым сцеплением): так у ${t[1]} из ${ofN(t[2], "китайского 4-тактного мотора", "китайских 4-тактных моторов")} 100–300 см³ в базе. Точное масло своего мотора — в строке таблицы.`],
          v && ["Сколько масла заливать в мотор 250–300 см³?", `Обычно от ${v[0]} до ${v[2]} л, типично около ${v[1]} л (по ${v[3]} ${v[3] % 10 === 1 && v[3] % 100 !== 11 ? "китайскому мотору" : "китайским моторам"} 240–300 см³ в базе). Точный объём своего мотора — в таблице; уровень после замены проверяй по щупу или окошку.`],
          ["Можно ли заливать автомобильное масло в мотоцикл?", "В мотор с мокрым сцеплением (почти все мотоциклы и питбайки) — нет: антифрикционные присадки автомобильного масла заставляют сцепление проскальзывать. Нужно мотоциклетное масло с допуском JASO MA или MA2."]].filter(Boolean); } },
    { slug: "svechi", kick: "Свечи", h1: "Свечи зажигания для мотоциклов и питбайков", title: "Свечи зажигания для мотоциклов и питбайков: таблица по моторам | MotoHelper",
      lead: "Какая свеча стоит и какой у неё зазор — для популярных моторов. Аналоги NGK, Denso, Torch — ниже и на странице мотора.",
      cols: ["Свеча", "Зазор"], has: (e) => okv(e.spark), row: (e) => [e.spark, okv(e.gap) ? e.gap : "—"],
      faq: (ids) => { const pit = ids.filter((id) => regOf(ENGINES[id]) === "cn" && ENGINES[id].cc >= 100 && ENGINES[id].cc <= 160 && (ENGINES[id].groups || []).indexOf("horiz") >= 0);
        const t = mostOf(pit, (e) => e.spark), g = mostOf(ids.filter((id) => regOf(ENGINES[id]) === "cn"), (e) => okv(e.gap) ? e.gap : "");
        return [t && ["Какая свеча стоит на питбайке 125–150?", `Чаще всего — ${t[0]}: так у ${t[1]} из ${ofN(t[2], "горизонтального мотора", "горизонтальных моторов")} 100–160 см³ в базе.`],
          g && ["Какой зазор свечи на китайском мотоцикле?", `Чаще других — ${g[0]} (у ${g[1]} из ${ofN(g[2], "китайского мотора", "китайских моторов")} в базе). Зазор проверяют круглым щупом, у иридиевых свечей электрод не подгибают.`]].filter(Boolean); } },
    { slug: "klapany", kick: "Клапаны", h1: "Зазоры клапанов: таблица по моторам", title: "Зазоры клапанов мотоцикла и питбайка: таблица по моторам | MotoHelper",
      lead: "Тепловые зазоры впускных и выпускных клапанов на холодном моторе и как часто их проверять. Как регулировать — в инструкции.",
      cols: ["Впуск", "Выпуск", "Проверка"], has: (e) => okv(e.valveIn) && okv(e.valveEx) && e.stroke !== "2T",
      row: (e, id) => [e.valveIn, e.valveEx, e.valveInt ? (hoursEvery(e.valveInt, "valve", e, bikesOf[id][0]) || kmh(e.valveInt, e, bikesOf[id][0])).replace(/^каждые /, "") : "—"],
      faq: (ids) => { const c = ids.filter((id) => regOf(ENGINES[id]) === "cn" && /SOHC/i.test(ENGINES[id].cam || "") && (ENGINES[id].groups || []).indexOf("horiz") >= 0);
        const t = mostOf(c, (e) => e.valveIn + " / " + e.valveEx);
        return [t && ["Какие зазоры клапанов на питбайке с горизонтальным мотором?", `Чаще всего впуск / выпуск ${t[0]}: так у ${t[1]} из ${ofN(t[2], "горизонтального мотора", "горизонтальных моторов")} в базе. Мерить на холодном моторе в ВМТ такта сжатия.`],
          ["Как понять, что пора регулировать клапаны?", "Мотор цокает на холостых, хуже заводится на горячую, падает компрессия. Зажатый клапан опаснее стучащего: он прогорает. Проверяй по интервалу из таблицы, на холодном моторе."]].filter(Boolean); } },
  ];
  defs.forEach((d) => {
    const ids = popular.filter((id) => d.has(ENGINES[id]));
    const seen = new Set();
    const sections = REG.map(([rg, rt]) => {
      const list = ids.filter((id) => regOf(ENGINES[id]) === rg && !seen.has(ENGINES[id].code + "|" + ENGINES[id].cc) && seen.add(ENGINES[id].code + "|" + ENGINES[id].cc)).slice(0, LIMIT[rg]);
      return list.length ? `<h2>${rt}</h2><div class="tblw"><table class="tbl"><tr><th>Мотор</th>${d.cols.map((c) => `<th>${c}</th>`).join("")}</tr>${list.map((id) => `<tr>${engCell(id)}${d.row(ENGINES[id], id).map((v) => `<td>${esc(v || "—")}</td>`).join("")}</tr>`).join("")}</table></div>` : "";
    }).join("\n");
    const faq = d.faq(ids).map((q) => [q[0], /[.!?]$/.test(q[1]) ? q[1] : q[1] + "."]);
    const other = defs.filter((x) => x !== d).map((x) => `<a class="chip" href="/m/${x.slug}/">${esc(x.h1)}</a>`).join("");
    const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], [d.kick, null]];
    const body = `<section class="hero"><div class="kick">${d.kick}</div><h1>${d.h1}</h1><p class="lead">${d.lead}</p>
<div class="chips"><a class="chip" href="/m/motor/">Все моторы →</a>${other}${CONS_PAGES.length ? `<a class="chip" href="/m/rashodnik/">Фильтры, колодки, АКБ по номерам</a>` : ""}</div></section>
<p class="note">Не нашёл свой мотор — открой <a href="/m/motor/">список моторов</a> или найди модель в <a href="/m/">каталоге</a>. Данные справочные: перед работой сверься с мануалом своего мотоцикла.</p>
${d.slug === "svechi" && SPARK_PAGES.length ? `<h2>Аналоги свечей NGK, Denso, Torch</h2><div class="chips">${SPARK_PAGES.slice().sort((a, b) => b.n - a.n).map((x) => `<a class="chip" href="/m/svecha/${sparkSlug(x.k)}/">NGK ${esc(x.k)}</a>`).join("")}</div>` : ""}
${sections}
${faq.length ? `<h2>Частые вопросы</h2><div class="faq">${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join("")}</div>` : ""}`;
    const canon = SITE + "m/" + d.slug + "/";
    HUBS.push(canon);
    files.set("m/" + d.slug + "/index.html", page({ title: d.title, desc: d.lead, canon, crumbs, body, ask: d.kick.toLowerCase() + " мотоцикла",
      ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: d.h1, url: canon, inLanguage: "ru", description: d.lead }]
        .concat(faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }] : []) }));
  });
}

/* Страницы «Тюнинг <мотор>» — /m/motor/<мотор>/tuning/: что реально ставят для прибавки мощности (ЦПГ, карбюратор,
   выхлоп, фильтр, зажигание, охлаждение), объём после расточки — по ходу поршня, цены — за деталь без установки.
   Под запросы «тюнинг 172fmm», «бигбор nb300», «какой карбюратор на 172fmm». Плюс каталог /m/tuning/. */
const TUNE_PAGES = [];
{
  const T = ctx.TUNING;
  const pr = (t) => (t.hi === 0 ? "своими руками" : t.lo != null ? (t.lo === t.hi ? "" : t.lo.toLocaleString("ru-RU") + "–") + t.hi.toLocaleString("ru-RU") + " ₽" : t.price ? t.price.toLocaleString("ru-RU") + " ₽" : "");
  const sum = (list) => { const lo = list.reduce((s, t) => s + (t.svc ? 0 : t.lo != null ? t.lo : t.price || 0), 0), hi = list.reduce((s, t) => s + (t.svc ? 0 : t.hi != null ? t.hi : t.price || 0), 0); return (lo === hi ? "" : lo.toLocaleString("ru-RU") + "–") + hi.toLocaleString("ru-RU") + " ₽"; };
  const note = (t, e) => { const k = t.notes && Object.keys(t.notes).find((x) => x === e.id || (e.groups || []).indexOf(x) >= 0); return k ? t.notes[k] : ""; };
  const NODES = [["engine", "Цилиндр и мотор"], ["cvt", "Вариатор и сцепление"], ["fuel", "Карбюратор"], ["exhaust", "Выхлоп"], ["filter", "Воздушный фильтр и впуск"], ["ign", "Зажигание"], ["cool", "Охлаждение"], ["drive", "Звёзды и сцепление"]];
  const isBore = (t) => /^bore/.test(t.id), isSwap = (t) => /^swap/.test(t.id);
  const ids = engIds.filter(tuneEligible);
  ids.forEach((id) => {
    const e = ENGINES[id], list = bikesOf[id], slug = engSlug[id];
    /* класс по большинству моделей с этим мотором: выхлоп и защита — под него */
    const cnt = {};
    list.forEach((b) => { const c = ctx.tuneClassOf(b); cnt[c] = (cnt[c] || 0) + 1; });
    const cls = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0], rep = list.find((b) => ctx.tuneClassOf(b) === cls) || list[0];
    const ok = T.filter((t) => ctx.tuningFor(t, e, rep).ok && t.power >= 0);
    const by = {};
    ok.forEach((t) => { const n = ctx.tuneNode(t); if (NODES.some((x) => x[0] === n)) (by[n] = by[n] || []).push(t); });
    const row = ctx.carbUpFor(e), geom = ctx.ENGINE_GEOM[id];
    const lad = row ? (row.ladder || []).map((x) => ok.find((t) => t.id === x)).filter(Boolean) : [];
    const bores = (by.engine || []).filter(isBore), swaps = (by.engine || []).filter(isSwap);
    const tF = (x) => ok.find((t) => t.id === x);
    /* две готовые ступени */
    /* скутер: «резвее» — ролики, пружины и ограничители; «мощнее» — ЦПГ Ø47 с карбюратором и роликами под неё */
    const cvt = (e.groups || []).indexOf("cvt") >= 0;
    const quick = (cvt ? [tF("cvt-unlock"), tF("cvt-rollers"), tF("cvt-spring"), tF("filter"), tF("jets")] : [lad[Math.min(1, lad.length - 1)] || (row && tF(row.up)), tF("filter"), tF("jets"), tF("airbox")]).filter(Boolean);
    const boreMain = (row && tF(row.bore)) || bores.sort((a, b) => b.power - a.power)[0];
    const exh = (by.exhaust || []).filter((t) => /^ex-|^pipe$|^full$/.test(t.id)).sort((a, b) => (a.lo || a.price) - (b.lo || b.price))[0];
    const power = (cvt ? [boreMain, tF("carb-2t-175"), tF("jets"), exh, tF("cvt-rollers"), tF("cvt-kit")] : [boreMain || swaps[0], row && boreMain && tF(row.boreCarb), tF("jets"), exh, tF("oilcool") || tF("fan"), (e.groups || []).indexOf("big") >= 0 && tF("clutch")]).filter(Boolean)
      .filter((t, i, a) => a.indexOf(t) === i);
    const ccTxt = (t) => { const m = /Ø(\d+(?:\.\d+)?)/.exec(t.title); const cc = m && ctx.boreCc(id, parseFloat(m[1])); return cc ? " (≈ " + cc + " см³)" : ""; };
    const item = (t) => `<div class="tu-item"><div class="tu-top"><b>${esc(t.title)}</b><span class="cu-price">${esc(pr(t))}</span></div>${t.eff ? `<span class="cu-eff">${esc(t.eff)}</span>` : ""}${t.body ? `<p>${esc(t.body)}</p>` : ""}${note(t, e) ? `<p class="cu-spec">${esc(note(t, e))}</p>` : ""}${ctx.TUNE_GUIDE[t.id] ? `<a class="tu-g" href="/m/remont/${ctx.TUNE_GUIDE[t.id]}/">Как поставить →</a>` : ""}</div>`;
    const stage = (title, sub, L) => L.length ? `<div class="tu-stage"><h3>${esc(title)}</h3><p class="small">${esc(sub)}</p><ol>${L.map((t) => `<li><b>${esc(t.title)}</b>${ccTxt(t)} — <span class="nw">${esc(pr(t))}</span></li>`).join("")}</ol><p class="tu-sum">Детали: ${esc(sum(L))}</p></div>` : "";
    const stock = [e.cc ? Math.round(e.cc) + " см³" : "", e.hp ? e.hp + " л.с." : "", e.carb ? "карбюратор " + String(e.carb).replace(/\s*\(.*$/, "") : "", geom ? "диаметр × ход " + geom[0] + " × " + geom[1] + " мм" : ""].filter(Boolean).join(" · ");
    /* как мотор называют люди: «NB300 (ZS174MN-5)», «NC250 (ZS177MM)» — так и ищут */
    const pop = String(AKA[id] || "").split(/\s+/).find((x) => /^[a-z]{2,3}\d{3}$/i.test(x) && String(e.code).toLowerCase().indexOf(x.toLowerCase()) < 0);
    /* скутеры ищут по модели: «тюнинг дио», «тюнинг джога» — в имени семейство моделей и код мотора */
    const fams = {};
    list.forEach((b) => { const f = b.brand + " " + String(b.name).split(/\s+/)[0]; fams[f] = (fams[f] || 0) + 1; });
    const fam = Object.keys(fams).filter((f) => !/Любая/i.test(f)).sort((a, b) => fams[b] - fams[a]).slice(0, 2);
    const famTxt = fam.length === 2 && fam[0].split(" ")[0] === fam[1].split(" ")[0] ? fam[0] + ", " + fam[1].split(" ").slice(1).join(" ") : fam.join(", ");
    /* мопеды ищут по названию: «тюнинг альфы», «тюнинг дельты» */
    const RU_NM = { Alpha: "Альфа", "Альфа": "Альфа", Delta: "Дельта", Orion: "Орион", Beta: "Бета", Scout: "Скаут", Virago: "Вираго" };
    const mop = {};
    if (!cvt && cls === "moped") list.forEach((b) => { if (ctx.tuneClassOf(b) !== "moped") return; const w = RU_NM[String(b.name).split(/\s+/)[0]]; if (w) mop[w] = (mop[w] || 0) + 1; });
    const PRI = ["Альфа", "Дельта", "Орион", "Бета", "Скаут", "Вираго"];
    const mopTop = Object.keys(mop).sort((a, b) => mop[b] - mop[a] || PRI.indexOf(a) - PRI.indexOf(b)).slice(0, 2);
    const name = mopTop.length ? "мопеда " + mopTop.join(", ") + " (" + e.code + ")" : cvt && (e.groups || []).indexOf("cn") >= 0 ? "скутера " + e.code : cvt && fam.length ? famTxt + " (" + String(e.code).replace(/\s*\(.*\)$/, "") + ")" : pop ? pop.toUpperCase() + " (" + String(e.code).replace(/^ZS\s+/, "") + ")" : e.code;
    const faq = [
      bores.length && ["Какой бигбор поставить на " + name + "?", bores.map((t) => t.title + ccTxt(t) + ", " + pr(t)).join("; ") + ". Объём посчитан по штатному ходу поршня: «300» или «350» в названии у продавцов — не объём."],
      lad.length && ["Какой карбюратор поставить на " + name + ", чтобы был резвее?", "По порядку: " + lad.map((t) => t.title.replace(/^Карбюратор\s*/, "")).join(" → ") + ". " + ((row.nuance || [])[0] || row.tip || "")],
      power.length && ["Сколько стоит тюнинг " + name + "?", (quick.length ? "Резвее без вскрытия мотора: " + sum(quick) + ". " : "") + "Мощнее (" + power.map((t) => t.title.replace(/\s*\(.*?\)/g, "")).join(", ") + "): " + sum(power) + " за детали, без установки."],
      cvt && tF("cvt-rollers") && ["Какие ролики поставить на " + name + ", чтобы был резвее?", "Легче штатных на 1–2 г — бодрее разгон и в горку, максималка чуть ниже; тяжелее — наоборот. Меняют весь комплект, вес подбирают шагом 0.5–1 г. С ЦПГ 70/72 ролики подбирают заново — обычно на 0.5–1 г тяжелее."],
      cvt && tF("cvt-unlock") && ["Как снять ограничение скорости на " + name + "?", tF("cvt-unlock").body + " Учти: мопед по ПДД — до 50 км/ч по конструкции."],
      boreMain && !cvt && ["Что поменять вместе с бигбором на " + name + "?", [row && row.boreNote && row.boreNote.replace(/\.$/, ""), tF("jets") && "Подбор главного жиклёра и иглы по свече", (tF("oilcool") || tF("fan")) && "охлаждение (" + (tF("oilcool") || tF("fan")).title.toLowerCase() + ")", (e.groups || []).indexOf("big") >= 0 && "усиленные пружины сцепления", "обкатка 300–500 км"].filter(Boolean).join("; ") + "."]
    ].filter(Boolean);
    const sections = NODES.filter((n) => (by[n[0]] || []).length).map((n) => {
      let L = by[n[0]];
      if (n[0] === "fuel" && lad.length) L = lad.concat(L.filter((t) => lad.indexOf(t) < 0));
      if (n[0] === "exhaust") L = L.slice().sort((a, b) => (/^ex-|^silencer2t$/.test(a.id) ? 0 : a.id === "full" ? 1 : 2) - (/^ex-|^silencer2t$/.test(b.id) ? 0 : b.id === "full" ? 1 : 2) || (a.lo || a.price) - (b.lo || b.price));
      if (n[0] === "engine") L = L.slice().sort((a, b) => (isBore(b) ? 2 : isSwap(b) ? 0 : 1) - (isBore(a) ? 2 : isSwap(a) ? 0 : 1) || b.power - a.power);
      return `<h2 id="${n[0]}">${esc(n[1])}</h2>${n[0] === "fuel" && row && row.tip ? `<p class="note">${esc(row.tip)}</p>` : ""}<div class="tu">${L.map(item).join("")}</div>${n[0] === "fuel" && row && row.nuance ? `<ul class="cu-nu">${row.nuance.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}`;
    }).join("\n");
    const canon = SITE + "m/motor/" + slug + "/tuning/";
    const crumbs = [["MotoHelper", "/"], ["Моторы", "/m/motor/"], [name, "/m/motor/" + slug + "/"], ["Тюнинг", null]];
    const app = appLink(list[0], list[0].versions.findIndex((v) => v.engine === id)) + "&r=tune";
    const body = `<section class="hero"><div class="kick">Тюнинг мотора · ${esc(ctx.TUNE_CLASS_T[cls] || "")}</div><h1>Тюнинг ${esc(name)}</h1>
<p class="lead">${esc(e.name || name)}: ${cvt ? "что реально ставят на скутер — ролики и пружины вариатора, снятие ограничителей, ЦПГ побольше, карбюратор, выхлоп. Объём ЦПГ посчитан по ходу поршня" : "что реально ставят для прибавки мощности — ЦПГ (бигбор), карбюратор, выхлоп, фильтр, зажигание. Объём после расточки посчитан по ходу поршня"}, цены — за деталь без установки.</p>
<p class="small">С завода: ${esc(stock)}.</p>
<nav class="jump">${NODES.filter((n) => (by[n[0]] || []).length).map((n) => `<a href="#${n[0]}">${n[1]}</a>`).join("")}</nav></section>
<section class="ver"><div class="tu-stages">${stage("Резвее — мотор не вскрывать", cvt ? "Разгон и скорость: вариатор, ограничители, фильтр." : "Отклик и разгон: карбюратор, фильтр, жиклёры.", quick)}${stage(cvt ? "Мощнее — ЦПГ побольше" : "Мощнее — с бигбором", "Больше объёма и всё, что для этого нужно.", power)}</div>
${sections}
<p class="note">Прибавка в процентах — оценка на коленвале при правильно подобранной смеси; на колесе на 10–15% меньше. Без подбора жиклёров прибавки почти нет, а мотор перегревается.</p>
<a class="cta" href="${app}">Собрать свой проект тюнинга в приложении →</a></section>
<h2>Частые вопросы</h2><div class="faq">${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join("")}</div>
${list.some(modelTuneHas) ? `<h2>Тюнинг по моделям</h2><div class="chips">${list.filter(modelTuneHas).map((x) => `<a class="chip" href="/m/${bikeSlug.get(x)}/tuning/">Тюнинг ${esc(x.brand + " " + x.name)}</a>`).join("")}</div>` : ""}
<h2>Мотоциклы с мотором ${esc(name)}</h2><div class="chips">${list.slice(0, 24).map((x) => `<a class="chip" href="/m/${bikeSlug.get(x)}/">${esc(x.brand + " " + x.name)}</a>`).join("")}</div>
<div class="chips"><a class="chip" href="/m/motor/${slug}/">Масло, свечи, зазоры ${esc(name)} →</a><a class="chip" href="/m/tuning/">Тюнинг других моторов</a></div>`;
    const desc = `Тюнинг ${name}: ${bores.length ? "бигбор " + bores.map((t) => (/Ø\d+/.exec(t.title) || [""])[0] + ccTxt(t)).join(", ") + ", " : ""}${lad.length ? "карбюратор " + lad.map((t) => t.title.replace(/^Карбюратор\s*/, "").replace(/\s*(вместо|под)\s.*$/, "")).slice(0, 3).join(" / ") + ", " : ""}выхлоп, фильтр${bores.length || lad.length ? "" : ", жиклёры, зажигание и охлаждение"} — что даёт и сколько стоит.`;
    files.set("m/motor/" + slug + "/tuning/index.html", page({ title: pickTitle("Тюнинг " + name, cvt ? [": вариатор, ЦПГ, карбюратор — цены | MotoHelper", ": вариатор, ЦПГ, карбюратор", " — что даёт и сколько стоит"] : bores.length ? [": бигбор, карбюратор, выхлоп — цены | MotoHelper", ": бигбор, карбюратор, выхлоп", " — что даёт и сколько стоит"] : [": карбюратор, выхлоп, фильтр — цены | MotoHelper", ": карбюратор, выхлоп, фильтр", " — что даёт и сколько стоит"]), desc, canon, crumbs, body, sticky: app,
      ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: "Тюнинг " + name, url: canon, inLanguage: "ru", description: desc }].concat(faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }] : []) }));
    TUNE_PAGES.push({ id, slug, name, n: list.length, bores, lad, canon, kind: cvt ? "scoot" : cls === "moped" ? "moped" : "moto" });
  });
  /* каталог: /m/tuning/ */
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Тюнинг моторов", null]];
  const rows = TUNE_PAGES.slice().sort((a, b) => b.n - a.n);
  const card = (r) => `<a class="card" href="/m/motor/${r.slug}/tuning/"><b>Тюнинг ${esc(r.name)}</b><small>${r.n} ${plural(r.n, "модель", "модели", "моделей")}${r.bores.length ? " · " + (r.kind === "scoot" ? "ЦПГ " : "бигбор ") + esc((/Ø\d+(?:\.\d+)?/.exec(r.bores[0].title) || [""])[0]) : ""}${r.lad.length ? " · " + esc(r.lad[0].title.replace(/^Карбюратор\s*/, "").replace(/\s*(вместо|под)\s.*$/, "")) : r.kind === "scoot" ? " · вариатор, ролики" : ""}</small></a>`;
  /* по классам: так и ищут — «тюнинг питбайка», «тюнинг мопеда», «тюнинг скутера» */
  const KINDS = [["moto", "Питбайки, эндуро и мотоциклы", "Бигбор с честным объёмом по ходу поршня, карбюратор побольше, выхлоп, фильтр, зажигание."],
    ["moped", "Мопеды (Альфа, Дельта, Орион)", "ЦПГ 72 и 125, карбюратор PZ20–PZ22 вместо PZ19, прямоток, звёзды."],
    ["scoot", "Скутеры", "Ролики и контрпружина вариатора, снятие ограничителей, ЦПГ 70/72, карбюратор 17.5."]];
  const sec = KINDS.map((k) => { const L = rows.filter((r) => r.kind === k[0]); return L.length ? `<h2 id="${k[0]}">Тюнинг: ${esc(k[1].charAt(0).toLowerCase() + k[1].slice(1))}</h2><p class="note">${esc(k[2])}</p><div class="grid models">${L.map(card).join("")}</div>` : ""; }).join("\n");
  const body = `<section class="hero"><div class="kick">Тюнинг</div><h1>Тюнинг питбайков, мопедов и скутеров по моторам</h1>
<p class="lead">Что реально ставят на популярные моторы для прибавки мощности: бигбор (с честным объёмом по ходу поршня), карбюратор побольше, выхлоп, вариатор у скутеров — с ценами и нюансами.</p>
<nav class="jump"><a href="#models">Популярные модели</a>${KINDS.filter((k) => rows.some((r) => r.kind === k[0])).map((k) => `<a href="#${k[0]}">${esc(k[1].replace(/\s*\(.*\)$/, ""))}</a>`).join("")}</nav></section>
<h2 id="models">Тюнинг популярных моделей</h2><p class="note">Готовые рецепты «резвее, мощнее, быстрее, надёжнее» под конкретную модель — с ценами.</p><div class="chips">${MODEL_TUNE_KEYS.map((k) => BIKES.find((x) => x.brand + " " + x.name === k)).filter(modelTuneHas).map((x) => `<a class="chip" href="/m/${bikeSlug.get(x)}/tuning/">${esc(x.brand + " " + x.name)}</a>`).join("")}</div>
${sec}`;
  files.set("m/tuning/index.html", page({ title: "Тюнинг питбайка, мопеда и скутера: бигбор, карбюратор, вариатор | MotoHelper", desc: "Тюнинг по моторам: " + rows.slice(0, 5).map((r) => r.name).join(", ") + ", мопеды Альфа и скутеры Dio, Jog — бигбор с честным объёмом, карбюратор побольше, вариатор, выхлоп: что даёт и сколько стоит.", canon: SITE + "m/tuning/", crumbs, body, ld: [crumbLd(crumbs)] }));
}

/* Страницы «Тюнинг <модель>» — /m/<модель>/tuning/: только популярные модели (так и ищут: «тюнинг kayo t2», «тюнинг альфы»).
   Рецепты «Резвее / Мощнее / Быстрее / Надёжнее» — та же функция tuneRecipe, что в приложении (берём её из js/app.js),
   поэтому сайт и приложение советуют одно и то же. Полный список доработок по узлам — на странице тюнинга мотора. */
const MODEL_TUNE_PAGES = [];
{
  const APP = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8");
  const cut = (a, b) => { const i = APP.indexOf(a), j = i < 0 ? -1 : APP.indexOf(b, i); if (i < 0 || j < 0) throw new Error("build-pages: в js/app.js не найдено «" + a + "» — поправь cut() в блоке «Тюнинг <модель>»"); return APP.slice(i, j); };
  vm.runInContext([cut("const TUNE_STOCK_RE", "/* Прибавка мощности от набора"), cut("const TUNE_BORE", "\n"), cut("const TUNE_EXHAUST", "/* рецепт — компактный список")]
    .join("\n").replace(/^const /gm, "var "), ctx);
  const pr = (t) => (t.hi === 0 ? "своими руками" : t.lo != null ? (t.lo === t.hi ? "" : t.lo.toLocaleString("ru-RU") + "–") + t.hi.toLocaleString("ru-RU") + " ₽" : t.price ? t.price.toLocaleString("ru-RU") + " ₽" : "");
  const sum = (L) => { const lo = L.reduce((s, t) => s + (t.lo != null ? t.lo : t.price || 0), 0), hi = L.reduce((s, t) => s + (t.hi != null ? t.hi : t.price || 0), 0); return (lo === hi ? "" : lo.toLocaleString("ru-RU") + "–") + hi.toLocaleString("ru-RU") + " ₽"; };
  const ROLE = { "главное": "r-main", "обязательно": "r-must", "по желанию": "r-opt" };
  const GOALS = [["quick", "Резвее", "Отклик и разгон, мотор не вскрывать."], ["power", "Мощнее", "Больше объёма или дыхания — и всё, что для этого нужно."],
    ["speed", "Быстрее", "Максималка: передаточные числа и верх."], ["tough", "Надёжнее", "Защита и то, что ломается первым."]];
  const engTune = {};
  TUNE_PAGES.forEach((r) => (engTune[r.id] = r));
  MODEL_TUNE_KEYS.forEach((key) => {
    const b = BIKES.find((x) => x.brand + " " + x.name === key);
    if (!b || !modelTuneHas(b)) return;
    const id = b.versions[0].engine, e0 = ENGINES[id], et = engTune[id];
    if (!et) return;
    const eng = Object.assign({ installed: [] }, e0);
    const full = b.brand + " " + b.name, slug = bikeSlug.get(b), cls = ctx.tuneClassOf(b);
    const rec = {};
    GOALS.forEach((g) => (rec[g[0]] = ctx.tuneRecipe(eng, g[0], b)));
    const parts = (g) => rec[g].steps.map((s) => s.t).filter((t) => !t.svc);
    const stage = (g) => {
      const r = rec[g[0]];
      if (!r.steps.length) return "";
      return `<div class="tu-stage"><h3>${esc(g[1])}</h3><p class="small">${esc(g[2])}</p><ol>${r.steps.map((s) => `<li><b>${esc(s.t.title)}</b> <span class="tr-role ${ROLE[s.role] || ""}">${esc(s.role)}</span>${s.why ? `<span class="small"> — ${esc(s.why)}</span>` : ""} — <span class="nw">${esc(pr(s.t))}</span></li>`).join("")}</ol>${r.info.map((x) => `<p class="small">${esc(x)}</p>`).join("")}<p class="tu-sum">Детали: ${esc(sum(parts(g[0])))}</p></div>`;
    };
    /* что ещё ставят на этот класс: подвеска, защита, управление — по рейтингу, по 4 на узел */
    const ok = ctx.TUNING.filter((t) => ctx.tuningFor(t, eng, b).ok);
    const MORE = [["susp", "Подвеска"], ["guard", "Защита"], ["ctrl", "Посадка и управление"], ["wheels", "Колёса и шины"], ["brakes", "Тормоза"]];
    const more = MORE.map((n) => { const L = ok.filter((t) => ctx.tuneNode(t) === n[0]).sort((a, c) => (c.rating || 0) - (a.rating || 0)).slice(0, 4); return L.length ? `<div class="tu-item"><div class="tu-top"><b>${esc(n[1])}</b></div><ul class="tu-ul">${L.map((t) => `<li>${esc(t.title)} — <span class="nw">${esc(pr(t))}</span></li>`).join("")}</ul></div>` : ""; }).join("");
    const main = (g) => (rec[g].steps.find((s) => s.role === "главное") || rec[g].steps[0] || {}).t;
    const titles = (g, n) => rec[g].steps.slice(0, n).map((s) => s.t.title.replace(/\s*\(.*?\)/g, "")).join(", ");
    const stock = [e0.cc ? Math.round(e0.cc) + " см³" : "", (b.versions[0].hp || e0.hp) ? (b.versions[0].hp || e0.hp) + " л.с." : "", (e0.groups || []).indexOf("efi") >= 0 ? "инжектор" : e0.carb ? "карбюратор " + String(e0.carb).replace(/\s*\(.*$/, "") : "", e0.cooling ? String(e0.cooling).toLowerCase() + " охлаждение" : ""].filter(Boolean).join(" · ");
    const faq = [
      rec.quick.steps.length && ["Как сделать " + full + " резвее?", "Без вскрытия мотора: " + titles("quick", 4) + ". Детали — " + sum(parts("quick")) + "." + (rec.quick.info[0] ? " " + rec.quick.info[0] : "")],
      rec.power.steps.length && ["Как увеличить мощность " + full + "?", "Главное — " + (main("power") ? main("power").title : "") + ". Вместе с этим: " + rec.power.steps.filter((s) => s.role === "обязательно").map((s) => s.t.title.replace(/\s*\(.*?\)/g, "")).join(", ") + ". Детали — " + sum(parts("power")) + ", без установки."],
      rec.speed.steps.length && ["Как поднять максималку " + full + "?", titles("speed", 3) + ". " + (rec.speed.info[0] || "")],
      rec.tough.steps.length && ["Что поставить на " + full + " для надёжности?", titles("tough", 5) + "."]
    ].filter(Boolean).map((q) => [q[0], q[1].replace(/\s+/g, " ").trim()]);
    const canon = SITE + "m/" + slug + "/tuning/";
    const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], [b.brand, "/m/" + brandSlug[b.brand] + "/"], [b.name, "/m/" + slug + "/"], ["Тюнинг", null]];
    const app = appLink(b, 0) + "&r=tune";
    const twins = MODEL_TUNE_KEYS.map((k) => BIKES.find((x) => x.brand + " " + x.name === k)).filter((x) => x && x !== b && x.versions[0].engine === id && modelTuneHas(x));
    const body = `<section class="hero"><div class="kick">Тюнинг · ${esc(ctx.TUNE_CLASS_T[cls] || "")}</div><h1>Тюнинг ${esc(full)}</h1>
<p class="lead">${esc(full)} с мотором ${esc(e0.code)}: что поставить, чтобы был резвее, мощнее и быстрее, и что защитить в первую очередь — по шагам, с ценами за детали без установки.</p>
<p class="small">С завода: ${esc(stock)}.</p>
<nav class="jump">${GOALS.filter((g) => rec[g[0]].steps.length).map((g) => `<a href="#${g[0]}">${g[1]}</a>`).join("")}</nav></section>
<section class="ver"><div class="tu-stages">${GOALS.map((g) => `<div id="${g[0]}">${stage(g)}</div>`).join("")}</div>
<p class="note">«Главное» — то, что даёт результат; «обязательно» — без этого результат уйдёт в перегрев или поломку; «по желанию» — добавит, но можно без него. Прибавка мощности есть только при подобранной смеси.</p>
${more ? `<h2>Что ещё ставят на ${esc(full)}</h2><div class="tu">${more}</div>` : ""}
<div class="chips"><a class="chip" href="/m/motor/${et.slug}/tuning/">Весь тюнинг мотора ${esc(e0.code)}: по узлам →</a><a class="chip" href="/m/${slug}/">Масло, свечи, клапаны ${esc(full)}</a></div>
<a class="cta" href="${app}">Собрать проект тюнинга ${esc(full)} в приложении →</a></section>
<h2>Частые вопросы</h2><div class="faq">${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join("")}</div>
${(() => { const m = modelAbout(b); return m.about + (m.modelGroups ? `<div class="groups">${m.modelGroups}</div>` : ""); })()}
${(CMP_OF.get(b) || []).length ? `<h2>Сравнения ${esc(full)}</h2><div class="chips">${CMP_OF.get(b).map((c) => `<a class="chip" href="/m/sravnenie/${c.slug}/">${esc(c.title)}</a>`).join("")}</div>` : ""}
${twins.length ? `<h2>Тюнинг моделей с тем же мотором</h2><div class="chips">${twins.slice(0, 12).map((x) => `<a class="chip" href="/m/${bikeSlug.get(x)}/tuning/">${esc(x.brand + " " + x.name)}</a>`).join("")}</div>` : ""}`;
    const desc = `Тюнинг ${full} (${e0.code}): резвее — ${titles("quick", 2).split(", ").map(lc1).join(", ")}; мощнее — ${main("power") ? lc1(main("power").title.replace(/\s*\(.*?\)/g, "")) : "выпуск"}; быстрее — ${main("speed") && main("speed") !== main("power") ? lc1(main("speed").title.replace(/\s*\(.*?\)/g, "")) : ctx.hasChain(e0) ? "звёзды" : "вариатор"}. Цены и что учесть.`;
    files.set("m/" + slug + "/tuning/index.html", page({ image: ogOf(b), title: pickTitle("Тюнинг " + full, [": что поставить и сколько стоит | MotoHelper", ": что поставить и сколько стоит", ": что поставить и цены", ""]), desc, canon, crumbs, body, sticky: app,
      ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: "Тюнинг " + full, url: canon, inLanguage: "ru", description: desc }].concat(faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }] : []) }));
    MODEL_TUNE_PAGES.push({ b, slug, canon, id, cls: et.kind });
  });
}

/* Схемы электрики — /m/provodka/ и /m/provodka/<тип>/: AC-CDI (без АКБ, на кике), DC-CDI (с АКБ и стартером), инжектор.
   Те же данные, что схема в приложении (WIRING / WIRE в js/kb.js): узлы с проверками мультиметром, провода по цветам.
   Под запросы «схема электрики питбайка», «схема проводки мопеда альфа», «цвета проводов CDI», «как проверить CDI». */
const WIRE_PAGES = [];
{
  const W = ctx.__W, WC = ctx.__WC;
  const TYPES = [
    ["ac", "Схема электрики без АКБ (AC-CDI)", "питбайки и мопеды на кике", "Схема электрики питбайка и мопеда без аккумулятора (AC-CDI): провода и проверка"],
    ["dc", "Схема электрики с АКБ и стартером (DC-CDI)", "мотоциклы, эндуро и мопеды с электростартером", "Схема электрики мотоцикла с аккумулятором (DC-CDI): цвета проводов, проверка"],
    ["efi", "Схема электрики инжектора (ЭБУ)", "мотоциклы и скутеры на инжекторе", "Схема электрики инжекторного мотоцикла: ЭБУ, бензонасос, датчики, проверка"],
    ["points", "Схема контактного зажигания: прерыватель, конденсатор, катушка", "ИЖ, Восход, Минск, Jawa, Урал и классика", "Контактное зажигание ИЖ, Минска, Восхода: схема, зазор прерывателя, конденсатор"]];
  const svg = (w) => {
    /* раскладка — как в приложении (WiringView): сетка 3 столбца, провода идут по коридорам между блоками */
    const NW = 104, NH = 52, X = (c) => 16 + c * 126, Y = (r) => 22 + r * 92;
    const rows = Math.max.apply(null, w.nodes.map((n) => n[2])) + 1, byId = {};
    w.nodes.forEach((n) => (byId[n[0]] = n));
    const laneR = (c) => X(c) + NW + 11, laneL = (c) => X(c) - 11, rowGap = (r, down) => (down ? Y(r) + NH + 20 : Y(r) - 20);
    const path = (wi, i) => {
      const A = byId[wi[0]], B = byId[wi[1]], o = (i % 5 - 2) * 3;
      const ax = X(A[1]) + NW / 2, ay = Y(A[2]) + NH / 2, by = Y(B[2]) + NH / 2 + o / 2;
      if (A[2] === B[2] && Math.abs(A[1] - B[1]) === 1) { const l = A[1] < B[1]; return "M" + (l ? X(A[1]) + NW : X(A[1])) + " " + (ay + o) + "H" + (l ? X(B[1]) : X(B[1]) + NW); }
      const down = B[2] >= A[2], gy = rowGap(A[2], down) + o, toLeft = B[1] > A[1], lx = (toLeft ? laneL(B[1]) : laneR(B[1])) + o, ex = toLeft ? X(B[1]) : X(B[1]) + NW;
      return "M" + (ax + o) + " " + (down ? Y(A[2]) + NH : Y(A[2])) + "V" + gy + "H" + lx + "V" + by + "H" + ex;
    };
    const wires = w.wires.map((wi, i) => { const c = WC[wi[2]], d = path(wi, i); return `<path d="${d}" stroke="#0E1013" stroke-width="${wi[2] === "hv" ? 9 : 7}" fill="none"/><path d="${d}" stroke="${c[0]}" stroke-width="${wi[2] === "hv" ? 6 : 4}" fill="none"/>${c[3] ? `<path d="${d}" stroke="${c[3]}" stroke-width="4" stroke-dasharray="5 7" fill="none"/>` : ""}`; }).join("");
    const nodes = w.nodes.map((n) => { const words = String(n[3]).split(" "), lines = []; words.forEach((x) => { const L = lines[lines.length - 1]; if (L && (L + " " + x).length <= 14) lines[lines.length - 1] = L + " " + x; else lines.push(x); });
      return `<g transform="translate(${X(n[1])} ${Y(n[2])})"><rect width="${NW}" height="${NH}" rx="10" fill="#1A1E24" stroke="#3A414B"/>${lines.slice(0, 3).map((l, i, a) => `<text x="${NW / 2}" y="${NH / 2 + (i - (a.length - 1) / 2) * 13 + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="#F2F3F0">${esc(l)}</text>`).join("")}</g>`; }).join("");
    return `<svg class="wr-svg" viewBox="0 0 390 ${Y(rows - 1) + NH + 34}" role="img" aria-label="Схема электрики: ${esc(w.t)}">${wires}${nodes}</svg>`;
  };
  const engOf = {};
  engIds.forEach((id) => { const t = ctx.wiringType(ENGINES[id]); (engOf[t] = engOf[t] || []).push(id); });
  TYPES.forEach(([key, h1, who, title]) => {
    const w = W[key];
    if (!w) return;
    const canon = SITE + "m/provodka/" + key + "/";
    const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Схемы электрики", "/m/provodka/"], [w.t, null]];
    const used = w.wires.map((x) => x[2]).filter((c, i, a) => a.indexOf(c) === i);
    const engs = (engOf[key] || []).slice().sort((a, b) => (bikesOf[b] || []).length - (bikesOf[a] || []).length).slice(0, 24);
    const bikes = engs.slice(0, 8).map((id) => (bikesOf[id] || []).find((b) => b.brand !== "Любая модель")).filter(Boolean);
    const rep = bikes[0] || BIKES.find((b) => ctx.wiringType(ENGINES[b.versions[0].engine]) === key);
    const app = rep ? appLink(rep, 0) + "&r=wiring" : "/";
    const val = (s) => String(s).replace(/\{(\w+)\}/g, "по мануалу своего мотора");
    const find = (id) => w.nodes.find((n) => n[0] === id);
    const faqSrc = [["cdi", "Как проверить коммутатор CDI?"], ["ecu", "Как проверить ЭБУ?"], ["coil", "Как проверить катушку зажигания?"], ["reg", "Как проверить реле-регулятор?"], ["stator", "Как проверить статор (генератор)?"], ["exc", "Нет искры на кике — что проверить?"], ["pump", "Не качает бензонасос — что проверить?"], ["rel", "Не крутит стартер — что проверить?"]];
    const faq = faqSrc.map(([id, q]) => { const n = find(id); return n ? [q, n[4] + " " + n[5].map((r) => r[0] + ": " + val(r[1])).join("; ") + "."] : null; }).filter(Boolean)
      .concat([["Какой провод масса, а какой — глушение?", used.map((k) => WC[k][1] + " — " + WC[k][2].charAt(0).toLowerCase() + WC[k][2].slice(1)).slice(0, 6).join("; ") + ". Цвета — самые частые у китайских мотоциклов; у японских и европейских сверяй со схемой из сервис-мануала."]]);
    const body = `<section class="hero"><div class="kick">Схема электрики · ${esc(who)}</div><h1>${esc(h1)}</h1><p class="lead">${esc(w.d)}</p>
<nav class="jump"><a href="#shema">Схема</a><a href="#uzly">Узлы и проверка</a><a href="#provoda">Цвета проводов</a><a href="#motory">Моторы</a></nav></section>
<section class="ver"><h2 id="shema">Схема</h2><div class="wr-static">${svg(w)}</div><p class="note">Цвета — самые частые у китайских мотоциклов. У твоего могут отличаться: сверяй по фишкам и прозванивай. Японские и европейские модели — по схеме из сервис-мануала.</p>
<a class="cta" href="${app}">Интерактивная схема: нажми на узел — что мерить мультиметром →</a></section>
<h2 id="uzly">Узлы и что мерить</h2><div class="tu">${w.nodes.map((n) => `<div class="tu-item"><div class="tu-top"><b>${esc(n[3])}</b></div><p>${esc(n[4])}</p>${n[5] && n[5].length ? `<ul class="tu-ul">${n[5].map((r) => `<li>${esc(r[0])}: <b>${esc(val(r[1]))}</b></li>`).join("")}</ul>` : ""}</div>`).join("")}</div>
<h2 id="provoda">Цвета проводов</h2><ul class="wr-legend">${used.map((k) => `<li><i style="background:${WC[k][3] ? `repeating-linear-gradient(90deg,${WC[k][0]} 0 6px,${WC[k][3]} 6px 10px)` : WC[k][0]}"></i><b>${esc(WC[k][1])}</b> — ${esc(WC[k][2])}</li>`).join("")}</ul>
<div class="chips"><a class="chip" href="/m/remont/coil-test/">Проверка зажигания мультиметром</a>${key !== "ac" ? `<a class="chip" href="/m/remont/charging/">Проверка зарядки</a>` : ""}<a class="chip" href="/m/remont/wiring-repair/">Ремонт проводки</a><a class="chip" href="/m/polomka/electric/">Неисправности электрики</a></div>
<h2>Частые вопросы</h2><div class="faq">${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join("")}</div>
<h2 id="motory">Моторы с такой схемой</h2><div class="chips">${engs.map((id) => `<a class="chip" href="/m/motor/${engSlug[id]}/">${esc(ENGINES[id].code)}</a>`).join("")}</div>
${bikes.length ? `<h2>Модели</h2><div class="chips">${bikes.map((b) => `<a class="chip" href="/m/${bikeSlug.get(b)}/">${esc(b.brand + " " + b.name)}</a>`).join("")}</div>` : ""}
<div class="chips"><a class="chip" href="/m/provodka/">Все схемы электрики</a></div>`;
    const desc = w.d.split(". ").slice(0, 2).join(". ").replace(/\.?$/, ".") + " Узлы, что мерить мультиметром и цвета проводов.";
    files.set("m/provodka/" + key + "/index.html", page({ title: pickTitle(title, [" | MotoHelper", ""]), desc, canon, crumbs, body, sticky: app,
      ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: h1, url: canon, inLanguage: "ru", description: desc },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }] }));
    WIRE_PAGES.push({ key, canon, h1, who, n: (engOf[key] || []).length });
  });
  /* каталог */
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Схемы электрики", null]];
  const body = `<section class="hero"><div class="kick">Электрика</div><h1>Схема электрики мотоцикла, питбайка и мопеда</h1>
<p class="lead">Четыре типовые схемы, на которых собраны почти все мотоциклы: без аккумулятора на кике (AC-CDI), с аккумулятором и стартером (DC-CDI), инжектор с ЭБУ и классическое контактное зажигание (ИЖ, Восход, Минск, Jawa). Какой узел за что отвечает, что мерить мультиметром и какого цвета провода.</p></section>
<div class="grid">${WIRE_PAGES.map((p) => `<a class="card big" href="/m/provodka/${p.key}/"><b>${esc({ ac: "Без АКБ, на кике (AC-CDI)", dc: "С АКБ и стартером (DC-CDI)", efi: "Инжектор (ЭБУ)", points: "Контактное: прерыватель и катушка" }[p.key])}</b><small>${esc(p.who)} · ${p.n} ${plural(p.n, "мотор", "мотора", "моторов")}</small></a>`).join("")}</div>
<p class="note">Какая схема у твоего мотоцикла: есть аккумулятор и кнопка стартера — DC-CDI; только кик и нет аккумулятора — AC-CDI; инжектор — ЭБУ; прерыватель с контактами и конденсатором (советская и старая европейская техника) — контактное зажигание. На странице модели в каталоге есть ссылка на нужную схему.</p>`;
  files.set("m/provodka/index.html", page({ title: "Схема электрики мотоцикла, питбайка и мопеда: CDI, цвета проводов | MotoHelper", desc: "Схемы электрики: AC-CDI без аккумулятора, DC-CDI с аккумулятором и стартером, инжектор с ЭБУ — узлы, проверка мультиметром и цвета проводов.", canon: SITE + "m/provodka/", crumbs, body, ld: [crumbLd(crumbs)] }));
}
const urls = [SITE, SITE + "m/", SITE + "m/motor/", SITE + "m/remont/", SITE + "m/polomka/"].concat(brands.map((br) => SITE + "m/" + brandSlug[br] + "/"),
  GUIDES.map((g) => SITE + "m/remont/" + g.id + "/"), DIAG.map((d) => SITE + "m/polomka/" + d.id + "/"),
  BIKES.map((b) => SITE + "m/" + bikeSlug.get(b) + "/"), engIds.map((id) => SITE + "m/motor/" + engSlug[id] + "/"),
  [SITE + "m/podborka/", SITE + "m/sravnenie/", SITE + "m/tuning/"], HUBS, TUNE_PAGES.map((t) => t.canon), MODEL_TUNE_PAGES.map((t) => t.canon), [SITE + "m/provodka/"], WIRE_PAGES.map((t) => t.canon), podKeys.map((k) => SITE + "m/podborka/" + podSlug[k] + "/"), compares.map((c) => SITE + "m/sravnenie/" + c.slug + "/"), probPages, engProbPages, SPARK_PAGES.map((x) => x.canon), CONS_PAGES.length ? [SITE + "m/rashodnik/"].concat(CONS_PAGES.map((x) => x.canon)) : []);
{
  const vh = {};
  for (const [f, c] of files) if (/@@V:/.test(c)) files.set(f, c.replace(/@@V:([\w./-]+)@@/g, (m, a) => vh[a] || (vh[a] = require("crypto").createHash("sha1").update(files.get(a) || "").digest("hex").slice(0, 10))));
}
const hi = 5 + brands.length + GUIDES.length + DIAG.length;
/* дата изменения страницы для sitemap (<lastmod>): GitHub Pages ставит всем файлам одно время выкладки, и Яндекс не видит,
   что поменялось. Храним в m/lastmod.json «адрес → [дата, хэш содержимого]»; хэш — по заголовку, описанию и основному тексту
   (без подвала, «Поделиться» и «Спроси механика»), так что правка шаблона подвала дату не сдвигает */
const LASTMOD = (() => { try { return JSON.parse(fs.readFileSync(path.join(OUT, "lastmod.json"), "utf8")); } catch (e) { return {}; } })();
const TODAY = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // по Москве
const lastmodOf = {};
urls.forEach((u) => {
  const f = u.slice(SITE.length) + "index.html", html = files.get(f);
  if (!u.startsWith(SITE + "m/") || !html) return;
  const main = html.slice(html.indexOf("<main>"), Math.max(html.indexOf('<div class="share"'), html.indexOf("<main>")));
  const key = (html.match(/<title>[^<]*<\/title>/) || [""])[0] + (html.match(/<meta name="description"[^>]*>/) || [""])[0] + main;
  const h = require("crypto").createHash("sha1").update(key).digest("hex").slice(0, 12), old = LASTMOD[u];
  lastmodOf[u] = old && old[1] === h ? old : [TODAY, h];
});
files.set("m/lastmod.json", JSON.stringify(lastmodOf).replace(/\],"/g, '],\n"') + "\n");
files.set("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u, i) => `  <url><loc>${u}</loc>${lastmodOf[u] ? `<lastmod>${lastmodOf[u][0]}</lastmod>` : ""}<changefreq>${i ? "monthly" : "weekly"}</changefreq><priority>${i === 0 ? "1.0" : i < hi ? "0.7" : "0.6"}</priority></url>`).join("\n")}\n</urlset>\n`);

/* склеенные модели (мопеды-«семьи», v40): старые адреса не пропадают — короткие страницы-переадресации
   на общую модель (и на её страницы поломок, сравнения — если такие есть) */
const A40 = ctx.BIKE_ALIASES_V40 || {}, OLD40 = {};
Object.keys(A40).forEach((old) => {
  const os = slugify(old), b = BIKES.find((x) => x.brand + " " + x.name === A40[old][0]);
  if (b && !used[os]) OLD40[os] = [old, bikeSlug.get(b), b.brand + " " + b.name];
});
const redirect = (f, name, to, title) => files.has(f) || files.set(f, `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8" /><title>${esc(name)} → ${esc(title)} — MotoHelper</title>
<meta name="robots" content="noindex, follow" /><link rel="canonical" href="${SITE}${to.slice(1)}" />
<meta http-equiv="refresh" content="0; url=${to}" /><script>location.replace(${JSON.stringify(to)} + location.hash)</script></head>
<body><p>${esc(name)} теперь на странице <a href="${to}">${esc(title)}</a> — это одна модель, версии отличаются мотором.</p></body></html>
`);
const subdirs = (d) => { try { return fs.readdirSync(path.join(OUT, d), { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name); } catch (e) { return []; } };
Object.keys(OLD40).forEach((os) => {
  const [old, ns, title] = OLD40[os];
  redirect("m/" + os + "/index.html", old, "/m/" + ns + "/", title);
  subdirs(os).forEach((sub) => {
    const to = files.has("m/" + ns + "/" + sub + "/index.html") ? "/m/" + ns + "/" + sub + "/" : "/m/" + ns + "/";
    redirect("m/" + os + "/" + sub + "/index.html", old, to, title);
  });
});
subdirs("sravnenie").forEach((d) => {
  const p = d.split("-vs-");
  if (p.length !== 2 || !(OLD40[p[0]] || OLD40[p[1]]) || files.has("m/sravnenie/" + d + "/index.html")) return;
  const n = p.map((x) => (OLD40[x] ? OLD40[x][1] : x)), pair = [n.join("-vs-"), n[1] + "-vs-" + n[0]].find((x) => files.has("m/sravnenie/" + x + "/index.html"));
  const first = OLD40[p[0]] || OLD40[p[1]];
  redirect("m/sravnenie/" + d + "/index.html", "Сравнение " + p.join(" и "), pair ? "/m/sravnenie/" + pair + "/" : "/m/" + first[1] + "/", pair ? "сравнение" : first[2]);
});

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
