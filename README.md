# Notification Preferences Service

Сервис управления настройками уведомлений и проверки возможности отправки уведомления. Тестовое задание.

**Стек:** NestJS 11, TypeORM, PostgreSQL 17, Docker

---

## Быстрый старт

```bash
docker compose up --build
```

Команда делает полный цикл:
1. Запускает PostgreSQL 17
2. Собирает приложение (Dockerfile, multi-stage)
3. Прогоняет unit-тесты прямо в контейнере — билд упадёт, если тесты не прошли
4. Стартует приложение на [localhost:3000](http://localhost:3000)
5. Swagger UI: [localhost:3000/docs](http://localhost:3000/docs)

Приложение ждёт готовности PostgreSQL (healthcheck `pg_isready`) перед стартом.

После первого билда для перезапуска без пересборки:
```bash
docker compose up -d
```

---

## Локальный запуск (без Docker)

Если на машине есть Node.js 22+ и PostgreSQL 17:

```bash
# 1. Поднять только PostgreSQL
docker compose up -d postgres

# 2. Установить зависимости
npm install

# 3. Запустить в dev-режиме
npm run start:dev
```

Либо полностью без Docker — поднять PostgreSQL любым способом, создать `.env` в корне (пример уже есть) и запустить.

---

## Переменные окружения

В корне должен лежать `.env` (вот рабочий, т.к. это тестовое задание):

```bash
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=pnsdb
PG_USER=pns
PG_PASSWORD=eijapon6im7Boabo1YoGhavaiy5xohye

DEFAULT_SETTINGS_JSON={"quiet_start":"10:00:00","quiet_end":"18:00:00","timezone_offset":180,"channel_delivery_status":true,"channel_marketing":false,"channel_transactional":true,"kind_email":true,"kind_push":true,"kind_sms":false,"kind_telegram":false,"kind_vk":false}
GLOBAL_POLICIES_JSON=[{"regions":["oceania"]},{"regions":["eu"],"channels":["marketing"]},{"kinds":["sms"],"regions":["africa","mena"],"channels":["marketing","delivery_status"]}]
```

| Переменная | Назначение |
|---|---|
| `PORT` | Порт приложения (по умолчанию `3000`) |
| `PG_HOST` | Хост PostgreSQL |
| `PG_PORT` | Порт PostgreSQL |
| `PG_USER` | Пользователь БД |
| `PG_PASSWORD` | Пароль БД |
| `PG_DATABASE` | Имя БД |
| `DEFAULT_SETTINGS_JSON` | Настройки для новых пользователей (JSON) |
| `GLOBAL_POLICIES_JSON` | Глобальные правила блокировки уведомлений (JSON) |

---

## Тесты

### Unit

```bash
npm test              # один прогон
npm run test:watch    # watch-режим
npm run test:cov      # с coverage-отчётом
```

58 тестов, 5 suites. Покрывают `DbService`, `UserService`, `NotificationService` и контроллеры.

### E2E

```bash
# Поднять PostgreSQL (если ещё не поднята)
docker compose up -d postgres

# Запустить
npm run test:e2e
```

Тестирует полный цикл User API через HTTP: создание → чтение → обновление → удаление → 404.

---

## API

### User — `/user`

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/user/:user_id` | Получить пользователя с настройками |
| `PUT` | `/user` | Создать или обновить пользователя (идемпотентный) |
| `PATCH` | `/user/:user_id` | Частичное обновление настроек |
| `DELETE` | `/user/:user_id` | Удалить пользователя |

Новому пользователю без настроек подставляются значения из `DEFAULT_SETTINGS_JSON`.

### Notification — `/notification`

```
POST /notification/evaluate
```

Тело запроса:
```json
{
  "user_id": 1,
  "channel": "email",
  "kind": "marketing",
  "region": "eu",
  "datetime": "2026-01-01T12:00:00Z"
}
```

Ответ:
- `{ "decision": "allow" }` — 200
- `{ "decision": "deny", "reason": "blocked_by_quiet_policy" }` — 403

---

## Архитектура

```
POST /notification/evaluate
  → NotificationController
    → NotificationService.evaluate()
      1. UserService.getById()        — загружает настройки пользователя
      2. checkGlobalPolicy()          — глобальные правила по region/channel/kind
      3. checkGeoPolicy()             — quiet hours (часовой пояс пользователя)
      4. channel_* toggle             — пользовательский запрет канала
      5. kind_* toggle                — пользовательский запрет типа уведомления
      6. allow                        — всё прошло
```

Каскад останавливается на первом же запрете. Приоритет: **глобальные политики > quiet hours > channel > kind**.

### Модули

| Модуль | Назначение |
|---|---|
| `UserModule` | CRUD пользователей и настроек |
| `NotificationModule` | Проверка возможности отправки уведомления |
| `DbModule` | Обёртка над TypeORM-транзакциями с маппингом ошибок PostgreSQL |
| `MetricsModule` | In-memory счётчики и таймеры (`@Global`) |

### Сущности

- **`users`** — `id` (bigint PK), `createdAt`, `updatedAt`
- **`user_settings`** — `user_id` (bigint PK/FK), 3 `kind_*` и 5 `channel_*` флагов, `quiet_start`/`quiet_end` (time), `timezone_offset` (smallint)

### Логирование и метрики

- `NotificationService` логирует каждое решение allow/deny с контекстом (`user_id`, `channel`, `kind`, `reason`)
- `UserService` логирует изменения настроек
- `MetricsService` — in-memory счётчики (`increment`) и таймеры (`timing`). Один живой пример в `evaluate()`, остальные места размечены `TODO [Metrics]`

---

## Допущения

Это тестовое задание, поэтому:

- `synchronize: true` — автосоздание/изменение таблиц при старте (без миграций)
- `CORS: origin: true` — открытый CORS
- In-memory метрики — демонстрация паттерна, без персистентности
- `.env` закоммичен для простоты развёртывания
- Нет rate limiting, helmet, версионирования API

---

## Что доделать до продакшена

- [ ] **Миграции** — убрать `synchronize: true`, добавить TypeORM migrations
- [ ] **CORS** — `origin: true` → whitelist доменов
- [ ] **Rate limiting** — `@nestjs/throttler` на `/notification/evaluate`
- [ ] **Метрики** — `MetricsService` → Prometheus (`prom-client`)
- [ ] **Helmet** — security-заголовки
- [ ] **Health check** — эндпоинт `/health` для оркестратора
- [ ] **Secrets** — пароли из `.env` в secrets-manager
- [ ] **Структурированные логи** — JSON-формат для сборщика логов
- [ ] **Graceful shutdown** — обработка `SIGTERM` для закрытия коннектов к БД
- [ ] **E2E на notification** — расширить e2e на `/notification/evaluate`
- [ ] **Таймауты БД** — `statement_timeout` или TypeORM `maxQueryExecutionTime`
- [ ] **API versioning** — `/api/v1/...`
