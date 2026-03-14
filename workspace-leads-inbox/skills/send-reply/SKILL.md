# Skill: send-reply

## Trigger
When operator sends /sendreply, /send, /approve, or confirms they want to send a draft to the customer.

In groups, handle bot mentions: "@bot /sendreply ..." should be processed as "/sendreply ..."

## Description
Finds the pending draft and sends it to the customer via ManyChat. This is the final step — the message goes to the customer immediately.

## Parameters
- identifier: Phone number or name of the lead

## Returns
Confirmation that the message was sent to the customer.

## Group Chat Handling
Remove @bot mention if present at the start of the message.
