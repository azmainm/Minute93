import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  GitFork,
  Zap,
  Database,
  Radio,
  Shield,
  Layers,
  Timer,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

const techStack = [
  { label: "NestJS 11", category: "Backend API", logo: "https://cdn.simpleicons.org/nestjs/E0234E" },
  { label: "Next.js 16", category: "Frontend", logo: "https://cdn.simpleicons.org/nextdotjs/000000" },
  { label: "PostgreSQL 16", category: "Database", logo: "https://cdn.simpleicons.org/postgresql/4169E1" },
  { label: "Redis", category: "Cache & Pub/Sub", logo: "https://cdn.simpleicons.org/redis/DC382D" },
  { label: "Kafka (Redpanda)", category: "Event Backbone", logo: "https://cdn.simpleicons.org/apachekafka/231F20" },
  { label: "TypeScript", category: "Language", logo: "https://cdn.simpleicons.org/typescript/3178C6" },
  { label: "Docker", category: "Infrastructure", logo: "https://cdn.simpleicons.org/docker/2496ED" },
  { label: "Nginx", category: "Reverse Proxy", logo: "https://cdn.simpleicons.org/nginx/009639" },
];

const architectureHighlights = [
  {
    icon: Radio,
    title: "Event-Driven Pipeline",
    description:
      "A Kafka-powered pipeline with 4 independent consumers — cache updater, Postgres writer, stats aggregator, and SSE publisher — each processing match events in parallel.",
  },
  {
    icon: Database,
    title: "4 Redis Patterns",
    description:
      "Cache-aside for hot reads, Pub/Sub for real-time push, rate limiting per IP/user, and Set-based deduplication — all in one Redis instance.",
  },
  {
    icon: Zap,
    title: "Real-Time SSE",
    description:
      "Server-Sent Events deliver live match updates to the browser without polling. Simpler than WebSocket, auto-reconnects, no protocol upgrade.",
  },
  {
    icon: Shield,
    title: "Layered Security",
    description:
      "Nginx rate limiting as first defense, NestJS ThrottlerGuard for per-user granularity, JWT auth with bcrypt, and CORS origin validation.",
  },
  {
    icon: Layers,
    title: "Materialized Views",
    description:
      "Standings and top scorer rankings are pre-computed in PostgreSQL materialized views, refreshed concurrently by Kafka consumers after each event.",
  },
  {
    icon: Timer,
    title: "Graceful Degradation",
    description:
      "Redis down? Fall back to Postgres. API-Football offline? Serve stale cache. Every component is designed to degrade without crashing.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/logo.png"
              alt="Minute93"
              width={72}
              height={72}
              className="mb-6 rounded-xl"
            />
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              The story behind{" "}
              <span className="text-primary">Minute93</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              A real-time football intelligence platform — and a distributed systems portfolio piece built by someone who believes the 93rd minute can change everything.
            </p>
          </div>
        </div>
      </section>

      {/* The Name */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Badge variant="outline" className="mb-4 text-xs">The Name</Badge>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            93rd minute. Lisbon. 2014.
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            May 24, 2014. The Champions League final. Real Madrid vs Atl&eacute;tico Madrid. Atl&eacute;tico leading 1-0. Stoppage time. The fourth official raises the board — three minutes added.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            In the 93rd minute, Sergio Ramos rises above everyone to meet a corner kick and powers a header into the net. 1-1. Atl&eacute;tico are broken. Real Madrid go on to win 4-1 in extra time, claiming La D&eacute;cima — their 10th European Cup.
          </p>
          <p className="mt-4 font-medium">
            That moment — raw, dramatic, decided in the final seconds — is exactly what this platform is built to capture in real time. That&apos;s why it&apos;s called Minute93.
          </p>
        </div>
      </section>

      <Separator className="mx-auto max-w-4xl" />

      {/* The Builder */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Badge variant="outline" className="mb-4 text-xs">The Builder</Badge>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Built by a football enthusiast
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            I&apos;m Azmain — a software engineer and lifelong Real Madrid fan. Minute93 is my portfolio project: a way to demonstrate what I can build as a software architect and engineer, wrapped in something I genuinely care about.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            This isn&apos;t a toy demo. It&apos;s a full distributed system — event-driven architecture, real-time data pipelines, production-grade infrastructure — designed to handle live football data during the Champions League 2025-26 season.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            The goal: build something real, deploy it to production, stress-test it with live data, and write about the engineering decisions honestly — what worked, what didn&apos;t, and why.
          </p>
        </div>
      </section>

      <Separator className="mx-auto max-w-4xl" />

      {/* Architecture */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-4 text-xs">Architecture</Badge>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            What powers this
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every architectural decision serves a purpose. Here are the highlights.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {architectureHighlights.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="transition-all duration-200 hover:shadow-sm">
              <CardContent className="p-5">
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t bg-card">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tech Stack</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map(({ label, category, logo }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 transition-colors hover:border-primary/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt={label} className="size-6" />
                <div className="text-left">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight">Want to see the code?</h2>
          <p className="mt-3 text-muted-foreground">
            Minute93 is open source. Explore the codebase, the architecture docs, and the engineering decisions.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href="https://github.com/azmainm/Minute93.git" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <GitFork className="size-4" />
                View on GitHub
              </Button>
            </a>
            <Link href="/matches">
              <Button variant="outline" size="lg" className="gap-2">
                Explore the App
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
