# Testing Strategy

Minute93 uses k6 for load testing to validate system performance before live events. Unit and e2e tests use Jest (NestJS).

## Unit & E2E Tests (Jest)

- **Location:** Co-located `*.spec.ts` files for unit tests, `server/test/` for e2e tests.
- **Run:** `npm run test` (unit), `npm run test:e2e` (e2e).
- **Mock external services:** Never call real API-Football, Kafka, or Redis in tests. Mock all third-party calls.
- **No test interdependence:** Each test must be independently runnable.
- **Test after every feature:** Verify a feature works end-to-end before moving to the next task.

## k6 Load Testing

### Purpose
Prove the system handles real traffic before the Champions League Final. Results are stored in the `load_test_runs` Postgres table and visualized in Grafana.

### Virtual User Scenarios

| Scenario | % of VUs | Behavior |
|----------|----------|----------|
| Casual Viewer | 60% | Home page → live match (SSE open 5-10 min) → maybe standings → leave |
| Explorer | 25% | Home → standings → team page → squad/form → another group → leave |
| Searcher | 10% | Search (simulating keystrokes: "mba" → "mbap" → "mbappe") → player page → team page |
| Power User | 5% | All of the above, multiple live matches, 30+ min session |

### Geographic Simulation
Each k6 VU sends `X-Test-Country` header with a weighted random country code. The analytics middleware uses this instead of IP geolocation when the header is present. No code change needed for production — the header is simply absent.

### Progressive Test Levels

| Test | Virtual Users | Duration | When to Run |
|------|--------------|----------|-------------|
| Baseline | 50 | 10 min | After each major feature ships |
| Expected | 500 | 30 min | Weekly during testing phase |
| Stress | 2,000-5,000 | 30 min | 2-3 times total |
| Goal Spike | 500 → 2,000 burst → 500 | 15 min | During live matches for realism |

### Pass/Fail Thresholds

| Metric | Acceptable | Warning | Failure |
|--------|-----------|---------|---------|
| p95 response time | < 300ms | 300-500ms | > 500ms |
| Error rate | < 0.5% | 0.5-1% | > 1% |
| Kafka consumer lag | < 1s | 1-3s | > 3s |
| Redis cache hit rate | > 90% | 80-90% | < 80% |
| SSE connection success | > 99% | 95-99% | < 95% |

### Automated Results Storage

After each k6 run, a post-test script:
1. Parses k6's JSON summary output
2. Inserts a row into `load_test_runs` with all key metrics
3. Queries Prometheus for Kafka lag, cache hit rate, SSE connections during the test window
4. Sets `passed = true/false` based on the thresholds above
5. Auto-generates `bottleneck_identified` string if any threshold was breached

### Execution

- Baseline tests run automatically via cron on the background worker during live match days.
- Stress and spike tests are run manually — they need attention to interpret results.
- k6 scripts live in a `k6/` directory at the project root with subdirectories: `scenarios/`, `helpers/`.
