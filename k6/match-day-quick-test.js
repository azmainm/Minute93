import http from 'k6/http';
import { sleep, check } from 'k6';
import { getRandomCountry } from './helpers/geo.js';
import { BASE_URL, THRESHOLDS, errors, HTTP_TIMEOUT } from './helpers/config.js';
import casualViewer from './scenarios/casual-viewer.js';
import explorer from './scenarios/explorer.js';
import searcher from './scenarios/searcher.js';
import powerUser from './scenarios/power-user.js';

// Match Day Quick Test: 20-minute condensed UCL match simulation
// Same traffic shape as the full 110-min test, compressed ~5.5x
// Peak: 3,000 VUs with spikes to 5,000
//
// Usage:
//   k6 run --env BASE_URL=https://minute93.onrender.com k6/match-day-quick-test.js
//
// Timeline (20 min):
//   0-2m     : Pre-match ramp
//   2-2.5m   : KICKOFF SPIKE (→ 4000)
//   2.5-5m   : First half steady (3000)
//   5-5.5m   : GOAL SPIKE #1 (→ 5000)
//   5.5-7.5m : First half continues (3000)
//   7.5-9.5m : Halftime dip (1500)
//   9.5-10m  : SECOND HALF KICKOFF SPIKE (→ 3500)
//   10-13m   : Second half steady (3000)
//   13-13.5m : GOAL SPIKE #2 (→ 5000)
//   13.5-16m : Second half continues (3000)
//   16-16.5m : FINAL WHISTLE SPIKE (→ 4500)
//   16.5-18m : Post-match cooldown (2000)
//   18-20m   : Ramp down

const BASE = 3000;
const SPIKE = 5000;
const KICKOFF = 4000;
const DIP = 1500;

function stages(pct) {
  const s = (v) => Math.round(v * pct);
  return [
    { duration: '2m', target: s(BASE) },          // Pre-match ramp
    { duration: '15s', target: s(KICKOFF) },       // Kickoff spike
    { duration: '15s', target: s(KICKOFF) },       // Hold kickoff
    { duration: '2m30s', target: s(BASE) },        // First half steady
    { duration: '15s', target: s(SPIKE) },         // GOAL SPIKE #1
    { duration: '15s', target: s(SPIKE) },         // Hold spike
    { duration: '2m', target: s(BASE) },           // First half continues
    { duration: '30s', target: s(DIP) },           // Halftime dip
    { duration: '1m30s', target: s(DIP) },         // Hold halftime
    { duration: '15s', target: s(BASE + 500) },    // Second half kickoff spike
    { duration: '15s', target: s(BASE + 500) },    // Hold
    { duration: '3m', target: s(BASE) },           // Second half steady
    { duration: '15s', target: s(SPIKE) },         // GOAL SPIKE #2
    { duration: '15s', target: s(SPIKE) },         // Hold spike
    { duration: '2m30s', target: s(BASE) },        // Second half continues
    { duration: '15s', target: s(KICKOFF + 500) }, // Final whistle spike
    { duration: '15s', target: s(KICKOFF + 500) }, // Hold
    { duration: '1m30s', target: s(BASE * 0.67) }, // Post-match cooldown
    { duration: '2m', target: 0 },                 // Ramp down
  ];
}

export const options = {
  scenarios: {
    casual_viewer: {
      executor: 'ramping-vus',
      exec: 'casualViewerScenario',
      startVUs: 0,
      stages: stages(0.45),
    },

    explorer: {
      executor: 'ramping-vus',
      exec: 'explorerScenario',
      startVUs: 0,
      stages: stages(0.15),
    },

    searcher: {
      executor: 'ramping-vus',
      exec: 'searcherScenario',
      startVUs: 0,
      stages: stages(0.10),
    },

    power_user: {
      executor: 'ramping-vus',
      exec: 'powerUserScenario',
      startVUs: 0,
      stages: stages(0.05),
    },

    live_match_watcher: {
      executor: 'ramping-vus',
      exec: 'liveMatchWatcherScenario',
      startVUs: 0,
      stages: stages(0.25),
    },
  },
  thresholds: {
    ...THRESHOLDS,
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
  const watchDuration = (Math.random() * 60 + 30);
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
