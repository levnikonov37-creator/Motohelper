#!/bin/sh
# Выкладка ИИ-сервера прямо через API Cloudflare (wrangler с токеном «только этот воркер» падает на чтении настроек).
# Нужны CLOUDFLARE_API_TOKEN и CLOUDFLARE_ACCOUNT_ID. Привязки — в worker/metadata.json (держи в согласии с wrangler.toml);
# секреты и переменные, заданные в Cloudflare руками, сохраняются (keep_bindings). Затем — расписания (как в wrangler.toml);
# если токену нельзя менять расписания, выкладка всё равно считается успешной, а в журнале будет подсказка.
set -e
cd "$(dirname "$0")"
curl -sS -X PUT "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/motohelper-ai" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -F "metadata=@metadata.json;type=application/json" \
  -F "motohelper-ai.js=@motohelper-ai.js;type=application/javascript+module" > /tmp/cf-deploy.json
grep -q '"success": *true' /tmp/cf-deploy.json || { cat /tmp/cf-deploy.json; exit 1; }
echo "выложено"
curl -sS -X PUT "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/motohelper-ai/schedules" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  --data '[{"cron":"0 6 * * *"},{"cron":"0 9 * * *"},{"cron":"0 15 * * *"}]' > /tmp/cf-cron.json || true
if grep -q '"success": *true' /tmp/cf-cron.json; then echo "расписания: 06:00, 09:00, 15:00 UTC"; else
  echo "::warning::Расписания не обновились — поставь в Cloudflare → motohelper-ai → Settings → Triggers: 0 6 * * *, 0 9 * * *, 0 15 * * *"; cat /tmp/cf-cron.json; fi
