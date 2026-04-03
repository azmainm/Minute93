"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { getStandings } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SeasonSelector } from "@/components/shared/season-selector";
import { LeagueSelector } from "@/components/shared/league-selector";
import type { StandingsRow } from "@/lib/types";

export default function StandingsPage() {
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState("2025");
  const [leagueId, setLeagueId] = useState("1");

  useEffect(() => {
    async function fetchStandings() {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = { season };
        if (leagueId !== "all") params.league_id = leagueId;
        const data = await getStandings(params);
        setStandings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load standings");
      } finally {
        setLoading(false);
      }
    }
    fetchStandings();
  }, [season, leagueId]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        showLogo
        title="Standings"
        subtitle="League tables updated automatically after every match. Select a competition and season to view standings."
      />

      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <LeagueSelector value={leagueId} onChange={setLeagueId} showAllOption={false} />
        <SeasonSelector value={season} onChange={setSeason} leagueId={leagueId} />
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-3 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : standings.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No standings data"
          description="Standings will populate once match results are processed through the event pipeline."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center">W</TableHead>
                  <TableHead className="text-center">D</TableHead>
                  <TableHead className="text-center">L</TableHead>
                  <TableHead className="hidden text-center sm:table-cell">GF</TableHead>
                  <TableHead className="hidden text-center sm:table-cell">GA</TableHead>
                  <TableHead className="text-center">GD</TableHead>
                  <TableHead className="text-center font-bold">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((row, i) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "transition-colors",
                      i < 2 && "bg-primary/5",
                    )}
                  >
                    <TableCell className="text-center text-sm font-mono font-medium text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <Link href={`/teams/${row.id}`} className="flex items-center gap-2.5 transition-colors hover:text-primary">
                        {row.logo_url ? (
                          <Image src={row.logo_url} alt={row.name} width={20} height={20} className="size-5 object-contain" />
                        ) : (
                          <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                            {row.name.slice(0, 2)}
                          </div>
                        )}
                        <span className="text-sm font-medium">{row.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center text-sm">{row.played}</TableCell>
                    <TableCell className="text-center text-sm">{row.wins}</TableCell>
                    <TableCell className="text-center text-sm">{row.draws}</TableCell>
                    <TableCell className="text-center text-sm">{row.losses}</TableCell>
                    <TableCell className="hidden text-center text-sm sm:table-cell">{row.goals_for}</TableCell>
                    <TableCell className="hidden text-center text-sm sm:table-cell">{row.goals_against}</TableCell>
                    <TableCell className={cn(
                      "text-center text-sm font-medium",
                      row.goal_difference > 0 && "text-emerald-600",
                      row.goal_difference < 0 && "text-red-500",
                    )}>
                      {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                    </TableCell>
                    <TableCell className="text-center text-sm font-bold">{row.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
