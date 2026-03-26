# Load Testing & Writing the Final Article

Step-by-step instructions for running k6 load tests and collecting everything you need for the Minute93 engineering article.

---

## Prerequisites

```bash
# Install k6 (if not already)
brew install k6

# Ensure infrastructure is running
docker compose up -d          # Postgres, Redis, Redpanda
cd server && npm run start:dev  # NestJS API on port 3000
```

---

## Test 1: Baseline (500 Users, No Live Match)

Run this when there is NOT a live UCL match. This tests your system under normal browsing load — users checking standings, searching players, viewing past results.

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
POLL_SEASON=2024
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

This simulates:
1. 2 min ramp to 500 VUs (steady state)
2. 3 min hold at 500
3. 30s spike to 2000 (simulating a goal moment)
4. 2 min hold at 2000
5. 30s cool down to 500
6. 3 min hold at 500
7. 1 min ramp down

Total duration: ~12 minutes.

### Save results

```bash
cd server
npx tsx ../k6/post-test.ts ../k6/results/spike-2000-live.json "spike-2000-live-match"
```

### What to look at (in addition to baseline metrics)

- **SSE connections:** `curl http://localhost:3000/metrics | grep active_sse` — how many concurrent SSE connections survived
- **Kafka consumer lag:** `curl http://localhost:3000/metrics | grep kafka_consumer_lag` — should stay < 3s
- **Error rate during spike:** The spike test uses more lenient thresholds (p95 < 1000ms) since a burst from 500 → 2000 will cause temporary degradation
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

---

## Running Against Production

To test against your deployed Render instance:

```bash
k6 run --out json=k6/results/prod-baseline.json \
  -e VUS=500 \
  -e BASE_URL=https://your-render-url.onrender.com \
  k6/load-test.js
```

**Warning:** This will generate real load against production. The Nginx rate limiter and ThrottlerGuard will kick in. You may want to temporarily increase rate limits in production for the test window.

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

10. **Export all results:**
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

11. **Generate comparison table** for the article:
    - Baseline (500 VUs, no live match) vs Spike (2000 VUs, live match)
    - Show how p95 changed, error rate, recovery time
    - Highlight cache hit rate improvement after warm-up

### Article Narrative Structure

Based on the article page placeholder already at `/article`, here's what each section should cover:

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

## Remaining Setup Tasks

Before your first real test:

1. **Seed 2022 UCL data** (once API-Football daily limit resets):
   ```bash
   cd server
   SEED_SEASON=2022 npx tsx scripts/seed.ts
   ```
   Then add `{ value: "2022", label: "2022-23" }` to the season selector.

2. **Fill missing player data** (re-run seed for teams without players):
   ```bash
   cd server
   npx tsx scripts/seed.ts    # Re-runs will fill gaps via upsert
   ```

3. **Google OAuth** — Add `http://localhost:3000/auth/google/callback` (and your production URL) to Google Cloud Console > Authorized redirect URIs.

4. **Create k6/results directory:**
   ```bash
   mkdir -p k6/results
   echo "*.json" > k6/results/.gitignore
   ```

5. **Grafana Cloud** (optional but recommended for the article) — Set up a Prometheus data source pointing at your `/metrics` endpoint. Import or create dashboards for HTTP latency, cache performance, Kafka throughput, SSE connections.
