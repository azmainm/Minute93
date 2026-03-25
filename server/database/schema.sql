-- Minute93 Database Schema
-- Run: docker exec -i minute93-postgres psql -U minute93 -d minute93 < server/database/schema.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users & Auth
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255),
  name            VARCHAR(100),
  avatar_url      TEXT,
  auth_provider   VARCHAR(20) NOT NULL DEFAULT 'credentials',
  favorite_team   VARCHAR(3),
  country_code    VARCHAR(2),
  timezone        VARCHAR(50),
  is_admin        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

-- Leagues
CREATE TABLE leagues (
  id              SERIAL PRIMARY KEY,
  api_football_id INTEGER UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  season          INTEGER NOT NULL,
  logo_url        TEXT,
  is_active       BOOLEAN DEFAULT TRUE
);

-- Teams
CREATE TABLE teams (
  id              SERIAL PRIMARY KEY,
  api_football_id INTEGER UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  code            VARCHAR(3),
  logo_url        TEXT,
  league_id       INTEGER REFERENCES leagues(id),
  group_name      VARCHAR(5),
  group_position  SMALLINT
);

-- Players
CREATE TABLE players (
  id              SERIAL PRIMARY KEY,
  api_football_id INTEGER UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  team_id         INTEGER REFERENCES teams(id),
  position        VARCHAR(20),
  number          SMALLINT,
  photo_url       TEXT
);

-- Matches
CREATE TABLE matches (
  id              SERIAL PRIMARY KEY,
  api_football_id INTEGER UNIQUE NOT NULL,
  league_id       INTEGER REFERENCES leagues(id),
  home_team_id    INTEGER REFERENCES teams(id),
  away_team_id    INTEGER REFERENCES teams(id),
  home_score      SMALLINT,
  away_score      SMALLINT,
  status          VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  round           VARCHAR(30),
  kickoff_at      TIMESTAMPTZ NOT NULL,
  venue           VARCHAR(100),
  statistics      JSONB,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Match events (goals, cards, subs)
CREATE TABLE match_events (
  id              BIGSERIAL PRIMARY KEY,
  match_id        INTEGER REFERENCES matches(id),
  event_type      VARCHAR(20) NOT NULL,
  minute          SMALLINT,
  player_name     VARCHAR(100),
  team_id         INTEGER REFERENCES teams(id),
  detail          JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Match lineups
CREATE TABLE match_lineups (
  id              SERIAL PRIMARY KEY,
  match_id        INTEGER REFERENCES matches(id),
  team_id         INTEGER REFERENCES teams(id),
  player_name     VARCHAR(100),
  player_number   SMALLINT,
  position        VARCHAR(20),
  is_starter      BOOLEAN DEFAULT TRUE,
  UNIQUE(match_id, team_id, player_name)
);

-- Analytics events
CREATE TABLE analytics_events (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID REFERENCES users(id),
  session_id      VARCHAR(36),
  event_type      VARCHAR(50) NOT NULL,
  event_data      JSONB,
  ip_country      VARCHAR(2),
  ip_city         VARCHAR(100),
  device_type     VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Daily snapshots
CREATE TABLE daily_snapshots (
  id                    SERIAL PRIMARY KEY,
  snapshot_date         DATE UNIQUE NOT NULL,
  phase                 VARCHAR(20) NOT NULL,
  total_users           INTEGER,
  new_signups           INTEGER,
  daily_active_users    INTEGER,
  total_searches        INTEGER,
  searches_today        INTEGER,
  total_page_views      INTEGER,
  page_views_today      INTEGER,
  peak_sse_connections  INTEGER,
  avg_response_time_ms  NUMERIC(8,2),
  p95_response_time_ms  NUMERIC(8,2),
  cache_hit_rate        NUMERIC(5,2),
  kafka_max_lag_ms      INTEGER,
  api_football_errors   INTEGER,
  top_countries         JSONB,
  device_breakdown      JSONB,
  top_searched_players  JSONB,
  most_viewed_matches   JSONB,
  live_matches_today    INTEGER,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Load test runs
CREATE TABLE load_test_runs (
  id                    SERIAL PRIMARY KEY,
  test_name             VARCHAR(100) NOT NULL,
  started_at            TIMESTAMPTZ NOT NULL,
  ended_at              TIMESTAMPTZ,
  virtual_users_peak    INTEGER,
  total_requests        INTEGER,
  requests_per_second   NUMERIC(8,2),
  error_rate_pct        NUMERIC(5,2),
  p50_response_ms       NUMERIC(8,2),
  p95_response_ms       NUMERIC(8,2),
  p99_response_ms       NUMERIC(8,2),
  kafka_max_lag_ms      INTEGER,
  redis_cache_hit_pct   NUMERIC(5,2),
  peak_sse_connections  INTEGER,
  max_pg_query_ms       NUMERIC(8,2),
  bottleneck_identified TEXT,
  passed                BOOLEAN,
  notes                 TEXT,
  config_json           JSONB
);

-- Incidents
CREATE TABLE incidents (
  id                    SERIAL PRIMARY KEY,
  severity              VARCHAR(10) NOT NULL,
  metric_name           VARCHAR(100),
  threshold_value       NUMERIC,
  actual_value          NUMERIC,
  triggered_at          TIMESTAMPTZ NOT NULL,
  resolved_at           TIMESTAMPTZ,
  duration_seconds      INTEGER,
  phase                 VARCHAR(20),
  match_id              INTEGER,
  auto_description      TEXT,
  manual_notes          TEXT
);

-- Indexes
CREATE INDEX idx_players_name_trgm ON players USING GIN (name gin_trgm_ops);
CREATE INDEX idx_teams_name_trgm ON teams USING GIN (name gin_trgm_ops);
CREATE INDEX idx_match_events_match ON match_events(match_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_kickoff ON matches(kickoff_at);
CREATE INDEX idx_matches_league ON matches(league_id);
CREATE INDEX idx_lineups_match ON match_lineups(match_id);
CREATE INDEX idx_analytics_type_date ON analytics_events(event_type, created_at);
CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_snapshots_date ON daily_snapshots(snapshot_date);
CREATE INDEX idx_snapshots_phase ON daily_snapshots(phase);
CREATE INDEX idx_load_tests_name ON load_test_runs(test_name);
CREATE INDEX idx_incidents_phase ON incidents(phase, triggered_at);
