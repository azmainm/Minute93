import { THRESHOLDS } from './helpers/config.js';
import casualViewer from './scenarios/casual-viewer.js';
import explorer from './scenarios/explorer.js';
import searcher from './scenarios/searcher.js';
import powerUser from './scenarios/power-user.js';

// Level 1 Test: 45-minute sustained load with 150 VUs (configurable via VUS env)
// Usage: k6 run --env BASE_URL=https://minute93-api.onrender.com --env VUS=150 k6/level1-test.js
export const options = {
  scenarios: {
    casual_viewer: {
      executor: 'ramping-vus',
      exec: 'casualViewerScenario',
      startVUs: 0,
      stages: [
        { duration: '5m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.6) : 90 },
        { duration: '35m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.6) : 90 },
        { duration: '5m', target: 0 },
      ],
    },
    explorer: {
      executor: 'ramping-vus',
      exec: 'explorerScenario',
      startVUs: 0,
      stages: [
        { duration: '5m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.25) : 38 },
        { duration: '35m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.25) : 38 },
        { duration: '5m', target: 0 },
      ],
    },
    searcher: {
      executor: 'ramping-vus',
      exec: 'searcherScenario',
      startVUs: 0,
      stages: [
        { duration: '5m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.1) : 15 },
        { duration: '35m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.1) : 15 },
        { duration: '5m', target: 0 },
      ],
    },
    power_user: {
      executor: 'ramping-vus',
      exec: 'powerUserScenario',
      startVUs: 0,
      stages: [
        { duration: '5m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.05) : 7 },
        { duration: '35m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.05) : 7 },
        { duration: '5m', target: 0 },
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
