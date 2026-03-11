# BOOTSTRAP.md — First-Run Checklist

**Run this checklist when deploying the agent for the first time.**

## Pre-Flight Checks

- [ ] All environment variables set in `.env`
- [ ] Domain DNS pointing to droplet IP
- [ ] Telegram bot created via @BotFather
- [ ] Bot added to #replies group as admin
- [ ] Bot added to #qualified-leads group as admin
- [ ] ManyChat webhook configured with secret

## Bootstrap Steps

### 1. Test Supermemory Connection
```bash
curl -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  https://api.supermemory.ai/v3/health
```
Expected: `{"status":"ok"}`

### 2. Test Telegram Bot
```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"
```
Expected: Bot info JSON

### 3. Send Test Message to #replies
```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_REPLIES_CHAT_ID" \
  -d "text=🚀 Prisma Legal Agent booting up..."
```
Expected: Message appears in group

### 4. Test ManyChat Webhook
```bash
curl -X POST http://localhost:3300/manychat/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $MANYCHAT_WEBHOOK_SECRET" \
  -d '{"subscriber":{"id":"test","name":"Test"},"message":{"text":"Hello"}}'
```
Expected: 200 response

### 5. Initialize Supermemory Containers
Run this to ensure all container tags exist:
- `client:prismaalalegal:conversations`
- `client:prismaalalegal:contacts`
- `client:prismaalalegal:qualified`
- `client:prismaalalegal:templates`
- `agent:prismaalalegal:learnings`

### 6. Send "Agent Online" Message
```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_REPLIES_CHAT_ID" \
  -d "text=✅ Prisma Legal Agent is now online and ready for intake."
```

## Post-Bootstrap Verification

- [ ] Agent responds to Telegram DMs
- [ ] Agent posts to #replies on all messages
- [ ] ManyChat webhook receives and processes messages
- [ ] Conversations are stored in Supermemory
- [ ] Health check endpoint returns all green

## Cleanup

**After successful bootstrap, DELETE this file.**

```bash
rm workspace/BOOTSTRAP.md
```

The agent is now ready for production.
