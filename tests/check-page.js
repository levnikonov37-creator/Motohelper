// Проверка сайта в настоящем браузере: node tests/check-page.js
// Поднимает локальный сервер, открывает index.html в Chromium (Playwright),
// ждёт отрисовки и проверяет, что нет ошибок и работает поиск мотоцикла.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  // ИИ-сервер в проверке — заглушка: настоящий принимает запросы только с сайта на github.io
  if (url === "/ai-config.json" || url === "/__ai") {
    res.writeHead(200, { "Content-Type": "application/json" });
    const body = url === "/ai-config.json" ? { endpoint: `http://${req.headers.host}/__ai` } : req.method === "GET" ? { ok: true, images: false } : { response: "Проверка связи." };
    return res.end(JSON.stringify(body));
  }
  const file = path.join(root, url === "/" ? "index.html" : url);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
    page.on("pageerror", (e) => errors.push("Ошибка JS: " + e.message));
    page.on("console", (m) => m.type() === "error" && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text()) && errors.push("console.error: " + m.text()));
    page.on("requestfailed", (r) => r.url().startsWith(base) && errors.push("Не загрузился файл: " + r.url()));
    // без онбординга, чтобы сразу попасть в интерфейс
    await page.addInitScript(() => localStorage.setItem("mh2-onboarded", "true"));
    // фото моделей: Wikimedia Commons ничего не находит, поиск картинок Bing отдаёт заглушку
    await page.route("https://commons.wikimedia.org/**", (r) => r.fulfill({ contentType: "application/json", body: '{"query":{"pages":[]}}' }));
    const photoReqs = [];
    const fakePhoto = (r) => {
      photoReqs.push(new URL(r.request().url()).searchParams.get("q"));
      r.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#fff"/><circle cx="150" cy="300" r="80"/><circle cx="460" cy="300" r="80"/></svg>' });
    };
    await page.route(/mm\.bing\.net\/th/, fakePhoto);
    await page.goto(base, { waitUntil: "load" });
    await page.waitForFunction(() => document.getElementById("root").dataset.ok === "1", null, { timeout: 20000 });

    const counts = await page.evaluate(() => ({ bikes: BIKES.length, engines: Object.keys(ENGINES).length }));
    if (counts.bikes < 1000) errors.push("Слишком мало моделей: " + counts.bikes);

    // Поиск в окне «Найди свой мотоцикл»
    await page.locator(".bike-chip").first().click({ timeout: 10000 });
    const input = page.getByPlaceholder(/Марка, модель или мотор/);
    // Поиск по мотору: «174» → подсказка ZS174MN-5 → все модели с ним; вкладка «Моторы» понимает русскую раскладку
    await input.fill("174");
    const hint = page.locator(".bf-enghints .chip", { hasText: "ZS174MN-5 —" });
    await hint.waitFor({ timeout: 5000 });
    await hint.click();
    const engHead = await page.locator(".bf-brandhead h3").innerText();
    if (!/ZS174MN-5/.test(engHead)) errors.push("Поиск мотора: после выбора ZS174MN-5 заголовок «" + engHead + "»");
    if ((await page.locator(".bf-item").count()) < 10) errors.push("Поиск мотора: мало моделей с ZS174MN-5");
    await page.getByRole("button", { name: "Моторы", exact: true }).click();
    await page.getByPlaceholder(/Код мотора/).fill("нб300");
    const engFound = await page.locator(".bf-item b", { hasText: "ZS174MN-5" }).first().waitFor({ timeout: 5000 }).then(() => true, () => false);
    if (!engFound) errors.push("Вкладка «Моторы»: «нб300» не нашёл ZS174MN-5, нашёл: " + (await page.locator(".bf-item b").allInnerTexts()).join(", "));
    await page.getByRole("button", { name: "Модели", exact: true }).click();
    // Неправильная раскладка: «лфнщ» — это kayo
    await input.fill("лфнщ");
    const kayo = await page.locator(".bf-item .bf-brand-s", { hasText: "Kayo" }).first().waitFor({ timeout: 5000 }).then(() => true, () => false);
    if (!kayo) errors.push("Поиск «лфнщ» (kayo в русской раскладке) ничего не нашёл");
    // Как пишут люди: по-русски, кириллицей вместо латиницы, народные названия — нужная модель в первых трёх
    for (const [q, re] of [["сузуки бандит 400", /Suzuki.*Bandit 400/], ["харлей 883", /Harley.*883/], ["кавасаки зх6р", /Kawasaki.*ZX-6R/],
      ["клх 300", /KLX ?300/], ["хонда св 400", /Honda.*CB ?400/], ["мт 09", /Yamaha.*MT-09/], ["джиксер 600", /GSX-R ?600/],
      ["вистром 650", /V-Strom 650/], ["k1 300", /Kayo.*K1/], ["тенере", /T[ée]n[ée]r[ée]/], ["ява 638", /Jawa.*638/], ["гсх 600", /Suzuki.*GSX/]]) {
      await input.fill(q);
      await page.waitForTimeout(150);
      const top = (await page.locator(".bf-item").allInnerTexts()).slice(0, 3).map((t) => t.replace(/\s+/g, " "));
      if (!top.some((t) => re.test(t))) errors.push("Поиск «" + q + "»: в первых трёх нет нужной модели — " + (top.join(" / ") || "ничего"));
    }
    await input.fill("DR-Z400S");
    await page.getByText("DR-Z400S").first().waitFor({ timeout: 5000 });

    // Выбираем найденную модель и обходим разделы — каждый должен открыться без ошибок
    await page.getByText("DR-Z400S").first().click();
    await page.waitForTimeout(500);
    for (const tab of ["Мотоцикл", "Ремонт", "Запчасти", "Главная"]) {
      await page.getByRole("button", { name: tab }).last().click({ timeout: 5000 });
      await page.waitForTimeout(400);
    }
    // Запчасти: у деталей есть кнопка «Где купить», по нажатию — ссылки на поиск в магазинах
    await page.getByRole("button", { name: "Запчасти" }).last().click();
    await page.locator(".pbuy-t").first().click({ timeout: 5000 }).catch(() => errors.push("Запчасти: нет кнопки «Где купить»"));
    const ozon = await page.locator('.pbuy a[href*="ozon.ru"]').first().getAttribute("href", { timeout: 5000 }).catch(() => null);
    if (!ozon) errors.push("Запчасти: нет ссылок на магазины");
    // Шапка: меню «Мои мотоциклы» открывается и закрывается
    await page.locator(".bike-chip").click();
    const menu = await page.locator(".bmenu").waitFor({ timeout: 3000 }).then(() => true, () => false);
    if (!menu) errors.push("Не открылось меню «Мои мотоциклы» по нажатию на мотоцикл в шапке");
    else await page.keyboard.press("Escape");
    // Вид «Мотоцикл»: фото модели из поиска картинок, «Другое фото» листает снимки
    await page.getByRole("button", { name: "Главная" }).last().click();
    // мотор и вид мотоцикла — во вкладке «Мотоцикл», на главной к нему ведёт плитка «Мотор в 3D»
    await page.locator(".home-acts .act", { hasText: "Мотор в 3D" }).click();
    await page.locator(".view-toggle button", { hasText: "Мотоцикл" }).first().click();
    // по умолчанию — рисунок; фото модели — по кнопке «Фото»
    await page.locator(".bv-toggle button", { hasText: "Фото" }).click();
    const photoOk = await page.locator(".model-photo.ok").waitFor({ timeout: 8000 }).then(() => true, () => false);
    if (!photoOk) errors.push("Вид «Мотоцикл»: фото модели не показалось");
    else {
      if (!/DR-Z400S/.test(photoReqs[0] || "")) errors.push("Фото модели: запрос без названия модели — " + photoReqs[0]);
      const src1 = await page.locator(".mp-img").getAttribute("src");
      await page.locator(".mp-next").click();
      await page.locator(".model-photo.ok").waitFor({ timeout: 5000 }).catch(() => {});
      if ((await page.locator(".mp-img").getAttribute("src")) === src1) errors.push("Кнопка «Другое фото» не сменила фото");
      await page.locator(".bv-toggle button", { hasText: "Рисунок" }).click();
    }
    // рисунок по геометрии строится, точки узлов на месте
    await page.locator(".bike-svg").first().waitFor({ timeout: 5000 }).catch(() => {});
    const artPaths = await page.locator(".bike-svg path").count(), artPins = await page.locator(".bike-svg .pin").count();
    if (artPaths < 60 || artPins < 5) errors.push(`Рисунок мотоцикла не построился: ${artPaths} фигур, ${artPins} точек`);
    // фото не загрузилось (нет сети, сервер недоступен) — сам показывается рисунок
    await page.locator(".bv-toggle button", { hasText: "Фото" }).click();
    await page.locator(".view-toggle button", { hasText: "Схема" }).first().click();
    // Ручка газа: завести, держать — обороты растут, отпустить — падают; при удержании текст не выделяется
    await page.locator(".start-btn").click();
    const grip = page.locator(".thr-grip");
    if (!(await grip.waitFor({ timeout: 8000 }).then(() => true, () => false))) errors.push("Мотор: после «Завести» нет ручки газа");
    else {
      await page.waitForTimeout(1500);
      const gb = await grip.boundingBox();
      const rpmNow = async () => +(await page.locator(".thr-rpm b").innerText()).replace(/\D/g, "");
      const idle = await rpmNow();
      await page.mouse.move(gb.x + gb.width * 0.95, gb.y + gb.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(1200);
      const high = await rpmNow();
      await page.mouse.up();
      await page.waitForTimeout(1500);
      const back = await rpmNow();
      if (!(high > idle + 2000)) errors.push(`Газ: обороты не выросли (${idle} → ${high})`);
      if (!(back < high - 1500)) errors.push(`Газ отпущен, обороты не упали (${high} → ${back})`);
      const selText = await page.evaluate(() => String(window.getSelection()));
      if (selText) errors.push("Газ: при удержании выделился текст «" + selText.slice(0, 40) + "»");
      await page.locator(".start-btn").click();
    }
    await page.unroute(/mm\.bing\.net\/th/, fakePhoto);
    await page.route(/mm\.bing\.net\/th/, (r) => r.abort());
    await page.locator(".view-toggle button", { hasText: "Мотоцикл" }).first().click();
    const artBack = await page.locator(".bv-note").waitFor({ timeout: 8000 }).then(() => true, () => false);
    if (!artBack || !(await page.locator(".bike-svg").count())) errors.push("Фото не загрузилось, а рисунок вместо него не показался");
    await page.locator(".view-toggle button", { hasText: "Схема" }).first().click();
    console.log(`Страница открылась: ${counts.bikes} моделей, ${counts.engines} двигателей`);

    await page.getByRole("button", { name: "Мотоцикл" }).last().click();
    await page.getByRole("tab", { name: "Тюнинг" }).click();
    // каталог тюнинга открыт сразу, цены — диапазоном за деталь («1 500–3 500 ₽»)
    await page.locator(".tz-card").first().waitFor({ timeout: 5000 }).catch(() => {});
    if ((await page.locator(".tz-card").count()) < 5) errors.push("Тюнинг: в каталоге меньше 5 карточек");
    const tzPrice = await page.locator(".tz-price b").first().innerText().catch(() => "");
    if (!/\d\s?\d{3}–\d[\d\s]*₽|своими руками/.test(tzPrice)) errors.push("Тюнинг: цена не диапазоном: «" + tzPrice + "»");
    // звёзды (свёрнуты): открыть, «−» у передней звезды — тяга на колесе растёт
    await page.locator(".fold-head", { hasText: "Звёзды" }).click();
    await page.locator(".sprockets .spr-steps").last().locator("button", { hasText: "−" }).first().click();
    const sprRes = await page.locator(".sprockets .spr-res").innerText().catch(() => "");
    if (!/\+\d/.test(sprRes)) errors.push("Звёзды: после «−1 спереди» нет прироста тяги: " + sprRes.replace(/\n/g, " "));
    // у доработок нет выдуманных «звёзд»-рейтингов
    if (await page.locator(".tz-meta", { hasText: "★" }).count()) errors.push("Тюнинг: на карточках остались звёзды-рейтинги");
    await page.getByRole("tab", { name: "Обзор" }).click();

    // Весь ремонт в одном разделе; кнопка «Назад» браузера возвращает на прошлый экран, а не уходит с сайта
    await page.getByRole("button", { name: "Ремонт" }).last().click();
    await page.locator(".rhub").first().waitFor({ timeout: 5000 });
    await page.locator(".rhub .act", { hasText: "ТО по пробегу" }).click();
    const toOk = await page.locator(".plan-go").first().waitFor({ timeout: 5000 }).then(() => true, () => false);
    if (!toOk) errors.push("Ремонт → ТО по пробегу: нет кнопок «Как сделать»");
    await page.goBack();
    const hubBack = await page.locator(".rhub").first().waitFor({ timeout: 5000 }).then(() => true, () => false);
    if (!hubBack) errors.push("«Назад» из «ТО по пробегу» не вернул в раздел «Ремонт»");
    await page.locator(".rhub .act", { hasText: "Узлы" }).click();
    await page.locator(".unit-tile").first().click();
    const unitOk = await page.locator(".unit-view h1").waitFor({ timeout: 5000 }).then(() => true, () => false);
    if (!unitOk) errors.push("Ремонт → Узлы: страница узла не открылась");
    // Поиск по всему сайту из шапки: находит инструкцию и открывает её
    await page.getByRole("button", { name: "Поиск по сайту" }).first().click();
    await page.getByRole("dialog", { name: "Поиск по сайту" }).getByRole("searchbox").fill("свеча");
    const hit = page.locator(".search-sheet .qresults button", { hasText: "Инструкция" }).first();
    const hitOk = await hit.waitFor({ timeout: 5000 }).then(() => true, () => false);
    if (!hitOk) errors.push("Поиск по сайту: «свеча» не нашёл инструкцию");
    else {
      await hit.click();
      const opened = await page.locator(".g-steps").waitFor({ timeout: 5000 }).then(() => true, () => false);
      if (!opened) errors.push("Поиск по сайту: инструкция не открылась");
      if (await page.locator(".search-sheet").count()) errors.push("Поиск по сайту: окно не закрылось после выбора");
      await page.goBack();
      const backUnit = await page.locator(".unit-view").waitFor({ timeout: 5000 }).then(() => true, () => false);
      if (!backUnit) errors.push("«Назад» после поиска не вернул на прошлый экран");
    }

    // Пользователь со старыми сохранениями (до объединения поколений) — ключи должны перенестись
    const old = await browser.newPage({ viewport: { width: 420, height: 900 } });
    old.on("pageerror", (e) => errors.push("Ошибка JS (старые сохранения): " + e.message));
    await old.addInitScript(() => {
      if (localStorage.getItem("mh2-test-seeded")) return;
      localStorage.setItem("mh2-test-seeded", "1");
      localStorage.setItem("mh2-onboarded", "true");
      localStorage.setItem("mh2-sel", JSON.stringify({ key: "Honda CRF450R 2009–2016", vi: 0 }));
      localStorage.setItem("mh2-custom", JSON.stringify({ "Honda CRF450R 2009–2016|0": { hp: 60 } }));
      localStorage.setItem("mh2-garage", JSON.stringify([{ key: "Yamaha WR250R 2012", vi: 0 }]));
      localStorage.setItem("mh2-projects", JSON.stringify({ "Honda CRF450R 2009–2016|CRF450": ["pipe"] }));
    });
    await old.goto(base, { waitUntil: "load" });
    await old.waitForFunction(() => document.getElementById("root").dataset.ok === "1", null, { timeout: 20000 });
    const st = await old.evaluate(() => ({
      sel: JSON.parse(localStorage.getItem("mh2-sel")),
      custom: JSON.parse(localStorage.getItem("mh2-custom")),
      garage: JSON.parse(localStorage.getItem("mh2-garage")),
      projects: JSON.parse(localStorage.getItem("mh2-projects")),
    }));
    const expect = (ok, what) => ok || errors.push("Перенос сохранений: " + what + " — " + JSON.stringify(st));
    expect(st.sel.key === "Honda CRF450R" && st.sel.vi === 1, "выбор мотоцикла");
    expect(st.custom["Honda CRF450R|1"] && st.custom["Honda CRF450R|1"].hp === 60, "настройки");
    expect(st.garage[0].key === "Yamaha WR250R" && st.garage[0].vi === 0, "гараж");
    expect(st.projects["Honda CRF450R|CRF450"], "проекты тюнинга");
    // повторная загрузка не должна менять уже перенесённое
    await old.evaluate(() => localStorage.setItem("mh2-sel", JSON.stringify({ key: "Honda CRF450R", vi: 3 })));
    await old.reload({ waitUntil: "load" });
    await old.waitForFunction(() => document.getElementById("root").dataset.ok === "1", null, { timeout: 20000 });
    const again = await old.evaluate(() => JSON.parse(localStorage.getItem("mh2-sel")));
    if (again.vi !== 3) errors.push("Перенос сохранений срабатывает повторно: " + JSON.stringify(again));

    // Установка на телефон: manifest и иконки на месте
    const man = await page.evaluate(async () => (await fetch("manifest.webmanifest")).json());
    for (const ic of man.icons || []) {
      const ok = await page.evaluate(async (src) => (await fetch(src)).ok, ic.src);
      if (!ok) errors.push("Нет иконки из manifest: " + ic.src);
    }
    if (!man.icons || !man.icons.length || !man.start_url) errors.push("manifest без иконок или start_url");

    // Без интернета: после первого захода сайт открывается из кэша (service worker), 3D тоже
    const offCtx = await browser.newContext({ viewport: { width: 420, height: 900 } });
    const off = await offCtx.newPage();
    off.on("pageerror", (e) => errors.push("Ошибка JS (без сети): " + e.message));
    await off.addInitScript(() => { localStorage.setItem("mh2-onboarded", "true"); sessionStorage.setItem("mh-intro", "1"); });
    await off.goto(base, { waitUntil: "load" });
    const swState = await off.evaluate(async () => {
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 10000))]);
      if (!reg) return "нет";
      // дождаться, пока в кэш ляжет и 3D-библиотека (она кладётся фоном после основных файлов)
      for (let i = 0; i < 50; i++) {
        const keys = await caches.keys();
        const c = keys.length && (await caches.open(keys[0]));
        if (c && (await c.match("vendor/three.min.js"))) {
          // кэш готов; воркер мог ещё не закончить activate — подождём его
          for (let j = 0; j < 50 && reg.active && reg.active.state !== "activated"; j++) await new Promise((r) => setTimeout(r, 100));
          return reg.active && reg.active.state;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      return "без 3D в кэше";
    });
    if (swState !== "activated") errors.push("Service worker (работа без интернета): " + swState);
    await offCtx.setOffline(true);
    await off.reload({ waitUntil: "load" });
    const offOk = await off.waitForFunction(() => document.getElementById("root").dataset.ok === "1", null, { timeout: 15000 }).then(() => true, () => false);
    if (!offOk) errors.push("Без интернета сайт не открылся");
    else {
      await off.getByRole("button", { name: "Мотоцикл" }).last().click();
      await off.locator(".view-toggle button", { hasText: "3D" }).first().click();
      const has3d = await off.waitForFunction(() => !!window.THREE, null, { timeout: 10000 }).then(() => true, () => false);
      if (!has3d) errors.push("Без интернета не загрузилась 3D-модель мотора");
    }
    await offCtx.close();
    // Первый заход: один экран «Какой у тебя мотоцикл?» — популярные с фото; выбрал — на главной фото этой модели
    const fresh = await browser.newPage({ viewport: { width: 400, height: 860 } });
    fresh.on("pageerror", (e) => errors.push("Ошибка JS (первый заход): " + e.message));
    await fresh.goto(base, { waitUntil: "load" });
    const card = fresh.locator(".onb2-card").first();
    if (!(await card.waitFor({ timeout: 10000 }).then(() => true, () => false))) errors.push("Первый заход: нет популярных моделей с фото");
    else {
      const name = (await card.locator("b").innerText()).trim();
      await card.click();
      if (await fresh.locator(".onb2").count()) errors.push("Первый заход: после выбора модели окно не закрылось");
      const shown = await fresh.waitForFunction(() => document.querySelectorAll(".hero-bike svg path").length > 80, null, { timeout: 8000 }).then(() => true, () => false);
      if (!shown) errors.push("Главная: нет рисунка выбранной модели «" + name + "»");
      const chip = await fresh.locator(".bike-chip .bc-name").innerText();
      if (chip.trim() !== name) errors.push("Первый заход: выбрана «" + name + "», в шапке «" + chip + "»");
    }
    await fresh.close();
  } catch (e) {
    errors.push("Сценарий не прошёл: " + e.message.split("\n")[0]);
  } finally {
    await browser.close();
    server.close();
  }
  if (errors.length) {
    console.error(errors.map((e) => " - " + e).join("\n"));
    process.exit(1);
  }
  console.log("OK: страница работает без ошибок");
})();
