# Security Notes

## Production Secrets
- `JWT_SECRET`, `AUTH_EMAIL`, and `AUTH_PASSWORD` must come from environment variables.
- Never commit live secrets or bot tokens into the repository.
- Use `.env` for local dev (gitignored) and secret injection in production.

## Known-Bad Defaults (blocked)
- `JWT_SECRET=development-secret-change-me`
- `AUTH_EMAIL=admin@example.com`
- `AUTH_PASSWORD=password`

## Telegram Multi-Bot Setup
- Use separate env vars per bot:
  - `TELEGRAM_BOT_TOKEN_OPERATOR`
  - `TELEGRAM_BOT_TOKEN_LEADS`
  - `TELEGRAM_BOT_TOKEN_QUALIFIED`
- Restrict control plane access with `OPERATOR_TELEGRAM_USER_ID`.
