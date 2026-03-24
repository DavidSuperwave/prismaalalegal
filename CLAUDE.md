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

**Data flow (conversation handler):** ManyChat → Caddy → web API (`/api/webhooks/manychat/conversation`) → SQLite + Supermemory search → confidence router (≥75% auto-reply via OpenClaw, ≥50% draft + escalate, <50% full escalation to Telegram) → returns ManyChat v2 response with `external_message_callback` for follow-up messages.

**Learning loop:** When replies are sent from the inbox (`/api/inbox/reply`), `web/lib/learning-loop.ts` stores the conversation turn in Supermemory v4 and saves approved reply patterns (or draft corrections) as v3 documents. This feeds back into the conversation handler's confidence scoring.

**Three OpenClaw agents** (configured in `openclaw.json`):
- `operator` — Direct lawyer control via Telegram DM, restricted to `OPERATOR_TELEGRAM_USER_ID`
- `leads-inbox` — SDR that handles `/get`, `/draft`, `/sendreply`, `/train` commands
- `qualified-leads` — Scores leads 0-100, classifies case type (DEATH, INJURY, INSURER_DENIAL, LITIGATION)

Each agent has its own workspace directory (`workspace-operator/`, `workspace-leads-inbox/`, `workspace-qualified-leads/`) with `SOUL.md`, `AGENTS.md`, `USER.md`, and `TOOLS.md`.

**Database:** SQLite via better-sqlite3 with WAL journaling. Schema auto-created on first connection in `web/lib/db.ts`. Tables: `leads`, `conversations`, `messages`, `replies`, `processed_webhooks`, `training_sessions`. Shared via Docker volume `db_data` between `web` and `agent-bridge`.

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
- `web/app/api/webhooks/manychat/conversation/route.ts` — Confidence-based conversation handler with auto-reply, draft, and escalation tiers
- `web/app/api/training/route.ts` — Training session API (start/add_exchange/correct/finish/cancel) called by agent via HTTP tools
- `workspace-leads-inbox/skills/training-mode/SKILL.md` — Agent instructions for `/train` workflow
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
- **Confidence thresholds** in the conversation handler: ≥0.75 auto-replies, ≥0.50 drafts with Telegram escalation, <0.50 full escalation. Tunable via constants in the route file.
- **Webhook idempotency** tracked via `processed_webhooks` table.
- **ManyChat 24-hour window:** Replies outside the 24h window require `message_tag` bypass. The bridge and web API handle this automatically.
- **Agent workspace changes:** `openclaw doctor --fix` can overwrite workspace files; re-validate after running it.
