# Skill: draft-reply

## Trigger
When operator sends /draft, /draft reply, or when the agent has composed a reply and needs to save it for approval.

## Description
Saves a draft reply to the database for operator review. Does NOT send to the customer yet. Operator must approve via /sendreply.

## Parameters
- identifier: Phone number or name of the lead
- text: The draft reply text in Spanish

## Returns
Confirmation with draft details for operator approval.
