import { NextResponse } from "next/server";
import { getDb, nowIsoString } from "@/lib/db";
import { addSupermemoryDocument } from "@/lib/supermemory";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://openclaw:3100";

// Parse Telegram message
interface TelegramMessage {
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    reply_to_message?: {
      message_id: number;
      text?: string;
    };
    date: number;
  };
}

// Send message back to ManyChat lead
async function sendManyChatReply(subscriberId: string, message: string): Promise<boolean> {
  if (!MANYCHAT_API_KEY) {
    console.error("ManyChat API key not configured");
    return false;
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

    return response.ok;
  } catch (error) {
    console.error("Failed to send ManyChat reply:", error);
    return false;
  }
}

// Send response to Telegram
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

// Get AI response from OpenClaw
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

    const data = await response.json();
    return data.content || data.message || data.response || "No tengo una respuesta en este momento.";
  } catch (error) {
    console.error("OpenClaw error:", error);
    return "Lo siento, estoy teniendo problemas técnicos. Por favor intenta de nuevo más tarde.";
  }
}

// Handle reply to a lead (when you reply to a notification)
async function handleReplyToLead(
  chatId: number,
  text: string,
  replyToText?: string
): Promise<void> {
  const db = getDb();
  const now = nowIsoString();

  // Try to extract conversation/subscriber ID from the replied message
  // Notification format: "🔔 *Nuevo mensaje...* 🆔 *Conversation:* `xyz`"
  let conversationId: string | null = null;
  let subscriberId: string | null = null;

  if (replyToText) {
    const convMatch = replyToText.match(/🆔 \*Conversation:\* `([^`]+)`/);
    const subMatch = replyToText.match(/👤 \*Subscriber:\* `([^`]+)`/);
    
    if (convMatch) conversationId = convMatch[1];
    if (subMatch) subscriberId = subMatch[1];
  }

  if (!conversationId || !subscriberId) {
    await sendTelegramResponse(chatId, "❌ No pude identificar a qué conversación respondes. Por favor usa el botón 'Responder' en la notificación o responde directamente al mensaje de notificación.");
    return;
  }

  // Verify conversation exists
  const conversation = db.prepare(`
    SELECT id, contact_name, manychat_subscriber_id 
    FROM conversations 
    WHERE id = ? AND manychat_subscriber_id = ?
  `).get(conversationId, subscriberId) as { id: string; contact_name: string; manychat_subscriber_id: string } | undefined;

  if (!conversation) {
    await sendTelegramResponse(chatId, "❌ No encontré la conversación. Puede que ya haya sido archivada o eliminada.");
    return;
  }

  // Send to lead via ManyChat
  const sent = await sendManyChatReply(subscriberId, text);

  if (!sent) {
    await sendTelegramResponse(chatId, "❌ No pude enviar el mensaje al contacto. Por favor intenta desde la interfaz web: https://alalegal.proyectoprisma.com/inbox");
    return;
  }

  // Save to database
  db.prepare(`
    INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
    VALUES (?, 'human', ?, 'manychat', ?, ?)
  `).run(
    conversationId,
    text,
    now,
    JSON.stringify({ sent_via: "telegram", operator: "human" })
  );

  // Update conversation
  db.prepare(`
    UPDATE conversations SET 
      last_message = ?,
      last_message_at = ?,
      unread_count = 0
    WHERE id = ?
  `).run(text, now, conversationId);

  // Save to Supermemory (human reply for training)
  await addSupermemoryDocument({
    content: `[Agente]: ${text}`,
    containerSuffix: `conversations:${conversationId}`,
    metadata: {
      contact_name: conversation.contact_name,
      channel: "manychat",
      sender: "human",
      timestamp: now,
      conversation_id: conversationId,
      sent_via: "telegram",
    },
  }).catch(() => undefined);

  // Confirm to operator
  await sendTelegramResponse(chatId, `✅ *Mensaje enviado a ${conversation.contact_name}*\n\n📝 ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`);
}

// Handle agent chat (direct messages to the bot)
async function handleAgentChat(chatId: number, text: string): Promise<void> {
  // Typing indicator
  if (TELEGRAM_BOT_TOKEN) {
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action: "typing",
      }),
    }).catch(() => {});
  }

  // Get AI response
  const response = await getAgentResponse(text, "Agent asking for help with lead responses");

  // Send response
  await sendTelegramResponse(chatId, `🤖 *Asistente:*\n\n${response}`);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelegramMessage;
    const message = body.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text;
    const replyTo = message.reply_to_message;

    // Check if this is a reply to a notification (has conversation ID in original)
    if (replyTo?.text?.includes("🔔 *Nuevo mensaje") || replyTo?.text?.includes("🆔 *Conversation:")) {
      // This is a reply to a lead
      await handleReplyToLead(chatId, text, replyTo.text);
    } else {
      // This is an agent chat message
      await handleAgentChat(chatId, text);
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

// For webhook setup verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Webhook setup endpoint
  if (token === TELEGRAM_BOT_TOKEN?.split(":")[1]) {
    const webhookUrl = `https://${process.env.DOMAIN || "alalegal.proyectoprisma.com"}/api/webhooks/telegram`;
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message"],
        }),
      });

      const data = await response.json();
      return NextResponse.json({ 
        ok: data.ok, 
        description: data.description,
        webhook_url: webhookUrl 
      });
    } catch (error) {
      return NextResponse.json({ ok: false, error: String(error) });
    }
  }

  return NextResponse.json({ 
    status: "ok",
    mode: "human-in-the-loop",
    features: ["agent_chat", "reply_to_leads"],
    timestamp: new Date().toISOString(),
  });
}
