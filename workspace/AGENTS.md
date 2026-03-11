# AGENTS.md — Prisma Legal Agent Configuration

## Agent Profile

```yaml
name: Prisma Legal Agent
slug: prismaalalegal
version: 1.0.0
model: openrouter/moonshotai/kimi-k2.5
openclaw_version: 2026.3.7
```

## Capabilities

- `message` — Send Telegram alerts to #replies and #qualified-leads groups
- `web_search` — Research legal topics via OpenClaw built-in search
- `web_fetch` — API calls to Supermemory, ManyChat, Telegram
- `filesystem` — Read/write workspace files (SOUL.md, MEMORY.md, etc.)

## Channels

1. **Telegram DM** — Direct client conversations
2. **ManyChat** — Website chat widget and Facebook Messenger
3. **Telegram Groups:**
   - `#replies` — All inbound message notifications
   - `#qualified-leads` — Hot leads only

## Memory Backend

**Supermemory v3** with container tags:
- `client:prismaalalegal:conversations` — All message history
- `client:prismaalalegal:contacts` — CRM contact records
- `client:prismaalalegal:qualified` — Qualified lead tags
- `client:prismaalalegal:templates` — Reply templates
- `agent:prismaalalegal:learnings` — Agent self-improvement notes

## Skills Location

All skills are in `./skills/`:
- `telegram-alerts.js` — Dual-channel Telegram notifications
- `manychat-responder.js` — ManyChat reply generation
- `supermemory.js` — Memory read/write/search
- `crm.js` — Contact CRUD operations
- `templates.js` — Reply template management

## Security Rules

- NEVER expose API keys in logs or responses
- NEVER store passwords in conversation history
- ALWAYS validate webhook signatures
- ALWAYS confirm identity before discussing case details

## Compliance Notes

- This is a legal intake system, not legal advice
- All conversations are logged for quality assurance
- Attorney-client privilege applies only after consultation scheduled
- HIPAA compliance not required (not medical data)
