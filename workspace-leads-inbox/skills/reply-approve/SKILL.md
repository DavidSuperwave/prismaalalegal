# Reply Approve

## When to use
Use when the operator writes `/replyapprove`, `/replystatus`, or `/replyhistory [phone]` in the leads channel.

## What to do
1. Fetch the latest pending reply from web API.
2. Send the final text via ManyChat.
3. Mark reply as `sent` with `sent_at`.
4. Store approved reply memory in `[REDACTED]_shared` with `type=approved_reply`.
5. Confirm action in Telegram.
