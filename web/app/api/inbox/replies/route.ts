import { NextResponse } from "next/server";

import { getDb, nowIsoString } from "@/lib/db";

type ReplyRow = {
  id: string;
  conversation_id: string;
  message_id: string | null;
  agent_draft: string | null;
  operator_edit: string | null;
  final_text: string;
  status: "pending" | "approved" | "sent" | "failed";
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  contact_phone?: string | null;
};

function mapReply(row: ReplyRow) {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    message_id: row.message_id,
    agent_draft: row.agent_draft,
    operator_edit: row.operator_edit,
    final_text: row.final_text,
    status: row.status,
    approved_at: row.approved_at,
    sent_at: row.sent_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const conversationId = searchParams.get("conversation_id");
  const phone = searchParams.get("phone");
  const limit = Number(searchParams.get("limit") || "20");

  const db = getDb();
  const clauses: string[] = [];
  const values: string[] = [];

  if (status) {
    clauses.push("r.status = ?");
    values.push(status);
  }
  if (conversationId) {
    clauses.push("r.conversation_id = ?");
    values.push(conversationId);
  }
  if (phone) {
    clauses.push("c.contact_phone = ?");
    values.push(phone);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT
         r.id, r.conversation_id, r.message_id, r.agent_draft, r.operator_edit, r.final_text,
         r.status, r.approved_at, r.sent_at, r.created_at, r.updated_at, c.contact_phone
       FROM replies r
       JOIN conversations c ON c.id = r.conversation_id
       ${where}
       ORDER BY datetime(r.created_at) DESC
       LIMIT ?`
    )
    .all(...values, Math.max(1, Math.min(limit, 100))) as ReplyRow[];

  return NextResponse.json({ replies: rows.map(mapReply) });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      conversation_id?: string;
      message_id?: string;
      agent_draft?: string;
      operator_edit?: string;
      final_text?: string;
      status?: "pending" | "approved" | "sent" | "failed";
    };

    if (!body.conversation_id || !body.final_text?.trim()) {
      return NextResponse.json({ error: "conversation_id and final_text are required" }, { status: 400 });
    }

    const db = getDb();
    const now = nowIsoString();
    db.prepare(
      `INSERT INTO replies (
         conversation_id, message_id, agent_draft, operator_edit, final_text, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      body.conversation_id,
      body.message_id || null,
      body.agent_draft || null,
      body.operator_edit || null,
      body.final_text.trim(),
      body.status || "pending",
      now,
      now
    );

    const created = db
      .prepare(
        `SELECT id, conversation_id, message_id, agent_draft, operator_edit, final_text, status, approved_at, sent_at, created_at, updated_at
         FROM replies
         WHERE conversation_id = ?
         ORDER BY datetime(created_at) DESC
         LIMIT 1`
      )
      .get(body.conversation_id) as ReplyRow | undefined;

    return NextResponse.json({ success: true, reply: created ? mapReply(created) : null });
  } catch (error) {
    console.error("Create reply failed:", error);
    return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
  }
}
