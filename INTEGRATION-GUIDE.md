# Integration Guide v2 — OpenClaw Compatible

## Compatibility Verified Against

- OpenClaw 2026.3.12 (your Docker image)
- Your `openclaw-with-tools.json` config (HTTP tools pattern)
- Your `web/lib/supermemory.ts` (TAGS.SHARED container tag)
- Your `web/lib/openclaw-client.ts` (callOpenClaw pattern)
- Your `web/lib/internal-auth.ts` (x-service-token auth)
- Docker network: web:3000, openclaw:18789, Caddy routing

## File Placement

```
prismaalalegal/
├── web/
│   ├── app/api/
│   │   ├── webhooks/manychat/
│   │   │   ├── route.ts                      ← KEEP (existing, backward compat)
│   │   │   └── conversation/
│   │   │       └── route.ts                  ← NEW — conversation handler
│   │   └── training/
│   │       └── route.ts                      ← NEW — training API
│   └── lib/
│       └── learning-loop.ts                  ← NEW — feedback module
├── workspace-leads-inbox/
│   └── skills/
│       └── training-mode/
│           └── SKILL.md                      ← NEW — agent instructions
├── openclaw-with-tools.json                  ← PATCH — add 2 HTTP tools
└── .env                                      ← PATCH — add 1 env var
```

## Step 1: Copy Files

```bash
# Conversation handler
mkdir -p web/app/api/webhooks/manychat/conversation
cp route.ts web/app/api/webhooks/manychat/conversation/route.ts

# Learning loop
cp learning-loop.ts web/lib/learning-loop.ts

# Training API
mkdir -p web/app/api/training
cp training-route.ts web/app/api/training/route.ts

# Training skill (SKILL.md only — no index.js needed)
mkdir -p workspace-leads-inbox/skills/training-mode
cp training-SKILL.md workspace-leads-inbox/skills/training-mode/SKILL.md
```

## Step 2: Add Environment Variable

In `.env`:
```bash
MANYCHAT_CALLBACK_URL=https://alalegal.proyectoprisma.com/api/webhooks/manychat/conversation
```

## Step 3: Add HTTP Tools to OpenClaw Config

In `openclaw-with-tools.json`, add these two entries to the `tools.http[]` array:

```json
{
  "name": "training_session",
  "description": "Manage training sessions. Actions: start, add_exchange, correct, finish, cancel.",
  "method": "POST",
  "baseUrl": "http://web:3000",
  "path": "/api/training",
  "headers": {
    "Content-Type": "application/json",
    "x-service-token": "${INTERNAL_SERVICE_TOKEN}"
  },
  "body": {
    "action": "string",
    "category": "string - optional",
    "customer_message": "string - optional",
    "agent_reply": "string - optional",
    "corrected_text": "string - optional",
    "index": "number - optional"
  }
},
{
  "name": "training_status",
  "description": "Check if there is an active training session.",
  "method": "GET",
  "baseUrl": "http://web:3000",
  "path": "/api/training",
  "headers": {
    "x-service-token": "${INTERNAL_SERVICE_TOKEN}"
  }
}
```

## Step 4: Wire Learning Loop Into Reply Endpoint

In `web/app/api/inbox/reply/route.ts`:

### Add import at top:
```typescript
import {
  learnFromConversationTurn,
  learnFromDraftCorrection,
  learnFromApprovedReply,
  wasReplyEdited,
  getLastCustomerMessage,
} from "@/lib/learning-loop";
```

### After successful send (after `// Save the sent message to database`):
```typescript
    // ---- LEARNING LOOP ----
    const lastCustomerMsg = getLastCustomerMessage(conversationId);
    if (lastCustomerMsg) {
      const edited = wasReplyEdited(originalDraft || null, message);

      await learnFromConversationTurn({
        conversationId,
        contactName: conversation.contact_name,
        customerMessage: lastCustomerMsg,
        replyText: message,
        channel: conversation.source,
        wasAutoReply: false,
        wasEdited: edited,
      });

      if (edited && originalDraft) {
        await learnFromDraftCorrection({
          conversationId,
          contactName: conversation.contact_name,
          customerMessage: lastCustomerMsg,
          originalDraft,
          editedReply: message,
          channel: conversation.source,
        });
      } else {
        await learnFromApprovedReply({
          conversationId,
          contactName: conversation.contact_name,
          customerMessage: lastCustomerMsg,
          replyText: message,
          channel: conversation.source,
          wasFromDraft: !!originalDraft,
        });
      }
    }
    // ---- END LEARNING LOOP ----
```

## Step 5: Update Bridge (Optional)

To route ManyChat traffic through the new conversation handler instead of 
the old webhook, update `bridge/index.js`:

```javascript
// Change primary path URL
const webResponse = await fetch(
  `${WEB_APP_INTERNAL_URL}/api/webhooks/manychat/conversation`,
  // ... rest stays the same
);
```

The old webhook at `/api/webhooks/manychat` remains as fallback.

## How Each Piece Executes

### Conversation Handler (web container)
```
ManyChat → Caddy → web:3000/api/webhooks/manychat/conversation
  → SQLite (save message)
  → Supermemory v3 search (find patterns)
  → callOpenClaw /api/message (generate reply)
  → Supermemory v4 (store turn)
  → Return ManyChat v2 + external_message_callback
```

### Learning Loop (web container)
```
Reply sent from inbox UI
  → reply/route.ts sends message
  → learning-loop.ts called
  → Supermemory v4 (conversation turn)
  → Supermemory v3 (correction or approval pattern)
```

### Training Mode (OpenClaw agent → web container)
```
Operator DMs leads-inbox bot on Telegram
  → OpenClaw receives message
  → Agent reads SKILL.md, recognizes /train command
  → Agent calls HTTP tool: POST http://web:3000/api/training
  → SQLite (training_sessions table)
  → On /fin: Supermemory v4 (conversation) + v3 (patterns)
```

## Testing

### Test conversation handler:
```bash
curl -X POST https://alalegal.proyectoprisma.com/api/webhooks/manychat/conversation \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET" \
  -d '{"subscriber":{"id":"TEST","name":"Test","channel":"fb"},"message":{"text":"Hola la aseguradora no quiere pagar"}}'
```

### Test training API:
```bash
# Start session
curl -X POST http://localhost:3000/api/training \
  -H "x-service-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"start","category":"negativa_aseguradora"}'

# Add exchange
curl -X POST http://localhost:3000/api/training \
  -H "x-service-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"add_exchange","customer_message":"La aseguradora no paga","agent_reply":"Entiendo su frustración..."}'

# Finish
curl -X POST http://localhost:3000/api/training \
  -H "x-service-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"finish"}'
```

### Test training via Telegram:
DM the leads-inbox bot: `/train negativa_aseguradora`

## Docker — No Changes Needed

The new endpoints run inside the existing `web` container. No new containers,
no new ports, no new volumes. The Caddy `/api/*` route catches everything.

## Rollback

1. Delete `web/app/api/webhooks/manychat/conversation/` directory
2. Delete `web/app/api/training/` directory  
3. Delete `web/lib/learning-loop.ts`
4. Remove training tools from `openclaw-with-tools.json`
5. Revert the import in `web/app/api/inbox/reply/route.ts`
6. Everything reverts to the old fire-and-forget webhook
