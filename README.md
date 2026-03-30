# Minute93

Real-time football intelligence platform with live scores, historical stats, league standings, and player/team search.

Built as a distributed systems portfolio piece covering the Champions League, Premier League, and La Liga.

**Domain:** [minute93.com](https://minute93.com)

## Tech Stack

| Layer | Technology | Deployment |
|-------|-----------|------------|
| Frontend | Next.js 16 (App Router), React 19, shadcn/ui, Tailwind CSS 4 | Vercel |
| Backend API | NestJS 11 (TypeScript), behind Nginx reverse proxy | Render (Docker) |
| Poller Worker | Node.js background worker polling API-Football | Render (Background Worker) |
| Event Backbone | Kafka via Redpanda (Docker local / Redpanda Cloud prod) | Redpanda Cloud |
| Cache / Pub/Sub | Redis — cache-aside, rate limiting, pub/sub, deduplication | Docker local / Render Key Value prod |
| Database | PostgreSQL 16 | Docker local / Render Postgres prod |
| Data Source | [API-Football](https://api-football.com) (direct, not RapidAPI) | External API |
| Monitoring | Grafana Cloud + Prometheus metrics | Managed |
| Load Testing | k6 with 4 virtual user personas | Local/CI |

## Data Flow (Live Match Events)

```
API-Football → Poller → Redis dedup check → Kafka (match.events) → 4 NestJS consumers:
  1. CacheUpdater    → Redis (live scores)
  2. PostgresWriter  → Postgres (historical)
  3. StatsAggregator → Materialized view refresh
  4. SsePublisher    → Redis Pub/Sub → SSE endpoint → Browser
```

## Project Structure

```
Minute93/
├── client/                          → Next.js frontend
│   ├── app/                         → App Router pages
│   │   ├── matches/                 → Match listing + match detail ([id])
│   │   ├── teams/                   → Team grid + team detail ([id])
│   │   ├── players/[id]/            → Player detail with stats
│   │   ├── standings/               → League table with season selector
│   │   ├── top-scorers/             → Goal rankings with season selector
│   │   ├── search/                  → Fuzzy search (pg_trgm, 300ms debounce)
│   │   ├── login/ & signup/         → Email/password + Google OAuth
│   │   ├── profile/                 → User settings (team, timezone, password)
│   │   ├── about/                   → Project story + architecture
│   │   ├── article/                 → Engineering deep-dive
│   │   └── admin/analytics/         → Protected admin dashboard
│   ├── components/
│   │   ├── shared/                  → Navbar, footer, match-card, season-selector, etc.
│   │   └── ui/                      → 23 shadcn/ui components
│   ├── lib/                         → API client, auth context, utilities
│   └── public/                      → Static assets (logos, icons)
│
├── server/                          → NestJS backend API
│   ├── src/
│   │   ├── auth/                    → JWT + Google OAuth, guards, strategies
│   │   ├── match/                   → Match CRUD, filtering, SSE streaming
│   │   ├── league/                  → Standings + top scorers (materialized views)
│   │   ├── team/                    → Team CRUD + squad data
│   │   ├── player/                  → Player detail + event-based stats
│   │   ├── search/                  → Trigram fuzzy search (pg_trgm)
│   │   ├── kafka/                   → Producer + 4 independent consumers
│   │   ├── redis/                   → Cache-aside, pub/sub, dedup, rate limiting
│   │   ├── poller/                  → API-Football polling with dedup
│   │   ├── analytics/               → Admin dashboard, tracking middleware, daily snapshots
│   │   ├── metrics/                 → Prometheus metrics + interceptor
│   │   ├── common/                  → Exception filter, response interceptor, validation pipe, correlation IDs
│   │   └── config/                  → Database, Redis, Kafka, env validation
│   ├── database/
│   │   └── schema.sql               → Full schema (11 tables, 2 materialized views, 16 indexes)
│   ├── scripts/
│   │   ├── seed.ts                  → Data seeding from API-Football (upsert-safe, rate-limit-aware)
│   │   └── generate-article-data.ts → Article metrics generator
│   ├── nginx.conf                   → Reverse proxy, rate limiting, security headers, SSE passthrough
│   ├── Dockerfile                   → Production Docker image
│   └── docker-entrypoint.sh         → Container startup script
│
├── k6/                              → Load testing
│   ├── load-test.js                 → Main test (4 VU personas, weighted scenarios)
│   ├── spike-test.js                → Goal-moment spike simulation (500 → 2000 → 500 VUs)
│   ├── level1-test.js               → Level 1 sustained load test (45 min, 150 VUs)
│   ├── match-day-test.js            → Match day simulation (110 min, 3000-5000 VUs, 5 personas)
│   ├── scenarios/                   → Individual VU persona scripts
│   ├── helpers/                     → Shared test utilities
│   ├── post-test.ts                 → Results parser (stores to database)
│   └── results/                     → Test output storage
│
├── docs/                            → Documentation
│   ├── InitialPlan.md               → Full architecture blueprint, 5 phases, 15 steps
│   ├── EngineeringStandards.md      → Code quality rules for all contributors
│   └── guides/
│       ├── BUILD_LOG.md             → Complete build history + seeded data inventory
│       ├── DEPLOYMENT.md            → Production deployment checklist (Render, Vercel, Redpanda Cloud)
│       ├── LOAD_TESTING_AND_ARTICLE.md → k6 strategy, personas, thresholds, production testing
│       ├── REDIS_KAFKA_NGINX.md     → Plain-English explainer of infrastructure pillars
│       └── setup-guide.md           → External services setup (API-Football, Google OAuth, Grafana)
│
├── .claude/docs/                    → AI-assisted development documentation
│   ├── architectural_patterns.md    → Kafka fan-out, Redis patterns, SSE, Nginx, dedup, graceful degradation
│   ├── api-standards.md             → Response structure, HTTP codes, validation, pagination
│   ├── code-organization.md         → NestJS module structure, file naming, separation of concerns
│   ├── database-patterns.md         → Schema conventions, materialized views, indexing, migrations
│   ├── testing-strategy.md          → k6 approach, VU scenarios, thresholds
│   ├── production-setup.md          → Render + Redpanda Cloud deployment instructions
│   └── ai-development-log.md       → Session log for AI-assisted development
│
├── docker-compose.yml               → Local dev infrastructure (Postgres, Redis, Redpanda)
├── CLAUDE.md                        → AI agent entry point + project conventions
└── README.md                        → This file
```

## Seeded Data

| League | Seasons | Status |
|--------|---------|--------|
| Champions League | 2022-23, 2023-24, 2024-25, 2025-26 | 2022-2024 seeded, 2025 pending |
| Premier League | 2023-24, 2024-25, 2025-26 | Pending (seed after deploy) |
| La Liga | 2023-24, 2024-25, 2025-26 | Pending (seed after deploy) |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker
- npm

### 1. Clone and install

```bash
git clone https://github.com/azmainm/Minute93.git
cd Minute93

cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Start infrastructure

```bash
docker compose up -d    # Starts Postgres, Redis, Redpanda
```

### 3. Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

Edit both files with your credentials. See [setup-guide.md](docs/guides/setup-guide.md) for step-by-step instructions.

### 4. Initialize database

```bash
cd server
psql $DATABASE_URL -f database/schema.sql
```

### 5. Seed data (optional, requires API-Football key)

```bash
cd server
SEED_SEASON=2024 npx tsx scripts/seed.ts
```

### 6. Run development servers

```bash
# Terminal 1 — Backend
cd server && npm run start:dev

# Terminal 2 — Frontend
cd client && npm run dev
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
npm run seed           # Seed data from API-Football
```

### Client (Next.js)

```bash
cd client
npm run build          # Production build
npm run dev            # Dev server
npm run lint           # ESLint
```

### Load Testing (k6)

```bash
k6 run k6/load-test.js          # Standard load test (10 min, 50 VUs)
k6 run k6/level1-test.js        # Level 1 sustained test (45 min, 150 VUs)
k6 run k6/match-day-test.js     # Match day simulation (110 min, 3000+ VUs)
k6 run k6/spike-test.js         # Goal-moment spike simulation (500 → 2000 VUs)
```

## Documentation

| Document | Purpose |
|----------|---------|
| [Initial Plan](docs/InitialPlan.md) | Full architecture, feature set, 5-phase timeline |
| [Engineering Standards](docs/EngineeringStandards.md) | Code quality rules for all contributors (human + AI) |
| [Build Log](docs/guides/BUILD_LOG.md) | Complete inventory of everything built |
| [Deployment Guide](docs/guides/DEPLOYMENT.md) | Production deployment checklist |
| [Load Testing Guide](docs/guides/LOAD_TESTING_AND_ARTICLE.md) | k6 strategy, personas, thresholds |
| [Redis, Kafka & Nginx](docs/guides/REDIS_KAFKA_NGINX.md) | Plain-English infrastructure explainer |
| [Setup Guide](docs/guides/setup-guide.md) | External services configuration |

## Engineering Standards

All code must comply with the [Engineering Standards](docs/EngineeringStandards.md). This applies to both human-written and AI-generated code. See the document for conventions on code organization, error handling, naming, API design, logging, testing, and git workflow.

## Conventions

- **Commit messages:** Conventional commits — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **API responses:** Uniform shape: `{ success, data, error, message }`
- **Error handling:** Centralized via HttpExceptionFilter. No empty catches. No `console.log` in production.
- **File length:** Max 300-400 lines per file. Refactor if exceeded.
- **Naming:** Descriptive names, boolean prefixes (`is`, `has`, `should`, `can`), functions as verbs, `UPPER_SNAKE_CASE` for constants.
