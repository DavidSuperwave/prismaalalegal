import "server-only";

const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;
const MANYCHAT_UNIVERSAL_ENDPOINT = "https://api.manychat.com/sending/sendContent";
const MANYCHAT_FLOW_ENDPOINT = "https://api.manychat.com/sending/sendFlow";

export function hoursSinceLastMessage(lastMessageAt: string | null): number {
  if (!lastMessageAt) return 999;
  const lastMessage = new Date(lastMessageAt).getTime();
  const now = Date.now();
  return (now - lastMessage) / (1000 * 60 * 60);
}

export async function sendManyChatContent(
  subscriberId: string,
  message: string,
  lastMessageAt?: string | null,
  forceAccountUpdate: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (!MANYCHAT_API_KEY) {
    return { success: false, error: "ManyChat API key not configured" };
  }

  try {
    const hoursSince = hoursSinceLastMessage(lastMessageAt || null);
    const messageTag = (hoursSince > 23 || forceAccountUpdate) ? "ACCOUNT_UPDATE" : undefined;

    console.log(`[ManyChat] Sending to ${subscriberId}. Hours since: ${hoursSince.toFixed(1)}. Tag: ${messageTag || "none"}. Force: ${forceAccountUpdate}`);

    const payload: Record<string, unknown> = {
      subscriber_id: subscriberId,
      data: {
        version: "v2",
        content: {
          messages: [{ type: "text", text: message }],
        },
      },
    };

    if (messageTag) {
      payload.message_tag = messageTag;
    }

    const response = await fetch(MANYCHAT_UNIVERSAL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MANYCHAT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ManyChat] Error ${response.status}:`, errorText);

      if (response.status === 403 && errorText.includes("24")) {
        return { success: false, error: "24-hour window expired. Try importing lead first via ManyChat dashboard." };
      }
      if (response.status === 404) {
        return { success: false, error: "Subscriber not found. Lead may need to be imported to ManyChat first." };
      }

      return { success: false, error: `ManyChat API error (${response.status}): ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    console.error("[ManyChat] Exception:", error);
    return { success: false, error: `Failed to send via ManyChat: ${String(error)}` };
  }
}

export async function sendManyChatFlow(
  subscriberId: string,
  flowId: string
): Promise<{ success: boolean; error?: string }> {
  if (!MANYCHAT_API_KEY) {
    return { success: false, error: "ManyChat API key not configured" };
  }

  if (!flowId) {
    return { success: false, error: "Flow ID not configured. ManyChat templates need to be set up and approved by Meta first." };
  }

  try {
    const response = await fetch(MANYCHAT_FLOW_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MANYCHAT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriber_id: subscriberId,
        flow_ns: flowId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ManyChat] Flow send error ${response.status}:`, errorText);
      return { success: false, error: `ManyChat flow error (${response.status}): ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    console.error("[ManyChat] Flow exception:", error);
    return { success: false, error: `Failed to send flow via ManyChat: ${String(error)}` };
  }
}
