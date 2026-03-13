# Case Accept

## When to use
When operator enters `/caseaccept` for a flagged lead.

## What to do
1. Update lead `pipeline_stage=accepted` via CRM API.
2. Store shared Supermemory decision (`type=case_decision`, `decision=accepted`).
3. Return confirmation including lead identifier.
