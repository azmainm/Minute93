"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search as SearchIcon, User, Users, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { search } from "@/lib/api";
import type { SearchResult } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await search(q);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={SearchIcon}
        title="Search"
        subtitle="Find any player or team instantly. Fuzzy matching tolerates misspellings — powered by PostgreSQL trigram search."
      />

      {/* Search Input */}
      <div className="relative mb-8">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search players or teams..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 pl-10 text-base"
          autoFocus
        />
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searched && results.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No results found"
          description={`No players or teams match "${query}". Try a different search term.`}
        />
      ) : results.length > 0 ? (
        <div className="space-y-2">
          {results.map((result) => {
            const href = result.type === "player"
              ? `/players/${result.id}`
              : `/teams/${result.id}`;
            const Icon = result.type === "player" ? User : Users;

            return (
              <Link key={`${result.type}-${result.id}`} href={href}>
                <Card className="group transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5">
                  <CardContent className="flex items-center gap-4 p-4">
                    {result.imageUrl ? (
                      <Image
                        src={result.imageUrl}
                        alt={result.name}
                        width={40}
                        height={40}
                        className="size-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <Icon className="size-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{result.name}</div>
                      <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {result.type}
                    </Badge>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : !searched ? (
        <div className="py-12 text-center">
          <SearchIcon className="mx-auto mb-4 size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Start typing to search across all players and teams.
          </p>
        </div>
      ) : null}
    </div>
  );
}
