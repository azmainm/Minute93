# Load Testing & Writing the Final Article

Step-by-step instructions for running k6 load tests (locally and in production) and collecting everything you need for the Minute93 engineering article.

---

## Prerequisites

```bash
# Install k6 (macOS)
brew install k6

# Ensure local infrastructure is running
docker compose up -d          # Postgres, Redis, Redpanda
cd server && npm run start:dev  # NestJS API on port 3000
```

---

## What the Tests Simulate

The k6 tests model realistic user behavior across 4 distinct personas, each weighted to reflect a real audience. Every virtual user (VU) follows a complete user journey — not just raw HTTP requests.

### The 4 User Personas

#### 1. Casual Viewer (60% of VUs)

The majority of your traffic. These are fans who open the app to check live scores, glance at a match, read the timeline, and check standings before leaving.

**Simulated journey:**
1. Load the live matches page (`GET /matches/live`)
2. Click into a random live match to see the scoreboard (`GET /matches/:id`)
3. Scroll through match events — goals, cards, substitutions (`GET /matches/:id/events`)
4. Stay on the page for 30–60 seconds (simulating reading)
5. Check league standings before leaving (`GET /standings`)

**Think time:** 1–5 seconds between actions, 30–60 seconds of idle reading.

#### 2. Explorer (25% of VUs)

Fans who dig deeper — browsing teams, checking squad lists, and looking at results from past matchdays.

**Simulated journey:**
1. Check standings (`GET /standings`)
2. Browse the full teams list (`GET /teams`)
3. Click into a random team to see their squad and recent results (`GET /teams/:id`)
4. Check the top scorers table (`GET /top-scorers`)
5. Browse past results (`GET /matches/results`)

**Think time:** 2–5 seconds between pages, 3–8 seconds reading each page.

#### 3. Searcher (10% of VUs)

Users who arrive looking for a specific player or team. Simulates progressive keystroke search (like autocomplete) with real player names.

**Simulated journey:**
1. Type a player name progressively — e.g., "mba" → "mbap" → "mbappe" (`GET /search?q=...` × 3)
2. Click into the first player result (`GET /players/:id`)
3. Navigate to the player's team page (`GET /teams/:id`)

**Search terms pool:** Mbappe, Haaland, Vinicius, Bellingham, Salah, Rodri — chosen randomly per VU.

**Think time:** 300–500ms between keystrokes (realistic typing speed), 2–5 seconds reading results.

#### 4. Power User (5% of VUs)

The hardcore football nerd who opens every match, searches players, checks stats, browses every page. Long sessions, many requests.

**Simulated journey:**
1. Check all live matches (`GET /matches/live`)
2. Open up to 3 live matches, viewing detail + events for each
3. Check standings (`GET /standings`)
4. Search for "mbappe" and click into the player (`GET /search?q=mbappe`, `GET /players/:id`)
5. Browse teams, click into first team (`GET /teams`, `GET /teams/:id`)
6. Check top scorers (`GET /top-scorers`)
7. Browse the schedule (`GET /matches/schedule`)
8. Browse past results (`GET /matches/results`)

**Think time:** 1–5 seconds between rapid-fire actions, 5–10 seconds reading results.

### Geographic Distribution

Every request carries a simulated geographic origin via `X-Test-Country` header, weighted to match expected audience:

| Country | Weight | Rationale |
|---------|--------|-----------|
| Bangladesh | 40% | Builder's home base |
| USA | 20% | Large English-speaking football audience |
| UK | 10% | Premier European football market |
| Spain | 10% | Major football market |
| Germany | 5% | — |
| France | 5% | — |
| Brazil | 5% | — |
| India | 5% | — |

This data appears in the admin analytics geography dashboard and demonstrates global load distribution in the article.

### Spike Test (Goal Moment)

The spike test (`k6/spike-test.js`) simulates a UCL goal moment — when thousands of fans suddenly refresh at once. It doesn't use the 4-persona model. Instead, every VU runs a randomized mix weighted toward live-match endpoints:

- 40% check live matches
- 30% check a specific match detail
- 15% check standings
- 15% check match events

The VU ramp profile:
1. 2 min ramp to 500 (steady state)
2. 3 min hold at 500
3. **30 seconds spike to 2000** (the goal moment)
4. 2 min hold at 2000
5. 30 seconds cool down to 500
6. 3 min hold at 500 (recovery observation)
7. 1 min ramp down

Total: ~12 minutes.

---

## How Many Users Can You Simulate Locally?

k6 is very lightweight — each VU is a goroutine, not an OS thread. On a modern MacBook:

| Machine | RAM | Recommended Max VUs | Notes |
|---------|-----|---------------------|-------|
| MacBook Air M1/M2 (8 GB) | 8 GB | ~1,000–2,000 | CPU becomes the bottleneck, not RAM |
| MacBook Pro M1/M2 (16 GB) | 16 GB | ~3,000–5,000 | Comfortable for spike tests |
| MacBook Pro M3/M4 (32 GB) | 32 GB | ~5,000–10,000 | Diminishing returns beyond 5K for local backend |

**The real bottleneck is the backend, not k6.** Your local NestJS server, Postgres, Redis, and Redpanda all share the same machine. At ~2,000 VUs you'll start seeing elevated p95 latencies not because the architecture is slow, but because everything is fighting for the same CPU and I/O.

**Recommendation:**
- **500 VUs** for a clean baseline (the backend won't be stressed)
- **2,000 VUs** for the spike test (stresses the system enough to show interesting behavior)
- Beyond 2,000 locally is possible but results become less meaningful since you're measuring local resource contention, not architectural performance

### Important: Nginx Rate Limiting

The production Dockerfile includes Nginx with `rate=30r/s` per IP. When running k6 locally against `http://localhost:3000` (direct NestJS, no Nginx), rate limiting comes only from the NestJS `ThrottlerGuard` (100 req/60s per IP).

When running against the Dockerized backend or production, Nginx will throttle at 30 req/s per IP with a burst of 50. Since k6 runs from one IP, you'll hit this quickly at high VU counts. For accurate load testing:

- **Locally:** Run k6 against `http://localhost:3000` (direct to NestJS, bypassing Nginx)
- **Production:** Temporarily increase Nginx rate limits or disable them for the test window

---

## Test 1: Baseline (500 Users, No Live Match)

Run this when there is NOT a live UCL match. Tests the system under normal browsing load.

### Run the test

```bash
cd /path/to/Minute93

# 500 virtual users, 10-minute test
k6 run --out json=k6/results/baseline-500.json \
  -e VUS=500 \
  -e BASE_URL=http://localhost:3000 \
  k6/load-test.js
```

This distributes 500 VUs across 4 scenarios:
- 300 casual viewers (browse matches, check standings)
- 125 explorers (team pages, squad lists)
- 50 searchers (fuzzy search simulation)
- 25 power users (everything, long sessions)

### Save results to database

```bash
cd server
npx tsx ../k6/post-test.ts ../k6/results/baseline-500.json "baseline-500-no-live"
```

### What to look at

After the test, k6 prints a summary. Key metrics:
```
http_req_duration .......: p(95)=XXXms    ← Should be < 500ms
http_req_failed .........: X.XX%          ← Should be < 1%
http_reqs ...............: XXXXX          ← Total requests
vus_max .................: 500            ← Confirms VU count
```

Also check:
- Redis: `redis-cli INFO stats` — look at `keyspace_hits` vs `keyspace_misses` (target > 90% hit rate)
- Prometheus: `curl http://localhost:3000/metrics` — check `http_request_duration_seconds`, `redis_cache_hits_total`

---

## Test 2: Live Match Spike (2000 Users)

Run this DURING a live UCL match when the poller is actively fetching and publishing events.

### Before the match starts

```bash
# Make sure the poller is configured for the right season
# In server/.env:
POLL_SEASON=2024       # or 2025 if you've seeded the current season
ACTIVE_LEAGUES=2
POLL_INTERVAL_LIVE=30000   # 30 seconds during live
```

Restart the server so the poller picks up live match data:
```bash
cd server && npm run start:dev
```

Verify the poller is working — watch the server logs for:
```
[PollerService] Poller starting. Leagues: 2
[KafkaService] Kafka consumer minute93-cache-updater subscribed to match.events
```

### Run the spike test

```bash
# Goal spike: 500 steady → 2000 burst → back to 500
k6 run --out json=k6/results/spike-2000-live.json \
  -e BASE_URL=http://localhost:3000 \
  k6/spike-test.js
```

### Save results

```bash
cd server
npx tsx ../k6/post-test.ts ../k6/results/spike-2000-live.json "spike-2000-live-match"
```

### What to look at (in addition to baseline metrics)

- **SSE connections:** `curl http://localhost:3000/metrics | grep active_sse` — how many concurrent SSE connections survived
- **Kafka consumer lag:** `curl http://localhost:3000/metrics | grep kafka_consumer_lag` — should stay < 3s
- **Error rate during spike:** The spike test uses more lenient thresholds (p95 < 1000ms) since a burst from 500 → 2000 causes temporary degradation
- **Recovery time:** How quickly p95 returns to normal after the spike

---

## Test 3: Custom VU Count

For any custom scenario:

```bash
# Baseline test with custom VU count
k6 run --out json=k6/results/custom-test.json \
  -e VUS=1000 \
  -e BASE_URL=http://localhost:3000 \
  k6/load-test.js

# Save results
cd server
npx tsx ../k6/post-test.ts ../k6/results/custom-test.json "custom-1000-description"
```

---

## Production Load Testing

After deployment (see `DEPLOYMENT.md`), you can run tests against the live backend.

### What you need for production testing

| Requirement | Why |
|-------------|-----|
| API-Football Pro plan ($9.99/mo) | Poller needs > 100 req/day for live match polling |
| Render Standard plan ($25/mo) for backend | Starter plan spins down after 15 min idle; Standard is always-on |
| Current season seeded | Poller only fetches live data; historical data must be pre-seeded |

### Capacity on basic plans

| Component | Plan | Limit | Impact on Testing |
|-----------|------|-------|-------------------|
| Render Standard backend | $25/mo | 2 GB RAM, shared CPU | Handles ~500-1,000 VUs comfortably |
| Render Starter Postgres | $7/mo | 1 GB storage, 97 connections | Connection pool is the bottleneck; 97 connections limits practical VUs to ~500 |
| Render Free Redis | Free | 25 MB, 30 connections | Tight for 2,000 VUs; upgrade to Starter ($10/mo) for 100 connections |
| Render Starter Redis | $10/mo | 100 MB, 100 connections | Comfortable for ~1,000 VUs |
| Redpanda Cloud Serverless | Free | 10 MB/s throughput | More than enough |

**Realistic production test limits:**
- **Basic plans (Starter everything):** Up to ~500 VUs reliably
- **Upgraded plans (Standard backend, Starter Redis/Postgres):** Up to ~1,000 VUs
- **For 2,000 VU spike tests:** You need Standard backend + paid Redis + ideally Standard Postgres

### Run against production

```bash
# Baseline: 500 VUs against production
k6 run --out json=k6/results/prod-baseline-500.json \
  -e VUS=500 \
  -e BASE_URL=https://minute93-api.onrender.com \
  k6/load-test.js

# Save to LOCAL database (so you can compare local vs prod)
cd server
npx tsx ../k6/post-test.ts ../k6/results/prod-baseline-500.json "prod-baseline-500"
```

```bash
# Spike: 2000 VUs during live match against production
k6 run --out json=k6/results/prod-spike-2000.json \
  -e BASE_URL=https://minute93-api.onrender.com \
  k6/spike-test.js

cd server
npx tsx ../k6/post-test.ts ../k6/results/prod-spike-2000.json "prod-spike-2000-live"
```

**Warning:** Production load testing generates real traffic. Temporarily increase Nginx rate limits and NestJS throttle limits for the test window, then restore them.

### Testing during a live UCL match

1. Check the [UCL schedule](https://www.google.com/search?q=ucl+schedule) for upcoming matches
2. Start the server ~30 minutes before kickoff so the poller fetches pre-match data
3. Run the baseline test (500 VUs) during the first half
4. Run the spike test (2000 VUs) timed around a likely goal moment (or just whenever — goals happen organically)
5. After the match, export results for comparison

---

## Viewing All Test Results

Results are stored in the `load_test_runs` table. Query them:

```bash
cd server
node -e "
require('dotenv/config');
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT test_name, virtual_users_peak, total_requests, requests_per_second, error_rate_pct, p50_response_ms, p95_response_ms, p99_response_ms, passed, bottleneck_identified, started_at FROM load_test_runs ORDER BY started_at DESC')
  .then(r => { console.table(r.rows); pool.end(); });
"
```

Or use the admin dashboard at `/admin/analytics` which shows load test results.

### Export to JSON for the article

```bash
cd server
node -e "
require('dotenv/config');
const pg = require('pg');
const fs = require('fs');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT * FROM load_test_runs ORDER BY started_at')
  .then(r => {
    fs.writeFileSync('../k6/results/all-results.json', JSON.stringify(r.rows, null, 2));
    console.log('Exported', r.rows.length, 'test results');
    pool.end();
  });
"
```

---

## Collecting Data for the Final Article

### Metrics to Include

| Metric | Where to Get It | Why It Matters |
|--------|----------------|----------------|
| p50/p95/p99 response times | k6 output + `load_test_runs` table | Core performance story |
| Error rate | k6 output | Reliability proof |
| Requests per second | k6 output | Throughput capacity |
| Redis cache hit rate | `GET /metrics` during test | Cache effectiveness |
| Kafka consumer lag | `GET /metrics` during test | Event pipeline speed |
| Active SSE connections | `GET /metrics` during test | Real-time capacity |
| Recovery time after spike | k6 timeline chart | Resilience story |
| Geographic distribution | `analytics_events` table | Test realism |

### Step-by-Step: Capture Everything for the Article

#### Before testing

1. **Screenshot Grafana dashboards** (if configured) at idle state
2. **Note the system baseline:**
   ```bash
   curl -s http://localhost:3000/metrics | grep -E "http_requests_total|cache_hits|sse_connections"
   ```

#### During the baseline test (500 VUs)

3. **Run the test** (see Test 1 above)
4. **While it runs**, capture Prometheus metrics every 30s:
   ```bash
   # In a separate terminal
   while true; do
     echo "--- $(date) ---" >> k6/results/metrics-during-test.txt
     curl -s http://localhost:3000/metrics >> k6/results/metrics-during-test.txt
     sleep 30
   done
   ```
5. **Screenshot Grafana** at peak load

#### During the live match spike test (2000 VUs)

6. **Run spike test** (see Test 2 above)
7. **Capture the exact moment of spike** — watch k6 output for when VUs jump from 500 → 2000
8. **Note Kafka consumer lag** at the spike moment vs 30s later (recovery)
9. **Screenshot Grafana** during spike and during recovery

#### After testing

10. **Export all results** (see "Export to JSON" above)
11. **Generate comparison table** for the article:
    - Baseline (500 VUs, no live match) vs Spike (2000 VUs, live match)
    - Show how p95 changed, error rate, recovery time
    - Highlight cache hit rate improvement after warm-up

### Article Narrative Structure

Based on the article page placeholder at `/article`, each section should cover:

1. **Motivation** — Why build this, what problem does it solve, why football
2. **Architecture Overview** — The data flow diagram, why event-driven, why these specific technologies
3. **The Event Pipeline** — Poller → dedup → Kafka → 4 consumers. Show the Kafka consumer independence. Include actual metrics from your tests
4. **Real-Time Delivery** — SSE vs WebSocket decision. Show SSE connection counts from the spike test. Show how Redis Pub/Sub bridges Kafka to HTTP
5. **Data Layer** — PostgreSQL materialized views, trigram search. Show standings query time from Prometheus. Show search latency
6. **Lessons Learned** — What surprised you. What broke during testing. What you'd do differently. **This is the most valuable section** — include real numbers and honest failures
7. **What's Next** — Roadmap items

### Key Numbers to Highlight

From your test results, pull out:
- "Handled X requests per second with p95 under Y ms"
- "During the spike from 500 → 2000 VUs, p95 increased from Xms to Yms and recovered in Z seconds"
- "Redis cache hit rate: X% — meaning Y% of all reads never touched Postgres"
- "Kafka consumer lag stayed under Xs even during peak load"
- "Z concurrent SSE connections maintained during the spike"

---

## Complete Workflow Summary

### Phase 1: Local testing (before deployment)

```bash
# 1. Start infrastructure
docker compose up -d
cd server && npm run start:dev

# 2. Run baseline (500 VUs, no live match)
k6 run --out json=k6/results/baseline-500.json -e VUS=500 -e BASE_URL=http://localhost:3000 k6/load-test.js
cd server && npx tsx ../k6/post-test.ts ../k6/results/baseline-500.json "local-baseline-500"

# 3. Run spike (2000 VUs, simulated)
k6 run --out json=k6/results/spike-2000.json -e BASE_URL=http://localhost:3000 k6/spike-test.js
cd server && npx tsx ../k6/post-test.ts ../k6/results/spike-2000.json "local-spike-2000"
```

### Phase 2: Deploy everything (see DEPLOYMENT.md)

### Phase 3: Production testing during live UCL match

```bash
# 1. Ensure poller is running + season is correct
# 2. Wait for match to go live (check server logs)

# 3. Run baseline during match
k6 run --out json=k6/results/prod-live-500.json -e VUS=500 -e BASE_URL=https://minute93-api.onrender.com k6/load-test.js
cd server && npx tsx ../k6/post-test.ts ../k6/results/prod-live-500.json "prod-live-baseline-500"

# 4. Run spike during match
k6 run --out json=k6/results/prod-live-spike.json -e BASE_URL=https://minute93-api.onrender.com k6/spike-test.js
cd server && npx tsx ../k6/post-test.ts ../k6/results/prod-live-spike.json "prod-live-spike-2000"

# 5. Export all results
cd server
node -e "require('dotenv/config'); const pg=require('pg'); const fs=require('fs'); const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}); pool.query('SELECT * FROM load_test_runs ORDER BY started_at').then(r=>{fs.writeFileSync('../k6/results/all-results.json',JSON.stringify(r.rows,null,2)); console.log('Exported',r.rows.length,'results'); pool.end();})"
```

### Phase 4: Write the article using collected data
