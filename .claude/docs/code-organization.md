# Code Organization

## Project Structure

```
Minute93/
├── client/          → Next.js 16 frontend (Vercel)
├── server/          → NestJS 11 backend API (Render, Docker + Nginx)
├── docs/            → Project plan, engineering standards, prompts
├── CLAUDE.md        → AI agent entry point
└── .claude/docs/    → Detailed documentation for AI agents
```

The client and server are **separate projects** with independent dependency trees. They deploy to different platforms (Vercel vs Render) and communicate via HTTP API calls.

## NestJS Module Structure (server/src/)

```
server/src/
├── main.ts
├── app.module.ts                  → Root module, imports all feature modules
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts         → POST /auth/signup, /login, /google
│   ├── auth.service.ts            → JWT signing, bcrypt, password reset
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── admin.guard.ts
│   └── strategies/
│       ├── jwt.strategy.ts
│       └── google.strategy.ts
├── match/
│   ├── match.module.ts
│   ├── match.controller.ts        → GET /matches, /matches/:id, /matches/live
│   ├── match.service.ts
│   └── match.gateway.ts           → SSE endpoint for live events
├── search/
│   ├── search.module.ts
│   ├── search.controller.ts       → GET /search?q=
│   └── search.service.ts          → pg_trgm queries
├── analytics/
│   ├── analytics.module.ts
│   ├── analytics.controller.ts    → GET /admin/analytics/*, POST /admin/incidents
│   ├── analytics.service.ts
│   ├── tracking.middleware.ts     → Logs every request to analytics_events
│   └── snapshot.service.ts        → Daily snapshot @Cron task
├── kafka/
│   ├── kafka.module.ts
│   ├── kafka.service.ts           → Producer + consumer setup
│   └── consumers/
│       ├── cache-updater.consumer.ts
│       ├── postgres-writer.consumer.ts
│       ├── stats-aggregator.consumer.ts
│       └── sse-publisher.consumer.ts
├── redis/
│   ├── redis.module.ts
│   └── redis.service.ts           → Wraps all 4 Redis patterns
├── common/
│   ├── interceptors/
│   │   └── prometheus.interceptor.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── pipes/
│       └── validation.pipe.ts
└── config/
    ├── database.config.ts
    ├── redis.config.ts
    ├── kafka.config.ts
    └── competition.config.ts      → ACTIVE_LEAGUES env var
```

## File Naming Conventions

### NestJS (server/)
Follow NestJS conventions exactly:
- `{feature}.module.ts` — Module definition
- `{feature}.controller.ts` — HTTP route handlers
- `{feature}.service.ts` — Business logic
- `{feature}.guard.ts` — Route guards
- `{feature}.strategy.ts` — Passport strategies
- `{feature}.middleware.ts` — Express middleware
- `{feature}.interceptor.ts` — NestJS interceptors
- `{feature}.filter.ts` — Exception filters
- `{feature}.pipe.ts` — Validation pipes
- `{feature}.dto.ts` — Data transfer objects
- `{feature}.entity.ts` — Database entities
- `{feature}.spec.ts` — Unit tests (co-located)

### Next.js (client/)
Follow Next.js App Router conventions:
- `page.tsx` — Route page component
- `layout.tsx` — Route layout
- `loading.tsx` — Loading UI
- `error.tsx` — Error boundary
- `not-found.tsx` — 404 page
- Components go in `client/components/`
- Shared utilities go in `client/lib/`

## Separation of Concerns

| Layer | Responsibility | Example |
|-------|---------------|---------|
| Controller | HTTP handling, input parsing, response formatting | `match.controller.ts` |
| Service | Business logic, data orchestration | `match.service.ts` |
| Repository/Entity | Database access, query building | TypeORM entities or raw queries |
| DTO | Request/response shape validation | `create-user.dto.ts` |
| Guard | Authentication and authorization | `jwt-auth.guard.ts` |
| Filter | Error transformation | `http-exception.filter.ts` |
| Interceptor | Cross-cutting concerns (logging, metrics) | `prometheus.interceptor.ts` |
| Middleware | Request preprocessing | `tracking.middleware.ts` |

**Rules:**
- Controllers never contain business logic or database queries.
- Services never import `@Req()` or `@Res()` — they're HTTP-agnostic.
- Config values are accessed via NestJS `ConfigService`, never `process.env` directly in services.
- Barrel exports (`index.ts`) for clean import paths within each module.
