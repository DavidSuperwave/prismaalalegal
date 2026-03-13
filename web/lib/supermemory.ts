import "server-only";

import { getClientName } from "@/lib/api";

const SUPERMEMORY_URL = "https://api.supermemory.ai/v3";

function getHeaders() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    return null;
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function getSlug() {
  return process.env.AGENT_SLUG || getClientName().toLowerCase().replace(/\s+/g, "-");
}

export async function addSupermemoryDocument({
  content,
  containerSuffix,
  containerTag,
  metadata,
}: {
  content: string;
  containerSuffix?: string;
  containerTag?: string;
  metadata?: Record<string, unknown>;
}) {
  const headers = getHeaders();
  if (!headers) return null;
  const resolvedContainerTag =
    containerTag || (containerSuffix ? `client:${getSlug()}:${containerSuffix}` : null);

  if (!resolvedContainerTag) {
    throw new Error("Supermemory add requires containerSuffix or containerTag");
  }

  const response = await fetch(`${SUPERMEMORY_URL}/add`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      content,
      containerTags: [resolvedContainerTag],
      metadata,
    }),
  });

  if (!response.ok) {
    throw new Error(`Supermemory add failed: ${response.status}`);
  }

  return response.json();
}

export async function searchSupermemory({
  query,
  containerSuffix,
  containerTag,
  limit = 20,
}: {
  query: string;
  containerSuffix?: string;
  containerTag?: string;
  limit?: number;
}) {
  const headers = getHeaders();
  if (!headers) return [];
  const resolvedContainerTag =
    containerTag || (containerSuffix ? `client:${getSlug()}:${containerSuffix}` : null);

  if (!resolvedContainerTag) {
    throw new Error("Supermemory search requires containerSuffix or containerTag");
  }

  const response = await fetch(`${SUPERMEMORY_URL}/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      containerTags: [resolvedContainerTag],
      limit,
    }),
  });

  if (!response.ok) {
    throw new Error(`Supermemory search failed: ${response.status}`);
  }

  return response.json();
}
