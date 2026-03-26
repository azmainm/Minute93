/**
 * Data Seeding Script
 *
 * Fetches leagues, teams, players, and fixtures from API-Football
 * and inserts them into the local Postgres database.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Requires: API_FOOTBALL_KEY and DATABASE_URL in .env
 */

import 'dotenv/config';
import pg from 'pg';

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_BASE = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';
const ACTIVE_LEAGUES = (process.env.ACTIVE_LEAGUES || '2').split(',').map(Number);
const SEASON = Number(process.env.SEED_SEASON || '2025');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`;

if (!API_KEY) {
  console.error('Missing API_FOOTBALL_KEY in .env');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

// Rate limiting: API-Football free tier = 100 req/day
let requestCount = 0;

async function apiFetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const url = new URL(endpoint, API_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  requestCount++;
  console.log(`  [${requestCount}] GET ${url.pathname}${url.search}`);

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY! },
  });

  if (!res.ok) {
    throw new Error(`API-Football error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as { response: T[]; errors: Record<string, string> };

  if (json.errors && Object.keys(json.errors).length > 0) {
    console.warn('  API errors:', json.errors);
  }

  // Respect rate limits
  await new Promise((r) => setTimeout(r, 1000));

  return json.response;
}

// ─── Seed Leagues ───

async function seedLeagues() {
  console.log('\n=== Seeding Leagues ===');
  for (const leagueId of ACTIVE_LEAGUES) {
    const leagues = await apiFetch<{
      league: { id: number; name: string; logo: string };
    }>('/leagues', { id: leagueId });

    if (leagues.length === 0) {
      console.warn(`  League ${leagueId} not found`);
      continue;
    }

    const { league } = leagues[0];
    await pool.query(
      `INSERT INTO leagues (api_football_id, name, season, logo_url, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (api_football_id) DO UPDATE SET name = $2, logo_url = $4`,
      [league.id, league.name, SEASON, league.logo],
    );
    console.log(`  ✓ League: ${league.name}`);
  }
}

// ─── Seed Teams ───

async function seedTeams() {
  console.log('\n=== Seeding Teams ===');
  for (const leagueId of ACTIVE_LEAGUES) {
    const leagueRow = await pool.query(
      'SELECT id FROM leagues WHERE api_football_id = $1',
      [leagueId],
    );
    if (leagueRow.rows.length === 0) continue;
    const dbLeagueId = leagueRow.rows[0].id;

    const teams = await apiFetch<{
      team: { id: number; name: string; code: string; logo: string };
    }>('/teams', { league: leagueId, season: SEASON });

    for (const { team } of teams) {
      await pool.query(
        `INSERT INTO teams (api_football_id, name, code, logo_url, league_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (api_football_id) DO UPDATE SET name = $2, code = $3, logo_url = $4, league_id = $5`,
        [team.id, team.name, team.code, team.logo, dbLeagueId],
      );
    }
    console.log(`  ✓ ${teams.length} teams for league ${leagueId}`);
  }
}

// ─── Seed Players (squads) ───

async function seedPlayers() {
  console.log('\n=== Seeding Players ===');
  const teams = await pool.query('SELECT id, api_football_id FROM teams');

  let totalPlayers = 0;
  for (const team of teams.rows) {
    const squads = await apiFetch<{
      players: Array<{
        id: number;
        name: string;
        position: string;
        number: number | null;
        photo: string;
      }>;
    }>('/players/squads', { team: team.api_football_id });

    if (squads.length === 0) continue;

    const players = squads[0].players || [];
    for (const player of players) {
      await pool.query(
        `INSERT INTO players (api_football_id, name, team_id, position, number, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (api_football_id) DO UPDATE SET name = $2, team_id = $3, position = $4, number = $5, photo_url = $6`,
        [player.id, player.name, team.id, player.position, player.number, player.photo],
      );
      totalPlayers++;
    }
    console.log(`  ✓ ${players.length} players for team ${team.api_football_id}`);

    // Check budget: free tier = 100 req/day
    if (requestCount >= 95) {
      console.warn('\n⚠ Approaching API request limit (95/100). Stopping player seeding.');
      console.warn('  Run the script again tomorrow to continue seeding remaining teams.');
      break;
    }
  }
  console.log(`  Total players seeded: ${totalPlayers}`);
}

// ─── Seed Fixtures (matches) ───

async function seedFixtures() {
  console.log('\n=== Seeding Fixtures ===');
  for (const leagueId of ACTIVE_LEAGUES) {
    const leagueRow = await pool.query(
      'SELECT id FROM leagues WHERE api_football_id = $1',
      [leagueId],
    );
    if (leagueRow.rows.length === 0) continue;
    const dbLeagueId = leagueRow.rows[0].id;

    const fixtures = await apiFetch<{
      fixture: { id: number; date: string; venue: { name: string } | null; status: { short: string } };
      league: { round: string };
      teams: { home: { id: number }; away: { id: number } };
      goals: { home: number | null; away: number | null };
    }>('/fixtures', { league: leagueId, season: SEASON });

    const statusMap: Record<string, string> = {
      TBD: 'scheduled', NS: 'scheduled', '1H': 'live', HT: 'halftime',
      '2H': 'live', ET: 'extra_time', P: 'penalties', FT: 'finished',
      AET: 'finished', PEN: 'finished', BT: 'finished',
      SUSP: 'suspended', INT: 'suspended', PST: 'postponed',
      CANC: 'cancelled', ABD: 'cancelled', AWD: 'finished', WO: 'finished',
    };

    let insertedCount = 0;
    for (const f of fixtures) {
      // Lookup team IDs in our DB
      const homeTeam = await pool.query(
        'SELECT id FROM teams WHERE api_football_id = $1',
        [f.teams.home.id],
      );
      const awayTeam = await pool.query(
        'SELECT id FROM teams WHERE api_football_id = $1',
        [f.teams.away.id],
      );

      const homeTeamId = homeTeam.rows[0]?.id || null;
      const awayTeamId = awayTeam.rows[0]?.id || null;
      const status = statusMap[f.fixture.status.short] || 'scheduled';

      await pool.query(
        `INSERT INTO matches (api_football_id, league_id, home_team_id, away_team_id, home_score, away_score, status, season, round, kickoff_at, venue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (api_football_id) DO UPDATE SET
           home_score = $5, away_score = $6, status = $7, season = $8, round = $9, kickoff_at = $10, venue = $11, updated_at = NOW()`,
        [
          f.fixture.id, dbLeagueId, homeTeamId, awayTeamId,
          f.goals.home, f.goals.away, status, SEASON,
          f.league.round, f.fixture.date, f.fixture.venue?.name || null,
        ],
      );
      insertedCount++;
    }
    console.log(`  ✓ ${insertedCount} fixtures for league ${leagueId}`);
  }
}

// ─── Main ───

async function main() {
  console.log('Minute93 Data Seeder');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Active Leagues: ${ACTIVE_LEAGUES.join(', ')}`);
  console.log(`Season: ${SEASON}`);
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]*@/, ':***@')}`);

  try {
    await seedLeagues();
    await seedTeams();
    await seedFixtures();

    // Players use the most API calls — seed last
    if (requestCount < 90) {
      await seedPlayers();
    } else {
      console.log('\n⚠ Skipping player seeding to stay within API limits.');
      console.log('  Run the script again tomorrow to seed players.');
    }

    console.log(`\n✓ Seeding complete. Total API requests: ${requestCount}`);
  } catch (error) {
    console.error('\n✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
