import type { ApiResponse, PaginatedData } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.message || body.error || `Request failed with status ${res.status}`,
    );
  }

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new ApiError(400, json.error || json.message || "Unknown error");
  }

  return json.data;
}

// ─── Auth ───

export async function login(email: string, password: string) {
  return request<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(email: string, password: string, name: string) {
  return request<{ accessToken: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function getMe(token: string) {
  return request<import("./types").User>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── Matches ───

export async function getMatches(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<PaginatedData<import("./types").Match>>(`/matches${qs}`);
}

export async function getLiveMatches() {
  return request<import("./types").Match[]>("/matches/live");
}

export async function getMatchResults(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<PaginatedData<import("./types").Match>>(`/matches/results${qs}`);
}

export async function getScheduledMatches(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<PaginatedData<import("./types").Match>>(`/matches/schedule${qs}`);
}

export async function getMatch(id: number) {
  return request<import("./types").Match>(`/matches/${id}`);
}

export async function getMatchEvents(id: number) {
  return request<import("./types").MatchEvent[]>(`/matches/${id}/events`);
}

export async function getMatchLineups(id: number) {
  return request<import("./types").MatchLineup[]>(`/matches/${id}/lineups`);
}

// ─── Teams ───

export async function getTeams(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<PaginatedData<import("./types").Team>>(`/teams${qs}`);
}

export async function getTeam(id: number) {
  return request<import("./types").TeamDetail>(`/teams/${id}`);
}

// ─── Players ───

export async function getPlayer(id: number) {
  return request<import("./types").PlayerDetail>(`/players/${id}`);
}

// ─── Standings & Top Scorers ───

export async function getStandings(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<import("./types").StandingsRow[]>(`/standings${qs}`);
}

export async function getTopScorers(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<import("./types").TopScorer[]>(`/top-scorers${qs}`);
}

// ─── Search ───

export async function search(query: string) {
  return request<import("./types").SearchResult[]>(
    `/search?q=${encodeURIComponent(query)}`,
  );
}
