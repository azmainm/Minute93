"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SEASONS = [
  { value: "2024", label: "2024-25" },
  { value: "2023", label: "2023-24" },
  { value: "2022", label: "2022-23" },
];

interface SeasonSelectorProps {
  value: string;
  onChange: (season: string) => void;
}

export function SeasonSelector({ value, onChange }: SeasonSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Season" />
      </SelectTrigger>
      <SelectContent>
        {SEASONS.map((season) => (
          <SelectItem key={season.value} value={season.value}>
            {season.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
