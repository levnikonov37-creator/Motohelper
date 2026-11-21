#!/bin/sh
# Выкладка ИИ-сервера прямо через API Cloudflare (wrangler с токеном «только этот воркер» падает на чтении настроек).
# Нужен CLOUDFLARE_API_TOKEN (права «Workers Scripts: Edit»); CLOUDFLARE_ACCOUNT_ID необязателен — без него берётся аккаунт,
# в котором есть воркер motohelper-ai. Привязки — в worker/metadata.json (держи в согласии с wrangler.toml);
# секреты и переменные, заданные в Cloudflare руками, сохраняются (keep_bindings). Затем — расписания (как в wrangler.toml);
# если токену нельзя менять расписания, выкладка всё равно считается успешной, а в журнале будет подсказка.
set -e
cd "$(dirname "$0")"
[ -n "$CLOUDFLARE_API_TOKEN" ] || { echo "нет CLOUDFLARE_API_TOKEN"; exit 1; }
CF=https://api.cloudflare.com/client/v4
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
  for id in $(curl -sS "$CF/accounts" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import sys,json; print(' '.join(a['id'] for a in json.load(sys.stdin).get('result') or []))"); do
    if curl -sS "$CF/accounts/$id/workers/scripts/motohelper-ai/schedules" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | grep -q '"success": *true'; then CLOUDFLARE_ACCOUNT_ID=$id; break; fi
  done
  [ -n "$CLOUDFLARE_ACCOUNT_ID" ] || { echo "не нашёл аккаунт с воркером motohelper-ai — проверь права токена (Account: Workers Scripts: Edit)"; exit 1; }
fi
curl -sS -X PUT "$CF/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/motohelper-ai" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -F "metadata=@metadata.json;type=application/json" \
  -F "motohelper-ai.js=@motohelper-ai.js;type=application/javascript+module" > /tmp/cf-deploy.json
grep -q '"success": *true' /tmp/cf-deploy.json || { cat /tmp/cf-deploy.json; exit 1; }
echo "выложено"
curl -sS -X PUT "$CF/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/motohelper-ai/schedules" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  --data '[{"cron":"0 6 * * *"},{"cron":"0 9 * * *"},{"cron":"0 15 * * *"}]' > /tmp/cf-cron.json || true
if grep -q '"success": *true' /tmp/cf-cron.json; then echo "расписания: 06:00, 09:00, 15:00 UTC"; else
  echo "::warning::Расписания не обновились — поставь в Cloudflare → motohelper-ai → Settings → Triggers: 0 6 * * *, 0 9 * * *, 0 15 * * *"; cat /tmp/cf-cron.json; fi
