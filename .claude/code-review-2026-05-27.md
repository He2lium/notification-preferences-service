# Code Review — Notification Preferences Service

**Дата:** 2026-05-27
**Контекст:** полный аудит кодовой базы (NestJS 11, TypeORM, PostgreSQL)

---

## Критичные (Security / Data Loss)

### 1. `synchronize: true` без проверки окружения

**Файл:** `src/global/providers/type-orm.provider.ts:8-12`

```typescript
useFactory: (env: ConfigService) => ({
  type: 'postgres',
  // ...
  autoLoadEntities: true,
  synchronize: true,   // <-- дропнет/пересоздаст таблицы на проде
}),
```

**Почему плохо:** На production `synchronize: true` выполняет DDL без миграций — может дропнуть колонки, индексы, данные. В CLAUDE.md есть комментарий «dev only», но код этого не гарантирует.

**Исправление:** добавить проверку окружения:
```typescript
synchronize: env.get('NODE_ENV') !== 'production',
```

---

### 2. CORS `origin: true` + `credentials: true`

**Файл:** `src/main.ts:10`

```typescript
app.enableCors({ origin: true, credentials: true });
```

**Почему плохо:** `origin: true` зеркалит любой Origin в ответ. В комбинации с `credentials: true` любой сайт может делать авторизованные cross-origin запросы. OWASP классифицирует это как уязвимость.

**Исправление:** заменить на whitelist:
```typescript
app.enableCors({
  origin: env.get('CORS_ORIGINS')?.split(',') ?? [],
  credentials: true,
});
```

---

### 3. `DbService` глушит все ошибки в HTTP 409

**Файл:** `src/db/db.service.ts:18-25`

```typescript
catch (err) {
  console.error(err);
  await queryRunner.rollbackTransaction();
  if (err instanceof HttpException) throw err;
  throw new ConflictException(err);
}
```

**Почему плохо:**
- Constraint violation → 409 (должен быть 422/400)
- Connection error → 409 (должен быть 503)
- Serialization failure → 409 (должен быть 409 — но клиент должен иметь возможность retry)
- `console.error` — неструктурированное логирование
- Вызывающий код не может различить тип ошибки

**Исправление:** не заворачивать ошибки без необходимости. Если нужна кастомная обработка — различать `QueryFailedError`, `EntityNotFoundError` и т.д. Заменить `console.error` на Logger из `@nestjs/common`.

---

### 4. Поле `region` в JSON-конфигах, но не в entity

**Файлы:** `src/user/user.service.spec.ts:45`, `test/user.e2e-spec.ts:76`

В `DEFAULT_SETTINGS_JSON` и `fullSettings` (e2e) есть `"region":"ru"` / `region: 'eu'`. В `UserSettingsEntity` колонки `region` нет. Импорт `RegionEnum` в entity есть, а поля нет.

**Почему плохо:** данные `region` silently игнорируются. Если это нужно — поле отсутствует в схеме. Если не нужно — мёртвый код в конфигах и тестах.

**Исправление:** либо добавить `@Column({ type: 'enum', enum: RegionEnum })` в entity, либо удалить `region` из JSON и тестов.

---

## Архитектура и дизайн

### 5. `NotificationService` не экспортирован из модуля

**Файл:** `src/notification/notification.module.ts`

```typescript
@Module({
  imports: [UserModule],
  providers: [NotificationService],
  // нет exports: [NotificationService]
})
```

**Исправление:** добавить `exports: [NotificationService]`.

---

### 6. moment.js устарел

**Файл:** `src/notification/notification.service.ts:1`

Moment.js в maintenance mode с 2020. Команда moment рекомендует переходить на `luxon`, `date-fns` или нативный `Temporal`. Moment мутабельный (`utcOffset` меняет исходный объект) и не tree-shakeable (тянет всю локализацию).

**Исправление:** заменить на `luxon` (лучшая замена moment для работы с timezone) или `date-fns`.

---

### 7. `TIMEZONE_OFFSETS` в часах, а `timezone_offset` в минутах

**Файлы:** `src/global/constants/timezone-offsets.const.ts`, `src/user/entities/user-settings.entity.ts:30`

Константы: `Moscow: 3` (часы). Entity: `timezone_offset: number` с валидацией `@Min(-720) @Max(840)` (минуты). Если кто-то передаст константу напрямую — UTC+3 превратится в UTC+3min.

**Исправление:** привести константы к минутам:
```typescript
export const TIMEZONE_OFFSETS: Record<TimezoneEnum, number> = {
  [TimezoneEnum.Kaliningrad]: 120,
  [TimezoneEnum.Moscow]: 180,
  // ...
};
```

---

### 8. `UserSettingFieldsType` — нейминг префиксов путает

**Файл:** `src/global/types/user-setting-fields.type.ts`

```typescript
[K in NotificationKindEnum as `kind_${K}`]: boolean;       // kind_marketing — по kind
[K in NotificationChannelEnum as `channel_${K}`]: boolean; // channel_email — по channel
```

После вчерашнего фикса семантика правильная, но без контекста типа непонятно, что `kind_marketing` = разрешение на kind=marketing, а `channel_email` = разрешение на channel=email. Префиксы `kind_`/`channel_` совпадают с именами enum-ов, что сбивает.

**Исправление:** добавить JSDoc с примерами либо переименовать в `allow_kind_${K}` / `allow_channel_${K}`.

---

## Чистота кода

### 9. Неиспользуемые импорты и типы

| Файл | Импорт |
|---|---|
| `src/notification/notification.service.spec.ts:1` | `Test`, `TestingModule` |
| `src/notification/dto/notification-evaluation.dto.ts:6` | `IsDate` |
| `src/user/entities/user-settings.entity.ts:10` | `RegionEnum` |
| `src/user/user.service.ts:8` | `UserSettingsDto` |

Целые файлы без использования:
- `src/global/types/notification.type.ts` — `NotificationType`
- `src/global/types/key-of-class.type.ts` — `KeyOfClass`, `KeyOfOmitClass`, `KeyOfPartialClass`

---

### 10. `make_response` — snake_case в camelCase-проекте

**Файл:** `src/notification/notification.service.ts:64`

Везде camelCase, одна локальная функция в snake_case.

**Исправление:** `make_response` → `makeResponse`.

---

### 11. Венгерская нотация непоследовательна

**Файлы:** почти все

- `_env`, `_userService`, `_global_policies` — с подчёркиванием
- `_dbService`, `_default_settings`, `_settingsRepository`, `_usersRepository` — с подчёркиванием
- В NestJS конвенция — `private readonly` без подчёркивания (TS и так ограничивает доступ)

Либо убрать `_` везде, либо оставить везде. Сейчас где-то есть, где-то нет (например, `make_response` с `_` но это не поле класса).

---

### 12. `@IsNotEmpty()` на boolean полях DTO

**Файл:** `src/user/dto/origin/user-settings.dto.ts`

`@IsBoolean()` + `@IsNotEmpty()` на всех boolean полях. `false` проходит `@IsNotEmpty()`, но семантически комбинация странная — `@IsBoolean()` сам отвергает `null`/`undefined`/`string`.

---

### 13. `EnumProperty` дублирует валидацию

**Файл:** `src/notification/dto/notification-evaluation.dto.ts:9-14`

```typescript
const EnumProperty = (_enum: object) =>
  applyDecorators(
    ApiProperty({ type: String, enum: _enum }),
    IsNotEmpty(),   // избыточно — IsEnum уже отвергает пустые значения
    IsEnum(_enum),
  );
```

---

### 14. Тесты — только структурные, не поведенческие

**Файлы:** `src/db/db.service.spec.ts`, `src/user/user.controller.spec.ts`, `src/user/user.service.spec.ts`

Только `it('should be defined')` — проверяется, что DI контейнер создал инстанс. Нет тестов на:
- `DbService.transaction` (commit/rollback/release)
- `UserController.getById`, `upsertUser`, `deleteById`
- `UserService.upsert`, `delete`, транзакционную логику

---

### 15. `null as unknown as UserService` в `createService`

**Файл:** `src/notification/notification.service.spec.ts:15`

Старый хелпер передаёт `null` вместо `UserService`. Если кто-то случайно вызовет `evaluate` через сервис из `createService` — NPE в рантайме.

**Исправление:** унифицировать на `createServiceWithUser` или хотя бы передать `{ getById: jest.fn() }` как заглушку.

---

### 16. `UserDto.id` vs `UserIdDto.user_id` — inconsistent naming

**Файлы:** `src/user/dto/origin/user.dto.ts`, `src/global/dto/user-id.dto.ts`

Сущность пользователя: `id`. Параметр роута: `:user_id`. DTO для параметра: `user_id`. DTO для тела: `id`. В одном домене два имени для одного концепта.

**Исправление:** выбрать одно (`id`) и использовать везде. Роут переименовать с `:user_id` на `:id`.

---

### 17. `checkGeoPolicy` сигнатура vs вызовы в тестах

**Файл:** `src/notification/notification.service.ts:41`

Сигнатура: `checkGeoPolicy(datetime: string, ...)`. Тесты передают `new Date(...)`. 8 TypeScript-ошибок, которые проходят в рантайме только потому что `moment.utc()` принимает и `string`, и `Date`.

**Исправление:** привести тесты к `string` (как было сделано линтером — linter уже поправил).

---

## Сводка

| Severity | Кол-во | Ключевые |
|---|---|---|
| Critical | 4 | synchronize, CORS, DbService error swallowing, region mismatch |
| Architecture | 4 | exports, moment.js, timezone offsets, type naming |
| Clean code | 9 | imports, naming, tests, consistency |
