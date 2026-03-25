# Minute93 — Final Project Plan

> Real-Time Football Intelligence Platform
> Last updated: March 24, 2026

---

## 1. Project Summary

**What:** A real-time football intelligence platform with live scores, historical stats, league standings, and player/team search — built to demonstrate distributed systems skills for a Solutions/Cloud Architect portfolio piece.

**App name:** Minute93 (inspired by Sergio Ramos' 93rd-minute equalizer in the 2014 Champions League Final — the kind of moment this platform is built to capture in real-time)

**Domain:** minute93.live

**Target event:** Champions League 2025–26 season (knockout rounds: April – May 31 CL Final)

**Future stretch:** If results are successful, redeploy for FIFA World Cup 2026 (June 11 – July 19). Mentioned in the article as a future plan, not a deliverable.

**Builder:** Solo developer, 10–15 hours/week (~120–150 total hours before CL Final)

**Stack:** Next.js (frontend, Vercel) + NestJS (backend API, Render) + Nginx (reverse proxy) + TypeScript, Kafka (Upstash), Redis (Upstash), PostgreSQL (local dev / Render Postgres prod)

**Budget:** $20–50/month during testing phase

**End deliverable:** Technical article written immediately after the CL Final (early June 2026) with real Grafana graphs, architecture diagrams, load test results, traffic metrics, incident retrospectives, and database choice justifications.

**Engineering standards:** The codebase follows the 4Trades.ai Engineering Standards document (provided separately as context when building). All code — whether human-written or AI-generated — must comply with these standards covering code organization, error handling, naming, API design, logging, testing, git workflow, and documentation.

---

## 2. Data Source Recommendation: API-Football

After evaluating all options, **API-Football** (via api-football.com directly, NOT through RapidAPI — direct is cheaper) is the best fit.

### Why API-Football wins

| Factor | API-Football | Sportmonks | wc2026api.com | football-data.org |
|--------|-------------|------------|---------------|-------------------|
| **Free tier** | 100 req/day, all endpoints | Only Danish Superliga + Scottish Premiership (no World Cup) | 100 req/day, basic data only | 12 leagues, delayed scores, World Cup not confirmed free |
| **Tournament plan** | $29/mo Ultra = 75,000 req/day | €29/mo Starter = 5 leagues, 2,000 calls/hr | Free only, very limited | €29/mo for deep data + livescores |
| **Live data** | Goals, cards, subs, lineups, stats — 15s update frequency | Equivalent quality, more expensive for WC-only use | No events, no player stats | Events + lineups only on €29+ plan |
| **Coverage depth** | Squads, H2H, standings, top scorers, predictions, odds | Deeper (xG, pressure index) but at higher cost | Fixtures, standings, teams only | Good but narrower |
| **Dev experience** | Clean REST, good docs, direct dashboard | Excellent docs, includes system is powerful | Minimal docs, hobby project | Clean but older-style |

### The plan

- **Building phase (now – mid April):** Use the **free tier** (100 requests/day). Enough for seeding fixture/team/player data and building the UI. For real-time pipeline testing, use a mock data generator locally.
- **Live integration testing (mid April – end May):** Upgrade to **Pro plan at $19/month** (7,500 requests/day). Test against real live matches from **Premier League + La Liga + Champions League** simultaneously. This gives you matches nearly every day — enough to thoroughly stress-test the entire pipeline.
- **Narrowing down (late May):** Once confident, turn off PL/La Liga polling and focus on **Champions League only** (semi-finals late April/early May, final May 31). The CL Final is your dress rehearsal.
- **Cutover (June 1–10):** Turn off all league polling. Wipe test data. Seed World Cup 2026 fixtures, teams, players. Switch environment variables to World Cup league ID. Upgrade to **Ultra plan at $29/month** (75,000 requests/day).
- **Tournament (June 11 – July 19):** Live operations on World Cup data only.
- **Post-tournament:** Cancel. Total API cost: ~$67 (Pro for ~2 months + Ultra for ~1 month).

### Request budget math

```
During a live match day (assume 4 matches, ~2 hours each):
- Live score polls: 4 matches × 120 min × 2 polls/min = 960 requests
- Lineup/events refresh: 4 matches × 24 refreshes = 96 requests
- Standings refresh: 12 groups × 4 refreshes = 48 requests
- Non-match background polls: ~200 requests

Total per match day: ~1,300 requests
Daily budget: 75,000
Utilization: ~1.7%
```

You have enormous headroom. Even if you add user-triggered API calls (search, H2H), you won't approach the limit.

---

## 3. Authentication Strategy

You want to showcase auth knowledge. Here's a clean approach using NestJS's built-in auth ecosystem — guards, strategies, and decorators — which is more impressive than NextAuth's magic wrappers.

### NestJS AuthModule with dual providers

**Provider 1 — Google OAuth (Passport strategy):** One-click sign-in. NestJS `@nestjs/passport` with `passport-google-oauth20`. Returns a JWT on success.

**Provider 2 — Email/Password (Credentials):** Traditional signup form. bcrypt hashing, JWT signing, and the full flow built by hand in NestJS.

### What to implement (and what to talk about in the article)

| Component | Implementation | Article talking point |
|-----------|---------------|----------------------|
| Password hashing | bcrypt with salt rounds in AuthService | Why bcrypt over argon2 at this scale |
| Session management | JWT signed by NestJS, stored in HTTP-only cookie | JWT vs. session tokens tradeoff |
| Route protection | NestJS `JwtAuthGuard` on protected routes, `AdminGuard` for /admin/* | Declarative security with guards |
| Rate limiting on auth endpoints | NestJS `ThrottlerGuard` backed by Redis (3 attempts per IP per 15 min) | Brute force protection |
| CSRF protection | SameSite cookie + Origin header validation | Why it matters for cookie-based auth |
| Password reset | Token-based reset flow in AuthService (token stored in Postgres, expires in 1 hour) | Secure token generation and expiry |

### User table (Postgres)

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),          -- NULL for OAuth-only users
  name          VARCHAR(100),
  avatar_url    TEXT,
  auth_provider VARCHAR(20) NOT NULL,  -- 'google' | 'credentials'
  country_code  VARCHAR(2),            -- from IP geolocation on signup
  timezone      VARCHAR(50),           -- from browser on signup
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

### Cost: $0 additional

Passport.js and NestJS auth packages are free. Google OAuth credentials are free from Google Cloud Console. No external email service needed.

---

## 4. User Analytics & Demographics (Rich Dashboard)

You want to capture where users are from and build a rich analytics dashboard. Here's how to get this data without asking users for it (plus optional explicit data).

### Passive data collection (no user input needed)

| Data point | How to capture | Stored where |
|------------|---------------|-------------|
| **Country / Region / City** | IP geolocation via free API (ip-api.com: 45 req/min free, or ipinfo.io: 50K req/month free) — call on signup or first visit, store result | Postgres `users` table |
| **Timezone** | `Intl.DateTimeFormat().resolvedOptions().timeZone` from browser JS, sent on signup | Postgres `users` table |
| **Device type** | Parse User-Agent header (mobile/desktop/tablet) | Postgres `analytics_events` table |
| **Browser** | Parse User-Agent | Postgres `analytics_events` table |
| **Referral source** | `document.referrer` + UTM params | Postgres `analytics_events` table |
| **Session duration** | Heartbeat ping every 60s while tab is active | Postgres `analytics_events` table |
| **Pages visited** | Log each route hit server-side | Postgres `analytics_events` table |

### Active data collection (optional, user provides)

On the profile page, after signup, offer an optional "personalize your experience" step:

- **Favorite team** (dropdown of 48 WC teams) — also useful for personalized push notifications
- **Display name** (for profile and community features)

### Analytics events table

```sql
CREATE TABLE analytics_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  session_id  VARCHAR(36),
  event_type  VARCHAR(50) NOT NULL,   -- 'page_view', 'search', 'login', 'signup', 'match_view'
  event_data  JSONB,                  -- flexible payload: { page: '/match/42', device: 'mobile' }
  ip_country  VARCHAR(2),
  ip_city     VARCHAR(100),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_type_created ON analytics_events(event_type, created_at);
CREATE INDEX idx_events_user ON analytics_events(user_id);
```

### Private analytics dashboard (what it shows)

This is a separate set of pages behind an admin-only route (`/admin/analytics`). Not fancy — functional. Use **shadcn/ui charts** (built on Recharts) or connect to **Grafana Cloud** for the monitoring-grade dashboards.

**Dashboard sections:**

1. **User Overview** — Total users, signups/day graph, auth method breakdown (Google vs. email)
2. **Geography** — Users by country (choropleth map or table), top 10 cities, timezone distribution
3. **Engagement** — DAU/WAU/MAU, average session duration, pages per session, bounce rate, most visited pages
4. **Feature Usage** — Match page views, searches performed, most searched players/teams, most viewed matches
5. **Real-Time** — Currently active users, active matches, SSE connections open right now (via Redis counters)
6. **Technical** — API response times (p50/p95/p99), Kafka consumer lag, Redis cache hit rate, error rates

**The first 5 come from Postgres queries on the analytics_events table. The 6th comes from Prometheus/Grafana.**

### Why not Elasticsearch for analytics?

The analytics dashboard queries are all structured aggregations on a known schema: `GROUP BY country`, `COUNT(*) WHERE event_type = 'signup'`, time-bucketed histograms. Postgres handles these efficiently with proper indexes, and you can use materialized views for expensive queries (refreshed hourly or after each match). Elasticsearch would be justified if you were doing full-text search across millions of unstructured log entries — you're not. You have ~50K–500K structured rows at most.

**Article section:** *"I evaluated Elasticsearch for the analytics layer but concluded that Postgres materialized views + Grafana provided equivalent capability at zero additional cost and operational complexity. ES would become justified at ~10M+ events with high-cardinality free-text search requirements."*

---

## 5. Feature Set

### Feature 1 — Live Match Feed (Kafka + Redis + SSE showcase)

**User sees:** A dashboard of today's matches with live-updating scores, a match detail page with real-time events (goals, cards, subs), minute-by-minute timeline. No refresh needed — events appear as they happen.

**Architecture:**

```
API-Football ──→ Poller Service (Node.js worker on Render)
                    │
                    ├─ Polls every 30s during live matches
                    ├─ Polls every 5 min during off hours
                    ├─ Deduplicates via Redis Set (processed event IDs)
                    │
                    ↓
              Kafka: match.events (partitioned by match_id)
                    │
        ┌───────────┼────────────┬──────────────┐
        ↓           ↓            ↓              ↓
   Redis Cache   Postgres     Stats          SSE Push
   (live state)  Writer       Aggregator     Worker
                 (historical) (mat. views)   (→ browser via Pub/Sub)
```

**Key talking points for article:**
- Kafka partitioning by match_id guarantees event ordering per match
- Consumer group design: each consumer serves a different purpose (cache, persistence, aggregation, push)
- Deduplication strategy: idempotent consumers + Redis Set of processed event IDs
- SSE vs WebSocket decision: SSE is simpler for unidirectional push, auto-reconnects, no protocol upgrade needed
- Nginx configured with `proxy_buffering off` for SSE routes — a real-world gotcha worth documenting

### Feature 2 — Match Stats, Historical Data & Search (Postgres showcase)

**User sees:** A rich, browsable football data platform:

- **League standings** — live group tables updated automatically after each match
- **Match results** — full history of completed matches with scores, events, lineups
- **Match detail pages** — for each match: timeline of events (goals, cards, subs), team lineups, match stats (possession, shots, fouls)
- **Team pages** — squad list, recent form (W/D/L), upcoming fixtures, historical results
- **Player pages** — stats (goals, assists, cards), which matches they played in, position, team
- **Top scorers** — tournament-wide goal rankings, auto-updated after each match
- **Knockout bracket** — visual bracket showing progression through rounds (for CL or World Cup)
- **Fuzzy search** — search bar with instant results for players and teams, tolerant of misspellings

This is the feature that gives the app real utility. People come for live scores, but they stay to browse stats, check standings, and look up players.

**Architecture:**

- NestJS SearchModule handles fuzzy search via `pg_trgm` extension on ~800+ players + 30+ teams (CL) or ~1200+ players + 48 teams (WC)
- Trigram GIN index: `CREATE INDEX idx_players_name_trgm ON players USING GIN (name gin_trgm_ops);`
- NestJS StatsAggregatorConsumer (Kafka consumer) refreshes materialized views after each match event — top scorers, standings, team form
- NestJS MatchService read queries hit these materialized views, not live tables — pre-computed and instant
- Historical match data is populated by the Postgres Writer Kafka consumer and is permanently stored — it never expires

**Why not Elasticsearch?** ~1,000–1,200 searchable entities. Postgres `pg_trgm` handles this in <1ms. The article explains this is the right call.

### Redis Usage (4 distinct architectural patterns)

| # | Pattern | What it does | Key example |
|---|---------|-------------|-------------|
| 1 | **Cache-Aside** | Hot read cache for match metadata, live scores, standings. TTL-based, invalidated by Kafka consumer. | `GET match:42:score` → cache hit = skip Postgres |
| 2 | **Rate Limiting** | Counter + TTL per user/IP on API endpoints. First layer is Nginx, second layer is NestJS ThrottlerGuard backed by Redis. | `INCR user:123:requests` + `EXPIRE 60` |
| 3 | **Pub/Sub** | Kafka consumer publishes match events → Redis channel → NestJS SSE endpoint subscribes → pushes to browsers. Keeps NestJS instances stateless for horizontal scaling. | `PUBLISH match:42:events '{"type":"goal"}'` |
| 4 | **Deduplication Set** | Poller stores processed API-Football event IDs to prevent duplicate Kafka messages. | `SADD processed:events evt_12345` → returns 0 if already exists |

### Stretch Feature — Push Notifications (only if ahead of schedule)

Browser push notifications (Web Push API) for goals in matches the user follows. Requires a service worker and push subscription — neat to implement but not core.

---

## 6. Full Technology Stack

| Technology | Role | Service / Cost |
|-----------|------|---------------|
| **Next.js 14+ (App Router)** | Frontend (SSR pages, client components) | Vercel (free tier) |
| **NestJS** | Backend API (auth, search, SSE, Kafka consumers, analytics) | Render Web Service (~$7/mo) |
| **Nginx** | Reverse proxy in front of NestJS (gzip, rate limiting, security headers, SSE buffering config) | Bundled in NestJS Docker container |
| **TypeScript** | Language for everything | — |
| **shadcn/ui + Tailwind** | UI component library | Free |
| **Kafka** | Event backbone | Upstash Kafka (~$5–15/mo, pay-per-message) |
| **Redis** | Cache, rate limiting, pub/sub, deduplication | Upstash Redis (~$10/mo) |
| **PostgreSQL** | Source of truth + analytics | Local in dev, Render Postgres in production (free tier) |
| **API-Football** | Match data source | Free during dev, $19/mo Pro during testing |
| **@nestjs/passport + passport-jwt + passport-google-oauth20** | Authentication | Free |
| **Grafana Cloud** | Observability dashboards | Free tier (10K metrics, 50 GB logs) |
| **k6** | Load testing + synthetic traffic | Free & open source (by Grafana Labs, integrates with Grafana Cloud) |
| **Render** | Hosting (NestJS API + Poller background worker) | ~$7–14/mo |

### Monthly cost breakdown

| Phase | Cost |
|-------|------|
| **Building (March – mid April)** | $0 (everything local or free tier) |
| **Live testing (mid April – May)** | ~$26–36/mo (API-Football Pro $19 + Upstash ~$10 + Render ~$7) |
| **Post CL-Final** | $0 (cancel paid services, keep free tiers for demo) |

**Total project cost: ~$50–75**

---

## 7. Testing Strategy: Multi-League Staging

This is how you validate the entire system before the World Cup starts — without guessing.

### The core insight

API-Football uses **identical endpoints and response formats** for every competition. The only parameter that changes is the league ID:

```typescript
// config/competitions.ts
export const LEAGUES = {
  PREMIER_LEAGUE:    { id: 39,  season: 2025, name: 'Premier League' },
  LA_LIGA:           { id: 140, season: 2025, name: 'La Liga' },
  CHAMPIONS_LEAGUE:  { id: 2,   season: 2025, name: 'Champions League' },
  WORLD_CUP:         { id: 1,   season: 2026, name: 'FIFA World Cup' },
};

// Environment-driven: which leagues the poller actively tracks
export const ACTIVE_LEAGUES = (process.env.ACTIVE_LEAGUES || '39,140,2')
  .split(',')
  .map(Number);
```

Switching from "test mode" to "World Cup mode" = changing one environment variable and redeploying. Zero code changes.

### Three-phase testing approach

**Phase A — Multi-league stress testing (mid April – mid May)**

Poll Premier League, La Liga, AND Champions League simultaneously. This gives you:

| League | Match frequency | What it tests |
|--------|----------------|---------------|
| Premier League | 2–3 match days/week, 5–10 matches each | High-volume concurrent matches, multiple simultaneous events |
| La Liga | 2–3 match days/week, 5–10 matches each | More concurrent load, different timezone patterns |
| Champions League | Sporadic but high-profile | Knockout format similar to World Cup, intense event bursts during goals |

On a busy midweek when CL plays alongside rescheduled PL or La Liga matches, you could have **10+ concurrent live matches** flowing through your pipeline — far more than the World Cup's typical 3–4 simultaneous games. If your system handles a packed Premier League + La Liga + Champions League evening, the World Cup will feel easy.

**What to validate during this phase:**
- Kafka handles events from multiple leagues simultaneously without ordering issues (partitioned by match_id, so league doesn't matter)
- Redis cache correctly namespaces different competitions
- Poller scales polling frequency per match (live = 30s, scheduled = 5min) regardless of league
- SSE pushes events for the correct match to the correct subscribers
- Grafana dashboards show meaningful data under real load
- Consumer lag stays acceptable during multi-match evenings
- Historical match data, standings, and stats pages populate correctly from consumed events

**Phase B — Champions League only (mid May – May 31)**

Turn off PL and La Liga polling. Focus purely on Champions League knockout rounds:
- CL Semi-finals: April 29/30 + May 6/7
- CL Final: **May 31** — your dress rehearsal

The CL Final is the single most-watched club football match of the year. If your system handles it flawlessly end-to-end, you're ready.

**Phase C — World Cup cutover (June 1–10)**

1. Turn off all league polling
2. Wipe test data from Postgres (matches, events) — keep user accounts
3. Reset Redis (flush cache)
4. Run the seed script for World Cup 2026: fetch all 104 fixtures, 48 teams, ~1,200 players from API-Football
5. Update `ACTIVE_LEAGUES` env var to World Cup only
6. Redeploy
7. Verify everything loads correctly with World Cup fixture data
8. Wait for June 11 kickoff

### What's identical between leagues (no code changes needed)

Everything. Specifically: fixture data shape, event data shape (goals, cards, subs), lineup format, standings format, team/player objects, statistics objects. API-Football normalizes all of this regardless of competition.

### What's slightly different (handled by config, not code)

| Difference | PL/La Liga | World Cup | How it's handled |
|-----------|-----------|-----------|-----------------|
| Competition structure | 38-round league | Groups → Knockout | Standings endpoint returns appropriate format for each; your UI renders whatever shape it receives |
| Concurrent matches | Up to 10 on a match day | Up to 4 in group stage | No code change — poller iterates over all live matches from the API |
| Team types | Clubs | National teams | Same data shape, just different names and logos |
| Season duration | Aug – May | 5 weeks | No code change — poller just tracks whatever matches exist |

---

## 8. System Architecture

```
┌──────────────────────────┐
│         VERCEL            │
│                           │
│  ┌─────────────────────┐ │
│  │ Next.js App          │ │
│  │ (Frontend)           │ │
│  │                      │ │
│  │ SSR pages            │ │
│  │ shadcn/ui + Tailwind │ │
│  │ Calls NestJS API ────┼─┼───────────────────┐
│  └─────────────────────┘ │                     │
└──────────────────────────┘                     │
                                                 ▼
┌───────────────────────────────────────────────────────────┐
│                          RENDER                            │
│                                                            │
│  ┌──────────────┐    ┌──────────────────────────────────┐ │
│  │ Poller Worker │    │ NestJS API (Docker)               │ │
│  │ (Background)  │    │                                   │ │
│  │               │    │  ┌───────┐    ┌───────────────┐  │ │
│  │ API-Football  │    │  │ Nginx │───►│ NestJS        │  │ │
│  │ → Kafka       │    │  │ :80   │    │ :3000         │  │ │
│  │               │    │  │       │    │               │  │ │
│  │               │    │  │ gzip  │    │ Auth Module   │  │ │
│  │               │    │  │ rate  │    │ Match Module  │  │ │
│  │               │    │  │ limit │    │ Search Module │  │ │
│  │               │    │  │ CORS  │    │ Kafka Module  │  │ │
│  │               │    │  │ SSE   │    │ Redis Module  │  │ │
│  │               │    │  │ proxy │    │ Analytics Mod │  │ │
│  │               │    │  └───────┘    └───────────────┘  │ │
│  └───────┬───────┘    └──────────────────┬───────────────┘ │
│          │                               │                 │
└──────────┼───────────────────────────────┼─────────────────┘
           │                               │
           ▼                               ▼
    ┌─────────────┐                 ┌──────────────┐
    │ Upstash     │                 │ Render       │
    │ Kafka       │◄── consumes ───│ PostgreSQL   │
    │             │                 │              │
    │ match.events│                 │ users        │
    │ topic       │                 │ matches      │
    └──────┬──────┘                 │ events       │
           │                        │ analytics    │
           │                        │ snapshots    │
           │                        │ load_tests   │
           │                        │ incidents    │
           │                        └──────────────┘
           ▼
    ┌─────────────┐
    │ Upstash     │
    │ Redis       │
    │             │
    │ Cache       │
    │ Pub/Sub     │
    │ Rate Limit  │
    │ Dedup Set   │
    └─────────────┘
```

### Three deployable services

| Service | What it does | Deployed to | Why separate |
|---------|-------------|-------------|-------------|
| **Next.js Frontend** | SSR pages, static assets, client components. Calls NestJS API for all data. | **Vercel** | Best-in-class Next.js hosting, edge CDN, instant deploys, free tier |
| **NestJS API** | All backend logic: auth, match data, search, SSE, Kafka consumers, analytics. Runs behind Nginx inside Docker. | **Render** (Web Service) | Proper service layer with DI, guards, interceptors. Docker support for Nginx bundling. |
| **Poller Worker** | Polls API-Football, deduplicates via Redis, produces to Kafka | **Render** (Background Worker) | Long-running process, different scaling profile, shouldn't compete with API requests |

### NestJS module structure

```
apps/api/
├── Dockerfile                    # Multi-stage: build NestJS + Nginx
├── nginx.conf                    # Reverse proxy config (gzip, rate limit, SSE)
├── src/
│   ├── app.module.ts             # Root module
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts    # POST /auth/login, /auth/signup, /auth/google
│   │   ├── auth.service.ts       # JWT signing, bcrypt, password reset
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts # Protects authenticated routes
│   │   │   └── admin.guard.ts    # Protects /admin/* routes
│   │   └── strategies/
│   │       ├── jwt.strategy.ts
│   │       └── google.strategy.ts
│   ├── match/
│   │   ├── match.module.ts
│   │   ├── match.controller.ts   # GET /matches, /matches/:id, /matches/live
│   │   ├── match.service.ts
│   │   └── match.gateway.ts      # SSE endpoint for live match events
│   ├── search/
│   │   ├── search.module.ts
│   │   ├── search.controller.ts  # GET /search?q=mbappe
│   │   └── search.service.ts     # pg_trgm queries
│   ├── analytics/
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts   # GET /admin/analytics/*, POST /admin/incidents
│   │   ├── analytics.service.ts      # Dashboard queries
│   │   ├── tracking.middleware.ts     # Logs every request to analytics_events
│   │   └── snapshot.service.ts       # Daily snapshot scheduled task (@Cron)
│   ├── kafka/
│   │   ├── kafka.module.ts
│   │   ├── kafka.service.ts          # Producer + consumer setup
│   │   ├── consumers/
│   │   │   ├── cache-updater.consumer.ts    # → Redis cache
│   │   │   ├── postgres-writer.consumer.ts  # → Postgres historical record
│   │   │   ├── stats-aggregator.consumer.ts # → Materialized views refresh
│   │   │   └── sse-publisher.consumer.ts    # → Redis Pub/Sub → SSE
│   ├── redis/
│   │   ├── redis.module.ts
│   │   └── redis.service.ts          # Wraps all 4 Redis patterns
│   ├── common/
│   │   ├── interceptors/
│   │   │   └── prometheus.interceptor.ts    # Records request duration metrics
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts     # Centralized error handling
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   └── config/
│       ├── database.config.ts
│       ├── redis.config.ts
│       ├── kafka.config.ts
│       └── competition.config.ts     # ACTIVE_LEAGUES env var
```

### Data flow for a goal event

```
1. API-Football returns updated match data (goal detected)
2. Poller checks Redis dedup set → new event
3. Poller produces to Kafka: { match_id: 42, type: 'goal', player: 'Mbappé', minute: 67 }
4. NestJS CacheUpdaterConsumer: updates live score in Redis → HSET match:42 score "2-1"
5. NestJS PostgresWriterConsumer: INSERT INTO match_events (match_id, type, ...)
6. NestJS StatsAggregatorConsumer: REFRESH MATERIALIZED VIEW CONCURRENTLY top_scorers
7. NestJS SsePublisherConsumer: publishes to Redis Pub/Sub channel match:42:events
8. NestJS SSE endpoint (match.gateway.ts): subscribed to Redis Pub/Sub, pushes to all connected browsers
9. Next.js client component: receives SSE event, updates UI in real-time
```

---


## 9. Database Schema (Core Tables)

```sql
-- Users & Auth
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255),
  name            VARCHAR(100),
  avatar_url      TEXT,
  auth_provider   VARCHAR(20) NOT NULL DEFAULT 'credentials',
  favorite_team   VARCHAR(3),
  country_code    VARCHAR(2),
  timezone        VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

-- Leagues (supports multi-league: PL, La Liga, CL, World Cup)
CREATE TABLE leagues (
  id              SERIAL PRIMARY KEY,
  api_football_id INTEGER UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  season          INTEGER NOT NULL,
  logo_url        TEXT,
  is_active       BOOLEAN DEFAULT TRUE
);

-- Teams
CREATE TABLE teams (
  id              SERIAL PRIMARY KEY,
  api_football_id INTEGER UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  code            VARCHAR(3),
  logo_url        TEXT,
  league_id       INTEGER REFERENCES leagues(id),
  group_name      VARCHAR(5),
  group_position  SMALLINT
);

-- Players
CREATE TABLE players (
  id              SERIAL PRIMARY KEY,
  api_football_id INTEGER UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  team_id         INTEGER REFERENCES teams(id),
  position        VARCHAR(20),
  number          SMALLINT,
  photo_url       TEXT
);

-- Match data (synced from API-Football)
CREATE TABLE matches (
  id              SERIAL PRIMARY KEY,
  api_football_id INTEGER UNIQUE NOT NULL,
  league_id       INTEGER REFERENCES leagues(id),
  home_team_id    INTEGER REFERENCES teams(id),
  away_team_id    INTEGER REFERENCES teams(id),
  home_score      SMALLINT,
  away_score      SMALLINT,
  status          VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  round           VARCHAR(30),
  kickoff_at      TIMESTAMPTZ NOT NULL,
  venue           VARCHAR(100),
  statistics      JSONB,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Match events (goals, cards, subs — timeline of in-game events)
CREATE TABLE match_events (
  id              BIGSERIAL PRIMARY KEY,
  match_id        INTEGER REFERENCES matches(id),
  event_type      VARCHAR(20) NOT NULL,
  minute          SMALLINT,
  player_name     VARCHAR(100),
  team_id         INTEGER REFERENCES teams(id),
  detail          JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Match lineups (starting XI + bench per team per match)
CREATE TABLE match_lineups (
  id              SERIAL PRIMARY KEY,
  match_id        INTEGER REFERENCES matches(id),
  team_id         INTEGER REFERENCES teams(id),
  player_name     VARCHAR(100),
  player_number   SMALLINT,
  position        VARCHAR(20),
  is_starter      BOOLEAN DEFAULT TRUE,
  UNIQUE(match_id, team_id, player_name)
);

-- Analytics events (user behavior tracking)
CREATE TABLE analytics_events (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID REFERENCES users(id),
  session_id      VARCHAR(36),
  event_type      VARCHAR(50) NOT NULL,
  event_data      JSONB,
  ip_country      VARCHAR(2),
  ip_city         VARCHAR(100),
  device_type     VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_players_name_trgm ON players USING GIN (name gin_trgm_ops);
CREATE INDEX idx_teams_name_trgm ON teams USING GIN (name gin_trgm_ops);
CREATE INDEX idx_match_events_match ON match_events(match_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_kickoff ON matches(kickoff_at);
CREATE INDEX idx_matches_league ON matches(league_id);
CREATE INDEX idx_lineups_match ON match_lineups(match_id);
CREATE INDEX idx_analytics_type_date ON analytics_events(event_type, created_at);

-- =============================================
-- AUTOMATION TABLES (load testing, reporting, incident tracking)
-- =============================================

-- Daily automated snapshots (populated by @Cron task at 3 AM daily)
CREATE TABLE daily_snapshots (
  id                    SERIAL PRIMARY KEY,
  snapshot_date         DATE UNIQUE NOT NULL,
  phase                 VARCHAR(20) NOT NULL,  -- 'load_test', 'cl_knockout', 'tournament'
  total_users           INTEGER,
  new_signups           INTEGER,
  daily_active_users    INTEGER,
  total_searches        INTEGER,
  searches_today        INTEGER,
  total_page_views      INTEGER,
  page_views_today      INTEGER,
  peak_sse_connections  INTEGER,
  avg_response_time_ms  NUMERIC(8,2),
  p95_response_time_ms  NUMERIC(8,2),
  cache_hit_rate        NUMERIC(5,2),
  kafka_max_lag_ms      INTEGER,
  api_football_errors   INTEGER,
  top_countries         JSONB,
  device_breakdown      JSONB,
  top_searched_players  JSONB,
  most_viewed_matches   JSONB,
  live_matches_today    INTEGER,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Load test run records (one row per k6 test execution)
CREATE TABLE load_test_runs (
  id                    SERIAL PRIMARY KEY,
  test_name             VARCHAR(100) NOT NULL,
  started_at            TIMESTAMPTZ NOT NULL,
  ended_at              TIMESTAMPTZ,
  virtual_users_peak    INTEGER,
  total_requests        INTEGER,
  requests_per_second   NUMERIC(8,2),
  error_rate_pct        NUMERIC(5,2),
  p50_response_ms       NUMERIC(8,2),
  p95_response_ms       NUMERIC(8,2),
  p99_response_ms       NUMERIC(8,2),
  kafka_max_lag_ms      INTEGER,
  redis_cache_hit_pct   NUMERIC(5,2),
  peak_sse_connections  INTEGER,
  max_pg_query_ms       NUMERIC(8,2),
  bottleneck_identified TEXT,
  passed                BOOLEAN,
  notes                 TEXT,
  config_json           JSONB
);

-- Automated incident log (populated by Grafana alert webhooks)
CREATE TABLE incidents (
  id                    SERIAL PRIMARY KEY,
  severity              VARCHAR(10) NOT NULL,
  metric_name           VARCHAR(100),
  threshold_value       NUMERIC,
  actual_value          NUMERIC,
  triggered_at          TIMESTAMPTZ NOT NULL,
  resolved_at           TIMESTAMPTZ,
  duration_seconds      INTEGER,
  phase                 VARCHAR(20),
  match_id              INTEGER,
  auto_description      TEXT,
  manual_notes          TEXT
);

CREATE INDEX idx_snapshots_date ON daily_snapshots(snapshot_date);
CREATE INDEX idx_snapshots_phase ON daily_snapshots(phase);
CREATE INDEX idx_load_tests_name ON load_test_runs(test_name);
CREATE INDEX idx_incidents_phase ON incidents(phase, triggered_at);
```

## 10. Load Testing Strategy (k6)

### Purpose

Prove the system can handle real traffic before the World Cup starts. Load testing happens automatically — you configure it once, it runs on schedule, and results are stored in Postgres (`load_test_runs` table) and Grafana Cloud. No manual intervention.

### k6 User Scenarios

k6 scripts simulate realistic user behavior, not just raw endpoint hammering. Each virtual user follows a journey:

```javascript
// k6/scenarios/casual-viewer.js — 60% of virtual users
// 1. Load home page
// 2. Click into a live match (SSE connection opens)
// 3. Stay 5-10 min (SSE held open, occasional page navigation)
// 4. Maybe check standings
// 5. Leave

// k6/scenarios/explorer.js — 25% of virtual users
// 1. Load home page
// 2. Browse standings
// 3. Click into a team page
// 4. View squad, form, upcoming matches
// 5. Check another group
// 6. Leave

// k6/scenarios/searcher.js — 10% of virtual users
// 1. Hit search (GET /search?q=mba — then mbap — then mbappe, simulating keystrokes)
// 2. View player page
// 3. Click to team page
// 4. Browse squad

// k6/scenarios/power-user.js — 5% of virtual users
// 1. All of the above in one session
// 2. Multiple live matches open
// 3. 30+ min session
```

### Simulating geographic diversity

Each k6 virtual user sends a custom header `X-Test-Country` with a weighted random country code. Your analytics middleware checks: if this header exists, use it instead of calling IP geolocation. This populates realistic geographic data in `analytics_events` without needing servers in multiple countries.

```javascript
// k6/helpers/geo.js
const COUNTRY_WEIGHTS = [
  { code: 'BD', weight: 40 },   // Bangladesh — 40%
  { code: 'US', weight: 20 },   // USA — 20%
  { code: 'CA', weight: 8 },    // Canada — 8%
  { code: 'AU', weight: 7 },    // Australia — 7%
  { code: 'GB', weight: 7 },    // UK — 7%
  { code: 'DE', weight: 5 },    // Germany — 5%
  { code: 'BR', weight: 5 },    // Brazil — 5%
  { code: 'FR', weight: 4 },    // France — 4%
  { code: 'IN', weight: 4 },    // India — 4%
];
```

During the real tournament, this header is absent and the middleware uses actual IP geolocation. No code change needed.

### Four progressive test levels

| Test | Virtual users | Duration | Purpose | When to run |
|------|--------------|----------|---------|-------------|
| **Baseline** | 50 | 10 min | Establish baseline metrics | After each major feature ships |
| **Expected** | 500 | 30 min | Validate expected tournament load | Weekly during testing phase |
| **Stress** | 2,000–5,000 | 30 min | Find the breaking point | 2–3 times total during testing |
| **Goal spike** | 500 steady → 2,000 burst in 30s → back to 500 | 15 min | Simulate traffic spike when a goal is scored | During live PL/La Liga matches for maximum realism |

### Automated execution

k6 tests are triggered by a simple cron job on the background worker. During the testing phase (weeks 6–10), the baseline test runs automatically whenever there's a live PL/La Liga/CL match. The stress and spike tests are run manually 2–3 times — these need your attention to interpret results.

After each k6 run finishes, a post-test script automatically:
1. Parses k6's JSON summary output
2. Inserts a row into `load_test_runs` with all the key metrics
3. Queries Prometheus for the corresponding time window to get Kafka lag, cache hit rate, SSE connections
4. Sets `passed = true/false` based on predefined thresholds (p95 < 500ms, error rate < 1%, consumer lag < 3s)
5. Auto-generates a `bottleneck_identified` string if any threshold was breached

You never have to look at raw k6 output. The `load_test_runs` table has clean, structured, pre-interpreted results.

### Thresholds for pass/fail

| Metric | Acceptable | Warning | Failure |
|--------|-----------|---------|---------|
| p95 response time | < 300ms | 300–500ms | > 500ms |
| Error rate | < 0.5% | 0.5–1% | > 1% |
| Kafka consumer lag | < 1s | 1–3s | > 3s |
| Redis cache hit rate | > 90% | 80–90% | < 80% |
| SSE connection success | > 99% | 95–99% | < 95% |

### What the article gets from load testing

The `load_test_runs` table gives you a clean table for the article like:

*"Pre-launch capacity testing results:"*

| Test | Users | Req/s | p95 | Error rate | Kafka lag | Cache hit | Result |
|------|-------|-------|-----|-----------|-----------|-----------|--------|
| Baseline | 50 | 120 | 45ms | 0% | 12ms | 98.1% | PASS |
| Expected | 500 | 1,100 | 89ms | 0.1% | 85ms | 96.4% | PASS |
| Stress | 2,000 | 3,800 | 210ms | 0.3% | 340ms | 94.7% | PASS |
| Spike | 500→2,000 | 4,200 peak | 380ms peak | 0.5% | 890ms peak | 91.2% | PASS |

One clean table. No interpretation needed. The numbers speak for themselves.

---

## 11. Automated Data Collection & Article Pipeline

Everything in this section runs automatically. You build it once (during Weeks 9–10) and never touch it again. When the tournament ends, you run a single script and get a clean, organized report-ready file.

### System 1: Daily Snapshots (scheduled task)

A cron job runs at 3 AM every day on your background worker. It:

1. Queries `analytics_events` for the past 24 hours and aggregates key numbers
2. Queries Prometheus (via Grafana Cloud API) for peak SSE connections, response times, cache hit rate, Kafka lag
3. Inserts one row into `daily_snapshots` with all aggregated data
4. Auto-generates a `notes` string summarizing the day, e.g.: *"Match day: 3 live matches. 1,240 page views. Peak 312 SSE connections. p95 response 67ms. No incidents."*

This means the raw `analytics_events` table (which could have millions of rows) is never queried during article writing. All the useful numbers are already pre-aggregated into clean daily summaries.

### System 2: Incident Auto-Logging (Grafana webhook)

Grafana Cloud alerts fire when metrics cross thresholds (consumer lag > 5s, error rate > 1%, cache hit rate < 80%, API-Football errors > 10/min). Each alert sends a webhook to your API endpoint `POST /api/admin/incidents`. This endpoint:

1. Creates a row in `incidents` with the metric name, threshold, actual value, and timestamp
2. Auto-generates a description: *"Kafka consumer lag exceeded 5000ms threshold (actual: 7200ms) during match 42 at 2026-06-18T19:34:00Z"*
3. When the alert resolves, Grafana sends another webhook → the endpoint updates `resolved_at` and calculates `duration_seconds`

You never need to be watching. Incidents are recorded automatically. When writing the article, you query the `incidents` table and get a complete log of everything that went wrong, when, for how long, and during which match.

### System 3: Grafana Automated Reports (email)

Grafana Cloud's built-in "Reporting" feature sends PDF snapshots of your dashboards on a schedule. Configure it to email you daily at midnight. The PDFs accumulate in your inbox. When it's article time, you open the PDFs from the most interesting days (knockout round matches, the final) and screenshot the graphs you want.

This also solves Grafana's 14-day metric retention on the free tier — the PDFs preserve the visual state of dashboards even after raw metrics expire.

### System 4: The Article Data Script (`scripts/generate-article-data.ts`)

This is the single script you run when the tournament ends. It connects to Postgres, runs all the pre-written queries, and outputs a single well-organized markdown file that you paste into Claude for article writing.

The output is structured into named sections with clear headings, not raw data dumps. Here's exactly what it produces:

```markdown
# Minute93 — Article Data Export
# Generated: 2026-07-20T10:00:00Z

## SECTION 1: USER & TRAFFIC OVERVIEW
- Total registered users: [N]
- Auth breakdown: Google [N]%, Email/Password [N]%

### Users by country (top 10):
| Country | Users | % of total |
|---------|-------|-----------|
| BD      | ...   | ...       |
| US      | ...   | ...       |

### Device breakdown:
| Device  | Sessions | % |
|---------|----------|---|
| Mobile  | ...      |   |
| Desktop | ...      |   |
| Tablet  | ...      |   |

## SECTION 2: ENGAGEMENT METRICS
- Average DAU during PL/La Liga testing phase: [N]
- Average DAU during CL knockout phase: [N]
- Peak concurrent users: [N] (CL Final, May 31)
- Average session duration (match day): [N] minutes
- Average session duration (non-match day): [N] minutes
- Total page views: [N]
- Most visited page: /match/[id] ([N]% of all views)
- Most viewed matches: [top 5 with view counts]
- Most viewed team pages: [top 5]
- Most viewed player pages: [top 5]

## SECTION 3: SEARCH & DISCOVERY
- Total searches: [N]
- Unique search queries: [N]
- Top 10 searched players: [list with counts]
- Top 10 searched teams: [list with counts]
- Average search results click-through rate: [N]%

## SECTION 4: INFRASTRUCTURE PERFORMANCE (from daily_snapshots)
### Response times over testing period:
| Phase | Avg p50 | Avg p95 | Peak p95 |
|-------|---------|---------|----------|
| Multi-league testing | ... | ... | ... |
| CL Quarter-finals | ... | ... | ... |
| CL Semi-finals | ... | ... | ... |
| CL Final | ... | ... | ... |

### Redis cache performance:
- Average cache hit rate: [N]%
- Lowest cache hit rate day: [date] at [N]%
- Total cache operations: [N]

### Kafka pipeline:
- Total events processed: [N]
- Average consumer lag: [N]ms
- Peak consumer lag: [N]ms (during [match])
- Consumer lag recovery time (avg): [N] seconds

### Nginx edge layer:
- Total requests proxied: [N]
- Gzip compression ratio: [N]%
- Requests rate-limited by Nginx: [N]
- SSE connections served: [N]

## SECTION 5: PRE-LAUNCH LOAD TEST RESULTS (from load_test_runs)
[Auto-formatted table from load_test_runs, one row per test]

## SECTION 6: INCIDENTS (from incidents table)
- Total incidents: [N]
- Critical incidents: [N]
- Average resolution time: [N] seconds
### Incident log:
| # | Severity | What happened | Duration | Match | Phase |
|---|----------|--------------|----------|-------|-------|
| 1 | warning  | Kafka lag > 5s | 12s | ARS vs BAR | load_test |
| ...

## SECTION 7: DAILY TRENDS (from daily_snapshots)
[One row per day — date, DAU, page views, searches, peak SSE, p95, cache hit, incidents]
```

This output is designed for Claude to read and write from directly. Each section maps to an article section. The data is pre-aggregated, clearly labeled, and includes context (which match, which phase). No raw row dumps. No ambiguity.

### What you do after the Champions League Final

1. Run `npx ts-node scripts/generate-article-data.ts` → produces `article-data.md`
2. Open Grafana email PDFs from the best match days → screenshot 5–8 key graphs
3. Open a Claude chat, paste the planning document + `article-data.md`
4. Say: "Here's my project plan and the data export. Help me write the technical article."
5. Claude has everything it needs — clean numbers, organized sections, incident log, load test results

---

## 12. Week-by-Week Build Timeline

**Available hours:** ~12 hours/week average (10–15 range)
**Build period:** March 24 – May 31 = ~10 weeks = ~120–150 hours
**Target event:** Champions League Final, May 31, 2026

---

### Phase 1: Foundation (Weeks 1–3, ~36 hours)

**Goal:** Basic Next.js app deployed on Render with auth, Postgres connected, core UI shell.

**Week 1 (Mar 21–27) — Project skeleton + Auth**
- [ ] Initialize monorepo with two projects: `apps/web` (Next.js 14 App Router) and `apps/api` (NestJS)
- [ ] Set up shadcn/ui + Tailwind in Next.js
- [ ] Set up NestJS with AuthModule: JWT strategy, Google OAuth strategy, Credentials strategy
- [ ] Build auth endpoints in NestJS: POST /auth/signup, /auth/login, /auth/google
- [ ] Password hashing with bcrypt, JWT signing, Google OAuth via Passport
- [ ] Set up local Postgres (Docker container or native install)
- [ ] Build signup/login pages in Next.js that call the NestJS auth API
- [ ] Deploy Next.js to Vercel, NestJS to Render (get CI/CD working early — never go more than a week without deploying)

**Week 2 (Mar 28 – Apr 3) — Data models + API-Football integration**
- [ ] Create all Postgres tables (matches, teams, players, match_events)
- [ ] Build NestJS MatchModule: MatchController + MatchService (GET /matches, /matches/:id)
- [ ] Build the API-Football client service in NestJS (typed API responses, injectable service)
- [ ] Write a one-time seed script: fetch all WC 2026 fixtures, teams, players from API-Football free tier → populate Postgres
- [ ] Build Next.js pages that call NestJS API: home (match list), match detail (static), team page, player page
- [ ] All pages server-rendered in Next.js, data fetched from NestJS API

**Week 3 (Apr 4–10) — UI polish + search**
- [ ] Build NestJS SearchModule: SearchController + SearchService (GET /search?q=...)
- [ ] Enable `pg_trgm` and build fuzzy search queries in SearchService
- [ ] Build search bar component in Next.js with debounced input + results dropdown (calls NestJS /search)
- [ ] Build group standings page (static from NestJS /standings endpoint)
- [ ] Build knockout bracket page (placeholder for future rounds)
- [ ] Mobile-responsive pass on all pages
- [ ] **Milestone: deployed app (Next.js + NestJS + Postgres) with auth, static match data, search, and standings**

---

### Phase 2: Kafka + Real-Time Pipeline (Weeks 4–6, ~36 hours)

**Goal:** Poller service running, Kafka pipeline operational, live data flowing.

**Week 4 (Apr 11–17) — Kafka + Redis setup**
- [ ] Set up Upstash Kafka (create topic: `match.events`)
- [ ] Set up Upstash Redis
- [ ] Build NestJS KafkaModule + RedisModule (injectable services for both)
- [ ] Build the Poller Service (separate Node.js worker, shares config with NestJS but runs independently):
  - Polls API-Football at configurable intervals
  - Accepts an array of league IDs from env vars (multi-league support from day one)
  - Deduplicates events via Redis Set
  - Produces to Kafka topic
- [ ] Build NestJS Kafka consumer #1: CacheUpdaterConsumer (writes live scores to Redis)
- [ ] Build a **mock event generator** script that produces fake match events into Kafka (for testing pipeline without burning API calls)
- [ ] Test full pipeline locally with mock data

**Week 5 (Apr 18–24) — More consumers + SSE**
- [ ] Build NestJS Kafka consumer #2: PostgresWriterConsumer (historical record of events)
- [ ] Build NestJS Kafka consumer #3: StatsAggregatorConsumer (refreshes materialized views)
- [ ] Build SSE endpoint in NestJS MatchGateway (match.gateway.ts)
- [ ] SSE subscribes to Redis Pub/Sub, pushes match events to connected clients
- [ ] Build client-side SSE listener in Next.js + real-time UI updates on match page
- [ ] Deploy poller as Render Background Worker, NestJS as separate Web Service
- [ ] Test end-to-end with mock data: fake goal → Kafka → NestJS consumers → Redis → SSE → Next.js browser updates

**Week 6 (Apr 25 – May 1) — Multi-league live integration testing**
- [ ] Upgrade API-Football to Pro plan ($19/mo)
- [ ] Configure poller to track **PL (league 39) + La Liga (league 140) + CL (league 2)** simultaneously
- [ ] Run the full pipeline against real live matches: poller → Kafka → consumers → Redis → SSE → browser
- [ ] Build match detail page with live event timeline (goals, cards, subs updating in real-time)
- [ ] Build "live" indicator on home page for active matches
- [ ] Redis cache-aside for match metadata (team info, standings)
- [ ] **Milestone: real-time pipeline working end-to-end against real live data from multiple leagues**

---

### Phase 3: Nginx, Docker & Hardening (Weeks 7–8, ~24 hours)

**Goal:** Dockerize the NestJS API behind Nginx reverse proxy. Harden all services for production.

**Week 7 (May 2–8) — Docker + Nginx setup**
- [ ] Write Dockerfile for NestJS API: multi-stage build (build TypeScript → production image with Nginx + Node)
- [ ] Write nginx.conf: reverse proxy to NestJS on localhost:3000, gzip, security headers, rate limiting
- [ ] Configure Nginx SSE route with `proxy_buffering off` (critical for live events)
- [ ] Test locally: Docker container runs Nginx → NestJS, SSE events stream correctly
- [ ] Deploy Dockerized NestJS to Render as a Docker-based Web Service
- [ ] Verify full pipeline: poller → Kafka → NestJS consumers → Redis → Nginx → SSE → browser

**Week 8 (May 9–15) — Hardening + error handling**
- [ ] Error handling pass across all NestJS modules: centralized HttpExceptionFilter
- [ ] Graceful degradation: if Redis cache miss, fall back to Postgres
- [ ] If API-Football is down, serve stale cached data + show "last updated X seconds ago"
- [ ] Request validation: class-validator DTOs on all endpoints
- [ ] Correlation IDs: pass request ID through the call chain (NestJS interceptor)
- [ ] Profile page: user's match views, favorite team, account settings
- [ ] Rate limiting review: Nginx layer + NestJS ThrottlerGuard (defense in depth)
- [ ] **Milestone: Dockerized NestJS behind Nginx, all error paths handled, deployed**

---

### Phase 4: Analytics, Observability & Automation (Weeks 9–10, ~24 hours)

**Goal:** Private analytics dashboard, Grafana observability, k6 load testing, and all automation systems operational.

**Week 9 (May 16–22) — Analytics pipeline + automation tables**
- [ ] Build NestJS AnalyticsModule: tracking.middleware.ts logs every request to analytics_events
- [ ] IP geolocation on signup (ip-api.com free tier); respect `X-Test-Country` header for load tests
- [ ] Create automation tables: `daily_snapshots`, `load_test_runs`, `incidents`
- [ ] Build NestJS SnapshotService: scheduled task (NestJS @Cron decorator, runs at 3 AM, aggregates previous day into one row)
- [ ] Build NestJS AdminGuard protecting /admin/* routes
- [ ] Build analytics dashboard pages in Next.js (calls NestJS /admin/analytics/* endpoints):
  - User overview (signups/day, auth method split)
  - Geography (users by country table/chart)
  - Engagement (DAU, session duration, popular pages)
  - Feature usage (search queries, most viewed matches, most viewed teams/players)
- [ ] Build incident webhook endpoint in NestJS (`POST /admin/incidents`) for Grafana alerts

**Week 10 (May 23–29) — Grafana, k6, and article data script**
- [ ] Set up Grafana Cloud free tier
- [ ] Build NestJS PrometheusInterceptor (common/interceptors/prometheus.interceptor.ts) recording:
  - API response times (histogram, labeled by route)
  - Kafka consumer lag (gauge)
  - Redis cache hit/miss ratio (counter)
  - Active SSE connections (gauge)
  - Poller cycle duration (histogram)
- [ ] Expose /metrics endpoint in NestJS for Grafana Cloud scraping
- [ ] Build Grafana dashboards: Live Operations, Traffic Overview, Performance
- [ ] Configure Grafana alerting → webhook to incidents endpoint
- [ ] Configure Grafana automated daily report (PDF emailed at midnight)
- [ ] Write k6 test scenarios (casual-viewer, stats-browser, searcher, power-user)
- [ ] Build k6 post-test script (parses results → inserts into `load_test_runs`)
- [ ] Run first baseline load test (50 users) against live PL/La Liga data to validate the whole pipeline
- [ ] Build `scripts/generate-article-data.ts` — the single script that produces the report-ready markdown
- [ ] Test the article script against current test data to verify output format
- [ ] **Milestone: full observability, analytics, load testing, and automated data collection operational**

---

### Phase 5: Load Testing, Narrowing Down + CL Final (Weeks 11–12, ~24 hours)

**Week 11 (May 30 – Jun 5) — Load tests + Champions League Final**
- [ ] Run **Expected load test** (500 users, 30 min) during a live match — verify all metrics are in acceptable range
- [ ] Run **Stress test** (2,000–5,000 users, 30 min) — find the breaking point, document bottlenecks
- [ ] Run **Goal spike test** (500 → 2,000 burst) during a live match — validate spike absorption
- [ ] Review `load_test_runs` table — all tests should show PASS; fix any failures
- [ ] Turn off PL and La Liga polling — focus on Champions League only
- [ ] **May 31: Champions League Final** — full end-to-end test with real data + k6 baseline running alongside. This is the main event. Everything is recorded.
- [ ] SEO: Open Graph tags, meta descriptions for match pages (shareability)
- [ ] **Milestone: load tests all passing, CL Final successfully handled, system validated to handle 5,000+ concurrent users**

**Week 12 (Jun 1–7) — Article writing prep + optional World Cup cutover**
- [ ] Run `scripts/generate-article-data.ts` → produces `article-data.md`
- [ ] Collect Grafana PDF screenshots from CL Final and best match days
- [ ] Write the technical article (with Claude's help)
- [ ] **Optional — World Cup cutover (only if you want to keep the app live):**
  - Turn off CL polling
  - Wipe test match data (keep user accounts + analytics + load_test_runs + daily_snapshots + incidents)
  - Flush Redis cache
  - Upgrade API-Football to Ultra plan ($29/mo)
  - Seed World Cup 2026 fixtures, teams, players
  - Update ACTIVE_LEAGUES env var to World Cup (league ID 1) only
  - Redeploy — Minute93 is now a live World Cup platform
- [ ] **Milestone: article written, portfolio piece complete. World Cup deployment is a bonus.**

---

### Phase 6: Article Writing (June 2026)

**Step 1 — Generate the data export (5 minutes):**
```bash
npx ts-node scripts/generate-article-data.ts > article-data.md
```
This produces a single, organized markdown file with every number you need, pre-aggregated into named sections. See Section 11 for the exact output format.

**Step 2 — Collect Grafana visuals (15 minutes):**
Open the Grafana PDF emails from the most interesting match days (CL semi-finals, CL Final, any day with an incident). Screenshot 5–8 key graphs: consumer lag during a goal, SSE connection spike, cache hit rate trends, response time distribution.

**Step 3 — Write the article with Claude:**
Open a Claude chat. Paste:
1. This planning document (for architecture context and "Considered But Rejected" sections)
2. The `article-data.md` file (all the numbers)
3. The Grafana screenshots (describe what's in each one)
4. Say: "Help me write the technical article. Here's the plan, the data, and the key graphs."

Claude will have everything organized, pre-aggregated, and clearly labeled — no ambiguity, no misinterpretation. Each section in `article-data.md` maps directly to an article section.

**Article structure:**
- [ ] Architecture overview (from this planning doc)
- [ ] Multi-database justification with real query patterns (from this doc + data export Section 5)
- [ ] Pre-launch capacity testing results (from data export Section 6 — the load test table)
- [ ] Real traffic analysis — user demographics, engagement, search patterns (from data export Sections 1–4)
- [ ] Infrastructure under load — response times, Kafka lag, cache hit rates (from data export Section 5 + Grafana graphs)
- [ ] Incident retrospectives — what broke and how it was fixed (from data export Section 7 + your manual notes)
- [ ] Technology choices: what was rejected and why (from this planning doc Section 13)
- [ ] Future plans: World Cup 2026 deployment (mention as next step)
- [ ] Lessons learned / what I'd do differently

---

## 13. "Considered But Rejected" — Article Section Outline

This section demonstrates architectural judgment, which is more valuable than showing you can use many tools.

**Elasticsearch rejected for search:**
"With ~880 searchable entities (832 players + 48 teams), Postgres pg_trgm handles fuzzy search in sub-millisecond time. Adding Elasticsearch would mean operating a JVM-heavy cluster ($95+/month), maintaining an indexing pipeline, and managing eventual consistency — all for zero performance gain at this data volume. ES would be justified at ~100K+ documents requiring complex full-text queries with relevance scoring."

**Elasticsearch rejected for analytics:**
"Analytics queries are structured aggregations on a known schema — GROUP BY country, time-bucketed counts, TOP N queries. Postgres with proper indexes and materialized views handles these efficiently. Elasticsearch's strength is unstructured, high-cardinality full-text search across massive datasets — neither requirement applies here."

**Cassandra rejected for comments/events:**
"Write spikes during goals are absorbed by Kafka before reaching the database, so the downstream store never sees the raw spike. At actual throughput (~100–500 events/minute peak), Postgres handles this trivially. Cassandra's operational complexity (compaction tuning, repair scheduling, tombstone management, JVM tuning) is substantial. A solo developer operating Cassandra alongside Kafka, Redis, and Postgres during a live tournament would be reckless."

**MongoDB rejected:**
"Every data model in this system is clearly relational (users, teams, players, matches, match_events — all with foreign key relationships) or suited to a specialized store (Redis for caching and pub/sub, Kafka for event streaming). There is no document-shaped data that doesn't fit a relational model."

**WebSockets rejected in favor of SSE:**
"All real-time communication is server-to-client only (score updates, new events). SSE is simpler to implement, works over standard HTTP, reconnects automatically, and doesn't require a separate server or protocol upgrade. WebSockets would be justified if we needed bidirectional real-time communication (e.g., live chat)."

**Next.js API routes rejected in favor of NestJS:**
"Next.js API routes would have been faster to ship — single codebase, no separate deployment. But the backend has 4 Kafka consumers, 4 Redis usage patterns, scheduled tasks, Prometheus instrumentation, Nginx reverse proxy, and auth guards. That level of complexity benefits from NestJS's module system, dependency injection, and decorator-based guards/interceptors. The clean module boundaries (AuthModule, MatchModule, SearchModule, KafkaModule, RedisModule, AnalyticsModule) made the codebase navigable as it grew. For a simpler app with 2-3 CRUD endpoints, Next.js API routes would have been the right call."

---

## 14. Route Structure

### Next.js Frontend Pages (apps/web)

```
/                           → Home: today's matches, live matches highlighted, recent results
/match/[id]                 → Match detail: live/final score, event timeline, lineups, stats
/standings                  → League/group standings tables
/top-scorers                → Tournament-wide top scorers ranking
/team/[id]                  → Team page: squad, recent form, results, upcoming matches
/player/[id]                → Player page: stats, match history, position, team
/results                    → All completed matches with scores and links to detail
/schedule                   → Upcoming fixtures by date
/search                     → Player/team fuzzy search
/profile                    → User's favorite team, account settings
/auth/login                 → Login page (Google + email/password)
/auth/signup                → Signup page (email/password)
/auth/reset-password        → Password reset flow
/admin/analytics            → Private analytics dashboard (admin only)
/admin/analytics/users      → User demographics
/admin/analytics/engagement → Usage metrics
/admin/analytics/technical  → System health
```

### NestJS API Endpoints (apps/api — behind Nginx)

```
POST   /auth/signup             → Create account with email/password
POST   /auth/login              → Login, returns JWT
GET    /auth/google             → Google OAuth redirect
GET    /auth/google/callback    → Google OAuth callback, returns JWT
POST   /auth/reset-password     → Request password reset
POST   /auth/reset-password/confirm → Confirm reset with token

GET    /matches                 → List matches (filterable by status, date, league, round)
GET    /matches/live            → Currently live matches (from Redis cache)
GET    /matches/results         → Completed matches with final scores
GET    /matches/schedule        → Upcoming fixtures
GET    /matches/:id             → Match detail with events, lineups, stats
GET    /matches/:id/events      → SSE endpoint — live event stream (Nginx: proxy_buffering off)

GET    /teams                   → All teams (with group/league info)
GET    /teams/:id               → Team detail: squad, form, results
GET    /players/:id             → Player detail: stats, match history

GET    /search?q=               → Fuzzy search players + teams (pg_trgm)

GET    /standings               → League/group standings (from materialized view)
GET    /top-scorers             → Top scorers ranking (from materialized view)

GET    /admin/analytics/overview     → User + traffic summary (AdminGuard)
GET    /admin/analytics/geography    → Users by country (AdminGuard)
GET    /admin/analytics/engagement   → DAU, session duration, etc. (AdminGuard)
GET    /admin/analytics/features     → Search + match view usage (AdminGuard)
POST   /admin/incidents              → Grafana alert webhook (AdminGuard)

GET    /health                  → Health check (for Render + monitoring)
GET    /metrics                 → Prometheus metrics (for Grafana scraping)
```

---

## 15. Key Architectural Decisions Summary

| Decision | Choice | Why |
|----------|--------|-----|
| Frontend | Next.js (not Telegram) | Clickable portfolio link, visual real-time updates, better for target markets |
| Backend framework | NestJS (not Next.js API routes) | Proper service layer with DI, guards, interceptors, module boundaries. Enterprise-grade architecture. |
| Reverse proxy | Nginx (in front of NestJS) | Gzip, security headers, edge rate limiting, SSE buffering control. Standard production practice. |
| Auth | NestJS AuthModule + JWT + Google OAuth + Credentials | Demonstrates real auth knowledge, dual-provider, guards, strategies |
| Event backbone | Kafka (Upstash) | Fan-out, decoupling, replay, ordering — same Kafka client code works with managed Kafka in production |
| Cache / Pub/Sub | Redis (Upstash) | 4 distinct patterns (cache-aside, rate limiting, pub/sub, dedup), each justified |
| Primary database | PostgreSQL (local dev / Render Postgres prod) | Relational data, pg_trgm for search, materialized views for stats/standings |
| Search | pg_trgm (not Elasticsearch) | ~1,000 entities doesn't justify ES complexity |
| Analytics | Postgres + Grafana (not ES) | Structured aggregations, known schema |
| Real-time push | SSE (not WebSocket) | Unidirectional, simpler, auto-reconnect |
| Load testing | k6 (not JMeter, Artillery) | JS-native, Grafana-native integration, free, realistic scenario scripting |
| Data collection | Automated snapshots + incident logging | Zero manual monitoring; report script produces clean output for article writing |
| Hosting | Vercel (frontend) + Render (API + worker) | Next.js on Vercel is the natural pairing; Render handles NestJS + Docker + background worker |
| UI | shadcn/ui + Tailwind | Professional look, fast to build, accessible components |
| Monitoring | Grafana Cloud free tier | Real dashboards for the article, zero cost, automated PDF reports |

---

## 16. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| API-Football rate limited or down during match | Medium | High | Redis cache has TTL-based fallback; show "last updated X seconds ago" in UI; alert in Grafana; battle-tested against PL/La Liga/CL before CL Final |
| Kafka consumer falls behind during peak | Low | Medium | Monitor consumer lag; Upstash Kafka auto-scales; events are idempotent so replay is safe; validated during multi-league testing with 10+ concurrent matches |
| Render Postgres free tier hits storage limit | Low | Medium | Prune analytics_events older than 60 days; monitor storage usage |
| Time crunch — not all features ready by CL Final | Medium | High | Features are ordered by priority; live feed + stats pages are core; analytics dashboard can be simplified if needed |
| Low traffic / no real users | Medium | Medium | k6 load tests provide synthetic proof regardless; even 50 real users + k6 synthetic load produces a compelling article |
| Render cold starts causing latency spikes | Medium | Low | Keep poller on always-on worker; web service on paid tier eliminates cold starts |
| Nginx misconfiguration breaks SSE | Low | High | Test SSE through Nginx locally in Docker before deploying; specific test case for live event streaming through proxy |

---

*Plan generated March 24, 2026. Start building immediately — Week 1 begins this week.*
