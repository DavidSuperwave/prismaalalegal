const WEB_APP_URL = process.env.WEB_APP_INTERNAL_URL || "http://web:3000";
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "x-service-token": SERVICE_TOKEN,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

async function getPendingReply(conversationId) {
  const query = new URLSearchParams({
    status: "pending",
    limit: "1",
    ...(conversationId ? { conversation_id: conversationId } : {}),
  });
  const payload = await getJson(`${WEB_APP_URL}/api/inbox/replies?${query.toString()}`);
  return payload.replies?.[0] || null;
}

async function sendReply(reply) {
  await getJson(`${WEB_APP_URL}/api/inbox/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: reply.conversation_id,
      message: reply.final_text,
      originalDraft: reply.agent_draft || undefined,
    }),
  });
}

async function markSent(replyId) {
  await getJson(`${WEB_APP_URL}/api/inbox/replies/${replyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "sent" }),
  });
}

async function markSentWithRetry(replyId, retries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await markSent(replyId);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
  throw lastError || new Error("Failed to persist reply status");
}

async function replyStatus(conversationId) {
  const query = new URLSearchParams({
    status: "pending",
    ...(conversationId ? { conversation_id: conversationId } : {}),
  });
  const payload = await getJson(`${WEB_APP_URL}/api/inbox/replies?${query.toString()}`);
  return payload.replies?.length || 0;
}

async function replyHistory(phone) {
  const query = new URLSearchParams({
    status: "sent",
    limit: "5",
    ...(phone ? { phone } : {}),
  });
  return getJson(`${WEB_APP_URL}/api/inbox/replies?${query.toString()}`);
}

module.exports = {
  name: "reply-approve",
  description: "Approve and send pending leads-inbox replies",

  async execute({ command, context }) {
    const conversationId = context?.conversationId;
    const normalized = String(command || "").trim().toLowerCase();

    if (normalized.startsWith("/replystatus")) {
      const pending = await replyStatus(conversationId);
      return `Pending replies: ${pending}`;
    }

    if (normalized.startsWith("/replyhistory")) {
      const phone = normalized.split(" ").slice(1).join(" ").trim();
      const payload = await replyHistory(phone || undefined);
      const list = payload.replies || [];
      if (!list.length) return "No sent replies found.";
      return list
        .map((item) => `• ${item.sent_at || item.created_at}: ${item.final_text}`)
        .join("\n");
    }

    if (!normalized.startsWith("/replyapprove")) {
      return "Unsupported command.";
    }

    const pending = await getPendingReply(conversationId);
    if (!pending) {
      return "No pending reply to approve.";
    }

    await sendReply(pending);
    try {
      await markSentWithRetry(pending.id, 3);
      return `Reply sent for conversation ${pending.conversation_id}.`;
    } catch (error) {
      console.error("[reply-approve] reply sent but status update failed", {
        replyId: pending.id,
        conversationId: pending.conversation_id,
        error: error instanceof Error ? error.message : String(error),
      });
      return `Reply sent for conversation ${pending.conversation_id}, but status persistence failed. Please review /replystatus.`;
    }
  },
};
