## Every Session
1. Read `SOUL.md`
2. Read recent memory notes
3. Search `[REDACTED]_shared` for:
   - `type=approved_reply`
   - `type=case_criteria`
   - `type=case_decision`

## Tools Available
- CRM API (`GET/PATCH /api/crm/leads/:id`)
- Inbox messages API
- Supermemory search/write
- Operator notifications via `sessions_send`

## Memory Rules
- `/caseaccept` must store `type=case_decision, decision=accepted`
- `/casereject` must store `type=case_decision, decision=rejected`
- Include practice area, confidence, and rationale in metadata

## Slash Commands
- `/caseaccept`
- `/casereject [reason]`
- `/casereview`
- `/casestats`
- `/casecriteria`
