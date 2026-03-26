import http from 'k6/http';
import { sleep, check } from 'k6';
import { getRandomCountry } from '../helpers/geo.js';
import { BASE_URL } from '../helpers/config.js';

// Casual viewer: loads home, clicks into a live match, stays 5-10 min, checks standings, leaves
export default function () {
  const headers = {
    'X-Test-Country': getRandomCountry(),
    'X-Session-ID': `k6-casual-${__VU}-${__ITER}`,
  };

  // 1. Load live matches
  const liveRes = http.get(`${BASE_URL}/matches/live`, { headers });
  check(liveRes, { 'live matches 200': (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  // 2. Pick a match and view detail
  const matches = liveRes.json('data') || [];
  if (matches.length > 0) {
    const match = matches[Math.floor(Math.random() * matches.length)];
    const detailRes = http.get(`${BASE_URL}/matches/${match.id}`, { headers });
    check(detailRes, { 'match detail 200': (r) => r.status === 200 });
    sleep(Math.random() * 3 + 2);

    // 3. Get match events
    const eventsRes = http.get(`${BASE_URL}/matches/${match.id}/events`, { headers });
    check(eventsRes, { 'match events 200': (r) => r.status === 200 });
  }

  // 4. Simulate staying on page (reading)
  sleep(Math.random() * 30 + 30);

  // 5. Check standings
  const standingsRes = http.get(`${BASE_URL}/standings`, { headers });
  check(standingsRes, { 'standings 200': (r) => r.status === 200 });
  sleep(Math.random() * 5 + 3);
}
