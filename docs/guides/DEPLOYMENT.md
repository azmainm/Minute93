# Minute93 — Production Deployment Guide

Full step-by-step instructions to deploy every component of the Minute93 platform to production.

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Vercel      │     │   Render         │     │  Redpanda Cloud  │
│   (Frontend)  │────▶│   (Backend API)  │────▶│  (Kafka)         │
│   Next.js     │     │   NestJS+Nginx   │     │  match.events    │
└──────────────┘     └──────────────────┘     └──────────────────┘
                            │       │
                     ┌──────┘       └──────┐
                     ▼                     ▼
              ┌──────────────┐     ┌──────────────┐
              │ Render       │     │ Render        │
              │ PostgreSQL   │     │ Key-Value     │
              │              │     │ (Redis)       │
              └──────────────┘     └──────────────┘
```

| Component | Platform | Plan | Estimated Cost |
|-----------|----------|------|----------------|
| Frontend | Vercel | Hobby (free) or Pro ($20/mo) | $0–20/mo |
| Backend API | Render | Starter ($7/mo) or Standard ($25/mo) | $7–25/mo |
| PostgreSQL | Render | Starter ($7/mo) | $7/mo |
| Redis | Render | Starter (free) or Paid ($10/mo) | $0–10/mo |
| Kafka | Redpanda Cloud | Serverless (free tier) | $0/mo |
| Domain | Namecheap | Already purchased | — |
| Monitoring | Grafana Cloud | Free tier | $0/mo |
| Data API | API-Football | Pro ($9.99/mo) for live data | $9.99/mo |

**Total range:** ~$24–72/month depending on plan choices.

---

## Step 1: PostgreSQL on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **PostgreSQL**
2. Configure:
   - **Name:** `minute93-db`
   - **Database:** `minute93`
   - **User:** `minute93_user`
   - **Region:** Pick closest to your target users (e.g., Ohio for US East, Frankfurt for EU)
   - **Plan:** Starter ($7/mo, 1 GB storage, 97 connections) — sufficient for this app
3. Click **Create Database**
4. Once provisioned, copy the **Internal Database URL** (starts with `postgres://...`) — you'll use this as `DATABASE_URL` for the backend
5. Also copy the **External Database URL** — you'll need this temporarily to run the schema migration from your local machine

### Run the schema migration

```bash
cd server

# Use the EXTERNAL URL (temporary, for initial setup only)
DATABASE_URL="postgres://minute93_user:PASSWORD@HOST:5432/minute93" \
  npx tsx -e "
    import 'dotenv/config';
    import { readFileSync } from 'fs';
    import pg from 'pg';
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const schema = readFileSync('database/schema.sql', 'utf-8');
    await pool.query(schema);
    console.log('Schema applied');
    await pool.end();
  "
```

If the `npx tsx` approach gives issues, you can also just connect with `psql` and paste the schema:

```bash
psql "postgres://minute93_user:PASSWORD@HOST:5432/minute93" < database/schema.sql
```

---

## Step 2: Redis on Render

1. In Render Dashboard → **New** → **Key-Value** (this is their Redis offering)
2. Configure:
   - **Name:** `minute93-redis`
   - **Region:** Same region as your PostgreSQL
   - **Plan:** Free tier (25 MB) works for development/testing; Starter ($10/mo, 100 MB) recommended for production
3. Click **Create Key-Value**
4. Copy the **Internal Redis URL** (starts with `redis://...`) — this becomes your `REDIS_URL`

---

## Step 3: Kafka on Redpanda Cloud

Redpanda Cloud provides managed Kafka-compatible streaming. The serverless tier is free and handles our workload easily.

1. Go to [cloud.redpanda.com](https://cloud.redpanda.com) → Sign up / Log in
2. Click **Create Cluster** → **Serverless**
3. Configure:
   - **Cluster name:** `minute93`
   - **Region:** Same region as your Render services
4. Once the cluster is created, go to the **Topics** tab:
   - Create topic: `match.events` with 8 partitions
5. Go to **Security** → **Create User**:
   - Username: `minute93`
   - Create an ACL granting this user read/write on `match.events` and consumer group `minute93-*`
6. Copy the connection details:
   - **Bootstrap server:** something like `abc123.cloud.redpanda.com:9092`
   - **SASL mechanism:** `SCRAM-SHA-256`
   - **Username / Password:** from the user you created

These become your env vars:

```env
KAFKA_BROKERS=abc123.cloud.redpanda.com:9092
KAFKA_SSL=true
KAFKA_SASL_USERNAME=minute93
KAFKA_SASL_PASSWORD=your-password
KAFKA_TOPIC=match.events
```

### Verify the Kafka service supports SASL/SSL

Check `server/src/kafka/kafka.service.ts` — it should already read `KAFKA_SSL`, `KAFKA_SASL_USERNAME`, and `KAFKA_SASL_PASSWORD` from env and configure the KafkaJS client accordingly. If not, the relevant config block looks like:

```typescript
const kafkaConfig: KafkaConfig = {
  brokers: brokers.split(','),
  ...(process.env.KAFKA_SSL === 'true' && {
    ssl: true,
    sasl: {
      mechanism: 'scram-sha-256',
      username: process.env.KAFKA_SASL_USERNAME!,
      password: process.env.KAFKA_SASL_PASSWORD!,
    },
  }),
};
```

---

## Step 4: Backend API on Render

The backend deploys as a Docker container using the existing `server/Dockerfile`.

1. In Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repo (`azmainm/Minute93`)
3. Configure:
   - **Name:** `minute93-api`
   - **Region:** Same as your database
   - **Runtime:** **Docker**
   - **Docker context:** `./server` (the Dockerfile is inside the server directory)
   - **Dockerfile path:** `./server/Dockerfile`
   - **Plan:** Starter ($7/mo) for testing, Standard ($25/mo) for production load testing
4. Set environment variables (under **Environment**):

```env
NODE_ENV=production
PORT=3000

# Database (use the INTERNAL URL from Step 1)
DATABASE_URL=postgres://minute93_user:PASSWORD@minute93-db:5432/minute93

# Auth
JWT_SECRET=GENERATE_A_STRONG_RANDOM_STRING_HERE
JWT_EXPIRATION=7d
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://minute93-api.onrender.com/auth/google/callback

# API-Football
API_FOOTBALL_KEY=your-api-key
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
ACTIVE_LEAGUES=2
POLL_INTERVAL_LIVE=30000
POLL_INTERVAL_IDLE=300000
POLL_SEASON=2025

# Redis (use the INTERNAL URL from Step 2)
REDIS_URL=redis://red-XXXXX:6379

# Kafka / Redpanda Cloud (from Step 3)
KAFKA_BROKERS=abc123.cloud.redpanda.com:9092
KAFKA_SSL=true
KAFKA_SASL_USERNAME=minute93
KAFKA_SASL_PASSWORD=your-password
KAFKA_TOPIC=match.events

# Rate limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
AUTH_THROTTLE_TTL=900000
AUTH_THROTTLE_LIMIT=3

# CORS (your Vercel frontend URL — update after Step 5)
CLIENT_URL=https://minute93.vercel.app

# Grafana Cloud (optional)
# PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod.grafana.net/api/prom/push
# GRAFANA_API_KEY=your-grafana-api-key
```

5. Click **Create Web Service**
6. Wait for the build to complete (~3-5 minutes)
7. Test: `curl https://minute93-api.onrender.com/health`

### Generate a secure JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 5: Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import from GitHub: `azmainm/Minute93`
3. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `client`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
4. Set environment variables:

```env
NEXT_PUBLIC_API_URL=https://minute93-api.onrender.com
API_INTERNAL_URL=https://minute93-api.onrender.com
NEXT_PUBLIC_GOOGLE_AUTH_URL=https://minute93-api.onrender.com/auth/google
NEXT_PUBLIC_APP_NAME=Minute93
NEXT_PUBLIC_APP_URL=https://minute93.com
NEXT_PUBLIC_SSE_URL=https://minute93-api.onrender.com/matches
```

5. Click **Deploy**
6. After deployment, note your Vercel URL (e.g., `minute93.vercel.app`)
7. Go back to Render and update the backend's `CLIENT_URL` env var to match your Vercel URL

---

## Step 6: Connect Namecheap Domain to Vercel

### On Vercel

1. Go to your project → **Settings** → **Domains**
2. Add your custom domain (e.g., `minute93.com`)
3. Vercel will show you the DNS records you need to add

### On Namecheap

1. Log in to [namecheap.com](https://namecheap.com) → **Domain List** → your domain → **Manage**
2. Go to **Advanced DNS**
3. Remove any existing A/CNAME records for `@` and `www`
4. Add the records Vercel provides. Typically:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `@` | `76.76.21.21` | Automatic |
| CNAME | `www` | `cname.vercel-dns.com` | Automatic |

5. Save changes. DNS propagation takes 5–30 minutes.

### Back on Vercel

6. Wait for the domain to verify (Vercel checks automatically)
7. SSL is auto-provisioned by Vercel — no action needed

### Update environment variables

After the domain is live, update these:

- **Vercel:** `NEXT_PUBLIC_APP_URL=https://minute93.com`
- **Render backend:** `CLIENT_URL=https://minute93.com`
- **Render backend:** `GOOGLE_CALLBACK_URL=https://minute93-api.onrender.com/auth/google/callback`

### Google OAuth

In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → your OAuth client:

1. Add to **Authorized JavaScript origins:** `https://minute93.com`
2. Add to **Authorized redirect URIs:** `https://minute93-api.onrender.com/auth/google/callback`

---

## Step 7: Upgrade API-Football for Live Data

The free tier (100 req/day) is sufficient for seeding historical data but won't work for live match polling. The poller makes ~2 requests per poll cycle (one per active league), polling every 30 seconds during live matches. That's ~240 requests/hour during a match.

### Purchase the Pro plan

1. Go to [api-football.com](https://www.api-football.com) (or via [RapidAPI](https://rapidapi.com/api-sports/api/api-football/pricing))
2. Subscribe to the **Pro** plan ($9.99/month) — 7,500 requests/day
3. Your API key stays the same; the rate limits just increase

### Seed the current season

After upgrading, seed the current 2025-26 UCL season:

```bash
cd server

# Seed from your local machine using the EXTERNAL Render DB URL
DATABASE_URL="postgres://minute93_user:PASSWORD@HOST:5432/minute93" \
  ACTIVE_LEAGUES=2 \
  SEED_SEASON=2025 \
  API_FOOTBALL_KEY=your-key \
  npx tsx scripts/seed.ts
```

Then add the new season to the frontend season selector:

```typescript
// client/components/shared/season-selector.tsx
const SEASONS = [
  { value: "2025", label: "2025-26" },  // ← add this
  { value: "2024", label: "2024-25" },
  { value: "2023", label: "2023-24" },
  { value: "2022", label: "2022-23" },
];
```

And update the default season on pages from `"2024"` to `"2025"`.

### Do I need to seed again for production?

**Yes, the first time.** Your local PostgreSQL and production PostgreSQL are separate databases. You need to:

1. Run `database/schema.sql` against the production DB (Step 1 above)
2. Run the seed script pointing at the production DB (command above)
3. After that, the **poller handles everything automatically** — it fetches live match data, deduplicates via Redis, publishes to Kafka, and the 4 consumers persist events, update cache, refresh standings, and push to SSE

The only time you'd re-seed is if you want to add a new historical season or if the DB is reset.

---

## Step 8: Grafana Cloud (Optional but Recommended)

For article screenshots and production monitoring:

1. Sign up at [grafana.com](https://grafana.com) → Free tier (10K series, 14-day retention)
2. Go to **Connections** → **Add new connection** → **Hosted Prometheus**
3. Copy the **Remote Write URL**, **Username**, and create an **API Key**
4. Add to Render backend env vars:

```env
PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod-XX.grafana.net/api/prom/push
GRAFANA_PROMETHEUS_USERNAME=123456
GRAFANA_API_KEY=your-grafana-api-key
```

5. The NestJS `MetricsService` already pushes metrics. After restarting the backend, you'll see data in Grafana.
6. Create dashboards for: HTTP latency, cache hit rate, Kafka throughput, SSE connections, error rates.

---

## Deployment Checklist

```
[ ] PostgreSQL provisioned on Render, schema applied
[ ] Redis provisioned on Render
[ ] Redpanda Cloud cluster created, topic + user configured
[ ] Backend deployed to Render with all env vars
[ ] Backend health check passes: curl https://minute93-api.onrender.com/health
[ ] Frontend deployed to Vercel with env vars
[ ] Custom domain connected via Namecheap DNS
[ ] SSL auto-provisioned by Vercel
[ ] Google OAuth redirect URIs updated for production
[ ] CLIENT_URL on backend updated to match frontend domain
[ ] API-Football upgraded to Pro plan
[ ] Current season (2025) seeded to production DB
[ ] Poller verified running (check backend logs for "[PollerService]" messages)
[ ] Grafana Cloud connected (optional)
```

---

## Troubleshooting

### Backend won't start on Render

- Check the **Logs** tab in Render. Common issues:
  - `DATABASE_URL` is wrong — make sure you're using the **Internal** URL
  - Kafka connection fails — verify SASL credentials and that `KAFKA_SSL=true` is set
  - Port mismatch — the Dockerfile exposes port 80 (Nginx), Render should detect this automatically

### Frontend can't reach backend

- CORS error → ensure `CLIENT_URL` on the backend matches your exact frontend URL (including `https://`)
- Mixed content → ensure both frontend and backend use HTTPS

### Poller not picking up live data

- Check `POLL_SEASON` matches the current season (e.g., `2025` for 2025-26)
- Check `ACTIVE_LEAGUES=2` (UCL)
- Check API-Football subscription is active and key is valid

### Render free tier cold starts

Render Starter plan spins down after 15 minutes of inactivity. First request after spin-up takes ~30-60 seconds. Standard plan ($25/mo) keeps the service always-on. For load testing, you need at least Standard.
