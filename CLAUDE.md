# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Prisma Legal Agent — an AI-powered legal intake system for personal injury/accident cases. It routes leads from ManyChat and Telegram through OpenClaw AI agents, qualifies them, and exposes a Next.js dashboard for attorneys to manage leads, conversations, and replies.

## Architecture Overview

**Five Docker services** orchestrated via `docker-compose.yml`:

| Service | Port | Role |
|---|---|---|
| `openclaw` | 3100→18789 | OpenClaw agent runtime (Kimi K2.5 via OpenRouter) |
| `manychat-bridge` | 3300 | Express server handling ManyChat webhooks |
| `agent-bridge` | — | Polls SQLite for new messages, sends Telegram alerts |
| `web` | 3000 | Next.js 14 admin dashboard |
| `caddy` | 80/443 | HTTPS reverse proxy |

**Data flow (legacy):** ManyChat → Caddy → manychat-bridge (validates webhook secret, forwards) → web API (`/api/webhooks/manychat`) → SQLite. agent-bridge polls SQLite every 5s → Telegram notifications. Attorneys reply via Telegram commands or dashboard → ManyChat API sends to customer.

**Data flow (intake pipeline — primary):** ManyChat → Caddy → web API (`/api/webhooks/manychat/conversation`) → SQLite → intake processor (`web/lib/intake-processor.ts`) checks `intake_stage` → builds stage-specific prompt → calls OpenClaw → parses structured JSON response → updates `intake_stage` + `intake_data` → returns ManyChat v2 response with `external_message_callback`. Stages: `new` → `greeting` → `exploring` → `collecting` → `requesting_contact` → `briefing` → `handed_off`. Terminal stages: `rejected`, `closed`.

**Data flow (confidence fallback):** For conversations that have been handed off or where the intake processor returns null, the confidence router still applies: Supermemory search → confidence scoring (≥75% auto-reply, ≥50% draft + escalate, <50% full escalation to Telegram).

**Data flow (legacy handler 12h gap fix):** When ManyChat's `external_message_callback` timeout expires and falls back to the legacy handler (`/api/webhooks/manychat`), active intakes are still routed through the intake processor. Replies are sent directly via ManyChat API.

**Learning loop:** When replies are sent from the inbox (`/api/inbox/reply`), `web/lib/learning-loop.ts` stores the conversation turn in Supermemory v4 and saves approved reply patterns (or draft corrections) as v3 documents. The intake processor also stores conversation turns in Supermemory for enrichment.

**Three OpenClaw agents** (configured in `openclaw.json`):
- `operator` — Direct lawyer control via Telegram DM, restricted to `OPERATOR_TELEGRAM_USER_ID`
- `leads-inbox` — Intake qualification agent; handles `/get`, `/draft`, `/sendreply`, `/train`, and `/caso-*` commands
- `qualified-leads` — Scores leads 0-100, classifies case type (DEATH, INJURY, INSURER_DENIAL, LITIGATION)

Each agent has its own workspace directory (`workspace-operator/`, `workspace-leads-inbox/`, `workspace-qualified-leads/`) with `SOUL.md`, `AGENTS.md`, `USER.md`, and `TOOLS.md`.

**Database:** SQLite via better-sqlite3 with WAL journaling. Schema auto-created on first connection in `web/lib/db.ts`. Tables: `leads`, `conversations` (with `intake_stage` and `intake_data` columns), `messages`, `replies`, `processed_webhooks`, `training_sessions`. Shared via Docker volume `db_data` between `web` and `agent-bridge`.

**Memory:** Supermemory v3 for persistent agent memory (conversation history, contacts, decisions). Container tags follow pattern `client:alalegal:*` and `agent:prismaalalegal:*`.

## Common Commands

### Web app (Next.js)
```bash
cd web
npm run dev          # Local dev server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

### Docker (full stack)
```bash
docker compose up --build -d                    # Start all services
docker compose up --build -d web                # Rebuild and restart web only
docker compose logs -f web                      # Tail web logs
docker compose logs -f agent-bridge             # Tail agent-bridge logs
docker compose exec web sh                      # Shell into web container
```

### Deployment
Push to `main` triggers GitHub Actions CI/CD (`.github/workflows/deploy.yml`) which SSHs into production, pulls, rebuilds, and health-checks.

```bash
./scripts/deploy.sh yourdomain.com your@email.com   # First-time deploy
```

## Key Files

- `openclaw.json` — Agent model config, Telegram channel mapping, HTTP tools (`tools.http[]`), inter-agent settings
- `docker-compose.yml` — Service definitions; `db_data` volume is shared between `web` and `agent-bridge`
- `web/lib/db.ts` — SQLite schema, connection singleton, JSON helpers
- `web/lib/openclaw-client.ts` — `callOpenClaw()` helper for agent communication
- `web/lib/auth.ts` — JWT token management
- `web/middleware.ts` — Auth guard on protected routes
- `bridge/index.js` — ManyChat webhook handler (validates `MANYCHAT_WEBHOOK_SECRET`)
- `bridge/agent-bridge.js` — SQLite polling loop → Telegram alerts
- `workspace/skills/` — Agent JavaScript skills (telegram-alerts, supermemory, crm, templates, manychat-responder)
- `web/lib/learning-loop.ts` — Supermemory feedback: stores conversation turns (v4) and approved reply patterns / corrections (v3)
- `web/lib/intake-processor.ts` — Core intake pipeline: stage prompts, processIntakeMessage(), sendCaseBrief(), stage transitions, JSON parse safety
- `web/app/api/webhooks/manychat/conversation/route.ts` — Intake pipeline (primary) + confidence router (fallback) conversation handler
- `web/app/api/case-criteria/route.ts` — Case criteria API: evaluate, accept, reject, simulate, review actions
- `web/app/api/training/route.ts` — Training session API (start/add_exchange/correct/finish/cancel) called by agent via HTTP tools
- `workspace-leads-inbox/skills/training-mode/SKILL.md` — Agent instructions for `/train` workflow
- `workspace-leads-inbox/skills/case-criteria/SKILL.md` — Agent instructions for `/caso-*` commands
- `Caddyfile` — Reverse proxy routing rules
- `TENANT.md` — Slug/tag configuration that must stay aligned across workspace docs

## Conventions

- **Language:** Agent-facing content (SOUL.md, templates, user messages) is in Spanish. Code and API routes are in English.
- **API routes** live in `web/app/api/` following Next.js App Router conventions (route.ts files).
- **UI components** use shadcn/ui (Radix primitives + Tailwind CSS + `class-variance-authority`).
- **Auth:** JWT issued at `/api/auth/login`, stored in cookies, validated by `middleware.ts`. Credentials come from `AUTH_EMAIL` and `AUTH_PASSWORD` env vars.
- **Database migrations** are idempotent `ALTER TABLE` / `CREATE INDEX` wrapped in try-catch in `db.ts`, plus SQL files in `migrations/`. No migration framework.
- **OpenClaw HTTP tools** are defined in `openclaw.json` under `tools.http[]`. Agents call these as tool invocations during conversation turns. Auth via `x-service-token` header with `INTERNAL_SERVICE_TOKEN`.
- **Training mode:** Operator DMs `/train [category]` to the leads-inbox bot. Agent reads SKILL.md instructions and calls the training API via HTTP tools. Sessions persist in SQLite `training_sessions` table, finalized sessions are saved to Supermemory.
- **Intake pipeline** is the primary message handler. Conversations progress through deterministic stages (`new` → `greeting` → `exploring` → `collecting` → `requesting_contact` → `briefing` → `handed_off`). Case criteria: serious injury/death + insurance = accept; everything else = reject. Stage and extracted data stored in `conversations.intake_stage` / `conversations.intake_data`.
- **Confidence thresholds** in the conversation handler (fallback for post-handoff): ≥0.75 auto-replies, ≥0.50 drafts with Telegram escalation, <0.50 full escalation. Tunable via constants in the route file.
- **Case criteria commands** (`/caso-si`, `/caso-no`, `/caso-evaluar`, `/caso-simular`, `/casos-criterio`, `/caso-revisar`) let the operator manage intake criteria via Telegram. Defined in `workspace-leads-inbox/skills/case-criteria/SKILL.md`.
- **Webhook idempotency** tracked via `processed_webhooks` table.
- **ManyChat 24-hour window:** Replies outside the 24h window require `message_tag` bypass. The bridge and web API handle this automatically.
- **Agent workspace changes:** `openclaw doctor --fix` can overwrite workspace files; re-validate after running it.
