import { Client } from 'pg';
import { writeFileSync } from 'fs';
import 'dotenv/config';

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const sections: string[] = [];
  sections.push('# Minute93 Article Data Export');
  sections.push(`Generated: ${new Date().toISOString()}\n`);

  // ===== SECTION 1: USER & TRAFFIC OVERVIEW =====
  sections.push('## SECTION 1: USER & TRAFFIC OVERVIEW\n');

  const [userStats] = (await client.query(`
    SELECT
      COUNT(*) AS total_users,
      COUNT(CASE WHEN auth_provider = 'google' THEN 1 END) AS google_users,
      COUNT(CASE WHEN auth_provider = 'credentials' THEN 1 END) AS credentials_users,
      MIN(created_at) AS first_signup,
      MAX(created_at) AS last_signup
    FROM users
  `)).rows;

  sections.push(`- Total users: ${userStats.total_users}`);
  sections.push(`- Google OAuth: ${userStats.google_users} (${((userStats.google_users / Math.max(userStats.total_users, 1)) * 100).toFixed(1)}%)`);
  sections.push(`- Email/password: ${userStats.credentials_users}`);
  sections.push(`- First signup: ${userStats.first_signup}`);
  sections.push(`- Last signup: ${userStats.last_signup}\n`);

  const [pageViewStats] = (await client.query(`
    SELECT
      COUNT(*) AS total_page_views,
      COUNT(DISTINCT session_id) AS total_sessions
    FROM analytics_events
    WHERE event_type = 'page_view'
  `)).rows;

  sections.push(`- Total page views: ${pageViewStats.total_page_views}`);
  sections.push(`- Total unique sessions: ${pageViewStats.total_sessions}\n`);

  // ===== SECTION 2: GEOGRAPHY =====
  sections.push('## SECTION 2: GEOGRAPHY\n');

  const geoData = (await client.query(`
    SELECT ip_country AS country, COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS page_views
    FROM analytics_events
    WHERE ip_country IS NOT NULL
    GROUP BY ip_country
    ORDER BY sessions DESC
    LIMIT 15
  `)).rows;

  sections.push('| Country | Sessions | Page Views |');
  sections.push('|---------|----------|------------|');
  for (const row of geoData) {
    sections.push(`| ${row.country} | ${row.sessions} | ${row.page_views} |`);
  }
  sections.push('');

  // ===== SECTION 3: ENGAGEMENT =====
  sections.push('## SECTION 3: ENGAGEMENT\n');

  const popularPages = (await client.query(`
    SELECT event_data->>'path' AS path, COUNT(*) AS views
    FROM analytics_events
    WHERE event_type = 'page_view'
    GROUP BY event_data->>'path'
    ORDER BY views DESC
    LIMIT 15
  `)).rows;

  sections.push('### Most visited pages\n');
  sections.push('| Page | Views |');
  sections.push('|------|-------|');
  for (const row of popularPages) {
    sections.push(`| ${row.path} | ${row.views} |`);
  }
  sections.push('');

  const deviceBreakdown = (await client.query(`
    SELECT device_type, COUNT(*) AS count
    FROM analytics_events
    GROUP BY device_type
    ORDER BY count DESC
  `)).rows;

  sections.push('### Device breakdown\n');
  for (const row of deviceBreakdown) {
    sections.push(`- ${row.device_type}: ${row.count}`);
  }
  sections.push('');

  // ===== SECTION 4: SEARCH & FEATURE USAGE =====
  sections.push('## SECTION 4: SEARCH & FEATURE USAGE\n');

  const topSearches = (await client.query(`
    SELECT event_data->>'query' AS query, COUNT(*) AS count
    FROM analytics_events
    WHERE event_type = 'search'
    GROUP BY event_data->>'query'
    ORDER BY count DESC
    LIMIT 15
  `)).rows;

  sections.push('### Top search queries\n');
  sections.push('| Query | Count |');
  sections.push('|-------|-------|');
  for (const row of topSearches) {
    sections.push(`| ${row.query} | ${row.count} |`);
  }
  sections.push('');

  // ===== SECTION 5: MATCH DATA =====
  sections.push('## SECTION 5: MATCH DATA\n');

  const [matchStats] = (await client.query(`
    SELECT
      COUNT(*) AS total_matches,
      COUNT(CASE WHEN status = 'finished' THEN 1 END) AS finished,
      COUNT(CASE WHEN status = 'scheduled' THEN 1 END) AS scheduled,
      COUNT(CASE WHEN status = 'live' THEN 1 END) AS live
    FROM matches
  `)).rows;

  sections.push(`- Total matches: ${matchStats.total_matches}`);
  sections.push(`- Finished: ${matchStats.finished}`);
  sections.push(`- Scheduled: ${matchStats.scheduled}`);
  sections.push(`- Currently live: ${matchStats.live}\n`);

  const [eventStats] = (await client.query(`
    SELECT
      COUNT(*) AS total_events,
      COUNT(CASE WHEN event_type = 'goal' THEN 1 END) AS goals,
      COUNT(CASE WHEN event_type = 'card' THEN 1 END) AS cards,
      COUNT(CASE WHEN event_type = 'substitution' THEN 1 END) AS substitutions
    FROM match_events
  `)).rows;

  sections.push(`- Total match events: ${eventStats.total_events}`);
  sections.push(`- Goals: ${eventStats.goals}`);
  sections.push(`- Cards: ${eventStats.cards}`);
  sections.push(`- Substitutions: ${eventStats.substitutions}\n`);

  // ===== SECTION 6: LOAD TEST RESULTS =====
  sections.push('## SECTION 6: LOAD TEST RESULTS\n');

  const loadTests = (await client.query(`
    SELECT * FROM load_test_runs ORDER BY started_at DESC LIMIT 10
  `)).rows;

  if (loadTests.length === 0) {
    sections.push('No load test runs recorded yet.\n');
  } else {
    sections.push('| Test | VUs | Requests | RPS | p50 | p95 | p99 | Error% | Pass |');
    sections.push('|------|-----|----------|-----|-----|-----|-----|--------|------|');
    for (const test of loadTests) {
      sections.push(
        `| ${test.test_name} | ${test.virtual_users_peak} | ${test.total_requests} | ${test.requests_per_second} | ${test.p50_response_ms}ms | ${test.p95_response_ms}ms | ${test.p99_response_ms}ms | ${test.error_rate_pct}% | ${test.passed ? 'YES' : 'NO'} |`,
      );
    }
    sections.push('');
  }

  // ===== SECTION 7: INCIDENTS =====
  sections.push('## SECTION 7: INCIDENTS\n');

  const incidents = (await client.query(`
    SELECT * FROM incidents ORDER BY triggered_at DESC LIMIT 20
  `)).rows;

  if (incidents.length === 0) {
    sections.push('No incidents recorded.\n');
  } else {
    sections.push(`Total incidents: ${incidents.length}\n`);
    for (const incident of incidents) {
      sections.push(`### ${incident.metric_name} (${incident.severity})`);
      sections.push(`- Triggered: ${incident.triggered_at}`);
      sections.push(`- Resolved: ${incident.resolved_at || 'UNRESOLVED'}`);
      sections.push(`- Duration: ${incident.duration_seconds ? `${incident.duration_seconds}s` : 'N/A'}`);
      sections.push(`- Threshold: ${incident.threshold_value} | Actual: ${incident.actual_value}`);
      sections.push(`- ${incident.auto_description}\n`);
    }
  }

  // ===== SECTION 8: DAILY SNAPSHOTS =====
  sections.push('## SECTION 8: DAILY SNAPSHOTS (last 14 days)\n');

  const snapshots = (await client.query(`
    SELECT * FROM daily_snapshots ORDER BY snapshot_date DESC LIMIT 14
  `)).rows;

  if (snapshots.length === 0) {
    sections.push('No daily snapshots yet.\n');
  } else {
    sections.push('| Date | Users | New | DAU | Page Views | Searches | Live Matches | Notes |');
    sections.push('|------|-------|-----|-----|------------|----------|--------------|-------|');
    for (const snap of snapshots) {
      sections.push(
        `| ${snap.snapshot_date} | ${snap.total_users} | ${snap.new_signups} | ${snap.daily_active_users} | ${snap.page_views_today} | ${snap.searches_today} | ${snap.live_matches_today} | ${snap.notes || '-'} |`,
      );
    }
    sections.push('');
  }

  await client.end();

  const output = sections.join('\n');
  const outputPath = 'article-data.md';
  writeFileSync(outputPath, output);

  console.log(`\n✓ Article data exported to ${outputPath}`);
  console.log(`  ${sections.length} lines across 8 sections`);
}

main().catch((error) => {
  console.error('Article data generation failed:', error.message);
  process.exit(1);
});
