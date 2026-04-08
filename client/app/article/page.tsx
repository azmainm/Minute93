import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Radio,
  Database,
  Zap,
  Shield,
  Layers,
  GitFork,
  ArrowRight,
  Timer,
  ChevronRight,
  Search,
  Cpu,
  BarChart3,
  Target,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Building Minute93: A Real-Time Football Platform Built to Scale",
};

const tableOfContents = [
  { id: "what-it-does", label: "What Minute93 Does" },
  { id: "data-pipeline", label: "The Data Pipeline" },
  { id: "consumers", label: "Four Consumers" },
  { id: "live-updates", label: "Live Updates" },
  { id: "redis", label: "Redis Patterns" },
  { id: "search-poller", label: "Search & Poller" },
  { id: "database-infra", label: "Database & Infra" },
  { id: "load-testing", label: "Load Testing" },
  { id: "architecture-proof", label: "What This Proves" },
  { id: "why", label: "Why I Built This" },
];

export default function ArticlePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <Link
            href="/about"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to About
          </Link>

          <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
            <BookOpen className="size-3" />
            Engineering Deep Dive
          </Badge>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Building{" "}
            <span className="text-primary">Minute93</span>
            : A Real-Time Football Platform Built to Scale
          </h1>

          <p className="mt-6 text-lg text-muted-foreground">
            I built Minute93 because I wanted to solve a problem that sounds simple but gets complicated fast: show people live football scores, match events, standings, and more, all updating in real time, all backed by a system that could actually handle match-day traffic.
          </p>

          <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              12 min read
            </span>
            <span>By Azmain Morshed</span>
          </div>
        </div>
      </section>

      {/* Table of Contents + Article Body */}
      <div className="mx-auto flex max-w-5xl gap-12 px-4 py-12 sm:px-6 lg:px-8">
        {/* Sidebar TOC - desktop only */}
        <aside className="hidden w-56 flex-shrink-0 lg:block">
          <div className="sticky top-24">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Contents
            </h3>
            <nav className="space-y-1">
              {tableOfContents.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="size-3" />
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Article Content */}
        <article className="min-w-0 flex-1">
          {/* What Minute93 Does */}
          <section id="what-it-does" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Zap className="size-3" />
              Chapter 1
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">What Minute93 Does</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                At its core, Minute93 is a football intelligence platform. You can check live scores as matches happen, see goals and cards and substitutions appear the moment they occur, browse league standings, look up teams and players, and search across the entire dataset with fuzzy matching.
              </p>
              <p>
                The frontend is a Next.js app. The backend is a NestJS API behind an Nginx reverse proxy, with Kafka handling event streaming, Redis managing caching and real-time delivery, and k6 for load testing. Data comes from API-Football, which provides real-time match data for leagues like the Champions League, La Liga, and the Premier League.
              </p>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-sm italic">
                  &ldquo;But the interesting part is not what the app does. It is how the data moves through the system.&rdquo;
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* The Data Pipeline */}
          <section id="data-pipeline" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Radio className="size-3" />
              Chapter 2
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">The Data Pipeline</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Everything starts with a poller. It is a background worker written in Node.js that hits the API-Football endpoint on a schedule. During live matches, it polls every 30 seconds. When nothing is happening, every 5 minutes. It runs per league, so Champions League matches get their own polling cycle separate from La Liga or the Premier League.
              </p>
              <p>
                When the poller picks up new data, the first thing it does is check for duplicates. Every event (a goal, a card, a substitution) gets an ID built from the match ID, event type, minute, and player name. That ID gets pushed into a Redis set. If Redis returns 0, it means the event was already seen, and the poller drops it. If it returns 1, the event is new, and it goes into Kafka.
              </p>
              <p>
                The Kafka topic is called <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">match.events</code>, and this is where things get interesting.
              </p>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Four Consumers */}
          <section id="consumers" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Layers className="size-3" />
              Chapter 3
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Four Consumers, One Event Stream</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                When an event lands in <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">match.events</code>, four independent Kafka consumer groups pick it up. Each one does something different with the same event, and none of them know about each other.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Database, title: "Postgres Writer", desc: "Persists events, writes or updates match rows with the current score, status, and minute. Stores individual events like goals, cards, and substitutions." },
                  { icon: Zap, title: "Cache Updater", desc: "Updates Redis with live score data cached at a 5-minute TTL. Invalidates standings caches on every match update so the next request fetches fresh data." },
                  { icon: BarChart3, title: "Stats Aggregator", desc: "Watches for goals and match-end events. Fetches fresh standings from API-Football and upserts them to keep standings accurate in near real-time." },
                  { icon: Radio, title: "SSE Publisher", desc: "Pushes every event to a Redis Pub/Sub channel. Each match gets its own channel, so clients watching one match never receive noise from another." },
                ].map(({ icon: Icon, title, desc }) => (
                  <Card key={title}>
                    <CardContent className="p-4">
                      <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold">{title}</h4>
                      <p className="mt-1 text-xs leading-relaxed">{desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p>
                This is the core advantage of the fan-out pattern. One event enters the system, and four different things happen with it independently. If the Postgres writer falls behind, it does not slow down the SSE publisher. If the cache updater has a hiccup, standings still get written to the database. Each consumer can be scaled, restarted, or debugged without touching the others.
              </p>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Live Updates */}
          <section id="live-updates" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Zap className="size-3" />
              Chapter 4
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">How Live Updates Reach the Browser</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The live update path is worth walking through because it completely bypasses both Postgres and the main API for the hot path.
              </p>
              <p>
                When you open a live match on Minute93, your browser opens an EventSource connection to the SSE endpoint. On the server side, the NestJS controller subscribes to the Redis Pub/Sub channel for that match. When the SSE Publisher consumer pushes an event to that channel, Redis delivers it to the subscriber, which pushes it down the SSE stream to your browser.
              </p>
              <p>
                Your browser parses the event and updates the UI: the score changes, a new event appears in the timeline, the match minute ticks forward. When the match status changes to finished, the client closes the stream and fetches the final match data via a normal REST call.
              </p>
              <Card className="overflow-hidden">
                <CardContent className="bg-muted/30 p-6">
                  <pre className="overflow-x-auto text-xs leading-relaxed sm:text-sm">
{`Browser (EventSource)
    |
    v
GET /matches/:id/stream
    |
    v
NestJS SSE Controller -- subscribes to --> Redis Pub/Sub (match:{id}:events)
    ^
    |
SSE Publisher Consumer <-- reads from -- Kafka (match.events)`}
                  </pre>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-sm italic">
                  &ldquo;During a live match, the SSE path generates zero database queries. If you had 10,000 people watching the same match, the database would not feel it at all. The load stays on Redis, which is built for exactly this kind of workload.&rdquo;
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Redis Patterns */}
          <section id="redis" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Database className="size-3" />
              Chapter 5
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Redis is Doing Four Different Jobs</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                One thing I am proud of in this design is how Redis serves four completely different purposes, each one a textbook pattern used in production systems everywhere.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Database, title: "Cache-Aside", desc: "Live scores and standings get cached with short TTLs. Most read requests hit Redis first and only touch Postgres on a cache miss." },
                  { icon: Radio, title: "Pub/Sub", desc: "Powers live update delivery. Kafka consumers publish events to per-match channels, and SSE controllers subscribe to them." },
                  { icon: Shield, title: "Deduplication", desc: "The poller pushes event IDs into a Redis set with a 24-hour TTL. If an event ID already exists, it gets dropped." },
                  { icon: Timer, title: "Rate Limiting", desc: "A sliding window counter using INCR and EXPIRE keeps any single client from hammering the server." },
                ].map(({ icon: Icon, title, desc }) => (
                  <Card key={title}>
                    <CardContent className="p-4">
                      <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold">{title}</h4>
                      <p className="mt-1 text-xs leading-relaxed">{desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="font-medium text-foreground">
                Four patterns, one Redis instance, zero overlap between them.
              </p>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Search & Poller */}
          <section id="search-poller" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Search className="size-3" />
              Chapter 6
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Search & The Poller&apos;s Tricks</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The search feature uses PostgreSQL&apos;s <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">pg_trgm</code> extension for fuzzy matching. GIN indexes on player names and team names enable the similarity operator, so searching for &ldquo;Ramos&rdquo; will find results even if you type &ldquo;Ramoss&rdquo; or &ldquo;Ramo.&rdquo; Results from both the players and teams tables get combined, sorted by similarity score, and returned as a unified list. It is fast, it is forgiving of typos, and it runs entirely inside Postgres without needing a separate search engine.
              </p>
              <p>
                The polling logic handles a few edge cases that are easy to miss. When a match disappears from the live feed, the poller does not just assume it is over. It tracks previously-live match IDs in memory per league. If a match was live in the last poll but is gone from the current one, the poller fetches that specific match by ID to figure out the real final status. Was it full time? Extra time? Penalties? This matters.
              </p>
              <p>
                On every poll cycle, the poller also checks for any matches still marked as live whose kickoff was more than 2.5 hours ago. No real football match lasts that long. When it finds one, it resolves the final status through Kafka if possible, or falls back to updating Postgres directly. This guarantees that no match can ever be stuck in the live tab indefinitely.
              </p>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Database & Infra */}
          <section id="database-infra" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Layers className="size-3" />
              Chapter 7
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Database & Infrastructure</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The Postgres schema has 12 tables and a couple of materialized views. The tables cover users, leagues, teams, players, matches, match events, lineups, analytics, and more. Indexing is designed around the actual access patterns. B-tree indexes on match status, kickoff time, and league ID handle the filtered queries that power the main pages. GIN trigram indexes handle search. JSONB columns store match statistics and event details where a flexible schema makes more sense than strict columns.
              </p>
              <p>
                The backend API runs on 2 CPU cores with 4 GB of RAM. Postgres has 0.5 CPU and 1 GB of RAM. Redis has 1 GB of memory and 1,000 connections. Kafka is on a managed cloud tier that has been rock solid. The frontend is on a free hosting tier.
              </p>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-sm italic">
                  &ldquo;That is the whole stack. No Kubernetes, no multi-region deployment, no managed container orchestration. Just a handful of services, each sized for the job.&rdquo;
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Load Testing */}
          <section id="load-testing" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Target className="size-3" />
              Chapter 8
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Load Testing: The Part Where Things Broke</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Building a system that works under zero load is easy. The real question was whether Minute93 could handle match-day traffic, and the only way to answer that was to throw simulated users at it.
              </p>
              <p>
                I used k6 and designed tests around five realistic user behavior scenarios. 45% of virtual users were casual viewers who check live scores, glance at a match, look at standings, and leave. 25% were live match watchers who pick a match and poll for updates every few seconds for minutes at a time. 15% were explorers browsing teams, players, and results. 10% were searchers using the fuzzy search feature. 5% were power users drilling deep into multiple matches, events, and lineups.
              </p>
              <p>
                The test patterns simulated real match-day traffic too. Pre-match ramp as users arrive before kickoff. A sudden spike when the match starts. Sharp surges when goals are scored. A halftime dip. A second-half return. A gradual cooldown after the final whistle.
              </p>

              <h3 className="text-lg font-semibold text-foreground pt-4">The Baseline Tests</h3>
              <p>
                The first round of tests ran at moderate load, around 200 virtual users, with varying durations. The results were clean. 100% pass rates, sub-second median latencies, zero errors. The system worked exactly as designed.
              </p>

              <h3 className="text-lg font-semibold text-foreground pt-4">The Ambitious Tests</h3>
              <p>
                Then I pushed it. 3,000 concurrent virtual users, simulating a full Champions League evening. The system collapsed. Error rates above 90%. Requests timing out at 30 seconds. One test had to be aborted less than a minute in because the server was already unresponsive.
              </p>

              <h3 className="text-lg font-semibold text-foreground pt-4">The Diagnosis</h3>
              <p>
                Here is the thing though. The failure was not architectural. Nothing about the design broke. The Kafka consumers kept doing their jobs. The Redis patterns still worked. The SSE path still functioned. What happened was purely a resource issue: the CPU was completely saturated, and requests piled up waiting for compute time that was not there.
              </p>

              <h3 className="text-lg font-semibold text-foreground pt-4">The Proof</h3>
              <p>
                So I designed a final test at the ceiling of what the infrastructure could handle. 500 sustained virtual users with spikes to 800. Same match-day patterns. Same user behavior scenarios. Same chaos.
              </p>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-sm italic">
                  &ldquo;The result: 100% checks passed. Zero percent error rate. Zero failed requests. Every pattern held. Kafka fan-out, Redis cache-aside, Pub/Sub for SSE delivery, event deduplication. All of it working exactly as intended under sustained load.&rdquo;
                </CardContent>
              </Card>
              <p>
                The only thing that ran hot was the CPU, and that is not a design problem. That is an infrastructure sizing knob.
              </p>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* What This Proves */}
          <section id="architecture-proof" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Cpu className="size-3" />
              Chapter 9
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">What This Proves About the Architecture</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The whole point of this exercise was to answer a question: does this architecture actually scale, or does it just work when nobody is using it?
              </p>
              <div className="space-y-3">
                {[
                  { title: "Stateless API layer", desc: "NestJS handles requests without storing session state in memory. You can put more instances behind a load balancer and each one handles its share. No sticky sessions, no shared state between processes." },
                  { title: "Cache absorbs read traffic", desc: "With Redis sitting in front of Postgres, 80-90% of requests at scale would never touch the database. Most traffic is live scores and standings, cached with short TTLs and served in sub-millisecond reads." },
                  { title: "Per-consumer scaling", desc: "Because each Kafka consumer group is independent, you can scale the one that is lagging without touching the others. If SSE delivery is slow, add more SSE publisher instances." },
                  { title: "Live path skips the database", desc: "Kafka to Redis Pub/Sub to the browser. During a live match with thousands of viewers, the database does not see any of that traffic." },
                  { title: "Tuned access patterns", desc: "Smart indexing means the database does less work per query, so each unit of CPU goes further." },
                ].map(({ title, desc }) => (
                  <Card key={title}>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold">{title}</h4>
                      <p className="mt-1 text-sm leading-relaxed">{desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p>
                If you wanted to take this to true scale (10,000+ concurrent users), you would add a load balancer, Postgres read replicas, a CDN for caching API responses at edge locations, a Redis cluster for more memory and connections, and more Kafka partitions for parallel event processing. None of that requires code changes. The architecture already supports all of it because the API is stateless, the consumers are idempotent, the Redis patterns work across clusters, and the database uses proper indexes.
              </p>
              <p className="font-medium text-foreground">
                The proof is in the test results. Under sustained load with realistic traffic patterns, the system hit 100% success with zero errors. The architecture did not break. It just asked for more CPU. And that is exactly what good distributed system design looks like.
              </p>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Why I Built This */}
          <section id="why" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <BookOpen className="size-3" />
              Chapter 10
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Why I Built This</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                I read system design articles, case studies, and scaling postmortems all the time. But reading about how someone else handled 50,000 concurrent users is very different from actually sitting in front of a terminal, watching your own system fall over at 3,000, and figuring out why.
              </p>
              <p>
                A lot of us work at startups. And at a startup, you do not get to practice this stuff. The traffic is not there yet. You build features, ship fast, and hope the architecture holds when growth finally comes. But when it does come, you are suddenly expected to know how to handle it, and learning on the fly with real users and real money on the line is not a great position to be in.
              </p>
              <p>
                Minute93 was my way of getting ahead of that. I wanted to build something real, throw serious load at it, watch it break, diagnose the failures, and prove that the underlying design was sound. So that when the day comes at an actual job where traffic doubles overnight or a product goes viral, I already know what levers to pull.
              </p>
              <p>
                Beyond the system architecture, this project is also a showcase of my frontend and backend development skills end to end, and of a real workflow around building with AI coding agents. I had defined engineering standards at my workplace to ensure code quality, maintainability, and reliability, regardless of whether code is written by a human or generated by AI. Using structured prompting techniques, maintaining context across sessions, knowing when to lean on AI tooling and when to think through problems yourself. That is a skill in itself, and it is one that compounds over time.
              </p>
              <p>
                This was not just a portfolio project. It was practice for the real thing.
              </p>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-sm italic">
                  &ldquo;The name Minute93 comes from Sergio Ramos&apos; header against Atletico Madrid in the 2014 Champions League final. 93rd minute, his team trailing, the trophy slipping away. He did not score that goal by accident. He scored it because he had put in the work before. That is the whole idea behind this project. Do the work now, so when the real 93rd minute comes, you do not have to think. You just know what to do.&rdquo;
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Medium + CTA */}
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <Image
                src="/logo.png"
                alt="Minute93"
                width={48}
                height={48}
                className="rounded-lg"
              />
              <h3 className="text-lg font-bold">Read this article on Medium</h3>
              <p className="text-sm text-muted-foreground">
                This article is also published on Medium. Read it there, share it, or explore the codebase on GitHub.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <a href="https://medium.com/@azmainmorshed03/minute93-building-a-real-time-football-platform-to-learn-what-happens-when-thousands-show-up-e77d9aa76206" target="_blank" rel="noopener noreferrer">
                  <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <ExternalLink className="size-4" />
                    Read on Medium
                  </Button>
                </a>
                <a href="https://github.com/azmainm/Minute93.git" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <GitFork className="size-4" />
                    View on GitHub
                  </Button>
                </a>
                <Link href="/matches">
                  <Button variant="outline" className="gap-2">
                    Explore the App
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </article>
      </div>
    </div>
  );
}
