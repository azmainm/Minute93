import http from 'k6/http';
import { sleep, check } from 'k6';
import { getRandomCountry } from './helpers/geo.js';
import { BASE_URL, THRESHOLDS } from './helpers/config.js';
import casualViewer from './scenarios/casual-viewer.js';
import explorer from './scenarios/explorer.js';
import searcher from './scenarios/searcher.js';
import powerUser from './scenarios/power-user.js';

// Match Day Test: 110-minute full simulation during a live UCL match
// Simulates 3,000-5,000 concurrent users across 5 behavioral personas
//
// Usage:
//   k6 run --env BASE_URL=https://minute93-api.onrender.com --env VUS=3000 k6/match-day-test.js
//
// Timeline (110 min total):
//   0-10m   : Ramp up (pre-match, users arriving)
//   10-100m : Sustained peak (full match + halftime)
//   100-110m: Ramp down (post-match, users leaving)

const VUS = __ENV.VUS ? Number(__ENV.VUS) : 3000;

export const options = {
  scenarios: {
    // 55% — Casual viewers watching the live match
    casual_viewer: {
      executor: 'ramping-vus',
      exec: 'casualViewerScenario',
      startVUs: 0,
      stages: [
        { duration: '10m', target: Math.round(VUS * 0.55) },
        { duration: '90m', target: Math.round(VUS * 0.55) },
        { duration: '10m', target: 0 },
      ],
    },

    // 15% — Explorers browsing standings, teams, top scorers
    explorer: {
      executor: 'ramping-vus',
      exec: 'explorerScenario',
      startVUs: 0,
      stages: [
        { duration: '10m', target: Math.round(VUS * 0.15) },
        { duration: '90m', target: Math.round(VUS * 0.15) },
        { duration: '10m', target: 0 },
      ],
    },

    // 10% — Searchers looking up players/teams
    searcher: {
      executor: 'ramping-vus',
      exec: 'searcherScenario',
      startVUs: 0,
      stages: [
        { duration: '10m', target: Math.round(VUS * 0.1) },
        { duration: '90m', target: Math.round(VUS * 0.1) },
        { duration: '10m', target: 0 },
      ],
    },

    // 5% — Power users doing everything
    power_user: {
      executor: 'ramping-vus',
      exec: 'powerUserScenario',
      startVUs: 0,
      stages: [
        { duration: '10m', target: Math.round(VUS * 0.05) },
        { duration: '90m', target: Math.round(VUS * 0.05) },
        { duration: '10m', target: 0 },
      ],
    },

    // 15% — Live match watchers: rapid polling of match detail + events
    // Simulates users glued to a live match page, refreshing frequently
    // (k6 doesn't support SSE natively, so this simulates the equivalent load)
    live_match_watcher: {
      executor: 'ramping-vus',
      exec: 'liveMatchWatcherScenario',
      startVUs: 0,
      stages: [
        { duration: '10m', target: Math.round(VUS * 0.15) },
        { duration: '90m', target: Math.round(VUS * 0.15) },
        { duration: '10m', target: 0 },
      ],
    },
  },
  thresholds: {
    ...THRESHOLDS,
    // Slightly relaxed p95 for match day (high concurrency)
    http_req_duration: ['p(95)<800', 'p(99)<3000'],
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

// Live match watcher: stays on a single match page, polls detail + events every 5-10s
export function liveMatchWatcherScenario() {
  const headers = {
    'X-Test-Country': getRandomCountry(),
    'X-Session-ID': `k6-watcher-${__VU}-${__ITER}`,
  };

  // Find a live match to watch
  const liveRes = http.get(`${BASE_URL}/matches/live`, { headers });
  check(liveRes, { 'live 200': (r) => r.status === 200 });

  const matches = liveRes.json('data') || [];
  if (matches.length === 0) {
    // No live matches — fall back to browsing recent results
    http.get(`${BASE_URL}/matches/results`, { headers });
    sleep(Math.random() * 10 + 5);
    return;
  }

  // Pick a random live match and stay on it
  const match = matches[Math.floor(Math.random() * matches.length)];

  // Simulate watching the match for 3-8 minutes, polling every 5-10 seconds
  const watchDuration = (Math.random() * 300 + 180); // 3-8 min in seconds
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < watchDuration) {
    // Poll match detail (score updates)
    const detailRes = http.get(`${BASE_URL}/matches/${match.id}`, { headers });
    check(detailRes, { 'watcher detail 200': (r) => r.status === 200 });

    // Poll match events (goals, cards, subs)
    const eventsRes = http.get(`${BASE_URL}/matches/${match.id}/events`, { headers });
    check(eventsRes, { 'watcher events 200': (r) => r.status === 200 });

    // Wait 5-10 seconds before next poll
    sleep(Math.random() * 5 + 5);
  }

  // After watching, check standings
  const standingsRes = http.get(`${BASE_URL}/standings`, { headers });
  check(standingsRes, { 'standings 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 2);
}
