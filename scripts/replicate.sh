#!/usr/bin/env bash
set -euo pipefail

# replicate.sh — clone this repo into a new client-ready project.
# Usage:
#   ./scripts/replicate.sh client-slug "Client Name" ["Main Phone"] ["Location"]

CLIENT_SLUG=${1:-}
CLIENT_NAME=${2:-}
CLIENT_PHONE=${3:-"81 1249 1200"}
CLIENT_LOCATION=${4:-"Monterrey"}

if [[ -z "$CLIENT_SLUG" || -z "$CLIENT_NAME" ]]; then
  echo "Usage: ./scripts/replicate.sh client-slug \"Client Name\" [\"Main Phone\"] [\"Location\"]"
  exit 1
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$(cd "$SOURCE_DIR/.." && pwd)/superwave-${CLIENT_SLUG}"

if [[ -d "$TARGET_DIR" ]]; then
  echo "❌ Target already exists: $TARGET_DIR"
  exit 1
fi

echo "🔄 Replicating template for ${CLIENT_NAME} (${CLIENT_SLUG})..."
cp -r "$SOURCE_DIR" "$TARGET_DIR"
cd "$TARGET_DIR"
rm -rf .git

TAG_BASE="${CLIENT_SLUG//-/_}"
TAG_SHARED="${TAG_BASE}_shared"
TAG_LEADS="${TAG_BASE}_leads"
TAG_CASES="${TAG_BASE}_cases"

replace_literal_repo() {
  local from="$1"
  local to="$2"
  rg -l --hidden \
    --glob '!.git/**' \
    --glob '!node_modules/**' \
    --glob '!.next/**' \
    --glob '!web/data/**' \
    --glob '!*/package-lock.json' \
    --fixed-strings "$from" . \
    | while IFS= read -r file; do
        perl -0pi -e "s/\Q$from\E/$to/g" "$file"
      done
}

# Canonical slug + tag scheme
replace_literal_repo "[REDACTED]_shared" "$TAG_SHARED"
replace_literal_repo "[REDACTED]_leads" "$TAG_LEADS"
replace_literal_repo "[REDACTED]_cases" "$TAG_CASES"
replace_literal_repo "Canonical Slug\`: [REDACTED]" "Canonical Slug\`: ${CLIENT_SLUG}"
replace_literal_repo "AGENT_SLUG=[REDACTED]" "AGENT_SLUG=${CLIENT_SLUG}"
replace_literal_repo "\`[REDACTED]\`" "\`${CLIENT_SLUG}\`"

# Identity defaults
replace_literal_repo "Prisma/ALA Legal" "$CLIENT_NAME"
replace_literal_repo "81 1249 1200" "$CLIENT_PHONE"
replace_literal_repo "Monterrey, Nuevo Leon, Mexico" "${CLIENT_LOCATION}, Mexico"
replace_literal_repo "Monterrey" "$CLIENT_LOCATION"

# Env + naming
sed -i "s/^AGENT_NAME=.*/AGENT_NAME=${CLIENT_NAME} Agent/" .env.example
sed -i "s/^NEXT_PUBLIC_CLIENT_NAME=.*/NEXT_PUBLIC_CLIENT_NAME=${CLIENT_NAME}/" .env.example
sed -i "s/^AUTH_NAME=.*/AUTH_NAME=${CLIENT_NAME} Admin/" .env.example

# openclaw.json names
replace_literal_repo "\"name\": \"Operator Assistant\"" "\"name\": \"${CLIENT_NAME} Operator Assistant\""
replace_literal_repo "\"name\": \"Leads Inbox SDR\"" "\"name\": \"${CLIENT_NAME} Leads Inbox SDR\""
replace_literal_repo "\"name\": \"Case Qualifier\"" "\"name\": \"${CLIENT_NAME} Case Qualifier\""

echo ""
echo "✅ Replicated to: $TARGET_DIR"
echo ""
echo "🧭 Post-clone checklist:"
echo "1. Fill .env values (all API keys + 3 Telegram bot tokens)."
echo "2. Review workspace-operator/, workspace-leads-inbox/, workspace-qualified-leads/."
echo "3. Verify openclaw.json Telegram account bindings and allowlist user ID."
echo "4. Run: npm --prefix web install && npm --prefix web run validate:workspace"
echo "5. Start services and run webhook + inbox flow tests."
