# Prisma Legal Agent

AI-powered legal intake system built with OpenClaw, ManyChat, Supermemory, and a Next.js web app.

## Stack

- **Agent:** OpenClaw v2026.3.7 + Kimi K2.5 via OpenRouter
- **Channels:** Telegram (native) + ManyChat (bridge)
- **Memory:** Supermemory v3
- **Web:** Next.js 14 App Router + Tailwind CSS + SQLite
- **Infra:** Docker Compose + Caddy

## Quick Start

1. **Clone and configure:**
   ```bash
   git clone https://github.com/DavidSuperwave/prismaalalegal.git
   cd prismaalalegal
   cp .env.example .env
   # Fill in all API keys in .env
   ```

2. **Deploy:**
   ```bash
   ./scripts/deploy.sh yourdomain.com your@email.com
   ```

3. **Start services:**
   ```bash
   docker compose up --build -d
   ```

4. **Configure ManyChat:**
   - Webhook URL: `https://yourdomain.com/manychat/webhook`
   - Secret: Your `MANYCHAT_WEBHOOK_SECRET`

5. **Open the web app:**
   - Login: `https://yourdomain.com/login`
   - App: `https://yourdomain.com/chat`

## Environment Variables

See `.env.example` for all required variables.

## Structure

```
.
├── docker-compose.yml      # Service orchestration
├── openclaw.json          # Model config (Kimi K2.5)
├── workspace/             # Agent workspace
│   ├── SOUL.md           # Agent personality
│   ├── USER.md           # Company context
│   ├── AGENTS.md         # Capability config
│   ├── skills/           # Agent skills
│   │   ├── telegram-alerts.js
│   │   ├── supermemory.js
│   │   ├── crm.js
│   │   └── templates.js
├── bridge/               # ManyChat webhook sidecar / compatibility proxy
│   ├── index.js
│   └── Dockerfile
├── web/                  # Next.js web application
│   ├── app/              # Routes, layouts, API handlers
│   ├── components/       # Login, shell, chat, CRM, inbox UI
│   ├── lib/              # Auth, SQLite, API, hooks
│   └── Dockerfile
└── scripts/              # Deployment scripts
    ├── deploy.sh
    └── replicate.sh
```

## Telegram Groups

- **#replies:** All inbound messages
- **#qualified-leads:** Hot leads only

## API Endpoints

- `GET /health` — Health check
- `POST /manychat/webhook` — ManyChat webhook
- `POST /manychat/qualify` — Qualify lead
- `POST /api/auth/login` — JWT login
- `POST /api/chat` — OpenClaw chat proxy
- `GET|POST /api/crm/leads` — Lead listing and creation
- `GET|PATCH|DELETE /api/crm/leads/:id` — Lead CRUD
- `GET|POST /api/inbox/conversations` — Conversation list and creation
- `GET /api/inbox/conversations/:id` — Conversation thread
- `POST /api/webhooks/manychat` — Direct webhook receiver used by the web app

## License

Private — Prisma Legal Services
