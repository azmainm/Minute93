"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Radio, Trophy, Clock } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { MatchCard } from "@/components/shared/match-card";
import { MatchCardSkeleton } from "@/components/shared/match-card-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorMessage } from "@/components/shared/error-message";
import { SeasonSelector } from "@/components/shared/season-selector";
import { LeagueSelector } from "@/components/shared/league-selector";
import { getLiveMatches, getMatches } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Match, PaginatedData } from "@/lib/types";

type TabValue = "live" | "results" | "upcoming";

export default function MatchesPage() {
  const [tab, setTab] = useState<TabValue>("live");
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<PaginatedData<Match> | null>(null);
  const [upcoming, setUpcoming] = useState<PaginatedData<Match> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState("2025");
  const [leagueId, setLeagueId] = useState("all");

  const showSeasonSelector = tab === "results";

  const fetchData = useCallback(async (activeTab: TabValue, selectedSeason: string, selectedLeague: string) => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "live") {
        const data = await getLiveMatches();
        setLiveMatches(selectedLeague !== "all"
          ? data.filter((m) => String(m.league_id) === selectedLeague)
          : data);
      } else if (activeTab === "results") {
        const params: Record<string, string> = { status: "finished", limit: "20", season: selectedSeason, sort: "kickoff_at", order: "DESC" };
        if (selectedLeague !== "all") params.league_id = selectedLeague;
        const data = await getMatches(params);
        setResults(data);
      } else {
        const params: Record<string, string> = { status: "scheduled", limit: "20", sort: "kickoff_at", order: "ASC" };
        if (selectedLeague !== "all") params.league_id = selectedLeague;
        const data = await getMatches(params);
        setUpcoming(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(tab, season, leagueId);
  }, [tab, season, leagueId, fetchData]);

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
      return <ErrorMessage message={error} onRetry={() => fetchData(tab, season, leagueId)} />;
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
      <PageHeader
        showLogo
        title="Matches"
        subtitle="Live scores, recent results, and upcoming fixtures across all competitions."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        {/* Tab Selector */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { value: "live" as TabValue, icon: Radio, label: "Live", sublabel: "Now playing", color: "primary" },
              { value: "results" as TabValue, icon: Trophy, label: "Results", sublabel: "Full time", color: "emerald" },
              { value: "upcoming" as TabValue, icon: Clock, label: "Upcoming", sublabel: "Scheduled", color: "blue" },
            ].map(({ value, icon: Icon, label, sublabel }) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={cn(
                  "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-center transition-all duration-200 sm:flex-row sm:gap-3 sm:px-5 sm:py-4 sm:text-left",
                  tab === value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-transparent bg-muted/50 hover:border-muted-foreground/20 hover:bg-muted",
                )}
              >
                <div className={cn(
                  "flex size-10 items-center justify-center rounded-lg transition-colors",
                  tab === value ? "bg-primary/15 text-primary" : "bg-background text-muted-foreground group-hover:text-foreground",
                )}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className={cn(
                    "text-sm font-semibold sm:text-base",
                    tab === value ? "text-primary" : "text-foreground",
                  )}>
                    {label}
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">{sublabel}</div>
                </div>
                {value === "live" && tab === value && (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-primary animate-pulse sm:right-3 sm:top-3" />
                )}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <LeagueSelector value={leagueId} onChange={setLeagueId} />
            {showSeasonSelector && (
              <SeasonSelector value={season} onChange={setSeason} leagueId={leagueId} />
            )}
          </div>
        </div>

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

        <TabsContent value="upcoming">
          {renderMatches(
            upcoming?.items || [],
            Clock,
            "No upcoming matches",
            "The schedule will populate once fixtures are available."
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
