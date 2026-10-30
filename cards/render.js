// HTML → PNG 1200×1600. node cards/render.js slide1.html [slide2.html ...]  (PNG рядом с HTML)
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  for (const f of process.argv.slice(2)) {
    await page.goto("file://" + require("path").resolve(f));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: f.replace(/\.html$/, ".png") });
  }
  await browser.close();
})();
