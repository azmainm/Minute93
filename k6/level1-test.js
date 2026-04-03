import { THRESHOLDS } from './helpers/config.js';
import casualViewer from './scenarios/casual-viewer.js';
import explorer from './scenarios/explorer.js';
import searcher from './scenarios/searcher.js';
import powerUser from './scenarios/power-user.js';

// Level 1 Test: 30-minute load test simulating second-half traffic
// Usage: k6 run --env BASE_URL=https://minute93.onrender.com k6/level1-test.js
//
// Timeline (no halftime dip — testing during 2nd half):
//   0-2m    : Ramp up (viewers joining second half)
//   2-10m   : Steady state (150 VUs)
//   10-11m  : GOAL SPIKE (200 VUs — 33% surge)
//   11-19m  : Steady (150 VUs)
//   19-20m  : GOAL SPIKE (200 VUs)
//   20-26m  : Steady (150 VUs)
//   26-27m  : Final whistle spike (180 VUs)
//   27-28m  : Hold spike
//   28-30m  : Ramp down
export const options = {
  scenarios: {
    casual_viewer: {
      executor: 'ramping-vus',
      exec: 'casualViewerScenario',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 90 },       // Ramp up (60% of 150)
        { duration: '8m', target: 90 },        // Steady
        { duration: '30s', target: 120 },      // Goal spike!
        { duration: '30s', target: 120 },      // Hold spike
        { duration: '8m', target: 90 },        // Steady
        { duration: '30s', target: 120 },      // Goal spike!
        { duration: '30s', target: 120 },      // Hold spike
        { duration: '6m', target: 90 },        // Steady
        { duration: '30s', target: 108 },      // Final whistle spike
        { duration: '30s', target: 108 },      // Hold
        { duration: '2m', target: 0 },         // Ramp down
      ],
    },
    explorer: {
      executor: 'ramping-vus',
      exec: 'explorerScenario',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 38 },
        { duration: '8m', target: 38 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '8m', target: 38 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '6m', target: 38 },
        { duration: '30s', target: 45 },
        { duration: '30s', target: 45 },
        { duration: '2m', target: 0 },
      ],
    },
    searcher: {
      executor: 'ramping-vus',
      exec: 'searcherScenario',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 15 },
        { duration: '8m', target: 15 },
        { duration: '30s', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '8m', target: 15 },
        { duration: '30s', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '6m', target: 15 },
        { duration: '30s', target: 18 },
        { duration: '30s', target: 18 },
        { duration: '2m', target: 0 },
      ],
    },
    power_user: {
      executor: 'ramping-vus',
      exec: 'powerUserScenario',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 7 },
        { duration: '8m', target: 7 },
        { duration: '30s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '8m', target: 7 },
        { duration: '30s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '6m', target: 7 },
        { duration: '30s', target: 9 },
        { duration: '30s', target: 9 },
        { duration: '2m', target: 0 },
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
