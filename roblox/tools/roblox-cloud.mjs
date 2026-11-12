#!/usr/bin/env node
// Выкладка игры в Roblox через Open Cloud (запускает GitHub Actions, см. .github/workflows/roblox.yml).
//
//   node roblox/tools/roblox-cloud.mjs store    — создать Game Passes и Developer Products из store.json
//                                                 (уже созданные с тем же именем не дублируются)
//                                                 и вписать их ID в src/shared/Config.luau
//   node roblox/tools/roblox-cloud.mjs info     — название и описание игры из store.json
//   node roblox/tools/roblox-cloud.mjs publish <файл.rbxl> — опубликовать место (игроки сразу получают новую версию)
//
// Нужны переменные окружения: ROBLOX_API_KEY, ROBLOX_UNIVERSE_ID, ROBLOX_PLACE_ID (для publish).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://apis.roblox.com";
const KEY = process.env.ROBLOX_API_KEY;
const UNIVERSE = process.env.ROBLOX_UNIVERSE_ID;
const PLACE = process.env.ROBLOX_PLACE_ID;

function fail(message) {
  console.error("ОШИБКА: " + message);
  process.exit(1);
}
if (!KEY) fail("нет ROBLOX_API_KEY");
if (!/^\d+$/.test(UNIVERSE || "")) fail("ROBLOX_UNIVERSE_ID должен быть числом (Universe ID, не Place ID)");

async function call(method, url, body, headers = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(API + url, { method, body, headers: { "x-api-key": KEY, ...headers } });
    const text = await response.text();
    if (response.status === 429 || response.status >= 500) {
      console.log(`  ${response.status}, повтор через ${attempt * 3} с…`);
      await new Promise((r) => setTimeout(r, attempt * 3000));
      continue;
    }
    if (!response.ok) {
      const hint = {
        401: "ключ неверный или истёк",
        403: "у ключа нет нужного права (scope) или в ключе не выбрана эта игра",
        404: "нет такой игры/места — проверь ROBLOX_UNIVERSE_ID и ROBLOX_PLACE_ID",
        409: "место не принадлежит этой игре — проверь ROBLOX_PLACE_ID",
      }[response.status];
      fail(`${method} ${url} → ${response.status}${hint ? " (" + hint + ")" : ""}\n${text}`);
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return text;
    }
  }
  fail(`${method} ${url}: Roblox не отвечает`);
}

async function listAll(url, field) {
  const items = [];
  let token = "";
  do {
    const page = await call("GET", url + (token ? `?pageToken=${encodeURIComponent(token)}` : ""));
    items.push(...(page?.[field] || []));
    token = page?.nextPageToken || "";
  } while (token);
  return items;
}

function form(entry, iconPath) {
  const data = new FormData();
  data.set("name", entry.name);
  data.set("description", entry.description);
  data.set("isForSale", "true");
  data.set("price", String(entry.price));
  data.set("isRegionalPricingEnabled", "true");
  if (fs.existsSync(iconPath)) {
    data.set("imageFile", new Blob([fs.readFileSync(iconPath)], { type: "image/png" }), path.basename(iconPath));
  }
  return data;
}

// Меняет «Key = { Id = 0» на настоящий ID в Config.luau.
function writeId(config, key, id) {
  const pattern = new RegExp(`(\\n\\t${key} = \\{\\s*\\n\\t\\tId = )\\d+`);
  if (!pattern.test(config)) fail(`не нашёл ${key} в Config.luau`);
  return config.replace(pattern, `$1${id}`);
}

async function store() {
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, "store.json"), "utf8"));
  const configPath = path.join(ROOT, "src/shared/Config.luau");
  let config = fs.readFileSync(configPath, "utf8");

  console.log("Game Passes:");
  const passes = await listAll(`/game-passes/v1/universes/${UNIVERSE}/game-passes/creator`, "gamePasses");
  for (const [key, entry] of Object.entries(spec.gamePasses)) {
    let id = passes.find((p) => p.name === entry.name)?.gamePassId;
    if (id) {
      console.log(`  ${entry.name}: уже есть (${id})`);
    } else {
      const created = await call("POST", `/game-passes/v1/universes/${UNIVERSE}/game-passes`, form(entry, path.join(ROOT, `assets/pass-${key}.png`)));
      id = created?.gamePassId;
      if (!id) fail(`Roblox не вернул ID для ${entry.name}: ${JSON.stringify(created)}`);
      console.log(`  ${entry.name}: создан (${id}), ${entry.price} R$`);
    }
    config = writeId(config, key, id);
  }

  console.log("Developer Products:");
  const products = await listAll(`/developer-products/v2/universes/${UNIVERSE}/developer-products/creator`, "developerProducts");
  for (const [key, entry] of Object.entries(spec.products)) {
    let id = products.find((p) => p.name === entry.name)?.productId;
    if (id) {
      console.log(`  ${entry.name}: уже есть (${id})`);
    } else {
      const created = await call("POST", `/developer-products/v2/universes/${UNIVERSE}/developer-products`, form(entry, path.join(ROOT, `assets/product-${key}.png`)));
      id = created?.productId ?? created?.developerProductId ?? created?.id;
      if (!id) fail(`Roblox не вернул ID для ${entry.name}: ${JSON.stringify(created)}`);
      console.log(`  ${entry.name}: создан (${id}), ${entry.price} R$`);
    }
    config = writeId(config, key, id);
  }

  fs.writeFileSync(configPath, config);
  console.log("ID вписаны в src/shared/Config.luau");
}

async function info() {
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, "store.json"), "utf8"));
  await call(
    "PATCH",
    `/cloud/v2/universes/${UNIVERSE}?updateMask=displayName,description`,
    JSON.stringify({ displayName: spec.universe.displayName, description: spec.universe.description }),
    { "Content-Type": "application/json" },
  );
  console.log("Название и описание обновлены");
}

async function publish(file) {
  if (!/^\d+$/.test(PLACE || "")) fail("ROBLOX_PLACE_ID должен быть числом");
  if (!file || !fs.existsSync(file)) fail("нет файла места " + file);
  const version = await call(
    "POST",
    `/universes/v1/${UNIVERSE}/places/${PLACE}/versions?versionType=Published`,
    fs.readFileSync(file),
    { "Content-Type": "application/octet-stream" },
  );
  console.log("Опубликовано, версия места:", typeof version === "object" ? version.versionNumber ?? JSON.stringify(version) : version);
}

const [command, argument] = process.argv.slice(2);
if (command === "store") await store();
else if (command === "info") await info();
else if (command === "publish") await publish(argument);
else fail("команда: store | info | publish <файл.rbxl>");
