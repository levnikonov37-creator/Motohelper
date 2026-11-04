#!/bin/sh
# Выкладка ИИ-сервера прямо через API Cloudflare (wrangler с токеном «только этот воркер» падает на чтении настроек).
# Нужны CLOUDFLARE_API_TOKEN и CLOUDFLARE_ACCOUNT_ID. Привязки — в worker/metadata.json (держи в согласии с wrangler.toml);
# секреты и переменные, заданные в Cloudflare руками, сохраняются (keep_bindings). Расписания (crons) не трогаются.
set -e
cd "$(dirname "$0")"
curl -sS -X PUT "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/motohelper-ai" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -F "metadata=@metadata.json;type=application/json" \
  -F "motohelper-ai.js=@motohelper-ai.js;type=application/javascript+module" > /tmp/cf-deploy.json
grep -q '"success": *true' /tmp/cf-deploy.json || { cat /tmp/cf-deploy.json; exit 1; }
echo "выложено"
