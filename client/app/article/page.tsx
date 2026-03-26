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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Building Minute93 — Engineering a Real-Time Football Platform",
};

const tableOfContents = [
  { id: "motivation", label: "Motivation" },
  { id: "architecture", label: "Architecture Overview" },
  { id: "event-pipeline", label: "The Event Pipeline" },
  { id: "real-time", label: "Real-Time Delivery" },
  { id: "data-layer", label: "Data Layer" },
  { id: "lessons", label: "Lessons Learned" },
  { id: "whats-next", label: "What's Next" },
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
            : Engineering a Real-Time Football Platform
          </h1>

          <p className="mt-6 text-lg text-muted-foreground">
            How I designed and built an event-driven distributed system to deliver live football data — from API polling to browser push in under 500ms.
          </p>

          <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              15 min read
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
          {/* Motivation */}
          <section id="motivation" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Zap className="size-3" />
              Chapter 1
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Motivation</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Every engineering portfolio needs a project that goes beyond CRUD. Something that deals with real-time data, concurrent consumers, cache invalidation, and the kind of infrastructure decisions that come up in production systems.
              </p>
              <p>
                I wanted to build something I genuinely cared about — not a todo app, not a Twitter clone — but a system that processes live events, updates multiple data stores in parallel, and pushes changes to users in real time. Football was the perfect domain.
              </p>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-sm italic">
                  &ldquo;The best portfolio project is one where the requirements are genuinely complex — not artificially complicated.&rdquo;
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Architecture */}
          <section id="architecture" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Layers className="size-3" />
              Chapter 2
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Architecture Overview</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Minute93 follows an event-driven architecture with a clear separation between data ingestion, processing, and delivery. Here&apos;s the high-level view:
              </p>
              <Card className="overflow-hidden">
                <CardContent className="bg-muted/30 p-6">
                  <pre className="overflow-x-auto text-xs leading-relaxed sm:text-sm">
{`API-Football (External)
  → Poller Worker (cron-based, dedup via Redis)
    → Kafka [match.events topic]
      ├─ CacheUpdater   → Redis (live scores)
      ├─ PostgresWriter  → Database (historical)
      ├─ StatsAggregator → Materialized Views
      └─ SsePublisher   → Redis Pub/Sub → SSE → Browser`}
                  </pre>
                </CardContent>
              </Card>
              <p>
                Each Kafka consumer is independent — if one fails, the others continue processing. This gives us resilience without complexity. The poller writes to Kafka, and everything downstream is eventually consistent.
              </p>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Event Pipeline */}
          <section id="event-pipeline" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Radio className="size-3" />
              Chapter 3
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">The Event Pipeline</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The heart of Minute93 is its event pipeline. A poller worker hits the API-Football endpoints on a configurable interval, deduplicates events using Redis Sets, and publishes new events to Kafka.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Database, title: "Deduplication", desc: "Redis SADD ensures each event is processed exactly once, even if the poller fetches overlapping data." },
                  { icon: Radio, title: "Fan-out", desc: "Kafka distributes each event to 4 consumer groups simultaneously — no bottleneck, no coupling." },
                  { icon: Shield, title: "Rate Limiting", desc: "The poller respects API-Football's rate limits with token bucket + Redis counters." },
                  { icon: Timer, title: "Backpressure", desc: "If consumers lag, Kafka retains events. Nothing is lost — processing just catches up." },
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
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Real-Time */}
          <section id="real-time" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Zap className="size-3" />
              Chapter 4
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Real-Time Delivery</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Getting data from Kafka to the browser requires bridging two worlds: the backend event stream and the frontend. I chose Server-Sent Events (SSE) over WebSockets for several reasons:
              </p>
              <ul className="space-y-2 pl-4">
                {[
                  "Unidirectional — the server pushes, the client listens. Perfect for live scores.",
                  "Auto-reconnects — built into the EventSource API, no library needed.",
                  "No protocol upgrade — works over standard HTTP, friendly to proxies and load balancers.",
                  "Simpler to debug — it's just a long-lived HTTP response with text/event-stream content type.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-1.5 size-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p>
                The SsePublisher Kafka consumer receives events and publishes them to a Redis Pub/Sub channel. The NestJS SSE controller subscribes to that channel and streams events to connected browsers.
              </p>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Data Layer */}
          <section id="data-layer" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <Database className="size-3" />
              Chapter 5
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Data Layer</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The data layer uses PostgreSQL for durable storage and Redis for hot reads. Standings and top scorer rankings are computed as materialized views, refreshed concurrently after each batch of events.
              </p>
              <p>
                Search is powered by PostgreSQL&apos;s pg_trgm extension — trigram-based fuzzy matching that tolerates misspellings without needing Elasticsearch. A GIN index on player and team names keeps it fast.
              </p>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-sm italic">
                  &ldquo;You don&apos;t always need a separate search engine. PostgreSQL trigram search with a GIN index handles fuzzy matching surprisingly well for datasets under a million rows.&rdquo;
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* Lessons */}
          <section id="lessons" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <BookOpen className="size-3" />
              Chapter 6
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Lessons Learned</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Building Minute93 taught me several things that don&apos;t show up in architecture diagrams:
              </p>
              <div className="space-y-3">
                {[
                  { title: "Start with the data flow", desc: "Draw the path from source to browser before writing code. It reveals coupling you'd otherwise discover too late." },
                  { title: "Idempotency is non-negotiable", desc: "In an event-driven system, every consumer must handle duplicate events gracefully. Design for at-least-once delivery from day one." },
                  { title: "Observability before optimization", desc: "I added Prometheus metrics and structured logging early. When something broke in production, I could see exactly where and why." },
                  { title: "External APIs are unreliable", desc: "API-Football has rate limits, occasional downtime, and inconsistent response shapes. Every integration point needs a fallback." },
                ].map(({ title, desc }) => (
                  <Card key={title}>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold">{title}</h4>
                      <p className="mt-1 text-sm leading-relaxed">{desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <Separator className="mb-16" />

          {/* What's Next */}
          <section id="whats-next" className="mb-16">
            <Badge variant="outline" className="mb-4 gap-1.5 text-xs">
              <ArrowRight className="size-3" />
              Chapter 7
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">What&apos;s Next</h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Minute93 is a living project. Here&apos;s what&apos;s on the roadmap:
              </p>
              <ul className="space-y-2 pl-4">
                {[
                  "Load testing with k6 during live Champions League matchdays",
                  "Adding match prediction models using historical data",
                  "Mobile-optimized PWA with push notifications",
                  "Grafana dashboards for real-time system health monitoring",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-1.5 size-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p>
                The goal is to run this system live during the Champions League 2025-26 season and write about what happens when real traffic hits a distributed system I built from scratch.
              </p>
            </div>
          </section>

          {/* CTA */}
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <Image
                src="/logo.png"
                alt="Minute93"
                width={48}
                height={48}
                className="rounded-lg"
              />
              <h3 className="text-lg font-bold">Explore the code</h3>
              <p className="text-sm text-muted-foreground">
                Minute93 is open source. Dive into the codebase and see every architectural decision in context.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <a href="https://github.com/azmainm/Minute93.git" target="_blank" rel="noopener noreferrer">
                  <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
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
