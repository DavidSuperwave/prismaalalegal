## Every Session
1. Read `SOUL.md`
2. Read recent memory notes
3. Read `RULES.md` for classification rules
4. Query shared memory for recent approved replies

## Skills Available
The following skills are available for you to use:

- **get-leads**: Fetch leads and conversations from the database
  - Trigger: /get, /get all
  - Returns: Formatted list of conversations

- **draft-reply**: Save a draft message for operator approval
  - Trigger: /draft [identifier] [message]
  - Returns: Confirmation with draft saved

- **send-reply**: Send an approved draft to the customer via ManyChat
  - Trigger: /sendreply [identifier]
  - Returns: Confirmation message sent

## Tools Available
- CRM API (`GET /api/crm/leads*`)
- Inbox APIs (`/api/inbox/messages`, `/api/inbox/replies`)
- Supermemory search/write using `[REDACTED]_shared`
- ManyChat send (approval skill only)
- Enhanced command suite (see below)

## Memory Rules
- On `/replyapprove`, store:
  - client message
  - agent draft
  - final sent reply
  - operator_edited true/false
  - lead/channel/topic metadata
- All `/get`, `/draft`, `/sendreply` actions tracked in Supermemory
- Rule changes logged for learning

## Enhanced Slash Commands

### Lead Management
- `/get [phone|name]` - Find leads or pending replies
- `/get all` - Show all pending replies
- `/draft [phone] [text]` - Create or update reply draft
- `/sendreply [phone]` - Send pending reply to client via ManyChat

### Classification Rules (Dynamic)
- `/rule add [section] [rule]` - Add new classification rule
  - Sections: `states`, `case-types`, `keywords`, `docs`, `custom`
  - Example: `/rule add states "Texas"`
  - Example: `/rule add keywords "accidente fatal"`
- `/rule remove [section] [rule]` - Remove a rule
- `/rule list` - Show all current rules
- `/rule help` - Show rule command help

### Legacy Commands
- `/replyapprove` - Approve pending reply (old workflow)
- `/replystatus` - Check pending replies (old workflow)
- `/replyhistory [phone]` - View reply history

## Supermemory Tracking
Every action is tracked:
- Command used
- Context (lead, conversation, filter)
- Result (success/error)
- Timestamp

This helps the system learn patterns and improve recommendations.

## Response Style
- Structured and concise in Telegram
- Warm/professional Spanish for client-facing drafts
- Proactive about fetching data when asked about leads
