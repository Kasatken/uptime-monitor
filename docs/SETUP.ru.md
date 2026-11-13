# Как запустить Vigil и подключить свои сервисы

Пошаговая инструкция: от пустого сервера до уведомлений в Telegram.

## 1. Где запускать

Важно: **не запускайте Vigil на том же сервере, который он проверяет.** Если этот VPS упадёт, мониторинг упадёт вместе с ним и никого не предупредит. Подойдёт:

- второй самый дешёвый VPS у другого провайдера (лучше всего);
- домашний сервер или Raspberry Pi;
- на худой конец тот же VPS, но тогда добавьте внешний heartbeat (см. раздел 6), чтобы узнать, если умер сам Vigil.

Нужно: Linux, Node.js 24+, домен или поддомен (например, `status.example.com`), направленный на сервер.

## 2. Установка

```bash
git clone https://github.com/Kasatken/vigil-uptime.git /opt/vigil
cd /opt/vigil
npm ci
cp apps/api/.env.example apps/api/.env
```

Сгенерируйте секреты:

```bash
openssl rand -base64 24   # пароль администратора
openssl rand -base64 32   # JWT_SECRET
```

Откройте `apps/api/.env` и заполните:

```dotenv
NODE_ENV=production
APP_URL=https://status.example.com
ADMIN_PASSWORD=<первая строка>
JWT_SECRET=<вторая строка>
STATUS_PAGE_TITLE=Статус моих сервисов
```

В режиме `production` приложение **не запустится**, если оставить значения из примера, пароль короче 12 символов или `APP_URL` без https. Это защита от случайного выкладывания «как есть».

Соберите:

```bash
npm run build
```

Данные по умолчанию хранятся в `apps/api/.data/pglite` (встроенный Postgres, отдельно ставить ничего не нужно). Если у вас уже есть Postgres, укажите `DATABASE_URL=postgres://user:pass@host:5432/vigil`, миграции применятся сами.

## 3. Автозапуск через systemd

Создайте пользователя и сервис:

```bash
sudo useradd --system --home /opt/vigil vigil
sudo chown -R vigil:vigil /opt/vigil
sudo nano /etc/systemd/system/vigil.service
```

```ini
[Unit]
Description=Vigil uptime monitor
After=network-online.target
Wants=network-online.target

[Service]
User=vigil
WorkingDirectory=/opt/vigil/apps/api
ExecStart=/usr/bin/node --env-file=.env --enable-source-maps dist/main.js
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/vigil/apps/api/.data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vigil
journalctl -u vigil -f        # логи
```

## 4. HTTPS через Caddy

Caddy сам получит сертификат Let's Encrypt и проксирует WebSocket без дополнительных настроек.

```bash
sudo apt install caddy
sudo nano /etc/caddy/Caddyfile
```

```caddy
status.example.com {
	reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

Закройте порт 3000 снаружи, наружу должны смотреть только 80 и 443:

```bash
sudo ufw allow 22,80,443/tcp
sudo ufw enable
```

Caddy должен работать **на той же машине**: приложение доверяет заголовку `X-Forwarded-For` только от localhost, иначе ограничение попыток входа будет считать всех одним пользователем.

Теперь:

- `https://status.example.com` — публичная страница статуса;
- `https://status.example.com/admin` — панель (пароль из `ADMIN_PASSWORD`).

## 5. Уведомления в Telegram

Vigil пишет в Telegram, когда монитор упал и когда снова заработал (со временем простоя).

1. Откройте [@BotFather](https://t.me/BotFather), отправьте `/newbot`, придумайте имя. Скопируйте токен вида `123456:ABC...`.
2. Напишите своему боту любое сообщение (например, `/start`). Без этого бот не сможет вам писать.
3. Узнайте свой chat id: откройте в браузере
   `https://api.telegram.org/bot<ТОКЕН>/getUpdates`
   и найдите `"chat":{"id":123456789`. Это число и есть chat id.
   Чтобы уведомления шли в группу, добавьте бота в группу, напишите там что-нибудь и возьмите id из того же ответа (у групп он отрицательный, например `-1001234567890`).
4. Добавьте в `apps/api/.env`:

   ```dotenv
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_CHAT_ID=123456789
   ```

5. Перезапустите: `sudo systemctl restart vigil`. В логах появится строка `Alert channels: telegram`.

Проверка: создайте TCP-монитор на заведомо закрытый порт (например, `127.0.0.1:5999`, «Тревога после» = 1). Через минуту придёт сообщение «🔴 … не работает». Потом удалите монитор.

Slack, Discord или свой бот: укажите `ALERT_WEBHOOK_URL`, Vigil отправит туда JSON с полями `text` (Slack) и `content` (Discord).

## 6. Подключаем свои сервисы

Все мониторы добавляются в панели кнопкой «Новый монитор» (или клавишей `N`).

### Сайты

Тип «Сайт или API».

- **Адрес:** главная страница или, лучше, специальный адрес проверки (`/health`, `/api/ping`), если он есть.
- **Страница должна содержать** (в дополнительных настройках): текст, который есть только на рабочей странице, например название магазина в футере. Это ловит случаи, когда сервер отвечает 200, но показывает ошибку или пустую заглушку.
- **Медленно, если дольше:** например, 1500 мс. Монитор станет жёлтым, а не красным.
- Срок SSL-сертификата проверяется сам: за 7 дней до истечения монитор станет жёлтым.

### VPS

Тип «TCP-порт»: `ваш-сервер:22` (SSH), `:5432` (Postgres), `:443` и так далее. Проверяется, что порт принимает соединения.

### Cron-задачи и бэкапы

Тип «Cron-задача». После создания на странице монитора появится адрес вида
`https://status.example.com/api/heartbeat/<токен>` и готовая строка для crontab.

Главное, ставить вызов через `&&`, чтобы сигнал уходил **только при успехе**:

```cron
0 3 * * *  /opt/scripts/backup.sh && curl -fsS -m 10 --retry 3 https://status.example.com/api/heartbeat/<токен> > /dev/null
```

Если сигнал не придёт за интервал плюс «допустимую задержку», придёт тревога.

Чтобы следить за самим Vigil, заведите бесплатный внешний heartbeat-сервис (например, healthchecks.io) и пингуйте его из cron, только если Vigil отвечает:

```cron
*/5 * * * *  curl -fsS -m 10 https://status.example.com/api/health > /dev/null && curl -fsS -m 10 https://hc-ping.com/<ваш-uuid> > /dev/null
```

### Публичная страница

У каждого монитора есть переключатель «Показывать на странице статуса» и поле «Публичное название». Посетители видят только название, статус и аптайм. Адреса, хосты и тексты ошибок не показываются никогда.

## 7. Безопасность: короткий чек-лист

- [ ] Только HTTPS (`APP_URL=https://…`), Caddy перед приложением на той же машине.
- [ ] Порт 3000 закрыт файрволом.
- [ ] Длинный случайный `ADMIN_PASSWORD` и `JWT_SECRET`, `.env` не попадает в git (он в `.gitignore`).
- [ ] Адрес heartbeat — это секрет: кто знает токен, может «отмечать» задачу. Не публикуйте его.
- [ ] Выйти со всех устройств: смените `JWT_SECRET` и перезапустите сервис.
- [ ] Резервная копия: остановите сервис и скопируйте `apps/api/.data/pglite` (или делайте `pg_dump`, если используете Postgres).

## 8. Обновление

```bash
cd /opt/vigil
git pull
npm ci
npm run build
sudo systemctl restart vigil
```

Миграции базы применяются автоматически при запуске.
