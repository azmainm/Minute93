# AI Development Log

Living document tracking how AI coding tools (Claude Code) are used in building Minute93. Each session is logged with date, prompt technique, objectives, and outcomes. This file will be referenced in the final technical article to demonstrate AI-assisted development practices.

---

## Session 1 — 2026-03-25

**Prompt technique:** ROGE (Role, Objective, Guidelines, Execution)

**Objectives:**
- Analyze the full project plan (InitialPlan.md) and engineering standards (EngineeringStandards.md)
- Present a high-level development plan with dependencies and critical path
- Provide external service setup instructions (API-Football, Upstash Kafka/Redis, Google OAuth, Grafana Cloud, Postgres)
- Define `.env` templates for server and client
- Create `CLAUDE.md` and `.claude/docs/` documentation files

**Outcomes:**
- Read and analyzed both documents end-to-end (~1,300 lines of project plan + ~208 lines of engineering standards)
- Identified discrepancies: plan references `apps/api/` and `apps/web/` but actual structure is `server/` and `client/`; plan says Next.js 14 but project uses Next.js 16; domain corrected from `minute93.live` to `minute93.com`
- Recommended keeping `server/`/`client/` structure over monorepo `apps/` — separate deployments, separate dependency trees
- Produced phased development plan with 5 phases, 15 steps, and identified critical path
- Provided step-by-step setup instructions for all external services
- Defined complete `.env` and `.env.local` templates with comments
- Created `CLAUDE.md` (root-level AI agent entry point, under 150 lines)
- Created 6 documentation files in `.claude/docs/`: architectural patterns, API standards, code organization, database patterns, testing strategy, and this development log

**Decisions made:**
- Keep `server/` and `client/` directory names (not `apps/api/` and `apps/web/`)
- Domain is `minute93.com` (corrected from plan's `minute93.live`)
- No monorepo tooling needed — projects are independently deployable
- Next.js 16 requires reading `node_modules/next/dist/docs/` before writing frontend code due to breaking changes

**AI tool configuration:**
- Claude Code (CLI) with ROGE prompt structure
- First prompt was analysis-only (no code generated)
- CLAUDE.md + .claude/docs/ created as progressive disclosure documentation for future AI sessions

---

## Session 2 — 2026-03-25

**Prompt technique:** Direct task execution with checklist-style prompt (prompt-redis-kafka-setup.md)

**Objectives:**
- Build the complete NestJS backend foundation (auth, matches, teams, players, search, leagues, standings)
- Replace Upstash (Kafka REST + Redis) with Docker-local infrastructure (PostgreSQL + Redis + Redpanda)
- Create docker-compose.yml for local dev with health checks and persistent volumes
- Update NestJS Redis config to use ioredis (direct connection) instead of Upstash REST
- Update NestJS Kafka config to use kafkajs (direct connection) with environment-aware SASL/SSL
- Create production deployment documentation (Render + Redpanda Cloud)
- Update all existing docs to remove Upstash references

**Outcomes:**
- Built 6 feature modules: AuthModule, MatchModule, TeamModule, PlayerModule, SearchModule, LeagueModule
- Created RedisModule with ioredis supporting all 4 architectural patterns (cache-aside, pub/sub, dedup, rate limiting)
- Created KafkaModule with kafkajs supporting environment-aware config (plain TCP locally, SASL/SSL in production)
- Built docker-compose.yml with PostgreSQL 16, Redis 7, and Redpanda (Kafka API on port 19092)
- Created database schema (11 tables, trigram indexes, materialized view support)
- Created common infrastructure: HttpExceptionFilter, ResponseInterceptor, CorrelationIdMiddleware, ValidationPipe, PaginationDto
- Created `.claude/docs/production-setup.md` with Render Postgres, Render Redis, Redpanda Cloud instructions
- Updated CLAUDE.md, architectural_patterns.md, setup-guide.md to remove all Upstash references
- Resolved multiple issues: nested .git directories, .gitignore blocking .env.example, JWT type compatibility, pg volume user mismatch

**Decisions made:**
- Work on main branch with frequent small commits (user preference, not feature branches)
- Use ioredis over @upstash/redis for direct Redis connection (lower latency, supports pub/sub)
- Use kafkajs over @upstash/kafka for direct Kafka connection (supports consumer groups, real-time)
- Local dev uses Docker Compose; production uses Render (Postgres + Redis) + Redpanda Cloud (Kafka)
- Kafka config conditionally enables SASL/SSL based on KAFKA_SSL env var

**AI tool configuration:**
- Claude Code (CLI) with checklist-style execution prompt
- Multiple commits on main branch for each logical unit of work
- Backend-only session — frontend deferred pending UI discussion with user

---

## Session 3 — 2026-03-25/26

**Prompt technique:** User-guided creative brief + autonomous execution

**Objectives:**
- Build the complete Next.js 16 frontend for Minute93
- Follow user's design brief: minimalistic, clean, athletic feel, Rose primary + zinc neutrals
- Responsive design (mobile hamburger menu, desktop navbar)
- Use shadcn/ui components throughout (sonner, accordion, card, skeleton, tabs, etc.)
- Create all pages: home, matches (tabbed), match detail, teams, team detail, player detail, standings, top scorers, search, about, login/signup

**Outcomes:**
- Installed 23 shadcn/ui components + sonner + next-themes
- Created Rose-primary color theme with zinc neutrals in globals.css (light mode only for now)
- Built responsive navbar with Sheet-based hamburger menu on mobile
- Built footer with navigation links and branding
- Created API client (lib/api.ts) with typed fetch wrapper matching server's ApiResponse shape
- Created shared components: MatchCard, MatchCardSkeleton, PageHeader, EmptyState, ErrorMessage
- Built 12 routes: /, /matches, /matches/[id], /teams, /teams/[id], /players/[id], /standings, /top-scorers, /search, /about, /login, /signup
- Home page: hero with gradient, features grid, architecture highlight, CTA
- Matches: tabbed Live/Results/Schedule with loading states
- Match detail: score header, event timeline, lineups tabs
- Teams: grid listing, detail with squad by position + recent/upcoming
- Player: profile header, stats grid, recent matches
- Standings: full league table with responsive columns
- Top scorers: ranked list with visual hierarchy
- Search: debounced fuzzy search with instant results
- About: Sergio Ramos 93rd-minute story, builder bio, architecture highlights, tech stack
- Auth: login/signup with Google OAuth + email/password, sonner toasts
- Fixed lucide-react icon naming (Github → GitFork, Chrome → Globe)
- All 12 routes build cleanly (mix of static and dynamic)

**Decisions made:**
- Inter font over Geist (better athletic feel)
- Sheet component for mobile nav (smooth animation from shadcn)
- Client components for data-fetching pages (useEffect + useState pattern)
- Server component for About page (static content, metadata export)
- 300ms debounce on search for instant-feel results
- Compact mode on MatchCard for nested usage (team detail, player detail)

**AI tool configuration:**
- Claude Code (CLI) with user's creative brief as design spec
- Many small commits on main (10 commits in this session)
- Next.js 16 docs consulted for params Promise pattern and Server/Client component conventions

---

## Session 4 — 2026-03-26

**Prompt technique:** Direct continuation ("continue") + batch execution ("finish both phases 3 and 4")

**Objectives:**
- Complete Phase 2 (poller registration, materialized views)
- Phase 3: Dockerfile, nginx.conf, docker-entrypoint.sh for production deployment
- Phase 4: Analytics module, Prometheus metrics, k6 load tests, article data script, admin dashboard

**Outcomes:**
- Registered PollerModule in app.module.ts imports array
- Created mv_standings and mv_top_scorers materialized views in schema.sql with unique indexes for CONCURRENT refresh
- Updated LeagueService to query from materialized views instead of inline aggregation
- Created multi-stage Dockerfile (Node 22 Alpine → build TS → prod image with Nginx + Node)
- Created nginx.conf: reverse proxy, gzip, security headers, rate limiting zones (api: 30r/s, auth: 5r/m), SSE route with proxy_buffering off
- Created docker-entrypoint.sh and .dockerignore
- Created AnalyticsModule: TrackingMiddleware (logs requests to analytics_events, respects X-Test-Country for k6), AnalyticsService (overview, geography, engagement, features queries), AnalyticsController (admin-only endpoints behind JwtAuthGuard + AdminGuard)
- Created IncidentController: POST /admin/incidents webhook for Grafana alerts (creates/resolves incidents)
- Created SnapshotService: @Cron daily at 3 AM, aggregates analytics_events into daily_snapshots with ON CONFLICT upsert
- Created MetricsModule (global): prom-client registry with histograms (http_request_duration, poller_cycle_duration), counters (http_requests_total, cache hits/misses, kafka produced/consumed), gauges (active_sse_connections, kafka_consumer_lag)
- Created PrometheusInterceptor: records request duration and count per route/method/status
- Created /metrics endpoint returning Prometheus text format
- Registered AnalyticsModule + MetricsModule in app.module.ts, applied TrackingMiddleware globally
- Created 4 k6 scenarios: casual-viewer (60%), explorer (25%), searcher (10%), power-user (5%)
- Created spike-test.js (500→2000→500 burst pattern)
- Created k6/helpers/geo.js for weighted country distribution
- Created k6/post-test.ts: parses k6 JSON summary, inserts into load_test_runs, determines pass/fail against thresholds
- Created scripts/generate-article-data.ts: queries all tables, produces structured markdown with 8 sections
- Created admin analytics dashboard page (/admin/analytics) with tabs: Engagement, Geography, Features, Incidents, Load Tests
- Added admin API functions to client lib/api.ts
- Added Grafana/Prometheus env vars to env.validation.ts
- Installed @nestjs/schedule and prom-client packages
- Both server and client builds pass clean

**Decisions made:**
- Nginx runs inside the same Docker container as NestJS (multi-process via entrypoint script)
- TrackingMiddleware fires and forgets (doesn't block requests)
- Prometheus interceptor registered globally via app.get() for DI-aware instantiation
- k6 scenarios use weighted VU distribution matching plan (60/25/10/5 split)
- Admin dashboard is a single page with tabs (not separate routes) for simplicity
- MetricsModule is @Global() so MetricsService can be injected anywhere for custom metrics

**AI tool configuration:**
- Claude Code (CLI) with batch execution across two phases
- Parallel task creation and sequential execution
- Both builds verified after all changes
