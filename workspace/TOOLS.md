# TOOLS.md — API Documentation

## Supermemory v3 API

**Base URL:** `https://api.supermemory.ai/v3`
**Auth:** `Authorization: Bearer {SUPERMEMORY_API_KEY}`

### Add Document
```http
POST /add
Content-Type: application/json

{
  "content": "string",
  "containerTags": ["client:prismaalalegal:conversations"],
  "customId": "optional-unique-id",
  "metadata": { ... }
}
```

### Search Documents
```http
POST /search
Content-Type: application/json

{
  "query": "search text",
  "containerTags": ["client:prismaalalegal:conversations"],
  "limit": 10
}
```

### Get Document
```http
GET /get/{customId}
```

## ManyChat API

**Base URL:** `https://api.manychat.com/v2`
**Auth:** `Authorization: Bearer {MANYCHAT_API_KEY}`

### Send Message to Subscriber
```http
POST /fb/sending/sendMessage
Content-Type: application/json

{
  "subscriber_id": "string",
  "message": {
    "type": "text",
    "text": "Hello!"
  }
}
```

### Get Subscriber Info
```http
GET /fb/subscriber/getInfo?subscriber_id={id}
```

## Telegram Bot API

**Base URL:** `https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}`

### Send Message
```http
POST /sendMessage
Content-Type: application/json

{
  "chat_id": "-100xxxxxxxxxx",
  "text": "Message text",
  "parse_mode": "Markdown"
}
```

### Create Chat Invite Link
```http
POST /createChatInviteLink
Content-Type: application/json

{
  "chat_id": "-100xxxxxxxxxx",
  "member_limit": 1
}
```

## OpenClaw Gateway

**Base URL:** `http://openclaw:3100` (internal)

### Send Message to Agent
```http
POST /api/message
Content-Type: application/json

{
  "role": "user",
  "content": "[Channel] Name: Message",
  "channel": "telegram|manychat"
}
```

### Health Check
```http
GET /health
```

## Internal CRM Operations

All CRM operations go through Supermemory with container tag: `client:prismaalalegal:contacts`

### Contact Record Shape
```json
{
  "name": "string",
  "phone": "string | null",
  "email": "string | null",
  "channel": "manychat | telegram | web",
  "status": "new | active | qualified | converted | inactive",
  "tags": ["string"],
  "notes": [{ "text": "string", "timestamp": "ISO8601" }],
  "first_seen": "ISO8601",
  "last_seen": "ISO8601",
  "conversation_count": 0,
  "qualified_at": "ISO8601 | null",
  "qualified_reason": "string | null"
}
```
