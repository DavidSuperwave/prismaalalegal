# Skill: get-leads

## Trigger
When operator sends /get, /get all, /get leads, or asks to see pending leads, conversations, or client list.

In groups, the command may be prefixed with @bot mention (e.g., "@alalegalreplybot /get all"). Extract the command after the mention.

## Description
Fetches current leads and conversations from the webapp database.

## Parameters
- filter (optional): "all", "pending", "active", or a subscriber ID

## Returns
Formatted lead list with name, contact info, status, and unread count.

## Group Chat Handling
If the message starts with @ mention, remove it before processing the command:
- "@alalegalreplybot /get all" → process as "/get all"
- "/get all" → process as "/get all"
