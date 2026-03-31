import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Zap,
  Trophy,
  Search,
  CalendarDays,
  Radio,
  BarChart3,
  Users,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Radio,
    title: "Live Scores",
    description: "Kafka-powered event pipeline pushes updates to your browser via SSE. No refresh needed.",
  },
  {
    icon: Trophy,
    title: "Standings",
    description: "Auto-updated league tables backed by Redis cache-aside for instant loads.",
  },
  {
    icon: BarChart3,
    title: "Match Stats",
    description: "Detailed match timelines with goals, cards, and substitutions from real-time event streams.",
  },
  {
    icon: Search,
    title: "Fuzzy Search",
    description: "Find any player or team instantly with PostgreSQL trigram indexing, even with misspellings.",
  },
  {
    icon: Users,
    title: "Team Profiles",
    description: "Squad lists, recent form, and upcoming fixtures served through Nginx reverse proxy.",
  },
  {
    icon: CalendarDays,
    title: "Full Schedule",
    description: "Browse past results and upcoming fixtures across all competitions with Redis-cached responses.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background via-background to-primary/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-2xl text-center">
            <Image
              src="/logo.png"
              alt="Minute93"
              width={64}
              height={64}
              className="mx-auto mb-6 rounded-xl"
              priority
            />
            <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/5 px-3 py-1 text-primary">
              <BarChart3 className="mr-1.5 size-3" />
              Distributed Systems Portfolio Project
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Every moment.{" "}
              <span className="bg-gradient-to-r from-primary to-rose-400 bg-clip-text text-transparent">
                Every goal.
              </span>{" "}
              In real time.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Live scores, historical stats, league standings, and instant search. A real-time football intelligence platform built for the beautiful game.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/matches">
                <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
                  <Radio className="size-4" />
                  View Live Matches
                </Button>
              </Link>
              <Link href="/article">
                <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
                  <BookOpen className="size-4" />
                  Read the Article
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Built for speed, designed for clarity
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need to follow football, from live events to deep stats, in one fast, clean interface.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Architecture Highlight */}
      <section className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="outline" className="mb-4 text-xs">
                Under the Hood
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Distributed systems, real results
              </h2>
              <p className="mt-4 text-muted-foreground">
                Minute93 is more than a sports app. It&apos;s a distributed systems portfolio piece demonstrating event-driven architecture at scale.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Kafka-powered event pipeline with 4 independent consumers",
                  "Redis for caching, pub/sub, rate limiting, and deduplication",
                  "Server-Sent Events for real-time browser push",
                  "PostgreSQL with materialized views and trigram search",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-1 size-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/about" className="mt-6 inline-block">
                <Button variant="ghost" className="gap-1.5 text-primary hover:text-primary/80">
                  Learn more about the architecture
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
            <div className="rounded-xl border bg-muted/30 p-6">
              <pre className="overflow-x-auto text-xs leading-relaxed text-muted-foreground sm:text-sm">
{`API-Football
  → Poller (dedup via Redis)
    → Kafka [match.events]
      ├─ CacheUpdater  → Redis
      ├─ PostgresWriter → DB
      ├─ StatsAggregator → Views
      └─ SsePublisher  → Browser`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to explore?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Dive into live matches, check standings, or search for your favorite player.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/matches">
              <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/article">
              <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
                <BookOpen className="size-4" />
                Read the Article
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
