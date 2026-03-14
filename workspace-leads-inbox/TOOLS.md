# TOOLS.md - Leads Inbox Agent Tools

## API Access (CRITICAL - READ THIS)

You have access to the webapp API using the internal service token.

### Authentication Header
Every API request MUST include:
```
x-service-token: 0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb
```

### Base URL
**USE THIS URL:** `https://alalegal.proyectoprisma.com`

⚠️ DO NOT use `http://web:3000` - it is blocked by security.

### Using web_fetch Tool

When fetching data, call the web_fetch tool with this exact format:

**For GET requests:**
```
Tool: web_fetch
Parameters:
  url: "https://alalegal.proyectoprisma.com/api/inbox/conversations"
  headers:
    x-service-token: "0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb"
```

**For POST requests:**
```
Tool: web_fetch
Parameters:
  url: "https://alalegal.proyectoprisma.com/api/inbox/replies"
  method: "POST"
  headers:
    x-service-token: "0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb"
    Content-Type: "application/json"
  body: '{"conversation_id":"...","final_text":"..."}'
```

### Available Endpoints

**1. Get All Conversations**
```
GET https://alalegal.proyectoprisma.com/api/inbox/conversations
Headers: x-service-token: 0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb
```

**2. Get Conversation Details (with full history)**
```
GET https://alalegal.proyectoprisma.com/api/inbox/conversations/{conversation_id}/details
Headers: x-service-token: 0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb
```

**3. Create Draft Reply**
```
POST https://alalegal.proyectoprisma.com/api/inbox/replies
Headers: 
  - x-service-token: 0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb
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
GET https://alalegal.proyectoprisma.com/api/inbox/replies?status=pending
Headers: x-service-token: 0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb
```

**5. Get All Leads**
```
GET https://alalegal.proyectoprisma.com/api/crm/leads
Headers: x-service-token: 0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb
```

**6. Update Lead Status**
```
PATCH https://alalegal.proyectoprisma.com/api/crm/leads/{lead_id}
Headers: 
  - x-service-token: 0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb
  - Content-Type: application/json
Body: {
  "status": "qualified|contacted|new",
  "pipelineStage": "string"
}
```

## Workflow

When you receive a notification:

1. **Extract the conversation ID** from the message
2. **Call web_fetch tool** to get conversation details
3. **Review the full conversation** history
4. **Draft a reply** in Spanish, professional and warm
5. **Call web_fetch tool** to POST the draft to /api/inbox/replies
6. **Notify the operator** that a draft is ready

## Example Response

When someone asks you to review leads, respond with:
"Dame un momento, voy a consultar la bandeja de entrada..."

Then call web_fetch with:
- url: https://alalegal.proyectoprisma.com/api/inbox/conversations
- headers: {x-service-token: 0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb}

## IMPORTANT

- ALWAYS include the x-service-token header
- Use web_fetch tool, NOT fetch or axios
- Use the public URL https://alalegal.proyectoprisma.com
- The token is: 0926dd013fe847ad21640a974ef85b59dfda9ace00b7f35f847250da62c027fb
