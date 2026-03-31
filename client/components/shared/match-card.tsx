import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Match } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  match: Match;
  compact?: boolean;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: "Upcoming",
    live: "LIVE",
    halftime: "Half Time",
    finished: "Full Time",
    postponed: "Postponed",
    cancelled: "Cancelled",
    not_started: "Upcoming",
    extra_time: "Extra Time",
    penalties: "Penalties",
  };
  return map[status] || status;
}

function statusVariant(status: string) {
  if (status === "live" || status === "extra_time" || status === "penalties") return "live";
  if (status === "halftime") return "halftime";
  if (status === "finished") return "finished";
  return "default";
}

function formatKickoff(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchCard({ match, compact }: MatchCardProps) {
  const isLive = ["live", "extra_time", "penalties", "halftime"].includes(match.status);
  const variant = statusVariant(match.status);

  return (
    <Link href={`/matches/${match.id}`}>
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
          isLive && "ring-1 ring-primary/30",
        )}
      >
        {isLive && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
        )}
        <CardContent className={cn("p-4", compact && "p-3")}>
          {/* Status & Meta Row */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {match.league?.logo_url && (
                <Image
                  src={match.league.logo_url}
                  alt={match.league.name}
                  width={16}
                  height={16}
                  className="size-4 object-contain"
                />
              )}
              {match.league?.name && (
                <span className="text-xs text-muted-foreground">{match.league.name}</span>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium",
                variant === "live" && "animate-pulse border-primary/50 bg-primary/10 text-primary",
                variant === "halftime" && "border-amber-500/50 bg-amber-500/10 text-amber-600",
                variant === "finished" && "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {isLive && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" />}
              {statusLabel(match.status)}
            </Badge>
          </div>

          {/* Teams & Score */}
          <div className="flex items-center gap-3">
            {/* Home Team */}
            <div className="flex flex-1 items-center gap-2.5">
              {match.home_team?.logo_url ? (
                <Image
                  src={match.home_team.logo_url}
                  alt={match.home_team.name}
                  width={28}
                  height={28}
                  className="size-7 object-contain"
                />
              ) : (
                <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {match.home_team?.code || "?"}
                </div>
              )}
              <span className={cn(
                "text-sm font-medium truncate",
                compact && "text-xs",
              )}>
                {match.home_team?.name || "TBD"}
              </span>
            </div>

            {/* Score */}
            <div className={cn(
              "flex min-w-[60px] items-center justify-center gap-1 rounded-md px-2.5 py-1.5 font-mono text-base font-bold",
              isLive ? "bg-primary/10 text-primary" : "bg-muted",
              compact && "text-sm min-w-[50px]",
            )}>
              {match.home_score !== null ? (
                <>
                  <span>{match.home_score}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{match.away_score}</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">vs</span>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-1 flex-row-reverse items-center gap-2.5">
              {match.away_team?.logo_url ? (
                <Image
                  src={match.away_team.logo_url}
                  alt={match.away_team.name}
                  width={28}
                  height={28}
                  className="size-7 object-contain"
                />
              ) : (
                <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {match.away_team?.code || "?"}
                </div>
              )}
              <span className={cn(
                "text-sm font-medium truncate text-right",
                compact && "text-xs",
              )}>
                {match.away_team?.name || "TBD"}
              </span>
            </div>
          </div>

          {/* Footer Meta */}
          {!compact && (
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatKickoff(match.kickoff_at)}
              </span>
              {match.venue && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="size-3" />
                  {match.venue}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
