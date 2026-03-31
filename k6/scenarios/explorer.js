import http from 'k6/http';
import { sleep, check } from 'k6';
import { getRandomCountry } from '../helpers/geo.js';
import { BASE_URL } from '../helpers/config.js';

// Explorer: browses standings, clicks teams, views squads
export default function () {
  const headers = {
    'X-Test-Country': getRandomCountry(),
    'X-Session-ID': `k6-explorer-${__VU}-${__ITER}`,
  };

  // 1. Check standings
  const standingsRes = http.get(`${BASE_URL}/standings`, { headers });
  check(standingsRes, { 'standings 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 2);

  // 2. Browse teams
  const teamsRes = http.get(`${BASE_URL}/teams`, { headers });
  check(teamsRes, { 'teams 200': (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  // 3. Click into a team
  const teams = teamsRes.json('data') || [];
  if (teams.length > 0) {
    const team = teams[Math.floor(Math.random() * teams.length)];
    const teamRes = http.get(`${BASE_URL}/teams/${team.id}`, { headers });
    check(teamRes, { 'team detail 200': (r) => r.status === 200 });
    sleep(Math.random() * 5 + 3);
  }

  // 4. Browse results
  const resultsRes = http.get(`${BASE_URL}/matches/results`, { headers });
  check(resultsRes, { 'results 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 2);
}
