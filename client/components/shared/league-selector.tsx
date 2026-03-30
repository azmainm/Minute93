"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLeagues } from "@/lib/api";
import type { League } from "@/lib/types";

interface LeagueSelectorProps {
  value: string;
  onChange: (leagueId: string) => void;
}

export function LeagueSelector({ value, onChange }: LeagueSelectorProps) {
  const [leagues, setLeagues] = useState<League[]>([]);

  useEffect(() => {
    getLeagues()
      .then(setLeagues)
      .catch(() => {});
  }, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="League" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Leagues</SelectItem>
        {leagues.map((league) => (
          <SelectItem key={league.id} value={String(league.id)}>
            {league.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
