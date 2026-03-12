#!/bin/bash
set -euo pipefail

# deploy.sh — Deploy ALA Legal Agent to production
# Usage: ./deploy.sh yourdomain.com your@email.com

DOMAIN=${1:-}
EMAIL=${2:-}

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./deploy.sh yourdomain.com your@email.com"
    exit 1
fi

echo "🚀 Deploying ALA Legal Agent..."
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# Check .env
if [ ! -f .env ]; then
    echo "❌ .env file not found. Copy from .env.example and fill in your keys."
    exit 1
fi

# Load environment variables for webhook setup
set -a
. ./.env
set +a

# Update Caddyfile with domain
sed -i "s/{\\$DOMAIN}/$DOMAIN/g" Caddyfile

# Update .env with domain
sed -i "s/yourdomain.com/$DOMAIN/g" .env
sed -i "s/your@email.com/$EMAIL/g" .env

echo "📦 Pulling OpenClaw image..."
docker pull ghcr.io/openclaw/openclaw:2026.3.7

echo "🔨 Building services..."
docker compose build

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "🏥 Health checking..."
if curl -sf http://localhost:3300/health > /dev/null; then
    echo "✅ ManyChat Bridge: OK"
else
    echo "❌ ManyChat Bridge: Failed"
fi

# Test OpenClaw
if curl -sf http://localhost:3100/health > /dev/null 2>&1; then
    echo "✅ OpenClaw: OK"
else
    echo "⚠️  OpenClaw: Check logs with 'docker logs prismaalalegal-openclaw-1'"
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
    echo "🤖 Registering Telegram webhook..."
    curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
      -H "Content-Type: application/json" \
      -d "{\"url\":\"https://${DOMAIN}/telegram/webhook\",\"allowed_updates\":[\"message\",\"callback_query\"]}" > /dev/null
    echo "✅ Telegram webhook registered: https://${DOMAIN}/telegram/webhook"
else
    echo "⚠️  TELEGRAM_BOT_TOKEN is empty. Skipping Telegram webhook registration."
fi

echo ""
echo "🎉 Deployment complete!"
echo "Website: https://$DOMAIN"
echo "ManyChat webhook: https://$DOMAIN/manychat/webhook"
echo "Telegram webhook: https://$DOMAIN/telegram/webhook"
echo ""
echo "Next steps:"
echo "1. Configure ManyChat webhook URL"
echo "2. Test Telegram bot in groups"
echo "3. Run bootstrap: docker compose exec openclaw cat workspace/BOOTSTRAP.md"
