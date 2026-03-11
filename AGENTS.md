# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Prisma Legal Agent is an AI-powered legal intake system with three services:
- **web/** — Next.js 14 app (port 3000): dashboard with chat, CRM pipeline, and inbox
- **bridge/** — Express.js ManyChat webhook bridge (port 3300): optional, for ManyChat/Messenger channel
- **openclaw** — proprietary AI agent engine (Docker image, port 3100): external service, not runnable locally without the image

### Running services

- **Web app (primary):** `cd web && npm run dev` — starts on http://localhost:3000
- **Bridge (optional):** `cd bridge && node index.js` — starts on http://localhost:3300
- The web app needs env vars from the root `.env` file. A symlink `web/.env.local -> ../.env` is created during setup. If missing, run `ln -sf /workspace/.env /workspace/web/.env.local`.

### Lint / Build / Test

- **Lint:** `cd web && npm run lint`
- **Build:** `cd web && npm run build`
- **No test suite exists.** There are no automated tests in this codebase.

### Authentication

The web app uses env-configured credentials (`AUTH_EMAIL` / `AUTH_PASSWORD` in `.env`). Defaults in development: `admin@example.com` / `devpassword123`. Login at `/login` to access protected routes (`/chat`, `/crm`, `/inbox`, `/dashboard`).

### Database

SQLite via `better-sqlite3`. Schema auto-creates on first access. DB path controlled by `DATABASE_PATH` env var (default: `./data/template.db` relative to `web/` working dir).

### Key gotchas

- The root `.env` is NOT automatically read by Next.js — the `web/.env.local` symlink is required.
- The `openclaw` and `caddy` services are Docker-only and not needed for local web/bridge development.
- External APIs (OpenRouter, Supermemory, Telegram, ManyChat) require real API keys to function. The web app and bridge start fine without them but API-dependent features will fail gracefully.
- No lockfiles exist (`package-lock.json`, etc.), so `npm install` is used (not `npm ci`).
