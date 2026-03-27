# Minute93 — Complete Build Log

Everything that was built, end to end, for the Minute93 real-time football intelligence platform.

---

## 1. Infrastructure Layer

### PostgreSQL Database
- **Tables:** `leagues`, `teams`, `players`, `matches`, `match_events`, `match_lineups`, `users`, `analytics_events`, `load_test_runs`
- **Extensions:** `uuid-ossp` (user IDs), `pg_trgm` (fuzzy search)
- **Materialized Views:** `mv_standings` (league table computed from match results, grouped by season), `mv_top_scorers` (goal rankings from match events, grouped by season)
- **Indexes:** `idx_matches_season`, GIN trigram indexes on player/team names for fuzzy search
- **Schema file:** `server/database/schema.sql`

### Redis (4 Patterns)
- **Cache-aside:** Hot reads for live match data, standings, team info
- **Pub/Sub:** Bridge between Kafka consumers and SSE endpoint — match events published to `match:{id}:events` channels
- **Rate limiting:** Token bucket per IP/user for API throttling
- **Deduplication:** Redis Sets to ensure each match event from API-Football is processed exactly once
- **Config:** `server/src/redis/redis.service.ts`

### Kafka (via Redpanda)
- **Topic:** `match.events` (8 partitions)
- **Producer:** Poller worker publishes new match events after dedup check
- **4 Independent Consumer Groups:**
  1. `minute93-cache-updater` — Updates Redis cache with latest match state
  2. `minute93-postgres-writer` — Persists events to `match_events` table
  3. `minute93-stats-aggregator` — Refreshes materialized views (`mv_standings`, `mv_top_scorers`)
  4. `minute93-sse-publisher` — Publishes to Redis Pub/Sub for real-time browser push
- **Config:** `server/src/kafka/kafka.service.ts`

### Nginx Reverse Proxy
- Rate limiting as first defense layer (before NestJS)
- Proxy pass to NestJS API
- SSE-friendly configuration (no buffering, keepalive)

### Docker Compose (Local)
- PostgreSQL 16, Redis, Redpanda (Kafka-compatible), Redpanda Console
- `docker-compose.yml` at project root

---

## 2. Backend API (NestJS 11)

### Modules
| Module | Purpose | Key Files |
|--------|---------|-----------|
| `auth` | JWT auth, Google OAuth, signup/login, profile, password change | `auth.controller.ts`, `auth.service.ts`, `google.strategy.ts` |
| `match` | CRUD for matches, events, lineups, SSE streaming, live/results/schedule endpoints | `match.controller.ts`, `match.service.ts` |
| `team` | Team list, team detail (with players, recent/upcoming matches) | `team.controller.ts`, `team.service.ts` |
| `player` | Player detail with stats computed from match events | `player.controller.ts`, `player.service.ts` |
| `league` | Standings and top scorers from materialized views (filterable by season) | `league.controller.ts`, `league.service.ts` |
| `search` | PostgreSQL trigram fuzzy search across players and teams | `search.controller.ts`, `search.service.ts` |
| `analytics` | Admin dashboard — overview, geography, engagement, features, incidents, load tests | `analytics.controller.ts`, `analytics.service.ts` |
| `kafka` | Kafka producer/consumer management, 4 consumer groups | `kafka.service.ts` |
| `redis` | Redis connection, cache-aside helpers, pub/sub | `redis.service.ts` |
| `poller` | Cron-based API-Football poller with configurable season/league/interval | `poller.service.ts` |
| `metrics` | Prometheus metrics endpoint (`/metrics`) | `metrics.service.ts`, `prometheus.interceptor.ts` |

### API Endpoints
```
GET  /health                     Health check
POST /auth/signup                Email/password signup
POST /auth/login                 Email/password login
GET  /auth/me                    Current user (JWT)
PATCH /auth/profile              Update profile (name, favorite_team, timezone)
PATCH /auth/change-password      Change password
GET  /auth/google                Google OAuth initiate
GET  /auth/google/callback       Google OAuth callback

GET  /matches                    All matches
GET  /matches/live               Live matches only
GET  /matches/results            Finished matches (paginated, season filter)
GET  /matches/schedule           Scheduled matches (paginated, season filter)
GET  /matches/:id                Match detail with events + lineups
GET  /matches/:id/events         Match events only
GET  /matches/:id/stream         SSE live event stream

GET  /teams                      All teams
GET  /teams/:id                  Team detail (team, players, recent/upcoming matches)

GET  /players/:id                Player detail (player, stats, recent events)

GET  /standings?season=          League standings from materialized view
GET  /top-scorers?season=&limit= Top scorers from materialized view

GET  /search?q=                  Fuzzy search (trigram) across players and teams

GET  /admin/analytics/overview   Admin dashboard overview
GET  /admin/analytics/geography  Geographic distribution
GET  /admin/analytics/engagement User engagement metrics
GET  /admin/analytics/features   Feature usage stats
GET  /admin/analytics/snapshots  System snapshots
GET  /admin/analytics/incidents  Incident log
GET  /admin/analytics/load-tests Load test results

POST /admin/incidents            Report an incident

GET  /metrics                    Prometheus metrics
```

### Uniform Response Shape
Every endpoint returns: `{ success: boolean, data: T, error?: string, message?: string }`

### Prometheus Metrics
- `http_request_duration_seconds` — Histogram by method/route/status
- `http_requests_total` — Counter by method/route/status
- `poller_cycle_duration_seconds` — Histogram
- `redis_cache_hits_total` / `redis_cache_misses_total` — Counters
- `kafka_messages_produced_total` / `kafka_messages_consumed_total` — Counters by topic/group
- `active_sse_connections` — Gauge
- `kafka_consumer_lag_ms` — Gauge by consumer group

### Data Flow (Live Match Events)
```
API-Football → Poller (cron) → Redis dedup check → Kafka [match.events]
  ├─ CacheUpdater   → Redis (live scores, TTL-based)
  ├─ PostgresWriter  → match_events table
  ├─ StatsAggregator → REFRESH MATERIALIZED VIEW CONCURRENTLY
  └─ SsePublisher   → Redis Pub/Sub → SSE Controller → Browser EventSource
```

---

## 3. Frontend (Next.js 16, App Router)

### Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, feature grid, architecture highlight, CTA |
| `/matches` | Match listing with tabs (Live, Upcoming, Results), season filter on Results |
| `/matches/[id]` | Match detail — scoreboard, event timeline, lineups |
| `/standings` | League standings table with season selector |
| `/top-scorers` | Goal rankings with season selector |
| `/teams` | Team grid grouped by UCL group |
| `/teams/[id]` | Team detail — squad, recent matches, upcoming fixtures |
| `/players/[id]` | Player detail — stats grid (goals, assists, cards) |
| `/search` | Fuzzy search with 300ms debounce |
| `/login` | Email/password + Google OAuth login |
| `/signup` | Email/password + Google OAuth signup |
| `/profile` | Profile management — searchable team combobox, timezone picker, password change |
| `/about` | Story, builder bio, architecture highlights, tech stack |
| `/article` | Engineering deep-dive article (placeholder for final write-up) |
| `/admin/analytics` | Admin dashboard (protected) |

### Shared Components
- `Navbar` — Responsive with mobile sheet, auth state, admin link
- `MatchCard` — Reusable match display with team logos, scores, status badges
- `PageHeader` — Consistent page titles with icons
- `SeasonSelector` — Dropdown for season filtering
- `EmptyState` / `ErrorMessage` — Consistent empty/error states

### UI Stack
- **shadcn/ui** components: Button, Card, Badge, Tabs, Select, Command (combobox), Popover, Table, Dialog, Sheet, Skeleton, Input, Separator, ScrollArea, Tooltip, Accordion, Avatar, Spinner
- **Tailwind CSS** with rose primary, zinc neutrals
- **Lucide React** icons throughout
- **Sonner** for toast notifications
- **Google OAuth** SVG icon component

### Auth
- JWT stored in localStorage
- `AuthProvider` context with `useAuth()` hook
- `login()`, `logout()`, `refreshUser()` methods
- Protected routes redirect to `/login` when unauthenticated
- Admin routes check `isAdmin` flag

---

## 4. Data Seeding

### Seed Script (`server/scripts/seed.ts`)
- Fetches from API-Football: leagues → teams → fixtures → players
- Configurable via env vars: `SEED_SEASON`, `ACTIVE_LEAGUES`, `API_FOOTBALL_KEY`
- Respects rate limits: 6.5s between requests, aborts on daily/minute limit errors
- Upsert logic (ON CONFLICT) — safe to re-run

### Seeded Data (as of build)
| Season | Teams | Matches | Players |
|--------|-------|---------|---------|
| UCL 2024-25 | 81 | 279 | ✓ |
| UCL 2023-24 | 78 | 214 | ✓ |
| UCL 2022-23 | 78 | 214 | ✓ |

**Totals:** 145 teams, 707 matches, 2,934 players across 3 seasons. 96/145 teams have full squad data — remaining teams can be filled by re-running the seed script when the daily API limit resets.

### To Seed More Data
```bash
cd server
npx tsx scripts/seed.ts                      # Re-run to fill missing players (uses upsert)
SEED_SEASON=2025 npx tsx scripts/seed.ts     # Seed a new season (requires API-Football Pro for 2025+)
```

---

## 5. Poller Worker

- Cron-based polling of API-Football for live match data
- Configurable: `POLL_SEASON` (default 2024), `ACTIVE_LEAGUES` (default 2 = UCL), `POLL_INTERVAL_LIVE` (30s), `POLL_INTERVAL_IDLE` (5min)
- Deduplicates events via Redis SADD before publishing to Kafka
- Runs as part of the NestJS process (uses `@nestjs/schedule`)

---

## 6. Monitoring & Observability

### Prometheus Metrics
- Exposed at `GET /metrics`
- Custom metrics: HTTP duration/count, cache hits/misses, Kafka produced/consumed, SSE connections, consumer lag
- Default Node.js metrics (event loop lag, heap, GC)

### Grafana Cloud
- Scrapes `/metrics` endpoint
- Dashboards for: API latency, error rates, cache performance, Kafka throughput, SSE connections

### Structured Logging
- All logging via NestJS `Logger` (no `console.log` in production)
- Log levels: ERROR, WARN, LOG (info), DEBUG
- Context-tagged: `[PollerService]`, `[KafkaService]`, `[AuthService]`, etc.

---

## 7. k6 Load Testing

### Test Files (`k6/` directory)
| File | Purpose |
|------|---------|
| `load-test.js` | Main load test — 4 scenarios weighted by VU percentage |
| `spike-test.js` | Goal spike simulation — 500 → 2000 burst → 500 |
| `post-test.ts` | Parses k6 JSON output, stores results in `load_test_runs` table |
| `scenarios/casual-viewer.js` | 60% of VUs — browse live matches, stay on page, check standings |
| `scenarios/explorer.js` | 25% of VUs — standings → team pages → squad |
| `scenarios/searcher.js` | 10% of VUs — simulated keystroke search |
| `scenarios/power-user.js` | 5% of VUs — all features, long session |
| `helpers/config.js` | BASE_URL, thresholds (p95 < 500ms, error rate < 1%) |
| `helpers/geo.js` | Weighted random country codes for geographic simulation |

### Thresholds
- p95 response time < 500ms
- p99 response time < 2000ms
- Error rate < 1%

---

## 8. Production Deployment

| Component | Platform | Config |
|-----------|----------|--------|
| Frontend | Vercel | Auto-deploy from main |
| Backend API | Render (Docker) | `Dockerfile`, env vars |
| PostgreSQL | Render Postgres | Internal networking |
| Redis | Render Key Value | Internal networking |
| Kafka | Redpanda Cloud | SASL/SSL auth |
| Monitoring | Grafana Cloud | Prometheus scrape |

Full deployment instructions: `docs/guides/DEPLOYMENT.md`

---

## 9. Security

- **Nginx rate limiting** — First defense layer
- **NestJS ThrottlerGuard** — Per-user/IP granularity
- **JWT authentication** — bcrypt password hashing, configurable expiry
- **Google OAuth 2.0** — Passport strategy
- **CORS** — Origin validation
- **Input validation** — class-validator DTOs on all endpoints
- **No secrets in code** — All sensitive config via environment variables
- **HttpExceptionFilter** — Centralized error handling, no stack traces in production

---

## 10. Key Technical Decisions

1. **Snake_case everywhere** — TypeORM entities use snake_case matching Postgres columns. Frontend types mirror this exactly. No camelCase conversion layer.
2. **SSE over WebSocket** — Unidirectional, auto-reconnecting, no protocol upgrade, simpler debugging.
3. **Materialized views for standings** — Pre-computed, refreshed concurrently by Kafka consumer. Reads are instant.
4. **Trigram search over Elasticsearch** — pg_trgm + GIN index handles fuzzy matching well for our dataset size. No extra infrastructure.
5. **4 independent Kafka consumers** — If one fails, others continue. Loose coupling, easy to add/remove consumers.
6. **Redis Pub/Sub for SSE bridge** — Decouples Kafka consumer from HTTP layer. Multiple API instances can serve SSE from the same Pub/Sub channel.
7. **Single-endpoint match detail** — `GET /matches/:id` returns match + events + lineups in one response. Fewer round trips.
