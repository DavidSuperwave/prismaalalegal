# Prisma Legal Agent

AI-powered legal intake system built with OpenClaw, ManyChat, and Supermemory.

## Stack

- **Agent:** OpenClaw v2026.3.7 + Kimi K2.5 via OpenRouter
- **Channels:** Telegram (native) + ManyChat (bridge)
- **Memory:** Supermemory v3
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

3. **Configure ManyChat:**
   - Webhook URL: `https://yourdomain.com/manychat/webhook`
   - Secret: Your `MANYCHAT_WEBHOOK_SECRET`

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
├── bridge/               # ManyChat webhook sidecar
│   ├── index.js
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

## License

Private — Prisma Legal Services
