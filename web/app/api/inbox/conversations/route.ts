import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { isAuthorized, unauthorizedResponse } from "@/lib/internal-auth";

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
  // Check authorization (internal service token or session cookie)
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

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
