import { NextResponse } from "next/server";

import { chatWithAgent } from "@/lib/openclaw-client";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const { conversationId, message } = (await request.json()) as {
    conversationId?: string;
    message?: string;
  };

  if (!conversationId || !message?.trim()) {
    return NextResponse.json({ error: "conversationId and message are required" }, { status: 400 });
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
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
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

  const promptText = `You are reviewing the following conversation with ${conversation.contact_name} (${conversation.source}). Conversation history:\n${context}\n\nUser request: ${message}`;

  const result = await chatWithAgent("leads-inbox", promptText, { conversationId });

  if (!result.success || !result.data) {
    return NextResponse.json({
      content:
        "OpenClaw is currently unavailable. Review the timeline above and try your inbox request again shortly.",
    });
  }

  return NextResponse.json({
    content:
      result.data.content ||
      "I reviewed the thread but did not receive a complete reply from OpenClaw.",
  });
}
