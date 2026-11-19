# Как выложить Moto Empire Tycoon в Roblox (за компьютером, ~30–40 минут)

Открой эту страницу **на компьютере**:
https://github.com/levnikonov37-creator/Motohelper/blob/claude/upbeat-wright-wtbw89/roblox/PUBLISH.md

Делай по порядку, ничего не пропускай. Если что-то пошло не так — сфоткай экран и пришли мне.

---

## 0. Что нужно заранее

- Логин и пароль от аккаунта **Roblox** (на него будет записана игра и будут приходить Robux).
- Логин и пароль от **GitHub** (аккаунт `levnikonov37-creator`).
- Если ты в России: Roblox там заблокирован, на компе нужен рабочий VPN — уточни в клубе.
- **Компьютер чужой:** не ставь галочку «запомнить пароль», а в конце обязательно выйди из всех аккаунтов (шаг 11).

## 1. Скачай файлы

Нажми на каждую ссылку — скачается файл (обычно в папку «Загрузки»):

| Файл | Зачем |
|---|---|
| [MotoEmpireTycoon.rbxl](https://github.com/levnikonov37-creator/Motohelper/raw/claude/upbeat-wright-wtbw89/roblox/build/MotoEmpireTycoon.rbxl) | сама игра |
| [game-icon.png](https://github.com/levnikonov37-creator/Motohelper/raw/claude/upbeat-wright-wtbw89/roblox/assets/game-icon.png) | иконка игры |
| [thumbnail-1.png](https://github.com/levnikonov37-creator/Motohelper/raw/claude/upbeat-wright-wtbw89/roblox/assets/thumbnail-1.png) | обложка 1 |
| [thumbnail-2.png](https://github.com/levnikonov37-creator/Motohelper/raw/claude/upbeat-wright-wtbw89/roblox/assets/thumbnail-2.png) | обложка 2 |

Иконки для пропусков и товаров качать не нужно — их загрузит GitHub сам.

## 2. Установи Roblox Studio

1. Открой https://create.roblox.com и нажми **Start Creating** (или **Download Studio**).
2. Запусти скачанный файл, дождись установки (пара минут).
3. Studio откроется — войди в **свой** аккаунт Roblox.

## 3. Открой игру и проверь её

1. В Studio: **File → Open from File…** → выбери `MotoEmpireTycoon.rbxl` из «Загрузок».
2. Включи окно ошибок: вкладка **View → Output**.
3. Нажми **Play** (или F5). Подожди 5–10 секунд.
4. Проверь:
   - ты стоишь у входа в свой гараж, вверху экрана деньги `$0`;
   - наступи на зелёную кнопку **Bolt Press (FREE)** — появится станок, на ленту начнут падать детали;
   - детали доезжают до зелёного блока **SELL**;
   - наступи на зелёную площадку **COLLECT** справа — деньги вверху вырастут;
   - слева кнопки **SHOP, REBIRTH, DAILY, CODES** открывают окна.
5. В окне **Output** жёлтые строчки `Playing WITHOUT saving` — это нормально.
   **Красные строчки** — сфоткай и пришли мне.
6. Останови игру: кнопка **Stop** (или Shift+F5).

## 4. Опубликуй игру

1. **File → Publish to Roblox** (или Alt+P).
2. Выбери **Create new experience**.
3. Name: `Moto Empire Tycoon`. Description — любое (GitHub потом поставит нормальное).
   Genre: Simulation (если спросит). Devices: оставь все.
4. Нажми **Create** и дождись надписи об успешной публикации.
5. **Home → Game Settings → Security** → включи **Enable Studio Access to API Services** → **Save**.

Studio больше не нужна — можно закрыть.

## 5. Настрой игру на сайте

Открой https://create.roblox.com/dashboard/creations — там карточка **Moto Empire Tycoon**.

1. **Запиши два номера** (в Блокнот на компе):
   нажми **⋯** на карточке игры → **Copy Universe ID** → вставь в Блокнот;
   снова **⋯** → **Copy Start Place ID** → вставь в Блокнот.
   Подпиши, где какой — это **разные** числа.
2. Нажми на карточку, откроется страница игры. Слева:
   - **Places** → нажми на место → найди **Max Players / Server Size** → поставь **6** → Save.
     (В игре 6 гаражей: если оставить больше, лишние игроки останутся без гаража.)
   - **Basic Settings** (или **Configure → Icon/Thumbnails**): иконка — `game-icon.png`,
     в Thumbnails добавь `thumbnail-1.png` и `thumbnail-2.png` → Save.
   - **Audience → Maturity & Compliance** (анкета): отвечай честно. В игре нет насилия, крови,
     страшилок, азарта и романтики; есть чат и покупки за Robux. Отправь анкету.
3. Игру пока **не делай публичной** — сначала донат (шаги 6–9).

## 6. Создай API-ключ (чтобы GitHub мог выкладывать игру)

1. Открой https://create.roblox.com/dashboard/credentials → **Create API Key**.
2. Name: `github-publish`.
3. **Access Permissions** → **Select API System** — добавь по очереди и в каждом выбери свою игру:
   - `universe-places` → **Write**
   - `game-pass` → **Read** и **Write**
   - `developer-product` → **Read** и **Write**
   - `universe` → **Write** (если такого нет — пропусти)
4. **Security → Accepted IP Addresses**: впиши `0.0.0.0/0` и нажми Add.
5. **Expiration**: No expiration (без срока), если можно.
6. **Save & Generate Key** → **Copy Key to Clipboard** → вставь в Блокнот.
   Ключ показывают **один раз** и это как пароль — никому его не показывай.

## 7. Отдай ключ и номера GitHub

Делай на этом же компе, чтобы не пересылать ключ.

1. Открой https://github.com/levnikonov37-creator/Motohelper/settings/secrets/actions
   (войди в GitHub, если попросит).
2. Нажми **New repository secret** и создай три секрета (имя — точно как здесь, большими буквами):

| Name | Secret |
|---|---|
| `ROBLOX_API_KEY` | ключ из шага 6 |
| `ROBLOX_UNIVERSE_ID` | Universe ID из шага 5 |
| `ROBLOX_PLACE_ID` | Start Place ID из шага 5 |

Каждый раз — **Add secret**.

## 8. Запусти выкладку

1. Открой https://github.com/levnikonov37-creator/Motohelper/pull/104
2. Внизу нажми **Merge pull request** → **Confirm merge**.
3. Открой https://github.com/levnikonov37-creator/Motohelper/actions/workflows/roblox.yml
   - если там уже крутится запуск — жди;
   - если нет — справа **Run workflow** → **Run workflow**.
4. Через 2–5 минут должна появиться **зелёная галочка**.
   **Красный крестик** — нажми на запуск, потом на красный шаг, сфоткай текст и пришли мне.

## 9. Проверь, что всё появилось

1. На странице игры в Creator Hub: **Monetization → Passes** — там 4 пропуска
   (2x Cash, Auto Collect, Turbo Factory, VIP), в **Developer Products** — 4 товара.
2. На телефоне в приложении Roblox открой свою игру (она пока видна только тебе) и поиграй:
   в магазине у товаров должны быть цены в R$, а не «SOON».

## 10. Открой игру для всех

На странице игры в Creator Hub нажми **Make Public** (или **Settings → Privacy → Public**).
Готово — игру можно найти в поиске Roblox по названию.

## 11. Выйди из всех аккаунтов на этом компе

- Roblox Studio: значок профиля справа вверху → **Log Out**.
- create.roblox.com и github.com в браузере: профиль → **Sign out / Log Out**.
- Удали из «Загрузок» скачанные файлы и закрой Блокнот **без сохранения**.

---

### Потом, уже с телефона

- Править игру можно прямо на github.com (цены — `roblox/store.json`, баланс — `roblox/src/shared/Config.luau`).
  После влития в `main` GitHub сам выложит новую версию.
- Промокоды для соцсетей: `MOTO`, `RELEASE`, `VROOM` (меняются в `Config.luau`).
- Статистику смотри в Creator Hub → **Analytics**: удержание на следующий день (D1) и время в игре.
