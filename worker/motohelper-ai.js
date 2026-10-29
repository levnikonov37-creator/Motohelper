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
//   TG_HOOK_SECRET — любой пароль: с ним бот отвечает в личке как ИИ-механик (Telegram шлёт сообщения на <адрес>/tg-hook).
//     Подключить один раз: открыть <адрес сервера>/?tg=setup.
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
  // раз в день (Cloudflare → Triggers → Cron, 15:00 UTC = 18:00 МСК) — очередной пост в Telegram-канал
  // и по понедельникам в 06:00 UTC (09:00 МСК) — отчёт о посещаемости владельцу
  async scheduled(event, env, ctx) {
    ctx.waitUntil(event.cron === "0 6 * * 1" ? weeklyReport(env) : daily(env));
  },
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    // сообщения боту в личку (Telegram шлёт их сюда с секретом из TG_HOOK_SECRET)
    if (new URL(request.url).pathname === "/tg-hook") return botHook(request, env, ctx);
    if (!allowed(request.headers.get("Origin"))) return json({ error: "not_allowed" }, 403);
    if (request.method === "GET") {
      const u = new URL(request.url);
      // список сообщений о неточностях: открой в браузере <адрес сервера>/?feedback=1&token=<FEEDBACK_TOKEN>
      if (u.searchParams.get("feedback")) return listFeedback(env, u.searchParams.get("token"));
      // самопроверка: <адрес сервера>/?test=1 — какой ИИ отвечает и какие ошибки у остальных (без ключей)
      if (u.searchParams.get("test")) return selfTest(env);
      // Telegram-канал: ?tg=status — что выйдет следующим; ?tg=run — опубликовать пост на сегодня, если ещё не вышел
      if (u.searchParams.get("tg") === "run") return json(await tgRun(env));
      // отчёт уходит только владельцу бота, так что ручной запуск безопасен
      if (u.searchParams.get("tg") === "report") return json(await weeklyReport(env));
      if (u.searchParams.get("tg") === "setup") return json(await botSetup(env, u.origin));
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
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const images = Array.isArray(body.images) ? body.images.slice(0, 2) : [];
    if (!messages.length) return json({ error: "no_messages" }, 400);
    logQuestion(env, "site", messages);

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
  const keys = (await env.FEEDBACK.list({ limit: 300 })).keys.map((k) => k.name).filter((k) => /^\d{4}-/.test(k)).sort().reverse().slice(0, 200);
  const items = await Promise.all(keys.map(async (k) => JSON.parse((await env.FEEDBACK.get(k)) || "{}")));
  return json({ ok: true, count: items.length, items });
}

// --- Telegram-канал: посты из tg/posts.json на сайте, по одному в день, каждый — один раз (отметка в KV) ---
const TG_POSTS = "https://motohelper.ru/tg/posts.json";
const mskDay = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
async function tgQueue(env) {
  const res = await fetch(TG_POSTS + "?t=" + Date.now(), { cf: { cacheTtl: 0 } });
  if (!res.ok) throw new Error("posts.json " + res.status);
  const cfg = await res.json();
  const today = mskDay(), posts = (cfg.posts || []).filter((p) => p && p.id && p.text && p.date);
  const sent = {};
  if (env.FEEDBACK) await Promise.all(posts.map(async (p) => (sent[p.id] = !!(await env.FEEDBACK.get("tg:sent:" + p.id)))));
  return { cfg, today, posts, sent };
}
async function tgStatus(env) {
  try {
    const { cfg, today, posts, sent } = await tgQueue(env);
    const left = posts.filter((p) => !sent[p.id]).sort((a, b) => (a.date < b.date ? -1 : 1));
    return { ok: true, bot: !!env.TELEGRAM_BOT_TOKEN, channel: cfg.channel, today, sent: posts.length - left.length, left: left.length, next: left[0] ? { id: left[0].id, date: left[0].date } : null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
async function tgRun(env) {
  try {
    if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: "нет TELEGRAM_BOT_TOKEN" };
    if (!env.FEEDBACK) return { ok: false, error: "нет KV FEEDBACK — некуда записать, что пост вышел" };
    const { cfg, today, posts, sent } = await tgQueue(env);
    if (!cfg.channel || cfg.channel === "@CHANNEL") return { ok: false, error: "в posts.json не указан канал" };
    const due = posts.filter((p) => !sent[p.id] && p.date <= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    if (!due) return { ok: true, posted: null, today };
    // отметка до отправки: если cron и ручной запуск совпадут, пост не выйдет дважды
    await env.FEEDBACK.put("tg:sent:" + due.id, new Date().toISOString());
    const r = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.channel, text: String(due.text).slice(0, 4096) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) {
      await env.FEEDBACK.delete("tg:sent:" + due.id);
      return { ok: false, error: "telegram: " + (j.description || r.status), id: due.id };
    }
    return { ok: true, posted: due.id, today };
  } catch (e) {
    return { ok: false, error: e.message };
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
async function metrika(env, q) {
  const r = await fetch("https://api-metrika.yandex.net/stat/v1/data?ids=" + METRIKA_ID + "&lang=ru&" + q, { headers: { Authorization: "OAuth " + env.YANDEX_METRIKA_TOKEN } });
  const j = await r.json();
  if (!r.ok) throw new Error("Метрика " + r.status + ": " + (j.message || "").slice(0, 150));
  return j;
}
async function weeklyReport(env) {
  try {
    if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: "нет TELEGRAM_BOT_TOKEN" };
    if (!env.YANDEX_METRIKA_TOKEN) return { ok: false, error: "нет YANDEX_METRIKA_TOKEN" };
    const chat = await ownerChat(env);
    if (!chat) return { ok: false, error: "владелец не найден — напиши боту /start" };
    const M = "metrics=ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:avgVisitDurationSeconds";
    const [cur, prev, src, pages] = await Promise.all([
      metrika(env, M + "&date1=7daysAgo&date2=yesterday"),
      metrika(env, M + "&date1=14daysAgo&date2=8daysAgo"),
      metrika(env, "metrics=ym:s:visits&dimensions=ym:s:lastTrafficSource&sort=-ym:s:visits&limit=5&date1=7daysAgo&date2=yesterday"),
      metrika(env, "metrics=ym:pv:pageviews&dimensions=ym:pv:URLPath&sort=-ym:pv:pageviews&limit=5&date1=7daysAgo&date2=yesterday"),
    ]);
    const t = cur.totals || [0, 0, 0, 0], p = prev.totals || [0, 0, 0, 0];
    const n = (x) => Math.round(x || 0).toLocaleString("ru-RU");
    const delta = (a, b) => (!b ? "" : " (" + (a >= b ? "+" : "") + Math.round(((a - b) / b) * 100) + "% к прошлой неделе)");
    const min = Math.floor((t[3] || 0) / 60), sec = Math.round((t[3] || 0) % 60);
    let subs = null;
    try {
      const posts = await fetch(TG_POSTS).then((r) => r.json());
      const c = await tgApi(env, "getChatMemberCount", { chat_id: posts.channel });
      if (c.ok) subs = c.result;
    } catch (e) {}
    const lines = [
      "📊 MotoHelper за неделю",
      "",
      "👤 Посетителей: " + n(t[1]) + delta(t[1], p[1]),
      "🔁 Визитов: " + n(t[0]) + delta(t[0], p[0]),
      "📄 Просмотров страниц: " + n(t[2]),
      "⏱ В среднем на сайте: " + min + " мин " + sec + " с",
      subs != null ? "📣 Подписчиков канала: " + n(subs) : "",
      "",
      (src.data || []).length ? "Откуда пришли:\n" + src.data.map((d) => "• " + d.dimensions[0].name + " — " + n(d.metrics[0])).join("\n") : "",
      "",
      (pages.data || []).length ? "Что смотрели:\n" + pages.data.map((d) => "• " + (d.dimensions[0].name || "/") + " — " + n(d.metrics[0])).join("\n") : "",
    ].filter((x, i, a) => x !== "" || (a[i - 1] !== "" && i < a.length - 1)).join("\n").trim();
    const r = await tgApi(env, "sendMessage", { chat_id: chat, text: lines, disable_web_page_preview: true });
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
const BOT_INDEX = "https://motohelper.ru/tg/bot-index.json";
const BOT_DAILY = 30; // ответов в сутки одному человеку
let BOT_IDX = null, BOT_IDX_T = 0;
async function botIndex() {
  if (!BOT_IDX || Date.now() - BOT_IDX_T > 6 * 3600e3) {
    try {
      const r = await fetch(BOT_INDEX, { cf: { cacheTtl: 3600 } });
      if (r.ok) (BOT_IDX = await r.json()), (BOT_IDX_T = Date.now());
    } catch (e) {}
  }
  return BOT_IDX;
}
const LAT = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
// слова латиницей + склейки соседних («тт 250» → tt250), чтобы «тт250» нашло Motoland TT250
const latTokens = (s) => {
  const w = (String(s).toLowerCase().split("").map((c) => (c in LAT ? LAT[c] : c)).join("").match(/[a-z0-9]+/g) || []);
  return w.concat(w.slice(1).map((x, i) => w[i] + x));
};
const tokW = (t) => (/\d/.test(t) && /[a-z]/.test(t) ? (t.length > 2 ? 3 : 2) : /^\d+$/.test(t) ? 1 : t.length >= 4 ? 1 : 0);
const STOP = new Set("как что где когда почему зачем какой какая какое какие можно нужно надо есть если или для при без под над мотоцикл мотоцикла мотор мотора питбайк".split(" "));
const ruStems = (s) => (String(s).toLowerCase().replace(/ё/g, "е").match(/[а-я]{4,}/g) || []).filter((w) => !STOP.has(w)).map((w) => w.slice(0, 5));
function botRefs(idx, text) {
  if (!idx) return [];
  const q = new Set(latTokens(text)), out = [];
  const top = (list, score, n, min) =>
    list.map((x) => [score(x), x]).filter((p) => p[0] >= min).sort((a, b) => b[0] - a[0]).slice(0, n).map((p) => p[1]);
  const sc = (name) => latTokens(name).reduce((a, t) => a + (q.has(t) ? tokW(t) : 0), 0);
  top(idx.m, (x) => sc(x[0]), 3, 3).forEach((x) => { const e = idx.e[x[2]]; out.push(x[0] + ": мотор " + (e ? e[2] : "—") + " — https://motohelper.ru/m/" + x[1] + "/"); });
  top(idx.e, (x) => sc(x[0]), 2, 3).forEach((x) => out.push("Мотор " + x[2] + " — https://motohelper.ru/m/motor/" + x[1] + "/"));
  const st = new Set(ruStems(text));
  top(idx.g, (x) => ruStems(x[0]).filter((w) => st.has(w)).length, 3, 1).forEach((x) => out.push(x[0] + " — https://motohelper.ru/m/" + x[1] + "/"));
  return out;
}
const BOT_RULES = `Ты — ИИ-механик сайта MotoHelper (motohelper.ru) и отвечаешь в Telegram.
Правила:
1. Только по-русски, коротко и по делу: до 12 строк. Простой текст без markdown: без звёздочек, решёток и таблиц; пункты — с «•».
2. Тема — ремонт, обслуживание, выбор и езда на мотоциклах, питбайках, мопедах, скутерах, квадроциклах. На другое вежливо откажи одной фразой.
3. Цифры (масло, объём, свечи, зазоры, моменты) бери только из справочника ниже. Если нужной цифры там нет — так и скажи и посоветуй мануал своей модели. Ничего не выдумывай.
4. Если неясно, какой мотоцикл или мотор, — сначала коротко ответь в общем, потом спроси модель.
5. Тормоза, руль, подвеска, течь топлива — предупреди, что ездить нельзя до ремонта.
6. В конце, если в справочнике есть подходящая страница, дай одну-две ссылки строкой «Подробно: <ссылка>». Ссылки — только из справочника.`;
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
  const m = up.message;
  // только личка: в канале и группах бот молчит; ответ — в фоне, Telegram ждать не должен
  if (m && m.chat && m.chat.type === "private") ctx.waitUntil(botReply(env, m).catch(() => {}));
  return new Response("ok");
}
async function botReply(env, m) {
  const chat = m.chat.id, say = (text) => tgApi(env, "sendMessage", { chat_id: chat, text: String(text).slice(0, 4096), disable_web_page_preview: true });
  const text = String(m.text || m.caption || "").trim();
  const hist = "tg:chat:" + chat;
  if (/^\/start/.test(text)) {
    if (env.FEEDBACK && !(await env.FEEDBACK.get("tg:owner"))) await env.FEEDBACK.put("tg:owner", String(chat));
    return say("Привет! Я ИИ-механик MotoHelper 🏍\n\nНапиши, что случилось и какой у тебя мотоцикл — например: «TT250 не заводится на холодную». Можно прислать фото детали или поломки.\n\nНовый разговор — /new\nСайт: https://motohelper.ru/");
  }
  if (/^\/new/.test(text)) {
    if (env.FEEDBACK) await env.FEEDBACK.delete(hist);
    return say("Начнём заново. Какой мотоцикл и что с ним?");
  }
  if (!text && !m.photo) return say("Я понимаю текст и фото. Опиши поломку словами 🙂");
  const day = mskDay(), rk = "tg:rl:" + day + ":" + chat;
  const used = env.FEEDBACK ? Number(await env.FEEDBACK.get(rk)) || 0 : 0;
  if (used >= BOT_DAILY) return say("На сегодня лимит ответов исчерпан — приходи завтра. Пока можно поискать на сайте: https://motohelper.ru/");
  tgApi(env, "sendChatAction", { chat_id: chat, action: "typing" }).catch(() => {});
  let past = [];
  try {
    past = (env.FEEDBACK && JSON.parse((await env.FEEDBACK.get(hist)) || "[]")) || [];
  } catch (e) {}
  const q = text || "Что на фото и что с этим делать?";
  const refs = botRefs(await botIndex(), past.filter((x) => x.role === "user").map((x) => x.content).concat(q).join(" "));
  const sys = BOT_RULES + "\n\nСправочник сайта по теме вопроса:\n" + (refs.length ? refs.join("\n") : "(ничего не нашлось — отвечай в общем и предложи https://motohelper.ru/)");
  const images = m.photo ? [await tgPhoto(env, m.photo)].filter(Boolean) : [];
  const msgs = [{ role: "system", content: sys }].concat(past, [{ role: "user", content: q }]);
  logQuestion(env, "tg", [{ role: "user", content: q }]);
  const res = await answer(env, msgs, images, "tg:" + chat);
  const reply = await collect(res);
  if (!reply) return say("ИИ сейчас перегружен — попробуй через пару минут.");
  if (env.FEEDBACK) {
    await env.FEEDBACK.put(rk, String(used + 1), { expirationTtl: 60 * 60 * 48 });
    await env.FEEDBACK.put(hist, JSON.stringify(past.concat([{ role: "user", content: q }, { role: "assistant", content: reply.slice(0, 1500) }]).slice(-8)), { expirationTtl: 60 * 60 * 6 });
  }
  return say(reply);
}
async function botSetup(env, origin) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TG_HOOK_SECRET) return { ok: false, error: "нужны TELEGRAM_BOT_TOKEN и TG_HOOK_SECRET" };
  const hook = await tgApi(env, "setWebhook", { url: origin + "/tg-hook", secret_token: env.TG_HOOK_SECRET, allowed_updates: ["message"], drop_pending_updates: true });
  await tgApi(env, "setMyCommands", { commands: [{ command: "new", description: "Новый разговор" }, { command: "start", description: "Как пользоваться" }] });
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

/* раз в день: пост в канал и самопроверка ИИ; итог — в KV «health» (его читает ежедневная проверка по расписанию) */
async function daily(env) {
  const tg = await tgRun(env);
  let ai;
  try {
    const r = await selfTest(env);
    ai = await r.json();
  } catch (e) {
    ai = { ok: false, error: e.message };
  }
  const health = { t: new Date().toISOString(), tg: { ok: tg.ok, posted: tg.posted, error: tg.error }, ai: { ok: ai.ok, provider: ai.provider, error: ai.ok ? undefined : JSON.stringify(ai.error).slice(0, 300) } };
  if (env.FEEDBACK) await env.FEEDBACK.put("health", JSON.stringify(health));
  if (!tg.ok) await tellOwner(env, "⚠️ Пост в канал не вышел: " + tg.error);
  return health;
}
