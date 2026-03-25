# External Services Setup Guide

Step-by-step instructions for setting up every external service Minute93 depends on. Follow each section in order.

> **What you need right now vs later:**
> - **Now (Phase 1):** PostgreSQL (already running via Docker)
> - **Phase 1, Step 3:** API-Football (for seeding data)
> - **Phase 1, Step 2:** Google OAuth (for auth module)
> - **Phase 2:** Upstash Kafka + Redis
> - **Phase 4:** Grafana Cloud

You can set them all up now or come back to each section when needed.

---

## 1. API-Football

API-Football is our data source for live scores, fixtures, teams, and players.

### Sign up

1. Go to [api-football.com](https://www.api-football.com/) — **NOT** RapidAPI (direct is cheaper)
2. Click **Get started** or **Pricing**
3. Sign up for the **Free** plan (100 requests/day) — this is enough for building and seeding data
4. After signup, go to your **Dashboard** → you'll see your API key on the main page

### Test your key

Open a terminal and run:

```bash
curl -s -H "x-apisports-key: YOUR_KEY" \
  "https://v3.football.api-sports.io/status" | json_pp
```

You should see your account details, remaining requests, etc.

Try fetching Champions League teams:

```bash
curl -s -H "x-apisports-key: YOUR_KEY" \
  "https://v3.football.api-sports.io/teams?league=2&season=2025" | json_pp
```

### Update your .env

```env
API_FOOTBALL_KEY=your-actual-key-here
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
```

### Plan upgrades

| Phase | Plan | Cost | Requests/day |
|-------|------|------|-------------|
| Building (now) | Free | $0 | 100 |
| Live testing (mid April) | Pro | $19/mo | 7,500 |
| Tournament (if continuing) | Ultra | $29/mo | 75,000 |

---

## 2. Google Cloud OAuth

Google OAuth lets users sign in with their Google account.

### Create a project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Click the project dropdown (top-left) → **New Project**
3. Name: `Minute93` → **Create**
4. Make sure the new project is selected in the dropdown

### Set up OAuth consent screen

1. In the left sidebar: **APIs & Services** → **OAuth consent screen**
2. Click **Get Started** or **Configure Consent Screen**
3. Fill in:
   - **App name:** `Minute93`
   - **User support email:** your email
   - **App type**: External
4. Under **Audience** select **External** → **Create**
5. Under **Data Access/Scopes**, add:
   - `email`
   - `profile`
   - `openid`
6. Under **Authorized domains**, add: `minute93.com`
7. Save

### Create OAuth credentials

1. In the left sidebar: **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth 2.0 Client ID**
3. **Application type:** Web application
4. **Name:** `Minute93 Web`
5. **Authorized redirect URIs** — add both:
   ```
   http://localhost:3000/auth/google/callback
   https://api.minute93.com/auth/google/callback
   ```
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### Update your .env

```env
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

---

## 3. Upstash Redis

Redis is used for caching, rate limiting, pub/sub (SSE), and event deduplication.

### Create a Redis database

1. Go to [console.upstash.com](https://console.upstash.com/) → sign up (GitHub or email)
2. Click **Redis** in the sidebar → **Create Database**
3. Fill in:
   - **Name:** `minute93-redis`
   - **Type:** Regional
   - **Region:** Pick the closest to your Render deployment region (US-East-1 is a safe default)
   - **Eviction:** Enable (uses LRU eviction when memory is full — fine for cache)
4. Click **Create**

### Get your credentials

On the database details page, you'll see several connection options:

- **Redis URL** (starts with `rediss://`) — this is what NestJS uses via ioredis
- **REST URL** and **REST Token** — alternative HTTP-based access

Copy all three.

### Update your .env

```env
REDIS_URL=rediss://default:your-password@your-instance.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token
```

> **Note:** Upstash Redis URLs start with `rediss://` (double s) for TLS. This is correct.

---

## 4. Upstash Kafka

Kafka is our event backbone — the poller produces match events, and four NestJS consumers process them.

### Create a Kafka cluster

1. In the same [Upstash console](https://console.upstash.com/), click **Kafka** in the sidebar
2. Click **Create Cluster**
3. Fill in:
   - **Name:** `minute93-kafka`
   - **Region:** Same region as your Redis instance
   - **Type:** Single replica (cheapest, fine for this scale)
4. Click **Create**

### Create the topic

1. Once the cluster is created, click on it
2. Go to the **Topics** tab → **Create Topic**
3. Fill in:
   - **Name:** `match.events`
   - **Partitions:** `8` (enables parallel consumption, partitioned by match_id)
   - **Retention time:** `86400000` (24 hours in ms — we persist to Postgres, so short retention is fine)
   - **Retention size:** Default is fine
   - **Max message size:** Default (1 MB) is fine
4. Click **Create**

### Get your credentials

Go to the cluster **Details** tab. You'll see:

- **REST URL** (starts with `https://`)
- **REST Username**
- **REST Password**

### Update your .env

```env
UPSTASH_KAFKA_REST_URL=https://your-kafka-instance.upstash.io
UPSTASH_KAFKA_REST_USERNAME=your-kafka-username
UPSTASH_KAFKA_REST_PASSWORD=your-kafka-password
KAFKA_TOPIC=match.events
```

---

## 5. Grafana Cloud

Grafana gives us observability dashboards, alerting, and automated PDF reports. **This is not needed until Phase 4** — set it up then, or now if you want to get it out of the way.

### Sign up

1. Go to [grafana.com](https://grafana.com/) → **Create free account**
2. The free tier includes:
   - 10,000 metric series
   - 50 GB logs
   - 50 GB traces
   - 14-day metric retention
   - Automated PDF reports (preserves dashboard state beyond retention)

### What you'll get

After signup, you'll have a Grafana Cloud instance at a URL like `https://yourname.grafana.net`. You'll configure it during Phase 4 to:

1. **Scrape metrics** from NestJS via a `/metrics` Prometheus endpoint
2. **Build dashboards** for live operations, traffic, and performance
3. **Set up alerting** — when metrics cross thresholds, Grafana sends a webhook to `POST /admin/incidents`
4. **Schedule daily PDF reports** — emailed at midnight, preserving dashboard snapshots beyond the 14-day retention

### What to note down

From your Grafana Cloud instance, you'll eventually need:

```env
PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod.grafana.net/api/prom/push
GRAFANA_API_KEY=your-grafana-api-key
GRAFANA_CLOUD_URL=https://yourname.grafana.net
```

Don't worry about these until Phase 4. They're commented out in `server/.env.example`.

---

## Quick Reference: All Environment Variables

Once you've set up everything, your `server/.env` should have all these filled in. See `server/.env.example` for the full template with comments.

| Variable | Source | Needed by |
|----------|--------|-----------|
| `DATABASE_*` | Your Docker Postgres | Phase 1 (now) |
| `JWT_SECRET` | Generate a random string | Phase 1 |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Phase 1 |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Phase 1 |
| `API_FOOTBALL_KEY` | api-football.com dashboard | Phase 1 |
| `REDIS_URL` | Upstash Redis details page | Phase 2 |
| `UPSTASH_KAFKA_*` | Upstash Kafka details page | Phase 2 |
| `GRAFANA_*` | Grafana Cloud instance | Phase 4 |

Your `client/.env.local` only needs API URLs — see `client/.env.example`.
