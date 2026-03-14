# Skill: get-leads

## Trigger
When operator sends /get, /get all, /get leads, or asks to see pending leads, conversations, or client list.

## Description
Fetches current leads and conversations from the webapp database.

## Parameters
- filter (optional): "all", "pending", "active", or a subscriber ID

## Returns
Formatted lead list with name, contact info, status, and unread count.
