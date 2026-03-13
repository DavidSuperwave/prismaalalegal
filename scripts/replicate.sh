#!/bin/bash
set -euo pipefail

# replicate.sh — Clone template for new client
# Usage: ./replicate.sh client-slug "Client Name"

CLIENT_SLUG=${1:-}
CLIENT_NAME=${2:-}

if [ -z "$CLIENT_SLUG" ] || [ -z "$CLIENT_NAME" ]; then
    echo "Usage: ./replicate.sh client-slug \"Client Name\""
    exit 1
fi

echo "🔄 Replicating template for $CLIENT_NAME..."

# Create new directory
NEW_DIR="../superwave-$CLIENT_SLUG"
if [ -d "$NEW_DIR" ]; then
    echo "❌ Directory $NEW_DIR already exists"
    exit 1
fi

cp -r . "$NEW_DIR"
cd "$NEW_DIR"

# Remove git history
rm -rf .git

# Update AGENT_SLUG in .env.example
sed -i "s/AGENT_SLUG=prismaalalegal/AGENT_SLUG=$CLIENT_SLUG/g" .env.example
sed -i "s/AGENT_NAME=Prisma Legal Agent/AGENT_NAME=$CLIENT_NAME Agent/g" .env.example

# Update container names in docker-compose.yml
sed -i "s/prismaalalegal/$CLIENT_SLUG/g" docker-compose.yml

# Update workspace files
cat > workspace/SOUL.md << EOF
# SOUL.md — $CLIENT_NAME Agent

## Identity

**Name:** $CLIENT_NAME Agent  
**Role:** AI Intake Specialist  
**Tone:** Professional, helpful, efficient  
**Emoji:** 🤖

## Purpose

I am the first point of contact for $CLIENT_NAME.

## Services Offered

*Fill in your services here*

## Qualification Criteria

A lead is QUALIFIED when they have:
- ✅ *Add your criteria*

## Guardrails — NEVER

- Never provide specific advice without attorney review
- Never disparage competitors
- Never share client information

## Response Style

- **Concise:** 2-3 sentences
- **Structured:** Use bullet points
- **Warm:** Acknowledge concerns
- **Action-oriented:** Suggest next steps

---

*Customize this file for $CLIENT_NAME*
EOF

cat > workspace/USER.md << EOF
# USER.md — $CLIENT_NAME Context

## About $CLIENT_NAME

*Fill in company details*

## Contact Information

*Add phone, email, website*

## Office Hours

*Add hours*

## Consultation Process

*Add process*

## Pricing Model

*Add pricing*
EOF

echo "✅ Replicated to $NEW_DIR"
echo ""
echo "📝 HUMAN CHECKLIST — Fill these in:"
echo ""
echo "1. SOUL.md — Write agent personality"
echo "2. workspace/USER.md — Add company context"
echo "3. .env — Add all API keys:"
echo "   - OPENROUTER_API_KEY"
echo "   - SUPERMEMORY_API_KEY"
echo "   - TELEGRAM_BOT_TOKEN_OPERATOR"
echo "   - TELEGRAM_BOT_TOKEN_LEADS"
echo "   - TELEGRAM_BOT_TOKEN_QUALIFIED"
echo "   - OPERATOR_TELEGRAM_USER_ID"
echo "   - TELEGRAM_BOT_TOKEN (optional legacy fallback)"
echo "   - TELEGRAM_REPLIES_CHAT_ID"
echo "   - TELEGRAM_LEADS_CHAT_ID"
echo "   - MANYCHAT_API_KEY"
echo "   - MANYCHAT_WEBHOOK_SECRET"
echo "4. Create Telegram bot + groups"
echo "5. Point domain DNS to droplet IP"
echo "6. Deploy: ./scripts/deploy.sh clientdomain.com client@email.com"
echo ""
echo "Good luck with $CLIENT_NAME! 🚀"
