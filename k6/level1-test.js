import { THRESHOLDS } from './helpers/config.js';
import casualViewer from './scenarios/casual-viewer.js';
import explorer from './scenarios/explorer.js';
import searcher from './scenarios/searcher.js';
import powerUser from './scenarios/power-user.js';

// Level 1 Test: 45-minute load test with spikes simulating a live match
// Usage: k6 run --env BASE_URL=https://minute93.onrender.com k6/level1-test.js
//
// Timeline:
//   0-3m    : Ramp up (users arriving before match)
//   3-10m   : Steady state (first half, 150 VUs)
//   10-11m  : GOAL SPIKE (200 VUs — sudden 33% surge)
//   11-20m  : Back to steady (150 VUs)
//   20-23m  : Halftime dip (80 VUs)
//   23-30m  : Second half steady (150 VUs)
//   30-31m  : GOAL SPIKE (200 VUs)
//   31-40m  : Steady (150 VUs)
//   40-42m  : Final whistle spike (180 VUs)
//   42-45m  : Ramp down
export const options = {
  scenarios: {
    casual_viewer: {
      executor: 'ramping-vus',
      exec: 'casualViewerScenario',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 90 },     // Ramp up (60% of 150)
        { duration: '7m', target: 90 },      // Steady first half
        { duration: '30s', target: 120 },    // Goal spike!
        { duration: '30s', target: 120 },    // Hold spike
        { duration: '9m', target: 90 },      // Back to steady
        { duration: '1m', target: 48 },      // Halftime dip
        { duration: '2m', target: 48 },      // Hold dip
        { duration: '1m', target: 90 },      // Second half
        { duration: '6m', target: 90 },      // Steady
        { duration: '30s', target: 120 },    // Goal spike!
        { duration: '30s', target: 120 },    // Hold spike
        { duration: '9m', target: 90 },      // Steady
        { duration: '1m', target: 108 },     // Final whistle spike
        { duration: '1m', target: 108 },     // Hold
        { duration: '3m', target: 0 },       // Ramp down
      ],
    },
    explorer: {
      executor: 'ramping-vus',
      exec: 'explorerScenario',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 38 },
        { duration: '7m', target: 38 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '9m', target: 38 },
        { duration: '1m', target: 20 },
        { duration: '2m', target: 20 },
        { duration: '1m', target: 38 },
        { duration: '6m', target: 38 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '9m', target: 38 },
        { duration: '1m', target: 45 },
        { duration: '1m', target: 45 },
        { duration: '3m', target: 0 },
      ],
    },
    searcher: {
      executor: 'ramping-vus',
      exec: 'searcherScenario',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 15 },
        { duration: '7m', target: 15 },
        { duration: '30s', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '9m', target: 15 },
        { duration: '1m', target: 8 },
        { duration: '2m', target: 8 },
        { duration: '1m', target: 15 },
        { duration: '6m', target: 15 },
        { duration: '30s', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '9m', target: 15 },
        { duration: '1m', target: 18 },
        { duration: '1m', target: 18 },
        { duration: '3m', target: 0 },
      ],
    },
    power_user: {
      executor: 'ramping-vus',
      exec: 'powerUserScenario',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 7 },
        { duration: '7m', target: 7 },
        { duration: '30s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '9m', target: 7 },
        { duration: '1m', target: 4 },
        { duration: '2m', target: 4 },
        { duration: '1m', target: 7 },
        { duration: '6m', target: 7 },
        { duration: '30s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '9m', target: 7 },
        { duration: '1m', target: 9 },
        { duration: '1m', target: 9 },
        { duration: '3m', target: 0 },
      ],
    },
  },
  thresholds: THRESHOLDS,
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
