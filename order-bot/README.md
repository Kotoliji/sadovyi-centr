# API сайта и кабинета (Cloudflare Worker + D1)

Что делает:
- отдаёт сайту каталог растений из базы;
- принимает заказы с сайта и сохраняет их в базу;
- обслуживает кабинет хозяйки `site/admin.html`: заказы (список, детали, статусы, заметки) и растения (добавление, правка, фото, скрытие, удаление);
- по желанию дублирует каждый новый заказ в Telegram.

Всё помещается в бесплатный тариф Cloudflare (Workers + D1). Фото уменьшаются в браузере до 1400 px и хранятся в той же базе.

## Где сейчас работает

- Сайт: https://sadovyi-centr.sadovyi-centr-api.workers.dev (Worker со статикой из `../site`, конфиг `site.wrangler.toml`)
- Кабинет: https://sadovyi-centr.sadovyi-centr-api.workers.dev/admin.html
- API: https://sadovyi-centr-api.sadovyi-centr-api.workers.dev (конфиг `wrangler.toml`, база D1 `sadovyi-centr`)

Выложить изменения:
```
npx wrangler deploy                          # API (src/worker.js)
npx wrangler deploy -c site.wrangler.toml    # сайт (папка ../site; _test.html исключён через .assetsignore)
```

## Запуск с нуля (если понадобится новый аккаунт)

Из этой папки:

```
npm install
npx wrangler login                          # откроется браузер: войти в Cloudflare и нажать Allow
npx wrangler d1 create sadovyi-centr        # выдаст database_id: вставить его в wrangler.toml
npx wrangler d1 execute DB --remote --file schema.sql
npx wrangler d1 execute DB --remote --file seed.sql     # 14 стартовых растений
npx wrangler secret put ADMIN_PASSWORD      # пароль хозяйки для входа в кабинет
npx wrangler deploy                         # выдаст адрес https://sadovyi-centr-api.<аккаунт>.workers.dev
```

Потом в `site/shared.js` прописать этот адрес в `API_BASE` (без `/` в конце) и выложить сайт.
Кабинет будет по адресу `https://kotoliji.github.io/sadovyi-centr/admin.html`.

### Telegram (необязательно)

1. В @BotFather выполнить `/newbot` и получить токен. Хозяйка открывает бота и нажимает «Start».
2. Узнать chat_id: открыть `https://api.telegram.org/bot<ТОКЕН>/getUpdates`, найти там `"chat":{"id": …}`.
3. Выполнить `npx wrangler secret put BOT_TOKEN` и `npx wrangler secret put CHAT_ID`. Несколько получателей перечисляются через запятую.

В сообщении о заказе будет ссылка «Відкрити в кабінеті».

## Локальная разработка

```
npx wrangler d1 execute DB --local --file schema.sql
npx wrangler d1 execute DB --local --file seed.sql
npm run dev        # API на http://127.0.0.1:8787, пароль и разрешённые адреса берутся из .dev.vars
```

## Защита

- Вход в кабинет по паролю. Сессия живёт 30 дней. После смены `ADMIN_PASSWORD` все старые входы сбрасываются.
- После 10 неверных паролей за 15 минут вход с этого IP блокируется.
- Заказы принимаются только с адресов из `ALLOWED_ORIGINS`. Скрытое поле-ловушка отсекает спам-ботов.
- Цены в заказе сервер берёт из базы, а не из браузера: подделать сумму нельзя.
- Если сайт переезжает на свой домен, добавьте его в `ALLOWED_ORIGINS` в `wrangler.toml` и выполните `npx wrangler deploy`.
