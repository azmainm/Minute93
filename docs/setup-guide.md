# External Services Setup Guide

Step-by-step instructions for setting up every external service Minute93 depends on.

> **What you need right now vs later:**
> - **Now (Phase 1):** PostgreSQL + Redis + Redpanda all run via `docker compose up -d`
> - **Phase 1, Step 3:** API-Football (for seeding data)
> - **Phase 1, Step 2:** Google OAuth (for auth module)
> - **Phase 4:** Grafana Cloud

---

## 1. Local Development Infrastructure

Everything runs in Docker. One command:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port 5432 (user: `postgres`, password: `dev`, db: `minute93`)
- **Redis 7** on port 6379 (no password)
- **Redpanda** (Kafka API) on port 19092

To create the Kafka topic (first time only):
```bash
docker exec minute93-redpanda rpk topic create match.events --partitions 8
```

To run the database schema (first time only):
```bash
docker exec -i minute93-postgres psql -U postgres -d minute93 < server/database/schema.sql
```

To stop everything: `docker compose down`
To reset everything: `docker compose down -v` (deletes all data)

---

## 2. API-Football

API-Football is our data source for live scores, fixtures, teams, and players.

### Sign up

1. Go to [api-football.com](https://www.api-football.com/) — **NOT** RapidAPI (direct is cheaper)
2. Click **Get started** or **Pricing**
3. Sign up for the **Free** plan (100 requests/day) — enough for building and seeding
4. After signup, go to your **Dashboard** → you'll see your API key on the main page

### Test your key

```bash
curl -s -H "x-apisports-key: YOUR_KEY" \
  "https://v3.football.api-sports.io/status" | json_pp
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

## 3. Google Cloud OAuth

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
5. Under **Data Access/Scopes**, add: `email`, `profile`, `openid`
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

## 4. Grafana Cloud

Grafana gives us observability dashboards, alerting, and automated PDF reports. **Not needed until Phase 4.**

### Sign up

1. Go to [grafana.com](https://grafana.com/) → **Create free account**
2. Free tier: 10K metric series, 50 GB logs, 50 GB traces, 14-day retention

### What you'll configure (Phase 4)

1. Scrape metrics from NestJS via `/metrics` Prometheus endpoint
2. Build dashboards for live operations, traffic, and performance
3. Set up alerting → webhook to `POST /admin/incidents`
4. Schedule daily PDF reports (preserves dashboard state beyond 14-day retention)

### Env vars (Phase 4)

```env
PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod.grafana.net/api/prom/push
GRAFANA_API_KEY=your-grafana-api-key
GRAFANA_CLOUD_URL=https://yourname.grafana.net
```

---

## Quick Reference: All Environment Variables

| Variable | Source | Needed by |
|----------|--------|-----------|
| `DATABASE_*` | Docker Postgres (automatic via docker-compose) | Phase 1 (now) |
| `JWT_SECRET` | Generate a random string | Phase 1 |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Phase 1 |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Phase 1 |
| `API_FOOTBALL_KEY` | api-football.com dashboard | Phase 1 |
| `REDIS_URL` | Docker Redis (automatic via docker-compose) | Phase 2 (now local) |
| `KAFKA_BROKERS` | Docker Redpanda (automatic via docker-compose) | Phase 2 (now local) |
| `GRAFANA_*` | Grafana Cloud instance | Phase 4 |

For production env vars, see `.claude/docs/production-setup.md`.
