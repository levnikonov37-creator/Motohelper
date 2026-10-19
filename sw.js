/* MotoHelper — работа без интернета.
   Онлайн: всегда свежая версия с сервера (и она же сохраняется в кэш).
   Без сети: сайт открывается из кэша. ИИ-механику интернет нужен всегда.
   При изменении списка файлов увеличь VERSION. */
const VERSION = "mh-v2";
const CORE = [
  "./", "index.html", "manifest.webmanifest",
  "css/app.css", "js/data.js", "js/bike-art.js", "js/app.js", "js/motion.js",
  "vendor/react.production.min.js", "vendor/react-dom.production.min.js",
  "img/topo.svg", "img/icon-192.png", "img/icon-512.png",
];
// 3D-модель мотора: большая, кладём в кэш фоном, чтобы и она работала без сети
const LATER = ["vendor/three.min.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE).then(() => c.addAll(LATER).catch(() => {})))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // запросы к ИИ (POST) — мимо кэша
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return;
  if (font) {
    // шрифты не меняются — сначала кэш
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
      return res;
    })));
    return;
  }
  // свои файлы — сначала сеть, без сети — кэш. no-cache: браузер не берёт свою копию
  // (GitHub Pages разрешает хранить её 10 минут), а сверяется с сервером — обновления видны сразу
  const fresh = req.mode === "navigate" ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req, { cache: "no-cache" });
  e.respondWith(
    fresh.then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});
