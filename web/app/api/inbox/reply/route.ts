/**
 * Inbox Reply API
 * Routes replies from web app inbox back to ManyChat
 * Uses ManyChat API: POST /fb/sending/sendContent
 */

import { getDb, nowIsoString } from "@/lib/db";

const MANYCHAT_API_BASE = "https://api.manychat.com";
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      subscriber_id?: string;
      message?: string;
      conversation_id?: string;
    };
    const message = body.message?.trim();

    if (!message || !body.conversation_id) {
      return Response.json(
        { error: "Faltan datos requeridos: conversation_id y message" },
        { status: 400 }
      );
    }

    if (!MANYCHAT_API_KEY) {
      return Response.json({ error: "MANYCHAT_API_KEY no está configurado" }, { status: 500 });
    }

    const db = getDb();
    const conversation = db
      .prepare(
        `SELECT id, source, manychat_subscriber_id
        FROM conversations
        WHERE id = ?`
      )
      .get(body.conversation_id) as
      | {
          id: string;
          source: "manychat" | "telegram";
          manychat_subscriber_id: string | null;
        }
      | undefined;

    if (!conversation) {
      return Response.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const subscriberId = body.subscriber_id || conversation.manychat_subscriber_id || undefined;
    if (!subscriberId) {
      return Response.json(
        { error: "No se encontró manychat_subscriber_id para esta conversación" },
        { status: 400 }
      );
    }

    const channelType = conversation.source === "telegram" ? "telegram" : "facebook";

    // Send reply via ManyChat API
    const manychatResponse = await fetch(`${MANYCHAT_API_BASE}/fb/sending/sendContent`, {
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
            type: channelType,
            messages: [
              {
                type: "text",
                text: message,
              },
            ],
          },
        },
        message_tag: "HUMAN_AGENT",
      }),
    });

    if (!manychatResponse.ok) {
      const errorText = await manychatResponse.text();
      console.error("ManyChat API error:", errorText);
      return Response.json(
        { error: "No se pudo enviar el mensaje por ManyChat", details: errorText },
        { status: 500 }
      );
    }

    const result = await manychatResponse.json();
    const now = nowIsoString();

    // Store reply in local database for thread continuity.
    db.prepare(`
      INSERT INTO messages (conversation_id, sender, content, channel, timestamp, metadata)
      VALUES (@conversation_id, 'human', @content, 'manychat', @timestamp, @metadata)
    `).run({
      conversation_id: body.conversation_id,
      content: message,
      timestamp: now,
      metadata: JSON.stringify({
        sent_by: "inbox_user",
        subscriber_id: subscriberId,
      }),
    });

    // Update conversation snapshot
    db.prepare(`
      UPDATE conversations 
      SET last_message = @last_message, last_message_at = @last_message_at, status = 'active'
      WHERE id = @id
    `).run({
      id: body.conversation_id,
      last_message: message,
      last_message_at: now,
    });

    return Response.json({
      success: true,
      manychat_response: result,
      message: "Respuesta enviada correctamente",
    });
  } catch (error) {
    console.error("Inbox reply error:", error);
    return Response.json(
      { error: "Error interno del servidor", message: (error as Error).message },
      { status: 500 }
    );
  }
}
