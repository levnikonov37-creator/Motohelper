// Сервер ИИ-механика для Cloudflare Workers (бесплатный тариф).
// Умеет: текст и фото. Порядок: DeepSeek (платный, основной) → Gemini → Groq → встроенный Workers AI.
// Если у DeepSeek кончился дневной лимит или деньги — отвечают бесплатные.
//
// Как обновить: Cloudflare → Workers & Pages → motohelper-ai → Edit code → вставить этот файл целиком → Deploy.
// Ключи (Settings → Variables and Secrets):
//   DEEPSEEK_API_KEY — ключ platform.deepseek.com (API keys), основной ИИ; тратит деньги с баланса DeepSeek;
//   DAILY_TOTAL      — необязательно: сколько ответов DeepSeek в сутки на всех (по умолчанию 300 ≈ 9 тыс. в месяц);
//   DAILY_PER_USER   — необязательно: сколько ответов DeepSeek в сутки одному человеку (по умолчанию 40);
//   GEMINI_API_KEY — ключ Google AI Studio (aistudio.google.com → Get API key), бесплатный запасной, умеет фото;
//   GROQ_API_KEY   — необязательно, запасной вариант для текста (console.groq.com);
//   привязка AI (Settings → Bindings → Workers AI, имя AI) — необязательно, последний запасной вариант.
//   TELEGRAM_BOT_TOKEN — ключ бота (@BotFather), бот — админ канала: тогда сервер ведёт Telegram-канал по tg/posts.json;
//   YANDEX_METRIKA_TOKEN — OAuth-ключ Метрики: по понедельникам отчёт о посещаемости владельцу (тому, кто написал боту /start).
//   YANDEX_WEBMASTER_TOKEN — необязательно, OAuth-ключ Вебмастера: в отчёте — сколько страниц в поиске Яндекса.
//   TG_HOOK_SECRET — любой пароль: с ним бот отвечает в личке как ИИ-механик (Telegram шлёт сообщения на <адрес>/tg-hook).
//     Подключить один раз: открыть <адрес сервера>/?tg=setup.
// Сайт сам узнаёт, что фото работают: GET на адрес сервера отвечает {"images": true}.

const DEEPSEEK_MODEL = "deepseek-flash";
// Gemini: по очереди — у каждой модели свой бесплатный дневной лимит (429), свежие бывают перегружены (503).
// Сначала полноценные flash, за ними облегчённые lite. «Раздумья» (thinking) минимальные: без них первые слова
// приходят через ~1 с, а не через 8–12; на вопросы механику качество то же.
// Проверить, как отвечает каждая: <адрес сервера>/?test=models; список моделей ключа и пробный вопрос — ?test=models&list=1 / &try=… (с DEBUG_TOKEN)
const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"];
// уровень раздумий по моделям (не все понимают «minimal»: такой модели — её минимальный уровень или ничего)
const GEMINI_THINK = { "gemini-3.6-flash": "low" };
const thinkFor = (model) => (model in GEMINI_THINK ? GEMINI_THINK[model] : "minimal");
// модель, которая отказала (лимит, ошибка, молчание), пропускаем 10 минут — не ждём её на каждом вопросе
const GEM_BAD = new Map();
const GROQ_MODEL = "llama-3.3-70b-versatile";
// встроенный ИИ Cloudflare: пробуем по очереди — если модель убрали или она перегружена, берём следующую
const CF_MODELS = ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-4-scout-17b-16e-instruct", "@cf/meta/llama-3.1-8b-instruct-fast", "@cf/meta/llama-3.1-8b-instruct"];
// Чужие сайты не тратят твои бесплатные лимиты: запросы принимаются только отсюда (и с локальной копии)
// http и https: ссылку без «https://» (из Telegram, ВК) браузер открывает как http://motohelper.ru
const ALLOWED = ["motohelper.ru", "www.motohelper.ru", "levnikonov37-creator.github.io"];
const allowed = (o) => !o || o === "null" || ALLOWED.some((h) => o === "https://" + h || o === "http://" + h) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "x-mh-provider, x-mh-model",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

const sse = (body, provider, model) =>
  new Response(body, { headers: { ...CORS, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", "x-mh-provider": provider, ...(model ? { "x-mh-model": model } : {}) } });

export default {
  // по расписанию (Cloudflare → Triggers → Cron; ставит worker/deploy.sh): 06:00 UTC (09:00 МСК) — отчёт за вчера владельцу
  // и посты на 09:00; 09:00 UTC (12:00 МСК) — совет; 15:00 UTC (18:00 МСК) — мотоцикл дня и самопроверка ИИ.
  // Различаем по часу, а не по строке cron: так работает и при «0 6 * * *», и при старом «0 6 * * 1».
  async scheduled(event, env, ctx) {
    const h = new Date(event.scheduledTime || Date.now()).getUTCHours();
    ctx.waitUntil(h === 6 || h === 9 ? reportOnce(env, h === 9).then(() => daily(env, false)) : daily(env, h === 15));
  },
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    // сообщения боту в личку (Telegram шлёт их сюда с секретом из TG_HOOK_SECRET)
    if (new URL(request.url).pathname === "/tg-hook") return botHook(request, env, ctx);
    // переход в магазин по партнёрке: /go?u=<адрес на aliexpress.ru> → диплинк Admitad на эту страницу
    if (new URL(request.url).pathname === "/go") return goShop(request, env, ctx);
    // группа ВКонтакте: /vk-auth — владелец один раз разрешает публикацию, /vk-cb — ответ VK ID
    if (new URL(request.url).pathname === "/vk-auth") return vkAuth(request, env);
    if (new URL(request.url).pathname === "/vk-cb") return vkCallback(request, env);
    if (!allowed(request.headers.get("Origin"))) return json({ error: "not_allowed" }, 403);
    if (request.method === "GET") {
      const u = new URL(request.url);
      // список сообщений о неточностях: открой в браузере <адрес сервера>/?feedback=1&token=<FEEDBACK_TOKEN>
      if (u.searchParams.get("feedback")) return listFeedback(env, u.searchParams.get("token"));
      // самопроверка: <адрес сервера>/?test=1 — какой ИИ отвечает и какие ошибки у остальных (без ключей)
      // ?test=models — сколько отвечает каждая модель Gemini (чтобы первой в списке стояла быстрая)
      // с DEBUG_TOKEN: &list=1 — какие модели есть у ключа; &try=a,b&think=low — пробный вопрос механику каждой модели
      if (u.searchParams.get("test") === "models" && env.DEBUG_TOKEN && u.searchParams.get("token") === env.DEBUG_TOKEN && (u.searchParams.get("list") || u.searchParams.get("try"))) return json(await geminiProbe(env, u.searchParams));
      if (u.searchParams.get("test") === "models") return json(await geminiTimes(env));
      if (u.searchParams.get("test")) return selfTest(env);
      // отзывы владельцев модели: ?reviews=<адрес модели>
      if (u.searchParams.get("reviews")) return listReviews(env, u.searchParams.get("reviews"));
      // заявки «Нет моей модели» за 30 дней, сгруппированные: ?req=list (только названия, без IP)
      if (u.searchParams.get("req") === "list") return json(await listModelReqs(env));
      // Telegram-канал: ?tg=status — что выйдет следующим; ?tg=run — опубликовать пост на сегодня, если ещё не вышел
      if (u.searchParams.get("tg") === "run") return json(await tgRun(env));
      // группа ВК: ?vk=status — подключена ли публикация
      if (u.searchParams.get("vk") === "status") return json(await vkStatus(env));
      if (u.searchParams.get("vk") === "last") return json(JSON.parse((env.FEEDBACK && (await env.FEEDBACK.get("vk:lastcb"))) || "null"));
      // отчёт уходит только владельцу бота, так что ручной запуск безопасен
      // &dry=1&token=<DEBUG_TOKEN> — показать текст отчёта, не отправляя
      if (u.searchParams.get("tg") === "report") return json(await dailyReport(env, !!(u.searchParams.get("dry") && env.DEBUG_TOKEN && u.searchParams.get("token") === env.DEBUG_TOKEN)));
      if (u.searchParams.get("tg") === "setup") return json(await botSetup(env, u.origin));
      // проверка бота без Telegram: ?tg=dry&q=вопрос&token=<DEBUG_TOKEN>
      if (u.searchParams.get("tg") === "dry" && env.DEBUG_TOKEN && u.searchParams.get("token") === env.DEBUG_TOKEN) return json(await botDry(env, u.searchParams.get("q") || "TT250 не заводится"));
      if (u.searchParams.get("tg")) return json(await tgStatus(env));
      return json({ ok: true, images: !!(env.DEEPSEEK_API_KEY || env.GEMINI_API_KEY), feedback: !!env.FEEDBACK, deepseek: !!env.DEEPSEEK_API_KEY });
    }
    if (request.method !== "POST") return json({ error: "method" }, 405);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_json" }, 400);
    }
    if (body.feedback) return saveFeedback(env, body.feedback);
    // «Спроси механика» со страниц каталога: вопрос + о чём страница; подсказки и цифры — как у бота
    if (body.ask) return pageAsk(env, ctx, body, request.headers.get("CF-Connecting-IP") || "?");
    if (body.review) return saveReview(env, body.review, request.headers.get("CF-Connecting-IP") || "?");
    // «Нет моей модели» — заявка на добавление (приложение и поиск по каталогу)
    if (body.modelreq) return saveModelReq(env, body.modelreq, request.headers.get("CF-Connecting-IP") || "?");
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const images = Array.isArray(body.images) ? body.images.slice(0, 2) : [];
    if (!messages.length) return json({ error: "no_messages" }, 400);
    ctx.waitUntil(Promise.resolve(logQuestion(env, "site", messages))); // запись не должна задерживать ответ и не должна теряться

    return answer(env, messages, images, request.headers.get("CF-Connecting-IP") || "?");
  },
};

async function answer(env, messages, images, ip, noDeepseek) {
    const errors = [];
    if (!noDeepseek && env.DEEPSEEK_API_KEY && (await deepseekAllowed(env, ip))) {
      try {
        return sse(await deepseek(env, messages, images), "deepseek");
      } catch (e) {
        errors.push("deepseek: " + e.message);
      }
    }
    if (env.GEMINI_API_KEY) {
      try {
        const gs = await gemini(env, messages, images);
        return sse(gs, "gemini", gs.mhModel);
      } catch (e) {
        errors.push("gemini: " + e.message);
      }
    }
    // без Gemini фото посмотреть некому — дальше только текст
    if (env.GROQ_API_KEY) {
      try {
        return sse(await groq(env, messages), "groq");
      } catch (e) {
        errors.push("groq: " + e.message);
      }
    }
    if (env.AI) {
      for (const model of CF_MODELS) {
        try {
          const stream = await env.AI.run(model, { messages: textOnly(messages), stream: true, max_tokens: 1500 });
          return sse(stream, "workers-ai");
        } catch (e) {
          errors.push("workers-ai " + model + ": " + e.message);
        }
      }
    }
    if (!env.DEEPSEEK_API_KEY && !env.GEMINI_API_KEY && !env.GROQ_API_KEY && !env.AI) errors.push("нет ни одного ключа и нет привязки AI");
    const limited = errors.some((x) => /429|quota|limit|exhaust|neuron/i.test(x));
    return json({ error: limited ? "rate_limited" : "upstream_error", details: errors }, limited ? 429 : 502);
}

/* самопроверка: короткий вопрос через ту же цепочку, ответ читаем целиком (DeepSeek не трогаем — тратит деньги) */
async function selfTest(env) {
  const have = { deepseek: !!env.DEEPSEEK_API_KEY, gemini: !!env.GEMINI_API_KEY, groq: !!env.GROQ_API_KEY, workersAI: !!env.AI, feedbackKV: !!env.FEEDBACK };
  const res = await answer(env, [{ role: "user", content: "Ответь одним словом по-русски: привет" }], [], "selftest", true);
  const provider = res.headers.get("x-mh-provider");
  const text = (await res.text()).slice(0, 400);
  return json({ ok: !!provider, provider: provider || null, have, reply: provider ? text : undefined, error: provider ? undefined : JSON.parse(text) });
}

function textOnly(messages) {
  return messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user", content: String(m.content || "") }));
}

/* Лимиты DeepSeek, чтобы не съели весь баланс: на человека — в памяти сервера (примерно, сбрасывается
   при перезапуске), на всех — счётчик в KV (одна запись на ответ). Сверх лимита отвечают бесплатные ИИ. */
const PER_USER = new Map();
async function deepseekAllowed(env, ip) {
  const day = new Date().toISOString().slice(0, 10);
  const perUser = Number(env.DAILY_PER_USER) || 40,
    total = Number(env.DAILY_TOTAL) || 300;
  const k = day + "|" + ip,
    n = (PER_USER.get(k) || 0) + 1;
  if (PER_USER.size > 20000) PER_USER.clear();
  PER_USER.set(k, n);
  if (n > perUser) return false;
  const kv = env.LIMITS || env.FEEDBACK;
  if (!kv) return true;
  try {
    const key = "rl:" + day,
      used = Number(await kv.get(key)) || 0;
    if (used >= total) return false;
    await kv.put(key, String(used + 1), { expirationTtl: 60 * 60 * 48 });
  } catch (e) {}
  return true;
}

// DeepSeek: формат как у OpenAI, ответ потоком (сайт его понимает, как у Groq). Без «размышлений» — быстрее и дешевле.
async function deepseek(env, messages, images) {
  const msgs = textOnly(messages);
  const last = msgs.map((m) => m.role).lastIndexOf("user");
  const pics = images.filter((u) => /^data:image\/[a-z+]+;base64,/i.test(String(u)));
  if (last >= 0 && pics.length)
    msgs[last] = { role: "user", content: [{ type: "text", text: msgs[last].content }].concat(pics.map((url) => ({ type: "image_url", image_url: { url: url, detail: "low" } }))) };
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.DEEPSEEK_API_KEY },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, messages: msgs, stream: true, max_tokens: 1500, temperature: 0.4, thinking: { type: "disabled" } }),
  });
  if (!res.ok || !res.body) throw new Error(res.status + " " + (await res.text()).slice(0, 200));
  return res.body;
}

async function gemini(env, messages, images) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const turns = messages.filter((m) => m.role !== "system");
  const contents = turns.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content || "") }] }));
  // фото прикладываем к последнему сообщению пользователя
  const last = contents.map((c) => c.role).lastIndexOf("user");
  if (last >= 0) {
    images.forEach((url) => {
      const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(String(url));
      if (m) contents[last].parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
    });
  }
  const bodyFor = (model) => JSON.stringify({
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents,
    generationConfig: Object.assign({ maxOutputTokens: 4096, temperature: 0.4 }, thinkFor(model) ? { thinkingConfig: { thinkingLevel: thinkFor(model) } } : {}),
  });
  let res, err = "", chosen = "";
  // Gemini временами «зависает» на десятки секунд: ждём начала ответа не дольше 10 с на модель и 16 с всего (бот укладывается в свои 25 с),
  // потом пробуем следующую модель, а за ней — встроенный ИИ Cloudflare (см. answer)
  const until = Date.now() + 16000;
  const fresh = GEMINI_MODELS.filter((m) => !(GEM_BAD.get(m) > Date.now()));
  for (const model of fresh.length ? fresh : GEMINI_MODELS) {
    const left = Math.min(10000, until - Date.now());
    if (left < 1500) { err += "время вышло; "; res = null; break; }
    const ac = new AbortController(), timer = setTimeout(() => ac.abort(), left);
    try {
      res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":streamGenerateContent?alt=sse", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: bodyFor(model),
        signal: ac.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      err += model + " не ответил за " + Math.round(left / 1000) + " с; ";
      GEM_BAD.set(model, Date.now() + 600000);
      res = null;
      continue;
    }
    clearTimeout(timer);
    if (res.ok && res.body) { chosen = model; break; }
    GEM_BAD.set(model, Date.now() + 600000);
    err += model + " " + res.status + " " + (await res.text()).slice(0, 120) + "; ";
    res = null;
    // неверный ключ или регион не поддерживается — другие модели не помогут (а 400 из-за настроек одной модели — пробуем следующую)
    if (err.indexOf(" 403 ") >= 0 || /API key/i.test(err)) break;
  }
  if (!res) throw new Error(err);
  // ответ Gemini → строки «data: {"response": "..."}», которые понимает сайт.
  // Gemini под нагрузкой иногда обрывает ответ на полуслове (поток кончается без finishReason STOP или с ошибкой).
  // Тогда модель пропускаем 10 минут, а ответ дописывает встроенный ИИ Cloudflare; не вышло — честно пишем, что ответ оборвался.
  const enc = new TextEncoder(), dec = new TextDecoder();
  const say = (ctl, t) => ctl.enqueue(enc.encode("data: " + JSON.stringify({ response: t }) + "\n\n"));
  let buf = "", sent = "", fin = "", gErr = "";
  const out = res.body.pipeThrough(
    new TransformStream({
      transform(chunk, ctl) {
        buf += dec.decode(chunk, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (line.indexOf("data:") !== 0) continue;
          try {
            const j = JSON.parse(line.slice(5));
            if (j.error) gErr = String(j.error.status || j.error.code || "error");
            const c = j.candidates && j.candidates[0];
            if (c && c.finishReason) fin = c.finishReason;
            const parts = (c && c.content && c.content.parts) || [];
            const text = parts.filter((p) => !p.thought).map((p) => p.text || "").join("");
            if (text) { sent += text; say(ctl, text); }
          } catch (e) {}
        }
      },
      async flush(ctl) {
        if (fin !== "STOP") {
          GEM_BAD.set(chosen, Date.now() + 600000);
          ctl.enqueue(enc.encode(": gemini " + chosen + " оборвал ответ: " + (gErr || fin || "без finishReason") + "\n\n"));
          const ASK = "Твой ответ выше оборвался на полуслове. Продолжи ровно с места обрыва — без повторов, без вступлений и без извинений.";
          let more = "", why = [];
          const t0 = Date.now(), left = () => 28000 - (Date.now() - t0);
          // 1) встроенный ИИ Cloudflare (две модели)
          for (const m of env.AI ? CF_MODELS.slice(0, 2) : []) {
            if (more || left() < 3000) break;
            try {
              const msgs = sent.trim() ? textOnly(messages).concat([{ role: "assistant", content: sent }, { role: "user", content: ASK }]) : textOnly(messages);
              const r = await Promise.race([env.AI.run(m, { messages: msgs, max_tokens: 1200 }), sleep(Math.min(14000, left())).then(() => null)]);
              more = String((r && (r.response || (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content))) || "").trim();
              if (!more) why.push("cf " + m.split("/").pop() + ": пусто");
            } catch (e) { why.push("cf " + m.split("/").pop() + ": " + String(e.message || e).slice(0, 60)); }
          }
          // 2) другая модель Gemini, которая сейчас отвечает (без потока)
          for (const m of GEMINI_MODELS.filter((x) => x !== chosen && !(GEM_BAD.get(x) > Date.now()))) {
            if (more || left() < 3000) break;
            const ac = new AbortController(), tm = setTimeout(() => ac.abort(), Math.min(12000, left()));
            try {
              const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent", {
                method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY }, signal: ac.signal,
                body: JSON.stringify({ systemInstruction: system ? { parts: [{ text: system }] } : undefined,
                  contents: sent.trim() ? contents.concat([{ role: "model", parts: [{ text: sent }] }, { role: "user", parts: [{ text: ASK }] }]) : contents,
                  generationConfig: Object.assign({ maxOutputTokens: 4096, temperature: 0.4 }, thinkFor(m) ? { thinkingConfig: { thinkingLevel: thinkFor(m) } } : {}) }),
              });
              if (!r.ok) { GEM_BAD.set(m, Date.now() + 600000); why.push(m + " " + r.status); continue; }
              const j = await r.json();
              const c = j.candidates && j.candidates[0];
              more = (((c && c.content && c.content.parts) || []).filter((p) => !p.thought).map((p) => p.text || "").join("")).trim();
            } catch (e) { why.push(m + ": " + (e.name === "AbortError" ? "не ответил" : String(e.message || e).slice(0, 40))); }
            finally { clearTimeout(tm); }
          }
          if (why.length) ctl.enqueue(enc.encode(": запасные: " + why.join("; ").replace(/\n/g, " ") + "\n\n"));
          if (more) say(ctl, (sent && !/\s$/.test(sent) && !/^[,.;:!?)]/.test(more) ? " " : "") + more);
          else say(ctl, (sent ? "\n\n" : "") + "⚠️ Ответ оборвался: ИИ-механик сейчас перегружен — очень много вопросов. Спроси ещё раз через минуту.");
        }
        ctl.enqueue(enc.encode("data: [DONE]\n\n"));
      },
    })
  );
  out.mhModel = chosen;
  return out;
}

async function groq(env, messages) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.GROQ_API_KEY },
    body: JSON.stringify({ model: GROQ_MODEL, messages: textOnly(messages), stream: true, max_tokens: 1500, temperature: 0.4 }),
  });
  if (!res.ok || !res.body) throw new Error(res.status + " " + (await res.text()).slice(0, 200));
  return res.body;
}

// --- «Сообщить о неточности» с сайта ---
// Нужно (один раз): Workers & Pages → KV → создать пространство (например motohelper-feedback);
// в настройках воркера Settings → Bindings → KV namespace с именем FEEDBACK;
// Settings → Variables and Secrets → секрет FEEDBACK_TOKEN (любой пароль — для просмотра списка).
async function saveFeedback(env, f) {
  if (!env.FEEDBACK) return json({ ok: false, error: "no_kv" }, 501);
  const clean = (v, n) => String(v || "").slice(0, n);
  const item = { t: new Date().toISOString(), bike: clean(f.bike, 120), engine: clean(f.engine, 80), text: clean(f.text, 2000), contact: clean(f.contact, 120), page: clean(f.page, 200) };
  if (!item.text.trim()) return json({ ok: false, error: "empty" }, 400);
  await env.FEEDBACK.put(item.t + "-" + Math.random().toString(36).slice(2, 8), JSON.stringify(item), { expirationTtl: 60 * 60 * 24 * 365 });
  return json({ ok: true });
}
/* сообщения о неточностях за промежуток [from, to) — ключи начинаются с времени ISO */
async function feedbackSince(env, from, to) {
  if (!env.FEEDBACK) return [];
  const prefixes = [...new Set([from.slice(0, 10), to.slice(0, 10)])];
  const keys = [].concat(...(await Promise.all(prefixes.map((p) => env.FEEDBACK.list({ prefix: p, limit: 1000 }).then((r) => r.keys.map((k) => k.name))))))
    .filter((k) => k >= from && k < to).sort();
  return Promise.all(keys.slice(0, 50).map(async (k) => JSON.parse((await env.FEEDBACK.get(k)) || "{}")));
}
async function listFeedback(env, token) {
  if (!env.FEEDBACK) return json({ ok: false, error: "no_kv" }, 501);
  if (!env.FEEDBACK_TOKEN || token !== env.FEEDBACK_TOKEN) return json({ ok: false, error: "token" }, 403);
  const keys = (await env.FEEDBACK.list({ limit: 300 })).keys.map((k) => k.name).filter((k) => /^\d{4}-/.test(k)).sort().reverse().slice(0, 200);
  const items = await Promise.all(keys.map(async (k) => JSON.parse((await env.FEEDBACK.get(k)) || "{}")));
  return json({ ok: true, count: items.length, items });
}

// --- Telegram-канал: посты из tg/posts.json на сайте. У поста дата и время по Москве («18:00» — мотоцикл дня, «12:00» — совет,
// праздники — в своё время); каждый запуск по расписанию публикует посты на сегодня, время которых уже наступило.
// Каждый пост — один раз (отметка в KV). С картинкой (photo) — sendPhoto с подписью, без неё — обычное сообщение. ---
const TG_POSTS = "https://motohelper.ru/tg/posts.json";
const mskNow = () => new Date(Date.now() + 3 * 3600e3).toISOString();
const mskDay = () => mskNow().slice(0, 10);
const postTime = (p) => (/^\d\d:\d\d$/.test(p.time || "") ? p.time : "18:00");
async function tgQueue(env) {
  const res = await fetch(TG_POSTS + "?t=" + Date.now(), { cf: { cacheTtl: 0 } });
  if (!res.ok) throw new Error("posts.json " + res.status);
  const cfg = await res.json();
  const today = mskDay(), hm = mskNow().slice(11, 16);
  // только сегодня и завтра: старые посты давно вышли, а отметки в KV для сотен постов читать незачем
  const tomorrow = new Date(Date.parse(today) + 864e5).toISOString().slice(0, 10);
  const posts = (cfg.posts || []).filter((p) => p && p.id && p.text && p.date && p.date >= today && p.date <= tomorrow)
    .sort((a, b) => (a.date + postTime(a) < b.date + postTime(b) ? -1 : 1));
  const sent = {};
  if (env.FEEDBACK) await Promise.all(posts.map(async (p) => (sent[p.id] = !!(await env.FEEDBACK.get("tg:sent:" + p.id)))));
  return { cfg, today, hm, posts, sent, all: cfg.posts || [] };
}
async function tgStatus(env) {
  try {
    const { cfg, today, hm, posts, sent, all } = await tgQueue(env);
    const left = all.filter((p) => p && p.date && p.date + postTime(p) > today + hm).sort((a, b) => (a.date + postTime(a) < b.date + postTime(b) ? -1 : 1));
    let report = null;
    try { report = env.FEEDBACK && JSON.parse((await env.FEEDBACK.get("report:last")) || "null"); } catch (e) {}
    return { ok: true, bot: !!env.TELEGRAM_BOT_TOKEN, channel: cfg.channel, now: today + " " + hm, report,
      today: posts.filter((p) => p.date === today).map((p) => ({ id: p.id, time: postTime(p), photo: !!p.photo, sent: sent[p.id] })),
      next: left[0] ? { id: left[0].id, date: left[0].date, time: postTime(left[0]) } : null, planned: left.length, lastDate: left.length ? left[left.length - 1].date : null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
/* один пост: с картинкой — sendPhoto (подпись до 1024 знаков; длиннее — картинка, затем текст), без картинки или если
   Telegram не забрал картинку — обычное сообщение */
async function tgSend(env, chat, p) {
  const text = String(p.text);
  if (p.photo) {
    const long = text.length > 1024;
    const j = await tgApi(env, "sendPhoto", Object.assign({ chat_id: chat, photo: p.photo }, long ? {} : { caption: text }));
    if (j.ok) {
      if (!long) return j;
      const t = await tgApi(env, "sendMessage", { chat_id: chat, text: text.slice(0, 4096), link_preview_options: { is_disabled: true } });
      return t.ok ? t : j;
    }
  }
  return tgApi(env, "sendMessage", { chat_id: chat, text: text.slice(0, 4096) });
}
async function tgRun(env) {
  try {
    if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: "нет TELEGRAM_BOT_TOKEN" };
    if (!env.FEEDBACK) return { ok: false, error: "нет KV FEEDBACK — некуда записать, что пост вышел" };
    const { cfg, today, hm, posts, sent } = await tgQueue(env);
    if (!cfg.channel || cfg.channel === "@CHANNEL") return { ok: false, error: "в posts.json не указан канал" };
    const due = posts.filter((p) => !sent[p.id] && p.date === today && postTime(p) <= hm).slice(0, 4);
    const out = [], errors = [];
    for (const p of due) {
      // отметка до отправки: если cron и ручной запуск совпадут, пост не выйдет дважды
      await env.FEEDBACK.put("tg:sent:" + p.id, new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 60 });
      const j = await tgSend(env, cfg.channel, p).catch((e) => ({ ok: false, description: e.message }));
      if (!j.ok) {
        await env.FEEDBACK.delete("tg:sent:" + p.id);
        errors.push(p.id + ": telegram: " + (j.description || "?"));
      } else {
        // номер сообщения в канале — чтобы потом можно было заменить картинку или текст вышедшего поста
        const mid = j.result && j.result.message_id;
        if (mid) await env.FEEDBACK.put("tg:sent:" + p.id, JSON.stringify({ t: new Date().toISOString(), mid }), { expirationTtl: 60 * 60 * 24 * 400 });
        out.push(p);
      }
    }
    return { ok: !errors.length, error: errors.join("; ") || undefined, posted: out.map((p) => p.id), posts: out, today, time: hm };
  } catch (e) {
    return { ok: false, error: e.message, posted: [], posts: [] };
  }
}

// --- Отчёт о посещаемости за неделю из Яндекс Метрики — в личку владельцу бота ---
const METRIKA_ID = 113844391;
const tgApi = (env, method, body) =>
  fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/" + method, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }).then((r) => r.json());
/* владелец — первый, кто написал боту /start в личке; запоминаем в KV */
async function ownerChat(env) {
  const saved = env.FEEDBACK && (await env.FEEDBACK.get("tg:owner"));
  if (saved) return saved;
  const up = await tgApi(env, "getUpdates", { allowed_updates: ["message"] });
  const m = (up.result || []).map((u) => u.message).find((m) => m && m.chat && m.chat.type === "private" && /^\/start/.test(m.text || ""));
  if (!m) return null;
  if (env.FEEDBACK) await env.FEEDBACK.put("tg:owner", String(m.chat.id));
  return String(m.chat.id);
}
/* Метрика иногда отказывает (лимит параллельных запросов, 429/5xx) — повторяем с паузой; ошибка не глотается */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function metrika(env, q) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch("https://api-metrika.yandex.net/stat/v1/data?ids=" + METRIKA_ID + "&lang=ru&" + q, { headers: { Authorization: "OAuth " + env.YANDEX_METRIKA_TOKEN } });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return j;
      last = new Error("Метрика " + r.status + ": " + String(j.message || "").slice(0, 150));
      if (r.status !== 429 && r.status < 500) throw last;
    } catch (e) { last = e; if (/^Метрика 4/.test(e.message) && !/^Метрика 429/.test(e.message)) throw e; }
    await sleep(1500 * (i + 1));
  }
  throw last;
}
/* утренний отчёт владельцу (в личку боту): вчерашний день из Метрики, канал, поиск, вопросы ИИ, здоровье сервера */
async function dailyReport(env, dry) {
  try {
    if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: "нет TELEGRAM_BOT_TOKEN" };
    if (!env.YANDEX_METRIKA_TOKEN) return { ok: false, error: "нет YANDEX_METRIKA_TOKEN" };
    const chat = await ownerChat(env);
    if (!chat) return { ok: false, error: "владелец не найден — напиши боту /start" };
    const M = "metrics=ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:avgVisitDurationSeconds";
    // по одному, а не пять сразу: у Метрики лимит параллельных запросов, и из-за него отчёт иногда не собирался
    const got = [];
    for (const q of [
      M + "&date1=yesterday&date2=yesterday",
      M + "&date1=2daysAgo&date2=2daysAgo",
      "metrics=ym:s:users,ym:s:visits&date1=7daysAgo&date2=yesterday",
      "metrics=ym:s:visits&dimensions=ym:s:lastTrafficSource&sort=-ym:s:visits&limit=5&date1=yesterday&date2=yesterday",
      "metrics=ym:pv:pageviews&dimensions=ym:pv:URLPath&sort=-ym:pv:pageviews&limit=5&date1=yesterday&date2=yesterday",
    ]) got.push(await metrika(env, q));
    const [cur, prev, week, src, pages] = got;
    const t = cur.totals || [0, 0, 0, 0], p = prev.totals || [0, 0, 0, 0], w = week.totals || [0, 0];
    const n = (x) => Math.round(x || 0).toLocaleString("ru-RU");
    const delta = (a, b) => (!b ? "" : " (" + (a >= b ? "+" : "") + Math.round(((a - b) / b) * 100) + "% к позавчера)");
    const min = Math.floor((t[3] || 0) / 60), sec = Math.round((t[3] || 0) % 60);
    const day = new Date(Date.now() + 3 * 3600e3 - 864e5).toISOString().slice(5, 10).split("-").reverse().join(".");
    // вчера по Москве: с 00:00 до 00:00 (полночь МСК = 21:00 UTC)
    const mskMidnight = new Date(Date.parse(mskDay() + "T00:00:00Z") - 3 * 3600e3).toISOString();
    const qs = await questionStats(env, 1, mskMidnight).catch(() => null);
    const wm = await webmasterStats(env).catch(() => null);
    // сообщения владельцев о неточностях за вчера (приложение и страницы каталога: «Сверить с мануалом», «Значение не совпадает?»)
    const fb = await feedbackSince(env, new Date(Date.parse(mskMidnight) - 864e5).toISOString(), mskMidnight).catch(() => null);
    // заявки «Нет моей модели» за вчера, одинаковые — вместе
    const mr = groupReqs(await modelReqsSince(env, new Date(Date.parse(mskMidnight) - 864e5).toISOString(), mskMidnight).catch(() => []));
    let health = null;
    try {
      health = env.FEEDBACK && JSON.parse((await env.FEEDBACK.get("health")) || "null");
    } catch (e) {}
    let subs = null;
    try {
      const posts = await fetch(TG_POSTS).then((r) => r.json());
      const c = await tgApi(env, "getChatMemberCount", { chat_id: posts.channel });
      if (c.ok) subs = c.result;
    } catch (e) {}
    const lines = [
      "📊 MotoHelper за вчера, " + day,
      "",
      "👤 Посетителей: " + n(t[1]) + delta(t[1], p[1]),
      "🔁 Визитов: " + n(t[0]) + " · 📄 просмотров: " + n(t[2]),
      "⏱ В среднем на сайте: " + min + " мин " + sec + " с",
      "📅 За 7 дней: " + n(w[0]) + " посетителей, " + n(w[1]) + " визитов",
      subs != null ? "📣 Подписчиков канала: " + n(subs) : "",
      wm ? "🔎 В поиске Яндекса: " + n(wm.searchable) + " страниц" + (wm.excluded ? " (исключено " + n(wm.excluded) + ")" : "") + (wm.sqi != null ? ", ИКС " + n(wm.sqi) : "") + (wm.problems ? "\n⚠️ Проблемы сайта в Вебмастере: " + wm.problems : "") : "",
      qs ? "🤖 Вопросов ИИ-механику: " + n(qs.total) + (qs.tg ? " (сайт " + n(qs.site) + ", Telegram " + n(qs.tg) + ")" : "") + (qs.top.length ? "\nО чём спрашивали: " + qs.top.join(", ") : "") : "",
      fb && fb.length ? "✍️ Владельцы сверили данные: " + n(fb.length) + "\n" + fb.slice(0, 8).map((x) => "• " + [x.bike, x.engine].filter(Boolean).join(", ") + ": " + String(x.text || "").replace(/\s+/g, " ").slice(0, 160)).join("\n") + (fb.length > 8 ? "\n… все — ?feedback=1&token=<FEEDBACK_TOKEN>" : "") : "",
      mr.length ? "🏍 Просят добавить модели: " + n(mr.reduce((a, x) => a + x.n, 0)) + "\n" + mr.slice(0, 15).map((x) => "• " + x.model + (x.engine ? " (мотор: " + x.engine + ")" : "") + (x.n > 1 ? " ×" + x.n : "")).join("\n") + (mr.length > 15 ? "\n… все — ?req=list" : "") : "",
      health ? (health.ai && health.ai.ok ? "✅ ИИ-механик работает" : "⚠️ ИИ-механик не ответил на проверке: " + ((health.ai && health.ai.error) || "?").slice(0, 120)) + (health.tg && !health.tg.ok ? "\n⚠️ Пост в канал не вышел: " + health.tg.error : "") : "",
      "",
      (src.data || []).length ? "Откуда пришли:\n" + src.data.map((d) => "• " + d.dimensions[0].name + " — " + n(d.metrics[0])).join("\n") : "",
      "",
      (pages.data || []).length ? "Что смотрели:\n" + pages.data.map((d) => "• " + (d.dimensions[0].name || "/") + " — " + n(d.metrics[0])).join("\n") : "",
    ].filter((x, i, a) => x !== "" || (a[i - 1] !== "" && i < a.length - 1)).join("\n").trim();
    if (dry) return { ok: true, sent: false, text: lines };
    const r = await tgApi(env, "sendMessage", { chat_id: chat, text: lines, disable_web_page_preview: true });
    if (r.ok && env.FEEDBACK) await env.FEEDBACK.put("report:sent:" + mskDay(), new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 4 });
    return r.ok ? { ok: true, sent: true } : { ok: false, error: "telegram: " + r.description };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/* --- Вопросы к ИИ: без IP и имён, 90 дней — раз в неделю по ним пишутся новые инструкции и чинится база --- */
function logQuestion(env, src, messages) {
  if (!env.FEEDBACK) return;
  const users = messages.filter((m) => m.role === "user");
  const q = String((users[users.length - 1] || {}).content || "").trim();
  if (q.length < 4 || q.length > 3000) return;
  const card = /КАРТОЧКА МОТОЦИКЛА ===\n([^\n]{0,120})/.exec(String((users[0] || {}).content || ""));
  const t = new Date().toISOString();
  return env.FEEDBACK.put("q:" + t + "-" + Math.random().toString(36).slice(2, 6), JSON.stringify({ t, src, bike: card ? card[1] : "", q: q.slice(0, 600) }), { expirationTtl: 60 * 60 * 24 * 90 }).catch(() => {});
}

/* --- Telegram-бот: отвечает в личке как ИИ-механик, с цифрами и ссылками из справочника сайта --- */
const BOT_IDX = "https://motohelper.ru/tg/idx/";
const BOT_DAILY = 100; // ответов в сутки одному человеку
// справочник лежит на сайте мелкими файлами (см. scripts/build-pages.js): читаем только нужные, кэш Cloudflare — час
const idxFile = (name) => fetch(BOT_IDX + name + ".json", { cf: { cacheTtlByStatus: { "200-299": 3600, "404": 0, "500-599": 0 }, cacheEverything: true } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const LAT = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
// слова латиницей + склейки соседних («тт 250» → tt250), чтобы «тт250» нашло Motoland TT250
const latTokens = (s) => {
  const w = (String(s).toLowerCase().split("").map((c) => (c in LAT ? LAT[c] : c)).join("").match(/[a-z0-9]+/g) || []);
  return w.concat(w.slice(1).map((x, i) => w[i] + x));
};
const tokW = (t) => (/\d/.test(t) && /[a-z]/.test(t) ? (t.length > 2 ? 3 : 2) : /^\d+$/.test(t) ? 1 : t.length >= 4 ? 1 : 0);
const STOP = new Set("как что где когда почему зачем какой какая какое какие можно нужно надо есть если или для при без под над мотоцикл мотоцикла мотор мотора питбайк".split(" "));
// основа слова без окончания: «масло»/«масла» → «масл», «цепь»/«цепи» → «цеп» (так же в scripts/build-pages.js)
const ruStems = (s) => (String(s).toLowerCase().replace(/ё/g, "е").match(/[а-я]{4,}/g) || []).filter((w) => !STOP.has(w)).map((w) => w.slice(0, Math.max(3, Math.min(5, w.length - 1))));
async function botRefs(text) {
  const toks = [...new Set(latTokens(text))].filter((t) => tokW(t) > 0).slice(0, 40);
  const pre = [...new Set(toks.map((t) => t.slice(0, 2)))].slice(0, 12);
  const [shards, guides] = await Promise.all([Promise.all(pre.map(idxFile)), idxFile("g")]);
  const score = new Map();
  shards.forEach((sh) => sh && toks.forEach((t) => (sh[t] || []).forEach(([w, id]) => score.set(id, (score.get(id) || 0) + w))));
  const ids = [...score].filter((x) => x[1] >= 3).sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => x[0]);
  const buckets = {};
  await Promise.all([...new Set(ids.map((id) => Math.floor(id / 100)))].map(async (b) => (buckets[b] = (await idxFile("l" + b)) || [])));
  const out = ids.map((id) => buckets[Math.floor(id / 100)][id % 100]).filter(Boolean);
  // основы совпадают, если одна начинается с другой: «сту» (стук) ↔ «стучи» (стучит)
  const st = [...new Set(ruStems(text))], hit = (w) => st.some((q) => q.startsWith(w) || w.startsWith(q));
  const gs = (guides || []).map((g) => [g[1].filter(hit).length, g[0]]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0] || a[1].length - b[1].length);
  gs.filter((x) => x[0] === gs[0][0]).slice(0, 3).forEach((x) => out.push(x[1])); // только лучшие совпадения
  return out;
}
const BOT_RULES = `Ты — ИИ-механик сайта MotoHelper (motohelper.ru) и отвечаешь в Telegram.
Правила:
1. Только по-русски, коротко и по делу: до 12 строк. Простой текст без markdown: без звёздочек, решёток и таблиц; пункты — с «•».
2. Тема — ремонт, обслуживание, выбор и езда на мотоциклах, питбайках, мопедах, скутерах, квадроциклах. На другое вежливо откажи одной фразой.
3. Цифры (масло, объём, свечи, зазоры, моменты) бери только из справочника ниже. Если нужной цифры там нет — так и скажи и посоветуй мануал своей модели. Ничего не выдумывай.
4. Если неясно, какой мотоцикл или мотор, — сначала коротко ответь в общем, потом спроси модель.
5. Тормоза, руль, подвеска, течь топлива — предупреди, что ездить нельзя до ремонта.
6. В конце, если в справочнике есть подходящая страница, дай одну-две ссылки строкой «Подробно: <ссылка>». Ссылки — только из справочника.
7. Учитывай конструкцию мотора из справочника: если там написано «кикстартера нет» — не предлагай проверять или чинить кик; если человек пишет, что сам что-то снял или переделал (например, собрал мотор без кика), исходи из его слов. У кроссовой техники и питбайков ресурс и ТО считай в моточасах, а не в километрах.`;
async function collect(res) {
  if ((res.headers.get("Content-Type") || "").indexOf("event-stream") < 0) return "";
  let out = "";
  for (const line of (await res.text()).split("\n")) {
    const l = line.trim();
    if (l.indexOf("data:") !== 0) continue;
    try {
      const j = JSON.parse(l.slice(5));
      out += j.response || (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || "";
    } catch (e) {}
  }
  return out.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
}
/* Скриншот комментариев ТикТока от владельца → модели техники → очередь заявок (KV «mr:…», page «tiktok»).
   Что уже есть на сайте (по m/index.json) — не ставим в очередь, а сразу даём ссылку. Ничего не придумываем: только то, что на скрине */
const SCREEN_ASK = "На скриншоте — комментарии под видео в ТикТоке о сайте-справочнике по мотоциклам. Выпиши модели мото-техники (мотоциклы, питбайки, эндуро, мопеды, скутеры), которые люди называют как свои или просят добавить. Бери только то, что написано на скрине, ничего не додумывай. Явную опечатку в марке исправь (motolend → Motoland, kuggo → Kugoo), модель не меняй. Мотор (код вроде 172FMM, PR300, NB300) — только если он написан в том же комментарии. Ники, ответы автора видео и комментарии без модели не выписывай; квадроциклы и машины — отдельно. Ответ строго JSON: {\"models\":[{\"model\":\"Kayo T4 300\",\"engine\":\"\"}],\"atv\":[\"названия квадроциклов\"],\"no_model\":число комментариев без модели}";
async function ownerScreens(env, photos) {
  const img = await tgPhoto(env, photos);
  if (!img) return "Не смог открыть скрин 😕 Пришли ещё раз.";
  const mm = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(img);
  let got = null, why = [];
  for (const model of GEMINI_MODELS.filter((x) => !(GEM_BAD.get(x) > Date.now())).concat(GEMINI_MODELS)) {
    if (got || why.length >= 4) break;
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 15000);
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY }, signal: ac.signal,
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: SCREEN_ASK }, { inline_data: { mime_type: mm[1], data: mm[2] } }] }],
          generationConfig: Object.assign({ temperature: 0, maxOutputTokens: 2048, responseMimeType: "application/json" }, thinkFor(model) ? { thinkingConfig: { thinkingLevel: thinkFor(model) } } : {}) }),
      });
      if (!r.ok) { GEM_BAD.set(model, Date.now() + 600000); why.push(model + " " + r.status); continue; }
      const j = await r.json();
      const t = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).filter((x) => !x.thought).map((x) => x.text || "").join("");
      got = JSON.parse(t.replace(/^```(json)?|```$/g, "").trim());
    } catch (e) { why.push(model + " " + (e.name === "AbortError" ? "долго" : "ошибка")); }
    finally { clearTimeout(tm); }
  }
  if (!got) return "Не смог прочитать скрин — ИИ сейчас перегружен 😕 Перешли его чуть позже." + (why.length ? "\n(" + why.join("; ") + ")" : "");
  const clean = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
  const list = (Array.isArray(got.models) ? got.models : []).map((x) => ({ model: clean(x && x.model, 80), engine: clean(x && x.engine, 40) })).filter((x) => x.model.length >= 3).slice(0, 40);
  // что уже есть на сайте
  let idx = [];
  try { idx = await fetch("https://motohelper.ru/m/index.json", { cf: { cacheTtl: 600 } }).then((r) => r.json()); } catch (e) {}
  const norm = (x) => String(x || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, "");
  // совпадение: марка+модель, модель без марки или одно из других названий (aka в index.json — через пробел)
  const findHit = (k) => idx.find((y) => { const b = norm(y.b), n = norm(y.n);
    return b + n === k || (n.length >= 4 && n === k) || (y.k && k.length >= 6 && norm(y.k).includes(k.startsWith(b) ? k.slice(b.length) : k)); });
  const have = [], queued = [], seen = new Set();
  const now = Date.now();
  for (const [i, x] of list.entries()) {
    const k = norm(x.model);
    if (seen.has(k)) continue;
    seen.add(k);
    const hit = findHit(k);
    if (hit) { have.push(hit.b + " " + hit.n + " → motohelper.ru/m/" + hit.u + "/"); continue; }
    const t = new Date(now + i).toISOString();
    await env.FEEDBACK.put("mr:" + t + "-tt" + Math.random().toString(36).slice(2, 6), JSON.stringify({ t, model: x.model, engine: x.engine, q: "", page: "tiktok" }), { expirationTtl: 60 * 60 * 24 * 90 });
    queued.push(x.model + (x.engine ? " (" + x.engine + ")" : ""));
  }
  const atv = (Array.isArray(got.atv) ? got.atv : []).map((x) => clean(x, 60)).filter(Boolean);
  return [
    queued.length ? "📥 В очередь (" + queued.length + "), добавлю в ближайший прогон — раз в 2 часа:\n" + queued.map((x) => "• " + x).join("\n") : "",
    have.length ? "✅ Уже есть на сайте:\n" + have.map((x) => "• " + x).join("\n") : "",
    atv.length ? "🚜 Квадроциклы (пока не добавляем): " + atv.join(", ") : "",
    !queued.length && !have.length && !atv.length ? "На скрине не нашёл названий моделей 🤷" : "",
    got.no_model ? "Комментариев без модели: " + Number(got.no_model) : "",
  ].filter(Boolean).join("\n\n");
}
async function tgPhoto(env, photos) {
  try {
    const f = await tgApi(env, "getFile", { file_id: photos[photos.length - 1].file_id });
    if (!f.ok || f.result.file_size > 4e6) return null;
    const buf = new Uint8Array(await (await fetch("https://api.telegram.org/file/bot" + env.TELEGRAM_BOT_TOKEN + "/" + f.result.file_path)).arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return "data:image/jpeg;base64," + btoa(bin);
  } catch (e) {
    return null;
  }
}
async function botHook(request, env, ctx) {
  if (!env.TG_HOOK_SECRET || request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TG_HOOK_SECRET) return new Response("forbidden", { status: 403 });
  let up;
  try {
    up = await request.json();
  } catch (e) {
    return new Response("ok");
  }
  // «@motohelper_post_bot масло tt250» в любом чате — карточки из справочника, без ИИ (ответ нужен за секунды)
  if (up.inline_query) {
    await botInline(env, up.inline_query).catch(() => {});
    return new Response("ok");
  }
  const m = up.message;
  if (!m || !m.chat) return new Response("ok");
  // Telegram отвечаем сразу, а ответ ИИ готовим в фоне: если держать запрос, Telegram может оборвать соединение,
  // и Cloudflare остановит работу. В фоне есть ~30 с — ставим срок 25 с.
  if (m.chat.type === "private") ctx.waitUntil(botSafe(env, m, up.update_id));
  else if (m.chat.type === "group" || m.chat.type === "supergroup") {
    // в группе бот отвечает только когда к нему обращаются: /ask, @упоминание или ответ на его сообщение
    const q = await groupQuestion(env, m);
    if (q) ctx.waitUntil(botSafe(env, Object.assign({}, m, { text: q, caption: undefined }), up.update_id));
  }
  return new Response("ok");
}
const SEEN = new Set();
async function botSafe(env, m, updateId) {
  const dbg = (step) => env.FEEDBACK && env.FEEDBACK.put("tg:dbg", new Date().toISOString() + " " + step, { expirationTtl: 60 * 60 * 24 * 7 }).catch(() => {});
  const fail = (text) => tgApi(env, "sendMessage", { chat_id: m.chat.id, text }).catch(() => {});
  try {
    // Telegram повторяет сообщение, только если не получил «ok»; отвечаем сразу, так что хватает памяти сервера
    if (SEEN.has(updateId)) return;
    if (SEEN.size > 5000) SEEN.clear();
    SEEN.add(updateId);
    const late = new Promise((r) => setTimeout(() => r("__late"), 25000));
    const r = await Promise.race([botReply(env, m, dbg), late]);
    if (r === "__late") {
      await dbg("срок 25 с вышел");
      await fail("ИИ сегодня отвечает медленно 🐢 Спроси ещё раз — обычно со второго раза быстрее.");
    }
  } catch (e) {
    if (env.FEEDBACK) await env.FEEDBACK.put("tg:err", new Date().toISOString() + " " + String((e && e.stack) || e).slice(0, 800), { expirationTtl: 60 * 60 * 24 * 7 });
    await fail("Что-то сломалось при ответе 😕 Попробуй ещё раз через минуту.");
  }
}
async function botReply(env, m, dbg = () => {}) {
  const chat = m.chat.id, group = m.chat.type !== "private";
  // в группе отвечаем ответом на сообщение спросившего, чтобы было понятно кому
  const to = group ? { reply_to_message_id: m.message_id, allow_sending_without_reply: true } : {};
  const say = (text) => tgApi(env, "sendMessage", Object.assign({ chat_id: chat, text: String(text).slice(0, 4096), disable_web_page_preview: true }, to));
  const text = String(m.text || m.caption || "").trim();
  if (group && text === "__hello") return say(GROUP_HELLO);
  // всё о собеседнике — в одной записи KV (на бесплатном тарифе 1000 записей в сутки):
  // d — день, n — ответов за день, t — время последнего ответа, h — последние реплики (разговор забывается через 6 часов).
  // У группы — общий счётчик, а история не хранится: контекст — сообщение бота, на которое ответили
  const key = (group ? "tg:g:" : "tg:u:") + chat, day = mskDay();
  let st = null;
  try {
    st = env.FEEDBACK && JSON.parse((await env.FEEDBACK.get(key)) || "null");
  } catch (e) {}
  st = st || { d: day, n: 0, t: 0, h: [] };
  if (st.d !== day) (st.d = day), (st.n = 0);
  if (Date.now() - st.t > 6 * 3600e3 || group) st.h = [];
  if (group && m.reply_to_message && m.reply_to_message.from && m.reply_to_message.from.is_bot && m.reply_to_message.text) st.h = [{ role: "assistant", content: m.reply_to_message.text.slice(0, 1500) }];
  if (!group && /^\/start/.test(text)) {
    if (env.FEEDBACK && !(await env.FEEDBACK.get("tg:owner"))) await env.FEEDBACK.put("tg:owner", String(chat));
    return say("Привет! Я ИИ-механик MotoHelper 🏍\n\nНапиши, что случилось и какой у тебя мотоцикл — например: «TT250 не заводится на холодную». Можно прислать фото детали или поломки.\n\nНовый разговор — /new\n\n💬 Добавь меня в чат мотоциклистов — там спрашивай через /ask.\n🔎 В любом чате набери @motohelper_post_bot и модель (например, tt250) — пришлю карточку с маслом, свечой и зазорами.\n\nСайт: https://motohelper.ru/");
  }
  if (/^\/new/.test(text)) {
    if (env.FEEDBACK && st.h.length) await env.FEEDBACK.put(key, JSON.stringify(Object.assign(st, { h: [] })), { expirationTtl: 60 * 60 * 48 });
    return say("Начнём заново. Какой мотоцикл и что с ним?");
  }
  // владелец присылает скриншоты комментариев из ТикТока (без подписи) — вытаскиваем модели в очередь заявок «Нет моей модели»
  if (!group && m.photo && !text && env.FEEDBACK && String(await env.FEEDBACK.get("tg:owner")) === String(chat)) return say(await ownerScreens(env, m.photo));
  if (!text && !m.photo) return say("Я понимаю текст и фото. Опиши поломку словами 🙂");
  if (st.n >= (group ? GROUP_DAILY : BOT_DAILY)) return say("На сегодня лимит ответов исчерпан — приходи завтра. Пока можно поискать на сайте: https://motohelper.ru/");
  const typing = () => tgApi(env, "sendChatAction", { chat_id: chat, action: "typing" }).catch(() => {});
  typing();
  const tick = setInterval(typing, 4500); // «печатает…» гаснет через 5 секунд — обновляем, пока ИИ пишет
  try {
    return await botAnswer(env, m, chat, say, text, key, st, dbg, to);
  } finally {
    clearInterval(tick);
  }
}
async function botAnswer(env, m, chat, say, text, key, st, dbg, to) {
  const past = st.h;
  const q = text || "Что на фото и что с этим делать?";
  const refs = await botRefs(past.filter((x) => x.role === "user").map((x) => x.content).concat(q).join(" "));
  const sys = BOT_RULES + "\n\nСправочник сайта по теме вопроса:\n" + (refs.length ? refs.join("\n") : "(ничего не нашлось — отвечай в общем и предложи https://motohelper.ru/)");
  const images = m.photo ? [await tgPhoto(env, m.photo)].filter(Boolean) : [];
  const msgs = [{ role: "system", content: sys }].concat(past, [{ role: "user", content: q }]);
  await logQuestion(env, "tg", [{ role: "user", content: q }]);
  const res = await answer(env, msgs, images, "tg:" + chat);
  const reply = await collect(res);
  if (!reply) return say("ИИ сейчас перегружен — попробуй через пару минут.");
  if (env.FEEDBACK) {
    const h = past.concat([{ role: "user", content: q }, { role: "assistant", content: reply.slice(0, 1500) }]).slice(-8);
    await env.FEEDBACK.put(key, JSON.stringify({ d: st.d, n: st.n + 1, t: Date.now(), h }), { expirationTtl: 60 * 60 * 48 });
  }
  const shop = await shopLine(q, refs);
  const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // ссылки на магазины — короткими словами (HTML), а не длинными адресами; если Telegram не принял HTML — шлём текстом
  let sent = shop ? await tgApi(env, "sendMessage", Object.assign({ chat_id: chat, text: (esc(reply) + "\n\n" + shop).slice(0, 4096), parse_mode: "HTML", disable_web_page_preview: true }, to)) : null;
  if (!sent || !sent.ok) sent = await say(reply);
  if (!sent || !sent.ok) dbg("Telegram не принял ответ: " + JSON.stringify(sent).slice(0, 200));
  return sent;
}
async function botSetup(env, origin) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TG_HOOK_SECRET) return { ok: false, error: "нужны TELEGRAM_BOT_TOKEN и TG_HOOK_SECRET" };
  const hook = await tgApi(env, "setWebhook", { url: origin + "/tg-hook", secret_token: env.TG_HOOK_SECRET, allowed_updates: ["message", "inline_query"], drop_pending_updates: true });
  await tgApi(env, "setMyCommands", { commands: [{ command: "new", description: "Новый разговор" }, { command: "start", description: "Как пользоваться" }] });
  await tgApi(env, "setMyCommands", { scope: { type: "all_group_chats" }, commands: [{ command: "ask", description: "Спросить механика: /ask TT250 не заводится" }] });
  await tgApi(env, "setMyName", { name: "MotoHelper — ИИ-механик" });
  await tgApi(env, "setMyShortDescription", { short_description: "ИИ-механик: поломки, ТО и ремонт мотоциклов и питбайков. motohelper.ru" });
  await tgApi(env, "setMyDescription", { description: "Опиши поломку и модель — ИИ-механик MotoHelper подскажет, что проверить, и даст цифры: масло, свечи, зазоры клапанов. Можно прислать фото." });
  const me = await tgApi(env, "getMe", {});
  return { ok: !!hook.ok, webhook: hook.description, bot: me.result && me.result.username };
}
async function tellOwner(env, text) {
  try {
    const chat = env.FEEDBACK && (await env.FEEDBACK.get("tg:owner"));
    if (chat) await tgApi(env, "sendMessage", { chat_id: chat, text });
  } catch (e) {}
  return { ok: false, error: text };
}

/* Утренний отчёт владельцу: до 3 попыток; итог в KV «report:last» (виден в ?tg=status). Если в 09:00 МСК не вышел —
   повтор в 12:00 МСК (late) и сообщение владельцу с причиной — тихо не пропадает */
async function reportOnce(env, late) {
  if (env.FEEDBACK && (await env.FEEDBACK.get("report:sent:" + mskDay()))) return { ok: true, already: true };
  let r = { ok: false, error: "?" };
  for (let i = 0; i < 3; i++) {
    r = await dailyReport(env);
    if (r.ok) break;
    if (i < 2) await sleep(20000);
  }
  if (env.FEEDBACK) await env.FEEDBACK.put("report:last", JSON.stringify({ t: new Date().toISOString(), ok: r.ok, error: r.error }), { expirationTtl: 60 * 60 * 24 * 14 });
  if (!r.ok) await tellOwner(env, "⚠️ Отчёт за вчера не собрался" + (late ? " и в 12:00" : " в 09:00 (повторю в 12:00)") + ": " + String(r.error).slice(0, 200));
  return r;
}

/* по расписанию: посты в канал, время которых наступило; full (вечерний запуск) — ещё и самопроверка ИИ с итогом в KV «health»
   (его читает утренний отчёт) */
async function daily(env, full) {
  const tg = await tgRun(env);
  // те же посты — в группу ВКонтакте (если публикация подключена через /vk-auth)
  let vk = null;
  for (const p of tg.posts || []) {
    vk = await vkPost(env, p).catch((e) => ({ ok: false, error: e.message }));
    if (vk && !vk.ok && !vk.off) await tellOwner(env, "⚠️ Пост в группу ВК не вышел: " + vk.error);
  }
  if (!tg.ok) await tellOwner(env, "⚠️ Пост в канал не вышел: " + tg.error);
  if (!full) return { tg };
  let ai;
  try {
    const r = await selfTest(env);
    ai = await r.json();
  } catch (e) {
    ai = { ok: false, error: e.message };
  }
  const health = { t: new Date().toISOString(), tg: { ok: tg.ok, posted: tg.posted, error: tg.error }, vk: vk && { ok: vk.ok, error: vk.error }, ai: { ok: ai.ok, provider: ai.provider, error: ai.ok ? undefined : JSON.stringify(ai.error).slice(0, 300) } };
  if (env.FEEDBACK) await env.FEEDBACK.put("health", JSON.stringify(health));
  return health;
}

async function botDry(env, q) {
  const t0 = Date.now(), log = [];
  try {
    const refs = await botRefs(q);
    log.push("refs " + refs.length + " за " + (Date.now() - t0) + " мс");
    const res = await answer(env, [{ role: "system", content: BOT_RULES + "\n\nСправочник сайта по теме вопроса:\n" + refs.join("\n") }, { role: "user", content: q }], [], "dry");
    log.push("ИИ " + res.headers.get("x-mh-provider") + " за " + (Date.now() - t0) + " мс");
    const reply = await Promise.race([collect(res), new Promise((r) => setTimeout(() => r("__timeout"), 45000))]);
    log.push((reply === "__timeout" ? "ТАЙМАУТ чтения ответа" : "ответ") + " за " + (Date.now() - t0) + " мс");
    return { ok: !!reply, log, refs, reply, shop: await shopLine(q, refs) };
  } catch (e) {
    return { ok: false, log, error: String(e && e.stack || e) };
  }
}

/* «Где купить»: если в вопросе есть деталь — ссылки на поиск в магазинах (через партнёрку из ai-config.json, когда она есть).
   Расходники ищем как «<деталь> мото», остальное — с кодом мотора, иначе магазин выдаёт что попало. */
const PARTS = [[/свеч/, "свеча зажигания", 1], [/масл/, "масло 10W-40 мото", 1], [/аккумулятор|акб/, "аккумулятор мото", 1], [/покрышк|резин|шин[аыу]/, "покрышка мото", 1], [/камер/, "камера мото", 1],
  [/цеп[ьи] грм|грм|натяжител/, "цепь ГРМ", 0], [/цеп[ьи]/, "цепь мото", 1], [/звезд/, "звезда", 0], [/колодк/, "тормозные колодки", 0], [/воздушн.*фильтр|фильтр.*воздух|нулев/, "воздушный фильтр", 0], [/масл.*фильтр|фильтр.*масл/, "масляный фильтр", 0],
  [/карбюратор|карб\b/, "карбюратор", 0], [/поршн|поршен/, "поршень", 0], [/кольц/, "поршневые кольца", 0], [/сцеплен/, "диски сцепления", 0], [/прокладк/, "прокладки", 0],
  [/сальник/, "сальники", 0], [/трос/, "трос", 0], [/катушк/, "катушка зажигания", 0], [/коммутатор|cdi/, "коммутатор CDI", 0], [/стартер/, "стартер", 0], [/реле/, "реле стартера", 0], [/генератор|статор/, "статор генератора", 0], [/подшипник/, "подшипник", 0]];
let SITE_CFG = null;
async function shopLine(q, refs) {
  const t = String(q).toLowerCase().replace(/ё/g, "е");
  const p = PARTS.find((x) => x[0].test(t));
  if (!p) return "";
  const r0 = refs[0] || "";
  // код мотора из справочника: «мотор ZS172FMM 249 см³» → 172FMM (продавцы пишут без ZS)
  const code = ((/мотор (.+?) \d+ см³/.exec(r0) || [])[1] || "").replace(/^ZS\s*/i, "").replace(/\s*\(.*$/, "");
  const spark = ((/свеча (?:NGK |Torch |Denso |Bosch )?([A-Z0-9][A-Z0-9-]+)/.exec(r0) || [])[1]) || "";
  const oil = ((/масло (\d+W-\d+)/.exec(r0) || [])[1]) || "";
  const query = /свеч/.test(p[1]) && spark ? "свеча " + spark : /масло/.test(p[1]) && oil ? "масло " + oil + " мото" : p[2] || !code ? p[1] : p[1] + " " + code;
  if (!SITE_CFG) SITE_CFG = await fetch("https://motohelper.ru/ai-config.json", { cf: { cacheTtl: 3600 } }).then((r) => r.json()).catch(() => ({}));
  const href = (name, base) => {
    const url = base + encodeURIComponent(query), a = SITE_CFG.aff && SITE_CFG.aff[name];
    return typeof a === "string" && /^https:\/\//.test(a) ? (a.indexOf("{url}") >= 0 ? a.replace("{url}", encodeURIComponent(url)) : a + encodeURIComponent(url)) : url;
  };
  const link = (name, base) => '<a href="' + href(name, base).replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '">' + name + "</a>" + (SITE_CFG.aff && SITE_CFG.aff[name] ? " <i>(реклама)</i>" : "");
  return "🛒 " + query.replace(/&/g, "&amp;").replace(/</g, "&lt;") + ": " + [link("Ozon", "https://www.ozon.ru/search/?text="), link("Авито", "https://www.avito.ru/rossiya?q="), link("WB", "https://www.wildberries.ru/catalog/0/search.aspx?search="), link("AliExpress", "https://aliexpress.ru/wholesale?SearchText=")].join(" · ");
}

/* сколько вопросов задали ИИ за 7 дней и о чём — для понедельничного отчёта */
const TOPICS = [["не заводится", /не завод|не запуск/], ["глохнет", /глохн|глохет/], ["клапаны", /клапан/], ["масло", /масл/], ["свечи", /свеч/], ["карбюратор и жиклёры", /карб|жикл/],
  ["цепь и звёзды", /цеп|звезд/], ["дым", /дым/], ["перегрев", /гре[её]тся|перегр|кипит/], ["стук и шумы", /стук|шум|гремит/], ["тормоза", /тормоз|колодк/], ["электрика", /аккум|зарядк|провод|реле|генератор|катушк|искр/],
  ["сцепление", /сцеплен/], ["тюнинг", /тюнинг|прямоток|мощност|инжектор/], ["выбор мотоцикла", /какой (выбрать|купить)|что (выбрать|купить)|посовет/]];
/* вопросы ИИ-механику: за последние days суток или, если задан until, — за days суток до until (ISO) */
async function questionStats(env, days, until) {
  if (!env.FEEDBACK) return null;
  const since = new Date((until ? Date.parse(until) : Date.now()) - (days || 7) * 864e5).toISOString();
  let keys = [], cursor;
  do {
    const r = await env.FEEDBACK.list({ prefix: "q:", cursor, limit: 1000 });
    keys = keys.concat(r.keys.map((k) => k.name).filter((k) => k.slice(2) >= since && (!until || k.slice(2) < until)));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor && keys.length < 5000);
  const vals = await Promise.all(keys.slice(-300).map(async (k) => { try { return JSON.parse((await env.FEEDBACK.get(k)) || "{}"); } catch (e) { return {}; } }));
  const cnt = {};
  vals.forEach((v) => { const q = String(v.q || "").toLowerCase(); TOPICS.forEach(([name, re]) => re.test(q) && (cnt[name] = (cnt[name] || 0) + 1)); });
  const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 5).map((k) => k + " — " + cnt[k]);
  const tg = vals.filter((v) => v.src === "tg").length;
  return { total: keys.length, tg: Math.round((tg / (vals.length || 1)) * keys.length), site: keys.length - Math.round((tg / (vals.length || 1)) * keys.length), top };
}

/* --- Бот в группах и чатах мотоциклистов --- */
const GROUP_DAILY = 300; // ответов в сутки на одну группу
const GROUP_HELLO = "Привет, я ИИ-механик MotoHelper 🏍\n\nСпроси меня прямо здесь:\n/ask TT250 не заводится на холодную\n\nИли ответь на моё сообщение — продолжу разговор. Знаю 2 700 моделей и 970 моторов: масло, свечи, зазоры, частые поломки.";
let BOT_ME = null;
async function botMe(env) {
  if (!BOT_ME) {
    const r = await tgApi(env, "getMe", {}).catch(() => null);
    BOT_ME = (r && r.result && r.result.username) || "motohelper_post_bot";
  }
  return BOT_ME;
}
async function groupQuestion(env, m) {
  const me = (await botMe(env)).toLowerCase();
  const text = String(m.text || m.caption || "").trim();
  // бота добавили в группу — коротко рассказываем, как спрашивать
  if ((m.new_chat_members || []).some((u) => u.is_bot && String(u.username).toLowerCase() === me)) return "__hello";
  const cmd = /^\/(\w+)(@(\w+))?\s*([\s\S]*)$/.exec(text);
  if (cmd) {
    if (cmd[3] && cmd[3].toLowerCase() !== me) return null; // команда другому боту
    if (cmd[1] === "start" || cmd[1] === "help") return "__hello";
    if (cmd[1] !== "ask") return null;
    // «/ask» в ответ на чужой вопрос — отвечаем на него
    return cmd[4].trim() || (m.reply_to_message && (m.reply_to_message.text || m.reply_to_message.caption)) || "__hello";
  }
  const re = new RegExp("@" + me + "\\b", "i");
  if (re.test(text)) return text.replace(re, "").trim() || "__hello";
  const r = m.reply_to_message;
  if (r && r.from && r.from.is_bot && String(r.from.username).toLowerCase() === me && text) return text;
  return null;
}

/* --- Встроенный режим: карточки моделей и моторов прямо в любом чате --- */
async function botInline(env, iq) {
  const q = String(iq.query || "").trim();
  const results = [];
  if (q.length >= 2) {
    const refs = await botRefs(q), me = await botMe(env);
    refs.slice(0, 8).forEach((line, i) => {
      const m = /^(.+?) — (https:\/\/motohelper\.ru\/\S+)$/.exec(line);
      if (!m) return;
      const head = m[1], url = m[2];
      const title = head.split(":")[0].replace(/^Мотор /, "Мотор ");
      const facts = head.indexOf(":") > 0 ? head.slice(head.indexOf(":") + 1).trim() : head;
      results.push({
        type: "article",
        id: String(i) + "-" + url.length,
        title: title.slice(0, 64),
        description: facts.slice(0, 200),
        url,
        input_message_content: { message_text: ("🏍 " + head.replace(/; /g, "\n• ").replace(": мотор ", "\n• мотор ") + "\n\nПодробно: " + url + "\nСпросить механика: @" + me).slice(0, 4000), disable_web_page_preview: true },
      });
    });
  }
  const res = { inline_query_id: iq.id, results, cache_time: 3600, is_personal: false };
  if (!results.length) res.button = { text: "Спросить ИИ-механика в личке", start_parameter: "inline" };
  return tgApi(env, "answerInlineQuery", res);
}

/* --- «Спроси механика» на страницах каталога (m/…): короткий ответ потоком, как в приложении --- */
const ASK_IP = new Map(); // вопросов в сутки с одного адреса — в памяти сервера, примерно
async function pageAsk(env, ctx, body, ip) {
  const q = String(body.ask || "").trim().slice(0, 600), about = String(body.ctx || "").trim().slice(0, 160);
  if (q.length < 3) return json({ error: "empty" }, 400);
  const k = mskDay() + "|" + ip, n = (ASK_IP.get(k) || 0) + 1;
  if (ASK_IP.size > 20000) ASK_IP.clear();
  ASK_IP.set(k, n);
  if (n > 30) return json({ error: "rate_limited" }, 429);
  const refs = await botRefs(about + " " + q);
  const rules = BOT_RULES.replace("и отвечаешь в Telegram", "и отвечаешь на странице сайта");
  const sys = rules + (about ? "\n\nЧеловек читает страницу: " + about + ". Если в вопросе нет другой модели — отвечай про неё." : "") + "\n\nСправочник сайта по теме вопроса:\n" + (refs.length ? refs.join("\n") : "(ничего не нашлось — отвечай в общем)");
  ctx.waitUntil(Promise.resolve(logQuestion(env, "page", [{ role: "user", content: (about ? "[" + about + "] " : "") + q }])));
  return answer(env, [{ role: "system", content: sys }, { role: "user", content: q }], [], ip);
}

/* --- Отзывы владельцев на страницах моделей ---
   Все одобренные отзывы модели — в одной записи KV «rv:<адрес модели>» (показ страницы = одно чтение, без list —
   на бесплатном тарифе list ограничен 1000 в сутки). «rv:index» — список моделей с отзывами (для еженедельной
   выгрузки в HTML страниц). Модерация: явный мусор отсекаем правилами, остальное проверяет ИИ. */
const RV_IP = new Map();
const rvSlug = (x) => (/^[a-z0-9-]{2,80}$/.test(String(x || "")) ? String(x) : null);
async function listReviews(env, slug) {
  slug = rvSlug(slug);
  if (!slug || !env.FEEDBACK) return json({ ok: false, items: [] });
  let items = [];
  try {
    items = JSON.parse((await env.FEEDBACK.get("rv:" + slug)) || "[]");
  } catch (e) {}
  return new Response(JSON.stringify({ ok: true, items }), { headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
async function saveReview(env, r, ip) {
  const slug = rvSlug(r.slug);
  if (!slug || !env.FEEDBACK) return json({ ok: false, error: "bad" }, 400);
  const clean = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
  const item = { t: new Date().toISOString().slice(0, 10), name: clean(r.name, 40) || "Владелец", km: clean(r.km, 20), text: clean(r.text, 1500) };
  if (item.text.length < 30) return json({ ok: false, error: "short" }, 400);
  const k = mskDay() + "|" + ip, n = (RV_IP.get(k) || 0) + 1;
  if (RV_IP.size > 20000) RV_IP.clear();
  RV_IP.set(k, n);
  if (n > 5) return json({ ok: false, error: "rate_limited" }, 429);
  // ссылки, контакты и явный мат — сразу нет
  const all = item.name + " " + item.km + " " + item.text;
  if (/https?:|www\.|\.ru\b|\.com\b|@\w|t\.me|\+?\d[\d\s()-]{9,}\d|х[уy][йияеё]|п[иі]зд|еба[нл]|бля|сук[аи](?![а-яё])/i.test(all)) return json({ ok: true, published: false });
  let verdict = "";
  try {
    const res = await answer(env, [{ role: "system", content: "Ты модератор отзывов на сайте-справочнике по мотоциклам. Отзыв к модели «" + clean(r.model, 80) + "». Ответь строго одним словом: OK — если это осмысленный отзыв владельца (опыт езды, поломки, обслуживание, впечатления), без оскорблений, мата, рекламы, контактов и политики; NO — во всех остальных случаях." }, { role: "user", content: item.text }], [], "rv", true);
    verdict = (await collect(res)).toUpperCase();
  } catch (e) {}
  if (verdict.indexOf("OK") !== 0) return json({ ok: true, published: false });
  let items = [];
  try {
    items = JSON.parse((await env.FEEDBACK.get("rv:" + slug)) || "[]");
  } catch (e) {}
  items.unshift(item);
  await env.FEEDBACK.put("rv:" + slug, JSON.stringify(items.slice(0, 50)));
  if (items.length === 1) {
    let idx = [];
    try {
      idx = JSON.parse((await env.FEEDBACK.get("rv:index")) || "[]");
    } catch (e) {}
    if (idx.indexOf(slug) < 0) await env.FEEDBACK.put("rv:index", JSON.stringify(idx.concat(slug)));
  }
  return json({ ok: true, published: true, item });
}

/* --- «Нет моей модели»: заявки с сайта. Хранятся в KV «mr:<время ISO>-…» 90 дней; без контактов и IP.
   С одного адреса — не больше 10 в сутки; ссылки, телефоны и мат не принимаем --- */
const MR_IP = new Map();
async function saveModelReq(env, r, ip) {
  if (!env.FEEDBACK) return json({ ok: false, error: "no_kv" }, 501);
  const clean = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
  const item = { t: new Date().toISOString(), model: clean(r.model, 80), engine: clean(r.engine, 40), q: clean(r.q, 80), page: clean(r.page, 120) };
  if (item.model.length < 3) return json({ ok: false, error: "short" }, 400);
  const k = mskDay() + "|" + ip, cnt = (MR_IP.get(k) || 0) + 1;
  if (MR_IP.size > 20000) MR_IP.clear();
  MR_IP.set(k, cnt);
  if (cnt > 10) return json({ ok: false, error: "rate_limited" }, 429);
  const all = item.model + " " + item.engine;
  if (/https?:|www\.|\.ru\b|\.com\b|@\w|t\.me|\+?\d[\d\s()-]{9,}\d|х[уy][йияеё]|п[иі]зд|еба[нл]|бля|сук[аи](?![а-яё])/i.test(all)) return json({ ok: true });
  await env.FEEDBACK.put("mr:" + item.t + "-" + Math.random().toString(36).slice(2, 8), JSON.stringify(item), { expirationTtl: 60 * 60 * 24 * 90 });
  return json({ ok: true });
}
async function modelReqsSince(env, from, to) {
  if (!env.FEEDBACK) return [];
  const prefixes = [...new Set([from.slice(0, 10), to.slice(0, 10)])].map((d) => "mr:" + d);
  const keys = [].concat(...(await Promise.all(prefixes.map((p) => env.FEEDBACK.list({ prefix: p, limit: 1000 }).then((x) => x.keys.map((k) => k.name))))))
    .filter((k) => k.slice(3) >= from && k.slice(3) < to).sort();
  return Promise.all(keys.slice(0, 200).map(async (k) => JSON.parse((await env.FEEDBACK.get(k)) || "{}")));
}
/* одинаковые названия (без регистра, пробелов и дефисов) — одной строкой со счётчиком; мотор — первый указанный */
function groupReqs(items) {
  const m = new Map();
  for (const x of items) {
    if (!x || !x.model) continue;
    const key = x.model.toLowerCase().replace(/ё/g, "е").replace(/[\s\-_.]+/g, "");
    const g = m.get(key) || { model: x.model, engine: "", n: 0, last: "" };
    g.n++; if (!g.engine && x.engine) g.engine = x.engine; if (x.t > g.last) g.last = x.t;
    if (/[A-ZА-ЯЁ]/.test(x.model) && !/[A-ZА-ЯЁ]/.test(g.model)) g.model = x.model; // показываем написание с заглавными
    m.set(key, g);
  }
  return [...m.values()].sort((a, b) => b.n - a.n || (b.last > a.last ? 1 : -1));
}
async function listModelReqs(env) {
  if (!env.FEEDBACK) return { ok: false, error: "no_kv" };
  const keys = (await env.FEEDBACK.list({ prefix: "mr:", limit: 1000 })).keys.map((k) => k.name).sort().reverse().slice(0, 500);
  const items = await Promise.all(keys.map(async (k) => JSON.parse((await env.FEEDBACK.get(k)) || "{}")));
  const g = groupReqs(items);
  return { ok: true, total: items.length, models: g.map((x) => ({ model: x.model, engine: x.engine, n: x.n, last: x.last.slice(0, 10) })) };
}

/* --- Яндекс.Вебмастер: сколько страниц в поиске (для понедельничного отчёта) --- */
async function webmasterStats(env) {
  if (!env.YANDEX_WEBMASTER_TOKEN) return null;
  const api = (p) => fetch("https://api.webmaster.yandex.net/v4" + p, { headers: { Authorization: "OAuth " + env.YANDEX_WEBMASTER_TOKEN } }).then((r) => r.json());
  const me = await api("/user");
  if (!me.user_id) return null;
  const hosts = await api("/user/" + me.user_id + "/hosts");
  const h = (hosts.hosts || []).find((x) => /motohelper\.ru/.test(x.ascii_host_url || x.host_id || ""));
  if (!h) return null;
  const sm = await api("/user/" + me.user_id + "/hosts/" + encodeURIComponent(h.host_id) + "/summary");
  const pr = sm.site_problems || {};
  const RU = { FATAL: "фатальные", CRITICAL: "критичные", POSSIBLE_PROBLEM: "возможные", RECOMMENDATION: "рекомендации" };
  const problems = Object.keys(pr).filter((k) => pr[k]).map((k) => (RU[k] || k.toLowerCase()) + " — " + pr[k]).join(", ");
  return { searchable: sm.searchable_pages_count || 0, excluded: sm.excluded_pages_count || 0, sqi: sm.sqi, problems };
}

/* диагностика моделей Gemini (только с DEBUG_TOKEN): список моделей ключа или пробный вопрос с замером
   времени до первых слов и до конца ответа */
async function geminiProbe(env, q) {
  if (!env.GEMINI_API_KEY) return { ok: false, error: "нет GEMINI_API_KEY" };
  const H = { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY };
  if (q.get("list")) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=300", { headers: H });
    const j = await r.json();
    return { ok: r.ok, models: (j.models || []).filter((m) => (m.supportedGenerationMethods || []).indexOf("generateContent") >= 0).map((m) => m.name.replace("models/", "") + (m.thinking ? " [think]" : "") + " in:" + m.inputTokenLimit) };
  }
  const think = q.get("think"), sys = q.get("sys") || "Ты — опытный моторист. Отвечай по-русски, коротко и по делу, списком шагов.";
  const ask = q.get("q") || "Kayo T2 250, мотор ZS172FMM (карбюратор PZ30). Глохнет на холодную, прогретый работает нормально. Что проверить по порядку?";
  const gen = { maxOutputTokens: 2048, temperature: 0.4 };
  if (think === "0") gen.thinkingConfig = { thinkingBudget: 0 };
  else if (think) gen.thinkingConfig = { thinkingLevel: think };
  const body = JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: [{ text: ask }] }], generationConfig: gen });
  const out = await Promise.all(q.get("try").split(",").slice(0, 6).map(async (model) => {
    const t = Date.now(), ac = new AbortController(), timer = setTimeout(() => ac.abort(), 40000);
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":streamGenerateContent?alt=sse", { method: "POST", headers: H, body, signal: ac.signal });
      if (!r.ok || !r.body) return { model, status: r.status, ms: Date.now() - t, err: (await r.text()).slice(0, 200) };
      const rd = r.body.getReader(), dec = new TextDecoder();
      let first = 0, raw = "";
      for (;;) {
        const { done, value } = await rd.read();
        if (done) break;
        raw += dec.decode(value, { stream: true });
        if (!first && /"text"/.test(raw)) first = Date.now() - t;
      }
      const text = raw.split("\n").filter((l) => l.indexOf("data:") === 0).map((l) => { try { const j = JSON.parse(l.slice(5)); return ((j.candidates || [])[0] || {}).content.parts.map((p) => (p.thought ? "" : p.text || "")).join(""); } catch (e) { return ""; } }).join("");
      return { model, status: 200, first, ms: Date.now() - t, len: text.length, text: text.slice(0, +q.get("n") || 600) };
    } catch (e) {
      return { model, status: "timeout", ms: Date.now() - t };
    } finally {
      clearTimeout(timer);
    }
  }));
  return { ok: true, think: think || "по умолчанию", out };
}

async function geminiTimes(env) {
  if (!env.GEMINI_API_KEY) return { ok: false, error: "нет GEMINI_API_KEY" };
  const body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Ответь одним словом по-русски: привет" }] }], generationConfig: { maxOutputTokens: 20 } });
  const out = await Promise.all(GEMINI_MODELS.map(async (model) => {
    const t = Date.now(), ac = new AbortController(), timer = setTimeout(() => ac.abort(), 20000);
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY }, body, signal: ac.signal });
      await r.text();
      return { model, status: r.status, ms: Date.now() - t };
    } catch (e) {
      return { model, status: "timeout", ms: Date.now() - t };
    } finally {
      clearTimeout(timer);
    }
  }));
  return { ok: true, order: GEMINI_MODELS, times: out };
}

/* ===== Партнёрские переходы на AliExpress через Admitad =====
   У AliExpress в Admitad на каждую страницу своя ссылка, поэтому диплинк берём у API Admitad
   (метод deeplink_generator) и кладём в KV на 30 дней. Нужны секреты ADMITAD_CLIENT_ID и ADMITAD_CLIENT_SECRET
   (Admitad → настройки → доступ к API). Площадку и программу находим сами (или ADMITAD_W_ID / ADMITAD_C_ID).
   Без ключей или при ошибке — стандартная ссылка программы (ADMITAD_ALI_DEFAULT) или сама страница. */
const GO_HOSTS = /^https:\/\/(www\.)?aliexpress\.(ru|com)\//;
async function goShop(request, env, ctx) {
  const target = new URL(request.url).searchParams.get("u") || "";
  if (!GO_HOSTS.test(target) || target.length > 600) return new Response("bad link", { status: 400 });
  const kv = env.FEEDBACK, key = "dl|" + target;
  let link = kv ? await kv.get(key) : null;
  if (!link) {
    try { link = await admitadDeeplink(env, target); } catch (e) { console.log("deeplink", e && e.message); }
    if (link && kv) ctx.waitUntil(kv.put(key, link, { expirationTtl: 30 * 86400 }));
  }
  return new Response(null, { status: 302, headers: { Location: link || env.ADMITAD_ALI_DEFAULT || target, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
async function admitadToken(env) {
  const kv = env.FEEDBACK;
  const cached = kv && await kv.get("admitad|token");
  if (cached) return cached;
  const r = await fetch("https://api.admitad.com/token/", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(env.ADMITAD_CLIENT_ID + ":" + env.ADMITAD_CLIENT_SECRET), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&client_id=" + encodeURIComponent(env.ADMITAD_CLIENT_ID) + "&scope=" + encodeURIComponent("deeplink_generator websites advcampaigns_for_website")
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("token " + r.status + " " + JSON.stringify(j).slice(0, 200));
  if (kv) await kv.put("admitad|token", j.access_token, { expirationTtl: Math.max(60, (j.expires_in || 3600) - 300) });
  return j.access_token;
}
async function admitadIds(env, tok) {
  if (env.ADMITAD_W_ID && env.ADMITAD_C_ID) return [env.ADMITAD_W_ID, env.ADMITAD_C_ID];
  const kv = env.FEEDBACK;
  const cached = kv && await kv.get("admitad|ids");
  if (cached) return cached.split(",");
  const get = (path) => fetch("https://api.admitad.com" + path, { headers: { Authorization: "Bearer " + tok } }).then((r) => r.json());
  const sj = await get("/websites/v2/?limit=100"), sites = Array.isArray(sj) ? sj : sj.results || [];
  const site = sites.find((s) => /motohelper/i.test((s.name || "") + " " + (s.site_url || ""))) || sites[0];
  if (!site) throw new Error("no website");
  const progs = (await get("/advcampaigns/website/" + site.id + "/?limit=500")).results || [];
  const ok = (c) => /aliexpress/i.test(c.name || "") && (c.connection_status || "active") === "active";
  const ali = progs.find((c) => ok(c) && /RU/.test(c.name)) || progs.find(ok);
  if (!ali) throw new Error("no aliexpress program");
  const ids = [String(site.id), String(ali.id)];
  if (kv) await kv.put("admitad|ids", ids.join(","), { expirationTtl: 7 * 86400 });
  return ids;
}
async function admitadDeeplink(env, target) {
  if (!env.ADMITAD_CLIENT_ID || !env.ADMITAD_CLIENT_SECRET) return null;
  const tok = await admitadToken(env);
  const [w, c] = await admitadIds(env, tok);
  const r = await fetch("https://api.admitad.com/deeplink/" + w + "/advcampaign/" + c + "/?subid=site&ulp=" + encodeURIComponent(target), { headers: { Authorization: "Bearer " + tok } });
  const j = await r.json();
  const link = Array.isArray(j) && j[0] && j[0].link;
  if (!link || !/^https:\/\//.test(link)) throw new Error("deeplink " + r.status + " " + JSON.stringify(j).slice(0, 200));
  return link;
}

/* ===== Группа ВКонтакте: те же посты, что в Telegram-канале =====
   ВК публикует на стене группы только по ключу администратора. Владелец один раз открывает
   <сервер>/vk-auth и разрешает доступ в VK ID (приложение VK_CLIENT_ID, PKCE); сервер хранит ключ в KV
   и сам его продлевает. Ключ сохраняется, только если вошедший — администратор группы VK_GROUP_ID. */
const VK_API = "5.199";
const vkRedirect = (req) => new URL(req.url).origin + "/vk-cb";
const b64url = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const vkPage = (title, text, ok) => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><body style="font:17px/1.5 sans-serif;background:#000;color:#f2f2f2;padding:32px 20px;max-width:560px;margin:auto"><h2>' + (ok ? "✅ " : "⚠️ ") + title + "</h2><p>" + text + "</p></body>", { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
async function vkAuth(request, env) {
  if (!env.VK_CLIENT_ID || !env.FEEDBACK) return vkPage("Не настроено", "Нет VK_CLIENT_ID или хранилища KV.", false);
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  await env.FEEDBACK.put("vk:pkce:" + state, verifier, { expirationTtl: 900 });
  const q = new URLSearchParams({ response_type: "code", client_id: env.VK_CLIENT_ID, redirect_uri: vkRedirect(request), state, code_challenge: challenge, code_challenge_method: "S256", scope: "wall groups photos" });
  // код-верификатор ещё и в куке: KV между точками Cloudflare догоняет до минуты, кука приходит сразу
  return new Response(null, { status: 302, headers: { Location: "https://id.vk.com/authorize?" + q, "Set-Cookie": "vkpk=" + state + "." + verifier + "; Path=/vk-cb; Max-Age=900; HttpOnly; Secure; SameSite=Lax", "Cache-Control": "no-store" } });
}
async function vkCallback(request, env) {
  const u = new URL(request.url), sp = u.searchParams;
  // VK ID присылает параметры либо прямо в адресе, либо одним JSON в payload
  let pl = {};
  try { pl = JSON.parse(sp.get("payload") || "{}"); } catch (e) {}
  const pick = (k) => sp.get(k) || (pl[k] != null ? String(pl[k]) : "");
  const state = pick("state"), code = pick("code"), device = pick("device_id");
  if (env.FEEDBACK) await env.FEEDBACK.put("vk:lastcb", JSON.stringify({ t: new Date().toISOString(), keys: Array.from(sp.keys()), payloadKeys: Object.keys(pl), hasCode: !!code, hasState: !!state, cookie: /vkpk=/.test(request.headers.get("Cookie") || "") }), { expirationTtl: 86400 });
  if (pick("error")) return vkPage("ВК не дал доступ", (pick("error_description") || pick("error")).replace(/</g, "&lt;"), false);
  const ck = /(?:^|;\s*)vkpk=([^.;]+)\.([^;]+)/.exec(request.headers.get("Cookie") || "");
  const verifier = (ck && ck[1] === state && ck[2]) || (state && env.FEEDBACK && (await env.FEEDBACK.get("vk:pkce:" + state)));
  if (!code || !verifier) return vkPage("Ссылка устарела", "Открой подключение заново: " + new URL(request.url).origin + "/vk-auth", false);
  await env.FEEDBACK.delete("vk:pkce:" + state);
  const r = await fetch("https://id.vk.com/oauth2/auth", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier, client_id: env.VK_CLIENT_ID, device_id: device, redirect_uri: vkRedirect(request), state }) });
  const t = await r.json().catch(() => ({}));
  if (!t.access_token) return vkPage("Не получилось", "VK ID: " + String(t.error_description || t.error || r.status).replace(/</g, "&lt;"), false);
  const scope = String(t.scope || "");
  const g = await vkCall("groups.getById", { group_id: env.VK_GROUP_ID, fields: "is_admin,admin_level" }, t.access_token).catch((e) => ({ error: e.message }));
  const grp = (g && (g.groups || g)[0]) || {};
  await env.FEEDBACK.put("vk:lastcb", JSON.stringify({ t: new Date().toISOString(), step: "token", scope, user: t.user_id, isAdmin: grp.is_admin, level: grp.admin_level, gerr: g && g.error }), { expirationTtl: 86400 });
  // is_admin ВК отдаёт не всегда (зависит от выданных прав). Чужой аккаунт отсекаем так: если группа уже
  // подключена, переподключить её может только тот же пользователь ВК
  const prev = await env.FEEDBACK.get("vk:auth");
  const prevUser = prev ? JSON.parse(prev).user : null;
  if (prevUser && String(prevUser) !== String(t.user_id)) return vkPage("Группа уже подключена", "Её подключил другой аккаунт ВК.", false);
  await env.FEEDBACK.put("vk:auth", JSON.stringify({ access: t.access_token, refresh: t.refresh_token, exp: Date.now() + (t.expires_in || 3600) * 1000, device, user: t.user_id, scope }));
  if (!/\bwall\b/.test(scope)) return vkPage("Нет доступа к стене", "ВК выдал права: «" + scope.replace(/</g, "&lt;") + "». Без «wall» посты в группу публиковать нельзя.", false);
  return vkPage("Группа подключена", "Теперь каждый новый пост из Telegram-канала будет выходить и в группе MotoHelper. Эту страницу можно закрыть.", true);
}
async function vkCall(method, params, token) {
  const r = await fetch("https://api.vk.com/method/" + method, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(Object.assign({}, params, { access_token: token, v: VK_API })) });
  const j = await r.json();
  if (j.error) throw new Error(method + ": " + j.error.error_msg);
  return j.response;
}
async function vkToken(env) {
  const raw = env.FEEDBACK && (await env.FEEDBACK.get("vk:auth"));
  if (!raw) return null;
  const a = JSON.parse(raw);
  if (a.exp - Date.now() > 120e3) return a.access;
  const r = await fetch("https://id.vk.com/oauth2/auth", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: a.refresh, client_id: env.VK_CLIENT_ID, device_id: a.device, state: b64url(crypto.getRandomValues(new Uint8Array(16))) }) });
  const t = await r.json().catch(() => ({}));
  if (!t.access_token) throw new Error("ключ ВК не продлился (" + (t.error_description || t.error || r.status) + ") — открой /vk-auth ещё раз");
  await env.FEEDBACK.put("vk:auth", JSON.stringify(Object.assign(a, { access: t.access_token, refresh: t.refresh_token || a.refresh, exp: Date.now() + (t.expires_in || 3600) * 1000 })));
  return t.access_token;
}
/* пост в группу ВК: текст + картинка поста (если ВК дал доступ к фото — scope photos), иначе ссылка из поста —
   ВК покажет её превью с картинкой страницы */
async function vkPhoto(env, token, url) {
  const srv = await vkCall("photos.getWallUploadServer", { group_id: env.VK_GROUP_ID }, token);
  const img = await fetch(url);
  if (!img.ok) throw new Error("картинка " + img.status);
  const fd = new FormData();
  fd.append("photo", new Blob([await img.arrayBuffer()], { type: "image/jpeg" }), "post.jpg");
  const up = await (await fetch(srv.upload_url, { method: "POST", body: fd })).json();
  const saved = await vkCall("photos.saveWallPhoto", { group_id: env.VK_GROUP_ID, photo: up.photo, server: up.server, hash: up.hash }, token);
  return saved && saved[0] ? "photo" + saved[0].owner_id + "_" + saved[0].id : "";
}
async function vkPost(env, post) {
  if (!env.VK_GROUP_ID) return { ok: false, off: true, error: "нет VK_GROUP_ID" };
  const p = typeof post === "string" ? { text: post } : post;
  const raw = env.FEEDBACK && (await env.FEEDBACK.get("vk:auth"));
  const scope = raw ? JSON.parse(raw).scope || "" : "";
  if (raw && !/\bwall\b/.test(scope)) return { ok: false, off: true, error: "ВК не выдал доступ к стене" };
  const token = await vkToken(env);
  if (!token) return { ok: false, off: true, error: "группа ВК не подключена (/vk-auth)" };
  let att = "";
  if (p.photo && /\bphotos\b/.test(scope)) att = await vkPhoto(env, token, p.photo).catch(() => "");
  if (!att) att = (String(p.text).match(/https:\/\/motohelper\.ru\/\S*/) || [""])[0];
  const res = await vkCall("wall.post", Object.assign({ owner_id: "-" + env.VK_GROUP_ID, from_group: 1, message: String(p.text).slice(0, 15000) }, att ? { attachments: att } : {}), token);
  return { ok: true, post: res && res.post_id };
}
async function vkStatus(env) {
  const raw = env.FEEDBACK && (await env.FEEDBACK.get("vk:auth"));
  if (!raw) return { ok: false, connected: false };
  const a = JSON.parse(raw);
  return { ok: true, connected: true, scope: a.scope, expiresIn: Math.round((a.exp - Date.now()) / 60000) + " мин" };
}
