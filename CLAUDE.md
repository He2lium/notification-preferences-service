# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run start          # Start the server (default port 3000, configurable via PORT env var)
npm run start:dev      # Start with hot-reload
npm run build          # Compile TypeScript to dist/
npm run lint           # ESLint with auto-fix
npm run format         # Prettier format
```

## Testing

```bash
npm test               # Run unit tests (Jest, matches **/*.spec.ts in src/)
npm run test:watch     # Jest in watch mode
npm run test:cov       # Jest with coverage output to coverage/
npm run test:e2e       # E2E tests (matches test/*.e2e-spec.ts)
```

To run a single test file: `npx jest -- src/path/to/file.spec.ts`
To run a single e2e file: `npx jest --config test/jest-e2e.json -- test/path/to/file.e2e-spec.ts`

## Infrastructure

```bash
docker compose up -d   # Start PostgreSQL 17 on port from PG_PORT env var
```

Required environment variables (for TypeORM connection): `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`.

## Architecture

NestJS 11 with Express, PostgreSQL 17 via TypeORM, Swagger/OpenAPI docs.

- **Entry point**: `src/main.ts` — bootstraps `AppModule`, enables CORS, sets up global `ValidationPipe` (transform + whitelist), mounts Swagger at `/docs`.
- **Root module**: `src/app.module.ts` — imports `ConfigModule` (global), `TypeOrmModule` (async, custom provider), `UserModule`, `DbModule`, `NotificationModule`.

### Modules

| Module | Path | Purpose |
|---|---|---|
| `AppModule` | `src/app.module.ts` | Root; registers all modules, controllers, providers |
| `DbModule` | `src/db/db.module.ts` | Provides `DbService` — a transaction wrapper over TypeORM `DataSource` |
| `UserModule` | `src/user/user.module.ts` | User CRUD and notification preferences management |
| `NotificationModule` | `src/notification/notification.module.ts` | Shell module; types/enums for notification kinds and channels |

### TypeORM Connection

Custom async provider in `src/global/providers/type-orm.provider.ts`. Connection name: `notification-preferences-service-connection`. Reads `PG_*` env vars via `ConfigService`. Uses `autoLoadEntities: true` and `synchronize: true` (dev only — disable for production).

### Entities

- **`users`** (`src/user/entities/user.entity.ts`) — `id` (bigint PK), `createdAt`, `updatedAt`
- **`user_settings`** (`src/user/entities/user-settings.entity.ts`) — `user_id` (bigint PK/FK), `region`, `quiet_start`/`quiet_end` (time), `timezone_offset` (smallint), boolean columns for each channel (`channel_delivery_status`, `channel_marketing`, `channel_transactional`) and kind (`kind_email`, `kind_push`, `kind_sms`, `kind_telegram`, `kind_vk`)

### API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/user` | Create user (stub in `AppController`) |
| — | `/user` | UserController registered but empty |

Swagger docs available at `http://localhost:{PORT}/docs`.

### Global Types & Constants

- `src/global/types/region.enum.ts` — `RegionEnum` (EU, US, RU, CIS, ASIA, LATAM, MENA, AFRICA, OCEANIA)
- `src/global/types/timezone.enum.ts` — `TimezoneEnum` (Russian timezones from Kaliningrad to Kamchatka)
- `src/global/constants/timezone-offsets.const.ts` — UTC offset mapping for each timezone
- Path alias: `@global/*` → `./src/global/*` (configured in `tsconfig.json`)

### Notification Types

- `NotificationChannelEnum` — email, sms, push, telegram, vk
- `NotificationKindEnum` — transactional, marketing, delivery_status
- `NotificationType` — template literal combining kind and channel: `${kind}_${channel}`

## TypeScript & Tooling

- **Target**: ES2023, **module**: `nodenext` / `nodenext` resolution
- **Strictness**: `strictNullChecks` on, `noImplicitAny` off
- **Nest CLI** (`nest-cli.json`): source root is `src`, deletes `dist/` on each build
- **ESLint 9** flat config (`eslint.config.mjs`): TypeScript-ESLint recommended type-checked rules, Prettier integration. `no-explicit-any` is off.
- **Prettier**: single quotes, trailing commas everywhere
- **Jest 30**: configured in `package.json`, `rootDir` is `src`, transforms TS via `ts-jest`

## Port

The app listens on the `PORT` environment variable, defaulting to `3000` (`src/main.ts:23`).
