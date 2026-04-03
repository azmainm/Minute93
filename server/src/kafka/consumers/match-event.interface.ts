/** Kafka message payload for match.events topic */
export interface MatchEventPayload {
  match_api_id: number;
  event_type: string;
  minute: number | null;
  player_name: string | null;
  team_api_id: number | null;
  detail: Record<string, unknown> | null;
  /** Updated match state */
  home_score: number | null;
  away_score: number | null;
  match_status: string;
  /** Fixture metadata — included on status_update events for auto-creation of unseeded matches */
  league_api_id?: number;
  home_team_api_id?: number;
  away_team_api_id?: number;
  kickoff_at?: string;
  venue?: string | null;
  season?: number;
}
