# Database Patterns

PostgreSQL conventions and strategies for Minute93.

## Schema Overview

### Core Tables
- `users` — User accounts (email/password + Google OAuth)
- `leagues` — Tracked competitions (PL, La Liga, CL, World Cup)
- `teams` — Teams with API-Football IDs
- `players` — Players with team references
- `matches` — Fixture data with scores, status, statistics (JSONB)
- `match_events` — Timeline events (goals, cards, subs)
- `match_lineups` — Starting XI and bench per match per team

### Analytics & Automation Tables
- `analytics_events` — User behavior tracking (page views, searches, etc.)
- `daily_snapshots` — Pre-aggregated daily metrics (@Cron at 3 AM)
- `load_test_runs` — k6 test results (one row per test execution)
- `incidents` — Auto-logged from Grafana alert webhooks

Full schema: `docs/InitialPlan.md` Section 9.

## Conventions

- **Primary keys:** `UUID` for `users`, `SERIAL`/`BIGSERIAL` for everything else.
- **Timestamps:** Always `TIMESTAMPTZ` (timezone-aware). Default `NOW()`.
- **API-Football IDs:** Stored as `api_football_id INTEGER UNIQUE NOT NULL` — the external system's identifier, separate from our internal PK.
- **JSONB for flexible data:** `matches.statistics` and `analytics_events.event_data` use JSONB for semi-structured data that doesn't warrant its own columns.
- **Foreign keys:** Always define them. Reference internal PKs, not API-Football IDs.
- **Parameterized queries only.** Never string-interpolate into SQL. Use TypeORM query builder or parameterized raw queries.
- **Transactions:** Required for any operation spanning multiple writes (e.g., creating a match + its events).

## Indexing Strategy

### Trigram Indexes (for fuzzy search)
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_players_name_trgm ON players USING GIN (name gin_trgm_ops);
CREATE INDEX idx_teams_name_trgm ON teams USING GIN (name gin_trgm_ops);
```
These enable sub-millisecond fuzzy search across ~1,000 entities. No Elasticsearch needed.

### B-tree Indexes (for filtering and lookups)
- `idx_match_events_match` — match_events(match_id)
- `idx_matches_status` — matches(status) — for filtering live/completed/scheduled
- `idx_matches_kickoff` — matches(kickoff_at) — for date-range queries
- `idx_matches_league` — matches(league_id)
- `idx_lineups_match` — match_lineups(match_id)
- `idx_analytics_type_date` — analytics_events(event_type, created_at) — composite for time-bucketed aggregations
- `idx_events_user` — analytics_events(user_id)

**Rule:** Only index columns that are used in WHERE, JOIN, or ORDER BY clauses. Don't over-index.

## Materialized Views

Used for pre-computed data that would be expensive to calculate on every request:

### Standings
```sql
CREATE MATERIALIZED VIEW standings AS
  SELECT ... GROUP BY team_id, league_id
  ORDER BY points DESC, goal_difference DESC;
```
Refreshed by `StatsAggregatorConsumer` after each match event.

### Top Scorers
```sql
CREATE MATERIALIZED VIEW top_scorers AS
  SELECT player_name, COUNT(*) as goals
  FROM match_events WHERE event_type = 'goal'
  GROUP BY player_name ORDER BY goals DESC;
```
Refreshed by `StatsAggregatorConsumer` after each goal event.

**Always use `REFRESH MATERIALIZED VIEW CONCURRENTLY`** — this allows reads while the view is being refreshed. Requires a unique index on the materialized view.

## Migration Approach

- Use TypeORM migrations (or raw SQL migration files in a `migrations/` directory).
- Every schema change gets its own migration file with `up()` and `down()` methods.
- Migrations run automatically on application startup in development.
- In production, migrations are run manually or as part of the deploy pipeline — never auto-run.
- Test migrations against a copy of production data before deploying.

## Data Lifecycle

| Data | Retention | Reasoning |
|------|-----------|-----------|
| Users | Permanent | Account data |
| Matches, events, lineups | Permanent | Historical record for stats pages |
| Analytics events | 60 days | Aggregated into daily_snapshots, raw rows pruned |
| Daily snapshots | Permanent | Pre-aggregated, small footprint |
| Load test runs | Permanent | Article data, small footprint |
| Incidents | Permanent | Article data, small footprint |
