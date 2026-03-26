"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  CalendarDays,
  Trophy,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorMessage } from "@/components/shared/error-message";
import { EmptyState } from "@/components/shared/empty-state";
import { MatchCard } from "@/components/shared/match-card";
import { getTeam } from "@/lib/api";
import type { TeamDetail } from "@/lib/types";

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const result = await getTeam(Number(id));
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team");
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-5 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="mt-8 h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorMessage message={error || "Team not found"} />
      </div>
    );
  }

  const { team, players = [], recentMatches, upcomingMatches } = data;
  const starters = players.filter((p) => p.position) || [];
  const groupedByPosition: Record<string, typeof starters> = {};
  for (const player of starters) {
    const pos = player.position || "Unknown";
    if (!groupedByPosition[pos]) groupedByPosition[pos] = [];
    groupedByPosition[pos].push(player);
  }
  const positionOrder = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/teams" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Teams
      </Link>

      {/* Team Header */}
      <div className="mb-8 flex items-center gap-4">
        {team.logo_url ? (
          <Image src={team.logo_url} alt={team.name} width={64} height={64} className="size-16 object-contain" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-xl font-bold">
            {team.code || team.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{team.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            {team.code && <Badge variant="outline">{team.code}</Badge>}
            {team.group_name && (
              <Badge variant="secondary">Group {team.group_name}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="squad">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="squad" className="gap-1.5">
            <Users className="size-3.5" />
            Squad
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-1.5">
            <Trophy className="size-3.5" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <CalendarDays className="size-3.5" />
            Upcoming
          </TabsTrigger>
        </TabsList>

        {/* Squad */}
        <TabsContent value="squad">
          {starters.length === 0 ? (
            <EmptyState icon={Users} title="No squad data" description="Player data will be available once seeded from API-Football." />
          ) : (
            <div className="space-y-6">
              {positionOrder.map((position) => {
                const players = groupedByPosition[position];
                if (!players || players.length === 0) return null;
                return (
                  <div key={position}>
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {position}s
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {players.map((player) => (
                        <Link key={player.id} href={`/players/${player.id}`}>
                          <Card className="group transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5">
                            <CardContent className="flex items-center gap-3 p-3">
                              {player.photo_url ? (
                                <Image src={player.photo_url} alt={player.name} width={36} height={36} className="size-9 rounded-full object-cover" />
                              ) : (
                                <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                                  <User className="size-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{player.name}</div>
                                <div className="text-xs text-muted-foreground">{player.position}</div>
                              </div>
                              {player.number && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  {player.number}
                                </Badge>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Recent Matches */}
        <TabsContent value="recent">
          {!recentMatches || recentMatches.length === 0 ? (
            <EmptyState icon={Trophy} title="No recent matches" description="Recent results will appear here after matches are played." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentMatches.map((match) => (
                <MatchCard key={match.id} match={match} compact />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Upcoming Matches */}
        <TabsContent value="upcoming">
          {!upcomingMatches || upcomingMatches.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming matches" description="Upcoming fixtures will appear here when scheduled." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {upcomingMatches.map((match) => (
                <MatchCard key={match.id} match={match} compact />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
