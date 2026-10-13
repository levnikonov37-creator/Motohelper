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
