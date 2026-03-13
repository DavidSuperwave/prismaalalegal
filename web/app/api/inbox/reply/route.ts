import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";
import { addSupermemoryDocument } from "@/lib/supermemory";

const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const AGENT_LEARNINGS_TAG = `agent:${process.env.AGENT_SLUG || "prismaalalegal"}:learnings`;

function normalizeForComparison(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

async function sendManyChatMessage(
  subscriberId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!MANYCHAT_API_KEY) {
    return { success: false, error: "ManyChat API key not configured" };
  }

  try {
    const response = await fetch("https://api.manychat.com/fb/sending/sendContent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MANYCHAT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriber_id: subscriberId,
        data: {
          version: "v2",
          content: {
            messages: [{ type: "text", text: message }],
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `ManyChat API error: ${error}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Failed to send via ManyChat: ${String(error)}` };
  }
}

async function sendTelegramMessage(chatId: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: "Telegram bot token not configured" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Telegram API error: ${error}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Failed to send via Telegram: ${String(error)}` };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      conversationId?: string;
      conversation_id?: string;
      message?: string;
      originalDraft?: string;
      subscriber_id?: string;
    };

    const conversationId = body.conversationId?.trim() || body.conversation_id?.trim();
    const message = body.message?.trim();
    const originalDraft = body.originalDraft?.trim();

    if (!conversationId || !message) {
      return NextResponse.json({ error: "conversationId and message are required" }, { status: 400 });
    }

    const db = getDb();
    const now = nowIsoString();
    const conversation = db
      .prepare(
        `SELECT 
          c.id,
          c.contact_name,
          c.manychat_subscriber_id,
          c.telegram_chat_id,
          c.source,
          l.id as lead_id
        FROM conversations c
        LEFT JOIN leads l ON l.id = c.lead_id
        WHERE c.id = ?`
      )
      .get(conversationId) as
      | {
          id: string;
          contact_name: string;
          manychat_subscriber_id: string | null;
          telegram_chat_id: string | null;
          source: "manychat" | "telegram";
          lead_id: string | null;
        }
      | undefined;

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    let sendResult: { success: boolean; error?: string } = { success: false, error: "Unsupported source" };
    if (conversation.source === "manychat") {
      const subscriberId = conversation.manychat_subscriber_id || body.subscriber_id;
      if (!subscriberId) {
        sendResult = { success: false, error: "Missing ManyChat subscriber id" };
      } else {
        sendResult = await sendManyChatMessage(subscriberId, message);
      }
    } else if (conversation.source === "telegram") {
      if (!conversation.telegram_chat_id) {
        sendResult = { success: false, error: "Missing Telegram chat id" };
      } else {
        sendResult = await sendTelegramMessage(conversation.telegram_chat_id, message);
      }
    }

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error || "Failed to send message" }, { status: 500 });
    }

    db.prepare(
      `INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
      VALUES (?, 'human', ?, ?, ?, ?)`
    ).run(conversationId, message, conversation.source, now, JSON.stringify({ sent_via: "web", operator: "human" }));

    db.prepare(
      `UPDATE conversations
        SET last_message = ?,
            last_message_at = ?,
            unread_count = 0,
            status = 'active'
      WHERE id = ?`
    ).run(message, now, conversationId);

    await addSupermemoryDocument({
      content: `[Agente]: ${message}`,
      containerSuffix: `conversations:${conversationId}`,
      metadata: {
        contact_name: conversation.contact_name,
        channel: conversation.source,
        sender: "human",
        timestamp: now,
        conversation_id: conversationId,
        lead_id: conversation.lead_id,
        sent_via: "web",
      },
    }).catch(() => undefined);

    const lastContactMessage = db
      .prepare(
        `SELECT content FROM messages
        WHERE conversation_id = ? AND sender = 'contact'
        ORDER BY datetime(timestamp) DESC
        LIMIT 1`
      )
      .get(conversationId) as { content: string } | undefined;

    if (lastContactMessage) {
      await addSupermemoryDocument({
        content: `[EJEMPLO DE RESPUESTA]\nContacto dice: "${lastContactMessage.content}"\nOperador responde: "${message}"`,
        containerSuffix: "training:reply_examples",
        metadata: {
          contact_name: conversation.contact_name,
          conversation_id: conversationId,
          channel: conversation.source,
          sent_via: "web",
          timestamp: now,
          type: "reply_example",
        },
      }).catch(() => undefined);
    }

    if (originalDraft && normalizeForComparison(originalDraft) !== normalizeForComparison(message)) {
      await addSupermemoryDocument({
        content:
          `[CORRECCIÓN DE BORRADOR]\n` +
          `Borrador IA: "${originalDraft}"\n` +
          `Operador envió: "${message}"\n` +
          `Contexto: conversación con ${conversation.contact_name}` +
          (lastContactMessage?.content
            ? `, último mensaje del contacto: "${lastContactMessage.content}"`
            : ""),
        containerTag: AGENT_LEARNINGS_TAG,
        metadata: {
          type: "draft_correction",
          contact_name: conversation.contact_name,
          conversation_id: conversationId,
          channel: conversation.source,
          sender: "human",
          timestamp: now,
          has_contact_message_context: Boolean(lastContactMessage?.content),
        },
      }).catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: crypto.randomUUID(),
        sender: "human",
        content: message,
        channel: conversation.source,
        timestamp: now,
      },
    });
  } catch (error) {
    console.error("Reply API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
