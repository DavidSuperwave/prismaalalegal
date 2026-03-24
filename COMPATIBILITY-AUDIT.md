# Compatibility Audit — All New Files vs Existing System

## How Your System Actually Works (Ground Truth)

### OpenClaw Agent Execution Model

From your `openclaw-with-tools.json`, agents interact with the outside world via:

1. **Workspace files** — SOUL.md, AGENTS.md, USER.md, TOOLS.md loaded into
   system prompt at session start
2. **HTTP tools** — defined in `tools.http[]` — the agent can call these as
   tool invocations during a conversation turn:
   - `get_conversations` → GET http://web:3000/api/inbox/conversations
   - `get_conversation_details` → GET http://web:3000/api/inbox/conversations/{id}/details  
   - `create_reply` → POST http://web:3000/api/inbox/replies
   - `get_leads` → GET http://web:3000/api/crm/leads
   - `update_lead` → PATCH http://web:3000/api/crm/leads/{id}
   All use `x-service-token` header with `INTERNAL_SERVICE_TOKEN`
3. **Agent-to-agent** — `agentToAgent` enabled for operator, leads-inbox, 
   qualified-leads
4. **Skills** — SKILL.md files in workspace `skills/` folder get injected 
   into system prompt. The agent reads instructions and uses built-in tools
   (exec, web_fetch, read, write) to execute them
5. **Telegram bindings** — each agent bound to a Telegram bot account via
   `bindings[]` matching channel + accountId

### Web App Execution Model

Next.js routes at `web/app/api/` handle:
- Inbound webhooks (ManyChat, Telegram)
- CRM CRUD
- Inbox/conversation management
- Draft generation (calls OpenClaw via `callOpenClaw`)
- Reply sending (calls ManyChat API)

Auth: `x-service-token` header OR session cookie.

### Supermemory Execution Model

From your `web/lib/supermemory.ts`:
- Uses v3 API: `POST /v3/add` (now maps to `POST /v3/documents`)
- Uses v3 search: `POST /v3/search`
- Container tags: `prismaalalegal_shared`, `prismaalalegal_leads`, `prismaalalegal_cases`  
  (resolved via TAGS constant, with `resolveLegacyTag` for old-style tags)

### Docker Network

All services on `superwave` bridge network:
- `openclaw` → port 18789 (mapped to 3100 externally)
- `web` → port 3000
- `manychat-bridge` → port 3300
- `agent-bridge` → polls SQLite
- `caddy` → 80/443, routes `/api/*` to web, `/manychat/*` to bridge

## File-by-File Compatibility Audit

---

### FILE 1: conversation-handler/route.ts
**Location:** web/app/api/webhooks/manychat/conversation/route.ts
**Type:** Next.js API route (runs inside web container)

#### ✅ COMPATIBLE — No Issues

| Check | Status | Notes |
|-------|--------|-------|
| Imports `@/lib/db` | ✅ | Same as existing webhook routes |
| Imports `@/lib/supermemory` | ✅ | Uses same TAGS, searchMemory, addSupermemoryDocument |
| Imports `@/lib/openclaw-client` | ✅ | Uses same callOpenClaw function |
| Calls OpenClaw at `/api/message` | ✅ | Same endpoint as existing draft/chat routes |
| Uses `INTERNAL_SERVICE_TOKEN` | ✅ | Same auth pattern as existing routes |
| SQLite access via getDb() | ✅ | Same shared volume `/app/data` |
| Telegram notification | ✅ | Same bot token + chat ID pattern |
| ManyChat v2 response format | ✅ | Returns same format as existing bridge |
| Docker networking | ✅ | Runs inside `web` container, Caddy routes `/api/*` here |
| Supermemory v3 search | ✅ | Uses searchMemory from existing lib |

#### ISSUE FOUND: Supermemory API version mismatch

The conversation handler calls `/v4/conversations` for the learning loop,
but your `web/lib/supermemory.ts` only has v3 functions. 

**Fix needed:** The `storeConversationTurn` function inside the conversation 
handler calls the Supermemory v4 API directly with `fetch()`. This works but
bypasses the existing supermemory.ts wrapper. This is OK for now but should 
be consolidated later. No breaking issue.

#### ISSUE FOUND: `containerTags` vs `containerTag`

The Supermemory v3 API docs show `containerTag` (singular) as the current 
field, with `containerTags` (plural) marked as deprecated. Your existing 
`web/lib/supermemory.ts` uses `containerTags` (plural) in the search function.

The conversation handler uses `TAGS.SHARED` which is `["prismaalalegal_shared"]` — 
this is an array, which works with the deprecated `containerTags` field in search.
For the v3 document writes, I used `containerTag` (singular) which is correct.

**Verdict:** Works as-is. The search uses the deprecated array form but 
Supermemory still accepts it.

---

### FILE 2: learning-loop.ts  
**Location:** web/lib/learning-loop.ts
**Type:** Server-side TypeScript module (imported by route handlers)

#### ✅ COMPATIBLE — One Fix Needed

| Check | Status | Notes |
|-------|--------|-------|
| `import "server-only"` | ✅ | Same pattern as db.ts, supermemory.ts |
| Calls Supermemory v4 API | ✅ | Direct fetch, no dependency issues |
| Calls Supermemory v3 API | ✅ | Direct fetch for documents |
| Uses same container tag | ✅ | `prismaalalegal_shared` |
| SQLite access | ✅ | Uses getDb() from @/lib/db |
| No OpenClaw dependency | ✅ | Doesn't call OpenClaw at all |
| Imported by route handlers | ✅ | Standard ES module import |

#### ISSUE FOUND: Dynamic require in getLastCustomerMessage

The function uses `require("@/lib/db")` to avoid circular dependencies.
In Next.js server components with the standalone output, dynamic require 
can be flaky.

**Fix:** Change to use the `getDb` import passed as a parameter, or move 
the function to accept a db instance. I'll fix this in the rebuilt version.

---

### FILE 3: training-mode/ skill
**Location:** workspace-leads-inbox/skills/training-mode/
**Type:** OpenClaw skill (SKILL.md + supporting code)

#### ❌ INCOMPATIBLE — Needs Full Rebuild

| Check | Status | Notes |
|-------|--------|-------|
| SKILL.md format | ✅ | Valid frontmatter + instructions |
| index.js as executable | ❌ | OpenClaw exec's scripts in fresh process — in-memory Map() loses state |
| module.exports pattern | ❌ | OpenClaw skills aren't loaded as modules — they're read as instructions |
| Session state persistence | ❌ | Needs database, not in-memory |
| Agent tool access | ❌ | Agent needs HTTP tools to call training API, not direct JS execution |

**Root cause:** I built the training skill as if OpenClaw loads and runs 
JavaScript modules directly. It doesn't. OpenClaw:
1. Reads SKILL.md and injects it into the system prompt
2. The agent (LLM) reads the instructions
3. The agent uses built-in tools (exec, web_fetch, HTTP tools) to do work
4. Each tool call is a separate invocation — no shared state

**Fix:** Rebuild training mode as:
1. A web API endpoint (`/api/training/*`) that manages state in SQLite
2. An HTTP tool definition in openclaw-with-tools.json so the agent can call it
3. A SKILL.md that teaches the agent the training workflow
4. The agent orchestrates the flow using its LLM reasoning + HTTP tool calls

This matches exactly how your existing get-leads, draft-reply, send-reply 
skills work: SKILL.md has instructions, agent calls HTTP endpoints.

---

## What Needs to Change

### conversation-handler/route.ts — Minor Fixes
1. Fix the `getLastCustomerMessage` import pattern
2. Add `containerTag` (singular) option to v3 document writes for future-proofing
3. Everything else is correct

### learning-loop.ts — Minor Fix
1. Remove dynamic `require()`, accept db parameter or import directly
2. Everything else is correct

### training-mode/ — Full Rebuild Required
1. New web API route: `web/app/api/training/route.ts`
2. New SQLite table: `training_sessions`
3. New HTTP tool definition in `openclaw-with-tools.json`
4. Rewritten SKILL.md with instructions for agent to use HTTP tools
5. Remove index.js entirely (agent doesn't need it)
