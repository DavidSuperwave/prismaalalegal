# HEARTBEAT.md — Daily Agent Routine

## Morning Check (8:00 AM)

1. **Test Supermemory Connection**
   - Ping Supermemory API v3
   - Verify container tags are accessible
   - If failing, post alert to #replies

2. **Review Unprocessed Messages**
   - Check for ManyChat messages stuck in queue
   - Check for Telegram DMs awaiting response
   - If backlog > 5, escalate to human

3. **Post Daily Summary to #replies**
   - Messages received (last 24h)
   - Qualified leads count
   - Consultations scheduled
   - Pending follow-ups

## Afternoon Check (2:00 PM)

1. **Review Idle Contacts**
   - Find contacts with no activity > 3 days
   - Flag as "needs-followup"
   - Queue gentle check-in message

2. **Template Performance**
   - Check which templates were used most
   - Identify gaps where new templates needed
   - Log learning to agent:prismaalalegal:learnings

## Evening Check (6:00 PM)

1. **Final Backup**
   - Ensure all conversations synced to Supermemory
   - Verify no data loss

2. **Next Day Prep**
   - Preview scheduled consultations
   - Prepare attorney briefs for morning

## Alert Thresholds

- **Supermemory down:** Immediate alert
- **> 10 unprocessed messages:** Immediate alert
- **> 5 qualified leads uncontacted:** Immediate alert
- **API errors > 5/hour:** Warning
