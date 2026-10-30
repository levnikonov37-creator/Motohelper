# Утренняя задача (её выполняет Claude по расписанию)

1. `git fetch origin claude/bold-davinci-r1ir30 && git checkout claude/bold-davinci-r1ir30 && git pull`
2. Сбор артикулов: следующие 4 запроса из `data/queries.txt` по кругу (`state.json` → `q`).
   Для каждого — поиск `site:wildberries.ru/catalog detail.aspx <запрос>`, limit 50.
   Номера товаров из ссылок дописать в `data/articles-<дата>.txt`.
3. `python3 cards/daily.py prepare -n 12`
4. Проверка глазами: собрать главные слайды пачки в одну картинку и посмотреть.
   - фото с надписями продавца, водяными знаками, заглушкой «нет фото», мусором → `daily.py drop <id> --why ...`;
   - кривой заголовок или фишки → поправить `spec.json` в папке слайдов и пересобрать
     `python3 cards/slides.py <артикул> -o <папка> --spec <папка>/spec.json`;
   - запрещённые слова (`banned` в batch.json) — убрать.
5. `python3 cards/daily.py send` — если заданы TELEGRAM_BOT_TOKEN и TG_CHAT_ID.
   Если нет — коротко написать итог и пути к слайдам в ответе сессии.
6. Закоммитить `cards/data/` (state.json, новые articles) и запушить в ветку.
   Папку `cards/out/` не коммитить: там почты и ИНН.
