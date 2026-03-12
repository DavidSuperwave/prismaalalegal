import { NextResponse } from "next/server";
import { getDb, nowIsoString } from "@/lib/db";
import { addSupermemoryDocument } from "@/lib/supermemory";

const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Send message via ManyChat
async function sendManyChatMessage(subscriberId: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!MANYCHAT_API_KEY) {
    return { success: false, error: "ManyChat API key not configured" };
  }

  try {
    const response = await fetch(`https://api.manychat.com/fb/sending/sendContent`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MANYCHAT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriber_id: subscriberId,
        message: {
          type: "text",
          text: message,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `ManyChat API error: ${error}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Failed to send: ${String(error)}` };
  }
}

// Send confirmation to Telegram
async function notifyTelegramReplySent(
  contactName: string,
  message: string,
  conversationId: string
): Promise<void> {
  const TELEGRAM_REPLIES_CHAT_ID = process.env.TELEGRAM_REPLIES_CHAT_ID;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_REPLIES_CHAT_ID) return;

  const text = `✅ *Respuesta enviada a ${contactName}*\n\n📝 ${message.substring(0, 200)}${message.length > 200 ? "..." : ""}\n\n🆔 Conversation: \`${conversationId}\``;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_REPLIES_CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("Failed to notify Telegram:", error);
  }
}

export async function POST(request: Request) {
  try {
    const { conversationId, message } = (await request.json()) as {
      conversationId?: string;
      message?: string;
    };

    if (!conversationId?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "conversationId and message are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = nowIsoString();

    // Get conversation details
    const conversation = db.prepare(`
      SELECT 
        c.id,
        c.contact_name,
        c.manychat_subscriber_id,
        c.telegram_chat_id,
        c.source,
        l.id as lead_id
      FROM conversations c
      LEFT JOIN leads l ON l.id = c.lead_id
      WHERE c.id = ?
    `).get(conversationId) as {
      id: string;
      contact_name: string;
      manychat_subscriber_id: string | null;
      telegram_chat_id: string | null;
      source: "manychat" | "telegram";
      lead_id: string | null;
    } | undefined;

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Send based on channel
    let sendResult: { success: boolean; error?: string };

    if (conversation.source === "manychat" && conversation.manychat_subscriber_id) {
      sendResult = await sendManyChatMessage(
        conversation.manychat_subscriber_id,
        message.trim()
      );
    } else if (conversation.source === "telegram" && conversation.telegram_chat_id) {
      // TODO: Implement Telegram send
      sendResult = { success: false, error: "Telegram replies not yet implemented" };
    } else {
      sendResult = { success: false, error: `No valid channel identifier for ${conversation.source}` };
    }

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error },
        { status: 500 }
      );
    }

    // Save to database
    db.prepare(`
      INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
      VALUES (?, 'human', ?, ?, ?, ?)
    `).run(
      conversationId,
      message.trim(),
      conversation.source,
      now,
      JSON.stringify({ sent_via: "web", operator: "human" })
    );

    // Update conversation
    db.prepare(`
      UPDATE conversations SET 
        last_message = ?,
        last_message_at = ?,
        unread_count = 0,
        updated_at = ?
      WHERE id = ?
    `).run(message.trim(), now, now, conversationId);

    // Save to Supermemory (training data)
    await addSupermemoryDocument({
      content: `[Agente]: ${message.trim()}`,
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

    // Notify Telegram
    await notifyTelegramReplySent(
      conversation.contact_name,
      message.trim(),
      conversationId
    );

    return NextResponse.json({
      success: true,
      message: {
        id: crypto.randomUUID(),
        sender: "human",
        content: message.trim(),
        channel: conversation.source,
        timestamp: now,
      },
    });

  } catch (error) {
    console.error("Reply API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
