import "server-only";

import { getClientName } from "@/lib/api";

const SUPERMEMORY_URL = "https://api.supermemory.ai/v3";

const slug = process.env.AGENT_SLUG || "prismaalalegal";
export const TAGS = {
  SHARED: [`${slug}_shared`],
  LEADS: [`${slug}_leads`],
  CASES: [`${slug}_cases`],
} as const;

function getHeaders() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    console.warn("[SUPERMEMORY] API key missing; memory features disabled");
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

function resolveLegacyTag(containerSuffix: string) {
  const lower = containerSuffix.toLowerCase();
  if (lower.startsWith("conversations")) return TAGS.SHARED[0];
  if (lower.includes("training:reply_examples")) return TAGS.LEADS[0];
  if (lower.includes("case")) return TAGS.CASES[0];
  return `client:${getSlug()}:${containerSuffix}`;
}

export async function storeMemory(
  content: string,
  containerTags: readonly string[],
  metadata: Record<string, unknown> = {}
) {
  const headers = getHeaders();
  if (!headers) return null;

  try {
    const response = await fetch(`${SUPERMEMORY_URL}/add`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content,
        containerTags,
        metadata: {
          ...metadata,
          stored_at: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Supermemory add failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("[SUPERMEMORY] Write failed", {
      error: error instanceof Error ? error.message : error,
      containerTags,
      metadataType: metadata.type,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

export async function searchMemory(
  query: string,
  containerTags: readonly string[],
  filters?: { AND?: Array<{ key: string; value: string }> },
  limit: number = 10
) {
  const headers = getHeaders();
  if (!headers) return { results: [] };

  try {
    const response = await fetch(`${SUPERMEMORY_URL}/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        containerTags,
        limit,
        ...(filters ? { filters } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Supermemory search failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("[SUPERMEMORY] Search failed", {
      error: error instanceof Error ? error.message : error,
      query,
      containerTags,
      timestamp: new Date().toISOString(),
    });
    return { results: [] };
  }
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
  const resolvedContainerTag =
    containerTag || (containerSuffix ? resolveLegacyTag(containerSuffix) : null);

  if (!resolvedContainerTag) {
    throw new Error("Supermemory add requires containerSuffix or containerTag");
  }

  return storeMemory(content, [resolvedContainerTag], metadata);
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
  const resolvedContainerTag =
    containerTag || (containerSuffix ? resolveLegacyTag(containerSuffix) : null);

  if (!resolvedContainerTag) {
    throw new Error("Supermemory search requires containerSuffix or containerTag");
  }

  return searchMemory(query, [resolvedContainerTag], undefined, limit);
}

export async function storeApprovedReply(params: {
  clientMessage: string;
  agentDraft: string;
  sentReply: string;
  leadPhone: string;
  channel: string;
  topic: string;
}) {
  const { clientMessage, agentDraft, sentReply, leadPhone, channel, topic } = params;
  const operatorEdited = agentDraft.trim() !== sentReply.trim();
  return storeMemory(`Client said: "${clientMessage}". Agent drafted: "${agentDraft}". Operator sent: "${sentReply}".`, TAGS.SHARED, {
    type: "approved_reply",
    agent_drafted: "true",
    operator_edited: operatorEdited ? "true" : "false",
    lead_phone: leadPhone,
    channel,
    topic,
  });
}

export async function storeCaseDecision(params: {
  leadPhone: string;
  leadName: string;
  practiceArea: string;
  scenario: string;
  decision: "accepted" | "rejected";
  reason?: string;
  keyFactors?: string;
  confidenceWas: "high" | "medium" | "low";
}) {
  const { leadPhone, leadName, practiceArea, scenario, decision, reason, keyFactors, confidenceWas } = params;
  const content =
    decision === "accepted"
      ? `Case accepted. Lead: ${leadName} (${leadPhone}). Practice area: ${practiceArea}. Scenario: ${scenario}. Key factors: ${keyFactors || "N/A"}.`
      : `Case rejected. Lead: ${leadName} (${leadPhone}). Practice area: ${practiceArea}. Scenario: ${scenario}. Reason: ${reason || "Not specified"}.`;

  return storeMemory(content, TAGS.SHARED, {
    type: "case_decision",
    decision,
    practice_area: practiceArea,
    ...(decision === "accepted" && keyFactors ? { key_factors: keyFactors } : {}),
    ...(decision === "rejected" && reason ? { reject_reason: reason } : {}),
    confidence_was: confidenceWas,
    lead_phone: leadPhone,
  });
}

export async function searchReplyPatterns(topic: string, limit = 10) {
  return searchMemory(
    `How to reply to client asking about ${topic}`,
    TAGS.SHARED,
    { AND: [{ key: "type", value: "approved_reply" }] },
    limit
  );
}

export async function searchCaseDecisions(practiceArea: string, limit = 10) {
  return searchMemory(
    `${practiceArea} case qualification decision`,
    TAGS.SHARED,
    { AND: [{ key: "type", value: "case_decision" }] },
    limit
  );
}
