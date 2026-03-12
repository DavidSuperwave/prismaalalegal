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
  return process.env.AGENT_SLUG || getClientName().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function addSupermemoryDocument({
  content,
  containerSuffix,
  metadata,
}: {
  content: string;
  containerSuffix: string;
  metadata?: Record<string, unknown>;
}) {
  const headers = getHeaders();
  if (!headers) return null;

  const response = await fetch(`${SUPERMEMORY_URL}/add`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      content,
      containerTags: [`client:${getSlug()}:${containerSuffix}`],
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
  limit = 20,
}: {
  query: string;
  containerSuffix: string;
  limit?: number;
}) {
  const headers = getHeaders();
  if (!headers) return [];

  const response = await fetch(`${SUPERMEMORY_URL}/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      containerTags: [`client:${getSlug()}:${containerSuffix}`],
      limit,
    }),
  });

  if (!response.ok) {
    throw new Error(`Supermemory search failed: ${response.status}`);
  }

  return response.json();
}
