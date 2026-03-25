# Architectural Patterns

Cross-cutting patterns used across Minute93. Read this before working on Kafka consumers, Redis, SSE, or the Nginx layer.

## 1. Kafka Consumer Fan-Out

A single Kafka topic (`match.events`, partitioned by `match_id`) feeds four independent consumers in the NestJS API. Each consumer belongs to a separate consumer group and serves a distinct purpose:

| Consumer | Responsibility | Writes to |
|----------|---------------|-----------|
| CacheUpdaterConsumer | Updates live match state (scores, status) | Redis (HSET) |
| PostgresWriterConsumer | Persists events as historical record | Postgres (match_events table) |
| StatsAggregatorConsumer | Refreshes materialized views (standings, top scorers) | Postgres (REFRESH MATERIALIZED VIEW CONCURRENTLY) |
| SsePublisherConsumer | Publishes events for real-time browser push | Redis Pub/Sub channel |

**Key rules:**
- Consumers must be **idempotent** — the same event processed twice must produce the same result.
- Partition by `match_id` guarantees **event ordering per match**.
- Each consumer operates independently; one consumer's failure must not block others.
- Uses kafkajs client library. Local dev connects to Redpanda via plain TCP; production connects to Redpanda Cloud with SASL/SSL (configured via env vars).

## 2. Redis Multi-Pattern Usage

Redis serves four distinct architectural purposes. Each pattern uses a different key namespace:

### Cache-Aside (Pattern 1)
- **Keys:** `match:{id}:score`, `match:{id}:meta`, `standings:{league_id}`
- **Flow:** Check Redis → cache hit: return → cache miss: query Postgres → write to Redis with TTL → return
- **Invalidation:** CacheUpdaterConsumer writes new values when Kafka events arrive. TTL as safety net (5 min for live data, 1 hour for standings).
- **Fallback:** If Redis is down, fall back to Postgres. Never error on cache failure.

### Rate Limiting (Pattern 2)
- **Keys:** `ratelimit:{ip}:{endpoint}`, `ratelimit:auth:{ip}`
- **Mechanism:** `INCR` + `EXPIRE`. NestJS ThrottlerGuard backed by Redis store.
- **Two layers:** Nginx rate limiting (first line), NestJS ThrottlerGuard (second line, per-user granularity).
- **Auth-specific:** 3 attempts per IP per 15 minutes on auth endpoints.

### Pub/Sub (Pattern 3)
- **Channels:** `match:{id}:events`
- **Publisher:** SsePublisherConsumer (Kafka consumer) publishes match events.
- **Subscriber:** NestJS SSE endpoint subscribes per client connection.
- **Purpose:** Decouples Kafka consumers from SSE connections. Keeps NestJS instances stateless for horizontal scaling.

### Deduplication Set (Pattern 4)
- **Keys:** `processed:events`
- **Mechanism:** `SADD processed:events {event_id}` → returns 0 if already exists (skip), 1 if new (produce to Kafka).
- **Owner:** Poller service only.
- **TTL:** Set expiry on individual members or periodic cleanup to prevent unbounded growth.

## 3. SSE (Server-Sent Events) via Redis Pub/Sub

**Why SSE over WebSocket:** All real-time communication is server-to-client only. SSE is simpler, works over standard HTTP, auto-reconnects, and needs no protocol upgrade.

**Flow:**
1. Browser opens `GET /matches/{id}/events` (SSE connection)
2. NestJS SSE endpoint subscribes to Redis Pub/Sub channel `match:{id}:events`
3. When SsePublisherConsumer publishes to the channel, NestJS receives it and pushes to all connected browsers
4. On disconnect, NestJS unsubscribes from the Redis channel

**Nginx requirement:** SSE routes MUST have `proxy_buffering off` in nginx.conf. Without this, Nginx buffers the response and events are delayed or never delivered.

## 4. Nginx Reverse Proxy

Nginx runs inside the same Docker container as NestJS. It handles:

| Concern | Implementation |
|---------|---------------|
| Reverse proxy | Forwards to NestJS on `localhost:3000` |
| Gzip compression | Compress responses > 1KB |
| Security headers | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS |
| Rate limiting | First-layer rate limiting (per-IP, connection limits) |
| SSE passthrough | `proxy_buffering off` on `/matches/*/events` routes |
| CORS | Origin validation (only allow `CLIENT_URL`) |

**Do not** duplicate in NestJS what Nginx already handles (e.g., gzip, basic rate limiting). NestJS handles application-level concerns (auth guards, per-user throttling).

## 5. Deduplication Strategy

The Poller service is the single point of ingestion from API-Football. It must prevent duplicate events from entering the Kafka pipeline:

1. Poller receives match data from API-Football
2. For each event, compute a deterministic ID (e.g., `{match_id}:{event_type}:{minute}:{player}`)
3. Check `SADD processed:events {event_id}` in Redis
4. If SADD returns 1 (new): produce to Kafka
5. If SADD returns 0 (duplicate): skip

Even with deduplication at the Poller, downstream consumers must still be idempotent — Redis can lose data on restart, and Kafka may redeliver.

## 6. Graceful Degradation

- **Redis down:** Fall back to Postgres for all reads. Log warning. Never crash.
- **Kafka consumer lag:** Events are delayed but not lost. Kafka retains messages for 24 hours.
- **API-Football down:** Serve stale cached data from Redis/Postgres. Show "last updated X seconds ago" in UI.
- **Partial consumer failure:** Other consumers continue independently. Failed consumer retries with backoff.
