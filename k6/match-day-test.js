import http from 'k6/http';
import { sleep, check } from 'k6';
import { getRandomCountry } from './helpers/geo.js';
import { BASE_URL, THRESHOLDS } from './helpers/config.js';
import casualViewer from './scenarios/casual-viewer.js';
import explorer from './scenarios/explorer.js';
import searcher from './scenarios/searcher.js';
import powerUser from './scenarios/power-user.js';

// Match Day Test: 110-minute full UCL match simulation with realistic spikes
// Simulates 3,000 concurrent users with goal spikes up to 5,000
//
// Usage:
//   k6 run --env BASE_URL=https://minute93.onrender.com k6/match-day-test.js
//
// Timeline (110 min):
//   0-10m    : Pre-match ramp (users arriving)
//   10-12m   : KICKOFF SPIKE (3000 → 4000)
//   12-30m   : First half steady (3000)
//   30-31m   : GOAL SPIKE #1 (3000 → 5000)
//   31-45m   : First half steady (3000)
//   45-55m   : Halftime dip (1500)
//   55-57m   : SECOND HALF KICKOFF SPIKE (1500 → 3500)
//   57-75m   : Second half steady (3000)
//   75-76m   : GOAL SPIKE #2 (3000 → 5000)
//   76-90m   : Second half steady (3000)
//   90-92m   : FINAL WHISTLE SPIKE (3000 → 4500)
//   92-100m  : Post-match cooldown (2000)
//   100-110m : Ramp down

const BASE = 3000;
const SPIKE = 5000;
const KICKOFF = 4000;
const DIP = 1500;

function stages(pct) {
  const s = (v) => Math.round(v * pct);
  return [
    { duration: '10m', target: s(BASE) },       // Pre-match ramp
    { duration: '1m', target: s(KICKOFF) },      // Kickoff spike
    { duration: '1m', target: s(KICKOFF) },      // Hold kickoff
    { duration: '18m', target: s(BASE) },        // First half steady
    { duration: '30s', target: s(SPIKE) },       // GOAL SPIKE #1
    { duration: '30s', target: s(SPIKE) },       // Hold spike
    { duration: '14m', target: s(BASE) },        // First half continues
    { duration: '2m', target: s(DIP) },          // Halftime dip
    { duration: '8m', target: s(DIP) },          // Hold halftime
    { duration: '1m', target: s(BASE + 500) },   // Second half kickoff spike
    { duration: '1m', target: s(BASE + 500) },   // Hold
    { duration: '17m', target: s(BASE) },        // Second half steady
    { duration: '30s', target: s(SPIKE) },       // GOAL SPIKE #2
    { duration: '30s', target: s(SPIKE) },       // Hold spike
    { duration: '14m', target: s(BASE) },        // Second half continues
    { duration: '1m', target: s(KICKOFF + 500) },// Final whistle spike
    { duration: '1m', target: s(KICKOFF + 500) },// Hold
    { duration: '8m', target: s(BASE * 0.67) },  // Post-match cooldown
    { duration: '10m', target: 0 },              // Ramp down
  ];
}

export const options = {
  scenarios: {
    // 45% — Casual viewers
    casual_viewer: {
      executor: 'ramping-vus',
      exec: 'casualViewerScenario',
      startVUs: 0,
      stages: stages(0.45),
    },

    // 15% — Explorers
    explorer: {
      executor: 'ramping-vus',
      exec: 'explorerScenario',
      startVUs: 0,
      stages: stages(0.15),
    },

    // 10% — Searchers
    searcher: {
      executor: 'ramping-vus',
      exec: 'searcherScenario',
      startVUs: 0,
      stages: stages(0.10),
    },

    // 5% — Power users
    power_user: {
      executor: 'ramping-vus',
      exec: 'powerUserScenario',
      startVUs: 0,
      stages: stages(0.05),
    },

    // 25% — Live match watchers (rapid polling)
    live_match_watcher: {
      executor: 'ramping-vus',
      exec: 'liveMatchWatcherScenario',
      startVUs: 0,
      stages: stages(0.25),
    },
  },
  thresholds: {
    ...THRESHOLDS,
    // Relaxed during spikes
    http_req_duration: ['p(95)<1000', 'p(99)<3000'],
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

  const liveRes = http.get(`${BASE_URL}/matches/live`, { headers });
  check(liveRes, { 'live 200': (r) => r.status === 200 });

  const matches = liveRes.json('data') || [];
  if (matches.length === 0) {
    http.get(`${BASE_URL}/matches/results`, { headers });
    sleep(Math.random() * 10 + 5);
    return;
  }

  const match = matches[Math.floor(Math.random() * matches.length)];
  const watchDuration = (Math.random() * 300 + 180); // 3-8 min
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < watchDuration) {
    const detailRes = http.get(`${BASE_URL}/matches/${match.id}`, { headers });
    check(detailRes, { 'watcher detail 200': (r) => r.status === 200 });

    const eventsRes = http.get(`${BASE_URL}/matches/${match.id}/events`, { headers });
    check(eventsRes, { 'watcher events 200': (r) => r.status === 200 });

    sleep(Math.random() * 5 + 5);
  }

  const standingsRes = http.get(`${BASE_URL}/standings`, { headers });
  check(standingsRes, { 'standings 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 2);
}
