// API response wrapper — matches server's uniform response shape
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Domain Types ───
// All field names match the snake_case returned by the NestJS API

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  auth_provider: "google" | "credentials";
  is_admin: boolean;
  created_at: string;
  favorite_team?: string | null;
  timezone?: string | null;
}

export interface League {
  id: number;
  api_football_id: number;
  name: string;
  season: number;
  logo_url: string | null;
  is_active: boolean;
}

export interface Team {
  id: number;
  api_football_id: number;
  name: string;
  code: string | null;
  logo_url: string | null;
  league_id: number;
  league?: League;
  group_name: string | null;
  group_position: number | null;
}

export interface Player {
  id: number;
  api_football_id: number;
  name: string;
  team_id: number;
  team?: Team;
  position: string | null;
  number: number | null;
  photo_url: string | null;
}

export interface Match {
  id: number;
  api_football_id: number;
  league_id: number;
  league?: League;
  home_team_id: number;
  home_team?: Team;
  away_team_id: number;
  away_team?: Team;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  season: number;
  round: string | null;
  kickoff_at: string;
  venue: string | null;
  statistics: Record<string, unknown> | null;
  updated_at: string;
}

export type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled"
  | "suspended"
  | "not_started"
  | "extra_time"
  | "penalties";

export interface MatchEvent {
  id: number;
  match_id: number;
  event_type: EventType;
  minute: number | null;
  player_name: string | null;
  team_id: number | null;
  team?: Team;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export type EventType =
  | "goal"
  | "card"
  | "substitution"
  | "var"
  | "penalty"
  | "own_goal"
  | "missed_penalty";

export interface MatchLineup {
  id: number;
  match_id: number;
  team_id: number;
  player_name: string;
  player_number: number | null;
  position: string | null;
  is_starter: boolean;
}

// Standings and top scorers come from raw SQL materialized views
export interface StandingsRow {
  id: number;
  name: string;
  code: string | null;
  logo_url: string | null;
  group_name: string | null;
  season: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}

export interface TopScorer {
  name: string;
  team_name: string;
  team_logo: string | null;
  goals: number;
  season: number;
}

export interface SearchResult {
  type: "player" | "team";
  id: number;
  name: string;
  meta: string | null;
  similarity: number;
}

// ─── Composite types for detail pages ───
// These match the exact shape returned by the NestJS API

export interface MatchDetail extends Match {
  events: MatchEvent[];
  lineups: MatchLineup[];
}

export interface PlayerDetail {
  player: Player;
  stats: {
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  };
  recentEvents: MatchEvent[];
}

export interface TeamDetail {
  team: Team;
  players: Player[];
  recentMatches: Match[];
  upcomingMatches: Match[];
}
