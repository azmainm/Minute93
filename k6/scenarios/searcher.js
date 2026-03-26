import http from 'k6/http';
import { sleep, check } from 'k6';
import { getRandomCountry } from '../helpers/geo.js';
import { BASE_URL } from '../helpers/config.js';

const SEARCH_TERMS = [
  ['mba', 'mbap', 'mbappe'],
  ['hal', 'hala', 'haland'],
  ['vin', 'vini', 'vinicius'],
  ['bel', 'bell', 'bellingham'],
  ['sal', 'sala', 'salah'],
  ['rod', 'rodr', 'rodri'],
];

// Searcher: types a search query progressively, views player, clicks to team
export default function () {
  const headers = {
    'X-Test-Country': getRandomCountry(),
    'X-Session-ID': `k6-searcher-${__VU}-${__ITER}`,
  };

  // 1. Simulate progressive search (like keystrokes)
  const terms = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  let lastResults = [];

  for (const term of terms) {
    const searchRes = http.get(`${BASE_URL}/search?q=${term}`, { headers });
    check(searchRes, { 'search 200': (r) => r.status === 200 });
    lastResults = searchRes.json('data') || [];
    sleep(0.3 + Math.random() * 0.2); // Simulate typing delay
  }

  // 2. Click into a player result
  const players = lastResults.filter((r) => r.type === 'player');
  if (players.length > 0) {
    const player = players[0];
    const playerRes = http.get(`${BASE_URL}/players/${player.id}`, { headers });
    check(playerRes, { 'player detail 200': (r) => r.status === 200 });
    sleep(Math.random() * 3 + 2);

    // 3. Click to team page
    const playerData = playerRes.json('data');
    if (playerData?.team_id) {
      const teamRes = http.get(`${BASE_URL}/teams/${playerData.team_id}`, { headers });
      check(teamRes, { 'team detail 200': (r) => r.status === 200 });
      sleep(Math.random() * 3 + 2);
    }
  }
}
