import { NextResponse } from "next/server";
import { getDb, nowIsoString } from "@/lib/db";
import { addSupermemoryDocument } from "@/lib/supermemory";

const WEBHOOK_SECRET = process.env.MANYCHAT_WEBHOOK_SECRET || "dfe1a2f812e51975bdc5153bf11feaa4";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_REPLIES_CHAT_ID = process.env.TELEGRAM_REPLIES_CHAT_ID;

// Send notification to Telegram for human review
async function notifyTelegram(
  contactName: string,
  messageText: string,
  conversationId: string,
  subscriberId: string,
  source: string = "manychat"
) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_REPLIES_CHAT_ID) {
    console.warn("Telegram not configured for notifications");
    return;
  }

  const truncatedMessage = messageText.length > 200 
    ? messageText.substring(0, 200) + "..." 
    : messageText;

  const text = `🔔 *Nuevo mensaje de ${contactName}*\n\n` +
    `📝 *Mensaje:* ${truncatedMessage}\n\n` +
    `📱 *Canal:* ${source.toUpperCase()}\n` +
    `🆔 *Conversation:* \`${conversationId}\`\n` +
    `👤 *Subscriber:* \`${subscriberId}\`\n\n` +
    `👉 Responde en: https://alalegal.proyectoprisma.com/inbox`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_REPLIES_CHAT_ID,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "✍️ Responder", url: `https://alalegal.proyectoprisma.com/inbox?conversation=${conversationId}` }
          ]]
        }
      }),
    });
  } catch (error) {
    console.error("Failed to notify Telegram:", error);
  }
}

// Generate AI draft suggestion (optional, for human review)
async function generateDraftSuggestion(messageText: string): Promise<string | null> {
  // This can be enhanced later with actual AI
  // For now, return contextual suggestions based on keywords
  const lower = messageText.toLowerCase();
  
  if (lower.includes("atropellado") || lower.includes("accidente")) {
    return "Lamentamos mucho escuchar sobre el accidente. Para poder ayudarte mejor, ¿podrías compartirnos más detalles sobre qué pasó, cuándo ocurrió y si hubo testigos?";
  }
  if (lower.includes("seguro") || lower.includes("aseguradora")) {
    return "Entendemos la frustración con las aseguradoras. ¿Podrías indicarnos el nombre de la aseguradora y el número de póliza? También nos sería útil saber si ya presentaste un reclamo formal.";
  }
  if (lower.includes("muerto") || lower.includes("fallecido")) {
    return "Lamentamos profundamente tu pérdida. En estos momentos difíciles, estamos aquí para ayudarte. ¿Podrías compartirnos qué ocurrió y cuándo fue el accidente?";
  }
  
  return "Gracias por contactarnos. Para poder evaluar tu caso, ¿podrías compartirnos más detalles sobre lo sucedido?";
}

export async function POST(request: Request) {
  try {
    // Verify secret
    const secret = request.headers.get("x-webhook-secret");
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const subscriber = body.subscriber;
    const messageText = body.message?.text?.trim();
    
    if (!subscriber?.id || !messageText) {
      return NextResponse.json({ error: "Missing subscriber or message" }, { status: 400 });
    }

    const db = getDb();
    const now = nowIsoString();
    const contactName = subscriber.name?.trim() || "Contacto";

    // Find or create lead
    let lead = db.prepare(`
      SELECT id FROM leads 
      WHERE manychat_subscriber_id = ? OR phone = ? OR email = ?
      LIMIT 1
    `).get(subscriber.id, subscriber.phone || null, subscriber.email || null) as { id: string } | undefined;

    if (!lead) {
      const result = db.prepare(`
        INSERT INTO leads (name, email, phone, source, status, manychat_subscriber_id, created_at, updated_at)
        VALUES (?, ?, ?, 'manychat', 'new', ?, ?, ?)
      `).run(contactName, subscriber.email || null, subscriber.phone || null, subscriber.id, now, now);
      lead = { id: String(result.lastInsertRowid) };
    } else {
      // Update lead with latest info
      db.prepare(`
        UPDATE leads SET 
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          updated_at = ?
        WHERE id = ?
      `).run(contactName, subscriber.email || null, subscriber.phone || null, now, lead.id);
    }

    // Find or create conversation
    let conversation = db.prepare(`
      SELECT id FROM conversations WHERE manychat_subscriber_id = ? LIMIT 1
    `).get(subscriber.id) as { id: string } | undefined;

    if (!conversation) {
      const result = db.prepare(`
        INSERT INTO conversations 
        (contact_name, contact_phone, source, last_message, last_message_at, unread_count, status, manychat_subscriber_id, lead_id, created_at)
        VALUES (?, ?, 'manychat', ?, ?, 1, 'active', ?, ?, ?)
      `).run(
        contactName,
        subscriber.phone || null,
        messageText,
        now,
        subscriber.id,
        lead.id,
        now
      );
      conversation = { id: String(result.lastInsertRowid) };
    } else {
      // Update conversation
      db.prepare(`
        UPDATE conversations SET 
          last_message = ?,
          last_message_at = ?,
          unread_count = unread_count + 1,
          contact_name = COALESCE(?, contact_name)
        WHERE id = ?
      `).run(messageText, now, contactName, conversation.id);
    }

    // Store incoming message
    db.prepare(`
      INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
      VALUES (?, 'contact', ?, 'manychat', ?, ?)
    `).run(
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

    // Save to Supermemory
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

    // Generate AI draft for human reference (not sent to lead)
    const draftSuggestion = await generateDraftSuggestion(messageText);

    // Notify Telegram for human review
    await notifyTelegram(
      contactName,
      messageText,
      conversation.id,
      subscriber.id,
      "manychat"
    );

    // Return empty response to ManyChat (no auto-reply)
    // Human will reply manually from Inbox or Telegram
    return NextResponse.json({
      version: "v2",
      content: {
        messages: [] // No auto-reply sent
      }
    });

  } catch (error) {
    console.error("Webhook error:", error);
    // Return error - ManyChat will retry
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: "human-in-the-loop",
    auto_reply: false,
    timestamp: new Date().toISOString(),
  });
}
