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

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  authProvider: "google" | "credentials";
  isAdmin: boolean;
  createdAt: string;
}

export interface League {
  id: number;
  apiFootballId: number;
  name: string;
  season: number;
  logoUrl: string | null;
  isActive: boolean;
}

export interface Team {
  id: number;
  apiFootballId: number;
  name: string;
  code: string | null;
  logoUrl: string | null;
  leagueId: number;
  league?: League;
  groupName: string | null;
  groupPosition: number | null;
}

export interface Player {
  id: number;
  apiFootballId: number;
  name: string;
  teamId: number;
  team?: Team;
  position: string | null;
  number: number | null;
  photoUrl: string | null;
}

export interface Match {
  id: number;
  apiFootballId: number;
  leagueId: number;
  league?: League;
  homeTeamId: number;
  homeTeam?: Team;
  awayTeamId: number;
  awayTeam?: Team;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  round: string | null;
  kickoffAt: string;
  venue: string | null;
  statistics: Record<string, unknown> | null;
  updatedAt: string;
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
  matchId: number;
  eventType: EventType;
  minute: number | null;
  playerName: string | null;
  teamId: number | null;
  team?: Team;
  detail: Record<string, unknown> | null;
  createdAt: string;
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
  matchId: number;
  teamId: number;
  playerName: string;
  playerNumber: number | null;
  position: string | null;
  isStarter: boolean;
}

export interface StandingsRow {
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number;
}

export interface TopScorer {
  playerName: string;
  teamName: string;
  teamLogo: string | null;
  goals: number;
  rank: number;
}

export interface SearchResult {
  type: "player" | "team";
  id: number;
  name: string;
  imageUrl: string | null;
  subtitle: string;
  similarity: number;
}

// ─── Player Stats (aggregated from match_events) ───

export interface PlayerStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  appearances: number;
}

export interface PlayerDetail extends Player {
  stats: PlayerStats;
  recentMatches: Match[];
}

export interface TeamDetail extends Team {
  players: Player[];
  recentMatches: Match[];
  upcomingMatches: Match[];
}
