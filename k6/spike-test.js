import http from 'k6/http';
import { sleep, check } from 'k6';
import { getRandomCountry } from './helpers/geo.js';
import { BASE_URL, THRESHOLDS } from './helpers/config.js';

// Goal spike test: 500 steady → 2000 burst in 30s → back to 500
export const options = {
  stages: [
    { duration: '2m', target: 500 },    // Ramp to steady state
    { duration: '3m', target: 500 },    // Hold steady
    { duration: '30s', target: 2000 },  // Spike!
    { duration: '2m', target: 2000 },   // Hold spike
    { duration: '30s', target: 500 },   // Cool down
    { duration: '3m', target: 500 },    // Hold steady again
    { duration: '1m', target: 0 },      // Ramp down
  ],
  thresholds: {
    ...THRESHOLDS,
    http_req_duration: ['p(95)<1000'], // More lenient during spike
  },
};

export default function () {
  const headers = {
    'X-Test-Country': getRandomCountry(),
    'X-Session-ID': `k6-spike-${__VU}-${__ITER}`,
  };

  // Simulate a mix of requests that would happen during a goal
  const action = Math.random();

  if (action < 0.4) {
    // 40% check live matches
    const res = http.get(`${BASE_URL}/matches/live`, { headers });
    check(res, { 'live 200': (r) => r.status === 200 });
  } else if (action < 0.7) {
    // 30% check a specific match
    const res = http.get(`${BASE_URL}/matches/1`, { headers });
    check(res, { 'match 200': (r) => r.status === 200 });
  } else if (action < 0.85) {
    // 15% check standings
    const res = http.get(`${BASE_URL}/standings`, { headers });
    check(res, { 'standings 200': (r) => r.status === 200 });
  } else {
    // 15% check match events
    const res = http.get(`${BASE_URL}/matches/1/events`, { headers });
    check(res, { 'events 200': (r) => r.status === 200 });
  }

  sleep(Math.random() * 2 + 0.5);
}
