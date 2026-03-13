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
      headers: { "Content-Type": "application/json" },
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

export async function sendToAgent(agentId: string, message: string) {
  return callOpenClaw(
    "/api/sessions/send",
    { agentId, message },
    {
      agentId,
      method: "POST",
    }
  );
}

export async function generateDraft(conversationId: string, context: string) {
  return callOpenClaw(
    "/api/sessions/send",
    { agentId: "leads-inbox", message: `Draft a reply for conversation ${conversationId}. Context: ${context}` },
    { conversationId, agentId: "leads-inbox", method: "POST" }
  );
}

export async function checkOpenClawHealth(): Promise<{ available: boolean; latencyMs: number }> {
  const primary = await callOpenClaw("/api/health", undefined, { method: "GET" });
  if (primary.success) {
    return { available: true, latencyMs: primary.latencyMs };
  }
  const fallback = await callOpenClaw("/health", undefined, { method: "GET" });
  return { available: fallback.success, latencyMs: fallback.latencyMs };
}
