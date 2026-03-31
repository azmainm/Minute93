import { THRESHOLDS } from './helpers/config.js';
import casualViewer from './scenarios/casual-viewer.js';
import explorer from './scenarios/explorer.js';
import searcher from './scenarios/searcher.js';
import powerUser from './scenarios/power-user.js';

// Preliminary Test: 30-minute sustained load with 200 VUs
// Usage: k6 run --env BASE_URL=https://minute93.onrender.com k6/preliminary-test.js
export const options = {
  scenarios: {
    casual_viewer: {
      executor: 'ramping-vus',
      exec: 'casualViewerScenario',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 120 },   // Ramp up (60% of 200)
        { duration: '24m', target: 120 },   // Hold
        { duration: '3m', target: 0 },      // Ramp down
      ],
    },
    explorer: {
      executor: 'ramping-vus',
      exec: 'explorerScenario',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 50 },    // 25% of 200
        { duration: '24m', target: 50 },
        { duration: '3m', target: 0 },
      ],
    },
    searcher: {
      executor: 'ramping-vus',
      exec: 'searcherScenario',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 20 },    // 10% of 200
        { duration: '24m', target: 20 },
        { duration: '3m', target: 0 },
      ],
    },
    power_user: {
      executor: 'ramping-vus',
      exec: 'powerUserScenario',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 10 },    // 5% of 200
        { duration: '24m', target: 10 },
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
