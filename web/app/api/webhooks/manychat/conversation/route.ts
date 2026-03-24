import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";
import { TAGS, searchMemory, addSupermemoryDocument } from "@/lib/supermemory";
import { callOpenClaw, sendToAgent } from "@/lib/openclaw-client";
import { notifyOperator } from "@/lib/notifier";

// ============================================================
// Conversation Handler with external_message_callback
//
// Replaces fire-and-forget webhook. Lives in the web container.
// Calls OpenClaw via the existing callOpenClaw() client.
// Calls Supermemory via the existing searchMemory() + direct v4.
// Stores data in the shared SQLite DB.
//
// Compatible with:
//   - Docker network: runs inside web:3000, Caddy routes /api/* here
//   - OpenClaw: calls /api/message same as draft endpoint
//   - Supermemory: uses TAGS.SHARED for search, v4 for conversation writes
//   - ManyChat: returns v2 format with external_message_callback
// ============================================================

const WEBHOOK_SECRET = process.env.MANYCHAT_WEBHOOK_SECRET;
const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY;

// Confidence thresholds
const AUTO_REPLY_THRESHOLD = 0.75;
const DRAFT_THRESHOLD = 0.50;

// Callback URL — must be HTTPS for ManyChat
const CALLBACK_BASE_URL =
  process.env.MANYCHAT_CALLBACK_URL ||
  `https://${process.env.DOMAIN}/api/webhooks/manychat/conversation`;

// ============================================================
// SETTINGS HELPER
// ============================================================

function getReplyMode(): "auto" | "manual" {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'reply_mode'").get() as
      | { value: string }
      | undefined;
    return (row?.value === "auto" ? "auto" : "manual");
  } catch {
    return "manual";
  }
}

const ACTIVE_CONVO_TIMEOUT = 600; // 10 min during active convo
const IDLE_CONVO_TIMEOUT = 86400; // 24h max

type WebhookPayload = {
  subscriber?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    channel?: string;
  };
  message?: {
    id?: string;
    text?: string;
    timestamp?: string | number;
  };
  // Fields from external_message_callback
  id?: string;
  last_input_text?: string;
  subscriber_id?: string;
  conversation_id?: string;
};

type SearchResult = {
  results?: Array<{
    score: number;
    content?: string;
    chunks?: Array<{ content: string; score: number; isRelevant: boolean }>;
    metadata?: Record<string, unknown>;
  }>;
};

// ============================================================
// SUPERMEMORY SEARCH
// ============================================================

async function searchForSimilarConversations(messageText: string) {
  const result = {
    confidence: 0,
    matchedPatterns: [] as string[],
    matchedConversations: [] as string[],
    matchedGuidance: [] as string[],
    topCategory: null as string | null,
  };

  try {
    // Parallel search: patterns, conversations, and operator guidance
    const [patternResults, convoResults, guidanceResults] = await Promise.all([
      searchMemory(
        messageText,
        TAGS.SHARED,
        { AND: [{ key: "type", value: "approved_reply" }] },
        5
      ) as Promise<SearchResult>,
      searchMemory(
        messageText,
        TAGS.SHARED,
        undefined,
        5
      ) as Promise<SearchResult>,
      searchMemory(
        messageText,
        TAGS.SHARED,
        { AND: [{ key: "type", value: "operator_guidance" }] },
        3
      ) as Promise<SearchResult>,
    ]);

    const patterns = patternResults?.results || [];
    if (patterns.length > 0 && patterns[0].score) {
      result.confidence = Math.max(result.confidence, patterns[0].score);
      result.topCategory = (patterns[0].metadata?.category as string) || null;
      result.matchedPatterns = patterns
        .filter((p) => p.score >= DRAFT_THRESHOLD)
        .map((p) => {
          const chunkContent = p.chunks
            ?.filter((c) => c.isRelevant)
            .map((c) => c.content)
            .join("\n");
          return chunkContent || p.content || "";
        })
        .filter(Boolean);
    }

    const convos = convoResults?.results || [];
    if (convos.length > 0 && convos[0].score) {
      result.confidence = Math.max(result.confidence, convos[0].score);
      result.matchedConversations = convos
        .filter((c) => c.score >= DRAFT_THRESHOLD)
        .map((c) => {
          const chunkContent = c.chunks
            ?.filter((ch) => ch.isRelevant)
            .map((ch) => ch.content)
            .join("\n");
          return chunkContent || c.content || "";
        })
        .filter(Boolean);
    }

    const guidance = guidanceResults?.results || [];
    if (guidance.length > 0) {
      result.matchedGuidance = guidance
        .filter((g) => g.score >= 0.3)
        .map((g) => {
          const chunkContent = g.chunks
            ?.filter((ch) => ch.isRelevant)
            .map((ch) => ch.content)
            .join("\n");
          return chunkContent || g.content || "";
        })
        .filter(Boolean);
    }
  } catch (error) {
    console.error("[Conversation] Supermemory search failed:", error);
    result.confidence = 0;
  }

  return result;
}

// ============================================================
// OPENCLAW — generate reply via existing callOpenClaw client
// ============================================================

async function generateReply(
  contactName: string,
  messageText: string,
  conversationHistory: string,
  memoryContext: {
    matchedPatterns: string[];
    matchedConversations: string[];
    matchedGuidance?: string[];
    topCategory: string | null;
  }
): Promise<string | null> {
  const guidanceBlock =
    memoryContext.matchedGuidance && memoryContext.matchedGuidance.length > 0
      ? `\n\nGUÍA DEL OPERADOR (ALTA PRIORIDAD — sigue estas instrucciones):\n${memoryContext.matchedGuidance.join("\n---\n")}`
      : "";

  const patternsBlock =
    memoryContext.matchedPatterns.length > 0
      ? `\n\nPATRONES DE RESPUESTA APROBADOS (usa estos como guía):\n${memoryContext.matchedPatterns.join("\n---\n")}`
      : "";

  const convoBlock =
    memoryContext.matchedConversations.length > 0
      ? `\n\nCONVERSACIONES SIMILARES PREVIAS:\n${memoryContext.matchedConversations.join("\n---\n")}`
      : "";

  const categoryHint = memoryContext.topCategory
    ? `\nCATEGORÍA DETECTADA: ${memoryContext.topCategory}`
    : "";

  const prompt =
    `[AUTO-REPLY] Genera una respuesta para ${contactName}.` +
    categoryHint +
    guidanceBlock +
    `\n\nHistorial de conversación:\n${conversationHistory}` +
    `\n\nMensaje actual del cliente: ${messageText}` +
    patternsBlock +
    convoBlock +
    `\n\nINSTRUCCIONES: Responde en español, tono profesional y cálido. ` +
    `Si hay guía del operador relevante, síguela con prioridad. ` +
    `Sigue el patrón de respuesta aprobado si hay uno relevante. ` +
    `No des asesoría legal específica. Si el caso parece fuera de alcance, ` +
    `redirige amablemente.`;

  // Uses the same callOpenClaw from web/lib/openclaw-client.ts
  // that the draft endpoint and chat proxy already use
  const result = await callOpenClaw<{
    content?: string;
    message?: string;
    response?: string;
  }>("/api/message", {
    role: "user",
    channel: "manychat",
    content: prompt,
    metadata: {
      is_auto_reply: true,
      contact_name: contactName,
      category: memoryContext.topCategory,
    },
  });

  if (!result.success || !result.data) return null;

  return result.data.content || result.data.message || result.data.response || null;
}

// ============================================================
// TELEGRAM NOTIFICATION
// ============================================================

// ============================================================
// SMART ESCALATION — generate reason for escalation
// ============================================================

async function generateEscalationReason(
  contactName: string,
  messageText: string,
  conversationHistory: string,
  confidence: number
): Promise<string | null> {
  try {
    const prompt =
      `[ESCALATION-ANALYSIS] Analiza por qué el agente no puede responder automáticamente a este mensaje.\n\n` +
      `Contacto: ${contactName}\n` +
      `Confianza: ${(confidence * 100).toFixed(0)}%\n` +
      `Historial:\n${conversationHistory}\n` +
      `Mensaje actual: ${messageText}\n\n` +
      `INSTRUCCIONES: Responde en español, 1-2 oraciones máximo. Explica qué hace este caso difícil o nuevo para el agente.`;

    const result = await callOpenClaw<{
      content?: string;
      message?: string;
      response?: string;
    }>("/api/message", {
      role: "user",
      channel: "internal",
      content: prompt,
      metadata: { is_escalation_analysis: true, contact_name: contactName },
    });

    if (!result.success || !result.data) return null;
    return result.data.content || result.data.message || result.data.response || null;
  } catch {
    return null;
  }
}

// ============================================================
// CRM AUTO-STAGE HELPERS
// ============================================================

function updateLeadStageIfNew(subscriberId: string) {
  try {
    const db = getDb();
    db.prepare(
      "UPDATE leads SET status = 'contacted', updated_at = datetime('now') WHERE manychat_subscriber_id = ? AND status = 'new'"
    ).run(subscriberId);
  } catch (error) {
    console.error("[Conversation] CRM auto-stage update failed:", error);
  }
}

function triggerAutoQualifyIfReady(conversationId: string, subscriberId: string) {
  try {
    const db = getDb();

    // Check if lead is already qualified or higher
    const lead = db.prepare(
      "SELECT status FROM leads WHERE manychat_subscriber_id = ? LIMIT 1"
    ).get(subscriberId) as { status: string } | undefined;

    if (lead && ["qualified", "accepted", "rejected"].includes(lead.status)) return;

    // Count messages in conversation
    const countRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ?"
    ).get(conversationId) as { cnt: number };

    if (countRow.cnt >= 6) {
      // Fire-and-forget qualification via agent
      void sendToAgent("qualified-leads",
        `Auto-qualify check: conversation ${conversationId} has ${countRow.cnt} messages. ` +
        `Subscriber: ${subscriberId}. Review and score this lead.`
      ).catch((err) => console.error("[Conversation] Auto-qualify trigger failed:", err));
    }
  } catch (error) {
    console.error("[Conversation] Auto-qualify check failed:", error);
  }
}

async function notifyOperatorEscalation(
  contactName: string,
  messageText: string,
  conversationId: string,
  confidence: number,
  reason: "low_confidence" | "no_match" | "draft_review",
  draft?: string,
  escalationAnalysis?: string
) {
  const emoji = confidence >= DRAFT_THRESHOLD ? "🟡" : confidence > 0 ? "🔴" : "⚫";
  const reasonText = {
    low_confidence: "Baja confianza — necesita revisión humana",
    no_match: "Sin coincidencias — caso nuevo, nunca visto",
    draft_review: "Borrador generado — necesita aprobación",
  }[reason];

  let text =
    `${emoji} *Escalación del Agente*\n\n` +
    `👤 *Contacto:* ${contactName}\n` +
    `💬 *Mensaje:* ${messageText.length > 200 ? messageText.slice(0, 200) + "..." : messageText}\n` +
    `📊 *Confianza:* ${(confidence * 100).toFixed(0)}%\n` +
    `📋 *Razón:* ${reasonText}\n` +
    `🆔 *Conversación:* \`${conversationId}\``;

  if (escalationAnalysis) {
    text += `\n\n🧠 *Análisis:* ${escalationAnalysis.length > 200 ? escalationAnalysis.slice(0, 200) + "..." : escalationAnalysis}`;
  }

  if (draft) {
    text += `\n\n✏️ *Borrador sugerido:*\n${draft.length > 300 ? draft.slice(0, 300) + "..." : draft}`;
    text += `\n\n👉 Aprueba con /sendreply o edita en el Inbox`;
  } else {
    text += `\n\n👉 Responde desde el Inbox web o usa /draft`;
  }

  await notifyOperator(text, { parseMode: "Markdown" });
}

// ============================================================
// MANYCHAT RESPONSE BUILDER
// ============================================================

function buildManyChatResponse(
  replyText: string | null,
  subscriberId: string,
  conversationId: string,
  isAutoReply: boolean
) {
  const messages: Array<{ type: string; text: string }> = [];

  if (replyText) {
    messages.push({ type: "text", text: replyText });
  } else {
    messages.push({
      type: "text",
      text: "Gracias por tu mensaje. Un asesor revisará tu caso y te responderá en breve. ⚖️",
    });
  }

  return {
    version: "v2",
    content: {
      messages,
      actions: [],
      quick_replies: [],
      external_message_callback: {
        url: CALLBACK_BASE_URL,
        method: "post",
        headers: {
          "x-webhook-secret": WEBHOOK_SECRET || "",
          "Content-Type": "application/json",
        },
        payload: {
          subscriber_id: subscriberId,
          conversation_id: conversationId,
          last_input_text: "{{last_input_text}}",
          id: "{{user_id}}",
        },
        timeout: isAutoReply ? ACTIVE_CONVO_TIMEOUT : IDLE_CONVO_TIMEOUT,
      },
    },
  };
}

// ============================================================
// DATABASE HELPERS — uses same getDb() as all other routes
// ============================================================

function resolveConversation(
  subscriberId: string,
  contactName: string,
  contactPhone: string | null,
  channel: string,
  now: string
) {
  const db = getDb();

  let lead = db
    .prepare(
      "SELECT id FROM leads WHERE manychat_subscriber_id = ? OR phone = ? LIMIT 1"
    )
    .get(subscriberId, contactPhone || "__none__") as { id: string } | undefined;

  if (!lead) {
    db.prepare(
      `INSERT OR IGNORE INTO leads (name, phone, source, status, manychat_subscriber_id, channel, created_at, updated_at)
       VALUES (?, ?, 'manychat', 'new', ?, ?, ?, ?)`
    ).run(contactName, contactPhone, subscriberId, channel, now, now);

    lead = db
      .prepare("SELECT id FROM leads WHERE manychat_subscriber_id = ? LIMIT 1")
      .get(subscriberId) as { id: string } | undefined;
  }

  let conversation = db
    .prepare("SELECT id FROM conversations WHERE manychat_subscriber_id = ? LIMIT 1")
    .get(subscriberId) as { id: string } | undefined;

  if (!conversation) {
    db.prepare(
      `INSERT INTO conversations
       (contact_name, contact_phone, source, channel, last_message, last_message_at,
        unread_count, status, manychat_subscriber_id, lead_id, created_at)
       VALUES (?, ?, 'manychat', ?, '', ?, 0, 'active', ?, ?, ?)`
    ).run(contactName, contactPhone, channel, now, subscriberId, lead?.id || null, now);

    conversation = db
      .prepare("SELECT id FROM conversations WHERE manychat_subscriber_id = ? LIMIT 1")
      .get(subscriberId) as { id: string } | undefined;
  }

  return { leadId: lead?.id, conversationId: conversation?.id };
}

function getConversationHistory(conversationId: string, limit = 10): string {
  const db = getDb();
  const messages = db
    .prepare(
      `SELECT sender, content, timestamp FROM messages
       WHERE conversation_id = ? ORDER BY datetime(timestamp) DESC LIMIT ?`
    )
    .all(conversationId, limit) as Array<{ sender: string; content: string; timestamp: string }>;

  return messages
    .reverse()
    .map((m) =>
      `[${m.sender === "contact" ? "Cliente" : m.sender === "human" ? "Operador" : "Agente"}]: ${m.content}`
    )
    .join("\n");
}

function saveMessage(
  conversationId: string,
  sender: "contact" | "agent" | "human",
  content: string,
  channel: string,
  now: string,
  metadata: Record<string, unknown> = {}
) {
  const db = getDb();

  db.prepare(
    `INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(conversationId, sender, content, channel, now, JSON.stringify(metadata));

  db.prepare(
    `UPDATE conversations SET last_message = ?, last_message_at = ?,
         unread_count = CASE WHEN ? = 'contact' THEN unread_count + 1 ELSE 0 END
     WHERE id = ?`
  ).run(content, now, sender, conversationId);
}

function saveDraftReply(conversationId: string, draftText: string, now: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO replies (conversation_id, agent_draft, final_text, status, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?)`
  ).run(conversationId, draftText, draftText, now, now);
}

// ============================================================
// LEARNING — store conversation turn in Supermemory v4
// ============================================================

async function storeConversationTurn(
  conversationId: string,
  contactName: string,
  customerMessage: string,
  agentReply: string,
  channel: string,
  wasAutoReply: boolean
) {
  if (!SUPERMEMORY_API_KEY) return;

  try {
    await fetch("https://api.supermemory.ai/v4/conversations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPERMEMORY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: `live_${conversationId}`,
        messages: [
          { role: "user", content: customerMessage, name: contactName },
          { role: "assistant", content: agentReply },
        ],
        containerTags: [TAGS.SHARED[0]],
        metadata: {
          type: wasAutoReply ? "auto_reply" : "human_reply",
          channel,
          contact_name: contactName,
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } catch (error) {
    console.error("[Conversation] Supermemory learning write failed:", error);
  }
}

// ============================================================
// IDEMPOTENCY — same pattern as existing webhook
// ============================================================

function ensureIdempotencyTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS processed_webhooks (
      idempotency_key TEXT PRIMARY KEY,
      processed_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function checkAndMarkProcessed(key: string, now: string): boolean {
  const db = getDb();
  const result = db
    .prepare("INSERT OR IGNORE INTO processed_webhooks (idempotency_key, processed_at) VALUES (?, ?)")
    .run(key, now);
  return result.changes > 0;
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-webhook-secret");
    if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }

    const body = (await request.json()) as WebhookPayload;
    const now = nowIsoString();

    // Normalize — handle both initial webhook and callback formats
    const subscriberId = body.subscriber?.id || body.subscriber_id || body.id || "";
    const contactName = body.subscriber?.name?.trim() || "Contacto";
    const contactPhone = body.subscriber?.phone || null;
    const channel = body.subscriber?.channel || "fb";
    const messageText = (body.message?.text || body.last_input_text || "").trim();

    if (!subscriberId || !messageText) {
      return NextResponse.json({ error: "Missing subscriber or message" }, { status: 400 });
    }

    // Idempotency
    ensureIdempotencyTable();
    const idempotencyKey = `conv:${subscriberId}:${body.message?.id || messageText.slice(0, 50)}:${now}`;
    if (!checkAndMarkProcessed(idempotencyKey, now)) {
      return NextResponse.json(buildManyChatResponse(null, subscriberId, "", false));
    }

    // Resolve conversation in DB
    const { conversationId } = resolveConversation(subscriberId, contactName, contactPhone, channel, now);
    if (!conversationId) {
      return NextResponse.json({ error: "Failed to resolve conversation" }, { status: 500 });
    }

    // Save inbound message
    saveMessage(conversationId, "contact", messageText, channel, now, {
      subscriber_id: subscriberId,
      source: "conversation_handler",
    });

    // Get conversation history
    const history = getConversationHistory(conversationId);

    // ============================================================
    // CONFIDENCE ROUTER
    // ============================================================

    const searchResult = await searchForSimilarConversations(messageText);
    const { confidence, topCategory } = searchResult;
    const replyMode = getReplyMode();

    console.log(
      `[Conversation] ${contactName} | confidence: ${(confidence * 100).toFixed(0)}% | category: ${topCategory || "unknown"} | mode: ${replyMode} | "${messageText.slice(0, 80)}"`
    );

    // HIGH CONFIDENCE → Auto-reply (or draft if manual mode)
    if (confidence >= AUTO_REPLY_THRESHOLD) {
      if (replyMode === "auto") {
        const reply = await generateReply(contactName, messageText, history, searchResult);

        if (reply) {
          saveMessage(conversationId, "agent", reply, channel, now, {
            auto_reply: true,
            confidence,
            category: topCategory,
          });

          // CRM auto-stage: new → contacted
          updateLeadStageIfNew(subscriberId);

          await storeConversationTurn(conversationId, contactName, messageText, reply, channel, true);

          // Auto-qualify trigger after 6+ messages
          triggerAutoQualifyIfReady(conversationId, subscriberId);

          console.log(`[Conversation] ✅ Auto-replied to ${contactName} (${(confidence * 100).toFixed(0)}%)`);
          return NextResponse.json(buildManyChatResponse(reply, subscriberId, conversationId, true));
        }
      } else {
        // Manual mode: generate draft instead of auto-replying
        const draft = await generateReply(contactName, messageText, history, searchResult);
        if (draft) saveDraftReply(conversationId, draft, now);

        await notifyOperatorEscalation(contactName, messageText, conversationId, confidence, "draft_review", draft || undefined);

        console.log(`[Conversation] 🟡 Manual mode — draft for ${contactName} (${(confidence * 100).toFixed(0)}%)`);
        return NextResponse.json(buildManyChatResponse(null, subscriberId, conversationId, false));
      }
    }

    // MEDIUM CONFIDENCE → Draft + escalate
    if (confidence >= DRAFT_THRESHOLD) {
      const [draft, escalationAnalysis] = await Promise.all([
        generateReply(contactName, messageText, history, searchResult),
        generateEscalationReason(contactName, messageText, history, confidence),
      ]);
      if (draft) saveDraftReply(conversationId, draft, now);

      await notifyOperatorEscalation(contactName, messageText, conversationId, confidence, "draft_review", draft || undefined, escalationAnalysis || undefined);

      console.log(`[Conversation] 🟡 Draft for ${contactName} (${(confidence * 100).toFixed(0)}%)`);
      return NextResponse.json(buildManyChatResponse(null, subscriberId, conversationId, false));
    }

    // LOW CONFIDENCE → Full escalation (smart escalation reason is fire-and-forget)
    const escalationReasonPromise = generateEscalationReason(contactName, messageText, history, confidence);
    escalationReasonPromise.then((analysis) => {
      void notifyOperatorEscalation(
        contactName, messageText, conversationId, confidence,
        confidence > 0 ? "low_confidence" : "no_match",
        undefined, analysis || undefined
      );
    }).catch(() => {
      void notifyOperatorEscalation(
        contactName, messageText, conversationId, confidence,
        confidence > 0 ? "low_confidence" : "no_match"
      );
    });

    // Store even for escalations so Supermemory learns the question exists
    try {
      await addSupermemoryDocument({
        content: `[${contactName}]: ${messageText}`,
        containerTag: TAGS.SHARED[0],
        metadata: {
          type: "escalated_message",
          contact_name: contactName,
          channel,
          confidence,
          timestamp: now,
          conversation_id: conversationId,
        },
      });
    } catch {
      // Non-blocking
    }

    console.log(`[Conversation] 🔴 Escalated ${contactName} (${(confidence * 100).toFixed(0)}%)`);
    return NextResponse.json(buildManyChatResponse(null, subscriberId, conversationId, false));
  } catch (error) {
    console.error("[Conversation] Handler error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: "confidence-auto-reply",
    thresholds: { auto_reply: AUTO_REPLY_THRESHOLD, draft: DRAFT_THRESHOLD },
    callback_url: CALLBACK_BASE_URL,
    timestamp: new Date().toISOString(),
  });
}
