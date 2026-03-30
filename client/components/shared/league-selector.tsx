"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LEAGUES = [
  { value: "all", label: "All Leagues" },
  { value: "2", label: "Champions League", logo: "🏆" },
  { value: "39", label: "Premier League", logo: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { value: "140", label: "La Liga", logo: "🇪🇸" },
];

interface LeagueSelectorProps {
  value: string;
  onChange: (leagueId: string) => void;
}

export function LeagueSelector({ value, onChange }: LeagueSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="League" />
      </SelectTrigger>
      <SelectContent>
        {LEAGUES.map((league) => (
          <SelectItem key={league.value} value={league.value}>
            {league.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
