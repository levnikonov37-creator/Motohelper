// Проверка сайта в настоящем браузере: node tests/check-page.js
// Поднимает локальный сервер, открывает index.html в Chromium (Playwright),
// ждёт отрисовки и проверяет, что нет ошибок и работает поиск мотоцикла.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
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
    await page.goto(base, { waitUntil: "load" });
    await page.waitForFunction(() => document.getElementById("root").dataset.ok === "1", null, { timeout: 20000 });

    const counts = await page.evaluate(() => ({ bikes: BIKES.length, engines: Object.keys(ENGINES).length }));
    if (counts.bikes < 1000) errors.push("Слишком мало моделей: " + counts.bikes);

    // Поиск в окне «Найди свой мотоцикл»
    await page.getByText("Выбрать", { exact: true }).first().click({ timeout: 10000 });
    const input = page.getByPlaceholder(/Марка, модель или мотор/);
    // Поиск по мотору: «174» → подсказка ZS174MN-5 → все модели с ним; вкладка «Моторы» понимает русскую раскладку
    await input.fill("174");
    const hint = page.locator(".bf-enghints .chip", { hasText: "ZS174MN-5" });
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
    await input.fill("DR-Z400S");
    await page.getByText("DR-Z400S").first().waitFor({ timeout: 5000 });

    // Выбираем найденную модель и обходим разделы — каждый должен открыться без ошибок
    await page.getByText("DR-Z400S").first().click();
    await page.waitForTimeout(500);
    for (const tab of ["Мотоцикл", "Ремонт", "Запчасти", "Главная"]) {
      await page.getByRole("button", { name: tab }).last().click({ timeout: 5000 });
      await page.waitForTimeout(400);
    }
    console.log(`Страница открылась: ${counts.bikes} моделей, ${counts.engines} двигателей`);

    // Ввод чисел с клавиатуры: стёр поле и набрал заново — без лишнего «0» впереди, дроби с запятой
    await page.getByRole("button", { name: "Мотоцикл" }).last().click();
    await page.getByRole("tab", { name: "Тюнинг" }).click();
    const spr = page.locator(".sprockets input").first();
    await spr.fill("");
    await spr.pressSequentially("12");
    const sprVal = await spr.inputValue();
    if (sprVal !== "12") errors.push(`Калькулятор звёзд: набрал «12», в поле «${sprVal}»`);
    await page.getByRole("tab", { name: "Обзор" }).click();
    const tankIn = page.getByLabel("Объём бака, л");
    await tankIn.fill("");
    await tankIn.pressSequentially("6,5");
    const tankVal = await tankIn.inputValue();
    if (tankVal !== "6,5") errors.push(`Объём бака: набрал «6,5», в поле «${tankVal}»`);

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
        if (c && (await c.match("vendor/three.min.js"))) return reg.active && reg.active.state;
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
      await off.locator(".view-toggle button", { hasText: "3D" }).first().click();
      const has3d = await off.waitForFunction(() => !!window.THREE, null, { timeout: 10000 }).then(() => true, () => false);
      if (!has3d) errors.push("Без интернета не загрузилась 3D-модель мотора");
    }
    await offCtx.close();
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
