export function getOpenClawUrl() {
  return (
    process.env.OPENCLAW_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_OPENCLAW_URL ||
    "http://openclaw:3100"
  );
}

export function getWorkspaceSlug() {
  return process.env.OPENCLAW_WORKSPACE_SLUG || "default";
}

export function getClientName() {
  return process.env.NEXT_PUBLIC_CLIENT_NAME || "Prisma";
}

export function getClientSubtitle() {
  return process.env.NEXT_PUBLIC_CLIENT_SUBTITLE || "Agent Platform";
}
