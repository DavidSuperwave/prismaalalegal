import { NextResponse } from "next/server";

import { getDb, parseJsonObject } from "@/lib/db";

type ConversationRow = {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  source: "manychat" | "telegram";
  sentiment: "positive" | "neutral" | "negative" | null;
  status: "active" | "archived";
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
      `SELECT id, contact_name, contact_phone, source, sentiment, status
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
      status: conversation.status,
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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as { status?: string; leadId?: string | null };
  const newStatus = body.status;
  const leadId = body.leadId;

  if (newStatus === undefined && leadId === undefined) {
    return NextResponse.json(
      { error: 'Provide at least one of: status or leadId' },
      { status: 400 }
    );
  }

  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM conversations WHERE id = ?")
    .get(params.id) as { id: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (newStatus !== undefined && newStatus !== "active" && newStatus !== "archived") {
    return NextResponse.json(
      { error: 'status must be "active" or "archived"' },
      { status: 400 }
    );
  }

  if (leadId !== undefined && leadId !== null) {
    const leadExists = db
      .prepare("SELECT id FROM leads WHERE id = ?")
      .get(leadId) as { id: string } | undefined;

    if (!leadExists) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
  }

  db.prepare(
    `UPDATE conversations
      SET status = COALESCE(@status, status),
          lead_id = CASE
            WHEN @hasLeadId = 1 THEN @leadId
            ELSE lead_id
          END
      WHERE id = @id`
  ).run({
    id: params.id,
    status: newStatus ?? null,
    hasLeadId: leadId !== undefined ? 1 : 0,
    leadId: leadId ?? null,
  });

  return NextResponse.json({
    success: true,
    id: params.id,
    status: newStatus,
    leadId: leadId === undefined ? undefined : leadId,
  });
}
