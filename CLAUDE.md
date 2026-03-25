# Minute93

Real-time football intelligence platform — live scores, historical stats, league standings, and player/team search. Built as a distributed systems portfolio piece targeting the Champions League 2025-26 season.

**Domain:** minute93.com
**Engineering standards:** ALL code must comply with `docs/EngineeringStandards.md`. No exceptions for AI-generated code.

## Tech Stack

| Layer | Technology | Deployment |
|-------|-----------|------------|
| Frontend | Next.js 16 (App Router), shadcn/ui, Tailwind | Vercel |
| Backend API | NestJS 11 (TypeScript), behind Nginx reverse proxy | Render (Docker) |
| Poller Worker | Node.js background worker | Render (Background Worker) |
| Event Backbone | Kafka via Redpanda (local Docker / Redpanda Cloud prod) | Redpanda Cloud |
| Cache / Pub/Sub | Redis — 4 patterns: cache-aside, rate limiting, pub/sub, dedup | Docker local / Render Key Value prod |
| Database | PostgreSQL 16 | Docker local / Render Postgres prod |
| Data Source | API-Football (api-football.com, NOT RapidAPI) | External API |
| Monitoring | Grafana Cloud + Prometheus metrics | Managed |
| Load Testing | k6 | Local/CI |

## Key Directories

```
client/              → Next.js frontend (App Router, shadcn/ui)
server/              → NestJS backend API
server/src/          → NestJS source (modules: auth, match, search, analytics, kafka, redis)
docs/                → Project plan (InitialPlan.md) and engineering standards (EngineeringStandards.md)
docs/prompts/        → Prompt templates used for AI-assisted development
```

## Build & Test Commands

### Server (NestJS)
```bash
cd server
npm run build          # Compile TypeScript
npm run start:dev      # Dev server with hot reload
npm run lint           # ESLint
npm run test           # Unit tests (Jest)
npm run test:e2e       # End-to-end tests
```

### Client (Next.js)
```bash
cd client
npm run build          # Production build
npm run dev            # Dev server
npm run lint           # ESLint
```

## Conventions

- **Commit messages:** Conventional commits — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **Branch naming:** `type/description` — e.g., `feat/user-authentication`
- **API responses:** Uniform shape: `{ success, data, error, message }`
- **Error handling:** Centralized via HttpExceptionFilter. No empty catches. No `console.log` in production.
- **File length:** Max 300-400 lines per file. Refactor if exceeded.
- **Naming:** Descriptive names, boolean prefixes (`is`, `has`, `should`, `can`), functions as verbs, `UPPER_SNAKE_CASE` for constants.

## Data Flow (Live Match Events)

```
API-Football → Poller → Redis dedup check → Kafka (match.events) → 4 NestJS consumers:
  1. CacheUpdater → Redis (live scores)
  2. PostgresWriter → Postgres (historical)
  3. StatsAggregator → Materialized view refresh
  4. SsePublisher → Redis Pub/Sub → SSE endpoint → Browser
```

## Documentation Index

Check these files when working on specific areas:

- `.claude/docs/architectural_patterns.md` — Kafka consumers, Redis patterns, SSE via Pub/Sub, Nginx reverse proxy, cache-aside, deduplication
- `.claude/docs/api-standards.md` — API response structure, HTTP status codes, validation, pagination, error handling
- `.claude/docs/code-organization.md` — NestJS module structure, file naming, separation of concerns
- `.claude/docs/database-patterns.md` — Schema conventions, materialized views, migrations, indexing
- `.claude/docs/testing-strategy.md` — k6 load testing approach, scenarios, thresholds
- `.claude/docs/production-setup.md` — Render Postgres, Render Redis, Redpanda Cloud deployment instructions
- `.claude/docs/ai-development-log.md` — Session log for AI-assisted development (update at start and end of every session)

## Local Development

```bash
docker compose up -d    # Start Postgres + Redis + Redpanda
cd server && npm run start:dev
cd client && npm run dev
```

All infrastructure runs in Docker locally. No external services needed for development (except API-Football for seeding data).

## Production Deployment

When deploying or configuring env vars on Render, refer to `.claude/docs/production-setup.md` for complete instructions. Production uses:
- **Render Postgres** (internal networking)
- **Render Key Value / Redis** (internal networking)
- **Redpanda Cloud** (only external third-party service, SASL/SSL)

## Update Discipline

- Update this file whenever significant changes are made to codebase structure, tooling, or conventions.
- Update `.claude/docs/ai-development-log.md` at the start and end of every Claude Code session.
- Read `docs/EngineeringStandards.md` before writing any code.
