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

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8") + "\n;this.__E = ENGINES; this.__B = BIKES; this.__G = GUIDES; this.__D = DIAG; this.__NC = NO_CVT_GUIDES; this.__AKA = ENGINE_AKA;", ctx);
const ENGINES = ctx.__E, BIKES = ctx.__B.filter((b) => b.brand !== "Любая модель");
const GUIDES = ctx.__G, DIAG = ctx.__D, NO_CVT = ctx.__NC, AKA = ctx.__AKA || {};

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
["motor", "remont", "polomka", "sravnenie", "podborka"].forEach((x) => (used[x] = 1)); // разделы моторов, инструкций и поломок
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
/* инструкции и поломки */
.steps{margin:0;padding:0;list-style:none;counter-reset:st;display:grid;gap:8px}.steps li{position:relative;padding:12px 14px 12px 48px;border-radius:4px;background:#0E0E0E;border:1px solid rgba(255,255,255,.14)}
.steps li::before{counter-increment:st;content:counter(st);position:absolute;left:12px;top:11px;width:26px;height:26px;display:grid;place-items:center;background:#fff;color:#000;font:400 14px var(--display);border-radius:3px}
.steps .no{display:block;margin-top:8px;padding:8px 10px;border-left:2px solid #F43F5E;background:rgba(244,63,94,.07);font-size:15px}.steps .no b{display:block}
.steps .hint{display:block;color:var(--muted);font-size:14px;margin-top:4px}
.ph{color:#fff;font-weight:600;border-bottom:1px dashed rgba(255,255,255,.5)}
.tblw{overflow-x:auto;margin:0 0 8px;border:1px solid rgba(255,255,255,.14);border-radius:4px}.tbl{border-collapse:collapse;width:100%;font-size:14px;min-width:520px}
.tbl th,.tbl td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.1);text-align:left;vertical-align:top}.tbl th{font:600 12px var(--cond);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);background:#0A0A0A}
.tbl td a{overflow-wrap:anywhere}.meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
ul.plain{margin:0;padding-left:20px}ul.plain li{margin:3px 0}
.hero h1{padding-right:52px}
.ad{margin:22px 0 0;min-height:90px}
.tbl.cmp{min-width:0;table-layout:fixed}.tbl.cmp th:first-child,.tbl.cmp td:first-child{width:30%;color:var(--muted)}.tbl.cmp td{overflow-wrap:anywhere}
.faq{display:grid;gap:8px}.faq details{border:1px solid rgba(255,255,255,.14);border-radius:4px;background:#0E0E0E}
.faq summary{cursor:pointer;padding:12px 14px;font:600 16px var(--cond);list-style:none}.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";float:right;color:var(--muted)}.faq details[open] summary::after{content:"–"}.faq p{margin:0;padding:0 14px 12px;color:#D0D0D0}
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

/* реклама РСЯ на страницах каталога — только если в ai-config.json задан rsya.blockId */
const SITE_CFG = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "ai-config.json"), "utf8")); } catch (e) { return {}; } })();
const RSYA_ID = SITE_CFG.rsya && /^R-A-[\d-]+$/.test(SITE_CFG.rsya.blockId || "") ? SITE_CFG.rsya.blockId : "";
const AD = RSYA_ID ? `<div class="ad" id="yandex_rtb_${RSYA_ID}"></div><script>window.yaContextCb=window.yaContextCb||[]</script><script src="https://yandex.ru/ads/system/context.js" async></script><script>window.yaContextCb.push(function(){Ya.Context.AdvManager.render({blockId:"${RSYA_ID}",renderTo:"yandex_rtb_${RSYA_ID}"})})</script>` : "";
const METRIKA = `<!-- Yandex.Metrika counter --><script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js?id=113844391","ym");ym(113844391,"init",{webvisor:true,clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true,trackHash:false});</script><noscript><div><img src="https://mc.yandex.ru/watch/113844391" style="position:absolute;left:-9999px" alt="" /></div></noscript><!-- /Yandex.Metrika counter -->`;
function page({ title, desc, canon, crumbs, body, ld, js, sticky }) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<script>if(location.protocol==="http:"&&/(^|\\.)motohelper\\.ru$/.test(location.hostname))location.replace("https://"+location.host+location.pathname+location.search+location.hash);</script>
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
${AD}
<footer>MotoHelper — ремонт, ТО и запчасти для мотоциклов, питбайков и мопедов: диагностика, инструкции, ИИ-механик. Данные справочные — перед работой сверяйся с мануалом своего мотоцикла. <a href="/m/">Каталог</a> · <a href="/">Приложение</a></footer>
</main>
${sticky ? `<div class="sticky"><a class="cta" href="${sticky}">Открыть в MotoHelper: ремонт, запчасти, ИИ</a></div>` : ""}
${js ? `<script>${js}</script>` : ""}
${METRIKA}
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


/* ===== моторы, инструкции, поломки: отдельные страницы под запросы «масло 172FMM», «зазоры клапанов», «не заводится» ===== */
const okEng = (only, e) => !only || only.some((x) => x === e.id || (e.groups || []).indexOf(x) >= 0);
const guidesOf = (e) => GUIDES.filter((g) => okEng(g.only, e) && !(e.cvt && NO_CVT.indexOf(g.id) >= 0));
const diagOf = (e) => DIAG.filter((d) => !d.only || d.only.some((x) => (e.groups || []).indexOf(x) >= 0));
const KEY_GUIDES = ["oil", "valves", "valves-dohc", "valves-screw", "spark", "carb-tune", "carb-clean", "chain"];
const bikesOf = {}; // мотор → модели
BIKES.forEach((b) => b.versions.forEach((v) => { const l = (bikesOf[v.engine] = bikesOf[v.engine] || []); if (l.indexOf(b) < 0) l.push(b); }));
const engIds = Object.keys(bikesOf).sort((a, b) => COLL.compare(ENGINES[a].code, ENGINES[b].code));
const engSlug = {}, usedE = {};
engIds.forEach((id) => { let x = slugify(ENGINES[id].code), i = 2; const b0 = x; while (usedE[x]) x = b0 + "-" + i++; usedE[x] = 1; engSlug[id] = x; });
const dupCode = {};
engIds.forEach((id) => (dupCode[ENGINES[id].code] = (dupCode[ENGINES[id].code] || 0) + 1));
const popular = engIds.slice().sort((a, b) => bikesOf[b].length - bikesOf[a].length);
const engTitle = (e) => e.code + (e.name && e.name.indexOf(e.code) < 0 ? " (" + e.name + ")" : "");
/* значения в шагах ({valveIn}, {spark}…) свои у каждого мотора: в тексте — название, ниже — таблица по популярным моторам */
const PH = { valveIn: "зазор впуска", valveEx: "зазор выпуска", spark: "свеча", gap: "зазор свечи", idle: "обороты ХХ", jetMain: "главный жиклёр", jetPilot: "жиклёр ХХ",
  oil: "масло", oilVol: "объём масла", sparkTorque: "момент затяжки свечи", compression: "компрессия", coolant: "антифриз", needle: "положение иглы", fuel: "топливо",
  valveInt: "интервал проверки клапанов", cooling: "охлаждение", ignition: "зажигание", hp: "мощность", name: "мотор" };
/* в тексте шага — короткая отсылка к таблице («Залей нужное масло — объём по таблице»), без таблицы — «по мануалу» */
const PHI = { valveIn: "по таблице", valveEx: "по таблице", spark: "нужной марки", gap: "зазор по таблице", idle: "по таблице", jetMain: "размер по таблице", jetPilot: "размер по таблице",
  oil: "нужное масло", oilVol: "объём по таблице", sparkTorque: "момент по таблице", compression: "норма по таблице", coolant: "по таблице", needle: "по таблице", fuel: "по таблице" };
const phText = (t, inTable) => esc(t).replace(/\{(\w+)\}/g, (m, k) => `<span class="ph">${inTable && inTable.indexOf(k) >= 0 ? PHI[k] || "по таблице" : "по мануалу"}</span>`);
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
    const keyG = guidesOf(e).filter((g) => KEY_GUIDES.indexOf(g.id) >= 0);
    const more = `<div class="chips"><a class="chip" href="/m/motor/${engSlug[v.engine]}/">Всё о моторе ${esc(e.code)} →</a>${keyG.map((g) => `<a class="chip" href="/m/remont/${g.id}/">${esc(g.title)}</a>`).join("")}</div>`;
    return `<section class="ver">${head}<div class="tiles">${tiles(e, v)}</div>${approx}${groups}${iss}${more}
<a class="cta" href="${appLink(b, vi)}">Ремонт, запчасти и ИИ-механик для ${esc(full)} →</a></section>`;
  }).join("\n");
  const others = BIKES.filter((x) => x.brand === b.brand && x !== b).slice(0, 12);
  /* вопрос-ответ: то, что спрашивают в поиске («какое масло в Kayo T2») — видимым блоком и разметкой FAQPage */
  const v0 = b.versions[0], multi = b.versions.length > 1 ? " (" + verName(v0, 0, e0) + ")" : "";
  const okv = (x) => x && x !== "—" && !/мануал/i.test(x);
  const dot = (t) => (/[.!?]$/.test(t) ? t : t + ".");
  const lc = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const faq = [
    okv(e0.oil) && ["Какое масло заливать в " + full + "?", e0.oil + (okv(e0.oilVol) ? ", объём " + e0.oilVol : "") + (e0.oilInt ? ". Замена " + kmh(e0.oilInt, e0, b).replace(/\u00a0/g, " ") : "") + multi],
    okv(e0.spark) && ["Какая свеча на " + full + "?", e0.spark + (okv(e0.gap) ? ", зазор " + e0.gap : "") + multi],
    okv(e0.valveIn) && okv(e0.valveEx) && ["Какие зазоры клапанов на " + full + "?", "Впуск " + e0.valveIn + ", выпуск " + e0.valveEx + ", на холодном моторе" + multi],
    ["Какой мотор стоит на " + full + "?", (e0.name && e0.name.indexOf(e0.code) >= 0 ? e0.name : e0.code + (e0.name ? " (" + e0.name + ")" : "")) + (e0.cc ? ", " + Math.round(e0.cc) + " см³" : "") + ((v0.hp || e0.hp) ? ", " + (v0.hp || e0.hp) + " л.с." : "") + multi],
    (e0.issues || []).length && ["Какие слабые места у " + full + "?", e0.issues.slice(0, 3).map((x) => x.t + (x.fix ? " — " + lc(x.fix.replace(/\.$/, "")) : "")).join("; ")],
  ].filter(Boolean).map((q) => [q[0], dot(q[1])]);
  const faqHtml = `<h2>Частые вопросы</h2><div class="faq">${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join("")}</div>`;
  const body = `<section class="hero"><div class="kick">${esc(b.brand)} · ${esc(b.type)}</div><h1>${esc(b.name)}</h1>
<p class="lead">Мотор ${esc(e0.code)}${e0.cc ? ", " + e0.cc + " см³" : ""}${e0.hp ? ", " + (b.versions[0].hp || e0.hp) + " л.с" : ""}. Какое масло и сколько, свеча, зазоры клапанов, жиклёры и слабые места${b.versions.length > 1 ? " — по поколениям" : ""}.</p>
${b.versions.length > 1 ? `<div class="chips">${b.versions.map((v, vi) => `<span class="chip">${esc(verName(v, vi, ENGINES[v.engine]))}</span>`).join("")}</div>` : ""}</section>
${vers}
${faqHtml}
${others.length ? `<h2>Другие модели ${esc(b.brand)}</h2><div class="grid models">${others.map((x) => modelCard(x)).join("")}</div><p><a class="chip" href="/m/${brandSlug[b.brand]}/">Все модели ${esc(b.brand)} →</a></p>` : ""}`;
  const desc = `${full}: мотор ${e0.code}${e0.cc ? " (" + e0.cc + " см³" + (e0.hp ? ", " + (b.versions[0].hp || e0.hp) + " л.с." : "") + ")" : ""}, масло ${e0.oil || "—"}${e0.oilVol ? " " + e0.oilVol : ""}, свеча ${e0.spark || "—"}, зазоры клапанов ${e0.valveIn || "—"} / ${e0.valveEx || "—"}. Слабые места и ремонт.`;
  files.set("m/" + slug + "/index.html", page({ title: `${full} — масло, свечи, зазоры клапанов, слабые места | MotoHelper`, desc, canon, crumbs, body, sticky: appLink(b, 0),
    ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: full, url: canon, inLanguage: "ru", description: desc },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((q) => ({ "@type": "Question", name: q[0], acceptedAnswer: { "@type": "Answer", text: q[1] } })) }] }));
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
<div class="grid" style="margin-bottom:14px"><a class="card big" href="/m/polomka/"><b>Неисправности</b></a><a class="card big" href="/m/remont/"><b>Инструкции</b></a><a class="card big" href="/m/motor/"><b>Моторы</b></a><a class="card big" href="/m/podborka/"><b>Подборки</b></a><a class="card big" href="/m/sravnenie/"><b>Сравнения</b></a></div>
<div class="search">${SEARCH_ICON}<input id="q" type="search" placeholder="Найти модель: «Kayo T2», «CRF250», «174»" autocomplete="off" aria-label="Поиск модели" /></div>
<div id="res" class="grid models res"></div>
<h2>Популярные марки</h2><div class="grid">${pop.map((br) => `<a class="card big" href="/m/${brandSlug[br]}/"><b>${esc(br)}</b><span class="n">${count(br)}</span></a>`).join("")}</div>
<h2>Все марки</h2>${Object.keys(byLetter).map((l, i, ls) => `${cyr(l) && !cyr(ls[i - 1] || "a") ? `<h2>Российские марки</h2>` : ""}<div class="letter">${esc(l)}</div><div class="grid">${byLetter[l].map((br) => `<a class="card" href="/m/${brandSlug[br]}/"><b>${esc(br)}</b><small>${count(br)} ${plural(count(br), "модель", "модели", "моделей")}</small></a>`).join("")}</div>`).join("")}`;
  files.set("m/index.html", page({ title: "Каталог мотоциклов, питбайков и мопедов — масло, свечи, моторы | MotoHelper", desc: `${BIKES.length} моделей: мотор, масло и его объём, свечи, зазоры клапанов, жиклёры и слабые места.`, canon: SITE + "m/", crumbs, body, ld: [crumbLd(crumbs)], js: SEARCH_JS }));
  files.set("m/index.json", JSON.stringify(BIKES.map((b) => { const e = ENGINES[b.versions[0].engine]; return { b: b.brand, n: b.name, u: bikeSlug.get(b), t: b.type, e: e.code + (e.cc ? " · " + e.cc + " см³" : "") }; })) + "\n");
}


/* мотор: /m/motor/<код>/ */
engIds.forEach((id) => {
  const e = ENGINES[id], list = bikesOf[id], b0 = list[0], slug = engSlug[id], canon = SITE + "m/motor/" + slug + "/";
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Моторы", "/m/motor/"], [e.code, null]];
  const aka = AKA[id] ? String(AKA[id]).split(/\s+/).filter((x) => x && x.toLowerCase() !== String(e.code).toLowerCase()) : [];
  const groups = `<div class="groups">${specGroups(e, {}, b0).map((g) => `<div class="grp"><h3>${g.title}</h3><dl>${g.rows.map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl></div>`).join("")}</div>`;
  const iss = (e.issues || []).length ? `<h2>Слабые места ${esc(e.code)}</h2><ul class="iss">${e.issues.map((x) => `<li class="${x.sev}"><span class="sev">${SEV[x.sev] || ""}</span><b>${esc(x.t)}</b>${esc(x.fix)}</li>`).join("")}</ul>` : "";
  const gs = guidesOf(e), ds = diagOf(e);
  const body = `<section class="hero"><div class="kick">Мотор${e.cc ? " · " + e.cc + " см³" : ""}${e.stroke ? " · " + esc(e.stroke) : ""}</div><h1>${esc(e.code)}</h1>
<p class="lead">${esc(e.name || e.code)}: какое масло и сколько заливать, свеча и зазор, зазоры клапанов, жиклёры, слабые места. Стоит на ${list.length} ${plural(list.length, "модели", "моделях", "моделях")}.</p>
${aka.length ? `<div class="chips">${aka.slice(0, 8).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>` : ""}</section>
<section class="ver"><div class="tiles">${tiles(e, {})}</div>${groups}${iss}
<a class="cta" href="${appLink(b0, b0.versions.findIndex((v) => v.engine === id))}">Ремонт, запчасти и ИИ-механик для ${esc(e.code)} →</a></section>
<h2>Мотоциклы с мотором ${esc(e.code)}</h2><div class="grid models">${list.slice(0, 60).map((x) => modelCard(x, true)).join("")}</div>
${ds.length ? `<h2>Неисправности</h2><div class="chips">${ds.map((d) => `<a class="chip" href="/m/polomka/${d.id}/">${esc(d.title)}</a>`).join("")}</div>` : ""}
${gs.length ? `<h2>Инструкции для ${esc(e.code)}</h2><div class="chips">${gs.map((g) => `<a class="chip" href="/m/remont/${g.id}/">${esc(g.title)}</a>`).join("")}</div>` : ""}`;
  const desc = `Мотор ${engTitle(e)}${e.cc ? ", " + e.cc + " см³" : ""}: масло ${e.oil || "—"}${e.oilVol ? " " + e.oilVol : ""}, свеча ${e.spark || "—"}${e.gap ? " (зазор " + e.gap + ")" : ""}, клапаны ${e.valveIn || "—"} / ${e.valveEx || "—"}. На каких мотоциклах стоит, слабые места, ремонт.`;
  const tName = dupCode[e.code] > 1 && e.name && e.name !== e.code ? e.name : e.code;
  files.set("m/motor/" + slug + "/index.html", page({ title: `${tName} — масло и объём, свеча, зазоры клапанов | MotoHelper`, desc, canon, crumbs, body, sticky: appLink(b0, 0),
    ld: [crumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name: "Мотор " + e.code, url: canon, inLanguage: "ru", description: desc }] }));
});
{
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Моторы", null]];
  const byLetter = {};
  engIds.forEach((id) => { const l = String(ENGINES[id].code)[0].toUpperCase(); (byLetter[l] = byLetter[l] || []).push(id); });
  const card = (id) => { const e = ENGINES[id]; return `<a class="card" href="/m/motor/${engSlug[id]}/"><b>${esc(e.code)}</b><small>${[e.cc ? e.cc + " см³" : "", bikesOf[id].length + " " + plural(bikesOf[id].length, "модель", "модели", "моделей")].filter(Boolean).join(" · ")}</small></a>`; };
  const body = `<section class="hero"><div class="kick">Справочник</div><h1>Моторы</h1><p class="lead">${engIds.length} ${plural(engIds.length, "мотор", "мотора", "моторов")}: масло и объём, свечи, зазоры клапанов, жиклёры, слабые места и на каких мотоциклах стоят.</p></section>
<h2>Самые распространённые</h2><div class="grid">${popular.slice(0, 24).map(card).join("")}</div>
<h2>Все моторы</h2>${Object.keys(byLetter).sort(abc).map((l) => `<div class="letter">${esc(l)}</div><div class="grid">${byLetter[l].map(card).join("")}</div>`).join("")}`;
  files.set("m/motor/index.html", page({ title: "Моторы мотоциклов и питбайков: масло, свечи, зазоры клапанов | MotoHelper", desc: `${engIds.length} моторов — 172FMM, 174MN, PR300, NC250 и другие: масло и объём, свечи, зазоры клапанов, слабые места.`, canon: SITE + "m/motor/", crumbs, body, ld: [crumbLd(crumbs)] }));
}

/* инструкция: /m/remont/<id>/ */
GUIDES.forEach((g) => {
  const canon = SITE + "m/remont/" + g.id + "/";
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Инструкции", "/m/remont/"], [g.title, null]];
  const okE = (e) => okEng(g.only, e) && !(e.cvt && NO_CVT.indexOf(g.id) >= 0);
  const vt = valuesTable(phKeys(g.steps), okE);
  const plain = g.steps.map((x) => String(x).replace(/\{(\w+)\}/g, (m, k) => vt.keys.indexOf(k) >= 0 ? PHI[k] || "по таблице" : "по мануалу"));
  const body = `<section class="hero"><div class="kick">Инструкция</div><h1>${esc(g.title)}</h1>
<div class="meta">${g.time ? `<span class="chip">⏱ ${esc(g.time)}</span>` : ""}${g.diff ? `<span class="chip">${esc(g.diff)}</span>` : ""}<span class="chip">${g.steps.length} ${plural(g.steps.length, "шаг", "шага", "шагов")}</span></div></section>
${(g.tools || []).length ? `<h2>Понадобится</h2><ul class="plain">${g.tools.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
<h2>Пошагово</h2><ol class="steps">${g.steps.map((x) => `<li>${phText(x, vt.keys)}</li>`).join("")}</ol>
${vt.html}
<a class="cta" href="/#g=${g.id}">Открыть с цифрами для своего мотоцикла →</a>
<h2>Другие инструкции</h2><div class="chips">${GUIDES.filter((x) => x !== g && x.area && x.area === g.area).slice(0, 12).concat(GUIDES.filter((x) => KEY_GUIDES.indexOf(x.id) >= 0 && x !== g)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 16).map((x) => `<a class="chip" href="/m/remont/${x.id}/">${esc(x.title)}</a>`).join("")}<a class="chip" href="/m/remont/">Все инструкции →</a></div>`;
  const desc = (g.title + ": " + plain.slice(0, 3).join(" ")).slice(0, 230).replace(/\s+\S*$/, "") + "…";
  const ld = { "@context": "https://schema.org", "@type": "HowTo", name: g.title, inLanguage: "ru", url: canon, step: plain.map((t, i) => ({ "@type": "HowToStep", position: i + 1, text: t })) };
  if (g.tools && g.tools.length) ld.tool = g.tools.map((t) => ({ "@type": "HowToTool", name: t }));
  files.set("m/remont/" + g.id + "/index.html", page({ title: `${g.title} на мотоцикле и питбайке — пошагово | MotoHelper`, desc, canon, crumbs, body, sticky: "/#g=" + g.id, ld: [crumbLd(crumbs), ld] }));
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
  d.steps.forEach((st) => [st.q, st.hint, st.efiQ, st.onNo && st.onNo.action, st.onYes && st.onYes.action].forEach((t) => t && texts.push(t)));
  const okE = (e) => !d.only || d.only.some((x) => (e.groups || []).indexOf(x) >= 0);
  const vt = valuesTable(phKeys(texts), okE), ph = (t) => phText(t, vt.keys);
  const res = (r, word) => r && typeof r === "object" ? `<span class="no"><b>${esc(word)} → ${esc(r.result || "")}</b>${ph(r.action || "")}</span>` : "";
  const steps = d.steps.map((st) => `<li>${ph(st.q)}${st.efiQ ? `<span class="hint">На инжекторе: ${ph(st.efiQ)}</span>` : ""}${st.hint ? `<span class="hint">${ph(st.hint)}</span>` : ""}${res(st.onYes, st.yes || "Да")}${res(st.onNo, st.no || "Нет")}</li>`).join("");
  const causes = d.steps.flatMap((st) => [st.onYes, st.onNo]).filter((r) => r && typeof r === "object" && r.result).map((r) => r.result);
  const body = `<section class="hero"><div class="kick">Неисправность</div><h1>${esc(d.title)}</h1><p class="lead">Проверяй по порядку — от простого к сложному. ${causes.length ? "Частые причины: " + esc(causes.slice(0, 5).join(", ").toLowerCase()) + "." : ""}</p></section>
<h2>Что проверить</h2><ol class="steps">${steps}</ol>
${vt.html}
<a class="cta" href="/#d=${d.id}">Пройти проверку в MotoHelper под свой мотоцикл →</a>
<h2>Другие неисправности</h2><div class="chips">${DIAG.filter((x) => x !== d).map((x) => `<a class="chip" href="/m/polomka/${x.id}/">${esc(x.title)}</a>`).join("")}</div>`;
  const desc = `${d.title} — мотоцикл, питбайк, скутер: что проверить по шагам${causes.length ? " (" + causes.slice(0, 4).join(", ").toLowerCase() + ")" : ""} и как исправить.`;
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: d.steps.filter((st) => st.onNo && st.onNo.result || st.onYes && st.onYes.result).slice(0, 8).map((st) => {
    const r = typeof st.onNo === "object" ? st.onNo : st.onYes;
    const pl = (t) => String(t).replace(/\{(\w+)\}/g, (m, k) => vt.keys.indexOf(k) >= 0 ? PHI[k] || "по таблице" : "по мануалу");
    return { "@type": "Question", name: pl(st.q), acceptedAnswer: { "@type": "Answer", text: pl(r.result + ". " + r.action) } };
  }) };
  files.set("m/polomka/" + d.id + "/index.html", page({ title: `${d.title}: причины и что проверить — мотоцикл, питбайк | MotoHelper`, desc, canon, crumbs, body, sticky: "/#d=" + d.id, ld: [crumbLd(crumbs)].concat(faq.mainEntity.length ? [faq] : []) }));
});
{
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Неисправности", null]];
  const body = `<section class="hero"><div class="kick">Диагностика</div><h1>Неисправности</h1><p class="lead">Не заводится, глохнет, дымит, не тянет, стреляет — проверки по шагам, от простого к сложному.</p></section>
<div class="grid models">${DIAG.map((d) => `<a class="card" href="/m/polomka/${d.id}/"><b>${esc(d.title)}</b><small>${d.steps.length} ${plural(d.steps.length, "проверка", "проверки", "проверок")}</small></a>`).join("")}</div>`;
  files.set("m/polomka/index.html", page({ title: "Неисправности мотоцикла и питбайка: причины и проверка по шагам | MotoHelper", desc: "Не заводится, глохнет, дымит, перегревается, не тянет — что проверить по шагам и как починить мотоцикл, питбайк или скутер.", canon: SITE + "m/polomka/", crumbs, body, ld: [crumbLd(crumbs)] }));
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
const CMP_BRANDS = ["Motoland", "Kayo", "Regulmoto", "BSE", "Avantis", "Progasi", "Racer", "Irbis", "Stels", "Sharmax", "Apollo", "JHL", "Kove", "CFMOTO"];
const compareByGroup = {}, compares = [];
/* самые продаваемые модели — в сравнениях их класса они выбираются первыми */
const FLAGSHIP = ["Motoland TT250", "Kayo T2 250", "Regulmoto Sport-003 PR", "Avantis Enduro 250", "Progasi Super Max 250 RR", "BSE Z8", "Kayo K1 300", "Regulmoto Athlete 300", "Avantis A7 NEW", "Motoland TT125", "BSE PH10 125"];
Object.keys(groups).forEach((k) => {
  const pick = {};
  groups[k].filter((b) => CMP_BRANDS.indexOf(b.brand) >= 0).forEach((b) => { const p = pick[b.brand]; const fl = (x) => FLAGSHIP.indexOf(x.brand + " " + x.name) >= 0;
    if (!p || fl(b) > fl(p) || (fl(b) === fl(p) && (b.versions.length > p.versions.length || (b.versions.length === p.versions.length && b.name.length < p.name.length)))) pick[b.brand] = b; });
  const reps = Object.values(pick).sort((a, b) => CMP_BRANDS.indexOf(a.brand) - CMP_BRANDS.indexOf(b.brand)).slice(0, 6);
  for (let i = 0; i < reps.length; i++) for (let j = i + 1; j < reps.length; j++) {
    const c = { a: reps[i], b: reps[j], k, slug: bikeSlug.get(reps[i]) + "-vs-" + bikeSlug.get(reps[j]), title: reps[i].brand + " " + reps[i].name + " или " + reps[j].brand + " " + reps[j].name };
    compares.push(c); (compareByGroup[k] = compareByGroup[k] || []).push(c);
  }
});
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
<div class="chips"><a class="chip" href="/m/${bikeSlug.get(A)}/">Всё о ${esc(na)} →</a><a class="chip" href="/m/${bikeSlug.get(Bk)}/">Всё о ${esc(nb)} →</a>${groups[c.k] && podSlug[c.k] ? `<a class="chip" href="/m/podborka/${podSlug[c.k]}/">Все ${esc(podName(c.k).toLowerCase())} →</a>` : ""}</div>
${others.length ? `<h2>Другие сравнения</h2><div class="chips">${others.map((x) => `<a class="chip" href="/m/sravnenie/${x.slug}/">${esc(x.title)}</a>`).join("")}</div>` : ""}`;
  files.set("m/sravnenie/" + c.slug + "/index.html", page({ title: `${na} или ${nb} — что выбрать: сравнение | MotoHelper`, desc: `${na} против ${nb}: ${facts.slice(0, 2).join(" ")} Масло, свечи, зазоры клапанов, слабые места.`.slice(0, 300), canon, crumbs, body, sticky: appLink(A, 0), ld: [crumbLd(crumbs)] }));
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
  const rows = list.slice(0, 120).map((b) => { const v = b.versions[0], e = ENGINES[v.engine];
    return `<tr><td><a href="/m/${bikeSlug.get(b)}/">${esc(b.brand + " " + b.name)}</a></td><td><a href="/m/motor/${engSlug[v.engine]}/">${esc(e.code)}</a></td><td>${hpOf(b, v) || "—"}</td><td>${esc(e.cooling || "—")}</td><td>${esc(e.oilVol || "—")}</td><td>${e.oilInt ? esc(kmh(e.oilInt, e, b).replace(/^каждые /, "")) : "—"}</td></tr>`; }).join("");
  const cmp = (compareByGroup[k] || []).slice(0, 12);
  const body = `<section class="hero"><div class="kick">Подборка</div><h1>${esc(name)}</h1><p class="lead">${list.length} ${plural(list.length, "модель", "модели", "моделей")} от ${brandsN} ${plural(brandsN, "марки", "марок", "марок")}: мотор, мощность, охлаждение, масло и как часто его менять. Отсортировано по мощности.</p></section>
${facts.length ? `<ul class="plain">${facts.map((f) => `<li>${f}</li>`).join("")}</ul>` : ""}
<h2>Все модели</h2><div class="tblw"><table class="tbl"><tr><th>Модель</th><th>Мотор</th><th>л.с.</th><th>Охлаждение</th><th>Масло</th><th>Замена масла</th></tr>${rows}</table></div>
${cmp.length ? `<h2>Сравнения</h2><div class="chips">${cmp.map((c) => `<a class="chip" href="/m/sravnenie/${c.slug}/">${esc(c.title)}</a>`).join("")}</div>` : ""}
<h2>Другие подборки</h2><div class="chips">${podKeys.filter((x) => x !== k && x.split("|")[0] === k.split("|")[0]).concat(podKeys.filter((x) => x.split("|")[0] !== k.split("|")[0]).slice(0, 6)).slice(0, 14).map((x) => `<a class="chip" href="/m/podborka/${podSlug[x]}/">${esc(podName(x))}</a>`).join("")}</div>`;
  files.set("m/podborka/" + podSlug[k] + "/index.html", page({ title: `${name}: все модели — мотор, мощность, масло | MotoHelper`, desc: `${name}: ${list.length} моделей — ${list.slice(0, 4).map((b) => b.brand + " " + b.name).join(", ")} и другие. Мотор, мощность, охлаждение, масло и интервал замены.`, canon, crumbs, body, ld: [crumbLd(crumbs)] }));
});
{
  const crumbs = [["MotoHelper", "/"], ["Каталог", "/m/"], ["Подборки", null]];
  const byType = {}; podKeys.forEach((k) => (byType[k.split("|")[0]] = byType[k.split("|")[0]] || []).push(k));
  const body = `<section class="hero"><div class="kick">Выбор мотоцикла</div><h1>Подборки</h1><p class="lead">Все модели одного класса в одной таблице: мотор, мощность, охлаждение, масло.</p></section>
${Object.keys(byType).map((t) => `<h2>${esc(TYPE_MANY[t] || t)}</h2><div class="grid">${byType[t].sort((a, b) => +a.split("|")[1] - +b.split("|")[1]).map((k) => `<a class="card" href="/m/podborka/${podSlug[k]}/"><b>${esc(podName(k))}</b><small>${groups[k].length} ${plural(groups[k].length, "модель", "модели", "моделей")}</small></a>`).join("")}</div>`).join("")}`;
  files.set("m/podborka/index.html", page({ title: "Подборки мотоциклов, питбайков и эндуро по объёму | MotoHelper", desc: "Эндуро 250, эндуро 300, питбайки 125 и 150 и другие классы: все модели в одной таблице — мотор, мощность, масло.", canon: SITE + "m/podborka/", crumbs, body, ld: [crumbLd(crumbs)] }));
}

/* Telegram-канал: tg/posts.json = написанные посты (tg/manual.json) + «мотор дня» на свободные дни.
   Порядок моторов — по числу моделей; без масла, свечи или зазоров клапанов мотор пропускаем. */
{
  const manual = JSON.parse(fs.readFileSync(path.join(ROOT, "tg/manual.json"), "utf8"));
  const busy = new Set(manual.posts.map((p) => p.date));
  const ok = (v) => v && v !== "—" && !/мануал/i.test(v);
  const seen = new Set(), manualText = manual.posts.map((p) => p.text).join("\n");
  const cards = popular.filter((id) => { const e = ENGINES[id], c = e.code; if (seen.has(c) || manualText.indexOf("/m/motor/" + engSlug[id] + "/") >= 0 || !ok(e.oil) || !ok(e.oilVol) || !ok(e.spark) || !ok(e.valveIn) || !ok(e.valveEx)) return false; seen.add(c); return true; })
    .map((id) => {
      const e = ENGINES[id], list = bikesOf[id], iss = (e.issues || []).find((x) => x.sev === "high") || (e.issues || [])[0];
      const names = list.slice(0, 4).map((b) => b.brand + " " + b.name).join(", ") + (list.length > 4 ? " и ещё " + (list.length - 4) : "");
      const text = [
        "⚙️ Мотор дня: " + e.code + (e.cc ? " (" + Math.round(e.cc) + " см³" + (e.hp ? ", " + e.hp + " л.с." : "") + ")" : ""),
        "",
        "Стоит на: " + names,
        "",
        "🛢 Масло: " + e.oil + ", " + e.oilVol + (e.oilInt ? " — менять " + kmh(e.oilInt, e, list[0]) : ""),
        "🕯 Свеча: " + e.spark + (ok(e.gap) ? ", зазор " + e.gap : ""),
        "🔧 Клапаны (на холодную): впуск " + e.valveIn + ", выпуск " + e.valveEx,
        iss ? "⚠️ Слабое место: " + iss.t + ". " + (iss.fix || "") : "",
        "",
        "Всё про мотор: " + SITE + "m/motor/" + engSlug[id] + "/",
      ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n").replace(/\n{3,}/g, "\n\n").trim();
      return { id: "eng-" + engSlug[id], text };
    });
  const posts = manual.posts.slice();
  const day = new Date(Date.UTC(2026, 9, 30)), last = Date.UTC(2027, 5, 30);
  let k = 0;
  for (; day.getTime() <= last && k < cards.length; day.setUTCDate(day.getUTCDate() + 1)) {
    const d = day.toISOString().slice(0, 10);
    if (!busy.has(d)) posts.push(Object.assign({ date: d }, cards[k++]));
  }
  posts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  files.set("tg/posts.json", JSON.stringify({ _: "Собрано scripts/build-pages.js из tg/manual.json и базы моторов — правь tg/manual.json", channel: manual.channel, posts }, null, 1) + "\n");
}

/* Telegram-бот: справочник для ответов в личке, разбитый на мелкие файлы tg/idx/<первые 2 знака>.json — у сервера на
   бесплатном тарифе 10 мс процессора на запрос, поэтому он читает только файлы для слов вопроса.
   В файле: слово латиницей → [[вес, номер строки]]; строки — по 100 в tg/idx/l<номер/100>.json;
   инструкции и поломки — tg/idx/g.json с основами слов. */
{
  const ok = (v) => v && v !== "—";
  const facts = (e) => [e.code + (e.cc ? " " + Math.round(e.cc) + " см³" : "") + (e.hp ? " " + e.hp + " л.с." : ""), ok(e.oil) ? "масло " + e.oil + (ok(e.oilVol) ? " " + e.oilVol : "") : "", ok(e.spark) ? "свеча " + e.spark + (ok(e.gap) ? " зазор " + e.gap : "") : "", ok(e.valveIn) ? "клапаны впуск " + e.valveIn + " выпуск " + (e.valveEx || "—") : ""].filter(Boolean).join("; ");
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
  const stems = (x) => (String(x).toLowerCase().replace(/ё/g, "е").match(/[а-я]{4,}/g) || []).map((w) => w.slice(0, 5));
  const g = GUIDES.map((x) => [x.title, SITE + "m/remont/" + x.id + "/"]).concat(DIAG.map((x) => [x.title, SITE + "m/polomka/" + x.id + "/"])).map((x) => [x[0] + " — " + x[1], [...new Set(stems(x[0]))]]);
  files.set("tg/idx/g.json", JSON.stringify(g) + "\n");
}

files.set("m/m.css", CSS + "\n");
const urls = [SITE, SITE + "m/", SITE + "m/motor/", SITE + "m/remont/", SITE + "m/polomka/"].concat(brands.map((br) => SITE + "m/" + brandSlug[br] + "/"),
  GUIDES.map((g) => SITE + "m/remont/" + g.id + "/"), DIAG.map((d) => SITE + "m/polomka/" + d.id + "/"),
  BIKES.map((b) => SITE + "m/" + bikeSlug.get(b) + "/"), engIds.map((id) => SITE + "m/motor/" + engSlug[id] + "/"),
  [SITE + "m/podborka/", SITE + "m/sravnenie/"], podKeys.map((k) => SITE + "m/podborka/" + podSlug[k] + "/"), compares.map((c) => SITE + "m/sravnenie/" + c.slug + "/"));
const hi = 5 + brands.length + GUIDES.length + DIAG.length;
files.set("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u, i) => `  <url><loc>${u}</loc><changefreq>${i ? "monthly" : "weekly"}</changefreq><priority>${i === 0 ? "1.0" : i < hi ? "0.7" : "0.6"}</priority></url>`).join("\n")}\n</urlset>\n`);

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
