const fs = require("fs");
const os = require("os");
const path = require("path");

const OPENCLAW_HOME = process.env.OPENCLAW_HOME || path.join(os.homedir(), ".openclaw");
const REQUIRED_FILES = ["SOUL.md", "AGENTS.md", "USER.md"];
const EXPECTED_PHONE = "81 1249 1200";
const EXPECTED_LOCATION = "Monterrey";
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TENANT_PATH = path.join(REPO_ROOT, "TENANT.md");

const WORKSPACES = [
  { id: "operator", dir: "workspace-operator" },
  { id: "leads-inbox", dir: "workspace-leads-inbox" },
  { id: "qualified-leads", dir: "workspace-qualified-leads" },
];

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function parseCanonicalSlug() {
  const fallback = process.env.AGENT_SLUG || "[REDACTED]";
  const tenantContent = readFileSafe(TENANT_PATH);
  if (!tenantContent) return fallback;
  const match = tenantContent.match(/## Canonical Slug\s+`([^`]+)`/m);
  return match?.[1]?.trim() || fallback;
}

function validateWorkspaceFiles(errors, canonicalSlug) {
  for (const workspace of WORKSPACES) {
    const workspacePath = path.join(OPENCLAW_HOME, workspace.dir);
    if (!fs.existsSync(workspacePath)) {
      errors.push(`[${workspace.id}] Missing directory: ${workspacePath}`);
      continue;
    }

    for (const fileName of REQUIRED_FILES) {
      const filePath = path.join(workspacePath, fileName);
      if (!fs.existsSync(filePath)) {
        errors.push(`[${workspace.id}] Missing file: ${fileName}`);
        continue;
      }

      const content = readFileSafe(filePath);
      if (!content) {
        errors.push(`[${workspace.id}] Could not read file: ${fileName}`);
        continue;
      }

      if (content.includes("client:alalegal")) {
        errors.push(`[${workspace.id}/${fileName}] Found deprecated tag prefix client:alalegal`);
      }
      if (content.includes("Prisma Legal Services") || content.includes("California")) {
        errors.push(`[${workspace.id}/${fileName}] Found old identity markers (Prisma Legal Services/California)`);
      }
      if (fileName === "SOUL.md") {
        if (!content.includes(canonicalSlug)) {
          errors.push(`[${workspace.id}/SOUL.md] Missing canonical slug ${canonicalSlug}`);
        }
        if (!content.includes(EXPECTED_PHONE) && !content.includes("81-1249-1200")) {
          errors.push(`[${workspace.id}/SOUL.md] Missing expected phone ${EXPECTED_PHONE}`);
        }
        if (!content.includes(EXPECTED_LOCATION)) {
          errors.push(`[${workspace.id}/SOUL.md] Missing expected location ${EXPECTED_LOCATION}`);
        }
        if (!content.includes("[REDACTED]_shared")) {
          errors.push(`[${workspace.id}/SOUL.md] Missing shared memory tag prefix [REDACTED]_shared`);
        }
      }
    }
  }
}

function validateOpenClawConfig(errors) {
  const configPath = path.join(OPENCLAW_HOME, "openclaw.json");
  if (!fs.existsSync(configPath)) {
    errors.push(`[openclaw] Missing config file: ${configPath}`);
    return;
  }

  let config = null;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    errors.push(`[openclaw] Invalid JSON in openclaw.json: ${error.message}`);
    return;
  }

  const ids = (config?.agents?.list || []).map((agent) => agent.id);
  for (const expectedId of WORKSPACES.map((workspace) => workspace.id)) {
    if (!ids.includes(expectedId)) {
      errors.push(`[openclaw] Missing agent id in openclaw.json: ${expectedId}`);
    }
  }
}

function main() {
  const errors = [];
  const canonicalSlug = parseCanonicalSlug();
  validateWorkspaceFiles(errors, canonicalSlug);
  validateOpenClawConfig(errors);

  if (errors.length > 0) {
    console.error("\n❌ WORKSPACE VALIDATION FAILED\n");
    for (const error of errors) {
      console.error(`  • ${error}`);
    }
    console.error(`\n${errors.length} error(s) found.\n`);
    process.exit(1);
  }

  console.log("✅ All 3 workspaces validated successfully");
}

main();
