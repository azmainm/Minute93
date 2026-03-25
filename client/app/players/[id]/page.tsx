"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  CircleDot,
  RectangleVertical,
  Shirt,
  Target,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorMessage } from "@/components/shared/error-message";
import { EmptyState } from "@/components/shared/empty-state";
import { MatchCard } from "@/components/shared/match-card";
import { getPlayer } from "@/lib/api";
import type { PlayerDetail } from "@/lib/types";

const statCards = [
  { key: "goals" as const, label: "Goals", icon: CircleDot, color: "text-primary" },
  { key: "assists" as const, label: "Assists", icon: Target, color: "text-blue-500" },
  { key: "yellowCards" as const, label: "Yellow Cards", icon: RectangleVertical, color: "text-amber-500" },
  { key: "redCards" as const, label: "Red Cards", icon: RectangleVertical, color: "text-red-500" },
  { key: "appearances" as const, label: "Appearances", icon: Shirt, color: "text-emerald-500" },
];

export default function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlayer() {
      try {
        const data = await getPlayer(Number(id));
        setPlayer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load player");
      } finally {
        setLoading(false);
      }
    }
    fetchPlayer();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-5 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorMessage message={error || "Player not found"} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={player.teamId ? `/teams/${player.teamId}` : "/teams"} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to {player.team?.name || "Teams"}
      </Link>

      {/* Player Header */}
      <div className="mb-8 flex items-center gap-5">
        {player.photoUrl ? (
          <Image src={player.photoUrl} alt={player.name} width={80} height={80} className="size-20 rounded-full border-2 border-primary/20 object-cover" />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full bg-muted">
            <User className="size-8 text-muted-foreground" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{player.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {player.position && <Badge variant="secondary">{player.position}</Badge>}
            {player.number && (
              <Badge variant="outline" className="font-mono">#{player.number}</Badge>
            )}
            {player.team && (
              <Link href={`/teams/${player.teamId}`} className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
                {player.team.logoUrl && (
                  <Image src={player.team.logoUrl} alt={player.team.name} width={16} height={16} className="size-4 object-contain" />
                )}
                {player.team.name}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Season Statistics
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {statCards.map(({ key, label, icon: Icon, color }) => (
            <Card key={key}>
              <CardContent className="flex flex-col items-center p-4 text-center">
                <Icon className={`mb-2 size-5 ${color}`} />
                <div className="text-2xl font-bold">{player.stats?.[key] ?? 0}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Matches */}
      <div>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent Matches
        </h2>
        {!player.recentMatches || player.recentMatches.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No match data"
            description="Match appearances will show here once events are processed."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {player.recentMatches.map((match) => (
              <MatchCard key={match.id} match={match} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
