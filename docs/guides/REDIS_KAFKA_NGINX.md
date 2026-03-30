# Redis, Kafka & Nginx — How They Work

A plain-English guide to the three infrastructure pillars of Minute93: what each one does, how it fits into this project, when to use it in general, and real-world examples.

---

## Kafka

### What it is

Kafka is a **message delivery system**. Think of it like a conveyor belt in a factory. One machine puts items on the belt, and multiple machines further down the line each pick up those items and do their own thing with them.

The key idea: **the sender doesn't need to know or care who's listening.** It just puts the message on the belt and walks away.

### How it works in Minute93

The poller checks API-Football for live match updates. When it finds something — say Mbappé scores in the 73rd minute — it creates a single message and drops it onto a Kafka **topic** called `match.events`.

That one message then gets consumed by **4 independent consumers**, each doing a completely different job:

1. **CacheUpdater** — writes the new score to Redis so the next API request gets fresh data instantly
2. **PostgresWriter** — saves the event permanently in the database for historical records
3. **StatsAggregator** — refreshes the standings and top scorers materialized views
4. **SsePublisher** — pushes the event to Redis Pub/Sub, which streams it to browsers watching the match live

The poller doesn't call these 4 things directly. It just says "here's an event" and Kafka handles the fan-out. If the StatsAggregator crashes, the other 3 keep working. If you want to add a 5th consumer tomorrow (say, push notifications), you just plug it in — zero changes to the poller.

### When to use it

**Use Kafka when:**

- One event needs to trigger multiple independent actions (fan-out)
- You can't afford to lose messages — Kafka persists them to disk
- Producers and consumers run at different speeds — Kafka acts as a buffer
- You need to replay old messages (Kafka keeps history, unlike most queues)

**Don't use Kafka when:**

- You just need simple request/response (use HTTP)
- You have one producer and one consumer with no reliability needs (a simple queue like RabbitMQ or even Redis lists is lighter)
- Your system is small and adding Kafka would be more infrastructure than your actual app

> **One-liner:** Kafka is a durable conveyor belt — put a message on, any number of machines can read it independently, and nothing gets lost even if a machine breaks down.

### Real-world examples

- **Payment system (Fintech):** When a payment is processed, one event needs to trigger many things — update the ledger, send a receipt email, notify the fraud detection system, update the user's balance. Kafka lets the payment service fire once and all downstream systems react independently. If the email service goes down, the ledger still updates.
- **CRM:** When a sales rep closes a deal, Kafka fans it out to: update the dashboard metrics, trigger the onboarding workflow, notify the manager on Slack, sync to the billing system. No service waits on any other.
- **Voice agent:** When a call ends, Kafka distributes the recording to: the transcription service, the sentiment analysis pipeline, the compliance archival system, and the analytics dashboard — all in parallel.
- **Ride-sharing (Uber-style):** Every driver location ping goes to Kafka. One consumer updates the rider's map, another calculates ETAs, another feeds the surge pricing model, another logs for analytics. Millions of pings per second, all decoupled.

### What happens without it

The poller would have to directly call all 4 actions itself — update Redis, write to Postgres, refresh materialized views, push to SSE. If the Postgres write is slow, the SSE push waits. If the stats refresh crashes, the whole poller crashes. You lose all independence between those operations. Adding a 5th action means modifying the poller code. The poller becomes a tightly coupled monolith that does everything and breaks as one unit.

---

## Redis

### What it is

Redis is a **dictionary that lives in RAM**. You give it a key, it gives you back a value — and it does this in under a millisecond because everything is in memory, not on disk.

Think of it like a whiteboard in an office. Anyone can write something on it, anyone can read it, and it's way faster to glance at the whiteboard than to dig through the filing cabinet (your database). But if someone erases the whiteboard, the filing cabinet still has everything.

### How it works in Minute93

Redis is used for **4 different patterns**, each solving a different problem:

#### 1. Cache-aside (speed)

When someone requests match data, the server checks Redis first. If the data is there (cache hit), return it immediately — skip Postgres entirely. If it's not there (cache miss), query Postgres, return the result, and write it to Redis with a TTL (e.g., 5 minutes) so the next request is fast. This is why the API can handle thousands of requests without hammering the database.

#### 2. Deduplication (correctness)

The poller might fetch the same goal event twice from API-Football. Before publishing to Kafka, it asks Redis: "have I seen event `12345:goal:73:Mbappé` before?" using a Redis Set. If yes, skip it. If no, add it to the set and proceed. This prevents duplicate goals showing up in the UI.

#### 3. Pub/Sub (real-time)

When a live match event comes in, the SsePublisher consumer publishes it to a Redis channel like `match:42:events`. The SSE endpoint in the API is subscribed to that channel. The moment Redis gets the message, it pushes it to every connected browser instantly. This is how live score updates reach the frontend without the browser constantly polling.

#### 4. Rate limiting (protection)

The `incrementWithExpiry()` method counts requests per key (e.g., per IP or per user) and auto-expires the counter. Infrastructure is in place for application-level rate limiting alongside Nginx.

### When to use it

**Use Redis when:**

- You need sub-millisecond reads (caching, session storage, leaderboards)
- You need real-time messaging between parts of your system (pub/sub)
- You need atomic counters, sets, or sorted sets (rate limiting, dedup, rankings)
- The data is okay to lose — it can be rebuilt from the database

**Don't use Redis when:**

- You need durable storage (Redis is memory-first — if it restarts, data can be lost unless you configure persistence)
- Your data is large (Redis stores everything in RAM, which is expensive)
- You need complex queries with joins, aggregations, or full-text search (use a real database)

> **One-liner:** Redis is a fast scratchpad in memory — use it for anything you need to read/write quickly and can afford to rebuild if it disappears.

### Real-world examples

- **Payment system (Fintech):** Cache the user's account balance so the app doesn't hit the database every time they open the home screen. Also use it as a distributed lock — if two payments fire at the same time, Redis ensures only one processes (preventing double-charge).
- **CRM:** Cache the "top deals this quarter" dashboard query. It takes 3 seconds to compute from the database but only changes when a deal closes. Store it in Redis, refresh it every few minutes. Everyone sees the dashboard instantly.
- **Voice agent:** Store the active call session state — who's on the line, what menu option they picked, how long they've been waiting. This data is accessed constantly during the call but doesn't need to survive after hangup.
- **Gaming leaderboard:** Redis sorted sets are purpose-built for ranked lists. Add a player's score, and Redis keeps the leaderboard sorted automatically. Fetching "top 100 players" is a single sub-millisecond command.

### What happens without it

Every single API request hits Postgres directly. Standings page, match list, team pages — all querying the database every time. Under load (say 500 users watching a live match), Postgres gets hammered with identical queries returning the same data. Response times go from <5ms to 30-50ms+. The live SSE stream has no pub/sub mechanism, so you'd need to poll the database repeatedly to detect new events — adding latency and load. The poller has no dedup, so duplicate events from API-Football get published and you see the same goal appear twice.

---

## Nginx

### What it is

Nginx is a **gatekeeper** that sits between the internet and your actual application. Every request from a browser hits Nginx first. Nginx decides: should I let this through? How fast? Should I add any security headers? Then it forwards the request to your NestJS server.

Think of it like a receptionist at a building. They check your ID, make sure you're not visiting too often, add a visitor badge, and then send you to the right floor. Your actual application never deals with the public directly.

### How it works in Minute93

Every request to the API goes through Nginx before reaching NestJS:

#### 1. Rate limiting (protection)

Nginx tracks requests per IP address. Auth endpoints (`/auth/*`) are limited to 5 requests per minute — if someone tries to brute-force passwords, they get a `429 Too Many Requests` after 5 attempts. General API routes allow 30 requests per second with a burst buffer of 50. Health checks and metrics endpoints are exempt.

#### 2. Security headers (defense-in-depth)

Nginx adds headers to every response:

- `X-Frame-Options: SAMEORIGIN` — prevents your site from being embedded in someone else's iframe (clickjacking)
- `X-Content-Type-Options: nosniff` — stops browsers from guessing file types (MIME sniffing attacks)
- `X-XSS-Protection` — legacy cross-site scripting protection
- `Referrer-Policy` — controls what URL info is sent when users click links

#### 3. Reverse proxy (routing)

Nginx forwards requests to `localhost:3000` (the NestJS app) and passes along the real client IP, original protocol (http/https), and a request ID. The app never binds to a public port — Nginx is the only thing exposed.

#### 4. SSE passthrough

For the live match stream endpoints (`/matches/*/stream`), Nginx disables response buffering (`proxy_buffering off`). This is critical — SSE is a long-lived connection where the server pushes data continuously. If Nginx buffered it, events would arrive in batches instead of instantly.

#### 5. Compression

Nginx gzips JSON, JavaScript, and CSS responses over 256 bytes. This reduces bandwidth without the app code doing anything.

#### 6. Request size limits

`client_max_body_size 1m` — nobody can upload more than 1MB. Prevents abuse before it ever reaches the app.

### When to use it

**Use Nginx when:**

- You need rate limiting at the network edge (before requests hit your app)
- You want to terminate SSL/TLS in one place instead of configuring it in every app
- You need to load balance across multiple app instances
- You want to serve static files (images, CSS, JS) without burdening your app server
- You need security headers applied uniformly to all responses
- You have long-lived connections (SSE, WebSockets) that need special proxy handling

**Don't use Nginx when:**

- You're deploying to a platform that already provides this (Vercel, Cloudflare Workers, AWS API Gateway) — they have their own edge layer
- Your app is tiny and runs behind a managed load balancer already
- You only have one service with no need for routing, rate limiting, or SSL termination

> **One-liner:** Nginx is the bouncer at the door — it handles rate limiting, security headers, compression, and routing so your app only has to worry about business logic.

### Real-world examples

- **Payment system (Fintech):** Rate limit the `/transfer` endpoint to 3 requests per minute per user. Terminate SSL so all internal services communicate over plain HTTP (faster). Block requests over 10KB to prevent payload abuse.
- **CRM:** Load balance across 5 CRM app servers. If one goes down, Nginx routes traffic to the other 4 automatically. Serve the static marketing site directly from disk without touching the app.
- **Voice agent:** Proxy WebSocket connections from the browser to the voice processing backend with `proxy_buffering off` (same pattern as SSE). Add security headers so the call interface can't be embedded on phishing sites.
- **E-commerce (Black Friday):** During traffic spikes, Nginx queues excess requests with burst buffers instead of letting them crash your app servers. Serve cached product images directly. Route `/api/*` to the backend and `/*` to the static frontend — one entry point, two systems.

---

## Decision Framework

| You need... | Use |
|---|---|
| Fast reads, caching, ephemeral data | **Redis** |
| One event → many independent reactions | **Kafka** |
| Edge security, rate limiting, reverse proxy | **Nginx** |
| Durable storage with complex queries | **Postgres** (not these three) |

They're not interchangeable — they solve fundamentally different problems. In Minute93, a single goal event flows through all three: **Nginx** lets the poller's outbound request through → the poller publishes to **Kafka** → consumers write to **Redis** (cache + pub/sub) → **Nginx** streams the SSE response back to the browser with proper headers. Each one does its specific job in the chain.
