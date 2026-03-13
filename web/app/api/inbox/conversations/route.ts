import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

type ConversationRow = {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  source: "manychat" | "telegram";
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  sentiment: "positive" | "neutral" | "negative" | null;
  lead_id: string | null;
  status: "active" | "archived";
};

function mapConversation(row: ConversationRow) {
  return {
    id: row.id,
    contactName: row.contact_name,
    contactPhone: row.contact_phone || undefined,
    source: row.source,
    lastMessage: row.last_message || "",
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count,
    sentiment: row.sentiment || "neutral",
    leadId: row.lead_id || undefined,
    status: row.status,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "active";

  const db = getDb();

  let query = `SELECT
    id, contact_name, contact_phone, source, last_message, last_message_at, unread_count,
    sentiment, lead_id, status
  FROM conversations`;

  const args: string[] = [];

  if (statusFilter === "active" || statusFilter === "archived") {
    query += ` WHERE status = ?`;
    args.push(statusFilter);
  }

  query += ` ORDER BY datetime(last_message_at) DESC`;

  const rows = db.prepare(query).all(...args) as ConversationRow[];

  return NextResponse.json({ conversations: rows.map(mapConversation) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    contactName?: string;
    contactPhone?: string;
    source?: "manychat" | "telegram";
    lastMessage?: string;
    sentiment?: "positive" | "neutral" | "negative";
    leadId?: string;
    status?: "active" | "archived";
    manychatSubscriberId?: string;
    telegramChatId?: string;
  };

  if (!body.contactName?.trim()) {
    return NextResponse.json({ error: "Contact name is required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO conversations (
      contact_name, contact_phone, source, last_message, last_message_at, unread_count, sentiment,
      lead_id, status, manychat_subscriber_id, telegram_chat_id, created_at
    ) VALUES (
      @contact_name, @contact_phone, @source, @last_message, @last_message_at, @unread_count, @sentiment,
      @lead_id, @status, @manychat_subscriber_id, @telegram_chat_id, @created_at
    )`
  ).run({
    contact_name: body.contactName.trim(),
    contact_phone: body.contactPhone || null,
    source: body.source || "manychat",
    last_message: body.lastMessage || "",
    last_message_at: new Date().toISOString(),
    unread_count: 0,
    sentiment: body.sentiment || "neutral",
    lead_id: body.leadId || null,
    status: body.status || "active",
    manychat_subscriber_id: body.manychatSubscriberId || null,
    telegram_chat_id: body.telegramChatId || null,
    created_at: new Date().toISOString(),
  });

  return GET();
}
