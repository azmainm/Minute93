"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Zap, CircleDot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { getTopScorers } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SeasonSelector } from "@/components/shared/season-selector";
import type { TopScorer } from "@/lib/types";

export default function TopScorersPage() {
  const [scorers, setScorers] = useState<TopScorer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState("2025");

  useEffect(() => {
    async function fetchScorers() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTopScorers({ season });
        setScorers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load top scorers");
      } finally {
        setLoading(false);
      }
    }
    fetchScorers();
  }, [season]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          icon={Zap}
          title="Top Scorers"
          subtitle="Tournament goal rankings, auto-updated after every match event is processed."
        />
        <SeasonSelector value={season} onChange={setSeason} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : scorers.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No scorers yet"
          description="Goal rankings will appear here once match events are processed."
        />
      ) : (
        <div className="space-y-2">
          {scorers.map((scorer, i) => (
            <Card
              key={`${scorer.playerName}-${scorer.teamName}`}
              className={cn(
                "transition-all duration-200 hover:shadow-sm",
                i < 3 && "ring-1 ring-primary/20",
              )}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {/* Rank */}
                <div className={cn(
                  "flex size-9 flex-shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold",
                  i === 0 && "bg-primary text-primary-foreground",
                  i === 1 && "bg-primary/20 text-primary",
                  i === 2 && "bg-primary/10 text-primary",
                  i > 2 && "bg-muted text-muted-foreground",
                )}>
                  {scorer.rank || i + 1}
                </div>

                {/* Team Logo */}
                {scorer.teamLogo ? (
                  <Image
                    src={scorer.teamLogo}
                    alt={scorer.teamName}
                    width={28}
                    height={28}
                    className="size-7 object-contain"
                  />
                ) : (
                  <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                    {scorer.teamName.slice(0, 2)}
                  </div>
                )}

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{scorer.playerName}</div>
                  <div className="text-xs text-muted-foreground truncate">{scorer.teamName}</div>
                </div>

                {/* Goals */}
                <div className="flex items-center gap-1.5">
                  <CircleDot className="size-4 text-primary" />
                  <span className="text-lg font-bold">{scorer.goals}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
