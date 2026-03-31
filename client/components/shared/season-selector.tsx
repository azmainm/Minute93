"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_SEASONS = [
  { value: "2025", label: "2025-26" },
  { value: "2024", label: "2024-25" },
  { value: "2023", label: "2023-24" },
  { value: "2022", label: "2022-23" },
];

// 2022-23 only has UCL data
// Only UCL has 2022-23 data seeded
const UCL_LEAGUE_IDS = new Set(["1"]);

interface SeasonSelectorProps {
  value: string;
  onChange: (season: string) => void;
  leagueId?: string;
}

export function SeasonSelector({ value, onChange, leagueId }: SeasonSelectorProps) {
  const showAll = !leagueId || leagueId === "all" || UCL_LEAGUE_IDS.has(leagueId);
  const seasons = showAll
    ? ALL_SEASONS
    : ALL_SEASONS.filter((s) => s.value !== "2022");

  // If current value is filtered out, reset to latest
  if (!seasons.some((s) => s.value === value)) {
    onChange(seasons[0].value);
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Season" />
      </SelectTrigger>
      <SelectContent>
        {seasons.map((season) => (
          <SelectItem key={season.value} value={season.value}>
            {season.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
