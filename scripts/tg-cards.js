// Картинки для постов Telegram-канала: img/tg/<id>.jpg (1280×720) по tg/cards.json (его собирает scripts/build-pages.js).
// Стиль — как фото модели в каталоге: тёмный «подиум» с подсветкой снизу, мотоцикл с отражением, марка и модель слева сверху.
//   node scripts/tg-cards.js          — нарисовать недостающие
//   node scripts/tg-cards.js --all    — перерисовать все
//   node scripts/tg-cards.js <id> …   — перерисовать выбранные
// Нужен Playwright с Chromium (npm i -D playwright && npx playwright install chromium). После — пересобрать:
//   node scripts/build-pages.js (в tg/posts.json появятся ссылки на картинки).
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "img/tg");
const W = 1280, H = 720;
const args = process.argv.slice(2);
const all = args.includes("--all"), only = args.filter((a) => !a.startsWith("--"));
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "tg/cards.json"), "utf8")).cards;
const todo = cards.filter((c) => (only.length ? only.includes(c.id) : all || !fs.existsSync(path.join(OUT, c.id + ".jpg"))));
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const file = (p) => "file://" + path.join(ROOT, p);

const FONTS = [["Unbounded", 600, "unbounded-600"], ["Unbounded", 700, "unbounded-700"], ["Fira Sans", 400, "fira-sans-400"], ["Fira Sans", 500, "fira-sans-500"],
  ["Fira Sans", 600, "fira-sans-600"], ["Fira Sans Condensed", 600, "fira-sans-condensed-600"], ["Fira Sans Condensed", 700, "fira-sans-condensed-700"]]
  .map(([f, w, n]) => `@font-face{font-family:"${f}";font-weight:${w};src:url("${file("fonts/" + n + "-normal.woff2")}") format("woff2")}`).join("");

const CSS = FONTS + `
*{box-sizing:border-box}html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#0d0e12}
body{font-family:"Fira Sans",sans-serif;color:#F2F3F5;-webkit-font-smoothing:antialiased}
.card{position:relative;width:${W}px;height:${H}px;overflow:hidden;
  background:radial-gradient(70% 60% at 50% 92%,var(--glow,rgba(138,140,255,.18)),transparent 70%),linear-gradient(180deg,#15171d 0%,#0d0e12 62%,#121318 100%)}
.spot{position:absolute;left:50%;top:-34%;width:90%;height:120%;transform:translateX(-50%);background:radial-gradient(50% 50% at 50% 50%,rgba(255,255,255,.075),transparent 70%)}
.floor{position:absolute;left:5%;right:5%;bottom:17%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)}
.ph,.refl{position:absolute;left:61%;bottom:17%;width:66%;height:64%;object-fit:contain;object-position:50% 100%;transform:translateX(-50%)}
.ph{filter:drop-shadow(0 18px 24px rgba(0,0,0,.6))}
.refl{transform:translateX(-50%) scaleY(-1);transform-origin:50% 100%;-webkit-mask-image:linear-gradient(0deg,rgba(0,0,0,.3),transparent 30%);filter:blur(1.5px)}
.top{position:absolute;left:60px;top:54px;right:60px;z-index:2}
.kick{display:inline-flex;align-items:center;gap:10px;font:600 21px "Fira Sans Condensed";letter-spacing:.12em;text-transform:uppercase;color:#D4D8DF;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.11);padding:7px 18px 7px 13px;border-radius:999px}
.kick i{width:13px;height:13px;border-radius:50%;background:linear-gradient(135deg,#3AF2CF,#4E95FF 38%,#9B6BFF 68%,#FF6FD0)}
.brand{margin-top:22px;font:600 24px "Fira Sans Condensed";letter-spacing:.12em;text-transform:uppercase;color:#9AA0AB}
.name{margin-top:4px;font:700 66px/1.06 "Unbounded";letter-spacing:-.015em;max-width:760px}
.name.long{font-size:52px}.name.xlong{font-size:42px}.spec .name{max-width:600px}
.grad{background:linear-gradient(92deg,#3AF2CF,#4E95FF 38%,#9B6BFF 68%,#FF6FD0);-webkit-background-clip:text;background-clip:text;color:transparent}
.chips{position:absolute;left:60px;bottom:48px;display:flex;flex-wrap:wrap;gap:10px;max-width:820px;z-index:2}
.chips span{font:600 23px "Fira Sans Condensed";color:#EEF0F3;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);padding:7px 17px;border-radius:999px}
.logo{position:absolute;right:56px;bottom:46px;display:flex;align-items:center;gap:13px;font:600 25px "Unbounded";color:#F2F3F5;z-index:3}
.logo b{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#3AF2CF,#4E95FF 38%,#9B6BFF 68%,#FF6FD0);display:grid;place-items:center;
  color:#0A0A0A;font:italic 900 21px "Arial Black",Arial,sans-serif;letter-spacing:-1px;padding-right:2px}
.wm{position:absolute;right:56px;top:268px;font:700 150px/1 "Unbounded";white-space:nowrap;letter-spacing:-.03em;opacity:.16;text-align:right}
.wm.long{font-size:112px;top:300px}
.tiles{position:absolute;left:60px;right:60px;bottom:118px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;z-index:2}
.tile{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:18px 20px;min-height:128px}
.tile small{display:block;font:600 17px "Fira Sans Condensed";letter-spacing:.1em;text-transform:uppercase;color:#9AA0AB}
.tile b{display:block;margin-top:8px;font:600 27px/1.15 "Unbounded";letter-spacing:-.01em;word-break:break-word}
.tile span{display:block;margin-top:6px;font:500 19px "Fira Sans";color:#AEB3BC}
.tip .title{margin-top:26px;font:700 58px/1.12 "Unbounded";letter-spacing:-.015em;max-width:780px}
.tip .title.long{font-size:48px}.tip .title.xlong{font-size:40px}
.icon{position:absolute;right:90px;top:50%;width:300px;height:300px;transform:translateY(-58%)}
.ring{position:absolute;right:40px;top:50%;width:400px;height:400px;transform:translateY(-58%);border-radius:50%;
  background:radial-gradient(circle,var(--ring,rgba(78,149,255,.16)),transparent 68%)}
.hol .top{top:70px}.hol .title{margin-top:30px;font:700 76px/1.05 "Unbounded";letter-spacing:-.02em;max-width:900px}
.hol .title.long{font-size:60px}
.hol .sub{margin-top:22px;font:500 30px/1.3 "Fira Sans";color:#C9CDD4;max-width:760px}
.big{position:absolute;right:40px;bottom:110px;font:700 230px/1 "Unbounded";letter-spacing:-.04em;opacity:.95}
.stripe{position:absolute;left:0;right:0;top:0;height:12px}
.deco{position:absolute;inset:0;pointer-events:none}
`;

const LOGO = `<div class="logo"><b>MH</b>MotoHelper</div>`;
const nameCls = (s, a, b) => (s.length > b ? " xlong" : s.length > a ? " long" : "");

/* иконки советов: линии с градиентом */
const IC = {
  drop: `<path d="M150 40c40 55 80 100 80 150a80 80 0 0 1-160 0c0-50 40-95 80-150z"/><path d="M110 200a40 40 0 0 0 40 40"/>`,
  snow: `<path d="M150 40v220M55 95l190 110M55 205l190-110"/><path d="M125 55l25 25 25-25M125 245l25-25 25 25M62 128l34-9-9-34M238 172l-34 9 9 34M62 172l34 9-9 34M238 128l-34-9 9-34"/>`,
  bolt: `<path d="M170 30L80 170h70l-20 100 90-140h-70z"/>`,
  gear: `<circle cx="150" cy="150" r="42"/><path d="M150 50v30M150 220v30M50 150h30M220 150h30M79 79l21 21M200 200l21 21M79 221l21-21M200 100l21-21"/><circle cx="150" cy="150" r="88"/>`,
  wrench: `<path d="M205 50a55 55 0 0 0-70 70L50 205a25 25 0 0 0 35 35l85-85a55 55 0 0 0 70-70l-35 35-30-5-5-30z"/>`,
  chain: `<rect x="40" y="110" width="120" height="80" rx="40"/><rect x="140" y="110" width="120" height="80" rx="40"/>`,
  disc: `<circle cx="150" cy="150" r="105"/><circle cx="150" cy="150" r="32"/><path d="M150 70v10M150 220v10M70 150h10M220 150h10M93 93l7 7M200 200l7 7M93 207l7-7M200 100l7-7"/>`,
  wheel: `<circle cx="150" cy="150" r="110"/><circle cx="150" cy="150" r="85"/><circle cx="150" cy="150" r="16"/><path d="M150 65v170M65 150h170M90 90l120 120M90 210l120-120"/>`,
  temp: `<path d="M130 60a20 20 0 0 1 40 0v120a45 45 0 1 1-40 0z"/><path d="M150 120v85"/><path d="M200 80h40M200 115h30M200 150h40"/>`,
  spark: `<path d="M130 40h40v40h-40zM120 80h60v50h-60zM140 130h20v70h-20zM150 200v30"/><path d="M95 245l25-15M205 245l-25-15M150 268v-20"/>`,
  fuel: `<path d="M70 260V70a20 20 0 0 1 20-20h90a20 20 0 0 1 20 20v190M55 260h160M90 100h90v55H90zM200 120h30a15 15 0 0 1 15 15v80a15 15 0 0 0 30 0V110l-30-30"/>`,
  shield: `<path d="M150 40l95 35v75c0 60-40 100-95 120-55-20-95-60-95-120V75z"/><path d="M110 150l30 30 55-60"/>`,
  map: `<path d="M150 265s85-80 85-145a85 85 0 0 0-170 0c0 65 85 145 85 145z"/><circle cx="150" cy="120" r="30"/>`,
  spring: `<path d="M90 50h120M90 250h120M100 50l100 25-100 25 100 25-100 25 100 25-100 25 100 25"/>`,
  sun: `<circle cx="150" cy="150" r="52"/><path d="M150 40v32M150 228v32M40 150h32M228 150h32M72 72l23 23M205 205l23 23M72 228l23-23M205 95l23-23"/>`,
  bulb: `<path d="M150 40a75 75 0 0 0-45 135c10 8 15 20 15 30v15h60v-15c0-10 5-22 15-30a75 75 0 0 0-45-135z"/><path d="M125 250h50"/>`,
};
const AREA_IC = { winter: "snow", "scooter-winter": "snow", oil: "drop", "scooter-gearoil": "drop", carb: "fuel", spark: "spark", head: "gear", cyl: "gear", gearbox: "gear",
  timing: "gear", compression: "gear", clutch: "gear", cvt: "gear", fork: "spring", sag: "spring", "swingarm-bushings": "spring", bleed: "disc", pads: "disc", "caliper-rebuild": "disc",
  "brake-bedding": "disc", "drum-adjust": "disc", cooling: "temp", chain: "chain", wheelbearings: "wheel", spokes: "wheel", "tire-mount": "wheel", "tubeless-plug": "wheel", tube: "wheel",
  "mousse-install": "wheel", "wheel-balance": "wheel", "cush-drive": "wheel", "post-crash": "shield", "handguards-install": "shield", "long-trip": "map", fieldkit: "map", "spring-prep": "bulb",
  "first-service": "wrench" };
const icon = (name, a, b) => `<svg class="icon" viewBox="0 0 300 300" fill="none" stroke="url(#ig)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
  <defs><linearGradient id="ig" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a || "#3AF2CF"}"/><stop offset=".5" stop-color="#4E95FF"/><stop offset="1" stop-color="${b || "#FF6FD0"}"/></linearGradient></defs>${IC[name] || IC.wrench}</svg>`;
const snow = (n, seed) => { let s = seed, r = () => ((s = (s * 9301 + 49297) % 233280) / 233280); let o = "";
  for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H, z = 10 + r() * 26, a = 0.15 + r() * 0.5;
    if (x < 880 && y < 300) continue; /* не поверх заголовка */
    o += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})" stroke="rgba(255,255,255,${a.toFixed(2)})" stroke-width="2.4" stroke-linecap="round"><path d="M0 ${-z}V${z}M${-z * 0.87} ${-z / 2}L${z * 0.87} ${z / 2}M${-z * 0.87} ${z / 2}L${z * 0.87} ${-z / 2}"/></g>`; }
  return `<svg class="deco" viewBox="0 0 ${W} ${H}">${o}</svg>`; };
const hearts = (n, seed) => { let s = seed, r = () => ((s = (s * 9301 + 49297) % 233280) / 233280); let o = "";
  for (let i = 0; i < n; i++) { const x = 560 + r() * 700, y = 60 + r() * 560, z = 0.4 + r() * 1.2, a = 0.15 + r() * 0.5;
    o += `<path transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${z.toFixed(2)})" d="M0 12C-14 0-22-8-22-17a11 11 0 0 1 22-4 11 11 0 0 1 22 4c0 9-8 17-22 29z" fill="rgba(255,111,160,${a.toFixed(2)})"/>`; }
  return `<svg class="deco" viewBox="0 0 ${W} ${H}">${o}</svg>`; };
const flowers = () => { let o = "", pts = [[980, 210, 1.3], [1130, 330, 0.9], [890, 420, 1], [1060, 520, 1.15], [1190, 160, .7]];
  pts.forEach(([x, y, k]) => { o += `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 40v120" stroke="rgba(120,220,170,.55)" stroke-width="6"/><path d="M0 110c-30-10-40-35-40-35 25 0 40 20 40 35z" fill="rgba(120,220,170,.4)"/>`
    + `<path d="M-28 10c0-30 14-48 28-56 14 8 28 26 28 56-8 20-48 20-56 0z" fill="rgba(255,111,208,.75)"/><path d="M-10 -10c4-22 10-32 10-36 0 4 6 14 10 36" stroke="rgba(255,255,255,.35)" stroke-width="3" fill="none"/></g>`; });
  return `<svg class="deco" viewBox="0 0 ${W} ${H}">${o}</svg>`; };
const checker = () => `<div style="position:absolute;left:0;right:0;top:0;height:36px;opacity:.9;background:repeating-conic-gradient(#e9ecef 0 25%,#0d0e12 0 50%) 0 0/36px 36px"></div>`;
const star = (c) => `<svg class="icon" viewBox="0 0 300 300" style="opacity:.9"><path d="M150 30l35 75 82 9-61 56 17 81-73-42-73 42 17-81-61-56 82-9z" fill="none" stroke="${c}" stroke-width="10" stroke-linejoin="round"/></svg>`;

const THEME = {
  news: { glow: "rgba(78,149,255,.22)", deco: () => icon("bulb") },
  ny: { glow: "rgba(78,149,255,.24)", deco: (c) => snow(70, 7) + (c.big ? `<div class="big grad">${esc(c.big)}</div>` : "") },
  feb14: { glow: "rgba(255,111,160,.22)", deco: () => hearts(26, 3) },
  feb23: { glow: "rgba(140,170,90,.22)", stripe: "repeating-linear-gradient(90deg,#5b6b3a 0 60px,#3e4a27 60px 120px)", deco: () => star("rgba(200,215,150,.8)") },
  mar8: { glow: "rgba(255,111,208,.22)", deco: () => flowers() },
  apr1: { glow: "rgba(255,200,60,.2)", deco: () => `<div class="big" style="color:rgba(255,210,80,.9);transform:rotate(-8deg)">1.04</div>` },
  season: { glow: "rgba(58,242,207,.2)", deco: () => checker() + icon("map", "#3AF2CF", "#9B6BFF") },
  may1: { glow: "rgba(150,220,90,.2)", deco: () => icon("sun", "#FFD84E", "#7BE06A") },
  may9: { glow: "rgba(220,60,50,.22)", stripe: "repeating-linear-gradient(90deg,#f28c1c 0 40px,#111 40px 80px)", deco: () => star("rgba(230,70,60,.85)") },
  jun12: { glow: "rgba(78,149,255,.2)", stripe: "linear-gradient(180deg,#fff 0 33%,#1c57d6 33% 66%,#d52b1e 66%)", deco: () => `<div class="big grad">12.06</div>` },
};

function html(c) {
  if (c.kind === "bike") {
    return `<div class="card"><div class="spot"></div><div class="floor"></div>
<img class="refl" src="${file(c.photo)}"><img class="ph" src="${file(c.photo)}">
<div class="top"><span class="kick"><i></i>Мотоцикл дня</span><div class="brand">${esc(c.brand)}</div><div class="name grad${nameCls(c.name, 12, 20)}">${esc(c.name)}</div></div>
<div class="chips">${c.chips.map((x) => `<span>${esc(x)}</span>`).join("")}</div>${LOGO}</div>`;
  }
  if (c.kind === "spec") {
    const code = String(c.code).split(/\s*\(/)[0];
    return `<div class="card spec"><div class="spot"></div><div class="ring" style="top:34%"></div>${code.length <= 11 ? `<div class="wm grad${nameCls(code, 7, 99)}">${esc(code)}</div>` : ""}
<div class="top"><span class="kick"><i></i>Мотоцикл дня</span><div class="brand">${esc(c.brand)}</div><div class="name grad${nameCls(c.name, 12, 20)}">${esc(c.name)}</div></div>
<div class="tiles">${c.rows.map((r) => `<div class="tile"><small>${esc(r[0])}</small><b>${esc(r[1])}</b>${r[2] ? `<span>${esc(r[2])}</span>` : ""}</div>`).join("")}</div>${LOGO}</div>`;
  }
  if (c.kind === "tip") {
    return `<div class="card tip" style="--glow:rgba(58,242,207,.14)"><div class="spot"></div><div class="ring"></div>${icon(AREA_IC[c.area] || "wrench")}
<div class="top"><span class="kick"><i></i>Полезный совет</span><div class="title${nameCls(c.title, 34, 52)}">${esc(c.title)}</div></div>
<div class="chips">${c.meta.concat(c.only ? [c.only] : []).map((x) => `<span>${esc(x)}</span>`).join("")}</div>${LOGO}</div>`;
  }
  const t = THEME[c.theme] || THEME.news;
  return `<div class="card hol" style="--glow:${t.glow}"><div class="spot"></div>${t.stripe ? `<div class="stripe" style="background:${t.stripe}"></div>` : ""}${t.deco(c)}
<div class="top"><span class="kick"><i></i>${esc(c.kick)}</span><div class="title${c.title.length > 18 ? " long" : ""}">${esc(c.title)}</div>${c.sub ? `<div class="sub">${esc(c.sub)}</div>` : ""}</div>${LOGO}</div>`;
}

(async () => {
  /* картинки постов, которых больше нет в расписании, — удаляем */
  const keep = new Set(cards.map((c) => c.id + ".jpg"));
  if (fs.existsSync(OUT)) fs.readdirSync(OUT).filter((f) => /\.jpg$/.test(f) && !keep.has(f)).forEach((f) => { fs.unlinkSync(path.join(OUT, f)); console.log("удалена лишняя " + f); });
  if (!todo.length) return console.log("Картинки постов: всё нарисовано (" + cards.length + ")");
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const tmp = path.join(require("os").tmpdir(), "mh-tg-card.html");
  let n = 0;
  for (const c of todo) {
    fs.writeFileSync(tmp, `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html(c)}</body></html>`);
    await page.goto("file://" + tmp);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))); });
    await page.screenshot({ path: path.join(OUT, c.id + ".jpg"), type: "jpeg", quality: 82 });
    n++;
  }
  await b.close();
  console.log("Картинки постов: нарисовано " + n + " из " + cards.length + " → img/tg/. Теперь: node scripts/build-pages.js");
})();
