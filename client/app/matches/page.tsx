"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Radio, Trophy, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { MatchCard } from "@/components/shared/match-card";
import { MatchCardSkeleton } from "@/components/shared/match-card-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { SeasonSelector } from "@/components/shared/season-selector";
import { getLiveMatches, getMatches } from "@/lib/api";
import type { Match, PaginatedData } from "@/lib/types";

type TabValue = "live" | "results" | "schedule";

export default function MatchesPage() {
  const [tab, setTab] = useState<TabValue>("live");
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<PaginatedData<Match> | null>(null);
  const [schedule, setSchedule] = useState<PaginatedData<Match> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState("2025");

  const fetchData = useCallback(async (activeTab: TabValue, selectedSeason: string) => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "live") {
        const data = await getLiveMatches();
        setLiveMatches(data);
      } else if (activeTab === "results") {
        const data = await getMatches({ status: "finished", limit: "20", season: selectedSeason, sort: "kickoff_at", order: "DESC" });
        setResults(data);
      } else {
        const data = await getMatches({ status: "scheduled", limit: "20", season: selectedSeason, sort: "kickoff_at", order: "ASC" });
        setSchedule(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(tab, season);
  }, [tab, season, fetchData]);

  const renderMatches = (matches: Match[], emptyIcon: typeof Radio, emptyTitle: string, emptyDesc: string) => {
    if (loading) {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorMessage message={error} onRetry={() => fetchData(tab, season)} />;
    }
    if (matches.length === 0) {
      return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDesc} />;
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          icon={CalendarDays}
          title="Matches"
          subtitle="Live scores, recent results, and upcoming fixtures across all competitions."
        />
        <SeasonSelector value={season} onChange={setSeason} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="live" className="gap-1.5">
            <Radio className="size-3.5" />
            Live
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5">
            <Trophy className="size-3.5" />
            Results
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <Clock className="size-3.5" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          {renderMatches(
            liveMatches,
            Radio,
            "No live matches right now",
            "Check back during match days for real-time scores and events."
          )}
        </TabsContent>

        <TabsContent value="results">
          {renderMatches(
            results?.items || [],
            Trophy,
            "No results yet",
            "Match results will appear here once games have been played."
          )}
        </TabsContent>

        <TabsContent value="schedule">
          {renderMatches(
            schedule?.items || [],
            Clock,
            "No upcoming matches",
            "The schedule will populate once fixtures are available."
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
