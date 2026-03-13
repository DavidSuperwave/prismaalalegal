import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";
import { addSupermemoryDocument } from "@/lib/supermemory";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_OPERATOR || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_REPLIES_CHAT_ID = process.env.TELEGRAM_REPLIES_CHAT_ID;
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "[REDACTED]";

interface TelegramUpdate {
  message?: {
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    reply_to_message?: {
      text?: string;
    };
  };
}

async function sendTelegramResponse(chatId: number, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("Failed to send Telegram response:", error);
  }
}

async function sendManyChatReply(subscriberId: string, message: string): Promise<boolean> {
  if (!MANYCHAT_API_KEY) {
    console.error("ManyChat API key not configured");
    return false;
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

    return response.ok;
  } catch (error) {
    console.error("Failed to send ManyChat reply:", error);
    return false;
  }
}

async function getAgentResponse(message: string, context?: string): Promise<string> {
  try {
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "user",
        channel: "telegram",
        content: message,
        metadata: {
          context: context || "Agent chat from Telegram",
          is_agent_chat: true,
        },
      }),
    });

    if (!response.ok) {
      return "Lo siento, no pude procesar tu mensaje en este momento. Por favor intenta de nuevo más tarde.";
    }

    const data = (await response.json()) as {
      content?: string;
      message?: string;
      response?: string;
    };
    return data.content || data.message || data.response || "No tengo una respuesta en este momento.";
  } catch (error) {
    console.error("OpenClaw error:", error);
    return "Lo siento, estoy teniendo problemas técnicos. Por favor intenta de nuevo más tarde.";
  }
}

async function handleReplyToLead(chatId: number, text: string, replyToText?: string): Promise<void> {
  const db = getDb();
  const now = nowIsoString();

  let conversationId: string | null = null;
  let subscriberId: string | null = null;

  if (replyToText) {
    const convMatch = replyToText.match(/🆔 \*Conversation:\* `([^`]+)`/);
    const subMatch = replyToText.match(/👤 \*Subscriber:\* `([^`]+)`/);
    if (convMatch) conversationId = convMatch[1];
    if (subMatch) subscriberId = subMatch[1];
  }

  if (!conversationId || !subscriberId) {
    await sendTelegramResponse(
      chatId,
      "❌ No pude identificar a qué conversación respondes. Por favor responde directamente al mensaje de notificación."
    );
    return;
  }

  const conversation = db
    .prepare(
      `SELECT id, contact_name, manychat_subscriber_id 
      FROM conversations 
      WHERE id = ? AND manychat_subscriber_id = ?`
    )
    .get(conversationId, subscriberId) as
    | { id: string; contact_name: string; manychat_subscriber_id: string }
    | undefined;

  if (!conversation) {
    await sendTelegramResponse(chatId, "❌ No encontré la conversación. Puede que ya haya sido archivada o eliminada.");
    return;
  }

  const sent = await sendManyChatReply(subscriberId, text);
  if (!sent) {
    await sendTelegramResponse(chatId, "❌ No pude enviar el mensaje al contacto. Intenta desde Inbox.");
    return;
  }

  db.prepare(
    `INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
    VALUES (?, 'human', ?, 'manychat', ?, ?)`
  ).run(conversationId, text, now, JSON.stringify({ sent_via: "telegram", operator: "human" }));

  db.prepare(
    `UPDATE conversations SET 
      last_message = ?,
      last_message_at = ?,
      unread_count = 0
    WHERE id = ?`
  ).run(text, now, conversationId);

  await addSupermemoryDocument({
    content: `[Agente]: ${text}`,
    containerSuffix: `conversations:${conversationId}`,
    metadata: {
      contact_name: conversation.contact_name,
      conversation_id: conversationId,
      channel: "manychat",
      sender: "human",
      sent_via: "telegram",
      timestamp: now,
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
      content: `[EJEMPLO DE RESPUESTA]\nContacto dice: "${lastContactMessage.content}"\nOperador responde: "${text}"`,
      containerSuffix: "training:reply_examples",
      metadata: {
        contact_name: conversation.contact_name,
        conversation_id: conversationId,
        channel: "manychat",
        sent_via: "telegram",
        timestamp: now,
        type: "reply_example",
      },
    }).catch(() => undefined);
  }

  await sendTelegramResponse(
    chatId,
    `✅ *Mensaje enviado a ${conversation.contact_name}*\n\n📝 ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`
  );
}

async function handleAgentChat(chatId: number, text: string): Promise<void> {
  if (TELEGRAM_BOT_TOKEN) {
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action: "typing",
      }),
    }).catch(() => undefined);
  }

  const response = await getAgentResponse(text, "Agent asking for help with lead responses");
  await sendTelegramResponse(chatId, `🤖 *Asistente:*\n\n${response}`);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelegramUpdate;
    const message = body.message;
    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const replyToText = message.reply_to_message?.text;

    const isRepliesChannelMessage =
      !TELEGRAM_REPLIES_CHAT_ID || String(chatId) === String(TELEGRAM_REPLIES_CHAT_ID);
    const looksLikeLeadReply =
      !!replyToText && (replyToText.includes("🆔 *Conversation:*") || replyToText.includes("🔔 *Nuevo mensaje"));

    if (isRepliesChannelMessage && looksLikeLeadReply) {
      await handleReplyToLead(chatId, text, replyToText);
    } else {
      await handleAgentChat(chatId, text);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: "human-in-the-loop",
    features: ["agent_chat", "reply_to_leads"],
    timestamp: new Date().toISOString(),
  });
}
