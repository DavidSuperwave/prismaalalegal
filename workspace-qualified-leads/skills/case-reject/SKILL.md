# Case Reject

## When to use
When operator enters `/casereject [reason]` for a flagged lead.

## What to do
1. Update lead `pipeline_stage=rejected` via CRM API.
2. Store shared Supermemory decision (`type=case_decision`, `decision=rejected`, `reject_reason`).
3. Confirm rejection and captured reason.

## Invocation formats
- Slash command: `/casereject <lead_id> <reason>`
- Structured params: `{ leadId, reason, leadPhone, leadName, practiceArea, scenario, confidence }`
