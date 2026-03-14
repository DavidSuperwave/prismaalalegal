# TOOLS.md - Leads Inbox Agent Tools

## Authentication

All API calls require authentication. Use this header:
```
Authorization: Service 967e1b3fa5d5fcbc0eb163d589b6169aa7fadd560fbf1388
```

## API Endpoints (use web_fetch)

### Get Conversations
```bash
curl -H "Authorization: Service 967e1b3fa5d5fcbc0eb163d589b6169aa7fadd560fbf1388" \
  http://web:3000/api/inbox/conversations
```
Returns list of conversations with last message, contact info, status.

### Get Conversation Details
```bash
curl -H "Authorization: Service 967e1b3fa5d5fcbc0eb163d589b6169aa7fadd560fbf1388" \
  http://web:3000/api/inbox/conversations/{id}/details
```
Returns full conversation history including all messages.

### Create Draft Reply
```bash
curl -X POST \
  -H "Authorization: Service 967e1b3fa5d5fcbc0eb163d589b6169aa7fadd560fbf1388" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id":"string","final_text":"reply text","agent_draft":"draft","status":"pending"}' \
  http://web:3000/api/inbox/replies
```

### Get Leads
```bash
curl -H "Authorization: Service 967e1b3fa5d5fcbc0eb163d589b6169aa7fadd560fbf1388" \
  http://web:3000/api/crm/leads
```

### Get Pending Replies
```bash
curl -H "Authorization: Service 967e1b3fa5d5fcbc0eb163d589b6169aa7fadd560fbf1388" \
  "http://web:3000/api/inbox/replies?status=pending"
```

## Workflow

1. When you receive a notification, use web_fetch with the auth header to get conversation details
2. Review the full conversation history
3. Draft a reply in Spanish
4. POST the draft to /api/inbox/replies
5. Notify the operator in Telegram

## Base URL
`http://web:3000`
