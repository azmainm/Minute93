# Production Setup Guide

Step-by-step instructions for deploying Minute93 to production. Follow when ready to deploy to Render + Redpanda Cloud.

---

## Section A — Render PostgreSQL

1. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **PostgreSQL**
2. Fill in:
   - **Name:** `minute93-db`
   - **Region:** Same as your other Render services (e.g., Oregon)
   - **PostgreSQL Version:** 16
   - **Plan:** Free (or Starter if you need more storage)
3. After creation, go to the database page → **Info** tab
4. Copy the **Internal Database URL** (starts with `postgresql://`)
5. Set as `DATABASE_URL` env var on your NestJS web service
6. Also set the individual vars: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` from the connection details

**Important:** Use the **Internal** URL, not the External one — internal traffic between Render services is free and faster.

---

## Section B — Render Redis (Key Value)

1. Go to Render Dashboard → **New** → **Key Value**
2. Fill in:
   - **Name:** `minute93-redis`
   - **Region:** Same region as your other Render services (critical for low latency)
   - **Plan:** Free (or Starter for persistence)
3. After creation, go to the Key Value page → **Info** tab
4. Copy the **Internal Redis URL** (starts with `redis://`)
5. Set as `REDIS_URL` env var on your NestJS web service

**Why Render Redis:** Internal networking = sub-millisecond latency. No external provider needed.

---

## Section C — Redpanda Cloud (Kafka)

Render doesn't offer managed Kafka. Redpanda Cloud is the only external third-party service.

1. Go to [redpanda.com](https://redpanda.com/) → sign up
2. Create a **Serverless** cluster
   - **Region:** US East (closest to Render Oregon)
   - **Name:** `minute93-kafka`
3. Once created, go to the cluster → **Topics** tab
4. Create topic:
   - **Name:** `match.events`
   - **Partitions:** 8
   - **Retention:** 24 hours
5. Go to **Security** → create a SASL user or use the default credentials
6. Go to **Overview** → note the **Bootstrap Server URL**
7. Set these env vars on your NestJS web service on Render:

```
KAFKA_BROKERS=<bootstrap-server-url>
KAFKA_SSL=true
KAFKA_SASL_USERNAME=<your-username>
KAFKA_SASL_PASSWORD=<your-password>
KAFKA_TOPIC=match.events
```

**Note:** The NestJS KafkaModule automatically detects `KAFKA_SSL=true` and enables SASL authentication. Locally this is unset, so it connects to Redpanda via plain TCP.

---

## Section D — Environment Variable Summary

Complete list of env vars needed on the Render NestJS web service:

| Variable | Source | Required |
|----------|--------|----------|
| `NODE_ENV` | Set to `production` | Yes |
| `PORT` | Render sets this automatically | No |
| `DATABASE_HOST` | Render Postgres internal host | Yes |
| `DATABASE_PORT` | Render Postgres port (5432) | Yes |
| `DATABASE_USER` | Render Postgres username | Yes |
| `DATABASE_PASSWORD` | Render Postgres password | Yes |
| `DATABASE_NAME` | Render Postgres database name | Yes |
| `DATABASE_URL` | Render Postgres internal URL | Yes |
| `JWT_SECRET` | Generate a strong random string | Yes |
| `JWT_EXPIRATION` | e.g., `7d` | No (defaults to 7d) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Yes |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Yes |
| `GOOGLE_CALLBACK_URL` | `https://api.minute93.com/auth/google/callback` | Yes |
| `API_FOOTBALL_KEY` | api-football.com dashboard | Yes |
| `API_FOOTBALL_BASE_URL` | `https://v3.football.api-sports.io` | Yes |
| `ACTIVE_LEAGUES` | Comma-separated league IDs | Yes |
| `REDIS_URL` | Render Key Value internal URL | Yes |
| `KAFKA_BROKERS` | Redpanda Cloud bootstrap URL | Yes |
| `KAFKA_SSL` | `true` | Yes |
| `KAFKA_SASL_USERNAME` | Redpanda Cloud credentials | Yes |
| `KAFKA_SASL_PASSWORD` | Redpanda Cloud credentials | Yes |
| `KAFKA_TOPIC` | `match.events` | No (defaults to match.events) |
| `CLIENT_URL` | `https://minute93.com` | Yes |
| `POLL_INTERVAL_LIVE` | `30000` | No |
| `POLL_INTERVAL_IDLE` | `300000` | No |
| `THROTTLE_TTL` | `60000` | No |
| `THROTTLE_LIMIT` | `100` | No |
