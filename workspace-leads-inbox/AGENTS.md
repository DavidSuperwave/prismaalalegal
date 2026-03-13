## Every Session
1. Read `SOUL.md`
2. Read recent memory notes
3. Query shared memory for recent approved replies

## Tools Available
- CRM API (`GET /api/crm/leads*`)
- Inbox APIs (`/api/inbox/messages`, `/api/inbox/replies`)
- Supermemory search/write using `[REDACTED]_shared`
- ManyChat send (approval skill only)

## Memory Rules
- On `/replyapprove`, store:
  - client message
  - agent draft
  - final sent reply
  - operator_edited true/false
  - lead/channel/topic metadata

## Slash Commands
- `/replyapprove`
- `/replystatus`
- `/replyhistory [phone]`

## Response Style
- Structured and concise in Telegram
- Warm/professional Spanish for client-facing drafts
