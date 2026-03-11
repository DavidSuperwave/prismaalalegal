#!/bin/bash
set -euo pipefail

# deploy.sh — Deploy Prisma Legal Agent to production
# Usage: ./deploy.sh yourdomain.com your@email.com

DOMAIN=${1:-}
EMAIL=${2:-}

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./deploy.sh yourdomain.com your@email.com"
    exit 1
fi

echo "🚀 Deploying Prisma Legal Agent..."
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

echo ""
echo "🎉 Deployment complete!"
echo "Website: https://$DOMAIN"
echo "ManyChat webhook: https://$DOMAIN/manychat/webhook"
echo ""
echo "Next steps:"
echo "1. Configure ManyChat webhook URL"
echo "2. Test Telegram bot in groups"
echo "3. Run bootstrap: docker compose exec openclaw cat workspace/BOOTSTRAP.md"
