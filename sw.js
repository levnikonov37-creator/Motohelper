/* MotoHelper — работа без интернета и быстрый повторный заход.
   Файлы с меткой версии (?v=хэш — их ставит scripts/build-assets.js) не меняются: берём из памяти телефона,
   в сеть идём, только если файла там нет. Новая версия сайта = новые метки в index.html.
   Страница и прочие файлы: сначала сеть (всегда свежая версия), без сети — кэш; если сеть есть, но тянет
   страницу дольше 4 с, показываем сохранённую копию, а свежую кладём в кэш на следующий раз.
   ИИ-механику интернет нужен всегда. */
// --- сборка (scripts/build-assets.js) пишет эти строки сама, руками не править ---
const VERSION = "mh-385b7edad8";
const BUILT = [
  "css/app.min.css?v=cd0b450755",
  "js/data.min.js?v=9408116048",
  "js/bike-art.min.js?v=8ca6216c0f",
  "js/app.min.js?v=78d0ab647a",
  "js/motion.min.js?v=ad93390c5d",
  "vendor/react.production.min.js?v=4b4969fa4e",
  "vendor/react-dom.production.min.js?v=21758ed084",
];
// --- конец сборки ---
const CORE = [
  "./", "index.html", "manifest.webmanifest", "js/engine-worklet.js",
  "img/topo.svg", "img/icon-192.png", "img/icon-512.png",
].concat(BUILT);
// 3D-модель мотора: большая, кладём в кэш фоном, чтобы и она работала без сети
const LATER = ["vendor/three.min.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => Promise.all(CORE.map((u) =>
      // файл той же версии уже лежит в старом кэше — переносим, не качая заново;
      // страницу и файлы без метки — мимо HTTP-кэша браузера, чтобы не сохранить устаревшую копию
      /\?v=/.test(u) ? caches.match(u).then((hit) => (hit ? c.put(u, hit) : c.add(u))) : c.add(new Request(u, { cache: "reload" }))
    )).then(() => c.addAll(LATER).catch(() => {})))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function keep(req, res) {
  if (res.ok) {
    const copy = res.clone();
    return caches.open(VERSION).then((c) => c.put(req, copy)).then(() => res, () => res);
  }
  return Promise.resolve(res);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // запросы к ИИ (POST) — мимо кэша
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return;
  if (font || url.searchParams.has("v")) {
    // шрифты и файлы с меткой версии не меняются — сначала кэш
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => keep(req, res))));
    return;
  }
  // свои файлы — сначала сеть, без сети — кэш. no-cache: браузер не берёт свою копию
  // (GitHub Pages разрешает хранить её 10 минут), а сверяется с сервером — обновления видны сразу
  const nav = req.mode === "navigate";
  const net = (nav ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req, { cache: "no-cache" })).then((res) => keep(req, res));
  const saved = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (nav ? caches.match("index.html") : undefined));
  e.waitUntil(net.catch(() => {})); // свежая копия ляжет в кэш, даже если ответили сохранённой
  if (!nav) {
    e.respondWith(net.catch(() => saved().then((hit) => hit || Response.error())));
    return;
  }
  e.respondWith(new Promise((resolve) => {
    let done = false;
    const give = (res) => { if (!done && res) { done = true; resolve(res); } };
    const slow = setTimeout(() => saved().then(give), 4000);
    net.then((res) => { clearTimeout(slow); give(res); }, () => { clearTimeout(slow); saved().then((hit) => give(hit || Response.error())); });
  }));
});
