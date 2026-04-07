import http from 'k6/http';
import { sleep, check } from 'k6';
import { getRandomCountry } from './helpers/geo.js';
import { BASE_URL, THRESHOLDS, errors, HTTP_TIMEOUT } from './helpers/config.js';
import casualViewer from './scenarios/casual-viewer.js';
import explorer from './scenarios/explorer.js';
import searcher from './scenarios/searcher.js';
import powerUser from './scenarios/power-user.js';

// Match Day Proof Test: 30-minute architecture validation for current infra
//
// Infrastructure: Render Standard (1 CPU/2GB), Basic-256mb Postgres, Starter Redis
// Goal: Prove the architecture handles realistic match-day traffic patterns
//       at the ceiling of current infrastructure — sustained 150 VUs with spikes to 250.
//
// Usage:
//   ADMIN_PASSWORD='<pw>' ./k6/run-test.sh match-day-proof
//
// Timeline (15 min):
//   0-1.5m : Pre-match ramp to 150 VUs
//   1.5-2.5m : KICKOFF SPIKE (150 → 250)
//   2.5-5.5m : First half steady (150)
//   5.5-6m : GOAL SPIKE (150 → 250)
//   6-8m   : First half continues (150)
//   8-9m   : Halftime dip (75)
//   9-10m  : Second half kickoff spike (75 → 200)
//   10-11.5m : Second half steady (150)
//   11.5-12m : GOAL SPIKE #2 (150 → 250)
//   12-13.5m : Post-match cooldown (100)
//   13.5-15m : Ramp down

const SUSTAINED = 150;
const SPIKE = 250;
const KICKOFF = 200;
const DIP = 75;
const COOLDOWN = 100;

function stages(pct) {
  const s = (v) => Math.max(1, Math.round(v * pct));
  return [
    { duration: '90s', target: s(SUSTAINED) },    // Pre-match ramp
    { duration: '30s', target: s(SPIKE) },         // Kickoff spike
    { duration: '30s', target: s(SPIKE) },         // Hold kickoff
    { duration: '3m', target: s(SUSTAINED) },      // First half steady
    { duration: '15s', target: s(SPIKE) },         // GOAL SPIKE #1
    { duration: '15s', target: s(SPIKE) },         // Hold spike
    { duration: '2m', target: s(SUSTAINED) },      // First half continues
    { duration: '1m', target: s(DIP) },            // Halftime dip
    { duration: '30s', target: s(KICKOFF) },       // Second half kickoff spike
    { duration: '30s', target: s(KICKOFF) },       // Hold
    { duration: '90s', target: s(SUSTAINED) },     // Second half steady
    { duration: '15s', target: s(SPIKE) },         // GOAL SPIKE #2
    { duration: '15s', target: s(SPIKE) },         // Hold spike
    { duration: '90s', target: s(COOLDOWN) },      // Post-match cooldown
    { duration: '90s', target: 0 },                // Ramp down
  ];
}

export const options = {
  scenarios: {
    // 45% - Casual viewers (check scores, glance at standings)
    casual_viewer: {
      executor: 'ramping-vus',
      exec: 'casualViewerScenario',
      startVUs: 0,
      stages: stages(0.45),
    },

    // 15% - Explorers (browse teams, players, results)
    explorer: {
      executor: 'ramping-vus',
      exec: 'explorerScenario',
      startVUs: 0,
      stages: stages(0.15),
    },

    // 10% - Searchers (search for players/teams)
    searcher: {
      executor: 'ramping-vus',
      exec: 'searcherScenario',
      startVUs: 0,
      stages: stages(0.10),
    },

    // 5% - Power users (deep drill-down, many pages)
    power_user: {
      executor: 'ramping-vus',
      exec: 'powerUserScenario',
      startVUs: 0,
      stages: stages(0.05),
    },

    // 25% - Live match watchers (rapid polling on a single match)
    live_match_watcher: {
      executor: 'ramping-vus',
      exec: 'liveMatchWatcherScenario',
      startVUs: 0,
      stages: stages(0.25),
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
    app_errors: ['count<100'],
    checks: ['rate>0.99'],
  },
};

export function casualViewerScenario() {
  casualViewer();
}

export function explorerScenario() {
  explorer();
}

export function searcherScenario() {
  searcher();
}

export function powerUserScenario() {
  powerUser();
}

// Live match watcher: stays on a single match page, polls every 5-10s
export function liveMatchWatcherScenario() {
  const headers = {
    'X-Test-Country': getRandomCountry(),
    'X-Session-ID': `k6-watcher-${__VU}-${__ITER}`,
  };

  function req(url, params) {
    const res = http.get(url, { ...params, timeout: HTTP_TIMEOUT });
    if (res.status === 0 || res.status >= 400) errors.add(1);
    return res;
  }

  const liveRes = req(`${BASE_URL}/matches/live`, { headers });
  check(liveRes, { 'live 200': (r) => r.status === 200 });

  const matches = liveRes.json('data') || [];
  if (matches.length === 0) {
    req(`${BASE_URL}/matches/results`, { headers });
    sleep(Math.random() * 10 + 5);
    return;
  }

  const match = matches[Math.floor(Math.random() * matches.length)];
  // Watch for 60-120s (shorter than full match-day test, fits 30m window)
  const watchDuration = Math.random() * 60 + 60;
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < watchDuration) {
    const detailRes = req(`${BASE_URL}/matches/${match.id}`, { headers });
    check(detailRes, { 'watcher detail 200': (r) => r.status === 200 });

    const eventsRes = req(`${BASE_URL}/matches/${match.id}/events`, { headers });
    check(eventsRes, { 'watcher events 200': (r) => r.status === 200 });

    sleep(Math.random() * 5 + 5);
  }

  const standingsRes = req(`${BASE_URL}/standings`, { headers });
  check(standingsRes, { 'standings 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 2);
}
