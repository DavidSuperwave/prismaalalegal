type OpenClawErrorType =
  | "TIMEOUT"
  | "CONNECTION_REFUSED"
  | "AUTH_FAILURE"
  | "INVALID_RESPONSE"
  | "UNKNOWN";

interface OpenClawResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    type: OpenClawErrorType;
    message: string;
    retryable: boolean;
  };
  latencyMs: number;
}

const OPENCLAW_URL = process.env.OPENCLAW_AGENT_URL || process.env.OPENCLAW_GATEWAY_URL || "http://localhost:3100";
const TIMEOUT_MS = 30000;

function classifyError(error: unknown): { type: OpenClawErrorType; retryable: boolean } {
  if (error instanceof Error) {
    if (error.message.includes("ECONNREFUSED")) return { type: "CONNECTION_REFUSED", retryable: true };
    if (error.message.includes("timeout") || error.name === "AbortError") return { type: "TIMEOUT", retryable: true };
    if (error.message.includes("401") || error.message.includes("403")) return { type: "AUTH_FAILURE", retryable: false };
  }
  return { type: "UNKNOWN", retryable: false };
}

export async function callOpenClaw<T = unknown>(
  endpoint: string,
  payload?: Record<string, unknown>,
  context?: { conversationId?: string; agentId?: string; method?: "GET" | "POST" }
): Promise<OpenClawResponse<T>> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const method = context?.method || "POST";

  try {
    const response = await fetch(`${OPENCLAW_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(process.env.OPENCLAW_AUTH_TOKEN
          ? { Authorization: `Bearer ${process.env.OPENCLAW_AUTH_TOKEN}` }
          : {}),
      },
      ...(payload && method !== "GET" ? { body: JSON.stringify(payload) } : {}),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - start;
    console.log("[OPENCLAW] Response", {
      endpoint,
      status: response.status,
      latencyMs,
      agentId: context?.agentId,
      conversationId: context?.conversationId,
      timestamp: new Date().toISOString(),
    });

    if (!response.ok) {
      const errorType = response.status === 401 || response.status === 403 ? "AUTH_FAILURE" : "INVALID_RESPONSE";
      return {
        success: false,
        error: {
          type: errorType,
          message: `OpenClaw returned ${response.status}`,
          retryable: errorType !== "AUTH_FAILURE",
        },
        latencyMs,
      };
    }

    const data = (await response.json()) as T;
    return { success: true, data, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const { type, retryable } = classifyError(error);
    console.error("[OPENCLAW] Error", {
      endpoint,
      type,
      retryable,
      message: error instanceof Error ? error.message : "unknown",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
    return {
      success: false,
      error: {
        type,
        message: error instanceof Error ? error.message : "Unknown OpenClaw error",
        retryable,
      },
      latencyMs,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function chatWithAgent(
  agentId: string,
  prompt: string,
  context?: { conversationId?: string }
): Promise<OpenClawResponse<{ content: string }>> {
  const result = await callOpenClaw<{
    choices?: Array<{ message?: { content?: string } }>;
    // Legacy fallback fields
    content?: string;
    message?: string;
    response?: string;
  }>("/v1/chat/completions", {
    model: agentId,
    messages: [{ role: "user", content: prompt }],
  }, {
    agentId,
    conversationId: context?.conversationId,
    method: "POST",
  });

  if (result.success && result.data) {
    // OpenAI format
    const content =
      result.data.choices?.[0]?.message?.content ||
      // Legacy fallback (in case OpenClaw ever sends flat format)
      result.data.content ||
      result.data.message ||
      result.data.response ||
      "";
    return { ...result, data: { content } };
  }
  return result as OpenClawResponse<{ content: string }>;
}

export async function sendToAgent(agentId: string, message: string) {
  return chatWithAgent(agentId, message);
}

export async function generateDraft(conversationId: string, context: string) {
  return chatWithAgent("leads-inbox",
    `Draft a reply for conversation ${conversationId}. Context: ${context}`,
    { conversationId }
  );
}

export async function checkOpenClawHealth(): Promise<{ available: boolean; latencyMs: number }> {
  const result = await callOpenClaw("/health", undefined, { method: "GET" });
  return { available: result.success, latencyMs: result.latencyMs };
}
