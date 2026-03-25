"use client";

import { useState, useEffect, use } from "react";
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
  Users,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/shared/error-message";
import { EmptyState } from "@/components/shared/empty-state";
import { getMatch, getMatchEvents, getMatchLineups } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Match, MatchEvent, MatchLineup } from "@/lib/types";

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
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [lineups, setLineups] = useState<MatchLineup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const [matchData, eventsData, lineupsData] = await Promise.all([
          getMatch(Number(id)),
          getMatchEvents(Number(id)).catch(() => []),
          getMatchLineups(Number(id)).catch(() => []),
        ]);
        setMatch(matchData);
        setEvents(eventsData);
        setLineups(lineupsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load match");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-5 w-24" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
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

  const isLive = ["live", "extra_time", "penalties", "halftime"].includes(match.status);
  const homeLineup = lineups.filter((l) => l.teamId === match.homeTeamId);
  const awayLineup = lineups.filter((l) => l.teamId === match.awayTeamId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link */}
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
          {/* Status */}
          <div className="mb-6 flex items-center justify-center">
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
          </div>

          {/* Teams & Score */}
          <div className="flex items-center justify-between gap-4">
            {/* Home */}
            <Link href={`/teams/${match.homeTeamId}`} className="flex flex-1 flex-col items-center gap-3 transition-opacity hover:opacity-80">
              {match.homeTeam?.logoUrl ? (
                <Image src={match.homeTeam.logoUrl} alt={match.homeTeam.name} width={56} height={56} className="size-14 object-contain" />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-full bg-muted text-lg font-bold">{match.homeTeam?.code || "?"}</div>
              )}
              <span className="text-center text-sm font-semibold sm:text-base">{match.homeTeam?.name || "TBD"}</span>
            </Link>

            {/* Score */}
            <div className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-3 font-mono text-3xl font-extrabold sm:text-4xl",
              isLive ? "bg-primary/10 text-primary" : "bg-muted",
            )}>
              {match.homeScore !== null ? (
                <>
                  <span>{match.homeScore}</span>
                  <span className="text-lg text-muted-foreground">-</span>
                  <span>{match.awayScore}</span>
                </>
              ) : (
                <span className="text-lg text-muted-foreground">vs</span>
              )}
            </div>

            {/* Away */}
            <Link href={`/teams/${match.awayTeamId}`} className="flex flex-1 flex-col items-center gap-3 transition-opacity hover:opacity-80">
              {match.awayTeam?.logoUrl ? (
                <Image src={match.awayTeam.logoUrl} alt={match.awayTeam.name} width={56} height={56} className="size-14 object-contain" />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-full bg-muted text-lg font-bold">{match.awayTeam?.code || "?"}</div>
              )}
              <span className="text-center text-sm font-semibold sm:text-base">{match.awayTeam?.name || "TBD"}</span>
            </Link>
          </div>

          {/* Meta */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(match.kickoffAt).toLocaleDateString("en-US", {
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

      {/* Tabs: Events / Lineups */}
      <Tabs defaultValue="events" className="mt-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="events" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="lineups" className="gap-1.5">
            <Users className="size-3.5" />
            Lineups
          </TabsTrigger>
        </TabsList>

        {/* Events Timeline */}
        <TabsContent value="events">
          {events.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No events yet"
              description="Match events will appear here as they happen."
            />
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {events
                  .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
                  .map((event) => (
                    <div key={event.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
                      <div className="flex w-10 items-center justify-center text-sm font-mono font-bold text-muted-foreground">
                        {event.minute !== null ? `${event.minute}'` : "—"}
                      </div>
                      <div className="flex-shrink-0">{eventIcon(event.eventType)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{event.playerName || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{eventLabel(event.eventType)}</div>
                      </div>
                      {event.team && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {event.team.logoUrl && (
                            <Image src={event.team.logoUrl} alt={event.team.name} width={16} height={16} className="size-4 object-contain" />
                          )}
                          <span className="hidden sm:inline">{event.team.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lineups */}
        <TabsContent value="lineups">
          {lineups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No lineups available"
              description="Lineups will be added when they are announced."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { team: match.homeTeam, players: homeLineup },
                { team: match.awayTeam, players: awayLineup },
              ].map(({ team, players }) => (
                <Card key={team?.id || "unknown"}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {team?.logoUrl && (
                        <Image src={team.logoUrl} alt={team.name} width={20} height={20} className="size-5 object-contain" />
                      )}
                      {team?.name || "TBD"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Starting XI
                    </div>
                    <div className="space-y-1">
                      {players.filter((p) => p.isStarter).map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                          <span>{p.playerName}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {p.position && <span>{p.position}</span>}
                            {p.playerNumber && <Badge variant="outline" className="text-xs">{p.playerNumber}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {players.some((p) => !p.isStarter) && (
                      <>
                        <Separator className="my-3" />
                        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Substitutes
                        </div>
                        <div className="space-y-1">
                          {players.filter((p) => !p.isStarter).map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-1 text-sm text-muted-foreground">
                              <span>{p.playerName}</span>
                              <div className="flex items-center gap-2 text-xs">
                                {p.playerNumber && <Badge variant="outline" className="text-xs">{p.playerNumber}</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
