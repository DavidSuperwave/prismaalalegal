import { NextResponse } from "next/server";

import { getOpenClawUrl } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const { conversationId, message } = (await request.json()) as {
    conversationId?: string;
    message?: string;
  };

  if (!conversationId || !message?.trim()) {
    return NextResponse.json({ error: "conversationId y message son obligatorios" }, { status: 400 });
  }

  const db = getDb();
  const conversation = db
    .prepare(
      `SELECT id, contact_name, contact_phone, source
      FROM conversations
      WHERE id = ?`
    )
    .get(conversationId) as
    | {
        id: string;
        contact_name: string;
        contact_phone: string | null;
        source: "manychat" | "telegram";
      }
    | undefined;

  if (!conversation) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const messages = db
    .prepare(
      `SELECT sender, content, channel, timestamp
      FROM messages
      WHERE conversation_id = ?
      ORDER BY datetime(timestamp) ASC
      LIMIT 12`
    )
    .all(conversationId) as Array<{
    sender: "contact" | "agent" | "human";
    content: string;
    channel: "manychat" | "telegram" | "web";
    timestamp: string;
  }>;

  const context = messages
    .map((entry) => `${entry.timestamp} ${entry.sender} (${entry.channel}): ${entry.content}`)
    .join("\n");

  try {
    const response = await fetch(`${getOpenClawUrl()}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "user",
        channel: "telegram_admin",
        content:
          `[TELEGRAM_ADMIN] Revisa esta conversación con ${conversation.contact_name} (${conversation.source}).\n` +
          `Historial:\n${context}\n\nSolicitud del usuario: ${message}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenClaw request failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      content?: string;
      message?: string;
      response?: string;
    };

    return NextResponse.json({
      content:
        data.content ||
        data.message ||
        data.response ||
        "Revisé el hilo pero OpenClaw no devolvió una respuesta completa.",
    });
  } catch {
    return NextResponse.json({
      content:
        "OpenClaw no está disponible en este momento. Revisa el historial y vuelve a intentarlo en unos minutos.",
    });
  }
}
