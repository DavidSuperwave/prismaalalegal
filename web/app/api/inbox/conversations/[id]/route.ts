import { NextResponse } from "next/server";

import { getDb, parseJsonObject } from "@/lib/db";

type ConversationRow = {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  source: "manychat" | "telegram";
  sentiment: "positive" | "neutral" | "negative" | null;
};

type MessageRow = {
  id: string;
  sender: "contact" | "agent" | "human";
  content: string;
  channel: "manychat" | "telegram" | "web";
  timestamp: string;
  metadata: string;
};

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = getDb();

  const conversation = db
    .prepare(
      `SELECT id, contact_name, contact_phone, source, sentiment
      FROM conversations
      WHERE id = ?`
    )
    .get(params.id) as ConversationRow | undefined;

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const messages = db
    .prepare(
      `SELECT id, sender, content, channel, timestamp, metadata
      FROM messages
      WHERE conversation_id = ?
      ORDER BY datetime(timestamp) ASC`
    )
    .all(params.id) as MessageRow[];

  db.prepare("UPDATE conversations SET unread_count = 0 WHERE id = ?").run(params.id);

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      contactName: conversation.contact_name,
      contactPhone: conversation.contact_phone || undefined,
      source: conversation.source,
      sentiment: conversation.sentiment || "neutral",
      messages: messages.map((message) => ({
        id: message.id,
        sender: message.sender,
        content: message.content,
        channel: message.channel,
        timestamp: message.timestamp,
        metadata: parseJsonObject(message.metadata),
      })),
    },
  });
}
