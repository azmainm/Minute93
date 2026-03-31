"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorMessage } from "@/components/shared/error-message";
import { getPlayer } from "@/lib/api";
import type { PlayerDetail } from "@/lib/types";

export default function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlayer() {
      try {
        const result = await getPlayer(Number(id));
        setData(result);
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
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorMessage message={error || "Player not found"} />
      </div>
    );
  }

  const { player } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={player.team_id ? `/teams/${player.team_id}` : "/teams"} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to {player.team?.name || "Teams"}
      </Link>

      {/* Player Header */}
      <div className="flex items-center gap-5">
        {player.photo_url ? (
          <Image src={player.photo_url} alt={player.name} width={80} height={80} className="size-20 rounded-full border-2 border-primary/20 object-cover" />
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
              <Link href={`/teams/${player.team_id}`} className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
                {player.team.logo_url && (
                  <Image src={player.team.logo_url} alt={player.team.name} width={16} height={16} className="size-4 object-contain" />
                )}
                {player.team.name}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
