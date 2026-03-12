import { NextResponse } from "next/server";
import { getDb, nowIsoString } from "@/lib/db";
import { addSupermemoryDocument } from "@/lib/supermemory";

const WEBHOOK_SECRET = process.env.MANYCHAT_WEBHOOK_SECRET;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_REPLIES_CHAT_ID = process.env.TELEGRAM_REPLIES_CHAT_ID;
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "[REDACTED]";

async function generateDraftSuggestion(
  messageText: string,
  contactName: string,
  conversationId: string
): Promise<string | null> {
  try {
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "user",
        channel: "manychat",
        content: `[BORRADOR] ${contactName} dice: "${messageText}". Genera una respuesta sugerida siguiendo las instrucciones de SOUL.md. Esta respuesta será revisada por un humano antes de enviarla.`,
        metadata: {
          is_draft: true,
          contact_name: contactName,
          conversation_id: conversationId,
        },
      }),
    });

    if (!response.ok) {
      console.warn("OpenClaw draft generation failed:", response.status);
      return null;
    }

    const data = (await response.json()) as {
      content?: string;
      message?: string;
      response?: string;
    };
    return data.content || data.message || data.response || null;
  } catch (error) {
    console.warn("OpenClaw unavailable for draft generation:", error);
    return null;
  }
}

async function notifyTelegram(
  contactName: string,
  messageText: string,
  conversationId: string,
  subscriberId: string,
  source: string = "manychat",
  draftSuggestion: string | null = null
) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_REPLIES_CHAT_ID) {
    console.warn("Telegram not configured for notifications");
    return;
  }

  const truncatedMessage = messageText.length > 200 ? `${messageText.substring(0, 200)}...` : messageText;
  const draftSection = draftSuggestion
    ? `\n\n🤖 *Borrador sugerido:*\n${draftSuggestion.substring(0, 300)}${draftSuggestion.length > 300 ? "..." : ""}`
    : "\n\n⚠️ _No se pudo generar borrador automático_";

  const text =
    `🔔 *Nuevo mensaje de ${contactName}*\n\n` +
    `📝 *Mensaje:* ${truncatedMessage}${draftSection}\n\n` +
    `📱 *Canal:* ${source.toUpperCase()}\n` +
    `🆔 *Conversation:* \`${conversationId}\`\n` +
    `👤 *Subscriber:* \`${subscriberId}\`\n\n` +
    `💡 _Responde a este mensaje para enviar tu respuesta al contacto_`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_REPLIES_CHAT_ID,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "✍️ Responder en Inbox", url: `[REDACTED]/inbox?conversation=${conversationId}` }]],
        },
      }),
    });
  } catch (error) {
    console.error("Failed to notify Telegram:", error);
  }
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-webhook-secret");
    if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }

    const body = (await request.json()) as {
      subscriber?: {
        id?: string;
        name?: string;
        phone?: string;
        email?: string;
      };
      message?: {
        text?: string;
      };
    };

    const subscriber = body.subscriber;
    const messageText = body.message?.text?.trim();
    if (!subscriber?.id || !messageText) {
      return NextResponse.json({ error: "Missing subscriber or message" }, { status: 400 });
    }

    const db = getDb();
    const now = nowIsoString();
    const contactName = subscriber.name?.trim() || "Contacto";

    let lead = db
      .prepare(
        `SELECT id
        FROM leads
        WHERE manychat_subscriber_id = ? OR phone = ? OR email = ?
        LIMIT 1`
      )
      .get(subscriber.id, subscriber.phone || null, subscriber.email || null) as { id: string } | undefined;

    if (!lead) {
      db.prepare(
        `INSERT INTO leads (name, email, phone, source, status, manychat_subscriber_id, created_at, updated_at)
        VALUES (?, ?, ?, 'manychat', 'new', ?, ?, ?)`
      ).run(contactName, subscriber.email || null, subscriber.phone || null, subscriber.id, now, now);

      lead = db
        .prepare(
          `SELECT id
          FROM leads
          WHERE manychat_subscriber_id = ? OR phone = ? OR email = ?
          LIMIT 1`
        )
        .get(subscriber.id, subscriber.phone || null, subscriber.email || null) as { id: string } | undefined;
    } else {
      db.prepare(
        `UPDATE leads
          SET name = COALESCE(?, name),
              email = COALESCE(?, email),
              phone = COALESCE(?, phone),
              updated_at = ?
        WHERE id = ?`
      ).run(contactName, subscriber.email || null, subscriber.phone || null, now, lead.id);
    }

    if (!lead) {
      return NextResponse.json({ error: "Failed to resolve lead" }, { status: 500 });
    }

    let conversation = db
      .prepare(
        `SELECT id
        FROM conversations
        WHERE manychat_subscriber_id = ? OR contact_phone = ?
        LIMIT 1`
      )
      .get(subscriber.id, subscriber.phone || null) as { id: string } | undefined;

    if (!conversation) {
      db.prepare(
        `INSERT INTO conversations
        (contact_name, contact_phone, source, last_message, last_message_at, unread_count, status, manychat_subscriber_id, lead_id, created_at)
        VALUES (?, ?, 'manychat', ?, ?, 1, 'active', ?, ?, ?)`
      ).run(contactName, subscriber.phone || null, messageText, now, subscriber.id, lead.id, now);

      conversation = db
        .prepare(
          `SELECT id
          FROM conversations
          WHERE manychat_subscriber_id = ? OR contact_phone = ?
          LIMIT 1`
        )
        .get(subscriber.id, subscriber.phone || null) as { id: string } | undefined;
    } else {
      db.prepare(
        `UPDATE conversations
          SET last_message = ?,
              last_message_at = ?,
              unread_count = unread_count + 1,
              contact_name = COALESCE(?, contact_name),
              lead_id = COALESCE(?, lead_id)
        WHERE id = ?`
      ).run(messageText, now, contactName, lead.id, conversation.id);
    }

    if (!conversation) {
      return NextResponse.json({ error: "Failed to resolve conversation" }, { status: 500 });
    }

    db.prepare(
      `INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
      VALUES (?, 'contact', ?, 'manychat', ?, ?)`
    ).run(
      conversation.id,
      messageText,
      now,
      JSON.stringify({
        subscriber_id: subscriber.id,
        subscriber_name: subscriber.name,
        subscriber_phone: subscriber.phone,
        subscriber_email: subscriber.email,
      })
    );

    await addSupermemoryDocument({
      content: `[${contactName}]: ${messageText}`,
      containerSuffix: `conversations:${conversation.id}`,
      metadata: {
        contact_name: contactName,
        channel: "manychat",
        sender: "contact",
        timestamp: now,
        conversation_id: conversation.id,
        subscriber_id: subscriber.id,
      },
    }).catch(() => undefined);

    const draftSuggestion = await generateDraftSuggestion(messageText, contactName, conversation.id).catch(() => null);

    await notifyTelegram(contactName, messageText, conversation.id, subscriber.id, "manychat", draftSuggestion);

    return NextResponse.json({
      version: "v2",
      content: {
        messages: [],
      },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: "human-in-the-loop",
    auto_reply: false,
    draft_engine: "openclaw",
    timestamp: new Date().toISOString(),
  });
}
