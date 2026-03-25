# Minute93

Real-time football intelligence platform with live scores, historical stats, league standings, and player/team search.

Built as a distributed systems portfolio piece targeting the Champions League 2025-26 season.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), shadcn/ui, Tailwind — deployed to Vercel
- **Backend:** NestJS 11, behind Nginx reverse proxy — deployed to Render (Docker)
- **Database:** PostgreSQL 16
- **Event Backbone:** Kafka (Upstash) — match event fan-out to 4 consumers
- **Cache / Pub/Sub:** Redis (Upstash) — cache-aside, rate limiting, pub/sub, deduplication
- **Data Source:** API-Football
- **Monitoring:** Grafana Cloud + Prometheus
- **Load Testing:** k6

## Project Structure

```
client/          → Next.js frontend
server/          → NestJS backend API
docs/            → Project plan, engineering standards, setup guide
.claude/docs/    → Documentation for AI-assisted development
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker
- npm

### 1. Clone and install

```bash
git clone https://github.com/azmainm/Minute93.git
cd Minute93

cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Start PostgreSQL

```bash
docker run -d --name minute93-postgres \
  -e POSTGRES_USER=minute93 \
  -e POSTGRES_PASSWORD=minute93_dev \
  -e POSTGRES_DB=minute93 \
  -p 5432:5432 \
  -v minute93_pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

### 3. Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

Edit both files with your credentials. See [docs/setup-guide.md](docs/setup-guide.md) for step-by-step instructions on setting up each external service.

### 4. Run development servers

```bash
# Terminal 1 — Backend
cd server && npm run start:dev

# Terminal 2 — Frontend
cd client && npm run dev
```

## Documentation

- [Project Plan](docs/InitialPlan.md) — Full architecture, feature set, timeline
- [Engineering Standards](docs/EngineeringStandards.md) — Code quality standards for all contributors
- [External Services Setup](docs/setup-guide.md) — How to set up API-Football, Upstash, Google OAuth, Grafana

## Engineering Standards

All code must comply with the [Engineering Standards](docs/EngineeringStandards.md). This applies to both human-written and AI-generated code. See the document for conventions on code organization, error handling, naming, API design, logging, testing, and git workflow.
