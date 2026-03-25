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
import type { StandingsRow } from "@/lib/types";

export default function StandingsPage() {
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStandings() {
      try {
        const data = await getStandings();
        setStandings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load standings");
      } finally {
        setLoading(false);
      }
    }
    fetchStandings();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={Trophy}
        title="Standings"
        subtitle="League table updated automatically after every match. Points, goal difference, and form at a glance."
      />

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
                    key={row.teamId}
                    className={cn(
                      "transition-colors",
                      i < 2 && "bg-primary/5",
                    )}
                  >
                    <TableCell className="text-center text-sm font-mono font-medium text-muted-foreground">
                      {row.rank}
                    </TableCell>
                    <TableCell>
                      <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2.5 transition-colors hover:text-primary">
                        {row.teamLogo ? (
                          <Image src={row.teamLogo} alt={row.teamName} width={20} height={20} className="size-5 object-contain" />
                        ) : (
                          <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                            {row.teamName.slice(0, 2)}
                          </div>
                        )}
                        <span className="text-sm font-medium">{row.teamName}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center text-sm">{row.played}</TableCell>
                    <TableCell className="text-center text-sm">{row.won}</TableCell>
                    <TableCell className="text-center text-sm">{row.drawn}</TableCell>
                    <TableCell className="text-center text-sm">{row.lost}</TableCell>
                    <TableCell className="hidden text-center text-sm sm:table-cell">{row.goalsFor}</TableCell>
                    <TableCell className="hidden text-center text-sm sm:table-cell">{row.goalsAgainst}</TableCell>
                    <TableCell className={cn(
                      "text-center text-sm font-medium",
                      row.goalDifference > 0 && "text-emerald-600",
                      row.goalDifference < 0 && "text-red-500",
                    )}>
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
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
