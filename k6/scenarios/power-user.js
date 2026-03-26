import http from 'k6/http';
import { sleep, check } from 'k6';
import { getRandomCountry } from '../helpers/geo.js';
import { BASE_URL } from '../helpers/config.js';

// Power user: does everything — live matches, search, standings, teams, 30+ min session
export default function () {
  const headers = {
    'X-Test-Country': getRandomCountry(),
    'X-Session-ID': `k6-power-${__VU}-${__ITER}`,
  };

  // 1. Check live matches
  const liveRes = http.get(`${BASE_URL}/matches/live`, { headers });
  check(liveRes, { 'live 200': (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  const matches = liveRes.json('data') || [];

  // 2. Open multiple live matches
  for (let i = 0; i < Math.min(matches.length, 3); i++) {
    const match = matches[i];
    const detailRes = http.get(`${BASE_URL}/matches/${match.id}`, { headers });
    check(detailRes, { 'match detail 200': (r) => r.status === 200 });

    const eventsRes = http.get(`${BASE_URL}/matches/${match.id}/events`, { headers });
    check(eventsRes, { 'events 200': (r) => r.status === 200 });
    sleep(Math.random() * 5 + 3);
  }

  // 3. Check standings
  const standingsRes = http.get(`${BASE_URL}/standings`, { headers });
  check(standingsRes, { 'standings 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 2);

  // 4. Search for a player
  const searchRes = http.get(`${BASE_URL}/search?q=mbappe`, { headers });
  check(searchRes, { 'search 200': (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  const results = searchRes.json('data') || [];
  const players = results.filter((r) => r.type === 'player');
  if (players.length > 0) {
    const playerRes = http.get(`${BASE_URL}/players/${players[0].id}`, { headers });
    check(playerRes, { 'player 200': (r) => r.status === 200 });
    sleep(Math.random() * 3 + 2);
  }

  // 5. Browse teams
  const teamsRes = http.get(`${BASE_URL}/teams`, { headers });
  check(teamsRes, { 'teams 200': (r) => r.status === 200 });
  const teams = teamsRes.json('data') || [];
  if (teams.length > 0) {
    const teamRes = http.get(`${BASE_URL}/teams/${teams[0].id}`, { headers });
    check(teamRes, { 'team 200': (r) => r.status === 200 });
    sleep(Math.random() * 3 + 2);
  }

  // 6. Check top scorers
  const scorersRes = http.get(`${BASE_URL}/top-scorers`, { headers });
  check(scorersRes, { 'scorers 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 2);

  // 7. Browse schedule
  const scheduleRes = http.get(`${BASE_URL}/matches/schedule`, { headers });
  check(scheduleRes, { 'schedule 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 2);

  // 8. Browse results
  const resultsRes = http.get(`${BASE_URL}/matches/results`, { headers });
  check(resultsRes, { 'results 200': (r) => r.status === 200 });
  sleep(Math.random() * 5 + 5);
}
