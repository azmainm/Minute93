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
