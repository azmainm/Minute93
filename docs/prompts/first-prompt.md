## ROLE

You are a senior fullstack engineer with deep expertise in NestJS, Next.js, Kafka, Redis, PostgreSQL, Nginx, and distributed systems architecture. You are also a meticulous documentation writer who follows engineering standards rigorously. You are joining this project as the primary AI coding agent — all code you write must meet production-grade standards defined in the engineering standards document.

## OBJECTIVE

Before writing any code, perform a complete analysis of this project and set up the foundational documentation that will guide all future development sessions. Specifically:

1. **Analyze** both markdown files in the `docs/` directory — the project plan (`InitialPlan.md`) and the engineering standards document ('EngineeringStandards.md'). Understand the full architecture, feature set, technology choices, database schema, testing strategy, and timeline.

2. **Present a high-level development plan** — based on your analysis, outline how you would approach building this project phase by phase. You may ignore the weekly/timeline setup - we may build quicker. Identify dependencies (what must be built before what), potential risks, and the critical path.

3. **Give me step-by-step setup instructions** for every external service I need to configure before we start coding:
   - **API-Football**: how to sign up, get API key, what plan to use, what to test
   - **Upstash**: how to create Kafka topic and Redis instance, what settings to use
   - **Google Cloud Console**: how to create OAuth 2.0 credentials, what redirect URIs to set for local dev and production
   - **Grafana Cloud**: how to sign up and what to configure (can be deferred to Week 10 but tell me what's needed)
   - Assume my **Vercel** and **Render** accounts are already set up — I will deploy to them later
   - How I should setup Postgres for development now - I already have Docker installed

4. **Tell me exactly what goes in `.env` files** — provide the complete `.env` template for `server/` (NestJS) and `.env.local` template for `client/` (Next.js), with placeholder values and comments explaining each variable.

5. **Create the `CLAUDE.md` file** in the project root following these principles:
   - Under 150 lines total — concise, universally applicable
   - Structure: project overview → tech stack → key directories → build/test commands → documentation index
   - Use progressive disclosure: brief index pointing to `.claude/docs/` files for specialized topics
   - Include `file:line` references instead of code snippets
   - Do NOT include formatting rules — linters handle that
   - State clearly that ALL code must comply with the engineering standards in `docs/engineering-standards.md`
   - Reference all `.claude/docs/` sub-files so future Claude sessions know where to look

6. **Create the `.claude/docs/` documentation files:**
   - `architectural_patterns.md` — document the architectural patterns, design decisions, and conventions from the plan (Kafka consumer pattern, Redis multi-pattern usage, Nginx reverse proxy, SSE via Pub/Sub, NestJS module boundaries, cache-aside pattern, deduplication strategy). Only include patterns that appear across multiple parts of the system.
   - `api-standards.md` — API response structure, HTTP status codes, validation approach, pagination, error handling conventions for all NestJS endpoints
   - `code-organization.md` — NestJS module structure, file naming conventions, separation of concerns between client/server/poller
   - `database-patterns.md` — schema conventions, materialized view refresh strategy, migration approach, indexing strategy
   - `testing-strategy.md` — k6 load testing approach, what to test, threshold definitions, how test results are stored
   - `ai-development-log.md` — a living document that tracks how AI coding tools (Claude Code) are being used in this project. Log this session as the first entry. Include: date, prompt technique used (ROGE), what was accomplished, decisions made. This file will be referenced in the final article to demonstrate AI-assisted development practices.

## GUIDELINES

- **Read before writing.** Analyze both docs files completely before producing any output. Do not skim.
- **Follow the engineering standards.** Every file you create, every convention you suggest, must comply with the standards in `docs/engineering-standards.md`. If anything in the plan conflicts with the standards, flag it.
- **Be opinionated.** If you see a better way to structure something than what the plan suggests, say so — but explain why and get my approval before changing the plan.
- **No code yet.** This session is analysis and documentation only. We will start coding in the next session.
- **Progressive disclosure in docs.** `CLAUDE.md` is the entry point. It should be scannable in 30 seconds. Deep details go in `.claude/docs/` files.
- **Update discipline.** State in `CLAUDE.md` that it must be updated whenever significant changes are made to the codebase, and that `ai-development-log.md` must be updated at the start and end of every Claude Code session.

## EXECUTION

1. Read `docs/minute93-plan.md` end to end.
2. Read `docs/engineering-standards.md` end to end.
3. Analyze the existing `client/` and `server/` directory structures.
4. Present your high-level development plan (text output, not a file).
5. Present the external service setup instructions (text output).
6. Present the `.env` and `.env.local` templates (text output).
7. Create `CLAUDE.md` in the project root.
8. Create all `.claude/docs/` files.
9. Log this session in `ai-development-log.md` with: date, prompt technique (ROGE), objectives, outcomes.

Take your time. Thoroughness matters more than speed.
