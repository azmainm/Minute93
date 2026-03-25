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
}
