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
// Сайт сам узнаёт, что фото работают: GET на адрес сервера отвечает {"images": true}.

const DEEPSEEK_MODEL = "deepseek-flash";
// Gemini: по очереди — старые модели Google снимает, а свежие бывают перегружены (503)
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.5-flash", "gemini-flash-lite-latest"];
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
  "Access-Control-Expose-Headers": "x-mh-provider",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

const sse = (body, provider) =>
  new Response(body, { headers: { ...CORS, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", "x-mh-provider": provider } });

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (!allowed(request.headers.get("Origin"))) return json({ error: "not_allowed" }, 403);
    if (request.method === "GET") {
      const u = new URL(request.url);
      // список сообщений о неточностях: открой в браузере <адрес сервера>/?feedback=1&token=<FEEDBACK_TOKEN>
      if (u.searchParams.get("feedback")) return listFeedback(env, u.searchParams.get("token"));
      // самопроверка: <адрес сервера>/?test=1 — какой ИИ отвечает и какие ошибки у остальных (без ключей)
      if (u.searchParams.get("test")) return selfTest(env);
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
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const images = Array.isArray(body.images) ? body.images.slice(0, 2) : [];
    if (!messages.length) return json({ error: "no_messages" }, 400);

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
        return sse(await gemini(env, messages, images), "gemini");
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
  const body = JSON.stringify({
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents,
    generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
  });
  let res, err = "";
  for (const model of GEMINI_MODELS) {
    res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":streamGenerateContent?alt=sse", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body,
    });
    if (res.ok && res.body) break;
    err += model + " " + res.status + " " + (await res.text()).slice(0, 120) + "; ";
    res = null;
    // неверный ключ или регион не поддерживается — другие модели не помогут
    if (err.indexOf(" 400 ") >= 0 || err.indexOf(" 403 ") >= 0) break;
  }
  if (!res) throw new Error(err);
  // ответ Gemini → строки «data: {"response": "..."}», которые понимает сайт
  const enc = new TextEncoder(), dec = new TextDecoder();
  let buf = "";
  return res.body.pipeThrough(
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
            const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
            const text = parts.map((p) => p.text || "").join("");
            if (text) ctl.enqueue(enc.encode("data: " + JSON.stringify({ response: text }) + "\n\n"));
          } catch (e) {}
        }
      },
      flush(ctl) {
        ctl.enqueue(enc.encode("data: [DONE]\n\n"));
      },
    })
  );
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
async function listFeedback(env, token) {
  if (!env.FEEDBACK) return json({ ok: false, error: "no_kv" }, 501);
  if (!env.FEEDBACK_TOKEN || token !== env.FEEDBACK_TOKEN) return json({ ok: false, error: "token" }, 403);
  const keys = (await env.FEEDBACK.list({ limit: 300 })).keys.map((k) => k.name).filter((k) => k.indexOf("rl:") !== 0).sort().reverse().slice(0, 200);
  const items = await Promise.all(keys.map(async (k) => JSON.parse((await env.FEEDBACK.get(k)) || "{}")));
  return json({ ok: true, count: items.length, items });
}
