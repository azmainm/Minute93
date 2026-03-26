import { sleep } from 'k6';
import { THRESHOLDS } from './helpers/config.js';
import casualViewer from './scenarios/casual-viewer.js';
import explorer from './scenarios/explorer.js';
import searcher from './scenarios/searcher.js';
import powerUser from './scenarios/power-user.js';

export const options = {
  scenarios: {
    casual_viewer: {
      executor: 'ramping-vus',
      exec: 'casualViewerScenario',
      startVUs: 0,
      stages: [
        { duration: '2m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.6) : 30 },
        { duration: '6m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.6) : 30 },
        { duration: '2m', target: 0 },
      ],
    },
    explorer: {
      executor: 'ramping-vus',
      exec: 'explorerScenario',
      startVUs: 0,
      stages: [
        { duration: '2m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.25) : 13 },
        { duration: '6m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.25) : 13 },
        { duration: '2m', target: 0 },
      ],
    },
    searcher: {
      executor: 'ramping-vus',
      exec: 'searcherScenario',
      startVUs: 0,
      stages: [
        { duration: '2m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.1) : 5 },
        { duration: '6m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.1) : 5 },
        { duration: '2m', target: 0 },
      ],
    },
    power_user: {
      executor: 'ramping-vus',
      exec: 'powerUserScenario',
      startVUs: 0,
      stages: [
        { duration: '2m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.05) : 2 },
        { duration: '6m', target: __ENV.VUS ? Math.round(__ENV.VUS * 0.05) : 2 },
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
