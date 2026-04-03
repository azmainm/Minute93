"use client";

import { useState, useEffect, useRef, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  MapPin,
  CircleDot,
  RectangleVertical,
  ArrowRightLeft,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorMessage } from "@/components/shared/error-message";
import { getMatch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MatchDetail } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const LIVE_STATUSES = ["live", "extra_time", "penalties", "halftime"];

function eventIcon(type: string) {
  switch (type) {
    case "goal":
    case "own_goal":
    case "penalty":
      return <CircleDot className="size-4 text-primary" />;
    case "card":
      return <RectangleVertical className="size-4 text-amber-500" />;
    case "substitution":
      return <ArrowRightLeft className="size-4 text-blue-500" />;
    case "var":
      return <ShieldAlert className="size-4 text-muted-foreground" />;
    default:
      return <CircleDot className="size-4 text-muted-foreground" />;
  }
}

function eventLabel(type: string) {
  const map: Record<string, string> = {
    goal: "Goal",
    own_goal: "Own Goal",
    penalty: "Penalty",
    missed_penalty: "Missed Penalty",
    card: "Card",
    substitution: "Substitution",
    var: "VAR Review",
  };
  return map[type] || type;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    scheduled: "Upcoming",
    live: "LIVE",
    halftime: "Half Time",
    finished: "Full Time",
    postponed: "Postponed",
    not_started: "Upcoming",
    extra_time: "Extra Time",
    penalties: "Penalties",
  };
  return map[status] || status;
}

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveMinute, setLiveMinute] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    async function fetchMatch() {
      setLoading(true);
      setError(null);
      try {
        setMatch(await getMatch(Number(id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load match");
      } finally {
        setLoading(false);
      }
    }
    fetchMatch();
  }, [id]);

  useEffect(() => {
    if (!match?.id || eventSourceRef.current) return;
    if (!LIVE_STATUSES.includes(match.status)) return;

    const es = new EventSource(`${API_BASE}/matches/${match.id}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        let data = JSON.parse(event.data);
        if (typeof data === "string") data = JSON.parse(data);

        if (data.minute != null) setLiveMinute(data.minute);

        setMatch((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            home_score: data.home_score ?? prev.home_score,
            away_score: data.away_score ?? prev.away_score,
            status: data.match_status || prev.status,
          };
        });

        if (data.event_type && data.event_type !== "status_update") {
          getMatch(match.id).then(setMatch).catch(() => {});
        }
      } catch {
        // SSE parse errors are non-critical; stream auto-recovers
      }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
    // Connect once per match — score/status updates arrive via SSE, not re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-5 w-24" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorMessage message={error || "Match not found"} />
      </div>
    );
  }

  const isLive = LIVE_STATUSES.includes(match.status);
  const events = (match.events || []).sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/matches" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Matches
      </Link>

      {/* Match Header */}
      <Card className={cn("overflow-hidden", isLive && "ring-1 ring-primary/30")}>
        {isLive && (
          <div className="h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
        )}
        <CardContent className="p-6 sm:p-8">
          {/* Status + Live Minute */}
          <div className="mb-6 flex flex-col items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "text-sm font-medium px-3 py-1",
                isLive && "animate-pulse border-primary/50 bg-primary/10 text-primary",
              )}
            >
              {isLive && <span className="mr-2 inline-block size-2 rounded-full bg-current" />}
              {statusLabel(match.status)}
            </Badge>
            {isLive && liveMinute != null && (
              <span className="font-mono text-xl font-bold text-primary">
                {liveMinute}&apos;
              </span>
            )}
          </div>

          {/* Teams & Score */}
          <div className="flex items-center justify-between gap-4">
            <Link href={`/teams/${match.home_team_id}`} className="flex flex-1 flex-col items-center gap-3 transition-opacity hover:opacity-80">
              {match.home_team?.logo_url ? (
                <Image src={match.home_team.logo_url} alt={match.home_team.name} width={56} height={56} className="size-14 object-contain" />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-full bg-muted text-lg font-bold">{match.home_team?.code || "?"}</div>
              )}
              <span className="text-center text-sm font-semibold sm:text-base">{match.home_team?.name || "TBD"}</span>
            </Link>

            <div className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-3 font-mono text-3xl font-extrabold sm:text-4xl",
              isLive ? "bg-primary/10 text-primary" : "bg-muted",
            )}>
              {match.home_score !== null ? (
                <>
                  <span>{match.home_score}</span>
                  <span className="text-lg text-muted-foreground">-</span>
                  <span>{match.away_score}</span>
                </>
              ) : (
                <span className="text-lg text-muted-foreground">vs</span>
              )}
            </div>

            <Link href={`/teams/${match.away_team_id}`} className="flex flex-1 flex-col items-center gap-3 transition-opacity hover:opacity-80">
              {match.away_team?.logo_url ? (
                <Image src={match.away_team.logo_url} alt={match.away_team.name} width={56} height={56} className="size-14 object-contain" />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-full bg-muted text-lg font-bold">{match.away_team?.code || "?"}</div>
              )}
              <span className="text-center text-sm font-semibold sm:text-base">{match.away_team?.name || "TBD"}</span>
            </Link>
          </div>

          {/* Meta */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(match.kickoff_at).toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </span>
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {match.venue}
              </span>
            )}
            {match.round && (
              <span className="flex items-center gap-1">{match.round}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Match Events */}
      {events.length > 0 && (
        <Card className="mt-6">
          <CardContent className="divide-y p-0">
            {events.map((event) => (
              <div key={event.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
                <div className="flex w-10 items-center justify-center text-sm font-mono font-bold text-muted-foreground">
                  {event.minute !== null ? `${event.minute}'` : "—"}
                </div>
                <div className="flex-shrink-0">{eventIcon(event.event_type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{event.player_name || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{eventLabel(event.event_type)}</div>
                </div>
                {event.team && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {event.team.logo_url && (
                      <Image src={event.team.logo_url} alt={event.team.name} width={16} height={16} className="size-4 object-contain" />
                    )}
                    <span className="hidden sm:inline">{event.team.name}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
