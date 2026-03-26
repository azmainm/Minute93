# Prompt: Set Up Redis & Kafka Infrastructure

## ROLE
You are the senior engineer working on the Minute93 project. You are familiar with the project plan and engineering standards in the `docs/` directory.

## OBJECTIVE
Set up the data infrastructure for both local development and production. Specifically:

- **Redis**: runs in Docker locally, will run on Render's managed Redis ("Key Value") in production
- **Kafka**: runs via Redpanda in Docker locally, will run on Redpanda Cloud (Serverless) in production

Upstash is NOT used for anything. Render does not offer Kafka, so Redpanda Cloud is the only external third-party service.

### 1. Local Development (do this now)

**Create or update `docker-compose.yml`** in the project root with three services:

- **Postgres** (`postgres:16`) — port 5432, with a dev database named `minute93`, user `postgres`, password `dev`
- **Redis** (`redis:7`) — port 6379, no password for local dev
- **Redpanda** (`docker.redpanda.com/redpandadata/redpanda:latest`) — Kafka API on port 9092, Schema Registry on 8081, Admin API on 9644. Single node, low memory config suitable for local dev.

All three should be in the same Docker network. Add health checks so services wait for dependencies.

**Update `server/.env`** (and create `server/.env.example` with placeholder values):

```
DATABASE_URL=postgresql://postgres:dev@localhost:5432/minute93
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
```

Remove any `UPSTASH_*` variables if they exist. The Kafka config should NOT include SASL or SSL variables locally — those are production-only.

**Update `client/.env.local`** if it references any of these services (it probably only needs `NEXT_PUBLIC_API_URL`).

**Verify the setup works:**
- Run `docker compose up -d` and confirm all three services start healthy
- Confirm Redis is reachable: `docker exec -it <redis-container> redis-cli ping` → PONG
- Confirm Redpanda is reachable: `docker exec -it <redpanda-container> rpk cluster info`
- Confirm Postgres is reachable with the connection string

### 2. Production Setup Instructions (DO NOT configure now — document only)

Create or update `.claude/docs/production-setup.md` with clear, step-by-step instructions that I can follow when deploying to Render. Organize it into three sections:

**Section A — Render Postgres:**
- Go to Render dashboard → New → PostgreSQL
- Create in the same region as other services
- Copy the internal connection string → set as `DATABASE_URL` env var on the NestJS service

**Section B — Render Redis:**
- Go to Render dashboard → New → Key Value
- Create in the same region as other services (critical for internal networking / low latency)
- Copy the internal Redis URL → set as `REDIS_URL` env var on the NestJS service
- Note: Render Redis communicates over private internal network = sub-millisecond latency. This is why we use Render Redis instead of an external provider.

**Section C — Redpanda Cloud (Kafka):**
- Sign up at redpanda.com
- Create a Serverless cluster
- Create the `match.events` topic (or whatever topics we need by then)
- Get the bootstrap server URL, SASL username, and SASL password
- Set these env vars on the NestJS service on Render:
  - `KAFKA_BROKERS=<redpanda-bootstrap-url>`
  - `KAFKA_SASL_USERNAME=<username>`
  - `KAFKA_SASL_PASSWORD=<password>`
  - `KAFKA_SSL=true`
- Note: this is the ONLY external third-party service. Render doesn't offer managed Kafka.

**Section D — Environment Variable Summary:**
Provide a complete table showing every env var, what it's for, and where the value comes from in production.

### 3. NestJS Configuration Pattern

Make sure the NestJS Kafka configuration (wherever it's set up — `kafka.module.ts` or `kafka.service.ts`) reads from environment variables and conditionally applies SASL/SSL only when `KAFKA_SSL=true`. This way the same code works for both local (no auth, plain TCP) and production (SASL + SSL). Example pattern:

```typescript
const kafkaConfig = {
  brokers: process.env.KAFKA_BROKERS.split(','),
  ...(process.env.KAFKA_SSL === 'true' && {
    ssl: true,
    sasl: {
      mechanism: 'scram-sha-256',
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD,
    },
  }),
};
```

If this config module doesn't exist yet, create it following our engineering standards (fail fast on missing required env vars, no hardcoded values).

### 4. Update Documentation

- Update `CLAUDE.md` to reflect: local dev uses Docker for Postgres + Redis + Redpanda. Production uses Render Postgres + Render Redis + Redpanda Cloud.
- Update any `.claude/docs/` files that reference Upstash — replace with correct info.
- Add a note in `CLAUDE.md`: "When the developer asks to deploy to production or asks what env vars to set on Render, refer to `.claude/docs/production-setup.md` for complete instructions."
- Log this session in `.claude/docs/ai-development-log.md`.

## GUIDELINES
- Do all Docker setup, env file changes, and config code yourself — do not ask me to do manual steps for local dev.
- For production setup, write documentation only — I will follow the instructions later when I'm ready to deploy.
- Remove ALL references to Upstash (both Kafka and Redis) from any files you touch.
- Follow the engineering standards in `docs/engineering-standards.md`.
- If you need to create any NestJS config modules, follow the existing module patterns in the codebase.

## EXECUTION
1. Create/update `docker-compose.yml` with Postgres + Redis + Redpanda.
2. Update `server/.env` and create `server/.env.example`.
3. Create or update NestJS Kafka config to handle local vs production connection.
4. Start Docker services and verify all three are healthy.
5. Create `.claude/docs/production-setup.md` with deployment instructions.
6. Update `CLAUDE.md` and any other docs that reference infrastructure.
7. Log this session in `ai-development-log.md`.
