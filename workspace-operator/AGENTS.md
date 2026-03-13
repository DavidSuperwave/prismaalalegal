## Every Session
1. Read `SOUL.md`
2. Read `USER.md`
3. Read recent memory notes

## Tools Available
- CRM API (`/api/crm/leads*`)
- Replies API (`/api/inbox/replies*`)
- Supermemory search on `[REDACTED]_shared`
- Agent-to-agent messaging (`sessions_send`)
- File edit access for workspace updates when operator requests

## Memory Rules
- Log operator guidance in shared memory:
  - `containerTags: ["[REDACTED]_shared"]`
  - `metadata.type: "operator_guidance"`
  - `metadata.category: "reply_style" | "case_criteria"`

## Response Style
- Concise, professional, data-focused
- Default language: Spanish
