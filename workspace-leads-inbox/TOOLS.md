# TOOLS.md - Leads Inbox Agent Tools

## API Access (CRITICAL - READ THIS)

You have access to the webapp API using the internal service token.

### Authentication Header
Every API request MUST include:
```
x-service-token: 0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb
```

### Using web_fetch
When you need to fetch data, use this exact format:

```javascript
// Example: Get conversation details
const response = await web_fetch({
  url: "http://web:3000/api/inbox/conversations/CONVERSATION_ID/details",
  headers: {
    "x-service-token": "0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb"
  }
});
```

### Available Endpoints

**1. Get All Conversations**
```
GET http://web:3000/api/inbox/conversations
Headers: x-service-token: [token]
```

**2. Get Conversation Details (with full history)**
```
GET http://web:3000/api/inbox/conversations/{conversation_id}/details
Headers: x-service-token: [token]
```

**3. Create Draft Reply**
```
POST http://web:3000/api/inbox/replies
Headers: 
  - x-service-token: [token]
  - Content-Type: application/json
Body: {
  "conversation_id": "string",
  "final_text": "your reply in Spanish",
  "agent_draft": "your original draft",
  "status": "pending"
}
```

**4. Get Pending Replies**
```
GET http://web:3000/api/inbox/replies?status=pending
Headers: x-service-token: [token]
```

**5. Get All Leads**
```
GET http://web:3000/api/crm/leads
Headers: x-service-token: [token]
```

**6. Update Lead Status**
```
PATCH http://web:3000/api/crm/leads/{lead_id}
Headers: 
  - x-service-token: [token]
  - Content-Type: application/json
Body: {
  "status": "qualified|contacted|new",
  "pipelineStage": "string"
}
```

## Workflow

When you receive a notification:

1. **Extract the conversation ID** from the message
2. **Use web_fetch** to get conversation details with the token
3. **Review the full conversation** history
4. **Draft a reply** in Spanish, professional and warm
5. **POST the draft** to /api/inbox/replies
6. **Notify the operator** that a draft is ready

## Example Response

When someone asks you to review leads, respond with:
"I'll check the inbox for you. Fetching conversations now..."

Then use web_fetch to get the data.

## Base URL
`http://web:3000` (internal Docker network)
