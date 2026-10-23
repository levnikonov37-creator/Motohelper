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
const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const CF_MODEL = "@cf/meta/llama-3.1-8b-instruct";
// Чужие сайты не тратят твои бесплатные лимиты: запросы принимаются только отсюда (и с локальной копии)
const ALLOWED = ["https://motohelper.ru", "https://www.motohelper.ru", "https://levnikonov37-creator.github.io"];
const allowed = (o) => !o || o === "null" || ALLOWED.includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);

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

    const errors = [];
    if (env.DEEPSEEK_API_KEY && (await deepseekAllowed(env, request.headers.get("CF-Connecting-IP") || "?"))) {
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
      try {
        const stream = await env.AI.run(CF_MODEL, { messages: textOnly(messages), stream: true, max_tokens: 1500 });
        return sse(stream, "workers-ai");
      } catch (e) {
        errors.push("workers-ai: " + e.message);
      }
    }
    const limited = errors.some((x) => /429|quota|limit|exhaust/i.test(x));
    return json({ error: limited ? "rate_limited" : "upstream_error", details: errors }, limited ? 429 : 502);
  },
};

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
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":streamGenerateContent?alt=sse&key=" + env.GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
      }),
    }
  );
  if (!res.ok || !res.body) throw new Error(res.status + " " + (await res.text()).slice(0, 200));
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
